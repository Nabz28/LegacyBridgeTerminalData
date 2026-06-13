# LBC Industry Driver Engine — Plan & Methodology (v1)

**What this replaces.** The Industry terminal's "Demand/Supply Drivers" view
(`launcher/scripts/industry-data.jsx`) was a hand-curated heuristic: each sector
had drivers with a manually-set `upIs` (tailwind/headwind) and `weight`, and
"posture" was just *did the indicator move this week × is up good/bad*. There was
**no statistical link to actual stock returns**. This engine replaces the
guesswork with **empirically estimated, theory-reconciled driver models**, one
per IDX sub-industry, validated against real prices.

## 1. Unit of analysis
The **52 IDX equity baskets** (`equity_screen.sub_sector`, mcap-ranked, 636
names) — each is a real basket with a price. CEIC industry data + macro series are
the **driver pool** tested against each basket's returns. Worklist:
`state/worklist.json` (priority = total mcap; Banks → Coal → Mining → … → Utilities).

## 2. Data planes (all already live; no DDL needed)
| Plane | Source | Used for |
|---|---|---|
| IDX prices | `data-store/correlation.sqlite` `prices_weekly` (2.6M rows) + yfinance `.JK` fallback | basket return index |
| Benchmark (IHSG) | `correlation.sqlite` `IDX:COMPOSITE` | excess return |
| CEIC industry drivers | `macro.observations` (country=`idind`, 2,061 series, demand/supply tagged) | demand/supply drivers |
| Commodities/FX/yields | `correlation.sqlite` (energy/metals/agri/fx, resolved via `mapping.GLOBAL_CORR`) | price drivers |
| ID/CN/US macro | `correlation.sqlite` (`ECONOMICS:IDINTR`, `aCNIP`, `TVC:US10Y`, …) | macro drivers |
| Live fallback | `macro.live_indicators.spark` | recent-only drivers |

## 3. Per-basket pipeline (`engine/run_basket.py`)
1. **Basket** (`basket.py`): top-30 names by mcap → weekly closes → **weight-capped**
   (max 12%/name, so a controlled mega-cap like BYAN can't mask the signal) cap-
   weighted index; also equal-weight + excess-vs-IHSG. Returns at W/M/Q.
2. **Candidates** (`drivers.py`): curated CEIC demand/supply series (province slices
   dropped, deduped, annual/semiannual excluded, capped ~46) + the seed
   global/macro drivers (`mapping.SEED`, with theory sign priors).
3. **Statistics** (`stats.py`), per driver vs the basket's **raw return** (excess
   reported alongside), at the driver's native frequency (monthly workhorse /
   quarterly):
   - Pearson + Spearman (+ p-values)
   - **lead-lag** cross-correlation (driver leads basket 0–6 periods → best lag)
   - **HAC-OLS** (Newey-West): β, t, p, R² — contemporaneous + at best lead
   - **Information Coefficient** (Spearman of driver_t vs return_{t+1}) + t-stat
   - split-sample **sign stability**; data-quality flags (overlap, staleness)
   - **empirical sign vs theory prior** → agreement flag
4. **Selection** (`stats.select_drivers`): quality + significance gate, dedup,
   composite score (magnitude · significance · IC · lead · stability · theory),
   rank, keep top ~12.
5. **Model** (`theory.py`): per-driver live posture (latest move × empirical sign);
   net demand/supply/cost/macro tilt; **multivariate** OLS of monthly return on the
   long-history kept drivers (joint R², adj-R²) + **expanding-window out-of-sample**
   directional hit-rate; confidence (strength · significance · theory-agreement ·
   stability · OOS); verdict (BULLISH…BEARISH + score) + narrative (why + how much).
6. **Verify** (`verify.py`): grade `perfected | partial | needs_review | blocked`.
7. **Persist** (`persist.py`): `output/<id>.json` + compiled `output/engine.json` +
   `launcher/scripts/industry-engine-data.js` (`window.INDUSTRY_ENGINE`).

## 4. Why this is quant-grade (statistics + theory, not pure stats)
- Stationary transforms by series type (log-return / difference / YoY).
- HAC standard errors (returns are heteroskedastic + autocorrelated).
- Lead-lag captures **predictive** (leading) drivers, not just contemporaneous.
- IC + expanding-window OOS = the buy-side standard for "does this actually
  forecast", guarding against in-sample overfit.
- **Theory reconciliation**: a statistically-strong driver that contradicts a
  robust economic prior is rejected (anti data-mining); priors come from the
  curated `mapping.SEED` (e.g. coal price → coal miners +, input cost → margin −,
  rate ↑ → property −, USD/IDR ↑ → exporters + / importers −).
- Multiple-testing controlled by curating candidates and weighting theory-agreement.

## 5. The 52 baskets (priority order, from `worklist.json`)
Banks · IT Services · Coal · Mining · Alternative Energy · Food & Beverage ·
Property · Chemicals · Energy Services · Telco · Hospitals · Plantation ·
Conglomerate · Metals & Mining · Internet · Oil & Gas · Insurance · Tobacco ·
Containers & Packaging · Machinery · Retail · Pharma · Paper · Media · Household ·
Investment · Leisure · Cement · Construction · Multifinance · Apparel · Shipping ·
Airlines · Securities · Metals · Ports · Construction Materials · Electronics ·
Healthcare Equipment · Logistics · Restaurants · Poultry · Electrical Equipment ·
Software · Durables · Toll Road · Healthcare Services · Tower · Services · Auto ·
Staple Retail · Utilities.
Each basket's seed demand/supply/macro drivers + theory signs are in
`engine/mapping.py::SEED`; CEIC candidates are auto-attached from the matching
industry category by `build_worklist.py`.

## 6. Execution model
A durable 20-min cron advances the worklist autonomously (`engine/controller.py`),
one basket per step, committing each. See **RUN.md** for the loop, the perfection
bar, enrichment of weak baskets, token-reset resilience, and cron self-management.

## 7. Known limitations / future work (tracked in RUN.md FINALISATION)
- Newcastle coal future (`ICEEUR:ATW1!`) is empty in the price store → coal uses
  BCOM/Brent/HBA proxies. LME nickel/tin futures absent → Mining uses metals
  complex + CEIC. Some macro keys (lending rate, govt debt) lack deep history.
- Macro/sentiment-driven baskets (Tech, Alt-Energy) have inherently weak *monthly*
  fundamental drivers → honestly graded `partial`; weekly-frequency global beta is
  a future enrichment.
- UI overlay of `window.INDUSTRY_ENGINE` into `industry-data.jsx` is a
  finalisation step (after the book is built).
