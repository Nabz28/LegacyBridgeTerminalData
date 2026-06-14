# Cement (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-C by
> mcap (50 T) but a **clean, theory-tractable cost-pass-through basket** that sits right
> at the forecast frontier: blindfolded OOS **IC +0.07 · hit−up +0.04 · placebo pctile
> 0.83 → flag `marginal`** (n_oos **129**). The job here is to convert a *marginal*
> explainer into a *forecaster* by (a) wiring the dedicated **`Infrastructure / Cement`
> consumption block** the current seed completely misses, (b) sharpening the **coal-cost
> → margin** lead (the #1 swing, already partly wired), and (c) adding the **rate → KPR →
> property/infra-demand** cross-industry chain. Every series cited exists in
> `catalog/{idind,id,market}.json`; RICs, n_obs and last_obs are real and quoted.

---

## 1. Snapshot — a tractable cost-pass-through basket stuck at the margin

| field | value |
|---|---|
| basket id | **`basic_materials_cement`** · sub_sector **Cement** · sector **Basic Materials** |
| mcap | **50.3 T** (#28 of 52; 4th-largest in Basic Materials behind Mining/Metals&Mining/Chemicals) |
| n members | **5** cement producers |
| current grade | **perfected** · conf **medium** |
| current kept drivers | **6** |
| **current forward OOS skill** | **IC +0.07 · hit−up +0.04 · placebo pctile 0.83 · flag `marginal`** (n_oos **129**) |
| the gap | the seed pulls `ceic: [("Industrials & Manufacturing", None)]` — a **220-series firehose** (textiles, food, electronics, machinery) that **buries** the one relevant manufacturing series and **never touches** the dedicated **`Infrastructure / Cement`** CEIC block (`Cement Consumption: Indonesia` n388, `Cement Sales: Indonesia` n256 — the actual volume-demand signal). Coal cost (`wb_coal_au`→API2) is correctly wired as the #1 cost; `brent` doubles it. But there is **no property/infra demand branch**, **no capacity-utilisation/oversupply branch**, and the macro leg leans on a generic `id_gdp_real_q` instead of the **GDP-Construction** sub-aggregate. DXY is unwired (the `TVC:BBDXY` engine bug). |

**Members (what each does).** Five names, **all domestic price-takers in an oligopoly
running structural overcapacity** (~115 Mt installed vs ~65 Mt consumption → utilisation
in the high-50s/low-60s %). Beta-weighted return space is dominated by INTP and the SOE:

- **INTP** (Indocement, ~16.1 T = **~32% of basket cap**, β 0.387) — #2 producer
  (HeidelbergMaterials-controlled), "Tiga Roda" brand; strong balance sheet, premium-
  retail (bag) tilt, the most margin-disciplined name. Highest-cap, mid-β.
- **CMNT** (Cemindo Gemilang / "Merah Putih", ~13.7 T, β 0.206) — challenger brand,
  newer integrated capacity; lowest β → least co-moving, partly a fixed point.
- **SMGR** (Semen Indonesia, ~11.9 T, β 0.246) — **the dominant SOE** and #1 by *volume*
  (~50%+ national share incl. the absorbed Holcim/SMCB and Semen Padang/Tonasa/Gresik).
  The bellwether for national cement *consumption*; most exposed to bulk/infra and to
  SOE/policy (govt project pipeline, fuel-subsidy, DMO-coal offtake).
- **SMCB** (Solusi Bangun Indonesia, ex-Holcim, ~7.0 T, β 0.149) — **now an SMGR
  subsidiary** post-2019 Holcim acquisition; lowest β, near-inert, balance-sheet
  consolidated into SMGR (a partial double-count of the SMGR exposure).
- **SMBR** (Semen Baturaja, SOE, ~1.6 T, **β 0.534 — the highest**) — small Sumatra-
  regional SOE; the high-β, low-cap "junior" sleeve that actually *moves* but contributes
  little weight.

**The one-line characterisation:** ~95% of the basket is **domestic cement volume ×
oligopoly price − coal/fuel cash cost**, with **SMGR+SMCB ≈ 38% of cap representing one
consolidated SOE volume bet**, INTP the margin-quality name, and SMBR the only high-β
mover. Low absolute betas across the board (0.15–0.53) → this is a **low-amplitude,
defensive-cyclical** basket; its excess-return signal is small and easily drowned by the
firehose CEIC pull.

---

## 2. Economic structure — how the basket makes money

Cement is a **textbook three-factor margin**: a regional oligopoly selling a low-value,
high-weight commodity into a **rate-elastic property + policy-driven infra** demand
cycle, off a **coal-dominated cash-cost base**. The revenue identity:

```
Revenue   ≈ volume (t) × ASP (IDR/t)
volume    ≈ f( property starts + infra/APBN capex + replacement/renovation )   ← the cycle
ASP       ≈ f( oligopoly discipline,  capacity utilisation )   ← WEAK pricing in oversupply
EBITDA    ≈ Revenue − cash_cost×volume − fixed (D&A on idle kilns)
cash_cost ≈ COAL/energy (~30–35%) + limestone/clinker + electricity + packaging + freight
```

**The margin swing factor is coal.** Cement is one of the most **energy-intensive**
products on earth — the kiln burns coal to ~1,450 °C to make clinker. **Coal + electricity
is ~35–40% of cash cost; coal alone ~30%.** ASP is sticky (oligopoly, but *weak* pricing
power in oversupply — producers cannot fully pass cost through without ceding share), so a
**coal price spike compresses margin almost one-for-one** with a 1–2 quarter lag (inventory
+ contract repricing). **This is the single cleanest, most forecastable lever in the
basket** (§8): coal is a *liquid, exogenous, leading* price (`ICEEUR:ATR1!` API2, weekly),
and the cost-pass-through is mechanical. The asymmetry vs Coal-the-basket: for coal
*producers* a rising API2 is **+revenue** (levered call); for cement it is **−margin** —
**same price series, opposite sign** (cost −1 here, supply +1 there).

**The cost stack (what compresses margin):**
- **Coal / kiln fuel (~30%)** — `ICEEUR:ATR1!` API2 (cement burns lower-CV domestic coal,
  but API2 sets the global cycle the domestic FOB-Kalimantan price tracks). **#1 swing.**
- **Electricity (~10%)** — grinding + utilities; PLN tariff (admin, no clean monthly
  series in store — policy annotation).
- **Limestone / clinker** — quarried domestically (own-cost, low volatility); imported
  clinker at the margin when a kiln is down.
- **Freight / distribution** — cement is **weight-losing and short-haul** (high
  freight-to-value); diesel/Brent-linked. A real cost but secondary to coal.
- **Packaging (bag sleeve)** — kraft paper / woven PP (Brent-linked); the bag/bulk mix
  matters (bag = retail/premium ASP, bulk = infra/volume/lower-margin).

**Intra-basket dispersion — the subtleties:**
- **SMGR + SMCB ≈ one consolidated SOE bet** (~38% cap): SMCB is an SMGR subsidiary, so
  its "independent" weight double-counts the SOE volume/infra exposure. SMGR is the
  **national-consumption bellwether** and the most **infra/APBN + policy** exposed.
- **INTP** is the **margin-quality / premium-retail (bag)** name — most sensitive to the
  *cost* (coal) and the *ASP-discipline* leg, least to raw infra volume.
- **SMBR (β 0.534)** is the only name that genuinely *moves*; tiny weight → the basket's
  realised signal is muted by the low-β giants.
- **Bag vs bulk mix** is the ASP/margin tell sell-side watches: bag (retail, ~70% of
  Indonesian volume historically) carries higher ASP; a bulk shift (infra-led) dilutes
  margin even as volume grows.

**What a sell-side analyst actually watches:** the monthly **ASI national cement
consumption + sales** print (volume YoY, the demand pulse — *in store* as
`CEICI13536901`/`CEICI252871102`); **coal/API2** (the margin swing); **capacity
utilisation** (the oversupply/ASP discipline gauge); **property marketing-sales + KPR
mortgage growth** (1–3Q-leading demand); **APBN infrastructure budget realisation** (the
SOE/SMGR volume driver); **BI rate / 10Y** (property demand rate-elasticity + developer
financing); and the **bag/bulk + ASP** mix.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return vs
> IHSG for a *rise* in the driver. `lead` = expected months the driver moves *before*
> the equities. **Liquid exogenous price/rate series → forecast candidates; CEIC
> quantity/price prints are publication-lagged → attribution.** The cement-demand CEIC
> series (`CEICI…`, Infrastructure/Cement block) are monthly with a ~5–6-week
> publication lag → coincident/lagging → **attribution, not forecast**. The *leading*
> demand handle is the **rate → mortgage** chain (rates are liquid and lead the volume).

### D1 — DOMESTIC CEMENT VOLUME (the revenue pulse — ~95% of the basket)
```
DOMESTIC CEMENT VOLUME  (national consumption = the demand thermometer)
├─ D1a national consumption ─────► [CEICI13536901 Cement Consumption: Indonesia, Ton th, n388, P1M →2026-04]  sign +1 · lead 0m · ATTRIBUTION ★core
│      (the ASI demand print)       [CEICI252871102 Cement Sales: Indonesia, Ton th, n256, P1M →2026-04]       sign +1 · lead 0m · ATTRIBUTION
├─ D1b NMM manufacturing output ─► [CEICI323568102 IPI: Non-Metallic Mineral Products, 2010=100, n180, P1M →2024-12 ⚠STALE]  sign +1 · lead 0m · ATTRIBUTION (cement is the bulk of NMM)
├─ D1c trade balance (net) ──────► [CEICI324051202 Export Vol: Stone/Plaster/Cement, kg mn, n172]  sign +1 · lead 0m · weak (Indonesia net-exports surplus clinker)
│                                   [CEICI323795502 Import Vol: Stone/Plaster/Cement, kg mn, n172]  sign −1 · lead 0m · weak (import = local shortfall, rare)
└─ D1d ENDOGENOUS — DO NOT WIRE ─► [CEICI13536401 Cement Sales: Semen Indonesia GROUP, Ton, n358]   ✗ EXCLUDE (SMGR's OWN output = basket constituent)
                                    [Indocement cement sales, kton, n37 (Basic-Materials cement sub)] ✗ EXCLUDE (INTP's OWN output)
```

- **D1a — the core demand thermometer (attribution).** `CEICI13536901` (**Cement
  Consumption: Indonesia**, Ton th, **n388, 2008→2026-04**) is the longest, cleanest
  monthly national-demand series — the ASI consumption print that *is* the basket's
  aggregate top-line proxy. `CEICI252871102` (national **Cement Sales**, n256) is the
  near-twin. **The current seed never pulls these** (it pulls Industrials&Manufacturing,
  a different category). They are publication-lagged volume prints → **coincident/lagging,
  attribution-grade** (they confirm what the equities already moved on), but they anchor
  the demand attribution and let the engine *see* the volume cycle at all. **Highest-
  value depth-add on the demand side.**
- **D1b — NMM manufacturing output (attribution, ⚠STALE).** `CEICI323568102` (**IPI:
  Non-Metallic Mineral Products**, the manufacturing-production index whose dominant
  component is cement/clinker, **n180, →2024-12**) is the production-side mirror of D1a.
  **Last obs is 2024-12 — ~18 months stale** → wire as low-weight attribution only, flag
  for backfill. The seed's broad `Industrials & Manufacturing` pull technically includes
  this one relevant series, but drowns it in 219 irrelevant ones.
- **D1c — net trade (weak).** Indonesia is a net clinker/cement *exporter* in surplus,
  so export volume (`CEICI324051202`) is a mild +demand vent; imports (`CEICI323795502`)
  rise only on a local shortfall (rare). Minor — keep as documented context, not a
  fitted driver (the HS-aggregated "Stone/Plaster/Cement/Glass/Ceramic" bucket is noisy).
- **D1d — the ENDOGENOUS trap (must exclude).** `CEICI13536401` (**Cement Sales: Semen
  Indonesia GROUP**, n358) is **SMGR's own monthly output** — a *basket constituent's
  own balance-sheet/output level* → strictly endogenous, would leak the answer. Likewise
  the Basic-Materials "Indocement cement sales" (n37) is **INTP's own**. Both **must be
  `ceic_exclude`d**. (The catalog mis-tags both as generic `demand` — the override must
  catch them by name.)

### D2 — PROPERTY DEMAND (the rate-elastic cycle — the LEADING branch)
```
PROPERTY DEMAND  (residential = the bag-cement pull; rate-elastic → the forecast leg)
├─ D2a KPR / mortgage growth ────► [CEIC389692087 Loans: Household: Housing (KPR), n119, P1M →2026-04]  sign +1 · lead 3–6m · cross-industry (Banking) ★FORECAST-via-parent
│      (the property-start lead)    [CEIC389692097/107 Loans: Household: Flat/Shophouse, n119]            sign +1 · lead 3–6m · cross-industry
├─ D2b mortgage RATE (the parent)─► [CEIC14419701 Lending Rate: Consumption (KPR proxy), n304, P1M →2026-04]  sign −1 · lead 6–9m · FORECAST (rate LEADS the loan→start→cement chain)
├─ D2c real-estate activity ─────► [CEIC365752117 GDP: Real Estate (2010p), n73, P3M →2026-03]   sign +1 · lead 0–1m · ATTRIBUTION
│                                   [CEIC389692017 Loans: Industrial: Real Estate, n119, P1M]      sign +1 · lead 2–4m · cross-industry (developer capex)
└─ D2d consumer purchasing power ─► [aIDCONIAR Consumer Confidence, monthly]   sign +1 · lead 2–4m · house-buying intent
                                    [aIDRSLSAR Retail Sales YoY]               sign +1 · lead 1–3m · renovation/self-build demand
```

- **D2b → D2a is the cleanest forecast chain in the basket.** The mortgage **rate**
  (`CEIC14419701`, Lending Rate: Consumption — the KPR proxy, **n304, →2026-04**) is the
  *leading parent*: a BI-rate / KPR-rate cut → mortgage demand picks up (3–6m) → housing
  starts (a further 1–2Q) → bag-cement off-take. **Rates lead cement volume by ~6–9
  months** — this is the one branch where a *liquid, leading* signal (the rate) sits
  above a *lagging* quantity (loan growth → starts → cement). `CEIC389692087` (KPR loan
  growth, n119) is the mid-chain confirmation. **Both are cross-industry (Banking block,
  `country=id` CEIC RICs) and NEITHER has a resolver path today** (§6, §9 — the documented
  ID-macro-plane gap). Wiring this chain is the **single biggest forecastability upgrade**.
- **D2c — real-estate / developer activity (attribution + developer-capex).** `CEIC365752117`
  (GDP Real Estate sub-aggregate, n73 quarterly) is a cleaner top-line than generic GDP;
  `CEIC389692017` (Industrial loans: Real Estate, n119 monthly) is developer working-
  capital/capex → forward project pipeline (lead 2–4m).
- **D2d — purchasing power.** Consumer confidence (`aIDCONIAR`) and retail sales
  (`aIDRSLSAR`) proxy **self-build / renovation** demand (a large, under-appreciated slice
  of Indonesian bag-cement off-take — informal home construction tracks household income
  more than formal property launches). Survey leads physical demand 2–4m.

### D3 — INFRASTRUCTURE / PUBLIC CAPEX DEMAND (the SMGR/bulk pull — policy-driven)
```
INFRASTRUCTURE DEMAND  (APBN infra capex = the bulk-cement / SOE volume driver)
├─ D3a construction activity ────► [CEIC365752057 GDP: Construction (2010p), n73, P3M →2026-03]  sign +1 · lead 0–1m · ATTRIBUTION ★better than generic GDP
├─ D3b construction credit ──────► [CEIC389691957 Loans: Industrial: Construction, n119, P1M →2026-04]  sign +1 · lead 2–4m · cross-industry (contractor pipeline)
├─ D3c construction sentiment ───► [CEIC460040627 Construction Confidence Indicator (SA), n97, P3M]  sign +1 · lead 1–2m · survey LEADS
│                                   [CEIC459362007 Construction Employment Future Tendency, n97, P3M]  sign +1 · lead 1–2m · survey LEADS
└─ D3d APBN infra budget ────────► (no clean monthly infra-capex-realisation series in store) — POLICY annotation; proxy via D3a+D3b
```

- **D3a — GDP-Construction beats the seed's generic GDP.** The seed uses `id_gdp_real_q`
  (`aIDGDPAR1`, whole-economy GDP); `CEIC365752057` (**GDP: Construction**, n73) is the
  sector-specific aggregate — cement demand *is* construction activity, so this is the
  theory-correct demand attribution. Quarterly, publication-lagged → attribution.
- **D3b — construction credit (the contractor-pipeline lead).** `CEIC389691957`
  (Industrial loans: Construction, n119 monthly) leads physical construction (and thus
  bulk-cement off-take) by ~2–4m as contractors draw working capital ahead of project
  ramp. Cross-industry (Banking), no resolver today.
- **D3c — the construction surveys LEAD.** `CEIC460040627` (Construction Confidence) and
  `CEIC459362007` (Construction Employment Future Tendency) are **forward-looking BI
  business-survey** series (n97 quarterly) → they lead physical activity 1–2m. The
  cleanest *leading* CEIC handle on the infra side.
- **D3d — APBN infra capex (policy gap).** The structural SMGR/bulk driver is the
  government infrastructure budget (toll roads, IKN capital relocation, ports, dams). No
  clean **monthly infra-capex-realisation** series exists in store → **policy annotation**,
  proxied by D3a (GDP-Construction) + D3b (construction credit). Document, don't fake.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (coal-dominated cash cost + structural oversupply ASP headwind + fuel/FX)
├─ S1 COAL / kiln fuel (~30%) ───► [ICEEUR:ATR1! API2 Coal, wk782]   sign −1 · lead 1–2m · COST ★PRIMARY swing (the margin lever)
│      (the #1 cost; wb_coal_au)    [ICEEUR:ATW1! Newcastle, wk0]     DEAD — do NOT wire (empty)
├─ S2 fuel / freight / packaging ─► [ICEEUR:BRN1! Brent, wk800]       sign −1 · lead 0–1m · COST (diesel distribution + kraft/PP packaging)
├─ S3 capacity utilisation ──────► [CEICI323568102 NMM IPI output, n180 ⚠STALE]  sign −1(as oversupply) · lead 0m · ATTRIBUTION (output up into soft demand → ASP discipline breaks)
│      (the oversupply/ASP gauge)   — derived: utilisation = consumption(D1a) ÷ ~115Mt capacity — no direct series; proxy via D1a level
├─ S4 input WPI (construction) ──► [CEIC541368067 WPI Construction: Residential, n28, P1M →2026-05]  sign −1 · lead 0m · COST (building-material input cost, incl. cement itself ⚠partly endogenous)
└─ S5 electricity / PLN tariff ──► (no clean monthly PLN industrial-tariff series) — POLICY annotation (~10% of cost)
```

- **S1 — COAL is the margin swing, and it forecasts.** `ICEEUR:ATR1!` (**API2**, **wk782**,
  weekly to ~2009) is the **#1 cost** and the **single most forecastable lever**. Cement
  burns lower-CV domestic coal, but the domestic FOB-Kalimantan price tracks the global
  API2 cycle; API2 is a *liquid, exogenous, leading* price that moves **1–2 months ahead**
  of the margin hit (kiln coal is bought on rolling contracts + inventory, so the cost
  feeds through with a lag → the equity *anticipates* it). **Sign is −1** (rising coal
  compresses cement margin — the mirror image of Coal-the-basket's +1). Already correctly
  wired (`wb_coal_au`, cost −1) — **keep and emphasise; this is the basket's forecast
  backbone.** Newcastle (`ICEEUR:ATW1!`) is wk0 (DEAD); API2 is the only live thermal
  benchmark.
- **S2 — Brent (fuel + packaging cost).** Diesel distribution (cement is short-haul,
  high freight-to-value) + kraft/PP bag packaging track Brent. **Sign −1, cost.** Already
  wired. Note: Brent partly *co-moves with coal* (energy complex), so it risks
  **double-counting S1** — keep it at lower weight than coal, or let the engine's
  collinearity gate down-weight it; do not treat as an independent second margin lever.
- **S3 — capacity utilisation / oversupply (the ASP-discipline headwind).** Indonesian
  cement runs **structural overcapacity** (~115 Mt capacity vs ~65 Mt demand →
  utilisation ~57–62%). When output/utilisation rises into soft demand, **oligopoly ASP
  discipline breaks → price war → margin compression**, so high output is a *negative*
  for margin even though it is "more volume". There is **no direct utilisation series**;
  it must be *derived* (consumption D1a ÷ ~115 Mt nameplate). The NMM IPI (`CEICI323568102`)
  is the output proxy but is **⚠STALE (→2024-12)**. **Document as a derived/attribution
  branch; the oversupply story is why ASP/pricing is the basket's structural weakness.**
- **S4 — construction WPI (input cost, ⚠partly endogenous).** `CEIC541368067` (WPI
  Construction: Residential, n28 monthly) is a building-material input-cost index — but
  it **includes cement itself**, so using it as a "cost" is partly circular (cement price
  is the basket's own ASP). Use cautiously, low weight, or only the non-cement
  sub-components; flagged.
- **S5 — electricity / PLN (policy gap, ~10% cost).** Grinding electricity is ~10% of
  cost; PLN industrial tariff is administered with **no clean monthly series** in store →
  policy annotation.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay  (property/developer financing rate + imported equipment/energy + flow)
├─ M1 BI policy rate ────────────► [ECONOMICS:IDINTR BI 7DRR, monthly]   sign −1 · lead 3–6m · MACRO (the rate the KPR/property chain hangs off)
├─ M2 ID 10Y govt yield ─────────► [TVC:ID10Y, wk798]   sign −1 · lead 1–3m · MACRO (mortgage duration + developer/SOE financing cost; LEADING price)
│                                   [TVC:ID01Y, wk793]   short-end (BI-rate transmission)
├─ M3 USD/IDR ───────────────────► [FX_IDC:USDIDR, wk801]  sign −1 · lead 0–1m · MACRO (imported coal-import parity + kiln spares/equipment in USD)
├─ M4 broad USD (DXY) ───────────► [TVC:DXY US Dollar Index, wk800]  sign −1 · lead 0–1m · MACRO  ★FIX: seed/engine routes dxy→TVC:BBDXY (wk0, DEAD)
└─ M5 GDP / activity ────────────► [CEIC365752057 GDP: Construction, n73] (see D3a)  sign +1 · lead 0–1m · attribution (replaces generic id_gdp_real_q)
```

- **M1 BI rate = −1, the chain's root.** `ECONOMICS:IDINTR` (BI 7DRR) is the **leading
  parent** of the whole property-demand chain (rate ↓ → KPR ↓ → mortgage growth ↑ →
  starts ↑ → cement volume ↑), with the **longest clean lead (3–6m to demand, longer to
  cement off-take)**. Already wired (macro −1). Keep — but recognise its *power* is via
  the demand chain, not a direct discount-rate effect (cement is not a long-duration
  growth asset; these are low-β value names).
- **M2 ID 10Y = −1, a LEADING liquid price.** `TVC:ID10Y` (wk798) is the
  mortgage-duration + developer/SOE financing-cost anchor and, being a **daily liquid
  yield**, it *leads*. Already wired (macro −1). Keep. Add the **1Y** (`TVC:ID01Y`, wk793)
  as the short-end BI-transmission check if testing curve shape.
- **M3 USD/IDR = −1.** Cement is a **domestic** business with an **IDR cost/revenue
  base**, so unlike the exporters this is *not* a translation tailwind. A weak IDR (a)
  raises the IDR cost of imported coal at the margin and USD-priced kiln spares/equipment,
  and (b) is a risk-off/EM-outflow signal that pressures the low-β domestic names. **Sign
  −1** (already wired). The seed's rationale "imported equipment/energy" is correct.
- **M4 DXY = −1 — and the resolver BUG.** A stronger broad dollar = EM-flow headwind +
  IDR pressure → negative for these domestic cyclicals. **But the engine's `dxy` resolver
  points to `TVC:BBDXY`, wk0 (EMPTY) → DXY is silently unwired everywhere.** The fix is
  **`TVC:DXY`** (wk800) per the AGENT_BRIEF caveat + DATA_BUGS.md. Real, falsifiable,
  engine-wide bug (§9).
- **M5 — replace generic GDP with GDP-Construction.** The seed's `id_gdp_real_q`
  (`aIDGDPAR1`) is whole-economy; `CEIC365752057` (GDP: Construction) is the theory-
  correct activity attribution (see D3a). Demote/replace.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `ICEEUR:ATR1!` API2 coal | **Energy / Coal** | **cost −1** (S1) | coal ~30% of cement cash cost — the #1 margin swing (mirror of Coal-basket's +1) |
| `ICEEUR:BRN1!` Brent | Energy / Oil | **cost −1** (S2) | diesel freight + kraft/PP packaging (co-moves with coal — low weight) |
| `CEIC389692087` KPR housing loans | **Banking** (`id`-macro plane) | **demand +1** (D2a) | rate→mortgage→housing-start→bag-cement chain (lead 3–6m) |
| `CEIC14419701` KPR/consumption lending rate | **Banking** (`id`-macro) | **demand −1** (D2b) | the *leading parent* of the property chain (lead 6–9m) |
| `CEIC389691957` construction loans | **Banking** (`id`-macro) | **demand +1** (D3b) | contractor pipeline → bulk-cement off-take (lead 2–4m) |
| `CEIC389692017` real-estate loans | **Banking** (`id`-macro) | **demand +1** (D2c) | developer capex/pipeline |
| `CEIC365752057` GDP: Construction | **GDP / Construction** | **demand +1** (D3a/M5) | cement demand *is* construction activity (replaces generic GDP) |
| `CEIC460040627` construction confidence | **Business Surveys** | **demand +1** (D3c) | forward survey LEADS physical construction 1–2m |
| `aIDCONIAR` consumer confidence | Consumer Surveys | **demand +1** (D2d) | self-build/renovation purchasing power |

**The cross-industry story (Property ← cement, inverted here as cement ← Property).** The
IMPROVEMENT_PLAN explicitly notes "Property ← Basic Materials cement/steel" — cement is an
*input* to property. Read the other way, **cement is a *downstream* read on the property +
infra cycle**, so its demand drivers ARE the Property/Construction baskets' demand drivers
(KPR growth, construction loans, GDP-Construction, RPPI). This is the same Banking
`id`-macro plane the Property file needs — wiring it here and there is one shared resolver
task (§9).

**Deliberate non-linkages.** Do **not** wire `SHFE:RB1!` rebar (wk0, DEAD) or `SGX:FEF1!`
iron ore (wk0, DEAD) — steel is a *complementary* construction input, not a cement driver,
and both are empty anyway. Do **not** wire the broad HS-aggregate "Glass/Ceramic Products"
trade series as demand — they are a noisy mixed basket.

---

## 7. Currently-wired vs available

### 7a. The 6-driver `Cement` seed vs proposed (rescue marginal → forecaster)

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `ceic ("Industrials & Manufacturing", None)` | category pull | **220-series firehose** | **★NARROW** | replace with `("Infrastructure","Cement")` + the one NMM series; drop 200+ irrelevant series (textile/food/electronics) |
| `wb_coal_au` | cost −1 | `ICEEUR:ATR1!` API2 wk782 | **KEEP — the backbone** | the #1 margin swing, LEADING (1–2m); emphasise |
| `brent` | cost −1 | `ICEEUR:BRN1!` wk800 | **keep (low weight)** | fuel/packaging; co-moves with coal → guard double-count |
| `id_10y` | macro −1 | `TVC:ID10Y` wk798 | **keep** | mortgage duration + financing; leading price |
| `id_bi_rate` | macro −1 | `ECONOMICS:IDINTR` | **keep** | root of the property-demand chain |
| `id_gdp_real_q` | demand +1 | `aIDGDPAR1` | **replace** | → `CEIC365752057` GDP: Construction (theory-correct) |
| `usdidr` | macro −1 | `FX_IDC:USDIDR` wk801 | **keep** | imported coal-parity + USD equipment |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | engine-wide resolver bug; add macro −1 |
| *(none)* Cement Consumption | — | `CEICI13536901` n388 | **ADD demand +1** via Infrastructure/Cement pull | the national volume thermometer (attribution) |
| *(none)* KPR mortgage growth | — | `CEIC389692087` n119 | **ADD demand +1** (needs `id`-resolver) | the property-start lead (3–6m) |
| *(none)* KPR/consumption rate | — | `CEIC14419701` n304 | **ADD demand −1** (needs `id`-resolver; also fixes `id_lending_rate`→None) | the LEADING parent (6–9m) |
| *(none)* construction loans | — | `CEIC389691957` n119 | **ADD demand +1** (needs `id`-resolver) | contractor/infra pipeline (2–4m) |
| *(none)* SMGR/INTP own sales | — | `CEICI13536401` n358 etc. | **★EXCLUDE** | endogenous (constituent own output) — the override must drop these |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| Capacity utilisation (oversupply/ASP) | derive: D1a ÷ ~115 Mt; `CEICI323568102` NMM IPI | no direct utilisation series; NMM IPI is **⚠STALE →2024-12** |
| APBN infrastructure capex realisation | proxy `CEIC365752057` + `CEIC389691957` | no clean monthly infra-budget-realisation series |
| PLN industrial electricity tariff (~10% cost) | *(none)* | admin/annual only — policy annotation |
| ASP / bag-bulk price & mix | *(none clean monthly)* | the weak-pricing-power story is unobservable in store |
| RPPI residential property price | (Property block — `country=id`) | needs the same `id`-macro resolver; lower priority than KPR growth |
| Newcastle thermal coal | `ICEEUR:ATW1!` | **wk0 DEAD** — API2 substitutes |

---

## 8. Forecastability — why it's marginal, and how to lift it

**The backtest fact:** Cement is **IC +0.07 · hit−up +0.04 · placebo pctile 0.83 →
`marginal`** over **129** forward months — it sits *just below* the skill threshold, in
the same neighbourhood as Plantation (+0.07) and Construction Materials (+0.07). It is
**not broken** (it has the right sign structure and a clean coal-cost lever) but it is
**not yet a forecaster** — the signal is small and currently diluted.

**Why it's only marginal (the honest diagnosis):**

1. **The seed pulls a 220-series firehose, not the cement series.** `("Industrials &
   Manufacturing", None)` sweeps textiles, food, electronics, machinery — **none of which
   drive cement** — and **never pulls the dedicated `Infrastructure / Cement` consumption
   block**. The one relevant manufacturing series (NMM IPI) is 1-in-220 and stale. So the
   demand side is **effectively unmodelled**; the engine is forecasting a cement basket
   with mostly cement-irrelevant inputs. Fixing the candidate set is the first-order lift.
2. **The forecastable lever (coal) is a COST that LEADS, but the basket is low-β.** Coal
   (API2) genuinely leads the margin 1–2m and is wired correctly — that is *why* the
   basket has *any* forward IC (+0.07). But these are **low-amplitude defensive names**
   (β 0.15–0.53); the coal-margin signal is real but the equity response is muted, so the
   IC stays small. Coal explains *amplitude* of margin moves, not the *direction* of every
   month.
3. **The leading DEMAND branch (rate → KPR → starts) is entirely unwired.** The one place
   cement could get a *multi-month-leading* demand signal — the mortgage rate (6–9m lead)
   → KPR growth (3–6m) → housing starts → cement chain — lives on the **Banking `id`-macro
   plane that no resolver reads** (DATA_BUGS.md §"ID-macro plane not read"). The basket is
   blind to its own demand cycle's leading indicator.

**Which branches lead vs lag:**
- **LEAD (forecast candidates):** API2 coal (1–2m, the wired backbone), ID 10Y / BI rate
  (1–6m), DXY/USDIDR (0–1m), **KPR/consumption lending rate (6–9m — the longest clean
  demand lead, UNWIRED)**, construction-confidence survey (1–2m, unwired).
- **COINCIDENT/LAG (attribution):** cement consumption/sales prints, NMM IPI,
  GDP-Construction, KPR loan growth, construction loans — all publication-lagged CEIC
  quantities. They anchor attribution; they do not forecast.

**What would move it from +0.07 toward skill (the upside test):**
1. **Narrow the CEIC pull** to `("Infrastructure","Cement")` — stop forecasting cement
   with textile/food noise; let the consumption volume series actually enter.
2. **Wire the rate→KPR demand chain** (`CEIC14419701` rate −1, lead 6–9m; `CEIC389692087`
   KPR growth +1; `CEIC389691957` construction loans +1) — the **one set of genuinely
   leading demand signals** the basket lacks. *This is the highest-expected-value add*,
   but it depends on the **`id`-macro resolver** (a shared infrastructure task — §9).
3. **Fix DXY** (`TVC:DXY`) — a free engine-wide correction.
4. **Sharpen coal** — keep API2 the primary cost; demote Brent to avoid double-counting
   the energy complex (collinearity dilutes the clean coal lead).

**Honest ceiling.** Even fully wired, Cement is a **low-β, domestic, cost-pass-through
beta** — its forward IC will likely land in the *modest-skill* band (think +0.10 to
+0.15, in the Metals-steel / Containers neighbourhood), **not** the Coal/AltEnergy +0.23
tier. The reasons: (a) low equity amplitude mutes the signal, (b) its best demand signals
are publication-lagged quantities, and (c) the one clean leading lever (coal) is a *cost*
whose effect competes with the simultaneous demand cycle. The realistic goal is **lift it
across the marginal→skill line and make the attribution honest**, not to manufacture a
top-tier forecaster.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Two resolver edits help the whole engine; the rest is basket-local. The **`id`-macro
resolver** (to read `CEIC…` Banking/GDP RICs) is a **shared infrastructure task** also
required by Property/Banks/Construction — flag it, do not fake the series if it is not yet
built (wire the price/rate leaves now; add the loan-growth leaves when the resolver lands).

```python
# --- GLOBAL_CORR edits (apply once; help the whole engine) ---
#   "dxy": "TVC:DXY",                 # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
#   "id_lending_rate": "CEIC14419701",# FIX: was None. KPR/consumption lending rate (n304) — the property-chain parent.
#   "id_credit_kpr":   "CEIC389692087",   # NEW (needs id-macro plane): KPR housing-loan growth, n119
#   "id_credit_construction": "CEIC389691957",  # NEW: industrial construction loans, n119
#   "id_gdp_construction": "CEIC365752057",     # NEW: GDP Construction sub-aggregate, n73
#   (id_10y, id_bi_rate, usdidr, wb_coal_au, brent already resolve correctly.)
```

```python
"Cement": {  # 5 domestic price-takers; SMGR+SMCB ≈ one SOE bet; INTP = margin-quality; SMBR = high-β junior.
    # Marginal forward (OOS IC +0.07). LIFT: narrow the firehose pull, add the rate->KPR
    # demand chain, keep coal the forecast backbone. NOT a top-tier forecaster (low-β domestic).
    "ceic": [("Infrastructure", "Cement")],   # ★was ("Industrials & Manufacturing", None) — 220-series firehose
    # Re-role the cement CEIC pulls: national consumption/sales = demand attribution (+1).
    "ceic_override": [
        ("cement consumption: indonesia", "demand", +1),  # CEICI13536901 n388 — the volume thermometer
        ("cement sales: indonesia",       "demand", +1),  # CEICI252871102 n256 — national sales
    ],
    # EXCLUDE endogenous constituent own-output + noisy HS-aggregate trade buckets.
    "ceic_exclude": [
        ("cement sales: semen indonesia group", None, None),  # CEICI13536401 — SMGR's OWN output (endogenous)
        ("indocement",                          None, None),  # INTP's OWN sales (endogenous, Basic-Materials cement sub)
        ("glass, ceramic products",             None, None),  # noisy HS-aggregate trade bucket
        ("salts; sulphur; earths and stone",    None, None),  # noisy HS-aggregate
    ],
    "globals": [
        ("wb_coal_au", "cost", -1, "API2 (ICEEUR:ATR1!) = coal ~30% of cash cost — the #1 margin swing, LEADS 1-2m"),
        ("brent",      "cost", -1, "diesel freight + kraft/PP packaging (co-moves w/ coal -> low weight, guard double-count)"),
    ],
    "macro": [
        ("id_bi_rate",            "macro",  -1, "BI 7DRR = root of the property-demand chain (lead 3-6m)"),
        ("id_lending_rate",       "demand", -1, "KPR/consumption rate (CEIC14419701) LEADS housing starts->cement 6-9m — the forecast leg"),  # FIXED resolver
        ("id_10y",                "macro",  -1, "mortgage duration + SOE/developer financing cost (leading yield)"),
        ("id_credit_kpr",         "demand", +1, "KPR housing-loan growth (CEIC389692087) -> starts -> bag cement (lead 3-6m)"),   # needs id-macro plane
        ("id_credit_construction","demand", +1, "construction loans (CEIC389691957) -> contractor/infra pipeline (lead 2-4m)"),  # needs id-macro plane
        ("id_gdp_construction",   "demand", +1, "GDP: Construction (CEIC365752057) — cement demand IS construction (replaces id_gdp_real_q)"),  # needs id-macro plane
        ("usdidr",                "macro",  -1, "weak IDR raises imported coal-parity + USD kiln spares; EM risk-off on low-beta names"),
        ("dxy",                   "macro",  -1, "broad USD = EM-flow headwind (FIXED resolver -> TVC:DXY)"),
    ],
},
```

**Notes for the implementer.**
- **Narrowing the CEIC pull is the first-order fix** — `("Industrials & Manufacturing",
  None)` (220 series) → `("Infrastructure","Cement")` (~27 cement series). Verify the
  `ceic_exclude` catches `Cement Sales: Semen Indonesia Group` (endogenous) — *this is
  the highest-priority exclusion*; leaving SMGR's own output in would leak the basket's
  answer and inflate in-sample fit while hurting OOS.
- **`dxy → TVC:DXY` and `id_lending_rate → CEIC14419701`** are two clean resolver wins
  (the second also un-breaks every basket that referenced the None lending-rate spark).
- **The `id`-macro plane is a dependency, not a fabrication.** `id_credit_kpr`,
  `id_credit_construction`, `id_gdp_construction` resolve to `CEIC…` RICs that **no
  current resolver path reads** (DATA_BUGS.md §"ID-macro plane not read"). If the thin
  `id`-observations resolver is not yet built, **wire the price/rate leaves now** (coal,
  rates, FX, DXY, the Infrastructure/Cement consumption pull) and **add the three loan/GDP
  leaves in the same PR as Property/Banks** once the resolver lands — that is the shared
  task. Do **not** invent the series.
- **Brent double-count guard:** coal and Brent co-move in the energy complex; keep Brent
  at lower weight (or rely on the collinearity gate) so it does not dilute the clean coal
  lead.
- **NMM IPI is STALE** (`CEICI323568102` →2024-12) — do not wire as a live forecaster;
  file a backfill task.

**Falsifiable backtest plan (the keep/kill gate).** Run `backtest/bt.py "Cement"` and
**keep each change only if forward IC improves or holds at ≥ +0.07 with a more honest
tree**, ablating in this order:
1. **CEIC pull narrow** (`Infrastructure/Cement` + endogenous exclude) vs the firehose —
   *expected primary lift*: the demand-volume series finally enter and the noise drops.
   Confirm IC rises and the SMGR-own-output exclusion does not *cost* in-sample fit it
   shouldn't have had.
2. **+ `dxy` fix** (`TVC:DXY`) — free engine-wide correction; confirm DXY now contributes.
3. **+ coal/Brent re-weight** — confirm demoting Brent (anti-double-count) holds or
   improves IC (coal is the clean lever).
4. **+ rate→KPR→construction demand chain** (once `id`-macro resolver lands) — *the
   upside test*: does the leading mortgage-rate / loan-growth chain add forward IC beyond
   the price/rate set, or is it already priced into rates? **Keep only if additive.**
5. Confirm **`id_gdp_construction`** replacing generic `id_gdp_real_q` holds IC (theory-
   cleaner, should not hurt).

Success criterion: a **narrower, demand-aware, coal-led** tree that lifts Cement across
the **marginal → skill** line (target placebo pctile > 0.90, IC ≥ +0.10) with honest
attribution — never a change that only lifts in-sample fit. If the `id`-macro demand
chain proves redundant to rates, revert it and keep the (still-improved) coal+CEIC-narrow
core.
