"""Small high-signal scrapers: TSMC monthly revenue, ESDM HBA coal, TSA throughput."""
from __future__ import annotations

import datetime as dt
import json
import re
import urllib.request

from .. import db

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) lbc-research"}


def _get(url: str, timeout: int = 60) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


# ------------------------------------------------------------------ TSMC
_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def tsmc_revenue(years: int = 3) -> int:
    """TSMC monthly revenue (NT$ millions) from investor.tsmc.com yearly pages.

    Table rows: <td><div ...> Jan. </div></td> <td>401,255</td> <td>36.8%</td>
    """
    out = []
    this_year = dt.date.today().year
    for year in range(this_year - years + 1, this_year + 1):
        try:
            html = _get(f"https://investor.tsmc.com/english/monthly-revenue/{year}")
        except Exception:
            continue
        seg = html[html.find("Net Revenue"):]
        rows = re.findall(
            r"monthly-revenue[^>]*\">\s*([A-Z][a-z]{2})\.?\s*</div>\s*</td>\s*<td>([\d,]+)</td>",
            seg)
        for mon, rev in rows:
            m = _MONTHS.get(mon)
            if not m:
                continue
            try:
                val = float(rev.replace(",", ""))
            except ValueError:
                continue
            out.append({"series_key": "tw.tsmc.rev", "date": f"{year}-{m:02d}-01", "value": val})
    if not out:
        raise RuntimeError("TSMC revenue: no rows parsed (page layout changed?)")
    return db.upsert("mkt", "observation", out, on_conflict="series_key,date")


# ------------------------------------------------------------------ HBA coal
_ID_MONTHS = {m: i for i, m in enumerate(
    ["januari", "februari", "maret", "april", "mei", "juni", "juli",
     "agustus", "september", "oktober", "november", "desember"], 1)}


def hba_coal() -> int:
    """Indonesian HBA thermal coal benchmark (high-cal, USD/t).

    Primary source: Indonesian Mining Association (ima-api.org) WordPress posts —
    titles carry period + the high-calorie HBA, e.g.
    'Harga Batu Bara Acuan (HBA) Periode II Juli 2026, Kalori Tinggi US$131,85 per Ton'.
    Periode I -> day 1, Periode II -> day 15.
    (The official minerba.esdm.go.id portal is JS-only and often 'under repair'.)
    """
    xml = _get("https://ima-api.org/sitemap.xml")
    # slugs look like: harga-batu-bara-acuan-hba-periode-ii-juli-2026-kalori-tinggi-us13185-per-ton
    slugs = re.findall(
        r"harga-batu-bara-acuan(?:-hba)?-periode-(i{1,2})-([a-z]+)-(20\d{2})[a-z-]*?-us(\d{4,6})-per-ton",
        xml, re.IGNORECASE)
    out = []
    for period, month_name, year, price_digits in slugs:
        month = _ID_MONTHS.get(month_name.lower())
        if not month:
            continue
        # us13185 -> 131.85 (last two digits are cents)
        val = int(price_digits) / 100.0
        if not (20 < val < 400):  # sanity: USD/t
            continue
        day = 1 if period.lower() == "i" else 15
        out.append({"series_key": "cmd.coal.hba",
                    "date": f"{year}-{month:02d}-{day:02d}", "value": val})
    if not out:
        raise RuntimeError("HBA: no parseable IMA sitemap slugs (layout changed?)")
    return db.upsert("mkt", "observation", out, on_conflict="series_key,date")


# ------------------------------------------------------------------ TSA
def tsa_throughput() -> int:
    """TSA checkpoint numbers. tsa.gov hard-403s non-residential clients, so this
    is disabled; the series is inactive in the registry. Upgrade path: run from
    a residential connection or swap in IATA monthly traffic."""
    raise RuntimeError("TSA source blocked (403 for datacenter IPs); series inactive")
