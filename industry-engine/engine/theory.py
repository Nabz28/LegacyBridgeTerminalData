"""
theory.py — assemble the per-basket MODEL from validated drivers.

Combines statistics (estimated betas/IC) with the current state of each driver to
answer: is the industry bullish or bearish right now, WHY, HOW MUCH, and with what
CONFIDENCE. Adds a multivariate model (how much of the basket's monthly variance the
drivers jointly explain) and an expanding-window out-of-sample directional hit-rate.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

try:
    import statsmodels.api as sm
    HAVE_SM = True
except Exception:  # noqa: BLE001
    HAVE_SM = False

MAX_MV = 6          # cap drivers in the multivariate model (avoid overfit)
MIN_TRAIN = 60      # min months before first OOS prediction


def _posture(rec: dict) -> dict:
    """Current tailwind/headwind from the latest driver move × empirical sign."""
    z = rec.get("last_chg_z")
    emp = rec.get("emp_sign") or (1 if rec["pearson"] >= 0 else -1)
    if z is None:
        return {"posture": "neutral", "impulse": 0.0}
    direction = emp * (1 if rec["last_chg"] and rec["last_chg"] > 0 else
                       -1 if rec["last_chg"] and rec["last_chg"] < 0 else 0)
    impulse = direction * math.tanh(abs(z) / 2.0)     # bounded [-1,1]
    if abs(z) < 0.3 or direction == 0:
        lab = "neutral"
    else:
        lab = "tailwind" if direction > 0 else "headwind"
    return {"posture": lab, "impulse": round(impulse, 3)}


def _multivariate(basket_ret: dict, kept: list, prepped: dict) -> dict:
    """OLS of monthly basket return on the kept monthly drivers (standardized)."""
    y = basket_ret.get("M")
    if y is None or y.empty:
        return {"available": False, "reason": "no_monthly_return"}
    # only long-history monthly drivers — mixing a short (n~40) series into the
    # joint OLS would collapse the common overlap. Prefer coverage, then score.
    LONG = 90
    pool = [r for r in kept if r["test_freq"] == "M" and r["key"] in prepped
            and r["n"] >= LONG]
    if len(pool) < 2:   # relax if too strict
        pool = [r for r in kept if r["test_freq"] == "M" and r["key"] in prepped
                and r["n"] >= 60]
    use = sorted(pool, key=lambda r: -r["score"])[:MAX_MV]
    if len(use) < 2:
        return {"available": False, "reason": "too_few_long_monthly_drivers"}
    cols = {}
    for r in use:
        s = prepped[r["key"]]["chg"]
        cols[r["key"]] = s
    X = pd.DataFrame(cols)
    df = pd.concat([y.rename("__y__"), X], axis=1).dropna()
    if len(df) < 40:
        return {"available": False, "reason": f"short_overlap(n={len(df)})"}
    yv = df["__y__"]
    Xv = df.drop(columns="__y__")
    # standardize predictors
    Xs = (Xv - Xv.mean()) / Xv.std(ddof=0)
    Xs = Xs.dropna(axis=1, how="any")
    if Xs.shape[1] < 2:
        return {"available": False, "reason": "degenerate"}
    res = None
    if HAVE_SM:
        try:
            Xc = sm.add_constant(Xs.values)
            L = max(1, min(6, int(round(4 * (len(df) / 100.0) ** (2 / 9)))))
            res = sm.OLS(yv.values, Xc).fit(cov_type="HAC", cov_kwds={"maxlags": L})
        except Exception:  # noqa: BLE001
            res = None
    betas = {}
    if res is not None:
        for i, k in enumerate(Xs.columns):
            betas[k] = {"std_beta": round(float(res.params[i + 1]), 4),
                        "t": round(float(res.tvalues[i + 1]), 2),
                        "p": round(float(res.pvalues[i + 1]), 4)}
        r2 = float(res.rsquared)
        adj = float(res.rsquared_adj)
    else:
        r2 = adj = 0.0
    # expanding-window OOS directional hit-rate
    hit, tot = 0, 0
    yv2, Xv2 = yv.reset_index(drop=True), Xs.reset_index(drop=True)
    n = len(yv2)
    if n > MIN_TRAIN + 12:
        for t in range(MIN_TRAIN, n):
            try:
                bt = np.linalg.lstsq(
                    np.c_[np.ones(t), Xv2.iloc[:t].values], yv2.iloc[:t].values,
                    rcond=None)[0]
                pred = bt[0] + Xv2.iloc[t].values @ bt[1:]
                if np.sign(pred) == np.sign(yv2.iloc[t]) and yv2.iloc[t] != 0:
                    hit += 1
                tot += 1
            except Exception:  # noqa: BLE001
                continue
    oos = round(hit / tot, 3) if tot else None
    # current model call: predict next month from latest standardized X
    expected = None
    if res is not None:
        try:
            latest = ((Xv.iloc[-1] - Xv.mean()) / Xv.std(ddof=0))[Xs.columns].values
            expected = float(res.params[0] + latest @ res.params[1:])
        except Exception:  # noqa: BLE001
            expected = None
    return {"available": True, "drivers": list(Xs.columns), "n": int(len(df)),
            "r2": round(r2, 3), "adj_r2": round(adj, 3),
            "betas": betas, "oos_hit_rate": oos, "oos_n": tot,
            "expected_monthly_ret": (round(expected, 4) if expected is not None else None)}


def _confidence(kept: list, mv: dict) -> dict:
    if not kept:
        return {"level": "none", "score": 0, "reasons": ["no drivers"]}
    max_corr = max(abs(r["pearson"]) for r in kept)
    any_sig = any((r["ols"] or {}).get("p", 1) < 0.01 for r in kept)
    priors = [r for r in kept if r["theory_agree"] is not None]
    agree = (sum(1 for r in priors if r["theory_agree"]) / len(priors)) if priors else 0.5
    stable_frac = sum(1 for r in kept if r["stable"]) / len(kept)
    r2 = mv.get("r2", 0) if mv.get("available") else 0
    oos = mv.get("oos_hit_rate") or 0.5
    score = (28 * min(max_corr / 0.4, 1) + 16 * (1 if any_sig else 0) +
             16 * agree + 14 * stable_frac + 14 * min(r2 / 0.25, 1) +
             12 * max(0, (oos - 0.5) / 0.12))
    score = round(min(100, score))
    level = "high" if score >= 66 else "medium" if score >= 42 else "low"
    reasons = [f"max|corr|={max_corr:.2f}", f"theory_agree={agree:.0%}",
               f"stable={stable_frac:.0%}", f"mvR2={r2:.2f}",
               f"OOS={oos:.0%}" if mv.get("oos_hit_rate") else "OOS=na"]
    return {"level": level, "score": score, "reasons": reasons}


def build_model(basket: dict, br: dict, records: list, prepped: dict,
                selection: dict) -> dict:
    kept = selection["kept"]
    # attach posture to each kept driver
    for r in kept:
        r["live"] = _posture(r)
    # net tilt: score-weighted current impulse
    wsum = sum(r["score"] for r in kept) or 1
    net = sum(r["score"] * r["live"]["impulse"] for r in kept) / wsum
    score = round(50 + 50 * max(-1, min(1, net)))
    if score >= 66:
        verdict = "BULLISH"
    elif score >= 56:
        verdict = "MILDLY BULLISH"
    elif score > 44:
        verdict = "NEUTRAL"
    elif score > 34:
        verdict = "MILDLY BEARISH"
    else:
        verdict = "BEARISH"

    # demand vs supply tilt
    def _tilt(role):
        rs = [r for r in kept if r["role"] == role]
        if not rs:
            return None
        return round(sum(r["live"]["impulse"] for r in rs) / len(rs), 3)

    mv = _multivariate(br["ret_raw"], kept, prepped)
    conf = _confidence(kept, mv)

    # rank drivers for display by score
    kept_sorted = sorted(kept, key=lambda r: -r["score"])
    top = kept_sorted[:3]

    def _drv_phrase(r):
        d = r["live"]["posture"]
        arrow = "tailwind" if d == "tailwind" else "headwind" if d == "headwind" else "flat"
        return (f"{r.get('label', r['key'])} (corr {r['pearson']:+.2f}, "
                f"lead {r['best_lag']}m, now {arrow})")

    narrative = (
        f"{basket['sub_sector']} ({basket['sector']}) screens {verdict} "
        f"[{score}/100, {conf['level']} confidence]. "
        f"Top drivers: " + "; ".join(_drv_phrase(r) for r in top) + ". ")
    if mv.get("available"):
        narrative += (f"A {len(mv['drivers'])}-driver model explains "
                      f"{mv['r2']*100:.0f}% of monthly variance "
                      f"(adj {mv['adj_r2']*100:.0f}%)")
        if mv.get("oos_hit_rate") is not None:
            narrative += f", {mv['oos_hit_rate']*100:.0f}% out-of-sample directional hit-rate"
        if mv.get("expected_monthly_ret") is not None:
            narrative += f"; current read ~{mv['expected_monthly_ret']*100:+.1f}%/mo"
        narrative += "."

    return {
        "verdict": verdict, "score": score, "net_tilt": round(net, 3),
        "demand_tilt": _tilt("demand"), "supply_tilt": _tilt("supply"),
        "cost_tilt": _tilt("cost"), "macro_tilt": _tilt("macro"),
        "confidence": conf, "multivariate": mv,
        "narrative": narrative,
        "drivers": kept_sorted,
        "n_kept": len(kept), "n_candidates": selection["n_candidates"],
    }
