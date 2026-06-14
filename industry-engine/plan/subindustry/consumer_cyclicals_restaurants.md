# Restaurants (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_restaurants` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #41). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: this basket is the branded restaurant / F&B-service franchise arm of Indonesian
> household consumption — KFC, Pizza Hut, Starbucks, and a long penny tail of single-brand chains whose
> revenue is `outlet count × SSSG`, where SSSG = traffic (footfall × frequency) × ticket (ASP × mix). It
> is a discretionary–staple HYBRID: a quick-service-restaurant meal is more defensible than a Zara jacket
> but more deferrable than rice, so demand is governed by *consumer confidence + real income + the
> festive/Ramadan calendar + mall/mobility footfall*, while the margin is a brutal squeeze of
> *food-input COGS (chicken + cooking oil/CPO + wheat/flour + dairy + sugar + coffee) − labour (minimum
> wage) − rent*. The decisive, exploitable mechanism is the INPUT-COST → GROSS-MARGIN swing: F&B-service
> gross margins are thin and operating leverage is high, so a move in chicken/CPO/wheat shows up in
> EBIT within 1–2 quarters and the liquid commodity futures (`MYX:FCPO1!`, `CBOT:ZW1!`) LEAD that print.
> The honest problem on the demand side: SSSG is a coincident, sentiment-and-execution-driven number, the
> equity has usually already re-priced it, and the basket is half idiosyncratic (brand execution, store
> rollout pace, ENAK/BAIK micro-cap noise) — which is why the basket is forward-FLAT (fwd IC −0.006,
> contemp −0.03, placebo pctile 0.47, kept=12, grade perfected, OOS none). Verdict: the input-cost-margin
> branch is the only credible forecaster (and it is real); the demand/confidence branch is contemporaneous
> attribution; everything else is idiosyncratic. This is a margin-cycle basket wearing a discretionary-
> consumption coat — model the cost side as the forecast leg, the demand side as the explainer.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Restaurants**, sector *Consumer Cyclicals*, id `consumer_cyclicals_restaurants` |
| mcap | **~7.05T** (capsule #41 — among the smallest cyclical baskets), benchmark JCI |
| n_names | **9** real members |
| Top members (what each does) | **MAPB** (`IDX:MAPB`, 3.57T, β 0.355) — MAP Boga Adiperkasa: the **Starbucks Indonesia** master-franchisee (+ Krispy Kreme, Godiva, Pizza Express, Cold Stone); coffee/café-led, urban-mall, USD-and-coffee-input-exposed; **alone ≈ 51% of basket mcap** → the basket is *first and foremost a Starbucks proxy*. **FAST** (`IDX:FAST`, 1.04T, β 0.911) — Fast Food Indonesia: the **KFC** master-franchisee; chicken-QSR, the most chicken-input- and confidence-elastic name, highest β (0.91) → the cyclical core. **ENAK** (`IDX:ENAK`, 0.71T, β n/a) — Champ Resto Indonesia (Platinum/Penang Bistro/Ksana etc.); casual-dining multi-brand. **PZZA** (`IDX:PZZA`, 0.57T, β 0.485) — Sarimelati Kencana: the **Pizza Hut** master-franchisee; wheat-/cheese-/CPO-input-led QSR-casual. **BAIK** (`IDX:BAIK`, 0.56T, β **4.057**) — newly-listed single-brand chain; **β 4.06 is a thin-float listing artefact**, not a real cyclical beta → noise. **DUCK** (`IDX:DUCK`, 0.23T, β n/a) — Jaya Bersama Indo (Bebek Tepi Sawah/Boncafé); casual-dining. **PTSP** (`IDX:PTSP`, 0.20T, β n/a) — Pioneerindo Gourmet Intl: **CFC** (California Fried Chicken) + Sapo Oriental; chicken-QSR. **RAFI** (`IDX:RAFI`, 0.11T, β 0.474) — single-brand F&B. **CSMI** (`IDX:CSMI`, 0.07T, β n/a) — Cisarua Mountain (note: F&B-adjacent micro-cap). |
| Effective concentration | **MAPB + FAST + ENAK + PZZA ≈ 84% of mcap; MAPB alone ≈ 51%.** In practice the basket is a **Starbucks-café (MAPB) + chicken-QSR (FAST/PTSP) + pizza-QSR (PZZA) + casual-dining (ENAK/DUCK)** composite, dominated by one coffee/café name and one chicken name. The input stack therefore weights toward **coffee + dairy + USD (MAPB)** and **chicken + cooking oil + wheat (FAST/PZZA/PTSP)**. Three names have null/erratic β (BAIK 4.06 listing artefact, ENAK/DUCK/PTSP/CSMI n/a) → low cross-member coherence; the equal-weight engine basket is a *café-and-QSR margin-and-confidence composite*, not one clean business. |
| Current grade | **perfected** (in-sample), conf **medium** |
| Current kept-driver count | **12** (`_state.txt` line 42) — the seed's 8 priors survive the significance/theory gates in-sample, hence "perfected/kept=12", but this is in-sample confidence only. |
| Current forward OOS | **NONE — fwd IC −0.006** (`_state.txt`; BACKTEST.md row: −0.01), contemp IC **−0.03**, hit−up **−0.03**, **placebo pctile 0.47**, n_oos 129. **Forward-FLAT**: IC is statistically indistinguishable from zero and sits right at the placebo median (0.47). Note this is *not* strongly anti-predictive like Retail (−0.07, pctile 0.27) or Property (−0.08, 0.22) — Restaurants is **neutral/flat**, which is the honest signature of a basket whose one real signal (input-cost margin) is roughly cancelled by a coincident, sentiment-driven, half-idiosyncratic demand read. BACKTEST.md §"pattern" places sentiment/diversified consumer baskets in the "co-move contemporaneously but mean-revert → no forward skill" cluster; Restaurants is the *flat* (not negative) member of it. |

**Current seed (`mapping.py` → `SEED["Restaurants"]`, lines 409–417):**
```python
"Restaurants": {
    "ceic": [("Tourism", None), ("Consumer Staples", None)],
    "globals": [("wb_palm_oil", "cost", -1, "cooking oil"),
                ("wheat", "cost", -1, "flour input")],
    "macro": [("id_bi_rate", "macro", -1, "discretionary dining is rate/credit-elastic"),
              ("id_10y", "macro", -1, "consumer discretionary rate sensitivity"),
              ("id_cpi_yoy", "demand", -1, "food inflation squeezes dining-out"),
              ("id_gdp_real_q", "demand", +1, "dining spend")],
}
```

**The gap (five problems).**
1. **The input-cost stack is half-built — the single most-load-bearing branch.** The seed has only `wb_palm_oil` (CPO/cooking oil) and `wheat`. It is **missing the #1 input for the chicken-QSR leg (FAST/PTSP ≈ KFC/CFC): the chicken price** — and we hold a *daily* chicken-meat retail series with **n=2496** (`CEICI431223427`). It is also missing **sugar** (`ICE:SB1!`, beverages/desserts across all names), **coffee** (`ICE:KC1!`, the MAPB/Starbucks input — and MAPB is 51% of the basket), and a **dairy/milk** proxy (Starbucks/café + Pizza Hut cheese). For a basket whose *only* forecastable mechanism is input-cost → margin, an incomplete cost stack is the core defect.
2. **The CEIC pull is mis-pointed and noisy.** `("Tourism", None)` rakes in hotel/visitor-arrival/air-passenger prints (mobility is a *weak, second-order* footfall proxy for restaurants, mostly relevant to MAPB's mall/airport cafés — not a demand driver for KFC/Pizza Hut neighbourhood QSR). `("Consumer Staples", None)` drags in the **entire** staples block — rice/garlic/chili/onion price tickers that are NOT restaurant inputs alongside the few that are (chicken/cooking-oil/wheat/sugar/beef). The pull is wide and uncurated; the genuine input prices are buried and the genuine *demand* reads (consumer confidence + forward income intent) are unreachable from these two categories.
3. **No demand-confidence branch.** Dining-out is the most *deferrable* discretionary food category — it is governed by **consumer confidence and real income**, yet the seed has **no `id_consumer_confidence`** and no forward-intent survey series (expected income, household spend-vs-save allocation). It proxies demand only with coarse quarterly `id_gdp_real_q` (+1) and a negative `id_cpi_yoy` (−1). The confidence block (CCI n=196 + forward-intent n=168) is held and unused.
4. **The rate branch is over-weighted vs the mechanism.** The seed leads with `id_bi_rate` (−1) + `id_10y` (−1) on a "dining is rate/credit-elastic" rationale. That is **weaker for restaurants than for big-ticket retail**: a KFC bucket is a cash, low-ticket, *non-financed* purchase. Rates matter for *outlet-expansion capex financing* (a slow, second-order channel), not for the marginal meal. Keep rates as a duration/financing cross-check, not the demand spine.
5. **The forecast edge is unexploited and unsequenced.** The input-cost → gross-margin lag — the one genuinely leading, exploitable mechanism — is present as a raw, contemporaneous cost prior (CPO/wheat) but is **not lagged**, **not completed** (no chicken/coffee/dairy), and **not tagged** as the forecast leg. The liquid futures lead the realised COGS/margin print by 1–2 quarters; the seed treats them as same-month.

This file rebuilds the tree as: a **complete input-cost stack** (chicken + CPO/cooking-oil + wheat + sugar + coffee + dairy proxy — the forecast leg), a **consumer-confidence + forward-intent demand spine** (attribution + the only forward demand hope), a **labour/rent fixed-cost note** (min-wage, structural), a thin **rate/FX/mobility macro branch**, an explicit **festive-seasonality concession**, and an honest forward-flat verdict.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (branded restaurant / F&B-service franchise):**
```
Revenue        = Σ_outlet (Sales per outlet) = Outlet count × Transactions × Average ticket
               ≈  Outlet count × SSSG-grown base        (SSSG = same-store-sales growth = traffic × ticket)
                  └ traffic = footfall × frequency        (confidence / income / mall-mobility / habit-driven)
                  └ ticket  = ASP × mix × upsell           (pricing power / premiumisation / promo intensity)
Gross profit   = Revenue × food-GM         (food-GM = 1 − food-COGS/Revenue; COGS = chicken, CPO, flour, dairy, sugar, coffee, packaging)
Store EBITDA   = Gross profit − labour − rent − utilities − royalty(franchise fee, often USD/% of sales)
EBIT           = Store EBITDA − D&A (fit-out) − HQ overhead − pre-opening cost
Net income     = EBIT − interest (expansion capex debt/leases) − tax
Equity value   ≈ PV(SSSG × outlet-rollout pipeline × store-margin) at a consumer-discretionary WACC
```

Seven structural facts drive the modelling:

1. **SSSG = traffic × ticket is the north star, and it is coincident + idiosyncratic.** Sell-side prices these names off **same-store-sales growth** and the **net-new-outlet pipeline**. SSSG is driven partly by macro (confidence, income, festive calendar) and partly by **brand execution** (new menu, value bundles, delivery-app penetration, service quality) and **rollout pace** — the idiosyncratic half a macro engine cannot see. The equity typically re-prices forward SSSG on the earnings call, so by the time the coincident demand prints arrive the move is done. **This is why the demand side does not forecast.**

2. **Thin food-GM + high operating leverage → the margin is the swing, and it IS observable.** Unlike a Zara-retailer (imported finished goods), a restaurant *transforms commodities into meals*: chicken, cooking oil, flour, cheese, coffee, sugar are a large, **volatile, directly-priced** share of COGS. Food-GM is thin and rent/labour are largely fixed, so a swing in input prices flows hard to EBIT. Critically, **the inputs are liquid, exogenous, daily futures (`MYX:FCPO1!`, `CBOT:ZW1!`, `ICE:SB1!`, `ICE:KC1!`) plus daily CEIC domestic chicken/beef/oil prices** — they *lead* the realised COGS/margin print by 1–2 quarters. **This is the one genuinely leading, forecastable mechanism in the basket.**

3. **Discretionary–staple hybrid → mid-cyclical, not deep-cyclical demand.** A QSR meal sits between rice (staple, near-inelastic) and a luxury good (deeply cyclical). In downturns consumers *trade down* (skip Starbucks → kopi-kiosk; KFC dine-in → home-cooked) but rarely zero out — so demand has a defensive floor and a cyclical top. β confirms the spread: FAST (KFC) β 0.91 (cyclical), MAPB (Starbucks) β 0.36 (more defensive/premium-loyal), PZZA β 0.49. The hybrid nature mutes the demand-side macro signal (less amplitude than apparel/durables) while leaving the cost-side signal intact.

4. **Per-leg input asymmetry (the basket has TWO distinct cost profiles).** (a) **Chicken-QSR (FAST/PTSP ≈ KFC/CFC):** chicken meat is the dominant input → most exposed to the **broiler/chicken price** (cross-ref the Poultry basket — corn + soymeal feed drive broiler cost, so a chicken-QSR is *short* the same chain Poultry is *long*). Cooking oil (CPO) and flour (batter/buns) matter too. (b) **Café/coffee (MAPB ≈ Starbucks, 51% of mcap):** the inputs are **coffee beans + dairy/milk + sugar + USD** (Starbucks royalty/brand fees and some inputs are USD-linked). (c) **Pizza (PZZA):** **wheat (dough) + dairy (cheese) + CPO**. A single cost posture cannot fit all three — but chicken + CPO + wheat + sugar + coffee + USD together span the stack.

5. **USD enters twice — input cost AND franchise royalty.** Master-franchisees pay **royalty/brand fees as a % of sales, often USD-referenced** (Starbucks, KFC, Pizza Hut are foreign brands), and some premium inputs (coffee, dairy, specialty) are imported. A weaker IDR raises both → `USD/IDR` is a **−1 cost/margin headwind** (importer-style sign, opposite to an exporter), strongest for MAPB.

6. **Labour + rent are the other half of the cost base — and labour is a policy variable.** Store-level staff cost is large and is floored by the **provincial minimum wage** (annual administrative hike, urban-Jakarta-led). Rent (mall/high-street leases) is fixed and CPI-linked. Both compress margin when they rise faster than menu pricing. Min-wage is a genuine cost driver but the only series is **annual (n≈36)** → structural note, not a wireable monthly leaf.

7. **Festive seasonality + the idiosyncratic micro-cap tail.** Ramadan/Lebaran *shifts* demand (iftar/buka-puasa drives QSR traffic up; some fine-dining down during fasting hours) and the THR bonus pulses café/treat spend — a **calendar effect** captured by seasonal/YoY differencing, not a macro series. And the basket carries **erratic micro-caps** (BAIK β 4.06 listing artefact; ENAK/DUCK/CSMI null β) whose returns are dominated by float/liquidity/news, not macro — pure idiosyncratic noise the engine cannot model.

**What a sell-side analyst actually watches:** per-name **SSSG** (traffic vs ticket split) and **net-new-outlet adds / rollout capex**; **food gross margin** and the **input basket** (chicken, CPO, flour, cheese/dairy, coffee, sugar) vs **menu-price/pass-through**; **delivery-app mix** (GoFood/GrabFood take-rate); **labour cost / min-wage hikes** and **rent**; **consumer confidence** (esp. expected income) and **real wages**; **USD/IDR** (royalty + imported inputs); **festive/Ramadan timing**. Of these, only the **commodity input futures + USD/IDR** are high-frequency leading prices (forecast candidates); SSSG, confidence, and wages are coincident-to-lagging.

---

## 3. DEMAND driver tree

> Demand = real household *dining-out* spend = `confidence × real income × footfall/mobility × festive-calendar`,
> a discretionary–staple hybrid (mid-elasticity). The observable reads are the **Consumer-Confidence block**
> (CCI + sub-indices, n=196) and the **forward-intent survey** (expected income, household spend-vs-save
> allocation, n=168). The honest economics: the *level/present-situation* series are coincident-to-lagging and
> the equity has already re-priced forward SSSG, so they ATTRIBUTE but do not forecast; the only demand leaves
> with a credible lead are the *ex-ante intent* series. ⚠ The confidence/intent block lives in the CEIC `idind`
> inventory but NOT in the `Tourism`/`Consumer Staples` categories the current pull targets — it must be wired
> via the `id_consumer_confidence` resolver and/or a dedicated CEIC pull (see §7/§9).

```
DEMAND (dining-out spend = confidence × income × footfall × festive)
├── D1 CONSUMER CONFIDENCE — present situation (coincident sentiment) ─► willingness to eat out
│     ├─ Consumer Confidence Index ······ id_consumer_confidence → aIDCONIAR (≈ CEICI277372502) [dem, Point, P1M, wk=524 / n=196] sign +1, lag ~0-1 ★headline CCI
│     ├─ CCI: Present Situation ········· CEICI277372602 [dem, Point, P1M, n=196] sign +1, lag ~0 (current-conditions read)
│     ├─ CCI: Current Income ············ CEICI277372802 [dem, Point, P1M, n=196] sign +1, lag ~0 (realised purchasing power)
│     └─ CCI: Buying Condition (durables) CEICI277372902 [dem, Point, P1M, n=196] sign +1 — proxy for discretionary-spend appetite (café/treat is on the same axis)
│        ⚠ caveat: present-situation CCI is COINCIDENT survey sentiment; it confirms the cycle the equity has already priced → attribution, weak forecast.
├── D2 CONSUMER CONFIDENCE — EXPECTATIONS / INTENT (the FORWARD leaves — the only real demand lead) ★
│     ├─ CCI: Expectations Index ········ CEICI277372702 [dem, Point, P1M, n=196] sign +1, lag ~1-3 ★6-month-ahead expectation composite
│     ├─ CCI: Expected Income ··········· CEICI277373102 [dem, Point, P1M, n=196] sign +1, lag ~1-3 ★forward income intent — what households EXPECT to be able to spend
│     ├─ HH Expense Allocation: % Consumption  CEICI373675837 [dem, %, P1M, n=168] sign +1, lag ~1-2 ★share of budget households PLAN to spend (vs save)
│     ├─ HH Expense Allocation: % Savings ···· CEICI373675857 [dem, %, P1M, n=168] sign −1 (rising savings intent = deferred discretionary dining)
│     └─ HH Expense Allocation: % Loan Repay ·· CEICI373675847 [dem, %, P1M, n=168] sign −1 (debt-service crowding out eating-out budget)
│        mechanism: D2 are EX-ANTE intent — they describe what households PLAN, leading realised dining traffic by 1-3 months. This is the ONLY demand branch
│        with a credible forward claim; everything else is a level/sentiment print that confirms rather than leads.
├── D3 REAL INCOME / PURCHASING POWER (the budget constraint) ─► wages vs food inflation
│     ├─ CPI YoY ····················· id_cpi_yoy → ECONOMICS:IDIRYY [dem(-), %, P1M, wk=183]  sign −1 (current seed; food/energy inflation squeezes the eating-out budget)
│     ├─ Real GDP YoY ················ id_gdp_real_q → aIDGDPAR1 [dem, %, P3M, wk=515] sign +1 (current seed; coarse quarterly consumption backdrop)
│     └─ Min/Net Wage (structural) ··· (annual only, n≈36 — see §4 C-labour) sign +1 — real-wage level drives dining frequency; TOO SLOW to wire, structural note
├── D4 FOOTFALL / MOBILITY (where the dining occurs — weak, MAPB-skewed) ─► outlet traffic
│     ├─ Visitor Arrivals: Total ······ CEICI195568102 [dem, Person, P1M, n=568] sign +1, lag ~0 — tourist/airport/mall café traffic (MAPB-relevant; weak for neighbourhood QSR)
│     ├─ Air Passenger: Domestic ······ CEICI14579501 [dem, Person, P1M, n=401] sign +1 — domestic mobility proxy (airport F&B, mall footfall correlate)
│     └─ (Tourism block, current seed) — mobility is a SECOND-ORDER footfall proxy: relevant to MAPB malls/airports, largely irrelevant to KFC/Pizza Hut neighbourhood QSR. Low weight.
└── D5 FESTIVE / SEASONAL DEMAND (Ramadan/Lebaran/THR — first-order, but a CALENDAR) ★
      └─ (no driver series) — Ramadan SHIFTS demand (iftar/buka-puasa QSR spike; fasting-hour dine-in dip) and the THR bonus pulses café/treat spend. The single largest
         intra-year swing in mix/timing, but a CALENDAR effect captured by seasonal-adjustment / YoY differencing, NOT a macro series. Document as structural; a weak
         proxy is the Q1-Q2 seasonal pattern in D1/D3. Lunar-calendar drift of Lebaran cannot be wired → a structural reason a macro engine under-explains month-to-month.
```

**Forecast hypothesis (demand): mostly attribution; the one thin hope is the D2 intent branch.**
D1 (present-situation CCI) and D3 (CPI/GDP) are **coincident-to-lagging** reads that confirm the consumption cycle the
equity has already priced via forward SSSG — loading on them produces a posture that drifts with sentiment and reverts
against returns OOS (the mechanical recipe for a flat/slightly-negative forward IC). D4 (mobility) is weak and MAPB-skewed.
**The only branch with a credible forward claim is D2 — the *ex-ante intent* series** (expected income, household
spend-vs-save allocation): these describe what households *plan*, leading realised dining traffic by 1–3 months. Even so the
lead is short, noisy, and the basket is half-idiosyncratic (brand execution). **Net: anchor demand on D2 (intent, the only
forecast candidate) + 1 D1 print (CCI, attribution); demote CPI/GDP/mobility to attribution and do NOT let the coincident
sentiment tree dominate — its contemporaneous-correct-but-forward-reverting drift is part of why the basket is forward-flat.**

---

## 4. SUPPLY / COST driver tree

> A restaurant transforms **commodities into meals**: the cost stack is **food-input COGS (chicken + cooking-oil/CPO +
> wheat/flour + dairy + sugar + coffee + packaging) + labour (min-wage) + rent + USD royalty/imports + financing.** Unlike
> a retailer, the decisive cost is a basket of **liquid, exogenous, daily commodity prices** — and because food-GM is thin and
> operating leverage high, the input-price → gross-margin lag is the **one genuinely leading, forecastable mechanism** in the
> whole tree. THIS is the forecast leg. Every input below is either a liquid global future (deep weekly history) or a daily
> CEIC domestic price (n≈2,500); both LEAD the realised COGS/margin print by ~1–2 quarters.

```
SUPPLY / COST (food inputs + labour + rent + USD + financing) — THE FORECAST LEG ★
├── C1 CHICKEN — the #1 input for the QSR leg (FAST/PTSP ≈ KFC/CFC) ─► broiler/chicken price ★
│     ├─ Chicken Meat: Traditional Market  CEICI431223427 [cost, IDR/kg, P1D, n=2496] sign −1, lag ~1-2q ★the chicken-QSR input; rising chicken price → COGS squeeze
│     ├─ Purebred Chicken (retail) ······· CEICI230930202 [cost, IDR/kg, P1M, n=234]  sign −1 (monthly broiler retail; lower-freq corroborant)
│     └─ Chicken Meat: Producer ·········· CEICI454659447 [cost, IDR/kg, P1D, n=1849] sign −1 (producer-gate price; upstream of retail)
│        cross-ref Poultry basket: chicken cost ← corn (CBOT:ZC1!) + soymeal (CBOT:ZM1!) feed. A chicken-QSR is SHORT the chain Poultry is LONG → corn/soymeal are a
│        2-level-up parent of FAST/PTSP margin (feed ↑ → broiler ↑ → QSR COGS ↑). The DAILY chicken price LEADS the QSR's quarterly COGS print.
├── C2 COOKING OIL / CPO — frying input across ALL QSR names ─► palm-oil price ★
│     ├─ wb_palm_oil ················· wb_palm_oil → MYX:FCPO1! [cost, P1D, wk=800]  sign −1, lag ~1-2q ★current seed; the cleanest leading frying-oil cost (liquid future)
│     └─ Cooking Oil: retail (domestic) CEICI432477457 / CEICI432365897 [cost, IDR/kg, P1D, n=2512 / 2472] sign −1 — domestic pass-through of CPO (corroborant)
│        ⚠ verify resolver loads MYX:FCPO1! (wk=800), NOT the EMPTY BMFBOVESPA:FCPO1! (wk=0). The Brazilian CPO mirror is empty in the store.
├── C3 WHEAT / FLOUR — dough/batter/buns (PZZA pizza, FAST/PTSP coating, MAPB pastry) ─► wheat price ★
│     └─ wheat ······················ wheat → CBOT:ZW1! [cost, P1D, wk=800]  sign −1, lag ~1-2q ★current seed; CBOT wheat → imported flour (ID imports ~all milling wheat)
│        mechanism: Indonesia mills imported wheat; CBOT wheat + USD/IDR set the landed flour cost → buns/dough/coating COGS. Liquid daily future LEADS the margin print.
├── C4 SUGAR — beverages, desserts, sauces (all names; MAPB/café-heavy) ─► sugar price
│     ├─ wb_sugar_world ············· sugar → ICE:SB1! [cost, P1D, wk=800]  sign −1, lag ~1-2q ★MISSING from seed; global sugar #11 → sweetened-beverage/dessert COGS
│     └─ Sugar: retail (domestic) ··· CEICI432490317 [cost, IDR/kg, P1D, n=2511] sign −1 — domestic retail sugar (DMO-distorted but corroborant)
├── C5 COFFEE — the MAPB / Starbucks input (51% of basket mcap) ─► coffee bean price ★
│     └─ coffee ······················ coffee → ICE:KC1! [cost, P1D, wk=800]  sign −1, lag ~1-2q ★MISSING from seed; Arabica → Starbucks/café bean COGS (MAPB-specific, but MAPB is 51%)
│        ⚠ do NOT use wb_coffee_robusta → ICE:RC1! (EMPTY, wk=0). Use ICE:KC1! Arabica (wk=800) — same robusta-empty bug flagged in the Food & Beverage file.
├── C6 DAIRY / MILK — café milk (MAPB) + pizza cheese (PZZA) ─► milk price ─► (no clean series)
│     └─ (no wireable milk future — CME:DC1! class-III milk is EMPTY in the store; the F&B file notes the same gap). Dairy is a real MAPB/PZZA input but UN-WIREABLE.
│        Weak proxy: USD/IDR (much specialty dairy/cheese imported) → captured in C7. Note only.
├── C7 USD — imported inputs + franchise royalty (% of sales, USD-referenced) ─► IDR level ★
│     └─ usdidr ······················ usdidr → FX_IDC:USDIDR [cost/macro, P1D, wk=801] sign −1, lag ~0-1 ★MISSING from seed; weak IDR raises imported-input COGS AND USD royalty fees
│        mechanism: Starbucks/KFC/Pizza Hut royalty + brand fees are %-of-sales, often USD-referenced; specialty coffee/dairy/equipment imported. ↑USD/IDR → ↑COGS + ↑royalty → margin squeeze.
│        Daily, exogenous, LEADS the margin print. Sign −1 (importer/licensee, NOT exporter) — the dominant FX channel here, strongest for MAPB.
├── C8 LABOUR — store crew cost, floored by minimum wage (structural) ─► wage policy
│     └─ Provincial Minimum Wage (avg) [cost, IDR, P1Y, n≈36] sign −1 — ANNUAL administrative hike (urban-Jakarta-led); large fixed-cost lever but TOO SLOW to wire → structural note.
│        CPI YoY (id_cpi_yoy) is the only monthly proxy for the rent+labour+utilities fixed-cost drift (dual role with D3 demand-squeeze; do not double-weight).
└── C9 RENT / OCCUPANCY — mall/high-street lease (fixed, CPI-linked) ─► (no clean series)
      └─ (no wireable commercial-rent series at monthly freq). Captured loosely by CPI. Note only; immaterial vs the food-input stack at the monthly horizon.
```

**Forecast hypothesis (supply/cost): THIS is the forecast leg — a complete, lagged input-cost basket.**
The basket transforms commodities into meals, so its decisive, *observable* cost is the **food-input stack (C1 chicken + C2
CPO + C3 wheat + C4 sugar + C5 coffee)**, every leaf of which is a **liquid, exogenous, daily price that LEADS the realised
COGS/gross-margin print by ~1–2 quarters**. This is exactly the "liquid price leads the equity" pattern IMPROVEMENT_PLAN §3
rewards and the mechanism that gives the *Poultry* basket its +0.22 forward IC (Restaurants is the mirror: short the protein
chain Poultry is long). Completing the stack (add **chicken — the #1 missing input — plus sugar + coffee + USD**) and **lagging
the cost priors ~1–2 quarters** is the single highest-value change in this file. `usdidr` (−1) is the FX overlay (imported inputs
+ USD royalty). **Net cost forecast candidates: chicken (−1), CPO/`wb_palm_oil` (−1), wheat (−1), sugar (−1), coffee (−1), `usdidr`
(−1) — all lagged ~1–2q. The honest caveat: even a perfect cost read only forecasts the MARGIN, and margin is one input to an
equity also driven by coincident SSSG sentiment and idiosyncratic execution — which is why the net forward IC is flat, not strongly positive.**

---

## 5. MACRO / RATE / FX / FLOW

> For a discretionary–staple-hybrid F&B basket, the systematic core is **FX (imported inputs + USD royalty) + the consumption/
> confidence backdrop + a secondary rate channel (expansion-capex financing, NOT marginal-meal demand).** The FX series and the
> input commodities (§4) are the only liquid, daily, *leading* drivers; the rate and consumption series are coincident or
> second-order. Note the rate channel is materially WEAKER here than for big-ticket retail (a QSR meal is cash, not financed).

```
MACRO / RATE / FX / FLOW
├── M1 FX — imported inputs + USD royalty (the leading macro cost, dual role with C7) ─► IDR level ★
│     ├─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1, lag ~0-1 ★weak IDR raises imported-input COGS + USD franchise royalty → margin squeeze
│     └─ DXY ························· dxy → TVC:DXY [P1D, wk=800]  sign −1 (broad USD → IDR pressure + EM consumer-cyclical risk-off)
│        ⚠ resolver bug: GLOBAL_CORR["dxy"] = "TVC:BBDXY" is EMPTY (wk=0). Remap to TVC:DXY (wk=800), or the dxy global resolves to nothing. (Same bug as Retail/Internet/Telco files.)
├── M2 RATE — expansion-capex financing + duration (SECONDARY for restaurants) ─► policy + curve
│     ├─ BI policy rate ············· id_bi_rate → ECONOMICS:IDINTR [P1M, wk=186]  sign −1, lag ~1-3 — current seed; rate-elastic for OUTLET-ROLLOUT capex, not marginal-meal demand
│     │     (longer monthly alt: aIDRREP7DR "7D Reverse Repo" wk=524 is deeper-history than the short ECONOMICS:IDINTR wk=186 — prefer for a stable rate read.)
│     └─ ID 10Y yield ··············· id_10y → TVC:ID10Y [P1D, wk=798]  sign −1, lag ~0-1 — current seed; daily duration proxy / financing cost for expansion debt + leases
│        mechanism: restaurants finance OUTLET EXPANSION (fit-out capex + leases), not the meal. ↓rates → cheaper rollout → forward outlet adds. A real but SLOW, second-order
│        channel. DEMOTE from the demand spine (the seed over-weights it) to a financing/duration cross-check. The daily yield leads the slow capex-pipeline decision.
├── M3 CONSUMPTION / DEMAND BACKDROP (coincident) ─► domestic spend cycle
│     ├─ Real GDP YoY ··············· id_gdp_real_q → aIDGDPAR1 [P3M, wk=515]  sign +1 (current seed; coarse consumption backdrop)
│     ├─ Consumer Confidence ········ id_consumer_confidence → aIDCONIAR [Point, P1M, wk=524]  sign +1 ★MISSING from seed — the willingness-to-dine-out pulse (see §3 D1)
│     └─ Retail Sales YoY ··········· id_retail → aIDRSLSAR [%, P1M, wk=524]  sign +1 — coarse household-spend activity proxy (corroborant)
└── M4 GLOBAL RISK / FLOW (mid-beta consumer cyclical) ─► EM appetite
      └─ DXY / risk-off (see M1) — consumer cyclicals are mid-beta to EM equity flow; strong USD → outflow headwind. Secondary; captured by dxy/usdidr.
```

**Sub-driver chain (the leading→lagging logic the engine should exploit — note it is the COST chain that leads):**
```
corn/soymeal feed (CBOT:ZC1!/ZM1!)  ──►  broiler/chicken price (CEICI431223427, daily)  ──►  QSR food COGS (quarterly)  ──►  gross margin  ──►  basket (FAST/PZZA/PTSP)
CPO/wheat/sugar/coffee futures (daily) + USD/IDR  ──►  landed input cost  ──►  food COGS  ──►  margin  ──►  basket
   (LIQUID, EXOGENOUS, DAILY — LEAD by ~1-2q)              (CEIC daily, leads)        (earnings)        (the equities)
```
The engine should lean on the **leading commodity/FX prices to anticipate the slow COGS/margin child** — the same pattern that
makes Poultry forecastable. The contrast with a *clean* forecaster (Coal, Poultry) is that here the leading cost prices only set
the **margin**, while the equity is ALSO governed by **coincident SSSG sentiment + idiosyncratic execution/rollout** that the cost
chain doesn't touch — so the cost-side forward signal is real but **partially cancelled** at the basket level, producing a flat net IC.

**Forecast hypothesis (macro): FX is the leading macro driver; rates are a second-order capex cross-check.**
`usdidr` (−1) + `dxy` (−1, after the resolver fix) are the best macro forward candidates — liquid, daily, and they lead the
imported-input + royalty margin channel. The **rate branch the current seed leads with is over-weighted**: it is a slow,
second-order *expansion-capex* channel for restaurants (a cash QSR meal is not rate-elastic), so it should be demoted to a
financing/duration cross-check, not the demand spine. The consumption backdrop (GDP/CCI/retail) is coincident attribution.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Poultry** (#42) | `corn` CBOT:ZC1! (wk=800), `soybean_meal` CBOT:ZM1! (wk=800); domestic **Chicken Meat** CEICI431223427 (n=2496) | cost −1 | **The most important cross-link.** A chicken-QSR (FAST/PTSP) is **short the same feed→broiler chain Poultry is long**. Corn + soymeal feed (~70% of broiler cost) are a 2-level-up parent of the chicken-QSR margin: feed ↑ → broiler price ↑ → QSR COGS ↑. Poultry's +0.22 forward IC comes from exactly this chain — Restaurants can borrow the daily chicken price (and feed parents) as a leading cost read. |
| **Plantation** (#12) | `wb_palm_oil` MYX:FCPO1! (wk=800) | cost −1 | Cooking-oil/frying COGS across all QSR names. Plantation is *long* CPO (revenue); Restaurants are *short* CPO (cost) — opposite sign on the same liquid price. Already in the seed; the cleanest leading frying-oil cost. |
| **Food & Beverage** (#6) | `wheat` CBOT:ZW1!, `wb_sugar_world` ICE:SB1!, `coffee` ICE:KC1! | cost −1 | Restaurants share the branded-F&B input stack (wheat/flour, sugar, coffee). Same series the F&B map uses; here applied to the dough/batter (PZZA/FAST) + sweetened-beverage (MAPB café) + coffee (MAPB Starbucks) legs. Inherit the F&B file's input-cost lag treatment and the robusta-empty caveat. |
| **Leisure / Tourism** (#27) | **Visitor Arrivals** CEICI195568102 (n=568), **Air Passenger** CEICI14579501 (n=401) | demand +1 (weak) | Tourist/airport/mall footfall is a **second-order** traffic proxy — relevant to MAPB's mall/airport cafés, largely irrelevant to neighbourhood KFC/Pizza Hut. The current `("Tourism", None)` pull over-weights this; demote to a low-weight footfall corroborant. |
| **Retail** (#21) / consumption | `id_consumer_confidence` aIDCONIAR, CCI forward-intent (CEICI277373102, CEICI373675837/857/847), `id_retail` aIDRSLSAR | demand +1 / ±1 | The discretionary-consumption demand block — confidence + forward-income-intent + spend-vs-save allocation — is shared with the Retail map (where it is also the only forward-demand hope). Here it is the dining-out willingness proxy. Lives in `idind`, unreachable from the current Tourism/Staples pull. |
| **CPI / macro** | `id_cpi_yoy` ECONOMICS:IDIRYY, `id_gdp_real_q` aIDGDPAR1 | demand −1 / +1 | Real-income squeeze (food inflation crowds out eating-out) + coarse consumption backdrop. Already in seed. CPI has a dual role: demand-squeeze AND rent/labour fixed-cost drift. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC pull (mis-pointed/noisy)** | `("Tourism", None)` + `("Consumer Staples", None)` → hotels/visitor/air-pax + the whole staples block (rice/garlic/chili noise) | **RE-POINT/CURATE**: keep `Consumer Staples` but `ceic_override` only the genuine inputs (chicken/cooking-oil/beef) UP to cost, `ceic_exclude` the non-input price tickers (garlic/onion/chili/rice); demote `Tourism` to a low-weight footfall proxy. | **P0 — the pull is wide and uncurated** |
| **Chicken input (THE #1 missing input)** | **none** | **Chicken Meat: Traditional Market** CEICI431223427 (−1, daily, n=2496) — the dominant input for the FAST/PTSP (KFC/CFC) leg; +`CEICI230930202` monthly corroborant | **P0 — the single biggest cost-stack gap; the QSR core has NO chicken cost** |
| **CPO / cooking oil** | `wb_palm_oil` −1 ✓ (kept) | keep; verify resolver loads MYX:FCPO1! (wk=800), not empty BMFBOVESPA mirror | P0 — keep |
| **Wheat / flour** | `wheat` −1 ✓ (kept) | keep (CBOT:ZW1! wk=800) | P0 — keep |
| **Sugar** | **none** | **`sugar`** → ICE:SB1! (−1, wk=800) — sweetened-beverage/dessert COGS (MAPB/café-heavy) | **P1** |
| **Coffee (MAPB/Starbucks — 51% of basket)** | **none** | **`coffee`** → ICE:KC1! Arabica (−1, wk=800). **Do NOT use `wb_coffee_robusta` → ICE:RC1! (EMPTY, wk=0).** | **P1 — the dominant name's signature input is missing** |
| **USD (imported inputs + royalty)** | **none** | **`usdidr` −1** (FX_IDC:USDIDR, wk=801) — imported coffee/dairy/equipment + USD franchise royalty | **P0 — the leading FX margin channel, entirely missing** |
| **Broad-USD / flow** | none | **`dxy` −1** → TVC:DXY (wk=800) **after resolver fix** | P1 |
| **Consumer confidence (demand)** | **none** | **`id_consumer_confidence`** aIDCONIAR (+1, wk=524) — the willingness-to-dine-out pulse | **P0 — the demand spine is missing** |
| **Forward intent (the only demand lead)** | none | **Expected Income** CEICI277373102 (+1); **HH Expense Allocation: %Consumption** CEICI373675837 (+1) / **%Savings** CEICI373675857 (−1) | **P1 — the only forecast-candidate demand branch** |
| **Rate (over-weighted)** | `id_bi_rate` −1, `id_10y` −1 | **DEMOTE** to a financing/duration cross-check; rates drive outlet-rollout capex, NOT the marginal cash meal. Prefer aIDRREP7DR (wk=524) over short ECONOMICS:IDINTR (wk=186) if kept. | **P2 — re-role, don't lead with it** |
| Real-income squeeze | `id_cpi_yoy` −1 ✓, `id_gdp_real_q` +1 ✓ | keep; add `id_retail` aIDRSLSAR (+1) corroborant | keep |
| Dairy / milk | none | **no wireable series** (CME:DC1! empty) — proxy via usdidr (imported cheese/dairy); note only | n/a |
| Labour / min-wage | none | **annual only (n≈36)** → too slow to wire; structural note | n/a |
| Rent / occupancy | none | **no monthly series** — captured loosely by CPI; note only | n/a |
| Festive seasonality | none | **no wireable series** — Ramadan/Lebaran/THR calendar effect; document as structural | n/a |

**Two concrete problems with the current pulls:** (a) the **CEIC pull is wide and uncurated** — `("Tourism", None)` +
`("Consumer Staples", None)` deliver hotel/visitor/air-pax mobility (weak, MAPB-skewed) plus the *entire* staples price block,
in which the few genuine restaurant inputs (chicken, cooking oil, beef, wheat-adjacent) are buried among non-inputs (garlic,
onion, chili, rice). The genuine demand reads (confidence + forward intent) sit in `idind` but are **unreachable from these two
categories**. (b) **Resolver bugs:** `dxy → TVC:BBDXY` is empty (wk=0) → use `TVC:DXY` (wk=800); `wb_coffee_robusta → ICE:RC1!`
is empty (wk=0) → use `ICE:KC1!` Arabica (wk=800) for the coffee input; `BMFBOVESPA:FCPO1!` is empty → the `wb_palm_oil` resolver
correctly already points to `MYX:FCPO1!` (wk=800), verify it stays there. Also `id_bi_rate → ECONOMICS:IDINTR` is short-history
(wk=186) vs daily `id_10y` (wk=798) and monthly `aIDRREP7DR` (wk=524) — prefer those for a stable rate read.

---

## 8. Forecastability verdict

**The basket is forward-FLAT: a margin-cycle basket wearing a discretionary-consumption coat. The COST side (food-input →
gross-margin) is the only credible forecaster and it is real; the DEMAND side (SSSG/confidence) is coincident attribution; and
~30–40% of basket variance is idiosyncratic (brand execution, outlet rollout, micro-cap float noise) that no macro driver can
reach. The net result is a forward IC indistinguishable from zero — the cost-side signal is genuine but partially cancelled by
the coincident-and-idiosyncratic demand side at the basket level.** Reasoning:

- **Why the cost side CAN forecast (the real signal):** restaurants transform commodities into meals; food-GM is thin and
  operating leverage high, so a swing in **chicken / CPO / wheat / sugar / coffee** flows hard to EBIT within ~1–2 quarters — and
  every one of those is a **liquid, exogenous, daily price (or daily CEIC domestic print, n≈2,500) that LEADS the realised
  COGS/margin**. This is the identical mechanism that gives **Poultry +0.22 forward IC** (Restaurants is its mirror — short the
  protein chain). The current seed under-uses this: it holds only CPO + wheat, **omitting the #1 input (chicken) plus sugar/coffee/
  USD**, and treats the cost priors as contemporaneous rather than lagged. Completing and lagging the stack is the path to whatever
  forward edge exists.

- **Why the demand side does NOT forecast:** SSSG = traffic × ticket is **coincident, sentiment-and-execution-driven**, and the
  equity re-prices forward SSSG on the earnings call before the coincident confidence/retail/GDP prints arrive. Loading on those
  level/sentiment series produces a posture that drifts with the consumption cycle and reverts against returns OOS — the textbook
  flat/negative-IC profile. The **only** demand leaves with a credible lead are the **D2 ex-ante intent** series (expected income,
  spend-vs-save allocation), and even those are short-lead and noisy. The hybrid (discretionary–staple) nature also *mutes* the
  demand-side macro amplitude (less cyclical swing than apparel/durables to load on).

- **Why the net IC is flat, not negative:** unlike Retail (−0.07) or Property (−0.08) — which are dominated by a coincident,
  mean-reverting sentiment read and go *anti-predictive* — Restaurants carries a **genuine leading cost signal** (the input stack)
  that roughly offsets the coincident-demand drag, landing the net at **−0.006 / pctile 0.47 (≈ the placebo median)**. It is the
  *flat* member of the sentiment cluster, with a salvageable cost leg the others lack.

- **Honest concessions (structure):** (1) **Festive/Ramadan/THR** — a large mix/timing swing — is a *calendar* effect captured by
  seasonal differencing, not a macro driver; the lunar drift of Lebaran cannot be wired → macro under-explains month-to-month. (2)
  The basket **staples three cost profiles** (café/coffee MAPB; chicken-QSR FAST/PTSP; pizza PZZA) and a **noisy micro-cap tail**
  (BAIK β 4.06 listing artefact; ENAK/DUCK/CSMI null β) with low cross-member coherence — *not fixable in `mapping.py`* (membership
  is fixed upstream). (3) **MAPB is 51% of the basket**, so the basket is disproportionately a *Starbucks* (coffee + dairy + USD)
  read, yet the seed has none of those inputs. Both the seasonality and the membership facts must be stated, not engineered away.

**What would move it from flat → marginally positive:** (1) **complete the input-cost stack** — add **chicken (the #1 missing
input), sugar, coffee, and `usdidr`** to the existing CPO + wheat — and **lag the cost priors ~1–2 quarters** so the leading
commodity move anticipates the slow COGS/margin print; (2) **curate the CEIC pull** — override only the genuine food inputs to
cost, exclude the non-input staples noise, demote Tourism to a low-weight footfall proxy; (3) **add the demand spine** (consumer
confidence +1) and the **D2 forward-intent** branch (expected income / spend-vs-save) as the only demand forecast candidate; (4)
**re-role the rate branch** from demand-spine to a second-order expansion-capex cross-check; (5) fix the `dxy → TVC:DXY` and
`coffee → ICE:KC1!` resolvers. **Hypothesis: a complete, lagged cost stack + curated pull lifts forward IC from −0.006 toward a
small positive (the cost-margin chain is the forecastable leg; Poultry-mirror logic). If forward IC stays ≤ 0 after the rewire,
the correct verdict is to label Restaurants a *contemporaneous food-input-margin + consumption-confidence beta* (an input-cost /
USD / confidence attribution on a festive-seasonal, half-idiosyncratic F&B-service basket), NOT a forecaster** — consistent with
how BACKTEST.md treats the sentiment/hybrid cluster, but noting the cost leg gives it more forward hope than Retail/Auto/Media.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Restaurants"]`:**
```python
"Restaurants": {  # ~84% MAPB+FAST+ENAK+PZZA: branded F&B-service franchises (Starbucks/KFC/Pizza Hut).
    # MAPB(Starbucks) alone ~51% -> the basket is disproportionately a coffee/dairy/USD read.
    # Revenue = outlet count x SSSG (traffic x ticket); discretionary-STAPLE HYBRID. The decisive,
    # FORECASTABLE mechanism is INPUT-COST -> GROSS-MARGIN: food-GM is thin + operating leverage high,
    # so chicken/CPO/wheat/sugar/coffee (liquid daily prices) LEAD the COGS/margin print ~1-2q (the
    # Poultry-mirror logic). Demand (SSSG/confidence) is COINCIDENT + ~30-40% idiosyncratic (brand
    # execution, rollout, micro-cap float noise) -> the basket is forward-FLAT (fwd IC -0.006, pctile
    # 0.47). Complete + LAG the cost stack (the forecast leg); keep demand as attribution; re-role rates
    # from demand-spine to a 2nd-order expansion-capex cross-check.
    "ceic": [("Consumer Staples", None),   # keep for the food-input prices; CURATE via override/exclude below
             ("Tourism", None)],           # DEMOTE: weak MAPB-skewed footfall proxy (mall/airport cafe), low weight
    # promote the genuine restaurant INPUTS to cost (-1); the QSR leg buys chicken/cooking-oil/beef.
    "ceic_override": [("chicken meat",  "cost", -1),   # ★ the #1 QSR input (FAST/PTSP = KFC/CFC) - daily n=2496
                      ("cooking oil",   "cost", -1),   # frying input (all names) - domestic CPO pass-through
                      ("purebred chicken", "cost", -1),# monthly broiler corroborant
                      ("beef",          "cost", -1)],  # casual-dining/burger leg (minor)
    # drop the non-input staple price tickers that are NOT restaurant inputs (pure noise in this basket).
    "ceic_exclude": ["garlic", "onion", "chili", "rice", "shallot",
                     "horse", "goat", "pig", "duck egg", "layer chicken"],
    "globals": [
        # ── THE FORECAST LEG: complete, lagged input-cost stack (liquid daily prices LEAD margin ~1-2q) ──
        ("wb_palm_oil", "cost", -1, "cooking/frying oil (CPO) - MYX:FCPO1! liquid daily, LEADS margin"),
        ("wheat",       "cost", -1, "flour: dough/batter/buns (PZZA/FAST/MAPB) - CBOT:ZW1! imported milling wheat"),
        ("sugar",       "cost", -1, "sweetened-beverage/dessert input (MAPB cafe-heavy) - ICE:SB1!"),
        ("coffee",      "cost", -1, "coffee bean - the MAPB/Starbucks signature input (51% of basket); ICE:KC1! Arabica (NOT empty RC1!)"),
        # ── FX: imported inputs + USD franchise royalty (importer/licensee sign -1) ──
        ("usdidr",      "macro", -1, "weak IDR raises imported coffee/dairy/equipment COGS + USD royalty fees -> margin squeeze"),
        ("dxy",         "macro", -1, "broad USD -> IDR pressure + EM consumer-cyclical risk-off (resolve to TVC:DXY, NOT empty BBDXY)"),
    ],
    "macro": [
        # ── demand spine: confidence (the willingness-to-dine-out pulse) - MISSING today ──
        ("id_consumer_confidence", "demand", +1, "consumer confidence: willingness to eat out (coincident pulse + intent sub-indices)"),
        ("id_cpi_yoy",   "demand", -1, "food inflation squeezes the eating-out budget AND raises rent/labour opex (dual role)"),
        ("id_gdp_real_q","demand", +1, "coarse quarterly consumption backdrop"),
        ("id_retail",    "demand", +1, "household-spend activity corroborant (coincident)"),
        # ── rate: DEMOTED to a 2nd-order expansion-capex / duration cross-check (NOT the demand spine) ──
        ("id_10y",       "macro",  -1, "duration/financing cost for outlet-rollout capex + leases (slow, 2nd-order; daily yield leads the capex decision)"),
        ("id_bi_rate",   "macro",  -1, "policy rate: outlet-expansion financing cost (regime cross-check; prefer aIDRREP7DR over short IDINTR)"),
    ],
}
```

**Resolvers — what works, what to fix.** `wb_palm_oil → MYX:FCPO1!` (wk=800), `wheat → CBOT:ZW1!` (wk=800),
`sugar → ICE:SB1!` (wk=800), `coffee → ICE:KC1!` (wk=800), `usdidr → FX_IDC:USDIDR` (wk=801), `id_10y → TVC:ID10Y` (wk=798),
`id_bi_rate → ECONOMICS:IDINTR` (wk=186, short), `id_consumer_confidence → aIDCONIAR` (wk=524), `id_cpi_yoy → ECONOMICS:IDIRYY`
(wk=183), `id_gdp_real_q → aIDGDPAR1` (wk=515), `id_retail → aIDRSLSAR` (wk=524) are **all already mapped** — the only new global
needed for the cost stack (`sugar`, `coffee`) is already in `GLOBAL_CORR` (lines 47–48). **Fix the `dxy` resolver:**
`GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is empty (wk=0) → remap to **`"TVC:DXY"`** (wk=800) or `dxy` resolves to nothing (same bug as
the Retail/Internet/Telco files). **A dedicated chicken-price resolver is optional**: the chicken input is reachable via the
`ceic_override("chicken meat", …)` against the `Consumer Staples` pull (CEICI431223427 lives in that block), so no new global key is
strictly required — but if a clean leading daily chicken leaf is desired, add `GLOBAL_CORR["id_chicken"] = "CEICI431223427"` (n=2496)
and wire it as `("id_chicken", "cost", -1)`.

> ⚠ Verify the `ceic_override`/`ceic_exclude` substring matches against the actual `Consumer Staples` candidate labels in
> `build_worklist.py` before committing (the override keys are matched case-insensitively against `indicator_topic`). Confirm
> `("chicken meat", "cost", -1)` catches CEICI431223427 ("Chicken Meat: Traditional Market") and that the excludes do NOT swallow a
> genuine input. If the worklist builder cannot reach the **confidence forward-intent** series (CCI Expected Income CEICI277373102,
> HH %Consumption/%Savings CEICI373675837/857) from a `ceic` category pull, wire them via the `macro`/`global` keyed path (they are
> the only demand forecast candidate — see §3 D2); the `id_consumer_confidence` resolver above covers the headline CCI but not the
> intent sub-indices.

**What to backtest (`backtest/bt.py "Restaurants"`), keep only if forward IC improves/holds:**
1. **Complete + lag the cost stack (the big one):** current (CPO + wheat, contemporaneous) vs proposed (chicken + CPO + wheat +
   sugar + coffee + usdidr, **lagged ~1–2 quarters**). **Hypothesis: adding the #1 missing input (chicken) + the MAPB coffee/USD
   inputs and lagging the priors lifts forward IC from −0.006 toward a small positive** via the Poultry-mirror cost-margin chain.
   This is the single most important test.
2. **Cost-sign sanity:** verify the empirical sign on chicken / `wb_palm_oil` / `wheat` / `sugar` / `coffee` / `usdidr` is **−**
   (input-cost squeeze). If any comes out +, the margin-pass-through thesis is broken for that input in this window → drop it.
3. **Demand re-point:** A/B the **D2 forward-intent** branch (expected income / spend-vs-save) vs the coincident CCI/GDP level.
   **Hypothesis: the ex-ante intent carries the only positive forward demand IC; the level/sentiment prints are attribution-only
   and drag.** Confirm `id_consumer_confidence` (+1) helps or is neutral.
4. **Rate-demotion test:** confirm that re-roling `id_bi_rate`/`id_10y` from demand-spine to a low-weight cross-check does NOT cost
   forward IC (the seed over-weights them; a cash QSR meal is not rate-elastic). Verify `dxy` resolves to `TVC:DXY` (non-empty) and
   `coffee` to `ICE:KC1!` (non-empty) before trusting their load.
5. **Honesty gate:** if forward IC stays ≤ 0 after the cost-stack + demand + rate rewire, **label Restaurants a *contemporaneous
   food-input-margin + consumption-confidence attribution* (an input-cost / USD / confidence beta on a festive-seasonal, half-
   idiosyncratic F&B-service basket), NOT a forecaster** in the capsule — and note the **festive-calendar seasonality**, the
   **MAPB-51% concentration**, and the **noisy micro-cap membership** as the structural reasons macro cannot fully forecast it.
   Even then, flag that the cost leg gives it more forward headroom than the anti-predictive Retail/Auto/Media members of the cluster.
```
