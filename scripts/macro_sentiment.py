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
# Indicator tuple = (ric, direction, label, mode). mode:
#   'rate'  — series is already a YoY rate / stationary: score level-vs-history + momentum
#   'level' — series is a raw level (policy rate, reserves, FX): score MOMENTUM ONLY
#             (a level z-scored vs its own 5y mean never inflects on a turn — critique #7)
def _map(cc):
    P = "a" + cc + "C"   # aUSC / aIDC / aCNC
    return {
        "growth": [
            (P + "GDPYD/A", +1, "Real GDP YoY", "rate"),
            (P + "INDYG/CA", +1, "Industrial production YoY", "rate"),
            (P + "EMPYO/A", +1, "Payroll employment YoY", "rate"),
        ],
        # Labor: unemployment RATE only — the level YoY is ~the same series (critique #6).
        "labor": [
            (P + "UNPYQ/A", -1, "Unemployment rate YoY", "rate"),
        ],
        "inflation": [
            (P + "CPIYE/A", +1, "CPI YoY", "rate"),
            (P + "PPIYE/A", +1, "PPI YoY", "rate"),
        ],
        "liquidity": [
            (P + "MS2YB/A", +1, "M2 money supply YoY", "rate"),
        ],
        # External: current-account-%GDP-YoY dropped — slow, noisy, and sign-ambiguous
        # for EMs (CA improves in recessions). Populated per-region below where a
        # higher-frequency signal exists.
        "external": [],
    }

INDICATOR_MAP = {"US": _map("US"), "ID": _map("ID"), "CN": _map("CN")}
# Region-specific extras.
INDICATOR_MAP["US"]["liquidity"].append(("aUSFEDFUNDT", -1, "Fed funds target", "level"))  # momentum-scored
INDICATOR_MAP["ID"]["growth"].append(("aIDRSLSAR", +1, "Retail sales YoY", "rate"))
# Self-sourced Indonesian series (scripts/scrape_bps.py) — fills Refinitiv gaps.
INDICATOR_MAP["ID"]["inflation"].append(("ID_CPI_IDX_YOY", +1, "CPI YoY (self-sourced)", "rate"))
INDICATOR_MAP["ID"]["external"].append(("ID_RESERVES_USD", +1, "FX reserves", "level"))
INDICATOR_MAP["ID"]["external"].append(("ID_FX_IDRUSD", -1, "IDR/USD (weaker = risk-off)", "level"))

# Positive pillars (renormalized over those with data). Inflation is handled
# separately as a TWO-SIDED term (rewards disinflation, penalizes acceleration).
PILLAR_WEIGHTS = {"growth": 0.40, "labor": 0.15, "liquidity": 0.20, "external": 0.10}
INFLATION_WEIGHT = 0.20      # magnitude of the two-sided inflation term
SINGLE_INDICATOR_CAP = 0.5   # a pillar with one indicator contributes at half weight (critique #5)
GLOBAL_WEIGHTS = {"US": 0.55, "CN": 0.30, "ID": 0.15}  # deliberate Indonesia home-tilt (NOT true GDP shares)
TREND_YEARS = 5             # calendar trailing window for mean/std (critique #2)
ACCEL_MONTHS = 3            # calendar horizon for the momentum term (critique #3)
MIN_OBS = 16
STALE_MONTHS = 14

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
def _std(a, ddof=1):
    if len(a) <= ddof: return 0.0
    m = _mean(a); return math.sqrt(sum((x - m) ** 2 for x in a) / (len(a) - ddof))
def _median(a):
    s = sorted(a); n = len(s)
    if not n: return 0.0
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0
def _clip(x, lo, hi): return max(lo, min(hi, x))
def _shift_years(d, yrs):
    try: return d.replace(year=d.year + yrs)
    except ValueError: return d.replace(year=d.year + yrs, day=28)

def score_indicator(ric, direction, mode):
    """Return (score in [-1,1] signed, info) or (None, info) if unusable.

    'rate'  series: 0.65 level-vs-history + 0.35 momentum, tanh-squashed.
    'level' series: momentum only (a level z-scored vs its mean never inflects).
    Normalization excludes the current point (no in-sample leakage), uses a
    CALENDAR trailing window, sample std (ddof=1), and a frequency-adaptive
    momentum step normalized by its own diff-std.
    """
    obs = get_observations(ric)
    info = {"ric": ric, "n": len(obs), "mode": mode}
    if len(obs) < MIN_OBS:
        info["skip"] = "insufficient_obs"; return None, info
    last_date, last_val = obs[-1]
    age_months = (datetime.now(timezone.utc).replace(tzinfo=None) - last_date).days / 30.4
    if age_months > STALE_MONTHS:
        info["skip"] = "stale"; info["asof"] = last_date.date().isoformat(); return None, info

    # calendar window (last TREND_YEARS); fall back to all obs if too few in window
    cutoff = _shift_years(last_date, -TREND_YEARS)
    window = [(d, v) for d, v in obs if d >= cutoff]
    if len(window) < MIN_OBS:
        window = obs[-max(MIN_OBS, len(window)):]

    # frequency-adaptive momentum step ≈ ACCEL_MONTHS calendar months
    spac = [(window[i][0] - window[i - 1][0]).days for i in range(1, len(window))]
    med = _median(spac) if spac else 30.0
    step = max(1, round(ACCEL_MONTHS * 30.4 / med)) if med > 0 else 1

    hist = [v for _, v in window[:-1]]                  # exclude the scored point
    mu, sd = _mean(hist), _std(hist, ddof=1)
    diffs = [window[i][1] - window[i - step][1] for i in range(step, len(window))]
    sd_diff = _std(diffs, ddof=1)
    last_diff = window[-1][1] - window[-1 - step][1] if len(window) > step else 0.0

    z_level = (last_val - mu) / sd if sd > 1e-9 else 0.0
    z_accel = last_diff / sd_diff if sd_diff > 1e-9 else 0.0

    if mode == "level":
        raw = math.tanh(z_accel / 2.0)                  # direction of change only
    else:
        if sd <= 1e-9 and sd_diff <= 1e-9:
            info["skip"] = "flat"; return None, info
        raw = math.tanh((0.65 * z_level + 0.35 * z_accel) / 2.0)
    signed = raw * direction
    info.update(asof=last_date.date().isoformat(), value=round(last_val, 3),
                z_level=round(z_level, 2), z_accel=round(z_accel, 2),
                step=step, score=round(signed, 3), dir=direction)
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
        age_h = (now - ts).total_seconds() / 3600
        if age_h < 0 or age_h > 48:          # skip future-dated (clock skew) or stale
            continue
        decay = 1 - age_h / 48
        conf = float(x.get("confidence") or 0.6)
        w = decay * conf
        num += w * float(s); den += w; n += 1
    if den <= 0:
        return None, 0
    return num / den, n

# ── compute one region ───────────────────────────────────────────────────────
def compute_region(region):
    pv, pn = {}, {}
    components = {"indicators": {}, "coverage": {}}
    for pillar, inds in INDICATOR_MAP[region].items():
        scores = []
        for ric, direction, label, mode in inds:
            s, info = score_indicator(ric, direction, mode)
            info["label"] = label
            components["indicators"][ric] = info
            if s is not None:
                scores.append(s)
        components["coverage"][pillar] = "%d/%d" % (len(scores), len(inds))
        pv[pillar] = _mean(scores) if scores else None
        pn[pillar] = len(scores)

    # Growth axis: weight growth pillar over labor (labor partly restates growth — critique #7).
    gparts = []
    if pv.get("growth") is not None: gparts.append((pv["growth"], 0.7))
    if pv.get("labor") is not None: gparts.append((pv["labor"], 0.3))
    G = (sum(v * w for v, w in gparts) / sum(w for _, w in gparts)) if gparts else 0.0
    I = pv.get("inflation") if pv.get("inflation") is not None else 0.0

    dead = 0.12  # Neutral deadband (calibrated by eye on the score scale; documented)
    if abs(G) < dead and abs(I) < dead:
        regime = "Neutral"
    elif G >= 0 and I >= 0: regime = "Reflation"
    elif G >= 0 and I < 0:  regime = "Goldilocks"
    elif G < 0 and I >= 0:  regime = "Stagflation"
    else:                   regime = "Risk-off"

    # Positive pillars, renormalized; single-indicator pillars contribute at reduced weight.
    contrib, wsum = 0.0, 0.0
    for p, w in PILLAR_WEIGHTS.items():
        if pv.get(p) is None: continue
        eff = w * (SINGLE_INDICATOR_CAP if pn.get(p, 0) <= 1 else 1.0)
        contrib += eff * pv[p]; wsum += eff
    base = (contrib / wsum) if wsum > 0 else 0.0
    # Two-sided inflation: accelerating (I>0) = tightening = risk-off; disinflation
    # (I<0) = easing impulse = risk-on (critique #4 — the engine now rewards disinflation).
    infl_term = -INFLATION_WEIGHT * _clip(I, -1, 1)
    data_score = round(100 * math.tanh(base + infl_term), 1)

    ns, n_news = news_score(region)
    if ns is not None:
        ns = _clip(ns, -100, 100)
        composite = round(_clip(0.65 * data_score + 0.35 * ns, -100, 100), 1)
    else:
        composite = data_score

    components.update(pillars={k: (round(v, 3) if v is not None else None) for k, v in pv.items()},
                      G=round(G, 3), I=round(I, 3), n_news=n_news,
                      weights=PILLAR_WEIGHTS, inflation_weight=INFLATION_WEIGHT)
    pillars = pv  # for _headline

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
    parts, wsum = 0.0, 0.0
    for r in regions:
        if r["region"] in GLOBAL_WEIGHTS and r["data_score"] is not None:
            w = GLOBAL_WEIGHTS[r["region"]]
            parts += w * r["data_score"]; wsum += w
    data_score = round(parts / wsum, 1) if wsum > 0 else 0.0
    ns, n_news = news_score("Global")
    if ns is not None:
        ns = _clip(ns, -100, 100)
        composite = round(_clip(0.65 * data_score + 0.35 * ns, -100, 100), 1)
    else:
        composite = data_score
    return {
        "region": "Global", "data_score": data_score,
        "news_score": (round(ns, 1) if ns is not None else None),
        "composite": composite, "regime": "Blend",
        "components": {"method": "weighted blend of US/CN/ID (Indonesia home-tilt, not true GDP shares)", "weights": GLOBAL_WEIGHTS, "n_news": n_news},
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
