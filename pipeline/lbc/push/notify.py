"""The judgement layer: decides what is worth interrupting the CRO for.

Every push candidate is scored on four things: does it touch an open position,
is it a change rather than a level, how verified is it, and has something like
it been said recently. Tiers: silent (stays in the brief), notify (a message),
interrupt (a message that could not wait). Default hard toward silent — nothing
erodes trust faster than being told the same thing three days running.

Every actual send is recorded in research.push_log so the agent knows what it
already told him.
"""
from __future__ import annotations

import datetime as dt

from .. import db

# mirror of ASSURANCE_TIER in api/_research/core.js — keep the two in sync
ASSURANCE_TIER = {
    "adversarially_verified": "verified", "verified_full_history": "verified",
    "challenged_survived": "verified", "verified_by_desk": "verified",
    "verified": "verified", "verified_and_fixed": "verified",
    "resolved_investigation": "verified",
    "verified_corrected": "corrected", "challenged_corrected": "corrected",
    "computed": "computed", "process_observation": "computed",
}

CHANGE_KINDS = {"regime_flip", "stance_change", "momentum_flip", "book_risk"}

INTERRUPT_AT = 1.25
NOTIFY_AT = 1.00


def log_push(tier: str, kind: str, ref: str | None, headline: str,
             chat_ids: list[str] | None = None, payload: dict | None = None) -> None:
    """Record a delivered push. Best-effort: a logging failure must never
    unsend a message that already went out."""
    try:
        db.insert("research", "push_log", [{
            "channel": "telegram", "tier": tier, "kind": kind,
            "ref": str(ref) if ref is not None else None,
            "headline": (headline or "")[:300],
            "chat_ids": chat_ids or [], "payload": payload or {},
        }])
    except Exception as e:
        print(f"push_log write failed (non-fatal): {e}")


def recent_pushes(days: int = 3) -> list[dict]:
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).isoformat()
    try:
        return db.select("research", "push_log",
                         f"select=kind,ref,headline,payload,sent_at&sent_at=gte.{since}"
                         f"&order=sent_at.desc", limit=200)
    except Exception:
        return []


def book_exposure() -> tuple[set, set]:
    """(desk_ids with an open position in their basket, base tickers held)."""
    tickers: set = set()
    desks: set = set()
    try:
        pos = db.select("asset_mgmt", "positions", "select=symbol&status=eq.open")
        tickers = {str(p["symbol"]).upper().split(".")[0] for p in pos}
        for d in db.select("research", "desk", "select=id,tickers&active=eq.true"):
            base = {str(t).upper().split(".")[0] for t in (d.get("tickers") or [])}
            if base & tickers:
                desks.add(d["id"])
    except Exception as e:
        print(f"book_exposure unavailable: {e}")
    return desks, tickers


def score_signal(sig: dict, book_desks: set, book_tickers: set,
                 recent: list[dict]) -> tuple[float, str]:
    """Score one push candidate; returns (score, tier)."""
    p = sig.get("payload") or {}
    score = (sig.get("salience") or 0) / 100.0

    ref_base = str(sig.get("ref") or "").upper().split(".")[0]
    if sig.get("desk_id") in book_desks or (ref_base and ref_base in book_tickers):
        score += 0.30                                   # touches an open position

    if sig.get("kind") in CHANGE_KINDS:
        score += 0.20                                   # a change, not a level

    tier_of = ASSURANCE_TIER.get(p.get("assurance", ""), "unverified")
    score += {"verified": 0.15, "corrected": 0.10,
              "computed": 0.0}.get(tier_of, -0.10)      # how well established

    said_recently = any(
        r.get("kind") == "signal"
        and (r.get("payload") or {}).get("desk_id") == sig.get("desk_id")
        and (r.get("payload") or {}).get("signal_kind") == sig.get("kind")
        for r in recent)
    if said_recently:
        score -= 0.50                                   # he has heard this already

    tier = ("interrupt" if score >= INTERRUPT_AT
            else "notify" if score >= NOTIFY_AT
            else "silent")
    return round(score, 3), tier
