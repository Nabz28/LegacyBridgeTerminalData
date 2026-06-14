"""
pull_inventory.py — pull the FULL data inventory available to the engine and build
a machine-readable catalog + human INVENTORY.md, so the per-sub-industry plans can
map every driver to a REAL series (RIC/key) that exists in the LBC terminal.

Sources:
  - macro.series country=idind   (CEIC Indonesia INDUSTRY data, demand/supply tagged)
  - macro.series country=id       (CEIC Indonesia MACRO)
  - macro.series country=cn / us  (China / US macro — global demand, rates, prices)
  - macro.live_indicators         (curated live commodities/FX/rates/indices)
  - correlation.sqlite series      (market: commodities/FX/yields/indices, deep history)

Writes:
  plan/catalog/idind.json, id.json, cn.json, us.json, live.json, market.json
  plan/DATA_INVENTORY.md  (readable index, grouped)
"""
from __future__ import annotations

import collections
import json
import sqlite3
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine"
sys.path.insert(0, str(ENGINE))
import common as C  # noqa: E402

CAT = Path(__file__).resolve().parent / "catalog"
CAT.mkdir(parents=True, exist_ok=True)
OUT = Path(__file__).resolve().parent / "DATA_INVENTORY.md"

SEL = ("ric,category,subcategory,stat_role,indicator_topic,description,"
       "frequency,units,source,n_obs,first_obs,last_obs")


def _pull_country(cc):
    cached = C.read_json(CAT / f"{cc}.json")
    if cached:
        return cached
    rows = C.rest_get_all("series", {"country": f"eq.{cc}", "select": SEL},
                          schema="macro")
    C.write_json(CAT / f"{cc}.json", rows)
    return rows


def _pull_live():
    cached = C.read_json(CAT / "live.json")
    if cached:
        return cached
    rows = C.get_live_indicators()
    C.write_json(CAT / "live.json", rows)
    return rows


def _pull_market():
    if not C.CORR_SQLITE:
        return []
    con = sqlite3.connect(str(C.CORR_SQLITE))
    cur = con.cursor()
    series = cur.execute("select id,name,category,subcategory from series").fetchall()
    counts = dict(cur.execute(
        "select series_id, count(*) from prices_weekly group by series_id").fetchall())
    out = [{"id": sid, "name": nm, "category": cat, "subcategory": sub,
            "weekly_obs": counts.get(sid, 0)}
           for sid, nm, cat, sub in series]
    con.close()
    C.write_json(CAT / "market.json", out)
    return out


def _grp(rows, *keys):
    g = collections.defaultdict(list)
    for r in rows:
        g[tuple(r.get(k) for k in keys)].append(r)
    return g


def build():
    C.log("pulling idind (industry) ...")
    idind = _pull_country("idind")
    C.log(f"  {len(idind)} idind series")
    C.log("pulling id (macro) ...")
    idm = _pull_country("id")
    C.log(f"  {len(idm)} id macro series")
    C.log("pulling cn / us macro ...")
    cn = _pull_country("cn")
    us = _pull_country("us")
    live = _pull_live()
    market = _pull_market()
    C.log(f"  cn={len(cn)} us={len(us)} live={len(live)} market={len(market)}")

    o = ["# LBC Terminal — Data Inventory (everything the engine can use)", "",
         f"Pulled live from Supabase `macro.series` + `macro.live_indicators` + "
         f"local `correlation.sqlite`. Counts: **idind (industry) {len(idind)}**, "
         f"**id (macro) {len(idm)}**, cn {len(cn)}, us {len(us)}, live {len(live)}, "
         f"market {len(market)}.", "",
         "RIC conventions: industry = `CEICI<id>`, ID/CN/US macro = source-specific "
         "RIC; market = correlation series id (e.g. `ICEEUR:ATR1!`). Frequencies: "
         "P1D daily · P1M monthly · P3M quarterly · P1Y annual.", ""]

    # ---- INDUSTRY (idind) by category -> subcategory --------------------- #
    o += ["## 1. CEIC Indonesia INDUSTRY series (`country=idind`) — demand/supply tagged",
          ""]
    bycat = _grp(idind, "category")
    for (cat,), crows in sorted(bycat.items(), key=lambda kv: -len(kv[1])):
        o.append(f"### {cat}  ({len(crows)} series)")
        bysub = _grp(crows, "subcategory")
        for (sub,), srows in sorted(bysub.items(), key=lambda kv: -len(kv[1])):
            d = sum(1 for r in srows if r.get("stat_role") == "demand")
            s = sum(1 for r in srows if r.get("stat_role") == "supply")
            freqs = collections.Counter(r.get("frequency") for r in srows)
            fr = ",".join(f"{k}:{v}" for k, v in freqs.most_common(3))
            o.append(f"- **{sub}** — D{d}/S{s} · {fr}")
            # sample of distinct national (non-province) topics
            seen, topics = set(), []
            for r in sorted(srows, key=lambda z: -(z.get("n_obs") or 0)):
                t = (r.get("indicator_topic") or "").strip()
                tl = t.lower()
                if not t or tl in seen or tl.startswith("by province"):
                    continue
                seen.add(tl)
                topics.append(f"{t}[{r.get('stat_role','?')[:3]},{r.get('units','')},n{r.get('n_obs')}]")
                if len(topics) >= 22:
                    break
            for t in topics:
                o.append(f"    - {t}")
        o.append("")

    # ---- ID MACRO by category ------------------------------------------- #
    o += ["## 2. CEIC Indonesia MACRO series (`country=id`)", ""]
    for (cat,), crows in sorted(_grp(idm, "category").items(),
                                key=lambda kv: -len(kv[1])):
        o.append(f"### {cat}  ({len(crows)} series)")
        seen, topics = set(), []
        for r in sorted(crows, key=lambda z: -(z.get("n_obs") or 0)):
            t = (r.get("indicator_topic") or r.get("description") or "").strip()
            tl = t.lower()
            if not t or tl in seen or "province" in tl:
                continue
            seen.add(tl)
            topics.append(f"{t} [{r.get('units','')},{r.get('frequency','')},n{r.get('n_obs')}]")
            if len(topics) >= 40:
                break
        for t in topics:
            o.append(f"- {t}")
        o.append("")

    # ---- CN / US macro category structure ------------------------------- #
    for cc, rows in (("China", cn), ("United States", us)):
        o += [f"## CEIC {cc} macro (`country={cc[:2].lower()}`) — categories", ""]
        for (cat,), crows in sorted(_grp(rows, "category").items(),
                                    key=lambda kv: -len(kv[1])):
            o.append(f"- {cat}: {len(crows)}")
        o.append("")

    # ---- market (correlation.sqlite) ------------------------------------ #
    o += ["## 3. Market series (`correlation.sqlite`) — deep weekly history", ""]
    for (cat,), crows in sorted(_grp(market, "category").items(),
                                key=lambda kv: -len(kv[1])):
        pop = [r for r in crows if (r.get("weekly_obs") or 0) > 100]
        o.append(f"### {cat} ({len(pop)} populated / {len(crows)})")
        for r in sorted(pop, key=lambda z: z.get("id"))[:60]:
            o.append(f"- `{r['id']}` {r.get('name','')} [{r.get('subcategory','')}, w{r['weekly_obs']}]")
        o.append("")

    OUT.write_text("\n".join(o), encoding="utf-8")
    C.log(f"wrote {OUT} ({len(o)} lines)")


if __name__ == "__main__":
    build()
