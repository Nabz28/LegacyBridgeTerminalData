"""Phase 4 bug + weakness audit on raw + returns parquets.

Checks:
  - Series with <100 weekly rows (suspect)
  - Infinite values in returns
  - All-zero series in returns
  - Date misalignment across category parquets (Friday closes)
  - Returns NaN density per series (>50% NaN flagged)
  - SQLite table row counts (sanity)
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd

import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from _paths import DATA_ROOT, DB_PATH  # external data-store paths
ROOT = Path(__file__).resolve().parents[1]
RAW_W = DATA_ROOT / "raw" / "weekly"
RAW_M = DATA_ROOT / "raw" / "monthly"
RET_DIR = DATA_ROOT / "returns"
DB = DB_PATH
LOG_DIR = ROOT / "logs"
OUT = LOG_DIR / "bug_audit.json"


def load_weekly_wide() -> pd.DataFrame:
    frames = []
    for p in sorted(RAW_W.glob("*.parquet")):
        try:
            df = pd.read_parquet(p)
        except Exception as e:
            print(f"WARN read {p}: {e}")
            continue
        df.index = pd.DatetimeIndex(df.index)
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    wide = pd.concat(frames, axis=1)
    wide = wide.loc[:, ~wide.columns.duplicated()]
    return wide.sort_index()


def main() -> None:
    findings: dict = {}

    weekly = load_weekly_wide()
    print(f"Weekly wide shape: {weekly.shape}")

    # 1. Series with <100 weekly rows
    counts = weekly.notna().sum()
    short = counts[counts < 100].sort_values()
    findings["short_series_<100_rows"] = {k: int(v) for k, v in short.items()}
    print(f"\n[1] Series with <100 weekly rows: {len(short)}")
    for k, v in short.head(15).items():
        print(f"  {k}: {v} rows")

    # 2. Date alignment across category parquets
    dates_per_cat = {}
    for p in sorted(RAW_W.glob("*.parquet")):
        df = pd.read_parquet(p)
        df.index = pd.DatetimeIndex(df.index)
        dates_per_cat[p.stem] = set(df.index.date)
    if dates_per_cat:
        union = set().union(*dates_per_cat.values())
        intersection = set.intersection(*dates_per_cat.values())
        print(f"\n[2] Date alignment: {len(union)} union dates, {len(intersection)} intersect dates")
        misalign = {c: len(union - d) for c, d in dates_per_cat.items()}
        findings["date_alignment"] = {
            "union_dates": len(union),
            "intersect_dates": len(intersection),
            "missing_dates_per_cat": misalign,
        }

    # 3. Check all weekly indices are Fridays
    weekday_check = {}
    for cat, dts in dates_per_cat.items():
        wd = pd.Series(list(dts)).map(lambda d: pd.Timestamp(d).weekday())
        non_friday = int((wd != 4).sum())
        weekday_check[cat] = {"total": len(dts), "non_friday": non_friday}
    findings["weekday_check"] = weekday_check
    print("\n[3] Weekday check (expected weekday=4 = Fri):")
    for cat, st in weekday_check.items():
        if st["non_friday"]:
            print(f"  {cat}: {st['non_friday']} non-Friday dates of {st['total']}")

    # 4. Returns: infinite values + NaN density + all-zero
    ret_w_p = RET_DIR / "weekly_returns.parquet"
    if ret_w_p.exists():
        rw = pd.read_parquet(ret_w_p)
        rw.index = pd.DatetimeIndex(rw.index)
        n_total = rw.size
        n_inf = int(np.isinf(rw.values).sum())
        n_nan = int(rw.isna().values.sum())
        print(f"\n[4] Weekly returns: shape={rw.shape}, inf={n_inf}, nan={n_nan}/{n_total} ({100*n_nan/n_total:.1f}%)")
        # All-zero series
        all_zero = []
        for c in rw.columns:
            s = rw[c].dropna()
            if len(s) > 50 and (s == 0).all():
                all_zero.append(c)
        # NaN >50%
        nan_density = rw.isna().mean()
        nan_heavy = nan_density[nan_density > 0.5].sort_values(ascending=False)
        # Infinite cols
        inf_cols = []
        for c in rw.columns:
            if np.isinf(rw[c].values).any():
                inf_cols.append(c)
        findings["weekly_returns"] = {
            "shape": list(rw.shape),
            "inf_count": n_inf,
            "nan_count": n_nan,
            "nan_pct": round(100 * n_nan / n_total, 2),
            "all_zero_series": all_zero,
            "inf_cols": inf_cols,
            "nan_heavy_>50pct": {k: round(float(v), 3) for k, v in nan_heavy.items()},
        }
        print(f"   all-zero series: {len(all_zero)}")
        print(f"   inf-containing cols: {len(inf_cols)}")
        print(f"   NaN>50% series: {len(nan_heavy)}")
        for k, v in nan_heavy.head(10).items():
            print(f"     {k}: {v:.2%}")
    else:
        print("\n[4] weekly_returns.parquet missing — skip")

    # 5. SQLite counts
    if DB.exists():
        con = sqlite3.connect(str(DB))
        cur = con.cursor()
        counts = {}
        for t in ("series", "prices_weekly", "prices_monthly", "returns_weekly", "returns_monthly"):
            try:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                counts[t] = cur.fetchone()[0]
            except Exception as e:
                counts[t] = f"ERROR: {e}"
        con.close()
        findings["sqlite_counts"] = counts
        print(f"\n[5] SQLite counts: {counts}")
    else:
        print("\n[5] SQLite db missing")

    OUT.write_text(json.dumps(findings, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
