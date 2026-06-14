# LBC Industry Driver Engine — Deep Improvement Plan (Master)

> **The problem this fixes.** Today the engine maps a thin, flat driver set per
> sub-industry. *Property* — a 341T sector — is "modelled" with **3 kept drivers**
> (USD/IDR, BI lending rate, GDP), no demand/supply separation, and it has **no
> forward OOS skill** (IC −0.08). Yet the terminal holds a **123-series Property &
> Real Estate industry block** — Residential Property Price Index (RPPI, 18 cities,
> QoQ + YoY), Mortgage/KPR loan growth + NPL by size, Commercial Property prices,
> Construction Loans, savings-allocation intent — **none of it wired**. This plan
> builds, per sub-industry, a deep **demand/supply driver TREE** mapped to the real
> series we already have, with a forward-predictability hypothesis for each branch.

This master file is the framework + the reusable driver library + the per-sub-
industry template + the 52-capsule index. The depth lives in
`plan/subindustry/<id>.md` (one per sub-industry). All series cited exist in the
inventory: `plan/DATA_INVENTORY.md` + `plan/catalog/*.json` (idind 2061 · id 2101 ·
cn 3988 · us 4252 · live 230 · market 3958).

---

## 1. The driver-tree framework

Each sub-industry is modelled as a **tree**, not a flat list:

```
SUB-INDUSTRY (equity basket of 15–30 real names)
├── DEMAND side  (what drives revenue/volume up)
│   ├── Driver D1  ──► sub-driver D1a ──► [series RIC/id] (sign, lag, mechanism)
│   │              └─► sub-driver D1b ──► [series]
│   └── Driver D2  ──► ...
├── SUPPLY / COST side  (output, input cost, margin)
│   ├── Driver S1  ──► input cost ──► [commodity series] (sign, lag)
│   └── Driver S2  ──► capacity/output ──► [industry series]
├── MACRO / RATES / FX / FLOW  (discount rate, financing, currency, risk appetite)
└── CROSS-INDUSTRY linkages (a driver that is another sub-industry's output)
```

**Every leaf carries:**
- `series` — the exact RIC (`CEICI…` industry), macro RIC, or market id (`ICEEUR:ATR1!`).
- `role` — demand · supply · cost · macro.
- `sign` — a-priori theory sign on the basket's return (the engine reconciles vs data).
- `lag` — expected LEAD in months (does it move *before* the equities? this is what
  separates a forecaster from an explainer — see the OOS backtest).
- `mechanism` — one line of economic causality.
- `data quality` — frequency, n_obs, publication lag, staleness.

**The sub-driver chain ("what affects the driver").** Drivers have parents. e.g.
Property demand ← mortgage-loan growth ← mortgage rate ← BI 7DRR ← Fed funds / DXY /
inflation. We model 1–2 levels up so the engine can use the *leading* parent (rates)
to anticipate the *lagging* child (loan growth → marketing sales → earnings → price).

---

## 2. The cross-cutting DRIVER LIBRARY (reusable across all sub-industries)

These series recur. Each sub-industry file references them by tag instead of
re-deriving. All are real and populated.

### 2.1 Rates & yield curve  (discount rate + financing cost)
| tag | series | freq | note |
|---|---|---|---|
| `BI_RATE` | `ECONOMICS:IDINTR` / `aIDRREP7DR` (BI 7DRR) | M | policy rate |
| `LEND_RATE` | CEIC Banking lending-rate series | M | bank loan yields |
| `JIBOR_ON` | `aIDONINTR` | M | overnight interbank |
| `ID10Y` `ID01Y…ID30Y` | `TVC:ID10Y` … | D | govt curve (mortgage/duration proxy) |
| `US10Y` | `TVC:US10Y` | D | global discount rate / risk-free |
| `US_REAL10Y` | `DFII10` | D | real yield (growth-stock duration) |
| `US_2s10s` | `US10Y-US02Y` | D | curve slope (cycle) |

### 2.2 FX  (USD revenue vs imported cost vs flow)
| tag | series | note |
|---|---|---|
| `USDIDR` | `FX_IDC:USDIDR` | exporter +, importer −, risk-off proxy |
| `DXY` | `TVC:BBDXY` | broad USD; EM-flow headwind |
| `REER` `NEER` | `aIDBISRXBR` `aIDBISNXBR` | competitiveness |
| `USDCNY` | `FX_IDC:USDCNY` | China linkage |

### 2.3 Liquidity, credit & banking  (CEIC Banking = 74 macro series)
| tag | series | note |
|---|---|---|
| `M2_YOY` | `aIDM2AR` | broad money growth |
| `CREDIT_YOY` | `aIDLONYAR` | system bank-credit growth |
| `LDR` | `aIDCBLODPR` | loan-to-deposit (liquidity) |
| `BANK_CREDIT_*` | CEIC Banking block | by-sector loan growth (KPR, vehicle, working-cap, investment) |

### 2.4 Consumer & income  (CEIC Consumer Surveys = 72 series)
| tag | series | note |
|---|---|---|
| `CONS_CONF` | `aIDCONIAR` | consumer confidence |
| `RETAIL_YOY` | `aIDRSLSAR` | retail sales |
| `SURVEY_*` | Consumer Surveys block | income expectations, durables-buying intent, savings-allocation |

### 2.5 Activity & cycle
| tag | series | note |
|---|---|---|
| `GDP_YOY` | `aIDGDPAR1` | real GDP |
| `IP_YOY` | `IDNPROINDMISMEI` / `aIDIPMANIDX` | industrial production |
| `PMI` | `aIDPMIMAQ` | manufacturing PMI |
| `CAPUTIL` | `aIDCAPUIND` | capacity utilisation |
| `EXPORTS_YOY` `IMPORTS_YOY` | `aIDEXGAR` `aIDIMGAR` | trade volumes |

### 2.6 Commodities  (market, deep weekly history)
| tag | series | tag | series |
|---|---|---|---|
| `COAL` (API2) | `ICEEUR:ATR1!` | `CPO` | `MYX:FCPO1!` / `BMFBOVESPA:FCPO1!` |
| `BRENT` | `ICEEUR:BRN1!` | `WTI` | `NYMEX:CL1!` |
| `NATGAS` | `NYMEX:NG1!` | `JKM_LNG` | `SGX:JKM1!` |
| `COPPER` | `COMEX:HG1!` | `GOLD` | `COMEX:GC1!` |
| `IRON_ORE` | `SGX:FEF1!` | `HRC_STEEL` | `NYMEX:HRC1!` |
| `ALUMINIUM` | `COMEX:ALI1!` | `CHINA_REBAR` | `SHFE:RB1!` |
| `SOYOIL` | `CBOT:ZL1!` | `SOYMEAL` | `CBOT:ZM1!` |
| `WHEAT` | `CBOT:ZW1!` | `CORN` | `CBOT:ZC1!` |
| `SUGAR` | `ICE:SB1!` | `COFFEE_ROB` | `ICE:RC1!` |
| `COTTON` | `ICE:CT1!` | `RUBBER` | `SGX:TF1!` |
| `BCOM`(proxy) | `AMEX:DBC` | `LUMBER` | `CME:LBR1!` |

### 2.7 China demand  (CEIC China = 3988 series; key tags)
| tag | series | tag | series |
|---|---|---|---|
| `CN_IP` | `aCNIP` | `CN_RETAIL` | `aCNCRETYF` |
| `CN_PPI` | `aCNPPIAR` | `CN_PMI` | `aCNPMIMT` |
| `CN_HOUSE_PX` | `aCNHPIAR` | `CN_FLOOR_SOLD` | (cn property block) |
| `CN_LPR5Y` | `aCNLPR5RR` | `CN_M2` | `aCNM2GRTY` |

### 2.8 Global risk
`NDX` `SPX` `VIX` (us indices), `US10Y`, `DXY`, `JCI` (benchmark — NEVER a driver).

---

## 3. The data palette by source (how to find more)

- **Matching industry block** (`catalog/idind.json`, grouped in DATA_INVENTORY §1):
  every equity sector maps to ≥1 CEIC industry category. Use its demand/supply
  series directly. **Cross-industry**: pull *other* categories' outputs as inputs
  (Property ← Basic Materials cement/steel; Poultry ← Plantation corn/soymeal).
- **ID macro** (`catalog/id.json`, §2): Banking(74), Consumer Surveys(72), Money
  Supply(67), Capital Markets(45), CPI(37), Housing&Construction, Trade, Monetary.
- **China/US macro** (§"CEIC China/US"): China for commodity & metals demand and
  the property complex; US for rates, the dollar, and global-growth duration.
- **Market** (`catalog/market.json`, §3): commodities/FX/yields/indices with deep
  weekly history — the *leading, liquid, real-time* drivers (the ones that forecast).

> **Rule of thumb on forward skill (from the backtest):** liquid, exogenous,
> *price* series (commodities, FX, yields) tend to LEAD the equities → forecastable.
> Slow CEIC *quantity* prints (production, loans) are publication-lagged and often
> coincident/lagging → good for attribution, weak for forecasting. Build each tree
> to include BOTH, but tag which branch is expected to forecast.

---

## 4. Per-sub-industry file template (`subindustry/<id>.md`)

1. **Snapshot** — basket (members + what they do), mcap, current grade, current
   kept-driver count, **current forward OOS skill** (from BACKTEST.md), the gap.
2. **Economic structure** — how the basket makes money; the revenue identity
   (price × volume) and the cost stack; what a sell-side analyst actually watches.
3. **DEMAND driver tree** — drivers → sub-drivers → series, each with sign/lag/
   mechanism/quality + a forecast hypothesis.
4. **SUPPLY / COST driver tree** — same.
5. **MACRO / RATE / FX / FLOW** — same.
6. **Cross-industry linkages** — series borrowed from other categories.
7. **Currently wired vs available** — table: what the engine uses now vs the full
   available set (the "what we COULD add"), prioritised.
8. **Forecastability** — which branches should LEAD (months) and why; what the OOS
   backtest says; what would move it from explainer to forecaster.
9. **Engine wiring spec** — concrete `mapping.py` changes: `ceic` categories,
   `ceic_override`, `ceic_exclude`, global/macro hints with signs, new resolvers.

---

## 5. The 52 sub-industries — mega-list (priority by mcap)

`grade`/`OOS` = current state. `OOS✓` = blindfolded forward skill today. The
"add" column is the headline of what's missing — full trees in the detail files.

| # | Sub-industry | Sector | mcapT | grade | kept | OOS | Headline drivers to ADD |
|---|---|---|---|---|---|---|---|
| 1 | Banks | Financials | 2354 | perfected | 4 | ✗−0.15 | Banking-block: loan growth by type (KPR/vehicle/WC), NPL, NIM-spread, CASA, BI-rate Δ regime, foreign-flow proxy (bond yield/DXY); read as attribution not forecast |
| 2 | IT Services | Technology | 842 | review | 3 | ✓+0.12 | DCII data-centre power demand, e-commerce/digital-payment vol, US10Y real, NDX, cloud-capex proxy |
| 3 | Coal | Energy | 835 | perfected | 12 | ✓+0.23 | HBA admin price, China coal imports/inventory, India demand, freight (Baltic), power-gen mix |
| 4 | Mining | Basic Materials | 492 | partial | 12 | ✗−0.15 | copper/gold split by name, AISC cost (oil/grid), China property/credit impulse, treasury-metal spread |
| 5 | Alternative Energy | Energy | 402 | review | 4 | ✓+0.23 | electricity tariff, PLN demand, geothermal output, renewable-capex/rates, lithium/storage |
| 6 | Food & Beverage | Consumer Non-Cyclicals | 343 | partial | 12 | ~+0.12 | CPO/wheat/sugar/skim-milk input stack, real wages, retail vol, Ramadan seasonality |
| 7 | Property | Properties & RE | 341 | perfected | 3 | ✗−0.08 | **RPPI (18-city), mortgage-loan growth + NPL, construction loans, KPR rate, marketing-sales intent (savings-allocation), cement+rebar cost** |
| 8 | Chemicals | Basic Materials | 340 | review | 11 | weak | ethylene-naphtha spread, gas feedstock, urea/fertiliser, China PPI, plastics demand |
| 9 | Energy Services | Energy | 321 | partial | 25 | ✓+0.12 | coal mining activity (override), upstream capex, rig/charter rates, oil price |
| 10 | Telco | Infrastructure | 289 | partial | — | weak | data-traffic/subscriber growth, ARPU, capex/USD, spectrum, tower lease |
| 11 | Hospitals | Healthcare | 275 | perfected | 6 | ✗−0.02 | BPJS claims/coverage, bed capacity, patient volume, medical CPI, USD device cost |
| 12 | Plantation | Consumer Non-Cyclicals | 244 | partial | 23 | weak | CPO + soyoil spread, biodiesel mandate (B35/40), El-Niño/rainfall, export levy/DMO, FFB yield |
| 13 | Conglomerate (ASII) | Industrials | 216 | perfected | 11 | ✗−0.14 | auto sales (Gaikindo), UNTR coal capex, AALI CPO, financing rates — multi-segment composite |
| 14 | Metals & Mining | Basic Materials | 211 | perfected | 9 | ✗ | nickel price (LME/CEIC export), ferronickel, China stainless, ore-export-ban policy, smelter capex |
| 15 | Internet | Technology | 167 | partial | — | ✗−0.10 | GMV/take-rate, digital-payment vol, NDX/US10Y duration, funding/burn, subscriber growth |
| 16 | Oil & Gas | Energy | 157 | perfected | 6 | weak | Brent (upstream) + natgas (PGAS cost), refining margin, lifting cost, govt gas price |
| 17 | Insurance | Financials | 152 | review | 5 | ✓+0.15 | premium growth, investment yield (10Y), equity book, claims ratio, bancassurance credit |
| 18 | Tobacco | Consumer Non-Cyclicals | 120 | perfected | 20 | weak | excise tariff (CK), clove/leaf cost, cigarette volume, downtrading, real income |
| 19 | Containers & Packaging | Basic Materials | 108 | review | 3 | ✓+0.09 | resin/PET (oil), paper/kraft, FMCG volume demand, USD inputs |
| 20 | Machinery (UNTR) | Industrials | 108 | partial | 17 | ✓+0.15 | coal mining activity + price, Komatsu unit sales, mining capex, construction equip |
| 21 | Retail | Consumer Cyclicals | 101 | review | — | ✗ | SSSG, consumer confidence, real wages, vehicle/durables sales, credit, festive seasonality |
| 22 | Pharma | Healthcare | 92 | perfected | 7 | ✓+0.17 | USD API cost, drug volume, BPJS formulary, OTC vs ethical mix, defensive-duration (10Y) |
| 23 | Paper | Basic Materials | 88 | review | 6 | ✗ | pulp/BHKP price, China paper PPI, packaging demand, energy cost, USD export |
| 24 | Media | Consumer Cyclicals | 87 | partial | 12 | ✗ | ad-spend (GDP/retail), digital shift, subscriber/streaming, election cycle |
| 25 | Household | Consumer Non-Cyclicals | 75 | partial | 33 | weak | CPO/surfactant input, real income, distribution reach, UNVR-specific share loss |
| 26 | Investment | Financials | 62 | perfected | — | ✗−0.13 | NAV beta (bcom/holdings), GDP, rates — diversified holding composite |
| 27 | Leisure | Consumer Cyclicals | 52 | review | 29 | ~ | visitor arrivals, hotel occupancy, discretionary income, MICE, FX competitiveness |
| 28 | Cement | Basic Materials | 50 | perfected | 14 | weak | coal cost (30% cash cost), bulk vs bag volume, property/infra demand, utilisation, rates |
| 29 | Construction | Infrastructure | 37 | perfected | — | weak | APBN infra capex, new-contract flow, steel/cement cost, SOE leverage/rates, working-capital |
| 30 | Multifinance | Financials | 33 | review | 21 | ✗ | new-vehicle financing vol, funding cost (rates), credit cost/NPL, used-car prices |
| 31 | Apparel | Consumer Cyclicals | 32 | perfected | 9 | ~ | cotton/polyester (oil) input, export orders (US/EU), USD competitiveness, distressed-name idio |
| 32 | Shipping | Transport & Logistics | 32 | perfected | — | weak | bunker (oil), coal/CPO cargo volume, charter/freight rates, fleet capacity |
| 33 | Airlines | Transport & Logistics | 24 | perfected | — | weak | jet fuel (oil), pax traffic, load factor, USD leases, route capacity |
| 34 | Securities | Financials | 23 | perfected | — | ✗−0.11 | market turnover (JCI vol), IPO/issuance pipeline, retail-account growth, rates |
| 35 | Metals (steel) | Basic Materials | 19 | perfected | 11 | ✓+0.14 | HRC price, iron-ore/scrap cost, China rebar, construction demand, USD slab imports |
| 36 | Ports | Infrastructure | 17 | partial | 12 | weak | throughput (export/import vol), trade flows, container traffic, tariff regime |
| 37 | Construction Materials | Basic Materials | 10 | perfected | 12 | ~ | cement/ceramic demand, gas/energy cost, property cycle, rates |
| 38 | Electronics | Technology | 10 | perfected | — | ~ | component (copper) cost, USD imports, China supply chain, consumer demand |
| 39 | Healthcare Equipment | Healthcare | 9 | perfected | 7 | ✓+0.29 | USD device imports, hospital capex, BPJS, healthcare-investment cycle |
| 40 | Logistics | Transport & Logistics | 8 | partial | 16 | weak | freight volume (trade/e-commerce), fuel cost, GDP, warehousing demand |
| 41 | Restaurants | Consumer Cyclicals | 7 | review | 33 | ✗ | dining-out demand (income/confidence), CPO/wheat input, rates (expansion financing) |
| 42 | Poultry | Consumer Non-Cyclicals | 6 | perfected | 10 | ✓+0.22 | corn + soymeal feed (~70% cost), broiler/DOC price, protein demand, culling cycle |
| 43 | Electrical Equipment | Industrials | 6 | perfected | 6 | ~ | copper/aluminium input, cable demand (construction/grid), PLN capex, rates |
| 44 | Software | Technology | 6 | perfected | — | weak | digital spend, NDX/duration, subscriber/SaaS, funding |
| 45 | Durables | Consumer Cyclicals | 5 | review | — | ✗ | steel/metal input, financing (rates), household income, USD imports |
| 46 | Toll Road | Infrastructure | 4 | partial | 15 | ~ | traffic volume, GDP, rates (leveraged annuity), tariff adjustment |
| 47 | Healthcare Services | Healthcare | 3 | perfected | 6 | ✗ | patient/utilisation volume, BPJS, healthcare spend |
| 48 | Tower | Infrastructure | 3 | partial | — | ✗−0.20 | tenancy/lease growth, telco capex, rates (REIT-like duration), USD |
| 49 | Services | Industrials | 2 | perfected | 9 | ✗ | B2B activity (GDP/PMI), sector-specific demand |
| 50 | Auto | Consumer Cyclicals | 1 | perfected | — | ✗ | Gaikindo sales, financing rates, steel input, USD CKD, income |
| 51 | Staple Retail | Consumer Non-Cyclicals | 1 | partial | 14 | ✓+0.12 | grocery volume, food CPI, real wages, store expansion |
| 52 | Utilities | Infrastructure | 0.2 | partial | — | ~ | tariff regime, fuel (coal/gas) cost, electricity demand, regulated WACC |

---

## 6. Prioritisation & rollout

**Tier A — big mcap + currently broken (do first):** Banks, Property, Mining,
Conglomerate, Food & Beverage, Hospitals, Telco, Plantation. (High value, current
forward skill ✗/weak — biggest improvement headroom.)
**Tier B — big mcap already working (deepen + protect):** Coal, Pharma, Machinery,
Energy Services, Metals, Insurance, Healthcare Equipment, Poultry. (Have OOS skill —
add depth without breaking.)
**Tier C — mid/small:** the rest, by mcap.

For each: (1) read its `subindustry/<id>.md`, (2) wire the new series into
`mapping.py` (with sign + role), (3) `build_worklist.py` → `controller.py --only`,
(4) **re-run the blindfolded backtest** (`backtest/bt.py "<name>"`) and KEEP the
change only if forward IC improves or holds with a richer, more honest tree. Never
add a driver that only helps in-sample.

## 7. What "good" looks like (the bar this plan sets)
A finished sub-industry has: a demand tree AND a supply/cost tree, each ≥3 branches
mapped to real series; ≥1 branch that is a *leading* price/rate (forecast candidate);
explicit sub-driver chains for the top 2 drivers; a forecastability verdict tied to
the OOS backtest; and an engine-wiring spec. Property should go from "3 drivers, no
demand/supply split, OOS ✗" to a 12–18-leaf tree (RPPI · mortgage growth · KPR rate ·
construction loans · cement · rebar · BI/10Y · consumer confidence · marketing-sales
intent) with a clear forecast hypothesis on the rate→loan→sales→price chain.

---
*Detail files: `industry-engine/plan/subindustry/<basket_id>.md` — one per sub-industry.*
*Index of ids: see `plan/_state.txt` / worklist.json.*
