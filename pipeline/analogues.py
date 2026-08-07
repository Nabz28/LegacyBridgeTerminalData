"""Historical analogues: when did conditions last look like today, and what
happened next.

Builds a daily macro state vector (rates, curve, real rates, credit, volatility,
dollar, cyclical appetite), standardises it, and finds the historical dates whose
state is closest to today by Euclidean distance. Then reports the forward returns
that actually followed those dates.

This is descriptive, not predictive: a handful of analogues from five years of
data is a small sample and the report must say so. It is still more honest than
asserting a regime call with no historical grounding.

    python pipeline/analogues.py <outfile.json>
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd

from lbc.compute import stats

STATE = [
    ("us.rate.dgs10", "UST 10y"),
    ("us.rate.t10y2y", "10y-2y curve"),
    ("us.rate.real10", "real 10y"),
    ("us.credit.cond", "credit conditions"),
    ("us.vol.vix", "VIX"),
    ("us.fx.dxy", "dollar"),
    ("us.act.cyclical", "cyclical appetite"),
]

FORWARD = [
    ("idx.spx", "S&P 500"),
    ("idx.jkse", "Jakarta Composite"),
    ("cmd.gold", "Gold"),
    ("cmd.copper", "Copper"),
    ("cmd.oil.brent", "Brent"),
    ("us.rate.dgs10", "UST 10y (level chg)"),
]


def main(outfile: str):
    frames = {}
    for key, label in STATE:
        s = stats.load_series(key, days=2200)
        if len(s) > 200:
            frames[label] = s
    df = pd.DataFrame(frames).ffill().dropna()
    if len(df) < 300:
        Path(outfile).write_text(json.dumps({"error": "insufficient history", "rows": len(df)}), encoding="utf-8")
        print("insufficient history:", len(df))
        return

    z = (df - df.mean()) / df.std()
    today_vec = z.iloc[-1]

    # distance of every past date to today, excluding the last 90 sessions so
    # "yesterday" does not trivially win
    hist = z.iloc[:-90]
    dist = ((hist - today_vec) ** 2).sum(axis=1) ** 0.5
    ranked = dist.sort_values()

    # de-cluster: keep analogues at least 21 sessions apart
    picked = []
    for d in ranked.index:
        if all(abs((d - p).days) > 30 for p in picked):
            picked.append(d)
        if len(picked) >= 8:
            break

    fwd_series = {}
    for key, label in FORWARD:
        s = stats.load_series(key, days=2200)
        if len(s) > 200:
            fwd_series[label] = s

    analogues = []
    for d in picked:
        row = {"date": d.date().isoformat(), "distance": round(float(dist[d]), 3),
               "state": {c: round(float(df.loc[d, c]), 3) for c in df.columns},
               "forward": {}}
        for label, s in fwd_series.items():
            fwd = {}
            for horizon, n in (("1m", 21), ("3m", 63), ("6m", 126)):
                after = s[s.index > d]
                if len(after) > n:
                    base = float(s[s.index <= d].iloc[-1])
                    later = float(after.iloc[n])
                    if "level chg" in label:
                        fwd[horizon] = round(later - base, 2)
                    elif base:
                        fwd[horizon] = round((later / base - 1) * 100, 1)
            row["forward"][label] = fwd
        analogues.append(row)

    # aggregate the forward outcomes
    summary = {}
    for label in fwd_series:
        for horizon in ("1m", "3m", "6m"):
            vals = [a["forward"][label].get(horizon) for a in analogues
                    if a["forward"].get(label, {}).get(horizon) is not None]
            if vals:
                summary.setdefault(label, {})[horizon] = {
                    "median": round(float(np.median(vals)), 2),
                    "min": round(float(np.min(vals)), 2),
                    "max": round(float(np.max(vals)), 2),
                    "positive_share": round(float(np.mean([v > 0 for v in vals])), 2),
                    "n": len(vals),
                }

    out = {
        "generated": dt.date.today().isoformat(),
        "method": "Euclidean distance on a standardised 7-factor macro state vector; "
                  "analogues de-clustered to 30+ days apart; last 90 sessions excluded.",
        "history_span": [df.index[0].date().isoformat(), df.index[-1].date().isoformat()],
        "n_sessions": len(df),
        "today_state_z": {c: round(float(today_vec[c]), 3) for c in df.columns},
        "today_state_raw": {c: round(float(df.iloc[-1][c]), 4) for c in df.columns},
        "analogues": analogues,
        "forward_summary": summary,
        "caveats": [
            f"Only {len(df)} sessions of history, so analogues are drawn from a narrow window and "
            "cannot represent a full cycle.",
            "Small sample: a handful of overlapping historical episodes, not an independent sample.",
            "Descriptive only. Similar macro states have preceded very different outcomes.",
        ],
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print("today's state (z vs own 5y history):")
    for c, v in out["today_state_z"].items():
        print(f"  {c:<22} {v:+.2f}")
    print(f"\nclosest analogues ({len(analogues)}):")
    for a in analogues:
        spx = a["forward"].get("S&P 500", {})
        print(f"  {a['date']}  dist={a['distance']:.2f}  SPX fwd 1m={spx.get('1m')} 3m={spx.get('3m')} 6m={spx.get('6m')}")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "analogues.json")
