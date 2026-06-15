# LBC Industry Driver Engine — Report

_Auto-generated from output/engine.json — 2026-06-15T14:55:10._  
**21 perfected · 21 partial · 10 needs_review · 0 blocked** of 52 IDX sub-industry baskets.

Each row: which CEIC/macro/commodity series statistically drive the basket's stock returns, the live verdict, and model quality (monthly R^2 + pseudo-OOS directional hit-rate). Method: EQUAL-WEIGHT basket return (no mcap look-ahead) vs overlap-aware HAC-OLS + Šidák lead-lag + autocorr-deflated IC + collinearity-pruned multivariate + pseudo-OOS, reconciled against economic theory; confidence multiple-testing-penalised and conviction-shrunk when evidence is thin. CEIC drivers are publication-lagged (as-known). See PLAN.md / RUN.md / CRITIQUE_LOG.md.

## PERFECTED (21)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Banks | Financials | NEUTRAL | 47 | low | 5 | 0.13 | 61% | USD/IDR (-0.3098) |
| Coal | Energy | NEUTRAL | 55 | high | 12 | 0.25 | 67% | Bloomberg Commodity Idx (0.4228) |
| Property | Properties & Real Estate | NEUTRAL | 48 | medium | 3 | 0.20 | 64% | id_10y (-0.4251) |
| Hospitals | Healthcare | MILDLY BEARISH | 44 | high | 4 | 0.04 | 60% | Job postings (new): hosp (0.3158) |
| Metals & Mining | Basic Materials | NEUTRAL | 48 | medium | 7 | 0.10 | 67% | Aluminum (0.257) |
| Oil & Gas | Energy | MILDLY BULLISH | 56 | high | 5 | 0.13 | 55% | Brent Crude (0.3115) |
| Tobacco | Consumer Non-Cyclicals | NEUTRAL | 45 | medium | 5 | 0.05 | 54% | Import: Indonesia (0.4395) |
| Pharma | Healthcare | MILDLY BULLISH | 57 | high | 5 | 0.19 | 54% | id_10y (-0.2697) |
| Cement | Basic Materials | NEUTRAL | 50 | medium | 2 | 0.17 | 64% | id_10y (-0.4079) |
| Construction | Infrastructure | MILDLY BEARISH | 41 | high | 4 | 0.23 | 57% | id_10y (-0.4042) |
| Multifinance | Financials | NEUTRAL | 50 | high | 5 | 0.14 | 58% | US Dollar Index (-0.257) |
| Apparel | Consumer Cyclicals | NEUTRAL | 48 | medium | 4 | 0.10 | 56% | Volume: Other vegetable  (0.2841) |
| Securities | Financials | MILDLY BULLISH | 58 | medium | 12 | 0.09 | 51% | Real GDP (SA) (0.2843) |
| Metals | Basic Materials | NEUTRAL | 52 | medium | 6 | 0.12 | 52% | id_10y (-0.16) |
| Electronics | Technology | NEUTRAL | 55 | medium | 6 | 0.13 | 55% | Value: Mobile (0.1542) |
| Healthcare Equipment | Healthcare | NEUTRAL | 51 | medium | 12 | 0.06 | 72% | Job postings (removed):  (0.3893) |
| Logistics | Transportation & Logistics | NEUTRAL | 48 | high | 7 | 0.07 | 66% | International: Tanjung P (0.2086) |
| Restaurants | Consumer Cyclicals | NEUTRAL | 53 | medium | 12 | 0.09 | 55% | Rice: Super Quality I: M (0.1571) |
| Poultry | Consumer Non-Cyclicals | NEUTRAL | 46 | high | 11 | 0.06 | 62% | World: Poultry-Keeping M (-0.3086) |
| Healthcare Services | Healthcare | MILDLY BEARISH | 40 | medium | 12 | 0.10 | 50% | Producer price index (-0.4238) |
| Auto | Consumer Cyclicals | NEUTRAL | 50 | medium | 2 | 0.11 | 58% | Real GDP (SA) (0.2562) |

## PARTIAL (21)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Mining | Basic Materials | NEUTRAL | 48 | medium | 12 | 0.23 | 60% | Nickel  LME (0.3608) |
| Food & Beverage | Consumer Non-Cyclicals | NEUTRAL | 49 | low | 12 | 0.18 | 62% | Rice: Super Quality II:  (0.2512) |
| Energy Services | Energy | NEUTRAL | 53 | low | 12 | 0.09 | 56% | Production: Natural gas  (0.1563) |
| Telco | Infrastructure | NEUTRAL | 50 | low | 1 | - | - | Real GDP (SA) (0.2674) |
| Plantation | Consumer Non-Cyclicals | NEUTRAL | 53 | low | 12 | 0.25 | 68% | Palm Oil (CPO) (0.2566) |
| Conglomerate | Industrials | NEUTRAL | 49 | low | 6 | 0.19 | 61% | id_10y (-0.4315) |
| Internet | Technology | NEUTRAL | 50 | low | 1 | - | - | Real GDP (SA) (0.191) |
| Machinery | Industrials | MILDLY BULLISH | 56 | low | 8 | 0.21 | 63% | Bloomberg Commodity Idx (0.3365) |
| Media | Consumer Cyclicals | NEUTRAL | 50 | high | 6 | 0.15 | 56% | Real GDP (SA) (0.1883) |
| Household | Consumer Non-Cyclicals | NEUTRAL | 49 | low | 4 | 0.05 | 46% | Palm Oil (CPO) (-0.1451) |
| Investment | Financials | NEUTRAL | 50 | low | 3 | 0.07 | 55% | id_10y (-0.1362) |
| Shipping | Transportation & Logistics | NEUTRAL | 51 | medium | 2 | 0.09 | 65% | International: Tanjung P (0.202) |
| Airlines | Transportation & Logistics | NEUTRAL | 49 | medium | 2 | 0.07 | 54% | USD/IDR (-0.1703) |
| Electrical Equipment | Industrials | NEUTRAL | 50 | low | 2 | 0.06 | 53% | BI Policy Rate (-0.2061) |
| Software | Technology | NEUTRAL | 49 | low | 4 | 0.06 | 53% | Value: Desktop (0.1845) |
| Durables | Consumer Cyclicals | NEUTRAL | 47 | medium | 5 | 0.09 | 57% | us_housing (0.2563) |
| Toll Road | Infrastructure | NEUTRAL | 53 | medium | 9 | 0.03 | 60% | GDP: Storage & Support (0.3111) |
| Tower | Infrastructure | NEUTRAL | 50 | low | 1 | - | - | Bank Lending Rate (-0.1389) |
| Services | Industrials | NEUTRAL | 50 | low | 1 | - | - | id_pmi (0.0944) |
| Staple Retail | Consumer Non-Cyclicals | NEUTRAL | 46 | low | 4 | 0.01 | 39% | Chicken Meat: Modern Mar (0.0814) |
| Utilities | Infrastructure | NEUTRAL | 50 | none | 0 | - | - |  (None) |

## NEEDS_REVIEW (10)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| IT Services | Technology | NEUTRAL | 52 | low | 3 | 0.01 | 48% | Real GDP (SA) (0.0739) |
| Alternative Energy | Energy | NEUTRAL | 50 | low | 4 | - | - | Regular: Peak Load Time (-0.0897) |
| Chemicals | Basic Materials | MILDLY BULLISH | 56 | low | 4 | 0.05 | 57% | USD/IDR (-0.1702) |
| Insurance | Financials | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Containers & Packaging | Basic Materials | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Retail | Consumer Cyclicals | NEUTRAL | 49 | low | 1 | - | - | USD/IDR (-0.266) |
| Paper | Basic Materials | NEUTRAL | 47 | low | 3 | 0.04 | 59% | Manufacturing: Paper and (-0.2202) |
| Leisure | Consumer Cyclicals | NEUTRAL | 50 | low | 1 | - | - | Export: world (UN comtra (0.3215) |
| Ports | Infrastructure | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Construction Materials | Basic Materials | NEUTRAL | 50 | low | 5 | 0.09 | 56% | USD/IDR (-0.2752) |
