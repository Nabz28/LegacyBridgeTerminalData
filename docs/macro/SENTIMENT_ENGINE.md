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
| **Growth** | Real GDP, Industrial production, Payroll employment, Retail sales | + |
| **Labor**  | Unemployment rate / level (YoY change) | − (rising unemployment = risk-off) |
| **Inflation** | CPI, PPI, GDP deflator | regime axis (see §4); enters the composite via a **tightening-pressure** penalty, not as a simple +/− |
| **Liquidity / Policy** | M2 growth (+), policy-rate momentum (−) | + easing / − tightening |
| **External** | Current-account-%GDP, trade balance | + |

The exact RIC map lives in `scripts/macro_sentiment.py` (`INDICATOR_MAP`) and is
echoed into every `components` payload, so the live map is always auditable.

---

## 3. Scoring an indicator

Each indicator series `x_t` (a YoY rate) is scored on two horizons, then combined:

1. **Level vs own history** — standardized against a trailing window
   (default 60 monthly obs ≈ 5y, min 16):
   `z_level = (x_last − mean) / std`.
2. **Acceleration** — is the rate turning?
   `z_accel = (x_last − x_{−3m}) / std` (3-month change of the rate, same scale).

Indicator score `s = clip( 0.6·z_level + 0.4·z_accel , −2.5, +2.5 ) / 2.5`,
giving `s ∈ [−1, +1]`, then multiplied by the pillar `direction`.

Rationale: level captures *where we are vs normal*; acceleration captures
*momentum / inflection*, which leads. Both are normalized by the same σ so they
share units. Clipping at 2.5σ tames outliers/print noise.

> **Lookahead/vintage caveat (known limitation, see §7).** Scores use the
> latest *available* observation as of run time. Refinitiv series here are not
> point-in-time/vintage-aware, so a backtest of these scores would contain mild
> revision lookahead. For a *live* read (the engine's actual job) this is not an
> issue; it only matters if someone backtests the score history.

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
data_score = 100 · clip(
      w_G · G
    + w_L · Labor
    + w_P · Liquidity
    + w_X · External
    − w_I · max(0, I)          # accelerating inflation = tightening pressure = risk-off
  , −1, +1)
```

Default weights (sum of positives = 1.0): `w_G 0.40, w_L 0.15, w_P 0.20,
w_X 0.10, w_I 0.15`. Weights are renormalized over pillars that have data.

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
- **Indonesia gap-fill:** where Refinitiv is thin, the BPS scraper
  (`scripts/scrape_bps.py`) backfills `macro.observations`, and those series
  feed the engine identically (source-tagged).

---

## 8. Files

- `scripts/macro_sentiment.py` — the computation (stdlib only; env-driven creds).
- `macro.sentiment` / `macro.news` — Supabase tables (migration `0048`).
- `launcher/scripts/macro-sentiment.jsx` — the terminal panel that renders it.
- `docs/macro/AUTONOMOUS_UPDATE.md` — the scheduled-agent playbook that feeds it.
