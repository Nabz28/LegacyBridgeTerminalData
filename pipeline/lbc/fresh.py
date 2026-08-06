"""Freshness bookkeeping: every pipeline records run + success + rows written.

The freshness job asserts data-arrival (not job success) and alerts on staleness.
"""
from __future__ import annotations

import datetime as dt
import traceback

from . import db

EXPECTATIONS = {
    # pipeline -> expect fresh data within N hours
    "ingest_fred": 30,
    "ingest_yahoo_series": 30,
    "ingest_prices_us": 78,      # weekend tolerant
    "ingest_prices_asia": 78,
    "ingest_dbnomics": 78,
    "ingest_idx_flow": 78,
    "ingest_cot": 200,           # weekly
    "ingest_edgar": 30,
    "ingest_gdelt": 30,
    "ingest_cb_statements": 24 * 60,  # event-driven; 60d tolerance
    "ingest_tsmc": 24 * 40,      # monthly
    "ingest_hba": 24 * 45,       # bi-monthly periods
    "compute_nightly": 30,
    "reason_nightly": 30,
    "brief_morning": 30,
    "audit_scoring": 30,
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


def guarded(pipeline: str):
    """Decorator: run job, record freshness, never swallow the traceback."""
    def deco(fn):
        def wrapped(*a, **kw):
            try:
                rows = fn(*a, **kw)
                record(pipeline, int(rows or 0), ok=True)
                print(f"[{pipeline}] ok, rows={rows}")
                return rows
            except Exception as e:
                record(pipeline, 0, ok=False, note=f"{type(e).__name__}: {e}")
                print(f"[{pipeline}] FAILED: {e}")
                traceback.print_exc()
                raise
        return wrapped
    return deco
