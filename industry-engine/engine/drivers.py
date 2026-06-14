"""
drivers.py — assemble a basket's candidate driver universe, resolve each driver's
deep history, and run the full statistical analysis (via stats.analyze_pair).

Data planes:
  - CEIC idind drivers  -> macro.observations (ric = CEICI...)  [monthly/quarterly]
  - global/macro drivers -> correlation.sqlite (resolved via mapping.GLOBAL_CORR)
                            fallback -> live_indicators.spark (recent only)

CEIC candidate reduction: province slices are dropped, topics de-duplicated, and
the set is capped (prefer longer histories, keep demand/supply balance) to avoid
multiple-testing noise.
"""
from __future__ import annotations

import pandas as pd

import common as C
import mapping as M
import stats as S

MAX_CEIC = 46           # cap CEIC candidates per basket (after curation)
SPARK_MIN = 10          # min spark points to attempt a (shallow) fit


# --------------------------------------------------------------------------- #
# CEIC candidate curation
# --------------------------------------------------------------------------- #
# CEIC frequencies usable for monthly/quarterly equity-return attribution.
_OK_FREQ = {"P1D", "P7D", "P1M", "P3M"}


def _curate_ceic(cands: list, exclude: list | None = None) -> list:
    exclude = [str(e).lower() for e in (exclude or [])]

    def is_province(rec):
        t = (rec.get("topic") or "").lower()
        return t.startswith("by province") or "province" in t

    def is_excluded(rec):
        # drop ENDOGENOUS series — e.g. a single constituent company's own
        # balance sheet ("PT Bank X: Assets…") is an outcome, not a driver.
        hay = (str(rec.get("topic") or "") + " " + str(rec.get("sub") or "")).lower()
        return any(e in hay for e in exclude)

    # keep only sufficiently high-frequency series (drop annual/semiannual)
    freq_ok = [r for r in cands if (r.get("freq") in _OK_FREQ) and not is_excluded(r)]
    nat = [r for r in freq_ok if not is_province(r)]
    pool = nat or freq_ok or cands
    # dedup by (topic, role); prefer higher n_obs
    seen = {}
    for r in sorted(pool, key=lambda z: -(z.get("n_obs") or 0)):
        k = ((r.get("topic") or r["ric"]).strip().lower(), r.get("role"))
        if k not in seen:
            seen[k] = r
    uniq = list(seen.values())
    uniq.sort(key=lambda z: -(z.get("n_obs") or 0))
    # keep demand/supply balance within cap
    dem = [r for r in uniq if r.get("role") == "demand"][: MAX_CEIC // 2 + 4]
    sup = [r for r in uniq if r.get("role") == "supply"][: MAX_CEIC // 2 + 4]
    other = [r for r in uniq if r.get("role") not in ("demand", "supply")]
    out = (dem + sup + other)[:MAX_CEIC]
    return out


# --------------------------------------------------------------------------- #
# history resolution
# --------------------------------------------------------------------------- #
def _global_history(key: str, live_by_key: dict) -> tuple[list, str]:
    """Return (obs[{date,value}], source). corr.sqlite first, spark fallback."""
    corr_id = M.GLOBAL_CORR.get(key, "__missing__")
    if corr_id and corr_id != "__missing__":
        px = C.sqlite_prices([corr_id], "weekly")
        pairs = px.get(corr_id) or []
        if len(pairs) >= 30:
            return ([{"date": d, "value": v} for d, v in pairs], f"corr:{corr_id}")
        px = C.sqlite_prices([corr_id], "monthly")
        pairs = px.get(corr_id) or []
        if len(pairs) >= 18:
            return ([{"date": d, "value": v} for d, v in pairs], f"corr:{corr_id}")
    # fallback: live_indicators spark
    row = live_by_key.get(key)
    if row and row.get("spark"):
        out = []
        for pt in row["spark"]:
            if isinstance(pt, dict):
                d, v = pt.get("d") or pt.get("date"), pt.get("v") or pt.get("value")
            else:
                d, v = None, pt
            if v is not None:
                out.append({"date": d or "", "value": v})
        if len([o for o in out if o["date"]]) >= SPARK_MIN:
            return (out, "spark")
    return ([], "none")


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def assemble_and_analyze(basket: dict, br: dict) -> dict:
    """Run analyze_pair over every candidate driver; return all records + meta.

    `br` is the basket build dict (basket.build_basket). Primary target is the
    RAW cap-weighted return; excess vs IHSG is attached as a robustness check.
    """
    basket_ret = br["ret_raw"]
    excess_ret = br.get("ret_excess")
    # gather the global/macro keys we will need (for one batched live fetch)
    hint_keys = sorted({h["key"] for h in basket.get("global_hints", [])}
                       | {h["key"] for h in basket.get("macro_hints", [])})
    live_rows = C.get_live_indicators(hint_keys) if hint_keys else []
    live_by_key = {r["key"]: r for r in live_rows}

    records: list = []
    unscored: list = []
    prepped: dict = {}     # key -> prepped driver (chg Series etc.) for multivariate

    # ---- CEIC drivers --------------------------------------------------- #
    # Per-basket CEIC role/sign overrides: a CEIC series CEIC-tags as 'supply'
    # (e.g. coal production) but is economically a DEMAND driver for THIS basket
    # (coal-mining contractors / equipment). Each override = [substr, role, sign].
    overrides = basket.get("ceic_override", [])

    def _ceic_role_sign(rec: dict) -> tuple:
        hay = (str(rec.get("topic") or "") + " " + str(rec.get("sub") or "")).lower()
        for sub, role, sign in overrides:
            if str(sub).lower() in hay:
                return role, int(sign)
        rl = rec.get("role") or "macro"
        return rl, (+1 if rl == "demand" else 0)

    ceic = _curate_ceic(basket.get("ceic_candidates", []),
                        exclude=basket.get("ceic_exclude", []))
    C.log(f"  CEIC candidates: {len(basket.get('ceic_candidates', []))} -> "
          f"{len(ceic)} curated"
          + (f" ({len(overrides)} overrides)" if overrides else ""))
    for rec in ceic:
        ric = rec["ric"]
        role, sign_prior = _ceic_role_sign(rec)
        obs = C.get_observations(ric, limit=6000)
        drv = S.prep_driver(obs, ric, rec.get("units") or "",
                            rec.get("topic") or "")
        if not drv:
            unscored.append({"key": ric, "label": rec.get("topic"), "role": role,
                             "source": "ceic", "reason": "insufficient_history"})
            continue
        r = S.analyze_pair(basket_ret, drv, sign_prior, role,
                           rec.get("topic") or ric, excess_ret=excess_ret)
        if r:
            r["source"] = "ceic"
            r["label"] = rec.get("topic") or ric
            records.append(r)
            prepped[ric] = drv

    # ---- global + macro drivers ----------------------------------------- #
    for h in (basket.get("global_hints", []) + basket.get("macro_hints", [])):
        key = h["key"]
        obs, src = _global_history(key, live_by_key)
        label = (live_by_key.get(key, {}) or {}).get("label", key)
        units = (live_by_key.get(key, {}) or {}).get("unit", "")
        if not obs:
            unscored.append({"key": key, "label": label, "role": h["role"],
                             "source": "global", "reason": "no_history"})
            continue
        drv = S.prep_driver(obs, key, units, label)
        if not drv:
            unscored.append({"key": key, "label": label, "role": h["role"],
                             "source": src, "reason": "insufficient_history"})
            continue
        r = S.analyze_pair(basket_ret, drv, int(h.get("sign", 0)), h["role"],
                           h.get("why", ""), excess_ret=excess_ret)
        if r:
            r["source"] = src if src.startswith("corr") else ("spark" if src == "spark" else "global")
            r["shallow"] = (src == "spark")
            r["label"] = label
            records.append(r)
            prepped[key] = drv

    return {"records": records, "unscored": unscored, "prepped": prepped,
            "n_candidates": len(ceic) + len(basket.get("global_hints", []))
            + len(basket.get("macro_hints", [])),
            "n_records": len(records)}


if __name__ == "__main__":
    import sys
    import basket as B
    name = sys.argv[1] if len(sys.argv) > 1 else "Coal"
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    bk = next(x for x in wl["baskets"] if x["sub_sector"] == name)
    br = B.build_basket(bk)
    res = assemble_and_analyze(bk, br)
    sel = S.select_drivers(res["records"])
    print(f"\ntested={res['n_records']} kept={sel['n_kept']} "
          f"unscored={len(res['unscored'])}")
    print(f"\n=== KEPT DRIVERS ({name}, raw return; xs=vs-IHSG) ===")
    print(f"{'label':32s} {'role':7s} {'freq':4s} {'pear':>6s} {'xs':>6s} "
          f"{'lag':>3s} {'IC':>6s} {'R2':>5s} {'p':>6s} {'thy':>4s} {'n':>4s} {'sc':>5s}")
    for r in sel["kept"]:
        ols = r["ols"] or {}
        lab = (r.get("label") or r["key"])[:32]
        print(f"{lab:32s} {r['role'][:7]:7s} {r['test_freq']:4s} "
              f"{r['pearson']:6.2f} {(r.get('excess_pearson') or 0):6.2f} "
              f"{r['best_lag']:3d} {(r['ic'] or 0):6.2f} {ols.get('r2',0):5.2f} "
              f"{ols.get('p',1):6.3f} {str(r['theory_agree'])[:4]:>4s} "
              f"{r['n']:4d} {r['score']:5.1f}")
