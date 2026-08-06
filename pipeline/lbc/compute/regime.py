"""Global + country regime model. Deterministic quadrant tags from live series."""
from __future__ import annotations

import datetime as dt

from . import stats
from .. import db


def _trend(series_key: str, periods: int = 63) -> float | None:
    s = stats.load_series(series_key)
    return stats.change(s, periods)


def global_regime() -> dict:
    """growth x inflation quadrant + liquidity + risk tags."""
    out = {"asof": dt.date.today().isoformat()}

    # Growth: payrolls 3m change + INDPRO trend + claims direction (inverted)
    payems = stats.load_series("us.act.payems")
    indpro = stats.load_series("us.act.indpro")
    claims = stats.load_series("us.act.claims")
    growth_votes = []
    if len(payems) > 6:
        growth_votes.append(1 if payems.diff(3).iloc[-1] > 0 else -1)
    ch = stats.change(indpro, 6)
    if ch is not None:
        growth_votes.append(1 if ch > 0 else -1)
    cz = stats.zscore_latest(claims.rolling(4).mean() if len(claims) > 8 else claims)
    if cz is not None:
        growth_votes.append(-1 if cz > 0.5 else 1)
    growth = "expanding" if sum(growth_votes) > 0 else "slowing"

    # Inflation: core CPI 3m annualized vs 2.5%
    cpi = stats.load_series("us.infl.cpi_core")
    infl = "cooling"
    if len(cpi) > 4:
        r3m = (cpi.iloc[-1] / cpi.iloc[-4]) ** 4 - 1
        infl = "hot" if r3m > 0.03 else ("sticky" if r3m > 0.022 else "cooling")

    # Liquidity: net liquidity trend (WALCL - TGA - RRP) + NFCI level
    walcl = stats.load_series("us.liq.walcl")
    tga = stats.load_series("us.liq.tga")
    rrp = stats.load_series("us.liq.rrp")
    nfci = stats.load_series("us.fin.nfci")
    liq = "neutral"
    try:
        import pandas as pd
        net = pd.concat([walcl.rename("w"), tga.rename("t").reindex(walcl.index, method="ffill"),
                         rrp.rename("r").reindex(walcl.index, method="ffill")], axis=1)
        net["nl"] = net["w"] / 1000 - net["t"] - net["r"]  # WALCL is $mn, others $bn
        nl = net["nl"].dropna()
        if len(nl) > 13:
            liq = "easing" if nl.iloc[-1] > nl.iloc[-13] else "tightening"
    except Exception:
        pass
    nfci_level = float(nfci.iloc[-1]) if len(nfci) else None
    if nfci_level is not None and nfci_level > 0:
        liq = "tightening"

    # Risk: VIX + HY OAS percentiles
    vix_p = stats.pctile_latest(stats.load_series("us.vol.vix"))
    hy_p = stats.pctile_latest(stats.load_series("us.credit.hyoas"))
    risk = "risk-on"
    if (vix_p or 0) > 80 or (hy_p or 0) > 80:
        risk = "risk-off"
    elif (vix_p or 0) > 60 or (hy_p or 0) > 60:
        risk = "cautious"

    out.update({
        "growth": growth, "inflation": infl, "liquidity": liq, "risk": risk,
        "tag": f"{growth} growth, {infl} inflation, liquidity {liq}, {risk}",
        "detail": {"vix_pctile": vix_p, "hy_pctile": hy_p, "nfci": nfci_level},
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
