"""Apply Phase 4 remaps and drops to universe.json (in place).

A backup at universe.json.bak should already exist (this script does not
create one — backup must be made by the caller).

Drops are recorded in correlation/logs/dropped_series.log
Remaps are recorded in correlation/logs/remapped_series.log
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "catalog" / "universe.json"
DROP_LOG = ROOT / "logs" / "dropped_series.log"
REMAP_LOG = ROOT / "logs" / "remapped_series.log"

# ---------------------------------------------------------------- remap maps

# (id, kind, **fields-to-set). kind == "fred"  -> set src=fred, fred=<code>, yf=None
#                              kind == "yf"    -> set yf=<sym>, src=tv (keep)
FRED_REMAP = {
    "TVC:US02Y":  "DGS2",
    "TVC:US03Y":  "DGS3",
    "TVC:US07Y":  "DGS7",
    "TVC:US20Y":  "DGS20",
    "TVC:US06MY": "DGS6MO",
    "TVC:US05YIE": "T5YIE",
    "TVC:US10YIE": "T10YIE",
    "TVC:DE10Y":  "IRLTLT01DEM156N",
    "TVC:GB10Y":  "IRLTLT01GBM156N",
    "TVC:FR10Y":  "IRLTLT01FRM156N",
    "TVC:IT10Y":  "IRLTLT01ITM156N",
    "TVC:ES10Y":  "IRLTLT01ESM156N",
    # Indonesia: only 10Y is mapped (FRED has just one aggregated long-term yield).
    "TVC:ID10Y":  "INDIRLTLT01STM",
}

# Yahoo symbol remaps. None means leave src as-is, only patch yf.
YF_REMAP = {
    "TVC:DXY":         "DX-Y.NYB",   # already; Yahoo intermittent — leave for retry
    "IDX:LQ45":        "^JKLQ45",
    "IDX:JII":         "^JKII",
    "HKEX:HSTECH":     "^HSTECH",     # already
    "CBOE:VVIX":       "^VVIX",
    "CBOE:VIX3M":      "^VIX3M",
    "CBOE:VIX9D":      "^VIX9D",
    "CBOE:VIX6M":      "^VIX6M",
    "CBOE:SKEW":       "^SKEW",
    "CBOE:RVX":        "^RVX",
    "CBOE:OVX":        "^OVX",
    "CBOE:GVZ":        "^GVZ",
    "CBOE:EVZ":        "^EVZ",
    "CBOE:VXEEM":      "^VXEEM",
    "CBOE:VIX":        "^VIX",
    "TVC:NI225":       "^N225",
    "TSE:TOPIX":       "^TOPX",
    "NSE:NIFTY":       "^NSEI",
    "BSE:SENSEX":      "^BSESN",
    "XETR:DAX":        "^GDAXI",
    "EURONEXT:PX1":    "^FCHI",
    "FTSE:UKX":        "^FTSE",
    "MIL:FTSEMIB":     "FTSEMIB.MI",
    "BME:IBC":         "^IBEX",
    "BVMF:IBOV":       "^BVSP",
    "BMV:ME":          "^MXX",
    "JSE:J203":        "^J203.JO",
    "BIST:XU100":      "XU100.IS",
    "TWSE:TAIEX":      "^TWII",
    "TWSE:2330":       "2330.TW",
    "TWSE:2317":       "2317.TW",
}

# DROP entirely — record reason
DROP_IDS = {
    "BI7DRR":              "BI source no public feed",
    "JIBOR1M":              "BI source no public feed",
    "JIBOR3M":              "BI source no public feed",
    "JIBOR6M":              "BI source no public feed",
    "JIBOR12M":             "BI source no public feed",
    "INDONIA":             "BI source no public feed",
    "TVC:MOVE":            "no public feed (proprietary ICE BofA index)",
    "LME:CA1!":            "Stooq unreliable for v1",
    "LME:ZS1!":            "Stooq unreliable for v1",
    "LME:NI1!":            "Stooq unreliable for v1",
    "LME:SN1!":            "Stooq unreliable for v1",
    "LME:PB1!":            "Stooq unreliable for v1",
    "TVC:CN10Y":           "no clean Yahoo equivalent",
    "TVC:CN02Y":           "no clean Yahoo equivalent",
    "TVC:CN05Y":           "no clean Yahoo equivalent",
    "TVC:CN30Y":           "no clean Yahoo equivalent",
    "TVC:DE02Y":           "no Yahoo / FRED equivalent",
    "TVC:DE05Y":           "no Yahoo / FRED equivalent",
    "TVC:DE30Y":           "no Yahoo / FRED equivalent",
    "TVC:GB02Y":           "no Yahoo / FRED equivalent",
    "TVC:GB30Y":           "no Yahoo / FRED equivalent",
    # Indonesia bond curve: only 10Y maps to FRED proxy; others dropped
    "TVC:ID01Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID02Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID03Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID05Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID07Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID15Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID20Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    "TVC:ID30Y":           "no Yahoo/FRED equivalent (10Y kept as proxy)",
    # legacy IDX JASICA sectors
    "IDX:JKAGRI":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKMING":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKBIND":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKMISC":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKCONS":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKPROP":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKINFR":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKFINA":          "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKTRADE":         "legacy JASICA, replaced by IDX-IC sectors",
    "IDX:JKMNFG":          "legacy JASICA, replaced by IDX-IC sectors",
}

# Drop-by-prefix
DROP_PREFIXES = {
    "CRYPTOCAP:": "free aggregated crypto-cap data unavailable",
    "ECONOMICS:":  "ECONOMICS:* survey data not available via public feeds",
}


def main() -> None:
    universe = json.loads(CAT.read_text(encoding="utf-8"))
    series = universe["series"]

    drop_records: list[tuple[str, str]] = []
    remap_records: list[tuple[str, str, str]] = []

    new_series = []
    for entry in series:
        sid = entry["id"]
        # Drop?
        reason = DROP_IDS.get(sid)
        if reason is None:
            for prefix, r in DROP_PREFIXES.items():
                if sid.startswith(prefix):
                    reason = r
                    break
        if reason is not None:
            drop_records.append((sid, reason))
            continue

        # FRED remap
        if sid in FRED_REMAP:
            code = FRED_REMAP[sid]
            entry["src"] = "fred"
            entry["fred"] = code
            entry["yf"] = None
            # FRED yields are level series -> ret type 'diff'
            entry["ret"] = "diff"
            remap_records.append((sid, "fred", code))

        # Yahoo remap (overrides yf only). Apply AFTER fred-remap so it doesn't
        # override the FRED routing.
        if sid in YF_REMAP and entry.get("src") != "fred":
            new_yf = YF_REMAP[sid]
            old_yf = entry.get("yf")
            if old_yf != new_yf:
                entry["yf"] = new_yf
                remap_records.append((sid, "yf", f"{old_yf} -> {new_yf}"))

        new_series.append(entry)

    universe["series"] = new_series
    # Update meta counts
    cats: dict[str, int] = {}
    for s in new_series:
        cats[s["cat"]] = cats.get(s["cat"], 0) + 1
    universe["meta"]["total_series"] = len(new_series)
    universe["meta"]["categories"] = cats

    CAT.write_text(json.dumps(universe, indent=2), encoding="utf-8")

    ts = datetime.utcnow().isoformat()
    with DROP_LOG.open("a", encoding="utf-8") as f:
        for sid, r in drop_records:
            f.write(f"{ts}\t{sid}\t{r}\n")
    with REMAP_LOG.open("a", encoding="utf-8") as f:
        for sid, kind, info in remap_records:
            f.write(f"{ts}\t{sid}\t{kind}\t{info}\n")

    print(f"Dropped {len(drop_records)} series")
    print(f"Remapped {len(remap_records)} series")
    print(f"New total: {len(new_series)}")
    print()
    print("First 8 drops:")
    for sid, r in drop_records[:8]:
        print(f"  {sid}: {r}")
    print()
    print("First 12 remaps:")
    for sid, kind, info in remap_records[:12]:
        print(f"  {sid:25s} -> {kind}: {info}")


if __name__ == "__main__":
    main()
