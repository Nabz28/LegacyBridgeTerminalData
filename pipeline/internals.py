"""Market internals: breadth, dispersion and leadership across the universe.

Breadth says whether a market move is broad or carried by a handful of names.
Dispersion says whether selection is being rewarded. Both are computed from the
same price store the dials use, across every tracked instrument.

    python pipeline/internals.py <outfile.json>
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
    desks = db.select("research", "desk", "select=id,name,basket,kind,tickers&active=eq.true&order=sort_order")

    universe = {}
    for d in desks:
        for t in d["tickers"]:
            if not t.startswith("^") and "=" not in t:
                universe.setdefault(t, d["id"])

    px = {}
    for t in universe:
        s = stats.load_close(t, days=500)
        if len(s) >= 210:
            px[t] = s
    print(f"priced instruments: {len(px)} of {len(universe)}")

    rows = []
    for t, s in px.items():
        last = float(s.iloc[-1])
        ma50 = float(s.tail(50).mean())
        ma200 = float(s.tail(200).mean())
        hi52 = float(s.tail(252).max())
        lo52 = float(s.tail(252).min())
        def r(n):
            return None if len(s) <= n else float(s.iloc[-1] / s.iloc[-1 - n] - 1)
        rows.append({
            "ticker": t, "desk": universe[t], "last": last,
            "above_ma50": last > ma50, "above_ma200": last > ma200,
            "pct_from_52w_high": (last / hi52 - 1) if hi52 else None,
            "pct_off_52w_low": (last / lo52 - 1) if lo52 else None,
            "ret_21d": r(21), "ret_63d": r(63), "ret_252d": r(252),
            "vol_ann": float(s.pct_change(fill_method=None).tail(63).std() * np.sqrt(252)),
        })
    df = pd.DataFrame(rows)

    def breadth(sub: pd.DataFrame) -> dict:
        if sub.empty:
            return {}
        n = len(sub)
        r21 = sub["ret_21d"].dropna()
        return {
            "n": n,
            "pct_above_ma50": round(float(sub["above_ma50"].mean()) * 100, 1),
            "pct_above_ma200": round(float(sub["above_ma200"].mean()) * 100, 1),
            "pct_within_5pct_of_52w_high": round(float((sub["pct_from_52w_high"] > -0.05).mean()) * 100, 1),
            "pct_more_than_20pct_below_high": round(float((sub["pct_from_52w_high"] < -0.20).mean()) * 100, 1),
            "median_ret_21d_pct": round(float(r21.median()) * 100, 2) if len(r21) else None,
            "mean_ret_21d_pct": round(float(r21.mean()) * 100, 2) if len(r21) else None,
            "dispersion_21d_pct": round(float(r21.std()) * 100, 2) if len(r21) > 3 else None,
            "advance_decline_21d": (f"{int((r21 > 0).sum())} up / {int((r21 <= 0).sum())} down"
                                    if len(r21) else None),
        }

    overall = breadth(df)
    by_desk = {d["id"]: breadth(df[df["desk"] == d["id"]]) for d in desks}
    by_basket = {b: breadth(df[df["desk"].isin([d["id"] for d in desks if d["basket"] == b])])
                 for b in ("cyclical", "secular", "country")}

    # leadership and laggards across the whole universe
    lead = df.dropna(subset=["ret_63d"]).sort_values("ret_63d", ascending=False)
    # Concentration of performance. Dividing the top decile by the NET sum blows
    # up whenever winners and losers roughly cancel, so measure against the sum
    # of gains, which is stable and directly interpretable.
    r63 = df["ret_63d"].dropna()
    concentration = {}
    if len(r63) > 20:
        k = max(1, len(r63) // 10)
        gains = r63[r63 > 0].sum()
        concentration = {
            "top_decile_share_of_all_gains_pct": round(float(r63.nlargest(k).sum() / gains) * 100, 1) if gains else None,
            "top_decile_n": int(k),
            "share_of_names_positive_63d_pct": round(float((r63 > 0).mean()) * 100, 1),
            "median_63d_pct": round(float(r63.median()) * 100, 2),
            "mean_63d_pct": round(float(r63.mean()) * 100, 2),
            "mean_minus_median_pct": round(float(r63.mean() - r63.median()) * 100, 2),
        }

    out = {
        "generated": dt.date.today().isoformat(),
        "method": "Computed across every priced instrument in the 23 desk baskets. Breadth is the "
                  "share above moving averages; dispersion is the cross-sectional standard "
                  "deviation of 21-day returns, which is the honest measure of whether selection "
                  "is being paid.",
        "universe_size": len(df),
        "overall_breadth": overall,
        "breadth_by_basket": by_basket,
        "breadth_by_desk": by_desk,
        "performance_concentration": concentration | {
            "note": "top_decile_share_of_all_gains measures the share of total upside captured by "
                    "the best 10 percent of names. Above roughly 45 percent the advance is narrow. "
                    "mean_minus_median is the skew: a large positive gap means a few big winners "
                    "are pulling the average above what a typical holding earned.",
        },
        "leaders_63d": [{"ticker": r.ticker, "desk": r.desk,
                         "ret_63d_pct": round(r.ret_63d * 100, 1),
                         "pct_from_52w_high": round(r.pct_from_52w_high * 100, 1)}
                        for r in lead.head(15).itertuples()],
        "laggards_63d": [{"ticker": r.ticker, "desk": r.desk,
                          "ret_63d_pct": round(r.ret_63d * 100, 1),
                          "pct_from_52w_high": round(r.pct_from_52w_high * 100, 1)}
                         for r in lead.tail(15).itertuples()],
        "deep_drawdowns": [{"ticker": r.ticker, "desk": r.desk,
                            "pct_from_52w_high": round(r.pct_from_52w_high * 100, 1)}
                           for r in df.dropna(subset=["pct_from_52w_high"])
                           .sort_values("pct_from_52w_high").head(15).itertuples()],
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"\nOVERALL BREADTH ({overall['n']} names)")
    print(f"  above 50d MA: {overall['pct_above_ma50']}%   above 200d MA: {overall['pct_above_ma200']}%")
    print(f"  within 5% of 52w high: {overall['pct_within_5pct_of_52w_high']}%   >20% below: {overall['pct_more_than_20pct_below_high']}%")
    print(f"  21d median {overall['median_ret_21d_pct']}%  dispersion {overall['dispersion_21d_pct']}%  {overall['advance_decline_21d']}")
    print(f"  63d: {concentration.get('share_of_names_positive_63d_pct')}% of names positive, "
          f"top decile took {concentration.get('top_decile_share_of_all_gains_pct')}% of all gains, "
          f"mean-median skew {concentration.get('mean_minus_median_pct')}pp")
    print("\nby basket:")
    for b, v in by_basket.items():
        if v:
            print(f"  {b:<10} above200={v['pct_above_ma200']}%  median21d={v['median_ret_21d_pct']}%  disp={v['dispersion_21d_pct']}%")
    print(f"\nwritten to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "internals.json")
