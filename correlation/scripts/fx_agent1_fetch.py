"""fx_agent1_fetch.py — Agent 1: expand global FX with ~25 new currency pairs.

Groups:
  EM FX - Asia     : USDPKR, USDLKR, USDBDT, USDKHR, USDLAK, USDMMK, USDMOP
  EM FX - LATAM    : USDUYU, USDBOB, USDPYG, USDDOP, USDCRC, USDGTQ
  EM FX - EMEA     : USDEGP, USDNGN, USDKES, USDGHS, USDMAD, USDTND,
                     USDXOF, USDXAF, USDQAR, USDKWD, USDOMR, USDBHD
  G10 Cross        : EURNZD, EURTRY, EURZAR, GBPSGD, AUDCHF, NZDCAD, CADCHF

Already in catalog (skipped): USDPHP, USDPEN, USDARS
"""
from __future__ import annotations

import json
import sys
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
STAGE.mkdir(parents=True, exist_ok=True)
CAT_STAGE.mkdir(parents=True, exist_ok=True)


def to_friday(idx: pd.DatetimeIndex) -> pd.DatetimeIndex:
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    idx = idx.normalize()
    dow = idx.dayofweek
    delta = pd.Series([4, 3, 2, 1, 0, -1, -2], index=range(7)).reindex(dow.tolist()).to_numpy()
    return pd.DatetimeIndex(idx + pd.to_timedelta(delta, unit="D"))


GROUPS: dict[str, list[str]] = {
    "EM FX - Asia": [
        "USDPKR=X", "USDLKR=X", "USDBDT=X",
        "USDKHR=X", "USDLAK=X", "USDMMK=X", "USDMOP=X",
    ],
    "EM FX - LATAM": [
        "USDUYU=X", "USDBOB=X", "USDPYG=X",
        "USDDOP=X", "USDCRC=X", "USDGTQ=X",
    ],
    "EM FX - EMEA": [
        "USDEGP=X", "USDNGN=X", "USDKES=X", "USDGHS=X",
        "USDMAD=X", "USDTND=X", "USDXOF=X", "USDXAF=X",
        "USDQAR=X", "USDKWD=X", "USDOMR=X", "USDBHD=X",
    ],
    "G10 Cross": [
        "EURNZD=X", "EURTRY=X", "EURZAR=X",
        "GBPSGD=X", "AUDCHF=X", "NZDCAD=X", "CADCHF=X",
    ],
}

# Human-readable names (pair without =X suffix)
NAMES: dict[str, str] = {
    # EM Asia
    "USDPKR=X": "USD/PKR (Pakistani Rupee)",
    "USDLKR=X": "USD/LKR (Sri Lankan Rupee)",
    "USDBDT=X": "USD/BDT (Bangladeshi Taka)",
    "USDKHR=X": "USD/KHR (Cambodian Riel)",
    "USDLAK=X": "USD/LAK (Lao Kip)",
    "USDMMK=X": "USD/MMK (Myanmar Kyat)",
    "USDMOP=X": "USD/MOP (Macau Pataca)",
    # LATAM
    "USDUYU=X": "USD/UYU (Uruguayan Peso)",
    "USDBOB=X": "USD/BOB (Bolivian Boliviano)",
    "USDPYG=X": "USD/PYG (Paraguayan Guarani)",
    "USDDOP=X": "USD/DOP (Dominican Peso)",
    "USDCRC=X": "USD/CRC (Costa Rican Colon)",
    "USDGTQ=X": "USD/GTQ (Guatemalan Quetzal)",
    # EMEA
    "USDEGP=X": "USD/EGP (Egyptian Pound)",
    "USDNGN=X": "USD/NGN (Nigerian Naira)",
    "USDKES=X": "USD/KES (Kenyan Shilling)",
    "USDGHS=X": "USD/GHS (Ghanaian Cedi)",
    "USDMAD=X": "USD/MAD (Moroccan Dirham)",
    "USDTND=X": "USD/TND (Tunisian Dinar)",
    "USDXOF=X": "USD/XOF (West African CFA Franc)",
    "USDXAF=X": "USD/XAF (Central African CFA Franc)",
    "USDQAR=X": "USD/QAR (Qatari Riyal)",
    "USDKWD=X": "USD/KWD (Kuwaiti Dinar)",
    "USDOMR=X": "USD/OMR (Omani Rial)",
    "USDBHD=X": "USD/BHD (Bahraini Dinar)",
    # G10 Cross
    "EURNZD=X": "EUR/NZD",
    "EURTRY=X": "EUR/TRY",
    "EURZAR=X": "EUR/ZAR",
    "GBPSGD=X": "GBP/SGD",
    "AUDCHF=X": "AUD/CHF",
    "NZDCAD=X": "NZD/CAD",
    "CADCHF=X": "CAD/CHF",
}

all_results: dict[str, tuple[pd.Series, str]] = {}
all_entries: list[dict] = []
attempted: list[str] = []
succeeded: list[str] = []
failed: list[str] = []

t0 = time.time()

for sub, tickers in GROUPS.items():
    attempted.extend(tickers)
    print(f"\n--- {sub}: {len(tickers)} pairs ---", flush=True)
    # Fetch entire group in one batch
    try:
        df = yf.download(
            tickers=tickers,
            start="2011-01-01",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=True,
            timeout=30,
        )
    except Exception as exc:
        print(f"  group download error: {exc}", flush=True)
        df = None

    for t in tickers:
        try:
            if df is None or df.empty:
                raise ValueError("empty download")
            if isinstance(df.columns, pd.MultiIndex):
                if t not in df.columns.get_level_values(0):
                    raise KeyError(f"{t} not in columns")
                s = df[t]["Close"].dropna()
            else:
                # Single ticker returned — columns are flat
                s = df["Close"].dropna()

            if len(s) < 26:
                raise ValueError(f"only {len(s)} rows (< 26)")

            all_results[t] = (s, sub)
            succeeded.append(t)
            all_entries.append({
                "id": t,
                "name": NAMES.get(t, t.replace("=X", "")),
                "yf": t,
                "src": "yf",
                "cat": "global_fx",
                "sub": sub,
                "ret": "log",
                "start": 2011,
            })
            print(f"  ok  {t}: {len(s)} rows  ({s.index[0].date()} .. {s.index[-1].date()})", flush=True)

        except Exception as exc:
            failed.append(t)
            print(f"  FAIL {t}: {exc}", flush=True)

    # Small pause between groups to avoid rate-limiting
    time.sleep(1)

print(f"\n--- Building weekly/monthly parquets ---", flush=True)
wk: dict[str, pd.Series] = {}
mo: dict[str, pd.Series] = {}

for t, (s, _sub) in all_results.items():
    s_w = s.copy()
    s_w.index = to_friday(pd.DatetimeIndex(s_w.index))
    s_w = s_w.groupby(level=0).last().sort_index()

    s_m = s.copy()
    s_m.index = pd.DatetimeIndex(s_m.index).to_period("M").to_timestamp("M")
    s_m = s_m.groupby(level=0).last().sort_index()

    wk[t] = s_w
    mo[t] = s_m

if wk:
    wk_df = pd.concat(wk, axis=1)
    mo_df = pd.concat(mo, axis=1)
    wk_path = STAGE / "fx_agent1_weekly.parquet"
    mo_path = STAGE / "fx_agent1_monthly.parquet"
    wk_df.to_parquet(wk_path)
    mo_df.to_parquet(mo_path)
    print(f"  wrote {wk_path.name}: shape={wk_df.shape}", flush=True)
    print(f"  wrote {mo_path.name}: shape={mo_df.shape}", flush=True)
else:
    print("  WARNING: zero successful fetches — no parquets written", flush=True)

# Catalog JSON
cat_path = CAT_STAGE / "fx_agent1.json"
cat_out = {
    "agent": 1,
    "attempted": len(attempted),
    "succeeded": len(succeeded),
    "failed_count": len(failed),
    "failed": failed,
    "entries": all_entries,
}
cat_path.write_text(json.dumps(cat_out, separators=(",", ":")), encoding="utf-8")
print(f"  wrote {cat_path.name}: {len(all_entries)} entries", flush=True)

elapsed = time.time() - t0
summary = {
    "attempted": len(attempted),
    "succeeded": len(succeeded),
    "failed": len(failed),
    "failed_list": failed,
    "wall_seconds": round(elapsed, 1),
}
print("\n=== SUMMARY ===")
print(json.dumps(summary, indent=2))
