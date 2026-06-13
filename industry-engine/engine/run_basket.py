"""
run_basket.py — run the full quant pipeline for ONE basket and write its artifact.

  basket index -> candidate drivers -> per-driver stats -> selection -> model
  -> output/<id>.json

Usage:
  python run_basket.py "Coal"        # by sub_sector name
  python run_basket.py id=energy_coal
"""
from __future__ import annotations

import sys
import time

import common as C
import basket as B
import drivers as D
import stats as S
import theory as T


def run(basket_def: dict) -> dict:
    t0 = time.time()
    C.log(f"=== RUN basket: {basket_def['sub_sector']} "
          f"(prio {basket_def.get('priority')}) ===")
    br = B.build_basket(basket_def)
    if br["n_used"] < 2 or br["coverage"]["M"] < 36:
        C.log(f"  ABORT: insufficient price history "
              f"(n_used={br['n_used']}, M={br['coverage']['M']})", level="WARN")
        art = _artifact(basket_def, br, None, None, None,
                        status="blocked", reason="insufficient_price_history")
        _write(art)
        return art
    res = D.assemble_and_analyze(basket_def, br)
    sel = S.select_drivers(res["records"])
    model = T.build_model(basket_def, br, res["records"], res["prepped"], sel)
    art = _artifact(basket_def, br, res, sel, model, status="done")
    art["runtime_s"] = round(time.time() - t0, 1)
    _write(art)
    C.log(f"  {model['verdict']} {model['score']}/100 "
          f"({model['confidence']['level']}) · kept {model['n_kept']} drivers · "
          f"{art['runtime_s']}s")
    return art


def _artifact(bdef, br, res, sel, model, status="done", reason=None) -> dict:
    return {
        "id": bdef["id"], "sub_sector": bdef["sub_sector"], "sector": bdef["sector"],
        "priority": bdef.get("priority"),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "status": status, "reason": reason,
        "benchmark": bdef.get("benchmark"),
        "basket": {
            "n_members": bdef["n_names"], "n_used": br["n_used"],
            "members_used": br["members_used"],
            "coverage": br["coverage"], "total_mcap": bdef["total_mcap"],
            "weight_cap": 0.12,
        },
        "model": model,
        "unscored": (res["unscored"] if res else []),
        "rejected_top": ([
            {"key": r["key"], "label": r.get("label"), "role": r["role"],
             "pearson": r["pearson"], "p": (r["ols"] or {}).get("p"),
             "theory_agree": r["theory_agree"], "score": r["score"],
             "reason": "below_gate"}
            for r in (sel["rejected"][:10] if sel else [])]),
        "n_tested": (res["n_records"] if res else 0),
        "provenance": {
            "prices": "data-store/correlation.sqlite (IDX weekly) + yfinance fallback",
            "benchmark_src": "correlation.sqlite IDX:COMPOSITE (IHSG)",
            "ceic": "macro.observations (country=idind, demand/supply tagged)",
            "market_macro": "correlation.sqlite (commodities/FX/yields/ID-CN macro)",
            "method": "HAC-OLS + lead-lag + Spearman-IC + split-sample stability "
                      "+ multivariate + expanding-window OOS; theory-reconciled",
        },
    }


def _write(art: dict) -> None:
    C.write_json(C.OUTPUT_DIR / f"{art['id']}.json", art)


def find_basket(spec: str) -> dict:
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    if spec.startswith("id="):
        sid = spec[3:]
        return next(b for b in wl["baskets"] if b["id"] == sid)
    return next(b for b in wl["baskets"] if b["sub_sector"].lower() == spec.lower())


if __name__ == "__main__":
    spec = sys.argv[1] if len(sys.argv) > 1 else "Coal"
    art = run(find_basket(spec))
    print("\n" + "=" * 70)
    print(art["model"]["narrative"] if art.get("model") else
          f"BLOCKED: {art['reason']}")
    print("=" * 70)
    if art.get("model"):
        m = art["model"]
        print(f"net_tilt={m['net_tilt']}  demand={m['demand_tilt']} "
              f"supply={m['supply_tilt']} cost={m['cost_tilt']} macro={m['macro_tilt']}")
        print("confidence:", m["confidence"])
        print("multivariate:", {k: m["multivariate"].get(k) for k in
              ("available", "r2", "adj_r2", "oos_hit_rate", "expected_monthly_ret", "n")})
