"""Correlation matrix computation: full-sample Pearson/Spearman,
Marchenko-Pastur denoising, and hierarchical clustering order.

Inputs (in <DATA_STORE_PATH>/correlation/):
  returns/weekly_returns.parquet
  returns/monthly_returns.parquet

Outputs (in <DATA_STORE_PATH>/correlation/matrices/):
  pearson_full_weekly.parquet          (float32 + ZSTD)
  spearman_full_weekly.parquet
  pearson_full_monthly.parquet
  spearman_full_monthly.parquet
  pearson_denoised_weekly.parquet
  cluster_order_weekly.json

Rolling correlations are intentionally NOT precomputed any more (they used
to bloat the data store to ~10 GB). Rolling values are computed live by
`correlation_subset.rolling_pair()` from `returns_*` when the UI asks for
a pair, or by the Postgres function `correlation.rolling_corr()` in the
Supabase deployment.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform

# This file: correlation/scripts/correlation_engine.py
REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))


_load_dotenv()
_raw = os.environ.get("DATA_STORE_PATH", "../data-store")
DATA_STORE = Path(_raw) if Path(_raw).is_absolute() else (REPO_ROOT / _raw).resolve()
DATA_ROOT = DATA_STORE / "correlation"
RET_DIR = DATA_ROOT / "returns"
OUT_DIR = DATA_ROOT / "matrices"
OUT_DIR.mkdir(parents=True, exist_ok=True)

log = logging.getLogger("corr")
log.setLevel(logging.INFO)
_h = logging.StreamHandler(sys.stdout)
_h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
log.addHandler(_h)


# ------------------------------------------------------------------
# Pearson / Spearman full-sample
# ------------------------------------------------------------------

def full_corr(returns: pd.DataFrame, method: str) -> pd.DataFrame:
    # Drop columns that are all-NaN to avoid warnings
    returns = returns.dropna(axis=1, how="all")
    return returns.corr(method=method, min_periods=10)


# ------------------------------------------------------------------
# Marchenko-Pastur denoising
# ------------------------------------------------------------------

def _square_clean(corr: pd.DataFrame) -> pd.DataFrame:
    """Iteratively drop the worst-NaN row/col (paired) until matrix is NaN-free.

    Naive `bad = any-NaN axis=0|1; keep = ~bad` collapses to zero columns when
    NaN pairs are scattered (each col has only a few NaN cells but every col
    is affected by at least one bad partner). Greedy iterative removal keeps
    far more series.
    """
    while True:
        if corr.empty or len(corr) < 2:
            return corr
        nan_count = corr.isna().sum(axis=0) + corr.isna().sum(axis=1)
        if int(nan_count.max()) == 0:
            return corr
        worst = nan_count.idxmax()
        corr = corr.drop(index=worst, columns=worst)


def mp_denoise(corr: pd.DataFrame, T: int) -> pd.DataFrame:
    """Zero eigenvalues below MP upper bound lambda_+ = (1 + sqrt(N/T))^2 and
    reconstruct the correlation matrix. Diagonal is renormalized to 1."""
    if corr.empty or len(corr) < 2:
        return corr.copy()
    corr = _square_clean(corr)
    if corr.empty or len(corr) < 2:
        return corr
    # Symmetrize (numerical jitter)
    M = (corr.values + corr.values.T) / 2.0
    N = M.shape[0]
    if N < 2 or T < 2:
        return corr.copy()
    q = N / T
    lam_plus = (1 + np.sqrt(q)) ** 2

    eigvals, eigvecs = np.linalg.eigh(M)
    # Zero out noise eigenvalues
    cleaned_eigvals = np.where(eigvals > lam_plus, eigvals, 0.0)
    M_clean = eigvecs @ np.diag(cleaned_eigvals) @ eigvecs.T
    # Renormalize so diagonal = 1
    diag = np.sqrt(np.clip(np.diag(M_clean), 1e-12, None))
    M_clean = M_clean / np.outer(diag, diag)
    np.fill_diagonal(M_clean, 1.0)

    return pd.DataFrame(M_clean, index=corr.index, columns=corr.columns)


# ------------------------------------------------------------------
# Hierarchical clustering leaf order
# ------------------------------------------------------------------

def cluster_order(corr: pd.DataFrame) -> list[str]:
    if corr.empty or len(corr) < 2:
        return list(corr.columns)
    corr = _square_clean(corr)
    if corr.empty or len(corr) < 2:
        return list(corr.columns)
    # distance: sqrt(2(1 - rho)), clipped
    rho = np.clip(corr.values, -1.0, 1.0)
    dist = np.sqrt(np.clip(2.0 * (1.0 - rho), 0.0, None))
    np.fill_diagonal(dist, 0.0)
    # Symmetrize
    dist = (dist + dist.T) / 2.0
    try:
        cond = squareform(dist, checks=False)
        Z = linkage(cond, method="average")
        order = leaves_list(Z)
    except Exception as e:
        log.warning("clustering failed: %s — falling back to alphabetical", e)
        return sorted(corr.columns.tolist())
    return [corr.columns[i] for i in order]


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

def _save_corr(c: pd.DataFrame, name: str) -> None:
    """Persist a correlation frame as float32 + ZSTD parquet.

    float32 loses ~7th significant digit, which is well below correlation
    measurement noise. ZSTD level 3 gets ~2-3x better ratio than the default
    SNAPPY on correlation data (many cells cluster near 0). Together the
    static matrices land at ~30-40 MB each instead of ~150 MB.
    """
    if c.empty:
        log.warning("Skip empty %s", name)
        return
    p = OUT_DIR / name
    c.astype("float32").to_parquet(p, compression="zstd", compression_level=3)
    log.info("Wrote %s shape=%s", p, c.shape)


def main() -> None:
    weekly_path = RET_DIR / "weekly_returns.parquet"
    monthly_path = RET_DIR / "monthly_returns.parquet"
    if not weekly_path.exists() and not monthly_path.exists():
        log.error("Returns parquets not found. Run compute_returns.py first.")
        sys.exit(1)

    if weekly_path.exists():
        rw = pd.read_parquet(weekly_path)
        rw.index = pd.DatetimeIndex(rw.index)
        log.info("Loaded weekly returns shape=%s", rw.shape)

        pearson_w = full_corr(rw, "pearson")
        spearman_w = full_corr(rw, "spearman")
        _save_corr(pearson_w, "pearson_full_weekly.parquet")
        _save_corr(spearman_w, "spearman_full_weekly.parquet")

        # MP denoising on weekly Pearson
        T = int(rw.dropna(axis=1, how="all").shape[0])
        denoised = mp_denoise(pearson_w, T)
        _save_corr(denoised, "pearson_denoised_weekly.parquet")

        # Cluster order
        order = cluster_order(pearson_w)
        (OUT_DIR / "cluster_order_weekly.json").write_text(
            json.dumps({"order": order, "n": len(order)}, indent=2),
            encoding="utf-8",
        )
        log.info("Wrote cluster_order_weekly.json (n=%d)", len(order))
    else:
        log.warning("No weekly returns parquet")

    if monthly_path.exists():
        rm = pd.read_parquet(monthly_path)
        rm.index = pd.DatetimeIndex(rm.index)
        log.info("Loaded monthly returns shape=%s", rm.shape)

        pearson_m = full_corr(rm, "pearson")
        spearman_m = full_corr(rm, "spearman")
        _save_corr(pearson_m, "pearson_full_monthly.parquet")
        _save_corr(spearman_m, "spearman_full_monthly.parquet")
    else:
        log.warning("No monthly returns parquet")

    # Rolling correlations are computed on demand — see correlation_subset.rolling_pair()
    # for the local path, or the Postgres function correlation.rolling_corr() for Supabase.

    log.info("== correlation_engine done ==")


if __name__ == "__main__":
    main()
