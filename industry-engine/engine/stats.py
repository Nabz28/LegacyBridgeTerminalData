"""
stats.py — the quant estimation core.

For each candidate driver vs a basket's EXCESS return (vs IHSG) we estimate, at the
driver's native test frequency (monthly workhorse; quarterly for quarterly-only
CEIC series):

  - contemporaneous Pearson + Spearman correlation (with p-values)
  - lead-lag cross-correlation (driver leads basket by L=0..6 periods) -> best lag
  - univariate OLS with Newey-West (HAC) standard errors -> beta, t, p, R^2
  - predictive OLS at the best positive lead
  - Information Coefficient: Spearman(driver_t, excess_ret_{t+1}) -> the quant-
    standard forward signal, with its t-stat
  - split-sample sign stability
  - data-quality flags (overlap, staleness, variance)
  - empirical sign vs theoretical prior (agreement flag)

Then `select_drivers` applies quality + significance gates, scores and ranks the
survivors. This is deliberately a blend of statistics (does it actually move the
stock basket?) and theory (does the sign make economic sense?).
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
from scipy import stats as ss

import common as C

try:
    import statsmodels.api as sm
    HAVE_SM = True
except Exception:  # noqa: BLE001
    HAVE_SM = False

MAX_LAG = 6                 # lead-lag search horizon (periods)
MIN_N_M = 24               # min overlap for monthly estimation
MIN_N_Q = 12               # min overlap for quarterly estimation

# --- transform inference --------------------------------------------------- #
_RATE_HINTS = ("rate", "yield", "ratio", "npl", "car", "nim", "bopo", "ldr",
               "spread", "%", "percent", "occupancy", "unemployment", "bi_rate",
               "interbank", "deposit_rate", "lending")
_PRICE_HINTS = ("price", "index", "idx", "spot", "usd", "idr", "exchange", "fx",
                "share_price", "reer", "dxy", "jci", "spx", "ndx", "vix")
_VOL_HINTS = ("production", "output", "sales", "volume", "value", "exports",
              "imports", "consumption", "registrations", "passengers", "arrivals",
              "traffic", "loans", "credit", "premium", "transactions", "subscribers",
              "throughput", "cargo", "generation", "number", "area", "tonne", "kwh",
              "capacity", "m2", "reserves", "deposits", "financing")


def _infer_transform(key: str, units: str, topic: str, freq_per_year: int) -> str:
    s = f"{key} {units} {topic}".lower()
    if any(h in s for h in _RATE_HINTS):
        return "diff"
    if any(h in s for h in _PRICE_HINTS):
        return "logret"
    if any(h in s for h in _VOL_HINTS):
        return "yoy" if freq_per_year >= 4 else "logret"
    # default: if it looks like a level with USD/IDR/mn/bn units -> yoy, else logret
    if any(u in (units or "").lower() for u in ("mn", "bn", "unit", "'000", "kl", "ton")):
        return "yoy"
    return "logret"


def _native_freq(idx: pd.DatetimeIndex) -> tuple[str, int]:
    if len(idx) < 3:
        return "M", 12
    d = np.median(np.diff(idx.values).astype("timedelta64[D]").astype(int))
    if d <= 10:
        return "W", 52
    if d <= 45:
        return "M", 12
    if d <= 150:
        return "Q", 4
    return "Y", 1


def prep_driver(obs: list, key: str, units: str, topic: str) -> dict | None:
    """Build a stationary change series at a test frequency from raw observations."""
    if not obs or len(obs) < 6:
        return None
    idx = pd.to_datetime([o["date"] for o in obs])
    lvl = pd.Series([o["value"] for o in obs], index=idx).sort_index()
    lvl = lvl[~lvl.index.duplicated(keep="last")].astype(float).dropna()
    if len(lvl) < 6 or lvl.nunique() < 4:
        return None
    nat, fpy = _native_freq(lvl.index)
    if nat == "Y":
        # annual (and semiannual) series cannot be smeared into a monthly equity-
        # return regression without creating artefacts — exclude from the engine.
        return None
    test_freq = "Q" if nat == "Q" else "M"     # weekly/monthly -> monthly
    rule = "QE" if test_freq == "Q" else "ME"
    lvl_r = lvl.resample(rule).last().dropna()
    transform = _infer_transform(key, units, topic, fpy)
    if transform == "diff":
        chg = lvl_r.diff()
    elif transform == "yoy":
        lag = 4 if test_freq == "Q" else 12
        if len(lvl_r) > lag + 4:
            chg = lvl_r.pct_change(lag)
        else:
            chg = np.log(lvl_r.where(lvl_r > 0)).diff()
            transform = "logret(fallback)"
    else:  # logret
        if (lvl_r <= 0).any():
            chg = lvl_r.diff()
            transform = "diff(nonpos)"
        else:
            chg = np.log(lvl_r).diff()
    chg = chg.replace([np.inf, -np.inf], np.nan).dropna()
    if len(chg) < 6 or chg.nunique() < 4:
        return None
    last_date = lvl.index.max()
    return {
        "key": key, "test_freq": test_freq, "transform": transform,
        "native_freq": nat, "chg": chg, "level": lvl_r,
        "last_obs": last_date.strftime("%Y-%m-%d"),
        "n_level": int(len(lvl)),
    }


def _hac_ols(y: pd.Series, x: pd.Series, overlap: int = 0) -> dict | None:
    """`overlap` = the MA order induced by the driver transform (e.g. a 12-month
    overlapping YoY change is ~MA(11)). Newey-West truncated below the overlap
    band understates SEs and overstates t/p, so the HAC lag is floored at the
    overlap (critique: YoY autocorrelation vs too-short HAC lag)."""
    j = pd.concat([y.rename("y"), x.rename("x")], axis=1).dropna()
    if len(j) < 8 or j["x"].nunique() < 4:
        return None
    n = len(j)
    if HAVE_SM:
        try:
            X = sm.add_constant(j["x"].values)
            base_L = int(round(4 * (n / 100.0) ** (2.0 / 9.0)))
            L = max(1, base_L, int(overlap))
            L = min(L, max(1, n // 4))    # sanity cap
            res = sm.OLS(j["y"].values, X).fit(cov_type="HAC",
                                                cov_kwds={"maxlags": L})
            return {"beta": float(res.params[1]), "t": float(res.tvalues[1]),
                    "p": float(res.pvalues[1]), "r2": float(res.rsquared),
                    "n": n, "hac_lag": L}
        except Exception:  # noqa: BLE001
            pass
    # fallback: simple linear regression via scipy
    try:
        lr = ss.linregress(j["x"].values, j["y"].values)
        return {"beta": float(lr.slope), "t": float(lr.slope / lr.stderr)
                if lr.stderr else 0.0, "p": float(lr.pvalue),
                "r2": float(lr.rvalue ** 2), "n": n, "hac_lag": 0}
    except Exception:  # noqa: BLE001
        return None


def _leadlag(y: pd.Series, x: pd.Series) -> dict:
    """corr(x shifted forward by L, y): L>0 means driver LEADS basket by L."""
    best = {"lag": 0, "corr": 0.0}
    series = []
    for L in range(0, MAX_LAG + 1):
        j = pd.concat([y.rename("y"), x.shift(L).rename("x")], axis=1).dropna()
        if len(j) < 10:
            series.append({"lag": L, "corr": None, "n": len(j)})
            continue
        r = float(j["x"].corr(j["y"]))
        series.append({"lag": L, "corr": round(r, 4), "n": len(j)})
        if abs(r) > abs(best["corr"]):
            best = {"lag": L, "corr": r}
    return {"best_lag": best["lag"], "corr_at_best": round(best["corr"], 4),
            "profile": series}


def analyze_pair(basket_ret: dict, driver: dict, sign_prior: int,
                 role: str, why: str, excess_ret: dict | None = None) -> dict | None:
    """Full stat record for one driver vs basket return.

    `basket_ret` is the PRIMARY target (raw cap-weighted return by freq);
    `excess_ret` (vs IHSG) is an optional robustness check reported alongside.
    """
    f = driver["test_freq"]
    y = basket_ret.get(f)
    if y is None or y.empty:
        return None
    x = driver["chg"]
    j = pd.concat([y.rename("y"), x.rename("x")], axis=1).dropna()
    n = len(j)
    min_n = MIN_N_Q if f == "Q" else MIN_N_M
    if n < 10:
        return None
    yv, xv = j["y"], j["x"]
    # MA order induced by the transform (overlapping YoY ~ MA(11)) — used to
    # widen HAC lags and to deflate the i.i.d. IC t-stat for autocorrelation.
    transform = driver.get("transform", "")
    overlap = ((12 if f == "M" else 4) if "yoy" in transform else 0)
    pr, pp = ss.pearsonr(xv, yv)
    sr, sp = ss.spearmanr(xv, yv)
    ll = _leadlag(y, x)
    contemp = _hac_ols(y, x, overlap)
    # predictive at best positive lead (>=1) if one exists, else lag0
    bl = ll["best_lag"] if ll["best_lag"] >= 1 else 0
    pred = _hac_ols(y, x.shift(bl), overlap) if bl >= 1 else contemp
    # forward IC (1-period ahead), Spearman. The naive t = ic*sqrt(n-1) assumes
    # i.i.d.; deflate by the overlap so an overlapping driver can't inherit an
    # inflated significance (critique: IC t ignores autocorrelation).
    jf = pd.concat([y.rename("y"), x.shift(1).rename("x")], axis=1).dropna()
    if len(jf) >= 10:
        ic, icp = ss.spearmanr(jf["x"], jf["y"])
        ic_t = float(ic) * math.sqrt((len(jf) - 1) / (overlap + 1.0))
    else:
        ic, icp, ic_t = float("nan"), float("nan"), float("nan")
    # split-sample sign stability
    half = n // 2
    s1 = _hac_ols(yv.iloc[:half], xv.iloc[:half], overlap)
    s2 = _hac_ols(yv.iloc[half:], xv.iloc[half:], overlap)
    sign1 = np.sign(s1["beta"]) if s1 else 0
    sign2 = np.sign(s2["beta"]) if s2 else 0
    # don't trust split-sample sign agreement on tiny halves (<24 obs)
    stable = bool(sign1 != 0 and sign1 == sign2 and half >= 24)
    def _isign(v) -> int:
        try:
            if v is None or (isinstance(v, float) and math.isnan(v)):
                return 0
            return int(np.sign(v))
        except Exception:  # noqa: BLE001
            return 0
    emp_sign = _isign(contemp["beta"] if contemp else pr)
    theory_agree = (emp_sign == sign_prior) if (sign_prior != 0 and emp_sign != 0) else None

    # current signal: latest driver change + its z-score (for live posture)
    xs_hist = x.dropna()
    last_chg = float(xs_hist.iloc[-1]) if len(xs_hist) else None
    sd = float(xs_hist.std()) if len(xs_hist) > 4 else None
    last_z = (round((last_chg - float(xs_hist.mean())) / sd, 2)
              if (last_chg is not None and sd) else None)
    last_chg_date = (xs_hist.index[-1].strftime("%Y-%m-%d") if len(xs_hist) else None)

    # secondary: contemporaneous correlation vs IHSG-excess return (robustness)
    excess_pearson = None
    if excess_ret is not None and not (excess_ret.get(f) is None or excess_ret[f].empty):
        je = pd.concat([excess_ret[f].rename("y"), x.rename("x")], axis=1).dropna()
        if len(je) >= 10:
            excess_pearson = round(float(je["x"].corr(je["y"])), 4)

    rec = {
        "key": driver["key"], "role": role, "why": why,
        "test_freq": f, "transform": driver["transform"],
        "native_freq": driver["native_freq"], "last_obs": driver["last_obs"],
        "n": n, "min_n": min_n,
        "pearson": round(float(pr), 4), "pearson_p": round(float(pp), 4),
        "spearman": round(float(sr), 4), "spearman_p": round(float(sp), 4),
        "best_lag": ll["best_lag"], "corr_at_best": ll["corr_at_best"],
        "ic": (round(float(ic), 4) if ic == ic else None),
        "ic_t": (round(float(ic_t), 3) if ic_t == ic_t else None),
        "ols": contemp, "ols_pred": pred,
        "sign_prior": sign_prior, "emp_sign": emp_sign,
        "theory_agree": theory_agree, "stable": stable,
        "excess_pearson": excess_pearson,
        "last_chg": (round(last_chg, 6) if last_chg is not None else None),
        "last_chg_z": last_z, "last_chg_date": last_chg_date,
    }
    rec["quality"] = _quality(rec)
    rec["score"] = _score(rec)
    return rec


def _quality(rec: dict) -> dict:
    flags = []
    ok = True
    if rec["n"] < rec["min_n"]:
        flags.append(f"short_sample(n={rec['n']})")
        ok = ok and rec["n"] >= max(10, rec["min_n"] // 2)
    # staleness: last obs within ~12 months
    try:
        last = pd.to_datetime(rec["last_obs"])
        months = (pd.Timestamp.now() - last).days / 30.4
        if months > 14:
            flags.append(f"stale({int(months)}m)")
    except Exception:  # noqa: BLE001
        pass
    return {"ok": ok, "flags": flags}


def _score(rec: dict) -> float:
    """Composite 0..100 driver importance: blend of magnitude, significance,
    lead, stability, theory agreement."""
    r2 = (rec["ols"] or {}).get("r2", 0) or 0
    p = (rec["ols"] or {}).get("p", 1) or 1
    absr = abs(rec["pearson"])
    ic = abs(rec["ic"] or 0)
    sig = max(0.0, 1.0 - min(p, 1.0))                      # significance
    base = 100 * (0.30 * min(absr / 0.5, 1) + 0.25 * min(r2 / 0.3, 1) +
                  0.20 * min(ic / 0.3, 1) + 0.15 * sig)
    if rec["stable"]:
        base += 6
    if rec["theory_agree"]:
        base += 6
    elif rec["theory_agree"] is False:
        base -= 8
# Lead-lag is a MAX over (MAX_LAG+1) lags — a maximally-selected statistic. The
# Šidák-equivalent single-lag |r| threshold that preserves a ~0.15 effective bar
# across 7 lags is ~0.22 at n~120; below this the "lead" clears on noise alone.
LEADLAG_SIDAK = 0.22


def _score(rec: dict) -> float:
    """Composite 0..100 driver importance: blend of magnitude, significance,
    lead, stability, theory agreement."""
    r2 = (rec["ols"] or {}).get("r2", 0) or 0
    p = (rec["ols"] or {}).get("p", 1) or 1
    absr = abs(rec["pearson"])
    ic = abs(rec["ic"] or 0)
    sig = max(0.0, 1.0 - min(p, 1.0))                      # significance
    base = 100 * (0.30 * min(absr / 0.5, 1) + 0.25 * min(r2 / 0.3, 1) +
                  0.20 * min(ic / 0.3, 1) + 0.15 * sig)
    if rec["stable"]:
        base += 6
    if rec["theory_agree"]:
        base += 6
    elif rec["theory_agree"] is False:
        base -= 8
    # reward a genuine lead only if it survives the multiple-lag (Šidák) bar
    if rec["best_lag"] >= 1 and abs(rec["corr_at_best"]) >= LEADLAG_SIDAK:
        base += 4
    return round(max(0.0, min(100.0, base)), 1)


def is_kept(rec: dict) -> bool:
    """Quality + significance gate for inclusion in the model."""
    if not rec["quality"]["ok"]:
        return False
    # IC gate raised (1.6 -> 2.3) because the i.i.d. IC t-stat is anticonservative
    # under autocorrelation even after the overlap deflation.
    p_ok = ((rec["ols"] or {}).get("p", 1) < 0.10) or \
           ((rec["ols_pred"] or {}).get("p", 1) < 0.10) or \
           (abs(rec["ic"] or 0) >= 0.12 and abs(rec["ic_t"] or 0) >= 2.3)
    # strength: a contemporaneous lag-0 correlation, OR a LEAD that survives the
    # Šidák multiple-lag bar (not the raw 0.15 max-over-7 that clears on noise).
    strength = abs(rec["pearson"]) >= 0.13 or \
        abs(rec["corr_at_best"]) >= LEADLAG_SIDAK
    # reject if statistically strong but flatly contradicts robust theory prior
    contradiction = (rec["theory_agree"] is False and rec["stable"] and
                     abs(rec["pearson"]) >= 0.2)
    return bool(p_ok and strength and not contradiction)


def select_drivers(records: list, max_keep: int = 12) -> dict:
    """Filter -> keep set; rank; dedup keys; split kept vs rejected."""
    seen = set()
    uniq = []
    for r in sorted(records, key=lambda z: -z["score"]):
        if r["key"] in seen:
            continue
        seen.add(r["key"])
        uniq.append(r)
    kept = [r for r in uniq if is_kept(r)]
    kept = kept[:max_keep]
    kept_keys = {r["key"] for r in kept}
    rejected = [r for r in uniq if r["key"] not in kept_keys]
    return {"kept": kept, "rejected": rejected, "n_candidates": len(records),
            "n_unique": len(uniq), "n_kept": len(kept)}
