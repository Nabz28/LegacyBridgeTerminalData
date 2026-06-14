# Food & Beverage — Driver-Tree Plan

> Sub-industry detail file (template §4 of `plan/IMPROVEMENT_PLAN.md`). Sector:
> Consumer Non-Cyclicals · basket id `343T` · IDX sub_sector key **"Food & Beverage"**.
> Every series cited is confirmed live in `plan/DATA_INVENTORY.md` + `plan/catalog/*.json`
> with its RIC and n_obs. Library tags (`WHEAT`, `CPO`, `USDIDR`…) are defined in
> IMPROVEMENT_PLAN §2 and not re-derived here.

---

## 1. Snapshot + current state

**Basket.** ~43 names, the second-largest defensive block on the exchange after
Banks-adjacent staples. The earnings-weight is concentrated in a handful of
branded-packaged-food majors plus a dairy/beverage tail:

| Name | RIC | weekly_obs | What it makes | Dominant input |
|---|---|---|---|---|
| Indofood CBP | `IDX:ICBP` | 793 | instant noodles (Indomie), snacks, dairy | **wheat (flour)**, CPO |
| Indofood Sukses | `IDX:INDF` | 793 | ICBP parent + Bogasari flour mill + agri | **wheat**, CPO |
| Mayora Indah | `IDX:MYOR` | 793 | biscuits, confectionery, coffee, wafer | sugar, wheat, **coffee**, CPO |
| Cisarua Mountain Dairy | `IDX:CMRY` | 227 | UHT dairy, Cimory, consumer products | **skim-milk/dairy**, sugar |
| Ultrajaya | `IDX:ULTJ` | 793 | UHT milk + juice | **skim-milk/dairy**, sugar |
| Multi Bintang | `IDX:MLBI` | 793 | beer (Bintang/Heineken) | barley/malt, sugar |
| Siantar Top | `IDX:STTP` | 793 | snacks, crackers, noodles | wheat, CPO |
| Garudafood | `IDX:GOOD` | 392 | snacks, peanuts, drinks | CPO, sugar |
| Akasha Wira (Ades) | `IDX:ADES` | n/a | bottled water, cosmetics | resin/PET |
| … (instant noodles, dairy, snacks, confectionery, beverages, distributors) |

**Current engine state (SEED `"Food & Beverage"` in `mapping.py`):**
- `ceic`: `[("Consumer Staples", None)]` — the **whole** 356-series Consumer Staples
  block, undifferentiated (rice/garlic/beef/chili price tickers dragged in alongside
  the real inputs).
- `globals`: `wb_palm_oil` (cost −1), `wheat` (cost −1), `wb_sugar_world` (cost −1),
  `coffee` (cost −1), `soybean_meal` (cost −1).
- `macro`: `id_cpi_yoy` (demand −1), `id_gdp_real_q` (demand +1), `usdidr` (macro −1).
- **kept = 12** drivers; **grade = partial**; **forward OOS IC = +0.12, marginal**
  (BACKTEST.md: n_oos 129, hit−up −0.07, placebo pctile **0.88** — beats 88% of the
  null, just under the 90% SKILL bar).

**The gap.** Four issues, all fixable:
1. **A dead input ric.** The seed's `coffee` resolves through `GLOBAL_CORR["coffee"]
   → ICE:KC1!` (Arabica, weekly_obs 800) — fine — but the *robusta* tag
   `wb_coffee_robusta → ICE:RC1!` that actually matches Indonesian coffee is
   **empty (weekly_obs 0)**. `soybean_meal` (`CBOT:ZM1!`, 800) is a **poultry-feed**
   input wrongly applied to a branded-food basket — F&B names do not buy soymeal.
2. **No demand tree at all.** The only demand series is GDP and a (negatively-signed)
   CPI. None of the real-wage, retail-sales, consumer-confidence, or money-supply
   series that drive *volume* are wired — yet the engine holds all of them.
3. **No dairy input.** CMRY + ULTJ are skim-milk/sugar businesses; there is **no milk
   price** in the seed (and the only milk future, `CME:DC1!`, is empty).
4. **The forecast edge is unexploited.** The input-cost → gross-margin lag (the one
   genuinely leading, exploitable mechanism in this basket) is present as raw cost
   priors but is **not lagged or sequenced** — it is treated as contemporaneous.

This file builds the demand tree, repairs the input stack, adds the dairy proxy and
the lag structure, and tags exactly which branch is expected to forecast.

---

## 2. Economic structure — how a branded-food basket makes money

The staples revenue identity is **volume × price**, and the earnings driver is the
**gross margin**, which is the swing variable because input cost is volatile while
selling price is sticky:

```
Revenue   = Volume            ×  ASP (price)
          = (population × penetration × frequency)  ×  (list price · mix · promo)

Gross $   = Revenue − COGS
COGS      = Σ (input commodity × usage)  +  packaging  +  conversion + freight
Gross %   = 1 − COGS/Revenue     ← THE earnings driver; this is what re-rates the stock
```

Three structural facts make this basket a **margin story, not a volume story**, in
the short run, and that is the whole forecasting thesis:

- **Volume is slow and inelastic.** Noodle/dairy/snack volumes grow with population
  (+1%/yr) and real income; they do not swing quarter-to-quarter. So revenue is a
  low-variance series. (Exception: Ramadan/Lebaran festive demand, §3.)
- **Price is sticky and lagged.** Branded majors raise list prices 1–2× a year, in
  steps, *after* input cost moves and with regulatory/competitive friction. So ASP
  cannot absorb an input spike in-quarter.
- **Input cost is fast, exogenous, and the largest variance term.** Wheat, CPO,
  sugar, milk powder are global, liquid, daily-priced. For ICBP/INDF, flour + CPO is
  roughly half of COGS; for MYOR, sugar + coffee + wheat dominate; for CMRY/ULTJ,
  milk powder + sugar dominate.

Therefore the **margin = ASP − input cost** mechanically swings with the input
commodities, and because firms hold **3–6 months of raw-material inventory + forward
contracts**, today's spot commodity move lands in the P&L *one to two quarters out*.
That inventory/contract lag is what converts a contemporaneous cost relationship into
a **forecastable forward edge** (§8): the commodity is observable today; the margin
hit is not yet in the print, and not yet in the price. A sell-side staples analyst
literally models this — "wheat is up 20% YTD, ICBP's flour cost reprices in 2Q, gross
margin compresses ~150bps, earnings miss, derate" — and that is the chain the engine
should encode.

The demand side still matters for the *level* and for downtrading regime, but the
**alpha is in the cost→margin lag**, so the supply/cost tree (§4) is the heart of the
spec and gets the lead tagging.

---

## 3. DEMAND driver tree

Demand drives **volume** (and, with a lag, pricing power — firms push price when the
consumer is strong). All series below are real and held by the engine but currently
**unwired** except GDP/CPI. Demand series are mostly slow CEIC *quantity* prints
(publication-lagged, coincident-to-lagging) → tag = **attribution / weak-forecast**,
per the IMPROVEMENT_PLAN §3 rule of thumb. The leading branch on the demand side is
**real wages**, because labour income sets the staples budget envelope before it
shows up in retail sales.

```
DEMAND (volume × pricing power)
├── D1 Real household income  ──►  the staples budget envelope
│     ├─ D1a Real wage = nominal wage − food CPI
│     │      • nominal: Wages & Earnings "Monthly Minimum Wage: Average"
│     │        [IDR th, P1Y, n36]  — annual, sets the floor for mass-market volume
│     │      • Avg Monthly Net Wage (by province, P1Y, n37) — annual
│     │      • deflate by → CPI "Food, Beverage and Tobacco" [2022=100,P1M,n41]
│     │      sign +1 · LEAD ~1–2 quarters (income gain precedes trading-up) · weak-fcst
│     └─ D1b Current Income Index (Consumer Surveys, by expenditure bracket)
│            `aIDCONIAR` family — Present: Current Income [Point,P1M,n196]
│            sign +1 · LEAD 0–1m (survey is forward-ish) · MONTHLY, timely
├── D2 Consumer confidence & buying intent  ──►  discretionary staples (snacks/dairy)
│     ├─ D2a Consumer Confidence Index  `aIDCONIAR` [Point,P1M,n196]
│     │      sign +1 · LEAD 1–2m · monthly, timely → best DEMAND forecast candidate
│     ├─ D2b CCI Expectations: Expected Income 6m ahead [Point,P1M,n196]
│     │      sign +1 · LEAD ~1 quarter (expectations lead spend)
│     └─ D2c Buying Condition for Durable Goods [Point,P1M,n196]
│            sign +1 · proxy for overall consumer willingness-to-spend
├── D3 Retail throughput  ──►  realised volume
│     ├─ D3a Retail Sales YoY  `aIDRSLSAR` [%, P1M, "Retail Sales, Chg Y/Y", n…]
│     │      sign +1 · LEAD 0 (≈coincident) · monthly but ~6-week pub lag → attribution
│     └─ D3b Retail Sales Total (rebased) `aIDRSLSM` [Index,P1M]
├── D4 Liquidity backdrop  ──►  nominal spend
│     ├─ D4a Broad Money M2 YoY  `aIDM2AR` / `aIDM2AR`-family [%, P1M, n328]
│     │      sign +1 · LEAD ~1–2 quarters (liquidity precedes nominal consumption)
│     └─ D4b Bank credit YoY  `aIDLONYAR` (`id_bank_credit`)  sign +1
├── D5 Population × penetration  ──►  structural volume floor
│     • slow-moving; not a tradable driver. Treat as the +1%/yr base growth, not wired.
└── D6 Seasonality — Ramadan / Lebaran festive demand
      • Idul Fitri shifts ~11 days earlier each Gregorian year; volumes (noodles,
        syrup, biscuits, dairy) spike in the fasting month + pre-Lebaran restock,
        then a post-festive air-pocket. NOT a price series → handled as a
        CALENDAR REGIME flag in the engine, not a `mapping.py` driver (see §9 note).
        Demand sign +1 in the festive window; mechanism = gifting/hampers + mudik.
```

**Per-product demand notes (which member each branch hits hardest):**
- **Instant noodles (ICBP/INDF/STTP):** the most income-inelastic — even
  *counter-cyclical* (a downtrading destination). Real wage D1a sign on noodle volume
  is weakly +, but during income squeezes noodles GAIN share from rice/restaurant
  meals → the basket's mass-noodle sleeve is a downtrading hedge.
- **Dairy (CMRY `IDX:CMRY` 227obs, ULTJ `IDX:ULTJ` 793obs):** more income-elastic
  (UHT milk is a trade-up product) → D1/D2 sign strongly +; the cleanest demand
  read of the basket. Watch Current Income Index by the IDR 3–5mn expenditure bracket.
- **Snacks / confectionery (MYOR/GOOD/STTP):** impulse/discretionary → confidence
  (D2) and festive seasonality (D6) dominant.
- **Beer (MLBI):** discretionary + excise-regulated + on-trade (tourism-linked);
  smallest, most idiosyncratic sleeve — confidence + leisure, not staples demand.

**Downtrading mechanism (regime, both-signed).** In a real-income squeeze, total
food *spend* holds but **mix shifts down** — branded → private-label/unbranded,
premium dairy → plain UHT, restaurant → instant noodle. So the *basket-level* demand
sign of a CPI spike is ambiguous (noodles +, premium dairy −), which is exactly why
the seed's blanket `id_cpi_yoy` demand −1 is too crude and should be split (§9).

---

## 4. SUPPLY / COST driver tree — the INPUT STACK (the heart of F&B)

This is where the forecastable signal lives. Each input is a **liquid, exogenous,
daily price that LEADS the equities** by the inventory/forward-contract lag (≈3–6m to
the P&L, so ≈1–2 quarters to the earnings print and the stock). Sign is **−1 on the
basket** (input cost up → margin down → derate), *except* a vertically-integrated
caveat below. RICs and weekly_obs are confirmed in `catalog/market.json`.

```
SUPPLY / COST  (input cost → gross margin → earnings → price)   [sign −1 unless noted]
├── S1 WHEAT  ──►  flour ──► instant noodles + biscuits (ICBP/INDF/STTP/MYOR)
│     tag WHEAT · `CBOT:ZW1!` (SRW) weekly_obs 800  ✓ populated
│     sign −1 · LEAD 3–6m to margin (~1–2Q to print) · the #1 noodle input
│     sub-chain: USD wheat × USDIDR = landed IDR flour cost (so pairs with M3 below)
│     alt clean ric if needed: `CBOT:KE1!` (HRW) 800
├── S2 CPO / palm cooking oil  ──►  frying oil for noodles + snacks
│     tag CPO · `MYX:FCPO1!` (Bursa) weekly_obs 800  ✓ populated, Indo-critical
│     sign −1 for F&B as a COST.  ⚠ CAVEAT: INDF is partly CPO-integrated
│       (IndoAgri/SIMP) → a CPO spike is a cost to noodles but revenue to its
│       plantation arm; net basket sign is still −1 (branded majors dominate weight)
│       but smaller than for a pure snack maker. (cross-link §6 → Plantation.)
│     LEAD 3–6m · NOTE: do NOT also wire the empty `BMFBOVESPA:FCPO1!` (weekly_obs 0)
├── S3 SUGAR  ──►  confectionery, biscuits, sweetened dairy, beverages (MYOR/CMRY/GOOD)
│     tag SUGAR · `ICE:SB1!` (Sugar #11) weekly_obs 800  ✓ populated
│     sign −1 · LEAD 3–6m · the dominant MYOR/GOOD input; ID is a net sugar importer
│     (so landed cost compounds with USDIDR; domestic Sugar Prices CEICI exists too)
├── S4 SKIM-MILK / DAIRY  ──►  UHT milk, condensed milk, dairy snacks (CMRY/ULTJ/ICBP)
│     ⚠ DATA GAP: no clean liquid milk price — `CME:DC1!` (Class III Milk) weekly_obs 0
│     PROXY OPTIONS (in priority): (a) USDIDR (milk powder is ~100% imported → FX is
│       the dominant landed-cost driver); (b) soybean-oil/veg-fat `CBOT:ZL1!` 800 as a
│       fat-substitute co-move; (c) domestic Food Retail Prices CEICI as a coincident
│       read. Honest call: model dairy COST as USDIDR + sugar, flag "no milk price."
│     sign −1 · LEAD via FX is short (1–3m); via global WMP would be 3–6m if sourced
├── S5 COFFEE  ──►  instant/3-in-1 coffee, coffee confectionery (MYOR Torabika, GOOD)
│     ⚠ FIX: ID coffee is ROBUSTA; seed's `wb_coffee_robusta → ICE:RC1!` is EMPTY (0).
│     USE `coffee → ICE:KC1!` (Arabica) weekly_obs 800 as the liquid proxy (Arabica
│       and Robusta co-move ~0.7); tag COFFEE_ARABICA. sign −1 · LEAD 3–6m
│     minor weight (only MYOR/GOOD coffee sleeves) → keep but low prior confidence
├── S6 SOYBEAN complex  ──►  soy sauce / TVP / soy drinks (minor)
│     `CBOT:ZS1!` soybeans 800 or `CBOT:ZL1!` soyoil 800 for soy-based products
│     ❌ REMOVE `soybean_meal CBOT:ZM1!` — that is a POULTRY FEED input, wrong basket
│     sign −1 · minor; optional
├── S7 PACKAGING  ──►  resin/PET (bottles, films) + carton + tin
│     resin proxy `brent → ICEEUR:BRN1!` (oil-linked polymer feedstock) sign −1
│     (ADES bottled water + all flexible-film snacks). LEAD 1–3m (shorter inventory)
└── S8 ENERGY / FREIGHT (conversion cost)  ──►  thermal energy, diesel logistics
      `brent` / domestic fuel — small COGS share; low prior, optional
```

**The forecast hierarchy inside the stack (per product, the strongest leading input):**

| Member sleeve | Strongest leading input | RIC | Why it forecasts |
|---|---|---|---|
| Noodles (ICBP/INDF/STTP) | **WHEAT** | `CBOT:ZW1!` | ~largest single COGS line; 1–2Q inventory lag |
| Snacks/confectionery (MYOR/GOOD) | **SUGAR** | `ICE:SB1!` | dominant input; imported → FX-amplified |
| Frying-oil intensive snacks | **CPO** | `MYX:FCPO1!` | Indo-critical, liquid, leads margin |
| Dairy (CMRY/ULTJ) | **USDIDR** (milk-powder proxy) | `FX_IDC:USDIDR` | milk powder ~fully imported; no milk future |
| Coffee sleeve (MYOR) | **COFFEE (Arabica proxy)** | `ICE:KC1!` | robusta ric empty; arabica co-moves |

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 USD/IDR  `FX_IDC:USDIDR`  weekly_obs deep  ── sign −1 on the basket
│     mechanism: wheat, sugar, milk powder, soybean, packaging resin are ALL
│     imported and USD-priced → IDR weakness raises landed input cost = margin −.
│     This is the FX amplifier on the WHOLE input stack (§4) → high prior confidence.
│     LEAD: short (1–3m); FX is fast and the import is priced near-spot.
├── M2 CPI regime  ── SPLIT the seed's blanket sign:
│     • Food/Bev CPI `CPI: Food, Beverage and Tobacco` [2022=100,P1M,n41]
│         as a COST/pricing read: high food-CPI = firms HAVE pricing power → margin
│         can be +; but real-income drag = volume −. Net AMBIGUOUS → prior 0, let
│         data decide (replaces the seed's crude demand −1).
│     • Headline CPI YoY `ECONOMICS:IDIRYY` / [%,P1M,n689] — real-income deflator.
│     • Volatile CPI `CPI: Volatile` [2022=100,P1M,n41] — the food-price shock gauge.
├── M3 Rates / defensive duration  ── F&B majors are quality bond-proxies
│     • `id_bi_rate` `ECONOMICS:IDINTR` sign −1 (defensive re-rate on cuts) · prior low
│     • `id_10y` `TVC:ID10Y` sign −1 (the staples-as-duration trade, like UNVR/Household)
│     mechanism: stable-cashflow defensives re-rate UP when yields FALL. Secondary to
│     the cost story but real (mirrors the Household/Pharma seeds).
├── M4 Activity backdrop  `id_gdp_real_q` `aIDGDPAR1` sign +1 (keep) · demand level
└── M5 Flow / risk  `dxy` `TVC:BBDXY` sign −1 (EM-staples are a foreign-owned crowd;
      USD strength = outflow headwind) · optional, low prior
```

---

## 6. Cross-industry linkages

- **Plantation (CPO).** `MYX:FCPO1!` is **revenue (+1) for Plantation** and
  **cost (−1) for F&B** — the same price, opposite sign. The INDF integration caveat
  (S2) sits exactly on this seam: INDF straddles both baskets. The engine should keep
  the signs basket-specific (they already differ: Plantation seed has
  `wb_palm_oil supply +1`, F&B has `cost −1`).
- **Agriculture / grains.** Wheat (`CBOT:ZW1!`), sugar (`ICE:SB1!`), soybeans are
  *not* produced domestically at scale → these are pure imported-input prices, no
  domestic-producer offset (unlike CPO). Indonesia is a net importer of all three →
  the FX amplifier (M1) is unambiguous.
- **Poultry (anti-link).** `CBOT:ZM1!` soymeal + `CBOT:ZC1!` corn belong to the
  **Poultry** basket (feed, ~70% of cost), NOT F&B. Removing soymeal from the F&B
  seed (S6) cleans a mis-borrowed cross-link.
- **Containers & Packaging.** Resin/PET cost (S7, `brent`-linked) is shared with the
  Containers basket — F&B is the *demand* side of packaging; for margin purposes it
  is a cost input.
- **Staple Retail.** AMRT/MIDI distribute F&B volume; shared demand drivers
  (retail sales, real wage). Distinct basket but same demand tree top.

---

## 7. Currently wired vs available

| Branch | Wired now? | Series (RIC) | n_obs / freq | Priority to ADD/FIX |
|---|---|---|---|---|
| Wheat (noodles) | ✅ | `CBOT:ZW1!` | 800 wk | keep (lead-tag it) |
| CPO (frying oil) | ✅ | `MYX:FCPO1!` | 800 wk | keep |
| Sugar | ✅ | `ICE:SB1!` | 800 wk | keep |
| Coffee | ⚠ partial | `ICE:KC1!` arabica 800 / `ICE:RC1!` robusta **0** | use KC1!, drop RC1! | **FIX** |
| Soybean meal | ❌ wrong | `CBOT:ZM1!` (poultry feed) | 800 | **REMOVE** |
| **Skim-milk / dairy** | ❌ missing | no milk price (`CME:DC1!`=0) → USDIDR proxy | — | **ADD proxy** |
| Packaging (resin) | ❌ | `brent ICEEUR:BRN1!` | deep | ADD (low prior) |
| USD/IDR amplifier | ✅ | `FX_IDC:USDIDR` | deep | keep (raise role to stack-wide) |
| Food/Bev CPI (pricing) | ⚠ crude | `CPI: Food,Bev,Tobacco` n41 | n41 P1M | **SPLIT sign → 0** |
| **Real wage (demand)** | ❌ | Min Wage n36 / Net Wage n37 ÷ Food CPI n41 | annual+monthly | **ADD** |
| **Consumer confidence** | ❌ | `aIDCONIAR` | n196 P1M | **ADD** (best demand fcst) |
| **Retail sales** | ❌ | `aIDRSLSAR` | P1M | **ADD** (attribution) |
| **M2 liquidity** | ❌ | `aIDM2AR` | n328 P1M | ADD |
| GDP (demand level) | ✅ | `aIDGDPAR1` | quarterly | keep |
| Defensive duration | ❌ | `id_10y TVC:ID10Y` / `id_bi_rate` | deep | ADD (low prior) |
| CEIC Consumer Staples | ✅ (whole block) | `("Consumer Staples", None)` | 356 series | **NARROW** to food inputs |
| **Ramadan/festive** | ❌ | calendar regime (not a series) | — | ADD as engine flag |

---

## 8. Forecastability — why marginal now, how to lift it

**The exploitable edge is the INPUT-COST → MARGIN lag.** It is the rare branch in
this basket that is genuinely *leading* rather than coincident:

> commodity input today  →  raw-material inventory turns / forward contracts roll
> (3–6m)  →  COGS reprices in the P&L  →  gross margin compresses  →  earnings miss
> /beat vs consensus  →  stock derates/rerates.

Because the commodity is observable now and the margin hit is **not yet in the print
and not yet in the price**, a posture short F&B after a wheat/sugar/CPO/FX spike (and
long after a collapse) should forecast forward returns. The backtest already sees a
faint version of this: **forward IC +0.12, placebo pctile 0.88** — positive, beats
88% of the null, but *just* under the 0.90 SKILL bar, and **hit−up is −0.07** (the
up-month hit rate is weak), i.e. the signal works more on the downside
(cost-spike → derate) than symmetrically.

**Why only marginal today (diagnosis):**
1. **Signal dilution.** The cost stack is averaged equal-weight with a CPI demand
   prior of the *wrong* aggregate sign and a *dead* coffee ric and a *mis-borrowed*
   soymeal — three of the kept-12 drivers are noise or wrong-signed, diluting the IC.
2. **No lag applied.** The engine reads the commodity move *contemporaneously*; the
   real forecast power is in the *lagged* move (the margin lands 1–2Q later). Without
   the lag the engine is half-measuring an explainer, not the forecaster.
3. **No demand/cost separation in the CPI prior.** Blanket `id_cpi_yoy demand −1`
   fights the pricing-power channel and mis-signs the downtrading hedge (noodles).
4. **Whole-block CEIC noise.** `("Consumer Staples", None)` pulls 356 series incl.
   garlic/chili/beef daily price tickers that are demand-side food CPI, not F&B inputs
   — adds slow, lagging, publication-delayed quantity prints that cannot forecast.

**How to lift it from marginal (+0.12) toward SKILL (≥+0.15, pctile ≥0.90):**
- **Apply the input lag.** Test the cost stack at LEAD 1–2 quarters (lag the
  *equity* return relative to the commodity, i.e. signal = commodity move at t−1Q to
  t−2Q). The single highest-expected-value change.
- **Strongest-input-per-product weighting.** Up-weight WHEAT (noodles) + SUGAR
  (snacks) + CPO over the minor inputs, rather than equal-weight — they carry the
  COGS mass.
- **Repair the three bad drivers** (drop RC1!→use KC1!, drop ZM1! soymeal, split CPI
  to prior 0) → removes dilution.
- **Add the USDIDR stack amplifier** as a high-confidence cost driver (it multiplies
  every imported input) and the **real-wage / confidence** demand branch for the
  volume level.
- **Add the festive calendar flag** so the seasonal demand air-pocket isn't read as
  a fundamental signal.

The honest expectation: this basket should be a **respectable forward forecaster on
the cost/margin axis** (the commodities genuinely lead), but a **weak demand
forecaster** (the volume series are slow and publication-lagged). Tag the verdict
accordingly: *cost branch = forecast; demand branch = attribution.*

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Food & Beverage"` SEED with the structure below. Tuple driver =
`(key, role, sign, why)`. New library tags needed in `GLOBAL_CORR`:
`coffee_arabica → ICE:KC1!` already covered by existing `coffee` key (which points to
`ICE:KC1!`), so reuse `"coffee"`; **do not** use `wb_coffee_robusta` (empty).

```python
"Food & Beverage": {
    # NARROW the CEIC block to food-input categories (not the whole 356-series block):
    "ceic": [("Consumer Staples", "Wheat & Flour"),      # CEICI323814502 …
             ("Consumer Staples", "Sugar Prices"),
             ("Consumer Staples", "Food Retail Prices"),  # CEICI14459401 … (coincident COGS read)
             ("Consumer Staples", "Cooking Oil Prices")],
    # exclude the demand-side fresh-food price tickers that aren't F&B inputs:
    "ceic_exclude": ["garlic", "chili", "beef", "onion", "rice:", "poultry & egg",
                     "livestock", "tobacco"],
    "globals": [
        # --- input stack (cost -1), the forecast axis; LEAD applied by engine ---
        ("wheat",        "cost", -1, "flour = #1 noodle/biscuit input (ICBP/INDF/STTP/MYOR); CBOT:ZW1! 800obs"),
        ("wb_palm_oil",  "cost", -1, "CPO frying oil; MYX:FCPO1! 800obs (note INDF partial integration)"),
        ("wb_sugar_world","cost",-1, "sugar = dominant MYOR/GOOD/CMRY input; ICE:SB1! 800obs"),
        ("coffee",       "cost", -1, "coffee (Arabica ICE:KC1! 800obs as robusta proxy; RC1! is empty)"),
        ("brent",        "cost", -1, "resin/PET packaging + energy feedstock proxy"),
        # REMOVED: ("soybean_meal", ...) -> poultry feed, wrong basket
    ],
    "macro": [
        # --- FX amplifier on the whole imported-input stack (high prior) ---
        ("usdidr",       "macro", -1, "IDR weakness raises landed cost of ALL imported inputs (wheat/sugar/milk-powder/resin)"),
        # --- dairy input proxy: no milk price exists, FX is the dominant landed driver ---
        # (covered by usdidr above; flagged as the CMRY/ULTJ milk-powder channel)
        # --- demand level (keep GDP; CPI sign SPLIT to 0 = ambiguous) ---
        ("id_gdp_real_q","demand", +1, "consumption growth / volume level"),
        ("id_cpi_yoy",   "macro",  0, "AMBIGUOUS: real-income drag (vol -) vs pricing power (margin +); was -1"),
        # --- demand tree additions (attribution-tagged; confidence is best fcst) ---
        ("id_consumer_confidence","demand",+1,"CCI aIDCONIAR n196 monthly: leading demand/buying-intent"),
        ("id_retail",    "demand", +1, "retail sales aIDRSLSAR: realised volume (coincident, pub-lagged)"),
        ("id_m2",        "demand", +1, "M2 aIDM2AR liquidity precedes nominal consumption (lead ~1-2Q)"),
        # --- defensive duration (low prior, mirrors Household/Pharma) ---
        ("id_10y",       "macro", -1, "quality defensives re-rate on falling yields (bond-proxy)"),
    ],
},
```

**Real-wage demand branch (needs a resolver, not in `GLOBAL_CORR` today).** The
real-wage signal = `Monthly Minimum Wage: Average` [IDR th, P1Y, n36] (or
`Average Monthly Net Wage` n37) **deflated by** `CPI: Food, Beverage and Tobacco`
[2022=100, P1M, n41]. Both are annual/quarterly and publication-lagged → add as a
new ID-macro resolver with `role=demand, sign=+1, lead≈1-2Q`, **attribution-tagged**.
If a resolver is too heavy for v1, approximate the real-income channel with the
already-wired `id_consumer_confidence` "Current Income" sub-index (monthly, timely).

**Ramadan/Lebaran seasonality (NOT a `mapping.py` driver).** Idul Fitri drifts ~11
days/yr; festive demand is a calendar regime, not a price. Implement as an engine-side
**seasonal dummy / regime flag** (fasting-month + pre-Lebaran restock = demand +;
post-festive month = demand −), applied to the volume read, *outside* the
commodity-driver z-scoring. Do not try to encode it as a series.

**What to backtest (the KEEP/REJECT gate, per IMPROVEMENT_PLAN §6):**
1. Re-run `backtest/bt.py "Food & Beverage"` after each change; KEEP only if forward
   IC improves or holds with a cleaner tree (never an in-sample-only gain).
2. **Lag test (highest value):** compare the cost-stack signal at LEAD 0 vs LEAD 1Q
   vs LEAD 2Q. Expect IC to rise as the lag is applied (the inventory thesis). This
   is the single experiment most likely to cross the SKILL bar.
3. **Ablation:** confirm dropping `soybean_meal` + fixing the empty robusta ric +
   splitting the CPI sign each raise (or hold) IC — i.e. that they were dilution.
4. **Demand vs cost split:** report cost-branch IC and demand-branch IC separately;
   the thesis predicts cost ≫ demand. Tag the verdict so the terminal reads
   "cost = forecast, demand = attribution."
5. **USDIDR amplifier:** verify the FX driver's sign is robustly −1 (imported-input
   thesis) and not flipping to the +1 USD-earner regime that dominates Plantation.
```
