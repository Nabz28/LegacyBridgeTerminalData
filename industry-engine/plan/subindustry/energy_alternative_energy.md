# Alternative Energy (Energy) — Driver-Tree Plan

> Detail file for the LBC Industry Driver Engine. Follows the §4 template in
> `plan/IMPROVEMENT_PLAN.md`. Every series cited is confirmed in
> `plan/catalog/{idind,id,market}.json` with its real RIC and n_obs. This is a
> reference doc a quant implements `mapping.py` from — not prose for its own sake.
> **Basket id:** `energy_alternative_energy` · **sub_sector:** Alternative Energy.

---

## 1. Snapshot

| | |
|---|---|
| **Sub-industry** | Alternative Energy (Energy) — Indonesian regulated/IPP power generators + geothermal |
| **mcap** | ~402T IDR (Tier-A, 5th-largest of 52) — but **81.5% of the cap is BREN alone** (327.8T of 401.8T). |
| **Members (6)** | **BREN** (Barito Renewables — geothermal mega-cap, 327.8T, β 0.71; the basket *is* BREN by weight). **PGEO** (Pertamina Geothermal Energy — 38.8T, β **−0.71**, the contrarian sleeve). **ARKO** (Arkora Hydro — 18.5T mini-hydro IPP, β 0.94). **POWR** (Cikarang Listrindo — 11.1T captive-industrial-estate IPP, β 0.06, the regulated-utility anchor). **KEEN** (Kencana Energi Lestari — 3.2T hydro IPP, β n/a). **OASA** (Wijaya Karya Rekind / micro mini-hydro & off-grid — 2.5T, β 0.41). |
| **Current grade** | `needs_review` · confidence **low** (n_oos 64, short — BREN/PGEO/ARKO are 2023–24 IPOs). |
| **Current kept drivers** | **4** survive of 4 mapped — `ceic:[("Energy","Electricity")]`, globals `lithium_etf(+1)`, `wb_coal_au(cost −1)`; macro `us_10y(−1)`, `ndx(+1)`. The **tariff anchor, geothermal output, PLN demand, and the bond-proxy rate channel are all unwired.** |
| **Current forward OOS** | **fwd IC +0.23 · placebo pctile 1.00 → flag SKILL** (3rd-highest IC in the universe). BUT **hit−up −0.03** and **n_oos 64** — the skill is *direction-of-sign across the panel*, not a hit-rate on up-months, and the window is short. See §8 for the honest read: the anchor (govt electricity tariff, p=8e-5) is real, but BREN's idiosyncratic momentum inflates the headline. |

**The gap.** This is the *inverse* of Property. Property is `perfected` in-sample yet ✗ OOS;
Alternative Energy is `needs_review` yet **already shows OOS skill (+0.23)** — the engine
stumbled onto a genuine anchor (the **government electricity tariff**, the regulated-IPP
revenue driver, validated at **p=8e-5**) almost by accident, through the broad
`("Energy","Electricity")` CEIC pull. The job here is **not to find skill — it is to
make the existing skill robust, honest, and theory-grounded** before BREN's momentum
or the short OOS window flips it. Three structural problems to fix:

1. **The tariff is mis-roled.** CEIC tags every tariff series `demand` (it is a price a
   *consumer* pays). But for this basket of *generators*, a higher regulated tariff is
   **revenue per kWh = `supply, +1`**, not demand. The engine currently leans on whatever
   sign the broad pull assigns; we must **re-role the tariff `supply +1`** explicitly.
2. **The CEIC pull is too narrow.** `("Energy","Electricity")` captures tariffs + annual
   consumption + hydro production, but **misses geothermal output** (`Electricity Generation`
   subcategory) and **geothermal/renewable installed capacity** (`Power Plant Capacity`
   subcategory) — the supply-volume side for the geothermal mega-caps (BREN/PGEO).
3. **The rate channel is half-built.** These are **bond-proxy, long-duration regulated
   annuities** (POWR/PGEO especially). `us_10y` is wired but the *domestic* discount rate
   `id_10y` and the *real* long-duration rate `DFII10` (the cleanest renewable-capex /
   growth-duration proxy) are not. `dxy` is *not* wired here, which is correct because the
   resolver points at the **empty** `TVC:BBDXY` — but `TVC:DXY` is available and unused.

---

## 2. Economic structure — how IDX power generators make money

The basket is **regulated/contracted electricity generation**, and the revenue identity
is unusually clean and *un-cyclical* compared with the rest of the Energy sector
(Coal/Oil&Gas trade on global commodity prices; these names trade on **tariffs, take-or-pay
PPAs, and discount rates**).

**Revenue identity (per name archetype):**

```
revenue = regulated tariff (IDR/kWh)  ×  volume dispatched (kWh)
            │                              │
   government/regulator sets it       PPA take-or-pay (PLN offtake) or captive demand
   (CEIC tariff series — the ANCHOR)   (PLN sales / consumption — slow, lagging)
```

- **POWR (Cikarang Listrindo)** — captive IPP selling to ~2,500 factories in the Cikarang
  industrial estate + a PPA with PLN. Revenue ≈ **tariff × industrial offtake**; gas/coal is
  the cost. β 0.06 → almost a pure **regulated annuity / bond proxy**.
- **PGEO (Pertamina Geothermal)** — geothermal generation under **take-or-pay PPAs with PLN
  priced in USD**. Near-zero fuel cost (the steam is free); revenue is **capacity-factor ×
  contracted tariff**. β **−0.71** → trades *against* the high-beta complex; behaves like a
  USD-linked, rate-sensitive infrastructure bond. The basket's natural hedge sleeve.
- **BREN (Barito Renewables)** — the largest geothermal operator (Star Energy assets), same
  take-or-pay USD-PPA economics as PGEO but **momentum-driven and richly valued**; 81.5% of
  basket mcap. Its return is dominated by **idiosyncratic float/index-inclusion momentum**,
  not by the macro tree (see §8). This is the single biggest caveat in the file.
- **ARKO / KEEN / OASA** — run-of-river **mini-hydro IPPs** with PLN PPAs. Revenue ≈
  **tariff × hydro availability** (rainfall-dependent capacity factor). Small, illiquid,
  high-beta micro-caps.

**The cost stack is thin and inverted vs the rest of Energy:**
- **Geothermal/hydro (BREN, PGEO, ARKO, KEEN, OASA): fuel cost ≈ 0.** Steam and water are
  free. The cost stack is **capex + financing** (long-duration debt) and **O&M**. This is why
  these are **rate-sensitive duration assets, not commodity plays** — a falling long-end yield
  re-rates them up (cheaper financing of a fixed annuity), the same mechanics as a REIT/toll-road.
- **POWR (gas/coal-fired): fuel ≈ 50-60% of cost** → coal/gas price is a genuine **cost** leaf
  for POWR only, and a **substitution/alternative-cost signal** for the geothermal names
  (expensive thermal alternative makes regulated renewable PPAs and tariff hikes more likely).

**The margin swing factor** is therefore the **tariff-vs-cost spread**: the government sets
the regulated tariff (the revenue anchor); fuel/financing set the cost. For the geothermal
mega-caps the swing is almost entirely **(tariff, USD-PPA) × (long-duration discount rate)**;
for POWR it is **(tariff − fuel cost)**.

**What a sell-side analyst watches:** (1) the **government tariff adjustment** (TDL / tariff
penyesuaian — the regulated revenue catalyst, the anchor here); (2) **PLN's financial health
& offtake** (counterparty risk on every PPA); (3) **the long-end rate** (DFII10 / id_10y —
the discount rate on a fixed annuity); (4) **geothermal capacity-factor / new MW commissioned**
(BREN/PGEO volume growth); (5) **the USD/IDR** (USD-denominated PPA revenue for PGEO/BREN);
(6) for the renewable theme broadly, the **lithium/storage and clean-energy equity beta**.

**Intra-basket dispersion is extreme and must be stated up front.** This is *not* a
homogeneous basket: BREN (81.5% weight, momentum, β 0.71) and PGEO (β **−0.71**) are
*negatively correlated*; POWR is a β-0.06 bond proxy. An equal-weighted basket signal is
dominated by BREN's float momentum, while a cap-weighted view is 80%+ one stock. The macro
tree explains the **regulated-IPP commonality** (tariff, rates, PLN demand) — it cannot
explain BREN's index-momentum, which is the dominant variance component.

---

## 3. DEMAND driver tree

Legend per leaf: **series RIC** · role · **sign** (on excess return vs JCI) · **LEAD
(months)** · mechanism · data quality. **[FORECAST]** = leading branch expected to carry
forward OOS skill; **[ATTRIB]** = coincident/lagging (explanation, weak prediction).
`n` = n_obs. **Note:** for a basket of *generators*, the regulated tariff is REVENUE, so it
sits on the **supply/revenue** side conceptually but CEIC files it under "Electricity demand";
it is broken out as the primary **revenue anchor** in §4. Pure end-user demand (consumption
volume, PLN offtake) is below.

```
DEMAND  (electricity offtake / volume the generators dispatch)
├── D1  PLN OFFTAKE / SYSTEM DEMAND  (the volume the PPAs absorb)
│   ├── D1a  Electricity sales: Total       ── CEICI254246202 (PLN sales vol, Total)
│   ├── D1b  Electricity sales: Industrial  ── CEICI254246602 (PLN sales vol, Industrial)
│   ├── D1c  Consumption: Industrial        ── CEICI13523401 / CEICI13528901
│   └── D1d  Consumption: Total             ── CEICI13522901 / CEICI13528701
├── D2  ELECTRICITY-INTENSITY OF THE ECONOMY  (the macro demand backdrop)
│   ├── D2a  Electricity & Gas Supply GDP   ── CEIC365752037 (real, P3M)
│   ├── D2b  Industrial production / IP yoy ── id-macro (manuf. demand for power)
│   └── D2c  Real GDP yoy                   ── id_gdp_real_q / aIDGDPAR1
└── D3  RENEWABLE / CLEAN-ENERGY THEME DEMAND  (equity-beta + policy pull)
    ├── D3a  Lithium/storage theme          ── lithium_etf / AMEX:LIT (800w)
    └── D3b  Global clean-energy growth beta ── ndx / NASDAQ:NDX
```

### D1 — PLN offtake / system demand (the volume side) — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D1a Electricity sales: Total | `CEICI254246202` (Electricity: Sales: Annual: Volume: Total) n26 | demand | +1 | **lags (−)** | total kWh PLN sold = system volume the PPAs feed. | **P1Y, n26** — annual, ~1-2q pub-lag. **[ATTRIB]** |
| D1b Electricity sales: Industrial | `CEICI254246602` (Sales: Industrial) n26 | demand | +1 | lags | industrial offtake — POWR's captive demand read-through. | P1Y, n26. **[ATTRIB]** |
| D1c Consumption: Industrial | `CEICI13523401` (Consumption: Annual: Industrial) n40 / `CEICI13528901` (kWh bn) n32 | demand | +1 | lags | manufacturing electricity pull = utilisation. | P1Y, n40/n32. **[ATTRIB]** |
| D1d Consumption: Total | `CEICI13522901` (Consumption: Annual: Total) n40 / `CEICI13528701` (kWh bn) n32 | demand | +1 | lags | national electrification + load growth (~5%/yr structural). | P1Y, n40/n32. **[ATTRIB]** |

> **Whole D1 branch is annual (P1Y) → pure attribution.** These confirm the structural
> ~5%/yr load-growth story but are far too slow to forecast a monthly equity return. Keep
> them low-weight; they exist to *explain* the regulated-volume backdrop, not to predict.

### D2 — Electricity-intensity / macro demand backdrop — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D2a Electricity & Gas Supply GDP | `CEIC365752037` (GDP: SNA2008 2010p: Electricity & Gas Supply) n73 | demand | +1 | coincident | the national-accounts value-add of the power sector itself. | **P3M, n73** — quarterly, ~2m lag. **[ATTRIB]** |
| D2b Industrial production | `id_gdp_real_q` proxy / IP yoy | demand | +1 | coincident | factory power demand. | P3M. **[ATTRIB]** |
| D2c Real GDP yoy | `id_gdp_real_q` / `aIDGDPAR1` | demand | +1 | coincident | income/activity → load growth. | P3M. **[ATTRIB]** |

### D3 — Renewable / clean-energy theme demand (equity beta + policy pull) — **[FORECAST, beta]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| D3a Lithium/storage theme | `lithium_etf` → `AMEX:LIT` **800w** | demand | **+1** | 0-1m | global storage/renewable equity theme; sets the clean-energy risk appetite that BREN/PGEO trade with. Liquid, real-time. | W, 800w, live. **[FORECAST, beta]** (currently wired) |
| D3b Global growth beta | `ndx` → `NASDAQ:NDX` | demand | +1 | 0-1m | long-duration growth-equity beta — clean energy is a long-duration story. | W, live. **[FORECAST, beta]** (currently wired) |

> **D3 is a beta/risk-appetite proxy, not a fundamental demand driver.** `AMEX:LIT` does not
> drive Indonesian electricity offtake — it captures the *global clean-energy equity factor*
> the geothermal names are loosely indexed to. It forecasts only insofar as that factor has
> short-horizon momentum. Keep it, but it is **not** the source of the +0.23 skill (the tariff is).

---

## 4. SUPPLY / COST / REVENUE driver tree

This is the heart of the basket. The **regulated tariff is the revenue anchor** (the p=8e-5
signal), geothermal **output/capacity** is the volume side of the mega-caps, and **fuel cost**
matters only for POWR (+ as a substitution signal for the rest).

```
SUPPLY / COST / REVENUE
├── S1  REGULATED TARIFF  ★ THE ANCHOR — IPP revenue per kWh (p=8e-5)
│   ├── S1a  Tariff: Government Inst (peak) ── CEICI385762107 (n138)
│   ├── S1b  Tariff: Government Inst (offpk) ── CEICI385762117 (n138)   ← brief's "government tariff"
│   ├── S1c  Tariff: Industry I3           ── CEICI385762047 (n138)
│   └── S1d  Tariff: Business B3           ── CEICI385762017 (n146)
├── S2  GEOTHERMAL / RENEWABLE OUTPUT & CAPACITY  (BREN/PGEO volume side)
│   ├── S2a  Geothermal generation        ── CEICI254225602 (Geo: Indonesia Power, MWh)
│   ├── S2b  Geothermal installed cap     ── CEICI254262202 (Installed Cap: Geo, MW)
│   ├── S2c  Renewable cap: Geothermal     ── CEICI548604467 (Power Plant Cap: Geo, MW)
│   └── S2d  Hydro production (PLTA)        ── CEICI13527201 (Production: PLTA, Hydro, GWh)
└── S3  FUEL / ALTERNATIVE COST  (POWR cost; substitution signal for renewables)
    ├── S3a  Thermal coal (API2)           ── wb_coal_au / ICEEUR:ATR1! (782w)
    ├── S3b  Natural gas (Henry Hub)        ── natgas / NYMEX:NG1! (800w)
    └── S3c  (ideal: JKM LNG — EMPTY)       ── wb_lng_jp / SGX:JKM1! (weekly_obs=0 ✗)
```

### S1 — Regulated tariff ★ **THE ANCHOR / PRIMARY FORECAST BRANCH** (re-role to `supply +1`)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S1a Tariff: Govt (peak) | `CEICI385762107` (Tariff: Government Inst: P2 >200kVA: Peak) n138 | **supply** | **+1** | **1-4m** | the regulated price per kWh the generators bill; a tariff hike is a direct, durable revenue uplift. **CEIC tags it `demand` — RE-ROLE to `supply +1`.** | **M, n138, ~1m lag.** **[FORECAST]** |
| S1b Tariff: Govt (off-peak) | `CEICI385762117` (… Off Peak) n138 | **supply** | **+1** | **1-4m** | the brief's named "government electricity tariff"; same revenue mechanism, off-peak schedule. | M, n138. **[FORECAST]** |
| S1c Tariff: Industry I3 | `CEICI385762047` (Tariff: Industry: I3 >200kVA: Peak) n138 | **supply** | **+1** | **1-4m** | industrial tariff = POWR's captive-estate billing rate + IPP PPA reference. | M, n138. **[FORECAST]** |
| S1d Tariff: Business B3 | `CEICI385762017` (Tariff: Business: B3 >200kVA: Peak) n146 | **supply** | **+1** | **1-4m** | commercial tariff; longest history (n146). Add as the tariff-momentum proxy. | M, n146. **[FORECAST]** |

> **Why the tariff forecasts (the core hypothesis).** Unlike most CEIC quantity prints
> (annual, lagging), the tariff series are **monthly (P1M, n138-146) with a short ~1m
> publication lag** and they move **discretely and persistently** — a tariff penyesuaian /
> TDL adjustment is announced, then *stays* for months. The market re-rates the regulated
> revenue stream gradually as the higher tariff flows through quarterly earnings, so a
> tariff change at month *t* **leads** the equity re-rating by ~1-4 months. This is the rare
> CEIC series that is both monthly *and* a true forward revenue catalyst — which is exactly
> why the engine found p=8e-5 skill on it. **It must be re-roled `supply +1`** (revenue, not
> consumer demand) or the engine may average it with the wrong sign.

### S2 — Geothermal / renewable output & capacity (BREN/PGEO volume side) — **[ATTRIB]**

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S2a Geothermal generation | `CEICI254225602` (Electricity Produced: Geothermal: Indonesia Power) n26 | supply | +1 | coincident | geothermal MWh dispatched = BREN/PGEO volume. | **P1Y, n26** — annual, slow. **[ATTRIB]** |
| S2b Geothermal installed cap | `CEICI254262202` (Installed Cap: Geothermal PP) n26 | supply | +1 | leads growth | new MW commissioned = forward capacity (BREN/PGEO pipeline). | P1Y, n26. **[ATTRIB]** |
| S2c Renewable cap: Geothermal | `CEICI548604467` (Power Plant Cap: Geothermal) n6 | supply | +1 | leads growth | monthly capacity print — but **n6, far too short to wire.** | **P1M, n6 — DO NOT WIRE (no history).** |
| S2d Hydro production (PLTA) | `CEICI13527201` (Production: PLTA, Hydro) n32 | supply | +1 | coincident | hydro availability = ARKO/KEEN/OASA volume (rainfall-driven). | P1Y, n32. **[ATTRIB]** |

> **S2 is real but annual → attribution only.** Geothermal output/capacity *is* the
> fundamental volume driver for the mega-caps, but the series are **P1Y (n26-32)** — they
> confirm the capacity-growth story, they cannot forecast a monthly return. The monthly
> capacity series (`CEICI548604467`) has only **n6** and must be excluded. To capture
> these the CEIC pull must be **widened** to the `Electricity Generation` and
> `Power Plant Capacity` subcategories (see §7/§9) — currently neither is captured by
> `("Energy","Electricity")`.

### S3 — Fuel / alternative cost (POWR cost; substitution signal for renewables)

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| S3a Thermal coal (API2) | `wb_coal_au` → `ICEEUR:ATR1!` **782w** | cost | **−1** | 1-3m | **two channels:** (i) a true cost for POWR's coal-fired plants (−1); (ii) the **alternative-cost** signal — expensive coal makes regulated geothermal PPAs and tariff hikes more attractive, a *weak positive* for BREN/PGEO. Net sign **−1** (POWR cost dominates the mapped leaf; currently wired). Liquid, leads. | W, 782w, live. **[FORECAST, cost]** (currently wired) |
| S3b Natural gas (Henry Hub) | `natgas` → `NYMEX:NG1!` **800w** | cost | **−1** | 1-3m | POWR runs combined-cycle gas; gas is its primary fuel cost. Henry Hub is the available proxy (Indonesian gas is partly govt-priced; imperfect but liquid). | W, 800w, live. **[FORECAST, cost]** |
| S3c JKM LNG (ideal gas proxy) | `wb_lng_jp` → `SGX:JKM1!` | cost | −1 | — | the *correct* Asian LNG benchmark for Indonesian gas cost — but **`SGX:JKM1!` has weekly_obs=0 (EMPTY).** | **MISSING → do not wire; use `NYMEX:NG1!`.** |

---

## 5. MACRO / RATE / FX / FLOW

The duration channel is the **second-most-important driver after the tariff** and is
currently **half-wired** (only `us_10y`). These are long-duration regulated annuities; the
discount rate is first-order.

| leaf | RIC | role | sign | LEAD | mechanism | quality |
|---|---|---|---|---|---|---|
| US real 10Y (long-duration) | **`DFII10`** **800w** | macro | **−1** | **1-3m** | the cleanest **renewable-capex / long-duration discount-rate** proxy — clean-energy is a long-duration, capex-heavy growth story; a falling *real* yield re-rates it. **No resolver key exists yet → add `us_real_10y → DFII10` (see §9).** | D, 800w, live. **[FORECAST]** |
| US 10Y (nominal) | `us_10y` → `TVC:US10Y` **800w** | macro | **−1** | 1-3m | global risk-free / EM discount rate; caps BI room. (currently wired) | D, 800w, live. **[FORECAST]** |
| ID 10Y (domestic duration) | `id_10y` → `TVC:ID10Y` **798w** | macro | **−1** | 1-3m | the **domestic** discount rate on the IDR annuity (POWR/ARKO/KEEN) + PGEO/BREN bond-proxy duration. The single most important missing rate leaf. | D, 798w, live. **[FORECAST]** |
| ID 1Y (short-end financing) | `id_01y` → `TVC:ID01Y` **793w** | macro | −1 | 1-3m | floating-rate construction/financing cost. | D, 793w, live. **[FORECAST]** |
| BI 7DRR (policy) | `id_bi_rate` → `ECONOMICS:IDINTR` | macro | −1 | 3-6m | policy-rate cycle → financing cost of the annuity; also signals the rate regime for tariff/subsidy policy. | M, live. **[FORECAST]** |
| USD/IDR | `usdidr` → `FX_IDC:USDIDR` **801w** | macro | **+1** | 0-2m | **PGEO/BREN PPAs are USD-denominated** → weak IDR *raises* IDR revenue (sign **+1**, opposite to most domestic baskets). Also a risk-off/flow proxy that hits high-beta ARKO/BREN (ambiguous) — net **+1** on the USD-PPA revenue channel. | W, 801w, live. **[FORECAST, flow]** |
| DXY (broad USD / EM flow) | `dxy` → **`TVC:BBDXY` (EMPTY)** | macro | −1 | 0-2m | broad-USD EM headwind. **DATA BUG: resolver `dxy→TVC:BBDXY` has weekly_obs=0.** Re-point to `TVC:DXY` (800w, live) or omit. | **`TVC:BBDXY` empty → use `TVC:DXY`.** |
| Clean-energy / utility equity beta | `lithium_etf` `ndx` (see D3); cross-check `AMEX:XLU` (US Utilities, 800w) | macro | +1 | 0-1m | global clean-energy + regulated-utility equity factor. | W, live. **[FORECAST, beta]** |

**Flow note.** The basket splits cleanly by beta: **BREN (0.71)/ARKO (0.94)** are high-beta
risk-on momentum names that lead into rallies and out of risk-off; **PGEO (−0.71)/POWR (0.06)**
are the defensive, rate-sensitive bond-proxy hedge. There is no single clean flow signal — the
**rate complex (`id_10y`/`DFII10`)** is the dominant macro lever, and **USD/IDR** matters with
a **+1** sign (the inverse of importers) because of the USD-PPA revenue of the geothermal names.

---

## 6. Cross-industry linkages

| input | source sector / block | series | role | sign | note |
|---|---|---|---|---|---|
| Thermal coal cost | Energy → Coal | `ICEEUR:ATR1!` (API2, 782w) | cost | −1 | POWR fuel cost; alternative-cost signal for renewables. Shared with **Coal (#3)**, **Cement (#28)**. |
| Natural gas cost | Energy → Oil & Gas | `NYMEX:NG1!` (800w) | cost | −1 | POWR combined-cycle fuel. Shared with **Oil & Gas (#16)** (where it is PGAS's cost too). |
| Long-duration real rate | US macro | `DFII10` (800w) | macro | −1 | the renewable-capex/duration proxy. Shared with **IT Services (#2)**, **Internet (#15)**, **Tower (#48)** — all long-duration. |
| Domestic discount rate | ID macro | `TVC:ID10Y` (798w) | macro | −1 | bond-proxy duration. Shared with the whole **utility/infra/REIT-like complex** (Toll Road #46, Tower #48, Cement #28, Property #7). |
| Electricity & Gas GDP | ID macro (national accounts) | `CEIC365752037` (n73) | demand | +1 | sector value-add; cross-reads with **Utilities (#52)**. |
| Clean-energy equity beta | US market | `AMEX:LIT` (800w), `NASDAQ:NDX` | demand | +1 | global renewable factor. |

> **The Alternative Energy ↔ Utilities ↔ Oil&Gas triangle.** All three pull the same
> tariff + fuel-cost + electricity-demand leaves. Alternative Energy is the
> *regulated-renewable-generator* node (tariff = revenue, fuel ≈ 0 for geothermal);
> Utilities (#52) is the broader regulated node; Oil & Gas (#16, PGAS) is the gas-cost node.

---

## 7. Currently wired vs available — the "what we COULD add"

**Wired today (`SEED["Alternative Energy"]`):** `ceic:[("Energy","Electricity")]` (captures
tariffs + annual consumption + hydro production, but **NOT** geothermal output/capacity);
`globals`: `lithium_etf(+1)`, `wb_coal_au(cost −1)`; `macro`: `us_10y(−1)`, `ndx(+1)`.
**Survivors: 4.** The +0.23 OOS skill comes overwhelmingly from the **tariff leaf inside the
broad CEIC pull** — but it is currently **mis-roled `demand`** and never explicitly anchored.

| priority | ADD / FIX | RIC | role/sign | why it beats the current set |
|---|---|---|---|---|
| **P0** | **Re-role the tariff → revenue** | `CEICI385762117`/`...107`/`...047`/`...017` | **supply +1** | the p=8e-5 anchor is filed `demand` by CEIC; re-role to revenue-per-kWh so the engine signs it right. **This protects the existing skill.** |
| **P0** | Wire domestic 10Y | `id_10y` / `TVC:ID10Y` (798w) | macro **−1** | the dominant missing macro lever — bond-proxy duration on the IDR annuity. |
| **P0** | Wire US real 10Y | `DFII10` (800w) | macro **−1** | the clean renewable-capex / long-duration proxy (the brief's `DFII10`). **Needs new resolver key** `us_real_10y`. |
| **P1** | Widen CEIC to geothermal output | `ceic +("Energy","Electricity Generation")` | supply +1 | captures `CEICI254225602` geothermal MWh — the mega-cap volume side. |
| **P1** | Widen CEIC to capacity | `ceic +("Energy","Power Plant Capacity")` | supply +1 | geothermal installed-cap growth (`CEICI254262202`). **Exclude the n6 monthly cap series.** |
| **P1** | USD/IDR (+1) | `usdidr` / `FX_IDC:USDIDR` (801w) | macro **+1** | USD-PPA revenue channel for PGEO/BREN (sign +1, *not* −1). |
| **P1** | BI 7DRR | `id_bi_rate` / `ECONOMICS:IDINTR` | macro −1 | financing-cost / policy-regime leaf. |
| **P2** | Natural gas (POWR fuel) | `natgas` / `NYMEX:NG1!` (800w) | cost −1 | POWR's gas-fired cost (JKM is empty). |
| **P2** | Electricity & Gas GDP | `CEIC365752037` (n73) | demand +1 | quarterly sector value-add (attribution). |
| **fix** | `dxy` resolver | `TVC:BBDXY` **empty** | — | if DXY ever wired, re-point to `TVC:DXY` (800w). Currently **not** in this SEED — leave unwired. |
| **drop** | n6 monthly cap series | `CEICI548604467` | — | only 6 obs — exclude from the widened `Power Plant Capacity` pull. |
| **note** | annual volume leaves | D1/S2 (P1Y) | low weight | keep as attribution only; never let an annual print dominate a monthly signal. |

---

## 8. Forecastability — why it already scores +0.23, and how to keep it honest

**Why it has skill now (the genuine part).** The headline is real: the **government
electricity tariff** is a **monthly, low-lag, discretely-persistent revenue catalyst**
(p=8e-5). It is the rare CEIC series that is *both* a true forward fundamental *and* fast
enough (P1M) to trade — a tariff penyesuaian announced at *t* re-rates the regulated revenue
stream over *t+1…t+4* as it flows through earnings. Combined with the **liquid coal-cost lead**
(`ICEEUR:ATR1!`, weekly) and the **clean-energy equity beta** (`AMEX:LIT`, weekly), the engine
has three genuinely *leading, exogenous-ish* drivers. This is consistent with the backtest's
rule of thumb (physical-cost-pass-through + price/rate series lead; slow quantity prints lag)
and with the company it keeps at the top of the table (Coal, Poultry, Pharma — all
cost-pass-through / regulated).

**Why the +0.23 is fragile (the honest caveats — do not over-trust it):**
1. **`hit−up −0.03`.** The IC is positive but the basket does *not* reliably win on up-months.
   The skill is *rank/sign across the panel*, much of it from the **PGEO short / BREN long**
   sign structure (β −0.71 vs +0.71), not from a directional edge. A high IC with a
   negative hit-up rate is the signature of a **dispersion/sign signal, not a timing signal.**
2. **`n_oos 64` (low confidence).** BREN, PGEO, ARKO IPO'd in 2023-24; the OOS window is
   ~half the universe's. `BREN` has `weekly_obs=165`, `PGEO=165`, `ARKO=198` — short, and the
   sample is dominated by one regime (post-IPO momentum).
3. **BREN idiosyncratic momentum.** 81.5% of basket mcap is one stock whose return is driven
   by **free-float/index-inclusion momentum**, not by tariffs or rates. On an equal-weighted
   basket BREN's weight is 1/6 but its move co-moves with the small high-beta hydro names, so
   the *common factor* the engine fits is partly **"renewable momentum,"** which may not persist.
   The +0.23 risks being a **momentum artefact** dressed as a tariff signal.

**The honest verdict.** Unlike Property (a clean "fix the broken tree" story), this basket is
**"a real anchor wrapped in a fragile sample."** Treat the +0.23 as **provisional skill on the
tariff + cost + rate complex**, *attribution* on the annual volume series, and **explicitly
flag BREN-momentum as an unmodelled, dominant variance component.** The right move is to
**harden the theory** (re-role the tariff correctly, add the duration channel) so the signal
rests on *mechanism* (tariff → revenue, rate → discount) rather than on the post-IPO momentum
window — then **re-run the blindfolded backtest and keep the change only if IC holds at ≥+0.15
with a richer, more honest tree.** If re-roling the tariff + adding `id_10y`/`DFII10` holds the
IC, the skill is mechanism-driven and trustworthy; if it collapses, the +0.23 was BREN momentum
and the basket should be down-graded to attribution.

**Which branch should carry forward skill:** **S1 tariff (re-roled supply +1)** is the
primary forecaster (monthly, low-lag, persistent revenue catalyst); the **rate complex
(`id_10y`/`DFII10`/`us_10y`)** is the second (liquid, daily, leads the bond-proxy re-rating);
**`ICEEUR:ATR1!` coal cost** is the third. The annual CEIC volume/capacity leaves (D1, S2) are
**attribution only** and must be weight-capped.

**Look-ahead / leakage guards (must hold or the OOS is fake):**
- All CEIC tariff/volume leaves are **publication-lagged** — at month *t* use only the print
  released by *t* (tariff ~1m lag; annual consumption ~1-2 quarters). The engine's CEIC
  pub-lag handling must apply, or the tariff "lead" is an artefact of using an unpublished print.
- **Exclude the n6 monthly capacity series** (`CEICI548604467`) and treat all **P1Y leaves as
  low-weight attribution** — a single annual observation cannot drive a monthly signal without
  massive interpolation leakage.
- **Tariff levels trend with inflation** → if the engine uses level z-scores, a tariff that only
  rises looks permanently "bullish." Use **Δ (change) / non-overlapping momentum**, not the level,
  so the signal fires on tariff *adjustments*, not on the secular uptrend (the macro-sentiment
  round-1 non-overlapping-diff critique applies here directly).
- **PLN sales / consumption LEVELS are endogenous** to the system size → use yoy/Δ only.
- BREN/PGEO short histories: ensure the walk-forward standardisation uses only the available
  window and does not borrow cross-sectional info from the longer-history names.

---

## 9. Engine-wiring spec (`mapping.py`)

Replace the thin `SEED["Alternative Energy"]` with the tree below. The two non-negotiable
changes are **(a) re-role the tariff `supply +1`** (protect the p=8e-5 anchor) and **(b) wire
the duration channel** (`id_10y`, new `us_real_10y → DFII10`). Concrete, drop-in:

```python
"Alternative Energy": {
    # Widen the CEIC pull: the current ("Energy","Electricity") misses geothermal
    # OUTPUT and CAPACITY (separate subcategories) — the mega-cap volume side.
    "ceic": [
        ("Energy", "Electricity"),            # tariffs + annual consumption + hydro prod
        ("Energy", "Electricity Generation"), # CEICI254225602 geothermal MWh (BREN/PGEO)
        ("Energy", "Power Plant Capacity"),   # CEICI254262202 geothermal installed cap
    ],

    # ★ THE ANCHOR FIX: CEIC files every tariff as 'demand' (a consumer price).
    # For a basket of GENERATORS the tariff is REVENUE/kWh -> re-role supply +1,
    # and the geothermal output/capacity is supply +1. This is what protects the
    # p=8e-5 tariff skill from being averaged with the wrong sign.
    "ceic_override": [
        ("electricity tariff: government", "supply", +1),  # CEICI385762107/...117 (the anchor)
        ("electricity tariff: industry",   "supply", +1),  # CEICI385762047
        ("electricity tariff: business",   "supply", +1),  # CEICI385762017
        ("electricity produced: geothermal", "supply", +1),# CEICI254225602
        ("installed capacity: geothermal",   "supply", +1),# CEICI254262202
        ("production: plta",                 "supply", +1),# CEICI13527201 hydro availability
    ],

    # Drop endogenous / no-history / leaky series in the widened pull.
    "ceic_exclude": [
        "power plant capacity: geothermal", # CEICI548604467 monthly cap n6 — no history
        "power plant capacity: floating",   # n6 monthly renewable caps — all n6
        "power plant capacity: wind",
        "power plant capacity: solar",
        "power plant capacity: biogas",
        "power plant capacity: biomass",
        "power plant capacity: waste",
        "power plant capacity: coal gasification",
        "power plant capacity: mini hydro",
        "reactive power",                   # /kVArh billing-detail tariffs, not a price-signal
        # NOTE: keep annual consumption/PLN-sales but engine must use yoy/Δ (low weight),
        #       not the raw endogenous system-size LEVEL.
    ],

    "globals": [
        ("lithium_etf", "demand", +1, "global storage/clean-energy equity beta (AMEX:LIT 800w)"),
        ("wb_coal_au",  "cost",  -1, "POWR coal fuel cost + alt-cost signal for geothermal (API2 782w)"),
        ("natgas",      "cost",  -1, "POWR combined-cycle gas fuel (NYMEX:NG1! 800w; JKM empty)"),
        # dxy intentionally NOT wired: resolver dxy->TVC:BBDXY is EMPTY (weekly_obs=0).
    ],

    "macro": [
        # ---- DURATION / DISCOUNT-RATE channel (bond-proxy regulated annuities) ----
        ("id_10y",      "macro", -1, "domestic discount rate on IDR annuity + PGEO/BREN bond-proxy; LIQUID LEAD"),
        ("us_real_10y", "macro", -1, "US real 10Y = renewable-capex/long-duration proxy (DFII10 800w)"),
        ("us_10y",      "macro", -1, "global risk-free / EM discount rate (currently wired)"),
        ("id_bi_rate",  "macro", -1, "policy rate: financing cost + tariff/subsidy regime"),
        # ---- FX: USD-PPA revenue channel (sign +1, opposite to importers) ----
        ("usdidr",      "macro", +1, "USD-denominated PGEO/BREN PPA revenue -> weak IDR raises IDR revenue"),
        # ---- clean-energy / growth beta (currently wired) ----
        ("ndx",         "demand", +1, "long-duration clean-energy growth-equity beta"),
        # ---- attribution backdrop (low weight) ----
        ("id_gdp_real_q","demand", +1, "load-growth / electricity-intensity backdrop (attribution)"),
    ],
},
```

**New market resolver needed?** **Yes — one.** `DFII10` is in `market.json` (US 10Y Real,
800w) but **no resolver key maps to it.** Add to the `GLOBAL_CORR` resolver map:
```python
    "us_real_10y": "DFII10",   # US 10Y real yield (long-duration / renewable-capex proxy)
```
All other ids already resolve: `id_10y→TVC:ID10Y`, `us_10y→TVC:US10Y`, `usdidr→FX_IDC:USDIDR`,
`lithium_etf→AMEX:LIT`, `wb_coal_au→ICEEUR:ATR1!`, `natgas→NYMEX:NG1!`, `ndx→NASDAQ:NDX`,
`id_bi_rate→ECONOMICS:IDINTR`, `id_gdp_real_q→aIDGDPAR1`.

**Falsifiable backtest plan.** The anchor is the tariff; the test is whether **mechanism**
(not BREN momentum) carries the skill:
1. Baseline: re-run `backtest/bt.py "Alternative Energy"` on the *current* SEED → confirm
   the +0.23 / pctile 1.00 reproduces.
2. Apply the **tariff re-role only** (`supply +1`, Δ/non-overlapping not level). **Expected:
   IC holds or rises** (the engine now signs the anchor correctly). If IC *drops*, the prior
   skill leaned on a perverse demand-sign coincidence — investigate.
3. Add the **duration channel** (`id_10y`, `us_real_10y→DFII10`, `id_bi_rate`) +
   USD/IDR(+1). **Expected:** IC holds ≥+0.15 with a richer tree and *less* reliance on
   `ndx`/`lithium_etf` (the momentum-beta leaves). **Confirmation:** the leave-one-out IC drop
   from removing the **tariff** should now exceed the drop from removing **`ndx`** — i.e. the
   signal is tariff-mechanism-led, not momentum-led.
4. **Robustness:** re-run on a **BREN-excluded** (or cap-floored) basket. If IC survives BREN
   removal, the skill is the regulated-IPP commonality (trustworthy); if it collapses, the
   +0.23 was BREN momentum → down-grade the verdict to attribution in the panel.

**Data-quality flags to surface in the panel:**
- ★ **anchor** = government electricity tariff (`CEICI385762117`/`...107`, P1M n138, p=8e-5),
  re-roled **supply +1**, used as **Δ/non-overlapping** not level.
- **`SGX:JKM1!` (wb_lng_jp) is EMPTY (weekly_obs=0)** → use `NYMEX:NG1!` for gas cost.
- **`TVC:BBDXY` (dxy) is EMPTY** → not wired here; if ever needed use `TVC:DXY` (800w).
- **`DFII10` has no resolver key** → add `us_real_10y→DFII10`.
- Geothermal output/capacity & PLN consumption are **P1Y (n26-40) → attribution, low weight**;
  the monthly capacity series `CEICI548604467` is **n6 → exclude**.
- **OOS confidence LOW (n_oos 64) + hit−up −0.03 + 81.5% BREN concentration** → flag the
  +0.23 as **provisional/dispersion skill**, pending the BREN-excluded robustness re-run.

---

### Verification checklist before commit
- [ ] `build_worklist.py` → `controller.py --only "Alternative Energy"` runs clean with the widened block.
- [ ] Tariff series re-roled `supply +1` and consumed as **Δ / non-overlapping**, not level (anti-trend leak).
- [ ] Geothermal output/capacity captured via the widened `("Energy","Electricity Generation")` + `("Energy","Power Plant Capacity")` pulls; **n6 monthly cap series excluded.**
- [ ] `us_real_10y → DFII10` resolver added; `id_10y` wired; `dxy` left unwired (empty resolver).
- [ ] All CEIC leaves publication-lagged; P1Y volume/capacity leaves weight-capped (attribution).
- [ ] `backtest/bt.py "Alternative Energy"` re-run; **keep only if forward IC holds ≥ +0.15** with the harder-theory tree, and the **tariff** leave-one-out drop exceeds the **`ndx`** drop (mechanism-led, not momentum-led).
- [ ] BREN-excluded robustness run logged; panel verdict labelled **provisional** if IC depends on BREN.
