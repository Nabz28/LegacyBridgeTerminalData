"""merge_more_staging — merge the second batch of global+ETF staging files.

Sources (all in correlation/data/raw/staging/ + correlation/catalog/staging/):
  - etf2_agent1_*.parquet  + etf2_agent1.json                 -> etfs.parquet
  - global2_agent2_*.parquet + global2_agent2.json            -> multi-cat
  - global3_agent3_*.parquet + global3_agent3_<1..9>.json     -> multi-cat
"""
from __future__ import annotations

import glob
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


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def load_entries_for(prefix: str) -> dict[str, str]:
    """Returns {id: cat} merged across all matching json files."""
    out: dict[str, str] = {}
    # exact match first
    p = STAGE_CAT / f"{prefix}.json"
    if p.exists():
        seg = json.loads(p.read_text(encoding="utf-8"))
        for e in seg.get("entries", []):
            out[e["id"]] = e["cat"]
    # numbered sub-files
    for fp in sorted(STAGE_CAT.glob(f"{prefix}_*.json")):
        try:
            seg = json.loads(fp.read_text(encoding="utf-8"))
            for e in seg.get("entries", []):
                out.setdefault(e["id"], e["cat"])
        except Exception as ex:
            print(f"  parse error {fp.name}: {ex}")
    return out


def collect_all_entries() -> list[dict]:
    """Return raw entries (full dicts, not just id->cat) merged across all sources."""
    all_entries = []
    seen = set()
    sources_glob = ["etf2_agent1.json", "global2_agent2.json", "global3_agent3*.json"]
    for pattern in sources_glob:
        for fp in sorted(STAGE_CAT.glob(pattern)):
            try:
                seg = json.loads(fp.read_text(encoding="utf-8"))
                for e in seg.get("entries", []):
                    if e["id"] in seen:
                        continue
                    all_entries.append(e)
                    seen.add(e["id"])
            except Exception as ex:
                print(f"  parse error {fp.name}: {ex}")
    return all_entries


def merge_freq(freq: str):
    print(f"=== merging {freq} ===")
    # ETF batch -> etfs.parquet
    etf_id_to_cat = load_entries_for("etf2_agent1")
    etf_parq = STAGE_RAW / f"etf2_agent1_{('weekly' if freq=='w' else 'monthly')}.parquet"
    if etf_parq.exists() and etf_id_to_cat:
        merge_into(RAW_W_DIR if freq == "w" else RAW_M_DIR, "etfs", etf_parq, etf_id_to_cat, freq)

    # Global batch 2 -> route by per-entry cat
    g2_id_to_cat = load_entries_for("global2_agent2")
    g2_parq = STAGE_RAW / f"global2_agent2_{('weekly' if freq=='w' else 'monthly')}.parquet"
    if g2_parq.exists() and g2_id_to_cat:
        route_to_cats(RAW_W_DIR if freq == "w" else RAW_M_DIR, g2_parq, g2_id_to_cat, freq)

    # Global batch 3 -> 9 sub-files of catalog, single parquet
    g3_id_to_cat = load_entries_for("global3_agent3")
    g3_parq = STAGE_RAW / f"global3_agent3_{('weekly' if freq=='w' else 'monthly')}.parquet"
    if g3_parq.exists() and g3_id_to_cat:
        route_to_cats(RAW_W_DIR if freq == "w" else RAW_M_DIR, g3_parq, g3_id_to_cat, freq)


def merge_into(raw_dir: Path, target_cat: str, src_parq: Path, id_to_cat: dict[str, str], freq: str):
    """Simple single-target merge (when all entries share one category)."""
    df = pd.read_parquet(src_parq)
    # Filter to columns whose target == target_cat
    keep_cols = [c for c in df.columns if id_to_cat.get(c) == target_cat]
    if not keep_cols:
        print(f"  {target_cat}: 0 columns to add from {src_parq.name}")
        return
    target_path = raw_dir / f"{target_cat}.parquet"
    if target_path.exists():
        tgt = pd.read_parquet(target_path)
        new_cols = [c for c in keep_cols if c not in tgt.columns]
        if not new_cols:
            print(f"  {target_cat}: 0 new (all dupes)")
            return
        merged = pd.concat([tgt, df[new_cols]], axis=1)
    else:
        merged = df[keep_cols]
        new_cols = keep_cols
    if freq == "w":
        merged.index = to_friday(pd.DatetimeIndex(merged.index))
    else:
        idx = pd.DatetimeIndex(merged.index)
        if idx.tz is not None:
            idx = idx.tz_localize(None)
        merged.index = idx.to_period("M").to_timestamp("M")
    merged = merged.groupby(level=0).last().sort_index()
    merged.to_parquet(target_path)
    print(f"  {target_cat}: +{len(new_cols)} new -> total {merged.shape[1]} cols")


def route_to_cats(raw_dir: Path, src_parq: Path, id_to_cat: dict[str, str], freq: str):
    """Multi-target route: each col goes to the parquet of its mapped cat."""
    df = pd.read_parquet(src_parq)
    by_cat: dict[str, list[str]] = defaultdict(list)
    for col in df.columns:
        tgt = id_to_cat.get(col)
        if tgt:
            by_cat[tgt].append(col)
    for tgt_cat, cols in sorted(by_cat.items()):
        target_path = raw_dir / f"{tgt_cat}.parquet"
        if target_path.exists():
            tgt = pd.read_parquet(target_path)
            new_cols = [c for c in cols if c not in tgt.columns]
            if not new_cols:
                print(f"  {tgt_cat}: 0 new (all dupes)")
                continue
            merged = pd.concat([tgt, df[new_cols]], axis=1)
        else:
            merged = df[cols]
            new_cols = cols
        if freq == "w":
            merged.index = to_friday(pd.DatetimeIndex(merged.index))
        else:
            idx = pd.DatetimeIndex(merged.index)
            if idx.tz is not None:
                idx = idx.tz_localize(None)
            merged.index = idx.to_period("M").to_timestamp("M")
        merged = merged.groupby(level=0).last().sort_index()
        merged.to_parquet(target_path)
        print(f"  {tgt_cat}: +{len(new_cols)} new from {src_parq.name} -> total {merged.shape[1]} cols")


def merge_universe():
    cat = json.loads(UNIVERSE.read_text(encoding="utf-8"))
    existing = {s["id"] for s in cat["series"]}
    n_added = 0
    by_cat = defaultdict(int)
    for entry in collect_all_entries():
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
