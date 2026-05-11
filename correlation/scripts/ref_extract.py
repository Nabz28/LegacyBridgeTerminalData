"""ref_extract — extract a list of Refinitiv RICs from data/{us,cn,id}.sqlite into staging parquets.

Usage:
    python ref_extract.py --db cn --rics aCNCPILK,aCNPPILK,... --cat china_macro --agent 3 --sub "CPI/Inflation"

Resamples each series to:
  * weekly Friday (ffill from monthly/quarterly so the value is held until next release)
  * monthly month-end

Writes to:
    data/raw/staging/macro_agent<N>_weekly.parquet
    data/raw/staging/macro_agent<N>_monthly.parquet
    catalog/staging/macro_agent<N>.json
"""
from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent  # The worktree root with data/ at top level
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


def fetch_one(conn: sqlite3.Connection, ric: str) -> pd.Series | None:
    rows = conn.execute(
        "SELECT date, value FROM observations WHERE ric=? ORDER BY date", (ric,)
    ).fetchall()
    if not rows:
        return None
    s = pd.Series(
        [float(v) if v is not None else None for _, v in rows],
        index=pd.to_datetime([d for d, _ in rows]),
        name=ric,
    ).dropna()
    return s if len(s) >= 6 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True, choices=["us", "cn", "id"])
    ap.add_argument("--rics", required=True, help="comma-separated RIC list")
    ap.add_argument("--cat", required=True, help="catalog category for these series (us_macro / china_macro / indonesia_macro)")
    ap.add_argument("--agent", type=int, required=True)
    ap.add_argument("--sub", default="Macro")
    ap.add_argument("--ret", default="yoy", choices=["log", "diff", "yoy"], help="return type for these series")
    ap.add_argument("--names", default="", help="optional 'RIC:Display Name|RIC:...'")
    args = ap.parse_args()

    STAGE_RAW.mkdir(parents=True, exist_ok=True)
    STAGE_CAT.mkdir(parents=True, exist_ok=True)
    LOG.mkdir(parents=True, exist_ok=True)
    log_path = LOG / f"ref_extract_agent{args.agent}.log"

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_path, encoding="utf-8"), logging.StreamHandler(sys.stdout)],
    )
    log = logging.getLogger(f"ref_agent{args.agent}")

    # Refinitiv sqlite is in the worktree root data/ dir
    worktree_root = ROOT.parent  # correlation/.. → worktree root
    db_path = worktree_root / "data" / f"{args.db}.sqlite"
    if not db_path.exists():
        # Walk up
        for p in worktree_root.parents:
            cand = p / "data" / f"{args.db}.sqlite"
            if cand.exists():
                db_path = cand; break
    log.info("Using sqlite: %s", db_path)
    if not db_path.exists():
        log.error("sqlite not found")
        sys.exit(2)
    conn = sqlite3.connect(db_path)

    rics = sorted(set(r.strip() for r in args.rics.split(",") if r.strip()))
    log.info("Fetching %d RICs from %s db", len(rics), args.db)

    name_map: dict[str, str] = {}
    if args.names:
        for kv in args.names.split("|"):
            if ":" in kv:
                k, v = kv.split(":", 1)
                name_map[k.strip()] = v.strip()

    wk_cols, mo_cols = {}, {}
    universe_entries = []
    fail = []
    for ric in rics:
        s = fetch_one(conn, ric)
        if s is None:
            fail.append(ric)
            continue
        # Get description from series table.
        row = conn.execute(
            "SELECT description, frequency FROM series WHERE ric=? LIMIT 1", (ric,)
        ).fetchone()
        desc = row[0] if row else ric
        freq = row[1] if row else ""

        # For monthly/quarterly, forward-fill onto weekly Fridays.
        s.index = pd.to_datetime(s.index).normalize()
        s = s.sort_index()
        # Daily -> weekly Friday last; monthly already fine if we resample
        s_w = s.copy()
        s_w.index = to_friday(pd.DatetimeIndex(s_w.index))
        s_w = s_w.groupby(level=0).last().sort_index()
        # Forward-fill to weekly grid 2011-now (so monthly value holds across weeks)
        full_w = pd.date_range("2011-01-07", "2026-05-08", freq="W-FRI")
        s_w = s_w.reindex(full_w).ffill()

        s_m = s.copy()
        s_m.index = s_m.index.to_period("M").to_timestamp("M")
        s_m = s_m.groupby(level=0).last().sort_index()
        full_m = pd.date_range("2011-01-31", "2026-05-31", freq="ME")
        s_m = s_m.reindex(full_m).ffill()

        wk_cols[ric] = s_w
        mo_cols[ric] = s_m

        universe_entries.append({
            "id": ric,
            "name": name_map.get(ric, desc),
            "yf": None,
            "fred": None,
            "src": "refinitiv",
            "cat": args.cat,
            "sub": args.sub,
            "ret": args.ret,
            "start": int(s.index.min().year),
            "frequency": freq,
        })

    if not wk_cols:
        log.error("agent %d: no series fetched", args.agent)
        sys.exit(1)

    wk_df = pd.concat(wk_cols, axis=1)
    mo_df = pd.concat(mo_cols, axis=1)
    wk_path = STAGE_RAW / f"macro_agent{args.agent}_weekly.parquet"
    mo_path = STAGE_RAW / f"macro_agent{args.agent}_monthly.parquet"

    # Append-merge for multiple invocations.
    if wk_path.exists():
        prev = pd.read_parquet(wk_path)
        new_cols = [c for c in wk_df.columns if c not in prev.columns]
        if new_cols:
            wk_df = pd.concat([prev, wk_df[new_cols]], axis=1)
        else:
            wk_df = prev
    if mo_path.exists():
        prev = pd.read_parquet(mo_path)
        new_cols = [c for c in mo_df.columns if c not in prev.columns]
        if new_cols:
            mo_df = pd.concat([prev, mo_df[new_cols]], axis=1)
        else:
            mo_df = prev
    wk_df.to_parquet(wk_path)
    mo_df.to_parquet(mo_path)
    log.info("wrote %s shape=%s", wk_path.name, wk_df.shape)
    log.info("wrote %s shape=%s", mo_path.name, mo_df.shape)

    cat_path = STAGE_CAT / f"macro_agent{args.agent}.json"
    if cat_path.exists():
        try:
            prev = json.loads(cat_path.read_text(encoding="utf-8"))
            existing_ids = {e["id"] for e in prev.get("entries", [])}
            for e in universe_entries:
                if e["id"] not in existing_ids:
                    prev["entries"].append(e)
                    existing_ids.add(e["id"])
            prev["fetched"] = len(prev["entries"])
            cat_path.write_text(json.dumps(prev, separators=(",", ":")), encoding="utf-8")
        except Exception:
            cat_path.write_text(json.dumps({"agent": args.agent, "entries": universe_entries}, separators=(",", ":")), encoding="utf-8")
    else:
        cat_path.write_text(json.dumps({"agent": args.agent, "entries": universe_entries}, separators=(",", ":")), encoding="utf-8")

    summary = {"agent": args.agent, "db": args.db, "cat": args.cat, "sub": args.sub,
               "attempted": len(rics), "succeeded": len(wk_cols),
               "failed_count": len(fail), "failed_sample": fail[:20]}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
