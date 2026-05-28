#!/usr/bin/env python3
"""
F1 — LEGION daily nag via Telegram.

Reads the Pulse note, the inbox, open todos, and overdue milestones.
If anything wants attention, composes a tight message and sends it via
a Telegram bot to the principal's chat.

Vault keys consumed (server-side, never logged):
  telegram_bot_token   — created via @BotFather
  telegram_chat_id     — principal's personal chat id (auto-discoverable)

Updates Pulse.data.last_nagged_at on send so adjacent runs do not spam.

Usage:
  python scripts/legion/nag.py            # respects 12h anti-spam
  python scripts/legion/nag.py --force    # always send (testing)
  python scripts/legion/nag.py --dry-run  # compose, do not send
"""
from __future__ import annotations
import argparse, json, sys, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Linux CI is already utf-8; this is for local Windows console runs.
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # repo/scripts on path
from legion._brain import Brain  # noqa: E402


ANTI_SPAM_HOURS = 12


def _iso_to_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _hours_since(iso: str | None) -> float | None:
    dt = _iso_to_dt(iso)
    if dt is None:
        return None
    return (datetime.now(timezone.utc) - dt).total_seconds() / 3600


def _md_escape(s: str) -> str:
    """Escape for Telegram MarkdownV2. Backslash MUST be first so we do
    not re-escape backslashes we just inserted for the other chars."""
    s = s.replace("\\", "\\\\")
    for ch in "_*[]()~`>#+-=|{}.!":
        s = s.replace(ch, "\\" + ch)
    return s


def gather_state(b: Brain) -> dict:
    pulse = b.note_by_title("LEGION — Pulse")
    pulse_data = (pulse or {}).get("data") or {}
    pulse_age = _hours_since(pulse_data.get("last_update_at"))
    cadence = float(pulse_data.get("cadence_hours") or 24)
    pulse_stale = pulse_age is None or pulse_age >= cadence
    open_asks = pulse_data.get("open_asks") or []

    inbox_count = b.count("notes", "status=eq.inbox")

    # Open todos (no done flag in data — treat all type=todo, status=filed as open)
    todos = b.get("/notes?type=eq.todo&status=eq.filed&select=id,title,data,updated_at&order=updated_at.desc")
    open_todos = [t for t in todos if not (t.get("data") or {}).get("done")]

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    milestones = b.get("/notes?type=eq.milestone&select=id,title,data")
    overdue = []
    for m in milestones:
        d = m.get("data") or {}
        if d.get("status") == "done":
            continue
        due = d.get("due")
        if due and due < today:
            overdue.append({"title": m["title"], "due": due})

    return {
        "pulse_id": (pulse or {}).get("id"),
        "pulse_data": pulse_data,
        "pulse_age_h": pulse_age,
        "cadence_h": cadence,
        "pulse_stale": pulse_stale,
        "open_asks": open_asks,
        "inbox_count": inbox_count,
        "open_todos": open_todos,
        "overdue_milestones": overdue,
    }


def should_nag(state: dict, *, force: bool = False) -> tuple[bool, str]:
    if force:
        return True, "forced"
    triggers = []
    if state["pulse_stale"]:
        if state["pulse_age_h"] is None:
            triggers.append("Pulse never set")
        else:
            triggers.append(f"Pulse stale {int(state['pulse_age_h'])}h (cadence {int(state['cadence_h'])}h)")
    if state["inbox_count"] > 0:
        triggers.append(f"{state['inbox_count']} inbox note(s) untriaged")
    if state["overdue_milestones"]:
        triggers.append(f"{len(state['overdue_milestones'])} overdue milestone(s)")
    if state["open_asks"]:
        triggers.append(f"{len(state['open_asks'])} open ask(s)")
    if not triggers:
        return False, "all quiet"

    # anti-spam: do not re-fire within ANTI_SPAM_HOURS unless forced
    last = state["pulse_data"].get("last_nagged_at")
    last_h = _hours_since(last)
    if last_h is not None and last_h < ANTI_SPAM_HOURS:
        return False, f"already nagged {int(last_h)}h ago (< {ANTI_SPAM_HOURS}h anti-spam window)"
    return True, "; ".join(triggers)


def compose(state: dict) -> str:
    """Compose the message body. MarkdownV2-escaped."""
    pulse_h = state["pulse_age_h"]
    pulse_line = (
        f"Pulse: *{int(pulse_h)}h since update* \\(cadence {int(state['cadence_h'])}h\\)" if pulse_h is not None
        else "Pulse: never set"
    )
    lines: list[str] = []
    lines.append("*LEGION · daily nudge*")
    lines.append("")
    lines.append(pulse_line)

    if state["inbox_count"] > 0:
        lines.append(f"Inbox: *{state['inbox_count']} untriaged note\\(s\\)*")

    if state["overdue_milestones"]:
        lines.append("")
        lines.append("*Overdue milestones:*")
        for m in state["overdue_milestones"]:
            lines.append(f"  • {_md_escape(m['title'])} \\(due {_md_escape(m['due'])}\\)")

    if state["open_asks"]:
        lines.append("")
        lines.append("*Open asks:*")
        for a in state["open_asks"][:10]:
            lines.append(f"  • {_md_escape(a)}")

    if state["open_todos"]:
        lines.append("")
        lines.append(f"*{len(state['open_todos'])} open todo\\(s\\)* \\(top 5\\):")
        for t in state["open_todos"][:5]:
            lines.append(f"  □ {_md_escape(t['title'])}")

    lines.append("")
    lines.append("Run `/legion` in Claude Code to engage\\.")
    return "\n".join(lines)


def send_telegram(token: str, chat_id: str, text: str) -> dict:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "MarkdownV2",
        "disable_web_page_preview": True,
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"telegram HTTP {e.code}: {payload[:300]}") from None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="send even if anti-spam window is open")
    ap.add_argument("--dry-run", action="store_true", help="compose + print; do not send")
    args = ap.parse_args()

    b = Brain()

    token = b.vault_try("telegram_bot_token")
    chat_id = b.vault_try("telegram_chat_id")

    state = gather_state(b)
    should, why = should_nag(state, force=args.force)
    print(f"decision: should_nag={should}  reason={why}")
    if not should:
        return 0

    body = compose(state)
    print("---- message preview ----")
    print(body)
    print("-------------------------")

    if args.dry_run:
        return 0

    if not token or not chat_id:
        print(
            "ERROR: telegram_bot_token / telegram_chat_id missing in brain.vault — "
            "F1 cannot send. Run scripts/legion/tg_setup.py first.",
            file=sys.stderr,
        )
        return 2

    result = send_telegram(token, chat_id, body)
    if not result.get("ok"):
        print(f"telegram error: {result}", file=sys.stderr)
        return 3

    # Stamp Pulse so we do not re-nag this window
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    pd = dict(state["pulse_data"]); pd["last_nagged_at"] = now_iso
    b.update("notes", f"id=eq.{state['pulse_id']}", {"data": pd})
    print(f"sent. message_id={result['result']['message_id']}  pulse stamped at {now_iso}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
