"""The Editor: rank everything across 23 desks, keep at most 5 CHANGED items,
2 DECIDE questions, 1 BLIND declaration. Caps enforced in code, not prompt."""
from __future__ import annotations

import datetime as dt
import json

from . import llm
from .. import db

SYSTEM = """You are the editor of a one-page daily brief for the CRO of a small
asset manager. Input: candidate items from 23 desk agents, the global regime,
the book state (positions, P&L, factor concentration), and high-salience raw
signals. Choose ruthlessly. Priorities, in order:
1) anything touching an open position (cut-loss/stop proximity, thesis damage)
2) regime changes
3) relationship breaks (basket stopped tracking its driver)
4) positioning extremes / crowding
5) everything else by salience and novelty. Drop repeats of recent days.

Output JSON:
{"changed": [{"text": "item text, <=200 chars, concrete numbers, no leading numbering",
              "desk_id": "...", "signal_ids": [...]}],
 "decide": [{"text": "a decision question for the CRO, <=140 chars", "desk_id": "..."}],
 "blind": "1-2 sentences: where the system is blind today and what local
           knowledge the CRO must supply. Be specific to today's items.",
 "regime_line": "one line summarizing the global regime read",
 "book_line": "one line: positions count, MTD if available, top risk"}
Max 5 changed, max 2 decide. Fewer is better on quiet days. No em dashes."""


def run(desk_outputs: list[dict], today: str | None = None) -> dict:
    today = today or dt.date.today().isoformat()
    model = llm.get_model("editor")
    regime = db.get_config("global_regime", {})
    book = db.get_config("book_state", {})
    since = (dt.date.fromisoformat(today) - dt.timedelta(days=1)).isoformat()
    top_signals = db.select("research", "signal",
                            f"select=id,desk_id,kind,headline,salience,direction"
                            f"&asof=gte.{since}&order=salience.desc", limit=25)
    recent_briefs = db.select("research", "brief",
                              "select=asof,items&kind=eq.morning&order=asof.desc", limit=3)
    payload = {
        "date": today,
        "global_regime": regime,
        "book": book,
        "desk_candidates": [
            {"desk_id": o["desk_id"], "desk_name": o.get("desk_name"),
             "what_changed": o.get("what_changed"),
             "candidates": o.get("brief_candidates", []),
             "thesis_flags": o.get("thesis_flags", [])}
            for o in desk_outputs if o.get("brief_candidates") or o.get("thesis_flags")
        ],
        "top_signals": top_signals,
        "recent_brief_items": [b.get("items") for b in recent_briefs],
    }
    out, usage = llm.chat_json(model, SYSTEM, json.dumps(payload, default=str),
                               max_tokens=1800)
    llm.log("editor", None, model, usage, output=out)

    caps = db.get_config("brief_caps", {"changed": 5, "decide": 2, "blind": 1})
    out["changed"] = (out.get("changed") or [])[: caps.get("changed", 5)]
    out["decide"] = (out.get("decide") or [])[: caps.get("decide", 2)]
    out["blind"] = (out.get("blind") or "").strip()
    return out
