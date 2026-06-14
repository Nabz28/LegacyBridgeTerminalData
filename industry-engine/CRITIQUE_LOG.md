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
