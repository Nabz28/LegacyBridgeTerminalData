# Macro Sentiment Engine — methodology

**Status:** v1.2 (two expert-critique rounds applied — robust median/MAD stats,
zero-centered momentum, scale-matched news blend, age-weighting, richer Indonesia
data). Built to be transparent and auditable, not a black box. Every
published score carries its component inputs (in `macro.sentiment.components`)
so any reading can be traced back to the exact series, values, and sub-scores
that produced it.

> Design principle: **fewer correct signals beat many noisy ones.** The engine
> intentionally uses a parsimonious set of clean, comparable indicators rather
> than scraping every series. Coverage is reported per run; pillars with no
> available data are dropped (not zero-filled), and the composite is reweighted
> over the pillars that *do* have data.

---

## 1. What it outputs

For each region (`US`, `ID`, `CN`; `Global` = home-tilted risk blend, US .55 /
CN .30 / ID .15 — *not* true GDP shares) the engine publishes a row to
`macro.sentiment`:

| field | meaning |
|---|---|
| `data_score` | −100..+100 — risk-on/off read from the **hard macro data** |
| `news_score` | −100..+100 — aggregated **news** sentiment (7-day, decayed), or `null` |
| `composite` | blended headline read (see §5) |
| `regime` | one of `Reflation`, `Goldilocks`, `Stagflation`, `Risk-off`, `Disinflation`, `Neutral` |
| `components` | full audit trail: per-pillar scores + every indicator's ric/value/z/score |
| `headline` | one-line human read |

Sign convention: **positive = risk-on / growth-supportive / easing**; negative =
risk-off / contractionary / tightening.

---

## 2. The signal set (data pillars)

We use Refinitiv's **"% year-on-year, Standardized"** family — these are already
stationary YoY rates with a consistent cross-country naming convention, which
makes them directly comparable. RICs are validated at runtime; any that are
missing or stale (no obs in the last ~18 months) are skipped and reported.

| Pillar | Indicators (YoY) | Direction |
|---|---|---|
| **Growth** | Real GDP, Industrial production, Payroll employment, Retail sales (YoY) | + |
| **Labor**  | Unemployment **rate** YoY (the level YoY was dropped — same series counted twice) | − |
| **Inflation** | CPI, PPI (YoY) | regime axis (§4) + two-sided composite term (§5) |
| **Liquidity / Policy** | money growth (+, rate) + policy rate (−, **momentum-mode level**). ID: BI policy rate + broad-money-YoY (no M2 double-count) | + easing / − tightening |
| **External** | ID: FX reserves (+), IDR/USD (−), trade balance (+), exports-YoY (+, terms-of-trade — moved here from growth). Empty for US/CN (current-account-%GDP-YoY dropped — slow & EM-ambiguous) | + |

The growth axis weights the growth pillar 0.7 and labor 0.3 (labor partly
restates growth, so it isn't given an equal half).

The exact RIC map lives in `scripts/macro_sentiment.py` (`INDICATOR_MAP`) and is
echoed into every `components` payload, so the live map is always auditable.

---

## 3. Scoring an indicator  (revised after expert review)

Each series is one of two **modes**:
- **`rate`** — already a YoY rate / stationary (CPI YoY, GDP YoY, …).
- **`level`** — a raw level whose *direction of change* is what matters (policy
  rate, FX reserves, IDR/USD). A level z-scored against its own mean never
  inflects on a turn, so level series are scored on **momentum only**.

Normalization is **robust** (median/MAD, not mean/std — resistant to the fat tails
and one-off prints that plague macro series):
- **Calendar trailing window** of `TREND_YEARS` (5y) — *not* a fixed obs count,
  so monthly and quarterly series use the same time span (no 15y-vs-5y mismatch).
- **The scored point is excluded** from the window statistics (no in-sample shrink).
- **Robust z** = `(x − median) / (1.4826·MAD)`, with a mean/std fallback if MAD
  collapses on ties. Winsorized to ±3.5.
- **Momentum step is frequency-adaptive**: the engine detects the series' median
  spacing and picks the obs step ≈ `ACCEL_MONTHS` (3) calendar months, so
  "momentum" means the same horizon for monthly and quarterly data.

Then `z_level = robust_z(x_last; history)` (median-centered) and
`z_accel = clip(Δ_k / robust_scale(Δ_k), ±3.5)` — **centered on zero**, so a
series in a steady trend still registers momentum (centering on the median diff
would cancel exactly the trend/turn signal). Scores:
- rate:  `s = tanh( (0.65·z_level + 0.35·z_accel) / SQUASH ) · direction`
- level: `s = tanh( z_accel / SQUASH ) · direction`  (`SQUASH`=2; momentum only)

A `level` series with a degenerate (constant) diff distribution is dropped as
`flat` rather than scored 0. `tanh` squashes smoothly and preserves tail info.

> **Lookahead/vintage caveat (see §7).** Scores use the latest *available*
> observation. These series are not point-in-time, so a *backtest* would contain
> mild revision lookahead; for the *live* read (the engine's job) it's a non-issue.

---

## 4. Pillars → regime

Pillar score = **age-weighted** mean of its indicators' signed scores (only
indicators with data). Age weight tapers full→0.3 as a print ages past ~3 months,
so a lagging IFS release can't assert current-month conviction.

Two regime axes:
- **Growth axis** `G` = 0.7·Growth + 0.3·Labor (labor partly restates growth).
- **Inflation axis** `I` = Inflation pillar (mostly CPI/PPI level-vs-own-history;
  see limitation in §7 re: level-vs-target).

Regime (the classic growth × inflation quadrant):

| | Inflation falling (`I<0`) | Inflation rising (`I>0`) |
|---|---|---|
| **Growth up (`G≥0`)** | **Goldilocks** | **Reflation** |
| **Growth down (`G<0`)** | **Risk-off** | **Stagflation** |

`Neutral` when both axes are within ±0.12 (eyeballed deadband; see §7).

---

## 5. Composite (the headline number)

```
base       = Σ_p ( w_p · pillar_p ) / Σ_p w_p          # positive pillars with data
infl_term  = − w_I · clip(I, −1, +1)                    # TWO-SIDED (see below)
data_score = 100 · tanh( base + infl_term )
```

Positive-pillar weights `w_G 0.40, w_L 0.15, w_P 0.20, w_X 0.10` (renormalized
over pillars that have data); inflation is the separate two-sided term `w_I 0.20`.

Two fixes from review:
- **Two-sided inflation.** Accelerating inflation (`I>0`) is risk-off; **falling
  inflation (`I<0`) is now rewarded** (the disinflation/Fed-pivot impulse), instead
  of the old one-sided `max(0,I)` that was deaf to it.
- **Single-indicator cap.** A pillar with only one indicator contributes at half
  weight, so a lone series can't dominate the headline (this is why the US
  "external" pillar — previously one clipped current-account series — no longer
  drives the read; current-account-%GDP-YoY was dropped as slow/ambiguous).

**News blend (scale-matched).** News blends at the **same pre-tanh raw scale** as
the data, so 0.35 actually means 0.35 of comparable variance (not a raw ±100 leg
swamping a tanh-compressed data leg):
```
composite = 100 · tanh( 0.65·data_raw + 0.35·(news_score/100) )
```
where `data_raw = base + infl_term` (the argument before the data's own tanh).
If no news in window, `composite = data_score`. Data leads because hard data is
less noisy and not subject to headline framing; news adds the high-frequency,
forward-looking overlay the data misses.

---

## 6. News scoring

News is gathered by the scheduled autonomous agent (see
[AUTONOMOUS_UPDATE.md](AUTONOMOUS_UPDATE.md)), which scores each item
`sent_score ∈ [−100, +100]` with a confidence weight, tagged by region. The
engine aggregates a **7-day window** as a confidence-weighted mean per region,
with **exponential time decay (3-day half-life)** so the freshest headlines
dominate without a hard cliff. Future-dated items (clock skew) are dropped.
Per-region news uses only that region's items; `Global` pools all regions.

---

## 7. Known limitations (be honest about these)

- **Not point-in-time.** See §3 — fine for live reads, mildly optimistic for
  backtests.
- **Staleness handling.** Monthly series older than 8 months (quarterly: 18) are
  dropped; surviving prints are **age-weighted** (full→0.3 floor past ~3 months)
  and every accepted indicator publishes `age_months` in the audit trail. IFS
  (Indonesia) lags 1–3 months for prices/FX and longer for trade/labour — so the
  ID read is honestly "latest available," not necessarily this month's.
- **Coverage varies by region.** US is richest; ID/CN drop pillars when a clean
  series isn't available. `components.coverage` reports this per pillar.
- **News sentiment is model-scored**, not human-labeled; secondary overlay (~35%
  at matched scale), never primary. Known bias: a single recurring narrative
  (e.g. an oil-shock news cluster) can still tilt the news leg; per-region tagging
  limits cross-contamination but `Global` pools all news. News is scored for the
  *risk-asset* implication, which can mis-sign a commodity story for a net
  exporter (ID) — a v3 refinement (region-aware commodity sign).
- **Inflation axis is level-vs-own-history, not level-vs-target** — a high-but-
  stable inflation economy can read near-neutral on `I`; adding per-region targets
  is a v2 item.
- **Residual collinearity.** Within-pillar aggregation is an (age-weighted) mean;
  GDP/IP/employment still co-move. The 0.7/0.3 growth-axis tilt and moving ID
  exports out of growth reduce the worst distortions; full de-correlation (PC1)
  is a v2 item.
- **Indonesia gap-fill provenance (be precise):** the gap-fill
  (`scripts/scrape_bps.py`) pulls **IMF IFS via DBnomics** — i.e. IMF-*restated*
  national data (BPS for CPI; **Bank Indonesia** for reserves/FX), often lagged
  1–3 months behind the original national release. It is *not* a direct BPS feed.
  Series are `source`-tagged accordingly. Derived CPI-YoY carries a **rebasing
  guard**: a gross >15% m/m index jump (a splice artifact) suppresses the YoY
  across that window. The threshold is deliberately high so genuine
  administered-price (fuel) shocks (~5–9% m/m) are preserved as real signals.
- **Indonesia is now richly self-sourced**: policy rate, broad money (→YoY),
  exports/imports (→YoY), trade balance, CPI (→YoY), FX, reserves. Liquidity uses
  price (policy rate) + one money aggregate (no M2 double-count); exports sit in
  *external* (terms-of-trade), not growth.
- **Residual simplifications** (v2 refinements, not bugs; visible in `components`):
  within-pillar aggregation is an age-weighted mean (no PC1 de-correlation);
  reserves momentum carries some FX-valuation noise; the regime deadband (0.12)
  is eyeballed, not distribution-calibrated; FOB-exports minus CIF-imports gives a
  modestly biased trade-balance *level* (cancels in momentum-mode).

---

## 8. Files

- `scripts/macro_sentiment.py` — the computation (stdlib only; env-driven creds).
- `macro.sentiment` / `macro.news` — Supabase tables (migration `0048`).
- `launcher/scripts/macro-sentiment.jsx` — the terminal panel that renders it.
- `docs/macro/AUTONOMOUS_UPDATE.md` — the scheduled-agent playbook that feeds it.
