"""merge_global_staging — merge per-agent global staging into MULTIPLE category parquets.

Each agent's staging parquet contains stocks across regions (europe_dm_latam / korea_japan_asean_india / china_hk / energy_commod / etc.).
For every entry in the staging json, route the column to the correct main parquet based on the entry's `cat` field.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W_DIR = DATA_ROOT / "raw" / "weekly"
RAW_M_DIR = DATA_ROOT / "raw" / "monthly"
STAGE_RAW = DATA_ROOT / "raw" / "staging"
STAGE_CAT = ROOT / "catalog" / "staging"
UNIVERSE = ROOT / "catalog" / "universe.json"

N_AGENTS = 5
PREFIX = "global"


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def collect_columns_by_cat(freq: str) -> dict[str, dict[str, pd.Series]]:
    """Returns {target_category: {column_id: series}} from all 5 agent staging files."""
    result: dict[str, dict[str, pd.Series]] = defaultdict(dict)
    for n in range(1, N_AGENTS + 1):
        # Read entries to know each id's target category
        cat_p = STAGE_CAT / f"{PREFIX}_agent{n}.json"
        if not cat_p.exists():
            print(f"  agent{n}: no catalog json")
            continue
        seg = json.loads(cat_p.read_text(encoding="utf-8"))
        id_to_cat: dict[str, str] = {e["id"]: e["cat"] for e in seg.get("entries", [])}

        # Read parquet
        parq_p = STAGE_RAW / f"{PREFIX}_agent{n}_{('weekly' if freq=='w' else 'monthly')}.parquet"
        if not parq_p.exists():
            continue
        df = pd.read_parquet(parq_p)
        for col in df.columns:
            tgt = id_to_cat.get(col)
            if not tgt:
                continue
            # If a column appears in multiple agents, first one wins.
            if col not in result[tgt]:
                result[tgt][col] = df[col]
    return result


def merge_freq(freq: str):
    print(f"=== merging {freq} ===")
    by_cat = collect_columns_by_cat(freq)
    raw_dir = RAW_W_DIR if freq == "w" else RAW_M_DIR
    for tgt_cat, cols_dict in sorted(by_cat.items()):
        target_path = raw_dir / f"{tgt_cat}.parquet"
        if target_path.exists():
            tgt_df = pd.read_parquet(target_path)
            existing_cols = set(tgt_df.columns)
        else:
            tgt_df = pd.DataFrame()
            existing_cols = set()

        new_cols = {k: v for k, v in cols_dict.items() if k not in existing_cols}
        if not new_cols:
            print(f"  {tgt_cat}: 0 new (all dupes)")
            continue
        new_df = pd.concat(new_cols, axis=1)
        merged = pd.concat([tgt_df, new_df], axis=1) if not tgt_df.empty else new_df

        if freq == "w":
            merged.index = to_friday(pd.DatetimeIndex(merged.index))
        else:
            idx = pd.DatetimeIndex(merged.index)
            if idx.tz is not None:
                idx = idx.tz_localize(None)
            merged.index = idx.to_period("M").to_timestamp("M")
        merged = merged.groupby(level=0).last().sort_index()
        merged.to_parquet(target_path)
        print(f"  {tgt_cat}: +{len(new_cols)} new -> total {merged.shape[1]} cols, {merged.shape[0]} rows")


def merge_universe():
    cat = json.loads(UNIVERSE.read_text(encoding="utf-8"))
    existing = {s["id"] for s in cat["series"]}
    n_added = 0
    by_cat = defaultdict(int)
    for n in range(1, N_AGENTS + 1):
        p = STAGE_CAT / f"{PREFIX}_agent{n}.json"
        if not p.exists():
            continue
        seg = json.loads(p.read_text(encoding="utf-8"))
        for entry in seg.get("entries", []):
            if entry["id"] in existing:
                continue
            cat["series"].append(entry)
            existing.add(entry["id"])
            n_added += 1
            by_cat[entry["cat"]] += 1
    cat["meta"]["total_series"] = len(cat["series"])
    UNIVERSE.write_text(json.dumps(cat, separators=(",", ":"), ensure_ascii=True), encoding="utf-8")
    print(f"universe: +{n_added} entries -> total {len(cat['series'])}")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"    {c}: +{n}")


def main():
    merge_freq("w")
    merge_freq("m")
    print("=== universe ===")
    merge_universe()


if __name__ == "__main__":
    main()
