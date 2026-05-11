"""Build per-agent batch input files for US polls hand-curation.
Partitions 366 polls RICs into 5 topical batches (~73 each).
"""
from __future__ import annotations
import json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLLS_JSON = os.path.join(REPO, "catalog", "us", "us_polls.json")
BATCHES_DIR = os.path.join(REPO, "data", "us_polls_batches")

# Group indicators into 5 thematic clusters
GROUPS = {
    1: ("GDP & Productivity",
        ["GDP Advance", "GDP 2nd Estimate", "GDP Sales Advance", "GDP Sales Prelim", "GDP Sales Final",
         "GDP Deflator Advance", "GDP Deflator Prelim", "GDP Deflator Final",
         "Productivity Prelim"]),
    2: ("ISM Surveys & Business Activity",
        ["ISM Manufacturing PMI", "ISM Manuf Employment Idx", "ISM Mfg Prices Paid",
         "ISM N-Mfg PMI", "ISM N-Mfg Employment Idx", "ISM N-Mfg Bus Act",
         "KC Fed Manufacturing", "KC Fed Composite Index",
         "NAHB Housing Market Indx",
         "Industrial Production MM", "Manuf Output MM"]),
    3: ("Housing & Real Estate",
        ["Housing Starts Number", "Building Permits: Number", "Existing Home Sales",
         "Exist. Home Sales % Chg"]),
    4: ("Trade, Capital Flows, Prices",
        ["International Trade $", "Foreign Buying, T-Bonds", "Net L-T Flows,Exswaps",
         "Import Prices MM", "Import Prices YY", "Export Prices MM",
         "Federal Budget,$"]),
    5: ("Labor, Durables, Agri",
        ["JOLTS Job Openings", "Durable Goods", "Durables Ex-Defense MM",
         "Durables Ex-Transport", "Nondefe Cap Ex-Air", "Nondef Cap Ex-Air R MM",
         "Factory Orders MM",
         "Bean Oil Stocks", "NOPA-Soy Crush",
         "Qtrly Grain Stocks-Soy", "Qtrly Grain Stocks-Wheat"]),
}


def main() -> int:
    with open(POLLS_JSON, encoding="utf-8") as f:
        cat = json.load(f)
    rics = cat["rics"]
    by_indicator: dict[str, list] = {}
    for r in rics:
        ind = r.get("indicator") or r.get("subcategory") or ""
        by_indicator.setdefault(ind, []).append(r)

    os.makedirs(BATCHES_DIR, exist_ok=True)
    used: set[str] = set()
    summary = []
    for bid, (name, indicators) in GROUPS.items():
        rics_out = []
        for ind in indicators:
            for r in by_indicator.get(ind, []):
                if r["ric"] in used:
                    continue
                rics_out.append({
                    "ric": r["ric"],
                    "description": r["description"],
                    "indicator": r.get("indicator", ind),
                    "statistic": r.get("statistic", ""),
                    "units": r.get("units", ""),
                    "frequency": r.get("frequency", ""),
                })
                used.add(r["ric"])
        bf = {
            "batch_id": bid, "name": name,
            "ric_count": len(rics_out),
            "rics": rics_out,
        }
        path = os.path.join(BATCHES_DIR, f"polls_batch_{bid:02d}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(bf, f, ensure_ascii=False, indent=2)
        summary.append((bid, name, len(rics_out)))
        print(f"  polls_batch_{bid:02d}.json  ({len(rics_out):>4} RICs)  — {name}")

    # Catch any indicators not yet placed (orphans go to batch 5)
    placed_indicators = {ind for _, inds in GROUPS.values() for ind in inds}
    orphans = []
    for ind, rs in by_indicator.items():
        if ind not in placed_indicators:
            for r in rs:
                if r["ric"] not in used:
                    orphans.append({
                        "ric": r["ric"],
                        "description": r["description"],
                        "indicator": r.get("indicator", ind),
                        "statistic": r.get("statistic", ""),
                        "units": r.get("units", ""),
                        "frequency": r.get("frequency", ""),
                    })
                    used.add(r["ric"])
    if orphans:
        path = os.path.join(BATCHES_DIR, "polls_batch_99_orphans.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"batch_id": 99, "name": "Orphan polls", "ric_count": len(orphans), "rics": orphans},
                      f, ensure_ascii=False, indent=2)
        print(f"  polls_batch_99_orphans.json  ({len(orphans):>4} RICs) — uncategorized")

    total = sum(n for _, _, n in summary) + len(orphans)
    print(f"\n[polls-batches] {total} RICs total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
