"""Key dates: map macro.calendar events onto desks and the book.

macro.calendar already carries central bank decisions, earnings, index events
and data releases. This adds the layer that matters for decisions: which of
those events touch an open position or a high-conviction desk, and which land
inside 24 hours.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import re

from .. import db

REGION_DESKS = {
    "US": ["us"], "Global": [], "China": ["china-hk-taiwan"], "Japan": ["japan-korea"],
    "Korea": ["japan-korea"], "Taiwan": ["china-hk-taiwan"], "Indonesia": ["indonesia"],
    "ID": ["indonesia"], "Europe": ["eurozone"], "EU": ["eurozone"], "Eurozone": ["eurozone"],
}

CATEGORY_DESKS = {
    "central_bank": ["us", "eurozone", "japan-korea", "indonesia", "china-hk-taiwan"],
    "energy": ["oil-gas", "coal-power-fuels"],
    "commodity": ["oil-gas", "base-battery-bulk", "precious-metals", "agri-food"],
}


def _hash(ev: dict) -> str:
    return hashlib.sha256(f"{ev.get('event_date')}|{ev.get('title')}".encode()).hexdigest()[:32]


def refresh(days_ahead: int = 45) -> int:
    """Recompute desk/book relevance for upcoming events."""
    today = dt.date.today()
    horizon = (today + dt.timedelta(days=days_ahead)).isoformat()
    events = db.select("macro", "calendar",
                       f"select=event_date,region,category,title,entity,ticker,importance,detail"
                       f"&event_date=gte.{today.isoformat()}&event_date=lte.{horizon}"
                       f"&order=event_date.asc", limit=None)
    if not events:
        return 0

    instruments = {r["ticker"]: r["desk_id"]
                   for r in db.select("mkt", "instrument", "select=ticker,desk_id&active=eq.true")}
    book = {r["symbol"] for r in db.select("asset_mgmt", "positions", "select=symbol&status=eq.open")}
    base_to_ticker = {t.split(".")[0].upper(): t for t in instruments}

    rows = []
    for ev in events:
        desks = list(REGION_DESKS.get(ev.get("region") or "", []))
        for d in CATEGORY_DESKS.get(ev.get("category") or "", []):
            if d not in desks:
                desks.append(d)
        tickers = []
        blob = f"{ev.get('title') or ''} {ev.get('entity') or ''} {ev.get('ticker') or ''}"
        for base, tkr in base_to_ticker.items():
            if len(base) >= 3 and base.isalpha() and re.search(rf"\b{base}\b", blob, re.IGNORECASE):
                tickers.append(tkr)
                d = instruments.get(tkr)
                if d and d not in desks:
                    desks.append(d)
        touches = any(t.split(".")[0] in book for t in tickers)
        rows.append({
            "event_hash": _hash(ev), "event_date": ev["event_date"],
            "title": (ev.get("title") or "")[:300], "desk_ids": desks,
            "tickers": tickers[:6], "touches_book": touches,
            "importance": ev.get("importance"),
        })
    return db.upsert("research", "calendar_flag", rows, on_conflict="event_hash", chunk=300)


def upcoming(days: int = 7, only_relevant: bool = False) -> list[dict]:
    today = dt.date.today()
    horizon = (today + dt.timedelta(days=days)).isoformat()
    q = (f"select=*&event_date=gte.{today.isoformat()}&event_date=lte.{horizon}"
         f"&order=event_date.asc")
    rows = db.select("research", "calendar_flag", q, limit=200)
    if only_relevant:
        rows = [r for r in rows if r["touches_book"] or r["importance"] == "high"]
    return rows


def imminent_book_events(hours: int = 36) -> list[dict]:
    """Events inside `hours` that touch an open position — push-worthy."""
    today = dt.date.today()
    limit = (today + dt.timedelta(days=max(1, hours // 24))).isoformat()
    rows = db.select("research", "calendar_flag",
                     f"select=*&event_date=gte.{today.isoformat()}&event_date=lte.{limit}"
                     f"&touches_book=eq.true&order=event_date.asc", limit=50)
    return [r for r in rows if not r.get("notified_at")]


def run() -> int:
    n = refresh()
    today = dt.date.today().isoformat()
    fired = 0
    for ev in imminent_book_events():
        db.upsert("research", "signal", [{
            "asof": today, "desk_id": (ev["desk_ids"] or [None])[0], "kind": "calendar",
            "ref": ev["event_hash"],
            "headline": f"{ev['event_date']}: {ev['title'][:110]} (touches {', '.join(ev['tickers'][:3])})",
            "payload": {"event_date": ev["event_date"], "tickers": ev["tickers"],
                        "importance": ev["importance"]},
            "salience": 78, "direction": 0,
            "dedupe_key": f"calendar:{ev['event_hash']}",
        }], on_conflict="dedupe_key,asof")
        db.update("research", "calendar_flag", f"event_hash=eq.{ev['event_hash']}",
                  {"notified_at": dt.datetime.now(dt.timezone.utc).isoformat()})
        fired += 1
    return n
