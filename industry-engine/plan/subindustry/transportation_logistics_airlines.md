# Airlines (Transportation & Logistics) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-C by mcap
> (**24.1 T**) and one of the **hardest baskets to forecast in the whole engine**:
> blindfolded forward **OOS IC −0.025 · hit−up +0.03 · placebo pctile 0.38 → flag `weak`,
> grade `partial`** (n_oos **129**). The honest verdict up front: **96% of the basket cap is
> GIAA (Garuda), a balance-sheet-distressed name whose returns are dominated by
> idiosyncratic debt/restructuring events (PKPU, rights issues, state-rescue headlines), not
> by the systematic fuel/FX/demand cycle.** No amount of macro wiring forecasts a
> restructuring print. The job of this file is therefore **not** to manufacture a forecaster
> — it is to (a) wire the **two genuinely systematic, leading leaves that DO matter to airline
> margin — jet fuel (`NYMEX:HO1!`/Brent) and USD/IDR** — as honest *attribution* of the
> beta that exists, (b) replace the firehose air-pax CEIC pull with the clean
> domestic+international aggregate so the demand cycle is at least *visible*, (c) fix two real
> engine bugs (`dxy → TVC:BBDXY` dead; `id_lending_rate → None`), and (d) **state plainly that
> the forward signal is idiosyncratic noise** and the engine's verdict should be read as
> contemporaneous attribution / a cost-FX beta, never a forecast. Every series cited exists
> in `catalog/{idind,id,market}.json`; RICs, n_obs and last_obs are real and quoted.

---

## 1. Snapshot — a 3-name basket that is ~96% one distressed mega-cap

| field | value |
|---|---|
| basket id | **`transportation_logistics_airlines`** · sub_sector **Airlines** · sector **Transportation & Logistics** |
| mcap | **24.1 T** (#33 of 52) — but see the concentration below |
| n members | **3** (GIAA, CMPP, HELI) — the smallest member count of any Transport basket |
| current grade | **partial** · conf **medium** |
| current kept drivers | **2** (the thinnest viable tree: brent/wti cost + usdidr/gdp) |
| **current forward OOS skill** | **IC −0.025 (BACKTEST −0.03) · hit−up +0.03 · placebo pctile 0.38 · flag `weak`** (n_oos **129**) — **NONE**: forward-flat, slightly *anti*-predictive, well below the placebo median |
| the gap | the seed pulls `ceic: [("Tourism","Air Passenger Traffic")]` — a **28-series firehose** of per-airport departure/arrival/transit splits (Soekarno-Hatta, Ngurah Rai, Kualanamu…) that **buries** the one clean signal (the national Domestic + International aggregate) in 26 single-airport noise series. `brent`+`wti` **double-count** the same fuel lever (collinear). `dxy` is referenced engine-wide but resolves to **`TVC:BBDXY` (wk0, DEAD)**. `id_lending_rate` is **None**. There is **no jet-fuel-specific** proxy (heating oil / gasoil is closer to jet kerosene than crude), **no visitor-arrivals tourism-demand branch**, and **no acknowledgement that GIAA's returns are a debt-event process, not a macro process.** |

**Members (what each does, and why the cap concentration is the whole story).**

- **GIAA** (Garuda Indonesia, **23.20 T = 96.2% of basket cap**, β **−0.007**) — the
  flag-carrier SOE and **the basket, for all practical purposes**. Full-service network +
  LCC arm (Citilink). **Post-PKPU (suspension-of-debt / court restructuring completed 2022),
  structurally distressed:** massive USD aircraft-lease and bond liabilities, repeatedly
  recapitalised (rights issues, state mandatory-convertible bonds, Danantara/SOE-fund
  injections). Its equity is a **deep-out-of-the-money option on the balance sheet** — it
  moves on *restructuring headlines, lessor settlements, dilution events and state-rescue
  news*, which are **idiosyncratic and largely orthogonal to fuel/FX/pax**. The **near-zero
  β (−0.007)** is the tell: GIAA does not co-move with the market or with its own
  fundamentals in a stable way — it gaps on news. This single fact caps the basket's
  forecastability.
- **CMPP** (AirAsia Indonesia / PT AirAsia Indonesia Tbk, **0.76 T = 3.1% of cap**, β
  **−0.003**) — the LCC affiliate of the AirAsia group; also chronically loss-making /
  negative-equity-history, recapitalised via the group. Same distressed character, ~30×
  smaller. β ≈ 0 → another idiosyncratic, near-inert sleeve.
- **HELI** (Jaya Trishakti / "terbang", **0.15 T = 0.6% of cap**, β **1.107**) — a small
  **helicopter charter / offshore-services** operator, **not a scheduled passenger airline**.
  It is the only name with a real market β (1.107 — it actually moves with the index), but at
  **0.6% weight** it contributes almost nothing to the cap-weighted basket. Its drivers are
  closer to oil-services / offshore charter than to scheduled-pax economics — a small
  category impurity.

**The one-line characterisation:** the cap-weighted basket is **~96% a distressed-SOE
balance-sheet option (GIAA) + 3% a distressed LCC (CMPP) + 0.6% a helicopter charter
(HELI)**. The two names that carry the weight have **β ≈ 0** (idiosyncratic debt-event
processes), and the only name with real β carries no weight. **Systematic drivers
(fuel, USD, pax) explain the *operating margin* that *should* drive returns — but GIAA's
returns are dominated by capital-structure events that swamp operating margin.** That is
why forward IC is ~0 / slightly negative, and why this file's honest output is *attribution
of a thin fuel/FX beta*, not a forecast.

---

## 2. Economic structure — how an airline makes (loses) money, and why GIAA is special

Airlines are a **textbook thin-margin, high-operating-leverage, high-financial-leverage**
business: a perishable-inventory (a seat flown empty is gone forever) service sold into a
**discretionary, income- and confidence-elastic** demand cycle, off a **fuel- and
USD-dominated cost base**, financed by a **massive USD-denominated aircraft-lease/debt
stack**. The revenue identity:

```
Revenue   ≈ RPK (revenue passenger-km) × yield (IDR per RPK)
RPK       ≈ ASK (capacity) × load factor   ;   ASK ≈ f(fleet, route network, capacity discipline)
demand    ≈ f( real income, consumer confidence, tourism/visitor arrivals, business travel, fares )
yield     ≈ f( capacity vs demand, fuel-surcharge pass-through, fare-cap policy, route mix )
─────────────────────────────────────────────────────────────────────────────────────────
EBIT      ≈ Revenue − fuel − (leases + maintenance + crew + airport/nav fees + distribution)
fuel      ≈ jet kerosene (Jet-A1) × volume     ← 30–40% of operating cost, the #1 swing
Net inc.  ≈ EBIT − USD interest − FX revaluation of USD lease/debt liabilities   ← GIAA's killer
```

**The margin swing factor is jet fuel.** Jet fuel (Jet-A1 kerosene) is **30–40% of an
airline's operating cost** — the single largest line and by far the most volatile. There is
no clean Jet-A1 future in the store, but **jet kerosene is a middle-distillate that trades at
a tight, stable crack to `NYMEX:HO1!` (ULSD/heating oil) — a *much* better proxy than crude
(Brent/WTI)**, because crude is upstream of the refinery and the crude→distillate crack
itself moves. A jet-fuel spike compresses margin **near one-for-one** with a short lag
(fuel-surcharge pass-through is sticky and fare-capped on domestic routes in Indonesia), so
**fuel is the cleanest, most forecastable operating lever** — but (critical caveat) it only
forecasts the *operating-margin* component of returns, which for GIAA is dwarfed by FX
revaluation and debt events.

**Why GIAA is dominated by the balance sheet (the FX-short story).** Airlines are
**structurally, massively USD-short**: aircraft are leased/financed in USD, fuel is priced in
USD, maintenance and many fees are USD, while domestic revenue is in IDR. GIAA carries a
**multi-billion-USD lease/bond liability**. A weak IDR therefore hits three ways at once:
(1) IDR fuel cost up, (2) IDR lease/interest cost up, and — the killer — (3) a **non-cash FX
revaluation loss on the entire USD liability stack** that can swamp an entire year of
operating profit in a single quarter. For a name with thin/negative equity, this FX
revaluation *is* the earnings (and book-value) variable. **USD/IDR is the most important
single macro variable for GIAA — sign −1, large — but it acts through the balance sheet and
through discrete revaluation prints, not smoothly.** On top of that sits the **restructuring
process itself**: PKPU outcomes, lessor haircuts, bond exchanges, rights issues and
state/Danantara recapitalisations — **pure idiosyncratic events with no macro series**.

**The cost stack (what compresses margin):**
- **Jet fuel / Jet-A1 (~30–40%)** — `NYMEX:HO1!` (ULSD, the distillate proxy) primary;
  `ICEEUR:BRN1!` Brent secondary (crude, one step removed). **#1 swing.**
- **Aircraft leases + financing (~15–25%)** — USD-denominated → `usdidr` (cost *and*
  revaluation). The structural FX short.
- **Maintenance, crew, airport/navigation fees, ground handling** — mixed IDR/USD; partly
  administered (airport tariffs).
- **Distribution / GDS / commissions** — secondary.

**Intra-basket dispersion — the subtleties:**
- **GIAA ≈ the whole basket (96%)** and is **β ≈ 0, distressed, event-driven** → the
  cap-weighted return is essentially a GIAA-restructuring time series. Any macro IC the
  engine finds is mostly *GIAA's* relationship to fuel/FX, heavily contaminated by debt news.
- **CMPP (3%, β ≈ 0)** is the same distressed-LCC character at small scale — does not diversify
  the idiosyncratic risk, it *adds* a second restructuring process.
- **HELI (0.6%, β 1.107)** is the only name that behaves like a normal cyclical equity, but
  its tiny weight means it cannot rescue the basket's signal, and its true drivers
  (offshore/oil-services charter) are a category impurity, not scheduled-pax demand.

**What a sell-side analyst actually watches:** **load factor + RPK/ASK growth** (the
demand/capacity pulse — proxied by the air-pax print); **jet-fuel cost / crack** (the margin
swing); **yield / fare environment** (capacity discipline + domestic fare-cap policy);
**USD/IDR** (fuel + lease + the revaluation bomb); and — for GIAA specifically and
overwhelmingly — **the restructuring/recapitalisation calendar** (PKPU milestones, lessor
settlements, rights-issue dilution, state-fund injections), which no macro feed captures.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return vs IHSG
> for a *rise* in the driver. `lead` = expected months the driver moves *before* the
> equities. **Liquid exogenous price/FX series → forecast candidates; CEIC quantity prints
> are publication-lagged → attribution.** The air-pax CEIC series (`CEICI…`, Tourism block)
> are monthly with a ~5–6-week publication lag → **coincident/lagging → attribution, not
> forecast.** And note the over-arching caveat: even perfectly-leading demand cannot forecast
> GIAA's *return*, because the return is a balance-sheet-event process — these demand leaves
> are attribution of the operating cycle, useful for the read, weak for the signal.

### D1 — AIR-TRAVEL VOLUME (the revenue pulse — RPK proxy, ATTRIBUTION)
```
AIR-TRAVEL VOLUME  (national passenger throughput = the demand thermometer / RPK proxy)
├─ D1a domestic pax (the bulk) ──► [CEICI14579501 Domestic: Arrival and Departure, Person, n401, P1M →2026-04]  sign +1 · lead 0m · ATTRIBUTION ★core
├─ D1b international pax ─────────► [CEICI14579401 International: Arrival and Departure, Person, n401, P1M →2026-04]  sign +1 · lead 0m · ATTRIBUTION (higher-yield, FX-exposed routes)
├─ D1c gateway concentration ────► [CEICI14581401 Domestic Dep: Soekarno-Hatta, n396] / [CEICI14581701 Dep: Ngurah Rai-Bali, n396]  sign +1 · lead 0m · ATTRIBUTION (single-airport — NOISY, do not over-weight)
└─ D1d annual cross-check ───────► [CEICI14591501 Domestic A&D: Annual, n45, P1Y] / [CEICI14591401 Intl A&D: Annual, n45]  sign +1 · lead 0m · ATTRIBUTION (low-freq sanity)
```

- **D1a/D1b — the clean demand aggregate (attribution).** `CEICI14579501` (**Domestic
  Arrival & Departure**, n401, 1993→2026-04) and `CEICI14579401` (**International A&D**,
  n401) are the two national-aggregate passenger-throughput series — the **RPK proxy** and
  the basket's top-line demand thermometer. The current seed's `("Tourism","Air Passenger
  Traffic")` pull technically *includes* these two, but **drowns them in 26 single-airport
  splits** (Soekarno-Hatta dep, Ngurah Rai arr, Kualanamu transit, Juanda…) that are noisy,
  collinear and add no information beyond the national aggregate. **The fix is to keep D1a+D1b
  and exclude the per-airport firehose.** Both are publication-lagged volume prints →
  **coincident/lagging, attribution-grade** (they confirm the cycle the equities already
  moved on); they let the engine *see* the demand cycle but do not forecast it. Highest-value
  demand-side cleanup.
- **D1c — single-airport splits (noise — exclude).** The 26 per-airport series (Soekarno-Hatta,
  Ngurah Rai-Denpasar, Kualanamu-Medan, Juanda-Surabaya, Hasanuddin-Makassar, + transit) are
  **subsets of the national aggregate** — wiring them all is the firehose double-count. Keep
  *none* as fitted drivers; document Soekarno-Hatta (the dominant gateway) + Ngurah Rai (Bali
  = the tourism tell) only as context.
- **D1d — annual cross-check.** `CEICI14591501`/`CEICI14591401` (annual A&D, n45 each) are
  low-frequency sanity series — useful for level/trend context, too coarse to fit.

### D2 — TOURISM / INBOUND DEMAND (the international-route + Bali pull — ATTRIBUTION/LEAD-ish)
```
TOURISM DEMAND  (inbound visitors = international-route load + the Bali/Citilink leisure pull)
├─ D2a visitor arrivals (total) ─► [CEICI195568102 Visitor Arrivals: Total, Person, n568, P1M →2026-04]  sign +1 · lead 0–1m · ATTRIBUTION ★the inbound thermometer
├─ D2b China inbound ────────────► [CEICI14537201 Visitor Arrivals: China, Person, n400, P1M →2026-04]  sign +1 · lead 0–1m · ATTRIBUTION (the swing source market post-COVID)
├─ D2c ASEAN inbound ────────────► [CEICI14535601 Visitor Arrivals: ASEAN, Person, n400, P1M →2026-04]  sign +1 · lead 0–1m · ATTRIBUTION (short-haul regional)
└─ D2d tourism FX receipts ──────► [CEICI338574801 BoP Travel: Credit, USD mn, n181, P3M →2026-03]  sign +1 · lead 0m · ATTRIBUTION (quarterly value of inbound spend)
```

- **D2a — visitor arrivals (the inbound thermometer).** `CEICI195568102` (**Visitor
  Arrivals: Total**, n568 — the *longest* tourism series in the store, 1980s→2026-04) is the
  cleanest read on inbound demand, which drives **international-route load factor** (GIAA's
  higher-yield, more FX-exposed segment) and the **Bali leisure pull** (Citilink/Ngurah Rai).
  Publication-lagged → attribution, but it can lead air-pax marginally (visa/booking →
  arrival). **Not wired today; a clean depth-add.**
- **D2b/D2c — China + ASEAN source markets.** `CEICI14537201` (China, n400) and
  `CEICI14535601` (ASEAN, n400) decompose the swing: **Chinese inbound is the post-COVID
  recovery variable** (most volatile, policy-sensitive), ASEAN is the steady short-haul base.
  Useful attribution decomposition; not forecasters.
- **D2d — tourism FX receipts (quarterly value).** `CEICI338574801` (BoP Travel: Credit, USD
  mn, n181, quarterly) is the *value* of inbound tourism — a cross-check on D2a×yield.
  Quarterly, lagged → attribution.

### D3 — DISCRETIONARY INCOME / CONFIDENCE (the domestic-leisure demand parent — LEAD-ish)
```
DISCRETIONARY DEMAND  (air travel is income- and confidence-elastic — the domestic-pax parent)
├─ D3a consumer confidence ──────► [aIDCONIAR Consumer Confidence, monthly]  sign +1 · lead 2–4m · LEAD-ish (intent to travel precedes the trip)
├─ D3b retail sales (income) ────► [aIDRSLSAR Retail Sales YoY, monthly]  sign +1 · lead 1–3m · LEAD-ish (discretionary spend backdrop)
├─ D3c real GDP (activity) ──────► [aIDGDPAR1 GDP real, quarterly]  sign +1 · lead 0–1m · ATTRIBUTION (business-travel + overall demand)
└─ D3d fare environment (CPI) ───► [CEIC521547787 CPI: Transportation: Passenger Transport Service, n41, P1M →2026-04]  sign ±1 · lead 0m · ATTRIBUTION (yield/fare proxy — ambiguous sign)
```

- **D3a/D3b — confidence + income LEAD domestic travel.** Air travel is **discretionary**:
  household intent to take a leisure trip (and corporate willingness to fund business travel)
  responds to **consumer confidence (`aIDCONIAR`)** and **real income / retail (`aIDRSLSAR`)**
  *ahead* of the booking and the flight, so these survey/spend series carry a **2–4-month
  lead** on domestic pax. They are the closest thing the demand side has to a *leading*
  signal — but they still feed the *operating* cycle, which is not GIAA's return driver.
- **D3c — GDP (attribution).** The seed's `id_gdp_real_q` is the generic activity backdrop
  (business travel scales with GDP). Quarterly, lagged → attribution. Keep, low weight.
- **D3d — fare/yield proxy (ambiguous sign).** `CEIC521547787` (**CPI Transportation:
  Passenger Transport Service**, n41) tracks the *price* of passenger transport — a yield
  proxy. **Sign is genuinely ambiguous**: higher fares = higher yield/revenue (+), but also
  demand destruction and a sign of fuel-cost pass-through (−). Document as attribution; do
  not assign a confident a-priori sign.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (jet-fuel-dominated cost + USD lease/financing + capacity/yield discipline)
├─ S1 JET FUEL (~30–40%) ────────► [NYMEX:HO1! ULSD/Heating Oil, wk800]   sign −1 · lead 1–2m · COST ★PRIMARY swing (jet-kerosene proxy — BETTER than crude)
│      (the margin lever)           [ICEEUR:BRN1! Brent, wk800]            sign −1 · lead 0–1m · COST (crude — one step upstream; secondary, guard double-count)
├─ S2 USD lease/maintenance ─────► [FX_IDC:USDIDR, wk801]   sign −1 · lead 0–1m · COST (USD leases + USD MRO; see also M-block revaluation)
├─ S3 capacity / yield discipline► (no clean ASK/load-factor series in store) — derive: pax(D1a) vs fleet; POLICY/structural annotation
├─ S4 fuel-price volatility ─────► [CBOE:OVX Crude-Oil VIX, wk800]   sign −1 · lead 0–1m · COST-RISK (fuel-vol spikes = margin uncertainty; low weight)
└─ S5 GIAA debt/restructuring ──► ✗ NO SERIES — idiosyncratic event process (PKPU, lessor haircuts, rights issues, state injections) ★the dominant return driver, UNMODELLABLE
```

- **S1 — JET FUEL is the margin swing, and `NYMEX:HO1!` beats crude.** Jet-A1 kerosene is a
  middle distillate; it tracks **ULSD/heating oil (`NYMEX:HO1!`, wk800)** far more tightly
  than crude, because the crude→distillate *crack* itself moves (refinery margin) and that
  crack is part of the airline's actual fuel cost. **The current seed wires `brent`+`wti`
  (two crudes) and ignores `heating_oil` entirely — this is the single most theory-incorrect
  cost choice in the seed.** Recommend **`heating_oil` (HO1!) as the PRIMARY fuel cost (−1,
  leads 1–2m via fuel-surcharge stickiness), Brent demoted to secondary, `wti` dropped**
  (pure double-count of Brent). Sign −1 (rising fuel compresses airline margin). This is the
  one genuinely clean, leading, systematic lever in the basket — but see S5 / §8 for why it
  still does not forecast the *return*.
- **S2 — USD/IDR as a cost (leases + MRO).** Aircraft leases and much maintenance (MRO) are
  USD-priced → weak IDR raises IDR cost (−1). This is the *cash-cost* face of the FX short;
  the *revaluation* face is in the macro block (M3) and is the bigger effect for GIAA.
- **S3 — capacity / load-factor / yield (no series).** The real supply variable is **ASK
  capacity vs demand → load factor → yield discipline** (and, in Indonesia, the **domestic
  fare-cap regulation** that caps how much fuel cost can be passed through). There is **no
  clean ASK or load-factor series** in the store → derive load-factor crudely from pax (D1a)
  vs fleet, or treat as a structural/policy annotation. Document; do not fake.
- **S4 — fuel-price volatility (risk, low weight).** `CBOE:OVX` (Crude-Oil VIX, wk800) proxies
  fuel-cost *uncertainty*; spikes raise hedging cost and margin risk. Minor, optional, low
  weight — and collinear with the fuel level in stress.
- **S5 — GIAA debt/restructuring: the dominant return driver, with NO series.** This is the
  crux of the whole file. GIAA's equity return is overwhelmingly a function of **PKPU /
  restructuring milestones, lessor settlements, USD-bond exchanges, rights-issue dilution and
  state/Danantara recapitalisations** — **discrete, idiosyncratic, headline-driven events**
  with **no macro series and no forecastable structure.** At 96% of cap, this means the
  *basket's* return is ~96% an unmodellable event process. **No fuel/FX/pax wiring can
  forecast it.** This is the honest reason for OOS IC ≈ 0 (§8). It must be stated, not
  wired around.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay  (the USD short + the revaluation bomb + financing + risk appetite)
├─ M1 USD/IDR ───────────────────► [FX_IDC:USDIDR, wk801]   sign −1 · lead 0–1m · MACRO ★the #1 macro lever (fuel + lease + FX REVALUATION on USD debt)
├─ M2 broad USD (DXY) ───────────► [TVC:DXY US Dollar Index, wk800]   sign −1 · lead 0–1m · MACRO  ★FIX: seed/engine routes dxy→TVC:BBDXY (wk0, DEAD)
├─ M3 ID 10Y / financing cost ───► [TVC:ID10Y, wk798]   sign −1 · lead 1–3m · MACRO (refinancing cost for a leveraged distressed name; leading yield)
├─ M4 BI policy rate ────────────► [ECONOMICS:IDINTR BI 7DRR, monthly]   sign −1 · lead 3–6m · MACRO (financing + discretionary-demand rate-elasticity)
└─ M5 risk appetite / flow ──────► [TVC:DXY] + EM risk-off → distressed/leveraged names hit hardest (high beta to risk-off despite low market β)
```

- **M1 — USD/IDR = −1, the most important macro variable.** For a structurally USD-short,
  heavily-USD-indebted airline, weak IDR hits **fuel cost + lease cost + a non-cash FX
  revaluation loss on the whole USD liability stack** simultaneously. For GIAA (thin/negative
  equity) the revaluation *is* the earnings swing. **Sign −1, large.** Already wired (macro
  −1). Keep and emphasise. Caveat: the effect is lumpy (quarterly revaluation prints) and
  entangled with debt events, so it explains *amplitude* and *direction-when-clean* but not
  every month.
- **M2 — DXY = −1, and the resolver BUG.** A stronger broad dollar = EM-flow headwind + IDR
  pressure → negative for a leveraged distressed EM name. **But the engine's `dxy` resolver
  points to `TVC:BBDXY`, wk0 (EMPTY) → DXY is silently unwired everywhere.** Fix to **`TVC:DXY`**
  (wk800) per the AGENT_BRIEF caveat + DATA_BUGS.md. Real, falsifiable, engine-wide bug (§9).
- **M3 — ID 10Y = −1 (refinancing cost).** `TVC:ID10Y` (wk798) is the domestic financing-cost
  anchor; for a distressed, perpetually-refinancing name, rising yields raise the cost (and
  feasibility) of the next recap → negative. Daily liquid yield → leads. Not wired today; add
  low weight.
- **M4 — BI rate = −1.** `ECONOMICS:IDINTR` (BI 7DRR) feeds both financing cost and
  discretionary-demand rate-elasticity (consumer credit for travel). The worklist already
  carries `id_bi_rate` (sign 0 — undirected); set −1. Modest.
- **M5 — risk appetite / flow.** Distressed + leveraged names have **high sensitivity to
  risk-off** even when their market β is ~0 (β measures co-movement, not tail behaviour) — a
  global EM-outflow / strong-dollar regime hits the most fragile balance sheets hardest.
  Captured via DXY/USDIDR; document, don't add a separate noisy leaf.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `NYMEX:HO1!` ULSD / heating oil | **Energy / Refined products** (market) | **cost −1** (S1) | jet-kerosene distillate proxy — the #1 cost, BETTER than crude; leads 1–2m |
| `ICEEUR:BRN1!` Brent | **Energy / Oil** (market) | **cost −1** (S1, secondary) | crude one step upstream of jet fuel; demote vs HO1!, guard double-count |
| `CBOE:OVX` crude-oil VIX | **Energy / vol** (market) | **cost-risk −1** (S4) | fuel-price uncertainty / hedging cost (low weight) |
| `CEICI195568102` visitor arrivals | **Tourism / Visitor Arrivals** (idind) | **demand +1** (D2a) | inbound demand → international-route + Bali leisure load |
| `CEICI14537201` China inbound | **Tourism** (idind) | **demand +1** (D2b) | the post-COVID swing source market |
| `aIDCONIAR` consumer confidence | **Consumer Surveys** (id-macro) | **demand +1** (D3a) | discretionary travel intent (leads 2–4m) |
| `aIDRSLSAR` retail sales | **Consumer Surveys** (id-macro) | **demand +1** (D3b) | discretionary-income backdrop |
| `TVC:ID10Y` 10Y yield | **Rates** (market) | **macro −1** (M3) | refinancing cost for a leveraged distressed name |

**The cross-industry story.** Airlines sit *downstream* of two cycles: the **energy complex**
(jet fuel = the cost, borrowed from the Energy/refined-products plane — same `NYMEX:HO1!`/
Brent the Oil & Gas and Shipping baskets use, opposite sign: for refiners/upstream fuel is
revenue +1, for airlines it is cost −1) and the **tourism/discretionary-consumption cycle**
(visitor arrivals + consumer confidence, the same Tourism/Consumer-Survey plane the Leisure
and Hotels baskets read). Wiring HO1!/Brent (cost) + visitor-arrivals/confidence (demand) is
the explicit cross-industry tree.

**Deliberate non-linkages.** Do **not** wire `ICEEUR:G1!` Gasoil (**wk0, DEAD** — it would be
the European jet proxy but is empty; HO1! substitutes). Do **not** treat `AMEX:JETS` (US
Global Jets ETF, wk575) as a driver — it is a *US-airline equity* basket, i.e. a co-moving
*outcome*, not an exogenous driver (endogeneity trap). Do **not** wire the 26 single-airport
pax splits as fitted drivers (D1c — noise). Do **not** import HELI's offshore-charter drivers
(oil-services) — at 0.6% weight it is a category impurity, not worth a branch.

---

## 7. Currently-wired vs available

### 7a. The 2-driver `Airlines` seed vs proposed (make the attribution honest)

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `ceic ("Tourism","Air Passenger Traffic")` | category pull | **28-series air-pax firehose** | **★NARROW** | keep Domestic A&D + International A&D aggregates; exclude the 26 single-airport splits |
| `brent` | cost −1 | `ICEEUR:BRN1!` wk800 | **demote** | crude is one step upstream of jet fuel; make secondary |
| `wti` | cost −1 | `NYMEX:CL1!` wk800 | **DROP** | pure double-count of Brent (two crudes, same lever) |
| `usdidr` | macro −1 | `FX_IDC:USDIDR` wk801 | **KEEP — the #1 macro lever** | fuel + lease + FX revaluation on USD debt; emphasise |
| `id_gdp_real_q` | demand +1 | `aIDGDPAR1` | **keep (low weight)** | business-travel/activity backdrop (attribution) |
| `id_bi_rate` | macro 0 | `ECONOMICS:IDINTR` | **set −1** | financing + discretionary-demand rate-elasticity |
| `id_cpi_yoy` | macro 0 | `ECONOMICS:IDIRYY` | **keep 0 / drop** | ambiguous; not a clean airline lever |
| *(none)* `heating_oil` | — | `NYMEX:HO1!` wk800 | **★ADD cost −1 (PRIMARY)** | jet-kerosene distillate proxy — the theory-correct #1 fuel cost |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | engine-wide resolver bug; add macro −1 |
| *(none)* `id_10y` | — | `TVC:ID10Y` wk798 | **ADD macro −1 (low wt)** | refinancing cost for a leveraged distressed name |
| *(none)* visitor arrivals | — | `CEICI195568102` n568 | **ADD demand +1** (via Tourism/Visitor-Arrivals pull) | inbound demand (intl-route + Bali load) |
| *(none)* consumer confidence | — | `aIDCONIAR` | **ADD demand +1** | discretionary travel intent (leads 2–4m) |
| *(26 airport splits)* | — | `CEICI1458…` | **★EXCLUDE** | single-airport subsets of the national aggregate = firehose noise |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| **GIAA restructuring / debt events** (the dominant return driver) | *(none — idiosyncratic)* | PKPU/lessor/rights-issue/state-recap are discrete headlines; **no series, unforecastable — the core honest concession** |
| Load factor / ASK capacity / yield | derive pax(D1a) vs fleet | no clean ASK/load-factor series in store |
| Jet-A1 (Jet kerosene) outright price | `NYMEX:HO1!` distillate proxy | no Jet-A1 future; ULSD crack-proxy is the honest substitute |
| Domestic fare-cap regulation (pass-through limit) | `CEIC521547787` CPI passenger-transport (yield proxy) | policy/administered; CPI proxy only, ambiguous sign |
| European jet/gasoil benchmark | `ICEEUR:G1!` Gasoil | **wk0 DEAD** — HO1! substitutes |

---

## 8. Forecastability — why it's NONE, and the honest ceiling

**The backtest fact:** Airlines is **IC −0.025 (BACKTEST row −0.03) · hit−up +0.03 · placebo
pctile 0.38 · flag `weak` · grade `partial`** over **129** forward months. It is **forward-
flat / slightly anti-predictive** — *below* the placebo median (0.38 < 0.50), so the
theory-signed posture has **no demonstrable forward skill** and the engine should read its
verdict as **contemporaneous attribution, not a forecast.**

**Why there is no forward signal (the honest diagnosis):**

1. **96% of the basket (GIAA) is a balance-sheet-event process, not a macro process.** GIAA's
   return is dominated by PKPU/restructuring milestones, lessor settlements, USD-bond
   exchanges, rights-issue dilution and state recapitalisations — **idiosyncratic, discrete,
   headline-driven, with no macro series.** The near-zero β (−0.007) is the fingerprint of a
   name that gaps on news rather than co-moving with fundamentals. **No fuel/FX/pax driver can
   forecast a court-restructuring or a state injection.** This alone caps forward IC at ~0.
2. **The clean systematic lever (jet fuel) only drives *operating margin*, which GIAA's FX
   revaluation and debt events swamp.** Fuel (HO1!/Brent) genuinely leads operating margin
   1–2m, and USD/IDR genuinely drives cost+revaluation — but these move the *operating*
   earnings line, and GIAA's *equity return* is set by the *capital-structure* line (dilution,
   revaluation, going-concern probability). The signal exists in the wrong P&L row.
3. **The seed currently wires the fuel lever twice (Brent+WTI) and the demand cycle as a
   28-series airport firehose** — so even the modest *attribution* it could provide is diluted
   by collinearity and noise. The fixes below sharpen the *attribution*; they do **not**
   manufacture a forecast.

**Which branches lead vs lag:**
- **LEAD (the systematic attribution, where any IC lives):** jet fuel `NYMEX:HO1!` / Brent
  (1–2m), USD/IDR + DXY (0–1m), ID 10Y / BI rate (1–6m), consumer confidence (2–4m on the
  domestic-pax operating cycle).
- **COINCIDENT/LAG (attribution):** domestic + international air-pax prints, visitor arrivals,
  GDP, CPI passenger-transport — all publication-lagged CEIC quantities.
- **UNFORECASTABLE (dominant for GIAA):** restructuring/debt/dilution events — no series.

**What an edge would (and would not) look like.** The *only* place a thin edge could plausibly
come from is **the fuel + FX beta**: in clean windows (no GIAA debt headline), a sharp jet-fuel
rally or IDR depreciation *should* drag the operating-margin component and, via revaluation,
the equity. So **fuel/FX give an attribution edge on the operating beta**, but it is repeatedly
**overwhelmed by idiosyncratic dilution/restructuring noise** in the GIAA-dominated
cap-weight — which is exactly why the realised forward IC is ~0/negative. **Honest verdict:
this basket is attribution/beta-only, not a forecaster, and the dominant driver (GIAA's
balance sheet) is structurally unmodellable.** Wiring the correct fuel proxy (HO1!), fixing
DXY, and cleaning the air-pax pull will make the *read* honest and may nudge IC from −0.025
toward ~0; **it will not move it into the skill band, and the file should not pretend
otherwise.** If anything moves the needle materially it would be **down-weighting GIAA**
(equal-weighting the 3 names lifts HELI's real β and CMPP, reducing the distressed-SOE
domination) — but that changes the basket definition, not the engine, and is flagged as an
open question for the backtest, not a recommendation to fake.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Two resolver edits help the whole engine; the rest is basket-local. The proposed changes
**sharpen attribution and fix real bugs — they are not expected to create forward skill**
(§8). Keep each change only if forward IC **holds or improves with a more honest tree**;
revert anything that only helps in-sample.

```python
# --- GLOBAL_CORR edits (apply once; help the whole engine) ---
#   "dxy": "TVC:DXY",                 # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
#   "id_lending_rate": "CEIC14419701",# FIX: was None (shared with Cement/Property) — un-breaks the spark-only resolver.
#   (heating_oil already resolves -> NYMEX:HO1! wk800; brent, usdidr, id_10y, id_bi_rate, id_gdp_real_q, aIDCONIAR all resolve correctly.)
```

```python
"Airlines": {  # 3 names, ~96% GIAA (distressed SOE, beta~0). RETURN IS A BALANCE-SHEET-EVENT
    # PROCESS, NOT A MACRO PROCESS -> forward OOS IC -0.025 (NONE). This tree is ATTRIBUTION of
    # the fuel/FX operating beta, NOT a forecaster. Fixes: jet-fuel proxy (HO1! not 2x crude),
    # narrow the air-pax firehose, fix dxy. Do NOT expect skill; GIAA debt events are unmodellable.
    "ceic": [("Tourism", "Air Passenger Traffic")],
    # Keep the national aggregates as demand attribution; drop the 26 single-airport splits.
    "ceic_override": [
        ("domestic: arrival and departure",      "demand", +1),  # CEICI14579501 n401 — the RPK proxy (bulk)
        ("international: arrival and departure",  "demand", +1),  # CEICI14579401 n401 — intl/higher-yield routes
    ],
    "ceic_exclude": [
        ("soekarno hatta", None, None),   # single-airport splits = subsets of the national aggregate (firehose noise)
        ("ngurah rai",     None, None),
        ("kualanamu",      None, None),
        ("juanda",         None, None),
        ("hasanuddin",     None, None),
        ("transit",        None, None),   # transit splits (noise)
        ("annual",         None, None),   # P1Y duplicates of the monthly aggregate (too coarse to fit)
    ],
    "globals": [
        ("heating_oil", "cost", -1, "NYMEX:HO1! ULSD = jet-kerosene distillate proxy — the #1 fuel cost (~30-40%), LEADS 1-2m. BETTER than crude."),
        ("brent",       "cost", -1, "ICEEUR:BRN1! crude one step upstream of jet fuel — SECONDARY, guard double-count vs HO1!"),
        # ("wti", ...)  # DROPPED: pure double-count of Brent (two crudes, one lever)
    ],
    "macro": [
        ("usdidr",       "macro",  -1, "THE #1 macro lever: USD fuel + USD leases + FX REVALUATION on GIAA's USD debt stack (lumpy, large)"),
        ("dxy",          "macro",  -1, "broad USD = EM-flow headwind; distressed/leveraged names hit hardest (FIXED resolver -> TVC:DXY)"),
        ("id_10y",       "macro",  -1, "refinancing cost for a perpetually-recapitalising distressed name (leading yield)"),
        ("id_bi_rate",   "macro",  -1, "financing cost + discretionary-travel rate-elasticity"),
        ("id_consumer_confidence", "demand", +1, "discretionary travel intent (aIDCONIAR) — leads domestic pax 2-4m"),
        ("id_gdp_real_q","demand", +1, "business-travel / activity backdrop (attribution, low weight)"),
        # Visitor-arrivals demand (CEICI195568102) -> add via a Tourism/Visitor-Arrivals ceic pull or an id-macro leaf when the resolver supports it.
    ],
},
```

**Notes for the implementer.**
- **The honest framing is mandatory, not optional.** This basket is **96% GIAA, a distressed
  SOE whose return is a debt/restructuring-event process.** Forward OOS is **NONE (IC
  −0.025, placebo pctile 0.38)** and **should be reported as contemporaneous attribution of a
  fuel/FX operating beta, never as a forecast.** The wiring fixes make the *read* correct;
  they are **not expected to lift the basket into the skill band**, and the implementer should
  not chase in-sample IC by over-fitting drivers to GIAA's gaps.
- **The one clear theory bug is the fuel proxy.** The seed wires **two crudes (Brent+WTI)** and
  **ignores `heating_oil` (`NYMEX:HO1!`)** — yet jet fuel is a *distillate*, so HO1! is the
  theory-correct primary cost and crude is one step upstream. Make **HO1! primary (−1), Brent
  secondary (−1), drop WTI** (collinear double-count). This is the highest-confidence
  correctness fix.
- **`dxy → TVC:DXY`** and **`id_lending_rate → CEIC14419701`** are two clean engine-wide
  resolver wins (the latter shared with Cement/Property — un-breaks every basket that
  referenced the None lending-rate spark).
- **Narrow the air-pax pull** — keep the two national aggregates (`CEICI14579501` Domestic
  A&D, `CEICI14579401` International A&D); exclude the 26 single-airport / transit / annual
  splits (subsets of the aggregate = firehose noise). This is the demand-side cleanup.
- **Visitor arrivals + confidence are the depth-adds on the demand side** (`CEICI195568102`,
  `aIDCONIAR`) — attribution of the inbound + discretionary cycle; wire confidence via the
  existing `id_consumer_confidence` resolver, arrivals via a Tourism/Visitor-Arrivals pull or
  an id-macro leaf when supported. Do **not** fabricate a load-factor series.
- **Do NOT wire `AMEX:JETS`** (US-airline equity ETF — a co-moving outcome, endogeneity trap)
  or **`ICEEUR:G1!` Gasoil** (wk0, DEAD). Do **not** add HELI's offshore-charter drivers
  (0.6% weight, category impurity).

**Falsifiable backtest plan (the keep/kill gate).** Run `backtest/bt.py "Airlines"` and **keep
each change only if forward IC holds or improves with a more honest tree** (the realistic
target is **−0.025 → ~0**, i.e. removing the anti-signal, NOT reaching the skill band),
ablating in this order:
1. **Fuel proxy fix** (HO1! primary, Brent secondary, drop WTI) — *expected primary effect*:
   the theory-correct distillate lever replaces the doubled crude. Confirm the de-doubling does
   not *cost* IC and the sign stays −1.
2. **+ air-pax narrow** (Domestic+Intl A&D aggregate; exclude airport splits) — confirm the
   demand attribution sharpens (less noise) without losing IC.
3. **+ `dxy` fix** (`TVC:DXY`) — free engine-wide correction; confirm DXY now contributes.
4. **+ demand depth** (visitor arrivals +1, consumer confidence +1) — confirm these add honest
   attribution; keep only if non-negative to forward IC.
5. **Diagnostic (not a wiring change): equal-weight vs cap-weight.** Re-run on an *equal-
   weighted* basket to measure how much of the −0.025 is pure GIAA-domination. If equal-weight
   IC is materially better, that **confirms the diagnosis** (the signal is killed by GIAA's
   idiosyncratic weight) and is evidence for the honest "attribution-only, GIAA-dominated"
   verdict — *not* a license to re-weight the production basket.

Success criterion: a **theory-correct (jet-fuel-not-crude), de-noised, honestly-labelled**
tree whose verdict is read as **contemporaneous fuel/FX attribution**, that nudges forward IC
from anti-predictive (−0.025) toward neutral (~0) — and an **explicit written concession that
the dominant driver (GIAA's balance sheet) is unforecastable**, so this basket is and will
remain **beta/attribution-only, never a forecaster.** Never a change that only lifts in-sample
fit on GIAA's idiosyncratic gaps.
