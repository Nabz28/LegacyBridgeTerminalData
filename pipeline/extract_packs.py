"""Build evidence packs: one JSON per desk plus cross-cutting packs.

Analyst agents read these files instead of querying the database. Everything an
agent is allowed to assert must appear here, so the packs carry the numbers AND
their dates, and nothing is summarised away.

    python pipeline/extract_packs.py <output_dir>
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd

from lbc import db
from lbc.compute import stats

TODAY = dt.date.today().isoformat()


def series_block(key: str, label: str = "") -> dict:
    s = stats.load_series(key, days=1830)
    if s.empty:
        return {"series_key": key, "label": label, "status": "no data"}
    def chg(n):
        return None if len(s) <= n else round(float(s.iloc[-1] / s.iloc[-1 - n] - 1) * 100, 2)
    freq = stats.infer_freq(s)
    # monthly series: report level changes not percent-of-percent
    hist = s.tail(24 if freq == "m" else 60)
    return {
        "series_key": key, "label": label or key, "freq": freq,
        "latest": round(float(s.iloc[-1]), 4),
        "as_of": s.index[-1].date().isoformat(),
        "age_days": (dt.date.fromisoformat(TODAY) - s.index[-1].date()).days,
        "chg_1p_pct": chg(1), "chg_5p_pct": chg(5), "chg_21p_pct": chg(21),
        "chg_63p_pct": chg(63), "chg_252p_pct": chg(252),
        "z_vs_own_history": stats.zscore_latest(s),
        "percentile": stats.pctile_latest(s),
        "z_move_5p": stats.z_move(s, lookback=5),
        "n_obs": len(s),
        "history_sample": [[d.date().isoformat(), round(float(v), 4)]
                           for d, v in hist.items()][::max(1, len(hist) // 12)],
    }


def basket_block(tickers: list[str], limit: int = 14) -> list[dict]:
    out = []
    for t in tickers[:limit]:
        px = stats.load_close(t, days=500)
        if len(px) < 40:
            continue
        def r(n):
            return None if len(px) <= n else round(float(px.iloc[-1] / px.iloc[-1 - n] - 1) * 100, 2)
        hi52 = float(px.tail(252).max()) if len(px) >= 252 else float(px.max())
        out.append({
            "ticker": t, "last": round(float(px.iloc[-1]), 3),
            "as_of": px.index[-1].date().isoformat(),
            "ret_5d_pct": r(5), "ret_21d_pct": r(21), "ret_63d_pct": r(63),
            "ret_252d_pct": r(252),
            "from_52w_high_pct": round((float(px.iloc[-1]) / hi52 - 1) * 100, 2) if hi52 else None,
            "vol_ann_pct": round(float(px.pct_change(fill_method=None).tail(63).std() * np.sqrt(252)) * 100, 1),
        })
    return out


def main(outdir: str):
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)

    desks = db.select("research", "desk", "select=*&active=eq.true&order=sort_order")
    dials = {d["desk_id"]: d for d in db.select("research", "dial", "select=*")}
    drivers = db.select("research", "driver", "select=*&active=eq.true")
    all_news = db.select("research", "news",
                         "select=published_at,source,headline,summary,desk_ids,tickers,sentiment,sent_label,importance,region"
                         "&order=published_at.desc", limit=None)
    sentiment = {s["desk_id"]: s for s in db.select("research", "desk_sentiment", f"select=*&asof=eq.{TODAY}")}
    candidates = db.select("research", "candidate", f"select=*&asof=eq.{TODAY}&order=score.desc", limit=None)
    signals = db.select("research", "signal",
                        f"select=id,asof,desk_id,kind,ref,headline,payload,salience,direction"
                        f"&asof=gte.{(dt.date.fromisoformat(TODAY) - dt.timedelta(days=5)).isoformat()}"
                        f"&retired=eq.false&order=salience.desc", limit=None)
    cal = db.select("research", "calendar_flag",
                    f"select=*&event_date=gte.{TODAY}&order=event_date.asc", limit=200)

    manifest = []
    for desk in desks:
        did = desk["id"]
        ddrv = [d for d in drivers if d["desk_id"] == did]
        pack = {
            "generated": TODAY,
            "desk": {k: desk[k] for k in ("id", "name", "basket", "kind", "tickers", "benchmark")},
            "dial": dials.get(did),
            "drivers": [series_block(d["series_key"], d["label"]) | {
                "direction_for_desk": d["direction"], "weight": float(d["weight"]),
                "shared_factor": d.get("shared_factor"),
            } for d in ddrv],
            "basket_constituents": basket_block(desk["tickers"]),
            "benchmark": basket_block([desk["benchmark"]]) if desk.get("benchmark") else [],
            "signals": [s for s in signals if s["desk_id"] == did][:20],
            "news": [n for n in all_news if did in (n.get("desk_ids") or [])][:25],
            "sentiment": sentiment.get(did),
            "candidates": [c for c in candidates if c["desk_id"] == did],
            "calendar": [c for c in cal if did in (c.get("desk_ids") or [])][:15],
        }
        p = out / f"desk_{did}.json"
        p.write_text(json.dumps(pack, indent=1, default=str), encoding="utf-8")
        manifest.append({"desk_id": did, "name": desk["name"], "basket": desk["basket"],
                         "kind": desk["kind"], "file": p.name,
                         "bytes": p.stat().st_size})
        print(f"  {did:<26} {p.stat().st_size:>8,}b  drivers={len(pack['drivers'])} "
              f"names={len(pack['basket_constituents'])} news={len(pack['news'])} sig={len(pack['signals'])}")

    # ---- cross-cutting packs ----
    macro_keys = [
        ("us.rate.dff", "Fed funds"), ("us.rate.dgs2", "UST 2y"), ("us.rate.dgs10", "UST 10y"),
        ("us.rate.dgs30", "UST 30y"), ("us.rate.t10y2y", "10y-2y curve"),
        ("us.rate.real10", "US real 10y"), ("us.infl.cpi_core", "Core CPI"),
        ("us.infl.cpi", "Headline CPI"), ("us.infl.ppi", "PPI final demand"),
        ("us.act.payems", "Nonfarm payrolls"), ("us.act.unrate", "Unemployment rate"),
        ("us.act.avghrs", "Mfg weekly hours"), ("us.liq.m2", "M2"),
        ("us.credit.cond", "Credit conditions HYG/IEF"), ("us.act.cyclical", "Cyclical appetite XLY/XLP"),
        ("us.act.housing", "Housing momentum XHB/SPX"), ("us.vol.vix", "VIX"),
        ("us.vol.move", "MOVE"), ("us.fx.dxy", "Dollar index"),
        ("eu.rate.dfr", "ECB deposit rate"),
    ]
    market_keys = [
        ("idx.spx", "S&P 500"), ("idx.ndx", "Nasdaq 100"), ("idx.sox", "Philadelphia semis"),
        ("idx.jkse", "Jakarta Composite"), ("idx.hsi", "Hang Seng"),
        ("idx.csi300", "China A-shares"), ("idx.china_bx", "China broad"),
        ("idx.twii", "Taiwan"), ("idx.n225", "Nikkei"), ("idx.kospi", "KOSPI"),
        ("idx.stoxx", "Euro Stoxx 50"), ("idx.dax", "DAX"),
        ("eu.eq.broad", "Europe broad"), ("eu.eq.germany", "Germany"),
        ("crypto.btc", "Bitcoin"),
    ]
    cmd_keys = [
        ("cmd.oil.brent", "Brent"), ("cmd.oil.wti", "WTI"), ("cmd.gas.hh", "Henry Hub"),
        ("cmd.ngas_ttf", "TTF"), ("cmd.gold", "Gold"), ("cmd.silver", "Silver"),
        ("cmd.copper", "Copper"), ("cmd.aluminum", "Aluminium"),
        ("cmd.soybean", "Soybeans"), ("cmd.corn", "Corn"), ("cmd.wheat", "Wheat"),
        ("cmd.soyoil", "Soy oil"), ("cmd.coal.hba", "HBA coal"),
        ("cmd.coal.equity", "Coal equity"), ("cmd.gsci", "GSCI"),
    ]
    fx_keys = [("fx.usdidr", "USD/IDR"), ("fx.usdjpy", "USD/JPY"), ("fx.usdkrw", "USD/KRW"),
               ("fx.usdcnh", "USD/CNY"), ("fx.eurusd", "EUR/USD")]
    pos_keys = [("pos.cot.gold", "COT gold"), ("pos.cot.silver", "COT silver"),
                ("pos.cot.copper", "COT copper"), ("pos.cot.wti", "COT WTI"),
                ("pos.cot.usd", "COT dollar")]
    flow_keys = [("id.flow.foreign", "IDX foreign net buy"), ("tw.tsmc.rev", "TSMC monthly revenue")]

    for name, keys in [("macro", macro_keys), ("markets", market_keys), ("commodities", cmd_keys),
                       ("fx", fx_keys), ("positioning", pos_keys), ("flows", flow_keys)]:
        blocks = [series_block(k, l) for k, l in keys]
        (out / f"pack_{name}.json").write_text(
            json.dumps({"generated": TODAY, "series": blocks}, indent=1, default=str), encoding="utf-8")
        print(f"  pack_{name}: {len(blocks)} series")

    # global regime + book + all signals + all news + calendar + candidates
    (out / "pack_global.json").write_text(json.dumps({
        "generated": TODAY,
        "global_regime": db.get_config("global_regime", {}),
        "book_state": db.get_config("book_state", {}),
        "sizing_rules": db.get_config("sizing_rules", {}),
        "dials_all": [{k: d.get(k) for k in ("desk_id", "stance", "machine_stance", "conviction",
                                             "machine_score", "regime", "what_changed", "flip_condition")}
                      for d in dials.values()],
        "signals_all": signals[:120],
        "calendar_30d": cal[:60],
        "top_candidates": candidates[:40],
        "desk_sentiment_all": list(sentiment.values()),
        "latest_brief": (db.select("research", "brief", "select=kind,asof,body&kind=eq.morning&order=asof.desc", limit=1) or [None])[0],
    }, indent=1, default=str), encoding="utf-8")

    # IDX per-stock foreign flow, the local edge
    flow_rows = db.select("mkt", "flow",
                          f"select=date,ticker,net,value_total&market=eq.idx"
                          f"&date=gte.{(dt.date.fromisoformat(TODAY) - dt.timedelta(days=45)).isoformat()}"
                          f"&ticker=neq._market", limit=None)
    if flow_rows:
        df = pd.DataFrame(flow_rows)
        df["net"] = pd.to_numeric(df["net"], errors="coerce")
        df["value_total"] = pd.to_numeric(df["value_total"], errors="coerce")
        sess = sorted(df["date"].unique())[-20:]
        w = df[df["date"].isin(sess)]
        agg = w.groupby("ticker").agg(net_idr=("net", "sum"), sessions=("net", "size"),
                                      buy_days=("net", lambda x: int((x > 0).sum())),
                                      turnover=("value_total", "sum"))
        agg = agg[agg["turnover"] > 0]
        agg["net_pct_turnover"] = (agg["net_idr"] / agg["turnover"] * 100).round(3)
        agg["persistence"] = (agg["buy_days"] / agg["sessions"]).round(2)
        liquid = agg[agg["turnover"] >= agg["turnover"].quantile(0.70)]
        top = liquid.sort_values("net_pct_turnover", ascending=False).head(20).reset_index()
        bot = liquid.sort_values("net_pct_turnover").head(20).reset_index()
        (out / "pack_idx_flow.json").write_text(json.dumps({
            "generated": TODAY, "window_sessions": len(sess),
            "window": [sess[0], sess[-1]],
            "market_net_idr_20d": float(w["net"].sum()),
            "top_accumulated": json.loads(top.to_json(orient="records")),
            "top_distributed": json.loads(bot.to_json(orient="records")),
        }, indent=1, default=str), encoding="utf-8")
        print(f"  pack_idx_flow: {len(liquid)} liquid names over {len(sess)} sessions")

    # news, whole corpus by region
    (out / "pack_news.json").write_text(json.dumps({
        "generated": TODAY, "total": len(all_news),
        "news": all_news[:400],
    }, indent=1, default=str), encoding="utf-8")

    (out / "manifest.json").write_text(json.dumps({"generated": TODAY, "desks": manifest}, indent=1), encoding="utf-8")
    print(f"\npacks written to {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "packs")
