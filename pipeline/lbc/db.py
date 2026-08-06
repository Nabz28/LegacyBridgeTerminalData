"""Supabase PostgREST client for the research pipeline.

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE from env. All writes are UPSERTs
(idempotent, safe to rerun). Never log the key.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://adnubucjlezrtusbicja.supabase.co").rstrip("/")
SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

UA = "lbc-research-pipeline/1.0"


class DbError(RuntimeError):
    pass


def _headers(schema: str, write: bool = False, upsert: bool = False, returning: bool = False):
    if not SERVICE_ROLE:
        raise DbError("SUPABASE_SERVICE_ROLE env var is not set")
    h = {
        "apikey": SERVICE_ROLE,
        "Authorization": f"Bearer {SERVICE_ROLE}",
        "User-Agent": UA,
        "Accept-Profile": schema,
    }
    if write:
        h["Content-Type"] = "application/json"
        h["Content-Profile"] = schema
        prefer = ["return=representation" if returning else "return=minimal"]
        if upsert:
            prefer.append("resolution=merge-duplicates")
        h["Prefer"] = ",".join(prefer)
    return h


def _request(method: str, url: str, headers: dict, body: bytes | None = None, retries: int = 3):
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                txt = r.read().decode()
                return r.status, txt
        except urllib.error.HTTPError as e:
            txt = e.read().decode()
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                last = f"{e.code}: {txt[:300]}"
                continue
            raise DbError(f"{method} {url.split('?')[0]} -> {e.code}: {txt[:500]}")
        except Exception as e:  # network blips
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                last = str(e)
                continue
            raise DbError(f"{method} {url.split('?')[0]} -> {e}")
    raise DbError(f"{method} {url} exhausted retries: {last}")


def select(schema: str, table: str, query: str = "", limit: int | None = None) -> list[dict]:
    """query is a raw PostgREST query string, e.g. 'select=*&order=date.desc'."""
    q = query
    if limit is not None:
        q = f"{q}&limit={limit}" if q else f"limit={limit}"
    url = f"{SUPABASE_URL}/rest/v1/{table}" + (f"?{q}" if q else "")
    _, txt = _request("GET", url, _headers(schema))
    return json.loads(txt)


def upsert(schema: str, table: str, rows: list[dict], on_conflict: str | None = None,
           chunk: int = 500) -> int:
    """UPSERT rows in chunks. Returns row count written."""
    if not rows:
        return 0
    total = 0
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={urllib.parse.quote(on_conflict)}"
    for i in range(0, len(rows), chunk):
        part = rows[i:i + chunk]
        body = json.dumps(part, default=str).encode()
        _request("POST", url, _headers(schema, write=True, upsert=True), body)
        total += len(part)
    return total


def insert(schema: str, table: str, rows: list[dict], returning: bool = False) -> list[dict]:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    body = json.dumps(rows, default=str).encode()
    _, txt = _request("POST", url, _headers(schema, write=True, returning=returning), body)
    return json.loads(txt) if returning and txt else []


def update(schema: str, table: str, match: str, patch: dict) -> None:
    """match is a PostgREST filter string, e.g. 'desk_id=eq.oil-gas'."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{match}"
    body = json.dumps(patch, default=str).encode()
    _request("PATCH", url, _headers(schema, write=True), body)


def delete(schema: str, table: str, match: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{match}"
    _request("DELETE", url, _headers(schema, write=True))


def rpc(schema: str, fn: str, args: dict) -> object:
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    body = json.dumps(args, default=str).encode()
    _, txt = _request("POST", url, _headers(schema, write=True), body)
    return json.loads(txt) if txt else None


def get_config(key: str, default=None):
    rows = select("research", "config", f"select=value&key=eq.{urllib.parse.quote(key)}")
    return rows[0]["value"] if rows else default


def set_config(key: str, value) -> None:
    upsert("research", "config", [{"key": key, "value": value}], on_conflict="key")
