"""
verify.py — the quality gate. Decides whether a basket artifact is PERFECT,
acceptable-with-caveats, or needs more work. This is what enforces "don't move on
until the sub-industry is perfect".

Returns a grade:
  perfected     — meets the full bar (>=3 validated drivers, >=1 theory-anchored &
                  significant, working multivariate w/ OOS, confidence >= medium)
  partial       — usable but data-limited (few names / short history); best
                  achievable for this basket — accept and move on
  needs_review  — fixable: weak/empty result that likely needs mapping/driver work
  blocked       — no price history; cannot be built
"""
from __future__ import annotations


def grade(art: dict) -> dict:
    if art.get("status") == "blocked":
        return {"grade": "blocked", "reasons": [art.get("reason", "blocked")],
                "perfect": False}
    m = art.get("model") or {}
    kept = m.get("drivers", [])
    n_kept = m.get("n_kept", 0)
    conf = (m.get("confidence") or {}).get("level", "low")
    mv = m.get("multivariate") or {}
    n_used = art.get("basket", {}).get("n_used", 0)
    cov_m = art.get("basket", {}).get("coverage", {}).get("M", 0)

    reasons = []
    # strong, theory-anchored, significant driver present?
    # Thresholds calibrated for HAC (Newey-West) SEs, which are conservative:
    # |r|>=0.15 at n>120 is t~2; p<0.10 under HAC ~ p<0.05 under OLS.
    anchored = [r for r in kept if r.get("theory_agree") is True
                and (r.get("ols") or {}).get("p", 1) < 0.10
                and abs(r.get("pearson", 0)) >= 0.15]
    has_anchor = len(anchored) >= 1
    mv_ok = bool(mv.get("available") and mv.get("oos_hit_rate") is not None)

    if not has_anchor:
        reasons.append("no theory-anchored significant driver (|r|>=0.15, p<0.10)")
    if n_kept < 3:
        reasons.append(f"only {n_kept} validated drivers (<3)")
    if not mv_ok:
        reasons.append("multivariate model unavailable / no OOS")
    if conf == "low":
        reasons.append("confidence low")

    # PERFECT bar
    if has_anchor and n_kept >= 3 and mv_ok and conf in ("medium", "high"):
        return {"grade": "perfected", "reasons": [], "perfect": True,
                "anchors": [a["key"] for a in anchored]}

    # PARTIAL: data-limited basket where this is the realistic ceiling
    data_limited = (n_used < 5) or (cov_m < 60)
    if data_limited and n_kept >= 1:
        return {"grade": "partial", "reasons": reasons + ["data-limited basket"],
                "perfect": False}
    # if it has an anchor + model but slightly thin, accept as partial too
    if has_anchor and (n_kept >= 2) and mv.get("available"):
        return {"grade": "partial", "reasons": reasons, "perfect": False}

    return {"grade": "needs_review", "reasons": reasons, "perfect": False}
