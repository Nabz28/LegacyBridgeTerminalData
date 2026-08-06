"""Render + store + push the morning brief (and weekly/monthly packets)."""
from __future__ import annotations

import datetime as dt

from . import telegram
from .. import db

WIB = dt.timezone(dt.timedelta(hours=7))


def _fmt_pct(x, digits=1):
    return f"{x:+.{digits}%}" if isinstance(x, (int, float)) else "n/a"


def _wrap(text: str, width: int = 62, indent: str = "          ") -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return [lines[0]] + [indent + l for l in lines[1:]] if lines else [""]


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

    # WATCH: ranked names the screens surfaced that are not already in the book
    try:
        from ..compute import screens
        cands = screens.top_candidates(today, limit=4)
    except Exception:
        cands = []
    if cands:
        lines.append("WATCH")
        for c in cands:
            m = c.get("metrics") or {}
            extra = []
            if m.get("ret_12_1") is not None:
                extra.append(f"12-1m {m['ret_12_1']:+.0%}")
            if m.get("rel_strength_63d") is not None:
                extra.append(f"vs desk {m['rel_strength_63d']:+.0%}")
            side = "" if c["side"] == "long" else " (short)"
            lines.append(f"  {c['ticker']:<11}{side} {c['desk_id']:<22} {', '.join(extra)}")
        lines.append("")

    # NEWS: only desks where attention or tone actually moved
    try:
        sent = db.select("research", "desk_sentiment",
                         f"select=desk_id,news_count,sentiment,sent_z,vol_z,top_headline"
                         f"&asof=eq.{today}&order=vol_z.desc", limit=20)
    except Exception:
        sent = []
    hot = [s for s in sent if (s.get("vol_z") or 0) >= 1.8 or abs(s.get("sent_z") or 0) >= 1.8][:3]
    if hot:
        lines.append("NEWS")
        for s in hot:
            tag = []
            if s.get("vol_z") is not None:
                tag.append(f"vol {s['vol_z']:+.1f}z")
            if s.get("sentiment") is not None:
                tag.append(f"tone {s['sentiment']:+.2f}")
            head = (s.get("top_headline") or "")[:95]
            lines.append(f"  {s['desk_id']:<22} {' '.join(tag)}")
            if head:
                lines.append(f"    {head}")
        lines.append("")

    # DATES: what lands next, book-relevant first
    try:
        from ..compute import calendar as cal
        events = cal.upcoming(days=7, only_relevant=True)
    except Exception:
        events = []
    if events:
        events.sort(key=lambda e: (not e["touches_book"], e["event_date"]))
        lines.append("DATES")
        for e in events[:4]:
            mark = "*" if e["touches_book"] else " "
            lines.append(f"  {mark} {e['event_date']} {e['title'][:66]}")
        lines.append("")

    if editor_out.get("blind"):
        lines.append("BLIND     " + "\n".join(_wrap(editor_out["blind"])))
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
