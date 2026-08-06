"""FRED ingestion via the keyless fredgraph.csv endpoint.

https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10 returns the full history
as CSV with no API key. We fetch each registered series and upsert observations.
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import time
import urllib.request

from .. import db
from ..registry import SERIES

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) lbc-research"}


def fetch_series(fred_id: str, retries: int = 4, start: str | None = None) -> list[tuple[str, float]]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={fred_id}"
    if start:
        url += f"&cosd={start}"
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r:
                text = r.read().decode("utf-8", errors="replace")
            rows = []
            reader = csv.reader(io.StringIO(text))
            header = next(reader, None)
            if not header or len(header) < 2:
                raise ValueError(f"bad header for {fred_id}: {header}")
            for row in reader:
                if len(row) < 2 or row[1] in (".", "", "NA"):
                    continue
                try:
                    rows.append((row[0], float(row[1])))
                except ValueError:
                    continue
            return rows
        except Exception as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"FRED fetch failed for {fred_id}: {last}")


def run(days_back: int = 120, full: bool = False) -> int:
    """Ingest all fredcsv-source series. full=True backfills entire history."""
    cutoff = (dt.date.today() - dt.timedelta(days=days_back)).isoformat()
    total = 0
    for s in SERIES:
        key, _, _, _, _, _, source, source_id = s
        if source != "fredcsv":
            continue
        # limit history to 2000+ (plenty for 12m percentiles and regressions,
        # keeps the giant dailies like DFF fast)
        obs = fetch_series(source_id, start="2000-01-01" if full else cutoff)
        if not full:
            obs = [o for o in obs if o[0] >= cutoff]
        rows = [{"series_key": key, "date": d, "value": v} for d, v in obs]
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=2000)
        time.sleep(0.4)  # be polite
    return total
