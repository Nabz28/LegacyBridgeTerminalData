# LBC Industry Driver Engine — Report

_Auto-generated from output/engine.json — 2026-06-14T10:15:45._  
**40 perfected · 12 partial · 0 needs_review · 0 blocked** of 52 IDX sub-industry baskets.

Each row: which CEIC/macro/commodity series statistically drive the basket's stock returns, the live verdict, and model quality (monthly R^2 + out-of-sample directional hit-rate). Method: weight-capped basket return vs HAC-OLS + lead-lag + Spearman-IC + multivariate + expanding-window OOS, reconciled against economic theory. Verdict scores are conviction-shrunk toward neutral when evidence is thin. See PLAN.md / RUN.md.

## PERFECTED (40)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| Banks | Financials | MILDLY BEARISH | 41 | high | 12 | 0.40 | 66% | PT Bank Syariah Indonesi (-0.3789) |
| Coal | Energy | MILDLY BEARISH | 43 | high | 12 | 0.20 | 60% | Bloomberg Commodity Idx (0.345) |
| Mining | Basic Materials | BEARISH | 33 | high | 12 | 0.25 | 68% | Nickel  LME (0.3065) |
| Alternative Energy | Energy | NEUTRAL | 50 | medium | 12 | 0.05 | 61% | Tariff: Government (0.1243) |
| Food & Beverage | Consumer Non-Cyclicals | NEUTRAL | 48 | medium | 12 | 0.13 | 54% | USD/IDR (-0.1911) |
| Property | Properties & Real Estate | MILDLY BEARISH | 39 | medium | 3 | 0.08 | 58% | USD/IDR (-0.2466) |
| Energy Services | Energy | NEUTRAL | 47 | high | 12 | 0.07 | 58% | Mining & Quarrying: Coal (0.2884) |
| Telco | Infrastructure | NEUTRAL | 46 | high | 5 | 0.16 | 46% | Real GDP (SA) (0.2674) |
| Plantation | Consumer Non-Cyclicals | NEUTRAL | 51 | high | 12 | 0.17 | 66% | International Indicators (0.3409) |
| Conglomerate | Industrials | NEUTRAL | 53 | high | 11 | 0.46 | 66% | Jakarta Composite (0.663) |
| Metals & Mining | Basic Materials | NEUTRAL | 48 | high | 9 | 0.09 | 70% | Nickel  LME (0.3474) |
| Internet | Technology | NEUTRAL | 51 | medium | 12 | 0.10 | 50% | Real GDP (SA) (0.191) |
| Oil & Gas | Energy | NEUTRAL | 54 | high | 6 | 0.21 | 67% | Brent Crude (0.3071) |
| Insurance | Financials | MILDLY BEARISH | 42 | high | 3 | 0.18 | 57% | Jakarta Composite (0.5092) |
| Machinery | Industrials | NEUTRAL | 49 | high | 12 | 0.27 | 68% | Bloomberg Commodity Idx (0.4024) |
| Retail | Consumer Cyclicals | NEUTRAL | 46 | high | 6 | 0.10 | 56% | USD/IDR (-0.2236) |
| Pharma | Healthcare | NEUTRAL | 47 | high | 7 | 0.09 | 53% | id_10y (-0.2887) |
| Paper | Basic Materials | MILDLY BULLISH | 57 | medium | 4 | 0.04 | 61% | Manufacturing: Paper and (0.1835) |
| Media | Consumer Cyclicals | MILDLY BULLISH | 59 | high | 12 | 0.25 | 64% | Jakarta Composite (0.3619) |
| Investment | Financials | MILDLY BULLISH | 56 | high | 12 | 0.21 | 67% | Jakarta Composite (0.3588) |
| Leisure | Consumer Cyclicals | MILDLY BULLISH | 56 | medium | 12 | 0.08 | 58% | Export: world (UN comtra (-0.1879) |
| Cement | Basic Materials | NEUTRAL | 55 | high | 12 | 0.24 | 61% | id_10y (-0.4079) |
| Construction | Infrastructure | NEUTRAL | 53 | high | 12 | 0.21 | 60% | id_10y (-0.4133) |
| Multifinance | Financials | NEUTRAL | 48 | high | 12 | 0.22 | 57% | id_10y (-0.2121) |
| Shipping | Transportation & Logistics | NEUTRAL | 55 | medium | 5 | 0.05 | 60% | International: Tanjung P (0.1791) |
| Airlines | Transportation & Logistics | NEUTRAL | 50 | medium | 5 | 0.07 | 55% | USD/IDR (-0.1703) |
| Securities | Financials | NEUTRAL | 48 | high | 12 | 0.34 | 70% | Consumer Goods: New Four (0.1867) |
| Metals | Basic Materials | MILDLY BULLISH | 57 | medium | 12 | 0.11 | 58% | id_10y (-0.1997) |
| Construction Materials | Basic Materials | MILDLY BULLISH | 56 | medium | 12 | 0.20 | 54% | DDI: Basic metals & meta (0.2043) |
| Electronics | Technology | NEUTRAL | 46 | high | 12 | 0.15 | 62% | Volume: Desktop (0.0769) |
| Healthcare Equipment | Healthcare | MILDLY BULLISH | 57 | high | 12 | 0.07 | 72% | Business survey (0.3876) |
| Logistics | Transportation & Logistics | MILDLY BULLISH | 56 | medium | 12 | 0.09 | 44% | International: Tanjung P (0.2322) |
| Restaurants | Consumer Cyclicals | NEUTRAL | 51 | medium | 12 | 0.08 | 36% | Retail: Curly: Modern ma (0.0697) |
| Poultry | Consumer Non-Cyclicals | NEUTRAL | 52 | medium | 12 | 0.05 | 43% | World: Meat Preparations (0.2552) |
| Electrical Equipment | Industrials | NEUTRAL | 48 | medium | 3 | 0.07 | 57% | BI Policy Rate (-0.2039) |
| Software | Technology | NEUTRAL | 51 | medium | 9 | 0.06 | 47% | Real GDP (SA) (0.1305) |
| Durables | Consumer Cyclicals | NEUTRAL | 50 | high | 8 | 0.17 | 57% | id_10y (-0.242) |
| Healthcare Services | Healthcare | MILDLY BULLISH | 56 | medium | 12 | 0.14 | 46% | Capacity utilization (-0.4261) |
| Services | Industrials | NEUTRAL | 47 | medium | 12 | 0.06 | 47% | FDI: Machinery & electro (0.2022) |
| Auto | Consumer Cyclicals | MILDLY BULLISH | 57 | high | 12 | 0.09 | 46% | Real GDP (SA) (0.2562) |

## PARTIAL (12)

| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | Top driver (corr) |
|---|---|---|---|---|---|---|---|---|
| IT Services | Technology | NEUTRAL | 48 | medium | 9 | 0.06 | 40% | Device vendor share (Tab (0.1299) |
| Chemicals | Basic Materials | NEUTRAL | 48 | high | 12 | 0.11 | 57% | USD/IDR (-0.1888) |
| Hospitals | Healthcare | MILDLY BEARISH | 41 | low | 5 | 0.04 | 58% | Financing: hospital serv (0.0953) |
| Tobacco | Consumer Non-Cyclicals | NEUTRAL | 52 | high | 12 | 0.07 | 56% | Prompt manufacturing ind (0.6208) |
| Containers & Packaging | Basic Materials | NEUTRAL | 51 | low | 2 | 0.01 | 52% | BI Policy Rate (-0.0922) |
| Household | Consumer Non-Cyclicals | NEUTRAL | 49 | medium | 12 | 0.12 | 60% | Beef: Modern Market (0.1136) |
| Apparel | Consumer Cyclicals | NEUTRAL | 50 | low | 5 | 0.05 | 53% | Volume: Other vegetable  (0.115) |
| Ports | Infrastructure | NEUTRAL | 53 | low | 1 | - | - | Indonesia CPI (YoY) (-0.0403) |
| Toll Road | Infrastructure | NEUTRAL | 47 | low | 11 | 0.09 | 23% | HH consumption: Transpor (0.1519) |
| Tower | Infrastructure | NEUTRAL | 46 | low | 7 | 0.04 | 47% | ATM and Debit Card: Valu (-0.125) |
| Staple Retail | Consumer Non-Cyclicals | MILDLY BEARISH | 44 | low | 4 | 0.03 | 34% | Wholesale Price Index: G (-0.102) |
| Utilities | Infrastructure | NEUTRAL | 51 | low | 6 | 0.02 | 52% | USD/IDR (-0.1026) |
