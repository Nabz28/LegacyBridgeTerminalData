"""BLS public API v1 (keyless) for US inflation and labour series.

25 requests/day/IP without a key, and one request carries up to 25 series and
20 years, so the whole US labour/inflation block costs a single call per run.
"""
from __future__ import annotations

import datetime as dt
import json
import urllib.request

from .. import db
from ..registry import SERIES

URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/"
UA = {"User-Agent": "lbc-research-pipeline/1.0", "Content-Type": "application/json"}

_PERIOD_MONTH = {f"M{i:02d}": i for i in range(1, 13)}


MAX_SPAN = 9  # BLS v1 truncates any request spanning more than 10 years


def _fetch_window(series_ids: list[str], start: int, end: int):
    body = json.dumps({"seriesid": series_ids, "startyear": str(start),
                       "endyear": str(end)}).encode()
    req = urllib.request.Request(URL, data=body, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read().decode())
    if d.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(f"BLS: {d.get('status')} {d.get('message')}")
    return d.get("Results", {}).get("series", [])


def fetch(series_ids: list[str], years_back: int = 12) -> dict[str, list[tuple[str, float]]]:
    """Fetch in <=9-year windows. A single wide request silently returns only
    the OLDEST years, which would leave every series stale by a decade."""
    end_year = dt.date.today().year
    first_year = end_year - years_back
    out: dict[str, list[tuple[str, float]]] = {sid: [] for sid in series_ids}
    start = first_year
    while start <= end_year:
        stop = min(start + MAX_SPAN, end_year)
        for s in _fetch_window(series_ids, start, stop):
            rows = out.setdefault(s["seriesID"], [])
            for p in s.get("data", []):
                month = _PERIOD_MONTH.get(p.get("period", ""))
                if not month:
                    continue  # skip annual (M13) and quarterly aggregates
                try:
                    rows.append((f"{p['year']}-{month:02d}-01", float(p["value"])))
                except (KeyError, ValueError):
                    continue
        start = stop + 1
    return {k: sorted(set(v)) for k, v in out.items()}


def run(years_back: int = 12) -> int:
    wanted = [(s[0], s[7]) for s in SERIES if s[6] == "bls"]
    if not wanted:
        return 0
    data = fetch([sid for _, sid in wanted], years_back)
    total = 0
    for key, sid in wanted:
        rows = [{"series_key": key, "date": d, "value": v} for d, v in data.get(sid, [])]
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=2000)
    return total
