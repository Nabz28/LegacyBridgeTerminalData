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
        idx = stats.basket_index(desk["tickers"][:12])
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
        basket = stats.basket_index(desk["tickers"][:12])
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


def news_signals(today: str) -> list[dict]:
    out = []
    desks = db.select("research", "desk", "select=id,name&active=eq.true")
    for desk in desks:
        s = stats.load_series(f"news.vol.{desk['id']}", days=100)
        if len(s) < 40:
            continue
        z = stats.zscore_latest(s, window=90)
        if z is not None and z >= 3:
            out.append({
                "asof": today, "desk_id": desk["id"], "kind": "news_anomaly",
                "ref": f"news.vol.{desk['id']}",
                "headline": f"News volume on {desk['name']} at {z:.1f} sigma above normal",
                "payload": {"z": z, "latest_vol": float(s.iloc[-1])},
                "salience": int(min(75, 40 + z * 8)), "direction": 0,
                "dedupe_key": f"news_vol:{desk['id']}",
            })
    return out


def run(today: str | None = None) -> int:
    today = today or dt.date.today().isoformat()
    total = 0
    for fn in (momentum_signals, relationship_breaks, flow_signals, crowding_signals, news_signals):
        try:
            total += _write(fn(today))
        except Exception as e:
            print(f"  {fn.__name__} failed: {e}")
    return total
