# Services (Industrial / Commercial Services, Industrials) — Deep Driver-Tree Plan

> `basket_id: industrials_services` · sector **Industrials** · priority 49 ·
> mcap **~2.42T** · **n_members = 4 (only 2 used)** · grade **partial** · kept **4** ·
> **forward OOS IC −0.06 (placebo 22nd pctile), hit−up −0.03, long-short +2.4%/mo
> (noise), fwd_pearson +0.003, flag: none.** Contemporaneous-ref IC **−0.026 (placebo
> 37th pctile)** — i.e. the kept set is a **poor forecaster AND a poor contemporaneous
> explainer**.
>
> This is the IDX **"Services / commercial-and-industrial-services" residual bucket** —
> a tiny grab-bag of **four unrelated micro-caps**: document/records outsourcing (MFMI),
> security-guard outsourcing (SOSS), and two testing-inspection-certification ("TIC")
> surveyors (MUTU, CRSN). They share a *taxonomy label* ("Services, Industrials"), not an
> economic factor. The honest purpose of this file is to (1) name what each constituent
> SHOULD respond to, (2) show that the current seed feeds it the **wrong tree** (the
> Industrials & Manufacturing **machinery/metals FDI/DDI** block — capex prints that have
> nothing to do with labour-services contract revenue), (3) build the *correct* labour /
> corporate-services driver tree from the real series we hold (GDP business-services,
> the **Services Business-Tendency Survey**, wages, minimum wage, employment, confidence),
> and (4) concede up front, with the backtest as evidence, that **this is an idiosyncratic
> attribution/beta basket with no coherent macro driver and no forward skill** — the right
> deliverable is a clean, theory-honest attribution, not a forecast.

---

## 1. Snapshot — the basket, and why it is a residual bucket

**Members (from `state/worklist.json`; weekly obs from `catalog/market.json`):**

| RIC | Name | mcap (T) | β (vs basket) | w_obs | what it actually IS |
|---|---|---|---|---|---|
| `IDX:MFMI` | **Multifiling Mitra Indonesia** | **0.98** | 0.046 | **793** | **document & records-management outsourcing** — physical/digital archival, BPO storage. Catalog mis-tags it "Multifinance & Leasing". Near-zero β → barely moves with anything. |
| `IDX:SOSS` | **Shield-On-Service (SOSS)** | **0.78** | n/a | **388** | **security-guard / manpower outsourcing** — outsourced security personnel, facility services. Pure labour-supply contract revenue. |
| `IDX:MUTU` | Mutuagung Lestari | 0.34 | 0.535 | **0 (absent)** | **TIC** — testing, inspection & certification (sustainability/ISPO/forestry/lab). B2B compliance services. |
| `IDX:CRSN` | Carsurin | 0.31 | 0.441 | **0 (absent)** | **TIC surveyor** — cargo/commodity inspection, marine survey, lab testing. B2B trade-services. |

**The basket the engine actually scores is two names.** `output/industrials_services.json`
reports `n_used = 2` (`members_used: ["MFMI","SOSS"]`): **MUTU and CRSN are not in the
price store at all** (`weekly_obs 0`, absent from `market.json`) — both are recent IPOs
with no usable deep history. So an "equal-weight Services basket" is, in practice, an
equal blend of **a records-management micro-cap (MFMI, β 0.046) and a security-outsourcer
(SOSS)** — two firms whose revenue drivers (corporate archival contracts vs guard-manpower
contracts) have essentially nothing in common, and one of which (MFMI) is so low-beta it is
nearly a flat line. There is **no single economic factor** linking archival storage,
security manpower, sustainability certification, and cargo inspection except the residual
label "industrial/commercial services."

**Current kept-driver set (`output/industrials_services.json`, 4 kept):**

| key | role | label | best_lag | corr@best | ic | emp_sign | theory_agree |
|---|---|---|---|---|---|---|---|
| `CEICI410108537` | demand | DDI: Basic metals & metal goods | 1m | −0.380 | −0.341 | +1 | true |
| `CEICI410108517` | demand | FDI: Machinery & electronics | 1m | +0.229 | +0.216 | −1 | **false** |
| `CEICI323568602` | supply | Mfg: Machinery and Equipments | 0m | +0.136 | +0.023 | +1 | none |
| `CEICI410108507` | demand | FDI: Basic metals & metal goods | 6m | +0.222 | +0.157 | −1 | **false** |

Every kept driver is a **machinery/metals capital-investment print** (foreign/domestic
direct investment in basic metals & machinery, machinery manufacturing output). These come
straight from the seed's `("Industrials & Manufacturing", None)` scope. **Not one describes
the demand for outsourced security guards, document archival, or certification audits.**
Two of the four are kept with `theory_agree=false` (the engine flipped the sign), and the
strongest (`CEICI410108537`, |ic| 0.34) is a **spurious −0.38 correlation** on n=60
quarterly points — a classic small-n overfit. The current `mapping.py` seed:

```python
"Services": {
    "ceic": [("Industrials & Manufacturing", None)],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "B2B services demand")],
},
```

**The gap, stated precisely.** The seed has *one* defensible leaf (`id_gdp_real_q`, +1) and
otherwise pours **220 CEIC manufacturing candidates** (machinery, metals, electronics,
paper, furniture capex/output) at a basket whose revenue is **labour-hours and audit-fees,
not factory output.** The model output confirms incoherence: verdict **NEUTRAL [47/100, low
conf]**, `confidence.score 24`, `theory_agree 33%`, `max|corr| 0.15`, `multivariate:
available=false` ("too_few_independent_monthly_drivers"), grade-reasons literally list
*"no theory-anchored significant driver"*, *"theory-incoherent kept set (agree=33%)"*,
*"data-limited basket"*. The −0.06 forward IC at the 22nd placebo percentile is the
signature of a **mis-specified tree mapped onto a near-random 2-name micro-cap blend.**

---

## 2. Economic structure — how the (real) businesses make money

These are **B2B contract-services** firms. There is **no commodity, no factory, no
price × volume of a physical good.** The unifying revenue identity across the four is a
labour/contract one:

```
Revenue       =  Σ contracts × (contract value)          (corporate demand for the service)
Gross profit  =  Revenue − direct labour cost − consumables
Margin swing  =  driven by  labour cost per head (wages, minimum wage)  vs  contract repricing power
```

Decomposed by constituent (what each SHOULD respond to):

**(a) SOSS — security/manpower outsourcing (cost-plus labour).** Revenue = number of guards
deployed × billing rate per guard-month. **~70–80% of cost is wages.** The economics are a
thin cost-plus spread: corporate clients outsource security to convert a fixed headcount
into a variable contract; SOSS earns the management margin on top of pass-through labour.
**Demand** ← corporate activity / number of facilities to guard (GDP, business confidence,
formal-sector employment). **Cost / margin** ← the **minimum wage** (guards are paid at/near
UMP/UMR; a min-wage hike raises cost *immediately* but contracts reprice with a lag → a
min-wage shock is a **margin squeeze**, sign −1 on the equity until repriced). This is the
single cleanest economic story in the basket.

**(b) MFMI — document/records-management outsourcing (operating-leverage on stored volume).**
Revenue = cumulative boxes/records under management × storage-and-retrieval fee + digitisation
projects. Demand is **sticky and recurring** (archives don't leave) ← growth in corporate &
regulated-sector paperwork (banks, insurers, hospitals — compliance-driven retention). This is
why MFMI's β is ~0.046: its revenue base is an annuity nearly **decoupled from the macro
cycle.** It SHOULD respond weakly to formal-sector / financial-sector expansion, almost not at
all to the commodity or rate cycle.

**(c) MUTU & CRSN — TIC / surveyor (fee-per-audit, trade-linked).** Revenue = number of
inspection/certification jobs × fee. Demand ← **trade and commodity flows** (CRSN inspects
cargo — coal/CPO/mineral shipments; its demand tracks **export volume**) and ←
**regulation-driven certification** (MUTU: ISPO/sustainability/forestry audits — demand rises
with palm/forestry compliance mandates). These two have the most *macro-legible* demand
(export volume, commodity throughput), but **neither is in the price store**, so they
contribute **zero** to the scored basket.

**What a sell-side analyst watches:** (1) **contract wins / order book** (guard headcount for
SOSS, boxes-under-management for MFMI, certification scope for MUTU/CRSN) — firm-specific,
not in any macro series; (2) **wage / minimum-wage trajectory** (the margin swing for SOSS);
(3) **formal-sector employment & business confidence** (corporate appetite to outsource);
(4) for the TIC pair, **export & commodity-throughput volume**. Items (2)–(4) have real
macro series; item (1) — the thing that actually moves these micro-caps — does not.

**Intra-basket dispersion (the core problem).** A single sign prior is meaningless for a set
whose betas span **0.046 (MFMI) to 0.535 (MUTU)** and whose demand drivers are *orthogonal*
(archival annuity vs guard headcount vs trade-linked audits). Equal-weighting averages an
annuity, a labour cost-plus, and two (absent) trade-services firms — washing out whatever
faint signal each has. This is a **residual taxonomy bucket**, not an economic sector.

---

## 3. DEMAND driver tree (corporate demand for outsourced services)

> Sign = a-priori on the basket's excess return. LEAD = expected months the series moves
> *before* the equities. **No leaf here is a liquid price** — every candidate is a slow,
> publication-lagged CEIC quantity/survey print, so the whole tree is **attribution-grade
> at best**, with the *survey/expectations* leaves the only ones with any forward claim.

```
DEMAND  (= corporate appetite to buy outsourced services)
├── D1  B2B / corporate activity backdrop  (all four names; the only shared factor)   [CORE — but coincident/lagging]
│   ├── D1a  Real GDP YoY ............... id_gdp_real_q → aIDGDPAR1 (corr, live) — WIRED +1
│   │         role demand · sign +1 · LEAD ~0 · quarterly, pub-lagged → ATTRIBUTION (the one defensible kept driver)
│   ├── D1b  GDP: Business Services VA ... CEIC365752127 (id, n73, P3M) — NOT in seed
│   │         demand · +1 · LEAD ~0 · the literal sectoral GVA of business services; coincident, id-plane (resolver gap, §7)
│   └── D1c  GDP: Other Services VA ...... CEIC365752167 (id, n73, P3M) — covers personal/commercial services
│             demand · +1 · LEAD ~0 · same caveat as D1b
├── D2  BUSINESS-TENDENCY survey — Services sector  (the best-matched series in the whole inventory)   [SURVEY — forward-ish]
│   ├── D2a  Services: SA: Confidence Indicator .... CEIC460128567 (id, n97, P3M) — NOT in seed
│   │         demand · +1 · LEAD 1q · service-sector firms' own confidence → their hiring of outsourced services
│   └── D2b  Services: SA: Employment Future Tendency  CEIC459581817 (id, n97, P3M) — NOT in seed
│             demand · +1 · LEAD 1q · expected service-sector hiring; the closest proxy to "demand for SOSS guards / MFMI archival"
├── D3  FORMAL-SECTOR employment & confidence  (corporate scale → outsourcing need)   [slow, lagging]
│   ├── D3a  Consumer Confidence: Expected Business Condition  CEIC277373202 (id, n196, P1M)
│   │         demand · +1 · LEAD 1-2q · broad business optimism; monthly so timelier than GDP
│   ├── D3b  Employment: Community/social/personal services  aIDEMPSNPS (id, P1Y) — annual, too coarse
│   │         demand · +1 · LEAD ~0 · the services-sector headcount itself; ATTRIBUTION only (annual)
│   └── D3c  Manufacturing PMI ........... id_pmi → aIDPMIMAQ (corr) / CEIC398244437 (n36)
│             demand · +1 · LEAD 1-2m · monthly activity pulse; weak link to labour-services but the timeliest activity print
├── D4  TRADE / commodity throughput  (MUTU/CRSN TIC demand — but those names are ABSENT)   [cross-industry; near-dead for scored basket]
│   ├── D4a  Exports YoY ................. id_exports → aIDEXGAR (corr) — NOT in seed
│   │         demand · +1 · LEAD 0-1m · cargo-inspection volume (CRSN) tracks export throughput; only matters if CRSN re-enters the store
│   └── D4b  CPO / coal export volume .... (Plantation/Energy blocks) — TIC audits of palm/coal shipments
│             demand · +1 · the genuine MUTU/CRSN driver — but un-scorable while those two have w_obs=0
└── D5  FINANCIAL / regulated-sector growth  (MFMI archival demand)   [annuity driver]
    └── D5a  Bank credit / working-capital loans  CEIC481151397 (id, n139) or id_bank_credit→aIDLONYAR (corr)
              demand · +1 · LEAD ~0 · more regulated corporate activity → more compliance paperwork → MFMI boxes; weak, second-order
```

**Forecast hypothesis (demand).** The only leaves with even a *weak* forward claim are the
**Services Business-Tendency Survey (D2a/D2b)** and **Expected-Business-Condition (D3a)** —
because *expectations* surveys are forward-looking by construction and lead realised hiring of
outsourced services by ~1 quarter. **But all of D1–D5 are slow CEIC prints (quarterly/annual,
publication-lagged), not liquid prices**, so the master-plan rule applies: *quantity/survey
prints are coincident/lagging → good for attribution, weak for forecasting.* The honest
expectation is that even the best-matched demand leaf (D2) yields **attribution coherence**,
not a tradable lead. The trade-linked leaves (D4) — the most macro-legible — are dead for the
scored basket because the TIC names carry no price history.

---

## 4. SUPPLY / COST driver tree (labour cost is the whole story)

For a labour-services basket there is **no commodity input and no physical output.** The
"supply/cost" side is almost entirely **the wage bill** — and the single most economically
correct driver in this entire file is the **minimum wage** as a margin headwind for SOSS.

```
SUPPLY / COST  (= the labour cost stack; margin = repricing power − wage growth)
├── S1  LABOUR COST  (the margin swing factor — SOSS especially)   [CORE COST — but annual, coarse]
│   ├── S1a  Monthly Minimum Wage: Average  CEIC303317302 (id, n36, P1Y) — NOT in seed
│   │         role cost · sign −1 · LEAD 0-2q · guards billed at/near UMP; a min-wage hike raises cost before contracts reprice → margin squeeze
│   ├── S1b  Monthly Average Wage .......... CEIC13803301 (id, n34, P1Y)
│   │         cost · −1 · LEAD 0-2q · economy-wide wage level; the manpower cost base for SOSS/MFMI
│   └── S1c  Monthly average wage, manufacturing  aIDMNAVWGMF (id, P6M) — semi-annual proxy
│             cost · −1 · coarse; a wage-pressure proxy where annual UMP is too stale
├── S2  REPRICING POWER  (the offset to S1 — endogenous, no clean series)   [margin, un-seriesable]
│   └── = contract-renewal cadence vs wage inflation. When CPI/wages run hot, cost-plus contracts
│         lag and margin compresses; this is the SOSS margin mechanism. No exogenous series → narrative only.
├── S3  CONSUMABLES / overhead  (second-order)   [minor]
│   └── id_cpi_yoy → ECONOMICS:IDIRYY (corr) · cost · −1 · general input/overhead inflation (uniforms, fuel for patrols, paper for MFMI)
└── S4  CAPACITY / supply of labour  (loose)   [structural]
    └── Labour Force Participation / Employment (id, P1Y, n42-43) — supply of guards/clerks; abundant → no scarcity premium. Attribution only.
```

**The margin mechanism, made explicit.** SOSS (and to a lesser extent MFMI) is a **labour
cost-plus** model: revenue passes through wages with a management spread. The **minimum wage
(S1a)** is therefore the cleanest *cost* driver in the basket — a UMP hike (set annually by
provincial governments, often politically driven) raises the cost base *immediately* while
billing contracts reprice on renewal (a 1–2 quarter lag), so a min-wage shock is a transient
**margin squeeze (sign −1)** on the equity. This is the one place where the theory is crisp.
**But the data quality is poor**: minimum/average wage prints are **annual (n34–36)**, far too
coarse for a monthly-return engine, and id-plane (resolver gap, §7). So even the *correct*
cost driver is, in practice, **un-actionable at the engine's frequency** — a structural reason
the basket cannot be a forecaster.

**Endogeneity / exclusions.** Repricing power (S2) is endogenous to the firms' own contracts —
narrative only, no driver. The basket's own output level (guard-months, boxes under management)
is the dependent variable — exclude. The machinery/metals capex prints the engine currently
keeps (§1) are **not this basket's cost at all** and must be removed (§9).

---

## 5. MACRO / RATE / FX / FLOW — thin, mostly beta

A domestic labour-services micro-cap basket has **little genuine macro sensitivity**: no USD
revenue, no commodity cost, no rate-sensitive duration asset. The macro branch is mostly
**small-cap market beta and risk appetite**, which is exactly what makes the engine's verdict a
*beta read* rather than a fundamental forecast.

```
MACRO / RATE / FX / FLOW
├── M1  Domestic activity / discount rate   [thin fundamental link]
│   ├── id_gdp_real_q → aIDGDPAR1 — WIRED +1 (also D1a) · the legitimate macro-demand backdrop
│   └── id_bi_rate → ECONOMICS:IDINTR · macro · sign ~0/−1 · expansion-financing cost for client capex; weak, ambiguous for asset-light services
├── M2  Inflation regime   [cost overlay]
│   └── id_cpi_yoy → ECONOMICS:IDIRYY · macro/cost · −1 · feeds wages (S1) and consumables (S3); the wage-pass-through channel
├── M3  FX   [near-irrelevant]
│   └── usdidr → FX_IDC:USDIDR · macro · ~0 · these firms are IDR-revenue, IDR-cost domestic services → essentially NO FX exposure (do NOT force a sign)
└── M4  Small-cap risk appetite / liquidity   [the dominant non-fundamental factor — but CIRCULAR]
    └── jci = IDX:COMPOSITE (BENCHMARK) — illiquid micro-caps drift with small-cap risk-on/off.
          This is MARKET BETA, NOT a driver. jci is the engine benchmark and must NEVER be wired (see §6).
```

**The honest read on macro.** The only defensible macro leaf is **GDP (M1)** as the
corporate-activity backdrop, and it is already wired. **USD/IDR is genuinely ~irrelevant** here
(unlike exporters) — these are IDR-in, IDR-out domestic services — so it should carry **sign 0**
or be omitted, not forced negative. The variance that actually dominates these micro-caps'
monthly returns is **idiosyncratic (contract wins, IPO-related flows, free-float liquidity) plus
small-cap beta** — neither of which is a forecastable fundamental driver. That is the structural
reason the macro branch cannot rescue this basket.

---

## 6. Cross-industry linkages — borrowed trees (mostly for the absent TIC names)

The few macro-legible drivers in this basket are *other sub-industries' outputs*:

| Service sleeve | borrows from category | series tags |
|---|---|---|
| **TIC / cargo inspection** (CRSN) | **Trade / Energy / Plantation** | `id_exports` (aIDEXGAR); coal & CPO **export volume** from the Energy/Plantation blocks — the genuine inspection-demand driver |
| **Sustainability certification** (MUTU) | **Plantation & Agriculture** | palm/forestry output & ISPO compliance — audit-scope demand |
| **Records mgmt** (MFMI) | **Financials (Banks/Insurance)** | `id_bank_credit` (aIDLONYAR), working-capital loans `CEIC481151397` — regulated-sector paperwork growth |
| **Security manpower** (SOSS) | **Labour / Wages macro** | minimum wage `CEIC303317302`, average wage `CEIC13803301` (cost); GDP/PMI (demand) |
| Activity backdrop (all) | **macro** | `id_gdp_real_q`, Services BTS `CEIC460128567`/`CEIC459581817` |

**The cruel irony:** the **most macro-legible** linkage (CRSN's cargo-inspection demand ←
export/commodity throughput) belongs to a name with **zero price history**, so it cannot be
scored. The names that *are* scored (MFMI, SOSS) have the **least** macro-legible drivers (an
archival annuity and a labour cost-plus). This mismatch is intrinsic to the basket.

**JCI is NEVER a legitimate driver.** The members are IDX constituents; any reliance on `jci`
is circular small-cap beta — the engine benchmark, excluded by design. It is *not* currently in
the kept set here (the engine kept manufacturing prints instead), which is its own kind of
wrong, but the §9 rebuild must not introduce `jci` to manufacture fit.

---

## 7. Currently wired vs available (the "what we COULD add")

| Driver | Series (RIC) | n_obs / freq | plane / reachable? | wired now? | priority |
|---|---|---|---|---|---|
| Real GDP | `aIDGDPAR1` (`id_gdp_real_q`) | live, Q | macro (corr) | ✅ +1 | **keep** — the one defensible leaf (attribution) |
| **Machinery/metals FDI/DDI** | `CEICI410108537/517/507` | 60, Q | CEIC (industry) | **✅ kept (BUG)** | **REMOVE — wrong sub-industry; capex ≠ labour-services demand; 2 kept with wrong sign** |
| **Mfg: Machinery & Equipment** | `CEICI323568602` | 60, Q | CEIC (industry) | **✅ kept (BUG)** | **REMOVE — factory output, irrelevant** |
| **Services BTS: Confidence** | `CEIC460128567` | 97, Q | id-plane | ❌ | **HIGH — best-matched series in the inventory (demand)** |
| **Services BTS: Empl. Future Tendency** | `CEIC459581817` | 97, Q | id-plane | ❌ | **HIGH — forward-ish proxy for outsourced-hiring demand** |
| GDP: Business Services VA | `CEIC365752127` | 73, Q | id-plane | ❌ | MED — literal sectoral GVA (attribution) |
| GDP: Other Services VA | `CEIC365752167` | 73, Q | id-plane | ❌ | MED — covers personal/commercial services |
| **Minimum Wage: Average** | `CEIC303317302` | 36, P1Y | id-plane | ❌ | **MED (cost, theory-clean) — but ANNUAL → too coarse for monthly engine** |
| Average Wage | `CEIC13803301` | 34, P1Y | id-plane | ❌ | LOW — annual, coarse |
| Expected Business Condition (CCI) | `CEIC277373202` | 196, P1M | id-plane | ❌ | MED — monthly, timelier confidence proxy |
| Exports YoY | `aIDEXGAR` (`id_exports`) | live, M | macro (corr) | ❌ | MED — CRSN cargo-inspection demand (only if TIC names re-enter store) |
| Manufacturing PMI | `aIDPMIMAQ` (`id_pmi`) | live, M | macro (corr) | ❌ | LOW — timeliest activity pulse, weak link to labour services |
| Bank credit / WC loans | `aIDLONYAR` / `CEIC481151397` | live / 139 | macro / id | ❌ | LOW — MFMI archival-demand annuity, second-order |
| id_cpi_yoy | `ECONOMICS:IDIRYY` | live, M | macro (corr) | ❌ | LOW — wage-pass-through / consumables overlay |
| usdidr | `FX_IDC:USDIDR` | w801 | macro (corr) | ❌ | **sign 0 — near-irrelevant for IDR-in/IDR-out domestic services; do NOT force −1** |

**The category-error problem (critical for §9).** `ceic: [("Industrials & Manufacturing",
None)]` feeds **220 manufacturing-capex candidates** to a basket that sells labour-hours and
audit-fees. With no labour/services driver available *on the industry plane*, the engine latches
onto whatever clears the gate on 60 quarterly points — machinery/metals FDI prints, two of them
with a flipped sign (`theory_agree=false`). The fix is twofold: **(1) drop the manufacturing
CEIC scope** (structurally irrelevant), and **(2) add the labour/services tree** — Services BTS
+ GDP-business-services (demand) and minimum/average wage (cost).

**RESOLVER-PLANE CAVEAT (the binding constraint, flag for the engine owner).** The
high-value additions (Services BTS, GDP-business-services VA, minimum wage, CCI sub-indices) are
**id-plane series** (`CEIC…`/`aID…`), and the engine currently resolves driver candidates only
via (a) `GLOBAL_CORR` keys → `correlation.sqlite`, and (b) the curated `corr:`-mapped macro keys
in `GLOBAL_CORR` (the `id_*`/`cn_*` aliases). **A bare `CEIC…` id-plane RIC is not
candidate-reachable today** (the same gap the Investment file flagged for `CEIC14620601` net
foreign buy). So the entire "correct" tree for this basket needs **either** new `GLOBAL_CORR`
aliases for the Services-BTS / wage series, **or** an id-plane resolver path — without that
plumbing, the best this basket can do is the handful of already-aliased macro keys
(`id_gdp_real_q`, `id_pmi`, `id_exports`, `id_cpi_yoy`, `id_bank_credit`). This is the deepest
reason the basket is stuck: **the right drivers exist but are not wired into the resolver, and
even when wired they are annual/quarterly survey prints, not leading prices.**

---

## 8. Forecastability — the honest verdict (the most important section)

**The fact to explain:** Services has forward IC **−0.06** at the **22nd placebo percentile**
(no skill, mildly anti-predictive), `fwd_pearson +0.003`, hit−up −0.03, and — tellingly — the
**contemporaneous-ref IC is also negative (−0.026, 37th pctile)**. So the current set is a poor
*forecaster* AND a poor *explainer*. Four structural reasons, in order of importance:

**(1) It is a residual taxonomy bucket, not an economic sector.** Four micro-caps with
orthogonal revenue drivers (archival annuity / guard manpower / sustainability audits / cargo
inspection) and betas spanning 0.046→0.535 do **not** share a common factor. There is *no single
macro series* that should move all four, so any "driver" the engine finds is averaging noise
across unrelated names. This is irreducible — it is a property of the basket's *construction*,
not of the driver set.

**(2) Only 2 of 4 names are even scored — and they are the two LEAST macro-legible.** MUTU and
CRSN (the trade-linked TIC names with the most macro-legible demand) have **zero** price history,
so the scored basket is MFMI (a near-flat annuity, β 0.046) + SOSS (a labour cost-plus). The one
name with real macro hooks (CRSN ← export volume) contributes nothing.

**(3) The drivers that ARE correct are slow, coarse, and un-wired.** The theory-clean drivers —
minimum wage (margin), Services-sector business-tendency (demand) — are **annual / quarterly
survey prints on the id-plane**, not liquid leading prices, and not even resolver-reachable
today (§7). Per the master-plan rule, *quantity/survey prints are coincident/lagging → weak for
forecasting.* There is **no liquid, exogenous, leading price** anywhere in this basket's tree
(no commodity, no FX of consequence, no rate-duration asset) — so the basket **structurally
lacks a forecast candidate**, unlike Coal/Metals/Pharma whose forward skill comes from real
prices that lead.

**(4) The kept signal is small-n overfit.** The strongest kept correlation (−0.38,
`CEICI410108537`) sits on **n=60 quarterly** points with `pearson_p 0.24` (not significant);
the multivariate model is `available=false`. The "−0.341 IC" is the kind of number that does not
survive out of sample — and indeed the forward IC is −0.06.

**Branch-by-branch forward verdict:**

| Branch | Forward-skill verdict |
|---|---|
| Machinery/metals FDI/DDI (current kept) | **Negative — remove.** Wrong sub-industry; capex prints, 2 with flipped sign; the source of the incoherence (theory_agree 33%). |
| GDP / GDP-business-services (D1) | **Attribution only.** Coincident, pub-lagged quarterly; explains *ex-post*, does not lead. |
| Services BTS confidence/employment (D2) | **The only weak hope — expectations are forward-looking.** Leads realised service-hiring ~1q. *If* wired (resolver gap), expect modest attribution coherence, not tradable skill. |
| Minimum / average wage (S1) | **Theory-clean cost driver, but un-actionable.** Annual frequency + id-plane → cannot drive a monthly engine. Narrative only. |
| Exports / commodity throughput (D4) | **The genuine TIC driver — but DEAD** (MUTU/CRSN absent from the store). |
| USD/IDR, BI rate (macro) | **No.** ~Irrelevant (IDR-in/IDR-out) / ambiguous; do not force signs. |
| JCI / small-cap beta | **Circular — exclude.** Beta, not a forecast. |

**The verdict.** *Services (Industrials) is an **idiosyncratic residual bucket** of four
unrelated micro-caps with **no coherent macro driver and no forward skill** (fwd IC −0.06,
22nd pctile; contemporaneous −0.026 — a poor explainer too). The current tree is **the wrong
sub-industry** (manufacturing capex), and the **correct** tree — GDP-business-services + the
Services Business-Tendency Survey (demand) and minimum/average wage (the SOSS margin swing,
cost) — is built from **slow, coarse, id-plane survey/wage prints that are not even
resolver-reachable today and, even if wired, are coincident/annual, not leading prices.** The
basket therefore **structurally lacks a forecast candidate.** The honest target is **not skill**:
it is (a) **strip the manufacturing capex tree** (which should move IC from −0.06 toward neutral
by removing wrong-sign noise and lifting theory_agree off 33%), and (b) **ship a clean,
theory-honest attribution** — "this micro-cap services blend tracks the domestic-activity and
labour-cost cycle, modulated by idiosyncratic contract wins" — with **`forecast=low`** and
`confidence=low` made explicit. Concede `beta/attribution only`; the basket label is a residual
bucket, and **the right deliverable is an honest non-forecast, not a manufactured driver.***

---

## 9. Engine-wiring spec — concrete `mapping.py` changes

**Current seed (for reference):**
```python
"Services": {
    "ceic": [("Industrials & Manufacturing", None)],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "B2B services demand")],
},
```

**Two tiers, each independently A/B-testable against `backtest/bt.py "Services"`. Adopt only
what holds/improves forward IC (or — the realistic goal here — moves it from −0.06 toward
neutral while raising theory coherence).**

### Tier 1 — fixes reachable with TODAY's resolver (no new plumbing) — do first

```python
"Services": {   # residual labour/B2B-services bucket: MFMI (records mgmt), SOSS (security manpower),
                # MUTU/CRSN (TIC — absent from price store). NO coherent macro driver; attribution-only.
    "ceic": [],   # REMOVE ("Industrials & Manufacturing", None): machinery/metals CAPEX is the WRONG tree.
                  # It is the direct cause of theory_agree=33% and the two wrong-sign kept drivers.
    "globals": [],
    "macro": [
        ("id_gdp_real_q", "demand", +1, "domestic corporate-activity backdrop = B2B services demand (attribution)"),
        ("id_pmi",        "demand", +1, "monthly activity pulse; timeliest demand proxy (weak link to labour services)"),
        ("id_exports",    "demand", +1, "cargo-inspection throughput (CRSN/MUTU TIC demand) — only bites if those names re-enter the store"),
        ("id_cpi_yoy",    "cost",   -1, "wage-pass-through / consumables inflation = margin overlay (SOSS cost-plus)"),
        ("usdidr",        "macro",   0, "IDR-in/IDR-out domestic services → ~NO FX exposure; do NOT force a sign"),
        ("id_bi_rate",    "macro",   0, "expansion-financing cost; ambiguous for asset-light services"),
    ],
}
```
- **Remove the manufacturing CEIC scope** — the single highest-value fix. It strips the
  wrong-sub-industry capex prints (including the two `theory_agree=false` drivers) and should
  lift `theory_agree` off 33% and move IC from −0.06 toward 0 by deleting wrong-sign noise.
- **Keep `id_gdp_real_q` (+1)**, add `id_pmi` (+1), `id_exports` (+1, the TIC hook), `id_cpi_yoy`
  (−1, the wage-pass-through cost overlay) — **all already `GLOBAL_CORR`-aliased and reachable.**
- **`usdidr` sign 0** and **`id_bi_rate` sign 0**: do not manufacture FX/rate sensitivity a
  domestic asset-light services basket does not have.

### Tier 2 — the labour/services tree (needs id-plane resolver OR new `GLOBAL_CORR` aliases)

The economically *correct* drivers are id-plane CEIC series **not candidate-reachable today**
(§7). They require the engine owner to either add an id-plane resolver path or register
`GLOBAL_CORR` aliases mapping these keys to their deep-history series. Once reachable, wire:

```python
    # add to macro[] once resolver-reachable (alias suggestions in parentheses):
    ("svc_bts_confidence", "demand", +1, "Services Business-Tendency: Confidence Indicator — CEIC460128567 (id, n97, Q): best-matched demand series"),
    ("svc_bts_employment", "demand", +1, "Services BTS: Employment Future Tendency — CEIC459581817 (id, n97, Q): forward-ish outsourced-hiring proxy"),
    ("id_gdp_business_svc","demand", +1, "GDP: Business Services VA — CEIC365752127 (id, n73, Q): literal sectoral GVA (attribution)"),
    ("id_min_wage",        "cost",  -1, "Monthly Minimum Wage: Average — CEIC303317302 (id, n36, P1Y): SOSS guard-labour margin squeeze; ANNUAL → coarse"),
    ("id_cci_biz_cond",    "demand", +1, "CCI: Expected Business Condition — CEIC277373202 (id, n196, M): timelier (monthly) confidence proxy"),
```

**Honesty flags for Tier 2:** (a) `svc_bts_*` and `id_gdp_business_svc` are **quarterly, coincident**
→ attribution, not forecast; (b) `id_min_wage` is **annual (n36)** → theory-clean but too coarse
to drive a monthly engine — wire it for *narrative/cost coherence*, never as a forward signal;
(c) keep each on a **low weight** and verify it does not just add in-sample fit.

### Data / engine bugs to flag (not this file's to fix)

- **Resolver gap (the binding one):** id-plane `CEIC…`/`aID…` series are **not
  candidate-reachable**. The entire correct tree for this basket (Services BTS, GDP-business-
  services, minimum wage, CCI sub-indices) is blocked on this. Flag for the engine owner:
  add an id-plane resolver or `GLOBAL_CORR` aliases for these keys.
- **Catalog mis-tag:** `IDX:MFMI` is labelled *"Multifinance & Leasing"* in `market.json`; it is
  a **document/records-management** outsourcer. Cosmetic, but it can mislead sector logic.
- **Coverage gap:** `IDX:MUTU` and `IDX:CRSN` have **`weekly_obs 0`** (absent from the price
  store), so `n_used=2`. Until they are backfilled, the trade-linked TIC half of the basket is
  un-scorable and the basket is effectively MFMI+SOSS.
- **`dxy` → `TVC:BBDXY` is EMPTY (w0)** (master-list bug); irrelevant here post-fix since this
  basket should not wire DXY, but noted for consistency.

### What to backtest (`backtest/bt.py "Services"`), and the keep-rule

Ablation ladder; keep a change only if forward IC **improves or holds** with a more honest tree
(never an in-sample-only gain):
1. **Baseline** (current seed) → confirm fwd IC −0.06, placebo 0.22, theory_agree 33%.
2. **+Tier 1 strip** (drop manufacturing CEIC; keep GDP; add PMI/exports/CPI; usdidr & BI →0).
   *Expectation:* `theory_agree` rises, wrong-sign drivers gone, IC moves **−0.06 → toward 0**
   (mis-specification removed). **This is the primary success criterion** — *not* positive skill.
3. **+Tier 2 labour/services tree** (Services BTS, GDP-business-services, min wage, CCI) once
   resolver-reachable → expect **attribution/theory coherence to rise, forward IC ≈ unchanged**
   (coincident/annual prints). Keep for the narrative and confidence, not the forecast.

**Success = forward IC rises from −0.06 toward ≥0 (mis-specification removed), theory_agree
climbs well off 33%, and the verdict ships as an HONEST attribution with `forecast=low`,
`confidence=low`.** If, after Tiers 1–2, IC is still ≤0, **the honest conclusion stands and is
the expected one: Services is an idiosyncratic residual bucket of unrelated micro-caps with no
coherent macro driver — ship a clean attribution (domestic-activity + labour-cost cycle,
modulated by idiosyncratic contract wins), concede beta/attribution-only, and stop adding
drivers.** Do **not** re-add the manufacturing capex prints (or `jci`) to manufacture in-sample
fit — that is exactly what produced the incoherent kept set.

---

### Capsule (for IMPROVEMENT_PLAN §5 row 49)

> **Services (Industrial/Commercial) · Industrials · 2.4T · OOS ✗−0.06 (22nd pctile;
> contemporaneous −0.026 — poor explainer too).** An **idiosyncratic residual bucket** of four
> unrelated micro-caps — MFMI (records-mgmt annuity), SOSS (security manpower cost-plus), and
> MUTU/CRSN (TIC surveyors, **absent from the price store → only 2 of 4 scored**). **No coherent
> macro driver.** Current tree is the **wrong sub-industry**: `("Industrials & Manufacturing",
> None)` feeds 220 machinery/metals **capex** prints (2 kept with flipped sign, theory_agree
> 33%) to a basket that sells **labour-hours and audit-fees.** Fix: **strip the manufacturing
> CEIC scope**; keep `id_gdp_real_q` (+1); add reachable `id_pmi`/`id_exports` (+1, the CRSN
> cargo-inspection hook) and `id_cpi_yoy` (−1, wage-pass-through); set `usdidr`/`id_bi_rate` to
> **sign 0** (IDR-in/IDR-out, asset-light). The *correct* tree — **Services Business-Tendency
> Survey** (`CEIC460128567`/`CEIC459581817`, demand) + **GDP-business-services** (`CEIC365752127`)
> + **minimum wage** (`CEIC303317302`, the SOSS margin squeeze, cost −1) — is **un-wired**: those
> are **id-plane, resolver-unreachable, and annual/quarterly survey prints** (coincident/coarse,
> not leading prices), so the basket **structurally lacks a forecast candidate.** **Bugs:**
> id-plane resolver gap (blocks the whole correct tree); MFMI mis-tagged "Multifinance"; MUTU/CRSN
> `weekly_obs 0`. Honest verdict: **attribution/beta only** — target is moving IC from −0.06 toward
> neutral and shipping a clean non-forecast with `forecast=low`, not manufacturing skill.

---
*Series cited exist in `plan/catalog/{idind,id,market}.json` (real RICs + n_obs quoted inline);
empirical figures from `output/industrials_services.json` + `backtest/results/industrials_services.json`
+ `BACKTEST.md`. Members from `state/worklist.json`. The scored basket is two names (MFMI+SOSS);
the verdict is an honest attribution of a residual micro-cap bucket with no coherent macro driver,
not a cross-sectional forecast.*
