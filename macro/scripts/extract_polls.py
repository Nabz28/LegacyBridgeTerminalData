"""Extract polls data into the US catalog + SQLite DB.

Adds:
  catalog/us/us_polls.json — single category with all 366 polls RICs
  catalog/us/_index.json   — refreshed to include polls RICs
  data/us.sqlite           — observations table appended with polls rows

Run from repo root:  python scripts/extract_polls.py
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _parse_polls import parse_all_polls  # type: ignore

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO, "catalog", "us")
DB_PATH = os.path.join(REPO, "data", "us.sqlite")
POLLS_JSON = os.path.join(CATALOG_DIR, "us_polls.json")
INDEX_JSON = os.path.join(CATALOG_DIR, "_index.json")


def main() -> int:
    os.makedirs(CATALOG_DIR, exist_ok=True)

    # Preserve existing skill content if file already exists
    existing: dict[str, dict] = {}
    if os.path.exists(POLLS_JSON):
        try:
            with open(POLLS_JSON, encoding="utf-8") as f:
                cat = json.load(f)
            for r in cat.get("rics", []):
                existing[r["ric"]] = r
        except (OSError, json.JSONDecodeError):
            pass

    print(f"[polls] parsing xlsx files...")
    series_list = list(parse_all_polls())
    print(f"[polls] parsed {len(series_list)} series")

    # Build the catalog file
    rics_out = []
    for s in series_list:
        old = existing.get(s.ric, {})
        rics_out.append({
            "ric": s.ric,
            "description": s.description,
            "frequency": s.frequency,
            "indicator": s.indicator,        # e.g. "ISM Manufacturing PMI"
            "statistic": s.statistic,        # "Actual" | "Median Consensus" | etc.
            "subcategory": old.get("subcategory", s.indicator),
            "units": old.get("units", s.unit),
            "meaning": old.get("meaning", ""),
            "how_to_use": old.get("how_to_use", ""),
            "related_series": old.get("related_series", []),
            "notes": old.get("notes", ""),
        })

    out = {
        "category": "Polls — Reuters Economic Indicator Surveys",
        "category_slug": "us_polls",
        "section": "Polls",
        "source_file": "US Polls/*.xlsx",
        "ric_count": len(rics_out),
        "rics": rics_out,
    }
    with open(POLLS_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"[polls] -> {POLLS_JSON}  ({len(rics_out)} RICs)")

    # Update _index.json: add the polls category entry + add RICs to index
    with open(INDEX_JSON, encoding="utf-8") as f:
        idx = json.load(f)
    cats = idx.get("categories", [])
    cats = [c for c in cats if c.get("slug") != "us_polls"]
    cats.append({
        "slug": "us_polls",
        "name": "Polls — Reuters Economic Indicator Surveys",
        "section": "Polls",
        "source_file": "US Polls/*.xlsx",
        "ric_count": len(rics_out),
    })
    cats.sort(key=lambda c: (c.get("section", ""), c.get("name", "")))
    idx["categories"] = cats
    rics_idx = idx.get("rics", {})
    for r in rics_out:
        rics_idx[r["ric"]] = {
            "slug": "us_polls",
            "description": r["description"],
            "frequency": r["frequency"],
            "subcategory": r.get("subcategory", ""),
            "units": r.get("units", ""),
            "meaning": r.get("meaning", ""),
            "how_to_use": r.get("how_to_use", ""),
        }
    idx["rics"] = rics_idx
    idx["generated_at"] = datetime.now(timezone.utc).isoformat()
    with open(INDEX_JSON, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print(f"[polls] -> {INDEX_JSON}  ({len(cats)} categories, {len(rics_idx)} RICs)")

    # Append observations to US sqlite
    if not os.path.exists(DB_PATH):
        print(f"[polls] WARNING: {DB_PATH} not found — observations not added")
        return 0
    conn = sqlite3.connect(DB_PATH)
    # Ensure schema (in case extract_observations hasn't run)
    conn.execute("""CREATE TABLE IF NOT EXISTS series (
        ric TEXT PRIMARY KEY, category_slug TEXT NOT NULL, section TEXT, category TEXT,
        description TEXT, frequency TEXT, source_file TEXT, first_obs TEXT, last_obs TEXT, n_obs INTEGER
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS observations (
        ric TEXT NOT NULL, date TEXT NOT NULL, value REAL, PRIMARY KEY (ric, date)
    )""")
    total_obs = 0
    for s in series_list:
        first = s.observations[0][0] if s.observations else None
        last = s.observations[-1][0] if s.observations else None
        conn.execute(
            "INSERT OR REPLACE INTO series (ric, category_slug, section, category, description, "
            "frequency, source_file, first_obs, last_obs, n_obs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (s.ric, s.category_slug, s.section, s.category, s.description, s.frequency,
             s.source_file, first, last, len(s.observations)),
        )
        if s.observations:
            conn.executemany(
                "INSERT OR REPLACE INTO observations (ric, date, value) VALUES (?, ?, ?)",
                [(s.ric, d, v) for d, v in s.observations],
            )
            total_obs += len(s.observations)
    conn.commit()
    conn.close()
    print(f"[polls] -> {DB_PATH}  (+{total_obs} observations across {len(series_list)} series)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
