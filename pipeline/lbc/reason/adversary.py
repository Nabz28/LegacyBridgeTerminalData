"""Weekly adversary: tries to kill every open thesis using the signal record."""
from __future__ import annotations

import datetime as dt
import json

from . import llm
from .. import db

SYSTEM = """You are the adversary. Your only job is to try to kill this
investment thesis using the evidence provided (driver stats, signals, price
action). You are rewarded for finding real cracks, not for being contrarian.

Output JSON:
{"verdict": "intact|wounded|dead",
 "confidence": 1-5,
 "evidence": ["each item cites a specific number/signal from the input"],
 "strongest_case_against": "2 sentences max",
 "what_would_confirm_death": "1 sentence"}
No em dashes."""


def run(today: str | None = None) -> int:
    today = today or dt.date.today().isoformat()
    model = llm.get_model("adversary")
    theses = db.select("research", "thesis", "select=*&status=in.(open,wounded)")
    n = 0
    for th in theses:
        desk_id = th["desk_id"]
        dial = db.select("research", "dial", f"select=*&desk_id=eq.{desk_id}")
        since = (dt.date.fromisoformat(today) - dt.timedelta(days=14)).isoformat()
        signals = db.select("research", "signal",
                            f"select=kind,headline,salience,direction,asof&desk_id=eq.{desk_id}"
                            f"&asof=gte.{since}&order=salience.desc", limit=15)
        payload = {"thesis": {k: th[k] for k in ("title", "body", "ticker", "entry",
                                                  "target", "stop", "horizon",
                                                  "invalidation", "macro_assumption", "status")},
                   "desk_dial": dial[0] if dial else None,
                   "recent_signals": signals}
        try:
            out, usage = llm.chat_json(model, SYSTEM, json.dumps(payload, default=str))
            llm.log("adversary", desk_id, model, usage, output=out)
        except llm.LlmError as e:
            llm.log("adversary", desk_id, model, {}, error=str(e))
            continue

        health = th.get("health") or {}
        verdicts = health.get("adversary", [])[-7:]
        verdicts.append({"date": today, **{k: out.get(k) for k in
                                           ("verdict", "confidence", "strongest_case_against",
                                            "what_would_confirm_death")}})
        health["adversary"] = verdicts
        patch = {"health": health, "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()}
        verdict = out.get("verdict")
        if verdict == "dead" and int(out.get("confidence", 0)) >= 4:
            patch["status"] = "invalidated"
            db.upsert("research", "signal", [{
                "asof": today, "desk_id": desk_id, "kind": "book_risk", "ref": th.get("ticker"),
                "headline": f"Adversary killed thesis '{th['title'][:60]}': "
                            f"{out.get('strongest_case_against', '')[:120]}",
                "payload": {"thesis_id": th["id"], "verdict": out},
                "salience": 90, "direction": -1,
                "dedupe_key": f"adversary_kill:{th['id']}",
            }], on_conflict="dedupe_key,asof")
        elif verdict == "wounded" and th["status"] == "open":
            patch["status"] = "wounded"
        db.update("research", "thesis", f"id=eq.{th['id']}", patch)
        n += 1
    return n
