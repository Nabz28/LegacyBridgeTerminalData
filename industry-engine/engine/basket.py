"""
basket.py — build an IDX equity basket's return index and excess return vs IHSG.

Prices come from the local correlation.sqlite (already populated, 2.6M weekly
rows). Missing/short members are backfilled from yfinance (.JK). The basket index
is mcap-weighted (cap floats are fixed at the current snapshot — a reasonable
proxy; equal-weight is computed too for robustness).

Outputs pandas return Series at weekly / monthly / quarterly frequency, plus the
benchmark (IHSG = live_indicators 'jci' -> its observations) aligned the same way.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

import common as C

MIN_WEEKS = 60          # require >= ~14 months of price history per usable member
BENCH_CORR = "IDX:COMPOSITE"   # IHSG / JKSE — deep weekly history in correlation.sqlite


def _series_from_pairs(pairs) -> pd.Series:
    if not pairs:
        return pd.Series(dtype=float)
    idx = pd.to_datetime([d for d, _ in pairs])
    vals = [v for _, v in pairs]
    s = pd.Series(vals, index=idx).sort_index()
    s = s[~s.index.duplicated(keep="last")]
    return s


def _load_member_prices(members: list) -> dict:
    """Return {symbol: weekly close Series}. sqlite first, yfinance fallback."""
    tv_ids = [m["tv"] for m in members]
    sym_by_tv = {m["tv"]: m["symbol"] for m in members}
    px = C.sqlite_prices(tv_ids, "weekly")
    out: dict = {}
    missing = []
    for m in members:
        pairs = px.get(m["tv"])
        if pairs and len(pairs) >= MIN_WEEKS:
            out[m["symbol"]] = _series_from_pairs(pairs)
        else:
            missing.append(m)
    if missing:
        out.update(_yf_fallback(missing))
    return out


def _yf_fallback(members: list) -> dict:
    out: dict = {}
    try:
        import warnings
        warnings.filterwarnings("ignore")
        import yfinance as yf
    except Exception as e:  # noqa: BLE001
        C.log(f"yfinance unavailable: {e}", level="WARN")
        return out
    syms = [m["yf"] for m in members]
    by_yf = {m["yf"]: m["symbol"] for m in members}
    try:
        df = yf.download(syms, period="6y", interval="1wk", progress=False,
                         auto_adjust=True, threads=True)
        close = df["Close"] if isinstance(df.columns, pd.MultiIndex) else df
        if isinstance(close, pd.Series):
            close = close.to_frame(syms[0])
        for col in close.columns:
            sym = by_yf.get(col, col.replace(".JK", ""))
            s = close[col].dropna()
            if len(s) >= MIN_WEEKS:
                out[sym] = s
    except Exception as e:  # noqa: BLE001
        C.log(f"yfinance fallback error: {e}", level="WARN")
    return out


def _cap_weights(w: pd.Series, cap: float) -> pd.Series:
    """Iteratively cap max single-name weight (institutional factor-basket style),
    spilling the excess to the others, so one controlled mega-cap (e.g. BYAN)
    cannot dominate and mask the sector's true driver sensitivity."""
    w = w / w.sum()
    for _ in range(50):
        over = w[w > cap]
        if over.empty:
            break
        excess = (over - cap).sum()
        w[w > cap] = cap
        under = w[w < cap]
        if under.sum() <= 0:
            break
        w[w < cap] = under + excess * (under / under.sum())
    return w / w.sum()


def _weighted_index(prices: dict, weights: dict, cap: float | None = 0.12) -> pd.Series:
    """mcap-weighted price index (rebased to 100), aligned on common weekly grid.
    `cap` limits any single name's weight (None = uncapped)."""
    if not prices:
        return pd.Series(dtype=float)
    df = pd.DataFrame(prices).sort_index()
    df = df.resample("W-FRI").last().ffill(limit=2)
    # weekly simple returns per name
    rets = df.pct_change()
    w = pd.Series({k: weights.get(k, 0.0) for k in df.columns}, dtype=float)
    w = w[w > 0]
    if w.empty:
        w = pd.Series(1.0, index=df.columns)
    w = w / w.sum()
    if cap and len(w) > 1 and 0 < cap < 1:
        w = _cap_weights(w, cap)
    # weighted portfolio return (only over names with a return that week)
    valid = rets[w.index].notna()
    eff_w = valid.mul(w, axis=1)
    eff_w = eff_w.div(eff_w.sum(axis=1).replace(0, np.nan), axis=0)
    port_ret = (rets[w.index] * eff_w).sum(axis=1, min_count=1)
    idx = (1.0 + port_ret.fillna(0)).cumprod() * 100.0
    idx[port_ret.isna()] = np.nan
    return idx.dropna()


def _benchmark_weekly() -> pd.Series:
    """IHSG benchmark — deep weekly history from correlation.sqlite (IDX:COMPOSITE)."""
    px = C.sqlite_prices([BENCH_CORR], "weekly")
    pairs = px.get(BENCH_CORR) or []
    s = _series_from_pairs(pairs)
    if s.empty:
        # fallback: macro.observations under 'jci' (recent only)
        obs = C.get_observations("jci", limit=6000)
        s = _series_from_pairs([(o["date"], o["value"]) for o in obs])
    if s.empty:
        return s
    return s.resample("W-FRI").last().ffill(limit=2)


def _ret_by_freq(price_idx: pd.Series) -> dict:
    """log returns at weekly/monthly/quarterly from a price index Series."""
    out = {}
    if price_idx.empty:
        return {"W": pd.Series(dtype=float), "M": pd.Series(dtype=float),
                "Q": pd.Series(dtype=float)}
    w = np.log(price_idx).diff().dropna()
    m = np.log(price_idx.resample("ME").last()).diff().dropna()
    q = np.log(price_idx.resample("QE").last()).diff().dropna()
    out["W"], out["M"], out["Q"] = w, m, q
    return out


def build_basket(basket: dict) -> dict:
    """Return a dict with basket return Series (raw + excess) by frequency."""
    members = basket["members"]
    weights = {m["symbol"]: float(m.get("mcap") or 0) for m in members}
    prices = _load_member_prices(members)
    used = sorted(prices.keys())
    C.log(f"  basket {basket['sub_sector']}: {len(used)}/{len(members)} members priced")
    idx_cap = _weighted_index(prices, weights)
    idx_eq = _weighted_index(prices, {k: 1.0 for k in prices})
    bench = _benchmark_weekly()

    cap = _ret_by_freq(idx_cap)
    eqw = _ret_by_freq(idx_eq)
    # benchmark returns aligned per frequency
    bench_idx = bench.dropna()
    bret = _ret_by_freq(bench_idx) if not bench_idx.empty else {
        "W": pd.Series(dtype=float), "M": pd.Series(dtype=float), "Q": pd.Series(dtype=float)}

    excess = {}
    for f in ("W", "M", "Q"):
        a, b = cap[f], bret[f]
        if a.empty or b.empty:
            excess[f] = a.copy()
        else:
            j = pd.concat([a.rename("b"), b.rename("m")], axis=1).dropna()
            excess[f] = (j["b"] - j["m"]).rename(None)

    return {
        "id": basket["id"], "sub_sector": basket["sub_sector"],
        "members_used": used, "n_used": len(used), "n_members": len(members),
        "price_index_cap": idx_cap, "price_index_eq": idx_eq,
        "ret_raw": cap, "ret_eqw": eqw, "ret_excess": excess,
        "bench_ret": bret,
        "coverage": {
            "W": int(len(cap["W"])), "M": int(len(cap["M"])), "Q": int(len(cap["Q"])),
            "first": (idx_cap.index.min().strftime("%Y-%m-%d") if not idx_cap.empty else None),
            "last": (idx_cap.index.max().strftime("%Y-%m-%d") if not idx_cap.empty else None),
        },
    }


if __name__ == "__main__":
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    b = next(x for x in wl["baskets"] if x["sub_sector"] == "Coal")
    r = build_basket(b)
    print("used", r["n_used"], "/", r["n_members"], "coverage", r["coverage"])
    print("monthly excess tail:\n", r["ret_excess"]["M"].tail().round(4))
