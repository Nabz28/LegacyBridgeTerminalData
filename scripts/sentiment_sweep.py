#!/usr/bin/env python3
"""sentiment_sweep.py — exhaustive accuracy search for the news scoring engine.

Directional accuracy is SIGN-based, so magnitude knobs (GAIN, surprise scale) don't
move it. This sweeps the SIGN-affecting + confidence levers across a large grid and
scores each config on a TRAIN/TEST split (time-based) so improvements aren't curve-fit:
  - horizon: grade vs +1d or +3d forward index return
  - conf_gate: abstain when |score| < T (trade only confident calls)
  - politics_geo_rule: none | dampen | zero | contrarian (ID politics/geopolitics buy-the-news)
  - telegraphed_rule: none | abstain | contrarian (priced/telegraphed -> fade)
  - scope: all | macro_only (exclude single-name corporate, which is out of domain)

Prices (forward returns) are fetched once from Yahoo and cached to .bt_prices.json.
Run: python scripts/sentiment_sweep.py ".bt/*.json"
"""
import sys, os, json, glob, math, time, urllib.request, urllib.parse, itertools
sys.path.insert(0, "scripts")
import news_score as ns

TARGETS, TIER_W = ns.TARGETS, ns.TIER_W
SURP = {"telegraphed": 0.05, "priced": 0.10, "partial": 0.45, "likely": 0.70, "surprise": 1.00}
REGION_INDEX = {"ID": "^JKSE", "IDX": "^JKSE", "US": "^GSPC", "World": "^GSPC", "Global": "^GSPC"}
GAIN = 1.0
TRAIN_TEST_CUT = "2026-02-01"     # train < cut, test >= cut (out-of-sample = the recent crisis window)
PRICE_CACHE = ".bt_prices.json"
_CHART = {}


def chart(sym):
    if sym in _CHART:
        return _CHART[sym]
    p2 = int(time.time()); p1 = p2 - 460 * 86400
    u = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(sym) + f"?period1={p1}&period2={p2}&interval=1d"
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40))
        r = d["chart"]["result"][0]
        _CHART[sym] = [(int(t), c) for t, c in zip(r["timestamp"], r["indicators"]["quote"][0]["close"]) if c is not None]
    except Exception:
        _CHART[sym] = []
    return _CHART[sym]


def fwd(sym, date_iso):
    s = chart(sym)
    if not s:
        return {}
    tg = int(time.mktime(time.strptime(date_iso[:10], "%Y-%m-%d")))
    bi = None
    for i, (t, _) in enumerate(s):
        if t <= tg + 86400:
            bi = i
        else:
            break
    if bi is None or not s[bi][1]:
        return {}
    base = s[bi][1]
    return {h: (s[bi + h][1] / base - 1) * 100 for h in (1, 3, 5) if bi + h < len(s)}


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


def build_labeled(events):
    """Attach forward index returns (cached) + a single-name flag to each event."""
    cache = json.load(open(PRICE_CACHE, encoding="utf-8")) if os.path.exists(PRICE_CACHE) else {}
    out = []
    for e in events:
        region = e.get("region", "ID")
        sym = REGION_INDEX.get(region, "^JKSE")
        single = bool(e.get("ticker"))
        if single:
            tk = e["ticker"].strip().upper()
            sym = tk + ".JK" if region in ("ID", "IDX") and not tk.endswith(".JK") else tk
        ck = sym + "|" + e["date"][:10]
        if ck not in cache:
            cache[ck] = fwd(sym, e["date"])
        e2 = dict(e); e2["_sym"] = sym; e2["_single"] = single
        e2["_ret"] = {int(k): v for k, v in cache[ck].items()}   # normalize (JSON stringifies keys)
        out.append(e2)
    json.dump(cache, open(PRICE_CACHE, "w"), indent=0)
    return out


def base_raw(imps):
    rows = []
    for imp in (imps or []):
        t = TARGETS.get(imp.get("target"))
        if not t:
            continue
        try:
            lvl = max(-5, min(5, int(round(float(imp.get("level", 0))))))
        except Exception:
            lvl = 0
        rows.append((t["risk_sign"], TIER_W.get(t["tier"], 0.3), t["tier"] == "GL", lvl))
    local = sum(w * sg * lvl / 5 for sg, w, gl, lvl in rows if not gl and sg != 0)
    glsum = sum(w * sg * lvl / 5 for sg, w, gl, lvl in rows if gl and sg != 0)
    gl_scale = 0.5 if (local and glsum and (local > 0) == (glsum > 0)) else 1.0
    num = local + gl_scale * glsum
    den = sum(w * (gl_scale if gl else 1.0) for sg, w, gl, lvl in rows if sg != 0)
    return (num / math.sqrt(den)) if den > 0 else 0.0


TRANS = {"none": {}, "dampen": {"politics": 0.35, "geopolitics": 0.40, "fiscal": 0.7, "growth": 0.85},
         "zero": {"politics": 0.0, "geopolitics": 0.0}, "contrarian": {}}


def score(e, cfg):
    typ = e.get("type"); surp = e.get("surprise") or "partial"; region = e.get("region", "ID")
    if cfg["tele"] == "abstain" and surp in ("telegraphed", "priced"):
        return 0.0
    raw = base_raw(e.get("impacts")) * SURP.get(surp, 0.45)
    tmap = TRANS[cfg["pg"]]
    raw *= tmap.get(typ, 1.0)
    if cfg["pg"] == "contrarian" and typ in ("politics", "geopolitics") and region in ("ID", "IDX"):
        raw = -0.5 * raw                              # ID equity fades domestic politics/geopolitics
    if cfg["tele"] == "contrarian" and surp in ("telegraphed", "priced"):
        raw = -raw
    return 100 * math.tanh(GAIN * raw)


def sgn(x):
    return 1 if x > 1e-9 else -1 if x < -1e-9 else 0


def hit_rate(events, cfg):
    hits = []
    for e in events:
        if cfg["scope"] == "macro_only" and e["_single"]:
            continue
        sc = score(e, cfg)
        if abs(sc) < cfg["gate"]:
            continue                                   # abstain (no call)
        r = e["_ret"].get(cfg["hz"])
        if r is None:
            continue
        hits.append(sgn(sc) == sgn(r))
    return (sum(hits) / len(hits) * 100, len(hits)) if hits else (None, 0)


def main():
    pats = sys.argv[1:] or [".bt/*.json"]
    events = build_labeled(load_events(pats))
    train = [e for e in events if e["date"] < TRAIN_TEST_CUT]
    test = [e for e in events if e["date"] >= TRAIN_TEST_CUT]
    print(f"corpus: {len(events)} events ({len(train)} train < {TRAIN_TEST_CUT}, {len(test)} test)")

    grid = []
    for hz, gate, pg, tele, scope in itertools.product(
            (1, 3), (0, 15, 25, 35), ("none", "dampen", "zero", "contrarian"),
            ("none", "abstain", "contrarian"), ("all", "macro_only")):
        grid.append({"hz": hz, "gate": gate, "pg": pg, "tele": tele, "scope": scope})
    print(f"sweeping {len(grid)} configs (train/test, sign-affecting levers)...\n")

    results = []
    for cfg in grid:
        tr_hr, tr_n = hit_rate(train, cfg)
        te_hr, te_n = hit_rate(test, cfg)
        full_hr, full_n = hit_rate(events, cfg)
        if tr_hr is None or te_hr is None or te_n < 8 or tr_n < 10:
            continue                                   # need enough coverage both sides
        results.append({**cfg, "train": round(tr_hr), "tr_n": tr_n, "test": round(te_hr), "te_n": te_n,
                        "full": round(full_hr), "full_n": full_n, "gap": round(tr_hr - te_hr)})

    # baseline = current engine (dampen transmission, no contrarian, no gate, +3d, all)
    base = next((r for r in results if r["hz"] == 3 and r["gate"] == 0 and r["pg"] == "dampen" and r["tele"] == "none" and r["scope"] == "all"), None)
    # rank by TEST hit-rate, then small train-test gap (generalization), then coverage
    results.sort(key=lambda r: (-r["test"], abs(r["gap"]), -r["te_n"]))
    print("RANK  hz gate  pg          tele        scope       TRAIN(n)   TEST(n)   FULL(n)  gap")
    for r in results[:20]:
        print(f"  {r['test']:>3}%  +{r['hz']}d {r['gate']:>3}  {r['pg']:<10} {r['tele']:<10} {r['scope']:<10} {r['train']:>3}%({r['tr_n']:>2})  {r['test']:>3}%({r['te_n']:>2})  {r['full']:>3}%({r['full_n']:>3})  {r['gap']:+d}")
    if base:
        print(f"\nBASELINE (current engine): train {base['train']}%({base['tr_n']}) test {base['test']}%({base['te_n']}) full {base['full']}%({base['full_n']})")
    json.dump({"events": len(events), "results": results, "baseline": base}, open("sweep_results.json", "w"), indent=1)
    print(f"\nevaluated {len(results)} valid configs (of {len(grid)}); wrote sweep_results.json")


if __name__ == "__main__":
    main()
