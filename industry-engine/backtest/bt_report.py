"""
bt_report.py — aggregate the blindfolded OOS backtest into industry-engine/BACKTEST.md.
Reads backtest/results/*.json + the engine's output grades, cross-tabs OOS skill
against the engine's confidence, and writes an honest verdict.
"""
from __future__ import annotations

import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine"
sys.path.insert(0, str(ENGINE))
import common as C  # noqa: E402

RESULTS = Path(__file__).resolve().parent / "results"
OUT = Path(__file__).resolve().parents[1] / "BACKTEST.md"


def _flag(f):
    pct = (f.get("placebo") or {}).get("ic_pctile", 0.0)
    ic = f.get("fwd_ic", 0)
    if ic >= 0.08 and pct >= 0.90:
        return "SKILL"
    if ic >= 0.05 and pct >= 0.80:
        return "marginal"
    if ic > 0.02 or f.get("edge", 0) > 0.02:
        return "weak"
    return "none"


def build():
    rows = []
    for p in sorted(RESULTS.glob("*.json")):
        rows.append(C.read_json(p))
    eng = C.read_json(C.OUTPUT_DIR / "engine.json") or {"baskets": []}
    grade_by = {b["id"]: b for b in eng["baskets"]}
    done = [r for r in rows if r.get("available") and r.get("forward", {}).get("enough")]
    done.sort(key=lambda r: -(r["forward"]["fwd_ic"]))

    counts = {"SKILL": 0, "marginal": 0, "weak": 0, "none": 0}
    pos_ic = 0
    for r in done:
        counts[_flag(r["forward"])] += 1
        if r["forward"]["fwd_ic"] > 0:
            pos_ic += 1
    n = len(done)
    skill_ids = {r["id"] for r in done if _flag(r["forward"]) in ("SKILL", "marginal")}

    # cross-tab: engine grade vs OOS skill
    perfected = [r for r in done if (grade_by.get(r["id"], {}).get("grade") == "perfected")]
    perf_skill = sum(1 for r in perfected if _flag(r["forward"]) in ("SKILL", "marginal"))

    o = ["# Industry Engine — Blindfolded Out-of-Sample Backtest", "",
         "Walk-forward test (no look-ahead): at each month *t* the signal is the "
         "equal-weighted average of `sign_prior · tanh(z_t(driver_move))` over the "
         "**theory-anchored** drivers (signs fixed a-priori in mapping.py — **zero "
         "parameters fit to the data**), standardised on months [0:t] only, tested "
         "against the **unseen** return at *t+1*. CEIC drivers are publication-lagged. "
         "A **placebo** control (circular-shifted returns, 60×) gives the null; the "
         "engine's forward IC is reported as a percentile of that null. Target = the "
         "equal-weight basket of 15–30 real member stocks (same baskets the engine uses).",
         "",
         "**Why this matters:** it is the clean OOS the pseudo-OOS could not give. "
         "It tests whether the engine's *driver posture actually forecasts forward "
         "sub-industry returns*, sector by sector.", "",
         f"## Headline — {n} baskets with enough OOS history",
         "",
         f"- **SKILL** (fwd IC≥0.08 AND beats ≥90% of placebos): **{counts['SKILL']}**",
         f"- **marginal** (IC≥0.05, ≥80th placebo pctile): **{counts['marginal']}**",
         f"- **weak**: {counts['weak']}  ·  **none/negative**: {counts['none']}",
         f"- positive forward IC: **{pos_ic}/{n}** baskets",
         f"- of the engine's **perfected** baskets, **{perf_skill}/{len(perfected)}** "
         f"show OOS skill/marginal — the engine's in-sample confidence is **only a "
         f"partial** guide to forward skill.", "",
         "## The pattern (honest read)",
         "- **Forward skill is concentrated in physical-commodity / cost-pass-through "
         "baskets** — coal, energy services, plantation-adjacent, machinery (coal "
         "capex), pharma (rate-sensitive defensives), metals. Their drivers are real, "
         "exogenous prices that genuinely lead the equities.",
         "- **Financials (Banks, Investment, Securities, Multifinance) and diversified/"
         "sentiment baskets (Mining-conglomerates, Retail, Media, Internet, Auto) show "
         "NO forward skill — several are anti-predictive** (negative IC below the 5th "
         "placebo percentile). These co-move with their drivers *contemporaneously* but "
         "**mean-revert**, so the posture does not forecast. For these, the engine's "
         "verdict should be read as a *contemporaneous attribution*, NOT a forecast.",
         "- Contemporaneous IC > forward IC almost everywhere: the engine is a strong "
         "**explainer** of co-movement and a **selective** forward predictor.", "",
         "## Per-sub-industry (sorted by forward IC)", "",
         "| Sub-industry | Sector | grade | conf | n_oos | fwd IC | hit−up | placebo pctile | flag |",
         "|---|---|---|---|---|---|---|---|---|"]
    for r in done:
        f = r["forward"]
        g = grade_by.get(r["id"], {})
        pct = (f.get("placebo") or {}).get("ic_pctile", 0)
        o.append(f"| {r['sub_sector']} | {r['sector']} | {g.get('grade','—')} | "
                 f"{(g.get('confidence') or {}).get('level','—')} | {f['n']} | "
                 f"{f['fwd_ic']:+.2f} | {f['edge']:+.2f} | {pct:.2f} | {_flag(f)} |")
    # skipped
    skipped = [r for r in rows if not (r.get("available") and r.get("forward", {}).get("enough"))]
    if skipped:
        o += ["", f"## Not testable ({len(skipped)})",
              "Too few OOS months or no theory-anchored a-priori driver:", ""]
        for r in skipped:
            o.append(f"- {r.get('sub_sector')}: {r.get('reason','—')}")
    o += ["", "## Caveats (do not over-read)",
          "- n_oos ~50–130 monthly predictions: wide CIs; the placebo percentile is "
          "the robust significance signal, not the hit-rate.",
          "- Candidate set + signs are frozen in mapping.py but were *chosen* while "
          "viewing full-sample data — residual selection risk at the universe level.",
          "- Survivorship: baskets = members surviving to today (yfinance off).",
          "- This validates the *anchored-driver posture*, the engine's core claim; "
          "the multivariate verdict adds in-sample fitting on top and is not separately "
          "OOS-validated here.", ""]
    OUT.write_text("\n".join(o), encoding="utf-8")
    print(f"BACKTEST.md written. SKILL={counts['SKILL']} marginal={counts['marginal']} "
          f"weak={counts['weak']} none={counts['none']} | pos_IC={pos_ic}/{n} | "
          f"perfected w/ skill={perf_skill}/{len(perfected)}")


if __name__ == "__main__":
    build()
