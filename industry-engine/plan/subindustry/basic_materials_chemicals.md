# Chemicals (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-A by
> mcap (340 T, 8th-largest), currently **needs_review / no forward skill**. All series
> cited exist in `catalog/{idind,id,cn,market}.json`; RICs + n_obs are real and quoted.
> **Central caveat up front: the one variable that actually moves this basket — the
> ethylene–naphtha SPREAD — does not exist in the data store in any form. This file is
> as much about *how to proxy the missing spread* as about wiring what we have.**

---

## 1. Snapshot — and the "engine mis-keys on oil" gap

| field | value |
|---|---|
| basket | **Chemicals**, sector Basic Materials, id `basic_materials_chemicals` |
| mcap | **340 T** (8th-largest sub-industry; ~95% concentrated in two names) |
| members (11) | **TPIA** (Chandra Asri Petrochem — naphtha cracker, olefins/polyolefins; **~51% of basket cap**), **BRPT** (Barito Pacific — holdco that *owns* TPIA + Star Energy geothermal; **~44%**), **AGII** (Aneka Gas / Samator — industrial gases O₂/N₂/CO₂), **UNIC** (Unggul Indah — alkylbenzene/surfactant feedstock), **MOLI** (Madusari oleochemicals), **EKAD** (Ekadharma — adhesives/tape), **SRSN** (Indo Acidatama — ethanol/acetic acid/formaldehyde), **ETWA** (oleochemicals, distressed), **SMLE**, **INCI** (Intanwijaya — formaldehyde/resin), **DPNS** (specialty adhesives) |
| current grade | **needs_review** |
| current kept drivers | **4** |
| **current forward OOS skill** | **fwd IC +0.03 · contemporaneous IC −0.04 · placebo pctile 0.65 · flag `weak`** (n_oos 129) |

**The gap, precisely.** This basket is ~95% **TPIA + BRPT**, and BRPT's value *is*
mostly its TPIA stake (plus a geothermal sleeve). So this is, in economic substance, a
**single-asset basket: an integrated naphtha-cracker petrochemical complex.** Its
earnings are driven by **product-minus-feedstock margin** — the polyethylene/polypropylene
selling price *minus* the naphtha (or ethane/LPG) feedstock cost — i.e. the
**ethylene–naphtha spread**, not the oil *level*. The current seed (see §7) keys the
basket on **`brent` as a cost (−1)**, **`natgas` as a cost (−1)**, two **dead urea/potash
resolvers**, and — via a blanket `("Basic Materials", None)` category pull — silently
ingests **`Total Reserves Minus Gold` (CEICI224743301, n696)**, an FX-reserves series
that has *nothing to do with chemicals* but is long, smooth, and trends with the cycle,
so it gets in-sample-fit as a spurious "strong driver."

**Why the oil-level prior is actively wrong.** Brent is *both* the feedstock cost *and*
(via the global energy-chain) the rough anchor of the product price. When oil rises,
naphtha rises (margin headwind) **but** polyethylene also tends to rise with a lag
(margin tailwind). The **net** effect on a cracker's margin is the *spread*, which is
only weakly — and often perversely — correlated with the oil **level**. Signing `brent`
as a clean **−1 cost** therefore captures the wrong half of the identity: it is right in
a demand-shock selloff (oil down, spread up, equity up → −1 holds) and wrong in a
feedstock-squeeze (oil down because demand is collapsing, spread *also* down, equity
down → −1 fails). The **contemporaneous IC of −0.04** is the fingerprint of this: the
engine's posture is mildly *anti*-correlated with the basket even in-sample. Fixing this
basket is less about adding drivers than about (a) **deleting the spurious Total-Reserves
leak**, (b) **demoting the oil-level prior** from a confident cost to an ambiguous/sign-0
feedstock, and (c) **proxying the spread** with the only instruments that carry it —
foreign integrated-cracker equities and the China chemical PPI.

---

## 2. Economic structure — how this basket makes money

The dominant economics are **TPIA's**, and they are a textbook **integrated petrochemical
margin**:

```
Cracker margin  ≈  P(olefins/polyolefins)  −  Cost(naphtha feedstock)  −  energy/conversion
Revenue         ≈  Σ_product ( price[product] × volume[product] )         (mostly USD-linked)
EBITDA          ≈  (P_product − P_naphtha)×volume  −  fixed conversion − SG&A
                   └────────── THE SPREAD ──────────┘   ← the entire swing factor
```

TPIA runs a **naphtha cracker** (Cilegon) producing **ethylene → polyethylene (PE)**,
**propylene → polypropylene (PP)**, plus **styrene monomer, butadiene, and benzene/toluene
aromatics**. The cost stack is **~70–80% feedstock (naphtha)**, the rest energy
(gas/electricity) and conversion. So:

- **The margin swing factor is the spread**, *not* either leg alone. A useful mental
  model: ethylene price ≈ f(naphtha) + cracker-margin; the equity tracks the second term.
- **Feedstock optionality.** Newer crackers can swing between **naphtha, LPG (propane),
  and ethane**; ethane-from-gas is structurally cheaper (US/ME advantage). TPIA is
  naphtha-led, so **naphtha vs gas spreads** and the **US/ME ethane glut** (which floods
  cheap PE into Asia) are competitive-cost factors. `NYMEX:NG1!` (Henry Hub) is therefore
  a genuine — if second-order — driver: cheap US gas → cheap US ethane → cheap export PE →
  Asian PE price pressure → **TPIA margin headwind** (so the sign on gas is *not* a simple
  −1 cost; it is closer to a **demand/competition −1** working *through the product price*).
- **Demand side = plastics & FMCG.** PE/PP go into packaging, film, pipe, FMCG containers,
  automotive — so end-demand is **consumer/industrial volume** (domestic plastics
  converters + regional export). China is the marginal buyer and price-setter for Asian
  polyolefins.
- **The China cycle sets the regional price.** Asian PE/PP/ethylene prices are effectively
  **CFR China**; the **China chemical PPI** and China's own cracker over/under-supply set
  the regional spread. This is why `aCNPPICPM` (China raw-chemical-materials PPI) is a far
  better-keyed driver than headline `aCNPPIAR`.

**Intra-basket dispersion.** The two giants (TPIA, BRPT) ARE the petchem-spread trade.
The tail is a different animal: **AGII** is an industrial-gas utility (stable, volume/
contract-driven, almost a bond-proxy — *not* spread-sensitive); **UNIC/MOLI/ETWA** are
**oleochemicals**, whose feedstock is **CPO/palm-kernel oil, not naphtha** (so palm oil
is a *real* cost driver for ~3 small names but irrelevant to the 95%); **SRSN** (ethanol/
acetic acid), **INCI/DPNS/EKAD** (formaldehyde/resin/adhesives) are tiny specialty names
driven by methanol and domestic construction/FMCG demand. Because cap-weighting makes the
basket ≈ TPIA+BRPT, **the seed must be built for the petrochem spread**; the oleochemical/
specialty drivers are real but immaterial at the basket level and should be *available*
(via the CEIC chemicals category) but **not hard-wired with a forced sign**.

**What a sell-side analyst actually watches** (TPIA/BRPT): **CFR SEA ethylene price,
naphtha (MOPJ) price, and the ethylene–naphtha spread ($/t)**; **PE/PP integrated margin**;
**polyolefin operating rates** in NE Asia; **China PP/PE inventory and PPI**; turnaround/
maintenance schedules (own supply); **USD/IDR** (USD-linked product price vs partly-IDR
cost and USD debt); plant utilisation. **None of the first three — the spread complex —
exists in our store.** That is the data gap §7b is honest about.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's return for a *rise* in
> the driver. `lead` = expected months the driver moves *before* the equities. Liquid
> exogenous price/rate series → forecast candidates; CEIC quantity prints are
> publication-lagged → attribution. ⚠ marks the spread data-gap proxies.

### D1 — Regional polyolefin price / petchem cycle (the product-price leg of the spread)
```
PRODUCT-PRICE / CYCLE demand
├─ D1a China chemical PPI ─────────► [aCNPPICPM CN Raw-chemical-materials PPI, P1M]  sign +1 · lead 0–1m · best-keyed cycle
│      (sets CFR-China olefin px)    [aCNPPIPP CN Plastic-products PPI, P1M]         sign +1 · lead 0–1m
├─ D1b global petchem MARGIN ⚠ ────► [LYB LyondellBasell equity, w800]   sign +1 · lead 0–1m · SPREAD PROXY (FORECAST)
│      (the missing spread, proxied) [051910.KS LG Chem, w800] · [011790.KS Lotte Chem, w800]  sign +1 · lead 0–1m
├─ D1c China demand pulse ─────────► [aCNPMIMT CN Mfg PMI, P1M]   sign +1 · lead 1–2m · attribution
│                                    [aCNIP CN IP YoY, P1M]       sign +1 · lead 1–2m
└─ D1d domestic plastics throughput ► [CEICI323568002 Mfg: Rubber & Plastics Products, 2010=100, n180]  sign +1 · lead 0m (lagged print)
                                       [CEICI323567802 Mfg: Chemicals & Chem Products, 2010=100, n180]   sign +1 · attribution
```
- **D1b is the single most important branch and the spread-gap workaround.** We have no
  naphtha and no ethylene price. But we **do** hold, with 800 weeks of liquid weekly
  history, the equities of **pure-play integrated crackers**: **`LYB` (LyondellBasell)**,
  **`051910.KS` (LG Chem)**, **`011790.KS` (Lotte Chemical)** — Korean
  naphtha-cracker integrateds whose entire P&L *is* the ethylene–naphtha spread, exactly
  like TPIA. **A basket of these equities is a traded proxy for the polyolefin margin
  TPIA earns.** It is liquid, daily, and *leads* IDX petchem (global price discovery
  happens in Seoul/Houston before Jakarta reprices). Caveat: it is an *equity* proxy, so
  it carries a global-equity-beta component (partly circular vs an IDX equity basket) —
  mitigate by using **2–3 names blended** and reading the relative (chemicals-vs-market)
  where possible; treat as the **forward spread signal**, not gospel. This is the chemicals
  analogue of the nickel-export-value workaround used in the Mining basket.
- **D1a mechanism.** Asian olefin/polyolefin prices are set **CFR China**; the **China
  raw-chemical-materials PPI (`aCNPPICPM`)** is the cleanest in-store read of that regional
  price level — *far* better-keyed than the headline China PPI (`aCNPPIAR`) the library
  defaults to. Pair with **plastic-products PPI (`aCNPPIPP`)** for the downstream margin.
- **D1c.** China PMI/IP = the demand pulse that drives polyolefin offtake; attribution,
  publication-lagged.
- **D1d.** Indonesia's own **Rubber & Plastics manufacturing production index**
  (`CEICI323568002`, monthly, n180) is the domestic-converter throughput — i.e. demand
  for TPIA's PE/PP. Monthly index, publication-lagged → attribution, but a genuinely
  on-topic volume series the current seed ignores entirely.

### D2 — Fertiliser / nitrogen sub-cycle (the AGII-adjacent + national fertiliser names)
```
FERTILISER demand  (smaller sleeve; honour the CEIC Fertilizers block)
├─ D2a domestic fertiliser value ──► [CEICI323782102 Value: Fertilizers (import/dem), USD mn, n172]  sign +1 · lead 0m · attribution
│      price×volume of N fertiliser  [CEICI324037802 Value: Fertilizers (export/sup), USD mn, n172]  sign +1
├─ D2b China fertiliser trade ─────► [CEICI357178802 China: Fertilizers, USD th, n128]  sign +1 · lead 0–1m · regional urea px proxy
└─ D2c fertiliser output ──────────► [CEICI534840087 Manufacture Products: Fertilizers, USD mn, n111]  sign +1 · attribution
```
- **Honest scope note.** None of the 11 members is a *listed urea producer* (Pupuk
  Indonesia is state-owned, unlisted). So the **Fertilizers CEIC block — which dominates
  the candidate list (30 of 189) — is only loosely on-theme**: it proxies the *nitrogen/
  ammonia cost-cycle* and *gas-feedstock economics* that the chemical complex shares, and
  catches SRSN's nitrogen chemistry. Keep it as the primary CEIC block per the brief (it
  is the closest matched industry block), but **weight expectations down**: this is the
  ammonia/urea cycle, a cousin of the petchem spread, not the spread itself. **Value×volume
  fertiliser series carry an embedded urea-price signal** — the in-store stand-in for the
  dead `wb_urea` resolver (§7b).

### D3 — Industrial-gas & specialty demand (AGII / UNIC / specialty tail — utility-like)
```
SPECIALTY / GAS demand  (do NOT force a strong sign — utility/volume, not spread)
├─ D3a domestic industrial activity ► [aIDPMIMAQ ID Mfg PMI] · [aIDIPMANIDX IP]  sign +1 · lead 1–2m · AGII gas offtake
├─ D3b oleochemical feedstock (UNIC/MOLI/ETWA) ► [wb_palm_oil MYX:FCPO1!, w?]  sign −1 COST for 3 small names (immaterial at basket level)
└─ D3c construction/FMCG (resins, EKAD/INCI/DPNS) ► [aIDGDPAR1 GDP] · domestic demand  sign +1 · attribution
```
- AGII is effectively an **industrial-gas utility** — revenue is contracted volume × tariff,
  insensitive to the petchem spread; its driver is **domestic industrial production/PMI**.
- D3b: palm oil is a *real* cost for the oleochemical micro-caps but they are <2% of basket
  cap; leave `wb_palm_oil` available but **demote to sign 0 / drop** — at the basket level
  it is noise, and the current seed's `("wb_palm_oil","demand",+1)` is doubly wrong (it is
  a *cost*, not demand, and it is immaterial).

---

## 4. SUPPLY / COST driver tree (the feedstock leg of the spread + competition)

```
COST / SUPPLY  (the feedstock half of the margin identity — handle the SIGN carefully)
├─ S1 naphtha feedstock ⚠ ─────────► NO NAPHTHA SERIES IN STORE.
│      proxy via crude (imperfect)   [ICEEUR:BRN1! Brent, w800]   sign 0/-1 · lead 0–1m · AMBIGUOUS (see note)
│                                    [NYMEX:RB1! Gasoline, w800]   sign 0/-1 · closer-to-naphtha light-distillate proxy
├─ S2 gas / ethane competition ────► [NYMEX:NG1! Henry Hub, w800]  sign −1 · lead 0–1m · US ethane glut → cheap export PE → Asian px pressure
│      (cost AND competition channel) [FX:NATGAS Natgas Spot, w800] (corroborant)
├─ S3 energy / conversion cost ────► [ICEEUR:ATR1! API2 coal, w800]  sign −1 · lead 0–1m · power/steam for the complex
├─ S4 own supply / utilisation ────► [CEICI323567802 Mfg: Chemicals output index, n180]  sign +1 · own-volume (attribution)
│      turnarounds, ramp of new units (CAP2 expansion = TPIA's own capacity — structural, not in store)
└─ S5 regional cracker oversupply ⚠ ► [LYB / 051910.KS spread proxy, inverse read]  · China self-sufficiency = structural margin compressor
```
- **S1 is the crux, and it must be signed honestly.** Naphtha is ~75% of cash cost, and we
  have **no naphtha price** (and no MOPJ/MOPS). Brent is the only crude anchor. But — as §1
  argued — Brent feeds *both* the cost (naphtha) *and*, with a lag, the product (PE) price,
  so its **net effect on the spread is ambiguous**. The correct treatment is **not** the
  current confident `("brent","cost",-1)`; it is **`("brent","cost",0)`** — let the
  statistical engine estimate the empirical sign rather than forcing a half-truth. The
  honest a-priori is: oil *spikes* (supply-driven) squeeze the spread short-term (−1), while
  oil *declines* on weak demand also squeeze it (so −1 fails). `NYMEX:RB1!` (gasoline, a
  light distillate) co-moves with naphtha more tightly than crude and is a marginally better
  feedstock proxy — worth testing as the naphtha stand-in.
- **S2 — gas is competition, not just cost.** Henry Hub `NYMEX:NG1!` matters less as TPIA's
  *own* feedstock (it is naphtha-led) and more as the **US/ME ethane-advantage channel**:
  cheap US gas → cheap ethane → cheap US PE exports → Asian polyolefin price pressure →
  **TPIA margin headwind**. So **gas-up → spread-down → equity-down → sign −1**, but the
  mechanism is *demand/competition through the product price*, not a direct input cost.
  Keep `natgas` at −1 but re-label its role; do not double-count it as both "ammonia
  feedstock cost" (the old fertiliser rationale) and competition.
- **S4.** TPIA's own **utilisation and the CAP2 expansion** are first-order for its own
  output but have **no clean series**; the chemicals manufacturing index (`CEICI323567802`)
  is the closest national proxy. Turnaround schedules are name-level/manual.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR ──────────────────────► [FX_IDC:USDIDR, w801]  sign 0/+1 · lead 0m · macro (USD-linked product px vs partly-IDR cost; USD debt at TPIA/BRPT)
├─ M2 broad USD (DXY) ──────────────► [TVC:DXY, w800]  sign −1 · lead 0–1m · macro  ⚠ use DXY — BBDXY is EMPTY (w0)
├─ M3 China demand / credit ────────► [aCNPPICPM] (see D1a) · [aCNM2GRTY CN M2 YoY]  sign +1 · regional-price driver
├─ M4 domestic rates ───────────────► [TVC:ID10Y] · [ECONOMICS:IDINTR BI rate]  sign −1 · BRPT/TPIA leverage + AGII bond-proxy duration
└─ M5 global risk / equity beta ────► [SP:SPX] / [NASDAQ:NDX] (secondary)  · LYB-proxy beta read-through; keep low weight
```
- **M1 USD/IDR is genuinely ambiguous here, so sign 0.** TPIA's products are USD/CFR-linked
  (weak IDR → higher IDR revenue, +1) but it carries **USD-denominated debt and USD feedstock
  imports** (weak IDR → higher IDR cost / FX loss, −1). Net is name-and-period dependent →
  let the engine estimate it; do **not** carry the old confident `("usdidr","macro",-1)`
  ("imported feedstock cost"), which captures only one side.
- **M2 DXY = −1** is the clean EM-flow / commodity-priced-in-USD headwind. **Data caveat:
  `TVC:BBDXY` is EMPTY (weekly_obs 0) in the store — map `dxy` to `TVC:DXY` (w800)** (this
  is a store-wide caveat; relevant here because the basket has a real USD-flow channel).
- **M4 rates** matter through **BRPT/TPIA leverage** (both are levered — BRPT especially,
  as a holdco) and **AGII's utility-like duration**: higher ID10Y / BI rate compresses these
  → −1.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `LYB` LyondellBasell · `051910.KS` LG Chem · `011790.KS` Lotte | market / global equities | **demand (D1b)** | **the only traded proxy for the missing ethylene–naphtha spread** |
| `aCNPPICPM` China raw-chemical PPI · `aCNPPIPP` plastics PPI | China macro | **demand (D1a)** | sets CFR-China olefin/polyolefin price = TPIA's product price |
| `aCNPMIMT` / `aCNIP` China activity | China macro | **demand (D1c)** | polyolefin offtake pulse |
| `NYMEX:NG1!` Henry Hub | Energy / Natural Gas | **cost/competition (S2)** | US ethane glut → cheap export PE → Asian price pressure |
| `ICEEUR:BRN1!` Brent · `NYMEX:RB1!` gasoline | Energy / Crude | **cost (S1)** | naphtha-feedstock proxy (no naphtha series exists) |
| `ICEEUR:ATR1!` API2 coal | Energy / Coal | **cost (S3)** | power/steam for the complex |
| `MYX:FCPO1!` palm oil | Plantation | **cost (D3b)** — *low weight* | oleochemical feedstock for UNIC/MOLI/ETWA (<2% of cap) |
| `CEICI323568002` plastics mfg · `CEICI323567802` chemicals mfg | Industrials/Manufacturing | **demand/own-supply (D1d/S4)** | domestic converter throughput + own output |

**Deliberate non-linkage:** the blanket `("Basic Materials", None)` pull must be
**removed** — it drags in **Copper, Gold, Tin, Nickel, Steel, Cement, and the
`Total Reserves Minus Gold` (CEICI224743301, n696) FX-reserves series**, none of which a
petrochemical complex produces or consumes. Sweeping the whole metals category is the
mechanical source of the spurious "Total Reserves" driver the brief flagged.

---

## 7. Currently wired vs available

### 7a. Wired now (the 4-driver `Chemicals` seed) vs proposed

| driver (now) | role/sign now | verdict | proposed change |
|---|---|---|---|
| `ceic ("Basic Materials","Fertilizers")` | demand/supply | **keep** (closest matched block) | weight down — it's the ammonia/urea cousin-cycle, not the spread |
| `ceic ("Basic Materials", None)` | category sweep | **REMOVE** | leaks Copper/Gold/Tin/Nickel/Steel/**Total Reserves** → spurious drivers |
| `wb_urea` → **None** | supply +1 | **DEAD** (resolves to nothing) | replace with CEIC fertiliser value×volume (carries urea-px signal) |
| `wb_potash` → **None** | supply +1 | **DEAD** (resolves to nothing) | drop (no member produces potash; no price series) |
| `brent` `ICEEUR:BRN1!` | **cost −1** | **re-role to cost 0** | oil-LEVEL prior is the mis-key; spread ≠ level → let stats estimate sign |
| `natgas` `NYMEX:NG1!` | cost −1 | **keep −1, re-label** | it's the US-ethane *competition* channel, not ammonia feedstock cost |
| `usdidr` `FX_IDC:USDIDR` | **macro −1** | **re-role to macro 0** | two-sided (USD revenue vs USD debt/feedstock) → estimate, don't force |
| `wb_palm_oil` `MYX:FCPO1!` | **demand +1** | **drop / sign 0** | it's a *cost* for 3 micro-caps, immaterial at basket level |
| *(none)* `LYB`/`051910.KS`/`011790.KS` | — | **ADD demand +1 (new resolvers)** | the spread proxy — the single biggest add |
| *(none)* `aCNPPICPM` China chem PPI | — | **ADD demand +1 (new key)** | regional product-price driver (replaces headline `aCNPPIAR`) |
| *(none)* `ceic Industrials/Manufacturing chem+plastics IPI` | — | **ADD** | domestic throughput (`CEICI323567802`, `CEICI323568002`) |
| *(none)* `TVC:DXY` | — | **ADD macro −1** | (and fix the BBDXY-empty bug) |

### 7b. The ethylene–naphtha SPREAD data gap — concretely

This is the defining problem of the basket. **There is no naphtha price, no ethylene
price, no polyethylene/polypropylene price, no methanol price, and no chemical-margin
series anywhere in `market.json`** (verified: a regex over all 4,142 market ids for
naphtha/ethyl/propyl/olefin/polyethylene/methanol/PVC/styrene returns *only* Brent,
gasoline, gasoil [empty], natgas, and equity names). The margin that *is* TPIA's entire
earnings cannot be observed directly. Options, in order of preference:

1. **PREFERRED — global integrated-cracker EQUITY proxy.** Add new `GLOBAL_CORR` keys
   resolving to **`LYB`** (LyondellBasell, w800), **`051910.KS`** (LG Chem, w800),
   **`011790.KS`** (Lotte Chemical, w800) — pure-play naphtha-cracker integrateds whose
   stock *is* a traded ethylene-chain margin. Blend 2–3 to dilute single-name idiosyncrasy.
   These are **liquid, daily, leading** (global petchem price discovery precedes Jakarta).
   *Caveat (honest):* they are *equities*, so they import a global-equity-beta component →
   partly circular against an IDX equity basket. Mitigate by (a) blending, (b) optionally
   reading the **chemicals-relative-to-market** spread, (c) keeping weight moderate. This is
   the direct analogue of the Mining basket's CEIC-export-value nickel workaround: an
   imperfect but *on-mechanism* stand-in for a missing price.
2. **SECONDARY — China chemical PPI (`aCNPPICPM`).** Not a margin, but the **product-price
   level** that sets the regional spread when read against the Brent feedstock cost. Pairing
   `aCNPPICPM` (+1, product) with `brent` (cost) lets the multivariate engine *implicitly*
   reconstruct a crude spread. Monthly, publication-lagged → attribution, but on-theme.
3. **PROXY for the dead `wb_urea`** — CEIC fertiliser **value÷volume** (e.g.
   `CEICI323782102` value ÷ `CEICI323791802` volume) recovers an implied **urea $/unit**,
   the in-store stand-in for the missing urea price. Attribution only.
4. **REJECT — `NYMEX:RB1!` gasoline alone as "the spread."** Gasoline tracks naphtha better
   than crude does, so it is a fair *feedstock* proxy (S1), but it is still a **cost leg
   only** — it does not carry the product price and must not be sold as a margin series.

**Recommendation:** wire **option 1 (LYB-led equity proxy) as the forward spread signal**,
**option 2 (`aCNPPICPM`) as the product-price anchor**, demote `brent` to an ambiguous
cost (sign 0), and use option 3 to replace the dead urea resolver. Accept that the basket
will remain **partly an explainer** until a real naphtha/olefin price series is ingested.

---

## 8. Forecastability — why the current set is forward-flat, and the path to skill

**Diagnosis (fwd IC +0.03, contemp IC −0.04, weak).** The basket is neither predictive
nor strongly anti-predictive — it is **mis-keyed and washed out**:

- The signal is dominated by **`brent` as a confident cost (−1)**, but the basket's true
  driver is the **spread**, which is only loosely (and unstably) related to the oil
  *level*. So the oil prior is right in some regimes, wrong in others, and averages to
  near-zero forward IC with a *slightly negative* contemporaneous reading.
- The **`Total Reserves` leak** (via the `Basic Materials` category sweep) injects a long,
  smooth FX-reserves series that fits in-sample (it trends with the macro cycle) but
  **carries no forward information about petchem margins** — classic spurious-driver
  dilution.
- Two of the four nominal drivers (`wb_urea`, `wb_potash`) **resolve to None** — dead
  weight that contributes nothing, so the effective seed is even thinner than "4."

**The contemporaneous-vs-forward distinction here.** Unlike the physical-commodity baskets
(Coal, Poultry) where a liquid exogenous price genuinely leads, this basket's *real* driver
— the spread — is **not in the store**, so the engine has **no leading price to key on**.
The China PPI and CEIC throughput series are **publication-lagged quantity/price prints →
contemporaneous attribution at best**. The only genuinely *leading* instrument available is
the **foreign-cracker equity proxy (LYB/LG Chem/Lotte)**, which prices the global spread
before Jakarta — *that* is the one branch with a real forward claim, and it is the entire
upside case.

**The path to forward skill (testable):**
1. **Delete the noise** — remove the `("Basic Materials", None)` sweep (kills Total Reserves
   + metals) and the two dead urea/potash drivers. Expect the forward IC to *stop being
   diluted* and the contemporaneous IC to turn non-negative on this step alone.
2. **De-confound the oil prior** — re-role `brent` to **cost 0** and `usdidr` to **macro 0**.
   Stop forcing half-truths; let the engine estimate the empirical sign.
3. **Add the spread proxy** — wire `LYB`(+1) [+ LG Chem / Lotte]. This is the only branch
   that can deliver a *forward* lead; test whether it moves IC above the +0.08 SKILL line.
4. **Add the product-price anchor** — `aCNPPICPM`(+1) and the domestic plastics/chemicals
   throughput indices for attribution depth.

**Honest expectation.** With the missing spread *proxied by foreign equities* rather than
observed, the realistic target is to move forward IC from **+0.03 (flat/weak)** toward
**+0.06–0.10**, driven almost entirely by the LYB-proxy lead; the China-PPI and CEIC
branches will mostly improve *attribution* (contemporaneous IC) rather than forecast. The
honest concession: **until a real naphtha/ethylene/polyolefin price is ingested, this
basket is structurally an explainer plus a partial forward beta off global-cracker
equities — not a clean forecaster.** Ingesting an MOPJ-naphtha and a CFR-SEA-ethylene
series is the single data change that would move it decisively into forecaster territory.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Chemicals"` seed with the spread-keyed tree below. **New
`GLOBAL_CORR` keys must be added first** (the equity-proxy resolvers and the China
chemical-PPI key); confirm each id resolves in `correlation.sqlite` at build time (the
catalog shows w800/w801 for all three equities and the PPI is a populated `aCN…` series).

```python
# --- add to GLOBAL_CORR (spread proxies + China chemical PPI; fix BBDXY) ---
#   "petchem_lyb":   "LYB",          # LyondellBasell — olefins/polyolefins margin proxy (w800)
#   "petchem_lg":    "051910.KS",    # LG Chem — naphtha-cracker integrated (w800)
#   "petchem_lotte": "011790.KS",    # Lotte Chemical — naphtha-cracker integrated (w800)
#   "cn_chem_ppi":   "aCNPPICPM",    # China raw-chemical-materials PPI (sets CFR-China olefin px)
#   "cn_plastic_ppi":"aCNPPIPP",     # China plastic-products PPI (downstream margin)
#   "dxy":           "TVC:DXY",      # FIX: BBDXY is empty (w0) -> use TVC:DXY (w800)

"Chemicals": {  # ~95% TPIA+BRPT = an integrated naphtha-cracker. Driver = the
                # ethylene-naphtha SPREAD, proxied by foreign-cracker equities +
                # China chem PPI (no naphtha/olefin price exists in store).
    "ceic": [("Basic Materials", "Fertilizers"),                          # ammonia/urea cousin-cycle
             ("Industrials & Manufacturing", "Manufacturing Production Index"),  # chem+plastics throughput
             ("Industrials & Manufacturing", "Chemicals & Pharmaceuticals")],    # IPI chemicals
    # REMOVED: ("Basic Materials", None) — it leaked Copper/Gold/Tin/Nickel/Steel
    # and the Total Reserves Minus Gold (CEICI224743301) FX-reserves series (spurious).
    # Keep the in-store fertiliser value/volume as the urea-price stand-in (wb_urea->None).
    "ceic_override": [("value: fertilizers", "supply", +1),   # CEICI324037802 (price×vol)
                      ("chemicals and chem", "demand", +1),   # CEICI323567802 own/throughput
                      ("rubber and plastics", "demand", +1)], # CEICI323568002 converter demand
    # endogenous / off-theme CEIC series to exclude even if pulled:
    "ceic_exclude": ["total reserves", "copper", "gold", "tin", "nickel",
                     "steel", "cement"],
    "globals": [
        # --- THE SPREAD PROXY (the missing ethylene-naphtha margin, via equities) ---
        ("petchem_lyb",   "demand", +1, "LyondellBasell = traded olefin/polyolefin margin (spread proxy, leads)"),
        ("petchem_lg",    "demand", +1, "LG Chem naphtha-cracker margin proxy"),
        ("petchem_lotte", "demand", +1, "Lotte Chemical naphtha-cracker margin proxy"),
        # --- product-price / feedstock legs of the spread ---
        ("cn_chem_ppi",   "demand", +1, "China raw-chemical PPI = CFR-China olefin product price"),
        ("brent",         "cost",    0, "naphtha-feedstock proxy — AMBIGUOUS (spread != oil level); estimate sign"),
        ("natgas",        "cost",   -1, "US ethane glut -> cheap export PE -> Asian polyolefin price pressure"),
        ("wb_coal_au",    "cost",   -1, "power/steam for the complex (API2)"),
    ],
    "macro": [
        ("cn_chem_ppi",   "demand", +1, "regional chemical-cycle price (forecast-ish anchor)"),
        ("dxy",           "macro",  -1, "broad USD: commodity-priced product + EM-flow headwind"),
        ("usdidr",        "macro",   0, "two-sided: USD product revenue vs USD debt/feedstock — estimate"),
        ("id_10y",        "macro",  -1, "BRPT/TPIA leverage + AGII utility-duration"),
        # wb_palm_oil DROPPED (cost for <2% oleochem tail, not basket demand);
        # wb_urea / wb_potash DROPPED (resolve to None — dead drivers).
    ],
},
```

**Notes for the implementer.**
- `petchem_lyb/lg/lotte`, `cn_chem_ppi`, `cn_plastic_ppi` are **new `GLOBAL_CORR` keys** —
  add and verify they resolve before the seed references them.
- **`dxy` must be remapped `TVC:BBDXY` → `TVC:DXY`** (BBDXY is empty, w0) — this is a
  store-wide bug that also affects every other basket using `dxy`; flag separately.
- `wb_urea`, `wb_potash`, and the `("Basic Materials", None)` sweep are **removed** — the
  first two are dead resolvers, the third is the source of the spurious Total-Reserves driver.
- The equity-proxy drivers are **partly circular** (equity→equity). Keep them at moderate
  weight and, if the engine supports it, prefer a **chemicals-minus-market relative**; do
  not let a single foreign name dominate the posture.

**What to backtest (the keep/kill gate).** Run `backtest/bt.py "Chemicals"` and KEEP the
change only if forward IC **rises from +0.03** (and contemporaneous IC turns non-negative).
Ablations, in order:
1. **De-noise only** (remove `Basic Materials,None` sweep + dead urea/potash; re-role
   `brent`→0, `usdidr`→0) vs current seed — expect contemporaneous IC to stop being negative
   and forward IC to firm purely from removing the Total-Reserves dilution.
2. **+ spread proxy** (`LYB`/`LG`/`Lotte`) — the core hypothesis; does the foreign-cracker
   equity add *forward* IC beyond the de-noised base? This is the make-or-break branch.
3. **+ `aCNPPICPM`** product-price anchor — expect it to lift *contemporaneous* (attribution)
   more than forward.
4. confirm **`natgas` −1**, **`dxy` −1**, **`id_10y` −1** survive theory-reconciliation; if
   the equity proxy fails the circularity/IC test, fall back to the de-noised base (#1) as
   the honest minimal improvement (stop mis-keying on oil + Total Reserves).

The success criterion is honest: this basket cannot become a clean forecaster without a
real naphtha/olefin price in the store. The achievable win now is to **delete the spurious
Total-Reserves leak, stop signing the oil *level* as if it were the *spread*, and earn a
modest forward lead from foreign-cracker equities** — moving it from "+0.03 weak/mis-keyed"
to a defensible, on-mechanism explainer with a small forward edge.
