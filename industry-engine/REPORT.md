# LBC Industry Driver Engine — Report

_Auto-generated from output/engine.json — 2026-06-14T12:01:35._  
**32 perfected · 11 partial · 9 needs_review · 0 blocked** of 52 IDX sub-industry baskets.

Each row: which CEIC/macro/commodity series statistically drive the basket's stock returns, the live verdict, and model quality (monthly R^2 + out-of-sample directional hit-rate). Method: weight-capped basket return vs HAC-OLS + lead-lag + Spearman-IC + multivariate + expanding-window OOS, reconciled against economic theory. Verdict scores are conviction-shrunk toward neutral when evidence is thin. See PLAN.md / RUN.md.

## PERFECTED (32)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Banks | Financials | NEUTRAL | 50 | medium | 8 | 0.34 | 67% | USD/IDR (-0.3007) |
| Coal | Energy | NEUTRAL | 47 | high | 12 | 0.27 | 58% | Coal  Australia (Newcast (0.3351) |
| Mining | Basic Materials | MILDLY BEARISH | 39 | high | 12 | 0.15 | 68% | Nickel  LME (0.3456) |
| Food & Beverage | Consumer Non-Cyclicals | NEUTRAL | 47 | medium | 12 | 0.23 | 59% | USD/IDR (-0.1814) |
| Property | Properties & Real Estate | NEUTRAL | 54 | medium | 3 | 0.18 | 64% | USD/IDR (-0.2925) |
| Energy Services | Energy | NEUTRAL | 46 | high | 12 | 0.10 | 73% | Mining & Quarrying: Coal (0.2585) |
| Telco | Infrastructure | MILDLY BEARISH | 43 | high | 3 | 0.14 | 34% | Real GDP (SA) (0.2674) |
| Plantation | Consumer Non-Cyclicals | NEUTRAL | 50 | high | 12 | 0.15 | 60% | International Indicators (0.3326) |
| Conglomerate | Industrials | MILDLY BEARISH | 40 | high | 8 | 0.22 | 59% | id_10y (-0.4315) |
| Metals & Mining | Basic Materials | NEUTRAL | 48 | high | 6 | 0.10 | 67% | Aluminum (0.257) |
| Oil & Gas | Energy | NEUTRAL | 53 | high | 6 | 0.20 | 64% | Brent Crude (0.3115) |
| Machinery | Industrials | MILDLY BULLISH | 61 | high | 6 | 0.17 | 67% | Bloomberg Commodity Idx (0.3111) |
| Retail | Consumer Cyclicals | MILDLY BEARISH | 41 | medium | 3 | 0.11 | 54% | USD/IDR (-0.266) |
| Pharma | Healthcare | NEUTRAL | 48 | high | 6 | 0.12 | 52% | Business survey (0.3596) |
| Media | Consumer Cyclicals | MILDLY BULLISH | 64 | high | 12 | 0.28 | 63% | Jakarta Composite (0.3792) |
| Investment | Financials | NEUTRAL | 47 | high | 8 | 0.17 | 57% | Jakarta Composite (0.3358) |
| Leisure | Consumer Cyclicals | MILDLY BULLISH | 61 | high | 10 | 0.07 | 64% | Export: world (UN comtra (-0.239) |
| Cement | Basic Materials | MILDLY BEARISH | 44 | high | 7 | 0.20 | 64% | id_10y (-0.4079) |
| Construction | Infrastructure | MILDLY BEARISH | 43 | high | 7 | 0.24 | 63% | id_10y (-0.4042) |
| Multifinance | Financials | NEUTRAL | 49 | high | 9 | 0.11 | 67% | id_10y (-0.1677) |
| Apparel | Consumer Cyclicals | BULLISH | 69 | medium | 5 | 0.09 | 61% | Volume: Other Made Up Te (0.1622) |
| Securities | Financials | NEUTRAL | 49 | high | 12 | 0.34 | 70% | Consumer Goods: New Four (0.1867) |
| Metals | Basic Materials | NEUTRAL | 51 | medium | 6 | 0.12 | 54% | id_10y (-0.1642) |
| Construction Materials | Basic Materials | MILDLY BULLISH | 57 | medium | 6 | 0.18 | 56% | DDI: Basic metals & meta (0.2043) |
| Electronics | Technology | NEUTRAL | 48 | medium | 6 | 0.09 | 55% | USD/IDR (-0.2355) |
| Logistics | Transportation & Logistics | MILDLY BULLISH | 56 | medium | 5 | 0.05 | 62% | International: Tanjung P (0.1682) |
| Restaurants | Consumer Cyclicals | NEUTRAL | 50 | medium | 8 | 0.06 | 48% | Rice: Super Quality I: P (-0.2023) |
| Poultry | Consumer Non-Cyclicals | NEUTRAL | 51 | high | 11 | 0.06 | 62% | World: Meat Preparations (0.3259) |
| Software | Technology | NEUTRAL | 52 | medium | 3 | 0.06 | 53% | Real GDP (SA) (0.1305) |
| Durables | Consumer Cyclicals | NEUTRAL | 47 | medium | 12 | 0.13 | 65% | id_10y (-0.2305) |
| Healthcare Services | Healthcare | MILDLY BULLISH | 59 | high | 12 | 0.14 | 48% | Capacity utilization (-0.4261) |
| Auto | Consumer Cyclicals | NEUTRAL | 52 | high | 12 | 0.14 | 59% | Real GDP (SA) (0.2562) |

## PARTIAL (11)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Internet | Technology | NEUTRAL | 52 | medium | 9 | 0.17 | - | Real GDP (SA) (0.191) |
| Tobacco | Consumer Non-Cyclicals | NEUTRAL | 55 | high | 8 | 0.06 | 68% | Prompt manufacturing ind (0.6208) |
| Shipping | Transportation & Logistics | NEUTRAL | 52 | high | 2 | 0.05 | 65% | International: Tanjung P (0.1723) |
| Airlines | Transportation & Logistics | NEUTRAL | 49 | medium | 2 | 0.07 | 54% | USD/IDR (-0.1703) |
| Healthcare Equipment | Healthcare | MILDLY BULLISH | 57 | medium | 12 | 0.09 | - | Business survey (0.3876) |
| Electrical Equipment | Industrials | NEUTRAL | 49 | high | 2 | 0.06 | 56% | BI Policy Rate (-0.2039) |
| Toll Road | Infrastructure | NEUTRAL | 46 | low | 9 | 0.08 | 52% | HH consumption: Transpor (0.1519) |
| Tower | Infrastructure | NEUTRAL | 47 | low | 1 | - | - | Credit Card: Value: Purc (-0.0436) |
| Services | Industrials | NEUTRAL | 53 | low | 3 | - | - | FDI: Machinery & electro (0.2022) |
| Staple Retail | Consumer Non-Cyclicals | MILDLY BEARISH | 43 | low | 3 | 0.02 | 29% | Cayenne Pepper: Modern M (-0.1334) |
| Utilities | Infrastructure | NEUTRAL | 49 | low | 1 | - | - | Natural Gas (Henry Hub) (-0.0395) |

## NEEDS_REVIEW (9)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| IT Services | Technology | NEUTRAL | 49 | low | 4 | 0.04 | 43% | Real GDP (SA) (0.0842) |
| Alternative Energy | Energy | NEUTRAL | 50 | low | 7 | 0.03 | 63% | Regular: Peak Load and O (-0.165) |
| Chemicals | Basic Materials | MILDLY BULLISH | 58 | medium | 6 | 0.11 | 55% | USD/IDR (-0.1566) |
| Hospitals | Healthcare | NEUTRAL | 49 | low | 1 | - | - | Job postings (new): hosp (-0.0138) |
| Insurance | Financials | MILDLY BEARISH | 41 | high | 1 | - | - | Jakarta Composite (0.4189) |
| Containers & Packaging | Basic Materials | NEUTRAL | 50 | none | 0 | - | - |  (None) |
| Paper | Basic Materials | MILDLY BULLISH | 56 | medium | 4 | 0.04 | 60% | Manufacturing: Paper and (0.2442) |
| Household | Consumer Non-Cyclicals | NEUTRAL | 51 | medium | 6 | 0.05 | 51% | Palm Oil (CPO) (-0.1451) |
| Ports | Infrastructure | NEUTRAL | 50 | none | 0 | - | - |  (None) |
