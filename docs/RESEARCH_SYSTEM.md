# LBC RESEARCH SYSTEM — DESIGN & OPERATIONS

> The autoresearcher. One system that watches everything written down — prices, macro
> prints, filings, positioning, news — across 23 desks, compresses it to five things a
> day, and scores itself against outcomes forever.
>
> Built 2026-08-07. Principal: M. Rizky Narindra (CRO). Supersedes the monitor and
> research terminals. The database is the source of truth; this file documents the
> design so any future session can maintain it.

---

## 0. First principles

1. **The unit of work is a live position thesis, not a document.** Research ends when
   the position closes, not when something is published.
2. **The entire value is compression.** L1 ingests tens of thousands of data points per
   day. L5 hands over five things. Any layer that leaks volume upward gets the system
   abandoned like the last one.
3. **Machines compute, models interpret, humans decide.** Every number in every brief
   is computed deterministically by the signal engine. LLM agents rank, phrase, and
   contradict — they never invent statistics. Narin makes the calls.
4. **Provenance or it didn't happen.** Every brief item references signal IDs; every
   signal references series observations; every thesis references a tracked driver.
   No orphan claims.
5. **Green lights only when data landed.** Every pipeline writes a freshness row.
   Staleness alerts fire on data-not-arriving, not job-failed. The old system reported
   "succeeded" for ten weeks while writing nothing — that failure mode is designed out.
6. **The audit loop is the product.** Every signal and stance is scored against
   subsequent returns. Signals that stop working go to the graveyard with a date of
   death. Without this it's a noise generator with a nice interface.
7. **The tracker is a byproduct of shipping, not a second place to type.** Dials,
   briefs, and scores are written by the pipeline that produces them. Nothing requires
   manual state upkeep to stay true.

## 1. Architecture

```
L1  INGEST      GitHub Actions cron → Python → Supabase REST (UPSERTs, idempotent)
L2  NORMALIZE   mkt.series/mkt.observation (macro+commodities), mkt.price (equities),
                mkt.flow (IDX foreign), doc.document (filings/statements)
L3  COMPUTE     pipeline/compute: regimes, driver stats, relationship breaks,
                crowding, book analytics → research.signal + research.dial
L4  REASON      pipeline/reason: desk agents + Editor + Adversary (Claude via
                OpenRouter) → brief items, thesis challenges → research.brief
L5  INTERFACE   Telegram push (morning brief, alerts) + Research Desk terminal
                (dial board, chat agent) + optional interactive bot webhook
      ^
   AUDIT LOOP   pipeline/audit: every signal scored at +5d/+21d, stances vs basket
                returns, hit rates, IC, graveyard. Runs forever.
```

Everything runs in GitHub Actions (`Nabz28/LegacyBridgeTerminalData`, public repo —
secrets live in Actions secrets and `brain.vault`, never in code). The old
`macro-refresh-daily` pg_net path is retired: pg_net's 5s timeout can never complete
an ingest and reports success for enqueue-only.

## 2. The 23 desks

Two lines, never the cells. Industry desks ignore geography (one driver set applied to
every listing worldwide). Country desks ignore industry (one policy cycle expressed
through all domestic sectors). An Indonesian coal name is the Coal desk's thesis
expressed through the Indonesia desk's market.

- **Cyclical industry (9):** oil-gas, coal-power-fuels, precious-metals,
  base-battery-bulk, agri-food, chemicals-materials, transport-logistics,
  autos-mobility, automation-machinery
- **Secular industry (9):** semiconductors, ai-compute, grid-infrastructure,
  aerospace-defense, software-cyber, platforms-ads-gaming, healthcare-lifesci,
  consumer-brands, financial-infrastructure
- **Country (5):** us, china-hk-taiwan, japan-korea, eurozone, indonesia

Each desk carries: a ticker basket (reusing `management.monitor_templates` where they
fit), 3–6 tracked drivers (real series in `mkt.series`), and a dial.

**The secular rates trap is encoded:** every secular desk's driver set includes real
rates; the book factor decomposition flags when multiple secular positions collapse
into one rates bet.

## 3. Data layer (L1/L2)

**Constraint honored everywhere: zero paid keys, zero new accounts.** Sources were
chosen so the system runs on what exists today. IBKR remains the designed upgrade
path for real-time/universal coverage once a gateway host exists; nothing else
changes when it arrives.

| Source | Access | What | Cadence |
|---|---|---|---|
| Fed H.15 via DBnomics | keyless REST | US policy rate and the 2/10/30y curve, business-daily and current | daily |
| BLS public API v1 | keyless | CPI (headline + core), PPI, payrolls, unemployment, manufacturing hours | daily |
| Yahoo Finance (yfinance) | keyless | global equity OHLCV for all desk baskets (~350 tickers: US, .JK, .T, .HK, .KS, .SI, EU), FX (USDIDR, USDJPY, USDCNH, EURUSD, DXY), futures (GC, HG, CL, BZ, NG, ZS/ZC/ZW, TTF), credit and sector ETFs, crypto | 2× daily (Asia close, US close) |
| DBnomics | keyless REST | ECB policy rate, Eurostat HICP and sentiment, Fed H.6 M2 | daily |
| IDX | scrape | daily trading summary + foreign net buy/sell per stock. Cloudflare blocks datacenter IPs, so this one pipeline runs locally (see runbook) | daily |
| CFTC (Socrata) | keyless JSON | Commitment of Traders — spec positioning percentiles for gold, copper, oil, FX | weekly (Sat) |
| SEC EDGAR | keyless API | new 10-K/10-Q/8-K for covered US names; risk-factor diff | 2× daily |
| RSS news | keyless | 15 feeds (CNBC, Yahoo, Investing, Kontan, Antara, Tempo) routed per desk with sentiment | hourly |
| Central banks | scrape | FOMC / BI / BoJ / ECB statements → word-level diff vs prior | on release days |
| TSMC IR | scrape | monthly revenue (leads Western semi data) | monthly (~10th) |
| IMA sitemap | scrape | Indonesian HBA coal benchmark, both periods per month | bi-monthly |
| macro.series archive | in DB | 12.4k CEIC-style historical series (US/CN/ID) for regressions and history | static backfill |
| correlation.* | in DB | 4.1k mapped tickers with weekly/monthly returns since 1993 | static archive (mkt.price is the live store) |

All ingests are UPSERTs on natural keys (`series_key,date` / `ticker,date`), safe to
rerun, with per-pipeline freshness rows in `research.ops_freshness`
(`expect_within_hours` per pipeline; violations alert to Telegram).

## 4. Signal engine (L3)

Deterministic, nightly, in `pipeline/compute`. Every signal has a `dedupe_key`, a
salience score (0–100), and full refs. Catalog:

| kind | definition |
|---|---|
| driver_move | driver z-score moved >1σ in 5d, or crossed 90th/10th own-history percentile |
| regime_flip | global or desk regime tag changed vs yesterday |
| rel_break | 60d rolling corr(basket, driver) fell >0.4 vs 1y baseline — thesis broken or opportunity |
| crowding | COT net-spec percentile >90 or <10 |
| momentum_flip | basket 20d return sign flip with magnitude, or 50/200 cross |
| flow_anomaly | IDX foreign net-buy 5d z-score >2 |
| news_anomaly | desk article volume z>2.5 vs its own 90d norm |
| news_sentiment | desk news tone swung >2 sigma over 3 days |
| stmt_diff | central bank statement changed materially vs prior (diff salience) |
| filing_event | risk-factor language change in a covered name's annual/quarterly |
| book_risk | position within 5% of invalidation; factor concentration >60%; correlation regime spike |
| level_hit | user alert condition met (price/series threshold) |
| freshness_violation | pipeline data stopped arriving |

**Regime model:** growth (payrolls momentum, manufacturing hours, unemployment
trend, cyclical-vs-defensive appetite), inflation (core CPI 3m annualised vs
target), liquidity (M2 trend, policy direction, credit conditions), risk
(VIX + HY OAS percentiles) → quadrant + direction tags, global and per country desk.

**Dials:** weighted driver z-scores → machine score in [−2,+2] → proposed stance
(OW/N/UW) + conviction. The machine proposes; Narin's overrides (via bot command or
terminal) stick and are recorded side by side with the machine view — the dial always
shows both, and disagreement itself is surfaced.

**Book analytics:** positions marked nightly; distance to stop/invalidation; PCA
factor decomposition of position returns (the five-positions-one-bet check); portfolio
VaR from basket covariances; every idea ticket is checked against sizing rules
(max 40% single position, min 3 positions, −20% cut-loss) before it reaches the brief.

## 5. Reasoning layer (L4)

Claude (via OpenRouter, key in vault) — models set in `research.config`.

- **Desk agents (nightly, 23):** read only precomputed signals + dial history + open
  theses for their desk. Output strict JSON: `what_changed` (2 sentences),
  `flip_condition`, candidate brief items (each referencing signal IDs), thesis health
  flags. They interpret; they cannot compute or invent numbers.
- **Editor (nightly, 1):** the most important component. Takes all candidates across
  23 desks + book state + regime. Ranks by: touches an open position > regime change >
  relationship break > crowding extreme > everything else. Emits at most 5 CHANGED
  items, at most 2 DECIDE questions, exactly 1 BLIND declaration (where the system
  knows it cannot see — hands Narin the local-knowledge question). Caps enforced in
  code, not prompt.
- **Adversary (weekly, per open thesis):** tries to kill each live thesis using the
  signal record. Output: intact / wounded / dead + the specific evidence. Wounded
  theses appear in the weekly packet; dead ones trigger an immediate alert.
- **Attribution writer (monthly):** what the system got right/wrong, which signals
  died, hit-rate tables → `research.brief(kind='monthly')`.

Every agent call is logged to `research.agent_log` (model, tokens, output) for cost
and quality audit.

## 5b. The four awareness layers

Dials answer "what is my stance". These answer the questions a CRO actually
asks between decisions.

| Layer | Table | What it answers | Cadence |
|---|---|---|---|
| **News** | `research.news` | what happened, per desk and per ticker. 15 RSS feeds (CNBC, Yahoo, Investing, Kontan, Antara, Tempo), word-boundary desk routing, finance-lexicon sentiment, headline-normalized dedupe across feeds | hourly with the alert job |
| **Sentiment** | `research.desk_sentiment` | is attention or tone unusual. Volume z-score vs the desk's own 90-day norm plus mean tone; the volume anomaly is the part that carries signal | nightly |
| **Candidates** | `research.candidate` | what to look at. Cross-sectional screen per desk: 12-1 momentum, relative strength vs the desk's own basket, trend vs 200d, drawdown, vol penalty. Direction follows the dial, so an underweight desk screens shorts | nightly |
| **Key dates** | `research.calendar_flag` | what lands next and whether it touches the book. `macro.calendar` mapped onto desks and open positions; events inside 36h that touch a position fire a signal | nightly |

All four feed the morning brief (WATCH, NEWS, DATES blocks), the agent's tool
set (`get_news`, `get_sentiment`, `get_candidates`, `get_key_dates`), and their
own terminal tabs.

## 6. Artifacts (the only eight things the system writes)

1. **Industry Dial** (18, nightly) — stance, conviction, machine score, regime tag,
   drivers with value/percentile/direction, what changed, what flips it.
2. **Country Dial** (5, nightly) — same shape; policy, liquidity, FX, flows drivers.
3. **Global Regime Card** (weekly, plus on flip) — growth/inflation/liquidity/risk
   quadrant; feeds every desk.
4. **Idea Ticket** — on stance change or level hit. Thesis in 3 sentences, the driver
   that must play out (must reference a tracked driver), entry/target/stop/horizon,
   size checked against rules, the observable that kills it, regime assumption.
5. **Position Thesis (living)** — weekly health check per open position: driver
   intact? invalidation distance? conviction now vs entry? working for the stated
   reason?
6. **Morning Brief** (06:30 WIB daily) — REGIME / BOOK / CHANGED (≤5) / DECIDE (≤2) /
   BLIND (1) / DATA (only if something is stale). Pushed to Telegram.
7. **Weekly IC Packet** (Sunday evening WIB) — assembled from the database: dial
   moves, adversary verdicts, signal scoreboard, calendar week ahead.
8. **Monthly Attribution** — hit rates, IC, graveyard changes, stance scorecard.

## 7. Interface (L5)

- **Push:** GitHub Actions → Telegram `sendMessage` via the LEGION bot token
  (send-only; never getUpdates/webhook on that bot — OpenClaw on Nabil's laptop owns
  its receive path). Recipients live in `research.config.telegram_push` and ship
  **empty**: briefs carry position-level P&L, so delivery is opt-in per recipient
  rather than broadcast by default (the runbook has the one-step enable).
  Morning brief 06:30 WIB; freshness violations; invalidation breaches; regime flips;
  calendar events <24h touching the book.
- **Research Desk terminal** (replaces Monitor + Research workspaces): dial board,
  desk detail (drivers charted from `mkt.observation`), signals feed with scores,
  briefs archive, book view with factor decomposition, ops/freshness board, and a
  **chat panel** speaking to the same tool-use agent (query + command modes) — so
  interactive mode works day one without touching Telegram.
- **Interactive Telegram bot** (`api/research-bot.js`, ready but dormant): activates
  when a dedicated bot token is added as `research_bot_token` in `brain.vault` and the
  webhook script is run. Same tools as the terminal chat. Voice notes and chart PNGs
  supported. LEGION voice rules apply, addressed to Narin as CRO: short replies, no
  em dashes, no headers in chat, detail lives in the brief.

Agent tools: `get_dial, list_dials, get_series, compare, get_book, factor_exposure,
get_signals, get_calendar, search_memory, screen, explain_move, log_idea, set_alert,
update_stance, get_brief` — each is a parameterized query, not RAG.

## 8. Audit loop

- `research.signal_score`: every signal scored at +5d and +21d against its desk
  basket (or named ticker) in the signal's implied direction. Hit rate and IC per
  (kind, desk) rolling 20 observations.
- Stance scorecard: dial stance vs subsequent basket return vs its country/global
  benchmark.
- **Graveyard rule:** hit rate <45% over trailing 20 with n≥20 → the (kind, desk)
  signal is retired from Editor consideration and logged with date and reason.
  Resurrectable only by explicit config.
- Editor selection audit: were the 5 chosen items the ones that mattered? Measured by
  forward moves on ignored vs chosen signals.

## 9. Schedules (UTC; WIB = UTC+7)

| Workflow | Cron (UTC) | What |
|---|---|---|
| research-ingest-asia | 09:30 daily | IDX prices+flows, JP/HK/KR/SG closes, Asia scrapes |
| research-ingest-us | 21:30 Mon–Fri | US closes, FRED daily, commodities, FX, DBnomics |
| research-nightly | 22:30 daily | compute → signals → dials → desk agents → Editor → brief → **push 06:30 WIB** |
| research-alerts | hourly (market hours) | level alerts, invalidation distance |
| research-weekly | Sun 10:00 | COT ingest (Sat), adversary pass, IC packet, correlation refresh |
| research-monthly | 1st 10:00 | attribution, graveyard review, TSMC/HBA/MPOB scrapes |
| research-freshness | every 6h | ops assertions → Telegram on violation |

## 10. Known traps (encoded, not just remembered)

1. **Alert fatigue** → Editor cap of 5, enforced in code; salience decay on repeats.
2. **Green lights over dead processes** → freshness table + assertions, alert on
   data-not-arriving.
3. **In-sample fitting** → driver stats are rolling/walk-forward; signals carry live
   hit rates; nothing earns brief space without surviving the audit loop.
4. **Correlation collapse** → PCA on the book before any sizing suggestion.
5. **The secular rates trade** → real rates tagged as shared driver; concentration
   check spans desks.
6. **Don't rebuild what exists** → monitor_templates seed the baskets;
   macro.calendar feeds get_calendar; correlation.* is the regression history;
   brain.search_notes is the memory tool.
7. **Never print secrets** → vault + Actions secrets only. The repo is public.

## 11. Operations

- **Schemas:** `research` (desk, driver, dial, dial_history, signal, signal_score,
  graveyard, thesis, idea, alert, alert_fire, brief, config, ops_freshness,
  agent_log), `mkt` (series, observation, instrument, price, flow), `doc` (document,
  diff). Exposed via PostgREST alongside existing schemas.
- **Code:** `pipeline/` (Python: ingest, compute, reason, audit, push),
  `.github/workflows/research-*.yml`, `api/research-agent.js` + `api/research-bot.js`
  (Vercel), `launcher/scripts/research-desk-*.jsx` (terminal UI).
- **Secrets:** GitHub Actions: `SUPABASE_SERVICE_ROLE`, `OPENROUTER_API_KEY`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PUSH_CHAT_ID`. Vercel already carries
  OPENROUTER/SUPABASE env; the bot token is read from `brain.vault` at runtime.
- **Kill switch:** `research.config.enabled=false` stops all pushes (pipelines keep
  writing data).
