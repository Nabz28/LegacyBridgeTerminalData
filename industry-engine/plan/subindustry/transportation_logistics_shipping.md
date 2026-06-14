# Shipping (Transportation & Logistics) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-C
> target by mcap (**32 T**) but a **structurally hard** basket: the true revenue
> driver — **charter / freight rates** (Baltic Dry, Capesize, Panamax, time-charter
> equivalents) — **does not exist anywhere in the store**. There is no freight index,
> no charter-rate series, no TCE. The basket's forward OOS is **weak** (IC **+0.03**,
> placebo pctile **0.55**, hit−up **−0.10**). The honest job here is therefore (a) to
> build the best **proxy** tree we can — coal-cargo volume + China commodity demand as
> the *quantity* leg, bunker (oil) as the *cost* leg, USD/IDR as the *charter-revenue
> FX* leg — and (b) to **state plainly that the rate leg is missing**, that the basket
> is mostly an **attribution / cost-pass-through beta**, and to specify exactly what
> backfill (a freight index) would move it from explainer to forecaster. Every series
> cited exists in `catalog/{idind,id,cn,market}.json`; RICs, n_obs and weekly_obs are
> real and quoted.

---

## 1. Snapshot

| field | value |
|---|---|
| basket id | **`transportation_logistics_shipping`** · sub_sector **Shipping** · sector **Transportation & Logistics** |
| mcap | **~32 T** (#32 of 52 by mcap; small) |
| n members | **10** sea-transport operators |
| current grade | **partial** · conf **medium** |
| current kept drivers | **2** (the thin seed: `brent` cost −1, `wb_coal_au` demand +1, plus `id_exports`/`cn_ip_yoy` macro — only ~2 survive the keep gate) |
| **current forward OOS skill** | **IC +0.03 · hit−up −0.10 · placebo pctile 0.55 · flag `weak`** (n_oos **129**) |
| the gap | the seed has the *cost* leg (Brent bunker) and *one* cargo proxy (coal), but (1) **misses the cargo-demand depth** — the 428-obs CEIC Sea-Cargo throughput block and the cross-referenced **coal export volume** (the real bulk cargo); (2) **misses the USD charter-revenue FX leg** (`usdidr`) and **China commodity demand** (`cn_pmi_mfg`, `usdcny`); (3) **has no charter/freight RATE series at all** — the actual price the basket sells — which is the structural reason it does not forecast. |

**Members (what each does).** This is a **mixed sea-transport** basket — bulk/coal
barging, container/liner, tanker, and offshore-support — not a pure dry-bulk play.
The dispersion of *what cargo each name carries* is the dominant structural fact:

- **ELPI** (Pelita Samudera Shipping, ~13.6 T = **~42% of basket cap**) — **dry-bulk +
  coal barging/transhipment**; the largest weight and the most direct **coal-haulage**
  exposure (mother-vessel transhipment for coal miners). It dominates basket cap, so the
  coal-cargo channel is economically the single biggest leg.
- **TMAS** (Temas / Pelayaran Tempuran Emas, ~6.7 T, β −0.12) — **domestic container
  liner** (inter-island cabotage); revenue is container freight on Indonesian trade
  lanes, *not* seaborne bulk. A domestic-GDP / inter-island-trade name.
- **SMDR** (Samudera Indonesia) — **container + logistics + tanker**, regional liner
  (Asia intra-regional); a diversified container/logistics operator.
- **HATM** (Habco Trans Maritima) — **coal barging / bulk** for coal miners; small,
  coal-cargo levered.
- **PSSI** (IMC Pelita Logistik / Pelayaran, β +0.19) — **bulk + offshore / coal
  logistics**.
- **BLTA** (Berlian Laju Tanker, β −0.08) — **chemical / oil tanker** (a restructured
  legacy name); the basket's tanker sleeve — revenue is tanker charter rates + cabotage.
- **NELY** (Pelayaran Nelly Dwi Putri) — **tug-and-barge / bulk** (coal & commodity
  barging); small, coal-cargo levered.
- **HAIS** (Hasnur Internasional Shipping, β +0.18) — **coal barging** for the Hasnur
  group's coal; near-pure **coal-haulage** name.
- **GTRA** (Gunung Raja Paksi-adjacent / Gema Grahasarana? — Saptaindra-adjacent bulk; β
  **+2.43**) — the **highest-β, smallest, most sentiment-driven** name; a momentum sleeve,
  not a clean freight price-taker.
- **KLAS** (Sentral Mitra Informatika? — sea-transport listing, β +0.98) — small
  sea-transport / logistics name.

**The one-line characterisation:** the basket is **~55–65% coal-and-commodity bulk
barging** (ELPI/HATM/PSSI/NELY/HAIS — operators whose cargo *is* Indonesian coal/
commodity exports), **~25% domestic container/liner** (TMAS/SMDR — inter-island
cabotage), **~10% tanker** (BLTA), with two small high-β sentiment sleeves (GTRA/KLAS).
Economically it is far closer to a **levered play on Indonesian coal/commodity export
VOLUME** than to the global Baltic Dry cycle — which matters enormously, because the
coal-volume proxy is the one cargo leg we *can* actually wire.

---

## 2. Economic structure — how the basket makes money

A shipping operator's revenue identity is **rate × utilisation × capacity**, against a
fuel-heavy cost stack:

```
Revenue ≈ freight_or_charter_rate ($/t or $/day) × utilisation × fleet_capacity
          ── the RATE is the swing variable, and it is NOT in the store ──
Cost    ≈ bunker_fuel (Brent/gasoil-linked) + crew + vessel_financing(interest)
          + charter-in/lease + drydock/maintenance + port/canal fees
EBITDA  ≈ Revenue − bunker×consumption − financing − opex
margin  ≈ f( rate − bunker_cost )           ← the spread that drives equity returns
```

**The margin swing factor is the rate–bunker spread.** When freight rates rise faster
than bunker costs (a tightening shipping market), the operator's margin explodes (high
operating leverage — capacity is fixed, so incremental rate is almost pure margin).
When rates collapse but bunker stays high (the classic shipping bust), margins go
negative — this is why shipping equities are violently cyclical and why **the rate is
the variable that matters**.

**The two halves of the basket behave differently:**

- **Bulk / coal-barging sleeve (ELPI/HATM/PSSI/NELY/HAIS):** revenue ≈ *barging /
  transhipment rate × coal volume hauled*. The **volume** half is a function of
  **Indonesian coal export tonnage** (the cargo demand — cross-referenced from the Coal
  basket). The **rate** half is barging rates, which loosely track regional dry-bulk
  freight (Baltic Supramax/Handysize) — **not in store**. So we can proxy the *volume*
  leg cleanly (coal export volume, port throughput) but **not the rate leg**.
- **Container / liner sleeve (TMAS/SMDR):** revenue ≈ *container freight rate × boxes ×
  domestic trade lanes*. Driven by **domestic GDP / inter-island trade / consumption**,
  and by cabotage protection (a regulatory moat, not a price series). Container freight
  rates (e.g. SCFI) are **not in store** either.
- **Tanker sleeve (BLTA):** revenue ≈ *tanker charter rate × cargo*; driven by oil-trade
  volumes and tanker-market tightness — again, **no tanker rate series in store**.

**What a sell-side analyst actually watches:** the **Baltic Dry Index** and its
sub-indices (Capesize/Panamax/Supramax) for bulk; **time-charter-equivalent (TCE) rates**
and 1-year period charter rates; **Indonesian coal export volume + HBA** (the cargo
demand for the bulk sleeve); **bunker fuel (VLSFO/MGO, Brent-and-gasoil-linked)**; **fleet
utilisation / orderbook / scrapping** (capacity); **USD/IDR** (most charter revenue is
USD-priced while a chunk of cost is IDR); and **interest rates** (vessels are highly
leveraged assets — financing cost is a real margin line). **Of this list, the store
contains only bunker (oil), the coal-volume cargo proxy, USD/IDR, and rates — it has
NONE of the rate series, which are precisely the analyst's #1 watch item.**

**Intra-basket dispersion — the dominant subtlety:**
- **ELPI ~42% of cap** anchors the basket to the **coal-bulk** channel; the coal-volume
  / China-commodity proxy is the *right* instrument for the largest weight.
- **TMAS/SMDR (container, domestic)** respond to **domestic GDP / consumption**, NOT to
  coal or the global bulk cycle — a coal-led signal mis-attributes them.
- **GTRA (β +2.43)** and **KLAS (β +0.98)** are small, illiquid, high-β sentiment sleeves
  that inject noise; their returns are momentum-driven, not freight-fundamental.
- The **equal-weight** basket the engine uses (per BACKTEST.md header) means the small
  coal-barging names (HATM/NELY/HAIS) carry as much signal weight as mega-cap ELPI — so
  the **coal-cargo channel is even more dominant in equal-weight space** than cap suggests.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return
> vs IHSG for a *rise* in the driver. `lead` = expected months the driver moves *before*
> the equities. **Liquid exogenous price/rate series → forecast candidates; CEIC
> quantity prints (throughput, cargo, export volume) are publication-lagged → attribution.**
> The freight/charter RATE — the true revenue driver — is **absent from the store** and is
> shown as a DEAD/GAP leaf in every branch it belongs to.

### D1 — FREIGHT / CHARTER RATE (the true revenue driver — MISSING)
```
FREIGHT / CHARTER RATE  ($/t, $/day, TCE — the price the basket sells; ~the whole thesis)
├─ D1a global dry-bulk rate ─────► [Baltic Dry Index BDI]                NO SERIES IN STORE — structural gap ✗
│      (Capesize/Panamax/Supramax) [Capesize/Panamax TCE]                NO SERIES IN STORE ✗
├─ D1b container freight rate ───► [SCFI / CCFI container index]         NO SERIES IN STORE ✗ (TMAS/SMDR liner)
├─ D1c tanker charter rate ──────► [BDTI/BCTI dirty/clean tanker]        NO SERIES IN STORE ✗ (BLTA)
└─ D1d coal-barging rate (ID) ───► [domestic barging $/t]                NO SERIES IN STORE ✗ (ELPI/HATM/NELY/HAIS)
```

- **This is the honest centre of the whole file.** The variable the basket actually
  charges — the freight/charter rate — **has no representation in the store**: no Baltic
  Dry Index, no Capesize/Panamax/Supramax TCE, no SCFI/CCFI container index, no BDTI/BCTI
  tanker index, no Indonesian coal-barging rate. The AGENT_BRIEF data-quality notes and a
  full scan of `market.json` confirm **there is no freight series of any kind**. Because
  the *price* leg is missing, the engine can only see the **volume** leg and the **cost**
  leg — it is structurally blind to the single most important swing factor, and this is
  the first-order reason the basket does not forecast (§8). **Do not fake a proxy for the
  rate** (e.g. iron ore or a commodity index is a *volume*/demand proxy, not a rate); flag
  it as a true gap and a backfill task (§9).

### D2 — CARGO VOLUME (the demand leg we CAN proxy — coal/commodity exports)
```
CARGO VOLUME  (bulk barging cargo = Indonesian coal/commodity export tonnage; the demand we can see)
├─ D2a Indonesian COAL export vol ─► [CEICI323981702 Vol: Coal,Coke,Briquettes export, kg mn, n172, P1M]  sign +1 · lead 0m · ATTRIBUTION ★cross-ref Coal
│      (the bulk-barge cargo)         [CEICI391910527 Coal production vol (Pama/UNTR), Ton mn, n232, P1M]   sign +1 · lead 0m · ATTRIBUTION (output→haulage)
├─ D2b sea-cargo THROUGHPUT ───────► [CEICI14575801 Cargo loaded: domestic 4 ports, Ton, n428, P1M]        sign +1 · lead 0m · ATTRIBUTION (loaded = export-side)
│      (port tonnage = work done)     [CEICI14574801 Cargo loaded: international, Ton, n427, P1M]            sign +1 · lead 0m · ATTRIBUTION
│                                     [CEICI454752297 Cargo unloaded: domestic, Ton, n244, P1M]             sign +1 · lead 0m · ATTRIBUTION (import-side)
├─ D2c key-port export tonnage ────► [CEICI14575001 Intl: Tanjung Priok, Ton, n427, P1M]                    sign +1 · lead 0m · ATTRIBUTION
│      (Priok/Perak/Belawan/Makassar) [CEICI14577101 Intl: Tanjung Perak, Ton, n427, P1M]                   sign +1 · lead 0m · ATTRIBUTION
│                                     [CEICI14577201 Intl: Makassar, Ton, n427, P1M]                        sign +1 · lead 0m · ATTRIBUTION
└─ D2d China commodity PULL ───────► [aCNPMIMT CN NBS Mfg PMI, Index, P1M]                                  sign +1 · lead 1–3m · FORECAST (survey leads cargo)
       (the demand BEHIND the cargo)  [aCNIP CN IP YoY, P1M]                                                sign +1 · lead 1–2m · attribution
```

- **D2a — coal export volume = the bulk cargo (the cross-ref to the Coal basket).** The
  bulk-barging sleeve (~55% of the basket) hauls **Indonesian coal**. The cargo *demand*
  is therefore **coal export tonnage**: `CEICI323981702` (Volume: Coal, Coke & Briquettes
  export, kg mn, **n172**, monthly) is the direct seaborne-cargo print; `CEICI391910527`
  (coal **production** volume via Pamapersada/UNTR, Ton mn, **n232**) is the upstream
  output that *becomes* the haulage. These are the **single most important demand series
  for this basket** and are **not currently wired** (the seed only has the global
  `wb_coal_au` *price*, which is a revenue proxy for *miners*, not a *volume* proxy for
  *haulers*). **CEIC quantity prints → publication-lagged ~3–6 weeks → ATTRIBUTION, not
  forecast.** Critically: more coal *volume* helps the hauler even when the coal *price*
  falls (barging is paid per tonne, largely independent of the coal price) — so this leg
  is *additive*, not redundant, to the coal-price leg.
- **D2b — sea-cargo throughput (port tonnage).** The CEIC Sea-Cargo block gives **monthly
  port throughput** with deep history (**n427–428, back to ~1990**). `CEICI14575801`
  (cargo *loaded* domestic, 4 ports) and `CEICI14574801` (cargo loaded international) are
  the **export-side work done** — a direct measure of national sea-freight activity.
  `CEICI454752297` (cargo *unloaded* domestic, n244) is the import-side. These are
  coincident/lagging tonnage prints → attribution. They are the broadest "how busy are the
  ports" demand proxy and capture the container/liner sleeve (TMAS/SMDR) that coal volume
  misses.
- **D2c — key-port export tonnage.** Disaggregated international tonnage at **Tanjung
  Priok** (`CEICI14575001`), **Tanjung Perak** (`CEICI14577101`), **Makassar**
  (`CEICI14577201`), **Belawan** (`CEICI14574901`), all n427, monthly. Same role as D2b
  (attribution) at port granularity — useful for the engine to pick the port that
  co-moves best, but all are publication-lagged tonnage.
- **D2d — China commodity pull (the demand BEHIND the cargo, and the one leg that LEADS).**
  China is the destination for most Indonesian coal/commodity exports, so **China's
  industrial pulse leads the cargo**. `aCNPMIMT` (NBS manufacturing PMI, diffusion index)
  is a **survey that leads physical commodity demand by 1–3 months** → the **one genuine
  forecast candidate** in the demand tree. `aCNIP` (China IP YoY) is the coincident
  activity print. The mechanism: China demand → Indonesian coal/commodity export orders →
  cargo to haul → barging-operator volume. Both partly in the seed (`cn_ip_yoy`); **add
  `cn_pmi_mfg` as the leading leaf.**

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (bunker fuel, fleet capacity, financing, policy)
├─ S1 bunker fuel cost ──────────► [ICEEUR:BRN1! Brent, wk800]            sign −1 · lead 0–1m · COST · FORECAST-grade (liquid)  ★primary cost
│      (VLSFO/MGO ~ Brent+gasoil)   [NYMEX:HO1! Heating Oil/gasoil, wk800] sign −1 · lead 0–1m · COST (closest to marine gasoil)
│                                   [NYMEX:RB1! Gasoline, wk800]           sign −1 · lead 0–1m · COST (refined-product co-move)
├─ S2 fleet capacity / orderbook ─► [vessel orderbook / scrapping]        NO SERIES IN STORE ✗ (capacity = the supply side of rate)
├─ S3 vessel financing cost ─────► [TVC:ID10Y, wk798]                     sign −1 · lead 0–2m · COST (leveraged-asset financing)
│      (ships are debt-financed)    [ECONOMICS:IDINTR BI 7DRR, P1M]        sign −1 · lead 0–3m · COST (policy rate → loan cost)
│                                   [TVC:US10Y, wk800]                     sign −1 · lead 0–2m · COST (USD ship-finance)
└─ S4 cabotage / DMO policy ─────► (regulatory moat — no price series)     POLICY annotation (Indonesian cabotage protects domestic liners)
```

- **S1 — bunker fuel = the one cost leg we can wire cleanly, and it is a LIQUID price.**
  Marine fuel (VLSFO / MGO) tracks **Brent** plus a gasoil crack; `ICEEUR:BRN1!`
  (**wk800**) is the honest primary proxy, with `NYMEX:HO1!` (heating oil / gasoil,
  **wk800** — the closest listed analogue to **marine gasoil**) and `NYMEX:RB1!` (gasoline,
  wk800) as refined-product co-moves. **Bunker is typically 35–50% of a shipping
  operator's cash cost**, so this is a material, real-time, *leading* cost driver — the
  sign is unambiguously **−1** (higher fuel → margin compression). The seed already has
  `brent` (cost −1) — **keep it; this is the most defensible single driver in the basket.**
  Note the genuine 2-sided tension: oil also co-moves with the *energy/coal complex*, and a
  coal bull (good for the bulk-cargo sleeve's volume) usually coincides with higher oil —
  so the *empirical* net Brent sign can be weaker than −1; let the theory-reconciliation
  gate estimate it, but the **a-priori cost sign is −1**.
- **S2 — fleet capacity / orderbook (the supply side of the rate — MISSING).** Freight
  rates are set by the **balance of cargo demand vs vessel supply** (orderbook, deliveries,
  scrapping, fleet utilisation). The store has **no orderbook, fleet, or utilisation
  series** → the *supply* half of the rate equation is as invisible as the rate itself.
  Documented gap; do not proxy.
- **S3 — vessel financing cost (ships are leveraged assets).** Vessels are bought with
  heavy debt, so the **financing rate is a real margin line and a re-rating factor** (a
  shipping equity is part fixed-asset-yield play). `TVC:ID10Y` (**wk798**), the **BI 7DRR**
  policy rate (`ECONOMICS:IDINTR`), and `TVC:US10Y` (**wk800**, for USD ship finance) are
  the financing-cost handles, sign **−1** (higher rates → higher financing cost + lower
  asset value). **Not currently wired — a reasonable depth-add**, though for small
  illiquid names the rate channel is noisy. These are liquid yields → mild lead (0–2m).
- **S4 — cabotage / policy (annotation).** Indonesian **cabotage law** reserves
  inter-island shipping for domestic flag carriers — a **regulatory moat** that supports
  TMAS/SMDR's domestic liner pricing. It is a *structural* support, not a time-varying
  price series → **policy annotation, not a fitted driver.**

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR (charter-revenue FX) ─► [FX_IDC:USDIDR, wk801]   sign +1 · lead 0m · macro ★ (most charter/freight is USD-priced)
├─ M2 broad USD (DXY) ──────────────► [TVC:DXY, wk800]         sign −1 · lead 0–1m · macro (EM-flow + commodity-trade headwind)  ⚠seed-default routes dxy→TVC:BBDXY wk0 DEAD
├─ M3 China FX (USD/CNY) ───────────► [FX_IDC:USDCNY, wk801]   sign −1 · lead 0–1m · macro (weak CNY → dearer commodities for China → softer cargo pull)
├─ M4 Indonesia trade volume ───────► [aIDEXGAR Exports YoY, P1M]  sign +1 · lead 0m · attribution (export cargo)
│                                      [aIDIMGAR Imports YoY, P1M]  sign +1 · lead 0m · attribution (import cargo / unloaded)
├─ M5 domestic activity (liner) ────► [aIDGDPAR1 GDP YoY, P3M]      sign +1 · lead 0m · demand (inter-island/container — TMAS/SMDR)
└─ M6 risk appetite ────────────────► [AMEX:DBC DB Commodity, wk800]  sign +1 · lead 0–1m · commodity-trade beta (cargo demand proxy)
```

- **M1 USD/IDR = +1 — the charter-revenue FX leg, currently MISSING from the seed.** Most
  international charter and freight is **USD-priced**, while a meaningful share of operating
  cost (crew, local port fees, IDR overheads) is in rupiah. So **IDR depreciation is a
  translation tailwind** to USD-earning operators (the bulk/tanker/regional-liner names).
  `FX_IDC:USDIDR` (**wk801**) → sign **+1**. **This is a clean, defensible leg the seed
  omits — the highest-priority macro add.** (Caveat: heavily USD-indebted names — legacy
  BLTA — have a USD-debt offset, so the *basket* net is positive but not as strong as a
  pure USD-earner; let the gate temper it.)
- **M2 DXY = −1, and the engine-wide resolver bug.** A stronger broad dollar drains EM
  trade-finance and caps the commodity-trade complex that feeds the cargo → negative for
  the basket. **But the `dxy` resolver in `GLOBAL_CORR` points to `TVC:BBDXY`, which is
  wk0 (EMPTY)** — so DXY is effectively unwired engine-wide. The honest fix is **`TVC:DXY`**
  (wk800), per the AGENT_BRIEF data-quality caveat (a cross-basket bug, not shipping-
  specific — flagged in §9, fix it in `GLOBAL_CORR`).
- **M3 USD/CNY = −1.** A weaker CNY makes USD-priced coal/commodities dearer for Chinese
  buyers → softer import pull → less Indonesian export cargo to haul → mild negative.
  `FX_IDC:USDCNY` (**wk801**), not wired — a reasonable test add.
- **M4 Indonesia trade volume.** `aIDEXGAR` (exports YoY) and `aIDIMGAR` (imports YoY) are
  the **national cargo flows** — the broadest demand attribution for sea freight (exports →
  loaded cargo, imports → unloaded cargo). Coincident prints → attribution. `aIDEXGAR` is
  already in the seed; **add `aIDIMGAR`** for the import/unloaded side (TMAS domestic liner).
- **M5 domestic GDP (the container/liner demand leg).** The **container/inter-island
  sleeve (TMAS/SMDR)** is driven by **domestic consumption and inter-island trade**, which
  scale with **Indonesian GDP**. `aIDGDPAR1` (real GDP YoY, quarterly) → demand **+1**.
  This is the one leg that addresses the non-coal ~25% of the basket; quarterly + lagged →
  attribution.
- **M6 commodity-trade beta.** `AMEX:DBC` (the `bcom` resolver, wk800) is a broad
  commodity risk-on/off state — a *demand* proxy for the commodity cargo the bulk sleeve
  hauls (and the only liquid, leading handle that gestures at the volume cycle). Modest +1.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `CEICI323981702` coal export volume | **Energy / Coal** | **demand +1** (D2a) | the bulk-barge cargo = Indonesian coal tonnage (the #1 demand leg) |
| `CEICI391910527` coal production vol | **Energy / Coal** | **demand +1** (D2a) | upstream coal output → haulage work |
| `wb_coal_au` API2 price | Energy / Coal (market) | **demand +1** (weak) | coal *price* lifts mining activity → more cargo (but price ≠ volume; secondary) |
| `ICEEUR:BRN1!` Brent | Energy / Oil | **cost −1** (S1) | bunker fuel ~35–50% of cash cost |
| `NYMEX:HO1!` heating oil/gasoil | Energy / Refined | **cost −1** (S1) | closest listed analogue to marine gasoil (MGO) |
| `aCNPMIMT` China PMI | China / Surveys | **demand +1** (D2d) | China activity LEADS commodity-export cargo 1–3m |
| `aCNIP` China IP | China / Activity | **demand +1** (D2d) | China demand → export volume → cargo |
| `FX_IDC:USDCNY` | China / FX | **macro −1** (M3) | China import affordability → cargo pull |
| `AMEX:DBC` DB Commodity | Cross-commodity | **demand +1** (M6) | commodity-trade beta = bulk cargo cycle |
| `aIDGDPAR1` GDP | ID macro / Activity | **demand +1** (M5) | domestic GDP → inter-island/container demand (TMAS/SMDR) |

**Deliberate non-linkages.** Do **not** wire `SGX:FEF1!` iron ore or `SGX:JKM1!` LNG
(both **wk0, DEAD**), and do **not** invent a freight proxy from a commodity *price* index
(a price index is a *demand/volume* proxy, not a *rate* — conflating them is the trap).
The **CPO cargo** channel (some of these vessels haul palm oil) could borrow
`MYX:FCPO1!`, but it is a *price* not a *volume*, and the CPO-cargo share is small —
leave it out of v1 to keep the tree coal/commodity-volume-led and honest.

---

## 7. Currently-wired vs available

### 7a. The thin `Shipping` seed vs proposed tree

Current seed (`mapping.py`):
```python
"Shipping": {
    "ceic": [("Transport & Logistics", "Sea Cargo")],
    "globals": [("brent", "cost", -1, ...), ("wb_coal_au", "demand", +1, ...)],
    "macro":   [("id_exports", "demand", +1, ...), ("cn_ip_yoy", "demand", +1, ...)],
}
```

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `ceic ("Transport & Logistics","Sea Cargo")` | category pull | idind Sea-Cargo block (n427–428) | **keep** | pulls the throughput/port-tonnage attribution series (D2b/D2c) |
| `brent` | cost −1 | `ICEEUR:BRN1!` wk800 | **KEEP — the best driver** | bunker cost; the one liquid, leading, defensible leg |
| `wb_coal_au` | demand +1 | `ICEEUR:ATR1!` wk782 | **keep (demote)** | coal *price* is a weak volume proxy; the *volume* series (D2a) is the real cargo leg |
| `id_exports` | demand +1 | `aIDEXGAR` wk524 | **keep** | national export cargo attribution |
| `cn_ip_yoy` | demand +1 | `aCNIP` wk524 | **keep** | China demand attribution |
| *(none)* coal export **volume** | — | `CEICI323981702` n172 | **ADD demand +1** via override | the actual bulk cargo (cross-ref Coal) — biggest miss |
| *(none)* `cn_pmi_mfg` | — | `aCNPMIMT` | **ADD demand +1** | the **leading** China survey (1–3m) — the only forecast candidate |
| *(none)* `usdidr` | — | `FX_IDC:USDIDR` wk801 | **ADD macro +1** | USD charter-revenue FX leg — clean, omitted |
| *(none)* `heating_oil` | — | `NYMEX:HO1!` wk800 | **ADD cost −1 (test)** | marine-gasoil-closest bunker proxy |
| *(none)* `aIDGDPAR1` | — | `aIDGDPAR1` | **ADD demand +1** | domestic/container sleeve (TMAS/SMDR) |
| *(none)* `id_imports` | — | `aIDIMGAR` | **ADD demand +1 (test)** | import/unloaded cargo |
| *(none)* `usdcny` | — | `FX_IDC:USDCNY` wk801 | **ADD macro −1 (test)** | China import affordability → cargo pull |
| *(none)* `id_10y`/`id_bi_rate` | — | `TVC:ID10Y` / `ECONOMICS:IDINTR` | **ADD cost −1 (test)** | leveraged-vessel financing cost |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | engine-wide resolver bug; add macro −1 |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| **Baltic Dry / Capesize / Panamax / Supramax rate** | *(none)* | **no freight/charter index in store at all — THE structural gap; the basket's true revenue driver is invisible** |
| Container freight (SCFI/CCFI) | *(none)* | no container-rate series (TMAS/SMDR liner) |
| Tanker rate (BDTI/BCTI) | *(none)* | no tanker-rate series (BLTA) |
| Indonesian coal-barging rate | *(none)* | no domestic barging-rate series |
| Fleet orderbook / scrapping / utilisation | *(none)* | no vessel-supply series → supply side of the rate invisible |
| Asian LNG / gas-cargo | `SGX:JKM1!` | **wk0 DEAD** |
| Iron-ore cargo demand | `SGX:FEF1!` | **wk0 DEAD** |

---

## 8. Forecastability — an honest concession

**The backtest fact:** Shipping is **IC +0.03 at the 0.55 placebo percentile** over
**129** forward months, with **hit−up −0.10** — i.e. it barely beats a coin-flip on
magnitude and is **below the unconditional up-rate on direction**. The flag is **`weak`**.
BACKTEST.md's taxonomy puts it among the baskets whose drivers co-move
**contemporaneously** but do not **forecast** — and shipping is a clear case of this for
three structural reasons:

1. **The true revenue driver — the freight/charter RATE — is not in the store at all.**
   Every other branch (bunker cost, coal-cargo volume, China demand, USD/IDR) is a
   *second-order* proxy. We can see the operator's **cost** (bunker) and the **volume** of
   cargo, but **not the price it charges** — and the price (the rate) is what swings the
   margin and the equity. A model blind to the single dominant variable cannot forecast;
   at best it explains the cost-pass-through beta. **This is not a tuning problem — it is a
   missing-data problem**, and no amount of re-roling the volume/cost series fixes it.
2. **The wireable demand legs are publication-lagged CEIC quantity prints** (coal export
   volume, port throughput, ID exports) — coincident-to-lagging by construction, so they
   *attribute* last month's move rather than *predict* next month's. **The one genuine
   lead is `aCNPMIMT`** (China PMI, 1–3m) — the single forecast candidate, and it acts
   through a long, noisy chain (China demand → export orders → cargo → barging revenue →
   earnings → price).
3. **Internal sign-contradiction across the cost leg.** Brent is **−1 as bunker cost** but
   **co-moves +** with the coal/energy complex that drives the bulk sleeve's *volume* — so
   the single most reliable series points two ways at once, and the blended posture is
   muddy. (Contrast Coal, where every leg points the same way → IC +0.23.)

**The contemporaneous-vs-forward distinction.** Even contemporaneously, the explanatory
power is modest (the rate gap caps it). The basket is best read as a **cost-pass-through /
commodity-cargo beta with NO forward edge** — an *attribution* tool ("how much of this
month's move was bunker + coal-volume + USD/IDR"), **not a forecaster**. The honest
verdict, in the language of BACKTEST.md, is: **explainer/beta only.**

**What would move it from explainer to forecaster (the one real lever):** **backfill a
freight index.** If a **Baltic Dry Index** (or Capesize/Panamax TCE, or a container SCFI)
were added to the store as a liquid weekly series, it would be the basket's #1 driver and
the **only** leg with a genuine claim to forecast — freight rates are liquid, exogenous,
and *lead* the lagging earnings/price. That single addition would likely do more than every
other change combined. Absent it, the realistic ceiling is a *cleaner attribution* (add
coal-volume + USD/IDR + China-PMI; fix DXY), not forward skill. **The §9 spec is therefore
framed as "make the attribution honest and richer, and file the freight-index backfill as
the only path to forecasting" — not as a forecast rescue.**

---

## 9. Engine-wiring spec — concrete `mapping.py`

Resolvers that already populate correctly: `brent→ICEEUR:BRN1!`,
`wb_coal_au→ICEEUR:ATR1!`, `cn_ip_yoy→aCNIP`, `cn_pmi_mfg→aCNPMIMT`,
`usdidr→FX_IDC:USDIDR`, `usdcny→FX_IDC:USDCNY`, `id_exports→aIDEXGAR`,
`id_imports→aIDIMGAR`, `id_gdp_real_q→aIDGDPAR1`, `heating_oil→NYMEX:HO1!`,
`id_10y→TVC:ID10Y`, `id_bi_rate→ECONOMICS:IDINTR`. **One resolver fix** is needed first
(engine-wide, not shipping-specific):

```python
# --- GLOBAL_CORR edit (apply once; helps every basket that uses DXY) ---
#   "dxy": "TVC:DXY",     # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
```

```python
"Shipping": {  # 10 mixed sea-transport names; equal-weighted. ELPI ~42% (coal-bulk).
    # HONEST STATUS: the true driver (freight/charter RATE) is NOT in the store at all
    # (no Baltic Dry / TCE / SCFI / tanker index). This tree is attribution/beta, NOT a
    # forecaster (OOS IC +0.03, placebo 0.55, hit-up -0.10). Goal: richer, honest
    # attribution (cargo VOLUME + bunker + USD/IDR + China PMI) — not a forecast rescue.
    "ceic": [("Transport & Logistics", "Sea Cargo")],
    # Re-role the CEIC throughput pulls explicitly: loaded/unloaded tonnage = cargo
    # demand (attribution); coal export VOLUME = the actual bulk-barge cargo.
    "ceic_override": [
        ("cargo loaded",        "demand", +1),  # CEICI14575801/14574801 port tonnage (export-side)
        ("cargo unloaded",      "demand", +1),  # CEICI454752297 import-side tonnage
        ("international:",       "demand", +1),  # CEICI1457xxxx key-port export tonnage
        ("volume: coal",        "demand", +1),  # CEICI323981702 coal export volume = bulk cargo (cross-ref Coal)
    ],
    # Sea-passenger and air-freight series are a different business; keep the basket on
    # cargo tonnage. (Sea-Cargo subcategory is already cargo-only, so no exclude needed
    # beyond the category scoping — passenger lives in 'Sea Passenger Transport'.)
    "globals": [
        ("brent",       "cost",   -1, "bunker fuel ~35-50% of cash cost — the one liquid leading driver (note: +co-move with coal complex partly offsets)"),
        ("heating_oil", "cost",   -1, "marine-gasoil-closest bunker proxy (NYMEX:HO1! wk800)"),
        ("wb_coal_au",  "demand", +1, "coal PRICE lifts mining activity -> more cargo (weak; price != volume, demote vs D2a)"),
        ("bcom",        "demand", +1, "broad commodity-trade beta = bulk cargo cycle (AMEX:DBC)"),
    ],
    "macro": [
        ("usdidr",     "macro",  +1, "USD-priced charter/freight revenue vs IDR cost -> weak IDR helps (the omitted FX leg)"),
        ("cn_pmi_mfg", "demand", +1, "China mfg PMI LEADS commodity-export cargo 1-3m -- the ONLY forecast candidate"),
        ("cn_ip_yoy",  "demand", +1, "China activity -> export volume -> cargo (attribution)"),
        ("usdcny",     "macro",  -1, "weak CNY -> dearer commodities for China -> softer cargo pull (test)"),
        ("id_exports", "demand", +1, "national export cargo (attribution)"),
        ("id_imports", "demand", +1, "import/unloaded cargo -- TMAS domestic liner (test)"),
        ("id_gdp_real_q","demand",+1, "domestic GDP -> inter-island/container demand (TMAS/SMDR sleeve)"),
        ("dxy",        "macro",  -1, "broad USD drains EM trade-finance + commodity complex (FIXED resolver -> TVC:DXY)"),
        ("id_10y",     "macro",  -1, "leveraged-vessel financing cost + asset re-rating (test, noisy on small names)"),
    ],
},
```

**Notes for the implementer.**
- **The freight-index backfill is the only real path to forward skill — file it as a data
  task.** No Baltic Dry / Capesize-Panamax TCE / SCFI / tanker rate exists in the store.
  Until one is added (a liquid weekly series), the basket is structurally an
  attribution/beta and the §8 verdict (explainer-only) stands. **Do not synthesise a rate
  from a commodity *price* index — that is a volume proxy, not a rate, and would falsely
  claim forecast power.**
- **The biggest honest depth-add is coal export VOLUME** (`CEICI323981702`, n172) — the
  actual cargo, cross-referenced from the Coal basket, and *additive* to the coal *price*
  (barging is paid per tonne, largely price-independent). It is a publication-lagged CEIC
  print → attribution, never a forward claim.
- **`usdidr` (+1) is the cleanest omitted leg** — most charter/freight revenue is USD; the
  seed leaves it out entirely. High priority.
- **`dxy` resolver fix (`TVC:BBDXY`→`TVC:DXY`)** is an engine-wide bug; apply in
  `GLOBAL_CORR` and verify DXY now resolves (n≈800 weekly).
- **Brent's two-sided role** (cost −1 vs energy-complex co-move +) means its empirical net
  sign is muddy — keep it as **cost −1** a-priori but expect the gate to temper it; this
  ambiguity is part of why the basket does not forecast (§8).
- The container/liner sleeve (TMAS/SMDR, ~25%) is addressed by `id_gdp_real_q` +
  `id_imports`; the coal-bulk sleeve (~55%) by coal-volume + China-PMI + bunker. The
  high-β sentiment sleeves (GTRA/KLAS) are an accepted noise floor, not a driver to chase.

**Falsifiable backtest plan (keep/kill gate).** Run `backtest/bt.py "Shipping"` and keep
each change only if forward IC holds/improves vs the +0.03 baseline AND the theory gate
passes — but **expect modest gains; the rate gap caps the ceiling**:
1. **`dxy` fix** (`TVC:DXY`) vs dead `BBDXY` — confirm DXY now contributes (it was
   contributing nothing).
2. **+ coal export volume override (`CEICI323981702`, demand +1)** — *the* attribution
   test: does the actual bulk cargo improve explanatory power / IC over the coal *price*?
   Keep if additive; it should at minimum sharpen attribution even if forward IC barely
   moves (it is publication-lagged).
3. **+ `usdidr` (+1) + `cn_pmi_mfg` (+1)** — the FX leg and the one leading survey. **The
   only plausible forward-IC lift is `cn_pmi_mfg`** (it has a real 1–3m lead); keep it iff
   forward IC rises, since the rest are coincident.
4. **+ `id_gdp_real_q` / `id_imports` (container sleeve)** — confirm they do not dilute IC;
   they address the non-coal weight and may help attribution more than forecast.
5. **+ `id_10y` / `usdcny`** — marginal financing/affordability legs; keep only if they
   survive the gate and IC holds.

**Success criterion:** a **richer, more honest attribution tree** (cargo *volume* + bunker
+ USD/IDR + China-PMI + fixed DXY) that holds or modestly beats +0.03 — and an explicit,
documented **freight-index backfill task** recorded as the single change that could move
the basket from explainer to forecaster. **No change should claim forward skill the data
cannot support; the rate is missing, and this file says so plainly.**
