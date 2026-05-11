"""Compute weekly and monthly returns from raw price parquets.

For each series:
  ret == 'log'  -> log(p_t / p_{t-1})
  ret == 'diff' -> p_t - p_{t-1}    (yields, spreads, policy rates)
  ret == 'yoy'  -> (p_t / p_{t-12}) - 1   for monthly
                   (p_t / p_{t-52}) - 1   for weekly

Derived series (curve spreads, ratio-spreads) are computed *before* return
transformation, since the spec says spreads should be diffed.

Outputs:
  correlation/data/returns/weekly_returns.parquet
  correlation/data/returns/monthly_returns.parquet

Both saved + mirrored into the SQLite DB.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from db import init_db, ingest_returns, ingest_prices, load_universe

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W = DATA_ROOT / "raw" / "weekly"
RAW_M = DATA_ROOT / "raw" / "monthly"
RET_DIR = DATA_ROOT / "returns"
RET_DIR.mkdir(parents=True, exist_ok=True)
CATALOG = ROOT / "catalog" / "universe.json"

log = logging.getLogger("returns")
log.setLevel(logging.INFO)
_h = logging.StreamHandler(sys.stdout)
_h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
log.addHandler(_h)


# ------------------------------------------------------------------
# Load all raw price parquets into a single wide frame
# ------------------------------------------------------------------

def _load_wide(raw_dir: Path) -> pd.DataFrame:
    frames = []
    for p in sorted(raw_dir.glob("*.parquet")):
        try:
            df = pd.read_parquet(p)
        except Exception as e:
            log.warning("Failed reading %s: %s", p, e)
            continue
        df.index = pd.DatetimeIndex(df.index)
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    wide = pd.concat(frames, axis=1)
    # Drop duplicate columns just in case
    wide = wide.loc[:, ~wide.columns.duplicated()]
    return wide.sort_index()


# ------------------------------------------------------------------
# Derived series
# ------------------------------------------------------------------

# (output_id, lhs_id, rhs_id) where output = lhs - rhs (price-space)
DERIVED_SPREADS = [
    ("US10Y-US02Y", "TVC:US10Y", "TVC:US02Y"),
    ("US10Y-US03MY", "TVC:US10Y", "TVC:US03MY"),
    ("US30Y-US05Y", "TVC:US30Y", "TVC:US05Y"),
    ("US30Y-US10Y", "TVC:US30Y", "TVC:US10Y"),
    ("HYG-IEF", "AMEX:HYG", "NASDAQ:IEF"),
    ("LQD-IEF", "AMEX:LQD", "NASDAQ:IEF"),
]


def _add_derived(prices: pd.DataFrame) -> pd.DataFrame:
    for out_id, lhs, rhs in DERIVED_SPREADS:
        if lhs in prices.columns and rhs in prices.columns:
            prices[out_id] = prices[lhs] - prices[rhs]
        else:
            log.info("Skip derived %s (need %s and %s)", out_id, lhs, rhs)
    return prices


# ------------------------------------------------------------------
# Return transforms
# ------------------------------------------------------------------

def _transform(series: pd.Series, ret_type: str, freq: str) -> pd.Series:
    """Apply return transform on the dense (non-NaN) subseries, then reindex
    back to the original (potentially sparse) index.

    Without dropna() first, monthly series living inside the weekly wide frame
    (e.g. FRED bond yields fetched at month-ends) produce all-NaN diffs because
    series.shift(1) shifts in the wide-frame index where adjacent rows are NaN.
    """
    s_clean = series.dropna()
    if s_clean.empty:
        return pd.Series(index=series.index, dtype=float)

    if ret_type == "log":
        s = s_clean.where(s_clean > 0)
        out = np.log(s / s.shift(1))
    elif ret_type == "diff":
        out = s_clean - s_clean.shift(1)
    elif ret_type == "yoy":
        lag = 52 if freq == "weekly" else 12
        out = s_clean / s_clean.shift(lag) - 1.0
    else:
        log.warning("Unknown ret type %r — defaulting to log", ret_type)
        s = s_clean.where(s_clean > 0)
        out = np.log(s / s.shift(1))

    return out.reindex(series.index)


def compute_returns(prices: pd.DataFrame, ret_map: dict[str, str], freq: str) -> pd.DataFrame:
    out = pd.DataFrame(index=prices.index)
    missing_ret = []
    for col in prices.columns:
        rt = ret_map.get(col)
        if rt is None:
            missing_ret.append(col)
            rt = "log"
        out[col] = _transform(prices[col], rt, freq)
    if missing_ret:
        log.warning("No ret type for %d cols (defaulted to log): %s",
                    len(missing_ret), missing_ret[:8])
    # Drop the first row (always NaN for diff/log)
    out = out.iloc[1:]
    return out


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

def main() -> None:
    universe = json.loads(CATALOG.read_text(encoding="utf-8"))
    ret_map = {s["id"]: s.get("ret", "log") for s in universe["series"]}

    weekly_prices = _load_wide(RAW_W)
    monthly_prices = _load_wide(RAW_M)

    log.info("Loaded weekly prices: %s, monthly prices: %s",
             weekly_prices.shape, monthly_prices.shape)

    if weekly_prices.empty and monthly_prices.empty:
        log.error("No raw price data found — run fetch_data.py first")
        sys.exit(1)

    weekly_prices = _add_derived(weekly_prices)
    monthly_prices = _add_derived(monthly_prices)

    weekly_ret = compute_returns(weekly_prices, ret_map, "weekly")
    monthly_ret = compute_returns(monthly_prices, ret_map, "monthly")

    weekly_path = RET_DIR / "weekly_returns.parquet"
    monthly_path = RET_DIR / "monthly_returns.parquet"
    weekly_ret.to_parquet(weekly_path)
    monthly_ret.to_parquet(monthly_path)
    log.info("Wrote %s shape=%s", weekly_path, weekly_ret.shape)
    log.info("Wrote %s shape=%s", monthly_path, monthly_ret.shape)

    # Mirror into SQLite
    conn = init_db()
    load_universe(CATALOG, conn)  # refresh series table from current catalog
    ingest_prices(weekly_prices, "weekly", conn)
    ingest_prices(monthly_prices, "monthly", conn)
    ingest_returns(weekly_ret, "weekly", conn)
    ingest_returns(monthly_ret, "monthly", conn)
    log.info("DB mirror complete")


if __name__ == "__main__":
    main()
