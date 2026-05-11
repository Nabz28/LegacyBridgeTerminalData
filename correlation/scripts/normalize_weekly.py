"""normalize_weekly — collapse all weekly parquet rows onto a single Friday-end index.

Problem: tvdatafeed weekly bars are timestamped at Monday (week-start), yfinance at Friday
(week-end). Mixed indices in the same parquet break inner-join correlations because BBCA
is on Friday rows while KOMPAS100 is on Monday rows for the same trading week.

Fix: for every weekly parquet, shift each row's timestamp forward to the FRIDAY of that
ISO week, then groupby Friday and take the last value. Idempotent — already-Friday rows
unchanged. Also strips time component and timezones.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W = DATA_ROOT / "raw" / "weekly"
RAW_M = DATA_ROOT / "raw" / "monthly"


def to_week_ending_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    """Map any date to the Friday of its ISO week (Mon=0..Sun=6 -> +days to Friday)."""
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    # Days to add to land on Friday (weekday 4): (4 - dow) % 7 won't work for Sat/Sun
    # We want week ENDING on Friday. Mon-Fri map to that week's Friday; Sat/Sun map to NEXT Friday.
    dow = idx.dayofweek
    # Mon(0)->+4, Tue(1)->+3, Wed(2)->+2, Thu(3)->+1, Fri(4)->0, Sat(5)->-1 (use prior Fri), Sun(6)->-2
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def normalize_weekly_parquet(path: Path) -> tuple[int, int, int]:
    """Returns (rows_before, rows_after, cols)."""
    if not path.exists():
        return (0, 0, 0)
    df = pd.read_parquet(path)
    n_before = len(df)
    df.index = to_week_ending_friday(pd.DatetimeIndex(df.index))
    # Group by the Friday timestamp; keep last non-null value per column.
    df = df.groupby(level=0).last().sort_index()
    df.to_parquet(path)
    return n_before, len(df), df.shape[1]


def normalize_monthly_parquet(path: Path) -> tuple[int, int, int]:
    """Map every row to month-end."""
    if not path.exists():
        return (0, 0, 0)
    df = pd.read_parquet(path)
    n_before = len(df)
    idx = pd.DatetimeIndex(df.index)
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    df.index = idx.to_period("M").to_timestamp("M")
    df = df.groupby(level=0).last().sort_index()
    df.to_parquet(path)
    return n_before, len(df), df.shape[1]


def main():
    print("=== weekly ===")
    for p in sorted(RAW_W.glob("*.parquet")):
        b, a, c = normalize_weekly_parquet(p)
        delta = a - b
        marker = "->" if delta == 0 else f"({delta:+d})"
        print(f"  {p.name:30s} {b:5d} -> {a:5d} {marker}  cols={c}")
    print("=== monthly ===")
    for p in sorted(RAW_M.glob("*.parquet")):
        b, a, c = normalize_monthly_parquet(p)
        delta = a - b
        marker = "->" if delta == 0 else f"({delta:+d})"
        print(f"  {p.name:30s} {b:5d} -> {a:5d} {marker}  cols={c}")


if __name__ == "__main__":
    main()
