# Staple Retail (Consumer Non-Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_non_cyclicals_staple_retail` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #51). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: this is the DEFENSIVE arm of Indonesian household consumption — staple food /
> grocery / FMCG-distribution names whose revenue is `SSSG (traffic × basket) × outlet rollout`. Demand
> is *non-discretionary daily food spend* — income-elastic only at the margin, so it is steadier and more
> mean-stationary than discretionary Retail (#21). That is exactly why this basket HAS forward skill where
> discretionary Retail is anti-predictive. Blindfolded OOS: fwd IC +0.116, hit−up +0.23 (one of the highest
> in the whole 52-basket table — see BACKTEST.md), placebo pctile 0.93 → SKILL, n_oos 124, kept=4. The
> economic identity is `SSSG × store/outlet count − (food-COGS + labour)`; staples have PRICING POWER, so a
> rise in food retail prices flows to nominal revenue rather than purely squeezing margin (the opposite
> polarity to a discretionary importer). The forecast engine: real income / consumption is a steady,
> slow-mean-reverting demand backdrop that LEADS staple volume, the food-retail-price complex is a clean
> daily nominal-revenue/COGS read, and the defensive-duration channel (id_10y) prices the bond-proxy bid for
> a low-beta defensive. The honest caveat that follows the data, not the brief: the LIVE basket is three tiny
> names — KMDS (staple-FMCG distributor, the only +β), WICO (broad-line FMCG distributor), PCAR (a crab/
> seafood EXPORTER mis-filed into staple retail) — NOT the AMRT/MIDI/HERO minimarket complex the sub-sector
> label evokes. So the "defensive staple consumption" thesis is economically correct, but the basket's
> realised return is a thin, two-distributor + one-exporter composite; the +0.116 skill is real but small-
> sample and partly a *staple-distribution + food-price* beta rather than a deep minimarket model.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Staple Retail**, sector *Consumer Non-Cyclicals*, id `consumer_non_cyclicals_staple_retail` |
| mcap | **~0.77T** (capsule #51 lists mcapT 1; the smallest CNC basket), benchmark JCI |
| n_names | **3** real members (one of the thinnest baskets in the engine) |
| Members (what each does) | **KMDS** (`IDX:KMDS`, **432B, β +0.211**) — Kurniamitra Duta Sentosa: a **staple food & beverage distributor/trader** (syrups, fruit mixes, sauces, coffee; exclusive distributor of MilkLab dairy, Lavazza/Santino coffee, Boba King) — the **dominant name (~56% of basket mcap)** and the *only positive-β, genuinely-staple* member. **WICO** (`IDX:WICO`, **294B, β −0.677**) — Wicaksana Overseas International: a long-established (1973) **broad-line FMCG distribution** house — snacks, beverages, milk powder, instant noodles, personal care, cosmetics, medicines, household-care, cooking oil. The classic **staple-goods distributor** leg (~38% of mcap), but with a strongly *negative* realised β. **PCAR** (`IDX:PCAR`, **41B, β −0.518**) — Prima Cakrawala Abadi: a **crab/seafood processor-EXPORTER** (crab meat, fresh/frozen fish to USA/Singapore/Bahrain) — **not a grocer at all**; a USD-revenue fishery mis-classified into "Staple Retail" (~5% of mcap). |
| Effective concentration | **KMDS + WICO ≈ 95% of mcap** → the basket is, in practice, a **two-name staple-FMCG-DISTRIBUTION composite** (KMDS food/beverage distribution + WICO broad-line FMCG distribution), with a tiny mis-filed seafood-export tail (PCAR). It is **NOT a minimarket/supermarket basket** — there is no AMRT/MIDI/HERO here (those sit in their own large-cap names elsewhere). The "Alfamart-dominant minimarket" framing in the sub-sector label does **not** describe the live membership. |
| Member-β dispersion | KMDS **+0.211**, WICO **−0.677**, PCAR **−0.518** → the two big names have **opposite-signed betas**, and the equal-weight basket is **net low/negative-β** — a classic *defensive, low-systematic-beta* profile. This is consistent with the +0.23 hit−up and the bond-proxy / defensive-duration read (§5): the basket goes UP when the market is risk-off / yields fall. |
| Current grade | **partial** |
| Current kept-driver count | **4** (`_state.txt` line 51) — modest but functional; the seed's GDP + CPI demand spine plus the auto-added usdidr + BI-rate survive enough of the significance/theory gates to anchor a real posture. |
| Current forward OOS | **SKILL — fwd IC +0.116**, hit−up **+0.23**, placebo pctile **0.93**, n_oos **124** (BACKTEST.md line 34; `_state.txt` fwd_ic 0.116). **This is genuine forward skill** — positive IC, above the 90th placebo percentile, and a **strikingly high +0.23 hit-rate-on-up-moves** (most baskets in the table are *negative* on hit−up; +0.23 is one of the best). It sits in the BACKTEST.md "physical / cost-pass-through / defensive" skill cluster (Poultry +0.22, Pharma +0.17, Food&Bev +0.12), **NOT** the "diversified/sentiment baskets mean-revert" cluster that contains discretionary Retail (#21, −0.07). That contrast is the headline of this file. |

**Current seed (`mapping.py` → `SEED["Staple Retail"]`):**
```python
"Staple Retail": {
    "ceic": [("Consumer Staples", "Food Retail Prices")],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "retail footfall"),
              ("id_cpi_yoy", "demand", -1, "real spend")],
}
```
(`build_worklist.py` then auto-adds `usdidr` and `id_bi_rate` as standard macro candidates → the 4 kept drivers are, in practice, the `Food Retail Prices` CEIC block reads + `id_gdp_real_q` (+1) + `id_cpi_yoy` (−1) + `usdidr` + `id_bi_rate`.)

**The gap (what is thin, and what is already right).** This seed is **already pointed at the correct economic block** — unlike discretionary Retail, whose seed is mis-pointed at Auto-Sales. Two things to fix and two to deepen:
1. **The `id_cpi_yoy` sign (−1) is half-wrong for a STAPLE grocer/distributor.** For *discretionary* retail, food/energy inflation squeezes real discretionary income (−1 is right). For a **staple** food distributor, food-price inflation **also lifts nominal revenue** (staples have pricing power; the grocer sells the same volume at a higher ASP, and the distributor's mark-up is on a higher base). The net sign is **ambiguous-to-positive on nominal revenue, mildly negative on real volume** — so a hard −1 is too strong. A **food-specific CPI** (CEIC521347877 "CPI: Food, Beverage & Tobacco") with sign near **0/+** (nominal pass-through) is the more honest read than headline `id_cpi_yoy` at −1. This is the single most important refinement (see §4/§9).
2. **The whole demand-VOLUME survey block is unreachable.** The genuine staple-demand reads — **Retail Sales Survey: Real RSI: Food, Beverages & Tobacco** (CEIC322851902, n=196), headline Real RSI (CEIC322851702), the YoY growth print (CEIC448573857), and the **low-income consumer-confidence / forward-income-intent** series — all live in the **`id` macro inventory**, NOT in the `idind` Consumer-Staples industry block. The current `ceic` pull (which `build_worklist.py` indexes from `idind` only) **cannot reach them**; they must be wired via `macro`/`global` resolver keys (§9).
3. **The `Food Retail Prices` CEIC block is being read with the wrong role.** Its 13 series (cooking-oil/chicken/beef/sugar/egg modern-market prices, n≈2511 daily; + crude oil, LPG-3kg, Pertamina-Dex fuel; + a thin WPI) are tagged `demand` in the catalog, but economically they are **food-PRICE / COGS / nominal-revenue** reads, not demand-volume reads. For a staple grocer/distributor they have a **dual role**: ↑food price → ↑nominal revenue (pricing power, +) AND ↑COGS (−) — net **mildly +** on a name with mark-up pricing power, but the fuel/LPG prints inside the block are a pure **cost/real-income drag (−)**. They should be `ceic_override`-rerolled, not left as undifferentiated "demand".
4. **No defensive-duration / real-income depth.** The +0.23 hit−up and net-negative basket β scream *defensive bond-proxy*; the leading channel for a low-beta defensive is **id_10y / id_01y (the duration bid) + real income (wages vs CPI)** — neither is explicitly in the seed.

This file rebuilds the tree as: a **staple-volume demand spine** (food RSI + low-income confidence + real income — mostly attribution, with the forward-intent leaf the lead candidate), a **food-price nominal-revenue/COGS branch** (the daily Food-Retail-Prices block, re-roled), a **defensive-duration + FX macro branch** (the leading prices), an explicit **PCAR-export contradiction note**, and a forecastability verdict that *contrasts with discretionary Retail's failure*.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (staple grocer / FMCG distributor):**
```
Revenue (grocer)      = Store count × SSSG-grown base   ;  SSSG = traffic (footfall) × basket size (items × ASP)
Revenue (distributor) = Σ_principal (volume distributed × wholesale ASP)   [KMDS/WICO sell-through to retailers]
Gross profit          = Revenue × gross margin           (margin = retail/wholesale mark-up over food-COGS)
EBIT                  = Gross profit − labour − rent/logistics − utilities − marketing
Net income            = EBIT − interest − tax
Equity value          ≈ PV(steady staple SSSG/volume × outlet/principal rollout × stable margin) at a LOW (defensive) WACC
```

Six structural facts drive the modelling — and three of them are the *reason this basket forecasts where discretionary Retail does not*:

1. **Demand is NON-DISCRETIONARY and income-INELASTIC at the core.** Rice, cooking oil, eggs, instant noodles, milk powder, personal care — these are bought every week regardless of the cycle. Staple food spend is the **last** line a household cuts. So the demand series (food RSI, staple volume, low-income confidence) are **far more mean-stationary and persistent** than discretionary spend — and persistence is what makes a slow demand backdrop a *forecaster* rather than a coincident print. **This is the single structural reason for the +0.116 forward skill.** (Contrast §8: discretionary Retail's demand is *sentiment-driven SSSG that mean-reverts* → its drivers co-move contemporaneously but flip sign forward → −0.07.)

2. **Staples have PRICING POWER → food-price inflation lifts nominal revenue, not just COGS.** When cooking-oil or sugar prices rise, the grocer/distributor passes it through almost fully (inelastic staple demand) — nominal revenue and the absolute mark-up rise. So **food CPI is positive-to-neutral on nominal earnings**, the *opposite polarity* to a discretionary importer where ↑input price = pure margin squeeze. The seed's `id_cpi_yoy` at −1 imports the *discretionary* polarity and is the main sign error to fix.

3. **Margin is thin but STABLE; the swing factor is volume × food-price pass-through, not a commodity spread.** A distributor's gross margin is a few points of wholesale mark-up; a grocer's is low-teens. There is no levered commodity spread (unlike Poultry's corn/soymeal-vs-broiler) — the margin is *defended* by pricing power, so the earnings swing comes from **staple volume (steady) × nominal food price (the daily read) − labour (min-wage step) − logistics fuel**. The fuel/LPG prints inside the Food-Retail-Prices block are the genuine *cost* leg (distribution diesel + cold-chain).

4. **Outlet / principal rollout is the structural growth — and it is more predictable than discretionary store economics.** A minimarket chain's store-count CAGR (and a distributor's principal/SKU additions) is a planned, capital-budgeted rollout with high survival rates for staple formats. This makes the *level* trend forecastable; the cycle rides on top. (For the LIVE three-name basket this is a smaller factor than for AMRT — KMDS/WICO grow by adding principals/coverage, PCAR by export capacity — but the principle holds.)

5. **Labour and logistics fuel are the cost stack; both are slow/administered.** Minimum-wage steps (annual, administered) set the labour floor; diesel/Pertamina-Dex and LPG-3kg set distribution cost. Neither is a fast market price, but the **fuel prints (in the Food-Retail-Prices CEIC block) are monthly and do move COGS** — a genuine, if second-order, cost read.

6. **The LIVE basket is a defensive, low/negative-β, two-distributor + one-exporter composite — NOT a minimarket model.** This is the honest structural caveat (verified from company filings, §1): KMDS (+β staple-FMCG distributor) + WICO (−β broad-line FMCG distributor) net to a **defensive low-beta** profile, and PCAR is a **USD-export fishery** whose drivers (USD/IDR +, US/Asia seafood demand, export volume) are *orthogonal to domestic grocery*. A single "domestic staple consumption" posture fits KMDS/WICO well and PCAR badly — but PCAR is only ~5% of mcap, so the mis-fit is small. The net basket reads as a **staple-distribution + food-price + defensive-duration beta**, which is exactly what the OOS skill is picking up.

**What a sell-side analyst actually watches (staple grocer/distributor):** monthly **SSSG / volume growth** and **outlet/principal net adds**; the **BI Retail-Sales Survey Food-Beverage-Tobacco sub-index**; **food CPI** (pass-through to nominal revenue); **real wages / min-wage** (the low-income customer's budget); **low-income consumer confidence** (the IDR-1-3M expenditure bands); **diesel/LPG** (distribution + cold-chain cost); **gross-margin stability** (pricing-power test); and for PCAR specifically, **USD/IDR + export crab/fish prices** (orthogonal). Of these, **food prices, fuel, USD/IDR and the yield curve are the high-frequency leading reads**; the RSI/confidence/wage series are monthly-to-annual, publication-lagged, but — unlike discretionary — **persistent enough to lead**.

---

## 3. DEMAND driver tree

> Demand = steady non-discretionary staple food spend = `staple volume × food ASP`, routed through grocers/
> distributors and floored by `real income (wages vs food-CPI)`. The headline read is the **BI Retail-Sales
> Survey Food-Beverages-Tobacco sub-index** (CEIC322851902, n=196) plus the **low-income consumer-confidence /
> forward-income-intent** block. Because staple demand is *persistent and income-inelastic*, even the coincident
> *level* prints carry forward information here (the level next month ≈ the level this month) — the structural
> opposite of discretionary Retail, where the level mean-reverts against the equity. ⚠ ALL of these live in the
> **`id` macro inventory**, NOT in the Consumer-Staples `idind` block, so the current `("Consumer Staples",
> "Food Retail Prices")` CEIC pull cannot reach them — they must be wired as `macro`/`global` keys (see §7/§9).

```
DEMAND (staple spend = volume × food ASP, floored by real income)  — DEFENSIVE, PERSISTENT
├── D1 STAPLE RETAIL VOLUME (the direct read — coincident but PERSISTENT → leads here) ★
│     ├─ RSS: Real Retail Sales Index: Food, Beverages & Tobacco  CEIC322851902 [dem, 2010=100, P1M, n=196]  sign +1, lag ~0-1 ★THE staple-grocery volume read
│     ├─ RSS: Real Retail Sales Index (headline) ·· CEIC322851702 [dem, 2010=100, P1M, n=196]  sign +1, lag ~0-1  total retail volume backdrop
│     ├─ Growth of Retail Sales Index: YoY: Total ·· CEIC448573857 [dem, %, P1M, n=184]  sign +1, lag ~0-1  YoY staple/retail momentum
│     └─ (id_retail resolver) ··········· aIDRSLSAR "Retail Sales Chg Y/Y" [dem, %, P1M] sign +1 — the seed-adjacent coarse YoY proxy for the above
│        mechanism: staple food volume is bought weekly regardless of cycle → the index is PERSISTENT; loading on it does NOT mean-revert
│        against returns (unlike discretionary). caveat: survey level, publication-lagged ~5-6 wks → attribution-leaning, but the persistence buys a real (small) forward edge.
├── D2 REAL INCOME / PURCHASING POWER OF THE STAPLE CUSTOMER (the budget floor) ─► wages vs food inflation ★
│     ├─ CPI: Food, Beverage & Tobacco ·· CEIC521347877 [cost/rev, 2022=100, P1M, n=41] sign ~0/+ — DUAL: lifts nominal staple revenue (pricing power) AND is the customer's grocery-cost squeeze; net ≈ neutral-to-+ on nominal earnings (see §2.2)
│     ├─ CPI: Food, Beverage & Tobacco: Food  CEIC521547557 [cost/rev, 2022=100, P1M, n=41] sign ~0/+ — narrower food read (excl. tobacco/alcohol)
│     ├─ Headline CPI YoY ················ id_cpi_yoy → ECONOMICS:IDIRYY [%, P1M]  sign −1 (current seed; the GENERAL real-income squeeze — keep at small −, NOT the food-specific read)
│     ├─ Monthly Minimum Wage: Average ··· CEIC303317302 [dem, IDR th, P1Y, n=36] sign +1 — the low-income wage FLOOR (annual → structural/slow; the staple customer's income) 
│     └─ Avg Monthly Net Wage (DKI) ······ CEIC299173502 [dem, IDR, P1Y, n=37] sign +1 — wage level (ANNUAL → structural note; too slow to wire as a fast driver)
│        mechanism: staple demand is income-inelastic at the core but income-elastic AT THE MARGIN (trade-up to branded/modern-market when wages rise). Real wage = min-wage − food-CPI is the budget. The min-wage STEP (Jan each year) is a known forward income pulse.
├── D3 LOW-INCOME CONSUMER CONFIDENCE — present + FORWARD intent (the staple customer's sentiment) ★
│     ├─ CCI: by Expenditure: IDR 1 - 2 Million  CEIC373675247 [dem, Point, P1M, n=172] sign +1 ★the bottom-income (staple-heavy) band's confidence
│     ├─ CCI: by Expenditure: IDR 2.1 - 3 Million CEIC373675257 [dem, Point, P1M, n=172] sign +1  lower-mid income band (modern-market trade-up)
│     ├─ Consumer Confidence Index (headline) ·· CEIC277372502 (≈ aIDCONIAR) [dem, Point, P1M, n=196] sign +1, lag ~0-1 ★the seed-adjacent headline pulse
│     └─ CCI: Expectations: 6M Ahead: Expected Income  CEIC277373102 [dem, Point, P1M, n=196] sign +1, lag ~1-3 ★the FORWARD-INTENT leaf — leads realised staple spend
│        mechanism: D3 present-situation confirms; the EX-ANTE "expected income 6M ahead" describes what households PLAN, so it leads realised staple spend 1-3 months. For a defensive staple, even the present-situation read is fairly persistent.
├── D4 BROAD CONSUMPTION BACKDROP (coincident, coarse) ─► real GDP / household final consumption
│     ├─ Real GDP YoY ················· id_gdp_real_q → aIDGDPAR1 [P3M]  sign +1 (current seed; coarse quarterly demand backdrop — KEEP)
│     ├─ GDP: Final Consumption: Private  CEIC224812701 [dem, IDR, P3M, n=73] sign +1 — private final consumption (the staple demand base)
│     └─ GDP: 2010p: Consumption Expenditure  CEIC365764297 [dem, IDR, P3M, n=65] sign +1 — real consumption level (coarse)
└── D5 OUTLET / PRINCIPAL ROLLOUT (structural growth — the level trend) 
      └─ (no clean macro series) — minimarket store-count CAGR / distributor principal & SKU additions are a
         PLANNED capital-budgeted rollout (high survival for staple formats). Forecastable in principle but
         un-wireable from macro data → structural note. For the LIVE basket (KMDS principals, WICO coverage,
         PCAR export capacity) this is name-specific. A weak macro proxy is the secular drift in D1 (Food RSI).
```

**Forecast hypothesis (demand): this is genuine attribution-that-leads, because staple demand is persistent.**
The crucial difference vs discretionary Retail: there, the demand level (CCI, retail index) **mean-reverts while the equity has already moved on forward SSSG sentiment** → loading on it produces a *negative* forward IC. Here, staple volume (D1) and low-income confidence (D3) are **persistent and income-inelastic** → next month's staple spend ≈ this month's, so loading on the level carries real (if modest) forward information — the mechanical reason the OOS comes out **+0.116** rather than negative. **Anchor demand on D1 (Food RSI, the direct read) + D2 real income (min-wage − food-CPI) + D3 low-income confidence/forward-income-intent, with the D3 expected-income leaf as the genuine lead candidate.** The hit−up +0.23 says the demand+duration posture is especially good at catching the basket's UP moves (defensive bid in risk-off / falling-yield windows — see §5).

---

## 4. SUPPLY / COST driver tree

> A grocer/distributor has no physical "supply"; its cost stack is **food-COGS (passed through — staples have
> pricing power), labour (min-wage), logistics fuel (diesel/LPG, cold-chain), and rent.** The decisive feature is
> that the **food-price block is dual-role**: ↑food price lifts nominal revenue (pricing power, +) AS WELL AS COGS
> (−), netting **mildly + on a mark-up name** — the OPPOSITE polarity to a discretionary importer. The pure cost
> leg is **fuel/LPG** (a clean − read) and labour (slow). This dual polarity is itself the key finding, and the
> reason the seed's blunt `id_cpi_yoy = −1` over-states the cost drag.

```
SUPPLY / COST (food-COGS [passed through] + labour + logistics fuel + rent)
├── C1 FOOD-PRICE COMPLEX — DUAL role: nominal-revenue (+, pricing power) AND COGS (−); net ~mildly + ★
│     ├─ Cooking Oil: Modern Market ····· CEICI432477457 [P1D, n=2512]  sign +1 (net) ★daily modern-market staple price; lifts nominal grocery revenue (pass-through)
│     ├─ Sugar: Modern Market ··········· CEICI432487747 [P1D, n=2511]  sign +1 (net) staple ASP
│     ├─ Chicken Meat: Modern Market ···· CEICI431282997 [P1D, n=2511]  sign +1 (net) protein ASP
│     ├─ Egg: Modern Market ············· CEICI432423457 [P1D, n=2511]  sign +1 (net) staple protein ASP
│     ├─ Beef / Chili (Red, Cayenne) ···· CEICI432413187 / CEICI432461977 / CEICI432469687 [P1D, n=2511] sign +1 (net) the volatile-food sleeve
│     └─ Wholesale Price Index: General · CEICI541367887 [2023=100, P1M, n=29] sign +1 (net) — distributor wholesale-price level (KMDS/WICO mark-up base; SHORT history n=29)
│        mechanism: staples are inelastic → grocer/distributor passes price through almost fully → nominal revenue + absolute mark-up RISE with food price. The
│        COGS rises too, but margin % is defended → net effect on EARNINGS is mildly POSITIVE for a pricing-power name. THIS IS THE POLARITY FLIP vs discretionary.
│        ⚠ caveat: these 13 series are tagged "demand" in the catalog but are PRICES; daily + co-linear; over-weighting the whole block fits noise → use 2-3 representative reads + WPI, re-roled.
├── C2 LOGISTICS / DISTRIBUTION FUEL — the PURE cost leg (clean −) ★
│     ├─ Fuel: Pertamina Dex (diesel) ··· CEICI359137107 [IDR/l, P1M, n=245]  sign −1 — distribution diesel + cold-chain; a clean COGS/real-income drag
│     ├─ Fuel: Subsidized: LPG 3 KG ····· CEICI207177702 [IDR/kg, P1M, n=233]  sign −1 — cooking-LPG; a low-income real-income squeeze (demand-side −) + small cost
│     └─ Crude Oil: Indonesia (retail) ·· CEICI14459401 [USD/Barrel, P1M, n=413] sign −1 — upstream oil → the parent of diesel/LPG (longest history n=413)
│        mechanism: diesel/cold-chain is a genuine distribution COGS line; LPG hits the low-income customer's budget. Monthly, administered/lagged → cost ATTRIBUTION, weak forecast.
├── C3 LABOUR COST (the min-wage floor) ─► administered wage step
│     └─ Monthly Minimum Wage: Average ·· CEIC303317302 [IDR th, P1Y, n=36] sign −1 (cost) / +1 (demand, D2) — DUAL: raises labour cost AND the customer's income. ANNUAL → structural note.
└── C4 FX-IMPORTED-INPUT (minor for grocer; MAJOR & OPPOSITE-SIGN for PCAR) ─► USD
      ├─ USD/IDR ······················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1 for KMDS/WICO (imported principals: MilkLab, Lavazza, milk powder → COGS up)
      └─ USD/IDR (PCAR) ················ same series, sign +1 — PCAR is a USD-crab/fish EXPORTER → weak IDR HELPS it. The two signs partly CANCEL → net basket usdidr sign is AMBIGUOUS (seed correctly sets it 0).
```

**Forecast hypothesis (supply/cost): the cost side is real but second-order; the key insight is the polarity flip.**
The decisive modelling fact is **C1's dual role**: food prices are NOT a pure cost drag for a pricing-power staple
name — they lift nominal revenue, so the net earnings sign is **mildly +**, not the −1 the seed implies via headline
CPI. The clean cost read is **C2 fuel/LPG (−1)** — monthly, real, but lagged → cost attribution. **C4 USD/IDR is
genuinely ambiguous** because KMDS/WICO are importers (−) while PCAR is an exporter (+) — the signs partially
cancel, which is why the seed's auto-added `usdidr` at sign 0 is *correct* and should stay 0 (do not force a sign).
**Net cost forecast candidate: none is a strong leader; treat C1 as a nominal-revenue/COGS attribution at net +
small, C2 as a − cost attribution, and keep usdidr at 0.**

---

## 5. MACRO / RATE / FX / FLOW

> For a DEFENSIVE, low/negative-β, income-inelastic staple basket, the systematic core is the **defensive-duration
> (bond-proxy) bid + the real-income backdrop + an ambiguous FX**. The leading, liquid channel is the **yield curve
> (id_10y / id_01y)**: a defensive staple trades like a *long-duration bond proxy* — when yields fall / the market
> goes risk-off, the defensive bid lifts it (and vice-versa). This is the mechanism behind the **net-negative basket
> β (WICO −0.68, PCAR −0.52) and the +0.23 hit−up**: the basket catches UP moves precisely in risk-off / falling-
> yield windows. The rate channel here is a **discount-rate / risk-appetite** read, not a financing-cost read (these
> are cash-generative, low-leverage names) — the opposite *use* of rates vs rate-elastic discretionary Retail.

```
MACRO / RATE / FX / FLOW   — DEFENSIVE-DURATION beta
├── M1 DEFENSIVE DURATION — the bond-proxy bid (the LEADING channel for a low-β defensive) ★
│     ├─ ID 10Y yield ··············· id_10y → TVC:ID10Y [P1D, wk=798]  sign −1, lag ~0-1 ★falling yields / risk-off → defensive-staple bid; daily, exogenous, LEADS
│     ├─ ID 1Y yield ················ id_01y → TVC:ID01Y [P1D, wk=793]  sign −1  front-end duration / policy-path proxy
│     └─ BI policy rate ············· id_bi_rate → ECONOMICS:IDINTR [P1M, wk=186] sign −1 — policy easing → duration bid + nominal-spend support (current auto-added; short history)
│        mechanism: a defensive staple with stable cash flows behaves like a long-duration bond proxy: ↓discount rate / risk-off → relative bid. This is a DISCOUNT-RATE / risk-appetite
│        channel (the basket is low-leverage, so NOT a financing-cost story). The DAILY yields lead the monthly equity → the engine's best lead read, and the source of the +0.23 hit−up.
├── M2 FX — imported principals (−) vs PCAR export (+) → NET AMBIGUOUS ─► IDR level
│     └─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign 0 (NET) — KMDS/WICO importers (−) vs PCAR exporter (+) cancel; keep sign 0 (current seed is correct)
├── M3 BROAD-USD / EM-FLOW (defensive = LOW beta to this) ─► global dollar regime
│     └─ dxy ························· dxy → TVC:DXY [P1D, wk=800]  sign −1 (weak; strong USD → EM outflow, but DEFENSIVE staples are low-β to risk-off, so small magnitude)
│        ⚠ resolver bug: GLOBAL_CORR maps dxy→TVC:BBDXY which is EMPTY (wk=0). Use TVC:DXY (wk=800). See §7/§9.
└── M4 LIQUIDITY / NOMINAL-SPEND BACKDROP (coincident) ─► broad money
      └─ Broad money M2 YoY ········· id_m2 → aIDM2AR [%, P1M]  sign +1 (liquidity → nominal staple spend; secondary, coincident)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Risk appetite / Fed-IDR yields  ──►  id_10y + id_01y (daily, LEAD)  ──►  defensive-staple bid + nominal-spend backdrop  ──►  basket (low/negative-β defensive)
real income chain:  min-wage step (Jan) − food-CPI  ──►  staple purchasing power  ──►  Food RSI volume (monthly, lagged)  ──►  staple revenue  ──►  basket
```
The engine should lean on the **leading daily yields (id_10y −1)** for the defensive-duration bid (the high-frequency
lead) and on the **persistent real-income/Food-RSI chain** for the slow demand level. Unlike a *forecastable
commodity* basket (Coal, Poultry) whose lead is an exogenous input price, here the lead is a **discount-rate /
risk-appetite** read on a low-β defensive — which is a *different* but still valid forecast mechanism (it is why
the skill is real but modest: +0.116, not +0.22).

**Forecast hypothesis (macro): the defensive-duration channel (id_10y −1) is the leading systematic read; FX is a wash.**
`id_10y` / `id_01y` (−1) are liquid, daily, exogenous and **lead** the low-β defensive's relative bid — the cleanest
forecast candidate in the tree and the most likely source of the +0.23 hit−up. `id_bi_rate` (−1) reinforces (policy
easing → duration + nominal-spend). `usdidr` is a genuine **wash** (importer vs exporter cancel) → keep at 0; do not
let a forced FX sign corrupt the posture. `dxy` (−1, after the resolver fix) is a small EM-flow read — low magnitude
because a defensive is *low-β* to risk-off.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Plantation / agri inputs** (#12) | `CPO` MYX:FCPO1! (wk=800); `soyoil` CBOT:ZL1! (wk=800); `sugar` ICE:SB1! (wk=800) | cost/rev +1 (net) | Cooking-oil (CPO-derived), and sugar are the biggest staple SKUs by value. As *world prices* they LEAD the domestic modern-market food prices (C1) by a few weeks → a **leading parent of C1**. For a pricing-power grocer the net sign is **mildly + (nominal pass-through)**, NOT the − of a CPO *consumer* (e.g. Household/UNVR). Use the world price as the leading read for the C1 domestic price. |
| **Poultry / Food & Beverage** (#42/#6) | `chicken/egg modern-market price` CEICI431282997 / CEICI432423457; `corn` CBOT:ZC1! / `soymeal` CBOT:ZM1! | cost/rev +1 (net) | Chicken/egg are core staple protein SKUs; their modern-market price (C1) sits downstream of the Poultry basket's feed (corn/soymeal) → another leading parent. Same pricing-power polarity (net +). The Food RSI Food-Bev-Tobacco sub-index (D1) is shared with the F&B basket as the volume read. |
| **Energy / Oil** (#16) | `Pertamina Dex` CEICI359137107; `LPG-3kg` CEICI207177702; `brent` ICEEUR:BRN1! (wk=800) | cost −1 | Distribution diesel + cold-chain + the low-income LPG budget (C2). Brent is the leading parent of the lagged domestic fuel prints. A clean − cost/real-income read. |
| **Banking / Money Supply** (#1) | `id_m2` aIDM2AR; `Loans: HH Consumption` (Banking block) | demand +1 | Broad money / consumer-credit liquidity → nominal staple spend backdrop (M4). Secondary, coincident; staples are *less* credit-elastic than discretionary (cash/daily purchases) → low weight. |
| **Seafood export (PCAR-specific)** | `usdidr` FX_IDC:USDIDR; US/Asia seafood demand (no clean series) | macro +1 (PCAR only) | PCAR is a crab/fish EXPORTER → weak IDR helps it (+), opposite to the KMDS/WICO importer sign (−). This is why the net basket `usdidr` sign is 0. Orthogonal to domestic grocery; ~5% of mcap → note, do not engineer. |
| **Discretionary Retail (CONTRAST, #21)** | `RSS: Real RSI` CEIC322851702; CCI block | demand — | Staple Retail SHARES the Retail-Sales-Survey / Consumer-Surveys infrastructure with discretionary Retail (#21), but reads the **Food-Beverage-Tobacco sub-index** (persistent, inelastic) where #21 reads clothing/recreation/ICT (cyclical, mean-reverting). Same data source, opposite forecastability — the cleanest illustration of why one basket has skill and the other does not (§8). |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC pull (correct block, wrong roles)** | `("Consumer Staples","Food Retail Prices")` → 13 food-price/fuel prints, all tagged `demand` | **RE-ROLE** via `ceic_override`: the food prices are **nominal-revenue/COGS (net +)** not demand-volume; the fuel/LPG prints are **cost (−)**. Keep 2-3 representative food reads + WPI + diesel/LPG; the block is correctly *pointed* (unlike discretionary Retail's mis-pointed Auto-Sales pull). | **P1 — re-role, the pull itself is right** |
| **Staple demand VOLUME** | none reachable (Food RSI lives in `id` macro, not the `idind` block) | **RSS: Real RSI: Food, Bev & Tobacco** CEIC322851902 (+1); headline Real RSI CEIC322851702 (+1); YoY growth CEIC448573857 (+1) — wire via `id_retail` (aIDRSLSAR) or new resolver keys | **P0 — the direct staple-demand read is currently unreachable** |
| **Food-specific CPI (the sign fix)** | `id_cpi_yoy` at **−1** (the discretionary polarity) | **CPI: Food, Beverage & Tobacco** CEIC521347877 at **sign ~0/+** (nominal pass-through, pricing power) — the single most important refinement; demote headline `id_cpi_yoy` to a small − | **P0 — the seed's main SIGN error** |
| **Defensive duration** | none explicit (BI rate auto-added) | **`id_10y`** TVC:ID10Y (−1, daily, LEADING — the defensive bond-proxy bid); **`id_01y`** TVC:ID01Y (−1) | **P0 — the leading channel; the likely source of +0.23 hit−up** |
| **Low-income confidence / forward intent** | none | **CCI: IDR 1-2M** CEIC373675247 (+1); **CCI: IDR 2.1-3M** CEIC373675257 (+1); headline CCI aIDCONIAR (+1); **Expected Income 6M** CEIC277373102 (+1, the forward leaf) | **P1** |
| **Real income / wages** | none (headline CPI only) | **Min Wage: Average** CEIC303317302 (+1, ANNUAL → slow); **Avg Net Wage** CEIC299173502 (+1, ANNUAL) → structural; new `id_min_wage` resolver if a wage leaf is desired | **P2 (slow series)** |
| GDP / consumption backdrop | `id_gdp_real_q` +1 ✓ (kept) | add `GDP: Final Consumption: Private` CEIC224812701 (+1) — coarse | keep + P3 |
| FX (net ambiguous) | `usdidr` sign **0** ✓ (auto-added, correct) | **keep at 0** — importer (KMDS/WICO −) vs exporter (PCAR +) cancel; do NOT force a sign | P0 — keep as-is |
| Broad-USD / flow | none | **`dxy` −1** (small; after resolver fix) | P2 |
| Liquidity | none | `id_m2` aIDM2AR +1 (nominal-spend backdrop; secondary) | P3 |
| Outlet/principal rollout | none | **no wireable series** — name-specific capital-budgeted growth; structural note | n/a |

**Two concrete problems with the current pulls:** (a) the **food-price block is read with the wrong role and the
CPI sign is the discretionary polarity** — for a *staple* pricing-power name, food prices are net + (nominal
pass-through) and headline CPI at −1 over-states the real-income drag. The fix is to add a **food-specific CPI at
~0/+** and re-role the Food-Retail-Prices block. (b) **Resolver bug:** `dxy → TVC:BBDXY` is empty (wk=0); use
**`TVC:DXY`** (wk=800) — the same bug flagged across the Retail/Internet/Telco files. Note also `id_bi_rate →
ECONOMICS:IDINTR` is **short-history (wk=186)** vs the daily `id_10y` (wk=798) — prefer the daily yields as the
leading defensive-duration read and keep BI rate as the policy cross-check. Unlike discretionary Retail, the **CEIC
category is correctly pointed** — the work here is *re-roling + adding the macro demand/duration spine*, not
re-pointing.

---

## 8. Forecastability verdict — and the contrast with discretionary Retail

**The basket is a GENUINE (if modest) forecaster — fwd IC +0.116, placebo pctile 0.93, hit−up +0.23 → SKILL.**
It belongs in the "physical / cost-pass-through / defensive" skill cluster (Poultry, Pharma, Food&Bev), NOT the
"diversified/sentiment baskets mean-revert" cluster that contains discretionary Retail. The forecast lives in three
places: (1) the **defensive-duration bid** (`id_10y` −1, daily, leading — a low-β bond proxy; the source of the high
hit−up), (2) the **persistent, income-inelastic staple-demand level** (Food RSI + low-income confidence — which,
*unlike* discretionary, does not mean-revert against the equity), and (3) the **food-price nominal-revenue read**
(net +, pricing power). Reasoning:

- **WHY staple FORECASTS where discretionary FAILS — the central contrast.** Discretionary Retail (#21, fwd
  −0.07, contemp −0.14, placebo 0.27) is governed by **SSSG sentiment + festive timing + idiosyncratic store/
  e-commerce news, amplified by high operating leverage** — a *sentiment asset that mean-reverts*. Its observable
  demand prints (clothing/recreation RSI, present-situation CCI, consumption loans) drift with the consumption
  cycle while the equity has already re-priced forward SSSG → loading on them produces a posture that mean-reverts
  *against* returns OOS → negative forward IC. **Staple Retail reads the SAME survey infrastructure but the
  Food-Beverage-Tobacco sub-index, which is PERSISTENT and income-INELASTIC** — staple food spend is the last line
  a household cuts, so the demand level is far more mean-stationary and next-month spend ≈ this-month spend. A
  persistent level *carries* forward information; a mean-reverting one *destroys* it. Add the **defensive-duration
  bid** (a low-β bond proxy that catches risk-off UP moves → +0.23 hit−up) and the **pricing-power polarity**
  (food inflation = + nominal revenue, not − margin), and you get a small but real **+0.116** where discretionary
  gets **−0.07**. *Same data source, opposite forecastability* — the cleanest natural experiment in the engine.

- **WHY the rate/duration branch is the leading read:** `id_10y`/`id_01y` (−1) are liquid, exogenous, daily, and
  for a *low-leverage defensive* they price the **discount-rate / risk-appetite** bid (not financing cost). This is
  the *opposite use* of rates vs rate-elastic discretionary Retail (where rates price *financing* of big-ticket
  demand). The net-negative basket β (WICO −0.68, PCAR −0.52) confirms the defensive read, and the +0.23 hit−up
  says the posture is especially good at catching the basket's up-moves in risk-off / falling-yield windows.

- **Honest concessions (small-sample + membership).** (1) **The basket is THREE tiny names** (KMDS 432B + WICO
  294B + PCAR 41B ≈ 0.77T total) → n_oos 124 is decent but the cross-section is thin, so the +0.116 is a
  *small-sample* skill — real (above 90th placebo pctile) but not robust like Coal/Poultry. (2) **PCAR is a
  mis-filed crab/seafood EXPORTER** whose drivers (USD/IDR +, export demand) are orthogonal to domestic grocery —
  ~5% of mcap, so the contamination is small, but it is the reason `usdidr` nets to 0 and a sign cannot be forced.
  (3) **The label evokes AMRT/MIDI/HERO minimarkets, but the live members are FMCG distributors, not chain
  grocers** — the "defensive staple consumption" thesis is economically correct, but the realised return is a
  *staple-distribution + food-price + defensive-duration* beta, not a deep minimarket model. (4) **The min-wage /
  THR / Ramadan income pulses** are real but largely annual/calendar — captured by seasonal differencing, not a
  fast driver. All four must be stated, not engineered away — but none overturns the SKILL verdict.

**What would deepen/protect the +0.116 (the goal here is DEEPEN, not rescue):** (1) **fix the CPI sign** — add a
food-specific CPI at ~0/+ (pricing power) and demote headline `id_cpi_yoy` to a small − (the current −1 imports the
discretionary polarity and likely *drags* the staple posture). (2) **add the defensive-duration spine** (`id_10y`/
`id_01y` −1) — the leading channel, currently only implicit via the short BI-rate. (3) **wire the Food RSI volume +
low-income confidence** (the direct, persistent staple-demand reads, currently unreachable). (4) **re-role the
Food-Retail-Prices block** (food prices net +, fuel/LPG −) so the daily prints stop being read as undifferentiated
demand. (5) **keep `usdidr` at 0** and fix `dxy → TVC:DXY`. **Hypothesis: the food-CPI sign fix + the
defensive-duration spine + the persistent Food-RSI demand read should HOLD or modestly LIFT the +0.116 with a
richer, more honest tree, and improve the contemporaneous fit (grade partial → toward perfected). If the food-CPI
sign comes out − empirically (i.e. the volume squeeze dominates the pass-through in this window), revert to a small
− and label it real-income-squeeze — but the a-priori theory for a pricing-power staple is net ~0/+.** This is a
*deepen-and-protect* basket (Tier B), not a broken one.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Staple Retail"]`:**
```python
"Staple Retail": {  # ~95% KMDS(staple-FMCG distributor,+beta) + WICO(broad-line FMCG distributor,-beta);
    # tiny PCAR(crab/seafood EXPORTER, mis-filed) tail. NOT a minimarket basket -- no AMRT/MIDI/HERO here.
    # Revenue = SSSG(traffic x basket) x outlet/principal rollout - (food-COGS[passed-through] + labour + fuel).
    # DEFENSIVE, income-INELASTIC, net low/negative-beta -> staple demand is PERSISTENT, so it FORECASTS
    # (fwd IC +0.116, hit-up +0.23, placebo 0.93 -> SKILL) where discretionary Retail (#21) MEAN-REVERTS (-0.07).
    # Key fixes: (a) food prices are net + (pricing power -> nominal revenue), NOT the discretionary -1 cost drag;
    # (b) add the DEFENSIVE-DURATION spine (id_10y -1, the bond-proxy bid -> the +0.23 hit-up); (c) wire the
    # persistent Food-RSI volume + low-income confidence (currently unreachable, they live in `id` macro);
    # (d) keep usdidr at 0 (KMDS/WICO importer - vs PCAR exporter + cancel).
    "ceic": [("Consumer Staples", "Food Retail Prices")],   # correctly pointed (unlike #21's Auto-Sales) -- re-ROLE, don't re-point
    # re-role the daily food-PRICE prints as net nominal-revenue (pricing power) and the fuel as cost:
    "ceic_override": [("cooking oil: modern market",        "demand", +1),   # net nominal-revenue pass-through (pricing power)
                      ("sugar: modern market",              "demand", +1),   # staple ASP, net +
                      ("chicken meat: modern market",       "demand", +1),   # staple protein ASP, net +
                      ("wholesale price index: general",    "demand", +1),   # distributor mark-up base (KMDS/WICO)
                      ("fuel: pertamina dex",               "cost",   -1),   # distribution diesel/cold-chain (clean cost)
                      ("fuel: subsidized: lpg 3 kg",        "cost",   -1)],  # low-income LPG budget (cost / real-income drag)
    # drop the co-linear / noisy prints (keep 3-4 representative food reads + WPI + 2 fuel reads):
    # NB: exclude is a SUBSTRING match -> use the WHOLESALE qualifier for chicken so the kept
    # "chicken meat: modern market" override above is NOT also dropped (a bare "chicken meat" would hit both).
    "ceic_exclude": ["beef: modern market", "egg: modern market",
                     "cayenne pepper", "red chili pepper",
                     "average wholesale price: chicken meat",  # the WHOLESALE chicken duplicate only (modern-market kept via override)
                     "wholesale price index: yoy",  # n=17, too short
                     "crude oil: indonesia"],       # redundant with brent/diesel; long but noisy here
    "globals": [
        ("dxy", "macro", -1, "broad USD -> EM outflow; SMALL magnitude (defensive staple is low-beta to risk-off)"),
    ],
    "macro": [
        # -- the leading systematic spine: DEFENSIVE DURATION (bond-proxy bid -> the +0.23 hit-up) --
        ("id_10y",     "macro",  -1, "PRIMARY: daily defensive-duration bid; risk-off/falling-yield -> low-beta staple bid; LEADS"),
        ("id_01y",     "macro",  -1, "front-end duration / policy-path proxy"),
        ("id_bi_rate", "macro",  -1, "policy easing -> duration bid + nominal-spend support (regime cross-check; short-history)"),
        # -- FX: NET AMBIGUOUS (importer KMDS/WICO - vs exporter PCAR +) -> keep 0 --
        ("usdidr",     "macro",   0, "importer(-) vs PCAR exporter(+) cancel -> net wash; do NOT force a sign"),
        # -- staple DEMAND (persistent, income-inelastic -> carries forward info) --
        ("id_retail",  "demand", +1, "real retail-sales YoY -> proxy for the persistent staple Food-RSI volume"),
        ("id_consumer_confidence", "demand", +1, "low-income staple-customer confidence (use IDR 1-3M bands if a leaf is added)"),
        ("id_gdp_real_q", "demand", +1, "broad consumption backdrop (coarse, quarterly) -- KEEP"),
        # -- real income / food-price polarity FIX --
        ("id_cpi_yoy", "demand", -1, "GENERAL real-income squeeze ONLY -- keep at SMALL -, NOT the food-specific read"),
        # NEW resolver wanted: id_cpi_food -> CEIC521347877 (CPI: Food, Bev & Tobacco) at sign ~0/+ (pricing-power pass-through)
        # ("id_cpi_food", "demand", +1, "food CPI lifts NOMINAL staple revenue (pricing power) -- the polarity flip vs discretionary"),
    ],
}
```

**Resolvers — what already works, and what to add/fix.** `id_10y → TVC:ID10Y` (wk=798), `id_01y → TVC:ID01Y`
(wk=793), `id_bi_rate → ECONOMICS:IDINTR` (wk=186, short), `usdidr → FX_IDC:USDIDR` (wk=801), `id_retail →
aIDRSLSAR`, `id_consumer_confidence → aIDCONIAR`, `id_gdp_real_q → aIDGDPAR1`, `id_cpi_yoy → ECONOMICS:IDIRYY`,
`id_m2 → aIDM2AR` are **all already mapped** — no new resolver required for the core spine. **Two resolver actions:**
(1) **Fix the `dxy` bug:** `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is empty (wk=0) → remap to **`"TVC:DXY"`** (wk=800).
(2) **Optional new resolver `id_cpi_food → CEIC521347877`** ("CPI: Food, Beverage & Tobacco", 2022=100, n=41) at
sign **~0/+** to replace the discretionary-polarity headline CPI as the staple food-price read — this is the single
highest-value addition (the polarity fix). If a low-income-confidence or forward-income-intent *leaf* is desired,
add resolver keys for `CEIC373675247` (CCI IDR 1-2M), `CEIC322851902` (Food-Bev-Tobacco RSI) and `CEIC277373102`
(Expected Income 6M). The Food RSI / CCI-band / wage series live in the **`id` macro inventory** and are **only
reachable via `macro`/`global` resolver keys** — `build_worklist.py` indexes the `ceic` pull from `idind` only, so
they CANNOT be wired through a `("Retail Sales", …)` / `("Consumer Surveys", …)` CEIC tuple (same constraint flagged
in the discretionary-Retail file). Confirm this in `build_worklist.py` before committing.

**What to backtest (`backtest/bt.py "Staple Retail"`), keep only if forward IC improves/holds:**
1. **Food-CPI sign fix (the big one):** current (`id_cpi_yoy` −1) vs proposed (add `id_cpi_food` ~0/+, demote
   headline CPI to small −). **Hypothesis: the staple pricing-power polarity (food prices net + on nominal
   revenue) HOLDS or LIFTS the +0.116; the discretionary −1 is likely dragging the posture.** If the empirical
   food-CPI sign comes out −, the volume squeeze dominates pass-through in this window → revert to small − and
   relabel as real-income-squeeze. This is the single most important test.
2. **Defensive-duration add:** confirm `id_10y` / `id_01y` (−1) help or hold — they are the leading channel and the
   likely source of the +0.23 hit−up. **Verify the empirical sign is − (defensive bond-proxy bid).** If it comes
   out +, the defensive-duration thesis is broken for this window → downgrade to coincident attribution.
3. **Food-price re-role:** A/B the re-roled Food-Retail-Prices block (food net +, fuel −) vs the current
   undifferentiated `demand` tagging. **Hypothesis: re-roling improves the contemporaneous fit (grade partial →
   perfected) without hurting forward IC.**
4. **FX-sign sanity:** confirm `usdidr` empirical sign is ≈ 0 (importer − vs exporter + cancel). Do NOT force a
   sign. Verify `dxy` resolves to `TVC:DXY` (non-empty) before trusting its load.
5. **Honesty / protect gate:** this is a **deepen-and-protect** basket (already SKILL, Tier B) — KEEP a change only
   if forward IC ≥ +0.116 (holds) with a richer, more honest tree. If any addition *lowers* the OOS IC, revert it.
   Whatever the result, **document the discretionary-Retail contrast** (persistent staple demand → forecasts;
   sentiment-driven discretionary SSSG → mean-reverts) and the **three-tiny-name + mis-filed-PCAR small-sample
   caveat** in the capsule.