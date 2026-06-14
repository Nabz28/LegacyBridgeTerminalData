# Metals & Mining — driver-tree plan (`basic_materials_metals_mining`)

> Sector **Basic Materials** · sub_sector **Metals & Mining** · benchmark JCI ·
> total mcap **≈211T IDR** · 4 members · 55 CEIC candidates.
> Current state (`_state.txt` / `BACKTEST.md`): **grade `perfected`**, **kept 7
> drivers**, **blindfolded forward OOS = NONE** (fwd IC **+0.05**, in-sample IC
> +0.04, t≈0.67 → "weak", below the 0.08 SKILL bar and inside the placebo null).
> **This is the nickel-heavy basket.** The larger gold/copper "Mining" basket
> (`basic_materials_mining`: AMMN/MDKA/BRMS/NCKL…) is covered in its own plan.

---

## 1. Snapshot

**Members (4 names, equal-weight target — the engine uses `ret_eqw`):**

| symbol | name | what it does | mcap (IDR) | beta |
|---|---|---|---|---|
| **ANTM** | Aneka Tambang | SOE; **nickel ore + ferronickel** + **gold** refining/trading + bauxite | 74.3T | 0.88 |
| **INCO** | Vale Indonesia | pure-play **nickel-in-matte** (mine→smelter); Vale SA / MIND ID parent | 58.5T | 1.23 |
| **MBMA** | Merdeka Battery Materials | **nickel (RKEF NPI + HPAL/MHP)** for the EV-battery chain; Merdeka group | 52.1T | 0.92 |
| **TINS** | Timah | SOE; **refined tin** producer/exporter | 26.7T | 0.95 |

> **Brief vs reality.** The agent brief named INCO/ANTM/NCKL. The live worklist
> basket is **ANTM · INCO · MBMA · TINS** — NCKL (Harita) sits in the
> `basic_materials_mining` basket, not here. I use the **real worklist members**.
> The basket is **~3/4 nickel** (INCO + MBMA pure nickel, ANTM nickel-led with a
> gold sleeve) + **~1/8 tin** (TINS) + a gold/bauxite tail (ANTM). NICKEL is the
> dominant return axis; gold and tin are secondary, partly-offsetting sleeves.

**The gap (why forward-flat).** Three structural reasons, all fixable:
1. **No nickel price in the store.** `wb_nickel → None` in `GLOBAL_CORR` and there
   is **no LME nickel, no nickel future, no nickel ETF** anywhere in `market.json`
   (verified: a search for nickel/LME returns only `IDX:TINS`, `IDX:ANTM` etc. and
   the copper/platinum proxies). The single explicit revenue driver
   (`wb_nickel`, "supply +1") resolves to **no_history** → it scores nothing. The
   basket's primary price axis is **unwired**.
2. **The wired nickel signal is a lagging quantity, not a leading price.** The only
   directional nickel input today is `ceic_override("nickel","demand",+1)` applied
   to CEIC nickel **export-value** rows — which are publication-lagged (the engine
   `.shift(1)`s every CEIC series) → coincident/lagging, good for attribution, weak
   for forecasting.
3. **Sign-cancellation across sleeves.** Gold (risk-off, USD-inverse) and nickel
   (risk-on, China-cyclical) respond to **opposite** macro regimes; tin is its own
   micro-market. An equal-weight basket mixing them blunts any single coherent
   prior — the China-demand / USD priors that should drive 3/4 of the basket get
   diluted by the counter-cyclical gold sleeve. Hence flat.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (per name, then weighted):**

```
revenue ≈ Σ_metal [ realised_metal_price(USD) × sales_volume × USDIDR ]
```

- **INCO** — `nickel-in-matte_price × matte_tonnes × USDIDR`. Price is contractually
  ~ **LME nickel** less a matte payability discount. ~100% nickel, ~100% USD-linked.
  Cash cost is energy-heavy (was coal-fired drying + diesel; converting to gas/electric).
- **MBMA** — NPI/MHP revenue tracks **LME nickel + the NPI–LME and MHP payability
  spreads**; HPAL (MHP) adds a **cobalt** by-credit and an **EV-battery** demand story.
  Cost = ore + coal/electricity (RKEF is power-intensive) + reagents (HPAL).
- **ANTM** — split book: **ferronickel** (`FeNi_price≈f(LME Ni) × tonnes`), **nickel
  ore** (domestic HPM/HMA-referenced), and **gold** (trading + own mine; gold revenue
  ≈ `gold_price × volume`, a USD-inverse hedge inside the basket). Bauxite/alumina tail.
- **TINS** — `LME_tin_price × refined_tin_tonnes × USDIDR`; volume gated by
  government ore quota (RKAB) and illegal-mining crackdowns.

**Cost stack (the margin swing factor = energy + ore):**
- **Energy** — RKEF smelters and ore drying consume coal/electricity; haulage and
  generators burn **diesel**. Coal (API2 proxy) + diesel + WTI move AISC.
- **Ore feed** — internal for INCO/ANTM; MBMA buys third-party ore at HPM-referenced
  domestic prices (a function of the LME and the ore-ban policy).
- **USDIDR** — costs are largely IDR (labour, domestic coal, royalties) while revenue
  is USD → **IDR weakness is margin-accretive** (classic exporter).

**What a sell-side analyst actually watches (in order):**
1. **LME nickel price** + the **NPI–LME / matte / MHP payability spreads** (the real
   realised price; spreads blew out negative in 2023–24 as Indonesian NPI flooded).
2. The **Indonesian nickel-ore policy stack** — the **2020 ore-export ban**, **RKAB
   quota** approvals, the floated **HPM/royalty** changes, and any **OETC/production
   cap** signals. *This is the alpha variable*: it sets domestic ore price, smelter
   feed availability, and the global supply curve simultaneously.
3. **China stainless-steel output & PMI** (≈70% of nickel demand) + the **EV/battery**
   (HPAL → MHP → pCAM) demand leg.
4. **Coal/diesel** (AISC) and **USDIDR** (translation).
5. **Gold** (for the ANTM sleeve) and **LME tin** (for TINS) as secondary axes.

**Intra-basket dispersion.** INCO & MBMA are ~pure nickel-price beta (highest
correlation to LME Ni). ANTM is a nickel/gold hybrid — its gold leg gives it a
**partial negative** loading on the same risk-off moves that hurt INCO/MBMA. TINS is
a **tin** play almost orthogonal to nickel. So the basket's "clean" common factor is
nickel for 3/4 of weight, contaminated by gold (ANTM) and tin (TINS).

---

## 3. DEMAND driver tree

Leaf format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.

```
DEMAND (what lifts metal price × volume)
├── D1 China stainless / metals demand  (≈70% of nickel end-use)
│   ├── D1a China manuf. PMI ───────► cn_pmi_mfg = aCNPMIMT  · demand +1
│   ├── D1b China industrial output ─► cn_ip_yoy  = aCNIP     · demand +1
│   ├── D1c China PPI (metals infl.) ► cn_ppi_idx = aCNPPIAR  · demand +1
│   └── D1d China crude-steel/nickel prod (discoverable, see §6)
├── D2 EV / battery-metal demand  (HPAL→MHP→cathode; MBMA/INCO HPAL leg)
│   ├── D2a lithium/battery theme ──► AMEX:LIT (lithium ETF)  · demand +1
│   └── D2b nickel-proxy miners ────► IGO.AX / GLEN.L (see §5 new resolver)
├── D3 Realised nickel revenue (price × volume) — CEIC proxy
│   ├── D3a Ni export VALUE (USD) ──► CEICI356799402 Export value: Nickel & articles
│   ├── D3b Ferronickel export VAL ─► CEICI388026027 Export value: Ferro alloy nickel
│   └── D3c Unwrought/other Ni VAL ─► CEICI502593577 / CEICI502593637
└── D4 Global risk appetite / commodity beta
    ├── D4a broad commodity ────────► bcom = AMEX:DBC · demand +1
    └── D4b base-metals complex ────► DBB (base-metals ETF) · demand +1
```

**Leaves:**

- `aCNPMIMT` (China mfg PMI) · **demand +1** · **LEAD ~1–3m** · China stainless mills
  are the marginal nickel buyer; PMI turns before mill output and before realised Ni
  price. *Monthly, real-time-ish (NBS), already wired via `cn_pmi_mfg`.* **Forecast candidate.**
- `aCNIP` (China IP YoY) · **demand +1** · **LEAD ~1–2m** · industrial throughput →
  metal offtake. *Monthly, ~2–4w pub lag.* Coincident-to-leading.
- `aCNPPIAR` (China PPI YoY) · **demand +1** · **LEAD ~1m** · metals-heavy PPI proxies
  China pricing power / restock impulse. *Monthly.* Coincident.
- `AMEX:LIT` (lithium/battery ETF) · **demand +1** · **LEAD 0–1m (price)** · liquid
  proxy for the **EV-battery theme** that underwrites HPAL/MHP economics (MBMA/INCO).
  *Weekly, wk=800.* **Forecast candidate (liquid price).**
- `CEICI356799402` Export value: Nickel & articles (USD th, **n=155, P1M**) · **demand
  +1 (override)** · **LEAD negative ~ −1m (lagging)** · USD export value ≈ price×volume,
  the best in-store nickel-revenue proxy. *Pub-lagged + engine `.shift(1)` → lagging →
  attribution only.*
- `CEICI388026027` Export value: Ferro alloy nickel (USD mn, **n=112, P1M**) · **demand
  +1 (override)** · **lagging** · ferronickel is ANTM's product line specifically.
  *Monthly, lagged → attribution.*
- `AMEX:DBC` (`bcom`) · **demand +1** · **LEAD 0–1m** · broad commodity beta. *Weekly.*
- `DBB` (Invesco DB Base Metals: Al/Zn/Cu) · **demand +1** · **LEAD 0–1m** · base-metals
  ETF — *contains no nickel* but co-moves with the China-metals cycle that drives Ni.
  *Weekly, wk=800.* **Forecast candidate.**

> **Demand-side forecast hypothesis:** the *leading* demand branch is **China
> PMI/IP + the liquid battery/base-metals ETFs (LIT, DBB, DBC)**; the CEIC nickel
> export-value rows are **coincident/lagging attribution**, not forecasters.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST
├── S1 Nickel-ore POLICY (the alpha variable — structural, not a market series)
│   ├── S1a Ore-export BAN (2020) ──► proxied by ore-export-volume COLLAPSE:
│   │        CEICI252993102 Nickel ore export volume (Ton, P1Y, n=23)
│   ├── S1b RKAB quota / domestic feed ► CEICI252985202 Nickel ore mining volume (n=28)
│   └── S1c Antam ore production ─────► CEICI294139602 Antam nickel (WMT, P1M, n=111)
├── S2 Own output / smelter ramp (volume side of revenue)
│   ├── S2a Antam Ni production ─────► CEICI294139602 (P1M, n=111) · supply
│   └── S2b Bauxite/alumina (ANTM) ──► CEICI294140302 Bauxite (Metric Ton, P1M, n=105)
├── S3 ENERGY / AISC cost stack
│   ├── S3a thermal coal (RKEF/dryer) ► wb_coal_au = ICEEUR:ATR1! (API2) · cost −1
│   ├── S3b diesel/gasoil (haulage) ──► heating_oil = NYMEX:HO1! · cost −1
│   └── S3c crude (energy complex) ───► wti = NYMEX:CL1! · cost −1
└── S4 Adjacent-metal supply (own-price for the non-nickel sleeves)
    ├── S4a aluminium (ANTM alumina) ─► aluminum = COMEX:ALI1! · supply +1
    └── S4b gold (ANTM sleeve) ───────► gold = COMEX:GC1! · supply +1 (USD-inverse)
```

**Leaves:**

- **Policy (S1) — no clean market series; proxied by ore quantities.** The
  **nickel-ore-export ban + RKAB quota** is the single biggest price/margin driver
  (it created the Indonesian NPI/HPAL build-out, crushed the NPI–LME spread, and
  gates every name's feed). There is **no tradable policy series**; the engine can
  only *attribute* to it via the ore-volume prints:
  - `CEICI252993102` Nickel ore export volume (Ton, **P1Y, n=23**) · **supply** ·
    the ban shows up as this series → ~0 post-2020. *Annual → too coarse to forecast;
    structural-break dummy territory, attribution only.*
  - `CEICI252985202` Nickel ore mining volume (Ton, **P1Y, n=28**) · **supply +1** ·
    domestic feed availability. *Annual, lagging.*
  - `CEICI294139602` Mineral production: Antam nickel (WMT, **P1M, n=111**) · **supply
    +1** · the only **monthly** own-production series — usable. *Pub-lagged → coincident.*
- **Energy / AISC (S3) — all liquid, leading, already in `GLOBAL_CORR`:**
  - `ICEEUR:ATR1!` API2 coal (wk=782) · **cost −1** · **LEAD 0–1m** · RKEF + ore-drying
    energy. **Forecast candidate.**
  - `NYMEX:HO1!` heating-oil/diesel proxy (wk=800) · **cost −1** · **LEAD 0–1m** ·
    haulage/genset fuel. **Forecast candidate.**
  - `NYMEX:CL1!` WTI (wk=800) · **cost −1** · energy-complex co-move.
- **Adjacent metals (S4):**
  - `COMEX:ALI1!` aluminium (wk=621) · **supply +1** · ANTM alumina + base-metals beta.
  - `COMEX:GC1!` gold (wk=800) · **supply +1** · ANTM's **gold sleeve revenue**; note
    its macro driver (risk-off/real-yields) is **opposite** to nickel → the within-basket
    hedge that flattens the common factor (see §8 split recommendation).

> **Supply-side forecast hypothesis:** the *forecastable* supply branch is the
> **energy/AISC cost stack (API2, diesel, WTI)** — liquid, leading, margin-relevant.
> The **policy/ore branch is the dominant driver but is unforecastable from the
> data we hold** (annual prints, no policy series) — it is a **structural-break /
> regime variable**, best handled as attribution + a documented dummy, not a signal.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 USD revenue translation ──► usdidr = FX_IDC:USDIDR · macro +1
├── M2 broad USD / EM flow ──────► dxy = TVC:BBDXY · macro −1
├── M3 China cyclical pulse ─────► cn_pmi_mfg / cn_ip_yoy (shared with D1)
├── M4 nickel-PRICE proxy (NEW) ─► nickel-proxy global equities (resolver, see below)
└── M5 risk-free / discount ─────► us_10y = TVC:US10Y · macro 0 (ambiguous for cyclicals)
```

- `usdidr` (`FX_IDC:USDIDR`) · **macro +1** · **LEAD 0–1m** · USD-priced metal revenue
  vs IDR cost base → IDR weakness lifts margins. *Weekly, real-time.* **Forecast candidate.**
- `dxy` (`TVC:BBDXY`) · **macro −1** · **LEAD 0–1m** · broad USD strength caps USD
  metals and pressures EM flows; *also* the dominant **gold** driver (so the −1 is
  ambiguous on the ANTM gold sleeve — another argument to split). *Weekly.*
- `cn_pmi_mfg`, `cn_ip_yoy` — shared with demand tree; the cleanest leading macro for
  the nickel 3/4 of the book.
- `us_10y` (`TVC:US10Y`) · **macro 0** · cyclical-vs-duration ambiguous; leave neutral.

### NEW RESOLVER — the concrete fix for the nickel-price gap (§7/§9)

There is **no nickel commodity price** in the store, but `market.json` holds **liquid,
deep-weekly-history global nickel-producer equities** that are ~clean nickel-price
betas and are **exogenous to the IDX basket** (different listings/index):

| proposed `GLOBAL_CORR` key | market id | wk_obs | what it is / why it's a Ni-price proxy |
|---|---|---|---|
| `nickel_px_igo` | `IGO.AX` | **801** | IGO Ltd — **pure-play AU nickel/lithium** miner; tightest listed Ni-price beta |
| `nickel_px_glen` | `GLEN.L` | **781** | Glencore — top-5 global nickel producer (diversified) |
| `nickel_px_vale` | `NYSE:VALE` | **800** | Vale SA — INCO's parent; large nickel division |
| `nickel_px_bhp` | `BHP.AX` | **801** | BHP (Nickel West) — diversified Ni exposure |
| (battery theme) | `AMEX:LIT` | 800 | lithium/battery ETF — EV-demand leg for HPAL |

These satisfy the resolver's ≥30-weekly-obs gate trivially. They are **leading,
liquid price proxies** — exactly the class the backtest says forecasts. Best single
choice: **`IGO.AX`** (purest nickel beta); use `GLEN.L`/`VALE` as cross-checks or a
small composite. Wire as **`supply +1`** (a rise in nickel-producer equities ≈ a rise
in the nickel-price expectation that lifts INCO/MBMA/ANTM).

> Caveat to honour: a producer *equity* carries its own market beta (global risk) on
> top of the nickel signal. It is a far better proxy than `None`, but tag it
> `supply` with the understanding that part of its variance is global-equity beta;
> the backtest will tell us if the net is a forecaster.

---

## 6. Cross-industry linkages (series borrowed from other categories)

- **China steel/nickel production (CEIC China block, `cn.json`)** — borrowed as the
  *demand* input for nickel. Discoverable, monthly, not yet wired via `GLOBAL_CORR`:
  - `aCNCNREZD` — **China Nickel production** (Industrial Production & Utilization).
  - `aCNPDCRDS` — China crude-steel production (NBS official, P1M); `aCNCNBFWHM`
    crude-steel production (national).
  - `aCNCNOFOSM` — **China imports of HS75 nickel from Indonesia** (the offtake link).
  *These aren't `GLOBAL_CORR` keys today; they're reachable via the China-macro path
  if a key is added. Lower priority than the liquid ETFs/equities — same demand signal,
  slower print. Listed so the quant knows the direct-nickel China series exist.*
- **Energy block (Coal / Crude Oil)** — already borrowed as the AISC cost stack
  (API2 `ICEEUR:ATR1!`, diesel `NYMEX:HO1!`, WTI `NYMEX:CL1!`).
- **Basic Materials → Gold & Precious Metals / Tin** — the `gold` and (absent) tin
  prices belong to *adjacent* sub-industries but are this basket's own-revenue for the
  ANTM-gold and TINS sleeves. **Tin has the same gap as nickel: `wb_tin → None` and no
  LME-tin in `market.json`.** Best available tin proxy = the constituent `IDX:TINS`
  itself (endogenous — exclude) → tin is effectively **unobservable**; TINS revenue can
  only be attributed via `CEICI252986902 Value: Tin (IDR bn, P1Y, n=26)` (annual, weak).

---

## 7. Currently-wired vs available

**Wired now** (`mapping.py` `SEED["Metals & Mining"]`, kept-7 in the backtest):

| driver | role/sign | status | issue |
|---|---|---|---|
| `wb_nickel` | supply +1 | **DEAD (no_history)** | `→ None`; **the primary revenue axis scores nothing** |
| `aluminum` (`COMEX:ALI1!`) | supply +1 | live | minor exposure, fine |
| `cn_pmi_mfg` (`aCNPMIMT`) | demand +1 | live | good leading driver |
| `cn_ip_yoy` (`aCNIP`) | demand +1 | live | good |
| `usdidr` | macro +1 | live | good |
| `ceic_override("nickel","demand",+1)` | demand +1 | live | applies to nickel export VALUE/volume rows → **lagging attribution** |
| `ceic: Metals & Mining + Basic Materials/Nickel` | mixed | live | mostly P1Y supply rows, sign 0 → little signal |

**Available but NOT wired (prioritised — the "what we COULD add"):**

| priority | add | role/sign | why | forecast? |
|---|---|---|---|---|
| **P0** | **`IGO.AX` (new `nickel_px_igo`)** | supply +1 | **fixes the nickel-price gap** — liquid leading Ni beta | **yes** |
| P0 | `GLEN.L` / `NYSE:VALE` (cross-check / composite) | supply +1 | redundancy on the Ni proxy | yes |
| **P1** | `wb_coal_au` `ICEEUR:ATR1!` | cost −1 | **AISC** (RKEF/dryer energy) — missing entirely today | yes |
| P1 | `heating_oil` `NYMEX:HO1!` | cost −1 | diesel/haulage AISC | yes |
| P1 | `dxy` `TVC:BBDXY` | macro −1 | USD/EM-flow headwind on USD metals | yes |
| P2 | `AMEX:LIT` | demand +1 | EV-battery (HPAL/MHP) demand leg | yes |
| P2 | `DBB` / `bcom` `AMEX:DBC` | demand +1 | base-metals / broad commodity beta | yes |
| P2 | `gold` `COMEX:GC1!` | supply +1 | **ANTM gold-sleeve revenue** (but see split) | yes |
| P3 | `CEICI294139602` Antam Ni prod (P1M, n=111) | supply +1 | monthly own-volume (attribution) | no (lagging) |
| P3 | `aCNCNREZD` / `aCNPDCRDS` China Ni/steel prod | demand +1 | direct China offtake (slow print) | partial |

**Current bugs called out:**
1. `wb_nickel → None` — **the headline driver is dead**. Replace with the equity proxy.
2. `wb_tin → None` and no LME-tin in store — **TINS is unobservable**; tin attribution
   only via annual CEIC value (n=26).
3. The `ceic_override("nickel","demand",+1)` only re-roles; it still feeds *lagged*
   CEIC value/volume → attribution, never a forecaster. Don't mistake it for the price.
4. No **AISC/energy cost branch** wired at all (coal/diesel) despite energy being the
   margin swing factor.

---

## 8. Forecastability

**What the OOS backtest says:** fwd IC **+0.05** (in-sample +0.04), t≈0.67, inside the
placebo null → **NONE/weak**. The basket is, today, a **beta/attribution** map, not a
forecaster. The driver that *should* carry the forecast (nickel price) is unwired; the
nickel signal that *is* wired (CEIC export value) is structurally lagging.

**Which branches should LEAD, and why:**
- **LEAD (forecast candidates):** the **nickel-producer equity proxy** (`IGO.AX` et al.,
  daily/weekly, price-leading), **China PMI** (`aCNPMIMT`, turns before mill output),
  **USDIDR / DXY** (real-time FX), **API2 coal + diesel** (real-time AISC), **LIT/DBB**
  (liquid theme/base-metals). These are exogenous, liquid, *price* series → the class
  the backtest rewards.
- **LAG (attribution only):** every CEIC nickel/ore/gold/tin **quantity** row — they are
  publication-lagged *and* the engine `.shift(1)`s them; the annual (P1Y) ore/policy
  rows are far too coarse to forecast and only serve as structural-break attribution.

**Contemporaneous vs forward.** The basket explains returns reasonably in-sample
(metals beta is real) but the explanatory power lives in *contemporaneous* price
co-movement. To convert explanation → forecast we need a **leading price** for the
dominant metal. We finally have a usable one (`IGO.AX`), so the path is open.

**What would move it from explainer → forecaster:**
1. **Wire the `IGO.AX` nickel-price proxy** (P0) so the basket has a leading price axis.
2. **Add the energy/AISC cost branch** (API2 + diesel, P1) so margin direction is modelled.
3. **Split the basket** (below) so the China/USD priors aren't diluted by the gold sleeve.
4. Keep CEIC ore/export rows as **attribution**, not signal; treat the **ore-ban/RKAB
   policy as a documented structural-break dummy**, not a forecastable series.

**Honest concession on the gold sleeve & the split question.** ANTM's gold leg and
TINS's tin micro-market load on *different* (often opposing) macro regimes than nickel.
Recommendation: **conceptually split nickel vs gold**. The ideal is two sub-baskets —
a **clean nickel** book (`INCO`, `MBMA`, ANTM-nickel) and a **gold/tin** tail — so the
nickel China/USD/AISC priors aren't cancelled. Because the engine keys baskets by
`sub_sector` (one entry per worklist basket) and we are **read-only on mapping.py and
the worklist**, a true membership split is out of scope here; the *implementable*
mitigation is to **add `gold` as its own `supply +1` leaf and lean the China/AISC
priors toward the nickel majority**, then let the backtest weigh them. Flag a future
worklist change to carve a dedicated nickel basket as the real fix.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

> Read-only on `mapping.py` for this task — this is the spec the quant implements.

**(a) New resolver in `GLOBAL_CORR`** (close the nickel-price gap):

```python
# nickel has no commodity series in-store (wb_nickel -> None and no LME/future/ETF
# in market.json). Use a liquid, deep-weekly global nickel-producer equity as the
# leading price proxy. IGO is the purest Ni beta; GLEN/VALE are diversified backups.
"nickel_px": "IGO.AX",          # wk=801, pure-play AU nickel/lithium
"nickel_px_alt": "GLEN.L",      # wk=781, Glencore (backup / composite)
# (keep wb_nickel -> None; it is now dead and can be dropped from the seed)
```

**(b) Replace the dead `wb_nickel` in `SEED["Metals & Mining"]["globals"]`:**

```python
"globals": [
    ("nickel_px",  "supply", +1, "nickel price proxy (IGO.AX) — no LME nickel in store"),
    ("aluminum",   "supply", +1, "aluminium / base-metals beta (ANTM alumina)"),
    ("gold",       "supply", +1, "ANTM gold-sleeve revenue (USD-inverse; partial hedge)"),
    ("wb_coal_au", "cost",   -1, "API2 coal = RKEF/ore-drying energy (AISC)"),
    ("heating_oil","cost",   -1, "diesel/haulage fuel (AISC)"),
    ("bcom",       "demand", +1, "broad commodity / base-metals cycle"),
],
```

**(c) Extend `macro`:**

```python
"macro": [
    ("cn_pmi_mfg", "demand", +1, "China stainless/nickel demand (leading)"),
    ("cn_ip_yoy",  "demand", +1, "China metals demand"),
    ("usdidr",     "macro",  +1, "USD metal revenue vs IDR cost"),
    ("dxy",        "macro",  -1, "broad USD / EM-flow headwind on USD metals"),
],
```

**(d) `ceic` categories** — keep `[("Metals & Mining", None), ("Basic Materials",
"Nickel")]`. Optionally add `("Basic Materials", "Tin")` so TINS gets *some*
attribution (annual value rows), accepting they're lagging.

**(e) `ceic_override`** — keep `("nickel","demand",+1)`; add `("ferro alloy nickel",
"demand",+1)` and `("antam nickel","supply",+1)` so the **monthly** Antam production
row (`CEICI294139602`) is treated as a (lagging) own-volume supply driver rather than
defaulting to sign 0. Add `("tin","supply",+1)` for the TINS sleeve.

**(f) `ceic_exclude`** — exclude **endogenous own-output level** rows that mechanically
co-move with the basket's own price rather than forecast it. The export *value* rows
are price×volume (informative) so keep them; consider excluding the pure **stock/
beginning-stock** annual rows (`"beginning stock"`, `"end stock"`, `"total stock"`) as
non-causal inventory noise:

```python
"ceic_exclude": ["beginning stock", "end stock", "stock value", "total stock"],
```

**(g) Falsifiable backtest plan** (`backtest/bt.py "Metals & Mining"` after rebuild):
1. **Add `nickel_px` (IGO.AX) alone**, rerun OOS. **Hypothesis:** fwd IC rises from
   +0.05 toward/above **0.08** (SKILL) — a leading nickel-price axis should add real
   forward skill. *Confirm:* IC up AND ≥80th placebo pctile. *Falsify:* IC flat/down →
   the equity-beta contamination dominates the nickel signal; fall back to `GLEN.L`
   composite or demote to attribution.
2. **Add the AISC cost branch** (`wb_coal_au` + `heating_oil`, cost −1). **Hypothesis:**
   margin-direction modelling adds incremental IC (the cost stack was entirely missing).
3. **Add `dxy` −1 + `gold` +1.** **Hypothesis:** small net positive; if `gold`'s
   opposite macro loading *reduces* IC, that is the quantitative evidence for the
   **nickel-vs-gold basket split** — escalate a worklist change to carve a dedicated
   nickel basket (`INCO/MBMA/ANTM`) from the gold/tin tail.
4. Keep any change **only if forward IC improves or holds with a more honest tree**
   (per IMPROVEMENT_PLAN §6) — never an in-sample-only lift.

---

### 4-line summary
- **Tree:** ~8 demand leaves (China PMI/IP/PPI + LIT/DBB/DBC + lagged CEIC Ni export
  value) · ~9 supply/cost leaves (ore-policy/Antam-prod CEIC + API2/diesel/WTI AISC +
  Al/gold) · 4 macro leaves (USDIDR/DXY + China pulse).
- **Key forecast hypothesis:** the basket is forward-flat because its dominant axis —
  **nickel price** — is unwired (`wb_nickel→None`); wiring a **liquid leading
  nickel-producer-equity proxy (`IGO.AX`, wk=801)** + the **API2/diesel AISC cost
  branch** should move fwd IC from +0.05 toward the 0.08 SKILL bar.
- **Data bugs found:** `wb_nickel→None` **and no LME-nickel / nickel-future / nickel-ETF
  anywhere in `market.json`** (the headline driver scores nothing); same gap for tin
  (`wb_tin→None`, no LME-tin) → **TINS is effectively unobservable** (annual CEIC value only).
- **Structure call:** the **ore-export-ban / RKAB quota is the alpha variable but is
  unforecastable from our data** (annual prints, no policy series) → handle as
  attribution/structural-break dummy; and **recommend splitting nickel vs gold** —
  ANTM's gold sleeve loads on the opposite macro regime and dilutes the nickel priors.
