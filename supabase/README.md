# Supabase integration

This folder holds everything needed to push the local SQLite + JSON data into
a Supabase Postgres project, and to serve it back to the dashboard.

## Migration numbering — read before adding one

There is **no `supabase_migrations.schema_migrations` table** on this project:
migrations are applied by hand (SQL editor, or `scripts/mgmt-api-sql.js` over the
Management API). The filename is therefore the entire ordering contract, and
nothing stops two branches picking the same number.

That has bitten this repo three times — `0008`–`0011` (macro vs management),
`0038`–`0040` (brain vs finance), and `0056`–`0058`, where an unmerged branch
collided with MONITOR on `main` and its three migrations went missing for weeks
until they were recovered as `0060`–`0062`.

**Before adding a migration, run:**

```bash
npm run check:migrations
```

It prints the next free number and exits non-zero on a new collision. The seven
historical duplicate pairs are grandfathered (they are applied and referenced by
name elsewhere); do not add to that list to silence a new one — renumber instead.

Migrations must be **idempotent** (`create ... if not exists`,
`drop policy if exists` before `create policy`) so a re-run is always safe.

## Layout

```
supabase/
├── README.md
├── migrations/
│   ├── 0001_macro_schema.sql        ← macro.series, macro.observations, macro.graph
│   └── 0002_correlation_schema.sql  ← correlation.series, prices/returns, matrices
└── seed/                            ← optional fixture data
```

## What lives where

| Source on disk                                          | Supabase destination                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `data-store/macro/us.sqlite` `id.sqlite` `cn.sqlite`    | `macro.series` + `macro.observations`                                  |
| `catalog/<cc>/<cc>_<category>.json`                     | curated columns of `macro.series` (meaning, how_to_use, related, …)    |
| `catalog/<cc>/_graph*.json`                             | `macro.graph` (3 rows per country: full / condensed / insane)          |
| `data-store/correlation/correlation.sqlite`             | `correlation.series` + `prices_*` + `returns_*`                        |
| `data-store/correlation/matrices/*.parquet`             | Supabase Storage bucket `correlation-matrices` + `correlation.matrices` index |
| `data-store/correlation/returns/*.parquet`              | (already in `returns_*` Postgres tables, parquet kept for offline use) |

## One-time setup

1. Create a Supabase project at https://supabase.com.
2. Copy the Project URL, anon key, and **service role key** from Settings → API.
3. Add them to a local `.env` at the repo root:
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<public anon key>
   SUPABASE_SERVICE_ROLE_KEY=<server-side service role>
   DATA_STORE_PATH=../data-store
   ```
4. Apply migrations. Either through the Supabase SQL editor:
   ```sql
   -- paste migrations/0001_macro_schema.sql, run
   -- paste migrations/0002_correlation_schema.sql, run
   ```
   or via the Supabase CLI:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
5. (Correlation only) Create a public Storage bucket named `correlation-matrices`
   so the parquet correlation matrices can be uploaded.

## Upload data

```bash
# Macro: catalog JSON + SQLite observations → Postgres (idempotent)
python scripts/upload_to_supabase.py macro --country us
python scripts/upload_to_supabase.py macro --country id
python scripts/upload_to_supabase.py macro --country cn

# Correlation: SQLite mirror → Postgres (uses data-store/correlation/correlation.sqlite)
python scripts/upload_to_supabase.py correlation

# Correlation matrices: parquet → Supabase Storage + matrices index
python scripts/upload_to_supabase.py correlation --matrices
```

Every uploader is idempotent. Re-running them after a refresh upserts on
primary keys, never duplicates.

## Switch the dashboard to Supabase

Edit `dashboard/js/config.js` (copy from `config.example.js` first):

```js
window.MACROTERM_CONFIG = {
  dataSource: 'supabase',
  supabase: {
    url:     'https://<project-ref>.supabase.co',
    anonKey: '<anon key>',
  }
};
```

Reload — the dashboard now reads from Postgres via `@supabase/supabase-js`
loaded from the CDN. Switch back to `dataSource: 'sqlite'` to use the
local data store at any time.

## Cost notes

- The `macro.observations` table is small (~1M rows across US + ID + CN).
- The `correlation.returns_*` tables together hold ~6–8M rows.
- The 11 GB of parquet correlation matrices in `data-store/correlation/matrices/`
  are deliberately kept out of Postgres rows and pushed to Supabase Storage.
  Free-tier Storage caps at 1 GB — be selective about which matrices you
  upload, or upgrade the project before running `--matrices`.
