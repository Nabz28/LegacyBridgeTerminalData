# Paper (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Mid-cap
> (**88 T**, #23 by mcap), currently **needs_review / no forward skill**. All series
> cited exist in `catalog/{idind,id,cn,market}.json`; RICs + n_obs are real and quoted.
> **Central caveat up front: the variable that actually sets this basket's revenue —
> the BHKP/NBSK market-pulp price and the containerboard/kraft selling price — does not
> exist as a clean spot series anywhere in `market.json`. This file is as much about
> *how to proxy the missing pulp/paper price* (CEIC trade value÷volume + US paper-
> producer equities + China pulp imports) as about wiring what we already hold.**

---

## 1. Snapshot — and the "DBC is not pulp" gap

| field | value |
|---|---|
| basket | **Paper**, sector Basic Materials, id `basic_materials_paper`, benchmark JCI |
| mcap | **88 T** (#23 of 52; **~91% concentrated in three names** INKP+TKIM+FASW) |
| members (12) | **INKP** (Indah Kiat Pulp & Paper — Sinarmas/APP; integrated BHKP pulp + paper + tissue + packaging, USD exporter; **~50% of basket cap**), **TKIM** (Pabrik Kertas Tjiwi Kimia — Sinarmas/APP; cut-size/writing paper + stationery, USD exporter; **~21%**), **FASW** (Fajar Surya Wisesa — recycled containerboard/corrugated medium for boxes, domestic OCC-fed; **~20%**), **IFII** (Indonesia Fibreboard — MDF/wood panel), **ALDO** (Alkindo Naratama — converted paper/packaging), **SPMA** (Suparma — paper/tissue), **INRU** (Toba Pulp Lestari — dissolving/market pulp, North Sumatra), **KDSI** (Kedawung — tinplate + stationery), **SULI** (SLJ Global — plywood/wood), **KBRI** (Kertas Basuki Rachmat — distressed), **TIRT** (Tirta Mahakam — plywood, high-beta 1.69), **SWAT** (tiny) |
| current grade | **needs_review** |
| current kept drivers | **6** |
| **current forward OOS skill** | **fwd IC −0.09 · contemporaneous IC −0.00 · placebo pctile 0.45 · flag `none`** (n_oos 129) |

**The gap, precisely.** The basket is ~91% **INKP + TKIM + FASW** — i.e. two
**Sinarmas/APP integrated pulp-and-paper exporters** plus one **recycled-fibre
containerboard** maker. Their earnings are a **price × volume − fibre − energy**
identity where the swing factor is the **regional pulp/paper price** (BHKP hardwood
pulp, NBSK softwood pulp, and CFR-China containerboard/kraft). The current seed (§7)
keys this basket on:
- **`wb_logs` (`CME:LBR1!`, cost −1)** — North-American framing-**lumber** futures
  (only **196 weekly obs**, thin). Lumber is sawn construction timber; it is **not**
  market pulp and **not** the acacia/eucalyptus pulpwood APP grows in Sumatra/Kalimantan.
  Lumber and pulp prices decouple routinely (lumber is housing-cyclical, pulp is
  paper/packaging-cyclical). This is a weak, wrong-commodity cost leg.
- **`bcom` (`AMEX:DBC`, supply +1) labelled "pulp/paper price proxy"** — `DBC` is an
  **energy-heavy broad-commodity ETF (WTI/Brent/gasoline/heating-oil dominate, plus
  metals/grains)**; it contains **zero pulp or paper weight**. Using it as the
  "pulp/paper price" is the **central mis-key**: when oil rips, DBC rips, the engine
  reads it as "paper price up → basket up (+1)", but oil up is actually an **energy-cost
  headwind** for a paper mill — so the sign is backwards in exactly the regimes that
  matter. This single mislabel plausibly accounts for the **−0.09 forward IC** (the
  posture is actively anti-correlated out-of-sample).
- **`wb_coal_au` (API2, cost −1)** — *correct*: thermal coal/biomass fires the recovery
  boilers and dryers; ~10–20% of cash cost. Keep.
- **`usdidr` (macro +1)** — *correct direction*: INKP/TKIM sell USD-linked pulp/paper
  and book a translation/realisation gain when IDR weakens. Keep, but see M1 (USD debt
  partly offsets).
- **`cn_ip_yoy` (`aCNIP`, demand +1)** — valid but generic regional-activity proxy.
- **`ceic ("Industrials & Manufacturing","Paper & Pulp")`** — the matched block, but it
  is **almost entirely annual establishment/output series (n14–18)** — too short/slow to
  carry a signal. The **richer monthly trade block lives under a *different* CEIC
  category** (`Basic Materials / Pulp & Paper`, the n172 export/import series) that the
  current seed **does not pull at all**.

**Why forward-flat-to-negative.** (a) The "price" driver (`bcom`) is really an oil
proxy with the wrong sign; (b) the "cost" driver (`wb_logs`) is the wrong commodity and
thin; (c) the genuinely on-theme **monthly pulp/paper trade-value series (n172)** that
embed the basket's own USD revenue and fibre cost are **unwired**; (d) there is **no
leading price series** keyed at all, so nothing can forecast. Fixing this basket =
**delete the DBC/lumber mis-keys, wire the CEIC Basic-Materials trade block (export
value = revenue proxy, import value÷volume = implied pulp price), and add a *leading*
forward signal from US paper-producer equities + China pulp imports.**

---

## 2. Economic structure — how this basket makes money

The dominant economics are **INKP/TKIM (integrated virgin-fibre, USD export)** and
**FASW (recycled-fibre, domestic box)** — two related but distinct margin engines:

```
INKP/TKIM (integrated, USD exporter):
  EBITDA ≈ [ P(pulp,BHKP/NBSK) + P(paper/board) ]×volume
            − Cost(wood/fibre) − Cost(energy: coal/gas/biomass) − Cost(chemicals) − conversion
          └──────────────── THE PULP/PAPER PRICE is the swing factor ───────────────┘
  Revenue mostly USD/CFR-linked → +USD/IDR.  Carries USD debt → −USD/IDR on the balance sheet.

FASW (recycled containerboard, domestic):
  EBITDA ≈ P(containerboard/box)×volume − Cost(OCC recovered paper) − Cost(energy) − conversion
          └─ box demand = e-commerce + FMCG volume ─┘   └─ OCC (old corrugated cardboard) = main input ─┘
```

- **INKP is the franchise.** It is one of the largest integrated pulp-and-paper
  producers in Asia: grows **acacia/eucalyptus**, makes **BHKP bleached hardwood market
  pulp**, then **uncoated/coated woodfree paper, tissue, and packaging**, and exports a
  large share (USD-priced, CFR China/SE-Asia). Its cost stack is **~40–55% wood/fibre,
  ~10–20% energy, chemicals + conversion** — so the margin swing is the **pulp-price-
  minus-wood-cost spread** and the **paper-price-minus-pulp-cost spread**.
- **TKIM** is paper-led (cut-size A4, writing/printing, stationery) — a **buyer of pulp
  relative to INKP**, so it is *longer the paper price and shorter the pulp price*; a
  rising pulp price helps INKP's pulp sleeve but squeezes TKIM's paper margin. Within
  one APP group the two partly hedge each other on the pulp leg.
- **FASW is a different animal: recycled, not virgin.** Its input is **OCC (old
  corrugated cardboard / recovered paper)**, *not* market pulp; its output is
  **containerboard/corrugated medium** sold to **box converters → FMCG and e-commerce**.
  So FASW's margin = **containerboard price − OCC cost**, and its demand is **box
  volume (e-commerce + consumer goods)** — China's recovered-paper import ban (2017–20)
  and OCC scarcity are FASW-specific cost shocks.
- **The China cycle sets the regional price for ALL of them.** Asian BHKP, NBSK,
  containerboard and kraft prices are effectively **CFR China**; China is the marginal
  buyer of market pulp and the price-setter. **China paper-making output, pulp imports,
  and the China PPI** are the cleanest regional-price reads available — far more relevant
  than a broad commodity ETF.

**Intra-basket dispersion.** Cap-weighting makes the basket ≈ **INKP (virgin pulp+paper,
USD) + TKIM (paper, USD) + FASW (recycled board, domestic box)**. The tail (IFII/SULI/
TIRT = wood-panel/plywood; KDSI = tinplate+stationery; INRU = dissolving pulp; KBRI/SWAT
distressed) is **<10% of cap** and driven by domestic construction (panels) and
idiosyncratics. So the seed must be built for **(virgin pulp/paper price, USD) + (box
demand, OCC cost)**; the panel/plywood names are real but immaterial at basket level.

**What a sell-side analyst actually watches:** **BHKP & NBSK market-pulp price ($/t,
CFR China), containerboard/testliner & kraftliner price, the implied paper-minus-pulp
spread, OCC price (for FASW), China operating rates and paper output, China pulp-import
volume, USD/IDR (USD revenue vs USD debt), coal/biomass energy cost, and net debt/EBITDA
(INKP/TKIM are levered USD borrowers).** **None of the pulp/board *prices* exist in
`market.json`** — that is the data gap §7b proxies.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's *excess* return for a
> *rise* in the driver. `lead` = expected months the driver moves *before* the equities.
> Liquid exogenous price/equity series → forecast candidates; CEIC quantity/value prints
> are publication-lagged → attribution. ⚠ marks the missing-pulp-price proxies.

### D1 — Regional pulp/paper PRICE & the China paper cycle (the product-price leg)
```
PRODUCT-PRICE / CYCLE demand
├─ D1a US paper-producer EQUITIES ⚠ ─► [IP International Paper, wk800]   sign +1 · lead 0–1m · PULP/BOARD-MARGIN PROXY (FORECAST)
│      (the missing pulp/board price)  [PKG Packaging Corp, wk800] · [WY Weyerhaeuser timber-REIT, wk800]  sign +1 · lead 0–1m
├─ D1b China paper output (demand) ──► [aCNVAPAPZR CN Paper-Making & Products output YoY, P1M]  sign +1 · lead 0–1m · attribution
│                                      [aCNPBIPMPP CN Paper-Making production YoY, P1M]          sign +1 · lead 0–1m
├─ D1c China pulp imports (price-ish)► [aCNIMPPULP CN Imports: Pulp, P1M]        sign +1 · lead 0–1m · marginal-buyer pull ⚠ implied px
│      (China = marginal pulp buyer)   [aCNCNJGOLM CN Imports HS47 wood pulp, P1M]  sign +1 · lead 0–1m
├─ D1d China demand pulse ───────────► [aCNPMIMT CN Mfg PMI, P1M]   sign +1 · lead 1–2m · attribution
│                                      [aCNIP CN IP YoY, P1M]       sign +1 · lead 1–2m  (currently wired as cn_ip_yoy)
└─ D1e own export REVENUE (price×vol)─► [CEICI323977202 Exports: Paper, Paperboard & Mfd, USD mn, n172]  sign +1 · lead 0m · revenue proxy
                                        [CEICI323974902 Exports: Pulp & Waste Paper, USD mn, n172]        sign +1 · lead 0m · INKP pulp revenue
```
- **D1a is the single most important branch and the missing-price workaround.** We have
  **no BHKP, no NBSK, no containerboard, no kraftliner price** anywhere in the store.
  But we **do** hold, with **800 weeks of liquid weekly history**, the equities of
  **US pure-play paper/packaging/timber producers** whose P&L *is* the pulp-and-board
  margin: **`IP` (International Paper — containerboard/box giant)**, **`PKG` (Packaging
  Corp of America — containerboard)**, **`WY` (Weyerhaeuser — timber/wood-fibre REIT)**,
  with **`SLGN`/`LPX`/`BCC`** as corroborants. A blend of these is a **traded proxy for
  the pulp/containerboard margin INKP/FASW earn.** It is liquid, daily, and *leads* IDX
  paper (global pulp/board price discovery happens in the US/EU/China before Jakarta
  reprices). *Caveat (honest):* they are **US equities** → they import a global-equity-
  beta and a US-housing-cycle component (esp. WY), and they are **partly circular**
  against an IDX equity basket. Mitigate by (a) blending 2–3 names, (b) keeping weight
  moderate, (c) treating it as the **forward signal**, not gospel. This is the direct
  analogue of the Chemicals basket's foreign-cracker-equity workaround and the Mining
  basket's CEIC-export-value stand-in for a missing price.
- **D1b/D1c mechanism.** Asian pulp/board prices are set **CFR China**. **China paper
  output (`aCNVAPAPZR`)** and **China pulp imports (`aCNIMPPULP`, `aCNCNJGOLM` HS47)** are
  the cleanest in-store reads of regional offtake and the marginal-buyer pull that sets
  the pulp price. **`aCNIMPPULP` value÷volume even backs out an implied pulp $/t** — the
  in-store stand-in for the missing BHKP spot. Monthly, publication-lagged → attribution,
  but exactly on-mechanism. (Data note: these `aCN…` paper series exist by ric in
  `cn.json` but the catalog does not store n_obs; the build must confirm depth — see §9.)
- **D1d.** China PMI/IP = the demand pulse; `aCNIP` is the only China driver currently
  wired and should stay, joined by `aCNPMIMT`.
- **D1e — the basket's OWN revenue, monthly.** `CEICI323977202` (Exports: Paper &
  Paperboard, USD mn, **n172**) and `CEICI323974902` (Exports: Pulp & Waste Paper, USD mn,
  **n172**) are the **national paper/pulp export *value* = price×volume** — i.e. a direct
  monthly read of INKP/TKIM's USD revenue line. Publication-lagged → **attribution**, but
  the single most on-topic series the current seed ignores. (Exclude from any "predict
  the basket" use: it is near-coincident with the basket's own fundamentals, so it is an
  explainer, not a forecaster — see §8.)

### D2 — Box / packaging volume demand (FASW + ALDO converters)
```
PACKAGING-VOLUME demand
├─ D2a e-commerce box pull ──────────► [aCNRSONLNR CN Online retail sales YoY, P1M]  sign +1 · lead 1–2m · corrugated box demand (regional)
├─ D2b FMCG / domestic activity ─────► [aIDGDPAR1 ID GDP YoY] · [aIDRSLSAR Retail Sales]  sign +1 · lead 1–3m · box/FMCG packaging offtake
├─ D2c domestic paper throughput ────► [CEICI323565302 Mfg: Paper & Paper Products IPI, 2010=100, P3M, n60]  sign +1 · lead 0m · own-volume (attribution)
└─ D2d China corrugated/kraft trade ─► [aCNCNJYDLM CN Import corrugated paper] · [aCNCNYOPXM CN Import kraft paper]  sign +1 · regional board demand
```
- **D2a is FASW's demand engine.** Recycled containerboard → corrugated boxes →
  **e-commerce + FMCG shipments**. China online-retail growth (`aCNRSONLNR`) is the
  cleanest regional proxy for box-volume demand (Indonesia has no e-commerce print in the
  store — verified: only China carries online-retail series). Publication-lagged →
  attribution/short-lead.
- **D2c** — the **Paper IPI (`CEICI323565302`, P3M, 2010=100, n60)** is the domestic
  production-volume index = the basket's own throughput; quarterly + lagged → attribution.
  It is the most usable series in the *primary* "Paper & Pulp" CEIC block (the rest of
  that block is annual establishment counts, n14–18 — too short to key).

---

## 4. SUPPLY / COST driver tree (fibre + energy — the margin's other half)

```
COST / SUPPLY
├─ S1 imported pulp / fibre COST ⚠ ──► [CEICI323793402 Import VOLUME: Wood Pulp/Cellulosic fibre, kg mn, n172]  sign −1 · lead 0m · fibre input
│      (TKIM buys pulp; APP imports)   [CEICI323775802 Import VALUE: Pulp,Paper & Articles, USD mn, n172]        sign −1 · implied pulp $/kg (value÷volume) ⚠
├─ S2 wood / pulpwood COST ──────────► NO clean tropical-pulpwood price in store.
│      (current wb_logs is WRONG)       [wb_logs CME:LBR1! N-Am lumber, wk196]  sign 0 · WEAK/wrong-commodity — demote, do not force −1
│                                       [WY Weyerhaeuser, wk800]  (timber-fibre read, also in D1a)  sign +1 as price, not cost
├─ S3 energy COST (boilers/dryers) ──► [wb_coal_au ICEEUR:ATR1! API2 coal, wk782]  sign −1 · lead 0–1m · recovery boilers/steam (KEEP)
│                                       [NYMEX:NG1! Henry Hub, wk800]  sign −1 · gas-fired dryers (secondary)
├─ S4 OCC / recovered-paper COST ⚠ ──► NO OCC price series. proxy: China recovered-paper import ban era
│      (FASW's main input)              [aCNCNJYDLM CN corrugated-paper imports]  inverse read · OCC scarcity channel
├─ S5 own supply / utilisation ──────► [CEICI323565302 Paper IPI, n60] · [CEICI506661577 Prompt Mfg Index: Paper, P3M, n15]  sign +1 · own-volume
└─ S6 capex / new capacity ──────────► [CEICI235841602 Investment Realization: Paper (DDI), IDR bn, P3M, n134]  sign −1 long-run (oversupply) · attribution
```
- **S1 is the fibre-cost leg and a second pulp-price stand-in.** `CEICI323793402` (Import
  **volume** of wood pulp & fibrous cellulosic, kg mn, **n172**) is the **imported BHKP/
  NBSK fibre TKIM and APP buy**; `CEICI323775802` (Import **value**, USD mn, n172) ÷ the
  volume series **backs out an implied imported-pulp $/kg** — the in-store proxy for the
  missing market-pulp price (on the *cost* side, mirroring D1c on the demand side). Sign
  on the basket is **net-ambiguous**: higher pulp price is *revenue* for INKP's pulp
  sleeve (+) but *cost* for TKIM's paper and FASW (−). Wire the **import volume as a −1
  cost** (the clean fibre-input read) and treat the implied price as **sign 0 / estimate**.
- **S2 — `wb_logs` is the wrong commodity; demote it.** `CME:LBR1!` is **North-American
  framing lumber** (196 weekly obs, thin, housing-driven). APP's fibre is **tropical
  acacia/eucalyptus pulpwood and imported market pulp**, which lumber does not track.
  Re-role `wb_logs` to **sign 0** (or drop); use **WY (timber-fibre REIT)** in D1a as the
  better-keyed wood-fibre read, but note WY is a *price/equity* (revenue-side) signal, not
  a cost.
- **S3 — energy is real and correctly signed.** `wb_coal_au` (API2, wk782) fires the
  recovery boilers and steam dryers (~10–20% cash cost). **Keep −1.** Add `natgas` as a
  secondary dryer-fuel cost.
- **S4 — OCC is FASW's swing cost and is unobserved.** No recovered-paper/OCC price exists
  in the store. The only handle is the **China recovered-paper import-ban / corrugated-
  import channel** (`aCNCNJYDLM`): when China stopped importing OCC (2018–20), global OCC
  flooded cheap → FASW input cost fell → margin up. Attribution only; flag as a structural
  factor, not a wired driver.
- **S6** — domestic paper capex (`CEICI235841602`, DDI, n134) proxies the **capacity/
  oversupply cycle** (more capex → future oversupply → margin compression, −1 long-run);
  slow/attribution.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR ──────────────────────► [FX_IDC:USDIDR, wk801]  sign +1 (net) · lead 0m · USD pulp/paper revenue > USD-debt drag (KEEP, but two-sided)
├─ M2 broad USD (DXY) ──────────────► [TVC:DXY, wk800]  sign −1 · lead 0–1m · commodity-priced-in-USD + EM-flow headwind  ⚠ use DXY (BBDXY empty wk0)
├─ M3 China demand / credit ────────► [aCNVAPAPZR / aCNIMPPULP] (D1) · [aCNM2GRTY CN M2 YoY]  sign +1 · regional-price driver
├─ M4 domestic rates ───────────────► [TVC:ID10Y, wk798] · [ECONOMICS:IDINTR BI rate]  sign −1 · INKP/TKIM USD+IDR leverage (net debt/EBITDA high)
└─ M5 global risk / EM beta ────────► [AMEX:DBC commodity beta] (NOT as "pulp price") · keep low weight / drop
```
- **M1 USD/IDR is net +1 but two-sided.** INKP/TKIM sell **USD/CFR-linked pulp & paper**
  (weak IDR → higher IDR revenue & realised export gain, +1), but they carry **large
  USD-denominated debt** (weak IDR → FX translation loss, −1). For these exporters the
  **revenue/operating channel dominates the reported-earnings swing**, so **keep +1**, but
  acknowledge the debt offset (do not over-weight). FASW is domestic → ~neutral.
- **M2 DXY −1** is the clean EM-flow / USD-pricing headwind. **Data caveat: `TVC:BBDXY`
  is EMPTY (weekly_obs 0) in the store — map `dxy` → `TVC:DXY` (wk800).** Store-wide bug;
  relevant here because the basket has a real USD-flow channel.
- **M4 rates matter through leverage.** INKP/TKIM are **levered USD+IDR borrowers** (high
  net debt/EBITDA); higher ID10Y / global rates raise financing cost and discount the
  equity → −1.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `IP` Int'l Paper · `PKG` Packaging Corp · `WY` Weyerhaeuser (· `SLGN`/`LPX`/`BCC`) | market / US equities (`Containers & Packaging`, `Forest Products & Paper`) | **demand (D1a)** | **the only traded proxy for the missing pulp/containerboard margin** |
| `aCNVAPAPZR` / `aCNPBIPMPP` China paper output | China macro | **demand (D1b)** | regional paper-cycle volume |
| `aCNIMPPULP` / `aCNCNJGOLM` China pulp imports | China macro | **demand (D1c)** | China = marginal pulp buyer; sets CFR pulp price (implied px) |
| `aCNRSONLNR` China online retail | China macro | **demand (D2a)** | e-commerce → corrugated-box volume (FASW) |
| `aCNPMIMT` / `aCNIP` China activity | China macro | **demand (D1d)** | paper offtake pulse (`aCNIP` already wired) |
| `ICEEUR:ATR1!` API2 coal | Energy / Coal | **cost (S3)** | recovery-boiler/dryer energy |
| `NYMEX:NG1!` Henry Hub | Energy / Natural Gas | **cost (S3)** | gas-fired dryers (secondary) |
| `CME:LBR1!` lumber | market / commodity | **cost (S2) — DEMOTE** | wrong commodity (N-Am framing lumber ≠ tropical pulpwood) |
| `TVC:DXY` · `FX_IDC:USDIDR` | market / FX | **macro (M1/M2)** | USD-revenue exporter + EM-flow |

**Deliberate non-linkage:** **do not** use `bcom`/`AMEX:DBC` as a "pulp/paper price." It
is an **energy-heavy commodity ETF with no paper content** — keeping it mislabeled as the
product price is the basket's central bug. Drop it, or keep it only as a low-weight broad
commodity *beta* with an honest label (not as "supply/price").

---

## 7. Currently wired vs available

### 7a. Wired now (the 6-driver `Paper` seed) vs proposed

| driver (now) | role/sign now | verdict | proposed change |
|---|---|---|---|
| `ceic ("Industrials & Manufacturing","Paper & Pulp")` | demand/supply | **keep but thin** | mostly annual n14–18; usable = `CEICI323565302` Paper IPI (n60). Add the richer block ↓ |
| *(none)* `ceic ("Basic Materials","Pulp & Paper")` | — | **ADD** | the monthly **n172** export-value (revenue) + import-value/volume (fibre cost) block — the biggest CEIC add |
| `wb_logs` `CME:LBR1!` | **cost −1** | **re-role to 0 / drop** | N-Am framing lumber ≠ tropical pulpwood; thin (wk196), wrong-commodity |
| `bcom` `AMEX:DBC` | **supply +1 "pulp/paper price"** | **DROP (the central mis-key)** | DBC is an oil-heavy ETF with zero paper weight; backwards sign in energy-cost regimes |
| `wb_coal_au` `ICEEUR:ATR1!` | cost −1 | **keep −1** | correct: recovery-boiler/dryer energy (~10–20% cash cost) |
| `usdidr` `FX_IDC:USDIDR` | macro +1 | **keep +1** | correct: USD pulp/paper exporters (note USD-debt offset) |
| `cn_ip_yoy` `aCNIP` | demand +1 | **keep +1** | valid; join with `aCNPMIMT` + the paper-specific China series |
| *(none)* `IP`/`PKG`/`WY` US paper equities | — | **ADD demand +1 (new resolvers)** | the pulp/board-margin proxy — the single biggest add (forward) |
| *(none)* `aCNVAPAPZR`/`aCNIMPPULP`/`aCNRSONLNR` | — | **ADD demand +1 (new keys)** | China paper output / pulp imports / e-commerce box demand |
| *(none)* `TVC:DXY` | — | **ADD macro −1** | (and fix the BBDXY-empty bug) |
| *(none)* `id_10y` | — | **ADD macro −1** | INKP/TKIM leverage |

### 7b. The pulp/paper PRICE data gap — concretely

This is the defining problem of the basket. **There is no BHKP price, no NBSK price, no
containerboard/testliner/kraftliner price, no OCC (recovered paper) price, and no market-
pulp index anywhere in `market.json`** (verified: a regex over all 4,142 market ids for
pulp/paper/packaging/woodpulp/kraft/containerboard/tissue returns **zero** commodity
series — only the IDX and US paper *equities*). The price that *is* INKP/FASW's entire
revenue line cannot be observed directly. Options, in order of preference:

1. **PREFERRED — US paper-producer EQUITY proxy.** Add new `GLOBAL_CORR` keys resolving to
   **`IP`** (International Paper, wk800), **`PKG`** (Packaging Corp, wk800), **`WY`**
   (Weyerhaeuser timber-REIT, wk800) — and optionally **`SLGN`/`LPX`/`BCC`**. These are
   pure-play paper/packaging/timber producers whose stock *is* a traded pulp-and-board
   margin. **Liquid, daily, leading** (global pulp/board price discovery precedes Jakarta).
   *Caveat (honest):* US equities → import a global-equity-beta + US-housing-cycle
   component (esp. WY) and are **partly circular** vs an IDX equity basket. Mitigate by
   blending and moderate weight. Direct analogue of the Chemicals (LYB/LG/Lotte) and
   Mining (CEIC-export-value) workarounds.
2. **SECONDARY — China pulp imports & paper output (`aCNIMPPULP`, `aCNVAPAPZR`).** Not a
   margin, but the **marginal-buyer pull and regional offtake** that set the CFR-China
   pulp price; `aCNIMPPULP` value÷volume backs out an **implied pulp $/t**. Monthly,
   publication-lagged → attribution.
3. **TERTIARY — CEIC trade value÷volume (implied $/kg).** `CEICI323775802` (import value)
   ÷ `CEICI323793402` (import volume) = an **implied imported-pulp $/kg** (cost side);
   `CEICI323977202` export value = the basket's own USD revenue (price×volume). The
   in-store stand-ins for the dead price series. Attribution only.
4. **REJECT — `bcom`/`AMEX:DBC` as "pulp/paper price."** It is an energy-heavy ETF with no
   paper content; it is the *current* mis-key and must be dropped, not re-signed.
5. **REJECT — `wb_logs`/`CME:LBR1!` as the fibre cost.** N-Am framing lumber ≠ tropical
   pulpwood/market pulp; thin (wk196). Use the CEIC pulp-import series for fibre cost.

**Recommendation:** wire **option 1 (US paper-equity proxy) as the forward price signal**,
**option 2 (China pulp imports / paper output) as the regional-price anchor**, **option 3
(CEIC n172 trade value/volume) for attribution & implied price**, drop `bcom` and demote
`wb_logs`. Accept that the basket remains **partly an explainer** until a real BHKP/
containerboard price is ingested.

---

## 8. Forecastability — why the current set is forward-negative, and the path to skill

**Diagnosis (fwd IC −0.09, contemp IC −0.00, placebo 0.45, flag none).** The basket is
**actively anti-predictive out-of-sample** — the fingerprint of a **wrong-signed mis-key**,
not mere noise:

- The nominal "price" driver **`bcom` (DBC, +1)** is really an **oil/energy proxy**. In a
  commodity/energy rally DBC rises and the engine goes long the basket, but **rising
  energy is a margin *headwind* for a paper mill** → the posture is backwards exactly when
  energy moves the cost stack. This is the most likely source of the negative forward IC.
- The "cost" driver **`wb_logs` (lumber, −1)** is the **wrong commodity** (housing lumber,
  not pulpwood) and **thin (wk196)** → it injects housing-cycle noise unrelated to pulp.
- The genuinely on-theme, leading instruments — **US paper equities (IP/PKG/WY)** and the
  **China pulp-import / paper-output series** — are **unwired**, so the seed has **no
  series that actually leads paper prices.**

**The contemporaneous-vs-forward distinction here.** Like Chemicals, this basket's *real*
driver — the pulp/board price — is **not in the store**, so the engine has **no native
leading price to key on**. The CEIC export/import-value series and the China paper-output
prints are **publication-lagged → contemporaneous attribution at best**. The **only
genuinely *leading* instruments available are the US paper-producer equities (IP/PKG/WY)**,
which price the global pulp/board margin before Jakarta reprices — *that* is the one branch
with a real forward claim, and it is the entire upside case. The **export-value series
(D1e) must be kept for *attribution only*** — it is near-coincident with the basket's own
revenue and will look strong in-sample while adding nothing (or worse, leaking) forward.

**The path to forward skill (testable):**
1. **Delete the mis-keys** — drop `bcom` (the backwards "pulp price") and demote
   `wb_logs` to 0/drop. Expect the **forward IC to stop being negative** on this step
   alone (removing the wrong-signed oil proxy).
2. **Add the forward price proxy** — wire `IP`(+1) [+ `PKG`/`WY`]. The only branch that can
   deliver a *forward* lead; test whether it moves IC above the **+0.08 SKILL** line.
3. **Add the regional-price anchor** — `aCNIMPPULP`/`aCNVAPAPZR`(+1) and `aCNRSONLNR` for
   box demand; expect these to lift **contemporaneous** (attribution) more than forward.
4. **Wire the CEIC n172 trade block** for attribution depth (export value = revenue,
   import volume = fibre cost), **keep `wb_coal_au`/`usdidr`**, add `dxy −1`/`id_10y −1`.

**Honest expectation.** With the missing pulp/board price *proxied by US equities* rather
than observed, the realistic target is to move forward IC from **−0.09 (mis-keyed)** toward
**0 to +0.08**, driven almost entirely by (a) **deleting the DBC backwards-sign** and
(b) the **IP/PKG/WY forward lead**; the China and CEIC branches mostly improve *attribution*
(contemporaneous IC). The honest concession: **until a real BHKP/NBSK/containerboard price
is ingested, this basket is structurally an explainer plus a partial forward beta off US
paper equities — not a clean forecaster.** Ingesting a CFR-China BHKP-pulp and a
containerboard price series is the single data change that would move it decisively into
forecaster territory.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Paper"` seed with the price-keyed tree below. **New `GLOBAL_CORR`
keys must be added first** (the US paper-equity proxies + the China paper keys); confirm
each id resolves in `correlation.sqlite` / the China store at build time. The catalog
shows wk800 for `IP`/`PKG`/`WY`; the `aCN…` paper series exist by ric but the catalog does
not store n_obs — **the build must verify they carry usable monthly depth** before keeping
them (fall back to `aCNIP`/`aCNPMIMT`, which are known-populated, if any resolve empty).

```python
# --- add to GLOBAL_CORR (US paper-producer equity proxies + China paper keys; fix BBDXY) ---
#   "paper_ip":   "IP",          # International Paper — containerboard/box margin proxy (wk800)
#   "paper_pkg":  "PKG",         # Packaging Corp of America — containerboard (wk800)
#   "paper_wy":   "WY",          # Weyerhaeuser — timber/wood-fibre REIT (wk800)
#   "cn_paper_out":"aCNVAPAPZR", # China Paper-Making & Products output YoY (regional offtake)
#   "cn_pulp_imp": "aCNIMPPULP", # China pulp imports = marginal-buyer pull / implied pulp px
#   "cn_online":   "aCNRSONLNR", # China online-retail YoY = e-commerce box demand (FASW)
#   "dxy":         "TVC:DXY",    # FIX: BBDXY is empty (wk0) -> use TVC:DXY (wk800)

"Paper": {  # ~91% INKP+TKIM (integrated virgin pulp/paper, USD exporter) + FASW
            # (recycled containerboard, domestic box). Driver = the regional PULP/BOARD
            # PRICE, proxied by US paper equities + China pulp imports (no pulp price
            # exists in store). Energy = coal; revenue = USD.
    "ceic": [("Basic Materials", "Pulp & Paper"),                       # the monthly n172 trade block (revenue + fibre cost)
             ("Industrials & Manufacturing", "Paper & Pulp")],          # Paper IPI (n60) + own throughput
    "ceic_override": [("exports: value: paper, paperboard", "supply", +1),  # CEICI323977202 USD revenue (price x vol) — ATTRIBUTION
                      ("exports: value: pulp and waste",     "supply", +1),  # CEICI323974902 INKP pulp revenue
                      ("import: volume: pulp of wood",       "cost",   -1),  # CEICI323793402 imported BHKP/NBSK fibre cost
                      ("manufacturing: paper and paper",     "demand", +1)], # CEICI323565302 Paper IPI = own throughput
    # endogenous / off-theme series to exclude even if pulled by the category:
    "ceic_exclude": ["number of establishments", "value added: factor cost",
                     "value added: input cost"],   # annual n14-18 noise; near-endogenous own-cost
    "globals": [
        # --- THE PULP/BOARD PRICE PROXY (the missing margin, via US paper equities) ---
        ("paper_ip",   "demand", +1, "International Paper = traded containerboard/pulp margin (price proxy, leads)"),
        ("paper_pkg",  "demand", +1, "Packaging Corp containerboard margin proxy"),
        ("paper_wy",   "demand", +1, "Weyerhaeuser timber/wood-fibre price proxy"),
        # --- energy cost leg (correct in current seed) ---
        ("wb_coal_au", "cost",   -1, "API2 coal: recovery-boiler/dryer energy (~10-20% cash cost)"),
        ("natgas",     "cost",   -1, "gas-fired dryers (secondary energy)"),
        # DROPPED: bcom/DBC ("pulp price") = oil-heavy ETF, zero paper, backwards sign — the central mis-key.
        # DROPPED/DEMOTED: wb_logs/LBR1! = N-Am framing lumber != tropical pulpwood, thin (wk196).
    ],
    "macro": [
        ("cn_paper_out", "demand", +1, "China paper-making output = regional offtake/price anchor"),
        ("cn_pulp_imp",  "demand", +1, "China pulp imports = marginal-buyer pull / implied CFR pulp px"),
        ("cn_online",    "demand", +1, "China online-retail = e-commerce corrugated-box demand (FASW)"),
        ("cn_ip_yoy",    "demand", +1, "China IP YoY = regional industrial/packaging pulse (kept)"),
        ("usdidr",       "macro",  +1, "USD pulp/paper export revenue (net of USD-debt drag) — kept"),
        ("dxy",          "macro",  -1, "broad USD: commodity-priced product + EM-flow headwind (fix BBDXY)"),
        ("id_10y",       "macro",  -1, "INKP/TKIM USD+IDR leverage (high net debt/EBITDA)"),
    ],
},
```

**Notes for the implementer.**
- `paper_ip/pkg/wy`, `cn_paper_out`, `cn_pulp_imp`, `cn_online` are **new `GLOBAL_CORR`
  keys** — add and verify they resolve before the seed references them. If a China paper
  key resolves empty (catalog lacks n_obs), drop it and lean on `aCNIP`/`aCNPMIMT`.
- **`dxy` must be remapped `TVC:BBDXY` → `TVC:DXY`** (BBDXY empty, wk0) — store-wide bug
  affecting every basket using `dxy`; flag separately.
- The **`bcom` "pulp/paper price" label is the headline bug to delete** — do not re-sign
  it, remove it (or keep as a low-weight honest commodity beta only).
- The US paper-equity drivers are **partly circular** (equity→equity) and carry a
  US-housing component (WY). Keep moderate weight; blend 2–3; do not let one name dominate.
- The CEIC export-value series (`CEICI323977202`/`CEICI323974902`) are **attribution-only**
  (near-coincident with the basket's own revenue) — keep them for explanatory IC, but do
  **not** credit them with forward skill.

**What to backtest (the keep/kill gate).** Run `backtest/bt.py "Paper"` and KEEP the change
only if forward IC **rises from −0.09** (toward ≥0, ideally past +0.08). Ablations, in
order:
1. **De-mis-key only** (drop `bcom`; demote `wb_logs`→0/drop; keep `wb_coal_au`/`usdidr`/
   `cn_ip_yoy`) vs current seed — expect the **forward IC to stop being negative** purely
   from removing the backwards oil proxy. This is the minimum honest improvement even if
   nothing else helps.
2. **+ US paper-equity proxy** (`IP`/`PKG`/`WY`) — the core hypothesis; does the paper-
   producer equity add *forward* IC beyond the de-mis-keyed base? Make-or-break branch.
3. **+ China paper output / pulp imports / online-retail** — expect it to lift
   *contemporaneous* (attribution) more than forward.
4. **+ CEIC Basic-Materials Pulp&Paper n172 trade block + `dxy`/`id_10y`** — confirm signs
   survive theory-reconciliation; if the equity proxy fails the circularity/IC test, fall
   back to the de-mis-keyed base (#1) as the honest minimal win (stop the DBC backwards
   sign + the wrong-commodity lumber cost).

The success criterion is honest: this basket cannot become a clean forecaster without a
real BHKP/NBSK/containerboard price in the store. The achievable win now is to **delete the
backwards DBC "pulp price", drop the wrong-commodity lumber cost, wire the on-theme CEIC
n172 trade block, and earn a modest forward lead from US paper-producer equities** —
moving it from "−0.09 mis-keyed" to a defensible, on-mechanism explainer with a small
forward edge.
