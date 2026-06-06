#!/usr/bin/env python3
"""sentiment_backtest.py — predictive-validity backtest of the news scoring engine.

For each historical news event (curated + taxonomy-matched), score it with the
LIVE engine (news_score.py) and check whether the bull/bear score matched the
ACTUAL forward market move (Yahoo daily closes — same OHLC TradingView shows):
  - region index: ID -> ^JKSE, US -> ^GSPC, Global -> ^GSPC
  - Indonesia FX: USDIDR=X (risk-on => rupiah stronger => USDIDR down)
  - per-target: each affect mapped to its instrument (JCI, IDR, SPX, UST10Y, USD, GOLD, OIL)

Expected direction is ENGINE-derived (sign of sent_score / per-target level), never
the curator's opinion. Forward returns at +1/+3/+5 trading days from the close on or
before the event date. Stdlib only.

    python scripts/sentiment_backtest.py events*.json
"""
import sys, json, glob, math, time, urllib.request, urllib.parse
sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
sys.path.insert(0, "scripts")
import news_score as ns

REGION_INDEX = {"ID": "^JKSE", "IDX": "^JKSE", "US": "^GSPC", "World": "^GSPC", "Global": "^GSPC"}
# target key -> (yahoo symbol, sign):  sign=+1 natural-up == price-up; -1 inverted
TARGET_INSTR = {
    "JCI": ("^JKSE", 1), "IDR": ("USDIDR=X", -1), "IDRNDF": ("USDIDR=X", -1),
    "SPX": ("^GSPC", 1), "UST10Y": ("^TNX", 1), "USD": ("DX-Y.NYB", 1),
    "GOLD": ("GC=F", 1), "OIL": ("CL=F", 1),
}
HORIZONS = [1, 3, 5]
_CACHE = {}


def chart(sym):
    if sym in _CACHE:
        return _CACHE[sym]
    p2 = int(time.time()); p1 = p2 - 430 * 86400
    u = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(sym) + f"?period1={p1}&period2={p2}&interval=1d"
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40))
        r = d["chart"]["result"][0]
        ts = r["timestamp"]; cl = r["indicators"]["quote"][0]["close"]
        series = [(int(t), c) for t, c in zip(ts, cl) if c is not None]
        _CACHE[sym] = series
        return series
    except Exception:
        _CACHE[sym] = []
        return []


def fwd_returns(sym, date_iso):
    """Forward % returns at +1/+3/+5 trading days from the close on/just-before date."""
    series = chart(sym)
    if not series:
        return {}
    target = int(time.mktime(time.strptime(date_iso[:10], "%Y-%m-%d")))
    base_i = None
    for i, (t, c) in enumerate(series):
        if t <= target + 86400:      # last close on or just after the event day
            base_i = i
        else:
            break
    if base_i is None or base_i + 1 >= len(series):
        return {}
    base = series[base_i][1]
    out = {}
    for h in HORIZONS:
        j = base_i + h
        if j < len(series) and base:
            out[h] = (series[j][1] / base - 1) * 100
    return out


def sgn(x):
    return 1 if x > 1e-9 else -1 if x < -1e-9 else 0


def backtest(events):
    rows = []
    for e in events:
        imps = e.get("impacts") or []
        res = ns.score_impacts(imps, e.get("surprise") or "partial", e.get("type"))
        score = res["sent_score"]
        region = e.get("region", "ID")
        idx_sym = REGION_INDEX.get(region, "^JKSE")
        idx_ret = fwd_returns(idx_sym, e["date"])
        idr_ret = fwd_returns("USDIDR=X", e["date"]) if region in ("ID", "IDX") else {}
        # engine-expected directions
        exp_idx = sgn(score)              # risk-on => index up
        exp_idr = -sgn(score)            # risk-on => rupiah stronger => USDIDR down
        hits_idx = {h: (sgn(idx_ret[h]) == exp_idx) for h in idx_ret} if score != 0 else {}
        # rupiah is below the tradeable noise floor (~0.4%/day) — only grade moves >= 0.5%
        hits_idr = {h: (sgn(idr_ret[h]) == exp_idr) for h in idr_ret if abs(idr_ret[h]) >= 0.5} if score != 0 else {}
        # per-target accuracy (mapped targets only)
        tgt_checks = []
        for a in res["affects"]:
            m = TARGET_INSTR.get(a["target"])
            if not m or a["level"] == 0:
                continue
            sym, isign = m
            r = fwd_returns(sym, e["date"])
            if 3 not in r:
                continue
            exp = sgn(a["level"]) * isign
            tgt_checks.append({"target": a["target"], "instr": sym, "exp": exp, "ret3": round(r[3], 2), "hit": sgn(r[3]) == exp})
        rows.append({
            "date": e["date"], "region": region, "headline": e.get("headline", "")[:90],
            "type": e.get("type"), "surprise": e.get("surprise"), "score": score,
            "label": res["sent_label"], "importance": res["importance"],
            "idx_sym": idx_sym, "idx_ret": {h: round(v, 2) for h, v in idx_ret.items()},
            "idr_ret": {h: round(v, 2) for h, v in idr_ret.items()},
            "hit_idx": hits_idx, "hit_idr": hits_idr, "tgt": tgt_checks,
        })
    return rows


def rate(flags):
    flags = [f for f in flags if f is not None]
    return (sum(1 for f in flags if f) / len(flags) * 100, len(flags)) if flags else (None, 0)


def main():
    files = []
    for pat in (sys.argv[1:] or ["bt_events.json"]):
        files += glob.glob(pat)
    events = []
    for f in files:
        d = json.load(open(f, encoding="utf-8-sig"))
        events += d if isinstance(d, list) else d.get("events", [])
    # dedup by date+headline
    seen = set(); uniq = []
    for e in events:
        kk = (e.get("date"), e.get("headline", "")[:50])
        if kk in seen or not e.get("date"):
            continue
        seen.add(kk); uniq.append(e)
    events = uniq
    rows = backtest(events)
    scored = [r for r in rows if r["score"] != 0 and 3 in r["hit_idx"]]
    # aggregates at +3d
    idx_all = [r["hit_idx"].get(3) for r in rows if 3 in r["hit_idx"]]
    print(f"\n=== SENTIMENT ENGINE BACKTEST — {len(rows)} events, {len(idx_all)} scored w/ prices ===")
    for h in HORIZONS:
        hr, n = rate([r["hit_idx"].get(h) for r in rows])
        print(f"  index hit-rate @+{h}d: {hr:.0f}% (n={n})" if hr is not None else f"  +{h}d: n/a")
    for reg in ("ID", "US", "Global"):
        hr, n = rate([r["hit_idx"].get(3) for r in rows if r["region"] in ((reg, "IDX") if reg == "ID" else (reg,))])
        if n: print(f"  [{reg}] index hit @+3d: {hr:.0f}% (n={n})")
    for imp in ("high", "med", "low"):
        hr, n = rate([r["hit_idx"].get(3) for r in rows if r["importance"] == imp])
        if n: print(f"  [{imp}] hit @+3d: {hr:.0f}% (n={n})")
    for sp in ("surprise", "likely", "partial", "priced"):
        hr, n = rate([r["hit_idx"].get(3) for r in rows if r["surprise"] == sp])
        if n: print(f"  [surprise={sp}] hit @+3d: {hr:.0f}% (n={n})")
    hr, n = rate([r["hit_idr"].get(3) for r in rows if 3 in r["hit_idr"]])
    if n: print(f"  IDR (rupiah) hit @+3d: {hr:.0f}% (n={n})")
    tgt_flags = [c["hit"] for r in rows for c in r["tgt"]]
    hr, n = rate(tgt_flags)
    if n: print(f"  per-target direction hit @+3d: {hr:.0f}% (n={n})")
    # magnitude rank alignment: |score| vs |idx move +3d|
    pairs = [(abs(r["score"]), abs(r["idx_ret"].get(3, 0))) for r in rows if 3 in r["idx_ret"] and r["score"] != 0]
    if len(pairs) > 3:
        def spearman(p):
            def ranks(v):
                s = sorted(range(len(v)), key=lambda i: v[i]); rk = [0] * len(v)
                for i, idx in enumerate(s): rk[idx] = i
                return rk
            a = ranks([x[0] for x in p]); b = ranks([x[1] for x in p]); n = len(p)
            d2 = sum((a[i] - b[i]) ** 2 for i in range(n))
            return 1 - 6 * d2 / (n * (n * n - 1))
        print(f"  magnitude rank-corr (|score| vs |move|): {spearman(pairs):+.2f} (n={len(pairs)})")
    # biggest misses (strong score, market went the other way at +3d)
    misses = sorted([r for r in rows if r["hit_idx"].get(3) is False], key=lambda r: -abs(r["score"]))[:10]
    print("\n  TOP MISSES (score vs +3d index move):")
    for r in misses:
        print(f"   {r['date']} [{r['region']}] score {r['score']:+d} ({r['label']}) idx {r['idx_ret'].get(3,'?'):>6}%  {r['headline'][:70]}")
    json.dump({"rows": rows}, open("bt_results.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"\n  wrote bt_results.json ({len(rows)} rows)")


if __name__ == "__main__":
    main()
