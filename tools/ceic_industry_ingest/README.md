# CEIC → Industry Terminal ingest (Indonesia)

One-off pipeline that loaded **2,061 CEIC Indonesia industry series (797,659 observations)**
into the Supabase `macro` schema (`macro.series` + `macro.observations`, `country='idind'`),
which powers the launcher **Industry → Industry Data** gatherer (`launcher/scripts/industry-gather.jsx`).

## Source data
CEIC "Series.xlsx" exports under `CEIC Data/02_Industry/**` (wide format: ~27 metadata columns
per series, then one column per observation date).

## Hierarchy
The gatherer drills **Industry → Sub-industry → {Demand | Supply} → series**:
- `category`      = industry  (e.g. Energy, Banks, Healthcare)
- `subcategory`   = sub-industry (e.g. Coal, Multifinance, Hospitals)
- `stat_role`     = side: `demand` (sales · consumption · imports · prices · loans · traffic)
                          or `supply` (production · output · capacity · exports · inventory)
- `indicator_topic` = the specific series label / province slice
- `metadata`      = `{ industry, sub_industry, side }`

See `TAXONOMY_IND.md` for the full industry map and demand/supply classification rules.

## Pipeline (run in order, local, no network)
1. `parse.py`     — read all `02_Industry` xlsx → `master.json` (metadata + observations).
2. (7 parallel review agents categorise each file group → `cat_group0..6.json`.)
3. `finalize.py`  — merge + **coverage check** (every master Series ID is categorised) +
                    dedup by CEIC Series ID (2,631→2,061, keep the copy with most obs) →
                    `final_industry_series.json`.
4. `report.py`    — human inventory → `docs/INDUSTRY_CEIC_DATA_INVENTORY.md`.
5. `chunks.py`    — split into Supabase upsert payloads (series + observations).

## Conventions
- `ric` = `"CEICI"` + CEIC numeric Series ID. The **`I`** prefix separates industry rics from
  macro rics (`"CEIC"` + id) and from Refinitiv rics — no collisions.
- `country` = `'idind'` — keeps the industry universe out of the Macro terminal's US/ID/CN views
  while reusing the same `macro.series` / `macro.observations` tables (no schema migration).
- `frequency` = ISO-8601 duration: `P1D` daily · `P7D` weekly · `P1M` monthly · `P3M` quarterly ·
  `P6M` semiannual · `P1Y` annual.
- Upserts are idempotent (`Prefer: resolution=merge-duplicates`) — safe to re-run.

The terminal reads Supabase live, so no redeploy is needed for the data to appear.
