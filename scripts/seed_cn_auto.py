"""Programmatic topic-aware seeder for the China long-tail RICs.

Targets the ~3,800 RICs that don't warrant individual hand entries because they
follow predictable templates (Production sub-categories, bilateral trade items,
SME indicators, real-estate sub-aggregates, bonds, COVID, etc.). Generates
2-3 sentence content per RIC by detecting topic from description.

Idempotent: skips RICs that already have meaningful hand-curated content
(detected via TIER1 signature phrases).

Run from repo root:  python scripts/seed_cn_auto.py
"""

from __future__ import annotations

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog", "cn")


# ============================================================================
#  TOPIC PATTERNS — order matters, first match wins
# ============================================================================

def topic_for(desc: str, slug: str = "") -> str:
    d = desc.strip()
    # Slug-aware fallback for big categories
    s = slug.lower()
    # Test/schema series first
    if "TEST SERIES" in d.upper() or "TESTING" in d.upper() or "SCHEMA" in d.upper():
        return "test"
    # COVID
    if "Coronavirus" in d or "COVID" in d:
        return "covid"
    # Anti-Corruption / AML / Comprehensive Risk
    if d.startswith("Anti-Corruption Risk"): return "acr"
    if d.startswith("Anti-Money Laundering"): return "aml"
    if d.startswith("Comprehensive Risk"): return "compr_risk"
    if d.startswith("IFDI"): return "ifdi"
    # PMI sub-components (after Caixin/RatingDog/MNI)
    if d.startswith("Caixin PMI") or d.startswith("RatingDog"): return "caixin_pmi"
    if d.startswith("PMI") or "Manufacturing PMI" in d or "PMI, Manufacturing" in d: return "nbs_pmi"
    # Production
    if d.startswith("Production"): return "production"
    # Trade
    if d.startswith("Import,") or d.startswith("Imports,") or d.startswith("Imports of") or d == "Imports": return "import"
    if d.startswith("Export,") or d.startswith("Exports,") or d.startswith("Exports of") or d == "Exports": return "export"
    # Real estate
    if d.startswith("Real estate"): return "real_estate"
    if d.startswith("Investment of Real Estate"): return "real_estate_inv"
    if d.startswith("Buildings"): return "buildings"
    if d.startswith("Land use price") or d.startswith("Industrial land price") or d.startswith("Commercial land price") or d.startswith("Land price"): return "land_price"
    # Small and Medium Enterprises
    if d.startswith("Small and Medium"): return "sme"
    # Cash bond transactions
    if d.startswith("Cash Bond Transactions"): return "cash_bonds"
    if d.startswith("Interbank bond") or d.startswith("Bonds Issuance") or d.startswith("Bonds Depository") or d.startswith("Bonds Redemption"): return "bonds"
    # CPI
    if d.startswith("CPI"): return "cpi"
    if d.startswith("Core CPI"): return "core_cpi"
    if d.startswith("Producer Prices"): return "ppi"
    # GDP variants
    if d.startswith("GDP"): return "gdp"
    if d.startswith("Expenditure Approach"): return "gdp_exp"
    # Motor Vehicles
    if d.startswith("Motor Vehicles"): return "auto"
    # Investment in Fixed Assets
    if d.startswith("Investment in Fixed Assets") or d.startswith("Fixed Asset Investment"): return "fai"
    # FDI
    if d.startswith("FDI") or d.startswith("Actual use of foreign investment") or d.startswith("Newly established"): return "fdi"
    # Foreign exchange operations
    if d.startswith("Foreign Exchange Operations"): return "fx_ops"
    if d.startswith("RMB/FX") or d.startswith("Bank sales") or d.startswith("Foreign exchange forward"): return "fx_market"
    # International Service Trade
    if d.startswith("International Service Trade"): return "service_trade"
    # Industrial / Commercial / Land
    if d.startswith("Industrial boiler") or d.startswith("Industrial enterprise") or d.startswith("Industrial Enterprise") or d.startswith("Industrial companies"): return "industrial"
    # Average food price / Retail
    if d.startswith("Average food price"): return "food_price"
    if d.startswith("Retail Sales") or d.startswith("Retail "): return "retail"
    # CIA Real Estate
    if d.startswith("CIA Real Estate"): return "cia_real_estate"
    # Stock markets (Shanghai/Shenzhen)
    if "Shanghai Stock Exchange" in d or "Shenzhen Stock Exchange" in d: return "stock_exchange"
    # Banking / Commercial Banks
    if d.startswith("Commercial Banks"): return "banking"
    if d.startswith("Monetary"): return "monetary_authority"
    # Employment
    if d.startswith("Employment"): return "employment"
    # Wages
    if d.startswith("Wages") or d.startswith("Average wage"): return "wages"
    # International investment position
    if d.startswith("International investment"): return "iip"
    # Government
    if d.startswith("General Government") or d.startswith("Central Government") or d.startswith("Public Finance"): return "fiscal"
    # The Belt and Road
    if d.startswith("The Belt and Road"): return "belt_road"
    # Power infrastructure
    if d.startswith("Power infrastructure"): return "power_infra"
    # Profit / Sales of industrial companies
    if d.startswith("Profit") or d.startswith("Sales cost"): return "industrial_profit"
    # Commodity inventory + sales (large in CN data)
    if (("inventory" in d.lower() or "stock" in d.lower() or "stocks" in d.lower())
        and ("steel" in d.lower() or "cement" in d.lower() or "copper" in d.lower()
             or "aluminum" in d.lower() or "alumina" in d.lower() or "coal" in d.lower()
             or "ore" in d.lower() or "rubber" in d.lower() or "soda" in d.lower()
             or "ethylene" in d.lower() or "fertilizer" in d.lower() or "paint" in d.lower()
             or "vegetable oil" in d.lower() or "drink" in d.lower() or "liquor" in d.lower()
             or "vehicle" in d.lower() or "tire" in d.lower() or "excavator" in d.lower()
             or "phosphate" in d.lower() or "generator" in d.lower())):
        return "commodity_stock"
    if d.startswith("Coal stock") or d.startswith("Crude steel"):
        return "commodity_stock"
    if "production" in d.lower() and ("steel" in d.lower() or "cement" in d.lower()
        or "copper" in d.lower() or "aluminum" in d.lower() or "iron" in d.lower()
        or "fertilizer" in d.lower() or "rubber" in d.lower() or "paint" in d.lower()
        or "fastener" in d.lower() or "smelting" in d.lower() or "pollution" in d.lower()
        or "boiler" in d.lower() or "equipment" in d.lower()):
        return "industrial_output"
    # Generic Chinese-character starting items
    if any('一' <= c <= '鿿' for c in d[:5]):
        return "chinese_local"
    # Coal/oil/energy commodities
    if d.startswith("Coal") or d.startswith("Crude oil") or "fertilizer" in d.lower():
        return "commodity_stock"
    # Slug-based fallback for the long tail
    if s == "cn_commodities" or s == "cn_commodity_emissions":
        return "commodity_stock"
    if s == "cn_industrial_production_utilization":
        return "industrial_output"
    if s == "cn_automobiles_transport":
        return "auto"
    if s == "cn_housing_construction" or s == "cn_housing_real_estate_prices":
        return "real_estate"
    if s == "cn_stocks_bonds_and_funds":
        return "bonds"
    if s == "cn_imports_exports":
        # Default direction not clear; pick by description
        if d.lower().startswith("import"): return "import"
        if d.lower().startswith("export"): return "export"
        return "import"
    if s == "cn_foreign_transactions":
        return "fx_market"
    if s == "cn_population":
        return "chinese_local"
    if s == "cn_consumer_prices_inflation":
        return "cpi"
    if s == "cn_business_surveys":
        return "nbs_pmi"
    if s == "cn_gov_accounts" or s == "cn_government_total_debt":
        return "fiscal"
    if s == "cn_balance_of_payments":
        return "iip"
    if s == "cn_money_supply":
        return "monetary_authority"
    if s == "cn_international_reserves":
        return "fx_ops"
    if s == "cn_banking" or s == "cn_domestic_finance":
        return "banking"
    if s == "cn_exchange_rates_and_operations":
        return "fx_market"
    if s == "cn_workforce_unemployment" or s == "cn_employment_hours":
        return "employment"
    if s == "cn_wages_earnings":
        return "wages"
    if s == "cn_external_debt":
        return "bonds"
    if s == "cn_retail_sales":
        return "retail"
    if s == "cn_other_surveys":
        return "belt_road"
    if s == "cn_producer_prices":
        return "ppi"
    if s == "cn_gdp_by_expenditure" or s == "cn_gdp_gva_by_country":
        return "gdp"
    # Tests
    if "TEST" in d.upper() and "SERIES" in d.upper(): return "test"
    if d.startswith("Discontinued"): return "discontinued"
    return "generic"


# ============================================================================
#  TEMPLATE WRITERS
# ============================================================================

def write_covid(desc: str, ric: str) -> dict:
    return {
        "subcategory": "COVID-19",
        "units": "Cases / Tests / Vaccinations",
        "meaning": f"COVID-19 reference data for China: {desc}. Historical pandemic surveillance series, primarily 2020-2023.",
        "how_to_use": "Historical reference. China's strict zero-COVID policy (2020-late 2022) ended in December 2022 with rapid relaxation. Use for retrospective epidemiological or economic-shock analysis. The major data quality concern: case counts during the December 2022-January 2023 transition were widely viewed as understated.",
        "related_series": [],
    }


def write_acr(desc: str, ric: str) -> dict:
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    suffix = parts[-1] if len(parts) > 2 else ""
    label = "Band" if "Band" in suffix else ("Rank" if "Rank" in suffix else ("Score" if "Score" in suffix else "Indicator"))
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Anti-Corruption Risk database: {indicator} ({label}) for China. Reference data used in compliance, due-diligence, and country-risk-screening workflows.",
        "how_to_use": "Reference series for ESG, compliance, and KYC processes. Not a macroeconomic indicator. China's Anti-Corruption Risk profile reflects the post-2012 anti-graft campaign; sources include World Bank Worldwide Governance Indicators, Transparency International CPI, and others.",
        "related_series": [],
    }


def write_aml(desc: str, ric: str) -> dict:
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Anti-Money Laundering Risk database: {indicator} for China. AML/KYC compliance reference.",
        "how_to_use": "Reference series for AML compliance workflows. Not a macroeconomic indicator. China is FATF-monitored; recent FATF assessments highlighted partial compliance.",
        "related_series": [],
    }


def write_compr_risk(desc: str, ric: str) -> dict:
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Comprehensive Risk database: {indicator} for China. Aggregated country-risk reference combining political, economic, governance, and operational dimensions.",
        "how_to_use": "Reference series for enterprise risk management. Not a macroeconomic indicator. China's overall risk profile reflects geopolitical tensions, regulatory unpredictability, and capital-control regime.",
        "related_series": [],
    }


def write_ifdi(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Islamic Finance",
        "units": "Score / Index",
        "meaning": f"Islamic Finance Development Indicator: {desc}. Reference data on China's Islamic finance footprint (small relative to total finance — concentrated in Ningxia and Xinjiang regions).",
        "how_to_use": "Niche reference. China's Islamic-finance market is small but growing. Not a mainstream macroeconomic indicator.",
        "related_series": [],
    }


def write_caixin_pmi(desc: str, ric: str) -> dict:
    sub = desc.replace("Caixin PMI,", "").replace("RatingDog,", "").strip()
    return {
        "subcategory": "Caixin/RatingDog PMI",
        "units": "Diffusion (50=neutral)",
        "meaning": f"Caixin/RatingDog China PMI: {sub}. Privately-compiled PMI for China that skews toward smaller and private firms; often diverges from the official NBS PMI which is SOE-heavy.",
        "how_to_use": "Markets watch BOTH Caixin and NBS PMIs because they often diverge — divergence captures the private-sector vs state-sector economy split. Caixin tends to lead at turning points. Released first business day of each month, ahead of NBS for some sub-indices.",
        "related_series": ["aCNPMIBAQ", "aCNNPMIGRQ/A"],
    }


def write_nbs_pmi(desc: str, ric: str) -> dict:
    sub = desc.replace("PMI,", "").strip()
    return {
        "subcategory": "PMI Sub-Index",
        "units": "Diffusion (50=neutral)",
        "meaning": f"China PMI sub-component: {sub}. NBS or alternative-source manufacturing or non-manufacturing PMI sub-index.",
        "how_to_use": "Above 50 = expansion; below 50 = contraction. Sub-components (new orders, output, employment, supplier delivery times, inventories, prices) decompose the headline PMI movement.",
        "related_series": ["aCNPMIBAQ"],
    }


def write_production(desc: str, ric: str) -> dict:
    item = desc.replace("Production,", "").strip()
    return {
        "subcategory": "Industrial Output",
        "units": "Volume / Index",
        "meaning": f"Industrial Production: {item}. Sub-sector or product-level output series from NBS Industrial Statistics (above-designated-size firms).",
        "how_to_use": "Use alongside headline industrial production for sector cycle analysis. China publishes detailed product-level output in monthly NBS Industrial Statistics. Above-designated-size threshold currently CNY 20 million annual revenue.",
        "related_series": [],
    }


def write_import(desc: str, ric: str) -> dict:
    item = desc.replace("Import,", "").replace("Imports,", "").replace("Imports of", "").strip().rstrip(",")
    return {
        "subcategory": "Imports",
        "units": "USD millions / Volume",
        "meaning": f"China Imports: {item}. Detailed import series by product/category from China Customs.",
        "how_to_use": "Customs publishes detailed monthly bilateral and product-level import data. Major Chinese imports: integrated circuits, crude oil, iron ore, soybeans, copper, machinery. Track monthly YoY changes for cycle signal.",
        "related_series": ["aCNCIMPB/A", "aCNCIMPYB/A"],
    }


def write_export(desc: str, ric: str) -> dict:
    item = desc.replace("Export,", "").replace("Exports,", "").replace("Exports of", "").strip().rstrip(",")
    return {
        "subcategory": "Exports",
        "units": "USD millions / Volume",
        "meaning": f"China Exports: {item}. Detailed export series by product/category from China Customs.",
        "how_to_use": "Customs publishes detailed monthly bilateral and product-level export data. China is the world's largest goods exporter. Key categories: electronics, machinery, autos (rapidly growing — EVs), chemicals, textiles, steel.",
        "related_series": ["aCNCEXPB/A", "aCNCEXPYB/A"],
    }


def write_real_estate(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Real Estate",
        "units": "Sq m / CNY",
        "meaning": f"China Real Estate: {desc}. Sub-category of real-estate development data (NBS monthly Real Estate Investment release).",
        "how_to_use": "China's property sector contracted sharply since 2021 (Three Red Lines policy + Evergrande default + COVID). Track sub-category trends as part of the broader property-cycle analysis. Pair with the headline residential investment YoY (aCNCONINVRY) and new starts (aCNBSTFSHR).",
        "related_series": ["aCNCONINVRY", "aCNBSTFSHR", "aCNBLDUCRB"],
    }


def write_real_estate_inv(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Real Estate",
        "units": "CNY billions / Sq m",
        "meaning": f"Real Estate Development Investment: {desc}. Sub-aggregate of total property-development investment.",
        "how_to_use": "Real estate development investment was historically ~10-12% of GDP. Has fallen sharply since 2021 amid the property deleveraging. Watch sub-categories for distinguishing residential vs commercial developer activity.",
        "related_series": ["aCNCONINVR", "aCNBLDUCT"],
    }


def write_buildings(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Construction",
        "units": "Million sq m / Percent YoY",
        "meaning": f"Buildings construction: {desc}. Sub-aggregate of housing construction activity.",
        "how_to_use": "Use alongside the headline new-starts (aCNBSTFSHR), under-construction (aCNBLDUCT), and completions (aCNBCOMPT) series for full property-cycle analysis.",
        "related_series": ["aCNBSTFSHR", "aCNBLDUCT", "aCNBCOMPT"],
    }


def write_land_price(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Land Prices",
        "units": "CNY per sq m / Index",
        "meaning": f"China land price: {desc}. Granular land-transaction price data by use type, region, or city.",
        "how_to_use": "Land sales are a critical local-government revenue source. The collapse in land sales since 2021 has been a major fiscal stress point. Track for property-cycle and local-government finance signals.",
        "related_series": ["aCNCGREV"],
    }


def write_sme(desc: str, ric: str) -> dict:
    return {
        "subcategory": "SME",
        "units": "Various",
        "meaning": f"China Small and Medium Enterprises (SME) statistic: {desc}. SMEs account for ~60% of China GDP and ~80% of urban employment.",
        "how_to_use": "SMEs are the most credit-constrained part of the Chinese economy. Watch SME indicators for the private-sector cycle (vs SOE-dominated official data). PBoC's targeted easing tools (PSL, re-lending facilities, RRR cuts for small banks) primarily aim to support SME credit access.",
        "related_series": ["aCNNPMMSE/A"],
    }


def write_cash_bonds(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Bond Market",
        "units": "Various",
        "meaning": f"China Cash Bond Transactions: {desc}. China's interbank bond market (CIBM) is the world's second-largest after US Treasuries.",
        "how_to_use": "CIBM trading data published by the National Interbank Funding Center. Watch yields by tenor, especially the 10Y CGB (Chinese Government Bond) yield as the China benchmark long rate.",
        "related_series": [],
    }


def write_bonds(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Bond Market",
        "units": "CNY billions / Number",
        "meaning": f"China Bond Market: {desc}. ChinaBond and Shanghai Clearing House bond-market activity statistics.",
        "how_to_use": "China's bond market includes CGBs, policy-bank bonds, financial bonds, corporate credit bonds, MTNs, ABS, panda bonds (foreign issuers in CNY). Foreign access via Bond Connect and CIBM Direct.",
        "related_series": [],
    }


def write_cpi(desc: str, ric: str) -> dict:
    return {
        "subcategory": "CPI Sub-Index",
        "units": "Index / Percent",
        "meaning": f"China CPI: {desc}. Sub-component of the Consumer Price Index basket.",
        "how_to_use": "China CPI in deflation 2023-24 (-0.5% to +0.5% YoY). Decompose by sub-category for cyclical-noise vs structural signal: pork (~3% of basket) drives short-term volatility; services-CPI (sticky core component) is most policy-relevant.",
        "related_series": ["aCNCCPIYE/A", "aCNCCORYE/A"],
    }


def write_core_cpi(desc: str, ric: str) -> dict:
    return {
        "subcategory": "CPI Core",
        "units": "Index / Percent",
        "meaning": f"China Core CPI: {desc}. Core CPI excludes volatile food and energy components.",
        "how_to_use": "Core CPI is the cleanest read on underlying inflation. PBoC watches this closely for monetary-policy signaling. Sustained sub-1% core inflation has been the post-2020 norm — far below pre-2018 ~2%.",
        "related_series": ["aCNCCORYE/A", "aCNCCPIYE/A"],
    }


def write_ppi(desc: str, ric: str) -> dict:
    sub = desc.replace("Producer Prices,", "").strip()
    return {
        "subcategory": "PPI Sub-Index",
        "units": "Index",
        "meaning": f"China PPI sub-component: {sub}. Producer-price index for specific industrial sub-sector.",
        "how_to_use": "China's PPI in deflation since late 2022. Decompose by sub-sector for source-of-deflation analysis: raw materials (commodity price sensitive), processing industries (overcapacity), consumer goods (demand sensitive).",
        "related_series": ["aCNPPI", "aCNPPIAR"],
    }


def write_gdp(desc: str, ric: str) -> dict:
    return {
        "subcategory": "GDP",
        "units": "CNY billions / Percent",
        "meaning": f"China GDP: {desc}. Sub-aggregate or alternative measure of GDP.",
        "how_to_use": "Use alongside headline GDP YoY (aCNCGDPYD/A) for full national accounts picture. Different vintages and aggregations capture different aspects: by-expenditure, by-industry, by-province.",
        "related_series": ["aCNCGDPYD/A", "aCNGDPC/C"],
    }


def write_gdp_exp(desc: str, ric: str) -> dict:
    return {
        "subcategory": "GDP Expenditure",
        "units": "CNY billions",
        "meaning": f"GDP Expenditure Approach: {desc}. NBS expenditure-side GDP decomposition (Consumption + Investment + Government + Net Exports).",
        "how_to_use": "Track for GDP composition shifts. China's 'rebalancing' narrative depends on rising consumption share + falling investment share over time.",
        "related_series": ["aCNCGDPYD/A"],
    }


def write_auto(desc: str, ric: str) -> dict:
    sub = desc.replace("Motor Vehicles,", "").strip()
    return {
        "subcategory": "Autos",
        "units": "Units / CNY",
        "meaning": f"China Motor Vehicles: {sub}. Auto-industry statistic — China is the world's largest auto market (~30M units/year).",
        "how_to_use": "China auto market: ICE sales declining, NEV (new energy vehicle, including BEV + PHEV + FCEV) penetration ~50% in 2024 — rapid EV transition. BYD, Tesla, Geely, Great Wall lead. Watch alongside ride-hailing / charging-infrastructure indicators.",
        "related_series": [],
    }


def write_fai(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Fixed Asset Investment",
        "units": "CNY billions / Percent",
        "meaning": f"China Fixed Asset Investment: {desc}. Captures capital expenditure across infrastructure, real estate, manufacturing, and other sectors.",
        "how_to_use": "FAI is China's headline investment gauge — released monthly by NBS as part of the activity bundle. Decompose into infrastructure (state-led, counter-cyclical), manufacturing (private sector), real estate (now contracting). Each component tells a different story.",
        "related_series": ["aCNCGFCD/CA", "aCNCONINVR"],
    }


def write_fdi(desc: str, ric: str) -> dict:
    return {
        "subcategory": "FDI",
        "units": "USD millions / Sectoral",
        "meaning": f"China FDI: {desc}. Foreign direct investment data by source country, sector, or industry.",
        "how_to_use": "FDI inflows weakened sharply 2022-2024 amid US-China decoupling, regulatory crackdowns (tech, education, gaming), and slowing growth. Watch sectoral mix — services FDI relatively resilient, manufacturing FDI declining. Major sources: Hong Kong (#1, often pass-through), Singapore, Japan, South Korea.",
        "related_series": ["aCNBOPFANA"],
    }


def write_fx_ops(desc: str, ric: str) -> dict:
    return {
        "subcategory": "FX Operations",
        "units": "USD millions / CNY",
        "meaning": f"China Foreign Exchange Operations: {desc}. SAFE-published data on FX market activity.",
        "how_to_use": "Track SAFE's FX-purchase position and monthly FX settlement/sales by banks for understanding capital-flow direction. Persistent net FX sales by banks = capital outflow pressure.",
        "related_series": ["aCNXRUSD", "aCNCRESA"],
    }


def write_fx_market(desc: str, ric: str) -> dict:
    return {
        "subcategory": "FX Market",
        "units": "USD millions / CNY",
        "meaning": f"China FX Market: {desc}. FX market trading data — spot, forward, swap activity.",
        "how_to_use": "PBoC and SAFE manage CNY market through a combination of mid-point fix, intervention, capital controls. Forward rates signal expected appreciation/depreciation.",
        "related_series": ["aCNXRUSD"],
    }


def write_service_trade(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Service Trade",
        "units": "USD millions",
        "meaning": f"China International Service Trade: {desc}. Services exports/imports — travel, transport, insurance, financial services, IP royalties.",
        "how_to_use": "China runs a structural services-trade deficit (~$200B/year), driven by tourism (Chinese outbound > inbound) and IP royalty payments. Tourism deficit narrowed during COVID (2020-22) but is reverting as travel resumes.",
        "related_series": ["aCNCBOPA", "aCNCCURB/A"],
    }


def write_industrial(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Industrial",
        "units": "Various",
        "meaning": f"China Industrial: {desc}. Industrial-sector aggregate or sub-aggregate.",
        "how_to_use": "Track alongside the broader industrial production data. Above-designated-size firms (>CNY 20M revenue) account for ~70% of industrial output.",
        "related_series": [],
    }


def write_industrial_profit(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Industrial Profits",
        "units": "CNY billions",
        "meaning": f"Industrial: {desc}. Profit statistics for above-designated-size industrial firms — released monthly by NBS.",
        "how_to_use": "Industrial profits are the corporate-earnings cycle proxy for China. PPI deflation 2023-24 has compressed industrial-sector margins; profit YoY growth often negative. Watch alongside SOE vs private firm profit splits.",
        "related_series": [],
    }


def write_food_price(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Food Prices",
        "units": "CNY",
        "meaning": f"Average food price in 50 cities: {desc}. High-frequency retail food price data published by NBS for 50 major Chinese cities.",
        "how_to_use": "Higher-frequency than CPI food (which is monthly). Useful for spotting food-price inflection points. Pork prices are most-watched given high CPI weight (~3-4%).",
        "related_series": ["aCNCCPIYE/A"],
    }


def write_retail(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Retail Sales",
        "units": "Various",
        "meaning": f"China Retail Sales: {desc}. Retail-sector statistic — sub-category, regional, or alternative aggregation.",
        "how_to_use": "Use alongside headline retail sales YoY (aCNRSLAR). Retail sales are the main consumer-spending proxy in Chinese macro data.",
        "related_series": ["aCNRSLAR"],
    }


def write_cia_real_estate(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Real Estate",
        "units": "Sq m / CNY",
        "meaning": f"CIA Real Estate Transaction Data: {desc}. China Index Academy real-estate transaction tracking by city.",
        "how_to_use": "Higher-frequency real-estate data than NBS monthly aggregates. Useful for spotting city-level cycle inflection (e.g., Tier-1 cities recovering vs Tier-3 still weakening). Major cities tracked: Beijing, Shanghai, Shenzhen, Guangzhou, Hangzhou, Chengdu.",
        "related_series": ["aCNHSALESCB"],
    }


def write_stock_exchange(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Stock Exchange",
        "units": "Various",
        "meaning": f"China Stock Exchange: {desc}. Trading and listing data for Shanghai (SSE) or Shenzhen (SZSE) Stock Exchanges.",
        "how_to_use": "China's two major stock exchanges. Major indices: SSE Composite (Shanghai), SZSE Composite (Shenzhen), CSI 300 (cap-weighted top 300), STAR 50 (SSE STAR Market — tech), ChiNext (SZSE growth board). Foreign access via Stock Connect.",
        "related_series": [],
    }


def write_banking(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Banking",
        "units": "CNY billions / Percent",
        "meaning": f"China Commercial Banks: {desc}. Banking-sector aggregate or capital indicator.",
        "how_to_use": "China's banking system is dominated by 6 state-owned commercial banks (the 'Big 6': ICBC, CCB, ABC, BoC, BoCom, PSBC) plus joint-stock banks, city commercial banks, and rural commercial banks. PBoC regulates prudentially via CAR, NPL, LCR, NSFR ratios.",
        "related_series": ["aCNLOAN", "aCNCBCPARR"],
    }


def write_monetary_authority(desc: str, ric: str) -> dict:
    return {
        "subcategory": "PBoC Balance Sheet",
        "units": "CNY billions",
        "meaning": f"China Monetary Authority (PBoC): {desc}. PBoC balance-sheet item.",
        "how_to_use": "Track PBoC balance-sheet expansion for monetary-stance signals. Major PBoC tools: open market operations, MLF (Medium-term Lending Facility), SLF (Standing Lending Facility), PSL (Pledged Supplementary Lending), RRR.",
        "related_series": ["aCNMAASTTOT", "aCNMALIBTOT"],
    }


def write_employment(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Sector Employment",
        "units": "Persons, thousands",
        "meaning": f"China Employment: {desc}. Sectoral or sub-aggregate employment data.",
        "how_to_use": "Tracks employment by industry sector. Manufacturing employment has been declining as China's economy services-shifts. Construction employment falling since property-sector contraction. Services + technology employment growing.",
        "related_series": ["aCNCEMFO/A", "aCNCNUERLM"],
    }


def write_wages(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Wages",
        "units": "CNY",
        "meaning": f"China Wages: {desc}. Wage data by sector or category.",
        "how_to_use": "China publishes wages by urban formal-sector (above-designated-size firms). Migrant worker wages tracked separately by Ministry of Human Resources. Real-wage growth tracks productivity + inflation; recent slowdown reflects deflation.",
        "related_series": [],
    }


def write_iip(desc: str, ric: str) -> dict:
    return {
        "subcategory": "International Investment Position",
        "units": "USD millions",
        "meaning": f"China International Investment Position: {desc}. SAFE quarterly statistics on China's external assets/liabilities.",
        "how_to_use": "China is a net external creditor (net IIP positive ~$3 trillion). Reserve assets ($3.2T) dominate external assets; FDI liabilities (~$3T) dominate liabilities. Net direct investment position has been deteriorating as outbound FDI slows and inbound FDI weakens.",
        "related_series": ["aCNCRESA", "aCNBOPFANA"],
    }


def write_fiscal(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Fiscal",
        "units": "CNY billions",
        "meaning": f"China Government Finance: {desc}. Fiscal aggregate or sub-aggregate from MoF.",
        "how_to_use": "Track for fiscal-stance signals. China's official deficit (~3% of GDP) understates true fiscal stance — augmented deficit (including LGFVs, special bonds) typically 8-12% of GDP. Watch government fund revenue separately for land-sale revenue impact.",
        "related_series": ["aCNGDEF", "aCNCGREV", "aCNCGEXP"],
    }


def write_belt_road(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Belt and Road",
        "units": "Index",
        "meaning": f"The Belt and Road Initiative Index: {desc}. Tracks China's BRI activity along physical, capital, population, and enterprise-development dimensions.",
        "how_to_use": "BRI launched 2013 by Xi Jinping. ~150 countries have signed BRI MOUs. BRI activity (lending, infrastructure construction by Chinese firms abroad) has slowed since 2019 amid debt-distress concerns at recipient countries (Sri Lanka, Pakistan, Zambia, etc.). Track for China's geoeconomic footprint.",
        "related_series": [],
    }


def write_power_infra(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Power Infrastructure",
        "units": "CNY billions",
        "meaning": f"China Power Infrastructure: {desc}. Investment in electric power generation, transmission, distribution.",
        "how_to_use": "China is the world's largest power infrastructure investor. State Grid + Southern Grid dominate. Track for energy-transition pace — solar, wind, ultra-high-voltage transmission expansion are massive recent growth areas.",
        "related_series": ["aCNCGFCD/CA"],
    }


def write_chinese_local(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Regional Indicator",
        "units": "Various",
        "meaning": f"China regional / sectoral statistic: {desc}. Detailed regional or sectoral data series — original Chinese description preserved.",
        "how_to_use": "Refer to source description for specific content. Regional and city-level data in the China dataset captures provincial and urban-level economic activity, often used by analysts tracking specific localities.",
        "related_series": [],
    }


def write_test(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Test Series",
        "units": "—",
        "meaning": f"Test series — not for production use: {desc}. These are schema-test or vendor-internal placeholder series that occasionally appear in Refinitiv exports and should be excluded from analytical work.",
        "how_to_use": "Reference data only. Skip in any analytical workflow — these series do not represent real macroeconomic data and may contain dummy values, schema-validation patterns, or vendor-internal test markers.",
        "related_series": [],
    }


def write_discontinued(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Discontinued",
        "units": "Various",
        "meaning": f"{desc} — discontinued data series.",
        "how_to_use": "Use only for historical analysis. Check for replacement series.",
        "related_series": [],
    }


def write_generic(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Other",
        "units": "Various",
        "meaning": f"China macro reference series: {desc}. Refer to the description and source for analytical context.",
        "how_to_use": "Cross-check against related series in the same category for context. China macro data is published by the National Bureau of Statistics (NBS, real-economy + prices), People's Bank of China (PBoC, monetary), State Administration of Foreign Exchange (SAFE, BoP/FX), and Ministry of Finance (fiscal).",
        "related_series": [],
    }


def write_commodity_stock(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Commodity Inventory",
        "units": "Volume / Tonnes",
        "meaning": f"China commodity inventory/stock: {desc}. Inventory data tracking stockpiles of industrial commodities, raw materials, or finished goods.",
        "how_to_use": "Inventory cycles drive industrial-sector demand patterns. Rising stocks alongside falling production signal weakening demand; falling stocks with stable production signal supply tightening. Major stockpiles tracked: steel, copper, cement, coal — these are commodity-cycle indicators globally.",
        "related_series": [],
    }


def write_industrial_output(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Industrial Output",
        "units": "Tonnes / Units",
        "meaning": f"China industrial output: {desc}. Industrial-sector production data for specific products or sub-sectors.",
        "how_to_use": "Track for sector-cycle dynamics. China is the world's largest producer of steel, cement, copper, aluminum, and many other industrial commodities. Sustained production declines signal industrial-sector deceleration; sustained increases reflect capacity expansion or commodity-cycle peaks.",
        "related_series": [],
    }


# ============================================================================
#  DISPATCH
# ============================================================================
WRITERS = {
    "covid": write_covid,
    "acr": write_acr,
    "aml": write_aml,
    "compr_risk": write_compr_risk,
    "ifdi": write_ifdi,
    "caixin_pmi": write_caixin_pmi,
    "nbs_pmi": write_nbs_pmi,
    "production": write_production,
    "import": write_import,
    "export": write_export,
    "real_estate": write_real_estate,
    "real_estate_inv": write_real_estate_inv,
    "buildings": write_buildings,
    "land_price": write_land_price,
    "sme": write_sme,
    "cash_bonds": write_cash_bonds,
    "bonds": write_bonds,
    "cpi": write_cpi,
    "core_cpi": write_core_cpi,
    "ppi": write_ppi,
    "gdp": write_gdp,
    "gdp_exp": write_gdp_exp,
    "auto": write_auto,
    "fai": write_fai,
    "fdi": write_fdi,
    "fx_ops": write_fx_ops,
    "fx_market": write_fx_market,
    "service_trade": write_service_trade,
    "industrial": write_industrial,
    "industrial_profit": write_industrial_profit,
    "food_price": write_food_price,
    "retail": write_retail,
    "cia_real_estate": write_cia_real_estate,
    "stock_exchange": write_stock_exchange,
    "banking": write_banking,
    "monetary_authority": write_monetary_authority,
    "employment": write_employment,
    "wages": write_wages,
    "iip": write_iip,
    "fiscal": write_fiscal,
    "belt_road": write_belt_road,
    "power_infra": write_power_infra,
    "chinese_local": write_chinese_local,
    "test": write_test,
    "discontinued": write_discontinued,
    "commodity_stock": write_commodity_stock,
    "industrial_output": write_industrial_output,
    "generic": write_generic,
}


# ============================================================================
#  TIER1 SKIP-LIST — RICs that are hand-curated; never overwrite these.
# ============================================================================
# Load TIER1 RIC set from seed_cn_tier1.py to avoid clobbering hand entries.

def _load_tier1_rics() -> set[str]:
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, here)
    try:
        from seed_cn_tier1 import TIER1 as _T  # type: ignore
        return set(_T.keys())
    except ImportError:
        return set()


_TIER1_RICS = _load_tier1_rics()


def is_already_hand(ric: str, meaning: str, how_to_use: str) -> bool:
    return ric in _TIER1_RICS


# ============================================================================
#  MAIN
# ============================================================================
def main() -> int:
    if not os.path.isdir(CATALOG_DIR):
        print(f"ERROR: {CATALOG_DIR} not found")
        return 1

    files = [f for f in sorted(os.listdir(CATALOG_DIR))
             if f.endswith(".json") and not f.startswith("_")]

    total_written = 0
    total_skipped_already_hand = 0
    by_topic: dict[str, int] = {}

    for fn in files:
        path = os.path.join(CATALOG_DIR, fn)
        slug = fn[:-5]  # filename without .json
        with open(path, encoding="utf-8") as f:
            cat = json.load(f)
        modified = False
        for entry in cat.get("rics", []):
            ric = entry["ric"]
            desc = entry.get("description") or ""
            meaning = entry.get("meaning") or ""
            how = entry.get("how_to_use") or ""

            if is_already_hand(ric, meaning, how):
                total_skipped_already_hand += 1
                continue

            topic = topic_for(desc, slug)
            writer = WRITERS.get(topic, write_generic)
            content = writer(desc, ric)

            entry["subcategory"] = content["subcategory"]
            entry["units"] = content["units"]
            entry["meaning"] = content["meaning"]
            entry["how_to_use"] = content["how_to_use"]
            if content["related_series"]:
                entry["related_series"] = content["related_series"]
            total_written += 1
            by_topic[topic] = by_topic.get(topic, 0) + 1
            modified = True

        if modified:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(cat, f, ensure_ascii=False, indent=2)

    print(f"[seed-cn-auto] wrote {total_written} RICs (skipped {total_skipped_already_hand} already hand-curated)")
    print("By topic:")
    for topic, n in sorted(by_topic.items(), key=lambda x: -x[1]):
        print(f"  {topic:25} {n:>5}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
