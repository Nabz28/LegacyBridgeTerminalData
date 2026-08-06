"""The series registry: every macro/commodity/FX/positioning series the system tracks.

source conventions:
  fredcsv   -> https://fred.stlouisfed.org/graph/fredgraph.csv?id=<source_id>   (keyless)
  yahoo     -> yfinance daily close of <source_id>
  dbnomics  -> https://api.db.nomics.world/v22/series/<source_id>?observations=1
  cftc      -> Socrata publicreporting.cftc.gov legacy futures-only, code=<source_id>
  scrape_*  -> custom scrapers in ingest/scrapes.py
Only sources verified live (2026-08-07) are seeded. Stale mirrors were deliberately
excluded; policy-rate changes are caught by the central-bank statement pipeline.
"""

# key, label, country, category, unit, freq, source, source_id
SERIES = [
    # --- US rates / curve / credit / liquidity (FRED, keyless CSV) ---
    ("us.rate.dff",      "Fed Funds Effective",          "us", "rates",     "%",   "d", "fredcsv", "DFF"),
    ("us.rate.dgs2",     "UST 2Y Yield",                 "us", "rates",     "%",   "d", "fredcsv", "DGS2"),
    ("us.rate.dgs10",    "UST 10Y Yield",                "us", "rates",     "%",   "d", "fredcsv", "DGS10"),
    ("us.rate.t10y2y",   "UST 10Y-2Y Spread",            "us", "rates",     "pp",  "d", "fredcsv", "T10Y2Y"),
    ("us.rate.dfii10",   "UST 10Y Real Yield (TIPS)",    "us", "rates",     "%",   "d", "fredcsv", "DFII10"),
    ("us.infl.t10yie",   "10Y Breakeven Inflation",      "us", "inflation", "%",   "d", "fredcsv", "T10YIE"),
    ("us.credit.hyoas",  "US HY OAS",                    "us", "credit",    "pp",  "d", "fredcsv", "BAMLH0A0HYM2"),
    ("us.credit.igoas",  "US IG OAS",                    "us", "credit",    "pp",  "d", "fredcsv", "BAMLC0A0CM"),
    ("us.fin.nfci",      "Chicago Fed NFCI",             "us", "liquidity", "idx", "w", "fredcsv", "NFCI"),
    ("us.liq.walcl",     "Fed Balance Sheet",            "us", "liquidity", "$mn", "w", "fredcsv", "WALCL"),
    ("us.liq.tga",       "Treasury General Account",     "us", "liquidity", "$bn", "w", "fredcsv", "WTREGEN"),
    ("us.liq.rrp",       "Fed Reverse Repo",             "us", "liquidity", "$bn", "d", "fredcsv", "RRPONTSYD"),
    ("us.vol.vix",       "VIX",                          "us", "risk",      "idx", "d", "fredcsv", "VIXCLS"),
    ("us.fx.dxy",        "Broad Dollar Index",           "us", "fx",        "idx", "d", "fredcsv", "DTWEXBGS"),
    # --- US activity / inflation prints (FRED) ---
    ("us.act.claims",    "Initial Jobless Claims",       "us", "activity",  "k",   "w", "fredcsv", "ICSA"),
    ("us.act.indpro",    "Industrial Production",        "us", "activity",  "idx", "m", "fredcsv", "INDPRO"),
    ("us.act.payems",    "Nonfarm Payrolls",             "us", "activity",  "k",   "m", "fredcsv", "PAYEMS"),
    ("us.act.rsafs",     "Retail Sales",                 "us", "activity",  "$mn", "m", "fredcsv", "RSAFS"),
    ("us.act.umcsent",   "U.Mich Consumer Sentiment",    "us", "activity",  "idx", "m", "fredcsv", "UMCSENT"),
    ("us.act.houst",     "Housing Starts",               "us", "activity",  "k",   "m", "fredcsv", "HOUST"),
    ("us.auto.saar",     "US Light Vehicle Sales SAAR",  "us", "activity",  "mn",  "m", "fredcsv", "TOTALSA"),
    ("us.infl.cpi_core", "Core CPI (index)",             "us", "inflation", "idx", "m", "fredcsv", "CPILFESL"),
    ("us.infl.pce_core", "Core PCE (index)",             "us", "inflation", "idx", "m", "fredcsv", "PCEPILFE"),
    # --- Commodities (FRED spot + Yahoo futures) ---
    ("cmd.oil.wti",      "WTI Crude",                    "global", "commodity", "$",  "d", "fredcsv", "DCOILWTICO"),
    ("cmd.oil.brent",    "Brent Crude",                  "global", "commodity", "$",  "d", "fredcsv", "DCOILBRENTEU"),
    ("cmd.gas.hh",       "Henry Hub Natgas",             "global", "commodity", "$",  "d", "fredcsv", "DHHNGSP"),
    ("cmd.gold",         "Gold Futures",                 "global", "commodity", "$",  "d", "yahoo",   "GC=F"),
    ("cmd.silver",       "Silver Futures",               "global", "commodity", "$",  "d", "yahoo",   "SI=F"),
    ("cmd.copper",       "Copper Futures",               "global", "commodity", "$",  "d", "yahoo",   "HG=F"),
    ("cmd.aluminum",     "Aluminum Futures",             "global", "commodity", "$",  "d", "yahoo",   "ALI=F"),
    ("cmd.soybean",      "Soybean Futures",              "global", "commodity", "c",  "d", "yahoo",   "ZS=F"),
    ("cmd.corn",         "Corn Futures",                 "global", "commodity", "c",  "d", "yahoo",   "ZC=F"),
    ("cmd.wheat",        "Wheat Futures",                "global", "commodity", "c",  "d", "yahoo",   "ZW=F"),
    ("cmd.soyoil",       "Soybean Oil (palm proxy)",     "global", "commodity", "c",  "d", "yahoo",   "ZL=F"),
    ("cmd.ngas_ttf",     "TTF EU Natgas",                "eu",     "commodity", "€",  "d", "yahoo",   "TTF=F"),
    ("cmd.coal.hba",     "Indonesia HBA Coal Benchmark", "id",     "commodity", "$",  "m", "scrape_hba", "HBA"),
    # --- FX (Yahoo) ---
    ("fx.usdidr",        "USD/IDR",                      "id", "fx", "IDR", "d", "yahoo", "IDR=X"),
    ("fx.usdjpy",        "USD/JPY",                      "jp", "fx", "JPY", "d", "yahoo", "JPY=X"),
    ("fx.usdkrw",        "USD/KRW",                      "kr", "fx", "KRW", "d", "yahoo", "KRW=X"),
    ("fx.usdcnh",        "USD/CNH",                      "cn", "fx", "CNH", "d", "yahoo", "CNH=X"),
    ("fx.eurusd",        "EUR/USD",                      "eu", "fx", "USD", "d", "yahoo", "EURUSD=X"),
    # --- Indexes (Yahoo) ---
    ("idx.spx",          "S&P 500",                      "us", "index", "idx", "d", "yahoo", "^GSPC"),
    ("idx.ndx",          "Nasdaq 100",                   "us", "index", "idx", "d", "yahoo", "^NDX"),
    ("idx.sox",          "PHLX Semiconductor",           "us", "index", "idx", "d", "yahoo", "^SOX"),
    ("idx.jkse",         "IDX Composite (JCI)",          "id", "index", "idx", "d", "yahoo", "^JKSE"),
    ("idx.hsi",          "Hang Seng",                    "cn", "index", "idx", "d", "yahoo", "^HSI"),
    ("idx.csi300",       "CSI 300",                      "cn", "index", "idx", "d", "yahoo", "000300.SS"),
    ("idx.twii",         "Taiwan TAIEX",                 "tw", "index", "idx", "d", "yahoo", "^TWII"),
    ("idx.n225",         "Nikkei 225",                   "jp", "index", "idx", "d", "yahoo", "^N225"),
    ("idx.kospi",        "KOSPI",                        "kr", "index", "idx", "d", "yahoo", "^KS11"),
    ("idx.stoxx",        "Euro Stoxx 50",                "eu", "index", "idx", "d", "yahoo", "^STOXX50E"),
    ("idx.dax",          "DAX",                          "eu", "index", "idx", "d", "yahoo", "^GDAXI"),
    ("crypto.btc",       "Bitcoin",                      "global", "crypto", "$", "d", "yahoo", "BTC-USD"),
    # --- Eurozone (DBnomics, verified live) ---
    ("eu.rate.dfr",      "ECB Deposit Facility Rate",    "eu", "rates",     "%",  "d", "dbnomics", "ECB/FM/D.U2.EUR.4F.KR.DFR.LEV"),
    ("eu.infl.hicp",     "EA HICP YoY",                  "eu", "inflation", "%",  "m", "dbnomics", "Eurostat/prc_hicp_manr/M.RCH_A.CP00.EA20"),
    ("eu.act.esi",       "EA Economic Sentiment",        "eu", "activity",  "idx","m", "dbnomics", "Eurostat/ei_bssi_m_r2/M.BS-ESI-I.SA.EA20"),
    # --- Positioning (CFTC legacy futures-only net specs) ---
    ("pos.cot.gold",     "COT Gold Net Specs",           "global", "positioning", "contracts", "w", "cftc", "088691"),
    ("pos.cot.silver",   "COT Silver Net Specs",         "global", "positioning", "contracts", "w", "cftc", "084691"),
    ("pos.cot.copper",   "COT Copper Net Specs",         "global", "positioning", "contracts", "w", "cftc", "085692"),
    ("pos.cot.wti",      "COT WTI Net Specs",            "global", "positioning", "contracts", "w", "cftc", "067651"),
    ("pos.cot.usd",      "COT USD Index Net Specs",      "global", "positioning", "contracts", "w", "cftc", "098662"),
    # --- Flows / high-frequency scrapes ---
    ("id.flow.foreign",  "IDX Foreign Net Buy (market)", "id", "flows",    "IDRbn", "d", "scrape_idx",  "FOREIGN_NET"),
    ("tw.tsmc.rev",      "TSMC Monthly Revenue",         "tw", "activity", "NT$mn", "m", "scrape_tsmc", "TSMC_REV"),
]


def series_map():
    return {s[0]: dict(zip(["key", "label", "country", "category", "unit", "freq", "source", "source_id"], s)) for s in SERIES}


def seed_rows():
    return [dict(zip(["key", "label", "country", "category", "unit", "freq", "source", "source_id"], s)) for s in SERIES]
