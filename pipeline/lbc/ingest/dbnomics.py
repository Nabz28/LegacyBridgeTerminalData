"""DBnomics ingestion (keyless) for series registered with source='dbnomics'."""
from __future__ import annotations

import json
import time
import urllib.request

from .. import db
from ..registry import SERIES

UA = {"User-Agent": "lbc-research-pipeline/1.0"}


def fetch(series_id: str) -> list[tuple[str, float]]:
    url = f"https://api.db.nomics.world/v22/series/{series_id}?observations=1"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read().decode())
    docs = d.get("series", {}).get("docs", [])
    if not docs:
        raise RuntimeError(f"DBnomics: no docs for {series_id}")
    s = docs[0]
    out = []
    for p, v in zip(s.get("period", []), s.get("value", [])):
        if v is None or v == "NA":
            continue
        # normalize period to a date: '2026-07' -> '2026-07-01'
        if len(p) == 7:
            p = p + "-01"
        elif len(p) == 4:
            p = p + "-01-01"
        try:
            out.append((p, float(v)))
        except (TypeError, ValueError):
            continue
    return out


def run(full: bool = True) -> int:
    total = 0
    for s in SERIES:
        key, _, _, _, _, _, source, source_id = s
        if source != "dbnomics":
            continue
        try:
            obs = fetch(source_id)
        except Exception as e:
            print(f"  dbnomics {key} failed: {e}")
            continue
        if not full:
            obs = obs[-30:]
        rows = [{"series_key": key, "date": d, "value": v} for d, v in obs]
        total += db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=2000)
        time.sleep(0.5)
    return total
