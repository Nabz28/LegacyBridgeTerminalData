#!/usr/bin/env python3
"""
scrape_bps.py — self-sourced Indonesian macro data → macro.series / macro.observations.

Refinitiv coverage for Indonesia is thin in places, so we self-source key BPS /
Bank Indonesia indicators via DBnomics (api.db.nomics.world) — an open, key-free
aggregator that redistributes official statistics (IMF IFS, OECD, World Bank,
which in turn source national agencies incl. BPS / BI). No API key, no fragile
HTML scraping. Each series is upserted under a clear `ID_*` RIC namespace
(no collision with Refinitiv `aID...` codes) and tagged `source` so it's
auditable and shows up as self-sourced in the catalog.

Index series additionally get a derived YoY%% companion (`*_YOY`) which is what
the sentiment engine consumes.

Stdlib only. Creds from env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/scrape_bps.py [--dry-run]
"""

import json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://adnubucjlezrtusbicja.supabase.co").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = SUPABASE_URL + "/rest/v1"
DBN = "https://api.db.nomics.world/v22"
DRY = "--dry-run" in sys.argv

# Curated indicator set. `dbn` = DBnomics provider/dataset/series path.
# derive_yoy: also publish a YoY%% companion (12-period change) for index series.
INDICATORS = [
    {"ric": "ID_CPI_IDX", "dbn": "IMF/IFS/M.ID.PCPI_IX", "freq": "P1M",
     "category": "Consumer Prices", "slug": "id_consumer_prices", "subcat": "CPI index",
     "units": "index", "desc": "Indonesia CPI — All items (index)",
     "meaning": "Consumer Price Index level for Indonesia (IMF IFS / BPS). Self-sourced via DBnomics.",
     "derive_yoy": True},
    {"ric": "ID_FX_IDRUSD", "dbn": "IMF/IFS/M.ID.ENDE_XDC_USD_RATE", "freq": "P1M",
     "category": "FX", "slug": "id_fx", "subcat": "Exchange rate",
     "units": "IDR per USD", "desc": "Indonesia exchange rate — IDR per USD (period end)",
     "meaning": "Rupiah per US dollar, end of period (IMF IFS / Bank Indonesia). Self-sourced via DBnomics.",
     "derive_yoy": False},
    {"ric": "ID_RESERVES_USD", "dbn": "IMF/IFS/M.ID.RAFA_USD", "freq": "P1M",
     "category": "External", "slug": "id_external", "subcat": "FX reserves",
     "units": "USD", "desc": "Indonesia official reserve assets (USD)",
     "meaning": "Total official reserve assets for Indonesia (IMF IFS / Bank Indonesia). Self-sourced via DBnomics.",
     "derive_yoy": False},
    {"ric": "ID_IP_IDX", "dbn": "IMF/IFS/M.ID.AIP_IX", "freq": "P1M",
     "category": "Production", "slug": "id_production", "subcat": "Industrial production index",
     "units": "index", "desc": "Indonesia industrial production (index)",
     "meaning": "Industrial production index for Indonesia (IMF IFS). Self-sourced via DBnomics.",
     "derive_yoy": True},
    {"ric": "ID_POLICY_RATE", "dbn": "IMF/IFS/M.ID.FPOLM_PA", "freq": "P1M",
     "category": "Monetary", "slug": "id_monetary", "subcat": "Policy rate",
     "units": "% p.a.", "desc": "Indonesia monetary policy rate (BI)",
     "meaning": "Bank Indonesia monetary policy rate (IMF IFS). Self-sourced via DBnomics.",
     "derive_yoy": False},
    {"ric": "ID_LENDING_RATE", "dbn": "IMF/IFS/M.ID.FILR_PA", "freq": "P1M",
     "category": "Monetary", "slug": "id_monetary", "subcat": "Lending rate",
     "units": "% p.a.", "desc": "Indonesia commercial lending rate",
     "meaning": "Average commercial bank lending rate, Indonesia (IMF IFS). Self-sourced via DBnomics.",
     "derive_yoy": False},
    {"ric": "ID_BROAD_MONEY", "dbn": "IMF/IFS/M.ID.FMB_XDC", "freq": "P1M",
     "category": "Monetary", "slug": "id_monetary", "subcat": "Broad money",
     "units": "IDR", "desc": "Indonesia broad money (M2-equivalent)",
     "meaning": "Broad money, Indonesia (IMF IFS / Bank Indonesia). Self-sourced via DBnomics.",
     "derive_yoy": True},
    {"ric": "ID_EXPORTS", "dbn": "IMF/IFS/M.ID.TXG_FOB_USD", "freq": "P1M",
     "category": "Trade", "slug": "id_trade", "subcat": "Exports (FOB)",
     "units": "USD millions", "desc": "Indonesia goods exports, FOB",
     "meaning": "Merchandise exports (FOB, USD), Indonesia (IMF IFS / BPS). Self-sourced via DBnomics.",
     "derive_yoy": True},
    {"ric": "ID_IMPORTS", "dbn": "IMF/IFS/M.ID.TMG_CIF_USD", "freq": "P1M",
     "category": "Trade", "slug": "id_trade", "subcat": "Imports (CIF)",
     "units": "USD millions", "desc": "Indonesia goods imports, CIF",
     "meaning": "Merchandise imports (CIF, USD), Indonesia (IMF IFS / BPS). Self-sourced via DBnomics.",
     "derive_yoy": True},
    {"ric": "ID_UNEMP_RATE", "dbn": "IMF/IFS/Q.ID.LUR_PT", "freq": "P3M",
     "category": "Labour", "slug": "id_labour", "subcat": "Unemployment rate",
     "units": "%", "desc": "Indonesia unemployment rate",
     "meaning": "Unemployment rate, Indonesia (IMF IFS / BPS). Quarterly; IFS lags the BPS release. Self-sourced via DBnomics.",
     "derive_yoy": False},
]

# Derived series computed AFTER ingest from two fetched series: (ric, A, B, op, meta).
DERIVED = [
    ("ID_TRADE_BAL", "ID_EXPORTS", "ID_IMPORTS", "sub",
     {"category": "Trade", "slug": "id_trade", "subcat": "Trade balance",
      "units": "USD millions", "desc": "Indonesia trade balance (exports FOB - imports CIF)",
      "meaning": "Goods trade balance = exports FOB - imports CIF (derived, IMF IFS). Note CIF inflates imports by freight/insurance (~3-8%), so the LEVEL is modestly biased; the engine uses it in momentum-mode where a constant bias cancels. Self-sourced.",
      "freq": "P1M"}),
]

def http_get_json(url):
    r = urllib.request.Request(url, headers={"User-Agent": "lbc-macro-scraper/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(r, timeout=40) as resp:
        return json.loads(resp.read().decode())

def _period_to_date(p):
    p = str(p)
    try:
        if len(p) == 4:                       # YYYY
            return p + "-12-31"
        if "-Q" in p or "Q" in p[4:]:         # YYYY-Qn
            yr = int(p[:4]); q = int(p[-1]); m = q * 3
            return "%04d-%02d-28" % (yr, m)
        if len(p) == 7:                       # YYYY-MM
            return p + "-28"
        if len(p) == 10:                      # YYYY-MM-DD
            return p
    except Exception:
        return None
    return None

def fetch_dbnomics(path):
    url = DBN + "/series/" + path + "?observations=1"
    try:
        d = http_get_json(url)
    except Exception as e:
        print("  ! fetch failed (%s): %s" % (path, e)); return []
    docs = (((d.get("series") or {}).get("docs")) or [])
    if not docs:
        print("  ! no docs for %s" % path); return []
    doc = docs[0]
    periods = doc.get("period") or []
    values = doc.get("value") or []
    out = []
    for p, v in zip(periods, values):
        if v is None or (isinstance(v, str) and v.upper() == "NA"):
            continue
        dt = _period_to_date(p)
        if dt:
            try: out.append((dt, float(v)))
            except Exception: pass
    return out

def yoy_series(obs, periods_per_year=12):
    """obs sorted ascending [(date,value)] -> YoY %% change companion.

    Rebasing guard (critique: CPI index rebasings create phantom double-digit YoY
    spikes if the index isn't back-spliced). We flag only GROSS month-over-month
    discontinuities (>15%) as likely splice artifacts and suppress the YoY across
    the affected 12-month window. The 15% threshold is deliberately high so that
    genuine administered-price (fuel-subsidy) shocks — which can run ~5-9% m/m and
    are REAL inflation signals — are preserved, not nuked.
    """
    obs = sorted(obs)
    breaks = set()
    for i in range(1, len(obs)):
        prev = obs[i - 1][1]
        if prev and abs(prev) > 1e-9 and abs(obs[i][1] / prev - 1.0) > 0.15:
            breaks.add(i)
    out = []
    for i in range(periods_per_year, len(obs)):
        # skip if any rebasing break falls inside the trailing 12-month window
        if any((i - periods_per_year) < b <= i for b in breaks):
            continue
        base = obs[i - periods_per_year][1]
        if base and abs(base) > 1e-9:
            out.append((obs[i][0], (obs[i][1] / base - 1.0) * 100.0))
    return out

def post(path, body, prefer):
    url = REST + path
    headers = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY,
               "Content-Type": "application/json", "Content-Profile": "macro", "Prefer": prefer}
    r = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(r, timeout=60) as resp:
        return resp.status

def upsert_series(row):
    if DRY: return
    post("/series?on_conflict=ric", row, "resolution=merge-duplicates,return=minimal")

def upsert_obs(ric, obs):
    if DRY: return 0
    rows = [{"ric": ric, "date": d, "value": v} for d, v in obs]
    # chunk to keep payloads modest
    n = 0
    for i in range(0, len(rows), 1000):
        post("/observations?on_conflict=ric,date", rows[i:i + 1000], "resolution=merge-duplicates,return=minimal")
        n += len(rows[i:i + 1000])
    return n

def main():
    if not SERVICE_KEY and not DRY:
        print("ERROR: set SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr); sys.exit(2)
    src = "DBnomics:IMF/IFS"
    total = 0
    fetched = {}
    for ind in INDICATORS:
        obs = fetch_dbnomics(ind["dbn"])
        if not obs:
            print("- %-16s SKIP (no data)" % ind["ric"]); continue
        obs = sorted(obs)
        fetched[ind["ric"]] = obs
        upsert_series({
            "ric": ind["ric"], "country": "id", "slug": ind["slug"],
            "category": ind["category"], "category_slug": ind["slug"], "subcategory": ind["subcat"],
            "description": ind["desc"], "frequency": ind["freq"], "units": ind["units"],
            "source": src, "meaning": ind["meaning"],
            "how_to_use": "Self-sourced (open data); cross-check vs Refinitiv where both exist.",
            "notes": "Ingested by scripts/scrape_bps.py", "related_series": [],
        })
        n = upsert_obs(ind["ric"], obs)
        total += n
        print("- %-16s %4d obs  (%s .. %s)" % (ind["ric"], len(obs), obs[0][0], obs[-1][0]))
        if ind.get("derive_yoy"):
            yo = yoy_series(obs, 12)
            if yo:
                yric = ind["ric"] + "_YOY"
                upsert_series({
                    "ric": yric, "country": "id", "slug": ind["slug"],
                    "category": ind["category"], "category_slug": ind["slug"], "subcategory": ind["subcat"] + " — YoY %",
                    "description": ind["desc"] + " — % YoY", "frequency": ind["freq"], "units": "% YoY",
                    "source": src + " (derived)", "meaning": "Year-on-year % change of " + ind["ric"] + ". Feeds the sentiment engine.",
                    "how_to_use": "Stationary momentum series for the sentiment engine.", "related_series": [ind["ric"]], "notes": "Derived YoY.",
                })
                ny = upsert_obs(yric, yo)
                total += ny
                print("  +-%-14s %4d obs  (derived YoY)" % (yric, len(yo)))

    # Derived combinations (e.g. trade balance = exports - imports), date-aligned.
    for ric, a, b, op, meta in DERIVED:
        oa, ob = fetched.get(a), fetched.get(b)
        if not oa or not ob:
            print("- %-16s SKIP (need %s & %s)" % (ric, a, b)); continue
        bm = {d: v for d, v in ob}
        out = []
        for d, v in oa:
            if d in bm:
                out.append((d, v - bm[d] if op == "sub" else v / bm[d]))
        if not out:
            print("- %-16s SKIP (no overlap)" % ric); continue
        upsert_series({
            "ric": ric, "country": "id", "slug": meta["slug"], "category": meta["category"],
            "category_slug": meta["slug"], "subcategory": meta["subcat"], "description": meta["desc"],
            "frequency": meta["freq"], "units": meta["units"], "source": src + " (derived)",
            "meaning": meta["meaning"], "how_to_use": "Derived series; cross-check components.",
            "related_series": [a, b], "notes": "Derived by scripts/scrape_bps.py",
        })
        n = upsert_obs(ric, sorted(out))
        total += n
        print("- %-16s %4d obs  (derived %s)" % (ric, len(out), op))

    print("\n%s %d observations across Indonesian self-sourced series." % ("[dry-run] would write" if DRY else "Wrote", total))

if __name__ == "__main__":
    main()
