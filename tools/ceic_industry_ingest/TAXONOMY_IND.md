# Industry taxonomy + Demand/Supply rules (Indonesia CEIC industry data)

Hierarchy for the Industry Data gatherer: **Industry → Sub-industry → {Demand | Supply} → series**.

## 1) INDUSTRY (top level) — map each file's top folder to ONE of these exact names:
| folder prefix(es) | industry |
|---|---|
| 01_Energy, 11_Energy | Energy |
| 02_BasicMaterials, 09_BasicMaterials | Basic Materials |
| 02_Metals | Metals & Mining |
| 06_Plantation | Plantation & Agriculture |
| 04_ConsumerStaples, 13_ConsumerStaples | Consumer Staples |
| 05_ConsumerDiscretionary, 07_Consumer | Consumer Discretionary |
| 03_Banks | Banks |
| 04_Financials, 06_Financials | Financials (non-bank) |
| 03_Industrials, 09_Manufacturing | Industrials & Manufacturing |
| 07_Healthcare | Healthcare |
| 01_Property, 08_Property_RealEstate | Property & Real Estate |
| 08_Infrastructure, 09_Infrastructure | Infrastructure |
| 10_Technology, 10_Technology_Digital | Technology |
| 10_Telecom | Telecom |
| 11_Transport_Logistics | Transport & Logistics |
| 12_Tourism | Tourism |

## 2) SUB-INDUSTRY (2nd level) — derive a clean short name from the FILENAME theme.
Each FILE is generally ONE sub-industry. Examples:
- IDN_Energy_Coal_Mixed → "Coal" ; IDN_Energy_CrudeOil → "Crude Oil" ; IDN_Energy_NaturalGas → "Natural Gas" ; IDN_Energy_ElectricityGeneration → "Electricity"
- IDN_Metals_Nickel → "Nickel" ; IDN_Metals_Tin → "Tin" ; IDN_Plantation_PalmOil → "Palm Oil"
- IDN_Banks_LoanToDepositRatio → "Banking — Prudential" ; IDN_Banks_Multifinance → "Multifinance"
- IDN_Manufacturing_Textile → "Textile & Apparel" ; IDN_Tourism_HotelOccupancy → "Hotels"
Keep sub-industry <= 40 chars, Title Case. Put ALL series of one file under the SAME sub-industry unless a series clearly belongs elsewhere.

## 3) SIDE — every series is **demand** OR **supply**. Pick the best fit:
**SUPPLY** (production/output/availability side): production, output, gross output, value added, capacity, installed capacity, capacity utilization, generation (power), mining/ore production, smelting/refining, IPI/manufacturing production index, number of establishments, planted/harvest area, yield, vehicle/goods **production**, reserves/resource, inventory/stocks, **exports** (domestic supply sold abroad), supply, fleet/units in service, power-plant capacity.
**DEMAND** (consumption/usage/uptake side): sales, domestic sales, consumption, domestic consumption, **imports** (domestic demand met from abroad), registrations (vehicles), retail sales, traffic, passengers, cargo throughput/loaded-unloaded, visitor arrivals, hotel occupancy / length-of-stay, subscribers/ARPU, payment/card/e-money transactions, loans/credit/financing (borrower demand), mortgage/KPR, premiums (insurance uptake), prices (consumer/retail/reference price = a demand-clearing signal).
**Tie-breakers / financials:** Loans/Financing/Credit/Mortgage → demand. Deposits/Third-Party-Funds → supply. NPL/CAR/NIM/ROA/BOPO ratios & bank health → supply. Insurance premiums → demand; claims → supply. If genuinely ambiguous, choose the side the metric most directly measures (a *quantity produced/available* = supply; a *quantity bought/used* = demand). Prices default to **demand** unless explicitly a producer/wholesale cost (then supply).

## 4) Per-series record fields:
- series_id (copy exact), ric = "CEICI" + series_id (note the **I** — industry prefix; no spaces),
- industry, sub_industry, side ('demand'|'supply'),
- description (clean: collapse whitespace, strip trailing ':', keep full meaning),
- subcategory (<=50 char short label from the series name, e.g. "Production volume", "Domestic sales", "By province: Aceh"),
- frequency, units (=unit), source (copy exact).

## Frequency (already ISO): P1D daily · P1M monthly · P3M quarterly · P6M semiannual · P1Y annual.
## Province-granular series: keep them, subcategory "By province: X".
