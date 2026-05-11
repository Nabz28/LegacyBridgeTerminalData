"""Curated 11 prebuilt template universes.

Each template lists candidate IDs in priority order. Missing IDs are
silently dropped at startup (logged once via app.py). All IDs use the
canonical exchange-prefixed form found in correlation/catalog/universe.json.
"""

from __future__ import annotations

TEMPLATES: dict[str, dict] = {
    "us_macro_xa": {
        "display": "US Macro Cross-Asset",
        "emoji": "🇺🇸",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "AMEX:SPY", "NASDAQ:QQQ", "NASDAQ:TLT", "NASDAQ:IEF",
            "AMEX:GLD", "CBOE:VIX", "TVC:DXY", "TVC:US10Y",
            "DFII10", "AMEX:HYG", "AMEX:LQD",
            "NYMEX:CL1!", "COMEX:HG1!", "TVC:US02Y", "TVC:US10YIE",
            "AMEX:XLF", "AMEX:XLE", "AMEX:XLK", "AMEX:IWM",
        ],
    },
    "indo_domestic": {
        "display": "Indonesia Domestic",
        "emoji": "🇮🇩",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "IDX:COMPOSITE", "IDX:LQ45",
            "IDX:IDXENERGY", "IDX:IDXBASIC", "IDX:IDXINDUST",
            "IDX:IDXNONCYC", "IDX:IDXCYCLIC", "IDX:IDXHEALTH",
            "IDX:IDXFINANCE", "IDX:IDXPROPERT", "IDX:IDXTECHNO",
            "IDX:IDXINFRA",
            "IDX:BBCA", "IDX:BBRI", "IDX:BMRI", "IDX:TLKM",
            "IDX:ASII", "IDX:UNVR", "IDX:ICBP", "IDX:ADRO",
            "FX_IDC:USDIDR", "TVC:ID10Y",
            "MYX:FCPO1!",
        ],
    },
    "indo_xborder": {
        "display": "Indonesia Cross-Border",
        "emoji": "🇮🇩",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "FX_IDC:USDIDR", "IDX:COMPOSITE",
            "KRX:KOSPI", "NSE:NIFTY", "SGX:STI", "MYX:FBMKLCI",
            "TVC:US10Y", "TVC:DXY",
            "MYX:FCPO1!",
            "ICEEUR:ATW1!",
            "IDX:INCO",
            "AMEX:GLD",
        ],
    },
    "china_hk": {
        "display": "China + HK",
        "emoji": "🇨🇳",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "SSE:000001", "SSE:000300", "SZSE:399001", "SZSE:399006",
            "HKEX:HSI", "HKEX:HSTECH", "HKEX:HSCEI",
            "AMEX:KWEB", "AMEX:FXI", "AMEX:MCHI", "AMEX:ASHR",
            "FX:USDCNH",
            "NYSE:BABA", "NASDAQ:JD", "NASDAQ:PDD", "NASDAQ:BIDU",
            "HKEX:0700", "HKEX:9988", "HKEX:3690",
        ],
    },
    "asia_beta": {
        "display": "Asia Beta",
        "emoji": "🌏",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "KRX:KOSPI", "NSE:NIFTY", "TVC:NI225", "IDX:COMPOSITE",
            "ASX:XJO", "HKEX:HSI", "SGX:STI",
            "FX_IDC:USDKRW", "FX_IDC:USDINR", "FX:USDJPY",
            "FX_IDC:USDIDR", "FX_IDC:USDCNY",
        ],
    },
    "g10_em_fx": {
        "display": "G10 + EM FX",
        "emoji": "💱",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "TVC:DXY",
            "FX:EURUSD", "FX:GBPUSD", "FX:USDJPY", "FX:AUDUSD", "FX:USDCAD",
            "FX:USDCHF", "FX:NZDUSD",
            "FX_IDC:USDIDR", "FX:USDCNH", "FX_IDC:USDKRW", "FX_IDC:USDINR",
            "FX:USDBRL", "FX:USDZAR", "FX:USDTRY", "FX_IDC:USDRUB",
        ],
    },
    "commodities": {
        "display": "Commodities",
        "emoji": "🛢️",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "NYMEX:CL1!", "ICEEUR:BRN1!", "NYMEX:NG1!",
            "OANDA:XAUUSD", "OANDA:XAGUSD", "COMEX:HG1!",
            "SGX:FEF1!",
            "CBOT:ZS1!", "CBOT:ZC1!", "CBOT:ZW1!",
            "ICE:SB1!", "ICE:KC1!", "ICE:CT1!",
            "MYX:FCPO1!",
        ],
    },
    "risk_factors": {
        "display": "Risk Factors",
        "emoji": "📈",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "TVC:SPX", "CBOE:VIX", "AMEX:HYG", "NASDAQ:IEF",
            "AMEX:EEM", "BITSTAMP:BTCUSD", "FX:AUDJPY", "FX:USDJPY",
            "TVC:DXY", "AMEX:GLD",
        ],
    },
    "europe_xa": {
        "display": "Europe Cross-Asset",
        "emoji": "🇪🇺",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "TVC:SXXP", "TVC:SX5E", "XETR:DAX", "FTSE:UKX",
            "EURONEXT:PX1", "BME:IBC", "MIL:FTSEMIB",
            "TVC:DE10Y", "TVC:IT10Y", "TVC:GB10Y", "TVC:FR10Y",
            "FX:EURUSD", "AMEX:EZU",
        ],
    },
    "energy_transition": {
        "display": "Energy Transition",
        "emoji": "⚡",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "AMEX:URA", "AMEX:URNM", "AMEX:LIT", "NYSE:ALB",
            "AMEX:TAN", "AMEX:ICLN", "NYSE:MP", "AMEX:REMX",
            "NYMEX:CL1!", "NYMEX:NG1!", "COMEX:HG1!",
        ],
    },
    "crypto_equity": {
        "display": "Crypto + Equity Beta",
        "emoji": "🪙",
        "freq": "w",
        "method": "pearson",
        "ids": [
            "BITSTAMP:BTCUSD", "BITSTAMP:ETHUSD", "BINANCE:SOLUSDT",
            "NASDAQ:COIN", "NASDAQ:MSTR", "NASDAQ:MARA", "NASDAQ:RIOT",
            "AMEX:SPY", "NASDAQ:QQQ", "NASDAQ:NDX", "AMEX:ARKK",
        ],
    },
}


def filter_template_ids(name: str, available: set[str]) -> tuple[list[str], list[str]]:
    """Return (kept_ids, skipped_ids) preserving listed order."""
    spec = TEMPLATES[name]
    kept, skipped = [], []
    for sid in spec["ids"]:
        if sid in available:
            kept.append(sid)
        else:
            skipped.append(sid)
    return kept, skipped
