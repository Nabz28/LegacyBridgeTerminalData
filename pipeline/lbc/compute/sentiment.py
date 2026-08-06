"""Per-desk news sentiment and volume anomaly, written nightly.

Sentiment alone is weak; the volume z-score is the part that carries signal.
Both are stored so the brief can say "unusual attention plus negative tone".
"""
from __future__ import annotations

import datetime as dt

import numpy as np

from .. import db


def run(today: str | None = None, window_days: int = 3, history_days: int = 90) -> int:
    today = today or dt.date.today().isoformat()
    day = dt.date.fromisoformat(today)
    since_hist = (day - dt.timedelta(days=history_days)).isoformat()

    rows = db.select("research", "news",
                     f"select=published_at,desk_ids,sentiment,headline,importance"
                     f"&published_at=gte.{since_hist}&order=published_at.desc", limit=None)
    if not rows:
        return 0

    desks = [d["id"] for d in db.select("research", "desk", "select=id&active=eq.true")]
    # daily buckets per desk
    by_desk: dict[str, dict[str, list]] = {d: {} for d in desks}
    for r in rows:
        d_key = str(r["published_at"])[:10]
        for desk in (r.get("desk_ids") or []):
            if desk in by_desk:
                by_desk[desk].setdefault(d_key, []).append(r)

    out, signals = [], []
    window_start = (day - dt.timedelta(days=window_days)).isoformat()
    for desk, days in by_desk.items():
        recent = [r for k, v in days.items() if k >= window_start for r in v]
        counts = [len(v) for v in days.values()]
        if not recent:
            continue
        sents = [float(r["sentiment"]) for r in recent if r.get("sentiment") is not None]
        mean_sent = float(np.mean(sents)) if sents else None

        hist_sent = [float(r["sentiment"]) for k, v in days.items() if k < window_start
                     for r in v if r.get("sentiment") is not None]
        sent_z = None
        if mean_sent is not None and len(hist_sent) >= 20:
            sd = float(np.std(hist_sent))
            if sd > 0:
                sent_z = round((mean_sent - float(np.mean(hist_sent))) / sd, 2)

        vol_z = None
        if len(counts) >= 10:
            today_count = len(days.get(today, []))
            sd = float(np.std(counts))
            if sd > 0:
                vol_z = round((today_count - float(np.mean(counts))) / sd, 2)

        top = max(recent, key=lambda r: (r.get("importance") or 0))
        out.append({
            "desk_id": desk, "asof": today, "news_count": len(recent),
            "sentiment": None if mean_sent is None else round(mean_sent, 3),
            "sent_z": sent_z, "vol_z": vol_z,
            "top_headline": (top.get("headline") or "")[:300],
        })

        # signal: unusual attention, or a sharp tone shift
        if vol_z is not None and vol_z >= 2.5:
            signals.append({
                "asof": today, "desk_id": desk, "kind": "news_anomaly",
                "ref": f"news:{desk}",
                "headline": f"News volume on {desk} at {vol_z:.1f} sigma above normal"
                            + (f", tone {mean_sent:+.2f}" if mean_sent is not None else ""),
                "payload": {"vol_z": vol_z, "sentiment": mean_sent,
                            "top_headline": top.get("headline", "")[:200]},
                "salience": int(min(80, 45 + vol_z * 8)), "direction": 0,
                "dedupe_key": f"news_vol:{desk}",
            })
        if sent_z is not None and abs(sent_z) >= 2.0 and len(recent) >= 5:
            signals.append({
                "asof": today, "desk_id": desk, "kind": "news_sentiment",
                "ref": f"news:{desk}",
                "headline": f"News tone on {desk} swung {sent_z:+.1f} sigma "
                            f"({'positive' if sent_z > 0 else 'negative'}) over {window_days}d",
                "payload": {"sent_z": sent_z, "sentiment": mean_sent, "n": len(recent),
                            "top_headline": top.get("headline", "")[:200]},
                "salience": int(min(75, 40 + abs(sent_z) * 8)),
                "direction": 1 if sent_z > 0 else -1,
                "dedupe_key": f"news_sent:{desk}",
            })

    if out:
        db.upsert("research", "desk_sentiment", out, on_conflict="desk_id,asof")
    if signals:
        graveyard = {(g["kind"], g["desk_id"])
                     for g in db.select("research", "graveyard", "select=kind,desk_id")}
        live = [s for s in signals if (s["kind"], s["desk_id"]) not in graveyard]
        if live:
            db.upsert("research", "signal", live, on_conflict="dedupe_key,asof")
    return len(out)
