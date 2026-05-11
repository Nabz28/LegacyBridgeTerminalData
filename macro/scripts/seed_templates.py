"""Concept-driven skill content generator for the long tail of RICs.

For each RIC without curated content, this script:
  1. Detects the underlying CONCEPT being measured (CPI, NFP, GDP, ISM, fed funds...)
  2. Detects the TRANSFORMATION (level / YoY / MoM / QoQ / annualized / index / share / change)
  3. Extracts any SUB-DETAIL (component, region, demographic, by-country, etc.)
  4. Composes a 'meaning' sentence specific to (concept, transformation, detail)
  5. Picks a 'how_to_use' tailored to the concept
  6. Picks units based on the transformation + concept defaults
  7. Picks a 'related_series' anchor + 1-2 keyword-similar RICs in the same category

Idempotent: never overwrites a RIC that already has a meaning. Hand-curated content
in seed_tier1.py / seed_tier2.py always wins.

Run from repo root:
  python scripts/seed_templates.py             # apply to every category
  python scripts/seed_templates.py us_banking  # one category
  python scripts/seed_templates.py --dry-run   # preview without writing
"""

from __future__ import annotations

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _resolve_country() -> str:
    """Resolve the country code: --country arg > RIC_COUNTRY env > default 'us'."""
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

# Known-RICs set for the active country, loaded lazily. Used to filter out
# anchor RIC suggestions that come from US-flavored CONCEPTS rules but don't
# exist in the active country's catalog (e.g. aUSCPIYYR has no Indonesia analog).
_KNOWN_RICS: set[str] | None = None


def _known_rics() -> set[str]:
    global _KNOWN_RICS
    if _KNOWN_RICS is not None:
        return _KNOWN_RICS
    idx_path = os.path.join(CATALOG_DIR, "_index.json")
    if not os.path.exists(idx_path):
        _KNOWN_RICS = set()
        return _KNOWN_RICS
    try:
        with open(idx_path, encoding="utf-8") as f:
            idx = json.load(f)
        _KNOWN_RICS = set((idx.get("rics") or {}).keys())
    except (OSError, json.JSONDecodeError):
        _KNOWN_RICS = set()
    return _KNOWN_RICS


# ============================================================================
#  TRANSFORMATIONS — detect what kind of measurement this is
# ============================================================================
# Order matters; first match wins.
TRANSFORM_RULES: list[tuple[str, str]] = [
    # YoY
    (r"(?i)chg\s*y/y|year[-\s]?over[-\s]?year|year on year|\byoy\b|y/y\s*%|annual\s*(inflation|change|growth)\s*rate", "yoy"),
    # MoM
    (r"(?i)chg\s*p/p|month[-\s]?on[-\s]?month|month over month|\bmom\b|m/m\s*%", "mom"),
    # QoQ
    (r"(?i)chg\s*q/q|quarter[-\s]?on[-\s]?quarter|quarter over quarter|\bqoq\b|q/q\s*%|%\s*quarter on quarter", "qoq"),
    # Annualized rate
    (r"(?i)\bsaar\b|annualized|annual\s*rate|\bar\)?$|\(ar\)|chg.*at annual rate", "annualized"),
    # Absolute change
    (r"(?i)absolute change", "abs_change"),
    # % of GDP
    (r"(?i)%\s*of gdp|as percent.*gdp|as % of gdp", "pct_gdp"),
    # Net % / net balance / diffusion
    (r"(?i)net\s*%|net balance|diffusion", "diffusion"),
    # Standardized index
    (r"(?i)standardized", "standardized"),
    # Share / percentage
    (r"(?i)\bshare\b|\b%\b|percentage", "share"),
    # Index level
    (r"(?i)\bindex\b", "index"),
    # Ratio
    (r"(?i)\bratio\b", "ratio"),
    # Yield / rate
    (r"(?i)\byield\b|interest rate|policy rate", "yield"),
    # Forecast/projection
    (r"(?i)forecast|projection", "forecast"),
]


def detect_transform(description: str) -> str:
    for pat, label in TRANSFORM_RULES:
        if re.search(pat, description or ""):
            return label
    return "level"


# ============================================================================
#  GEOGRAPHIC / DEMOGRAPHIC SUB-DETAIL EXTRACTION
# ============================================================================
US_REGIONS = ["northeast", "midwest", "south", "west", "national", "atlantic", "pacific", "mountain", "central"]
DEMOGRAPHIC_PATTERNS = [
    (r"(?i)teen|16[\s-]?to[\s-]?19", "teens"),
    (r"(?i)\b65[\s-]?to[\s-]?69|65 years and over", "65-plus"),
    (r"(?i)black\b|african[\s-]american", "Black workforce"),
    (r"(?i)hispanic|latino", "Hispanic workforce"),
    (r"(?i)asian", "Asian workforce"),
    (r"(?i)white\b", "white workforce"),
    (r"(?i)men\b|male\b", "men"),
    (r"(?i)women\b|female\b", "women"),
    (r"(?i)full[\s-]?time", "full-time"),
    (r"(?i)part[\s-]?time", "part-time"),
]
COUNTRY_PATTERNS = [
    (r"(?i)\bcanada", "Canada"), (r"(?i)\bjapan", "Japan"),
    (r"(?i)\bgermany", "Germany"), (r"(?i)united kingdom|\buk\b", "UK"),
    (r"(?i)\bmexico", "Mexico"), (r"(?i)\bchina", "China"),
    (r"(?i)\baustralia", "Australia"), (r"(?i)\bfrance", "France"),
    (r"(?i)\bkorea", "Korea"), (r"(?i)\bbrazil", "Brazil"),
    (r"(?i)euro\s*area|eurozone", "euro area"),
]


def extract_detail(desc: str) -> str:
    """Extract a short sub-detail clause to append to the meaning."""
    if not desc:
        return ""
    parts = []
    for pat, label in DEMOGRAPHIC_PATTERNS:
        if re.search(pat, desc):
            parts.append(label); break
    for pat, label in COUNTRY_PATTERNS:
        if re.search(pat, desc):
            parts.append(label); break
    for region in US_REGIONS:
        if re.search(rf"(?i)\b{region}\b", desc):
            parts.append(f"{region} region"); break
    if not parts:
        return ""
    return " (" + ", ".join(parts) + ")"


# ============================================================================
#  CONCEPTS — the heart of the engine
#  Each concept knows what it IS and how to phrase itself for each transform.
# ============================================================================

# Helper: build a phrase template that takes a transform, returns a phrase.
def basic_phrases(noun, level_unit="", yoy_unit="%, YoY", mom_unit="%, MoM", qoq_unit="%, QoQ"):
    """Standard set of phrases for a numeric series."""
    return {
        "level":       (f"Level of {noun}.", level_unit),
        "yoy":         (f"Year-over-year percentage change in {noun}.", yoy_unit),
        "mom":         (f"Month-over-month percentage change in {noun}.", mom_unit),
        "qoq":         (f"Quarter-over-quarter percentage change in {noun}.", qoq_unit),
        "abs_change":  (f"Absolute period-over-period change in {noun}.", level_unit),
        "annualized":  (f"{noun.capitalize()}, expressed at a seasonally-adjusted annual rate.", level_unit + ", SAAR" if level_unit else "SAAR"),
        "index":       (f"Index of {noun}.", "Index"),
        "share":       (f"{noun.capitalize()} as a share of the total.", "%"),
        "ratio":       (f"Ratio expression of {noun}.", "Ratio"),
        "yield":       (f"Yield/interest rate associated with {noun}.", "%"),
        "diffusion":   (f"Diffusion-index reading of {noun} (50 = neutral).", "Diffusion index (50=neutral)"),
        "pct_gdp":     (f"{noun.capitalize()} expressed as a percentage of GDP.", "% of GDP"),
        "standardized":(f"{noun.capitalize()}, standardized for cross-country comparison.", "Index, standardized"),
        "forecast":    (f"Forecast of {noun} from official or consensus sources.", level_unit),
    }


# Core concept registry. Each entry: {patterns, exclude, phrases, how, anchor}
# 'phrases' maps transform -> (meaning_template, units_default)
CONCEPTS: list[dict] = [
    # ---- Inflation / Prices ----
    {
        "name": "Core CPI",
        "patterns": [r"(?i)cpi.*(less food and energy|excluding food|core)", r"(?i)core cpi"],
        "exclude": [r"(?i)\bppi\b|producer", r"(?i)\bpce\b"],
        "phrases": {
            **basic_phrases("the Core CPI (consumer prices ex food and energy)", level_unit="Index (1982-84=100)"),
            "level": ("Level of the Core CPI (consumer prices excluding food and energy) — the BLS measure of underlying inflation, stripped of the two most volatile components.", "Index (1982-84=100)"),
            "yoy":   ("Year-over-year change in Core CPI — the BLS measure of underlying consumer-price inflation excluding food and energy.", "%, YoY"),
            "mom":   ("Month-over-month change in Core CPI — short-term underlying-inflation pulse.", "%, MoM"),
        },
        "how": "Cleaner inflation signal than headline CPI (strips out volatile food + energy). When core stays sticky while headline falls, inflation is broadening into services/shelter — harder to dislodge. The Fed monitors core CPI but officially targets core PCE; gaps between the two reflect basket weights (shelter is heavier in CPI).",
        "anchor": "aUSCPIXFE/A",
    },
    {
        "name": "Headline CPI",
        "patterns": [r"(?i)\bcpi\b", r"(?i)consumer price"],
        "exclude": [r"(?i)\bppi\b|producer", r"(?i)\bpce\b"],
        "phrases": {
            **basic_phrases("the Consumer Price Index (CPI)", level_unit="Index (1982-84=100)"),
            "level": ("Level of the Consumer Price Index — the BLS monthly measure of average prices paid by urban consumers for a fixed basket of goods and services.", "Index (1982-84=100)"),
            "yoy":   ("Year-over-year change in headline CPI — the most-watched US consumer-price inflation gauge.", "%, YoY"),
            "mom":   ("Month-over-month change in headline CPI — short-term inflation pulse, mid-month BLS release.", "%, MoM"),
        },
        "how": "Most-watched US inflation gauge. Compare against the Fed 2% target and consensus (surprises move short-end rates). Decompose by component (shelter, energy, food, services). For Fed policy reads, prefer Core PCE — the Fed's actual target.",
        "anchor": "aUSCPIYYR",
    },
    {
        "name": "Core PCE",
        "patterns": [r"(?i)pce.*(less food and energy|excluding food|core)", r"(?i)core pce"],
        "exclude": [r"(?i)\bcpi\b", r"(?i)\bppi\b"],
        "phrases": {
            **basic_phrases("the Core PCE price index (ex food and energy)"),
            "level": ("Level of the Core PCE price index — the Fed's preferred underlying-inflation gauge, excluding food and energy.", "Index (2017=100)"),
            "yoy":   ("Year-over-year change in Core PCE — the Fed's preferred inflation gauge, against which the 2% target is officially measured.", "%, YoY"),
            "mom":   ("Month-over-month change in Core PCE — most market-relevant when annualized over 3 or 6 months. Above ~0.17%/mo is hawkish for rates.", "%, MoM"),
        },
        "how": "THE Fed inflation series. The 6-month annualized core PCE is what FOMC commentary typically references. Released ~2 weeks after CPI with the BEA Personal Income & Outlays report. Lower than CPI because of basket weighting (less shelter weight) and chain-weighting.",
        "anchor": "aUSPCEMAR",
    },
    {
        "name": "Headline PCE",
        "patterns": [r"(?i)\bpce\b", r"(?i)personal consumption expenditure.*price"],
        "exclude": [r"(?i)\bcpi\b", r"(?i)\bppi\b"],
        "phrases": {
            **basic_phrases("the headline PCE price index"),
            "level": ("Level of the headline PCE price index (Personal Consumption Expenditures price index, all items).", "Index (2017=100)"),
            "yoy":   ("Year-over-year change in the headline PCE price index — released alongside personal income and consumption.", "%, YoY"),
            "mom":   ("Month-over-month change in the headline PCE price index.", "%, MoM"),
        },
        "how": "Cross-check against headline CPI. PCE differs in basket composition (broader, captures substitution behavior) and weighting (chain-weighted, services-heavier). CPI > PCE divergence is normal — usually 30-50bp wider in CPI.",
        "anchor": "aUSPCEYAR",
    },
    {
        "name": "PPI Final Demand",
        "patterns": [r"(?i)producer price.*final demand", r"(?i)\bppi\b.*final demand"],
        "exclude": [],
        "phrases": {
            **basic_phrases("the PPI for final demand (prices producers receive for output sold to final demand)"),
            "level": ("Level of the Producer Price Index for Final Demand — average prices received by domestic producers for output sold to final consumers, businesses, government, and exporters.", "Index"),
            "yoy":   ("Year-over-year change in PPI Final Demand — leading goods-inflation signal that feeds CPI 1-3 months out.", "%, YoY"),
            "mom":   ("Month-over-month change in PPI Final Demand — short-term producer-price pulse.", "%, MoM"),
        },
        "how": "Leads CPI by 1-3 months for goods inflation. Final-demand services PPI feeds directly into core PCE via the BEA's mapping. PPI spikes without CPI follow-through implies margin compression on producers.",
        "anchor": "aUSPFDEMDE/A",
    },
    {
        "name": "PPI",
        "patterns": [r"(?i)\bppi\b", r"(?i)producer price"],
        "exclude": [],
        "phrases": {
            **basic_phrases("the Producer Price Index (PPI)"),
            "level": ("Level of the Producer Price Index — the BLS measure of average prices received by domestic producers.", "Index"),
            "yoy":   ("Year-over-year change in PPI — early signal of pipeline inflation pressures.", "%, YoY"),
            "mom":   ("Month-over-month change in PPI.", "%, MoM"),
        },
        "how": "Leads CPI for goods inflation. Watch core PPI (ex food/energy/trade) for the cleanest underlying signal. Final-demand services PPI is the input to core PCE.",
        "anchor": "aUSPFDEMDE/A",
    },
    {
        "name": "GDP Deflator",
        "patterns": [r"(?i)gdp deflator", r"(?i)implicit price deflator.*gdp", r"(?i)gdp.*price index"],
        "exclude": [],
        "phrases": {
            **basic_phrases("the GDP deflator (implicit price index for GDP)"),
            "level": ("Level of the GDP deflator — broadest US price index, derived as nominal GDP / real GDP. Quarterly BEA.", "Index"),
            "yoy":   ("Year-over-year change in the GDP deflator — broadest US inflation gauge.", "%, YoY"),
            "qoq":   ("Quarter-over-quarter change in the GDP deflator (annualized in QoQ context).", "%, QoQ"),
        },
        "how": "Broader than CPI/PCE — covers all final domestic production. Differs because it's chain-weighted and excludes imports. Useful for cross-country GDP-deflator comparison and for converting nominal to real GDP.",
        "anchor": "aUSGDPDEF/A",
    },
    {
        "name": "Energy Price (Gasoline)",
        "patterns": [r"(?i)gasoline.*price|price.*gasoline"],
        "exclude": [],
        "phrases": basic_phrases("the US retail gasoline price", level_unit="USD/gallon"),
        "how": "Most consumer-visible price — moves consumer confidence almost in real time. Heavy contributor to headline CPI energy component. Use 4-week change for sentiment read.",
        "anchor": "aUSEPGAPG",
    },
    {
        "name": "Energy Price (Diesel)",
        "patterns": [r"(?i)diesel.*price|price.*diesel"],
        "exclude": [],
        "phrases": basic_phrases("the US retail diesel fuel price", level_unit="USD/gallon"),
        "how": "Truck/freight cost proxy. Diesel diverges from gasoline due to refinery yield mix and global maritime demand. Spike in diesel relative to gasoline often precedes goods CPI moves.",
        "anchor": "aUSEPDAPG",
    },
    {
        "name": "Inflation Expectations",
        "patterns": [r"(?i)inflation expect", r"(?i)expected inflation"],
        "exclude": [],
        "phrases": {
            **basic_phrases("US inflation expectations"),
            "level": ("Survey-based US inflation expectation — UMich, Conference Board, NY Fed, or market-implied (TIPS breakevens) measure of where consumers/markets expect inflation to be.", "%"),
        },
        "how": "Watch alongside actual inflation prints. Sustained de-anchoring (expectations drifting from 2%) is the Fed's nightmare scenario. UMich is most market-sensitive at release; NY Fed is most academically rigorous.",
        "anchor": "aUSUMINF1/A",
    },
    {
        "name": "Import Price",
        "patterns": [r"(?i)import price", r"(?i)imports.*price"],
        "exclude": [],
        "phrases": {
            **basic_phrases("the US import price index"),
            "yoy":   ("Year-over-year change in import prices — direct pass-through to consumer goods inflation.", "%, YoY"),
            "mom":   ("Month-over-month change in import prices. Crude oil dominates historically.", "%, MoM"),
        },
        "how": "Direct CPI input. Watch import prices ex-petroleum for cleaner underlying signal. Pair with USD trade-weighted to isolate FX vs underlying global price drivers.",
        "anchor": "aUSIMPP",
    },
    {
        "name": "Export Price",
        "patterns": [r"(?i)export price", r"(?i)exports.*price"],
        "exclude": [],
        "phrases": basic_phrases("the US export price index"),
        "how": "Reflects US producer pricing power abroad. Combined with import prices gives terms-of-trade signal.",
        "anchor": "aUSEXPP",
    },

    # ---- Activity / GDP ----
    {
        "name": "Real GDP",
        "patterns": [r"(?i)gdp.*real", r"(?i)real gdp", r"(?i)gdp.*chained|gdp.*constant prices"],
        "exclude": [r"(?i)deflator|price index", r"(?i)nominal"],
        "phrases": {
            **basic_phrases("real (inflation-adjusted) US GDP"),
            "yoy":   ("Year-over-year real GDP growth — the headline annual growth rate of US output.", "%, YoY"),
            "qoq":   ("Quarter-over-quarter real GDP growth (typically annualized) — the headline GDP print markets react to.", "%, QoQ annualized"),
        },
        "how": "Primary US output gauge. Two consecutive negative quarters is the textbook recession (NBER uses a broader definition). Compare to consensus and to nominal GDP — divergence reflects inflation. Watch the advance/second/third revision sequence for direction.",
        "anchor": "aUSCGDPPD/A",
    },
    {
        "name": "Nominal GDP",
        "patterns": [r"(?i)gdp", r"(?i)gross domestic product"],
        "exclude": [r"(?i)real|chained|constant", r"(?i)deflator|price index", r"(?i)gva"],
        "phrases": {
            **basic_phrases("nominal US GDP", level_unit="USD billions"),
            "level": ("Level of nominal (current-dollar) US GDP — the dollar value of all final goods and services produced in the US in a given period.", "USD billions"),
        },
        "how": "Master scale variable. Real GDP for output cycle; nominal GDP for fiscal-burden ratios (debt/GDP), share calculations, and tax-base modeling.",
        "anchor": "aUSCGDPPD/A",
    },
    {
        "name": "GDP per capita",
        "patterns": [r"(?i)gdp.*per\s*capita", r"(?i)per\s*capita.*gdp"],
        "exclude": [],
        "phrases": basic_phrases("US GDP per capita", level_unit="USD"),
        "how": "Long-run living-standards gauge. Use real per-capita GDP for cross-country comparison; YoY growth matters more than the level.",
        "anchor": "aUSGDPCC/CA",
    },
    {
        "name": "GDP Component (Investment)",
        "patterns": [r"(?i)gross private.*investment", r"(?i)fixed investment", r"(?i)nonresidential.*investment", r"(?i)residential.*investment"],
        "exclude": [],
        "phrases": {
            **basic_phrases("the private investment component of US GDP"),
            "yoy":   ("Year-over-year change in private fixed investment — the capex cycle of US GDP.", "%, YoY"),
        },
        "how": "Drives productivity growth long-term and is highly cyclical short-term. Residential investment leads recessions; nonresidential structures and equipment lag. AI capex surge is reshaping intellectual-property investment.",
        "anchor": "aUSCGDPPD/A",
    },
    {
        "name": "GDP Component (PCE)",
        "patterns": [r"(?i)personal consumption expenditure", r"(?i)\bpce\b"],
        "exclude": [r"(?i)price index|deflator"],
        "phrases": {
            **basic_phrases("personal consumption expenditures (PCE) in US GDP"),
        },
        "how": "~70% of US GDP. The dominant cyclical driver. Watch real PCE growth alongside real disposable income growth to see whether consumption is income-funded or savings-drawdown-funded.",
        "anchor": "aUSCGDPPD/A",
    },
    {
        "name": "GDP Component (Government)",
        "patterns": [r"(?i)government consumption", r"(?i)federal government.*consumption", r"(?i)national defense.*expenditure"],
        "exclude": [],
        "phrases": basic_phrases("the government spending component of US GDP"),
        "how": "Less cyclical than private components. Direct fiscal-stimulus channel. Federal vs state-and-local mix matters: states are pro-cyclical (balanced-budget constraints), federal is counter-cyclical.",
        "anchor": "aUSCGDPPD/A",
    },
    {
        "name": "Industrial Production",
        "patterns": [r"(?i)industrial production"],
        "exclude": [r"(?i)\bppi\b|price"],
        "phrases": {
            **basic_phrases("US industrial production"),
            "level": ("Level of US industrial production — Federal Reserve G.17 monthly index covering manufacturing, mining, and utilities output.", "Index (2017=100)"),
            "yoy":   ("Year-over-year change in industrial production — sustained negative readings historically signal recession.", "%, YoY"),
            "mom":   ("Month-over-month change in industrial production.", "%, MoM"),
        },
        "how": "Core production-side activity gauge. Manufacturing IP is the cyclical heart; mining tracks energy; utilities is weather-driven. Pair with capacity utilization for the slack/tightness read.",
        "anchor": "aUSIPTOT/A",
    },
    {
        "name": "Capacity Utilization",
        "patterns": [r"(?i)capacity utilization|capacity usage"],
        "exclude": [],
        "phrases": basic_phrases("US capacity utilization", level_unit="%"),
        "how": "Output divided by capacity. Above ~85% historically signals tight conditions and inflation pressure; below ~77% signals slack. Total industry, manufacturing, and mining sub-series available.",
        "anchor": "aUSCAPUTL/A",
    },
    {
        "name": "Retail Sales",
        "patterns": [r"(?i)retail sales", r"(?i)retail.*sale", r"(?i)redbook"],
        "exclude": [r"(?i)profits"],
        "phrases": {
            **basic_phrases("US retail sales"),
            "level": ("Level of US retail sales — Census monthly survey of receipts at retail establishments.", "USD millions"),
            "yoy":   ("Year-over-year change in retail sales — consumer goods spending pulse.", "%, YoY"),
            "mom":   ("Month-over-month change in retail sales — most market-relevant retail-sales statistic.", "%, MoM"),
        },
        "how": "Captures ~1/3 of consumer spending (goods only; services tracked elsewhere). Watch the 'control group' (ex autos, gas, building materials, food services) — it feeds directly into PCE goods. Smooth volatile MoM with 3-month average.",
        "anchor": "aUSCRETF/C",
    },
    {
        "name": "Auto Sales",
        "patterns": [r"(?i)car sales", r"(?i)vehicle sales", r"(?i)truck sales", r"(?i)autodata", r"(?i)wards"],
        "exclude": [r"(?i)production|inventory"],
        "phrases": {
            **basic_phrases("US auto/light-vehicle sales", level_unit="Million units, SAAR"),
            "level": ("US light-vehicle sales — SAAR pace. Monthly industry-source release. Headline auto-market gauge.", "Million units, SAAR"),
        },
        "how": "Light-vehicle SAAR ~15-16M is normal; sub-14M signals weakness. Truck mix dominates (~75% of light-vehicle market). Highly rate-sensitive via auto financing. Pair with light-vehicle inventory days-supply for pricing power signal.",
        "anchor": "aUSVHLS",
    },
    {
        "name": "Auto Production",
        "patterns": [r"(?i)auto.*production", r"(?i)vehicle.*production", r"(?i)domestic auto.*production"],
        "exclude": [],
        "phrases": basic_phrases("US auto production", level_unit="Thousand units"),
        "how": "Plant-level output. Watch alongside sales for inventory build/draw signal. Chip shortages (2021-22) caused unprecedented production cuts; supply chains have largely normalized.",
        "anchor": "aUSDAPRODP",
    },
    {
        "name": "Auto Inventory",
        "patterns": [r"(?i)auto.*inventory", r"(?i)vehicle.*inventory", r"(?i)days?\s*supply"],
        "exclude": [],
        "phrases": basic_phrases("US auto inventory", level_unit="Days supply"),
        "how": "Days-supply gauge: <50 = tight (incentive cuts, strong pricing); >70 = excess (incentives ramp). Drives industry profitability more than unit volume itself.",
        "anchor": "aUSPCARRVO/A",
    },

    # ---- Housing ----
    {
        "name": "Housing Starts",
        "patterns": [r"(?i)housing start"],
        "exclude": [],
        "phrases": basic_phrases("US housing starts", level_unit="Thousand units, SAAR"),
        "how": "Census new-residential-construction starts. Lagging within housing cycle (permits lead, starts follow, completions lag). Single-family vs multi-family split matters: multi-family is more rate-sensitive and has been the swing factor post-2022.",
        "anchor": "aUSHSTART",
    },
    {
        "name": "Building Permits",
        "patterns": [r"(?i)building permit"],
        "exclude": [],
        "phrases": basic_phrases("US building permits", level_unit="Thousand units, SAAR"),
        "how": "Most forward-looking US housing series — a permit issued today translates to a start in 1-3 months. Drop in permits feeds residential investment in GDP 1-2 quarters out. Highly rate-sensitive.",
        "anchor": "aUSBPERMIT",
    },
    {
        "name": "Existing Home Sales",
        "patterns": [r"(?i)existing home sale|existing-home sale"],
        "exclude": [],
        "phrases": basic_phrases("US existing home sales", level_unit="Million units, SAAR"),
        "how": "NAR monthly. ~5x larger than new home sales. Heavily rate-sensitive (most buyers have a low rate to give up). Months-supply is the tight/loose gauge.",
        "anchor": "aUSEHSL/A",
    },
    {
        "name": "New Home Sales",
        "patterns": [r"(?i)new home sale|new-home sale"],
        "exclude": [],
        "phrases": basic_phrases("US new home sales", level_unit="Thousand units, SAAR"),
        "how": "Census monthly. Smaller than existing sales but more cyclical. Builder pricing power gauge.",
        "anchor": "aUSNHSL/A",
    },
    {
        "name": "Home Prices (Case-Shiller)",
        "patterns": [r"(?i)case[\s-]?shiller"],
        "exclude": [],
        "phrases": {
            **basic_phrases("Case-Shiller US home prices"),
            "yoy":   ("Year-over-year change in Case-Shiller home prices — most-watched US home-price gauge.", "%, YoY"),
        },
        "how": "Repeat-sales index, lagged ~2 months. National + 20-city composite. Better for trend than for level. Pair with FHFA HPI for cross-check.",
        "anchor": "aUSCSXR/A",
    },
    {
        "name": "Mortgage Applications (MBA)",
        "patterns": [r"(?i)mba.*mortgage|mortgage.*application"],
        "exclude": [],
        "phrases": basic_phrases("MBA mortgage applications", level_unit="Index"),
        "how": "Weekly Mortgage Bankers Association survey. Real-time housing-finance demand. Purchase index = housing demand; refi index = rate-cycle bellwether (surges when rates fall).",
        "anchor": "aUSMACI/A",
    },

    # ---- Labor ----
    {
        "name": "Nonfarm Payrolls",
        "patterns": [r"(?i)nonfarm.*payroll", r"(?i)non-farm.*payroll", r"(?i)payroll.*nonfarm"],
        "exclude": [r"(?i)benchmark|revision"],
        "phrases": {
            **basic_phrases("US nonfarm payroll employment", level_unit="Thousands"),
            "level": ("Level of US nonfarm payroll employment — total paid employees on US establishment surveys (excluding farms, private households, and certain non-profit categories).", "Thousands"),
            "abs_change": ("Net change in US nonfarm payrolls — the headline 'NFP' jobs number.", "Thousands"),
        },
        "how": "First Friday of the month, BLS release. Single most market-moving US data print. Watch (a) MoM change vs consensus, (b) prior-month revisions, (c) sectoral breakdown, (d) hours and earnings in the same release.",
        "anchor": "aUSNFARM/A",
    },
    {
        "name": "ADP Employment",
        "patterns": [r"(?i)\badp\b"],
        "exclude": [],
        "phrases": basic_phrases("ADP private-sector employment", level_unit="Thousands"),
        "how": "ADP private-payrolls release, two days before BLS NFP. Methodology change in 2022 makes ADP a less-reliable NFP predictor than it once was. Useful as a sectoral cross-check but not the headline.",
        "anchor": "aUSEMPADP/A",
    },
    {
        "name": "Unemployment Rate",
        "patterns": [r"(?i)unemployment rate"],
        "exclude": [r"(?i)nairu|natural rate"],
        "phrases": basic_phrases("the US civilian unemployment rate", level_unit="%"),
        "how": "From the BLS household survey, released alongside NFP. Pair with participation rate: a falling unemployment rate driven by exits (not hires) is weak. Crossing the Sahm Rule threshold (3-mo avg up 0.5pp from trailing-12m low) historically signals recession.",
        "anchor": "aUSUNTOTR",
    },
    {
        "name": "Labor Force Participation",
        "patterns": [r"(?i)participation rate", r"(?i)labor force participation", r"(?i)labour force participation"],
        "exclude": [],
        "phrases": basic_phrases("the US labor force participation rate", level_unit="%"),
        "how": "Labor-force / working-age population. Structural decline post-2008 (boomer retirements + slow recovery). Pair with prime-age (25-54) participation for cleaner cyclical signal.",
        "anchor": "aUSLFP/A",
    },
    {
        "name": "Initial Jobless Claims",
        "patterns": [r"(?i)initial.*claims|jobless claims", r"(?i)claims.*initial"],
        "exclude": [r"(?i)by state"],
        "phrases": basic_phrases("US initial jobless claims", level_unit="Thousands"),
        "how": "Highest-frequency US labor data — weekly Thursday release. Watch the 4-week moving average for trend. Sustained moves above ~250k signal labor-market deterioration.",
        "anchor": "aUSLIDXAWIC/A",
    },
    {
        "name": "JOLTS",
        "patterns": [r"(?i)\bjolts\b", r"(?i)job opening", r"(?i)hires", r"(?i)quits", r"(?i)separations"],
        "exclude": [],
        "phrases": {
            **basic_phrases("US labor market flows (JOLTS)"),
            "level": ("Level of a JOLTS measure — BLS Job Openings and Labor Turnover Survey, monthly. Job openings = posted vacancies; hires = new starts; quits = voluntary departures; separations = total departures.", "Thousands"),
        },
        "how": "Quits rate is the cleanest worker-confidence gauge — high quits = workers confident they can find better jobs. Openings/unemployed ratio (V/U) was Fed's preferred labor-tightness gauge during 2022-23 wage-spiral concerns.",
        "anchor": "aUSJBSEPRO/A",
    },
    {
        "name": "Average Hourly Earnings",
        "patterns": [r"(?i)average hourly earnings", r"(?i)\bahe\b"],
        "exclude": [],
        "phrases": {
            **basic_phrases("average hourly earnings (AHE)"),
            "level": ("Level of average hourly earnings, total private — BLS establishment-survey wage measure released alongside NFP.", "USD/hour"),
            "yoy":   ("Year-over-year change in average hourly earnings — wage-inflation gauge. >4% YoY is too hot for the Fed's 2% target.", "%, YoY"),
        },
        "how": "Headline US wage gauge. Released with NFP. Limited by composition shifts (changes in low-wage vs high-wage jobs distort the print). The Atlanta Fed Wage Tracker controls for composition; ECI is cleaner quarterly.",
        "anchor": "aUSEARNH/A",
    },
    {
        "name": "Employment Cost Index (ECI)",
        "patterns": [r"(?i)employment cost index", r"(?i)\beci\b"],
        "exclude": [],
        "phrases": basic_phrases("the Employment Cost Index (ECI)"),
        "how": "Fed's preferred wage gauge — quarterly, includes benefits, controls for industry/occupation mix. >4% YoY is too high for 2% inflation. Released on Fed black-out weeks; cleanest wage signal.",
        "anchor": "aUSEMPCI/A",
    },
    {
        "name": "Productivity",
        "patterns": [r"(?i)productivity", r"(?i)output per hour"],
        "exclude": [],
        "phrases": basic_phrases("US labor productivity (output per hour)"),
        "how": "Trend is ~1.5%/yr; faster growth = lower unit-labor-cost inflation. AI investment surge may be lifting trend forward. Manufacturing productivity has historically grown faster than services; gap narrowed since 2010.",
        "anchor": "aUSPHOPBUS/A",
    },
    {
        "name": "Unit Labor Costs",
        "patterns": [r"(?i)unit labor cost|unit labour cost"],
        "exclude": [],
        "phrases": basic_phrases("US unit labor costs (compensation per unit of output)"),
        "how": "Cleanest labor-cost-driven inflation signal. ULC growth > productivity growth = wage-push inflation. Watch the 4-quarter change.",
        "anchor": "aUSULCNF/A",
    },

    # ---- Surveys ----
    {
        "name": "ISM Manufacturing PMI",
        "patterns": [r"(?i)ism manufactur", r"(?i)\bnapm\b", r"(?i)pmi.*total\b"],
        "exclude": [r"(?i)non[-\s]?manufactur|services"],
        "phrases": {
            **basic_phrases("ISM Manufacturing PMI", level_unit="Diffusion index (50=neutral)"),
            "level": ("ISM Manufacturing PMI — composite diffusion index of new orders, production, employment, supplier deliveries, and inventories. Released first business day of each month.", "Diffusion index (50=neutral)"),
        },
        "how": "Above 50 = expansion; below 50 = contraction. Sustained sub-50 prints (3+ months) historically correlate with recession risk. New orders is the most forward-looking sub-index; prices paid is an early inflation signal.",
        "anchor": "aUSNPMI/A",
    },
    {
        "name": "ISM Services PMI",
        "patterns": [r"(?i)ism non[-\s]?manufactur", r"(?i)ism.*service", r"(?i)\bnmi\b"],
        "exclude": [],
        "phrases": basic_phrases("ISM Services PMI", level_unit="Diffusion index (50=neutral)"),
        "how": "Same 50-line interpretation as manufacturing PMI. Services are ~70% of US GDP, so this often matters more than mfg. Watch services prices index as a leading indicator for core services CPI/PCE.",
        "anchor": "aUSNMFGPMI",
    },
    {
        "name": "Conference Board Consumer Confidence",
        "patterns": [r"(?i)conference board.*confidence", r"(?i)consumer confidence.*conference"],
        "exclude": [],
        "phrases": basic_phrases("Conference Board Consumer Confidence", level_unit="Index (1985=100)"),
        "how": "Pair with UMich sentiment — they sometimes diverge (CB is more labor-market sensitive, UMich more inflation-sensitive). The Expectations sub-index leads recessions: a >20pt YoY drop is a historical warning.",
        "anchor": "aUSCONCF/A",
    },
    {
        "name": "UMich Consumer Sentiment",
        "patterns": [r"(?i)university of michigan|umich"],
        "exclude": [],
        "phrases": basic_phrases("UMich Consumer Sentiment", level_unit="Index"),
        "how": "More inflation-sensitive than Conference Board. Twice-monthly release: preliminary mid-month, final end of month. The 1-year and 5-10-year inflation expectation sub-questions are Fed-monitored.",
        "anchor": "aUSUMSRAPH",
    },
    {
        "name": "Regional Fed Survey (Empire/NY)",
        "patterns": [r"(?i)empire state|new york fed.*manufactur"],
        "exclude": [],
        "phrases": basic_phrases("the New York Fed's Empire State Manufacturing Survey", level_unit="Diffusion index"),
        "how": "First regional Fed manufacturing survey of each month. Net-balance (% saying 'higher' minus % 'lower') for each component. Reasonable leading indicator for ISM Manufacturing.",
        "anchor": "aUSNYWER",
    },
    {
        "name": "Regional Fed Survey (Philly)",
        "patterns": [r"(?i)philadelphia fed|philly fed"],
        "exclude": [],
        "phrases": basic_phrases("the Philadelphia Fed Manufacturing Survey", level_unit="Diffusion index"),
        "how": "Released mid-month. Six-month-ahead expectations sub-index is one of the better recession-warning indicators. Smaller sample than ISM but earlier release.",
        "anchor": "aUSNPMI/A",
    },
    {
        "name": "Regional Fed Survey",
        "patterns": [r"(?i)dallas fed|kansas city fed.*manufactur|richmond fed"],
        "exclude": [],
        "phrases": basic_phrases("a regional Fed business survey", level_unit="Diffusion index"),
        "how": "Regional Fed business surveys collectively give an early read on the upcoming ISM print. Watch sub-indexes (new orders, prices, employment) for direction. Each district reflects regional industry mix (Dallas = energy-heavy, Richmond = services-heavier).",
        "anchor": "aUSNPMI/A",
    },
    {
        "name": "Conference Board LEI",
        "patterns": [r"(?i)leading.*index|leading economic", r"(?i)\blei\b"],
        "exclude": [],
        "phrases": basic_phrases("the Conference Board Leading Economic Index (LEI)"),
        "how": "Composite of 10 leading indicators. Sustained 6-month declines historically signal recession with 6-12 month lead. Was a false positive in 2022-23 (predicted recession that didn't arrive). Use alongside yield curve, not in isolation.",
        "anchor": "aUSCLEAD/A",
    },
    {
        "name": "Sahm Rule",
        "patterns": [r"(?i)sahm"],
        "exclude": [],
        "phrases": basic_phrases("the Sahm Rule recession indicator", level_unit="Percentage points"),
        "how": "Triggers when 3-month avg unemployment rate is ≥0.5pp above its trailing-12-month low. Has fired at the start of every US recession since 1970. A trigger doesn't make a recession inevitable; flagging it warrants caution.",
        "anchor": "aUSRSAHMN/A",
    },

    # ---- Money / Credit / Fed ----
    {
        "name": "Fed Funds Rate",
        "patterns": [r"(?i)fed.*funds.*rate", r"(?i)federal funds.*rate"],
        "exclude": [],
        "phrases": basic_phrases("the Federal Funds Rate", level_unit="%"),
        "how": "Fed's primary policy lever. Effective rate trades within the FOMC target range. Anchor for the entire US yield curve. Real fed funds = nominal − expected inflation; positive and rising = restrictive policy.",
        "anchor": "aUSFEDFUND",
    },
    {
        "name": "Fed Reserve Operations",
        "patterns": [r"(?i)\biorb\b|interest on reserve|interest on excess", r"(?i)overnight.*repo|reverse repo|\brrp\b", r"(?i)discount window"],
        "exclude": [],
        "phrases": basic_phrases("a Fed money-market operation rate", level_unit="%"),
        "how": "Component of the fed funds corridor. IORB = ceiling for banks; ON RRP = floor for non-banks. Discount window = stigma rate above the corridor. RRP usage drops as Fed shrinks balance sheet via QT.",
        "anchor": "aUSIORAR",
    },
    {
        "name": "Money Supply",
        "patterns": [r"(?i)money supply", r"(?i)\bm[012]\b", r"(?i)monetary base|adjusted reserves"],
        "exclude": [],
        "phrases": {
            **basic_phrases("US money supply"),
            "level": ("Level of a US money supply aggregate — M0 (base), M1 (transactions), or M2 (M1 + small time deposits + retail money funds).", "USD billions"),
            "yoy":   ("Year-over-year change in money supply. M2 surged 27% in 2021 post-stimulus and contracted in 2023 — first sustained negative since the 1930s.", "%, YoY"),
        },
        "how": "Loose proxy for inflation 12-18 months out (monetarist view). M1 definition expanded in May 2020 to include savings deposits — pre-2020 series not directly comparable. M2 is the most-watched aggregate; M3 was discontinued in 2006.",
        "anchor": "aUSCMS2B/A",
    },
    {
        "name": "Treasury Securities Outstanding",
        "patterns": [r"(?i)treasury securities outstanding", r"(?i)treasury.*outstanding"],
        "exclude": [r"(?i)yield"],
        "phrases": basic_phrases("US Treasury securities outstanding", level_unit="USD millions"),
        "how": "Total marketable Treasury supply. Subtract Fed holdings (SOMA) for free-float supply that competes for private capital. Bills (≤1Y) vs notes (2-10Y) vs bonds (>10Y) split matters: heavy bill issuance keeps front-end yields elevated.",
        "anchor": "aUSSECMKTA",
    },
    {
        "name": "Treasury Yield",
        "patterns": [r"(?i)treasury.*yield", r"(?i)yield.*treasury", r"(?i)constant maturity", r"(?i)government bond.*yield", r"(?i)bond yield"],
        "exclude": [],
        "phrases": basic_phrases("a US Treasury yield", level_unit="%"),
        "how": "US Treasury yield by maturity. The 10Y is the global reference long rate. 2s10s spread is the classic recession signal (inversion historically precedes recession). Decompose into real yield (TIPS) + breakeven inflation.",
        "anchor": "aUSGBOND",
    },
    {
        "name": "Mortgage Rate",
        "patterns": [r"(?i)mortgage.*rate", r"(?i)\bfrm\b"],
        "exclude": [r"(?i)delinquency|foreclosure"],
        "phrases": basic_phrases("a US mortgage rate", level_unit="%"),
        "how": "30Y fixed mortgage rate is the household-relevant rate. Spread to 10Y Treasury (typically 150-200bp) widens during housing/MBS stress. Drives housing affordability and turnover.",
        "anchor": "aUSMBAMLR",
    },
    {
        "name": "Bank Lending Rate (Prime)",
        "patterns": [r"(?i)prime rate"],
        "exclude": [],
        "phrases": basic_phrases("the bank prime rate", level_unit="%"),
        "how": "Anchored at fed funds target + 3.0pp. Not market-determined; admin-set by banks. Reference rate for HELOCs and many commercial loans.",
        "anchor": "aUSPRIME",
    },
    {
        "name": "Consumer Credit",
        "patterns": [r"(?i)consumer credit", r"(?i)consumer.*loan", r"(?i)revolving credit", r"(?i)nonrevolving"],
        "exclude": [r"(?i)delinquency|charge[\s-]?off"],
        "phrases": basic_phrases("US consumer credit outstanding", level_unit="USD billions"),
        "how": "G.19 monthly. Revolving = credit cards (~$1.2T+, hit record 2024); non-revolving = auto + student + personal (~$3.7T). Watch growth rate alongside delinquencies to gauge consumer balance-sheet stress.",
        "anchor": "aUSCRDOUTA",
    },
    {
        "name": "Bank Lending (C&I, Real Estate)",
        "patterns": [r"(?i)commercial and industrial|\bc&i\b", r"(?i)real estate.*loan", r"(?i)bank.*lending"],
        "exclude": [r"(?i)charge[\s-]?off|delinquency"],
        "phrases": basic_phrases("US bank lending"),
        "how": "Bank credit cycle. Slows ahead of recessions; SLOOS tightening leads loan-volume slowdown by 1-2 quarters. CRE lending stress concentrated in regional banks post-2022.",
        "anchor": "aUSBCACIB/A",
    },
    {
        "name": "Bank Charge-offs",
        "patterns": [r"(?i)charge[\s-]?off"],
        "exclude": [],
        "phrases": basic_phrases("a bank loan charge-off rate", level_unit="%"),
        "how": "Realized loan losses. Counter-cyclical: rises ~6-12 months after recession start. Credit cards is most pro-cyclical loan category. CECL accounting now front-loads provisions.",
        "anchor": "aUSBCLTLQ/A",
    },
    {
        "name": "Bank Delinquencies",
        "patterns": [r"(?i)delinquen"],
        "exclude": [],
        "phrases": basic_phrases("a bank loan delinquency rate", level_unit="%"),
        "how": "Earlier-stage stress signal than charge-offs. Watch credit card and auto delinquencies for consumer stress; CRE delinquencies (especially office) for commercial real estate stress.",
        "anchor": "aUSBDLTLQ/A",
    },
    {
        "name": "Mortgage Delinquencies / Foreclosures",
        "patterns": [r"(?i)mortgage.*delinquen|loan.*past due", r"(?i)foreclosure"],
        "exclude": [],
        "phrases": basic_phrases("US mortgage delinquencies/foreclosures", level_unit="%"),
        "how": "MBA quarterly survey. Tame post-2008 (mortgage credit standards strict). Crossing ~5% historically signals housing-finance stress; currently ~3%.",
        "anchor": "aUSMGDHQ/A",
    },

    # ---- Government / Fiscal ----
    {
        "name": "Federal Outlays (Function)",
        "patterns": [r"(?i)federal outlays", r"(?i)government.*outlays", r"(?i)budget outlays"],
        "exclude": [r"(?i)receipts"],
        "phrases": basic_phrases("US federal outlays by function", level_unit="USD millions"),
        "how": "Sub-category of federal spending. Largest mandatory: Social Security, Medicare, Medicaid, net interest, defense. Net interest is now larger than defense — a structural fiscal-sustainability concern.",
        "anchor": "aUSFOUTL",
    },
    {
        "name": "Federal Receipts",
        "patterns": [r"(?i)federal receipts", r"(?i)federal.*revenue"],
        "exclude": [],
        "phrases": basic_phrases("US federal tax receipts", level_unit="USD millions"),
        "how": "~17-18% of GDP. ~50% individual income tax, ~35% payroll, ~10% corporate, ~5% other. Receipt shortfalls vs forecast signal economic weakness. Tax-cut effects show up here directly.",
        "anchor": "aUSFEDREC",
    },
    {
        "name": "Federal Budget Deficit",
        "patterns": [r"(?i)federal.*deficit|federal.*surplus", r"(?i)budget.*deficit|budget.*surplus", r"(?i)federal.*government.*surplus"],
        "exclude": [],
        "phrases": basic_phrases("the US federal budget balance", level_unit="USD millions"),
        "how": "Headline fiscal stance. Currently ~$1.8T deficit (~6% of GDP) — unprecedented for non-recession peacetime. Watch the deficit/GDP ratio: >5% in expansion = limited fiscal room for the next recession.",
        "anchor": "aUSGDEF",
    },
    {
        "name": "Federal Debt",
        "patterns": [r"(?i)federal debt", r"(?i)public debt", r"(?i)treasury debt"],
        "exclude": [r"(?i)yield"],
        "phrases": basic_phrases("US federal debt outstanding", level_unit="USD millions"),
        "how": "For market impact, debt-held-by-public is more relevant than gross debt. Watch alongside debt/GDP for fiscal-sustainability framing.",
        "anchor": "aUSFEDETOS",
    },

    # ---- Trade / External ----
    {
        "name": "Current Account",
        "patterns": [r"(?i)current account"],
        "exclude": [],
        "phrases": basic_phrases("the US current account balance", level_unit="USD millions"),
        "how": "Sum of trade balance (goods + services) + primary income (investment income) + secondary income (transfers). Persistent ~$200-300B/quarter deficit funded by capital inflows. Reserve currency status sustains it.",
        "anchor": "aUSCURAC",
    },
    {
        "name": "Trade Balance",
        "patterns": [r"(?i)trade balance", r"(?i)goods.*balance", r"(?i)visible trade", r"(?i)balance.*goods", r"(?i)balance, goods"],
        "exclude": [r"(?i)current account"],
        "phrases": basic_phrases("the US trade balance", level_unit="USD millions"),
        "how": "Goods deficit dominates; services surplus partially offsets. Energy, autos, electronics, agricultural goods are the swing items. Advance Goods Trade Balance (released ~3 days before full report) often moves USD.",
        "anchor": "aUSGS/A",
    },
    {
        "name": "Imports",
        "patterns": [r"(?i)\bimports\b", r"(?i)import.*goods", r"(?i)import.*services"],
        "exclude": [r"(?i)price|deflator", r"(?i)balance"],
        "phrases": basic_phrases("US imports"),
        "how": "Largest categories: consumer goods, capital goods, autos, industrial supplies. Goods imports cycle with US demand; services imports steadier. Watch country shares (especially China — tariff overlay).",
        "anchor": "aUSCURACIMG/A",
    },
    {
        "name": "Exports",
        "patterns": [r"(?i)\bexports\b", r"(?i)export.*goods", r"(?i)export.*services"],
        "exclude": [r"(?i)price|deflator", r"(?i)balance"],
        "phrases": basic_phrases("US exports"),
        "how": "Largest categories: capital goods, services (financial, IP, travel), industrial supplies. Services exports persistently surplus. Strong USD compresses receipts in local-currency-equivalent terms.",
        "anchor": "aUSCURACEXG/A",
    },
    {
        "name": "FDI",
        "patterns": [r"(?i)foreign direct investment|\bfdi\b", r"(?i)direct investment.*abroad", r"(?i)direct investment.*\bus\b|direct investment in.*united states"],
        "exclude": [],
        "phrases": basic_phrases("US foreign direct investment (FDI)", level_unit="USD millions"),
        "how": "Inward FDI ~$5T cumulative; outward ~$6T. Major bilaterals: UK, Japan, Netherlands, Canada (in); Canada, UK, Netherlands, Mexico (out). USMCA-driven nearshoring is reshaping Mexico flows.",
        "anchor": "aUSIVDFA",
    },
    {
        "name": "TIC Flows",
        "patterns": [r"(?i)\btic\b|treasury international capital", r"(?i)foreign.*purchases.*treasur", r"(?i)foreign.*holdings.*treasur"],
        "exclude": [],
        "phrases": basic_phrases("Treasury International Capital (TIC) flows", level_unit="USD millions"),
        "how": "Foreign holdings/flows in US securities. Big swings move long-end yields. Monthly data lagged ~2 months. China and Japan are the largest official UST holders; private foreign holdings have grown faster post-2010.",
        "anchor": "aUSFBTAA",
    },
    {
        "name": "Exchange Rate",
        "patterns": [r"(?i)exchange rate", r"(?i)trade.weighted", r"(?i)\beur\b.*\busd\b|\busd\b.*\beur\b"],
        "exclude": [],
        "phrases": {
            **basic_phrases("a US dollar exchange rate", level_unit="Index"),
            "level": ("USD exchange rate measure — bilateral (e.g. EUR/USD) or trade-weighted index against a basket of currencies.", "Index or USD/foreign"),
        },
        "how": "USD trade-weighted index (BIS or Fed) is the broad-strength gauge. Real EER strips out inflation differentials — true competitiveness measure. Strong USD ~5%+ YoY is a drag on US multinational EPS.",
        "anchor": "aUSCXTWF/C",
    },
    {
        "name": "Reserve Assets",
        "patterns": [r"(?i)reserve assets", r"(?i)foreign currency reserves|fx reserves", r"(?i)gold stock|gold reserves", r"(?i)\bsdr\b|special drawing rights", r"(?i)imf.*position|reserve.*imf"],
        "exclude": [],
        "phrases": basic_phrases("US international reserve assets", level_unit="USD millions"),
        "how": "Tiny vs other countries because USD is reserve currency — US doesn't need much. Mostly gold (valued at legacy book ~$42/oz, vastly understated vs market). FX reserves rarely deployed for intervention.",
        "anchor": "aUSCRESA",
    },

    # ---- Energy / Commodities ----
    {
        "name": "Crude Oil Price",
        "patterns": [r"(?i)\bwti\b|west texas|cushing.*crude.*price", r"(?i)\bbrent\b", r"(?i)crude.*price"],
        "exclude": [r"(?i)stock|inventor|production|imports?|exports?"],
        "phrases": basic_phrases("a crude oil price", level_unit="USD/barrel"),
        "how": "WTI = US benchmark (Cushing OK delivery); Brent = global benchmark. Brent-WTI spread reflects US supply/export dynamics. Big swings driven by OPEC+ decisions, demand surprises, geopolitics.",
        "anchor": "aUSWHCRUDE",
    },
    {
        "name": "Crude Oil Inventories",
        "patterns": [r"(?i)crude oil.*stock|crude.*inventor"],
        "exclude": [r"(?i)price"],
        "phrases": basic_phrases("US crude oil inventories", level_unit="Thousand barrels"),
        "how": "Most-watched US oil stat (weekly EIA, Wednesday). Big surprises vs API/consensus drive intraday WTI. Cushing stocks specifically (WTI deliverable) — below 25M bbl = tank tops empty risk.",
        "anchor": "aUSEIACS",
    },
    {
        "name": "Natural Gas",
        "patterns": [r"(?i)natural gas|\bnat\.?\s*gas\b", r"(?i)henry hub"],
        "exclude": [r"(?i)electricity"],
        "phrases": basic_phrases("US natural gas data"),
        "how": "Henry Hub = US benchmark. Storage report (weekly EIA Thursday) is the price-moving release. LNG export terminal demand provides a price floor; winter heating demand provides volatility.",
        "anchor": "aUSWHHUB",
    },
    {
        "name": "Refining",
        "patterns": [r"(?i)refinery|crude.*runs|refinery capacity"],
        "exclude": [r"(?i)price"],
        "phrases": basic_phrases("US refinery operations"),
        "how": "Refinery utilization 85-95% normal; drops sharply during hurricane season (Gulf shut-ins). Pair refinery inputs with crude imports + crude production for fundamental balance.",
        "anchor": "aUSEIACR",
    },
    {
        "name": "Gasoline / Distillate Stocks",
        "patterns": [r"(?i)gasoline.*stock|gasoline.*inventor", r"(?i)distillate.*stock|distillate.*inventor"],
        "exclude": [r"(?i)price"],
        "phrases": basic_phrases("US refined-product inventories", level_unit="Thousand barrels"),
        "how": "Below 5-year range = bullish for product cracks. Gasoline draws during summer driving; distillate draws during winter heating. Watch alongside refinery utilization for products imbalance.",
        "anchor": "aUSEIAGS",
    },

    # ---- Agriculture ----
    {
        "name": "Crop Production / Stocks",
        "patterns": [r"(?i)\bcorn\b", r"(?i)\bsoybean\b|\bsoy\b", r"(?i)\bwheat\b", r"(?i)\bcotton\b"],
        "exclude": [r"(?i)oil.*export|export sale"],
        "phrases": basic_phrases("a US crop production/stock measure"),
        "how": "USDA NASS / WASDE estimates. Stocks-to-use ratio drives prices: <10% = tight, >20% = ample. Big producer + exporter; soybean trade especially China-sensitive.",
        "anchor": "aUSCOMPCRP",
    },
    {
        "name": "Livestock",
        "patterns": [r"(?i)\bcattle\b|\bbeef\b", r"(?i)\bhog\b|\bpork\b|\bswine\b", r"(?i)broiler|chicken|poultry"],
        "exclude": [],
        "phrases": basic_phrases("US livestock data"),
        "how": "Cattle on feed = beef supply pipeline 6-9 months out. Slaughter rates = current production. Cold storage = demand cushion.",
        "anchor": "aUSCOPCC/A",
    },

    # ---- Surveys (other) ----
    {
        "name": "Bankruptcies",
        "patterns": [r"(?i)bankrupt"],
        "exclude": [],
        "phrases": basic_phrases("US bankruptcy filings", level_unit="Filings"),
        "how": "Trailing indicator. Spikes during recessions. Business filings track corporate distress; consumer filings track household distress (healthcare, divorce historically dominant). Chapter 11 specifically captures reorganization.",
        "anchor": "aUSBNRQP",
    },
    {
        "name": "Personal Income",
        "patterns": [r"(?i)personal income|disposable.*income"],
        "exclude": [r"(?i)tax"],
        "phrases": basic_phrases("US personal income"),
        "how": "BEA Personal Income & Outlays release. Disposable personal income (DPI) = income after taxes; real DPI is the master consumer-spending-power gauge. Saving rate = (DPI − consumption) / DPI; ~4% currently is historically low.",
        "anchor": "aUSPDIA/A",
    },
    {
        "name": "Saving Rate",
        "patterns": [r"(?i)saving rate|personal saving"],
        "exclude": [],
        "phrases": basic_phrases("the US personal saving rate", level_unit="%"),
        "how": "Disposable income minus consumption, divided by disposable income. ~4% currently — historically low. Stimulus surge depleted; suggests limited consumer cushion if income growth slows.",
        "anchor": "aUSPSV/A",
    },

    # ---- Equity Markets ----
    {
        "name": "S&P 500",
        "patterns": [r"(?i)standard\s*&\s*poors.*500|s&p\s*500|sp\s*500", r"(?i)500 composite|500 common stocks"],
        "exclude": [r"(?i)foreign|uk\b|euro|japan"],
        "phrases": basic_phrases("the S&P 500 equity index"),
        "how": "Headline US equity benchmark. Cap-weighted; megacap tech dominates recent returns. Watch CAPE (Shiller P/E10) for valuation framing — >30 historically signals lower forward returns.",
        "anchor": "aUSSPCOM",
    },
    {
        "name": "Equity Valuation",
        "patterns": [r"(?i)\bp/?e\b|price[\s-]?earnings|cape|shiller", r"(?i)dividend yield"],
        "exclude": [],
        "phrases": basic_phrases("US equity valuation"),
        "how": "P/E and dividend yield are the standard valuation gauges. Shiller CAPE (P/E10) smooths cyclical earnings. Compare against 10Y Treasury to compute equity risk premium.",
        "anchor": "aUSSPRPER",
    },

    # ---- Demographics ----
    {
        "name": "Population (age cohort)",
        "patterns": [r"(?i)population", r"(?i)civilian noninstitutional"],
        "exclude": [r"(?i)tourism|travel"],
        "phrases": basic_phrases("a US population cohort", level_unit="Persons"),
        "how": "Working-age population drives labor supply trend; aging cohorts drive Medicare/Social Security demand. Total US population growth has slowed to ~0.5%/yr from ~1%/yr historically.",
        "anchor": "aUSPOPTO",
    },
    {
        "name": "Mortality",
        "patterns": [r"(?i)deaths", r"(?i)excess deaths"],
        "exclude": [],
        "phrases": basic_phrases("US mortality data"),
        "how": "Excess deaths vs 2015-19 baseline is the cleanest pandemic + aging signal. Lagged 1-2 weeks. Returned to ~baseline post-2023.",
        "anchor": "aUSDTHEX",
    },

    # ---- Forecasts / Projections ----
    # NB: phrase templates here are deliberately direct (not wrapped in "forecast of...")
    # because the concept itself already IS a forecast.
    {
        "name": "CBO Projection",
        "patterns": [r"(?i)\bcbo\b", r"(?i)congressional budget office"],
        "exclude": [],
        "phrases": {
            "level":    ("CBO baseline projection — current-law forecast for a US fiscal or macroeconomic line.", "USD billions or %"),
            "forecast": ("CBO baseline projection — current-law forecast for a US fiscal or macroeconomic line.", "USD billions or %"),
            "yoy":      ("Year-over-year change in a CBO baseline projection.", "%, YoY"),
            "qoq":      ("Quarter-over-quarter change in a CBO baseline projection.", "%, QoQ"),
            "pct_gdp":  ("CBO baseline projection expressed as a percentage of GDP.", "% of GDP"),
        },
        "how": "Congressional Budget Office baseline — assumes current law. Reference for fiscal-cliff debates and long-run sustainability framing. Updated semi-annually; alternative scenarios published alongside.",
        "anchor": "aUSFCBOUT",
    },
    {
        "name": "Fed SEP",
        "patterns": [r"(?i)federal reserve.*forecast|federal reserve.*central tendency", r"(?i)\bsep\b|summary of economic projection"],
        "exclude": [],
        "phrases": {
            "level":    ("Federal Reserve Summary of Economic Projections (SEP) — FOMC-participant median or central-tendency forecast.", ""),
            "forecast": ("Federal Reserve Summary of Economic Projections (SEP) — FOMC-participant median or central-tendency forecast.", ""),
        },
        "how": "Quarterly SEP from FOMC participants: median + central tendency + range for GDP, unemployment, inflation, and the dot-plot fed funds path. Markets focus on the dots and the longer-run 'neutral rate' estimate.",
        "anchor": "aUSFCCUFHR",
    },
    {
        "name": "Reuters Poll Consensus",
        "patterns": [r"(?i)reuters poll", r"(?i)consensus forecast"],
        "exclude": [],
        "phrases": {
            "level":    ("Reuters consensus median of forecasters' expectations for this US data point.", ""),
            "forecast": ("Reuters consensus median of forecasters' expectations for this US data point.", ""),
        },
        "how": "Median of analyst forecasts. Use as the consensus against which actual prints surprise — beats/misses drive intraday market reactions.",
        "anchor": "aUSAGDPF",
    },

    # ---- Misc balance-sheet items ----
    {
        "name": "Capacity / Output utilization",
        "patterns": [r"(?i)utilization"],
        "exclude": [r"(?i)refinery"],
        "phrases": basic_phrases("a capacity-utilization measure", level_unit="%"),
        "how": "Output as a share of capacity. Above ~85% historically signals tight conditions and inflation pressure.",
        "anchor": "aUSCAPUTL/A",
    },
    {
        "name": "Inventory / Inventory-to-Sales",
        "patterns": [r"(?i)\binventor", r"(?i)stock.*ratio"],
        "exclude": [r"(?i)oil|crude|gasoline|petroleum|gas storage|natural gas"],
        "phrases": basic_phrases("a US business inventory measure"),
        "how": "Inventory-to-sales ratio is the cycle gauge — rising = excess (margin pressure ahead); falling = shortage (pricing power). Watch alongside ISM customer-inventories sub-index.",
        "anchor": "aUSCRETF/C",
    },
    {
        "name": "Factory Orders",
        "patterns": [r"(?i)factory orders|new orders|durable goods orders"],
        "exclude": [],
        "phrases": basic_phrases("US factory orders", level_unit="USD millions"),
        "how": "Census manufacturing & trade survey. Durable goods orders (especially core capex = ex aircraft + defense) leads business investment. Watch the core capex sub-aggregate for capex cycle.",
        "anchor": "aUSDGOR/A",
    },
    {
        "name": "Shipments",
        "patterns": [r"(?i)shipment"],
        "exclude": [],
        "phrases": basic_phrases("US factory shipments", level_unit="USD millions"),
        "how": "Realized output (vs new orders = forward demand). Shipments-to-orders ratio reveals whether the order book is converting to revenue.",
        "anchor": "aUSCRETF/C",
    },

    # ---- Government Spending Programs ----
    {
        "name": "Social Security",
        "patterns": [r"(?i)social security"],
        "exclude": [],
        "only_in": ["us_government_accounts"],
        "phrases": basic_phrases("US Social Security spending"),
        "how": "Largest single federal program. Demographic locomotive: ~6%/yr growth on autopilot. Trust fund depletion projected ~2034 absent reform.",
        "anchor": "aUSXGBSOCA",
    },
    {
        "name": "Medicare",
        "patterns": [r"(?i)medicare\b"],
        "exclude": [r"(?i)medicaid"],
        "only_in": ["us_government_accounts"],
        "phrases": basic_phrases("US Medicare spending"),
        "how": "Largest single program after Social Security. Growing 5-7%/yr from demographics + healthcare inflation.",
        "anchor": "aUSXGBMEDA",
    },
    {
        "name": "Defense",
        "patterns": [r"(?i)national defense|defense outlays"],
        "exclude": [],
        "only_in": ["us_government_accounts"],
        "phrases": basic_phrases("US national defense spending"),
        "how": "~13% of total federal outlays. Now smaller than net interest. NATO 2% commitment binds upward.",
        "anchor": "aUSXGBDEFA",
    },

    # ---- TWO LATER COVERAGE FILLERS ----
    {
        "name": "Air Travel",
        "patterns": [r"(?i)air passenger|air cargo|passenger.*miles|enplane|tsa"],
        "exclude": [],
        "phrases": basic_phrases("a US air-travel activity measure"),
        "how": "TSA throughput is highest-frequency travel-demand indicator. Pair revenue passenger miles (RPM) with available seat miles (ASM) for load factor. Cargo ton-miles leads trade flows.",
        "anchor": "aUSAIRP",
    },
    {
        "name": "Tourism",
        "patterns": [r"(?i)\btourism\b|travel.*industry", r"(?i)hotel|accommodat"],
        "exclude": [],
        "phrases": basic_phrases("a US tourism activity measure"),
        "how": "Pair with leisure & hospitality payrolls and consumer confidence. Sensitive to fuel costs, business-travel cycles, and exchange rates (inbound tourism).",
        "anchor": "aUSSTIND/A",
    },
    {
        "name": "Tax Receipts (Federal)",
        "patterns": [r"(?i)federal.*tax|individual income tax|payroll tax|corporate.*tax"],
        "exclude": [],
        "phrases": basic_phrases("a US federal tax receipt category"),
        "how": "Sub-component of federal receipts. Individual income (~50%), payroll (~35%), corporate (~10%), other (~5%). Watch the composition over time as economic regime shifts.",
        "anchor": "aUSFEDREC",
    },
]


# ============================================================================
#  COMPOSER
# ============================================================================

def _matches_any(desc: str, patterns: list[str]) -> bool:
    return any(re.search(p, desc) for p in patterns)


def _strip_noise(desc: str) -> str:
    """Strip common 'tagging' prefixes/suffixes that clutter Refinitiv descriptions."""
    if not desc:
        return desc
    # Strip leading "Labour Market n.i.e," etc.
    desc = re.sub(r"^Labour Market n\.i\.e,\s*", "", desc, flags=re.I)
    desc = re.sub(r"^Labor Market n\.i\.e,\s*", "", desc, flags=re.I)
    # Strip Refinitiv metadata suffixes (everything after the source agency tag).
    # Patterns like "..., Quarterly, BEA - Bureau of Economic Analysis, U.S. Department of Commerce"
    # or "..., GDP Deflators, Quarterly, BEA - Bureau..."
    # Keep up to the first occurrence of the metadata tail.
    desc = re.sub(
        r",\s*(Quarterly|Monthly|Weekly|Daily|Annual)\s*,\s*(BEA|BLS|Federal Reserve|FED|Fed|Census|EIA|USDA|FRB|Treasury|FOMC|OECD|IMF|MBA|NAR|S&P|Markit|S\&P Global|Conference Board|Reuters|LSEG|University of Michigan|UMich)[\s\S]*$",
        "",
        desc,
    )
    # Strip standalone trailing metadata phrases.
    desc = re.sub(r",\s*Constant Prices[\s\S]*$", ", constant prices", desc)
    desc = re.sub(r",\s*Current Prices[\s\S]*$", ", current prices", desc)
    desc = re.sub(r",\s*Standardized\s*$", "", desc)
    desc = re.sub(r"\s*-\s*Acutal\s*", " ", desc)  # typo in source data
    desc = re.sub(r"\s*-\s*Actual\s*", " ", desc)
    return desc.strip().rstrip(",;.")


def match_concept(description: str, category_slug: str = "") -> dict | None:
    desc = description or ""
    for c in CONCEPTS:
        if c.get("exclude") and _matches_any(desc, c["exclude"]):
            continue
        # Category gating: if 'only_in' is set, this concept is restricted
        only_in = c.get("only_in")
        if only_in and category_slug and category_slug not in only_in:
            continue
        if _matches_any(desc, c["patterns"]):
            return c
    return None


def _humanize(text: str) -> str:
    """Clean up an ALL-CAPS or weirdly-formatted description for use as a sentence."""
    if not text:
        return text
    # Collapse runs of whitespace
    text = re.sub(r"\s+", " ", text).strip().rstrip(".,;")
    # If mostly uppercase, title-case it (preserving common acronyms)
    letters = [c for c in text if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.7:
        # Title-case but preserve known acronyms
        words = text.split()
        result = []
        keep_caps = {"US", "GDP", "CPI", "PCE", "PPI", "ISM", "NAPM", "PMI", "FOMC",
                     "FED", "BLS", "BEA", "CBO", "EIA", "NIPA", "USD", "EUR", "GBP",
                     "JPY", "CNY", "AML", "OECD", "IMF", "BIS", "TIPS", "FRN",
                     "MBS", "CMBS", "FHFA", "MBA", "NAR", "JOLTS", "SAAR", "API",
                     "BMO", "BCI", "LEI", "CEI", "IFDI", "VA", "FHA", "PADD",
                     "SDR", "TIC", "FDI", "IIP"}
        for w in words:
            stripped = w.strip(",.()")
            if stripped.upper() in keep_caps:
                result.append(w)
            else:
                result.append(w.capitalize() if w.isupper() else w)
        text = " ".join(result)
    return text


def compose_for_ric(description: str, category_label: str, category_slug: str = "") -> dict:
    """Produce {meaning, how_to_use, units, subcategory, anchor}."""
    desc = _strip_noise(description)
    transform = detect_transform(desc)
    detail_clause = extract_detail(desc)

    concept = match_concept(desc, category_slug)

    if concept:
        phrases = concept["phrases"]
        # Pick the phrase template matching the transform; fall back to level
        phrase, default_unit = phrases.get(transform, phrases.get("level", (desc, "")))
        # Append detail clause if not already covered
        meaning = phrase
        if detail_clause and detail_clause.strip("()") not in meaning.lower():
            meaning = meaning.rstrip(".") + detail_clause + "."
        return {
            "meaning": meaning,
            "how_to_use": concept["how"],
            "units": default_unit or _generic_units(transform),
            "subcategory": concept["name"],
            "anchor": concept.get("anchor", ""),
        }

    # Generic fallback — concept didn't match.
    # Clean up the description and use it directly as the meaning sentence.
    cleaned = _humanize(desc)
    noun = cleaned if cleaned else f"this {category_label} series"
    transforms = {
        "yoy":   (f"Year-over-year percentage change in: {cleaned}.", "%, YoY"),
        "mom":   (f"Month-over-month percentage change in: {cleaned}.", "%, MoM"),
        "qoq":   (f"Quarter-over-quarter percentage change in: {cleaned}.", "%, QoQ"),
        "abs_change": (f"Period-over-period absolute change in: {cleaned}.", ""),
        "annualized": (f"{cleaned}, expressed at a seasonally-adjusted annual rate.", "SAAR"),
        "index": (f"Index reading: {cleaned}.", "Index"),
        "share": (f"{cleaned}, expressed as a share of the relevant total.", "%"),
        "ratio": (f"Ratio expression: {cleaned}.", "Ratio"),
        "yield": (f"Yield/interest rate: {cleaned}.", "%"),
        "diffusion": (f"Diffusion-index reading (50 = neutral): {cleaned}.", "Diffusion index (50=neutral)"),
        "pct_gdp": (f"{cleaned}, expressed as a percentage of GDP.", "% of GDP"),
        "standardized": (f"{cleaned} — standardized for cross-country comparison.", "Index, standardized"),
        "forecast": (f"Forecast: {cleaned}.", ""),
        "level":   (f"{cleaned}.", ""),
    }
    meaning, units = transforms.get(transform, transforms["level"])
    return {
        "meaning": meaning,
        "how_to_use": (
            f"Sub-component or variant within {category_label}. No standard practitioner usage notes have been "
            "written for this specific RIC — consult the upstream source publication (BEA, BLS, Federal Reserve, "
            "Census, USDA, EIA, or the relevant industry survey) for the formal definition before using it."
        ),
        "units": units,
        "subcategory": category_label,
        "anchor": "",
    }


def _generic_units(transform: str) -> str:
    return {
        "yoy": "%, YoY", "mom": "%, MoM", "qoq": "%, QoQ", "abs_change": "",
        "annualized": "SAAR", "index": "Index", "share": "%", "ratio": "Ratio",
        "yield": "%", "diffusion": "Diffusion index (50=neutral)", "pct_gdp": "% of GDP",
        "standardized": "Index, standardized", "forecast": "", "level": "",
    }.get(transform, "")


def find_related(target_description: str, all_rics, anchor: str, max_n: int = 3) -> list[str]:
    """Pick a few related RICs in the same category, by token overlap."""
    # Filter the anchor through the active country's known-RICs set — anchors
    # are baked into the CONCEPTS table as US codes; for non-US countries they
    # would otherwise show up as broken cross-references.
    known = _known_rics()
    if anchor and known and anchor not in known:
        anchor = ""
    if not target_description:
        return [anchor] if anchor else []
    stop = {"the", "and", "of", "in", "by", "for", "to", "a", "with", "on", "from", "us",
            "all", "total", "us.", "u.s.", "united", "states", "chg", "p/p", "y/y", "q/q",
            "actual", "yoy", "mom", "qoq", "standardized"}
    tokens = {w.lower().strip(",.;:()") for w in target_description.split()
              if len(w) > 4 and w.lower() not in stop}
    if not tokens:
        return [anchor] if anchor else []
    scored = []
    target_ric = None
    for r in all_rics:
        if r.get("description") == target_description:
            target_ric = r["ric"]
            break
    for r in all_rics:
        if r["ric"] == anchor or r["ric"] == target_ric:
            continue
        rdesc = (r.get("description") or "").lower()
        if not rdesc:
            continue
        score = sum(1 for t in tokens if t in rdesc)
        if score > 0:
            scored.append((score, r["ric"]))
    scored.sort(reverse=True)
    related = []
    if anchor:
        related.append(anchor)
    related.extend(r for _, r in scored[:max_n])
    seen = set()
    out = []
    for r in related:
        if r and r not in seen:
            seen.add(r)
            out.append(r)
    return out[:max_n + 1]


# ============================================================================
#  APPLIER
# ============================================================================

# Signatures of content produced by *prior versions* of seed_templates.py — we
# treat these as still-templated (overwriteable) rather than hand-curated.
# The hallmark of v1 templates: "Some Capitalized Prefix: lowercase content..."
# Hand-written content rarely uses this colon-prefix pattern.
OLD_TEMPLATE_SIGNATURES = [
    re.compile(r"^[A-Z][^.\n]{5,90}:\s+[a-z]"),       # "Foo bar: lowercased text"
    re.compile(r"^Sub-aggregate of US\s"),
    re.compile(r"^Sub-component of US\s"),
    re.compile(r"^Component of US\s"),
    re.compile(r"^Drilldown of\s"),
    re.compile(r"^Series mislabeled in source"),       # specific old fallback
]

# Old how_to_use signatures from v1 templates — these are the category-shared
# generic guidance lines we want to replace with the new concept-specific ones.
OLD_HOW_SIGNATURES = [
    "Drilldown of the headline GDP print",
    "Drilldown of personal consumption expenditures",
    "Compare against the actual outturn",
    "Component of US CPI complex",
    "Diffusion / sentiment indicator from a regional Fed",
    "Component of Fed balance sheet",
    "Sub-aggregate of US payroll employment",
    "Component of US labor-force",
    "Sub-component of US PPI",
    "Component of NIPA personal income",
    "Component of US National Income and Product Accounts",
    "Component of US international investment position",
    "Sub-component of US imports/exports",
    "Industry contribution to GDP",
    "Component of Census manufacturing",
    "Sub-component of US housing data",
    "Sub-component of US housing prices",
    "USDA NASS / WASDE / FAS data",
    "Component of GDP private fixed investment",
    "US capital-markets price/return/yield",
    "Implicit price deflator for a GDP component",
    "Sub-component or variant within this category",
    "Cross-section / drill-down series; verify source",
]


def is_old_template(meaning: str, how_to_use: str = "") -> bool:
    if meaning and any(p.search(meaning) for p in OLD_TEMPLATE_SIGNATURES):
        return True
    if how_to_use and any(s in how_to_use for s in OLD_HOW_SIGNATURES):
        return True
    return False


def fill_category(slug: str, dry_run: bool = False, force: bool = False) -> tuple[int, int]:
    path = os.path.join(CATALOG_DIR, f"{slug}.json")
    if not os.path.exists(path):
        return 0, 0
    with open(path, encoding="utf-8") as f:
        cat = json.load(f)

    category_label = cat.get("category", slug)
    updated = 0
    for r in cat["rics"]:
        existing_meaning = (r.get("meaning") or "").strip()
        existing_how = (r.get("how_to_use") or "").strip()
        is_old = is_old_template(existing_meaning, existing_how)
        if existing_meaning and not force and not is_old:
            continue  # preserve hand-curated content
        # Reset templated fields so the new compose() takes over cleanly
        if existing_meaning and (force or is_old):
            r["meaning"] = ""
            r["how_to_use"] = ""
            if r.get("subcategory") in ("", category_label[:30], category_label):
                r["subcategory"] = ""
            r["related_series"] = []
        composed = compose_for_ric(r.get("description") or "", category_label, slug)
        r["subcategory"] = r.get("subcategory") or composed["subcategory"]
        r["units"] = r.get("units") or composed["units"]
        r["meaning"] = composed["meaning"]
        r["how_to_use"] = composed["how_to_use"]
        if not r.get("related_series"):
            r["related_series"] = find_related(r.get("description") or "", cat["rics"], composed["anchor"])
        updated += 1

    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cat, f, ensure_ascii=False, indent=2)
    return updated, len(cat["rics"])


def main() -> int:
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        slugs = args
    else:
        slugs = [f[:-5] for f in sorted(os.listdir(CATALOG_DIR))
                 if f.endswith(".json") and not f.startswith("_")]

    total_updated = 0
    total_seen = 0
    for slug in slugs:
        u, n = fill_category(slug, dry, force)
        total_updated += u
        total_seen += n
        print(f"  [{slug:40s}] templated {u:4d}/{n:4d} RICs")
    print()
    flags = []
    if dry: flags.append("dry-run")
    if force: flags.append("force")
    print(f"[seed-templates] templated {total_updated} RICs across {len(slugs)} categories" + (f" ({', '.join(flags)})" if flags else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
