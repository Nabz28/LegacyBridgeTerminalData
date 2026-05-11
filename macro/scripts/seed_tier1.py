"""Seed Tier-1 skill content for the most-watched US macro indicators.

Idempotent: re-running overwrites the seeded fields with these values.
The reuglar `extract_rics.py` script PRESERVES whatever is in the catalog files
on its own re-runs, so once seeded these notes survive Refinitiv data refreshes.

Run from repo root:  python scripts/seed_tier1.py
"""

from __future__ import annotations

import json
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _resolve_country() -> str:
    if "--country" in sys.argv:
        i = sys.argv.index("--country")
        if i + 1 < len(sys.argv):
            cc = sys.argv[i + 1].lower()
            del sys.argv[i:i + 2]
            os.environ["RIC_COUNTRY"] = cc
            return cc
    return os.environ.get("RIC_COUNTRY", "us").lower()


COUNTRY = _resolve_country()
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog", COUNTRY)

# Tier-1 content is US-specific (hand-mapped to aUS... RICs). Bail out cleanly
# for other countries instead of writing US RIC anchors into a non-US catalog.
if COUNTRY != "us":
    print(f"[seed-tier1] country={COUNTRY} — Tier-1 content is US-only, skipping.")
    sys.exit(0)


# Each entry: ric -> { catalog_slug, meaning, how_to_use, related_series, units, subcategory }
TIER1 = {
    "aUSCGDPPD/A": {
        "slug": "us_gdp_by_expenditure",
        "subcategory": "GDP",
        "units": "%, QoQ annualized",
        "meaning": "Quarter-over-quarter real GDP growth, annualized — the headline 'GDP print' the market reacts to. Standardized version of the BEA quarterly release; positive prints indicate expansion, negative prints indicate contraction.",
        "how_to_use": "Primary read on the size and direction of US economic growth. Two consecutive negative quarters is the textbook recession signal (NBER uses a broader definition). Compare to consensus forecasts and to nominal GDP — divergence between the two reflects inflation. Watch revisions: advance, second, third estimates can move materially.",
        "related_series": ["aUSGDPEQZ/CA", "aUSAGDPF", "aUSDGEPAPQ", "aUSCONSF/A"],
    },
    "aUSGDPEQZ/CA": {
        "slug": "us_gdp_by_expenditure",
        "subcategory": "GDP",
        "units": "%, YoY",
        "meaning": "Year-over-year real GDP growth in constant prices. Smoother than the QoQ annualized print — better for trend assessment.",
        "how_to_use": "Use alongside QoQ-annualized for trend vs. momentum. YoY filters out seasonal noise. Sustained sub-2% YoY signals stagnation; >3% suggests above-trend growth.",
        "related_series": ["aUSCGDPPD/A", "aUSAGDPF"],
    },

    "aUSCPIYYR": {
        "slug": "us_consumer_prices_inflation",
        "subcategory": "CPI Headline",
        "units": "%, YoY",
        "meaning": "Headline Consumer Price Index, year-over-year change. Tracks the average price level paid by urban consumers across all goods and services. Released monthly by the BLS, usually mid-month, with data lagged one month.",
        "how_to_use": "The single most-watched US inflation gauge. Compare against the Fed's 2% target and against consensus (surprise drives short-end rates). Decompose by component (shelter, energy, food, services) to read the next move. For Fed policy reads, prefer Core PCE — Fed targets that, not CPI.",
        "related_series": ["aUSCPI", "aUSCPIXFE/A", "aUSPCEYAR", "aUSPCEMAR"],
    },
    "aUSCPIXFE/A": {
        "slug": "us_consumer_prices_inflation",
        "subcategory": "CPI Core",
        "units": "Index (1982-84=100)",
        "meaning": "Core CPI level — All items less food and energy. Excludes the two most volatile components, giving a cleaner read on underlying inflation trends.",
        "how_to_use": "Pair with headline CPI. When core stays sticky while headline falls, inflation is broadening into services/shelter — harder to dislodge. The Fed monitors core CPI but anchors policy to core PCE; gaps between the two reflect different basket weights (shelter is heavier in CPI).",
        "related_series": ["aUSCPI", "aUSCPIYYR", "aUSPCEMAR", "aUSPFGAR"],
    },
    "aUSPCEMAR": {
        "slug": "us_consumer_prices_inflation",
        "subcategory": "PCE Core",
        "units": "%, MoM",
        "meaning": "Core PCE price index, month-over-month change — the Fed's preferred inflation gauge. PCE differs from CPI in basket composition (broader, captures substitution behavior) and weighting (services-heavy).",
        "how_to_use": "This is THE Fed inflation series. Six-month annualized core PCE is what FOMC commentary typically references when calling inflation trajectory. ~0.17% MoM (~2% annualized) is target-consistent; sustained 0.3%+ prints are hawkish for rates.",
        "related_series": ["aUSPCEYAR", "aUSPCE2AR", "aUSCPIXFE/A", "aUSCPIYYR"],
    },

    "aUSPCEYAR": {
        "slug": "us_consumptions",
        "subcategory": "PCE Headline",
        "units": "%, YoY",
        "meaning": "Headline PCE price index, year-over-year change. Released with the BEA Personal Income & Outlays report, ~2 weeks after CPI. Uses chain-weighting and a broader basket than CPI.",
        "how_to_use": "Cross-check against headline CPI. Diverges from CPI primarily because of (a) lower shelter weight, (b) inclusion of employer-paid health insurance, (c) chain-weighting. Persistent CPI > PCE gap is normal — typically 30-50 bps.",
        "related_series": ["aUSPCEMAR", "aUSPCE2AR", "aUSCPIYYR", "aUSCPI"],
    },

    "aUSPFDEMDE/A": {
        "slug": "us_producer_prices",
        "subcategory": "PPI Final Demand",
        "units": "Index",
        "meaning": "Producer Price Index, Final Demand — index level. Measures average prices received by domestic producers for output sold to final demand (consumers, businesses, government, exports).",
        "how_to_use": "Leads CPI by 1-3 months for goods inflation. Watch core PPI (ex food/energy) for signal — final-demand services PPI feeds directly into core PCE via the BEA's mapping. Spike in PPI without CPI follow-through implies margin compression on producers.",
        "related_series": ["aUSPFDAR", "aUSPFDEAR", "aUSPFDOENF", "aUSCPI"],
    },

    "aUSNFARM/A": {
        "slug": "us_employment_hours",
        "subcategory": "Payrolls",
        "units": "Thousands",
        "meaning": "Total nonfarm payroll employment — the headline US jobs number ('NFP'). Released first Friday of each month by the BLS. Counts all paid employees ex farms, private households, non-profits, and government workers in some categories.",
        "how_to_use": "The single most market-moving US data release. Watch (a) monthly change vs. consensus, (b) prior-month revisions, (c) sectoral breakdown (private services vs goods), (d) hours and earnings in the same release. Pair with unemployment rate from the same household survey for full read.",
        "related_series": ["aUSEMPNF", "aUSNFARMP/A", "aUSEMPADP/A", "aUSUNTOTR"],
    },

    "aUSUNTOTR": {
        "slug": "us_workforce_unemployement",
        "subcategory": "Headline Unemployment",
        "units": "%",
        "meaning": "Civilian unemployment rate (U-3) — share of the civilian labor force without a job and actively searching. From the BLS household survey, released alongside NFP.",
        "how_to_use": "Pair with NFP — they come from different surveys (establishment vs household) so divergence is informative. Watch participation rate alongside: a falling unemployment rate driven by labor-force exits is weak; one driven by employment growth is strong. Crossing the Sahm Rule threshold (3-month avg up 0.5pp from trailing 12m low) historically signals recession.",
        "related_series": ["aUSNFARM/A", "aUSCUNPQ/A", "aUSLIDXAWIC/A"],
    },

    "aUSFEDFUND": {
        "slug": "us_interest_rates",
        "subcategory": "Policy Rate",
        "units": "%",
        "meaning": "Federal Funds Effective Rate — the volume-weighted median rate at which depository institutions lend reserves to each other overnight. The Fed's primary policy lever.",
        "how_to_use": "Anchor for the entire US yield curve. Compare to (a) Fed Funds Target range, (b) market-implied path from Fed Funds futures, (c) SOFR. Real fed funds = nominal minus expected inflation; when real fed funds are positive and rising, policy is restrictive.",
        "related_series": ["aUSFEDFUNDT", "aUSFEDFUNDP", "aUSFEDAW"],
    },

    "aUSNPMI/A": {
        "slug": "us_business_surveys",
        "subcategory": "ISM Manufacturing",
        "units": "Diffusion index (50=neutral)",
        "meaning": "ISM Manufacturing PMI — composite diffusion index of new orders, production, employment, supplier deliveries, and inventories. Released first business day of each month, covering the previous month.",
        "how_to_use": "Above 50 = manufacturing expanding, below 50 = contracting. Sustained sub-50 prints (3+ months) historically correlate with recession risk. Sub-components matter: new orders is the most forward-looking; prices paid is an early inflation signal. ISM survey is now lighter coverage than S&P Global PMI but more market-watched.",
        "related_series": ["aUSNAPMBO/A", "aUSNAPMEMP/A", "aUSPMIAQ", "aUSNMFGPMI"],
    },

    "aUSNMFGPMI": {
        "slug": "us_business_surveys",
        "subcategory": "ISM Services",
        "units": "Diffusion index (50=neutral)",
        "meaning": "ISM Non-Manufacturing (Services) PMI / NMI — diffusion index for services-sector activity (business activity, new orders, employment, supplier deliveries). Services are ~70% of US GDP, so this often matters more than the manufacturing print.",
        "how_to_use": "Same 50-line interpretation as manufacturing. Watch services prices index as a leading indicator for core services CPI/PCE. Divergence between services PMI (strong) and manufacturing PMI (weak) has been a defining feature of the post-COVID cycle — implies a goods-sector slowdown alongside services resilience.",
        "related_series": ["aUSNPMI/A", "aUSNMFGBA/A", "aUSNMFGEMP/A"],
    },

    "aUSCRETF/C": {
        "slug": "us_retail_sales",
        "subcategory": "Headline Retail Sales",
        "units": "Index, standardized",
        "meaning": "Retail sales, standardized — broad measure of consumer goods spending at retail outlets. Captures ~1/3 of consumer expenditure (goods only; services tracked elsewhere).",
        "how_to_use": "Watch the 'control group' (ex autos, gasoline, building materials, food services) — that feeds directly into PCE goods. Volatile month-to-month; smooth with 3M average. Real retail sales (deflated by CPI) is a better cyclical gauge than nominal.",
        "related_series": ["aUSCRETPE/A", "aUSCRETPF", "aUSCRETYE/A"],
    },

    "aUSCONCF/A": {
        "slug": "us_consumer_surveys",
        "subcategory": "Consumer Confidence",
        "units": "Index (1985=100)",
        "meaning": "Conference Board Consumer Confidence Index — survey of ~3,000 US households on present situation and future expectations.",
        "how_to_use": "Pair with University of Michigan sentiment index — they sometimes diverge (Conf Board is more labor-market sensitive, UMich more inflation/wealth sensitive). The Expectations sub-index leads recessions: a >20pt drop YoY is a historical warning. Less market-moving on release than NFP/CPI, but useful for trend.",
        "related_series": ["aUSCONCE/A", "aUSCCIPSOR", "aUSEMPTR"],
    },

    "aUSHSTART": {
        "slug": "us_housing",
        "subcategory": "Construction Activity",
        "units": "Thousands of units, SAAR",
        "meaning": "Housing starts — new privately-owned residential construction projects begun, seasonally adjusted at annual rate. Lagging within the housing cycle (permits lead, starts follow, completions lag further).",
        "how_to_use": "Pair with building permits (leading) and new home sales (demand-side). Single-family vs multi-family split matters: multi-family is more rate-sensitive and has been the swing factor post-2022. Persistent declines in starts feed through to construction employment and lumber/cement demand.",
        "related_series": ["aUSBPERMIT", "aUSHSTART1/A"],
    },

    "aUSBPERMIT": {
        "slug": "us_housing",
        "subcategory": "Construction Activity",
        "units": "Thousands of units, SAAR",
        "meaning": "Building permits authorized for privately-owned new housing units. The leading indicator of housing supply; a permit issued today translates to a start in 1-3 months.",
        "how_to_use": "Most forward-looking of the major housing series. Drop in permits → drop in starts → drop in residential investment in GDP 1-2 quarters out. Highly rate-sensitive: track alongside 30Y mortgage rate and the spread between mortgage rates and 10Y Treasury.",
        "related_series": ["aUSHSTART", "aUSBPERMIT1/A"],
    },
}


def main() -> int:
    by_slug: dict[str, dict] = {}
    for ric, fields in TIER1.items():
        slug = fields["slug"]
        by_slug.setdefault(slug, {})[ric] = fields

    updated = 0
    missing = []

    for slug, ric_map in by_slug.items():
        path = os.path.join(CATALOG_DIR, f"{slug}.json")
        if not os.path.exists(path):
            print(f"  SKIP: catalog/{slug}.json not found")
            for r in ric_map:
                missing.append(r)
            continue

        with open(path, encoding="utf-8") as f:
            cat = json.load(f)

        rics_index = {r["ric"]: r for r in cat.get("rics", [])}

        for ric, fields in ric_map.items():
            if ric not in rics_index:
                missing.append(ric)
                print(f"  MISS: {ric} not found in {slug}.json")
                continue
            entry = rics_index[ric]
            entry["subcategory"] = fields["subcategory"]
            entry["units"] = fields["units"]
            entry["meaning"] = fields["meaning"]
            entry["how_to_use"] = fields["how_to_use"]
            entry["related_series"] = fields["related_series"]
            updated += 1
            print(f"  OK:   {ric:18s} -> {slug}.json  ({fields['subcategory']})")

        with open(path, "w", encoding="utf-8") as f:
            json.dump(cat, f, ensure_ascii=False, indent=2)

    print()
    print(f"[seed-tier1] updated {updated} RICs across {len(by_slug)} catalog files")
    if missing:
        print(f"[seed-tier1] {len(missing)} RICs missing: {missing}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
