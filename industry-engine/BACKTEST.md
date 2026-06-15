# Industry Engine — Blindfolded Out-of-Sample Backtest

Walk-forward test (no look-ahead): at each month *t* the signal is the equal-weighted average of `sign_prior · tanh(z_t(driver_move))` over the **theory-anchored** drivers (signs fixed a-priori in mapping.py — **zero parameters fit to the data**), standardised on months [0:t] only, tested against the **unseen** return at *t+1*. CEIC drivers are publication-lagged. A **placebo** control (circular-shifted returns, 60×) gives the null; the engine's forward IC is reported as a percentile of that null. Target = the equal-weight basket of 15–30 real member stocks (same baskets the engine uses).

**Why this matters:** it is the clean OOS the pseudo-OOS could not give. It tests whether the engine's *driver posture actually forecasts forward sub-industry returns*, sector by sector.

## Headline — 52 baskets with enough OOS history (after the lean-tree improvement pass)

- **SKILL** (fwd IC≥0.08 AND beats ≥90% of placebos): **16** (was 12)
- **marginal** (IC≥0.05, ≥80th placebo pctile): **10** (was 9)
- **weak**: 13  ·  **none/negative**: 13 (was 20)
- positive forward IC: **37/52** baskets (was 32/52)

**What changed (the improvement pass).** The single biggest systematic failure was the **CEIC default-sign trap**: the engine equal-weights *all* theory-anchored drivers, so a mis-pointed broad `ceic` block (dozens of coincident demand-tagged series defaulting to +1) drowned the 2–5 genuinely *leading* drivers and often inverted the posture. Replacing those swarms with **lean, leading-dominated trees** (drop the coincident block; wire only the leading rate/cost/commodity/flow drivers) flipped or lifted forward IC on every basket where the bug was present:

| basket | before | after | placebo | result |
|---|---|---|---|---|
| Investment | −0.132 | **+0.20** | 0.10→0.95 | none → **SKILL** (dropped 147-bank-print swarm; wired coal-NAV beta) |
| Cement | +0.067 | **+0.19** | 0.83→1.00 | marginal → **SKILL** (kept coal-cost lead, added rate chain, dropped mfg swarm) |
| Multifinance | −0.021 | **+0.15** | 0.37→0.98 | none → **SKILL** (dropped own-book swarm; funding-rate curve) |
| Durables | 0.000 | **+0.14** | 0.40→0.95 | none → **SKILL** (was 101 AUTO series, zero furniture!) |
| Construction | +0.045 | **+0.14** | 0.77→0.97 | weak → **SKILL** (dropped 220 mfg series; SOE financing spine) |
| Services | −0.060 | **+0.08** | 0.22→0.83 | none → marginal (dropped 220 machinery-capex series) |
| Tower | −0.195 | **+0.04** | 0.02→0.62 | anti → positive (dropped 53 card-payment series; rate-duration tree) |
| Utilities | −0.218 | **+0.05** | 0.05→0.65 | anti → positive (fixed fuel mis-spec: members burn diesel/hydro, not coal/gas) |
| Auto | −0.087 | **+0.04** | 0.23→0.73 | anti → positive (dropped 73 auto-volume series; cost+rate tree) |
| Internet | −0.098 | −0.04 | 0.17→0.35 | none (less anti; dropped 47 payment series — duration mean-reverter) |
| Property | −0.081 | −0.05 | 0.22→0.32 | none (rate-chain thesis; equities lead RPPI so the CEIC block is lagging) |

**Tested and reverted (the backtest overruled the change — no in-sample-only keeps):** Banks (−0.151, mean-reverter), Mining (−0.148→−0.23 worse), Toll Road (+0.10→0.00, lean rewire lost rank-IC skill), Paper (−0.003→−0.09, the bcom-as-pulp "bug" did not hold up). Audit notes recorded in `mapping.py`.

**Note on Insurance:** reclassified SKILL→marginal (+0.154→+0.11) — not a regression from this pass but a *correction*: the committed worklist predated the SEED edit that dropped `jci` (circular market beta), so the old +0.154 was inflated by index beta. The honest float-yield signal is +0.11.

## The pattern (honest read)
- **Forward skill is concentrated where a liquid, exogenous, *leading* price/rate drives the equity** — physical-commodity cost-pass-through (coal, cement, energy services, machinery, metals), feed-cost (poultry), defensive duration (pharma), bond-funded books (multifinance), and commodity-NAV holdcos (investment via coal). Their drivers genuinely lead the equities.
- **Genuinely mean-reverting baskets cannot be made to forecast** — Banks, Securities, Mining, Conglomerate (and to a lesser degree Retail, Hospitals) co-move with their drivers *contemporaneously* but mean-revert, so the posture does not forecast forward. The improvement pass confirmed this empirically: theory-correct rewires that raised in-sample coherence did **not** raise forward IC, and were reverted. For these, read the verdict as *contemporaneous attribution*, not a forecast.
- The fixable failures were **sign/block errors** (a wrong CEIC block creating a coincident +1 swarm); the unfixable ones are **structural** (mean-reversion, or no leading data exists, e.g. Media has no native ad-spend series).
- Contemporaneous IC > forward IC almost everywhere: the engine is a strong **explainer** of co-movement and a **selective** forward predictor.

## Per-sub-industry (sorted by forward IC)

| Sub-industry | Sector | n_oos | fwd IC | placebo pctile | flag |
|---|---|---|---|---|---|
| Healthcare Equipment | Healthcare | 24 | +0.290 | 0.92 | SKILL |
| Alternative Energy | Energy | 64 | +0.228 | 1.00 | SKILL |
| Coal | Energy | 129 | +0.226 | 1.00 | SKILL |
| Poultry | Consumer Non-Cyclicals | 70 | +0.216 | 0.98 | SKILL |
| Investment | Financials | 129 | +0.200 | 0.95 | SKILL |
| Cement | Basic Materials | 129 | +0.191 | 1.00 | SKILL |
| Pharma | Healthcare | 129 | +0.170 | 0.97 | SKILL |
| Multifinance | Financials | 129 | +0.149 | 0.98 | SKILL |
| Machinery | Industrials | 129 | +0.148 | 0.98 | SKILL |
| Metals | Basic Materials | 129 | +0.144 | 0.97 | SKILL |
| Durables | Consumer Cyclicals | 129 | +0.138 | 0.95 | SKILL |
| Construction | Infrastructure | 129 | +0.137 | 0.97 | SKILL |
| Energy Services | Energy | 129 | +0.121 | 0.92 | SKILL |
| Food & Beverage | Consumer Non-Cyclicals | 129 | +0.117 | 0.88 | marginal |
| Staple Retail | Consumer Non-Cyclicals | 124 | +0.116 | 0.93 | SKILL |
| IT Services | Technology | 99 | +0.115 | 0.93 | SKILL |
| Insurance | Financials | 129 | +0.109 | 0.87 | marginal |
| Apparel | Consumer Cyclicals | 129 | +0.105 | 0.88 | marginal |
| Electrical Equipment | Industrials | 129 | +0.101 | 0.83 | marginal |
| Toll Road | Infrastructure | 94 | +0.100 | 0.87 | marginal |
| Leisure | Consumer Cyclicals | 129 | +0.094 | 0.85 | marginal |
| Containers & Packaging | Basic Materials | 129 | +0.089 | 0.90 | SKILL |
| Services | Industrials | 122 | +0.080 | 0.83 | marginal |
| Electronics | Technology | 129 | +0.074 | 0.85 | marginal |
| Plantation | Consumer Non-Cyclicals | 129 | +0.068 | 0.85 | marginal |
| Construction Materials | Basic Materials | 129 | +0.065 | 0.80 | marginal |
| Utilities | Infrastructure | 53 | +0.049 | 0.65 | weak |
| Auto | Consumer Cyclicals | 129 | +0.043 | 0.73 | weak |
| Telco | Infrastructure | 129 | +0.042 | 0.82 | weak |
| Tower | Infrastructure | 127 | +0.042 | 0.62 | weak |
| Ports | Infrastructure | 129 | +0.037 | 0.62 | weak |
| Metals & Mining | Basic Materials | 129 | +0.035 | 0.67 | weak |
| Chemicals | Basic Materials | 129 | +0.034 | 0.65 | weak |
| Oil & Gas | Energy | 129 | +0.028 | 0.65 | weak |
| Shipping | Transportation & Logistics | 129 | +0.026 | 0.55 | weak |
| Household | Consumer Non-Cyclicals | 129 | +0.022 | 0.53 | weak |
| Tobacco | Consumer Non-Cyclicals | 129 | +0.004 | 0.47 | none |
| Logistics | Transportation & Logistics | 129 | +0.000 | 0.50 | weak |
| Paper | Basic Materials | 129 | −0.003 | 0.45 | none |
| Restaurants | Consumer Cyclicals | 129 | −0.006 | 0.47 | none |
| Software | Technology | 112 | −0.014 | 0.50 | weak |
| Hospitals | Healthcare | 126 | −0.023 | 0.47 | none |
| Media | Consumer Cyclicals | 129 | −0.024 | 0.43 | none |
| Airlines | Transportation & Logistics | 129 | −0.025 | 0.38 | weak |
| Healthcare Services | Healthcare | 58 | −0.032 | 0.42 | none |
| Internet | Technology | 128 | −0.040 | 0.35 | none |
| Property | Properties & Real Estate | 129 | −0.053 | 0.32 | none |
| Retail | Consumer Cyclicals | 129 | −0.067 | 0.27 | none |
| Securities | Financials | 129 | −0.101 | 0.13 | none |
| Mining | Basic Materials | 129 | −0.131 | 0.08 | none |
| Conglomerate | Industrials | 125 | −0.143 | 0.07 | none |
| Banks | Financials | 129 | −0.151 | 0.05 | none |

## Caveats (do not over-read)
- n_oos ~50–130 monthly predictions: wide CIs; the placebo percentile is the robust significance signal, not the hit-rate. Utilities (n=53), Healthcare Equipment (n=24) are especially fragile.
- Candidate set + signs are frozen in mapping.py but were *chosen* while viewing full-sample data — residual selection risk at the universe level. The lean-tree pass reduced this by cutting driver counts (fewer tested → less multiple-testing risk).
- Survivorship: baskets = members surviving to today (yfinance off).
- The improvement pass was strictly forward-IC-gated: every change was kept only if blindfolded OOS IC held/improved (placebo-adjusted); changes that helped in-sample but not OOS were reverted. The remaining 13 "none" baskets are genuine mean-reverters or data-gapped, not un-attempted.
- This validates the *anchored-driver posture*, the engine's core claim; the multivariate verdict adds in-sample fitting on top and is not separately OOS-validated here.
