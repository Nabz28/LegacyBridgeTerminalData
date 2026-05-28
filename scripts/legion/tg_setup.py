#!/usr/bin/env python3
"""
One-shot Telegram bot setup for LEGION F1.

Stores the bot token in brain.vault as `telegram_bot_token`, then calls
the Telegram getUpdates API to auto-discover the principal's chat_id
(the chat from which the most recent message to the bot came) and stores
that as `telegram_chat_id`. Also pushes the bot's whoami so we have it
on record.

Usage:
  # Option A — token in env (recommended; never reaches chat or disk)
  TELEGRAM_BOT_TOKEN=123:ABC python scripts/legion/tg_setup.py

  # Option B — token in a one-shot scratch file (gitignored)
  printf '%s' "123:ABC" > .claude/tg-token.txt
  python scripts/legion/tg_setup.py
  # the script deletes the file on success

Pre-req: you've messaged your bot at least once on Telegram (anything,
e.g. "hi"). Otherwise getUpdates returns empty and we cannot discover
the chat id.
"""
from __future__ import annotations
import json, os, sys, urllib.error, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from legion._brain import Brain  # noqa: E402


_REPO_ROOT = Path(__file__).resolve().parents[2]
_TOKEN_FILE = _REPO_ROOT / ".claude" / "tg-token.txt"


def load_token(b: "Brain | None" = None) -> str:
    """Resolve token from env → scratch file → brain.vault. The vault
    fallback lets this run from CI / from a fresh agent without surfacing
    the token in chat or on disk."""
    t = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if t:
        return t
    if _TOKEN_FILE.exists():
        return _TOKEN_FILE.read_text(encoding="utf-8").strip()
    if b is not None:
        vt = b.vault_try("telegram_bot_token")
        if vt:
            return vt
    raise SystemExit(
        f"no token. set TELEGRAM_BOT_TOKEN env var, write the token into "
        f"{_TOKEN_FILE.relative_to(_REPO_ROOT)}, or pre-file brain.vault.telegram_bot_token."
    )


def tg(method: str, token: str, params: dict | None = None) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    if params:
        import urllib.parse as up
        url += "?" + up.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"ok": False, "http_code": e.code, "body": e.read().decode("utf-8", errors="replace")[:300]}


def main() -> int:
    b = Brain()
    token = load_token(b)
    if not (":" in token and len(token) > 30):
        print(f"bad token shape (got length {len(token)} — Telegram tokens look like 123456:AA...).", file=sys.stderr)
        return 2

    # 1) Confirm token via getMe
    me = tg("getMe", token)
    if not me.get("ok"):
        print(f"getMe failed: {me}", file=sys.stderr)
        return 3
    bot = me["result"]
    print(f"bot OK: @{bot['username']}  (id={bot['id']}, name={bot.get('first_name')})")

    # 2) getUpdates → find a chat the principal has messaged
    upd = tg("getUpdates", token, {"limit": 50})
    if not upd.get("ok") or not upd.get("result"):
        print(
            "\nno updates yet. Open Telegram → search @" + bot["username"] +
            " → tap Start → send 'hi'. Then re-run this script.",
            file=sys.stderr,
        )
        return 4

    # Take the most recent message and use its chat id
    msgs = []
    for u in upd["result"]:
        m = u.get("message") or u.get("edited_message")
        if m and m.get("chat") and m.get("from"):
            msgs.append(m)
    if not msgs:
        print("updates present but no usable message — re-message the bot and retry.", file=sys.stderr)
        return 5

    latest = msgs[-1]
    chat = latest["chat"]
    sender = latest["from"]
    chat_id = str(chat["id"])
    print(f"chat OK: id={chat_id}  type={chat['type']}  from=@{sender.get('username') or sender.get('first_name')}")

    # 3) File both into brain.vault
    b.vault_set(
        "telegram_bot_token", token,
        note=f"@{bot['username']} (bot id {bot['id']}). Created via BotFather. Used by F1 nag.",
        is_secret=True,
    )
    b.vault_set(
        "telegram_chat_id", chat_id,
        note=f"Principal chat id for @{bot['username']}. From {sender.get('username') or sender.get('first_name')}.",
        is_secret=False,
    )
    print("\nfiled into brain.vault:")
    print("  • telegram_bot_token  (SECRET)")
    print("  • telegram_chat_id    (non-secret; safe to log)")

    # 4) Send a smoke-test message so the principal sees it actually works
    smoke = tg("sendMessage", token, {
        "chat_id": chat_id,
        "text": f"LEGION wired in. Bot @{bot['username']} can now reach you on cron.",
    })
    if smoke.get("ok"):
        print(f"  smoke-test message sent (id {smoke['result']['message_id']}).")
    else:
        print(f"  smoke-test FAILED: {smoke}", file=sys.stderr)

    # 5) Clean up scratch file
    if _TOKEN_FILE.exists():
        _TOKEN_FILE.unlink()
        print(f"  removed {_TOKEN_FILE.relative_to(_REPO_ROOT)}")

    print("\nF1 ready. Trigger: python scripts/legion/nag.py --force")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
