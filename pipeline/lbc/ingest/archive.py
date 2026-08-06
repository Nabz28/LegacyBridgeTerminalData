"""Bridge deep history from the CEIC-style archive (macro.observations) into
the live series store (mkt.observation).

The archive holds 12k series and 1.6M observations going back decades, but it
is static: nothing updates it. The live scrapers cover the present but start
from whenever they were built. Percentiles and z-scores need both, so this
copies archive history into a live series, stopping where the live data begins
so a scraped value always wins over an archived one.
"""
from __future__ import annotations

from .. import db

# live series key -> (archive ric, human label for the log)
BRIDGES = {
    "cmd.coal.hba": ("CEICI354326367", "Indonesia HBA coal benchmark, monthly since 2009"),
}


def run(only: str | None = None) -> int:
    total = 0
    for series_key, (ric, label) in BRIDGES.items():
        if only and only != series_key:
            continue
        live = db.select("mkt", "observation",
                         f"select=date&series_key=eq.{series_key}&order=date.asc", limit=1)
        earliest_live = live[0]["date"] if live else None

        q = f"select=date,value&ric=eq.{ric}&order=date.asc"
        if earliest_live:
            q += f"&date=lt.{earliest_live}"
        rows = db.select("macro", "observations", q, limit=None)
        if not rows:
            print(f"  archive {series_key}: nothing to bridge")
            continue
        out = [{"series_key": series_key, "date": r["date"], "value": r["value"]}
               for r in rows if r.get("value") is not None]
        n = db.upsert("mkt", "observation", out, on_conflict="series_key,date", chunk=2000)
        total += n
        print(f"  archive {series_key}: +{n} rows from {label}"
              f" ({out[0]['date']} to {out[-1]['date']})")
    return total
