"""Render + store + push the morning note (and weekly/monthly packets).

The morning note reads like a sekuritas desk note, not a machine log: short
paragraphs, **bold** lead-ins, action first, nothing the reader has to decode.
**markers** render as real bold on Telegram (HTML mode in push/telegram.py)
and in the terminal Briefs page.
"""
from __future__ import annotations

import datetime as dt

from . import telegram
from .. import db

WIB = dt.timezone(dt.timedelta(hours=7))
MAX_DIVE_LINES = 3


def _fmt_pct(x, digits=1):
    return f"{x:+.{digits}%}" if isinstance(x, (int, float)) else "n/a"


def _sentence(s: str) -> str:
    s = " ".join(str(s or "").split())
    if s and s[-1] not in ".!?":
        s += "."
    return s


_DANGLING = {"vs", "vs.", "and", "or", "but", "at", "to", "of", "in", "on", "the", "a", "an", "with"}


def _cut_words(text: str, limit: int) -> str:
    """Trim at a sentence boundary when one fits, else a word boundary."""
    t = " ".join(str(text or "").split())
    if len(t) <= limit:
        return t
    head = t[:limit]
    if ". " in head:
        return head.rsplit(". ", 1)[0] + "."
    return head.rsplit(" ", 1)[0].rstrip(",;")


def _bold_lead(text: str, max_head: int = 52) -> str:
    """Bold the lead fragment of a model-written sentence (sekuritas style)."""
    t = " ".join(str(text or "").split())
    if not t:
        return ""
    if t.startswith("**"):           # already styled by the writer
        return _sentence(t)
    for cut in (": ", "; ", ", ", " as ", " but "):
        i = t.find(cut)
        if 12 <= i <= max_head:
            return "**" + t[:i].rstrip() + ".**" + " " + _sentence(t[i + len(cut):].lstrip().capitalize())
    head_words, head = t.split(), ""
    for w in head_words:
        if len(head) + len(w) + 1 > max_head:
            break
        head = (head + " " + w).strip()
    while head and head.split()[-1].lower() in _DANGLING:   # never end a headline on a connector
        head = head.rsplit(" ", 1)[0]
    rest = t[len(head):].strip()
    return "**" + head + ("**" if not rest else ".** " + _sentence(rest[0].upper() + rest[1:] if rest else rest))


MORNING_WRITER = """You write the 06:30 WIB morning note for the CRO of a small
Indonesian asset manager. He reads it on his phone in 20 seconds. Output EXACTLY
this shape and nothing else:

**Next 12 hours**
Two or three short, plain sentences: what is likely to happen in the markets he
cares about (Indonesia and the rupiah first, then US, China, commodities)
between this morning in Jakarta and tonight. Write like a smart friend, not a
quant: NEVER use the words percentile, z-score, sigma, basis points, regime, or
any statistics jargon. Simple numbers (prices, percents) are fine.

**Why**
A. one short sentence
B. one short sentence
C. one short sentence

Each point gives one concrete driver from the input: an event scheduled today,
a price move that just happened, a policy signal. Interpret ONLY the input,
never invent. Respect the assurance labels: lean on verified findings, and if
you must use an unverified one, hedge it in plain words ("one early read
suggests..."). If the next 12 hours are genuinely quiet (weekend, no events),
say that plainly and point at what matters when markets reopen. No em dashes."""


def _morning_facts(today: str) -> dict:
    """The compact, book-free fact pack the writer model works from."""
    wd = dt.datetime.strptime(today, "%Y-%m-%d").strftime("%A")
    facts: dict = {"today": today, "weekday_jakarta": wd}
    try:
        to = (dt.date.fromisoformat(today) + dt.timedelta(days=1)).isoformat()
        facts["events_next_24h"] = db.select(
            "macro", "calendar",
            f"select=event_date,region,title,importance&event_date=gte.{today}"
            f"&event_date=lte.{to}&order=importance.desc", limit=12)
    except Exception:
        facts["events_next_24h"] = []
    try:
        cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=14)).isoformat()
        facts["overnight_news"] = [
            {"headline": n.get("headline"), "source": n.get("source")}
            for n in db.select("research", "news",
                               f"select=headline,source&published_at=gte.{cutoff}"
                               f"&order=importance.desc,published_at.desc", limit=6)]
    except Exception:
        facts["overnight_news"] = []
    try:
        since = (dt.date.fromisoformat(today) - dt.timedelta(days=2)).isoformat()
        facts["fresh_signals"] = [
            {"headline": (s.get("headline") or "")[:180], "direction": s.get("direction"),
             "assurance": (s.get("payload") or {}).get("assurance", "unchallenged")}
            for s in db.select("research", "signal",
                               f"select=headline,direction,payload&asof=gte.{since}"
                               f"&retired=eq.false&salience=gte.70&kind=neq.deepdive_flag"
                               f"&order=salience.desc", limit=10)]
    except Exception:
        facts["fresh_signals"] = []
    try:
        facts["desk_reads"] = [
            {"desk": d["desk_id"], "read": (d.get("what_changed") or "").replace("**", "")[:140]}
            for d in db.select("research", "dial",
                               "select=desk_id,what_changed,machine_score"
                               "&order=machine_score.desc.nullslast", limit=23)
            if d.get("what_changed")]
    except Exception:
        facts["desk_reads"] = []
    return facts


def render_morning(editor_out: dict, today: str) -> str:
    """The whole note: what the next 12 hours look like, and why in 3 points."""
    import json as _json
    from ..reason import llm

    wib_now = dt.datetime.now(dt.timezone.utc).astimezone(WIB)
    header = f"**LBC MORNING NOTE · {wib_now.strftime('%a %d %b')}**"
    facts = _morning_facts(today)

    body = None
    try:
        model = llm.get_model("morning", llm.get_model("editor"))
        text, usage = llm.chat(model, MORNING_WRITER, _json.dumps(facts, default=str),
                               max_tokens=400, temperature=0.3)
        llm.log("morning_note", None, model, usage)
        # style contract enforced in code, not hoped for in the prompt:
        # digit ranges get hyphens, prose dashes become commas
        import re as _re
        t = _re.sub(r"(\d)\s*[–—]\s*(?=\d)", r"\1-", text.strip())
        t = _re.sub(r"\s*[–—]+\s*", ", ", t)
        if "**Next 12 hours**" in t and "**Why**" in t:
            body = t
    except Exception as e:
        print(f"morning writer failed, using fallback: {e}")

    if body is None:
        # plain fallback: the note must always arrive, even with the writer down
        lines = ["**Next 12 hours**"]
        ev = facts["events_next_24h"][:2]
        if ev:
            lines.append("On the calendar: " + "; ".join(f"{e['title'][:60]} ({e['region']})" for e in ev) + ".")
        else:
            lines.append("Nothing major scheduled; watch how yesterday's moves carry into the open.")
        lines.append("")
        lines.append("**Why**")
        letters = ["A", "B", "C"]
        sigs = facts["fresh_signals"][:3]
        for i, s in enumerate(sigs):
            lines.append(f"{letters[i]}. {_cut_words(s['headline'], 110)}.")
        for j in range(len(sigs), 3):
            lines.append(f"{letters[j]}. No further fresh drivers on file this morning.")
        body = "\n".join(lines)

    parts = [header, body]
    try:
        stale = db.select("research", "ops_freshness",
                          "select=pipeline&status=in.(stale,error)")
        if stale:
            parts.append(f"**Data.** {len(stale)} pipelines stale; today's read may be missing pieces.")
    except Exception:
        pass
    return "\n\n".join(parts)


def _render_morning_legacy(editor_out: dict, today: str) -> str:
    regime = db.get_config("global_regime", {}) or {}
    book = db.get_config("book_state", {}) or {}
    mandate = db.get_config("mandate", {}) or {}
    stale = db.select("research", "ops_freshness",
                      "select=pipeline,status&status=in.(stale,error)")

    wib_now = dt.datetime.now(dt.timezone.utc).astimezone(WIB)
    p: list[str] = [f"**LBC MORNING NOTE · {wib_now.strftime('%a %d %b')} · 06:30 WIB**"]

    # The book state feeds several sections; compute breaches first so every
    # later paragraph can avoid retelling the same story.
    nav = book.get("nav") or {}
    cut = (mandate.get("sizing") or {}).get("cut_loss_pct")
    breaches = [x for x in (book.get("positions") or [])
                if cut is not None and x.get("pnl_pct") is not None and x["pnl_pct"] * 100 <= float(cut)]
    breach_syms = [b["symbol"] for b in breaches]
    mentions_breach = lambda s: any(sym in s for sym in breach_syms)

    # The read: regime + the most important NON-breach change (the breaches get
    # their own paragraph; saying it twice is how notes get long).
    changed = [c.get("text", "").lstrip("0123456789).- ") for c in editor_out.get("changed", []) if c.get("text")]
    fresh = [c for c in changed if not mentions_breach(c)]
    read = _sentence(editor_out.get("regime_line") or regime.get("tag", ""))
    if fresh:
        read += " " + _sentence(fresh[0])
    if read.strip():
        p.append(read)
    if nav.get("nav") is not None:
        line = f"**The book.** NAV {nav['nav']:,.0f}" \
             + (f", {_fmt_pct(nav.get('mtd_pct'))} MTD" if nav.get("mtd_pct") is not None else "") + ". "
        if breaches:
            names = ", ".join(f"{b['symbol']} ({b['pnl_pct'] * 100:+.1f}%)" for b in breaches)
            line += f"{names} " + ("are" if len(breaches) > 1 else "is") \
                 + f" through the {cut:g}% line and waiting on your decision."
        else:
            line += "No positions in breach."
        p.append(line)

    # What moved: up to three model-written sentences, bold lead-ins, breach
    # items excluded (already covered above).
    for c in fresh[1:4]:
        p.append(_bold_lead(c))

    # From the last dive (only when one ran in the past day).
    try:
        since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)).isoformat()
        dives = db.select("research", "deep_queue",
                          f"select=question,answer&status=eq.done&finished_at=gte.{since}"
                          f"&order=finished_at.desc", limit=1)
    except Exception:
        dives = []
    if dives:
        ans = (dives[0].get("answer") or "").split("\n\n")
        gist = " ".join((ans[1] if len(ans) > 1 else ans[0]).split())[:280]
        p.append(f"**From the last dive.** {_sentence(gist)}")

    # Overnight: what landed while he slept, compressed to one paragraph.
    try:
        cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=12)).isoformat()
        night = db.select("research", "news",
                          f"select=headline,source&published_at=gte.{cutoff}"
                          f"&order=importance.desc,published_at.desc", limit=3)
    except Exception:
        night = []
    if night:
        heads = "; ".join(f"{(n.get('headline') or '')[:90]} ({n.get('source') or '?'})" for n in night)
        p.append(f"**Overnight.** {_sentence(heads)}")

    # Do today: decisions + dives, numbered, imperative. The point of the note.
    actions: list[str] = []
    for b in breaches[:3]:
        actions.append(f"Decide {b['symbol']}: hold or cut at {b['pnl_pct'] * 100:+.1f}%.")
    for d in editor_out.get("decide", [])[:2]:
        t = _sentence(d.get("text", ""))
        # breach decisions are already listed by ticker; also skip editor items
        # that retell them collectively ("exit the cut-loss positions...")
        if t and t not in actions and not mentions_breach(t) \
           and not (breaches and "cut-loss" in t.lower().replace("cut loss", "cut-loss")):
            actions.append(t)
    try:
        flags = db.select("research", "signal",
                          f"select=headline&kind=eq.deepdive_flag&asof=eq.{today}&retired=eq.false"
                          f"&order=salience.desc", limit=MAX_DIVE_LINES)
    except Exception:
        flags = []
    for i, f in enumerate(flags, 1):
        head = (f.get("headline") or "").split(":", 1)
        reason = head[1].strip() if len(head) > 1 else head[0]
        twin = next((sym for sym in breach_syms if sym in reason), None)
        if twin:
            # the dive candidate IS a breach: fold the dive offer into its decide line
            for j, a in enumerate(actions):
                if a.startswith(f"Decide {twin}") and "dive" not in a:
                    actions[j] = a.rstrip(".") + f" (or reply \"dive {i}\" to investigate first)."
                    break
        else:
            actions.append(f"Dive {i}: {reason[:90]} (reply \"dive {i}\").")
    if actions:
        p.append("**Do today.**\n" + "\n".join(f"{i}. {a}" for i, a in enumerate(actions[:4], 1)))

    # Watching: near dates + the blind spot, one short paragraph.
    tail: list[str] = []
    try:
        from ..compute import calendar as cal
        events = [e for e in cal.upcoming(days=5, only_relevant=True) if e.get("touches_book")][:2]
        for e in events:
            tail.append(f"{e['event_date'][5:]} {e['title'][:60]}")
    except Exception:
        pass
    if editor_out.get("blind"):
        tail.append(_cut_words(editor_out["blind"], 160))
    if tail:
        p.append("**Watching.** " + " ".join(_sentence(t) for t in tail))

    if stale:
        p.append(f"**Data.** {len(stale)} pipelines stale; treat anything downstream of them with care.")

    return "\n\n".join(x for x in p if x and x.strip())


def store_and_push(kind: str, body: str, items: dict, today: str,
                   push: bool = True) -> dict:
    from . import notify
    enabled = db.get_config("enabled", True)
    sent_to = []
    if push and enabled:
        sent_to = telegram.send(body)
        if sent_to:
            notify.log_push("notify", "brief", kind, body.split("\n")[0], sent_to)
    db.upsert("research", "brief", [{
        "kind": kind, "asof": today, "body": body, "items": items,
        "sent_to": sent_to,
        "sent_at": dt.datetime.now(dt.timezone.utc).isoformat() if sent_to else None,
    }], on_conflict="kind,asof")
    return {"sent_to": sent_to, "chars": len(body)}
