# Macro Sentiment Engine — methodology

**Status:** v1. Built to be transparent and auditable, not a black box. Every
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

For each region (`US`, `ID`, `CN`; `Global` = GDP-ish weighted blend) the engine
publishes a row to `macro.sentiment`:

| field | meaning |
|---|---|
| `data_score` | −100..+100 — risk-on/off read from the **hard macro data** |
| `news_score` | −100..+100 — aggregated **news** sentiment (last 48h), or `null` |
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
| **Liquidity / Policy** | M2 growth (+, rate); policy rate (−, **momentum-mode level**) | + easing / − tightening |
| **External** | FX reserves (+) and IDR/USD (−) for ID; empty elsewhere (current-account-%GDP-YoY dropped — slow & EM-ambiguous) | + |

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

Normalization (applies to both, fixes the review's normalization findings):
- **Calendar trailing window** of `TREND_YEARS` (5y) — *not* a fixed obs count,
  so monthly and quarterly series use the same time span (no 15y-vs-5y mismatch).
- **The scored point is excluded** from the window mean/σ (no in-sample shrink).
- **Sample std** (ddof=1).
- **Momentum step is frequency-adaptive**: the engine detects the series'
  median spacing and picks the obs step ≈ `ACCEL_MONTHS` (3) calendar months, so
  "momentum" means the same horizon for monthly and quarterly data. The momentum
  change is normalized by **the std of that same k-step difference** (not the
  level σ), so level and momentum are on comparable scales.

Then `z_level = (x_last − mean_hist)/σ_hist`, `z_accel = Δ_k / σ_Δk`, and:
- rate:  `s = tanh( (0.65·z_level + 0.35·z_accel) / 2 ) · direction`
- level: `s = tanh( z_accel / 2 ) · direction`

`tanh` (not hard clipping) squashes smoothly to `(−1, +1)` and preserves tail
information instead of flattening everything past 2.5σ to the same value.

> **Lookahead/vintage caveat (see §7).** Scores use the latest *available*
> observation. These series are not point-in-time, so a *backtest* would contain
> mild revision lookahead; for the *live* read (the engine's job) it's a non-issue.

---

## 4. Pillars → regime

Pillar score = mean of its indicators' signed scores (only indicators with data).

Two regime axes:
- **Growth axis** `G` = mean(Growth pillar, Labor pillar).
- **Inflation axis** `I` = mean(Inflation pillar), where `I` here is *inflation
  momentum* (accelerating CPI/PPI ⇒ `I>0`).

Regime (the classic growth × inflation quadrant):

| | Inflation falling (`I<0`) | Inflation rising (`I>0`) |
|---|---|---|
| **Growth up (`G>0`)** | **Goldilocks** | **Reflation** |
| **Growth down (`G<0`)** | **Disinflation / Risk-off** | **Stagflation** |

`Neutral` when both axes are within ±0.15.

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

**News blend.** If ≥1 news item exists for the region in the last 48h:
`composite = clip(0.65·data_score + 0.35·clip(news_score,−100,100), −100, 100)`,
else `composite = data_score`.

**News blend.** If ≥1 news item exists for the region in the last 48h:
`composite = 0.65·data_score + 0.35·news_score`, else `composite = data_score`.
Data leads because hard data is less noisy and not subject to headline framing;
news adds the high-frequency, forward-looking overlay the data misses.

---

## 6. News scoring

News is gathered by the scheduled autonomous agent (see
[AUTONOMOUS_UPDATE.md](AUTONOMOUS_UPDATE.md)), which scores each item
`sent_score ∈ [−100, +100]` with a confidence weight, tagged by region. The
engine aggregates the last 48h as a **confidence-weighted mean** per region;
items decay linearly to 0 weight at 48h so the read stays current.

---

## 7. Known limitations (be honest about these)

- **Not point-in-time.** See §3 — fine for live reads, mildly optimistic for
  backtests.
- **Release-frequency mismatch.** GDP (quarterly) and CPI (monthly) update on
  different clocks; the level/accel windows are in observations, not calendar
  days, so a fresh GDP print moves `G` more than a stale month would.
- **Coverage varies by region.** US is richest; ID/CN drop pillars when a clean
  YoY series isn't available. The `components.coverage` field reports this.
- **News sentiment is model-scored**, not human-labeled; treated as a secondary
  overlay (35% max), never the primary signal.
- **Indonesia gap-fill provenance (be precise):** the gap-fill
  (`scripts/scrape_bps.py`) pulls **IMF IFS via DBnomics** — i.e. IMF-*restated*
  national data (BPS for CPI; **Bank Indonesia** for reserves/FX), often lagged
  1–3 months behind the original national release. It is *not* a direct BPS feed.
  Series are `source`-tagged accordingly. Derived CPI-YoY carries a **rebasing
  guard**: an implausible >8% m/m index jump (a BPS base change) suppresses the
  YoY across that window so a splice artifact can't manufacture a phantom
  inflation spike.
- **Known residual simplifications** (documented, not yet fixed): pillars are a
  simple mean of their indicators (no explicit de-correlation of GDP/IP/employment
  beyond the 0.7/0.3 growth-axis tilt); M2 is a weak liquidity proxy post-2020;
  reserves momentum carries some FX-valuation noise; the regime deadband (0.12)
  is eyeballed, not distribution-calibrated. These are accuracy *refinements* for
  v2, not correctness bugs — each is visible in the `components` audit trail.

---

## 8. Files

- `scripts/macro_sentiment.py` — the computation (stdlib only; env-driven creds).
- `macro.sentiment` / `macro.news` — Supabase tables (migration `0048`).
- `launcher/scripts/macro-sentiment.jsx` — the terminal panel that renders it.
- `docs/macro/AUTONOMOUS_UPDATE.md` — the scheduled-agent playbook that feeds it.
