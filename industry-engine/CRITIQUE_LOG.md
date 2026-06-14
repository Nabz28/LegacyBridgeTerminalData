# Industry Engine — Critique & Hardening Log

Running record of the autonomous CRITIQUE & HARDENING phase (RUN.md). Each fire
appends what it audited/fixed so later fires don't re-audit the same ground.

## Spurious / endogenous-driver audit — COMPLETE for perfected baskets
A scan of every perfected basket's anchor for endogenous (constituent's own
financials), market-beta-circular, or economically-meaningless top drivers:

| Basket | Finding | Action |
|---|---|---|
| **Banks** | anchored on `PT Bank Syariah Indonesia: Assets` (a constituent's balance sheet — endogenous) | `ceic_exclude` single-bank series → re-anchored on USD/IDR + system credit/CAR/NIM (MV R² 0.40, OOS 69%) |
| **Investment** | same: 3 of top 5 = `PT Bank Syariah: Assets` | `ceic_exclude` → re-anchored on JCI/NAV-beta + GDP + system financing |
| **Conglomerate (ASII)** | anchored on JCI r=0.66 — ASII is ~5% of IHSG, so market beta is mechanically circular, not a driver | rebuilt as ASII's real structure: `id_10y` −0.43 (auto-financing) + coal-mining activity (UNTR) + auto wholesale |
| Securities | clean — GDP / JCI(turnover) / auto-cycle | none |
| Media | clean — JCI tops by score but 6 legit theory-anchored drivers | none |
| Healthcare Equipment | top = "Business survey" (theory=None) but **legitimately anchored on USD/IDR** (−0.18, p=0.045, imported devices); small basket (5 names, n=78) | accepted as-is; did NOT manufacture a theory prior for a vague series on a noisy sample |

New mechanism added: `mapping.SEED[*].ceic_exclude = [substr,…]` drops endogenous
CEIC candidates (single-constituent balance sheets). Mirror of `ceic_override`.

## Theory-sign audit — CLEAN (0 issues)
Scan for kept drivers that STABLY + significantly contradict their theory prior
(`theory_agree=False`, `stable=True`, |r|≥0.20, p<0.05) = likely wrong priors.
**Result: 0 hits.** The `stats.is_kept` contradiction guard already rejects
strong stable theory-contradicting drivers, so none survive into the models.

## Open / next critique candidates
- Multiple-testing transparency: large CEIC candidate pools (e.g. Food & Beverage
  ~46 tested) — the UI already shows `n_kept/n_tested`; consider a soft penalty
  or caveat when a basket tested >40 candidates.
- Short-sample model reliability: a few small baskets report high OOS on n<90
  (e.g. Healthcare Equipment OOS 0.72 / n=78) — surface a "short sample" caveat.
- Weekly-frequency pass for liquid market drivers (more power than monthly).
- Partials are honest ceilings (data-limited / idiosyncratic) — re-attempt only
  with a genuinely new economic driver, never by lowering the bar.

## Multi-agent critique (3 rounds × 3 Opus 4.8 critics, both engines) — 2026-06-14
Personas: quant PM, econometrician, IDX strategist (R1); reliability eng, software
architect, sentiment-analytics lead (R2); adversarial red-team, model-validation
(SR 11-7), CIO (R3). All findings actioned. Highlights:

**Statistical (industry):** switched primary target to EQUAL-WEIGHT (cap-weighting
historical returns by today's mcap was look-ahead); CEIC drivers PUBLICATION-LAGGED
(reference-dated prints were joined as if known on their reference date); lead-lag
`corr_at_best` is a max-over-7-lags statistic → Šidák bar 0.22 (cleared on noise
~54% before); overlapping-YoY MA(11) → HAC lag floored at the overlap; IC t-stat
deflated for autocorrelation + gate 2.3; multivariate collinearity-pruned
(NaN-guarded) + raw-design pseudo-OOS (no standardization leak); point forecast
nulled (not clamped-then-printed) beyond ±3SD; multiple-testing confidence haircut
+ reweight (down-weight pseudo-OOS); contradiction guard tightened (reject any
theory-False driver at |r|>=0.15, was only stable ones at 0.2); confidence capped
for <2 drivers / no-theory-anchor; verdict softened + flagged on model-read
conflict; theory-coherence gate for 'perfected' (majority of priored drivers must
agree). **Domain:** coal price → real API2 series (Newcastle empty); Banks dropped
endogenous system ratios + bi_rate prior 0; JCI dropped as a (circular) driver
everywhere; Oil&Gas re-priced for PGAS; Mining→copper/gold, Metals drop iron_ore.
**Reliability:** yfinance fallback gated off by default (deterministic regrade);
atomic + limit-keyed observation cache. **Sentiment:** non-overlapping momentum
diffs; compute_global blends pre-tanh (was a raw-vs-tanh scale mismatch); regime
deadband per-axis with strict directional quadrants + a "Mixed" label (an interim
fix had mislabelled Stagflation as Reflation). **Product:** cross-sectional
allocation bands (OW/UW on raw net_tilt) since conviction-shrinkage compresses
absolute scores; UI surfaces pseudo-OOS, model-conflict, equal-weight honestly.

### KNOWN REMAINING LIMITATIONS (do not over-claim)
- **No CLEAN out-of-sample validation.** The only OOS is a *pseudo*-OOS (params
  re-fit walk-forward, but the driver SET is chosen on the full sample). A true
  nested OOS (re-select drivers inside each window) is the #1 remaining build.
- **No verdict-level backtest.** Per-driver stats exist; whether 'BULLISH 60'
  actually precedes higher forward returns than 'NEUTRAL 49' is untested. Treat
  verdicts as a structured hypothesis, not a validated signal.
- **Researcher degrees of freedom.** mapping.py priors/overrides/excludes were
  tuned while viewing outputs — in-sample-tuning risk. Freeze mapping.py before
  any real OOS window.
- **Survivorship.** Basket membership = names with price history surviving to now
  (delisted names absent); no point-in-time constituents.
- **Cross-engine.** The industry engine does not yet read the macro-sentiment
  regime; a coherence flag per basket is the top decision-usefulness enhancement.
- **'Perfected'** means model-complete + in-sample-fit + pseudo-OOS — NOT
  externally validated. Read confidence as in-sample model strength.
