"""Nightly dial computation: driver stats -> machine score -> dial + signals."""
from __future__ import annotations

import datetime as dt

import numpy as np

from . import regime, stats
from .. import db


def _stance_from_score(score: float) -> str:
    if score >= 0.5:
        return "OW"
    if score <= -0.5:
        return "UW"
    return "N"


def compute_desk(desk: dict, drivers: list[dict], glob: dict, today: str):
    driver_stats, contribs, signals = [], [], []
    for drv in drivers:
        s = stats.load_series(drv["series_key"])
        if s.empty:
            driver_stats.append({
                "series_key": drv["series_key"], "label": drv["label"],
                "value": None, "z": None, "pctile": None,
                "direction": drv["direction"], "contrib": 0, "stale": True,
            })
            continue
        z = stats.zscore_latest(s)
        pct = stats.pctile_latest(s)
        zmove = stats.z_move(s, lookback=5)
        latest = float(s.iloc[-1])
        contrib = 0.0
        if z is not None:
            contrib = float(np.clip(z, -2.5, 2.5)) * drv["direction"] * float(drv["weight"])
            contribs.append(contrib)
        driver_stats.append({
            "series_key": drv["series_key"], "label": drv["label"],
            "value": round(latest, 4), "z": None if z is None else round(z, 2),
            "pctile": None if pct is None else round(pct, 1),
            "zmove5d": None if zmove is None else round(zmove, 2),
            "direction": drv["direction"], "weight": float(drv["weight"]),
            "contrib": round(contrib, 3),
            "last_date": s.index[-1].date().isoformat(),
        })
        # driver_move signal
        if zmove is not None and abs(zmove) >= 1.8:
            impact = drv["direction"] * (1 if zmove > 0 else -1)
            signals.append({
                "asof": today, "desk_id": desk["id"], "kind": "driver_move",
                "ref": drv["series_key"],
                "headline": f"{drv['label']} moved {zmove:+.1f} sigma in 5 sessions "
                            f"({'supports' if impact > 0 else 'pressures'} {desk['name']})",
                "payload": {"z_move_5d": round(zmove, 2), "latest": latest,
                            "pctile_12m": pct},
                "salience": int(min(90, 45 + abs(zmove) * 12)),
                "direction": impact,
                "dedupe_key": f"driver_move:{desk['id']}:{drv['series_key']}",
            })
        if pct is not None and (pct >= 97 or pct <= 3):
            side = "high" if pct >= 97 else "low"
            impact = drv["direction"] * (1 if pct >= 97 else -1)
            signals.append({
                "asof": today, "desk_id": desk["id"], "kind": "driver_move",
                "ref": drv["series_key"],
                "headline": f"{drv['label']} at 12-month {side} ({pct:.0f}th percentile)",
                "payload": {"pctile_12m": pct, "latest": latest},
                "salience": 55, "direction": impact,
                "dedupe_key": f"driver_extreme:{desk['id']}:{drv['series_key']}",
            })

    weight_sum = sum(abs(d.get("weight", 1)) for d in driver_stats if d.get("z") is not None) or 1
    score = float(np.clip(sum(contribs) / weight_sum, -2, 2)) if contribs else 0.0
    machine_stance = _stance_from_score(score)

    if desk["kind"] == "country":
        reg = regime.country_tag(desk["id"]) or glob["tag"]
    else:
        reg = glob["tag"]

    return score, machine_stance, reg, driver_stats, signals


def run(today: str | None = None) -> dict:
    today = today or dt.date.today().isoformat()
    glob = regime.global_regime()
    db.set_config("global_regime", glob)

    desks = db.select("research", "desk", "select=*&active=eq.true&order=sort_order")
    all_drivers = db.select("research", "driver", "select=*&active=eq.true")
    prior_dials = {d["desk_id"]: d for d in db.select("research", "dial", "select=*")}
    graveyard = {(g["kind"], g["desk_id"]) for g in db.select("research", "graveyard", "select=kind,desk_id")}

    n_signals = 0
    for desk in desks:
        drivers = [d for d in all_drivers if d["desk_id"] == desk["id"]]
        score, machine_stance, reg, driver_stats, signals = compute_desk(desk, drivers, glob, today)

        prior = prior_dials.get(desk["id"])
        prior_score = prior.get("machine_score") if prior else None
        prior_regime = prior.get("regime") if prior else None
        what_changed = ""
        if prior_score is not None and abs(score - float(prior_score)) >= 0.4:
            what_changed = f"machine score {float(prior_score):+.2f} -> {score:+.2f}"
        if prior_regime and reg != prior_regime:
            what_changed = (what_changed + "; " if what_changed else "") + f"regime -> {reg}"
            signals.append({
                "asof": today, "desk_id": desk["id"], "kind": "regime_flip",
                "ref": desk["id"],
                "headline": f"{desk['name']} regime changed: {prior_regime} -> {reg}",
                "payload": {"from": prior_regime, "to": reg},
                "salience": 75, "direction": 0,
                "dedupe_key": f"regime_flip:{desk['id']}",
            })
        # machine stance change signal
        prior_ms = prior.get("machine_stance") if prior else None
        if prior_ms and prior_ms != machine_stance:
            signals.append({
                "asof": today, "desk_id": desk["id"], "kind": "stance_change",
                "ref": desk["id"],
                "headline": f"{desk['name']} machine stance {prior_ms} -> {machine_stance} "
                            f"(score {score:+.2f})",
                "payload": {"from": prior_ms, "to": machine_stance, "score": score},
                "salience": 70, "direction": 1 if machine_stance == "OW" else (-1 if machine_stance == "UW" else 0),
                "dedupe_key": f"stance_change:{desk['id']}",
            })

        # preserve human stance overrides; machine fields always update
        stance_source = prior.get("stance_source", "machine") if prior else "machine"
        stance = prior["stance"] if (prior and stance_source == "human") else machine_stance
        conviction = prior["conviction"] if (prior and stance_source == "human") else (
            5 if abs(score) > 1.5 else (4 if abs(score) > 1.0 else (3 if abs(score) > 0.5 else 2)))

        dial_row = {
            "desk_id": desk["id"], "asof": today, "stance": stance, "conviction": conviction,
            "machine_score": round(score, 3), "machine_stance": machine_stance,
            "regime": reg, "drivers": driver_stats,
            "what_changed": what_changed or (prior.get("what_changed") if prior else ""),
            "stance_source": stance_source, "updated_by": "pipeline",
            "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        }
        db.upsert("research", "dial", [dial_row], on_conflict="desk_id")
        db.upsert("research", "dial_history", [{
            "desk_id": desk["id"], "asof": today, "stance": stance, "conviction": conviction,
            "machine_score": round(score, 3), "machine_stance": machine_stance, "regime": reg,
            "drivers": driver_stats, "what_changed": what_changed, "stance_source": stance_source,
        }], on_conflict="desk_id,asof")

        live = [s for s in signals if (s["kind"], s["desk_id"]) not in graveyard]
        if live:
            db.upsert("research", "signal", live, on_conflict="dedupe_key,asof")
            n_signals += len(live)

    return {"desks": len(desks), "signals": n_signals, "regime": glob["tag"]}
