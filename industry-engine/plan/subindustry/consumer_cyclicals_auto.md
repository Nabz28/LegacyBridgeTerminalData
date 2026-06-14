# Auto (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_auto` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #50). Every RIC below is confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
> Primary CEIC block = **Consumer Discretionary → Auto Sales (45 series) + Auto Production
> (28 series)** (idind) — an exceptionally RICH block: Wholesales/Retail, by body-type
> (Sedan/4x2/4x4/Pick-up/Double-cabin/Bus/Truck), by displacement (<1500cc … >3000cc),
> by tonnage, and a near-complete by-BRAND panel (Toyota/Daihatsu/Honda/Mitsubishi/
> Suzuki/Isuzu/Hino/Wuling/Hyundai/BMW/Mercedes/…).
>
> **One-line thesis — read this before the brief's framing.** The dispatch brief describes
> this basket as *"DOMINATED by ASII (~70%) + AUTO/IMAS/GJTL/MASA/BOLT/SMSM"* and worries
> about the ASII-conglomerate mis-specification. **That is the wrong basket.** The engine's
> `consumer_cyclicals_auto` basket is **7 micro-cap names totalling ~1.1T** — *not the 200T+
> Astra complex.* ASII, AUTO (Astra Otoparts), GJTL (Gajah Tunggal), IMAS (Indomobil),
> GDYR, BRAM, SMSM, MASA, BOLT are **NOT members here** — ASII sits in the separate
> `Conglomerate` / `industrials_conglomerate` basket (capsule #13), and the larger Astra
> components are bucketed elsewhere by the upstream membership logic. What `consumer_cyclicals_auto`
> actually holds is a **distressed / illiquid tail of the auto-components universe**: TYRE
> (tyre retread), PART, LPIN (spark plugs), ISAP, LMAX, PRAS (stamping/body), AEGS — equal-
> weighted, weight-cap 0.12, total mcap ~1.1T (smaller than a single mid-cap). So the real
> problem is **two layers deep**: (1) the **wiring** is built for "a vehicle-OEM/sales-volume
> play" — ~32 Auto-Sales + Auto-Production unit-count CEIC series, all +1 — but these are
> *coincident, publication-lagged QUANTITY prints* (Gaikindo wholesales) that describe the
> **whole industry's volume**, which the 7 micro-caps barely participate in; (2) the basket
> itself is a **low-signal, corporate-action-driven micro-cap lottery** whose week-to-week
> return is liquidity/event noise, only loosely tethered to national vehicle sales. The
> negative forward skill (**fwd IC −0.087, placebo pctile 0.23 — anti-predictive, BELOW the
> 5th-percentile-equivalent**) is exactly what theory predicts: the engine kept 12 mostly-
> *coincident* volume prints (`id_gdp_real_q` best-lag 4M but forward-IC −0.12; brand sales/
> production prints at lag 0) that **co-move contemporaneously and then mean-revert**, over a
> basket too illiquid for those macro signals to forecast. Verdict up front: **this basket is
> attribution/beta only — it cannot forecast in its current form, and the honest fix is to
> stop pretending the 32 coincident volume prints lead, lean on the few genuinely LEADING
> exogenous channels (vehicle-financing credit growth, BI rate, rubber/steel/aluminium input
> prices, USD/IDR for CKD imports), and concede a hard idiosyncratic-micro-cap floor.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Auto**, sector *Consumer Cyclicals*, id `consumer_cyclicals_auto` |
| mcap | **~1.11T** (`total_mcap` 1,114,980,327,424) — capsule #50, the *smallest-but-one* of the 52; benchmark JCI |
| n_names | **7** real members (all used; `members_used` = AEGS, ISAP, LMAX, LPIN, PART, PRAS, TYRE) |
| Weighting | **equal-weight**, `weight_cap` 0.12; coverage W 798 / M 184 / Q 61, first 2011-01-14, last 2026-05-01 |
| Members (what each does) | **TYRE** (`IDX:TYRE`, 0.38T, β −0.23) — tyre/retread & rubber-goods micro-cap; the largest weight and a *negative-beta* (defensive/illiquid) name. **PART** (`IDX:PART`, 0.29T, β null) — auto-parts/components distributor-manufacturer. **LPIN** (`IDX:LPIN`, 0.17T, β null) — **Multi Prima Sejahtera**: spark-plug & auto-electrical maker (Champion brand history), thinly traded. **ISAP** (`IDX:ISAP`, 0.10T, β 1.47) — PT Isra Presisi / ISAP: precision auto components, high-β recent IPO (176wk history). **LMAX** (`IDX:LMAX`, 0.070T, β 0.07) — auto-components/distribution micro-cap (no market history row). **PRAS** (`IDX:PRAS`, 0.069T, β null) — **Prima Alloy Steel Universal**: alloy wheels / vehicle stamping & body components, long-distressed. **AEGS** (`IDX:AEGS`, 0.046T, β 1.97) — recent small-cap IPO, very high β, short history. |
| Effective concentration | **TYRE ≈ 34% + PART ≈ 26% ≈ 60% of mcap in two micro-caps**, neither of which is a vehicle OEM. There is **no OEM, no Astra name, no large tyre-maker (GJTL/MASA), no large parts-maker (AUTO/SMSM)** in the basket. Betas are incoherent and partly un-estimable: AEGS 1.97 and ISAP 1.47 (recent high-β IPOs) vs TYRE −0.23 (negative) and LMAX 0.07 (near-zero), with PART/LPIN/PRAS **null** (too illiquid to estimate). The equal-weight basket therefore mixes a **rubber-cost tyre play (TYRE)**, a **parts-distribution play (PART/LMAX/LPIN)**, a **steel/aluminium-cost body-&-wheel play (PRAS)**, and **two high-β recent-IPO lottery tickets (AEGS/ISAP)** — with no coherent single business and no exposure to the national-vehicle-sales *level* the wiring proxies. |
| Current grade | **perfected** (engine in-sample confidence on `model.confidence`); n_candidates 52, **n_kept 12** |
| Current kept-driver count | **12** (`_state.txt` line `50\|Auto\|Consumer Cyclicals\|1\|perfected\|12\|none\|-0.087`) |
| Current forward OOS | **NONE — fwd IC −0.087** (capsule), BACKTEST.md: `Auto … perfected medium 129 -0.09 -0.06 0.23 none` → n_oos **129**, fwd IC **−0.09**, hit−up **−0.06**, **placebo pctile 0.23**, flag **none**. The basket is **anti-predictive**: it lands at the 23rd placebo percentile (a real, leading model would sit ≥0.90), and both the IC and the directional hit-rate are negative. BACKTEST's own roll-up explicitly names Auto in the *"NO forward skill — several are anti-predictive … co-move with drivers contemporaneously but mean-revert"* cluster. |

**Current seed (`mapping.py` → `SEED["Auto"]`):**
```python
"Auto": {
    "ceic": [("Consumer Discretionary", "Auto Sales"),
             ("Consumer Discretionary", "Auto Production")],
    "globals": [("steel_hrc", "cost", -1, "steel input"),
                ("aluminum", "cost", -1, "aluminium input")],
    "macro": [("id_bi_rate", "macro", -1, "auto financing rate-elastic"),
              ("id_gdp_real_q", "demand", +1, "vehicle demand"),
              ("usdidr", "macro", -1, "CKD import cost")],
}
```

**What the engine actually kept (from `output/consumer_cyclicals_auto.json` → `model.drivers`, n_kept 12).** The kept stack is dominated by **coincident CEIC quantity prints**, not leading prices:
- `id_gdp_real_q` — *demand*, best_lag **4M**, contemporaneous pearson +0.26 (p 0.005), **but forward `ic` −0.120** — i.e. it co-moves with a small lead in-sample yet does NOT forecast OOS (the signature of a coincident macro read on an illiquid basket).
- `CEICI391913347` **BMW (production)** — *supply*, best_lag **0**, pearson +0.27, **`ic` −0.151**; `CEICI391912517` **Isuzu (sales)**, plus (in `rejected_top`, just below the gate) Nissan, Honda, Toyota, Truck, Honda-prod, Toyota-prod — a wall of brand-level unit prints, all lag-0, theory-agnostic.
- **`id_bi_rate` was TESTED and REJECTED** (`rejected_top` → `id_bi_rate … below_gate`) — the one genuinely *leading* macro channel did not clear the in-sample gate against the volume prints, which is itself the bug (in-sample selection favours coincident prints).

**The gap (four problems).**
1. **The wiring proxies the wrong economic object.** `("Consumer Discretionary","Auto Sales") + ("Auto Production")` pulls ~73 candidates — Gaikindo **national wholesales/retail unit counts, by body-type/cc/tonnage/brand**. These describe the *whole Indonesian vehicle industry's volume*. The 7 micro-caps are **tyre/parts/body suppliers two tiers down the value chain** with single-digit-percent national share; their returns are not the integral of national OEM volume. Worse, these are **publication-lagged COINCIDENT quantity prints** (best_lag 0–1 once published) — by the §3 rule-of-thumb they are *attribution, not forecast*, yet the engine wires ~32 of them all +1 and keeps a dozen, manufacturing an in-sample fit that does not survive OOS.
2. **The genuinely LEADING channels are thin or mis-resolved.** The only forecast-candidate branches are exogenous *prices/rates/credit*: **vehicle-financing credit growth** (most cars are bought on credit — cross-ref Multifinance), **BI policy rate** (financing-elastic, leads the order book), **rubber** (tyre cost — TYRE is the largest name), **steel/aluminium** (body/wheel cost — PRAS), **USD/IDR** (CKD/component imports). Of these: `id_bi_rate` is wired but *out-competed* by volume prints; **vehicle-credit is NOT wired at all**; and **rubber is BROKEN** (next point).
3. **Two resolver bugs.** (a) **`wb_rubber → SGX:TF1!` is EMPTY (`weekly_obs` 0).** Rubber is the *single most important input cost for the basket's largest name (TYRE)*, and the global tag the engine would use resolves to nothing. There is a real, deep alternative the engine never reaches: **`CEICI232344202` Bappebti: Rubber TSR 20: Spot: Palembang (IDR/kg, P1D, n_obs 4641)** — a domestic physical-rubber price. (b) **`id_bi_rate → ECONOMICS:IDINTR` is spark/live-only — it is NOT in `id.json`** (confirmed: exact-ric lookup fails), so the financing-rate branch runs on a low-confidence spark; the catalog-resident alternative is **`aIDRREP7DR` (Policy Rates, 7-day Reverse Repo, P1M)**.
4. **The basket is a micro-cap idiosyncratic-noise floor.** Even with perfect wiring, ~1.1T across 7 illiquid names (two with null β, two high-β recent IPOs, one negative-β) means a large share of variance is **corporate-action / liquidity / IPO-flow** noise orthogonal to *any* macro series. This is not fixable in `mapping.py` (membership is upstream) and must be stated as a structural ceiling on forecastability.

This file rebuilds the tree as: a **financing-led demand spine** (vehicle-credit growth + BI rate + income/confidence — the leading branch), a **vehicle-volume coincident block** (re-roled and *demoted* to attribution, with the brand-level redundancy collapsed to a few clean aggregates), an **input-cost stack** (rubber via the working CEIC spot + steel + aluminium + USD/IDR CKD), and an explicit, honest **micro-cap idiosyncratic concession** plus a correction of the brief's ASII-conglomerate framing (that belongs to capsule #13, not here).

---

## 2. Economic structure — how the basket makes money

**Revenue identity (component supplier, not OEM).** For every name here:

```
Revenue ≈ Σ (component units shipped × ASP)
        where component units ⟵ OEM build rate + aftermarket replacement demand
Gross margin ≈ ASP − (raw-material cost: rubber / steel / aluminium / resin)
                    − (imported-input cost in USD: CKD parts, machinery, additives)
EPS ≈ Gross margin × volume − fixed overhead − interest (working-capital + term debt)
```

The basket sits **two tiers below the consumer**: a car buyer's decision (financing rate × income × confidence) drives **OEM build** (Astra/Toyota/Daihatsu assembly), which drives **first-fit component orders** (PRAS body/wheels, LPIN spark plugs, PART/LMAX parts), while the *installed parc* of ~25m cars/120m motorcycles drives **aftermarket replacement** (TYRE retread/tyres, PART, LPIN) on a slower, more defensive cadence. So the basket's demand is a **blend of a cyclical OEM-build leg and a defensive aftermarket leg** — consistent with the incoherent betas (ISAP/AEGS cyclical-IPO vs TYRE negative/defensive).

**The margin swing factor is INPUT COST, not volume.** Because these are price-takers on volume (OEM dictates orders, aftermarket is competitive) but exposed on the cost line, the dominant margin driver is the **raw-material stack**: **rubber** for TYRE (the largest weight), **steel + aluminium** for PRAS (alloy wheels/stamping) and structural parts, plus **USD/IDR** on imported feedstock/additives/machinery. A sell-side analyst on these names watches: (i) **rubber/steel/aluminium spot** for the cost squeeze; (ii) **Gaikindo monthly wholesales** for the OEM-build read (the order book) — *coincident, not leading*; (iii) **vehicle-financing credit growth + BI rate** for the forward demand pulse; (iv) **USD/IDR** for the import bill; (v) for these specific micro-caps, **liquidity / free-float / corporate actions** (IPO lock-ups, rights issues, going-concern notes) that dominate price more than fundamentals.

**Intra-basket dispersion (which names differ).**
- **Rubber-cost-led:** TYRE (tyres/retread) — margin inverse to rubber; defensive (β −0.23).
- **Steel/aluminium-cost-led, OEM-build-cyclical:** PRAS (alloy wheels, stamping/body) — margin inverse to steel/aluminium, volume tied to OEM build; long-distressed.
- **Parts distribution / aftermarket:** PART, LMAX, LPIN (spark plugs) — blend of OEM-fit + replacement; thin liquidity, null β.
- **High-β recent-IPO lottery:** AEGS (β 1.97), ISAP (β 1.47) — short history (AEGS especially), price driven by IPO flow/liquidity, weak macro tether.

The equal-weight + 0.12-cap scheme means **no single coherent driver explains the basket**; the engine is averaging a rubber play, a steel play, an aftermarket-defensive play, and two IPO lottery tickets — which is *why* a coincident national-volume signal both fits in-sample (everyone is loosely pro-cyclical) and fails out-of-sample (the idiosyncratic share dominates the forward return).

---

## 3. DEMAND driver tree

Leaf format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.
**The forecast-candidate spine is FINANCING + RATES + INCOME (leading); the vehicle-volume block is COINCIDENT (attribution).**

### D1 — Vehicle FINANCING / consumer credit  *(the leading demand branch — most cars are bought on credit; cross-ref Multifinance #30)*
- `CEIC389692117` (**n119**, IDR bn, P1M, through 2026-04) · demand · **+1** · LEAD **3–6M** · **Commercial & Rural Banks: Loans: Household Consumption: Vehicles** — the cleanest forward read of car-buying intent: credit is *approved before* the unit is dispatched, so vehicle-loan growth leads Gaikindo wholesales, which leads first-fit component orders. **THE single most important addition. Quality:** real monthly BI series, 2016-on, ~1-month publication lag — slower than a market price but genuinely *leads* the volume prints the engine currently over-weights.
- `CEIC389691967` (**n118**, IDR bn, P1M) · demand · +1 · LEAD 1–3M · **Loans: Wholesale & Retail Trade; Repair of Motor Vehicles & Motorcycles** — working-capital credit to the dealer/repair channel; proxies dealer inventory financing + aftermarket activity (directly relevant to PART/TYRE/LPIN). Quality: monthly BI, 2016-on.
- `id_bank_credit` → `aIDLONYAR` (system bank-credit YoY, P1M) · demand · +1 · LEAD 1–3M · broad consumer-credit backdrop (the §2.3 `CREDIT_YOY` tag) — a coarser fallback when the vehicle-specific series is thin.

### D2 — Real income & confidence  *(durables purchases are postponeable — the discretionary trigger)*
- `CEIC277373102` (**n196**, Point, P1M, 2010-on) · demand · +1 · LEAD **3–6M** · **Consumer Confidence: Expectations: 6 Months Ahead: Expected Income** — the *expectations* sub-index leads big-ticket durable purchases; prefer this CEIC-resident series over the spark-only `aIDCSINC6MN` (which has null n_obs). Quality: real 196-obs BI survey — a rare *leading, survey-based* demand read.
- `CEIC277372902` (**n196**, Point, P1M) · demand · +1 · LEAD 1–3M · **Consumer Confidence: Present Situation: Buying Condition for Durable Goods** — direct "is now a good time to buy durables" gauge; the present-situation companion to the expectations leaf.
- `id_consumer_confidence` → `aIDCONIAR` (Consumer Confidence Index) · demand · +1 · LEAD 1–3M · headline CCI (§2.4 `CONS_CONF`) — coarse fallback.
- `id_gdp_real_q` → `aIDGDPAR1` (real GDP) · demand · +1 · LEAD 0–1M · domestic-demand backdrop. **NOTE:** engine kept this with best_lag 4 but forward `ic` −0.12 — keep as *attribution context*, do not treat as a forecaster.

### D3 — Vehicle VOLUME (Gaikindo)  *(COINCIDENT — demote to attribution; collapse brand redundancy)*
These are the ~32 series the wiring leans on. They are **publication-lagged quantity prints** that describe national OEM volume; useful to *explain* a move after the fact, weak to *forecast*. Keep **2–3 clean aggregates**, drop the brand-by-brand panel (collinear, theory-agnostic, the source of the in-sample over-fit).
- `CEICI13839901` (**n448**, Unit, P1M, 1989-on, last 2026-04) · demand · +1 · LEAD **0M (coincident)** · **Motor Vehicle Sales: Wholesales** — the headline Gaikindo total; the cleanest single national-volume read. Quality: 448-obs, deepest history in the block; ~1-month lag.
- `CEICI412546117` (**n184**, Unit, P1M, 2011-on) · demand · +1 · LEAD 0M · **Motor Vehicle Sales: Retail** — retail (registration) volume; slightly closer to end-demand than wholesales (which can build dealer stock).
- `CEICI13840501` (**n448**, Unit, P1M) · demand · +1 · LEAD 0M · **Wholesales: Sedan** — kept only as a mix indicator (premium vs LCGC). *Optional.*
- `CEICI322851802` (**n196**, 2010=100, P1M) · demand · +1 · LEAD 0–1M · **Real Retail Sales Index: Motor Vehicles Parts & Accessories** — the **aftermarket** read, the most basket-relevant volume series (PART/TYRE/LPIN sell parts/accessories), index not unit-count so cleaner. **Prefer this over the OEM unit counts for THIS basket.**
- *(drop)* the by-brand sales panel `CEICI3919124xx` (Toyota/Honda/Daihatsu/Suzuki/Isuzu/Mitsubishi/BMW/Mercedes/Wuling/Hyundai/…) — 20+ collinear lag-0 prints; the engine keeping Isuzu/BMW etc. is over-fit, not signal.

### D4 — Fuel / usage proxy  *(parc utilisation → aftermarket replacement)*
- `CEIC322852002` (**n196**, 2010=100, P1M) · demand · +1 · LEAD 0–1M · **Real Retail Sales Index: Automotive Fuels** — fuel retail volume proxies vehicle-kilometres-travelled → tyre/parts wear → aftermarket replacement (TYRE/PART). A defensive-demand read distinct from new-vehicle volume.

**D-branch forecast hypothesis:** the *leading* demand signal is **D1 (vehicle-credit growth) + D2 (income-expectations/durables-intent) + the BI-rate parent (§5)** — credit and confidence move 3–6M before the order book. **D3 (Gaikindo volume) is coincident** and should be re-roled to attribution. The basket's negative forward IC is precisely the consequence of the engine inverting this priority.

---

## 4. SUPPLY / COST driver tree

The **margin swing factor** for this basket. These are *leading, liquid prices* (the §3 forecast-candidate class) — the most credible source of any real forward skill, especially for TYRE (rubber) and PRAS (steel/aluminium).

### S1 — Rubber  *(THE cost for TYRE, the basket's largest weight — currently BROKEN)*
- **`CEICI232344202` (n_obs 4641, IDR/kg, P1D)** · cost · **−1** · LEAD **1–3M** · **Bappebti: Rubber TSR 20: Spot: Palembang** — domestic physical natural-rubber price; rising rubber compresses tyre-maker margin. **Replaces the empty `wb_rubber → SGX:TF1!`.** Quality: deep daily series (4641 obs) — a genuine leading price the engine can finally see.
- *(global, currently broken)* `wb_rubber → SGX:TF1!` — **`weekly_obs` 0, EMPTY.** Either repoint the global tag, or wire the CEIC spot above via `ceic`. **This is the headline data bug for the basket.**

### S2 — Steel  *(body, stamping, structural parts — PRAS)*
- `steel_hrc` → `NYMEX:HRC1!` (**weekly_obs 800**) · cost · −1 · LEAD 1–3M · US HRC hot-rolled-coil price = the global steel benchmark for stamping/body cost (PRAS, structural parts). Quality: deep, liquid, leading — *already wired, correct sign.*
- *(cross-industry, attribution)* `CEICI…` Basic Materials → **Steel: Import value: Iron & Steel** (P1M, n172) — local steel-import cost in IDR; slower, coincident, optional context.

### S3 — Aluminium  *(alloy wheels — PRAS — and lightweight components)*
- `aluminum` → `COMEX:ALI1!` (**weekly_obs 621**) · cost · −1 · LEAD 1–3M · LME/CME aluminium = alloy-wheel & lightweight-component cost. Quality: liquid leading price — *already wired, correct sign.*

### S4 — Energy / other inputs  *(secondary)*
- `brent` → `ICEEUR:BRN1!` (**weekly_obs 800**) · cost · −1 · LEAD 1–3M · oil-derived inputs (synthetic-rubber additives, plastics, resins, freight) + a broad cyclical-cost proxy. Quality: liquid, leading. *Optional — a thin sleeve here vs Apparel/Chemicals.*
- `copper` → `COMEX:HG1!` (**weekly_obs 800**) · cost · −1 · LEAD 1–3M · auto-electrical / wiring-harness copper (LPIN electrical, harness parts). *Optional, thin.*

### S5 — Industry OUTPUT / capacity  *(coincident attribution)*
- `CEICI13538301` (**n388**, Unit, P1M, 1994-on) · supply · 0 · LEAD 0M · **Motor Vehicle Production** — national assembly output; coincident with sales, useful for build-rate attribution. **Keep at most one production aggregate; drop the by-brand production panel** (`CEICI3919133xx` Toyota/Honda/BMW-prod etc. — the engine kept BMW-prod, which is over-fit).
- *(idind Industrials)* **Manufacturing Production Index: Motor vehicles, Trailers & Semi-trailers** (2010=100, P1M, n180) — a cleaner SA output index than the unit counts; coincident.

**S-branch forecast hypothesis:** **S1–S3 (rubber/steel/aluminium spot) are the basket's best forecast candidates** — exogenous, liquid, leading prices that hit margin 1–3M out, and they map directly onto the two largest, most macro-tethered names (TYRE on rubber, PRAS on steel/aluminium). Fixing the **rubber resolver** is the highest-expected-value single change. S5 volume/output is coincident — attribution only.

---

## 5. MACRO / RATE / FX / FLOW

### M1 — Financing rate  *(THE rate channel — autos are financing-elastic; the sub-driver parent of D1)*
- `id_bi_rate` → currently `ECONOMICS:IDINTR` (**spark/live only — NOT in id.json**) · macro · **−1** · LEAD **3–6M** · BI policy rate sets auto-loan rates → monthly-instalment affordability → financing volume (D1) → OEM build → component orders. **Catalog-resident fix: `aIDRREP7DR` (Policy Rates, 7-day Reverse Repo, P1M).** This is the **rate→credit→volume→earnings chain** — the most defensible forecast mechanism the basket has, and it was *rejected below-gate* in favour of coincident volume prints. **Re-prioritise.**
- `id_10y` → `TVC:ID10Y` (**weekly_obs 798**) · macro · −1 · LEAD 1–3M · IDR govt 10Y = multifinance funding cost + discount-rate proxy; rising yields raise financing cost and compress durable demand. Liquid, leading.
- `id_01y` → `TVC:ID01Y` (**weekly_obs 793**) · macro · −1 · LEAD 1–3M · short-rate, closest to floating auto-loan funding. Liquid, leading.

### M2 — FX  *(imported CKD parts, additives, machinery)*
- `usdidr` → `FX_IDC:USDIDR` (**weekly_obs 801**) · macro · **−1** · LEAD 1–3M · weak IDR raises the IDR cost of imported CKD components, additives, and capex → margin headwind for domestic component makers. *Already wired, correct sign.* (Contrast: for an *exporter* basket the sign flips +1 — these names are net importers, so −1 is right.)
- `dxy` → `TVC:BBDXY` (**weekly_obs 0, EMPTY**) · macro · — · **broken global tag**; if a broad-USD/EM-flow overlay is wanted use **`TVC:DXY` (weekly_obs 800)** instead. *Optional — flow overlay, low priority for a 1.1T basket.*

### M3 — Activity / cycle  *(coincident backdrop)*
- `id_gdp_real_q` → `aIDGDPAR1` · macro/demand · +1 · LEAD 0–1M · domestic-demand backdrop (also in D2). Coincident — attribution.
- `id_pmi` → `aIDPMIMAQ` (manufacturing PMI) · macro · +1 · LEAD 1–2M · manufacturing pulse → component-order momentum. Slightly leading.
- `id_cpi_yoy` → `ECONOMICS:IDIRYY` · macro · −1 · LEAD 1–3M · inflation squeezes real income → postpones durables (the STD_MACRO inflation regime).

**M-branch forecast hypothesis:** **M1 (BI rate / yields) is the leading parent of the whole demand spine** (rate → credit → volume → earnings). On an illiquid micro-cap basket the rate signal's forward power is muted, but it is *directionally* the right mechanism, unlike the coincident volume prints. The basket's negative forward IC will not flip to positive from rates alone — the idiosyncratic floor is too high — but re-leaning on M1 + D1 + S1–S3 is the honest, theory-coherent posture.

---

## 6. Cross-industry linkages (series borrowed from other categories)

| borrowed series | home block | role here | why |
|---|---|---|---|
| `CEIC389692117` Loans: Household Consumption: **Vehicles** (n119) | **Banking** (id macro) — cross-ref **Multifinance #30** | demand +1, **LEAD 3–6M** | most cars are financed; vehicle-loan growth is the forward order-book proxy. Multifinance (`SEED["Multifinance"]`) wires the same financing channel — Auto should borrow it. |
| `CEIC389691967` Loans: Trade/Repair of Motor Vehicles (n118) | Banking | demand +1, LEAD 1–3M | dealer working-capital + aftermarket repair credit. |
| `CEICI232344202` Rubber TSR 20 Spot: Palembang (n4641) | **Plantation & Agriculture → Rubber** (idind) | cost −1, LEAD 1–3M | tyre raw-material cost (TYRE) — the working replacement for the empty `wb_rubber`. |
| `steel_hrc` HRC (wk 800) · `aluminum` ALI (wk 621) | **Market commodities** | cost −1 | body/wheel/stamping input (PRAS). |
| `CEIC277373102` Expected-Income · `CEIC277372902` Durables-buying condition (n196) | **Consumer Surveys** (id macro) | demand +1, LEAD 3–6M | leading durable-purchase intent. |
| `id_pmi → aIDPMIMAQ` | Activity/cycle (§2.5) | macro +1 | component-order momentum. |
| *(reference, NOT a member)* ASII / UNTR / AALI complex | **Conglomerate #13** (`industrials_conglomerate`) | — | the brief's "ASII ~70%" belongs to capsule #13's tree (auto sales + UNTR coal-override + AALI palm + financing-rate), **not** to this micro-cap parts basket. Cited here only to correct the framing. |

---

## 7. Currently-wired vs available

| branch | wired now | available to ADD (priority) | leading? |
|---|---|---|---|
| Vehicle financing / credit | **— (none)** | **`CEIC389692117` vehicle loans (HIGH)**, `CEIC389691967` trade/repair loans, `id_bank_credit` | **YES (3–6M)** |
| Rate parent | `id_bi_rate` (**spark-only, rejected below-gate**) | re-point to `aIDRREP7DR`; add `id_10y` (798), `id_01y` (793); **re-prioritise above volume prints** | YES (1–6M) |
| Income / confidence | — | **`CEIC277373102` expected-income (HIGH)**, `CEIC277372902` durables-intent, `aIDCONIAR` | YES (1–6M) |
| Vehicle volume (Gaikindo) | **~32 Auto-Sales+Production series, all +1** | **COLLAPSE** to `CEICI13839901` wholesales + `CEICI412546117` retail + **`CEICI322851802` parts-retail-index (most basket-relevant)**; **DROP the by-brand panel** | **NO (coincident)** |
| Rubber cost | **`wb_rubber → SGX:TF1!` EMPTY (BUG)** | **`CEICI232344202` TSR20 Palembang spot (HIGH — fixes the bug)** | YES (1–3M) |
| Steel cost | `steel_hrc` (wk 800) ✓ | keep | YES |
| Aluminium cost | `aluminum` (wk 621) ✓ | keep | YES |
| FX (CKD imports) | `usdidr` −1 (wk 801) ✓ | keep; (`dxy → BBDXY` EMPTY — use `TVC:DXY` only if a flow overlay is wanted) | YES |
| Fuel / usage | — | `CEIC322852002` automotive-fuels retail index (aftermarket) | coincident |
| Output / capacity | (within Auto Production pull) | keep **one** aggregate (`CEICI13538301`); DROP by-brand production | NO (coincident) |

**Bugs called out:** (1) **`wb_rubber → SGX:TF1!` empty** — the basket's #1 input cost resolves to nothing. (2) **`id_bi_rate → ECONOMICS:IDINTR` not in id.json** (spark-only) — financing-rate branch on a low-confidence spark; use `aIDRREP7DR`. (3) **`dxy → TVC:BBDXY` empty** (use `TVC:DXY`). (4) **Structural mis-specification:** ~32 coincident volume prints all +1 → in-sample over-fit, OOS anti-prediction. (5) **Membership note (not a `mapping.py` fix):** the basket is 7 micro-caps, *not* the Astra complex the brief describes.

---

## 8. Forecastability

**Verdict: ATTRIBUTION / BETA ONLY — not a forecaster in its current form, and unlikely to become one without a membership change.** Three independent reasons, all confirmed:

1. **The kept drivers are coincident, not leading.** The engine kept 12 drivers led by `id_gdp_real_q` (forward `ic` −0.12) and a wall of lag-0 brand-level CEIC volume prints (BMW `ic` −0.151, Isuzu, plus Nissan/Honda/Toyota just below the gate). Per the §3 rule-of-thumb, slow publication-lagged *quantity* prints are coincident/lagging — they explain a contemporaneous move and then **mean-revert**, producing the **negative forward IC (−0.087)** and the **23rd placebo percentile** (a leading model sits ≥0.90). BACKTEST.md explicitly clusters Auto with the *"co-move with drivers contemporaneously but mean-revert → read as contemporaneous attribution, NOT a forecast"* group.

2. **The contemporaneous-vs-forward gap.** `id_gdp_real_q` has positive *contemporaneous* pearson (+0.26) but negative *forward* IC (−0.12). That inversion is the diagnostic: the posture co-moves with national demand in-sample yet does not anticipate the basket's next-month return — because the basket's forward return is dominated by **idiosyncratic micro-cap noise** (IPO flow on AEGS/ISAP, going-concern/liquidity on PRAS/LPIN, negative-β defensiveness on TYRE), not by national vehicle volume.

3. **The idiosyncratic floor is structural.** ~1.1T across 7 illiquid names (two null-β, two high-β recent IPOs, one negative-β) means corporate-action/liquidity variance swamps macro variance. No `mapping.py` change can model an IPO lock-up expiry or a rights issue.

**What WOULD move it from explainer toward forecaster (best honest case):**
- **Re-lean on the leading branches:** vehicle-financing credit growth (D1, 3–6M lead) + BI rate/yields (M1) + income-expectations (D2) + rubber/steel/aluminium spot (S1–S3). These are the *mechanistically* forward channels (rate → credit → volume → component orders → earnings) and the only liquid leading prices that map onto the two largest names.
- **Demote the coincident volume block** to attribution: collapse ~32 prints to 2–3 aggregates, drop the by-brand panel that drives the in-sample over-fit. This alone should *raise the placebo percentile* (less over-fitting) even if IC stays modest.
- **Fix the rubber resolver** so TYRE (the largest weight) finally has a working, leading cost input.
- **Honest concession:** even after all of the above, expect the forward IC to move *toward zero from −0.087*, not to a robust positive — the micro-cap idiosyncratic floor caps it. The right terminal grade for this basket is **"contemporaneous attribution / commodity-cost beta,"** with the verdict label reading *attribution, not forecast*. If the desk wants a true auto *forecaster*, the lever is **upstream membership** (include the liquid components — AUTO/SMSM/GJTL/DRMA — and/or read the Conglomerate #13 tree for the ASII auto sleeve), not more drivers on these 7 names.

---

## 9. Engine-wiring spec (`mapping.py`)

Concrete, falsifiable. **Re-prioritise leading credit/rate/cost over coincident volume; fix two empty resolvers; collapse the brand redundancy.**

```python
"Auto": {
    # Keep the block pulls but they will be RE-ROLED/demoted via ceic_override + exclude.
    "ceic": [("Consumer Discretionary", "Auto Sales"),
             ("Consumer Discretionary", "Auto Production"),
             ("Plantation & Agriculture", "Rubber")],   # reach the TSR20 spot (cost input)
    "ceic_override": [
        # demote the coincident volume aggregates to attribution (sign 0, not +1),
        # so they stop manufacturing in-sample fit:
        ("motor vehicle sales: wholesales", "demand", 0),
        ("motor vehicle sales: retail", "demand", 0),
        ("motor vehicle production", "supply", 0),
        # the aftermarket parts-retail index is the basket-relevant volume read:
        ("real retail sales index: motor vehicles part", "demand", +1),
        # rubber spot is a COST, sign -1 (CEIC default would mis-role a plantation 'supply'):
        ("rubber tsr 20: spot: palembang", "cost", -1),
    ],
    "ceic_exclude": [
        # drop the collinear by-brand sales/production panel (over-fit source):
        "toyota", "daihatsu", "honda", "suzuki", "isuzu", "hino", "mitsubishi",
        "nissan", "mazda", "bmw", "mercedes", "lexus", "audi", "wuling", "hyundai",
        "faw", "dfsk", "morris garage", "ioniq", "air ev", "ud truck", "mini",
        # drop fine cc/tonnage cuts (keep only headline aggregates):
        "below 1500", "1500 to 3000", "1501 to 3000", "2501 to 3000",
        "over 3000", "5 to 24 ton", "over 24 ton",
    ],
    "globals": [
        ("steel_hrc", "cost", -1, "HRC steel = body/stamping/wheel input (PRAS)"),
        ("aluminum", "cost", -1, "alloy-wheel & lightweight-component input (PRAS)"),
        # rubber via CEIC ceic_override above (global wb_rubber -> SGX:TF1! is EMPTY).
        ("usdidr", "macro", -1, "imported CKD parts / additives / machinery cost"),
    ],
    "macro": [
        # LEADING demand spine (re-prioritised above the coincident volume prints):
        ("id_bi_rate", "macro", -1, "auto financing rate-elastic (rate->credit->volume)"),
        ("id_10y", "macro", -1, "multifinance funding cost / discount rate"),
        ("id_bank_credit", "demand", +1, "consumer/vehicle financing growth"),
        ("id_consumer_confidence", "demand", +1, "durable-purchase intent (leading)"),
        ("id_gdp_real_q", "demand", +1, "domestic-demand backdrop (attribution)"),
        ("id_cpi_yoy", "demand", -1, "real-income squeeze postpones durables"),
    ],
}
```

**Plus a resolver fix in `GLOBAL_CORR` (separate, flagged as cross-cutting — do NOT edit here, note for the resolver-bug list):**
- `"wb_rubber": "SGX:TF1!"` → **empty**; repoint to a populated rubber price or rely on the CEIC `ceic_override` TSR20 spot above. *(This file's basket uses the CEIC route to avoid touching the shared global.)*
- `"id_bi_rate": "ECONOMICS:IDINTR"` → spark-only; the catalog-resident BI 7DRR is `aIDRREP7DR`.

**New-series leaf to add via macro (cross-ref Multifinance), if the resolver supports direct CEIC rics in `macro`:**
- `CEIC389692117` (vehicle loans, n119) · demand +1 · the single highest-value *leading* demand addition.

**Falsifiable backtest plan.** Re-run `backtest/bt.py "Auto"` after the change and KEEP only if the forward read improves *honestly*:
1. **Primary success:** **placebo percentile rises** (over-fit removed) AND **forward IC moves toward / above 0** (target: from −0.087 to ≥ −0.02, ideally ≥ +0.03). Even a move to ~0 with a higher placebo percentile is a *win* — it means the model stopped being anti-predictive.
2. **Mechanism check:** with the brand panel excluded and credit/rate/rubber added, the kept-driver set should be dominated by **leading** branches (vehicle-credit, BI rate/yields, rubber/steel spot), not lag-0 brand prints. If the engine still keeps coincident volume prints over `id_bi_rate`/`id_bank_credit`, the in-sample gate is the culprit — flag for a gate/lead-aware selection fix.
3. **Confirming IC signature:** the vehicle-credit (`CEIC389692117`) and BI-rate leaves should show **best_lag > 0 with positive corr-at-best AND a non-negative forward `ic`** — distinguishing them from the GDP/brand prints (positive contemporaneous, negative forward).
4. **Honest stop condition:** if forward IC stays significantly negative after demoting volume and adding the leading spine, **accept the attribution-only verdict** and label the basket *contemporaneous commodity-cost/financing beta, not a forecaster* — the residual is the micro-cap idiosyncratic floor, which is a membership problem, not a driver problem.
