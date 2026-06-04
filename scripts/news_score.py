#!/usr/bin/env python3
"""
news_score.py — deterministic, standardized news-impact scoring engine.

Institutional approach: the bear/bull score is NOT eyeballed. The agent only
MATCHES a headline to the taxonomy (news_taxonomy.json) — a news type, the
affected targets, each target's vol-normalized magnitude (level -5..+5 in its
own NATURAL direction), and an overall surprise (priced/partial/surprise). This
engine then computes the standardized score deterministically:

    contribution_t = weight(tier_t) * risk_sign_t * (level_t / 5)
    num   = Σ local_contrib + gl_scale * Σ gl_contrib   # gl_scale=0.5 haircut when GL & local agree
    den   = Σ weight over signal-bearing targets (GL weights also × gl_scale)
    raw   = surprise * num / sqrt(den)                  # sqrt → breadth adds signal
    score = 100 * tanh(GAIN * raw)        # bounded, no false saturation

    NOTE: `surprise` is one overall per-headline multiplier (not per-target), and
    importance is severity-by-magnitude (ignores sign — a big two-sided move is
    still "high"). Neutral targets (risk_sign 0, e.g. OIL for ID) carry no signal
    and are excluded from both numerator and denominator.

`risk_sign` maps each target's natural move to Indonesia risk-on/off (e.g. oil
up = risk-off => risk_sign -1), so the agent thinks in intuitive asset terms
while the score stays correct. Importance is DERIVED (peak weight*|level|*surprise),
not guessed — fully standardized. Methodology: docs/macro/NEWS_SCORING.md.

Stdlib only. Importable (used by post_news.py) and runnable for a self-test.
"""

import json, math, os

def load_taxonomy(path=None):
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "news_taxonomy.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)

_TAX = load_taxonomy()
TYPES = {t["key"]: t["label"] for t in _TAX["news_types"]}
TARGETS = {t["key"]: t for t in _TAX["targets"]}
TIER_W = {k: v["weight"] for k, v in _TAX["tiers"].items()}
_SURP = {k: v for k, v in _TAX["surprise"].items() if isinstance(v, (int, float))}
_ROLL = _TAX["rollup"]
GAIN = _ROLL["gain"]
FLAT = _ROLL.get("flat_threshold", 12)
GL_HAIRCUT = _ROLL.get("gl_correlation_haircut", 0.5)
_IMP = _ROLL["importance_thresholds"]
_DEFAULT_SURP = _SURP.get("partial", 0.45)

def validate_type(t):
    return t if t in TYPES else "other"

def score_impacts(impacts, surprise_key="partial"):
    """impacts: [{target, level (-5..5), note?}], surprise_key in {priced,partial,likely,surprise}.
    Returns {sent_score, sent_label, importance, surprise, affects, score_components}."""
    s = _SURP.get(surprise_key, _DEFAULT_SURP)
    rows = []
    for imp in (impacts or []):
        t = TARGETS.get(imp.get("target"))
        if not t:
            continue                                  # drop off-taxonomy target
        try:
            lvl = max(-5, min(5, int(round(float(imp.get("level", 0))))))
        except Exception:
            lvl = 0
        w = TIER_W.get(t["tier"], 0.30)
        contrib = w * t["risk_sign"] * (lvl / 5.0)
        rows.append({"target": imp["target"], "label": t["label"], "level": lvl,
                     "risk_sign": t["risk_sign"], "tier": t["tier"], "weight": w,
                     "note": imp.get("note", ""), "_c": contrib, "_gl": t["tier"] == "GL",
                     "_sev": w * abs(lvl)})

    # Aggregate with a sqrt(Σweight) denominator so BREADTH adds signal (a 5-asset
    # crisis outscores a 1-asset move) without a pile of marginal targets inflating it.
    local_sum = sum(r["_c"] for r in rows if not r["_gl"])
    gl_sum = sum(r["_c"] for r in rows if r["_gl"])
    gl_scale = 1.0
    if local_sum and gl_sum and (local_sum > 0) == (gl_sum > 0):
        gl_scale = GL_HAIRCUT                          # USD already explains the IDR move
    num = local_sum + gl_scale * gl_sum
    # Denominator mirrors the numerator: neutral (risk_sign==0, e.g. OIL) targets
    # carry NO signal so they must not consume denominator weight, and GL weights
    # are scaled by the same haircut so the haircut's net effect is the intended 50%.
    den = sum(r["weight"] * (gl_scale if r["_gl"] else 1.0)
              for r in rows if r["risk_sign"] != 0)
    raw = (num / math.sqrt(den)) * s if den > 0 else 0.0
    score = round(100 * math.tanh(GAIN * raw))

    # Importance from the top-3 weighted impacts (credits breadth, not just the peak).
    # Neutral-sign targets are excluded (a no-signal target can't make a story "high").
    sev = sorted((r["_sev"] for r in rows if r["risk_sign"] != 0), reverse=True) + [0.0, 0.0, 0.0]
    severity = (sev[0] + 0.5 * sev[1] + 0.25 * sev[2]) * s
    importance = "high" if severity >= _IMP["high"] else "med" if severity >= _IMP["med"] else "low"
    label = "pos" if score > FLAT else "neg" if score < -FLAT else "flat"

    clean = [{k: r[k] for k in ("target", "label", "level", "risk_sign", "tier", "weight", "note")} for r in rows]
    clean.sort(key=lambda c: c["weight"] * abs(c["level"]), reverse=True)
    return {
        "sent_score": score, "sent_label": label, "importance": importance,
        "surprise": surprise_key, "affects": clean,
        "score_components": {"raw": round(raw, 3), "severity": round(severity, 2),
                             "n_targets": len(clean), "gain": GAIN, "surprise_mult": s,
                             "gl_haircut": gl_scale},
    }

if __name__ == "__main__":
    # self-test: a central-bank-independence shock (the real ID example)
    demo = score_impacts([
        {"target": "IDR", "level": -3, "note": "rupiah vulnerable"},
        {"target": "SBN10Y", "level": 3, "note": "spread widening"},
        {"target": "JCI", "level": -2},
        {"target": "IDFLOWBOND", "level": -3, "note": "foreign selling"},
        {"target": "IDRATING", "level": -2, "note": "credibility risk"},
    ], surprise_key="surprise")
    print(json.dumps(demo, indent=2))
    print("\ntargets in taxonomy:", len(TARGETS), "| news types:", len(TYPES))
