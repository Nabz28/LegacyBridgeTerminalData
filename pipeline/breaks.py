"""Relationship breaks: every desk basket against every one of its drivers.

The dial reduces a desk to a weighted score. That hides the case where a desk's
equities have stopped responding to the driver the dial is scoring them on. When
that happens the dial is measuring a relationship that no longer exists, which is
either the best opportunity on the board or a broken thesis.

    python pipeline/breaks.py <outfile.json>
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd

from lbc import db
from lbc.compute import stats


def main(outfile: str):
    desks = db.select("research", "desk", "select=id,name,basket,tickers&active=eq.true&order=sort_order")
    drivers = db.select("research", "driver", "select=desk_id,series_key,label,weight,direction&active=eq.true")
    by_desk = {}
    for d in drivers:
        by_desk.setdefault(d["desk_id"], []).append(d)

    rows = []
    for desk in desks:
        tks = [t for t in desk["tickers"][: stats.BASKET_N] if not t.startswith("^") and "=" not in t]
        basket = stats.basket_index(tks, days=600)
        if basket.empty or len(basket) < 260:
            continue
        for drv in by_desk.get(desk["id"], []):
            s = stats.load_series(drv["series_key"], days=600)
            if s.empty or len(s) < 120:
                continue
            cs, cl, broke = stats.rolling_corr_break(basket, s)
            if cs is None:
                continue
            # also measure raw divergence: 63d basket return vs 63d driver move
            b63 = stats.change(basket, 63)
            d63 = stats.change(s, 63) if stats.infer_freq(s) != "m" else stats.change(s, 3)
            rows.append({
                "desk_id": desk["id"], "desk": desk["name"], "basket_kind": desk["basket"],
                "driver": drv["label"], "series_key": drv["series_key"],
                "weight": float(drv["weight"]), "direction_for_desk": drv["direction"],
                "corr_60d": round(cs, 3), "corr_252d": round(cl, 3),
                "corr_change": round(cs - cl, 3),
                "broke": bool(broke),
                "basket_ret_63d_pct": None if b63 is None else round(b63 * 100, 1),
                "driver_chg_63p_pct": None if d63 is None else round(d63 * 100, 1),
            })

    broken = [r for r in rows if r["broke"]]
    # divergence: driver and basket moved meaningfully in opposite directions,
    # adjusted for the direction the driver is supposed to work in
    diverging = []
    for r in rows:
        b, d = r["basket_ret_63d_pct"], r["driver_chg_63p_pct"]
        if b is None or d is None:
            continue
        expected = d * r["direction_for_desk"]
        if abs(b) > 8 and abs(expected) > 5 and np.sign(b) != np.sign(expected):
            diverging.append({**r, "expected_direction_from_driver": round(expected, 1)})
    diverging.sort(key=lambda r: -(abs(r["basket_ret_63d_pct"]) + abs(r["expected_direction_from_driver"])))

    out = {
        "generated": dt.date.today().isoformat(),
        "method": "For each desk basket and each of its dial drivers: 60-day versus 252-day "
                  "correlation of returns, and the 63-day move of the basket against the "
                  "direction-adjusted move of the driver. 'broke' means the correlation weakened "
                  "in its own direction by more than 0.4 and either decayed below the threshold or "
                  "flipped sign.",
        "pairs_tested": len(rows),
        "broken_relationships": sorted(broken, key=lambda r: -abs(r["corr_change"])),
        "divergences": diverging[:20],
        "all_pairs": sorted(rows, key=lambda r: -abs(r["corr_change"])),
        "reading_guide": [
            "A break means the dial is scoring this desk on a relationship that has stopped "
            "holding. Treat the dial's contribution from that driver as unreliable until it "
            "re-establishes.",
            "A divergence with an intact correlation is different and more actionable: the "
            "relationship still holds on average but the two have pulled apart, which is the "
            "convergence trade.",
        ],
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"pairs tested: {len(rows)}")
    print(f"\nBROKEN RELATIONSHIPS ({len(broken)}):")
    for r in out["broken_relationships"]:
        print(f"  {r['desk_id']:<24} vs {r['driver']:<28} corr {r['corr_252d']:+.2f} -> {r['corr_60d']:+.2f}")
    print(f"\nLARGEST DIVERGENCES (driver says one thing, equities did another):")
    for r in diverging[:10]:
        print(f"  {r['desk_id']:<24} {r['driver']:<26} basket 63d {r['basket_ret_63d_pct']:+.1f}% "
              f"vs driver-implied {r['expected_direction_from_driver']:+.1f}% (corr60d {r['corr_60d']:+.2f})")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "breaks.json")
