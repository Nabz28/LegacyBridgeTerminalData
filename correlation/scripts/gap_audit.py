"""Gap audit: per-series presence in the per-category parquets.

Categorizes missing series into:
  transient_retry  - had a yf empty / FRED timeout (re-fetch likely fixes)
  needs_remap      - source has no working symbol (BI/JIBOR, TVC bond yields w/o yf)
  needs_drop       - listed in known-drop set
  unknown          - missing without a known reason
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "catalog" / "universe.json"
RAW_W = DATA_ROOT / "raw" / "weekly"
LOG_DIR = ROOT / "logs"
FAIL_LOG = LOG_DIR / "fetch_failures.log"
OUT = LOG_DIR / "gap_audit.json"

KNOWN_DROP_PREFIXES = (
    "CRYPTOCAP:",
    "ECONOMICS:",
)
KNOWN_DROP_IDS = {
    "BI7DRR", "JIBOR1M", "JIBOR3M", "JIBOR6M", "JIBOR12M", "INDONIA",
    "TVC:MOVE",
    "LME:CA1!", "LME:ZS1!", "LME:NI1!", "LME:SN1!", "LME:PB1!",
    # legacy IDX JASICA sectors (not on Yahoo)
    "IDX:JKAGRI", "IDX:JKMING", "IDX:JKBIND", "IDX:JKMISC", "IDX:JKCONS",
    "IDX:JKPROP", "IDX:JKINFR", "IDX:JKFINA", "IDX:JKTRADE", "IDX:JKMNFG",
}


def load_failure_log() -> dict[str, list[str]]:
    """Map series_id -> list of failure reasons (most recent first)."""
    if not FAIL_LOG.exists():
        return {}
    out: dict[str, list[str]] = {}
    for line in FAIL_LOG.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        _, sid, reason = parts[0], parts[1], parts[2]
        out.setdefault(sid, []).append(reason)
    return out


def category_columns() -> dict[str, set[str]]:
    """Map cat -> set of series_ids present in weekly parquet."""
    out: dict[str, set[str]] = {}
    for p in sorted(RAW_W.glob("*.parquet")):
        try:
            df = pd.read_parquet(p)
        except Exception as e:
            print(f"WARN: failed to read {p}: {e}")
            continue
        out[p.stem] = set(df.columns)
    return out


def classify(entry: dict, reasons: list[str]) -> str:
    sid = entry["id"]
    if entry.get("src") in {"derived", "premium"}:
        return "skip"
    if sid in KNOWN_DROP_IDS:
        return "needs_drop"
    if any(sid.startswith(p) for p in KNOWN_DROP_PREFIXES):
        return "needs_drop"
    # source-specific: BI / BPS w/o yf -> drop
    if entry.get("src") in {"bi", "bps"} and not entry.get("yf"):
        return "needs_drop"
    # FRED timeout -> transient
    for r in reasons:
        if "timed out" in r or "Connection to" in r or "Max retries" in r:
            return "transient_retry"
    # Yahoo empty -> transient (rate limit) BUT if we have no yf at all -> needs_remap
    if not entry.get("yf") and entry.get("src") == "tv":
        return "needs_remap"
    if any("yf empty" in r for r in reasons):
        return "transient_retry"
    if any("404" in r or "Not Found" in r for r in reasons):
        return "needs_remap"
    if reasons:
        return "unknown"
    return "unknown"


def main() -> None:
    universe = json.loads(CAT.read_text(encoding="utf-8"))
    series = universe["series"]
    cat_cols = category_columns()
    failures = load_failure_log()

    buckets: dict[str, list[dict]] = {
        "transient_retry": [],
        "needs_remap": [],
        "needs_drop": [],
        "unknown": [],
        "skip": [],
    }
    present = 0
    missing = 0

    for entry in series:
        sid = entry["id"]
        cat = entry["cat"]
        if entry.get("src") in {"derived", "premium"}:
            continue
        cols = cat_cols.get(cat, set())
        if sid in cols:
            present += 1
            continue
        missing += 1
        reasons = failures.get(sid, [])
        bucket = classify(entry, reasons)
        buckets[bucket].append({
            "id": sid,
            "cat": cat,
            "src": entry.get("src"),
            "yf": entry.get("yf"),
            "reason_last": reasons[-1] if reasons else None,
        })

    summary = {k: len(v) for k, v in buckets.items()}
    print("=" * 60)
    print("GAP AUDIT SUMMARY")
    print("=" * 60)
    print(f"Total catalog series (excl derived): {present + missing}")
    print(f"Present in parquet:                  {present}")
    print(f"Missing:                             {missing}")
    print()
    print("Missing by bucket:")
    for k, n in summary.items():
        print(f"  {k:20s} {n}")
    print()
    print("Missing by category:")
    by_cat: dict[str, int] = {}
    for bucket in ("transient_retry", "needs_remap", "needs_drop", "unknown"):
        for e in buckets[bucket]:
            by_cat[e["cat"]] = by_cat.get(e["cat"], 0) + 1
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {c:30s} {n}")

    OUT.write_text(json.dumps(buckets, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
