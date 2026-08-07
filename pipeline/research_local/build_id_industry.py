"""Join Indonesian industry archive data to the IDX names that trade on it.

The archive tells you what an industry is doing in the real economy. The
fundamentals table tells you what its listed companies are priced at. Neither is
useful alone: a construction sector with falling cement volumes and cement
stocks on 8x earnings is a different proposition from the same volumes on 25x.

Writes one pack per Indonesian industry, locally.
"""
from __future__ import annotations

import json
import statistics as st
from pathlib import Path

HERE = Path(__file__).parent
ARCH = HERE / "archive"
OUT = HERE / "id_industry"
OUT.mkdir(exist_ok=True)

# archive category -> (IDX sectors/sub_sectors that trade on it, extra tickers)
MAP = {
    "Property & Real Estate": (["Properties & Real Estate"], ["APLN", "PBSA", "BSDE", "CTRA", "SMRA", "PWON", "LPKR", "DMAS"]),
    "Banks": (["Financials"], ["BBCA", "BBRI", "BMRI", "BBNI", "ARTO", "BRIS", "BBTN", "BBKP"]),
    "Consumer Staples": (["Consumer Non-Cyclicals"], ["ICBP", "INDF", "MYOR", "UNVR", "AMRT", "CPIN", "JPFA", "GGRM", "HMSP", "SIDO"]),
    "Consumer Discretionary": (["Consumer Cyclicals"], ["ASII", "ACES", "ERAA", "MAPI", "LPPF", "RALS"]),
    "Energy": (["Energy"], ["PTBA", "ADRO", "ITMG", "BYAN", "AADI", "GEMS", "INDY", "HRUM", "MEDC", "PGAS", "AKRA"]),
    "Basic Materials": (["Basic Materials"], ["INCO", "ANTM", "MDKA", "NCKL", "MBMA", "TINS", "SMGR", "INTP", "KRAS", "TPIA", "BRPT", "AMMN"]),
    "Infrastructure": (["Infrastructure"], ["TLKM", "JSMR", "PGEO", "TOWR", "MTEL", "TBIG", "EXCL", "ISAT", "WIKA", "PTPP", "ADHI"]),
    "Plantation & Agriculture": (["Consumer Non-Cyclicals", "Basic Materials"], ["AALI", "LSIP", "DSNG", "TAPG", "SIMP", "SSMS", "BWPT", "SGRO"]),
    "Tourism": (["Consumer Cyclicals", "Transportation & Logistic"], ["GIAA", "PANR", "BUVA", "PJAA", "HOTL"]),
    "Technology": (["Technology"], ["GOTO", "BUKA", "EMTK", "MTDL", "DCII", "WIRG"]),
    "Healthcare": (["Healthcare"], ["MIKA", "SILO", "HEAL", "KLBF", "SIDO", "PRDA"]),
    "Transport & Logistics": (["Transportation & Logistic"], ["SMDR", "TMAS", "ASSA", "BIRD", "IPCC"]),
    "Industrials & Manufacturing": (["Industrials"], ["UNTR", "ASII", "ARNA", "IMPC", "MARK"]),
    "Financials (non-bank)": (["Financials"], ["BFIN", "ADMF", "PNLF", "PANS"]),
}


def fundamentals_vintage(comp: list, names: dict) -> str | None:
    """Vintage of the prices and multiples, read off the rows themselves.

    The fundamentals file's own top-level `generated` is when the extract ran, which can
    be months after the marks were struck. Downstream readers need the mark date.
    """
    dates = {str(names[c["symbol"]].get("updated_at"))[:10]
             for c in comp if c["symbol"] in names}
    dates.discard("None")
    if not dates:
        return None
    # Marks struck on different days would make any cross-sectional comparison unsound, so
    # surface a range rather than silently picking one.
    return min(dates) if len(dates) == 1 else f"{min(dates)}..{max(dates)}"


def stat_block(obs: list) -> dict:
    vals = [v for _, v in obs if v is not None]
    if len(vals) < 6:
        return {}
    def chg(n):
        if len(vals) <= n or not vals[-1 - n]:
            return None
        return round((vals[-1] / vals[-1 - n] - 1) * 100, 2)
    lo, hi = min(vals), max(vals)
    pct = round((sum(1 for v in vals if v <= vals[-1]) / len(vals)) * 100, 1)
    mean = st.mean(vals)
    sd = st.pstdev(vals) or 1
    return {
        "latest": vals[-1], "chg_1": chg(1), "chg_3": chg(3), "chg_6": chg(6),
        "chg_12": chg(12), "pctile_own_history": pct,
        "z_vs_own_history": round((vals[-1] - mean) / sd, 2),
        "min": lo, "max": hi, "n": len(vals),
    }


def main():
    fund = json.loads((HERE / "fundamentals.json").read_text(encoding="utf-8"))
    idx = {r["symbol"]: r for r in fund.get("idx", [])}

    manifest = []
    for cat, (sectors, tickers) in MAP.items():
        slug = "".join(ch if ch.isalnum() else "_" for ch in cat.lower())[:44]
        src = ARCH / f"idind__{slug}.json"
        if not src.exists():
            print(f"  skip {cat}: no archive pack")
            continue
        pack = json.loads(src.read_text(encoding="utf-8"))

        series = []
        for s in pack["series"]:
            b = stat_block(s["observations"])
            if not b:
                continue
            series.append({
                "ric": s["ric"], "description": s["description"],
                "subcategory": s.get("subcategory"), "units": s.get("units"),
                "frequency": s.get("frequency"), "last_obs": s.get("last_obs"),
                "stats": b,
                "recent": s["observations"][-18:],
            })
        series.sort(key=lambda x: (x.get("subcategory") or "", x["description"]))

        # companies: named tickers plus anything in the mapped sectors
        names = {}
        for t in tickers:
            if t in idx:
                names[t] = idx[t]
        for sym, r in idx.items():
            if r.get("sector") in sectors and sym not in names:
                names[sym] = r
        # Shares of "the sector" must be computed against EVERY matching name, not against the
        # 26 that ship. The top-26 cut published PGUN at 42.7% of plantation when it is 17.4% of
        # the real 35-name sub-sector: the truncation had left three plantation names in the
        # denominator. Ship the totals so no reader can compute a share off the wrong base.
        ranked = sorted(names.items(), key=lambda kv: -(kv[1].get("mcap") or 0))
        sector_mcap_total = sum((r.get("mcap") or 0) for _, r in ranked)
        by_sub: dict[str, dict] = {}
        for _, r in ranked:
            sub = r.get("sub_sector") or "Unclassified"
            b = by_sub.setdefault(sub, {"n": 0, "mcap": 0.0})
            b["n"] += 1
            b["mcap"] += r.get("mcap") or 0

        comp = []
        for sym, r in ranked[:26]:
            row = {k: r.get(k) for k in (
                "symbol", "name", "sector", "sub_sector", "price", "mcap", "pe", "pb", "ps",
                "ev_ebitda", "roe", "roa", "net_margin", "gross_margin", "rev_growth",
                "earnings_growth", "debt_equity", "current_ratio", "div_yield", "beta",
                "w52_high", "w52_low", "free_float_pct", "adv_value")}
            m = r.get("mcap") or 0
            sub = by_sub.get(r.get("sub_sector") or "Unclassified", {})
            row["share_of_matched_universe_pct"] = (
                round(100 * m / sector_mcap_total, 2) if sector_mcap_total else None)
            row["share_of_sub_sector_pct"] = (
                round(100 * m / sub["mcap"], 2) if sub.get("mcap") else None)
            comp.append(row)

        p = OUT / f"{slug}.json"
        p.write_text(json.dumps({
            "industry": cat,
            # extracted_at is when this pack was built; fundamentals_as_of is the vintage of the
            # prices and multiples themselves, read off the rows. Conflating the two cost four
            # analysts a correct staleness call in the 2026-08 round.
            "extracted_at": pack["generated"],
            "fundamentals_as_of": fundamentals_vintage(comp, names),
            "n_series": len(series),
            "n_companies_shipped": len(comp),
            "n_companies_matched": len(ranked),
            "companies_truncated": len(ranked) > len(comp),
            "matched_universe_mcap": sector_mcap_total,
            "sub_sector_totals": {k: {"n": v["n"], "mcap": v["mcap"]}
                                  for k, v in sorted(by_sub.items(),
                                                     key=lambda kv: -kv[1]["mcap"])},
            "share_warning": (
                f"listed_companies is the top {len(comp)} of {len(ranked)} matched names by market "
                f"capitalisation. NEVER compute a share of sector from this list — use "
                f"matched_universe_mcap or sub_sector_totals as the denominator. Note also that "
                f"this industry matched on sectors {sectors}, which may be broader than the "
                f"industry name suggests."
                if len(ranked) > len(comp) else None),
            "archive_series": series, "listed_companies": comp,
        }, indent=1, default=str), encoding="utf-8")
        manifest.append({"industry": cat, "file": p.name, "series": len(series),
                         "companies": len(comp), "bytes": p.stat().st_size})
        print(f"  {cat[:30]:<32} {len(series):>3} series  {len(comp):>3} companies  {p.stat().st_size:>8,}b")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"\n{len(manifest)} industry packs in {OUT}")


if __name__ == "__main__":
    main()
