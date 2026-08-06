"""IDX (Indonesia Stock Exchange) daily foreign flow.

Primary: IDX GetStockSummary endpoint (used by idx.co.id's own frontend).
It is sometimes Cloudflare-gated from datacenter IPs; we retry with browser
headers and record honest failure if blocked (freshness will flag it).

Writes per-stock rows AND a market aggregate row (ticker='_market') into
mkt.flow, plus the aggregate into mkt.observation as id.flow.foreign
(net foreign buy in IDR billions).
"""
from __future__ import annotations

import datetime as dt
import gzip
import io
import json
import time
import urllib.request

from .. import db

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip",
    "Referer": "https://www.idx.co.id/en/market-data/trading-summary/stock-summary/",
    "Origin": "https://www.idx.co.id",
}

URL = ("https://www.idx.co.id/primary/TradingSummary/GetStockSummary"
       "?length=9999&start=0&date={date}")


def fetch_day(date: dt.date) -> list[dict]:
    url = URL.format(date=date.strftime("%Y%m%d"))
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
    data = json.loads(raw.decode("utf-8", errors="replace"))
    return data.get("data", []) or []


def run(days_back: int = 7) -> int:
    total = 0
    today = dt.date.today()
    for offset in range(days_back):
        day = today - dt.timedelta(days=offset)
        if day.weekday() >= 5:
            continue
        try:
            rows = fetch_day(day)
        except Exception as e:
            print(f"  idx {day} fetch failed: {e}")
            continue
        if not rows:
            continue
        flow_rows, net_sum, value_sum = [], 0.0, 0.0
        for r in rows:
            code = (r.get("StockCode") or "").strip()
            if not code:
                continue
            fb = float(r.get("ForeignBuy") or 0)
            fs = float(r.get("ForeignSell") or 0)
            val = float(r.get("Value") or 0)
            net = fb - fs
            net_sum += net
            value_sum += val
            flow_rows.append({
                "date": day.isoformat(), "market": "idx", "ticker": code,
                "foreign_buy": fb, "foreign_sell": fs, "net": net, "value_total": val,
            })
        flow_rows.append({
            "date": day.isoformat(), "market": "idx", "ticker": "_market",
            "foreign_buy": None, "foreign_sell": None, "net": net_sum, "value_total": value_sum,
        })
        total += db.upsert("mkt", "flow", flow_rows, on_conflict="date,market,ticker", chunk=1000)
        db.upsert("mkt", "observation", [{
            "series_key": "id.flow.foreign", "date": day.isoformat(),
            "value": net_sum / 1e9,  # IDR billions
        }], on_conflict="series_key,date")
        time.sleep(1.5)
    return total
