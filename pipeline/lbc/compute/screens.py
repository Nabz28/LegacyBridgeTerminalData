"""Cross-sectional screens: which names inside each desk deserve attention.

The composite is deliberately simple and fully observable from price history,
because everything here must be reproducible and auditable:

  momentum      12-1 month return, the most durable cross-sectional equity signal
  trend         price vs 200d, confirmation not prediction
  rel_strength  performance vs the desk's own basket (isolates stock from sector)
  reversion     distance from 52w high, penalised only in the extreme
  vol_penalty   annualised vol, high vol demoted at equal score

Direction follows the desk stance: an underweight desk screens for shorts.
Candidates are stored ranked per desk; the brief shows the top few that are not
already in the book.
"""
from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from . import stats
from .. import db


def _metrics(px: pd.Series, basket: pd.Series) -> dict | None:
    px = px.dropna()
    if len(px) < 200:
        return None
    last = float(px.iloc[-1])
    r12_1 = float(px.iloc[-21] / px.iloc[-252] - 1) if len(px) >= 253 else None
    r63 = float(px.iloc[-1] / px.iloc[-64] - 1) if len(px) >= 64 else None
    r21 = float(px.iloc[-1] / px.iloc[-22] - 1) if len(px) >= 22 else None
    ma200 = float(px.tail(200).mean())
    high52 = float(px.tail(252).max()) if len(px) >= 252 else float(px.max())
    vol = float(px.pct_change(fill_method=None).tail(63).std() * np.sqrt(252))

    rel = None
    if basket is not None and not basket.empty:
        df = pd.concat([px.rename("p"), basket.rename("b")], axis=1).dropna()
        if len(df) >= 64:
            rel = float((df["p"].iloc[-1] / df["p"].iloc[-64]) / (df["b"].iloc[-1] / df["b"].iloc[-64]) - 1)

    return {
        "last": round(last, 4),
        "ret_12_1": None if r12_1 is None else round(r12_1, 4),
        "ret_63d": None if r63 is None else round(r63, 4),
        "ret_21d": None if r21 is None else round(r21, 4),
        "vs_ma200": round(last / ma200 - 1, 4) if ma200 else None,
        "from_52w_high": round(last / high52 - 1, 4) if high52 else None,
        "rel_strength_63d": None if rel is None else round(rel, 4),
        "vol_ann": round(vol, 4) if vol == vol else None,
    }


def _zs(values: list[float]) -> list[float]:
    arr = np.array([v if v is not None else np.nan for v in values], dtype=float)
    mu, sd = np.nanmean(arr), np.nanstd(arr)
    if not sd or np.isnan(sd) or sd == 0:
        return [0.0] * len(values)
    z = (arr - mu) / sd
    return [0.0 if np.isnan(x) else float(np.clip(x, -3, 3)) for x in z]


def run(today: str | None = None, per_desk: int = 5) -> int:
    today = today or dt.date.today().isoformat()
    desks = db.select("research", "desk", "select=id,name,tickers,benchmark&active=eq.true&order=sort_order")
    dials = {d["desk_id"]: d for d in db.select("research", "dial", "select=desk_id,stance,machine_score")}
    book = {r["symbol"] for r in db.select("asset_mgmt", "positions", "select=symbol&status=eq.open")}
    names = {r["ticker"]: r.get("name") for r in db.select("mkt", "instrument", "select=ticker,name")}

    written = 0
    for desk in desks:
        # screens rank tradeable single names; indexes, futures and FX crosses
        # belong on the dial, not on a watchlist
        tickers = [t for t in desk["tickers"][: stats.BASKET_N * 2]
                   if not t.startswith("^") and "=" not in t]
        if len(tickers) < 3:
            continue
        basket = stats.basket_index([t for t in desk["tickers"][: stats.BASKET_N]
                                     if not t.startswith("^") and "=" not in t])
        rows = []
        for t in tickers:
            m = _metrics(stats.load_close(t), basket)
            if m:
                rows.append((t, m))
        if len(rows) < 3:
            continue

        mom = _zs([m["ret_12_1"] for _, m in rows])
        rel = _zs([m["rel_strength_63d"] for _, m in rows])
        trend = _zs([m["vs_ma200"] for _, m in rows])
        drawdown = _zs([m["from_52w_high"] for _, m in rows])
        volz = _zs([m["vol_ann"] for _, m in rows])

        dial = dials.get(desk["id"], {})
        stance = dial.get("stance", "N")
        side = "short" if stance == "UW" else "long"
        sign = -1 if side == "short" else 1

        scored = []
        for i, (t, m) in enumerate(rows):
            composite = sign * (1.0 * mom[i] + 0.8 * rel[i] + 0.5 * trend[i]) \
                + 0.2 * (-drawdown[i] * sign) - 0.3 * volz[i]
            scored.append((t, m, float(composite)))
        scored.sort(key=lambda x: -x[2])

        for t, m, sc in scored[:per_desk]:
            bits = []
            if m["ret_12_1"] is not None:
                bits.append(f"12-1m {m['ret_12_1']:+.0%}")
            if m["rel_strength_63d"] is not None:
                bits.append(f"vs desk {m['rel_strength_63d']:+.0%} over 3m")
            if m["from_52w_high"] is not None:
                bits.append(f"{m['from_52w_high']:+.0%} from 52w high")
            rows_out = {
                "asof": today, "desk_id": desk["id"], "ticker": t,
                "name": names.get(t), "score": round(sc, 3), "side": side,
                "reason": f"{desk['name']} {stance}: " + ", ".join(bits),
                "metrics": m, "in_book": t.split(".")[0] in book,
            }
            db.upsert("research", "candidate", [rows_out], on_conflict="asof,desk_id,ticker")
            written += 1
    return written


def top_candidates(today: str | None = None, limit: int = 5,
                   exclude_book: bool = True) -> list[dict]:
    today = today or dt.date.today().isoformat()
    q = f"select=*&asof=eq.{today}&order=score.desc"
    rows = db.select("research", "candidate", q, limit=200)
    if exclude_book:
        rows = [r for r in rows if not r["in_book"]]
    # one per desk so the list is not five names from the same sector
    seen, out = set(), []
    for r in rows:
        if r["desk_id"] in seen:
            continue
        seen.add(r["desk_id"])
        out.append(r)
        if len(out) >= limit:
            break
    return out
