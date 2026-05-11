"""Push the local data store into a Supabase Postgres project via PostgREST.

Uses httpx directly (no supabase-py — its dep chain is broken on Python 3.14).

Two terminals share the same Supabase project under separate schemas:

  macro       — macro.series, macro.observations, macro.graph
  correlation — correlation.series + prices_weekly/monthly + returns_weekly/monthly
                + correlation.matrices index (matrix parquet files go to Storage)

The uploader is idempotent: every write upserts on a primary key
(via `Prefer: resolution=merge-duplicates`).

Usage
-----
    python scripts/upload_to_supabase.py macro --country us
    python scripts/upload_to_supabase.py macro --country id
    python scripts/upload_to_supabase.py macro --country cn
    python scripts/upload_to_supabase.py macro --graphs
    python scripts/upload_to_supabase.py correlation
    python scripts/upload_to_supabase.py correlation --matrices

Environment (.env at repo root):
    SUPABASE_URL=https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<service role>
    DATA_STORE_PATH=../data-store
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sqlite3
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Sequence

import httpx


def _sanitize(v: Any) -> Any:
    """Replace inf/-inf/NaN with None so JSON encoding succeeds.

    The correlation pipeline occasionally produces inf returns (e.g. when a
    price jumps from 0 to positive in the source data). Postgres FLOAT can
    store NaN/Inf natively, but JSON cannot — `httpx.post(json=...)` uses
    `allow_nan=False` and crashes on the first one. Cleanest is to drop
    these values; downstream consumers already treat NULL as missing data.
    """
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
    return v

REPO_ROOT = Path(__file__).resolve().parent.parent
MACRO_CATALOG_DIR = REPO_ROOT / "macro" / "catalog"
CORRELATION_CATALOG_DIR = REPO_ROOT / "correlation" / "catalog"

log = logging.getLogger("upload")

# Batch sizes tuned to PostgREST defaults — large enough to be efficient,
# small enough that each request stays under typical 1MB body / 30s limits.
OBS_BATCH = 5000
SERIES_BATCH = 500
MAX_RETRIES = 4
RETRY_BACKOFF = 1.5  # seconds, exponential


# --------------------------------------------------------------------------- #
# Config + client                                                             #
# --------------------------------------------------------------------------- #
def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def _data_store_root() -> Path:
    raw = os.environ.get("DATA_STORE_PATH", "../data-store")
    p = Path(raw)
    return p if p.is_absolute() else (REPO_ROOT / p).resolve()


class SupabaseClient:
    """Thin httpx wrapper for PostgREST CRUD + RPC."""

    def __init__(self, url: str, service_key: str):
        self.url = url.rstrip("/")
        self.key = service_key
        self.cli = httpx.Client(timeout=60.0)

    def close(self):
        self.cli.close()

    def _headers(self, schema: str, prefer: str = "resolution=merge-duplicates,return=minimal") -> dict:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Content-Profile": schema,
            "Accept-Profile": schema,
            "Prefer": prefer,
        }

    def upsert(self, schema: str, table: str, rows: list[dict]) -> None:
        """Upsert a batch. Retries on transient errors."""
        if not rows:
            return
        for attempt in range(MAX_RETRIES):
            try:
                r = self.cli.post(
                    f"{self.url}/rest/v1/{table}",
                    headers=self._headers(schema),
                    json=rows,
                )
                if r.status_code in (200, 201, 204):
                    return
                # 5xx / 429 → retry
                if r.status_code in (429, 500, 502, 503, 504):
                    wait = RETRY_BACKOFF ** attempt
                    log.warning("retry %d/%d after %.1fs (http=%d body=%s)",
                                attempt + 1, MAX_RETRIES, wait, r.status_code, r.text[:200])
                    time.sleep(wait)
                    continue
                # Permanent failure
                raise SystemExit(
                    f"upsert {schema}.{table} failed: http={r.status_code} body={r.text[:500]}"
                )
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                wait = RETRY_BACKOFF ** attempt
                log.warning("network error %s, retry %d/%d after %.1fs",
                            e, attempt + 1, MAX_RETRIES, wait)
                time.sleep(wait)
        raise SystemExit(f"upsert {schema}.{table} exhausted retries")


def _chunks(seq: Sequence, size: int) -> Iterable[list]:
    for i in range(0, len(seq), size):
        yield list(seq[i : i + size])


def _dedupe(rows: list[dict], keys: tuple[str, ...]) -> list[dict]:
    """Last-write-wins dedupe by composite key. Postgres `ON CONFLICT` rejects
    same-key duplicates in a single INSERT statement, so we need this on the
    client side. Real-world cause for macro.series: a RIC listed under two
    category files; for observations a hypothetical SQLite-side bug."""
    out: dict[tuple, dict] = {}
    for r in rows:
        k = tuple(r.get(c) for c in keys)
        out[k] = r
    if len(out) < len(rows):
        log.info("  deduped %d rows -> %d unique by %s", len(rows), len(out), keys)
    return list(out.values())


# --------------------------------------------------------------------------- #
# Macro upload                                                                 #
# --------------------------------------------------------------------------- #
def _load_macro_catalog(country: str) -> tuple[list[dict], dict]:
    cc_dir = MACRO_CATALOG_DIR / country
    if not cc_dir.is_dir():
        raise SystemExit(f"catalog/{country}/ not found")

    index_path = cc_dir / "_index.json"
    index_data = json.loads(index_path.read_text(encoding="utf-8"))

    entries: list[dict] = []
    for path in sorted(cc_dir.glob(f"{country}_*.json")):
        cat = json.loads(path.read_text(encoding="utf-8"))
        cat_slug = cat.get("category_slug") or path.stem
        cat_name = cat.get("category") or cat_slug
        for row in cat.get("rics", []):
            row = dict(row)
            row["country"] = country
            row["category_slug"] = cat_slug
            row["category"] = cat_name
            entries.append(row)
    return entries, index_data


def _row_for_series(entry: dict, lite: dict | None) -> dict:
    is_poll = bool(entry.get("is_poll"))
    related = entry.get("related_series")
    if related is not None and not isinstance(related, list):
        related = list(related)
    return {
        "ric":                  entry["ric"],
        "country":              entry["country"],
        "slug":                 entry.get("slug") or (lite or {}).get("slug"),
        "category":             entry.get("category"),
        "category_slug":        entry.get("category_slug"),
        "subcategory":          entry.get("subcategory"),
        "section":              entry.get("section"),
        "description":          entry.get("description") or (lite or {}).get("description"),
        "frequency":            entry.get("frequency") or (lite or {}).get("frequency"),
        "units":                entry.get("units"),
        "source":               entry.get("source"),
        "source_file":          entry.get("source_file"),
        "is_poll":              is_poll,
        "indicator_topic":      entry.get("indicator_topic"),
        "indicator_group_id":   entry.get("indicator_group_id"),
        "indicator_anchor_ric": entry.get("indicator_anchor_ric"),
        "stat_role":            entry.get("stat_role"),
        "meaning":              entry.get("meaning"),
        "how_to_use":           entry.get("how_to_use"),
        "related_series":       related,
        "notes":                entry.get("notes"),
    }


def upload_macro_country(country: str, client: SupabaseClient) -> None:
    db_path = _data_store_root() / "macro" / f"{country}.sqlite"
    if not db_path.exists():
        raise SystemExit(f"missing sqlite at {db_path}")

    entries, index_data = _load_macro_catalog(country)
    rics_lite = index_data.get("rics", {})

    # ----- Series upsert -----
    rows = [_row_for_series(e, rics_lite.get(e["ric"])) for e in entries]
    rows = _dedupe(rows, ("ric",))
    log.info("[macro/%s] upserting %d series", country, len(rows))
    n_batches = math.ceil(len(rows) / SERIES_BATCH)
    for i, chunk in enumerate(_chunks(rows, SERIES_BATCH), 1):
        client.upsert("macro", "series", chunk)
        if i % 5 == 0 or i == n_batches:
            log.info("[macro/%s]   series %d/%d batches", country, i, n_batches)

    # ----- Observations upsert (streamed from sqlite) -----
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM observations")
    total = cur.fetchone()[0]
    log.info("[macro/%s] upserting %d observations", country, total)
    cur.execute("SELECT ric, date, value FROM observations")

    pushed = 0
    t0 = time.time()
    while True:
        rows_db = cur.fetchmany(OBS_BATCH)
        if not rows_db:
            break
        batch = [{"ric": r[0], "date": r[1], "value": _sanitize(r[2])} for r in rows_db]
        batch = _dedupe(batch, ("ric", "date"))
        client.upsert("macro", "observations", batch)
        pushed += len(batch)
        if pushed % (OBS_BATCH * 10) == 0:
            rate = pushed / (time.time() - t0)
            eta = (total - pushed) / rate if rate > 0 else 0
            log.info("[macro/%s]   %d/%d obs (%.0f rows/s, eta %ds)",
                     country, pushed, total, rate, int(eta))
    conn.close()
    log.info("[macro/%s] done in %.1fs — %d obs", country, time.time() - t0, pushed)


def upload_macro_graphs(client: SupabaseClient) -> None:
    for country in ("us", "id", "cn"):
        cc_dir = MACRO_CATALOG_DIR / country
        if not cc_dir.is_dir():
            continue
        for kind, fname in (
            ("full",      "_graph.json"),
            ("condensed", "_graph_condensed.json"),
            ("insane",    "_graph_insane.json"),
        ):
            path = cc_dir / fname
            if not path.exists():
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            row = {
                "country":      country,
                "graph_kind":   kind,
                "payload":      payload,
                "generated_at": payload.get("generated_at"),
            }
            log.info("[macro/%s] graph %-9s — %d nodes / %d edges",
                     country, kind,
                     len(payload.get("nodes", [])), len(payload.get("edges", [])))
            client.upsert("macro", "graph", [row])


# --------------------------------------------------------------------------- #
# Correlation upload                                                           #
# --------------------------------------------------------------------------- #
def upload_correlation_db(client: SupabaseClient, from_table: str | None = None) -> None:
    db_path = _data_store_root() / "correlation" / "correlation.sqlite"
    if not db_path.exists():
        raise SystemExit(f"missing sqlite at {db_path}")

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # Tables in upload order. If --from-table is given, skip earlier ones.
    all_tables = [
        ("series",          None),  # series first, handled below
        ("prices_weekly",   "close"),
        ("prices_monthly",  "close"),
        ("returns_weekly",  "ret"),
        ("returns_monthly", "ret"),
    ]
    skip_until = from_table  # None means start at beginning

    # ----- series -----
    cur.execute("SELECT id, name, yf_symbol, source, category, subcategory, return_type, data_start FROM series")
    series_rows = [
        {"id": r[0], "name": r[1], "yf_symbol": r[2], "source": r[3],
         "category": r[4], "subcategory": r[5], "return_type": r[6], "data_start": r[7]}
        for r in cur.fetchall()
    ]
    series_rows = _dedupe(series_rows, ("id",))
    if skip_until is None or skip_until == "series":
        log.info("[correlation] upserting %d series", len(series_rows))
        for chunk in _chunks(series_rows, SERIES_BATCH):
            client.upsert("correlation", "series", chunk)
        skip_until = None
    else:
        log.info("[correlation] skipping series (--from-table=%s)", from_table)

    # Valid series IDs after dedupe — used to filter FK-orphan rows in
    # the prices/returns tables. The legacy SQLite has ~204 stringified
    # tuple series_id entries (e.g. "('IDX:ASJT', 'ASJT.JK')") with no
    # matching `series` row; those rows would FK-violate on insert.
    valid_ids = {r["id"] for r in series_rows}
    placeholders = ",".join("?" for _ in valid_ids)

    # ----- prices + returns (streamed, FK-filtered) -----
    data_tables = [
        ("prices_weekly",   "close"),
        ("prices_monthly",  "close"),
        ("returns_weekly",  "ret"),
        ("returns_monthly", "ret"),
    ]
    for table, value_col in data_tables:
        if skip_until is not None and table != skip_until:
            log.info("[correlation] skipping %s (--from-table=%s)", table, from_table)
            continue
        skip_until = None
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE series_id IN ({placeholders})", tuple(valid_ids))
        total = cur.fetchone()[0]
        if total == 0:
            log.info("[correlation] %s empty — skipped", table)
            continue
        log.info("[correlation] upserting %d rows into %s (FK-filtered)", total, table)
        cur.execute(
            f"SELECT series_id, date, {value_col} FROM {table} WHERE series_id IN ({placeholders})",
            tuple(valid_ids),
        )
        pushed = 0
        t0 = time.time()
        while True:
            rows_db = cur.fetchmany(OBS_BATCH)
            if not rows_db:
                break
            batch = [{"series_id": r[0], "date": r[1], value_col: _sanitize(r[2])} for r in rows_db]
            batch = _dedupe(batch, ("series_id", "date"))
            client.upsert("correlation", table, batch)
            pushed += len(batch)
            if pushed % (OBS_BATCH * 10) == 0:
                rate = pushed / (time.time() - t0)
                eta = (total - pushed) / rate if rate > 0 else 0
                log.info("[correlation]   %s %d/%d (%.0f rows/s, eta %ds)",
                         table, pushed, total, rate, int(eta))
        log.info("[correlation]   %s done in %.1fs", table, time.time() - t0)
    conn.close()


def upload_correlation_matrices(client: SupabaseClient, bucket: str = "correlation-matrices") -> None:
    """Upload parquet matrices to Supabase Storage + index in correlation.matrices."""
    matrices_dir = _data_store_root() / "correlation" / "matrices"
    if not matrices_dir.is_dir():
        raise SystemExit(f"missing {matrices_dir}")

    # Create bucket via storage REST (best-effort — ignore "already exists")
    r = client.cli.post(
        f"{client.url}/storage/v1/bucket",
        headers={"apikey": client.key, "Authorization": f"Bearer {client.key}",
                 "Content-Type": "application/json"},
        json={"id": bucket, "name": bucket, "public": True},
    )
    if r.status_code not in (200, 201, 409):
        log.warning("bucket create failed http=%d body=%s — will try uploads anyway",
                    r.status_code, r.text[:200])

    rows = []
    for path in sorted(matrices_dir.iterdir()):
        if not path.is_file():
            continue
        size_mb = path.stat().st_size / (1024 * 1024)
        log.info("[correlation] storage upload %s (%.1f MB)", path.name, size_mb)
        with path.open("rb") as f:
            content = f.read()
        r = client.cli.post(
            f"{client.url}/storage/v1/object/{bucket}/{path.name}",
            headers={"apikey": client.key, "Authorization": f"Bearer {client.key}",
                     "Content-Type": "application/octet-stream",
                     "x-upsert": "true"},
            content=content,
        )
        if r.status_code not in (200, 201):
            log.warning("  upload failed http=%d body=%s", r.status_code, r.text[:200])
            continue

        stem = path.stem
        parts = stem.split("_")
        kind = parts[0] if parts else "unknown"
        freq = parts[-1] if parts and parts[-1] in {"weekly", "monthly"} else None
        window = None
        for p in parts:
            if (p.endswith("w") or p.endswith("m")) and p[:-1].isdigit():
                window = int(p[:-1])
        rows.append({
            "matrix_key":     stem,
            "kind":           "rolling_pearson" if "rolling" in stem else kind,
            "frequency":      freq or "unknown",
            "window_size":    window,
            "storage_path":   path.name,
            "storage_bucket": bucket,
        })

    if rows:
        log.info("[correlation] indexing %d files in correlation.matrices", len(rows))
        client.upsert("correlation", "matrices", rows)


# --------------------------------------------------------------------------- #
# CLI                                                                          #
# --------------------------------------------------------------------------- #
def main() -> int:
    _load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("target", choices=["macro", "correlation", "all"])
    parser.add_argument("--country", choices=["us", "id", "cn"])
    parser.add_argument("--graphs", action="store_true",
                        help="(macro) push the catalog influence graphs to macro.graph")
    parser.add_argument("--matrices", action="store_true",
                        help="(correlation) push parquet matrices to Storage + index")
    parser.add_argument("--from-table",
                        choices=["series", "prices_weekly", "prices_monthly",
                                 "returns_weekly", "returns_monthly"],
                        help="(correlation) resume from a specific table (skip earlier ones)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s",
                        datefmt="%H:%M:%S")

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

    client = SupabaseClient(url, key)
    try:
        if args.target == "all":
            for cc in ("us", "id", "cn"):
                upload_macro_country(cc, client)
            upload_macro_graphs(client)
            upload_correlation_db(client)
        elif args.target == "macro":
            if args.graphs:
                upload_macro_graphs(client)
            elif args.country:
                upload_macro_country(args.country, client)
            else:
                parser.error("macro requires either --country <cc> or --graphs")
        else:  # correlation
            if args.matrices:
                upload_correlation_matrices(client)
            else:
                upload_correlation_db(client, from_table=args.from_table)
    finally:
        client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
