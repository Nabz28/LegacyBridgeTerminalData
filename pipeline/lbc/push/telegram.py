"""Telegram push (send-only). Uses TELEGRAM_BOT_TOKEN env; recipients from
research.config['telegram_push'].chat_ids, with TELEGRAM_PUSH_CHAT_ID env as
fallback. NEVER calls getUpdates or setWebhook — the LEGION bot's receive path
belongs to OpenClaw."""
from __future__ import annotations

import json
import os
import urllib.request

from .. import db

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")


def chat_ids() -> list[str]:
    cfg = db.get_config("telegram_push", {}) or {}
    ids = [str(c) for c in cfg.get("chat_ids", []) if c]
    env = os.environ.get("TELEGRAM_PUSH_CHAT_ID", "")
    if env and env not in ids:
        ids.append(env)
    return ids


def send(text: str, chat_id: str | None = None, silent: bool = False) -> list[str]:
    """Send text (splitting >4000 chars). Returns list of chat ids delivered to."""
    if not TOKEN:
        print("telegram: no token, skipping push")
        return []
    targets = [chat_id] if chat_id else chat_ids()
    if not targets:
        print("telegram: no chat ids configured, skipping push")
        return []
    delivered = []
    chunks = [text[i:i + 4000] for i in range(0, len(text), 4000)] or [""]
    for cid in targets:
        ok = True
        for chunk in chunks:
            body = json.dumps({"chat_id": cid, "text": chunk,
                               "disable_notification": silent}).encode()
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                data=body, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    resp = json.loads(r.read().decode())
                    ok = ok and resp.get("ok", False)
            except Exception as e:
                print(f"telegram send to {cid} failed: {e}")
                ok = False
                break
        if ok:
            delivered.append(str(cid))
    return delivered
