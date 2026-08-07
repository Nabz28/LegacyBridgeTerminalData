"""Cross-desk factor structure: what is actually driving all 23 desks at once.

A correlation matrix of desk baskets plus a PCA tells you how many independent
bets exist in the universe right now. Comparing the 60-day structure with the
252-day structure tells you whether correlations are converging, which is what
happens before drawdowns.

    python pipeline/cross_desk.py <outfile.json>
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


def desk_returns(days: int = 500) -> pd.DataFrame:
    desks = db.select("research", "desk", "select=id,name,basket,tickers&active=eq.true&order=sort_order")
    cols = {}
    for d in desks:
        tks = [t for t in d["tickers"][: stats.BASKET_N] if not t.startswith("^") and "=" not in t]
        idx = stats.basket_index(tks, days=days)
        if len(idx) > 120:
            cols[d["id"]] = idx.pct_change(fill_method=None)
    return pd.DataFrame(cols).dropna(how="all")


def pca(df: pd.DataFrame, n: int = 5):
    x = df.dropna(how="any")
    if x.shape[0] < 40 or x.shape[1] < 3:
        return None
    z = (x - x.mean()) / x.std().replace(0, np.nan)
    z = z.dropna(axis=1, how="any")
    u, s, vt = np.linalg.svd(z.values, full_matrices=False)
    var = s ** 2
    expl = var / var.sum()
    return {
        "n_obs": int(x.shape[0]), "n_desks": int(z.shape[1]),
        "explained": [round(float(e), 4) for e in expl[:n]],
        "cumulative": [round(float(c), 4) for c in np.cumsum(expl)[:n]],
        "loadings": [
            {"factor": i + 1,
             "explains_pct": round(float(expl[i]) * 100, 1),
             "top_positive": sorted(
                 [{"desk": c, "loading": round(float(vt[i][j]), 3)} for j, c in enumerate(z.columns)],
                 key=lambda r: -r["loading"])[:6],
             "top_negative": sorted(
                 [{"desk": c, "loading": round(float(vt[i][j]), 3)} for j, c in enumerate(z.columns)],
                 key=lambda r: r["loading"])[:6]}
            for i in range(min(n, len(expl)))
        ],
    }


def main(outfile: str):
    rets = desk_returns()
    print(f"desk return series: {rets.shape[1]} desks, {rets.shape[0]} sessions")

    short = rets.tail(60).dropna(axis=1, how="all")
    long = rets.tail(252).dropna(axis=1, how="all")

    c_short = short.corr()
    c_long = long.corr()

    def avg_offdiag(c):
        v = c.values.copy()
        np.fill_diagonal(v, np.nan)
        return round(float(np.nanmean(v)), 4)

    # most and least correlated pairs over 60d
    pairs = []
    cols = list(c_short.columns)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            v = c_short.iloc[i, j]
            if pd.notna(v):
                pairs.append({"a": cols[i], "b": cols[j], "corr_60d": round(float(v), 3),
                              "corr_252d": round(float(c_long.iloc[i, j]), 3) if cols[i] in c_long and cols[j] in c_long else None})
    pairs.sort(key=lambda p: -p["corr_60d"])

    # correlation regime: is the average pair correlation rising?
    roll = []
    for w in (252, 126, 60, 21):
        sub = rets.tail(w).dropna(axis=1, how="all")
        if sub.shape[0] >= 20:
            roll.append({"window_sessions": w, "avg_pair_corr": avg_offdiag(sub.corr())})

    # per-desk: correlation to the universe mean (how much is it just beta)
    uni = rets.mean(axis=1)
    beta_rows = []
    for c in rets.columns:
        s = rets[c].tail(126)
        u = uni.tail(126)
        df2 = pd.concat([s.rename("d"), u.rename("u")], axis=1).dropna()
        if len(df2) < 40:
            continue
        corr = float(df2["d"].corr(df2["u"]))
        beta = float(np.polyfit(df2["u"], df2["d"], 1)[0])
        beta_rows.append({"desk": c, "corr_to_universe_126d": round(corr, 3),
                          "beta_to_universe_126d": round(beta, 2),
                          "idiosyncratic_share_pct": round((1 - corr ** 2) * 100, 1)})
    beta_rows.sort(key=lambda r: r["corr_to_universe_126d"])

    out = {
        "generated": dt.date.today().isoformat(),
        "universe": {"desks": int(rets.shape[1]), "sessions": int(rets.shape[0])},
        "avg_pair_correlation": {"60d": avg_offdiag(c_short), "252d": avg_offdiag(c_long)},
        "correlation_by_window": roll,
        "pca_60d": pca(short),
        "pca_252d": pca(long),
        "most_correlated_pairs_60d": pairs[:15],
        "least_correlated_pairs_60d": pairs[-15:],
        "desk_beta_to_universe": beta_rows,
        "interpretation_notes": [
            "avg_pair_correlation rising between the 252d and 60d windows means the universe is "
            "converging: apparent diversification across desks is decaying into one bet.",
            "pca explained[0] is the share of all desk variance driven by a single common factor. "
            "Above roughly 40 percent the desk structure is mostly one macro factor.",
            "idiosyncratic_share_pct is how much of a desk's movement is its own story rather than "
            "the universe. High values mark the desks where stock and sector selection can pay.",
        ],
    }
    Path(outfile).write_text(json.dumps(out, indent=1), encoding="utf-8")

    print(f"\navg pair corr: 252d={out['avg_pair_correlation']['252d']} -> 60d={out['avg_pair_correlation']['60d']}")
    if out["pca_60d"]:
        print(f"PCA 60d: factor1 explains {out['pca_60d']['explained'][0]:.1%}, "
              f"top3 cumulative {out['pca_60d']['cumulative'][2]:.1%}")
        f1 = out["pca_60d"]["loadings"][0]
        print("  factor1 +:", ", ".join(f"{x['desk']}({x['loading']})" for x in f1["top_positive"][:4]))
        print("  factor1 -:", ", ".join(f"{x['desk']}({x['loading']})" for x in f1["top_negative"][:4]))
    print("\nmost idiosyncratic desks:", ", ".join(
        f"{r['desk']}({r['idiosyncratic_share_pct']}%)" for r in beta_rows[:5]))
    print(f"written to {outfile}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "cross_desk.json")
