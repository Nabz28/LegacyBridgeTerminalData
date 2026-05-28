"""
brain — shared helpers for any LEGION script (scheduled or one-shot).

Resolves credentials in this order:
  1. Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
     — set by GitHub Actions secrets, Vercel env, or a local shell.
  2. Repo-root `.env` file (gitignored).
  3. Per-worktree `.claude/legion.local.json` (gitignored).

Never logs secrets. The vault helpers fetch values from `brain.vault`
but the caller is responsible for not echoing them.

Public surface:
  Brain        — instance: .get(path), .upsert(table, row, on_conflict),
                 .update(table, match, patch), .delete(table, match),
                 .vault(key) → str, .vault_set(key, value, *, note, is_secret)
  load_credentials() — explicit if you need to control the lookup
"""
from __future__ import annotations
import json, os, urllib.parse, urllib.request, urllib.error
from pathlib import Path
from typing import Any


_REPO_ROOT = Path(__file__).resolve().parents[2]


def _parse_env_file(p: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not p.exists():
        return out
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def load_credentials() -> tuple[str, str]:
    """Return (supabase_url, service_role_key). Raises if not found."""
    url = os.environ.get("SUPABASE_URL")
    sr = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not (url and sr):
        env = _parse_env_file(_REPO_ROOT / ".env")
        url = url or env.get("SUPABASE_URL")
        sr = sr or env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not (url and sr):
        legion_local = _REPO_ROOT / ".claude" / "legion.local.json"
        if legion_local.exists():
            cfg = json.loads(legion_local.read_text(encoding="utf-8"))
            base = cfg.get("rest_base", "")
            url = url or (base.rsplit("/rest/v1", 1)[0] if base else None)
            sr = sr or cfg.get("service_role")

    if not (url and sr):
        raise RuntimeError(
            "missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set env vars, "
            "populate .env, or place .claude/legion.local.json"
        )
    return url.rstrip("/"), sr


class Brain:
    """PostgREST client scoped to the `brain` schema, authed as service_role."""

    def __init__(self, url: str | None = None, sr: str | None = None) -> None:
        if url is None or sr is None:
            url, sr = load_credentials()
        self.url = url
        self.sr = sr
        self.base = f"{url}/rest/v1"

    # ---- low-level ---------------------------------------------------------
    def _headers(self, *, write: bool = False, prefer: str | None = None) -> dict[str, str]:
        h = {"apikey": self.sr, "Authorization": f"Bearer {self.sr}"}
        if write:
            h["Content-Type"] = "application/json"
            h["Content-Profile"] = "brain"
            h["Prefer"] = prefer or "return=representation"
        else:
            h["Accept-Profile"] = "brain"
        return h

    def _request(self, method: str, path: str, *, body: Any = None,
                 extra_headers: dict[str, str] | None = None, timeout: float = 30) -> tuple[int, str, dict[str, str]]:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        h = self._headers(write=body is not None)
        if extra_headers:
            h.update(extra_headers)
        req = urllib.request.Request(self.base + path, data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read().decode("utf-8"), dict(r.headers)
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", errors="replace"), dict(e.headers)

    # ---- high-level --------------------------------------------------------
    def get(self, path: str) -> Any:
        code, text, _ = self._request("GET", path)
        if code >= 300:
            raise RuntimeError(f"brain GET {path} → {code}: {text[:300]}")
        return json.loads(text) if text else []

    def count(self, table: str, qs: str = "") -> int:
        path = f"/{table}" + (f"?{qs}" if qs else "")
        code, text, hdrs = self._request(
            "GET", path,
            extra_headers={"Prefer": "count=exact", "Range": "0-0", "Range-Unit": "items"},
        )
        if code >= 300:
            raise RuntimeError(f"brain count {table} → {code}: {text[:300]}")
        cr = hdrs.get("content-range") or hdrs.get("Content-Range") or ""
        total = cr.split("/")[-1]
        return 0 if total in ("", "*") else int(total)

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        code, text, _ = self._request("POST", f"/{table}", body=row)
        if code >= 300:
            raise RuntimeError(f"brain insert {table} → {code}: {text[:300]}")
        return json.loads(text)[0]

    def upsert(self, table: str, row: dict[str, Any], *, on_conflict: str = "id") -> dict[str, Any]:
        code, text, _ = self._request(
            "POST", f"/{table}?on_conflict={on_conflict}",
            body=row,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        if code >= 300:
            raise RuntimeError(f"brain upsert {table} → {code}: {text[:300]}")
        return json.loads(text)[0]

    def update(self, table: str, match: str, patch: dict[str, Any]) -> None:
        code, text, _ = self._request(
            "PATCH", f"/{table}?{match}",
            body=patch,
            extra_headers={"Prefer": "return=minimal"},
        )
        if code >= 300:
            raise RuntimeError(f"brain update {table} ({match}) → {code}: {text[:300]}")

    def delete(self, table: str, match: str) -> None:
        code, text, _ = self._request("DELETE", f"/{table}?{match}", body=None)
        if code >= 300:
            raise RuntimeError(f"brain delete {table} ({match}) → {code}: {text[:300]}")

    # ---- vault -------------------------------------------------------------
    def vault(self, key: str) -> str:
        """Fetch a vault value. Raises if missing. NEVER log the return value."""
        rows = self.get(f"/vault?key=eq.{urllib.parse.quote(key)}&select=value")
        if not rows:
            raise KeyError(f"brain.vault missing key {key!r}")
        return rows[0]["value"]

    def vault_try(self, key: str) -> str | None:
        """Like .vault() but returns None on miss."""
        try:
            return self.vault(key)
        except KeyError:
            return None

    def vault_set(self, key: str, value: str, *, note: str = "", is_secret: bool = True) -> None:
        """Upsert a vault entry."""
        row = {"key": key, "value": value, "is_secret": is_secret, "note": note}
        self.upsert("vault", row, on_conflict="key")

    # ---- notes convenience -------------------------------------------------
    def note_by_title(self, title: str, *, select: str = "*") -> dict | None:
        rows = self.get(
            f"/notes?title=eq.{urllib.parse.quote(title)}&select={select}&limit=1"
        )
        return rows[0] if rows else None


__all__ = ["Brain", "load_credentials"]
