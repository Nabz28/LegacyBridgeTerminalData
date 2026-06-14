# Conglomerate (ASII / Astra International) — Driver Tree

> `basket_id: industrials_conglomerate` · sector **Industrials** · priority 13 ·
> mcap **216.3T** · **n_members = 1 (ASII only)** · grade **partial** · kept **6/52** ·
> **forward OOS IC −0.14 (placebo 7th pctile — ANTI-predictive)**.
>
> This file is special: the "sub-industry" is **one stock**. The verdict is not a
> cross-sectional basket signal — it is *one company's monthly return path*. ASII
> is a **holding company / sum-of-segments**, so its single blended return is the
> weighted sum of five partly-offsetting businesses. That structure is exactly why
> a single sign is hard and why the engine is currently anti-predictive. This plan
> rebuilds the tree **segment by segment**, maps each segment to the real series we
> already hold, and proposes a **segment-weighted composite** in place of the flat
> grab-bag the engine kept.

---

## 1. Snapshot — the n=1 sum-of-segments problem

**What the basket is.** A single name: **ASII (Astra International)**, Indonesia's
largest listed conglomerate, ~5% of the IHSG. The engine's basket file confirms
`n_members = 1, members_used = ["ASII"]`, coverage **798 weeks / 184 months /
61 quarters**, 2011-01 → 2026-05, total mcap **216.3T**, `weight_cap 0.12`,
`equal_weight` (trivially — one name).

**ASII's five segments (revenue weight matters — these are the offsetting limbs):**

| Segment | Astra vehicle | Primary driver family | Rough earnings weight* |
|---|---|---|---|
| **Automotive** (Toyota/Daihatsu/Isuzu 4-wheel + Honda 2-wheel) | ~50% Gaikindo 4W share, ~75% 2W via AHM | **vehicle volume × mix**, financing rate, real income, fuel | ~25–30% of net profit |
| **Heavy Equipment & Mining** (UNTR: Komatsu dealer + **Pamapersada** coal contractor + coal mines) | UNTR ~60%-owned | **coal price + coal-mining ACTIVITY** (overburden, volume) → Komatsu units | ~35–45% (the swing factor) |
| **Financial Services** (ACC, FIFGROUP, Astra-Sedaya auto financing + Bank Permata) | captive auto financing | **funding rate** (id_10y / BI rate), new-loan vol, credit cost | ~15–20% |
| **Agribusiness** (AALI: CPO) | AALI ~80%-owned | **CPO price** (FCPO), FFB yield, export levy | ~5–10% |
| **Infrastructure / IT / Property** | minority | GDP, toll traffic, data | <5% |

\* Weights drift with the commodity cycle — in a coal up-cycle UNTR can be >45% of
profit; in a down-cycle autos+finance dominate. The weights are themselves
state-dependent, which is the deepest reason a fixed blended sign fails.

**The OOS-negative gap (grounded in `backtest/results/industrials_conglomerate.json`).**

- `forward`: n=125, **fwd_ic −0.143**, hit_rate 0.424, edge −0.054,
  long_short −1.45%/mo, **placebo ic_pctile 0.067** → below the 5–10th percentile
  of the circular-shift null. The posture **forecasts the wrong way**.
- `contemporaneous_ref`: fwd_ic **+0.034**, hit 0.52, placebo pctile 0.60 → the
  drivers *co-move* with ASII modestly **this month** but carry **no forward edge**.
  The engine is a weak *explainer*, not a *forecaster*, here.
- Engine model: **NEUTRAL [49/100, low conf]**, `net_tilt −0.043`,
  **`model_conflict = true`** (`demand_tilt −0.17` vs `supply_tilt +0.17` —
  the segments literally pull opposite ways and net to ~zero), `macro_tilt −0.085`.
- Confidence reasons: `max|corr|=0.43`, `theory_agree=25%`, `stable=50%`,
  `mvR2=0.19`, `OOS=61%(pseudo)`, `mt_penalty=0.68(n=52)`, `model_conflict→downgraded`.
- Kept 6/52, but **theory-incoherent**: of the kept set, the auto-volume and
  coal-activity drivers come in with `emp_sign −1` against a `+1` prior
  (`theory_agree=false`) — see §8 for why this is *mechanically real*, not noise.

**One-line gap:** the engine kept a flat mix of one strong rate driver (id_10y)
plus a scatter of individually weak, sign-flipping auto/coal CEIC prints; their
demand/supply tilts cancel, the verdict collapses to NEUTRAL, and the only thing
with forward content (the rate channel) is diluted by the rest. The fix is to stop
treating ASII as one undifferentiated demand basket and model it as a **weighted
composite of segment sub-signals**, anchored on the empirically dominant
**financing-rate** channel.

---

## 2. Economic structure — where the marginal earnings surprise comes from

ASII's consolidated net profit ≈
`Σ_segment ( price_s × volume_s − cost_s ) × stake_s`. A sell-side analyst does not
model "ASII demand"; they build a **segment sum-of-the-parts (SOTP)** and ask
*which segment is delivering the marginal quarterly surprise*. Empirically that is
almost always one of two things:

1. **Auto unit volume × mix** (Gaikindo monthly 4-wheel + 2-wheel). Astra's auto
   earnings are `units × ASP × margin`; the high-frequency surprise is **units**,
   published monthly by Gaikindo and held here as
   **`CEICI13834801` Motor Vehicle Sales: PT Astra: Local (n=424)** and
   **`CEICI13839601` Motorcycle Sales: PT Astra: Local (n=425)** — *Astra's own
   volumes*, not industry proxies. Mix (LCGC vs premium, 4x2 vs truck) moves margin.
2. **UNTR coal-mining ACTIVITY + coal price.** This is the *swing* segment. Two
   distinct levers: (a) **coal price** (API2 / HBA) sets UNTR's own mine revenue and
   the royalty/contractor-rate ceiling; (b) **mining volume/overburden** drives
   Pamapersada contractor revenue and **Komatsu heavy-equipment unit sales**
   (`CEICI391910517`, n=232) — a near-direct read on UNTR's order book.

**The financing-rate sensitivity** is the cross-cutting amplifier and the
empirical anchor. Three of five segments are rate-geared: (i) **auto demand** is
~70% financed, so the BI/10Y rate sets the affordability of the monthly
installment; (ii) **Astra Financial** funds a multi-trillion auto-loan book largely
off bonds — `id_10y` *is* its marginal funding cost; (iii) as a **holding company**,
ASII is valued on a discounted SOTP, so the discount rate hits the multiple
directly. The engine confirms this is the single strongest relationship in the
whole candidate set: **`id_10y` pearson −0.43, lead 0m, HAC-OLS t = −5.28,
multivariate std_beta −0.029 (t −4.65), theory_agree = true, stable = true.**

**Why a single blended sign is hard (the core thesis).** The segment drivers are
**negatively correlated in the cycle**:
- A **coal up-cycle** (good for UNTR ≈ 40% of profit) usually coincides with
  **rising rates / strong USD / high fuel** (bad for auto affordability and the
  financing book ≈ 45% of profit). USD/IDR weakness *helps* the USD coal+CPO
  revenue but *hurts* CKD auto-part import cost and signals risk-off for the
  rate-sensitive financing sleeve.
- So a "rise in commodities" is simultaneously a tailwind (UNTR/AALI) and a
  headwind (autos/finance via the rates/FX it drags along). The blended monthly
  return nets these to near-zero contemporaneously and **mean-reverts** — which is
  precisely the anti-predictive forward signature in the backtest. A flat
  equal-weight average of segment drivers is therefore close to a **random walk
  plus the one rate term**; the engine's `model_conflict` flag is the symptom.

---

## 3. DEMAND tree — per segment (real series · sign · LEAD · weight)

> Sign = a-priori sign on ASII's **excess return vs IHSG**. LEAD = months the
> series is expected to move *before* the equity. `w` = proposed segment weight in a
> composite (see §9). Frequencies/n_obs are from the catalogs.

```
ASII DEMAND
├── AUTO  (w≈0.30)
│   ├── D1 Astra 4-wheel units ──► CEICI13834801 "Motor Vehicle Sales: PT Astra: Local"
│   │        role demand · sign +1 (raw vol) · M · n=424 · last 2026-04 · LEAD 0–1m (coincident-to-slight-lead; earnings proxy)
│   │        ⚠ contemporaneous emp_sign flips −1 — see §8 (rate-cut re-rating dominates volume in returns)
│   ├── D2 Astra 2-wheel units ──► CEICI13839601 "Motorcycle Sales: PT Astra: Local"
│   │        demand · +1 · M · n=425 · last 2026-05 · LEAD 0–1m (AHM 75% share; mass-market pulse)
│   ├── D3 industry 4W wholesale ──► CEICI13839901 "Motor Vehicle Sales: Wholesales" (Gaikindo total)
│   │        demand · +1 · M · n=448 · share-of-market context for D1
│   ├── D4 mix/segment ──► CEICI13840801 "Wholesales: 1500–3000cc" (n=448) · CEICI13841901 "Pick Up <5T" (truck/LCV proxy)
│   │        demand · +1 (margin mix) · M
│   ├── sub-driver: real income ──► CEIC322852002 "Real Retail Sales: Automotive Fuels" (n=196, M) — proxy for km driven / replacement
│   └── sub-driver: financing affordability ──► id_10y / BI rate (see MACRO §5; this is the parent that LEADS D1–D2 by ~3–6m)
├── HEAVY-EQ / MINING  (w≈0.40 — the swing)
│   ├── D5 coal PRICE (API2) ──► ICEEUR:ATR1!  (market, n_weekly=782) — UNTR mine revenue + contractor-rate ceiling
│   │        demand/supply · +1 · W→M · LEAD 1–3m (liquid price leads the quantity prints)
│   ├── D6 HBA admin coal ref ──► CEICI354326367 "Referred Price: Coal" (n=210, M) — Indonesian-specific royalty/price anchor
│   │        supply · +1 · M · LEAD 0–1m (admin price follows API2)
│   ├── D7 Komatsu unit sales ──► CEICI391910517 "Construction Machinery: UNTR (Komatsu): Total" (n=232, M)
│   │        demand · +1 · M · last 2026-04 · LEAD 0m (≈ UNTR equipment order book — DIRECT segment read, currently UNUSED)
│   ├── D8 Pamapersada coal volume ──► CEICI391910527 "Coal Mining: UNTR (Pamapersada): Coal Production" (n=232, M)
│   │        demand · +1 · M · contractor revenue; pair w/ CEICI391910547 overburden (bcm) — activity, not price
│   └── sub-driver: China demand ──► cn_ip_yoy / cn_pmi_mfg (thermal-coal demand pulse, LEADS API2)
├── AGRI  (w≈0.08)
│   ├── D9 CPO price ──► MYX:FCPO1!  (market, n_weekly=800) — AALI revenue/tonne
│   │        demand/supply · +1 · W→M · LEAD 1–2m
│   └── D10 soyoil substitute floor ──► CBOT:ZL1! (sets veg-oil price floor; +1)
└── FINANCIAL  (w≈0.18 — rate-geared, see MACRO)
    ├── D11 vehicle consumption loans ──► CEIC389692117 "Comm & Rural Banks: Loans: Household Consumption: Vehicle" (n=119, M)
    │        demand · +1 · M · last 2026-04 · system vehicle-credit growth → Astra Financial book (DIRECT, currently UNUSED)
    ├── D12 system credit ──► id_bank_credit (aIDLONYAR) · demand +1 · liquidity backdrop
    └── sub-driver: funding cost ──► id_10y (the loan book is bond-funded; rate is the margin) — same parent as auto
```

**Forecast hypothesis (demand).** The **price** leaves (D5 API2 coal, D9 FCPO) and
the **rate parent** are the only demand-side leaves with a credible *lead*; they are
liquid, exogenous, weekly. The CEIC *quantity* prints (D1–D2 Astra units, D7–D8
UNTR activity, D11 vehicle loans) are publication-lagged (~5–7 weeks) and
**coincident-to-lagging** vs the equity — excellent for **attribution** of a move
that already happened, weak for forecasting. This is the standard pattern from
IMPROVEMENT_PLAN §3 and it holds exactly here.

---

## 4. SUPPLY / COST tree

```
ASII SUPPLY / COST
├── AUTO input
│   ├── S1 steel ──► NYMEX:HRC1! (market, n_weekly=800) · cost · sign −1 · LEAD 1–3m · body/chassis input
│   ├── S2 aluminium ──► COMEX:ALI1! (n_weekly=621) · cost · −1 · engine/wheels
│   └── S3 CKD import cost ──► usdidr (FX_IDC:USDIDR) · cost · −1 · imported knocked-down kits priced in USD/JPY
├── HEAVY-EQ / MINING (UNTR is BOTH producer and cost-bearer — sign ambiguity)
│   ├── S4 coal as REVENUE ──► API2 (ICEEUR:ATR1!) · +1 (mine + contractor rate)   ┐ net positive:
│   └── S5 coal/diesel as COST ──► brent (ICEEUR:BRN1!) · −1 (Pamapersada fuel burn) ┘ UNTR is net-long coal,
│        ⇒ net sign on coal price for the UNTR sleeve is +1, but the fuel/diesel leg partially offsets in a coal spike
├── AGRI cost
│   ├── S6 FFB/fertiliser ──► (no clean price; proxy via brent fuel + CEIC fertilizer) · cost · −1
│   └── CPO revenue (D9) net of cost: AALI is net-long CPO ⇒ FCPO sign +1
└── FINANCIAL cost
    └── S7 funding cost ──► id_10y · cost · −1 (rising yield = higher bond-funded liability cost) — convergent with the discount-rate channel
```

**Note on the engine's current kept supply set.** It kept `steel_hrc` (−1, correct
auto-input prior) and two raw **coal-export-value** CEIC series
(`CEICI502587247`, `CEICI365765217`) with **ambiguous/null priors and unstable
signs** (HBA III shows −0.17 at lag 0 but **+0.41 at lead 6m** — the sign literally
inverts with horizon). These export-value prints are noisy and *not* the right UNTR
read; §9 replaces them with **Komatsu units (D7)** and **Pamapersada volume (D8)** —
activity series that map to UNTR's P&L far more cleanly than national coal-export $.

---

## 5. MACRO / RATE / FX / FLOW — the empirical anchor

| Driver | series | role | sign | empirical (engine output) | mechanism |
|---|---|---|---|---|---|
| **id_10y** | `TVC:ID10Y` (n_weekly=798) | macro | **−1** | **pearson −0.43, lead 0m, t −5.28, mv std_beta −0.029 (t −4.65), theory_agree✓, stable✓** | financing-book funding cost + auto-loan affordability + SOTP discount rate — **the dominant, theory-coherent driver** |
| BI 7DRR | `ECONOMICS:IDINTR` | macro | −1 | (policy parent of id_10y) | rate-cut cycle → cheaper installments + re-rating; the market trades cuts as bullish ASII |
| USD/IDR | `FX_IDC:USDIDR` (n_weekly=801) | macro | **0 (net)** | pearson −0.23, p 0.22, **rejected below_gate**, theory_agree✓ | **two-sided**: − for CKD import cost & risk-off flow; + for USD coal/CPO revenue ⇒ net ≈ 0, hence the gate rejection is *correct*, not a miss |
| Real GDP | `aIDGDPAR1` | demand | +1 | anchored, weak | broad domestic backdrop for autos + credit |
| DXY | (empty `TVC:BBDXY`, n=0) | macro | — | unavailable | would proxy EM-flow headwind; **data gap** |

**Read.** The macro block is where the *only* forward content lives, and within it
`id_10y` does ~all the work. The reason the FX prior is rightly **0** here (unusual
vs other baskets) is the sum-of-segments offset: ASII is *both* a USD-revenue
commodity play (coal/CPO, USD+ helps) *and* a USD-cost importer/domestic financier
(USD+ hurts). That cancellation is the structural fingerprint of the whole name.

**Flow.** ASII ≈ 5% of IHSG and a top foreign-owned liquid proxy; foreign
risk-on/off (USD/IDR + bond yield) moves it as a *vehicle* independent of segment
fundamentals — another reason the fundamental drivers wash out and the rate/FX
regime dominates the actual return. `jci` is **deliberately excluded** (the engine
notes it: "ASII is ~5% of IHSG so market beta is circular, not a driver").

---

## 6. Cross-industry linkages — this name IS cross-industry

The whole point of a conglomerate is that its driver set is *other sub-industries'
outputs*. The explicit segment → category map (the deliverable of this section):

| ASII segment | borrows from category | series tags |
|---|---|---|
| Automotive | **Consumer Discretionary / Auto Sales + Auto Production** | `CEICI13834801`, `CEICI13839601`, `CEICI13839901`, `CEICI13840801` |
| Heavy Eq / Mining | **Energy / Coal** + market commodities | `CEICI391910517` (Komatsu), `CEICI391910527/547` (Pamapersada), `ICEEUR:ATR1!`, `CEICI354326367` (HBA) |
| Financial Services | **Banks / Financials** (credit) | `CEIC389692117` (vehicle loans), `aIDLONYAR`, `id_10y` |
| Agribusiness | **Plantation & Agriculture / Palm Oil (CPO)** | `MYX:FCPO1!`, `CBOT:ZL1!` |
| (input costs) | **Basic Materials** (steel) + **Energy** (brent) + FX | `NYMEX:HRC1!`, `COMEX:ALI1!`, `ICEEUR:BRN1!`, `FX_IDC:USDIDR` |

So the Conglomerate model is, by construction, a **weighted re-use of the Auto,
Coal/Machinery, Plantation, and Banks/Multifinance trees** — which is also the
cleanest way to wire it (§9): borrow the *already-validated* leaves from those
files rather than re-discover them in a flat ASII grab-bag.

---

## 7. Currently wired vs available

| Branch | Engine uses NOW (from output JSON) | Available to ADD (confirmed in catalog) | Priority |
|---|---|---|---|
| Auto volume | generic Gaikindo wholesale prints (`CEICI13840801` 1500–3000cc kept; +18 anchored sub-segments) | **`CEICI13834801` PT Astra 4W (n=424)** + **`CEICI13839601` PT Astra 2W (n=425)** — *Astra's own* volumes | **HIGH** |
| Auto retail/income | — | `CEIC412546117` retail 4W (n=184); `CEIC322852002` auto-fuel real retail (n=196) | MED |
| UNTR equipment | — (only coal-export $ prints) | **`CEICI391910517` Komatsu unit sales (n=232)** — direct order book | **HIGH** |
| UNTR coal activity | `CEICI365765217` GDP coal&lignite (Q); export-value prints | **`CEICI391910527` Pamapersada production + `CEICI391910547` overburden (n=232, M)** | **HIGH** |
| Coal price | `CEICI354326367` HBA (kept via ceic); `wb_coal_au`→API2 anchored | already have API2 `ICEEUR:ATR1!` (n_weekly=782) — wire as global, not just CEIC | MED |
| Financing | `id_10y` (kept, anchor) | **`CEIC389692117` vehicle consumption loans (n=119)** | MED |
| Agri | `wb_palm_oil`→FCPO anchored (rejected below_gate) | keep FCPO `MYX:FCPO1!`; small weight | LOW |
| Cost | `steel_hrc` anchored | add `aluminum` (COMEX:ALI1!), `brent` (UNTR diesel/CKD) | LOW |
| Macro | `id_10y` (kept), `usdidr` (rejected, net-0 ✓), `id_gdp_real_q` | BI rate parent of id_10y | LOW |

**Headline:** the three **DIRECT Astra/UNTR segment series** (PT-Astra units,
Komatsu units, Pamapersada volume) are **in the store and currently UNUSED** — the
engine is reading the company through noisy national aggregates when it could read
it through the company's own monthly operating data.

---

## 8. Forecastability — why blended ASII is anti-predictive, and the fix

**The verdict from the OOS backtest (do not over-read, but do not ignore):**
fwd_ic **−0.143**, placebo pctile **0.067**. With n=125 the CI is wide, but being
*below the 7th percentile of the null* is a real signal that the **current posture
forecasts the wrong direction**. Contemporaneous IC is only +0.034 (60th pctile) —
so even as an *explainer* it is mediocre. Three mechanical reasons:

1. **Segment offset (the dominant cause).** demand_tilt −0.17 vs supply_tilt +0.17,
   `model_conflict=true`. UNTR-positive shocks (coal/commodities up) arrive bundled
   with auto/finance-negative shocks (rates/USD up), so the blended monthly return
   nets to noise. A single sign on a portfolio of negatively-correlated limbs is
   structurally low-information.
2. **Sign-flip with horizon.** HBA coal is −0.17 at lag 0 but **+0.41 at lead 6m**;
   auto-wholesale comes in `emp_sign −1` vs `+1` prior. These are not data errors —
   in *return* space, a rate-cut that *boosts* future auto volume **also** re-rates
   the stock *today*, so contemporaneous volume-vs-return correlations invert. The
   flat model can't hold two horizons at once.
3. **Mean reversion + index-vehicle flow.** As a 5%-of-index liquid foreign proxy,
   ASII's short-horizon return is dominated by risk-on/off rotation (rates/FX),
   which mean-reverts; fundamental segment prints don't forecast that.

**What would move it from anti-forecaster to honest signal:**

- **(A) Segment-weighted composite, not equal-weight average.** Build four
  sub-signals — `auto_sig` (Astra units + financing-rate affordability),
  `untr_sig` (API2 coal + Komatsu/Pamapersada activity), `agri_sig` (FCPO),
  `fin_sig` (id_10y funding + vehicle loans) — and combine with the §1 weights
  (auto 0.30, untr 0.40, agri 0.08, fin 0.18, with the rate channel shared). This
  stops the demand/supply tilts from blindly cancelling and lets the *swing*
  segment (UNTR) carry weight when the coal cycle is the live story.
- **(B) Lead the cycle, not the print.** Forecast candidates should be the **liquid
  prices** (API2 coal, FCPO) and the **rate** — the leaves that genuinely lead — and
  treat the Astra/UNTR/loan *quantity* series as **attribution/confirmation** with
  an explicit publication lag, never as the forward signal.
- **(C) Lean on the one thing that works.** `id_10y` is the only driver with
  forward-credible, theory-coherent, stable content (−0.43, t −5.28). An honest
  ASII signal is mostly *"where are IDR rates going, and is the coal cycle
  confirming or fighting it?"* — i.e. up-weight the rate channel, use UNTR coal as
  the conditioning regime, and discount the auto/CPO quantity noise.

**Honesty on n=1.** This is one company. The "basket" framing is a label; there is
no cross-sectional diversification and no member-survivorship benefit. The verdict
should be **presented as a single-stock SOTP read** with low confidence, and the UI
should keep the explicit `model_conflict` flag rather than papering over it with a
NEUTRAL score. The right bar for "success" here is **not** a positive forward IC
(unlikely for a mean-reverting index proxy) but a *coherent attribution* — "this
month ASII moved because rates fell / coal rallied", with the segment that drove it
named.

---

## 9. Engine-wiring spec — concrete `mapping.py`

**Current seed (for reference):**
```python
"Conglomerate": {
    "ceic": [("Consumer Discretionary", "Auto Sales"), ("Energy", "Coal")],
    "ceic_override": [("coal production", "demand", +1),
                      ("mining & quarrying: coal", "demand", +1)],
    "globals": [("bcom", "demand", +1, ...), ("wb_palm_oil", "demand", +1, ...),
                ("steel_hrc", "cost", -1, ...)],
    "macro": [("id_10y", "macro", -1, ...), ("usdidr", "macro", -1, ...),
              ("id_gdp_real_q", "demand", +1, ...)],
},
```

**Proposed seed (segment-aware; adds the direct Astra/UNTR reads, fixes priors):**
```python
"Conglomerate": {   # n=1: ASII SOTP — autos + UNTR/coal + AALI/CPO + Astra Financial
    "ceic": [("Consumer Discretionary", "Auto Sales"),
             ("Consumer Discretionary", "Auto Production"),
             ("Energy", "Coal")],
    # Direct company operating series > national aggregates. Komatsu units &
    # Pamapersada volume are DEMAND for the UNTR sleeve; PT-Astra units are the
    # cleanest auto-volume read. Coal mining ACTIVITY (not export $) is demand.
    "ceic_override": [
        ("pt astra: local", "demand", +1),                 # CEICI13834801/13839601 — Astra 4W/2W units
        ("united tractors (komatsu)", "demand", +1),       # CEICI391910517 — equipment order book
        ("pamapersada", "demand", +1),                     # CEICI391910527/547 — contractor activity
        ("mining & quarrying: coal", "demand", +1),
        ("referred price: coal", "supply", +1),            # CEICI354326367 — HBA = UNTR mine revenue
    ],
    # Drop the noisy national coal-export-VALUE prints that sign-flip with horizon
    # (CEICI502587247 / export-value briquettes) — they are not a clean UNTR read.
    "ceic_exclude": ["export: value: coal", "import: value: coal",
                     "value: coal, coke", "bmw", "nissan", "mazda"],  # luxury marques ≠ Astra
    "globals": [
        ("wb_coal_au", "supply", +1, "API2 coal = UNTR mine revenue + contractor-rate ceiling (LEADS)"),
        ("wb_palm_oil", "supply", +1, "AALI CPO revenue (small weight)"),
        ("steel_hrc", "cost", -1, "auto body/chassis steel input"),
        ("aluminum", "cost", -1, "auto engine/wheel aluminium"),
        ("brent", "cost", -1, "Pamapersada diesel + CKD logistics (partial offset to coal+)"),
    ],
    "macro": [
        ("id_10y", "macro", -1, "ANCHOR: financing-book funding + auto affordability + SOTP discount (corr -0.43, t -5.3)"),
        ("id_bi_rate", "macro", -1, "policy parent of id_10y; rate-cut cycle = bullish ASII"),
        ("usdidr", "macro", 0, "NET-AMBIGUOUS: +USD coal/CPO revenue vs -CKD import/risk-off (let data decide)"),
        ("id_bank_credit", "demand", +1, "system/vehicle credit -> Astra Financial book"),
        ("id_gdp_real_q", "demand", +1, "broad domestic backdrop"),
    ],
},
```

**Beyond the seed (composite — needs a small resolver change, flag for the engine
owner):** the flat `mapping.py` schema averages kept drivers equally. To realise §8(A),
add an optional `segment_weights` block consumed by the scorer so each segment's
sub-signal is z-scored *within segment* then combined by weight
(`auto 0.30, untr 0.40, agri 0.08, fin 0.18, macro-rate shared`). If the schema
can't yet carry weights, the **minimum viable improvement** is the seed above:
swap the noisy aggregates for the three direct Astra/UNTR series, fix the FX prior
to `0`, and keep `id_10y` as the explicit anchor.

**What to backtest (gate the change — keep only if forward IC improves or holds
with a more honest, coherent tree):**
1. Re-run `backtest/bt.py "Conglomerate"` after the seed swap. Expectation:
   forward IC stays weak/negative (n=1 mean-reverting proxy — this is structural),
   but **contemporaneous IC and theory_agree% should rise** as the direct series
   replace sign-flipping aggregates and `model_conflict` softens.
2. Test the **segment-weighted composite** vs the equal-weight average head-to-head;
   keep the composite only if it lifts contemporaneous IC / attribution coherence.
3. Test **`id_10y`-only** as a one-driver benchmark — if the full tree can't beat
   the single rate term on forward IC, that is the honest verdict: report ASII as a
   **rate-regime read conditioned by the coal cycle**, low confidence, with the
   segment attribution as the narrative rather than a forecast.

---
*Series cited exist in `plan/catalog/{idind,id,market}.json`; empirical figures from
`output/industrials_conglomerate.json` + `backtest/results/industrials_conglomerate.json`.
n=1 (ASII) — verdict is one stock's SOTP path, not a cross-sectional basket signal.*
