# Industry Terminal — Fix Round (CEO feedback + specialist teardown)

Authoritative task list. Verified against the REAL macro.live_indicators keys (below).
Files: launcher/scripts/industry-core.jsx (analytics+taxonomy), industry.jsx (landing+sector),
industry-comps.jsx (competitive positioning), industry-data.jsx (driver deep-dive), styles/industry.css.

## VERIFIED KEY CORRECTIONS (ground truth — use these exact keys)
- **IHSG / benchmark = `jci`** (Jakarta Composite, Equity Indices, live daily). NOT `id_share_price` (monthly FRED). Fallback chain: indByKey['jci'] || indByKey['id_share_price'].
- Commodity drivers CONFIRMED present: wti, brent, natgas, wb_coal_au (Newcastle), wb_lng_jp, gold, copper, aluminum, iron_ore, steel_hrc, wb_nickel, wb_tin, wb_zinc, lithium_etf, wb_palm_oil (CPO), soybean_oil, wb_rubber, corn, wheat, sugar, coffee, wb_urea, wb_dap, wb_potash, sp_gsci, bcom.
- Indonesia drivers CONFIRMED: id_bi_rate, id_interbank_3m, id_lending_rate, id_deposit_rate, id_cpi_yoy, id_cpi_index, id_gdp_real_q (LEVEL not growth — see cycle fix), id_exports, id_imports, id_bank_credit, id_m2, usdidr (FX region), id_usdidr_m.
- China demand drivers CONFIRMED: cn_pmi_mfg, cn_ip_yoy, cn_retail_yoy, cn_property_inv, cn_floor_sold, cn_imports_usd, cn_m2_yoy, cn_share_price.
- US: us_2s10s, us_3m10y (spreads), us_fed_funds, us_10y, us_cpi, us_indpro, us_caputil, us_housing_starts, us_umich, dxy.
- NO Indonesia SUN/govt-bond yield series exists -> cannot build an Indonesia yield-curve. Rebuild cycle WITHOUT it.
- Any TAXONOMY driver key not in the above list resolves to N/A -> grep every key string in industry-core TAXONOMY and reconcile to this list; fix mismatches; for genuinely-absent ones (e.g. specific trade volumes) mark the DriverCard "no series" explicitly, not silent N/A.

## CEO's NAMED ITEMS (must all be done)
1. Kill the yellow banner (the amber "in-banner"). Split the overloaded `in-banner` class by meaning: alert (amber, bold) / note (subtle gray, NOT a yellow box) / xlink (dim inline) / error (red). The Global/US "single-name coverage" note becomes a subtle gray note, not a yellow box.
2. Global & US lenses are bugged -> fix the broken region filter (industry.jsx ~999: `ind.region==='id' || ind.region===region` is a no-op) AND populate US/Global with the new US dataset (see DATA below).
3. "Do 1, 2, 3" = all three workspaces fully live & working (Industry / Competitive Positioning / Drivers). No placeholder/sample anywhere.
4. Nav icons all identical -> give each workspace/nav item a DISTINCT icon.
5. ALL samples -> live. Replace NEWS_PLACEHOLDER (industry.jsx ~778) with live news; remove every hardcoded/sample/dummy/placeholder array; wire to real data.
6. Competitive positioning has NO US/Global -> add region (US uses public.equity_screen_global; Global later). Add a region selector in W2.
7. Driver/supply data: timeseries chart + downloadable CSV (like macro terminal). Charts must use real macro.observations history; add a CSV download button on every chart/table.

## SPECIALIST TEARDOWN — MUST-FIX
- News feed fake (industry.jsx ~778 NEWS_PLACEHOLDER) -> live RSS/news (reuse window.MacroNews / macro-news.jsx pattern; sector-tag filter). [=CEO#5]
- 7D/30D returns absent (industry.jsx ~429) -> needs price history. Use macro.observations / a price_history approach; until then label honestly and DO compute from available history. (Coordinate with data agent's driver/price history.)
- filteredTaxonomy region filter is a no-op (industry.jsx ~999) -> fix to real region filtering. [=CEO#2]
- "Sector Performance" chart is actually a commodity sparkline (industry.jsx ~382) -> relabel to "Primary Driver Chart" (subtitle = the driver name) OR build a real breadth/return proxy. No mislabeling.
- IHSG proxy wrong -> use `jci` (industry-core ~357). [verified above]
- Conviction = 1D-only -> relabel "1D Signal (0-100)" OR fold in 7D/30D; bump driver-tilt weight from ±10 to ±30 so drivers (CEO's priority) actually drive the score. Document thresholds.
- Business cycle uses US yield spread for Indonesia + null rate + arbitrary 4% CPI -> rebuild from id_bi_rate trend + id_cpi_yoy vs 3.5% band + cn_pmi_mfg/growth; guard nulls; show "Insufficient data" rather than a confident wrong default.

## SPECIALIST — HIGH (do as many as feasible)
- Reconcile all TAXONOMY driver keys to the verified list; fix silent N/A.
- CSV export on EVERY table/chart (peer comps, ticker table, driver matrix, movement alerts, driver charts). [=CEO#7]
- 6-dim competitive score double-counts sector-level signals across peers (industry-core ~239) -> make Industry dim ticker-level (ticker RS vs sector mean) + Macro dim ticker-level (FX/commodity/rate sensitivity from beta, sub_sector, D/E). Differentiate peers.
- Sector-level beta pill on each sector card (mean of ticker betas; add to analytics.snapshot).
- W2 region selector + "View by IDX sector" vs "View by Commodity Industry (TAXONOMY ticker lists)" so Coal (BYAN/ADRO/ITMG/PTBA) is its own peer set. [=CEO#6]
- Movement-alert thresholds per-commodity (not global 10%/5%); store in TAXONOMY/COMMODITY tiles.
- SVG-based PositioningQuadrant (replace fragile div calc math, industry-comps ~565).
- Sector RS comparison multi-line chart (W3) from each sector's primary-driver spark.
- Kesimpulan: make it conditional/rule-based (driver thresholds + RS + breadth + forward "watch/trade" line), not a static mail-merge template.
- Keyboard shortcuts (1-3 workspaces, G/US/I region, S sector focus, Esc back).

## DATA (from the running data-acquisition agent)
- NEW table public.equity_screen_global (US large-caps, all 11 GICS sectors, equity_screen columns + market+currency). Read it exactly like public.equity_screen (Accept-Profile: public). US lens (landing sector grid + W2 comps) reads this; Indonesia reads public.equity_screen. Global = both/commodity-driver lens.
- Driver timeseries: chart from macro.observations (ric/date/value) joined via macro.series; CSV from same. The data agent reports which RICs have history.

## ICONS (distinct per nav/workspace) — suggest: Industry=grid/landscape, Competitive Positioning=scales/ranking bars, Drivers=gauge/flow, plus per-section glyphs. No two identical.

## DO NOT
- Do not break the build (verify Babel transpile). Keep window.INDUSTRY / window.IND* globals stable. Additive analytics changes. No secrets. Test region toggles + each workspace render.
