"""Book analytics: nightly marks context, invalidation distance, PCA factor
concentration, sizing-rule checks. Reads asset_mgmt (The Book) read-only,
writes research.signal + research.config['book_state']."""
from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

from . import stats
from .. import db


def open_positions() -> list[dict]:
    return db.select("asset_mgmt", "positions",
                     "select=id,fund_id,symbol,exchange,name,currency,direction,quantity,avg_cost,status"
                     "&status=eq.open")


def _yahoo_ticker(symbol: str, exchange: str | None) -> str:
    if exchange and exchange.upper() == "IDX" and not symbol.endswith(".JK"):
        return f"{symbol}.JK"
    return symbol


def run(today: str | None = None) -> dict:
    today = today or dt.date.today().isoformat()
    positions = open_positions()
    theses = db.select("research", "thesis", "select=*&status=in.(open,wounded)")
    thesis_by_ticker = {t["ticker"]: t for t in theses if t.get("ticker")}

    signals, pos_state, rets = [], [], {}
    for p in positions:
        yt = _yahoo_ticker(p["symbol"], p.get("exchange"))
        s = stats.load_close(yt, days=400)
        if s.empty:
            pos_state.append({"symbol": p["symbol"], "ticker": yt, "note": "no price data"})
            continue
        last = float(s.iloc[-1])
        avg_cost = float(p["avg_cost"] or 0)
        is_short = (p.get("direction") or "long").lower() == "short"
        # A short at 100 now trading 130 is down 30%, not up 30%.
        pnl_pct = None
        if avg_cost:
            raw = last / avg_cost - 1
            pnl_pct = -raw if is_short else raw
        rets[yt] = s.pct_change(fill_method=None).tail(180) * (-1 if is_short else 1)

        th = thesis_by_ticker.get(p["symbol"]) or thesis_by_ticker.get(yt)
        stop = float(th["stop"]) if th and th.get("stop") else None
        desk_id = th.get("desk_id") if th else None
        state = {
            "symbol": p["symbol"], "ticker": yt, "fund": p["fund_id"],
            "direction": "short" if is_short else "long",
            "last": last, "avg_cost": avg_cost,
            "pnl_pct": None if pnl_pct is None else round(pnl_pct, 4),
            "thesis_id": th["id"] if th else None, "stop": stop,
        }
        # invalidation / cut-loss proximity. ref carries the yahoo ticker so the
        # audit loop grades the signal against the actual instrument.
        cut_loss = -0.20
        if pnl_pct is not None and pnl_pct <= cut_loss:
            signals.append({
                "asof": today, "desk_id": desk_id, "kind": "book_risk", "ref": yt,
                "headline": f"{p['symbol']} through the -20% cut-loss rule ({pnl_pct:+.1%} vs cost)",
                "payload": state, "salience": 95, "direction": -1,
                "dedupe_key": f"cutloss:{p['symbol']}",
            })
        elif pnl_pct is not None and pnl_pct <= cut_loss + 0.05:
            signals.append({
                "asof": today, "desk_id": desk_id, "kind": "book_risk", "ref": yt,
                "headline": f"{p['symbol']} within 5pts of the cut-loss rule ({pnl_pct:+.1%})",
                "payload": state, "salience": 80, "direction": -1,
                "dedupe_key": f"cutloss_near:{p['symbol']}",
            })
        stop_hit = (last >= stop * 0.95) if (stop and is_short) else (last <= stop * 1.05 if stop else False)
        if stop_hit:
            signals.append({
                "asof": today, "desk_id": desk_id, "kind": "book_risk", "ref": yt,
                "headline": f"{p['symbol']} within 5% of thesis stop {stop:g} (last {last:g})",
                "payload": state, "salience": 90, "direction": -1,
                "dedupe_key": f"stop_near:{p['symbol']}",
            })
        pos_state.append(state)

    # Factor concentration via PCA. One freshly opened position would otherwise
    # truncate the whole frame to its own short history and silently return
    # None, so names without enough overlap are dropped instead of the rows.
    concentration = None
    if len(rets) >= 3:
        df = pd.DataFrame(rets)
        keep = [c for c in df.columns if df[c].notna().sum() >= 60]
        if len(keep) >= 3:
            df = df[keep].dropna(how="any")
        else:
            df = df.dropna(how="any")
        res = stats.pca_weights(df)
        if res:
            explained, loadings = res
            concentration = float(explained[0])
            if concentration >= 0.6:
                signals.append({
                    "asof": today, "desk_id": None, "kind": "book_risk", "ref": "_book",
                    "headline": f"{concentration:.0%} of book variance is one factor "
                                f"({len(rets)} positions behaving as one bet)",
                    "payload": {"explained_first_pc": concentration,
                                "loadings": {t: round(float(l), 2) for t, l in zip(df.columns, loadings)}},
                    "salience": 85, "direction": -1,
                    "dedupe_key": "book_concentration",
                })

    # NAV context
    nav = db.select("asset_mgmt", "nav_snapshots", "select=*&order=as_of.desc", limit=22)
    nav_state = {}
    if nav:
        latest = nav[0]
        nav_state = {"as_of": latest["as_of"], "nav": float(latest["nav"]),
                     "cash": float(latest["cash"]), "positions_value": float(latest["positions_value"])}
        month_start = [n for n in nav if n["as_of"][:7] == latest["as_of"][:7]]
        if month_start:
            first = month_start[-1]
            if float(first["nav"]):
                nav_state["mtd_pct"] = round(float(latest["nav"]) / float(first["nav"]) - 1, 4)

    book_state = {
        "asof": today, "positions": pos_state, "nav": nav_state,
        "factor_concentration": concentration, "n_positions": len(positions),
    }
    db.set_config("book_state", book_state)

    if signals:
        graveyard = {(g["kind"], g["desk_id"])
                     for g in db.select("research", "graveyard", "select=kind,desk_id")}
        live = [s for s in signals if (s["kind"], s["desk_id"]) not in graveyard]
        if live:
            db.upsert("research", "signal", live, on_conflict="dedupe_key,asof")
        signals = live
    return {"positions": len(positions), "signals": len(signals),
            "concentration": concentration}
