# Legacy Bridge Terminal

Two static terminals over Refinitiv + market data, packaged in one repo and one Supabase Postgres project.

| Terminal | What it does | Frontend | Backend |
|---|---|---|---|
| **Macro** | Bloomberg-style browser for ~6,700 macroeconomic series across US / Indonesia / China, plus 366 Reuters Polls forecast series. Search, charts, causal influence graph. | vanilla HTML + Chart.js + vis-network (no bundler) | sql.js (in-browser) OR Supabase Postgres |
| **Correlation** | Cross-asset correlation explorer across ~700 series (equity, FX, commodities, crypto, macro). Full-period heatmap, pair drilldown with **on-demand** rolling correlation, PCA, regime tagging. | vanilla HTML + canvas + Chart.js | Flask (`python correlation/ui/backend/app.py`, port 5174) OR Supabase Postgres function |

```
              ┌──────────────────────────────────────────────┐
              │            scripts/serve.js (4173)           │
              │      static + /data/... mount + launcher     │
              └───────────────┬──────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  /macro/dashboard/      /correlation/ui/      /data/{macro,correlation}/
  catalog-loader.js  →   static + Flask    →   <DATA_STORE_PATH>/...
  data-source.js                                (NOT in repo)
        │                                          │
        ▼                                          ▼
  Supabase Postgres macro.*  ◄────────────────────►  correlation.*  + Storage
```

---

## Quick start (local)

```bash
# 1. Configure path to the external data store
cp .env.example .env
# edit .env:
#   DATA_STORE_PATH=../data-store        (default — sibling of this repo)

# 2. Macro terminal
node scripts/serve.js 4173
# → http://127.0.0.1:4173/macro/dashboard/

# 3. Correlation terminal (Flask backend on :5174 for live compute)
pip install -r correlation/scripts/requirements.txt flask
python correlation/ui/backend/app.py
# → http://127.0.0.1:5174/  (or http://127.0.0.1:4173/correlation/ for the launcher entry)

# 4. Both at once (Windows)
Quickstart.bat
```

The dashboard fetches catalog JSON from the repo and time series from the external `data-store/` folder. **No data is committed to git** — see [Data store](#data-store).

---

## Repo layout

```
.                                  ← committed (infrastructure only)
├── README.md                      ← you are here
├── package.json                   ← npm scripts (serve, ingest:*, upload:*)
├── .env.example                   ← copy to .env; DATA_STORE_PATH + Supabase keys
├── .gitignore                     ← excludes data-store/, .env, config.js
├── Quickstart.bat / Stop.bat      ← Windows launchers
│
├── launcher/
│   └── index.html                 ← welcome screen (pick macro / correlation)
│
├── macro/                         ← Macro Terminal (self-contained)
│   ├── README.md                  ← detailed macro docs (catalog, pipeline, graph…)
│   ├── catalog/                   ← curated JSONs per country (us/, id/, cn/) + countries manifest
│   ├── dashboard/
│   │   ├── index.html
│   │   ├── lab.html               ← legacy Autocharter playground
│   │   └── js/
│   │       ├── config.example.js  ← copy to config.js (gitignored) to customize
│   │       ├── data-source.js     ← SqliteSource + SupabaseSource facade
│   │       ├── catalog-loader.js  ← uses DataSource, never SQL directly
│   │       ├── chart-engine.js
│   │       ├── macro-map.js
│   │       └── ui-terminal.js
│   └── scripts/                   ← Refinitiv xlsx ingestion + Tier-1/2 seeders + graph builder
│
├── correlation/                   ← Correlation Terminal (self-contained)
│   ├── catalog/                   ← universe.json + agent staging files
│   ├── scripts/                   ← ETL pipeline (fetch, merge, returns, correlations)
│   │   ├── _paths.py              ← shared path resolution (reads .env)
│   │   ├── correlation_engine.py  ← full-sample Pearson/Spearman, MP denoising, clustering
│   │   ├── compute_returns.py
│   │   ├── db.py                  ← SQLite mirror schema
│   │   └── ... (21 more ETL scripts)
│   └── ui/
│       ├── README.md
│       ├── backend/               ← Flask app (port 5174) — live correlation/PCA/regimes
│       └── static/                ← canvas heatmap + scatter + rolling pair charts
│
├── scripts/                       ← cross-cutting scripts
│   ├── serve.js                   ← unified static server (port 4173)
│   ├── upload_to_supabase.py      ← push macro + correlation to Supabase (idempotent)
│   └── optimize_matrices.py       ← rewrite correlation parquets at float32 + ZSTD
│
└── supabase/                      ← shared database project
    ├── README.md                  ← setup + upload steps
    └── migrations/
        ├── 0001_macro_schema.sql           ← macro.series / observations / graph + RLS
        ├── 0002_correlation_schema.sql     ← correlation.series / prices_* / returns_* / matrices
        └── 0003_correlation_functions.sql  ← rolling_corr() + pair_stats() — replaces 10 GB of parquet
```

---

## Data store

Heavy time-series data lives **outside the repo**. This keeps GitHub small, avoids committing proprietary Refinitiv exports, and lets both terminals share one canonical location.

```
data-store/                        ← never committed; see .gitignore
├── macro/
│   ├── us.sqlite        ~25 MB    ← macro.series + macro.observations source
│   ├── id.sqlite        ~9 MB
│   ├── cn.sqlite        ~22 MB
│   └── curation_batches/          ← agent input JSONs (CN + US polls curation)
└── correlation/
    ├── correlation.sqlite ~563 MB ← correlation.series + prices_* + returns_*
    ├── matrices/                  ← static full-period correlation matrices (5 × ~63 MB)
    │   ├── pearson_full_weekly.parquet
    │   ├── pearson_full_monthly.parquet
    │   ├── pearson_denoised_weekly.parquet
    │   ├── spearman_full_weekly.parquet
    │   ├── spearman_full_monthly.parquet
    │   └── cluster_order_weekly.json
    ├── returns/                   ← weekly + monthly log-return frames
    └── raw/                       ← staging / weekly / monthly fetched parquets
```

Total: **~1 GB** (down from ~12 GB after optimization — see [Storage optimizations](#storage-optimizations)).

The default `DATA_STORE_PATH=../data-store` means a sibling of the repo clone. Override in `.env` to point anywhere.

---

## Deploy to GitHub + Supabase

End-to-end, this is the deployment runbook.

### 1 — Push the repo to GitHub

```bash
git init && git add . && git commit -m "Initial commit: Legacy Bridge Terminal"
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes `data-store/`, `.env`, `dashboard/js/config.js`, build artifacts, and SQLite working files. Verify with `git status` before the first push — only infrastructure should appear.

### 2 — Create a Supabase project and apply schema

1. Sign up at supabase.com → New project. Note Project URL, anon key, **service role key**.
2. Paste these into your local `.env`:
   ```
   DATA_STORE_PATH=../data-store
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<public anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role>
   ```
3. Apply the three migrations through the Supabase SQL editor (or `supabase db push`):
   ```
   supabase/migrations/0001_macro_schema.sql
   supabase/migrations/0002_correlation_schema.sql
   supabase/migrations/0003_correlation_functions.sql
   ```

### 3 — Upload data

```bash
pip install -r macro/scripts/requirements.txt          # adds supabase-py too

# Macro: catalog JSON + SQLite observations → Postgres
python scripts/upload_to_supabase.py macro --country us
python scripts/upload_to_supabase.py macro --country id
python scripts/upload_to_supabase.py macro --country cn
python scripts/upload_to_supabase.py macro --graphs

# Correlation: SQLite mirror (series + prices + returns) → Postgres
python scripts/upload_to_supabase.py correlation

# (Optional) Static correlation matrices → Supabase Storage + index
python scripts/upload_to_supabase.py correlation --matrices
```

Every uploader is idempotent. Re-run after any data refresh — upserts on primary keys, never duplicates.

### 4 — Point the dashboard at Supabase

```bash
cp macro/dashboard/js/config.example.js macro/dashboard/js/config.js
```

Edit `config.js`:
```js
window.MACROTERM_CONFIG = {
  dataSource: 'supabase',
  supabase: {
    url:     'https://<project-ref>.supabase.co',
    anonKey: '<anon key>',
    macroSchema:       'macro',
    correlationSchema: 'correlation'
  }
};
```

Reload — the dashboard now reads from Postgres via `@supabase/supabase-js` (loaded from CDN at runtime). Flip back to `dataSource: 'sqlite'` any time for offline mode.

For the correlation Flask backend, switch its `data_loader.py` to read from Supabase as a future addition — currently it reads parquets from `<DATA_STORE_PATH>/correlation/` either way.

---

## Storage optimizations

The correlation pipeline used to write ~12 GB of parquet matrices. Two changes brought that down by ~92%:

| What | Before | After | How |
|---|---|---|---|
| Rolling Pearson matrices (52w / 156w / 36m) | 9.7 GB | **0 B** | Deleted — computed live via `correlation.rolling_corr()` Postgres function or `correlation_subset.rolling_pair()` for the local backend |
| Static full matrices (5 files) | 787 MB | **307 MB** | `scripts/optimize_matrices.py` — float64 → float32, SNAPPY → ZSTD-3 |
| Macro SQLites | 56 MB | 56 MB | unchanged |
| Correlation SQLite + returns | 595 MB | 595 MB | unchanged |
| **Total** | **~11.8 GB** | **~957 MB** |

To re-optimize after the next pipeline run:
```bash
python scripts/optimize_matrices.py --in-place --drop-rolling
```

The savings make the full data-store fit in Supabase Storage's free tier and keep cold-start downloads tolerable.

---

## Architecture invariants

These are load-bearing — break them and something subtle stops working.

1. **Data store is external.** Nothing under `data-store/` is committed. `.gitignore` excludes it, `data/`, and `*.sqlite-journal/-wal/-shm`.
2. **Macro catalog is committed.** `macro/catalog/*.json` is curated content (~50 files per country, hand-edited `meaning` / `how_to_use` / `related_series`). It's infrastructure, not data.
3. **Country = first-class** in macro. Every script and the data-source layer takes a `--country` arg. There is no implicit US default.
4. **Macro dashboard never touches SQL directly.** `macro/dashboard/js/catalog-loader.js` only calls into `DataSource` (`data-source.js`). To add a backend, implement `open(country)`, `getObservations(ric)`, `getSeriesCount()`, `close()`, and register it in the factory.
5. **Correlation rolling correlations are computed on demand.** Don't reintroduce `rolling_pearson_*.parquet` generation in `correlation_engine.py` — it's gone for good reason (~10 GB savings).
6. **Macro idempotency is sacred.** Seeders preserve hand-curated `meaning` / `how_to_use` / `related_series`. Only `description` and `frequency` auto-refresh on a Refinitiv re-ingest.
7. **Supabase migrations are versioned.** Add a new file `supabase/migrations/000N_<name>.sql` rather than editing existing ones. Re-applying an old migration breaks installs that already ran it.
8. **`.env` and `dashboard/js/config.js` carry secrets** — gitignored. Never commit Supabase URLs/keys.

---

## Deep dives

- [`macro/README.md`](macro/README.md) — macro catalog structure, build pipeline, causal influence graph, frontend features
- [`correlation/ui/README.md`](correlation/ui/README.md) — correlation UI templates, API surface, implementation notes
- [`supabase/README.md`](supabase/README.md) — Supabase setup, upload steps, cost notes
- [`data-store/README.md`](../data-store/README.md) — data store inventory
