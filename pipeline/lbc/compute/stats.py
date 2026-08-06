"""Statistical primitives for the signal engine. numpy/pandas only."""
from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from .. import db


DEFAULT_DAYS = 1830  # 5 years: 60 monthly points or ~1260 daily


def load_series(series_key: str, days: int = DEFAULT_DAYS) -> pd.Series:
    """Load a series window. Ordered DESC so that if any cap ever truncates the
    result we lose the distant past, never the present."""
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    rows = db.select("mkt", "observation",
                     f"select=date,value&series_key=eq.{series_key}&date=gte.{since}&order=date.desc",
                     limit=None)
    if not rows:
        return pd.Series(dtype=float)
    s = pd.Series({pd.Timestamp(r["date"]): r["value"] for r in rows}).sort_index()
    return s[~s.index.duplicated(keep="last")]


def load_close(ticker: str, days: int = DEFAULT_DAYS) -> pd.Series:
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    rows = db.select("mkt", "price",
                     f"select=date,close&ticker=eq.{ticker}&date=gte.{since}&order=date.desc",
                     limit=None)
    if not rows:
        return pd.Series(dtype=float)
    s = pd.Series({pd.Timestamp(r["date"]): r["close"] for r in rows}).sort_index()
    return s[~s.index.duplicated(keep="last")]


BASKET_N = 12  # how many names represent a desk; must match everywhere


def basket_index(tickers: list[str], days: int = DEFAULT_DAYS,
                 min_share: float = 0.6) -> pd.Series:
    """Equal-weight index from closes.

    Two traps this guards against, both of which invent moves that never
    happened: (1) a day when only the Asian names print marks the whole desk at
    that one market's move, so days where fewer than `min_share` of the basket
    reports are dropped; (2) a name resuming after a suspension books its whole
    gap as one session, so per-name daily returns are capped at +/-25%.
    """
    frames = []
    for t in tickers:
        s = load_close(t, days)
        if len(s) > 30:
            frames.append(s.pct_change(fill_method=None).clip(-0.25, 0.25).rename(t))
    if not frames:
        return pd.Series(dtype=float)
    rets = pd.concat(frames, axis=1)
    reporting = rets.notna().sum(axis=1)
    enough = reporting >= max(1, int(len(frames) * min_share))
    rets = rets[enough]
    if rets.empty:
        return pd.Series(dtype=float)
    mean_ret = rets.mean(axis=1, skipna=True)
    return (1 + mean_ret.fillna(0)).cumprod()


def infer_freq(s: pd.Series) -> str:
    """'d' | 'w' | 'm' from the median spacing of the index."""
    if len(s) < 3:
        return "d"
    gap = float(np.median(np.diff(s.index.values).astype("timedelta64[D]").astype(int)))
    if gap >= 20:
        return "m"
    if gap >= 5:
        return "w"
    return "d"


def _window_for(s: pd.Series, window: int | None) -> tuple[int, int]:
    """(lookback window, minimum observations) scaled to the series frequency.
    A 252-point window means one year of dailies but 21 years of monthlies, so
    monthly series get their own year-equivalent and a lower bar to qualify."""
    freq = infer_freq(s)
    if freq == "m":
        return (window or 60, 24)     # 5y window, 2y minimum
    if freq == "w":
        return (window or 156, 30)    # 3y window
    return (window or 252, 40)


def zscore_latest(s: pd.Series, window: int | None = None) -> float | None:
    s = s.dropna()
    win, min_n = _window_for(s, window)
    if len(s) < min_n:
        return None
    tail = s.tail(win)
    sd = tail.std()
    if not sd or np.isnan(sd) or sd == 0:
        return None
    return float((s.iloc[-1] - tail.mean()) / sd)


def pctile_latest(s: pd.Series, window: int | None = None) -> float | None:
    s = s.dropna()
    win, min_n = _window_for(s, window)
    if len(s) < min_n:
        return None
    tail = s.tail(win)
    return float((tail <= s.iloc[-1]).mean() * 100)


def change(s: pd.Series, periods: int) -> float | None:
    s = s.dropna()
    if len(s) <= periods:
        return None
    prev = s.iloc[-1 - periods]
    if prev == 0:
        return None
    return float(s.iloc[-1] / prev - 1)


def z_move(s: pd.Series, lookback: int = 5, window: int | None = None) -> float | None:
    """How many sigmas the series moved over the last `lookback` observations.

    On a monthly series a 5-observation move spans five months, which is not a
    "5 session" move — the caller's lookback is capped to 1 for monthly data so
    the headline stays honest.
    """
    s = s.dropna()
    win, min_n = _window_for(s, window)
    if infer_freq(s) == "m":
        lookback = 1
    if len(s) < max(min_n, lookback + 10):
        return None
    diffs = s.diff(lookback).dropna()
    tail = diffs.tail(win)
    sd = tail.std()
    if not sd or sd == 0 or np.isnan(sd):
        return None
    return float(diffs.iloc[-1] / sd)


def _returns(s: pd.Series) -> pd.Series:
    """Percent change for price-like series, first difference for level series
    that cross or approach zero (a 3bp move on a 0.01 curve is not -300%)."""
    if (s <= 0).any() or float(s.abs().min()) < 0.25 * float(s.abs().median() or 1):
        return s.diff()
    return s.pct_change(fill_method=None)


def rolling_corr_break(a: pd.Series, b: pd.Series, short: int = 60, long: int = 252):
    """Return (corr_short, corr_long, broke) on aligned returns.

    "Broke" means the relationship weakened in its own direction: a +0.7
    correlation falling to +0.2, or a -0.7 rising to -0.2. Sign is handled by
    projecting the change onto sign(long), so negative baselines are detected
    identically to positive ones.
    """
    df = pd.concat([a.rename("a"), b.rename("b")], axis=1).dropna()
    if len(df) < long:
        return None, None, False
    ra, rb = _returns(df["a"]), _returns(df["b"])
    cs = ra.tail(short).corr(rb.tail(short))
    cl = ra.tail(long).corr(rb.tail(long))
    if np.isnan(cs) or np.isnan(cl):
        return None, None, False
    weakened = (cl - cs) * np.sign(cl) > 0.4
    decayed = abs(cs) < abs(cl) - 0.35          # relationship faded
    flipped = np.sign(cs) != np.sign(cl) and abs(cs) > 0.2  # inverted outright
    broke = bool(abs(cl) > 0.35 and weakened and (decayed or flipped))
    return float(cs), float(cl), broke


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
