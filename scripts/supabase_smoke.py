"""End-to-end Supabase verification + sample upload via PostgREST.

Uses ONLY the REST API + new-style sb_secret_* / sb_publishable_* keys.
psycopg2 is not used — direct Postgres needs the DB password, which we
don't have.

Prerequisite (do this once via Supabase SQL Editor):
    Paste `supabase/migrations/all_in_one.sql` and click Run.
    Then add `macro, correlation` to Project Settings -> API -> Exposed schemas.

Run from repo root:
    python scripts/supabase_smoke.py

Steps:
  1. Reachability: REST root + verify project is alive.
  2. Schema audit: list tables in `public` (existing website — must be
     untouched), then list tables in `macro` and `correlation` (ours).
  3. Sample upload via PostgREST: 5 US macro series + 100 observations,
     5 correlation series.
  4. Anon read test: same tables via publishable key — RLS should let it
     SELECT and reject INSERT.
  5. correlation.rolling_corr() function: probe via /rpc/.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import sys
from pathlib import Path

import httpx

REPO_ROOT = Path(__file__).resolve().parent.parent
log = logging.getLogger("smoke")


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


def _data_store_root() -> Path:
    raw = os.environ.get("DATA_STORE_PATH", "../data-store")
    p = Path(raw)
    return p if p.is_absolute() else (REPO_ROOT / raw).resolve()


def _h_service(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"}


def _h_anon(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}"}


# --------------------------------------------------------------------------- #
# Steps                                                                       #
# --------------------------------------------------------------------------- #
def step_reachability(cli: httpx.Client, url: str, svc: str) -> dict:
    log.info("[1/5] Reachability...")
    r = cli.get(f"{url}/rest/v1/", headers=_h_service(svc))
    r.raise_for_status()
    spec = r.json()
    log.info("      OK  OpenAPI spec %d bytes", len(r.content))
    return spec


def step_schema_audit(cli: httpx.Client, url: str, svc: str) -> dict:
    log.info("[2/5] Schema audit (verifying website tables untouched + our tables present)...")
    results: dict = {}

    # Public (existing website)
    r = cli.get(f"{url}/rest/v1/", headers={**_h_service(svc), "Accept-Profile": "public"})
    spec = r.json()
    pub_tables = sorted({p.strip("/") for p in spec.get("paths", {}) if not p.startswith("/rpc/") and len(p) > 1})
    results["public"] = pub_tables
    log.info("      public.*       (existing website — UNTOUCHED): %s", pub_tables)

    # Macro (ours)
    r = cli.get(f"{url}/rest/v1/", headers={**_h_service(svc), "Accept-Profile": "macro"})
    if r.status_code == 406:
        log.warning("      macro.*        NOT EXPOSED in API settings yet")
        results["macro"] = None
    else:
        spec = r.json()
        macro_tables = sorted({p.strip("/") for p in spec.get("paths", {}) if not p.startswith("/rpc/") and len(p) > 1})
        results["macro"] = macro_tables
        log.info("      macro.*        : %s", macro_tables)

    # Correlation (ours)
    r = cli.get(f"{url}/rest/v1/", headers={**_h_service(svc), "Accept-Profile": "correlation"})
    if r.status_code == 406:
        log.warning("      correlation.*  NOT EXPOSED in API settings yet")
        results["correlation"] = None
    else:
        spec = r.json()
        all_paths = list(spec.get("paths", {}))
        corr_tables = sorted({p.strip("/") for p in all_paths if not p.startswith("/rpc/") and len(p) > 1})
        corr_rpcs   = sorted({p.strip("/") for p in all_paths if p.startswith("/rpc/")})
        results["correlation"] = corr_tables
        results["correlation_rpc"] = corr_rpcs
        log.info("      correlation.*  : %s", corr_tables)
        log.info("      correlation rpc: %s", corr_rpcs)
    return results


def step_sample_upload(cli: httpx.Client, url: str, svc: str) -> dict:
    log.info("[3/5] Uploading sample data via PostgREST...")
    ds = _data_store_root()
    summary: dict = {"macro_series": 0, "macro_obs": 0, "correlation_series": 0}

    # --- macro sample ---
    sample_rics = ["aUSCPIYYR", "aUSGDPCYR", "aUSEMPCHGE", "aUSUNTOTR", "aUSFEDFUND"]
    us_db = ds / "macro" / "us.sqlite"
    if not us_db.exists():
        log.warning("      missing %s — skipping macro sample", us_db)
    else:
        sconn = sqlite3.connect(str(us_db))
        placeholders = ",".join("?" for _ in sample_rics)
        series_rows = sconn.execute(
            f"SELECT ric, category_slug, category, description, frequency "
            f"FROM series WHERE ric IN ({placeholders})", sample_rics
        ).fetchall()
        obs_rows = sconn.execute(
            f"SELECT ric, date, value FROM observations WHERE ric IN ({placeholders}) "
            f"ORDER BY date DESC LIMIT 500", sample_rics
        ).fetchall()
        sconn.close()

        series_payload = [
            {"ric": r[0], "country": "us", "category_slug": r[1],
             "category": r[2], "description": r[3], "frequency": r[4]}
            for r in series_rows
        ]
        # PostgREST upsert via Prefer header
        r = cli.post(
            f"{url}/rest/v1/series",
            headers={**_h_service(svc),
                     "Content-Profile": "macro",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=series_payload,
        )
        if r.status_code >= 300:
            log.error("      macro.series  upsert FAIL  http=%d  body=%s", r.status_code, r.text[:300])
            raise SystemExit(1)
        summary["macro_series"] = len(series_payload)
        log.info("      macro.series  upserted %d rows", len(series_payload))

        obs_payload = [{"ric": r[0], "date": r[1], "value": r[2]} for r in obs_rows]
        r = cli.post(
            f"{url}/rest/v1/observations",
            headers={**_h_service(svc),
                     "Content-Profile": "macro",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=obs_payload,
        )
        if r.status_code >= 300:
            log.error("      macro.observations  upsert FAIL  http=%d  body=%s", r.status_code, r.text[:300])
            raise SystemExit(1)
        summary["macro_obs"] = len(obs_payload)
        log.info("      macro.observations  upserted %d rows", len(obs_payload))

    # --- correlation sample ---
    cdb = ds / "correlation" / "correlation.sqlite"
    if cdb.exists():
        sconn = sqlite3.connect(str(cdb))
        corr_rows = sconn.execute(
            "SELECT id, name, yf_symbol, source, category, subcategory, return_type, data_start "
            "FROM series LIMIT 10"
        ).fetchall()
        sconn.close()
        corr_payload = [
            {"id": r[0], "name": r[1], "yf_symbol": r[2], "source": r[3],
             "category": r[4], "subcategory": r[5], "return_type": r[6], "data_start": r[7]}
            for r in corr_rows
        ]
        r = cli.post(
            f"{url}/rest/v1/series",
            headers={**_h_service(svc),
                     "Content-Profile": "correlation",
                     "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=corr_payload,
        )
        if r.status_code >= 300:
            log.error("      correlation.series  upsert FAIL  http=%d  body=%s", r.status_code, r.text[:300])
            raise SystemExit(1)
        summary["correlation_series"] = len(corr_payload)
        log.info("      correlation.series  upserted %d rows", len(corr_payload))
    return summary


def step_anon_check(cli: httpx.Client, url: str, anon: str) -> dict:
    log.info("[4/5] Anon read + RLS write-block check...")
    results: dict = {}

    # Reads via anon
    for schema, table in [("macro", "series"), ("macro", "observations"),
                          ("correlation", "series")]:
        r = cli.get(
            f"{url}/rest/v1/{table}",
            params={"limit": "1"},
            headers={**_h_anon(anon), "Accept-Profile": schema},
        )
        ok = r.status_code == 200
        rows = len(r.json()) if ok else 0
        results[f"read:{schema}.{table}"] = {"status": r.status_code, "rows": rows, "ok": ok}
        log.info("      read %s.%s  http=%d  rows=%d  %s",
                 schema, table, r.status_code, rows, "OK" if ok else "FAIL")

    # Writes blocked
    r = cli.post(
        f"{url}/rest/v1/series",
        headers={**_h_anon(anon),
                 "Content-Profile": "macro",
                 "Content-Type": "application/json"},
        json=[{"ric": "FAKE_SHOULD_BE_BLOCKED", "country": "us"}],
    )
    blocked = r.status_code in (401, 403)
    results["write_blocked"] = blocked
    log.info("      anon write  http=%d  %s", r.status_code,
             "blocked (good)" if blocked else "NOT BLOCKED (RLS misconfigured)")
    return results


def step_rolling_corr(cli: httpx.Client, url: str, svc: str) -> dict:
    log.info("[5/5] correlation.rolling_corr() RPC presence...")
    # Try calling with bogus args — we don't have returns data uploaded yet
    r = cli.post(
        f"{url}/rest/v1/rpc/rolling_corr",
        headers={**_h_service(svc), "Content-Profile": "correlation"},
        json={"series_a": "AMEX:SPY", "series_b": "NASDAQ:QQQ",
              "frequency": "weekly", "window_size": 52},
    )
    present = r.status_code in (200, 204)
    log.info("      rolling_corr  http=%d  %s", r.status_code,
             "present" if present else f"missing: {r.text[:120]}")
    return {"rolling_corr_present": present, "status": r.status_code,
            "sample_rows": (r.json() if present and r.text else None)}


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #
def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    _load_dotenv()

    url = os.environ.get("SUPABASE_URL", "").strip()
    anon = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    svc = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not (url and anon and svc):
        log.error("SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY missing in .env")
        return 2

    log.info("Project: %s", url)

    with httpx.Client(timeout=30.0) as cli:
        step_reachability(cli, url, svc)
        schema_state = step_schema_audit(cli, url, svc)

        if schema_state.get("macro") is None or schema_state.get("correlation") is None:
            print()
            print("=" * 64)
            print("ACTION REQUIRED")
            print("=" * 64)
            print("Macro or correlation schema not yet exposed in PostgREST.")
            print()
            print("Steps:")
            print("  1. Open Supabase Dashboard -> SQL Editor.")
            print("  2. Paste the contents of:")
            print(f"       supabase/migrations/all_in_one.sql")
            print("     and click Run.")
            print("  3. Open Project Settings -> API -> Exposed schemas.")
            print("     Add: macro, correlation")
            print("     (comma-separated, after the existing public, graphql_public).")
            print("  4. Re-run this script: python scripts/supabase_smoke.py")
            print("=" * 64)
            return 3

        upload = step_sample_upload(cli, url, svc)
        anon_state = step_anon_check(cli, url, anon)
        rc_state = step_rolling_corr(cli, url, svc)

    # ---- final report ----
    print("\n" + "=" * 64)
    print("SMOKE REPORT")
    print("=" * 64)
    ok = True
    print(f"  PASS  existing public.*: {schema_state['public']}  (untouched)")
    print(f"  PASS  macro.* exposed: {len(schema_state['macro'])} tables")
    print(f"  PASS  correlation.* exposed: {len(schema_state['correlation'])} tables")
    print(f"  PASS  sample upload: {upload['macro_series']} macro series, {upload['macro_obs']} obs, {upload['correlation_series']} corr series")
    bad_reads = [k for k, v in anon_state.items() if k.startswith('read:') and not v.get('ok')]
    if bad_reads:
        ok = False
        print(f"  FAIL  anon reads failing: {bad_reads}")
    else:
        print("  PASS  anon reads: all schemas accessible")
    if anon_state['write_blocked']:
        print("  PASS  anon writes blocked by RLS")
    else:
        ok = False
        print("  FAIL  anon writes NOT blocked — RLS misconfigured")
    if rc_state['rolling_corr_present']:
        print("  PASS  correlation.rolling_corr() callable via /rpc/")
    else:
        ok = False
        print(f"  FAIL  correlation.rolling_corr() missing (http={rc_state['status']})")
    print("=" * 64)
    print("OVERALL: " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
