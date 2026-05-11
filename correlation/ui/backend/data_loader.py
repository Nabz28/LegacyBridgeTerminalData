"""In-memory cache for parquet data + helpers.

Parquets and SQLite live in the EXTERNAL data store (configured via
DATA_STORE_PATH in the repo `.env`, mirrors how scripts/serve.js resolves it).

    <DATA_STORE_PATH>/correlation/
        correlation.sqlite
        returns/{weekly,monthly}_returns.parquet
        matrices/{pearson_full,spearman_full,pearson_denoised}*.parquet
        matrices/cluster_order_weekly.json

The repo only holds the catalog (universe.json) at correlation/catalog/.
Rolling correlation matrices are NO LONGER PRECOMPUTED — they are computed
on the fly in `correlation_subset.rolling_pair()` from `returns_w`.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

import pandas as pd

# This file: correlation/ui/backend/data_loader.py
# REPO_ROOT walks up 4 dirs.
REPO_ROOT = Path(__file__).resolve().parents[3]
CATALOG = REPO_ROOT / "correlation" / "catalog"


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


def _data_store_root() -> Path:
    _load_dotenv()
    raw = os.environ.get("DATA_STORE_PATH", "../data-store")
    p = Path(raw)
    return p if p.is_absolute() else (REPO_ROOT / p).resolve()


DATA_ROOT = _data_store_root() / "correlation"
RETURNS = DATA_ROOT / "returns"
MATRICES = DATA_ROOT / "matrices"
DB_PATH = DATA_ROOT / "correlation.sqlite"


MIN_WEEKLY_OBS = 26  # ≥ 6 months of weekly data; below this we treat the series as unavailable


class DataStore:
    def __init__(self) -> None:
        self.universe: dict = json.loads((CATALOG / "universe.json").read_text(encoding="utf-8"))
        self.series_by_id: dict[str, dict] = {s["id"]: s for s in self.universe["series"]}

        self.returns_w: pd.DataFrame = pd.read_parquet(RETURNS / "weekly_returns.parquet")
        self.returns_m: pd.DataFrame = pd.read_parquet(RETURNS / "monthly_returns.parquet")

        # Drop columns that look ingested but actually have ≤ MIN_WEEKLY_OBS observations.
        # Common cause: yfinance returns just today's spot quote for some IDX/index tickers
        # without historical data, which silently poisoned correlation matrices with zeros.
        too_thin_w = [c for c in self.returns_w.columns if self.returns_w[c].notna().sum() < MIN_WEEKLY_OBS]
        if too_thin_w:
            self.returns_w = self.returns_w.drop(columns=too_thin_w)
        too_thin_m = [c for c in self.returns_m.columns if self.returns_m[c].notna().sum() < 6]
        if too_thin_m:
            self.returns_m = self.returns_m.drop(columns=too_thin_m)
        self.dropped_thin: list[str] = sorted(set(too_thin_w) | set(too_thin_m))

        # Static full-period correlation matrices.
        # Parquets are stored as float32 + ZSTD for size; cast back to float64
        # for downstream linear-algebra paths (PCA, denoising) that assume it.
        # Defensive against older optimizer runs that may have persisted the
        # row labels as a stray `__index_level_0__` string column.
        def _read_matrix(path):
            df = pd.read_parquet(path)
            if "__index_level_0__" in df.columns:
                df = df.set_index("__index_level_0__")
                df.index.name = None
            return df.astype("float64")

        self.pearson_full_w     = _read_matrix(MATRICES / "pearson_full_weekly.parquet")
        self.pearson_full_m     = _read_matrix(MATRICES / "pearson_full_monthly.parquet")
        self.spearman_full_w    = _read_matrix(MATRICES / "spearman_full_weekly.parquet")
        self.spearman_full_m    = _read_matrix(MATRICES / "spearman_full_monthly.parquet")
        self.pearson_denoised_w = _read_matrix(MATRICES / "pearson_denoised_weekly.parquet")

        co = json.loads((MATRICES / "cluster_order_weekly.json").read_text(encoding="utf-8"))
        self.cluster_order_w: list[str] = co["order"] if isinstance(co, dict) else list(co)

    def returns(self, freq: str) -> pd.DataFrame:
        return self.returns_w if freq == "w" else self.returns_m

    def full_matrix(self, freq: str, method: str) -> pd.DataFrame:
        if method == "spearman":
            return self.spearman_full_w if freq == "w" else self.spearman_full_m
        return self.pearson_full_w if freq == "w" else self.pearson_full_m

    def available_ids(self) -> set[str]:
        # Series usable for correlation = those present in returns parquet.
        return set(self.returns_w.columns) | set(self.returns_m.columns)

    def db(self) -> sqlite3.Connection:
        return sqlite3.connect(DB_PATH)
