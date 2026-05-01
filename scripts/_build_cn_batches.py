"""Build per-agent batch input files for China hand-curation.

Reads catalog/cn/_index.json, filters out already-hand-curated RICs and
reference/noise data, picks the top N most-important RICs per topic
group, and writes batch JSON files to data/cn_batches/batch_NN.json.

Each batch file contains a list of RIC descriptors that an agent will
hand-curate. The agent reads the batch and writes a Python file
scripts/seed_cn_batch_<NN>.py with TIER1-dict format entries.
"""
from __future__ import annotations
import json, os, sys, re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "scripts"))
from seed_cn_tier1 import TIER1 as ALREADY_HAND  # type: ignore

INDEX_PATH = os.path.join(REPO, "catalog", "cn", "_index.json")
BATCHES_DIR = os.path.join(REPO, "data", "cn_batches")

NOISE_PATTERNS = (
    "Anti-Corruption Risk",
    "Anti-Money Laundering",
    "Comprehensive Risk",
    "IFDI",
    "Coronavirus",
    "COVID",
    "TEST SERIES",
    "TESTING",
    "SCHEMA|",
    "Discontinued",
    "Fragile States",
)

def is_noise(desc: str) -> bool:
    return any(p in desc for p in NOISE_PATTERNS)

def is_chinese_local(desc: str) -> bool:
    # Description starts with Chinese characters → regional/local series
    return any('一' <= c <= '鿿' for c in desc[:5])


# ============================================================================
#  BATCH PARTITIONS — 12 topical batches, ~125 RICs each
# ============================================================================
# Each batch entry: (batch_id, batch_name, batch_topic_brief, slug_filters)
# slug_filters is a list of (slug, optional regex on desc, optional exclude regex)

BATCHES = [
    {
        "id": 1,
        "name": "Industrial Production — Metals & Mining",
        "topic": "Chinese industrial output for steel, copper, aluminum, base metals, mining",
        "filters": [
            ("cn_industrial_production_utilization", r"steel|copper|aluminum|alumina|metal|iron|smelt|coke|nickel|tin|lead|zinc|coal|mining|ore"),
        ],
    },
    {
        "id": 2,
        "name": "Industrial Production — Equipment & Machinery",
        "topic": "Chinese industrial output for machinery, equipment, electronics, vehicles, pollution-control",
        "filters": [
            ("cn_industrial_production_utilization", r"machine|machinery|equipment|electronic|computer|semiconductor|integrated circuit|robot|boiler|pollution control|electric|electrical|engine|generator"),
        ],
    },
    {
        "id": 3,
        "name": "Imports — Top product categories",
        "topic": "China merchandise imports by product (commodities, capital goods, consumer goods)",
        "filters": [
            ("cn_imports_exports", r"^Import|^Imports"),
        ],
    },
    {
        "id": 4,
        "name": "Exports — Top product categories",
        "topic": "China merchandise exports by product (manufactures, electronics, textiles, autos, machinery)",
        "filters": [
            ("cn_imports_exports", r"^Export|^Exports"),
        ],
    },
    {
        "id": 5,
        "name": "Automobiles & Transport detail",
        "topic": "China auto industry — production, sales, NEV, motorcycles, transport",
        "filters": [
            ("cn_automobiles_transport", None),
        ],
    },
    {
        "id": 6,
        "name": "Stocks, Bonds & Funds — Bond Market",
        "topic": "China bond market — issuance, depository, redemption, yields, panda bonds, MTN, ABS",
        "filters": [
            ("cn_stocks_bonds_and_funds", None),
        ],
    },
    {
        "id": 7,
        "name": "Foreign Transactions — CIBM bond & money markets",
        "topic": "China interbank bond market trading data — yields, repo, lending, deals",
        "filters": [
            ("cn_foreign_transactions", None),
        ],
    },
    {
        "id": 8,
        "name": "Inflation & Producer Prices sub-components",
        "topic": "China CPI sub-categories (food, services, regional) + PPI sub-sectors",
        "filters": [
            ("cn_consumer_prices_inflation", None),
            ("cn_producer_prices", None),
        ],
    },
    {
        "id": 9,
        "name": "Real Estate & Housing — full coverage",
        "topic": "China real estate cycle — construction, prices, transactions, land, by city/region",
        "filters": [
            ("cn_housing_construction", None),
            ("cn_housing_real_estate_prices", None),
        ],
    },
    {
        "id": 10,
        "name": "PMI Sub-Components + Consumer Surveys",
        "topic": "China business surveys — Caixin/RatingDog PMI sub-components, NBS PMI variants, consumer-confidence sub-indices",
        "filters": [
            ("cn_business_surveys", None),
            ("cn_consumer_surveys", None),
        ],
    },
    {
        "id": 11,
        "name": "Banking, Money Supply, Investment & Capital",
        "topic": "Bank balance sheets, monetary aggregates, FAI, capital formation, exchange rate operations",
        "filters": [
            ("cn_banking", None),
            ("cn_domestic_finance", None),
            ("cn_money_supply", None),
            ("cn_investment_capital_formation", None),
            ("cn_exchange_rates_and_operations", None),
            ("cn_international_reserves", None),
        ],
    },
    {
        "id": 12,
        "name": "Demographics, Energy, Population & Misc Macro",
        "topic": "Population dynamics, energy & environment, sales/orders/inventories, GDP-by-industry, labor",
        "filters": [
            ("cn_population", None),
            ("cn_energy_environment", None),
            ("cn_sales_orders_inventories", None),
            ("cn_gdp_gva_by_country", None),
            ("cn_workforce_unemployment", None),
            ("cn_employment_hours", None),
            ("cn_wages_earnings", None),
            ("cn_balance_of_payments", None),
            ("cn_external_debt", None),
            ("cn_international_investment_position", None),
            ("cn_gov_accounts", None),
            ("cn_government_total_debt", None),
            ("cn_gdp_by_expenditure", None),
            ("cn_gdp_deflators", None),
            ("cn_consumption", None),
            ("cn_corporate_accounts_actions", None),
            ("cn_retail_sales", None),
            ("cn_other_industries", None),
            ("cn_other_surveys", None),
            ("cn_commodities", None),
            ("cn_commodity_emissions", None),
            ("cn_incomes_savings", None),
            ("cn_import_export_price_indices", None),
            ("cn_financial_and_flow_of_funds_accounts", None),
            ("cn_cyclical_and_activity_indices", None),
            ("cn_agriculture", None),
            ("cn_mainland", None),
            ("cn_interest_rates", None),
        ],
    },
]


def main() -> int:
    with open(INDEX_PATH, encoding="utf-8") as f:
        idx = json.load(f)
    rics_data = idx["rics"]
    already_hand = set(ALREADY_HAND.keys())

    # Build pool of curatable RICs (real macro, not noise, not already curated)
    pool = []
    for ric, info in rics_data.items():
        if ric in already_hand:
            continue
        desc = info.get("description", "")
        if not desc or is_noise(desc) or is_chinese_local(desc):
            continue
        pool.append((ric, info.get("slug", ""), desc, info.get("frequency", "")))

    print(f"[batches] curatable pool: {len(pool)} RICs (after excluding {len(already_hand)} hand + noise + Chinese-local)")

    os.makedirs(BATCHES_DIR, exist_ok=True)
    used_rics: set[str] = set()
    summary = []

    for batch in BATCHES:
        bid = batch["id"]
        out_rics = []
        for slug, regex_filter in batch["filters"]:
            pat = re.compile(regex_filter, re.IGNORECASE) if regex_filter else None
            for ric, rslug, desc, freq in pool:
                if ric in used_rics: continue
                if rslug != slug: continue
                if pat and not pat.search(desc): continue
                out_rics.append({"ric": ric, "slug": rslug, "description": desc, "frequency": freq})
                used_rics.add(ric)
                if len(out_rics) >= 130: break
            if len(out_rics) >= 130: break
        # Truncate to 125
        out_rics = out_rics[:125]
        bf = {
            "batch_id": bid,
            "name": batch["name"],
            "topic": batch["topic"],
            "ric_count": len(out_rics),
            "rics": out_rics,
        }
        path = os.path.join(BATCHES_DIR, f"batch_{bid:02d}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(bf, f, ensure_ascii=False, indent=2)
        summary.append((bid, batch["name"], len(out_rics)))
        print(f"  batch_{bid:02d}.json  ({len(out_rics):>4} RICs)  — {batch['name']}")

    total = sum(n for _, _, n in summary)
    print(f"\n[batches] {total} RICs across {len(BATCHES)} batches")
    return 0


if __name__ == "__main__":
    sys.exit(main())
