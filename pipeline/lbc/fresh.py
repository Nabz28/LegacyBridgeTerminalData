"""Freshness bookkeeping and data-arrival assertions.

The rule this module exists to enforce: a pipeline is green only when DATA
LANDED, never merely because a job exited zero. The system it replaced reported
"succeeded" for ten weeks while writing nothing.

Two independent checks:
  1. run-level  — did the job raise, and did it write any rows (`record`)
  2. data-level — is the newest row in the target table actually recent
                  (`assert_arrival`, run by the freshness job)
"""
from __future__ import annotations

import datetime as dt
import traceback

from . import db

EXPECTATIONS = {
    # pipeline -> expect fresh data within N hours
    "ingest_bls": 30,
    "compute_derived": 30,
    "ingest_yahoo_series": 30,
    "ingest_prices_us": 78,      # weekend tolerant
    "ingest_prices_asia": 78,
    "ingest_dbnomics": 78,
    "ingest_idx_flow": 78,
    "ingest_cot": 200,           # weekly
    "ingest_edgar": 30,
    "ingest_names": 24 * 30,     # backfill job, idempotent, rarely has work
    "ingest_archive": 24 * 30,   # static archive bridge, converges then idles
    "ingest_news": 12,
    "ingest_calendar": 30,
    "ingest_cb_statements": 24 * 60,  # event-driven; 60d tolerance
    "ingest_tsmc": 24 * 40,      # monthly
    "ingest_hba": 24 * 45,       # bi-monthly periods
    "compute_nightly": 30,
    "compute_screens": 30,
    "reason_nightly": 30,
    "brief_morning": 30,
    "audit_scoring": 30,
}

# pipeline -> (schema, table, date column, max acceptable data age in days)
ARRIVAL = {
    "ingest_yahoo_series": ("mkt", "observation", "date", 5),
    "ingest_prices_us": ("mkt", "price", "date", 5),
    "ingest_prices_asia": ("mkt", "price", "date", 5),
    "ingest_dbnomics": ("mkt", "observation", "date", 8),
    "ingest_bls": ("mkt", "observation", "date", 70),
    "ingest_idx_flow": ("mkt", "flow", "date", 6),
    "ingest_cot": ("mkt", "observation", "date", 14),
    "ingest_news": ("research", "news", "published_at", 3),
    "compute_nightly": ("research", "dial", "asof", 2),
    "brief_morning": ("research", "brief", "asof", 2),
}

# per-pipeline series/ticker probes: the specific rows that must be advancing
PROBE = {
    "ingest_dbnomics": ("mkt", "observation", "series_key", "us.rate.dgs10", "date", 8),
    "ingest_bls": ("mkt", "observation", "series_key", "us.infl.cpi_core", "date", 70),
    "ingest_yahoo_series": ("mkt", "observation", "series_key", "idx.spx", "date", 5),
    "ingest_prices_asia": ("mkt", "price", "ticker", "BBCA.JK", "date", 6),
    "ingest_idx_flow": ("mkt", "flow", "ticker", "_market", "date", 6),
}


def record(pipeline: str, rows_written: int, ok: bool = True, note: str | None = None):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    row = {
        "pipeline": pipeline,
        "last_run_at": now,
        "rows_written": rows_written,
        "expect_within_hours": EXPECTATIONS.get(pipeline, 26),
        "note": (note or "")[:500],
    }
    if ok:
        row["last_success_at"] = now
        row["status"] = "ok"
    else:
        row["status"] = "error"
    db.upsert("research", "ops_freshness", [row], on_conflict="pipeline")


# Backfills legitimately write nothing once complete; everything else that
# fetches must produce rows or it failed, whatever its exit code.
ZERO_ROWS_OK = {"ingest_names", "ingest_archive", "ingest_cb_statements", "ingest_edgar"}


def guarded(pipeline: str):
    """Run a job, record the outcome, never swallow the traceback."""
    def deco(fn):
        def wrapped(*a, **kw):
            try:
                rows = fn(*a, **kw)
                n = int(rows or 0)
                if n == 0 and pipeline.startswith("ingest_") and pipeline not in ZERO_ROWS_OK:
                    record(pipeline, 0, ok=False, note="ran but wrote 0 rows")
                    print(f"[{pipeline}] WROTE NOTHING (recorded as error)")
                else:
                    record(pipeline, n, ok=True)
                    print(f"[{pipeline}] ok, rows={n}")
                return rows
            except Exception as e:
                record(pipeline, 0, ok=False, note=f"{type(e).__name__}: {e}")
                print(f"[{pipeline}] FAILED: {e}")
                traceback.print_exc()
                raise
        return wrapped
    return deco


def _latest(schema: str, table: str, col: str, filt: str = "") -> str | None:
    q = f"select={col}&order={col}.desc"
    if filt:
        q += f"&{filt}"
    rows = db.select(schema, table, q, limit=1)
    return rows[0][col] if rows else None


def assert_arrival() -> list[dict]:
    """Compare the newest row in each target table against its allowed age.

    Returns a list of violations. This is the check that catches a pipeline
    which runs, exits zero, re-upserts yesterday's rows, and stays green.
    """
    today = dt.date.today()
    violations = []
    for pipeline, (schema, table, col, max_days) in ARRIVAL.items():
        try:
            latest = _latest(schema, table, col)
        except Exception as e:
            violations.append({"pipeline": pipeline, "kind": "query_failed", "detail": str(e)[:120]})
            continue
        if not latest:
            violations.append({"pipeline": pipeline, "kind": "no_data",
                               "detail": f"{schema}.{table} is empty"})
            continue
        age = (today - dt.date.fromisoformat(str(latest)[:10])).days
        if age > max_days:
            violations.append({"pipeline": pipeline, "kind": "stale_data",
                               "detail": f"newest {schema}.{table} row is {age}d old (limit {max_days}d)"})

    for pipeline, (schema, table, key_col, key, col, max_days) in PROBE.items():
        try:
            latest = _latest(schema, table, col, f"{key_col}=eq.{key}")
        except Exception:
            continue
        if not latest:
            violations.append({"pipeline": pipeline, "kind": "probe_missing",
                               "detail": f"{key} has no rows"})
            continue
        age = (today - dt.date.fromisoformat(str(latest)[:10])).days
        if age > max_days:
            violations.append({"pipeline": pipeline, "kind": "probe_stale",
                               "detail": f"{key} last moved {age}d ago (limit {max_days}d)"})

    violations += assert_drivers_live()
    return violations


# A driver may die while its table stays green: mkt.observation's newest row is always
# today because daily series dominate it, so a monthly series that stopped updating is
# invisible to the table-level check. The eurozone desk ran for eight months on two
# Eurostat series frozen at 2025-12-01 and nothing flagged it. Budgets are per frequency
# and generous — this is meant to catch death, not lateness.
DRIVER_MAX_AGE = {"d": 8, "w": 21, "m": 75, "q": 200}


def assert_drivers_live() -> list[dict]:
    """Every series a desk actually scores on must still be moving.

    Checked per series rather than per table, because that is the only level at which a
    single dead driver is distinguishable from a healthy pipeline.
    """
    from . import db, registry

    today = dt.date.today()
    freq = {r[0]: r[5] for r in registry.SERIES}
    try:
        drivers = db.select("research", "driver", "select=desk_id,series_key")
        rows = db.select("mkt", "observation", "select=series_key,date&order=date.desc")
    except Exception as e:
        return [{"pipeline": "desk_drivers", "kind": "query_failed", "detail": str(e)[:120]}]

    newest: dict[str, str] = {}
    for r in rows:
        k = r["series_key"]
        if k not in newest or str(r["date"]) > newest[k]:
            newest[k] = str(r["date"])

    seen, out = set(), []
    for d in drivers:
        key = d["series_key"]
        if key in seen:
            continue
        seen.add(key)
        last = newest.get(key)
        if not last:
            out.append({"pipeline": "desk_drivers", "kind": "driver_no_data",
                        "detail": f"{key} ({d['desk_id']}) has no observations at all"})
            continue
        age = (today - dt.date.fromisoformat(last[:10])).days
        budget = DRIVER_MAX_AGE.get(freq.get(key, "d"), 8)
        if age > budget:
            out.append({
                "pipeline": "desk_drivers", "kind": "driver_stale",
                "detail": f"{key} ({d['desk_id']}) last moved {age}d ago "
                          f"(limit {budget}d for {freq.get(key, 'd')} series)"})
    return out
