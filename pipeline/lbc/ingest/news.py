"""News ingestion: RSS across global + Indonesian sources, routed to desks.

Routing is keyword/ticker based (deterministic, auditable), sentiment is a
finance-tuned lexicon score. No LLM in this path: it runs every few hours over
hundreds of items and must stay cheap and reproducible. The LLM reads the
routed, scored output.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import html as html_lib
import re
import urllib.request
import xml.etree.ElementTree as ET

from .. import db

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) lbc-research"}

FEEDS = [
    # (source label, url, region) — verified reachable 2026-08-07
    ("CNBC Top", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", "us"),
    ("CNBC Markets", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135", "us"),
    ("CNBC Economy", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", "us"),
    ("CNBC Energy", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19836768", "global"),
    ("CNBC Asia", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19832390", "asia"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex", "global"),
    ("Investing Commodities", "https://www.investing.com/rss/news_11.rss", "global"),
    ("Investing Forex", "https://www.investing.com/rss/news_1.rss", "global"),
    ("Investing Economy", "https://www.investing.com/rss/news_14.rss", "global"),
    ("Investing Stocks", "https://www.investing.com/rss/news_25.rss", "global"),
    ("Kontan Investasi", "https://investasi.kontan.co.id/rss", "id"),
    ("Kontan Industri", "https://industri.kontan.co.id/rss", "id"),
    ("Kontan Nasional", "https://nasional.kontan.co.id/rss", "id"),
    ("Antara Ekonomi", "https://www.antaranews.com/rss/ekonomi.xml", "id"),
    ("Tempo Bisnis", "https://rss.tempo.co/bisnis", "id"),
]

# desk_id -> keywords (lowercase, matched on headline+summary)
DESK_KEYWORDS = {
    "oil-gas": ["oil price", "crude", "opec", "brent", "wti", "refinery", "lng", "natural gas", "minyak", "gas bumi"],
    "coal-power-fuels": ["coal", "thermal coal", "uranium", "batu bara", "batubara", "hba", "pltu"],
    "precious-metals": ["gold", "silver", "bullion", "emas", "perak", "gold miner"],
    "base-battery-bulk": ["copper", "nickel", "aluminium", "aluminum", "iron ore", "lithium", "steel", "tembaga", "nikel", "baja", "smelter"],
    "agri-food": ["palm oil", "cpo", "soybean", "wheat", "corn", "fertilizer", "sawit", "pangan", "beras"],
    "chemicals-materials": ["petrochemical", "chemical", "ethylene", "polymer", "petrokimia", "kimia"],
    "transport-logistics": ["shipping", "freight", "container", "logistics", "seaport", "railroad", "airline", "pelayaran", "logistik"],
    "autos-mobility": ["automaker", "electric vehicle", "ev sales", "car sales", "otomotif", "mobil listrik"],
    "automation-machinery": ["machinery", "industrial robot", "automation", "machine tool", "capital goods"],
    "semiconductors": ["semiconductor", "chip", "foundry", "tsmc", "wafer", "memory chip", "dram", "nand"],
    "ai-compute": ["artificial intelligence", " ai ", "data center", "datacenter", "nvidia", "gpu", "cloud capex"],
    "grid-infrastructure": ["power grid", "electricity", "transmission", "utility", "renewable", "listrik", "pln"],
    "aerospace-defense": ["defense", "defence", "aerospace", "aircraft", "missile", "satellite", "pertahanan"],
    "software-cyber": ["software", "cybersecurity", "cyber attack", "saas", "enterprise software"],
    "platforms-ads-gaming": ["advertising", "social media", "gaming", "e-commerce", "platform", "streaming"],
    "healthcare-lifesci": ["pharma", "drug", "fda", "clinical trial", "biotech", "medical device", "farmasi", "rumah sakit"],
    "consumer-brands": ["consumer goods", "retail sales", "luxury", "beverage", "fmcg", "konsumen", "ritel"],
    "financial-infrastructure": ["bank", "payments", "exchange", "insurance", "fintech", "perbankan", "bank indonesia"],
    "us": ["federal reserve", "fomc", "u.s. economy", "us economy", "treasury yield", "powell"],
    "china-hk-taiwan": ["china", "beijing", "pboc", "hong kong", "taiwan", "yuan", "tiongkok"],
    "japan-korea": ["japan", "bank of japan", "yen", "korea", "won", "jepang", "korea"],
    "eurozone": ["ecb", "eurozone", "euro area", "germany", "european central bank"],
    "indonesia": ["indonesia", "rupiah", "ihsg", "jakarta", "ojk", "bi rate", "idx", "prabowo", "apbn"],
}

POSITIVE = {
    "surge", "surges", "jump", "jumps", "rally", "rallies", "gain", "gains", "rise", "rises",
    "beat", "beats", "record", "growth", "grow", "upgrade", "upgraded", "boost", "boosts",
    "strong", "stronger", "profit", "profits", "expand", "expands", "recovery", "optimism",
    "naik", "menguat", "melonjak", "untung", "tumbuh", "positif", "rekor", "cuan",
}
NEGATIVE = {
    "plunge", "plunges", "fall", "falls", "drop", "drops", "slump", "slumps", "decline",
    "declines", "loss", "losses", "miss", "misses", "cut", "cuts", "downgrade", "downgraded",
    "weak", "weaker", "warning", "warns", "risk", "risks", "crisis", "fear", "fears",
    "layoff", "layoffs", "probe", "lawsuit", "default", "recession", "selloff", "sell-off",
    "turun", "melemah", "anjlok", "rugi", "merosot", "negatif", "tekanan", "ambruk", "koreksi",
}


def _get(url: str, timeout: int = 40) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _text(el) -> str:
    return html_lib.unescape((el.text or "").strip()) if el is not None else ""


def _strip(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def _parse_date(s: str) -> dt.datetime:
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            d = dt.datetime.strptime(s.strip(), fmt)
            return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
        except (ValueError, TypeError):
            continue
    return dt.datetime.now(dt.timezone.utc)


def sentiment(text: str) -> tuple[float, str]:
    words = set(re.findall(r"[a-zA-Z]+", text.lower()))
    pos = len(words & POSITIVE)
    neg = len(words & NEGATIVE)
    if pos == neg == 0:
        return 0.0, "neutral"
    score = (pos - neg) / (pos + neg)
    label = "bullish" if score > 0.2 else ("bearish" if score < -0.2 else "neutral")
    return round(score, 3), label


_KEYWORD_RE = {
    desk: re.compile("|".join(rf"\b{re.escape(k.strip())}\b" for k in kws), re.IGNORECASE)
    for desk, kws in DESK_KEYWORDS.items()
}


def route(text: str, ticker_map: dict[str, str],
          names: dict[str, str] | None = None) -> tuple[list[str], list[str]]:
    """Word-boundary matching only. Substring matching routes every story
    containing "reports" to the transport desk, which poisons desk sentiment.

    Headlines name companies, not symbols ("Micron", not "MU"), so company
    short names are matched alongside tickers.
    """
    desks = [d for d, rx in _KEYWORD_RE.items() if rx.search(text)]
    tickers = []
    for tkr, desk in ticker_map.items():
        base = tkr.split(".")[0]
        # Symbols of three letters or fewer are ordinary words too: ICE is an
        # exchange and an engine, MBG is Mercedes and an Indonesian food
        # programme. Those must be identified by company name, never by symbol.
        hit = False
        if len(base) >= 4 and base.isalpha() and re.search(rf"\b{re.escape(base)}\b", text):
            hit = True
        if not hit and names:
            nm = names.get(tkr)
            if nm and len(nm) >= 5 and re.search(rf"\b{re.escape(nm)}\b", text, re.IGNORECASE):
                hit = True
        if hit:
            tickers.append(tkr)
            if desk and desk not in desks:
                desks.append(desk)
    return desks, tickers[:8]


def run(max_per_feed: int = 40) -> int:
    from . import names as names_mod

    ticker_map = {r["ticker"]: r["desk_id"]
                  for r in db.select("mkt", "instrument", "select=ticker,desk_id&active=eq.true")}
    try:
        name_map = names_mod.name_map()
    except Exception:
        name_map = {}
    book = {r["symbol"] for r in db.select("asset_mgmt", "positions", "select=symbol&status=eq.open")}
    rows, seen = [], set()
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=4)

    for source, url, region in FEEDS:
        try:
            raw = _get(url)
            root = ET.fromstring(raw)
        except Exception as e:
            print(f"  news {source} failed: {str(e)[:80]}")
            continue
        items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
        for item in items[:max_per_feed]:
            title = _text(item.find("title")) or _text(item.find("{http://www.w3.org/2005/Atom}title"))
            if not title:
                continue
            link_el = item.find("link")
            link = _text(link_el) or (link_el.get("href") if link_el is not None else "") or ""
            desc = _strip(_text(item.find("description")) or _text(item.find("{http://www.w3.org/2005/Atom}summary")))[:600]
            pub = _parse_date(_text(item.find("pubDate")) or _text(item.find("published")) or "")
            if pub < cutoff:
                continue
            # hash on the normalized headline only: the same story arriving via
            # three feeds is one story, and counting it three times skews both
            # desk sentiment and the volume anomaly
            norm = re.sub(r"[^a-z0-9 ]", "", title.lower()).strip()
            h = hashlib.sha256(norm.encode()).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            blob = f"{title} {desc}"
            desks, tickers = route(blob, ticker_map, name_map)
            score, label = sentiment(blob)
            touches_book = any(t.split(".")[0] in book for t in tickers)
            importance = 50 + (25 if touches_book else 0) + (10 if len(desks) > 1 else 0) \
                + (10 if abs(score) > 0.5 else 0)
            rows.append({
                "published_at": pub.isoformat(), "source": source, "headline": title[:400],
                "url": link[:800], "summary": desc, "desk_ids": desks, "tickers": tickers,
                "region": region, "sentiment": score, "sent_label": label,
                "importance": min(100, importance), "hash": h,
            })
    if not rows:
        return 0
    return db.upsert("research", "news", rows, on_conflict="hash", chunk=200)
