# Construction Materials (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-C by mcap
> (**10.2 T**, #37 of 52) but a **clean energy-cost-pass-through basket** sitting right at
> the forecast frontier: blindfolded OOS **IC +0.065 · hit−up +0.00 · placebo pctile 0.80 →
> flag `marginal`**, grade `needs_review`, **5 kept drivers** (n_oos **129**). The marginal
> skill comes from the **kiln-fuel → margin lead** (the energy cost is the swing factor and
> moves ahead of the equities); the job here is to (a) wire the **dedicated kiln-fuel pair**
> — `ICEEUR:ATR1!` API2 coal **and** `NYMEX:NG1!` Henry-Hub gas (the brief's natgas hook) —
> as the primary cost leg, (b) replace the **220-series `Industrials & Manufacturing`
> firehose** with the one relevant NMM-output series plus the **`Infrastructure / Cement`
> demand block**, and (c) add the **rate → KPR → property/renovation demand** cross-industry
> chain. Every series cited exists in `catalog/{idind,id,market}.json`; RICs, n_obs and
> last_obs are real and quoted.

---

## 1. Snapshot — a small, mixed building-materials basket at the margin

| field | value |
|---|---|
| basket id | **`basic_materials_construction_materials`** · sub_sector **Construction Materials** · sector **Basic Materials** |
| mcap | **10.24 T** (#37 of 52; smallest of the Basic-Materials baskets, below Cement's 50 T) |
| n members | **6** building-materials makers (ceramics/tiles, glass, sanitaryware, precast concrete) |
| current grade | **needs_review** · conf **low** |
| current kept drivers | **5** |
| **current forward OOS skill** | **IC +0.065 · hit−up +0.00 · placebo pctile 0.80 · flag `marginal`** (n_oos **129**) |
| the gap | the seed pulls `ceic: [("Industrials & Manufacturing", None)]` — a **220-series firehose** (textiles, food, electronics, machinery) that **buries** the one relevant series (NMM IPI) and **never touches** the dedicated **`Infrastructure / Cement`** demand block or the **NMM manufacturing** input. Energy cost is half-wired: `wb_coal_au` (API2 coal, −1) is in, but **gas — the dominant kiln fuel for float-glass and the brief's specified `NYMEX:NG1!` hook — is absent**, and the only steel handle (`steel_hrc`, +1) is mis-roled (it is a precast *cost*, not a basket-wide revenue driver). There is **no property/renovation demand branch**, **no real-income (renovation) branch**, and **DXY is unwired** (the `TVC:BBDXY` wk0 engine bug). |

**Members (what each does).** Six names — **not a clean single-product basket**. It splits
into two economically distinct sleeves the engine is blending: a **building-products sleeve**
(ceramics/tiles, glass, sanitaryware — energy-intensive kiln/furnace products sold into
property *finishing* + renovation) and a **precast-concrete sleeve** (WSBP/WTON — steel +
cement intermediates sold into SOE *infrastructure*). Beta-weighted return space is led by
ARNA and TOTO:

- **ARNA** (Arwana Citramulia, ~3.18 T = **~31% of basket cap**, β 0.126) — the dominant
  **mass-market ceramic-tile** maker; domestic price-leader in entry/mid tiles, gas-fired
  kilns. The basket's bellwether and the cleanest "ceramic margin = tile price − gas cost"
  read. Low β → defensive.
- **TOTO** (Surya Toto Indonesia, ~2.52 T, β 0.037) — **sanitaryware + fittings** (toilets,
  basins, faucets); premium-branded, gas-fired vitreous-china kilns, partly export. Lowest
  β → near-inert, partly a fixed point; geared to property *completions* + premium
  renovation.
- **MLIA** (Mulia Industrindo, ~1.65 T, β −0.084) — **float glass + glass blocks + ceramic
  tiles** (Muliaglass / Muliakeramik); the most **gas-intensive** name (float glass runs a
  continuous gas furnace 24/7 — fuel is the single biggest cash cost). **Negative β** → an
  idiosyncratic / counter-moving sleeve (high leverage, restructuring history).
- **AMFG** (Asahimas Flat Glass, ~1.36 T, β 0.249) — **float glass** (Asahi/AGC-affiliated);
  auto + architectural glass, USD-linked soda-ash/cullet inputs, gas-fired furnace. The
  highest-β of the glass names → the one that actually *moves* on the gas/property cycle.
- **WSBP** (Waskita Beton Precast, SOE-affiliated, ~0.82 T, β 0.087) — **precast concrete**
  (Waskita Karya's precast arm); steel + cement intermediate sold into **SOE
  infrastructure** (toll roads, bridges). Distressed/restructured; demand = APBN infra, cost
  = steel/cement, not gas.
- **WTON** (Wijaya Karya Beton, SOE-affiliated, ~0.71 T, **β 0.351 — the highest**) — **precast
  + ready-mix concrete** (WIKA's beton arm); the high-β, infra-geared mover. Like WSBP its
  economics are **steel/cement cost × infra volume**, NOT kiln-fuel × property finishing.

**The one-line characterisation:** ~**67% of basket cap (ARNA+TOTO+MLIA+AMFG)** is
**building-products: product price × property/renovation volume − kiln-fuel (gas/coal) −
USD inputs**, with **gas the dominant margin swing**; the remaining ~15% (WSBP+WTON) is a
**precast-concrete infra bet** whose drivers (steel/cement cost, APBN capex) differ. The two
sleeves share the **property/construction demand cycle** as a common factor but have
**opposite cost stacks** (gas-furnace vs steel/cement). Low absolute betas (−0.08 to 0.35) →
a **low-amplitude defensive-cyclical** basket; its excess-return signal is small and the
glass/ceramic kiln-fuel lever is the part that gives it *any* forward IC.

---

## 2. Economic structure — how the basket makes money

The **dominant (building-products) sleeve** is a **textbook energy-intensive margin**:
ceramics, glass and sanitaryware are made by firing/melting raw minerals at 1,200–1,600 °C
in **gas-fired kilns and float-glass furnaces**, then sold into **property finishing +
renovation** demand. The revenue identity (building-products sleeve):

```
Revenue   ≈ volume (m²/units) × ASP (IDR/unit)
volume    ≈ f( property COMPLETIONS + renovation/self-build + commercial fit-out )   ← finishing-stage, LATE in the property cycle
ASP       ≈ f( brand/mix, domestic competition vs Chinese tile imports )
EBITDA    ≈ Revenue − cash_cost×volume − fixed (D&A on continuous furnaces)
cash_cost ≈ GAS/energy (~30–40%, higher for float glass) + raw minerals (silica/feldspar/
            soda-ash) + USD-linked inputs + packaging/freight
```

**The margin swing factor is kiln fuel — and it is mostly GAS, not coal.** This is the key
difference from Cement (which burns coal in a rotary kiln). Ceramic tiles and float glass
run on **piped natural gas** (PGN/regasified LNG); float glass in particular needs a
*continuous* gas furnace (you cannot let it cool), so **gas is ~30–40% of cash cost for
glass, ~25–35% for ceramics**. ASP is sticky (domestic brands, but under constant pressure
from cheap Chinese tile imports), so a **gas-price spike compresses margin almost
one-for-one** with a 1–2 quarter lag (contract repricing + the regulated-gas vs spot mix).
**This is the single cleanest, most forecastable lever in the basket** (§8): liquid gas
benchmarks (`NYMEX:NG1!` Henry Hub, `ICEEUR:ATR1!` API2 for the coal-fired tile kilns) are
*exogenous, leading* prices, and the cost-pass-through is mechanical. The asymmetry vs
producers: for a gas *producer* a rising NG is +revenue; for these makers it is **−margin**.

**The cost stack (what compresses margin):**
- **Kiln fuel — GAS (~30–40% glass, ~25–35% ceramic)** — `NYMEX:NG1!` Henry Hub +
  `ICEEUR:ATR1!` API2 (some tile kilns + captive power burn coal). Indonesian piped-gas
  price is partly **administered** (HGBT regulated industrial gas ~USD 6–6.5/MMBtu for
  selected sectors incl. ceramics/glass), so spot benchmarks set the *global cycle and the
  unregulated-volume marginal cost* the equities track. **#1 swing.**
- **Soda ash / silica sand / feldspar** — float glass needs **soda ash** (largely
  **imported, USD-priced** — no clean series in store); silica/feldspar are quarried
  domestically (own-cost, low volatility, **no price series**). The USD-linked soda-ash and
  cullet are the secondary swing for glass.
- **USD-linked inputs / equipment** — frits, glazes, pigments, machinery spares are
  imported and USD-priced → a weak IDR raises cost.
- **Freight / packaging** — tiles/sanitaryware are weight-heavy, short-haul (diesel/Brent-
  linked); secondary.
- **Precast sleeve (WSBP/WTON) cost stack — DIFFERENT:** **steel rebar/wire + cement** are
  the cash cost (`NYMEX:HRC1!` HRC steel as the liquid proxy; cement is an intermediate),
  not gas. Their demand is **APBN infrastructure**, not property finishing.

**Intra-basket dispersion — the subtleties:**
- **Float-glass names (MLIA, AMFG) are the most gas-levered** — continuous furnace, gas =
  biggest cash cost, plus USD soda ash. AMFG (β 0.249) actually moves; MLIA (β −0.084) is
  counter-moving / idiosyncratic (leverage, restructuring).
- **ARNA (ceramic tiles)** is the cleanest "domestic tile margin" read — gas-fired, mass-
  market, geared to renovation/self-build more than formal property launches.
- **TOTO (sanitaryware)** is premium + partly export → most geared to property *completions*
  and high-end renovation; USD revenue on the export slice slightly offsets USD cost.
- **WSBP + WTON (precast) are a different basket** bolted on — steel/cement cost × SOE infra
  volume. They contribute the **steel cost sensitivity** and **APBN-infra demand** the
  building-products names lack, but only ~15% of cap, so the basket's realised signal is
  dominated by the gas-fired finishing sleeve.

**What a sell-side analyst actually watches:** **gas price + the HGBT regulated-gas policy**
(the margin swing); **Chinese tile import volumes / anti-dumping duties** (the ASP pressure);
**property completions + KPR mortgage growth** (the finishing-stage demand, which LAGS
property *starts* by 1–2 years — ceramics/glass come in late); **consumer confidence + real
income** (renovation/self-build, a large slice of tile demand); **USD/IDR** (soda ash +
imported inputs); **steel (HRC) + APBN infra realisation** (the WSBP/WTON precast sleeve);
and **BI rate / 10Y** (property-demand rate-elasticity).

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return vs IHSG
> for a *rise* in the driver. `lead` = expected months the driver moves *before* the
> equities. **Liquid exogenous price/rate series → forecast candidates; CEIC quantity/price
> prints are publication-lagged → attribution.** The building-materials demand CEIC series
> are monthly/quarterly with a ~5–6-week publication lag → coincident/lagging →
> **attribution, not forecast**. The *leading* demand handle is the **rate → mortgage**
> chain (rates are liquid and lead the property→completion→finishing volume).

**A timing nuance unique to this basket:** ceramics/glass/sanitaryware are **finishing-stage**
products — they go into a building *after* structure + cement, near completion. So their
demand **LAGS property starts (and cement off-take) by 4–8 quarters**. The rate→KPR chain
that leads *cement* by 6–9 months leads *this basket's finishing demand* by even longer
(~12–18m) — a longer but real lead. **Renovation/self-build** (income-driven) is a large,
under-appreciated slice that tracks household income *contemporaneously* rather than the
formal property cycle.

### D1 — BUILDING-MATERIALS OUTPUT & TRADE (the volume pulse — attribution)
```
BUILDING-MATERIALS VOLUME  (NMM manufacturing output = the demand thermometer)
├─ D1a NMM manufacturing output ─► [CEICI323568102 IPI: Manufacturing: Non-Metallic Mineral Products, 2010=100, n180, P1M →2024-12 ⚠STALE]  sign +1 · lead 0m · ATTRIBUTION ★core (ceramics/glass/cement are the bulk of NMM)
├─ D1b cement-complex consumption ► [CEICI13536901 Cement Consumption: Indonesia, Ton th, n388, P1M →2026-04]  sign +1 · lead 0m · ATTRIBUTION (cement off-take leads finishing by 4-8Q — a same-cycle proxy)
│      (cross-read of the cycle)    [CEICI252871102 Cement Sales: Indonesia, Ton th, n256, P1M →2026-04]       sign +1 · lead 0m · ATTRIBUTION
├─ D1c glass/ceramic net trade ───► [CEICI323776102 Import Value: Cement/Plaster/Glass/Ceramic Products, USD mn, n172 →2026-04]  sign −1 · lead 0m · weak (rising imports = Chinese tile share gain = ASP/volume pressure)
│      (the China-import ASP gauge)  [CEICI324031802 Export Value: Cement/Plaster/Glass/Ceramic Products, USD mn, n172]          sign +1 · lead 0m · weak (TOTO/AMFG export slice)
└─ D1d ENDOGENOUS — DO NOT WIRE ──► (no constituent owns an in-store output series here, unlike Cement's SMGR/INTP) — but EXCLUDE the noisy HS-aggregate "Salts/Sulphur/Earths/Stone" import bucket (CEICI323781502) — mixed, not building-materials
```

- **D1a — NMM output is the core demand thermometer (attribution, ⚠STALE).**
  `CEICI323568102` (**IPI: Non-Metallic Mineral Products**, 2010=100, **n180, →2024-12**) is
  the production-side index whose dominant components are **cement, ceramics and glass** — the
  closest thing to the basket's aggregate volume. **The current seed never isolates it** (it
  pulls Industrials&Manufacturing, drowning this 1-in-220 series). **Last obs 2024-12 →
  ~18 months stale** → wire as low-weight attribution and file a backfill task; it is still
  the single most theory-relevant CEIC demand series.
- **D1b — cement-complex consumption as a same-cycle proxy (attribution).** `CEICI13536901`
  (**Cement Consumption: Indonesia**, Ton th, **n388, 2008→2026-04**) is the longest, cleanest
  monthly construction-demand pulse. Cement off-take **leads** finishing-materials demand by
  4–8 quarters (structure before finishing), so contemporaneously it is a **same-construction-
  cycle attribution** read — it tells the engine where in the building cycle we are. `CEICI252871102`
  (national Cement Sales, n256) is the near-twin. **Borrowed from the Infrastructure/Cement
  block** the seed never touches.
- **D1c — glass/ceramic net trade = the China-import ASP gauge (weak).** `CEICI323776102`
  (**Import Value: Cement/Plaster/Glass/Ceramic Products**, USD mn, n172) rises when **cheap
  Chinese tiles/glass take share** — a direct ASP + volume headwind for ARNA/MLIA (sign −1 on
  the basket). Export value (`CEICI324031802`) is the small TOTO/AMFG vent (+1). The HS bucket
  is aggregated (cement+glass+ceramic mixed) → noisy → keep as documented context / low-weight,
  not a fitted core driver.
- **D1d — no in-store constituent-own-output trap here** (unlike Cement, where SMGR/INTP own
  sales are in store). Still **exclude** the noisy HS-aggregate `CEICI323781502` "Salts;
  Sulphur; Earths and Stone" import bucket — it is a mixed minerals bucket, not building
  materials.

### D2 — PROPERTY & RENOVATION DEMAND (the rate-elastic cycle — the LEADING branch)
```
PROPERTY + RENOVATION DEMAND  (finishing-stage pull; rate-elastic → the forecast leg, long lead)
├─ D2a KPR / mortgage growth ────► [CEIC389692087 Loans: Household: Housing (KPR), IDR bn, n119, P1M →2026-04]  sign +1 · lead 9-15m · cross-industry (Banking) ★FORECAST-via-parent (longer lead than cement — finishing lags)
│      (the completion→finishing lead) [CEIC389692097/107 Loans: Household: Flat/Shophouse, n119, P1M]          sign +1 · lead 9-15m · cross-industry
├─ D2b mortgage RATE (the parent)─► [CEIC14419701 Lending Rate: IDR: Consumption (KPR proxy), % pa, n304, P1M →2026-04]  sign −1 · lead 12-18m · FORECAST (rate LEADS the loan→completion→finishing chain — the longest clean lead)
├─ D2c real-estate / dev activity ► [CEIC365752117 GDP: Real Estate (2010p), IDR bn, n73, P3M →2026-03]   sign +1 · lead 0-2m · ATTRIBUTION
│                                   [CEIC389692017 Loans: Industrial: Real Estate, IDR bn, n119, P1M]      sign +1 · lead 4-8m · cross-industry (developer pipeline → completions)
└─ D2d RENOVATION / real income ─► [aIDCONIAR / CEIC277372502 Consumer Confidence, n196, P1M →2026-04]   sign +1 · lead 2-4m · self-build/renovation intent ★the under-appreciated slice
                                    [aIDRSLSAR Retail Sales YoY, P1M]                                     sign +1 · lead 1-3m · renovation/self-build demand (income proxy)
                                    [CEIC277372902 Present Situation: Durable-goods buying, n196, P1M]    sign +1 · lead 1-3m · big-ticket home-improvement intent
```

- **D2b → D2a is the cleanest forecast chain, with the LONGEST lead in the engine.** The
  mortgage **rate** (`CEIC14419701`, Lending Rate: IDR: Consumption — the KPR proxy, **n304,
  →2026-04**) is the *leading parent*: a BI/KPR-rate cut → mortgage demand (9–15m) → housing
  *completions* (a further several quarters) → **finishing-materials off-take**. Because
  ceramics/glass come in *late*, **rates lead this basket's demand by ~12–18 months** — a
  longer lead than cement's 6–9m, and a real (if noisy-at-that-horizon) forecast handle.
  `CEIC389692087` (KPR loan growth, n119) is the mid-chain confirmation. **Both are
  cross-industry (Banking block, `country=id` CEIC RICs) and NEITHER has a resolver path
  today** (§6, §9 — the documented `id`-macro-plane gap, also blocking the `id_lending_rate`→None
  bug). Wiring this chain is the **biggest demand-side forecastability upgrade**.
- **D2c — real-estate / developer activity (attribution + pipeline).** `CEIC365752117` (GDP
  Real Estate, n73 quarterly) is a cleaner finishing-cycle top-line than generic GDP;
  `CEIC389692017` (Industrial loans: Real Estate, n119 monthly) is developer pipeline →
  completions (lead 4–8m to finishing).
- **D2d — renovation / real income is the under-appreciated slice (and it's more
  contemporaneous).** A large fraction of Indonesian tile/sanitaryware demand is **informal
  self-build + renovation**, which tracks **household income** more than formal property
  launches — so it bypasses the long property-completion lag. Consumer confidence
  (`CEIC277372502`/`aIDCONIAR`, n196), retail sales (`aIDRSLSAR`), and the durable-goods
  buying-intent sub-index (`CEIC277372902`) lead this renovation demand 1–4m. **This branch is
  why the basket has a shorter-horizon demand handle at all** and is the brief's "real income
  (renovation)" hook.

### D3 — INFRASTRUCTURE DEMAND (the WSBP/WTON precast sleeve — policy-driven)
```
INFRASTRUCTURE DEMAND  (APBN infra capex = the precast-concrete volume driver — ~15% of basket)
├─ D3a construction activity ────► [CEIC365752057 GDP: Construction (2010p), IDR bn, n73, P3M →2026-03]  sign +1 · lead 0-1m · ATTRIBUTION ★better than generic GDP
├─ D3b construction credit ──────► [CEIC389691957 Loans: Industrial: Construction, IDR bn, n119, P1M →2026-04]  sign +1 · lead 2-4m · cross-industry (contractor pipeline → precast off-take)
├─ D3c construction sentiment ───► [CEIC460040627 Construction Confidence Indicator (SA), %, n97, P3M →2026-03]  sign +1 · lead 1-2m · survey LEADS
│                                   [CEIC459362007 Construction Employment Future Tendency (SA), %, n97, P3M]    sign +1 · lead 1-2m · survey LEADS
└─ D3d APBN infra budget ────────► (no clean monthly infra-capex-realisation series in store) — POLICY annotation; proxy via D3a+D3b
```

- **D3a — GDP-Construction beats generic GDP.** The seed uses `id_gdp_real_q` (`aIDGDPAR1`,
  whole-economy); `CEIC365752057` (**GDP: Construction**, n73) is the sector-specific aggregate
  — precast (WSBP/WTON) demand *is* construction activity. Quarterly, lagged → attribution.
- **D3b — construction credit (the contractor-pipeline lead).** `CEIC389691957` (Industrial
  loans: Construction, n119 monthly) leads physical construction (precast off-take) ~2–4m as
  contractors draw working capital. Cross-industry (Banking), no resolver today.
- **D3c — the construction surveys LEAD.** `CEIC460040627` (Construction Confidence) and
  `CEIC459362007` (Construction Employment Future Tendency) are forward BI business-survey
  series (n97 quarterly) → lead physical activity 1–2m. The cleanest *leading* CEIC handle on
  the infra side. **Relevant only to the ~15% precast sleeve** — keep low-weight basket-wide.
- **D3d — APBN infra capex (policy gap).** The WSBP/WTON volume driver is the government infra
  budget (toll roads, IKN, dams). No clean monthly infra-capex-realisation series → **policy
  annotation**, proxied by D3a + D3b. Document, don't fake.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (kiln-fuel-dominated cash cost + USD inputs + the precast steel/cement leg)
├─ S1 KILN FUEL — GAS (~30-40%) ──► [NYMEX:NG1! Henry Hub gas, wk800]   sign −1 · lead 1-2m · COST ★PRIMARY swing (continuous float-glass furnace + ceramic kilns — the margin lever)
│      (the #1 cost; UNWIRED today) [ICEEUR:TFM1! TTF European gas, wk445]  sign −1 · lead 1-2m · COST (the better LNG-import-parity benchmark — NO resolver key yet, §9)
├─ S2 KILN FUEL — COAL (tile kilns)► [ICEEUR:ATR1! API2 Coal, wk782]    sign −1 · lead 1-2m · COST (coal-fired tile kilns + captive power; the wired wb_coal_au)
├─ S3 soda ash / USD raw mineral ─► (imported soda ash for float glass — USD-priced, no clean price series)  → proxy via usdidr (M3); silica/feldspar quarried domestically (no series)
├─ S4 PRECAST cost: steel + cement► [NYMEX:HRC1! US HRC steel, wk800]   sign −1 · lead 1-3m · COST ★RE-ROLE (WSBP/WTON rebar/wire cost — seed has it as supply +1, WRONG sign/role)
│      (the ~15% precast sleeve)     [ICEEUR:ATR1! API2 coal already in S2 = cement's cost → second-order precast cost]
├─ S5 capacity / oversupply ─────► [CEICI323568102 NMM IPI output, n180 ⚠STALE]  sign −1(as oversupply) · lead 0m · ATTRIBUTION (output into soft demand → ASP discipline / China-import pressure)
└─ S6 regulated gas (HGBT) ──────► (administered industrial gas price ~USD 6-6.5/MMBtu for ceramics/glass) — POLICY annotation; spot benchmarks (S1) set the unregulated-volume marginal cost
```

- **S1 — GAS is the margin swing, and it forecasts (the key add).** `NYMEX:NG1!` (**Henry
  Hub**, **wk800**, weekly) is the liquid benchmark for the **#1 cost** of the gas-fired
  building-products sleeve (float-glass furnaces run continuously; ceramic kilns are gas-fired).
  Gas is a *liquid, exogenous, leading* price that moves **1–2 months ahead** of the margin hit
  (contract repricing + the regulated/spot mix), so the equity *anticipates* it. **Sign −1**
  (rising gas compresses glass/ceramic margin). **The seed does NOT wire gas at all** — this is
  the single biggest cost-side gap and the brief's specified `NYMEX:NG1!` −1 hook. `ICEEUR:TFM1!`
  (**TTF European gas**, **wk445**, live) is arguably the *better* benchmark for Indonesian
  LNG-import parity (regas LNG tracks Asian/European gas, not US Henry Hub) — **but there is NO
  `ttf` resolver key in `GLOBAL_CORR`** (§9), so wire `natgas`→`NYMEX:NG1!` now and file TTF as
  a resolver add.
- **S2 — COAL (tile kilns + captive power).** `ICEEUR:ATR1!` (**API2**, **wk782**) — some
  ceramic-tile kilns and captive power run on coal, so API2 is a genuine secondary kiln-fuel
  cost. **Sign −1, cost.** Already wired (`wb_coal_au`). Keep, but **demote below gas** — for
  this basket gas is primary, coal secondary (the reverse of Cement). Coal and gas co-move in
  the energy complex → guard double-count (let the collinearity gate down-weight).
- **S3 — soda ash / USD raw minerals (proxy via FX).** Float glass needs **imported,
  USD-priced soda ash** (a real secondary swing for MLIA/AMFG); silica sand and feldspar are
  quarried domestically (own-cost, no price series). **No clean soda-ash price in store** →
  proxy the USD-input cost via `usdidr` (M3). Document the gap.
- **S4 — PRECAST steel/cement cost (RE-ROLE the seed's steel).** WSBP/WTON cash cost is **steel
  rebar/wire + cement**, not gas. `NYMEX:HRC1!` (**US HRC steel**, **wk800**) is the liquid
  proxy. **The seed wires `steel_hrc` as `supply, +1` ("steel/building products") — this is
  wrong for this basket:** steel is a precast *cost* (−1), not a revenue driver. Re-role to
  **cost −1** (a rising steel price compresses the precast sleeve's margin). This is a clean,
  falsifiable correction (§9). Note it only bites ~15% of cap.
- **S5 — capacity / oversupply + China-import ASP pressure.** Domestic ceramics has run
  **structural overcapacity** with persistent **cheap-Chinese-tile import competition**
  (periodic anti-dumping safeguard duties). When output rises into soft demand, ASP discipline
  breaks → margin compression, so high output is *negative* for margin (sign −1 as oversupply).
  No direct utilisation series; the NMM IPI (`CEICI323568102`) is the output proxy but **⚠STALE
  (→2024-12)**. Document as derived/attribution; the China-import + oversupply story is the
  basket's structural ASP weakness (cross-read via D1c import value).
- **S6 — regulated gas / HGBT (policy, the swing's caveat).** Indonesia's **HGBT** scheme caps
  industrial gas at ~USD 6–6.5/MMBtu for selected sectors incl. ceramics/glass. This **mutes**
  the pass-through of spot gas for *regulated volumes* — so the S1 lever bites on the
  *unregulated marginal* volume and via policy on/off risk. No clean series → policy annotation;
  it is *why* the gas→margin elasticity is < 1 and a source of regime risk.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay  (property/developer financing rate + USD-input cost + flow)
├─ M1 BI policy rate ────────────► [ECONOMICS:IDINTR BI 7DRR, monthly]   sign −1 · lead 6-12m · MACRO (the rate the KPR/property/completion/finishing chain hangs off — long lead)
├─ M2 ID 10Y govt yield ─────────► [TVC:ID10Y, wk798]   sign −1 · lead 1-3m · MACRO (mortgage duration + developer/SOE financing cost; LEADING price)
│                                   [TVC:ID01Y, wk793]   short-end (BI-rate transmission)
├─ M3 USD/IDR ───────────────────► [FX_IDC:USDIDR, wk801]  sign −1 · lead 0-1m · MACRO (imported soda ash + USD frits/glazes/machinery; risk-off on low-β names)
├─ M4 broad USD (DXY) ───────────► [TVC:DXY US Dollar Index, wk800]  sign −1 · lead 0-1m · MACRO  ★FIX: seed/engine routes dxy→TVC:BBDXY (wk0, DEAD)
└─ M5 GDP / activity ────────────► [CEIC365752057 GDP: Construction, n73] (see D3a)  sign +1 · lead 0-1m · attribution (replaces generic id_gdp_real_q)
```

- **M1 BI rate = −1, the chain's root (long lead).** `ECONOMICS:IDINTR` (BI 7DRR) is the
  **leading parent** of the property-demand chain (rate ↓ → KPR ↓ → mortgage growth ↑ →
  completions ↑ → finishing off-take ↑). Already wired as `id_bi_rate, macro, −1`. Keep — but
  recognise its power here is via the demand chain with a **long lead (6–12m to finishing
  demand)** because finishing is late-cycle; it is **not** a direct discount-rate effect (these
  are low-β value names, not long-duration growth).
- **M2 ID 10Y = −1, a LEADING liquid price.** `TVC:ID10Y` (wk798) — mortgage-duration +
  developer/SOE financing-cost anchor; a daily liquid yield → it *leads*. **Add** (the seed
  has BI rate but not the 10Y; Cement has both). Wire `id_10y, macro, −1`; optionally add the
  1Y (`TVC:ID01Y`, wk793) as the short-end BI-transmission check.
- **M3 USD/IDR = −1.** The building-products sleeve has a meaningful **USD-input** cost
  (imported soda ash, frits, glazes, machinery), so a weak IDR raises cost; it is also a
  risk-off/EM-outflow signal pressuring the low-β domestic names. The seed currently wires
  `usdidr` as `macro, sign 0` ("ambiguous: + for USD earners, − for importers") — but this
  basket is a **net USD-input importer** (only TOTO/AMFG have a small export offset), so the
  correct a-priori is **−1**, not 0. Tighten the sign (§9, falsifiable).
- **M4 DXY = −1 — and the resolver BUG.** A stronger broad dollar = EM-flow headwind + IDR
  pressure → negative for these domestic cyclicals. **But the engine's `dxy` resolver points to
  `TVC:BBDXY`, wk0 (EMPTY) → DXY is silently unwired everywhere.** The fix is **`TVC:DXY`**
  (wk800) per the AGENT_BRIEF caveat. Real, falsifiable, engine-wide bug (§9). **Add `dxy,
  macro, −1`.**
- **M5 — replace generic GDP with GDP-Construction.** The seed's `id_gdp_real_q` (`aIDGDPAR1`)
  is whole-economy; `CEIC365752057` (GDP: Construction) is the theory-correct activity
  attribution (see D3a). Demote/replace.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `NYMEX:NG1!` Henry Hub gas | **Energy / Gas** | **cost −1** (S1) | kiln/furnace fuel ~30–40% of glass/ceramic cash cost — the **#1 margin swing** (the brief's natgas hook; seed omits it entirely) |
| `ICEEUR:TFM1!` TTF gas | **Energy / Gas** | **cost −1** (S1, no key) | better LNG-import-parity benchmark; **no resolver key yet** — add `ttf` to `GLOBAL_CORR` (§9) |
| `ICEEUR:ATR1!` API2 coal | **Energy / Coal** | **cost −1** (S2) | coal-fired tile kilns + captive power (secondary fuel; the wired `wb_coal_au`) |
| `NYMEX:HRC1!` HRC steel | **Basic Materials / Steel** | **cost −1** (S4, RE-ROLE) | precast (WSBP/WTON) rebar/wire cost — seed mis-roles as supply +1 |
| `CEICI13536901` cement consumption | **Infrastructure / Cement** | **demand +1** (D1b) | same-construction-cycle volume proxy (cement off-take leads finishing 4–8Q) |
| `CEIC389692087` KPR housing loans | **Banking** (`id`-macro plane) | **demand +1** (D2a) | rate→mortgage→completion→finishing chain (lead 9–15m) |
| `CEIC14419701` KPR/consumption lending rate | **Banking** (`id`-macro) | **demand −1** (D2b) | the *leading parent* of the property chain (lead 12–18m); also fixes `id_lending_rate`→None |
| `CEIC389691957` construction loans | **Banking** (`id`-macro) | **demand +1** (D3b) | contractor pipeline → precast off-take (lead 2–4m) |
| `CEIC365752057` GDP: Construction | **GDP / Construction** | **demand +1** (D3a/M5) | precast demand IS construction (replaces generic GDP) |
| `CEIC365752117` GDP: Real Estate | **GDP / Real Estate** | **demand +1** (D2c) | the finishing-cycle top-line for the building-products sleeve |
| `CEIC460040627` construction confidence | **Business Surveys** | **demand +1** (D3c) | forward survey LEADS physical construction 1–2m |
| `CEIC277372502` / `aIDCONIAR` consumer confidence | **Consumer Surveys** | **demand +1** (D2d) | self-build/renovation purchasing power (the income/renovation slice) |
| `CEICI323776102` glass/ceramic import value | **Infrastructure / Cement** (HS trade) | **demand −1** (D1c) | rising Chinese-import value = ASP/share pressure on ARNA/MLIA |

**The cross-industry story (Property/Construction ← Construction Materials, read inverted).**
The IMPROVEMENT_PLAN notes "Property ← Basic Materials cement/steel" — building materials are
*inputs* to property/construction. Read the other way, **this basket is a downstream,
late-cycle read on the property + infra cycle**, so its demand drivers ARE the
Property/Construction baskets' demand drivers (KPR growth, construction loans, GDP-Construction,
GDP-Real-Estate), just **lagged further** (finishing comes after structure). This is the same
Banking `id`-macro plane Cement/Property/Construction/Banks all need — one shared resolver task
(§9). Its **cost** drivers, by contrast, are borrowed from **Energy (gas/coal)** and **Steel**
— making this basket a true demand(Property)×cost(Energy) cross-product.

**Deliberate non-linkages.** Do **not** wire `SHFE:RB1!` China rebar (wk0, DEAD) or `SGX:FEF1!`
iron ore (wk0, DEAD) or `SGX:JKM1!` JKM LNG (wk0, DEAD) — all empty; use `NYMEX:HRC1!` for
steel and `NYMEX:NG1!`/`ICEEUR:TFM1!` for gas. Do **not** wire the broad HS-aggregate "Salts;
Sulphur; Earths and Stone" trade bucket as demand — it is a noisy mixed-minerals basket.

---

## 7. Currently-wired vs available

### 7a. The 5-driver seed vs proposed (rescue marginal → forecaster)

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `ceic ("Industrials & Manufacturing", None)` | category pull | **220-series firehose** | **★NARROW** | replace with `("Industrials & Manufacturing","Non-Metallic Mineral Mfg")` + isolate NMM IPI; add `("Infrastructure","Cement")` for the consumption/trade demand block; drop 200+ irrelevant (textile/food/electronics) |
| `steel_hrc` | **supply +1** | `NYMEX:HRC1!` wk800 | **★RE-ROLE → cost −1** | steel is the precast (WSBP/WTON) *cost*, not a revenue driver — wrong sign/role today |
| `wb_coal_au` | cost −1 | `ICEEUR:ATR1!` API2 wk782 | **keep, DEMOTE below gas** | coal-fired tile kilns/captive power — secondary fuel here (gas is primary) |
| `id_bi_rate` | macro −1 | `ECONOMICS:IDINTR` | **keep** | root of the property-demand chain (long lead, finishing late-cycle) |
| `id_gdp_real_q` | demand +1 | `aIDGDPAR1` | **replace** | → `CEIC365752057` GDP: Construction (theory-correct) |
| `usdidr` | **macro 0** | `FX_IDC:USDIDR` wk801 | **★TIGHTEN → −1** | basket is a net USD-input importer (soda ash/frits/machinery); ambiguous-0 is too weak |
| `id_cpi_yoy` | macro 0 | `ECONOMICS:IDIRYY` | keep (low weight) | inflation regime; ambiguous |
| *(none)* `natgas` | — | **`NYMEX:NG1!` wk800** | **★ADD cost −1** | **the #1 margin swing** (glass/ceramic kiln fuel) — the single biggest cost-side gap |
| *(none)* `id_10y` | — | `TVC:ID10Y` wk798 | **ADD macro −1** | mortgage duration + financing; leading liquid yield |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | engine-wide resolver bug; add macro −1 |
| *(none)* NMM IPI output | — | `CEICI323568102` n180 ⚠STALE | **ADD demand +1** (via NMM sub pull) | the building-materials volume thermometer (attribution, backfill) |
| *(none)* cement consumption | — | `CEICI13536901` n388 | **ADD demand +1** (via Infrastructure/Cement pull) | same-cycle construction volume proxy |
| *(none)* KPR mortgage growth | — | `CEIC389692087` n119 | **ADD demand +1** (needs `id`-resolver) | completion→finishing lead (9–15m) |
| *(none)* KPR/consumption rate | — | `CEIC14419701` n304 | **ADD demand −1** (needs `id`-resolver; also fixes `id_lending_rate`→None) | the LEADING parent (12–18m) |
| *(none)* construction loans | — | `CEIC389691957` n119 | **ADD demand +1** (needs `id`-resolver) | precast/contractor pipeline (2–4m) |
| *(none)* consumer confidence | — | `aIDCONIAR`/`CEIC277372502` | **ADD demand +1** | renovation/self-build (the income slice) |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| TTF LNG-import-parity gas | `ICEEUR:TFM1!` wk445 | **no `ttf` resolver key** in `GLOBAL_CORR` — add the key (§9), then wire |
| Soda ash price (float-glass input) | *(none)* | imported USD-priced; no clean series — proxy via `usdidr` |
| Silica sand / feldspar | *(none)* | quarried domestically, own-cost, no price series |
| Capacity utilisation / China-import ASP | `CEICI323568102` NMM IPI (⚠STALE →2024-12); D1c import value | no direct utilisation series; NMM IPI stale |
| HGBT regulated industrial-gas price | *(none)* | admin/policy — annotation; mutes the gas pass-through |
| APBN infrastructure capex realisation | proxy `CEIC365752057` + `CEIC389691957` | no clean monthly infra-budget-realisation series |
| RPPI residential property price | **not in store** (id.json RPPI search = 0 hits) | the Property RPPI block is not in the `id` catalog snapshot — KPR growth substitutes |
| JKM Asian LNG | `SGX:JKM1!` | **wk0 DEAD** — use `NYMEX:NG1!` / `ICEEUR:TFM1!` |

---

## 8. Forecastability — why it's marginal, and how to lift it

**The backtest fact:** Construction Materials is **IC +0.065 · hit−up +0.00 · placebo pctile
0.80 → `marginal`** over **129** forward months — it sits *just below* the skill threshold,
in the same neighbourhood as Cement (+0.07), Plantation (+0.07) and Electronics (+0.07). It is
**not broken** (it has a real kiln-fuel cost lever) but it is **not yet a forecaster** — the
signal is small and currently half-wired.

**Why the kiln-fuel→margin lead gives the marginal skill:** the one thing the seed has *almost*
right is the energy-cost leg. `wb_coal_au` (API2) is a *liquid, exogenous, leading* price, and
because kiln fuel is the dominant cash cost of the gas/coal-fired building-products sleeve, a
fuel-price move **mechanically leads the margin (and thus the equity) by 1–2 months**. That
single leading cost lever is what lifts the basket off zero to +0.065. **But it is only half the
fuel story** — the basket's biggest fuel is **gas, which is entirely unwired** — so the engine
is forecasting a gas-furnace basket using only a coal proxy. The property-demand cycle is the
*second* source of skill, but it is the **lagging, late-cycle (finishing)** side and is
currently represented only by whole-economy GDP.

**Why it's only marginal (the honest diagnosis):**

1. **The seed pulls a 220-series firehose, and omits gas.** `("Industrials & Manufacturing",
   None)` sweeps textiles/food/electronics/machinery — none of which drive this basket — while
   the **#1 cost (gas, `NYMEX:NG1!`)** is **not wired at all** and the demand side leans on
   generic GDP. The forecastable cost lever is therefore *under-specified* (coal-only proxy for
   a gas-dominated cost stack).
2. **The basket is two economically different sleeves blended.** ~67% gas-fired building
   products (demand = property finishing + renovation, cost = gas) + ~15% precast concrete
   (demand = APBN infra, cost = steel/cement). The engine fits one driver set to both → the
   gas lever is diluted by the precast names (which don't burn gas) and the steel lever
   (mis-roled as supply +1) fights the cost logic.
3. **The leading DEMAND branch (rate → KPR → completion → finishing) is entirely unwired, and
   has the engine's LONGEST lead.** Because finishing materials are late-cycle, the mortgage
   rate leads this basket's demand by ~12–18 months — a real but long, noisy lead living on the
   **Banking `id`-macro plane no resolver reads** (DATA_BUGS / §6). The basket is blind to its
   own (lagged) demand cycle and to the contemporaneous **renovation/income** slice.
4. **Low β + the HGBT regulated-gas cap mute the amplitude.** β −0.08 to 0.35 → low equity
   amplitude; and HGBT caps the pass-through of spot gas on regulated volumes → the gas→margin
   elasticity is < 1. Real signal, muted response.

**Which branches lead vs lag:**
- **LEAD (forecast candidates):** **gas `NYMEX:NG1!` (1–2m — THE add)**, API2 coal (1–2m, the
  wired backbone), HRC steel (1–3m, precast cost), ID 10Y / BI rate (1–6m), DXY/USDIDR (0–1m),
  **KPR/consumption lending rate (12–18m — the longest, noisiest demand lead, UNWIRED)**,
  construction-confidence survey (1–2m, unwired), consumer confidence (renovation, 2–4m).
- **COINCIDENT/LAG (attribution):** NMM IPI output, cement consumption/sales, GDP-Construction,
  GDP-Real-Estate, KPR loan growth, construction loans, glass/ceramic import value — all
  publication-lagged CEIC quantities. They anchor attribution; they do not forecast.

**What would move it from +0.065 toward skill (the upside test):**
1. **Wire gas (`NYMEX:NG1!`, cost −1)** — the single biggest cost-side gap; completes the
   kiln-fuel story (gas primary, coal secondary). *Expected primary lift.*
2. **Narrow the CEIC pull** to `Non-Metallic Mineral Mfg` + `Infrastructure/Cement` — stop
   forecasting building materials with textile/food noise; let NMM output + cement consumption
   enter.
3. **Re-role steel to cost −1** and **tighten USD/IDR to −1** — fix two sign/role errors that
   currently fight the cost logic.
4. **Fix DXY** (`TVC:DXY`) and **add ID 10Y** — free engine-wide / leading-yield corrections.
5. **Wire the rate→KPR→construction + renovation demand chain** (once `id`-macro resolver lands)
   — the leading (if long-lag) demand signals + the contemporaneous renovation slice. *Highest
   expected value on the demand side, but resolver-dependent.*

**Honest ceiling.** Even fully wired, Construction Materials is a **low-β, two-sleeve,
domestic, cost-pass-through beta** — its forward IC will likely land in the *modest-skill* band
(think **+0.10 to +0.14**, the Cement / Electronics neighbourhood), **not** the Coal/AltEnergy
+0.23 tier. The reasons: (a) low equity amplitude + HGBT-capped gas pass-through mute the
signal, (b) the two sleeves blend a gas-cost basket with a steel-cost basket, (c) the best
demand signals are *late-cycle, publication-lagged* finishing-stage quantities. The realistic
goal is to **lift it across the marginal→skill line and make the cost/demand attribution
honest** (gas in, steel re-roled, demand chain wired) — not to manufacture a top-tier
forecaster. **If the gas/coal energy complex proves too collinear to separate, keep gas as the
primary fuel lever and let the collinearity gate down-weight coal.**

---

## 9. Engine-wiring spec — concrete `mapping.py`

Three resolver edits help the whole engine; the rest is basket-local. The **`id`-macro
resolver** (to read `CEIC…` Banking/GDP RICs) is a **shared infrastructure task** also required
by Cement/Property/Construction/Banks — flag it, do not fake the series if it is not yet built
(wire the price/rate leaves now; add the loan-growth leaves when the resolver lands).

```python
# --- GLOBAL_CORR edits (apply once; help the whole engine) ---
#   "dxy": "TVC:DXY",                 # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
#   "ttf": "ICEEUR:TFM1!",            # NEW key: TTF European gas (wk445) — better LNG-import-parity than Henry Hub.
#   "id_lending_rate": "CEIC14419701",# FIX: was None. KPR/consumption lending rate (n304) — the property-chain parent.
#   "id_credit_kpr":   "CEIC389692087",         # NEW (needs id-macro plane): KPR housing-loan growth, n119
#   "id_credit_construction": "CEIC389691957",  # NEW: industrial construction loans, n119
#   "id_gdp_construction": "CEIC365752057",     # NEW: GDP Construction sub-aggregate, n73
#   (natgas->NYMEX:NG1!, steel_hrc->NYMEX:HRC1!, wb_coal_au->ICEEUR:ATR1!, id_10y, id_bi_rate,
#    usdidr, id_consumer_confidence already resolve correctly.)
```

```python
"Construction Materials": {  # 6 names, TWO sleeves: ~67% gas-fired building products (ARNA tiles,
    # TOTO sanitaryware, MLIA/AMFG float glass) + ~15% precast concrete (WSBP/WTON). Marginal fwd
    # (OOS IC +0.065). LIFT: wire GAS (the #1 unwired cost), narrow the firehose, re-role steel to
    # cost, add the rate->KPR->finishing + renovation demand chain. NOT a top-tier forecaster (low-β,
    # two-sleeve, HGBT-capped gas pass-through).
    "ceic": [("Industrials & Manufacturing", "Non-Metallic Mineral Mfg"),  # ★was ("...", None) 220-series firehose
             ("Infrastructure", "Cement")],   # cement consumption + glass/ceramic trade = the demand block
    # Re-role: NMM output + cement consumption = demand attribution (+1); glass/ceramic IMPORT value = demand -1
    # (Chinese-import ASP pressure). Isolate the monthly NMM IPI.
    "ceic_override": [
        ("ipi: manufacturing: non- metallic mineral", "demand", +1),  # CEICI323568102 n180 ⚠STALE — the volume thermometer
        ("cement consumption: indonesia",             "demand", +1),  # CEICI13536901 n388 — same-cycle construction proxy
        ("import value: cement, plaster, glass, ceramic", "demand", -1),  # CEICI323776102 n172 — China-import ASP pressure
    ],
    # EXCLUDE noisy HS-aggregate mixed-minerals buckets (not building materials).
    "ceic_exclude": [
        ("salts; sulphur; earths and stone", None, None),   # CEICI323781502/323791202 — mixed minerals bucket
    ],
    "globals": [
        ("natgas",     "cost", -1, "Henry Hub (NYMEX:NG1!) = kiln/furnace fuel ~30-40% of glass/ceramic cash cost — THE margin swing, LEADS 1-2m"),  # ★ADD — the #1 gap
        ("wb_coal_au", "cost", -1, "API2 (ICEEUR:ATR1!) = coal-fired tile kilns + captive power — SECONDARY fuel (demote below gas; guard energy-complex double-count)"),
        ("steel_hrc",  "cost", -1, "HRC steel (NYMEX:HRC1!) = WSBP/WTON precast rebar/wire cost — ★RE-ROLE from supply+1 (only ~15% of cap)"),
        # ("ttf",      "cost", -1, "TTF (ICEEUR:TFM1!) LNG-import-parity gas — wire after adding the resolver key; guard double-count vs natgas"),
    ],
    "macro": [
        ("id_bi_rate",            "macro",  -1, "BI 7DRR = root of the property->completion->finishing chain (long lead 6-12m; finishing is late-cycle)"),
        ("id_lending_rate",       "demand", -1, "KPR/consumption rate (CEIC14419701) LEADS completion->finishing 12-18m — the longest demand lead"),  # FIXED resolver
        ("id_10y",                "macro",  -1, "mortgage duration + SOE/developer financing (leading yield)"),  # ADD (seed lacked it)
        ("id_credit_kpr",         "demand", +1, "KPR housing-loan growth (CEIC389692087) -> completions -> finishing materials (lead 9-15m)"),   # needs id-macro plane
        ("id_credit_construction","demand", +1, "construction loans (CEIC389691957) -> precast/contractor pipeline (lead 2-4m)"),  # needs id-macro plane
        ("id_gdp_construction",   "demand", +1, "GDP: Construction (CEIC365752057) — demand IS construction (replaces id_gdp_real_q)"),  # needs id-macro plane
        ("id_consumer_confidence","demand", +1, "consumer confidence (aIDCONIAR/CEIC277372502) -> renovation/self-build (the income slice, lead 2-4m)"),
        ("usdidr",                "macro",  -1, "★TIGHTEN from 0: net USD-input importer (soda ash/frits/machinery) + EM risk-off on low-beta names"),
        ("dxy",                   "macro",  -1, "broad USD = EM-flow headwind (FIXED resolver -> TVC:DXY)"),
    ],
},
```

**Notes for the implementer.**
- **Wiring gas is the first-order fix.** `natgas`→`NYMEX:NG1!` is the **single biggest gap** —
  the basket's dominant cash cost is currently invisible to the engine. Keep coal (`wb_coal_au`)
  as the secondary fuel and let the collinearity gate manage the gas/coal energy-complex overlap;
  do not let coal dominate gas in the weighting.
- **Re-role `steel_hrc` (supply +1 → cost −1).** This is a clean theory correction: steel is the
  precast sleeve's *cost*, not a basket revenue driver. It only bites ~15% of cap, so its weight
  should be modest; the falsifiable test is whether flipping the sign holds/improves IC.
- **Narrowing the CEIC pull** — `("Industrials & Manufacturing", None)` (220 series) →
  `("Industrials & Manufacturing","Non-Metallic Mineral Mfg")` + `("Infrastructure","Cement")`
  (the NMM-output + cement-consumption + glass/ceramic-trade set). Verify the `ceic_override`
  isolates the monthly NMM IPI and re-signs the glass/ceramic **import** series to demand −1
  (China-import ASP pressure), not the default supply +1.
- **`dxy → TVC:DXY`, `id_lending_rate → CEIC14419701`, and the new `ttf` key** are three clean
  resolver wins (the second also un-breaks every basket referencing the None lending-rate spark).
- **The `id`-macro plane is a dependency, not a fabrication.** `id_credit_kpr`,
  `id_credit_construction`, `id_gdp_construction` resolve to `CEIC…` RICs that **no current
  resolver path reads** (DATA_BUGS §"ID-macro plane not read"). If the thin `id`-observations
  resolver is not yet built, **wire the price/rate leaves now** (gas, coal, steel, rates, FX,
  DXY, consumer confidence, the NMM + Infrastructure/Cement pull) and **add the three loan/GDP
  leaves in the same PR as Cement/Property/Banks** once the resolver lands — the shared task. Do
  **not** invent the series.
- **NMM IPI is STALE** (`CEICI323568102` →2024-12) — wire as low-weight attribution, file a
  backfill task; do not treat it as a live forecaster.
- **RPPI is not in store** (id.json RPPI search returned 0 hits) — KPR loan growth substitutes as
  the property-demand handle; do not fabricate a price index.

**Falsifiable backtest plan (the keep/kill gate).** Run `backtest/bt.py "Construction Materials"`
and **keep each change only if forward IC improves or holds at ≥ +0.065 with a more honest
tree**, ablating in this order:
1. **+ gas (`natgas`, cost −1)** — *expected primary lift*: the dominant kiln fuel finally
   enters; confirm IC rises and gas (not just coal) carries the cost lever.
2. **CEIC pull narrow** (`Non-Metallic Mineral Mfg` + `Infrastructure/Cement`, glass/ceramic
   import re-signed −1) vs the firehose — confirm the NMM/cement demand series enter and noise
   drops.
3. **+ steel re-role** (supply +1 → cost −1) — confirm flipping the precast cost sign holds/
   improves IC (do not let an in-sample-only artefact keep the wrong sign).
4. **+ USD/IDR tighten (0 → −1)** and **`dxy` fix (`TVC:DXY`)** and **`id_10y` add** — confirm
   the FX/rate corrections contribute.
5. **+ rate→KPR→construction + consumer-confidence demand chain** (once `id`-macro resolver
   lands) — *the upside test*: does the leading (long-lag) mortgage-rate / loan-growth chain +
   the contemporaneous renovation slice add forward IC beyond the price/rate set, or is it
   already priced into rates? **Keep only if additive.**

Success criterion: a **narrower, gas-led-cost, demand-aware** tree that lifts Construction
Materials across the **marginal → skill** line (target placebo pctile > 0.90, IC ≥ +0.10) with
honest two-sleeve attribution — never a change that only lifts in-sample fit. If the gas/coal
energy complex is too collinear to separate, keep gas primary and demote coal; if the
`id`-macro demand chain proves redundant to rates, revert it and keep the (still-improved)
gas + steel-re-role + CEIC-narrow core.
