# Hospitals (Healthcare) — Driver-Tree Plan

> Detail file for `IMPROVEMENT_PLAN.md` §4 · basket `Hospitals` · sector Healthcare ·
> mcap **275T** (3rd-largest sub-industry after Banks and IT Services).
> **Verdict up front:** this is the most honest "macro can't forecast this" case in the
> book. Hospitals are idiosyncratic GROWTH compounders priced off company-specific
> bed-additions, occupancy and case-mix — not off any macro print we hold. The plan
> below builds the full demand/supply/macro tree anyway (for *attribution*), but the
> forecastability section concludes Hospitals should be a **low-confidence /
> attribution basket** whose *only* systematic forward branch is rate-duration
> re-rating — and even that is weaker here than in Pharma.

---

## 1. Snapshot — the basket and the OOS-flat gap

**Members (11 operators, ~275T):** SRAJ (Sejahteraraya/Mayapada), SILO (Siloam),
MIKA (Mitra Keluarga), HEAL (Hermina), CARE (Metro Healthcare), PRAY (Famon
Awal/Primaya), SAME (Sarana Meditama/SamMarie), MTMH (Murni Teguh), BMHS (Bundamedik),
plus smaller listings. **MIKA / SILO / HEAL are the quality compounders** that anchor
basket cap and set the factor; the long tail (SRAJ, CARE, PRAY, SAME, MTMH, BMHS) is
thinner, more volatile, and idiosyncratic.

What they do: own and operate **bed-based hospital networks**. Revenue is generated
per occupied bed-day plus procedure/ancillary income (lab, pharmacy, imaging, surgery).
MIKA skews private-pay / corporate / high case-intensity (best margins); HEAL and SILO
carry heavier **BPJS** (universal-coverage) volume — higher occupancy, thinner per-bed
yield. These are *secular growth* equities: the thesis is bed-count CAGR + occupancy
ramp + case-mix up-trade over a decade, in a country that is structurally under-bedded.

| field | value |
|---|---|
| current grade | **perfected** |
| current confidence | **high** (mislabelled — see gap) |
| kept drivers | **4** (`_state.txt`) |
| current seed (`mapping.py`) | ceic `Healthcare/Hospitals`; macro `id_10y −1`, `id_gdp_real_q +1`, `usdidr −1` |
| **forward OOS IC** | **−0.023** (BACKTEST.md) |
| n_oos | 126 |
| hit-rate vs up-market | **−0.07** (worse than coin-flip directionally) |
| placebo percentile | **0.47** (≈ a random driver set; no edge) |
| flag | **none** (no skill, no anti-skill — just flat) |

**The gap.** Grade says *perfected* and confidence says *high*, but the blindfolded
forward backtest says **−0.02 IC, 0.47 placebo percentile** — i.e. the kept driver
set has *no forward information* about next-period excess return. The label is a
quality-of-fit artefact, not a quality-of-forecast statement. Compare the two other
Healthcare baskets that *do* forecast: **Pharma +0.17** and **Healthcare Equipment
+0.29** — both have a clean exogenous *price* (imported-API USD cost; imported-device
USD cost) plus a defensive-duration handle. Hospitals has neither a traded input price
nor a leading volume series; its single rate handle (`id_10y`) is real but weak. The
honest conclusion (developed in §8) is that **macro posture should not be expected to
forecast Hospitals monthly returns**, and the basket should be reclassified
low-confidence / attribution-only.

---

## 2. Economic structure — how a hospital basket makes money

**The revenue identity.** Hospital revenue decomposes cleanly into three multiplicands,
and *all three are company-controlled, not macro-driven*:

```
Revenue  =  Beds            ×  Occupancy            ×  Revenue-intensity
            (capacity)         (utilisation)           (case mix / yield per bed-day)
         ▲ company capex       ▲ catchment + BPJS      ▲ case acuity, private-pay %,
           bed-additions         referral + brand        ancillary (lab/imaging/surgery)
```

- **Beds (capacity)** — set by the operator's build/acquire pipeline (greenfield
  hospitals, brownfield bed-ramps, M&A). This is the dominant value driver and it is
  *entirely a company decision*, funded by equity/debt. No macro series leads it; it is
  announced in corporate guidance.
- **Occupancy (BOR, bed-occupancy ratio)** — a function of local catchment population,
  referral networks, brand, and **BPJS** patient flow. New hospitals open at low BOR and
  ramp over 3–5 years (the "J-curve"); the basket's earnings are dominated by *where each
  asset sits on its ramp*, which is asset-specific, not macro.
- **Revenue-intensity (case mix)** — the up-trade from low-acuity BPJS admissions to
  high-acuity private-pay procedures (oncology, cardiac, surgery). MIKA's premium vs
  HEAL/SILO's volume model is exactly this axis. Driven by demographics + affluence over
  *years*, not by any monthly print.

**The cost stack.** Largely fixed/structural: specialist-doctor compensation (the
binding constraint — Indonesia has a chronic specialist shortage), nurses/staff,
**imported medical devices and consumables** (USD), drugs (USD-linked APIs), and
facility/energy. The one genuinely macro-sensitive cost line is **FX on imported
devices and drug inputs** — a weak-IDR squeeze on the import-heavy cost base.

**The four structural-growth pillars (why these are growth stocks):**
1. **BPJS universal coverage** — Indonesia's single-payer scheme covers >250m lives;
   it floods occupancy at private hospitals that accept it (volume, low yield). The
   *level* of coverage is now near-saturated; the marginal story is reimbursement-rate
   policy and the BPJS-vs-private mix.
2. **Structural under-bedding** — Indonesia runs **~1.2 hospital beds per 1,000** vs an
   OECD median several times higher. A decade-long catch-up build is the core thesis.
3. **Demographics / aging** — a large, urbanising, slowly-aging population lifts
   admissions and chronic-disease case load over time.
4. **Defensive-quality re-rating on rates** — MIKA/SILO/HEAL are treated by the market
   as *long-duration defensive growth*. When the discount rate (`id_10y` / `us_10y`)
   falls, these high-P/E compounders re-rate up; when rates rise, they de-rate. **This
   is the one branch with a systematic, traded, leading driver.**

**What a sell-side analyst actually watches:** quarterly **bed count**, **BOR
(occupancy)**, **revenue per bed-day / inpatient-day yield**, **BPJS mix %**, **EBITDA
margin per mature vs ramping asset**, and the **new-hospital pipeline**. None of these
is a macro series; all are company disclosures. That single fact is why the macro
engine is structurally blind here.

---

## 3. DEMAND driver tree

Demand for hospital services is overwhelmingly **slow, structural, and non-cyclical**
(healthcare is the textbook defensive — admissions don't track the business cycle).
The series we hold are honest but mostly **annual, publication-lagged, or coincident**
→ good for *attribution*, weak-to-useless for *forecasting*. Every leaf below is tagged
with a forecast hypothesis; almost all are NO-LEAD.

```
DEMAND
├── D1 BPJS coverage & reimbursement  (the volume engine)
│   ├── D1a hospital-services financing (OJK)  → CEICI462441447  (dem,IDR bn, n85, P1M)
│   └── D1b [NO DIRECT BPJS SERIES IN STORE — gap; proxied by D1a + number-of-hospitals]
├── D2 patient volume / admissions  (occupancy proxy)
│   ├── D2a LinkUp hospital company count      → CEICI803874357  (sup,Unit, n435, P7D)
│   └── D2b LinkUp active job postings: hosp.  → CEICI804158347  (sup,Unit, n435, P7D)
├── D3 healthcare price level  (tariff / fee inflation = revenue/unit)
│   ├── D3a CPI: Health                        → CEIC521347917   (—, 2022=100, n41, P1M)
│   └── D3b CPI weight: Hospital Fees          → CEICI523280047  (dem,%, n53, P1M)
├── D4 real income & affordability  (private-pay up-trade)
│   ├── D4a consumer confidence                → id_consumer_confidence → aIDCONIAR (M)
│   └── D4b HH expenditure: Private/Public Hosp→ CEICI261015903 / CEICI261015803 (dem,IDR,n23,P1Y)
├── D5 healthcare-spend share  (structural budget shift)
│   └── D5a HH expenditure urban/rural splits  → CEICI261224603 / 261101103 … (dem,IDR,n23,P1Y)
└── D6 demographics / aging / under-bedding  (the decade thesis)
    ├── D6a Hospital beds per 1000 (World Bank)→ CEICI271671702  (dem,Number, n35, P1Y)
    └── D6b Number of hospitals                → CEICI347663002  (sup,Unit, n30, P1Y)
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **D1a BPJS/financing** | `CEICI462441447` | demand | **+1** | **0** (lag) | OJK financing distribution to hospital services proxies system payment flow. **n85, monthly, but ~4–6m publication-lagged** (last_obs 2025-08 vs now). Coincident-to-lagging → **attribution, not forecast.** |
| **D2a hospital count** | `CEICI803874357` | demand | +1 | **0** | LinkUp company-count of hospitals. Weekly, **n435, near-real-time** (last_obs 2026-05-18) — the *only* high-freq hospital series. But it measures *number of firms*, not occupancy/volume; near-flat, low signal. Weak forecast candidate at best. |
| **D2b job postings (active)** | `CEICI804158347` | demand | +1 | **+1–2?** | Active hospital job postings = a hiring/expansion pulse. Weekly, n435, real-time. *Possible* faint lead on capacity ramp, but noisy and untested; flag as low-confidence experimental. |
| **D3a CPI: Health** | `CEIC521347917` | demand | **+1** | 0 | Health-services price level = fee/tariff inflation = revenue-per-unit. Monthly, **n41 only** (2023→), 2022=100. Clean and timely but **short history** → weak statistical power; coincident. Attribution. |
| **D3b CPI wt: Hospital Fees** | `CEICI523280047` | demand | +1 | 0 | Inpatient hospital-fee CPI weight. Monthly n53. A *weight*, not a price level — near-constant; low information. Drop in favour of D3a. |
| **D4a consumer confidence** | `aIDCONIAR` | demand | +1 | +1 | Confidence/income expectations → discretionary private-pay up-trade (elective procedures). Monthly, deep history, timely. **The only timely macro demand handle** — but elective demand is a small, slow part of the mix → modest. |
| **D4b HH expend: hospital** | `CEICI261015903`/`261015803` | demand | +1 | 0 | Per-capita private/public-hospital spend. **Annual (n23)** → useless for monthly forecasting; pure structural attribution. |
| **D6a beds per 1000** | `CEICI271671702` | demand | +1 | 0 | Under-bedding gap = the multi-year build runway. **Annual (n35)** → thesis backdrop, not a tradable signal. |
| **D6b number of hospitals** | `CEICI347663002` | supply* | +1 | 0 | System hospital count = capacity build. **Annual (n30)**. Structural; *also a supply leaf* (see §4). |

**Sub-driver chain on the top demand driver (D1, BPJS volume):**
`BPJS reimbursement policy → covered-lives × utilisation → hospital occupancy (BOR) →
inpatient revenue → earnings → price`. **We hold none of the leading links** — BPJS
covered-lives and reimbursement-rate decisions are policy events, not series in the
store; the closest proxy (`CEICI462441447`) sits at the *far, lagged* end of the chain.
This is the structural reason the demand tree cannot forecast: the leading nodes are
*administrative/corporate*, and only the *trailing, lagged* nodes are data.

**Honest read on the demand tree:** six branches, all real, but the timely ones
(LinkUp weekly, CPI-Health monthly, consumer confidence monthly) are either
low-information (firm counts), short-history (CPI n41), or weakly relevant (elective
demand is a sliver). The high-information ones (HH spend, beds/1000, BPJS financing)
are **annual or publication-lagged**. **No demand branch is a credible monthly
forecaster.** Net: demand tree = attribution-grade only.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST
├── S1 bed capacity additions  (company capex — the value driver)
│   ├── S1a number of hospitals                → CEICI347663002  (sup,Unit, n30, P1Y)
│   ├── S1b beds per 1000                       → CEICI271671702  (dem,Number, n35, P1Y)
│   └── S1c [bed pipeline = CORPORATE GUIDANCE — not a macro series]  ← the real driver
├── S2 imported medical devices & equipment  (USD cost)
│   ├── S2a imports: medical/surgical furniture→ CEICI580306527  (dem,USD, n156, P1M)
│   ├── S2b imports: hospital-bed furniture     → CEICI...58030… pair (dem,USD, n156, P1M)
│   └── S2c USD/IDR  (the price of all the above)→ usdidr → FX_IDC:USDIDR (D, deep)
├── S3 labour — specialist doctors  (the binding cost constraint)
│   ├── S3a active job postings: hospitals      → CEICI804158347  (sup,Unit, n435, P7D)
│   └── S3b new job postings: hospitals         → CEICI803947177-pair (sup,Unit, n435, P7D)
├── S4 drugs / consumables  (USD-linked input)
│   ├── S4a USD/IDR                             → usdidr (D)  [shared with S2c]
│   └── S4b CPI: Health (input-cost echo)       → CEIC521347917 (n41, P1M)
└── S5 hospital construction / fit-out cost  (build capex inflation)
    └── S5a [no dedicated hospital-construction series; proxy via general construction
             cost / steel — but immaterial to a per-bed-yield model]  ← skip
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **S1a number of hospitals** | `CEICI347663002` | supply | **+1** | 0 | System bed/hospital build = the growth thesis made visible. **Annual (n30)** → backdrop only. The *actual* bed pipeline is corporate guidance, not data — **this is the single biggest driver of the basket and it is unobservable to the engine.** |
| **S2a/b device imports** | `CEICI580306527` (+pair) | cost | **−1** | 0 | USD value of imported medical/surgical furniture & hospital beds = capex-cost proxy. Monthly, **n156, deep, but ~3–4m lagged** (last_obs 2026-02). A *quantity×price* import line — confounds volume and FX. Attribution. |
| **S2c / S4a USD/IDR** | `FX_IDC:USDIDR` | cost | **−1** | **+1** | IDR weakness raises the cost of imported devices, drugs and consumables → margin squeeze. **Daily, deep, exogenous, leading** → the *one cost branch that can actually move ahead of earnings.* But the import-cost share of total cost is modest (labour dominates), so the FX→margin elasticity is small → expect a weak −1, not a strong one. |
| **S3a/b job postings** | `CEICI804158347` (+ new-postings pair) | cost/supply | +1/0 | +1–2? | Hospital hiring pulse = specialist/staff demand and a faint capacity-ramp tell. Weekly, n435, real-time. Sign ambiguous (more hiring = expansion (+) but also rising labour cost (−)). Experimental, low-confidence. |
| **S4b CPI: Health** | `CEIC521347917` | cost | +1 | 0 | Health price index doubles as an input-cost echo (drug/consumable inflation). n41, monthly. Shared with D3a; net sign on the basket ambiguous (revenue + vs cost +). |

**Sub-driver chain on the top supply driver (S1, bed capacity):**
`Discount rate / cost of capital → operator capex decision → new-hospital build (2–3y
lead time) → bed count → occupancy ramp (3–5y) → revenue`. The *only* macro-observable,
leading node in this chain is the **cost of capital (`id_10y` / `us_10y`)** at the very
top — which is *also* the duration-re-rating channel in §5. Everything downstream is
corporate and slow. So the supply tree, like the demand tree, has its single forward
handle at the **rate** node and nowhere else.

**Honest read on the supply/cost tree:** the value-dominant driver (bed pipeline) is
**unobservable** (corporate guidance). The observable cost branches are device/drug
import cost — real (`usdidr` leads) but **small in the cost mix** (labour, not imports,
dominates a hospital P&L). So the supply side, too, is attribution-grade, with USD/IDR
as the lone weak forward leaf.

---

## 5. MACRO / RATE / FX / FLOW

This is where the *only* defensible forward branch lives. Three handles:

| driver | series (RIC) | role | sign | LEAD | mechanism · forecast hypothesis |
|---|---|---|---|---|---|
| **`id_10y`** govt 10Y | `TVC:ID10Y` | macro | **−1** | **+1** | **The one real chance.** MIKA/SILO/HEAL are long-duration defensive-growth equities on premium P/Es; their valuation is rate-elastic. Falling local yields → multiple expansion; rising yields → de-rating. **Daily, deep, exogenous, leading.** This is the systematic branch — but it is *weaker* here than in Pharma (Hospitals carry more idiosyncratic growth noise that swamps the duration signal). |
| **`us_10y`** UST 10Y | `TVC:US10Y` | macro | **−1** | **+1** | **NEW — add.** Global discount rate / EM-growth duration. Indonesian quality-growth defensives co-move with global long rates and the duration trade (same logic that gives Pharma +0.17 and Healthcare-Eq +0.29 their `us_10y`/duration handles). Daily, deep, leading. Best single addition. |
| **`usdidr`** | `FX_IDC:USDIDR` | macro | **−1** | +1 | Twofold negative: (i) cost of imported devices/drugs (§4), (ii) risk-off / EM-outflow proxy that pressures premium-multiple defensives. Daily, deep, leading — but small elasticity. |
| **`id_gdp_real_q`** | `aIDGDPAR1` | demand | +1 | 0 | Domestic-demand backdrop / affluence → private-pay up-trade. **Quarterly, lagged, low-frequency** — keep as a weak structural prior, *do not* expect forecast skill. |

**Flow note.** Hospitals are crowded, high-quality, foreign-favoured names; in EM risk-off
(`usdidr`↑, `dxy`↑, `us_10y`↑) they de-rate with the broader defensive-growth complex.
That correlation is real but is *already captured* by the `us_10y` / `usdidr` handles
above; adding `dxy` separately would mostly double-count the same risk-off factor and
risk multiple-testing inflation — **skip `dxy`** unless the backtest shows it adds
orthogonal information.

**The macro verdict:** of all five tree sections, **only `id_10y` + `us_10y`
(duration)** is a candidate forward branch. The FX leaf is a weak secondary. Everything
else is structural/attribution.

---

## 6. Cross-industry linkages

| linked sub-industry | borrowed series | direction | rationale |
|---|---|---|---|
| **Pharma** (Healthcare, +0.17) | `id_10y` / `us_10y` duration; `usdidr` (imported APIs) | shared factor | Hospitals and Pharma share the **defensive-duration** factor and **imported-USD-input** cost. Pharma's *cleaner* signal (a single dominant USD-API cost line) is exactly what Hospitals lacks. Hospitals can borrow the duration handle but cannot replicate Pharma's clean cost driver. |
| **Healthcare Equipment** (+0.29) | `CEICI580306527` device imports; `usdidr` | shared cost / mirror | Healthcare-Equipment's forecast skill comes from the **imported-device USD price** being its *revenue*. For Hospitals the same series is a small *cost*. The device-import line is the natural cross-link, but it drives Hospitals only weakly (capex, not opex). |
| **Healthcare Services** (−0.03) | patient-volume / utilisation proxies | sibling | Same idiosyncratic, macro-flat profile as Hospitals (also OOS ≈ 0). Confirms the *whole hospital/services cluster* is attribution-grade; only Pharma and Equipment in Healthcare actually forecast. |
| **Banks / Multifinance** | `CEICI462441447` (OJK hospital-services financing) | upstream | Hospital-services consumer financing originates in the banking system; the OJK series is effectively a banking-block leaf re-used here as a (lagged) demand proxy. |

---

## 7. Currently wired vs available

| status | driver | series (RIC) | role/sign | note |
|---|---|---|---|---|
| **WIRED now** | ceic Healthcare/Hospitals block | (auto from category) | mixed | the 18 demand + supply Hospital series, mostly annual/lagged → contribute noise, not skill |
| **WIRED now** | `id_10y` | `TVC:ID10Y` | macro −1 | **keep — the core branch** |
| **WIRED now** | `id_gdp_real_q` | `aIDGDPAR1` | demand +1 | keep as weak structural prior |
| **WIRED now** | `usdidr` | `FX_IDC:USDIDR` | macro −1 | keep — weak FX/risk-off leaf |
| **ADD (priority 1)** | `us_10y` | `TVC:US10Y` | macro −1 | global duration handle — the single best candidate to lift a flat IC |
| **ADD (priority 2)** | `id_consumer_confidence` | `aIDCONIAR` | demand +1 | only timely macro *demand* handle (private-pay up-trade); modest |
| **ADD (priority 3, experimental)** | LinkUp active job postings | `CEICI804158347` | demand +1 | only high-freq hospital series; low signal, test then likely drop |
| **CONSIDER** | CPI: Health | `CEIC521347917` | demand +1 | timely but n41 short; revenue/cost sign ambiguous |
| **CONSIDER (lagged)** | OJK hospital-services financing | `CEICI462441447` | demand +1 | best BPJS-flow proxy, but ~5m publication lag → attribution |
| **SKIP** | `dxy` | `TVC:BBDXY` | — | double-counts the `us_10y`/`usdidr` risk-off factor; multiple-testing risk |
| **SKIP** | beds/1000, HH-expenditure, number-of-hospitals | annual RICs | — | annual → zero monthly-forecast value; structural backdrop only |
| **UNAVAILABLE (the real drivers)** | bed pipeline · BOR/occupancy · case-mix · BPJS reimbursement rate | — | **company guidance / policy — not series.** This is the crux of the gap. |

---

## 8. Forecastability — the honest verdict

**Hospitals should be a low-confidence / attribution basket.** Here is the chain of
reasoning, tied to the backtest:

1. **The value drivers are unobservable.** Revenue = Beds × Occupancy × Case-mix, and
   all three are *company-specific corporate decisions and ramps*, not macro series. The
   engine literally cannot see the variables that move these stocks. (§2, §4.)
2. **The observable demand series don't lead.** They are annual (HH spend, beds/1000),
   publication-lagged (OJK financing ~5m), short-history (CPI-Health n41), or
   low-information (LinkUp firm counts). No demand branch is a monthly forecaster. (§3.)
3. **The observable cost series are small and confounded.** Imported device/drug cost is
   FX-leading but a minor slice of a labour-dominated P&L; the import-value series mix
   volume with price. Weak. (§4.)
4. **The backtest confirms it.** Forward IC **−0.023**, hit-rate vs up-market **−0.07**,
   placebo percentile **0.47** over **n_oos 126** — statistically indistinguishable from
   a random driver set. The "perfected/high-confidence" label is a fit artefact and is
   **misleading**; it should read low-confidence.
5. **The one systematic branch is rate-duration.** `id_10y` (wired) + `us_10y` (to add)
   capture the defensive-growth multiple re-rating that genuinely co-moves with these
   premium-P/E compounders. This is the *only* mechanism with a leading, exogenous,
   traded series. **But it is weaker here than in Pharma** — Hospitals carry more
   idiosyncratic bed-ramp/occupancy noise that drowns the duration beta, which is why
   Pharma prints +0.17 and Hospitals prints ≈0 on essentially the same duration logic.

**What (if anything) would give forward skill:**
- **Adding `us_10y`** is the highest-probability lever to move IC from −0.02 toward a
  small positive — it is the clean version of the handle the basket is already trying to
  use via `id_10y`. Test it; keep only if forward IC improves.
- **A real occupancy/BOR or quarterly-bed-count feed** would be transformative — but it
  does not exist in the store and would require new corporate-disclosure ingestion. Until
  then, the ceiling is low.
- **Confidence ceiling: LOW.** Even a successful `us_10y` add should be expected to
  produce a *small* positive IC (duration beta on a noisy growth basket), not the
  +0.17/+0.29 of Pharma/Equipment. **Do not promote this basket to high-confidence on
  any in-sample improvement.**

**Recommendation:** reclassify Hospitals as **attribution / low-confidence**; present its
macro read as "duration-sensitive defensive growth, otherwise idiosyncratic," and lean on
the LBC analysts' company-level bed/occupancy work — not the engine — for the actual call.

---

## 9. Engine-wiring spec (`mapping.py`)

Concrete, minimal, backtest-gated change to the `"Hospitals"` SEED. Keep the change
small and *honest* — this basket's job is clean attribution, not invented skill.

```python
"Hospitals": {
    "ceic": [("Healthcare", "Hospitals")],
    # Drop the annual/structural noise that dilutes the signal: keep the block but
    # let the data-quality gate cull the P1Y series (HH-expenditure, beds/1000,
    # number-of-hospitals) which cannot forecast a monthly return. Exclude the
    # near-constant CPI-weight leaf explicitly.
    "ceic_exclude": ["cpi weight: hospital fees", "beds: per 1000",
                     "average monthly expenditure"],
    # OPTIONAL experimental: treat the weekly LinkUp hiring pulse as a faint demand/
    # ramp lead — test, expect to drop.
    # "ceic_override": [("job postings (active): hospitals", "demand", +1)],
    "globals": [],
    "macro": [
        ("id_10y",  "macro",  -1, "defensive-growth (MIKA/SILO/HEAL) duration re-rating — core branch"),
        ("us_10y",  "macro",  -1, "ADD: global duration/discount-rate handle (cleanest forward leaf)"),
        ("usdidr",  "macro",  -1, "imported device/drug cost + EM risk-off on premium multiples"),
        ("id_consumer_confidence", "demand", +1, "ADD: only timely demand handle — private-pay up-trade (modest)"),
        ("id_gdp_real_q", "demand", +1, "weak structural domestic-demand prior (quarterly, lagged)"),
    ],
},
```

**Resolvers already present** (no new GLOBAL_CORR work needed): `id_10y → TVC:ID10Y`,
`us_10y → TVC:US10Y`, `usdidr → FX_IDC:USDIDR`, `id_consumer_confidence → aIDCONIAR`,
`id_gdp_real_q → aIDGDPAR1` — all live in `GLOBAL_CORR`.

**What to backtest (and the keep-rule):**
1. Baseline = current seed (`id_10y`, `id_gdp_real_q`, `usdidr`) → IC −0.02 (reproduce).
2. **+`us_10y`** alone → the key experiment. Keep iff forward IC improves and placebo
   percentile rises meaningfully above 0.50.
3. +`id_consumer_confidence` → keep only if it adds orthogonal forward signal (it likely
   won't move the needle).
4. ceic P1Y-cull + CPI-weight exclude → expect IC to *hold or tick up* by removing noise;
   keep iff non-degrading.
5. Run `backtest/bt.py "Hospitals"` after each; **never keep an in-sample-only gain.**

**Honest confidence ceiling: LOW.** Target a *small* positive forward IC via the
`us_10y` duration handle; treat anything beyond that as overfitting. Relabel grade/conf
to reflect attribution-grade, not "perfected/high." The genuine forecasting in Healthcare
lives in **Pharma** and **Healthcare Equipment** (clean USD price drivers); Hospitals is
the basket where we concede macro can't forecast and say so plainly.

---
*Series cited exist in `plan/catalog/idind.json` (Healthcare/Hospitals), `plan/catalog/id.json`
(CPI Health `CEIC521347917`), and `mapping.py::GLOBAL_CORR`. Backtest figures from `BACKTEST.md`
(Hospitals: fwd IC −0.02, n_oos 126, placebo 0.47).*
