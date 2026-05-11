"""Build catalog/_graph.json — the macro influence graph.

Combines:
  1. ~60 hand-authored Tier-1 edges (the canonical macro chains)
  2. Auto-inferred edges from related_series (already populated in catalogs)
  3. Auto-inferred 'part_of' edges from each non-anchor RIC to its cluster anchor

Output schema:
  {
    "generated_at": "...",
    "clusters": [{ id, name, color, anchor_ric, ric_count }],
    "nodes":    [{ id, label, cluster, tier, is_anchor, category }],
    "edges":    [{ source, target, type, lag_months, confidence, note }]
  }

Edge types:
  drives   — directed causal/policy effect
  leads    — temporal lead in the same chain
  part_of  — sub-aggregate to headline
  related  — symmetric correlation/release-companion

Run from repo root:  python scripts/build_graph.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone

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
OUTPUT_PATH = os.path.join(CATALOG_DIR, "_graph.json")


# ============================================================================
#  CLUSTERS — the high-level concept buckets
# ============================================================================
# Order matters for color assignment.
CLUSTERS = [
    ("inflation",       "Inflation",          "#ff8a00"),  # accent-orange
    ("employment",      "Employment",         "#22c55e"),  # green
    ("unemployment",    "Unemployment",       "#16a34a"),
    ("wages",           "Wages & Comp",       "#15803d"),
    ("gdp",             "GDP & Output",       "#3b82f6"),  # blue
    ("consumption",     "Consumption",        "#0ea5e9"),
    ("investment",      "Investment",         "#0284c7"),
    ("government",      "Government Fiscal",  "#7c3aed"),  # purple
    ("housing_act",     "Housing Activity",   "#a855f7"),
    ("housing_px",      "Housing Prices",     "#9333ea"),
    ("surveys",         "Business Surveys",   "#eab308"),  # yellow
    ("fed",             "Fed Policy",         "#ec4899"),  # pink
    ("treasury",        "Treasury Markets",   "#f43f5e"),
    ("bank_lending",    "Bank Lending",       "#06b6d4"),  # cyan
    ("money",           "Money Supply",       "#0891b2"),
    ("consumer_credit", "Consumer Credit",    "#0e7490"),
    ("mortgage",        "Mortgage Markets",   "#c026d3"),  # magenta
    ("equity",          "Equity Markets",     "#84cc16"),  # lime
    ("trade",           "Trade Flows",        "#f97316"),  # orange
    ("fx",              "FX",                 "#fb923c"),
    ("fdi",             "FDI",                "#fdba74"),
    ("reserves",        "Reserves",           "#facc15"),
    ("energy",          "Energy",             "#dc2626"),  # red
    ("agri",            "Agriculture",        "#65a30d"),
    ("auto",            "Auto Sector",        "#7e22ce"),
    ("bankruptcies",    "Bankruptcies",       "#b91c1c"),
    ("forecasts",       "Forecasts",          "#94a3b8"),  # slate
    ("demographics",    "Demographics",       "#6b7280"),
    ("misc",            "Misc",               "#52525b"),
]

CLUSTER_BY_ID = {c[0]: {"id": c[0], "name": c[1], "color": c[2]} for c in CLUSTERS}


# ============================================================================
#  SUBCATEGORY → CLUSTER mapping
# ============================================================================
# The seed scripts populate `subcategory` on each RIC. We translate those into
# cluster ids here. Order matters; first regex match wins. Unknown -> "misc".

SUB_TO_CLUSTER = [
    # ---- Inflation (price indexes & expectations) ----
    (r"^(Headline CPI|CPI Headline|CPI Core|CPI Component|Core CPI|Core PCE|Headline PCE|PCE Headline|PCE Core|PCE Component|PCE Deflator|Core PCE)$", "inflation"),
    (r"^(CPI\b)", "inflation"),
    (r"^(PPI|PPI Component|PPI Final Demand|Producer Prices?)", "inflation"),
    (r"^(GDP Deflator)", "inflation"),
    (r"^(Import Prices?|Export Prices?|Terms of Trade)", "inflation"),
    (r"^(Energy Retail Prices)", "inflation"),
    (r"^(Inflation Expectations|Expectations)$", "inflation"),

    # ---- Forecasts (CBO, Fed SEP, consensus) ----
    (r"^(Forecast|CBO|Fed SEP|Consensus|SPF|IMF$|OECD)", "forecasts"),

    # ---- Employment ----
    (r"^(Nonfarm Payrolls|Payrolls|ADP|JOLTS|Hours|Workforce Levels|Hours$)", "employment"),
    (r"^(Employment$|Employment - |Sectoral Employment)", "employment"),
    (r"^(Education & Health|Leisure & Hospitality|Professional & Business|Private Sector)$", "employment"),

    # ---- Unemployment / labor force ----
    (r"^(Headline Unemployment|Unemployment$|Jobless Claims|Participation Rate|Emp-Pop Ratio|Long-term$|U6 Variants|Part/Full-time|Labor Force|Demographics$)", "unemployment"),

    # ---- Wages & productivity ----
    (r"^(AHE|ECI|Wages by Sector|Weekly Earnings|Real Wages|Real Weekly Earnings|Compensation|Labor Costs|Unit Labor Costs|Productivity|Payroll Index|Revisions)$", "wages"),

    # ---- GDP / output ----
    (r"^(GDP|Real GDP|Nominal GDP|GDP per capita|GDP Aggregate|GDP Component)$", "gdp"),
    (r"^(Industry GVA|Industrial Prod|Cap Utilization|Capacity)$", "gdp"),

    # ---- Consumption / retail / personal income ----
    (r"^(Headline RS|Standardized RS|By Category|Aggregates|Control Group|Chain Stores|Income & Saving|Saving|Real Disposable|Personal Income|Disposable Income|Wages & Salaries|Investment Income|Proprietor Income|Transfer Payments|Real \(Inflation-Adj\))$", "consumption"),
    (r"^(Retail|Retail Profits|Mfg Profits)$", "consumption"),

    # ---- Investment ----
    (r"^(Investment$|Investment Component|Structures|Equipment$|Intellectual Property|Residential$|Non-Residential|Inventory Investment|Private Fixed)$", "investment"),

    # ---- Government fiscal ----
    (r"^(Federal Outlays|Outlays by Function|Federal Receipts|Federal Budget|Central Govt Balance|Federal Debt$)$", "government"),

    # ---- Housing activity (NB before Mortgage so Construction Activity wins) ----
    (r"^(Construction Activity|Starts|Permits|Completions|New Home Sales|Existing Home Sales|Pending Sales|Single-Family|Multi-Family|Months Supply|Builder/Mortgage|Housing Activity)$", "housing_act"),

    # ---- Housing prices ----
    (r"^(Case-Shiller|FHFA|NAR Median|Median Price|Existing Home Prices|New Home Prices|Affordability|Home Prices|Housing Affordability)$", "housing_px"),

    # ---- Surveys ----
    (r"^(ISM Manufacturing|ISM Services|Philly Fed|Empire State|Richmond Fed|Dallas Fed|Kansas City Fed|Chicago PMI|NFIB|Conference Board|Consumer$|S&P PMI|Business Survey|Composite|Activity Indexes|BBK Indexes|UMich|UMich Detail|Consumer Confidence|Optimism Index|Recession Indicator|Confidence|Composite)$", "surveys"),
    (r"^(Labor Activity|Financial Stress|Buying Plans|Income Outlook|Wealth Outlook|Asset Outlook|Business Outlook|Spending Plans|Generational|Income Cohorts|Conference Board)$", "surveys"),

    # ---- Fed policy ----
    (r"^(Policy Rate|Reserve Rates|Discount Window|Bank Lending Rates|Policy Decisions|Fed Balance Sheet|Treasuries Held|MBS|RRP|Reserves & Deposits|FX Swaps|BTFP|Maturity Distribution|Currency in Circulation|Flows$)$", "fed"),

    # ---- Treasury markets ----
    (r"^(Treasury Yields|Treasury Outstanding|Treasury$|Government Debt|Government Debt & Borrowing|Constant Maturity|Bond Yields)$", "treasury"),

    # ---- Bank lending ----
    (r"^(Bank P&L|Bank Lending|Bank Sector|Charge-offs|Credit Quality|Credit by Lender|Credit Aggregates)$", "bank_lending"),

    # ---- Money supply ----
    (r"^(M0|M1|M2|Bank Reserves|Monetary Base|Money Aggregates|Velocity|Treasury Cash)$", "money"),

    # ---- Consumer credit ----
    (r"^(Consumer Credit|Total Credit|Revolving|Non-revolving|Nonrevolving Credit|Credit Flow|Debt Burden)$", "consumer_credit"),

    # ---- Mortgage markets ----
    (r"^(Mortgage Origination|Mortgages$|Mortgage Rates$|MBA Apps|Foreclosures|Servicing|HELOC|Delinquencies)$", "mortgage"),

    # ---- Equity markets ----
    (r"^(Equity Index|Equity Earnings|Equity Dividends|Equity Yield|Equity Valuation|S&P 500|Capital Markets|Corporate Bonds|High Yield|Munis|Funds$|Volatility|Foreign Equities)$", "equity"),

    # ---- Trade ----
    (r"^(Goods Trade|Services Trade|Trade Balance|Goods Exports|Goods Imports|Services Exports|Services Imports|Goods & Services|Trade Component|Capital Account|Financial Account|Capital \+ Financial|CA % GDP|Net IIP|BoP Residual|Primary Income|Secondary Income|Net External Position|Current Account|Financial Flows|Capital + Financial)$", "trade"),

    # ---- FX ----
    (r"^(BIS Effective Rates|USD Trade-Weighted|Bilateral Rates|Fed TWI|Money Markets|PPP)$", "fx"),

    # ---- FDI ----
    (r"^(FDI|FDI Inflows|FDI Outflows|Direct Investment)$", "fdi"),

    # ---- International reserves ----
    (r"^(FX Reserves|Reserves Level|Reserves Change|Gold Reserves|SDR Holdings|IMF Position|TIC Flows|External Position)$", "reserves"),

    # ---- Energy ----
    (r"^(Crude Oil|Crude Prices|Crude Stocks|Crude Trade|API|EIA|Refining|Stocks$|Cushing Stocks|Distillate Stocks|Gasoline$|Gasoline Stocks|Natural Gas|NG Prices|PADD Stocks|Power$|Coal$|SPR|Ethanol|Petroleum Trade|Oil Reserves|Oil Inventories|Distillates|Jet Fuel|Jet Fuel Stocks|Product Trade|Emissions|Weather|Semiconductors|Electricity|API Crude|API Imports|API Refining|API Stocks)$", "energy"),

    # ---- Agriculture ----
    (r"^(Crops|Cattle|Hogs|Beef Supply|Pork Supply|Ag Trade|Agriculture|Cattle/Beef|Hog/Pork|Dairy|Poultry|Plantings?|Yield$|Livestock)$", "agri"),

    # ---- Auto / transport ----
    (r"^(Vehicle Sales|Production$|Inventory$|Air Cargo|Air Passenger|Trans Services|Reuters Polls|Tourism|Travel Activity)$", "auto"),

    # ---- Bankruptcies ----
    (r"^(Bankruptcies|Bankruptcy)$", "bankruptcies"),

    # ---- Demographics ----
    (r"^(Population|Working-Age Population|Age Cohorts|Aging Cohorts|Mortality|COVID Historic)$", "demographics"),

    # ---- Misc / other ----
    (r"^(Islamic Finance|Test|Misc|Sector Accounts|National Accounts)$", "misc"),

    # ---- Catch-all / fallback patterns for the long tail ----
    # Single-word subcategories assigned by seed_templates fallback
    (r"^(PCE|Consumption|Consumption Component|Durable Goods|Nondurable Goods|Services|Personal Income|Disposable Income|Wages & Salaries|Investment Income|Proprietor Income|Transfer Payments|Saving|Real \(Inflation-Adj\))$", "consumption"),
    (r"^(NIPA|GDP Component|GDP Aggregate|Final Sales|Manufacturing|Information|FIRE|Mining|Utilities|Transportation|Industry GVA|Industrial Prod|Capacity)$", "gdp"),
    (r"^(Government|Federal Outlays|Outlays by Function|Federal Receipts|Federal Budget|Taxes|Tax Receipts|Net Interest)$", "government"),
    (r"^(Headline|Core|Food|Energy|Shelter|Medical|Apparel|CPI Component|CPI Headline|CPI Core|Final Demand|YoY Change|MoM Change|QoQ Change)$", "inflation"),
    (r"^(Exports|Imports|Industrial Supplies|Capital Goods|Consumer Goods|Auto|Food/Ag|By Country)$", "trade"),
    (r"^(Inventories|Inventory Investment|Sales/Orders|Factory Orders|Shipments|I/S Ratio|Wholesale|Retail$)$", "consumption"),
    (r"^(Soybean|Corn|Wheat|Cotton|Cattle|Cattle/Beef|Hogs|Hog/Pork|Dairy|Poultry|Plantings?|Yield|Stocks$|Prices)$", "agri"),
    (r"^(Tourism|Travel Activity|Air Cargo|Air Passenger|Trans Services)$", "auto"),
    (r"^(Volatility|Dividends|Treasury Yields)$", "equity"),
    (r"^(Construction)$", "investment"),
    (r"^(Trade|Education & Health|Leisure & Hospitality|Professional & Business)$", "employment"),
]


def cluster_for_subcategory(sub: str) -> str:
    s = (sub or "").strip()
    if not s:
        return "misc"
    for pattern, cluster_id in SUB_TO_CLUSTER:
        if re.match(pattern, s, re.I):
            return cluster_id
    return "misc"


# ============================================================================
#  HAND-AUTHORED EDGES — the canonical macro causal chains
# ============================================================================
# Format: (source_ric, target_ric, type, lag_months_range, note)
# type: "drives" | "leads" | "part_of" | "related"
# lag_months_range: [min, max] or None
HAND_EDGES: list[tuple[str, str, str, list | None, str]] = [
    # ---- Inflation -> Fed reaction function ----
    ("aUSCPIYYR",   "aUSFEDFUND",  "drives", [3, 6],   "Headline CPI feeds Fed reaction function (target: ~2%)"),
    ("aUSPCEMAR",   "aUSFEDFUND",  "drives", [3, 6],   "Core PCE — Fed's official inflation target"),
    ("aUSPCEYAR",   "aUSFEDFUND",  "drives", [3, 6],   "Headline PCE feeds Fed reaction function"),
    ("aUSCPIXFE/A", "aUSFEDFUND",  "drives", [3, 6],   "Core CPI — closely watched by Fed, second to core PCE"),

    # ---- Wages -> inflation ----
    ("aUSEMPCI/A",  "aUSPCEMAR",   "drives", [6, 9],   "ECI total comp feeds core PCE (services pass-through)"),
    ("aUSEARNH/A",  "aUSCPIXFE/A", "drives", [3, 6],   "AHE feeds core CPI services"),
    ("aUSULCNF/A",  "aUSPCEMAR",   "drives", [6, 9],   "Unit labor costs (compensation/productivity) feeds core PCE"),

    # ---- Productivity -> ULC ----
    ("aUSPHOPBUS/A","aUSULCNF/A",  "drives", [0, 3],   "Productivity gains lower unit labor costs"),

    # ---- Fed -> rates curve ----
    ("aUSFEDFUND",  "aUSPRIME",    "drives", [0, 1],   "Fed funds anchors prime rate (admin-set spread)"),
    ("aUSFEDFUND",  "aUSMBAMLR",   "drives", [0, 2],   "Fed funds influences 30Y mortgage rate via 10Y"),
    ("aUSFEDFUND",  "aUSCRCDACR",  "drives", [3, 6],   "Fed funds passes through to credit-card APR (lagged)"),
    ("aUSFEDFUND",  "aUSIORAR",    "drives", [0, 0],   "IORB tracks fed funds (corridor floor for banks)"),
    ("aUSFEDFUND",  "aUSRRPAR",    "drives", [0, 0],   "ON RRP tracks fed funds (corridor floor for non-banks)"),

    # ---- Mortgage rate -> housing ----
    ("aUSMBAMLR",   "aUSBPERMIT",  "drives", [1, 3],   "Mortgage rate dampens housing demand → permits"),
    ("aUSMBAMLR",   "aUSMACI/A",   "drives", [0, 1],   "Mortgage rate moves application volume"),
    ("aUSMBAMLR",   "aUSEHSPAR",   "drives", [1, 3],   "Mortgage rate gates existing home sales (lock-in effect)"),

    # ---- Housing pipeline ----
    ("aUSBPERMIT",  "aUSHSTART",   "leads",  [1, 3],   "Permits precede starts in housing pipeline"),
    ("aUSHSTART",   "aUSCGDPPD/A", "leads",  [3, 6],   "Housing starts feed residential investment in GDP"),

    # ---- Energy chain (no crude price RICs in this catalog; chain starts at retail) ----
    ("aUSEPGAPG",   "aUSCPIYYR",   "drives", [0, 1],   "Gasoline directly enters CPI energy"),
    ("aUSEPDAPG",   "aUSCPIYYR",   "drives", [1, 3],   "Diesel feeds goods CPI via freight costs"),
    ("aUSEPHAPG",   "aUSCPIYYR",   "drives", [0, 2],   "Heating oil enters CPI energy (winter-weighted)"),

    # ---- ISM/PMI -> activity ----
    ("aUSNPMI/A",   "aUSCGDPPD/A", "leads",  [1, 3],   "ISM Mfg leads GDP turning points"),
    ("aUSNMFGPMI",  "aUSCGDPPD/A", "leads",  [1, 3],   "ISM Services leads GDP (services are 70% of US GDP)"),

    # ---- Labor chain ----
    ("aUSNFARM/A",  "aUSUNTOTR",   "related",None,     "NFP and unemployment rate from BLS (companion releases)"),
    ("aUSLIDXAWIC/A","aUSUNTOTR",  "leads",  [1, 2],   "Initial claims lead the unemployment rate"),
    ("aUSRSAHMN/A", "aUSUNTOTR",   "related",None,     "Sahm rule is computed from the unemployment rate"),
    ("aUSEMPADP/A", "aUSNFARM/A",  "related",None,     "ADP and NFP both measure private payrolls (different surveys)"),

    # ---- Consumer chain ----
    ("aUSCONCF/A",  "aUSCRETF/C",  "leads",  [1, 2],   "Consumer confidence leads retail spending"),
    ("aUSUMSRAPH",  "aUSCRETF/C",  "leads",  [1, 2],   "UMich sentiment leads retail spending"),
    ("aUSCRETF/C",  "aUSCGDPPD/A", "drives", [1, 3],   "Retail sales (goods PCE) feeds GDP"),
    ("aUSGPYD/A",   "aUSCRETF/C",  "drives", [0, 1],   "Disposable personal income drives retail spending"),
    ("aUSCRDOUTA",  "aUSCRETF/C",  "drives", [0, 1],   "Consumer credit growth fuels retail spending"),

    # ---- Trade chain ----
    ("aUSCXTWF/C",  "aUSIMPP",     "drives", [1, 3],   "USD trade-weighted moves import prices"),
    ("aUSIMPP",     "aUSCPIYYR",   "drives", [1, 3],   "Import prices feed goods CPI"),
    ("aUSCURAC",    "aUSBALFAT/A", "related",None,     "Current account ≡ negative of financial account (BoP identity)"),

    # ---- Confidence -> labor expectations ----
    ("aUSCONCF/A",  "aUSCONCE/A",  "part_of",None,     "Expectations sub-index of Consumer Confidence"),

    # ---- Forecasts -> actuals (forecast-to-actual pairings) ----
    ("aUSFCBOUT",   "aUSFOUTL",    "related",None,     "CBO outlay projection vs actual federal outlays"),
    ("aUSFCBREV",   "aUSFEDREC",   "related",None,     "CBO revenue projection vs actual receipts"),
    ("aUSFCCUFHR",  "aUSUNTOTR",   "related",None,     "Fed SEP unemployment central tendency vs actual"),
    ("aUSFCCCFHR",  "aUSPCEMAR",   "related",None,     "Fed SEP core PCE central tendency vs actual"),

    # ---- Government / fiscal ----
    ("aUSGDEF",     "aUSFEDETOS",  "drives", [3, 12],  "Persistent deficit grows federal debt outstanding"),
    ("aUSXGBINTA",  "aUSGDEF",     "drives", [0, 0],   "Net interest is the fastest-growing line of federal outlays"),
    ("aUSEBM10Y",   "aUSXGBINTA",  "drives", [3, 12],  "10Y yields drive net interest cost as Treasuries roll"),

    # ---- Equity valuation ----
    ("aUSFEDFUND",  "aUSSPRPER",   "drives", [3, 12],  "Fed funds anchors discount rate; affects equity valuation"),
    ("aUSSPCOM",    "aUSCONCF/A",  "drives", [0, 1],   "S&P level affects consumer wealth perception"),

    # ---- Auto chain (no auto-loan rate RIC in catalog) ----
    ("aUSVHLS",     "aUSPCARRVO/A","drives", [0, 1],   "Sales pace vs production sets days-supply inventory"),

    # ---- Confidence/saving rate ----
    ("aUSNS06L2",   "aUSCRETF/C",  "drives", [0, 3],   "Saving rate is residual; consumption rises as savings draw down"),

    # ---- ISM prices paid ----
    # Generally we'd link aUSNPMI/A's prices-paid sub-index to PPI/CPI but the
    # prices-paid RIC is in a different family — leave as auto-inferred via
    # related_series. Skip explicit edge here.

    # ---- PPI -> CPI ----
    ("aUSPFDEMDE/A","aUSCPI",      "leads",  [1, 3],   "PPI final demand leads goods CPI"),

    # ---- Money -> inflation (long lag, monetarist view) ----
    ("aUSCMS2YB/A", "aUSCPIYYR",   "leads",  [12, 18], "M2 growth precedes inflation (monetarist view, weak)"),

    # ---- Mortgage applications -> housing activity ----
    ("aUSMACP/A",   "aUSEHSPAR",   "leads",  [1, 2],   "Purchase applications lead existing home sales"),

    # ---- Fed funds -> credit spreads (loose) ----
    ("aUSFEDFUND",  "aUSCREDITIR/A","drives",[3, 6],   "Fed funds discourages revolving credit growth (lagged)"),

    # ---- Compensation -> productivity (reverse) ----
    # Productivity drives unit labor costs already; comp -> productivity is endogenous.
]


# ============================================================================
#  LOAD CATALOGS
# ============================================================================

def load_catalogs() -> tuple[dict, list[dict]]:
    """Returns (index, all_rics) where each RIC dict has full per-category fields."""
    with open(os.path.join(CATALOG_DIR, "_index.json"), encoding="utf-8") as f:
        index = json.load(f)

    all_rics = []
    seen = set()
    for cat_meta in index["categories"]:
        slug = cat_meta["slug"]
        path = os.path.join(CATALOG_DIR, f"{slug}.json")
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            cat = json.load(f)
        for r in cat.get("rics", []):
            ric = r["ric"]
            if ric in seen:
                continue
            seen.add(ric)
            r["category_slug"] = slug
            r["category_name"] = cat["category"]
            all_rics.append(r)
    return index, all_rics


# ============================================================================
#  TIER-1 RICs (hand-curated; should always be cluster anchors)
# ============================================================================
TIER1_RICS = {
    "aUSCGDPPD/A", "aUSGDPEQZ/CA",
    "aUSCPIYYR", "aUSCPIXFE/A", "aUSPCEMAR", "aUSPCEYAR",
    "aUSPFDEMDE/A",
    "aUSNFARM/A", "aUSUNTOTR",
    "aUSFEDFUND",
    "aUSNPMI/A", "aUSNMFGPMI",
    "aUSCRETF/C", "aUSCONCF/A",
    "aUSHSTART", "aUSBPERMIT",
}


# ============================================================================
#  BUILD
# ============================================================================

def build() -> dict:
    index, all_rics = load_catalogs()
    ric_set = {r["ric"] for r in all_rics}

    # 1) Build node list with cluster assignment
    nodes_by_id: dict[str, dict] = {}
    cluster_members: dict[str, list[str]] = defaultdict(list)
    for r in all_rics:
        ric = r["ric"]
        sub = r.get("subcategory") or ""
        slug = r.get("category_slug", "")
        # Polls/forecasts always cluster under "forecasts" so they're visually
        # distinct (slate color) and grouped together in the macro map.
        if slug == "us_polls" or slug == "id_polls" or slug == "cn_polls":
            cluster = "forecasts"
        else:
            cluster = cluster_for_subcategory(sub)
        is_tier1 = ric in TIER1_RICS
        label = (r.get("description") or ric)[:80]
        label = re.sub(r"\s+", " ", label).strip().rstrip(",.;")
        is_poll = slug == "us_polls" or slug == "id_polls" or slug == "cn_polls"
        nodes_by_id[ric] = {
            "id": ric,
            "label": label,
            "cluster": cluster,
            "tier": 1 if is_tier1 else 2,
            "is_anchor": False,
            "category": r["category_slug"],
            "subcategory": sub,
            "is_poll": is_poll,           # used by the renderer for distinct styling
        }
        cluster_members[cluster].append(ric)

    # 2) Pick cluster anchors. Preferred anchors take precedence; else first Tier-1; else first member.
    PREFERRED_ANCHORS = {
        "inflation":       "aUSCPIYYR",
        "employment":      "aUSNFARM/A",
        "unemployment":    "aUSUNTOTR",
        "wages":           "aUSEARNH/A",
        "gdp":             "aUSCGDPPD/A",
        "consumption":     "aUSCRETF/C",
        "investment":      "aUSCGDPPD/A",   # share with GDP since investment is part of GDP framework
        "government":      "aUSGDEF",
        "housing_act":     "aUSHSTART",
        "housing_px":      "aUSHAI",
        "surveys":         "aUSNPMI/A",
        "fed":             "aUSFEDFUND",
        "treasury":        "aUSFEDETOS",
        "bank_lending":    "aUSBCACIB/A",
        "money":           "aUSCMS2B/A",
        "consumer_credit": "aUSCRDOUTA",
        "mortgage":        "aUSMBAMLR",
        "equity":          "aUSSPCOM",
        "trade":           "aUSCURAC",
        "fx":              "aUSCXTWF/C",
        "fdi":             "aUSIVDFA",
        "reserves":        "aUSCRESA",
        "energy":          "aUSEIACS",       # crude stocks ex-SPR
        "agri":            "aUSCOMPCRP",     # corn production (acts as a sensible anchor)
        "auto":            "aUSVHLS",
        "bankruptcies":    "aUSBNRQP",
        "forecasts":       "aUSFCBOUT",
        "demographics":    "aUSPOPTO",
        "misc":            "",                # no anchor — misc cluster shouldn't have one
    }
    cluster_anchor: dict[str, str] = {}
    for cid, members in cluster_members.items():
        # 1. Preferred, if it exists in this cluster
        preferred = PREFERRED_ANCHORS.get(cid, "")
        if preferred and preferred in members:
            cluster_anchor[cid] = preferred
            continue
        # 2. First Tier-1 RIC found in cluster
        tier1_members = [m for m in members if m in TIER1_RICS]
        if tier1_members:
            cluster_anchor[cid] = tier1_members[0]
            continue
        # 3. First member
        if members:
            cluster_anchor[cid] = members[0]
    for cid, anchor in cluster_anchor.items():
        if anchor in nodes_by_id:
            nodes_by_id[anchor]["is_anchor"] = True

    # 3) Build edges — start with hand edges, then layer auto
    edges: list[dict] = []
    edge_keys: set[tuple[str, str, str]] = set()

    def add_edge(source: str, target: str, etype: str, lag, confidence: str, note: str = "") -> None:
        if source not in ric_set or target not in ric_set:
            return  # skip dangling edges
        if source == target:
            return
        key = (source, target, etype)
        if key in edge_keys:
            return
        edge_keys.add(key)
        edges.append({
            "source": source,
            "target": target,
            "type": etype,
            "lag_months": lag,
            "confidence": confidence,
            "note": note,
        })

    # 3a) Hand edges first
    skipped_hand = []
    for src, tgt, etype, lag, note in HAND_EDGES:
        if src not in ric_set or tgt not in ric_set:
            skipped_hand.append((src, tgt))
            continue
        add_edge(src, tgt, etype, lag, "hand", note)

    # 3b) Auto: related_series pairs (bidirectional, treated as 'related')
    auto_related = 0
    for r in all_rics:
        src = r["ric"]
        for tgt in (r.get("related_series") or []):
            if tgt and tgt != src:
                add_edge(src, tgt, "related", None, "auto", "from related_series field")
                auto_related += 1

    # 3b-bis) Auto: poll forecast → actual release linkage.
    # Reuters polls follow the RIC convention p<CODE>=<STAT> for forecast
    # statistics and <CODE>=ECI for the actual release. Strip the "p" prefix
    # and the "=<STAT>" suffix → the actual code, then map to its <CODE>=ECI.
    auto_polls = 0
    actual_rics = {r["ric"] for r in all_rics if not r["ric"].startswith("p") and "=" in r["ric"]}
    for r in all_rics:
        src = r["ric"]
        if not src.startswith("p"):
            continue
        # e.g. "pUSPMI=M" -> base "USPMI" -> actual "USPMI=ECI"
        base = src[1:].split("=")[0]
        actual = base + "=ECI"
        if actual in actual_rics and actual != src:
            if add_edge(src, actual, "related", None, "auto", "poll forecast statistic for this actual release"):
                auto_polls += 1

    # 3c) Auto: 'part_of' edges from non-anchor RICs to their cluster anchor.
    # Skip Tier-1 RICs (they shouldn't depend on a cluster anchor; they ARE anchors).
    auto_part_of = 0
    # Cap fan-in per anchor at 50 to avoid one anchor with hundreds of incoming.
    incoming_count: dict[str, int] = defaultdict(int)
    MAX_FAN_IN = 50
    for r in all_rics:
        ric = r["ric"]
        if ric in TIER1_RICS:
            continue
        cid = nodes_by_id[ric]["cluster"]
        anchor = cluster_anchor.get(cid)
        if not anchor or anchor == ric:
            continue
        if incoming_count[anchor] >= MAX_FAN_IN:
            continue
        if add_edge(ric, anchor, "part_of", None, "auto", f"sub-aggregate of {nodes_by_id[anchor]['label']}"):
            pass
        incoming_count[anchor] += 1
        auto_part_of += 1

    # 4) Build cluster summary (with member counts)
    clusters_out = []
    for cid, name, color in CLUSTERS:
        members = cluster_members.get(cid, [])
        clusters_out.append({
            "id": cid,
            "name": name,
            "color": color,
            "anchor_ric": cluster_anchor.get(cid, ""),
            "ric_count": len(members),
        })

    graph = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "node_count": len(nodes_by_id),
            "edge_count": len(edges),
            "hand_edges": sum(1 for e in edges if e["confidence"] == "hand"),
            "auto_related": auto_related,
            "auto_part_of": auto_part_of,
            "skipped_hand_edges": len(skipped_hand),
        },
        "clusters": clusters_out,
        "nodes": list(nodes_by_id.values()),
        "edges": edges,
    }

    if skipped_hand:
        print(f"[graph] WARNING: {len(skipped_hand)} hand-authored edges referenced unknown RICs:")
        for src, tgt in skipped_hand[:10]:
            print(f"   {src} -> {tgt}")

    # Sanity: every edge endpoint exists as a node
    bad = [(e["source"], e["target"]) for e in edges if e["source"] not in nodes_by_id or e["target"] not in nodes_by_id]
    if bad:
        print(f"[graph] ERROR: {len(bad)} edges reference unknown nodes; first 5: {bad[:5]}")

    return graph


def main() -> int:
    graph = build()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)

    s = graph["stats"]
    print(f"[graph] {s['node_count']} nodes, {s['edge_count']} edges")
    print(f"[graph]   hand: {s['hand_edges']}")
    print(f"[graph]   auto from related_series: {s['auto_related']}")
    print(f"[graph]   auto part_of (cluster-anchor): {s['auto_part_of']}")
    print(f"[graph]   {len(graph['clusters'])} clusters")
    print(f"[graph] -> {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
