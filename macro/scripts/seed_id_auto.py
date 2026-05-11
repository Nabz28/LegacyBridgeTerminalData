"""Programmatic topic-aware seeder for the Indonesia long-tail RICs.

Targets the ~700 RICs that don't warrant individual hand entries because they
follow predictable templates (Anti-Corruption Risk bands, IFDI sub-indices,
S&P Global PMI sub-components, COVID series, Anti-Money Laundering Risk bands,
Comprehensive Risk variants). Generates 2-3 sentence content per RIC by
detecting topic from description and composing a topic-template.

Idempotent: skips RICs that already have meaningful hand-curated content
(detected via description-fingerprint match against templates we'd write).

Run from repo root:  python scripts/seed_id_auto.py
"""

from __future__ import annotations

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog", "id")


# ============================================================================
#  TOPIC PATTERNS — order matters, first match wins
# ============================================================================

def topic_for(desc: str) -> str:
    d = desc.strip()
    if d.startswith("S&P Global"): return "spg_pmi"
    if d.startswith("Business activities"): return "bi_activity"
    if d.startswith("Average selling price"): return "bi_prices"
    if d.startswith("The usage of labor"): return "bi_labor"
    if d.startswith("Anti-Corruption Risk"): return "acr"
    if d.startswith("Anti-Money Laundering Risk"): return "aml"
    if d.startswith("Comprehensive Risk"): return "compr_risk"
    if d.startswith("IFDI"): return "ifdi"
    if d.startswith("ESG"): return "esg"
    if d.startswith("Coronavirus") or "COVID" in d: return "covid"
    if d.startswith("Discontinued"): return "discontinued"
    if d.startswith("Manufacturing"): return "manufacturing_misc"
    if d.startswith("Fragile States"): return "fragile_states"
    if "Business Surveys" in d: return "business_surveys_misc"
    return "generic"


# ============================================================================
#  TEMPLATE WRITERS — one per topic. Each returns dict with the 5 fields.
# ============================================================================

def write_spg_pmi(desc: str, ric: str) -> dict:
    """S&P Global Manufacturing PMI sub-components for Indonesia."""
    # Examples: "S&P Global, Mfg Sct, New orders" / "..., SA"
    sub = desc.split(",")[-1].strip().rstrip("/A")
    sub = re.sub(r",?\s*SA$", "", sub)
    is_sa = ", SA" in desc or "SA" in ric

    sub_lower = sub.lower()
    note = ""
    if "new order" in sub_lower:
        note = "Most-watched sub-index — leading indicator of headline manufacturing activity. Surge in new orders precedes output gains by 1-3 months."
    elif "input pr" in sub_lower or "output pr" in sub_lower:
        note = "Useful for tracking cost/price pressures in the manufacturing sector. Rising prices sub-index leads CPI goods-inflation."
    elif "empl" in sub_lower:
        note = "Manufacturing employment sub-index — leads formal manufacturing job creation by 1-2 months."
    elif "output" in sub_lower or "produc" in sub_lower:
        note = "Coincident output measure — tracks manufacturing GVA closely."
    elif "supplier" in sub_lower or "delivery" in sub_lower:
        note = "Supplier delivery times — lengthening (above 50) indicates supply-chain bottlenecks, often correlated with strong demand."
    elif "stock" in sub_lower or "fnshd" in sub_lower or "inventory" in sub_lower:
        note = "Inventories sub-index — rising levels can signal weaker downstream demand or stockpiling ahead of expected demand."
    elif "exp ord" in sub_lower or "export" in sub_lower:
        note = "Export orders sub-index — tracks foreign demand for Indonesian manufactures. Sensitive to global PMI and CNY moves."
    elif "future" in sub_lower:
        note = "Forward-looking output expectation — leads actual output by 6-12 months."
    elif "backlog" in sub_lower:
        note = "Backlog of work — rising backlogs indicate capacity-stretched producers; falling signals demand weakness."
    elif "purchas" in sub_lower:
        note = "Purchasing activity — input-side demand signal."
    elif "delivery time" in sub_lower:
        note = "Delivery time sub-index — proxy for supply-chain stress."
    else:
        note = "Sub-component of the headline S&P Global Indonesia Manufacturing PMI."
    sa_note = " Seasonally adjusted." if is_sa else ""

    return {
        "subcategory": "PMI Sub-Index",
        "units": "Diffusion (50=neutral)",
        "meaning": f"S&P Global Indonesia Manufacturing PMI sub-component: {sub}.{sa_note} Released monthly on the first business day; survey of ~400 manufacturing companies.",
        "how_to_use": f"{note} Headline PMI is the composite weighted average of new orders, output, employment, supplier delivery times, and stocks of purchases. Above 50 = expansion; below 50 = contraction.",
        "related_series": ["aIDPMINORD", "aIDPMIEMPM", "aIDPMIINPP"],
    }


def write_bi_activity(desc: str, ric: str) -> dict:
    """BI Business Activity Survey by sector (current vs future)."""
    # "Business activities, manufacturing industry, future"
    parts = [p.strip() for p in desc.split(",")]
    sector = parts[1] if len(parts) > 1 else "all sectors"
    horizon = parts[2] if len(parts) > 2 else "current"
    is_future = "future" in horizon.lower()
    return {
        "subcategory": "BI Business Survey",
        "units": "Net balance, percent",
        "meaning": f"Bank Indonesia Real Sector Business Activity Survey (SKDU): {sector}, {horizon} period. Quarterly diffusion index ({'forward-looking' if is_future else 'current-state'}) of business sentiment in {sector}.",
        "how_to_use": f"Net balance ({'expecting expansion' if is_future else 'reporting expansion'}) minus ({'expecting contraction' if is_future else 'reporting contraction'}). Above zero = net positive activity. {'Leads actual sectoral output by 1 quarter.' if is_future else 'Coincides with sectoral GDP growth.'} Pair with current/future cross-tab for cycle-turning signals.",
        "related_series": ["aIDBSBACTCR", "aIDBSBACTFU"],
    }


def write_bi_prices(desc: str, ric: str) -> dict:
    return {
        "subcategory": "BI Business Survey",
        "units": "Net balance, percent",
        "meaning": f"Bank Indonesia Real Sector Business Activity Survey: {desc.lower()}. Net balance of firms reporting price changes vs prior period.",
        "how_to_use": "Leading indicator of producer-price inflation. Sustained net positive readings flag pricing-power return; net negative signals competitive deflation. Pair with PPI when available.",
        "related_series": [],
    }


def write_bi_labor(desc: str, ric: str) -> dict:
    return {
        "subcategory": "BI Business Survey",
        "units": "Net balance, percent",
        "meaning": f"Bank Indonesia Real Sector Business Activity Survey: {desc.lower()}. Net balance of firms reporting labor-usage changes.",
        "how_to_use": "Leading indicator of formal-sector employment. Pairs with NFP-equivalent BPS labor data with 1-2 quarter lead.",
        "related_series": ["aIDCEMFO/A"],
    }


def write_acr(desc: str, ric: str) -> dict:
    """Anti-Corruption Risk indicator bands."""
    # "Anti-Corruption Risk, Government effectiveness, Band"
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    suffix = parts[-1] if len(parts) > 2 else ""
    is_band = "Band" in suffix
    is_rank = "Rank" in suffix
    is_sources = "Sources" in suffix
    is_score = "Score" in suffix
    label = "Band" if is_band else ("Rank" if is_rank else ("Sources" if is_sources else ("Score" if is_score else "Indicator")))
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Anti-Corruption Risk database: {indicator} ({label}) for Indonesia. Reference data used in compliance, due-diligence, and country-risk-screening workflows.",
        "how_to_use": "Reference series for ESG, compliance, and KYC processes. Not a macroeconomic indicator. Combine with other ACR metrics for country-level corruption-risk profiling. LSEG aggregates from World Bank Worldwide Governance Indicators, Transparency International, and others.",
        "related_series": [],
    }


def write_aml(desc: str, ric: str) -> dict:
    """Anti-Money Laundering Risk."""
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    suffix = parts[-1] if len(parts) > 2 else ""
    label = "Band" if "Band" in suffix else ("Rank" if "Rank" in suffix else ("Score" if "Score" in suffix else "Indicator"))
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Anti-Money Laundering Risk database: {indicator} ({label}) for Indonesia. Reference data used in AML/KYC compliance and financial-crime risk screening.",
        "how_to_use": "Reference series for AML compliance workflows. Not a macroeconomic indicator. Indonesia is FATF-monitored — recent improvements led to removal from the FATF grey list (2024).",
        "related_series": [],
    }


def write_compr_risk(desc: str, ric: str) -> dict:
    """Comprehensive Risk."""
    parts = [p.strip() for p in desc.split(",")]
    indicator = parts[1] if len(parts) > 1 else "general"
    suffix = parts[-1] if len(parts) > 2 else ""
    label = "Band" if "Band" in suffix else ("Rank" if "Rank" in suffix else ("Score" if "Score" in suffix else "Indicator"))
    return {
        "subcategory": "Risk Reference",
        "units": "Score / Rank / Band",
        "meaning": f"LSEG Comprehensive Risk database: {indicator} ({label}) for Indonesia. Aggregated country-risk reference combining political, economic, governance, and operational dimensions.",
        "how_to_use": "Reference series for enterprise risk management, compliance, and country-risk profiling. Not a macroeconomic indicator. Indonesia generally rated moderate risk across most dimensions.",
        "related_series": [],
    }


def write_ifdi(desc: str, ric: str) -> dict:
    """Islamic Finance Development Indicator."""
    parts = [p.strip() for p in desc.split(",")]
    section = parts[1] if len(parts) > 1 else "general"
    sub = ", ".join(parts[2:]) if len(parts) > 2 else ""
    return {
        "subcategory": "Islamic Finance",
        "units": "Score / Index",
        "meaning": f"Islamic Finance Development Indicator (IFDI): {section}{', ' + sub if sub else ''}. Reference data on Indonesia's Islamic finance ecosystem (Sharia-compliant banking, takaful insurance, sukuk markets, Islamic funds).",
        "how_to_use": "Indonesia is a major Islamic-finance market — ~7% of total banking assets are Sharia-compliant. The Financial Services Authority (OJK) targets growing this share. Reference indicator for tracking Islamic-finance ecosystem development; not a macro indicator.",
        "related_series": [],
    }


def write_esg(desc: str, ric: str) -> dict:
    return {
        "subcategory": "ESG",
        "units": "Score / Index",
        "meaning": f"LSEG ESG Reference: {desc.split(',', 1)[-1].strip() if ',' in desc else desc} for Indonesia. ESG (Environmental, Social, Governance) reference data.",
        "how_to_use": "ESG reference data for portfolio screening and sustainability analysis. Indonesia ESG profile shaped by deforestation concerns (palm oil), coal-export reliance, and ongoing energy transition.",
        "related_series": [],
    }


def write_covid(desc: str, ric: str) -> dict:
    sub = desc.replace("Coronavirus (COVID-19),", "").strip()
    return {
        "subcategory": "COVID-19",
        "units": "Cases / Tests / Vaccinations",
        "meaning": f"COVID-19 reference data for Indonesia: {sub}. Historical pandemic surveillance series, primarily 2020-2023.",
        "how_to_use": "Historical reference. Indonesia experienced a major Delta wave (mid-2021) and Omicron wave (early 2022). Active surveillance ramped down post-2023. Use for retrospective epidemiological or economic-shock analysis.",
        "related_series": [],
    }


def write_discontinued(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Discontinued",
        "units": "Various",
        "meaning": f"{desc} — discontinued data series. No longer updated; preserved for historical reference.",
        "how_to_use": "Use only for historical analysis. Check description for series-discontinuation date and any replacement series.",
        "related_series": [],
    }


def write_manufacturing_misc(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Manufacturing",
        "units": "Index",
        "meaning": f"Indonesia manufacturing-related series: {desc}. Sectoral indicator covering manufacturing activity dimensions.",
        "how_to_use": "Use alongside the headline PMI (composite of S&P Global aIDPMI series) and BPS Industrial Production for triangulated manufacturing-cycle reads.",
        "related_series": ["aIDCINDG/A"],
    }


def write_fragile_states(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Risk Reference",
        "units": "Score",
        "meaning": f"Fragile States Index for Indonesia. Annual ranking by the Fund for Peace measuring state stability across cohesion, economic, political, and social dimensions.",
        "how_to_use": "Country-risk reference. Indonesia ranks in the middle tier (around 70-80 out of ~180 countries). Used in sovereign-risk and operational-risk screening alongside other governance indicators.",
        "related_series": [],
    }


def write_generic(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Other",
        "units": "Various",
        "meaning": f"Indonesia macro reference series: {desc}. Refer to the description and source for analytical context.",
        "how_to_use": "Cross-check against related series in the same category for context. Indonesia macro data is published by Bank Indonesia (monetary, financial), BPS-Statistics Indonesia (real economy), and Ministry of Finance (fiscal).",
        "related_series": [],
    }


def write_business_surveys_misc(desc: str, ric: str) -> dict:
    return {
        "subcategory": "Business Survey",
        "units": "Net balance / Diffusion",
        "meaning": f"Indonesia business survey series: {desc}. Captures business-sector activity, expectations, or conditions.",
        "how_to_use": "Indonesia business surveys (BI's SKDU, S&P Global PMI, BPS sectoral surveys) provide forward-looking and current-state diffusion indicators. Net positive readings = expansion. Pair with hard-data complements for triangulated reads.",
        "related_series": [],
    }


# ============================================================================
#  DISPATCH TABLE
# ============================================================================
WRITERS = {
    "spg_pmi": write_spg_pmi,
    "bi_activity": write_bi_activity,
    "bi_prices": write_bi_prices,
    "bi_labor": write_bi_labor,
    "acr": write_acr,
    "aml": write_aml,
    "compr_risk": write_compr_risk,
    "ifdi": write_ifdi,
    "esg": write_esg,
    "covid": write_covid,
    "discontinued": write_discontinued,
    "manufacturing_misc": write_manufacturing_misc,
    "fragile_states": write_fragile_states,
    "business_surveys_misc": write_business_surveys_misc,
    "generic": write_generic,
}


# ============================================================================
#  IS-HAND-CURATED DETECTION
# ============================================================================
# Strict signatures that ONLY my Tier-1 hand entries use. Anything matching
# these is real hand-curated content and we skip it. Everything else gets
# overwritten with topic-aware auto content.

TIER1_SIGNATURES = (
    "monthly Bank Indonesia Monetary Policy Committee",
    "Survey of Consumer Confidence (SK)",
    "Sakernas (National Labor Force Survey)",
    "BI 7-Day Reverse Repo",
    "Released ~3 weeks after month-end",
    "Indonesia is the world's largest thermal coal exporter",
    "World's 4th most populous nation",
    "BPS-Statistics Indonesia (Badan Pusat Statistik)",
    "the BI 7-Day Reverse Repo Rate (BI7DRRR)",
    "(Investment Coordinating Board)",
    "BI's macroprudential corridor",
    "Sukuk (Surat Berharga Negara)",
    "(SULNI report)",
    "burden-sharing arrangements",
    "JISDOR",
    "BIS Nominal Broad Effective",
    "BIS Real Broad Effective",
    "Standard & Poor's, 500 Composite Index",  # placeholder note
    "Indonesia Equity Index",                    # placeholder note
)


def is_already_hand(meaning: str, how_to_use: str) -> bool:
    text = (meaning or "") + " " + (how_to_use or "")
    return any(m in text for m in TIER1_SIGNATURES)


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
        with open(path, encoding="utf-8") as f:
            cat = json.load(f)
        modified = False
        for entry in cat.get("rics", []):
            ric = entry["ric"]
            desc = entry.get("description") or ""
            meaning = entry.get("meaning") or ""
            how = entry.get("how_to_use") or ""

            # Skip RICs that already have hand-curated content
            if is_already_hand(meaning, how):
                total_skipped_already_hand += 1
                continue

            topic = topic_for(desc)
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

    print(f"[seed-id-auto] wrote {total_written} RICs (skipped {total_skipped_already_hand} already hand-curated)")
    print("By topic:")
    for topic, n in sorted(by_topic.items(), key=lambda x: -x[1]):
        print(f"  {topic:25} {n:>4}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
