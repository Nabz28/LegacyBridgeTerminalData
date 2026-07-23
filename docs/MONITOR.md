# MONITOR (T12) — Research Division Coverage Map, Live

The Monitor terminal turns the July-2026 coverage redesign
(`LBC_Research_Division_Coverage_Design.docx`) into an operating surface:
the division's team structure, who covers what, and live market monitoring
for every desk — global, multi-region, multi-country, down to single-country
(Indonesia) views.

## Structure implemented

The doc's recommended **10 specialist equity desks** (Phase 2 target operating
model, GICS-aligned, MECE over every public company) are live as E1–E10:

| # | Desk | # | Desk |
|---|------|---|------|
| E1 | Financial Institutions | E6 | Consumer Discretionary & Retail |
| E2 | Real Estate & Property | E7 | Healthcare & Life Sciences |
| E3 | Technology | E8 | Industrials & Transportation |
| E4 | Communication Services | E9 | Energy & Utilities |
| E5 | Consumer Staples | E10 | Materials, Mining & Agribusiness |

Plus the restructure's three **market desks** (the doc's "Strategy & Macro
layer", made concrete, extended with the FX and bond teams):

- **M1 FX Desk** — G10, EMFX, IDR complex, dollar cycle
- **M2 Rates & Credit** — sovereign curves (incl. INDOGB), credit ETFs, spreads
- **M3 Economics Desk** — US / China / Indonesia / Global live indicator book

Each desk carries a condensed 17-point dossier from the doc (mandate, macro
drivers, themes, factors, valuation toolkit, regulation, complexity) — open it
via the **Dossier** button in any desk header.

## Surfaces

- **Coverage Map** — 13 desk cards with live benchmark change + 3-month
  sparkline, sub-industry/name counts, desk assignments, and the 6→8→10+3→12-15
  phase roadmap.
- **Desk view** — two-panel drill-in: sub-industries (left, with counts) +
  detail (right). Region filters (Global / Americas / Europe / Asia-Pacific /
  ASEAN / Indonesia) and a by-country dropdown. Tabs:
  - *Overview* — TradingView advanced chart on the desk's benchmarks
    (US sector SPDRs, industry ETFs, IDX-IC sector indices) + live top
    movers from the filtered universe.
  - *Constituents* — sortable live quote table (~330 names desk-wide,
    global + Indonesian names per sub-industry). Row click → full Yahoo
    history + CSV.
  - *Index Lab* — custom index builder: pick up to 20 instruments from any
    desk (or type any Yahoo symbol), equal-weight rebased-to-100 composite,
    benchmark overlay, period return / ann. vol / max drawdown, per-member
    returns, CSV export, saved indices (localStorage).
  - *News* — TradingView live news per instrument or market wire.
  - Market-desk specials: FX cross-rate heatmap; Rates curve & spread board
    (FRED DGS2/5/10/30, T10Y2Y, T10Y3M, HY/IG OAS) + streaming sovereign
    yield board; Economics live indicator cards (macro.live_indicators,
    ~230 series) + TradingView economic calendar.
- **Global Markets** — ticker tape, index-by-country explorer (28 country
  benchmarks, Yahoo-driven, region-filterable, full history modal), streaming
  boards for sovereign yields / FX / commodities / crypto.
- **Screener** — TradingView screener across 24 equity markets + forex + crypto.
- **Newswire** — market wires (stocks / indices / FX / crypto) or pin any
  TradingView symbol.

## Data paths (all keyless from the client)

| Source | Used for |
|--------|----------|
| `equity-quote` edge fn (Yahoo v8) | live-ish quotes for constituent tables, desk cards, movers |
| `series-proxy` edge fn (YAHOO) | histories: custom indices, sparklines, detail modals |
| `series-proxy` edge fn (FRED) | rates curve + spread board |
| `macro.live_indicators` (PostgREST anon) | Economics desk indicator cards |
| `management.users_lite` (session JWT) | roster suggestions in the Assign editor |
| TradingView embed widgets | streaming charts, quote boards, news, screener, calendar, FX heatmap |

FX daily changes are rebuilt client-side from 5-day history (Yahoo's 1y daily
close array is sparse for `=X` symbols, which corrupts the edge fn's prevClose).

## Assignments

Desk head/analyst assignments edit in-app (Assign button) and sync team-wide
through `management.monitor_coverage` (migration `0056_monitor_coverage.sql`):
every authenticated user reads the shared book on mount; RLS lets only
`user_role in ('admin','management')` publish. Non-management edits fall back
to a per-browser copy (`localStorage['lbc-monitor-assign']`), which also
serves as the offline cache.

## Files

```
launcher/scripts/monitor-data.js     coverage taxonomy, universes, indices (data only)
launcher/scripts/monitor-live.jsx    fetch queue, caches, hooks, basket math, charts
launcher/scripts/monitor-views.jsx   quote table, index lab, econ/rates boards, TV wrappers
launcher/scripts/monitor-ws.jsx      terminal shell: rail, coverage board, desk router
launcher/styles/monitor.css          mon-* styles on the v5 token system
```

Registered as T12 in `lbc-shell.jsx` (selfNav, open to all authenticated
users), rendered via kind `monitor` in `app.jsx`.
