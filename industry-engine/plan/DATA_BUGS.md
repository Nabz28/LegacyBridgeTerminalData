# Engine resolver / data bugs found during the deep-plan pass

Consolidated from all 52 per-sub-industry plans. These are **implementation TODOs** —
resolver fixes, candidate-set fixes, and one structural sign-default bug. Fix + re-grade
+ re-backtest when implementing the plans. **Fix order: §0 → §1 → §2 → §4.**

## 0. ROOT CAUSE — the CEIC default-sign trap (highest impact; ~10 baskets)
`engine/drivers.py` `_ceic_role_sign` defaults every **`demand`-tagged CEIC series to
+1** (`supply`→−1). Fine when the `ceic` block is correctly pointed — but several baskets
pull the **wrong** CEIC category, so dozens of irrelevant +1 series get curated in and
**outvote** the 2–4 correct macro/rate drivers in the equal-weight `Σ sign·tanh(z)` signal:
| basket | wrong `ceic` pull | drags in | effect |
|---|---|---|---|
| **Tower** | `("Telecom", None)` | 53 card/e-money **payment** series (+1) | **−0.195**, ≈13:1 outvote — worst case |
| Durables | `("Consumer Discretionary", None)` | 101 auto/motorcycle/textile (0 furniture) | IC 0.00 |
| Construction | `("Industrials & Manufacturing", None)` | 220 endogenous mfg-output | none |
| Cement | `("Industrials & Manufacturing", None)` | SMGR/INTP **own-sales** leak in as demand | marginal only |
| Media | `("Consumer Discretionary"+"Technology")` | no native ad block → pure noise | kept=10 overfit |
| Investment | `("Banks", None)` | 147 banking prints for a coal holdco | −0.13 + circular jci |
| Toll Road | `("Transport & Logistics", None)` | sea-cargo/air-pax/rail (not road traffic) | theory-incoherent |
| Services | `("Industrials & Manufacturing", None)` | 220 machinery/metals capex for labour-services | −0.06 |
| Auto / Multifinance | auto-units / own-book | coincident volume, not the leading cause | −0.09 / −0.02 |
Fix per each file's §9: narrow the `ceic` block + `ceic_override` re-roles + `ceic_exclude`
endogenous own-output. **This single change is the biggest expected IC mover.**

## 1. Resolver bugs (affect the whole engine — fix first)
| key | current | problem | fix |
|---|---|---|---|
| `dxy` | `TVC:BBDXY` | **EMPTY (weekly_obs 0)** → DXY silently unwired everywhere | `TVC:DXY` (wk 800) |
| `us_real10y` | *(missing)* | **DFII10 (US real 10Y, wk 800) has NO resolver key** — the single most theory-correct driver for every duration basket (Property, Telco, Tower, IT, Internet, Pharma, AltEnergy) | add `"us_real10y": "DFII10"` |
| `wb_coffee_robusta` | `ICE:RC1!` | EMPTY | `ICE:KC1!` (Arabica, wk 800) |
| `wb_rubber` | `SGX:TF1!` | EMPTY → Plantation/auto rubber sleeve unpriced | (no clean fix; proxy) |
| `wb_lng_jp` | `SGX:JKM1!` | EMPTY → Asian LNG gas-switch channel unmeasurable | `NYMEX:NG1!` (proxy) |
| `wb_coal_au` | `ICEEUR:ATW1!`→fixed→`ICEEUR:ATR1!` | Newcastle empty; API2 used | OK (already fixed) |
| `wb_nickel` `wb_tin` `wb_urea` `wb_potash` | `None` | no clean price in store | nickel→`IGO.AX`/`GLEN.L` equity proxy; urea→CEIC fertiliser value÷volume |
| `id_lending_rate` | `None` (spark only) | unwired | map to a real CEIC lending/KPR-rate ric (e.g. KPR rate `CEIC14419701`) |

Other empty market ids to AVOID wiring: `SGX:FFX1!` (coking coal), `SGX:FEF1!`
(iron ore), `SHFE:RB1!` (China rebar), `BMFBOVESPA:FCPO1!` (use `MYX:FCPO1!`),
`CME:DC1!` (milk). Always check `weekly_obs` in `catalog/market.json` before wiring.

## 2. Candidate-set / sign / mislabel bugs (per basket — detail in each §9)
- **Telco**: `("Telecom", None)` sweeps ~53 card-payment / e-money series (Internet/
  Banks output, not telco revenue) that drown the ~30 subscriber/ARPU series.
- **Chemicals**: `("Basic Materials", None)` sweeps `Total Reserves Minus Gold`
  (`CEICI224743301`) — the spurious "strong driver"; narrow the block.
- **Coal**: `Volume: Dry Rubber` (`CEICI13515501`) is mis-filed under the Coal sub →
  `ceic_exclude`.
- **F&B**: `soybean_meal` (poultry feed) wrongly applied to branded food; `id_cpi_yoy
  demand −1` mis-signs pricing power → split to 0.
- **Mining / Metals & Mining**: copper(+China) and gold(−real-yield/USD) have OPPOSITE
  macro drivers — a single +1 blend muddies the signal; split or use real-yield for
  the gold sleeve.
- **Paper**: `bcom`/`AMEX:DBC` is wired as the "pulp/paper price" but is an energy-heavy
  commodity ETF with zero paper content → goes long the basket on oil rallies that are
  actually a mill **cost** headwind (backwards sign → the −0.09). Drop `bcom`; proxy a
  *leading* price via US paper-producer equities (IP/PKG/WY) + China pulp imports.
- **Oil & Gas**: long-Brent upstream sleeve (ENRG/MEDC) and short-gas-cost / long-duration
  utility sleeve (PGAS/RAJA) **cancel** at the blend level → forward-flat. Also the **ICP**
  govt crude price `CEICI14459401` is mis-filed under Consumer Staples/"Food Retail Prices"
  so `("Energy","Crude Oil")` never pulls it. Split upstream vs gas-utility sleeves.
- **Apparel / Electrical Equipment**: CEIC **export** value tagged `supply` (should be
  demand +1 = the order book) and **import** value tagged `demand` (should be cost /
  competing-supply −1) → `ceic_override` to re-role. `wb_rubber→SGX:TF1!` empty (footwear).
- **Machinery**: equal-weight `weight_cap 0.12` caps UNTR (79% mcap) at 12%, so the signal
  is the 12 small dealer/parts names; UNTR's own Pama production prints reject (corr −0.11).
  The on-thesis Komatsu equipment-sales series `CEICI391910517` lives in Infra>Construction,
  which the `ceic` pull never reaches → add that cross-industry category.
- **Staple Retail**: `id_cpi_yoy −1` imports discretionary polarity; a pricing-power staple
  sees food-CPI lift *nominal revenue* → net sign ~0/+. Add `id_cpi_food → CEIC521347877`.
- **ID-macro plane not read** (blocks the correct tree for Property, Cement, Construction,
  Retail, Multifinance, Auto, Staple Retail, Services): the richest *leading* series —
  KPR/mortgage rate, loan-by-type, NPL formation, consumer-survey intent, RPPI, retail-sales
  survey, foreign net-buy `CEIC14620501` — live in `country=id` (`CEIC…` RICs) that **NO
  current resolver path reads**. Needs one thin `id`-macro observations resolver
  (`ID_MACRO_OBS`). Highest-leverage single addition after §0.

## 3. Worklist membership / classifier issues (in `build_worklist.py` / `market.json`
labels — NOT engine wiring; a separate cleanup track). Several baskets score on the
**wrong members**:
- **ASII** (Astra) → classified **Conglomerate**, absent from **Auto**; so `Auto` is 7
  micro-cap parts/tyre names (TYRE/PART/LPIN…), and the 32 industry-wide auto-volume prints
  mis-specify them.
- **JSMR** (the dominant toll operator) is mislabeled **"Rail Transport"** in `market.json`
  → routed out of **Toll Road**, leaving META as the only member.
- **HRTA** (gold jewellery, 33% of Apparel mcap) mis-bucketed into **Apparel**.
- **PCAR** (crab/seafood exporter) mis-filed into **Staple Retail**; basket is really
  KMDS/WICO FMCG distributors, not AMRT/MIDI/HERO minimarkets.
- **Poultry** worklist holds **aquaculture** names (CRAB/ISEA/IKAN) + staples large-caps
  rather than CPIN/JPFA/MAIN — it scores SKILL *despite* this (feed-cost factor is robust).
- **Tower** members are CENT+LCKM (not TBIG/TOWR); **Utilities** are MPOW+TGRA (not POWR,
  which sits in Alt Energy); **MFMI** mistagged "Multifinance & Leasing".
- **MUTU/CRSN** (Services), EURO/MSJA/FLMC (Household), several Apparel names have
  `weekly_obs 0` (absent from the price store) → not actually scored; flag LOW confidence.

## 4. Structural data GAPS (no series exists — document, don't fake)
- Foreign equity flow (KSEI net-buy) — only proxied by DXY/yields.
- Baltic/Capesize freight, charter/rig day-rates — none in store (Coal, Shipping, EnergyServices).
- Rainfall / El-Niño / ENSO — none (Plantation weather→yield lead unbuildable).
- Ethylene–naphtha spread / olefin prices — none (Chemicals; proxy via cracker equities).
- BPJS claims/coverage — none (Hospitals/Pharma; proxy via OJK healthcare financing).
- Spectrum/regulatory fees — none (Telco).
