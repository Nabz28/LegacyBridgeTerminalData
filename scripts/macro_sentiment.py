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
import time
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
# Liquidity = price (policy rate) + ONE quantity aggregate. The Refinitiv M2
# (MS2YB) is dropped for ID to avoid triple-counting the monetary stance.
INDICATOR_MAP["ID"]["liquidity"] = [
    ("ID_POLICY_RATE", -1, "BI policy rate (self-sourced)", "level"),
    ("ID_BROAD_MONEY_YOY", +1, "Broad money YoY (self-sourced)", "rate"),
]
# External = reserves + FX + trade balance + exports. Exports moved OUT of growth:
# for a commodity exporter, exports-YoY is a terms-of-trade/external signal driven
# by global prices, not domestic activity — counting it in growth mislabels the regime.
INDICATOR_MAP["ID"]["external"] = [
    ("ID_RESERVES_USD", +1, "FX reserves", "level"),
    ("ID_FX_IDRUSD", -1, "IDR/USD (weaker = risk-off)", "level"),
    ("ID_TRADE_BAL", +1, "Trade balance (self-sourced)", "level"),
    ("ID_EXPORTS_YOY", +1, "Exports YoY (self-sourced)", "rate"),
]

# Positive pillars (renormalized over those with data). Inflation is handled
# separately as a TWO-SIDED term (rewards disinflation, penalizes acceleration).
PILLAR_WEIGHTS = {"growth": 0.40, "labor": 0.15, "liquidity": 0.20, "external": 0.10}
INFLATION_WEIGHT = 0.20      # magnitude of the two-sided inflation term
SINGLE_INDICATOR_CAP = 0.5   # a pillar with one indicator contributes at half weight (critique #5)
GLOBAL_WEIGHTS = {"US": 0.55, "CN": 0.30, "ID": 0.15}  # deliberate Indonesia home-tilt (NOT true GDP shares)
TREND_YEARS = 5             # calendar trailing window for mean/std (critique #2)
ACCEL_MONTHS = 3            # calendar horizon for the momentum term (critique #3)
MIN_OBS = 16
# Staleness gates are deliberately LENIENT because IFS-via-DBnomics (Indonesia)
# legitimately lags 3–12 months — that data isn't "broken," just slow, and is the
# best freely available. Truly dead series still drop; everything surviving is
# AGE-WEIGHTED (full→0.3 past ~3mo), so a lagging print contributes at reduced,
# not full, conviction. (Timely Refinitiv US/CN data gets full weight.)
STALE_MONTHS_MONTHLY = 15
STALE_MONTHS_LOWFREQ = 30   # quarterly/lower (GDP, unemployment)
SQUASH = 2.0                # tanh saturation divisor (named; was a magic /2.0)

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
    # Retry on transient network failure. CRITICAL: a swallowed fetch error must
    # NOT masquerade as "no data" — that silently collapses a whole pillar and
    # corrupts the read. After retries we RAISE so the caller marks fetch_error
    # (visible) rather than treating it as an empty series.
    q = "/observations?select=date,value&ric=eq." + urllib.parse.quote(ric, safe="") + "&order=date.asc"
    last = None
    for attempt in range(4):
        try:
            rows = _req(q)
            break
        except Exception as e:
            last = e
            if attempt < 3:
                time.sleep(1.0 + attempt)
    else:
        raise RuntimeError("fetch_failed for %s: %s" % (ric, last))
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
def _mad_sigma(a, med=None):
    # Median absolute deviation, scaled to a normal-consistent sigma (×1.4826).
    if len(a) < 2: return 0.0
    m = med if med is not None else _median(a)
    return 1.4826 * _median([abs(x - m) for x in a])
def _robust_scale(sample):
    """Robust dispersion (MAD-sigma, mean/std fallback). 0.0 if degenerate."""
    if len(sample) < 2: return 0.0
    sig = _mad_sigma(sample)
    return sig if sig > 1e-9 else _std(sample, ddof=1)
def _robust_z(x, sample):
    """Median-centered robust z (for level-vs-history)."""
    if len(sample) < 2: return 0.0
    med = _median(sample); sc = _robust_scale(sample)
    return (x - med) / sc if sc > 1e-9 else 0.0
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
    try:
        obs = get_observations(ric)
    except Exception:
        info = {"ric": ric, "mode": mode, "skip": "fetch_error"}
        return None, info
    info = {"ric": ric, "n": len(obs), "mode": mode}
    if len(obs) < MIN_OBS:
        info["skip"] = "insufficient_obs"; return None, info
    last_date, last_val = obs[-1]
    age_months = (datetime.now(timezone.utc).replace(tzinfo=None) - last_date).days / 30.4
    info["asof"] = last_date.date().isoformat(); info["age_months"] = round(age_months, 1)

    # calendar window (last TREND_YEARS); fall back to all obs if too few in window
    cutoff = _shift_years(last_date, -TREND_YEARS)
    window = [(d, v) for d, v in obs if d >= cutoff]
    if len(window) < MIN_OBS:
        window = obs[-max(MIN_OBS, len(window)):]

    # frequency-adaptive momentum step ≈ ACCEL_MONTHS calendar months
    spac = [(window[i][0] - window[i - 1][0]).days for i in range(1, len(window))]
    med = _median(spac) if spac else 30.0
    step = max(1, round(ACCEL_MONTHS * 30.4 / med)) if med > 0 else 1

    # Per-frequency staleness: a MONTHLY series 13 months old is broken, not lagging.
    stale_gate = STALE_MONTHS_MONTHLY if med < 45 else STALE_MONTHS_LOWFREQ
    if age_months > stale_gate:
        info["skip"] = "stale"; return None, info

    hist = [v for _, v in window[:-1]]                  # exclude the scored point
    diffs = [window[i][1] - window[i - step][1] for i in range(step, len(window))]
    last_diff = window[-1][1] - window[-1 - step][1] if len(window) > step else 0.0
    scale_d = _robust_scale(diffs)

    # Robust normalization. z_level is median-centered (where are we vs normal);
    # z_accel is centered on ZERO (is the series moving now), scaled by the robust
    # spread of its own k-step diffs. Both winsorized to tame fat tails.
    z_level = _clip(_robust_z(last_val, hist), -3.5, 3.5)
    z_accel = _clip(last_diff / scale_d, -3.5, 3.5) if scale_d > 1e-9 else 0.0

    if mode == "level":
        if scale_d <= 1e-9:                              # constant level → no signal
            info["skip"] = "flat"; return None, info
        raw = math.tanh(z_accel / SQUASH)                # direction of change only
    else:
        if abs(z_level) < 1e-12 and abs(z_accel) < 1e-12:
            info["skip"] = "flat"; return None, info
        raw = math.tanh((0.65 * z_level + 0.35 * z_accel) / SQUASH)
    signed = raw * direction
    # Age-decay: full weight to ~3 months old, tapering to a floor of 0.3 by ~18m,
    # so a lagging IFS print can't assert current-month conviction.
    w_age = _clip(1.0 - max(0.0, age_months - 3.0) / 15.0, 0.3, 1.0)
    info.update(value=round(last_val, 3), z_level=round(z_level, 2), z_accel=round(z_accel, 2),
                step=step, score=round(signed, 3), dir=direction, w_age=round(w_age, 2))
    return signed, info

# ── news ────────────────────────────────────────────────────────────────────
NEWS_WINDOW_H = 168          # 7-day lookback
NEWS_HALFLIFE_H = 72         # exponential decay, 3-day half-life

def news_score(region):
    """Confidence-weighted, exponentially-decayed (3-day half-life) mean of
    news sent_score over a 7-day window. Smoother than a hard 48h cliff and
    keeps the news leg populated between bursts of headlines."""
    since = (datetime.now(timezone.utc) - timedelta(hours=NEWS_WINDOW_H)).isoformat()
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
        if age_h < 0 or age_h > NEWS_WINDOW_H:   # skip future-dated (clock skew) or stale
            continue
        decay = 0.5 ** (age_h / NEWS_HALFLIFE_H)
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
                scores.append((s, info.get("w_age", 1.0)))   # age-weighted
        components["coverage"][pillar] = "%d/%d" % (len(scores), len(inds))
        if scores:
            wsum_p = sum(w for _, w in scores)
            pv[pillar] = (sum(s * w for s, w in scores) / wsum_p) if wsum_p > 0 else _mean([s for s, _ in scores])
        else:
            pv[pillar] = None
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
    data_raw = base + infl_term                       # pre-squash
    data_score = round(100 * math.tanh(data_raw), 1)

    # News blends at the SAME pre-tanh raw scale as the data (news_score/100),
    # so 0.35 means 0.35 of comparable variance — not a raw-±100 leg overwhelming
    # a tanh-compressed data leg (critique: data/news scale mismatch).
    ns, n_news = news_score(region)
    if ns is not None:
        ns = _clip(ns, -100, 100)
        composite = round(100 * math.tanh(0.65 * data_raw + 0.35 * (ns / 100.0)), 1)
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
