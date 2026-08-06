"""Cross-cutting signal generators: momentum, relationship breaks, flows,
crowding, news anomalies. Run nightly after dials."""
from __future__ import annotations

import datetime as dt

import numpy as np

from . import stats
from .. import db

COT_DESKS = {
    "pos.cot.gold": ("precious-metals", "gold"),
    "pos.cot.silver": ("precious-metals", "silver"),
    "pos.cot.copper": ("base-battery-bulk", "copper"),
    "pos.cot.wti": ("oil-gas", "WTI"),
    "pos.cot.usd": ("us", "USD index"),
}


def _write(signals: list[dict]) -> int:
    if not signals:
        return 0
    graveyard = {(g["kind"], g["desk_id"]) for g in db.select("research", "graveyard", "select=kind,desk_id")}
    live = [s for s in signals if (s["kind"], s["desk_id"]) not in graveyard]
    return db.upsert("research", "signal", live, on_conflict="dedupe_key,asof")


def momentum_signals(today: str) -> list[dict]:
    out = []
    desks = db.select("research", "desk", "select=id,name,tickers&active=eq.true")
    for desk in desks:
        idx = stats.basket_index(desk["tickers"][:stats.BASKET_N])
        if len(idx) < 240:
            continue
        r20 = stats.change(idx, 20)
        r5 = stats.change(idx, 5)
        ma50 = idx.rolling(50).mean()
        ma200 = idx.rolling(200).mean()
        if len(ma200.dropna()) > 2:
            above_now = ma50.iloc[-1] > ma200.iloc[-1]
            above_prev = ma50.iloc[-6] > ma200.iloc[-6]
            if above_now != above_prev:
                out.append({
                    "asof": today, "desk_id": desk["id"], "kind": "momentum_flip",
                    "ref": desk["id"],
                    "headline": f"{desk['name']} basket {'golden' if above_now else 'death'} cross (50/200)",
                    "payload": {"r20": r20, "r5": r5},
                    "salience": 60, "direction": 1 if above_now else -1,
                    "dedupe_key": f"momentum_cross:{desk['id']}",
                })
        if r5 is not None and abs(r5) >= 0.05:
            out.append({
                "asof": today, "desk_id": desk["id"], "kind": "momentum_flip",
                "ref": desk["id"],
                "headline": f"{desk['name']} basket moved {r5:+.1%} in 5 sessions",
                "payload": {"r5": r5, "r20": r20},
                "salience": int(min(85, 40 + abs(r5) * 400)),
                "direction": 1 if r5 > 0 else -1,
                "dedupe_key": f"momentum_5d:{desk['id']}",
            })
    return out


def relationship_breaks(today: str) -> list[dict]:
    """The highest-value alert: basket stopped tracking its top driver."""
    out = []
    desks = db.select("research", "desk", "select=id,name,tickers&active=eq.true&kind=eq.industry")
    drivers = db.select("research", "driver", "select=desk_id,series_key,label,weight&active=eq.true")
    by_desk = {}
    for d in drivers:
        by_desk.setdefault(d["desk_id"], []).append(d)
    for desk in desks:
        dlist = sorted(by_desk.get(desk["id"], []), key=lambda x: -float(x["weight"]))
        if not dlist:
            continue
        top = dlist[0]
        drv_series = stats.load_series(top["series_key"])
        basket = stats.basket_index(desk["tickers"][:stats.BASKET_N])
        if drv_series.empty or basket.empty:
            continue
        cs, cl, broke = stats.rolling_corr_break(basket, drv_series)
        if broke:
            out.append({
                "asof": today, "desk_id": desk["id"], "kind": "rel_break",
                "ref": top["series_key"],
                "headline": f"{desk['name']} stopped tracking {top['label']} "
                            f"(corr {cl:+.2f} -> {cs:+.2f} over 60d)",
                "payload": {"corr_60d": cs, "corr_252d": cl, "driver": top["series_key"]},
                "salience": 80, "direction": 0,
                "dedupe_key": f"rel_break:{desk['id']}:{top['series_key']}",
            })
    return out


def flow_signals(today: str) -> list[dict]:
    out = []
    s = stats.load_series("id.flow.foreign")
    if len(s) > 60:
        z5 = stats.z_move(s.cumsum(), lookback=5)  # 5d net flow burst vs history
        if z5 is not None and abs(z5) >= 2:
            out.append({
                "asof": today, "desk_id": "indonesia", "kind": "flow_anomaly",
                "ref": "id.flow.foreign",
                "headline": f"IDX foreign flow burst: 5d net {'+buy' if z5 > 0 else 'sell'} at {abs(z5):.1f} sigma",
                "payload": {"z5": z5, "latest_bn_idr": float(s.iloc[-1])},
                "salience": int(min(85, 45 + abs(z5) * 10)),
                "direction": 1 if z5 > 0 else -1,
                "dedupe_key": "flow_idx_5d",
            })
    out.extend(stock_flow_signals(today))
    return out


def stock_flow_signals(today: str, lookback_days: int = 20, top_n: int = 4) -> list[dict]:
    """Sustained foreign accumulation or distribution in individual IDX names.

    Foreign net buy per stock is the highest-signal Indonesian dataset available
    and nothing else in the system reads it. What matters is persistence, not one
    big print: a name bought on most of the last twenty sessions is being
    accumulated, whereas a single block trade is noise.
    """
    import pandas as pd

    since = (dt.date.fromisoformat(today) - dt.timedelta(days=lookback_days * 2)).isoformat()
    rows = db.select("mkt", "flow",
                     f"select=date,ticker,net,value_total&market=eq.idx&date=gte.{since}"
                     f"&ticker=neq._market", limit=None)
    if len(rows) < 500:
        return []
    df = pd.DataFrame(rows)
    df["net"] = pd.to_numeric(df["net"], errors="coerce")
    df["value_total"] = pd.to_numeric(df["value_total"], errors="coerce")
    df = df.dropna(subset=["net"])

    sessions = sorted(df["date"].unique())[-lookback_days:]
    if len(sessions) < 10:
        return []
    win = df[df["date"].isin(sessions)]

    agg = win.groupby("ticker").agg(
        net_sum=("net", "sum"),
        days=("net", "size"),
        buy_days=("net", lambda x: int((x > 0).sum())),
        turnover=("value_total", "sum"),
    )
    # only liquid names: a huge percentage flow into an illiquid stock is noise
    agg = agg[(agg["days"] >= len(sessions) * 0.6) & (agg["turnover"] > 0)]
    if agg.empty:
        return []
    agg["persistence"] = agg["buy_days"] / agg["days"]
    agg["net_pct_turnover"] = agg["net_sum"] / agg["turnover"]
    liquid = agg[agg["turnover"] >= agg["turnover"].quantile(0.70)].copy()
    if len(liquid) < 20:
        return []

    # Net flow as a share of turnover is naturally tiny (the cross-section tops
    # out near 1%), so absolute thresholds are meaningless here. Rank within the
    # day's cross-section instead: what counts is being an outlier among peers.
    liquid["flow_rank"] = liquid["net_pct_turnover"].rank(pct=True)

    out = []
    for side, sign in (("accumulation", 1), ("distribution", -1)):
        if sign > 0:
            cand = liquid[(liquid["persistence"] >= 0.70) & (liquid["flow_rank"] >= 0.95)]
            cand = cand.sort_values("net_pct_turnover", ascending=False)
        else:
            cand = liquid[(liquid["persistence"] <= 0.30) & (liquid["flow_rank"] <= 0.05)]
            cand = cand.sort_values("net_pct_turnover", ascending=True)
        for ticker, r in cand.head(top_n).iterrows():
            bought = int(r["buy_days"])
            sess = int(r["days"])
            phrase = (f"bought on {bought} of {sess} sessions" if sign > 0
                      else f"sold on {sess - bought} of {sess} sessions")
            out.append({
                "asof": today, "desk_id": "indonesia", "kind": "stock_flow",
                "ref": f"{ticker}.JK",
                "headline": f"{ticker}: sustained foreign {side}, {phrase}, "
                            f"net {r['net_pct_turnover']:+.2%} of turnover",
                "payload": {"ticker": ticker, "net_idr": float(r["net_sum"]),
                            "pct_of_turnover": round(float(r["net_pct_turnover"]), 5),
                            "persistence": round(float(r["persistence"]), 2),
                            "cross_section_rank": round(float(r["flow_rank"]), 3),
                            "buy_days": bought, "sessions": sess},
                "salience": int(min(78, 52 + abs(r["flow_rank"] - 0.5) * 40)),
                "direction": sign,
                "dedupe_key": f"stock_flow:{ticker}",
            })
    return out


def crowding_signals(today: str) -> list[dict]:
    out = []
    for key, (desk_id, label) in COT_DESKS.items():
        s = stats.load_series(key, days=365 * 4)
        if len(s) < 100:
            continue
        pct = stats.pctile_latest(s, window=156)  # 3y of weekly
        if pct is None:
            continue
        if pct >= 92 or pct <= 8:
            side = "long" if pct >= 92 else "short"
            out.append({
                "asof": today, "desk_id": desk_id, "kind": "crowding",
                "ref": key,
                "headline": f"CFTC {label} specs at {pct:.0f}th percentile {side} (crowded)",
                "payload": {"pctile_3y": pct, "net_contracts": float(s.iloc[-1])},
                "salience": 65, "direction": -1 if pct >= 92 else 1,  # crowded = fade
                "dedupe_key": f"crowding:{key}",
            })
    return out


def run(today: str | None = None) -> int:
    # news volume/tone anomalies are emitted by compute/sentiment.py off the
    # research.news feed, which carries headlines as well as counts
    today = today or dt.date.today().isoformat()
    total = 0
    for fn in (momentum_signals, relationship_breaks, flow_signals, crowding_signals):
        try:
            total += _write(fn(today))
        except Exception as e:
            print(f"  {fn.__name__} failed: {e}")
    return total
