# LBC Industry Driver Engine — Report

_Auto-generated from output/engine.json — 2026-06-14T12:21:02._  
**33 perfected · 9 partial · 10 needs_review · 0 blocked** of 52 IDX sub-industry baskets.

Each row: which CEIC/macro/commodity series statistically drive the basket's stock returns, the live verdict, and model quality (monthly R^2 + pseudo-OOS directional hit-rate). Method: EQUAL-WEIGHT basket return (no mcap look-ahead) vs overlap-aware HAC-OLS + Šidák lead-lag + autocorr-deflated IC + collinearity-pruned multivariate + pseudo-OOS, reconciled against economic theory; confidence multiple-testing-penalised and conviction-shrunk when evidence is thin. CEIC drivers are publication-lagged (as-known). See PLAN.md / RUN.md / CRITIQUE_LOG.md.

## PERFECTED (33)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Banks | Financials | MILDLY BEARISH | 43 | medium | 10 | 0.34 | 64% | USD/IDR (-0.3098) |
| Coal | Energy | NEUTRAL | 55 | high | 12 | 0.25 | 67% | Bloomberg Commodity Idx (0.4228) |
| Mining | Basic Materials | MILDLY BEARISH | 44 | medium | 12 | 0.26 | 59% | Nickel  LME (0.3608) |
| Food & Beverage | Consumer Non-Cyclicals | NEUTRAL | 48 | medium | 12 | 0.18 | 62% | Rice: Super Quality II:  (0.2512) |
| Property | Properties & Real Estate | NEUTRAL | 54 | medium | 3 | 0.18 | 64% | USD/IDR (-0.2925) |
| Energy Services | Energy | MILDLY BULLISH | 56 | medium | 12 | 0.09 | 56% | Production: Natural gas  (0.1563) |
| Hospitals | Healthcare | MILDLY BEARISH | 44 | high | 4 | 0.04 | 60% | Job postings (new): hosp (0.3158) |
| Plantation | Consumer Non-Cyclicals | MILDLY BULLISH | 56 | medium | 12 | 0.25 | 68% | Palm Oil (CPO) (0.2566) |
| Conglomerate | Industrials | NEUTRAL | 47 | medium | 8 | 0.21 | 67% | id_10y (-0.4315) |
| Metals & Mining | Basic Materials | NEUTRAL | 45 | high | 7 | 0.10 | 67% | Aluminum (0.257) |
| Internet | Technology | MILDLY BULLISH | 56 | medium | 6 | 0.07 | 52% | Real GDP (SA) (0.191) |
| Oil & Gas | Energy | MILDLY BULLISH | 56 | high | 5 | 0.13 | 55% | Brent Crude (0.3115) |
| Tobacco | Consumer Non-Cyclicals | NEUTRAL | 45 | medium | 7 | 0.05 | 54% | Import: Indonesia (0.4395) |
| Machinery | Industrials | MILDLY BULLISH | 61 | medium | 8 | 0.21 | 63% | Bloomberg Commodity Idx (0.3365) |
| Pharma | Healthcare | MILDLY BULLISH | 57 | high | 5 | 0.19 | 54% | id_10y (-0.2697) |
| Media | Consumer Cyclicals | NEUTRAL | 46 | medium | 10 | 0.20 | 55% | Jakarta Composite (0.3792) |
| Investment | Financials | NEUTRAL | 52 | medium | 9 | 0.14 | 61% | Jakarta Composite (0.3329) |
| Cement | Basic Materials | NEUTRAL | 45 | medium | 7 | 0.18 | 58% | id_10y (-0.4079) |
| Construction | Infrastructure | MILDLY BEARISH | 37 | high | 8 | 0.23 | 63% | id_10y (-0.4042) |
| Multifinance | Financials | NEUTRAL | 46 | medium | 8 | 0.12 | 50% | id_10y (-0.1785) |
| Apparel | Consumer Cyclicals | NEUTRAL | 47 | high | 4 | 0.10 | 56% | Volume: Other vegetable  (0.2841) |
| Securities | Financials | MILDLY BULLISH | 56 | medium | 12 | 0.19 | 59% | Real GDP (SA) (0.2843) |
| Metals | Basic Materials | NEUTRAL | 52 | medium | 7 | 0.14 | 53% | id_10y (-0.16) |
| Electronics | Technology | NEUTRAL | 55 | medium | 6 | 0.13 | 55% | Value: Mobile (0.1542) |
| Healthcare Equipment | Healthcare | NEUTRAL | 52 | high | 12 | 0.06 | 72% | Job postings (removed):  (0.3893) |
| Logistics | Transportation & Logistics | NEUTRAL | 48 | high | 7 | 0.07 | 66% | International: Tanjung P (0.2086) |
| Restaurants | Consumer Cyclicals | NEUTRAL | 53 | medium | 12 | 0.09 | 55% | Rice: Super Quality I: M (0.1571) |
| Poultry | Consumer Non-Cyclicals | NEUTRAL | 46 | high | 11 | 0.06 | 62% | World: Poultry-Keeping M (-0.3086) |
| Software | Technology | NEUTRAL | 48 | medium | 4 | 0.06 | 53% | Value: Desktop (0.1845) |
| Durables | Consumer Cyclicals | NEUTRAL | 49 | medium | 12 | 0.19 | 61% | id_10y (-0.2304) |
| Toll Road | Infrastructure | NEUTRAL | 53 | medium | 9 | 0.03 | 60% | GDP: Storage & Support (0.3111) |
| Healthcare Services | Healthcare | MILDLY BEARISH | 40 | medium | 12 | 0.10 | 50% | Producer price index (-0.4238) |
| Auto | Consumer Cyclicals | NEUTRAL | 45 | medium | 12 | 0.21 | 46% | Real GDP (SA) (0.2562) |

## PARTIAL (9)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Telco | Infrastructure | NEUTRAL | 50 | medium | 1 | - | - | Real GDP (SA) (0.2674) |
| Household | Consumer Non-Cyclicals | NEUTRAL | 48 | low | 6 | 0.08 | 48% | Palm Oil (CPO) (-0.1451) |
| Shipping | Transportation & Logistics | NEUTRAL | 51 | high | 2 | 0.09 | 65% | International: Tanjung P (0.202) |
| Airlines | Transportation & Logistics | NEUTRAL | 49 | medium | 2 | 0.07 | 54% | USD/IDR (-0.1703) |
| Electrical Equipment | Industrials | NEUTRAL | 49 | high | 2 | 0.06 | 53% | BI Policy Rate (-0.2061) |
| Tower | Infrastructure | MILDLY BEARISH | 39 | low | 1 | - | - | Credit Card: Value: Purc (0.1747) |
| Services | Industrials | NEUTRAL | 47 | low | 4 | - | - | DDI: Basic metals & meta (0.1548) |
| Staple Retail | Consumer Non-Cyclicals | MILDLY BEARISH | 43 | low | 4 | 0.01 | 39% | Chicken Meat: Modern Mar (0.0814) |
| Utilities | Infrastructure | NEUTRAL | 46 | low | 4 | 0.02 | 54% | Natural Gas (Henry Hub) (-0.0395) |

## NEEDS_REVIEW (10)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| IT Services | Technology | NEUTRAL | 54 | low | 4 | 0.01 | 48% | Real GDP (SA) (0.0739) |
| Alternative Energy | Energy | NEUTRAL | 50 | low | 4 | - | - | Regular: Peak Load Time (-0.0897) |
| Chemicals | Basic Materials | MILDLY BULLISH | 56 | low | 4 | 0.05 | 57% | USD/IDR (-0.1702) |
| Insurance | Financials | MILDLY BEARISH | 41 | high | 1 | - | - | Jakarta Composite (0.4254) |
| Containers & Packaging | Basic Materials | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Retail | Consumer Cyclicals | NEUTRAL | 49 | medium | 1 | - | - | USD/IDR (-0.266) |
| Paper | Basic Materials | MILDLY BEARISH | 44 | medium | 3 | 0.04 | 59% | Manufacturing: Paper and (-0.2202) |
| Leisure | Consumer Cyclicals | NEUTRAL | 50 | low | 1 | - | - | Export: world (UN comtra (0.3215) |
| Ports | Infrastructure | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Construction Materials | Basic Materials | NEUTRAL | 50 | low | 5 | 0.09 | 56% | USD/IDR (-0.2752) |
