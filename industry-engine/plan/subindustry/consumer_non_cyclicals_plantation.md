# Plantation — Driver-Tree Plan

> Sub-industry detail file (template §4 of `plan/IMPROVEMENT_PLAN.md`). Sector:
> Consumer Non-Cyclicals · basket id `consumer_non_cyclicals_plantation` · ~244T mcap ·
> IDX sub_sector key **"Plantation"**. Every series cited is confirmed live in
> `plan/DATA_INVENTORY.md` + `plan/catalog/*.json` with its RIC and n_obs. Library
> tags (`CPO`, `SOYOIL`, `USDIDR`, `DXY`…) are defined in IMPROVEMENT_PLAN §2 and not
> re-derived here.

---

## 1. Snapshot + current state

**Basket.** 35 names, the largest single agri block on the exchange (244T mcap), but
the *tradable, CPO-upstream* weight is concentrated in ~12 names; the long tail is
illiquid micro-caps. The basket is an **upstream CPO producer** complex — the revenue
identity is **CPO/PKO price × FFB-derived volume − cash cost** — with a sugar/rubber/
agri-input tail. The names the hook anchors on (AALI, LSIP, SIMP, DSNG, TAPG, SSMS)
are the clean upstream planters; the build_worklist adds the rest by mcap.

| Name | RIC | mcap (T) | beta | What it does | CPO purity |
|---|---|---|---|---|---|
| Dharma Satya (DSNG) | `IDX:DSNG` | 13.6 | 0.08 | CPO upstream + wood-panel | upstream + downstream |
| Astra Agro (AALI) | `IDX:AALI` | 12.7 | 0.26 | CPO upstream (Astra) | **pure upstream** |
| Triputra Agro (TAPG) | `IDX:TAPG` | 32.2 | 0.31 | CPO upstream, young estates | **pure upstream** |
| Sampoerna Agro (NSSS→SGRO) | `IDX:SGRO` | 5.2 | −0.23 | CPO + sago/seeds | upstream |
| London Sumatra (LSIP) | `IDX:LSIP` | 9.0 | 0.13 | CPO + rubber (IndoAgri sub) | upstream + rubber |
| Salim Ivomas (SIMP) | `IDX:SIMP` | 8.7 | 0.38 | CPO upstream + **refining/cooking-oil** | **integrated** |
| Sawit Sumbermas (SSMS) | `IDX:SSMS` | 8.3 | 0.04 | CPO upstream, Central Kalimantan | **pure upstream** |
| Sinar Mas Agro (SMAR) | `IDX:SMAR` | 14.6 | 0.56 | CPO + **refining/biodiesel** (Sinarmas) | **integrated/downstream** |
| Provident/PGUN (PGUN) | `IDX:PGUN` | 42.5 | 2.39 | agri holding (highest mcap, high beta) | holding |
| Eagle High (BWPT) | `IDX:BWPT` | 2.7 | 0.20 | CPO upstream + rubber | upstream + rubber |
| Austindo (ANJT) | `IDX:ANJT` | 5.4 | 0.49 | CPO + sago + renewable | upstream |
| Gozco / Tunas Baru / Mahkota / Cisadane (GZCO/…/CSRA/GULA) | … | tail | mixed | CPO tail + **sugar** (GULA/CSRA) | mixed |

**Intra-basket dispersion that matters for signs.** The basket is *not* homogeneous:
- **Pure upstream (AALI, TAPG, SSMS, BWPT, ANJT):** a CPO price rise is unambiguous
  revenue → **sign +1**, the cleanest read.
- **Integrated / downstream (SMAR, SIMP):** own refineries, cooking oil, biodiesel.
  A CPO spike is *revenue to the estate but cost to the refinery* → net sign still +1
  (estate dominates) but **damped**; these also gain from the **biodiesel mandate**
  more than pure planters. (Cross-link §6 → Food & Beverage, the opposite seam.)
- **Sugar sleeve (GULA, CSRA):** a different commodity (`ICE:SB1!`) entirely — small
  weight, dilutes the CPO signal.
- **Rubber sleeve (LSIP, BWPT, DSNG):** a second soft commodity whose only liquid
  price (`SGX:TF1!`) is **empty** — a data gap (see §1 bug list).

**Current engine state (SEED `"Plantation"` in `mapping.py`):**
- `ceic`: `[("Plantation & Agriculture", "Palm Oil (CPO)"), ("Plantation & Agriculture", None)]`
  — the Palm Oil (CPO) sub-block **plus** the whole 187-series Plantation & Agriculture
  category (rubber/cocoa/coffee/tea/fishery quantity prints dragged in).
- `globals`: `wb_palm_oil` (supply +1), `soybean_oil` (demand +1), `brent` (demand +1).
- `macro`: `usdidr` (macro +1), `cn_retail_yoy` (demand +1).
- **kept = 12** drivers (`_state.txt`: 12) — but n_obs counted **129** in BACKTEST.
- **grade = partial · conf = low · forward OOS IC = +0.07, marginal**
  (BACKTEST.md: n_oos 129, hit−up **+0.01**, placebo pctile **0.85** — beats 85% of the
  null, under the 0.80→SKILL ladder's 0.90 bar; contemporaneous IC is much higher).

**The gap.** Five issues, all fixable:
1. **The anchor is mis-roled by the engine's default.** `wb_palm_oil` (the Bursa
   `MYX:FCPO1!` anchor) is correctly seeded `supply +1` — *but* every CEIC palm series
   pulled in by `("Plantation & Agriculture", None)` is CEIC-tagged `supply`, and the
   resolver's default for a non-demand CEIC role is **sign 0** (`drivers.py:133`). So
   the world CPO price (`CEICI481148447`, a real *price*) and the Bappebti spot
   (`CEICI232343602`) enter the average **neutrally-signed** — they add variance, not
   directional signal. This is the central dilution.
2. **187-series whole-category noise.** `("Plantation & Agriculture", None)` pulls in
   rubber, cocoa, coffee, tea, fishery, and *fisheries-GDP* quantity prints — slow,
   annual/quarterly, publication-lagged series with no causal link to a CPO basket.
3. **The policy overlays are completely unwired** despite the data existing: the
   **biodiesel-mandate** demand floor (`CEICI476140857` GAPKI Biodiesel offtake), the
   **DMO** domestic-absorption proxy, and the **export-levy** regime proxy (exports vs
   ending stock) are all in the 187-candidate list and **none is used**.
4. **The weather→yield lead is absent** (and unbuildable cleanly — see §1 bug list).
5. **Two dead/empty resolvers** in the macro path (see bug list).

**Data bugs found (verified against `catalog/market.json` weekly_obs):**
- `dxy → TVC:BBDXY` in `GLOBAL_CORR` is **EMPTY (weekly_obs 0)**. The populated
  dollar index is `TVC:DXY` (800). Plantation is a foreign-owned EM-export crowd, so
  the DXY flow headwind is a real driver — but the *current resolver points at the
  dead ric*. (System-wide bug; flagged here because DXY belongs in this tree, §5.)
- `SGX:TF1!` **rubber TSR20 is EMPTY (weekly_obs 0)** — so the rubber sleeve of
  LSIP/BWPT/DSNG has **no liquid price proxy**. `wb_rubber → SGX:TF1!` in `GLOBAL_CORR`
  resolves to a dead series. (New finding; not previously flagged in the caveats list.)
- `BMFBOVESPA:FCPO1!` (the Brazilian CPO future) is **EMPTY (weekly_obs 0)** — only
  the Bursa `MYX:FCPO1!` (800) is real. Do not wire the BMF one.
- **No rainfall / El-Niño / ENSO series exists in any catalog** (idind/id/cn searched:
  zero precipitation/weather/nino series). The weather→FFB-yield lead is therefore
  **only proxiable by the realized yield prints** (`Crude Palm Oil Yield: <province>`,
  P1Y, n20), which are the *output* of weather, annual, and publication-lagged — i.e.
  attribution, not the leading weather signal itself. Honest concession in §8.

This file builds the price-anchor re-role, narrows the CEIC block to the Palm Oil
balance, wires the three policy overlays, adds the veg-oil-complex spread and the FX/
flow macro, fixes the two dead rics, and tags exactly which branch forecasts.

---

## 2. Economic structure — how an upstream CPO basket makes money

The upstream-planter revenue identity is **price × volume**, and unlike a branded-food
basket the **price term is the dominant variance driver** (CPO is a liquid global
commodity that swings ±40%/yr), while volume is biologically slow:

```
Revenue   =  FFB/CPO volume                    ×  CPO price (USD-linked)
          =  (mature hectares × FFB yield t/ha × OER)  ×  (Bursa CPO − export levy/tax)
                         │              │         │
                    replanting     weather/    extraction
                    age profile    rainfall    rate (CPO/FFB)

Cash $    =  Revenue − cash cost
cash cost =  fertiliser + labour + harvesting + transport + mill energy
Margin    =  CPO price − unit cash cost           ← THE earnings driver
```

Three structural facts define the forecasting thesis:

- **Price is fast, exogenous, USD-linked, and the largest variance term.** CPO
  (`MYX:FCPO1!`) is daily, liquid, and sets ~all of the revenue swing. It is floored
  by the **soybean-oil substitute** (`CBOT:ZL1!`) — the two veg oils arbitrage in the
  global edible-oil complex — and supported by the **biodiesel mandate** (a policy
  demand floor that diverts CPO from export to domestic energy use). This price branch
  is the heart of the tree and the only genuinely *leading* one.
- **Volume is biologically slow and lagged.** FFB yield depends on (a) **rainfall
  18–24 months prior** (palm stress from a drought year suppresses bunch formation
  ~6–18m later — a *real, long* lead, but with no weather series to capture it), and
  (b) the **replanting age profile** (palms peak at 7–18 years, decline after ~25).
  So output is a low-frequency, near-deterministic series — it cannot swing
  quarter-to-quarter and is mostly an attribution/level term, not a forecast term.
- **Margin is amplified by FX in BOTH directions.** Revenue is USD-linked (CPO is a
  dollar commodity even when sold domestically at import-parity), so **IDR weakness is
  a tailwind** (sign +1 on the basket) — the *opposite* of the F&B basket where CPO is
  a cost. But fertiliser (potash/urea, imported) is also USD-priced, so FX cuts both
  ways on the cost side; net the revenue channel dominates → basket sign +1.

**What a sell-side plantation analyst watches** (and what the engine should encode):
1. **CPO price** (Bursa 3rd-month + Rotterdam CIF) and the **CPO–soyoil spread** (BOPO/
   the discount that drives substitution and Indian/Chinese buying).
2. **The biodiesel mandate step** (B30→B35→B40): each step lifts domestic CPO offtake
   ~1.5–3.0m t/yr, tightening exportable supply → price-supportive.
3. **The export levy + DMO regime** (Indonesia-specific): a high export levy/tax or a
   DMO export-permit ratio caps the *realized* price planters receive vs the Bursa
   screen (the "levy wedge"), and re-routes volume domestic.
4. **Weather/ENSO** (El-Niño dryness → yield down 6–18m later; La-Niña wet → recovery).
5. **Replanting cycle / estate age** (AALI/LSIP older estates vs TAPG/SSMS younger).
6. **Inventory** (GAPKI ending stock) — high stock = price-bearish, low = bullish.

Because the **price term dominates and is exogenous + liquid**, this basket *should*
be a respectable forward forecaster on the price/spread axis — which is exactly the
pattern BACKTEST.md flags ("forward skill concentrated in physical-commodity / cost-
pass-through baskets … plantation-adjacent"). The reason it is only **marginal** today
is dilution (§8), not a wrong thesis.

---

## 3. DEMAND driver tree

Demand for a CPO basket = **global edible-oil + energy demand for the oil the basket
produces**, transmitted through the **CPO price**. The leading branch is the
**veg-oil-complex price + the biodiesel policy floor**; the slow branch is physical
import demand (China/India), which is mostly captured *through* the price.

```
DEMAND  (global edible-oil + biodiesel pull → CPO price → revenue)   [basket sign +1]
├── D1 Veg-oil complex price  ──►  the CPO price level itself (revenue)
│     ├─ D1a CPO price (ANCHOR)  tag CPO · `MYX:FCPO1!` (Bursa) weekly_obs 800 ✓
│     │      role supply/revenue · sign +1 · LEAD 0–1m (price IS the revenue, near-real-time)
│     │      → the single most important leaf; this is a PRICE, it leads the equities.
│     ├─ D1b Soybean-oil substitute  tag SOYOIL · `CBOT:ZL1!` weekly_obs 800 ✓
│     │      role demand · sign +1 · LEAD 0–1m · soyoil sets the veg-oil floor; CPO
│     │      trades at a discount to it → soyoil up pulls CPO up (substitution).
│     │      ALSO model the SPREAD ZL1!−FCPO1! (the BOPO/discount) — see §8.
│     ├─ D1c Soybeans / soymeal complex  `CBOT:ZS1!` 800 / `CBOT:ZM1!` 800
│     │      role demand · sign +1 · the crush economics that set soyoil supply
│     │      (minor, co-moves with D1b) · optional
│     └─ D1d World CPO price (CEIC)  `CEICI481148447` "Intl Commodity Price" [USD/MT,P1M,n148]
│            CEIC-tagged DEMAND but is really a PRICE → re-role supply +1 (§9 override).
│            Confirms the global screen monthly; pub-lagged → attribution vs MYX live.
├── D2 Biodiesel mandate demand floor (POLICY)  ──►  domestic CPO offtake (B35/B40)
│     ├─ D2a GAPKI Domestic Consumption: Biodiesel  `CEICI476140857` [Ton th,P1M,n75]
│     │      role demand · sign +1 · the DIRECT mandate-offtake series. A B35→B40 step
│     │      shows up as a level shift here; rising biodiesel use tightens exportable
│     │      supply → price-supportive. LEAD: policy is announced ahead → ~1–2Q lead on
│     │      the supply tightening · monthly, pub-lagged ~1m → attribution-to-weak-fcst.
│     └─ D2b Biodiesel-vs-gasoil economics  proxy `brent`/`NYMEX:HO1!` (heating oil 800)
│            role demand · sign +1 · high crude makes the mandate cheaper to sustain /
│            more biodiesel-competitive → policy-durable. (replaces the seed's vague
│            "brent demand +1 biodiesel/energy linkage" with the explicit mechanism.)
├── D3 China + India physical import demand  ──►  export pull (mostly via price)
│     ├─ D3a China demand pulse  tag CN_RETAIL `aCNCRETYF` (`cn_retail_yoy`) ✓ populated
│     │      role demand · sign +1 · LEAD ~1Q · China is the #1–2 CPO buyer; retail/
│     │      food-service demand drives veg-oil imports.
│     ├─ D3b China industrial pulse  `aCNIP` (`cn_ip_yoy`) ✓ — oleochemical/biodiesel use
│     │      role demand · sign +1 · proxy for total China veg-oil/oleo demand.
│     │      ⚠ The direct China customs series (`aCNIMPEVO` edible-veg-oil imports,
│     │        `aCNCNUSGC` palm import price) exist in cn.json but are n_obs=None
│     │        (spark-only/unpopulated) → DO NOT wire; use the liquid macro pulses.
│     └─ D3c India demand  — NO clean India veg-oil-import series in the store.
│            India is the #1 CPO importer; its duty changes drive swings, but there is
│            no populated series → unmodellable directly · honest gap (proxy via price).
└── D4 GAPKI exports (realized export pull)  `CEICI411922157`/`411922197` [Ton th,P1M,n111/96]
      role supply (export = sold output) · this is a VOLUME print, not a price → it is
      coincident/lagging and CEIC-tagged supply → keep for ATTRIBUTION only, sign 0/+1.
      Better used in the LEVY proxy (S-side §4) than as a demand forecaster.
```

**Forecast hypothesis (demand side).** The **price + soyoil + biodiesel-mandate** trio
(D1a, D1b, D2a) is the forecastable demand core: prices lead, the mandate floor is a
policy-anticipated supply tightener, and soyoil substitution is a clean cross-price.
The physical-import branches (D3, D4) are slow/coincident → **attribution**.

---

## 4. SUPPLY / COST driver tree — output, input cost, and the Indonesia policy wedge

The supply side splits into (a) **physical output** (FFB volume — slow, weather/age
driven), (b) **cash cost** (fertiliser-led), and (c) the **Indonesia policy wedge**
(export levy/DMO that sits between the Bursa screen and the realized price). The
policy wedge is the part the engine most underuses today.

```
SUPPLY / COST   (output × cash cost × policy wedge)
├── S1 FFB / CPO output volume  ──►  the volume term in revenue
│     ├─ S1a GAPKI Production: CPO  `CEICI411922147` [Ton th,P1M,n111] / `476140807` n75
│     │      role supply · sign +1 (more output = more revenue $, price held) but as a
│     │      LEVEL it co-moves with price weakly → ATTRIBUTION · pub-lagged ~1m.
│     ├─ S1b FFB yield (weather/age proxy)  `Crude Palm Oil Yield: <province>` kg/ha
│     │      `CEICI251074803` Riau / `251075303` Bengkulu … [P1Y, n20] · role supply
│     │      sign +1 · this is the REALIZED OUTPUT of rainfall 6–18m prior — the only
│     │      handle on the weather→yield lead (no rainfall series exists). ANNUAL +
│     │      pub-lagged → attribution, weak forecast. Aceh/Riau/Lampung = largest estates.
│     └─ S1c Replanting / plantation area  `CEICI251609303` Plantation Area [ha,P1Y,n26]
│            role supply · sign ambiguous (more area = more future output but younger =
│            lower current yield) · structural, not tradable → context only, not wired.
├── S2 Cash cost  ──►  margin compression (sign −1 on the basket)
│     ├─ S2a Fertiliser (potash/urea)  ⚠ DATA GAP: `wb_potash`/`wb_urea` → None (no
│     │      clean price); CEIC Fertilizers block is import VALUE not price.
│     │      PROXY: `usdidr` (fertiliser ~100% imported → FX is the landed-cost driver,
│     │      partially offsetting the revenue FX tailwind) — net basket FX sign still +1.
│     ├─ S2b Mill energy / transport  `brent`/diesel · sign −1 · small COGS share, low prior.
│     └─ S2c Labour  — domestic, slow, no tradable series · context only.
├── S3 Indonesia EXPORT-LEVY / DMO policy wedge (Indonesia-specific) ──► realized price
│     ├─ S3a Export levy proxy = GAPKI Exports vs Ending Stock divergence
│     │      Exports `CEICI411922157` [Ton th,P1M,n111] · Ending Stock `CEICI411922187`
│     │      [Ton th,P1M,n109] · MECHANISM: a high export levy/tax or tightened DMO
│     │      export-permit ratio → exports FALL + domestic stock BUILDS → the planter
│     │      receives a discounted (post-levy) price vs the Bursa screen. The
│     │      exports↓/stock↑ pattern is the observable footprint of a tightening levy.
│     │      role supply · sign on EXPORTS +1 (more exports = better realized price),
│     │      on STOCK −1 (inventory overhang = bearish) · pub-lagged → attribution.
│     ├─ S3b DMO domestic-absorption proxy = GAPKI Domestic Consumption
│     │      `CEICI411922167` [Ton th,P1M,n111] / Foodstuff `476140837` · role demand
│     │      sign +1 · rising domestic absorption (DMO + biodiesel) tightens export
│     │      supply → price-supportive. Overlaps D2a/D3b.
│     └─ S3c Export VALUE (price×volume realized)  `CEICI526955347` GAPKI Export Value
│            [USD mn,P1M,n39] · the realized USD revenue print · role supply +1 ·
│            ATTRIBUTION (it IS a lagged version of the basket's own revenue) — short
│            history (n39), low weight.
└── S4 Inventory / stock cycle  `CEICI411922137` Opening Stock / `411922187` Ending Stock
      role supply · sign −1 (high stock = price-bearish) · the classic ag inventory
      signal; pub-lagged monthly → attribution + weak lead via the stock-to-use ratio.
```

**Endogeneity guard (per IMPROVEMENT_PLAN §"exclude endogenous").** Exclude the
basket's *own output level* as a forecaster — GAPKI Production (S1a) and Export Value
(S3c) are near-mechanically the basket's revenue; keep them for **attribution** but do
not treat them as exogenous forecasters. The exogenous forecast leaves are the
**prices** (CPO, soyoil) and the **policy** series (biodiesel/levy), not the volume
prints.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 USD/IDR  tag USDIDR · `FX_IDC:USDIDR` weekly_obs 801 ✓ ── sign +1 on the basket
│     mechanism: CPO is USD/import-parity priced → IDR weakness LIFTS IDR revenue and
│     margins for the upstream planters. Partially offset by imported fertiliser cost
│     (S2a), but the revenue channel dominates → net +1. This is the cleanest macro
│     leaf and it is the OPPOSITE sign to the F&B basket (cross-link §6). LEAD short.
├── M2 DXY / broad dollar  tag DXY · ⚠ FIX `dxy → TVC:BBDXY` is EMPTY (0); USE `TVC:DXY` (800)
│     sign AMBIGUOUS → prior 0: a stronger USD lifts IDR-translated CPO revenue (+) but
│     is an EM-flow headwind for a foreign-owned export crowd (−). Let the data decide.
│     (Distinct from USDIDR: DXY is the global-flow channel, USDIDR the revenue channel.)
├── M3 Risk appetite / EM flow  `dxy` (above) + optional `vix`/`ndx`
│     plantations are a foreign-favourite EM cyclical-defensive; flow regime matters but
│     is second-order to CPO. Low prior.
├── M4 Rates  `id_10y` `TVC:ID10Y` 798 / `id_bi_rate` `ECONOMICS:IDINTR`
│     mostly IRRELEVANT to upstream planters (low leverage, no duration trade) → DROP /
│     prior 0. Unlike Property/Telco this basket is a commodity, not a rate proxy.
└── M5 Domestic demand backdrop  `id_gdp_real_q` `aIDGDPAR1` sign +1 · weak (most CPO is
      exported / mandate-absorbed, not domestic-consumption driven) → low prior, optional.
```

The macro story is **simpler than most baskets**: FX (revenue translation) is the only
high-confidence macro leaf; rates are near-irrelevant; DXY is the ambiguous flow term.

---

## 6. Cross-industry linkages

- **Food & Beverage (the CPO seam, opposite sign).** `MYX:FCPO1!` is **revenue (+1)
  for Plantation** and **cost (−1) for F&B** — the same price, opposite sign. The
  integrated names (SIMP, SMAR) straddle the seam: their refining/cooking-oil arms pay
  the cost that their estates earn. The engine already keeps signs basket-specific
  (Plantation `supply +1`, F&B `cost −1`) — correct; preserve it.
- **Poultry (veg-oil ↔ feed complex).** Soybeans (`CBOT:ZS1!`) link the two: soyoil is
  the CPO substitute (Plantation D1b), while soymeal (`CBOT:ZM1!`) is the Poultry feed.
  They are the two co-products of the same crush, so the soy complex is a shared input.
- **Chemicals / Fertilizers (cost cross-link).** Imported potash/urea is the planters'
  main cash cost (S2a) — and the *output* of the Chemicals/Fertilizers basket. Both
  `wb_potash`/`wb_urea` resolve to None, so the link is only proxiable via `usdidr`.
- **Household / oleochemicals.** CPO feeds surfactant/oleochemical demand (the
  Household basket's input). GAPKI "Domestic Consumptions: Oleochemical"
  (`CEICI476140847`, n75) is the bridge series — minor demand pull for Plantation.
- **Energy (biodiesel ↔ crude).** The B35/B40 mandate ties CPO to the energy complex:
  high `brent` makes the biodiesel mandate cheaper to sustain (D2b) → a *demand* link,
  not the F&B *cost* link. This is why the seed's `brent demand +1` is directionally
  right but should be re-mechanised as the biodiesel-economics channel.

---

## 7. Currently wired vs available

| Branch | Wired now? | Series (RIC) | n_obs / freq | Priority to ADD/FIX |
|---|---|---|---|---|
| CPO price (anchor) | ✅ | `MYX:FCPO1!` | 800 wk | keep (the core leaf) |
| Soybean-oil substitute | ✅ | `CBOT:ZL1!` | 800 wk | keep + **add the spread** |
| Soybeans/soymeal complex | ❌ | `CBOT:ZS1!` / `CBOT:ZM1!` | 800 wk | ADD (low prior, confirms soyoil) |
| World CPO price (CEIC) | ⚠ neutral | `CEICI481148447` | n148 P1M | **OVERRIDE → supply +1** |
| Bappebti CPO spot (domestic) | ⚠ neutral | `CEICI232343602` | n4677 P1D | **OVERRIDE → supply +1** (deep daily) |
| **Biodiesel mandate (B35/40)** | ❌ | `CEICI476140857` GAPKI Biodiesel | n75 P1M | **ADD** (policy demand floor) |
| **Export-levy proxy (exports/stock)** | ❌ | `CEICI411922157` / `411922187` | n111/109 P1M | **ADD** (Indonesia wedge) |
| **DMO domestic-absorption** | ❌ | `CEICI411922167` | n111 P1M | **ADD** (supply tightener) |
| Biodiesel economics (crude) | ⚠ vague | `brent ICEEUR:BRN1!` | 800 wk | **re-mechanise** as biodiesel link |
| FFB yield (weather/age proxy) | ⚠ in-block | `Crude Palm Oil Yield: <prov>` | n20 P1Y | keep (attribution; no weather series) |
| GAPKI production (output level) | ⚠ in-block | `CEICI411922147` | n111 P1M | keep ATTRIBUTION (endogenous-ish) |
| Inventory / ending stock | ❌ explicit | `CEICI411922187` | n109 P1M | ADD (sign −1, weak lead) |
| USD/IDR (revenue translation) | ✅ | `FX_IDC:USDIDR` | 801 wk | keep (high prior) |
| **DXY (flow)** | ❌ (+dead ric) | `TVC:DXY` (`BBDXY`=**0**) | 800 wk | **ADD via TVC:DXY, prior 0** |
| China demand pulse | ✅ | `cn_retail_yoy aCNCRETYF` | populated | keep + add `cn_ip_yoy` |
| China veg-oil customs | ❌ | `aCNIMPEVO`/`aCNCNUSGC` | **None** | DO NOT wire (unpopulated) |
| India veg-oil import | ❌ | — | — | unmodellable (no series) |
| Rubber sleeve price | ⚠ dead | `wb_rubber → SGX:TF1!` | **0** | **drop** (empty) — data bug |
| Rates (id_10y/bi_rate) | ❌ | — | — | leave OUT (not a rate basket) |
| CEIC Plantation & Ag (whole) | ✅ (187-block) | `("Plantation & Agriculture", None)` | 187 series | **NARROW** to Palm Oil balance |

---

## 8. Forecastability — why marginal now, how to lift it

**The exploitable edge is the CPO-price / veg-oil-spread axis, anticipated by policy.**
Per BACKTEST.md the basket sits at **forward IC +0.07, placebo pctile 0.85, hit−up
+0.01** (n_oos 129) — positive, beats 85% of the null, but under the 0.90 SKILL bar,
and the up-hit rate is flat (the signal is symmetric but weak). The honest read
matches the BACKTEST pattern note: *"forward skill is concentrated in physical-
commodity baskets … plantation-adjacent"* — the thesis is sound; the implementation
is diluted.

**Which branches LEAD (forecast) vs lag (attribute):**

| Branch | Lead | Forecast or attribution | Why |
|---|---|---|---|
| CPO price `MYX:FCPO1!` | 0–1m | **forecast** (weak — price is near-coincident with equity) | liquid, exogenous, the revenue itself |
| Soyoil substitute / spread `CBOT:ZL1!` | 0–1m | **forecast** | sets the veg-oil floor; cross-price leads CPO |
| Biodiesel mandate offtake `CEICI476140857` | ~1–2Q | **forecast** (policy-anticipated) | mandate steps tighten supply ahead of the print |
| Export-levy wedge (exports/stock) | ~1Q | weak forecast / attribution | levy regime changes realized price with a lag |
| FFB yield (weather output) | annual | **attribution only** | no rainfall series; yield is the lagged output |
| GAPKI production / export value | coincident | **attribution** (endogenous-ish) | the basket's own revenue, pub-lagged |
| USD/IDR | short | forecast (amplifier) | FX leads IDR-translated margin |

**Why only marginal today (diagnosis):**
1. **The price anchors enter neutrally-signed.** The world-CPO-price and Bappebti-spot
   CEIC series come in via the whole-category block with the resolver's default
   **sign 0** (`drivers.py:133`, supply→0) — so two of the strongest *price* signals
   are averaged in as direction-less noise. The override fix (§9) is the single
   highest-value change.
2. **187-series whole-category dilution.** `("Plantation & Agriculture", None)` averages
   the CPO price branch against ~180 rubber/cocoa/coffee/tea/fishery quantity prints
   that have no causal link to a CPO basket — each is a slow, pub-lagged, often
   wrong-commodity series, and they swamp the 2–3 real leaves.
3. **The policy floor is invisible.** The biodiesel mandate and the levy/DMO wedge are
   the *Indonesia-specific* edge — exactly what a generic soyoil-only model misses —
   and none of it is wired, so the engine cannot distinguish a Bursa-screen move that
   the planter actually realizes from one the levy claws back.
4. **The CPO–soyoil SPREAD is not modelled, only the two levels.** The forecast power
   is in the *discount* (CPO trades below soyoil; the spread mean-reverts and drives
   substitution buying), not the correlated levels — modelling levels double-counts the
   common veg-oil beta and misses the relative-value signal.
5. **Dead rics in the flow/rubber paths** (DXY→BBDXY empty, rubber→TF1! empty) silently
   drop two intended drivers.

**How to lift it from marginal (+0.07) toward SKILL (≥+0.15, pctile ≥0.90):**
- **Re-role the price series (highest value).** `ceic_override` the world CPO price and
  Bappebti spot to `supply +1` so the price branch carries directional weight; narrow
  the CEIC block so the price isn't drowned by 180 irrelevant prints. Expect the bulk
  of the IC gain here.
- **Add the CPO–soyoil spread as an explicit driver** (`ZL1! − FCPO1!`, sign +1 on the
  spread widening = CPO cheap = substitution-buying bullish), alongside the levels.
  Needs a small resolver (a synthetic spread series); the relative-value leaf is the
  one most likely to add *new* (non-collinear) information.
- **Wire the three policy overlays** (biodiesel offtake +1, DMO absorption +1, export/
  stock wedge) — the Indonesia-specific signal a soyoil-only model lacks.
- **Fix the two dead rics** (DXY→`TVC:DXY`, drop rubber→`SGX:TF1!`).
- **Tag the verdict honestly:** *price + spread + biodiesel = forecast; yield, output,
  export-value = attribution.* Do NOT promise a weather→yield forecast — concede the
  rainfall data does not exist and the yield print is a lagged attribution term.

**Honest ceiling.** Even perfectly wired, CPO price is *near-coincident* with the
equities (they both react to the same Bursa screen intraday), so the forward edge is
real but modest — it lives in (a) the **policy-anticipated** supply tightening
(biodiesel/levy lead ~1Q) and (b) the **spread mean-reversion**, not in out-predicting
the CPO tape itself. A realistic target is **SKILL-marginal (+0.10–0.15)**, not the
+0.23 of Coal (which has the HBA admin-price + China-inventory genuine leads). The
verdict should read **"forecast on the policy/spread axis, attribution on the price
level and the volume prints."**

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Plantation"` SEED with the structure below. Tuple driver =
`(key, role, sign, why)`. New `GLOBAL_CORR` work: **fix `dxy → TVC:DXY`** (currently the
empty `TVC:BBDXY`) and **drop the empty `wb_rubber → SGX:TF1!`** (system-wide; both
help other baskets too). Add a synthetic CPO–soyoil **spread** resolver (see note).

```python
"Plantation": {
    # NARROW the CEIC block to the Palm Oil balance (not the whole 187-series
    # Plantation & Agriculture category). Two sub-blocks carry the real signal:
    "ceic": [("Plantation & Agriculture", "Palm Oil (CPO)"),   # price/value/export
             ("Plantation & Agriculture", "Palm Oil")],         # GAPKI balance: prod/exports/stock/biodiesel/DMO/yield
    # exclude the wrong-commodity quantity prints dragged in by the old None block:
    "ceic_exclude": ["rubber", "cocoa", "coffee", "tea", "fishery", "fisheries",
                     "sugar", "agriculture, forestry"],
    # RE-ROLE the CEIC PRICE series from the default supply->sign 0 to a real
    # directional +1 (they are PRICES = revenue, not neutral volume prints), and
    # wire the policy overlays. ceic_override matches a lowercase substring of
    # (topic + sub); each = [substr, role, sign]:
    "ceic_override": [
        ("international commodity price", "supply", +1),  # CEICI481148447 world CPO price USD/MT
        ("cpo: spot: medan",             "supply", +1),  # CEICI232343602 Bappebti domestic CPO spot (n4677 daily!)
        ("biodiesel",                    "demand", +1),  # CEICI476140857 B35/40 mandate offtake (policy floor)
        ("domestic consumption",         "demand", +1),  # CEICI411922167 DMO absorption (supply tightener)
        ("ending stock",                 "supply", -1),  # CEICI411922187 inventory overhang = bearish
        ("export value",                 "supply", +1),  # CEICI526955347 realized USD revenue (attribution)
        # GAPKI Production / Exports / yield stay CEIC-'supply' default (attribution).
    ],
    "globals": [
        # --- the price core (forecast axis) ---
        ("wb_palm_oil",  "supply", +1, "CPO price = revenue; MYX:FCPO1! 800obs (the anchor; BMFBOVESPA:FCPO1! is empty)"),
        ("soybean_oil",  "demand", +1, "soyoil sets the veg-oil floor; CPO trades at a discount -> substitution; CBOT:ZL1! 800obs"),
        ("soybeans",     "demand", +1, "soy crush economics behind soyoil supply; CBOT:ZS1! 800obs (low prior, confirms soyoil)"),
        # --- biodiesel-mandate economics (policy demand link, re-mechanised) ---
        ("brent",        "demand", +1, "high crude makes the B35/B40 biodiesel mandate cheaper to sustain -> CPO energy demand"),
        # NOTE: also add the synthetic CPO-soyoil SPREAD as the relative-value leaf (resolver below).
    ],
    "macro": [
        # --- FX revenue translation (high prior; OPPOSITE sign to F&B) ---
        ("usdidr",       "macro", +1, "IDR weakness lifts USD/import-parity CPO revenue & margin for upstream planters"),
        # --- broad-dollar flow (AMBIGUOUS -> prior 0); FIX the dead ric in GLOBAL_CORR ---
        ("dxy",          "macro",  0, "USD up: +IDR-translated revenue vs -EM-flow headwind (ambiguous); USE TVC:DXY (BBDXY empty)"),
        # --- China physical demand pulse ---
        ("cn_retail_yoy","demand", +1, "China food/retail veg-oil demand (CPO #1-2 buyer); aCNCRETYF populated"),
        ("cn_ip_yoy",    "demand", +1, "China industrial/oleo/biodiesel veg-oil use; aCNIP populated"),
        # --- domestic demand backdrop (weak; most CPO exported/mandate-absorbed) ---
        ("id_gdp_real_q","demand", +1, "domestic cooking-oil demand level (low prior)"),
        # DROPPED vs status quo: rates (id_10y/id_bi_rate) — upstream planters are a
        # commodity, not a rate/duration proxy.
    ],
},
```

**New synthetic SPREAD resolver (the relative-value leaf, optional but high-value).**
The forecast power is in the **CPO–soyoil discount**, not the correlated levels. Add a
synthetic driver `cpo_soyoil_spread = z(ZL1!) − z(FCPO1!)` (or the price ratio) with
`role=demand, sign=+1` (spread widening = CPO cheap relative to soyoil = substitution
buying = bullish for CPO). This requires a small resolver that fetches both
`MYX:FCPO1!` and `CBOT:ZL1!` weekly histories and constructs the differential — both
are 800-obs populated, so the spread is clean. It is the leaf most likely to add
**non-collinear** information beyond the two levels.

**Weather / FFB-yield (honest concession — NOT a forecast driver).** There is **no
rainfall / El-Niño / ENSO series in any catalog** (idind/id/cn all searched: zero
precipitation/weather/nino hits). The weather→yield lead (rainfall t → FFB t+6..18m)
is therefore **unbuildable as a leading signal**. The realized `Crude Palm Oil Yield:
<province>` prints (`CEICI251074803` Riau etc., P1Y, n20) capture the *output* of past
weather — annual, publication-lagged → keep them in the (narrowed) CEIC block as
**attribution / context**, sign +1, but do not claim a weather forecast. If a weather
series is ever ingested (e.g. an ENSO/ONI index or a regional rainfall feed), it would
be the single most valuable addition — the only branch that could push the basket from
attribution toward a genuine multi-quarter yield forecast.

**What to backtest (the KEEP/REJECT gate, per IMPROVEMENT_PLAN §6):**
1. Re-run `backtest/bt.py "Plantation"` after each change; KEEP only if forward IC
   improves or holds with a cleaner/more-honest tree (never an in-sample-only gain).
2. **Override + narrow test (highest value):** confirm that (a) narrowing the CEIC
   block from 187→Palm-Oil-balance and (b) re-roling the price series to +1 *each*
   raise (or hold) the forward IC and the placebo percentile. Expect the bulk of the
   gain here — this is removing dilution and adding directional price signal.
3. **Spread vs levels ablation:** add `cpo_soyoil_spread`; verify the spread leaf adds
   IC beyond the `wb_palm_oil` + `soybean_oil` levels (i.e. it is non-collinear).
4. **Policy-overlay ablation:** confirm the biodiesel/DMO/levy leaves add forward IC
   (the Indonesia-specific signal a soyoil-only model lacks). If they only help
   in-sample, demote them to attribution.
5. **FX sign robustness:** verify `usdidr` is robustly **+1** (USD-earner revenue
   thesis) and not flipping to the −1 importer regime that dominates F&B — this is the
   sign that most distinguishes the two CPO-linked baskets.
6. **Dead-ric fix:** confirm switching `dxy` to `TVC:DXY` (from the empty `BBDXY`)
   actually populates the driver, and that dropping the empty rubber ric removes a
   silent no-op.
7. **Verdict tagging:** report price/spread/biodiesel-branch IC vs yield/output-branch
   IC separately; the thesis predicts price/policy ≫ volume. Tag the terminal read as
   "forecast on the policy/spread axis, attribution on price level + volume prints."
```
