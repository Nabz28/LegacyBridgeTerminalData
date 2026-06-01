"""
ingest_us_equities.py

1. Builds a curated US large/mega-cap universe (~150-220 tickers, 11 GICS sectors).
2. Fetches fundamentals via yfinance (polite delays, retries).
3. Creates public.equity_screen_global in Supabase (same cols as equity_screen + market + currency).
4. Inserts in batches of 50, upserts on symbol.
5. Verifies row count.

Usage:
    python scripts/ingest_us_equities.py

Reads Supabase creds from .env / legion.local.json (same as _brain.py).
Never prints secrets.
"""
from __future__ import annotations

import json
import logging
import math
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from legion._brain import load_credentials

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ingest_us")

# ---------------------------------------------------------------------------
# US universe: 11 GICS sectors, ~15-20 names each, sector bellwethers first
# (symbol, name, sector [GICS], sub_sector)
# ---------------------------------------------------------------------------
US_UNIVERSE: list[tuple[str, str, str, str]] = [
    # ── Energy ──────────────────────────────────────────────────────────────
    ("XOM",  "Exxon Mobil",               "Energy",                  "Integrated Oil & Gas"),
    ("CVX",  "Chevron",                   "Energy",                  "Integrated Oil & Gas"),
    ("COP",  "ConocoPhillips",            "Energy",                  "Oil & Gas E&P"),
    ("EOG",  "EOG Resources",             "Energy",                  "Oil & Gas E&P"),
    ("SLB",  "SLB (Schlumberger)",        "Energy",                  "Oil & Gas Equipment & Services"),
    ("PSX",  "Phillips 66",               "Energy",                  "Oil & Gas Refining"),
    ("VLO",  "Valero Energy",             "Energy",                  "Oil & Gas Refining"),
    ("MPC",  "Marathon Petroleum",        "Energy",                  "Oil & Gas Refining"),
    ("OXY",  "Occidental Petroleum",      "Energy",                  "Oil & Gas E&P"),
    ("PXD",  "Pioneer Natural Resources", "Energy",                  "Oil & Gas E&P"),
    ("HAL",  "Halliburton",               "Energy",                  "Oil & Gas Equipment & Services"),
    ("KMI",  "Kinder Morgan",             "Energy",                  "Oil & Gas Midstream"),
    ("WMB",  "Williams Companies",        "Energy",                  "Oil & Gas Midstream"),
    ("DVN",  "Devon Energy",              "Energy",                  "Oil & Gas E&P"),
    ("BKR",  "Baker Hughes",              "Energy",                  "Oil & Gas Equipment & Services"),

    # ── Materials ──────────────────────────────────────────────────────────
    ("FCX",  "Freeport-McMoRan",          "Materials",               "Copper Mining"),
    ("NEM",  "Newmont",                   "Materials",               "Gold Mining"),
    ("LIN",  "Linde",                     "Materials",               "Industrial Gases"),
    ("APD",  "Air Products",              "Materials",               "Industrial Gases"),
    ("ECL",  "Ecolab",                    "Materials",               "Specialty Chemicals"),
    ("DD",   "DuPont",                    "Materials",               "Specialty Chemicals"),
    ("NUE",  "Nucor",                     "Materials",               "Steel"),
    ("ALB",  "Albemarle",                 "Materials",               "Specialty Chemicals"),
    ("CF",   "CF Industries",             "Materials",               "Fertilizers"),
    ("MOS",  "Mosaic",                    "Materials",               "Fertilizers"),
    ("IP",   "International Paper",       "Materials",               "Paper & Packaging"),
    ("VMC",  "Vulcan Materials",          "Materials",               "Construction Materials"),
    ("MLM",  "Martin Marietta",           "Materials",               "Construction Materials"),
    ("PKG",  "Packaging Corp of America", "Materials",               "Paper & Packaging"),
    ("BALL", "Ball Corporation",          "Materials",               "Metal & Glass Containers"),

    # ── Industrials ────────────────────────────────────────────────────────
    ("CAT",  "Caterpillar",               "Industrials",             "Construction & Farm Machinery"),
    ("HON",  "Honeywell",                 "Industrials",             "Industrial Conglomerates"),
    ("UPS",  "United Parcel Service",     "Industrials",             "Air Freight & Logistics"),
    ("LMT",  "Lockheed Martin",           "Industrials",             "Aerospace & Defense"),
    ("RTX",  "RTX Corporation",           "Industrials",             "Aerospace & Defense"),
    ("GE",   "GE Aerospace",              "Industrials",             "Aerospace & Defense"),
    ("DE",   "Deere & Company",           "Industrials",             "Construction & Farm Machinery"),
    ("EMR",  "Emerson Electric",          "Industrials",             "Electrical Equipment"),
    ("ETN",  "Eaton",                     "Industrials",             "Electrical Equipment"),
    ("CSX",  "CSX",                       "Industrials",             "Railroads"),
    ("NSC",  "Norfolk Southern",          "Industrials",             "Railroads"),
    ("UNP",  "Union Pacific",             "Industrials",             "Railroads"),
    ("FDX",  "FedEx",                     "Industrials",             "Air Freight & Logistics"),
    ("GD",   "General Dynamics",          "Industrials",             "Aerospace & Defense"),
    ("ROK",  "Rockwell Automation",       "Industrials",             "Industrial Automation"),
    ("PH",   "Parker Hannifin",           "Industrials",             "Industrial Machinery"),
    ("MMM",  "3M",                        "Industrials",             "Industrial Conglomerates"),
    ("WM",   "Waste Management",          "Industrials",             "Environmental Services"),

    # ── Consumer Discretionary ────────────────────────────────────────────
    ("AMZN", "Amazon",                    "Consumer Discretionary",  "E-Commerce & Retail"),
    ("TSLA", "Tesla",                     "Consumer Discretionary",  "Automobiles"),
    ("HD",   "Home Depot",                "Consumer Discretionary",  "Home Improvement Retail"),
    ("MCD",  "McDonald's",                "Consumer Discretionary",  "Restaurants"),
    ("NKE",  "Nike",                      "Consumer Discretionary",  "Footwear & Apparel"),
    ("SBUX", "Starbucks",                 "Consumer Discretionary",  "Restaurants"),
    ("LOW",  "Lowe's",                    "Consumer Discretionary",  "Home Improvement Retail"),
    ("TJX",  "TJX Companies",             "Consumer Discretionary",  "Off-Price Retail"),
    ("BKNG", "Booking Holdings",          "Consumer Discretionary",  "Online Travel"),
    ("GM",   "General Motors",            "Consumer Discretionary",  "Automobiles"),
    ("F",    "Ford Motor",                "Consumer Discretionary",  "Automobiles"),
    ("ABNB", "Airbnb",                    "Consumer Discretionary",  "Hotels & Lodging"),
    ("MAR",  "Marriott International",    "Consumer Discretionary",  "Hotels & Lodging"),
    ("YUM",  "Yum! Brands",               "Consumer Discretionary",  "Restaurants"),
    ("ROST", "Ross Stores",               "Consumer Discretionary",  "Off-Price Retail"),
    ("HLT",  "Hilton Worldwide",          "Consumer Discretionary",  "Hotels & Lodging"),

    # ── Consumer Staples ──────────────────────────────────────────────────
    ("PG",   "Procter & Gamble",          "Consumer Staples",        "Household Products"),
    ("KO",   "Coca-Cola",                 "Consumer Staples",        "Beverages"),
    ("PEP",  "PepsiCo",                   "Consumer Staples",        "Beverages"),
    ("COST", "Costco",                    "Consumer Staples",        "Hypermarkets & Supercenters"),
    ("WMT",  "Walmart",                   "Consumer Staples",        "Hypermarkets & Supercenters"),
    ("PM",   "Philip Morris",             "Consumer Staples",        "Tobacco"),
    ("MO",   "Altria Group",              "Consumer Staples",        "Tobacco"),
    ("MDLZ", "Mondelez International",    "Consumer Staples",        "Packaged Foods"),
    ("GIS",  "General Mills",             "Consumer Staples",        "Packaged Foods"),
    ("KHC",  "Kraft Heinz",               "Consumer Staples",        "Packaged Foods"),
    ("KMB",  "Kimberly-Clark",            "Consumer Staples",        "Household Products"),
    ("CL",   "Colgate-Palmolive",         "Consumer Staples",        "Household Products"),
    ("TSN",  "Tyson Foods",               "Consumer Staples",        "Meat & Poultry"),
    ("ADM",  "Archer-Daniels-Midland",    "Consumer Staples",        "Agricultural Products"),
    ("STZ",  "Constellation Brands",      "Consumer Staples",        "Beverages"),

    # ── Health Care ───────────────────────────────────────────────────────
    ("JNJ",  "Johnson & Johnson",         "Health Care",             "Pharma & Consumer Health"),
    ("UNH",  "UnitedHealth Group",        "Health Care",             "Managed Care"),
    ("LLY",  "Eli Lilly",                 "Health Care",             "Pharmaceuticals"),
    ("MRK",  "Merck",                     "Health Care",             "Pharmaceuticals"),
    ("ABT",  "Abbott Laboratories",       "Health Care",             "Medical Devices"),
    ("PFE",  "Pfizer",                    "Health Care",             "Pharmaceuticals"),
    ("TMO",  "Thermo Fisher Scientific",  "Health Care",             "Life Sciences Tools"),
    ("DHR",  "Danaher",                   "Health Care",             "Life Sciences Tools"),
    ("BMY",  "Bristol-Myers Squibb",      "Health Care",             "Pharmaceuticals"),
    ("AMGN", "Amgen",                     "Health Care",             "Biotechnology"),
    ("GILD", "Gilead Sciences",           "Health Care",             "Biotechnology"),
    ("ISRG", "Intuitive Surgical",        "Health Care",             "Medical Devices"),
    ("CVS",  "CVS Health",                "Health Care",             "Healthcare Services"),
    ("HCA",  "HCA Healthcare",            "Health Care",             "Hospitals"),
    ("ELV",  "Elevance Health",           "Health Care",             "Managed Care"),
    ("MDT",  "Medtronic",                 "Health Care",             "Medical Devices"),

    # ── Financials ────────────────────────────────────────────────────────
    ("JPM",  "JPMorgan Chase",            "Financials",              "Money Center Banks"),
    ("BAC",  "Bank of America",           "Financials",              "Money Center Banks"),
    ("WFC",  "Wells Fargo",               "Financials",              "Money Center Banks"),
    ("GS",   "Goldman Sachs",             "Financials",              "Investment Banking"),
    ("MS",   "Morgan Stanley",            "Financials",              "Investment Banking"),
    ("BLK",  "BlackRock",                 "Financials",              "Asset Management"),
    ("C",    "Citigroup",                 "Financials",              "Money Center Banks"),
    ("AXP",  "American Express",          "Financials",              "Consumer Finance"),
    ("V",    "Visa",                      "Financials",              "Payment Networks"),
    ("MA",   "Mastercard",                "Financials",              "Payment Networks"),
    ("COF",  "Capital One",               "Financials",              "Consumer Finance"),
    ("USB",  "U.S. Bancorp",              "Financials",              "Regional Banks"),
    ("BRK-B","Berkshire Hathaway B",      "Financials",              "Diversified Financial"),
    ("PGR",  "Progressive",               "Financials",              "P&C Insurance"),
    ("CB",   "Chubb",                     "Financials",              "P&C Insurance"),
    ("MET",  "MetLife",                   "Financials",              "Life Insurance"),
    ("SCHW", "Charles Schwab",            "Financials",              "Capital Markets"),

    # ── Information Technology ────────────────────────────────────────────
    ("AAPL", "Apple",                     "Information Technology",  "Consumer Electronics"),
    ("MSFT", "Microsoft",                 "Information Technology",  "Software"),
    ("NVDA", "NVIDIA",                    "Information Technology",  "Semiconductors"),
    ("AVGO", "Broadcom",                  "Information Technology",  "Semiconductors"),
    ("ORCL", "Oracle",                    "Information Technology",  "Software"),
    ("AMD",  "Advanced Micro Devices",    "Information Technology",  "Semiconductors"),
    ("QCOM", "Qualcomm",                  "Information Technology",  "Semiconductors"),
    ("TXN",  "Texas Instruments",         "Information Technology",  "Semiconductors"),
    ("AMAT", "Applied Materials",         "Information Technology",  "Semiconductor Equipment"),
    ("MU",   "Micron Technology",         "Information Technology",  "Memory Chips"),
    ("INTC", "Intel",                     "Information Technology",  "Semiconductors"),
    ("CRM",  "Salesforce",                "Information Technology",  "Software"),
    ("ADBE", "Adobe",                     "Information Technology",  "Software"),
    ("NOW",  "ServiceNow",                "Information Technology",  "Software"),
    ("IBM",  "IBM",                       "Information Technology",  "IT Services"),
    ("ACN",  "Accenture",                 "Information Technology",  "IT Services"),
    ("CSCO", "Cisco Systems",             "Information Technology",  "Networking Equipment"),
    ("HPQ",  "HP Inc.",                   "Information Technology",  "Computer Hardware"),

    # ── Communication Services ────────────────────────────────────────────
    ("GOOGL","Alphabet (GOOGL)",          "Communication Services",  "Internet Search & Advertising"),
    ("META", "Meta Platforms",            "Communication Services",  "Social Media"),
    ("NFLX", "Netflix",                   "Communication Services",  "Streaming"),
    ("DIS",  "Walt Disney",               "Communication Services",  "Entertainment"),
    ("CMCSA","Comcast",                   "Communication Services",  "Cable & Satellite"),
    ("T",    "AT&T",                      "Communication Services",  "Telecom Services"),
    ("VZ",   "Verizon",                   "Communication Services",  "Telecom Services"),
    ("TMUS", "T-Mobile US",               "Communication Services",  "Telecom Services"),
    ("SPOT", "Spotify",                   "Communication Services",  "Streaming"),
    ("SNAP", "Snap",                      "Communication Services",  "Social Media"),
    ("PINS", "Pinterest",                 "Communication Services",  "Social Media"),
    ("WBD",  "Warner Bros. Discovery",    "Communication Services",  "Entertainment"),
    ("PARA", "Paramount Global",          "Communication Services",  "Entertainment"),
    ("EA",   "Electronic Arts",           "Communication Services",  "Video Games"),

    # ── Utilities ─────────────────────────────────────────────────────────
    ("NEE",  "NextEra Energy",            "Utilities",               "Electric Utilities"),
    ("DUK",  "Duke Energy",               "Utilities",               "Electric Utilities"),
    ("SO",   "Southern Company",          "Utilities",               "Electric Utilities"),
    ("D",    "Dominion Energy",           "Utilities",               "Electric Utilities"),
    ("AEP",  "American Electric Power",   "Utilities",               "Electric Utilities"),
    ("EXC",  "Exelon",                    "Utilities",               "Electric Utilities"),
    ("PCG",  "PG&E",                      "Utilities",               "Electric Utilities"),
    ("XEL",  "Xcel Energy",               "Utilities",               "Electric Utilities"),
    ("SRE",  "Sempra",                    "Utilities",               "Multi-Utilities"),
    ("WEC",  "WEC Energy Group",          "Utilities",               "Electric Utilities"),
    ("ES",   "Eversource Energy",         "Utilities",               "Electric Utilities"),
    ("AWK",  "American Water Works",      "Utilities",               "Water Utilities"),
    ("ETR",  "Entergy",                   "Utilities",               "Electric Utilities"),

    # ── Real Estate ───────────────────────────────────────────────────────
    ("AMT",  "American Tower",            "Real Estate",             "Cell Tower REITs"),
    ("PLD",  "Prologis",                  "Real Estate",             "Industrial REITs"),
    ("CCI",  "Crown Castle",              "Real Estate",             "Cell Tower REITs"),
    ("EQIX", "Equinix",                   "Real Estate",             "Data Center REITs"),
    ("SPG",  "Simon Property Group",      "Real Estate",             "Retail REITs"),
    ("O",    "Realty Income",             "Real Estate",             "Net Lease REITs"),
    ("WELL", "Welltower",                 "Real Estate",             "Healthcare REITs"),
    ("DLR",  "Digital Realty Trust",      "Real Estate",             "Data Center REITs"),
    ("AVB",  "AvalonBay Communities",     "Real Estate",             "Residential REITs"),
    ("EQR",  "Equity Residential",        "Real Estate",             "Residential REITs"),
    ("PSA",  "Public Storage",            "Real Estate",             "Self-Storage REITs"),
    ("VICI", "VICI Properties",           "Real Estate",             "Gaming REITs"),
    ("WY",   "Weyerhaeuser",              "Real Estate",             "Timber REITs"),
]

# Sector name overrides from yfinance → consistent GICS names used in the table
_SECTOR_OVERRIDE: dict[str, str] = {}  # populated from universe above
for sym, name, sector, sub in US_UNIVERSE:
    _SECTOR_OVERRIDE[sym] = (sector, sub)


def _round_safe(v: Any, ndigits: int = 4) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, ndigits)
    except (TypeError, ValueError):
        return None


def fetch_ticker_row(symbol: str, name: str, sector: str, sub_sector: str) -> dict | None:
    """Fetch fundamentals from yfinance. Returns None on hard failure."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info or info.get("quoteType") is None:
            log.warning("  %s: empty info, skipping", symbol)
            return None

        # regularMarketChangePercent from yfinance is already in percent units
        # (e.g. -1.156 means -1.156%, NOT -0.01156). Do NOT multiply by 100.
        chg_raw = info.get("regularMarketChangePercent")
        chg_pct = round(float(chg_raw), 4) if chg_raw is not None else None

        row: dict[str, Any] = {
            "symbol":          symbol,
            "yahoo":           symbol,
            "name":            info.get("shortName") or info.get("longName") or name,
            "sector":          sector,
            "sub_sector":      sub_sector,
            "market":          "US",
            "currency":        info.get("currency", "USD"),
            "price":           _round_safe(info.get("currentPrice") or info.get("regularMarketPrice")),
            "change_pct":      _round_safe(chg_pct),
            "mcap":            _round_safe(info.get("marketCap")),
            "shares_out":      _round_safe(info.get("sharesOutstanding")),
            "free_float_pct":  _round_safe(
                (info["floatShares"] / info["sharesOutstanding"] * 100)
                if info.get("floatShares") and info.get("sharesOutstanding") else None
            ),
            "adv_value":       _round_safe(
                (info["averageVolume"] * info["currentPrice"])
                if info.get("averageVolume") and info.get("currentPrice") else None
            ),
            "avg_volume":      _round_safe(info.get("averageVolume")),
            "pe":              _round_safe(info.get("trailingPE")),
            "pb":              _round_safe(info.get("priceToBook")),
            "ps":              _round_safe(info.get("priceToSalesTrailing12Months")),
            "ev_ebitda":       _round_safe(info.get("enterpriseToEbitda")),
            "roe":             _round_safe(
                (info["returnOnEquity"] * 100) if info.get("returnOnEquity") is not None else None
            ),
            "roa":             _round_safe(
                (info["returnOnAssets"] * 100) if info.get("returnOnAssets") is not None else None
            ),
            "net_margin":      _round_safe(
                (info["profitMargins"] * 100) if info.get("profitMargins") is not None else None
            ),
            "gross_margin":    _round_safe(
                (info["grossMargins"] * 100) if info.get("grossMargins") is not None else None
            ),
            "rev_growth":      _round_safe(
                (info["revenueGrowth"] * 100) if info.get("revenueGrowth") is not None else None
            ),
            "earnings_growth": _round_safe(
                (info["earningsGrowth"] * 100) if info.get("earningsGrowth") is not None else None
            ),
            "debt_equity":     _round_safe(info.get("debtToEquity")),
            "current_ratio":   _round_safe(info.get("currentRatio")),
            "beta":            _round_safe(info.get("beta")),
            # dividendYield from yfinance is already in percent (2.84 = 2.84%)
            "div_yield":       _round_safe(info.get("dividendYield")),
            "w52_high":        _round_safe(info.get("fiftyTwoWeekHigh")),
            "w52_low":         _round_safe(info.get("fiftyTwoWeekLow")),
        }
        return row
    except Exception as e:
        log.warning("  %s: fetch error — %s", symbol, str(e)[:120])
        return None


def apply_sql(sql: str, pat: str) -> None:
    """Run SQL via Management API."""
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/adnubucjlezrtusbicja/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {pat}",
            "Content-Type": "application/json",
            "User-Agent": "legion-ingest-us/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode()
            log.info("SQL OK %d: %s", r.status, body[:200])
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"SQL failed {e.code}: {body[:500]}")


def postgrest_upsert(rows: list[dict], supabase_url: str, service_key: str) -> None:
    """Upsert a batch via PostgREST (public schema)."""
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/equity_screen_global?on_conflict=symbol",
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Content-Profile": "public",
            "Accept-Profile": "public",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            status = r.status
            log.info("  upsert batch: HTTP %d", status)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"upsert failed {e.code}: {body[:400]}")


def count_rows(supabase_url: str, service_key: str) -> int:
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/equity_screen_global",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept-Profile": "public",
            "Prefer": "count=exact",
            "Range": "0-0",
            "Range-Unit": "items",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cr = r.headers.get("content-range") or r.headers.get("Content-Range") or ""
            total = cr.split("/")[-1]
            return 0 if total in ("", "*") else int(total)
    except urllib.error.HTTPError as e:
        e.read()
        return -1


DDL = """
-- Idempotent: create if not exists
CREATE TABLE IF NOT EXISTS public.equity_screen_global (
    symbol          text        PRIMARY KEY,
    yahoo           text,
    name            text,
    sector          text,
    sub_sector      text,
    market          text        DEFAULT 'US',
    currency        text        DEFAULT 'USD',
    price           float8,
    change_pct      float8,
    mcap            float8,
    shares_out      float8,
    free_float_pct  float8,
    adv_value       float8,
    avg_volume      float8,
    pe              float8,
    pb              float8,
    ps              float8,
    ev_ebitda       float8,
    roe             float8,
    roa             float8,
    net_margin      float8,
    gross_margin    float8,
    rev_growth      float8,
    earnings_growth float8,
    debt_equity     float8,
    current_ratio   float8,
    div_yield       float8,
    beta            float8,
    w52_high        float8,
    w52_low         float8,
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (idempotent)
ALTER TABLE public.equity_screen_global ENABLE ROW LEVEL SECURITY;

-- Read-only policy mirroring equity_screen (drop+create to stay idempotent)
DROP POLICY IF EXISTS "global_screen_read" ON public.equity_screen_global;
CREATE POLICY "global_screen_read"
    ON public.equity_screen_global
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grants mirroring equity_screen
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.equity_screen_global TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.equity_screen_global TO authenticated;
GRANT ALL ON public.equity_screen_global TO service_role;
"""


def main() -> None:
    import yfinance as yf  # noqa: F401 — confirm importable

    supabase_url, service_key = load_credentials()

    from legion._brain import Brain
    b = Brain(supabase_url, service_key)
    pat = b.vault("supabase_management_pat")

    log.info("=== Step 1: Apply DDL (create table + RLS + grants) ===")
    apply_sql(DDL, pat)

    log.info("=== Step 2: Fetch fundamentals for %d tickers ===", len(US_UNIVERSE))
    rows: list[dict] = []
    failed: list[str] = []

    for i, (sym, name, sector, sub) in enumerate(US_UNIVERSE, 1):
        log.info("[%d/%d] %s — %s / %s", i, len(US_UNIVERSE), sym, sector, sub)
        row = fetch_ticker_row(sym, name, sector, sub)
        if row:
            rows.append(row)
            log.info("  OK: price=%.2f sector=%s",
                     row.get("price") or 0, row.get("sector"))
        else:
            failed.append(sym)
        # Polite delay: 0.4s between tickers
        time.sleep(0.4)

    log.info("Fetched %d / %d tickers (%d failed: %s)",
             len(rows), len(US_UNIVERSE), len(failed), failed[:20])

    if not rows:
        log.error("Zero rows fetched — aborting insert")
        sys.exit(1)

    log.info("=== Step 3: Upsert %d rows in batches of 50 ===", len(rows))
    BATCH = 50
    for start in range(0, len(rows), BATCH):
        batch = rows[start: start + BATCH]
        log.info("  batch %d-%d (%d rows)", start + 1, start + len(batch), len(batch))
        postgrest_upsert(batch, supabase_url, service_key)
        time.sleep(0.3)

    log.info("=== Step 4: Verify row count ===")
    count = count_rows(supabase_url, service_key)
    log.info("equity_screen_global row count: %d", count)

    # Summary
    from collections import Counter
    sector_counts = Counter(r["sector"] for r in rows)
    log.info("=== SUMMARY ===")
    log.info("Total inserted: %d rows", len(rows))
    log.info("Failed tickers: %s", failed)
    log.info("Row count verified: %d", count)
    log.info("Sector breakdown:")
    for sector, n in sorted(sector_counts.items()):
        log.info("  %-35s %d", sector, n)

    # Print JSON summary for the report
    print(json.dumps({
        "table": "public.equity_screen_global",
        "rows_fetched": len(rows),
        "rows_attempted": len(US_UNIVERSE),
        "rows_failed": len(failed),
        "failed_tickers": failed,
        "verified_count": count,
        "sector_breakdown": dict(sorted(sector_counts.items())),
        "sample": rows[:3],
    }, indent=2, default=str))


if __name__ == "__main__":
    main()
