# Ports (Infrastructure) — Driver-Tree Plan

> Detail file for the `Ports` sub-industry basket (id `infrastructure_ports`).
> Framework: `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4
> template · §5 capsule #36). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs`.
>
> **One-line thesis: this is a tiny (~17T), MISLABELLED, high-operating-leverage basket of
> terminal/marine-services operators whose economics are THROUGHPUT × regulated-tariff − fixed
> cost. The honest problems are three: (1) the basket is NOT a clean sea-port basket — its two
> biggest names are AIR-side (GMF AeroAsia aircraft-MRO 6.5T + Cardig Aero air-cargo handling
> 3.7T = 60% of mcap), so a sea-cargo-throughput tree only explains the ~40% sea-port leg
> (IPCC car-terminal, IPCM marine-services, PORT, KARW); (2) every demand driver we have is a
> THROUGHPUT QUANTITY print — coincident, publication-lagged ~45-60d, and several came out
> WRONG-SIGN in the current fit — so throughput is attribution, not forecast; (3) tariffs are
> REGULATED and sticky (Pelindo concession tariffs change in multi-year steps), so the price leg
> of the revenue identity carries almost no high-frequency signal. The only plausible LEAD is the
> trade-cycle PARENT of throughput — trade-volume momentum and GDP/IP — captured by deep monthly
> export-volume prints; even that is weak. Matches the current OOS = NONE, fwd IC +0.037, placebo
> pctile 0.62: the basket is a coincident trade-beta + idiosyncratic-MRO composite, not a
> forecaster.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Ports**, sector *Infrastructure*, id `infrastructure_ports` |
| mcap | **~16.8T** (capsule #36 lists 17T; worklist total_mcap 16.83T) |
| n_names | **6** (worklist); **5 used** by the engine (PORT dropped — too little price history) |
| Members | **GMFI** (`IDX:GMFI`, **6.49T**, β−0.149) — **GMF AeroAsia**, aircraft MRO (maintenance/repair/overhaul); market.json tags it *Industrial Services*, **NOT a sea port**; **CASS** (`IDX:CASS`, **3.68T**, β0.302) — **Cardig Aero Services**, *Air Transportation* — airport ground-handling + AIR-cargo terminals (Garuda/AP linkage), again **not sea**; **PORT** (`IDX:PORT`, **2.59T**, β0.642) — **Nusantara Pelabuhan Handal**, coal/bulk terminal operator (Adaro-adjacent), **newer listing → dropped by the engine** (insufficient weekly history); **IPCC** (`IDX:IPCC`, **2.21T**, β0.141) — **Indonesia Kendaraan Terminal** (Pelindo car/vehicle terminal at Tanjung Priok) — *Ports & Airports*; **IPCM** (`IDX:IPCM`, **1.69T**, β−0.097) — **Jasa Armada Indonesia** (Pelindo marine services: tugboats / pilotage / mooring); **KARW** (`IDX:KARW`, **0.16T**, β n/a) — **ICTSI Jasa Prima / Karwell**, container-terminal-adjacent, micro-cap noise. |
| Effective composition | **Bimodal and air-heavy.** ~**60% of mcap is air-side** (GMFI aircraft-MRO + CASS air-cargo/ground-handling) — driven by aircraft fleet activity, air passenger/cargo traffic, USD spare-part cost and Garuda's credit, **not** by sea-cargo throughput. Only ~**40%** is the genuine sea-port/terminal leg (IPCC vehicle terminal, IPCM marine services, PORT bulk, KARW). PORT — the purest sea-port name — is **dropped** (no history), so the *used* basket is even more air-tilted. The equal-weight engine blends an **aircraft-MRO/air-cargo factor** with a **sea-terminal-throughput factor**. **Read every sea-cargo driver below as explaining only the ~40% sea leg of a basket whose biggest mover (GMFI, 6.5T) is an aircraft-maintenance company.** This mislabelling is the single largest reason a sea-throughput tree under-fits. |
| Current grade | **partial** |
| Current kept-driver count | **12 anchored candidates** in the worklist seed — but the engine **KEPT 0** at the significance/theory gate (`output/infrastructure_ports.json`: `n_kept: 0`, verdict **NEUTRAL [50/100, none confidence]**, "no drivers"). The "12" in `_state.txt` is the *anchored candidate* count, not survivors. |
| Current forward OOS | **NONE** — fwd IC **+0.037**, fwd hit 0.519 vs up-rate 0.473 (edge +0.047), long-short +0.27%/mo, **placebo pctile 0.62**, binom p 0.166, n_oos **129** (`backtest/results/infrastructure_ports.json`). Contemporaneous ref is barely better (hit 0.543, IC +0.023, placebo pctile 0.62). The basket has **no blindfolded forward skill**: IC is near zero and the placebo pctile (0.62) is far below the ~0.80 marginal bar. `latest_signal: 0.0`. |

**Current seed (`mapping.py` → `SEED["Ports"]`):**
```python
"Ports": {
    "ceic": [("Transport & Logistics", "Sea Cargo")],
    "globals": [("bcom", "demand", +1, "trade/commodity throughput")],
    "macro": [("id_exports", "demand", +1, "export throughput"),
              ("id_imports", "demand", +1, "import throughput")],
},
```
(plus `STD_MACRO`: `usdidr`/`id_bi_rate`/`id_cpi_yoy`/`id_gdp_real_q`.)

**The gap (four problems).**
1. **Throughput drivers came out WRONG-SIGN and below-gate.** The engine tested 17 candidates and
   kept none. In `rejected_top`, several throughput prints have **negative empirical correlation
   with theory_agree:false** — e.g. International:Makassar `CEICI14577201` pearson **−0.097**
   (theory said +1), Domestic:Tanjung Priok `CEICI14576001` **−0.075**, Cargo-unloaded-domestic
   `CEICI454752297` **−0.076**, and even **`id_exports` came out −0.069 (theory_agree:false, p=0.001)**.
   The "more throughput ⇒ higher returns" prior is **not holding in-sample** — because throughput
   is coincident/lagged and the air-heavy basket does not co-move with sea tonnage. This is the
   core finding: the current tree is mis-signed for the actual basket.
2. **`id_exports` / `id_imports` are SHALLOW YoY% sparks, not the deep volume series.** They
   resolve via `GLOBAL_CORR` to `aIDEXGAR` / `aIDIMGAR` — **YoY-growth prints with `n_obs=None`**
   (spark-only, low-confidence). The store holds a far deeper, level monthly **Exports: FOB:
   Volume `CEIC13957201` (P1M, n=460)** and **Exports: FOB `CEIC13920901` (P1M, n=511)** — the
   genuine trade-throughput PARENT — none of it wired. (Import side is thinner — see §7.)
3. **Air-side leg is completely unmodelled.** 60% of mcap (GMFI MRO + CASS air-cargo/handling)
   responds to **air passenger/cargo traffic, fleet utilisation, USD spare-part cost, jet fuel
   and Garuda's credit** — and the store HAS Air-Passenger-Traffic (`CEICI14582301/…601`, P1M,
   n≈394) and Air-Cargo prints. The seed pulls only Sea-Cargo, so the biggest names are driven by
   `usdidr` and noise.
4. **Regulated-tariff price leg is absent and structurally un-forecastable.** Pelindo concession
   tariffs (the "price" in throughput × tariff) are administered, sticky, and move in multi-year
   steps — there is no tariff price series, and there is no high-frequency signal there to find.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (terminal / marine-services operator):**
```
Revenue(t)  ≈  THROUGHPUT(volume of cargo / containers / vehicles / vessels handled)
                 ×  TARIFF(per ton / TEU / unit / vessel-call)         ← REGULATED, sticky, multi-year steps
EBIT        ≈  Revenue − (mostly FIXED cost: concession fee, depreciation on quay/crane/yard,
                 labour, energy) − small variable handling cost         ← HIGH OPERATING LEVERAGE
Net/EPS     ≈  EBIT − interest(net debt) ± FX on USD capex/debt
```
For the **air-side leg** (GMFI/CASS) the identity rhymes but with different volume:
```
GMFI Rev ≈ #airframe/engine checks × MRO price (USD-linked) ; cost = labour + USD parts
CASS Rev ≈ air-cargo tonnage + ground-handling turns × fee
```

Five structural facts drive the modelling:

1. **HIGH OPERATING LEVERAGE on throughput.** Cost is dominated by fixed concession fees,
   depreciation of quays/cranes/yards and labour. Incremental throughput drops almost straight to
   EBIT, and a throughput dip crushes margin. So **volume is the swing factor** — *if* we could
   observe it in a leading way. We can't: see fact 3.

2. **The price leg (tariff) is REGULATED and carries no high-frequency signal.** Port tariffs are
   set by Pelindo concession agreements / regulator and adjusted in multi-year steps; vehicle- and
   marine-service tariffs likewise. Unlike a commodity producer (price = liquid market series),
   the Ports basket's "price" is administered and sticky → the *price* half of revenue is
   forecastably flat and unobservable as a series. **All the cyclicality lives in the volume half.**

3. **Throughput is COINCIDENT / publication-lagged → attribution, not forecast.** Every demand
   series we have (Sea-Cargo tonnage by port, cargo-loaded/unloaded) is a **monthly QUANTITY print
   published ~45-60 days late** (IMPROVEMENT_PLAN §3: slow CEIC quantity prints are
   coincident/lagging). By the time "Tanjung Priok International tonnage, month t" prints, the
   equity has already moved. Throughput tells you *why* the quarter was good, not where the stock
   goes next. This — plus the wrong-sign fit (§1.1) — is why the demand tree is forward-flat.

4. **The basket is air-heavy and mislabelled (the dominant idiosyncrasy).** GMFI (6.5T,
   aircraft-MRO) and CASS (3.7T, air-cargo/ground-handling) are **60% of mcap** and move on
   aviation activity + Garuda's fortunes + USD parts cost, **not** sea tonnage. GMFI's β is
   *negative* (−0.149). So the "Ports" label is a misnomer for the used basket; a sea-throughput
   model is structurally mis-fit to the majority of the capital. Any honest engine spec must either
   (a) split the air leg out or (b) accept a low ceiling and add an aviation branch.

5. **Intra-basket dispersion is severe and the names are micro.** βs run from −0.149 (GMFI) to
   +0.642 (PORT, the dropped pure-port name) to null (KARW). PORT — the cleanest coal/bulk
   terminal — is excluded for want of history, removing the purest sea signal. KARW is near-zero
   mcap noise. The *used* five-name equal-weight basket therefore over-weights the air leg and the
   Pelindo subsidiaries (IPCC/IPCM), whose floats are small and whose returns are dominated by
   parent-Pelindo corporate actions and index-rebalance flow — more idiosyncratic noise.

**What a sell-side analyst actually watches:** **container/TEU + general-cargo + vehicle-unit
throughput** (Pelindo monthly ops data, per-name), **tariff-revision approvals** (regulatory, rare
and stepwise), **trade balance / export-import volume** (the demand backdrop), **utilisation of
quay/yard capacity**, **USD/IDR** (USD-linked tariffs & capex on IPCC/IPCM; USD parts for GMFI),
**Garuda's solvency** (GMFI's main customer), and **aircraft movements / air-cargo tonnage** for
the air leg. Of these, only USD/IDR and (loosely) trade-volume momentum are high-frequency leading
series; everything volume-side is slow and published late.

---

## 3. DEMAND driver tree

> Demand = **throughput** (cargo/container/vehicle tonnage + vessel calls for sea; aircraft
> movements + air-cargo for the air leg). In our data this is captured **almost entirely by
> coincident, publication-lagged monthly CEIC quantity prints**, several of which fit WRONG-SIGN
> (§1.1). The only thing with a plausible *lead* is the trade-cycle PARENT of throughput
> (export-volume momentum, GDP/IP) — and it is weak. Per IMPROVEMENT_PLAN §3, treat the quantity
> prints as **attribution, not forecast**.

```
DEMAND (revenue = throughput volume)
├── D1 Sea-cargo throughput — the direct (coincident) volume read ─► per-port tonnage handled
│     ├─ International: Tanjung Priok ····  CEICI14575001 [dem, Ton, P1M, n=427]  sign +1, lag ~0 (pub-lag ~45-60d) ★main gateway; best in-fit (pearson +0.096, p=0.036 but still below_gate)
│     ├─ Domestic: Tanjung Priok ········  CEICI14576001 [dem, Ton, P1M, n=428]  sign +1 — ⚠ fit came out −0.075 (theory_agree:false)
│     ├─ Domestic: Tanjung Perak ········  CEICI14578101 [dem, Ton, P1M, n=428]  sign +1, lag ~0 (Surabaya gateway)
│     ├─ International: Tanjung Perak ····  CEICI14577101 [dem, Ton, P1M, n=427]  sign +1
│     ├─ Domestic / Intl: Belawan ········  CEICI14577901 / CEICI14574901 [dem, Ton, P1M, n=428/427]  sign +1 (Medan gateway)
│     ├─ International: Makassar ·········  CEICI14577201 [dem, Ton, P1M, n=427]  sign +1 — ⚠ fit −0.097 (theory_agree:false, p=0.011)
│     └─ Cargo unloaded: domestic ········  CEICI454752297 [dem, Ton, P1M, n=244]  sign +1 (imports proxy) — ⚠ fit −0.076
├── D2 Trade-cycle PARENT of throughput (the only plausible LEAD) ─► export/import flow drives tonnage
│     ├─ Exports: FOB: Volume ···········  CEIC13957201 [demand, kg mn, P1M, n=460]  sign +1, lag ~1-2 ★DEEP level series — replaces the spark id_exports; trade-volume momentum is the demand backdrop
│     ├─ Exports: FOB (value) ···········  CEIC13920901 [demand, USD mn, P1M, n=511]  sign +1, lag ~1 (longest trade print; value = price×volume)
│     ├─ id_exports (SPARK) ·············  aIDEXGAR [Pct YoY, n=None] sign +1 — ⚠ CURRENT seed; came out −0.069 (theory_agree:false). Shallow → REPLACE with CEIC13957201
│     └─ id_imports (SPARK) ·············  aIDIMGAR [Pct YoY, n=None] sign +1 — import throughput; shallow spark (import-side deep series absent, §7)
├── D3 Vehicle throughput (the IPCC car-terminal leg) ─► auto sales feed the car terminal
│     ├─ aIDCARYAR (car sales YoY) ·······  Automobiles&Transport [Pct YoY, n=None]  sign +1, lag ~0-1 ★IPCC = Pelindo VEHICLE terminal; domestic car sales ≈ vehicle throughput (cross-ref Auto #50)
│     ├─ Motor Vehicle Sales: Retail ·····  CEIC412546117 [P1M, n=184]  sign +1 (deeper retail-vehicle-sales print; corroborates IPCC volume)
│     └─ Vehicle registrations ··········  CEICI487680667 [dem, Unit, P1M, n=48]  sign +1 (short, monthly; cross-link Transport&Logistics)
├── D4 Air-side throughput (the GMFI/CASS leg — 60% of mcap, currently UNMODELLED) ─► aviation activity
│     ├─ Air Passenger Traffic: Soetta ···  CEICI14582301 [dem, Person, P1M, n=394]  sign +1, lag ~0-1 ★Jakarta airport pax = ground-handling/air-cargo turns (CASS) + fleet utilisation (GMFI demand)
│     ├─ Air Passenger Traffic: Ngurah Rai  CEICI14582601 [dem, Person, P1M, n=393]  sign +1 (Bali; tourism-driven air volume)
│     └─ Air Cargo: intl/dom (un)loaded ··  CEICI250516803 / CEICI250415803 [dem, kg, P1Y, n=19]  sign +1 (annual only — attribution; CASS air-cargo)
└── D5 Activity / income backdrop ─► aggregate demand for traded goods
      ├─ id_gdp_real_q ·················   aIDGDPAR1 [P3M, n=None] sign +1 (current seed; came out +1 weak — whole-economy backdrop)
      ├─ GDP: Transport & Storage ······   CEICI365752077 [sup→activity, IDR bn, P3M, n=73] sign +1, lag ~0 (the sector's own GDP line — tighter activity proxy than total GDP) ⚠ endogenous-ish, attribution only
      └─ id_pmi ······················    aIDPMIMAQ [Index, n=None] sign +1 (manufacturing pulse → export-cargo pipeline)
```

**Forecast hypothesis (demand): forward-FLAT, and partly MIS-SIGNED today.** D1 (direct sea
throughput) is **monthly, ~45-60d publication-lagged, coincident** — and in the live fit several
prints came out *wrong-sign* (§1.1), confirming it is not a forward signal for THIS air-heavy
basket. D3 (vehicle sales → IPCC) and D4 (air traffic → GMFI/CASS) are the *theoretically correct*
volume drivers for the names that actually dominate mcap, but they too are coincident quantity
prints. **The single most defensible LEAD candidate is D2 trade-volume momentum** (`CEIC13957201`
export volume, deep) — trade turns ahead of the tonnage that ports handle — but the brief's caveat
holds: it is weak, and the placebo pctile (0.62) says the current demand tree is barely above
noise. **Net: the demand tree is an attribution tree; replace the shallow `id_exports` spark with
the deep export-volume series and accept that throughput is coincident.**

---

## 4. SUPPLY / COST driver tree

> "Supply" for a port is **handling capacity** (quay length, crane count, yard, vessel fleet) —
> slow-moving, capex-gated, not a monthly driver and largely endogenous to the operators
> themselves. The genuine cost stack is **energy (electric cranes / tug diesel), USD-linked capex &
> spare parts, and the concession fee**. Cost is *second-order* to throughput for a
> high-operating-leverage operator, but the air leg's USD-parts cost is real.

```
SUPPLY / COST (capacity + input-cost stack → margin)
├── C1 Energy / fuel cost ─► crane power + tugboat/vessel diesel
│     ├─ brent ·······················  ICEEUR:BRN1! [cost, wk=800]  sign −1, lag ~0-1 (tug/vessel bunker for IPCM marine services + jet-fuel beta for GMFI/CASS air leg) — leading price
│     └─ (electricity tariff: regulated, no clean leading series — see Utilities #52; document only)
├── C2 USD capex / spare-parts / FX-linked cost ─► cranes, vehicles, aircraft parts are imported
│     ├─ usdidr ······················  FX_IDC:USDIDR [macro, wk=801]  sign ~0 (ambiguous: USD-linked TARIFFS on IPCC/IPCM lift USD-earner revenue +, but USD spare-PARTS for GMFI MRO and imported crane capex cost −) → see §5 M2
│     └─ (no clean port-equipment / aircraft-parts price series — structural gap, §7)
├── C3 Handling capacity (the real "supply") ─► quay/crane/yard/fleet — slow, endogenous
│     └─ (NO exogenous capacity series; capacity is the operators' own balance sheet → ENDOGENOUS, exclude. Document only.)
└── C4 Concession fee / regulated cost ─► administered, stepwise
      └─ (regulated, no series — like the tariff, it is administered and sticky; no high-frequency signal)
```

**Forecast hypothesis (supply/cost): only `brent` is a forecastable cost branch** — daily,
exogenous, leading the marine-fuel and jet-fuel cost line (sign −1). But it is small relative to
the throughput swing and the fixed-cost base. Capacity is endogenous (operators' own quays/fleet)
and must be **excluded**, not modelled. The concession-fee/tariff cost is administered and carries
no signal. **Net cost forecast candidate: `brent` −1 (fuel), secondary.** Cost is decisively
second-order to volume for this high-operating-leverage basket.

---

## 5. MACRO / RATE / FX / FLOW

> For a regulated-tariff, fixed-cost, throughput-driven basket the macro that matters is (M1) the
> trade cycle (already the demand backdrop), (M2) **USD/IDR with an ambiguous sign** because the
> basket has both USD-linked tariff revenue and USD-denominated costs, and (M3) rates/flow — but
> these are small, low-leverage operators (except the Pelindo capex book), so the rate sensitivity
> is mild and mostly an EM-risk-appetite beta.

```
MACRO / RATE / FX / FLOW
├── M1 TRADE CYCLE / global demand — the systematic demand backdrop ─► drives throughput
│     ├─ Exports: FOB: Volume ·········  CEIC13957201 [P1M, n=460]  sign +1, lag ~1-2 ★(see D2; the leading parent of port tonnage)
│     ├─ bcom ························  AMEX:DBC [demand, wk=800]  sign +1, lag ~0-1 (current seed; commodity-trade beta — bulk/coal cargo via PORT; broad trade pulse) — fit +0.078 but below_gate
│     └─ cn_ip_yoy / cn_pmi_mfg ·······  aCNIP / aCNPMIMT [P1M]  sign +1 (China industrial pulse → regional trade volume → transshipment/export cargo)
├── M2 FX — AMBIGUOUS sign (the key nuance) ─► USD tariffs vs USD costs
│     ├─ usdidr ······················  FX_IDC:USDIDR [wk=801]  sign 0→test (IPCC/IPCM USD-linked port tariffs = USD earner (+); GMFI USD spare-parts + imported crane/vehicle capex = importer (−); net ambiguous → let stats decide, current STD_MACRO sign 0). Fit −0.072, below_gate.
│     └─ dxy ·························  TVC:DXY (NOT TVC:BBDXY) [wk=800]  sign −1 (broad USD → EM outflow → small-cap IDX infra de-rates; risk-appetite proxy)
├── M3 RATES / DISCOUNT ─► capex financing (Pelindo book) + small-cap duration
│     ├─ id_bi_rate ·················  ECONOMICS:IDINTR [P1M]  sign 0→−1 weak (current STD_MACRO; mild — operators are not highly leveraged ex-capex)
│     ├─ id_10y ····················  TVC:ID10Y [P1D, wk=798]  sign −1 (discount rate on long-dated concession cashflows; IPCC/IPCM annuity-like)
│     └─ id_cpi_yoy ················  ECONOMICS:IDIRYY [P1M]  sign 0 (current STD_MACRO; regulated tariffs lag inflation → real-revenue squeeze when CPI runs hot, but sign weak)
└── M4 RISK APPETITE / flow ─► micro-cap IDX names are flow-sensitive
      ├─ jci ·························  benchmark only — NEVER a driver (excess-return base)
      └─ (small floats: IPCC/IPCM/KARW returns are dominated by Pelindo corporate actions + index-rebalance flow — idiosyncratic, unmodellable)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
China IP/PMI + global trade ─► ID export VOLUME (deep, monthly) ─► port tonnage print (lagged ~45-60d) ─► terminal revenue ─► equity
   (leading, monthly)              (the LEAD candidate, n=460)        (coincident attribution)            (already moved)

Auto sales (Gaikindo) ─► IPCC vehicle-terminal throughput ─► IPCC revenue   |   Air pax/cargo ─► CASS/GMFI activity ─► air-leg revenue
   (coincident proxy)        (coincident)                                          (coincident)
```
The engine should lean on the **leading trade-volume parent (export volume → tonnage)** to
anticipate the *coincident* port-tonnage print — the textbook IMPROVEMENT_PLAN §1 move. But honesty
demands noting the chain is **short and weak**: trade volume only loosely leads port tonnage, and
the air-heavy basket dilutes even that link.

**Forecast hypothesis (macro): the only plausible lead is M1 trade-volume momentum; FX is
ambiguous; rates are mild.** `CEIC13957201` (export volume) and `bcom` are the forward candidates;
`usdidr` must be left **sign-0 / data-decided** because the basket is simultaneously a USD-tariff
earner (sea leg) and a USD-cost payer (air-parts + capex). The current fit shows `usdidr` −0.072
and `bcom` +0.078, both below-gate — consistent with a weak macro link.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Auto #50 / Conglomerate (ASII)** | car sales `aIDCARYAR`; Motor-Vehicle-Sales-Retail `CEIC412546117` (n=184); Vehicle-registrations `CEICI487680667` | demand +1 | **IPCC is a VEHICLE terminal** — domestic car sales ≈ cars moving through the Tanjung Priok car terminal. This is the cleanest cross-industry hook for the IPCC leg. |
| **Airlines #33 / Leisure #27 (tourism)** | Air-Passenger-Traffic `CEICI14582301/…601` (P1M, n≈394); Air-Cargo `CEICI250516803`; jet-fuel via `brent` | demand +1 / cost −1 | **GMFI (aircraft MRO) and CASS (air-cargo/ground-handling) are an AVIATION play, not a sea play.** Air pax/cargo + Garuda's health drive 60% of the basket. Tourism (Ngurah Rai) feeds Bali air volume. |
| **Coal #3 / bulk shippers (PORT)** | `bcom` (AMEX:DBC); coal API2 `ICEEUR:ATR1!`; Cargo-loaded-international `CEICI14574801` | demand +1 | **PORT = Nusantara Pelabuhan Handal** is a coal/bulk terminal (Adaro-adjacent) — its (dropped) volume tracks coal export cargo. Bulk-commodity trade is a throughput driver for the sea leg. |
| **Shipping #32 / Logistics #40** | bunker via `brent`; trade volume `CEIC13957201`; GDP-Transport `CEICI365752077` | cost −1 / demand +1 | Ports and shippers share the cargo-volume demand primitive and the bunker-fuel cost; IPCM (marine services) is effectively a shipping-adjacent tug/pilotage operator. |
| **Banks #1 (Garuda credit, Pelindo capex)** | `id_10y`, `id_bank_credit` `aIDLONYAR` | macro | GMFI's customer Garuda is credit-distressed (airline solvency drives MRO order flow); Pelindo's capex book sets IPCC/IPCM duration. Indirect. |
| **China macro (regional trade)** | `cn_ip_yoy` `aCNIP`, `cn_pmi_mfg` `aCNPMIMT` | demand +1 | China industrial pulse → regional export/transshipment volume → Indonesian gateway throughput. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Sea-cargo throughput** | `("Transport & Logistics","Sea Cargo")` ✓ (all per-port tonnage pulled) | (already pulled — but RE-ROLE / down-weight: several fit wrong-sign, keep as attribution) | **P1 — fix signs, not coverage** |
| **Trade-cycle parent (LEAD)** | `id_exports`/`id_imports` → **shallow YoY sparks** (`aIDEXGAR`/`aIDIMGAR`, n=None) | **swap to deep `Exports: FOB: Volume` `CEIC13957201` (n=460) +1** and `Exports: FOB` `CEIC13920901` (n=511) +1 | **P0 — the only plausible lead; fix the shallow resolver** |
| **Vehicle throughput (IPCC)** | none | **car sales `aIDCARYAR` +1**; Motor-Vehicle-Sales-Retail `CEIC412546117` (n=184) +1; vehicle-registrations `CEICI487680667` +1 | **P0 — IPCC is a car terminal; currently unmodelled** |
| **Air-side leg (GMFI/CASS, 60% mcap)** | none | **Air-Passenger-Traffic `CEICI14582301` (n=394) +1**, `CEICI14582601` +1; Air-Cargo `CEICI250516803` +1; `brent` (jet-fuel) −1 | **P0 — the biggest names are aviation, not sea** |
| **Commodity/trade beta** | `bcom` (AMEX:DBC) +1 ✓ | (already optimal; corroborate with `cn_ip_yoy`/`cn_pmi_mfg` +1) | P1 |
| **Sector activity proxy** | `id_gdp_real_q` (whole-economy) | GDP: Transport & Storage `CEICI365752077` (n=73) +1 — tighter, but attribution-only/endogenous-ish | P2 |
| **Fuel cost** | none | `brent` −1 (tug bunker + jet fuel) | P1 |
| **FX (ambiguous)** | `usdidr` sign 0 ✓ (STD_MACRO) | keep sign 0 (USD tariff earner vs USD-parts/capex payer); add `dxy` −1 (flow) | P2 |
| **Rates** | `id_bi_rate` 0 ✓ | `id_10y` −1 (concession-cashflow discount) | P3 |
| **Import-side trade volume** | `id_imports` spark | **NO deep total-import-volume series in store** (Imports&Exports block tops out at n=172 trade-value HS lines; Cargo-unloaded-domestic `CEICI454752297` n=244 is the closest import-throughput proxy) | document only |
| **Tariff (price leg)** | none | **NONE** — regulated/administered, no series; structurally un-forecastable | document only |
| **Handling capacity (supply)** | none | **ENDOGENOUS** (operators' own quays/cranes/fleet) → exclude, do not model | exclude |

**Bugs / resolver issues to call out:**
- **`id_exports`/`id_imports` → `aIDEXGAR`/`aIDIMGAR` are YoY-growth sparks with `n_obs=None`** —
  low-confidence, and `id_exports` came out **wrong-sign** in the fit. The deep level series
  **`CEIC13957201` (Exports: FOB: Volume, n=460)** and `CEIC13920901` (n=511) exist and should be
  used for the trade-throughput branch. **This is the single most thesis-relevant resolver fix.**
- **`dxy` → `TVC:BBDXY` is EMPTY (weekly_obs=0)** in the store. Use **`TVC:DXY` (wk=800)** — either
  remap `dxy`→`TVC:DXY` in `GLOBAL_CORR` or cite `TVC:DXY` directly. (Same bug flagged in the
  Construction/Telco files.)
- **Wrong-sign throughput prints** (`CEICI14577201` Makassar −0.097, `CEICI14576001` Tanjung-Priok-
  domestic −0.075, `CEICI454752297` cargo-unloaded −0.076): these are coincident/lagged and
  do not co-move with the air-heavy basket. Down-weight to attribution; do **not** keep them as
  forecasters even if a sign-flip would make them "significant" in-sample (that would be a
  data-mined artefact).
- **GDP: Transport & Storage `CEICI365752077` is partially ENDOGENOUS** to the basket (the sector's
  own value-added) — use as attribution only, exclude from forward scoring if it leaks.
- **PORT dropped** (`n_used: 5` of 6): the purest sea-port name has too little weekly history, so
  the *used* basket is even more air-tilted than the membership suggests — a coverage caveat, not a
  fixable bug.

---

## 8. Forecastability verdict

**The basket is forward-FLAT today (OOS = NONE, fwd IC +0.037, hit 0.519 vs up-rate 0.473, placebo
pctile 0.62, n_oos 129), and the honest framing is: there is NO reliable lead here. Throughput is
coincident/lagged and partly mis-signed; tariffs are regulated and signal-free; and 60% of the
basket is an aircraft-MRO/air-cargo idiosyncrasy that a sea-throughput tree cannot explain.**

- **Why demand does NOT lead (the central concession).** Every throughput series is a **monthly
  quantity print published ~45-60 days late** — coincident at best, and in the live fit several
  came out *negative* against a +1 theory prior (Makassar −0.097, Tanjung-Priok-domestic −0.075,
  cargo-unloaded −0.076, and even `id_exports` −0.069). Throughput tells you why the past quarter
  printed, not where the equity goes. **There is no liquid leading price for port volume**, and the
  "price" half of revenue (tariff) is administered and sticky. *This is exactly the
  coincident/lagged-published + sticky-regulated-tariff problem the brief anticipates.*

- **Why the residual is idiosyncratic (the second concession).** The biggest mover, **GMFI (6.5T,
  β−0.149), is an aircraft-MRO company** whose returns track Garuda's solvency, fleet utilisation
  and USD-parts cost — not sea cargo. CASS (3.7T) is air-cargo/ground-handling. The Pelindo
  subsidiaries (IPCC/IPCM) have small floats and move on parent corporate actions and index flow.
  No sea-throughput or macro series predicts these. They cap the achievable systematic IC and are
  the most likely reason the forward IC sits at ~0 with a 0.62 placebo pctile.

- **Where the (modest) lead could come from — TRADE-VOLUME MOMENTUM, not throughput.** The one
  defensible forward candidate is the **trade-cycle PARENT** of port volume: the deep monthly
  **Exports: FOB: Volume `CEIC13957201` (n=460)** plus `bcom`/`cn_ip` — trade turns *before* the
  tonnage that ports handle. Wiring the deep export-volume series in place of the shallow YoY spark
  is the highest-value change. But the lead is short and weak; do not over-claim it.

- **Contemporaneous vs forward.** Per-port tonnage, vehicle sales, air-pax and GDP-Transport are
  **contemporaneous attribution** — they explain the trade-cycle beta the basket carries. Only the
  trade-volume momentum and (loosely) `bcom` are plausibly *forward*, and the backtest's
  contemporaneous ref (IC +0.023) is barely better than the forward (IC +0.037), confirming there
  is little timing signal either way.

**What would move it from NONE → marginal:**
1. **Fix the trade resolver** (P0): replace `id_exports`/`id_imports` sparks with deep
   `CEIC13957201` (export volume) +1 — the only plausible lead, currently shallow/mis-signed.
2. **Model the legs the basket actually has** (P0): add the **vehicle-sales branch for IPCC** and
   the **air-traffic branch for GMFI/CASS** — the current sea-only tree ignores ~60% of mcap.
3. **Down-weight throughput to attribution** (P1): keep per-port tonnage for *why* but not for
   *forecast*; do not chase in-sample sign-flips.
4. **Leave `usdidr` data-decided** (sign 0): the basket is both a USD-tariff earner and a USD-cost
   payer — forcing a sign would be wrong.

**Honest ceiling.** Given (a) coincident/lagged throughput with no leading price, (b) regulated
signal-free tariffs, and (c) a 60%-air-side mislabelled basket dominated by aircraft-MRO
idiosyncrasy, the realistic ceiling is **low (IC ~0.04-0.07)**, achievable only by a thin,
trade-momentum-led posture plus the correct vehicle/air legs. **If, after wiring the deep
export-volume series and the air/vehicle legs, forward IC stays < 0.05, the honest verdict is to
read Ports' engine output as a CONTEMPORANEOUS trade-cycle beta + an idiosyncratic aircraft-MRO
overlay — an ATTRIBUTION, not a forecaster** — consistent with how BACKTEST.md treats
lumpy/idiosyncratic micro-cap baskets. This basket may also deserve a flag that its membership is
mislabelled (air vs sea) for any future re-bucketing.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Ports"]`:**
```python
"Ports": {  # MISLABELLED basket: ~60% air-side (GMFI aircraft-MRO 6.5T + CASS air-cargo 3.7T),
            # ~40% sea-terminal (IPCC vehicle terminal, IPCM marine svcs, PORT bulk [dropped], KARW).
            # Economics = THROUGHPUT x regulated-tariff - fixed cost (high operating leverage).
            # Throughput is coincident/lagged-published; tariffs are regulated/sticky -> attribution,
            # not forecast. Only plausible LEAD = trade-volume momentum.
    "ceic": [("Transport & Logistics", "Sea Cargo")],   # per-port tonnage (attribution)
    # Re-role: keep sea-cargo tonnage as DEMAND but accept it is coincident; add the
    # vehicle-terminal (IPCC) and air-side (GMFI/CASS) demand the sea-only block misses.
    "ceic_override": [
        ("air passenger traffic",        "demand", +1),   # CEICI14582301/…601 — GMFI/CASS air leg (60% of mcap)
        ("cargo unloaded: domestic",     "demand", +1),   # CEICI454752297 — import-throughput proxy (but fit -0.076: attribution)
    ],
    # Exclude endogenous / un-forecastable: the sector's own GDP value-added, and the
    # annual-only / micro prints that only add noise.
    "ceic_exclude": [
        ("gdp: transport"),          # CEICI365752077 — basket's own sector VA (endogenous leak)
        ("gdp nominal: transport"),
        ("road accident"), ("road accidents"),   # Road-Safety noise mis-filed in T&L
        ("sea passenger"),           # passenger ferries — not the cargo/terminal basket
    ],
    "globals": [
        ("bcom",  "demand", +1, "commodity-trade beta (bulk/coal cargo via PORT; broad trade pulse)"),
        ("brent", "cost",   -1, "tug bunker (IPCM) + jet-fuel beta (GMFI/CASS air leg)"),
    ],
    "macro": [
        # ── trade-cycle PARENT of throughput: the only plausible LEAD ──
        ("id_exports",  "demand", +1, "export VOLUME momentum — REMAP to deep CEIC13957201 (see resolver note)"),
        ("id_imports",  "demand", +1, "import throughput (shallow spark; no deep import-volume series)"),
        ("cn_ip_yoy",   "demand", +1, "China industrial pulse -> regional export/transshipment cargo"),
        ("cn_pmi_mfg",  "demand", +1, "China mfg pulse -> trade volume"),
        # ── vehicle throughput: the IPCC car-terminal leg ──
        ("id_auto_sales","demand",+1, "domestic car sales = IPCC vehicle-terminal throughput — NEW resolver to aIDCARYAR"),
        # ── FX: AMBIGUOUS — USD-tariff earner (sea) vs USD-parts/capex payer (air). Data-decided. ──
        ("usdidr",      "macro",  0, "USD-linked tariffs (+) vs USD spare-parts/crane capex (-): net ambiguous"),
        ("dxy",         "macro", -1, "broad USD -> EM small-cap outflow (REMAP to TVC:DXY; BBDXY empty)"),
        # ── rates / activity (mild) ──
        ("id_10y",      "macro", -1, "discount rate on long-dated concession cashflows (IPCC/IPCM)"),
        ("id_bi_rate",  "macro",  0, "policy rate (mild; operators not highly geared ex-capex)"),
        ("id_gdp_real_q","demand",+1, "whole-economy demand backdrop (coarse, attribution)"),
    ],
},
```

**Resolver notes / required `GLOBAL_CORR` fixes:**
1. **`id_exports` → `aIDEXGAR` is a YoY% spark (n_obs=None) and fit WRONG-SIGN.** Remap the trade
   branch to the deep level series **`"id_exports": "CEIC13957201"`** (Exports: FOB: Volume, P1M,
   n=460) — or add a new tag `"id_export_volume": "CEIC13957201"` and use it. This is the **single
   most thesis-relevant resolver fix**: it is the only plausible forward (trade-momentum) signal,
   and the current spark both under-samples and mis-signs it.
2. **No deep import-volume series exists** (Imports&Exports block tops out at n=172 HS-code
   trade-value lines). Keep `id_imports` as the shallow spark, or use **Cargo-unloaded-domestic
   `CEICI454752297` (n=244)** as the import-throughput proxy. Do **not** fabricate an import-volume
   level. Document the gap.
3. **Add an auto-sales resolver for the IPCC leg:** `"id_auto_sales": "aIDCARYAR"` (Domestic
   Vehicle Sales — Cars, YoY) — shallow, or use deeper **Motor-Vehicle-Sales-Retail
   `CEIC412546117` (n=184)**. IPCC is a *vehicle* terminal; car sales are its throughput primitive
   (cross-ref Auto #50 / Conglomerate ASII).
4. **`dxy` → `TVC:BBDXY` is EMPTY (wk=0).** Remap `"dxy": "TVC:DXY"` (wk=800, populated) in
   `GLOBAL_CORR`, or the hint silently resolves to an empty series.
5. `bcom`/`brent`/`usdidr`/`id_10y`/`id_bi_rate`/`cn_ip_yoy`/`cn_pmi_mfg`/`id_gdp_real_q` all
   resolve correctly — no change.
6. **Structural gaps (document, do not fake):** no tariff price series (regulated/administered);
   no exogenous handling-capacity series (endogenous to operators); no deep total-import-volume.
   Do not proxy these with fabricated numbers.

**Falsifiable backtest plan (`backtest/bt.py "Ports"`; keep a change only if forward IC improves or
holds with a richer, more honest tree):**
1. **Trade-volume resolver swap (the headline test):** current `id_exports`→`aIDEXGAR` (spark, YoY)
   vs proposed `id_exports`→`CEIC13957201` (deep export VOLUME level, n=460). **Confirmation:
   forward IC rises AND the empirical sign comes out + (not the current −0.069).** If the deep
   series still fits negative, the trade-throughput-lead thesis is falsified for this air-heavy
   basket → demote to pure attribution.
2. **Add the air-side leg:** Air-Passenger-Traffic `CEICI14582301` (+1). Hypothesis: it explains
   the GMFI/CASS 60%-mcap leg better than sea cargo does. **Confirmation: it scores above the sea-
   tonnage prints and lifts the basket fit** (because it matches the names that actually dominate).
3. **Add the IPCC vehicle leg:** `aIDCARYAR` / `CEIC412546117` (+1). Confirmation: sign + and it
   beats the generic sea-tonnage prints for the IPCC weight.
4. **Throughput sign sanity:** verify the per-port tonnage prints' empirical signs. If they remain
   negative/insignificant (as now), **keep them flagged as attribution and do NOT let a sign-flip
   promote them to forecasters** — that would be in-sample data-mining on coincident prints.
5. **FX sign:** leave `usdidr` at sign 0 and let the engine estimate. Do not force ± — the basket
   is genuinely both a USD earner (sea tariffs) and USD payer (air parts/capex).
6. **Honesty gate:** if forward IC stays < 0.05 after the rewire, **label Ports a contemporaneous
   trade-cycle beta + aircraft-MRO idiosyncratic overlay (ATTRIBUTION), not a forecaster**, and
   flag the basket's air/sea mislabelling for future re-bucketing — consistent with §8 and how
   BACKTEST.md treats idiosyncratic micro-cap baskets.
