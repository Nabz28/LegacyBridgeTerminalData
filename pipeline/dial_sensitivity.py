"""Dial sensitivity: how much of each stance is a level statement versus momentum.

The nightly dial scores a desk on the LEVEL z-score of its drivers. That is
defensible for a driver where the level itself is the economics (a high oil price
is good for oil producers) but it carries no information about direction of
travel: a driver at a five-year high that has started rolling over scores
identically to one still rising.

This recomputes every dial three ways and reports which stances survive:
  level     the production score, z of the latest value vs its own history
  momentum  z of the driver's 63-period change, same direction and weights
  blend     0.5 level + 0.5 momentum

A desk whose stance flips between level and momentum is a desk whose call rests
entirely on which question you asked.

    python pipeline/dial_sensitivity.py <outfile.json>
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np

from lbc import db
from lbc.compute import stats


def stance_of(score: float) -> str:
    return "OW" if score >= 0.5 else ("UW" if score <= -0.5 else "N")


def main(outfile: str):
    desks = db.select("research", "desk", "select=id,name,basket&active=eq.true&order=sort_order")
    drivers = db.select("research", "driver", "select=*&active=eq.true")
    dials = {d["desk_id"]: d for d in db.select("research", "dial", "select=desk_id,machine_score,machine_stance")}
    by_desk = {}
    for d in drivers:
        by_desk.setdefault(d["desk_id"], []).append(d)

    rows = []
    for desk in desks:
        drvs = by_desk.get(desk["id"], [])
        lvl_c, mom_c, wsum, detail = [], [], 0.0, []
        for drv in drvs:
            s = stats.load_series(drv["series_key"])
            if s.empty:
                continue
            z_lvl = stats.zscore_latest(s)
            # rate of change: z of the 63-period (or 3-period for monthly) change
            per = 3 if stats.infer_freq(s) == "m" else 63
            chg = s.diff(per).dropna()
            z_mom = stats.zscore_latest(chg) if len(chg) > 30 else None
            if z_lvl is None:
                continue
            w, dirn = float(drv["weight"]), drv["direction"]
            wsum += abs(w)
            lc = float(np.clip(z_lvl, -2.5, 2.5)) * dirn * w
            lvl_c.append(lc)
            mc = None
            if z_mom is not None:
                mc = float(np.clip(z_mom, -2.5, 2.5)) * dirn * w
                mom_c.append(mc)
            detail.append({
                "driver": drv["label"], "series_key": drv["series_key"],
                "weight": w, "direction": dirn,
                "z_level": None if z_lvl is None else round(z_lvl, 2),
                "z_momentum_63p": None if z_mom is None else round(z_mom, 2),
                "contrib_level": round(lc, 3),
                "contrib_momentum": None if mc is None else round(mc, 3),
                "level_vs_momentum_disagree": bool(mc is not None and np.sign(lc) != np.sign(mc)),
            })
        if not lvl_c or wsum == 0:
            continue
        lvl = float(np.clip(sum(lvl_c) / wsum, -2, 2))
        mom = float(np.clip(sum(mom_c) / wsum, -2, 2)) if mom_c else None
        blend = float(np.clip((lvl + mom) / 2, -2, 2)) if mom is not None else lvl

        rows.append({
            "desk_id": desk["id"], "name": desk["name"], "basket": desk["basket"],
            "production_score": dials.get(desk["id"], {}).get("machine_score"),
            "production_stance": dials.get(desk["id"], {}).get("machine_stance"),
            "score_level": round(lvl, 3), "stance_level": stance_of(lvl),
            "score_momentum": None if mom is None else round(mom, 3),
            "stance_momentum": None if mom is None else stance_of(mom),
            "score_blend": round(blend, 3), "stance_blend": stance_of(blend),
            "stance_flips": bool(mom is not None and stance_of(lvl) != stance_of(mom)),
            "drivers": detail,
            "share_of_score_from_largest_driver": round(
                max(abs(c) for c in lvl_c) / max(1e-9, sum(abs(c) for c in lvl_c)), 3),
        })

    flips = [r for r in rows if r["stance_flips"]]
    concentrated = sorted(rows, key=lambda r: -r["share_of_score_from_largest_driver"])[:8]

    out = {
        "generated": dt.date.today().isoformat(),
        "method": "Each dial recomputed with driver level z-scores (the production method), with "
                  "z-scores of the driver's 63-period change, and with a 50/50 blend. Same "
                  "directions and weights throughout, so the only variable is level versus "
                  "rate of change.",
        "n_desks": len(rows),
        "n_stance_flips": len(flips),
        "stance_flips": flips,
        "most_concentrated_scores": [
            {"desk_id": r["desk_id"], "name": r["name"],
             "share_from_largest_driver": r["share_of_score_from_largest_driver"],
             "production_stance": r["production_stance"],
             "largest_driver": max(r["drivers"], key=lambda d: abs(d["contrib_level"]))["driver"]}
            for r in concentrated],
        "all": rows,
        "reading_guide": [
            "stance_flips lists desks whose call reverses when you score direction of travel "
            "instead of level. Those stances are an artefact of the scoring choice, not a view.",
            "share_of_score_from_largest_driver above roughly 0.5 means the dial is effectively a "
            "single-driver model wearing four drivers.",
            "level scoring is correct where the level is the economics (a high oil price helps "
            "producers) and misleading where the driver trends structurally.",
        ],
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"desks scored: {len(rows)}   stance flips under momentum scoring: {len(flips)}")
    print(f"\n{'DESK':<26}{'PROD':>6}{'LEVEL':>8}{'MOM':>8}{'BLEND':>8}  FLIP")
    for r in sorted(rows, key=lambda x: -(x["score_level"])):
        fl = "  <-- FLIPS" if r["stance_flips"] else ""
        print(f"{r['desk_id']:<26}{str(r['production_stance']):>6}"
              f"{r['score_level']:>8.2f}{(r['score_momentum'] if r['score_momentum'] is not None else float('nan')):>8.2f}"
              f"{r['score_blend']:>8.2f}  {r['stance_level']}/{r['stance_momentum']}{fl}")
    print("\nmost single-driver-dependent dials:")
    for r in out["most_concentrated_scores"][:5]:
        print(f"  {r['desk_id']:<24} {r['share_from_largest_driver']:.0%} from {r['largest_driver']}")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dial_sensitivity.json")
