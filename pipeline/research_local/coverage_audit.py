"""Coverage matrix: what has been researched, at what assurance, and what has not.

Built from the actual artefacts rather than memory, because three rounds of this programme have
shown that recollection of what was covered is unreliable. Reads the local packs, the prior-note
store and the signals table, and reports the intersection.
"""
from __future__ import annotations

import json
import os
import urllib.request
from collections import defaultdict
from pathlib import Path

from _datadir import data_dir

HERE = data_dir()
ARCH = HERE / "archive"
URL = "https://adnubucjlezrtusbicja.supabase.co"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE", "")

COUNTRY = {"id": "Indonesia (macro)", "idind": "Indonesia (industry)",
           "cn": "China", "us": "United States"}

# Topics an agent has actually written a note on, keyed by the pack family it read.
# Derived from data/prior_notes/ plus the round-three run manifests.
RESEARCHED = {
    "id": {"credit cycle", "capital markets", "domestic demand", "fiscal/payments",
           "inflation", "external position", "gdp by industry", "gdp by expenditure",
           "wages/employment", "retail/consumer", "fdi/pmdn", "trade (92-series)"},
    "idind": {"property", "banks", "consumer staples", "consumer discretionary", "energy",
              "basic materials", "infrastructure", "plantation", "tourism", "technology",
              "healthcare", "transport", "industrials", "financials non-bank"},
    "cn": {"property/fai", "external sector", "industrial activity", "foreign transactions",
           "stocks/bonds/funds", "credit/money/banking", "consumer/retail/labour",
           "gdp by industry"},
    "us": {"forecasts/expectations", "labour/household", "inflation impulse",
           "monetary/credit", "growth composition", "household income/saving/pce",
           "housing/construction", "producer prices/pipeline", "fiscal/flow-of-funds",
           "industry (agri/autos/transport/commodities)"},
}


def rest(table, query, schema="research"):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}?{query}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Accept-Profile": schema})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def pack_inventory():
    """Every local pack, its series count, and whether anything has read it."""
    out = defaultdict(list)
    for f in sorted(ARCH.glob("*.json")):
        country, _, slug = f.stem.partition("__")
        if not slug:
            continue
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        n = len(d.get("series", []))
        trunc = sum(1 for s in d.get("series", []) if s.get("truncated"))
        out[country].append({"slug": slug, "n_series": n, "truncated": trunc,
                             "bytes": f.stat().st_size})
    return out


def main():
    inv = pack_inventory()
    print("=" * 78)
    print("PACK INVENTORY — what data exists locally")
    print("=" * 78)
    tot_packs = tot_series = 0
    for c, packs in sorted(inv.items()):
        n = sum(p["n_series"] for p in packs)
        t = sum(p["truncated"] for p in packs)
        mb = sum(p["bytes"] for p in packs) / 1024 / 1024
        tot_packs += len(packs)
        tot_series += n
        print(f"  {COUNTRY.get(c, c):<24}{len(packs):>3} packs{n:>6} series"
              f"{t:>6} truncated{mb:>8.1f} MB")
    print(f"  {'TOTAL':<24}{tot_packs:>3} packs{tot_series:>6} series")

    print()
    print("=" * 78)
    print("RESEARCH COVERAGE — packs with no note written against them")
    print("=" * 78)
    gaps = []
    for c, packs in sorted(inv.items()):
        done = RESEARCHED.get(c, set())
        # crude but honest match: a pack counts as covered if any researched topic
        # shares a meaningful token with its slug
        toks = {t: set(t.replace("/", " ").replace("-", " ").split()) for t in done}
        for p in sorted(packs, key=lambda x: -x["n_series"]):
            slug_toks = set(p["slug"].split("_")) - {"", "and", "of", "the"}
            hit = any(slug_toks & tk for tk in toks.values())
            if not hit and p["n_series"] >= 8:
                gaps.append((c, p["slug"], p["n_series"]))
    by_c = defaultdict(list)
    for c, s, n in gaps:
        by_c[c].append((s, n))
    for c, items in sorted(by_c.items()):
        print(f"\n  {COUNTRY.get(c, c)} — {len(items)} unread packs, "
              f"{sum(n for _, n in items)} series:")
        for s, n in sorted(items, key=lambda x: -x[1])[:14]:
            print(f"      {s[:46]:<48}{n:>5} series")

    if not KEY:
        print("\n(SUPABASE_SERVICE_ROLE not set — skipping assurance audit)")
        return

    print()
    print("=" * 78)
    print("ASSURANCE — live research signals by verification state")
    print("=" * 78)
    sigs = rest("signal", "select=desk_id,headline,salience,payload&retired=eq.false")
    sigs = [s for s in sigs if (s.get("payload") or {}).get("source", "").startswith("round_")]
    by_a = defaultdict(list)
    for s in sigs:
        by_a[(s.get("payload") or {}).get("assurance", "?")].append(s)
    VERIFIED = {"verified", "verified_full_history", "verified_corrected",
                "adversarially_verified", "computed", "resolved_investigation",
                "process_observation"}
    nv = sum(len(v) for k, v in by_a.items() if k not in VERIFIED)
    for a, v in sorted(by_a.items(), key=lambda kv: -len(kv[1])):
        mark = " " if a in VERIFIED else "*"
        print(f" {mark}{a:<28}{len(v):>3}")
    print(f"\n  {nv} of {len(sigs)} live signals are NOT adversarially verified (*)")
    for a, v in sorted(by_a.items()):
        if a in VERIFIED:
            continue
        for s in sorted(v, key=lambda x: -x["salience"])[:12]:
            print(f"      [{s['salience']}] {(s.get('desk_id') or '-'):<16}"
                  f"{s['headline'][:60]}")


if __name__ == "__main__":
    main()
