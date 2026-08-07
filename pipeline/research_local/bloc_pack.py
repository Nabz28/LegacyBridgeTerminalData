"""Country-bloc pack for desks the CEIC archive cannot reach.

The archive holds only us, cn, id and idind. The eurozone and japan-korea desks therefore
have no domestic macro to read: eurozone carries three DBnomics series (ESI, HICP, ECB rate)
and japan-korea carries none at all — its five drivers are two equity indices, two currencies
and TSMC revenue.

Rather than pretend to a macro view we cannot source, this builds what the price data can
honestly support: level AND momentum for every driver, and the correlation regime of each
bloc against the US and China blocs. The point is to answer one question for an Indonesian
book — is this bloc moving on its own, or is it a proxy for something we already hold?

Writes locally. Nothing here goes to the database.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import statistics as st
import urllib.request
from pathlib import Path

from _datadir import data_dir

HERE = data_dir()
URL = "https://adnubucjlezrtusbicja.supabase.co"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE", "")
PAGE = 1000
TODAY = "2026-08-07"

BLOCS = {
    "eurozone": ["eu.act.esi", "eu.eq.broad", "cmd.ngas_ttf", "eu.infl.hicp",
                 "idx.stoxx", "idx.dax", "eu.eq.germany", "eu.rate.dfr", "fx.eurusd"],
    "japan-korea": ["idx.kospi", "idx.n225", "fx.usdjpy", "fx.usdkrw", "idx.twii"],
    "us": ["idx.spx", "idx.ndx", "idx.sox", "us.rate.dgs10", "us.rate.dgs2",
           "us.rate.dgs30", "us.rate.real10", "us.rate.t10y2y"],
    "china-hk-taiwan": ["idx.hsi", "idx.csi300", "idx.china_bx", "fx.usdcnh", "cmd.copper"],
    "indonesia": ["idx.jkse", "fx.usdidr", "cmd.coal.hba", "cmd.soyoil", "cmd.gsci"],
}

# A driver stale by more than this is not measuring anything current; flagged, not dropped,
# because a dead driver silently holding a desk stance is worse than a missing one.
STALE_DAYS = 45

# Series quoted in percent. Their moves are DIFFERENCES in basis points, never percent changes,
# and their z-scores are taken on the level because a policy rate is already bounded.
RATE_KEYS = {"eu.rate.dfr", "eu.infl.hicp", "us.rate.dgs10", "us.rate.dgs2", "us.rate.dgs30",
             "us.rate.real10", "us.rate.t10y2y"}


def rest(table, query, schema="mkt"):
    """Paged read. PostgREST caps every response at db-max-rows and returns page one
    silently, which is how round one computed z-scores on stale windows."""
    out, offset = [], 0
    while True:
        req = urllib.request.Request(
            f"{URL}/rest/v1/{table}?{query}&limit={PAGE}&offset={offset}",
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                     "Accept-Profile": schema})
        with urllib.request.urlopen(req, timeout=90) as r:
            chunk = json.loads(r.read())
        out += chunk
        if len(chunk) < PAGE:
            return out
        offset += PAGE


def zs(xs):
    if len(xs) < 24:
        return None
    m, s = st.mean(xs), (st.pstdev(xs) or 1)
    z = (xs[-1] - m) / s
    return None if math.isnan(z) else round(max(-4, min(4, z)), 2)


def pct(xs):
    if len(xs) < 24:
        return None
    return round(100 * sum(1 for v in xs if v <= xs[-1]) / len(xs), 1)


def change(hist, days, is_rate):
    """Change over a CALENDAR window, not over N observations.

    The first version of this indexed back N observations and labelled the column "ret_5d".
    For a monthly series that silently made a five-MONTH move, and cmd.coal.hba's "ret_63d"
    was a 62-month return sitting in the same column as the S&P's 63 trading days. Anchor on
    the date instead, so every column means the same thing across frequencies.

    Rates are DIFFERENCED (basis points), not percent-changed: a move from 2.00% to 2.25% is a
    25bp hike, and reporting it as +12.5% both misstates it and hides it among equity returns.
    """
    if not hist:
        return None
    last_d, last_v = hist[-1]
    if last_v in (0, None):
        return None
    target = dt.date.fromisoformat(last_d) - dt.timedelta(days=days)
    prior = [(d, v) for d, v in hist if dt.date.fromisoformat(d) <= target and v is not None]
    if not prior:
        return None
    base_d, base_v = prior[-1]
    # Refuse to report a window the series cannot actually cover. A monthly benchmark has no
    # 7-day change: the nearest prior print is a month away, and reporting that gap in a column
    # labelled 7d is how a 62-month coal return ended up beside the S&P's 63 trading days.
    gap = (dt.date.fromisoformat(last_d) - dt.date.fromisoformat(base_d)).days
    if gap > days * 1.5:
        return None
    if is_rate:
        return {"bp": round((last_v - base_v) * 100, 1), "from": base_d}
    if base_v == 0:
        return None
    return {"pct": round((last_v / base_v - 1) * 100, 2), "from": base_d}


def momentum_z(hist, is_rate):
    """Where the latest 30-calendar-day move sits in its own distribution of 30-day moves.

    Built on calendar windows for the same reason as change(): a 21-observation window means
    three weeks for the S&P and nearly two years for a monthly coal benchmark.
    """
    if len(hist) < 30:
        return None
    dates = [dt.date.fromisoformat(d) for d, _ in hist]
    vals = [v for _, v in hist]
    moves = []
    j = 0
    for i in range(len(hist)):
        target = dates[i] - dt.timedelta(days=30)
        while j < i and dates[j] < target:
            j += 1
        k = max(0, j - 1)
        if k >= i:
            continue
        if (dates[i] - dates[k]).days > 75:
            continue
        if is_rate:
            moves.append(vals[i] - vals[k])
        elif vals[k]:
            moves.append(vals[i] / vals[k] - 1)
    return zs(moves) if len(moves) >= 24 else None


def corr(a, b):
    n = min(len(a), len(b))
    if n < 40:
        return None
    a, b = a[-n:], b[-n:]
    ra = [a[i] / a[i - 1] - 1 for i in range(1, n) if a[i - 1]]
    rb = [b[i] / b[i - 1] - 1 for i in range(1, n) if b[i - 1]]
    n = min(len(ra), len(rb))
    if n < 40:
        return None
    ra, rb = ra[-n:], rb[-n:]
    ma, mb = st.mean(ra), st.mean(rb)
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
    return None if not den else round(num / den, 2)


def main():
    keys = sorted({k for v in BLOCS.values() for k in v})
    print(f"reading {len(keys)} series...")
    hist: dict[str, list] = {}
    for k in keys:
        rows = rest("observation",
                    f"select=date,value&series_key=eq.{k}&order=date.asc"
                    f"&date=gte.2019-01-01")
        rows = [(r["date"], r["value"]) for r in rows if r.get("value") is not None]
        if rows:
            hist[k] = rows
        print(f"  {k:<16} {len(rows):>5} obs"
              f"{'' if rows else '   <-- NO DATA'}"
              f"{'   ' + rows[-1][0] if rows else ''}")

    out = {"generated": "2026-08-07", "blocs": {},
           "note": ("Built for desks the CEIC archive cannot reach. Eurozone carries three "
                    "DBnomics macro series; japan-korea carries none and is price-only. "
                    "Level AND momentum are both reported because round one scored on level "
                    "alone and 17 of 23 stances flipped when rescored on momentum.")}

    for bloc, series in BLOCS.items():
        drivers = []
        for k in series:
            h = hist.get(k)
            if not h:
                drivers.append({"series_key": k, "status": "no data"})
                continue
            xs = [v for _, v in h]
            age = (dt.date.fromisoformat(TODAY) - dt.date.fromisoformat(h[-1][0])).days
            is_rate = k in RATE_KEYS
            # Observation spacing decides which windows are honestly reportable at all.
            spacing = ((dt.date.fromisoformat(h[-1][0])
                        - dt.date.fromisoformat(h[0][0])).days / max(1, len(h) - 1))
            drivers.append({
                "series_key": k, "last_obs": h[-1][0], "n_obs": len(xs),
                "age_days": age, "stale": age > STALE_DAYS,
                "quoted_in": "percent (differenced)" if is_rate else "level (percent change)",
                "obs_spacing_days": round(spacing, 1),
                "latest": round(xs[-1], 4),
                "level_z": zs(xs), "level_pctile": pct(xs),
                # calendar windows, so a monthly and a daily series mean the same thing here.
                # None where the series is too sparse to cover the window honestly.
                "chg_7d": change(h, 7, is_rate),
                "chg_30d": change(h, 30, is_rate),
                "chg_90d": change(h, 90, is_rate),
                "momentum_z": momentum_z(h, is_rate),
            })
        stale = [d["series_key"] for d in drivers if d.get("stale")]
        out["blocs"][bloc] = {
            "drivers": drivers,
            "n_with_data": sum(1 for d in drivers if "latest" in d),
            "n_total": len(series),
            "stale_drivers": stale,
            "usable_share": round(
                sum(1 for d in drivers if "latest" in d and not d.get("stale"))
                / len(series), 2),
        }

    # Correlation regime: each bloc's headline equity against the others'
    HEAD = {"eurozone": "idx.stoxx", "japan-korea": "idx.n225", "us": "idx.spx",
            "china-hk-taiwan": "idx.hsi", "indonesia": "idx.jkse"}
    mat = {}
    for a, ka in HEAD.items():
        row = {}
        for b, kb in HEAD.items():
            if a == b or ka not in hist or kb not in hist:
                continue
            da = dict(hist[ka])
            db = dict(hist[kb])
            common = sorted(set(da) & set(db))
            if len(common) < 60:
                continue
            row[b] = {
                "full": corr([da[d] for d in common], [db[d] for d in common]),
                "last_63d": corr([da[d] for d in common[-64:]],
                                 [db[d] for d in common[-64:]]),
                "n_common_days": len(common),
            }
        mat[a] = row
    out["correlation"] = mat
    out["correlation_note"] = (
        "Daily-return correlation on common trading days. 'last_63d' against 'full' is the "
        "regime test: a bloc whose short correlation has decoupled from its long one is "
        "trading on something local, and is worth separate research. One that has converged "
        "is a proxy for whatever it converged to.")

    p = HERE / "bloc_pack.json"
    p.write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")

    print(f"\n{'BLOC':<18}{'drivers':>9}{'with data':>11}")
    for b, v in out["blocs"].items():
        print(f"  {b:<16}{v['n_total']:>9}{v['n_with_data']:>11}")
    print("\nCORRELATION vs others (full / last 63d):")
    for a, row in mat.items():
        parts = [f"{b}={v['full']}/{v['last_63d']}" for b, v in row.items()]
        print(f"  {a:<16} " + "  ".join(parts))
    print(f"\nwritten {p.stat().st_size:,}b LOCALLY to {p}")


if __name__ == "__main__":
    if not KEY:
        raise SystemExit("SUPABASE_SERVICE_ROLE not set")
    main()
