# Industry Engine — Blindfolded Out-of-Sample Backtest

Walk-forward test (no look-ahead): at each month *t* the signal is the equal-weighted average of `sign_prior · tanh(z_t(driver_move))` over the **theory-anchored** drivers (signs fixed a-priori in mapping.py — **zero parameters fit to the data**), standardised on months [0:t] only, tested against the **unseen** return at *t+1*. CEIC drivers are publication-lagged. A **placebo** control (circular-shifted returns, 60×) gives the null; the engine's forward IC is reported as a percentile of that null. Target = the equal-weight basket of 15–30 real member stocks (same baskets the engine uses).

**Why this matters:** it is the clean OOS the pseudo-OOS could not give. It tests whether the engine's *driver posture actually forecasts forward sub-industry returns*, sector by sector.

## Headline — 52 baskets with enough OOS history

- **SKILL** (fwd IC≥0.08 AND beats ≥90% of placebos): **12**
- **marginal** (IC≥0.05, ≥80th placebo pctile): **9**
- **weak**: 11  ·  **none/negative**: 20
- positive forward IC: **32/52** baskets
- of the engine's **perfected** baskets, **8/21** show OOS skill/marginal — the engine's in-sample confidence is **only a partial** guide to forward skill.

## The pattern (honest read)
- **Forward skill is concentrated in physical-commodity / cost-pass-through baskets** — coal, energy services, plantation-adjacent, machinery (coal capex), pharma (rate-sensitive defensives), metals. Their drivers are real, exogenous prices that genuinely lead the equities.
- **Financials (Banks, Investment, Securities, Multifinance) and diversified/sentiment baskets (Mining-conglomerates, Retail, Media, Internet, Auto) show NO forward skill — several are anti-predictive** (negative IC below the 5th placebo percentile). These co-move with their drivers *contemporaneously* but **mean-revert**, so the posture does not forecast. For these, the engine's verdict should be read as a *contemporaneous attribution*, NOT a forecast.
- Contemporaneous IC > forward IC almost everywhere: the engine is a strong **explainer** of co-movement and a **selective** forward predictor.

## Per-sub-industry (sorted by forward IC)

| Sub-industry | Sector | grade | conf | n_oos | fwd IC | hit−up | placebo pctile | flag |
|---|---|---|---|---|---|---|---|---|
| Healthcare Equipment | Healthcare | perfected | medium | 24 | +0.29 | +0.19 | 0.92 | SKILL |
| Alternative Energy | Energy | needs_review | low | 64 | +0.23 | -0.03 | 1.00 | SKILL |
| Coal | Energy | perfected | high | 129 | +0.23 | +0.04 | 1.00 | SKILL |
| Poultry | Consumer Non-Cyclicals | perfected | high | 70 | +0.22 | +0.12 | 0.98 | SKILL |
| Pharma | Healthcare | perfected | high | 129 | +0.17 | +0.05 | 0.97 | SKILL |
| Insurance | Financials | needs_review | low | 129 | +0.15 | +0.01 | 0.93 | SKILL |
| Machinery | Industrials | partial | low | 129 | +0.15 | +0.03 | 0.98 | SKILL |
| Metals | Basic Materials | perfected | medium | 129 | +0.14 | +0.01 | 0.97 | SKILL |
| Energy Services | Energy | partial | low | 129 | +0.12 | -0.03 | 0.92 | SKILL |
| Food & Beverage | Consumer Non-Cyclicals | partial | low | 129 | +0.12 | -0.07 | 0.88 | marginal |
| Staple Retail | Consumer Non-Cyclicals | partial | low | 124 | +0.12 | +0.23 | 0.93 | SKILL |
| IT Services | Technology | needs_review | low | 99 | +0.12 | +0.02 | 0.93 | SKILL |
| Apparel | Consumer Cyclicals | perfected | medium | 129 | +0.10 | -0.04 | 0.88 | marginal |
| Electrical Equipment | Industrials | partial | low | 129 | +0.10 | +0.01 | 0.83 | marginal |
| Toll Road | Infrastructure | partial | medium | 94 | +0.10 | +0.15 | 0.87 | marginal |
| Leisure | Consumer Cyclicals | needs_review | low | 129 | +0.09 | -0.10 | 0.85 | marginal |
| Containers & Packaging | Basic Materials | needs_review | none | 129 | +0.09 | +0.01 | 0.90 | SKILL |
| Electronics | Technology | perfected | medium | 129 | +0.07 | -0.06 | 0.85 | marginal |
| Plantation | Consumer Non-Cyclicals | partial | low | 129 | +0.07 | +0.01 | 0.85 | marginal |
| Cement | Basic Materials | perfected | medium | 129 | +0.07 | +0.04 | 0.83 | marginal |
| Construction Materials | Basic Materials | needs_review | low | 129 | +0.07 | +0.00 | 0.80 | marginal |
| Construction | Infrastructure | perfected | high | 129 | +0.04 | -0.05 | 0.77 | weak |
| Telco | Infrastructure | partial | low | 129 | +0.04 | +0.05 | 0.82 | weak |
| Ports | Infrastructure | needs_review | none | 129 | +0.04 | +0.05 | 0.62 | weak |
| Metals & Mining | Basic Materials | perfected | medium | 129 | +0.04 | +0.05 | 0.67 | weak |
| Chemicals | Basic Materials | needs_review | low | 129 | +0.03 | -0.04 | 0.65 | weak |
| Oil & Gas | Energy | perfected | high | 129 | +0.03 | -0.03 | 0.65 | weak |
| Shipping | Transportation & Logistics | partial | medium | 129 | +0.03 | -0.10 | 0.55 | weak |
| Household | Consumer Non-Cyclicals | partial | low | 129 | +0.02 | -0.02 | 0.53 | weak |
| Media | Consumer Cyclicals | partial | low | 129 | +0.01 | -0.11 | 0.48 | none |
| Tobacco | Consumer Non-Cyclicals | perfected | medium | 129 | +0.00 | -0.02 | 0.47 | none |
| Durables | Consumer Cyclicals | partial | low | 129 | +0.00 | +0.02 | 0.40 | none |
| Logistics | Transportation & Logistics | perfected | high | 129 | +0.00 | +0.03 | 0.50 | weak |
| Paper | Basic Materials | needs_review | low | 129 | -0.00 | -0.09 | 0.45 | none |
| Restaurants | Consumer Cyclicals | perfected | medium | 129 | -0.01 | -0.03 | 0.47 | none |
| Software | Technology | partial | low | 112 | -0.01 | +0.15 | 0.50 | weak |
| Multifinance | Financials | perfected | medium | 129 | -0.02 | -0.05 | 0.37 | none |
| Hospitals | Healthcare | perfected | high | 126 | -0.02 | -0.07 | 0.47 | none |
| Airlines | Transportation & Logistics | partial | medium | 129 | -0.03 | +0.03 | 0.38 | weak |
| Healthcare Services | Healthcare | perfected | medium | 58 | -0.03 | -0.03 | 0.42 | none |
| Services | Industrials | partial | low | 128 | -0.06 | -0.03 | 0.22 | none |
| Retail | Consumer Cyclicals | needs_review | low | 129 | -0.07 | -0.14 | 0.27 | none |
| Property | Properties & Real Estate | perfected | medium | 129 | -0.08 | -0.12 | 0.22 | none |
| Auto | Consumer Cyclicals | perfected | medium | 129 | -0.09 | -0.06 | 0.23 | none |
| Internet | Technology | partial | low | 128 | -0.10 | -0.03 | 0.17 | none |
| Securities | Financials | perfected | medium | 129 | -0.11 | -0.15 | 0.12 | none |
| Investment | Financials | partial | low | 129 | -0.13 | -0.04 | 0.10 | none |
| Conglomerate | Industrials | partial | low | 125 | -0.14 | -0.05 | 0.07 | none |
| Mining | Basic Materials | partial | low | 129 | -0.15 | -0.14 | 0.05 | none |
| Banks | Financials | perfected | medium | 129 | -0.15 | -0.11 | 0.05 | none |
| Tower | Infrastructure | partial | low | 127 | -0.20 | -0.06 | 0.02 | none |
| Utilities | Infrastructure | partial | low | 53 | -0.22 | -0.06 | 0.05 | none |

## Caveats (do not over-read)
- n_oos ~50–130 monthly predictions: wide CIs; the placebo percentile is the robust significance signal, not the hit-rate.
- Candidate set + signs are frozen in mapping.py but were *chosen* while viewing full-sample data — residual selection risk at the universe level.
- Survivorship: baskets = members surviving to today (yfinance off).
- This validates the *anchored-driver posture*, the engine's core claim; the multivariate verdict adds in-sample fitting on top and is not separately OOS-validated here.
