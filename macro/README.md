# Refinitiv Macro Terminal — `macro/` subpackage

> Part of the unified [Legacy Bridge Terminal](../README.md) repo. The top-level [README](../README.md) covers deploy + Supabase wiring; this file covers macro-specific internals: catalog shape, build pipeline, causal influence graph, frontend features.
>
> Paths in this document are relative to this folder (`macro/`) unless prefixed with `../` (root) or `data-store/...` (external data store).

Bloomberg-style static terminal over a Refinitiv export of macroeconomic series for the **United States**, **Indonesia**, and **China** — plus a parallel **US Reuters Polls** layer (forecast surveys with consensus / min / max / smart-econ / actual). One curated catalog, one local SQLite per country, one no-bundler dashboard. Switchable to a **Supabase Postgres** backend without touching application code.

---

## At a glance

| Country | RICs | Hand-curated entries | Long-tail templated | Backing DB |
|---------|------|----------------------|---------------------|------------|
| US      | ~3,886 | Tier-1 (16) + Tier-2 (~660) + Polls (366) | ~3,200 | `data-store/macro/us.sqlite` (~25 MB) |
| Indonesia (ID) | ~1,050 | Tier-1 (343) + auto (~700) | remainder | `data-store/macro/id.sqlite` (~9 MB) |
| China (CN)   | ~1,800 | Tier-1 (163) + 12 agent batches (1,461) + auto | remainder | `data-store/macro/cn.sqlite` (~22 MB) |

`catalog/` (~50 curated JSON files per country) **is committed** as part of the infrastructure. SQLite databases live in an external `data-store/` folder (see [Data store](#data-store)) and are **not** in the repo — populate it locally for offline mode, or point the dashboard at a Supabase project for the hosted path.

---

## Run it

From the repo root (one level up):

```bash
# 0. Configure the path to your data store (one-time)
cp ../.env.example ../.env
# edit .env: DATA_STORE_PATH=../data-store

# 1. Static server — shared launcher serves macro + correlation + /data
node ../scripts/serve.js 4173
# → http://127.0.0.1:4173/macro/dashboard/
```

The dashboard fetches `macro/catalog/<cc>/_index.json` + per-category JSONs, and pulls `<DATA_STORE_PATH>/macro/<cc>.sqlite` in-browser via sql.js (WASM). No backend, no bundler.

To switch to Supabase Postgres, see [the root README](../README.md#deploy-to-github--supabase) — it covers migration + upload + dashboard config flip in one place.

---

## Repo layout

```
.                                  ← committed (infrastructure)
├── README.md                      ← you are here
├── package.json                   ← serve script
├── .env.example                   ← copy to .env (DATA_STORE_PATH + Supabase keys)
├── .gitignore                     ← excludes data-store/, .env, config.js
├── catalog/
│   ├── _countries.json            ← country manifest (US default, ID, CN)
│   ├── us/
│   │   ├── _index.json            ← RIC → category index for US
│   │   ├── _graph.json            ← causal influence graph (nodes + edges + clusters)
│   │   ├── _graph_condensed.json  ← collapsed cluster-only view
│   │   ├── _graph_insane.json     ← maximal edge set (every related/part_of)
│   │   ├── us_<category>.json     ← curated entries per RIC
│   │   └── us_polls_<topic>.json  ← Reuters Polls (agri / gdp / housing / ism / labor / trade)
│   ├── id/                         ← same shape, Indonesia
│   └── cn/                         ← same shape, China
├── dashboard/
│   ├── index.html                 ← terminal UI (topbar / search / chart / metadata)
│   ├── lab.html                   ← legacy Autocharter lab (charting playground)
│   └── js/
│       ├── config.example.js      ← template — copy to config.js (gitignored) to customize
│       ├── data-source.js         ← backend-agnostic facade (SqliteSource + SupabaseSource)
│       ├── catalog-loader.js      ← per-country fetcher; talks to DataSource, not SQL
│       ├── chart-engine.js        ← Chart.js wrapper, exports, auto-widen, forecast styling
│       ├── macro-map.js           ← vis-network mini-map + fullscreen overlay
│       └── ui-terminal.js         ← search, category tree, polls view, watchlist, metadata
├── supabase/
│   ├── README.md                  ← Supabase setup, migrations, upload steps
│   └── migrations/
│       ├── 0001_macro_schema.sql       ← macro.series / observations / graph + RLS
│       └── 0002_correlation_schema.sql ← correlation.series / prices_* / returns_* / matrices
└── scripts/
    ├── _parse.py                  ← shared xlsx parser (US + ID + CN)
    ├── upload_to_supabase.py      ← push catalog + sqlite data → Supabase (idempotent upserts)
    ├── _parse_polls.py            ← custom parser for Reuters Polls schema
    ├── extract_rics.py            ← xlsx → catalog/<cc>/*.json (preserves curated fields)
    ├── extract_observations.py    ← xlsx → data/<cc>.sqlite
    ├── extract_polls.py           ← polls xlsx → catalog/us/us_polls.json + data/us.sqlite
    ├── seed_templates.py          ← long-tail templated baseline (--country)
    ├── seed_tier1.py              ← US 16 headline RICs (hand)
    ├── seed_tier2.py              ← US ~660 mid-importance RICs (hand) — AST-based dedup
    ├── seed_id_tier1.py           ← Indonesia 343 hand entries
    ├── seed_id_auto.py            ← Indonesia long-tail topic-aware auto
    ├── seed_cn_tier1.py           ← China 163 hand entries
    ├── seed_cn_auto.py            ← China long-tail topic-aware auto
    ├── seed_cn_batch_*.py         ← 16 files, agent-produced China curation (1,461 entries)
    ├── seed_us_polls_batch_*.py   ← 5 files, agent-produced US polls curation (366 entries)
    ├── _build_cn_batches.py       ← partition CN RIC pool into agent input JSONs
    ├── _build_polls_batches.py    ← partition US polls pool into agent input JSONs
    ├── _merge_cn_batches.py       ← merge agent outputs into catalog/cn/
    ├── _merge_us_polls.py         ← merge agent outputs into catalog/us/us_polls_*.json
    ├── _split_polls_categories.py ← split single us_polls.json into 6 topical files
    ├── build_graph.py             ← causal influence graph (default)
    ├── build_graph_condensed.py   ← cluster-only graph
    ├── build_graph_insane.py      ← maximal edge graph
    ├── enrich_skill.py            ← optional Claude API long-tail enrichment
    ├── requirements.txt           ← openpyxl + supabase
    └── serve.js                   ← tiny static file server (mounts data-store/macro at /data/)
```

### Sibling — `../data-store/` (NOT in this repo)

```
data-store/                        ← never committed; see .gitignore
├── macro/
│   ├── us.sqlite                  ← ~25 MB — series + observations (incl. US polls)
│   ├── id.sqlite                  ← ~9 MB
│   ├── cn.sqlite                  ← ~22 MB
│   └── curation_batches/          ← agent input JSONs
│       ├── cn_batches/
│       └── us_polls_batches/
└── correlation/                   ← consumed by the separate Correlation Terminal app
    ├── correlation.sqlite         ← ~563 MB — series + prices + returns
    ├── matrices/*.parquet         ← ~11 GB — precomputed correlation matrices
    ├── returns/*.parquet
    └── raw/                       ← staging downloads
```

---

## Data store

Heavy time-series data is intentionally split from the infrastructure repo. This keeps the repo small enough for GitHub, avoids leaking proprietary Refinitiv exports, and lets two terminals (macro + correlation) share one canonical data location.

- **Location** — anywhere outside the repo. The default in `.env.example` points to `../data-store` (a sibling of the repo clone). Override with `DATA_STORE_PATH` in `.env`.
- **Read in dev** — `node scripts/serve.js` mounts `<DATA_STORE_PATH>/macro/` under the `/data/` URL prefix, so the dashboard fetches e.g. `/data/us.sqlite`.
- **Read in production** — flip `dashboard/js/config.js` to `dataSource: 'supabase'` and the SQLite fetcher is bypassed entirely.
- **Categories**
  - `macro/` — backs the macro terminal (this app). One SQLite per country, plus the curation-batch JSONs used by the Python seeders.
  - `correlation/` — backs the separate correlation terminal at `../correlation/`. SQLite mirror + parquet matrices.
- See `data-store/README.md` for the full inventory.

---

## How the catalog is structured

For each country `<cc>` ∈ {`us`, `id`, `cn`}:

- `catalog/<cc>/_index.json` — `{ ric → { slug, category, description, frequency } }`. The fast lookup table.
- `catalog/<cc>/<cc>_<category>.json` — array of curated entries for RICs in that category. Each entry has:
  ```json
  {
    "ric": "aUSCPIYYR",
    "slug": "us-cpi-yoy-headline",
    "category": "us_consumer_prices_inflation",
    "subcategory": "Consumer prices — headline",
    "description": "US CPI YoY % NSA",
    "frequency": "P1M",
    "units": "% YoY",
    "meaning": "Year-on-year change in the headline Consumer Price Index ...",
    "how_to_use": "Watch for divergence from core; energy and food drive the gap ...",
    "related_series": ["aUSCPIXFE", "aUSPCEPI", "aUSFEDFUND"],
    "notes": ""
  }
  ```
- `catalog/<cc>/_graph.json` — `{ clusters, nodes, edges }` for the macro influence map.

Curated fields (`meaning`, `how_to_use`, `related_series`, `notes`, `units`, `subcategory`) are **always preserved** when `extract_rics.py` re-runs after a Refinitiv refresh. Only auto-derivable fields (`description`, `frequency`) are refreshed.

### US Polls (Reuters Economic Indicator forecasts)

Polls live alongside regular categories in `catalog/us/` but split by topic:

| File | Topic | Indicators |
|------|-------|------------|
| `us_polls_agri.json`    | Agriculture (CFTC, USDA, livestock, crops) | many |
| `us_polls_gdp.json`     | GDP, productivity, capacity utilisation | several |
| `us_polls_housing.json` | Housing starts, permits, sales, prices | several |
| `us_polls_ism.json`     | ISM Mfg / Services / Chicago PMI | several |
| `us_polls_labor.json`   | NFP, unemployment, claims, ADP, ECI | several |
| `us_polls_trade.json`   | Trade balance, current account, FX flows | several |

Each indicator has up to **9 statistics** (Median, Min, Max, ECON-Smart Estimate, Range, Latest, High Forecast, Total responses, Count) plus the published Actual. The dashboard groups them via `indicator_group_id` and displays them as one row per indicator that explodes into a multi-series chart on click.

Per-RIC fields specific to polls:
- `is_poll: true`
- `indicator_topic` — one of agri/gdp/housing/ism/labor/trade
- `indicator_group_id` — groups all stats for the same indicator
- `indicator_anchor_ric` — the published-actual RIC for the indicator (the spine)
- `stat_role` — `actual` | `median` | `min` | `max` | `smart` | `range` | `latest` | `high` | `total` | `count`

---

## Build pipeline

Required only if you want to rebuild from the raw Refinitiv xlsx exports (which are NOT in this repo — they live in `<repo-root>/../<Country> Macro Data/`). The committed `catalog/` + `data/` files were already built using these scripts.

```bash
pip install -r scripts/requirements.txt
```

Run per country, in order:

```bash
# RIC catalog skeletons (preserves curated fields)
python scripts/extract_rics.py --country us
python scripts/extract_rics.py --country id
python scripts/extract_rics.py --country cn

# Observations into per-country SQLite
python scripts/extract_observations.py --country us
python scripts/extract_observations.py --country id
python scripts/extract_observations.py --country cn

# US polls (separate xlsx)
python scripts/extract_polls.py
python scripts/_split_polls_categories.py

# Hand-curated tiers (idempotent — never overwrite existing meaning/how_to/related)
python scripts/seed_tier1.py            # US 16
python scripts/seed_tier2.py            # US ~660
python scripts/seed_id_tier1.py         # ID 343
python scripts/seed_cn_tier1.py         # CN 163
python scripts/_merge_cn_batches.py     # CN agent batches → catalog/cn/
python scripts/_merge_us_polls.py       # US polls agent batches → catalog/us/us_polls_*.json

# Long-tail templated baseline (fills only blank entries)
python scripts/seed_id_auto.py
python scripts/seed_cn_auto.py
python scripts/seed_templates.py --country us
python scripts/seed_templates.py --country id
python scripts/seed_templates.py --country cn

# Causal influence graph (one per country)
python scripts/build_graph.py --country us
python scripts/build_graph.py --country id
python scripts/build_graph.py --country cn
```

Order matters: hand seeders before auto/templated, since the latter never overwrite a non-blank field.

---

## Curation workflow

Three layers, applied in order — each one only writes when fields are still blank.

### 1. Tier-1 hand-curated (headline series)
The most-watched series for each country, with full `meaning` + `how_to_use` + `related_series`. These live as Python dicts in `seed_<cc>_tier1.py` so they're trivially diffable.

- US: `seed_tier1.py` — 16 entries (CPI YoY, NFP, GDP QoQ, Core PCE, Fed funds, ISM, etc.)
- ID: `seed_id_tier1.py` — 343 entries
- CN: `seed_cn_tier1.py` — 163 entries

### 2. Tier-2 mass curation
For mid-importance RICs. Two patterns coexist:

**a) Direct hand dict (US):** `seed_tier2.py` with a `CONDENSED_HAND` dict (~660 entries). Uses **AST-based merge** (not Python dict-literal evaluation) so duplicate slug keys recover correctly instead of last-key-wins silently dropping entries.

**b) Sub-agent batches (China + US polls):** the RIC pool is partitioned into batches and sent to parallel `sonnet` sub-agents, each producing a Python dict for its batch.

- China: `_build_cn_batches.py` → 12 logical batches → 16 actual files (3 oversize batches were split into a/b/p sub-batches when they hit the 32K output token limit) → `_merge_cn_batches.py` merges into `catalog/cn/`. 1,461 hand entries total. Slug-fallback logic in the merger handles agent outputs that omitted the `slug` field by looking it up in `_index.json`.
- US Polls: `_build_polls_batches.py` → 5 batches → 5 `seed_us_polls_batch_*.py` files → `_merge_us_polls.py`. 366 entries.

### 3. Long-tail
Programmatic baselines that never overwrite curated content:

- `seed_id_auto.py`, `seed_cn_auto.py` — topic-aware auto-curators that infer subcategory and pick a sensible `meaning` template per topic group. Skip-lists the Tier-1 RICs.
- `seed_templates.py` — final fallback, fills `units` from description regex + standard subcategory labels for any RIC still blank.

---

## Macro Map (causal influence graph)

`scripts/build_graph.py` builds `catalog/<cc>/_graph.json` per country. Output:

```json
{
  "generated_at": "...",
  "clusters": [{ "id": "inflation", "name": "Inflation", "color": "#ff8a00",
                 "anchor_ric": "aUSCPIYYR", "ric_count": 271 }],
  "nodes": [{ "id": "aUSCPIYYR", "label": "Headline CPI YoY",
              "cluster": "inflation", "tier": 1, "is_anchor": true }],
  "edges": [{ "source": "aUSCPIYYR", "target": "aUSFEDFUND",
              "type": "drives", "lag_months": [3, 6],
              "confidence": "hand", "note": "Inflation feeds Fed reaction function" }]
}
```

### Edge types
- `drives` — directed causal/policy effect (X moves Y, optional lag annotation)
- `leads` — temporal lead in the same chain (e.g., permits → starts)
- `part_of` — sub-aggregate to its cluster anchor (auto)
- `related` — symmetric correlation/release-companion (auto from `related_series`)

### Edge sources
- ~60–70 hand-authored Tier-1 edges in `HAND_EDGES` at the top of `build_graph.py` covering canonical macro chains (inflation → Fed → rates → mortgages, energy → CPI energy, ISM → IP, NFP ↔ unemployment, etc.).
- Auto-inferred from `related_series` and from `seed_templates` cluster anchors.
- Polls automatically wire each `actual`-role poll RIC to its non-poll counterpart via the `indicator_anchor_ric`.
- Hand edges always win over auto on dedupe; per-node fan-in/out capped at 8.

### Frontend rendering (vis-network)
- **Mini-graph** in the right metadata panel: active RIC + 1-hop neighbors. Click any neighbor to chart it.
- **Fullscreen overlay** (`⊕ Map` button in the topbar): cluster view first (~30 nodes). Click a cluster to drill into its constituent RICs. Right-click or back to collapse. Esc to close.
- Hand edges = solid + lag annotation on hover. Auto edges = 60% opacity, dashed for `related`/`part_of`.
- Poll RICs render as gold-bordered squares to distinguish from regular series.

### Adding a hand edge
Append to `HAND_EDGES` in `scripts/build_graph.py`:
```python
("aUSCPIYYR", "aUSFEDFUND", "drives", [3, 6], "Inflation feeds Fed reaction function"),
#  source        target       type      lag      note
```
Re-run `python scripts/build_graph.py --country us`. Edges referencing missing RICs are skipped with a warning.

### Adding a cluster
Add an entry to `CLUSTERS` (id, name, color), set `PREFERRED_ANCHORS[cluster_id]` to a representative RIC, and add a regex line to `SUB_TO_CLUSTER` matching the relevant subcategory tags.

---

## Frontend features

All in `dashboard/`. No build step — vanilla HTML + ES5-ish JS modules, Chart.js + vis-network from CDN.

- **Country picker** in the topbar — switches the entire catalog + DB. Backed by `Catalog.setCountry(cc)` which clears all caches and re-fetches.
- **Polls toggle** (US only for now) — the `📊 Polls` topbar button switches the left tree from regular categories to polls topical sections. It's a binary view switch: regular categories disappear when polls is on.
- **Search bar** — fuzzy across RIC, slug, description, meaning. Status header shows what was searched. Matched keywords are highlighted in `<mark>` style. "Matched in" hint shows where the hit came from.
- **Watchlist + chart engine** — multi-series overlay (line / area / bar), per-series visibility toggles, range buttons (1Y / 3Y / 5Y / 10Y / MAX).
- **Auto-widen range** — if the selected range yields zero observations (common for short or stale series), the chart automatically climbs the ladder to the next range that has data and shows a hint.
- **Forecast styling** — observation dates after today render as a dashed segment with a hollow point marker. Today's date is computed client-side; reload to refresh.
- **Export CSV / Export PNG** — CSV is one column per series. PNG uses a `whiteBgPlugin` for paper-friendly white background + black labels without altering the on-screen view.
- **Clear All** — single button to remove all overlay series.
- **Indicator bundles (polls)** — one row per indicator. Click loads all of its statistics (Actual + Median + Min + Max + Smart) as overlaid series with a tick toggle per stat in the metadata panel.
- **Metadata panel** — meaning, how_to_use, related_series (clickable chips), units, frequency, source, plus the mini-graph.

---

## Adding a fourth country

1. Drop the Refinitiv xlsx exports into `<repo-root>/../<Country> Macro Data/`.
2. Add a country entry to `catalog/_countries.json`:
   ```json
   { "code": "jp", "name": "Japan", "flag": "JP" }
   ```
3. Extend `scripts/_parse.py`:
   - Add `"jp"` to `COUNTRY_DIRS` mapping to the new xlsx folder name.
   - Update `slug_from_filename()` if the country uses a different filename pattern.
4. Run the build pipeline with `--country jp` (extract_rics → extract_observations → seed_templates → build_graph).
5. (Optional) Write `seed_jp_tier1.py` for headline series, then `seed_jp_auto.py` for the long tail.
6. Reload the dashboard — the new country shows up in the picker automatically.

---

## Data shape (per Refinitiv xlsx, regular categories)

All non-polls files share the same layout:
- R4C1 = section, R4C2 = subcategory
- R4 cols 4, 7, 10, … = description per RIC
- R5 cols 4, 7, 10, … = RIC code
- R7+ alternating (date, value) at (col, col+1), spacer at col+2

Frequency is inferred from the median of consecutive date deltas (P1D / P1W / P1M / P3M / P6M / P1Y).

### Polls schema (different)

- R2C2 = indicator name (e.g., "ISM Manufacturing PMI")
- R7 = stat header row (Actual / Median / Min / Max / ECON-Smart Estimate / …)
- R8 = RIC row, one RIC per stat column
- R9+ = data rows (one period per row)

Parsed by `scripts/_parse_polls.py`, ingested by `scripts/extract_polls.py`. Each (indicator × statistic) becomes its own RIC + observation series.

---

## Optional: API-assisted enrichment

`scripts/enrich_skill.py` calls the Claude API for higher-quality long-tail content if you have an `ANTHROPIC_API_KEY` (~$3-5 for the full catalog). Use it to upgrade specific categories after the templated baseline:

```bash
export ANTHROPIC_API_KEY=sk-...
python scripts/enrich_skill.py us_banking --dry-run   # preview to /tmp
python scripts/enrich_skill.py us_banking --force     # overwrite templated content
python scripts/enrich_skill.py --all --force          # whole catalog
```

This is orthogonal to the agent-batch curation workflow above; it predates it and is kept around for cases where you want a single category upgrade without orchestrating sub-agents.

---

## Notes for future Claude sessions

- **Idempotency is sacred.** Every seed/extract script must preserve hand-curated fields. Re-running the pipeline after a Refinitiv refresh should never regress meaning/how_to_use/related_series.
- **`extract_rics.py` is non-destructive** — it only refreshes `description` and `frequency`.
- **Slug uniqueness is enforced at index time.** If you see duplicate slugs in a `_index.json`, that's a bug in a seeder. The Tier-2 AST-based merger exists specifically because Python dict literals silently drop duplicate keys.
- **Polls and regular categories must not collide.** Polls toggle is a view switch (binary), not an overlay.
- **The mini-map and the fullscreen map share `macro-map.js`.** Don't fork them.
- **Auto-widen exists for a reason.** If you change range logic in `chart-engine.js`, keep `autoWidenRangeIfEmpty()` in the chain — empty 0-to-1 axes are the most-reported UX bug.
- **The `.sqlite` databases are NOT committed.** They live in `data-store/macro/` outside the repo. Anyone cloning needs either (a) a populated `data-store/` and `.env` pointing at it, or (b) Supabase credentials in `dashboard/js/config.js`. The `.gitignore` blocks `data/`, `data-store/`, and `*.sqlite-journal/-wal/-shm`.
- **Country = first-class.** Anything that touches the catalog must take a `--country` arg or read from `_countries.json`. There is no implicit US-default in the data layer anymore.
- **The dashboard never touches SQL directly.** `dashboard/js/catalog-loader.js` only calls into `DataSource` (`dashboard/js/data-source.js`). To add a backend, implement `open(country)`, `getObservations(ric)`, `getSeriesCount()`, `close()` and register it in the factory.
- **Supabase migrations are versioned.** Add a new file `supabase/migrations/000N_<name>.sql` rather than editing existing ones — re-applying old migrations would break installs that already ran them.
