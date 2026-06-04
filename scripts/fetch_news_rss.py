#!/usr/bin/env python3
"""
fetch_news_rss.py — Stage A of the macro news pipeline.

Pulls a curated set of working macro RSS feeds, parses them (stdlib only),
dedupes, rough-tags region by keyword, and prints a JSON array of CANDIDATE
items to stdout:

    [{ "source","headline","url","ts","region","summary" }, ...]

It does NOT score. Stage B (the scheduled LLM agent) reads these candidates and
adds sentiment / affects / analysis / importance, then posts via post_news.py.
This guarantees the feed is fresh and every item has a real, clickable link.

Usage:
    python fetch_news_rss.py [--days 5] [--limit 60] > candidates.json
"""

import sys, json, re, hashlib, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

# (source label, url, default region)
FEEDS = [
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml", "US"),
    ("MarketWatch",     "https://feeds.content.dowjones.io/public/rss/mw_topstories", "World"),
    ("MarketWatch",     "https://feeds.content.dowjones.io/public/rss/mw_marketpulse", "World"),
    ("Investing.com",   "https://www.investing.com/rss/news_95.rss", "World"),   # economy
    ("Investing.com",   "https://www.investing.com/rss/news_1.rss",  "World"),   # forex
    ("Investing.com",   "https://www.investing.com/rss/news_11.rss", "World"),   # commodities
    ("BBC",             "https://feeds.bbci.co.uk/news/business/rss.xml", "World"),
    ("The Guardian",    "https://www.theguardian.com/business/economics/rss", "World"),
]

DAYS = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 5
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 60

# Region keyword tagging (the LLM refines this in Stage B).
REGION_KW = [
    ("ID", re.compile(r"\b(indonesia|rupiah|jakarta|bank indonesia|\bBI\b|idr|jokowi|prabowo|bps)\b", re.I)),
    ("CN", re.compile(r"\b(china|chinese|pboc|yuan|renminbi|beijing|xi jinping)\b", re.I)),
    ("US", re.compile(r"\b(federal reserve|\bfed\b|fomc|treasur|dollar|u\.s\.|\bus\b|powell|cpi|nonfarm|jobless)\b", re.I)),
]
# Only keep macro-relevant items (drop generic biz/celebrity/tech noise).
MACRO_KW = re.compile(r"\b(inflation|cpi|ppi|rate|rates|fed|central bank|gdp|growth|recession|jobs|payroll|unemploy|"
                      r"treasury|yield|bond|dollar|currency|fx|forex|oil|gold|commodit|tariff|trade|export|import|"
                      r"stimulus|monetary|fiscal|deficit|pboc|ecb|boj|rupiah|yuan|economy|economic|consumer|retail sales|"
                      r"manufacturing|pmi|housing|opec|crude|sanction|geopolit)\b", re.I)

def _txt(el):
    return (el.text or "").strip() if el is not None else ""

def _localname(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag

def _find(el, name):
    for c in el:
        if _localname(c.tag) == name:
            return c
    return None

def _link(item):
    # RSS <link>text</link> or Atom <link href="..."/>
    for c in item:
        if _localname(c.tag) == "link":
            if c.get("href"):
                return c.get("href")
            if (c.text or "").strip():
                return c.text.strip()
    return ""

def _date(item):
    for nm in ("pubDate", "published", "updated", "date"):
        c = _find(item, nm)
        if c is not None and (c.text or "").strip():
            raw = c.text.strip()
            try:
                d = parsedate_to_datetime(raw)
            except Exception:
                try:
                    d = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                except Exception:
                    continue
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            return d
    return None

def region_of(text, default):
    for reg, rx in REGION_KW:
        if rx.search(text):
            return reg
    return default

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (lbc-macro-news)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()

def parse_feed(source, url, default_region, cutoff, out, seen):
    try:
        raw = fetch(url)
        root = ET.fromstring(raw)
    except Exception as e:
        print("feed failed: %s (%s)" % (url, e), file=sys.stderr)
        return
    items = [el for el in root.iter() if _localname(el.tag) in ("item", "entry")]
    for it in items:
        title = _txt(_find(it, "title"))
        if not title:
            continue
        link = _link(it)
        d = _date(it)
        if d and d < cutoff:
            continue
        desc = _txt(_find(it, "description")) or _txt(_find(it, "summary"))
        desc = re.sub(r"<[^>]+>", "", desc)[:280]
        hay = title + " " + desc
        if not MACRO_KW.search(hay):
            continue
        key = hashlib.sha1(re.sub(r"\W+", "", title.lower()).encode()).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "source": source, "headline": title, "url": link,
            "ts": (d or datetime.now(timezone.utc)).isoformat(),
            "region": region_of(hay, default_region), "summary": desc,
        })

def main():
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS)
    out, seen = [], set()
    for source, url, reg in FEEDS:
        parse_feed(source, url, reg, cutoff, out, seen)
    out.sort(key=lambda x: x["ts"], reverse=True)
    # ASCII-safe (\uXXXX escapes) so the output is valid JSON regardless of the
    # console/file encoding on Windows — keeps the cron pipeline robust.
    print(json.dumps(out[:LIMIT], ensure_ascii=True, indent=1))

if __name__ == "__main__":
    main()
