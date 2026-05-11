"""merge_macro_fx_staging — merge FX agent + macro agents (US/CN/ID) + audit recat.

Layout of staging files (set up by agents):
  data/raw/staging/fx_agent1_{weekly,monthly}.parquet     -> global_fx parquet
  data/raw/staging/macro_agent2_{weekly,monthly}.parquet  -> us_macro parquet
  data/raw/staging/macro_agent3_{weekly,monthly}.parquet  -> NEW china_macro parquet
  data/raw/staging/macro_agent4_{weekly,monthly}.parquet  -> indonesia_macro parquet
  catalog/staging/fx_agent1.json
  catalog/staging/macro_agent2.json (us_macro)
  catalog/staging/macro_agent3.json (china_macro)
  catalog/staging/macro_agent4.json (indonesia_macro)
  catalog/staging/macro_audit_recat.json (recat + ret_fix)
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
STAGE_RAW = DATA_ROOT / "raw" / "staging"
STAGE_CAT = ROOT / "catalog" / "staging"
RAW_W_DIR = DATA_ROOT / "raw" / "weekly"
RAW_M_DIR = DATA_ROOT / "raw" / "monthly"
UNIVERSE = ROOT / "catalog" / "universe.json"

# Routing: which agent file lands in which target parquet category
ROUTING = [
    # (staging_basename, target_category)
    ("fx_agent1",     "global_fx"),
    ("macro_agent2",  "us_macro"),
    ("macro_agent3",  "china_macro"),
    ("macro_agent4",  "indonesia_macro"),
]


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def merge_into(target_path: Path, source_path: Path, freq: str) -> tuple[int, int]:
    """Merge source columns into target parquet (creating target if absent). Returns (cols_added, total_cols)."""
    if not source_path.exists():
        print(f"  source missing: {source_path.name}")
        return 0, 0
    src = pd.read_parquet(source_path)
    if target_path.exists():
        tgt = pd.read_parquet(target_path)
        prev_cols = set(tgt.columns)
        new_cols = [c for c in src.columns if c not in prev_cols]
        if new_cols:
            merged = pd.concat([tgt, src[new_cols]], axis=1)
        else:
            merged = tgt
    else:
        prev_cols = set()
        merged = src
    # Re-normalize index
    if freq == "w":
        merged.index = to_friday(pd.DatetimeIndex(merged.index))
    else:
        idx = pd.DatetimeIndex(merged.index)
        if idx.tz is not None:
            idx = idx.tz_localize(None)
        merged.index = idx.to_period("M").to_timestamp("M")
    merged = merged.groupby(level=0).last().sort_index()
    merged.to_parquet(target_path)
    added = sum(1 for c in src.columns if c not in prev_cols)
    return added, merged.shape[1]


def merge_universe():
    cat = json.loads(UNIVERSE.read_text(encoding="utf-8"))
    existing = {s["id"] for s in cat["series"]}

    # Load audit recat first.
    audit_path = STAGE_CAT / "macro_audit_recat.json"
    sub_recat: dict[str, str] = {}
    ret_fix: dict[str, str] = {}
    if audit_path.exists():
        try:
            audit = json.loads(audit_path.read_text(encoding="utf-8"))
            sub_recat = audit.get("recat", {})
            ret_fix = audit.get("ret_fix", {})
        except Exception as e:
            print(f"  audit parse error: {e}")

    n_added = 0
    n_recat = 0
    n_ret_fix = 0

    # Append new entries from each agent's primary catalog file.
    for stage_name, target_cat in ROUTING:
        p = STAGE_CAT / f"{stage_name}.json"
        if not p.exists():
            print(f"  skip {p.name}: missing")
            continue
        seg = json.loads(p.read_text(encoding="utf-8"))
        for entry in seg.get("entries", []):
            if entry["id"] in existing:
                continue
            # Force category from routing (override any agent-set value)
            entry["cat"] = target_cat
            cat["series"].append(entry)
            existing.add(entry["id"])
            n_added += 1

    # Apply audit fixes to all entries (existing + new).
    for s in cat["series"]:
        if s["id"] in sub_recat and s.get("sub") != sub_recat[s["id"]]:
            s["sub"] = sub_recat[s["id"]]
            n_recat += 1
        if s["id"] in ret_fix and s.get("ret") != ret_fix[s["id"]]:
            s["ret"] = ret_fix[s["id"]]
            n_ret_fix += 1

    cat["meta"]["total_series"] = len(cat["series"])
    UNIVERSE.write_text(json.dumps(cat, separators=(",", ":"), ensure_ascii=True), encoding="utf-8")
    print(f"universe: +{n_added} new, {n_recat} sub-recat, {n_ret_fix} ret-fix -> total {len(cat['series'])}")


def main():
    RAW_W_DIR.mkdir(parents=True, exist_ok=True)
    RAW_M_DIR.mkdir(parents=True, exist_ok=True)

    print("=== merging weekly parquets ===")
    for stage_name, target_cat in ROUTING:
        src = STAGE_RAW / f"{stage_name}_weekly.parquet"
        tgt = RAW_W_DIR / f"{target_cat}.parquet"
        added, total = merge_into(tgt, src, "w")
        print(f"  {stage_name} -> {target_cat}.parquet: +{added} cols, total {total}")

    print("=== merging monthly parquets ===")
    for stage_name, target_cat in ROUTING:
        src = STAGE_RAW / f"{stage_name}_monthly.parquet"
        tgt = RAW_M_DIR / f"{target_cat}.parquet"
        added, total = merge_into(tgt, src, "m")
        print(f"  {stage_name} -> {target_cat}.parquet: +{added} cols, total {total}")

    print("=== merging universe ===")
    merge_universe()


if __name__ == "__main__":
    main()
