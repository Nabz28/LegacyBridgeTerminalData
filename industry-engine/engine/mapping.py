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
    # API2 (ICEEUR:ATR1!) is a real, populated thermal-coal benchmark; the
    # Newcastle future (ATW1!) is empty in the store. API2 tracks global thermal
    # coal closely and is the honest proxy for IDX coal names.
    "wb_coal_au": "ICEEUR:ATR1!", "brent": "ICEEUR:BRN1!", "wti": "NYMEX:CL1!",
    # wb_lng_jp: SGX:JKM1! (Asian LNG) is EMPTY in the store -> proxy with Henry
    # Hub natgas (the gas-switch cost channel is what we actually want to price).
    "natgas": "NYMEX:NG1!", "wb_lng_jp": "NYMEX:NG1!", "heating_oil": "NYMEX:HO1!",
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
    # wb_coffee_robusta: ICE:RC1! (Robusta) is EMPTY -> proxy with KC1! (Arabica).
    "coffee": "ICE:KC1!", "wb_coffee_robusta": "ICE:KC1!", "cocoa": "ICE:CC1!",
    "cotton": "ICE:CT1!", "wb_cotton": "ICE:CT1!", "wb_rubber": "SGX:TF1!",
    "wb_logs": "CME:LBR1!", "wb_urea": None, "wb_potash": None,
    # indices / broad
    "bcom": "AMEX:DBC", "sp_gsci": "AMEX:GSG", "ndx": "NASDAQ:NDX",
    "spx": "SP:SPX", "vix": "CBOE:VIX", "jci": "IDX:COMPOSITE",
    "us_housing": "AMEX:XHB",          # US homebuilders ETF — furniture-export demand lead
    # FX
    # dxy: TVC:BBDXY was EMPTY (wk_obs 0) -> DXY was silently unwired everywhere.
    "usdidr": "FX_IDC:USDIDR", "dxy": "TVC:DXY", "usdcny": "FX_IDC:USDCNY",
    # rates / yields
    "us_10y": "TVC:US10Y", "ust_10y_y": "TVC:US10Y", "us_2y": None,
    "us_real10y": "DFII10",            # US real 10Y (TIPS) — bond-proxy/duration core
    "us_2s10s": "US10Y-US02Y",         # curve slope / term-premium repricing
    "id_10y": "TVC:ID10Y", "id_01y": "TVC:ID01Y", "id_30y": "TVC:ID30Y",
    # Indonesia macro
    # id_lending_rate moved to ID_MACRO_OBS (lives in macro.observations, not corr).
    "id_bi_rate": "ECONOMICS:IDINTR",
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

# Indonesia macro series that live ONLY in macro.observations under country=id
# (CEIC... RICs) — the *leading* rate / mortgage / loan-demand plane that NO
# GLOBAL_CORR (correlation.sqlite) path reaches. Resolved in drivers._global_history
# via C.get_observations, and PUBLICATION-LAGGED exactly like the idind CEIC loop
# (these are monthly reference-period prints, not real-time market prices) so they
# cannot leak future information into the blindfolded OOS backtest.
# All RICs verified populated in macro.observations before wiring.
ID_MACRO_OBS = {
    "id_lending_rate": "CEIC224795501",   # IDR lending rate (n=480, P1M) — cost of debt
    "id_kpr_rate":     "CEIC14419701",    # KPR/mortgage rate (n=304, P1M) — property demand
    "id_wc_loan_rate": "CEIC230931402",   # working-capital loan rate (n=279, P1M)
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
    "Oil & Gas": {  # basket led by PGAS (regulated gas utility) + MEDC (upstream)
        "ceic": [("Energy", "Crude Oil")],
        "globals": [
            ("brent", "supply", +1, "Brent = upstream revenue (MEDC sleeve)"),
            ("wti", "supply", +1, "crude price"),
            # natgas sign ambiguous: revenue for upstream gas, but a COST for
            # PGAS's regulated transmission margin (the largest constituent).
            ("natgas", "supply", 0, "gas: upstream revenue vs PGAS cost (ambiguous)"),
        ],
        "macro": [("usdidr", "macro", +1, "USD-priced output / USD transmission margin"),
                  ("id_10y", "macro", -1, "PGAS bond-proxy duration"),
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
    "Mining": {  # AMMN/MDKA/BRMS = copper-GOLD led (nickel is a minor sleeve)
        # NOTE (audit): the plan's metal-split tree (add us_real10y -1 for the gold
        # sleeve + China credit-impulse lead + CEIC nickel proxy + AISC cost legs)
        # was TESTED and made forward IC WORSE (-0.148 -> -0.23, placebo 0.05->0.00).
        # These are large-cap, sentiment-led names that mean-revert (plan §8: none).
        # Reverted to baseline — the backtest rejects manufacturing forward skill here.
        "ceic": [("Basic Materials", "Copper"),
                 ("Basic Materials", "Gold & Precious Metals"),
                 ("Metals & Mining", None), ("Basic Materials", "Nickel")],
        "globals": [("copper", "supply", +1, "copper = primary revenue metal (AMMN/MDKA)"),
                    ("gold", "supply", +1, "gold miners (MDKA/AMMN by-product)"),
                    ("wb_nickel", "supply", +1, "minor nickel sleeve (no clean price)")],
        "macro": [("cn_ip_yoy", "demand", +1, "China metals demand"),
                  ("usdidr", "macro", +1, "USD metal revenue"),
                  ("dxy", "macro", -1, "USD strength caps metals")],
    },
    "Metals & Mining": {  # INCO/MBMA/ANTM = nickel/ferronickel (NOT iron ore)
        # DATA GAP: no clean LME nickel series in the store (wb_nickel->None);
        # the basket leans on CEIC nickel export/production series + China demand.
        # iron_ore DROPPED — none of these names produce iron ore (wrong prior).
        "ceic": [("Metals & Mining", None), ("Basic Materials", "Nickel")],
        "ceic_override": [("nickel", "demand", +1)],   # CEIC nickel value/volume = price proxy
        "globals": [("wb_nickel", "supply", +1, "nickel revenue (no clean price series)"),
                    ("aluminum", "supply", +1, "aluminium exposure")],
        "macro": [("cn_pmi_mfg", "demand", +1, "China stainless/nickel demand"),
                  ("cn_ip_yoy", "demand", +1, "China metals demand"),
                  ("usdidr", "macro", +1, "USD metal revenue")],
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
    "Cement": {  # SMGR/INTP/SMBR domestic price-takers; +0.067 baseline from the coal-cost lead
        # The +0.067 comes from the wb_coal_au cost lead (coal ~30% of cash cost) —
        # PROTECT it. Old ("Industrials & Manufacturing",None) = 220 irrelevant series
        # + SMGR/INTP own-output endogenous leak. Cement-consumption demand prints are
        # coincident. Keep the anchored set the proven coal lead + the leading rate
        # chain (KPR->property->cement); drop the mfg swarm and the own-output leak.
        "ceic": [],
        "globals": [("wb_coal_au", "cost", -1, "coal ~30% of kiln cash cost — the proven margin lead"),
                    ("brent", "cost", -1, "diesel distribution + packaging cost")],
        "macro": [("id_kpr_rate", "demand", -1, "KPR mortgage rate leads housing starts -> cement 6-9m"),
                  ("id_bi_rate", "macro", -1, "root of the rate->property->cement chain"),
                  ("id_10y", "macro", -1, "mortgage repricing base + developer financing"),
                  ("usdidr", "macro", -1, "imported coal-parity + USD equipment cost"),
                  ("dxy", "macro", -1, "EM-flow headwind on low-beta domestic cyclicals")],
    },
    "Paper": {
        # NOTE (audit): DATA_BUGS §2 claimed bcom-as-pulp is a backwards sign (DBC is
        # energy-heavy, oil rallies = mill cost). Dropping bcom + adding brent cost -1
        # was TESTED and made forward IC WORSE (-0.003 -> -0.09, placebo 0.45 -> 0.20):
        # the backtest does NOT support the stated bug here. Reverted to baseline.
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
        # drop ENDOGENOUS series: single-bank balance sheets AND system-wide
        # outcome RATIOS (CAR/BOPO/NIM/LDR) that co-move mechanically with bank
        # equity rather than forecast it (critique: bank ratios are outcomes).
        # NOTE (audit): adding the theory-correct leading flow/duration drivers
        # (dxy/us_10y -1) and excluding the 30 wrong-block Insurance-Premiums series
        # was TESTED and did NOT improve forward IC (-0.151 -> -0.14, placebo 0.05):
        # Banks is structurally a contemporaneous-beta basket that MEAN-REVERTS, so
        # no driver wiring forecasts it forward (plan §8: attribution, not forecast).
        # Kept at baseline. (Insurance-premium pollution noted as an attribution-model
        # cleanup, not a forward-skill fix.)
        "ceic_exclude": ["pt bank", "syariah indonesia", "capital adequacy",
                         "operational cost ratio", "bopo", "net interest margin",
                         "nim:", "loan-to-deposit", "loan to deposit"],
        "globals": [],
        # BI/lending rate priors set to 0 (ambiguous): IDX banks are liability-
        # sensitive short-run and the market trades rate-CUTS as bullish, so the
        # +1 "asset-sensitive NIM" prior was not defensible — let the data decide.
        "macro": [("id_bi_rate", "macro", 0, "policy rate (sign ambiguous: NIM vs re-rating)"),
                  ("id_lending_rate", "macro", 0, "loan yields (sign ambiguous)"),
                  ("id_bank_credit", "demand", +1, "system loan growth"),
                  ("id_m2", "demand", +1, "liquidity/deposits"),
                  ("id_gdp_real_q", "demand", +1, "credit demand & asset quality"),
                  ("usdidr", "macro", -1, "IDR weakness ~ foreign-outflow risk-off (flow proxy)")],
    },
    "Insurance": {
        "ceic": [("Banks", "Insurance Premiums")],
        "globals": [],
        # jci dropped as a driver everywhere — it's circular market beta (the
        # basket is part of the index), not a fundamental driver.
        "macro": [("id_bi_rate", "macro", +1, "investment yield on float"),
                  ("us_10y", "macro", +1, "long-bond reinvestment yield"),
                  ("id_gdp_real_q", "demand", +1, "premium growth")],
    },
    "Multifinance": {  # BFIN/ADMF/CFIN — bond-funded auto/durables finance books
        # The old ("Banks","Multifinance") block = 30 own-book financing-receivables
        # LEVELS (endogenous, coincident, demand +1) that drowned the leading funding-
        # rate drivers. Drop it; a bond-funded book re-rates on the rate curve (leading)
        # and on consumer-financing intent. Lean + leading.
        "ceic": [],
        "globals": [("us_10y", "macro", -1, "global risk-free -> ID funding-cost upstream"),
                    ("dxy", "macro", -1, "EM funding stress: strong USD widens bond spreads")],
        "macro": [("id_10y", "macro", -1, "ID10Y bond-funding cost; bond-funded books reprice fast"),
                  ("id_bi_rate", "macro", -1, "policy rate: cuts = margin relief + duration re-rate"),
                  ("id_consumer_confidence", "demand", +1, "consumer confidence leads vehicle-financing demand"),
                  ("id_bank_credit", "demand", +1, "system consumer-credit availability"),
                  ("id_gdp_real_q", "demand", +1, "borrower income / durables demand"),
                  ("usdidr", "macro", -1, "IDR weakness -> wider credit spreads -> harder funding")],
    },
    "Securities": {
        "ceic": [("Banks", None)],
        "globals": [],
        "macro": [("id_bi_rate", "macro", -1, "lower rates lift turnover"),
                  ("id_gdp_real_q", "demand", +1, "activity -> trading volume"),
                  ("id_bank_credit", "demand", +1, "liquidity -> turnover")],
    },
    "Investment": {  # NAV-discount holdcos: SRTG (ADRO/Alamtri coal + MPMX + TBIG), BNBR, etc.
        # Scope-error fix: the old ("Banks",None) pull = 147 banking prints with zero
        # link to a coal/diversified NAV portfolio (drove model_conflict + let circular
        # jci win the candidate vacuum). Drop it; wire the holdings' real driver — the
        # coal NAV beta (SRTG's biggest slug is ADRO) + its China-demand parents + the
        # SOTP discount rate. NB: ~half the -0.13 is structural NAV-discount mean-
        # reversion (the discount fades the NAV move), so target is ~0/weakly positive.
        "ceic": [],
        "globals": [("wb_coal_au", "demand", +1, "API2 coal = primary NAV beta (SRTG/ADRO, BNBR/BUMI); leads 1-3m"),
                    ("cn_ip_yoy", "demand", +1, "China IP leads thermal-coal demand 2-4m -> re-marks coal NAV"),
                    ("cn_pmi_mfg", "demand", +1, "China mfg PMI — more timely coal-demand pulse")],
        "macro": [("id_10y", "macro", -1, "SOTP discount rate + TBIG tower duration"),
                  ("id_bi_rate", "macro", -1, "policy parent; cuts bullish for geared holdcos"),
                  ("us_10y", "macro", -1, "global EM-duration / risk-free on the SOTP"),
                  ("usdidr", "macro", 0, "two-sided: +coal USD revenue vs -risk-off discount widening"),
                  ("id_gdp_real_q", "demand", +1, "portfolio earnings / domestic cycle backdrop")],
    },
    # ---------------- PROPERTIES & REAL ESTATE ----------------
    "Property": {  # developers (BSDE/CTRA/SMRA/PANI) + REIT-proxies (PWON/MKPI)
        # FORECAST thesis: the rate -> KPR -> affordability -> pre-sales -> price
        # chain. Property EQUITIES lead physical prices, so the 123-series CEIC
        # Property & Real Estate block (RPPI / mortgage growth / NPL) is LAGGING/
        # coincident for forward equity returns — wiring it as a demand swarm would
        # dilute the leading rate signal (the Tower lesson). Keep the anchored set
        # LEADING-dominated; the rich CEIC block stays out of the forward signal.
        "ceic": [],
        "globals": [("steel_hrc", "cost", -1, "rebar/construction cost"),
                    ("wb_coal_au", "cost", -1, "cement/energy cost")],
        "macro": [("id_10y", "macro", -1, "ID 10Y: KPR repricing base + REIT duration; liquid lead"),
                  ("id_bi_rate", "macro", -1, "BI 7DRR: property-cycle catalyst, leads pre-sales 3-6m"),
                  ("id_kpr_rate", "cost", -1, "actual KPR mortgage rate (CEIC14419701); affordability lead"),
                  ("us_10y", "macro", -1, "global discount rate / EM-flow"),
                  ("id_bank_credit", "demand", +1, "mortgage/credit availability"),
                  ("id_consumer_confidence", "demand", +1, "big-ticket purchase intent — leads"),
                  ("id_gdp_real_q", "demand", +1, "income backdrop (coincident, low weight)"),
                  ("usdidr", "macro", -1, "FX debt + foreign-flow / risk-off proxy")],
    },
    # ---------------- INFRASTRUCTURE ----------------
    "Telco": {
        "ceic": [("Telecom", None), ("Technology", "Telecom Subscribers & Internet")],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "data ARPU/consumption"),
                  ("usdidr", "macro", -1, "USD capex/equipment"),
                  ("id_bi_rate", "macro", -1, "quasi-utility bond proxy")],
    },
    "Tower": {  # CENT (94%) + LCKM — purest bond proxy: levered contracted annuity
        # B1 fix: the CEIC "Telecom" block in this store is NOT towers — it is 53
        # card/e-money PAYMENT series (all demand-tagged -> default +1), which
        # outvoted the 2 rate drivers ~13:1 and inverted the posture (-0.195).
        # Drop the payment block; keep ONLY the 2 BTS (Network Infrastructure)
        # series as low-weight tenancy-demand attribution.
        "ceic": [("Telecom", "Network Infrastructure")],
        "ceic_override": [("bts", "demand", +1)],  # BTS counts = tenancy proxy
        "ceic_exclude": ["card", "e-money", "atm", "debit", "rtgs"],  # belt-and-braces
        # the rate-duration tree — liquid, leading, all sign -1 (the bond-proxy core)
        "globals": [
            ("us_real10y", "macro", -1, "US real 10Y — purest discount rate for a levered annuity"),
            ("id_10y", "macro", -1, "IDR 10Y — domestic discount rate on contracted leases"),
            ("id_30y", "macro", -1, "IDR 30Y — duration match to 8-10yr lease book"),
            ("us_10y", "macro", -1, "global risk-free / EM-duration beta"),
            ("us_2s10s", "macro", -1, "bear-steepening = term-premium repricing = duration drawdown"),
            ("dxy", "macro", -1, "strong USD drains EM-duration flows"),
        ],
        "macro": [
            ("id_bi_rate", "macro", -1, "policy rate: cuts re-rate the annuity"),
            ("id_lending_rate", "cost", -1, "real IDR cost-of-debt / refinancing"),
            ("usdidr", "macro", -1, "USD-debt service + EM risk-off; revenue is IDR (no offset)"),
            ("id_cpi_yoy", "macro", 0, "escalator raises BOTH revenue and O&M -> net-neutral"),
            ("id_gdp_real_q", "macro", 0, "OVERRIDE STD_MACRO +1->0: towers are counter-cyclical duration"),
        ],
    },
    "Construction": {  # leveraged SOE "Karya" constructors (WIKA/PTPP/ADHI/WSKT) + private
        # Block-error fix: the old ("Industrials & Manufacturing",None) pull = 220
        # endogenous mfg-output series (wrong block). APBN capex has no liquid lead;
        # the forecastable spine for geared SOEs is FINANCING cost + steel/cement
        # input cost. Keep the anchored set leading-dominated, not a coincident
        # construction-demand swarm (the Tower/Property lesson).
        "ceic": [],
        "globals": [("steel_hrc", "cost", -1, "rebar/structural steel — primary bought-in material"),
                    ("wb_coal_au", "cost", -1, "API2 coal ~30% of cement cash cost"),
                    ("brent", "cost", -1, "site diesel / aggregate haulage")],
        "macro": [("id_10y", "macro", -1, "refinancing/discount rate on the geared Karya book (leading)"),
                  ("id_01y", "macro", -1, "short-end working-capital refi cost"),
                  ("id_lending_rate", "cost", -1, "actual IDR borrowing cost (CEIC224795501)"),
                  ("id_bi_rate", "macro", -1, "policy anchor"),
                  ("usdidr", "macro", -1, "USD-debt revaluation + EM risk-off"),
                  ("dxy", "macro", -1, "broad USD -> EM outflow -> ID rates up -> constructors down"),
                  ("id_gdp_real_q", "demand", +1, "demand backdrop (coincident, low weight)")],
    },
    "Toll Road": {
        # NOTE (audit): the plan's lean rate-duration rewire (drop the transport block,
        # deepen the duration tree like Tower) was TESTED and REGRESSED forward IC
        # (+0.10 -> 0.00, placebo 0.87 -> 0.50) — the baseline's marginal rank-IC skill
        # was lost. Reverted. The +0.10 likely rests on id_bi_rate; META is a thin
        # single-name (JSMR mislabelled out — a membership-track issue, not wiring).
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
    "Utilities": {  # MPOW (diesel IPP) + TGRA (hydro) — NOT POWR (Alt Energy). n=53 (short)
        # Fuel mis-spec was the -0.218 sign-trap: wb_coal_au + natgas (-1) describe
        # fuels NEITHER member burns (MPOW = diesel/Brent, TGRA = zero-fuel hydro) —
        # locked-sign noise on a 2-name basket. Fix: Brent (MPOW's real fuel) + the
        # rate-duration tree (contracted-PPA annuities are bond-proxy-like). ceic=[]
        # (the 43-series tariff/consumption block is coincident/regulated, not leading).
        # n=53 -> low confidence; honest target is de-biasing the spurious negative.
        "ceic": [],
        "globals": [("brent", "cost", -1, "MPOW diesel/HSD fuel proxy; TGRA zero-fuel hydro")],
        "macro": [("id_10y", "macro", -1, "IDR discount rate on PPA annuity + capex financing"),
                  ("id_bi_rate", "macro", -1, "policy rate / tariff-subsidy regime"),
                  ("us_10y", "macro", -1, "global risk-free / EM duration backdrop"),
                  ("usdidr", "macro", +1, "USD-linked IPP PPA: weak IDR lifts IDR revenue"),
                  ("id_gdp_real_q", "demand", +1, "electricity load-growth backdrop (coincident)")],
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
    "Auto": {  # 7 micro-cap parts/tyre names (TYRE/PART/LPIN...) — ASII sits in Conglomerate
        # The Auto Sales + Auto Production CEIC blocks (73 coincident industry-volume
        # series, demand +1) mis-specify these PARTS names — a coincident swarm. Drop
        # it; parts makers are cost-driven (steel/aluminium) + auto-financing-rate
        # sensitive + USD CKD-import cost. Membership (ASII absent) caps the ceiling.
        "ceic": [],
        "globals": [("steel_hrc", "cost", -1, "steel input for parts/components"),
                    ("aluminum", "cost", -1, "aluminium component input")],
        "macro": [("id_10y", "macro", -1, "auto financing + discount rate (rate-elastic)"),
                  ("id_bi_rate", "macro", -1, "consumer auto-financing cost"),
                  ("usdidr", "macro", -1, "CKD/component import cost"),
                  ("id_gdp_real_q", "demand", +1, "vehicle demand backdrop (coincident)")],
    },
    "Media": {  # MSIN/FILM (content/IP) + SCMA/MNCN (FTA ad-broadcasters)
        # There is NO native ad-spend CEIC block — the old ceic pull = 182 auto/
        # telecom/e-commerce series (verified), pure noise that overfit (kept=10) and
        # made the posture anti-contemporaneous (-0.11). Drop it. Ad spend is pro-
        # cyclical (GDP/retail/confidence +1); content/IP names are duration/tech-beta
        # (ndx +1, real-yield -1); USD content cost (-1). HARD case: no ad-spend series
        # exists + members span +2.0 to -0.6 beta -> honest target is ~0 attribution.
        "ceic": [],
        "globals": [("ndx", "demand", +1, "global streaming/tech sentiment (MSIN/FILM content re-rate)"),
                    ("us_real10y", "macro", -1, "real WACC on the streaming/IP duration sleeve"),
                    ("usdidr", "macro", -1, "weak IDR raises USD-licensed content/rights cost"),
                    ("dxy", "macro", -1, "broad USD -> EM equity outflow on a high-beta bag")],
        "macro": [("id_gdp_real_q", "demand", +1, "ad-spend backbone (~1.3-1.5x GDP elasticity)"),
                  ("id_retail", "demand", +1, "real retail sales = FMCG advertiser-volume proxy"),
                  ("id_consumer_confidence", "demand", +1, "consumer sentiment -> advertiser willingness"),
                  ("id_10y", "macro", -1, "daily discount/financing proxy; leads the ad/earnings chain"),
                  ("id_bi_rate", "macro", -1, "discretionary WACC"),
                  ("id_cpi_yoy", "macro", -1, "inflation squeezes real ad-budgets + raises production cost")],
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
    "Durables": {  # furniture/houseware/bicycle — NOT autos
        # Block-error fix: ceic=[("Consumer Discretionary",None)] resolved to 101
        # AUTO/motorcycle/textile series (ZERO furniture) — a wrong-block demand +1
        # swarm (Tower-class). The real durables tree is lumber/metal COGS + a
        # US-housing export-demand lead + financing. Drop the swarm; wire leaders.
        "ceic": [],
        "globals": [("wb_logs", "cost", -1, "lumber/timber = primary furniture COGS (CME:LBR1!)"),
                    ("steel_hrc", "cost", -1, "metal-frame furniture / bicycle / enamelware input"),
                    ("aluminum", "cost", -1, "aluminium houseware input"),
                    ("us_housing", "demand", +1, "US homebuilders (XHB) lead WOOD furniture-export orders ~1-2q")],
        "macro": [("usdidr", "macro", 0, "NET FX: domestic importer leg vs WOOD exporter leg ~cancel"),
                  ("id_10y", "macro", -1, "big-ticket durables credit-elastic + discount rate"),
                  ("id_bi_rate", "macro", -1, "consumer-financing cost"),
                  ("id_bank_credit", "demand", +1, "consumption-credit availability"),
                  ("id_gdp_real_q", "demand", +1, "domestic durables demand backdrop"),
                  ("id_cpi_yoy", "demand", -1, "inflation defers big-ticket purchases")],
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
        "macro": [("id_bi_rate", "macro", -1, "quality defensives (KLBF/SIDO) = bond-proxy, re-rate on rates"),
                  ("id_10y", "macro", -1, "defensive duration"),
                  ("usdidr", "macro", -1, "imported APIs (~90% of inputs)"),
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
    "Internet": {  # GOTO/BUKA/BELI etc. — unprofitable-growth duration + GMV
        # The E-Commerce + E-Money CEIC blocks (47 coincident payment/GMV-volume series,
        # demand +1) are a swarm. Growth/internet equities are driven by global DURATION
        # (real yields) + NDX risk sentiment; GMV is coincident. Lean, leading-dominated.
        "ceic": [],
        "globals": [("ndx", "demand", +1, "global tech/growth risk sentiment"),
                    ("us_real10y", "macro", -1, "US real yield = growth-stock duration (the core driver)"),
                    ("us_10y", "macro", -1, "nominal global discount rate")],
        "macro": [("id_gdp_real_q", "demand", +1, "GMV / digital-consumption growth"),
                  ("usdidr", "macro", -1, "USD funding / EM risk-off for unprofitable growth"),
                  ("id_10y", "macro", -1, "domestic duration")],
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
    "Conglomerate": {  # single name = ASII (Astra): autos + UNTR/coal + AALI/CPO + financing
        "ceic": [("Consumer Discretionary", "Auto Sales"), ("Energy", "Coal")],
        "ceic_override": [("coal production", "demand", +1),
                          ("mining & quarrying: coal", "demand", +1)],
        # jci dropped — ASII is ~5% of IHSG so market beta is circular, not a driver.
        "globals": [("bcom", "demand", +1, "UNTR coal/equipment + commodity beta"),
                    ("wb_palm_oil", "demand", +1, "AALI palm-oil exposure"),
                    ("steel_hrc", "cost", -1, "auto steel input")],
        "macro": [("id_10y", "macro", -1, "auto financing + holding rate-sensitivity"),
                  ("usdidr", "macro", -1, "CKD auto-part imports"),
                  ("id_gdp_real_q", "demand", +1, "broad domestic economy")],
    },
    "Services": {  # residual taxonomy bucket: MFMI (records mgmt) + SOSS (security manpower)
        # Block-error fix: the old ("Industrials & Manufacturing",None) pull = 220
        # machinery/metals CAPEX series for a labour-services basket — wrong block,
        # 2 kept drivers had theory_agree=False. Drop it. This is honestly a
        # heterogeneous grab-bag with NO coherent macro factor; the target is moving
        # fwd IC from -0.06 toward 0 (attribution), not manufacturing skill.
        "ceic": [],
        "globals": [],
        "macro": [("id_gdp_real_q", "demand", +1, "domestic corporate-activity backdrop -> B2B services"),
                  ("id_pmi", "demand", +1, "monthly activity pulse — timeliest demand proxy"),
                  ("id_cpi_yoy", "cost", -1, "wage/consumables inflation -> cost-plus margin squeeze"),
                  ("usdidr", "macro", 0, "domestic IDR-in/IDR-out services — ~zero FX exposure"),
                  ("id_bi_rate", "macro", 0, "ambiguous for asset-light services")],
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
