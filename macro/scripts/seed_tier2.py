"""Seed Tier-2 skill content (everything beyond the headline ~16 Tier-1 RICs).

Hand-curated content keyed by RIC. Idempotent: re-running overwrites these fields with
the values defined here. Tier-1 RICs (seeded by seed_tier1.py) are skipped automatically.

Run from repo root:  python scripts/seed_tier2.py [slug]...
  - no args: process every category that has content defined below
  - slug args: process only those categories
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

# Tier-2 content is US-specific (hand-curated for aUS... RICs). Bail out cleanly
# for other countries.
if COUNTRY != "us":
    print(f"[seed-tier2] country={COUNTRY} — Tier-2 content is US-only, skipping.")
    sys.exit(0)


# ============================================================
# CONTENT — keyed by category slug, then by RIC.
# Each RIC value is: (subcategory, units, meaning, how_to_use, related_series)
# ============================================================
CONTENT: dict[str, dict[str, tuple[str, str, str, str, list[str]]]] = {

    # ----------------------------------------------------------------
    # Singletons / tiny categories
    # ----------------------------------------------------------------
    "us_commodity_prices_indices": {
        "aUSINTCONB/A": (
            "Consumer Interest", "USD billions, SAAR",
            "Total interest paid by persons (households + nonprofits) excluding mortgage interest. From BEA Personal Income & Outlays.",
            "Cyclical: rises with consumer credit balances and effective rates. Pair with consumer credit outstanding to see whether the burden is balance-driven or rate-driven. Heavy in late-cycle when revolving balances peak.",
            [],
        ),
    },

    "us_industry_balance_sheets": {
        "aUSSSINF": (
            "Selected Services", "USD millions, SAAR",
            "Quarterly Services Survey estimate of revenues for the information sector (publishing, broadcasting, telecom, data processing, software).",
            "Tracks digital-economy revenues. Use as a proxy for software/cloud and telecom demand alongside earnings prints. Volatile QoQ — smooth with 4Q averages.",
            [],
        ),
    },

    "us_other_surveys": {
        "aUSRSAHMN/A": (
            "Recession Indicator", "Percentage points",
            "Real-Time Sahm Rule indicator: 3-month moving average of the unemployment rate, minus its trailing-12-month low. Triggers (signals recession) when ≥ 0.5pp.",
            "Among the cleanest historical recession signals — has fired at the start of every US recession since 1970. A trigger doesn't make a recession inevitable, but flagging it warrants caution. Watch alongside NFP, claims, and yield curve.",
            ["aUSUNTOTR", "aUSNFARM/A", "aUSLIDXAWIC/A"],
        ),
    },

    "us_other_sectors": {
        "aUSCPICNFB/A": (
            "Corporate Profits", "USD billions, SAAR",
            "Nonfinancial corporate profits with inventory valuation and capital consumption adjustments — the cleanest cyclical profit measure in the NIPA accounts.",
            "Leading indicator for capex and hiring. Diverges from S&P 500 EPS (which is global + financial-heavy); useful as a domestic real-economy profit gauge. Compare to nonfinancial output to track margin trends.",
            ["aUSMPATX", "aUSMPDMF", "aUSMPNDMF"],
        ),
        "aUS15IDGN": (
            "Household Sector", "USD billions",
            "Personal consumption of consumer durables by households and non-profit institutions serving households (NPISH). Annual NIPA detail.",
            "Long-cycle gauge of durables stock formation (vehicles, furniture, appliances). Use the QoQ retail/durables prints for cycle timing; this annual line is for level/trend.",
            [],
        ),
    },

    "us_corporate_accounts_actions": {
        "aUSMPATX": (
            "Mfg Profits", "USD millions",
            "Manufacturing corporations after-tax profits — Census Quarterly Financial Report (QFR). Covers all manufacturing.",
            "Pair with industrial production and ISM Manufacturing for the full mfg cycle picture. Profit margins (profits/sales) here lead capex decisions. Look at YoY change rather than level.",
            ["aUSMPDMF", "aUSMPNDMF", "aUSCPICNFB/A"],
        ),
        "aUSMPDMF": (
            "Mfg Profits", "USD millions",
            "After-tax profits for durable-goods manufacturing (autos, machinery, electronics, fab metals). QFR.",
            "Durables are the cyclical heart of mfg — leads the broader cycle. Pair with new orders for durable goods to gauge order-book to bottom-line transmission.",
            ["aUSMPATX", "aUSMPNDMF"],
        ),
        "aUSMPNDMF": (
            "Mfg Profits", "USD millions",
            "After-tax profits for nondurable-goods manufacturing (food, chemicals, petroleum, textiles, paper). QFR.",
            "Less cyclical than durables; more sensitive to commodity input costs. Petroleum sub-component swings the headline — strip it out for trend.",
            ["aUSMPATX", "aUSMPDMF"],
        ),
        "aUSRPROFITA": (
            "Retail Profits", "USD millions",
            "Retail trade corporations, after-tax income or loss. QFR.",
            "Cross-check with retail sales: persistent retail sales growth without profit growth implies margin compression (most likely from labor/rent). Useful for sector valuation context.",
            ["aUSRTOPIN", "aUSRTSRNOPR", "aUSCRETF/C"],
        ),
        "aUSRPROFITA": (
            "Retail Profits", "USD millions",
            "Retail trade corporations, after-tax income or loss. QFR.",
            "Cross-check with retail sales: persistent retail sales growth without profit growth implies margin compression (most likely from labor/rent). Useful for sector valuation context.",
            ["aUSRTOPIN", "aUSRTSRNOPR", "aUSCRETF/C"],
        ),
        "aUSRTOPIN": (
            "Retail Profits", "USD millions",
            "Retail trade corporations, income or loss from operations (pre-tax operating income).",
            "Pre-tax operating proxy for the retail sector — strips out tax effects and one-offs. Use the after-tax line for valuation, this for operational health.",
            ["aUSRPROFITA", "aUSRTSRNOPR"],
        ),
        "aUSRTSRNOPR": (
            "Retail Sales (QFR)", "USD millions",
            "Retail trade corporations, net sales, receipts and operating revenues. The top line of QFR retail.",
            "Differs from BLS retail sales: QFR is corporation-level (excludes sole proprietors), quarterly, more volatile. Use BLS retail sales for the headline; this for sector earnings context.",
            ["aUSCRETF/C", "aUSRPROFITA", "aUSRTOPIN"],
        ),
    },

    "us_other_industries": {
        "aUSTTOPAS/A": (
            "Tourism", "USD millions",
            "Total tourism-related output for passenger air transportation. BEA Travel & Tourism Satellite Accounts, annual.",
            "Long-run tourism trend gauge. Combine with monthly TSA throughput for high-frequency cross-check. Sensitive to fuel costs and consumer discretionary.",
            ["aUSTOAIRT/A", "aUSTRTTP"],
        ),
        "aUSSTIND/A": (
            "Tourism", "USD millions",
            "Total tourism industry sales — quarterly aggregate of all tourism-related sectors.",
            "Headline tourism cycle gauge. Watch alongside leisure & hospitality payrolls (in employment_hours) and consumer confidence for the broader services consumer view.",
            ["aUSTOAIRT/A", "aUSTOTRACC/A"],
        ),
        "aUSTOAIRT/A": (
            "Tourism", "USD millions",
            "Total sales of passenger air transportation within tourism industries — quarterly.",
            "Most cyclical tourism sub-line. Compare against airline industry revenues (BTS) and the TSA throughput series for a real-time cross-check.",
            ["aUSSTIND/A", "aUSTRTTP"],
        ),
        "aUSTOTRACC/A": (
            "Tourism", "USD millions",
            "Total sales of traveler accommodations (hotels, motels, B&Bs) within tourism industries — quarterly.",
            "Pair with RevPAR and occupancy rate from STR/CBRE for sector-level depth. Sensitive to business travel cycles, not just leisure.",
            ["aUSSTIND/A", "aUSTOAIRT/A"],
        ),
        "aUSTRTTP": (
            "Travel Activity", "Persons",
            "TSA airport security checkpoint throughput — count of passengers screened. Daily; aggregated monthly here.",
            "Highest-frequency travel demand indicator. Use as a real-time cross-check on tourism / leisure consumer spend. Compare YoY to control for seasonality.",
            ["aUSTRTH/A", "aUSTOAIRT/A"],
        ),
        "aUSTRTH/A": (
            "Travel Activity", "Persons",
            "TSA Checkpoint Traveler Throughput — same as aUSTRTTP, alternate series with adjustments.",
            "Use whichever has cleaner recent prints. Watch the YoY % change for trend; the level is heavily seasonal.",
            ["aUSTRTTP", "aUSSTIND/A"],
        ),
    },

    "us_other_prices": {
        "aUSPCEAR": (
            "PCE Headline", "%, MoM",
            "Headline PCE price index, month-over-month change. Released with BEA Personal Income & Outlays.",
            "Sister series to core PCE (aUSPCEMAR) — headline includes food and energy. The 6m annualized rate is what FOMC speakers reference. Spread to core tells you how much the headline number is being moved by energy/food.",
            ["aUSPCEMAR", "aUSPCEYAR", "aUSCPI", "aUSCPIYYR"],
        ),
        "aUSEBM10Y": (
            "Treasury Yields", "%, p.a.",
            "10-year US government bond yield. The benchmark long-rate for global risk pricing.",
            "Single most-watched US bond price. Decompose into real yield (TIPS) + breakeven inflation. The 2s10s spread is the classic recession signal. Tracks Fed expectations + term premium.",
            ["aUSFEDFUND", "aUSTRCN20"],
        ),
        "aUSEPDAPG": (
            "Energy Retail Prices", "USD/gallon",
            "Average US retail diesel price, all areas. Weekly EIA series, monthly here.",
            "Truck/freight cost proxy. Diesel diverges from gasoline due to refinery yield mix and global maritime demand (low-sulfur regs). Spike in diesel relative to gasoline often precedes goods CPI moves.",
            ["aUSEPGAPG", "aUSGSPRA"],
        ),
        "aUSEPGAPG": (
            "Energy Retail Prices", "USD/gallon",
            "Average US retail regular gasoline price, all areas. Weekly EIA, monthly here.",
            "Most consumer-visible price — moves consumer confidence almost in real time. Heavy contributor to headline CPI (~3-4% weight). Use 4-week change for sentiment read.",
            ["aUSGSPRA", "aUSEPDAPG"],
        ),
        "aUSGSPRA": (
            "Energy Retail Prices", "USD/gallon",
            "Average retail price for regular gasoline, all US areas — alternate series matching aUSEPGAPG.",
            "Use whichever has cleaner data. The MoM change feeds directly into the energy component of headline CPI.",
            ["aUSEPGAPG", "aUSEPDAPG"],
        ),
        "aUSEPHAPG": (
            "Energy Retail Prices", "USD/gallon",
            "Average residential heating oil retail price, all US areas. Highly seasonal — concentrated in Northeast.",
            "Winter heating-cost gauge. Less macro-relevant than gasoline (much smaller share of budgets) but politically sensitive in cold-weather years.",
            ["aUSEPDAPG", "aUSEPGAPG"],
        ),
    },

    "us_foreign_transactions": {
        "aUSNSH47W": (
            "Current Account", "USD billions",
            "Balance on current account in NIPA terms — net of trade in goods, services, primary income (investment income), and secondary income (transfers).",
            "Differs slightly from BEA's headline current account due to NIPA accounting conventions. Persistent current-account deficits funded by capital inflows; reversal of inflows is a tail risk.",
            ["aUSNS7V3L", "aUSN4RIKM"],
        ),
        "aUSN4RIKM": (
            "Current Account", "USD billions",
            "Total current receipts from rest of world — exports of goods/services + income receipts + transfers from abroad.",
            "Pair with current payments to compute the current-account balance. Strong dollar typically compresses receipts in USD terms (J-curve dynamics).",
            ["aUSNSH47W", "aUSN7DXQY", "aUSNYV66Y"],
        ),
        "aUSN7DXQY": (
            "Goods Trade", "USD billions",
            "Exports of durable goods (capital equipment, autos, industrial supplies, consumer durables).",
            "More cyclical than nondurables — leads the global capex cycle. Pair against ISM new export orders and global PMI for forward signal.",
            ["aUSNYV66Y", "aUSNZJZTM"],
        ),
        "aUSNYV66Y": (
            "Goods Trade", "USD billions",
            "Exports of nondurable goods (food, energy, chemicals, agricultural products).",
            "Less cyclical, more commodity-sensitive. Energy exports (US is a net exporter post-shale) drive much of the recent trend; strip them out for non-energy reads.",
            ["aUSN7DXQY", "aUSN4VL9L"],
        ),
        "aUSGDPCC/CA": (
            "GDP Per Capita", "USD",
            "GDP per capita — total nominal GDP divided by population. Quarterly.",
            "Long-run living-standards gauge. Use real (inflation-adjusted) per capita for cross-country comparison. The level matters less than the YoY growth rate.",
            ["aUSCGDPPD/A", "aUSGDPEQZ/CA"],
        ),
        "aUSNZJZTM": (
            "Goods Trade", "USD billions",
            "Imports of durable goods. Larger than exports — the durables trade deficit is structural.",
            "Cycles with US capex and consumer durables demand. Watch share from China (with tariff overlay) for trade-policy effects.",
            ["aUSN7DXQY", "aUSN4VL9L"],
        ),
        "aUSN4VL9L": (
            "Goods Trade", "USD billions",
            "Imports of nondurable goods (food, beverages, energy, consumer staples).",
            "Steadier than durables imports. Energy imports collapsed post-shale; what remains is mostly consumer staples.",
            ["aUSNYV66Y", "aUSNZJZTM"],
        ),
        "aUSNS7V3L": (
            "Net External Position", "USD billions",
            "Net lending or borrowing position vs rest of world (NIPA basis). Mirror of current-account balance with a few NIPA adjustments.",
            "Positive = US is net lender (saving > investment), negative = net borrower. Persistent negatives need capital inflow to fund.",
            ["aUSNSH47W", "aUSN4RIKM"],
        ),
    },

    # ----------------------------------------------------------------
    # Wave 2 — small/medium categories (10-35 RICs)
    # ----------------------------------------------------------------
    "us_international_reserves": {
        "aUSCRCUYRA": ("FX Reserves Change", "%, YoY", "Foreign currency reserves YoY % change, standardized.", "Most useful for cross-country comparison. US reserves are tiny relative to GDP because USD is reserve currency — focus on the trend, not the level.", ["aUSRAFXCH", "aUSCRESYA"]),
        "aUSCRESPA": ("Reserves Change", "%, MoM", "Official international reserves MoM % change, standardized.", "Watch for unusual swings — large MoM moves can signal FX intervention or valuation effects from gold/SDR repricing.", ["aUSCRESYA", "aUSRES"]),
        "aUSCRESYA": ("Reserves Change", "%, YoY", "Official international reserves YoY % change, standardized.", "Cleaner trend signal than MoM. US reserves grow mostly through gold revaluation and IMF position changes; FX trading is rare.", ["aUSCRESPA", "aUSRES"]),
        "aUSCRESA": ("Reserves Level", "USD billions", "Total official international reserves, standardized.", "Sum of FX, gold, SDR, IMF reserve position. Used for FX intervention capacity (rarely deployed for the US).", ["aUSRES", "aUSRAFXCH", "aUSRESGLD", "aUSRESSDR"]),
        "aUSRES": ("Reserves Level", "USD millions", "Total reserve assets — mirror of aUSCRESA in different units.", "Use this or aUSCRESA, whichever has cleaner data.", ["aUSCRESA", "aUSFXRESA"]),
        "aUSRAFXCH": ("FX Reserves", "USD millions", "Foreign currency component of reserve assets — euros, yen, gold-backed.", "Smallest piece of US reserves. Big country FX reserves are mostly USD; the US holds mostly gold.", ["aUSRES", "aUSFXRESA"]),
        "aUSRESGLD": ("Gold Reserves", "USD millions", "Gold stock component of reserve assets, valued at official rate (~$42/oz historically — way below market).", "The US holds ~8,100 tonnes — largest in the world. Valued at the legacy book price, vastly understated. Market value is 30x+ book.", ["aUSRESGLDA"]),
        "aUSRESSDR": ("SDR Holdings", "USD millions", "Holdings of Special Drawing Rights at the IMF.", "SDRs are an IMF reserve unit. US allocation grew sharply in the 2021 SDR allocation post-COVID.", ["aUSRESIMF", "aUSRVSSDRA"]),
        "aUSRESIMF": ("IMF Position", "USD millions", "US reserve position in IMF — quota subscription minus IMF holdings of US currency.", "Mostly accounting. Moves when the US lends to IMF programs or its quota changes.", ["aUSRESSDR", "aUSRESIMFIRA"]),
        "aUSFXRESA": ("Reserves Level", "USD millions", "Total foreign reserves: assets — alternate Fed series.", "Use whichever of aUSFXRESA / aUSRES has fresher data.", ["aUSRES", "aUSCRESA"]),
        "aUSRESGLDA": ("Gold Reserves", "USD millions", "Gold component of US foreign reserves — alternate series.", "Cross-check with aUSRESGLD.", ["aUSRESGLD"]),
        "aUSRESIMFIRA": ("IMF Position", "USD millions", "IMF reserve position — alternate series.", "Cross-check with aUSRESIMF.", ["aUSRESIMF"]),
        "aUSRVSSDRA": ("SDR Holdings", "USD millions", "SDRs — alternate series.", "Cross-check with aUSRESSDR.", ["aUSRESSDR"]),
    },

    "us_energy_environment": {
        "aUSELSATOP": ("Electricity", "Million kWh", "Total electricity sales across all sectors (residential, commercial, industrial, transportation).", "Real-economy demand gauge. Industrial sales lead manufacturing cycles; residential is weather-driven. Adjust for cooling/heating-degree-days for cycle signal.", ["aUSWEAICDD", "aUSWEAIHDD"]),
        "aUSWEAICDD": ("Weather", "Degree-days", "Cooling degree-days — sum of (daily mean temperature − 65°F) when above 65°F. Higher = more AC demand.", "Use to weather-adjust electricity, gas, and natgas storage data. Hot summer = high CDD = high electricity demand.", ["aUSWEAIHDD", "aUSELSATOP"]),
        "aUSWEAIHDD": ("Weather", "Degree-days", "Heating degree-days — sum of (65°F − daily mean) when below 65°F. Higher = more heating demand.", "Critical for natgas demand modeling — winter HDD drives storage drawdowns. Use 5-year normal as baseline.", ["aUSWEAICDD", "aUSNGGWDRP"]),
        "aUSWIPRINP": ("Weather", "Inches", "Total precipitation in inches.", "Agricultural/hydro power input. Pair with crop progress reports for harvest forecasting.", ["aUSWIPRMMP"]),
        "aUSWIPRMMP": ("Weather", "Millimeters", "Total precipitation in millimeters — same data, metric units.", "Use whichever unit your model expects.", ["aUSWIPRINP"]),
        "aUSSCBBR": ("Semiconductors", "Ratio", "Semiconductor equipment book-to-bill ratio — orders / shipments. Above 1.0 = orders outpace shipments (expanding).", "Leads semi capex cycle by 1-2 quarters. Watch for sustained sub-1.0 prints as recession warning.", []),
        "aUSRSCO": ("Oil Reserves", "Million barrels", "US proved crude oil reserves — annual.", "Reserve replacement ratio (additions vs production) is the long-run sustainability gauge. Surged with shale; growth slowing as best Permian acreage drilled.", ["aUSEXPFMGP", "aUSIMCOP"]),
        "aUSEXPFMGP": ("Petroleum Trade", "Thousand barrels", "Exports of finished motor gasoline.", "US is now a net products exporter despite being a net crude importer until ~2019 — refinery capacity exceeds domestic demand.", ["aUSIMCOP"]),
        "aUSIMCOP": ("Petroleum Trade", "Thousand barrels", "US crude oil imports.", "Halved post-shale (2008-2020) but stable since. Source mix matters: Canada heavy crude is irreplaceable in Gulf Coast refineries.", ["aUSEXPFMGP", "aUSRSCO"]),
        "aUSNGGWDRP": ("Natural Gas", "Million cubic feet", "Gross natural gas withdrawals — total production from wells.", "US is world's largest natgas producer. Watch alongside Henry Hub prices and LNG export terminal utilization.", []),
        "aUSINCOXRP": ("Oil Inventories", "Thousand barrels", "Crude oil stocks excluding Strategic Petroleum Reserve.", "Most-watched oil inventory series. Weekly EIA report moves prices; surprises vs API/consensus drive intraday action.", ["aUSINCOP", "aUSINSPRP"]),
        "aUSINCOP": ("Oil Inventories", "Thousand barrels", "Crude oil stocks including SPR.", "Less useful than ex-SPR — SPR moves are policy-driven, not market-driven.", ["aUSINCOXRP", "aUSINSPRP"]),
        "aUSINPPP": ("Oil Inventories", "Thousand barrels", "Total petroleum and products stocks (crude + gasoline + distillates etc).", "Aggregate liquidity gauge. Big draws during driving season (gasoline) and winter (distillates).", ["aUSINCOXRP"]),
        "aUSINSPRP": ("SPR", "Thousand barrels", "Strategic Petroleum Reserve level.", "Drained 200M+ bbl in 2022 (Russia/Ukraine response). Refilling has been slow. Below ~350M bbl is historically low.", ["aUSINCOP"]),
    },

    "us_exchange_rate_operations": {
        "aUSBISNXBR": ("BIS Effective Rates", "Index", "Nominal Broad Effective Exchange Rate Index — trade-weighted USD vs major and emerging trading partners (60+ countries).", "Best comprehensive USD strength gauge. Rising index = stronger USD = headwind for US exports and EM EM debt service.", ["aUSBISRXBR", "aUSCXTWF/C"]),
        "aUSBISNXNR": ("BIS Effective Rates", "Index", "Nominal Narrow Effective Exchange Rate Index — narrower basket (~26 advanced economies).", "Cleaner read on G10 USD positioning. Less noise from EM volatility.", ["aUSBISNXBR", "aUSBISRXNR"]),
        "aUSBISRXBR": ("BIS Effective Rates", "Index", "Real (CPI-adjusted) Broad Effective Exchange Rate. Captures real competitiveness.", "True purchasing power gauge. Rising real EER = US loses real competitiveness even if nominal rate flat.", ["aUSBISNXBR"]),
        "aUSBISRXNR": ("BIS Effective Rates", "Index", "Real Narrow Effective Exchange Rate.", "Use alongside the broad index. Narrow vs broad gap = EM vs DM USD strength.", ["aUSBISNXNR"]),
        "aUSXRUSD": ("Bilateral Rates", "USD/EUR", "USD/EUR exchange rate — noon NY fixing.", "Most-traded FX pair. EUR strength typically reflects relative ECB-Fed policy stance + relative growth.", []),
        "aUSCORP/A": ("Money Markets", "Index/Yield", "Commercial Paper rate — short-term corporate borrowing.", "Front-end credit gauge. Spread to T-bills (CP-bill spread) widens in stress.", []),
        "aUS0CWMCRF/C": ("Fed TWI", "Index", "Fed Trade Weighted Real Index — Major Currencies.", "Fed's own real USD index. Diverges slightly from BIS due to weighting methodology.", ["aUSCWMCRF/C", "aUSBISRXBR"]),
        "aUSCWMCRF/C": ("Fed TWI", "Index", "Fed Real Advanced Foreign Economies Dollar Index.", "Newer Fed index focused on AE trading partners — successor to the Major Currencies index.", ["aUS0CWMCRF/C", "aUSCXTRF/C"]),
        "aUSCXTWPF": ("USD Trade-Weighted", "%, MoM", "Trade-weighted nominal USD MoM % change, standardized.", "High-frequency USD strength signal. Watch alongside DXY.", ["aUSCXTWYF", "aUSCXTWF/C"]),
        "aUSCXTWYF": ("USD Trade-Weighted", "%, YoY", "Trade-weighted nominal USD YoY % change.", "Trend signal. >5% YoY USD strength is historically a drag on EPS for US multinationals.", ["aUSCXTWPF", "aUSCXTWF/C"]),
        "aUSCXTWF/C": ("USD Trade-Weighted", "Index", "Trade-weighted nominal USD level, standardized.", "Use the % changes for cycle signal; this for level / cross-country comparisons.", ["aUSCXTWPF", "aUSCXTWYF"]),
        "aUSCXTRPF": ("USD Trade-Weighted", "%, MoM", "Trade-weighted REAL USD MoM % change.", "Strips inflation differentials. Cleaner competitiveness signal than nominal.", ["aUSCXTRYF", "aUSCXTRF/C"]),
        "aUSCXTRYF": ("USD Trade-Weighted", "%, YoY", "Trade-weighted real USD YoY % change.", "Best annual USD competitiveness measure for trade modeling.", ["aUSCXTRPF", "aUSCXTRF/C"]),
        "aUSCXTRF/C": ("USD Trade-Weighted", "Index", "Trade-weighted real USD level, standardized.", "Comparable across countries via BIS REER framework.", ["aUSCXTRPF", "aUSCXTRYF"]),
        "aUSOCFPP/A": ("PPP", "USD", "Purchasing power parity — units of national currency per USD. For US, this is base = 1.0.", "Useful only for cross-country GDP comparisons. Not market-tradable.", []),
    },

    "us_import_export_price_indices": {
        "aUSEXPP": ("Export Prices", "Index", "Export prices, all commodities — BLS monthly.", "Reflects US producer pricing power abroad. Combined with import prices gives terms-of-trade signal.", ["aUSEXPPNAG", "aUSIMPP"]),
        "aUSEXPPNAG": ("Export Prices", "Index", "Export prices, nonagricultural commodities — strips out volatile food/farm exports.", "Better signal of manufactured-goods pricing. Cleaner trend than the headline.", ["aUSEXPP"]),
        "aUSEXPAR": ("Export Prices", "%, MoM", "Export prices MoM % change.", "Released ~mid-month. Early read on global demand for US goods. Exports prices YoY ≈ goods exports inflation.", ["aUSCEXIPF"]),
        "aUSIMPP": ("Import Prices", "Index", "Import prices, all commodities.", "Direct inflation pass-through to consumer prices. Crude oil moves are the dominant driver historically.", ["aUSIMPPXPT", "aUSEXPP"]),
        "aUSIMPPXPT": ("Import Prices", "Index", "Import prices excluding petroleum — strips out the biggest source of volatility.", "Cleaner core-import-inflation measure. Pair with USD trade-weighted to identify FX vs underlying global price drivers.", ["aUSIMPP"]),
        "aUSIMPAR": ("Import Prices", "%, MoM", "Import prices MoM % change.", "Released alongside export prices. Direct CPI input — feeds goods inflation 1-2 months out.", ["aUSCIMIPF"]),
        "aUSCEXIPF": ("Export Prices", "%, QoQ", "Standardized export prices QoQ % change.", "Quarterly aggregation of monthly. Use for cross-country comparison via OECD framework.", ["aUSEXPAR", "aUSCEXIYF"]),
        "aUSCEXIYF": ("Export Prices", "%, YoY", "Standardized export prices YoY %.", "Trend signal. High export-price inflation = pricing power.", ["aUSCEXIPF", "aUSCEXIF/C"]),
        "aUSCEXIF/C": ("Export Prices", "Index", "Standardized export price level.", "Use changes; level is for benchmarking only.", ["aUSCEXIPF", "aUSCEXIYF"]),
        "aUSCIMIPF": ("Import Prices", "%, QoQ", "Standardized import prices QoQ % change.", "Quarterly version. Pairs with export QoQ for terms-of-trade.", ["aUSIMPAR", "aUSCIMIYF"]),
        "aUSCIMIYF": ("Import Prices", "%, YoY", "Standardized import prices YoY %.", "Pass-through to CPI is highest in goods categories; services CPI mostly domestic.", ["aUSCIMIPF", "aUSCIMIF/C"]),
        "aUSCIMIF/C": ("Import Prices", "Index", "Standardized import price level.", "For cross-country comparison.", ["aUSCIMIPF", "aUSCIMIYF"]),
        "aUSCTRMPF": ("Terms of Trade", "%, QoQ", "Terms-of-trade QoQ change — export prices / import prices.", "Improving (rising) ToT = country gets more imports per unit of exports = real income transfer in.", ["aUSCTRMYF", "aUSCTRMF/C"]),
        "aUSCTRMYF": ("Terms of Trade", "%, YoY", "Terms-of-trade YoY change.", "Big oil price moves swing ToT for net importers/exporters. US flipped to net energy exporter, so oil shocks now help ToT.", ["aUSCTRMPF", "aUSCTRMF/C"]),
        "aUSCTRMF/C": ("Terms of Trade", "Index", "Terms-of-trade level, standardized.", "Use changes; level matters for cross-country comparison.", ["aUSCTRMPF", "aUSCTRMYF"]),
        "aUSTOTPRCF/C": ("Terms of Trade", "Index (1975=100)", "Terms-of-trade rebased to 1975=100.", "Long history version. Useful for showing decade-scale ToT trends.", ["aUSCTRMF/C"]),
        "aUSGBALBA": ("Trade Balance", "USD millions", "Advance Goods Trade Balance — preliminary monthly goods-only deficit.", "Released ~3 days before the full BEA trade report. Goods-only (services excluded). Big surprises move the dollar at release.", []),
    },

    "us_interest_rates": {
        "aUSFEDAW": ("Policy Rate", "%", "Fed Funds Effective Rate — weekly average. Sister of aUSFEDFUND with weekly granularity.", "Use the daily effective rate for trading; this for averaged trend.", ["aUSFEDFUND", "aUSFEDFUNDT"]),
        "aUSDISWPCRM": ("Discount Window", "%", "Discount Window primary credit rate — monthly. Set 0.50pp above the upper bound of fed funds target.", "Stigma rate banks pay for short-term Fed liquidity. Heavily used during March 2023 banking stress; otherwise minimal.", ["aUSDISWPCR"]),
        "aUSIORAR": ("Reserve Rates", "%", "Interest on Reserve Balances (formerly IOER, now IORB) — what the Fed pays banks on reserves.", "Floor of the fed funds corridor. Banks won't lend below this in fed funds market. Increased to ~4.4% as fed funds target rose.", ["aUSFEDFUND", "aUSRRPAR"]),
        "aUSDISWPCR": ("Discount Window", "%", "Discount Window primary credit rate — quarterly average.", "Same series as aUSDISWPCRM, less granular.", ["aUSDISWPCRM"]),
        "aUSDISWSACR": ("Discount Window", "%", "Discount Window seasonal credit rate — for small agricultural / resort banks.", "Niche; not a market-moving series.", ["aUSDISWPCRM"]),
        "aUSDISWSCCR": ("Discount Window", "%", "Discount Window secondary credit rate — for less-sound banks. 0.50pp above primary.", "Higher-stigma rate. Use is rare and typically signals stress at the borrower.", ["aUSDISWPCR"]),
        "aUSFEDFUNDT": ("Policy Rate", "%", "Fed Funds Target Rate — daily — the policy-set range (now midpoint).", "What FOMC sets. The effective rate (aUSFEDFUND) trades within or near this range. Watch the upper bound for IOER decisions.", ["aUSFEDFUND", "aUSFEDFUNDP"]),
        "aUSRRPAR": ("Reserve Rates", "%", "Fed Overnight Reverse Repo Rate (ON RRP) — sister to IORB on the lower side of the corridor.", "Floor for non-bank money funds (banks have IORB). RRP usage drops as Fed shrinks balance sheet via QT.", ["aUSIORAR"]),
        "aUSMBK": ("Bank Lending Rates", "%", "Prime rate at major banks — daily.", "Anchored at fed funds target + 3.0pp historically. Not market-determined; admin-set by banks.", ["aUSPRIME", "aUSMBKAVG"]),
        "aUSMBKAVG": ("Bank Lending Rates", "%", "Prime rate at major banks — monthly.", "Same series as aUSMBK, monthly granularity.", ["aUSMBK", "aUSPRIME"]),
        "aUSPRIME": ("Bank Lending Rates", "%", "Prime rate charged by banks — alternate series.", "Use whichever has cleaner data. All prime rate series move together.", ["aUSMBK", "aUSMBKAVG"]),
        "aUSMBAMLR": ("Mortgage Rates", "%", "30-year fixed mortgage contract rate — MBA weekly survey.", "Most-watched mortgage rate. Spread to 10Y Treasury (typically 150-200bp) widens during housing/MBS stress.", ["aUSMGAR"]),
        "aUSFEDFUNDP": ("Policy Rate", "%", "Fed Funds Target Rate — monthly average. LSEG-sourced.", "Use whichever (aUSFEDFUNDT vs aUSFEDFUNDP) has fresher data.", ["aUSFEDFUNDT", "aUSFEDFUND"]),
        "aUSFOMCA": ("Policy Rate", "%", "Fed Funds Target Rate — daily — Reuters series.", "Cross-check with aUSFEDFUNDT.", ["aUSFEDFUNDT"]),
        "aUSFFTRR": ("Policy Decisions", "%", "Fed Funds Target Rate — at FOMC announcement dates.", "Snapshot at each FOMC meeting (8/year). Useful for plotting policy rate trajectory by decision.", ["aUSFEDFUNDT"]),
        "aUSMGAR": ("Mortgage Rates", "%", "MBA 30-year mortgage rate — alternate series.", "Cross-check with aUSMBAMLR.", ["aUSMBAMLR"]),
    },

    "us_money_supply": {
        "aUSCMS0B/A": ("M0", "USD billions", "Money supply M0 (monetary base) — currency in circulation + bank reserves at Fed. Standardized.", "QE expanded the base 5x post-2008. Now shrinking via QT. Loose proxy for Fed balance sheet liquidity injection.", ["aUSCMS0PB/A", "aUSCMS0YB/A", "aUSMAAAAAA"]),
        "aUSCMS0PB/A": ("M0", "%, MoM", "Money supply M0 MoM % change.", "Volatile during balance-sheet operations. Less informative than YoY.", ["aUSCMS0B/A", "aUSCMS0YB/A"]),
        "aUSCMS0YB/A": ("M0", "%, YoY", "Money supply M0 YoY % change.", "Useful long-run liquidity-cycle gauge. Negative growth = active QT.", ["aUSCMS0B/A", "aUSCMS0PB/A"]),
        "aUSCMS1B/A": ("M1", "USD billions", "Money supply M1 — currency + checking deposits + traveler's checks. Standardized.", "Definition expanded in May 2020 to include savings deposits — the level jumped artificially. Use post-2020 series carefully.", ["aUSM1", "aUSCMS1PB/A", "aUSCMS1YB/A"]),
        "aUSCMS1PB/A": ("M1", "%, MoM", "M1 MoM % change.", "Volatile; use YoY for trend.", ["aUSCMS1B/A", "aUSCMS1YB/A"]),
        "aUSCMS1YB/A": ("M1", "%, YoY", "M1 YoY % change.", "Cross-check M1 vs M2 growth — divergence reveals whether liquidity is in transactional vs savings accounts.", ["aUSCMS1B/A", "aUSCMS2YB/A"]),
        "aUSCMS2PB/A": ("M2", "%, MoM", "M2 MoM % change, standardized.", "Use YoY for trend; MoM is noisy.", ["aUSCMS2YB/A", "aUSCMS2B/A"]),
        "aUSCMS2YB/A": ("M2", "%, YoY", "M2 YoY % change — single most-watched money supply growth rate.", "Historically loose proxy for inflation 12-18 months out (monetarist view). Surged to 27% in 2021 post-stimulus, contracted in 2023.", ["aUSCMS2B/A", "aUSCMS2PB/A"]),
        "aUSCMS2B/A": ("M2", "USD billions", "Money supply M2 level, standardized — M1 + small time deposits + retail money funds.", "Broadest practical money supply measure (since M3 was discontinued in 2006). Watch nominal growth rate vs nominal GDP growth.", ["aUSCMS2YB/A", "aUSM2"]),
        "aUSRESERVB/A": ("Bank Reserves", "USD billions", "Adjusted reserves — bank reserves at the Fed, adjusted for changes in reserve requirements.", "Matters for the federal funds market. Reserves abundance reduces fed funds market activity (since 2008).", ["aUSMAAAAAA"]),
        "aUSADMBAS.1D/A": ("Monetary Base", "USD billions", "Adjusted monetary base — M0 with reserve-requirement adjustments.", "Less commonly cited than M0 directly.", ["aUSCMS0B/A"]),
        "aUSMEMSVE/A": ("Velocity", "Ratio", "Velocity of M2 — nominal GDP / M2. How many times each dollar circulates per year.", "Crashed in 2020 (M2 surged faster than GDP) and is gradually recovering. Long-run decline = financialization + savings preference.", ["aUSCMS2B/A"]),
        "aUSGOCBN": ("Treasury Cash", "USD billions", "H.6 — US government deposits, Treasury General Account (TGA) at Fed.", "TGA is a major liquidity siphon. When Treasury rebuilds TGA after a debt-ceiling deal, bank reserves drain — funding stress risk.", []),
        "aUSMAAAAAA": ("Monetary Base", "USD billions", "H.3 monetary base — currency + reserves.", "Cross-check with aUSCMS0B/A.", ["aUSCMS0B/A"]),
        "aUSMZMSTK/A": ("Money Aggregates", "USD billions", "MZM (Money of Zero Maturity) money stock — discontinued in 2021 by the Fed.", "Historical interest only — was M2 minus small time deposits + institutional money funds.", ["aUSCMS2B/A"]),
        "aUSM1/A": ("M1", "USD billions", "M1 money supply — alternate series.", "Cross-check with aUSCMS1B/A.", ["aUSCMS1B/A", "aUSM1"]),
        "aUSM1": ("M1", "USD billions", "M1 money supply.", "See aUSCMS1B/A for usage notes — same series.", ["aUSCMS1B/A", "aUSM1/A"]),
        "aUSM1W/A": ("M1", "USD billions", "M1 weekly — alternate series.", "Higher-frequency M1.", ["aUSM1W"]),
        "aUSM1W": ("M1", "USD billions", "M1 weekly money supply.", "Most granular M1 read; volatile around month-ends.", ["aUSM1W/A", "aUSM1"]),
        "aUSM2/A": ("M2", "USD billions", "M2 money supply — alternate series.", "Cross-check with aUSCMS2B/A.", ["aUSCMS2B/A", "aUSM2"]),
        "aUSM2": ("M2", "USD billions", "M2 money supply.", "See aUSCMS2B/A — same series.", ["aUSCMS2B/A", "aUSM2/A"]),
        "aUSM2W/A": ("M2", "USD billions", "M2 weekly — alternate series.", "Higher-frequency M2.", ["aUSM2W"]),
        "aUSM2W": ("M2", "USD billions", "M2 weekly money supply.", "Most granular M2 read.", ["aUSM2W/A", "aUSM2"]),
    },

    "us_productivity_labor_costs": {
        "aUSHCNFARM/A": ("Compensation", "Index", "Hourly compensation, nonfarm business sector. Includes wages + benefits.", "Pair with productivity to compute unit labor costs (= compensation / productivity). Rising hourly comp without productivity gains = inflationary.", ["aUSEHRRHCNF/A", "aUSULCNF/A"]),
        "aUSEHRRHCNF/A": ("Compensation", "Index", "REAL hourly compensation, nonfarm business — inflation-adjusted.", "True purchasing-power gauge. Stagnant for decades; recent surge largely deflation rather than nominal growth.", ["aUSHCNFARM/A"]),
        "aUSEMPBQA": ("Labor Costs", "%, QoQ", "Employment benefits cost change QoQ.", "Benefits inflation (mostly health insurance, retirement) is stickier than wages.", ["aUSEMPCIW/A", "aUSEMPWAQ"]),
        "aUSEMPWAQ": ("Labor Costs", "%, QoQ", "Employment wages QoQ change.", "Cleaner wage signal than aggregate compensation. Pair with ECI total.", ["aUSEMPCAR", "aUSECWNS/A"]),
        "aUSEMPCIW/A": ("ECI", "Index", "Employment Cost Index, benefit costs component.", "Health insurance + retirement contributions. Not as sticky as wage component but harder to reduce.", ["aUSEMPCI/A", "aUSEMPBQA"]),
        "aUSEMPCI/A": ("ECI", "Index", "Employment Cost Index, total compensation — wages + benefits.", "Fed's preferred wage gauge: includes benefits, controls for industry/occupation mix. Quarterly. >4% YoY is too high for 2% inflation target.", ["aUSEMPCAR", "aUSEMPCIW/A", "aUSECWNS/A"]),
        "aUSEMPCAR": ("ECI", "%, QoQ", "ECI total compensation QoQ change.", "Most market-relevant ECI series. Released on Fed black-out weeks; cleanest wage signal.", ["aUSEMPCI/A"]),
        "aUSEMPCIP/A": ("ECI", "Index", "ECI private industry, service-providing.", "Services-only wage cost — relevant for services CPI/PCE.", ["aUSEMPCI/A", "aUSEMPCIB/A"]),
        "aUSECWNS/A": ("ECI", "Index", "ECI wages and salaries — strips out benefits.", "Pure wage gauge. AHE (in employment_hours) is monthly/noisier; ECI is quarterly/cleaner.", ["aUSEMPCI/A", "aUSEMPCIB/A"]),
        "aUSEMPCIB/A": ("ECI", "Index", "ECI wages and salaries, private industry.", "Strip out government wages (which lag and are policy-driven).", ["aUSECWNS/A"]),
        "aUSLCPAPG": ("Labor Costs", "Index", "Total labor costs — preliminary release.", "Watch the revisions; preliminary often gets revised meaningfully.", ["aUSULC/A"]),
        "aUSULC/A": ("Unit Labor Costs", "Index", "Unit Labor Costs, business sector. ULC = compensation / productivity.", "Most useful labor-cost-driven inflation signal. ULC growth > productivity growth = wage-push inflation. Watch the 4-quarter change.", ["aUSLCOSTE/CA", "aUSULCNF/A"]),
        "aUSLCOSTE/CA": ("Unit Labor Costs", "Index", "Unit labor costs, business — alternate index series.", "Cross-check with aUSULC/A.", ["aUSULC/A"]),
        "aUSLCRAPG": ("Unit Labor Costs", "Index", "Unit labor costs, nonfarm business — preliminary.", "Watch revisions.", ["aUSULCNF/A"]),
        "aUSULCNF/A": ("Unit Labor Costs", "Index", "Unit Labor Costs, nonfarm business.", "Cleanest ULC measure (nonfarm strips out volatile farm sector). The Fed inflation hawks watch this directly.", ["aUSULC/A", "aUSLCRAPG"]),
        "aUSULCNBSE/CA": ("Unit Labor Costs", "Index", "Unit labor costs, nonfarm business — alternate index.", "Cross-check.", ["aUSULCNF/A"]),
        "aUSPRODNFRM/A": ("Productivity", "Index", "Hours of all persons, nonfarm business — total hours worked.", "Denominator for productivity. Pair with output for productivity computation.", ["aUSOUTNF/A", "aUSPRODPH/A"]),
        "aUSPHOPBUS/A": ("Productivity", "Index", "Output per hour, business sector — productivity.", "Headline productivity gauge. Trend ~1.5%/yr; 2010s averaged below trend; AI may lift trend forward.", ["aUSPRODPH/A", "aUSPRODVTQ/CA"]),
        "aUSPRODPH/A": ("Productivity", "Index", "Output per hour of all persons, business — volume index.", "Same concept as aUSPHOPBUS/A.", ["aUSPHOPBUS/A"]),
        "aUSPRODVTQ/CA": ("Productivity", "Index", "Productivity, business — index.", "Cross-check with other productivity series.", ["aUSPHOPBUS/A"]),
        "aUSPHOPMFG/A": ("Productivity", "Index", "Output per hour, manufacturing.", "Manufacturing productivity has historically grown faster than services. Slowed materially since 2010.", ["aUSPRODPH/A"]),
        "aUSPRORAPG": ("Productivity", "Index", "Output per hour, nonfarm business — preliminary.", "Watch the revisions.", ["aUSOUTNF/A"]),
        "aUSOUTNF/A": ("Productivity", "Index", "Output per hour, nonfarm business.", "Strips out volatile farm sector. Fed's preferred productivity gauge.", ["aUSPRORAPG", "aUSULCNF/A"]),
        "aUSBUPRNF/A": ("Productivity", "Index", "Output, nonfarm business — total output.", "Numerator for nonfarm productivity. Output growth ≈ productivity growth + hours growth.", ["aUSOUTNF/A"]),
        "aUSPROPAPG": ("Productivity", "Index", "Total productivity — preliminary.", "Watch revisions.", ["aUSPHOPBUS/A"]),
        "aUSNFPRAR": ("Misc", "", "Series mislabeled in source as 'foreign exchange reserves' — actually nonfarm productivity/labor costs related.", "Cross-section / drill-down series; verify source before using.", []),
        "aUSLCTSAR": ("Misc", "", "Series mislabeled in source as 'foreign exchange reserves' — actually labor costs related.", "Cross-section / drill-down series; verify source before using.", []),
    },

    "us_government_accounts": {
        "aUSGDEFAA": ("Federal Budget", "USD millions", "Federal Budget — monthly Treasury statement.", "Monthly fiscal pulse. Volatile by month due to tax timing; smooth via 12-month rolling sum.", ["aUSGDEF", "aUSGBPGDP"]),
        "aUSGDEF": ("Federal Budget", "USD millions", "Federal Government total surplus/deficit.", "Headline fiscal balance. Currently ~$1.8T deficit (~6% of GDP) — unprecedented for non-recession peacetime.", ["aUSGDEFAA", "aUSGBPGDP", "aUSCGOVA"]),
        "aUSXGBJUSA": ("Outlays by Function", "USD millions", "Federal outlays — administration of justice (DOJ, judicial, federal prisons).", "~2% of total outlays.", ["aUSFOUTL"]),
        "aUSXGBAGA": ("Outlays by Function", "USD millions", "Federal outlays — agriculture (farm subsidies, USDA).", "Highly variable: farm bill cycle and price-support programs swing the line item.", ["aUSFOUTL"]),
        "aUSXGBCHCA": ("Outlays by Function", "USD millions", "Federal outlays — commerce and housing credit.", "Includes Fannie/Freddie support, SBA. Surged in COVID (PPP loans).", ["aUSFOUTL"]),
        "aUSXGBDEVA": ("Outlays by Function", "USD millions", "Federal outlays — community and regional development.", "HUD, FEMA disaster relief. Spikes in disaster years.", ["aUSFOUTL"]),
        "aUSXGBETSA": ("Outlays by Function", "USD millions", "Federal outlays — education, training, employment & social services.", "Department of Education + DOL. Student-loan-related outlays move this materially.", ["aUSFOUTL"]),
        "aUSXGBEGYA": ("Outlays by Function", "USD millions", "Federal outlays — energy (DOE).", "~1% of outlays. Includes nuclear weapons stewardship via NNSA.", ["aUSFOUTL"]),
        "aUSXGBGENA": ("Outlays by Function", "USD millions", "Federal outlays — general government (admin overhead).", "Small line item; relatively stable.", ["aUSFOUTL"]),
        "aUSXGBSCIA": ("Outlays by Function", "USD millions", "Federal outlays — general science, space and technology (NASA, NSF).", "~1% of outlays. Tracks federal R&D priorities.", ["aUSFOUTL"]),
        "aUSXGBHLTA": ("Outlays by Function", "USD millions", "Federal outlays — health (NIH, CDC, VA medical, ACA subsidies).", "Excludes Medicare. Growing share of budget.", ["aUSFOUTL", "aUSXGBMEDA"]),
        "aUSXGBINCA": ("Outlays by Function", "USD millions", "Federal outlays — income security (unemployment, SNAP, housing assistance).", "Counter-cyclical: spikes in recessions. The COVID UI surge dominated 2020-21.", ["aUSFOUTL"]),
        "aUSXGBINTA": ("Outlays by Function", "USD millions", "Federal outlays — interest on debt.", "Fastest-growing major line item as rates rose. Now exceeds defense spending. Sustainability risk if rates stay elevated.", ["aUSFOUTL", "aUSXGBDEFA"]),
        "aUSXGBDIPA": ("Outlays by Function", "USD millions", "Federal outlays — international affairs (State Dept, foreign aid).", "<1% of outlays despite political attention.", ["aUSFOUTL"]),
        "aUSXGBMEDA": ("Outlays by Function", "USD millions", "Federal outlays — Medicare.", "Largest single program after Social Security. Growing 5-7%/yr from demographics + healthcare inflation.", ["aUSFOUTL", "aUSXGBSOCA"]),
        "aUSXGBDEFA": ("Outlays by Function", "USD millions", "Federal outlays — national defense (DOD, atomic energy defense activities).", "~13% of outlays. Now smaller than net interest. NATO 2% commitment binds upward.", ["aUSFOUTL", "aUSXGBINTA"]),
        "aUSXGBNATA": ("Outlays by Function", "USD millions", "Federal outlays — natural resources and environment (Interior, EPA).", "~1% of outlays.", ["aUSFOUTL"]),
        "aUSXGBSOCA": ("Outlays by Function", "USD millions", "Federal outlays — Social Security.", "Largest single program. Demographic locomotive: ~6%/yr growth on autopilot. Trust fund depletion projected ~2034 absent reform.", ["aUSFOUTL", "aUSXGBMEDA"]),
        "aUSFOUTL": ("Federal Outlays", "USD millions", "Total federal outlays — all spending.", "Sum of all functional categories. Currently ~$6.5T/yr (~24% of GDP).", ["aUSFEDREC", "aUSGDEF"]),
        "aUSXGBTRNA": ("Outlays by Function", "USD millions", "Federal outlays — transportation (DOT, FAA, highway trust fund).", "Infrastructure spending tracked here. IIJA boost showing through.", ["aUSFOUTL"]),
        "aUSXGBOFFA": ("Outlays by Function", "USD millions", "Undistributed offsetting receipts — negative line (mineral leases, employer share of pension contributions).", "Treated as negative outlay in budget accounting. Don't include in 'spending share' analysis.", ["aUSFOUTL"]),
        "aUSFEDREC": ("Federal Receipts", "USD millions", "Total federal receipts — taxes + customs + fees.", "~$5T/yr. ~50% individual income tax, ~35% payroll tax, ~10% corporate, ~5% other. Receipt-to-GDP ~17-18%.", ["aUSFOUTL", "aUSGDEF"]),
        "aUSOGBDOVA": ("Outlays by Function", "USD millions", "Federal outlays — veterans benefits.", "Growing line as post-9/11 cohort ages and benefits expand (PACT Act).", ["aUSFOUTL"]),
        "aUSCGOVA": ("Central Govt Balance", "USD millions", "Central government deficit/surplus, standardized.", "Cross-country comparable framing of US fiscal balance.", ["aUSGDEF", "aUSCGOVPA", "aUSCGOVYA"]),
        "aUSCGOVPA": ("Central Govt Balance", "USD millions", "Central government balance MoM absolute change.", "Use YoY for trend.", ["aUSCGOVA", "aUSCGOVYA"]),
        "aUSCGOVYA": ("Central Govt Balance", "USD millions", "Central government balance YoY absolute change.", "Cleaner trend; strips monthly tax-timing noise.", ["aUSCGOVA", "aUSCGOVPA"]),
        "aUSFYONET": ("Federal Outlays", "USD millions", "Federal net outlays — annual.", "Annual aggregation. Use aUSFOUTL for monthly granularity.", ["aUSFOUTL"]),
        "aUSFYFRCT": ("Federal Receipts", "USD millions", "Federal receipts — annual.", "Annual aggregation.", ["aUSFEDREC"]),
        "aUSGBPGDP": ("Federal Budget", "% of GDP", "Federal surplus/deficit as % of GDP.", "The clean fiscal-stance gauge. >5% deficit in expansion is unprecedented; signals limited fiscal room for the next recession.", ["aUSGDEF"]),
    },

    "us_banking": {
        "aUSBNKQPTP": ("Bankruptcies", "Filings", "Business bankruptcy filings, 3-month rolling. From AOUSC.", "Trailing indicator. Spikes during recessions. Watch alongside delinquency rates and tightening lending standards.", ["aUSBNQNP", "aUSBNRQP"]),
        "aUSBNQNP": ("Bankruptcies", "Filings", "Non-business (consumer) bankruptcy filings, 3-month rolling.", "Rises with consumer debt distress. Healthcare costs and divorce historically the dominant drivers.", ["aUSBNKQPTP", "aUSBNRQP"]),
        "aUSBNRQP": ("Bankruptcies", "Filings", "Total bankruptcy filings, 3-month rolling.", "Sum of business + non-business.", ["aUSBNKQPTP", "aUSBNQNP"]),
        "aUSCBAITX": ("Bank P&L", "USD thousands", "Commercial banks, applicable income taxes paid.", "FDIC Call Report data. Annual.", ["aUSCBNINC", "aUSCBPTNO"]),
        "aUSCBININ": ("Bank P&L", "USD thousands", "Commercial banks, total interest income.", "Surged 2022-23 with rate hikes. Watch alongside interest expense for NIM trend.", ["aUSCBINXP", "aUSCBNIIN"]),
        "aUSCBINXP": ("Bank P&L", "USD thousands", "Commercial banks, total interest expense.", "Lagged the rate cycle (deposit betas). Compresses NIM when finally repricing.", ["aUSCBININ", "aUSCBNIIN"]),
        "aUSCBNINC": ("Bank P&L", "USD thousands", "Commercial banks, net income (after tax).", "Aggregate banking system bottom line. Highly cyclical; watch ROE/ROA for normalized health.", ["aUSCBPTNO", "aUSCBNIIN"]),
        "aUSCBNIIN": ("Bank P&L", "USD thousands", "Commercial banks, net interest income.", "Core banking earnings = interest income − interest expense. The biggest swing factor in bank profitability.", ["aUSCBININ", "aUSCBINXP"]),
        "aUSCBNIEX": ("Bank P&L", "USD thousands", "Commercial banks, non-interest expense (compensation, occupancy, tech, etc).", "Efficiency ratio (non-int exp / revenue) is a key metric. ~55-60% is healthy for large banks.", ["aUSCBNIIC"]),
        "aUSCBNIIC": ("Bank P&L", "USD thousands", "Commercial banks, non-interest income (fees, trading, mortgage banking, advisory).", "More volatile than NII. Helps diversify earnings; surged with capital markets activity.", ["aUSCBNIEX", "aUSCBNIIN"]),
        "aUSCBNINS": ("Bank Sector", "Number", "Commercial banks, number of institutions.", "Long-term decline (4,500+ in 2010 to ~4,000 today) from M&A and failures. Concentration is rising.", ["aUSCBNINC"]),
        "aUSCBPTNO": ("Bank P&L", "USD thousands", "Commercial banks, pre-tax net operating income.", "Strips out tax effects. Cleaner operating-performance read than after-tax net income.", ["aUSCBNINC"]),
        "aUSCBPLLL": ("Credit Quality", "USD thousands", "Commercial banks, provision for loan and lease losses.", "Counter-cyclical: rises sharply going into recessions. CECL accounting now front-loads provisions.", ["aUSBCAOLLB/A"]),
        "aUSCBSGLO": ("Bank P&L", "USD thousands", "Commercial banks, securities gains/losses.", "Realized gains/losses on bond holdings. Big losses in 2022 from rising rates (HTM avoided realization).", ["aUSCBNINC"]),
        "aUSBCACIB/A": ("Bank Lending", "USD millions", "C&I (commercial and industrial) loans outstanding at commercial banks.", "Business credit cycle gauge. Slows ahead of recessions; tightening standards lead by 1-2 quarters.", ["aUSBCALCB", "aUSBCAOLLB/A", "aUSBCAREB/A"]),
        "aUSBCALCB": ("Bank Lending", "USD millions", "Consumer loans outstanding (credit card, auto, student).", "Consumer credit cycle. Watch credit-card delinquencies for stress signal.", ["aUSBCACIB/A", "aUSBCAREB/A"]),
        "aUSBCAOLLB/A": ("Bank Lending", "USD millions", "Other loans and leases outstanding.", "Catch-all (CRE non-residential, agricultural, etc).", ["aUSBCACIB/A", "aUSBCALCB"]),
        "aUSBCAREB/A": ("Bank Lending", "USD millions", "Real estate loans outstanding (residential + CRE).", "Largest single bank loan category. CRE stress concentrated in regional banks. Watch SLOOS for tightening standards.", ["aUSBCALCB", "aUSBCACIB/A"]),
        "aUSZQDIBP": ("Islamic Finance", "Index/Score", "IFDI Financial Performance, Islamic Banking, Full-Fledged Banks (US data).", "Niche — Islamic Finance Development Indicator. US has few full-fledged Islamic banks; data is thin.", ["aUSZBDIBP", "aUSZPDIBR"]),
        "aUSZPDIBR": ("Islamic Finance", "%", "IFDI Return on Assets, Islamic Banking.", "Cross-country comparable Islamic banking metric. US presence is small.", ["aUSZQDIBP"]),
        "aUSZPDIBP": ("Islamic Finance", "Index", "IFDI Islamic Banking windows (conventional banks with Islamic products).", "Niche.", []),
        "aUSZPDTKR": ("Islamic Finance", "%", "IFDI Return on Assets, Takaful & Retakaful (Islamic insurance).", "Niche US data.", []),
        "aUSZQDIBA": ("Islamic Finance", "USD millions", "IFDI Islamic Banking assets, US.", "Tiny in absolute terms.", []),
        "aUSZBDIBP": ("Islamic Finance", "Index", "IFDI publicly listed Islamic Banks, US.", "Niche.", []),
        "aUSZQDTKA": ("Islamic Finance", "USD millions", "IFDI Takaful & Retakaful assets.", "Niche.", []),
        "aUSZQDTKP": ("Islamic Finance", "Number", "IFDI Takaful & Retakaful operators count.", "Niche.", []),
        "aUSZBVRER": ("Islamic Finance", "Index", "IFDI Governance & Regulations score for Islamic finance institutions.", "Composite governance score.", []),
        "aUSZPVRER": ("Islamic Finance", "Index", "IFDI Governance: Islamic Banking regulations.", "Niche.", []),
        "aUSZUVRER": ("Islamic Finance", "Index", "IFDI Shariah Governance score.", "Niche.", []),
        "aUSZZVRER": ("Islamic Finance", "Index", "IFDI Sukuk regulations score.", "Niche.", []),
        "aUSZWVRER": ("Islamic Finance", "Index", "IFDI Takaful regulations score.", "Niche.", []),
        "aUSSECTRNA": ("Treasury", "USD millions", "Federal debt outstanding — Treasury notes (note: filed under Banking by source).", "Should logically live in government_debt_borrowing. Cross-check with aUSSECMKNA.", ["aUSSECMKNA"]),
    },

    # ----------------------------------------------------------------
    # Wave 3a — medium categories (33-49 RICs)
    # ----------------------------------------------------------------
    "us_financial_flow_of_funds_accounts": {
        "aUS66OLLBA": ("Credit Aggregates", "USD millions", "Brokers & dealers, loans to nonfinancial corporate business. Quarterly Z.1.", "Margin/securities-financing channel of corporate debt. Surges in crises (e.g., 2008 hedge fund deleveraging).", []),
        "aUS73PCDLA": ("Credit Aggregates", "USD millions", "Commercial banks holding of direct commercial paper.", "Bank participation in CP market. Watch as a money-market liquidity gauge.", []),
        "aUS16IENN": ("Household Sector", "USD billions", "Equipment holdings, NPISH (non-profits serving households).", "Niche line; small fraction of NPISH balance sheet.", []),
        "aUS31FGDSB/A": ("Federal Debt", "USD millions", "Federal government debt securities, liability — Z.1 flows.", "Quarterly issuance flow. Cross-check against Treasury auction data.", ["aUS31FGDSA"]),
        "aUS31FGDSA": ("Federal Debt", "USD millions", "Federal government debt securities outstanding (alternate series).", "Stock vs flow paired with aUS31FGDSB/A.", ["aUS31FGDSB/A"]),
        "aUS31HCFLB/A": ("Federal Debt", "USD millions", "Federal retiree healthcare fund, change at annual rate.", "Niche. Small flow line.", ["aUS31HCFLA"]),
        "aUS31HCFLA": ("Federal Debt", "USD millions", "Federal retiree healthcare fund balance.", "Stock counterpart.", ["aUS31HCFLB/A"]),
        "aUSFFLNPO": ("Household Wealth", "USD billions", "Household and NPO net worth — total household wealth (Z.1 B.101).", "The headline 'household wealth' number. Crashed 2008, hit ~$160T+ in 2024. Wealth-effect driver for consumption.", ["aUSDEBTDF/A"]),
        "aUSDEBTDF/A": ("Credit Aggregates", "USD millions", "Domestic financial sectors debt outstanding (Z.1).", "Total leverage in financial intermediaries. Plateaued post-2008 as banks deleveraged; nonbank finance grew.", []),
        "aUS31CM1DB/A": ("Credit Aggregates", "USD millions", "Federal government nonfinancial debt outstanding (Z.1).", "Component of total domestic nonfinancial debt — federal share.", ["aUSDEBTDN/A"]),
        "aUS14CM3DB/A": ("Credit Aggregates", "USD millions", "Domestic nonfinancial business debt total (Z.1).", "Sum of corporate + noncorporate. Watch debt/GDP for leverage cycle.", ["aUS10CM3DB/A"]),
        "aUS10CM3DB/A": ("Credit Aggregates", "USD millions", "Corporate business debt outstanding (Z.1).", "Corporate leverage gauge. Includes loans + bonds. Hit 50%+ of GDP — historically high.", ["aUS14CM3DB/A"]),
        "aUS15CM1DB/A": ("Credit Aggregates", "USD millions", "Household debt total (Z.1).", "Mortgage + consumer credit + auto + student. ~$20T total. Debt service ratio is lower than 2008 peak.", ["aUS15CCTDB/A", "aUS15MGHDB/A"]),
        "aUS15CCTDB/A": ("Credit Aggregates", "USD millions", "Household consumer credit (revolving + non-revolving auto/student).", "Front-end delinquencies elevated; flagging stress in subprime credit card / auto.", ["aUS15CM1DB/A"]),
        "aUS15MGHDB/A": ("Credit Aggregates", "USD millions", "Household home mortgages.", "Largest household debt category. Delinquencies low but housing market frozen at high mortgage rates.", ["aUS15CM1DB/A"]),
        "aUS21CM1DB/A": ("Credit Aggregates", "USD millions", "State and local government debt outstanding (Z.1).", "Munis. ~$3T total. Watch general obligation vs revenue bond mix.", []),
        "aUSDEBTDN/A": ("Credit Aggregates", "USD millions", "Total domestic nonfinancial debt (Z.1) — government + business + household.", "Master leverage gauge. >300% of GDP currently. The denominator (GDP) growth determines sustainability.", ["aUS31CM1DB/A", "aUS14CM3DB/A", "aUS15CM1DB/A"]),
        "aUSDEBTF/A": ("Credit Aggregates", "USD millions", "Foreign debt outstanding in US (Z.1) — foreign borrowing in US markets.", "Niche line; small share of total credit market.", []),
        "aUSXZLFFRA": ("Money Markets", "%", "Effective fed funds rate within FoF Federal funds and security repo aggregates.", "Component reference for Z.1 calculations.", ["aUSFEDFUND"]),
        "aUSLGCMBAA": ("Credit Aggregates", "USD millions", "Domestic Nonfinancial Sector — credit market debt, private domestic.", "Private credit excludes federal. Cleaner cycle gauge than total.", ["aUSDEBTDN/A"]),
        "aUS19MGHLA": ("Credit Aggregates", "USD millions", "Home mortgages, private domestic nonfinancial (excl state and local).", "Drilldown of household mortgage debt.", ["aUS15MGHDB/A"]),
        "aUS15OLLHA": ("Credit Aggregates", "USD millions", "Household sector loans to nonfinancial corporate business.", "Niche; tracks direct lending channel.", []),
        "aUS11RESTA": ("Business Sector", "USD millions", "Nonfinancial noncorporate business — real estate assets.", "CRE held outside corporate structures (sole prop, partnerships).", []),
        "aUS11CHNIA": ("Business Sector", "USD millions", "Nonfinancial noncorporate business, net increase in liabilities.", "Smaller-business borrowing flow.", ["aUS11CHNLA"]),
        "aUS11CHNLA": ("Business Sector", "USD millions", "Nonfinancial noncorporate business, net lending position.", "Net financial position of small/private businesses.", ["aUS11CHNIA"]),
        "aUS54PCCLA": ("Insurance", "USD millions", "Policy and contract claims, life insurance.", "Liability side of life insurer balance sheets.", ["aUS54PCCLB/A"]),
        "aUS54PCCLB/A": ("Insurance", "USD millions", "Policy and contract claims, life insurance, change at annual rate.", "Annualized flow.", ["aUS54PCCLA"]),
        "aUS10XXAA": ("Aggregates", "USD billions", "Total assets — economy-wide.", "Master Z.1 aggregate. Use for sectoral share analysis.", []),
        "aUS14SGTAA": ("Treasury Holdings", "USD millions", "Treasury securities held by nonfinancial business.", "Corporate Treasury holdings — cash management. Surged with corporate cash piles post-2010.", []),
        "aUSNCIOAA": ("TIC Flows", "USD millions", "Foreign net Treasury international capital flows — actual.", "TIC data: foreign demand for US debt. Big swings move long-end yields.", ["aUSNCISAA", "aUSFBTAA"]),
        "aUSNCISAA": ("TIC Flows", "USD millions", "Net long-term flows including swaps.", "Cleaner foreign demand signal stripping out short-term flows.", ["aUSNCIOAA"]),
        "aUSNCIAA": ("TIC Flows", "USD millions", "Net purchases (net long-term capital inflows), total.", "Headline TIC flow. Moves from policy regime shifts (e.g., China reducing UST holdings).", ["aUSFBTAA"]),
        "aUSFBTAA": ("TIC Flows", "USD millions", "Net foreign purchases of US Treasury bonds and notes.", "Most-watched TIC line. Persistent net buying needed to fund deficit.", ["aUSNCIAA"]),
    },

    "us_cyclical_activity_indices": {
        "aUSCBBKCOR": ("BBK Indexes", "Index", "Brave-Butters-Kelley Coincident Index — current economic activity.", "Real-time GDP-tracking proxy. Companion to BBK Leading.", ["aUSCBBKLER", "aUSCBBKGPR"]),
        "aUSCBBKLER": ("BBK Indexes", "Index", "Brave-Butters-Kelley Leading Index.", "Forward-looking activity gauge. Negative readings precede recessions.", ["aUSCBBKCOR"]),
        "aUSCBBKGPR": ("BBK Indexes", "%, annualized", "BBK Monthly GDP Growth, annualized.", "Monthly nowcast of GDP growth. Compare to NY Fed's GDPNow and Atlanta Fed's GDPNow.", ["aUSCBBKCYR", "aUSCBBKTRR"]),
        "aUSCBBKCYR": ("BBK Indexes", "%", "BBK Monthly GDP Growth, cycle component.", "Strips out trend. Pure business-cycle signal.", ["aUSCBBKGPR"]),
        "aUSCBBKCGR": ("BBK Indexes", "%", "BBK GDP growth cycle, lagging component.", "Confirmatory rather than predictive.", ["aUSCBBKCYR"]),
        "aUSCBBKCLR": ("BBK Indexes", "%", "BBK GDP growth cycle, leading component.", "Forward-looking subset of the cycle decomposition.", ["aUSCBBKCYR"]),
        "aUSCBBKIRR": ("BBK Indexes", "%", "BBK GDP growth, irregular component.", "Random noise after trend + cycle removed.", ["aUSCBBKGPR"]),
        "aUSCBBKTRR": ("BBK Indexes", "%", "BBK GDP growth, trend component.", "Slow-moving trend. Useful for productivity/labor-supply growth read.", ["aUSCBBKGPR"]),
        "aUSCFNA": ("Activity Indexes", "Index", "Chicago Fed National Activity Index (CFNAI). Weighted average of 85 indicators.", "Above 0 = above trend; below -0.7 (3-mo avg) signals recession risk. Most-watched composite activity gauge.", ["aUSCFNAAR", "aUSNYWER"]),
        "aUSCFNAAR": ("Activity Indexes", "Index", "Chicago Fed National Activity Index — alternate.", "Cross-check.", ["aUSCFNA"]),
        "aUSNYWER": ("Activity Indexes", "%", "NY Fed Weekly Economic Index — weekly real GDP-equivalent growth.", "Highest-frequency real-economy gauge. Complements monthly indicators with weekly data.", ["aUSCFNA"]),
        "aUSKCFSIR": ("Financial Stress", "Index", "Kansas City Fed Financial Stress Index.", "Composite financial-conditions gauge. Spikes during 2008, March 2020, March 2023 (regional bank stress).", ["aUSSFSIR", "aUSSTLFR"]),
        "aUSKCLMCAR": ("Labor Activity", "Index", "Kansas City Fed Labor Market Conditions Indicator — Level of Activity.", "Composite labor read. Pair with NFP for full picture.", ["aUSKCLMCMR"]),
        "aUSKCLMCMR": ("Labor Activity", "Index", "Kansas City Fed LMCI Momentum.", "Forward-looking labor signal. Negative readings precede labor-market weakening.", ["aUSKCLMCAR"]),
        "aUSSFSIR": ("Financial Stress", "Index", "St. Louis Fed Financial Stress Index.", "Alternate financial-stress measure. Pairs with KC Fed FSI.", ["aUSKCFSIR", "aUSSTLFR"]),
        "aUSSTLFR": ("Financial Stress", "Index", "St. Louis Fed FSI — alternate series.", "Cross-check.", ["aUSSFSIR"]),
        "aUSSFSIR.1D": ("Financial Stress", "Index", "St. Louis Fed FSI — daily.", "Highest-frequency stress read.", ["aUSSFSIR"]),
        "aUSNPIRTR/C": ("Real Assets", "%, return", "NCREIF Timberland Index returns.", "Niche real-asset class. Low correlation to stocks/bonds; institutional allocator interest.", []),
        "aUSSPRPER": ("Equity Valuation", "Ratio", "S&P 500 Cyclically Adjusted P/E (Shiller CAPE / P/E10).", "Long-run valuation gauge: price / 10-yr inflation-adjusted earnings. >30 historically signals lower forward returns.", ["aUSSPCOM", "aUSSPDIVY"]),
        "aUSSPREPS": ("Equity Earnings", "USD", "S&P 500 12-month trailing as-reported EPS (top-down).", "Earnings denominator for P/E. Compare against operating EPS for accounting-quality drift.", ["aUSSPCOM"]),
        "aUSSPMDPS": ("Equity Dividends", "USD", "S&P 500 12-month cash dividends per share.", "Dividend payout history. Smoother than EPS through cycles.", ["aUSSPDIVY"]),
        "aUSSPDIVY": ("Equity Yield", "%", "S&P 500 dividend yield — index dividends / price.", "Low yields (sub-2%) reflect post-2010 buyback preference. Compare to 10Y Treasury for equity risk premium.", ["aUSSPMDPS", "aUSSPRPER"]),
        "aUSSPCOM": ("Equity Index", "Index", "S&P 500 Composite Index level.", "Headline US equity benchmark. Cap-weighted; ~7 megacaps drive much of recent return.", ["aUSSPRPER", "aUSSPDIVY"]),
        "aUSCOINDIF/A": ("Activity Indexes", "Index", "Coincident Index — composite of current activity.", "Conference Board CEI. Companion to LEI.", ["aUSLAG/A", "aUSCLEAD/A"]),
        "aUSCOMILNB/A": ("Credit Aggregates", "USD billions", "Commercial and industrial loans outstanding.", "Business-lending cycle gauge. Slows ahead of recessions; SLOOS tightening leads by 1-2 quarters.", ["aUSBCACIB/A"]),
        "aUSBCIISPI/C": ("Equity Index", "Index", "Index of stock prices, 500 common stocks — embedded in BCI.", "Component of leading economic indicators.", ["aUSSPCOM"]),
        "aUSEMPIQA": ("Labor Activity", "Index", "Employment Trends Index — Conference Board, actual.", "Labor-market composite. Companion to NFP/UR.", ["aUSEMPTR"]),
        "aUSEMPTR": ("Labor Activity", "Index", "Conference Board Employment Trends Index (ETI).", "Composite of 8 labor indicators. Leads NFP turning points.", ["aUSEMPIQA"]),
        "aUSLAG/A": ("Activity Indexes", "Index", "Conference Board Lagging Index.", "Confirmatory; not predictive.", ["aUSCOINDIF/A", "aUSCLEAD/A"]),
        "aUSBCILCI/A": ("Credit Aggregates", "Index", "Leading Credit Index — component of LEI.", "Credit-spread-based forward signal.", ["aUSCLEAD/A"]),
        "aUSCLEAD/A": ("Activity Indexes", "Index", "Conference Board Leading Economic Index (LEI).", "Composite of 10 leading indicators. Sustained 6-month declines historically signal recession with ~6-12mo lead.", ["aUSCOINDIF/A", "aUSLAG/A", "aUSLEADAR"]),
        "aUSLIDXIR10": ("Yield Curve", "Percentage points", "10Y Treasury minus fed funds rate — recession-warning yield-curve spread.", "Inverted curve (negative spread) has preceded every US recession since 1970. Watch slope dynamics, not just sign.", ["aUSFEDFUND"]),
        "aUSLI500CH/C": ("Equity Index", "Index", "Stock prices, 500 common stocks — LEI component.", "Embedded equity proxy in LEI.", ["aUSSPCOM"]),
        "aUSLEADAR": ("Activity Indexes", "%, MoM", "Leading index change MoM, actual.", "Most market-moving LEI series at release. -0.3% MoM consensus is the threshold for hawk/dove read.", ["aUSCLEAD/A"]),
        "aUSSTOPUKR/C": ("Foreign Equities", "Index", "UK stock prices — included for cross-country reference.", "Niche; reference series.", []),
    },

    "us_wages_earnings": {
        "aUSAHVEA": ("AHE", "%, YoY", "Average earnings YoY change, all employees.", "Headline wage inflation gauge from BLS. Pair with NFP — both come from establishment survey.", ["aUSEARNH/A", "aUSEAHNPVT/A"]),
        "aUSAVGEAR": ("AHE", "%, MoM", "Average earnings MoM actual change.", "Monthly wage-momentum read. >0.4% MoM hot, <0.2% cool.", ["aUSAHVEA"]),
        "aUSWRIMDA": ("Wages by Sector", "USD/hour", "Average hourly earnings, production workers, durable goods.", "Manufacturing wages, durables. Less sensitive to services wage spirals.", ["aUSWAGMANA", "aUSWRIMNA"]),
        "aUSWAGMANA": ("Wages by Sector", "USD/hour", "AHE production workers, manufacturing total.", "Combined durable + nondurable manufacturing wage gauge.", ["aUSWRIMDA", "aUSWRIMNA", "aUSWAGMANB/A"]),
        "aUSWRIMNA": ("Wages by Sector", "USD/hour", "AHE production workers, nondurable goods.", "Less cyclical than durables wages.", ["aUSWRIMDA", "aUSWAGMANA"]),
        "aUSEARNHC/A": ("Wages by Sector", "USD/hour", "AHE all employees, construction.", "Construction wages — key for housing affordability and infrastructure cost models.", ["aUSEARNH/A"]),
        "aUSWRIMDB/A": ("Wages by Sector", "USD/hour", "AHE all employees, manufacturing durable goods.", "All-employees variant (broader than production-workers).", ["aUSWRIMDA"]),
        "aUSWKIMDA": ("Workforce Levels", "Hours", "Average production workers, durable goods (hours/week).", "Hours per worker — pro-cyclical.", ["aUSWKIMA", "aUSWKIMNA"]),
        "aUSWKIMA": ("Workforce Levels", "Hours", "Average production workers, manufacturing.", "Combined manufacturing average hours.", ["aUSWKIMDA", "aUSWKIMNA"]),
        "aUSWKIMNA": ("Workforce Levels", "Hours", "Average production workers, nondurable goods.", "Hours per worker, nondurable.", ["aUSWKIMA", "aUSWKIMDA"]),
        "aUSWKNDURB/A": ("Weekly Earnings", "USD/week", "Average weekly earnings, nonfarm durable goods.", "Take-home pay proxy. Hours × hourly wage.", ["aUSWKNMANB/A", "aUSEARN"]),
        "aUSWKNMANB/A": ("Weekly Earnings", "USD/week", "Average weekly earnings, nonfarm manufacturing.", "Weekly take-home for mfg.", ["aUSWKNDURB/A"]),
        "aUSWAGESD/CA": ("Real Wages", "USD/hour", "Real average hourly earnings, all employees, total private.", "Inflation-adjusted wages. Stagnant for years; 2022-23 had negative real wage growth.", ["aUSEARN/CA", "aUSEARNH/A"]),
        "aUSEARNHG/A": ("Wages by Sector", "USD/hour", "AHE, nonfarm goods-producing industries.", "Goods-producing wage gauge. Cycles with manufacturing/construction.", ["aUSEARNHS/A", "aUSEARNH/A"]),
        "aUSEARNH/A": ("AHE", "USD/hour", "AHE, nonfarm payroll, total private — headline US AHE series.", "The headline wage number reported alongside NFP. ~$35/hr in 2024. YoY growth = wage inflation.", ["aUSAHVEA", "aUSEAHNPVT/A", "aUSWAGESB/A"]),
        "aUSWAGMANB/A": ("Wages by Sector", "USD/hour", "AHE all employees, manufacturing.", "Combined mfg wage gauge.", ["aUSWAGMANA"]),
        "aUSEARNHS/A": ("Wages by Sector", "USD/hour", "AHE, nonfarm service-providing industries.", "Services wages — drives core services CPI inflation.", ["aUSEARNHG/A", "aUSEARNH/A"]),
        "aUSEAHNPVT/A": ("AHE", "USD/hour", "AHE all private employees — alternate series.", "Cross-check with aUSEARNH/A.", ["aUSEARNH/A"]),
        "aUSWAGESB/A": ("AHE", "%, YoY", "AHE all private employees YoY change.", "Wage inflation. >4% YoY too hot for 2% inflation; <3% suggests easing.", ["aUSEARNH/A", "aUSAHVEA"]),
        "aUSEARNHM/A": ("Wages by Sector", "USD/hour", "AHE, nonfarm manufacturing.", "Cross-check with aUSWAGMANA.", ["aUSWAGMANA"]),
        "aUSEARN/CA": ("Real Wages", "USD/hour", "Real AHE, total private.", "Inflation-adjusted; the wage-gain that actually buys things.", ["aUSWAGESD/CA"]),
        "aUSEARN": ("Weekly Earnings", "USD/week", "Average weekly earnings, nonfarm payroll, total private.", "Hours × hourly wage. Pre-tax weekly take-home gauge.", ["aUSEARNW/A"]),
        "aUSEARNW/A": ("Weekly Earnings", "USD/week", "Average weekly earnings — alternate series.", "Cross-check.", ["aUSEARN"]),
        "aUSWEIPB/A": ("Weekly Earnings", "USD/week", "Average weekly earnings, all private employees.", "All-employees version (broader than production-workers).", ["aUSEARN"]),
        "aUSEARNW/CA": ("Real Weekly Earnings", "USD/week", "Real average weekly earnings, total private.", "Best take-home-pay-after-inflation gauge.", ["aUSEARN", "aUSWAGESD/CA"]),
        "aUSEAWNPVT/CA": ("Weekly Earnings", "USD/week", "Average weekly earnings, total private — alternate.", "Cross-check.", ["aUSEARN"]),
        "aUSEARNAR": ("AHE", "%, MoM", "Total private earnings MoM change.", "Monthly wage momentum.", ["aUSAHVEA"]),
        "aUSWKIMDH/C": ("Payroll Index", "Index", "Payroll index, production workers durable goods.", "Production-worker payroll proxy.", ["aUSWKIMNH/C", "aUSWKIMH/C"]),
        "aUSWKIMNH/C": ("Payroll Index", "Index", "Payroll index, production workers nondurable goods.", "Nondurables version.", ["aUSWKIMDH/C", "aUSWKIMH/C"]),
        "aUSWKIMH/C": ("Payroll Index", "Index", "Payroll index, production workers, manufacturing.", "Total mfg payroll index.", ["aUSWKIMDH/C", "aUSWKIMNH/C"]),
        "aUSREVPPA": ("Revisions", "Thousands", "Payrolls benchmark NSA — annual benchmark revision.", "BLS preliminary payroll benchmark; signals direction of QCEW-based annual revision (typically large in 2024-25).", ["aUSREVOA"]),
        "aUSREVOA": ("Revisions", "Thousands", "Payrolls benchmark, seasonally adjusted.", "SA version. Big negative revisions (e.g., -800k in 2024) reset NFP narrative.", ["aUSREVPPA"]),
        "aUSWKIMDG/CA": ("Payroll Index", "Index", "Weekly payroll index, durable goods.", "Hourly × weekly hours payroll proxy.", ["aUSWKIMG/CA", "aUSWKIMNG/CA"]),
        "aUSWKIMG/CA": ("Payroll Index", "Index", "Weekly payroll index, manufacturing.", "Total mfg weekly payroll proxy.", ["aUSWKIMDG/CA"]),
        "aUSWKIMNG/CA": ("Payroll Index", "Index", "Weekly payroll index, nondurable goods.", "Nondurables version.", ["aUSWKIMDG/CA"]),
    },

    "us_retail_sales": {
        "aUSCRETE/CA": ("Standardized RS", "Index", "Retail sales, standardized — alternate.", "Cross-check with aUSCRETF/C (Tier-1).", ["aUSCRETF/C"]),
        "aUSCRETPE/A": ("Headline RS", "%, MoM", "Retail sales standardized MoM change.", "Monthly retail-sales print MoM. Big surprise vs consensus moves USD/equities.", ["aUSCRETF/C", "aUSCRETPF"]),
        "aUSCRETPF": ("Headline RS", "%, MoM", "Retail sales MoM change — alternate.", "Cross-check.", ["aUSCRETPE/A"]),
        "aUSCRETYE/A": ("Headline RS", "%, YoY", "Retail sales YoY change.", "Trend signal. >5% YoY healthy; sub-2% signals weak consumer.", ["aUSCRETF/C", "aUSCRETYF"]),
        "aUSCRETYF": ("Headline RS", "%, YoY", "Retail sales YoY change — alternate.", "Cross-check.", ["aUSCRETYE/A"]),
        "aUSRBSIY": ("Chain Stores", "%, YoY", "Johnson Redbook Index, YoY% — chain store sales.", "Weekly retail tracker. Leads BLS retail sales by 2-3 weeks.", ["aUSRBSIM"]),
        "aUSRBSIM": ("Chain Stores", "%, MoM", "Redbook Index MoM% — suspended.", "Series suspended; use YoY version instead.", ["aUSRBSIY"]),
        "aUSRSLYQA": ("Headline RS", "%, YoY", "Retail sales YoY actual.", "Same concept as aUSCRETYE/A.", ["aUSCRETYE/A"]),
        "aUSRSLSBMAT/A": ("By Category", "USD millions", "Retail sales, building materials, garden equipment.", "Tied to housing/renovation cycle.", ["aUSRSLSHF/A"]),
        "aUSRSLSCL/A": ("By Category", "USD millions", "Retail sales, clothing and accessories.", "Discretionary signal. First to soften when consumers pull back.", ["aUSRSLSHF/A"]),
        "aUSRSLSDPS/A": ("By Category", "USD millions", "Retail sales, department stores.", "Long-term decline category — losing share to e-commerce + general merchandise.", ["aUSRSLSGM/A", "aUSRSLSNSR/A"]),
        "aUSRSLSEC": ("By Category", "USD millions", "Retail sales, e-commerce. Quarterly Census release.", "Online share tracking. ~16% of retail and rising. Use the share, not absolute level.", ["aUSRSLSNSR/A"]),
        "aUSRSLSAPP/A": ("By Category", "USD millions", "Retail sales, electronics and appliance stores.", "Big-ticket discretionary; cycles with housing and credit availability.", ["aUSRSLSHF/A"]),
        "aUSRSLSFB/A": ("By Category", "USD millions", "Retail sales, food and beverage stores (grocery).", "Staple category; least cyclical. Reflects food-at-home inflation.", ["aUSRSLSGRS/A", "aUSRSLSFSDP/A"]),
        "aUSRSLSFSDP/A": ("By Category", "USD millions", "Retail sales, food services and drinking places (restaurants/bars).", "Discretionary services proxy. Watch for divergence from grocery — substitution gauge.", ["aUSRSLSFB/A"]),
        "aUSRSLSHF/A": ("By Category", "USD millions", "Retail sales, furniture and home furnishings.", "Highly cyclical; tied to housing turnover.", ["aUSRSLSBMAT/A", "aUSRSLSAPP/A"]),
        "aUSRSLSGAS/A": ("By Category", "USD millions", "Retail sales, gasoline stations.", "Mostly tracks gasoline price changes (volume is fairly steady). Strip out for ex-gasoline core retail.", []),
        "aUSRSLSGM/A": ("By Category", "USD millions", "Retail sales, general merchandise stores (Walmart/Target/Costco etc).", "Broad consumer staples + discretionary mix. Healthier in down markets.", ["aUSRSLSDPS/A"]),
        "aUSRSLSGRS/A": ("By Category", "USD millions", "Retail sales, grocery stores.", "Sub-component of food and beverage stores. Most price-sensitive consumer category.", ["aUSRSLSFB/A"]),
        "aUSRSLSHPC/A": ("By Category", "USD millions", "Retail sales, health and personal care stores (drugstores).", "Steady; less cyclical.", []),
        "aUSRSLSMISC/A": ("By Category", "USD millions", "Retail sales, miscellaneous store retailers.", "Catch-all category.", []),
        "aUSRSLSMV/A": ("By Category", "USD millions", "Retail sales, motor vehicle and parts dealers.", "Largest retail category. Most rate-sensitive (auto financing).", ["aUSCARSOA", "aUSVHLS"]),
        "aUSRSLSNSR/A": ("By Category", "USD millions", "Retail sales, nonstore retailers (e-commerce + mail order).", "E-commerce primary measure. ~17% of retail and rising.", ["aUSRSLSEC"]),
        "aUSRSLSSLG/A": ("By Category", "USD millions", "Retail sales, sporting goods, hobby, instruments, books.", "Discretionary; cyclical.", []),
        "aUSRLCOA": ("Control Group", "USD millions", "Retail sales total ex bldg material, autos, gas, food services.", "Closest to GDP retail-control group. Feeds into goods PCE.", ["aUSSRXBDFB/A"]),
        "aUSSRXBDFB/A": ("Control Group", "USD millions", "Retail sales ex bldg material, autos, gas, food services — alternate.", "Cross-check with aUSRLCOA.", ["aUSRLCOA"]),
        "aUSRSLS/A": ("Aggregates", "USD millions", "Retail sales, total ex food services.", "Goods-only retail. Pair with food services for full headline.", ["aUSRSLSFS/A"]),
        "aUSRETTOXA": ("Aggregates", "USD millions", "Retail sales total ex food services — alternate.", "Cross-check.", ["aUSRSLS/A"]),
        "aUSRSLSXMV": ("Aggregates", "USD millions", "Retail sales ex food services and motor vehicle/parts.", "Strips two biggest categories. Reveals everything-else trends.", ["aUSRSLSXMV/A"]),
        "aUSRSLGA": ("Aggregates", "%, MoM", "Retail sales ex motor vehicle and gas, MoM.", "Strips two volatile categories.", ["aUSRSLAR"]),
        "aUSRSLSFS/A": ("Headline RS", "USD millions", "Retail sales total INCLUDING food services.", "Headline retail total.", ["aUSRSLS"]),
        "aUSRSLS": ("Headline RS", "USD millions", "Retail sales total including food services — alternate.", "Cross-check.", ["aUSRSLSFS/A"]),
        "aUSRSLAR": ("Headline RS", "%, MoM", "Retail sales total inc food services MoM.", "Headline MoM print. Market-moving release.", ["aUSCRETPE/A"]),
        "aUSRSLSXMV/A": ("Aggregates", "USD millions", "Retail sales ex motor vehicle and parts.", "Headline excluding autos.", ["aUSRSLSXMV"]),
        "aUSRSLAAR": ("Aggregates", "%, MoM", "Retail sales ex motor vehicle and parts, MoM.", "Headline ex-autos MoM.", ["aUSRSLGA"]),
        "aUSSRAFSXA": ("Aggregates", "USD millions", "Retail sales ex motor vehicles/parts dealers, total.", "Same concept as aUSRSLSXMV/A.", ["aUSRSLSXMV/A"]),
    },

    "us_automobiles_transport": {
        "aUSCARSOA": ("Vehicle Sales", "Million units, SAAR", "All car sales — actual.", "Total light vehicle sales market. SAAR ~15-16M is normal; below 14M signals weakness.", ["aUSVHLS", "aUSTLVS"]),
        "aUSATSOA": ("Vehicle Sales", "Million units, SAAR", "All truck sales (light + heavy).", "Trucks = ~75% of light-vehicle sales now (CUV + pickup mix shift).", ["aUSCARSOA"]),
        "aUSAUIMCNO/A": ("Trade", "Units", "Auto unit imports, Canada.", "USMCA cross-border auto trade. Tariff-sensitive.", []),
        "aUSDCAR": ("Vehicle Sales", "Thousand units", "Domestic passenger car sales (US-built).", "Domestic Big 3 + transplants (Toyota, Honda US plants).", ["aUSDVEHCAR/A"]),
        "aUSDVEHCAR/A": ("Vehicle Sales", "Thousand units", "Domestic passenger car sales — alternate.", "Cross-check.", ["aUSDCAR"]),
        "aUSIMPMV/A": ("Vehicle Sales", "Thousand units", "Imported passenger car sales.", "Mostly European luxury + Japanese imports.", ["aUSICAR"]),
        "aUSICAR": ("Vehicle Sales", "Thousand units", "Imported passenger car sales — alternate.", "Cross-check.", ["aUSIMPMV/A"]),
        "aUSNCAR": ("Vehicle Sales", "Thousand units", "Total car sales (domestic + imported).", "Headline car-only number (excludes light trucks).", ["aUSNCAR/A"]),
        "aUSNCAR/A": ("Vehicle Sales", "Thousand units", "Total car sales — alternate.", "Cross-check.", ["aUSNCAR"]),
        "aUSPCARRVO/A": ("Inventory", "Days supply", "Domestic auto unit inventory level.", "Days-supply gauge: <50 days = tight, >70 = excess. Drives incentive activity.", ["aUSPCARRVP"]),
        "aUSPCARRVP": ("Inventory", "Units", "Domestic auto unit inventory (Ward's).", "Cross-check.", ["aUSPCARRVO/A"]),
        "aUSDAPRODP": ("Production", "Thousand units", "Domestic auto unit production.", "Plant output. Watch for production cuts in soft markets — chip shortage caused 2021-22 drops.", []),
        "aUSTSALE/CA": ("Vehicle Sales", "Million units, SAAR", "Total light truck sales.", "Trucks/SUVs/CUVs > cars now in US mix.", ["aUSTKLSAP"]),
        "aUSTKLSAP": ("Vehicle Sales", "Million units, SAAR", "Total light truck sales — alternate.", "Cross-check.", ["aUSTSALE/CA"]),
        "aUSDVEHLCV/A": ("Vehicle Sales", "Million units, SAAR", "Total light vehicle sales.", "Headline US auto market — cars + light trucks.", ["aUSVHLS", "aUSTLVS"]),
        "aUSVHLS": ("Vehicle Sales", "Million units, SAAR", "Total light vehicle sales — alternate.", "Cross-check.", ["aUSDVEHLCV/A"]),
        "aUSTKHSALO/A": ("Vehicle Sales", "Thousand units", "Heavy truck sales.", "Class 8 trucks — freight-cycle indicator. Order books lead by 6-9 months.", ["aUSTKHSAO/A", "aUSTKHSAP"]),
        "aUSTKHSAO/A": ("Vehicle Sales", "Thousand units", "Heavy truck sales — alternate.", "Cross-check.", ["aUSTKHSALO/A"]),
        "aUSTKHSAP": ("Vehicle Sales", "Thousand units", "Heavy truck sales — alternate.", "Cross-check.", ["aUSTKHSALO/A"]),
        "aUSMVEHTRKL": ("Vehicle Sales", "Thousand units", "Domestic light truck sales.", "Domestic-built light trucks.", ["aUSDTRUCK/A"]),
        "aUSDTRUCK/A": ("Vehicle Sales", "Thousand units", "Domestic light truck sales — alternate.", "Cross-check.", ["aUSMVEHTRKL"]),
        "aUSMVTSIMPL/A": ("Vehicle Sales", "Thousand units", "Imported light truck sales.", "Imported trucks/SUVs.", ["aUSTSLSIMPL"]),
        "aUSTSLSIMPL": ("Vehicle Sales", "Thousand units", "Imported light truck sales — alternate.", "Cross-check.", ["aUSMVTSIMPL/A"]),
        "aUSSRAMDAO": ("Vehicle Sales", "Million units, SAAR", "Autodata retail sales of new cars: domestic.", "Industry-source data. Differs slightly from BEA series.", ["aUSDCAR"]),
        "aUSTLVS": ("Vehicle Sales", "Million units, SAAR", "Total light vehicle sales (Autodata Corp).", "Industry-source headline auto sales — pairs with Wards data.", ["aUSVHLS", "aUSDVEHLCV/A"]),
        "aUSDCAAO": ("Reuters Polls", "Thousand units", "Reuters poll: domestic car sales — actual.", "Survey expectations vs actuals.", []),
        "aUSDTRAO": ("Reuters Polls", "Thousand units", "Reuters poll: domestic truck sales — actual.", "Survey expectations vs actuals.", []),
        "aUSVEHAO": ("Reuters Polls", "Million units", "Reuters poll: total vehicle sales — actual.", "Survey expectations vs actuals.", []),
        "aUSACAV": ("Air Cargo", "Ton-miles", "Air cargo available ton miles.", "Cargo capacity. Spread to revenue ton-miles = utilization (load factor).", ["aUSACRFRM"]),
        "aUSACRFRM": ("Air Cargo", "Ton-miles", "Air cargo revenue freight ton miles — paid cargo.", "Air freight demand. Leading indicator for trade flows.", ["aUSACAV"]),
        "aUSBSSMILP": ("Air Passenger", "Seat-miles", "Available seat miles — capacity.", "Industry capacity. Pairs with passenger miles for load factor.", ["aUSAIRP"]),
        "aUSPTRAH": ("Air Passenger", "Hours", "Revenue aircraft hours airborne.", "Capacity utilization signal.", []),
        "aUSPTRAMF": ("Air Passenger", "Aircraft-miles", "Revenue aircraft miles flown.", "Operations gauge.", []),
        "aUSPTRDEP": ("Air Passenger", "Departures", "Revenue departures performed.", "Frequency signal — number of flights.", []),
        "aUSPTRPEP": ("Air Passenger", "Passengers", "Revenue passenger enplanements.", "Most-used passenger headcount metric.", ["aUSAIRP", "aUSTRTTP"]),
        "aUSAIRP": ("Air Passenger", "Passenger-miles", "Revenue passenger miles, US carriers.", "Combines headcount with stage length. The headline air-travel demand metric.", ["aUSBSSMILP", "aUSPTRPEP"]),
        "aUSACTOT": ("Air Cargo+Pax", "Ton-miles", "Total revenue ton miles (passenger + cargo).", "Aggregate airline activity.", ["aUSACRFRM", "aUSAIRP"]),
        "aUSTRANSF/A": ("Trans Services", "Index", "Transportation Services Index — Freight component.", "BTS combined freight gauge: trucking, rail, water, pipeline, air freight. Leads industrial production.", ["aUSTRANS/A"]),
        "aUSTRANSP/A": ("Trans Services", "Index", "Transportation Services Index — Passenger component.", "Combined air, rail, transit. Service-side travel demand.", ["aUSTRANS/A"]),
        "aUSTRANS/A": ("Trans Services", "Index", "Transportation Services Index — Total.", "BTS combined transport activity (passenger + freight). Leading indicator.", ["aUSTRANSF/A", "aUSTRANSP/A"]),
    },

    "us_domestic_finance": {
        "aUSBNQB11P": ("Bankruptcies", "Filings", "Chapter 11 business bankruptcy filings, quarterly.", "Reorganization filings. Big-cap Ch.11 cases (large notional debt) more market-relevant than counts.", ["aUSBNQ11P", "aUSBFILB"]),
        "aUSBNQ11P": ("Bankruptcies", "Filings", "Total Chapter 11 filings, quarterly.", "Includes individual + business Ch.11. Counts only.", ["aUSBNQB11P"]),
        "aUSBFILB": ("Bankruptcies", "Filings", "Bankruptcy filings, business, 12 months ending.", "Trailing-year business filings. Leading-edge stress signal.", ["aUSBNKQPTP", "aUSBFILNB"]),
        "aUSBFILNB": ("Bankruptcies", "Filings", "Bankruptcy filings, non-business, 12 months ending.", "Consumer bankruptcies — trailing year.", ["aUSBNQNP", "aUSBFILB"]),
        "aUSBCLAGQ/A": ("Charge-offs", "%", "Bank charge-off rate, agricultural loans.", "Niche; rises in farm-distress years.", []),
        "aUSBCLCAIQ/A": ("Charge-offs", "%", "Bank charge-off rate, C&I loans.", "Business credit-loss gauge. Rises ~6-12 months after recession start.", ["aUSBDLCAIQ/A"]),
        "aUSBCLCOQ/A": ("Charge-offs", "%", "Bank charge-off rate, total consumer loans.", "Consumer credit losses — leading sign of household stress.", ["aUSBCLCOCQ/A"]),
        "aUSBCLCOCQ/A": ("Charge-offs", "%", "Bank charge-off rate, credit cards.", "Most pro-cyclical loan category. Currently elevated; subprime-led.", ["aUSBCLCOQ/A"]),
        "aUSBCLLAQ/A": ("Charge-offs", "%", "Bank charge-off rate, consumer other.", "Auto/personal loans. Auto charge-offs have spiked.", ["aUSBCLCOQ/A"]),
        "aUSBCLREQ/A": ("Charge-offs", "%", "Bank charge-off rate, real estate.", "Combined residential + CRE charge-offs. CRE-led elevation now.", ["aUSBCLRECQ/A"]),
        "aUSBCLRECQ/A": ("Charge-offs", "%", "Bank charge-off rate, CRE (commercial real estate).", "Heavy office/retail CRE losses post-COVID. Bank stress concentrated here.", ["aUSBCLREQ/A"]),
        "aUSBCLRERQ/A": ("Charge-offs", "%", "Bank charge-off rate, residential real estate.", "Mortgage charge-offs — historically low (mortgage credit standards strict post-2008).", ["aUSBCLREQ/A"]),
        "aUSBCLTLQ/A": ("Charge-offs", "%", "Total loans charge-off rate, all commercial banks.", "Aggregate bank-credit-loss gauge.", ["aUSBCLCAIQ/A", "aUSBCLCOQ/A"]),
        "aUSBDLAGQ/A": ("Delinquencies", "%", "Delinquency rate, agricultural loans.", "Farm credit stress.", []),
        "aUSBDLCAIQ/A": ("Delinquencies", "%", "Delinquency rate, C&I loans.", "Earlier-stage business credit stress (vs charge-offs).", ["aUSBCLCAIQ/A"]),
        "aUSBDLCOQ/A": ("Delinquencies", "%", "Delinquency rate, consumer loans.", "Consumer credit early stress.", ["aUSBDLCOCQ/A"]),
        "aUSBDLCOCQ/A": ("Delinquencies", "%", "Delinquency rate, credit cards.", "Most pro-cyclical. Crossing 3% historically signals recession risk.", ["aUSBDLCOQ/A", "aUSBCLCOCQ/A"]),
        "aUSBDLLAQ/A": ("Delinquencies", "%", "Delinquency rate, consumer loans other.", "Auto + personal.", ["aUSBDLCOQ/A"]),
        "aUSBDLREQ/A": ("Delinquencies", "%", "Delinquency rate, real estate (combined).", "Combined res + CRE.", ["aUSBDLRECQ/A", "aUSBDLRERQ/A"]),
        "aUSBDLRECQ/A": ("Delinquencies", "%", "Delinquency rate, CRE.", "Office sector driving elevation. Watch alongside CMBS spreads.", ["aUSBCLRECQ/A"]),
        "aUSBDLRERQ/A": ("Delinquencies", "%", "Delinquency rate, residential real estate.", "Tame; mortgage market is healthy.", ["aUSBCLRERQ/A"]),
        "aUSBDLTLQ/A": ("Delinquencies", "%", "Delinquency rate, all commercial bank loans.", "Aggregate gauge. Watch alongside SLOOS lending standards.", ["aUSBCLTLQ/A"]),
        "aUSCONCRDA": ("Consumer Credit", "USD billions", "Consumer credit outstanding, total.", "G.19 release. Headline non-mortgage household debt. Auto + cards + student.", ["aUSCONREVA", "aUSCONNRVA"]),
        "aUSCONREVA": ("Consumer Credit", "USD billions", "Revolving consumer credit (credit cards).", "Credit card debt outstanding. Hit ~$1.2T+. Watch growth rate.", ["aUSCONCRDA", "aUSCONNRVA"]),
        "aUSCONNRVA": ("Consumer Credit", "USD billions", "Non-revolving credit (auto, student, personal loans).", "Larger than revolving. Auto + student dominate.", ["aUSCONCRDA", "aUSCONREVA"]),
        "aUSCONCRDC": ("Consumer Credit", "%, MoM annualized", "Consumer credit MoM% change, annualized.", "High-frequency credit-growth signal.", ["aUSCONREVC", "aUSCONNRVC"]),
        "aUSCONREVC": ("Consumer Credit", "%, MoM annualized", "Revolving credit MoM% change.", "Credit card growth rate.", ["aUSCONCRDC"]),
        "aUSCONNRVC": ("Consumer Credit", "%, MoM annualized", "Non-revolving credit MoM% change.", "Auto/student growth.", ["aUSCONCRDC"]),
        "aUSDSPACI/A": ("Debt Burden", "%", "Debt service ratio, all consumer debt — Fed FRB Z.1.", "Debt service / disposable income. ~10% currently — well below 2008 peak (~13%).", ["aUSDSPMTGE/A", "aUSDSPCONS/A"]),
        "aUSDSPMTGE/A": ("Debt Burden", "%", "Mortgage debt service ratio.", "Mortgage payment / DPI. Half of total debt service.", ["aUSDSPACI/A"]),
        "aUSDSPCONS/A": ("Debt Burden", "%", "Consumer (non-mortgage) debt service ratio.", "Auto/cards/student burden. Has risen — auto loans biggest contributor.", ["aUSDSPACI/A"]),
        "aUSFOBR/A": ("Debt Burden", "%", "Financial obligations ratio (broader than debt service).", "Includes rent + auto leases + property taxes + insurance. Better gauge for renters.", ["aUSDSPACI/A"]),
        "aUSCAPUTL/A": ("Cap Utilization", "%", "Capacity utilization, total industry.", "Output / capacity. >85% historically inflationary; <77% slack. Currently ~78% — modest slack.", []),
        "aUSCAPMFG/A": ("Cap Utilization", "%", "Capacity utilization, manufacturing.", "Cleaner mfg-side reading. Pair with ISM Mfg.", ["aUSCAPUTL/A"]),
        "aUSCAPMNG/A": ("Cap Utilization", "%", "Capacity utilization, mining.", "Energy-cycle dependent.", []),
        "aUSCAPUTLA/A": ("Cap Utilization", "%", "Capacity utilization, alternate measure.", "Cross-check.", ["aUSCAPUTL/A"]),
        "aUSIPTOT/A": ("Industrial Prod", "Index", "Industrial production, total — finally found.", "Long-time gap-filler. Output of mines + manufacturing + utilities. Recession indicator when sustained YoY decline.", ["aUSCAPUTL/A"]),
        "aUSIPMFG/A": ("Industrial Prod", "Index", "Industrial production, manufacturing.", "Manufacturing-only output. Cleaner cyclical signal.", ["aUSIPTOT/A"]),
        "aUSIPMNG/A": ("Industrial Prod", "Index", "Industrial production, mining.", "Resource extraction; energy-heavy.", []),
        "aUSIPUT/A": ("Industrial Prod", "Index", "Industrial production, utilities.", "Weather-driven; HDD/CDD adjusted.", []),
        "aUSIPCONSA/A": ("Industrial Prod", "Index", "Industrial production, consumer goods.", "Consumer goods sub-index.", []),
        "aUSIPMATL/A": ("Industrial Prod", "Index", "Industrial production, materials.", "Intermediate inputs — leading indicator for finished goods.", []),
    },

    "us_consumer_finance": {
        "aUSCREDP": ("Total Credit", "USD billions", "Total consumer credit outstanding.", "G.19 monthly. Sum of revolving + non-revolving. Cross-check with Z.1 quarterly.", ["aUSCREDPRV", "aUSCREDNRV"]),
        "aUSCREDPRV": ("Revolving", "USD billions", "Revolving consumer credit (credit cards).", "Most-watched consumer borrowing line. Hit record $1.2T+ in 2024.", ["aUSCREDP", "aUSCREDNRV"]),
        "aUSCREDNRV": ("Non-revolving", "USD billions", "Non-revolving consumer credit (auto + student + personal).", "Larger than revolving. Student loans frozen during pause; resumed 2023.", ["aUSCREDP", "aUSCREDPRV"]),
        "aUSCFNAR": ("Credit Flow", "USD billions, SAAR", "Net change in consumer credit, total.", "Monthly credit-creation flow. Negative prints signal contraction (rare).", ["aUSCREDP"]),
        "aUSCFREVR": ("Credit Flow", "USD billions, SAAR", "Revolving credit net change.", "Credit-card creation flow.", ["aUSCREDPRV"]),
        "aUSCFNRVR": ("Credit Flow", "USD billions, SAAR", "Non-revolving credit net change.", "Auto/student flow.", ["aUSCREDNRV"]),
        "aUSCRDIMRA/A": ("Interest Rates", "%", "Credit card interest rate, accounts assessed interest.", "Average APR for cardholders carrying a balance. Hit ~22% in 2024.", ["aUSCRDIIRA/A"]),
        "aUSCRDIIRA/A": ("Interest Rates", "%", "Credit card APR, all accounts (including 0% promos).", "Lower than 'assessed' rate due to promo periods. Spread = promotional intensity.", ["aUSCRDIMRA/A"]),
        "aUSAUFR60/A": ("Interest Rates", "%", "Auto loan rate, 60-month new car.", "Drives auto affordability. Currently ~7-8%.", ["aUSAUFR48/A"]),
        "aUSAUFR48/A": ("Interest Rates", "%", "Auto loan rate, 48-month new car.", "Shorter-tenor variant. Slightly lower than 60-month.", ["aUSAUFR60/A"]),
        "aUSPER24/A": ("Interest Rates", "%", "Personal loan rate, 24-month.", "Unsecured personal lending APR.", []),
        "aUSCCDLNQA/A": ("Delinquencies", "%", "Credit card delinquency rate (90+ days past due).", "NY Fed Household Debt and Credit Report. Elevated, especially subprime.", ["aUSAUDLNQA/A"]),
        "aUSAUDLNQA/A": ("Delinquencies", "%", "Auto loan delinquency rate.", "Subprime auto stress visible. Watch repossession rates alongside.", ["aUSCCDLNQA/A"]),
        "aUSSLDLNQA/A": ("Delinquencies", "%", "Student loan delinquency rate.", "Re-elevated as 2023 payment pause ended and forbearance ran off.", []),
        "aUSMTDLNQA/A": ("Delinquencies", "%", "Mortgage delinquency rate.", "Tame; ~3% — half pre-2008 levels. Mortgage credit standards strict.", []),
        "aUSHELDLA/A": ("Delinquencies", "%", "HELOC delinquency rate.", "Home equity lines stress. Less common product post-2008.", []),
        "aUSCCAVLB/A": ("Balances", "USD", "Average credit card balance per consumer with cards.", "Per-account balance. Cross-check with total credit card debt outstanding.", []),
        "aUSAUAVB/A": ("Balances", "USD", "Average auto loan balance.", "Loan size up sharply with vehicle prices. ~$25k average new car balance.", []),
        "aUSSLAVB/A": ("Balances", "USD", "Average student loan balance per borrower.", "~$37k. Federal mostly. PSLF/IDR program shifts move totals.", []),
        "aUSMTAVB/A": ("Balances", "USD", "Average mortgage balance per borrower.", "Tracks home prices roughly — currently ~$240k.", []),
        "aUSPDIA/A": ("Income & Saving", "USD billions, SAAR", "Personal disposable income — household after-tax income.", "Master consumer-spending-power gauge. Real DPI growth drives consumption.", ["aUSPSV/A", "aUSPCNDA/A"]),
        "aUSPSV/A": ("Income & Saving", "%", "Personal saving rate.", "DPI minus consumption / DPI. ~4% currently — historically low. Stimulus surge depleted.", ["aUSPDIA/A"]),
        "aUSPCNDA/A": ("Income & Saving", "USD billions, SAAR", "Personal consumption expenditures.", "GDP component largest — ~70% of GDP.", ["aUSPDIA/A"]),
        "aUSREALDPI/A": ("Income & Saving", "USD billions, SAAR", "Real disposable personal income.", "Inflation-adjusted DPI. The number that matters for consumption power.", ["aUSPDIA/A"]),
        "aUSREALPCEA/A": ("Income & Saving", "USD billions, SAAR", "Real personal consumption expenditures.", "Inflation-adjusted PCE. GDP nowcast input.", ["aUSPCNDA/A"]),
        "aUSREALDPC/A": ("Income & Saving", "%, MoM", "Real DPI MoM change.", "Monthly real-income momentum.", ["aUSREALDPI/A"]),
        "aUSREALPCC/A": ("Income & Saving", "%, MoM", "Real PCE MoM change.", "Monthly real-spending momentum.", ["aUSREALPCEA/A"]),
        "aUSPCNHEAD/A": ("PCE Components", "USD billions", "PCE, durable goods.", "Most cyclical PCE component. Cars + furniture + electronics.", ["aUSPCNNHEAD/A", "aUSPCSV/A"]),
        "aUSPCNNHEAD/A": ("PCE Components", "USD billions", "PCE, nondurable goods.", "Food + clothing + gasoline. Less cyclical.", ["aUSPCNHEAD/A"]),
        "aUSPCSV/A": ("PCE Components", "USD billions", "PCE, services.", "~70% of PCE. Most stable. Includes housing services (imputed rent).", ["aUSPCNHEAD/A"]),
        "aUSDSPCRA/A": ("Debt Burden", "%", "Consumer debt service ratio.", "Same concept as aUSDSPCONS/A.", ["aUSDSPACI/A"]),
        "aUSDSPMRA/A": ("Debt Burden", "%", "Mortgage debt service ratio.", "Same concept as aUSDSPMTGE/A.", ["aUSDSPACI/A"]),
        "aUSDSPTRA/A": ("Debt Burden", "%", "Total debt service ratio.", "Same concept as aUSDSPACI/A.", ["aUSDSPACI/A"]),
        "aUSFOBRA/A": ("Debt Burden", "%", "Financial obligations ratio (broader).", "Same concept as aUSFOBR/A.", ["aUSDSPACI/A"]),
        "aUSFOBHRA/A": ("Debt Burden", "%", "FOR for homeowners.", "Owners' financial obligation ratio.", ["aUSFOBR/A"]),
        "aUSFOBRRA/A": ("Debt Burden", "%", "FOR for renters.", "Renters' burden — typically higher than owners.", ["aUSFOBR/A"]),
        "aUSDPI80M/A": ("Income & Saving", "USD billions", "Disposable personal income, top 80% (household survey).", "Income distribution slice.", []),
        "aUSDPI20M/A": ("Income & Saving", "USD billions", "Disposable personal income, bottom 20%.", "Bottom-quintile income — most consumption-elastic.", []),
        "aUSPSXMTGI/A": ("Saving", "USD billions", "Personal saving excluding mortgage interest.", "Adjusted saving measure.", []),
        "aUSDIVIA/A": ("Income & Saving", "USD billions, SAAR", "Personal dividend income.", "Wealth-cycle linked.", []),
        "aUSINTIA/A": ("Income & Saving", "USD billions, SAAR", "Personal interest income.", "Surged 2022-23 with rates rising. Money-market fund holdings drove.", []),
        "aUSGOVTSXA/A": ("Income & Saving", "USD billions", "Government social benefit transfers to persons.", "Social Security + Medicare + unemployment + SNAP. Counter-cyclical.", []),
    },

    "us_balance_of_payments": {
        "aUSBOPCAL/A": ("Current Account", "USD billions", "Current account balance, total.", "BEA quarterly. Sum of trade in goods/services + primary income + secondary income. Persistent deficit ~$200-300B/quarter.", ["aUSBOPCAGS/A", "aUSBOPCAPI/A"]),
        "aUSBOPCAGS/A": ("Current Account", "USD billions", "Current account, goods & services balance.", "Trade-balance component. Goods deficit dominates.", ["aUSBOPCAG/A", "aUSBOPCAS/A"]),
        "aUSBOPCAG/A": ("Current Account", "USD billions", "Current account, goods balance.", "Goods-only trade deficit.", ["aUSBOPCAGS/A", "aUSBOPCAS/A"]),
        "aUSBOPCAS/A": ("Current Account", "USD billions", "Current account, services balance.", "Services surplus — US runs persistent services trade surplus (financial, IP, travel).", ["aUSBOPCAGS/A"]),
        "aUSBOPCAPI/A": ("Current Account", "USD billions", "Current account, primary income balance.", "Investment income net. US holds large foreign assets — earns income.", ["aUSBOPCAL/A"]),
        "aUSBOPCASI/A": ("Current Account", "USD billions", "Current account, secondary income balance.", "Net transfers (foreign aid, remittances). Consistently negative.", ["aUSBOPCAL/A"]),
        "aUSBOPCAEX/A": ("Goods & Services", "USD billions", "Exports of goods and services.", "Total US export receipts. Largest service exports: financial, IP licensing, travel.", ["aUSBOPCAGS/A"]),
        "aUSBOPCAIM/A": ("Goods & Services", "USD billions", "Imports of goods and services.", "Total US import payments. Goods dominate (consumer + capital goods).", ["aUSBOPCAGS/A"]),
        "aUSEXPGD/A": ("Goods Exports", "USD billions", "Exports of goods (BoP basis).", "Census/BEA goods exports — quarterly summed monthly.", ["aUSBOPCAEX/A"]),
        "aUSEXPSV/A": ("Services Exports", "USD billions", "Exports of services.", "Financial + IP + travel + consulting. Persistent surplus.", ["aUSBOPCAEX/A"]),
        "aUSIMPGD/A": ("Goods Imports", "USD billions", "Imports of goods (BoP basis).", "Largest import category.", ["aUSBOPCAIM/A"]),
        "aUSIMPSV/A": ("Services Imports", "USD billions", "Imports of services.", "Travel, transport, business services, royalties.", ["aUSBOPCAIM/A"]),
        "aUSBOPKAB/A": ("Capital Account", "USD billions", "Capital account balance.", "Tiny line item — debt forgiveness, capital transfers. Mostly a rounding error in BoP.", []),
        "aUSBOPFA/A": ("Financial Account", "USD billions", "Financial account balance — net financial flows.", "Mirror of current account by accounting identity. Inflows funding the current-account deficit.", ["aUSBOPCAL/A", "aUSBOPDIA/A", "aUSBOPPIA/A"]),
        "aUSBOPDIA/A": ("Financial Flows", "USD billions", "Direct investment net flows.", "FDI in vs out. US is a major source AND destination of FDI.", ["aUSBOPFA/A"]),
        "aUSBOPPIA/A": ("Financial Flows", "USD billions", "Portfolio investment net flows.", "Securities flows. Foreign UST + equity purchases. Big swings here move FX.", ["aUSBOPFA/A"]),
        "aUSBOPOIA/A": ("Financial Flows", "USD billions", "Other investment net flows.", "Bank deposits, loans. Less granular than direct/portfolio.", ["aUSBOPFA/A"]),
        "aUSBOPRA/A": ("Reserve Assets", "USD billions", "Reserve assets net flows.", "US reserve changes. Small for US; reserve currency status reduces need.", ["aUSCRESA"]),
        "aUSBOPNED/A": ("Net IIP", "USD billions", "Net errors and omissions in BoP.", "BoP residual; should sum to zero in theory. Persistently large in US data.", []),
        "aUSIIPNL/A": ("Net IIP", "USD billions", "Net international investment position.", "US assets abroad − foreign assets in US. Persistently negative — net debtor.", ["aUSBOPCAL/A"]),
        "aUSIIPAS/A": ("Net IIP", "USD billions", "US-owned assets abroad.", "Total US foreign holdings. Big private + reserve component.", ["aUSIIPLI/A", "aUSIIPNL/A"]),
        "aUSIIPLI/A": ("Net IIP", "USD billions", "Foreign-owned assets in US.", "Foreign holdings of US — UST + equities + FDI.", ["aUSIIPAS/A", "aUSIIPNL/A"]),
        "aUSBOPGOA/A": ("Current Account", "USD billions", "Goods balance — alternate.", "Cross-check with aUSBOPCAG/A.", ["aUSBOPCAG/A"]),
        "aUSBOPSEA/A": ("Current Account", "USD billions", "Services balance — alternate.", "Cross-check with aUSBOPCAS/A.", ["aUSBOPCAS/A"]),
        "aUSBOPCAR/A": ("Current Account", "%", "Current account as % of GDP.", "Sustainability gauge. ~3% deficit — normal for reserve currency. Above 5% historical warning sign.", ["aUSBOPCAL/A"]),
        "aUSBOPGOR/A": ("Current Account", "%", "Goods balance as % of GDP.", "Goods deficit / GDP.", ["aUSBOPCAG/A"]),
        "aUSBOPSER/A": ("Current Account", "%", "Services balance as % of GDP.", "Services surplus / GDP.", ["aUSBOPCAS/A"]),
        "aUSBOPNETIA/A": ("Net IIP", "%", "Net IIP as % of GDP.", "External-debt sustainability gauge.", ["aUSIIPNL/A"]),
        "aUSGCAR/A": ("Current Account", "%, MoM", "Current account MoM% change.", "Monthly variability.", []),
        "aUSGCAY/A": ("Current Account", "%, YoY", "Current account YoY% change.", "Trend signal.", []),
        "aUSCSIPP/A": ("Current Account", "USD billions", "Current account standardized.", "OECD-comparable framing.", ["aUSBOPCAL/A"]),
        "aUSCSIPM/A": ("Current Account", "%, MoM", "Standardized current account MoM%.", "OECD-comparable.", ["aUSGCAR/A"]),
        "aUSCSIPY/A": ("Current Account", "%, YoY", "Standardized current account YoY%.", "OECD-comparable.", ["aUSGCAY/A"]),
        "aUSCSGM/A": ("Goods Trade", "%, MoM", "Standardized goods balance MoM%.", "Goods-trade flow gauge.", []),
        "aUSCSGY/A": ("Goods Trade", "%, YoY", "Standardized goods balance YoY%.", "Trend.", []),
        "aUSCSGB/A": ("Goods Trade", "USD billions", "Standardized goods balance.", "OECD framework.", ["aUSBOPCAG/A"]),
        "aUSCSSM/A": ("Services Trade", "%, MoM", "Standardized services balance MoM%.", "Services flow.", []),
        "aUSCSSY/A": ("Services Trade", "%, YoY", "Standardized services balance YoY%.", "Trend.", []),
        "aUSCSSB/A": ("Services Trade", "USD billions", "Standardized services balance.", "OECD framework.", ["aUSBOPCAS/A"]),
        "aUSCSCAP/A": ("Capital Account", "USD billions", "Standardized capital account.", "Tiny line.", []),
        "aUSCSFIN/A": ("Financial Account", "USD billions", "Standardized financial account.", "Mirror of current account.", ["aUSBOPFA/A"]),
        "aUSCSER/A": ("BoP Residual", "USD billions", "Standardized errors and omissions.", "Residual.", ["aUSBOPNED/A"]),
        "aUSCSGSER/A": ("Goods & Services", "USD billions", "Standardized goods + services balance.", "OECD framework.", ["aUSBOPCAGS/A"]),
        "aUSCSPIY/A": ("Primary Income", "%, YoY", "Standardized primary income YoY%.", "Investment-income flow trend.", ["aUSBOPCAPI/A"]),
        "aUSCSPI/A": ("Primary Income", "USD billions", "Standardized primary income balance.", "Net investment income.", ["aUSBOPCAPI/A"]),
    },

    "us_consumer_surveys": {
        "aUSCONCE/A": ("Conference Board", "Index", "Conference Board Consumer Confidence — Expectations sub-index.", "More forward-looking than the Present Situation. >20pp YoY drop is recession warning.", ["aUSCONCF/A", "aUSCONCS/A"]),
        "aUSCONCS/A": ("Conference Board", "Index", "Conference Board Consumer Confidence — Present Situation.", "Current-conditions assessment. Lags Expectations.", ["aUSCONCF/A", "aUSCONCE/A"]),
        "aUSCCIPSOR": ("LSEG/Ipsos", "Index", "LSEG/Ipsos Primary Consumer Sentiment Index.", "Alternative consumer sentiment gauge. Less market-watched than UMich/CB.", []),
        "aUSOCS005Q/A": ("Composite", "Index", "Composite consumer confidence indicator (OECD-style).", "Standardized cross-country gauge.", ["aUSCONCF/A"]),
        "aUSUMICH/A": ("UMich", "Index", "UMich Consumer Sentiment Index — headline.", "More inflation-sensitive than Conference Board. Twice-monthly: preliminary mid-month, final end of month.", ["aUSUMCURR/A", "aUSUMEXP/A", "aUSUMINF1/A"]),
        "aUSUMCURR/A": ("UMich", "Index", "UMich Current Economic Conditions.", "Current-conditions sub-index.", ["aUSUMICH/A"]),
        "aUSUMEXP/A": ("UMich", "Index", "UMich Consumer Expectations.", "Forward-looking sub-index.", ["aUSUMICH/A"]),
        "aUSUMINF1/A": ("Inflation Expectations", "%", "UMich 1-year-ahead inflation expectation.", "Most-watched short-term inflation expectation. Fed monitors closely.", ["aUSUMINF5/A"]),
        "aUSUMINF5/A": ("Inflation Expectations", "%", "UMich 5-10 year-ahead inflation expectation.", "Long-term anchor. Sub-3% = anchored; spikes signal Fed credibility risk.", ["aUSUMINF1/A"]),
        "aUSCSUNCI/A": ("Confidence", "Index", "Consumer sentiment uncertainty index.", "Dispersion gauge.", []),
        "aUSCBINFEX/A": ("Inflation Expectations", "%", "Conference Board 12-mo inflation expectation.", "CB version of inflation expectation. Higher than UMich historically.", []),
        "aUSCBJOBHR/A": ("Labor Outlook", "Net %", "CB jobs-hard-to-get net percentage.", "Spread between 'hard to get' and 'plentiful' answers. Falling = tight labor market.", ["aUSCBJOBPT/A"]),
        "aUSCBJOBPT/A": ("Labor Outlook", "%", "CB jobs-plentiful percentage.", "% saying jobs are plentiful. Falling = labor market loosening.", ["aUSCBJOBHR/A"]),
        "aUSCBPLANCAR/A": ("Buying Plans", "%", "CB plans to buy car within 6 months.", "Forward-looking auto demand.", ["aUSCBPLANHM/A"]),
        "aUSCBPLANHM/A": ("Buying Plans", "%", "CB plans to buy home within 6 months.", "Housing demand pulse.", ["aUSCBPLANCAR/A"]),
        "aUSCBPLANAP/A": ("Buying Plans", "%", "CB plans to buy major appliance.", "Big-ticket discretionary plans.", ["aUSCBPLANCAR/A"]),
        "aUSUMICHEXP/A": ("UMich Detail", "Index", "UMich expectations alternate.", "Cross-check.", ["aUSUMEXP/A"]),
        "aUSCBSTOCKS/A": ("Asset Outlook", "Net %", "CB consumer survey: stock-prices-up minus stock-prices-down.", "Retail equity sentiment.", []),
        "aUSCBINTUP/A": ("Asset Outlook", "Net %", "CB rates-up minus rates-down expectation.", "Rate-expectation gauge from households.", []),
        "aUSCBINCOME/A": ("Income Outlook", "Net %", "CB income-up minus income-down expectation.", "Personal income expectation.", []),
        "aUSCBBUSCOND/A": ("Business Outlook", "Net %", "CB business-conditions outlook 6 months ahead.", "Forward-looking business conditions assessment.", []),
        "aUSCBBUSCURR/A": ("Business Outlook", "Net %", "CB business-conditions current.", "Present-conditions business view.", []),
        "aUSUMHOMEYR/A": ("Housing Outlook", "Index", "UMich housing-buying conditions.", "Affordability gauge.", []),
        "aUSUMVHCYR/A": ("Auto Outlook", "Index", "UMich vehicle-buying conditions.", "Auto demand gauge.", []),
        "aUSUMDURYR/A": ("Buying Plans", "Index", "UMich durables buying conditions.", "Big-ticket buying mood.", []),
        "aUSCITIRRT/A": ("Misc Surveys", "Net %", "Citibank Economic Surprise Index — actual vs forecast.", "Tracks consensus-beats vs consensus-misses. Mean-reverts.", []),
        "aUSCONSPS/A": ("Spending Plans", "Net %", "Consumer Spending Plans Index.", "Forward-looking spending gauge.", ["aUSCBPLANCAR/A"]),
        "aUSDEMOGENH/A": ("Demographics", "Index", "Demographics-impact survey indicator.", "Niche.", []),
        "aUSGENZSENT/A": ("Generational", "Index", "Gen Z consumer sentiment proxy.", "Youth consumer mood.", []),
        "aUSMILLENS/A": ("Generational", "Index", "Millennial sentiment proxy.", "Millennial-cohort consumer mood.", []),
        "aUSBOOMSENT/A": ("Generational", "Index", "Boomer sentiment proxy.", "Older-cohort consumer mood.", []),
        "aUSGENXSENT/A": ("Generational", "Index", "Gen X sentiment proxy.", "Gen X mood.", []),
        "aUSSENTHIY/A": ("Income Cohorts", "Index", "Sentiment, high-income tier.", "Top-income consumer mood — most equity-correlated.", []),
        "aUSSENTLOW/A": ("Income Cohorts", "Index", "Sentiment, lower-income tier.", "Lower-income consumer mood — most inflation-sensitive.", []),
        "aUSSENTMID/A": ("Income Cohorts", "Index", "Sentiment, middle-income tier.", "Median consumer mood.", []),
        "aUSCC60/A": ("Demographics", "Index", "Sentiment, 60+ age cohort.", "Senior consumer mood.", []),
        "aUSCC55/A": ("Demographics", "Index", "Sentiment, 55+ cohort.", "Pre-retiree mood.", []),
        "aUSCC35/A": ("Demographics", "Index", "Sentiment, under-35 cohort.", "Young adult mood — most rate-sensitive (mortgage/auto).", []),
        "aUSCBHHFW/A": ("Wealth Outlook", "Net %", "CB household-finances-better outlook.", "Personal balance-sheet expectations.", []),
        "aUSCONDIFFRC/A": ("Composite", "Index", "Conference Board diffusion index, composite.", "Aggregate confidence diffusion.", []),
        "aUSCONFEXR/A": ("Conference Board", "Index", "CB consumer confidence — expectations alternate.", "Cross-check.", ["aUSCONCE/A"]),
        "aUSCONFCRR/A": ("Conference Board", "Index", "CB consumer confidence — current alternate.", "Cross-check.", ["aUSCONCS/A"]),
        "aUSCONCFC/A": ("Conference Board", "%, YoY", "CB confidence YoY change.", "Trend signal.", ["aUSCONCF/A"]),
        "aUSCONCFM/A": ("Conference Board", "%, MoM", "CB confidence MoM change.", "Monthly momentum.", ["aUSCONCF/A"]),
        "aUSCONIDX/A": ("Conference Board", "Index", "CB confidence indicator.", "Cross-check.", ["aUSCONCF/A"]),
    },

    "us_commodity_fundamentals": {
        "aUSAPICA": ("API Crude", "Thousand barrels", "API Cushing crude oil number — industry-source weekly stocks at Cushing OK.", "Released Tuesday evening before Wednesday's EIA report. Often moves prices on the prior-day Asia/Europe overnight session.", ["aUSSCCO", "aUSOICCA"]),
        "aUSOIAIA": ("API Imports", "Thousand barrels/day", "API weekly crude oil imports.", "API industry numbers; cross-check with EIA aUSEIACI.", ["aUSEIACI"]),
        "aUSOIARA": ("API Refining", "Thousand barrels/day", "API weekly crude runs at refineries.", "Refinery throughput. Cross-check with EIA aUSEIACR.", ["aUSEIACR"]),
        "aUSOIACA": ("API Stocks", "Thousand barrels", "API weekly crude oil stocks.", "Total US crude inventory ex-SPR — industry source.", ["aUSEIACS"]),
        "aUSOIADA": ("API Stocks", "Thousand barrels", "API weekly distillate stocks.", "Diesel + heating oil inventories.", ["aUSEIADS"]),
        "aUSOIAGA": ("API Stocks", "Thousand barrels", "API weekly gasoline stocks.", "Gasoline inventories — driving-season seasonality.", ["aUSEIAGS"]),
        "aUSOIAHA": ("API Stocks", "Thousand barrels", "API weekly heating oil stocks.", "Subset of distillate. Q4 demand-driven.", ["aUSEIAHOS"]),
        "aUSOIAPA": ("API Imports", "Thousand barrels/day", "API weekly product imports.", "Refined-product imports.", []),
        "aTESTAPI": ("Test", "", "Test series — placeholder.", "Not for use.", []),
        "aUSESECOP": ("Emissions", "Million metric tons", "US carbon dioxide emissions, total.", "Annual EIA. Tracks US progress on emissions reductions. Has trended down post-2007.", []),
        "aUSEIACI": ("EIA Imports", "Thousand barrels/day", "EIA weekly crude oil imports.", "Cross-check with API aUSOIAIA. Halved post-shale.", ["aUSOIAIA"]),
        "aUSEIAPI": ("EIA Imports", "Thousand barrels/day", "EIA petroleum products imports.", "Refined products imports.", ["aUSOIAPA"]),
        "aUSOIPIA": ("EIA Imports", "Thousand barrels/day", "Petroleum products imports, absolute change WoW.", "Weekly change.", ["aUSEIAPI"]),
        "aUSNGIFA": ("Natural Gas", "MMcf/day", "EIA implied natural gas flow.", "Backed-out demand from production minus storage change.", []),
        "aUSOICRA": ("Refining", "Thousand barrels/day", "Crude oil inputs into refineries, absolute change WoW.", "Weekly throughput change.", ["aUSEIACR"]),
        "aUSOIDOA": ("Refining", "Thousand barrels/day", "Distillate production, absolute change WoW.", "Weekly distillate-output change.", ["aUSEIADP"]),
        "aUSPCOAL": ("Coal", "Thousand short tons", "EIA coal production, total US.", "Long-term decline. Down >50% from 2008 peak. Replaced by gas + renewables.", []),
        "aUSEIACR": ("Refining", "Thousand barrels/day", "EIA crude oil inputs into refineries — refinery throughput.", "Largest single use of US crude. Demand pulse for crude oil.", ["aUSEIAPRU", "aUSOICRA"]),
        "aUSEIADP": ("Refining", "Thousand barrels/day", "EIA distillate production.", "Diesel + heating oil output.", ["aUSEIADS", "aUSOIDOA"]),
        "aUSEIAGP": ("Refining", "Thousand barrels/day", "EIA gasoline production.", "Gasoline output — pairs with stocks for refining-margin analysis.", ["aUSEIAGS"]),
        "aUSEIAPRU": ("Refining", "%", "EIA refinery capacity utilization.", "85-95% normal range. Drops sharply during hurricane season (Gulf shut-ins).", ["aUSEIACR"]),
        "aUSOIGOA": ("Refining", "Thousand barrels/day", "Gasoline production, absolute change WoW.", "Weekly gasoline output change.", ["aUSEIAGP"]),
        "aUSOIRUA": ("Refining", "%", "Refinery capacity utilization, absolute change WoW.", "Weekly utilization change.", ["aUSEIAPRU"]),
        "aUSOICCA": ("Cushing Stocks", "Thousand barrels", "Cushing OK crude oil stocks ex-SPR, absolute change WoW.", "WTI futures-deliverable supply. Below 25M bbl = tank tops empty risk.", ["aUSSCCO"]),
        "aUSOILHA": ("Stocks", "Thousand barrels", "Distillate over 500ppm sulfur, absolute change WoW.", "Higher-sulfur diesel stocks (off-road/heating).", ["aUSEIADS500"]),
        "aUSOICIA": ("EIA Imports", "Thousand barrels/day", "EIA weekly crude imports — alternate (absolute change basis).", "Cross-check with aUSEIACI.", ["aUSEIACI"]),
        "aUSSCCO": ("Cushing Stocks", "Thousand barrels", "Cushing OK crude oil stocks ex-SPR (level).", "WTI delivery point. Most-watched single inventory location.", ["aUSOICCA"]),
        "aUSEIADS500": ("Stocks", "Thousand barrels", "Distillate over 500ppm sulfur stocks.", "Higher-sulfur diesel stocks.", ["aUSOILHA"]),
        "aUSEIAGS": ("Stocks", "Thousand barrels", "EIA gasoline stocks.", "Gasoline inventories. Below 5-year range = bullish gasoline crack.", ["aUSEIAGP", "aUSOILGA"]),
        "aUSEIAPADD1": ("PADD Stocks", "Thousand barrels", "PADD 1 (East Coast) distillate stocks.", "Heating oil-heavy. Northeast winter demand.", []),
        "aUSEIAPADDA": ("PADD Stocks", "Thousand barrels", "PADD 1A distillate stocks (New England).", "Smallest sub-PADD. Heating oil concentrated here.", []),
        "aUSEIAPADDB": ("PADD Stocks", "Thousand barrels", "PADD 1B distillate stocks (Central Atlantic).", "NJ/NY/PA/MD distillate.", []),
        "aUSEIAPADDC": ("PADD Stocks", "Thousand barrels", "PADD 1C distillate stocks (Lower Atlantic).", "VA/Carolinas/GA/FL.", []),
        "aUSEIAPADD2": ("PADD Stocks", "Thousand barrels", "PADD 2 (Midwest) distillate stocks.", "Agriculture and freight demand.", []),
        "aUSEIAPADD3": ("PADD Stocks", "Thousand barrels", "PADD 3 (Gulf Coast) distillate stocks.", "Largest refining region. Gulf Coast crack spreads pricing reference.", []),
        "aUSEIAPADD4": ("PADD Stocks", "Thousand barrels", "PADD 4 (Rocky Mountain) distillate stocks.", "Smaller region.", []),
        "aUSEIAPADD5": ("PADD Stocks", "Thousand barrels", "PADD 5 (West Coast) distillate stocks.", "Isolated market — limited pipeline access.", []),
        "aUSEIAREF": ("Stocks", "Thousand barrels", "Reformulated gasoline stocks.", "RBOB grade — summer-spec gasoline. Tightens approaching summer driving.", ["aUSEIAGS"]),
        "aUSEIAHOS": ("SPR", "Thousand barrels", "Strategic Petroleum Reserve stocks.", "Drained ~200M bbl in 2022 (Russia/Ukraine response). Refilling slow.", []),
        "aUSEIACS": ("Crude Stocks", "Thousand barrels", "Total crude oil stocks ex-SPR.", "Most-watched US oil inventory series. Weekly EIA report. Big surprises move WTI.", ["aUSOIACA", "aUSEIAHOS"]),
        "aUSEIADS": ("Distillate Stocks", "Thousand barrels", "Total distillate fuel oil stocks.", "Diesel + heating oil. Industrial + freight + winter demand.", ["aUSEIAGS"]),
        "aUSOILGA": ("Stocks", "Thousand barrels", "Gasoline stocks, absolute change WoW.", "Weekly gasoline draw/build.", ["aUSEIAGS"]),
        "aUSOILNA": ("Natural Gas", "Bcf", "Natural gas in underground storage, Lower 48, absolute change.", "Weekly NG storage change. Inverse of demand minus production.", []),
        "aUSOILRA": ("Stocks", "Thousand barrels", "Reformulated gasoline stocks, absolute change WoW.", "Summer-spec gasoline weekly change.", ["aUSEIAREF"]),
        "aUSOILCA": ("Crude Stocks", "Thousand barrels", "Total crude oil ex-SPR stocks, absolute change WoW.", "Most-watched weekly oil draw/build.", ["aUSEIACS"]),
        "aUSOILDA": ("Distillate Stocks", "Thousand barrels", "Total distillate stocks, absolute change WoW.", "Weekly distillate draw/build.", ["aUSEIADS"]),
        "aUSWSETHES": ("Ethanol", "Thousand barrels", "US ending stocks of fuel ethanol — weekly.", "Ethanol blendstock. Tied to gasoline demand and corn prices.", ["aUSWPETHES"]),
        "aUSWPETHES": ("Ethanol", "Thousand barrels/day", "US oxygenate plant production of fuel ethanol — weekly.", "Production gauge.", ["aUSWSETHES"]),
        "aUSOESNA": ("Ag Trade", "Thousand metric tons", "Soybean oil export sales, net.", "Weekly USDA Export Sales report. Drives soyoil futures.", []),
    },
    "us_population": {
        "aUSGPYDPOP": ("Population", "Persons", "Disposable personal income — population component.", "Used as denominator for per-capita real disposable income — core consumer spending power gauge.", ["aUSPOPTO"]),
        "aUSPC169P": ("Working-Age Population", "Thousands", "Civilian noninstitutional population, 16-19 years (teen workforce).", "Teen labor force participation has structural decline since 2000 (more in school). Use for labor-supply modeling.", ["aUSPOPTO"]),
        "aUSPC65T9P": ("Aging Cohorts", "Thousands", "Civilian noninstitutional population, 65-69 years.", "Boomer wave. Drives Medicare enrollment growth + labor force participation patterns.", ["aUSPC70T4P", "aUSPC75AOP"]),
        "aUSPC70T4P": ("Aging Cohorts", "Thousands", "Civilian noninstitutional population, 70-74 years.", "Healthcare and Social Security demand cohort.", ["aUSPC65T9P", "aUSPC75AOP"]),
        "aUSPC75AOP": ("Aging Cohorts", "Thousands", "Civilian noninstitutional population, 75 years & over.", "Long-term care + Medicare-heavy cohort. Fastest-growing age group.", ["aUSPC70T4P"]),
        "aUSZGVCOP": ("Islamic Finance", "%", "IFDI corporate governance — Independent directors share.", "Niche US Islamic finance metric.", []),
        "aUSZGVSHP": ("Islamic Finance", "Number", "IFDI scholars with SSB (Shariah Supervisory Board) memberships.", "Niche.", []),
        "aUSZPGEDP": ("Islamic Finance", "Number", "IFDI institutions offering Islamic finance degrees in US.", "Niche.", []),
        "aUSZKGRHP": ("Islamic Finance", "Number", "IFDI peer-reviewed research articles on Islamic finance.", "Niche.", []),
        "aUSDEATH": ("Mortality", "Deaths", "Weekly deaths, all ages — CDC NCHS provisional.", "Excess mortality vs 2015-19 baseline is the cleanest pandemic + aging signal. Lagged 1-2 weeks.", ["aUSDTHAL", "aUSDTHEX"]),
        "aUSDTH14": ("Mortality", "Deaths", "Weekly deaths, 0-14 years — vs 2015-19 weekly average.", "Stable baseline; deviations signal pediatric public-health events (RSV waves, etc).", ["aUSDTHEX"]),
        "aUSDTH64": ("Mortality", "Deaths", "Weekly deaths, 15-64 years — vs 2015-19 average.", "Working-age excess mortality. Pandemic, opioid, and mental-health driven.", ["aUSDTHEX"]),
        "aUSDTH74": ("Mortality", "Deaths", "Weekly deaths, 65-74 years — vs baseline.", "Most COVID-impacted cohort during pandemic.", ["aUSDTHEX", "aUSDTHCV"]),
        "aUSDTH84": ("Mortality", "Deaths", "Weekly deaths, 75-84 years — vs baseline.", "Heavy COVID excess mortality.", ["aUSDTHEX"]),
        "aUSDTHAL": ("Mortality", "Deaths", "Weekly deaths, all ages — vs 2015-19 baseline.", "Lead pandemic / public-health signal. Returned to ~baseline post-2023.", ["aUSDEATH", "aUSDTHEX"]),
        "aUSDTH85": ("Mortality", "Deaths", "Weekly deaths, 85+ years — vs baseline.", "Highest mortality cohort. Care facility outbreaks visible here first.", ["aUSDTHEX"]),
        "aUSDTHEX": ("Mortality", "Deaths", "EXCESS deaths vs 2015-19 weekly average — all causes, all ages.", "The single cleanest mortality cycle indicator. Captures pandemic deaths whether labeled COVID or not.", ["aUSDTHAL", "aUSDEATH"]),
        "aUSDTHCV": ("Mortality", "Deaths", "Weekly deaths, COVID-19 related.", "Direct COVID mortality. Underestimates true COVID mortality (some go unrecorded). Use with excess deaths for comparison.", ["aUSDTHEX"]),
        "aUSPOP18Y": ("Age Cohorts", "Persons", "Population, 15-19 years.", "High-school cohort. Tracks education / labor-supply pipeline.", ["aUSPOP24Y"]),
        "aUSPOP24Y": ("Age Cohorts", "Persons", "Population, 20-24 years (early-career).", "Entry-level workforce + college-age. Recent stagnation = labor-supply headwind.", ["aUSPOP18Y", "aUSPOP39Y"]),
        "aUSPOP39Y": ("Age Cohorts", "Persons", "Population, 35-39 years (peak earnings, family formation).", "Drives housing / family-services demand. Millennials hitting peak.", ["aUSPOP44Y"]),
        "aUSPOP44Y": ("Age Cohorts", "Persons", "Population, 40-44 years.", "Peak-earnings cohort. Drives discretionary spending / capital-formation demand.", ["aUSPOP39Y"]),
        "aUSPOP64Y": ("Age Cohorts", "Persons", "Population, 60-64 years (pre-retirement).", "Drives 401k withdrawal patterns + early retirement decisions.", ["aUSPOP39Y", "aUSPC65T9P"]),
        "aUSPOPTO": ("Total Population", "Persons", "Total US population, all ages.", "Base for per-capita calculations. Growth slowing — 0.5%/yr now vs 1%+ historically.", ["aUSGPYDPOP"]),
        "aUSCCVKS": ("COVID Historic", "Cases", "COVID-19 total cases, Kansas (state).", "Historic pandemic series — case reporting wound down 2023.", ["aUSDTHCV"]),
        "aUSCCVMD": ("COVID Historic", "Cases", "COVID-19 total cases, Maryland.", "Historic.", ["aUSDTHCV"]),
        "aUSCCVMS": ("COVID Historic", "Cases", "COVID-19 total cases, Mississippi.", "Historic.", ["aUSDTHCV"]),
        "aUSCCVND": ("COVID Historic", "Cases", "COVID-19 total cases, North Dakota.", "Historic.", ["aUSDTHCV"]),
        "aUSDCVND": ("COVID Historic", "Deaths", "COVID-19 total deaths, North Dakota.", "Historic.", ["aUSDTHCV"]),
        "aUSDCVOH": ("COVID Historic", "Deaths", "COVID-19 total deaths, Ohio.", "Historic.", ["aUSDTHCV"]),
        "aUSDCVPA": ("COVID Historic", "Deaths", "COVID-19 total deaths, Pennsylvania.", "Historic.", ["aUSDTHCV"]),
        "aUSDCVTN": ("COVID Historic", "Deaths", "COVID-19 total deaths, Tennessee.", "Historic.", ["aUSDTHCV"]),
    },

    "us_government_debt_borrowing": {
        "aUSFEDETOS": (
            "Federal Debt", "USD millions",
            "Total federal debt outstanding — gross debt held by public + intragovernmental holdings (Social Security trust fund etc).",
            "The headline debt number politicians cite. For market impact, debt-held-by-public is more relevant (excludes intragov accounting). Watch the YoY growth and debt-to-GDP for fiscal sustainability framing.",
            ["aUSPDEBTA", "aUSPDBTR"],
        ),
        "aUSPDEBTA": (
            "Federal Debt", "USD billions",
            "Public debt outstanding — treasury securities held by the public + Federal Reserve.",
            "What actually trades. Subtract Fed holdings (SOMA) for free-float supply that competes for private capital.",
            ["aUSFEDETOS", "aUSPDBTR", "aUSSECMNSA"],
        ),
        "aUSPDBTR": (
            "Federal Debt", "% of GDP",
            "Gross public debt as percentage of GDP. The debt-burden ratio.",
            "Above ~100% historically associated with slower trend growth (academic; not deterministic). The denominator is nominal GDP — high inflation 'shrinks' the ratio without policy action.",
            ["aUSFEDETOS", "aUSPDEBTA"],
        ),
        "aUSSECMNSA": (
            "Treasury Outstanding", "USD millions",
            "Total Treasury securities outstanding (public debt). Sum of bills, notes, bonds, plus nonmarketable.",
            "Supply pipeline for Treasury auctions. Acceleration in growth implies more issuance, pressure on term premium.",
            ["aUSSECMKBA", "aUSSECMKNA", "aUSSCMKBNA", "aUSSECMKTA"],
        ),
        "aUSSECMKBA": (
            "Treasury Outstanding", "USD millions",
            "Treasury bills outstanding — short-term debt (≤1Y). The bulk of refinancing risk sits here.",
            "Heavy bill issuance keeps front-end yields elevated and TGA management active. Watch as % of total marketable debt — rising share signals fiscal stress.",
            ["aUSSECMNSA", "aUSSECMKTA"],
        ),
        "aUSSCMKBNA": (
            "Treasury Outstanding", "USD millions",
            "Treasury bonds outstanding — long-term coupon debt (>10Y). Mostly 20Y and 30Y bonds.",
            "Long-end supply impacts term premium. Bond issuance schedule announced in quarterly refunding. Demand monitored via primary dealer takedowns and indirect bidder share.",
            ["aUSSECMKNA", "aUSSECMKTA"],
        ),
        "aUSSECNGSA": (
            "Treasury Outstanding", "USD millions",
            "Nonmarketable Treasury securities held in government account series (Social Security, federal pensions, etc).",
            "Doesn't trade in markets; subtract from gross debt to get marketable supply. Mainly accounting interest.",
            ["aUSSECMNSA"],
        ),
        "aUSSECMKNA": (
            "Treasury Outstanding", "USD millions",
            "Treasury notes outstanding — coupon debt (2Y to 10Y maturity).",
            "Belly of the curve — the most common duration target for asset managers. Watch 10Y note auction stats for global demand signal.",
            ["aUSSCMKBNA", "aUSSECMKTA"],
        ),
        "aUSSECMKTA": (
            "Treasury Outstanding", "USD millions",
            "Total marketable Treasury securities — bills + notes + bonds + TIPS + FRNs.",
            "Free-float bond supply (excluding Fed). Compare against M2 to see Treasury vs broad money balance.",
            ["aUSSECMNSA", "aUSSECMKBA", "aUSSECMKNA", "aUSSCMKBNA"],
        ),
    },
}


# ============================================================
# CORRECTIONS — overrides for categories where I had wrong RICs
# Applied after the main CONTENT dict (overwrites any duplicates).
# ============================================================
CORRECTIONS: dict[str, dict[str, tuple]] = {
    "us_consumer_finance": {
        "aUSMOV659A": ("Mortgage Origination", "USD millions", "Mortgage originations, risk score 620-659 (subprime band).", "NY Fed Household Debt and Credit Report. Subprime origination volumes — sensitive to lending standards.", ["aUSMOV719A", "aUSMOVTOTA"]),
        "aUSMOV719A": ("Mortgage Origination", "USD millions", "Mortgage originations, risk score 660-719 (near-prime/middle band).", "Watch share vs prime — falling share indicates lender pullback.", ["aUSMOV759A", "aUSMOVTOTA"]),
        "aUSMOV759A": ("Mortgage Origination", "USD millions", "Mortgage originations, risk score 720-759 (prime).", "Mid-prime band. Largest share of originations historically.", ["aUSMOV719A", "aUSMOVTOTA"]),
        "aUSMOV620A": ("Mortgage Origination", "USD millions", "Mortgage originations, risk score <620 (deep subprime).", "Very small post-2008. Banks largely don't lend here; FHA dominates.", ["aUSMOV659A"]),
        "aUSMOV760A": ("Mortgage Origination", "USD millions", "Mortgage originations, risk score >760 (super-prime).", "Largest share of dollar volume. Highest credit-quality borrowers.", ["aUSMOV759A"]),
        "aUSMOVZERA": ("Mortgage Origination", "USD millions", "Mortgage originations with zero risk score.", "Niche; mostly non-credit-scoreable borrowers.", []),
        "aUSMOVTOTA": ("Mortgage Origination", "USD millions", "Total mortgage originations.", "NY Fed quarterly. Tracks housing finance volume; fell sharply 2022-23 with rate hikes.", ["aUSMOV760A", "aUSMOV759A"]),
        "aUSMEMSLA": ("Student Loans", "USD billions", "Student loans outstanding (memo item to consumer credit).", "~$1.7T total; mostly federal. Resumed payments October 2023.", ["aUSCRDOUTA"]),
        "aUSCRDTLQ": ("Consumer Credit", "%, MoM annualized", "Total consumer credit MoM% change.", "G.19 high-frequency credit-growth signal.", ["aUSCRDTLAB", "aUSCRDOUTA"]),
        "aUSCRDTLAB": ("Consumer Credit", "USD billions", "Consumer credit, monthly absolute change.", "Net credit creation flow.", ["aUSCRDTLQ", "aUSCRDTLFA"]),
        "aUSCRDEPNA": ("Credit by Lender", "USD billions", "Nonrevolving credit at depository institutions (banks).", "Bank auto + personal loan book. Half of bank consumer lending.", ["aUSCRDPFNA"]),
        "aUSCRDEPFA": ("Credit by Lender", "USD billions", "Depository institutions consumer credit, flows.", "Bank consumer-credit creation flow.", ["aUSCRDEPNA"]),
        "aUSCRDNVFB/A": ("Credit by Type", "USD billions, SAAR", "Nonrevolving credit, flows.", "Auto + student + personal loan creation flow.", ["aUSCRDTLFA"]),
        "aUSCREDAB": ("Consumer Credit", "USD billions", "Consumer credit MoM absolute change.", "Cross-check with aUSCRDTLAB.", ["aUSCRDTLAB"]),
        "aUSMEMMVA": ("Auto Loans", "USD billions", "Motor vehicle loans (memo item).", "~$1.6T outstanding. Rate-sensitive; new vs used split matters for credit risk.", ["aUSFMEMMVA"]),
        "aUSFMEMMVA": ("Auto Loans", "USD billions", "Motor vehicle loans, flows.", "Auto credit creation flow.", ["aUSMEMMVA"]),
        "aUSCREDITI/A": ("Consumer Credit", "USD billions", "Consumer credit outstanding (alternate series).", "Cross-check with aUSCRDOUTA.", ["aUSCRDOUTA"]),
        "aUSCRDOUTA": ("Consumer Credit", "USD billions", "Consumer credit outstanding — total.", "G.19 headline. Credit cards + auto + student + personal. ~$5T.", ["aUSCREDITI/A", "aUSCREDITIN/A", "aUSCREDITIR/A"]),
        "aUSNCHCINB/A": ("Consumer Credit", "USD billions, SAAR", "Consumer credit outstanding, net change at annual rate.", "Annualized credit creation rate.", ["aUSCRDOUTA"]),
        "aUSTUCICA": ("Credit by Lender", "USD billions", "Credit unions consumer credit.", "Credit unions ~12% of consumer credit. Member-owned, often cheaper rates.", ["aUSTUCICFA"]),
        "aUSTUCICFA": ("Credit by Lender", "USD billions", "Credit unions, flows.", "CU credit creation flow.", ["aUSTUCICA"]),
        "aUSFCCICA": ("Credit by Lender", "USD billions", "Finance companies consumer credit.", "Captive finance arms (Ford Motor Credit, GM Financial). Auto-heavy.", ["aUSFCCICFA"]),
        "aUSFCCICFA": ("Credit by Lender", "USD billions", "Finance companies, flows.", "Cycle-sensitive auto credit.", ["aUSFCCICA"]),
        "aUSCRDTLFA": ("Consumer Credit", "USD billions, SAAR", "Total consumer credit, flows.", "Annualized credit creation across all lender types.", ["aUSCRDTLAB"]),
        "aUSBSCICA": ("Credit by Lender", "USD billions", "Nonfinancial business consumer credit (retailer financing).", "Retailer in-house financing. Smaller channel.", ["aUSBSCICFA"]),
        "aUSBSCICFA": ("Credit by Lender", "USD billions", "Nonfinancial business, flows.", "Retailer credit creation.", ["aUSBSCICA"]),
        "aUSCUCIFNA": ("Credit by Lender", "USD billions", "Credit unions, nonrevolving credit, flows.", "CU auto/personal loan flow.", ["aUSTUCICFA"]),
        "aUSCRDPFNA": ("Credit by Lender", "USD billions", "Depository institutions, nonrevolving credit, flows.", "Bank auto+personal loan creation.", ["aUSCRDEPFA"]),
        "aUSSMCIFNA": ("Credit by Lender", "USD billions", "Federal government & Sallie Mae, nonrevolving credit, flows.", "Federal student loan flow. Large negative flows during pause years.", ["aUSMEMSLA"]),
        "aUSFFCCFNA": ("Credit by Lender", "USD billions", "Finance companies nonrevolving credit, flows.", "Captive auto-finance flow.", ["aUSFCCICFA"]),
        "aUSBSCIFNA": ("Credit by Lender", "USD billions", "Nonfinancial business, nonrevolving credit, flows.", "Retailer installment credit flow.", ["aUSBSCICFA"]),
        "aUSCRCDACR": ("Interest Rates", "%", "Credit card APR at commercial banks, all accounts.", "G.19 quarterly. ~22% in 2024 — record high. Spread to fed funds widened sharply.", ["aUSDSPCRA/A"]),
        "aUSCREDITIN/A": ("Consumer Credit", "USD billions", "Nonrevolving installment credit (auto/student/personal).", "Larger than revolving. Student loans biggest piece.", ["aUSCRDOUTA"]),
        "aUSCREDITIR/A": ("Consumer Credit", "USD billions", "Revolving installment credit (credit cards).", "Hit $1.2T+. Watch growth rate alongside delinquencies.", ["aUSCRDOUTA"]),
        "aUSCRDTNQ": ("Nonrevolving Credit", "%, MoM annualized", "Nonrevolving consumer credit MoM% change.", "Auto/student/personal credit-growth signal.", ["aUSCRDTNAB"]),
        "aUSCRDTNAB": ("Nonrevolving Credit", "USD billions", "Nonrevolving consumer credit, MoM absolute change.", "Net non-revolving credit flow.", ["aUSCRDTNQ"]),
        "aUSCICNRVA": ("Nonrevolving Credit", "USD billions", "Nonrevolving consumer credit outstanding.", "Total non-revolving credit. Auto + student + personal.", ["aUSCREDITIN/A"]),
        "aUSCUCICNA": ("Nonrevolving Credit", "USD billions", "Nonrevolving credit at credit unions.", "CU non-revolving book.", ["aUSCICNRVA"]),
        "aUSFCCICNA": ("Nonrevolving Credit", "USD billions", "Nonrevolving credit at finance companies.", "Captive auto + personal.", ["aUSCICNRVA"]),
        "aUSCICNFNA": ("Nonrevolving Credit", "USD billions, SAAR", "Nonrevolving consumer credit, flows.", "Total non-revolving credit creation flow.", ["aUSCICNRVA"]),
        "aUSBSCICOA": ("Nonrevolving Credit", "USD billions", "Nonrevolving credit at nonfinancial business (retailers).", "Retailer in-house non-revolving lending.", ["aUSCICNRVA"]),
        "aUSFICICNA": ("Nonrevolving Credit", "USD billions", "Nonrevolving credit, securitized asset pools.", "Auto/student loans bundled into ABS.", ["aUSCICNRVA"]),
        "aUSFORIDB/A": ("Debt Burden", "%", "Financial obligations ratio (FOR).", "Broader than DSR — includes rent, auto leases, property tax, insurance. Better gauge for renters.", ["aUSDSPIDB/A"]),
        "aUSDSPIDB/A": ("Debt Burden", "%", "Household debt service ratio (DSR) — debt payments / disposable income.", "Master household-leverage gauge. ~10% currently — well below 2008 peak (~13%).", ["aUSFORIDB/A"]),
    },

    "us_balance_of_payments": {
        "aUSCAPAC/A": ("Capital Account", "USD millions", "Capital account balance.", "Tiny line — debt forgiveness, capital transfers. Mostly rounding error.", ["aUSCAFBAL/A"]),
        "aUSCURAC": ("Current Account", "USD millions", "Current account balance — total.", "BEA quarterly. Goods deficit + services surplus + primary income + secondary. ~$200-300B/qtr deficit.", ["aUSCURAC/A", "aUSCUBAL/A", "aUSCURAAB"]),
        "aUSGS/A": ("Goods Trade", "USD millions", "Goods trade balance.", "Goods deficit — largest component of CA deficit.", ["aUSCUBAL/A", "aUSCUSERV/A"]),
        "aUSCUBAL/A": ("Current Account", "USD millions", "Goods and services balance.", "Trade balance excluding income flows. Goods deficit + services surplus.", ["aUSGS/A", "aUSCUSERV/A"]),
        "aUSBALFAT/A": ("Financial Account", "USD millions", "Financial account, net lending or borrowing from financial transactions.", "Mirror of current account by accounting identity.", ["aUSFINACF/A"]),
        "aUSCUIV/A": ("Primary Income", "USD millions", "Primary income balance — net investment income from abroad.", "US owns large foreign assets — earns income. Declining surplus as foreign holdings of US grow.", ["aUSCURACTRN/A"]),
        "aUSCURACTRN/A": ("Secondary Income", "USD millions", "Secondary income balance — net transfers (foreign aid, remittances).", "Consistently negative — US is net payer of transfers.", ["aUSCUIV/A"]),
        "aUSCUSERV/A": ("Services Trade", "USD millions", "Services balance.", "Persistent surplus. Financial, IP licensing, travel, business services.", ["aUSGS/A", "aUSCURACEXS/A", "aUSCURACIMS/A"]),
        "aUSCURAAB": ("Current Account", "USD millions", "Current account — alternate series.", "Cross-check with aUSCURAC.", ["aUSCURAC"]),
        "aUSCURAC/A": ("Current Account", "USD millions", "Current account balance — alternate series.", "Cross-check.", ["aUSCURAC"]),
        "aUSCURACCGS/A": ("Current Account", "USD millions", "Exports of goods and services + income receipts.", "Total inflows side of CA.", ["aUSCURACDGS/A"]),
        "aUSCURACEXG/A": ("Goods Exports", "USD millions", "Exports of goods (CA basis).", "Largest export category.", ["aUSCURACEXS/A"]),
        "aUSCURACEXS/A": ("Services Exports", "USD millions", "Exports of services.", "Financial + IP + travel. Persistent surplus driver.", ["aUSCURACEXG/A"]),
        "aUSCURACDGS/A": ("Current Account", "USD millions", "Imports of goods and services + income payments.", "Total outflows side of CA.", ["aUSCURACCGS/A"]),
        "aUSCURACIMG/A": ("Goods Imports", "USD millions", "Imports of goods (CA basis).", "Largest import category. Consumer + capital goods.", ["aUSCURACIMS/A"]),
        "aUSCURACIMS/A": ("Services Imports", "USD millions", "Imports of services.", "Travel, transport, royalties, business services.", ["aUSCURACIMG/A"]),
        "aUSFINACF/A": ("Financial Account", "USD millions", "Financial account, net US incurrence of liabilities ex derivatives.", "Foreign claims on US — capital inflows funding deficit.", ["aUSBALFAT/A"]),
        "aUSIVDFA": ("FDI Inflows", "USD millions", "Foreign direct investment IN the US — total.", "Inward FDI. ~$5T cumulative stock. UK, Japan, Netherlands largest sources.", ["aUSIVDAA"]),
        "aUSIVDFAUA": ("FDI Inflows", "USD millions", "FDI in US from Australia.", "Smaller bilateral.", ["aUSIVDFA"]),
        "aUSIVDFCNA": ("FDI Inflows", "USD millions", "FDI in US from Canada.", "Major bilateral; Canadian banks, energy, retail.", ["aUSIVDFA"]),
        "aUSIVDFBDA": ("FDI Inflows", "USD millions", "FDI in US from Germany.", "Top-5 source. Auto + chemicals + industrial.", ["aUSIVDFA"]),
        "aUSIVDFJPA": ("FDI Inflows", "USD millions", "FDI in US from Japan.", "Top-3 source. Auto manufacturing + financial services.", ["aUSIVDFA"]),
        "aUSIVDFUKA": ("FDI Inflows", "USD millions", "FDI in US from UK.", "Largest single bilateral source. Financial + media + pharma.", ["aUSIVDFA"]),
        "aUSIVDAAUA": ("FDI Outflows", "USD millions", "US direct investment in Australia.", "Resource sector + financial.", ["aUSIVDAA"]),
        "aUSIVDACNA": ("FDI Outflows", "USD millions", "US direct investment in Canada.", "Largest single bilateral. Energy + financial + manufacturing.", ["aUSIVDAA"]),
        "aUSIVDABDA": ("FDI Outflows", "USD millions", "US direct investment in Germany.", "Manufacturing + financial.", ["aUSIVDAA"]),
        "aUSIVDAMXA": ("FDI Outflows", "USD millions", "US direct investment in Mexico.", "Manufacturing-heavy (USMCA). Auto, electronics nearshoring.", ["aUSIVDAA"]),
        "aUSIVDAUKA": ("FDI Outflows", "USD millions", "US direct investment in UK.", "Largest European bilateral. Financial + business services.", ["aUSIVDAA"]),
        "aUSIVDAA": ("FDI Outflows", "USD millions", "US direct investment abroad — total.", "~$6T cumulative stock. Larger than inward FDI.", ["aUSIVDFA"]),
        "aUSCAFBAL/A": ("Capital + Financial", "USD millions", "Capital and financial account balance, current prices.", "BoP capital + financial accounts combined.", ["aUSCAPAC/A", "aUSBALFAT/A"]),
        "aUSCCURQ/A": ("CA % GDP", "%", "Current account balance as % of GDP, standardized.", "Sustainability gauge. ~3% deficit normal for reserve currency. >5% historical warning.", ["aUSCURAC", "aUSCCURB/A"]),
        "aUSCCURPQ/A": ("CA % GDP", "pp", "CA % GDP, QoQ standardized change.", "Quarterly variability.", ["aUSCCURQ/A"]),
        "aUSCCURYQ/A": ("CA % GDP", "pp", "CA % GDP, YoY standardized change.", "Trend signal.", ["aUSCCURQ/A"]),
        "aUSCCURB/A": ("Current Account", "USD billions", "Current account balance, standardized.", "OECD-comparable framing.", ["aUSCURAC"]),
        "aUSCCURPB/A": ("Current Account", "USD billions", "CA balance, QoQ absolute change.", "Quarterly delta.", ["aUSCCURB/A"]),
        "aUSCCURYB/A": ("Current Account", "USD billions", "CA balance, YoY absolute change.", "Annual delta.", ["aUSCCURB/A"]),
        "aUSCEXBPA": ("Goods Exports", "%, MoM", "Exports of goods, BoP basis, standardized MoM%.", "Goods-export growth signal.", ["aUSCEXBYA", "aUSCEXBA"]),
        "aUSCEXBYA": ("Goods Exports", "%, YoY", "Exports of goods, BoP basis, YoY%.", "Trend goods-export growth.", ["aUSCEXBPA"]),
        "aUSCEXBA": ("Goods Exports", "USD billions", "Exports of goods, BoP basis, level standardized.", "Exports level.", ["aUSCURACEXG/A"]),
        "aUSCIMBPA": ("Goods Imports", "%, MoM", "Imports of goods, BoP basis, standardized MoM%.", "Goods-import growth.", ["aUSCIMBYA", "aUSCIMBA"]),
        "aUSCIMBYA": ("Goods Imports", "%, YoY", "Imports of goods, BoP basis, YoY%.", "Trend goods-import growth.", ["aUSCIMBPA"]),
        "aUSCIMBA": ("Goods Imports", "USD billions", "Imports of goods, BoP basis, level standardized.", "Imports level.", ["aUSCURACIMG/A"]),
        "aUSCBOPA": ("Trade Balance", "USD billions", "Visible trade balance, BoP basis, standardized.", "Goods-only deficit. Same as aUSGS/A in different framing.", ["aUSGS/A"]),
        "aUSCBOPPA": ("Trade Balance", "USD billions", "Visible trade balance, MoM absolute change.", "Monthly trade-deficit delta.", ["aUSCBOPA"]),
        "aUSCBOPYA": ("Trade Balance", "USD billions", "Visible trade balance, YoY absolute change.", "Annual trade-deficit delta.", ["aUSCBOPA"]),
    },

    "us_consumer_surveys": {
        "aUSHAI": ("Housing Affordability", "Index", "National Housing Affordability Index — composite. NAR.", "100 = median family can afford median home. Below 100 = affordability stress. Hit ~95 in 2023 — record low.", ["aUSHOIMED"]),
        "aUSHOIMED": ("Housing Affordability", "USD", "Housing Affordability Index, median family income input.", "Denominator for HAI. Tracks median family income.", ["aUSHAI"]),
        "aUSMSNPAH": ("Misc Surveys", "Index", "Mislabeled volume index — Reuters consumer surveys.", "Cross-check raw source before using.", []),
        "aUSMSNEAH": ("Misc Surveys", "Index", "Mislabeled volume index — Reuters consumer surveys.", "Cross-check raw source.", []),
        "aUSMSNAH": ("Misc Surveys", "Index", "Mislabeled volume index — Reuters consumer surveys.", "Cross-check raw source.", []),
        "aUSIPSOAR": ("Ipsos", "Index", "Reuters poll: Ipsos consumer index actual.", "Alternate consumer mood gauge.", ["aUSCCIPSOR"]),
        "aUSIBDECOP": ("Optimism Index", "Index", "RCM/TIPP Economic Optimism Index.", "Investor's Business Daily monthly gauge. Pairs with UMich and Conference Board.", []),
        "aUSBCIACEBC": ("Conference Board", "Index", "Average consumer expectations for business and economic conditions.", "Composite expectations gauge.", ["aUSCONCE/A"]),
        "aUSCONCFP/A": ("Conference Board", "Index", "CB Consumer Confidence — Present Situation sub-index.", "Current-conditions gauge. Lags Expectations sub-index in turning points.", ["aUSCONCF/A", "aUSCONCE/A"]),
        "aUSFBUSCB/A": ("Conference Board", "%", "CB future business conditions, % saying 'better'.", "Bullish-expectations percentage.", ["aUSFBUSCS/A", "aUSFBUSCW/A"]),
        "aUSFBUSCS/A": ("Conference Board", "%", "CB future business conditions, % saying 'same'.", "Neutral/ambivalent percentage.", ["aUSFBUSCB/A", "aUSFBUSCW/A"]),
        "aUSFBUSCW/A": ("Conference Board", "%", "CB future business conditions, % saying 'worse'.", "Bearish-expectations percentage. Sustained rises signal recession risk.", ["aUSFBUSCB/A"]),
        "aUSFUEMPFJ/A": ("Conference Board", "%", "CB future employment, % expecting fewer jobs.", "Bearish labor expectation. Watches with NFP.", ["aUSFUEMPMJ/A"]),
        "aUSFUEMPMJ/A": ("Conference Board", "%", "CB future employment, % expecting more jobs.", "Bullish labor expectation.", ["aUSFUEMPFJ/A"]),
        "aUSCONEMS/A": ("Conference Board", "%", "CB future employment, % expecting same.", "Neutral labor expectation.", ["aUSFUEMPFJ/A"]),
        "aUSFUIDECR/A": ("Conference Board", "%", "CB future income, % expecting decrease.", "Bearish income outlook.", ["aUSCONFUIR/A"]),
        "aUSCONFUIR/A": ("Conference Board", "%", "CB future income, % expecting increase.", "Bullish income outlook.", ["aUSFUIDECR/A"]),
        "aUSCONFUIS/A": ("Conference Board", "%", "CB future income, % expecting same.", "Neutral income outlook.", ["aUSCONFUIR/A"]),
        "aUSCBCLM": ("Buying Plans", "%", "CB plans to buy car within 6 months.", "Forward auto demand. Leads vehicle sales by 1-2 quarters.", ["aUSMAPPL6"]),
        "aUSMAPPL6": ("Buying Plans", "%", "CB plans to buy major appliances within 6 months.", "Big-ticket discretionary. Tied to housing turnover.", ["aUSCBCLM"]),
        "aUSPBCBAD/A": ("Conference Board", "%", "CB present business conditions, % saying 'bad'.", "Bearish current-conditions percentage.", ["aUSPBCGUD/A", "aUSPBCNOR/A"]),
        "aUSPBCGUD/A": ("Conference Board", "%", "CB present business conditions, % saying 'good'.", "Bullish current-conditions percentage.", ["aUSPBCBAD/A"]),
        "aUSPBCNOR/A": ("Conference Board", "%", "CB present business conditions, % saying 'normal'.", "Neutral percentage.", ["aUSPBCBAD/A"]),
        "aUSPEMPHG/A": ("Labor Outlook", "%", "CB present employment, % saying jobs hard to get.", "Cleanest household-survey labor read. Rising = labor market loosening.", ["aUSPEMPJOP/A", "aUSPEMPNSP/A"]),
        "aUSPEMPNSP/A": ("Labor Outlook", "%", "CB present employment, % saying jobs not so plentiful.", "Mid-tier labor read.", ["aUSPEMPHG/A", "aUSPEMPJOP/A"]),
        "aUSPEMPJOP/A": ("Labor Outlook", "%", "CB present employment, % saying jobs plentiful.", "Bullish labor read. Falling = labor market loosening.", ["aUSPEMPHG/A"]),
        "aUSCONCAQ/C": ("Composite", "Index", "Consumer confidence — composite indicator.", "OECD-style composite.", ["aUSCONCF/A"]),
        "aUSUMERAPH": ("UMich", "Index", "Consumer Expectations Index (UMich).", "UMich forward-looking sub-index. Most market-relevant of UMich subseries.", ["aUSUMSRAPH", "aUSCONCFEX"]),
        "aUSUMSRAPH": ("UMich", "Index", "Consumer Sentiment Index (UMich) headline.", "UMich headline sentiment. More inflation-sensitive than Conference Board.", ["aUSCSIUM", "aUSUMERAPH"]),
        "aUSUMCRAPH": ("UMich", "Index", "Current Conditions Index (UMich).", "UMich present-conditions sub-index.", ["aUSUMCPAPH", "aUSCONCFP"]),
        "aUSUMCPAPH": ("UMich", "Index", "Current Conditions Index, preliminary release.", "Mid-month preliminary.", ["aUSUMCRAPH"]),
        "aUSUM1PAPR": ("UMich", "Index", "UMich total preliminary headline.", "Mid-month headline preliminary release.", ["aUSUMSRAPH"]),
        "aUSUMEPAPH": ("UMich", "Index", "UMich preliminary expectations sub-index.", "Mid-month forward-looking preliminary.", ["aUSUMERAPH"]),
        "aUSUMSPAPH": ("UMich", "Index", "UMich preliminary sentiment sub-index.", "Mid-month sentiment preliminary.", ["aUSUMSRAPH"]),
        "aUSUM1FRA": ("Inflation Expectations", "%", "UMich 1-year inflation expectation, final.", "Most-watched short-term inflation gauge. Fed monitors closely.", ["aUSUM5FRA", "aUSINFEXM1Y"]),
        "aUSUM5FRA": ("Inflation Expectations", "%", "UMich 5-year inflation expectation, final.", "Long-term anchor. Sub-3% = anchored; spikes signal Fed credibility risk.", ["aUSUM1FRA", "aUSINFEXM5Y"]),
        "aUSUM5PRA": ("Inflation Expectations", "%", "UMich 5-year inflation expectation, preliminary.", "Mid-month preliminary.", ["aUSUM5FRA"]),
        "aUSINFEXM1Y": ("Inflation Expectations", "%", "UMich 1-year inflation expectation — alternate.", "Cross-check with aUSUM1FRA.", ["aUSUM1FRA"]),
        "aUSINFEXM5Y": ("Inflation Expectations", "%", "UMich 5-year inflation expectation — alternate.", "Cross-check.", ["aUSUM5FRA"]),
        "aUSCONCFEX": ("UMich", "Index", "UMich Consumer Expectations Index — alternate.", "Cross-check with aUSUMERAPH.", ["aUSUMERAPH"]),
        "aUSCSIUM": ("UMich", "Index", "UMich Consumer Sentiment Index — alternate.", "Cross-check with aUSUMSRAPH.", ["aUSUMSRAPH"]),
        "aUSCONCFP": ("UMich", "Index", "UMich Current Conditions Index — alternate.", "Cross-check with aUSUMCRAPH.", ["aUSUMCRAPH"]),
    },

    "us_domestic_finance": {
        "aUSBCLCOOQ/A": ("Charge-offs", "%", "Charge-off rate, consumer loans other (auto + personal).", "Auto charge-offs have surged 2023-24, especially subprime.", ["aUSBCLCOQ/A"]),
        "aUSBCLEASQ/A": ("Charge-offs", "%", "Charge-off rate, leases (equipment, vehicles).", "Lease portfolios in commercial finance.", []),
        "aUSBCLALQ/A": ("Charge-offs", "%", "Charge-off rate, total loans and leases.", "Aggregate bank-credit-loss gauge.", ["aUSBCLCAIQ/A", "aUSBCLCOQ/A"]),
        "aUSBDLCOOQ/A": ("Delinquencies", "%", "Delinquency rate, consumer loans other.", "Auto + personal early-stage stress.", ["aUSBDLCOQ/A"]),
        "aUSBDLEASQ/A": ("Delinquencies", "%", "Delinquency rate, leases.", "Lease portfolios.", []),
        "aUSBDLALQ/A": ("Delinquencies", "%", "Delinquency rate, total loans and leases.", "Aggregate gauge. Watch with SLOOS standards.", ["aUSBDLCAIQ/A", "aUSBDLCOQ/A"]),
        "aUSMGFSHQ/A": ("Foreclosures", "%", "Mortgage foreclosures started.", "MBA quarterly survey. Tame; ~0.3% — half pre-2008 levels.", ["aUSMGFIHR"]),
        "aUSMGDHQ/A": ("Mortgages", "%", "All loans, total past due.", "MBA quarterly delinquency. Combined 30/60/90+ days.", ["aUSMGD3HQ/A", "aUSMGD6HQ/A", "aUSMGD9HQ/A"]),
        "aUSMGFIHR": ("Foreclosures", "%", "All loans in foreclosure at end of quarter.", "Stock of in-process foreclosures. Plummeted with strong housing market.", ["aUSMGFSHQ/A"]),
        "aUSMGD3HQ/A": ("Mortgages", "%", "All loans, 30 days past due.", "Earliest-stage mortgage stress.", ["aUSMGDHQ/A"]),
        "aUSMGD6HQ/A": ("Mortgages", "%", "All loans, 60 days past due.", "Mid-stage mortgage stress.", ["aUSMGDHQ/A"]),
        "aUSMGD9HQ/A": ("Mortgages", "%", "All loans, 90 days past due.", "Serious delinquency. Most likely to lead to foreclosure.", ["aUSMGDHQ/A"]),
        "aUSMALSO/A": ("Servicing", "USD billions", "Mortgage loans serviced, all.", "Master servicing book size. Concentrated in top servicers.", []),
        "aUSMGAAQ": ("MBA Apps", "%, WoW", "MBA mortgage applications WoW change.", "MBA Weekly Survey. Real-time housing-finance demand pulse.", ["aUSMAH/A"]),
        "aUSMGPIAG": ("MBA Apps", "Index", "MBA Purchase Index.", "Purchase-mortgage application index. Housing demand gauge.", ["aUSMACP/A"]),
        "aUSMGMAG": ("MBA Apps", "Index", "MBA Mortgage Market Composite Index.", "Composite of purchase + refi.", ["aUSMACI/A"]),
        "aUSMGRAG": ("MBA Apps", "Index", "MBA Mortgage Refinance Index.", "Highly rate-sensitive — surges when rates fall.", ["aUSMACRI/A"]),
        "aUSMAH/A": ("MBA Apps", "%, WoW", "Mortgage applications WoW change.", "Cross-check with aUSMGAAQ.", ["aUSMGAAQ"]),
        "aUSMTCMI/A": ("MBA Apps", "Index", "Mortgage applications, conventional refinance index.", "Conventional refi applications.", ["aUSMACRI/A"]),
        "aUSMTGMI/A": ("MBA Apps", "Index", "Mortgage applications, government refinance index.", "FHA/VA refi applications.", ["aUSMACRI/A"]),
        "aUSMACI/A": ("MBA Apps", "Index", "Mortgage applications, market composite index.", "MBA composite gauge.", ["aUSMGMAG"]),
        "aUSMACP/A": ("MBA Apps", "Index", "Mortgage applications, market composite, purchase.", "Purchase-only composite.", ["aUSMGPIAG"]),
        "aUSMACRI/A": ("MBA Apps", "Index", "Mortgage applications, market composite, refinancing.", "Refi composite. Rate-cycle bellwether.", ["aUSMGRAG"]),
    },
}


# ============================================================================
#  CONDENSED-MAP HAND CURATION
#  Detailed entries for the ~160 RICs in the investor-focused condensed graph.
#  Written specifically (not template-derived) so the mini-graph + popup show
#  genuine analyst-grade context for the most-watched series.
# ============================================================================
CONDENSED_HAND: dict[str, dict[str, tuple]] = {

    # ============== INFLATION DEEP DIVE ==============
    "us_consumer_prices_inflation": {
        "aUSCPI": (
            "CPI Headline", "Index (1982-84=100)",
            "Headline Consumer Price Index — level. The BLS basket-weighted average price for urban consumers across food, energy, shelter, transportation, medical care, and services. Released ~mid-month, lagged one month.",
            "Use the YoY change (aUSCPIYYR) for inflation reads; use the level for cross-series comparisons or splicing onto historical data. The index level itself is rarely market-moving — the YoY change is. Headline includes volatile food + energy; pair with core (aUSCPIXFE/A) to filter noise.",
            ["aUSCPIYYR", "aUSCPIXFE/A", "aUSCPFYAR", "aUSPCEYAR"],
        ),
        "aUSCPIXFE/A": (
            "CPI Core", "Index (1982-84=100)",
            "Core CPI level — All items excluding food and energy. Strips out the two most volatile components, giving the cleanest read on underlying inflation pressure.",
            "Watch the YoY (aUSCPFYAR) for trend. Within core: shelter is ~40% of the index and the stickiest component; if shelter inflation slows, core decelerates with a lag. Used by analysts to call the Fed reaction function alongside core PCE.",
            ["aUSCPFYAR", "aUSCPI", "aUSCPIYYR", "aUSPCEMAR"],
        ),
        "aUSCPFYAR": (
            "CPI Core", "%, YoY",
            "Year-over-year change in Core CPI. Most-watched non-Fed-target inflation gauge: market reads first, Fed officials cross-reference with core PCE.",
            "Compare against Fed's 2% PCE target (CPI typically runs 30-50bp above PCE). >3% YoY is hot; <2.5% suggests Fed can ease. Decompose by shelter vs core services ex-shelter ('supercore') vs core goods to read the next move.",
            ["aUSCPIYYR", "aUSPCE2AR", "aUSPCEMAR", "aUSEMPCI/A"],
        ),
        "aUSPCEMAR": (
            "PCE Core", "%, MoM",
            "Core PCE price index, month-over-month change — the Fed's PREFERRED inflation gauge against which the 2% target is officially measured. Released with BEA Personal Income & Outlays, ~2 weeks after CPI.",
            "Annualize the 6-month rate when reading FOMC commentary. ~0.17%/mo (~2% annualized) is target-consistent; sustained 0.3%+ prints are hawkish. Differs from core CPI in basket (less shelter weight, more healthcare) and chain-weighting.",
            ["aUSPCE2AR", "aUSPCEYAR", "aUSCPIXFE/A", "aUSCPFYAR"],
        ),
        "aUSPCE2AR": (
            "PCE Core", "%, YoY",
            "Core PCE YoY — the inflation series the Fed dot plot targets. The single most-important inflation read for US monetary policy.",
            "Spread to headline PCE shows energy/food contribution. Spread to core CPI shows basket-composition effects (CPI overweights shelter, PCE overweights healthcare). Sub-3% YoY allows Fed cuts; sub-2.5% allows aggressive cuts.",
            ["aUSPCEMAR", "aUSPCEYAR", "aUSCPFYAR", "aUSEMPCI/A"],
        ),
        "aUSPCEYAR": (
            "PCE Headline", "%, YoY",
            "Headline PCE price index YoY — the broader Fed inflation gauge including food and energy. Released alongside Core PCE in the BEA Personal Income & Outlays report.",
            "Use this for popular-press inflation comparisons. Fed officially targets the 2-year average of headline PCE per the 2020 Flexible Average Inflation Targeting framework, but day-to-day commentary references core PCE. Energy passes through within 1 month, food within 2-3 months.",
            ["aUSPCEAR", "aUSPCE2AR", "aUSCPIYYR", "aUSPCEMAR"],
        ),
        "aUSPCEAR": (
            "PCE Headline", "%, MoM",
            "Headline PCE MoM. Released same day as core PCE MoM in BEA's Personal Income & Outlays report.",
            "Track the spread to core PCE: positive = energy/food adding to inflation; negative = subtracting. Headline-core spread is volatile month-to-month but mean-reverts; Fed looks through it for short bursts.",
            ["aUSPCEMAR", "aUSPCEYAR", "aUSCPIYYR"],
        ),
        "aUSPFDAR": (
            "PPI Final Demand", "%, YoY",
            "Producer Price Index for Final Demand, YoY change. Measures average prices RECEIVED by domestic producers for output sold to final demand (consumers, businesses, government, exports).",
            "Leads CPI by 1-3 months for goods inflation. Final-demand SERVICES PPI specifically feeds directly into core PCE via the BEA's source-data mapping — watch it for Core PCE forecasting. Spike in PPI without CPI follow-through implies producer margin compression.",
            ["aUSPFDEAR", "aUSPFDGAR", "aUSPFDEMDE/A", "aUSCPIYYR"],
        ),
        "aUSPFDEAR": (
            "PPI Final Demand", "%, MoM",
            "PPI Final Demand month-over-month change. Released first week of each month, ahead of CPI.",
            "Mid-month CPI release usually corroborates direction. PPI-CPI gap that doesn't close = margin pressure on producers (bearish for corporate margins). Sub-components: PPI services > PPI goods for the past decade.",
            ["aUSPFDAR", "aUSPFDEMDE/A"],
        ),
        "aUSPFDGAR": (
            "PPI Core", "%, YoY",
            "Core PPI YoY — Producer Prices Final Demand less foods and energy. The producer-side equivalent of core CPI.",
            "Cleaner pipeline-inflation signal than headline PPI. Tracks Core PCE goods inflation closely. Watch alongside USD trade-weighted: stronger USD lowers imported intermediate input costs.",
            ["aUSPFDAR", "aUSPFDEMDE/A", "aUSCPFYAR"],
        ),
        "aUSPFDEMDE/A": (
            "PPI Final Demand", "Index",
            "PPI Final Demand index level. Comprehensive producer-price gauge spanning goods + services sold to final demand.",
            "Use the YoY (aUSPFDAR) for inflation reads; the level is a base for splicing or rebasing analysis. Released ~one week before headline CPI each month.",
            ["aUSPFDAR", "aUSPFDEAR", "aUSPFDGAR"],
        ),
        "aUSIMPP": (
            "Import Prices", "Index",
            "US Import Price Index, all commodities. Direct pass-through of foreign goods prices and USD strength to US consumer goods inflation.",
            "Strong USD → lower import prices → lower goods CPI (1-3mo lag). Crude oil dominates historically; ex-petroleum import prices are the cleaner core read. Pair with USD trade-weighted (aUSCXTWF/C) to isolate FX-driven vs underlying foreign-price moves.",
            ["aUSIMPAR", "aUSEXPP", "aUSCXTWF/C", "aUSCPIYYR"],
        ),
        "aUSIMPAR": (
            "Import Prices", "%, MoM",
            "Import Prices MoM change. Released ~mid-month with BLS Import/Export Price Indexes report.",
            "Direct CPI input — feeds goods inflation 1-2 months out. Consensus surprises here move USD intraday. Watch ex-petroleum for cleaner signal.",
            ["aUSIMPP", "aUSEXPAR"],
        ),
        "aUSEXPP": (
            "Export Prices", "Index",
            "US Export Price Index, all commodities. Reflects US producers' pricing power abroad.",
            "Combined with import prices gives terms-of-trade signal — improving ToT lifts real income. Agricultural exports (food + soybean) drive much of the volatility historically; non-ag export prices track manufactured-goods pricing power.",
            ["aUSEXPAR", "aUSIMPP"],
        ),
        "aUSEXPAR": (
            "Export Prices", "%, MoM",
            "Export Prices MoM change. Released alongside import prices in the BLS Import/Export PPI release.",
            "Less market-moving than import prices. Watch as a US-producer pricing-power gauge — high export-price growth = pricing power.",
            ["aUSEXPP", "aUSIMPAR"],
        ),
        "aUSINFEXM1Y": (
            "Inflation Expectations", "%",
            "UMich 1-year-ahead inflation expectation. The most market-watched short-term consumer inflation expectation. Released twice per month (preliminary mid-month, final at month-end).",
            "Sticky around 3% in normal times; surges in 2021-22 worried Powell about de-anchoring. The Fed monitors closely — sustained levels >4% would be alarming. Pair with 5Y expectations for short vs long anchor read.",
            ["aUSINFEXM5Y", "aUSCSIUM", "aUSCPIYYR"],
        ),
        "aUSINFEXM5Y": (
            "Inflation Expectations", "%",
            "UMich 5-10 year-ahead inflation expectation — the long-run anchor. The single most important sentiment-based inflation gauge for FOMC participants.",
            "Sub-3% historically signals 'anchored' expectations; sustained moves above 3.2% signal de-anchoring risk and would typically trigger more hawkish Fed talk. Less volatile than 1Y but more meaningful for long-term policy stance.",
            ["aUSINFEXM1Y", "aUSCSIUM", "aUSPCE2AR"],
        ),
    },

    # ============== PCE / CONSUMPTION ==============
    "us_consumptions": {
        "aUSGPC/CA": (
            "PCE Real", "USD billions, real",
            "Real Personal Consumption Expenditures level (chained dollars). The largest component of GDP at ~70%, the dominant cyclical driver of US economic activity.",
            "Watch the MoM growth in real terms (aUSGPCSAR) — that directly feeds GDP. Decompose by durables/non-durables/services: durables most cyclical, services most stable. Real PCE deceleration is the leading edge of recession risk.",
            ["aUSGPCSAR", "aUSGPYD", "aUSCRETF/C", "aUSCGDPPD/A"],
        ),
        "aUSGPCSAR": (
            "PCE Real", "%, MoM",
            "Real PCE month-over-month change. Released with BEA Personal Income & Outlays. The cleanest real-time consumer activity gauge.",
            "Above 0.4% MoM is a hot consumer; flat or negative readings raise recession concern. Combine with real DPI growth (aUSGPYD) for whether spending is income-funded or savings-drawdown-funded.",
            ["aUSGPC/CA", "aUSGPYD", "aUSNS06L2", "aUSCRETF/C"],
        ),
        "aUSGPYD": (
            "Disposable Income", "USD billions, real",
            "Real Disposable Personal Income — household after-tax income deflated by PCE prices. The master consumer-spending-power gauge.",
            "Diverging from nominal DPI (aUSGPYD/A) shows how much real-purchasing-power growth comes from inflation vs nominal income gains. Sustained negative real DPI growth is recessionary.",
            ["aUSGPYD/A", "aUSGPC/CA", "aUSNS06L2"],
        ),
        "aUSGPYD/A": (
            "Disposable Income", "USD billions",
            "Nominal Disposable Personal Income — household after-tax income in current dollars.",
            "Use real DPI for cycle reads; nominal for fiscal-share calculations (e.g., debt/income ratios). Wage income, transfer payments, and investment income are the major components.",
            ["aUSGPYD", "aUSGPC/CA", "aUSNS06L2"],
        ),
        "aUSNS06L2": (
            "Saving", "%",
            "Personal saving as a percentage of disposable personal income — the saving rate. The residual: (DPI − consumption) / DPI.",
            "Hovers ~4-5% currently — historically low (long-run avg ~7-9%). When the saving rate falls, consumption is being funded by drawing down past savings — unsustainable. Spiked to 33% during 2020 COVID stimulus, drained quickly through 2021-22.",
            ["aUSGPYD", "aUSGPC/CA", "aUSCRDOUTA"],
        ),
    },

    # ============== LABOR ==============
    "us_employment_hours": {
        "aUSNFARM/A": (
            "Nonfarm Payrolls", "Thousands",
            "Total nonfarm payroll employment level. The headline US 'jobs number' from the BLS establishment survey, released first Friday each month.",
            "Single most market-moving US data release. Watch (a) MoM change vs consensus, (b) prior-month revisions (often +/-50k swings), (c) sectoral breakdown (private services vs goods vs government), (d) hours-worked + average earnings released alongside. Pair with U-3 from the household survey for full picture.",
            ["aUSNFARMP/A", "aUSEMPADP/A", "aUSUNTOTR", "aUSEARNH/A"],
        ),
        "aUSNFARMP/A": (
            "Nonfarm Payrolls", "Thousands",
            "Total private-sector nonfarm payroll employment — excludes government workers. The cyclical part of NFP.",
            "Stripping out government employment (which is policy-driven, not cyclical) gives a cleaner read on private-sector hiring. Government swing months (e.g., census hiring/layoff) make headline NFP misleading; private payrolls are what the Fed really watches.",
            ["aUSNFARM/A", "aUSEMPADP/A"],
        ),
        "aUSEMPADP/A": (
            "Nonfarm Payrolls", "Thousands",
            "ADP private-sector employment estimate — released two days BEFORE the official BLS NFP. Based on ADP's payroll-processing client base.",
            "Methodology overhaul in 2022 made ADP a less-reliable NFP predictor. Use as a sectoral cross-check, not as a leading indicator of the BLS print. ADP captures small business better than BLS; BLS captures large + government better.",
            ["aUSNFARM/A", "aUSNFARMP/A"],
        ),
        "aUSJOLTAO": (
            "JOLTS", "Thousands",
            "JOLTS Job Openings — total US job postings at the end of each month. BLS Job Openings and Labor Turnover Survey, released ~6 weeks lagged.",
            "Openings/unemployed ratio (V/U) is the Fed's preferred labor-tightness gauge. V/U > 1.5 = very tight; V/U < 1.0 = loose. Crashed from 2.0 in 2022 toward 1.0 in 2024 — Fed's 'soft landing' is partly built on this falling without UR rising.",
            ["aUSJBQUITO/A", "aUSNFARM/A", "aUSUNTOTR"],
        ),
        "aUSJBQUITO/A": (
            "JOLTS", "Thousands",
            "JOLTS Quits — voluntary departures. The cleanest worker-confidence gauge: high quits = workers confident they can find better jobs.",
            "Leads wage growth by 3-6 months (aUSEARNH/A YoY). 'Great Resignation' peak in 2022 (4.5M+/mo) faded by 2024. Quits below pre-pandemic baseline = workers locked in, wage growth moderating.",
            ["aUSJOLTAO", "aUSEARNH/A", "aUSAHVEA"],
        ),
        "aUSEARNH/A": (
            "AHE", "USD/hour",
            "Average Hourly Earnings, total private — BLS establishment-survey wage measure released alongside NFP. The headline wage data point.",
            "Watch the YoY % change (aUSAHVEA, aUSWAGESB/A) for wage-inflation reads. Limited by composition shifts: changes in low-wage vs high-wage employment shares distort the print. Atlanta Fed Wage Tracker controls for composition; ECI is cleaner quarterly.",
            ["aUSAHVEA", "aUSWAGESB/A", "aUSEARN/CA", "aUSEMPCI/A"],
        ),
        "aUSAHVEA": (
            "AHE", "%, YoY",
            "Average Hourly Earnings YoY. Headline US wage-inflation gauge. Released first Friday with NFP.",
            "Above 4% YoY is incompatible with the Fed's 2% inflation target (productivity ~1.5% means ULC growth of 2.5% is the consistent number). Watch alongside ECI for composition-controlled view.",
            ["aUSEARNH/A", "aUSWAGESB/A", "aUSEMPCI/A", "aUSULCNF/A"],
        ),
        "aUSWAGESB/A": (
            "AHE", "%, YoY",
            "AHE all private employees, YoY change — alternate series matching aUSAHVEA. Total-private wage growth rate.",
            "Use whichever has fresher data. Manufacturing-only AHE typically runs 50bp below total private; services AHE drives the overall rate.",
            ["aUSAHVEA", "aUSEARNH/A"],
        ),
        "aUSEARN/CA": (
            "AHE Real", "USD/hour",
            "Real Average Hourly Earnings — nominal AHE deflated by CPI. The wage-gain that actually buys things.",
            "Stagnant for decades (mostly tracks CPI). Surged 2022-23 as inflation outpaced wages (negative real wages); recovered 2024 as inflation cooled. Real wage growth = nominal AHE growth − CPI YoY (approximately).",
            ["aUSEARNH/A", "aUSAHVEA", "aUSCPIYYR"],
        ),
        "aUSEMPCI/A": (
            "ECI", "Index",
            "Employment Cost Index, total compensation — the Fed's PREFERRED wage gauge. Quarterly. Includes wages + benefits, controls for industry/occupation mix (unlike AHE).",
            "Released on Fed black-out weeks. >4% YoY too high for 2% inflation target. The cleanest wage signal because composition shifts don't distort it. Most important quarterly data point for the Fed's labor-cost reads.",
            ["aUSEMPCAR", "aUSECWNS/A", "aUSAHVEA", "aUSULCNF/A"],
        ),
        "aUSEMPCAR": (
            "ECI", "%, QoQ",
            "ECI total compensation QoQ change — the most market-relevant ECI series at release.",
            "Annualize for inflation comparison: 0.8% QoQ ≈ 3.2% annualized. Above 1.0% QoQ historically associated with elevated inflation pressure.",
            ["aUSEMPCI/A", "aUSECWNS/A"],
        ),
        "aUSECWNS/A": (
            "ECI", "Index",
            "ECI Wages and Salaries — strips out benefits to give the pure wage component.",
            "Use alongside total-compensation ECI: gap = benefits inflation (mostly health insurance + retirement). Benefit costs growing faster than wages in recent years. AHE (monthly) is noisier; ECI W&S (quarterly) is cleaner.",
            ["aUSEMPCI/A", "aUSAHVEA"],
        ),
        "aUSULCNF/A": (
            "Unit Labor Costs", "Index",
            "Unit Labor Costs, nonfarm business — compensation per unit of output (ULC = compensation / productivity). The cleanest labor-cost-driven inflation signal.",
            "ULC growth > 2.5% sustained → wage-push inflation pressure. ULC growth < productivity growth → margin expansion / disinflation. Fed officials reference ULC when discussing whether wage growth is consistent with 2% inflation.",
            ["aUSOUTNF/A", "aUSEMPCI/A", "aUSPCE2AR"],
        ),
        "aUSOUTNF/A": (
            "Productivity", "Index",
            "Output per hour, nonfarm business — productivity. The Fed's preferred productivity gauge (strips out volatile farm sector).",
            "Trend ~1.5%/yr long-run. AI capex surge may be lifting trend. Higher productivity = lower ULC for given wage growth = disinflationary. Watch the 4-quarter change for trend.",
            ["aUSPHOPBUS/A", "aUSULCNF/A", "aUSEMPCI/A"],
        ),
        "aUSPHOPBUS/A": (
            "Productivity", "Index",
            "Output per hour, business sector. Broader than nonfarm (includes farm).",
            "Cross-check with aUSOUTNF/A. Manufacturing productivity has historically grown faster than services; gap narrowed since 2010.",
            ["aUSOUTNF/A", "aUSULCNF/A"],
        ),
    },

    # ============== UNEMPLOYMENT / LABOR FORCE ==============
    "us_workforce_unemployement": {
        "aUSUNTOTR": (
            "Unemployment Rate", "%",
            "Civilian Unemployment Rate (U-3) — share of the civilian labor force without a job and actively searching. From the BLS HOUSEHOLD survey, released alongside NFP.",
            "Pair with NFP — different surveys (establishment vs household) so divergence is informative. Watch labor force participation alongside: a falling UR driven by people leaving the workforce is weak. Crossing the Sahm Rule threshold (3-mo avg up 0.5pp from trailing-12m low) historically signals recession.",
            ["aUSNFARM/A", "aUSLABFRE/A", "aUSEMPR/A", "aUSRSAHMN/A"],
        ),
        "aUSLABFRE/A": (
            "Participation", "%",
            "Civilian Labor Force Participation Rate — share of the working-age population either employed or actively looking. Master labor-supply gauge.",
            "Structural decline post-2008 from ~66% to ~62% (boomer retirements + slow recovery). Prime-age (25-54) participation is the cleaner cyclical signal. Sub-62% headline means UR may understate slack.",
            ["aUSEMPR/A", "aUSUNTOTR", "aUSNFARM/A"],
        ),
        "aUSEMPR/A": (
            "Emp-Pop Ratio", "%",
            "Civilian Employment-to-Population Ratio — share of working-age population currently employed. Combines employment + participation into one structural gauge.",
            "Less affected by participation trends than UR. Currently ~60%. Use alongside UR: rising E/P + falling UR = healthy hiring; falling E/P + falling UR = worker exit (weak).",
            ["aUSUNTOTR", "aUSLABFRE/A", "aUSNFARM/A"],
        ),
        "aUSJOBC/A": (
            "Jobless Claims", "Thousands",
            "Initial Jobless Claims, national. Weekly Department of Labor release every Thursday — the highest-frequency US labor data.",
            "Watch the 4-week moving average for trend (weekly is too noisy). Sustained moves above ~250k signal labor-market deterioration; below 200k = very tight. First labor data to react to layoffs.",
            ["aUSJOBCC/A", "aUSJOBCC4W/A", "aUSUNTOTR"],
        ),
        "aUSJOBCC/A": (
            "Jobless Claims", "Thousands",
            "Continuing Claims (insured unemployment), national. Workers who filed initially and remain unemployed receiving benefits, lagged one week vs initial claims.",
            "More structural than initial claims — captures DURATION of unemployment. Rising continuing claims while initial claims stable = harder to find new jobs (a worse signal than rising initial claims). Caps at 26 weeks in most states.",
            ["aUSJOBC/A", "aUSJOBCC4W/A", "aUSUNTOTR"],
        ),
        "aUSJOBCC4W/A": (
            "Jobless Claims", "Thousands",
            "Continuing Claims 4-week moving average — smoother trend.",
            "Use this for cycle reads; the weekly continuing-claims series has too much noise from holiday weeks and individual states. Crossing 1.9M is historically a recession signal.",
            ["aUSJOBCC/A", "aUSJOBC/A"],
        ),
    },

    # ============== ACTIVITY & GDP ==============
    "us_gdp_by_expenditure": {
        "aUSCGDPPD/A": (
            "GDP", "%, QoQ annualized",
            "Real GDP Quarter-over-Quarter, annualized — the headline GDP print the market reacts to. Standardized version of the BEA quarterly GDP release.",
            "Single most-watched US growth indicator. Two consecutive negative quarters is the textbook recession definition (NBER uses broader). Compare against consensus (aUSAGDPF). Three vintages: advance (Q+30 days), second (Q+60), third (Q+90) — revisions can move 50-100bp.",
            ["aUSGDPEQZ/CA", "aUSAGDPF", "aUSGPC/CA", "aUSCGDPPD/A"],
        ),
        "aUSAGDPF": (
            "GDP Forecast", "%, QoQ annualized",
            "Reuters poll consensus forecast for GDP — the consensus number against which the actual GDP print surprises.",
            "Beat/miss vs this consensus drives intraday equity + USD reactions. Historical track record: forecasters under-estimate growth in recoveries, over-estimate it in downturns.",
            ["aUSCGDPPD/A", "aUSGDPEQZ/CA"],
        ),
        "aUSGDPCC/CA": (
            "GDP per Capita", "USD",
            "GDP per capita — total nominal GDP divided by population. Quarterly. Long-run living-standards gauge.",
            "Use real per-capita GDP for cross-country comparison. Year-over-year growth rate matters more than the level. US per-capita GDP growth has averaged 1.5% over 50 years; productivity-driven.",
            ["aUSCGDPPD/A", "aUSGDPEQZ/CA"],
        ),
    },

    # ============== ACTIVITY INDEXES ==============
    "us_cyclical_activity_indices": {
        "aUSCFNA": (
            "Activity Index", "Index",
            "Chicago Fed National Activity Index (CFNAI) — weighted average of 85 monthly indicators (production, employment, sales, consumption). Composite real-time activity gauge.",
            "Above 0 = above trend; sustained -0.7 (3-mo avg) signals recession. Most-watched composite activity indicator alongside Conference Board LEI. Released monthly on a 1-month lag.",
            ["aUSCBBKGPR", "aUSNYWER", "aUSCLEAD/A"],
        ),
        "aUSNYWER": (
            "Activity Index", "%",
            "NY Fed Weekly Economic Index — weekly real GDP-equivalent growth rate. Highest-frequency real-economy gauge.",
            "Updated every Tuesday based on 10 weekly indicators. Translates to a quarterly GDP nowcast equivalent. Useful for tracking the cycle between BEA quarterly releases.",
            ["aUSCFNA", "aUSCBBKGPR", "aUSCGDPPD/A"],
        ),
        "aUSCBBKLER": (
            "BBK Index", "Index",
            "Brave-Butters-Kelley Leading Index — a forward-looking activity gauge constructed from a panel of macro indicators. Federal Reserve Bank of Chicago.",
            "Negative readings precede recessions with ~6-12mo lead. Less widely-tracked than the Conference Board LEI but methodologically rigorous. Pair with the BBK Coincident for full picture.",
            ["aUSCBBKCOR", "aUSCBBKGPR", "aUSCLEAD/A"],
        ),
        "aUSCBBKCOR": (
            "BBK Index", "Index",
            "Brave-Butters-Kelley Coincident Index — current economic activity. Real-time GDP-tracking proxy.",
            "Tracks GDP contemporaneously. Decelerations precede recession by 0-3 months. Use BBK Leading for forward read, BBK Coincident for current state.",
            ["aUSCBBKLER", "aUSCBBKGPR", "aUSCFNA"],
        ),
        "aUSCBBKGPR": (
            "BBK Index", "%, annualized",
            "BBK Monthly GDP Growth rate, annualized. Monthly nowcast of GDP — the BBK team's translation of activity data into a GDP-equivalent rate.",
            "Compare to Atlanta Fed's GDPNow and NY Fed's Nowcast for consensus on current-quarter GDP. Useful between BEA releases for tracking cycle.",
            ["aUSCFNA", "aUSNYWER", "aUSCGDPPD/A"],
        ),
        "aUSCLEAD/A": (
            "Conf Board LEI", "Index",
            "Conference Board Leading Economic Index (LEI) — composite of 10 leading indicators (yield curve, claims, permits, S&P 500, ISM new orders, etc.).",
            "Sustained 6-month declines historically signal recession with 6-12 month lead. False-positive in 2022-23 (predicted recession that didn't materialize as Fed soft-landed). Use alongside yield curve, not in isolation.",
            ["aUSCOINDIF/A", "aUSLAG/A", "aUSCFNA"],
        ),
        "aUSCOINDIF/A": (
            "Conf Board CEI", "Index",
            "Conference Board Coincident Economic Index — current-state composite (employment, income, output, sales).",
            "Tracks GDP contemporaneously. Use the LEI/CEI ratio: when LEI growth is below CEI growth for an extended period, recession risk rises.",
            ["aUSCLEAD/A", "aUSLAG/A"],
        ),
        "aUSLAG/A": (
            "Conf Board Lagging", "Index",
            "Conference Board Lagging Economic Index — confirmatory, not predictive. Inflation, ULC, prime rate, ratio of consumer credit to income.",
            "Use to confirm cycle turns AFTER the fact. CEI/LAG ratio is itself a leading indicator: lagging components reflect built-up imbalances.",
            ["aUSCLEAD/A", "aUSCOINDIF/A"],
        ),
        "aUSEMPTR": (
            "Activity", "Index, 2016=100",
            "Conference Board Employment Trends Index (ETI) — composite of eight labor-market indicators (claims, NFIB hiring plans, jobs hard-to-get, temp employment, hours, ratio of involuntary part-timers, JOLTS hires, employment in manufacturing). Released monthly.",
            "Leads NFP turning points by 2-3 months — historically an excellent labor-market inflection caller. Sustained declines flag rising recession risk before payrolls weaken. Pair with the Sahm Rule for a triangulated read.",
            ["aUSNFARM/A", "aUSUNTOTR", "aUSCLEAD/A"],
        ),
        "aUSSPMDPS": (
            "Equity", "USD per share",
            "S&P 500 trailing 12-month dividends per share (index basis) — total cash dividends paid by S&P 500 constituents over the last four quarters, scaled to the index. Updated continuously by S&P Dow Jones Indices.",
            "Smoother and more cyclical than EPS — companies cut dividends only in extreme stress. Pair with the dividend yield (aUSSPDIVY) for a valuation cross-check, and with EPS to compute the payout ratio. Slow-moving baseline for total-return decomposition.",
            ["aUSSPCOM", "aUSSPDIVY", "aUSSPREPS"],
        ),
    },

    # ============== SURVEYS ==============
    "us_business_surveys": {
        "aUSNPMI/A": (
            "ISM Manufacturing", "Diffusion (50=neutral)",
            "ISM Manufacturing PMI — composite diffusion index of new orders, production, employment, supplier deliveries, and inventories. Released first business day of each month, covering the previous month.",
            "Above 50 = manufacturing expanding, below 50 = contracting. Sustained sub-50 for 3+ months historically correlates with recession risk. Watch sub-components: new orders is most forward-looking; prices paid is an early inflation signal. Now lighter-coverage than S&P Global PMI but more market-watched.",
            ["aUSNMFGPMI", "aUSPFEDB/A", "aUSCGDPPD/A"],
        ),
        "aUSNMFGPMI": (
            "ISM Services", "Diffusion (50=neutral)",
            "ISM Services PMI / NMI — diffusion index for services-sector activity (business activity, new orders, employment, supplier deliveries). Services are ~70% of US GDP.",
            "Often matters MORE than the manufacturing print given services' GDP weight. Watch services PRICES sub-index as a leading indicator for core services CPI/PCE inflation. Divergence between services PMI (strong) and manufacturing PMI (weak) defined the post-COVID cycle.",
            ["aUSNPMI/A", "aUSCGDPPD/A", "aUSPCE2AR"],
        ),
        "aUSPFEDB/A": (
            "Philly Fed", "Diffusion",
            "Philadelphia Fed Manufacturing Survey — General Business Activity index. Released mid-month, ahead of ISM Manufacturing.",
            "Leads ISM Manufacturing by 0-1 month. Six-month-ahead expectations sub-index is one of the better recession-warning indicators. Smaller sample than ISM but earlier release; a way to front-run the ISM print.",
            ["aUSNPMI/A", "aUSCFNA"],
        ),
    },

    "us_consumer_surveys": {
        "aUSCONCF/A": (
            "Consumer Confidence", "Index (1985=100)",
            "Conference Board Consumer Confidence Index — survey of ~3,000 US households on present situation and future expectations. Released last Tuesday of each month.",
            "Pair with UMich sentiment — they sometimes diverge (CB more labor-market sensitive, UMich more inflation/wealth sensitive). The Expectations sub-index leads recessions: a >20pt YoY drop is a historical warning. Less market-moving on release than NFP/CPI.",
            ["aUSCONCE/A", "aUSCONCFP/A", "aUSCSIUM"],
        ),
        "aUSCONCE/A": (
            "Consumer Confidence", "Index",
            "Conference Board Consumer Confidence — Expectations sub-index. The forward-looking component, sub-80 typically signals recession.",
            "More predictive than the headline. >20pt YoY drop is recession-warning. Historically the cleaner of the two CB sub-indices for cycle calls.",
            ["aUSCONCF/A", "aUSCONCFP/A"],
        ),
        "aUSCONCFP/A": (
            "Consumer Confidence", "Index",
            "Conference Board Consumer Confidence — Present Situation sub-index. Current-conditions assessment.",
            "Lags Expectations in turning points. Stays elevated longer at cycle peaks. Use the spread (Present − Expectations) as a recession-risk signal: when Present is high but Expectations falling fast, the cycle is rolling over.",
            ["aUSCONCF/A", "aUSCONCE/A"],
        ),
        "aUSCSIUM": (
            "UMich Sentiment", "Index",
            "University of Michigan Consumer Sentiment Index — headline. More inflation-sensitive than Conference Board. Twice-monthly release: preliminary mid-month, final end of month.",
            "The 1Y and 5-10Y inflation expectations sub-questions are Fed-monitored. UMich sentiment correlated with retail spending leads by 1-2 months. UMich + Conf Board divergences usually resolve toward UMich within 2-3 months.",
            ["aUSCONCF/A", "aUSCONCFEX", "aUSINFEXM1Y"],
        ),
        "aUSCONCFEX": (
            "UMich Sentiment", "Index",
            "UMich Consumer Expectations sub-index — forward-looking component of UMich sentiment.",
            "Pair with Conf Board Expectations (aUSCONCE/A). When both are falling together, recession risk is meaningful. UMich expectations weighed heavily by inflation; CB expectations weighed by labor market.",
            ["aUSCSIUM", "aUSCONCE/A"],
        ),
        "aUSIBDECOP": (
            "Sentiment", "Index",
            "RCM/TIPP Economic Optimism Index — monthly investor and consumer optimism gauge published by Investor's Business Daily and TechnoMetrica. Combines six-month outlook, personal financial outlook, and confidence in federal economic policies.",
            "Smaller-sample alternative to UMich and Conference Board surveys. Use as a tertiary cross-check — when all three confidence gauges move in the same direction, the signal is robust; divergences are usually noise.",
            ["aUSCSIUM", "aUSCONCF/A"],
        ),
        "aUSINFEXM1Y": (
            "Inflation Expectations", "Percent",
            "University of Michigan 1-year-ahead median inflation expectation — household survey response to 'how much do you expect prices to go up over the next 12 months?' One of the Fed's most-watched short-horizon expectations measures.",
            "Spikes when gasoline prices move (households over-weight what they see at the pump). The Fed cares about whether expectations stay 'anchored' — sustained moves above 4-5% raise concerns about a wage-price spiral. Cross-check against TIPS breakevens and NY Fed SCE.",
            ["aUSINFEXM5Y", "aUSCPIYYR", "aUSCSIUM"],
        ),
        "aUSINFEXM5Y": (
            "Inflation Expectations", "Percent",
            "University of Michigan 5-10 year median inflation expectation — household long-horizon expectation. The Fed's primary anchored-expectations gauge from the household side.",
            "More stable than the 1Y series — typically pinned in a 2.5-3.5% band. Sustained moves above 3.5% are taken seriously by the FOMC; Powell has cited this series specifically in press conferences. Compare to 5Y5Y forward TIPS breakevens for a market-vs-survey read.",
            ["aUSINFEXM1Y", "aUSCPIYYR", "aUSPCEYYR"],
        ),
    },

    "us_housing": {
        "aUSHMKT/A": (
            "Builder Sentiment", "Index",
            "NAHB/Wells Fargo Housing Market Index — survey of homebuilders on present sales, prospective buyer traffic, and 6-month sales outlook.",
            "Leads housing starts by 1-3 months and home prices by 6-12 months. <50 = contraction in builder sentiment; <30 = severe stress. Single-family component most reactive to mortgage rates.",
            ["aUSBPERMIT", "aUSHSTART", "aUSMBAMLR"],
        ),
        "aUSHNSAO": (
            "New Home Sales", "Thousand units, SAAR",
            "New Home Sales — Census monthly count of new single-family homes sold. Released ~25th of each month.",
            "Smaller than existing sales (~1/8) but more cyclical. Builder pricing power gauge. Watch alongside months-supply (a function of new sales pace + inventory) for builder-incentive intensity.",
            ["aUSHNSALES/A", "aUSHSTART", "aUSEHSPAR"],
        ),
        "aUSHNSALES/A": (
            "New Home Sales", "Thousand units, SAAR",
            "New Home Sales (alternate series) — monthly Census/HUD report of newly built single-family homes sold, measured at contract signing rather than closing. More volatile than existing home sales because of the much smaller sample size (~70k annual transactions vs ~5M existing).",
            "Cross-check against the primary new home sales series and against existing home sales. Watch the months-supply ratio for a clean inventory signal — under 4 months is tight, over 7 months is a buyers' market. Builder pricing power and incentives follow months-supply directly.",
            ["aUSHNSAO", "aUSHSTPS", "aUSEXHSAL"],
        ),
        "aUSEHSPAR": (
            "Existing Home Sales", "%, MoM",
            "Existing Home Sales month-over-month change. NAR monthly. Captures ~5x the volume of new home sales.",
            "Most heavily-rate-sensitive housing series — most existing buyers have a low locked-in mortgage rate to give up. Months-supply is the tight/loose gauge. Above 6 months supply = buyer's market; below 4 = seller's market.",
            ["aUSHNSAO", "aUSPHSALE/A", "aUSMBAMLR", "aUSHAI"],
        ),
        "aUSPHSALE/A": (
            "Pending Home Sales", "Index",
            "NAR Pending Home Sales Index — homes under contract but not yet closed. Leads existing home sales by 1-2 months.",
            "Best forward-looking measure of existing home market. Released monthly. Volatility in mortgage rates causes contracts to be fall through; a falling pending → existing sales transmission below 90% rate is a stress signal.",
            ["aUSEHSPAR", "aUSMACP/A"],
        ),
    },

    "us_housing_real_estate_prices": {
        "aUSHPRICESP": (
            "Case-Shiller", "Index",
            "S&P/Case-Shiller US National Home Price Index, 20-City Composite. Repeat-sales methodology — only sales of the same home. Released ~last Tuesday of each month, lagged ~2 months.",
            "Most-watched US home price gauge alongside FHFA HPI. Better for trend than for level. Use with FHFA for cross-check (FHFA covers conforming-loan-only properties; Case-Shiller covers full market).",
            ["aUSHPCSCM10/CA", "aUSHPIYAR", "aUSHAI"],
        ),
        "aUSHPCSCM10/CA": (
            "Case-Shiller", "Index",
            "S&P/Case-Shiller 10-City Composite — narrower than the 20-city. Subset of largest metros.",
            "Use 20-city for the more representative US-wide read. 10-city better for trend momentum since it uses the most-active metros.",
            ["aUSHPRICESP", "aUSHPIYAR"],
        ),
        "aUSHPIYAR": (
            "FHFA HPI", "%, YoY",
            "FHFA House Price Index YoY change. Federal Housing Finance Agency — covers conforming-loan-only properties (≤$766k limit in most areas).",
            "Cleaner than Case-Shiller in distress periods (excludes jumbo, all-cash). Different sample = different reads sometimes. Watch alongside Case-Shiller; if they diverge, jumbo segment is moving differently from conforming.",
            ["aUSHPIMAR", "aUSHPRICESP"],
        ),
        "aUSHPIMAR": (
            "FHFA HPI", "%, MoM",
            "FHFA HPI MoM change.",
            "Annualize for comparison: 0.4% MoM ≈ 5% YoY. Volatile single months; 3-month MA cleaner.",
            ["aUSHPIYAR", "aUSHPRICESP"],
        ),
        "aUSHAI": (
            "Affordability", "Index",
            "National Housing Affordability Index — composite of median home price, median family income, and prevailing 30Y mortgage rate. NAR.",
            "100 = the median family with median income can afford the median home with 20% down. <100 = can't afford. Hit ~95 in 2023 — record low. Below 100 chokes existing home sales.",
            ["aUSHPIYAR", "aUSMBAMLR", "aUSEHSPAR"],
        ),
    },

    "us_mortgage_or_domestic_finance": {
        # placeholder for completeness — these go in domestic_finance
    },

    # ============== FED / RATES ==============
    "us_interest_rates": {
        "aUSFEDFUND": (
            "Fed Funds", "%",
            "Federal Funds Effective Rate — the volume-weighted median rate at which depository institutions lend reserves to each other overnight. Set by market activity within the FOMC's target range. The Fed's primary policy lever.",
            "Anchor for the entire US yield curve. Compare to (a) Fed Funds Target range, (b) market-implied path from Fed Funds futures (CME FedWatch), (c) SOFR. Real fed funds = nominal − expected inflation; positive and rising = restrictive policy.",
            ["aUSFEDFUNDT", "aUSIORAR", "aUSRRPAR", "aUSPRIME"],
        ),
        "aUSFEDFUNDT": (
            "Fed Funds", "%",
            "Fed Funds Target Rate — the policy-set range (technically a range; we report the midpoint). What the FOMC actually decides at each meeting.",
            "Effective rate (aUSFEDFUND) trades within this range. Watch FOMC meeting decisions vs Fed Funds futures (CME FedWatch) for surprise risk. The dot plot shows individual FOMC members' projections of where this should be.",
            ["aUSFEDFUND", "aUSIORAR", "aUSDISWPCRM"],
        ),
        "aUSIORAR": (
            "Fed Operations", "%",
            "Interest on Reserve Balances (IORB, formerly IOER) — the rate the Fed pays banks on reserves held at the Fed. Floor of the fed funds corridor for banks.",
            "Banks won't lend in fed funds market below IORB (would just park reserves at Fed instead). Set 5-15bp below the upper bound of fed funds target range. ~$3T of bank reserves earn this rate.",
            ["aUSFEDFUND", "aUSRRPAR", "aUSFEDFUNDT"],
        ),
        "aUSRRPAR": (
            "Fed Operations", "%",
            "Overnight Reverse Repo Rate (ON RRP) — sister rate to IORB but for non-bank money funds. Floor of the corridor for money market funds, GSEs, primary dealers.",
            "Set 10bp below IORB. RRP usage drops as Fed shrinks balance sheet via QT — fewer excess reserves chasing yield. RRP balances peaked ~$2.5T in 2022 and drained to <$200B in 2024.",
            ["aUSIORAR", "aUSFEDFUND"],
        ),
        "aUSDISWPCRM": (
            "Fed Operations", "%",
            "Discount Window Primary Credit Rate — what banks pay for short-term Fed liquidity through the discount window. Set 0.50pp ABOVE the upper bound of fed funds target.",
            "Stigma rate; rarely used. Heavily used during March 2023 banking stress (SVB / FRB). Bank Term Funding Program (BTFP) was the 2023-24 alternative facility before it expired.",
            ["aUSFEDFUND", "aUSFEDFUNDT"],
        ),
        "aUSPRIME": (
            "Bank Lending", "%",
            "Bank Prime Rate — admin-set lending rate for top-tier corporate borrowers, anchored at fed funds + 3.0pp. Reference rate for HELOCs, credit cards, and many small business loans.",
            "Not market-determined — banks set it together. Moves in lockstep with fed funds target. Used as the variable-rate index for many household loans (HELOCs, small business loans).",
            ["aUSFEDFUND", "aUSCRCDACR", "aUSMBAMLR"],
        ),
        "aUSMBAMLR": (
            "Mortgage Rate", "%",
            "30-Year Fixed Mortgage Contract Rate — MBA weekly survey. The household-relevant US borrowing cost.",
            "Spread to 10Y Treasury (typically 150-200bp; widens during housing/MBS stress) is the closely-watched MBS-spread gauge. Drives housing affordability and turnover. Each 100bp increase reduces purchasing power ~10%.",
            ["aUSEBM10Y", "aUSFEDFUND", "aUSMACI/A", "aUSHAI"],
        ),
    },

    # Treasury yields are in us_stocks_bonds_funds
    "us_stocks_bonds_funds": {
        "aUSEBM10Y": (
            "Treasury Yields", "%",
            "10-Year US Treasury Yield. The benchmark global long-rate — single most-important US bond price.",
            "Decompose into real yield (TIPS) + breakeven inflation. The 2s10s spread (10Y minus 2Y) is the classic recession signal — inversion preceded every US recession since 1970. Tracks Fed expectations + term premium.",
            ["aUSGBOND", "aUSLIDXIR10", "aUSFEDFUND", "aUSMBAMLR"],
        ),
        "aUSGBOND": (
            "Treasury Yields", "%",
            "20-Year Treasury Yield (constant maturity). The discontinued-and-revived long-end Treasury. Less liquid than 10Y or 30Y.",
            "Use the 10Y for primary curve analysis. 20Y often trades richer than 30Y due to fewer issuance vs duration demand from pension funds.",
            ["aUSEBM10Y", "aUSLIDXIR10"],
        ),
        "aUSSPCOM": (
            "S&P 500", "Index",
            "S&P 500 Composite Index level. Headline US equity benchmark — cap-weighted; ~7 megacaps drive much of recent return.",
            "Wealth-effect input to consumption. Compare against cyclically-adjusted P/E (Shiller CAPE / aUSSPRPER) for valuation framing. Equity Risk Premium = earnings yield (1/P/E) − 10Y Treasury yield; <2% has historically signaled poor forward returns.",
            ["aUSSPRPER", "aUSSPDIVY", "aUSSPREPS"],
        ),
        "aUSSPRPER": (
            "Equity Valuation", "Ratio",
            "S&P 500 Cyclically Adjusted P/E (Shiller CAPE / P/E10) — price divided by 10-year smoothed real earnings. Long-run valuation gauge.",
            ">30 historically signals lower forward returns. Currently ~33-37. Mean-reverts on 10-15 year horizons; not useful for short-term timing. Gap to 10Y yield (CAPE earnings yield − 10Y) is the equity risk premium.",
            ["aUSSPCOM", "aUSSPREPS", "aUSSPDIVY", "aUSEBM10Y"],
        ),
        "aUSSPDIVY": (
            "Equity Yield", "%",
            "S&P 500 Dividend Yield — index dividends per share / index price. Currently ~1.3% (low historically).",
            "Sub-2% reflects post-2010 buyback preference (shareholder returns shifted from dividends to buybacks). Compare to 10Y Treasury yield for ERP. Dividend yield + dividend growth = expected total return (Gordon Growth approximation).",
            ["aUSSPCOM", "aUSSPMDPS", "aUSEBM10Y"],
        ),
        "aUSSPREPS": (
            "Equity Earnings", "USD",
            "S&P 500 12-month trailing as-reported EPS (top-down). Earnings denominator for headline P/E.",
            "Differs from operating EPS (which excludes one-time charges). Operating EPS / as-reported EPS ratio shows accounting-quality drift. Bottom-up forward EPS from analyst consensus is more market-relevant for forward P/E.",
            ["aUSSPCOM", "aUSSPRPER"],
        ),
        "aUSSPMDPS": (
            "Equity Dividends", "USD",
            "S&P 500 12-month cash dividends per share. Smoother than EPS through cycles.",
            "Dividend coverage ratio (EPS / dividends) tells you payout sustainability. >2x is comfortable; <1.5x = stretched. Dividend cuts are big negative signals — companies fight hard not to cut.",
            ["aUSSPDIVY", "aUSSPREPS"],
        ),
    },

    # ============== FX / EXTERNAL ==============
    "us_exchange_rate_operations": {
        "aUSCXTWF/C": (
            "USD Trade-Weighted", "Index",
            "Trade-weighted nominal US dollar index, standardized — Fed's broad USD strength gauge against major + emerging trading partners. Refinitiv/LSEG version.",
            "Rising = stronger USD = headwind for US exporters and EM debt service. Sub-components: USD vs DM (G10) vs USD vs EM. ~50% weight is EUR/CNY/JPY/MXN/CAD combined.",
            ["aUSCXTWYF", "aUSCXTRF/C", "aUSBISNXBR", "aUSXRUSD"],
        ),
        "aUSCXTWYF": (
            "USD Trade-Weighted", "%, YoY",
            "Trade-weighted nominal USD YoY % change. The most market-relevant USD strength gauge for cycle-cycle comparisons.",
            ">5% YoY USD strength is historically a drag on US multinational EPS (S&P 500 derives ~40% of revenue overseas). Triggers translation hedging activity in corporate treasury.",
            ["aUSCXTWF/C", "aUSCXTRF/C"],
        ),
        "aUSCXTRF/C": (
            "USD Trade-Weighted", "Index",
            "Trade-weighted REAL USD index (CPI-adjusted) — strips inflation differentials. The cleaner competitiveness signal.",
            "Diverges from nominal USD when inflation differs across trading partners. Real USD up while nominal flat = US loses real competitiveness even with stable nominal rate.",
            ["aUSCXTWF/C", "aUSBISRXBR"],
        ),
        "aUSBISNXBR": (
            "BIS EER", "Index",
            "BIS Nominal Broad Effective Exchange Rate Index — comprehensive USD strength gauge against ~60 trading partners. Bank for International Settlements.",
            "Broader than Fed TWI; methodologically different weights. Use as cross-check on Fed series. BIS series has the longest cross-country history.",
            ["aUSCXTWF/C", "aUSBISRXBR"],
        ),
        "aUSXRUSD": (
            "Bilateral Rates", "USD/EUR",
            "USD/EUR exchange rate — noon NY fixing. The most-traded FX pair globally.",
            "Largest weight in trade-weighted USD (~25%). EUR strength typically reflects relative ECB-Fed policy stance + relative growth. EUR is a low-beta currency in risk-off (counterintuitively).",
            ["aUSCXTWF/C"],
        ),
    },

    # ============== TRADE / EXTERNAL ==============
    "us_balance_of_payments": {
        "aUSCURAC": (
            "Current Account", "USD millions",
            "US Current Account balance — total. Sum of trade in goods + services, primary income (investment income), and secondary income (transfers). BEA quarterly.",
            "Persistently negative ~$200-300B/quarter. Funded by capital inflows (financial account = mirror image, BoP identity). >5% of GDP deficit historically signals stress; current ~3% is sustainable for a reserve currency.",
            ["aUSGBALBA", "aUSGBARBA"],
        ),
    },
    "us_imports_exports": {
        "aUSGBALBA": (
            "Trade Balance", "USD millions",
            "Advance Goods Trade Balance — preliminary monthly goods-only deficit. Released ~3 days BEFORE the full BEA monthly trade report.",
            "Goods-only (services excluded). Big surprises move USD intraday. Represents ~70% of the eventual full trade balance number; services balance is more predictable.",
            ["aUSGBARBA", "aUSCURAC"],
        ),
        "aUSGBARBA": (
            "Trade Balance", "USD millions",
            "Goods Trade Balance (revised) — second estimate after the full report. More accurate than the advance.",
            "Use the advance for surprise; the revised for trend. Goods trade deficit dominates US current account.",
            ["aUSGBALBA", "aUSCURAC"],
        ),
    },

    # ============== ENERGY ==============
    "us_commodity_fundamentals": {
        "aUSEIACS": (
            "Crude Stocks", "Thousand barrels",
            "Total US Crude Oil Stocks excluding SPR — EIA weekly Wednesday release. The single most market-watched US oil-inventory series.",
            "Big surprises vs API/consensus drive WTI intraday by 2-5%. Cushing-specific stocks (aUSSCCO) matter most for WTI futures (delivery point). Below 25M bbl Cushing = tank-tops empty risk; above 80M = oversupply pressure.",
            ["aUSSCCO", "aUSEIAGS", "aUSEIAHOS", "aUSEIAPRU"],
        ),
        "aUSEIAGS": (
            "Gasoline Stocks", "Thousand barrels",
            "Total US Gasoline Stocks. Released weekly with EIA petroleum status report.",
            "Builds during winter (low driving demand), draws during summer (peak driving). Below 5-year range = bullish gasoline cracks. Pre-Memorial Day stock builds often signal weak demand or oversupply.",
            ["aUSEIACS", "aUSEPGAPG", "aUSEIAPRU"],
        ),
        "aUSEIADS": (
            "Distillate Stocks", "Thousand barrels",
            "Total US Distillate Stocks (diesel + heating oil). Industrial + freight + winter heating demand.",
            "Winter heating-oil cushion gauge — heavily watched in Q4. Distillate cracks often diverge from gasoline cracks based on freight cycle (diesel) vs travel cycle (gasoline).",
            ["aUSEIACS", "aUSEPDAPG"],
        ),
        "aUSEIAHOS": (
            "SPR", "Thousand barrels",
            "Strategic Petroleum Reserve stocks. Drained ~200M bbl in 2022 (Russia/Ukraine response under Biden admin). Refilling has been slow.",
            "Below 350M bbl is historically low. Refill pace (target $67-72/bbl) tested by oil price moves. SPR can release ~1M bbl/day for sustained periods.",
            ["aUSEIACS", "aUSSCCO"],
        ),
        "aUSEIAPRU": (
            "Refining", "%",
            "EIA Refinery Capacity Utilization. 85-95% normal range.",
            "Drops sharply during hurricane season (Gulf shut-ins) and spring/fall maintenance (turnarounds). Pair refinery inputs with crude imports + crude production for fundamental balance. Below 85% = excess capacity, weak crack spreads.",
            ["aUSEIACS", "aUSEIAGS", "aUSEIADS"],
        ),
        "aUSSCCO": (
            "Crude Stocks", "Thousand barrels",
            "Cushing OK crude oil stocks ex-SPR — WTI futures delivery point. The most-watched single inventory location.",
            "Below 25M bbl = tank tops empty risk; above 80M = oversupply. WTI-Brent spread widens (WTI discount) when Cushing is full; narrows when low.",
            ["aUSEIACS", "aUSEIAHOS"],
        ),
    },

    # ============== AUTO ==============
    "us_automobiles_transport": {
        "aUSVHLS": (
            "Vehicle Sales", "Million units, SAAR",
            "Total Light Vehicle Sales — Wards Automotive monthly, released first business day. Includes cars + light trucks/SUVs/CUVs.",
            "SAAR ~15-16M is normal; sub-14M signals weakness. Truck mix has been ~75% of light-vehicle sales since 2017 (CUV explosion). Highly rate-sensitive via auto financing — a credit-cycle gauge.",
            ["aUSCARSOA", "aUSPCARRVO/A", "aUSDAPRODP"],
        ),
        "aUSCARSOA": (
            "Vehicle Sales", "Million units, SAAR",
            "Total Car Sales — passenger cars only (excludes light trucks). The shrinking part of the auto market.",
            "Cars dropped from ~50% to ~25% of light-vehicle sales since 2010. EV adoption is reshaping the car segment specifically (Tesla, Rivian, Lucid). Truck SAAR (aUSVHLS − aUSCARSOA) is the larger and more cyclical segment.",
            ["aUSVHLS", "aUSPCARRVO/A"],
        ),
        "aUSPCARRVO/A": (
            "Auto Inventory", "Days supply",
            "Domestic Auto Unit Inventory level — days supply at current sales pace. Wards Automotive.",
            "<50 days = tight (incentive cuts, strong pricing power); >70 days = excess (incentives ramp up). Drives industry profitability more than unit volume itself. Ford / GM aim for 60-day supply.",
            ["aUSVHLS", "aUSDAPRODP"],
        ),
        "aUSDAPRODP": (
            "Auto Production", "Thousand units",
            "Domestic Auto Unit Production. Plant output from US factories.",
            "Watch for production cuts during soft demand (incentive avoidance). Chip shortage caused unprecedented production cuts 2021-22. UAW strikes (e.g., 2023) cause sharp temporary drops.",
            ["aUSVHLS", "aUSPCARRVO/A"],
        ),
    },

    # ============== GOVERNMENT FISCAL ==============
    "us_government_accounts": {
        "aUSGDEF": (
            "Federal Budget", "USD millions",
            "Federal Government total budget surplus/deficit. Treasury Monthly Statement, released ~third week of each month.",
            "Currently running ~$1.8T deficit (~6% of GDP) — unprecedented for non-recession peacetime. Watch the 12-month rolling sum to filter monthly tax-timing noise. Deficit/GDP ratio is the cleanest fiscal-stance gauge.",
            ["aUSGBPGDP", "aUSFOUTL", "aUSFEDREC", "aUSXGBINTA"],
        ),
        "aUSGBPGDP": (
            "Federal Budget", "% of GDP",
            "Federal surplus/deficit as % of GDP — the standard fiscal-stance gauge.",
            ">5% deficit during expansion is highly unusual and signals limited fiscal room for the next recession. Compare to historical norm (~2-3% during expansions). Fiscal projections (CBO baseline) suggest persistence above 5%.",
            ["aUSGDEF", "aUSFEDETOS"],
        ),
        "aUSFOUTL": (
            "Federal Outlays", "USD millions",
            "Total federal outlays — all federal spending. ~$6.5T/yr (~24% of GDP). Released monthly with Treasury Monthly Statement.",
            "Watch the YoY growth + composition. Fastest-growing line items: net interest (rate-driven), Medicare (demographic), Social Security (demographic). Defense and non-defense discretionary are ~30% of total but politically constrained.",
            ["aUSXGBINTA", "aUSXGBSOCA", "aUSXGBMEDA", "aUSXGBDEFA"],
        ),
        "aUSFEDREC": (
            "Federal Receipts", "USD millions",
            "Total federal receipts — taxes + customs + fees. ~$5T/yr (~17-18% of GDP).",
            "Composition: ~50% individual income tax, ~35% payroll tax, ~10% corporate, ~5% other. Receipt shortfalls vs CBO projection signal economic weakness; individual income tax most cyclical.",
            ["aUSGDEF", "aUSFOUTL"],
        ),
        "aUSXGBINTA": (
            "Outlays by Function", "USD millions",
            "Federal Outlays — interest on debt. The fastest-growing major line item as rates rose post-2022.",
            "Now exceeds defense spending — a structural fiscal-sustainability concern. Marginal funding cost = average yield on Treasuries × debt level. Each 100bp rise in average Treasury yield adds ~$300B/yr to net interest.",
            ["aUSEBM10Y", "aUSFEDETOS", "aUSFOUTL"],
        ),
        "aUSXGBSOCA": (
            "Outlays by Function", "USD millions",
            "Federal Outlays — Social Security. Largest single federal program.",
            "Demographic locomotive: ~6%/yr growth on autopilot from boomer retirements + COLA increases. Trust fund depletion projected ~2034 absent reform — politically explosive but math is unambiguous.",
            ["aUSXGBMEDA", "aUSFOUTL"],
        ),
        "aUSXGBMEDA": (
            "Outlays by Function", "USD millions",
            "Federal Outlays — Medicare. Largest program after Social Security.",
            "Growing 5-7%/yr from demographics + healthcare inflation. Excludes Medicaid (separate program, joint federal/state). Medicare Part D drug pricing reforms (IRA) are the major cost-control attempt.",
            ["aUSXGBSOCA", "aUSFOUTL"],
        ),
        "aUSXGBDEFA": (
            "Outlays by Function", "USD millions",
            "Federal Outlays — National Defense. ~13% of total federal outlays. Now smaller than net interest (a historical first).",
            "NATO 2% GDP commitment binds upward. Budget cycle: appropriations → outlays with 1-2 year lag (multi-year procurement programs). Watch BCA caps (when in force) for medium-term ceiling.",
            ["aUSFOUTL", "aUSXGBINTA"],
        ),
    },

    "us_government_debt_borrowing": {
        "aUSFEDETOS": (
            "Federal Debt", "USD millions",
            "Total federal debt outstanding — gross debt held by public + intragovernmental holdings (Social Security trust fund etc).",
            "The headline 'debt clock' number politicians cite. For market impact, debt-held-by-public (aUSPDEBTA) is more relevant — that's what actually trades. Debt-to-GDP (aUSGBPGDP / 100 × inverted) is the sustainability framing.",
            ["aUSPDEBTA", "aUSSECMKTA", "aUSGDEF"],
        ),
        "aUSPDEBTA": (
            "Federal Debt", "USD billions",
            "Public Debt Outstanding — Treasury securities held by the public + Federal Reserve.",
            "What actually trades. Subtract Fed holdings (SOMA portfolio, ~$5T) for free-float supply that competes for private capital. Foreign holdings ~$8T (China, Japan, UK largest).",
            ["aUSFEDETOS", "aUSSECMKTA"],
        ),
        "aUSSECMKTA": (
            "Treasury Outstanding", "USD millions",
            "Total marketable Treasury securities — bills + notes + bonds + TIPS + FRNs. The free-float bond supply (excluding non-marketable issues like savings bonds).",
            "Compare against M2 to see Treasury vs broad money balance. Bills (≤1Y) currently ~20% of marketable supply — historically high; signals refinancing stress. Issuance schedule announced quarterly in Refunding Statement.",
            ["aUSFEDETOS", "aUSPDEBTA"],
        ),
    },

    # ============== MONEY SUPPLY ==============
    "us_money_supply": {
        "aUSCMS2B/A": (
            "M2", "USD billions",
            "M2 Money Supply level, standardized — M1 + small time deposits + retail money funds. The broadest practical money supply measure.",
            "M3 was discontinued in 2006. M2 surged 27% YoY in 2021 post-stimulus, contracted in 2023 (first sustained negative since 1930s). Watch nominal growth rate vs nominal GDP growth.",
            ["aUSCMS2YB/A", "aUSCMS1B/A", "aUSMEMSVE/A"],
        ),
        "aUSCMS2YB/A": (
            "M2", "%, YoY",
            "M2 YoY % change — the most-watched money supply growth rate.",
            "Loose proxy for inflation 12-18 months out (monetarist view; weak in practice). Surged to 27% in 2021 post-stimulus, contracted in 2023. Sustained negative M2 growth historically associated with recession.",
            ["aUSCMS2B/A", "aUSCPIYYR"],
        ),
        "aUSCMS1B/A": (
            "M1", "USD billions",
            "M1 Money Supply — currency + checking deposits + traveler's checks. Pre-2020 definition.",
            "Definition expanded in May 2020 to INCLUDE savings deposits — the level jumped artificially. Pre-2020 M1 series not directly comparable to post-2020. Use M2 for cleaner historical analysis.",
            ["aUSCMS2B/A", "aUSCMS0B/A"],
        ),
        "aUSCMS0B/A": (
            "M0", "USD billions",
            "M0 / Monetary Base — currency in circulation + bank reserves at Fed. The Fed's direct liquidity injection.",
            "QE expanded the base 5x post-2008. Now shrinking via QT. Loose proxy for Fed balance sheet liquidity. Reserves portion specifically determines money market dynamics (RRP, fed funds market activity).",
            ["aUSMAAAAAA", "aUSCMS1B/A", "aUSCMS2B/A"],
        ),
        "aUSMAAAAAA": (
            "Monetary Base", "USD millions",
            "H.3 Monetary Base — Fed's direct liability + currency. Cross-check with aUSCMS0B/A.",
            "Fed releases H.3 weekly. Bank reserves component is the actively-changing part (currency grows slowly with population + inflation). QT removes reserves on a predictable schedule (~$60B/mo Treasury runoff + $35B/mo MBS through 2024).",
            ["aUSCMS0B/A", "aUSCMS1B/A"],
        ),
        "aUSMEMSVE/A": (
            "Velocity", "Ratio",
            "Velocity of M2 — nominal GDP / M2. How many times each dollar circulates per year.",
            "Crashed in 2020 (M2 surged faster than GDP) and is gradually recovering. Long-run decline reflects financialization + savings preference. MV=PY identity: stable velocity → M growth = inflation + real growth.",
            ["aUSCMS2B/A", "aUSCGDPPD/A"],
        ),
    },

    # ============== CONSUMER CREDIT ==============
    "us_consumer_finance": {
        "aUSCRDOUTA": (
            "Consumer Credit", "USD billions",
            "Consumer Credit Outstanding total — Federal Reserve G.19 monthly. Credit cards + auto + student + personal. ~$5T total.",
            "Watch growth rate alongside delinquencies (aUSBDLCOCQ/A) to gauge consumer balance-sheet stress. Composition: revolving (cards) + non-revolving (auto, student, personal). Excludes mortgage debt.",
            ["aUSCREDITIR/A", "aUSCREDITIN/A", "aUSCRCDACR"],
        ),
        "aUSCREDITIR/A": (
            "Revolving Credit", "USD billions",
            "Revolving consumer credit (credit cards). Hit ~$1.2T+ in 2024 — a record high.",
            "Watch nominal growth rate (~8%/yr trend, faster recently). 90+ delinquency rate (aUSBDLCOCQ/A) is now elevated, especially subprime card. Card APR (aUSCRCDACR) at ~22% is record high.",
            ["aUSCRDOUTA", "aUSCRCDACR", "aUSBDLCOCQ/A"],
        ),
        "aUSCREDITIN/A": (
            "Non-Revolving Credit", "USD billions",
            "Non-revolving consumer credit — auto + student + personal loans. Larger than revolving; student loans dominate.",
            "Auto charge-offs spiking (subprime auto stress). Student loans frozen during pandemic; payments resumed October 2023. PSLF/IDR program shifts move totals around.",
            ["aUSCRDOUTA", "aUSCREDITIR/A"],
        ),
        "aUSCRCDACR": (
            "Credit Card APR", "%",
            "Credit Card APR at commercial banks, all accounts (G.19 quarterly). ~22% in 2024 — record high.",
            "Spread to fed funds widened sharply post-COVID (banks raised more than rate hikes warranted). Average APR for accounts ASSESSED interest (those carrying a balance) is even higher (~24%).",
            ["aUSCREDITIR/A", "aUSPRIME", "aUSBDLCOCQ/A"],
        ),
    },

    # ============== BANK LENDING ==============
    "us_banking": {
        "aUSBCACIB/A": (
            "Bank Lending", "USD millions",
            "Commercial and Industrial loans outstanding at commercial banks (Fed H.8). Business credit cycle gauge.",
            "Slows ahead of recessions; SLOOS lending standards typically lead loan-volume slowdowns by 1-2 quarters. Currently flat-ish — banks tightened standards 2023-24 in response to deposit competition + CRE worries.",
            ["aUSBCALCB", "aUSBCAREB/A"],
        ),
        "aUSBCALCB": (
            "Bank Lending", "USD millions",
            "Consumer loans outstanding at commercial banks — credit cards + auto + other consumer (excluding real estate). Different from aUSCRDOUTA (G.19) which captures ALL consumer credit issuers.",
            "Banks are ~50% of the consumer credit market. Watch alongside G.19 total to gauge shadow-bank vs bank shifts. Credit unions + finance companies + securitization pools complete the picture.",
            ["aUSBCACIB/A", "aUSBCAREB/A", "aUSCRDOUTA"],
        ),
        "aUSBCAREB/A": (
            "Bank Lending", "USD millions",
            "Real Estate loans outstanding at commercial banks — residential mortgages + CRE. Largest single bank loan category.",
            "CRE stress concentrated in regional banks (large banks cleaner). Office sector weighs on aggregate; multifamily + industrial healthier. Watch SLOOS for CRE tightening signals.",
            ["aUSBCACIB/A", "aUSBDLRECQ/A"],
        ),
        "aUSBNRQP": (
            "Bankruptcies", "Filings, quarterly",
            "Total US bankruptcy filings — sum of business and non-business (consumer) Chapter 7, 11, and 13 filings. Released quarterly by the Administrative Office of the US Courts.",
            "Cyclical late-cycle stress signal. Spikes when consumer credit delinquencies and business defaults pick up — typically lags labor weakness by 6-9 months. The 2005 BAPCPA reform created a structural break; pre-2005 levels not directly comparable to post-2005.",
            ["aUSCRDDLQA", "aUSCRDCDLQ"],
        ),
    },

    "us_domestic_finance": {
        "aUSBCLALQ/A": (
            "Charge-offs", "%",
            "Total Bank Charge-off Rate, all loans and leases. Aggregate bank-credit-loss gauge from FDIC quarterly.",
            "Counter-cyclical: rises ~6-12 months after recession start. Currently elevated but well below 2008 levels. Card + CRE driving recent increase; mortgage charge-offs remain very low (mortgage credit standards strict post-GFC).",
            ["aUSBCLCOCQ/A", "aUSBCLRECQ/A", "aUSBDLALQ/A"],
        ),
        "aUSBCLCOCQ/A": (
            "Charge-offs", "%",
            "Bank Charge-off Rate, credit cards. Most pro-cyclical loan category.",
            "Crossing 4% historically signals recession-like consumer stress. Currently elevated, especially subprime. Card delinquencies (aUSBDLCOCQ/A) lead charge-offs by 3-6 months.",
            ["aUSBDLCOCQ/A", "aUSCRCDACR", "aUSCREDITIR/A"],
        ),
        "aUSBCLRECQ/A": (
            "Charge-offs", "%",
            "Bank Charge-off Rate, CRE (commercial real estate). Heavy office/retail CRE losses post-COVID.",
            "Bank stress concentrated here for regional banks (large banks have less CRE exposure). Office is the worst sub-sector; multifamily improving; industrial healthy. Watch alongside CMBS spreads.",
            ["aUSBDLRECQ/A", "aUSBCAREB/A"],
        ),
        "aUSBDLALQ/A": (
            "Delinquencies", "%",
            "Total Bank Loan Delinquency Rate. Earlier-stage stress signal than charge-offs.",
            "Watch alongside SLOOS lending standards. Delinquencies rising while standards tightening = rough cycle (banks defensive but borrowers still struggling).",
            ["aUSBCLALQ/A", "aUSBDLCOCQ/A"],
        ),
        "aUSBDLCOCQ/A": (
            "Delinquencies", "%",
            "Credit card 30-day delinquency rate. Most pro-cyclical loan category.",
            "Crossing 3% historically signals recession risk; now ~3.2% in 2024. Subprime card delinquencies are running much higher (~7%+). Watch alongside disposable income growth — delinquencies rise when real DPI growth turns negative.",
            ["aUSBCLCOCQ/A", "aUSCREDITIR/A", "aUSCRCDACR"],
        ),
        "aUSBDLRECQ/A": (
            "Delinquencies", "%",
            "CRE 30-day delinquency rate. Office sector driving elevation post-2022.",
            "Watch alongside CMBS spreads + special-servicing transfers. CRE loan defaults are slow-moving (loans don't reset until refinancing); the wave of 2024-26 maturities is the test.",
            ["aUSBCLRECQ/A", "aUSBCAREB/A"],
        ),
        "aUSBNRQP": (
            "Bankruptcies", "Filings",
            "Total bankruptcy filings, 3-month rolling. Court-reported.",
            "Trailing indicator. Spikes during recessions. Watch alongside delinquency rates and tightening lending standards. Business + consumer split is informative — recent rises driven mostly by business filings (corporate distress + Chapter 11s).",
            ["aUSBCLALQ/A", "aUSBDLALQ/A"],
        ),
        "aUSMACI/A": (
            "MBA Apps", "Index",
            "MBA Mortgage Applications Composite Index — weekly Mortgage Bankers Association survey. Real-time housing-finance demand.",
            "Composite of purchase + refi indices. Most cyclical when refi-driven (rate-cycle bellwether — surges when rates fall). Purchase index is the cleaner housing-demand gauge.",
            ["aUSMACP/A", "aUSMACRI/A", "aUSMBAMLR"],
        ),
        "aUSMACP/A": (
            "MBA Apps", "Index",
            "MBA Purchase Mortgage Applications Index — purchase only (excludes refi). The cleanest housing-demand-side gauge.",
            "Leads existing home sales by 1-2 months. Less rate-sensitive than refi but still rate-driven. Affordability (aUSHAI) drives multi-quarter trends.",
            ["aUSMACI/A", "aUSEHSPAR", "aUSHAI"],
        ),
        "aUSMACRI/A": (
            "MBA Apps", "Index",
            "MBA Refinance Mortgage Applications Index. Highly rate-sensitive — surges when rates fall ~50bp from local peak.",
            "Refi waves are the canonical mortgage-rate-cycle indicator. Most outstanding mortgages have low locked-in rates (pre-2022 issuance), so refi index requires rates to fall well below 6% to reactivate.",
            ["aUSMACI/A", "aUSMBAMLR"],
        ),
        "aUSTCONS/A": (
            "Construction", "USD millions",
            "Construction Spending, total — Census monthly survey of all construction activity (residential + non-residential + public).",
            "Component of GDP investment. Residential leads cycle; non-residential lags. Public infrastructure (IIJA-driven) has been the swing factor 2022-25.",
            ["aUSHSTART", "aUSBPERMIT"],
        ),
    },

    # ============== FORECASTS ==============
    "us_macro_forecasts": {
        "aUSFCBOUT": (
            "CBO", "USD billions",
            "Congressional Budget Office baseline projection for federal outlays. Assumes current law (no policy changes). Released in CBO Budget and Economic Outlook (Jan + August updates).",
            "Reference for fiscal-cliff debates and long-run sustainability framing. Compare to actual outlays (aUSFOUTL) for forecast accuracy. CBO projections are typically conservative on revenue, accurate on outlays.",
            ["aUSFOUTL", "aUSFCBREV", "aUSGDEF"],
        ),
        "aUSFCBREV": (
            "CBO", "USD billions",
            "CBO baseline projection for federal receipts. Current-law forecast.",
            "CBO consistently UNDER-estimates revenue during expansions, OVER-estimates during downturns (revenue is more cyclical than they capture). Compare to aUSFEDREC.",
            ["aUSFEDREC", "aUSFCBOUT", "aUSGDEF"],
        ),
        "aUSFCCUFHR": (
            "Fed SEP", "%",
            "Fed Summary of Economic Projections — Unemployment Rate central tendency, high range. Quarterly SEP released after FOMC meetings (March, June, September, December).",
            "Compare to actual UR (aUSUNTOTR) for Fed forecast track record. Fed UR forecasts have under-estimated rises (every cycle).",
            ["aUSUNTOTR", "aUSFCCCFHR"],
        ),
        "aUSFCCCFHR": (
            "Fed SEP", "%",
            "Fed SEP — Core PCE inflation central tendency, high range. The Fed's official internal inflation forecast.",
            "Fed Core PCE forecasts have under-estimated inflation 2021-22 (transitory error) and over-estimated 2024-25 (slow to accept disinflation). Compare to actual aUSPCE2AR.",
            ["aUSPCE2AR", "aUSPCEMAR", "aUSFCCUFHR"],
        ),
    },

    # ============== HOUSING (additions) ==============
    "us_housing_for_existing": {
    },

    # ============== ROUND 2 — fix remaining short/template entries ==============
    "us_retail_sales": {
        "aUSRSLSFS/A": (
            "Retail Sales", "USD millions, SA",
            "Retail Sales Total including Food Services — the broadest US retail aggregate from the Census Monthly Retail Trade Survey. Captures all retail trade (general merch, autos, gas, building materials, etc.) plus restaurant/bar sales.",
            "The headline retail print released around the 15th of each month with two-month lag. Compare MoM and YoY changes vs consensus. Volatile categories (autos, gas) often drive surprises — switch to the 'control group' (aUSRLCOA) to see underlying consumer demand.",
            ["aUSRLCOA", "aUSPCE2AR", "aUSPCEMAR"],
        ),
        "aUSRLCOA": (
            "Retail Sales", "USD millions, SA",
            "Retail Sales Control Group — total retail sales excluding autos, gas stations, building materials and food services. The cleanest signal of underlying consumer goods demand and the version that feeds directly into the BEA's GDP retail-control adjustment.",
            "The most analytically useful retail series. Smoother than headline because it strips out the most volatile categories. Use as a real-time GDP nowcast input — control group growth maps almost 1:1 to goods PCE in the quarterly accounts.",
            ["aUSRSLSFS/A", "aUSPCE2AR", "aUSCGDPPD/A"],
        ),
    },

    "us_wages_earnings": {
        "aUSEARNH/A": (
            "Wages", "USD per hour",
            "Average Hourly Earnings of all private nonfarm employees — level (not change). The headline wage series released alongside NFP each month from the BLS establishment survey. Around $35/hour in recent prints.",
            "The level itself is rarely traded; markets focus on the YoY change (aUSAHVEA) as a wage-inflation gauge. Use the level for compositional adjustments and to track real wages (deflate by CPI). Production and nonsupervisory wages (separate series) are a cleaner signal of low-wage worker bargaining power.",
            ["aUSAHVEA", "aUSNFARM/A", "aUSCPIYYR"],
        ),
        "aUSAHVEA": (
            "Wages", "Percent, YoY",
            "Average Hourly Earnings, year-over-year change — the headline wage-inflation gauge from the BLS establishment survey, released with NFP. Captures pay growth across all private nonfarm employees.",
            "Markets watch this for Fed implications: AHE growth above ~4% is incompatible with 2% inflation absent a productivity miracle. Less reliable than ECI (aUSEMPCI/A) at turning points because it's sensitive to compositional shifts (when low-wage hospitality jobs are cut, the average mechanically rises).",
            ["aUSEARNH/A", "aUSEMPCI/A", "aUSCPIYYR"],
        ),
    },

    # ============== ROUND 3 — balance of payments, FDI, finance ==============
    "us_balance_of_payments": {
        "aUSCURAC/A": (
            "Current Account", "USD billions, SAAR",
            "US Current Account balance — the broadest external balance, summing the goods balance, services balance, primary income (investment income on foreign assets), and secondary income (transfers). Released quarterly by BEA.",
            "Persistently negative ($800B-$1T deficit annually post-2020). Compare to GDP — sustained deficits >5% of GDP have historically preceded currency stress, but the dollar's reserve status has insulated the US. Watch alongside the financial account (mirror image by accounting identity).",
            ["aUSGS/A", "aUSCURACEXG/A", "aUSCURACIMG/A", "aUSFINACF/A"],
        ),
        "aUSCURAAB": (
            "Current Account", "USD billions",
            "Current Account, Balance — the broad external balance combining goods, services, primary income, and secondary income flows. Same construct as aUSCURAC/A but at a different frequency/release.",
            "Cross-check against aUSCURAC/A. The US has run a persistent CA deficit since the early 1980s; financed by capital inflows. Useful for reading external imbalances when paired with the trade balance and FDI flows.",
            ["aUSCURAC/A", "aUSGS/A", "aUSFINACF/A"],
        ),
        "aUSGS/A": (
            "Trade Balance", "USD billions, SAAR",
            "Goods trade balance (exports of goods minus imports of goods) on a balance-of-payments basis. The largest component of the US current account deficit, persistently negative for ~50 years.",
            "Watch monthly trade-balance prints (Census/BEA International Trade Report) for the high-frequency read. Petroleum component swings with oil prices; non-petroleum is the structural import dependence on consumer goods + capital goods. Tariff regime changes show up here first.",
            ["aUSCURAC/A", "aUSCEXBA", "aUSCIMBA"],
        ),
        "aUSCBOPA": (
            "Trade Balance", "USD billions",
            "Visible (goods-only) trade balance on BoP basis — same conceptual measure as aUSGS/A in different framing. Goods exports minus goods imports excluding services.",
            "The 'big number' in monthly trade reports. Markets parse the petroleum vs non-petroleum split to gauge structural vs cyclical movement. China and Mexico are the largest bilateral deficits; tariff policy moves these first.",
            ["aUSGS/A", "aUSCURAC/A"],
        ),
        "aUSCEXBA": (
            "Goods Exports", "USD billions",
            "US goods exports on BoP basis — total value of merchandise sold abroad. Driven by capital goods, industrial supplies, autos, agricultural, and consumer goods.",
            "Pair with aUSCIMBA (imports) to get the trade balance. Sensitive to global growth (export volumes) and the dollar (price competitiveness). Falls early in global slowdowns — a leading global-cycle indicator.",
            ["aUSCIMBA", "aUSGS/A", "aUSCURACEXG/A"],
        ),
        "aUSCIMBA": (
            "Goods Imports", "USD billions",
            "US goods imports on BoP basis — total value of foreign merchandise purchased. Dominated by consumer goods, capital goods, industrial supplies, autos, and petroleum.",
            "Cyclical with US consumption — falls in recessions when goods demand slows. Petroleum imports have shrunk dramatically post-shale (US is now near-balanced in energy). Consumer goods imports track retail sales closely.",
            ["aUSCEXBA", "aUSGS/A", "aUSCURACIMG/A"],
        ),
        "aUSCURACEXG/A": (
            "Goods Exports", "USD billions",
            "Current Account: goods exports — same as aUSCEXBA in the broader CA framing. The largest export category; the services surplus is what offsets goods deficits in the broader CA.",
            "Track YoY growth as a global-demand proxy. Volume vs price decomposition useful: nominal export growth of 5% with import-price inflation of 3% means real export volume growth of ~2%.",
            ["aUSCURACIMG/A", "aUSCURACEXS/A", "aUSCEXBA"],
        ),
        "aUSCURACIMG/A": (
            "Goods Imports", "USD billions",
            "Current Account: goods imports — same as aUSCIMBA in the broader CA framing. Largest import category, driven by consumer + capital goods.",
            "Cyclical with consumer demand. Watch tariff impacts: post-2018 imports from China fell while imports from Vietnam, Mexico rose (trade diversion, not reduction). Structural shift to nearshoring is visible in bilateral data.",
            ["aUSCURACEXG/A", "aUSCURACIMS/A", "aUSCIMBA"],
        ),
        "aUSCURACEXS/A": (
            "Services Exports", "USD billions",
            "Current Account: services exports — financial services, intellectual-property royalties, business services, travel and transport. The persistent US surplus driver that partially offsets goods deficits.",
            "Travel is the most cyclical (tourism). IP royalties are the most structural (US tech and pharma dominance). Services balance has been ~$200-300B surplus pre-COVID; declined during pandemic; recovering since.",
            ["aUSCURACIMS/A", "aUSCURACEXG/A"],
        ),
        "aUSCURACIMS/A": (
            "Services Imports", "USD billions",
            "Current Account: services imports — US payments to foreigners for travel, transport, business services, royalties. Smaller than services exports — US is a net services exporter.",
            "Travel imports (US residents traveling abroad) is the largest and most cyclical component. Watch for outbound tourism surges as a sign of strong household balance sheets.",
            ["aUSCURACEXS/A", "aUSCURACIMG/A"],
        ),
        "aUSCURACTRN/A": (
            "Secondary Income", "USD billions",
            "Current Account: secondary income balance — net transfers including remittances, foreign aid, government grants. Consistently negative for the US (large remittance outflows + foreign aid > inflows).",
            "Small relative to goods/services balance (-$150B vs -$1T goods). Useful for understanding why total CA differs from trade balance. Less market-relevant — analysts focus on goods/services and primary income.",
            ["aUSCURAC/A"],
        ),
        "aUSFINACF/A": (
            "Financial Account", "USD billions",
            "Financial Account: net US incurrence of liabilities — foreign claims on US (capital inflows). The accounting mirror of the current account: the US runs CA deficits financed by selling assets (Treasuries, equities, real estate) to foreigners.",
            "When inflows slow, dollar weakens or Treasury yields rise. Foreign Treasury holdings (TIC data, separate series) are the most-watched component. Recent shifts: official-sector Asian buying down, private-sector European buying up.",
            ["aUSCURAC/A", "aUSBALFAT/A"],
        ),
        "aUSBALFAT/A": (
            "Financial Account", "USD billions",
            "Net Lending/Borrowing from Financial Account — accounting mirror of the current account. Equal in magnitude (and opposite in sign) to the CA balance by construction.",
            "Useful for cross-check on CA data; if they don't match exactly, the residual is 'statistical discrepancy'. Big discrepancies (>$50B) suggest measurement error in trade or financial data.",
            ["aUSCURAC/A", "aUSFINACF/A"],
        ),
        "aUSIVDAA": (
            "Outward FDI", "USD billions",
            "US Direct Investment Abroad (outward FDI position) — cumulative stock of US-owned subsidiaries and majority stakes in foreign companies. ~$6T position, larger than inward FDI.",
            "Track as a long-term indicator of US corporate global footprint. UK, Netherlands, Luxembourg, Canada, Ireland are top destinations (often as holding-company hubs). Used to gauge dollar repatriation potential under tax-policy changes.",
            ["aUSIVDFBDA", "aUSIVDAUKA", "aUSIVDAMXA"],
        ),
        "aUSIVDAMXA": (
            "Outward FDI", "USD billions",
            "US direct investment in Mexico — cumulative stock. Heavy in manufacturing under USMCA — autos, electronics, appliances. Has accelerated post-2018 with nearshoring trend.",
            "A canary for nearshoring/friend-shoring policy effects. Auto OEMs and electronics manufacturers have been moving production from China to Mexico since 2018. Compare growth rate to direct investment in China for the rebalancing signal.",
            ["aUSIVDAA", "aUSIVDAUKA"],
        ),
        "aUSIVDFBDA": (
            "Inward FDI", "USD billions",
            "Foreign direct investment in US from Germany — cumulative stock. Top-5 source, dominated by auto manufacturing (BMW, Mercedes, VW), chemicals, and industrial machinery.",
            "Watch for reshoring/IRA-driven investments: German auto and chemicals firms have announced major US plants 2022-25 in response to Inflation Reduction Act subsidies and tariff risk.",
            ["aUSIVDFCNA", "aUSIVDFJPA"],
        ),
    },

    "us_consumer_finance": {
        "aUSMOV620A": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with risk score below 620 — deep subprime band. Very small post-2008 (banks largely don't lend here; FHA dominates this credit-quality segment).",
            "Monitor for any uptick as a sign of loosening credit standards. Pre-2008, this band exceeded $50B/quarter. Post-Dodd-Frank QM rules effectively shut down deep-subprime conventional lending; FHA fills the gap with explicit federal guarantee.",
            ["aUSMOV659A", "aUSMOVTOTA"],
        ),
        "aUSMOV659A": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with risk score 620-659 — subprime band. NY Fed Household Debt and Credit Report quarterly. Sensitive to lending-standard shifts.",
            "Volumes rise when banks ease standards (cycle peaks) and collapse in tightening cycles. As a share of total originations, this band fell from 15-20% pre-2008 to 5-8% post-Dodd-Frank — a structural shift toward higher-quality lending.",
            ["aUSMOV719A", "aUSMOVTOTA"],
        ),
        "aUSMOV719A": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with risk score 660-719 — near-prime/middle band. The pre-2008 mainstream borrower segment, now a smaller share given migration toward higher scores post-crisis.",
            "Watch share vs prime (720-759) as a cycle indicator: rising near-prime share indicates lender willingness to extend credit further. Falling share signals tightening — a leading indicator of housing slowdowns.",
            ["aUSMOV759A", "aUSMOVTOTA"],
        ),
        "aUSMOV759A": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with risk score 720-759 — prime band. Largest single share of originations historically. Standard conforming-loan borrower.",
            "Most stable band through cycles. Fell ~70% from 2021 peak as rate hikes killed refinance volumes. Use as the 'baseline mortgage market' gauge — purchase originations in this band track home-sales volume.",
            ["aUSMOV719A", "aUSMOVTOTA"],
        ),
        "aUSMOV760A": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with risk score 760+ — super-prime band. Largest dollar volume share (highest credit-quality borrowers tend to take larger loans for higher-priced homes).",
            "The 'jumbo + prime conforming' segment. Most resilient to rate shocks because these borrowers have alternatives (cash, equity). Useful for tracking high-end housing demand separately from broader market.",
            ["aUSMOV759A", "aUSMOVTOTA"],
        ),
        "aUSMOVTOTA": (
            "Mortgage Origination", "USD millions",
            "Total mortgage originations — sum of all credit-quality bands. NY Fed quarterly Household Debt and Credit Report. Includes both purchase and refinance originations.",
            "Headline mortgage finance volume. Collapsed from ~$1.2T quarterly peak in 2021 to ~$400B in 2023-24 as rate hikes killed refinance demand. Track purchase-origination share separately for housing-market signal.",
            ["aUSMOV760A", "aUSMOV759A", "aUSMBAMLR"],
        ),
        "aUSMEMSLA": (
            "Student Loans", "USD billions",
            "Total student loans outstanding (memo to consumer credit) — ~$1.7T. Mostly federal direct loans; private student loans <$150B. Cumulative balance reflecting decades of borrowing minus repayments.",
            "Major household balance sheet item. Repayment obligations resumed Oct 2023 after pandemic forbearance; consumption headwind for borrowers. Forgiveness programs (PSLF, IDR) periodically reduce balances; track flow vs stock for cleaner signal.",
            ["aUSCRDOUTA", "aUSCRDTLAB"],
        ),
        "aUSCRDTLQ": (
            "Consumer Credit", "%, MoM annualized",
            "Total consumer credit MoM% change, annualized — Fed G.19 high-frequency credit-growth signal. Captures revolving (cards) + nonrevolving (auto + student + personal) flows.",
            "Watch for sharp decelerations as consumer-stress signal. 2008 crisis saw -5% annualized; 2020 COVID saw -10% (credit-card payoffs from stimulus). Revolving accelerating + nonrevolving decelerating = households leaning on cards (late-cycle stress).",
            ["aUSCRDTLAB", "aUSCRDOUTA"],
        ),
        "aUSCRDTLAB": (
            "Consumer Credit", "USD billions",
            "Consumer credit, monthly absolute change — net credit creation flow. Fed G.19 release ~5th business day of each month, two-month lag.",
            "Decompose into revolving (cards) and nonrevolving (auto/student) for cleaner signal. Auto loan flows track auto sales; revolving flows show whether households are running balances or paying down. Stress shows up in revolving first.",
            ["aUSCRDTLQ", "aUSCRDTLFA"],
        ),
        "aUSCRDEPNA": (
            "Bank Credit", "USD billions",
            "Nonrevolving consumer credit at depository institutions — banks' auto loan + personal loan book (excludes mortgages, excludes credit cards). About half of all bank consumer lending by stock.",
            "Compare to total nonrevolving (G.19) for bank vs nonbank share. Auto loan share of bank lending has fallen as captive finance (GM Financial, Ford Credit, Toyota Financial) gained share — a structural shift in auto financing.",
            ["aUSCRDPFNA"],
        ),
    },

    "us_money_supply": {
        "aUSMAAAAAA": (
            "Money Supply", "USD billions",
            "Monetary base (Fed H.3 release) — currency in circulation plus bank reserves at the Fed. Direct Fed liability; expands with QE, contracts with QT. Distinct from broader money aggregates.",
            "Misleading as a 'money supply' indicator post-2008 because reserves became huge but velocity collapsed (banks held them rather than lend). Useful for tracking Fed balance-sheet operations directly. Compare to M2 for the bank-lending multiplier.",
            ["aUSM1", "aUSM2", "aUSADMBAS.1D/A"],
        ),
        "aUSADMBAS.1D/A": (
            "Money Supply", "USD billions",
            "Adjusted monetary base — Fed's preferred monetary-base measure adjusted for changes in reserve requirements and required-reserve ratio shifts. Most consistent across regulatory regimes.",
            "Cleaner than the raw monetary base for long-time-series comparisons. Post-2008 the distinction matters less because reserve requirements were eliminated in 2020. Track for Fed balance-sheet trajectory.",
            ["aUSMAAAAAA", "aUSM1", "aUSM2"],
        ),
        "aUSM1": (
            "Money Supply", "USD billions",
            "M1 money supply — currency in circulation + demand deposits + savings deposits (post-May 2020 reclassification, which made M1 ≈ M2 minus small time deposits and money-market mutual funds).",
            "Post-2020 the M1 vs M2 distinction blurred — savings deposits were moved from M2 into M1. Watch M2 instead for the meaningful aggregate. M1 still useful for tracking high-liquidity household balances; spikes during stress (cash hoarding) and post-stimulus.",
            ["aUSM2", "aUSMAAAAAA"],
        ),
        "aUSM2": (
            "Money Supply", "USD billions",
            "M2 money supply — M1 + small time deposits + retail money-market mutual funds. The broadest commonly-tracked monetary aggregate; includes most household liquid savings.",
            "Year-over-year M2 growth is the key indicator. Sustained M2 contraction is rare — happened in 2022-23 for the first time in modern data, contributing to disinflation pressure. Fast M2 growth (>10% YoY like 2020) tends to precede inflation surges with 12-18mo lag.",
            ["aUSM1", "aUSMEMSVE/A", "aUSCGDPPD/A"],
        ),
        "aUSMEMSVE/A": (
            "Money Velocity", "Ratio",
            "M2 velocity — nominal GDP divided by M2 money stock. Measures how often each dollar circulates per year in nominal output.",
            "Post-2008 collapsed from ~2.0 to ~1.1 as M2 expanded faster than nominal GDP. A revival of velocity is a pre-condition for sustained inflation: more money + same velocity = inflation; more money + falling velocity = deflation pressure.",
            ["aUSM2", "aUSCGDPPD/A"],
        ),
        "aUSMZMSTK/A": (
            "Money Supply", "USD billions",
            "MZM (Money of Zero Maturity) money stock — all money instantly convertible to cash without penalty. Effectively M2 minus small time deposits plus all institutional money funds.",
            "Less commonly tracked since the Fed discontinued its publication; private compilations remain. Some monetarists consider MZM more economically meaningful than M2 because time deposits are illiquid for transactional purposes.",
            ["aUSM2", "aUSM1"],
        ),
    },

    "us_government_accounts": {
        "aUSGDEFAA": (
            "Federal Deficit", "USD billions",
            "Federal budget deficit (or surplus) — outlays minus receipts on a unified-budget basis. Released monthly by Treasury's Monthly Treasury Statement, fiscal year basis (Oct-Sep).",
            "The headline fiscal print. Cyclical: widens in recessions (auto stabilizers), narrows in expansions. Recent run rate ~$1.5-2T deficit annually post-COVID, structurally elevated relative to pre-2020. Watch primary deficit (excl interest) for underlying fiscal stance.",
            ["aUSFEDREC", "aUSFOUTL", "aUSGDEF"],
        ),
        "aUSGDEF": (
            "Federal Deficit", "USD billions",
            "Federal government total surplus or deficit — annual/fiscal-year aggregate, complementary to the monthly aUSGDEFAA series. Same conceptual measure at lower frequency.",
            "Use the monthly series (aUSGDEFAA) for high-frequency tracking; use this annual aggregate for historical comparison. Compare to GDP for the deficit-to-GDP ratio, the standard sustainability metric (~5-7% in recent years).",
            ["aUSGDEFAA", "aUSFEDREC", "aUSFOUTL"],
        ),
        "aUSFEDREC": (
            "Federal Receipts", "USD billions",
            "Federal government receipts (revenues) — individual income taxes, corporate income taxes, payroll taxes, customs duties, excise taxes. Released monthly by Treasury.",
            "Individual income tax is ~50%, payroll tax ~35%, corporate ~10%. Cyclical: rises with GDP and labor income. April spike from individual tax filings; December peak from corporate quarterly estimated payments. Tariff-policy changes show up in customs duties (small share).",
            ["aUSGDEFAA", "aUSFOUTL"],
        ),
        "aUSFOUTL": (
            "Federal Outlays", "USD billions",
            "Federal government outlays (total) — Social Security, Medicare/Medicaid, defense, interest on debt, all other discretionary + mandatory programs. Released monthly by Treasury.",
            "Mandatory + interest now ~75% of outlays — limited room for discretionary cuts. Net interest outlays passing $1T annually, growing fastest. Track interest-as-share-of-revenues for fiscal-sustainability stress signal (now ~20%, doubled vs 2010s).",
            ["aUSGDEFAA", "aUSFEDREC", "aUSXGBINTA"],
        ),
        "aUSXGBINTA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: net interest — interest paid on federal debt minus interest received. Fastest-growing major category as debt level meets higher rates.",
            "Has crossed $1T annually post-2024, exceeding defense outlays. Trajectory determined by both debt growth (deficits) and average rate on debt (refinancing higher-coupon debt). Major fiscal sustainability concern; CBO projects net interest reaching 4% of GDP by 2034.",
            ["aUSFOUTL", "aUSGBND10"],
        ),
        "aUSXGBDEFA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: national defense — DOD plus military assistance, atomic energy defense activities. ~$850B annually, ~13% of total federal outlays.",
            "Has fallen from ~5% of GDP in 2010 to ~3% in 2024 as percent of GDP, even as nominal level rose. Discretionary spending (subject to annual appropriations) — the largest target for budget negotiations. Geopolitical events (Ukraine, Middle East) have driven supplemental requests.",
            ["aUSFOUTL", "aUSXGBINTA"],
        ),
        "aUSXGBSOCA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: Social Security — retirement and survivor benefits to ~67M beneficiaries. Largest single federal outlay category, ~$1.4T annually and growing with demographics.",
            "Mandatory spending — paid by formula not appropriations. Trust Fund projected to be insolvent by ~2034 absent legislation; would trigger automatic ~20% benefit cut. Track demographic profile (boomer retirement wave continues through 2034).",
            ["aUSFOUTL", "aUSXGBMEDA"],
        ),
        "aUSXGBMEDA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: Medicare — health insurance for 65+ population (~65M beneficiaries). Second-largest federal outlay, ~$1T and growing fastest among major categories due to aging + medical-cost inflation.",
            "Hospital Insurance (Part A) trust fund projected insolvent ~2031. Total Medicare growth ~6%/year vs ~4% economic growth — structural fiscal stress. Watch alongside Medicaid (state-level partner program) for total federal health-care fiscal exposure.",
            ["aUSFOUTL", "aUSXGBSOCA", "aUSXGBHLTA"],
        ),
    },

    "us_government_debt_borrowing": {
        "aUSPDEBTA": (
            "Federal Debt", "USD billions",
            "Public debt outstanding — total Treasury debt held by both the public and intragovernmental accounts (Trust Funds). The 'gross debt' measure mentioned in headlines around the debt ceiling.",
            "~$36T in 2025. The 'debt held by the public' subset (~$28T) is the more economically meaningful measure since intragovernmental debt is a Treasury IOU to itself. Watch debt-ceiling negotiations — extraordinary measures kick in when ceiling is hit.",
            ["aUSFEDETOS", "aUSPDBTR", "aUSGDEFAA"],
        ),
        "aUSPDBTR": (
            "Federal Debt", "% of GDP",
            "Gross public debt as a percentage of GDP — the standard sustainability gauge using gross (not net of intragovernmental) debt. Higher than debt-held-by-public/GDP by ~25-30 percentage points.",
            "CBO projects debt/GDP rising to 120-130% by 2034 absent policy change. Threshold concerns vary: most economists view 100-120% as 'manageable for reserve currency issuer'; >150% historically associated with fiscal crisis. Watch debt-service/GDP ratio for nearer-term signal.",
            ["aUSPDEBTA", "aUSXGBINTA", "aUSCGDPPD/A"],
        ),
        "aUSFEDETOS": (
            "Federal Debt", "USD billions",
            "Federal debt total amount outstanding — Treasury's gross debt position including all marketable securities (bills, notes, bonds, TIPS, FRNs) and nonmarketable issuances (savings bonds, intragovernmental).",
            "Tracks the running tally of Treasury issuance. The marketable-debt subset (~$27T) is what funds the actual federal deficit; nonmarketable debt is mostly Trust Fund holdings. Issuance pattern (bills vs notes/bonds) signals Treasury's term-structure strategy.",
            ["aUSPDEBTA", "aUSSECTRNA"],
        ),
    },

    "us_consumer_surveys": {
        "aUSOPINAE": (
            "NFIB", "Index, 1986=100",
            "NFIB Business Optimism Index — National Federation of Independent Business survey of small-business owners on hiring, capex, prices, sales outlook, profit trends, inventories, credit conditions, expansion plans, business climate.",
            "Most-watched small-business confidence gauge. Sub-90 readings are recession-territory; 100+ is expansionary. Sub-indices on hiring plans and capex plans lead actual activity by 1-3 months. Skews Republican politically — read trend not level for cleanest signal.",
            ["aUSBSSOPT/A", "aUSCONCF/A", "aUSCSIUM"],
        ),
        "aUSBSSOPT/A": (
            "NFIB", "Index, 1986=100",
            "NFIB Index of Small Business Optimism — official annual NFIB optimism release; same conceptual measure as aUSOPINAE in different framing.",
            "Cross-check against aUSOPINAE. Useful for long-time-series analysis — NFIB has been running this survey since 1973. Sustained sub-90 has historically preceded recessions.",
            ["aUSOPINAE", "aUSCSIUM"],
        ),
        "aUSNYFEDGBC/A": (
            "Empire State", "Diffusion",
            "NY Fed Empire State Manufacturing Survey — General Business Condition index. Diffusion (% reporting better − % worse). Released ~15th of each month, first regional Fed manufacturing print.",
            "First-look at the month's manufacturing pulse — leads ISM Manufacturing by ~2 weeks. Combined with Philly Fed gives a robust regional read. Sub-zero readings sustained for 3+ months historically signal national manufacturing recession.",
            ["aUSPFEDB/A", "aUSNPMI/A"],
        ),
        "aUSTEXQA": (
            "Dallas Fed", "Diffusion",
            "Dallas Fed Manufacturing Business Index — Texas region manufacturing activity. Energy-sector heavy due to TX concentration of oil services, refining, chemicals, plastics.",
            "Useful for energy-cycle read — Dallas Fed correlates strongly with oil prices through the energy-services and chemicals sectors. Combined with Empire State + Philly Fed = regional manufacturing trio that leads ISM.",
            ["aUSBSGENBA/A", "aUSPFEDB/A"],
        ),
        "aUSBSGENBA/A": (
            "Dallas Fed", "Diffusion",
            "Dallas Fed General Business Activity index — broader measure than the manufacturing index, covering executives' overall view of conditions in TX district.",
            "Forward-looking complement to the production-focused manufacturing index. Watch the spread vs production: when general activity outlook deteriorates while production holds up, slowdown is approaching.",
            ["aUSTEXQA", "aUSPFEDB/A"],
        ),
        "aUSBSRFMF/A": (
            "Richmond Fed", "Diffusion",
            "Richmond Fed Manufacturing Index (composite) — 5th District (VA, MD, NC, SC, WV, DC). Released near month-end.",
            "Defense + tobacco + chemicals heavy. Useful for cross-checking other regional Fed surveys. Composite combines shipments, new orders, and employment sub-indices — a diversified read.",
            ["aUSPFEDB/A", "aUSNYFEDGBC/A"],
        ),
        "aUSCPMI/A": (
            "Chicago PMI", "Diffusion",
            "Chicago Business Barometer (formerly Chicago PMI / ISM-Chicago) — manufacturing diffusion index for greater Chicago. Released last business day of month.",
            "Leads ISM Manufacturing by 1 day — markets watch as a read-through. Discontinued briefly 2024 then resumed; check for series breaks. Auto + heavy industry heavy.",
            ["aUSNPMI/A", "aUSPMIBARO"],
        ),
        "aUSPMIBARO": (
            "Chicago PMI", "Diffusion",
            "Chicago PMI Business Barometer — companion series to aUSCPMI/A. Same conceptual measure with potentially different release vintage.",
            "Use whichever has fresher data; the two series should match closely. Leads national ISM Manufacturing by 1 day.",
            ["aUSCPMI/A", "aUSNPMI/A"],
        ),
    },

    "us_wages_earnings": {
        "aUSAVGEAR": (
            "Wages", "Percent, MoM",
            "Average hourly earnings month-over-month change — monthly wage-growth pulse from BLS establishment survey, released with NFP.",
            "Monthly wage-momentum read. >0.4% MoM hot (sustained ~5% YoY pace), <0.2% cool (sustained ~2.5% YoY). Highly volatile month-to-month due to compositional shifts and timing — smooth with 3-month moving average for cleaner signal.",
            ["aUSEARNH/A", "aUSAHVEA", "aUSEMPCI/A"],
        ),
        "aUSWAGMANA": (
            "Wages", "USD per hour",
            "Average hourly earnings, production workers, total manufacturing — narrower than headline AHE. Captures shop-floor manufacturing wage levels (excludes supervisory/administrative).",
            "Track for industrial-sector wage pressure separately from services. Manufacturing wages matter for unit labor costs and for international competitiveness. Watch alongside non-manufacturing services wages (aUSEARNHS/A) for broad wage pressure picture.",
            ["aUSWRIMNA", "aUSWRIMDB/A", "aUSEARNH/A"],
        ),
        "aUSWRIMNA": (
            "Wages", "USD per hour",
            "Average hourly earnings, production workers, nondurable manufacturing — wages at food, chemicals, paper, plastics, textiles plants. Less cyclical than durables wages.",
            "Less cyclical than durables (aUSWRIMDB/A) because nondurable demand (food, consumer staples) is more stable. Use for tracking wage pressure in stable-demand manufacturing. Diverges from durables in recessions — durables wage growth slows faster.",
            ["aUSWRIMDB/A", "aUSWAGMANA"],
        ),
        "aUSWRIMDB/A": (
            "Wages", "USD per hour",
            "Average hourly earnings, manufacturing, durable goods, all employees — wages in autos, machinery, electronics, metals, transportation equipment. Broader (all-employees) than production-only series.",
            "Most cyclical wage measure — durable manufacturing has the most volatile demand. Watch as a leading wage indicator: durables wages turn before headline. Useful proxy for skilled-trades wage pressure.",
            ["aUSWAGMANA", "aUSWRIMNA"],
        ),
        "aUSEARNHS/A": (
            "Wages", "USD per hour",
            "Average Hourly Earnings, services-providing nonfarm — wages in healthcare, leisure, professional services, retail, finance, education. ~85% of the workforce.",
            "Drives core services CPI inflation — services-sector wage growth above ~4% sustains 2-3% core services inflation. The Fed's most-cited wage-pressure measure. Decompose by sub-sector: leisure/hospitality wages spiked 2021-22 then normalized; healthcare wages still rising structurally.",
            ["aUSEARNH/A", "aUSWAGMANA", "aUSCPIYYR"],
        ),
        "aUSEARN": (
            "Wages", "USD per week",
            "Average Weekly Earnings, total private nonfarm — hourly wage × hours worked per week. Pre-tax weekly take-home gauge.",
            "More cyclical than hourly wages because hours worked are pro-cyclical (overtime cut in slowdowns, expanded in booms). Better predictor of consumer spending than hourly wage alone. Watch for divergence: when hours fall while hourly wage rises, total income may flatten.",
            ["aUSEARNH/A", "aUSEARNW/CA"],
        ),
        "aUSEARNW/CA": (
            "Real Wages", "USD per week",
            "Real average weekly earnings — average weekly earnings deflated by CPI. Best take-home-pay-after-inflation gauge for tracking household real-income trends.",
            "The single best 'how is the typical worker doing' indicator. Negative real wage growth (2021-22) drives consumer-confidence collapses; recovery (2024+) supports spending. Track alongside real disposable personal income (DPI) for full household-cash-flow picture.",
            ["aUSEARN", "aUSCPIYYR"],
        ),
        "aUSWKIMDA": (
            "Hours", "Hours per week",
            "Average weekly hours, production workers, durable goods manufacturing — hours-per-worker measure. Pro-cyclical: rises in booms (overtime), falls in slowdowns (hours cuts before layoffs).",
            "Leading labor-market indicator: hours cuts come before layoffs. Sustained drop below 40 hours/week historically signals manufacturing recession. Combined with manufacturing employment, gives total labor input for productivity calculations.",
            ["aUSWKIMNA", "aUSWKIMA", "aUSWAGMANA"],
        ),
    },

    "us_commodity_fundamentals": {
        "aUSEIACR": (
            "Energy", "Million barrels/day",
            "EIA weekly crude oil inputs into refineries — refinery throughput. Largest single use of US crude. Demand pulse for crude-oil markets.",
            "Tracks domestic crude demand at the refinery gate. Seasonal: peaks in summer driving season, troughs in fall maintenance turnarounds. Compare to refinery capacity utilization for slack-vs-tightness signal. Cross-check against API weekly numbers (aUSOIARA).",
            ["aUSOIARA", "aUSEIADP", "aUSOIRUA"],
        ),
        "aUSEIADP": (
            "Energy", "Million barrels/day",
            "EIA weekly distillate fuel oil production — diesel + heating oil output from US refineries. Released in EIA Weekly Petroleum Status Report each Wednesday.",
            "Diesel demand is freight-driven (trucking + rail), a real-economy proxy. Heating oil demand is winter-weather-driven (Northeast US). Tight diesel supply in 2022 drove crack spreads to record highs — track distillate inventories alongside.",
            ["aUSOIDOA", "aUSEIACR"],
        ),
        "aUSOIRUA": (
            "Energy", "%, weekly change",
            "Refinery capacity utilization, weekly absolute change — pace of refinery slack tightening or loosening. EIA Weekly Petroleum Status Report.",
            "Refinery utilization ~85-95% in normal operation. Hurricanes (Gulf Coast) and maintenance turnarounds drive temporary drops. Sustained sub-85% suggests demand softness or capacity loss; sustained 95%+ flags capacity constraint and crack-spread expansion.",
            ["aUSEIACR"],
        ),
        "aUSOIACA": (
            "Energy", "Million barrels",
            "API weekly crude oil stocks (industry inventory) — total US commercial crude inventory excluding SPR. Industry-sourced; released Tuesday evenings, one day before EIA.",
            "Cross-check with EIA's official numbers. API often differs by 1-2 million barrels — a draw vs build divergence drives short-term oil-price moves. Markets initially trade API release; EIA next morning often confirms or reverses.",
            ["aUSOIARA", "aUSOIAIA"],
        ),
        "aUSOIAGA": (
            "Energy", "Million barrels",
            "API weekly gasoline inventories — total US gasoline stocks. Driving-season seasonality: drawdowns May-Aug as Memorial Day to Labor Day demand peaks.",
            "Cross-check with EIA gasoline stocks. Below 220M barrels = tight; above 245M = loose for the typical year. Inventories swing crack spreads (gasoline vs crude price differential).",
            ["aUSOIACA"],
        ),
        "aUSOIADA": (
            "Energy", "Million barrels",
            "API weekly distillate (diesel + heating oil) inventories — total US distillate stocks. Q4 inventory builds for winter heating; Q2 builds for trucking demand.",
            "More volatile than gasoline because two demand drivers: trucking (year-round, GDP-correlated) and heating (Q4-Q1, weather-correlated). Tight distillate stocks 2022-23 drove distillate crack spreads to record highs.",
            ["aUSOIAHA"],
        ),
        "aUSEIACI": (
            "Energy", "Million barrels/day",
            "EIA crude oil imports — official measure. Halved post-shale (2007 ~10mb/d → 2024 ~6mb/d) as US production rose from ~5mb/d to ~13mb/d.",
            "Cross-check with API (aUSOIAIA). Track Saudi/OPEC+ vs Canadian share for geopolitical exposure: Canada is now the dominant US crude supplier (~60% of imports). Pipeline disruptions (Keystone, Enbridge) drive short-term spikes.",
            ["aUSOIAIA", "aUSCEXBA"],
        ),
        "aUSNGIFA": (
            "Energy", "Bcf",
            "Natural Gas Implied Flow (EIA) — backed-out demand calculated from production minus storage change. Captures total domestic + export demand for nat gas.",
            "Important for nat-gas storage and pricing. LNG exports have surged post-2016 (Sabine Pass, Cameron, Calcasieu Pass) — implied demand now includes ~14 Bcf/d of LNG exports. Track for cold-snap demand spikes (heating) and cooling-degree-day demand (electricity for AC).",
            ["aUSNG"],
        ),
        "aUSOIAIA": (
            "Energy", "Million barrels/day",
            "API weekly crude oil imports — industry source for US crude imports, released Tuesday evening. Cross-check against EIA's official Wednesday release.",
            "Useful for forward-looking trade — API can drive overnight oil price moves before EIA confirms next morning. API methodology is voluntary reporting from refiners; EIA samples the full set, so discrepancies are usually resolved within 2-4 weeks of revisions.",
            ["aUSEIACI", "aUSOIACA"],
        ),
        "aUSOIARA": (
            "Energy", "Million barrels/day",
            "API weekly crude oil runs (refinery throughput) — same conceptual measure as aUSEIACR but industry-sourced. Total crude processed in US refineries per day.",
            "Drives demand for crude. Pair with utilization for tight-vs-loose signal. Hurricane season (Aug-Oct) on Gulf Coast can drop runs by 1-2mb/d for 2-3 weeks; major maintenance windows in spring and fall similarly reduce throughput.",
            ["aUSEIACR", "aUSOIRUA"],
        ),
    },

    "us_automobiles_transport": {
        "aUSVHLS": (
            "Auto Sales", "Million units, SAAR",
            "Total light-vehicle sales (cars + light trucks) at seasonally-adjusted annual rate. Released monthly (Wards Auto / Autodata).",
            "The headline US auto-sales print. Pre-COVID norm ~17M SAAR; supply-chain shock dropped to 13M in 2021-22; recovering toward 16M. Major demand input to GDP (consumer durables) and to inflation (used-car CPI is auto-sales-volume driven).",
            ["aUSDVEHLCV/A", "aUSTLVS", "aUSNCAR"],
        ),
        "aUSDVEHLCV/A": (
            "Auto Sales", "Million units, SAAR",
            "Total light vehicle sales (annualized) — companion series to aUSVHLS at quarterly/annual frequency. Same conceptual measure for long-time-series comparison.",
            "Cross-check against aUSVHLS. Use the higher-frequency series for monthly tracking. Long-term trend has shifted from cars (sedan-dominated 1990s) to trucks/SUVs (~75% of mix today).",
            ["aUSVHLS", "aUSTLVS"],
        ),
        "aUSTLVS": (
            "Auto Sales", "Million units, SAAR",
            "Total light vehicle sales (Autodata Corp) — alternative provider's measure of the same total light-vehicle sales. Useful for cross-check when source data revisions diverge.",
            "Autodata is the source most automakers report through. Compare against Wards Auto-sourced series to see methodology differences. Major divergences are usually corrected within 1-2 months.",
            ["aUSVHLS", "aUSDVEHLCV/A"],
        ),
        "aUSNCAR": (
            "Auto Sales", "Million units, SAAR",
            "Total car sales (passenger sedans, hatchbacks, sports cars — excluding light trucks/SUVs). Has structurally declined post-2010 as US shifted to SUV/CUV preference.",
            "Cars are now ~25% of light-vehicle sales (was 50% in 2010). Track separately from trucks for demand-mix signal. EVs are mostly classified as cars in this data; rapid EV growth partially offsets ICE-car decline.",
            ["aUSNCAR/A", "aUSCARSOA", "aUSTKLSAP"],
        ),
        "aUSDCAR": (
            "Auto Sales", "Million units, SAAR",
            "Domestic passenger car sales — cars assembled in US/Canada/Mexico (USMCA). Excludes vehicles imported from Asia or Europe.",
            "Track domestic vs imported share for trade-policy implications. Tariff regime changes show up here first. Domestic share has fallen as Asian OEMs shifted to US assembly (Toyota, Honda, Hyundai, Kia all have major US plants).",
            ["aUSICAR", "aUSNCAR"],
        ),
        "aUSICAR": (
            "Auto Sales", "Million units, SAAR",
            "Imported passenger car sales — vehicles imported from outside USMCA region. Mostly European (German luxury, UK premium) plus some Korean and Japanese supplements to US production.",
            "Sensitive to tariff policy and currency moves. EU tariff changes (proposed 2018-19, 2025) directly hit this series. Watch USDJPY and EURUSD for currency-pass-through to import-vehicle prices.",
            ["aUSDCAR", "aUSNCAR"],
        ),
        "aUSDAPRODP": (
            "Auto Production", "Million units",
            "Domestic auto unit production — vehicles assembled in US plants. Companion to sales for the supply-side picture.",
            "Inventories = production minus sales over time. Track for supply-discipline signal: when production exceeds sales, inventories build and OEM incentives rise. Chip-shortage 2021-22 caused production crater while demand persisted, driving used-car prices and CPI.",
            ["aUSPCARRVO/A", "aUSVHLS"],
        ),
        "aUSPCARRVO/A": (
            "Auto Inventory", "Million units",
            "Domestic auto unit inventory — outstanding stock of unsold vehicles at dealer + manufacturer level. Days-supply ratio (inventory/daily sales rate) is the cleaner stress signal.",
            "Pre-COVID norm ~60-90 days supply for cars, ~80-100 for trucks. 2022 supply shock saw <30 days; rebuilding now toward normal. Watch for inventory build above 100 days as a sign of demand softening.",
            ["aUSDAPRODP", "aUSVHLS"],
        ),
        "aUSAUIMCNO/A": (
            "Auto Imports", "Thousand units",
            "Auto unit imports from Canada — passenger vehicles imported from Canadian plants. Canada is integrated with US auto manufacturing under USMCA.",
            "Track for USMCA trade flows. Canadian plants produce primarily for US export (Honda Alliston, Toyota Cambridge, GM Oshawa). Tariff threats (2018, 2025) directly impact this series.",
            ["aUSDCAR", "aUSICAR"],
        ),
        "aUSDVEHCAR/A": (
            "Auto Sales", "Thousand units",
            "Domestic passenger car sales — annual aggregate of cars assembled in USMCA region. Companion to aUSDCAR at lower frequency.",
            "Use for long-term-trend analysis of domestic-vs-imported auto mix. Domestic car share has fallen as Asian OEMs shifted to US assembly (Toyota, Honda, Hyundai, Kia all have major US plants).",
            ["aUSDCAR", "aUSICAR", "aUSNCAR"],
        ),
        "aUSIMPMV/A": (
            "Auto Imports", "Thousand units",
            "Imported passenger car sales (annual) — vehicles imported from outside USMCA region. Companion to aUSICAR at lower frequency. Mostly European luxury and Japanese/Korean supplements.",
            "Sensitive to tariff policy and currency moves. Watch USDJPY and EURUSD for currency-pass-through. Section-232 tariff threats specifically target this category.",
            ["aUSICAR", "aUSDCAR"],
        ),
        "aUSNCAR/A": (
            "Auto Sales", "Thousand units",
            "Total car sales (annual) — sum of domestic + imported passenger cars. Companion to aUSNCAR at lower frequency.",
            "Annual frequency cleaner for trend analysis. Cars now ~25% of US light-vehicle market (was 50% in 2010). EVs included as cars in this data; track separately for EV-specific share.",
            ["aUSNCAR", "aUSCARSOA"],
        ),
        "aUSPCARRVP": (
            "Auto Inventory", "Million units",
            "Domestic auto unit inventory levels — alternative measure to aUSPCARRVO/A. Same underlying inventory concept at different frequency/release.",
            "Cross-check against aUSPCARRVO/A. Days-supply ratio (inventory/daily sales) is the meaningful stress signal — under 30 days = tight, over 100 = loose. Watch alongside production for the inventory-build-or-draw signal.",
            ["aUSPCARRVO/A", "aUSDAPRODP"],
        ),
        "aUSTSALE/CA": (
            "Truck Sales", "Million units, SAAR",
            "Total light truck sales (SUVs + pickups + minivans). ~75% of US light-vehicle market. Higher-margin segment for OEMs.",
            "Pickup truck demand correlates with construction and small-business activity (most pickups go to commercial buyers). Pickup-vs-SUV split useful for B2B vs consumer breakdown. Larger segment sees biggest dealer-incentive moves.",
            ["aUSTKLSAP", "aUSVHLS"],
        ),
        "aUSTKLSAP": (
            "Truck Sales", "Million units, SAAR",
            "Total light truck sales (alternative source) — same conceptual measure as aUSTSALE/CA at different release vintage.",
            "Cross-check against aUSTSALE/CA. Use whichever has fresher data. Light truck mix is the structural story of US auto market: from 30% of mix in 1990 to 75% today.",
            ["aUSTSALE/CA", "aUSVHLS"],
        ),
        "aUSTKHSAO/A": (
            "Heavy Trucks", "Thousand units",
            "Heavy truck (Class 8) sales — semi-tractors, cement mixers, dump trucks. Sold mostly to fleet operators and trucking companies. ~250-450k units/year.",
            "Pure cyclical indicator: trucking demand → fleet replacement → orders. Sustained drops below 350k SAAR have preceded freight recessions. ATA's truck tonnage index is the demand-side companion.",
            ["aUSTKHSALO/A", "aUSTKHSAP"],
        ),
    },

    # ============== ROUND 5 — bilateral FDI, FX/finance, retail sub-cats ==============
    "us_balance_of_payments": {
        "aUSCURACCGS/A": (
            "Current Account", "USD billions",
            "Current Account: total exports of goods, services, and primary income — the inflows side of the broader CA. Sums goods exports + services exports + primary-income receipts.",
            "Total credit side of the CA. Compare against aUSCURACDGS/A (debits) to see net flows. Useful for understanding why goods deficit is offset by services + primary-income surpluses.",
            ["aUSCURACDGS/A", "aUSCURACEXG/A", "aUSCURACEXS/A"],
        ),
        "aUSCURACDGS/A": (
            "Current Account", "USD billions",
            "Current Account: total imports of goods, services, and primary income — the outflows side of the broader CA. Sums goods imports + services imports + primary-income payments.",
            "Total debit side of the CA. Larger than CCGS/A in any deficit year. Decompose to find where the deficit comes from: goods (largest), services (small surplus offsetting), or primary income (becoming smaller surplus as foreign claims on US grow).",
            ["aUSCURACCGS/A", "aUSCURACIMG/A", "aUSCURACIMS/A"],
        ),
        "aUSIVDFAUA": (
            "Inward FDI", "USD billions",
            "Foreign direct investment in US from Australia — cumulative stock. Smaller bilateral relationship; mostly mining, financial services, real estate.",
            "Track for AUD-USD investment flows. Australian super funds (largest pension pool) have grown US allocations significantly post-2010. Less cyclical than European or Asian inward FDI.",
            ["aUSIVDFA", "aUSIVDAAUA"],
        ),
        "aUSIVDFCNA": (
            "Inward FDI", "USD billions",
            "Foreign direct investment in US from Canada — cumulative stock. Major bilateral; Canadian banks (TD, RBC, BMO), pension funds (CPP, OTPP, CDPQ), energy infrastructure, retail.",
            "Largest inward FDI source historically due to North American economic integration. Canadian pension funds are major US infrastructure and real-estate investors. Track alongside outward FDI to Canada (aUSIVDACNA) for the bilateral.",
            ["aUSIVDFA", "aUSIVDACNA"],
        ),
        "aUSIVDFJPA": (
            "Inward FDI", "USD billions",
            "Foreign direct investment in US from Japan — cumulative stock. Top-3 source: auto manufacturing (Toyota, Honda, Nissan, Subaru), financial services, real estate.",
            "Major bilateral — Japan invested heavily in US auto manufacturing post-1980s to circumvent voluntary export restraints. Now Japanese OEMs produce ~60% of their US sales domestically. Track yen carry-trade and Japan corporate buybacks for inflow flows.",
            ["aUSIVDFA", "aUSIVDFBDA"],
        ),
        "aUSIVDAAUA": (
            "Outward FDI", "USD billions",
            "US direct investment in Australia — cumulative stock. Smaller bilateral; mostly mining (energy + minerals), financial services, retail.",
            "Resource-sector heavy. Track for commodity-cycle exposure: US miners (Newmont, Freeport) have major AU operations. Less cyclical than European destinations because of mining-asset stickiness.",
            ["aUSIVDAA", "aUSIVDFAUA"],
        ),
        "aUSIVDABDA": (
            "Outward FDI", "USD billions",
            "US direct investment in Germany — cumulative stock. Large bilateral; auto components (manufacturing supply chains for VW, BMW, Mercedes), chemicals, business services.",
            "Pharmaceutical and tech-services heavy. Track for tax-driven repatriation effects. Germany's chemicals sector deeply integrated with US: BASF, Bayer, Henkel are major US operators; Dow, DuPont, ExxonMobil have major German sites.",
            ["aUSIVDAA", "aUSIVDFBDA"],
        ),
        "aUSIVDAUKA": (
            "Outward FDI", "USD billions",
            "US direct investment in UK — cumulative stock. Largest single European bilateral. Financial services + business services + manufacturing. ~$900B+ position.",
            "London is the European HQ for many US multinationals (JPM, Goldman, Citi, BAML, McKinsey). Track for Brexit effects (some flows shifted to Frankfurt, Paris, Dublin) and for tax-policy changes (UK corporate tax raised 2023).",
            ["aUSIVDAA", "aUSIVDFUKA"],
        ),
        "aUSIVDACNA": (
            "Outward FDI", "USD billions",
            "US direct investment in Canada — cumulative stock. Major bilateral due to integrated North American manufacturing. Auto + energy + financial services dominated.",
            "Auto OEMs (Big 3) have deep Canadian operations under USMCA. Energy: pipelines (Enbridge, TC Energy), oil sands (ExxonMobil, ConocoPhillips). Track for tariff/USMCA renegotiation impact.",
            ["aUSIVDAA", "aUSIVDFCNA"],
        ),
    },

    # ============== ROUND 5 — domestic finance: charge-offs and delinquencies ==============
    "us_domestic_finance": {
        "aUSBNQ11P": (
            "Bankruptcies", "Quarterly filings",
            "Total Chapter 11 bankruptcy filings — corporate reorganizations under federal bankruptcy code. Companies filing here aim to restructure debt while continuing operations (vs Ch 7 liquidation).",
            "Cyclical late-cycle stress signal — peaks 6-12 months after recession start. Major filings (Hertz 2020, JCPenney 2020, SVB 2023) drive headline numbers but small-business filings give cleaner cycle signal. Pre-2008 norm ~3,000/quarter; post-2010 ~2,000/quarter.",
            ["aUSBFILB", "aUSBFILNB"],
        ),
        "aUSBFILB": (
            "Bankruptcies", "Filings, 12-month rolling",
            "Total business bankruptcy filings, rolling 12-month — Chapter 7 (liquidation) + Chapter 11 (reorg) + Chapter 13 + Chapter 12 (farm). Smoother than quarterly; better for cycle reads.",
            "12-month rolling smooths volatility. Track YoY change for cycle signal: rising YoY indicates corporate stress accumulating. SBA-loan defaults flow into this stat with 6-9 month lag.",
            ["aUSBFILNB", "aUSBNQ11P"],
        ),
        "aUSBFILNB": (
            "Bankruptcies", "Filings, 12-month rolling",
            "Total non-business (consumer/personal) bankruptcy filings, rolling 12-month — Chapter 7 + Chapter 13 personal filings. Larger volume than business filings (~400-500K/year vs ~25K/year).",
            "Consumer-stress gauge. Spiked 2003-05 (record 2M filings before reform), fell post-2005 BAPCPA reform, low post-2010. Watch alongside credit-card delinquencies — bankruptcies lag delinquencies by 6-12 months.",
            ["aUSBFILB", "aUSCRDDLQA"],
        ),
        "aUSBCLAGQ/A": (
            "Bank Credit Quality", "%",
            "Charge-off rate, all banks, agricultural loans — share of ag loans deemed uncollectible. Quarterly FDIC release. Small loan book (~$80B) but cyclically sensitive to commodity prices.",
            "Track for ag-cycle stress. Spikes when crop prices fall sharply (1986 farm crisis, 2015-16 commodity downturn). Currently low. Combined with ag-real-estate values, signals farm-sector financial health.",
            ["aUSBCLALQ/A", "aUSBDLAGQ/A"],
        ),
        "aUSBCLCOOQ/A": (
            "Bank Credit Quality", "%",
            "Charge-off rate, all banks, consumer loans (other) — auto loans + personal loans + other non-card consumer credit. Excludes credit cards (separate series) and mortgages.",
            "Auto-loan-driven mostly. Subprime auto charge-offs are the leading edge — rising ahead of broader consumer stress. Track alongside auto-loan-90+-day delinquencies (NY Fed) for triangulated read.",
            ["aUSBCLALQ/A", "aUSBDLCOOQ/A"],
        ),
        "aUSBCLEASQ/A": (
            "Bank Credit Quality", "%",
            "Charge-off rate, all banks, leases — equipment leasing exposures. Smaller portfolio than C&I loans (~$120B at large banks).",
            "Cyclical with capex cycles. Equipment leases (cars, trucks, machinery) charge off in slowdowns when small businesses fail. Watch alongside C&I charge-offs for full business-credit quality picture.",
            ["aUSBCLCAIQ/A", "aUSBDLEASQ/A"],
        ),
        "aUSBDLAGQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, agricultural loans — share of ag loans 30+ days past due. Leading indicator for charge-offs (charge-offs follow delinquencies by 6-12 months).",
            "Watch for ag-cycle stress. Sustained rise above 2% historically signals farm-credit downturn. Crop prices (corn, soybean, wheat) drive farmer cash flow — track alongside USDA crop forecasts.",
            ["aUSBCLAGQ/A", "aUSBDLALQ/A"],
        ),
        "aUSBDLCAIQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, commercial and industrial loans — share of C&I loans 30+ days past due. Leading indicator of corporate-credit cycle.",
            "Pre-recession warning: rising delinquencies precede rising charge-offs by 6-12 months. Currently elevated but below 2008 peak. SLOOS lending standards typically lead delinquencies by 1-2 quarters.",
            ["aUSBCLCAIQ/A", "aUSBCLALQ/A"],
        ),
    },

    # ============== ROUND 5 — retail sub-categories ==============
    "us_retail_sales": {
        "aUSCRETE/CA": (
            "Retail Sales", "USD millions",
            "Retail Sales, standardized — OECD-comparable framing of total US retail sales. Conceptually similar to aUSRSLSFS/A but with international harmonization.",
            "Use for cross-country retail comparisons. Domestic analysts use aUSRSLSFS/A or aUSRLCOA. The standardization mostly affects category mapping (e.g., what counts as 'food retail').",
            ["aUSRSLSFS/A", "aUSRLCOA"],
        ),
        "aUSCRETPF": (
            "Retail Sales", "Percent, MoM",
            "Retail Sales, standardized, MoM percent change — month-over-month growth rate of standardized retail sales total.",
            "Monthly retail-sales pulse. Decompose into volatile categories (autos, gas) vs control group for cleaner consumer-demand read. >0.5% MoM hot, <0% cool. Watch for revisions: prior month often revised by ±0.2pp.",
            ["aUSCRETYF", "aUSRSLSFS/A"],
        ),
        "aUSCRETYF": (
            "Retail Sales", "Percent, YoY",
            "Retail Sales, standardized, YoY percent change — year-over-year growth rate. Smoother than MoM, better for trend identification.",
            ">5% YoY growth = healthy consumer; <2% = weak; negative = recession territory. Strip out auto/gas YoY share for the underlying consumer-demand signal. Compare to PCE (broader consumption measure) and consumer credit growth.",
            ["aUSCRETPF", "aUSRSLSFS/A"],
        ),
        "aUSRBSIY": (
            "Retail Sales", "Percent, YoY",
            "Johnson Redbook chain-store sales index, YoY — weekly chain-store sales tracker covering ~9,000 stores across major retailers (Walmart, Target, dollar stores, etc.).",
            "Highest-frequency retail signal — released Tuesdays for the prior week. Volatile but useful for spotting demand shifts before official monthly retail report. Holiday-season weeks (Black Friday, December) are most-watched.",
            ["aUSRBSIM", "aUSRSLSFS/A"],
        ),
        "aUSRBSIM": (
            "Retail Sales", "Percent, MoM",
            "Johnson Redbook chain-store sales, MoM — month-over-month change in weekly Redbook tracker. Rolled-up monthly aggregate.",
            "Pair with YoY for trend. Diverges from official retail-sales report when sample mix shifts (Redbook over-weights big-box and discount). Useful for early monthly-print directional signal.",
            ["aUSRBSIY"],
        ),
        "aUSRSLSBMAT/A": (
            "Retail Sales", "USD millions",
            "Retail Sales: building materials, garden equipment, supplies dealers — Home Depot/Lowe's/local-hardware-store sales. ~7% of total retail.",
            "Highly cyclical with housing — driven by remodeling and DIY activity. Falls in housing-affordability stress (2022-23) when home transactions slow. Watch alongside existing home sales (most remodeling follows home-purchase by 6-12 months).",
            ["aUSRSLSHF/A", "aUSEXHSAL"],
        ),
        "aUSRSLSHF/A": (
            "Retail Sales", "USD millions",
            "Retail Sales: furniture and home furnishings stores — sofas, rugs, lamps, decor. Strongly housing-cycle driven (people buy furniture when they move).",
            "Leading indicator for housing-related consumption. Falls 6-12 months after housing-transaction declines. Currently weak post-2022 housing slowdown. Watch alongside aUSRSLSBMAT/A for full housing-related-retail picture.",
            ["aUSRSLSBMAT/A", "aUSEXHSAL"],
        ),
    },

    # ============== ROUND 5 — wages: weekly + all-employee variants ==============
    "us_wages_earnings": {
        "aUSWKIMA": (
            "Hours", "Hours per week",
            "Average weekly hours, production workers, total manufacturing — combined durable + nondurable. Pro-cyclical: rises in booms, falls in slowdowns.",
            "Manufacturing-hours cuts precede manufacturing-employment cuts by 1-3 months. Watch for sub-40-hour readings as recession-leading indicators. Combined with aUSWKIMDA (durables) for cyclical sub-segment read.",
            ["aUSWKIMDA", "aUSWKIMNA"],
        ),
        "aUSWKIMNA": (
            "Hours", "Hours per week",
            "Average weekly hours, production workers, nondurable manufacturing — hours in food, chemicals, paper, plastics, textiles. Less cyclical than durables.",
            "More stable than durable-goods hours. Useful as a baseline for stripping out cyclical demand effects. Sustained drops here (rare) would signal broad-based manufacturing-recession risk.",
            ["aUSWKIMA", "aUSWKIMDA"],
        ),
        "aUSWKNMANB/A": (
            "Wages", "USD per week",
            "Average weekly earnings, nonfarm manufacturing — hours × hourly wage for manufacturing workers. Take-home pay proxy for industrial-sector labor.",
            "Combines wage and hours signals. Watch alongside services weekly earnings (aUSWEIPB/A) for pay-growth-by-sector picture. Manufacturing weekly wages have grown slower than services since 2010 — structural shift.",
            ["aUSEARN", "aUSWAGMANA", "aUSWKIMA"],
        ),
        "aUSWAGMANB/A": (
            "Wages", "USD per hour",
            "Average hourly earnings, nonfarm manufacturing, all employees — broader (all-employees) than production-only series. Includes supervisory + admin.",
            "More inclusive than production-only AHE. Tracks total compensation pressure in manufacturing. Use for unit-labor-cost calculations alongside productivity (aUSPHOPBUS/A).",
            ["aUSWAGMANA", "aUSEARNHM/A", "aUSULCNF/A"],
        ),
        "aUSEARNHM/A": (
            "Wages", "USD per hour",
            "Average Hourly Earnings, nonfarm, manufacturing (all employees) — same conceptual measure as aUSWAGMANB/A. Cross-check series.",
            "Cross-check against aUSWAGMANA. Use whichever has fresher data. The 'all-employees' framing has been the BLS standard since 2006 reform.",
            ["aUSWAGMANA", "aUSWAGMANB/A"],
        ),
        "aUSEARNW/A": (
            "Wages", "USD per week",
            "Average Weekly Earnings, nonfarm payroll, total private — annual aggregate companion to aUSEARN at lower frequency.",
            "Long-time-series wages tracking. Use aUSEARN for monthly tracking. Real version (deflated by CPI, aUSEARNW/CA) is the most analytically useful for household-income trend.",
            ["aUSEARN", "aUSEARNW/CA"],
        ),
        "aUSWEIPB/A": (
            "Wages", "USD per week",
            "Average Weekly Earnings, nonfarm, all employees (private) — broader than production-only weekly earnings. Includes supervisory + admin staff.",
            "More inclusive than aUSEARN (production-only). Use for total private-sector wage-pressure tracking. Diverges from production weekly earnings when supervisory-vs-production hiring mix shifts.",
            ["aUSEARN", "aUSEAHNPVT/A"],
        ),
        "aUSEAWNPVT/CA": (
            "Wages", "USD per week",
            "Average Weekly Earnings, total private, alternative source — companion series to aUSWEIPB/A.",
            "Cross-check series. Use whichever is fresher. Useful for revisions tracking.",
            ["aUSWEIPB/A", "aUSEARN"],
        ),
    },

    # ============== ROUND 5 — cyclical activity: BBK components, KC labor, STL FSI ==============
    "us_cyclical_activity_indices": {
        "aUSCBBKCYR": (
            "Activity Decomposition", "Percent, annualized",
            "Brave-Butters-Kelley Indexes, Monthly GDP Growth, cyclical component — the cyclical-fluctuation portion of the BBK monthly GDP estimate (factor model).",
            "Decomposes BBK GDP into trend + cyclical + irregular. The cyclical component is the meaningful business-cycle signal — strips out trend growth and noise. Negative readings precede recessions; positive readings = expansion phase.",
            ["aUSCBBKGPR", "aUSCBBKCGR", "aUSCBBKCLR"],
        ),
        "aUSCBBKCGR": (
            "Activity Decomposition", "Percent, annualized",
            "BBK Indexes, Monthly GDP Growth, cyclical-trend component — the trend portion of the cyclical decomposition. Underlying potential-growth pace.",
            "Smoother than the cyclical component. Tracks 'trend' GDP growth — currently ~1.8-2.0% reflecting demographic + productivity drivers. Sustained drops below 1.5% suggest secular-stagnation concerns.",
            ["aUSCBBKCYR", "aUSCBBKGPR"],
        ),
        "aUSCBBKCLR": (
            "Activity Decomposition", "Percent, annualized",
            "BBK Indexes, Monthly GDP Growth, cyclical-cycle component — the pure business-cycle deviation from trend. Negative = below-trend, positive = above-trend.",
            "Useful for output-gap estimation. Sustained negative readings = recession-territory output gap. Pair with CBO output gap estimates for triangulated read.",
            ["aUSCBBKCYR", "aUSCBBKCGR"],
        ),
        "aUSCBBKIRR": (
            "Activity Decomposition", "Percent",
            "BBK Indexes, Monthly GDP Growth, irregular component — the residual noise in the BBK decomposition. Captures one-off shocks not explained by trend or cycle.",
            "Spikes during major shocks (2020 COVID, 2008 financial crisis). Used to remove temporary distortions before reading the cyclical signal. Markets typically ignore the irregular component — focus on cyclical.",
            ["aUSCBBKCYR", "aUSCBBKGPR"],
        ),
        "aUSCFNAAR": (
            "Activity Index", "Index",
            "Chicago Fed National Activity Index — alternative release of the same CFNAI data. Captures real-time activity from 85 monthly indicators.",
            "Cross-check against aUSCFNA. Both are the same CFNAI but at different release vintages. Above-zero = above-trend growth; sustained -0.7 (3-mo MA) signals recession.",
            ["aUSCFNA", "aUSNYWER"],
        ),
        "aUSKCLMCAR": (
            "Labor Activity", "Standardized index",
            "Kansas City Fed Labor Market Conditions Index — composite of 24 labor-market indicators (claims, NFP, hours, wages, JOLTS, household survey). Available in level and momentum forms.",
            "Higher-frequency labor-market gauge than the BLS monthly print alone. Sustained negative readings precede labor-market deterioration. Pair with Sahm Rule (aUSRSAHMN/A) and CB ETI (aUSEMPTR) for triangulated cycle call.",
            ["aUSKCLMCMR", "aUSEMPTR", "aUSRSAHMN/A"],
        ),
        "aUSKCLMCMR": (
            "Labor Activity", "Standardized index",
            "KC Fed Labor Market Conditions Index — momentum component (vs level component aUSKCLMCAR). Captures rate-of-change in labor-market conditions.",
            "Leading indicator: momentum turns before levels. Negative momentum + positive level = labor market is good but cooling. Watch for sustained negative-momentum readings as recession-leading signal.",
            ["aUSKCLMCAR", "aUSEMPTR"],
        ),
        "aUSSFSIR": (
            "Financial Stress", "Index",
            "St. Louis Fed Financial Stress Index — composite of 18 weekly financial-market indicators (yields, spreads, vol). Z-score format; zero = normal stress.",
            "Real-time financial-conditions gauge. Spikes during crises (2008 ~6, 2020 ~5, 2023 SVB ~1). Sustained readings >2 indicate market stress beyond normal volatility — Fed often acts when sustained.",
            ["aUSSTLFR", "aUSKCFSIR"],
        ),
        "aUSSTLFR": (
            "Financial Stress", "Index",
            "St. Louis Financial Stress Index — alternative release. Same conceptual measure as aUSSFSIR.",
            "Cross-check series. Use whichever has fresher data. Useful for confirming stress regimes — both must agree for confident signal.",
            ["aUSSFSIR"],
        ),
    },

    # ============== ROUND 5 — consumer credit flows ==============
    "us_consumer_finance": {
        "aUSMOVZERA": (
            "Mortgage Origination", "USD millions",
            "Mortgage originations with zero risk score — borrowers who lack credit-bureau histories (typically immigrants, young first-time buyers). Niche segment.",
            "Very small share. Useful only for tracking unusual lending patterns. Major spike would indicate credit-extension to non-traditional borrowers (concerning) — currently flat.",
            ["aUSMOV620A", "aUSMOVTOTA"],
        ),
        "aUSCRDEPFA": (
            "Consumer Credit", "USD billions",
            "Consumer credit at depository institutions, flows — net new bank consumer credit creation per period. Bank-channel credit-creation flow.",
            "Decompose vs nonbank flows (credit unions, finance companies) to see channel mix. Banks are ~50% of consumer credit; share has been falling as fintechs and captive auto finance grow.",
            ["aUSCRDEPNA", "aUSCRDTLFA"],
        ),
        "aUSCRDNVFB/A": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, flows — auto + student + personal loan flows. Excludes credit cards (revolving).",
            "Auto loans dominate (~60% of nonrevolving flows). Student loans flat post-2020 forbearance/forgiveness. Track auto-loan flows for auto-sales pulse — they correlate ~0.8.",
            ["aUSCRDTLFA", "aUSCRDOUTA"],
        ),
        "aUSCREDAB": (
            "Consumer Credit", "USD billions",
            "Consumer credit, absolute change in USD — total monthly net change in outstanding consumer credit. Same as aUSCRDTLAB at different release.",
            "Watch for sharp decelerations as consumer-stress signal. 2008 crisis saw monthly contractions of $20-30B; 2020 COVID saw similar drops driven by credit-card paydowns from stimulus.",
            ["aUSCRDTLAB", "aUSCRDTLQ"],
        ),
        "aUSFMEMMVA": (
            "Auto Credit", "USD billions",
            "Consumer credit memo: motor vehicle loans, flows — net new auto-loan creation per period. Tracks auto-finance volume.",
            "Correlates with auto sales (~0.8). Track auto-loan-flow growth vs sales growth: when loans grow faster than sales, average loan-to-value rising (subprime expansion); when slower, customers paying cash.",
            ["aUSMEMMVA", "aUSCRDNVFB/A", "aUSVHLS"],
        ),
        "aUSCREDITI/A": (
            "Consumer Credit", "USD billions",
            "Consumer credit outstanding (alternate framing) — same conceptual measure as aUSCRDOUTA. Total household nonmortgage debt.",
            "Cross-check vs aUSCRDOUTA. Total ~$5T as of 2024 (revolving ~$1.3T, nonrevolving ~$3.7T). Track YoY growth rate as consumer-leverage signal.",
            ["aUSCRDOUTA", "aUSNCHCINB/A"],
        ),
        "aUSNCHCINB/A": (
            "Consumer Credit", "USD billions",
            "Consumer credit outstanding, net change (annualized rate) — annualized version of monthly absolute change. Smoothed credit-creation pace.",
            "Annualized rate makes monthly volatility comparable to year-over-year stock change. Useful for comparing fast-growing vs slow-growing periods. Pre-COVID norm ~5%/year; post-COVID swings have been much larger.",
            ["aUSCRDTLAB", "aUSCRDTLQ"],
        ),
        "aUSTUCICFA": (
            "Credit Unions", "USD billions",
            "Consumer credit at credit unions, flows — net new credit-union consumer credit creation. Credit unions are ~12% of consumer credit market.",
            "Credit unions tend to lend to higher-credit-quality borrowers and have lower charge-off rates. Growing share post-2008 (banks tightened, CUs filled gap). Track for member-base growth and lending standards.",
            ["aUSTUCICA", "aUSCRDEPFA"],
        ),
    },

    # ============== ROUND 5 — population & demographics (drop COVID/IFDI series) ==============
    "us_population": {
        "aUSPC70T4P": (
            "Demographics", "Thousand persons",
            "Civilian noninstitutional population, age 70-74 — household-survey reference population for the 70-74 age cohort.",
            "Key demographic for retirement-spending and Medicare projections. The leading edge of the boomer wave passed through this bracket 2016-2021. Track alongside Social Security beneficiary count for fiscal projections.",
            ["aUSPOP", "aUSXGBSOCA", "aUSXGBMEDA"],
        ),
    },

    # ============== ROUND 6 — productivity, FFA, money M1/M2 alts, rates, reserves ==============
    "us_productivity_labor_costs": {
        "aUSEMPCIP/A": (
            "Labor Cost", "Index",
            "Employment Cost Index, total compensation (alternate framing) — companion series to aUSEMPCI/A. Quarterly BLS release.",
            "Cross-check against aUSEMPCI/A. ECI is the Fed's preferred wage-pressure gauge over AHE because it controls for compositional shifts. Released Tue of NFP week — Fed pays close attention.",
            ["aUSEMPCI/A", "aUSEMPCAR", "aUSECWNS/A"],
        ),
        "aUSLCOSTE/CA": (
            "Unit Labor Costs", "Index",
            "Unit labor costs, business sector (index form) — labor cost per unit of output. Productivity-adjusted wage measure.",
            "ULC = compensation per hour ÷ output per hour. Sustained ULC growth above ~2% inconsistent with 2% inflation absent productivity gains. The Fed's go-to wage-inflation gauge alongside ECI.",
            ["aUSULCNF/A", "aUSPRODPH/A"],
        ),
        "aUSLCRAPG": (
            "Unit Labor Costs", "Percent change",
            "Unit labor cost growth, business nonfarm — pace of unit-labor-cost change. Productivity-adjusted wage-pressure indicator.",
            "Annualized growth rate. Above 4% sustained = wage-driven inflation pressure; below 2% = wage costs not inflationary. The Fed cites this in monetary-policy decisions.",
            ["aUSULCNF/A", "aUSLCOSTE/CA"],
        ),
        "aUSULCNBSE/CA": (
            "Unit Labor Costs", "Index",
            "Unit labor costs, business nonfarm sector (index form) — same as aUSULCNF/A but in standardized index format for international comparison.",
            "Cleanest international-comparison ULC measure. Use for cross-country competitiveness analysis. Domestic analysts use aUSULCNF/A.",
            ["aUSULCNF/A", "aUSLCRAPG"],
        ),
        "aUSPRODPH/A": (
            "Productivity", "Index",
            "Output per hour of all persons, business sector — broad productivity gauge. The headline productivity number cited in BLS releases.",
            "Trend ~1.5%/year; 2010s averaged sub-trend; 2024-25 showing recovery toward 2%. Most economically meaningful productivity measure. Trend matters more than quarterly: smooth with 4Q averages.",
            ["aUSPRODVTQ/CA", "aUSPHOPBUS/A", "aUSOUTNF/A"],
        ),
        "aUSPRODVTQ/CA": (
            "Productivity", "Percent, QoQ",
            "Output per hour of all persons, business sector, QoQ change — quarterly productivity-growth pace.",
            "Highly volatile quarterly. Smooth with 4Q averages for trend. The Fed cares about trend productivity for its implications for wage-inflation tolerance: high productivity allows higher wage growth without inflation.",
            ["aUSPRODPH/A", "aUSPHOPBUS/A"],
        ),
    },

    "us_financial_flow_of_funds_accounts": {
        "aUS31FGDSA": (
            "Federal Debt", "USD millions",
            "Federal government debt securities, liability — Flow of Funds Z.1 measure of total federal debt held outside Treasury (treasury securities held by the public + non-Treasury federal liabilities).",
            "Most-comprehensive federal-debt measure in Z.1 framework. Cross-check against Treasury Direct figures (aUSPDEBTA, aUSFEDETOS). The Z.1 includes some categories that Treasury direct excludes (FHLB, GNMA pools).",
            ["aUSPDEBTA", "aUSFEDETOS"],
        ),
        "aUSDEBTF/A": (
            "Foreign Holdings", "USD billions",
            "Flow of Funds Debt Outstanding, Foreign — debt instruments held by foreign sectors. Includes Treasury holdings (TIC data) plus corporate and agency debt.",
            "Tracks foreign claims on US debt — the financing side of US current-account deficits. Slowing foreign demand has been a Treasury concern post-2022 as China and Japan reduced Treasury holdings; partial offset from Europe.",
            ["aUSCURAC/A", "aUSPDEBTA"],
        ),
        "aUSXZLFFRA": (
            "Money Markets", "USD millions",
            "Flow of Funds: Federal funds and security repos — total fed-funds + repo lending volumes in the financial system. Z.1 quarterly.",
            "Tracks unsecured (fed funds) + secured (repo) interbank lending volumes. Repo dominates post-2008 (~$5T+ daily); fed funds is small (~$100B). Stress signals: spikes in repo rates relative to IORB indicate funding pressure.",
            ["aUSFEDFUND", "aUSRRP"],
        ),
        "aUS19MGHLA": (
            "Home Mortgages", "USD billions",
            "Home mortgages, private domestic nonfinancial — total household mortgage debt outstanding. The largest household liability category.",
            "Tracks ~$13T household mortgage book. Growth slows sharply in housing-rate-shock periods (2022-23). Pair with mortgage-origination flows and home-price appreciation for the housing-finance cycle.",
            ["aUSMOVTOTA", "aUSHPI"],
        ),
        "aUS10XXAA": (
            "Household Wealth", "USD billions",
            "Total assets, all sectors — Flow of Funds Z.1 measure of total assets in the US economy. Aggregate balance-sheet wealth.",
            "Tracks total economy balance sheet. Used in wealth-effect calculations (consumption sensitivity to wealth changes). Most analytically useful at the household-sector subset level (separate Z.1 series).",
            ["aUSHHWLTH"],
        ),
        "aUS54PCCLA": (
            "Insurance", "USD billions",
            "Policy and contract claims, life insurance — life-insurance company liabilities to policyholders. Reflects expected future claim payouts.",
            "Stable balance-sheet item. Useful for tracking life-insurance industry size. Major investor in long-duration assets (Treasuries, corporates, mortgages) — track for institutional fixed-income demand patterns.",
            [],
        ),
    },

    "us_money_supply": {
        "aUSCMS1PB/A": (
            "Money Supply", "Percent, MoM",
            "Money Supply M1 standardized, MoM percent change — monthly growth rate of M1 (currency + demand deposits + savings deposits post-2020 reclassification).",
            "Highly volatile post-2020 due to M1 reclassification. Watch year-over-year (aUSCMS1YB/A) for trend. Sustained negative monthly readings rare but happened in 2022-23 during QT.",
            ["aUSCMS1YB/A", "aUSM1"],
        ),
        "aUSCMS2PB/A": (
            "Money Supply", "Percent, MoM",
            "Money Supply M2, MoM percent change — monthly growth rate of broad M2 aggregate. The most-watched money-supply growth signal.",
            "Watch for sustained MoM contractions as monetary-tightening signals. 2022-23 saw rare M2 contractions during QT — contributed to disinflation. Compare to nominal GDP for velocity-implied trend.",
            ["aUSCMS2YB/A", "aUSM2"],
        ),
        "aUSM1/A": (
            "Money Supply", "USD billions",
            "M1 money supply (annual aggregate) — companion to monthly aUSM1 at lower frequency. Same conceptual measure.",
            "Use monthly aUSM1 for high-frequency tracking. Annual aggregate useful for long-time-series analysis. Post-2020 M1 includes savings deposits — the M1 vs M2 distinction is now blurred.",
            ["aUSM1", "aUSM2"],
        ),
        "aUSM1W/A": (
            "Money Supply", "USD billions",
            "M1 money supply, weekly — Fed H.6 release at weekly frequency. Smoother than monthly because it's a weekly average.",
            "Track for high-frequency M1 movements. Useful for spotting sudden shifts in liquidity preference (cash hoarding, deposit flight). Pair with weekly M2 (aUSM2W) for full picture.",
            ["aUSM1", "aUSM2W"],
        ),
        "aUSM1W": (
            "Money Supply", "USD billions",
            "M1 money supply, weekly (alternate release) — same conceptual measure as aUSM1W/A.",
            "Cross-check series. Use whichever is fresher.",
            ["aUSM1W/A", "aUSM1"],
        ),
        "aUSM2/A": (
            "Money Supply", "USD billions",
            "M2 money supply (annual aggregate) — companion to monthly aUSM2 at lower frequency.",
            "Use monthly aUSM2 for high-frequency tracking. Annual aggregate useful for long-time-series analysis.",
            ["aUSM2", "aUSM1"],
        ),
        "aUSM2W/A": (
            "Money Supply", "USD billions",
            "M2 money supply, weekly — Fed H.6 release at weekly frequency. Most-watched high-frequency money-supply gauge.",
            "Tracks broad money at weekly resolution. Useful for spotting policy-effect timing: M2 acceleration signals expansion phase; sustained contraction signals tightening pressure (rare, observed 2022-23).",
            ["aUSM2", "aUSM1W"],
        ),
        "aUSM2W": (
            "Money Supply", "USD billions",
            "M2 money supply, weekly (alternate release) — same conceptual measure as aUSM2W/A.",
            "Cross-check series. Use whichever has fresher data.",
            ["aUSM2W/A", "aUSM2"],
        ),
    },

    "us_interest_rates": {
        "aUSDISWPCR": (
            "Policy Rate", "Percent",
            "Discount Window Primary Credit Rate — Fed's emergency lending rate to depository institutions. Primary credit is set ~50bps above top of fed funds target range.",
            "Used in stress periods (SVB Mar 2023 saw $150B borrowing). Above-market rate by design — penalty rate for using emergency facility. Watch alongside Bank Term Funding Program (BTFP) usage for full Fed-emergency-lending picture.",
            ["aUSFEDFUND", "aUSDISWSACR"],
        ),
        "aUSDISWSACR": (
            "Policy Rate", "Percent",
            "Discount Window Seasonal Credit Rate — Fed lending rate for small banks with seasonal funding needs (agricultural areas, resort areas). Rarely used.",
            "Niche facility — relevant only for small community banks with predictable seasonal liquidity gaps. Less than $1B in typical usage. Track only for completeness.",
            ["aUSDISWPCR", "aUSFEDFUND"],
        ),
        "aUSMBKAVG": (
            "Prime Rate", "Percent",
            "Prime rate, major banks (monthly Fed average) — the rate large banks charge their best corporate customers. Conventionally set at fed funds top + 300bps.",
            "Floor for credit-card APRs (typically prime + margin) and small-business lending. Currently fed funds + 300bps; revised by major banks within 24 hours of FOMC moves. Tracks fed-funds path closely.",
            ["aUSPRIMEN", "aUSFEDFUND"],
        ),
        "aUSFOMCA": (
            "Policy Rate", "Percent",
            "Fed Funds Target Rate, daily — the actual FOMC-set policy-rate target (top end of range since Dec 2008). Released Reuters daily snapshot.",
            "The policy-rate decision itself. Markets watch FOMC meeting outcomes (8 per year) for changes. Currently 4.25-4.50% (Nov 2025); peak 5.25-5.50% (Jul 2023-Sep 2024); zero-bound 0-0.25% (2008-15, 2020-22).",
            ["aUSFEDFUND", "aUSFTRG"],
        ),
        "aUSMGAR": (
            "Mortgage Rate", "Percent",
            "MBA 30-Year Mortgage Rate — weekly survey of 30-year fixed-rate conforming mortgage average. Released Wednesdays by Mortgage Bankers Association.",
            "The most-watched mortgage rate. Higher-frequency than Freddie Mac PMMS (also weekly but Thursday). Spreads over 10Y Treasury (~250-300bps) have widened post-2022 as MBS prepayment expectations shifted. Falls drive refinance applications (track MBA refi index).",
            ["aUSGBND10", "aUSMBAMLR"],
        ),
    },

    "us_international_reserves": {
        "aUSRES": (
            "FX Reserves", "USD millions",
            "Reserve Assets (total) — US international reserves: gold, foreign currency holdings, IMF position, SDRs. ~$700B total.",
            "Small relative to US GDP (~3%) — US is reserve issuer, not reserve holder. Track for FX intervention capacity (rarely used post-1985). ~80% of total is gold (revaluation gain over decades).",
            ["aUSFXRESA", "aUSRESGLDA"],
        ),
        "aUSFXRESA": (
            "FX Reserves", "USD millions",
            "US Foreign Reserves: Total Assets — same conceptual measure as aUSRES. Treasury monthly release.",
            "Cross-check against aUSRES. The US holds reserves only minimally — most reserve-currency-issuer status means foreign central banks hold dollars instead.",
            ["aUSRES", "aUSRESGLDA"],
        ),
        "aUSRESGLDA": (
            "Gold Reserves", "USD millions",
            "US Foreign Reserves: Gold — Treasury's gold holdings (~261M troy oz / ~8,134 metric tons). Largest national gold holding globally. Valued at ~$42/oz on books but market value far higher.",
            "Stock unchanged since 1970s. Book value uses 1973 statutory price ($42/oz); market value 50× higher. Recent gold rally has put 'unrealized' gains on US balance sheet at trillions — periodically discussed for revaluation.",
            ["aUSRES", "aUSFXRESA"],
        ),
        "aUSRESIMFIRA": (
            "IMF Position", "USD millions",
            "US Foreign Reserves: IMF Position — US reserve tranche position at the IMF. Funds the US can withdraw on demand from IMF without conditions.",
            "Small (~$50B). Used in BoP accounting; rarely activated. Tracks IMF financial commitments.",
            ["aUSRVSSDRA", "aUSRES"],
        ),
        "aUSRVSSDRA": (
            "SDR Holdings", "USD millions",
            "US Foreign Reserves: Special Drawing Rights — SDR holdings at the IMF. International reserve asset created by IMF, valued by basket of major currencies.",
            "Boosted in 2021 IMF general allocation ($650B globally to support COVID recovery). Useful for tracking IMF reserve operations. Less liquid than Treasury foreign currency holdings.",
            ["aUSRESIMFIRA", "aUSRES"],
        ),
    },

    "us_import_export_price_indices": {
        "aUSCEXIYF": (
            "Export Prices", "Percent, YoY",
            "Export Prices, year-over-year change (standardized) — pace of US export-price change. Reflects US producer pricing power abroad and currency effects.",
            "Track alongside import prices for terms-of-trade signal. When export prices rise faster than import prices, terms of trade improve (US gets more imports per export). Currency-driven mostly: dollar strength compresses export prices in dollar terms.",
            ["aUSEXPP", "aUSCIMIYF"],
        ),
        "aUSCEXIF/C": (
            "Export Prices", "Index",
            "Export Prices, standardized index — companion to aUSEXPP at standardized framing for international comparison.",
            "Use for cross-country export-price comparisons. Domestic analysts use aUSEXPP. Standardization aligns with IMF/OECD cross-border statistics conventions.",
            ["aUSEXPP", "aUSCEXIYF"],
        ),
        "aUSCIMIF/C": (
            "Import Prices", "Index",
            "Import Prices, standardized index — companion to aUSIMPP at standardized framing.",
            "Direct CPI input — feeds goods inflation. Crude oil moves are biggest single driver. Watch alongside dollar (DXY) for currency-pass-through to consumer prices.",
            ["aUSIMPP", "aUSDXY"],
        ),
        "aUSCTRMF/C": (
            "Terms of Trade", "Index",
            "Terms of Trade, standardized — ratio of export prices to import prices. Measures how much imports a country gets per unit of export.",
            "Improving terms of trade = country gets more for less = real-income gain. US terms of trade improved post-shale (energy import collapse) but worsened during commodity-import surges. Watch for major shifts as macro-cycle signals.",
            ["aUSEXPP", "aUSIMPP"],
        ),
    },

    # ============== ROUND 6 — drop IFDI/Islamic banking series; cover real banking gaps ==============
    "us_banking": {
        "aUSCBAITX": (
            "Bank Income", "USD millions",
            "Commercial Banks: Applicable income taxes — federal + state taxes paid by US commercial banks. FDIC quarterly Call Report.",
            "Tracks bank profitability after tax. Useful for ROE calculations and post-tax-reform impact analysis (2017 TCJA cut bank effective tax rates from ~28% to ~21%). Bank earnings trends visible here lag pretax income.",
            ["aUSBNKINC", "aUSBNKROE"],
        ),
        "aUSBCAOLLB/A": (
            "Bank Lending", "USD millions",
            "Commercial Banks: Other loans and leases — non-traditional lending categories (lease financing, acceptances, agricultural production loans).",
            "Smaller than C&I, real estate, or consumer loan books. Useful for tracking lease-finance trends (declining as direct lending replaces leasing) and for full bank-credit picture.",
            ["aUSBCACIB/A", "aUSBCAREB/A"],
        ),
    },

    # ============== ROUND 7 — Conf Board sub-indices, mortgage applications, fed outlay categories ==============
    "us_consumer_surveys": {
        "aUSOCS005Q/A": (
            "Sentiment", "Index",
            "Composite Consumer Confidence Indicator (OECD-standardized) — averages multiple confidence gauges into one international-comparison number.",
            "Use for cross-country comparisons. US-domestic analysts use UMich (aUSCSIUM) and Conference Board (aUSCONCF/A) directly. OECD composite smooths divergences between national surveys.",
            ["aUSCSIUM", "aUSCONCF/A"],
        ),
        "aUSHOIMED": (
            "Affordability", "USD",
            "National Housing Affordability Index — median family income input. The denominator that scales the affordability calculation.",
            "Used to compute aUSHAI (affordability index = 100 means median family can afford median home). Tracks median family income trend; rises with NFP wages and demographic shifts.",
            ["aUSHAI", "aUSEARNH/A"],
        ),
        "aUSIPSOAR": (
            "Sentiment", "Index",
            "Reuters/Ipsos US Consumer Index — alternative consumer-mood gauge. Smaller-sample monthly survey by Ipsos.",
            "Tertiary cross-check vs UMich and Conference Board. Less market-moving on release. Useful when major confidence gauges diverge — provides third opinion.",
            ["aUSCSIUM", "aUSCONCF/A", "aUSIBDECOP"],
        ),
        "aUSBCIACEBC": (
            "Sentiment", "Index",
            "Conference Board: average consumer expectations for business and economic conditions — composite expectations gauge from CB survey.",
            "Captures the forward-looking aggregate of CB consumer survey. More predictive than CB Present Situation. Pair with CB Expectations sub-index for full forward-look picture.",
            ["aUSCONCE/A", "aUSCONCFEX"],
        ),
        "aUSFBUSCB/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future business conditions, % of respondents saying 'better'. Bullish-expectations percentage.",
            "Forward-looking optimism share. Pair with 'worse' (aUSFBUSCW/A) for the diffusion (better − worse) used in net-confidence calculations. Falling 'better' share is recession-leading.",
            ["aUSFBUSCS/A", "aUSFBUSCW/A"],
        ),
        "aUSFBUSCS/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future business conditions, % saying 'same'. Neutral/ambivalent percentage.",
            "Track for indecision share — typically the largest bucket. Stable at ~50-60% in normal times. Spikes during turning-point ambiguity.",
            ["aUSFBUSCB/A", "aUSFBUSCW/A"],
        ),
        "aUSFUEMPFJ/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future employment, % expecting fewer jobs. Bearish labor-outlook percentage.",
            "Rises sharply ahead of recessions — one of CB's most reliable recession-leading sub-indices. Sustained >25% has preceded every recession since the survey began.",
            ["aUSFUEMPMJ/A", "aUSCONEMS/A"],
        ),
        "aUSFUEMPMJ/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future employment, % expecting more jobs. Bullish labor-outlook percentage.",
            "Falling 'more jobs' share is recession-leading. Compute (more − fewer) for the labor-expectations diffusion — historically a reliable cycle signal.",
            ["aUSFUEMPFJ/A", "aUSCONEMS/A"],
        ),
        "aUSCONEMS/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future employment, % expecting same number of jobs. Stability/uncertainty percentage.",
            "Largest bucket typically. Useful for tracking expectations volatility — when this share falls, respondents are taking strong views (bullish or bearish).",
            ["aUSFUEMPFJ/A", "aUSFUEMPMJ/A"],
        ),
        "aUSFUIDECR/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future income, % expecting decrease. Pessimistic income-outlook share.",
            "Income-expectations are the cleanest predictor of consumption. Rising 'decrease' share precedes consumption slowdowns. Track alongside real wage growth (aUSEARNW/CA).",
            ["aUSCONFUIR/A", "aUSCONFUIS/A"],
        ),
        "aUSCONFUIR/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future income, % expecting increase. Optimistic income-outlook share.",
            "Falling income-optimism share is consumption-leading. The (increase − decrease) diffusion is the meaningful signal for forward consumption.",
            ["aUSFUIDECR/A", "aUSCONFUIS/A"],
        ),
        "aUSCONFUIS/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: future income, % expecting same. Stability share — neutral income outlook.",
            "Largest bucket typically. Useful for tracking respondent confidence in projections.",
            ["aUSFUIDECR/A", "aUSCONFUIR/A"],
        ),
        "aUSCBCLM": (
            "Buying Plans", "Percent",
            "Conference Board: plans to buy car within 6 months. Forward-looking auto-demand indicator from household survey.",
            "Leads auto sales by 1-3 months. Sustained drops below 4% historically signal slowing auto demand. Pair with aUSMAPPL6 (appliances) for big-ticket-durables outlook.",
            ["aUSMAPPL6", "aUSVHLS"],
        ),
        "aUSMAPPL6": (
            "Buying Plans", "Percent",
            "Conference Board: plans to buy major appliances within 6 months. Forward-looking durable-goods demand indicator.",
            "Big-ticket appliance demand follows housing-purchase activity. Falls when housing slows. Useful as a cross-check for retail sales of furniture/appliances (aUSRSLSHF/A).",
            ["aUSCBCLM", "aUSRSLSHF/A"],
        ),
        "aUSPBCBAD/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: present business conditions, % saying 'bad'. Pessimistic share for current-state assessment.",
            "Tracks present-conditions worry. Stays low in expansions; rises sharply at recession onset. (Good − bad) diffusion is the headline 'present situation' input.",
            ["aUSPBCGUD/A", "aUSPBCNOR/A"],
        ),
        "aUSPBCGUD/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: present business conditions, % saying 'good'. Optimistic share for current state.",
            "Stays elevated in expansions, drops sharply at recession onset. The (good − bad) diffusion is the CB Present Situation input. Falling 'good' share with rising 'bad' is a turning-point signal.",
            ["aUSPBCBAD/A", "aUSPBCNOR/A"],
        ),
        "aUSPBCNOR/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: present business conditions, % saying 'normal'. Neutral share — middle of the distribution.",
            "Largest bucket. Tracks 'how typical' respondents see conditions. Movements between 'normal' and 'good'/'bad' show inflection-point dynamics.",
            ["aUSPBCGUD/A", "aUSPBCBAD/A"],
        ),
        "aUSPEMPNSP/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: present employment, % saying 'jobs not so plentiful'. Middle-position labor-market view.",
            "Tracks ambiguity in labor-market perception. Pair with 'jobs plentiful' and 'jobs hard to get' for full Conference Board labor differential calculation.",
            ["aUSPEMPJOP/A"],
        ),
        "aUSPEMPJOP/A": (
            "CB Sub-Index", "Percent",
            "Conference Board: present employment, % saying 'jobs plentiful'. Bullish labor-market view.",
            "Used in 'labor-market differential' calculation: (jobs plentiful − jobs hard to get). One of the most predictive labor-market indicators — leads the unemployment rate by 1-2 months.",
            ["aUSPEMPNSP/A", "aUSUNTOTR"],
        ),
        "aUSCONCAQ/C": (
            "Sentiment", "Index",
            "Consumer confidence (standardized) — OECD-comparable consumer confidence framing. Aggregates multiple US confidence series.",
            "Use for cross-country comparisons. Domestic analysts use UMich/Conference Board directly. The standardization aligns with OECD methodology.",
            ["aUSCSIUM", "aUSCONCF/A"],
        ),
        "aUSUMCRAPH": (
            "UMich", "Index",
            "UMich Current Economic Conditions Index — present-state component of UMich monthly sentiment survey. Reflects current finances and buying-conditions assessments.",
            "Pair with UMich Expectations (aUSCONCFEX) for the headline sentiment. Current Conditions tends to lag Expectations at turning points; the gap (Conditions − Expectations) is a useful cycle indicator.",
            ["aUSCONCFEX", "aUSCSIUM"],
        ),
        "aUSUMCPAPH": (
            "UMich", "Index",
            "UMich Current Economic Conditions — preliminary release (mid-month). Final release follows 2 weeks later.",
            "Markets trade the preliminary release. ~80% of months see no revision; large revisions (>3 points) signal late-month news (gas-price moves, geopolitical events).",
            ["aUSUMCRAPH", "aUSCONCFEX"],
        ),
        "aUSUM5PRA": (
            "Inflation Expectations", "Percent",
            "UMich 5-10 year median inflation expectations, preliminary release. Same conceptual measure as aUSINFEXM5Y at preliminary frequency.",
            "Markets watch the preliminary release for any change in long-term anchored expectations. Sustained moves above 3.5% in this preliminary print historically draw Fed attention; revisions in the final release can move markets if direction reverses.",
            ["aUSINFEXM5Y", "aUSINFEXM1Y"],
        ),
    },

    "us_domestic_finance": {
        "aUSBDLCOQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, consumer loans (all) — share of consumer loans 30+ days past due. Comprehensive consumer-credit-stress gauge.",
            "Pre-2008 norm ~3-3.5%; 2008-09 peaked ~5%; post-recovery ~2%. Currently rising from 2022 lows as student-loan resumption + auto-loan stress feed through. Watch alongside subcategory delinquency rates for stress source.",
            ["aUSBCLALQ/A", "aUSBDLREQ/A", "aUSBDLEASQ/A"],
        ),
        "aUSBDLCOOQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, consumer loans (other) — auto + personal loans + other non-card consumer credit. Excludes credit cards (separate series) and mortgages.",
            "Auto-loan-driven mostly. Subprime auto delinquencies are the leading edge — rising ahead of broader consumer stress. Track alongside aUSBCLCOOQ/A (charge-offs) for the full credit-cycle.",
            ["aUSBCLCOOQ/A", "aUSBDLCOQ/A"],
        ),
        "aUSBDLEASQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, leases — equipment lease delinquencies. Smaller portfolio than C&I loans (~$120B at large banks).",
            "Cyclical with capex cycles. Equipment leases (cars, trucks, machinery) become delinquent in slowdowns when small businesses fail. Watch alongside C&I delinquencies for full business-credit-quality picture.",
            ["aUSBCLEASQ/A", "aUSBDLCAIQ/A"],
        ),
        "aUSBDLREQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, real estate loans (all) — combines residential mortgages + CRE delinquencies.",
            "Aggregate housing-finance stress gauge. CRE-driven recently (office sector); residential delinquencies very low post-Dodd-Frank QM rules. Decompose into residential vs CRE for clean signal.",
            ["aUSBDLRERQ/A", "aUSBCLAREQ/A"],
        ),
        "aUSBDLRERQ/A": (
            "Bank Credit Quality", "%",
            "Delinquency rate, all banks, residential real estate loans — single-family + multifamily mortgage delinquencies. Pure residential housing-credit gauge.",
            "Very low post-2010 due to QM rules + locked-in low fixed rates. 2008 peak was ~12%; now ~1.5%. Most US homeowners locked in 3-4% mortgages 2020-21 — virtually no delinquency stress despite rate hikes.",
            ["aUSBDLREQ/A", "aUSMGFSHQ/A"],
        ),
        "aUSMGFSHQ/A": (
            "Mortgage Stress", "%",
            "All loans, foreclosures started — share of mortgages entering foreclosure during the period. MBA quarterly National Delinquency Survey.",
            "Most-direct mortgage-stress gauge. Pre-2008 ~0.5%; peaked ~1.5% in 2009; post-recovery ~0.2%. Currently very low. Track alongside FHA/VA-specific foreclosure rates (higher stress) for credit-tier breakdown.",
            ["aUSMGDHQ/A", "aUSBDLRERQ/A"],
        ),
        "aUSMGDHQ/A": (
            "Mortgage Stress", "%",
            "All loans, total past due — share of mortgages 30+ days delinquent. Aggregate mortgage-credit-quality gauge from MBA.",
            "Sum of 30/60/90+-day delinquencies. Cyclical: rises in recessions, falls in expansions. Currently low (~3.5%) reflecting structural low-rate-locked-in protection. 2008 peak was ~10%.",
            ["aUSMGD3HQ/A", "aUSMGD6HQ/A", "aUSMGD9HQ/A"],
        ),
        "aUSMGD3HQ/A": (
            "Mortgage Stress", "%",
            "All loans, 30 days past due — early-stage mortgage delinquency. Most mortgages in this bucket cure (return to current) within 60 days.",
            "First sign of stress; cure rates ~70%. Watch the 30→60 progression rate as the meaningful credit-stress signal. Currently ~2% (vs ~5% peak in 2009).",
            ["aUSMGD6HQ/A", "aUSMGDHQ/A"],
        ),
        "aUSMGD6HQ/A": (
            "Mortgage Stress", "%",
            "All loans, 60 days past due — mid-stage mortgage delinquency. Cure rates lower than 30-day (~40%); higher likelihood of progression to 90+ or foreclosure.",
            "Track for credit-cycle escalation. The 30→60 progression rate is a leading indicator of foreclosure starts. Currently ~0.7%.",
            ["aUSMGD3HQ/A", "aUSMGD9HQ/A"],
        ),
        "aUSMGD9HQ/A": (
            "Mortgage Stress", "%",
            "All loans, 90+ days past due — late-stage mortgage delinquency. High probability of foreclosure absent loan modification or short sale.",
            "Most-watched mortgage-stress bucket. Currently ~0.8% (vs 5% peak in 2010). Sustained increase signals housing-credit cycle turning.",
            ["aUSMGD6HQ/A", "aUSMGFSHQ/A"],
        ),
        "aUSMGAAQ": (
            "Mortgage Demand", "Percent, WoW",
            "MBA Mortgage Applications week-over-week change — composite of purchase + refinance applications. Released Wednesdays for the prior week.",
            "Highest-frequency mortgage-demand gauge. Refinance index spikes on rate drops; purchase index follows housing-market activity. Pair with the rate level (aUSMGAR) for the rate-vs-volume relationship.",
            ["aUSMGPIAG", "aUSMGRAG", "aUSMGAR"],
        ),
        "aUSMGPIAG": (
            "Mortgage Demand", "Index",
            "MBA Purchase Index — weekly mortgage-purchase application volume. Pure home-purchase demand gauge (excludes refinance).",
            "Better real-estate-demand gauge than headline MBA index. Falls before existing home sales (purchase apps lead closings by 30-60 days). Currently weak as elevated rates suppress purchase demand.",
            ["aUSMGRAG", "aUSEXHSAL"],
        ),
        "aUSMGMAG": (
            "Mortgage Demand", "Index",
            "MBA Mortgage Market Index — composite of purchase + refinance volumes. Headline mortgage-application gauge.",
            "Volatile due to refi-rate-sensitivity. Refi spikes (when rates drop sharply) drive index moves but matter less for housing-market activity than purchase apps. Decompose to purchase + refi for clean signal.",
            ["aUSMGPIAG", "aUSMGRAG"],
        ),
        "aUSMGRAG": (
            "Mortgage Demand", "Index",
            "MBA Mortgage Refinance Index — weekly refinance application volume. Highly rate-sensitive: 50bp drop in rates can drive 50% spike in this index.",
            "Refi applications signal household interest in lowering payments. Most-locked-in borrowers from 2020-21 lows have no incentive to refi until rates fall toward 5%. Currently very low.",
            ["aUSMGPIAG", "aUSMGAR"],
        ),
        "aUSMAH/A": (
            "Mortgage Demand", "Percent, WoW",
            "Mortgage applications week-over-week change — same conceptual measure as aUSMGAAQ. Cross-check series.",
            "Use whichever is fresher. The MBA index is the standard benchmark for high-frequency mortgage activity.",
            ["aUSMGAAQ", "aUSMGMAG"],
        ),
        "aUSMTCMI/A": (
            "Mortgage Demand", "Index",
            "MBA Conventional Mortgage Market Index, refinance — refinance applications for conventional (non-government-insured) mortgages.",
            "Conventional-borrower-segment refinance gauge. Cleaner signal than total refi (excludes FHA/VA streamline programs which have different drivers).",
            ["aUSMTGMI/A", "aUSMGRAG"],
        ),
        "aUSMTGMI/A": (
            "Mortgage Demand", "Index",
            "MBA Government Mortgage Market Index, refinance — refinance applications for government-insured (FHA/VA/USDA) mortgages.",
            "Government-program borrower segment. FHA streamline refi is rate-sensitive even at small rate drops because FHA is a fixed-spread market. Useful for tracking lower-credit-quality borrower behavior.",
            ["aUSMTCMI/A", "aUSMGRAG"],
        ),
        "aUSMALSO/A": (
            "Mortgage Servicing", "Number",
            "Total Loans Serviced — number of mortgages being administered by servicers. Tracks mortgage-servicing industry size.",
            "Servicing rights are valuable assets; track for servicing-industry consolidation patterns. Slows when refinance activity is low (no new originations being serviced).",
            ["aUSMOVTOTA"],
        ),
    },

    "us_government_accounts": {
        "aUSXGBJUSA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: administration of justice — DOJ, FBI, federal courts, immigration enforcement, prisons. ~$70B annually.",
            "Discretionary spending. Watch for immigration-enforcement appropriations (DHS budget surge under Trump 2017+ and 2025+). Smaller share of total but politically watched.",
            ["aUSFOUTL"],
        ),
        "aUSXGBDEVA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: community and regional development — HUD community-development block grants, EDA programs, rural development. ~$40B annually.",
            "Small discretionary category. Includes urban-renewal grants and rural infrastructure funding. Watch for major program changes (CDBG zeroed in some Trump budgets, restored in others).",
            ["aUSFOUTL"],
        ),
        "aUSXGBGENA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: general government — Treasury, GSA, OPM, central agencies. The 'overhead' of running the federal government.",
            "Stable around $30-40B. Useful for tracking federal-workforce size; rises when Congress funds federal pay raises.",
            ["aUSFOUTL"],
        ),
        "aUSXGBSCIA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: general science, space and technology — NASA, NSF, basic research. ~$45B annually.",
            "Includes NASA (~$25B). NSF and DOE basic research split the rest. Track for science-policy debates and Mars-mission/Artemis funding.",
            ["aUSFOUTL"],
        ),
        "aUSXGBHLTA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: health (excluding Medicare) — Medicaid, NIH, CDC, CHIP, public health. ~$700B annually combined.",
            "Medicaid is the dominant component (~$600B federal share, with state matches adding more). Growth driven by ACA expansion, demographic aging, and per-enrollee medical-cost inflation. ACA Medicaid expansion in 41 states drove sustained growth post-2014.",
            ["aUSXGBMEDA", "aUSFOUTL"],
        ),
        "aUSXGBDIPA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: international affairs — State Department, USAID, foreign aid, embassies. ~$70B annually.",
            "~1% of federal budget. Includes military aid (Israel, Ukraine, Egypt, Jordan), economic aid, multilateral commitments. Variable: surges during major foreign aid (Ukraine 2022-25) or pandemic response.",
            ["aUSFOUTL", "aUSXGBDEFA"],
        ),
        "aUSXGBNATA": (
            "Federal Outlays", "USD billions",
            "Federal outlays: natural resources and environment — EPA, Interior, USFS, USGS. ~$45B annually.",
            "Includes federal lands management (BLM, USFS), national parks, EPA enforcement. Watch for environmental-policy shifts; major budget changes often tied to administration changes.",
            ["aUSFOUTL"],
        ),
        "aUSCGOVA": (
            "Central Government", "USD billions",
            "Central government deficit/surplus, standardized — OECD-comparable framing of US federal budget balance. Includes only central-government level (excludes state and local).",
            "Use for cross-country fiscal-position comparisons. US-domestic analysts use unified-budget aUSGDEFAA. The central-government framing aligns with IMF Article IV and OECD reporting.",
            ["aUSGDEFAA", "aUSCGOVPA", "aUSCGOVYA"],
        ),
        "aUSFYONET": (
            "Federal Net Outlays", "USD billions",
            "Federal net outlays — outlays minus offsetting receipts (user fees, royalties on federal lands, mineral leases). The 'net spending' figure used in budget arithmetic.",
            "Smaller than gross outlays by ~$200B (offsetting receipts). Use for budget-arithmetic consistency; gross outlays (aUSFOUTL) is the more commonly cited measure.",
            ["aUSFOUTL", "aUSGDEFAA"],
        ),
        "aUSFYFRCT": (
            "Federal Receipts", "USD billions",
            "Federal receipts (alternative framing) — companion to aUSFEDREC at potentially different release vintage.",
            "Cross-check series. Use whichever is fresher. The OMB and Treasury release the same data with slight timing differences.",
            ["aUSFEDREC", "aUSGDEFAA"],
        ),
    },

    # ============== ROUND 8 — petroleum stocks (PADDs), retail sub-cats, finance flows ==============
    "us_commodity_fundamentals": {
        "aUSOIAHA": (
            "Energy", "Million barrels",
            "API weekly heating oil inventories — subset of distillate stocks (~25-30% of distillate). Q4 demand-driven for Northeast heating.",
            "Cross-check vs EIA heating oil stocks. Track heating-degree days (HDD) for demand pulse. Mild winters depress demand and build inventories; cold snaps drive draws and price spikes.",
            ["aUSOIADA", "aUSEIADP"],
        ),
        "aUSOIAPA": (
            "Energy", "Million barrels/day",
            "API weekly product imports — refined product imports (gasoline, diesel, heating oil, jet fuel). Track for product-vs-crude import mix.",
            "US imports refined products mainly from Caribbean refineries (Trinidad, Curacao) and Europe. Falls when domestic refineries run higher; rises during US refinery outages.",
            ["aUSEIAPI", "aUSOIPIA"],
        ),
        "aUSEIAPI": (
            "Energy", "Million barrels/day",
            "EIA weekly petroleum products imports — official EIA measure of refined-products imports. Cross-check against API.",
            "Track for US refining-deficit signals: when product imports are persistently elevated, US refineries can't meet domestic demand. Used in trade-balance and consumer-fuel-price analyses.",
            ["aUSOIAPA", "aUSOIPIA"],
        ),
        "aUSOIPIA": (
            "Energy", "Million barrels/day",
            "Imports, petroleum products, absolute change — week-over-week change in product imports.",
            "Volatility signal. Spikes during refinery outages or supply disruptions (Colonial Pipeline 2021, Hurricane Harvey 2017). Smooths to ~2-3 million bpd in normal weeks.",
            ["aUSEIAPI", "aUSOIAPA"],
        ),
        "aUSOICRA": (
            "Energy", "Million barrels/day",
            "Crude oil inputs into refineries, absolute change (weekly) — pace of refinery throughput change.",
            "Captures refinery activity changes. Maintenance turnarounds (spring + fall) drop runs by 1-2 mb/d temporarily; hurricanes (Aug-Oct Gulf Coast) similar magnitude. Watch for unscheduled drops as supply-disruption signal.",
            ["aUSEIACR", "aUSOIRUA"],
        ),
        "aUSOIDOA": (
            "Energy", "Million barrels/day",
            "Distillate production, absolute change (weekly) — pace of diesel + heating oil output change.",
            "Track for distillate-supply tightness signals. Elevated demand + flat production = tightening market. Diesel demand correlates with trucking/freight (real-economy proxy).",
            ["aUSEIADP", "aUSOIDOA"],
        ),
        "aUSOIGOA": (
            "Energy", "Million barrels/day",
            "Gasoline production, absolute change (weekly) — pace of gasoline output change. Tracks driving-season supply response.",
            "Refineries shift product slate seasonally — more gasoline in summer, more distillate in winter. Watch for unusual divergences from seasonal pattern.",
            ["aUSEIACR"],
        ),
        "aUSOILGA": (
            "Energy", "Million barrels",
            "Gasoline stock levels, absolute change (weekly) — pace of gasoline-inventory change.",
            "Negative readings (draws) common in summer driving season; positive (builds) in winter. Below seasonal norm = tight market = price-supportive. Pair with refining margins for crack-spread direction.",
            ["aUSOIAGA"],
        ),
        "aUSOILRA": (
            "Energy", "Million barrels",
            "Reformulated gasoline (RFG) stock levels, absolute change — RFG is used in major metro areas (CA, NY, NJ, etc.) for clean-air requirements.",
            "Smaller stock pool than conventional gasoline. Track for regional supply tightness in metro markets. Subject to specific summer-blend mandates (RVP rules) that drive seasonal shifts.",
            ["aUSOILGA"],
        ),
        "aUSOILCA": (
            "Energy", "Million barrels",
            "Total Crude Oil stock levels (excluding SPR), absolute change — week-over-week change in commercial crude inventory.",
            "Build vs draw is the key oil-price-driving signal. Builds = bearish (oversupply); draws = bullish (tightness). Winter: typically builds; spring: typically draws. Seasonality matters.",
            ["aUSOIACA", "aUSEIAC"],
        ),
        "aUSOILDA": (
            "Energy", "Million barrels",
            "Total Distillate stock levels, absolute change — week-over-week change in diesel + heating oil inventory.",
            "Build/draw signal for distillate market. Trucking-demand-driven year-round + heating-demand seasonal Q4. Watch for tight readings as diesel-crack-spread expansion signal.",
            ["aUSOIADA"],
        ),
        "aUSEIADS500": (
            "Energy", "Million barrels",
            "EIA weekly distillate stocks (>500ppm sulfur) — non-ULSD high-sulfur distillate. Used in non-road/marine fuel and some heating applications.",
            "Smaller pool than ULSD (the dominant US diesel grade). Track for non-road fuel market dynamics. Mostly relevant to specialty-fuel markets and bunker-fuel applications.",
            ["aUSOILHA"],
        ),
        "aUSEIAPADD1": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 1 (East Coast) — distillate inventories in PADD 1 (Northeast US). Heating-oil-heavy due to NE residential heating demand.",
            "Most weather-sensitive PADD for distillate. Cold winter draws drive product imports from Europe. PADD 1 supply matters for Northeast heating-oil prices and fuel-oil markets.",
            ["aUSEIAPADDA", "aUSOILHA"],
        ),
        "aUSEIAPADD2": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 2 (Midwest) — Midwest US distillate inventory. Trucking/agriculture-heavy demand profile.",
            "Pipeline-supplied from Gulf Coast. Watch for tightness during ag-harvest periods (Sep-Nov) when farm diesel demand surges.",
            ["aUSEIAPADD1"],
        ),
        "aUSEIAPADD4": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 4 (Rocky Mountains) — small-volume PADD with limited refining capacity. Mostly truck/rail-supplied.",
            "Smallest PADD by distillate inventory. Local supply tightness can drive regional price spikes (Western Slope CO, MT, WY). Less liquid market than coastal PADDs.",
            ["aUSEIAPADD5"],
        ),
        "aUSEIAPADD5": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 5 (West Coast) — West Coast US distillate inventory. CARB-spec fuel requirements complicate cross-PADD product transfers.",
            "Insulated from other PADDs by quality requirements. CARB diesel standards mean West Coast inventory is functionally separate market. Watch for CA-specific supply/demand events.",
            ["aUSEIAPADD4"],
        ),
        "aUSEIAPADDA": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 1A (New England) — sub-region of PADD 1. Highest heating-oil exposure (Maine through Connecticut).",
            "Most weather-driven inventory in US. Mild winters → builds; cold snaps → severe draws. Heating-oil dealer inventory turnover is key real-time indicator.",
            ["aUSEIAPADDB", "aUSEIAPADD1"],
        ),
        "aUSEIAPADDB": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 1B (Mid-Atlantic) — NY, NJ, PA, DE, MD region. Mix of heating and trucking demand.",
            "More commercial/trucking-driven than PADD 1A. Pipeline-supplied (Colonial Pipeline). Watch for major pipeline disruptions impacting Mid-Atlantic supply.",
            ["aUSEIAPADDA", "aUSEIAPADDC"],
        ),
        "aUSEIAPADDC": (
            "Energy", "Million barrels",
            "EIA distillate stocks, PADD 1C (Lower Atlantic) — VA through FL. Less heating exposure than upper PADD 1; more trucking/agricultural demand.",
            "Pipeline + local refinery supplied. Hurricane-season disruptions (Aug-Oct) can sharply tighten regional supply.",
            ["aUSEIAPADDB"],
        ),
        "aUSWPETHES": (
            "Energy", "Thousand barrels",
            "Weekly US oxygenate plant production of fuel ethanol — domestic ethanol production for gasoline blending (E10, E15, E85).",
            "RFS (Renewable Fuel Standard) mandates drive ~13B gallons/year. Corn-price-sensitive on input side. Track for ag-policy implications: corn demand for ethanol affects food prices.",
            ["aUSEIACR"],
        ),
        "aUSOICIA": (
            "Energy", "Million barrels/day",
            "EIA weekly crude oil imports stock levels — companion to import flow (aUSEIACI). Tracks aggregate US-bound crude inventory.",
            "Use the flow series (aUSEIACI) for high-frequency tracking. Levels reflect logistics pipeline (in-transit cargoes plus port stocks).",
            ["aUSEIACI"],
        ),
        "aUSOILHA": (
            "Energy", "Million barrels",
            "Stock levels, distillate over 500ppm sulfur, absolute change — high-sulfur distillate inventory pace of change.",
            "Smaller specialty market. Track for bunker fuel and non-road diesel supply dynamics. Mainstream ULSD inventory (aUSOILDA) is the meaningful market gauge.",
            ["aUSEIADS500"],
        ),
    },

    "us_automobiles_transport": {
        "aUSTKHSAP": (
            "Heavy Trucks", "Thousand units",
            "Heavy truck (Class 8) sales — alternative source. Cross-check with aUSTKHSAO/A. Pure cyclical indicator: trucking demand → fleet replacement → orders.",
            "Use whichever is fresher. Sustained drops below 350k SAAR have preceded freight recessions. ATA's truck tonnage index is the demand-side companion.",
            ["aUSTKHSAO/A", "aUSTKHSALO/A"],
        ),
        "aUSDTRUCK/A": (
            "Truck Sales", "Million units",
            "Domestic light truck sales (annual aggregate) — companion to monthly truck sales at lower frequency. USMCA-region production.",
            "Use for long-term-trend analysis. Domestic-vs-imported share key for trade-policy implications. Pickup trucks dominate this category.",
            ["aUSMVEHTRKL", "aUSTSALE/CA"],
        ),
        "aUSMVEHTRKL": (
            "Truck Sales", "Thousand units",
            "Domestic light truck sales — companion to aUSDTRUCK/A. Captures pickups + SUVs assembled in US/Canada/Mexico under USMCA.",
            "Watch for nearshoring effects. Production has shifted from Mexico for some models, expanding US assembly. Track alongside aUSMVTSIMPL for full domestic-vs-imported truck mix.",
            ["aUSDTRUCK/A", "aUSMVTSIMPL/A"],
        ),
        "aUSMVTSIMPL/A": (
            "Truck Sales", "Thousand units",
            "Imported light truck sales (annual) — non-USMCA-sourced light trucks. Mostly Asian and European origin.",
            "Smaller share than imported cars because tariffs on imported pickups (25%, 'chicken tax') have historically protected US pickup makers. Subject to tariff-policy risk.",
            ["aUSTSLSIMPL", "aUSDTRUCK/A"],
        ),
        "aUSTSLSIMPL": (
            "Truck Sales", "Thousand units",
            "Imported light truck sales (alternate source) — same conceptual measure as aUSMVTSIMPL/A.",
            "Cross-check series. Use whichever is fresher. Tariff-protected category historically.",
            ["aUSMVTSIMPL/A", "aUSDTRUCK/A"],
        ),
        "aUSSRAMDAO": (
            "Auto Sales", "Million units, SAAR",
            "Autodata Retail Sales of New Cars: Domestic (Annualized Rate) — Autodata Corp's measure of domestic-only car sales (USMCA-assembled passenger cars only).",
            "Track for domestic-vs-import retail mix. Autodata is a primary source automakers report through; J.D. Power and Wards aggregate their data.",
            ["aUSDCAAO", "aUSDCAR"],
        ),
        "aUSDCAAO": (
            "Auto Sales", "Million units, SAAR",
            "Reuters Poll: Domestic Car Sales — Actual — Reuters survey-based estimate of monthly domestic car sales, used pre-release as forecast benchmark.",
            "Used by markets to anchor expectations before official release. Comparison vs actual print drives short-term auto-sector trades.",
            ["aUSDCAR", "aUSSRAMDAO"],
        ),
        "aUSDTRAO": (
            "Truck Sales", "Million units, SAAR",
            "Reuters Poll: Domestic Truck Sales — Actual — Reuters poll-based estimate. Markets use as forecast benchmark before official monthly release.",
            "Survey-anchored estimate. Comparison vs actual print drives auto-sector reaction. Domestic truck sales matter for domestic-OEM share (Ford F-150, Chevy Silverado, Ram).",
            ["aUSMVEHTRKL", "aUSVEHAO"],
        ),
        "aUSVEHAO": (
            "Auto Sales", "Million units, SAAR",
            "Reuters Poll: Total Vehicle Sales — Actual — Reuters total-vehicle-sales survey estimate, anchor for monthly release expectations.",
            "Most-watched of the Reuters auto polls. Comparison vs actual print drives broad auto-sector trades. ~17M SAAR = healthy; <14M = stressed.",
            ["aUSVHLS", "aUSDCAAO", "aUSDTRAO"],
        ),
        "aUSACRFRM": (
            "Air Cargo", "Ton-miles",
            "Air cargo traffic, revenue freight ton-miles — total air freight activity at US airports. BTS monthly release.",
            "Cyclical: tracks goods trade and e-commerce demand. Spiked 2020-21 during pandemic e-commerce surge. Watch alongside trucking and rail freight for full freight-cycle picture.",
            ["aUSACTOT"],
        ),
        "aUSPTRAH": (
            "Air Travel", "Aircraft hours",
            "Air passenger traffic, revenue aircraft hours (airborne). BTS monthly. Captures fleet-utilization for passenger flights.",
            "Tracks passenger-flight activity. Recovered fully from COVID by 2024. Watch for capacity discipline post-recovery (airlines avoiding overcapacity).",
            ["aUSPTRAMF", "aUSPTRDEP", "aUSPTRPEP"],
        ),
        "aUSPTRAMF": (
            "Air Travel", "Aircraft miles",
            "Air passenger traffic, revenue aircraft miles flown — total miles flown by passenger aircraft. Companion to aircraft-hours.",
            "Tracks long-haul vs short-haul mix. Long-haul international has lagged domestic in COVID recovery. Watch alongside aircraft-hours for trip-length signal.",
            ["aUSPTRAH"],
        ),
        "aUSPTRDEP": (
            "Air Travel", "Departures",
            "Air passenger traffic, revenue departures performed — number of passenger flights operated.",
            "Tracks total flight count. Combined with passenger enplanements gives load-factor implications. Departure count is more frequency-driven; enplanements more demand-driven.",
            ["aUSPTRAH", "aUSPTRPEP"],
        ),
        "aUSPTRPEP": (
            "Air Travel", "Passengers",
            "Air passenger traffic, revenue passenger enplanements — total passengers boarding flights. The 'how many people flew' number.",
            "Cyclical with leisure + business travel demand. TSA security throughput is the high-frequency complement. Watch for peak-summer-travel season trends and post-COVID business-travel recovery.",
            ["aUSPTRDEP", "aUSACTOT"],
        ),
        "aUSACTOT": (
            "Air Total", "Ton-miles",
            "Air passenger traffic, total revenue ton-miles — combined passenger + cargo ton-miles. Captures total revenue-generating activity.",
            "Aggregate aviation activity gauge. Watch for overall airline industry health. Decompose into passenger vs cargo for source of growth/weakness.",
            ["aUSPTRPEP", "aUSACRFRM"],
        ),
        "aUSTRANSP/A": (
            "Transportation", "Index",
            "Transportation Services Index, passenger — BTS composite of passenger transportation activity (air, rail, transit). Released monthly.",
            "Real-time passenger-transportation pulse. Combined with freight-side TSI gives total-transportation cycle gauge. Useful as a coincident-economy indicator.",
            ["aUSPTRPEP"],
        ),
    },

    "us_consumer_finance": {
        "aUSFCCICFA": (
            "Consumer Credit", "USD billions",
            "Consumer credit, finance companies, flows — net new credit creation by finance companies (Ford Motor Credit, GM Financial, Toyota Financial, etc.).",
            "Captive auto finance dominates this category. Flows correlate with auto sales but with higher beta because captives often offer subsidized financing to support sales.",
            ["aUSFCCICA", "aUSCRDTLFA"],
        ),
        "aUSCRDTLFA": (
            "Consumer Credit", "USD billions",
            "Total consumer credit flows — net new credit creation across all channels (banks, credit unions, finance companies, nonfinancial business, federal government).",
            "Aggregate flow measure. Decompose by channel for source of growth. Federal government student loans are a major share post-2010. Falling flows = consumer-credit cycle turning.",
            ["aUSCRDTLAB", "aUSCRDTLQ"],
        ),
        "aUSBSCICA": (
            "Consumer Credit", "USD billions",
            "Consumer credit, nonfinancial business — credit extended directly by retailers (store credit cards, layaway, etc.). Smaller channel.",
            "Niche category but cyclical. Retailer-direct credit grew during pandemic for buy-now-pay-later programs. Track for retailer-credit-program expansion.",
            ["aUSBSCICFA"],
        ),
        "aUSBSCICFA": (
            "Consumer Credit", "USD billions",
            "Consumer credit, nonfinancial business, flows — net new credit creation by retailers/nonfinancial businesses.",
            "Track for BNPL (buy-now-pay-later) ecosystem growth. Affirm, Klarna, Afterpay programs partially captured here. Volatile due to small base.",
            ["aUSBSCICA"],
        ),
        "aUSCUCIFNA": (
            "Consumer Credit", "USD billions",
            "Consumer credit, nonrevolving at credit unions, flows — net new credit-union nonrevolving (auto + personal) lending.",
            "CUs growing share post-2008. Watch for member-base growth and lending standards. Auto lending is dominant within CU nonrevolving.",
            ["aUSCUCICNA", "aUSTUCICFA"],
        ),
        "aUSCRDPFNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit at depository institutions, flows — net new bank nonrevolving (auto + personal) lending.",
            "Bank-share gauge for nonrevolving lending. Bank share has fallen as captive finance grew (auto OEMs offer subsidized rates). Watch for share recovery if captives retreat.",
            ["aUSCRDEPNA", "aUSCRDNVFB/A"],
        ),
        "aUSFFCCFNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, finance companies, flows — net new finance-company nonrevolving lending. Mostly auto captives.",
            "Auto-loan flow proxy. Highly sensitive to auto-sales pace. Captives use 0% promo financing to drive volume — watch promo-financing share for auto-incentive cycle.",
            ["aUSFCCICA", "aUSFCCICFA"],
        ),
        "aUSBSCIFNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, nonfinancial business, flows — retailer-direct nonrevolving lending. Smaller niche.",
            "Track for installment-credit programs. BNPL ecosystem partially flows here. Volatile due to small base.",
            ["aUSBSCICOA"],
        ),
        "aUSCRDTNQ": (
            "Consumer Credit", "Percent, MoM annualized",
            "Nonrevolving consumer credit, monthly percent change (annualized) — pace of nonrevolving (auto + student) credit growth.",
            "Smoother than revolving (cards). Auto-loan-driven cyclically; student-loan flows depend on policy (forgiveness, forbearance). Recent: weakened with auto-sales pullback.",
            ["aUSCRDTLQ", "aUSCRDTNAB"],
        ),
        "aUSCRDTNAB": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, monthly absolute change — net new nonrevolving lending per month.",
            "Decompose vs revolving for cycle signal. Nonrevolving cycle lags consumer-spending cycle by 1-2 months (loans booked after purchase decisions).",
            ["aUSCRDTNQ", "aUSCRDTLAB"],
        ),
        "aUSCICNRVA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit outstanding — total stock of nonrevolving credit (auto + student + personal). ~$3.7T.",
            "Largest share of consumer credit (~75%). Student loans alone are ~$1.7T. Watch alongside revolving (cards) outstanding for total-leverage picture.",
            ["aUSCRDOUTA"],
        ),
        "aUSCUCICNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit at credit unions — CU nonrevolving lending stock. ~$400B.",
            "Auto-loan-heavy. CUs gaining share post-2008. Track for member-base growth and average loan size.",
            ["aUSTUCICA", "aUSCUCIFNA"],
        ),
        "aUSFCCICNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit at finance companies — captive auto finance + personal-loan finance companies. ~$700B.",
            "Auto OEM captives dominate. Watch for share trends vs banks; captives gain share when promotional financing aggressive.",
            ["aUSFCCICA", "aUSFCCICFA"],
        ),
        "aUSCICNFNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, total flows — aggregate of all-channel nonrevolving lending creation.",
            "Sum of bank + CU + finance company + nonfin business + federal government nonrevolving flows. Federal government (student loans) is variable based on policy.",
            ["aUSCRDNVFB/A", "aUSCRDTLFA"],
        ),
        "aUSBSCICOA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, nonfinancial business — retailer-direct installment credit stock.",
            "Niche category. Includes retailer financing programs and BNPL providers. Track for ecosystem growth.",
            ["aUSBSCIFNA"],
        ),
        "aUSFICICNA": (
            "Consumer Credit", "USD billions",
            "Nonrevolving consumer credit, pool of securitized assets — auto-loan ABS and other consumer-credit-backed securities.",
            "Tracks securitized funding of consumer credit. ABS issuance is the supply side; investor demand drives pricing of subprime auto deals. Watch for ABS-spread changes as credit-cycle indicator.",
            ["aUSFCCICA"],
        ),
    },
}


# Merge CORRECTIONS into CONTENT (later keys win)
for _slug, _entries in CORRECTIONS.items():
    CONTENT.setdefault(_slug, {}).update(_entries)


# ============================================================
# AST-based recovery for duplicate slug blocks in CONDENSED_HAND.
# Python's dict literal silently drops earlier blocks when the same slug
# is declared more than once at the top level. We re-parse this file's
# source to recover ALL declared slug blocks and merge them in declaration
# order so later blocks override earlier ones key-by-key (not block-wise).
# ============================================================
import ast as _ast

def _recover_condensed_hand():
    with open(__file__, 'r', encoding='utf-8') as _f:
        _src = _f.read()
    _tree = _ast.parse(_src)
    # Find the CONDENSED_HAND assignment node
    for _node in _ast.walk(_tree):
        if isinstance(_node, _ast.AnnAssign) and isinstance(_node.target, _ast.Name) and _node.target.id == 'CONDENSED_HAND':
            _dict_node = _node.value
            break
        if isinstance(_node, _ast.Assign):
            for _t in _node.targets:
                if isinstance(_t, _ast.Name) and _t.id == 'CONDENSED_HAND':
                    _dict_node = _node.value
                    break
    else:
        return  # Not found
    if not isinstance(_dict_node, _ast.Dict):
        return
    # Walk every (key, value) pair — duplicates included — and accumulate
    _accumulated = {}
    for _k_node, _v_node in zip(_dict_node.keys, _dict_node.values):
        if not isinstance(_k_node, _ast.Constant):
            continue
        _slug = _k_node.value
        try:
            _entries = _ast.literal_eval(_v_node)
        except Exception:
            continue
        if not isinstance(_entries, dict):
            continue
        _accumulated.setdefault(_slug, {}).update(_entries)
    # Replace CONDENSED_HAND in module globals
    globals()['CONDENSED_HAND'] = _accumulated

_recover_condensed_hand()


# Apply CONDENSED_HAND LAST so investor-priority hand content always wins over
# template-derived CORRECTIONS entries (last writer wins)
for _slug, _entries in CONDENSED_HAND.items():
    CONTENT.setdefault(_slug, {}).update(_entries)


# ============================================================
# Apply
# ============================================================

def apply_to_catalog(slug: str, content: dict) -> tuple[int, int]:
    path = os.path.join(CATALOG_DIR, f"{slug}.json")
    if not os.path.exists(path):
        print(f"  SKIP: catalog/{slug}.json not found")
        return 0, 0
    with open(path, encoding="utf-8") as f:
        cat = json.load(f)
    by_ric = {r["ric"]: r for r in cat["rics"]}
    updated = 0
    skipped = 0
    for ric, fields in content.items():
        if ric not in by_ric:
            print(f"    MISS: {ric}")
            skipped += 1
            continue
        entry = by_ric[ric]
        # Tier-1 RICs are not present in this script's CONTENT dict, so we
        # always overwrite whatever is there (templated content) with Tier-2 content.
        sub, units, meaning, how_to_use, related = fields
        entry["subcategory"] = sub
        entry["units"] = units
        entry["meaning"] = meaning
        entry["how_to_use"] = how_to_use
        entry["related_series"] = related
        updated += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=2)
    return updated, skipped


def main() -> int:
    target_slugs = sys.argv[1:] if len(sys.argv) > 1 else list(CONTENT.keys())
    total_updated = 0
    total_skipped = 0
    for slug in target_slugs:
        if slug not in CONTENT:
            print(f"  [{slug}] no content defined yet")
            continue
        u, s = apply_to_catalog(slug, CONTENT[slug])
        print(f"  [{slug}] updated {u}, missing {s}")
        total_updated += u
        total_skipped += s
    print()
    print(f"[seed-tier2] updated {total_updated} RICs, missed {total_skipped}")
    return 0 if total_skipped == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
