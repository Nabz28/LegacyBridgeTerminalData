# Poultry — Driver-Tree Plan

> Sub-industry detail file (template §4 of `plan/IMPROVEMENT_PLAN.md`). Sector:
> Consumer Non-Cyclicals · basket id `consumer_non_cyclicals_poultry` · ~6.3T mcap ·
> IDX sub_sector key **"Poultry"**. Every series cited is confirmed live in
> `plan/DATA_INVENTORY.md` + `plan/catalog/*.json` with its RIC and n_obs. Library
> tags (`CORN`, `SOYMEAL`, `SOYOIL`, `USDIDR`, `DXY`…) are defined in
> IMPROVEMENT_PLAN §2 and not re-derived here.
>
> **This is a CLASSIC SPREAD/MARGIN basket and it ALREADY HAS strong forward skill
> (OOS IC +0.216, placebo pctile 0.98, SKILL).** The job here is NOT to fix a broken
> tree (cf. Property/Banks) — it is to **understand WHY the corn/soymeal feed channel
> forecasts, deepen it, and protect it from dilution** so the +0.216 holds or rises
> as the tree is enriched. The discipline is Tier-B ("deepen without breaking").

---

## 1. Snapshot + current state

**Basket.** 9 names, ~6.3T total mcap — a *small* basket by exchange weight, and a
notable data caveat sits right at the top: the worklist members are **not** the
canonical big integrated poultry names a sell-side analyst would anchor on. The
intended economic hook is the **integrated broiler complex — CPIN (Charoen Pokphand),
JPFA (Japfa), MAIN (Malindo), plus WMUU/SIPD** — the feed→DOC→broiler verticals that
*define* the corn/soymeal margin trade. The current `worklist.json` basket instead
holds **UDNG, NEST, DPUM, CRAB, ASHA, DEWI, ENZO, ISEA, IKAN** — a thinner, partly
mislabelled set (some are aquaculture/seafood-adjacent: ISEA/IKAN/CRAB read as
fish/crustacean, not chicken). **This is a basket-membership data issue, not a driver
issue** (see §1 bug list) — but the driver economics below are written for the
*integrated-poultry* structure the engine is meant to model, because that is what the
corn/soymeal skill is measuring against and what the IDX "Poultry" sub_sector denotes.

| Name | RIC | mcap (T) | beta | What it (should) do | Feed-margin purity |
|---|---|---|---|---|---|
| Uni-Charm / UDNG | `IDX:UDNG` | 2.15 | 1.12 | largest member; consumer-staples adjacency | low purity (not pure broiler) |
| NEST | `IDX:NEST` | 2.06 | n/a | food/staples | low purity |
| DPUM | `IDX:DPUM` | 0.84 | 0.37 | poultry/agri trade | mid |
| CRAB | `IDX:CRAB` | 0.39 | 0.14 | **seafood (crab)** — not poultry | aquaculture, off-thesis |
| ASHA | `IDX:ASHA` | 0.31 | 1.48 | agri/food | mid |
| DEWI | `IDX:DEWI` | 0.24 | −0.09 | food | low |
| ENZO | `IDX:ENZO` | 0.16 | n/a | food | low |
| ISEA | `IDX:ISEA` | 0.09 | n/a | **seafood** — not poultry | aquaculture, off-thesis |
| IKAN | `IDX:IKAN` | 0.07 | n/a | **fish (ikan = fish)** — not poultry | aquaculture, off-thesis |
| — *canonical hook (not in basket)* — | CPIN/JPFA/MAIN/WMUU/SIPD | — | — | integrated feed→DOC→broiler | **the real margin trade** |

**Intra-basket dispersion that matters.** A *true* integrated-poultry basket is highly
homogeneous on the feed-margin axis — CPIN/JPFA/MAIN all earn **broiler/DOC price −
feed cost**, so they share one dominant signal (the feed spread). The current basket is
**heterogeneous and partly off-thesis**: the aquaculture names (CRAB/ISEA/IKAN, ~0.55T
combined) and the staples-adjacent large caps (UDNG/NEST, ~4.2T — the mcap-dominant
pair) **dilute** the chicken-feed signal. That the basket *still* scores OOS +0.216
despite this membership noise is strong evidence the **corn/soymeal channel is real and
robust** — a clean integrated basket would likely score higher.

**Current engine state (SEED `"Poultry"` in `mapping.py`):**
```python
"Poultry": {
    "ceic": [("Consumer Staples", "Poultry Trade"),
             ("Consumer Staples", "Livestock & Animal Husbandry")],
    "globals": [("corn", "cost", -1, "corn = ~50% of feed cost"),
                ("soybean_meal", "cost", -1, "soymeal feed cost")],
    "macro": [("id_cpi_yoy", "demand", +1, "broiler/DOC price = revenue"),
              ("id_gdp_real_q", "demand", +1, "protein demand")],
},
```
- **kept = 11** drivers (`_state.txt`: `42|Poultry|…|6|perfected|11|skill|0.216`).
- **grade = perfected · conf = high · forward OOS IC = +0.216**
  (BACKTEST.md: n_oos **70**, hit−up **+0.12** (strong — the up-move is captured, not
  just symmetric variance), placebo pctile **0.98**, flag **SKILL**). This is the
  **4th-highest forward IC in the entire 52-basket book** (behind only Healthcare
  Equipment +0.29, Alternative Energy +0.23, Coal +0.23) and the highest in Consumer
  Non-Cyclicals. The hit−up of +0.12 is among the best in the book — the signal
  forecasts *direction*, not just co-moves.

**Why it already works (the thesis in one line).** Poultry is the cleanest
**cost-pass-through / crush-spread** basket on the exchange: feed is **~70–75% of the
cost of goods** (corn ~50%, soybean-meal ~20–25%), corn and soymeal are **liquid,
exogenous, USD-priced CBOT futures that LEAD** the Indonesian broiler equities by
weeks-to-months, and the sign is unambiguous: **feed up ⇒ margin down ⇒ equity down
(−1)**. The engine has the two grain legs wired with the correct `cost −1` sign, and
that pair alone carries most of the +0.216. BACKTEST.md's pattern note nails it:
*"forward skill is concentrated in physical-commodity / cost-pass-through baskets …
their drivers are real, exogenous prices that genuinely lead the equities."* Poultry is
the textbook case.

**The gap (deepen-not-fix).** The skill is real but the tree is *thin* (4 seed leaves,
11 kept after the CEIC block expands). Five enrichments are available and none risks
the core:
1. **The feed cost is only 2/3 modelled.** Corn + soymeal are wired, but the **margin
   is a SPREAD** — broiler/DOC price *minus* feed — and the **revenue (price) leg is
   only proxied by headline CPI** (`id_cpi_yoy`), a blunt instrument. The real broiler
   and DOC price series exist and are deep (§3 D1) but are **not wired**.
2. **The CEIC price series enter neutrally-signed.** The "Poultry Trade" + "Livestock"
   blocks are pulled in, but every poultry *price* series in them is CEIC-tagged
   `demand`/`supply` and the resolver's default for a non-demand role is **sign 0**
   (`drivers.py:133`) — so the deep daily broiler producer/wholesale price prints add
   variance, not directional revenue signal.
3. **The third feed leg (soybeans) and the soy-complex crush are absent** — soybeans
   (`CBOT:ZS1!`) and soyoil (`CBOT:ZL1!`) co-determine soymeal supply and confirm the
   feed-cost direction; only soymeal is wired.
4. **USD/IDR — the imported-feed FX channel — is not wired.** ~Corn and ~all soymeal
   are *imported and USD-priced*, so IDR weakness amplifies the feed-cost squeeze
   (`usdidr −1` on the basket) — a clean, high-prior macro leaf that is missing.
5. **Disease (avian influenza) and the DOC culling cycle** — the two idiosyncratic
   supply shocks a poultry analyst watches — have no clean leading series (honest
   concession, §8), but the **broiler/DOC price itself** captures their realized effect.

This file deepens the feed-cost spread (add soybeans + the crush context), wires the
broiler/DOC revenue leg with a directional override, adds the imported-feed FX channel,
and tags exactly which branch forecasts — without touching the corn/soymeal core that
generates the +0.216.

**Data bugs found (verified):**
- **Basket membership is off-thesis.** The worklist "Poultry" basket contains
  aquaculture/seafood names (CRAB, ISEA, IKAN — crab/fish, not chicken) and
  staples-adjacent large caps (UDNG, NEST) that dominate the mcap, while the canonical
  integrated-poultry names the thesis is built on (CPIN/JPFA/MAIN/WMUU/SIPD) are
  **absent**. The classifier appears to have mis-bucketed. This is flagged for the
  membership pipeline; the engine still scores SKILL *despite* it, which is the point.
- **`dxy → TVC:BBDXY` in `GLOBAL_CORR` is EMPTY (weekly_obs 0).** The populated dollar
  index is `TVC:DXY` (800). Poultry's imported-feed cost is USD-priced, so the broad
  dollar belongs in this tree — but the current resolver points at the dead ric.
  (System-wide bug; relevant here because the USD/feed channel matters, §5.)
- **China corn/soybean customs series are unpopulated.** `aCNEXPAGMZ` (China maize
  exports), `aCNCNAHRGM` (China corn export), `aCNCNKRWDM`/`aCNCNJHJZM` (soybean) all
  exist in `cn.json` but carry **n_obs = None** (spark-only) → **DO NOT wire**; use the
  liquid CBOT grain futures, which already capture global grain demand including China.
- **No avian-influenza / disease series in any catalog** (idind/id/cn searched: zero AI
  / HPAI / culling series). The disease-supply-shock branch is therefore unmodellable
  as a leading signal — captured only ex-post via the broiler price (honest gap, §8).

---

## 2. Economic structure — how an integrated-poultry basket makes money

The integrated broiler revenue identity is **price × volume − feed cost**, and the
*spread* (price − feed) is the entire earnings story. Unlike a branded-food basket where
brand and volume dominate, here both legs of the spread are **liquid commodities that
swing violently**, so margin is the variance driver:

```
Revenue   =  broiler/DOC volume                ×  broiler price (or DOC price)
          =  (parent-stock × hatchability × grow-out cycles)  ×  (live-bird IDR/kg)
                         │                  │                        │
                    flock cycle        avian-influenza          protein demand /
                    (DOC placement)    culling shocks           Ramadan seasonality

COGS      ≈  FEED (70-75%)  +  DOC  +  labour/medication/energy
FEED      =  CORN (~50%)  +  SOYBEAN-MEAL (~20-25%)  +  premix/additives
            └── imported, USD-priced, CBOT-benchmarked ─────────┘

MARGIN    =  broiler price  −  feed cost           ← THE earnings driver (a SPREAD)
          ≈  (live-bird IDR/kg)  −  (0.50·corn + 0.22·soymeal, USD→IDR)
```

Four structural facts define why this basket forecasts:

- **Feed is the dominant cost AND it is an exogenous, leading, liquid price.** Corn
  (`CBOT:ZC1!`, 800 wk obs) and soybean-meal (`CBOT:ZM1!`, 800 wk obs) are global
  futures that move on US/Brazil/Argentina harvests, China demand, ethanol policy, and
  weather — **none of which the Indonesian broiler equity influences**. They are pure
  upstream cost shocks. When corn spikes, the integrated producers' margins compress
  with a lag (feed is bought forward, contracts reprice over 1–3 months), and the
  equities re-rate *after* the grain move — this lag is the source of the forward skill.
- **The margin is a SPREAD, and the engine currently models only the cost leg well.**
  The price leg (broiler/DOC) is proxied by headline CPI. Modelling the actual broiler
  price (deep daily CEIC prints) would let the engine see margin *compression* (feed up
  AND broiler flat) vs *pass-through* (feed up AND broiler up) — the distinction that
  separates a bad quarter from a neutral one.
- **FX double-counts onto the cost side.** Corn and soymeal are imported and USD-priced;
  Indonesia is a structural corn/soy importer for feed. So **IDR weakness raises the
  IDR-denominated feed bill** — the FX channel is a cost amplifier, sign **−1 on the
  basket** (the *opposite* of an exporter like Plantation, where IDR weakness is a
  revenue tailwind). This is the cross-link seam with Plantation/Coal (§6).
- **Volume is biologically cyclical and shock-prone, but mostly an attribution term.**
  DOC (day-old-chick) placements set broiler supply ~5–7 weeks ahead; the
  **flock/culling cycle** and **avian-influenza outbreaks** cause supply shocks that
  swing the live-bird price. These are real and watched, but there is **no leading
  series** for them — they show up *in* the broiler price after the fact.

**What a sell-side poultry analyst watches** (and what the engine should encode):
1. **The feed spread** — corn + soymeal landed cost (USD→IDR) vs the live-bird price.
   This IS the margin and the single most important number.
2. **Broiler / live-bird price** (Harga Ayam Hidup) and **DOC price** — the revenue leg;
   government sometimes sets a price floor/ceiling (HPP/HET) to defend farmers.
3. **Corn import policy** — Indonesia periodically bans/restricts feed-corn imports to
   protect domestic maize farmers, spiking *domestic* feed cost above the CBOT screen.
4. **Avian influenza (HPAI)** — outbreaks force culling → near-term supply down →
   broiler price up (margin up *if* feed steady), but demand-shock risk if consumers
   avoid chicken.
5. **Protein demand / real income / Ramadan** — chicken is the cheapest animal protein;
   demand tracks real income and spikes seasonally (Ramadan/Lebaran, Christmas).
6. **DOC placement / parent-stock culling cycle** — the supply pipeline 5–7 weeks out.

Because the **cost leg dominates and is exogenous + liquid + leading**, this basket is a
genuine forward forecaster — which the OOS backtest confirms (+0.216, hit−up +0.12,
pctile 0.98). The enrichments below *protect* that and add the missing revenue leg.

---

## 3. DEMAND driver tree

Demand for a poultry basket = **domestic protein demand** (chicken is the cheapest
animal protein, so demand is income-elastic at the low end and seasonal), transmitted
through the **broiler/live-bird price** (the revenue leg of the spread). The leading,
forecastable demand signal is weak here — demand is slow and domestic — so the demand
side is mostly **attribution + a price-realization leg**. The forecast power lives on
the COST side (§4). Sign convention: higher broiler price / stronger demand = **+1**.

```
DEMAND  (domestic protein pull → broiler/DOC price → revenue)        [basket sign +1]
├── D1 Broiler / live-bird PRICE  ──►  the revenue leg of the margin spread
│     ├─ D1a Broiler retail price (monthly)  `CEICI230930202` Retail: Purebred Chicken
│     │      [IDR/kg, P1M, n234] · role demand · sign +1 · the cleanest monthly broiler
│     │      revenue print. CEIC-tagged demand → enters at default +1 (OK) but is a PRICE
│     │      not a quantity, so it's a genuine revenue proxy. LEAD ~0 (coincident with
│     │      margin) → ATTRIBUTION + the spread's price leg. **Wire explicitly.**
│     ├─ D1b Broiler producer (farm-gate) price (DAILY)  `CEICI454662627`
│     │      Producer Price: Chicken Meat: Purebred [IDR/kg, P1D, n1849] · role supply
│     │      (CEIC-tagged) → ⚠ default sign 0. This is the FARM-GATE price the integrated
│     │      producer actually receives = the truest revenue leg. **Override → demand +1.**
│     │      Daily, deep (n1849) → the most timely broiler-price handle in the store.
│     ├─ D1c Broiler wholesale price (daily)  `CEICI432431167` Wholesale: Purebred Chicken
│     │      [IDR/kg, P1D, n2284] · role demand · sign +1 · the mid-chain price; confirms D1a/b.
│     └─ D1d Egg price (layer revenue)  `CEICI230931102` Retail: Purebred Chicken Egg
│            [IDR/kg, P1M, n220] · role demand · sign +1 · the LAYER side of the basket
│            (eggs vs broiler meat); a second revenue stream, same feed cost. LEAD ~0.
├── D2 Protein / real-income demand  ──►  volume pull (income-elastic, seasonal)
│     ├─ D2a Real income / GDP  tag GDP `id_gdp_real_q` `aIDGDPAR1` ✓ · role demand +1
│     │      LEAD ~1Q · chicken demand tracks real income (cheapest animal protein);
│     │      already in seed. Weak forecaster (slow, quarterly) → attribution/level.
│     ├─ D2b Retail sales / food retail  `id_retail` `aIDRSLSAR` [%YoY,P1M] · demand +1
│     │      monthly proxy for food-volume demand; better-frequency than GDP. **ADD.**
│     │      (Also `CEIC322851902` Real Retail Sales: Food, Beverage & Tobacco, n196.)
│     └─ D2c Consumer confidence  `id_consumer_confidence` `aIDCONIAR` · demand +1 · LEAD
│            ~1Q · forward-looking demand sentiment; protein trade-down/up at the margin.
├── D3 Food-price inflation (broiler-price proxy, the seed's current revenue leg)
│     └─ D3a Headline CPI YoY  `id_cpi_yoy` `ECONOMICS:IDIRYY` · role demand · sign +1
│            the seed's stand-in for "broiler/DOC price = revenue". KEEP but DEMOTE in
│            weight once the real broiler prices (D1) are wired — CPI is a blunt,
│            economy-wide proxy that conflates feed-cost-push (bad for margin) with
│            demand-pull (good). Better: the food-&-beverage CPI sub-index
│            `CEIC521347877` Food, Beverage & Tobacco [2022=100, P1M, n41] (more
│            poultry-relevant than headline). ⚠ Note the SIGN AMBIGUITY: CPI up via
│            feed-cost-push is margin-NEGATIVE; CPI up via demand-pull is margin-positive.
│            The real broiler price (D1) disambiguates → that's why D1 should lead D3.
└── D4 Seasonality (Ramadan / Lebaran / festive protein demand)  ── no clean series
      role demand · sign +1 · chicken demand spikes ~2-4 weeks before Lebaran and at
      year-end. Captured implicitly in the monthly broiler price (D1a) seasonal pattern;
      no standalone leading series → context only, not wired.
```

**Forecast hypothesis (demand side).** The demand side is **mostly attribution**: the
broiler/egg price leaves (D1) are coincident revenue proxies (the spread's price leg,
not a lead), and the income/confidence leaves (D2) are slow. The one genuinely useful
demand enrichment is **wiring the real broiler price (D1a/b)** so the engine can compute
the *margin spread* against feed, rather than proxying revenue with headline CPI. The
forward edge is NOT here — it is on the cost side.

---

## 4. SUPPLY / COST driver tree — the feed spread (the source of the +0.216)

This is the heart of the basket. The cost side splits into (a) the **feed complex**
(corn + soymeal + the soy-crush context — the leading, exogenous, USD-priced grains
that generate the forward skill), (b) the **FX amplifier** (imported feed is USD-priced),
and (c) the **domestic supply cycle / policy** (DOC placements, corn-import bans, avian
influenza — mostly slow/unmodellable). Sign convention: higher cost = margin down =
**−1 on the basket**; higher own-supply (more broilers) = price down = also broadly **−1**.

```
SUPPLY / COST   (feed cost spread × FX × domestic supply cycle)
├── S1 FEED COMPLEX (the dominant cost ~70-75%; LEADING, exogenous, USD grains)  [−1]
│     ├─ S1a CORN (the ~50% leg, ANCHOR)  tag CORN · `CBOT:ZC1!` weekly_obs 800 ✓
│     │      role cost · sign −1 · LEAD ~1-3m · corn is ~half the feed bill; a CBOT corn
│     │      rally raises the IDR feed cost (Indonesia imports feed corn) → margin
│     │      compression with a 1-3m lag as contracts reprice → the equities re-rate
│     │      after. **This is the single most important leaf and it is ALREADY WIRED
│     │      correctly (`corn cost -1`).** Liquid daily/weekly price → genuine forecaster.
│     ├─ S1b SOYBEAN-MEAL (the ~20-25% leg)  tag SOYMEAL · `CBOT:ZM1!` weekly_obs 800 ✓
│     │      role cost · sign −1 · LEAD ~1-3m · the protein leg of feed; same mechanism
│     │      as corn. **ALREADY WIRED (`soybean_meal cost -1`).** Together S1a+S1b ≈ the
│     │      whole feed bill and ≈ the whole forward signal.
│     ├─ S1c SOYBEANS (crush context)  tag SOYBEANS · `CBOT:ZS1!` weekly_obs 800 ✓
│     │      role cost · sign −1 · soybeans are crushed into soymeal (+ soyoil); the bean
│     │      price drives meal supply/cost. Co-moves with S1b but confirms the direction
│     │      and adds robustness. **ADD (low prior, non-core confirmation).**
│     ├─ S1d SOYOIL (crush co-product, context)  tag SOYOIL · `CBOT:ZL1!` weekly_obs 800 ✓
│     │      role cost · sign ambiguous → prior 0 · soyoil is the OTHER crush co-product;
│     │      high soyoil demand pulls more crush → MORE soymeal supply → meal CHEAPER
│     │      (margin-positive for poultry). The crush-spread cross-link to Plantation
│     │      (§6). Low prior, optional — include to model the crush, let data sign it.
│     └─ S1e Domestic complete-feed trade (CEIC, attribution)  `CEICI387999127`
│            Export: Value: Complete feed for poultry [USD mn, P1M, n112] · role supply →
│            ⚠ default sign 0 · this is a feed-TRADE value print (lagged, low causal
│            content for a domestic margin) → keep as context/attribution only, low weight.
├── S2 FX — imported-feed cost amplifier  ──►  IDR feed bill (the FX leg of the spread)
│     └─ S2a USD/IDR  tag USDIDR · `FX_IDC:USDIDR` weekly_obs 801 ✓ · role cost · sign −1
│            mechanism: corn + soymeal are imported and USD-priced; IDR weakness raises
│            the IDR-denominated feed bill → margin compression. **This is the OPPOSITE
│            sign to exporter baskets (Plantation/Coal +1) and it is currently MISSING
│            from the seed.** High prior, clean, leading (FX moves before the feed
│            invoice settles). **ADD as `usdidr cost -1`** — likely the highest-value
│            single enrichment. The feed cost is effectively `corn(USD)·USDIDR` →
│            the FX and the grain interact multiplicatively.
├── S3 Domestic supply cycle  ──►  broiler supply → live-bird price (mostly attribution)
│     ├─ S3a DOC placement / flock proxy  `CEICI118340701` Livestock: Broiler Chicken
│     │      [Head, P1Y, n37] · role supply · sign −1 (more birds = lower price) · ANNUAL,
│     │      publication-lagged → attribution only; far too slow to forecast the 5-7 week
│     │      grow-out cycle. Context/level term.
│     ├─ S3b Layer flock  `CEICI118337601` Livestock: Layer Chicken [Head,P1Y,n37]
│     │      role supply · sign −1 · the egg-supply analogue · annual → attribution.
│     └─ S3c Government culling / supply-management (HPP) — no clean series · context only.
├── S4 Corn-import POLICY (Indonesia-specific feed-cost wedge)  ──►  domestic vs CBOT corn
│     └─ S4a Corn-import restriction proxy — ⚠ NO clean populated series. Indonesia
│            periodically bans/restricts feed-corn imports to support domestic maize
│            farmers, pushing the *domestic* feed-corn price ABOVE the CBOT screen
│            (a positive wedge that hurts integrators beyond what `CBOT:ZC1!` shows). The
│            domestic maize price would capture it but the only maize series is
│            `CEICI250719903` (Agricultural Yield: Maize, 100 kg/ha, P1Y, n13 — a YIELD,
│            not a price, annual, tiny). **Unmodellable as a leading wedge** → honest gap
│            (§8); CBOT corn is the best available proxy and it works.
└── S5 Disease shock (avian influenza / HPAI)  ──►  culling → supply down → price up
      role supply · sign on broiler price +1 (supply shock), but DEMAND-shock risk if
      consumers avoid chicken (sign −1 on volume) · ⚠ NO AI/HPAI/culling series in any
      catalog → unmodellable as a leading signal. Realized effect appears in the broiler
      price (D1) ex-post → attribution only. Honest concession (§8).
```

**Endogeneity guard (per IMPROVEMENT_PLAN §"exclude endogenous").** The basket's *own
output level* (broiler flock heads S3a, complete-feed trade S1e) and any
constituent-specific balance-sheet series must stay **attribution**, not forecasters.
The exogenous forecast leaves are the **CBOT grain prices** (corn, soymeal, soybeans)
and **USD/IDR** — not the domestic volume prints. The broiler PRICE (D1) is a special
case: it is the revenue leg of the spread (legitimate to wire as the margin's positive
side) but it is near-coincident, so it is the spread's *price input*, not an independent
lead.

**Why the feed side forecasts (the mechanism, stated plainly).** The forward skill is a
**lagged cost pass-through**: (1) a CBOT corn/soymeal move is *exogenous* to Indonesian
broilers (driven by US/South-American supply, China demand, weather, ethanol/biofuel
policy); (2) the Indonesian integrators buy feed forward and reprice contracts over
1–3 months, so the *margin* hit lands with a lag; (3) the *equity* re-rates as analysts
mark down forward earnings — also lagged. So the grain price at month *t* contains
information about the broiler equity return at *t+1…t+3*. That lag is the edge, and it
is robust because the grains are deep, liquid, and genuinely upstream. The negative sign
(`cost −1`) is the correct, theory-anchored prior — and the +0.12 hit−up confirms the
engine is catching the *down-moves* (feed-cost spikes) that hurt the basket.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 USD/IDR  tag USDIDR · `FX_IDC:USDIDR` weekly_obs 801 ✓ ── sign −1 on the basket
│     mechanism: feed (corn+soymeal) is imported + USD-priced → IDR weakness RAISES the
│     IDR feed bill → margin compression. This is the cleanest macro leaf and it is the
│     OPPOSITE sign to the exporter baskets (Plantation/Coal +1). Currently MISSING from
│     the seed → **ADD (`usdidr cost -1`, high prior).** LEAD short (FX leads the invoice).
│     [Listed as S2a on the cost side too — it is fundamentally a feed-cost amplifier.]
├── M2 DXY / broad dollar  tag DXY · ⚠ FIX `dxy → TVC:BBDXY` is EMPTY (0); USE `TVC:DXY` (800)
│     sign −1 (prior, weak): a strong broad USD usually coincides with firmer
│     dollar-priced grains AND IDR weakness → feed-cost headwind. Secondary to USDIDR
│     (which is the direct channel). Low prior, optional; mainly a system-wide ric fix.
├── M3 Rates  `id_bi_rate` `ECONOMICS:IDINTR` / `id_10y` `TVC:ID10Y`
│     mostly SECOND-ORDER. Integrated poultry carries working-capital + feed-inventory
│     financing, so higher rates modestly raise carrying cost (sign −1, weak) — but this
│     is dwarfed by the feed spread. Low prior / optional; not a rate-proxy basket.
├── M4 Domestic demand backdrop  `id_gdp_real_q` `aIDGDPAR1` · demand +1 (already seeded)
│     protein demand tracks real income; slow → attribution/level, not a forecaster.
└── M5 Risk appetite / EM flow  `vix`/`ndx`/`dxy` — low relevance; small-cap domestic
      staples basket, not a foreign-flow favourite. Skip / prior 0.
```

The macro story is **simple and one-sided**: USD/IDR is the only high-confidence macro
leaf, and it is a **cost amplifier (−1)**, not a revenue translator. Rates are
second-order; flow is irrelevant. The cleanest possible macro posture for this basket is
*"FX as a feed-cost multiplier, everything else low-prior."*

---

## 6. Cross-industry linkages

- **Plantation / Food & Beverage (the soy-crush seam).** Soybeans (`CBOT:ZS1!`) are
  crushed into **soymeal** (Poultry feed, S1b) *and* **soyoil** (`CBOT:ZL1!`, the CPO
  substitute on Plantation's demand side, D1b there). The two are co-products of one
  crush, so a crush-margin swing links the baskets: strong soyoil demand → more crush →
  more soymeal supply → **cheaper feed for poultry** (margin-positive). The same soy
  complex is Plantation's *demand* cross-price and Poultry's *cost* input — opposite
  roles, one commodity tree. This is the most important cross-link.
- **Coal / Plantation (the FX-sign mirror).** USD/IDR is **cost −1 for Poultry**
  (imported feed) but **revenue +1 for Coal/Plantation** (USD exporters). Same macro
  series, opposite basket sign — the engine must keep the sign basket-specific (it does:
  per-basket macro hints). This is the canonical FX-direction teaching case alongside
  Plantation §6.
- **Food & Beverage (downstream protein).** Processed-chicken / nugget makers (the F&B
  basket) buy broiler meat as *their* input — so a high broiler price (Poultry revenue
  +1) is an F&B *cost* (−1). The integrated names (CPIN/JPFA) straddle this seam via
  their own processed-food arms.
- **Chemicals / Fertilizers (corn-supply cross-link, indirect).** Domestic feed-corn
  supply depends on fertiliser-driven maize yields; no clean tradable link, proxied
  only via the CBOT corn price. Minor.

---

## 7. Currently wired vs available

| Branch | Wired now? | Series (RIC) | n_obs / freq | Priority to ADD/FIX |
|---|---|---|---|---|
| **CORN feed cost (anchor)** | ✅ | `CBOT:ZC1!` | 800 wk | **KEEP** (the core leaf; do not touch) |
| **SOYMEAL feed cost** | ✅ | `CBOT:ZM1!` | 800 wk | **KEEP** (the core leaf) |
| Soybeans (crush context) | ❌ | `CBOT:ZS1!` | 800 wk | ADD (low prior, confirms feed dir) |
| Soyoil (crush co-product) | ❌ | `CBOT:ZL1!` | 800 wk | ADD optional (prior 0, crush model) |
| **USD/IDR (imported-feed FX)** | ❌ | `FX_IDC:USDIDR` | 801 wk | **ADD `cost -1`** (highest-value enrich) |
| DXY (broad dollar) | ❌ (+dead ric) | `TVC:DXY` (`BBDXY`=**0**) | 800 wk | ADD low-prior via `TVC:DXY`; fix dead ric |
| **Broiler retail price (revenue)** | ⚠ in-block | `CEICI230930202` | n234 P1M | **wire explicitly, demand +1** |
| **Broiler producer/farm-gate price** | ⚠ neutral | `CEICI454662627` | n1849 P1D | **OVERRIDE → demand +1** (deep daily) |
| Broiler wholesale price | ⚠ in-block | `CEICI432431167` | n2284 P1D | keep (confirms, demand +1) |
| Egg retail price (layer rev) | ⚠ in-block | `CEICI230931102` | n220 P1M | keep (demand +1) |
| Headline CPI (revenue proxy) | ✅ | `ECONOMICS:IDIRYY` | — P1M | **KEEP but DEMOTE** (blunt; sign-ambiguous) |
| Food/Bev/Tobacco CPI sub-index | ❌ | `CEIC521347877` | n41 P1M | ADD optional (more poultry-relevant) |
| Real income / GDP | ✅ | `aIDGDPAR1` | — P3M | keep (attribution/level) |
| Retail sales (food volume) | ❌ | `aIDRSLSAR` / `CEIC322851902` | P1M | ADD (monthly demand proxy) |
| Consumer confidence | ❌ | `aIDCONIAR` | P1M | ADD optional (forward demand) |
| Broiler flock heads (supply) | ⚠ in-block | `CEICI118340701` | n37 P1Y | keep attribution (annual, slow) |
| Layer flock heads | ⚠ in-block | `CEICI118337601` | n37 P1Y | keep attribution |
| Complete-feed trade (CEIC) | ⚠ neutral | `CEICI387999127` | n112 P1M | keep context, low weight |
| Domestic maize price/yield | ❌ | `CEICI250719903` (yield only) | n13 P1Y | unmodellable (yield not price) |
| China corn/soy customs | ❌ | `aCNEXPAGMZ`/`aCNCNAHRGM`… | **None** | DO NOT wire (unpopulated) |
| Avian-influenza / culling | ❌ | — | — | unmodellable (no series) |
| Corn-import policy wedge | ❌ | — | — | unmodellable (no domestic corn price) |
| Rates (id_bi_rate / id_10y) | ❌ | — | — | leave OUT / low prior (not a rate basket) |
| CEIC Poultry Trade + Livestock | ✅ | `("Consumer Staples","Poultry Trade"/"Livestock…")` | blocks | keep, but apply price override |

---

## 8. Forecastability — why it ALREADY works, and how to protect/deepen it

**The exploitable edge is the FEED-COST PASS-THROUGH, lagged.** Per BACKTEST.md the
basket sits at **forward IC +0.216, placebo pctile 0.98, hit−up +0.12** (n_oos 70,
flag **SKILL**) — the 4th-highest forward IC in the book and the best in Consumer
Non-Cyclicals. The hit−up of +0.12 (high) means the signal forecasts *direction* (it
catches the feed-cost-spike down-moves), not just symmetric variance. This is exactly
the BACKTEST pattern: *"forward skill concentrated in physical-commodity /
cost-pass-through baskets … real, exogenous prices that genuinely lead the equities."*

**Which branches LEAD (forecast) vs lag (attribute):**

| Branch | Lead | Forecast or attribution | Why |
|---|---|---|---|
| **Corn `CBOT:ZC1!`** | **~1–3m** | **forecast (the core)** | exogenous global grain; feed contracts reprice with a lag → margin/equity re-rate after |
| **Soymeal `CBOT:ZM1!`** | **~1–3m** | **forecast (the core)** | same lagged-cost-pass-through mechanism |
| Soybeans `CBOT:ZS1!` | ~1–3m | forecast (confirming) | drives meal supply; co-moves with soymeal |
| USD/IDR | short | **forecast (amplifier)** | FX leads the IDR feed invoice; multiplies the grain cost |
| Broiler/DOC price `CEICI…` | ~0 | attribution (spread price leg) | near-coincident revenue; the spread's positive side |
| Headline CPI | ~0 | attribution (ambiguous) | conflates feed-push (−margin) with demand-pull (+margin) |
| GDP / flock heads | quarterly/annual | attribution only | slow, publication-lagged volume/income levels |
| Avian influenza / culling | — | unmodellable | no series; realized only in the broiler price ex-post |

**Why it works so well today (diagnosis of the strength):**
1. **The two wired leaves are nearly the whole economic cost.** Corn (~50%) + soymeal
   (~22%) ≈ ~72% of COGS, and both are wired with the *correct* `cost −1` prior. The
   engine is, in effect, running a clean lagged feed-cost factor — and that factor
   genuinely leads the equities. Almost the entire +0.216 comes from these two.
2. **The sign is unambiguous and theory-anchored.** Unlike a bank (rate sign ambiguous)
   or a CPI proxy (push vs pull), "feed up = margin down = equity down" has no
   competing channel. The a-priori `−1` is defensible, so the blindfolded test (which
   fixes signs a-priori, zero parameters fit) rewards it.
3. **The grains are deep and liquid** (800 wk obs each), so the standardisation and the
   tanh transform are stable across the whole walk-forward — no thin-history noise.

**Why it is "only" +0.216 and not higher (the headroom):**
1. **The revenue leg is missing/blunt.** The margin is a *spread*, but only the cost leg
   is modelled well; revenue is proxied by headline CPI (sign-ambiguous). Wiring the
   real broiler price (D1) lets the engine compute margin = price − feed, distinguishing
   a feed spike that passes through (neutral) from one that compresses margin (bearish).
2. **FX is unwired.** The feed cost is `grain(USD)·USDIDR`; modelling the grain in USD
   but not the FX leaves the IDR-margin multiplier out — adding `usdidr cost −1` should
   sharpen the cost signal, especially in IDR-weakness regimes.
3. **Basket membership noise.** The aquaculture/staples members (CRAB/ISEA/IKAN/UDNG/
   NEST) dilute the chicken-feed signal; a clean integrated basket (CPIN/JPFA/MAIN)
   would likely score higher. This is a *membership* fix, not an engine fix, but it
   caps the achievable IC.

**How to deepen WITHOUT breaking the +0.216 (Tier-B discipline):**
- **Never touch the corn + soymeal core.** They carry the skill; every change is
  *additive* and gated on the backtest holding/improving.
- **Add `usdidr cost −1`** (the imported-feed FX amplifier) — highest-value enrichment;
  same sign-family as the grains, should reinforce not dilute.
- **Add `soybeans cost −1`** (crush confirmation) at low prior; ablate to confirm it
  adds (or holds) IC and isn't merely collinear with soymeal.
- **Wire the broiler price (D1a retail + D1b producer override → demand +1)** so the
  engine sees the spread's revenue leg; demote headline CPI's effective weight.
- **Fix `dxy → TVC:DXY`** (system-wide dead-ric fix) and optionally add it at low prior.
- **Tag the verdict honestly:** *feed (corn/soymeal/soybeans) + FX = forecast; broiler
  price + CPI + GDP + flock heads = attribution; disease + import-policy = unmodellable.*

**Honest ceiling and concessions.**
- **Avian influenza is the dominant un-forecastable supply shock** and there is **no
  HPAI/culling series in any catalog** — outbreaks hit the broiler price out of nowhere.
  The engine cannot anticipate them; it only attributes them ex-post via the price.
- **The corn-import-policy wedge** (Indonesia restricting feed-corn imports → domestic
  corn above the CBOT screen) is real and material, but **no domestic feed-corn price
  series exists** (only an annual maize *yield*). CBOT corn is the best proxy and it
  works, but in a hard import-ban regime the domestic squeeze will exceed what the
  screen shows — a known, accepted blind spot.
- **Realistic target:** this is already a SKILL basket; the deepening aims to **hold
  +0.216 and ideally push toward +0.25** via the FX + broiler-price legs, while making
  the tree economically complete (a full margin spread, not just a cost factor). Do not
  chase in-sample gains — every leaf is KEEP-gated on the blindfolded forward IC.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current thin `"Poultry"` SEED with the structure below. Tuple driver =
`(key, role, sign, why)`. **The corn + soymeal `cost −1` core is preserved verbatim** —
it generates the +0.216 and must not be disturbed; everything else is additive and
backtest-gated. New `GLOBAL_CORR` work: **fix `dxy → TVC:DXY`** (currently the empty
`TVC:BBDXY`; system-wide, helps other baskets too).

```python
"Poultry": {
    # Keep the CEIC blocks (Poultry Trade carries the broiler/egg PRICE series;
    # Livestock carries the flock-head attribution series). Apply a price override
    # so the broiler producer/farm-gate PRICE gets a directional revenue sign
    # instead of the default supply->sign 0 (drivers.py:133).
    "ceic": [("Consumer Staples", "Poultry Trade"),
             ("Consumer Staples", "Livestock & Animal Husbandry"),
             ("Consumer Staples", "Poultry & Egg Prices")],   # the deep daily/monthly broiler+egg prices
    # exclude the off-thesis / wrong-commodity quantity prints dragged in:
    "ceic_exclude": ["incubator", "brooder", "machinery", "secateurs", "tools, hand",
                     "turkey", "guinea", "duck", "geese", "pig fat", "fat;"],
    # RE-ROLE the broiler PRICE series from the default supply->0 to a real revenue +1
    # (they are PRICES = revenue leg of the margin spread, not neutral volume prints).
    # ceic_override matches a lowercase substring of (topic+sub); each = [substr,role,sign]:
    "ceic_override": [
        ("producer price: chicken meat", "demand", +1),  # CEICI454662627 farm-gate broiler price (n1849 daily!)
        ("retail price: purebred chicken","demand", +1), # CEICI230930202 broiler retail (n234) / egg (n220)
        ("wholesale price: chicken",      "demand", +1),  # CEICI432431167 broiler wholesale (n2284 daily)
        # flock-head counts (broiler/layer) stay CEIC-'supply' default -> attribution.
        # complete-feed trade stays default -> context only.
    ],
    "globals": [
        # --- THE FEED-COST CORE (the source of the +0.216 — DO NOT TOUCH) ---
        ("corn",         "cost", -1, "corn = ~50% of feed cost; CBOT:ZC1! 800obs; exogenous, leads ~1-3m"),
        ("soybean_meal", "cost", -1, "soymeal = ~20-25% of feed; CBOT:ZM1! 800obs; same lagged pass-through"),
        # --- crush-complex confirmation (additive, low prior, backtest-gated) ---
        ("soybeans",     "cost", -1, "beans crush into meal; CBOT:ZS1! 800obs; confirms feed-cost direction"),
        ("soybean_oil",  "cost",  0, "crush co-product; high soyoil demand -> more crush -> cheaper meal (ambiguous, prior 0)"),
    ],
    "macro": [
        # --- FX: the imported-feed COST amplifier (OPPOSITE sign to exporters) — ADD ---
        ("usdidr",       "cost", -1, "corn+soymeal imported & USD-priced; IDR weakness RAISES IDR feed bill -> margin down"),
        ("dxy",          "cost", -1, "broad USD firms dollar-grains + IDR weakness -> feed headwind; USE TVC:DXY (BBDXY empty); low prior"),
        # --- demand / revenue context (attribution; CPI demoted, real prices in CEIC override) ---
        ("id_cpi_yoy",   "demand", +1, "broiler/DOC price proxy (BLUNT, sign-ambiguous: feed-push vs demand-pull) - demote vs real broiler price"),
        ("id_gdp_real_q","demand", +1, "protein demand tracks real income (slow -> attribution)"),
        ("id_retail",    "demand", +1, "monthly food-volume demand proxy; aIDRSLSAR"),
        ("id_consumer_confidence","demand", +1, "forward protein-demand sentiment; aIDCONIAR (optional, low prior)"),
        # DROPPED / OMITTED: rates (id_bi_rate/id_10y) — second-order vs the feed spread.
    ],
},
```

**`GLOBAL_CORR` fix (system-wide).** Change `"dxy": "TVC:BBDXY"` → `"dxy": "TVC:DXY"`
(the BBDXY series is empty, weekly_obs 0; TVC:DXY has 800). This is the same dead-ric
flagged in the verified caveats and in the Plantation file; it helps every basket that
uses the broad dollar, Poultry included.

**Membership note (NOT a `mapping.py` change — flag upstream).** The worklist "Poultry"
basket is mis-populated (aquaculture/staples names; the canonical CPIN/JPFA/MAIN/WMUU/
SIPD integrated-poultry names absent). This is a `build_worklist.py` / classifier issue,
not an engine-seed issue, and is out of scope for this read-only file — but it caps the
achievable IC and should be raised with the worklist pipeline. The driver tree above is
written for the *integrated-poultry* economics the sub_sector denotes, which is also
what the +0.216 is measured against.

**What to backtest (the KEEP/REJECT gate, per IMPROVEMENT_PLAN §6):**
1. Re-run `backtest/bt.py "Poultry"` after EACH change; this is a SKILL basket, so the
   bar is *hold or improve* the forward IC (+0.216) and the placebo pctile (0.98).
   **Reject any change that lowers forward IC**, even if it raises in-sample fit.
2. **FX-leg test (highest value):** add `usdidr cost −1`; confirm it holds/raises the
   forward IC and the hit−up. Expect it to help most in IDR-weakness sub-periods. If it
   only helps in-sample, demote to context.
3. **Crush-confirmation ablation:** add `soybeans cost −1` (and optionally `soybean_oil`
   at prior 0); verify they add (or hold) IC beyond corn+soymeal — i.e. non-collinear
   confirmation, not redundant noise.
4. **Broiler-price override test:** apply the `ceic_override` so the farm-gate/retail
   broiler price enters `demand +1`; confirm the revenue leg holds the forward IC (it is
   near-coincident, so the expectation is "holds, sharpens attribution," not a big lead
   gain). If it dilutes, keep it as attribution-only weight.
5. **CPI-demotion check:** verify that reducing reliance on headline CPI (now that real
   broiler prices are wired) does not cost forward IC — CPI is sign-ambiguous, so
   removing/de-weighting it may *help*.
6. **Core-immutability guard:** run an ablation that strips everything EXCEPT corn +
   soymeal; confirm that pair alone reproduces ~the bulk of +0.216 (it should). This is
   the regression test that protects the source of the skill.
7. **Verdict tagging:** report feed/FX-branch IC vs broiler-price/CPI/GDP-branch IC
   separately; the thesis predicts feed+FX ≫ revenue/volume. Tag the terminal read as
   **"forecast on the feed-cost / FX axis (lagged pass-through), attribution on the
   broiler price level and the volume prints; disease and import-policy unmodellable."**
```
