"""merge_crypto_staging — merge per-agent crypto staging parquets into main crypto.parquet."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W = DATA_ROOT / "raw" / "weekly" / "crypto.parquet"
RAW_M = DATA_ROOT / "raw" / "monthly" / "crypto.parquet"
STAGE_RAW = DATA_ROOT / "raw" / "staging"
STAGE_CAT = ROOT / "catalog" / "staging"
UNIVERSE = ROOT / "catalog" / "universe.json"

N_AGENTS = 5


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


def merge(target_path: Path, freq: str):
    main = pd.read_parquet(target_path) if target_path.exists() else pd.DataFrame()
    cols_before = set(main.columns)
    parts = [main] if not main.empty else []
    for n in range(1, N_AGENTS + 1):
        p = STAGE_RAW / f"crypto_agent{n}_{('weekly' if freq=='w' else 'monthly')}.parquet"
        if not p.exists():
            print(f"  agent{n} {freq}: missing")
            continue
        df = pd.read_parquet(p)
        new_cols = [c for c in df.columns if c not in cols_before]
        if new_cols:
            parts.append(df[new_cols])
            cols_before.update(new_cols)
            print(f"  agent{n} {freq}: +{len(new_cols)} new ({len(df.columns) - len(new_cols)} dupes)")
        else:
            print(f"  agent{n} {freq}: 0 new (all dupes)")
    if not parts:
        return
    merged = pd.concat(parts, axis=1)
    if freq == "w":
        merged.index = to_friday(pd.DatetimeIndex(merged.index))
    else:
        idx = pd.DatetimeIndex(merged.index)
        if idx.tz is not None:
            idx = idx.tz_localize(None)
        merged.index = idx.to_period("M").to_timestamp("M")
    merged = merged.groupby(level=0).last().sort_index()
    merged.to_parquet(target_path)
    print(f"{freq}: {merged.shape[1]} cols, {merged.shape[0]} rows -> {target_path.name}")


def merge_universe():
    cat = json.loads(UNIVERSE.read_text(encoding="utf-8"))
    existing = {s["id"] for s in cat["series"]}
    n_added = 0
    for n in range(1, N_AGENTS + 1):
        p = STAGE_CAT / f"crypto_agent{n}.json"
        if not p.exists():
            continue
        seg = json.loads(p.read_text(encoding="utf-8"))
        for entry in seg.get("entries", []):
            if entry["id"] in existing:
                continue
            entry["cat"] = "crypto"  # force category
            cat["series"].append(entry)
            existing.add(entry["id"])
            n_added += 1
    cat["meta"]["total_series"] = len(cat["series"])
    UNIVERSE.write_text(json.dumps(cat, separators=(",", ":"), ensure_ascii=True), encoding="utf-8")
    print(f"universe: +{n_added} crypto entries -> total {len(cat['series'])}")


def main():
    print("=== weekly ===")
    merge(RAW_W, "w")
    print("=== monthly ===")
    merge(RAW_M, "m")
    print("=== universe ===")
    merge_universe()


if __name__ == "__main__":
    main()
