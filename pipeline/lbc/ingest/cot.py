"""CFTC Commitment of Traders via Socrata (keyless).

Legacy futures-only report: dataset 6dca-aqww on publicreporting.cftc.gov.
Net speculative position = noncommercial long - noncommercial short.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request

from .. import db
from ..registry import SERIES

UA = {"User-Agent": "lbc-research-pipeline/1.0"}
BASE = "https://publicreporting.cftc.gov/resource/6dca-aqww.json"


def fetch(code: str, limit: int = 1500) -> list[tuple[str, float]]:
    params = urllib.parse.urlencode({
        "cftc_contract_market_code": code,
        "$select": "report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all",
        "$order": "report_date_as_yyyy_mm_dd DESC",
        "$limit": str(limit),
    })
    req = urllib.request.Request(f"{BASE}?{params}", headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = json.loads(r.read().decode())
    out = []
    for row in rows:
        try:
            d = row["report_date_as_yyyy_mm_dd"][:10]
            net = float(row["noncomm_positions_long_all"]) - float(row["noncomm_positions_short_all"])
            out.append((d, net))
        except (KeyError, TypeError, ValueError):
            continue
    return out


def run(full: bool = True) -> int:
    total = 0
    for s in SERIES:
        key, _, _, _, _, _, source, source_id = s
        if source != "cftc":
            continue
        obs = fetch(source_id, limit=1500 if full else 10)
        rows = [{"series_key": key, "date": d, "value": v} for d, v in obs]
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=1000)
    return total
