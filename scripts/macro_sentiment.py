#!/usr/bin/env python3
"""
macro_sentiment.py — compute the macro sentiment engine and publish snapshots.

Reads hard macro data (Refinitiv + scraped, via PostgREST), scores a parsimonious
set of clean YoY indicators into Growth / Labor / Inflation / Liquidity / External
pillars, blends in the last 48h of news sentiment, and writes one row per region
to macro.sentiment. Full audit trail goes in components (every ric/value/score).

Methodology: docs/macro/SENTIMENT_ENGINE.md  (keep this script and that doc in sync).

Stdlib only. Credentials from env:
    SUPABASE_URL                 (default: the LBC project)
    SUPABASE_SERVICE_ROLE_KEY    (required to write)

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/macro_sentiment.py
    ... --dry-run        # compute + print, do not write
"""

import json
import math
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://adnubucjlezrtusbicja.supabase.co").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = SUPABASE_URL + "/rest/v1"
DRY = "--dry-run" in sys.argv

# ── Curated indicator map ────────────────────────────────────────────────────
# Refinitiv "% YoY, Standardized" family (consistent cross-country naming) plus a
# few level series (policy rate). direction: +1 risk-on when rising, -1 risk-off.
# Missing/stale RICs are skipped at runtime and reported in components.coverage.
#   pillar in {growth, labor, inflation, liquidity, external}
def _map(cc):
    P = "a" + cc + "C"   # aUSC / aIDC / aCNC
    m = {
        "growth": [
            (P + "GDPYD/A", +1, "Real GDP YoY"),
            (P + "INDYG/CA", +1, "Industrial production YoY"),
            (P + "EMPYO/A", +1, "Payroll employment YoY"),
        ],
        "labor": [
            (P + "UNPYQ/A", -1, "Unemployment rate YoY"),
            (P + "UNPYP", -1, "Unemployment level YoY"),
        ],
        "inflation": [
            (P + "CPIYE/A", +1, "CPI YoY"),
            (P + "PPIYE/A", +1, "PPI YoY"),
        ],
        "liquidity": [
            (P + "MS2YB/A", +1, "M2 money supply YoY"),
        ],
        "external": [
            (P + "CURYQ/A", +1, "Current account %GDP YoY"),
        ],
    }
    return m

INDICATOR_MAP = {
    "US": _map("US"),
    "ID": _map("ID"),
    "CN": _map("CN"),
}
# Region-specific extras (validated codes that don't follow the YoY family).
INDICATOR_MAP["US"]["liquidity"].append(("aUSFEDFUNDT", -1, "Fed funds target (level)"))
INDICATOR_MAP["ID"]["growth"].append(("aIDRSLSAR", +1, "Retail sales YoY"))
# Self-sourced Indonesian series (scripts/scrape_bps.py) — fills Refinitiv gaps.
INDICATOR_MAP["ID"]["inflation"].append(("ID_CPI_IDX_YOY", +1, "CPI YoY (self-sourced, BPS/IMF)"))
INDICATOR_MAP["ID"]["external"].append(("ID_RESERVES_USD", +1, "FX reserves (self-sourced)"))
INDICATOR_MAP["ID"]["external"].append(("ID_FX_IDRUSD", -1, "IDR/USD — weaker = risk-off (self-sourced)"))

PILLAR_WEIGHTS = {"growth": 0.40, "labor": 0.15, "liquidity": 0.20, "external": 0.10}
INFLATION_PENALTY = 0.15  # accelerating inflation = tightening pressure = risk-off
GLOBAL_GDP_WEIGHTS = {"US": 0.55, "CN": 0.30, "ID": 0.15}
TREND_WINDOW = 60   # trailing obs for mean/std (monthly ≈ 5y)
MIN_OBS = 16
STALE_MONTHS = 18

# ── HTTP ─────────────────────────────────────────────────────────────────────
def _req(path, method="GET", body=None, profile="macro", prefer=None):
    url = REST + path
    headers = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
    if method == "GET":
        headers["Accept-Profile"] = profile
    else:
        headers["Content-Type"] = "application/json"
        headers["Content-Profile"] = profile
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=40) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw.strip() else []

def get_observations(ric):
    q = "/observations?select=date,value&ric=eq." + urllib.parse.quote(ric, safe="") + "&order=date.asc"
    try:
        rows = _req(q)
    except Exception:
        return []
    out = []
    for x in rows:
        v = x.get("value")
        if v is None:
            continue
        try:
            d = datetime.fromisoformat(str(x["date"])[:10])
        except Exception:
            continue
        out.append((d, float(v)))
    return out

# ── stats ────────────────────────────────────────────────────────────────────
def _mean(a): return sum(a) / len(a) if a else 0.0
def _std(a):
    if len(a) < 2: return 0.0
    m = _mean(a); return math.sqrt(sum((x - m) ** 2 for x in a) / len(a))
def _clip(x, lo, hi): return max(lo, min(hi, x))

def score_indicator(ric, direction):
    """Return (score in [-1,1] signed, info dict) or (None, info) if unusable."""
    obs = get_observations(ric)
    info = {"ric": ric, "n": len(obs)}
    if len(obs) < MIN_OBS:
        info["skip"] = "insufficient_obs"
        return None, info
    last_date, last_val = obs[-1]
    # staleness
    age_months = (datetime.now() - last_date).days / 30.4
    if age_months > STALE_MONTHS:
        info["skip"] = "stale"; info["asof"] = last_date.date().isoformat()
        return None, info
    vals = [v for _, v in obs]
    window = vals[-TREND_WINDOW:]
    mu, sd = _mean(window), _std(window)
    if sd < 1e-9:
        info["skip"] = "flat"
        return None, info
    z_level = (last_val - mu) / sd
    back = vals[-4] if len(vals) >= 4 else vals[0]   # ~3 obs back
    z_accel = (last_val - back) / sd
    raw = _clip(0.6 * z_level + 0.4 * z_accel, -2.5, 2.5) / 2.5
    signed = raw * direction
    info.update(asof=last_date.date().isoformat(), value=round(last_val, 3),
                z_level=round(z_level, 2), z_accel=round(z_accel, 2),
                score=round(signed, 3), dir=direction)
    return signed, info

# ── news ────────────────────────────────────────────────────────────────────
def news_score(region):
    """Confidence-weighted, 48h linearly-decayed mean of news sent_score."""
    since = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    regions = [region] if region != "Global" else None
    q = "/news?select=sent_score,confidence,ts,region&ts=gte." + urllib.parse.quote(since, safe="")
    if regions:
        q += "&region=eq." + region
    try:
        rows = _req(q)
    except Exception:
        return None, 0
    num, den, n = 0.0, 0.0, 0
    now = datetime.now(timezone.utc)
    for x in rows:
        s = x.get("sent_score")
        if s is None:
            continue
        try:
            ts = datetime.fromisoformat(str(x["ts"]).replace("Z", "+00:00"))
        except Exception:
            continue
        age_h = max(0.0, (now - ts).total_seconds() / 3600)
        decay = max(0.0, 1 - age_h / 48)
        conf = float(x.get("confidence") or 0.6)
        w = decay * conf
        num += w * float(s); den += w; n += 1
    if den <= 0:
        return None, 0
    return num / den, n

# ── compute one region ───────────────────────────────────────────────────────
def compute_region(region):
    pillars = {}
    components = {"indicators": {}, "coverage": {}}
    for pillar, inds in INDICATOR_MAP[region].items():
        scores = []
        for ric, direction, label in inds:
            s, info = score_indicator(ric, direction)
            info["label"] = label
            components["indicators"][ric] = info
            if s is not None:
                scores.append(s)
        components["coverage"][pillar] = "%d/%d" % (len(scores), len(inds))
        pillars[pillar] = _mean(scores) if scores else None

    # regime axes
    growth_parts = [pillars[p] for p in ("growth", "labor") if pillars.get(p) is not None]
    G = _mean(growth_parts) if growth_parts else 0.0
    I = pillars.get("inflation")
    I = I if I is not None else 0.0

    if abs(G) < 0.15 and abs(I) < 0.15:
        regime = "Neutral"
    elif G >= 0 and I >= 0:
        regime = "Reflation"
    elif G >= 0 and I < 0:
        regime = "Goldilocks"
    elif G < 0 and I >= 0:
        regime = "Stagflation"
    else:
        regime = "Risk-off"

    # composite (renormalize weights over available pillars)
    contrib, wsum = 0.0, 0.0
    for p, w in PILLAR_WEIGHTS.items():
        if pillars.get(p) is not None:
            contrib += w * pillars[p]; wsum += w
    base = (contrib / wsum) if wsum > 0 else 0.0
    base -= INFLATION_PENALTY * max(0.0, I)
    data_score = round(100 * _clip(base, -1, 1), 1)

    ns, n_news = news_score(region)
    if ns is not None:
        composite = round(0.65 * data_score + 0.35 * ns, 1)
    else:
        composite = data_score

    components.update(pillars={k: (round(v, 3) if v is not None else None) for k, v in pillars.items()},
                      G=round(G, 3), I=round(I, 3), n_news=n_news,
                      weights=PILLAR_WEIGHTS, inflation_penalty=INFLATION_PENALTY)

    headline = _headline(region, regime, data_score, composite, pillars)
    return {
        "region": region, "data_score": data_score,
        "news_score": (round(ns, 1) if ns is not None else None),
        "composite": composite, "regime": regime,
        "components": components, "headline": headline, "by": "engine",
        "ts": datetime.now(timezone.utc).isoformat(),
    }

def _headline(region, regime, data, comp, pillars):
    tone = "risk-on" if comp > 15 else "risk-off" if comp < -15 else "mixed"
    g = pillars.get("growth"); infl = pillars.get("inflation")
    bits = ["%s: %s, %s read (composite %s%s)" % (region, regime, tone, "+" if comp >= 0 else "", comp)]
    if g is not None:
        bits.append("growth %s" % ("firming" if g > 0.1 else "softening" if g < -0.1 else "flat"))
    if infl is not None:
        bits.append("inflation %s" % ("accelerating" if infl > 0.1 else "cooling" if infl < -0.1 else "stable"))
    return "; ".join(bits) + "."

def compute_global(regions):
    parts, wsum, ns_parts = 0.0, 0.0, []
    for r in regions:
        if r["region"] in GLOBAL_GDP_WEIGHTS and r["data_score"] is not None:
            w = GLOBAL_GDP_WEIGHTS[r["region"]]
            parts += w * r["data_score"]; wsum += w
    data_score = round(parts / wsum, 1) if wsum > 0 else 0.0
    ns, n_news = news_score("Global")
    composite = round(0.65 * data_score + 0.35 * ns, 1) if ns is not None else data_score
    return {
        "region": "Global", "data_score": data_score,
        "news_score": (round(ns, 1) if ns is not None else None),
        "composite": composite, "regime": "Blend",
        "components": {"method": "GDP-weighted blend of US/CN/ID", "weights": GLOBAL_GDP_WEIGHTS, "n_news": n_news},
        "headline": "Global (GDP-weighted): composite %s%s." % ("+" if composite >= 0 else "", composite),
        "by": "engine", "ts": datetime.now(timezone.utc).isoformat(),
    }

def main():
    if not SERVICE_KEY:
        print("ERROR: set SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(2)
    rows = [compute_region(r) for r in ("US", "ID", "CN")]
    rows.append(compute_global(rows))
    for r in rows:
        print("[%s] composite=%s data=%s news=%s regime=%s | %s" % (
            r["region"], r["composite"], r["data_score"], r["news_score"], r["regime"], r["headline"]))
    if DRY:
        print("\n(dry-run — not written). Sample components (US):")
        print(json.dumps(rows[0]["components"], indent=2)[:1600])
        return
    _req("/sentiment", method="POST", body=rows, prefer="return=minimal")
    print("\nWrote %d sentiment snapshots to macro.sentiment." % len(rows))

if __name__ == "__main__":
    main()
