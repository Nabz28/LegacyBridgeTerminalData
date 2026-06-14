# Leisure (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the LBC Industry Driver Engine. Follows the §4 template in
> `plan/IMPROVEMENT_PLAN.md`. Every series cited is confirmed in
> `plan/catalog/{idind,id,market}.json` with its real RIC and n_obs. This is a
> reference doc a quant implements `mapping.py` from — not prose for its own sake.

---

## 1. Snapshot

| | |
|---|---|
| **Sub-industry** | Leisure (Consumer Cyclicals), basket id `consumer_cyclicals_leisure` |
| **mcap** | ~52T IDR (#27 of 52) |
| **Members (22)** | **BUVA** (Bukit Uluwatu Villa — luxury resorts/hotels, 17.7T, the dominant name), **KPIG** (MNC Land — Bali Nirwana/Lido integrated resort + golf, 9.0T), **CNMA** (Nusantara Sejahtera/Cinema XXI — cinema operator, 7.8T), **GOLF** (Bumi Resources Minerals-adjacent golf/Pakuwon-linked recreation, 3.3T), **JSPT** (Jakarta Setiabudi Internasional — hotels/property, 2.8T), **BLTZ** (Graha Layar Prima / CGV cinemas, 2.3T), **PSKT** (Red Planet Indonesia — budget hotels, 2.1T), **JIHD** (Jakarta International Hotels & Dev — Hotel Borobudur, 1.0T), **SHID** (Hotel Sahid Jaya, 0.82T), **PJAA** (Pembangunan Jaya Ancol — theme-park/recreation, 0.76T), **PANR** (Panorama Sentrawisata — travel agency/MICE, 0.69T), **FITT** (Hotel Fitra, 0.45T), **PNSE** (Pudjiadi & Sons / Jayakarta hotels, 0.42T), **INPS**, **BAYU** (Bayu Buana — travel agent/ticketing, 0.41T), **PDES** (Destinasi Tirta Nusantara — tour operator, 0.36T), **EAST** (Eastparc Hotel, 0.36T), **HAJJ** (Jaya Trishindo / hajj-umrah travel, 0.30T), **DFAM** (Dafam Property hotels, 0.27T), **HRME** (Menteng Heritage / Artotel hotels, 0.23T), **PGLI** (Pembangunan Graha Lestari, 0.09T), **MABA** (Marga Abhinaya / hotels, mcap ~0). |
| **Current grade** | `needs_review` · confidence **low** |
| **Current kept drivers** | **1 survives** (n_drivers_kept=1 in `_state.txt`). Seed wires `ceic:[("Tourism", None)]` + 2 macro (GDP +1, USD/IDR +1). The whole 122-series Tourism block is *nominally* attached but only one leaf survives the gates — the basket is effectively running on a single driver. |
| **Current forward OOS** | in-sample IC **+0.09**, **OOS IC −0.10**, hit-rate 0.85, placebo pctile in the *marginal* band (`BACKTEST.md`: `+0.09 / −0.10 / 0.85 / marginal`). **Anti-predictive out-of-sample** — the posture mean-reverts, same failure mode as Property/Banks. |

**The gap.** Leisure is one of the few baskets where the matching CEIC block is
*genuinely rich and genuinely demand-side*: a 122-series **Tourism** block with a
**national visitor-arrivals series back to 1979 (n568)**, **arrivals split by 20+
source countries monthly (n400 each)**, **air-passenger traffic (international +
domestic, n401)**, **Bali hotel room-occupancy (% , n440)**, and **quarterly tourism
FX receipts (n181)**. Unlike Property (whose block is price/loan quantities), these are
**real physical demand-volume series for exactly what the basket sells** (hotel nights,
park tickets, tour packages, cinema seats). Yet OOS is −0.10. The problem is **not
missing data — it is structure**: (i) the block is attached flat (`None` subcat) so
the engine drowns the 3-4 high-value arrivals/occupancy leaves in ~100 trade-value and
length-of-stay micro-series; (ii) every CEIC leaf here is a **publication-lagged,
coincident-to-lagging quantity** (good attribution, weak forecast) and nothing
**leading** is wired; (iii) the basket is **two businesses** (inbound-FX tourism vs
domestic-IDR recreation/cinema) whose drivers point opposite ways on USD/IDR, so a
single blended sign cancels. The fix: **curate** the arrivals/occupancy/air leaves as
the demand spine (attribution), and add the **leading exogenous prices** — source-
country **FX cross-rates** (SGD/AUD/JPY/IDR), **DXY**, **Brent (jet-fuel cost)**, and
the **rate/affordability chain** for the domestic-discretionary sleeve — as the
forecast branches.

---

## 2. Economic structure — how the basket makes money

The revenue identity for the basket as a whole:

```
revenue = visitor VOLUME × spend-per-visitor (price)  −  cost stack
```

But "visitor" means three different customers across the basket, and this dispersion is
the single most important fact for wiring it:

**(A) Inbound-FX tourism (BUVA, KPIG, JIHD, SHID, EAST, PSKT, HRME, DFAM, hotels).**
Luxury/business resorts and hotels whose guests are disproportionately **foreign
arrivals**. Revenue = **room nights sold (occupancy × room count) × ADR**, where ADR
(average daily rate) is frequently USD-referenced or USD-elastic for the luxury Bali
sleeve. A **weak IDR is a TAILWIND**: it makes Indonesia cheaper for foreigners
(inbound competitiveness) AND, for USD-priced rooms, lifts IDR-translated revenue. This
is the **dominant mcap weight** (BUVA alone is 34% of the basket; BUVA+KPIG+JIHD+SHID+
JSPT ≈ 60%).

**(B) Domestic recreation / leisure (PJAA Ancol theme park, CNMA + BLTZ cinemas, GOLF).**
Revenue = **footfall × ticket price**, paid in IDR by domestic households. The driver is
**domestic discretionary income, consumer confidence, and the holiday/long-weekend
calendar** — NOT FX. Here a weak IDR is **neutral-to-negative** (squeezes real income).
PJAA and the cinema names are pure-domestic; their USD/IDR sign is the OPPOSITE of the
hotel sleeve. CNMA's beta is near zero (0.07) — it behaves like a domestic-staple.

**(C) Travel intermediaries (PANR, BAYU, PDES, HAJJ).**
Travel agents, tour operators, MICE, hajj/umrah. Revenue = **bookings volume ×
commission/margin**. Outbound travel (Indonesians abroad) is **hurt** by a weak IDR;
hajj/umrah (HAJJ) is driven by the **SAR/IDR cost of the pilgrimage + quota**. Small
mcap, but their FX sign is again mixed vs the hotel sleeve.

**What a sell-side analyst watches.** For the hotel sleeve: **foreign visitor arrivals
(total + Bali + by-source-country), hotel occupancy rate, ADR, RevPAR, USD/IDR**. For
recreation: **footfall / ticket volume, domestic air-passenger traffic, consumer
confidence, the long-weekend calendar, Lebaran/school-holiday seasonality**. For
intermediaries: **booking volumes, outbound departures, jet-fuel-driven airfares**.

**Cost stack.** Hotels: labour (CPI-linked, ~30-40% of opex), **energy/utilities**
(electricity tariff + fuel), F&B inputs, **financing** (these are capital-heavy,
leveraged property-like balance sheets → rate-sensitive). Theme parks/cinemas: content/
film-rental cost (CNMA/BLTZ pay distributors), maintenance capex, labour. Travel agents:
**airfare pass-through (jet fuel ≈ Brent)** is the dominant variable cost of the product
they resell. The **margin swing factor** for the whole basket is **occupancy/load-factor
(operating leverage on a fixed cost base)** — a hotel or park at 75% vs 55% occupancy is
the difference between fat margin and loss, because the cost base barely moves.

**Intra-basket dispersion (why a single sign cancels).** Betas span **−0.80 (JIHD) to
+2.65 (FITT)**; JSPT, PSKT, JIHD, PDES, SHID are NEGATIVE-beta (defensive/illiquid,
trade against the market). The basket is **not cohesive** — it mixes a foreign-FX hotel
core, a domestic-IDR recreation sleeve, and tiny illiquid hotels. This is a structural
reason for the weak, mean-reverting OOS: the FX sign that helps the hotel core *hurts*
the domestic sleeve, and the cap-weighted blend partially cancels. **The wiring must
lean to the cap-dominant inbound-FX hotel interpretation** (weak IDR = +) and treat the
domestic/discretionary leaves as a secondary, oppositely-signed overlay.

---

## 3. DEMAND driver tree

Legend per leaf: **series RIC** · role · **sign** (on excess return vs JCI) · **LEAD
(months)** · mechanism · data quality. Leaves marked **[FORECAST]** are leading branches
expected to carry forward OOS skill; **[ATTRIB]** are coincident/lagging (good for
explanation, weak for prediction). `n` = n_obs.

```
DEMAND
├── D1  INBOUND TOURISM VOLUME  (the cap-dominant hotel sleeve — attribution spine)
│   ├── D1a  Total visitor arrivals      ── CEICI195568102 (Visitors Arrivals: Total)
│   ├── D1b  Arrivals by source: China   ── CEICI14537201 (By residence: China)
│   ├── D1c  Arrivals by source: S'pore   ── CEICI14536001 (By residence: Singapore)
│   ├── D1d  Arrivals by source: Australia ── CEICI14539901 (By residence: Australia)
│   ├── D1e  Arrivals by source: Malaysia ── CEICI14535801 (By residence: Malaysia)
│   └── D1f  Air gate arrivals            ── CEICI400987267 (Main Gate: Air Gate)
├── D2  INBOUND COMPETITIVENESS  (the FX LEAD on arrivals — forecast branch)
│   ├── D2a  USD/IDR                      ── usdidr / FX_IDC:USDIDR
│   ├── D2b  SGD/IDR                      ── FX_IDC:SGDIDR  (Singapore source)
│   ├── D2c  AUD/IDR                      ── FX_IDC:AUDIDR  (Australia source)
│   ├── D2d  JPY/IDR                      ── FX_IDC:JPYIDR  (Japan source)
│   └── D2e  REER (BIS, broad)            ── aIDBISRXBR (Real Effective Exch Rate)
├── D3  HOTEL UTILISATION  (occupancy = the margin swing factor)
│   └── D3a  Bali hotel room occupancy    ── CEICI14533701 (Room Occupancy: Bali)
├── D4  AIR / MOBILITY  (travel-volume proxy for both sleeves)
│   ├── D4a  Intl air pax (arr+dep)       ── CEICI14579401 (Intl: Arrival and Departure)
│   ├── D4b  Domestic air pax (arr+dep)   ── CEICI14579501 (Domestic: Arrival and Departure)
│   └── D4c  Intl arrivals at Ngurah Rai  ── (Air Passenger Traffic: Bali gate, n395)
├── D5  DOMESTIC DISCRETIONARY  (the recreation/cinema sleeve — opposite FX sign)
│   ├── D5a  Consumer confidence          ── id_consumer_confidence / aIDCONIAR
│   ├── D5b  Durable-goods buying cond.   ── CEIC277372902 (CCI: Durable Goods)
│   ├── D5c  Real GDP yoy                 ── id_gdp_real_q / aIDGDPAR1
│   └── D5d  Domestic railway pax (Java)  ── CEICI421786447 (Railway: Java, n244)
└── D6  TOURISM SPEND  (price × volume confirmation — lagging)
    └── D6a  Tourism FX receipts (Travel) ── CEICI338574801 (BoP Travel: Credit)
```

### D1 — Inbound tourism volume — **ATTRIBUTION SPINE (cap-dominant hotel sleeve)**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D1a Total visitor arrivals | `CEICI195568102` (Visitors Arrivals: Total) **n568** | demand | **+1** | **coincident → +1m** | the cleanest single demand quantity for the hotel core; monthly, back to 1979. Hotels fill as arrivals rise. | M, n568, **~1.5-2m pub-lag**, last 2026-04. **[ATTRIB]** |
| D1b Arrivals: China | `CEICI14537201` (By residence: China) **n400** | demand | **+1** | coincident | China is the swing source (collapsed post-COVID, recovering); a real demand series for the China-exposed Bali resorts. | M, n400. **[ATTRIB]** |
| D1c Arrivals: Singapore | `CEICI14536001` (By residence: Singapore) **n400** | demand | **+1** | coincident | high-frequency short-haul source (Batam/Bintan/Bali); responsive to SGD/IDR (D2b). | M, n400. **[ATTRIB]** |
| D1d Arrivals: Australia | `CEICI14539901` (By residence: Australia) **n400** | demand | **+1** | coincident | the Bali mainstay; AUD/IDR-elastic (D2c). | M, n400. **[ATTRIB]** |
| D1e Arrivals: Malaysia | `CEICI14535801` (By residence: Malaysia) n400 | demand | +1 | coincident | largest ASEAN land/air source. | M, n400. **[ATTRIB]** |
| D1f Air-gate arrivals | `CEICI400987267` (Main Gate: Air Gate) n112 | demand | +1 | coincident | air-arriving foreigners (higher-spend than land/sea); shorter history. | M, n112. **[ATTRIB]** |

> **Why these are attribution, not forecast.** Arrivals are a **publication-lagged BPS
> count** — by the time the engine sees month *t* arrivals, the hotel equities have
> already moved on the bookings that produced them. They are the *symptom* the basket
> trades on, observed *after* the price. Keep them (they explain and anchor the
> demand-side sign), but **do not let them dominate the signal weight** — the forecast
> must come from the **leading FX prices in D2** that move arrivals *before* they print.
> **Use yoy / non-overlapping momentum, not raw level** (raw arrivals level is
> non-stationary and seasonal — see §8).

### D2 — Inbound competitiveness (the FX LEAD on arrivals) — **PRIMARY FORECAST BRANCH**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D2a USD/IDR | `usdidr` → `FX_IDC:USDIDR` **801w** | macro | **+1** | **0-3m** | weak IDR = Indonesia cheaper for foreigners (inbound +) AND lifts IDR value of USD-priced luxury ADR. The cap-dominant hotel sleeve's tailwind. Liquid, daily, **leads** the slow arrivals print. | W/D, 801w. **[FORECAST, flow]** |
| D2b SGD/IDR | `FX_IDC:SGDIDR` **794w** | macro | **+1** | **1-4m** | Singapore is a top-3 source; a weak IDR vs SGD directly raises Singaporean purchasing power for Bali/Batam trips → arrivals D1c a quarter later. A genuine **source-specific competitiveness lead** — rare and exploitable. | W, 794w. **[FORECAST]** |
| D2c AUD/IDR | `FX_IDC:AUDIDR` **800w** | macro | **+1** | **1-4m** | Australians are the Bali mainstay; AUD/IDR is *the* Bali-demand FX. Strong AUD vs IDR → cheaper Bali holiday → arrivals D1d. | W, 800w. **[FORECAST]** |
| D2d JPY/IDR | `FX_IDC:JPYIDR` **800w** | macro | **+1** | **1-4m** | Japan source-country competitiveness. | W, 800w. **[FORECAST]** |
| D2e REER (BIS broad) | `aIDBISRXBR` (Real Effective Exch Rate, BIS, 2020=100) **n388** | macro | **−1** | **1-3m** | the *trade-weighted real* competitiveness measure: a RISING REER = IDR appreciating in real terms = Indonesia getting *more expensive* for foreigners → inbound headwind. Sign **−1** (opposite to a nominal weak-IDR leaf because higher REER = stronger currency). | M, n388. **[FORECAST]** |

**Sub-driver chain (one level up on D2).** The parent of the whole IDR-competitiveness
branch is the **broad dollar / EM-risk regime**: `dxy` (`TVC:DXY`, 800w — note: NOT the
empty `TVC:BBDXY`) and `us_10y` (`TVC:US10Y`). A strong-dollar / high-US-rate regime
(i) weakens IDR (helps inbound competitiveness, the D2 mechanism) but (ii) is a
broad **EM-equity risk-off** that hits high-beta cyclicals like the leisure basket. The
two effects partly offset, which is *itself* a reason the basket's USD/IDR response is
noisy — and a reason to lean on the **source-country crosses (SGD/AUD/JPY)** which
isolate the competitiveness channel cleanly, away from the broad risk-off.

### D3 — Hotel utilisation (occupancy = the margin swing factor)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D3a Bali hotel room occupancy | `CEICI14533701` (Room Occupancy Rate: Classified Hotel: Bali, %) **n440** | demand | **+1** | **coincident → +1m** | occupancy is the operating-leverage swing factor — the single metric most correlated with hotel-sleeve earnings. Bali is the basket's most exposed market (BUVA/KPIG). **Currently UNWIRED — not in `ceic_candidates`, only surfaced by direct catalog grep.** A %-ratio (already stationary), monthly to 2026-04. | M, n440. **[ATTRIB, high-value]** |

> **Why occupancy is in the candidate gap.** `worklist.json ceic_candidates` for this
> basket surfaced only obscure Hotels leaves (length-of-stay, n16). The high-value
> **Bali room-occupancy %** (`CEICI14533701`, n440) sits in the Tourism→Hotels subcat in
> the catalog and is reachable by wiring `ceic:[("Tourism","Hotels")]` explicitly — it
> is the most important hotel-demand leaf and **must be force-included** (see §9).

### D4 — Air / mobility (travel-volume proxy for both sleeves)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D4a Intl air pax (arr+dep) | `CEICI14579401` (Intl: Arrival and Departure) **n401** | demand | **+1** | coincident | total international mobility through Indonesian airports — inbound + outbound. Confirms the arrivals signal. | M, n401, ~2m lag. **[ATTRIB]** |
| D4b Domestic air pax (arr+dep) | `CEICI14579501` (Domestic: Arrival and Departure) **n401** | demand | **+1** | coincident | domestic travel volume — the recreation/cinema/domestic-hotel sleeve's mobility proxy; captures the Lebaran/holiday travel surge. | M, n401. **[ATTRIB]** |
| D4c Bali-gate intl arrivals | Ngurah Rai intl arrival (Air Pax Traffic, Bali) n395 | demand | +1 | coincident | the cleanest Bali-specific foreign-arrival read for BUVA/KPIG. | M, n395. **[ATTRIB]** |

### D5 — Domestic discretionary (recreation/cinema sleeve — **OPPOSITE FX sign**)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D5a Consumer confidence | `id_consumer_confidence` → `aIDCONIAR` | demand | **+1** | **1-3m** | discretionary leisure (theme-park tickets, cinema, weekend hotels) is confidence-elastic; CCI **leads** footfall. | M, live. **[FORECAST, weak]** |
| D5b Durable-goods buying condition | `CEIC277372902` (CCI: Present Situation: Buying Condition for Durable Goods) **n196** | demand | +1 | 1-3m | big-ticket/discretionary willingness — a proxy for "will households spend on a leisure trip". | M, n196. **[ATTRIB→FORECAST]** |
| D5c Real GDP yoy | `id_gdp_real_q` → `aIDGDPAR1` | demand | +1 | coincident | income backdrop for domestic leisure (currently the kept driver). | P3M. **[ATTRIB]** (currently kept) |
| D5d Domestic railway pax (Java) | `CEICI421786447` (Railway: Java) **n244** | demand | +1 | coincident | domestic-mobility / holiday-travel proxy on the densest corridor; long history. | M, n244. **[ATTRIB]** |

> **The sign conflict (critical).** D5 is the **domestic IDR** sleeve. For these names a
> **weak IDR is neutral-to-negative** (real-income squeeze) — the OPPOSITE of D2's
> inbound tailwind. Because the basket is cap-dominated by inbound hotels (BUVA+KPIG ≈
> 51%), wire the **net USD/IDR sign as +1** (inbound wins) but keep D5 as a separate
> demand branch with its own confidence/income leaves so the engine can attribute the
> domestic sleeve without forcing the FX sign on it.

### D6 — Tourism spend (price × volume confirmation — lagging)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D6a Tourism FX receipts | `CEICI338574801` (BoP Current Account: Services: Travel: Credit, USD mn) **n181** | demand | +1 | **−1 to 0 (lags)** | total inbound tourism *spend* (volume × spend-per-head) — the revenue-pool confirmation. **Quarterly + BoP pub-lag** → coincident-to-lagging; attribution only. | **P3M, n181**, ~2-3m lag. **[ATTRIB]** |

---

## 4. SUPPLY / COST driver tree

The basket has **no commodity "output price = revenue" leaf** (a hotel's "price" is ADR,
which is demand-driven, captured via occupancy/arrivals/FX above). The supply/cost side
is **the operating-cost stack** plus **capacity** plus **financing**.

```
SUPPLY / COST
├── S1  ENERGY / UTILITIES COST  (hotels + parks are energy-intensive)
│   ├── S1a  Crude oil (Brent)        ── brent / ICEEUR:BRN1!  (fuel + jet-fuel proxy)
│   └── S1b  Electricity tariff        ── (CEIC Energy: Electricity tariff: Business, dem)
├── S2  AIRFARE / ACCESS COST  (jet fuel sets the price of GETTING to the destination)
│   └── S2a  Brent / jet-fuel proxy    ── brent / ICEEUR:BRN1!  (airfare pass-through)
├── S3  FOOD & BEVERAGE INPUT  (hotel/park F&B margin)
│   ├── S3a  Palm/cooking oil          ── wb_palm_oil / MYX:FCPO1!
│   └── S3b  Food CPI                  ── id_cpi_yoy / ECONOMICS:IDIRYY
└── S4  CAPACITY / OUTPUT  (coincident supply proxy)
    └── S4a  Foreign-guest length of stay ── (Tourism: Hotels: avg length of stay, n16)
```

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S1a/S2a Brent (energy + airfare) | `brent` → `ICEEUR:BRN1!` (~800w) | cost | **−1** | **1-3m** | **dual cost channel**: (i) hotel/park utilities & generator fuel; (ii) **jet fuel ≈ Brent** → higher airfares → fewer/cheaper trips → demand brake on arrivals AND on the travel-agent sleeve (PANR/BAYU resell airfare). Liquid, exogenous, **leads**. | W, 800w. **[FORECAST, cost]** |
| S1b Electricity tariff (business) | CEIC Energy→Electricity, business tariff (IDR/kWh, dem-tagged, n138) | cost | −1 | coincident | regulated power cost; a step-change cost for energy-heavy hotels/parks. | M. **[ATTRIB, cost]** |
| S3a Palm / cooking oil | `wb_palm_oil` → `MYX:FCPO1!` | cost | −1 | 1-3m | hotel/park F&B input (cooking oil); minor weight. | W. **[FORECAST, weak cost]** |
| S3b Food CPI | `id_cpi_yoy` → `ECONOMICS:IDIRYY` | cost | −1 | coincident | F&B input inflation + (channel B) real-income squeeze on domestic discretionary spend. **Dual-signed**: cost for hotels, demand-drag for the domestic sleeve. | M, live. **[ATTRIB]** |
| S4a Foreign-guest length of stay | Tourism→Hotels avg length of stay (n16) | demand | +1 | coincident | longer stays = more room-nights/spend; but **n16, starts 2025** → too short to wire reliably. | M, **n16 — low weight / skip**. |

> **Brent is the most important cost leaf and the rare leading one.** It hits the basket
> through **two channels simultaneously** (on-site energy + airfare access) and both point
> the same way (higher oil → margin + demand brake), so the −1 sign is clean and the
> weekly, exogenous price gives it forecast standing.

---

## 5. MACRO / RATE / FX / FLOW

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| FX — USD/IDR | `usdidr` (`FX_IDC:USDIDR`, 801w) | macro | **+1** | 0-3m | inbound competitiveness + USD-ADR translation (cap-dominant sleeve wins). (currently kept, sign correct.) | live. **[FORECAST, flow]** |
| FX — source crosses | `FX_IDC:SGDIDR` 794w, `FX_IDC:AUDIDR` 800w, `FX_IDC:JPYIDR` 800w | macro | **+1** | 1-4m | source-specific competitiveness leads (D2b-d) — the cleanest tourism edge. | live. **[FORECAST]** |
| FX — REER (real) | `aIDBISRXBR` (BIS, n388) | macro | **−1** | 1-3m | real trade-weighted competitiveness (D2e); rising = expensive = inbound headwind. | M. **[FORECAST]** |
| Broad USD / risk parent | `dxy` → **`TVC:DXY` (800w)** | macro | 0 | 0-2m | **ambiguous**: strong USD weakens IDR (inbound +) but is EM risk-off (high-beta cyclical −). Net ~0 — let data decide. **Use `TVC:DXY`, NOT empty `TVC:BBDXY`.** | live. |
| Rate — BI 7DRR | `id_bi_rate` (`ECONOMICS:IDINTR`) | macro | **−1** | 3-6m | hotels/parks are **leveraged, capital-heavy** (property-like balance sheets); cuts lower financing cost + lift domestic discretionary credit. | live. **[FORECAST, weak]** |
| Rate — consumption lending rate | `id_lending_rate` → **`CEIC14419701`** (Lending Rate: IDR: Commercial Bank: Consumption, % pa, **n304**) | macro | **−1** | 1-3m | the actual consumer-credit cost for discretionary leisure/travel financing. **`id_lending_rate` currently resolves to None (spark-only) — map it to this real RIC.** | M, n304. **[FORECAST]** |
| Rate — ID 10Y | `id_10y` (`TVC:ID10Y`, ~798w) | macro | −1 | 2-4m | discount rate on the long-duration hotel/property asset base. | live. **[FORECAST, weak]** |
| Risk — VIX / NDX | `vix` (`CBOE:VIX`), `ndx` | macro | −1 (VIX), +1 (NDX) | 0-1m | global risk appetite — high-beta cyclical follows risk-on/off. Optional, low weight. | live. |

**Flow note.** The basket holds high-beta liquid names (FITT β=2.65, PGLI β=0.83, BUVA
β=0.69) AND a cluster of **negative-beta illiquid hotels** (JIHD −0.80, JSPT −0.50). The
liquid sleeve trades on EM risk appetite (USD/IDR, VIX, DXY); the illiquid sleeve barely
co-moves with the market and adds noise/mean-reversion. This **beta dispersion is a core
reason for the −0.10 OOS** — half the basket trades the macro signal, half trades on
idiosyncratic illiquid drift.

---

## 6. Cross-industry linkages

| input | source sector / block | series | role | sign | note |
|---|---|---|---|---|---|
| Jet fuel / energy | Energy → Crude Oil (market) | `brent` `ICEEUR:BRN1!` (800w) | cost | −1 | shared with **Airlines** (#33), **Shipping** (#32). Airfare pass-through is the access cost to the destination. |
| Electricity tariff | Energy → Electricity (CEIC idind) | business tariff IDR/kWh (n138) | cost | −1 | shared with **Utilities** (#52); regulated hotel/park power cost. |
| Domestic mobility | Tourism → Railway Passengers / Air Pax | `CEICI421786447` (Railway Java n244), `CEICI14579501` (Domestic air n401) | demand | +1 | overlaps **Toll Road** (#46) / transport — domestic holiday-travel demand. |
| Consumer confidence / income | ID macro → Consumer Surveys | `aIDCONIAR`, `CEIC277372902` (n196) | demand | +1 | shared with **Retail** (#21), **Restaurants** (#41), **Auto** (#50) — the domestic-discretionary complex. |
| F&B input | Plantation → Palm Oil (market) | `wb_palm_oil` `MYX:FCPO1!` | cost | −1 | shared with **F&B** (#6), **Restaurants** (#41); minor hotel/park F&B cost. |

> Leisure is the **demand sink** of the inbound-tourism chain: arrivals (BPS) → air
> (airports) → hotels (occupancy) → spend (BoP travel credit). It shares the
> domestic-discretionary macro complex with Retail/Restaurants/Auto and the jet-fuel
> cost leg with Airlines.

---

## 7. Currently wired vs available — the "what we COULD add"

**Wired today (`SEED["Leisure"]`):** `ceic:[("Tourism", None)]` (whole 122-series block,
flat), `globals: []`, `macro`: `id_gdp_real_q`(demand,+1,"discretionary leisure"),
`usdidr`(macro,+1,"inbound tourism competitiveness"). **Survivors: 1** — the flat block
floods the gates and almost nothing curates through.

| priority | ADD / FIX | RIC | role/sign | why it beats the current set |
|---|---|---|---|---|
| **P0** | Narrow CEIC to the high-value subcats | `ceic:[("Tourism","Visitor Arrivals"),("Tourism","Hotels"),("Tourism","Air Passenger Traffic")]` | demand | stop drowning 3-4 gold leaves in ~100 trade/length-of-stay micro-series. |
| **P0** | Force-include Bali occupancy | `CEICI14533701` (Room Occupancy: Bali, n440) | demand +1 | the margin-swing leaf; currently unreachable via the flat candidate list. |
| **P0** | Source-country FX crosses | `FX_IDC:SGDIDR`/`AUDIDR`/`JPYIDR` | macro **+1** | the **leading** competitiveness signal — moves arrivals *before* they print. |
| **P0** | Brent (energy + airfare cost) | `brent` / `ICEEUR:BRN1!` | cost **−1** | the only liquid leading **cost** leaf; dual channel. |
| **P1** | REER (real competitiveness) | `aIDBISRXBR` (n388) | macro −1 | trade-weighted real FX; cleaner than nominal USD/IDR. |
| **P1** | Consumption lending rate | `CEIC14419701` (n304) | macro −1 | fixes the dead `id_lending_rate` (None→spark); financing/discretionary-credit cost. |
| **P1** | BI 7DRR | `id_bi_rate` | macro −1 | leveraged, capital-heavy balance sheets + domestic credit. |
| **P1** | Consumer confidence + durable-goods | `aIDCONIAR`, `CEIC277372902` (n196) | demand +1 | the domestic-discretionary lead for the recreation/cinema sleeve. |
| **P2** | Curated arrivals leaves | `CEICI195568102` (total), `CEICI14537201/14536001/14539901` (CN/SG/AU) | demand +1 | the demand spine (attribution, capped weight, yoy/Δ only). |
| **P2** | Air pax (intl + domestic) | `CEICI14579401`, `CEICI14579501` | demand +1 | mobility confirmation for both sleeves. |
| **P2** | DXY (use real id) | `dxy` → **`TVC:DXY`** | macro 0 | broad-USD/risk parent; **NOT `TVC:BBDXY` (empty)**. |
| **drop/exclude** | Trade-value, length-of-stay, micro province leaves | (Tourism trade/UN-comtrade, hotel n16 series) | — | endogenous/short/noise — exclude (see §9). |
| **fix** | `id_lending_rate` resolver | `None` → `CEIC14419701` | — | currently spark-only; map to the real CEIC consumption rate. |

---

## 8. Forecastability — why it fails now, and the fix

**Why the current set scores OOS IC −0.10 (anti-predictive).** Three compounding causes:

1. **Only coincident/lagging series are wired.** The kept driver + the surviving Tourism
   leaves are all **publication-lagged BPS quantities** (arrivals, air pax, FX receipts).
   By the time month-*t* arrivals print (~2m lag), the hotel equities have already
   re-rated on the bookings — so a posture built on the *just-printed* quantity predicts
   next month with the **wrong sign on the bounce** (mean-reversion). Same failure mode as
   Property/Banks: co-moves contemporaneously, mean-reverts at the monthly horizon.
2. **The FX sign is internally cancelling.** USD/IDR is +1 for the cap-dominant inbound
   hotels but −1 for the domestic recreation/intermediary sleeve; a single blended
   USD/IDR driver nets toward noise. The fix isolates the competitiveness channel with
   **source-country crosses** (SGD/AUD/JPY) which are unambiguously +1 for inbound.
3. **Beta dispersion / illiquidity.** Half the basket is negative-beta illiquid hotels
   (JIHD, JSPT, PSKT) that drift idiosyncratically and inject mean-reversion into the
   cap-weighted basket return the macro signal is trying to predict.

**The exploitable leads (the fix).** Tourism has a genuine, mechanical lead chain on the
**inbound** side:

```
ΔAUD/SGD/JPY-IDR ─1-4m→ Δforeign arrivals ─0-1m→ Δhotel occupancy ─→ Δhotel-sleeve earnings
ΔBrent ─1-3m→ Δairfare/energy cost ─→ Δmargin + Δtrip demand
```

- **FX crosses lead arrivals ~1-4m**: a holiday is *planned* when the exchange rate looks
  good and *taken* a quarter later — the booking-to-travel lag is the lead. AUD/IDR is
  *the* Bali-demand FX; SGD/IDR the short-haul.
- **Brent leads cost AND access demand ~1-3m**: weekly, exogenous, liquid → forecast
  standing (the backtest's rule: liquid price series LEAD; slow CEIC quantities lag).

**Which branch should carry forward OOS skill:** **D2 (source-country FX crosses + REER)
and S1/S2 (Brent)** — the *liquid, exogenous, real-time prices*. The hypothesis: a
posture **long the basket when AUD/SGD/JPY-IDR are RISING (IDR cheap for source markets)
and Brent is FALLING (cheap airfare/energy), short when the IDR strengthens in real
terms (REER up) or oil spikes**, should flip the forward IC positive — it trades the
*cause* (the FX/oil regime that drives next quarter's arrivals) not the *coincident
symptom* (this month's already-printed arrivals count).

**Honest concession.** Even fixed, this basket may only reach **beta/attribution +
modest forecast** rather than strong OOS skill, because (a) ~half the mcap-weighted names
are illiquid/negative-beta hotels whose returns are not macro-driven, and (b) the
clean physical-demand series (arrivals, occupancy) are structurally lagging. The
realistic target is **OOS IC from −0.10 to ≥0** (matching the +0.09 in-sample), driven
by the FX-cross + Brent leads, with arrivals/occupancy demoted to capped-weight
attribution.

**Look-ahead / leakage guards (must hold or the OOS is fake):**
- Visitor-arrivals / air-pax / occupancy are **monthly with ~1.5-2m publication lag** →
  at month *t* only the print released by *t* is usable; the engine's CEIC pub-lag
  handling must apply. These are **attribution, capped weight**.
- Arrivals LEVELS are **non-stationary + strongly seasonal** (Bali peak, Lebaran) →
  use **yoy or non-overlapping 12m diffs**, never raw level; deseasonalise or yoy to
  avoid a spurious seasonal "signal".
- Tourism FX receipts (`CEICI338574801`) is **quarterly + BoP lag** → never let it
  dominate; attribution only.
- Exclude trade-value / UN-comtrade leaves inside the Tourism block (railway/hotel
  export-import values) — they are noise, not leisure demand.

---

## 9. Engine-wiring spec (`mapping.py`)

Replace the thin `SEED["Leisure"]` with the curated tree below. Concrete, drop-in:

```python
"Leisure": {
    # P0: narrow from the flat 122-series block to the 3 high-value demand subcats
    #     (stops the arrivals/occupancy/air leaves from being drowned by ~100
    #      trade-value + length-of-stay micro-series).
    "ceic": [
        ("Tourism", "Visitor Arrivals"),
        ("Tourism", "Hotels"),            # surfaces Bali room-occupancy CEICI14533701
        ("Tourism", "Air Passenger Traffic"),
    ],

    # Re-role / pin the leaves the engine should treat as the demand spine.
    # All CEIC-tagged 'demand' already; we keep +1 but the engine must use
    # yoy/non-overlapping diffs (levels are seasonal & non-stationary).
    "ceic_override": [
        ("room occupancy rate: classified hotel: bali", "demand", +1),  # CEICI14533701 n440 — margin swing
        ("visitors arrivals: total", "demand", +1),                     # CEICI195568102 n568
        ("by residence: china", "demand", +1),                          # CEICI14537201 n400
        ("by residence: singapore", "demand", +1),                      # CEICI14536001 n400
        ("by residence: australia", "demand", +1),                      # CEICI14539901 n400
        ("passenger traffic: international: arrival and departure", "demand", +1),  # CEICI14579401 n401
        ("passenger traffic: domestic: arrival and departure", "demand", +1),      # CEICI14579501 n401
    ],

    # Drop the noise / endogenous / too-short leaves inside the block.
    "ceic_exclude": [
        "un comtrade",                 # railway/hotel trade-value noise
        "export: world", "import: world", "export: china", "import: china",
        "average length of stay",      # n16, starts 2025 — too short
        "by province",                 # province-level hotel length-of-stay (n16) micro-noise
        "person-km",                   # railway annual aggregate
    ],

    "globals": [
        ("brent", "cost", -1, "jet-fuel (airfare access) + hotel/park energy; dual cost lead"),
        ("wb_palm_oil", "cost", -1, "hotel/park F&B cooking-oil input (minor)"),
    ],

    "macro": [
        # ---- LEADING FX competitiveness (the forecast engine) ----
        ("usdidr", "macro", +1, "inbound competitiveness + USD-ADR translation (cap-dominant hotels)"),
        ("sgdidr", "macro", +1, "Singapore source competitiveness lead (1-4m)"),
        ("audidr", "macro", +1, "Australia/Bali source competitiveness lead (1-4m)"),
        ("jpyidr", "macro", +1, "Japan source competitiveness lead"),
        ("id_reer", "macro", -1, "real trade-weighted competitiveness (rising=expensive=inbound headwind)"),
        # ---- rate / financing (leveraged hotel balance sheets + domestic credit) ----
        ("id_bi_rate", "macro", -1, "capital-heavy hotels/parks + discretionary credit"),
        ("id_lending_rate", "macro", -1, "consumer/discretionary financing cost (map to CEIC14419701)"),
        ("id_10y", "macro", -1, "discount rate on long-duration hotel/property assets"),
        # ---- domestic discretionary (recreation/cinema sleeve; OPPOSITE FX sign) ----
        ("id_consumer_confidence", "demand", +1, "domestic leisure footfall lead (cinema/parks)"),
        ("id_cpi_yoy", "demand", -1, "food/real-income squeeze on domestic discretionary"),
        # ---- coincident attribution (kept, demoted) ----
        ("id_gdp_real_q", "demand", +1, "income backdrop (attribution, coincident)"),
        # ---- broad risk parent (ambiguous, low weight) ----
        ("dxy", "macro", 0, "broad USD: weakens IDR (+inbound) vs EM risk-off (-cyclical); NOT BBDXY"),
    ],
},
```

**New resolvers needed (`GLOBAL_CORR`).** Three FX crosses + REER are not yet in the
map. Add:
```python
    "sgdidr": "FX_IDC:SGDIDR",   # 794w — Singapore source competitiveness
    "audidr": "FX_IDC:AUDIDR",   # 800w — Australia/Bali source competitiveness
    "jpyidr": "FX_IDC:JPYIDR",   # 800w — Japan source competitiveness
    "id_reer": "aIDBISRXBR",     # BIS Real Effective Exch Rate, n388 (real competitiveness)
```
And **fix the dead `id_lending_rate`** (currently `None` → spark only):
```python
    "id_lending_rate": "CEIC14419701",  # Lending Rate: IDR: Commercial Bank: Consumption, n304
```
(If no CEIC-RIC resolver path exists for macro keys, pull `CEIC14419701` via the CEIC
banking-block and override `("lending rate: idr: commercial bank: consumption","macro",-1)`.)

**Data-quality flags to surface in the panel.**
- **`TVC:BBDXY` is EMPTY (weekly_obs=0)** → wire **`TVC:DXY` (800w)** for the broad-USD leaf.
- Arrivals / air-pax / occupancy are **monthly, ~1.5-2m pub-lag, seasonal** → yoy /
  non-overlapping diffs only; **attribution, capped weight**.
- Tourism FX receipts (`CEICI338574801`) is **quarterly + BoP lag** → attribution only.
- The **leading, forecast-bearing leaves are the weekly FX crosses + Brent** (SGD/AUD/
  JPY-IDR, `ICEEUR:BRN1!`) plus REER and BI 7DRR.
- Hotel length-of-stay / by-province leaves are **n16 (start 2025)** → excluded.

---

### Verification checklist before commit
- [ ] `build_worklist.py` → `controller.py --only Leisure` runs clean with the narrowed block.
- [ ] Bali room-occupancy `CEICI14533701` (n440) is actually pulled (force-include via the Hotels subcat).
- [ ] FX-cross + REER resolvers (`sgdidr`/`audidr`/`jpyidr`/`id_reer`) resolve to populated series; `id_lending_rate` no longer spark-only.
- [ ] `dxy` resolves to `TVC:DXY` (800w), NOT the empty `TVC:BBDXY`.
- [ ] Arrivals/air/occupancy weighted as capped attribution; momentum diffs **non-overlapping** & seasonal-safe.
- [ ] Trade-value / UN-comtrade / n16 length-of-stay leaves excluded.
- [ ] `backtest/bt.py "Leisure"` re-run; **keep only if forward IC > −0.10 and ideally ≥ 0**, driven by the FX-cross + Brent leads (never add a driver that only helps in-sample).
