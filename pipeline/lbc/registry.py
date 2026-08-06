"""The series registry: every macro/commodity/FX/positioning series the system tracks.

source conventions:
  yahoo     -> yfinance daily close of <source_id>
  dbnomics  -> https://api.db.nomics.world/v22/series/<source_id>?observations=1
  bls       -> BLS public API v1 (keyless), series id <source_id>
  cftc      -> Socrata publicreporting.cftc.gov legacy futures-only, code=<source_id>
  scrape_*  -> custom scrapers in ingest/scrapes.py

Every entry was verified live on 2026-08-07 against its source. FRED's
fredgraph.csv was the original design but proved unreachable from throttled
networks; the same content now comes from Fed H.15 via DBnomics (daily,
current), BLS (monthly, current), and Yahoo (daily). Stale DBnomics mirrors
(BLS-on-DBnomics, OECD KEI) were rejected for being 12+ months behind.
"""

# key, label, country, category, unit, freq, source, source_id
SERIES = [
    # --- US rates / curve (Fed H.15 via DBnomics, business-daily, current) ---
    ("us.rate.dff",      "Fed Funds Effective",          "us", "rates",     "%",   "d", "dbnomics", "FED/H15/RIFSPFF_N.B"),
    ("us.rate.dgs2",     "UST 2Y Yield",                 "us", "rates",     "%",   "d", "dbnomics", "FED/H15/RIFLGFCY02_N.B"),
    ("us.rate.dgs10",    "UST 10Y Yield",                "us", "rates",     "%",   "d", "dbnomics", "FED/H15/RIFLGFCY10_N.B"),
    ("us.rate.dgs30",    "UST 30Y Yield",                "us", "rates",     "%",   "d", "dbnomics", "FED/H15/RIFLGFCY30_N.B"),
    ("us.liq.m2",        "US M2 Money Stock",            "us", "liquidity", "$bn", "m", "dbnomics", "FED/H6_H6_M2/M2.M"),
    # --- US risk / credit / dollar (Yahoo; ETF spreads proxy OAS) ---
    ("us.vol.vix",       "VIX",                          "us", "risk",      "idx", "d", "yahoo",   "^VIX"),
    ("us.vol.move",      "ICE BofA MOVE (rates vol)",    "us", "risk",      "idx", "d", "yahoo",   "^MOVE"),
    ("us.fx.dxy",        "Dollar Index",                 "us", "fx",        "idx", "d", "yahoo",   "DX-Y.NYB"),
    ("us.credit.hyg",    "HYG (US high yield)",          "us", "credit",    "$",   "d", "yahoo",   "HYG"),
    ("us.credit.lqd",    "LQD (US investment grade)",    "us", "credit",    "$",   "d", "yahoo",   "LQD"),
    ("us.credit.ief",    "IEF (7-10y Treasury)",         "us", "credit",    "$",   "d", "yahoo",   "IEF"),
    ("us.rate.tips",     "TIP (TIPS ETF, real-rate px)", "us", "rates",     "$",   "d", "yahoo",   "TIP"),
    ("us.eq.disc",       "XLY (consumer discretionary)", "us", "equity",    "$",   "d", "yahoo",   "XLY"),
    ("us.eq.staples",    "XLP (consumer staples)",       "us", "equity",    "$",   "d", "yahoo",   "XLP"),
    ("us.eq.semis",      "SMH (semis)",                  "us", "equity",    "$",   "d", "yahoo",   "SMH"),
    ("us.eq.transport",  "IYT (transports)",             "us", "equity",    "$",   "d", "yahoo",   "IYT"),
    ("us.eq.homebuild",  "XHB (homebuilders)",           "us", "equity",    "$",   "d", "yahoo",   "XHB"),
    # --- US activity / inflation (BLS public API, keyless, current) ---
    ("us.act.payems",    "Nonfarm Payrolls",             "us", "activity",  "k",   "m", "bls", "CES0000000001"),
    ("us.act.unrate",    "Unemployment Rate",            "us", "activity",  "%",   "m", "bls", "LNS14000000"),
    ("us.act.avghrs",    "Avg Weekly Hours (mfg)",       "us", "activity",  "hrs", "m", "bls", "CES3000000007"),
    ("us.infl.cpi_core", "Core CPI (index)",             "us", "inflation", "idx", "m", "bls", "CUSR0000SA0L1E"),
    ("us.infl.cpi",      "Headline CPI (index)",         "us", "inflation", "idx", "m", "bls", "CUSR0000SA0"),
    ("us.infl.ppi",      "PPI Final Demand",             "us", "inflation", "idx", "m", "bls", "WPUFD4"),
    # --- Commodities (Yahoo futures) ---
    ("cmd.oil.wti",      "WTI Crude",                    "global", "commodity", "$",  "d", "yahoo", "CL=F"),
    ("cmd.oil.brent",    "Brent Crude",                  "global", "commodity", "$",  "d", "yahoo", "BZ=F"),
    ("cmd.gas.hh",       "Henry Hub Natgas",             "global", "commodity", "$",  "d", "yahoo", "NG=F"),
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
    ("cmd.coal.equity",  "Coal Equity Complex (BTU)",    "global", "commodity", "$",  "d", "yahoo",   "BTU"),
    ("cmd.gsci",         "S&P GSCI Commodity Index",     "global", "commodity", "idx","d", "yahoo",   "^SPGSCI"),
    # --- FX (Yahoo) ---
    ("fx.usdidr",        "USD/IDR",                      "id", "fx", "IDR", "d", "yahoo", "IDR=X"),
    ("fx.usdjpy",        "USD/JPY",                      "jp", "fx", "JPY", "d", "yahoo", "JPY=X"),
    ("fx.usdkrw",        "USD/KRW",                      "kr", "fx", "KRW", "d", "yahoo", "KRW=X"),
    ("fx.usdcnh",        "USD/CNY",                      "cn", "fx", "CNY", "d", "yahoo", "CNY=X"),
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
    # --- Derived (computed in compute/derived.py from the series above) ---
    ("us.rate.t10y2y",   "UST 10Y-2Y Curve",             "us", "rates",     "pp",  "d", "derived", "dgs10-dgs2"),
    ("us.rate.real10",   "US 10Y Real Yield (CPI-based)","us", "rates",     "%",   "d", "derived", "dgs10-cpi_yoy"),
    ("us.credit.cond",   "Credit Conditions (HYG/IEF)",  "us", "credit",    "ratio","d", "derived", "hyg/ief"),
    ("us.act.cyclical",  "Cyclical Appetite (XLY/XLP)",  "us", "activity",  "ratio","d", "derived", "xly/xlp"),
    ("us.act.housing",   "Housing Momentum (XHB/SPX)",   "us", "activity",  "ratio","d", "derived", "xhb/spx"),
]


def series_map():
    return {s[0]: dict(zip(["key", "label", "country", "category", "unit", "freq", "source", "source_id"], s)) for s in SERIES}


def seed_rows():
    return [dict(zip(["key", "label", "country", "category", "unit", "freq", "source", "source_id"], s)) for s in SERIES]
