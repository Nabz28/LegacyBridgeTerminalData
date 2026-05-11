"""merge_staging — merge all per-agent staging parquets + universe segments into the main files.

Steps:
1. Concat all 6 agent weekly + monthly parquets columnwise into existing indonesia_equities parquet
   (de-duplicating columns — first occurrence wins, including the existing parquet).
2. Append all 6 agent universe entries into the main universe.json (skip duplicates by id).
3. Normalize weekly index to Friday-end, monthly to month-end (idempotent).
4. Print before/after stats.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W = DATA_ROOT / "raw" / "weekly" / "indonesia_equities.parquet"
RAW_M = DATA_ROOT / "raw" / "monthly" / "indonesia_equities.parquet"
STAGE_RAW = DATA_ROOT / "raw" / "staging"
STAGE_CAT = ROOT / "catalog" / "staging"
UNIVERSE = ROOT / "catalog" / "universe.json"


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def merge_weekly():
    main = pd.read_parquet(RAW_W) if RAW_W.exists() else pd.DataFrame()
    cols_before = set(main.columns)
    parts = [main] if not main.empty else []
    for n in range(1, 7):
        p = STAGE_RAW / f"agent{n}_weekly.parquet"
        if not p.exists():
            print(f"  agent{n} weekly: missing")
            continue
        df = pd.read_parquet(p)
        # Drop columns already present (first occurrence wins).
        new_cols = [c for c in df.columns if c not in cols_before]
        if new_cols:
            parts.append(df[new_cols])
            cols_before.update(new_cols)
            print(f"  agent{n} weekly: +{len(new_cols)} new cols ({len(df.columns) - len(new_cols)} duplicates skipped)")
        else:
            print(f"  agent{n} weekly: 0 new cols (all duplicates)")
    if not parts:
        return
    merged = pd.concat(parts, axis=1)
    # Friday normalize
    merged.index = to_friday(pd.DatetimeIndex(merged.index))
    merged = merged.groupby(level=0).last().sort_index()
    merged.to_parquet(RAW_W)
    print(f"weekly: {merged.shape[1]} cols, {merged.shape[0]} rows -> {RAW_W.name}")


def merge_monthly():
    main = pd.read_parquet(RAW_M) if RAW_M.exists() else pd.DataFrame()
    cols_before = set(main.columns)
    parts = [main] if not main.empty else []
    for n in range(1, 7):
        p = STAGE_RAW / f"agent{n}_monthly.parquet"
        if not p.exists():
            print(f"  agent{n} monthly: missing")
            continue
        df = pd.read_parquet(p)
        new_cols = [c for c in df.columns if c not in cols_before]
        if new_cols:
            parts.append(df[new_cols])
            cols_before.update(new_cols)
            print(f"  agent{n} monthly: +{len(new_cols)} new cols")
    if not parts:
        return
    merged = pd.concat(parts, axis=1)
    idx = pd.DatetimeIndex(merged.index)
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    merged.index = idx.to_period("M").to_timestamp("M")
    merged = merged.groupby(level=0).last().sort_index()
    merged.to_parquet(RAW_M)
    print(f"monthly: {merged.shape[1]} cols, {merged.shape[0]} rows -> {RAW_M.name}")


def merge_universe():
    cat = json.loads(UNIVERSE.read_text())
    existing = {s["id"] for s in cat["series"]}
    n_added = 0
    n_recat = 0
    n_recat_with_new = 0  # number of new entries that already had a recat suggestion

    # Load all recat maps first (later agents overwrite earlier).
    full_recat: dict[str, str] = {}
    for n in range(1, 7):
        rp = STAGE_CAT / f"agent{n}_recat.json"
        if rp.exists():
            try:
                rmap = json.loads(rp.read_text())
                if isinstance(rmap, dict):
                    full_recat.update(rmap)
            except Exception as e:
                print(f"  agent{n}_recat: parse error {e}")

    # Append new entries from each agent's primary catalog file.
    for n in range(1, 7):
        p = STAGE_CAT / f"agent{n}.json"
        if not p.exists():
            continue
        seg = json.loads(p.read_text())
        for entry in seg.get("entries", []):
            if entry["id"] in existing:
                continue
            # If recat has a more specific sub for this id, prefer it.
            if entry["id"] in full_recat:
                entry["sub"] = full_recat[entry["id"]]
                n_recat_with_new += 1
            cat["series"].append(entry)
            existing.add(entry["id"])
            n_added += 1

    # Apply recat to all existing entries (including the freshly added ones).
    for s in cat["series"]:
        if s["id"] in full_recat:
            new_sub = full_recat[s["id"]]
            if s.get("sub") != new_sub:
                s["sub"] = new_sub
                n_recat += 1

    cat["meta"]["total_series"] = len(cat["series"])
    UNIVERSE.write_text(json.dumps(cat, separators=(",", ":")))
    print(f"universe: +{n_added} new entries, {n_recat} sub-industries recategorized -> total {len(cat['series'])}")


def main():
    print("=== merging weekly parquets ===")
    merge_weekly()
    print("=== merging monthly parquets ===")
    merge_monthly()
    print("=== merging universe.json ===")
    merge_universe()


if __name__ == "__main__":
    main()
