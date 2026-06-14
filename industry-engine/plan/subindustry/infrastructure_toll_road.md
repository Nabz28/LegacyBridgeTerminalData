# Toll Road (Infrastructure) — Driver-Tree Plan

> Detail file for the `Toll Road` sub-industry basket (id `infrastructure_toll_road`).
> Framework: `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4
> template · §5 capsule #46). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` (and `data-store/correlation.sqlite`) with the
> cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: a toll road is a LEVERAGED, REGULATED-UTILITY ANNUITY — a long-life
> concession whose cashflow is `traffic VOLUME × CPI-indexed regulated tariff − heavy
> financing cost`. Because the asset is massively geared against a 30–40-year fixed-life
> concession, the equity behaves like a long-duration BOND PROXY: its dominant systematic
> driver is the DISCOUNT RATE (the Indonesian govt 10Y yield / BI rate), not the
> high-frequency traffic count. That is exactly what the blindfolded backtest finds — the
> ONLY infrastructure basket here with positive forward skill (fwd IC +0.10, placebo pctile
> 0.87, "marginal"), and — the tell — forward IC (+0.10) is HIGHER than contemporaneous IC
> (+0.037): the skill is genuinely a LEAD, consistent with a rate-duration channel where the
> liquid daily yield curve moves before the geared annuity re-rates. The two honest caveats:
> (1) the basket is ONE name — `META` (Nusantara Infrastructure, 4.1T) — JSMR, the dominant
> SOE toll operator, and CMNP are BUCKETED ELSEWHERE (market.json mislabels JSMR as "Rail
> Transport"), so this is a single-name duration beta, not a diversified sector; (2) the
> traffic-volume demand tree is built from coincident, publication-lagged CEIC quantity
> prints that fit WRONG-SIGN in-sample — attribution, not forecast. The improvement is to
> make the rate-duration channel explicit and DEEP (wire the daily `id_10y` / `id_05y` curve,
> not just the monthly policy rate) and to read traffic as attribution.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Toll Road**, sector *Infrastructure*, id `infrastructure_toll_road` |
| mcap | **~4.1T** (capsule #46 lists 4T; worklist `total_mcap` 4.123T) |
| n_names | **1** (worklist `n_names: 1`; engine `n_used: 1`) |
| Members (worklist) | **META** (`IDX:META`, **4.12T**, β n/a) — **PT META / Nusantara Infrastructure** (formerly Nusantara Infrastructure), an infrastructure holding whose core asset is **toll-road concessions** (e.g. the Pondok Aren–Serpong / JLB toll, plus ports & water utilities); market.json correctly tags it *Highways & Toll Roads*, wk=793. |
| **The names the basket is SUPPOSED to be** | The brief's intended basket = **JSMR (Jasa Marga — the dominant ~24-concession SOE toll operator) + META + Nusantara/CMNP**. In the live data, **only META is in the basket.** `IDX:JSMR` (wk=793, deep history) and `IDX:CMNP` (wk=793) both exist in the price store but are **NOT** routed into `infrastructure_toll_road`: market.json **mislabels JSMR as subcategory "Rail Transport"**, and CMNP is the only *other* "Highways & Toll Roads" name but is also absent from the worklist. **So the engine's "Toll Road" is a META-only proxy for the toll-road factor.** Every result below must be read with that 1-name caveat (see §8). |
| Effective composition | **Single-name duration beta.** META is a small-cap geared infrastructure holding; its return is dominated by (a) the IDR discount-rate regime (its toll annuities are long-duration), (b) IDX small-cap risk appetite/flow, and (c) idiosyncratic holding-company / corporate-action noise. There is no intra-basket dispersion to model — there is one name. |
| Current grade | **partial** (`grade_reasons`: "theory-incoherent kept set (agree=40%)", "data-limited basket") |
| Current kept-driver count | **9 kept** of 26 tested (`output/infrastructure_toll_road.json`: `n_kept: 9`, `n_candidates: 26`), verdict **NEUTRAL [53/100, medium confidence]**. The kept set is dominated by **Transport-&-Storage GDP value-added lines** (sector's own GDP — see §7 endogeneity flag) and HH-transport-consumption; the macro rate driver `id_bi_rate` was tested but scored **14.9, below_gate** (`rejected_top`). |
| Current forward OOS | **marginal** — fwd IC **+0.10**, fwd hit 0.489 vs up-rate 0.342 (edge +0.147), long-short +3.01%/mo, **placebo pctile 0.867**, binom p 0.0023, n_oos **94** (`backtest/results/infrastructure_toll_road.json`). **The tell: forward IC (+0.100) > contemporaneous IC (+0.037), and forward placebo pctile (0.87) >> contemporaneous (0.60).** This is the opposite of every coincident-quantity basket (where contemp > forward) and is the signature of a genuine LEAD — the rate-duration channel. `latest_signal: -0.083`. |

**Current seed (`mapping.py` → `SEED["Toll Road"]`):**
```python
"Toll Road": {
    "ceic": [("Transport & Logistics", None)],
    "globals": [],
    "macro": [("id_bi_rate", "macro", -1, "leveraged annuity cashflows"),
              ("id_gdp_real_q", "demand", +1, "traffic volume")],
},
```
(plus `STD_MACRO`: `usdidr` 0 / `id_bi_rate` 0 / `id_cpi_yoy` 0 / `id_gdp_real_q` +1. Note `id_bi_rate` appears twice — the seed's −1 and STD_MACRO's 0; the seed's −1 is the theory anchor that the backtest scores.)

**The gap (four problems).**
1. **The dominant channel — the bond-proxy DISCOUNT RATE — is wired only at the SHALLOW,
   LAGGING end.** The seed uses `id_bi_rate` (→ `ECONOMICS:IDINTR`, the monthly BI policy
   rate, wk=186 — a stepwise administered rate that moves in 25bp clicks ~8×/yr). The
   *actual* duration signal for a 30–40-year concession is the **market govt yield curve**:
   `id_10y` → `TVC:ID10Y` (**wk=798**, daily), `id_05y` → `TVC:ID05Y` (wk=795), `id_01y` →
   `TVC:ID01Y` (wk=793), `id_30y` → `TVC:ID30Y` (wk=738). **None of the curve is wired.** The
   10Y yield leads the policy rate and is far higher-frequency — it is the *price* of duration
   and the most likely source of the forward skill. This is the single highest-value change.
2. **The traffic-volume demand tree is built from the wrong, coincident series and fits
   WRONG-SIGN.** The `("Transport & Logistics", None)` pull grabs **sea-cargo tonnage,
   air-passenger traffic, railway freight, vehicle registrations** — none of which is *road*
   traffic, and most of which is a coincident, publication-lagged monthly quantity print. In
   the live fit, `International: Makassar` (`CEICI14577201`) came out **−0.059 (theory_agree
   false)**, `Ngurah Rai air pax` (`CEICI14582601`) **−0.077 (false)**, and even
   `id_gdp_real_q` (the "traffic volume" proxy) came out **−0.073 (false)**. The kept set is
   theory-incoherent (agree=40%) precisely because these are coincident attribution series
   masquerading as demand forecasters.
3. **The CPI-indexation channel — the regulated TARIFF escalator — is unmodelled.** Toll
   tariffs in Indonesia are raised **every 2 years tied to CPI** (UU 38/2004 / PP 15/2005).
   So inflation is *revenue-positive* for a toll operator with a lag, the opposite of the
   `id_cpi_yoy` sign-0 default. The store has headline **CPI YoY (`ECONOMICS:IDIRYY`, wk=183)**
   and the granular **CPI: Transportation (2022=100, P1M, n=41)** — neither wired as a
   tariff-escalator demand/revenue driver.
4. **No financing-cost / leverage series and a known resolver bug.** A "massively leveraged"
   asset's margin swings with its **funding cost**, but `id_lending_rate` → **None**
   (spark-only bug flagged in the brief). The store HAS **Lending Rate: Investment (% pa, P1M,
   n=397)** and **Construction Loans (`Rupiah: Construction`, IDR bn, n=292)** — the genuine
   financing-cost and new-concession-capex series — none wired.

---

## 2. Economic structure — how the basket makes money

**Revenue / value identity (a single toll concession):**
```
Revenue(t)   ≈  TRAFFIC VOLUME (vehicles × km, by class)  ×  TARIFF (IDR/km)        ← tariff is REGULATED,
                                                                                       CPI-indexed, raised every 2 yrs
EBITDA       ≈  Revenue − operating cost (mostly FIXED: maintenance, tolling, labour) ← VERY HIGH operating leverage
Net / FCFE   ≈  EBITDA − INTEREST(very large net debt) − maintenance capex ± FX on USD debt portion
Equity value ≈  PV of a 30–40-yr declining-balance ANNUITY discounted at (govt yield + spread)   ← LONG DURATION
```

Six structural facts drive the modelling — and they explain why this basket behaves like a
bond, not like a transport-volume play:

1. **It is a LONG-DURATION ANNUITY → the discount rate dominates.** A toll concession is a
   contracted right to collect a regulated, inflation-escalating toll for a *fixed* multi-decade
   term, after which the road reverts to the state. The equity is therefore the present value of
   a long, back-loaded cashflow stream. Like any long-duration instrument, **its price is far
   more sensitive to the discount rate than to a single year's cashflow.** A 100bp move in the
   IDR 10Y re-rates a 30-year annuity by roughly its (long) duration — this is the mechanical
   reason the rate channel carries the forward signal. *This is the central thesis of the file.*

2. **Massive financial leverage AMPLIFIES the rate sensitivity (double-counts the duration).**
   Toll roads are built with thin equity over very large project debt (often 70–80% gearing).
   Rates hit the equity **twice**: once through the discount rate on the asset (point 1), and
   again through the **interest expense** on the debt stack (a higher funding cost directly cuts
   FCFE, and refinancing a maturing project bond at a higher yield is a real margin event). A
   geared, long-life regulated asset is therefore one of the most rate-sensitive equity types in
   the market — the textbook "bond-proxy" infrastructure name.

3. **The price leg (tariff) is REGULATED and CPI-indexed — low-frequency but revenue-POSITIVE.**
   Unlike a commodity producer, the toll operator does not set price freely: the tariff is
   administered and stepped up **every two years by an inflation formula**. So (a) the price leg
   carries little high-frequency signal (it moves in 2-year steps), and (b) **inflation is a
   *tailwind* to revenue with a lag** — higher CPI today ⇒ a bigger scheduled tariff hike in the
   next biennial review. This is the opposite of the consumer-discretionary CPI sign (−1) and
   must be set **+1 with a long lag** for the tariff-escalation branch.

4. **Traffic volume is the cyclical swing factor — but we cannot observe it in a leading way.**
   With fixed operating cost, incremental traffic drops almost straight to EBITDA, so *volume is
   the operational swing factor*. Toll traffic is loosely tied to GDP, vehicle population, fuel
   price (elasticity), and regional economic activity. **But there is no toll-road traffic series
   in the store** — the closest CEIC prints (vehicle registrations, transport GDP value-added,
   HH transport consumption) are coincident, publication-lagged quantity prints. So the volume
   half of the identity is attribution, not forecast (fact mirrored in §3 and the wrong-sign fit).

5. **USD-debt portion creates a secondary FX channel.** Part of the project-debt stack and some
   equipment capex are USD-denominated, so IDR weakness raises interest/translation cost (a
   −sign), while the operating revenue is purely IDR toll income (no USD-earner offset). Net FX
   sign is **mildly negative** (importer/FX-debt side of `usdidr`), not the ambiguous 0 of a
   USD-earner exporter. It is second-order to rates.

6. **The basket is ONE small-cap name → idiosyncratic + flow noise.** META is a geared
   small-cap holding company; a large share of its monthly return is index-rebalance flow,
   liquidity, and corporate-action / asset-rotation idiosyncrasy that no macro series predicts.
   This caps the achievable systematic IC and is why even a "marginal" 0.10 forward IC is, in
   absolute terms, a thin single-name duration beta (see §8).

**What a sell-side analyst actually watches:** **the IDR govt 10Y yield and BI rate** (the
discount rate and refinancing cost — the #1 swing on the equity), **traffic volume growth per
concession** (operator monthly ops data — not in our store), **the biennial tariff-revision
schedule and the CPI print that feeds it**, **net debt / interest cover and the refinancing
calendar**, **new-concession capex and construction-loan availability** (the growth pipeline),
and **the USD-debt portion vs USD/IDR**. Of these, only the **yield curve, BI rate, CPI and
USD/IDR are high-frequency, liquid, leading series** — and the yield curve is the one that
actually forecasts.

---

## 3. DEMAND driver tree

> Demand = **toll traffic volume** (vehicles × km), whose cyclical parents are GDP, vehicle
> population, fuel price (elasticity) and regional activity. **In our data there is NO road-toll
> traffic series**; the available proxies are coincident, publication-lagged CEIC quantity prints
> (transport GDP value-added, HH transport consumption, vehicle registrations) — several of which
> fit WRONG-SIGN in the live run. Per IMPROVEMENT_PLAN §3, treat the entire volume tree as
> **attribution, not forecast.** The only *leading* demand parent is GDP/activity momentum, and
> it is weak.

```
DEMAND (revenue = traffic volume × regulated tariff)
├── D1 Traffic-volume PROXIES — coincident, no true road-traffic series ─► economic activity → toll usage
│     ├─ HH consumption: Transport & Comm ···  CEICI365764267 [demand, IDR bn, P3M, n=65]  sign +1, lag ~0 (pub-lag) — KEPT (pearson +0.26, theory_agree TRUE); household transport spend ≈ road usage. Best-in-fit demand leaf, but quarterly + coincident → attribution
│     ├─ HH consumption nominal: Transport ···  CEICI365764037 [demand, IDR bn, P3M, n=65]  sign +1 — KEPT (pearson +0.22, agree TRUE); nominal version (carries the tariff×volume = revenue blend)
│     ├─ Vehicle registrations ··············  CEICI487680667 [demand, Unit, P1M, n=48]  sign +1, lag ~1-3 — the vehicle-POPULATION parent of traffic (more cars ⇒ more toll trips). Short (n=48); fit −0.033 (below_gate) — weak
│     └─ id_gdp_real_q ····················  aIDGDPAR1 [demand, P1M-resampled, n=118]  sign +1, lag ~? — CURRENT seed "traffic volume" proxy; came out −0.073 (theory_agree FALSE). Whole-economy GDP is too coarse for a single toll asset → attribution at best
├── D2 Tariff ESCALATION (the regulated PRICE leg — revenue-POSITIVE, CPI-indexed) ─► inflation lifts the biennial tariff
│     ├─ id_cpi_yoy ······················  ECONOMICS:IDIRYY [demand/revenue, %, P1M, wk=183]  sign +1, lag ~12-24 ★toll tariffs rise every 2 yrs by a CPI formula → CPI is a REVENUE tailwind with a long lag (NOT the −1 consumer-squeeze sign). Currently STD_MACRO sign 0 → RE-ROLE to demand +1
│     └─ CPI: Transportation ···············  (id.json, 2022=100, P1M, n=41)  sign +1, lag ~12-24 — the transport-specific CPI sub-index; tighter proxy for the toll-escalation formula than headline CPI
├── D3 Fuel-price TRAFFIC ELASTICITY (the demand-side cost of driving) ─► dearer fuel → fewer trips
│     ├─ brent ························  ICEEUR:BRN1! [demand, wk=800]  sign −1, lag ~0-1 (leading price) — higher fuel cost suppresses discretionary road trips (elasticity); modest, and partly offset by subsidised retail fuel in ID
│     └─ (domestic Pertamina fuel price: Food-Retail-Prices block has Pertamina Dex IDR/l n=245 — administered/subsidised, sticky → document only)
└── D4 Activity / income backdrop ─► aggregate demand for mobility
      ├─ id_consumer_confidence ··········  aIDCONIAR [demand, Point, P1M, n=196]  sign +1, lag ~1-2 — discretionary-mobility sentiment (leads HH transport spend); a leading-ish survey parent of traffic
      └─ id_pmi ····················     aIDPMIMAQ [demand, %]  sign +1, lag ~1 — freight/commercial-vehicle toll usage tracks the industrial pulse
```

**Forecast hypothesis (demand): forward-FLAT and partly MIS-SIGNED today.** There is **no
leading road-traffic series**; every volume proxy (D1) is a coincident, publication-lagged
quantity print, and in the live fit the generic ones came out wrong-sign (`id_gdp_real_q`
−0.073, Makassar −0.059). The **only structurally forward demand branch is D2 — the CPI →
biennial-tariff escalation** — but its lead is *very long* (12–24 months) and stepwise, so it is
a slow revenue tailwind rather than a monthly timing signal. The honest read: **the demand tree
is an attribution tree.** Keep the theory-agreeing HH-transport-consumption leaves for *why a
quarter printed*; do not treat them as forecasters; re-role CPI to a +1 revenue tailwind.

---

## 4. SUPPLY / COST driver tree

> "Supply" for a toll road is **concession capacity** (lane-km in operation) — slow, capex-gated,
> endogenous to the operator and the government's road-build programme. The genuine high-frequency
> cost stack is **(a) the FINANCING cost on the huge debt load — by far the dominant cost line —
> and (b) construction-input cost on NEW concessions**. Per-unit operating cost is mostly fixed
> (high operating leverage), so the cyclical cost story is overwhelmingly *financing cost*, which
> is treated under §5 rates because it is the same duration channel.

```
SUPPLY / COST (capacity + cost stack → margin; cost is dominated by FINANCING)
├── C1 FINANCING cost (the dominant cost — leverage) ─► interest expense + refinancing on project debt
│     ├─ id_lending_rate ···············  ⚠ None (RESOLVER BUG) → REMAP to Lending Rate: Investment (% pa, P1M, n=397)  sign −1, lag ~0-1 — the bank investment-lending rate is the funding-cost proxy for a geared infra borrower
│     ├─ id_10y / id_05y ················  TVC:ID10Y / TVC:ID05Y [cost/macro, wk=798/795]  sign −1, lag ~0 — refinancing yield on new/rolled project bonds (ALSO the §5 discount-rate channel — same series, dual role)
│     └─ (see §5 M1 — financing cost and discount rate are the SAME duration channel)
├── C2 NEW-CONCESSION construction cost (growth-capex input) ─► steel/cement/coal feed road-build cost
│     ├─ steel_hrc ···················  NYMEX:HRC1! [cost, wk≈800]  sign −1, lag ~3-6 — rebar/steel in new toll construction (cross-ref Construction #29 / Metals #35)
│     ├─ wb_coal_au ··················  ICEEUR:ATR1! [cost, wk=800]  sign −1, lag ~3-6 — cement/energy input to road-build (API2 thermal coal; same proxy used in Construction)
│     └─ Construction Loans ···········  (id.json: Rupiah: Construction, IDR bn, P1M, n=292)  sign +1 (availability) / role demand-for-growth — credit for new toll concessions; availability gates the growth pipeline
├── C3 Concession capacity (the real "supply") ─► lane-km in operation — slow, endogenous
│     └─ (NO exogenous capacity series; lane-km is the operator's own balance sheet → ENDOGENOUS, exclude. Document only.)
└── C4 Maintenance / O&M cost ─► road maintenance, tolling-system labour
      └─ (mostly fixed; no clean leading series; second-order to financing cost)
```

**Forecast hypothesis (supply/cost): the only material cost is FINANCING, and it IS the rate
channel.** For a 70–80%-geared annuity, interest cost dwarfs operating cost, so the "cost"
forecast collapses into the duration/rate story in §5 — `id_10y`/`id_05y` −1 and the (bug-fixed)
investment-lending rate −1 are the forecastable cost branches. Construction-input cost (steel,
coal) and construction-loan availability matter only for the *new-concession growth pipeline*
(a slower, capex-cycle effect, lag 3–6m). Lane-km capacity is endogenous and must be **excluded**.

---

## 5. MACRO / RATE / FX / FLOW

> **This is the heart of the basket.** For a leveraged, regulated, long-duration annuity the
> macro that matters is, in order: **(M1) the IDR DISCOUNT RATE / yield curve — the dominant
> channel and the likely source of the marginal forward skill**, (M2) the global rate anchor
> (US10Y / Fed) that drives EM duration, (M3) USD/IDR via the USD-debt portion, and (M4)
> small-cap risk appetite / flow. The current seed captures only the *monthly policy rate*; the
> upgrade is to wire the **deep daily yield curve**, which leads.

```
MACRO / RATE / FX / FLOW
├── M1 IDR DISCOUNT RATE / yield curve — THE dominant channel (duration + refinancing) ─► geared annuity re-rates
│     ├─ id_10y ·····················  TVC:ID10Y [macro, P1D, wk=798]  sign −1, lag ~0-1 ★the discount rate on the long concession annuity AND the refinancing yield; daily, liquid, LEADS the equity. THE single highest-value add.
│     ├─ id_05y ·····················  TVC:ID05Y [macro, P1D, wk=795]  sign −1, lag ~0-1 — belly of the curve; corroborates 10Y (project-debt tenors cluster 5-10y)
│     ├─ id_30y ·····················  TVC:ID30Y [macro, P1D, wk=738]  sign −1 — ultra-long end matches concession life; thinner history
│     ├─ id_bi_rate ·················  ECONOMICS:IDINTR [macro, P1M, wk=186]  sign −1 ★CURRENT seed anchor (−1). Policy rate; stepwise/lagging vs the market curve. Scored 14.9 below_gate in-sample, BUT its a-priori −1 posture is part of what the forward backtest scores → KEEP, but lean on id_10y for the lead
│     └─ Long-Term 10Y Govt Yield (CEIC) ··  (id.json: Government Bond Yield: 10Y, % pa, P1M, n=212; PHEI daily tenors n=4282)  sign −1 — CEIC mirror of TVC:ID10Y; redundant, use TVC:ID10Y (deeper weekly coverage)
├── M2 GLOBAL rate anchor — EM duration co-moves with US real rates ─► global discount rate
│     ├─ us_10y ·····················  TVC:US10Y [macro, wk=800]  sign −1, lag ~0-1 — global risk-free; EM long-duration infra de-rates when US10Y rises (the global leg of the duration trade)
│     ├─ us_real_10y ················  DFII10 [macro, Real Yield, wk=800]  sign −1 — US 10Y REAL yield is the cleanest global duration anchor (cross-ref Pharma/Tower duration baskets)
│     └─ dxy ·······················  TVC:DXY (NOT TVC:BBDXY — empty) [macro, wk=800]  sign −1 — broad USD → EM small-cap outflow/de-rating; risk-appetite proxy
├── M3 FX — USD-DEBT portion (mildly NEGATIVE, not ambiguous) ─► IDR weakness raises USD interest/capex cost
│     └─ usdidr ····················  FX_IDC:USDIDR [macro, wk=801]  sign −1, lag ~0 — toll revenue is pure IDR (no USD-earner offset), but part of the debt/equipment capex is USD → IDR weakness is a net COST. STD_MACRO currently 0; RE-ROLE to −1 (mild). Fit −0.111 (below_gate) — empirically negative, consistent.
└── M4 RISK APPETITE / flow ─► single small-cap name is flow-sensitive
      ├─ jci ························  IDX:COMPOSITE — benchmark only, NEVER a driver (excess-return base)
      └─ (META is one small-cap: returns carry heavy index-rebalance flow + holding-co idiosyncrasy — unmodellable; caps systematic IC, §8)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Fed / US real 10Y (DFII10) ─► IDR govt 10Y yield (TVC:ID10Y, daily) ─► discount rate on the geared annuity ─► META re-rates
   (global anchor, daily)         (the LEAD — liquid, daily, wk=798)       (mechanical duration effect)          (equity moves)
                                            │
                                            └─► project-bond refinancing yield ─► interest cost ─► FCFE ─► equity (the leverage leg, same channel)

CPI YoY (ECONOMICS:IDIRYY) ─► biennial regulated tariff hike (every 2 yrs) ─► toll revenue ↑  (slow, 12-24m revenue tailwind)
```
The engine should lean on the **daily IDR 10Y yield (`id_10y`) as the leading driver** that
anticipates the geared annuity's re-rating — the textbook IMPROVEMENT_PLAN §1 "use the leading
liquid price to anticipate the lagging cashflow" move. **This is the plausible source of the
forward skill the backtest already detects**: the policy-rate anchor (`id_bi_rate`, −1) is in the
seed, but the daily curve is the higher-frequency, genuinely-leading version of the same channel.

**Forecast hypothesis (macro): the rate-duration channel IS the forecaster.** `id_10y` /
`id_05y` (−1) and `us_real_10y` (−1) are daily, liquid, exogenous, and *lead* a long-duration
geared annuity — exactly the profile of a forward-skilled driver, and exactly why forward IC
(+0.10) beats contemporaneous IC (+0.037) here. `usdidr` is mildly −1 (USD-debt cost). Everything
else (traffic proxies, transport GDP) is contemporaneous attribution.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Construction #29 (the sibling leveraged-SOE infra basket)** | `id_10y` (`TVC:ID10Y`); `id_bi_rate`; Construction Loans (`Rupiah: Construction`, n=292); `steel_hrc`, `wb_coal_au` | macro −1 / cost −1 / demand +1 | Toll Road and Construction share the **leveraged-SOE rate-duration** spine and the steel/cement build-cost stack. JSMR is effectively a Construction-adjacent SOE; the Construction seed already wires `id_10y` −1 — **Toll Road should mirror it.** New-toll capex flows through construction-loan availability. |
| **Banks #1 (financing cost, refinancing market)** | Lending Rate: Investment (% pa, n=397); `id_bank_credit` (`aIDLONYAR`); Govt Bond Yield 10Y (n=212 / PHEI n=4282) | cost −1 / macro | The toll operator's interest cost and refinancing terms are set in the bank/bond market — the investment-lending rate and the govt-bond curve are its funding-cost primitives. Fixes the `id_lending_rate`=None bug via the Banking block. |
| **Pharma #22 / Tower #48 (other duration / bond-proxy baskets)** | `us_real_10y` (`DFII10`); `id_10y`; `id_bi_rate` | macro −1 | These are the engine's other **rate-sensitive bond-proxy** baskets (defensive-duration). Toll Road belongs to the same family: its forward skill, like theirs, comes from the rate channel, not from operating cashflow. Tower (REIT-like duration) is the closest analogue. |
| **Auto #50 / Conglomerate (ASII) (vehicle population → traffic)** | Vehicle registrations (`CEICI487680667`, n=48); car-sales `aIDCARYAR` | demand +1 | The vehicle POPULATION is the structural parent of toll traffic (more cars ⇒ more trips). Domestic vehicle sales feed the registration stock that drives long-run traffic volume. Coincident/structural, attribution-grade. |
| **Oil & Gas / fuel (traffic elasticity)** | `brent` (`ICEEUR:BRN1!`); Pertamina Dex retail fuel (n=245, administered) | demand −1 | Fuel cost is the marginal cost of a road trip; dearer fuel suppresses discretionary toll traffic. Muted in ID by fuel subsidies, but the directional elasticity is real. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Discount rate — daily yield curve (THE channel)** | only `id_bi_rate` (−1, monthly policy rate) | **`id_10y` `TVC:ID10Y` (wk=798) −1**; `id_05y` `TVC:ID05Y` (wk=795) −1; `id_30y` `TVC:ID30Y` (wk=738) −1 | **P0 — the dominant channel and likely source of the forward skill; currently only the lagging monthly proxy is wired** |
| **Global rate anchor** | none | **`us_10y` `TVC:US10Y` (wk=800) −1**; `us_real_10y` `DFII10` (wk=800) −1; `dxy` `TVC:DXY` (wk=800) −1 | **P1 — EM duration co-moves with US real rates** |
| **Financing cost (leverage)** | none; `id_lending_rate`=**None** (BUG) | **REMAP `id_lending_rate` → Lending Rate: Investment (% pa, n=397) −1**; cross-ref `id_10y` (refi yield) | **P1 — fix the None resolver; financing cost is the dominant cost line** |
| **Tariff escalation (CPI-indexed PRICE leg)** | `id_cpi_yoy` sign 0 (STD_MACRO) | **RE-ROLE `id_cpi_yoy` → demand/revenue +1, long lag**; add CPI: Transportation (n=41) +1 | **P1 — toll tariffs rise with CPI every 2yrs; inflation is a REVENUE tailwind, not the default neutral/squeeze** |
| **Traffic-volume proxies (attribution)** | `("Transport & Logistics", None)` pulls sea-cargo/air-pax/rail/vehicle prints; `id_gdp_real_q` +1 | Keep HH-transport-consumption (`CEICI365764267/…037`) as **attribution +1**; DOWN-WEIGHT/exclude the non-road prints (sea cargo, air pax) that fit wrong-sign | **P2 — re-role, not add; these are coincident attribution** |
| **FX (USD debt)** | `usdidr` sign 0 (STD_MACRO) | **RE-ROLE `usdidr` → −1 (mild)** — USD-debt cost with no USD-earner offset | P2 |
| **New-concession build cost** | none | `steel_hrc` −1; `wb_coal_au` −1; Construction Loans (`Rupiah: Construction`, n=292) +1 | P3 — growth-pipeline, capex-cycle (lag 3-6m) |
| **Concession capacity (supply)** | none | **ENDOGENOUS** (operator's own lane-km) → exclude, do not model | exclude |
| **Toll-road TRAFFIC (the true volume series)** | none | **NONE in store** — no road-toll traffic count; operator monthly ops data is not ingested | document only — structural gap |
| **Tariff PRICE series** | none | **NONE** — administered, biennial steps; only the CPI escalator (above) is observable | document only |

**Bugs / resolver issues to call out:**
- **`id_lending_rate` → `None`** (`GLOBAL_CORR` line 60) — the brief's flagged bug. Remap to a
  real CEIC bank-lending rate, e.g. **Lending Rate: IDR: Commercial Banks: Investment (% pa,
  P1M, n=397)** from the Banking block — the financing-cost proxy this leveraged basket needs.
- **`dxy` → `TVC:BBDXY` is EMPTY (wk=0).** Use **`TVC:DXY` (wk=800, populated)** — either remap
  `dxy`→`TVC:DXY` in `GLOBAL_CORR` or cite `TVC:DXY` directly. (Same bug flagged across the
  Construction/Telco/Ports files.)
- **The `("Transport & Logistics", None)` CEIC pull is too broad and OFF-MODE.** It grabs
  sea-cargo tonnage, air-passenger traffic and railway freight — **none of which is road
  traffic** — and several fit wrong-sign (`International: Makassar` −0.059, `Ngurah Rai air pax`
  −0.077, both theory_agree FALSE). Narrow it to the road/transport-GDP/HH-transport subset and
  treat the rest as excluded noise, not as toll-demand forecasters.
- **Transport-&-Storage GDP value-added lines are partially ENDOGENOUS.** The kept set is
  dominated by `CEICI365752077` (GDP: Transport & Storage), `CEICI365765497` (GDP: Storage &
  Support), and their nominal twins — these are the *sector's own value-added*, so a toll
  operator's revenue is *inside* them. Use as attribution only; exclude from forward scoring if
  it leaks (this is why grade_reasons flags "theory-incoherent kept set").
- **1-name / mislabelling caveat (not a fixable resolver, but a routing bug):** **JSMR is tagged
  "Rail Transport" in market.json** and CMNP is absent from the worklist, so the basket is
  META-only. For any future re-bucketing, JSMR and CMNP should be routed into
  `infrastructure_toll_road` to make this a genuine multi-name toll basket.

---

## 8. Forecastability verdict

**This is the rare basket where the honest verdict is POSITIVE-but-thin: it has genuine, LEADING
forward skill (OOS = marginal, fwd IC +0.10, hit 0.489 vs up-rate 0.342, edge +0.147, placebo
pctile 0.87, n_oos 94), and — the diagnostic tell — forward IC (+0.100) EXCEEDS contemporaneous
IC (+0.037) with a much higher forward placebo pctile (0.87 vs 0.60). That inversion is the
signature of a real LEAD, and the mechanism is the rate-duration channel: the liquid daily IDR
yield curve moves BEFORE the geared, long-life regulated annuity re-rates.**

- **Why the rate channel LEADS (the central thesis).** A toll equity is the PV of a 30–40-year
  CPI-escalating annuity financed with 70–80% debt. Its price is mechanically dominated by the
  discount rate, and that rate (`TVC:ID10Y`, daily, liquid) is observable *before* the equity
  fully reprices and long before any cashflow print. This is the duration/leverage mechanism the
  brief identifies as "the dominant channel for a leveraged regulated infra asset" — and it is
  the most plausible source of the marginal forward IC. The current seed only carries the
  *lagging monthly policy rate* (`id_bi_rate`); wiring the **deep daily curve** is the change most
  likely to convert "marginal" into a cleaner forward signal.

- **Why traffic demand does NOT lead (the first concession).** There is **no road-toll traffic
  series** in the store; the proxies (transport GDP value-added, HH transport consumption,
  vehicle registrations) are coincident, publication-lagged quantity prints, and the generic ones
  fit wrong-sign (`id_gdp_real_q` −0.073, theory FALSE). The tariff-escalation channel (CPI →
  biennial hike) is genuinely revenue-positive but its lead is 12–24 months and stepwise — a slow
  fundamental tailwind, not a monthly timing signal. **The demand tree is attribution.**

- **Why the result is FRAGILE (the second, decisive concession — the 1-name caveat).** The basket
  is **a single small-cap name, META.** JSMR (the dominant SOE toll operator the basket is
  *supposed* to be built around) and CMNP are bucketed elsewhere. So the +0.10 forward IC is a
  **single-name duration beta** estimated over n_oos=94, not a diversified-sector signal: it
  carries META's idiosyncratic holding-company and index-flow noise, and could be partly luck of
  one name's path. The placebo pctile (0.87) clears the ~0.80 marginal bar but not the ~0.90 SKILL
  bar — appropriately, the system grades it "marginal", and the honest framing is "a thin,
  rate-led single-name duration beta", not "a robust sector forecaster".

- **Contemporaneous vs forward.** Uniquely here, the **forward** read is the stronger one
  (IC +0.10 vs +0.037 contemporaneous) — because the rate channel is a *lead*, not a
  co-movement. The coincident kept set (transport-GDP value-added) explains *why* a quarter
  printed (attribution) but carries less timing signal than the leading yield curve does.

**What would move it from marginal → SKILL (and make it robust):**
1. **Wire the deep daily yield curve** (P0): add `id_10y` `TVC:ID10Y` −1 (and `id_05y`/`us_real_10y`
   −1). Hypothesis: the daily curve is the leading version of the policy-rate channel and lifts the
   forward IC above the contemporaneous, sharpening the existing edge.
2. **Re-role CPI to a +1 revenue tailwind and FX to −1** (P1): set `id_cpi_yoy` → demand +1 (long
   lag, tariff escalator) and `usdidr` → −1 (USD-debt cost). These align the theory signs with the
   actual economics and should lift theory-agreement off 40%.
3. **Fix `id_lending_rate`=None → Investment lending rate −1** (P1): give the leverage/financing
   channel a real series.
4. **Down-weight the off-mode traffic prints to attribution** (P2): exclude sea-cargo/air-pax;
   keep HH-transport-consumption as attribution; do NOT chase in-sample sign-flips on coincident
   prints.
5. **Re-bucket JSMR + CMNP into the basket** (P2, routing): converts a fragile 1-name beta into a
   genuine multi-name toll basket and is the single biggest improvement to *robustness* (vs. IC).

**Honest ceiling.** Given (a) a real but thin rate-duration lead, (b) no leading traffic series and
a CPI escalator that only acts over 1–2 years, and (c) a **single small-cap name**, the realistic
ceiling is **modest (IC ~0.10–0.15)**, achievable by leaning hard on the daily yield curve and
accepting the rest as attribution. **The verdict is: Toll Road is a LEVERAGED REGULATED-UTILITY
DURATION PLAY whose marginal forward skill is genuine and rate-driven — but read it as a thin,
single-name (META) bond-proxy duration beta, not a diversified sector forecaster, until JSMR/CMNP
are routed in.** This is the cleanest example in the engine of forward skill coming from a *leading
discount-rate channel* rather than from operating cashflow.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Toll Road"]`:**
```python
"Toll Road": {  # LEVERAGED, REGULATED-UTILITY ANNUITY: value = PV of a 30-40yr CPI-indexed
                # toll stream financed with 70-80% debt -> long-duration BOND PROXY.
                # DOMINANT channel = the discount rate / yield curve (rate-sensitive twice:
                # via the annuity discount rate AND via interest on the debt). Forward skill
                # (fwd IC +0.10 > contemp +0.037) comes from the LEADING daily yield curve.
                # CAVEAT: basket is ONE name (META); JSMR (mislabelled "Rail Transport") + CMNP
                # are bucketed elsewhere -> single-name duration beta, not a diversified sector.
                # Traffic-volume prints are coincident/lagged -> attribution, not forecast.
    "ceic": [("Transport & Logistics", None)],   # broad pull; narrow via override/exclude below
    # Re-role: keep HH-transport-consumption as attribution demand; the off-mode sea/air prints
    # are NOT road traffic and fit wrong-sign -> exclude.
    "ceic_override": [
        ("hh consumption: transport",         "demand", +1),  # CEICI365764267 — household transport spend ~ road usage (attribution)
        ("hh consumption nominal: transp",    "demand", +1),  # CEICI365764037 — nominal (tariff x volume = revenue blend)
        ("vehicle registrations",             "demand", +1),  # CEICI487680667 — vehicle-population parent of traffic
    ],
    "ceic_exclude": [
        ("makassar"), ("tanjung priok"), ("tanjung perak"), ("belawan"),  # sea-cargo tonnage — not road traffic
        ("by airport"),                      # air-passenger traffic — wrong-sign, off-mode
        ("railway"), ("ton-km"), ("ton loaded"),  # rail freight — not road
        ("gdp: transport"), ("gdp nominal: transport"),       # sector's own value-added — ENDOGENOUS leak
        ("gdp: storage"), ("gdp nominal: storage"),           # same
        ("sea passenger"), ("road accident"),                 # noise mis-filed in T&L
    ],
    "globals": [
        # new-concession build-cost stack (growth pipeline, lag 3-6m)
        ("steel_hrc",   "cost", -1, "rebar/steel in new toll construction (cross-ref Construction #29)"),
        ("wb_coal_au",  "cost", -1, "cement/energy input to road-build (API2 thermal coal)"),
        ("brent",       "demand", -1, "fuel-price traffic elasticity: dearer fuel suppresses road trips"),
    ],
    "macro": [
        # ── DISCOUNT RATE / yield curve: THE dominant channel (the forward lead) ──
        ("id_10y",        "macro", -1, "IDR 10Y yield = discount rate on the long concession annuity AND refi yield (daily, LEADS) — the key add"),
        ("id_05y",        "macro", -1, "belly of curve; project-debt tenors cluster 5-10y"),
        ("id_bi_rate",    "macro", -1, "policy rate (current anchor; stepwise/lagging vs the market curve)"),
        # ── global rate anchor: EM duration co-moves with US real rates ──
        ("us_10y",        "macro", -1, "global risk-free; EM long-duration infra de-rates as US10Y rises"),
        ("us_real_10y",   "macro", -1, "US 10Y REAL yield = cleanest global duration anchor (REMAP/confirm DFII10)"),
        ("dxy",           "macro", -1, "broad USD -> EM small-cap outflow (REMAP to TVC:DXY; BBDXY empty)"),
        # ── financing cost (leverage): fix the None resolver ──
        ("id_lending_rate","cost", -1, "bank investment-lending rate = funding cost (REMAP from None -> Lending Rate: Investment, n=397)"),
        # ── tariff escalation: CPI-indexed PRICE leg is a REVENUE tailwind (not the squeeze sign) ──
        ("id_cpi_yoy",    "demand", +1, "toll tariffs rise with CPI every 2yrs -> inflation is a revenue tailwind (long lag); RE-ROLE from STD_MACRO 0"),
        # ── FX: USD-debt cost, no USD-earner offset -> mildly negative ──
        ("usdidr",        "macro", -1, "USD-debt/capex cost with pure-IDR revenue -> IDR weakness is a net cost (RE-ROLE from 0)"),
        # ── activity / traffic backdrop (attribution) ──
        ("id_gdp_real_q",  "demand", +1, "whole-economy traffic backdrop (coarse, attribution; came out wrong-sign — down-weight)"),
        ("id_consumer_confidence","demand", +1, "discretionary-mobility sentiment (leads HH transport spend)"),
    ],
},
```

**Resolver notes / required `GLOBAL_CORR` fixes:**
1. **`id_10y` / `id_05y` / `id_30y` resolve correctly** to `TVC:ID10Y` (wk=798) / `TVC:ID05Y`
   (wk=795) / `TVC:ID30Y` (wk=738) — **deep daily history, currently UNWIRED in the seed.** This
   is the single highest-value add: the leading discount-rate channel.
2. **`id_lending_rate` → `None`** (line 60) — **REMAP** to a real CEIC series: **Lending Rate:
   IDR: Commercial Banks: Investment (% pa, P1M, n=397)** from the Banking block (or add a tag
   `"id_lending_rate_inv": "<ric>"`). Without this the financing-cost branch silently drops.
3. **`us_real_10y` is not yet a `GLOBAL_CORR` tag** — add `"us_real_10y": "DFII10"` (US 10Y Real
   Yield, wk=800), or cite `DFII10` directly. `us_10y` → `TVC:US10Y` already resolves.
4. **`dxy` → `TVC:BBDXY` is EMPTY (wk=0).** Remap `"dxy": "TVC:DXY"` (wk=800) in `GLOBAL_CORR`,
   or the hint silently resolves to an empty series.
5. **`id_cpi_yoy` resolves** to `ECONOMICS:IDIRYY` (wk=183) — no resolver change; only the
   **ROLE/SIGN** changes (STD_MACRO 0 → demand +1, the tariff-escalation tailwind). For the
   transport-specific escalator, optionally add the CEIC `CPI: Transportation` (n=41) series.
6. **`steel_hrc`/`wb_coal_au`/`brent`/`usdidr`/`id_bi_rate`/`id_gdp_real_q`/`id_consumer_confidence`
   all resolve correctly** — no change (only `usdidr`'s sign re-role 0 → −1).
7. **Structural gaps (document, do not fake):** no road-toll TRAFFIC series; no tariff PRICE
   series (administered, biennial steps — only the CPI escalator is observable); no exogenous
   lane-km capacity (endogenous). Do not proxy these with fabricated numbers.
8. **Routing fix (out of scope for mapping.py, flag for re-bucketing):** JSMR (mislabelled "Rail
   Transport" in market.json) and CMNP should be routed into `infrastructure_toll_road` to make
   this a genuine multi-name toll basket. Until then, treat the output as a META-only proxy.

**Falsifiable backtest plan (`backtest/bt.py "Toll Road"`; keep a change only if forward IC improves
or holds with a richer, more honest tree):**
1. **Yield-curve add (the headline test):** add `id_10y` `TVC:ID10Y` (−1) and `id_05y` (−1).
   **Confirmation: forward IC rises above the current +0.10 AND the empirical sign comes out −
   (yield up ⇒ equity down), AND forward IC stays above contemporaneous IC** (the lead holds). If
   the daily curve does NOT beat the monthly `id_bi_rate`, the rate-lead thesis is weaker than
   claimed — but given the forward>contemp inversion already in the data, this is the most likely
   driver to confirm.
2. **CPI re-role:** flip `id_cpi_yoy` from 0 to demand +1 (long lag). **Confirmation: theory-agree
   rises off 40% and the sign comes out + at a 12-24m lag** (the biennial-escalator signature). If
   it fits −, the tariff-tailwind effect is dominated by the consumer-squeeze effect on traffic →
   leave at 0.
3. **FX re-role:** flip `usdidr` from 0 to −1. The live fit already shows `usdidr` −0.111
   (below_gate but negative), consistent — confirm the sign holds and document the USD-debt
   mechanism.
4. **Financing-cost add:** wire the Investment lending rate (−1) once the None resolver is fixed.
   Confirmation: sign − and it corroborates the `id_10y` channel.
5. **Traffic re-role sanity:** exclude the off-mode sea/air prints; verify the kept demand set is
   theory-coherent (HH-transport-consumption +1). Do NOT let an in-sample sign-flip promote a
   coincident traffic print to a forecaster.
6. **Honesty gate (the 1-name caveat):** because the basket is single-name META, require the
   improvement to **hold out-of-sample on n_oos≥90 AND survive after re-bucketing JSMR/CMNP in**
   before upgrading the verdict from "marginal" to "SKILL". If the +0.10 is META-idiosyncratic
   and does not replicate across JSMR/CMNP, label Toll Road a **thin single-name rate-duration
   beta (attribution-plus), not a robust sector forecaster** — consistent with §8 and how
   BACKTEST.md treats single-name / data-limited baskets.
