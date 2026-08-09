"""Daily deep-dive candidates: the machine proposes, the CRO picks.

Deterministic (no LLM): each nightly run flags up to three things most worth a
human-led deep dive today, written as kind='deepdive_flag' signals so every
surface (terminal board, morning brief, LEGION's cache) sees the same list.
Priority: cut-loss breach > stance flip > high-salience unverified finding >
news-attention spike > imminent book-relevant event.
"""
from __future__ import annotations

import datetime as dt

from .. import db

MAX_FLAGS = 3


def _stance_flips(today: str) -> list[dict]:
    rows = db.select("research", "dial_history",
                     f"select=desk_id,asof,stance,machine_stance&order=asof.desc&limit=200")
    by_desk: dict[str, list[dict]] = {}
    for r in rows:
        by_desk.setdefault(r["desk_id"], []).append(r)
    out = []
    for desk_id, hist in by_desk.items():
        if len(hist) >= 2:
            cur, prev = hist[0], hist[1]
            if cur["stance"] != prev["stance"] or cur["machine_stance"] != prev["machine_stance"]:
                out.append({"desk_id": desk_id, "kind": "stance_flip",
                            "reason": f"stance moved {prev['stance']}->{cur['stance']}"
                                      + (f", machine {prev['machine_stance']}->{cur['machine_stance']}"
                                         if cur["machine_stance"] != prev["machine_stance"] else "")})
    return out


def _breaches() -> list[dict]:
    book = db.get_config("book_state", {}) or {}
    mandate = db.get_config("mandate", {}) or {}
    cut = ((mandate.get("sizing") or {}).get("cut_loss_pct"))
    if cut is None:
        return []
    out = []
    for p in book.get("positions") or []:
        pnl = p.get("pnl_pct")
        if pnl is not None and pnl * 100 <= float(cut):
            out.append({"desk_id": None, "ticker": p.get("symbol"), "kind": "cut_loss_breach",
                        "reason": f"{p.get('symbol')} at {pnl * 100:.1f}% vs cost, through the {cut}% line"})
    return out


def _unverified_high(today: str) -> list[dict]:
    rows = db.select("research", "signal",
                     f"select=desk_id,headline,salience,payload&asof=eq.{today}&retired=eq.false"
                     f"&salience=gte.85&kind=neq.deepdive_flag&order=salience.desc", limit=10)
    out = []
    for r in rows:
        a = (r.get("payload") or {}).get("assurance", "unchallenged")
        if a in ("computed", "unchallenged"):
            out.append({"desk_id": r.get("desk_id"), "kind": "unverified_finding",
                        "reason": f"salience-{r['salience']} finding is machine-only, worth a human check: "
                                  + (r.get("headline") or "")[:110]})
    return out[:2]


def _attention_spikes() -> list[dict]:
    latest = db.select("research", "desk_sentiment", "select=asof&order=asof.desc&limit=1")
    if not latest:
        return []
    rows = db.select("research", "desk_sentiment",
                     f"select=desk_id,vol_z,sent_z,news_count,top_headline&asof=eq.{latest[0]['asof']}", limit=100)
    out = []
    for r in rows:
        vz, sz = r.get("vol_z"), r.get("sent_z")
        if (vz is not None and abs(vz) >= 2) or (sz is not None and abs(sz) >= 2):
            out.append({"desk_id": r["desk_id"], "kind": "attention_spike",
                        "reason": f"news attention {vz:+.1f} sigma vs its own norm"
                                  + (f"; tone {sz:+.1f} sigma" if sz is not None and abs(sz) >= 2 else "")
                                  + (f" ({(r.get('top_headline') or '')[:80]})" if r.get("top_headline") else "")})
    return out


def _imminent_events(today: str) -> list[dict]:
    to = (dt.date.fromisoformat(today) + dt.timedelta(days=3)).isoformat()
    rows = db.select("research", "calendar_flag",
                     f"select=event_date,title,desk_ids,importance,touches_book"
                     f"&event_date=gte.{today}&event_date=lte.{to}&touches_book=eq.true"
                     f"&importance=eq.high&order=event_date.asc", limit=5)
    return [{"desk_id": (r.get("desk_ids") or [None])[0], "kind": "imminent_event",
             "reason": f"{r['event_date']}: {r['title'][:90]} touches the book"} for r in rows]


def run(today: str | None = None) -> list[dict]:
    today = today or dt.date.today().isoformat()

    ranked = (_breaches() + _stance_flips(today) + _unverified_high(today)
              + _attention_spikes() + _imminent_events(today))
    # one flag per desk/ticker, keep priority order
    seen, flags = set(), []
    for f in ranked:
        key = f.get("desk_id") or f.get("ticker") or f["reason"][:40]
        if key in seen:
            continue
        seen.add(key)
        flags.append(f)
        if len(flags) >= MAX_FLAGS:
            break

    # retire earlier flags so exactly one day's candidates are ever live
    db.update("research", "signal", f"kind=eq.deepdive_flag&asof=lt.{today}&retired=eq.false",
              {"retired": True})

    rows = [{
        "asof": today, "desk_id": f.get("desk_id"), "kind": "deepdive_flag",
        "ref": f.get("ticker"),
        "headline": f"DIVE CANDIDATE {i + 1}: {f['reason']}",
        "payload": {"rank": i + 1, "reason_kind": f["kind"], "assurance": "computed"},
        "salience": 80 - i * 5, "direction": 0,
        "dedupe_key": f"deepdive:{today}:{i + 1}",
    } for i, f in enumerate(flags)]
    if rows:
        db.upsert("research", "signal", rows, on_conflict="dedupe_key,asof")
    print(f"deepdive flags: {len(rows)}")
    return flags
