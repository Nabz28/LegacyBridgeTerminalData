"""
bt.py — BLINDFOLDED out-of-sample backtest of the industry driver engine.

The honest question the model-validation critique raised: does the engine's signal
actually predict FORWARD sub-industry returns out-of-sample, or is the fit
in-sample only? This harness answers it with zero look-ahead.

Design (maximally blindfolded — the signal has NO parameters fit to the data):
  - Target: the basket's EQUAL-WEIGHT monthly return (built from 15-30 real member
    stock prices, the same baskets the engine uses).
  - Signal at month t = equal-weighted average of  sign_prior_d · tanh(z_t(Δ_d(t))/2)
    over the THEORY-ANCHORED drivers (sign fixed a-priori in mapping.py), where
    z_t standardises the current driver move using ONLY months [0:t]. CEIC drivers
    are already publication-lagged. The signal uses NO returns and NO fitted signs
    -> it cannot leak.
  - Test: does sign(signal(t)) predict sign(return(t+1))?  return(t+1) is NEVER
    seen when signal(t) is formed.
  - Honest null: the basket's unconditional up-rate (NOT 50% — equities drift up).
  - PLACEBO control: re-pair signal(t) with circularly-shifted returns. A leak-free
    harness must show ~zero IC / null hit-rate on placebos. The engine's IC is
    reported as a percentile of the placebo distribution.

Usage:
  python industry-engine/backtest/bt.py "Coal"          # one basket, verbose
  python industry-engine/backtest/bt.py --batch 0 18    # priority rank [0,18)
  python industry-engine/backtest/bt.py --all
Results -> industry-engine/backtest/results/<id>.json
"""
from __future__ import annotations

import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine"
sys.path.insert(0, str(ENGINE))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats as ss  # noqa: E402

import common as C  # noqa: E402
import basket as B  # noqa: E402
import drivers as D  # noqa: E402

RESULTS = Path(__file__).resolve().parent / "results"
RESULTS.mkdir(parents=True, exist_ok=True)

MIN_TRAIN = 54          # months before the first OOS prediction
MIN_STD_OBS = 30        # min history to standardise a driver move
MIN_PREDS = 24          # min OOS predictions to report a result
N_PLACEBO = 60          # circular-shift placebos


def _candidates(basket: dict):
    """Return (basket_build, {key: {chg, sign, label}}) for THEORY-ANCHORED
    drivers only (sign_prior != 0 — an a-priori sign, nothing fit to the data)."""
    br = B.build_basket(basket)
    res = D.assemble_and_analyze(basket, br)
    cands = {}
    for r in res["records"]:
        k = r["key"]
        if k in res["prepped"] and r.get("sign_prior"):
            cands[k] = {"chg": res["prepped"][k]["chg"],
                        "sign": int(r["sign_prior"]),
                        "label": r.get("label", k), "source": r.get("source")}
    return br, cands


def _signal_series(ret: pd.Series, cands: dict):
    """Walk-forward signal(t) and the realised forward/contemporaneous returns.
    Everything in signal(t) uses only months [0:t]."""
    idx = ret.index
    X = pd.DataFrame({k: c["chg"] for k, c in cands.items()}).reindex(idx)
    signs = np.array([cands[k]["sign"] for k in X.columns], dtype=float)
    Xv, Rv = X.values, ret.values
    T = len(idx)
    rows = []
    for t in range(MIN_TRAIN, T - 1):
        xt = Xv[t]
        z = np.full(len(signs), np.nan)
        for k in range(len(signs)):
            col = Xv[:t, k]                       # strictly past (excl. current)
            col = col[~np.isnan(col)]
            if len(col) < MIN_STD_OBS or np.isnan(xt[k]):
                continue
            sd = col.std(ddof=1)
            if sd > 1e-12:
                z[k] = (xt[k] - col.mean()) / sd
        contrib = signs * np.tanh(z / 2.0)
        m = ~np.isnan(contrib)
        if not m.any():
            continue
        rows.append((idx[t], float(np.mean(contrib[m])),
                     float(Rv[t]), float(Rv[t + 1])))
    return pd.DataFrame(rows, columns=["date", "signal", "ret_t", "ret_fwd"])


def _metrics(sig: np.ndarray, fwd: np.ndarray, up_rate: float) -> dict:
    valid = (sig != 0) & ~np.isnan(fwd) & (fwd != 0)
    s, f = sig[valid], fwd[valid]
    n = len(s)
    if n < MIN_PREDS:
        return {"n": n, "enough": False}
    hit = float(np.mean(np.sign(s) == np.sign(f)))
    ic = float(ss.spearmanr(s, f).statistic)
    pear = float(ss.pearsonr(s, f).statistic)
    ls = (float(f[s > 0].mean() - f[s < 0].mean())
          if (s > 0).any() and (s < 0).any() else None)
    # one-sided binomial: does hit beat the unconditional up-rate?
    k_hit = int(round(hit * n))
    binom_p = float(ss.binomtest(k_hit, n, max(0.01, min(0.99, up_rate)),
                                 alternative="greater").pvalue)
    # placebo null: circular-shift the forward returns
    pic, phit = [], []
    for off in np.linspace(6, n - 6, N_PLACEBO).astype(int):
        if off <= 0 or off >= n:
            continue
        fp = np.roll(f, off)
        pic.append(ss.spearmanr(s, fp).statistic)
        phit.append(np.mean(np.sign(s) == np.sign(fp)))
    pic = np.array([x for x in pic if x == x])
    placebo = {"ic_mean": float(pic.mean()), "ic_std": float(pic.std()),
               "ic_pctile": float(np.mean(pic < ic)),
               "hit_mean": float(np.mean(phit))} if len(pic) else None
    return {"n": n, "enough": True, "hit_rate": round(hit, 3),
            "up_rate": round(up_rate, 3), "edge": round(hit - up_rate, 3),
            "fwd_ic": round(ic, 3), "fwd_pearson": round(pear, 3),
            "long_short_mo": (round(ls, 4) if ls is not None else None),
            "binom_p_vs_uprate": round(binom_p, 4), "placebo": placebo}


def backtest(basket: dict) -> dict:
    br, cands = _candidates(basket)
    ret = br["ret_eqw"]["M"].dropna()
    base = {"id": basket["id"], "sub_sector": basket["sub_sector"],
            "sector": basket["sector"], "priority": basket.get("priority"),
            "n_used": br["n_used"], "n_members": br["n_members"],
            "n_months": int(len(ret)), "n_anchored_drivers": len(cands),
            "anchored": [{"key": k, "label": c["label"], "sign": c["sign"],
                          "source": c["source"]} for k, c in cands.items()]}
    if len(ret) < MIN_TRAIN + 12 or not cands:
        base.update(available=False,
                    reason=("no_anchored_drivers" if not cands else "short_history"))
        return base
    sg = _signal_series(ret, cands)
    if len(sg) < MIN_PREDS:
        base.update(available=False, reason=f"too_few_signal_months({len(sg)})")
        return base
    up_rate = float((ret > 0).mean())
    fwd = _metrics(sg["signal"].values, sg["ret_fwd"].values, up_rate)
    # contemporaneous reference (where the engine's correlations live)
    contemp = _metrics(sg["signal"].values, sg["ret_t"].values, up_rate)
    base.update(available=fwd.get("enough", False), forward=fwd,
                contemporaneous_ref=contemp,
                latest_signal=round(float(sg["signal"].iloc[-1]), 3))
    return base


def _verdict_line(r: dict) -> str:
    if not r.get("available"):
        return (f"  {r['sub_sector']:24s} prio{r.get('priority'):>3} "
                f"-- SKIP ({r.get('reason')}) [{r.get('n_anchored_drivers',0)} anchored]")
    f = r["forward"]
    pl = f.get("placebo") or {}
    pct = pl.get("ic_pctile", 0.0)
    # Primary significance = the placebo randomisation percentile (non-parametric,
    # robust to autocorrelation). IC>0 AND beats >=90% of placebos == real skill.
    flag = ("SKILL" if (f["fwd_ic"] >= 0.08 and pct >= 0.90)
            else "marginal" if (f["fwd_ic"] >= 0.05 and pct >= 0.80)
            else "weak" if (f["fwd_ic"] > 0.02 or f["edge"] > 0.02)
            else "NONE")
    return (f"  {r['sub_sector']:24s} prio{r.get('priority'):>3} "
            f"n={f['n']:>3} hit={f['hit_rate']:.2f} up={f['up_rate']:.2f} "
            f"edge={f['edge']:+.2f} IC={f['fwd_ic']:+.2f} "
            f"p={f['binom_p_vs_uprate']:.2f} plac_pct={pl.get('ic_pctile',0):.2f} "
            f"drv={r['n_anchored_drivers']:>2} -> {flag}")


def run_baskets(specs: list) -> None:
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    by_name = {b["sub_sector"].lower(): b for b in wl["baskets"]}
    by_prio = sorted(wl["baskets"], key=lambda b: b["priority"])
    targets = []
    for sp in specs:
        if isinstance(sp, dict):
            targets.append(sp)
        elif sp.lower() in by_name:
            targets.append(by_name[sp.lower()])
    for b in targets:
        try:
            r = backtest(b)
        except Exception as e:  # noqa: BLE001
            r = {"id": b["id"], "sub_sector": b["sub_sector"],
                 "available": False, "reason": f"error: {e}"}
        C.write_json(RESULTS / f"{b['id']}.json", r)
        print(_verdict_line(r), flush=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    by_prio = sorted(wl["baskets"], key=lambda b: b["priority"])
    if "--all" in args:
        run_baskets(by_prio)
    elif "--batch" in args:
        i = args.index("--batch")
        lo, hi = int(args[i + 1]), int(args[i + 2])
        run_baskets(by_prio[lo:hi])
    elif args:
        run_baskets([args[0]])
    else:
        run_baskets([by_prio[2]])    # Coal by default
