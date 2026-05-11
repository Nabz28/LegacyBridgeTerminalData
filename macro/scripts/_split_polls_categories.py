"""Split the single us_polls.json into 6 topical categories for cleaner UX.

Outputs:
  catalog/us/us_polls_gdp.json       — GDP, GDP Sales, GDP Deflator, Productivity
  catalog/us/us_polls_ism.json       — ISM PMIs + sub-indices, KC Fed, NAHB, IP, Mfg Output
  catalog/us/us_polls_housing.json   — Housing Starts, Building Permits, Existing Home Sales
  catalog/us/us_polls_trade.json     — Intl Trade, TIC Flows, Import/Export Prices, Fed Budget
  catalog/us/us_polls_labor.json     — JOLTS, Durables, Capital Goods, Factory Orders
  catalog/us/us_polls_agri.json      — Bean Oil, NOPA Crush, Grain Stocks

Also enriches each entry with:
  indicator_group_id  — stable id per indicator (e.g. 'ism_pmi', 'gdp_advance')
  indicator_topic     — human-readable topic (e.g. 'ISM Surveys', 'Housing')
  indicator_anchor_ric — the 'Actual' RIC for this indicator
  stat_role            — 'actual' | 'median' | 'mean' | 'mode' | 'min' | 'max' | 'stddev' | 'forecasters' | 'smart' | 'surprise'

Removes the old us_polls.json file. Updates _index.json.
"""
from __future__ import annotations
import json, os, sys, re
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO, "catalog", "us")
OLD_POLLS = os.path.join(CATALOG_DIR, "us_polls.json")
INDEX_JSON = os.path.join(CATALOG_DIR, "_index.json")


# ============================================================================
#  Indicator → topic + group_id mapping
# ============================================================================
INDICATOR_TOPICS = {
    # GDP & Productivity (label, slug, group_id)
    "GDP Advance":              ("GDP & Productivity", "us_polls_gdp", "gdp_advance"),
    "GDP 2nd Estimate":         ("GDP & Productivity", "us_polls_gdp", "gdp_2nd"),
    "GDP Sales Advance":        ("GDP & Productivity", "us_polls_gdp", "gdp_sales_advance"),
    "GDP Sales Prelim":         ("GDP & Productivity", "us_polls_gdp", "gdp_sales_prelim"),
    "GDP Sales Final":          ("GDP & Productivity", "us_polls_gdp", "gdp_sales_final"),
    "GDP Deflator Advance":     ("GDP & Productivity", "us_polls_gdp", "gdp_deflator_advance"),
    "GDP Deflator Prelim":      ("GDP & Productivity", "us_polls_gdp", "gdp_deflator_prelim"),
    "GDP Deflator Final":       ("GDP & Productivity", "us_polls_gdp", "gdp_deflator_final"),
    "Productivity Prelim":      ("GDP & Productivity", "us_polls_gdp", "productivity_prelim"),

    # ISM & Business Surveys
    "ISM Manufacturing PMI":    ("ISM Surveys",   "us_polls_ism", "ism_mfg_pmi"),
    "ISM Manuf Employment Idx": ("ISM Surveys",   "us_polls_ism", "ism_mfg_emp"),
    "ISM Mfg Prices Paid":      ("ISM Surveys",   "us_polls_ism", "ism_mfg_prices"),
    "ISM N-Mfg PMI":            ("ISM Surveys",   "us_polls_ism", "ism_nmfg_pmi"),
    "ISM N-Mfg Employment Idx": ("ISM Surveys",   "us_polls_ism", "ism_nmfg_emp"),
    "ISM N-Mfg Bus Act":        ("ISM Surveys",   "us_polls_ism", "ism_nmfg_bus"),
    "KC Fed Manufacturing":     ("ISM Surveys",   "us_polls_ism", "kc_mfg"),
    "KC Fed Composite Index":   ("ISM Surveys",   "us_polls_ism", "kc_comp"),
    "NAHB Housing Market Indx": ("ISM Surveys",   "us_polls_ism", "nahb"),
    "Industrial Production MM": ("ISM Surveys",   "us_polls_ism", "ip_mm"),
    "Manuf Output MM":          ("ISM Surveys",   "us_polls_ism", "mfg_output_mm"),

    # Housing
    "Housing Starts Number":    ("Housing",       "us_polls_housing", "housing_starts"),
    "Building Permits: Number": ("Housing",       "us_polls_housing", "building_permits"),
    "Existing Home Sales":      ("Housing",       "us_polls_housing", "existing_sales"),
    "Exist. Home Sales % Chg":  ("Housing",       "us_polls_housing", "existing_sales_chg"),

    # Trade & Prices
    "International Trade $":    ("Trade & Prices","us_polls_trade", "intl_trade"),
    "Foreign Buying, T-Bonds":  ("Trade & Prices","us_polls_trade", "tic_foreign_tbonds"),
    "Net L-T Flows,Exswaps":    ("Trade & Prices","us_polls_trade", "tic_net_lt_flows"),
    "Import Prices MM":         ("Trade & Prices","us_polls_trade", "import_prices_mm"),
    "Import Prices YY":         ("Trade & Prices","us_polls_trade", "import_prices_yy"),
    "Export Prices MM":         ("Trade & Prices","us_polls_trade", "export_prices_mm"),
    "Federal Budget,$":         ("Trade & Prices","us_polls_trade", "fed_budget"),

    # Labor & Durables
    "JOLTS Job Openings":       ("Labor & Durables","us_polls_labor", "jolts"),
    "Durable Goods":            ("Labor & Durables","us_polls_labor", "durable_goods"),
    "Durables Ex-Defense MM":   ("Labor & Durables","us_polls_labor", "durables_ex_def"),
    "Durables Ex-Transport":    ("Labor & Durables","us_polls_labor", "durables_ex_tr"),
    "Nondefe Cap Ex-Air":       ("Labor & Durables","us_polls_labor", "core_capex"),
    "Nondef Cap Ex-Air R MM":   ("Labor & Durables","us_polls_labor", "core_capex_rev"),
    "Factory Orders MM":        ("Labor & Durables","us_polls_labor", "factory_orders"),

    # Agriculture
    "Bean Oil Stocks":          ("Agriculture",   "us_polls_agri", "bean_oil_stocks"),
    "NOPA-Soy Crush":           ("Agriculture",   "us_polls_agri", "nopa_soy_crush"),
    "Qtrly Grain Stocks-Soy":   ("Agriculture",   "us_polls_agri", "grain_stocks_soy"),
    "Qtrly Grain Stocks-Wheat": ("Agriculture",   "us_polls_agri", "grain_stocks_wheat"),
}


# Map RIC suffix to stat role
def stat_role_for(ric: str, statistic: str) -> str:
    s = statistic.lower()
    if "actual" in s: return "actual"
    if "median" in s: return "median"
    if "smart" in s: return "smart"
    if "predicted surprise" in s or "surprise" in s: return "surprise"
    if "mean" in s: return "mean"
    if "mode" in s: return "mode"
    if "min" in s: return "min"
    if "max" in s: return "max"
    if "stddev" in s or "standard deviation" in s: return "stddev"
    if "number of forecaster" in s or "forecaster" in s: return "forecasters"
    return "other"


# Category metadata for the 6 new files
CATEGORY_META = {
    "us_polls_gdp":     ("Polls — GDP & Productivity",       "Polls"),
    "us_polls_ism":     ("Polls — ISM & Business Surveys",   "Polls"),
    "us_polls_housing": ("Polls — Housing",                  "Polls"),
    "us_polls_trade":   ("Polls — Trade & Prices",           "Polls"),
    "us_polls_labor":   ("Polls — Labor & Durables",         "Polls"),
    "us_polls_agri":    ("Polls — Agriculture",              "Polls"),
}


def main() -> int:
    if not os.path.exists(OLD_POLLS):
        print(f"  ERROR: {OLD_POLLS} not found")
        return 1

    with open(OLD_POLLS, encoding="utf-8") as f:
        cat = json.load(f)
    rics = cat.get("rics", [])

    # Group RICs by their target slug
    by_slug: dict[str, list[dict]] = {s: [] for s in CATEGORY_META}
    indicator_anchors: dict[str, str] = {}     # group_id -> anchor RIC (the actual)
    skipped = []

    # First pass: identify the anchor (actual) RIC per indicator
    for r in rics:
        ind = r.get("indicator", "")
        topic_meta = INDICATOR_TOPICS.get(ind)
        if not topic_meta:
            skipped.append(r["ric"])
            continue
        topic_label, slug, group_id = topic_meta
        if stat_role_for(r["ric"], r.get("statistic", "")) == "actual":
            indicator_anchors[group_id] = r["ric"]

    # Second pass: tag and place
    for r in rics:
        ind = r.get("indicator", "")
        topic_meta = INDICATOR_TOPICS.get(ind)
        if not topic_meta:
            continue
        topic_label, slug, group_id = topic_meta
        role = stat_role_for(r["ric"], r.get("statistic", ""))
        anchor = indicator_anchors.get(group_id, r["ric"])
        new_entry = dict(r)
        new_entry["indicator_topic"] = topic_label
        new_entry["indicator_group_id"] = group_id
        new_entry["indicator_anchor_ric"] = anchor
        new_entry["stat_role"] = role
        by_slug[slug].append(new_entry)

    # Write each per-topic category file
    for slug, name_section in CATEGORY_META.items():
        name, section = name_section
        rics_out = by_slug[slug]
        # Sort: anchor first per indicator, then by stat order
        STAT_ORDER = ["actual", "median", "mean", "mode", "min", "max", "stddev", "smart", "surprise", "forecasters", "other"]
        rics_out.sort(key=lambda r: (
            r.get("indicator_group_id", ""),
            STAT_ORDER.index(r.get("stat_role", "other")) if r.get("stat_role") in STAT_ORDER else 99,
        ))
        out = {
            "category": name,
            "category_slug": slug,
            "section": section,
            "source_file": "US Polls/*.xlsx",
            "ric_count": len(rics_out),
            "rics": rics_out,
        }
        path = os.path.join(CATALOG_DIR, f"{slug}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"  -> {slug}.json  ({len(rics_out)} RICs)")

    # Remove old single us_polls.json
    if os.path.exists(OLD_POLLS):
        os.remove(OLD_POLLS)
        print(f"  removed old {OLD_POLLS}")

    # Update _index.json
    with open(INDEX_JSON, encoding="utf-8") as f:
        idx = json.load(f)
    cats = [c for c in idx.get("categories", []) if c.get("slug") != "us_polls"]
    for slug, (name, section) in CATEGORY_META.items():
        cats.append({
            "slug": slug, "name": name, "section": section,
            "source_file": "US Polls/*.xlsx",
            "ric_count": len(by_slug[slug]),
        })
    cats.sort(key=lambda c: (c.get("section", ""), c.get("name", "")))
    idx["categories"] = cats

    # Update RIC index entries with new slug + indicator metadata
    rics_idx = idx.get("rics", {})
    for slug, entries in by_slug.items():
        for r in entries:
            rics_idx[r["ric"]] = {
                "slug": slug,
                "description": r.get("description", ""),
                "frequency": r.get("frequency", ""),
                "subcategory": r.get("subcategory", ""),
                "units": r.get("units", ""),
                "meaning": r.get("meaning", ""),
                "how_to_use": r.get("how_to_use", ""),
                "indicator_topic": r.get("indicator_topic", ""),
                "indicator_group_id": r.get("indicator_group_id", ""),
                "indicator_anchor_ric": r.get("indicator_anchor_ric", ""),
                "stat_role": r.get("stat_role", ""),
            }
    idx["rics"] = rics_idx
    idx["generated_at"] = datetime.now(timezone.utc).isoformat()
    with open(INDEX_JSON, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print(f"\n  applied  _index.json  ({len(cats)} categories, {len(rics_idx)} RICs total)")

    if skipped:
        print(f"\n  WARN: {len(skipped)} RICs not in topic mapping (skipped):")
        for r in skipped[:20]:
            print(f"    {r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
