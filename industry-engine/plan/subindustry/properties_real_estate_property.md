# Property (Properties & Real Estate) — Driver-Tree Plan

> Detail file for the LBC Industry Driver Engine. Follows the §4 template in
> `plan/IMPROVEMENT_PLAN.md`. Every series cited is confirmed in
> `plan/catalog/{idind,id,market}.json` with its real RIC and n_obs. This is a
> reference doc a quant implements `mapping.py` from — not prose for its own sake.

---

## 1. Snapshot

| | |
|---|---|
| **Sub-industry** | Property (Properties & Real Estate) |
| **mcap** | ~341T IDR (Tier-A, 7th-largest of 52) |
| **Members (30)** | PANI, CBDK, RISE, MKPI, BSDE, PWON, JRPT, BKSL, CTRA, INPP, DUTI, DMAS, ASRI, APLN, SMRA, LPKR, BEST, KIJA, DILD, GPRA, … — large-cap landed/township developers (BSDE, CTRA, SMRA, PWON), industrial-estate plays (DMAS, BEST, KIJA, SSIA), recurring-income / REIT-like mall+office owners (PWON, MKPI, LPKR), and newer mega-cap IPOs (PANI, CBDK). |
| **Current grade** | `perfected` (in-sample) — but this is misleading; see OOS. |
| **Current kept drivers** | **3 survive** of 5 mapped (USD/IDR, BI lending rate, GDP). `ceic: []` — **the 123-series Property & Real Estate block is entirely unwired.** |
| **Current forward OOS** | **IC −0.08**, hit−up −0.12, placebo pctile **0.22** → flag **none** (anti-predictive; below the median placebo). One of the *worst* forward scores in the universe — the posture mean-reverts. |

**The gap.** Property is "modelled" with a flat macro overlay (rates + GDP + FX) and
**zero** of its own industry block. The terminal holds the richest single-sector
data set we have for this basket — an 18-city **Residential Property Price Index**
(RPPI), **mortgage/KPR loan growth + NPL** by collateral type and house size, a
monthly **construction-loan** book, **commercial-property** price indices for 18
cities, a **savings→property-purchase intent** survey series, and the full Banking +
Consumer-Survey + rate-curve macro complex — none of it connected. The engine grades
Property `perfected` on in-sample fit yet it has **no forward skill**, because the 3
kept drivers (FX, lending rate, GDP) are *coincident* with developer equities and
**mean-revert**. The fix is to wire the **rate→loan→sales→price chain**, which has
long, mechanical, exploitable LEADS, and to demote the coincident macro to attribution.

---

## 2. Economic structure — how IDX developers make money

The IDX property basket is **two businesses bolted together**, and the revenue
identity differs for each:

**(A) Development (BSDE, CTRA, SMRA, PANI, CBDK, JRPT, DMAS, BEST) — the cyclical core.**

```
marketing sales (pre-sales, t)  →  recognised revenue (t + 2-3y, on handover / % completion)
        ↑                                   ↑
  affordability + confidence            construction progress (capex, cement, rebar, labour)
```

- **Marketing sales** ("pre-sales") are *bookings* — a buyer signs and pays a down-
  payment, often KPR-financed. This is the **leading** operational metric a sell-side
  analyst tracks quarterly; it is NOT yet revenue.
- **Recognised revenue** lags marketing sales by the **construction period (2-3 years)**
  for landed/high-rise, recognised on handover or percentage-of-completion. So *today's*
  earnings reflect *sales booked 2-3 years ago* — earnings are a **lagging** echo of the
  past demand cycle. This is why developer P&L is a terrible real-time signal and why
  **price (the equity) trades on the leading demand chain (rates → KPR → pre-sales)**,
  not on reported earnings.
- **Land bank** is the balance-sheet engine: developers buy cheap rural land years
  ahead, then monetise it as townships mature. Gross margins are 50-65% on landed
  product because land was booked at historical cost — so the cost stack that matters
  for *margin* is construction (cement/rebar/labour), while *land* drives long-run NAV.

**(B) Recurring income (PWON, MKPI, LPKR malls/offices; DMAS/BEST industrial leases).**

- Rental revenue = occupancy × rent/m² × leasable area. **Annuity-like, rate-sensitive
  (REIT/bond-proxy duration)** — these names re-rate on the **10Y yield** the way a
  REIT does, more than on the pre-sales cycle. Commercial-property price/rent indices
  are the read-through.

**The master demand chain (the spine of this whole plan):**

```
BI 7DRR  ─(1-3m)→  ID 10Y govt yield  ─(2-4m)→  KPR / consumption lending rate
   ─(3-6m)→  mortgage (KPR) loan growth  ─(coincident→+3m)→  developer marketing sales
   ─(6-18m)→  RPPI price momentum  ─(12-30m)→  recognised earnings
```

Each arrow is a **lead** the engine can exploit. A buyer's monthly instalment on a
15-20y KPR is ~80-90% rate-determined; a 100bp KPR-rate move swings affordability by
roughly 8-10% of purchasing power, which is why Indonesian primary-home demand is
violently rate-elastic and why BI rate cuts (and the LTV/down-payment relaxations that
accompany them) are the single biggest property-cycle catalyst.

**Cost stack** (development): **land** (NAV, not P&L), **cement** (~15-20% of build
cost; coal-cost-driven), **rebar/structural steel** (~15-20%), **labour** (CPI-linked),
**financing** (developer leverage — construction loans + bonds; rate-sensitive).
USD/IDR matters via (i) imported finishing materials and (ii) USD-denominated debt on
some balance sheets (LPKR historically), and (iii) as a **risk-off / foreign-flow
proxy** that hits high-beta cyclicals like property first.

---

## 3. DEMAND driver tree

Legend per leaf: **series RIC** · role · **sign** (on excess return vs JCI) · **LEAD
(months)** · mechanism · data quality. Leaves marked **[FORECAST]** are the leading
branches expected to carry forward OOS skill; **[ATTRIB]** are coincident/lagging
(good for explanation, weak for prediction). `n` = n_obs.

```
DEMAND
├── D1  AFFORDABILITY  (the rate→mortgage chain — the forecast engine)
│   ├── D1a  Policy rate            ── id_bi_rate / CEIC455941557 (BI 7DRR)
│   ├── D1b  Govt yield (KPR proxy) ── id_10y  / TVC:ID10Y
│   ├── D1c  KPR / consumption rate ── CEIC14419701 (Lending Rate: Consumption)
│   └── D1d  Mortgage loan GROWTH   ── CEICI481248657 (Bank Loans Growth: Mortgage, HH)
├── D2  CREDIT AVAILABILITY / SYSTEM LIQUIDITY
│   ├── D2a  System bank credit yoy ── id_bank_credit / aIDLONYAR
│   ├── D2b  Broad money M2 yoy     ── id_m2 / aIDM2AR
│   └── D2c  Real-estate industry loan ── CEIC389692017 (Banking: Loans Industrial: Real Estate)
├── D3  INTENT / SENTIMENT  (survey — leads bookings)
│   ├── D3a  Property-purchase allocation ── CEICI447391637 (Excess Income Alloc: Property, 12m)
│   ├── D3b  Savings-allocation share      ── CEICI373675857 (Household Expense Alloc: Savings)
│   └── D3c  Consumer confidence / income  ── id_consumer_confidence / aIDCONIAR
├── D4  REALISED DEMAND  (price + volume — confirmation, lagging)
│   ├── D4a  RPPI 18-city level     ── CEICI500272547 (Residential Property Price Index: 18 Cities)
│   ├── D4b  RPPI 18-city QoQ %      ── CEICI500274037 (RPPI: QoQ: 18 Cities)
│   ├── D4c  RPPI 18-city YoY %      ── CEICI500275587 (RPPI: YoY: 18 Cities)
│   └── D4d  House-price YoY (qtrly) ── CEICI230130402 (House Prices: YoY: Quarterly: Indonesia)
└── D5  INCOME / MACRO BACKDROP
    ├── D5a  Real GDP yoy           ── id_gdp_real_q / aIDGDPAR1
    └── D5b  Per-capita housing exp ── CEICI131138501 (Avg Monthly Exp/capita: Housing)
```

### D1 — Affordability (the rate→mortgage chain) — **PRIMARY FORECAST BRANCH**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D1a BI 7DRR | `id_bi_rate` (deep: `ECONOMICS:IDINTR`; CEIC `CEIC455941557` n132) | macro | **−1** | **3-6m** | cuts → cheaper KPR instalment → affordability → pre-sales. The cycle-leading catalyst. | M, live, low pub-lag. **[FORECAST]** |
| D1b ID 10Y yield | `id_10y` (deep: `TVC:ID10Y`, 798w; CEIC `CEIC284983902` n212) | macro | **−1** | **2-4m** | govt curve = KPR repricing base + REIT-duration discount rate for PWON/MKPI/LPKR. Liquid, daily, **leads** equities. | D, live, real-time. **[FORECAST]** |
| D1c KPR / consumption rate | `CEIC14419701` (Lending Rate: IDR: Consumption) n304 | macro | **−1** | **1-3m** | the *actual* mortgage rate the buyer pays; directly sets instalment. | M, n304, ~1m pub-lag. **[FORECAST]** |
| D1d Mortgage loan growth | `CEICI481248657` (Bank Loans Growth: Mortgage, HH) n168 | demand | **+1** | **coincident→+3m** | KPR disbursement growth = booked primary sales being financed; the cleanest demand quantity. | M, n168, **~2-3m pub-lag**. **[ATTRIB→FORECAST]** re-roled +1. |

**Sub-driver chain (one level up).** D1a's parent is the global rate impulse:
`us_10y` (`TVC:US10Y`, 800w) and `dxy` (note: empty in store, see §5) set the EM-rate
ceiling — BI cannot ease far below the Fed without IDR risk. So `us_10y` is a *leading
parent* of the whole D1 branch (sign **−1**: higher US rates → BI stays tight → KPR
expensive → property weak).

### D2 — Credit availability / liquidity

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D2a System bank credit yoy | `id_bank_credit` / `aIDLONYAR` | demand | +1 | +1-3m | credit cycle = mortgage supply. | M. **[ATTRIB]** |
| D2b M2 yoy | `id_m2` / `aIDM2AR` | demand | +1 | +1-3m | broad liquidity → asset demand. | M. **[ATTRIB]** |
| D2c Real-estate industry loans | `CEIC389692017` (Banking: Industrial: Real Estate) n119 | demand | +1 | coincident | developer working-capital credit (overlaps construction loans). | M, **endogenous level → use Δyoy only**. **[ATTRIB]** |

### D3 — Intent / sentiment (survey — leads bookings)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D3a Property-purchase allocation | `CEICI447391637` (Excess Income Allocation: Property, next 12m) n90 | demand | **+1** | **3-6m** | households *stating* they will allocate spare income to property → pre-sales pipeline. A genuine forward-intent survey — rare and valuable. | M, n90, ~1m lag. **[FORECAST]** |
| D3b Savings-allocation share | `CEICI373675857` (Household Expense Alloc: Savings) n168 | demand | +1 | 3-6m | rising savings share = dry powder + deferred big-ticket; ambiguous (can mean caution). | M, n168. **[FORECAST, weak]** |
| D3c Consumer confidence | `id_consumer_confidence` / `aIDCONIAR` | demand | +1 | 1-3m | big-ticket-purchase willingness. | M. **[ATTRIB]** |

### D4 — Realised demand (price + volume — confirmation, **lagging**)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D4a RPPI 18-city level | `CEICI500272547` (Residential Property Price Index: 18 Cities) n33 | demand | +1 | **−1 to 0 (lags)** | the BI house-price index; confirms cycle but is **quarterly + ~2m pub-lag** → coincident-to-lagging. | **P3M, n33**. **[ATTRIB]** |
| D4b RPPI QoQ % | `CEICI500274037` (RPPI: QoQ: 18 Cities) n16 | demand | +1 | momentum | price momentum (non-overlapping QoQ — see §8 look-ahead note). | P3M, n16 short. **[ATTRIB]** |
| D4c RPPI YoY % | `CEICI500275587` (RPPI: YoY: 18 Cities) n16 | demand | +1 | momentum | annual price trend. | P3M, n16. **[ATTRIB]** |
| D4d House-price YoY qtrly | `CEICI230130402` (House Prices: YoY: Quarterly) n93 | demand | +1 | lags | longer-history price confirmation. | P3M, n93. **[ATTRIB]** |

> **Why D4 is demand-not-supply despite being a price.** RPPI is the *transaction
> price households pay* — it rises with demand, unlike a producer's output price. CEIC
> already tags all RPPI series `demand`. Keep sign **+1** (rising prices → developer
> NAV/margin/sentiment up). But it is **coincident/lagging**, so it is attribution, not
> forecast — do not let it dominate the signal weight (see §8).

### D5 — Income / macro backdrop
| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D5a Real GDP yoy | `id_gdp_real_q` / `aIDGDPAR1` | demand | +1 | coincident | income → affordability backdrop. | P3M. **[ATTRIB]** (currently kept) |
| D5b Per-capita housing exp | `CEICI131138501` (Avg Monthly Exp/capita: Housing) n26 | demand | +1 | annual | structural demand. | P1Y, n26 — too coarse, **low weight**. |

---

## 4. SUPPLY / COST driver tree

Property has no "output price = revenue" leaf the way a commodity producer does (the
RPPI is demand-side). The supply/cost side is the **build-cost stack** plus
**developer-financing/leverage** and **construction activity** (a coincident output
proxy).

```
SUPPLY / COST
├── S1  CONSTRUCTION COST  (margin on the development business)
│   ├── S1a  Cement cost      ── coal API2 ICEEUR:ATR1!  (cement is coal-cost driven)
│   ├── S1b  Structural steel ── HRC NYMEX:HRC1!  (rebar SHFE:RB1! is EMPTY — see §5)
│   ├── S1c  Labour / build CPI ── CEICI521347897 (CPI: Housing, Water, Electricity)
│   └── S1d  Imported finishing ── usdidr FX_IDC:USDIDR (import cost channel)
├── S2  DEVELOPER LEVERAGE / FINANCING  (balance-sheet cost)
│   ├── S2a  Construction loan book ── CEICI225728402 (Property Loan: Construction)
│   ├── S2b  FX construction loans  ── CEICI225733202 (Property Loan: FX: Construction)
│   └── S2c  Financing cost          ── id_10y TVC:ID10Y (developer bond yield)
└── S3  CONSTRUCTION ACTIVITY / OUTPUT  (coincident supply proxy)
    ├── S3a  Cement consumption ── CEICI13536901 (Cement Consumption: Indonesia) n388
    ├── S3b  Cement sales (SIG)  ── CEICI13536401 (Cement Sales: Semen Indonesia Grp) n358
    └── S3c  Mortgage NPL        ── CEICI481248577 (Bank Loans NPL: Mortgage, HH) n180
```

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S1a Cement cost (coal) | `wb_coal_au` → `ICEEUR:ATR1!` (API2) **782w** | cost | **−1** | 1-3m | coal ≈ 30% of cement cash cost; cement ≈ 15-20% of build cost. Higher coal → cement → margin squeeze. Liquid, leads. | W, 782w. **[FORECAST, cost]** |
| S1b Structural steel | `steel_hrc` → `NYMEX:HRC1!` **800w** | cost | **−1** | 1-3m | rebar/structural steel build input. HRC is the populated proxy. | W, 800w. **[FORECAST, cost]** |
| S1c Build / shelter CPI | `CEICI521347897` (CPI: Housing, Water, Electricity, 2022=100) n41; or `id_cpi_yoy` | cost | −1 | coincident | labour + materials inflation. | M, n41. **[ATTRIB]** |
| S1d Imported finishing | `usdidr` → `FX_IDC:USDIDR` **801w** | cost | −1 | 0-2m | weak IDR raises imported tile/fixture/lift cost. (Also a macro/flow leaf — see §5.) | W, 801w. |
| S2a Construction loans | `CEICI225728402` (Property Loan: Construction) n292 | supply | 0 | coincident | developer leverage. **LEVEL is endogenous** (co-moves with the book mechanically) → use **Δyoy**, low weight. | M, n292. **[ATTRIB, endogenous]** |
| S2b FX construction loans | `CEICI225733202` (Property Loan: FX: Construction) n292 | supply | −1 | coincident | USD-debt exposure (FX risk). Δyoy only. | M, n292. **[ATTRIB]** |
| S2c Financing cost | `id_10y` → `TVC:ID10Y` | macro | −1 | 2-4m | developer bond/construction-loan cost. (Shared with D1b.) | D, 798w. **[FORECAST]** |
| S3a Cement consumption | `CEICI13536901` (Cement Consumption: Indonesia) n388 | demand* | +1 | coincident | national build activity = property+infra demand. Long history. *demand-tagged for property even though it sits in Basic Materials. | M, n388. **[ATTRIB]** |
| S3b Cement sales (SIG) | `CEICI13536401` (Cement Sales: Semen Indonesia) n358 | demand* | +1 | coincident | volume read-through. | M, n358. **[ATTRIB]** |
| S3c Mortgage NPL | `CEICI481248577` (Bank Loans NPL: Mortgage, HH) n180 | cost | **−1** | leads stress | rising mortgage NPL → tighter LTV/credit → demand brake + developer-receivable risk. A genuine **leading risk** leaf. | M, n180. **[FORECAST, risk]** |

---

## 5. MACRO / RATE / FX / FLOW

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| Rate curve — BI 7DRR | `id_bi_rate` (`ECONOMICS:IDINTR`) | macro | **−1** | 3-6m | property-cycle catalyst (D1a). | live. **[FORECAST]** |
| Rate curve — ID 10Y | `id_10y` (`TVC:ID10Y`, 798w) | macro | **−1** | 2-4m | KPR base + REIT duration (D1b/S2c). | live. **[FORECAST]** |
| Rate curve — ID 1Y | `id_01y` (`TVC:ID01Y`, 793w) | macro | −1 | 1-3m | short-end financing / curve level. | live. |
| Global rate parent — US 10Y | `us_10y` (`TVC:US10Y`, 800w) | macro | **−1** | 2-4m | sets EM-rate ceiling → BI policy room → KPR; also EM-flow discount rate. | live. **[FORECAST]** |
| FX / flow — USD/IDR | `usdidr` (`FX_IDC:USDIDR`, 801w) | macro | **−1** | 0-2m | IDR weakness = risk-off, foreign-outflow proxy that hits high-beta property first; + imported-input cost. (currently kept) | live. **[FORECAST, flow]** |
| Foreign-flow proxy — DXY | `dxy` (`TVC:BBDXY`) | macro | −1 | 0-2m | broad-USD EM headwind. **DATA GAP: `TVC:BBDXY` has weekly_obs=0 (empty in store).** Use USD/IDR as the live flow proxy instead. | **MISSING → do not wire.** |

**Flow note.** Property is a **high-beta domestic cyclical** with meaningful foreign
free-float (BSDE, CTRA, SMRA, PWON). It leads the market into risk-off and lags it out.
The cleanest available flow signal is **USD/IDR** (801w, sign −1) since DXY is empty.
The bond yield (`id_10y`) doubles as a flow proxy: foreign selling of IDR bonds spikes
the 10Y and crushes property simultaneously.

---

## 6. Cross-industry linkages

Property's cost stack is **another sector's output** — pull those as inputs:

| input | source sector / block | series | role | sign | note |
|---|---|---|---|---|---|
| Cement cost | Energy → coal (API2 sets cement cash cost) | `ICEEUR:ATR1!` (782w) | cost | −1 | best available cement-cost proxy (no cement *price* future exists). |
| Cement volume | Basic Materials → Cement | `CEICI13536901` (Consumption) n388, `CEICI13536401` (SIG sales) n358 | demand | +1 | shared driver with the **Cement** basket (#28) and **Construction** (#29) — property+infra demand read-through. |
| Structural steel | Basic Materials → Metals (steel) | `NYMEX:HRC1!` (800w) | cost | −1 | shared with **Metals** (#35), **Construction**, **Auto**. Rebar (`SHFE:RB1!`) is the *ideal* proxy but EMPTY. |
| (would-be) Iron ore | Basic Materials | `SGX:FEF1!` | — | — | **EMPTY (weekly_obs=0)** — cannot wire. |

> The Property↔Cement↔Construction triangle shares the coal-cost and cement-volume
> leaves. Property is the *demand* node; Cement is the *supply* node of the same chain.

---

## 7. Currently wired vs available — the "what we COULD add"

**Wired today (`SEED["Property"]`):** `ceic: []` (nothing), `globals`: steel_hrc(−1),
wb_coal_au(−1); `macro`: id_bi_rate(−1), id_lending_rate(−1, **deep source None →
falls back to spark, low-confidence**), id_bank_credit(+1), id_gdp_real_q(+1),
usdidr(−1). **Survivors: 3** (usdidr, a lending/BI rate, GDP).

| priority | ADD | RIC | role/sign | why it beats the current set |
|---|---|---|---|---|
| **P0** | Wire the CEIC Property block | `ceic:[("Property & Real Estate", …)]` | demand | the entire 123-series block is currently unused. |
| **P0** | Mortgage loan growth | `CEICI481248657` | demand **+1** | the cleanest demand quantity; re-role to lead. |
| **P0** | ID 10Y yield | `id_10y` / `TVC:ID10Y` | macro **−1** | **the** liquid leading rate; replaces dead `id_lending_rate`. |
| **P0** | KPR/consumption rate | `CEIC14419701` | macro **−1** | the actual mortgage rate (n304), real source. |
| **P1** | RPPI 18-city (level/QoQ/YoY) | `CEICI500272547` / `...274037` / `...275587` | demand +1 | price confirmation (attribution, capped weight). |
| **P1** | Property-purchase intent | `CEICI447391637` | demand **+1** | forward survey of buying intent — rare leading signal. |
| **P1** | Construction loans (Δyoy) | `CEICI225728402` | supply 0 | developer leverage; exclude raw LEVEL. |
| **P1** | Mortgage NPL | `CEICI481248577` | cost **−1** | leading credit-stress brake. |
| **P2** | System credit / M2 | `id_bank_credit`, `id_m2` | demand +1 | liquidity backdrop (keep credit, add M2). |
| **P2** | Cement consumption/sales | `CEICI13536901`, `CEICI13536401` | demand +1 | cross-industry activity proxy. |
| **P2** | US 10Y (rate parent) | `us_10y` / `TVC:US10Y` | macro −1 | global leading parent of the rate chain. |
| **drop** | `id_lending_rate` (as wired) | deep source `None` | — | resolves to spark only → replace with `CEIC14419701` + `id_10y`. |

---

## 8. Forecastability — why it fails now, and the fix

**Why the current set scores IC −0.08 (anti-predictive).** The 3 survivors —
USD/IDR, a policy/lending rate, GDP — are all **coincident** with property equities
and **mean-revert** at the monthly horizon. When IDR weakens and rates rise, property
sells off *the same month*; the move is already in the price, so a posture built on the
*level/contemporaneous change* of those series predicts next month's return with the
**wrong sign on average** (the bounce). Property is exactly the "co-moves
contemporaneously but mean-reverts" pattern the backtest flags for Banks/Securities/
Auto. With **no leading branch wired**, the engine has nothing that fires *before* the
equities move.

**The exploitable leads (the fix).** The rate→loan→sales→price chain is a sequence of
**mechanical, slow-moving lags** — this is the rare property of this sector:

```
ΔBI 7DRR ─3-6m→ Δmortgage growth ─0-3m→ Δpre-sales ─6-18m→ ΔRPPI ─12-30m→ Δearnings
```

- **Rates lead loan growth ~3-6m**: a KPR-rate cut takes a quarter or two to show up
  in disbursement growth (application → approval → drawdown pipeline).
- **Loan growth leads/coincides with marketing sales**: KPR is how primary homes are
  paid for, so disbursement growth ≈ booked sales being financed.
- **Sales lead recognised earnings ~2y**: the construction-recognition lag (§2).

**Which branch should carry forward OOS skill:** the **D1 affordability chain led by
`id_10y` (daily, 798w) and BI 7DRR**, plus the **cost leads** `wb_coal_au`/`steel_hrc`
(weekly, exogenous prices). These are *liquid, exogenous, real-time* — the backtest's
rule of thumb (liquid price/rate series LEAD; slow CEIC quantities lag). The hypothesis:
a posture that is **long property when the 10Y is FALLING and KPR growth is
ACCELERATING, short when rates rise**, should flip Property's forward IC positive,
because it trades the *cause* (rates, a quarter early) not the *coincident symptom*
(this month's FX/GDP print).

**Look-ahead / leakage guards (must hold or the OOS is fake):**
- RPPI is **P3M with ~2m publication lag** → at month *t* only the print released by
  *t* is usable; the engine's CEIC pub-lag handling must apply. RPPI is **attribution,
  capped weight** — never let a lagging quarterly price dominate.
- Mortgage-growth `CEICI481248657` has **~2-3m pub-lag**; it is a `growth` series
  already (no need to difference a level) but must be lagged.
- Construction-loan/real-estate-loan **LEVELS are endogenous** (mechanically trend with
  the book) → exclude raw levels, use yoy/Δ only, low weight.
- RPPI QoQ/YoY momentum: use **non-overlapping** diffs (the macro-sentiment round-1
  critique) — overlapping QoQ windows inflate IC spuriously.

**What would move it from explainer to forecaster:** down-weight the coincident macro
(USD/IDR, GDP → attribution), up-weight the **leading rate chain** (10Y, BI, KPR rate)
and the **forward-intent survey** (`CEICI447391637`), and keep RPPI/loan quantities as
confirming attribution only. Re-run `backtest/bt.py "Property"` and keep the change
**only if forward IC rises** — never add a driver that only helps in-sample (Property
is the canary: it is `perfected` in-sample yet ✗ OOS).

---

## 9. Engine-wiring spec (`mapping.py`)

Replace the `SECTOR_CEIC["Properties & Real Estate"] = []` fallback dependency and the
thin `SEED["Property"]` with the tree below. Concrete, drop-in:

```python
"Property": {
    # P0: wire the 123-series Property & Real Estate block (currently empty)
    "ceic": [("Property & Real Estate", None)],

    # Re-role the price/quantity leaves the engine would otherwise mis-sign.
    # CEIC tags RPPI/mortgage as 'demand' already; we keep +1 but flag the
    # mortgage-GROWTH series as the lead and the price index as attribution.
    "ceic_override": [
        ("bank loans growth: mortgage", "demand", +1),   # CEICI481248657 — lead demand
        ("residential property price index", "demand", +1),  # RPPI level/QoQ/YoY — attribution
        ("house prices: yoy", "demand", +1),             # CEICI230130402
        ("excess income allocation", "demand", +1),      # CEICI447391637 — forward intent
        ("bank loans npl: mortgage", "cost", -1),        # CEICI481248577 — credit-stress brake
        ("cement consumption", "demand", +1),            # cross-industry activity (if pulled)
    ],

    # Drop ENDOGENOUS / leaky series: single-bank syariah book, raw loan LEVELS
    # (construction-loan and real-estate-loan IDR-bn levels mechanically trend),
    # CPI-WEIGHT housekeeping series, and pure trade/BoP noise in the block.
    "ceic_exclude": [
        "pt bank syariah",            # single-bank, endogenous (CEICI462208767 etc.)
        "cpi: 2022=100: weights",     # CPI weight housekeeping, not a driver
        "weights: housing",
        "bop: imf bpm6",              # services-charges BoP noise
        "charges for the use",
        "intellectual pr",            # GFCF intellectual-property GDP detail (mislabeled)
        "google search trends",       # CEICI495617867 daily score — noisy, optional
        # NOTE: keep construction-loan series but the engine must use Δyoy not level
        #       (handled by the level-endogeneity guard, not excluded here).
    ],

    "globals": [
        ("steel_hrc", "cost", -1, "rebar/structural steel build input (HRC proxy; SHFE rebar empty)"),
        ("wb_coal_au", "cost", -1, "coal sets cement cash cost (~30%); cement ~15-20% of build"),
        # iron_ore / dxy intentionally NOT wired — empty in store (weekly_obs=0).
    ],

    "macro": [
        # ---- LEADING rate chain (the forecast engine) ----
        ("id_10y",  "macro", -1, "10Y govt yield: KPR repricing base + REIT duration; LIQUID LEAD"),
        ("us_10y",  "macro", -1, "global rate parent: caps BI room -> KPR; EM-flow discount rate"),
        ("id_bi_rate", "macro", -1, "BI 7DRR: property-cycle catalyst, leads pre-sales 3-6m"),
        # ---- credit / liquidity backdrop ----
        ("id_bank_credit", "demand", +1, "system credit = mortgage supply"),
        ("id_m2", "demand", +1, "broad liquidity -> asset demand"),
        ("id_consumer_confidence", "demand", +1, "big-ticket purchase willingness"),
        # ---- coincident attribution (DEMOTE: keep but these do not forecast) ----
        ("id_gdp_real_q", "demand", +1, "income backdrop (attribution, coincident)"),
        ("usdidr", "macro", -1, "risk-off/foreign-flow proxy + imported-input cost"),
        # ---- drop id_lending_rate as wired (deep source None -> spark only) ----
    ],
},
```

**New market resolver needed?** No new resolver — every market id is already in
`GLOBAL_CORR` (`id_10y→TVC:ID10Y`, `us_10y→TVC:US10Y`, `usdidr→FX_IDC:USDIDR`,
`steel_hrc→NYMEX:HRC1!`, `wb_coal_au→ICEEUR:ATR1!`). **One real-source addition worth
making:** map `id_lending_rate` (currently `None`) to the CEIC consumption-lending-rate
RIC `CEIC14419701` (Lending Rate: IDR: Consumption, n304) so the KPR-rate leaf has a
deep history instead of falling back to the live spark. If a CEIC-RIC resolver path
exists for macro keys, add:
```python
    "id_lending_rate": "CEIC14419701",   # KPR proxy: Lending Rate: IDR: Consumption (n304)
```
Otherwise pull `CEIC14419701` via the CEIC banking-block path and override it
`("lending rate: idr: consumption", "macro", -1)`.

**Data-quality flags to surface in the panel:** RPPI/commercial-property are
**quarterly + ~2m pub-lag** (attribution only); mortgage-growth/NPL are **~2-3m
pub-lag**; `SHFE:RB1!`, `SGX:FEF1!`, `TVC:BBDXY` are **empty** and must not be wired;
the leading, forecast-bearing leaves are the **daily/weekly rate + cost prices**
(`id_10y`, `us_10y`, `wb_coal_au`, `steel_hrc`) plus BI 7DRR and the property-intent
survey.

---

### Verification checklist before commit
- [ ] `build_worklist.py` → `controller.py --only Property` runs clean with the new block.
- [ ] Endogenous LEVELS (construction-loan, real-estate-loan IDR-bn) excluded or Δ-only.
- [ ] RPPI weight capped (lagging quarterly price must not dominate).
- [ ] `backtest/bt.py "Property"` re-run; **keep only if forward IC > −0.08 and ideally > 0**.
- [ ] No look-ahead: all CEIC leaves publication-lagged; momentum diffs non-overlapping.
