"""
mapping.py — domain knowledge: IDX equity basket -> driver candidate map.

This is the "alpha seed". For each IDX sub_sector basket we declare:
  - ceic: list of CEIC idind (category[, subcategory]) groups whose demand/supply
          series are candidate drivers. None subcategory => take the whole category.
  - globals/macro: explicit live_indicators keys with a THEORETICAL sign prior
          (expected sign of the relationship between the driver's change and the
          basket's EXCESS return vs IHSG) and a one-line economic rationale.

Sign convention (`sign`): +1 if a RISE in the driver should LIFT the basket's
excess return; -1 if a rise should DEPRESS it. `role`:
  demand  — pulls revenue/volume up
  supply  — output/availability (own-commodity price = revenue for producers)
  cost    — input cost (margin pressure)
  macro   — rates / FX / liquidity / risk regime

The statistical engine treats these as PRIORS, not truth: it still estimates the
empirical sign/magnitude from prices and only keeps drivers that survive the
data-quality + significance + theory-reconciliation gates. Unmapped baskets fall
back to SECTOR_CEIC + STD_MACRO and let the stats discover the structure.
"""

BENCHMARK = "jci"  # IHSG — Jakarta Composite, for excess-return computation

# Resolve a live_indicators key -> deep-history series id in correlation.sqlite.
# (macro.observations only backfilled a few keys; correlation.sqlite holds the
# real weekly/monthly history for commodities, FX, yields, and ID/CN macro.)
# Keys mapped to None have no deep source -> engine falls back to the live
# indicator's `spark` (recent only, flagged low-confidence).
GLOBAL_CORR = {
    # energy
    "wb_coal_au": "ICEEUR:ATW1!", "brent": "ICEEUR:BRN1!", "wti": "NYMEX:CL1!",
    "natgas": "NYMEX:NG1!", "wb_lng_jp": "SGX:JKM1!", "heating_oil": "NYMEX:HO1!",
    "gasoline": "NYMEX:RB1!",
    # metals
    "copper": "COMEX:HG1!", "gold": "COMEX:GC1!", "silver": "COMEX:SI1!",
    "iron_ore": "SGX:FEF1!", "steel_hrc": "NYMEX:HRC1!", "aluminum": "COMEX:ALI1!",
    "wb_nickel": None, "wb_tin": None, "platinum": "NYMEX:PL1!",
    "palladium": "NYMEX:PA1!", "lithium_etf": "AMEX:LIT",
    # agri / softs
    "wb_palm_oil": "MYX:FCPO1!", "soybean_oil": "CBOT:ZL1!",
    "soybean_meal": "CBOT:ZM1!", "soybeans": "CBOT:ZS1!", "wheat": "CBOT:ZW1!",
    "corn": "CBOT:ZC1!", "wb_sugar_world": "ICE:SB1!", "sugar": "ICE:SB1!",
    "coffee": "ICE:KC1!", "wb_coffee_robusta": "ICE:RC1!", "cocoa": "ICE:CC1!",
    "cotton": "ICE:CT1!", "wb_cotton": "ICE:CT1!", "wb_rubber": "SGX:TF1!",
    "wb_logs": "CME:LBR1!", "wb_urea": None, "wb_potash": None,
    # indices / broad
    "bcom": "AMEX:DBC", "sp_gsci": "AMEX:GSG", "ndx": "NASDAQ:NDX",
    "spx": "SP:SPX", "vix": "CBOE:VIX", "jci": "IDX:COMPOSITE",
    # FX
    "usdidr": "FX_IDC:USDIDR", "dxy": "TVC:BBDXY", "usdcny": "FX_IDC:USDCNY",
    # rates / yields
    "us_10y": "TVC:US10Y", "ust_10y_y": "TVC:US10Y", "us_2y": None,
    "id_10y": "TVC:ID10Y", "id_01y": "TVC:ID01Y",
    # Indonesia macro
    "id_bi_rate": "ECONOMICS:IDINTR", "id_lending_rate": None,
    "id_bank_credit": "aIDLONYAR", "id_m2": "aIDM2AR",
    "id_cpi_yoy": "ECONOMICS:IDIRYY", "id_gdp_real_q": "aIDGDPAR1",
    "id_exports": "aIDEXGAR", "id_imports": "aIDIMGAR",
    "id_govt_debt": None, "id_pmi": "aIDPMIMAQ",
    "id_consumer_confidence": "aIDCONIAR", "id_retail": "aIDRSLSAR",
    # China macro
    "cn_ip_yoy": "aCNIP", "cn_pmi_mfg": "aCNPMIMT", "cn_retail_yoy": "aCNCRETYF",
    "cn_ppi_idx": "aCNPPIAR", "cn_cpi_yoy": "aCNCPIYY", "cn_m2_yoy": "aCNM2GRTY",
    "cn_property_inv": None,
}

# Equity sector -> CEIC idind category fallback (when no specific basket seed).
SECTOR_CEIC = {
    "Energy": ["Energy"],
    "Basic Materials": ["Basic Materials", "Metals & Mining"],
    "Consumer Non-Cyclicals": ["Consumer Staples", "Plantation & Agriculture"],
    "Consumer Cyclicals": ["Consumer Discretionary"],
    "Financials": ["Banks"],
    "Healthcare": ["Healthcare"],
    "Industrials": ["Industrials & Manufacturing"],
    "Technology": ["Technology"],
    "Infrastructure": ["Telecom", "Industrials & Manufacturing"],
    "Properties & Real Estate": [],
    "Transportation & Logistics": ["Transport & Logistics"],
}

# Standard macro overlay applied to (almost) every basket.
STD_MACRO = [
    ("usdidr", "macro", 0, "IDR weakness: +for USD earners, -for importers/FX debt"),
    ("id_bi_rate", "macro", 0, "policy rate: sector-specific NIM/discount effect"),
    ("id_cpi_yoy", "macro", 0, "inflation regime"),
    ("id_gdp_real_q", "macro", +1, "domestic demand backdrop"),
]

# ---- Curated basket seeds (keyed by equity sub_sector) --------------------- #
# tuple driver: (key, role, sign, why)
SEED = {
    # ---------------- ENERGY ----------------
    "Coal": {
        "ceic": [("Energy", "Coal")],
        "globals": [
            ("wb_coal_au", "supply", +1, "Newcastle coal = revenue/tonne"),
            ("brent", "demand", +1, "energy complex co-moves; oil-coal substitution"),
            ("natgas", "demand", +1, "gas-coal switching in power gen"),
            ("bcom", "demand", +1, "broad commodity beta"),
        ],
        "macro": [
            ("cn_ip_yoy", "demand", +1, "China industrial output = thermal demand"),
            ("cn_pmi_mfg", "demand", +1, "China manufacturing pulse"),
            ("usdidr", "macro", +1, "USD coal revenue vs IDR cost base"),
            ("id_exports", "demand", +1, "Indonesia export volume incl. coal"),
        ],
    },
    "Oil & Gas": {
        "ceic": [("Energy", "Crude Oil")],
        "globals": [
            ("brent", "supply", +1, "Brent = upstream revenue"),
            ("wti", "supply", +1, "crude price"),
            ("natgas", "supply", +1, "gas price for gas-weighted names (PGAS)"),
            ("wb_lng_jp", "supply", +1, "LNG export pricing"),
        ],
        "macro": [("usdidr", "macro", +1, "USD-priced output"),
                  ("us_10y", "macro", -1, "discount-rate sensitivity")],
    },
    "Energy Services": {  # mostly coal-mining contractors (DOID/PTRO/DEWA/ABMM)
        "ceic": [("Energy", None)],
        # coal/gas PRODUCTION activity is CEIC-'supply' but is DEMAND for a
        # services basket (more mining -> more contractor work).
        "ceic_override": [("mining & quarrying: coal", "demand", +1),
                          ("coal production", "demand", +1),
                          ("production: natural gas", "demand", +1)],
        "globals": [("bcom", "demand", +1, "commodity cycle -> coal-miner capex -> contractor demand"),
                    ("brent", "demand", +1, "upstream capex follows crude"),
                    ("wb_coal_au", "demand", +1, "coal services demand")],
        "macro": [("cn_ip_yoy", "demand", +1, "China demand -> coal volumes -> services"),
                  ("usdidr", "macro", +1, "USD-denominated contracts")],
    },
    "Alternative Energy": {
        "ceic": [("Energy", "Electricity")],
        "globals": [("lithium_etf", "demand", +1, "renewables/storage theme"),
                    ("wb_coal_au", "cost", -1, "thermal alternative cost")],
        "macro": [("us_10y", "macro", -1, "long-duration growth proxy"),
                  ("ndx", "demand", +1, "global growth/clean-energy beta")],
    },
    # ---------------- BASIC MATERIALS ----------------
    "Mining": {
        "ceic": [("Basic Materials", "Nickel"), ("Metals & Mining", None),
                 ("Basic Materials", "Gold & Precious Metals"),
                 ("Basic Materials", "Copper")],
        "globals": [("wb_nickel", "supply", +1, "nickel = key revenue metal"),
                    ("copper", "supply", +1, "copper exposure"),
                    ("gold", "supply", +1, "gold miners (ANTM/MDKA)"),
                    ("wb_tin", "supply", +1, "tin exposure")],
        "macro": [("cn_ip_yoy", "demand", +1, "China metals demand"),
                  ("usdidr", "macro", +1, "USD metal revenue"),
                  ("dxy", "macro", -1, "USD strength caps metals")],
    },
    "Metals & Mining": {
        "ceic": [("Metals & Mining", None), ("Basic Materials", "Nickel")],
        "globals": [("wb_nickel", "supply", +1, "nickel/ferronickel revenue"),
                    ("iron_ore", "supply", +1, "iron ore/steel feed"),
                    ("aluminum", "supply", +1, "aluminium exposure")],
        "macro": [("cn_pmi_mfg", "demand", +1, "China demand"),
                  ("usdidr", "macro", +1, "USD revenue")],
    },
    "Metals": {  # downstream steel/processed
        "ceic": [("Basic Materials", "Steel"),
                 ("Industrials & Manufacturing", "Basic Metals Manufacturing")],
        "globals": [("steel_hrc", "supply", +1, "HRC steel price = revenue"),
                    ("iron_ore", "cost", -1, "iron ore input cost"),
                    ("wb_coal_au", "cost", -1, "coking coal input")],
        "macro": [("usdidr", "macro", -1, "imported slab/scrap feedstock cost"),
                  ("cn_ppi_idx", "demand", +1, "China PPI/steel cycle"),
                  ("id_10y", "macro", -1, "construction-demand rate sensitivity"),
                  ("id_gdp_real_q", "demand", +1, "domestic construction")],
    },
    "Chemicals": {
        "ceic": [("Basic Materials", "Fertilizers"),
                 ("Basic Materials", None)],
        "globals": [("wb_urea", "supply", +1, "urea/fertiliser price"),
                    ("wb_potash", "supply", +1, "potash price"),
                    ("brent", "cost", -1, "petrochemical feedstock cost"),
                    ("natgas", "cost", -1, "gas feedstock for ammonia")],
        "macro": [("usdidr", "macro", -1, "imported feedstock cost"),
                  ("wb_palm_oil", "demand", +1, "oleochemical demand")],
    },
    "Cement": {
        "ceic": [("Industrials & Manufacturing", None)],
        "globals": [("wb_coal_au", "cost", -1, "coal = ~30% of cement cash cost"),
                    ("brent", "cost", -1, "fuel/logistics cost")],
        "macro": [("id_10y", "macro", -1, "10Y yield: property/construction demand rate-elastic"),
                  ("id_bi_rate", "macro", -1, "policy rate"),
                  ("id_gdp_real_q", "demand", +1, "construction activity"),
                  ("usdidr", "macro", -1, "imported equipment/energy")],
    },
    "Paper": {
        "ceic": [("Industrials & Manufacturing", "Paper & Pulp")],
        "globals": [("wb_logs", "cost", -1, "pulpwood input"),
                    ("wb_coal_au", "cost", -1, "energy input"),
                    ("bcom", "supply", +1, "pulp/paper price proxy")],
        "macro": [("usdidr", "macro", +1, "USD pulp exporters"),
                  ("cn_ip_yoy", "demand", +1, "regional packaging demand")],
    },
    "Containers & Packaging": {
        "ceic": [("Industrials & Manufacturing", "Rubber & Plastic Products")],
        "globals": [("brent", "cost", -1, "resin/plastics feedstock"),
                    ("steel_hrc", "cost", -1, "metal can input")],
        "macro": [("id_gdp_real_q", "demand", +1, "FMCG packaging demand")],
    },
    "Construction Materials": {
        "ceic": [("Industrials & Manufacturing", None)],
        "globals": [("steel_hrc", "supply", +1, "steel/building products"),
                    ("wb_coal_au", "cost", -1, "energy input")],
        "macro": [("id_bi_rate", "macro", -1, "construction demand"),
                  ("id_gdp_real_q", "demand", +1, "infra cycle")],
    },
    # ---------------- CONSUMER NON-CYCLICALS ----------------
    "Plantation": {
        "ceic": [("Plantation & Agriculture", "Palm Oil (CPO)"),
                 ("Plantation & Agriculture", None)],
        "globals": [("wb_palm_oil", "supply", +1, "CPO price = revenue"),
                    ("soybean_oil", "demand", +1, "veg-oil substitute sets price floor"),
                    ("brent", "demand", +1, "biodiesel/energy linkage")],
        "macro": [("usdidr", "macro", +1, "USD CPO export revenue"),
                  ("cn_retail_yoy", "demand", +1, "China veg-oil demand")],
    },
    "Food & Beverage": {
        "ceic": [("Consumer Staples", None)],
        "globals": [("wb_palm_oil", "cost", -1, "cooking oil input"),
                    ("wheat", "cost", -1, "flour/noodle input"),
                    ("wb_sugar_world", "cost", -1, "sugar input"),
                    ("coffee", "cost", -1, "coffee bean input"),
                    ("soybean_meal", "cost", -1, "feed input")],
        "macro": [("id_cpi_yoy", "demand", -1, "high inflation erodes volumes"),
                  ("id_gdp_real_q", "demand", +1, "consumption growth"),
                  ("usdidr", "macro", -1, "imported inputs")],
    },
    "Household": {
        "ceic": [("Consumer Staples", None)],
        "globals": [("brent", "cost", -1, "surfactant/packaging feedstock"),
                    ("wb_palm_oil", "cost", -1, "oleochemical input")],
        "macro": [("id_10y", "macro", -1, "defensive bond-proxy (UNVR) re-rates on yields"),
                  ("id_cpi_yoy", "demand", -1, "high inflation erodes real volumes"),
                  ("id_gdp_real_q", "demand", +1, "household spend"),
                  ("usdidr", "macro", -1, "imported inputs")],
    },
    "Tobacco": {
        "ceic": [("Consumer Staples", "Tobacco"),
                 ("Consumer Staples", "Tobacco & Cigarette")],
        "globals": [],
        "macro": [("id_cpi_yoy", "cost", -1, "excise/CPI pass-through pressure"),
                  ("id_gdp_real_q", "demand", +1, "disposable income"),
                  ("id_bank_credit", "demand", +1, "consumer liquidity")],
    },
    "Poultry": {
        "ceic": [("Consumer Staples", "Poultry Trade"),
                 ("Consumer Staples", "Livestock & Animal Husbandry")],
        "globals": [("corn", "cost", -1, "corn = ~50% of feed cost"),
                    ("soybean_meal", "cost", -1, "soymeal feed cost")],
        "macro": [("id_cpi_yoy", "demand", +1, "broiler/DOC price = revenue"),
                  ("id_gdp_real_q", "demand", +1, "protein demand")],
    },
    "Staple Retail": {
        "ceic": [("Consumer Staples", "Food Retail Prices")],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "retail footfall"),
                  ("id_cpi_yoy", "demand", -1, "real spend")],
    },
    # ---------------- FINANCIALS ----------------
    "Banks": {
        "ceic": [("Banks", None)],
        "globals": [],
        "macro": [("id_bi_rate", "macro", +1, "policy rate -> NIM (asset-sensitive)"),
                  ("id_lending_rate", "macro", +1, "loan yields"),
                  ("id_bank_credit", "demand", +1, "system loan growth"),
                  ("id_m2", "demand", +1, "liquidity/deposits"),
                  ("id_gdp_real_q", "demand", +1, "credit demand & asset quality"),
                  ("usdidr", "macro", -1, "IDR weakness = risk-off for banks")],
    },
    "Insurance": {
        "ceic": [("Banks", "Insurance Premiums")],
        "globals": [],
        "macro": [("id_bi_rate", "macro", +1, "investment yield on float"),
                  ("us_10y", "macro", +1, "long-bond reinvestment yield"),
                  ("id_gdp_real_q", "demand", +1, "premium growth"),
                  ("jci", "demand", +1, "equity book/UL fee income")],
    },
    "Multifinance": {
        "ceic": [("Banks", "Multifinance"), ("Banks", "Loan Demand")],
        "globals": [],
        "macro": [("id_10y", "macro", -1, "funding cost (bond-funded book)"),
                  ("id_bi_rate", "macro", -1, "policy funding cost"),
                  ("id_bank_credit", "demand", +1, "consumer financing"),
                  ("id_gdp_real_q", "demand", +1, "auto/durables demand"),
                  ("usdidr", "macro", -1, "risk-off / FX funding")],
    },
    "Securities": {
        "ceic": [("Banks", None)],
        "globals": [],
        "macro": [("jci", "demand", +1, "brokerage = market beta"),
                  ("id_bi_rate", "macro", -1, "lower rates lift turnover")],
    },
    "Investment": {
        "ceic": [("Banks", None)],
        "globals": [("bcom", "demand", +1, "diversified asset beta")],
        "macro": [("jci", "demand", +1, "NAV beta"),
                  ("id_gdp_real_q", "demand", +1, "portfolio earnings")],
    },
    # ---------------- PROPERTIES & REAL ESTATE ----------------
    "Property": {
        "ceic": [],
        "globals": [("steel_hrc", "cost", -1, "rebar/construction cost"),
                    ("wb_coal_au", "cost", -1, "cement/energy cost")],
        "macro": [("id_bi_rate", "macro", -1, "mortgage affordability rate-elastic"),
                  ("id_lending_rate", "macro", -1, "KPR mortgage rate"),
                  ("id_bank_credit", "demand", +1, "mortgage/credit availability"),
                  ("id_gdp_real_q", "demand", +1, "marketing sales cycle"),
                  ("usdidr", "macro", -1, "FX debt + import sentiment")],
    },
    # ---------------- INFRASTRUCTURE ----------------
    "Telco": {
        "ceic": [("Telecom", None), ("Technology", "Telecom Subscribers & Internet")],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "data ARPU/consumption"),
                  ("usdidr", "macro", -1, "USD capex/equipment"),
                  ("id_bi_rate", "macro", -1, "quasi-utility bond proxy")],
    },
    "Tower": {
        "ceic": [("Telecom", None)],
        "globals": [],
        "macro": [("id_bi_rate", "macro", -1, "rate-sensitive REIT-like cashflows"),
                  ("us_10y", "macro", -1, "long-duration lease cashflows")],
    },
    "Construction": {
        "ceic": [("Industrials & Manufacturing", None)],
        "globals": [("steel_hrc", "cost", -1, "rebar input"),
                    ("wb_coal_au", "cost", -1, "cement/energy input")],
        "macro": [("id_10y", "macro", -1, "10Y yield: financing cost (leveraged SOEs)"),
                  ("id_bi_rate", "macro", -1, "policy rate"),
                  ("id_gdp_real_q", "demand", +1, "APBN infra spend proxy"),
                  ("usdidr", "macro", -1, "FX risk for leveraged balance sheets")],
    },
    "Toll Road": {
        "ceic": [("Transport & Logistics", None)],
        "globals": [],
        "macro": [("id_bi_rate", "macro", -1, "leveraged annuity cashflows"),
                  ("id_gdp_real_q", "demand", +1, "traffic volume")],
    },
    "Ports": {
        "ceic": [("Transport & Logistics", "Sea Cargo")],
        "globals": [("bcom", "demand", +1, "trade/commodity throughput")],
        "macro": [("id_exports", "demand", +1, "export throughput"),
                  ("id_imports", "demand", +1, "import throughput")],
    },
    "Utilities": {
        "ceic": [("Energy", "Electricity")],
        "globals": [("wb_coal_au", "cost", -1, "fuel cost (regulated tariff lag)"),
                    ("natgas", "cost", -1, "gas fuel cost")],
        "macro": [("id_gdp_real_q", "demand", +1, "electricity consumption")],
    },
    # ---------------- CONSUMER CYCLICALS ----------------
    "Retail": {
        "ceic": [("Consumer Discretionary", "Auto Sales"),
                 ("Consumer Discretionary", None)],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "discretionary spend"),
                  ("id_cpi_yoy", "demand", -1, "real income squeeze"),
                  ("id_bank_credit", "demand", +1, "consumer credit"),
                  ("usdidr", "macro", -1, "imported merchandise cost")],
    },
    "Auto": {
        "ceic": [("Consumer Discretionary", "Auto Sales"),
                 ("Consumer Discretionary", "Auto Production")],
        "globals": [("steel_hrc", "cost", -1, "steel input"),
                    ("aluminum", "cost", -1, "aluminium input")],
        "macro": [("id_bi_rate", "macro", -1, "auto financing rate-elastic"),
                  ("id_gdp_real_q", "demand", +1, "vehicle demand"),
                  ("usdidr", "macro", -1, "CKD import cost")],
    },
    "Media": {
        "ceic": [("Consumer Discretionary", None), ("Technology", None)],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "ad spend pro-cyclical"),
                  ("jci", "demand", +1, "risk appetite")],
    },
    "Leisure": {
        "ceic": [("Tourism", None)],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "discretionary leisure"),
                  ("usdidr", "macro", +1, "inbound tourism competitiveness")],
    },
    "Restaurants": {
        "ceic": [("Tourism", None), ("Consumer Staples", None)],
        "globals": [("wb_palm_oil", "cost", -1, "cooking oil"),
                    ("wheat", "cost", -1, "flour input")],
        "macro": [("id_bi_rate", "macro", -1, "discretionary dining is rate/credit-elastic"),
                  ("id_10y", "macro", -1, "consumer discretionary rate sensitivity"),
                  ("id_cpi_yoy", "demand", -1, "food inflation squeezes dining-out"),
                  ("id_gdp_real_q", "demand", +1, "dining spend")],
    },
    "Apparel": {
        "ceic": [("Consumer Discretionary", "Textile & Apparel")],
        "globals": [("brent", "cost", -1, "polyester/synthetic feedstock (ID textile is synthetic-heavy)"),
                    ("cotton", "cost", -1, "cotton input"),
                    ("wb_rubber", "cost", -1, "footwear/elastomer input")],
        "macro": [("usdidr", "macro", +1, "garment export competitiveness"),
                  ("id_gdp_real_q", "demand", +1, "domestic apparel demand"),
                  ("id_cpi_yoy", "demand", -1, "discretionary squeeze")],
    },
    "Durables": {
        "ceic": [("Consumer Discretionary", None)],
        "globals": [("steel_hrc", "cost", -1, "metal input"),
                    ("aluminum", "cost", -1, "metal input")],
        "macro": [("id_10y", "macro", -1, "durables financing rate-elastic"),
                  ("id_bi_rate", "macro", -1, "policy rate"),
                  ("id_gdp_real_q", "demand", +1, "household durables"),
                  ("usdidr", "macro", -1, "imported durable goods")],
    },
    # ---------------- HEALTHCARE ----------------
    "Hospitals": {
        "ceic": [("Healthcare", "Hospitals")],
        "globals": [],
        "macro": [("id_10y", "macro", -1, "defensive-growth (MIKA/SILO) re-rates on yields"),
                  ("id_gdp_real_q", "demand", +1, "healthcare utilisation"),
                  ("usdidr", "macro", -1, "imported equipment/drugs")],
    },
    "Pharma": {
        "ceic": [("Healthcare", "Pharmaceuticals")],
        "globals": [],
        "macro": [("usdidr", "macro", -1, "imported APIs (~90% of inputs)"),
                  ("id_gdp_real_q", "demand", +1, "drug demand"),
                  ("id_cpi_yoy", "cost", -1, "input cost inflation")],
    },
    "Healthcare Equipment": {
        "ceic": [("Healthcare", None)],
        "globals": [],
        "macro": [("usdidr", "macro", -1, "imported devices"),
                  ("id_gdp_real_q", "demand", +1, "healthcare capex")],
    },
    "Healthcare Services": {
        "ceic": [("Healthcare", None)],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "service utilisation")],
    },
    # ---------------- TECHNOLOGY ----------------
    "IT Services": {
        "ceic": [("Technology", None)],
        "globals": [],
        "macro": [("id_10y", "macro", -1, "data-center/IT-infra duration (DCII) rate-sensitivity"),
                  ("us_10y", "macro", -1, "global duration/discount-rate sensitivity"),
                  ("ndx", "demand", +1, "global tech beta"),
                  ("id_gdp_real_q", "demand", +1, "digital spend")],
    },
    "Internet": {
        "ceic": [("Technology", "E-Commerce Transactions"),
                 ("Telecom", "E-Money & Card Payments")],
        "globals": [],
        "macro": [("us_10y", "macro", -1, "growth-stock duration"),
                  ("ndx", "demand", +1, "global tech sentiment"),
                  ("id_gdp_real_q", "demand", +1, "GMV growth")],
    },
    "Software": {
        "ceic": [("Technology", None)],
        "globals": [],
        "macro": [("ndx", "demand", +1, "tech beta"),
                  ("us_10y", "macro", -1, "duration")],
    },
    "Electronics": {
        "ceic": [("Industrials & Manufacturing", "Electrical Equipment"),
                 ("Technology", None)],
        "globals": [("copper", "cost", -1, "component metal input")],
        "macro": [("usdidr", "macro", -1, "imported components"),
                  ("cn_ip_yoy", "demand", +1, "electronics supply chain")],
    },
    # ---------------- INDUSTRIALS ----------------
    "Machinery": {  # UNTR-dominated: Komatsu dealer + Pamapersada coal mining
        "ceic": [("Industrials & Manufacturing", None), ("Energy", "Coal")],
        "ceic_override": [("coal production", "demand", +1),
                          ("pamapersada", "demand", +1),
                          ("united tractors", "demand", +1),
                          ("mining & quarrying: coal", "demand", +1)],
        "globals": [("bcom", "demand", +1, "commodity cycle -> mining capex -> equipment"),
                    ("wb_coal_au", "demand", +1, "mining-equipment demand (UNTR)"),
                    ("steel_hrc", "cost", -1, "steel input")],
        "macro": [("cn_ip_yoy", "demand", +1, "capex cycle"),
                  ("id_gdp_real_q", "demand", +1, "domestic capex")],
    },
    "Electrical Equipment": {  # IDX basket = cable makers (KBLI/SCCO/JECC/VOKS)
        "ceic": [("Industrials & Manufacturing", "Electrical Equipment")],
        "globals": [("copper", "cost", -1, "copper = primary cable input"),
                    ("aluminum", "cost", -1, "aluminium conductor input")],
        "macro": [("id_bi_rate", "macro", -1, "cable demand = construction/infra, rate-elastic"),
                  ("id_10y", "macro", -1, "infrastructure-capex rate sensitivity"),
                  ("id_gdp_real_q", "demand", +1, "electrification capex")],
    },
    "Conglomerate": {
        "ceic": [("Industrials & Manufacturing", None)],
        "globals": [("wb_coal_au", "demand", +1, "diversified commodity exposure"),
                    ("bcom", "demand", +1, "commodity beta")],
        "macro": [("id_gdp_real_q", "demand", +1, "broad economy"),
                  ("jci", "demand", +1, "market beta")],
    },
    "Services": {
        "ceic": [("Industrials & Manufacturing", None)],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "B2B services demand")],
    },
    # ---------------- TRANSPORTATION & LOGISTICS ----------------
    "Shipping": {
        "ceic": [("Transport & Logistics", "Sea Cargo")],
        "globals": [("brent", "cost", -1, "bunker fuel cost"),
                    ("wb_coal_au", "demand", +1, "bulk coal cargo volume")],
        "macro": [("id_exports", "demand", +1, "export shipping volume"),
                  ("cn_ip_yoy", "demand", +1, "regional trade")],
    },
    "Airlines": {
        "ceic": [("Tourism", "Air Passenger Traffic")],
        "globals": [("brent", "cost", -1, "jet fuel ~35% of cost"),
                    ("wti", "cost", -1, "fuel cost")],
        "macro": [("usdidr", "macro", -1, "USD leases/fuel"),
                  ("id_gdp_real_q", "demand", +1, "air travel demand")],
    },
    "Logistics": {
        "ceic": [("Transport & Logistics", None)],
        "globals": [("brent", "cost", -1, "diesel/fuel cost")],
        "macro": [("id_gdp_real_q", "demand", +1, "freight volume"),
                  ("id_exports", "demand", +1, "trade flows")],
    },
}
