"""Scenario analysis: empirical desk sensitivities to macro shocks.

Regresses each desk basket's daily returns on a set of macro factor returns over
a rolling window, then applies named shocks to the fitted betas. The betas are
estimated, not assumed, and the R-squared is reported alongside so a low-
explanatory-power desk is not presented as a precise sensitivity.

    python pipeline/scenarios.py <outfile.json>
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

FACTORS = [
    ("us.fx.dxy", "dollar"),
    ("us.rate.dgs10", "rates_10y"),
    ("cmd.oil.brent", "oil"),
    ("cmd.copper", "copper"),
    ("idx.csi300", "china_equity"),
    ("us.credit.cond", "credit"),
    ("idx.spx", "equity_beta"),
]

SCENARIOS = {
    "dollar_up_5pct": {"dollar": 0.05},
    "dollar_down_5pct": {"dollar": -0.05},
    "oil_down_20pct": {"oil": -0.20},
    "oil_up_20pct": {"oil": 0.20},
    "rates_up_50bp": {"rates_10y": 0.50 / 4.63},   # 50bp on a 4.63% yield
    "rates_down_50bp": {"rates_10y": -0.50 / 4.63},
    "china_down_10pct": {"china_equity": -0.10},
    "credit_stress": {"credit": -0.05, "equity_beta": -0.08},
    "risk_off_combo": {"equity_beta": -0.10, "dollar": 0.03, "credit": -0.04, "oil": -0.10},
    "reflation_combo": {"equity_beta": 0.06, "copper": 0.10, "oil": 0.10, "dollar": -0.03},
}


def factor_returns(days: int = 500) -> pd.DataFrame:
    cols = {}
    for key, name in FACTORS:
        s = stats.load_series(key, days=days)
        if len(s) > 120:
            # rates enter as level change scaled by level, everything else as returns
            cols[name] = s.diff() / s.shift(1) if "rate" in key else s.pct_change(fill_method=None)
    return pd.DataFrame(cols)


def main(outfile: str):
    facs = factor_returns()
    desks = db.select("research", "desk", "select=id,name,basket,tickers&active=eq.true&order=sort_order")
    book = db.get_config("book_state", {}) or {}

    rows = []
    for d in desks:
        tks = [t for t in d["tickers"][: stats.BASKET_N] if not t.startswith("^") and "=" not in t]
        idx = stats.basket_index(tks, days=500)
        if len(idx) < 150:
            continue
        y = idx.pct_change(fill_method=None).rename("y")
        df = pd.concat([y, facs], axis=1).dropna().tail(252)
        if len(df) < 100:
            continue
        X = df[[c for c in facs.columns if c in df.columns]].values
        yv = df["y"].values
        X1 = np.column_stack([np.ones(len(X)), X])
        try:
            beta, *_ = np.linalg.lstsq(X1, yv, rcond=None)
        except np.linalg.LinAlgError:
            continue
        pred = X1 @ beta
        ss_res = float(((yv - pred) ** 2).sum())
        ss_tot = float(((yv - yv.mean()) ** 2).sum())
        r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
        names = [c for c in facs.columns if c in df.columns]
        betas = {n: round(float(b), 3) for n, b in zip(names, beta[1:])}

        scen = {}
        for sname, shock in SCENARIOS.items():
            impact = sum(betas.get(f, 0.0) * mag for f, mag in shock.items())
            scen[sname] = round(impact * 100, 2)

        rows.append({
            "desk_id": d["id"], "name": d["name"], "basket": d["basket"],
            "r2_252d": round(r2, 3), "n_obs": len(df),
            "betas": betas,
            "scenario_impact_pct": scen,
        })

    # book-level: map open positions onto their desks where possible
    pos = book.get("positions", [])
    inst = {r["ticker"]: r["desk_id"] for r in db.select("mkt", "instrument", "select=ticker,desk_id")}
    by_desk = {r["desk_id"]: r for r in rows}
    book_scen = {s: 0.0 for s in SCENARIOS}
    mapped, unmapped = [], []
    nav = (book.get("nav") or {}).get("positions_value") or 0
    for p in pos:
        did = inst.get(p.get("ticker"))
        if did and did in by_desk:
            mapped.append({"symbol": p["symbol"], "desk": did})
            for s in SCENARIOS:
                book_scen[s] += by_desk[did]["scenario_impact_pct"][s] / max(1, len(pos))
        else:
            unmapped.append(p.get("symbol"))

    out = {
        "generated": dt.date.today().isoformat(),
        "method": "OLS of each desk basket's daily returns on 7 macro factor returns over the last "
                  "252 sessions. Shocks applied to fitted betas. r2_252d reports how much of the "
                  "desk's movement these factors actually explain: a low r2 means the scenario "
                  "numbers for that desk are not meaningful.",
        "factors": [n for _, n in FACTORS],
        "scenarios": SCENARIOS,
        "desks": sorted(rows, key=lambda r: -r["r2_252d"]),
        "book": {
            "equal_weighted_scenario_impact_pct": {k: round(v, 2) for k, v in book_scen.items()},
            "mapped_positions": mapped,
            "unmapped_positions": unmapped,
            "note": "Equal-weighted across mapped positions only; not NAV-weighted, and unmapped "
                    "names contribute nothing. Indicative direction, not a P&L estimate.",
        },
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"desks modelled: {len(rows)}")
    print("\nhighest explanatory power (macro factors explain most of the desk):")
    for r in out["desks"][:6]:
        print(f"  {r['desk_id']:<24} r2={r['r2_252d']:.2f}  "
              f"dollar={r['betas'].get('dollar')} oil={r['betas'].get('oil')} "
              f"rates={r['betas'].get('rates_10y')} spx={r['betas'].get('equity_beta')}")
    print("\nlowest (idiosyncratic, scenario numbers unreliable):")
    for r in out["desks"][-4:]:
        print(f"  {r['desk_id']:<24} r2={r['r2_252d']:.2f}")
    print("\nmost exposed to a risk-off combo:")
    ro = sorted(rows, key=lambda r: r["scenario_impact_pct"]["risk_off_combo"])
    for r in ro[:5]:
        print(f"  {r['desk_id']:<24} {r['scenario_impact_pct']['risk_off_combo']:+.1f}%  (r2 {r['r2_252d']:.2f})")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "scenarios.json")
