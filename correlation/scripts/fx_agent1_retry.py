"""fx_agent1_retry.py — Retry the 7 failed tickers one-by-one with longer timeout.

Failed: USDBOB=X, USDDOP=X, USDXAF=X, USDQAR=X, EURNZD=X, GBPSGD=X, CADCHF=X
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import pandas as pd
import yfinance as yf

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
STAGE = DATA_ROOT / "raw" / "staging"
CAT_STAGE = ROOT / "catalog" / "staging"

RETRY = [
    "USDBOB=X", "USDDOP=X", "USDXAF=X", "USDQAR=X",
    "EURNZD=X", "GBPSGD=X", "CADCHF=X",
]

NAMES = {
    "USDBOB=X": "USD/BOB (Bolivian Boliviano)",
    "USDDOP=X": "USD/DOP (Dominican Peso)",
    "USDXAF=X": "USD/XAF (Central African CFA Franc)",
    "USDQAR=X": "USD/QAR (Qatari Riyal)",
    "EURNZD=X": "EUR/NZD",
    "GBPSGD=X": "GBP/SGD",
    "CADCHF=X": "CAD/CHF",
}

SUB = {
    "USDBOB=X": "EM FX - LATAM",
    "USDDOP=X": "EM FX - LATAM",
    "USDXAF=X": "EM FX - EMEA",
    "USDQAR=X": "EM FX - EMEA",
    "EURNZD=X": "G10 Cross",
    "GBPSGD=X": "G10 Cross",
    "CADCHF=X": "G10 Cross",
}


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


new_results: dict[str, pd.Series] = {}
new_entries: list[dict] = []
still_failed: list[str] = []

for t in RETRY:
    print(f"  retrying {t} ...", flush=True)
    try:
        df = yf.download(
            tickers=[t],
            start="2011-01-01",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=False,
            timeout=45,
        )
        if df is None or df.empty:
            raise ValueError("empty")

        if isinstance(df.columns, pd.MultiIndex):
            s = df[t]["Close"].dropna()
        else:
            s = df["Close"].dropna()

        if len(s) < 26:
            raise ValueError(f"only {len(s)} rows")

        new_results[t] = s
        new_entries.append({
            "id": t,
            "name": NAMES.get(t, t.replace("=X", "")),
            "yf": t,
            "src": "yf",
            "cat": "global_fx",
            "sub": SUB.get(t, "G10 Cross"),
            "ret": "log",
            "start": 2011,
        })
        print(f"  ok  {t}: {len(s)} rows  ({s.index[0].date()} .. {s.index[-1].date()})", flush=True)

    except Exception as exc:
        still_failed.append(t)
        print(f"  FAIL {t}: {exc}", flush=True)

    time.sleep(2)

if new_results:
    print(f"\nMerging {len(new_results)} new series into existing parquets ...", flush=True)

    # Build new series weekly/monthly
    wk_new: dict[str, pd.Series] = {}
    mo_new: dict[str, pd.Series] = {}
    for t, s in new_results.items():
        s_w = s.copy()
        s_w.index = to_friday(pd.DatetimeIndex(s_w.index))
        s_w = s_w.groupby(level=0).last().sort_index()

        s_m = s.copy()
        s_m.index = pd.DatetimeIndex(s_m.index).to_period("M").to_timestamp("M")
        s_m = s_m.groupby(level=0).last().sort_index()

        wk_new[t] = s_w
        mo_new[t] = s_m

    wk_add = pd.concat(wk_new, axis=1)
    mo_add = pd.concat(mo_new, axis=1)

    wk_path = STAGE / "fx_agent1_weekly.parquet"
    mo_path = STAGE / "fx_agent1_monthly.parquet"

    # Merge with existing parquets
    wk_existing = pd.read_parquet(wk_path)
    mo_existing = pd.read_parquet(mo_path)

    new_wk_cols = [c for c in wk_add.columns if c not in wk_existing.columns]
    new_mo_cols = [c for c in mo_add.columns if c not in mo_existing.columns]

    wk_final = pd.concat([wk_existing, wk_add[new_wk_cols]], axis=1) if new_wk_cols else wk_existing
    mo_final = pd.concat([mo_existing, mo_add[new_mo_cols]], axis=1) if new_mo_cols else mo_existing

    wk_final.to_parquet(wk_path)
    mo_final.to_parquet(mo_path)
    print(f"  updated weekly: shape={wk_final.shape}", flush=True)
    print(f"  updated monthly: shape={mo_final.shape}", flush=True)

    # Merge catalog entries
    cat_path = CAT_STAGE / "fx_agent1.json"
    cat_data = json.loads(cat_path.read_text(encoding="utf-8"))
    existing_ids = {e["id"] for e in cat_data["entries"]}
    for e in new_entries:
        if e["id"] not in existing_ids:
            cat_data["entries"].append(e)
    cat_data["succeeded"] = len(cat_data["entries"])
    cat_data["failed_count"] = len(still_failed)
    cat_data["failed"] = still_failed
    cat_path.write_text(json.dumps(cat_data, separators=(",", ":")), encoding="utf-8")
    print(f"  catalog now has {len(cat_data['entries'])} entries", flush=True)

print(f"\nRetry done. Still failed ({len(still_failed)}): {still_failed}")
