"""The audit loop: score every directional signal against forward basket
returns at +5d and +21d; retire signal kinds whose hit rate collapses."""
from __future__ import annotations

import datetime as dt

from ..compute import stats
from .. import db

HORIZONS = (5, 21)


def _forward_return(desk_tickers: list[str], ref_ticker: str | None,
                    asof: str, horizon: int) -> float | None:
    """Forward return of the named ticker if it looks like an equity, else the
    desk basket, from asof to asof+horizon trading days."""
    series = None
    if ref_ticker and ("." in ref_ticker or ref_ticker.isupper()) and "=" not in ref_ticker \
            and not ref_ticker.startswith(("us.", "cmd.", "fx.", "idx.", "pos.", "news.", "id.", "tw.", "eu.", "crypto.")):
        s = stats.load_close(ref_ticker, days=200)
        if len(s) > 10:
            series = s
    if series is None and desk_tickers:
        series = stats.basket_index(desk_tickers[:10], days=200)
    if series is None or series.empty:
        return None
    idx = series.index[series.index >= asof]
    if len(idx) < horizon + 1:
        return None
    start, end = series.loc[idx[0]], series.loc[idx[horizon]]
    if not start:
        return None
    return float(end / start - 1)


def score_signals(today: str | None = None) -> int:
    today = dt.date.fromisoformat(today) if today else dt.date.today()
    desks = {d["id"]: d for d in db.select("research", "desk", "select=id,tickers")}
    scored = 0
    for horizon in HORIZONS:
        target_day = (today - dt.timedelta(days=horizon + horizon // 2 + 4)).isoformat()
        candidates = db.select(
            "research", "signal",
            f"select=id,desk_id,ref,direction,asof&asof=gte.{target_day}"
            f"&asof=lte.{(today - dt.timedelta(days=horizon)).isoformat()}"
            f"&direction=neq.0&order=asof.asc", limit=300)
        existing = {(r["signal_id"], horizon) for r in db.select(
            "research", "signal_score", f"select=signal_id&horizon_days=eq.{horizon}", limit=None)}
        for sig in candidates:
            if (sig["id"], horizon) in existing:
                continue
            desk = desks.get(sig["desk_id"]) or {}
            fwd = _forward_return(desk.get("tickers", []), sig.get("ref"), sig["asof"], horizon)
            if fwd is None:
                continue
            hit = (fwd > 0) == (sig["direction"] > 0)
            db.upsert("research", "signal_score", [{
                "signal_id": sig["id"], "horizon_days": horizon,
                "realized_ret": round(fwd, 5), "hit": hit,
            }], on_conflict="signal_id,horizon_days")
            scored += 1
    return scored


def update_graveyard() -> int:
    """Retire (kind, desk) combos with hit rate < threshold over trailing n>=min_n."""
    rule = db.get_config("graveyard_rule", {"min_n": 20, "hit_rate_below": 0.45})
    rows = db.select("research", "signal",
                     "select=id,kind,desk_id&direction=neq.0&order=id.desc", limit=2000)
    scores = db.select("research", "signal_score",
                       "select=signal_id,hit&horizon_days=eq.5", limit=None)
    hit_by_id = {s["signal_id"]: s["hit"] for s in scores}
    stats_by_combo: dict[tuple, list[bool]] = {}
    for r in rows:
        h = hit_by_id.get(r["id"])
        if h is None:
            continue
        stats_by_combo.setdefault((r["kind"], r["desk_id"]), []).append(h)
    retired = 0
    for (kind, desk_id), hits in stats_by_combo.items():
        recent = hits[: rule["min_n"]]
        if len(recent) >= rule["min_n"]:
            rate = sum(recent) / len(recent)
            if rate < rule["hit_rate_below"]:
                db.upsert("research", "graveyard", [{
                    "kind": kind, "desk_id": desk_id, "hit_rate": round(rate, 3),
                    "n_obs": len(recent),
                    "reason": f"hit rate {rate:.0%} over last {len(recent)} scored signals",
                }], on_conflict="kind,desk_id")
                retired += 1
    return retired


def scoreboard() -> dict:
    """Aggregate hit rates by kind for the weekly/monthly packet."""
    rows = db.select("research", "signal", "select=id,kind&direction=neq.0", limit=2000)
    scores = db.select("research", "signal_score", "select=signal_id,horizon_days,hit,realized_ret", limit=None)
    kind_by_id = {r["id"]: r["kind"] for r in rows}
    agg: dict[str, dict] = {}
    for s in scores:
        kind = kind_by_id.get(s["signal_id"])
        if not kind:
            continue
        a = agg.setdefault(f"{kind}_h{s['horizon_days']}", {"n": 0, "hits": 0, "sum_ret": 0.0})
        a["n"] += 1
        a["hits"] += 1 if s["hit"] else 0
        a["sum_ret"] += s["realized_ret"] or 0
    return {k: {"n": v["n"], "hit_rate": round(v["hits"] / v["n"], 3) if v["n"] else None,
                "avg_ret": round(v["sum_ret"] / v["n"], 4) if v["n"] else None}
            for k, v in agg.items()}
