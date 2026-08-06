"""Global + country regime model. Deterministic quadrant tags from live series."""
from __future__ import annotations

import datetime as dt

from . import stats
from .. import db


def _trend(series_key: str, periods: int = 63) -> float | None:
    s = stats.load_series(series_key)
    return stats.change(s, periods)


def global_regime() -> dict:
    """growth x inflation quadrant + liquidity + risk tags.

    Votes are counted only from series that actually have data; the result
    carries `coverage` so downstream consumers can see how much of the model
    was live. A regime read from one indicator is labelled as such.
    """
    out = {"asof": dt.date.today().isoformat()}

    # Growth: payrolls momentum, manufacturing hours, unemployment trend,
    # cyclical-vs-defensive market appetite
    payems = stats.load_series("us.act.payems")
    avghrs = stats.load_series("us.act.avghrs")
    unrate = stats.load_series("us.act.unrate")
    cyclical = stats.load_series("us.act.cyclical")
    growth_votes, growth_possible = [], 4
    if len(payems) > 6:
        growth_votes.append(1 if payems.diff(3).iloc[-1] > 0 else -1)
    ch = stats.change(avghrs, 6)
    if ch is not None:
        growth_votes.append(1 if ch >= 0 else -1)
    if len(unrate) > 7:
        growth_votes.append(-1 if unrate.iloc[-1] > unrate.iloc[-7] else 1)
    cyc = stats.change(cyclical, 63)
    if cyc is not None:
        growth_votes.append(1 if cyc > 0 else -1)
    growth = "expanding" if sum(growth_votes) > 0 else "slowing"

    # Inflation: core CPI 3m annualized vs 2.5%
    cpi = stats.load_series("us.infl.cpi_core")
    infl = "cooling"
    if len(cpi) > 4:
        r3m = (cpi.iloc[-1] / cpi.iloc[-4]) ** 4 - 1
        infl = "hot" if r3m > 0.03 else ("sticky" if r3m > 0.022 else "cooling")

    # Liquidity: M2 growth + policy direction + credit conditions trend
    m2 = stats.load_series("us.liq.m2", days=1500)
    ffr = stats.load_series("us.rate.dff")
    credit = stats.load_series("us.credit.cond")
    liq_votes = []
    if len(m2) > 7:
        liq_votes.append(1 if m2.iloc[-1] > m2.iloc[-7] else -1)
    if len(ffr) > 130:
        liq_votes.append(-1 if ffr.iloc[-1] > ffr.iloc[-130] else 1)  # hikes = tightening
    cch = stats.change(credit, 63)
    if cch is not None:
        liq_votes.append(1 if cch > 0 else -1)
    liq = "easing" if sum(liq_votes) > 0 else ("tightening" if sum(liq_votes) < 0 else "neutral")

    # Risk: VIX + credit-conditions percentiles
    vix_p = stats.pctile_latest(stats.load_series("us.vol.vix"))
    credit_p = stats.pctile_latest(credit)
    risk = "risk-on"
    if (vix_p or 0) > 80 or (credit_p is not None and credit_p < 20):
        risk = "risk-off"
    elif (vix_p or 0) > 60 or (credit_p is not None and credit_p < 40):
        risk = "cautious"

    coverage = round((len(growth_votes) / growth_possible + len(liq_votes) / 3) / 2, 2)
    out.update({
        "growth": growth, "inflation": infl, "liquidity": liq, "risk": risk,
        "coverage": coverage,
        "tag": f"{growth} growth, {infl} inflation, liquidity {liq}, {risk}"
               + ("" if coverage >= 0.6 else f" (partial data, {coverage:.0%} coverage)"),
        "detail": {"vix_pctile": vix_p, "credit_pctile": credit_p,
                   "growth_votes": growth_votes, "liq_votes": liq_votes},
    })
    return out


COUNTRY_REGIME_SERIES = {
    "us": ["idx.spx", "us.fx.dxy"],
    "china-hk-taiwan": ["idx.csi300", "fx.usdcnh"],
    "japan-korea": ["idx.n225", "fx.usdjpy"],
    "eurozone": ["idx.stoxx", "fx.eurusd"],
    "indonesia": ["idx.jkse", "fx.usdidr"],
}


def country_tag(desk_id: str) -> str:
    keys = COUNTRY_REGIME_SERIES.get(desk_id)
    if not keys:
        return ""
    eq = stats.load_series(keys[0])
    fx = stats.load_series(keys[1])
    eq_ch = stats.change(eq, 63)
    fx_z = stats.zscore_latest(fx)
    eq_part = "market up" if (eq_ch or 0) > 0 else "market down"
    # for USD-crosses where up = local weakness (all except eurusd)
    if keys[1] == "fx.eurusd":
        fx_part = "currency firm" if (fx_z or 0) > 0 else "currency soft"
    else:
        fx_part = "currency soft" if (fx_z or 0) > 0.5 else "currency stable"
    return f"{eq_part}, {fx_part}"
