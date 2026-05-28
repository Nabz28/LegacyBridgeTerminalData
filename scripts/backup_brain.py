#!/usr/bin/env python3
"""
Brain backup — dumps Supabase `brain` schema to a JSON snapshot.

Writes to:  backups/brain/<UTC-date>/
  notes.json         — every row of brain.notes (full body)
  notes_audit.json   — every row of brain.notes_audit (forensic trail)
  vault-meta.json    — vault key NAMES + notes + timestamps (NEVER values)
  summary.json       — counts + checksums for quick diff

Auth:
  SUPABASE_URL                — e.g. https://adnubucjlezrtusbicja.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   — required, server-side only

Falls back to .env in repo root if env vars unset. Designed to run
both locally and from GitHub Actions.

Usage:
  python scripts/backup_brain.py [--out backups/brain]
"""

from __future__ import annotations
import argparse, hashlib, json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path


def load_env(repo_root: Path) -> None:
    env_file = repo_root / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def get_all(base: str, sr: str, path: str, page_size: int = 1000) -> list[dict]:
    """Paginated GET via Range headers. PostgREST caps at 1000 by default."""
    out: list[dict] = []
    offset = 0
    while True:
        req = urllib.request.Request(
            f"{base}{path}",
            headers={
                "apikey": sr,
                "Authorization": f"Bearer {sr}",
                "Accept-Profile": "brain",
                "Range": f"{offset}-{offset + page_size - 1}",
                "Range-Unit": "items",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            chunk = json.loads(r.read().decode())
        out.extend(chunk)
        if len(chunk) < page_size:
            break
        offset += page_size
    return out


def sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="backups/brain", help="output root (relative to repo root)")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    load_env(repo_root)

    url = os.environ.get("SUPABASE_URL")
    sr = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not sr:
        print("ERROR: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must be set (env or .env).", file=sys.stderr)
        return 2

    base = f"{url.rstrip('/')}/rest/v1"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = repo_root / args.out / today
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1) brain.notes — full bodies
    print("Fetching brain.notes…", end=" ", flush=True)
    notes = get_all(base, sr, "/notes?select=*&order=created_at.asc")
    print(f"{len(notes)} rows")

    # 2) brain.notes_audit — forensic trail (may be empty on day 1)
    print("Fetching brain.notes_audit…", end=" ", flush=True)
    try:
        audit = get_all(base, sr, "/notes_audit?select=*&order=audit_id.asc")
    except urllib.error.HTTPError as e:
        # 404 if 0036 not yet applied — degrade gracefully
        if e.code == 404:
            print("(table not present — skipping)")
            audit = []
        else:
            raise
    print(f"{len(audit)} rows")

    # 3) brain.vault — NAMES + notes + timestamps ONLY. NEVER values.
    print("Fetching brain.vault metadata (no values)…", end=" ", flush=True)
    vault_meta = get_all(base, sr, "/vault?select=key,is_secret,note,updated_at&order=key.asc")
    print(f"{len(vault_meta)} keys")

    # Write each as deterministic JSON (sorted keys, indent=2)
    files: dict[str, dict] = {}
    for name, payload in (("notes.json", notes), ("notes_audit.json", audit), ("vault-meta.json", vault_meta)):
        body = json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False).encode("utf-8")
        (out_dir / name).write_bytes(body)
        files[name] = {"rows": len(payload), "bytes": len(body), "sha256": sha256_hex(body)}

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "project_ref": (url.split("//")[-1].split(".")[0] if "supabase.co" in url else None),
        "files": files,
        "totals": {
            "notes": len(notes),
            "notes_audit": len(audit),
            "vault_keys": len(vault_meta),
        },
    }
    summary_body = json.dumps(summary, sort_keys=True, indent=2).encode("utf-8")
    (out_dir / "summary.json").write_bytes(summary_body)

    print(f"\nWrote {out_dir.relative_to(repo_root)}/")
    for name, meta in files.items():
        print(f"  {name:22s}  rows={meta['rows']:>5}  bytes={meta['bytes']:>9}  sha256={meta['sha256'][:12]}…")
    print(f"  {'summary.json':22s}  bytes={len(summary_body):>9}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
