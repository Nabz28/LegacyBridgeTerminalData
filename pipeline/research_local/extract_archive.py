"""Extract the CEIC-style archive and equity fundamentals into a LOCAL store.

Nothing here writes back to Supabase. The archive is read once, filtered to
series that actually have recent observations, and written to this folder as
JSON packs for analyst agents to read.

    python extract_archive.py            # all
    python extract_archive.py id idind   # selected countries
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from _datadir import data_dir

HERE = data_dir()
SUPABASE_URL = "https://adnubucjlezrtusbicja.supabase.co"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
PAGE = 1000


def rest(table: str, query: str, schema: str = "macro") -> list[dict]:
    """Paged PostgREST read. The 1000-row cap silently truncates otherwise."""
    rows, offset = [], 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{query}&limit={PAGE}&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}", "Accept-Profile": schema,
            "User-Agent": "lbc-archive-extract/1.0"})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    page = json.loads(r.read().decode())
                break
            except Exception as e:
                if attempt == 3:
                    raise
                import time
                time.sleep(2 ** attempt)
        rows.extend(page)
        if len(page) < PAGE:
            return rows
        offset += PAGE
        if offset > 400_000:
            return rows


def series_catalog(country: str, since: str) -> list[dict]:
    q = (f"select=ric,description,category,subcategory,section,frequency,units,source,"
         f"first_obs,last_obs,n_obs,meaning,how_to_use"
         f"&country=eq.{country}&last_obs=gte.{since}&order=category.asc")
    return rest("series", q)


def observations(rics: list[str], since: str) -> dict[str, list]:
    """Fetch observations for a batch of rics."""
    out: dict[str, list] = {}
    B = 60
    for i in range(0, len(rics), B):
        chunk = rics[i:i + B]
        inlist = ",".join(f'"{r}"' for r in chunk)
        q = (f"select=ric,date,value&ric=in.({urllib.parse.quote(inlist)})"
             f"&date=gte.{since}&order=ric.asc,date.asc")
        for row in rest("observations", q):
            out.setdefault(row["ric"], []).append([row["date"], row["value"]])
        print(f"    {min(i+B, len(rics))}/{len(rics)} series", end="\r")
    print()
    return out


def build(country: str, since_series: str = "2026-01-01", since_obs: str = "2018-01-01",
          max_series: int = 900):
    print(f"\n=== {country} ===")
    cat = series_catalog(country, since_series)
    print(f"  catalog: {len(cat)} series with observations since {since_series}")

    # Prefer series that are both recent and long enough to compute anything
    cat = [c for c in cat if (c.get("n_obs") or 0) >= 24]
    cat.sort(key=lambda c: (c.get("last_obs") or "", c.get("n_obs") or 0), reverse=True)

    # Quota per category, not a global top-N. Sorting the whole catalogue by recency and
    # slicing drops entire categories whose series happen to lag a few weeks: the 2026-08
    # extract lost US producer prices, housing, imports/exports and external debt that way,
    # and nobody noticed because the file simply wasn't there to be missed.
    per_cat: dict[str, list] = {}
    for c in cat:
        per_cat.setdefault(c.get("category") or "Uncategorised", []).append(c)
    quota = max(24, max_series // max(1, len(per_cat)))
    keep, overflow = [], []
    for name, members in per_cat.items():
        keep.extend(members[:quota])
        overflow.extend(members[quota:])
    # Spend whatever budget is left on the freshest series regardless of category
    overflow.sort(key=lambda c: (c.get("last_obs") or "", c.get("n_obs") or 0), reverse=True)
    keep.extend(overflow[:max(0, max_series - len(keep))])
    dropped = len(cat) - len(keep)
    print(f"  keeping {len(keep)} of {len(cat)} across {len(per_cat)} categories "
          f"(quota {quota}/category, {dropped} dropped)")

    obs = observations([c["ric"] for c in keep], since_obs)
    print(f"  observations fetched for {len(obs)} series")

    by_cat: dict[str, list] = {}
    for c in keep:
        series = obs.get(c["ric"], [])
        if len(series) < 12:
            continue
        vals = [v for _, v in series if v is not None]
        if not vals:
            continue
        latest = series[-1]
        shipped = series[-140:]
        # A pack that says first_obs=2014 alongside n_obs=100 invites the reader to treat the
        # shipped window as the whole record, and analysts did exactly that: "the highest in the
        # entire series" was written about a 2018-onward slice of a 2014-onward series, twice.
        # Ship the window, but make the truncation impossible to miss and state explicitly what
        # the window can and cannot support.
        rec = {
            "ric": c["ric"], "description": c["description"],
            "category": c.get("category"), "subcategory": c.get("subcategory"),
            "frequency": c.get("frequency"), "units": c.get("units"),
            "source": c.get("source"),
            "meaning": (c.get("meaning") or "")[:300],
            "first_obs": c.get("first_obs"), "last_obs": c.get("last_obs"),
            "n_obs_total": c.get("n_obs"),
            "n_obs_shipped": len(shipped),
            "observations_from": shipped[0][0] if shipped else None,
            "truncated": bool((c.get("n_obs") or 0) > len(shipped)),
            "latest": {"date": latest[0], "value": latest[1]},
            "observations": shipped,
        }
        if rec["truncated"]:
            rec["window_warning"] = (
                f"observations start {rec['observations_from']}, but the series runs from "
                f"{c.get('first_obs')} with {c.get('n_obs')} observations. Any 'highest/lowest "
                f"ever' claim must say 'since {rec['observations_from']}' or be re-checked "
                f"against macro.observations.")
        by_cat.setdefault(c.get("category") or "Uncategorised", []).append(rec)

    outdir = HERE / "archive"
    outdir.mkdir(exist_ok=True)
    written = []
    for category, recs in by_cat.items():
        slug = "".join(ch if ch.isalnum() else "_" for ch in category.lower())[:44]
        p = outdir / f"{country}__{slug}.json"
        p.write_text(json.dumps({
            "country": country, "category": category, "generated": dt.date.today().isoformat(),
            "n_series": len(recs), "series": recs,
        }, indent=1, default=str), encoding="utf-8")
        written.append({"country": country, "category": category, "file": p.name,
                        "n_series": len(recs), "bytes": p.stat().st_size})
        print(f"    {category[:38]:<40} {len(recs):>4} series  {p.stat().st_size:>9,}b")
    return written


def fundamentals():
    print("\n=== equity fundamentals ===")
    out = {}
    for table, schema, label in (("equity_screen", "public", "idx"),
                                 ("equity_screen_global", "public", "global")):
        try:
            rows = rest(table, "select=*", schema=schema)
        except Exception as e:
            print(f"  {table} failed: {e}")
            continue
        out[label] = rows
        print(f"  {label}: {len(rows)} names")
    p = HERE / "fundamentals.json"
    p.write_text(json.dumps({"generated": dt.date.today().isoformat(), **out},
                            indent=1, default=str), encoding="utf-8")
    print(f"  written {p.stat().st_size:,}b")
    return {"file": p.name, "idx": len(out.get("idx", [])), "global": len(out.get("global", []))}


if __name__ == "__main__":
    if not KEY:
        raise SystemExit("SUPABASE_SERVICE_ROLE not set")
    countries = sys.argv[1:] or ["id", "idind", "cn", "us"]
    manifest = {"generated": dt.date.today().isoformat(), "packs": []}
    for c in countries:
        # Storage is local and cheap; the binding constraint is what an analyst can read,
        # and the per-category quota means a higher ceiling widens coverage rather than
        # just deepening the same few categories. Set high enough that nothing is dropped
        # for any current country — a dropped series is one an analyst will later report as
        # non-existent, which is how two US notes came to be written around data that was
        # there all along.
        limit = 2600
        manifest["packs"] += build(c, max_series=limit)
    manifest["fundamentals"] = fundamentals()
    (HERE / "archive_manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    total = sum(p["bytes"] for p in manifest["packs"])
    print(f"\nTOTAL: {len(manifest['packs'])} packs, {total:,} bytes, stored LOCALLY in {HERE}")
