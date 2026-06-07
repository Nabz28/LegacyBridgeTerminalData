#!/usr/bin/env python3
"""sentiment_backtest_v2.py — HONEST event-study re-measurement (post 9-level critique).

Fixes the measurement flaws the critics found (L1/L4/L7/L9):
  * CLUSTER-COLLAPSE: one observation per (date, region) — a single market move was
    being counted 2-3x (e.g. three 2026-05-20 ID events share one -1.77% JCI move).
  * MARKET-ADJUSTED abnormal returns for single-name events: AR = r_stock - beta*r_JKSE,
    beta from a trailing 60-trading-day OLS ending BEFORE the event (no look-ahead).
  * DRIFT NULL: benchmark vs 'always predict the trailing-drift sign', not 50%
    (ID actually drifted DOWN ~59% of windows, so 50% is the wrong null).
  * NO outcome-conditional gate (removed the IDR |move|>=0.5% selection bias).
  * WILSON 95% CI on every rate; report n_eff.
  * HUMAN-TAG-ONLY CONTROL ARM: predict from sign(sum risk_sign*level), surprise-gated,
    with NO engine math (no tiers/sqrt/tanh/transmission). The engine's marginal skill is
    (engine - tag). If ~0, the engine adds nothing over the analyst's tags.

Run: python scripts/sentiment_backtest_v2.py ".bt/*.json"
"""
import sys, os, json, glob, math, time, urllib.request, urllib.parse, itertools
sys.path.insert(0, "scripts")
import news_score as ns

REGION_INDEX = {"ID": "^JKSE", "IDX": "^JKSE", "US": "^GSPC", "World": "^GSPC", "Global": "^GSPC"}
PRICE_CACHE = ".bt_prices.json"
_CHART = {}


def chart(sym):
    if sym in _CHART:
        return _CHART[sym]
    p2 = int(time.time()); p1 = p2 - 520 * 86400
    u = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(sym) + f"?period1={p1}&period2={p2}&interval=1d"
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40))
        r = d["chart"]["result"][0]
        _CHART[sym] = [(int(t), c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c is not None]
    except Exception:
        _CHART[sym] = []
    return _CHART[sym]


def idx_at(series, date_iso):
    tg = int(time.mktime(time.strptime(date_iso[:10], "%Y-%m-%d")))
    bi = None
    for i, (t, _) in enumerate(series):
        if t <= tg + 86400:
            bi = i
        else:
            break
    return bi


def fwd_raw(sym, date_iso, h):
    s = chart(sym)
    bi = idx_at(s, date_iso) if s else None
    if bi is None or bi + h >= len(s) or not s[bi][1]:
        return None
    return (s[bi + h][1] / s[bi][1] - 1) * 100


def beta(stock_sym, idx_sym, date_iso, win=60):
    """trailing OLS beta of stock daily returns on index, ending 5d BEFORE event (no look-ahead)."""
    ss, si = chart(stock_sym), chart(idx_sym)
    bi_s, bi_i = idx_at(ss, date_iso), idx_at(si, date_iso)
    if bi_s is None or bi_i is None:
        return 1.0
    end = bi_s - 5
    if end - win < 1:
        return 1.0
    # align by date
    sd = {t: c for t, c in ss}
    pairs = []
    prev_s = prev_i = None
    for k in range(end - win, end):
        if k < 1 or k >= len(si):
            continue
        ti, ci = si[k]; ti0, ci0 = si[k - 1]
        cs = sd.get(ti); cs0 = sd.get(ti0)
        if cs and cs0 and ci0:
            pairs.append((ci / ci0 - 1, cs / cs0 - 1))
    if len(pairs) < 20:
        return 1.0
    mx = sum(p[0] for p in pairs) / len(pairs); my = sum(p[1] for p in pairs) / len(pairs)
    cov = sum((x - mx) * (y - my) for x, y in pairs); var = sum((x - mx) ** 2 for x in (p[0] for p in pairs))
    return cov / var if var > 1e-12 else 1.0


def fwd_abnormal(stock_sym, idx_sym, date_iso, h):
    rs = fwd_raw(stock_sym, date_iso, h); ri = fwd_raw(idx_sym, date_iso, h)
    if rs is None or ri is None:
        return None
    return rs - beta(stock_sym, idx_sym, date_iso) * ri


def wilson(k, n):
    if n == 0:
        return (None, None, None)
    p = k / n; z = 1.96
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(p * 100), round((c - h) * 100), round((c + h) * 100))


def sgn(x):
    return 1 if (x is not None and x > 1e-9) else -1 if (x is not None and x < -1e-9) else 0


def load_events(pats):
    ev = []
    for pat in pats:
        for f in glob.glob(pat):
            d = json.load(open(f, encoding="utf-8-sig"))
            ev += d if isinstance(d, list) else d.get("events", [])
    seen, u = set(), []
    for e in ev:
        k = (e.get("date"), e.get("headline", "")[:45])
        if e.get("date") and k not in seen:
            seen.add(k); u.append(e)
    return u


def tag_only_sign(e):
    """Control arm: sign of sum(risk_sign*level) from the human tags ONLY; abstain if telegraphed."""
    if (e.get("surprise") or "") == "telegraphed":
        return 0
    s = 0.0
    for imp in (e.get("impacts") or []):
        t = ns.TARGETS.get(imp.get("target"))
        if not t:
            continue
        try:
            lvl = float(imp.get("level", 0))
        except Exception:
            lvl = 0
        s += t["risk_sign"] * lvl
    return sgn(s)


def main():
    events = load_events(sys.argv[1:] or [".bt/*.json"])
    H = 3
    # cluster-collapse: one obs per (date, region) — keep the highest |engine score|
    groups = {}
    for e in events:
        res = ns.score_impacts(e.get("impacts"), e.get("surprise") or "partial", e.get("type"))
        e["_score"] = res["sent_score"]; e["_tag"] = tag_only_sign(e)
        key = (e["date"][:10], e.get("region", "ID"))
        if key not in groups or abs(e["_score"]) > abs(groups[key]["_score"]):
            groups[key] = e
    obs = list(groups.values())
    print(f"events {len(events)} -> {len(obs)} independent (date,region) observations after cluster-collapse\n")

    eng_hits, tag_hits, drift_hits = [], [], []
    by_region = {}
    for e in obs:
        region = e.get("region", "ID")
        idx_sym = REGION_INDEX.get(region, "^JKSE")
        single = bool(e.get("ticker"))
        if single:
            tk = e["ticker"].strip().upper(); stock = tk + ".JK" if region in ("ID", "IDX") and not tk.endswith(".JK") else tk
            ret = fwd_abnormal(stock, idx_sym, e["date"], H)        # market-adjusted
        else:
            ret = fwd_raw(idx_sym, e["date"], H)                    # index move (raw; drift-null below)
        drift = fwd_raw(idx_sym, e["date"], -1)                     # prior-day move as cheap drift proxy
        if ret is None:
            continue
        sc = e["_score"]
        if sc != 0:
            eng_hits.append(sgn(sc) == sgn(ret))
            by_region.setdefault(region, []).append(sgn(sc) == sgn(ret))
        if e["_tag"] != 0:
            tag_hits.append(e["_tag"] == sgn(ret))
        # drift null: always predict the prior-trend sign
        if drift is not None and sgn(drift) != 0:
            drift_hits.append(sgn(drift) == sgn(ret))

    def line(label, flags):
        k = sum(1 for f in flags if f); n = len(flags)
        p, lo, hi = wilson(k, n)
        print(f"  {label:<34} {p}%  (n={n}, 95% CI {lo}-{hi}%)" if p is not None else f"  {label}: n/a")

    print(f"HONEST DIRECTIONAL HIT-RATE @+{H}d (cluster-collapsed, market-adjusted single-names):")
    line("ENGINE (full math)", eng_hits)
    line("HUMAN TAGS ONLY (control arm)", tag_hits)
    line("DRIFT null (predict prior trend)", drift_hits)
    ke, ne = sum(eng_hits), len(eng_hits); kt, nt = sum(tag_hits), len(tag_hits)
    if ne and nt:
        print(f"\n  ENGINE vs TAG-ONLY delta: {round(ke/ne*100 - kt/nt*100)} pp  (positive = engine adds skill over the analyst's tags)")
    print("\n  by region (engine):")
    for r in ("US", "ID", "Global"):
        if r in by_region:
            line("  " + r, by_region[r])
    json.dump({"obs": len(obs), "engine_n": ne, "engine_hits": ke, "tag_n": nt, "tag_hits": kt}, open("bt_v2_results.json", "w"), indent=1)
    print("\n  NOTE: t=0 uses date-only close alignment (no intraday timestamps) — a known residual caveat.")


if __name__ == "__main__":
    main()
