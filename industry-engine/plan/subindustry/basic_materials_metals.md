# Metals (steel) — driver-tree plan (`basic_materials_metals`)

> Sector **Basic Materials** · sub_sector **Metals** · benchmark JCI · total mcap
> **≈19.4T IDR** · 15 members · 39 CEIC candidates.
> Current state (`_state.txt` / `BACKTEST.md`): **grade `perfected`**, **kept 6
> drivers**, **blindfolded forward OOS = SKILL** (fwd IC **+0.144**, in-sample
> +0.14, n_oos 129, placebo pctile **0.97**, hit−up **+0.01**). One of only 12
> SKILL baskets and the **only steel basket** — this is a **Tier-B "deepen +
> protect"** job, NOT a rescue. The skill is real but **fragile in direction**
> (hit−up ≈ 0): it ranks/sizes moves well but the up/down sign barely beats a
> coin-flip, so the priority is to **deepen and protect the channel that earns the
> +0.144 — the China steel cycle — without adding noise that breaks it.**
>
> **The thesis in one line:** this is a **China-steel-price + domestic-construction**
> basket. Chinese steel sets the marginal price for Indonesian flat/long product and
> floods the region when China oversupplies; the China steel cycle therefore **leads**
> the IDX steel equities. That lead is the source of the forward skill, and protecting
> it is the whole game.

---

## 1. Snapshot

**Members (15 names, equal-weight target — engine uses `ret_eqw`):**

| symbol | name | what it does | mcap (IDR) | beta |
|---|---|---|---|---|
| **CTBN** | Citra Tubindo | seamless **OCTG / steel pipe** (oilfield tubular), Vallourec-linked | 4.60T | 0.27 |
| **KRAS** | Krakatau Steel | SOE integrated mill — **HRC / CRC / wire rod**; the basket's bellwether | 4.49T | 0.60 |
| **GGRP** | Gunung Raja Paksi | private integrated **long + flat** steel (sections, plate) | 3.97T | 0.32 |
| **ISSP** | Spindo (Steel Pipe Ind.) | **welded steel pipe / tube** fabricator (HRC/CRC converter) | 2.89T | 0.30 |
| **TBMS** | Tembaga Mulia Semanan | **copper rod / wire** (cable feedstock) — a copper, not steel, name | 0.94T | 0.26 |
| **GDST** | Gunawan Dianjaya Steel | **hot-rolled plate** re-roller (slab → plate) | 0.80T | 0.17 |
| **NIKL** | Pelat Timah Nusantara (Latinusa) | **tinplate** (electrolytic tin-coated steel for cans) | 0.64T | 0.77 |
| **BTON** | Betonjaya Manunggal | **rebar / deformed bar** (long product, billet → bar) | 0.27T | — |
| **BAJA** | Saranacentral Bajatama | **CRC / coated (galvanised) steel sheet** | 0.25T | 0.79 |
| **LION** | Lion Metal Works | fabricated **steel furniture / safes** (metal goods) | 0.20T | — |
| **ALKA** | Alakasa Industrindo | **aluminium** processing / trading | 0.17T | — |
| **INAI** | Indal Aluminium Industry | **aluminium extrusion** (profiles) | 0.11T | — |
| **PICO** | Pelangi Indah Canindo | **steel drums / containers / auto parts** (fabricated metal) | 0.08T | −0.09 |
| **LMSH** | Lionmesh Prima | **wire mesh** (drawn-wire steel) | 0.02T | — |
| **JKSW** | Jakarta Kyoei Steel Works | **billet / long product** (distressed; mcap ≈ 0) | 0.00T | — |

> **Brief vs reality.** The agent brief named KRAS/GDST/ISSP/BAJA/NIKL/ESSA/ALMI/JKSW/
> GGRP/BTON. The **live worklist** basket is the 15 above — **ESSA** (Surya Esa Perkasa,
> ammonia/LPG) and **ALMI** (Alumindo) are **not** in this worklist slice; the basket
> instead carries **CTBN/TBMS/LION/LMSH/ALKA/INAI/PICO**. I model the **real worklist
> members**. The basket is **~80% steel** (KRAS/GGRP/ISSP/GDST/BAJA/BTON/NIKL/JKSW/LMSH/
> PICO + pipe), **~13% copper** (TBMS, by mcap-share the 2nd-largest swing), and **~3%
> aluminium** (ALKA/INAI). **Steel — and behind it Chinese steel — is the dominant
> return axis.** TBMS (copper rod) is the single contaminating sleeve to watch.

**The structure (why it already works, and what it lives on).** Indonesian steelmakers
are **price-takers on a globally/regionally cleared product**. Domestic HRC/CRC/rebar
prices are set at a small premium to **landed Chinese import parity** (China is the
world's marginal ~1Bt/yr producer and Indonesia's largest steel-import source). So when
the **China steel cycle** turns — rebar/HRC price up, mills restock, PPI reflates — IDX
steel equities re-rate **with a lead**, because the China price moves in liquid markets
**before** the lagged domestic prints and earnings. That lead is exactly the class of
signal the backtest rewards, and it is why this basket — alone among the small-cap steel
names — shows fwd IC +0.144. **The job here is to protect and deepen that China channel,
not to re-found the basket.**

**The gap (what is missing despite the skill).**
1. **Iron ore — the #1 cost — is unobserved.** `iron_ore → SGX:FEF1!` and the backup
   `DCE:I1!` are **both EMPTY (wk=0)**. The wired cost driver scores nothing; the
   margin-swing input is invisible (proxy exists — see §4/§5).
2. **The China channel is wired only through three macro aggregates** (`cn_ip_yoy`,
   `cn_ppi_idx`, `cn_pmi_mfg`) — broad, slow, and not *steel-specific*. The **direct
   China-steel price** (`aCNCNVRGRM` rebar index), **China crude-steel production**
   (`aCNCNBFWHM`/`aCNPDCRDS`), **China iron-ore imports** (`aCNIMPFEOC`), and a **liquid
   China-steel equity** (`600019.SS` Baosteel) are all available and **un-wired** —
   this is where the skill is, under-exploited.
3. **Coking coal is unobserved.** `SGX:FFX1!` Coking Coal = **EMPTY (wk=0)**; no scrap,
   no met-coal, no pig-iron tradable anywhere in `market.json`. The reductant cost stack
   has no clean price (thermal-coal API2 is an imperfect proxy).
4. **`dxy` resolves to an empty series.** `GLOBAL_CORR["dxy"] = TVC:BBDXY` is **wk=0**;
   `TVC:DXY` (wk=800) is live. The USD-strength branch is silently dead today.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (per name, then equal-weighted):**

```
revenue ≈ Σ_product [ steel_product_price × shipment_volume ]      (KRAS/GGRP/GDST/BAJA/BTON/ISSP/NIKL)
        + copper_rod_price × volume                                 (TBMS)
        + aluminium_product_price × volume                          (ALKA/INAI)
gross margin ≈ product_price − ( iron-ore + coking-coal + scrap + slab/HRC feed + energy )
```

- **Integrated mills (KRAS, GGRP)** — `HRC/CRC/long_price × tonnes`, margin = price − (iron
  ore + coking coal + energy) via the blast-furnace/DRI route; **most ore/coal-cost-levered.**
- **Re-rollers / converters (GDST plate, BAJA CRC/galv, ISSP/CTBN pipe, NIKL tinplate,
  LMSH mesh)** — buy **slab/HRC/CRC** as feedstock and sell a converted product; their
  cost is **upstream steel itself**, so their margin is the **conversion spread** (product
  price − HRC feed). For these, *a rising HRC price is a COST, not revenue* — the basket
  nets the integrated-mill "+price" against the converter "−feed", which is one reason
  the **direction (hit−up) is weak** even though the China-cycle magnitude signal is strong.
- **TBMS** — copper-rod margin = `copper_price` pass-through on a thin tolling spread;
  loads on **LME copper / China copper demand**, *orthogonal to steel*.
- **ALKA / INAI** — aluminium extrusion; load on **LME aluminium**, again off the steel axis.

**Cost stack (margin swing factor = iron ore + coking coal, then scrap + energy + USD):**
- **Iron ore (~40–50% of BF cash cost)** — the single biggest cost; *unobserved in-store*
  (FEF empty) → proxy via **iron-ore-miner equities (FMG/RIO/BHP/VALE)**.
- **Coking coal (~20–25%)** — metallurgical coal for coke; *no price in-store*
  (`SGX:FFX1!` empty) → **API2 thermal coal is a weak proxy** (thermal ≠ coking; flag).
- **Scrap** (EAF route, mini-mills like BTON/JKSW) — *no scrap price in-store at all.*
- **Energy** (electricity/gas for re-heating, EAF power) and **USD** (imported slab/HRC
  feed, plus DRI gas) — IDR weakness **raises feed cost** for the import-dependent
  converters → `usdidr` is a **−1** here (the opposite sign to an exporter basket).

**What a sell-side analyst actually watches (in order):**
1. **China HRC / rebar price + China steel exports** — the import-parity ceiling on
   domestic price and the flood-risk gauge. *This is the alpha variable.*
2. The **HRC–iron-ore "metal spread"** (product − ore − coking coal) — the true margin.
3. **China crude-steel production & inventory** (restock vs destock cycle) and **China
   property/infra construction** (≈55% of Chinese steel demand) — the demand pulse that
   moves the price.
4. **Domestic construction & auto demand** (apparent consumption) + **safeguard/anti-
   dumping duties** (the policy floor that lets domestic price sit above import parity).
5. **USDIDR** (imported-feed cost) and **iron ore / coking coal** (input cost).

**Intra-basket dispersion.** KRAS/GGRP (integrated) are the cleanest **+steel-price**
betas and the highest China-cycle loadings; the re-rollers (GDST/BAJA/ISSP/CTBN/NIKL)
carry a **conversion-spread** sign that partly offsets them; TBMS is a **copper** beta and
ALKA/INAI **aluminium** — three different metals in one basket. The "clean" common factor
is **steel for ~80% of weight**, contaminated by a copper sleeve (TBMS, ~13%) and an
aluminium tail. The China-steel price is the factor that loads positively on the largest,
most liquid names (KRAS/GGRP) — hence wiring it harder should sharpen direction.

---

## 3. DEMAND driver tree

Leaf format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.

```
DEMAND (what lifts steel price × volume)  — the China cycle is the price-setter
├── D1 China steel PRICE / cycle  (the import-parity ceiling — SOURCE OF SKILL)
│   ├── D1a China rebar price idx ──► aCNCNVRGRM (China steel price index, rebar, P1M)
│   ├── D1b China PPI (metals infl)─► cn_ppi_idx = aCNPPIAR (P1M)            [WIRED]
│   └── D1c China steel-equity px ──► 600019.SS Baosteel (wk=783) / NSE:CNXMETAL (wk=773)
├── D2 China steel OUTPUT / restock  (volume pulse that moves the price)
│   ├── D2a China crude-steel prod ─► aCNCNBFWHM / aCNPDCRDS (Production, crude steel, P1M)
│   ├── D2b China mfg PMI ──────────► cn_pmi_mfg = aCNPMIMT (P1M)            [WIRED]
│   └── D2c China industrial output► cn_ip_yoy = aCNIP (P1M)                 [WIRED]
├── D3 China construction / property demand  (≈55% of China steel end-use)
│   ├── D3a China house-price YoY ──► aCNHPIAR (P1M)
│   └── D3b China FAI / steel use ──► (cn property/FAI block, P1M — discoverable, §6)
├── D4 Domestic construction / auto demand  (apparent consumption)
│   ├── D4a domestic steel imports ─► CEICI323786202 Import value: Iron & Steel (n172, P1M)
│   ├── D4b construction GDP ───────► CEIC365752057 GDP: Construction (n73, P3M)
│   ├── D4c domestic car sales ─────► aIDCARYAR Domestic vehicle sales, cars YoY (P1M)
│   └── D4d domestic GDP backdrop ──► id_gdp_real_q = aIDGDPAR1 (P3M)        [WIRED via STD]
└── D5 Global steel / metals risk appetite
    ├── D5a US HRC price ───────────► steel_hrc = NYMEX:HRC1! (wk=800)       [WIRED]
    ├── D5b global steel equity ────► AMEX:SLX Steel ETF (wk=800)
    └── D5c base-metals beta ───────► AMEX:XME (wk=800) / COMEX:HG1! copper (wk=800)
```

**Leaves:**

- `aCNCNVRGRM` **China steel price index, rebar** (P1M) · **demand +1** · **LEAD ~1–2m** ·
  *the most direct China-steel price in the store* — it sets the import-parity ceiling for
  IDX rebar/long product. CEIC monthly, pub-lagged (~3–5w) + engine `.shift(1)` → **leading-
  to-coincident**; the cleanest direct steel-price signal we have. **Forecast candidate
  (the headline China leaf to add).**
- `aCNPPIAR` (China PPI YoY, P1M) · **demand +1** · **LEAD ~1m** · metals-heavy PPI proxies
  China steel pricing power / restock impulse. *Monthly.* **WIRED** (`cn_ppi_idx`) — keep.
- `600019.SS` **Baoshan Iron & Steel (Baosteel)** equity (wk=783) · **demand +1** ·
  **LEAD 0–1m** · China's largest listed steelmaker — a **liquid, leading, price-discovery
  proxy** for the China steel cycle that the slow CEIC prints lag. Exogenous to the IDX
  basket (Shanghai listing). **Forecast candidate (the liquid China leaf to add).**
- `NSE:CNXMETAL` NIFTY Metal (wk=773) / `AMEX:XME` (wk=800) · **demand +1** · **LEAD 0–1m** ·
  Asian / global steel-&-metals equity baskets — co-move with the same China-metals cycle;
  liquid weekly cross-checks for the China leg. **Forecast candidates.**
- `aCNCNBFWHM` / `aCNPDCRDS` **China crude-steel production** (P1M) · **demand +1** ·
  **LEAD ~0–1m** · output pulse; rising Chinese output is two-sided (more supply = flood
  risk **but** is driven by demand restock) — prior +1 (restock-led), let the engine
  reconcile. *Monthly, pub-lagged → coincident.* Attribution-leaning.
- `aCNIP` (China IP YoY, P1M) · **demand +1** · **LEAD ~1–2m** · industrial throughput →
  steel offtake. **WIRED** (`cn_ip_yoy`) — keep, it is part of the earned skill.
- `aCNPMIMT` (China mfg PMI, P1M) · **demand +1** · **LEAD ~1–3m** · turns before mill
  output and before realised steel price. **WIRED** (`cn_pmi_mfg`) — keep.
- `aCNHPIAR` (China new-house-price YoY, P1M) · **demand +1** · **LEAD ~2–4m** · China
  property is ≈55% of Chinese steel demand; the property cycle leads steel restock.
  *Monthly.* **Forecast candidate (deeper China demand root).**
- `CEICI323786202` **Import value: Iron & Steel** (USD mn, **n172, P1M**) · **demand +1
  (override — see §9)** · **LAG ~ −1m** · steel imports ≈ **domestic apparent consumption**
  not met by local mills → a demand gauge. *Pub-lagged + `.shift(1)` → lagging → attribution.*
- `CEIC365752057` **GDP: Construction** (**n73, P3M**) · **demand +1** · **coincident** ·
  domestic construction is the core long-product demand. *Quarterly, lagged → attribution.*
- `aIDCARYAR` Domestic vehicle sales, cars YoY (P1M) · **demand +1** · **LEAD ~0–1m** ·
  auto sheet (CRC/galv → BAJA/NIKL/ISSP) demand. *Monthly.* Coincident.
- `NYMEX:HRC1!` **US HRC steel** (wk=800) · **demand +1** · **LEAD 0–1m** · global flat-
  steel price beta; the wired revenue proxy. *Weekly, real-time.* **WIRED** — keep. (US HRC
  is a *global* beta, not the China-specific price; pair it with `aCNCNVRGRM`/`600019.SS`.)
- `AMEX:SLX` Steel ETF (wk=800) · **demand +1** · **LEAD 0–1m** · global steel-producer
  equity basket — leading price discovery for the whole complex. **Forecast candidate.**

> **Demand-side forecast hypothesis:** the *leading* demand branch is the **China steel
> cycle expressed as a price** — `aCNCNVRGRM` (rebar index) + `600019.SS` (Baosteel) +
> the liquid `SLX/XME/CNXMETAL` equities — plus the already-wired China macro aggregates
> (`aCNIP/aCNPPIAR/aCNPMIMT`) that **earn the current +0.144**. The CEIC domestic import/
> construction prints are **coincident/lagging attribution**, not forecasters.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (the margin = product − ore − coking coal − scrap − energy − USD feed)
├── S1 Iron ore — #1 input cost  (UNOBSERVED in-store; proxy via miner equities)
│   ├── S1a iron-ore future ────────► iron_ore = SGX:FEF1! (wk=0 EMPTY) ✗  /  DCE:I1! (wk=0 EMPTY) ✗
│   └── S1b iron-ore miner equity ──► FMG.AX Fortescue (wk=801) · cost −1  [PROXY]
│            cross-check ───────────► RIO.AX / BHP.AX / NYSE:VALE (wk=800–801)
├── S2 Coking coal / reductant cost  (UNOBSERVED; weak thermal proxy)
│   ├── S2a coking-coal future ─────► SGX:FFX1! (wk=0 EMPTY) ✗
│   └── S2b thermal-coal proxy ─────► wb_coal_au = ICEEUR:ATR1! API2 (wk=782) · cost −1  [WEAK PROXY]
├── S3 Scrap (EAF mini-mills BTON/JKSW)  ─► NO scrap price anywhere in market.json ✗ (gap)
├── S4 Energy / conversion cost
│   ├── S4a electricity/gas (re-heat, EAF) ─► (CEIC ID Electricity tariff, P1M — §6)
│   └── S4b crude (energy complex) ────────► brent = ICEEUR:BRN1! / wti = NYMEX:CL1! · cost −1
├── S5 China iron-ore demand (supply-side of the global ore market)
│   └── S5a China iron-ore imports ─► aCNIMPFEOC (Imports, iron ore & concentrate, P1M) · cost −1*
└── S6 China supply flood / export pressure  (the bear case for domestic price)
    └── S6a China steel-product exports ─► (cn steel-export block, P1M — §6) · supply −1
```
*S5a sign note: more China ore imports → higher ore cost (−1 on margin) **and** signals
strong China mill activity (+1 on the price ceiling) — genuinely two-sided; prior 0/leave
to the engine.

**Leaves:**

- **Iron ore (S1) — the dominant cost is unobserved.** `iron_ore → SGX:FEF1!` and `DCE:I1!`
  are **both EMPTY (wk=0)**. The single tradable, deep-history proxy is a **pure-play
  iron-ore miner equity**:
  - `FMG.AX` **Fortescue Metals** (wk=801) · **cost −1** · **LEAD 0–1m** · ~pure iron-ore
    revenue → its equity is the tightest listed iron-ore-price beta available. *A rise in
    FMG ≈ a rise in the ore cost that compresses integrated-mill margins → −1.* **Best
    available iron-ore proxy.** Cross-check with `RIO.AX`/`BHP.AX`/`NYSE:VALE` (diversified).
  - *Caveat to honour:* a miner equity carries its own market beta; it is a far better
    signal than the empty FEF (`None`-equivalent), but tag the variance contamination.
- **Coking coal (S2) — also unobserved.** `SGX:FFX1!` = **EMPTY (wk=0)**; no met-coal/
  scrap/pig-iron tradable exists. The only coal price is **`ICEEUR:ATR1!` API2 thermal**
  (wk=782, **WIRED** as `wb_coal_au`, cost −1). **Flag: thermal ≠ coking** — API2 and
  premium hard coking coal co-move only loosely; this is a *weak* proxy and should be
  treated as a low-confidence cost leaf, not a clean coking-coal signal.
- **Scrap (S3) — no series at all.** EAF mini-mills (BTON, JKSW, LMSH) run on scrap; there
  is **no scrap price in the store** → that cost is **unobservable**. Honest gap.
- **Energy (S4):** `ICEEUR:BRN1!`/`NYMEX:CL1!` (crude, wk=800) · cost −1 · energy-complex
  co-move; domestic electricity tariff (CEIC ID, monthly) is discoverable for re-heat/EAF
  power but is administered/sticky → weak.
- **China ore imports (S5):** `aCNIMPFEOC` (P1M) · two-sided (see note) → prior 0.
- **China steel exports (S6) — the flood gauge:** rising Chinese steel **exports** depress
  the regional import-parity price (the structural bear case for IDX domestic margins) →
  **supply −1**. Discoverable in the cn steel-export block (§6); currently un-wired.

> **Supply-side forecast hypothesis:** the *forecastable* cost branch is the **iron-ore-
> miner equity proxy (`FMG.AX`)** — liquid, leading, and the single biggest cost — which
> is entirely missing today (FEF empty). Coking coal and scrap are **genuine data gaps**
> (only a weak thermal-coal proxy); treat them as low-confidence. The **China-export flood
> gauge** is the supply-side mirror of the demand channel and should be tested as a −1.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 imported-feed cost (USD) ──► usdidr = FX_IDC:USDIDR · macro −1   [WIRED]
├── M2 broad USD / EM flow ──────► dxy = TVC:DXY (wk=800) · macro −1    [WIRED but → BBDXY EMPTY = BUG]
├── M3 China cyclical pulse ─────► cn_pmi_mfg / cn_ip_yoy / cn_ppi (shared with D1/D2) [WIRED]
├── M4 China FX (steel-trade) ───► usdcny = FX_IDC:USDCNY (wk=801) · macro −1
├── M5 construction-demand rate ─► id_10y = TVC:ID10Y (wk=798) · macro −1  [WIRED]
└── M6 policy rate / financing ──► id_bi_rate = ECONOMICS:IDINTR · macro −1 [WIRED via STD]
```

- `usdidr` (`FX_IDC:USDIDR`, wk=801) · **macro −1** · **LEAD 0–1m** · this basket is
  **import-feed-heavy** (slab/HRC/scrap/DRI-gas) → IDR weakness **raises** cost → −1
  (note: the *opposite* sign to the exporter metals baskets). *Weekly, real-time.* **WIRED**
  — keep. **Forecast candidate.**
- `dxy` · **macro −1** · **LEAD 0–1m** · broad USD strength pressures EM flows and the
  USD-priced metals complex. **WIRED, BUT the resolver `dxy → TVC:BBDXY` is EMPTY (wk=0)**
  → the branch is **silently dead**. **Fix: repoint to `TVC:DXY` (wk=800).** **Forecast
  candidate once fixed.**
- `usdcny` (`FX_IDC:USDCNY`, wk=801) · **macro −1** · CNY weakness cheapens Chinese steel
  exports → more import pressure on IDX domestic price → −1. *Weekly.* **Forecast candidate
  (a clean, China-specific FX leaf — adds to the China channel).**
- `cn_pmi_mfg` / `cn_ip_yoy` / `cn_ppi_idx` — shared with the demand tree; the leading
  macro that **carries the current skill**. Keep all three.
- `id_10y` (`TVC:ID10Y`, wk=798) · **macro −1** · construction/property demand is rate-
  elastic; higher yields slow the domestic steel-demand backdrop. *Weekly.* **WIRED** — keep.
- `id_bi_rate` (`ECONOMICS:IDINTR`) · **macro −1** · policy-rate / financing channel.
  **WIRED via STD_MACRO** (sign 0 default) — fine.

---

## 6. Cross-industry linkages (series borrowed from other categories)

- **China steel/metals block (`cn.json`)** — the heart of this basket's edge; borrowed as
  the *demand price-setter*. High-value, mostly un-wired:
  - `aCNCNVRGRM` — **China steel price index, rebar** (P1M, Consumer Prices/Indices) — the
    direct China-steel price. **Highest-priority China add.**
  - `aCNCNBFWHM` / `aCNPDCRDS` — **China crude-steel production** (P1M, Industrial
    Production). `aCNPDPIGI` pig-iron production. `aCNCNCOSM` key-enterprise crude-steel.
  - `aCNIMPFEOC` — China **iron-ore imports** (P1M); `aCNIMPINS`/`aCNIMPSTL` China steel-
    product imports (Chinese domestic shortfall = price-supportive).
  - **China steel EXPORTS** (cn Imports & Exports block) — the **flood gauge** (supply −1);
    rising Chinese exports cap regional/Indonesian price.
  - `aCNHPIAR` China house-price YoY + the **cn FAI / property-investment block** — the
    ≈55%-of-demand construction root that leads steel restock.
  *These resolve via the China-macro path if a `GLOBAL_CORR` key is added; they are
  monthly CEIC prints (slower than the liquid `600019.SS`/`SLX` equities) but are the
  direct steel-specific China series — list both so the quant can choose the leading
  (equity) vs the direct-but-slower (CEIC) form.*
- **Energy block (Coal / Crude Oil)** — already borrowed: API2 `ICEEUR:ATR1!` (coking
  proxy), Brent/WTI (energy). The **ID Electricity** tariff block (CEIC, P1M) is the EAF/
  re-heat power cost — discoverable, weak (administered).
- **Iron-ore "miners" (global equities, `market.json`)** — `FMG.AX`/`RIO.AX`/`BHP.AX`/
  `NYSE:VALE` borrowed as the **iron-ore-price proxy** (FEF empty). These belong to no
  IDX sub-industry but are this basket's #1 cost.
- **Banking block (`id.json`)** — `CEIC230931402` Working-Capital Credit / `CEIC230932202`
  Investment Credit (P1M, n279) as the domestic construction-financing demand root
  (slow, attribution).
- **Auto/Industrials** — `aIDCARYAR` domestic car sales (auto-sheet demand for BAJA/NIKL/
  ISSP); `CEIC323568702` IPI motor vehicles (P1M, n180).

---

## 7. Currently-wired vs available

**Wired now** (`mapping.py` `SEED["Metals"]`, kept-6 in the backtest):

| driver | role/sign | status | issue |
|---|---|---|---|
| `steel_hrc` (`NYMEX:HRC1!`) | supply +1 | **live (wk=800)** | good — global flat-steel revenue proxy (but *global*, not China-specific) |
| `iron_ore` (`SGX:FEF1!`) | cost −1 | **DEAD (wk=0 EMPTY)** | the #1 cost scores nothing; backup `DCE:I1!` also empty |
| `wb_coal_au` (`ICEEUR:ATR1!`) | cost −1 | live (wk=782) | **weak** — API2 thermal ≠ coking coal |
| `usdidr` | macro −1 | live | correct sign (importer) — keep |
| `cn_ppi_idx` (`aCNPPIAR`) | demand +1 | live | **part of the earned skill** — keep |
| `id_10y` (`TVC:ID10Y`) | macro −1 | live | construction-rate sensitivity — keep |
| `id_gdp_real_q` (`aIDGDPAR1`) | demand +1 | live (via STD) | domestic construction backdrop |
| `ceic: Steel + Basic Metals Mfg` | mixed | live | mostly P1M trade value/volume (lagging) + P1Y mfg (sign 0) |

> Note: the seed lists `steel_hrc/iron_ore/wb_coal_au` + 4 macro; the backtest keeps **6**
> after the data-quality/significance gates — `iron_ore` (dead) is among those that drop
> to noise, so the **functioning** kept set is HRC + coal-proxy + usdidr + cn_ppi + id_10y
> + gdp. The skill is therefore carried mainly by **HRC (global steel price) + cn_ppi
> (China cycle) + the macro overlay** — confirming the thesis that the China/steel-price
> channel is the engine of the +0.144.

**Available but NOT wired (prioritised — the "what we COULD add"):**

| priority | add | role/sign | why | forecast? |
|---|---|---|---|---|
| **P0** | **`FMG.AX` (new `iron_ore_px`)** | cost −1 | **fixes the #1-cost gap** — FEF empty; liquid leading ore beta | **yes** |
| **P0** | **`aCNCNVRGRM` (China rebar price idx)** | demand +1 | **direct China-steel price** — the import-parity ceiling (skill root) | **yes** |
| **P0** | **fix `dxy → TVC:DXY`** | macro −1 | the wired `dxy → TVC:BBDXY` is EMPTY → branch silently dead | **yes** |
| **P1** | **`600019.SS` Baosteel (new `cn_steel_px`)** | demand +1 | liquid, leading China-steel equity — deepens the China channel | **yes** |
| P1 | `AMEX:SLX` Steel ETF | demand +1 | global steel-producer equity — leading price discovery | yes |
| P1 | `usdcny` (`FX_IDC:USDCNY`) | macro −1 | CNY weakness → cheaper China steel exports → import pressure | yes |
| P2 | `aCNCNBFWHM`/`aCNPDCRDS` China crude-steel prod | demand +1 | China output/restock pulse (steel-specific) | partial |
| P2 | China steel-**export** series (flood gauge) | supply −1 | rising China exports cap domestic price | partial |
| P2 | `aCNHPIAR` China house-price YoY | demand +1 | China property = 55% of China steel demand (deeper root) | yes |
| P3 | `CEICI323786202` Import value: Iron & Steel | demand +1 (override) | domestic apparent consumption (lagging) | no |
| P3 | `CEIC365752057` GDP: Construction / `aIDCARYAR` | demand +1 | domestic construction/auto demand (lagging) | no |
| — | (TBMS copper sleeve) `COMEX:HG1!` | demand +1 | copper-rod beta — but ADDS NOISE to a steel basket; **leave out / see §8** | n/a |

**Current bugs called out:**
1. **`iron_ore → SGX:FEF1!` is EMPTY (wk=0)** and the backup `DCE:I1!` is also empty — the
   **#1 cost driver is dead**. Replace with `FMG.AX` (or RIO/BHP/VALE).
2. **`dxy → TVC:BBDXY` is EMPTY (wk=0)** — the USD branch is silently dead store-wide.
   Repoint to `TVC:DXY` (wk=800). *(Affects every basket that uses `dxy`, not just this one.)*
3. **`wb_coal_au` (API2 thermal) is a weak proxy for coking coal** (`SGX:FFX1!` empty) —
   low-confidence cost leaf, not a clean met-coal signal.
4. **No scrap price exists** in the store — EAF mini-mill (BTON/JKSW/LMSH) cost is
   unobservable; honest gap.
5. The China channel is wired only via broad aggregates — the **direct China-steel price**
   (`aCNCNVRGRM`) and a **liquid China-steel equity** (`600019.SS`) are missing.

---

## 8. Forecastability

**What the OOS backtest says:** fwd IC **+0.144** (in-sample +0.14), n_oos 129, placebo
pctile **0.97** → **SKILL** (one of 12). But **hit−up = +0.01**: the direction barely
beats a coin flip. So the skill is in **magnitude / cross-sectional ranking**, not in
calling up vs down — the basket sizes China-cycle moves well but the converter-vs-mill
sign-cancellation (§2) blunts the directional bet. **Implication: deepen the *price*
channel that drives magnitude, and reduce the cross-current that kills direction.**

**Which branches LEAD, and why:**
- **LEAD (forecast candidates):** the **China steel cycle as a price** — `aCNCNVRGRM`
  (rebar index, leads domestic price by import parity), `600019.SS`/`SLX`/`XME`/`CNXMETAL`
  (liquid steel equities, real-time price discovery), `aCNIP/aCNPPIAR/aCNPMIMT` (the wired
  China macro that already earns the skill) — plus **`FMG.AX`** (iron-ore cost), **`HRC`**
  (global steel price), **`usdidr`/`TVC:DXY`/`usdcny`** (real-time FX). All exogenous,
  liquid, *price* series → the class the backtest rewards.
- **LAG (attribution only):** every CEIC steel trade/production/construction **quantity**
  row — publication-lagged *and* `.shift(1)`-ed by the engine; the P1Y mfg/energy rows are
  too coarse to forecast. Good for explaining a move after the fact, not for calling it.

**Why the China channel forecasts (mechanism).** China is the marginal ~1Bt/yr steel
producer; Indonesian HRC/rebar prices clear at **import parity** to landed Chinese steel,
and Indonesia is a **net steel importer**. So the Chinese price/cycle is **upstream** of
the Indonesian price in the causal chain, and it moves in **liquid, observable markets
(rebar index, Baosteel equity) weeks before** the lagged domestic prints and the IDX
steelmakers' earnings. That structural lead is the engine of the +0.144, and it is the
one channel we must not break.

**Contemporaneous vs forward.** The basket explains returns strongly in-sample (steel beta
is real) but, unusually for the broken baskets, it **also** forecasts — because its key
driver lives **abroad and upstream** (China), giving a genuine lead rather than a same-month
co-movement. The improvement is to convert more of the *contemporaneous* China explanation
into *forward* skill by adding the **leading China price proxies** (rebar index + Baosteel).

**What would move it from SKILL → stronger SKILL (and fix direction):**
1. **Wire the direct China-steel price** (`aCNCNVRGRM`) and a **liquid China-steel equity**
   (`600019.SS`) — deepen the exact channel that earns the IC, and add a *leading price*
   that should lift **hit−up** (directional accuracy), not just magnitude.
2. **Fix the two dead branches** (`iron_ore → FMG.AX`, `dxy → TVC:DXY`) so the **metal
   spread** (steel price − ore cost) is actually modelled — the margin, not just the price.
3. **Add `usdcny` −1 and a China-export flood gauge −1** — the supply-side mirror of the
   demand channel; these should sharpen the bear-case direction.
4. **Contain the non-steel sleeves.** TBMS (copper) and ALKA/INAI (aluminium) load on
   *different* metals; adding `copper`/`aluminum` as +1 leaves would chase ~16% of the
   basket at the cost of **diluting the steel/China priors that earn the skill**.
   **Recommendation: do NOT add copper/aluminium drivers** — keep the basket a clean steel/
   China bet and accept the small non-steel tracking error. (The real fix — carving TBMS
   into a copper basket — is a worklist change, out of scope here; flag it.)

**Honest concession.** The basket is a genuine forecaster, but a **fragile-direction** one:
the conversion-spread sign-cancellation (re-rollers short HRC that integrated mills are long)
caps how directional it can be while the membership stays mixed. Wiring the China price
harder is the highest-confidence improvement; the cleanest structural fix (separate
integrated-mill vs converter, and split off copper TBMS) needs a worklist change, not a
mapping edit.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

> Read-only on `mapping.py` for this task — this is the spec the quant implements,
> then **re-runs `backtest/bt.py "Metals"` and keeps each change only if forward IC
> holds/improves** (never an in-sample-only lift — this basket already has SKILL to protect).

**(a) New / fixed resolvers in `GLOBAL_CORR`:**

```python
# iron ore has no working future in-store (SGX:FEF1! and DCE:I1! are both wk=0 EMPTY).
# Use a liquid, deep-weekly pure-play iron-ore miner equity as the price proxy.
"iron_ore_px": "FMG.AX",        # wk=801, Fortescue — tightest listed iron-ore beta
"iron_ore_px_alt": "RIO.AX",    # wk=801, Rio Tinto (diversified backup / composite)
# direct China-steel channel (the source of skill — deepen it):
"cn_steel_px":  "600019.SS",    # wk=783, Baosteel — liquid leading China-steel equity
"cn_rebar_idx": "aCNCNVRGRM",   # P1M, China steel price index (rebar) — direct China price
"steel_etf":    "AMEX:SLX",     # wk=800, global steel-producer equity (price discovery)
# BUG FIX (store-wide): dxy currently points at an EMPTY series.
"dxy": "TVC:DXY",               # was TVC:BBDXY (wk=0 EMPTY); TVC:DXY = wk=800
# (keep iron_ore -> SGX:FEF1! mapping but stop relying on it; it is dead)
```

**(b) Rebuild `SEED["Metals"]["globals"]`** (fix the dead cost leaf, deepen China price):

```python
"globals": [
    ("steel_hrc",    "supply", +1, "US HRC = global flat-steel revenue proxy (wk=800)"),
    ("steel_etf",    "demand", +1, "AMEX:SLX global steel-producer equity (leading)"),
    ("cn_steel_px",  "demand", +1, "Baosteel (600019.SS) — China steel cycle, the price-setter"),
    ("iron_ore_px",  "cost",   -1, "FMG.AX iron-ore proxy — #1 cost (FEF empty)"),
    ("wb_coal_au",   "cost",   -1, "API2 thermal = WEAK coking-coal proxy (FFX1! empty)"),
],
```

**(c) Rebuild `macro`** (add direct China price idx + China FX; fix dxy):

```python
"macro": [
    ("cn_rebar_idx", "demand", +1, "China rebar price index — direct import-parity ceiling"),
    ("cn_ppi_idx",   "demand", +1, "China PPI / steel cycle (part of earned skill)"),
    ("cn_pmi_mfg",   "demand", +1, "China mfg PMI — leads mill output"),
    ("cn_ip_yoy",    "demand", +1, "China industrial output → steel offtake"),
    ("usdidr",       "macro",  -1, "imported slab/HRC/scrap feedstock cost (importer)"),
    ("dxy",          "macro",  -1, "broad USD / EM-flow headwind (now TVC:DXY, not empty)"),
    ("usdcny",       "macro",  -1, "CNY weakness → cheaper China steel exports → import pressure"),
    ("id_10y",       "macro",  -1, "construction-demand rate sensitivity"),
    ("id_gdp_real_q","demand", +1, "domestic construction backdrop"),
],
```

**(d) `ceic` categories** — keep `[("Basic Materials", "Steel"), ("Industrials &
Manufacturing", "Basic Metals Manufacturing")]`. These supply the domestic trade/
production attribution rows (lagging).

**(e) `ceic_override`** — re-role the domestic trade rows so they read as demand, not as
sign-0 supply: add `("import value: iron and steel", "demand", +1)` (apparent consumption)
and `("export value: iron and steel", "supply", -1)` (a rise in domestic *export* effort
usually signals weak domestic offtake — let the engine reconcile). Keep them tagged as
lagging attribution.

**(f) `ceic_exclude`** — exclude **endogenous / non-causal** rows that mechanically co-move
with the basket's own output rather than forecast it (the P1Y "Basic Metals Manufacturing"
gross-output / value-added / establishment counts are the basket's own books):

```python
"ceic_exclude": ["value added", "gross output", "no. of establishments",
                 "number of establishments", "factor cost", "input cost"],
```

**(g) Falsifiable backtest plan** (`backtest/bt.py "Metals"` after `build_worklist.py` →
`controller.py --only`):
1. **Fix the two dead branches first** (`iron_ore_px = FMG.AX`, `dxy = TVC:DXY`), rerun OOS.
   **Hypothesis:** fwd IC **holds ≥ +0.144** and **hit−up rises above +0.01** (the metal
   spread is now modelled → better direction). *Confirm:* IC ≥ current AND placebo ≥0.90.
   *Falsify:* IC falls → FMG's equity-beta contamination outweighs the ore signal; fall
   back to the `RIO.AX` cross-check or demote `iron_ore_px` to a low weight.
2. **Add the direct China price leaves** (`cn_rebar_idx` + `cn_steel_px` Baosteel + `SLX`).
   **Hypothesis:** fwd IC rises (deepening the exact channel that earns the skill) and
   **hit−up improves** (a *leading* China price should call direction better than the
   lagged CEIC prints). *Confirm:* IC up AND hit−up up. *Falsify:* IC flat/down → the
   wired `aCNPPIAR/HRC` already capture the China signal and the new leaves are redundant
   noise → keep only `cn_rebar_idx`, drop the equities.
3. **Add `usdcny` −1 + the China-export flood gauge −1.** **Hypothesis:** small net
   positive, primarily on direction (the bear-case mirror). Drop if IC falls.
4. **Confirm the no-copper decision:** test adding `("copper","demand",+1)` for the TBMS
   sleeve. **Hypothesis:** IC **falls or holds flat** (chasing 13% of the basket dilutes
   the steel/China priors). If IC falls, that is the quantitative case to **escalate a
   worklist change** carving TBMS (copper) + ALKA/INAI (aluminium) out of the steel basket.
5. Keep any change **only if forward IC holds/improves with a more honest, China-deepened
   tree** (IMPROVEMENT_PLAN §6) — this basket has SKILL to protect, so the bar is "do no
   harm," not "lift in-sample."

---

### 4-line summary
- **Tree:** ~13 demand leaves (China rebar-price idx + Baosteel/SLX/XME equities + wired
  China IP/PPI/PMI + China crude-steel prod + China house price + HRC + domestic import/
  construction/auto) · ~7 supply/cost leaves (FMG iron-ore proxy + API2 coking-proxy +
  crude + China ore-imports + China-export flood gauge; scrap unobservable) · 7 macro
  leaves (usdidr/dxy/usdcny + China pulse + id_10y/bi_rate).
- **Key forecast hypothesis:** the basket's **+0.144 SKILL comes from the China steel
  cycle leading the IDX steel equities via import parity**; deepen it with the **direct
  China rebar price index (`aCNCNVRGRM`) + a liquid China-steel equity (`600019.SS`
  Baosteel)**, which should lift the weak **direction (hit−up +0.01)**, while wiring the
  **iron-ore proxy (`FMG.AX`)** finally models the margin (metal spread).
- **Data bugs found:** **`iron_ore → SGX:FEF1!` AND `DCE:I1!` are both EMPTY (wk=0)** — the
  #1 cost is dead; **`dxy → TVC:BBDXY` is EMPTY (wk=0)** store-wide (use `TVC:DXY`, wk=800);
  **coking coal `SGX:FFX1!` empty** (only a weak API2 thermal proxy) and **no scrap price
  exists** → EAF mini-mill cost unobservable.
- **Structure call:** the basket mixes **integrated mills (long HRC), converters (short
  HRC feed), copper (TBMS) and aluminium (ALKA/INAI)** — the conversion-spread cancellation
  caps direction; **do NOT add copper/aluminium drivers** (they dilute the China/steel
  priors that earn the skill), and flag a **worklist split** of TBMS-copper as the real fix.
