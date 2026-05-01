"""Extract every (ric, date, value) triple from <country> xlsx files into data/<country>.sqlite.

Idempotent: drops + recreates tables on each run.
Run from repo root:
  python scripts/extract_observations.py             # default: us
  python scripts/extract_observations.py --country id
"""

from __future__ import annotations

import os
import sqlite3
import sys
import time

# allow `from _parse import ...` when run as a script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _parse import parse_workbook, list_xlsx_files, get_xlsx_dir, get_country  # type: ignore


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_country_arg() -> str:
    if "--country" in sys.argv:
        i = sys.argv.index("--country")
        if i + 1 < len(sys.argv):
            cc = sys.argv[i + 1].lower()
            del sys.argv[i:i + 2]
            os.environ["RIC_COUNTRY"] = cc
            return cc
    return get_country()


SCHEMA = """
DROP TABLE IF EXISTS observations;
DROP TABLE IF EXISTS series;

CREATE TABLE series (
    ric            TEXT PRIMARY KEY,
    category_slug  TEXT NOT NULL,
    section        TEXT,
    category       TEXT,
    description    TEXT,
    frequency      TEXT,
    source_file    TEXT,
    first_obs      TEXT,
    last_obs       TEXT,
    n_obs          INTEGER
);

CREATE TABLE observations (
    ric    TEXT NOT NULL,
    date   TEXT NOT NULL,
    value  REAL,
    PRIMARY KEY (ric, date)
);

CREATE INDEX idx_obs_ric ON observations(ric);
CREATE INDEX idx_series_cat ON series(category_slug);
"""


def main() -> int:
    country = parse_country_arg()
    db_path = os.path.join(REPO_ROOT, "data", f"{country}.sqlite")
    xlsx_dir = get_xlsx_dir(country)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    conn.commit()

    files = list_xlsx_files(xlsx_dir)
    print(f"[ingest] country={country}  {len(files)} xlsx files in {xlsx_dir}")

    total_series = 0
    total_obs = 0
    failed: list[tuple[str, str]] = []

    for i, path in enumerate(files, 1):
        name = os.path.basename(path)
        t0 = time.time()
        try:
            n_series = 0
            n_obs = 0
            for s in parse_workbook(path):
                first = s.observations[0][0] if s.observations else None
                last = s.observations[-1][0] if s.observations else None
                conn.execute(
                    "INSERT OR REPLACE INTO series "
                    "(ric, category_slug, section, category, description, frequency, source_file, first_obs, last_obs, n_obs) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (s.ric, s.category_slug, s.section, s.category, s.description,
                     s.frequency, s.source_file, first, last, len(s.observations)),
                )
                if s.observations:
                    conn.executemany(
                        "INSERT OR REPLACE INTO observations (ric, date, value) VALUES (?, ?, ?)",
                        [(s.ric, d, v) for d, v in s.observations],
                    )
                n_series += 1
                n_obs += len(s.observations)
            conn.commit()
            total_series += n_series
            total_obs += n_obs
            dt = time.time() - t0
            print(f"  [{i:2d}/{len(files)}] {name:60s}  series={n_series:4d}  obs={n_obs:6d}  ({dt:4.1f}s)")
        except Exception as e:
            failed.append((name, str(e)))
            print(f"  [{i:2d}/{len(files)}] {name:60s}  FAILED: {e}")

    conn.close()

    print()
    print(f"[ingest] wrote {total_series} series, {total_obs} observations to {db_path}")
    if failed:
        print(f"[ingest] {len(failed)} files failed:")
        for name, err in failed:
            print(f"   - {name}: {err}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
