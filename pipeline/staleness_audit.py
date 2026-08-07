"""Staleness audit: how much of each stance rests on data that has not moved.

The dial weights every driver the same way regardless of when it last printed.
A monthly series 67 days old contributes exactly as much as a price that traded
this morning, so a desk can carry conviction 4 on a number that predates the
quarter. This recomputes every score with the stale drivers removed and reports
what survives.

    python pipeline/staleness_audit.py <outfile.json>
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


def stance_of(s: float) -> str:
    return "OW" if s >= 0.5 else ("UW" if s <= -0.5 else "N")


def main(outfile: str, stale_days: int = 35):
    today = dt.date.today()
    desks = db.select("research", "desk", "select=id,name,basket&active=eq.true&order=sort_order")
    drivers = db.select("research", "driver", "select=*&active=eq.true")
    dials = {d["desk_id"]: d for d in db.select("research", "dial", "select=desk_id,machine_score,machine_stance,conviction")}
    by_desk = {}
    for d in drivers:
        by_desk.setdefault(d["desk_id"], []).append(d)

    rows = []
    for desk in desks:
        contribs, fresh_contribs, wsum, fresh_wsum, detail = [], [], 0.0, 0.0, []
        for drv in by_desk.get(desk["id"], []):
            s = stats.load_series(drv["series_key"])
            if s.empty:
                continue
            z = stats.zscore_latest(s)
            if z is None:
                continue
            age = (today - s.index[-1].date()).days
            w, dirn = float(drv["weight"]), drv["direction"]
            c = float(np.clip(z, -2.5, 2.5)) * dirn * w
            contribs.append(c)
            wsum += abs(w)
            is_stale = age > stale_days
            if not is_stale:
                fresh_contribs.append(c)
                fresh_wsum += abs(w)
            detail.append({
                "driver": drv["label"], "series_key": drv["series_key"],
                "as_of": s.index[-1].date().isoformat(), "age_days": age,
                "freq": stats.infer_freq(s), "weight": w, "z": round(z, 2),
                "contribution": round(c, 3), "stale": is_stale,
            })
        if not contribs:
            continue
        full = float(np.clip(sum(contribs) / (wsum or 1), -2, 2))
        fresh = float(np.clip(sum(fresh_contribs) / (fresh_wsum or 1), -2, 2)) if fresh_contribs else None
        gross = sum(abs(c) for c in contribs) or 1
        stale_share = sum(abs(d["contribution"]) for d in detail if d["stale"]) / gross
        biggest = max(detail, key=lambda d: abs(d["contribution"])) if detail else None

        rows.append({
            "desk_id": desk["id"], "name": desk["name"], "basket": desk["basket"],
            "production_score": dials.get(desk["id"], {}).get("machine_score"),
            "production_stance": dials.get(desk["id"], {}).get("machine_stance"),
            "conviction": dials.get(desk["id"], {}).get("conviction"),
            "score_all_drivers": round(full, 3), "stance_all": stance_of(full),
            "score_fresh_only": None if fresh is None else round(fresh, 3),
            "stance_fresh_only": None if fresh is None else stance_of(fresh),
            "stance_survives": bool(fresh is not None and stance_of(full) == stance_of(fresh)),
            "stale_share_of_gross_contribution": round(stale_share, 3),
            "n_stale_drivers": sum(1 for d in detail if d["stale"]),
            "n_drivers": len(detail),
            "largest_driver": biggest["driver"] if biggest else None,
            "largest_driver_share": round(abs(biggest["contribution"]) / gross, 3) if biggest else None,
            "largest_driver_age_days": biggest["age_days"] if biggest else None,
            "drivers": detail,
        })

    broken = [r for r in rows if not r["stance_survives"] and r["score_fresh_only"] is not None]
    heavy = sorted(rows, key=lambda r: -r["stale_share_of_gross_contribution"])

    out = {
        "generated": today.isoformat(),
        "stale_threshold_days": stale_days,
        "method": f"A driver is stale if its latest observation is more than {stale_days} days old. "
                  "Scores recomputed with stale drivers dropped and weights renormalised, so the "
                  "comparison isolates what the currently observable data supports.",
        "n_desks": len(rows),
        "n_stances_that_do_not_survive": len(broken),
        "stances_that_do_not_survive": [
            {k: r[k] for k in ("desk_id", "name", "production_stance", "conviction",
                               "score_all_drivers", "stance_all", "score_fresh_only",
                               "stance_fresh_only", "stale_share_of_gross_contribution",
                               "largest_driver", "largest_driver_age_days")}
            for r in broken],
        "most_stale_dependent": [
            {k: r[k] for k in ("desk_id", "name", "production_stance",
                               "stale_share_of_gross_contribution", "n_stale_drivers",
                               "largest_driver", "largest_driver_age_days")}
            for r in heavy[:10]],
        "all": rows,
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"desks: {len(rows)}   stances that do not survive dropping stale drivers: {len(broken)}")
    print(f"\n{'DESK':<26}{'PROD':>5}{'ALL':>8}{'FRESH':>8}  STALE SHARE  LARGEST DRIVER (age)")
    for r in sorted(rows, key=lambda x: -x["stale_share_of_gross_contribution"]):
        fs = r["score_fresh_only"]
        mark = "  <-- COLLAPSES" if not r["stance_survives"] and fs is not None else ""
        print(f"{r['desk_id']:<26}{str(r['production_stance']):>5}{r['score_all_drivers']:>8.2f}"
              f"{(fs if fs is not None else float('nan')):>8.2f}"
              f"{r['stale_share_of_gross_contribution']:>12.0%}  "
              f"{(r['largest_driver'] or '')[:22]} ({r['largest_driver_age_days']}d){mark}")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "staleness.json")
