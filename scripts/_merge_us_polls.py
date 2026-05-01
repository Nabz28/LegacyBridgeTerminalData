"""Merge all 5 agent-produced seed_us_polls_batch_XX.py files into the
catalog/us/us_polls.json + _index.json.
"""
from __future__ import annotations
import importlib.util
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(REPO, "scripts")
POLLS_JSON = os.path.join(REPO, "catalog", "us", "us_polls.json")
INDEX_JSON = os.path.join(REPO, "catalog", "us", "_index.json")


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    # Aggregate all polls TIER1 entries from batch files
    merged: dict[str, dict] = {}
    batch_files = sorted(
        f[:-3] for f in os.listdir(SCRIPTS)
        if f.startswith("seed_us_polls_batch_") and f.endswith(".py")
    )
    for batch_name in batch_files:
        path = os.path.join(SCRIPTS, f"{batch_name}.py")
        try:
            mod = load_module(path, batch_name)
            tier = getattr(mod, "TIER1", {})
        except Exception as e:
            print(f"  WARN: failed to load {batch_name}: {e}")
            continue
        added = 0
        for ric, fields in tier.items():
            if ric in merged:
                continue  # first wins (shouldn't happen — partitioned)
            merged[ric] = fields
            added += 1
        print(f"  {batch_name}.py  +{added:>4}  cumulative={len(merged)}")

    # Apply to catalog/us/us_polls.json
    if not os.path.exists(POLLS_JSON):
        print(f"  ERROR: {POLLS_JSON} not found — run extract_polls.py first")
        return 1
    with open(POLLS_JSON, encoding="utf-8") as f:
        cat = json.load(f)
    rics_index = {r["ric"]: r for r in cat.get("rics", [])}

    updated = 0
    missing = 0
    for ric, fields in merged.items():
        if ric not in rics_index:
            missing += 1
            continue
        entry = rics_index[ric]
        entry["subcategory"] = fields.get("subcategory", entry.get("subcategory", ""))
        entry["units"] = fields.get("units", entry.get("units", ""))
        entry["meaning"] = fields.get("meaning", entry.get("meaning", ""))
        entry["how_to_use"] = fields.get("how_to_use", entry.get("how_to_use", ""))
        entry["related_series"] = fields.get("related_series", entry.get("related_series", []))
        updated += 1
    with open(POLLS_JSON, "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=2)
    print(f"\n  applied  us_polls.json  updated={updated}  missing={missing}")

    # Sync _index.json with the new content
    with open(INDEX_JSON, encoding="utf-8") as f:
        idx = json.load(f)
    rics_idx = idx.get("rics", {})
    for ric, fields in merged.items():
        if ric in rics_idx:
            rics_idx[ric]["subcategory"] = fields.get("subcategory", rics_idx[ric].get("subcategory", ""))
            rics_idx[ric]["units"] = fields.get("units", rics_idx[ric].get("units", ""))
            rics_idx[ric]["meaning"] = fields.get("meaning", rics_idx[ric].get("meaning", ""))
            rics_idx[ric]["how_to_use"] = fields.get("how_to_use", rics_idx[ric].get("how_to_use", ""))
    idx["rics"] = rics_idx
    with open(INDEX_JSON, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print(f"  applied  _index.json  with {len(merged)} polls entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
