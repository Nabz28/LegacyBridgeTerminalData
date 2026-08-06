"""Derived series: spreads and ratios computed from ingested primitives.

Runs after ingest, before dials. Each derived series is written to
mkt.observation like any other, so dials/agents/UI treat them identically.
"""
from __future__ import annotations

import pandas as pd

from . import stats
from .. import db


def _write(series_key: str, s: pd.Series) -> int:
    s = s.dropna()
    if s.empty:
        return 0
    rows = [{"series_key": series_key, "date": ts.date().isoformat(), "value": float(v)}
            for ts, v in s.items()]
    return db.upsert("mkt", "observation", rows, on_conflict="series_key,date", chunk=2000)


def _ratio(a_key: str, b_key: str, out_key: str, days: int = 1600) -> int:
    a, b = stats.load_series(a_key, days), stats.load_series(b_key, days)
    if a.empty or b.empty:
        return 0
    df = pd.concat([a.rename("a"), b.rename("b")], axis=1).ffill().dropna()
    return _write(out_key, df["a"] / df["b"])


def run(days: int = 1600) -> int:
    total = 0

    # curve: 10y minus 2y
    d10, d2 = stats.load_series("us.rate.dgs10", days), stats.load_series("us.rate.dgs2", days)
    if not d10.empty and not d2.empty:
        df = pd.concat([d10.rename("a"), d2.rename("b")], axis=1).dropna()
        total += _write("us.rate.t10y2y", df["a"] - df["b"])

    # real 10y: nominal minus trailing CPI yoy (monthly CPI forward-filled to daily)
    cpi = stats.load_series("us.infl.cpi_core", days + 400)
    if not d10.empty and len(cpi) > 13:
        yoy = (cpi / cpi.shift(12) - 1) * 100
        df = pd.concat([d10.rename("nom"), yoy.rename("infl")], axis=1).sort_index()
        df["infl"] = df["infl"].ffill()
        df = df.dropna()
        total += _write("us.rate.real10", df["nom"] - df["infl"])

    # credit conditions: HY vs duration-matched treasuries (up = spreads tightening)
    total += _ratio("us.credit.hyg", "us.credit.ief", "us.credit.cond", days)
    # cyclical appetite and housing momentum
    total += _ratio("us.eq.disc", "us.eq.staples", "us.act.cyclical", days)
    total += _ratio("us.eq.homebuild", "idx.spx", "us.act.housing", days)

    return total
