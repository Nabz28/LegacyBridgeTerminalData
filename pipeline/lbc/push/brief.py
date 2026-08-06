"""Render + store + push the morning brief (and weekly/monthly packets)."""
from __future__ import annotations

import datetime as dt

from . import telegram
from .. import db

WIB = dt.timezone(dt.timedelta(hours=7))


def _fmt_pct(x, digits=1):
    return f"{x:+.{digits}%}" if isinstance(x, (int, float)) else "n/a"


def render_morning(editor_out: dict, today: str) -> str:
    regime = db.get_config("global_regime", {}) or {}
    book = db.get_config("book_state", {}) or {}
    stale = db.select("research", "ops_freshness",
                      "select=pipeline,status&status=in.(stale,error)")

    # delivery morning in WIB (the nightly job runs ~22:30 UTC = 05:30 WIB next day)
    wib_now = dt.datetime.now(dt.timezone.utc).astimezone(WIB)
    lines = [f"LBC MORNING BRIEF · {wib_now.strftime('%a %d %b %Y')} · 06:30 WIB", ""]

    lines.append(f"REGIME    {editor_out.get('regime_line') or regime.get('tag', 'n/a')}")

    nav = book.get("nav") or {}
    bl = editor_out.get("book_line")
    if not bl:
        bl = f"{book.get('n_positions', 0)} positions"
        if nav.get("mtd_pct") is not None:
            bl += f" · MTD {_fmt_pct(nav['mtd_pct'])}"
        conc = book.get("factor_concentration")
        if conc:
            bl += f" · {conc:.0%} of variance in one factor"
    lines.append(f"BOOK      {bl}")
    lines.append("")

    changed = editor_out.get("changed", [])
    if changed:
        lines.append("CHANGED")
        for i, item in enumerate(changed, 1):
            text = item["text"].lstrip("0123456789).- ")  # models sometimes pre-number
            lines.append(f"  {i}. {text}")
    else:
        lines.append("CHANGED   nothing that clears the bar today")
    lines.append("")

    decide = editor_out.get("decide", [])
    if decide:
        lines.append("DECIDE")
        for item in decide:
            lines.append(f"  · {item['text']}")
        lines.append("")

    if editor_out.get("blind"):
        lines.append(f"BLIND     {editor_out['blind']}")
        lines.append("")

    if stale:
        names = ", ".join(s["pipeline"] for s in stale[:6])
        lines.append(f"DATA      stale/error: {names} (ops board has detail)")

    return "\n".join(lines).strip()


def store_and_push(kind: str, body: str, items: dict, today: str,
                   push: bool = True) -> dict:
    enabled = db.get_config("enabled", True)
    sent_to = []
    if push and enabled:
        sent_to = telegram.send(body)
    db.upsert("research", "brief", [{
        "kind": kind, "asof": today, "body": body, "items": items,
        "sent_to": sent_to,
        "sent_at": dt.datetime.now(dt.timezone.utc).isoformat() if sent_to else None,
    }], on_conflict="kind,asof")
    return {"sent_to": sent_to, "chars": len(body)}
