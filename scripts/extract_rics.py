"""Generate catalog/<country>/*.json (one per category) and catalog/<country>/_index.json.

Each per-category file holds the curated 'skill' content fields with placeholders
that you can fill in over time (meaning, how_to_use, related_series, notes).

Idempotent skeleton write: if a category file already exists, the script PRESERVES
existing skill fields (meaning, how_to_use, related_series, notes, units,
subcategory) and only refreshes the auto-derivable fields (description, frequency).
This way you can re-run after a Refinitiv refresh without losing curated content.

Run from repo root:
  python scripts/extract_rics.py            # default: us
  python scripts/extract_rics.py --country id
  RIC_COUNTRY=id python scripts/extract_rics.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _parse import parse_workbook, list_xlsx_files, get_xlsx_dir, get_country  # type: ignore


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_country_arg() -> str:
    """Pull --country from argv (consuming both tokens) and fall back to env."""
    if "--country" in sys.argv:
        i = sys.argv.index("--country")
        if i + 1 < len(sys.argv):
            cc = sys.argv[i + 1].lower()
            del sys.argv[i:i + 2]
            os.environ["RIC_COUNTRY"] = cc
            return cc
    return get_country()


SKILL_FIELDS = ("subcategory", "units", "meaning", "how_to_use", "related_series", "notes")


def load_existing(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def main() -> int:
    country = parse_country_arg()
    catalog_dir = os.path.join(REPO_ROOT, "catalog", country)
    os.makedirs(catalog_dir, exist_ok=True)
    xlsx_dir = get_xlsx_dir(country)

    files = list_xlsx_files(xlsx_dir)
    print(f"[catalog] country={country}  {len(files)} xlsx files in {xlsx_dir}")

    index_categories = []
    index_rics: dict = {}

    for i, path in enumerate(files, 1):
        name = os.path.basename(path)
        try:
            series_list = list(parse_workbook(path))
        except Exception as e:
            print(f"  [{i:2d}/{len(files)}] {name:60s} FAILED: {e}")
            continue
        if not series_list:
            print(f"  [{i:2d}/{len(files)}] {name:60s} (no series)")
            continue

        cat = series_list[0]
        slug = cat.category_slug
        category_name = cat.category or slug
        section = cat.section or ""

        target_path = os.path.join(catalog_dir, f"{slug}.json")
        existing = load_existing(target_path)
        existing_by_ric = {r["ric"]: r for r in existing.get("rics", [])}

        rics_out = []
        for s in series_list:
            old = existing_by_ric.get(s.ric, {})
            rics_out.append({
                "ric": s.ric,
                "description": s.description,
                "frequency": s.frequency,
                "subcategory": old.get("subcategory", ""),
                "units": old.get("units", ""),
                "meaning": old.get("meaning", ""),
                "how_to_use": old.get("how_to_use", ""),
                "related_series": old.get("related_series", []),
                "notes": old.get("notes", ""),
            })
            old = existing_by_ric.get(s.ric, {})
            index_rics[s.ric] = {
                "slug": slug,
                "description": s.description,
                "frequency": s.frequency,
                "subcategory": old.get("subcategory", ""),
                "units": old.get("units", ""),
                "meaning": old.get("meaning", ""),
                "how_to_use": old.get("how_to_use", ""),
            }

        out = {
            "category": category_name,
            "category_slug": slug,
            "section": section,
            "source_file": name,
            "ric_count": len(rics_out),
            "rics": rics_out,
        }
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

        index_categories.append({
            "slug": slug,
            "name": category_name,
            "section": section,
            "source_file": name,
            "ric_count": len(rics_out),
        })
        print(f"  [{i:2d}/{len(files)}] {name:60s} {len(rics_out):4d} RICs -> catalog/{country}/{slug}.json")

    index_categories.sort(key=lambda c: (c["section"], c["name"]))

    index_path = os.path.join(catalog_dir, "_index.json")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "country": country,
            "categories": index_categories,
            "rics": index_rics,
        }, f, ensure_ascii=False, indent=2)

    print()
    print(f"[catalog] {len(index_categories)} categories, {len(index_rics)} RICs -> catalog/{country}/_index.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
