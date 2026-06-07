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

**Quantitative expected move (per asset).** The level isn't just shown as a word —
the engine turns it back into a concrete move in the asset's natural unit. Each
target has a numeric `sig` (1σ size) and `unit` (`bp` / `pct` / `pp` / `usdm`); a
level maps to a σ midpoint (`1→0.35, 2→0.85, 3→1.6, 4→2.5, 5→3.5`) scaled by the
overall surprise — e.g. a level-3 SBN print renders as ~+8 bp (1.6σ).

> **ILLUSTRATIVE ONLY — not a forecast.** The σ anchors (`sig`) are hand-set priors and the
> backtest found |score| vs |move| rank-corr ≈ 0 (§9): **magnitude has no demonstrated
> forecast skill.** Read the cardinal value as an ordinal rendering of the analyst's level
> tag, not a predicted return. Do not size positions off it. (critique L4)

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

## 9. Backtest / predictive validity — HONEST re-measurement (2026-06)

> **CORRECTION NOTICE.** Earlier versions of this section quoted **~65% on macro / US 84% /
> ID 59%**. Those numbers were **wrong** — inflated by four measurement flaws caught in a
> 9-level critique (see `.bt/engine_dossier.md`): (1) **same-day event clustering** — one
> JCI move counted 2–3× as independent "hits"; (2) **no market-beta adjustment** —
> single-name and ID events credited for moves that were just index drift; (3) a **survivorship
> subset** — accuracy quoted on 76 clean-price rows out of 132 raw; (4) **wrong null** — "vs 50%"
> when ID actually drifted down ~59% of windows. The corrected harness is
> `scripts/sentiment_backtest_v2.py` (cluster-collapse → 101 independent (date,region) obs;
> market-adjusted abnormal returns for single names; drift null; Wilson 95% CIs; a
> human-tag-only control arm). **The numbers below supersede all prior claims.**

**Honest directional hit-rate @+3d** (cluster-collapsed, market-adjusted, n given per row):

| Arm | hit-rate | n | 95% CI |
|---|---|---|---|
| **Engine (full math)** | **53%** | 95 | 43–62% |
| **Human tags only** (control) | 52% | 91 | 42–62% |
| Drift null (predict prior trend) | 46% | 98 | 36–56% |
| US macro | 67% | 27 | 48–81% |
| ID macro | 47% | 55 | 35–60% |
| Global | 46% | 13 | 23–71% |

**Two findings that matter most:**

1. **The engine's math adds ≈ +1pp over the analyst's raw tags.** The control arm — just
   `sign(Σ risk_sign·level)`, surprise-gated, with **no tiers, no √den, no tanh, no
   transmission** — scores 52% vs the engine's 53%. **The skill is in the human tagging
   (the `surprise` flag + signed level), not in the formula.** The elaborate rollup is a
   presentation layer, not an alpha source. Spend effort on tag quality, not on tuning math.
2. **The blended directional edge is ≈ coin-flip (53%, CI straddles 50%).** Only the
   **US-scheduled-macro** cell shows a real-looking edge (67%), and even that is n=27 with a
   CI from 48% to 81% — *not yet statistically established*.

**What does NOT work (unchanged, all confirmed):**
- **Magnitude is not a return forecast.** |score| vs |move| rank-corr ≈ 0. The cardinal
  `expected_move` ("+8 bp") is **illustrative only** — flagged in code (§ `news_score.py`).
- **The rupiah is not predictable from local news** (≈46%, median 3d move ~0.4%, below the
  tradeable noise floor) — context-only, never size off it.
- **Single-name corporate is out-of-domain** (~29% raw / near-coin-flip market-adjusted;
  GoTo first-profit +36→fade, BRMS MSCI-add +26→fade — classic sell-the-news).

**Honest fixes applied this round (none claim an accuracy gain):**
- GL correlation haircut now applies to the **numerator only** (it was wrongly scaling the
  denominator too, partly cancelling itself) — `news_score.py`.
- `expected_move` explicitly tagged **illustrative / not a forecast** (magnitude has no skill).
- `growth` transmission 0.85 → 0.55 (sector growth ≠ index; JCI is flow/rates-led); FED `sig`
  12 → 10 to match BIRATE's 25bp central-bank convention. *Both scale magnitude, not sign — so
  the 53% is unchanged; these are calibration/honesty fixes.*
- Documented near-collinear commodity pairs (COAL~COAL_SPOT, CPO~CPO_PRICE, METALS~NICKEL_LME)
  — tag only one per headline; and that 44/52 targets are unvalidated priors.

## 10. Accuracy sweep — what it does and does NOT show (2026-06)

> **CORRECTION NOTICE.** This section previously claimed conviction-gating "lifts hit-rate
> to 62–66% **and it holds out-of-sample**." **That claim was false and is retracted.** In the
> sweep the gating lift appeared in the *train/full* columns but the **TEST column was flat**
> (≈59% across all gate levels at +3d); the 65–66% configs were n≈13 with −15 to −24pp
> train→test gaps — **overfit, not generalizing.** Conviction-gating is *plausible* but
> **not demonstrated** out-of-sample on this corpus.

The 192-config × train/test sweep (`scripts/sentiment_sweep.py`) is retained as an
exploratory tool, with these honest caveats (critique L1/L7):
- It **ranks by the test column alone** → multiple-comparisons / p-hacking across 192 configs.
- The test block is a **single crisis window** (one regime), with **no multiple-comparisons
  control** and **no human-tag-only control arm**.
- Many configs are **degenerate duplicates** (levers that don't bind for a given scope).

**What genuinely held (and was kept):** the `telegraphed` surprise tier (0.05) so the engine
*abstains* on fully-priced news — conceptually right, harmless. **No sign-flips** (contrarian
rules were test-neutral and rejected — that discipline held).

**What was wrongly adopted and is now flagged:** the politics/geopolitics transmission tweak
(0.35→0.25, 0.40→0.30) was justified as "+12pp train-supported, test-neutral." That is the
**same train-only/test-neutral pattern used to reject the sign-flips** — inconsistent
discipline (critique L9). It is retained only because it is **sign-preserving** (cannot change
the directional rate) and economically defensible, and is now labelled a **prior, not a
validated gain.**

### Honest ceiling & the path to a real 80%
- **Broad 80% is mathematically impossible** here: single-name ~coin-flip and rupiah ~46%
  cannot average up to 80%. The honest blended edge is **~53% (CI 43–62%)**.
- **80% is only conceivable on a narrow corridor:** *confident + unpriced + scheduled
  US/global macro*, measured as **market-adjusted abnormal returns at decision-time**. Today
  that cell is **67% on n=27 (CI 48–81%)** — suggestive, not established.
- **To certify it** (the only honest route, not tuning): curate that scheduled-macro subset to
  **n ≥ 40** pre-registered events, grade abnormal returns from the first close *after* the
  announcement, and require the edge to hold in both up- and down-regimes. Until then the
  product claim must be: *"a directional conviction tag, best on scheduled macro, ~mid-50s
  broadly — not a forecast oracle."*
