"""Statistical primitives for the signal engine. numpy/pandas only."""
from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from .. import db


def load_series(series_key: str, days: int = 900) -> pd.Series:
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    rows = db.select("mkt", "observation",
                     f"select=date,value&series_key=eq.{series_key}&date=gte.{since}&order=date.asc",
                     limit=None)
    if not rows:
        return pd.Series(dtype=float)
    s = pd.Series({pd.Timestamp(r["date"]): r["value"] for r in rows}).sort_index()
    return s[~s.index.duplicated(keep="last")]


def load_close(ticker: str, days: int = 900) -> pd.Series:
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    rows = db.select("mkt", "price",
                     f"select=date,close&ticker=eq.{ticker}&date=gte.{since}&order=date.asc",
                     limit=None)
    if not rows:
        return pd.Series(dtype=float)
    s = pd.Series({pd.Timestamp(r["date"]): r["close"] for r in rows}).sort_index()
    return s[~s.index.duplicated(keep="last")]


def basket_index(tickers: list[str], days: int = 900) -> pd.Series:
    """Equal-weight total-return-ish index from closes (rebased daily returns)."""
    frames = []
    for t in tickers:
        s = load_close(t, days)
        if len(s) > 30:
            frames.append(s.pct_change(fill_method=None).rename(t))
    if not frames:
        return pd.Series(dtype=float)
    rets = pd.concat(frames, axis=1)
    mean_ret = rets.mean(axis=1, skipna=True)
    return (1 + mean_ret.fillna(0)).cumprod()


def zscore_latest(s: pd.Series, window: int = 252) -> float | None:
    s = s.dropna()
    if len(s) < 40:
        return None
    tail = s.tail(window)
    sd = tail.std()
    if not sd or np.isnan(sd) or sd == 0:
        return None
    return float((s.iloc[-1] - tail.mean()) / sd)


def pctile_latest(s: pd.Series, window: int = 252) -> float | None:
    s = s.dropna()
    if len(s) < 40:
        return None
    tail = s.tail(window)
    return float((tail <= s.iloc[-1]).mean() * 100)


def change(s: pd.Series, periods: int) -> float | None:
    s = s.dropna()
    if len(s) <= periods:
        return None
    prev = s.iloc[-1 - periods]
    if prev == 0:
        return None
    return float(s.iloc[-1] / prev - 1)


def z_move(s: pd.Series, lookback: int = 5, window: int = 252) -> float | None:
    """How many sigmas did the series move over the last `lookback` obs."""
    s = s.dropna()
    if len(s) < window // 2 + lookback:
        return None
    diffs = s.diff(lookback).dropna()
    tail = diffs.tail(window)
    sd = tail.std()
    if not sd or sd == 0 or np.isnan(sd):
        return None
    return float(diffs.iloc[-1] / sd)


def rolling_corr_break(a: pd.Series, b: pd.Series, short: int = 60, long: int = 252):
    """Return (corr_short, corr_long, broke) on aligned pct-changes."""
    df = pd.concat([a.rename("a"), b.rename("b")], axis=1).dropna()
    if len(df) < long:
        return None, None, False
    ra, rb = df["a"].pct_change(fill_method=None), df["b"].pct_change(fill_method=None)
    cs = ra.tail(short).corr(rb.tail(short))
    cl = ra.tail(long).corr(rb.tail(long))
    if np.isnan(cs) or np.isnan(cl):
        return None, None, False
    return float(cs), float(cl), bool(abs(cl) > 0.35 and (cl - cs) > 0.4 * np.sign(cl) and abs(cs) < abs(cl) - 0.35)


def cusum_break(s: pd.Series, threshold_sd: float = 4.0, window: int = 252) -> bool:
    """Lightweight CUSUM on recent returns: structural drift beyond threshold."""
    r = s.pct_change(fill_method=None).dropna().tail(window)
    if len(r) < 60:
        return False
    base = r.iloc[:-21]
    mu, sd = base.mean(), base.std()
    if not sd or sd == 0 or np.isnan(sd):
        return False
    recent = r.iloc[-21:]
    cusum = ((recent - mu) / sd).cumsum()
    return bool(abs(cusum.iloc[-1]) > threshold_sd)


def pca_weights(returns: pd.DataFrame) -> tuple[np.ndarray, np.ndarray] | None:
    """PCA via SVD on standardized returns. Returns (explained_ratio, first_pc_loadings)."""
    df = returns.dropna(how="any")
    if df.shape[0] < 40 or df.shape[1] < 2:
        return None
    x = (df - df.mean()) / df.std().replace(0, np.nan)
    x = x.dropna(axis=1, how="any")
    if x.shape[1] < 2:
        return None
    u, s_, vt = np.linalg.svd(x.values, full_matrices=False)
    var = s_ ** 2
    explained = var / var.sum()
    return explained, vt[0]
