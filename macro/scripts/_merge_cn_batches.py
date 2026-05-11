"""Merge all 12 agent-produced seed_cn_batch_XX.py files into the main
seed_cn_tier1.py and apply to catalog/cn/*.json.

Reads each batch's TIER1 dict, accumulates them (later batches don't overwrite
earlier — agents partition cleanly), and writes one consolidated TIER1 dict
to the catalog. Reports any RIC mismatches against the catalog index.
"""
from __future__ import annotations
import importlib.util
import json
import os
import sys
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(REPO, "scripts")
CATALOG_DIR = os.path.join(REPO, "catalog", "cn")


def load_module(path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"could not load {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    # Existing Tier-1 (the original 163 hand entries)
    sys.path.insert(0, SCRIPTS)
    from seed_cn_tier1 import TIER1 as BASE_TIER1  # type: ignore

    merged: dict[str, dict] = dict(BASE_TIER1)
    counts = {"base": len(BASE_TIER1)}
    duplicate_overrides = []

    # Discover all batch files (handles split sub-batches like 04a, 04b, 08a, 08b, 08p, 09a, 09b)
    batch_files = sorted(
        f[:-3] for f in os.listdir(SCRIPTS)
        if f.startswith("seed_cn_batch_") and f.endswith(".py")
    )

    for batch_name in batch_files:
        path = os.path.join(SCRIPTS, f"{batch_name}.py")
        try:
            mod = load_module(path, batch_name)
            tier = getattr(mod, "TIER1", {})
        except Exception as e:
            print(f"  WARN: failed to load {batch_name}: {e}")
            counts[batch_name] = 0
            continue

        added = 0
        for ric, fields in tier.items():
            if ric in merged:
                duplicate_overrides.append((ric, batch_name))
                continue
            merged[ric] = fields
            added += 1
        counts[batch_name] = added
        print(f"  {batch_name}.py  +{added:>4}  cumulative={len(merged)}")

    if duplicate_overrides:
        print(f"\n  {len(duplicate_overrides)} duplicates kept original (not overwritten):")
        for r, i in duplicate_overrides[:10]:
            print(f"    {r:18s} (was already in TIER1, batch {i} skipped)")

    # Build a RIC -> slug lookup from the catalog index for entries
    # whose batch agents forgot to include a slug field.
    catalog_lookup: dict[str, str] = {}
    cn_index_path = os.path.join(REPO, "catalog", "cn", "_index.json")
    with open(cn_index_path, encoding="utf-8") as f:
        cn_idx = json.load(f)
    for ric, info in cn_idx.get("rics", {}).items():
        catalog_lookup[ric] = info.get("slug", "")

    # Apply to catalog — fall back to catalog_lookup if entry lacks slug
    by_slug: dict[str, dict] = defaultdict(dict)
    fixed_slug_count = 0
    for ric, fields in merged.items():
        slug = fields.get("slug", "") or catalog_lookup.get(ric, "")
        if slug and not fields.get("slug"):
            fixed_slug_count += 1
            fields["slug"] = slug
        if slug:
            by_slug[slug][ric] = fields
    if fixed_slug_count:
        print(f"\n  filled-in slugs from catalog for {fixed_slug_count} entries")

    updated_total = 0
    missing_total = 0
    for slug, ric_map in by_slug.items():
        path = os.path.join(CATALOG_DIR, f"{slug}.json")
        if not os.path.exists(path):
            print(f"  SKIP slug not found: {slug} ({len(ric_map)} entries)")
            missing_total += len(ric_map)
            continue
        with open(path, encoding="utf-8") as f:
            cat = json.load(f)
        rics_index = {r["ric"]: r for r in cat.get("rics", [])}
        updated = 0
        missing = 0
        for ric, fields in ric_map.items():
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
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cat, f, ensure_ascii=False, indent=2)
        updated_total += updated
        missing_total += missing
        print(f"  applied  {slug:42}  updated={updated:>4}  missing={missing}")

    print(f"\n[merge] base_tier1={counts['base']}")
    for k, v in counts.items():
        if k != "base":
            print(f"        {k}: +{v}")
    print(f"\n[merge] TOTAL hand-curated RICs: {len(merged)}")
    print(f"[merge] APPLIED to catalog: {updated_total}, MISSING: {missing_total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
