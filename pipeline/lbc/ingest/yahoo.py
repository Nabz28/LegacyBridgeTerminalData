"""Yahoo Finance ingestion via yfinance: registered macro-ish series (futures, FX,
indexes) into mkt.observation, and desk-basket equity OHLCV into mkt.price.
"""
from __future__ import annotations

import datetime as dt
import math
import time

from .. import db
from ..registry import SERIES


def _yf():
    import yfinance as yf
    return yf


def _clean(v):
    try:
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


def run_series(days_back: int = 120, full: bool = False) -> int:
    """Ingest yahoo-source registry series (close only) into mkt.observation."""
    yf = _yf()
    symbols = [(s[0], s[7]) for s in SERIES if s[6] == "yahoo"]
    period = "max" if full else f"{max(days_back, 5)}d"
    total = 0
    tickers = " ".join(sym for _, sym in symbols)
    data = yf.download(tickers, period=period, interval="1d", group_by="ticker",
                       auto_adjust=False, threads=True, progress=False)
    for key, sym in symbols:
        try:
            frame = data[sym] if len(symbols) > 1 else data
            closes = frame["Close"].dropna()
        except Exception:
            closes = None
        if closes is None or len(closes) == 0:
            # some symbols (e.g. CNH=X) reject period=max; retry bounded
            try:
                frame = yf.download(sym, period="10y" if full else period, interval="1d",
                                    auto_adjust=False, threads=False, progress=False)
                closes = frame["Close"].dropna()
                if hasattr(closes, "columns"):  # single-ticker multiindex quirk
                    closes = closes.iloc[:, 0].dropna()
            except Exception:
                continue
        rows = []
        for ts, v in closes.items():
            v = _clean(v)
            if v is None:
                continue
            rows.append({"series_key": key, "date": ts.date().isoformat(), "value": v})
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=2000)
    return total


def run_prices(tickers: list[str], days_back: int = 30, full: bool = False,
               batch: int = 40) -> int:
    """Ingest daily OHLCV for the given tickers into mkt.price."""
    yf = _yf()
    period = "max" if full else f"{max(days_back, 5)}d"
    total = 0
    for i in range(0, len(tickers), batch):
        part = tickers[i:i + batch]
        data = yf.download(" ".join(part), period=period, interval="1d",
                           group_by="ticker", auto_adjust=False, threads=True, progress=False)
        for t in part:
            try:
                frame = data[t] if len(part) > 1 else data
            except Exception:
                continue
            rows = []
            for ts, row in frame.iterrows():
                close = _clean(row.get("Close"))
                if close is None:
                    continue
                rows.append({
                    "ticker": t,
                    "date": ts.date().isoformat(),
                    "open": _clean(row.get("Open")),
                    "high": _clean(row.get("High")),
                    "low": _clean(row.get("Low")),
                    "close": close,
                    "volume": _clean(row.get("Volume")),
                    "adj_close": _clean(row.get("Adj Close")),
                })
            if rows:
                total += db.upsert("mkt", "price", rows, on_conflict="ticker,date", chunk=2000)
        time.sleep(1.0)
    return total


def asia_tickers(all_map: dict[str, str]) -> list[str]:
    suffixes = (".JK", ".T", ".HK", ".KS", ".SI", ".KL", ".TW", ".SS", ".SZ", ".AX", ".BK")
    return [t for t in all_map if t.endswith(suffixes) or t in ("^JKSE", "^HSI", "^TWII", "^N225", "^KS11", "000300.SS")]


def western_tickers(all_map: dict[str, str]) -> list[str]:
    asia = set(asia_tickers(all_map))
    return [t for t in all_map if t not in asia]
