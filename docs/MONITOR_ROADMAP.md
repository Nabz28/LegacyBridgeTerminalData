# MONITOR God Roadmap — every improvement worth building

State as of 2026-07-24 (`6093cab`, 12 prod deploys): 13 desks, 650 validated
symbols, regime engine v1 (8 fixed-band components + flags + 60-session
history), volume flow v1 (rVol), rotation strip, Index Lab v2, shared
assignments, deep links. This document is the exhaustive upgrade map:
**every item carries a validation gate** — nothing ships on vibes. Effort:
S (<half day) / M (1-2 days) / L (multi-day).

House rule (from the LBC honest-numbers culture): quant upgrades ship ONLY
if their node backtest gate passes; otherwise the finding is documented and
the item is dropped. The lead-lag harness (1.1) is the master gate — build
it first, everything in Phases 1-3 reuses it.

---

## Phase 0 — Hygiene & Truth (do first; S/M items, no new surface)

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 0.1 | **Kill FRED look-ahead** | HY OAS / 2s10s publish T+1; the rolling history slices `date <= asOf` (unobservable data in the highest-weighted component) and live gives full weight to stale legs. Lag FRED one business day everywhere; decay component weight by staleness (`w *= max(0,1−staleDays/5)`). | Lagged-vs-unlagged IC diff quantifies the leak; assert every component ≤5 bdays stale in test-monitor-regime.js | S |
| 0.2 | **Label hysteresis** | Single ±0.30 cut whipsaws; streak resets on one-day blips. EMA-smooth the score (0.7/0.3) + Schmitt trigger (enter ≥0.35, exit <0.20). | 2y reconstruction: 3-10× fewer flips; entry lag ≤3 sessions at known turns | S |
| 0.3 | **Continuous kickers** | Binary VIX-spike/credit-widening kickers (−0.4/−0.5) cause phantom composite jumps. Replace with clamped ramps. | No day-over-day composite jump >0.05 unexplained by inputs | S |
| 0.4 | **Composition-stable history + fixed pctile windows** | Sparkline points mix expanding windows and silently changing component sets. Fix window to 252 obs, freeze component set across the sparkline, expose `coverage`, suppress label <0.6 coverage. | Synthetic test: constant inputs → flat sparkline | S |
| 0.5 | **Date-based return windows** | `ret(s,21)` counts observations; gappy `=X` series make "1M" span 6+ weeks. `retDays(s,30)` everywhere. | Span distribution stays ±3 days of target | S |
| 0.6 | **Batch quote endpoint** | `monitor-quotes?tickers=a,b,c` edge fn (one request per table instead of ~50; server fans out to Yahoo). Client falls back to per-ticker on error. | Desk constituents table fills in <3s vs ~15s | M |
| 0.7 | **Nightly book validation** | Supabase scheduled edge fn (or GitHub Action) runs the ticker validation against the live book, writes failures to a `monitor_health` table; surfaced as a red chip in the terminal. Book stays perpetually green. | Seed a dead ticker → chip appears next run | M |
| 0.8 | **CI tests** | GitHub Action: node unit tests for regime lib (pure) + basket math + a 5-symbol validation smoke on every push to main. | Red build on injected regression | M |
| 0.9 | **Key rotation** | service_role JWT + Management PAT circulated in chat; anon key fine. Rotate, move PAT use to local untracked file. | Old creds revoked, terminal still works | S |

## Phase 1 — Prove the Alpha (the master gate + core methodology)

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 1.1 | **Lead-lag validation harness** (build FIRST) | Node script: 3y dailies, rebuild composite daily (with 0.1-0.5 fixes), Spearman IC vs forward 5/10/21d returns for SPX + all 13 desk benchmarks, block-bootstrap t-stats, tercile spreads, cross-correlograms. THE gate for every signal claim. | IC>0, \|t\|>2 at 21d for SPX + majority of cyclical desks — else relabel UI from "detection" to "state description" | M |
| 1.2 | **Adaptive normalization** | Fixed bands (VIX 12-30, DXY ±3%…) saturate or never fire across vol regimes. Rolling 252d z-scores (`clamp(z/1.5)`) or percentile ranks per component; fetch 2y legs. | Saturation share <5% of days (fixed bands >20%); IC no worse than v1 | M |
| 1.3 | **Data-driven weights** | Hand weights double-count SPX (trend+eqmom = 2.2/8.4) and ignore collinearity. `w ∝ max(0,IC)` shrunk 50% to equal, divided by Σ\|ρ\| per component; refreshed quarterly by script, hardcoded constants (auditable). | Walk-forward OOS IC beats equal weights; effective N ~3 → 5+ | M |
| 1.4 | **Beta-adjusted RS + vol-scaled momentum** | Raw `r1m−spx` makes high-β Tech "leader" in every rally — the chip restates market direction. Regression β over 6mo; RS = residual at ±1σ; momentum z = ret/σ√21; add skip-month (63d−21d) chip. | β-adjusted calls decorrelate from sign(SPX 1M) with equal-or-better fwd spread | M |
| 1.5 | **Regime playbook table** | Link regime state to desk relative performance: per label, mean 21d fwd desk-minus-SPX from 1.1's history, bootstrap CIs, display only CI-excludes-0 cells ("in RISK-OFF: E5 +1.2%, E3 −2.1%"). The rotation aid, made empirical. | ≥3 cells survive CIs, else don't ship and soften the claim | M |
| 1.6 | **Skip-month momentum** | 1M return is reversal-contaminated. Test 6m-skip-1m (`ret126−ret21`) vs r1m cross-sectionally on the 13 benchmarks; adopt winner for eqmom + desk chips. | Higher fwd-21d rank IC | S |

## Phase 2 — Deeper Flow (breadth, volume, vol-structure, credit)

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 2.1 | **Trend breadth** | Today-only A/D is noise. From bars: % above 50d SMA, % at 20d highs, cumulative A/D line, McClellan-style oscillator per desk; z-scored vs own 1y; divergence flag (benchmark high + falling breadth). | IC of breadth-z vs fwd 21d desk return; divergences precede negative returns above base rate | M |
| 2.2 | **Dollar volume, up/down volume, OBV** | Share-count rVol is incomparable across names and today's partial bar corrupts surges intraday. Dollar rDV, 20d up/down dollar-volume ratio, OBV slope-vs-price divergence (accumulation/distribution tags); scale today's volume by elapsed session fraction. | Surge list stable across intraday runs; cross-sectional rank IC of U/D + OBV divergence vs fwd 10d returns | M |
| 2.3 | **VIX term structure + VRP** | Level says calm/crisis; the curve says stress. `^VIX3M`: ts = VIX/VIX3M (backwardation = hard risk-off) + variance risk premium vs realized. | ts>1 days coincide with drawdowns; IC beats raw level | S |
| 2.4 | **Credit–equity divergence component** | Spreads widening while equity grinds up is the classic early warning — currently cancels in the mean. Dedicated component + flag when both z>1. | Event study: negative conditional fwd 21d SPX gap, else drop | S |
| 2.5 | **Bear vs bull steepening** | 2s10s level treats duration shocks and easing identically. Penalize steepening driven by 10y selloff (Δ10y>+25bp); BEAR STEEPENING flag. | Conditional EIDO/EEM fwd returns differ by episode type | S |
| 2.6 | **Intraday bars** | monitor-bars already passes `interval` through — 15m bars for desk benchmarks: intraday chart in Overview, session VWAP, feeds 2.2's partial-day fix. | Renders + matches TV chart shape | M |

## Phase 3 — The Indonesia Dial (home-market regime)

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 3.1 | **IDX composite (second dial)** | The book is IDX-heavy but the regime is US-centric. Parallel `computeRegimeID`: ^JKSE trend/momentum z, USD/IDR z + acceleration, EIDO/SPY RS, ID 10y Δ (DBnomics feed exists), Cu/Au, EIDO volume z as foreign-flow proxy. GLOBAL and IDX chips side by side. | Beats global composite on IC vs fwd ^JKSE + IDX sleeves | M |
| 3.2 | **FX carry basket** | DXY conflates EUR weights with EM appetite; carry unwinds are the real EM-flow tell. `−mean(ret21 high-yielders) + mean(ret21 funders)` z-scored. | Dominates DXY head-to-head for the IDX sleeve | S |
| 3.3 | **EM flow proxy** | `Δ21 ln(EEM/SPY)` + EMB return. Include only if it LEADS ^JKSE (positive-lag correlation peak), else it duplicates 3.2. | Positive-lag peak required | S |
| 3.4 | **Term premium** | ACM 10y TP (FRED `THREEFYTP10`): EM acutely sensitive to term-premium repricing. | \|t\|>1.5 IC vs fwd EIDO/EEM, else drop | S |
| 3.5 | **ID sector baskets, stored** | Yahoo has no IDX sector indices. Server cron computes equal/cap-weighted ID sleeves per desk daily → stored series → real ID benchmark lines + Yahoo-free ID sector history. | Basket lines match IDX-IC sector index shape (spot-check vs TV) | M |
| 3.6 | **Desk-tagged internal news** | Map macro.news impact targets → desks; desk News tab gains an "LBC wire" pane (scored, sentiment-needled) beside the TV feed. | Tags spot-checked across a week of items | M |

## Phase 4 — Product Surface

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 4.1 | **Server-side regime cron + alerts** | Scheduled edge fn computes the composite at each close, appends to `monitor_regime_history` (true multi-year history, no client recompute), diffs vs prior → rows in `monitor_alerts` (regime flip, flag on/off, desk MOM state change). Terminal shows an alert inbox; Qars bell integration. | Cron row lands nightly; forced flip generates alert | L |
| 4.2 | **Morning Desk Note** | One click per desk (or all): auto-composed markdown brief — regime + flip, desk pulse, top movers with surge tags, playbook cell, news headlines. Copy-out for standup; later: bridge-ai narration. | Note renders complete for all 13 desks | M |
| 4.3 | **Own screener over the book** | Filter/rank the 650 validated names on chg, rVol, momentum, RS, desk, country — data we already fetch; complements the TV widget with LBC-only columns (desk, sub-industry, surge). | 650-row scan completes <5s via 0.6 batching | M |
| 4.4 | **Fundamentals join + cap-weighted indices** | equity-fundamentals/statements edge fns already exist (T4). Mcap/PE/PB/yield columns in constituent tables; Index Lab gains cap-weighted and fundamental-filtered modes — the "index accuracy" end-state. | Cap-weighted IDX-bank basket tracks IDXFINANCE shape | L |
| 4.5 | **Risk lab for custom indices** | VaR (historical + parametric), vol, β, drawdown panel on any built index — port of the AMRT/MEDC risk methodology, node-precomputed constants where heavy. | Matches python reference on a test basket | M |
| 4.6 | **Desk compare mode** | Two desks side-by-side: overlaid benchmarks (rebased), pulse diff, correlation, shared movers. | — | M |
| 4.7 | **Watchlist bridge to T1** | Push any constituent / custom index to the Asset Management book's watchlists (asset_mgmt schema is live). | Row appears in T1 | M |
| 4.8 | **Palette + tab deep links** | ⌘K entries for all desks/views; tab (Overview/Constituents/…) joins the hash. | — | S |

## Phase 5 — Platform

| # | Item | What & why | Gate | Effort |
|---|------|-----------|------|--------|
| 5.1 | **Precompile the launcher** | Babel-standalone compiles ~50 JSX files in-browser on every load (multi-second, dev-mode React). esbuild at deploy (vercel build step exists), keep source layout. Biggest single load-time win; touches all terminals — do behind a flag. | Cold load <2s; every terminal smoke-passes | L |
| 5.2 | **Client telemetry** | Error beacon → `monitor_telemetry` table (RLS insert-only): silent breakage (widget failures, fetch errors) becomes visible without user reports. | Forced error lands in table | S |
| 5.3 | **Table virtualization + lazy TV mounts** | 100+ row tables and offscreen TV iframes cost scroll perf; virtualize rows, mount widgets on intersection. | Smooth scroll at 650 rows | M |
| 5.4 | **Responsive pass** | Shell hard-codes width=1400 viewport; make Monitor usable ≥768px (rail collapses to icons, cards stack). | 768px walkthrough clean | M |
| 5.5 | **Regime API for LEGION** | Expose current regime + desk signals as a tiny edge fn so LEGION/bridge-ai can quote live desk state in chat ("Energy is MOM▲▲ RS-leader, volume 1.4×"). | LEGION tool-call returns live state | S |

---

## Gate results — 2026-07-24 execution run

Phases 0-2 executed. Harness: `scripts/regime-backtest.js` (954 sessions,
2022-10 → 2026-07). Verdicts:

- **0.1-0.5 SHIPPED** (engine v2): FRED strict-< alignment + staleness
  decay, EMA+Schmitt hysteresis, continuous kickers, frozen composition +
  coverage, calendar-day windows. Unit-tested (`test-monitor-engine.js`).
- **0.2 gate PASS**: label flips 107 → 35 over 954 sessions (3.1×).
- **0.6 SHIPPED**: `monitor-quotes` batch edge fn (60 tickers/call, and
  its 5d window fixes the FX prevClose bug server-side).
- **0.7/0.8 SHIPPED**: GitHub Actions — engine tests on push, nightly
  full-book validation.
- **1.1 VERDICT — the composite is a STATE gauge, not a forecaster.**
  Composite ICs vs forward returns are mildly NEGATIVE at 5-21d (e.g.
  SPX h=21 IC −0.165, E1 −0.239 t−2.2): stretched risk-on mean-reverts.
  UI relabeled accordingly (tooltips say so explicitly).
- **1.2 SHIPPED** (adaptive rolling-z normalization, saturation gone).
- **1.3 REJECTED by gate**: IC-fit weights are unstable/regime-dependent
  (credit IC −0.33 i.e. contrarian; div n=97). Descriptive hand weights
  kept, documented in the engine header.
- **1.4 SHIPPED**: beta-adjusted RS + vol-scaled momentum in deskSignals
  (2× levered clone correctly reads β≈2, RS inline — unit test).
- **1.5 NOT SHIPPED as UI**: playbook cells that pass CI are sparse and
  partly sample-drift (EIDO underperformed all-sample); results recorded
  in the harness output instead of shipped as a trading table.
- **1.6 RESOLVED**: r1m ≈ skip-month on this sample (both mildly
  negative); r1m kept for simplicity.
- **2.1-2.5 SHIPPED**: trend breadth (%>50d SMA, % at 20d highs), dollar
  volume + up/down $vol A/D + OBV divergence + partial-session flag,
  VIX/VIX3M backwardation kicker, credit-equity divergence component,
  bear-steepening discrimination (DGS10).
- **2.6 DEFERRED** (intraday charts — TV widgets already cover intraday
  visually; revisit with 4.x).

## Gate results — 2026-07-26 execution run (Phase 3.1)

Harness: `scripts/regime-id-backtest.js` (899 sessions, 2022-10 → 2026-07).

- **3.1 SHIPPED — the Indonesia dial** (`buildCompositeID`/`computeRegimeID`):
  ^JKSE trend + momentum, USD/IDR 1M z + ACCELERATION ramp (fast 10d slides
  penalized beyond the level), EIDO/SPY relative strength (foreign appetite),
  copper/gold, EIDO signed dollar-volume A/D flow proxy. All non-Jakarta
  series map STRICT-< on the JKSE calendar (a Jakarta close cannot observe
  the same date's US close).
  - **STATE gate PASS (decisive)**: contemporaneous Spearman of the smoothed
    score vs trailing 21d ^JKSE return = **0.856** vs **0.321** for the
    global dial on the same dates (gate required +0.10; got +0.535).
  - Forward ICs (record): ^JKSE h=21 IC +0.088 (t 0.9), EIDO h=21 +0.116
    (t 1.1) — positive but NOT significant; the dial is presented as a
    tape-STATE gauge exactly like the global one (tooltips say so).
  - Hysteresis: label flips 124 → 45 over 899 sessions (2.8×). Avg
    coverage 0.87. 7 new unit tests in `test-monitor-engine.js`.
  - UI: second dial row (IDX 🇮🇩) in the RegimeStrip with its own gauge,
    sparkline, flags (IDR PRESSURE / IDR SLIDE ACCELERATING / FOREIGN
    OUTFLOW / ACCUMULATION / ID OUT OF FAVOR / JKSE BELOW TREND), flip
    notice, and ^JKSE/EIDO drill-downs.
  - **ID 10y DROPPED from v1**: TVC:ID10Y is TradingView-embed-only; no
    fetchable daily series in the stack. Revisit if a DBnomics/BI daily
    INDOGB series is wired later.

Same-day follow-up — 3.2/3.3/3.4 candidate gates
(`scripts/regime-id-candidates.js`, pre-registered before evaluation):

- **3.2 SHIPPED — EM carry-unwind basket** (mean 30d ret of USD/{MXN,BRL,
  INR,ZAR,IDR} minus USD/{JPY,CHF}, z inverted, weight 0.8): beat DXY
  head-to-head on the IDX sleeve — state corr 0.226 vs 0.189, |ic21|
  0.104 vs 0.016. Flag: CARRY UNWIND.
- **3.3 REJECTED by gate — EM flow proxy** (Δ21 ln EEM/SPY): the lead-lag
  correlogram vs ^JKSE daily returns peaks at lag −1 (0.088) — ^JKSE
  LEADS the proxy (Jakarta closes first), so it adds no early signal.
  Dropped per the pre-registered rule.
- **3.4 SHIPPED — ACM 10y term premium** (FRED THREEFYTP10, Δ30 z
  inverted, weight 0.6, strict-lagged): IC vs fwd 21d EIDO +0.158
  (t 1.8) — the strongest forward-IC component in the ID set (+0.141
  inside the composite). Flag: TERM-PREMIUM REPRICING.
- Full 8-component re-run: STATE corr 0.849 (vs 0.856 with 6 — within
  noise, still 2.6× the global dial), flips 45 → 41, coverage 0.85.
  4 new unit tests (29 total).

## Gate results — 2026-07-26 execution run (Phase 4.1)

- **4.1 SHIPPED — regime history + alerts** (`7d0f34d`), with one design
  change from the spec: instead of porting the engine to a Deno edge fn
  (which would fork the math), the nightly GitHub Actions job runs
  `scripts/regime-snapshot.js` against the SAME `monitor-regime.js` file
  the terminal loads — one engine, zero divergence risk.
  - Tables (migration applied via Management API): `management.
    monitor_regime_history` (dial+date PK, score/raw/label/coverage/
    flags/comps) and `management.monitor_alerts` (unique dial+date+kind).
    Read-only RLS for authenticated; writes via service key only.
  - History BACKFILLED from the harness: 955 global + 899 id sessions —
    true multi-year history existed from day one.
  - Alerts: label change → flip row; newly-appearing flags → flag rows;
    idempotent (unique constraint absorbs re-runs).
  - **Gate PASS**: forced prior-day label mutation generated
    "GLOBAL regime flipped: RISK-OFF → NEUTRAL" on the next run
    (synthetic rows then cleaned); the dispatched cloud run
    (30194347220) computed both dials in GitHub's runner and wrote the
    snapshot — nightly at 04:23 WIB alongside book validation.
  - Terminal: alert bell in the regime strip (unseen count vs local
    last-seen, 14-day window) with a dropdown inbox.
  - Deferred from 4.1: Qars bell integration (needs shell-side plumbing;
    the Monitor-local inbox covers the workflow for now).

## Sequencing logic

1. **Phase 0 first** — several v1 signals are quietly wrong (look-ahead,
   whipsaw, saturation); fixing them changes what every later backtest sees.
2. **1.1 before any signal work** — the harness is the referee. Items
   failing their gate get documented in this file and dropped, not shipped.
3. Phases 2-3 are parallelizable once 1.1 exists; Phase 3 is the highest
   expected value for LBC specifically (the book is IDX-heavy, the regime
   currently isn't).
4. Phase 4 turns signals into workflow (alerts → morning note → screener);
   4.1's server cron also unlocks true regime history for everything else.
5. Phase 5 is compounding infrastructure — 5.1 is the single biggest UX win
   in the whole document but carries the most regression surface; do it
   when nothing else is mid-flight.

## Explicitly considered and rejected

- **ML classifiers for regime** (HMM/logistic): not auditable by eye,
  needs a training pipeline the stack doesn't have; the z-scored linear
  composite with data-driven weights (1.2+1.3) captures most of the value
  transparently. Revisit only after 1.1 shows the linear composite is
  IC-positive but weak.
- **Real-time streaming quotes** (websockets): Yahoo has no free stream;
  TV widgets already stream visually. 90s polling is honest and sufficient
  for a research (not execution) desk.
- **Broker-flow data** (Stockbit exodus): needs an authenticated user
  session per the existing extraction protocol — can't run keyless in the
  terminal. Keep as a manual research workflow.
- **Full i18n (Bahasa)**: the team operates bilingually; cost exceeds value
  versus shipping Phase 3.
