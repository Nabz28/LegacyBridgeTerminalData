"""
build_worklist.py — generate state/worklist.json: the authoritative, prioritised
list of IDX equity baskets and their candidate driver universe.

Run:  python industry-engine/engine/build_worklist.py
Idempotent. Re-run any time the equity universe or CEIC data changes.
"""
from __future__ import annotations

import collections

import common as C
import mapping as M


def _f(v) -> float:
    try:
        return float(v or 0)
    except Exception:  # noqa: BLE001
        return 0.0


def build() -> dict:
    C.log("Loading equity_screen ...")
    eq = C.get_equity_screen()
    C.log(f"  {len(eq)} equity rows")
    C.log("Loading CEIC idind series ...")
    idind = C.get_idind_series()
    C.log(f"  {len(idind)} idind series")

    # --- index CEIC series by (category, subcategory) and category --------- #
    by_catsub: dict = collections.defaultdict(list)
    by_cat: dict = collections.defaultdict(list)
    for r in idind:
        cat = r.get("category")
        sub = r.get("subcategory")
        rec = {
            "ric": r["ric"], "role": r.get("stat_role"),
            "topic": r.get("indicator_topic") or r.get("description"),
            "freq": r.get("frequency"), "units": r.get("units"),
            "n_obs": r.get("n_obs"), "sub": sub,
        }
        by_catsub[(cat, sub)].append(rec)
        by_cat[cat].append(rec)

    # --- group equities into baskets by sub_sector ------------------------- #
    baskets: dict = collections.defaultdict(list)
    for r in eq:
        baskets[r.get("sub_sector") or "NA"].append(r)

    out_baskets = []
    for sub_sector, members in baskets.items():
        members = sorted(members, key=lambda x: -_f(x.get("mcap")))
        sector = members[0].get("sector") or ""
        total_mcap = sum(_f(m.get("mcap")) for m in members)
        top = members[:30]
        seed = M.SEED.get(sub_sector, {})

        # resolve CEIC candidate series
        ceic_groups = seed.get("ceic")
        if ceic_groups is None:
            ceic_groups = [(c, None) for c in M.SECTOR_CEIC.get(sector, [])]
        ceic_series = []
        seen = set()
        for (cat, sub) in ceic_groups:
            recs = by_catsub.get((cat, sub), []) if sub else by_cat.get(cat, [])
            for rec in recs:
                if rec["ric"] in seen:
                    continue
                seen.add(rec["ric"])
                ceic_series.append(rec)

        # global + macro driver hints (with theory priors)
        def _hints(lst):
            return [{"key": k, "role": role, "sign": sign, "why": why}
                    for (k, role, sign, why) in lst]

        globals_h = _hints(seed.get("globals", []))
        macro_h = _hints(seed.get("macro", M.STD_MACRO))
        # always ensure usdidr + benchmark present in candidate macro
        have = {h["key"] for h in macro_h}
        for k, role, sign, why in M.STD_MACRO:
            if k not in have:
                macro_h.append({"key": k, "role": role, "sign": sign, "why": why})
                have.add(k)

        out_baskets.append({
            "id": C.slugify(f"{sector}_{sub_sector}"),
            "sub_sector": sub_sector,
            "sector": sector,
            "n_names": len(members),
            "total_mcap": total_mcap,
            "benchmark": M.BENCHMARK,
            "members": [
                {"symbol": m["symbol"], "tv": f"IDX:{m['symbol']}",
                 "yf": (m.get("yahoo") or f"{m['symbol']}.JK"),
                 "mcap": _f(m.get("mcap")), "beta": m.get("beta")}
                for m in top
            ],
            "n_ceic_candidates": len(ceic_series),
            "ceic_candidates": ceic_series,
            "global_hints": globals_h,
            "macro_hints": macro_h,
            "has_seed": bool(seed),
        })

    # priority = mcap rank (largest first); these are the most important to nail
    out_baskets.sort(key=lambda b: -b["total_mcap"])
    for i, b in enumerate(out_baskets):
        b["priority"] = i + 1

    worklist = {
        "generated_from": {"equity_rows": len(eq), "idind_series": len(idind)},
        "n_baskets": len(out_baskets),
        "benchmark": M.BENCHMARK,
        "baskets": out_baskets,
    }
    C.write_json(C.STATE_DIR / "worklist.json", worklist)
    C.log(f"Wrote worklist: {len(out_baskets)} baskets -> "
          f"{C.STATE_DIR / 'worklist.json'}")
    # compact human summary
    print("\nPRIORITY | basket | sector | names | mcapT | ceic | seed")
    for b in out_baskets:
        print(f"{b['priority']:3d} | {b['sub_sector']:22s} | {b['sector']:24s} | "
              f"{b['n_names']:3d} | {b['total_mcap']/1e12:7.1f} | "
              f"{b['n_ceic_candidates']:3d} | {'Y' if b['has_seed'] else '.'}")
    return worklist


if __name__ == "__main__":
    build()
