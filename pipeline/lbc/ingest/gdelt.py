"""GDELT 2.0 DOC API: news volume per desk entity set (keyless).

We track article volume (volume beats sentiment) per desk using a query built
from desk names + representative entities. Writes signals-ready volume series
into mkt.observation under news.vol.<desk_id>.
"""
from __future__ import annotations

import datetime as dt
import json
import time
import urllib.parse
import urllib.request

from .. import db

UA = {"User-Agent": "lbc-research-pipeline/1.0"}

DESK_QUERIES = {
    "oil-gas": '"oil prices" OR OPEC OR "crude oil"',
    "coal-power-fuels": '"thermal coal" OR "coal price" OR "coal export"',
    "precious-metals": '"gold price" OR "gold miners" OR bullion',
    "base-battery-bulk": '"copper price" OR nickel OR "iron ore"',
    "agri-food": '"palm oil" OR soybean OR "grain prices"',
    "chemicals-materials": 'petrochemical OR "chemical industry"',
    "transport-logistics": '"container shipping" OR "freight rates"',
    "autos-mobility": '"electric vehicle" sales OR "auto sales"',
    "automation-machinery": '"machine tool" OR "factory automation" OR robotics',
    "semiconductors": 'semiconductor OR TSMC OR "chip maker"',
    "ai-compute": '"artificial intelligence" datacenter OR Nvidia OR "AI chips"',
    "grid-infrastructure": '"power grid" OR "electricity demand" OR transformer shortage',
    "aerospace-defense": 'defense spending OR "fighter jet" OR Lockheed OR Airbus',
    "software-cyber": 'cybersecurity breach OR "enterprise software"',
    "platforms-ads-gaming": '"digital advertising" OR Tencent OR Meta platforms',
    "healthcare-lifesci": 'pharmaceutical OR "drug approval" OR "clinical trial"',
    "consumer-brands": '"consumer spending" OR "luxury goods"',
    "financial-infrastructure": '"interest rates" banks OR "payment networks"',
    "us": '"Federal Reserve" OR "US economy"',
    "china-hk-taiwan": '"China economy" OR "China stimulus" OR PBOC',
    "japan-korea": '"Bank of Japan" OR "Korea exports" OR yen',
    "eurozone": 'ECB OR "eurozone economy"',
    "indonesia": 'Indonesia economy OR "Bank Indonesia" OR rupiah',
}


def fetch_volume(query: str, retries: int = 3) -> list[tuple[str, float]]:
    """timelinevol: daily volume (% of all articles) for last 3 months.

    GDELT requires OR'd terms wrapped in parens, and rate-limits aggressively;
    we pace ~6s between desks and back off on 429.
    """
    if " OR " in query and not query.strip().startswith("("):
        query = f"({query})"
    params = urllib.parse.urlencode({
        "query": query, "mode": "timelinevol", "format": "json", "timespan": "3months",
    })
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?{params}"
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode("utf-8", errors="replace")
            d = json.loads(body)
            out = []
            for tl in d.get("timeline", []):
                for pt in tl.get("data", []):
                    date = pt.get("date", "")[:8]
                    if len(date) == 8:
                        out.append((f"{date[:4]}-{date[4:6]}-{date[6:8]}", float(pt.get("value", 0))))
            return out
        except Exception as e:
            last = e
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"gdelt fetch failed: {last}")


def run() -> int:
    total = 0
    series_rows = []
    for desk_id in DESK_QUERIES:
        series_rows.append({
            "key": f"news.vol.{desk_id}", "label": f"News volume: {desk_id}",
            "country": "global", "category": "news", "unit": "%", "freq": "d",
            "source": "gdelt", "source_id": DESK_QUERIES[desk_id][:180],
        })
    db.upsert("mkt", "series", series_rows, on_conflict="key")
    for desk_id, q in DESK_QUERIES.items():
        try:
            obs = fetch_volume(q)
        except Exception as e:
            print(f"  gdelt {desk_id} failed: {e}")
            continue
        rows = [{"series_key": f"news.vol.{desk_id}", "date": d, "value": v} for d, v in obs]
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=1000)
        time.sleep(6)
    return total
