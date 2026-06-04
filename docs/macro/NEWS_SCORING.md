# Macro News Scoring — methodology

A standardized, institutional-style infrastructure for scoring macro news impact.
The headline bear/bull number is **computed**, not eyeballed: agents only *match*
a story to a fixed taxonomy; `scripts/news_score.py` does the arithmetic.

Single source of truth: **`scripts/news_taxonomy.json`** (types, targets, scales).

---

## 1. What the agent produces (matching only)
For each headline the agent outputs:
- `type` — one of 12 **news types** (Monetary, Inflation, Growth, Fiscal, Politics,
  Trade, Commodities, Markets, FX, Banking, Corporate, Geopolitics).
- `impacts` — a list of affected **targets** from the taxonomy, each with a
  vol-normalized `level` (−5…+5, in the target's *natural* direction).
- `surprise` — `priced | partial | surprise` (vs what the market had priced).
- plus `source, headline, url, ts, summary, analysis`.

The agent never invents a −100..+100 score, an importance, or a target outside
the taxonomy. `post_news.py` validates and drops off-taxonomy targets.

## 2. The level scale (the "how much", vol-normalized)
A target's `level` is the size of the expected **1–5 day move in that target's own
daily volatility (σ)** — so a currency, a bond yield and an equity are comparable:

| level | move | |
|---|---|---|
| ±5 | >3σ | tail / regime-shifting |
| ±4 | 2–3σ | very large |
| ±3 | 1.25–2σ | large, first-order |
| ±2 | 0.5–1.25σ | moderate |
| ±1 | <0.5σ | minor / second-order |
| 0 | ~0 | priced / negligible |

Each target carries its `sigma` anchor (IDR ≈0.5%/day, JCI ≈1%/day, 10Y SBN ≈5bp/day,
…) so "≈1.5% rupiah move" → ~2.5σ → **level 4**, deterministically. Sign is the
asset's natural up/down; the risk translation is separate (§3).

## 3. Targets, tiers, and risk transmission
~47 targets, grouped and **tier-weighted** by how much each *defines Indonesia
country risk*:
- **Tier 1 = 1.00** — systemic barometers (IDR, 10Y SBN, JCI, BI rate, foreign
  eq/bond flows, sovereign rating, 5Y CDS, CPI, FX reserves, current account).
- **Tier 2 = 0.55** — sub-markets/aggregates (2Y SBN, NDF, INDON, JIBOR, loan
  growth, GDP, trade, fiscal, PMI, M2, FDI, confidence, retail).
- **Tier 3 = 0.30** — sectors/names (banks, coal, nickel, CPO, O&G, telco,
  consumer, property, autos, cement, tech, healthcare, infra, poultry).
- **Global = 0.50** — spillovers (USD, UST10Y, Fed, oil, gold, China/CNY, EM
  risk, SPX, VIX).

Each target has a **`risk_sign`** mapping its natural move to Indonesia risk-on/off:
+1 if asset-up is risk-on (IDR, JCI, reserves…), −1 if asset-up is risk-off
(SBN yield, BI rate, oil, USD, CDS, VIX…). The agent thinks in intuitive asset
terms; the matrix keeps the score correct.

## 4. The score (deterministic rollup)
```
contribution_t = weight(tier_t) · risk_sign_t · (level_t / 5)
raw            = surprise · ( Σ contribution_t ) / SQRT( Σ weight_t )
score          = 100 · tanh( GAIN · raw )            # GAIN = 1.0, bounded
```
The **√Σweight** denominator (not a plain average) is deliberate: it **rewards
breadth** — a 5-asset crisis outscores a single-asset move — while still penalising
a pile of marginal noise targets (a plain sum would over-fire on breadth; a plain
average washes it out entirely). **GL correlation haircut:** global contributions
(USD, oil, …) are halved when their net sign matches the local (ID) net — a hawkish
Fed already explains the rupiah move, so we don't double-count it. `surprise`
(`priced 0.10 / partial 0.45 / likely 0.70 / surprise 1.00`) is the institutional
crux — a fully-priced event scores small even if the targets are big.

Calibration (verified): minor single ≈ ±13, moderate ≈ ±20–30, large multi-asset
≈ ±50–65, systemic crisis ≈ ±80–95. `flat` label band = ±20.

## 5. Importance is DERIVED (not guessed)
`severity = ( s₁ + 0.5·s₂ + 0.25·s₃ ) · surprise`, where s₁≥s₂≥s₃ are the top-3
`weight_t · |level_t|`; **high** if ≥3.0, **med** if ≥1.5, else **low**. Top-3 (not
just the peak) so a broad-based moderate event isn't under-called — fully
standardized, no agent judgment.

## 6. Worked example
Parliament dilutes BI independence (a true surprise): IDR −3, 10Y SBN +3 (yield up),
JCI −2, foreign-bond flows −3, rating −2 → contributions −0.6/−0.6/−0.4/−0.6/−0.4,
raw −0.52, **score −52, importance high** — and every point is explainable.

## 7. Known limitations / regime notes (post quant + EM-PM review)
- **σ anchors** are static, hand-set (not live-estimated) — fine for ordinal level
  matching; refine later with rolling realized vol.
- **State-dependence (fixed sign matrix).** Resolved the worst cases per review:
  OIL → `risk_sign 0` (Indonesia is both an importer *and* a coal/CPO/LNG exporter;
  route supply-shock risk via `IDFISCAL`/subsidy and commodity rallies via
  `COAL_SPOT`/`CPO_PRICE`/`NICKEL_LME`); GOLD → `+1` (the dominant EM channel is
  gold-up-on-weak-USD = carry inflows; the fear channel is carried by VIX/USD);
  IDM2 → `−1` (in Indonesia faster M2 is inflationary/credit-overheat, not benign
  liquidity). Remaining regime caveat: **BIRATE** — a *proactive* cut is risk-on
  but a *reactive/panic* cut is risk-off; the `surprise` field + the news type
  (monetary vs politics) carry most of that signal, but a manual override may be
  needed. **IDCPI** — administered-price (fuel) CPI shocks should be scored lower
  level / partial surprise than core/demand-driven CPI (BI looks through fuel).
- **Cross-impact correlation** beyond the GL↔local haircut isn't modelled (IDR/SBN/
  CDS co-move); the √weight denominator + tier weights partially absorb it.
- News overlap/decay across a day isn't deduped beyond the per-headline hash.

## 8. Files
- `scripts/news_taxonomy.json` — the taxonomy (edit here; everything reads it).
- `scripts/news_score.py` — the engine (importable; `score_impacts`).
- `scripts/post_news.py` — validates + scores on ingest.
- `launcher/scripts/macro-news.jsx` — renders the score (at the needle) + impact bars.
