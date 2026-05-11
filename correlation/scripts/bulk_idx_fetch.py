"""bulk_idx_fetch — bulk fetch a comma-separated list of IDX tickers via yfinance.

Writes to per-agent staging parquets (so multiple agents don't contend).

Example:
    python bulk_idx_fetch.py --tickers ABBA,ACES,ADHI --agent 1 --start 2011-01-01

Output:
    correlation/data/raw/staging/agent<N>_weekly.parquet  (cols=IDX:<TICKER>, index=Friday)
    correlation/data/raw/staging/agent<N>_monthly.parquet (cols=IDX:<TICKER>, index=monthend)
    correlation/catalog/staging/agent<N>.json             (universe entries for fetched tickers)
    correlation/logs/bulk_idx_agent<N>.log
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import pandas as pd
import yfinance as yf

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
STAGE_RAW = DATA_ROOT / "raw" / "staging"
STAGE_CAT = ROOT / "catalog" / "staging"
LOG = ROOT / "logs"


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def to_monthend(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    return idx.to_period("M").to_timestamp("M")


def fetch_batch(tickers: list[str], start: str, batch_size: int = 25) -> dict[str, pd.Series]:
    """Bulk-download with yfinance. Returns {ticker: close-series} for those that returned data."""
    out: dict[str, pd.Series] = {}
    for i in range(0, len(tickers), batch_size):
        chunk = tickers[i:i + batch_size]
        yf_syms = [f"{t}.JK" for t in chunk]
        try:
            df = yf.download(
                tickers=yf_syms, start=start, interval="1d",
                group_by="ticker", auto_adjust=False, progress=False,
                threads=True, timeout=15,
            )
        except Exception as e:
            logging.warning("batch %d-%d failed: %s", i, i + len(chunk), str(e)[:80])
            continue
        if df is None or df.empty:
            continue
        # Two layouts: with single ticker -> simple cols; with multi -> MultiIndex cols
        if isinstance(df.columns, pd.MultiIndex):
            for t in chunk:
                yf_t = f"{t}.JK"
                if yf_t in df.columns.get_level_values(0):
                    sub = df[yf_t]
                    if "Close" in sub.columns:
                        s = sub["Close"].dropna()
                        if len(s) >= 26:
                            out[t] = s
        else:
            # Single-ticker case
            if "Close" in df.columns and len(chunk) == 1:
                s = df["Close"].dropna()
                if len(s) >= 26:
                    out[chunk[0]] = s
        time.sleep(0.5)  # gentle pacing
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tickers", required=True, help="comma-separated IDX 4-letter tickers (no .JK)")
    ap.add_argument("--agent", type=int, required=True, help="agent number 1..6")
    ap.add_argument("--start", default="2011-01-01")
    ap.add_argument("--names", default="", help="optional 'TICKER:Company Name|TICKER:...' for catalog entries")
    ap.add_argument("--sub", default="", help="optional sub-class to apply to all (e.g. 'Energy')")
    args = ap.parse_args()

    STAGE_RAW.mkdir(parents=True, exist_ok=True)
    STAGE_CAT.mkdir(parents=True, exist_ok=True)
    LOG.mkdir(parents=True, exist_ok=True)
    log_path = LOG / f"bulk_idx_agent{args.agent}.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )
    log = logging.getLogger(f"agent{args.agent}")

    tickers = sorted(set(t.strip().upper() for t in args.tickers.split(",") if t.strip()))
    log.info("agent %d: %d tickers", args.agent, len(tickers))

    name_map: dict[str, str] = {}
    if args.names:
        for kv in args.names.split("|"):
            if ":" in kv:
                k, v = kv.split(":", 1)
                name_map[k.strip().upper()] = v.strip()

    t0 = time.time()
    results = fetch_batch(tickers, start=args.start)
    log.info("agent %d: fetched %d/%d in %.1fs", args.agent, len(results), len(tickers), time.time() - t0)

    # Build wide weekly + monthly frames.
    wk_cols, mo_cols = {}, {}
    for tkr, s in results.items():
        s_w = s.copy()
        s_w.index = to_friday(pd.DatetimeIndex(s_w.index))
        s_w = s_w.groupby(level=0).last().sort_index()

        s_m = s.copy()
        s_m.index = to_monthend(pd.DatetimeIndex(s_m.index))
        s_m = s_m.groupby(level=0).last().sort_index()

        wk_cols[f"IDX:{tkr}"] = s_w
        mo_cols[f"IDX:{tkr}"] = s_m

    if wk_cols:
        wk_df = pd.concat(wk_cols, axis=1)
        mo_df = pd.concat(mo_cols, axis=1)
        wk_path = STAGE_RAW / f"agent{args.agent}_weekly.parquet"
        mo_path = STAGE_RAW / f"agent{args.agent}_monthly.parquet"
        # Merge with any prior write for this agent so multiple invocations stack.
        if wk_path.exists():
            prev_w = pd.read_parquet(wk_path)
            new_w_cols = [c for c in wk_df.columns if c not in prev_w.columns]
            if new_w_cols:
                wk_df = pd.concat([prev_w, wk_df[new_w_cols]], axis=1)
            else:
                wk_df = prev_w
        if mo_path.exists():
            prev_m = pd.read_parquet(mo_path)
            new_m_cols = [c for c in mo_df.columns if c not in prev_m.columns]
            if new_m_cols:
                mo_df = pd.concat([prev_m, mo_df[new_m_cols]], axis=1)
            else:
                mo_df = prev_m
        wk_df.to_parquet(wk_path)
        mo_df.to_parquet(mo_path)
        log.info("wrote %s shape=%s", wk_path.name, wk_df.shape)
        log.info("wrote %s shape=%s", mo_path.name, mo_df.shape)
    else:
        log.warning("agent %d: zero successful fetches, no parquet written", args.agent)

    # Universe entries.
    entries = []
    for tkr in sorted(results.keys()):
        entries.append({
            "id": f"IDX:{tkr}",
            "name": name_map.get(tkr, f"PT {tkr} Tbk"),
            "yf": f"{tkr}.JK",
            "src": "tv",
            "cat": "indonesia_equities",
            "sub": args.sub or "Stock",
            "ret": "log",
            "start": 2011,
        })
    cat_path = STAGE_CAT / f"agent{args.agent}.json"
    cat_path.write_text(json.dumps({"agent": args.agent, "fetched": len(results), "attempted": len(tickers), "entries": entries}, separators=(",", ":")))
    log.info("wrote %s with %d entries", cat_path.name, len(entries))

    # Print final summary as JSON for easy parsing.
    failed = sorted(set(tickers) - set(results.keys()))
    summary = {
        "agent": args.agent,
        "attempted": len(tickers),
        "succeeded": len(results),
        "failed_count": len(failed),
        "failed_sample": failed[:30],
        "wall_seconds": round(time.time() - t0, 1),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
