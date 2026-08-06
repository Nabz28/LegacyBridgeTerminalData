"""Populate mkt.instrument.name and short_names from Yahoo.

Company names matter twice: the watchlist is unreadable without them, and news
routing needs them because headlines say "Micron" not "MU".
"""
from __future__ import annotations

import re
import time

from .. import db

STOPWORDS = {"inc", "corp", "corporation", "company", "co", "ltd", "limited", "plc",
             "sa", "se", "ag", "nv", "holdings", "holding", "group", "the", "and",
             "tbk", "pt", "persero", "class", "adr", "spa", "as", "oyj", "ab"}


def short_name(name: str) -> str:
    """'PT Astra Agro Lestari Tbk' -> 'Astra Agro Lestari'.

    Two words is the sweet spot for headline matching: one word matches too
    much ("Fast", "General"), four words rarely appear verbatim.
    """
    if not name:
        return ""
    n = re.sub(r"[.,]", " ", name)
    parts = [p for p in n.split() if p.lower().strip(".") not in STOPWORDS]
    if not parts:
        return ""
    # a single generic word is worse than no match at all
    if len(parts) == 1 and len(parts[0]) < 5:
        return ""
    return " ".join(parts[:3]).strip()


def run(batch: int = 40, sleep: float = 1.0) -> int:
    import yfinance as yf

    rows = db.select("mkt", "instrument", "select=ticker,name&active=eq.true")
    todo = [r["ticker"] for r in rows if not r.get("name")]
    if not todo:
        return 0
    written = 0
    for i in range(0, len(todo), batch):
        chunk = todo[i:i + batch]
        try:
            tk = yf.Tickers(" ".join(chunk))
        except Exception:
            continue
        updates = []
        for t in chunk:
            try:
                info = tk.tickers[t].get_info()
            except Exception:
                continue
            nm = info.get("longName") or info.get("shortName")
            if not nm:
                continue
            updates.append({"ticker": t, "name": nm[:200],
                            "exchange": info.get("exchange"),
                            "currency": info.get("currency")})
        for u in updates:
            db.update("mkt", "instrument", f"ticker=eq.{u['ticker']}",
                      {k: v for k, v in u.items() if k != "ticker" and v})
            written += 1
        time.sleep(sleep)
    return written


def name_map() -> dict[str, str]:
    """ticker -> matchable short name, for news/calendar routing."""
    rows = db.select("mkt", "instrument", "select=ticker,name&active=eq.true")
    out = {}
    for r in rows:
        sn = short_name(r.get("name") or "")
        if len(sn) >= 4:
            out[r["ticker"]] = sn
    return out
