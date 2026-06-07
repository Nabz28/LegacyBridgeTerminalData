#!/usr/bin/env python3
"""reembed — keep brain.notes embeddings self-healing.

Embeddings power the semantic half of brain.search_notes (0039). The proxy
(api/bridge.js) embeds on brain_write, but DIRECT writes — the browser wiki,
OpenClaw intake, one-off scripts — leave `embedding` NULL and thus invisible to
vector search until re-embedded. This script embeds every active (status=filed,
non-snapshot) note that is missing an embedding. Idempotent; safe to run nightly.

Credentials (env first, for CI; then repo-root .env; then ~/.claude/legion.local.json):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
Exits 0 even if OPENROUTER_API_KEY is absent (no-op) so it never breaks the backup job.
"""
import json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

MODEL = "openai/text-embedding-3-small"
BATCH = 40


def _load_creds():
    url = os.environ.get("SUPABASE_URL")
    sr = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    ork = os.environ.get("OPENROUTER_API_KEY")
    if not (url and sr):
        for p in (Path(__file__).resolve().parents[2] / ".env",
                  Path.home() / ".claude" / "legion.local.json"):
            if p.exists():
                try:
                    if p.suffix == ".json":
                        c = json.loads(p.read_text(encoding="utf-8"))
                        url = url or c.get("rest_base", "").replace("/rest/v1", "") or c.get("url")
                        sr = sr or c.get("service_role")
                    else:
                        for line in p.read_text(encoding="utf-8").splitlines():
                            if "=" in line and not line.strip().startswith("#"):
                                k, v = line.split("=", 1)
                                if k.strip() == "SUPABASE_URL": url = url or v.strip()
                                if k.strip() == "SUPABASE_SERVICE_ROLE_KEY": sr = sr or v.strip()
                                if k.strip() == "OPENROUTER_API_KEY": ork = ork or v.strip()
                except Exception:
                    pass
    return url, sr, ork


def main():
    url, sr, ork = _load_creds()
    if not (url and sr):
        print("reembed: missing SUPABASE creds; skipping"); return 0
    rest = url.rstrip("/") + "/rest/v1"
    H = {"apikey": sr, "Authorization": "Bearer " + sr, "Accept-Profile": "brain"}

    def sb(method, path, body=None, prefer=None):
        h = dict(H)
        if body is not None:
            h["Content-Type"] = "application/json"; h["Content-Profile"] = "brain"
        if prefer:
            h["Prefer"] = prefer
        for _ in range(4):
            try:
                r = urllib.request.Request(rest + path, method=method,
                    data=json.dumps(body).encode() if body is not None else None, headers=h)
                with urllib.request.urlopen(r, timeout=60) as x:
                    t = x.read().decode(); return json.loads(t) if t else None
            except Exception:
                time.sleep(2)
        raise RuntimeError("supabase request failed: " + path)

    # vault fallback for the OpenRouter key (service-role can read it)
    if not ork:
        try:
            rows = sb("GET", "/vault?select=value&key=eq.openrouter_api_key")
            ork = rows[0]["value"] if rows else None
        except Exception:
            ork = None
    if not ork:
        print("reembed: no OPENROUTER_API_KEY; skipping (no-op)"); return 0

    def embed(texts):
        b = json.dumps({"model": MODEL, "input": texts}).encode()
        for _ in range(4):
            try:
                r = urllib.request.Request("https://openrouter.ai/api/v1/embeddings", data=b,
                    headers={"Authorization": "Bearer " + ork, "Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(r, timeout=120) as x:
                    d = json.loads(x.read().decode())
                    return [i["embedding"] for i in sorted(d["data"], key=lambda z: z["index"])]
            except Exception:
                time.sleep(3)
        raise RuntimeError("embeddings request failed")

    def vlit(v):
        return "[" + ",".join(format(x, ".6f") for x in v) + "]"

    rows = sb("GET", "/notes?select=id,title,body&status=eq.filed&type=neq.status_snapshot&embedding=is.null&limit=1000")
    print("reembed: notes missing embedding =", len(rows))
    done = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        embs = embed([((n.get("title") or "") + "\n" + (n.get("body") or ""))[:7000] for n in chunk])
        for n, e in zip(chunk, embs):
            sb("PATCH", "/notes?id=eq." + n["id"], {"embedding": vlit(e)}, prefer="return=minimal")
            done += 1
    print("reembed: embedded", done)
    return 0


if __name__ == "__main__":
    sys.exit(main())
