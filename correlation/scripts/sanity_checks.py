"""Phase 4 sanity checks against expected correlation ranges."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
CORR_DIR = DATA_ROOT / "correlation"


def load_pearson_w() -> pd.DataFrame:
    return pd.read_parquet(CORR_DIR / "pearson_full_weekly.parquet")


def load_pearson_m() -> pd.DataFrame:
    return pd.read_parquet(CORR_DIR / "pearson_full_monthly.parquet")


# (left_id, right_id, expected_low, expected_high, description, freq)
PAIRS = [
    ("AMEX:SPY",   "NASDAQ:QQQ",     0.85, 0.95, "SPY vs QQQ", "weekly"),
    ("AMEX:SPY",   "CBOE:VIX",      -0.80, -0.50, "SPY vs VIX", "weekly"),
    ("IDX:BBCA",   "IDX:COMPOSITE",  0.55, 0.85, "BBCA vs JCI", "weekly"),
    ("FX_IDC:USDIDR", "IDX:COMPOSITE", -0.45, -0.10, "USDIDR vs JCI", "weekly"),
    ("AMEX:GLD",   "TVC:DXY",       -0.60, -0.20, "GLD vs DXY", "weekly"),
    ("TVC:US10Y",  "NASDAQ:TLT",    -0.95, -0.50, "US10Y vs TLT", "weekly"),
    ("NYMEX:CL1!", "AMEX:XLE",       0.40, 0.85, "WTI vs XLE", "weekly"),
    ("AMEX:GLD",   "DFII10",        -0.95, -0.30, "Gold vs DFII10", "weekly"),
    ("AMEX:LQD",   "NASDAQ:TLT",     0.55, 0.95, "LQD vs TLT", "weekly"),
    ("FX:EURUSD",  "TVC:DXY",       -1.00, -0.85, "EURUSD vs DXY", "weekly"),
]


def lookup(c: pd.DataFrame, a: str, b: str) -> float | None:
    if a not in c.columns or b not in c.columns:
        return None
    return float(c.loc[a, b])


def main() -> None:
    pw = load_pearson_w()
    pm = load_pearson_m()
    print(f"weekly Pearson: {pw.shape},  monthly Pearson: {pm.shape}")
    print()
    print(f"{'pair':30s}  {'rho':>7s}  {'expected':>15s}  result")
    print("-" * 80)
    pass_n = 0
    fail_n = 0
    miss_n = 0
    for a, b, lo, hi, desc, freq in PAIRS:
        c = pw if freq == "weekly" else pm
        rho = lookup(c, a, b)
        if rho is None:
            print(f"{desc:30s}  {'n/a':>7s}  [{lo:+.2f},{hi:+.2f}]   MISSING")
            miss_n += 1
        else:
            ok = lo <= rho <= hi
            mark = "PASS" if ok else "FAIL"
            print(f"{desc:30s}  {rho:>+7.3f}  [{lo:+.2f},{hi:+.2f}]   {mark}")
            if ok:
                pass_n += 1
            else:
                fail_n += 1
    print()
    print(f"Pass={pass_n}  Fail={fail_n}  Missing={miss_n}  / {len(PAIRS)}")


if __name__ == "__main__":
    main()
