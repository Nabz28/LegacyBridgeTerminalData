"""SQLite mirror for the correlation pipeline.

Schema:
  series           - one row per series (catalog mirror)
  prices_weekly    - (series_id, date, close)
  prices_monthly   - (series_id, date, close)
  returns_weekly   - (series_id, date, ret)
  returns_monthly  - (series_id, date, ret)

All ingest helpers are idempotent (INSERT OR REPLACE).
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
from pathlib import Path
from typing import Iterable

import pandas as pd

# This file: correlation/scripts/db.py
REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))


_load_dotenv()
_raw = os.environ.get("DATA_STORE_PATH", "../data-store")
DATA_STORE = Path(_raw) if Path(_raw).is_absolute() else (REPO_ROOT / _raw).resolve()
DB_PATH = DATA_STORE / "correlation" / "correlation.sqlite"

log = logging.getLogger("db")


SCHEMA = """
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  name TEXT,
  yf_symbol TEXT,
  source TEXT,
  category TEXT,
  subcategory TEXT,
  return_type TEXT,
  data_start INTEGER
);
CREATE TABLE IF NOT EXISTS prices_weekly (
  series_id TEXT, date TEXT, close REAL,
  PRIMARY KEY (series_id, date)
);
CREATE TABLE IF NOT EXISTS prices_monthly (
  series_id TEXT, date TEXT, close REAL,
  PRIMARY KEY (series_id, date)
);
CREATE TABLE IF NOT EXISTS returns_weekly (
  series_id TEXT, date TEXT, ret REAL,
  PRIMARY KEY (series_id, date)
);
CREATE TABLE IF NOT EXISTS returns_monthly (
  series_id TEXT, date TEXT, ret REAL,
  PRIMARY KEY (series_id, date)
);
CREATE INDEX IF NOT EXISTS idx_pw_date ON prices_weekly(date);
CREATE INDEX IF NOT EXISTS idx_pm_date ON prices_monthly(date);
CREATE INDEX IF NOT EXISTS idx_rw_date ON returns_weekly(date);
CREATE INDEX IF NOT EXISTS idx_rm_date ON returns_monthly(date);
"""


def connect(path: Path | str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(path: Path | str = DB_PATH) -> sqlite3.Connection:
    """Create schema if missing. Idempotent."""
    conn = connect(path)
    with conn:
        conn.executescript(SCHEMA)
    return conn


def load_universe(catalog_path: Path | str, conn: sqlite3.Connection | None = None) -> int:
    """Insert/replace one row per series in the catalog.

    Returns number of series loaded.
    """
    catalog_path = Path(catalog_path)
    universe = json.loads(catalog_path.read_text(encoding="utf-8"))
    conn = conn or init_db()
    rows = [
        (
            s["id"],
            s.get("name"),
            s.get("yf"),
            s.get("src"),
            s.get("cat"),
            s.get("sub"),
            s.get("ret"),
            s.get("start"),
        )
        for s in universe["series"]
    ]
    with conn:
        conn.executemany(
            "INSERT OR REPLACE INTO series "
            "(id, name, yf_symbol, source, category, subcategory, return_type, data_start) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
    log.info("Loaded %d series into db", len(rows))
    return len(rows)


def _wide_to_long(df: pd.DataFrame, value_col: str) -> Iterable[tuple]:
    """Wide -> (series_id, date_iso, value). Skips NaN."""
    if df.empty:
        return
    long = df.stack(future_stack=True).reset_index()
    long.columns = ["date", "series_id", value_col]
    long = long.dropna(subset=[value_col])
    for sid, dt, v in zip(long["series_id"], long["date"], long[value_col]):
        try:
            iso = pd.Timestamp(dt).date().isoformat()
        except Exception:
            iso = str(dt)
        yield (str(sid), iso, float(v))


def ingest_prices(df: pd.DataFrame, freq: str, conn: sqlite3.Connection | None = None) -> int:
    """Ingest a wide-format price frame (date index, columns = series IDs)."""
    if freq not in {"weekly", "monthly"}:
        raise ValueError(f"freq must be weekly|monthly, got {freq!r}")
    table = f"prices_{freq}"
    conn = conn or init_db()
    rows = list(_wide_to_long(df, "close"))
    if not rows:
        return 0
    with conn:
        conn.executemany(
            f"INSERT OR REPLACE INTO {table} (series_id, date, close) VALUES (?, ?, ?)",
            rows,
        )
    log.info("Ingested %d rows into %s", len(rows), table)
    return len(rows)


def ingest_returns(df: pd.DataFrame, freq: str, conn: sqlite3.Connection | None = None) -> int:
    """Ingest a wide-format returns frame."""
    if freq not in {"weekly", "monthly"}:
        raise ValueError(f"freq must be weekly|monthly, got {freq!r}")
    table = f"returns_{freq}"
    conn = conn or init_db()
    rows = list(_wide_to_long(df, "ret"))
    if not rows:
        return 0
    with conn:
        conn.executemany(
            f"INSERT OR REPLACE INTO {table} (series_id, date, ret) VALUES (?, ?, ?)",
            rows,
        )
    log.info("Ingested %d rows into %s", len(rows), table)
    return len(rows)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    init_db()
    n = load_universe(ROOT / "catalog" / "universe.json")
    print(f"DB initialized at {DB_PATH} with {n} series")
