"""On-demand subset correlation from cached returns.

Supports:
  * Time-window slicing (start_date / end_date) for rolling-endpoint analysis.
  * Marchenko-Pastur denoising for signal-vs-noise views.
  * Diff mode (current minus a comparison window) for "what changed".
"""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


def _slice_returns(returns: pd.DataFrame, start: str | None, end: str | None) -> pd.DataFrame:
    if start is None and end is None:
        return returns
    idx = returns.index
    lo = pd.Timestamp(start) if start else idx.min()
    hi = pd.Timestamp(end)   if end   else idx.max()
    return returns.loc[(idx >= lo) & (idx <= hi)]


def subset_corr(
    returns: pd.DataFrame,
    ids: Iterable[str],
    method: str = "pearson",
    start_date: str | None = None,
    end_date: str | None = None,
) -> tuple[pd.DataFrame, int, tuple[str, str]]:
    """Compute pairwise correlation over the listed ids in [start_date, end_date]."""
    ids = [s for s in ids if s in returns.columns]
    if not ids:
        return pd.DataFrame(), 0, ("", "")

    sub = _slice_returns(returns, start_date, end_date)[ids]
    keep = [c for c in ids if sub[c].notna().any()]
    if not keep:
        return pd.DataFrame(), 0, ("", "")
    sub = sub[keep]

    inner = sub.dropna(how="any")
    if inner.shape[0] >= max(20, sub.shape[1]):
        corr = inner.corr(method=("spearman" if method == "spearman" else "pearson"))
        n_obs = int(inner.shape[0])
        date_range = (inner.index[0].strftime("%Y-%m-%d"), inner.index[-1].strftime("%Y-%m-%d"))
    else:
        corr = sub.corr(method=("spearman" if method == "spearman" else "pearson"))
        col_n = sub.notna().sum().tolist()
        n_obs = int(sorted(col_n)[len(col_n) // 2]) if col_n else 0
        nn_idx = sub.dropna(how="all").index
        if len(nn_idx):
            date_range = (nn_idx[0].strftime("%Y-%m-%d"), nn_idx[-1].strftime("%Y-%m-%d"))
        else:
            date_range = ("", "")

    corr = corr.fillna(0.0)
    if keep != ids:
        full = pd.DataFrame(0.0, index=ids, columns=ids)
        for r in keep:
            for c in keep:
                full.loc[r, c] = corr.loc[r, c]
        for s in ids:
            full.loc[s, s] = 1.0
        corr = full
    return corr, n_obs, date_range


def mp_denoise(corr: pd.DataFrame, n_obs: int) -> pd.DataFrame:
    """Marchenko-Pastur eigenvalue clipping. Keep eigenvalues above λ+, project rest to mean."""
    if corr.empty or n_obs < 10:
        return corr
    N = corr.shape[0]
    if N < 2:
        return corr
    q = N / max(n_obs, N + 1)
    lam_plus = (1.0 + np.sqrt(q)) ** 2
    M = corr.values.astype(float)
    M = 0.5 * (M + M.T)
    w, V = np.linalg.eigh(M)
    signal = w > lam_plus
    if signal.sum() == 0:
        # Nothing above noise — return identity-like matrix.
        out = np.eye(N)
    else:
        # Replace noise eigenvalues with their average so trace is preserved roughly.
        noise_avg = w[~signal].mean() if (~signal).any() else 0.0
        w_clean = np.where(signal, w, noise_avg)
        out = (V * w_clean) @ V.T
    # Renormalize diagonal back to 1 (correlation invariant).
    d = np.sqrt(np.diag(out))
    d[d == 0] = 1.0
    out = out / np.outer(d, d)
    np.fill_diagonal(out, 1.0)
    return pd.DataFrame(out, index=corr.index, columns=corr.columns)


def diff_corr(current: pd.DataFrame, baseline: pd.DataFrame) -> pd.DataFrame:
    """Aligned difference current - baseline. NaN where ids don't intersect."""
    common = current.index.intersection(baseline.index)
    a = current.loc[common, common]
    b = baseline.loc[common, common]
    return a - b


def pair_stats(returns: pd.DataFrame, id_a: str, id_b: str,
               start_date: str | None = None, end_date: str | None = None) -> dict:
    if id_a not in returns.columns or id_b not in returns.columns:
        return {"error": f"missing series: {id_a if id_a not in returns.columns else id_b}"}
    sub = _slice_returns(returns, start_date, end_date)
    pair = sub[[id_a, id_b]].dropna()
    if pair.empty:
        return {
            "id_a": id_a, "id_b": id_b,
            "pearson": None, "spearman": None,
            "n_obs": 0, "date_range": ["", ""],
            "scatter": [], "regression": None,
        }
    pearson = float(pair[id_a].corr(pair[id_b], method="pearson"))
    spearman = float(pair[id_a].corr(pair[id_b], method="spearman"))
    x = pair[id_a].to_numpy()
    y = pair[id_b].to_numpy()
    if x.std() > 0:
        slope, intercept = np.polyfit(x, y, 1)
        x_line = [float(x.min()), float(x.max())]
        y_line = [float(intercept + slope * x.min()), float(intercept + slope * x.max())]
        regression = {"x": x_line, "y": y_line, "slope": float(slope), "intercept": float(intercept)}
    else:
        regression = None
    scatter = [{"x": float(a), "y": float(b)} for a, b in zip(x.tolist(), y.tolist())]
    return {
        "id_a": id_a, "id_b": id_b,
        "pearson": pearson, "spearman": spearman,
        "n_obs": int(pair.shape[0]),
        "date_range": [pair.index[0].strftime("%Y-%m-%d"), pair.index[-1].strftime("%Y-%m-%d")],
        "scatter": scatter,
        "regression": regression,
    }


def rolling_pair(returns: pd.DataFrame, id_a: str, id_b: str, window: int) -> dict:
    if id_a not in returns.columns or id_b not in returns.columns:
        return {"dates": [], "values": []}
    pair = returns[[id_a, id_b]].dropna()
    if len(pair) < window:
        return {"dates": [], "values": []}
    rc = pair[id_a].rolling(window).corr(pair[id_b])
    rc = rc.dropna()
    return {
        "dates": [d.strftime("%Y-%m-%d") for d in rc.index],
        "values": [float(v) if v == v else None for v in rc.tolist()],
    }
