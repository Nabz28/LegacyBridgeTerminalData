"""tv_fetch — fetch a list of TradingView symbols via tvdatafeed and merge into parquets.

Each call: `python tv_fetch.py --symbols "IDX:IDXENERGY,TVC:ID10Y" --target indonesia_equities`

Idempotent — merges with existing weekly+monthly parquet, never duplicates a column.
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
log = logging.getLogger("tv_fetch")

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]  # correlation/
RAW_W = DATA_ROOT / "raw" / "weekly"
RAW_M = DATA_ROOT / "raw" / "monthly"
LOG = ROOT / "logs" / "tv_fetch.log"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--symbols", required=True, help="comma-separated TV ids like IDX:IDXENERGY,TVC:ID10Y")
    p.add_argument("--target", required=True, help="category parquet to merge into (e.g. indonesia_equities)")
    p.add_argument("--bars", type=int, default=900, help="weekly bars to request")
    p.add_argument("--monthly-bars", type=int, default=210)
    p.add_argument("--start-date", default="2011-01-01", help="trim returned data to start at this date")
    return p.parse_args()


def fetch_one(tv, ex: str, sym: str, interval, n_bars: int) -> pd.Series | None:
    try:
        df = tv.get_hist(symbol=sym, exchange=ex, interval=interval, n_bars=n_bars)
        if df is None or not len(df):
            return None
        # tvdatafeed returns columns: symbol, open, high, low, close, volume
        s = df["close"].copy()
        # Tz-strip — convert to date-only Friday/month-end so it aligns with existing parquets.
        s.index = pd.to_datetime(s.index).tz_localize(None) if s.index.tz else pd.to_datetime(s.index)
        s.index = s.index.normalize()
        return s
    except Exception as e:
        log.error("%s:%s fetch error: %s: %s", ex, sym, type(e).__name__, str(e)[:120])
        return None


def merge_into_parquet(path: Path, sid: str, series: pd.Series) -> tuple[int, int]:
    """Add or overwrite a column. Returns (rows_in_series, total_cols_after)."""
    if path.exists():
        df = pd.read_parquet(path)
    else:
        df = pd.DataFrame()
    if sid in df.columns:
        df = df.drop(columns=[sid])
    out = df.join(series.rename(sid), how="outer") if len(df) else series.rename(sid).to_frame()
    out = out.sort_index()
    out.to_parquet(path)
    return len(series), out.shape[1]


def align_weekly_friday(s: pd.Series) -> pd.Series:
    """Resample to weekly-Friday close to match the rest of the corpus."""
    return s.resample("W-FRI").last().dropna()


def align_monthly_end(s: pd.Series) -> pd.Series:
    return s.resample("ME").last().dropna()


def main():
    args = parse_args()
    LOG.parent.mkdir(parents=True, exist_ok=True)
    file_log = logging.FileHandler(LOG, encoding="utf-8")
    file_log.setLevel(logging.INFO)
    log.addHandler(file_log)

    try:
        from tvDatafeed import TvDatafeed, Interval
    except ImportError:
        log.error("tvdatafeed not installed: pip install tvdatafeed")
        sys.exit(2)

    tv = TvDatafeed()
    log.info("tvdatafeed initialized (no-login mode)")

    weekly_path = RAW_W / f"{args.target}.parquet"
    monthly_path = RAW_M / f"{args.target}.parquet"

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    log.info("fetching %d symbols → %s", len(symbols), args.target)

    n_ok = 0
    n_fail = 0
    fail_list: list[str] = []
    cutoff = pd.Timestamp(args.start_date)

    for sid in symbols:
        if ":" not in sid:
            log.warning("%s: missing exchange prefix, skipping", sid)
            n_fail += 1
            fail_list.append(sid)
            continue
        ex, sym = sid.split(":", 1)
        t0 = time.time()
        # Try daily first (much higher resolution + reliable resampling)
        s_daily = fetch_one(tv, ex, sym, Interval.in_daily, n_bars=5000)
        if s_daily is None:
            # Retry once on transient connection failures
            time.sleep(2)
            s_daily = fetch_one(tv, ex, sym, Interval.in_daily, n_bars=5000)
        if s_daily is None or s_daily.empty:
            log.warning("%s: no data after retry", sid)
            n_fail += 1
            fail_list.append(sid)
            continue
        s_daily = s_daily[s_daily.index >= cutoff]
        if s_daily.empty:
            log.warning("%s: data exists but all before %s", sid, args.start_date)
            n_fail += 1
            fail_list.append(sid)
            continue

        s_w = align_weekly_friday(s_daily)
        s_m = align_monthly_end(s_daily)

        nw, total_w = merge_into_parquet(weekly_path, sid, s_w)
        nm, total_m = merge_into_parquet(monthly_path, sid, s_m)

        log.info("OK %s: w=%d m=%d  range=%s..%s  cols_now w/m=%d/%d  %.1fs",
                 sid, nw, nm, s_w.index.min().date(), s_w.index.max().date(),
                 total_w, total_m, time.time() - t0)
        n_ok += 1

    log.info("DONE: %d ok, %d fail", n_ok, n_fail)
    if fail_list:
        log.info("failed: %s", ", ".join(fail_list))


if __name__ == "__main__":
    main()
