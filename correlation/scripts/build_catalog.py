"""Build correlation/catalog/universe.json from the embedded category tables.

Dedupes across categories (keep first occurrence), drops premium-marked items,
and emits per-series metadata (yf mapping, return type, source, category, sub).

Run once from the project root:
    python correlation/scripts/build_catalog.py
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

# ---------------------------------------------------------------------------
# Symbol -> yfinance mapping
# ---------------------------------------------------------------------------

# Direct overrides for symbols that don't fit a generic rule.
_YF_OVERRIDES: dict[str, str | None] = {
    # Yields / vol indices
    "TVC:US10Y": "^TNX",
    "TVC:US05Y": "^FVX",
    "TVC:US30Y": "^TYX",
    "TVC:US03MY": "^IRX",
    "TVC:DXY": "DX-Y.NYB",
    "CBOE:VIX": "^VIX",
    "CBOE:VVIX": "^VVIX",
    "CBOE:RVX": "^RVX",
    "CBOE:OVX": "^OVX",
    "CBOE:GVZ": "^GVZ",
    "CBOE:SKEW": "^SKEW",
    "CBOE:VIX9D": "^VIX9D",
    "CBOE:VIX3M": "^VIX3M",
    "CBOE:VIX6M": "^VIX6M",
    "CBOE:EVZ": "^EVZ",
    "CBOE:VXEEM": "^VXEEM",
    "TVC:MOVE": None,            # not on yahoo
    "TVC:CVIX": None,            # DB FX vol – not on yahoo
    "TVC:BBDXY": None,           # Bloomberg index, not on yahoo
    "TVC:EXY": None,
    "TVC:JXY": None,
    "TVC:BXY": None,
    # US 5y/10y BE on TV – yahoo lacks; will be best-effort and likely missing
    "TVC:US05YIE": None,
    "TVC:US10YIE": None,
    # Indexes & majors not in mapping rules
    "TVC:SPX": "^GSPC",
    "NASDAQ:NDX": "^NDX",
    "TVC:RUT": "^RUT",
    "TVC:DJI": "^DJI",
    "TVC:NI225": "^N225",
    "BSE:SENSEX": "^BSESN",
    "NSE:NIFTY": "^NSEI",
    "NSE:BANKNIFTY": "^NSEBANK",
    "NSE:CNXIT": "^CNXIT",
    "NSE:CNXAUTO": "^CNXAUTO",
    "NSE:CNXPHARMA": "^CNXPHARMA",
    "NSE:CNXFMCG": "^CNXFMCG",
    "NSE:CNXMETAL": "^CNXMETAL",
    "NSE:CNXENERGY": "^CNXENERGY",
    "NSE:CNXREALTY": "^CNXREALTY",
    "NSE:NIFTY_MIDCAP_100": "^NSEMDCP50",
    "NSE:CNXSMALLCAP": None,
    "NSE:INDIAVIX": "^INDIAVIX",
    "TVC:JPVIXC": None,
    "TSE:TOPIX": None,
    "TVC:JPNK400": None,
    "TSE:MOTHERS": None,
    # Stooq / non-yahoo macro stuff
    "BI7DRR": None,
    "JIBOR1M": None,
    "JIBOR3M": None,
    "JIBOR6M": None,
    "JIBOR12M": None,
    "INDONIA": None,
    # Indonesia gov yields – not on yahoo
    "TVC:ID01Y": None,
    "TVC:ID02Y": None,
    "TVC:ID03Y": None,
    "TVC:ID05Y": None,
    "TVC:ID07Y": None,
    "TVC:ID10Y": None,
    "TVC:ID15Y": None,
    "TVC:ID20Y": None,
    "TVC:ID30Y": None,
    # US extras
    "TVC:US02Y": None,
    "TVC:US03Y": None,
    "TVC:US07Y": None,
    "TVC:US20Y": None,
    "TVC:US06MY": None,
    # ECONOMICS:* (PMIs)
    "ECONOMICS:IDMPMI": None,
    # Indices in cat 5/7 etc.
    "SSE:000001": "000001.SS",
    "SSE:000300": "000300.SS",
    "SSE:000905": "000905.SS",
    "SSE:000852": "000852.SS",
    "SSE:000906": "000906.SS",
    "SSE:000688": None,
    "SSE:600519": "600519.SS",
    "SSE:601318": "601318.SS",
    "SZSE:399001": "399001.SZ",
    "SZSE:399330": "399330.SZ",
    "SZSE:399006": "399006.SZ",
    "SZSE:300750": "300750.SZ",
    "SGX:CN1!": None,
    "HKEX:HSI": "^HSI",
    "HKEX:HSCEI": "^HSCE",
    "HKEX:HSTECH": "^HSTECH",
    "HKEX:HSCI": None,
    # CN govvies
    "TVC:CN10Y": None,
    "TVC:CN02Y": None,
    "TVC:CN05Y": None,
    "TVC:CN30Y": None,
    # Europe
    "TVC:SXXP": "^STOXX",
    "TVC:SX5E": "^STOXX50E",
    "TVC:SX5P": None,
    "EURONEXT:N100": "^N100",
    "FTSE:SX7P": None,
    "FTSE:SXAP": None,
    "FTSE:SX8P": None,
    "FTSE:SXEP": None,
    "FTSE:SXDP": None,
    "FTSE:SXPP": None,
    "XETR:DAX": "^GDAXI",
    "XETR:MDAX": "^MDAXI",
    "XETR:TECDAX": "^TECDAX",
    "XETR:SDAX": "^SDAXI",
    "EURONEXT:PX1": "^FCHI",
    "EURONEXT:CACMD": None,
    "FTSE:UKX": "^FTSE",
    "FTSE:MCX": "^FTMC",
    "FTSE:ASX": "^FTAS",
    "FTSE:AXX": "^FTAI",
    "MIL:FTSEMIB": "FTSEMIB.MI",
    "BME:IBC": "^IBEX",
    "EURONEXT:AEX": "^AEX",
    "EURONEXT:AMX": "^AMX",
    "SIX:SMI": "^SSMI",
    "SIX:SLI": None,
    "SIX:SPI": None,
    "OMXSTO:OMXS30": "^OMX",
    "OSL:OBX": "OBX.OL",
    "OMXCOP:OMXC25": "^OMXC25",
    "OMXHEX:OMXH25": "^OMXH25",
    "EURONEXT:BEL20": "^BFX",
    "VIE:ATX": "^ATX",
    "EURONEXT:PSI20": "^PSI20",
    "ATHEX:GD": "GD.AT",
    "GPW:WIG20": "WIG20.WA",
    "TVC:DE02Y": None,
    "TVC:DE05Y": None,
    "TVC:DE10Y": None,
    "TVC:DE30Y": None,
    "TVC:GB02Y": None,
    "TVC:GB10Y": None,
    "TVC:GB30Y": None,
    "TVC:FR10Y": None,
    "TVC:IT10Y": None,
    "TVC:ES10Y": None,
    "TVC:GR10Y": None,
    "TVC:CA10Y": None,
    "TSX:TSX": "^GSPTSE",
    "TSX:TX60": "^TX60",
    "TSXV:JX": "^SPCDNX",
    "BVMF:IBOV": "^BVSP",
    "BVMF:IBXX": None,
    "BMV:ME": "^MXX",
    "BCS:IPSA": "^IPSA",
    "BVC:COLCAP": None,
    "BVL:SPBLPGPT": None,
    "JSE:J203": "^J203.JO",
    "JSE:J200": "^JN0U.JO",
    "BIST:XU100": "XU100.IS",
    "BIST:XU030": "XU030.IS",
    "TADAWUL:TASI": "^TASI.SR",
    "ADX:GENERAL": None,
    "DFM:GENERAL": None,
    "TASE:TA35": "TA35.TA",
    "TASE:TA125": "TA125.TA",
    "MOEX:IMOEX": "IMOEX.ME",
    "EGX:EGX30": "^CASE30",
    # ASEAN/Asia indices
    "SGX:STI": "^STI",
    "MYX:FBMKLCI": "^KLSE",
    "SET:SET": "^SET.BK",
    "SET:SET50": None,
    "PSE:PSEI": "PSEI.PS",
    "HOSE:VNINDEX": "^VNINDEX",
    "HOSE:VN30": None,
    "ASX:XJO": "^AXJO",
    "ASX:XKO": "^ATOI",
    "ASX:XMM": None,
    "ASX:XFJ": "^AXFJ",
    "TWSE:TAIEX": "^TWII",
    # ASEAN tickers
    "SGX:D05": "D05.SI",
    "SGX:O39": "O39.SI",
    "SGX:U11": "U11.SI",
    "MYX:1155": "1155.KL",
    "MYX:1295": "1295.KL",
    "MYX:5347": "5347.KL",
    "SET:PTT": "PTT.BK",
    "SET:AOT": "AOT.BK",
    "SET:KBANK": "KBANK.BK",
    "PSE:SM": "SM.PS",
    "PSE:BDO": "BDO.PS",
    "HOSE:VIC": "VIC.VN",
    "HOSE:VCB": "VCB.VN",
    # KRX VKOSPI
    "KRX:VKOSPI": None,
    "KRX:KOSPI": "^KS11",
    "KRX:KOSDAQ": "^KQ11",
    "KRX:KOSPI200": "^KS200",
    # Crypto dominance / cap – not on Yahoo
    "CRYPTOCAP:BTC.D": None,
    "CRYPTOCAP:ETH.D": None,
    "CRYPTOCAP:TOTAL": None,
    "CRYPTOCAP:TOTAL3": None,
    "CRYPTOCAP:USDT.D": None,
    # Energy / commodity exotics
    "ICEEUR:BRN1!": "BZ=F",
    "FX:USOIL": "CL=F",
    "FX:UKOIL": "BZ=F",
    "TVC:USOIL": "CL=F",
    "ICEEUR:DUB1!": None,
    "ICEEUR:G1!": None,
    "FX:NATGAS": "NG=F",
    "ICEEUR:TFM1!": "TTF=F",
    "ICEEUR:NBP1!": None,
    "SGX:JKM1!": None,
    "ICEEUR:ATW1!": None,
    "ICEEUR:ATR1!": "MTF=F",
    "SGX:FFX1!": None,
    "TVC:UXA1!": None,
    "ICEEUR:CFI2!": None,
    "AMEX:KOL": None,            # delisted
    # Metals exotics
    "OANDA:XAUUSD": "GC=F",
    "TVC:GOLD": "GC=F",
    "OANDA:XAGUSD": "SI=F",
    "OANDA:XPTUSD": "PL=F",
    "OANDA:XPDUSD": "PA=F",
    "LME:CA1!": None,            # use stooq xal.f
    "LME:ZS1!": None,
    "LME:NI1!": None,
    "LME:SN1!": None,
    "LME:PB1!": None,
    "COMEX:ALI1!": "ALI=F",
    "SGX:FEF1!": None,
    "DCE:I1!": None,
    "NYMEX:HRC1!": "HRC=F",
    "SHFE:RB1!": None,
    # Agri exotics
    "BMFBOVESPA:FCPO1!": None,
    "SGX:TF1!": None,
    "CBOT:KE1!": "KE=F",
    "CBOT:MW1!": "MW=F",
    "CBOT:ZO1!": "ZO=F",
    "CBOT:ZR1!": "ZR=F",
    "ICE:SF1!": None,
    "ICE:RC1!": None,
    "ICE:OJ1!": "OJ=F",
    "CME:LBR1!": "LBR=F",
    "CME:GF1!": "GF=F",
    "CME:DC1!": None,
    # IDX special: COMPOSITE is the Jakarta Composite -> ^JKSE on Yahoo
    "IDX:COMPOSITE": "^JKSE",
    "IDX:LQ45": None,           # not on yahoo by ticker; tvdatafeed only
    # FRED-only macro – yf=None (handled by src=fred)
}


def _strip_prefix(symbol: str) -> str:
    """For NASDAQ:XXX / NYSE:XXX / AMEX:XXX / BATS:XXX -> XXX."""
    if ":" in symbol:
        return symbol.split(":", 1)[1]
    return symbol


def _yf_for(symbol: str, src: str) -> str | None:
    """Best-effort TV symbol -> yfinance mapping."""
    if symbol in _YF_OVERRIDES:
        return _YF_OVERRIDES[symbol]
    if src in {"fred", "bi", "bps", "derived", "premium"}:
        return None

    if ":" not in symbol:
        return symbol  # bare ticker

    prefix, rest = symbol.split(":", 1)

    # US exchanges -> strip prefix
    if prefix in {"AMEX", "NYSE", "NASDAQ", "BATS", "ARCA"}:
        return rest.replace(".", "-")  # BRK.B -> BRK-B

    # Japan TSE
    if prefix == "TSE":
        if rest.isdigit():
            return f"{rest}.T"
        return None
    # Korea KRX
    if prefix == "KRX":
        if rest.isdigit():
            return f"{rest}.KS"
        return None
    # HKEX numeric
    if prefix == "HKEX":
        if rest.isdigit():
            return f"{rest.zfill(4)}.HK"
        return None
    # NSE / BSE India
    if prefix == "NSE":
        return f"{rest}.NS"
    if prefix == "BSE":
        return f"{rest}.BO"
    # Australia ASX
    if prefix == "ASX":
        return f"{rest}.AX"
    # Indonesia IDX
    if prefix == "IDX":
        return f"{rest}.JK"
    # Taiwan TWSE
    if prefix == "TWSE":
        if rest.isdigit():
            return f"{rest}.TW"
        return None
    # FX
    if prefix in {"FX", "FX_IDC", "OANDA"}:
        # already EURUSD etc
        return f"{rest}=X"
    # Futures roots that map cleanly
    if prefix in {"NYMEX", "COMEX", "CBOT", "ICE", "CME"} and rest.endswith("1!"):
        root = rest[:-2]
        return f"{root}=F"
    # Crypto
    if prefix == "BITSTAMP":
        # BTCUSD -> BTC-USD
        m = re.match(r"^([A-Z]+)USD$", rest)
        if m:
            return f"{m.group(1)}-USD"
        return None
    if prefix == "BINANCE":
        # SOLUSDT -> SOL-USD
        m = re.match(r"^([A-Z]+)USDT$", rest)
        if m:
            return f"{m.group(1)}-USD"
        return None

    return None


# ---------------------------------------------------------------------------
# Return-type classifier
# ---------------------------------------------------------------------------

_YIELD_TOKEN_RE = re.compile(r"\d+(?:Y|MY|M)$")
_DIFF_IDS = {
    "DFF", "SOFR", "IORB", "T5YIFR",
    "JIBOR1M", "JIBOR3M", "JIBOR6M", "JIBOR12M", "INDONIA", "BI7DRR",
    "TEDRATE",
}
_YOY_IDS = {
    "WALCL", "WTREGEN", "WRESBAL", "WM2NS", "WM1NS",
    "NFCI", "ANFCI", "STLFSI4",
    "BAMLH0A0HYM2", "BAMLC0A0CM",
    "DTWEXBGS",
    "IDNCPIALLMINMEI", "NGDPRSAXDCIDQ", "XTNTVA01IDM664S",
    "MYAGM2IDM189N", "IDNPROINDMISMEI",
    "MYAGM2CNM189N", "CHNCPIALLMINMEI",
    "DFII10", "DFII5", "DFII30",  # real yields - levels-style, treat as yoy is wrong; use diff
}
# Correct DFII* to diff (they're yields, not levels). Override here:
_DIFF_IDS.update({"DFII10", "DFII5", "DFII30"})
_YOY_IDS.discard("DFII10"); _YOY_IDS.discard("DFII5"); _YOY_IDS.discard("DFII30")

# Curve spreads / OAS proxies are derived levels-of-yields -> diff
_DERIVED_DIFF = {
    "US10Y-US02Y", "US10Y-US03MY", "US30Y-US05Y", "US30Y-US10Y",
    "HYG-IEF", "LQD-IEF",
}


def _ret_for(series_id: str, src: str, sub: str | None) -> str:
    """Return type per the spec rules."""
    if series_id in _DERIVED_DIFF:
        return "diff"
    if series_id in _DIFF_IDS:
        return "diff"
    if series_id in _YOY_IDS:
        return "yoy"

    # Yield/breakeven series (TVC:US10Y, TVC:DE10Y, TVC:ID10Y, TVC:CN10Y, TVC:US05YIE...)
    if series_id.startswith("TVC:") and (
        _YIELD_TOKEN_RE.search(series_id) or series_id.endswith("YIE")
    ):
        return "diff"

    # Vol indices: levels-style, treat as log returns (same as the spec for ETFs/equities/cat 2 vol)
    # The spec puts vol indices in cat 2 macro; they aren't yields. Use log.

    # Default: log
    return "log"


# ---------------------------------------------------------------------------
# Embedded universe (id, name, sub, [src], [start])
# Each entry is a 3- or 5-tuple. src defaults to 'tv', start defaults to None.
# ---------------------------------------------------------------------------

CATEGORIES: dict[str, list[tuple]] = {}

# ---------- Category 1: us_equities ----------
CATEGORIES["us_equities"] = [
    ("AMEX:SPY", "SPDR S&P 500 ETF", "Broad Index", "tv", 1993),
    ("NASDAQ:QQQ", "Invesco QQQ Trust", "Broad Index", "tv", 1999),
    ("AMEX:DIA", "SPDR Dow Jones Industrial", "Broad Index", "tv", 1998),
    ("AMEX:IWM", "iShares Russell 2000", "Broad Index", "tv", 2000),
    ("AMEX:MDY", "SPDR S&P MidCap 400", "Broad Index", "tv", 1995),
    ("AMEX:RSP", "Invesco S&P 500 Equal Weight", "Broad Index", "tv", 2003),
    ("AMEX:VTI", "Vanguard Total Stock Market", "Broad Index", "tv", 2001),
    ("TVC:SPX", "S&P 500 Index", "Index Direct", "tv", 2011),
    ("NASDAQ:NDX", "Nasdaq 100 Index", "Index Direct", "tv", 2011),
    ("TVC:RUT", "Russell 2000 Index", "Index Direct", "tv", 2011),
    ("TVC:DJI", "Dow Jones Industrial Avg", "Index Direct", "tv", 2011),
    ("AMEX:XLK", "Tech Select Sector", "Sector ETF — Tech", "tv", 1998),
    ("AMEX:XLF", "Financial Select Sector", "Sector ETF — Financials", "tv", 1998),
    ("AMEX:XLE", "Energy Select Sector", "Sector ETF — Energy", "tv", 1998),
    ("AMEX:XLV", "Health Care Select Sector", "Sector ETF — Healthcare", "tv", 1998),
    ("AMEX:XLI", "Industrial Select Sector", "Sector ETF — Industrials", "tv", 1998),
    ("AMEX:XLY", "Consumer Discretionary Select", "Sector ETF — Cons Disc", "tv", 1998),
    ("AMEX:XLP", "Consumer Staples Select", "Sector ETF — Cons Staples", "tv", 1998),
    ("AMEX:XLU", "Utilities Select Sector", "Sector ETF — Utilities", "tv", 1998),
    ("AMEX:XLB", "Materials Select Sector", "Sector ETF — Materials", "tv", 1998),
    ("AMEX:XLRE", "Real Estate Select Sector", "Sector ETF — REITs", "tv", 2015),
    ("AMEX:XLC", "Communication Svcs Select", "Sector ETF — Comm", "tv", 2018),
    ("AMEX:SMH", "VanEck Semiconductor", "Sub-Industry — Semis", "tv", 2011),
    ("NASDAQ:SOXX", "iShares Semiconductor", "Sub-Industry — Semis", "tv", 2001),
    ("AMEX:KRE", "SPDR Regional Banking", "Sub-Industry — Reg Banks", "tv", 2006),
    ("AMEX:KBE", "SPDR S&P Bank", "Sub-Industry — Banks", "tv", 2005),
    ("NASDAQ:IBB", "iShares Biotechnology", "Sub-Industry — Biotech", "tv", 2001),
    ("AMEX:XBI", "SPDR S&P Biotech", "Sub-Industry — Biotech EW", "tv", 2006),
    ("AMEX:ITB", "iShares US Home Construction", "Sub-Industry — Homebuilders", "tv", 2006),
    ("AMEX:XHB", "SPDR S&P Homebuilders", "Sub-Industry — Homebuilders", "tv", 2006),
    ("AMEX:ARKK", "ARK Innovation", "Sub-Industry — Disruptive", "tv", 2014),
    ("AMEX:ARKG", "ARK Genomic Revolution", "Sub-Industry — Genomics", "tv", 2014),
    ("AMEX:ARKW", "ARK Next Gen Internet", "Sub-Industry — Internet", "tv", 2014),
    ("AMEX:FDN", "First Trust Dow Jones Internet", "Sub-Industry — Internet", "tv", 2006),
    ("AMEX:IGV", "iShares Expanded Tech-Software", "Sub-Industry — Software", "tv", 2001),
    ("AMEX:HACK", "ETFMG Prime Cyber Security", "Sub-Industry — Cybersec", "tv", 2014),
    ("AMEX:JETS", "US Global Jets", "Sub-Industry — Airlines", "tv", 2015),
    ("AMEX:IYT", "iShares Transportation", "Sub-Industry — Transports", "tv", 2003),
    ("AMEX:XRT", "SPDR S&P Retail", "Sub-Industry — Retail", "tv", 2006),
    ("AMEX:OIH", "VanEck Oil Services", "Sub-Industry — Oil Svcs", "tv", 2011),
    ("AMEX:XOP", "SPDR S&P Oil & Gas E&P", "Sub-Industry — E&P", "tv", 2006),
    ("AMEX:GDX", "VanEck Gold Miners", "Sub-Industry — Gold Miners", "tv", 2006),
    ("AMEX:MTUM", "iShares MSCI USA Momentum", "Factor — Momentum", "tv", 2013),
    ("AMEX:QUAL", "iShares MSCI USA Quality", "Factor — Quality", "tv", 2013),
    ("AMEX:VLUE", "iShares MSCI USA Value", "Factor — Value", "tv", 2013),
    ("AMEX:USMV", "iShares MSCI USA Min Vol", "Factor — Low Vol", "tv", 2011),
    ("AMEX:SPLV", "Invesco S&P 500 Low Volatility", "Factor — Low Vol", "tv", 2011),
    ("AMEX:SPHB", "Invesco S&P 500 High Beta", "Factor — High Beta", "tv", 2011),
    ("AMEX:SIZE", "iShares MSCI USA Size", "Factor — Size", "tv", 2013),
    ("AMEX:DGRO", "iShares Core Dividend Growth", "Factor — Div Growth", "tv", 2014),
    ("NASDAQ:IWF", "iShares Russell 1000 Growth", "Style — Growth", "tv", 2000),
    ("NASDAQ:IWD", "iShares Russell 1000 Value", "Style — Value", "tv", 2000),
    ("NASDAQ:IUSG", "iShares Core S&P US Growth", "Style — Growth", "tv", 2000),
    ("NASDAQ:IUSV", "iShares Core S&P US Value", "Style — Value", "tv", 2000),
    ("AMEX:RPV", "Invesco S&P 500 Pure Value", "Style — Pure Value", "tv", 2006),
    ("AMEX:RPG", "Invesco S&P 500 Pure Growth", "Style — Pure Growth", "tv", 2006),
    ("NASDAQ:AAPL", "Apple Inc", "Mega Cap — Tech", "tv", 1980),
    ("NASDAQ:MSFT", "Microsoft Corp", "Mega Cap — Tech", "tv", 1986),
    ("NASDAQ:GOOGL", "Alphabet Inc Cl A", "Mega Cap — Comm", "tv", 2004),
    ("NASDAQ:AMZN", "Amazon.com", "Mega Cap — Cons Disc", "tv", 1997),
    ("NASDAQ:META", "Meta Platforms", "Mega Cap — Comm", "tv", 2012),
    ("NASDAQ:NVDA", "NVIDIA Corp", "Mega Cap — Semis", "tv", 1999),
    ("NASDAQ:TSLA", "Tesla Inc", "Mega Cap — Cons Disc", "tv", 2010),
    ("NYSE:BRK.B", "Berkshire Hathaway B", "Mega Cap — Financials", "tv", 1996),
    ("NYSE:JPM", "JPMorgan Chase", "Mega Cap — Banks", "tv", 1980),
    ("NYSE:V", "Visa Inc", "Mega Cap — Fin Svcs", "tv", 2008),
    ("NYSE:MA", "Mastercard Inc", "Mega Cap — Fin Svcs", "tv", 2006),
    ("NYSE:UNH", "UnitedHealth Group", "Mega Cap — Healthcare", "tv", 1984),
    ("NYSE:LLY", "Eli Lilly", "Mega Cap — Pharma", "tv", 1980),
    ("NYSE:XOM", "Exxon Mobil", "Mega Cap — Energy", "tv", 1980),
    ("NYSE:CVX", "Chevron Corp", "Mega Cap — Energy", "tv", 1980),
    ("NYSE:WMT", "Walmart Inc", "Mega Cap — Staples", "tv", 1980),
    ("NYSE:HD", "Home Depot", "Mega Cap — Cons Disc", "tv", 1981),
    ("NYSE:BAC", "Bank of America", "Mega Cap — Banks", "tv", 1980),
    ("NASDAQ:COST", "Costco Wholesale", "Mega Cap — Staples", "tv", 1985),
    ("NYSE:AVGO", "Broadcom Inc", "Mega Cap — Semis", "tv", 2009),
    ("NASDAQ:TSM", "Taiwan Semiconductor ADR", "Mega Cap — Semis", "tv", 1997),
    ("NYSE:ORCL", "Oracle Corp", "Mega Cap — Software", "tv", 1986),
    ("NYSE:CRM", "Salesforce Inc", "Mega Cap — Software", "tv", 2004),
    ("NASDAQ:NFLX", "Netflix Inc", "Mega Cap — Comm", "tv", 2002),
    ("NYSE:JNJ", "Johnson & Johnson", "Mega Cap — Pharma", "tv", 1980),
    ("NYSE:PG", "Procter & Gamble", "Mega Cap — Staples", "tv", 1980),
]

# ---------- Category 2: us_macro ----------
CATEGORIES["us_macro"] = [
    ("TVC:US02Y", "US 2Y", "UST Yield", "tv"),
    ("TVC:US03Y", "US 3Y", "UST Yield", "tv"),
    ("TVC:US05Y", "US 5Y", "UST Yield", "tv"),
    ("TVC:US07Y", "US 7Y", "UST Yield", "tv"),
    ("TVC:US10Y", "US 10Y", "UST Yield", "tv"),
    ("TVC:US20Y", "US 20Y", "UST Yield", "tv"),
    ("TVC:US30Y", "US 30Y", "UST Yield", "tv"),
    ("TVC:US03MY", "US 3M Bill", "UST Yield", "tv"),
    ("TVC:US06MY", "US 6M Bill", "UST Yield", "tv"),
    ("US10Y-US02Y", "2s10s", "Curve Spread", "derived"),
    ("US10Y-US03MY", "3m10y", "Curve Spread", "derived"),
    ("US30Y-US05Y", "5s30s", "Curve Spread", "derived"),
    ("US30Y-US10Y", "10s30s", "Curve Spread", "derived"),
    ("DFII10", "US 10Y Real", "Real Yield", "fred"),
    ("DFII5", "US 5Y Real", "Real Yield", "fred"),
    ("DFII30", "US 30Y Real", "Real Yield", "fred"),
    ("TVC:US05YIE", "US 5Y Breakeven", "Breakeven", "tv"),
    ("TVC:US10YIE", "US 10Y Breakeven", "Breakeven", "tv"),
    ("T5YIFR", "5y5y Forward Breakeven", "Breakeven", "fred"),
    ("DFF", "Effective Fed Funds", "Policy Rate", "fred"),
    ("SOFR", "SOFR", "Funding", "fred"),
    ("IORB", "IORB", "Policy Rate", "fred"),
    ("RRPONTSYD", "ON RRP Usage", "Funding", "fred"),
    ("WALCL", "Fed Balance Sheet", "Liquidity", "fred"),
    ("WTREGEN", "Treasury General Account", "Liquidity", "fred"),
    ("WRESBAL", "Bank Reserves", "Liquidity", "fred"),
    ("AMEX:BIL", "SPDR 1-3M T-Bill", "Treasury ETF", "tv"),
    ("NASDAQ:SHY", "iShares 1-3Y UST", "Treasury ETF", "tv"),
    ("NASDAQ:IEI", "iShares 3-7Y UST", "Treasury ETF", "tv"),
    ("NASDAQ:IEF", "iShares 7-10Y UST", "Treasury ETF", "tv"),
    ("NASDAQ:TLT", "iShares 20+Y UST", "Treasury ETF", "tv"),
    ("AMEX:EDV", "Vanguard Extended Duration", "Treasury ETF", "tv"),
    ("AMEX:GOVT", "iShares US Treasury", "Treasury ETF", "tv"),
    ("AMEX:SCHO", "Schwab 1-3Y UST", "Treasury ETF", "tv"),
    ("AMEX:SCHR", "Schwab Intermediate UST", "Treasury ETF", "tv"),
    ("AMEX:TIP", "iShares TIPS", "TIPS ETF", "tv"),
    ("NASDAQ:STIP", "iShares 0-5Y TIPS", "TIPS ETF", "tv"),
    ("NASDAQ:VTIP", "Vanguard Short TIPS", "TIPS ETF", "tv"),
    ("AMEX:SCHP", "Schwab US TIPS", "TIPS ETF", "tv"),
    ("AMEX:LQD", "iShares IG Corp", "Credit ETF", "tv"),
    ("AMEX:USIG", "iShares Broad IG", "Credit ETF", "tv"),
    ("AMEX:HYG", "iShares HY Corp", "Credit ETF", "tv"),
    ("AMEX:JNK", "SPDR HY Bond", "Credit ETF", "tv"),
    ("NASDAQ:FALN", "iShares Fallen Angels HY", "Credit ETF", "tv"),
    ("AMEX:ANGL", "VanEck Fallen Angel HY", "Credit ETF", "tv"),
    ("AMEX:BKLN", "Invesco Senior Loan", "Credit ETF", "tv"),
    ("AMEX:SRLN", "SPDR Blackstone Senior Loan", "Credit ETF", "tv"),
    ("AMEX:FLOT", "iShares Floating Rate Bond", "Credit ETF", "tv"),
    ("NASDAQ:EMB", "iShares EM USD Bond", "Credit ETF", "tv"),
    ("AMEX:EMLC", "VanEck EM Local Bond", "Credit ETF", "tv"),
    ("HYG-IEF", "HY OAS Proxy", "Credit Spread", "derived"),
    ("LQD-IEF", "IG OAS Proxy", "Credit Spread", "derived"),
    ("BAMLH0A0HYM2", "ICE BofA US HY OAS", "Credit Spread", "fred"),
    ("BAMLC0A0CM", "ICE BofA US IG OAS", "Credit Spread", "fred"),
    ("TVC:DXY", "US Dollar Index", "FX Index", "tv"),
    ("DTWEXBGS", "USD Broad TWI", "FX Index", "fred"),
    ("CBOE:VIX", "VIX", "Vol Index", "tv"),
    ("CBOE:VVIX", "VIX of VIX", "Vol Index", "tv"),
    ("CBOE:VIX9D", "9D VIX", "Vol Index", "tv"),
    ("CBOE:VIX3M", "3M VIX", "Vol Index", "tv"),
    ("CBOE:VIX6M", "6M VIX", "Vol Index", "tv"),
    ("CBOE:SKEW", "SKEW", "Vol Index", "tv"),
    ("TVC:MOVE", "MOVE Index", "Vol Index", "tv"),
    ("CBOE:OVX", "Crude Oil VIX", "Vol Index", "tv"),
    ("CBOE:GVZ", "Gold VIX", "Vol Index", "tv"),
    ("CBOE:EVZ", "EuroFX VIX", "Vol Index", "tv"),
    ("CBOE:RVX", "R2K VIX", "Vol Index", "tv"),
    ("CBOE:VXEEM", "EM ETF VIX", "Vol Index", "tv"),
    ("WM2NS", "M2 (weekly NSA)", "Monetary", "fred"),
    ("WM1NS", "M1 (weekly NSA)", "Monetary", "fred"),
    ("NFCI", "Chicago Fed NFCI", "FCI", "fred"),
    ("ANFCI", "Chicago Fed ANFCI", "FCI", "fred"),
    ("STLFSI4", "St Louis Fed Stress", "FCI", "fred"),
    ("TEDRATE", "TED Spread", "Funding", "fred"),
]

# ---------- Category 3: indonesia_equities ----------
CATEGORIES["indonesia_equities"] = [
    ("IDX:COMPOSITE", "JCI/JKSE", "Broad Index", "tv"),
    ("IDX:LQ45", "LQ45", "Broad Index", "tv"),
    ("IDX:IDX30", "IDX30", "Broad Index", "tv"),
    ("IDX:IDX80", "IDX80", "Broad Index", "tv"),
    ("IDX:KOMPAS100", "Kompas100", "Broad Index", "tv"),
    ("IDX:JII", "Jakarta Islamic", "Broad Index", "tv"),
    ("IDX:JII70", "JII70", "Broad Index", "tv"),
    ("IDX:BISNIS27", "Bisnis-27", "Broad Index", "tv"),
    ("IDX:MNC36", "MNC36", "Broad Index", "tv"),
    ("IDX:INFOBANK15", "Infobank15", "Broad Index", "tv"),
    ("IDX:IDXBUMN20", "IDX BUMN20", "Broad Index", "tv"),
    ("IDX:SRI-KEHATI", "SRI-KEHATI ESG", "Broad Index", "tv"),
    ("IDX:IDXG30", "IDX Growth30", "Broad Index", "tv"),
    ("IDX:IDXQ30", "IDX Quality30", "Broad Index", "tv"),
    ("IDX:IDXV30", "IDX Value30", "Broad Index", "tv"),
    ("IDX:IDXHIDIV20", "IDX HiDiv20", "Broad Index", "tv"),
    ("IDX:IDXSMC-LIQ", "IDX SMC Liquid", "Broad Index", "tv"),
    ("IDX:IDXSMC-COMPOSITE", "IDX SMC Composite", "Broad Index", "tv"),
    ("IDX:ISSI", "Indonesia Sharia", "Broad Index", "tv"),
    ("IDX:IDXESGL", "IDX ESG Leaders", "Broad Index", "tv"),
    ("IDX:IDXENERGY", "IDX Energy", "Sector IDX-IC", "tv"),
    ("IDX:IDXBASIC", "IDX Basic Materials", "Sector IDX-IC", "tv"),
    ("IDX:IDXINDUST", "IDX Industrials", "Sector IDX-IC", "tv"),
    ("IDX:IDXNONCYC", "IDX Cons Non-Cyc", "Sector IDX-IC", "tv"),
    ("IDX:IDXCYCLIC", "IDX Cons Cyclicals", "Sector IDX-IC", "tv"),
    ("IDX:IDXHEALTH", "IDX Healthcare", "Sector IDX-IC", "tv"),
    ("IDX:IDXFINANCE", "IDX Financials", "Sector IDX-IC", "tv"),
    ("IDX:IDXPROPERT", "IDX Properties", "Sector IDX-IC", "tv"),
    ("IDX:IDXTECHNO", "IDX Technology", "Sector IDX-IC", "tv"),
    ("IDX:IDXINFRA", "IDX Infrastructure", "Sector IDX-IC", "tv"),
    ("IDX:IDXTRANS", "IDX Transport", "Sector IDX-IC", "tv"),
    ("IDX:JKAGRI", "JASICA Agri", "Sector legacy", "tv"),
    ("IDX:JKMING", "JASICA Mining", "Sector legacy", "tv"),
    ("IDX:JKBIND", "JASICA Basic Industry", "Sector legacy", "tv"),
    ("IDX:JKMISC", "JASICA Misc", "Sector legacy", "tv"),
    ("IDX:JKCONS", "JASICA Consumer", "Sector legacy", "tv"),
    ("IDX:JKPROP", "JASICA Property", "Sector legacy", "tv"),
    ("IDX:JKINFR", "JASICA Infrastructure", "Sector legacy", "tv"),
    ("IDX:JKFINA", "JASICA Finance", "Sector legacy", "tv"),
    ("IDX:JKTRADE", "JASICA Trade", "Sector legacy", "tv"),
    ("IDX:JKMNFG", "JASICA Manufacturing", "Sector legacy", "tv"),
    ("IDX:BBCA", "Bank Central Asia", "Banks", "tv"),
    ("IDX:BBRI", "Bank Rakyat", "Banks", "tv"),
    ("IDX:BMRI", "Bank Mandiri", "Banks", "tv"),
    ("IDX:BBNI", "Bank Negara", "Banks", "tv"),
    ("IDX:BRIS", "Bank Syariah Indonesia", "Banks", "tv"),
    ("IDX:ARTO", "Bank Jago", "Banks", "tv"),
    ("IDX:BBTN", "Bank Tabungan Negara", "Banks", "tv"),
    ("IDX:BNGA", "Bank CIMB Niaga", "Banks", "tv"),
    ("IDX:BDMN", "Bank Danamon", "Banks", "tv"),
    ("IDX:MEGA", "Bank Mega", "Banks", "tv"),
    ("IDX:TLKM", "Telkom Indonesia", "Telco/Tech", "tv"),
    ("IDX:ISAT", "Indosat", "Telco/Tech", "tv"),
    ("IDX:EXCL", "XL Axiata", "Telco/Tech", "tv"),
    ("IDX:FREN", "Smartfren", "Telco/Tech", "tv"),
    ("IDX:GOTO", "GoTo", "Telco/Tech", "tv"),
    ("IDX:BUKA", "Bukalapak", "Telco/Tech", "tv"),
    ("IDX:EMTK", "Elang Mahkota", "Telco/Tech", "tv"),
    ("IDX:MTEL", "Mitratel", "Telco/Tech", "tv"),
    ("IDX:TOWR", "Sarana Menara", "Telco/Tech", "tv"),
    ("IDX:UNVR", "Unilever Indonesia", "Consumer", "tv"),
    ("IDX:ICBP", "Indofood CBP", "Consumer", "tv"),
    ("IDX:INDF", "Indofood Sukses", "Consumer", "tv"),
    ("IDX:MYOR", "Mayora Indah", "Consumer", "tv"),
    ("IDX:GGRM", "Gudang Garam", "Consumer", "tv"),
    ("IDX:HMSP", "HM Sampoerna", "Consumer", "tv"),
    ("IDX:KLBF", "Kalbe Farma", "Consumer/HC", "tv"),
    ("IDX:MAPI", "Mitra Adiperkasa", "Consumer", "tv"),
    ("IDX:ACES", "Ace Hardware Indonesia", "Consumer", "tv"),
    ("IDX:AMRT", "Sumber Alfaria (Alfamart)", "Consumer", "tv"),
    ("IDX:MIDI", "Midi Utama", "Consumer", "tv"),
    ("IDX:ADRO", "Adaro Energy", "Energy/Coal", "tv"),
    ("IDX:PTBA", "Bukit Asam", "Energy/Coal", "tv"),
    ("IDX:ITMG", "Indo Tambangraya", "Energy/Coal", "tv"),
    ("IDX:MEDC", "Medco Energi", "Energy/Coal", "tv"),
    ("IDX:PGAS", "PGN", "Energy/Coal", "tv"),
    ("IDX:HRUM", "Harum Energy", "Energy/Coal", "tv"),
    ("IDX:BUMI", "Bumi Resources", "Energy/Coal", "tv"),
    ("IDX:BYAN", "Bayan Resources", "Energy/Coal", "tv"),
    ("IDX:BSSR", "Baramulti", "Energy/Coal", "tv"),
    ("IDX:INDY", "Indika Energy", "Energy/Coal", "tv"),
    ("IDX:AKRA", "AKR Corporindo", "Energy/Coal", "tv"),
    ("IDX:ANTM", "Aneka Tambang", "Metals", "tv"),
    ("IDX:INCO", "Vale Indonesia", "Metals", "tv"),
    ("IDX:MDKA", "Merdeka Copper Gold", "Metals", "tv"),
    ("IDX:TINS", "Timah", "Metals", "tv"),
    ("IDX:NCKL", "Trimegah Bangun (Harita)", "Metals", "tv"),
    ("IDX:BRMS", "Bumi Resources Minerals", "Metals", "tv"),
    ("IDX:PSAB", "J Resources", "Metals", "tv"),
    ("IDX:SMGR", "Semen Indonesia", "Cement/Industrial", "tv"),
    ("IDX:INTP", "Indocement", "Cement/Industrial", "tv"),
    ("IDX:INKP", "Indah Kiat", "Cement/Industrial", "tv"),
    ("IDX:TKIM", "Pabrik Kertas Tjiwi Kimia", "Cement/Industrial", "tv"),
    ("IDX:JPFA", "Japfa Comfeed", "Cement/Industrial", "tv"),
    ("IDX:CPIN", "Charoen Pokphand", "Cement/Industrial", "tv"),
    ("IDX:MAIN", "Malindo Feedmill", "Cement/Industrial", "tv"),
    ("IDX:SMRA", "Summarecon", "Property", "tv"),
    ("IDX:BSDE", "Bumi Serpong Damai", "Property", "tv"),
    ("IDX:CTRA", "Ciputra", "Property", "tv"),
    ("IDX:PWON", "Pakuwon Jati", "Property", "tv"),
    ("IDX:LPKR", "Lippo Karawaci", "Property", "tv"),
    ("IDX:ASRI", "Alam Sutera", "Property", "tv"),
    ("IDX:JRPT", "Jaya Real Property", "Property", "tv"),
    ("IDX:ASII", "Astra International", "Auto/Cong", "tv"),
    ("IDX:IMAS", "Indomobil", "Auto/Cong", "tv"),
    ("IDX:GJTL", "Gajah Tunggal", "Auto/Cong", "tv"),
    ("IDX:UNTR", "United Tractors", "Auto/Cong", "tv"),
    ("IDX:HEXA", "Hexindo", "Auto/Cong", "tv"),
    ("IDX:AALI", "Astra Agro Lestari", "Plantation", "tv"),
    ("IDX:LSIP", "London Sumatra", "Plantation", "tv"),
    ("IDX:SSMS", "Sawit Sumbermas", "Plantation", "tv"),
    ("IDX:DSNG", "Dharma Satya", "Plantation", "tv"),
    ("IDX:TAPG", "Triputra Agro", "Plantation", "tv"),
    ("IDX:SMAR", "Sinar Mas Agro", "Plantation", "tv"),
    ("IDX:TPIA", "Chandra Asri", "Petrochem", "tv"),
    ("IDX:BRPT", "Barito Pacific", "Petrochem", "tv"),
    ("IDX:ESSA", "ESSA Industries", "Petrochem", "tv"),
    ("IDX:JSMR", "Jasa Marga", "Infra", "tv"),
    ("IDX:WSKT", "Waskita Karya", "Infra", "tv"),
    ("IDX:PTPP", "PP Persero", "Infra", "tv"),
    ("IDX:ADHI", "Adhi Karya", "Infra", "tv"),
    ("IDX:WIKA", "Wijaya Karya", "Infra", "tv"),
    ("IDX:KAEF", "Kimia Farma", "Healthcare", "tv"),
    ("IDX:INAF", "Indofarma", "Healthcare", "tv"),
    ("IDX:SIDO", "Sido Muncul", "Healthcare", "tv"),
    ("IDX:MIKA", "Mitra Keluarga", "Healthcare", "tv"),
    ("IDX:HEAL", "Medikaloka Hermina", "Healthcare", "tv"),
    ("IDX:ERAA", "Erajaya", "Retail", "tv"),
    ("IDX:RALS", "Ramayana", "Retail", "tv"),
]

# ---------- Category 4: indonesia_macro (premium dropped) ----------
CATEGORIES["indonesia_macro"] = [
    ("FX_IDC:USDIDR", "USD/IDR", "FX", "tv"),
    ("FX_IDC:EURIDR", "EUR/IDR", "FX", "tv"),
    ("FX_IDC:JPYIDR", "JPY/IDR", "FX", "tv"),
    ("FX_IDC:SGDIDR", "SGD/IDR", "FX", "tv"),
    ("FX_IDC:CNHIDR", "CNH/IDR", "FX", "tv"),
    ("FX_IDC:AUDIDR", "AUD/IDR", "FX", "tv"),
    ("FX_IDC:GBPIDR", "GBP/IDR", "FX", "tv"),
    ("FX_IDC:CHFIDR", "CHF/IDR", "FX", "tv"),
    ("BI7DRR", "BI 7-Day Reverse Repo", "Policy Rate", "bi"),
    ("TVC:ID01Y", "Indonesia 1Y", "Govvy", "tv"),
    ("TVC:ID02Y", "Indonesia 2Y", "Govvy", "tv"),
    ("TVC:ID03Y", "Indonesia 3Y", "Govvy", "tv"),
    ("TVC:ID05Y", "Indonesia 5Y", "Govvy", "tv"),
    ("TVC:ID07Y", "Indonesia 7Y", "Govvy", "tv"),
    ("TVC:ID10Y", "Indonesia 10Y", "Govvy", "tv"),
    ("TVC:ID15Y", "Indonesia 15Y", "Govvy", "tv"),
    ("TVC:ID20Y", "Indonesia 20Y", "Govvy", "tv"),
    ("TVC:ID30Y", "Indonesia 30Y", "Govvy", "tv"),
    ("JIBOR1M", "JIBOR 1M", "Funding", "bi"),
    ("JIBOR3M", "JIBOR 3M", "Funding", "bi"),
    ("JIBOR6M", "JIBOR 6M", "Funding", "bi"),
    ("JIBOR12M", "JIBOR 12M", "Funding", "bi"),
    ("INDONIA", "Indonesia ON Index", "Funding", "bi"),
    ("IDNCPIALLMINMEI", "Indonesia CPI", "Macro", "fred"),
    ("NGDPRSAXDCIDQ", "Indonesia GDP", "Macro", "fred"),
    ("XTNTVA01IDM664S", "Indonesia Trade Balance", "Macro", "fred"),
    ("MYAGM2IDM189N", "Indonesia M2", "Macro", "fred"),
    ("IDNPROINDMISMEI", "Indonesia IP", "Macro", "fred"),
    ("ECONOMICS:IDMPMI", "Indonesia Mfg PMI", "Macro", "tv"),
]

# ---------- Category 5: china_hk ----------
CATEGORIES["china_hk"] = [
    ("SSE:000001", "Shanghai Composite", "Index", "tv"),
    ("SSE:000300", "CSI 300", "Index", "tv"),
    ("SSE:000905", "CSI 500", "Index", "tv"),
    ("SSE:000852", "CSI 1000", "Index", "tv"),
    ("SSE:000906", "CSI 800", "Index", "tv"),
    ("SZSE:399001", "Shenzhen Component", "Index", "tv"),
    ("SZSE:399330", "SZSE 100", "Index", "tv"),
    ("SZSE:399006", "ChiNext", "Index", "tv"),
    ("SSE:000688", "STAR 50", "Index", "tv"),
    ("SGX:CN1!", "FTSE China A50 Futures", "Future", "tv"),
    ("HKEX:HSI", "Hang Seng", "Index", "tv"),
    ("HKEX:HSCEI", "HSCEI", "Index", "tv"),
    ("HKEX:HSTECH", "Hang Seng TECH", "Index", "tv"),
    ("HKEX:HSCI", "Hang Seng Composite", "Index", "tv"),
    ("AMEX:FXI", "iShares China Large-Cap", "ETF", "tv"),
    ("AMEX:MCHI", "iShares MSCI China", "ETF", "tv"),
    ("AMEX:KWEB", "KraneShares China Internet", "ETF", "tv"),
    ("AMEX:ASHR", "Xtrackers CSI 300", "ETF", "tv"),
    ("AMEX:CQQQ", "Invesco China Tech", "ETF", "tv"),
    ("AMEX:YINN", "Direxion 3x China Bull", "ETF", "tv"),
    ("AMEX:CHIQ", "Global X China Consumer", "ETF", "tv"),
    ("AMEX:KBA", "KraneShares MSCI China A", "ETF", "tv"),
    ("AMEX:PGJ", "Invesco Golden Dragon", "ETF", "tv"),
    ("NYSE:BABA", "Alibaba ADR", "ADR", "tv"),
    ("NASDAQ:JD", "JD.com", "ADR", "tv"),
    ("NASDAQ:PDD", "PDD Holdings", "ADR", "tv"),
    ("NASDAQ:BIDU", "Baidu", "ADR", "tv"),
    ("NYSE:NIO", "NIO", "ADR", "tv"),
    ("NASDAQ:LI", "Li Auto", "ADR", "tv"),
    ("NYSE:XPEV", "XPeng", "ADR", "tv"),
    ("NASDAQ:NTES", "NetEase", "ADR", "tv"),
    ("NASDAQ:BILI", "Bilibili", "ADR", "tv"),
    ("HKEX:0700", "Tencent", "HK Equity", "tv"),
    ("HKEX:9988", "Alibaba HK", "HK Equity", "tv"),
    ("HKEX:3690", "Meituan", "HK Equity", "tv"),
    ("HKEX:1211", "BYD", "HK Equity", "tv"),
    ("HKEX:0005", "HSBC", "HK Equity", "tv"),
    ("HKEX:1299", "AIA", "HK Equity", "tv"),
    ("HKEX:2318", "Ping An", "HK Equity", "tv"),
    ("HKEX:1398", "ICBC", "HK Equity", "tv"),
    ("HKEX:0939", "CCB", "HK Equity", "tv"),
    ("HKEX:0883", "CNOOC", "HK Equity", "tv"),
    ("HKEX:1810", "Xiaomi", "HK Equity", "tv"),
    ("SSE:600519", "Kweichow Moutai", "A-share", "tv"),
    ("SZSE:300750", "CATL", "A-share", "tv"),
    ("SSE:601318", "Ping An A", "A-share", "tv"),
    ("FX:USDCNY", "USD/CNY", "FX", "tv"),
    ("FX:USDCNH", "USD/CNH", "FX", "tv"),
    ("FX:USDHKD", "USD/HKD", "FX", "tv"),
    ("TVC:CN10Y", "China 10Y", "Govvy", "tv"),
    ("TVC:CN02Y", "China 2Y", "Govvy", "tv"),
    ("TVC:CN05Y", "China 5Y", "Govvy", "tv"),
    ("TVC:CN30Y", "China 30Y", "Govvy", "tv"),
    ("MYAGM2CNM189N", "China M2 YoY", "Macro", "fred"),
    ("CHNCPIALLMINMEI", "China CPI", "Macro", "fred"),
]

# ---------- Category 6: korea_japan_asean_india ----------
CATEGORIES["korea_japan_asean_india"] = [
    ("KRX:KOSPI", "KOSPI", "Index", "tv"),
    ("KRX:KOSDAQ", "KOSDAQ", "Index", "tv"),
    ("KRX:KOSPI200", "KOSPI 200", "Index", "tv"),
    ("KRX:VKOSPI", "VKOSPI", "Vol Index", "tv"),
    ("KRX:005930", "Samsung Electronics", "Equity", "tv"),
    ("KRX:000660", "SK Hynix", "Equity", "tv"),
    ("KRX:373220", "LG Energy Solution", "Equity", "tv"),
    ("KRX:207940", "Samsung Biologics", "Equity", "tv"),
    ("KRX:035420", "NAVER", "Equity", "tv"),
    ("KRX:005380", "Hyundai Motor", "Equity", "tv"),
    ("TVC:NI225", "Nikkei 225", "Index", "tv"),
    ("TSE:TOPIX", "TOPIX", "Index", "tv"),
    ("TVC:JPNK400", "JPX-Nikkei 400", "Index", "tv"),
    ("TSE:MOTHERS", "Mothers/Growth 250", "Index", "tv"),
    ("TVC:JPVIXC", "Nikkei VI", "Vol Index", "tv"),
    ("TSE:7203", "Toyota", "Equity", "tv"),
    ("TSE:6758", "Sony", "Equity", "tv"),
    ("TSE:9984", "SoftBank Group", "Equity", "tv"),
    ("TSE:6861", "Keyence", "Equity", "tv"),
    ("TSE:8306", "Mitsubishi UFJ", "Equity", "tv"),
    ("TSE:8035", "Tokyo Electron", "Equity", "tv"),
    ("TSE:9983", "Fast Retailing", "Equity", "tv"),
    ("TSE:6098", "Recruit", "Equity", "tv"),
    ("NSE:NIFTY", "NIFTY 50", "Index", "tv"),
    ("BSE:SENSEX", "SENSEX", "Index", "tv"),
    ("NSE:BANKNIFTY", "NIFTY Bank", "Index", "tv"),
    ("NSE:CNXIT", "NIFTY IT", "Index", "tv"),
    ("NSE:CNXAUTO", "NIFTY Auto", "Index", "tv"),
    ("NSE:CNXPHARMA", "NIFTY Pharma", "Index", "tv"),
    ("NSE:CNXFMCG", "NIFTY FMCG", "Index", "tv"),
    ("NSE:CNXMETAL", "NIFTY Metal", "Index", "tv"),
    ("NSE:CNXENERGY", "NIFTY Energy", "Index", "tv"),
    ("NSE:CNXREALTY", "NIFTY Realty", "Index", "tv"),
    ("NSE:NIFTY_MIDCAP_100", "NIFTY Midcap 100", "Index", "tv"),
    ("NSE:CNXSMALLCAP", "NIFTY Smallcap 100", "Index", "tv"),
    ("NSE:INDIAVIX", "India VIX", "Vol Index", "tv"),
    ("NSE:RELIANCE", "Reliance", "Equity", "tv"),
    ("NSE:TCS", "TCS", "Equity", "tv"),
    ("NSE:HDFCBANK", "HDFC Bank", "Equity", "tv"),
    ("NSE:INFY", "Infosys", "Equity", "tv"),
    ("NSE:ICICIBANK", "ICICI Bank", "Equity", "tv"),
    ("SGX:STI", "STI", "Index", "tv"),
    ("SGX:D05", "DBS", "Equity", "tv"),
    ("SGX:O39", "OCBC", "Equity", "tv"),
    ("SGX:U11", "UOB", "Equity", "tv"),
    ("MYX:FBMKLCI", "FBM KLCI", "Index", "tv"),
    ("MYX:1155", "Maybank", "Equity", "tv"),
    ("MYX:1295", "Public Bank", "Equity", "tv"),
    ("MYX:5347", "Tenaga", "Equity", "tv"),
    ("SET:SET", "SET Index", "Index", "tv"),
    ("SET:SET50", "SET 50", "Index", "tv"),
    ("SET:PTT", "PTT", "Equity", "tv"),
    ("SET:AOT", "AOT", "Equity", "tv"),
    ("SET:KBANK", "Kasikorn", "Equity", "tv"),
    ("PSE:PSEI", "PSEi", "Index", "tv"),
    ("PSE:SM", "SM Investments", "Equity", "tv"),
    ("PSE:BDO", "BDO", "Equity", "tv"),
    ("HOSE:VNINDEX", "VN-Index", "Index", "tv"),
    ("HOSE:VN30", "VN30", "Index", "tv"),
    ("HOSE:VIC", "Vingroup", "Equity", "tv"),
    ("HOSE:VCB", "Vietcombank", "Equity", "tv"),
    ("ASX:XJO", "ASX 200", "Index", "tv"),
    ("ASX:XKO", "ASX 300", "Index", "tv"),
    ("ASX:XMM", "ASX 300 Metals & Mining", "Index", "tv"),
    ("ASX:XFJ", "ASX 200 Financials", "Index", "tv"),
    ("ASX:BHP", "BHP", "Equity", "tv"),
    ("ASX:RIO", "Rio Tinto", "Equity", "tv"),
    ("ASX:CBA", "Commonwealth Bank", "Equity", "tv"),
    ("ASX:CSL", "CSL", "Equity", "tv"),
    ("TWSE:TAIEX", "TAIEX", "Index", "tv"),
    ("TWSE:2330", "TSMC", "Equity", "tv"),
    ("TWSE:2317", "Hon Hai", "Equity", "tv"),
    ("AMEX:EWJ", "iShares Japan", "ETF", "tv"),
    ("AMEX:EWY", "iShares Korea", "ETF", "tv"),
    ("BATS:INDA", "iShares India", "ETF", "tv"),
    ("AMEX:EWS", "iShares Singapore", "ETF", "tv"),
    ("AMEX:EWM", "iShares Malaysia", "ETF", "tv"),
    ("AMEX:THD", "iShares Thailand", "ETF", "tv"),
    ("AMEX:EPHE", "iShares Philippines", "ETF", "tv"),
    ("BATS:VNM", "VanEck Vietnam", "ETF", "tv"),
    ("AMEX:EWA", "iShares Australia", "ETF", "tv"),
    ("AMEX:EWT", "iShares Taiwan", "ETF", "tv"),
    ("NASDAQ:AAXJ", "iShares Asia ex-Japan", "ETF", "tv"),
    ("AMEX:EEM", "iShares EM", "ETF", "tv"),
    ("AMEX:VWO", "Vanguard EM", "ETF", "tv"),
]

# ---------- Category 7: europe_dm_latam ----------
CATEGORIES["europe_dm_latam"] = [
    ("TVC:SXXP", "STOXX Europe 600", "Index", "tv"),
    ("TVC:SX5E", "Euro Stoxx 50", "Index", "tv"),
    ("TVC:SX5P", "STOXX Europe 50", "Index", "tv"),
    ("EURONEXT:N100", "Euronext 100", "Index", "tv"),
    ("FTSE:SX7P", "STOXX 600 Banks", "Sector Index", "tv"),
    ("FTSE:SXAP", "STOXX 600 Auto", "Sector Index", "tv"),
    ("FTSE:SX8P", "STOXX 600 Tech", "Sector Index", "tv"),
    ("FTSE:SXEP", "STOXX 600 Energy", "Sector Index", "tv"),
    ("FTSE:SXDP", "STOXX 600 Healthcare", "Sector Index", "tv"),
    ("FTSE:SXPP", "STOXX 600 Basic Resources", "Sector Index", "tv"),
    ("XETR:DAX", "DAX 40", "Index", "tv"),
    ("XETR:MDAX", "MDAX", "Index", "tv"),
    ("XETR:TECDAX", "TecDAX", "Index", "tv"),
    ("XETR:SDAX", "SDAX", "Index", "tv"),
    ("EURONEXT:PX1", "CAC 40", "Index", "tv"),
    ("EURONEXT:CACMD", "CAC Mid 60", "Index", "tv"),
    ("FTSE:UKX", "FTSE 100", "Index", "tv"),
    ("FTSE:MCX", "FTSE 250", "Index", "tv"),
    ("FTSE:ASX", "FTSE All-Share", "Index", "tv"),
    ("FTSE:AXX", "FTSE AIM", "Index", "tv"),
    ("MIL:FTSEMIB", "FTSE MIB", "Index", "tv"),
    ("BME:IBC", "IBEX 35", "Index", "tv"),
    ("EURONEXT:AEX", "AEX", "Index", "tv"),
    ("EURONEXT:AMX", "AMX", "Index", "tv"),
    ("SIX:SMI", "SMI", "Index", "tv"),
    ("SIX:SLI", "SLI", "Index", "tv"),
    ("SIX:SPI", "SPI", "Index", "tv"),
    ("OMXSTO:OMXS30", "OMXS30", "Index", "tv"),
    ("OSL:OBX", "OBX", "Index", "tv"),
    ("OMXCOP:OMXC25", "OMXC25", "Index", "tv"),
    ("OMXHEX:OMXH25", "OMXH25", "Index", "tv"),
    ("EURONEXT:BEL20", "BEL 20", "Index", "tv"),
    ("VIE:ATX", "ATX", "Index", "tv"),
    ("EURONEXT:PSI20", "PSI 20", "Index", "tv"),
    ("ATHEX:GD", "ASE General", "Index", "tv"),
    ("GPW:WIG20", "WIG 20", "Index", "tv"),
    ("TVC:DE02Y", "Germany 2Y", "Govvy", "tv"),
    ("TVC:DE05Y", "Germany 5Y", "Govvy", "tv"),
    ("TVC:DE10Y", "Germany 10Y", "Govvy", "tv"),
    ("TVC:DE30Y", "Germany 30Y", "Govvy", "tv"),
    ("TVC:GB02Y", "UK 2Y", "Govvy", "tv"),
    ("TVC:GB10Y", "UK 10Y", "Govvy", "tv"),
    ("TVC:GB30Y", "UK 30Y", "Govvy", "tv"),
    ("TVC:FR10Y", "France 10Y", "Govvy", "tv"),
    ("TVC:IT10Y", "Italy 10Y", "Govvy", "tv"),
    ("TVC:ES10Y", "Spain 10Y", "Govvy", "tv"),
    ("TVC:GR10Y", "Greece 10Y", "Govvy", "tv"),
    ("TSX:TSX", "TSX Composite", "Index", "tv"),
    ("TSX:TX60", "TSX 60", "Index", "tv"),
    ("TSXV:JX", "TSX Venture", "Index", "tv"),
    ("TVC:CA10Y", "Canada 10Y", "Govvy", "tv"),
    ("BVMF:IBOV", "Bovespa", "Index", "tv"),
    ("BVMF:IBXX", "IBrX 100", "Index", "tv"),
    ("BMV:ME", "S&P/BMV IPC", "Index", "tv"),
    ("BCS:IPSA", "IPSA", "Index", "tv"),
    ("BVC:COLCAP", "COLCAP", "Index", "tv"),
    ("BVL:SPBLPGPT", "S&P/BVL Peru", "Index", "tv"),
    ("JSE:J203", "JSE All Share", "Index", "tv"),
    ("JSE:J200", "JSE Top 40", "Index", "tv"),
    ("BIST:XU100", "BIST 100", "Index", "tv"),
    ("BIST:XU030", "BIST 30", "Index", "tv"),
    ("TADAWUL:TASI", "Tadawul", "Index", "tv"),
    ("ADX:GENERAL", "ADX General", "Index", "tv"),
    ("DFM:GENERAL", "DFM General", "Index", "tv"),
    ("TASE:TA35", "TA-35", "Index", "tv"),
    ("TASE:TA125", "TA-125", "Index", "tv"),
    ("MOEX:IMOEX", "MOEX (sanctioned, gap post-2022)", "Index", "tv"),
    ("EGX:EGX30", "EGX 30", "Index", "tv"),
    ("AMEX:VGK", "Vanguard Europe ETF", "ETF", "tv"),
    ("AMEX:IEUR", "iShares Europe", "ETF", "tv"),
    ("AMEX:EZU", "iShares Eurozone", "ETF", "tv"),
    ("AMEX:EWG", "iShares Germany", "ETF", "tv"),
    ("AMEX:EWQ", "iShares France", "ETF", "tv"),
    ("AMEX:EWU", "iShares UK", "ETF", "tv"),
    ("AMEX:EWI", "iShares Italy", "ETF", "tv"),
    ("AMEX:EWP", "iShares Spain", "ETF", "tv"),
    ("AMEX:EWN", "iShares Netherlands", "ETF", "tv"),
    ("AMEX:EWL", "iShares Switzerland", "ETF", "tv"),
    ("AMEX:EWD", "iShares Sweden", "ETF", "tv"),
    ("AMEX:EWO", "iShares Austria", "ETF", "tv"),
    ("AMEX:EWZ", "iShares Brazil", "ETF", "tv"),
    ("AMEX:EWW", "iShares Mexico", "ETF", "tv"),
    ("AMEX:ECH", "iShares Chile", "ETF", "tv"),
    ("AMEX:GXG", "Global X Colombia", "ETF", "tv"),
    ("AMEX:EZA", "iShares South Africa", "ETF", "tv"),
    ("AMEX:TUR", "iShares Turkey", "ETF", "tv"),
    ("AMEX:KSA", "iShares Saudi Arabia", "ETF", "tv"),
    ("AMEX:EWC", "iShares Canada", "ETF", "tv"),
]

# ---------- Category 8: global_fx ----------
CATEGORIES["global_fx"] = [
    ("FRED:DTWEXBGS", "USD Broad TWI", "FX Index", "fred"),  # dedupe with us_macro DTWEXBGS
    ("TVC:BBDXY", "BBDXY", "FX Index", "tv"),
    ("TVC:EXY", "Euro Currency Index", "FX Index", "tv"),
    ("TVC:JXY", "Yen Currency Index", "FX Index", "tv"),
    ("TVC:BXY", "British Pound Index", "FX Index", "tv"),
    ("FX:EURUSD", "EUR/USD", "FX", "tv"),
    ("FX:GBPUSD", "GBP/USD", "FX", "tv"),
    ("FX:USDJPY", "USD/JPY", "FX", "tv"),
    ("FX:USDCHF", "USD/CHF", "FX", "tv"),
    ("FX:AUDUSD", "AUD/USD", "FX", "tv"),
    ("FX:NZDUSD", "NZD/USD", "FX", "tv"),
    ("FX:USDCAD", "USD/CAD", "FX", "tv"),
    ("FX:USDSEK", "USD/SEK", "FX", "tv"),
    ("FX:USDNOK", "USD/NOK", "FX", "tv"),
    ("FX:EURJPY", "EUR/JPY", "FX", "tv"),
    ("FX:EURGBP", "EUR/GBP", "FX", "tv"),
    ("FX:EURCHF", "EUR/CHF", "FX", "tv"),
    ("FX:EURNOK", "EUR/NOK", "FX", "tv"),
    ("FX:EURSEK", "EUR/SEK", "FX", "tv"),
    ("FX:EURAUD", "EUR/AUD", "FX", "tv"),
    ("FX:EURCAD", "EUR/CAD", "FX", "tv"),
    ("FX:GBPJPY", "GBP/JPY", "FX", "tv"),
    ("FX:GBPCHF", "GBP/CHF", "FX", "tv"),
    ("FX:AUDJPY", "AUD/JPY", "FX", "tv"),
    ("FX:NZDJPY", "NZD/JPY", "FX", "tv"),
    ("FX:CHFJPY", "CHF/JPY", "FX", "tv"),
    ("FX:AUDNZD", "AUD/NZD", "FX", "tv"),
    ("FX:AUDCAD", "AUD/CAD", "FX", "tv"),
    ("FX_IDC:USDIDR", "USD/IDR", "FX", "tv"),
    ("FX_IDC:USDCNY", "USD/CNY", "FX", "tv"),
    ("FX:USDCNH", "USD/CNH", "FX", "tv"),
    ("FX_IDC:USDHKD", "USD/HKD", "FX", "tv"),
    ("FX_IDC:USDKRW", "USD/KRW", "FX", "tv"),
    ("FX_IDC:USDTWD", "USD/TWD", "FX", "tv"),
    ("FX_IDC:USDINR", "USD/INR", "FX", "tv"),
    ("FX_IDC:USDTHB", "USD/THB", "FX", "tv"),
    ("FX_IDC:USDMYR", "USD/MYR", "FX", "tv"),
    ("FX_IDC:USDPHP", "USD/PHP", "FX", "tv"),
    ("FX:USDSGD", "USD/SGD", "FX", "tv"),
    ("FX_IDC:USDVND", "USD/VND", "FX", "tv"),
    ("FX_IDC:JPYKRW", "JPY/KRW", "FX", "tv"),
    ("FX:USDBRL", "USD/BRL", "FX", "tv"),
    ("FX:USDMXN", "USD/MXN", "FX", "tv"),
    ("FX_IDC:USDCLP", "USD/CLP", "FX", "tv"),
    ("FX_IDC:USDCOP", "USD/COP", "FX", "tv"),
    ("FX_IDC:USDPEN", "USD/PEN", "FX", "tv"),
    ("FX_IDC:USDARS", "USD/ARS", "FX", "tv"),
    ("FX:USDZAR", "USD/ZAR", "FX", "tv"),
    ("FX:USDTRY", "USD/TRY", "FX", "tv"),
    ("FX_IDC:USDRUB", "USD/RUB", "FX", "tv"),
    ("FX:USDPLN", "USD/PLN", "FX", "tv"),
    ("FX:USDHUF", "USD/HUF", "FX", "tv"),
    ("FX:USDCZK", "USD/CZK", "FX", "tv"),
    ("FX:USDILS", "USD/ILS", "FX", "tv"),
    ("FX_IDC:USDSAR", "USD/SAR (pegged)", "FX", "tv"),
    ("FX_IDC:USDAED", "USD/AED (pegged)", "FX", "tv"),
    ("TVC:CVIX", "DB FX Vol", "Vol Index", "tv"),
    ("AMEX:UUP", "Long-USD ETF", "ETF", "tv"),
    ("AMEX:UDN", "Short-USD ETF", "ETF", "tv"),
    ("AMEX:FXE", "Euro Trust", "ETF", "tv"),
    ("AMEX:FXY", "Yen Trust", "ETF", "tv"),
    ("AMEX:FXB", "Pound Trust", "ETF", "tv"),
    ("AMEX:FXF", "Swiss Franc Trust", "ETF", "tv"),
    ("AMEX:FXC", "Canadian Trust", "ETF", "tv"),
    ("AMEX:FXA", "Aussie Trust", "ETF", "tv"),
    ("AMEX:CYB", "Yuan ETF", "ETF", "tv"),
    ("AMEX:CEW", "EM FX ETF", "ETF", "tv"),
]

# ---------- Category 9: energy_commod ----------
CATEGORIES["energy_commod"] = [
    ("NYMEX:CL1!", "WTI", "Future", "tv"),
    ("ICEEUR:BRN1!", "Brent", "Future", "tv"),
    ("FX:USOIL", "WTI Spot", "Spot", "tv"),
    ("FX:UKOIL", "Brent Spot", "Spot", "tv"),
    ("TVC:USOIL", "WTI Cash", "Spot", "tv"),
    ("ICEEUR:DUB1!", "Dubai Crude", "Future", "tv"),
    ("NYMEX:HO1!", "Heating Oil", "Future", "tv"),
    ("NYMEX:RB1!", "Gasoline", "Future", "tv"),
    ("ICEEUR:G1!", "Gasoil", "Future", "tv"),
    ("NYMEX:NG1!", "Henry Hub", "Future", "tv"),
    ("FX:NATGAS", "Natgas Spot", "Spot", "tv"),
    ("ICEEUR:TFM1!", "TTF", "Future", "tv"),
    ("ICEEUR:NBP1!", "NBP", "Future", "tv"),
    ("SGX:JKM1!", "JKM LNG", "Future", "tv"),
    ("ICEEUR:ATW1!", "Newcastle Coal", "Future", "tv"),
    ("ICEEUR:ATR1!", "API2 Coal", "Future", "tv"),
    ("SGX:FFX1!", "Coking Coal", "Future", "tv"),
    ("AMEX:KOL", "Coal Miners ETF (delisted)", "ETF", "tv"),
    ("TVC:UXA1!", "Uranium U3O8", "Future", "tv"),
    ("AMEX:URA", "Uranium ETF", "ETF", "tv"),
    ("AMEX:URNM", "Sprott Uranium Miners", "ETF", "tv"),
    ("AMEX:URNJ", "Sprott Junior Uranium", "ETF", "tv"),
    ("NYSE:CCJ", "Cameco", "Equity", "tv"),
    ("ICEEUR:CFI2!", "EU Carbon", "Future", "tv"),
    ("AMEX:KRBN", "KraneShares Carbon", "ETF", "tv"),
    ("AMEX:GRN", "Carbon ETN", "ETN", "tv"),
    ("AMEX:USO", "US Oil Fund", "ETF", "tv"),
    ("AMEX:BNO", "US Brent Oil", "ETF", "tv"),
    ("AMEX:UNG", "US Natgas", "ETF", "tv"),
    ("AMEX:UGA", "US Gasoline", "ETF", "tv"),
    ("AMEX:DBE", "DB Energy", "ETF", "tv"),
    ("AMEX:XLE", "Energy Sector", "ETF", "tv"),
    ("AMEX:XOP", "E&P", "ETF", "tv"),
    ("AMEX:OIH", "Oil Services", "ETF", "tv"),
    ("AMEX:FCG", "Natgas ETF", "ETF", "tv"),
    ("AMEX:AMLP", "Alerian MLP", "ETF", "tv"),
    ("AMEX:TAN", "Solar", "ETF", "tv"),
    ("AMEX:ICLN", "Clean Energy", "ETF", "tv"),
]

# ---------- Category 10: metals_commod ----------
CATEGORIES["metals_commod"] = [
    ("OANDA:XAUUSD", "Gold Spot", "Spot", "tv"),
    ("TVC:GOLD", "Gold CFD", "Spot", "tv"),
    ("COMEX:GC1!", "Gold Futures", "Future", "tv"),
    ("AMEX:GLD", "Gold ETF", "ETF", "tv"),
    ("AMEX:IAU", "Gold ETF (alt)", "ETF", "tv"),
    ("OANDA:XAGUSD", "Silver Spot", "Spot", "tv"),
    ("COMEX:SI1!", "Silver Futures", "Future", "tv"),
    ("AMEX:SLV", "Silver ETF", "ETF", "tv"),
    ("AMEX:SIVR", "Silver ETF (alt)", "ETF", "tv"),
    ("OANDA:XPTUSD", "Platinum Spot", "Spot", "tv"),
    ("NYMEX:PL1!", "Platinum Futures", "Future", "tv"),
    ("AMEX:PPLT", "Platinum ETF", "ETF", "tv"),
    ("OANDA:XPDUSD", "Palladium Spot", "Spot", "tv"),
    ("NYMEX:PA1!", "Palladium Futures", "Future", "tv"),
    ("AMEX:PALL", "Palladium ETF", "ETF", "tv"),
    ("COMEX:HG1!", "Copper Futures", "Future", "tv"),
    ("AMEX:CPER", "Copper ETF", "ETF", "tv"),
    ("LME:CA1!", "LME Aluminum (use Stooq)", "Future", "stooq"),
    ("COMEX:ALI1!", "CME Aluminum", "Future", "tv"),
    ("LME:ZS1!", "LME Zinc (use Stooq)", "Future", "stooq"),
    ("LME:NI1!", "LME Nickel (use Stooq)", "Future", "stooq"),
    ("LME:SN1!", "LME Tin (use Stooq)", "Future", "stooq"),
    ("LME:PB1!", "LME Lead (use Stooq)", "Future", "stooq"),
    ("SGX:FEF1!", "Iron Ore SGX", "Future", "tv"),
    ("DCE:I1!", "DCE Iron Ore", "Future", "tv"),
    ("NYMEX:HRC1!", "US HRC Steel", "Future", "tv"),
    ("SHFE:RB1!", "China Rebar", "Future", "tv"),
    ("AMEX:SLX", "Steel ETF", "ETF", "tv"),
    ("AMEX:LIT", "Lithium ETF", "ETF", "tv"),
    ("NYSE:ALB", "Albemarle", "Equity", "tv"),
    ("NYSE:SQM", "SQM", "Equity", "tv"),
    ("AMEX:REMX", "Rare Earth ETF", "ETF", "tv"),
    ("NYSE:MP", "MP Materials", "Equity", "tv"),
    ("AMEX:GDX", "Gold Miners", "ETF", "tv"),
    ("AMEX:GDXJ", "Junior Gold Miners", "ETF", "tv"),
    ("AMEX:NUGT", "2x Gold Miners", "ETF", "tv"),
    ("AMEX:SIL", "Silver Miners", "ETF", "tv"),
    ("AMEX:SILJ", "Junior Silver", "ETF", "tv"),
    ("AMEX:COPX", "Copper Miners", "ETF", "tv"),
    ("AMEX:PICK", "Industrial Metals Miners", "ETF", "tv"),
    ("AMEX:XME", "Metals & Mining", "ETF", "tv"),
    ("NYSE:BHP", "BHP NYSE", "Equity", "tv"),  # will dedupe vs ASX:BHP — keep ASX, drop NYSE manually
    ("NYSE:RIO", "Rio Tinto NYSE", "Equity", "tv"),
    ("NYSE:VALE", "Vale", "Equity", "tv"),
    ("NYSE:FCX", "Freeport", "Equity", "tv"),
    ("NYSE:NEM", "Newmont", "Equity", "tv"),
    ("NYSE:GOLD", "Barrick", "Equity", "tv"),
    ("NYSE:AEM", "Agnico Eagle", "Equity", "tv"),
    ("NYSE:FNV", "Franco-Nevada", "Equity", "tv"),
    ("NYSE:WPM", "Wheaton", "Equity", "tv"),
]

# ---------- Category 11: agri_soft_commod ----------
CATEGORIES["agri_soft_commod"] = [
    ("CBOT:ZC1!", "Corn", "Future", "tv"),
    ("CBOT:ZW1!", "Wheat (SRW)", "Future", "tv"),
    ("CBOT:KE1!", "Wheat (HRW)", "Future", "tv"),
    ("CBOT:MW1!", "Wheat (HRS)", "Future", "tv"),
    ("CBOT:ZS1!", "Soybeans", "Future", "tv"),
    ("CBOT:ZL1!", "Soybean Oil", "Future", "tv"),
    ("CBOT:ZM1!", "Soybean Meal", "Future", "tv"),
    ("CBOT:ZO1!", "Oats", "Future", "tv"),
    ("CBOT:ZR1!", "Rough Rice", "Future", "tv"),
    ("ICE:SB1!", "Sugar #11", "Future", "tv"),
    ("ICE:SF1!", "Sugar #5", "Future", "tv"),
    ("ICE:KC1!", "Coffee Arabica", "Future", "tv"),
    ("ICE:RC1!", "Coffee Robusta", "Future", "tv"),
    ("ICE:CC1!", "Cocoa", "Future", "tv"),
    ("ICE:CT1!", "Cotton", "Future", "tv"),
    ("ICE:OJ1!", "OJ", "Future", "tv"),
    ("CME:LBR1!", "Lumber", "Future", "tv"),
    ("CME:LE1!", "Live Cattle", "Future", "tv"),
    ("CME:HE1!", "Lean Hogs", "Future", "tv"),
    ("CME:GF1!", "Feeder Cattle", "Future", "tv"),
    ("CME:DC1!", "Class III Milk", "Future", "tv"),
    ("BMFBOVESPA:FCPO1!", "Palm Oil", "Future", "tv"),
    ("SGX:TF1!", "Rubber TSR20", "Future", "tv"),
    ("AMEX:DBA", "DB Agri", "ETF", "tv"),
    ("AMEX:DBC", "DB Commodity", "ETF", "tv"),
    ("AMEX:GSG", "GSCI", "ETF", "tv"),
    ("NYSE:COMT", "iShares GSCI", "ETF", "tv"),
    ("AMEX:CORN", "Corn ETF", "ETF", "tv"),
    ("AMEX:WEAT", "Wheat ETF", "ETF", "tv"),
    ("AMEX:SOYB", "Soybean ETF", "ETF", "tv"),
    ("AMEX:CANE", "Sugar ETF", "ETF", "tv"),
    ("NYSE:JO", "Coffee ETN", "ETN", "tv"),
    ("AMEX:BAL", "Cotton ETN", "ETN", "tv"),
    ("NYSE:MOO", "Agribusiness", "ETF", "tv"),
]

# ---------- Category 12: crypto ----------
CATEGORIES["crypto"] = [
    ("BITSTAMP:BTCUSD", "Bitcoin", "Crypto", "tv"),
    ("BITSTAMP:ETHUSD", "Ethereum", "Crypto", "tv"),
    ("BINANCE:SOLUSDT", "Solana", "Crypto", "tv"),
    ("BINANCE:BNBUSDT", "BNB", "Crypto", "tv"),
    ("BINANCE:XRPUSDT", "XRP", "Crypto", "tv"),
    ("BINANCE:ADAUSDT", "Cardano", "Crypto", "tv"),
    ("BINANCE:AVAXUSDT", "Avalanche", "Crypto", "tv"),
    ("BINANCE:DOTUSDT", "Polkadot", "Crypto", "tv"),
    ("BINANCE:LINKUSDT", "Chainlink", "Crypto", "tv"),
    ("BINANCE:DOGEUSDT", "Dogecoin", "Crypto", "tv"),
    ("BINANCE:TRXUSDT", "TRON", "Crypto", "tv"),
    ("BINANCE:NEARUSDT", "NEAR", "Crypto", "tv"),
    ("BINANCE:ARBUSDT", "Arbitrum", "Crypto", "tv"),
    ("BINANCE:OPUSDT", "Optimism", "Crypto", "tv"),
    ("BINANCE:UNIUSDT", "Uniswap", "Crypto", "tv"),
    ("BINANCE:AAVEUSDT", "Aave", "Crypto", "tv"),
    ("CRYPTOCAP:BTC.D", "BTC Dominance", "Dominance", "tv"),
    ("CRYPTOCAP:ETH.D", "ETH Dominance", "Dominance", "tv"),
    ("CRYPTOCAP:TOTAL", "Total Mcap", "Cap", "tv"),
    ("CRYPTOCAP:TOTAL3", "Total ex-BTC ex-ETH", "Cap", "tv"),
    ("CRYPTOCAP:USDT.D", "Stablecoin Dominance", "Dominance", "tv"),
    ("NASDAQ:IBIT", "iShares BTC Trust", "ETF", "tv"),
    ("AMEX:FBTC", "Fidelity BTC", "ETF", "tv"),
    ("AMEX:GBTC", "Grayscale BTC", "ETF", "tv"),
    ("NASDAQ:ETHA", "iShares ETH Trust", "ETF", "tv"),
    ("NASDAQ:COIN", "Coinbase", "Equity", "tv"),
    ("NASDAQ:MSTR", "MicroStrategy", "Equity", "tv"),
    ("NASDAQ:MARA", "Marathon", "Equity", "tv"),
    ("NASDAQ:RIOT", "Riot", "Equity", "tv"),
    ("CME:BTC1!", "CME BTC Futures", "Future", "tv"),
    ("CME:ETH1!", "CME ETH Futures", "Future", "tv"),
]

# Items to forcibly drop (premium / known unusable / explicit dedupe overrides)
EXPLICIT_DROP = {
    # No yf=None mapping AND no FRED equivalent? Most are 'tv' — they'll just fail
    # at fetch and log; we don't drop them here. Premium ones already removed.

    # Manual dedupe rules per spec:
    # cat 10 metals: drop NYSE:BHP / NYSE:RIO since ASX primary kept.
    "NYSE:BHP",
    "NYSE:RIO",

    # cat 8 has FRED:DTWEXBGS as alias — drop, keep cat-2 DTWEXBGS as canonical
    "FRED:DTWEXBGS",
}


def build() -> dict:
    root = Path(__file__).resolve().parents[1]
    log_dir = root / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    dedup_log = log_dir / "dedupe.log"

    seen: dict[str, str] = {}     # id -> first-seen category
    series: list[dict] = []
    duplicates: list[str] = []
    dropped_premium: list[str] = []
    dropped_explicit: list[str] = []

    for cat_name, rows in CATEGORIES.items():
        for row in rows:
            sid = row[0]
            name = row[1]
            sub = row[2] if len(row) > 2 else None
            src = row[3] if len(row) > 3 else "tv"
            start = row[4] if len(row) > 4 else None

            if src == "premium":
                dropped_premium.append(f"{cat_name}\t{sid}\t{name}")
                continue
            if sid in EXPLICIT_DROP:
                dropped_explicit.append(f"{cat_name}\t{sid}\t{name}\texplicit-drop")
                continue
            if sid in seen:
                duplicates.append(f"{cat_name}\t{sid}\t(first seen in {seen[sid]})")
                continue
            seen[sid] = cat_name

            yf_sym = _yf_for(sid, src)
            ret = _ret_for(sid, src, sub)

            entry = {
                "id": sid,
                "name": name,
                "yf": yf_sym,
                "src": src,
                "cat": cat_name,
                "sub": sub,
                "ret": ret,
            }
            if start is not None:
                entry["start"] = start
            series.append(entry)

    # Per-category counts after dedup
    cat_counts: dict[str, int] = {}
    for s in series:
        cat_counts[s["cat"]] = cat_counts.get(s["cat"], 0) + 1

    # Write dedupe log
    with dedup_log.open("w", encoding="utf-8") as f:
        f.write(f"# dedupe log (generated {date.today()})\n")
        f.write(f"# total kept: {len(series)}\n")
        f.write(f"# duplicates removed: {len(duplicates)}\n")
        f.write(f"# premium dropped: {len(dropped_premium)}\n")
        f.write(f"# explicit drops: {len(dropped_explicit)}\n\n")
        f.write("## DUPLICATES\n")
        for line in duplicates:
            f.write(line + "\n")
        f.write("\n## PREMIUM DROPPED\n")
        for line in dropped_premium:
            f.write(line + "\n")
        f.write("\n## EXPLICIT DROPS\n")
        for line in dropped_explicit:
            f.write(line + "\n")

    catalog = {
        "meta": {
            "version": "1.0",
            "created": date.today().isoformat(),
            "start_date": "2011-01-01",
            "frequencies": ["weekly", "monthly"],
            "total_series": len(series),
            "categories": cat_counts,
        },
        "series": series,
    }

    out = root / "catalog" / "universe.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}: {len(series)} series, {len(duplicates)} duplicates skipped")
    print(f"Per-category counts: {cat_counts}")
    return catalog


if __name__ == "__main__":
    build()
