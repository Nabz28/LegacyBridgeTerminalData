"""bulk_us_fetch — bulk fetch a comma-separated list of US tickers via yfinance.

Identical pattern to bulk_idx_fetch.py but for US stocks (no suffix on yfinance).
Writes to per-agent staging parquets so multiple agents can run in parallel.

Example:
    python bulk_us_fetch.py --tickers AAPL,MSFT,GOOG --agent 1 --sub "Software"

Output:
    correlation/data/raw/staging/us_agent<N>_weekly.parquet  (cols=<TICKER>)
    correlation/data/raw/staging/us_agent<N>_monthly.parquet
    correlation/catalog/staging/us_agent<N>.json
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
    """Bulk-download via yfinance (no suffix for US tickers). Returns {ticker: close-series}."""
    out: dict[str, pd.Series] = {}
    for i in range(0, len(tickers), batch_size):
        chunk = tickers[i:i + batch_size]
        try:
            df = yf.download(
                tickers=chunk, start=start, interval="1d",
                group_by="ticker", auto_adjust=False, progress=False,
                threads=True, timeout=15,
            )
        except Exception as e:
            logging.warning("batch %d-%d failed: %s", i, i + len(chunk), str(e)[:80])
            continue
        if df is None or df.empty:
            continue
        if isinstance(df.columns, pd.MultiIndex):
            for t in chunk:
                if t in df.columns.get_level_values(0):
                    sub = df[t]
                    if "Close" in sub.columns:
                        s = sub["Close"].dropna()
                        if len(s) >= 26:
                            out[t] = s
        else:
            if "Close" in df.columns and len(chunk) == 1:
                s = df["Close"].dropna()
                if len(s) >= 26:
                    out[chunk[0]] = s
        time.sleep(0.5)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tickers", required=True)
    ap.add_argument("--agent", type=int, required=True)
    ap.add_argument("--start", default="2011-01-01")
    ap.add_argument("--names", default="")
    ap.add_argument("--sub", default="")
    ap.add_argument("--cat", default="us_equities", help="catalog category for these tickers (us_equities, etfs, etc.)")
    ap.add_argument("--prefix", default="us", help="staging file prefix (us_agent<N> or etf_agent<N>)")
    args = ap.parse_args()

    STAGE_RAW.mkdir(parents=True, exist_ok=True)
    STAGE_CAT.mkdir(parents=True, exist_ok=True)
    LOG.mkdir(parents=True, exist_ok=True)
    log_path = LOG / f"bulk_{args.prefix}_agent{args.agent}.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )
    log = logging.getLogger(f"{args.prefix}_agent{args.agent}")

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

    # Build wide weekly + monthly frames. Use bare ticker as column name.
    wk_cols, mo_cols = {}, {}
    for tkr, s in results.items():
        s_w = s.copy()
        s_w.index = to_friday(pd.DatetimeIndex(s_w.index))
        s_w = s_w.groupby(level=0).last().sort_index()

        s_m = s.copy()
        s_m.index = to_monthend(pd.DatetimeIndex(s_m.index))
        s_m = s_m.groupby(level=0).last().sort_index()

        wk_cols[tkr] = s_w
        mo_cols[tkr] = s_m

    if wk_cols:
        wk_df = pd.concat(wk_cols, axis=1)
        mo_df = pd.concat(mo_cols, axis=1)
        wk_path = STAGE_RAW / f"{args.prefix}_agent{args.agent}_weekly.parquet"
        mo_path = STAGE_RAW / f"{args.prefix}_agent{args.agent}_monthly.parquet"
        # Merge with prior writes for this agent (multiple --sub invocations).
        if wk_path.exists():
            prev_w = pd.read_parquet(wk_path)
            new_w = [c for c in wk_df.columns if c not in prev_w.columns]
            wk_df = pd.concat([prev_w, wk_df[new_w]], axis=1) if new_w else prev_w
        if mo_path.exists():
            prev_m = pd.read_parquet(mo_path)
            new_m = [c for c in mo_df.columns if c not in prev_m.columns]
            mo_df = pd.concat([prev_m, mo_df[new_m]], axis=1) if new_m else prev_m
        wk_df.to_parquet(wk_path)
        mo_df.to_parquet(mo_path)
        log.info("wrote %s shape=%s", wk_path.name, wk_df.shape)
        log.info("wrote %s shape=%s", mo_path.name, mo_df.shape)
    else:
        log.warning("agent %d: zero successful fetches", args.agent)

    # Universe entries — use bare TICKER as id (matches new convention).
    entries = []
    for tkr in sorted(results.keys()):
        entries.append({
            "id": tkr,
            "name": name_map.get(tkr, tkr),
            "yf": tkr,
            "src": "yf",
            "cat": args.cat,
            "sub": args.sub or "Stock",
            "ret": "log",
            "start": 2011,
        })
    cat_path = STAGE_CAT / f"{args.prefix}_agent{args.agent}.json"
    # Append-merge for multiple --sub calls per agent.
    if cat_path.exists():
        try:
            prev = json.loads(cat_path.read_text(encoding="utf-8"))
            existing_ids = {e["id"] for e in prev.get("entries", [])}
            for e in entries:
                if e["id"] not in existing_ids:
                    prev["entries"].append(e)
                    existing_ids.add(e["id"])
            prev["fetched"] = len(prev["entries"])
            cat_path.write_text(json.dumps(prev, separators=(",", ":")), encoding="utf-8")
        except Exception:
            cat_path.write_text(json.dumps({"agent": args.agent, "fetched": len(results),
                                            "attempted": len(tickers), "entries": entries},
                                           separators=(",", ":")), encoding="utf-8")
    else:
        cat_path.write_text(json.dumps({"agent": args.agent, "fetched": len(results),
                                        "attempted": len(tickers), "entries": entries},
                                       separators=(",", ":")), encoding="utf-8")
    log.info("wrote %s with %d entries (this batch)", cat_path.name, len(entries))

    failed = sorted(set(tickers) - set(results.keys()))
    summary = {
        "agent": args.agent, "sub": args.sub,
        "attempted": len(tickers), "succeeded": len(results),
        "failed_count": len(failed), "failed_sample": failed[:30],
        "wall_seconds": round(time.time() - t0, 1),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
