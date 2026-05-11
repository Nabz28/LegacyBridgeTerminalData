"""Multi-source price fetcher with fallback chain.

Source routing:
  src=tv      -> tvdatafeed (if installed) -> yfinance (mapped symbol)
  src=fred    -> direct CSV from fred.stlouisfed.org
  src=stooq   -> direct CSV from stooq.com
  src=bi/bps  -> yfinance if yf set, else log missing
  src=derived -> SKIP (computed in compute_returns.py)
  src=premium -> already dropped from catalog

Outputs (idempotent):
  correlation/data/raw/weekly/<cat>.parquet
  correlation/data/raw/monthly/<cat>.parquet

Usage:
  python fetch_data.py [--category <name>] [--ids "ID1,ID2,..."] [--limit N]
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import sys
import time
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# ------------------------------------------------------------------
# Paths & logging
# ------------------------------------------------------------------
import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog" / "universe.json"
RAW_W = DATA_ROOT / "raw" / "weekly"
RAW_M = DATA_ROOT / "raw" / "monthly"
LOG_DIR = ROOT / "logs"
FAIL_LOG = LOG_DIR / "fetch_failures.log"

START_DATE = "2011-01-01"

for d in (RAW_W, RAW_M, LOG_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Stream + file handlers
log = logging.getLogger("fetch")
log.setLevel(logging.INFO)
_stream = logging.StreamHandler(sys.stdout)
_stream.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
log.addHandler(_stream)
_file = logging.FileHandler(LOG_DIR / "fetch.log", encoding="utf-8")
_file.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
log.addHandler(_file)


def _log_failure(series_id: str, reason: str) -> None:
    with FAIL_LOG.open("a", encoding="utf-8") as f:
        f.write(f"{datetime.utcnow().isoformat()}\t{series_id}\t{reason}\n")


# ------------------------------------------------------------------
# Source-specific fetchers
# Each returns a daily-close pd.Series (date index, name=series_id) or None.
# ------------------------------------------------------------------

def fetch_yfinance(series_id: str, yf_sym: str | None) -> pd.Series | None:
    if not yf_sym:
        return None
    try:
        import yfinance as yf
    except Exception as e:  # pragma: no cover
        _log_failure(series_id, f"yfinance import: {e}")
        return None

    try:
        # yfinance >=0.2.40 download
        df = yf.download(
            yf_sym,
            start=START_DATE,
            end=None,
            progress=False,
            auto_adjust=False,
            threads=False,
        )
    except Exception as e:
        _log_failure(series_id, f"yf.download {yf_sym}: {e}")
        return None

    if df is None or df.empty:
        _log_failure(series_id, f"yf empty for {yf_sym}")
        return None

    # Handle MultiIndex columns (yfinance sometimes returns MultiIndex)
    if isinstance(df.columns, pd.MultiIndex):
        # Pick "Close" or "Adj Close"
        if "Close" in df.columns.get_level_values(0):
            s = df["Close"]
            if isinstance(s, pd.DataFrame):
                s = s.iloc[:, 0]
        elif "Adj Close" in df.columns.get_level_values(0):
            s = df["Adj Close"]
            if isinstance(s, pd.DataFrame):
                s = s.iloc[:, 0]
        else:
            _log_failure(series_id, f"yf no Close col for {yf_sym}")
            return None
    else:
        if "Close" in df.columns:
            s = df["Close"]
        elif "Adj Close" in df.columns:
            s = df["Adj Close"]
        else:
            _log_failure(series_id, f"yf no Close col for {yf_sym}")
            return None

    s = s.dropna()
    if s.empty:
        _log_failure(series_id, f"yf all-NaN for {yf_sym}")
        return None
    s.name = series_id
    s.index = pd.DatetimeIndex(s.index).tz_localize(None)
    return s.astype(float)


_TVDATAFEED = None
def _tv_singleton():
    """Lazily attempt to construct a tvdatafeed client.

    Skipped entirely when env CORR_DISABLE_TV=1 (default for unauthenticated
    runs, since tvdatafeed without TradingView credentials hits long timeouts).
    """
    global _TVDATAFEED
    import os
    if os.environ.get("CORR_DISABLE_TV", "1") == "1":
        _TVDATAFEED = False
        return None
    if _TVDATAFEED is False:
        return None
    if _TVDATAFEED is not None:
        return _TVDATAFEED
    try:
        from tvDatafeed import TvDatafeed, Interval  # noqa
    except Exception:
        try:
            from tvdatafeed import TvDatafeed, Interval  # noqa
        except Exception:
            _TVDATAFEED = False
            return None
    try:
        _TVDATAFEED = (TvDatafeed(), Interval)
    except Exception:
        _TVDATAFEED = False
        return None
    return _TVDATAFEED


def fetch_tv(series_id: str) -> pd.Series | None:
    """Try tvdatafeed if installed; symbol format is 'EXCHANGE:SYMBOL'."""
    pair = _tv_singleton()
    if not pair:
        return None
    tv, Interval = pair
    if ":" not in series_id:
        return None
    exch, sym = series_id.split(":", 1)
    try:
        df = tv.get_hist(symbol=sym, exchange=exch, interval=Interval.in_daily, n_bars=5000)
    except Exception as e:
        _log_failure(series_id, f"tvdatafeed {series_id}: {e}")
        return None
    if df is None or df.empty:
        return None
    s = df["close"].copy()
    s.name = series_id
    s.index = pd.DatetimeIndex(s.index).tz_localize(None)
    return s.astype(float)


def fetch_fred(series_id: str, fred_id: str) -> pd.Series | None:
    """Direct CSV from FRED — no API key needed."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={fred_id}"
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        _log_failure(series_id, f"fred GET {fred_id}: {e}")
        return None
    try:
        df = pd.read_csv(io.StringIO(r.text))
    except Exception as e:
        _log_failure(series_id, f"fred parse {fred_id}: {e}")
        return None
    # FRED CSVs: column 1 is DATE, column 2 is the series id (or VALUE)
    cols = list(df.columns)
    if len(cols) < 2:
        _log_failure(series_id, f"fred bad cols {cols}")
        return None
    date_col, val_col = cols[0], cols[1]
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df[val_col] = pd.to_numeric(df[val_col], errors="coerce")
    df = df.dropna(subset=[date_col]).set_index(date_col).sort_index()
    s = df[val_col].dropna()
    if s.empty:
        _log_failure(series_id, f"fred empty {fred_id}")
        return None
    # Filter to start date
    s = s[s.index >= pd.Timestamp(START_DATE)]
    s.name = series_id
    s.index = pd.DatetimeIndex(s.index).tz_localize(None)
    return s.astype(float)


def fetch_stooq(series_id: str, sym: str) -> pd.Series | None:
    """Stooq CSV — daily."""
    sym_l = sym.lower()
    url = f"https://stooq.com/q/d/l/?s={sym_l}&i=d"
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        _log_failure(series_id, f"stooq GET {sym}: {e}")
        return None
    try:
        df = pd.read_csv(io.StringIO(r.text))
    except Exception as e:
        _log_failure(series_id, f"stooq parse {sym}: {e}")
        return None
    if df.empty or "Date" not in df.columns or "Close" not in df.columns:
        _log_failure(series_id, f"stooq empty/bad-schema for {sym}")
        return None
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"]).set_index("Date").sort_index()
    s = pd.to_numeric(df["Close"], errors="coerce").dropna()
    if s.empty:
        _log_failure(series_id, f"stooq all-NaN for {sym}")
        return None
    s = s[s.index >= pd.Timestamp(START_DATE)]
    s.name = series_id
    s.index = pd.DatetimeIndex(s.index).tz_localize(None)
    return s.astype(float)


_STOOQ_HINTS = {
    "LME:CA1!": "xal.f",
    "LME:ZS1!": "xzn.f",
    "LME:NI1!": "xni.f",
    "LME:SN1!": "xsn.f",
    "LME:PB1!": "xpb.f",
}


def fetch_one(entry: dict) -> pd.Series | None:
    """Dispatch by source with fallback to yfinance."""
    sid = entry["id"]
    src = entry.get("src")
    yf_sym = entry.get("yf")

    if src == "derived" or src == "premium":
        return None

    if src == "tv":
        s = fetch_tv(sid)
        if s is not None and not s.empty:
            return s
        return fetch_yfinance(sid, yf_sym)

    if src == "fred":
        # Allow explicit `fred` field to override series_id as FRED code.
        fred_code = entry.get("fred") or sid
        return fetch_fred(sid, fred_code)

    if src == "stooq":
        sym = _STOOQ_HINTS.get(sid, yf_sym or sid.split(":", 1)[-1])
        return fetch_stooq(sid, sym)

    if src in {"bi", "bps"}:
        if yf_sym:
            return fetch_yfinance(sid, yf_sym)
        _log_failure(sid, f"src={src} no yf fallback")
        return None

    _log_failure(sid, f"unknown src={src}")
    return None


# ------------------------------------------------------------------
# Aggregation: daily -> weekly (Friday close) and monthly (last business day)
# ------------------------------------------------------------------

def to_weekly(daily: pd.Series) -> pd.Series:
    if daily is None or daily.empty:
        return pd.Series(dtype=float)
    # 'W-FRI' = week ending Friday; .last() = last observation in window
    w = daily.resample("W-FRI").last().dropna()
    return w


def to_monthly(daily: pd.Series) -> pd.Series:
    if daily is None or daily.empty:
        return pd.Series(dtype=float)
    # 'BME' = business month end (replaces deprecated 'BM')
    try:
        m = daily.resample("BME").last().dropna()
    except Exception:
        m = daily.resample("BM").last().dropna()
    return m


# ------------------------------------------------------------------
# Per-category parquet upserts (idempotent)
# ------------------------------------------------------------------

def _merge_into_parquet(path: Path, new: pd.DataFrame) -> pd.DataFrame:
    """Wide-format upsert: load existing, combine_first with `new`, write back."""
    if path.exists():
        try:
            existing = pd.read_parquet(path)
            existing.index = pd.DatetimeIndex(existing.index)
        except Exception as e:
            log.warning("Failed to read existing parquet %s: %s — overwriting", path, e)
            existing = pd.DataFrame()
    else:
        existing = pd.DataFrame()

    if existing.empty:
        merged = new.copy()
    else:
        # New values take priority for overlapping (date, col) cells
        merged = new.combine_first(existing)
    merged = merged.sort_index()
    merged.to_parquet(path)
    return merged


def write_category_parquets(cat: str, weekly: pd.DataFrame, monthly: pd.DataFrame) -> None:
    if not weekly.empty:
        _merge_into_parquet(RAW_W / f"{cat}.parquet", weekly)
    if not monthly.empty:
        _merge_into_parquet(RAW_M / f"{cat}.parquet", monthly)


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

def _existing_series_in_cat(cat: str) -> set[str]:
    """Read the weekly parquet for `cat` and return the set of column names."""
    p = RAW_W / f"{cat}.parquet"
    if not p.exists():
        return set()
    try:
        df = pd.read_parquet(p)
        return set(df.columns)
    except Exception:
        return set()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--category", help="Restrict to one category")
    p.add_argument("--ids", help="Comma-separated series IDs to fetch")
    p.add_argument("--limit", type=int, help="Fetch only first N matching")
    p.add_argument("--catalog", default=str(CATALOG))
    p.add_argument("--force", action="store_true",
                   help="Refetch even if already in parquet")
    args = p.parse_args()

    universe = json.loads(Path(args.catalog).read_text(encoding="utf-8"))
    series = universe["series"]

    if args.ids:
        wanted = {x.strip() for x in args.ids.split(",") if x.strip()}
        series = [s for s in series if s["id"] in wanted]
    if args.category:
        series = [s for s in series if s["cat"] == args.category]
    if args.limit:
        series = series[: args.limit]

    # Skip-existing (idempotent re-fetch) unless --force or --ids was given
    if not args.force and not args.ids:
        existing_by_cat: dict[str, set[str]] = {}
        before = len(series)
        kept = []
        for entry in series:
            cat = entry["cat"]
            if cat not in existing_by_cat:
                existing_by_cat[cat] = _existing_series_in_cat(cat)
            if entry.get("src") in {"derived", "premium"}:
                continue
            if entry["id"] in existing_by_cat[cat]:
                continue
            kept.append(entry)
        log.info("Skip-existing: %d -> %d series to fetch", before, len(kept))
        series = kept

    log.info("Fetching %d series", len(series))

    # group results by category
    weekly_by_cat: dict[str, dict[str, pd.Series]] = defaultdict(dict)
    monthly_by_cat: dict[str, dict[str, pd.Series]] = defaultdict(dict)
    successes = 0
    failures = 0
    summary = []  # per-symbol stats for stdout

    t0 = time.time()
    for i, entry in enumerate(series, 1):
        sid = entry["id"]
        cat = entry["cat"]
        if entry.get("src") in {"derived", "premium"}:
            log.info("[%d/%d] %s SKIP src=%s", i, len(series), sid, entry["src"])
            continue
        try:
            daily = fetch_one(entry)
        except Exception as e:
            _log_failure(sid, f"unhandled: {type(e).__name__}: {e}")
            log.warning("[%d/%d] %s FAIL %s", i, len(series), sid, e)
            failures += 1
            continue

        if daily is None or daily.empty:
            log.warning("[%d/%d] %s NO DATA", i, len(series), sid)
            failures += 1
            summary.append((sid, 0, None, None, "no data"))
            continue

        w = to_weekly(daily)
        m = to_monthly(daily)
        weekly_by_cat[cat][sid] = w
        monthly_by_cat[cat][sid] = m
        successes += 1
        summary.append((
            sid,
            int(len(daily)),
            daily.index.min().date().isoformat() if len(daily) else None,
            daily.index.max().date().isoformat() if len(daily) else None,
            "ok",
        ))
        if i % 10 == 0 or i == len(series):
            elapsed = time.time() - t0
            log.info("Progress %d/%d (%.1fs)  ok=%d fail=%d",
                     i, len(series), elapsed, successes, failures)

    # Write parquets per category
    for cat, sym_map in weekly_by_cat.items():
        if not sym_map:
            continue
        wide_w = pd.concat(sym_map, axis=1)
        wide_w.columns = list(sym_map.keys())
        wide_m_map = monthly_by_cat[cat]
        wide_m = pd.concat(wide_m_map, axis=1)
        wide_m.columns = list(wide_m_map.keys())
        write_category_parquets(cat, wide_w, wide_m)
        log.info("Wrote category=%s  weekly_cols=%d  monthly_cols=%d",
                 cat, wide_w.shape[1], wide_m.shape[1])

    # Print compact summary
    log.info("== fetch summary ==")
    log.info("Success: %d  Fail: %d  Total: %d", successes, failures, len(series))
    for sid, n, mn, mx, st in summary:
        log.info("  %-26s rows=%-6d  range=%s..%s  status=%s", sid, n, mn, mx, st)


if __name__ == "__main__":
    main()
