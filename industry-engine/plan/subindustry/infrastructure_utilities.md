# Utilities (Infrastructure) — Driver-Tree Plan

> Detail file for the LBC Industry Driver Engine. Follows the §4 template in
> `plan/IMPROVEMENT_PLAN.md`. Every series cited is confirmed in
> `plan/catalog/{idind,id,market}.json` with its real RIC and n_obs. This is a
> reference a quant implements `mapping.py` from — depth/correctness over length.
> **Basket id:** `infrastructure_utilities` · **sub_sector:** Utilities (sector Infrastructure).

---

## 1. Snapshot

| | |
|---|---|
| **Sub-industry** | Utilities (Infrastructure) — Indonesian small-cap independent power producers (IPPs) / electricity generators. **The IDX power-gen complex is split**: the geothermal/hydro mega- and mid-caps (BREN/PGEO/POWR/ARKO/KEEN) sit in **Alternative Energy (#5)**; this `Utilities` basket is the **micro-cap tail** of the same complex. |
| **mcap** | **~0.17T IDR** (smallest of all 52 sub-industries — 52nd/52). Two names only. |
| **Members (2)** | **MPOW** (PT Megapower Makmur — 93.1B IDR, β **0.094**; diesel/biomass/mini-hydro IPP selling to PLN under PPAs in eastern/remote-grid Indonesia). **TGRA** (PT Terregra Asia Energy — 74.3B IDR, β **0.068**; run-of-river **mini-hydro** renewable-IPP developer, mostly pipeline/pre-COD assets). Both classified `Utilities - Electricity` in `market.json`; both have **long price history** (`weekly_obs` MPOW **458**, TGRA **465** ≈ 8.8 yrs, listed ~2017). |
| **Current grade** | `partial` · confidence **low** · kept drivers **4** (per `_state.txt`). |
| **Current forward OOS** | **fwd IC −0.218 · placebo pctile 0.05 · n_oos 53 → flag NONE (strongly anti-predictive).** 2nd-worst IC in the universe after Tower (−0.20). hit−up −0.06. The basket's *posture forecasts the wrong way* on the placebo-corrected test. |

**The gap — and what this file must establish.** This is **not** a "rich data, thin
wiring" story like Property, nor a "stumbled onto a real anchor" story like its sibling
Alternative Energy (+0.23 on the tariff). It is the **hardest, most honest case in the
set**: a **2-name, 0.17T micro-basket** whose current tree is just `("Energy","Electricity")`
CEIC + `wb_coal_au(cost −1)` + `natgas(cost −1)` + `id_gdp_real_q(demand +1)`, and which
**scores −0.218 below the 5th placebo percentile**. The job here is **diagnosis first,
wiring second**: decide whether the −0.218 is (a) a **sign error** (a driver wired with the
wrong sign for *these two specific names*), (b) the **2-name idiosyncratic mix** (the signal
is fitting noise from two illiquid β≈0.08 micro-caps), or (c) a **small-sample artefact**
(n_oos=53 — wide CI, the −0.22 is not distinguishable from a draw of bad luck). My read,
argued in §8: **primarily (b)+(c) — idiosyncratic mix on a tiny sample — with one genuine
(a) sign-trap risk to fix (the fuel-cost leaf can flip to a perverse sign for a near-zero-fuel
hydro developer like TGRA).** The honest recommendation is to **down-grade this basket to
attribution/None, fix the one defensible sign-role issue, and explicitly refuse to claim
forecast skill on n=53 / 2 names.** Detail below.

---

## 2. Economic structure — how these two IPPs make money

The basket is **contracted electricity generation**, the same clean revenue identity as the
rest of the IDX power complex (Alternative Energy #5), but realised by **two tiny, structurally
different generators**:

**Revenue identity (per name):**

```
revenue = contracted PPA tariff (IDR/kWh or USD/kWh)  ×  volume dispatched (kWh)
            │                                            │
   set in the PLN PPA (often take-or-pay,            availability/capacity-factor
   USD-linked for IPPs)                              (fuel for MPOW; rainfall for TGRA)
              − fuel/O&M cost
```

- **MPOW (Megapower Makmur)** — a **fuel-burning IPP** (diesel/HSD, biomass, some
  mini-hydro) supplying **remote/eastern grids** under PPAs with PLN. Revenue ≈ **PPA tariff
  × dispatched MWh**; the **cost stack is fuel-heavy** (diesel/biomass), so a fuel-price move
  is a genuine **margin (−1) cost** *for MPOW*. β 0.094 → a low-beta contracted annuity.
- **TGRA (Terregra Asia Energy)** — a **run-of-river mini-hydro developer**: mostly
  **pipeline / pre-COD** hydro plants. Where operating, revenue ≈ **PPA tariff × hydro
  availability** (rainfall-driven capacity factor), and **fuel cost ≈ 0** (water is free).
  TGRA's value is dominated by **project-execution / financing-of-pipeline** dynamics, not by
  a commodity cost. β 0.068.

**The cost stack diverges sharply between the two names — this is the crux of the basket's
problem:**
- **MPOW: fuel is a real, dominant cost.** Diesel/biomass; a fuel-price rise compresses MPOW's
  margin. **Coal/gas are *imperfect proxies*** for MPOW's actual fuel (it does not run on
  thermal coal or Henry-Hub gas) — diesel tracks **Brent/gasoil**, not API2 coal.
- **TGRA: fuel cost ≈ 0** (hydro). For TGRA the cost stack is **capex + financing (long-duration
  debt)**, exactly like a small toll-road / REIT-style annuity. **A coal/gas cost leaf has *no
  mechanism* on TGRA** — wiring `wb_coal_au(cost −1)` onto a zero-fuel hydro developer is
  economically null at best and a **spurious sign at worst**.

**The margin swing factor** is therefore **(PPA tariff − fuel cost)** for MPOW, and essentially
**(PPA tariff, discount rate, pipeline execution)** for TGRA. The basket has **no common cost
driver** — one name is fuel-exposed, the other is not. That heterogeneity, on a 2-name basket,
is the structural reason a single equal-weighted sign-posture struggles (see §8).

**What a sell-side analyst watches** (to the extent these micro-caps are covered at all):
(1) **new PPA signings / COD of pipeline plants** (TGRA's whole story — pure idiosyncratic,
not in any macro series); (2) **PLN counterparty health & offtake / payment** (both names sell
to PLN); (3) **fuel cost** (MPOW only — diesel/Brent, *not* coal); (4) **the regulated tariff
/ TDL regime** (the revenue anchor, shared with Alt Energy); (5) **rates** (financing cost on
the annuity / pipeline capex); (6) **rainfall / hydrology** (TGRA capacity factor — no clean
monthly series exists).

**Intra-basket dispersion dominates.** Two names, **opposite cost structures** (fuel-heavy vs
zero-fuel), both **deep micro-caps (β≈0.08, illiquid)**. The equal-weight basket return is a
50/50 blend of (i) a remote-grid diesel IPP and (ii) a pre-revenue hydro developer. There is no
"Utilities common factor" to fit — the macro tree can at best explain the **shared
regulated-IPP / rate-duration commonality**; it **cannot** explain TGRA's pipeline execution or
MPOW's remote-grid PPA mix, which are likely the dominant variance components. **This is the
single most important caveat in the file** and the leading explanation for −0.218.

---

## 3. DEMAND driver tree

Legend per leaf: **series RIC** · role · **sign** (on excess return vs JCI) · **LEAD
(months)** · mechanism · data quality. **[FORECAST]** = leading price/rate branch expected
to carry forward skill; **[ATTRIB]** = coincident/lagging (explanation, weak prediction).
`n` = n_obs. As with Alt Energy, the **regulated tariff is filed by CEIC under "Electricity
demand"** but is economically **revenue** for a generator — it is broken out in §4 (supply/
revenue). Pure end-user electricity *demand* (the volume the PPAs ultimately absorb) is here.

```
DEMAND  (electricity offtake / system volume the IPPs dispatch into)
├── D1  SYSTEM / PLN ELECTRICITY DEMAND  (the volume side — annual, lagging)
│   ├── D1a  Consumption: Total          ── CEICI13522901 (MWh mn, P1Y) / CEICI13528701 (kWh bn)
│   ├── D1b  Consumption: Industrial     ── CEICI13523401 (MWh mn) / CEICI13528901 (kWh bn)
│   ├── D1c  Consumption: Household      ── CEICI13523101 (MWh mn) / CEICI13528801 (kWh bn)
│   └── D1d  PLN sales: Total / Industrial ── CEICI254246202 / CEICI254246602 (MWh, P1Y)
├── D2  ELECTRICITY-INTENSITY / MACRO BACKDROP  (the demand cycle)
│   ├── D2a  Electricity & Gas Supply GDP ── CEIC365752037 (national-accounts value-add, P3M)
│   ├── D2b  Real GDP yoy                 ── id_gdp_real_q / aIDGDPAR1 (currently wired)
│   └── D2c  Industrial production / IP    ── id-macro IP yoy (factory power pull)
└── D3  ELECTRIFICATION / STRUCTURAL LOAD GROWTH  (slow secular — attribution only)
    └── D3a  Household consumption (annual) ── CEICI13523101 (MWh mn, P1Y, n40)
```

### D1 — System / PLN electricity demand (volume) — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D1a Consumption: Total | `CEICI13522901` (Consumption: Annual: Total) n40 / `CEICI13528701` (kWh bn) n32 | demand | +1 | **lags (−)** | national kWh consumed = system volume the IPPs feed under PPAs. | **P1Y, n40/n32** — annual, ~1-2q pub-lag. **[ATTRIB]** |
| D1b Consumption: Industrial | `CEICI13523401` (Consumption: Industrial) n40 / `CEICI13528901` (kWh bn) n32 | demand | +1 | lags | manufacturing electricity pull = utilisation/load. | P1Y. **[ATTRIB]** |
| D1c Consumption: Household | `CEICI13523101` (Annual: Household, MWh mn) n40 / `CEICI13528801` (kWh bn) n32 | demand | +1 | lags | electrification + residential load (~5%/yr structural). | P1Y. **[ATTRIB]** |
| D1d PLN sales: Total / Ind | `CEICI254246202` (PLN sales: Total) n26 / `CEICI254246602` (Industrial) n26 | demand | +1 | lags | PLN-sold MWh = offtake the PPAs are dispatched against. | P1Y, n26. **[ATTRIB]** |

> **The entire D1 branch is annual (P1Y, n26-40) → pure attribution.** It confirms the
> structural ~5%/yr load-growth backdrop but is **far too slow and pub-lagged** to forecast a
> monthly micro-cap return. **Critically: consumption/sales LEVELS are endogenous to system
> size** — use yoy/Δ only, never the level, and weight-cap. These leaves exist to *explain*
> the volume backdrop, not to predict — and they almost certainly contribute nothing to (and
> may add noise to) the n=53 forward test.

### D2 — Electricity-intensity / macro backdrop — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D2a Electricity & Gas Supply GDP | `CEIC365752037` (GDP: SNA2008 2010p: Electricity & Gas Supply) | demand | +1 | coincident | national-accounts value-add of the power sector itself — the cleanest *quarterly* demand read. | **P3M**, ~2m lag (id.json, obs to 2026-03). **[ATTRIB]** |
| D2b Real GDP yoy | `id_gdp_real_q` → `aIDGDPAR1` | demand | +1 | coincident | income/activity → load growth. **(currently wired — the only macro leaf today.)** | P3M. **[ATTRIB]** |
| D2c Industrial production | id-macro IP yoy | demand | +1 | coincident | factory power demand (MPOW industrial offtake read-through). | M/P3M. **[ATTRIB]** |

> **D2 is coincident at best.** GDP/IP are *contemporaneous* with — often *lagging* — the
> equity. `id_gdp_real_q` is the engine's single wired macro driver today and is a **demand
> backdrop, not a forecaster**; on a 2-name micro basket it is essentially a slow beta proxy.

### D3 — Structural electrification — **[ATTRIB, secular]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D3a Household consumption | `CEICI13523101` (Annual: Household) n40 | demand | +1 | secular | long-run electrification (electrification ratio → load). | P1Y, n40. **[ATTRIB]** — secular, not tradable monthly. |

---

## 4. SUPPLY / COST / REVENUE driver tree

This is where the basket's economics — and its sign-trap risk — live. The **regulated tariff
is the revenue anchor** (shared with Alt Energy), **fuel cost is a margin driver for MPOW only**,
and **TGRA has essentially no commodity cost** (the source of the spurious-sign hazard).

```
SUPPLY / COST / REVENUE
├── S1  REGULATED PPA TARIFF  ★ revenue/kWh (the Alt-Energy anchor — re-role supply +1)
│   ├── S1a  Tariff: Industry          ── CEICI385762047 (IDR/kWh, P1M, n138)
│   ├── S1b  Tariff: Government         ── CEICI385762117 (IDR/kWh, P1M, n138)
│   ├── S1c  Tariff: Business (B3)      ── CEICI385762017 (IDR/kWh, P1M, n146)
│   └── S1d  Tariff: P3/RTM (regular)   ── CEICI385762107 (IDR/kWh, P1M, n138)
├── S2  FUEL / VARIABLE COST  (MARGIN — MPOW only; ≈0 for TGRA)
│   ├── S2a  Diesel/gasoil proxy        ── brent / ICEEUR:BRN1! (800w)   ← MPOW's REAL fuel
│   ├── S2b  Thermal coal (API2)        ── wb_coal_au / ICEEUR:ATR1! (782w)  (currently wired)
│   └── S2c  Natural gas (Henry Hub)    ── natgas / NYMEX:NG1! (800w)        (currently wired)
└── S3  HYDRO AVAILABILITY / OUTPUT  (TGRA capacity factor — no clean monthly series)
    └── S3a  Hydro production (PLTA)     ── CEICI13527201 (GWh, P1Y, n32)  [ATTRIB only]
```

### S1 — Regulated PPA tariff ★ **revenue anchor** (re-role `supply +1`, Δ not level)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S1a Tariff: Industry | `CEICI385762047` (Tariff: Industry, IDR/kWh) n138 | **supply** | **+1** | **1-4m** | the regulated industrial price/kWh = IPP PPA reference & MPOW industrial billing. **CEIC files it `demand` — RE-ROLE `supply +1`** (revenue, not consumer demand). | **M, n138**, ~1m lag. **[FORECAST]** |
| S1b Tariff: Government | `CEICI385762117` (Tariff: Government) n138 | **supply** | **+1** | **1-4m** | the brief's "government electricity tariff"; same revenue mechanism. The Alt-Energy p=8e-5 anchor lives in this family. | M, n138. **[FORECAST]** |
| S1c Tariff: Business B3 | `CEICI385762017` (Tariff: Business B3) n146 | **supply** | **+1** | **1-4m** | commercial tariff; longest history (n146) → best tariff-momentum proxy. | M, n146. **[FORECAST]** |
| S1d Tariff: P3/regular | `CEICI385762107` (Regular: Peak Load) n138 | **supply** | **+1** | **1-4m** | regular-schedule tariff. | M, n138. **[FORECAST]** |

> **The tariff is the one branch with a plausible forecast mechanism** (monthly, low-lag,
> discretely-persistent revenue catalyst — the same series that scored p=8e-5 in Alt Energy).
> **BUT** for *this* basket two caveats bite hard: (i) MPOW/TGRA are **micro-caps under
> bespoke PPAs**, so the published end-user tariff is only a *loose* reference to their actual
> contracted price (especially TGRA's USD/feed-in hydro tariff); (ii) on **n=53**, even a real
> tariff lead may not register. Re-role it correctly (`supply +1`, **Δ/non-overlapping not
> level** — tariffs only trend up with inflation, so a level z-score looks permanently bullish),
> but do **not** expect it to rescue the IC. **It is the best available forecast candidate, and
> still weak here.**

### S2 — Fuel / variable cost (margin) — **MPOW only; the sign-trap leaf**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S2a Diesel/gasoil (Brent proxy) | `brent` → `ICEEUR:BRN1!` **800w** | cost | **−1** | 1-3m | **MPOW's actual fuel is diesel/HSD + biomass — which tracks Brent/gasoil, NOT thermal coal.** This is the *correct* fuel proxy for the one fuel-burning name. Liquid, leads. **NOT currently wired.** | W, 800w, live. **[FORECAST, cost — MPOW only]** |
| S2b Thermal coal (API2) | `wb_coal_au` → `ICEEUR:ATR1!` **782w** | cost | **−1** | 1-3m | **currently wired.** But **neither MPOW nor TGRA runs on thermal coal** — coal is at best a weak general-energy correlate for MPOW and **mechanism-null for TGRA**. A plausible mis-specification: it imports the *Coal-sector* sign onto two non-coal generators. | W, 782w, live. **[mis-specified — see §8]** |
| S2c Natural gas (Henry Hub) | `natgas` → `NYMEX:NG1!` **800w** | cost | **−1** | 1-3m | **currently wired.** Henry Hub is a US gas price; neither name is a Henry-Hub gas burner. Same mis-specification risk as coal. | W, 800w, live. **[mis-specified — see §8]** |

> **★ The core sign-trap.** The current SEED wires **two cost leaves (coal −1, gas −1) that
> describe fuels neither member actually burns**, and **omits Brent** (the proxy that actually
> tracks MPOW's diesel). For **TGRA (zero-fuel hydro) a `cost −1` fuel leaf has no economic
> channel** — yet the engine still forms a sign-contribution from it, **injecting a spurious
> driver into a 2-name average**. On a tiny, illiquid basket, a mechanism-null leaf does not
> average to zero — it adds **noise with a fixed sign**, and if that fixed sign happens to
> anti-correlate with the realised micro-cap returns over the short window, it **drags the IC
> negative**. This is the most defensible *(a) sign-error* contribution to the −0.218 (see §8).

### S3 — Hydro availability / output (TGRA volume) — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S3a Hydro production (PLTA) | `CEICI13527201` (Production: PLTA, Hydro, GWh) n32 | supply | +1 | coincident | national hydro output = rainfall/availability proxy → TGRA capacity factor. | **P1Y, n32** — annual, slow. **[ATTRIB]** |

> TGRA's true volume driver is **rainfall/hydrology**, for which there is **no clean monthly
> market series**; the annual PLTA production print is the closest available and is
> attribution-only. TGRA's pipeline-execution (COD timing) is **purely idiosyncratic** and
> unmappable to any macro series — a fundamental ceiling on forecastability here.

---

## 5. MACRO / RATE / FX / FLOW

For these contracted/annuity IPPs the **discount-rate (duration) channel** is first-order and
**entirely unwired today** (the SEED has no rate leaf at all — only GDP). USD/IDR matters
**+1** if/where PPAs are USD-linked (common for Indonesian IPPs), the inverse of an importer.

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| ID 10Y (domestic duration) | `id_10y` → `TVC:ID10Y` **798w** | macro | **−1** | 1-3m | the **domestic discount rate** on the IDR contracted annuity (both names) + TGRA's pipeline-capex financing cost. The single most important *missing* macro leaf — these are bond-proxy duration assets (β≈0.08). | D, 798w, live. **[FORECAST]** |
| ID 1Y (short-end financing) | `id_01y` → `TVC:ID01Y` **793w** | macro | −1 | 1-3m | floating-rate project/working-capital financing (TGRA pipeline). | D, 793w, live. **[FORECAST]** |
| BI 7DRR (policy) | `id_bi_rate` → `ECONOMICS:IDINTR` **186m** | macro | −1 | 3-6m | policy-rate cycle → financing cost + tariff/subsidy regime signal. | M, live. **[FORECAST]** |
| US 10Y (global discount) | `us_10y` → `TVC:US10Y` **800w** | macro | −1 | 1-3m | global risk-free / EM duration; caps BI room. | D, 800w, live. **[FORECAST]** |
| USD/IDR | `usdidr` → `FX_IDC:USDIDR` **801w** | macro | **+1** | 0-2m | IPP PPAs are commonly **USD-linked** → weak IDR *raises* IDR revenue (**+1**, opposite to importers). Also a risk-off/flow proxy on illiquid micro-caps (ambiguous). Net **+1** on the USD-PPA revenue channel. | W, 801w, live. **[FORECAST, flow]** |
| DXY (broad USD / EM flow) | `dxy` → **`TVC:BBDXY` (EMPTY)** | macro | −1 | 0-2m | broad-USD EM headwind. **DATA BUG: resolver `dxy→TVC:BBDXY` has weekly_obs=0.** Use `TVC:DXY` (800w) if ever wired. | **`TVC:BBDXY` empty → `TVC:DXY`.** |
| US Utilities equity beta | `AMEX:XLU` **800w** | macro | +1 | 0-1m | global regulated-utility equity factor (sector beta read-through). | W, 800w, live. **[FORECAST, beta — optional]** |

**Flow note.** Both names are **β≈0.08, deeply illiquid micro-caps**. Their weekly returns are
dominated by **idiosyncratic liquidity events** (thin order books, occasional corporate
actions), not by a clean macro flow. The **rate complex (`id_10y`)** is the most defensible
macro lever (bond-proxy duration on a contracted annuity), and **USD/IDR (+1)** is the FX
channel — but on n=53 with two micro-caps, neither is likely to register robustly. There is **no
reliable flow signal** for this basket.

---

## 6. Cross-industry linkages

| input | source sector / block | series | role | sign | note |
|---|---|---|---|---|---|
| Diesel/gasoil fuel cost | Energy → Oil & Gas | `ICEEUR:BRN1!` (Brent, 800w) | cost | −1 | **MPOW's actual fuel proxy** (diesel/HSD). Shared with **Oil & Gas (#16)**, **Airlines (#33, jet fuel)**, **Shipping (#32, bunker)**. The leaf the current SEED is *missing*. |
| Thermal coal cost | Energy → Coal | `ICEEUR:ATR1!` (API2, 782w) | cost | −1 | currently wired, but **mechanism-weak here** (neither name burns thermal coal). Real for Coal #3, Cement #28, Alt-Energy POWR. |
| Natural gas cost | Energy → Oil & Gas | `NYMEX:NG1!` (800w) | cost | −1 | currently wired, **mechanism-weak here**. Real for Oil & Gas #16 (PGAS cost), Alt-Energy POWR (combined-cycle). |
| Regulated electricity tariff | ID macro / Electricity block | `CEICI385762117`/`...047`/`...017` (P1M, n138-146) | supply (revenue) | +1 | the **shared power-complex revenue anchor** (Alt-Energy #5 p=8e-5). Re-role `supply +1`. |
| Domestic discount rate | ID macro | `TVC:ID10Y` (798w) | macro | −1 | bond-proxy duration. Shared with the whole **utility/infra/REIT-like complex** (Alt-Energy #5, Toll Road #46, Tower #48, Property #7). |
| Electricity & Gas GDP | ID macro (national accounts) | `CEIC365752037` (P3M) | demand | +1 | sector value-add; cross-reads with **Alternative Energy (#5)**. |

> **The Utilities ↔ Alternative Energy ↔ Oil&Gas triangle.** This `Utilities` micro-basket is
> the **small tail** of the same regulated-power node as Alt Energy (#5) — it should inherit the
> **tariff(+1 supply) + rate(−1) + USD-PPA(+1)** spine. The fuel-cost node, however, must be
> **Brent (MPOW diesel), not coal/gas** — that is the one cross-industry wiring this basket gets
> *wrong* today.

---

## 7. Currently wired vs available — the "what we COULD add"

**Wired today (`SEED["Utilities"]`):** `ceic:[("Energy","Electricity")]` (captures tariffs +
annual consumption + hydro production); `globals`: `wb_coal_au(cost −1)`, `natgas(cost −1)`;
`macro`: `id_gdp_real_q(demand +1)`. **Kept: 4.** The tree has **no rate leaf, no FX leaf, the
tariff is left mis-roled as `demand`, and the two wired cost leaves describe fuels neither
member burns** — while **Brent (MPOW's real fuel) is omitted.**

| priority | ADD / FIX | RIC | role/sign | why it beats the current set |
|---|---|---|---|---|
| **P0 (fix)** | **Re-point fuel cost: drop coal/gas dominance, add Brent** | `brent`/`ICEEUR:BRN1!` (800w) | cost **−1** | MPOW burns diesel (Brent-linked), not thermal coal / Henry-Hub gas. The current coal+gas leaves are mechanism-null/spurious on these 2 names. **This is the defensible sign-fix.** |
| **P0 (fix)** | **Re-role the tariff → revenue** | `CEICI385762117`/`...047`/`...017` | **supply +1** | CEIC files it `demand`; for generators it is revenue/kWh. Use **Δ/non-overlapping, not level** (anti-trend leak). |
| **P0 (add)** | Wire domestic 10Y | `id_10y`/`TVC:ID10Y` (798w) | macro **−1** | the dominant *missing* macro lever — bond-proxy duration on a contracted annuity (β≈0.08). |
| **P1** | USD/IDR (+1) | `usdidr`/`FX_IDC:USDIDR` (801w) | macro **+1** | USD-linked PPA revenue channel (sign +1, *not* −1). |
| **P1** | BI 7DRR | `id_bi_rate`/`ECONOMICS:IDINTR` | macro −1 | policy/financing-cost leaf. |
| **P2** | US 10Y | `us_10y`/`TVC:US10Y` (800w) | macro −1 | global discount-rate backdrop. |
| **P2** | Electricity & Gas GDP | `CEIC365752037` (P3M) | demand +1 | quarterly sector value-add (attribution, replaces slow annual consumption). |
| **drop/cap** | **TGRA fuel-cost exposure** | coal/gas/Brent on TGRA | — | TGRA is zero-fuel hydro; **no cost leaf has a mechanism on it.** The engine cannot per-name-mask, so accept that ~50% of the basket is fuel-insensitive and **weight-cap the fuel leaf**. |
| **fix** | `dxy` resolver | `TVC:BBDXY` **empty** | — | if ever wired, use `TVC:DXY` (800w). Currently not in this SEED — leave unwired. |
| **note** | annual consumption/PLN-sales | D1 (P1Y) | low weight | endogenous LEVELS → yoy/Δ only; attribution, never let an annual print drive a monthly micro-cap signal. |

---

## 8. Forecastability — diagnosing the −0.218 (sign-flip vs mix vs noise)

**The verdict up front: the −0.218 is primarily the 2-name idiosyncratic MIX amplified by a
SMALL SAMPLE (n=53), with a secondary, fixable SIGN-TRAP from mis-specified fuel-cost leaves.
It is NOT a clean, trustworthy "the engine forecasts the wrong way" signal — and it must NOT be
read as one.** The three candidate causes, weighed:

**(c) Small-sample artefact — LARGE contribution.** n_oos = **53** monthly predictions. With
`MIN_TRAIN=54` burn-in and members listed ~2017 (`weekly_obs` ≈ 460 ⇒ ~107 monthly returns),
the forward window is *structurally* short — only ~53 OOS points remain after the burn-in. **The
binding constraint is the member return history, not the drivers** (coal/gas/GDP/tariff all have
long history). At n=53 the standard error on a Spearman IC is ≈ 1/√(n−1) ≈ **0.14**, so a −0.22
is barely ~1.5σ from zero — **the 95% CI comfortably spans zero**. The placebo pctile 0.05 says
the *realised pairing* is worse than 95% of circular-shifts, which is suggestive, **but a single
draw of 53 points from two illiquid micro-caps is exactly the regime where placebo percentiles
are themselves unstable.** This alone caps how much we can conclude.

**(b) 2-name idiosyncratic mix — LARGE contribution (the leading cause).** The basket is **two
micro-caps with opposite cost structures** (MPOW fuel-burning diesel IPP; TGRA zero-fuel hydro
*developer*, much of it pre-revenue). β 0.094 / 0.068 → their returns are **dominated by
idiosyncratic liquidity and corporate events**, not by any macro factor. There is **no common
"Utilities factor"** for the tree to fit. When you average a fixed-sign macro posture against a
return series that is ~mostly idiosyncratic noise on n=53, the realised IC is **essentially a
random draw** — and here it drew negative. **This is the most economically honest reading:** the
−0.218 is not the engine "predicting backwards," it is the engine **having almost nothing real to
predict** and the residual being unlucky. The extreme intra-basket heterogeneity (fuel-exposed
vs fuel-immune) makes a single sign-posture structurally ill-posed.

**(a) Sign-flip / mis-specification — SMALL but REAL and FIXABLE.** There *is* a genuine wiring
error, though it is unlikely to be the whole −0.22. The SEED wires **`wb_coal_au(cost −1)` and
`natgas(cost −1)`** — but **neither member burns thermal coal or Henry-Hub gas.** For **TGRA
(zero-fuel hydro) these leaves are mechanism-null**, yet the engine still forms a fixed-sign
contribution from them and folds it into a 2-name average. A mechanism-null leaf on a tiny basket
does **not** wash out — it injects **noise with a locked sign**, and if that sign anti-correlates
with the realised returns over the short window it **bleeds the IC negative**. The brief's
specific hypothesis — *"wiring fuel as +1 demand when it's −1 cost"* — is **not** literally what
happened (the fuel leaves are correctly signed `−1 cost`); the subtler error is **wiring the
*wrong fuel* (coal/gas) and omitting the right one (Brent/diesel for MPOW), plus applying any
fuel leaf at all to a zero-fuel name (TGRA).** Fixing this — swap coal/gas → Brent, weight-cap
the fuel leaf — removes the spurious sign source, but **will not manufacture skill** that the
2-name/n=53 structure cannot support.

**Why NOT a clean sign-flip of a real driver?** If the −0.22 were a single inverted real driver
(e.g. GDP wired −1 when it should be +1), flipping it would yield a symmetric **+0.22**. But the
wired drivers (GDP +1 demand; coal/gas −1 cost) are **a-priori correctly signed** — GDP *is* a
demand positive, fuel *is* a cost negative. There is no obvious single sign to invert that would
flip −0.22 → +0.22. That argues **against** a pure sign-error explanation and **for** the
mix+noise reading. (A quick falsification: run the backtest with the fuel leaves *removed* — if
IC moves toward ~0 rather than to +0.22, it confirms the fuel leaves added noise, not inverted
signal; see §9 step 2.)

**The honest verdict.** This basket is **attribution-at-best, and most likely neither** — a
2-name, 0.17T micro-tail whose returns are dominated by idiosyncratic, unmappable factors
(TGRA pipeline execution, MPOW remote-grid PPAs, micro-cap liquidity). **The right action is
to (1) fix the defensible wiring (tariff re-role, Brent over coal/gas, add `id_10y`/`usdidr` to
share the Alt-Energy spine), (2) re-run the blindfolded backtest, and (3) regardless of the
result, label the panel verdict for this basket "attribution / insufficient-sample" and refuse
to claim forecast skill on n=53 + 2 names.** If the re-run lands anywhere in ±0.1 with
placebo pctile in the 0.2–0.8 band, that is the correct, honest outcome: **no skill, not
anti-skill** — the −0.218 was mix+noise, now de-biased. We should **not** chase the IC positive;
on this basket a near-zero, honestly-flagged result is the *win*.

**Which branch could ever lead, in principle?** Only the **tariff (S1, monthly revenue
catalyst)** and the **rate complex (`id_10y`)** have a forecast mechanism — the same spine that
works for Alt Energy. But Alt Energy has **6 names and a 327T mega-cap (BREN)** to give the
common factor signal-to-noise; this basket has **two β-0.08 micro-caps and n=53**. The mechanism
is the same; the **sample cannot support it.** Concede this explicitly.

**Look-ahead / leakage guards (must hold or even the negative result is fake):**
- CEIC tariff/consumption leaves are **publication-lagged** — at month *t* use only the print
  released by *t* (tariff ~1m; annual consumption ~1-2 quarters).
- **Tariff levels trend with inflation** → use **Δ / non-overlapping momentum**, not the level
  (a permanently-rising level looks permanently bullish — the macro-sentiment round-1 critique).
- **Consumption / PLN-sales LEVELS are endogenous** to system size → yoy/Δ only, weight-capped.
- **2-name basket:** the equal-weight return is a 50/50 blend of two illiquid names; ensure the
  walk-forward standardisation does not borrow cross-name info, and report n=53 with a **wide-CI
  flag** in the panel — never present the −0.218 as a point estimate without the CI.

---

## 9. Engine-wiring spec (`mapping.py`)

The goal is **honesty, not a manufactured IC**: align this micro-tail with the Alt-Energy power
spine (tariff revenue +1, rate duration −1, USD-PPA +1), **replace the mis-specified coal/gas
fuel with Brent (MPOW's real fuel)**, weight-cap the fuel leaf (TGRA is fuel-immune), and **flag
the basket as attribution/insufficient-sample**. Drop-in replacement for `SEED["Utilities"]`:

```python
"Utilities": {
    # Keep the broad Electricity pull (captures tariffs + annual consumption + hydro prod).
    "ceic": [("Energy", "Electricity")],

    # ANCHOR FIX: CEIC files every tariff as 'demand' (a consumer price). For a basket
    # of GENERATORS the tariff is REVENUE/kWh -> re-role supply +1, used as Δ not level.
    "ceic_override": [
        ("electricity tariff: industry",   "supply", +1),  # CEICI385762047
        ("electricity tariff: government",  "supply", +1),  # CEICI385762117 (the anchor family)
        ("electricity tariff: business",    "supply", +1),  # CEICI385762017
        ("production: plta",                "supply", +1),  # CEICI13527201 hydro availability (TGRA, attrib)
    ],

    # Endogenous / leaky: keep consumption but force yoy/Δ + low weight (engine-level),
    # and drop the no-mechanism billing-detail prepaid tariffs from the broad pull.
    "ceic_exclude": [
        "prepaid",          # CEICI3857621x7 prepaid VA-tier billing detail — not a price signal
        "reactive power",   # /kVArh billing-detail, not a price signal
        # NOTE: keep annual consumption/PLN-sales but engine must use yoy/Δ (low weight),
        #       NOT the raw endogenous system-size LEVEL.
    ],

    "globals": [
        # FUEL FIX: MPOW burns diesel/HSD (Brent-linked), NOT thermal coal / Henry-Hub gas.
        # Swap the two mis-specified cost leaves for Brent; weight-cap (TGRA is zero-fuel hydro).
        ("brent",      "cost", -1, "MPOW diesel/gasoil fuel cost (ICEEUR:BRN1! 800w) — TGRA fuel-immune, cap weight"),
        # OPTIONAL retain (de-emphasised) — general-energy correlate only, NOT a true fuel here:
        # ("wb_coal_au", "cost", -1, "weak energy correlate (neither name burns thermal coal)"),
    ],

    "macro": [
        # ---- DURATION / DISCOUNT-RATE channel (contracted-annuity bond proxies, beta~0.08) ----
        ("id_10y",      "macro", -1, "domestic discount rate on IDR PPA annuity + TGRA capex financing; LIQUID LEAD"),
        ("id_bi_rate",  "macro", -1, "policy rate: financing cost + tariff/subsidy regime"),
        ("us_10y",      "macro", -1, "global risk-free / EM discount-rate backdrop"),
        # ---- FX: USD-linked PPA revenue channel (sign +1, opposite to importers) ----
        ("usdidr",      "macro", +1, "USD-linked IPP PPA revenue -> weak IDR raises IDR revenue"),
        # ---- demand backdrop (attribution, low weight) ----
        ("id_gdp_real_q","demand", +1, "load-growth / electricity-intensity backdrop (attribution)"),
        # dxy intentionally NOT wired: resolver dxy->TVC:BBDXY is EMPTY (weekly_obs=0).
    ],
},
```

**New market resolver needed?** **No.** All ids already resolve: `brent→ICEEUR:BRN1!`,
`id_10y→TVC:ID10Y`, `id_bi_rate→ECONOMICS:IDINTR`, `us_10y→TVC:US10Y`, `usdidr→FX_IDC:USDIDR`,
`id_gdp_real_q→aIDGDPAR1`, `natgas→NYMEX:NG1!`, `wb_coal_au→ICEEUR:ATR1!`. (If `us_real_10y` is
ever wanted, note the Alt-Energy file already proposes adding `us_real_10y→DFII10`.)

**Falsifiable backtest plan.** The test is **diagnosis**, not chasing a positive IC:
1. **Baseline:** re-run `backtest/bt.py "Utilities"` on the *current* SEED → confirm the
   **−0.218 / pctile 0.05 / n=53** reproduces.
2. **Fuel-leaf ablation (the key diagnostic):** remove the coal+gas cost leaves entirely, keep
   the rest. **Expected:** IC moves **toward ~0** (not toward +0.22). **Confirms (a)+(b):** the
   fuel leaves were injecting fixed-sign noise on names that don't burn those fuels, not
   inverted real signal. If instead IC jumps to ≈+0.22, it *was* a clean sign-flip — investigate
   (unlikely given the a-priori-correct `−1 cost` signs).
3. **Apply the full fix:** Brent (capped) + tariff re-role (Δ) + `id_10y`/`id_bi_rate`/`usdidr`.
   **Expected (honest):** IC lands somewhere in **≈ −0.05…+0.10, placebo pctile 0.2–0.8** —
   i.e. **no skill, but no longer anti-predictive.** That is the **success criterion here**:
   the de-biased posture is mechanism-grounded and the spurious negative is gone.
4. **Sample-honesty gate:** regardless of (3), because **n_oos=53 and the basket is 2 names**,
   label the panel verdict **"attribution / insufficient-sample"** and surface the **±0.14 IC
   standard error** alongside the point estimate. **Do not** present a forecast claim — positive
   or negative — for this basket.

**Data-quality flags to surface in the panel:**
- ★ **−0.218 is mix+small-sample (n=53, 2 names, β≈0.08), not a trustworthy anti-signal** —
  flag as **attribution / insufficient-sample**, report the **±0.14 SE / wide CI**.
- **Fuel mis-specification (fixed):** coal/gas → **Brent** (MPOW diesel); **TGRA is zero-fuel
  hydro → fuel leaf weight-capped.**
- **Tariff** re-roled **supply +1**, consumed as **Δ/non-overlapping**, not level (anti-trend leak).
- **Duration channel** (`id_10y`, `id_bi_rate`, `us_10y`) + **USD/IDR +1** added — the basket had
  **no rate or FX leaf** before; it inherits the Alt-Energy power spine.
- **`TVC:BBDXY` (dxy) EMPTY (weekly_obs=0)** → not wired; use `TVC:DXY` (800w) if ever needed.
- Annual consumption / PLN-sales / hydro-production leaves are **P1Y (n26-40) → attribution,
  yoy/Δ, low weight**; prepaid VA-tier & reactive-power billing-detail tariffs **excluded**.

---

### Verification checklist before commit
- [ ] `build_worklist.py` → `controller.py --only "Utilities"` runs clean with the revised block.
- [ ] Fuel leaf re-pointed coal/gas → **Brent**, weight-capped (TGRA fuel-immune).
- [ ] Tariff re-roled **supply +1**, consumed as **Δ / non-overlapping**, not level.
- [ ] `id_10y` / `id_bi_rate` / `us_10y` / `usdidr(+1)` wired; `dxy` left unwired (empty resolver).
- [ ] All CEIC leaves publication-lagged; P1Y consumption/hydro leaves weight-capped (attribution); prepaid/reactive-power tariffs excluded.
- [ ] `backtest/bt.py "Utilities"` re-run; **fuel-ablation step (2) logged** to confirm mix+noise (IC → ~0) vs sign-flip (IC → +0.22).
- [ ] **Panel verdict labelled "attribution / insufficient-sample" (n=53, 2 names) with the ±0.14 IC SE surfaced** — no forecast claim made either direction.
```
