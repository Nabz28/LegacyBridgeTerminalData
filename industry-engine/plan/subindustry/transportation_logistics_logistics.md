# Logistics — deep driver-tree plan

`id: transportation_logistics_logistics` · sector **Transportation & Logistics** ·
12 members · current grade **perfected/high** · kept-drivers **as-wired (Transport &
Logistics block + brent + GDP + exports)** · **blindfolded OOS = NONE** (in-sample IC
**+0.00**, fwd IC **+0.03**, placebo pctile **0.50**) · primary CEIC block **Transport
(Land/Freight) + Trade**.

> **The honest headline first.** This is the only basket in the book whose in-sample IC
> is *exactly* 0.00 and whose placebo percentile is *exactly* the coin-flip median (0.50).
> That is not a wiring accident — it is the signature of a **structurally heterogeneous
> basket** whose constituents do not co-move. Taxi (BIRD), vehicle-fleet rental (ASSA),
> container-feeder/3PL, e-commerce couriers (SAPX), bulk-liquid trucking (SDMU) and bus
> charter (WEHA) each have a *different* driver, and several have *opposite* betas
> (WEHA −0.03, MIRA −0.09, LAJU −0.55 vs SDMU +0.72, TAXI +0.60). A single demand factor
> that lifts one segment is neutral-to-negative for another, so any common driver's
> cross-sectional IC washes to zero. The plan below builds the *correct* multi-segment
> tree anyway — and then states plainly which (small) part of it could carry forward
> skill and which part is, irreducibly, a beta/attribution grab-bag. **Do not chase the
> 0.00 with in-sample-only drivers; the goal is an honest tree, not a flattered IC.**

---

## 1. Snapshot

**What the basket is.** 12 Indonesian land-/asset-transport names, ~Rp 7.9T combined
mcap, but **mcap is dominated by two non-logistics-pure names**: BIRD (Rp 3.88T, 49%)
and ASSA (Rp 2.47T, 31%) = **80% of the basket**. The remaining 10 are micro/small-caps
(< Rp 0.25T each). It is "Logistics" only by exchange taxonomy; economically it is a
**mobility + fleet + freight-forwarding composite**.

| Member | What it actually does | mcap (Rp T) | beta | true driver |
|---|---|---|---|---|
| **BIRD** | Blue Bird — **taxi / ride-hail mobility** | 3.88 | 0.23 | urban mobility, fuel, fare regulation |
| **ASSA** | Adi Sarana Armada — **vehicle-fleet leasing + Anteraja courier + used-car (Caroline)** | 2.47 | 0.43 | fleet financing rates, corporate capex, e-commerce parcels, used-car prices |
| **BPTR** | Batavia Prosperindo Trans — **vehicle rental / charter** | 0.25 | — | corporate mobility, GDP |
| **TRJA** | Transkon Jaya — **mining-vehicle rental (4WD)** | 0.19 | 0.16 | **coal/mining capex** (not consumer) |
| **SAPX** | Satria Antaran Prima — **e-commerce courier / last-mile** | 0.17 | 0.60 | parcel volume, e-commerce GMV |
| **WEHA** | WEHA Transportasi — **bus charter / tourism transport** | 0.17 | −0.03 | tourism, MICE, visitor arrivals |
| **TRUK** | Guna Timur Raya — **trucking / road freight** | 0.17 | 0.50 | trade/industrial freight volume, diesel |
| **TAXI** | Express Transindo — **taxi (distressed/restructuring)** | 0.14 | — | idiosyncratic (solvency), mobility |
| **LAJU** | Jasa Berdikari Logistics — **3PL / freight forwarding** | 0.13 | −0.55 | trade flows, idiosyncratic |
| **SDMU** | Sidomulyo Selaras — **bulk-liquid / chemical trucking** | 0.08 | 0.72 | chemical/industrial volume, oil |
| **MIRA** | Mitra International — **logistics holding (shell-like)** | 0.08 | −0.09 | idiosyncratic |
| **DEAL** | Dewata Freight International — **freight forwarding (air/sea)** | 0.01 | — | trade flows, air/sea cargo |

**The gap.** `mapping.py` wires the whole `Transport & Logistics` CEIC block (Sea Cargo,
Railway, Air Pax, Vehicle Regs, Transport-GDP) + brent + GDP + exports. That set is (a)
mostly **publication-lagged annual/quarterly quantity prints** (coincident/lagging, weak
forecasters), and (b) **mis-aimed** — Sea-Cargo/Railway tonnage is a *Shipping/Ports/Coal*
driver, not a taxi/courier/fleet driver. The basket's real economics — **mobility,
e-commerce parcels, fleet-financing rates, fuel** — are barely touched. Net result: a tree
that explains *nothing* (IC 0.00). This plan re-aims it at the segments that actually move
the two mcap-dominant names, while conceding the small-cap tail is idiosyncratic noise.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (per segment).** Revenue = **volume × rate**, where:
- **Mobility (BIRD, TAXI, WEHA, BPTR):** trips × fare. Volume = urban activity / mobility /
  tourism; rate = regulated taxi tariff or charter price. Margin swing = **fuel** (diesel/
  gasoline, 20–30% of cash cost) and **driver/partner economics**.
- **Fleet leasing (ASSA, TRJA):** units on lease × monthly lease rate. Volume = corporate
  fleet capex & vehicle deliveries; rate is fixed by contract. Margin swing = **funding
  cost** (the lease is a financed asset → rates are the cost of goods) and **residual/used-
  car value** at end of lease (ASSA monetises via Caroline).
- **Courier / 3PL / forwarding (SAPX, LAJU, DEAL, ASSA-Anteraja):** parcels (or TEU/kg) ×
  freight rate. Volume = **e-commerce GMV + trade flows**; rate = competitive freight rate.
  Margin swing = **fuel + labour + last-mile density**.
- **Trucking (TRUK, SDMU):** tonne-km × haul rate. Volume = industrial/trade/chemical
  output; rate = contract. Margin swing = **diesel + truck financing + toll**.

**The cost stack (shared).** (1) **Fuel** — diesel/gasoline, the single largest variable
cost and the cleanest *leading, liquid* input; (2) **Fleet financing** — interest on
vehicle/truck debt, the second cost and a *rate-sensitive* swing factor; (3) **Labour /
partner take**; (4) **Maintenance / depreciation / residual value**; (5) **Toll & port
charges**.

**The margin swing factor.** For the asset-heavy names (BIRD, ASSA, TRJA, trucking) the two
margin levers are **fuel (−)** and **financing cost (−)**. Both are *exogenous price/rate*
series → the most forecast-able branch of the tree. Demand (volume) is the harder, slower,
publication-lagged branch.

**What a sell-side analyst watches.** Blue Bird: trips/day, fleet utilisation, fare regime,
fuel pass-through, Gojek/Grab competition. ASSA: fleet units, Anteraja parcel volume,
funding cost (the spread over BI rate), used-car prices. Couriers: e-commerce parcel growth,
take-rate, last-mile cost. Forwarders: trade volume, freight rates, USD pass-through.

**Intra-basket dispersion — why the mix washes out (CRITICAL).** The basket has **no common
demand factor**:
- A **mobility/consumer** up-move helps BIRD/TAXI/WEHA but is irrelevant to TRJA (mining)
  and SDMU (chemicals).
- A **trade/freight** up-move helps TRUK/LAJU/DEAL/SDMU but is irrelevant to taxi.
- A **mining-capex** up-move helps TRJA (and via UNTR-style cycle) but hurts nothing else.
- A **rate cut** helps ASSA/fleet (financing) but is ambiguous for taxi.
Betas confirm non-co-movement: **+0.72 (SDMU) to −0.55 (LAJU)** in the same basket. A
cross-sectional equal-weight model regressing all 12 on one driver therefore sees the
positive and negative loadings cancel → **IC ≈ 0.00, placebo pctile 0.50**. This is a
*compositional* problem, not a missing-driver problem. The only way the equal-weight engine
extracts signal is if a driver loads with the **same sign on the two names that dominate
mcap (BIRD + ASSA = 80%)** — i.e. **fuel (−)** and **financing rate (−)**, which hit both.

---

## 3. DEMAND driver tree

Format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.

### D1 — Urban mobility / consumer activity (drives BIRD, TAXI, WEHA, BPTR ≈ 55% of mcap)
- **D1a Card-spend / mobility proxy** → `CEICI313915102` Credit Card Value: Purchase
  (n243, P1M) · demand · **+1** · LEAD **0–1m** · discretionary urban spend co-moves with
  taxi trips · *monthly, ~6-wk lag, decent length — coincident.*
- **D1b E-money transaction value** → `CEICI479936297` E-Money Transaction: Value (n207,
  P1M) · demand · **+1** · LEAD **0m** · cashless mobility/parcel rails (Gojek/Grab/QRIS)
  proxy urban activity · *monthly, coincident, structural uptrend → detrend before use.*
- **D1c Consumer confidence** → `id_consumer_confidence` = `aIDCONIAR` (n via id-block)
  · demand · **+1** · LEAD **1–2m** · sentiment leads discretionary travel · *survey,
  monthly, mild lead — weak.*
- **D1d CPI Passenger Transport Service (rate, not volume)** → `CEIC521547787` CPI
  Transportation: Passenger Transport Service (n41, P1M) · demand(price) · **+1** · LEAD
  **0m** · proxies the *fare* leg of mobility revenue (regulated tariff resets) · *short
  (n41), monthly — attribution only.*

### D2 — E-commerce / parcel growth (drives SAPX, ASSA-Anteraja ≈ 33% of mcap)
- **D2a E-money purchase volume** → `CEICI313915502` E-Money Transaction: Volume: Purchase
  (n228, P1M) · demand · **+1** · LEAD **0–1m** · transaction count proxies parcel orders ·
  *monthly, strong uptrend → use YoY.*
- **D2b Retail sales index** → `id_retail` = `aIDRSLSAR` · demand · **+1** · LEAD **0–1m** ·
  retail turnover ≈ goods that must be delivered · *monthly, ~6-wk lag — coincident.*
  *(There is no direct "e-commerce GMV" series; e-money + retail are the honest proxies.)*

### D3 — Trade / freight volume (drives TRUK, SDMU, LAJU, DEAL ≈ 12% of mcap)
- **D3a Exports YoY** → `id_exports` = `aIDEXGAR` · demand · **+1** · LEAD **0–1m** · export
  cargo = forwarding/trucking volume · *monthly, liquid-ish, coincident.* *(currently wired)*
- **D3b Imports YoY** → `id_imports` = `aIDIMGAR` · demand · **+1** · LEAD **0–1m** · import
  cargo = inbound forwarding + distribution trucking · *monthly — coincident.* *(add)*
- **D3c Sea-cargo throughput (Tanjung Priok intl)** → `CEICI14575001` Sea Cargo Intl: Tanjung
  Priok (n427, P1M) · demand · **+1** · LEAD **0m** · port tonnage = forwarding volume ·
  *monthly, long history, but publication-lagged — attribution, weak forecaster.*
- **D3d Manufacturing / IP (freight-generating output)** → `id_pmi` = `aIDPMIMAQ`
  · demand · **+1** · LEAD **1–2m** · PMI new-orders lead goods that need hauling ·
  *survey, monthly, genuinely leading — a forecast candidate for the freight sub-segment.*

### D4 — Mining / commodity capex (drives TRJA specifically — the odd-one-out)
- **D4a Thermal coal price (API2)** → `wb_coal_au` = `ICEEUR:ATR1!` (deep weekly) · demand ·
  **+1** · LEAD **2–4m** · coal price → miner capex → mining-vehicle rental (TRJA's 4WD
  fleet) · *weekly, liquid, leading — but loads on ONE name; will not help equal-weight IC.*

### D5 — General activity / GDP (broad demand backstop)
- **D5a Real GDP (q)** → `id_gdp_real_q` = `aIDGDPAR1` · demand · **+1** · LEAD **0m** ·
  aggregate freight + mobility · *quarterly, heavily lagged — coincident/attribution.*
  *(currently wired — keep as backstop, expect ~zero marginal forecast value.)*

---

## 4. SUPPLY / COST driver tree

### S1 — Fuel cost (the #1 margin swing, hits EVERY segment with the same sign)
- **S1a Brent crude (−1)** → `brent` = `ICEEUR:BRN1!` (weekly_obs 800) · cost · **−1** ·
  LEAD **1–2m** · global oil → domestic diesel/gasoline → trucking + taxi + courier cost ·
  *weekly, liquid, leading — THE forecast candidate that loads negatively on BIRD+ASSA
  (80% of mcap) simultaneously.* *(currently wired)*
- **S1b WTI crude (−1)** → `wti` = `NYMEX:CL1!` (800) · cost · **−1** · LEAD **1–2m** ·
  redundant-but-confirming oil signal · *weekly — keep only if it adds orthogonal info.*
- **S1c Gasoline futures (−1)** → `gasoline` = `NYMEX:RB1!` (800) · cost · **−1** · LEAD
  **1m** · gasoline-specific (taxi/ride-hail run on petrol) — closer to BIRD's pump cost
  than crude · *weekly, liquid, leading — add as the mobility-fuel leaf.*
- **S1d Domestic diesel price (Pertamina Dex)** → `CEICI359137107` Retail Price: Fuel:
  Pertamina Dex (n245, P1M) · cost · **−1** · LEAD **0m** · the *actual* pump price the
  fleet pays (captures subsidy/admin-price changes Brent misses) · *monthly, administered,
  coincident — attribution, but the true cost number.*

### S2 — Fleet financing cost (the #2 margin swing, hits asset-heavy ASSA/TRJA/trucking)
- **S2a BI policy rate (−1)** → `id_bi_rate` = `ECONOMICS:IDINTR` · cost · **−1** · LEAD
  **1–3m** · funding cost for leased fleet; ASSA's spread compresses when rates fall ·
  *monthly, the policy anchor — leading the financing-cost leg.* *(add — currently absent!)*
- **S2b ID 1Y govt yield (−1)** → `id_01y` = `TVC:ID01Y` (weekly_obs 793) · cost · **−1** ·
  LEAD **0–1m** · short-end funding cost, daily/weekly so it *leads* the monthly BI print ·
  *weekly, liquid, leading — the forecast-able financing leaf.* *(add)*
- **S2c Multifinance: Transportation & Storage financing receivables** → `CEICI462344547`
  (n110, P1M) · demand/supply · **+1** · LEAD **0m** · the *stock of vehicle/fleet credit*
  extended to the sector — rises when financing is cheap & demand strong · *monthly,
  publication-lagged — coincident attribution, but a clean read on fleet-credit cycle.*

### S3 — Fleet investment / capacity (volume-supply, slow)
- **S3a Truck wholesales** → `CEICI412545837` Motor Vehicle Sales: Wholesales: Truck
  (n328, P1M) · supply · **+1** · LEAD **0–2m** · new-truck deliveries = freight-capacity
  capex & fleet-renewal demand (good for ASSA/TRUK; oversupply later pressures rates) ·
  *monthly, long history — coincident-to-slightly-leading capex proxy.*
- **S3b Used-car / residual value proxy** → *(no clean series; flag as gap)* · the residual-
  value leg of ASSA (Caroline) has **no direct CEIC price**; truck-wholesales + vehicle-
  registration stock are the only proxies. *(documented gap, do not fabricate.)*
- **S3c Vehicle registrations (truck stock)** → `CEICI14592301` Number of Motor Vehicle
  Registered: Trucks (n63, **P1Y**) · supply · **+1** · LEAD **n/a** · annual capacity
  stock · *annual, far too slow — drop from the engine, attribution-only.*

---

## 5. MACRO / RATE / FX / FLOW

- **USD/IDR** → `usdidr` = `FX_IDC:USDIDR` (weekly_obs 801) · macro · **−1** · LEAD **0–1m**
  · weaker IDR raises USD-denominated fleet/vehicle import & USD fuel cost, and is a risk-off
  proxy that hits these high-beta small-caps · *weekly, liquid, leading.* *(add)*
- **DXY (broad USD / EM-flow headwind)** → token `dxy` · macro · **−1** · LEAD **0–1m** ·
  broad USD strength drains EM small-cap liquidity. **⚠ BUG: `dxy` resolves to `TVC:BBDXY`
  which is EMPTY (weekly_obs 0).** Must use **`TVC:DXY`** (weekly_obs 800) via an explicit
  market-id override, or the leaf silently contributes nothing. *(see §9.)*
- **BI policy rate Δ regime** → `id_bi_rate` = `ECONOMICS:IDINTR` · macro · **−1** · LEAD
  **1–3m** · doubles as discount-rate + financing-cost (see S2a) · *monthly.*
- **ID 10Y yield** → `id_10y` = `TVC:ID10Y` (798) · macro · **−1** · LEAD **0–1m** ·
  duration/discount rate for these long-lived-asset lessors · *weekly, liquid.*
- **Risk appetite / benchmark beta** → `IDX:IDXTRANS` (IDX Transport sector index, weekly_obs
  272) is the **natural beta benchmark** for attribution (NOT a driver — never regress the
  basket on its own sector index for forecasting). Use JCI (`jci` = `IDX:COMPOSITE`) as the
  market-beta control. *Most of this basket's variance is beta + idiosyncratic, not factor.*
- **Bank credit growth (liquidity backstop)** → `id_bank_credit` = `aIDLONYAR` · macro ·
  **+1** · LEAD **1–2m** · system credit availability funds fleet expansion · *monthly.*

---

## 6. Cross-industry linkages (series borrowed from other blocks — made explicit)

| Borrowed series | Home block | Why it is a Logistics input |
|---|---|---|
| `CEICI313915102` Credit Card Value: Purchase (n243) | **Telecom / Card Transactions** | mobility & discretionary-spend proxy for taxi |
| `CEICI479936297` / `CEICI313915502` E-Money Value/Volume (n207/228) | **Telecom / E-Money** | e-commerce parcel + cashless-mobility proxy |
| `CEICI462344547` Multifinance: Transport & Storage financing (n110) | **Financials / Multifinance** | the fleet-credit cycle that funds ASSA/TRUK |
| `CEICI412545837` Truck wholesales (n328) | **Industrials / Auto Sales** | freight-capacity capex / fleet-renewal demand |
| `CEICI359137107` Pertamina Dex diesel price (n245) | **Consumer Staples / Food Retail Prices** | the actual domestic fuel cost the fleet pays |
| `CEIC521547787` CPI Passenger Transport Service (n41) | **ID macro / CPI** | the fare/rate leg of mobility revenue |
| `wb_coal_au` API2 coal (`ICEEUR:ATR1!`) | **Market / commodities** | TRJA mining-vehicle-rental demand (single-name) |
| `brent`/`wti`/`gasoline` | **Market / commodities** | fuel cost (all segments) |
| `id_01y`/`id_10y`/`id_bi_rate` | **Market + ID monetary** | fleet-financing & discount rate |

This basket is unusual in that **its best drivers all live in *other* blocks** (payments,
multifinance, auto-sales, fuel prices) — its *own* CEIC "Transport & Logistics" block is
mostly slow port/rail tonnage that belongs to Shipping/Ports/Coal.

---

## 7. Currently-wired vs available

| Branch | Wired now | Available to ADD | Priority |
|---|---|---|---|
| Fuel cost | brent (−1) ✓ | + gasoline `NYMEX:RB1!` (mobility fuel), + Pertamina Dex `CEICI359137107` (true diesel) | **P1** |
| Fleet financing | **none** ✗ | + BI rate `ECONOMICS:IDINTR` (−1), + ID 1Y `TVC:ID01Y` (−1), + Multifinance T&S `CEICI462344547` | **P1** |
| Mobility/consumer | **none** ✗ | + Credit-card value `CEICI313915102`, + E-money `CEICI479936297`, + consumer conf `aIDCONIAR` | **P2** |
| E-commerce/parcel | **none** ✗ | + E-money volume `CEICI313915502`, + retail `aIDRSLSAR` | **P2** |
| Trade/freight | exports ✓ | + imports `aIDIMGAR`, + PMI `aIDPMIMAQ` (leading), + Priok cargo `CEICI14575001` | **P2** |
| FX / flow | **none** ✗ | + USD/IDR `FX_IDC:USDIDR` (−1), + DXY via **`TVC:DXY`** (−1) | **P2** |
| GDP backstop | gdp_real_q ✓ | (keep, low marginal value) | P3 |
| Mining (TRJA) | **none** | + API2 `ICEEUR:ATR1!` (single-name, won't help IC) | P3 |
| **Mis-aimed (REMOVE)** | whole `Transport & Logistics` block incl. **Sea Cargo / Railway / Air-Pax** annual prints | re-scope to land/freight + drop annual P1Y tonnage | **P1 (de-noise)** |

**Bugs to call out:**
1. **`dxy` → `TVC:BBDXY` is EMPTY (weekly_obs 0).** Any basket using the `dxy` token gets a
   dead leaf. Use `TVC:DXY` (weekly_obs 800). Repo-wide issue; here it means the FX-flow
   branch must be wired via explicit market-id, not the token.
2. **`id_lending_rate` → None.** The fleet-financing-cost branch cannot use the lending-rate
   token; route it through `id_bi_rate` (`ECONOMICS:IDINTR`) + `id_01y` (`TVC:ID01Y`).
3. **Annual (P1Y) CEIC leaves** (Sea-Passenger n19, Air-Cargo n19, Road-Safety n22, Vehicle-
   Registration stock n63) are too short/slow for a monthly engine — they add noise, not
   signal. The wide `("Transport & Logistics", None)` selector pulls them all in.

---

## 8. Forecastability

**What should LEAD (and why):**
- **Fuel (brent/gasoline/Dex), −1, ~1–2m lead.** Oil moves daily; the fleet's cost and the
  market's re-rating of margin follow with a lag. This is the *one* branch that loads with
  the **same sign on BIRD + ASSA (80% of mcap)** → the only branch with a realistic shot at
  a non-zero cross-sectional IC.
- **Short rates (ID 1Y / BI), −1, ~1–3m lead.** Funding cost for the asset-heavy lessors;
  the daily yield leads the monthly financing print.
- **PMI new-orders, +1, ~1–2m lead.** The only *leading* demand proxy (for the freight
  sub-segment) — but it loads on the 12%-of-mcap trucking/forwarding tail.

**What is attribution-only (lagging/coincident):** all CEIC *quantity* prints — Sea-Cargo
tonnage, Railway ton-km, port throughput, Transport-GDP, multifinance receivables, truck
wholesales, registrations. Publication-lagged, coincident at best. Good for *explaining* a
past move, useless for *forecasting* the next one.

**What the OOS backtest says.** In-sample IC **+0.00**, fwd IC **+0.03**, placebo pctile
**0.50**. Translation: **no skill, indistinguishable from noise.** The +0.03 forward number
is inside the placebo distribution — not real. This is the most honest "no" in the book.

**Contemporaneous vs forward.** Even contemporaneously the common-factor R² is near zero,
because the segments don't co-move. So this is *not* "a good explainer that just can't
forecast" (like Banks); it is "**not a coherent factor basket at all**". The composite is a
**beta + idiosyncratic grab-bag**: most of each name's variance is its own story (BIRD =
Gojek/Grab competition + fare regime; ASSA = Anteraja burn + funding; TAXI = solvency; LAJU/
MIRA = micro-cap noise) plus market beta.

**What would move it from explainer to forecaster — the honest options:**
1. **Abandon equal-weight; go mcap- or, better, segment-weighted.** Model BIRD+ASSA (80%)
   with their *real* drivers (fuel −, gasoline −, BI/1Y rate −, USD/IDR −, mobility/parcel +)
   and treat the 10 micro-caps as un-modellable idiosyncratic. A two-name model on fuel+rates
   is the *only* path to a defensible forward IC here.
2. **Split the basket.** "Logistics" conflates mobility (BIRD/TAXI/WEHA/BPTR), fleet (ASSA/
   TRJA), and freight (TRUK/SDMU/LAJU/DEAL). Each sub-cluster *would* have a coherent driver;
   the union does not. If the engine supported sub-clusters, fuel-on-mobility and rates-on-
   fleet could each show skill that the blended IC destroys.
3. **Accept attribution-only.** If equal-weight is mandatory, the honest verdict is: **keep
   a clean fuel(−) + rate(−) + USD/IDR(−) cost spine for attribution, expect IC ≈ 0, and
   label this basket "beta/idiosyncratic — no forward skill claimed".** Do **not** add demand
   quantity prints to chase the number; they will only fit in-sample.

**Verdict: attribution / beta only.** The realistic ceiling is a small positive IC from the
fuel+rate cost spine acting on the two large-caps. Anything higher would be overfit.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

Current `SEED["Logistics"]`:
```python
"Logistics": {
    "ceic": [("Transport & Logistics", None)],
    "globals": [("brent", "cost", -1, "diesel/fuel cost")],
    "macro": [("id_gdp_real_q", "demand", +1, "freight volume"),
              ("id_exports", "demand", +1, "trade flows")],
},
```

**Proposed (re-aimed at land/freight + the cost spine, de-noised):**
```python
"Logistics": {
    # Narrow the CEIC pull to land/freight subcats; drop slow annual port/rail/air prints.
    "ceic": [("Transport & Logistics", "Vehicle Registrations")],   # monthly land proxy
    "ceic_override": [
        # re-role the fleet-credit and fuel cross-industry series as cost/demand inputs
        ("CEICI462344547", "demand", +1, "fleet-credit cycle (Multifinance T&S)"),  # n110 P1M
        ("CEICI412545837", "supply", +1, "truck wholesales = freight capex"),       # n328 P1M
        ("CEICI359137107", "cost",  -1, "domestic diesel (Pertamina Dex)"),         # n245 P1M
        ("CEICI313915102", "demand",+1, "card spend = mobility proxy"),             # n243 P1M
        ("CEICI479936297", "demand",+1, "e-money value = parcel/mobility proxy"),   # n207 P1M
    ],
    "ceic_exclude": [
        # endogenous / too-slow: annual port/rail/air tonnage & registration stock
        "Sea Cargo", "Railway", "Air Cargo", "Sea Passenger Transport",
        "Air Passenger Traffic", "Road Safety", "Transport & Storage GDP",
    ],
    "globals": [
        ("brent",    "cost", -1, "fleet/trucking diesel cost"),       # lead ~1-2m  KEEP
        ("gasoline", "cost", -1, "taxi/ride-hail petrol cost"),       # NYMEX:RB1!  ADD
        ("usdidr",   "macro",-1, "USD fuel/import + risk-off"),       # 801 obs     ADD
        # NOTE: do NOT use the "dxy" token -> resolves to empty TVC:BBDXY.
        # Wire DXY only via explicit market id TVC:DXY if a resolver override exists.
    ],
    "macro": [
        ("id_bi_rate","cost", -1, "fleet financing cost"),           # ECONOMICS:IDINTR  ADD
        ("id_01y",    "cost", -1, "short-end funding (leads BI)"),   # TVC:ID01Y 793     ADD
        ("id_pmi",    "demand",+1, "new-orders -> freight (leading)"),# aIDPMIMAQ         ADD
        ("id_retail", "demand",+1, "goods to deliver (e-commerce)"),  # aIDRSLSAR         ADD
        ("id_imports","demand",+1, "inbound freight volume"),         # aIDIMGAR          ADD
        ("id_exports","demand",+1, "export cargo volume"),            # aIDEXGAR          KEEP
        ("id_gdp_real_q","demand",+1,"aggregate freight backstop"),   # aIDGDPAR1         KEEP
    ],
},
```
*(If `ceic_override` / `ceic_exclude` keys are not yet supported by the resolver, add them;
the cross-industry RICs above are confirmed in `idind.json`/`id.json`.)*

**New resolver fix required (repo-wide, flagged here):** map token `dxy` → `TVC:DXY`
(weekly_obs 800) instead of `TVC:BBDXY` (weekly_obs 0) in `GLOBAL_CORR`. Until then, omit
the DXY leaf rather than ship a dead one.

**Falsifiable backtest plan.**
1. **Baseline:** re-run `backtest/bt.py "Logistics"` after the re-aim above. Hypothesis:
   IC stays ≈ 0.00 under equal-weight because the segments don't co-move. *Confirming this
   null is itself the finding.*
2. **Cost-spine-only ablation:** wire ONLY `{brent, gasoline, usdidr, id_bi_rate, id_01y}`
   (all cost/macro, all loading − on the two large-caps). Hypothesis: if any config produces
   a non-placebo IC, it is this one (fwd IC ≥ +0.05, placebo pctile ≥ 0.80). If even this is
   flat, the basket is conclusively beta/idiosyncratic.
3. **Demand-prints ablation:** add the CEIC quantity demand leaves on top. Hypothesis: they
   *raise in-sample fit but not forward IC* — the textbook overfit signature. If forward IC
   does not improve, **drop them** and keep only the cost spine for attribution.
4. **Decision rule:** keep the change only if forward IC improves *out-of-sample*; otherwise
   ship the clean cost-spine tree and label the basket **"attribution / beta only — no
   forward skill claimed."** Never keep an in-sample-only demand driver.

---

### 4-line summary
- **Tree built:** **~13 demand leaves** (mobility/card+e-money, e-commerce, trade/PMI/exports/
  imports/Priok, mining-coal for TRJA, GDP) · **~9 supply/cost leaves** (brent/wti/gasoline/
  Dex diesel, BI/ID-1Y rates, multifinance fleet-credit, truck wholesales, registration stock)
  · **6 macro/flow** (USD/IDR, DXY, BI, ID10Y, bank credit, IDXTRANS benchmark).
- **Key forecast hypothesis:** the **fuel(−) + short-rate(−) + USD/IDR(−) cost spine** is the
  only branch loading with one sign on **BIRD+ASSA (80% of mcap)**, so it is the sole path to
  a non-placebo forward IC; the demand quantity prints are publication-lagged → attribution.
- **Honest verdict:** exactly-0.00 IC and placebo pctile 0.50 reflect a **structurally
  heterogeneous basket** (betas +0.72 to −0.55) — segments don't co-move, common factors
  cancel; this is **beta/idiosyncratic, attribution-only**, fixable only by mcap/segment-
  weighting or splitting the basket, not by adding drivers.
- **Data bugs found:** (1) `dxy` token → **empty `TVC:BBDXY`** (use `TVC:DXY`, 800 obs);
  (2) `id_lending_rate` → **None** (route financing via `ECONOMICS:IDINTR` + `TVC:ID01Y`);
  (3) wide `("Transport & Logistics", None)` pulls in **slow annual port/rail/air P1Y prints**
  (n16–63) that should be excluded.
