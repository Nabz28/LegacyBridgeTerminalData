# CEIC → Macro Terminal ingest (Indonesia)

One-off pipeline that loaded **1,017 CEIC macro series (242,982 observations)** for Indonesia
into the Supabase `macro` schema (`macro.series` + `macro.observations`, `country='id'`),
which powers the launcher terminal's **Data Gatherer**.

## Source data
CEIC "Series.xlsx" exports under `CEIC Data/01_Macro/**` (wide format: ~27 metadata columns
per series, then one column per observation date).

## Pipeline (run in order, local, no network)
1. `parse.py`     — read all 60 macro xlsx → `master.json` (series metadata + observations).
2. `analyze.py`   — dedup/quality stats (unique Series IDs, DC, freq distribution).
3. `slim.py`      — metadata-only catalog + 5 file groups for review.
4. (5 parallel review agents categorise each group → `cat_group1..5.json`.)
5. `finalize.py`  — merge + dedup by CEIC Series ID (1,191→1,017), apply QA fixes,
                    map to the terminal taxonomy → `final_series.json`.
6. `report.py`    — human inventory → `docs/MACRO_CEIC_DATA_INVENTORY.md`.
7. `chunks.py`    — split into Supabase upsert payloads.

## Conventions
- `ric` = `"CEIC"` + CEIC numeric Series ID (stable, unique, no collision with Refinitiv rics).
- `frequency` = ISO-8601 duration: `P1D` daily, `P1M` monthly, `P3M` quarterly, `P6M` semiannual, `P1Y` annual.
- `category_slug` reuses the existing terminal taxonomy (see `TAXONOMY.md`); new slugs added:
  `id_consumer_prices`, `id_producer_prices`, `id_capital_markets`, `id_payment_systems`,
  `id_foreign_investment`, `id_government_revenue`.
- Upserts are idempotent (`Prefer: resolution=merge-duplicates`) — safe to re-run.

The terminal reads Supabase live, so no redeploy is needed for the data to appear.
