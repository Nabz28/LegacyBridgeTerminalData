"""
common.py — shared foundation for the LBC Industry Driver Engine.

Responsibilities:
  - Load local secrets (.env.local) and resolve filesystem paths.
  - Supabase PostgREST read/write helpers (service-role).
  - Local correlation.sqlite price access (reuse existing IDX price store).
  - Small on-disk JSON cache for observations (keeps cron fires cheap/idempotent).
  - Structured logging.

No DDL is ever issued (we have no Management PAT). All writes go through
PostgREST into EXISTING tables (macro.live_indicators, macro.observations) or
into versioned repo JSON artifacts under industry-engine/output/.
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
# Make console output robust on Windows (avoid cp1252 UnicodeEncodeError).
for _stream in ("stdout", "stderr"):
    try:
        getattr(sys, _stream).reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

ENGINE_DIR = Path(__file__).resolve().parent          # industry-engine/engine
ROOT = ENGINE_DIR.parent                               # industry-engine/
OUTPUT_DIR = ROOT / "output"
STATE_DIR = ROOT / "state"
CACHE_DIR = ROOT / "cache"
LOG_DIR = ROOT / "logs"
for _d in (OUTPUT_DIR, STATE_DIR, CACHE_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def _load_env() -> dict:
    env = {}
    f = ROOT / ".env.local"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    # OS env overrides file
    for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
              "DATA_STORE_PATH"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


ENV = _load_env()
SUPA_URL = (ENV.get("SUPABASE_URL") or "").rstrip("/")
REST = f"{SUPA_URL}/rest/v1"
SRK = ENV.get("SUPABASE_SERVICE_ROLE_KEY") or ""
ANON = ENV.get("SUPABASE_ANON_KEY") or ""


def _resolve_data_store() -> Path | None:
    """Find data-store/correlation/correlation.sqlite by walking up, or env."""
    override = ENV.get("DATA_STORE_PATH")
    if override:
        p = Path(override)
        if not p.is_absolute():
            p = (ROOT / p).resolve()
        if (p / "correlation" / "correlation.sqlite").exists():
            return p
    cur = ENGINE_DIR
    for _ in range(8):
        cand = cur / "data-store"
        if (cand / "correlation" / "correlation.sqlite").exists():
            return cand
        cur = cur.parent
    return None


DATA_STORE = _resolve_data_store()
CORR_SQLITE = (DATA_STORE / "correlation" / "correlation.sqlite") if DATA_STORE else None


# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
def log(msg: str, *, level: str = "INFO") -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {level:5s} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_DIR / "engine.log", "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# PostgREST helpers
# --------------------------------------------------------------------------- #
def _headers(schema: str, write: bool = False, extra: dict | None = None) -> dict:
    h = {
        "apikey": SRK,
        "Authorization": f"Bearer {SRK}",
        "Accept": "application/json",
    }
    if write:
        h["Content-Type"] = "application/json"
        h["Content-Profile"] = schema
    else:
        h["Accept-Profile"] = schema
    if extra:
        h.update(extra)
    return h


def rest_get(table: str, params: dict, schema: str = "macro",
             timeout: int = 60, retries: int = 3) -> list:
    """GET rows from a PostgREST table. params is a dict of PostgREST query args."""
    qs = urllib.parse.urlencode(params, safe="().,:*+-")
    url = f"{REST}/{table}?{qs}"
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=_headers(schema))
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"rest_get {table} failed: {last}")


def rest_get_all(table: str, params: dict, schema: str = "macro",
                 page: int = 1000, cap: int = 100000) -> list:
    """Paginate a GET past PostgREST's 1000-row default cap."""
    out: list = []
    offset = 0
    base = dict(params)
    while offset < cap:
        h = _headers(schema)
        h["Range-Unit"] = "items"
        h["Range"] = f"{offset}-{offset + page - 1}"
        qs = urllib.parse.urlencode(base, safe="().,:*+-")
        url = f"{REST}/{table}?{qs}"
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=90) as r:
                rows = json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            log(f"rest_get_all {table} page@{offset} error: {e}", level="WARN")
            time.sleep(2)
            continue
        out.extend(rows)
        if len(rows) < page:
            break
        offset += page
    return out


def rest_upsert(table: str, rows: list, schema: str = "macro",
                on_conflict: str | None = None, timeout: int = 90,
                retries: int = 3) -> int:
    """Idempotent upsert (merge-duplicates) into an existing table."""
    if not rows:
        return 0
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    qs = ("?" + urllib.parse.urlencode(params, safe=",")) if params else ""
    url = f"{REST}/{table}{qs}"
    extra = {"Prefer": "resolution=merge-duplicates,return=minimal"}
    body = json.dumps(rows).encode("utf-8")
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=body, headers=_headers(schema, write=True, extra=extra),
                method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as r:
                _ = r.read()
                return len(rows)
        except urllib.error.HTTPError as e:  # noqa
            last = f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:300]}"
            time.sleep(1.5 * (attempt + 1))
        except Exception as e:  # noqa: BLE001
            last = str(e)
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"rest_upsert {table} failed: {last}")


# --------------------------------------------------------------------------- #
# Domain reads
# --------------------------------------------------------------------------- #
def get_equity_screen() -> list:
    cols = ("symbol,yahoo,name,sector,sub_sector,price,change_pct,mcap,beta,"
            "pe,pb,ev_ebitda,roe,roa,net_margin,rev_growth,earnings_growth,"
            "debt_equity,div_yield,w52_high,w52_low,avg_volume,adv_value")
    return rest_get_all("equity_screen", {"select": cols}, schema="public")


def get_idind_series() -> list:
    """All CEIC Indonesia industry series (country=idind), with demand/supply role."""
    cols = ("ric,category,subcategory,stat_role,indicator_topic,description,"
            "subcategory,frequency,units,source,n_obs,first_obs,last_obs")
    return rest_get_all("series", {"country": "eq.idind", "select": cols},
                        schema="macro")


def get_live_indicators(keys: list | None = None) -> list:
    """Fetch live_indicators rows (optionally for a key subset)."""
    params = {"select": "key,label,unit,category,region,latest_value,prev_value,"
                        "change_pct,spark,tv_symbol,series_id,freq"}
    if keys:
        ors = ",".join(f"key.eq.{k}" for k in keys)
        params["or"] = f"({ors})"
    return rest_get_all("live_indicators", params, schema="macro")


def get_series_meta(country: str, select: str | None = None) -> list:
    cols = select or ("ric,category,subcategory,description,frequency,units,"
                      "source,n_obs,first_obs,last_obs")
    return rest_get_all("series", {"country": f"eq.{country}", "select": cols},
                        schema="macro")


def get_observations(ric: str, limit: int = 6000, use_cache: bool = True,
                     max_age_h: float = 18.0) -> list:
    """Return [{date,value}] ascending for a RIC, cached on disk."""
    safe = urllib.parse.quote(ric, safe="")
    cf = CACHE_DIR / f"obs_{safe}.json"
    if use_cache and cf.exists():
        age_h = (time.time() - cf.stat().st_mtime) / 3600.0
        if age_h < max_age_h:
            try:
                return json.loads(cf.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                pass
    rows = rest_get_all(
        "observations",
        {"ric": f"eq.{ric}", "select": "date,value", "order": "date.asc"},
        schema="macro", page=1000, cap=limit)
    rows = [{"date": r["date"], "value": r["value"]} for r in rows
            if r.get("value") is not None]
    try:
        cf.write_text(json.dumps(rows), encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    return rows


# --------------------------------------------------------------------------- #
# Local price store (correlation.sqlite)
# --------------------------------------------------------------------------- #
def sqlite_prices(series_ids: list, freq: str = "weekly") -> dict:
    """Return {series_id: [(date, close), ...]} from the local correlation store.

    series_ids are TradingView-form 'IDX:BBCA'. freq in {weekly, monthly}.
    """
    if not CORR_SQLITE or not series_ids:
        return {}
    tbl = "prices_weekly" if freq == "weekly" else "prices_monthly"
    out: dict = {sid: [] for sid in series_ids}
    con = sqlite3.connect(str(CORR_SQLITE))
    try:
        cur = con.cursor()
        CH = 400
        for i in range(0, len(series_ids), CH):
            chunk = series_ids[i:i + CH]
            ph = ",".join("?" * len(chunk))
            q = (f"select series_id,date,close from {tbl} "
                 f"where series_id in ({ph}) order by series_id,date")
            for sid, d, c in cur.execute(q, chunk):
                if c is not None:
                    out[sid].append((d, float(c)))
    finally:
        con.close()
    return {k: v for k, v in out.items() if v}


# --------------------------------------------------------------------------- #
# State / artifact IO
# --------------------------------------------------------------------------- #
def read_json(path: Path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return default


def _scrub(o):
    """Replace NaN/Inf with None so artifacts stay strict-JSON valid."""
    import math as _m
    if isinstance(o, float):
        return None if (_m.isnan(o) or _m.isinf(o)) else o
    if isinstance(o, dict):
        return {k: _scrub(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_scrub(v) for v in o]
    return o


def write_json(path: Path, obj) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(_scrub(obj), indent=2, ensure_ascii=False,
                                     allow_nan=False), encoding="utf-8")


def slugify(s: str) -> str:
    out = []
    for ch in (s or "").lower().strip():
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_/&":
            out.append("_")
    slug = "".join(out)
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_") or "na"


if __name__ == "__main__":
    # Self-test: env + connectivity + data-store resolution.
    print("ENGINE_DIR :", ENGINE_DIR)
    print("DATA_STORE :", DATA_STORE)
    print("CORR_SQLITE:", CORR_SQLITE, "exists" if CORR_SQLITE and CORR_SQLITE.exists() else "MISSING")
    print("SUPA_URL   :", SUPA_URL)
    print("SRK set    :", bool(SRK), "len", len(SRK))
    try:
        eq = rest_get("equity_screen", {"select": "symbol", "limit": "1"}, schema="public")
        print("equity_screen reachable:", eq)
    except Exception as e:  # noqa: BLE001
        print("equity_screen ERROR:", e)
    sys.exit(0)
