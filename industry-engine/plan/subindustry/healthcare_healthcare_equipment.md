# Healthcare Equipment (Healthcare) — Driver-Tree Plan

> Detail file for `IMPROVEMENT_PLAN.md` §4 · basket `healthcare_healthcare_equipment` ·
> sector Healthcare · mcap **~8.8T** · grade **perfected** · conf **medium** · kept **12** ·
> **forward OOS IC +0.29 (flag SKILL, placebo pctile 0.92) — but n_oos = 24 ONLY.**
>
> **Verdict up front — READ THE SAMPLE-SIZE CAVEAT FIRST.** On paper this is the
> **highest forward IC in the entire 52-basket book (+0.29)** and one of 12 SKILL
> baskets. **It is also the single least trustworthy SKILL flag in the book, because
> n_oos is only 24** — every other SKILL basket has 64–129 OOS months; this one has
> ~2 years. The members (OMED, LABS, IRRA, CHEK, HALO, MEDS) are **recent IPOs with
> short price history**, so the walk-forward simply ran out of months. A +0.29 IC on
> n=24 has a standard error of roughly ±0.20 (≈1/√(n−3)); the 95% confidence band
> spans from "≈0" to "very strong." The placebo percentile (0.92) clears the 0.90 bar
> by a hair, *and the placebo null is itself built on the same 24 short windows* — so
> the placebo is weak evidence here, not strong. **The honest reading is: the SIGN of
> the driver tree is theory-correct and the early data is encouraging, but the skill
> claim is statistically fragile and must NOT be trusted until the basket accumulates
> more OOS history (target ≥60 months) or its sign holds out-of-time.** This file does
> two things: (1) lays out what the drivers *should* be on first principles (a clean,
> import-USD-cost + defensive-duration tree, the same recipe that makes Pharma +0.17
> trustworthy), and (2) flags, prominently and repeatedly, that the +0.29 is a
> small-sample artefact-risk and the engine should hold this basket at **medium/low
> confidence, not high**, regardless of the headline IC.

---

## 1. Snapshot — the basket, the SKILL flag, and why it is fragile

**Members (6 names, ~8.8T total — one name is ~75% of the cap).** This is a **tiny,
top-heavy, recently-listed** basket. The brief's illustrative names (PRDA/Prodia,
MTMH/Murni, SAME) are **not** the engine's actual members — they sit in *Hospitals* /
*Healthcare Services* baskets. The real `healthcare_healthcare_equipment` constituents
per `worklist.json` are device/diagnostics/health-tech listings:

| name | what it does | mcap | beta | role in basket |
|---|---|---|---|---|
| **OMED** (Jayamas Medica / Oneject) | **the dominant name (~75% of cap)** — domestic manufacturer + distributor of medical disposables/devices (syringes, diagnostics consumables). Part-import input, part-local manufacture. | **6.54T** | 0.236 | **the anchor — the basket IS effectively OMED** |
| **LABS** (Paramita / lab-services) | clinical-lab / diagnostics services. | 0.58T | None (too short) | small; test-volume leg |
| **IRRA** (Itama Ranoraya) | **medical-device distributor** — imports & distributes devices/diagnostics to hospitals & BPJS channel. Pure USD-import-cost model. | 0.57T | 0.36 | the cleanest *import-distributor* leg |
| **CHEK** (Golden Westindo / Estika) | diagnostics / health products distribution. | 0.49T | None | small distributor |
| **HALO** (Haloni Jane / Halodoc-adjacent health) | health products / device distribution. | 0.44T | None | small |
| **MEDS** (Trimitra Prakarsa / Medikaloka-adjacent) | health/medical products. | 0.14T | **1.169** | smallest; high-beta tail |

| field | value |
|---|---|
| current grade | **perfected** (a fit label — do not read as forecast confidence) |
| current confidence | **medium** (`_state.txt` / BACKTEST.md — correctly *not* "high") |
| kept drivers | **12** (`_state.txt`) — but most are auto-pulled CEIC quantity prints |
| current seed (`mapping.py`) | ceic `("Healthcare", None)` (the **WHOLE** Healthcare block); macro `usdidr −1`, `id_gdp_real_q +1` — **only two macro leaves** |
| **forward OOS IC** | **+0.29** (BACKTEST.md — highest in book) |
| **n_oos** | **24 ONLY** (BACKTEST.md — *one quarter the typical sample*) |
| hit-rate vs up-market | **+0.19** (strong-looking, but on 24 months) |
| placebo percentile | **0.92** (clears 0.90 by a hair; null built on the same 24 short windows) |
| flag | **SKILL** (fragile — see the caveat above and §8) |

**The gap — different from every other Healthcare basket.** Pharma's gap is *depth*;
Hospitals' gap is *honesty (macro can't forecast it)*. Healthcare-Equipment's gap is
**(a) sample size and (b) a sloppy CEIC pull**:

1. **n_oos = 24 makes the +0.29 untrustworthy as a skill claim.** The members are
   short-history IPOs; the walk-forward had only ~2 years of unseen returns. The sign
   is theory-correct (import-USD cost + duration), but the *magnitude and significance*
   are not yet earned. **Do not promote to high confidence; do not let downstream UI
   present +0.29 as a settled forecast.**
2. **The seed pulls the ENTIRE Healthcare block (`("Healthcare", None)`)** — that drags
   in **30 Hospitals quantity prints + 27 Pharmaceuticals prints** that have nothing to
   do with a device-distributor basket, alongside the **4 genuinely-relevant Medical
   Devices import series**. Most are annual/lagged → they pad the "12 kept drivers"
   with coincident noise and **dilute** the one clean handle (device-import USD cost).
3. **The two macro leaves are right but thin.** `usdidr −1` is exactly correct (the
   margin swing factor for import distributors). But there is **no duration handle**
   (`id_10y` / `us_10y`) — odd, because the §8 mechanism that *should* generate any real
   forward skill here is the same defensive/rate-sensitive re-rating that anchors Pharma
   (+0.17) and that the brief explicitly calls "defensive-ish." The duration leg is
   missing from the seed.

The job: **scope the CEIC pull down to the Medical-Devices import series, add the
duration leg, keep `usdidr` as the cost pillar — and above all, treat the +0.29 as
provisional, gating any change on the backtest AND flagging that n_oos=24 means the
result needs more data before trust.**

---

## 2. Economic structure — how a device/diagnostics basket makes money

**The revenue identity.** Two business models sit in this basket, and they differ in
exactly the way that matters for FX:

```
Revenue = Σ over [ device DISTRIBUTION (IRRA, CHEK, HALO, MEDS) ,
                   device MANUFACTURE (OMED — disposables/consumables) ,
                   diagnostic-TEST services (LABS) ]
          ( Volume  ×  Price )
          ▲ distribution: device/diagnostic UNIT volume × markup over USD landed cost
          ▲ manufacture:  consumable volume × price − (part-imported raw-material USD)
          ▲ lab/test:     test VOLUME × tariff  (post-COVID normalisation story)
```

- **Import distributors (IRRA, CHEK, HALO, MEDS).** Buy finished devices/diagnostics
  **in USD**, sell into hospitals and the BPJS/e-catalogue channel **in IDR**. The
  business is **landed-cost-plus-markup** — so the gross margin is a **direct, levered
  function of USD/IDR**. A weak IDR raises landed cost; pass-through into hospital/BPJS
  selling prices is **slow and partly administered** (e-catalogue tenders are set in
  IDR), so FX hits margin *before* it can be passed on → the textbook importer squeeze.
- **OMED (the anchor, ~75% of cap).** A **domestic manufacturer** of disposables
  (syringes, consumables) — so it is *less* import-exposed than the pure distributors
  (some local value-add), but its raw materials (resin, specialty components, some
  finished imports for distribution) are still **part-USD**. OMED is the reason the
  basket is "import-cost-sensitive but not 100% pass-through."
- **LABS (diagnostics/test services).** Revenue = **test volume × tariff**. The volume
  story is **post-COVID normalisation** — the 2021–22 COVID-testing spike unwound, and
  the structural driver is now routine clinical-test volume (chronic-disease screening,
  check-ups) growing with healthcare access/BPJS coverage. Tariffs are part-administered.

**The cost stack — the margin swing factor.** For the basket as a whole the defining
feature is the same as Pharma's, one notch weaker: **imported, USD-priced devices and
raw materials are the dominant variable cost**, so:

```
COGS  ≈  imported finished devices / diagnostics (USD)   ← distributors: ~all of COGS
       + imported raw materials / components (USD)        ← OMED: part of COGS
       + local manufacturing / logistics (IDR)
SG&A  ≈  distribution network, sales force, regulatory/registration, working capital
```

The **margin swing factor is USD/IDR on the imported-device base**, with **asymmetric,
lagged pass-through** (e-catalogue/hospital prices are IDR and sticky). This makes the
basket **import-cost-sensitive and defensive-ish**: device/diagnostic demand is
non-cyclical (health need, not the business cycle), but margin is FX-levered.

**Why "defensive-ish" → a (weak) duration handle.** OMED is a profitable, cash-
generative health-products compounder; the small distributors are lower-quality. To the
extent the market prices the anchor (OMED) as a **defensive health-products grower on a
premium multiple**, its valuation is **discount-rate-sensitive** — the same bond-proxy
re-rating that gives Pharma its skill. This is the *theoretical* source of any genuine
forward signal beyond FX, and it is **missing from the current seed**.

**What a sell-side analyst actually watches:** **USD/IDR** (the gross-margin call — #1),
**device/diagnostic import volume & the BPJS e-catalogue tender pipeline** (the volume
engine), **test-volume normalisation (LABS / Prodia-style read-across)**, **working-
capital / inventory days** (FX-timing of USD purchasing), **hospital capex** (downstream
device demand — cross-ref Hospitals), and — for the anchor's multiple — the **10Y yield**.

**Intra-basket dispersion.** OMED *is* the basket (~75% cap) — a part-domestic
manufacturer, so the basket is **less FX-levered than a pure-distributor basket would
be**. IRRA is the cleanest USD-import-distributor read; LABS is the test-volume leg;
CHEK/HALO/MEDS are small, illiquid, idiosyncratic. **The basket signal is dominated by
OMED's defensive-health-products + part-import-cost behaviour**, with a distributor FX
overlay from the tail. The tiny float and short history are why the OOS sample is small
and the IC unstable.

---

## 3. DEMAND driver tree

Device/diagnostic demand is **defensive and structural** (health need + BPJS coverage +
post-COVID test normalisation), so the *level* is non-cyclical. The forecastable
variation is **healthcare-access/coverage volume** and **real-income-driven private
healthcare**. As everywhere, the CEIC quantity prints are **publication-lagged →
attribution, not forecast**; the timely demand handles are the *macro* income/activity
series. **With n_oos=24, treat every demand-leaf "lead" claim as a hypothesis, not a
measured fact.**

```
DEMAND
├── D1 device / diagnostic VOLUME  (the system-throughput engine — import as proxy)
│   ├── D1a Med-device imports: instruments/electro-medical → CEICI580035297 (dem,USD, n158, P1M, ~2m lag)
│   ├── D1b Med-device imports: surgical/dental instruments  → CEICI661052107 (dem,USD, n158, P1M)
│   ├── D1c Med-device imports: catheters/cannulae           → CEICI669240277 (dem,USD, n158, P1M)
│   └── D1d Med-device imports: ultrasonic scanning apparatus→ CEICI669602487 (dem,USD, n158, P1M)
├── D2 healthcare access / BPJS coverage  (the financing volume engine)
│   ├── D2a [NO DIRECT BPJS / e-catalogue device-tender SERIES IN STORE — gap]  ← the real leading node
│   └── D2b OJK healthcare-object financing (Multifinance/Banks block) → lagged proxy (cross-ref §6)
├── D3 diagnostic-test volume  (LABS / Prodia-style — post-COVID normalisation)
│   └── D3a [NO CLEAN ID TEST-VOLUME SERIES — proxy via healthcare CPI + access; PRDA read-across is company data]
├── D4 real income & private healthcare  (out-of-pocket / private-pay up-trade)
│   ├── D4a consumer confidence                → id_consumer_confidence → aIDCONIAR (M, deep, timely)
│   ├── D4b real retail sales index            → CEIC322851702 (dem, n196, P1M, last 2026-04)
│   └── D4c real GDP (domestic-demand backdrop)→ id_gdp_real_q → aIDGDPAR1 (Q, lagged) — WIRED
└── D5 hospital capex / downstream device demand  (cross-ref Hospitals)
    └── D5a Number of hospitals / bed build     → CEICI347651202 (sup, Unit, n19, P1Y) — annual, structural
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **D1a–d device imports** | `CEICI580035297`, `CEICI661052107`, `CEICI669240277`, `CEICI669602487` | demand | **+1** | **0** (lag) | **The one block that is genuinely *about this basket*.** Monthly USD import value of medical instruments / electro-medical / surgical / catheters / ultrasonic devices (UN Comtrade). **n158, deep (from 2012-12), fresh (last 2026-04)** — by far the best CEIC series for the basket. BUT a USD *value* line confounds **volume (demand +) with FX/USD price (cost −)** → publication-lagged, coincident → **attribution.** Re-role at least one as the *cost* echo (§4). |
| **D2b OJK healthcare financing** | (Multifinance/Banks block — cross-ref §6) | demand | +1 | 0 (lag) | Consumer health-spend financing flow = proxy for device/diagnostic spend reaching the system. Monthly but **~5–6m publication-lagged** → attribution. |
| **D3a test-volume (no clean series)** | — | demand | +1 | — | LABS/PRDA test-volume normalisation is the diagnostic-services demand story, but **there is no clean ID monthly test-volume series**; PRDA's own prints are company data, not in the store. The leading node is unobservable → gap. |
| **D4a consumer confidence** | `aIDCONIAR` | demand | **+1** | **+1** | Confidence/income expectations → private (out-of-pocket) health spend / elective diagnostics / device up-trade. **Monthly, deep, timely.** The cleanest *timely* demand handle (same as Pharma D2a). Modest — private-pay is a minority of device demand vs the BPJS/hospital channel. |
| **D4b real retail sales** | `CEIC322851702` | demand | +1 | 0 | Real mass-consumption proxy for out-of-pocket health-product purchasing (OMED/HALO consumer-health SKUs). **n196, deep, timely (2026-04).** Coincident → attribution-grade but high quality. |
| **D4c real GDP** | `aIDGDPAR1` | demand | +1 | 0 | Domestic-demand / affluence backdrop → private healthcare. **Quarterly, lagged** → weak structural prior. **WIRED.** |
| **D5a hospitals/beds build** | `CEICI347651202` | demand | +1 | 0 | Downstream device demand follows hospital bed/equipment capex. **Annual (n19)** → thesis backdrop only, not a monthly signal. |

**Sub-driver chain on the top demand driver (D1/D2, device volume via BPJS channel):**
`BPJS budget & e-catalogue device tender → covered-lives × utilisation × procedure mix →
device/diagnostic UNIT volume → distributor/manufacturer revenue → earnings → price`.
**We hold none of the leading nodes** — e-catalogue device-tender outcomes and formulary
inclusions are *policy events*, not series; the closest proxies (device imports, OJK
financing) sit at the *lagged, coincident* end. So the forecastable demand variation does
**not** live in the volume branch — it lives, weakly, in **D4 (real income → private
healthcare)** via `aIDCONIAR` (+1 lead).

**Honest read on the demand tree:** the only series *specific* to this basket (the 4
device-import lines) are **lagged, FX-confounded value prints → attribution.** The volume
engine (BPJS device tenders, test volume) is **unobservable at the leading node.** The
one timely demand handle is consumer confidence (modest +1). **Demand is not where any
real forward edge would come from — and on n_oos=24 we cannot even claim it contributes
measurable forward signal.** Net: ~6 demand leaves, all attribution-grade except a modest
`aIDCONIAR`.

---

## 4. SUPPLY / COST driver tree — the imported-device USD cost (the margin swing factor)

This is the more important fundamental tree, because **the imported, USD-priced device /
raw-material base is the basket's margin swing factor**, driven by a *liquid, leading,
exogenous price*: **USD/IDR**. This is the cleanest leaf in the whole tree and the one
the seed already gets right.

```
SUPPLY / COST
├── S1 imported-device / raw-material cost  (USD — the SWING factor)
│   ├── S1a USD/IDR                                   → usdidr → FX_IDC:USDIDR (D, deep, LEADS) — WIRED
│   ├── S1b DXY (broad USD / EM import-cost regime)   → dxy → **TVC:DXY** (D; current BBDXY = DEAD, see §7)
│   └── S1c Device-import VALUE (realised USD cost)   → CEICI580035297 (+3 pairs) (USD, n158, lag)
├── S2 domestic input-cost inflation  (logistics/overhead/local manufacture echo)
│   └── S2a CPI YoY (general inflation regime)        → id_cpi_yoy → ECONOMICS:IDIRYY (M)
├── S3 health price level  (selling-price / tariff = revenue-per-unit, partial offset)
│   └── S3a CPI: Health                               → CEIC521347917 (—, 2022=100, n41, P1M, timely)
└── S4 capacity / investment build  (structural — lagged)
    └── S4a Investment realization (health/pharma FDI/DDI) → CEICI235844402 (USD mn, n145, P3M, lag)
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **S1a USD/IDR** | `FX_IDC:USDIDR` | **cost** | **−1** | **+1 to +3** | **The core cost branch — and the one leaf most likely to carry real forward signal.** IDR weakness raises USD landed cost of imported devices/raw-materials with a 1–3m inventory/purchasing lag → margin squeeze (importers can't re-price into IDR/administered hospital tenders fast) → earnings cut. **Daily, deep, exogenous, leading.** Distributors (IRRA, CHEK) most exposed; OMED partly cushioned by local manufacture. **WIRED — keep.** This, plus duration, is the whole credible-forecast story. |
| **S1b DXY** | `TVC:DXY` | cost/macro | **−1** | +1 | Broad USD strength = EM-wide import-cost + risk-off; reinforces the USD/IDR hit. **Daily, deep.** **NB: wire to `TVC:DXY` — current `dxy → TVC:BBDXY` is a DEAD series (weekly_obs 0).** Add only if orthogonal to `usdidr` (likely redundant) — and on n=24 a redundant leaf is *especially* dangerous (multiple-testing on a tiny sample). Default **SKIP**. |
| **S1c device-import VALUE** | `CEICI580035297` (+`661052107`/`669240277`/`669602487`) | cost | −1 | 0 | Realised USD import bill (value = volume × USD price) = the cost *after the fact*. **n158, deep, fresh, but ~2m lagged + confounds volume with FX.** Attribution confirmation of the FX channel, **not** a forecaster. Re-role ≥1 from demand→cost so the tree doesn't double-count it as pure demand. |
| **S2a CPI YoY** | `ECONOMICS:IDIRYY` | cost | **−1** | 0 | General inflation = domestic logistics/overhead/local-manufacture cost echo. Monthly, timely. Coincident; weak forward. (Not currently wired — optional.) |
| **S3a CPI: Health** | `CEIC521347917` | cost/demand | ambiguous | 0 | Health price level = device/diagnostic selling-price / tariff inflation = revenue-per-unit (a *partial FX offset* — to the extent importers DO pass cost through). **Monthly, n41 only (2023→), timely (last 2026-05) → short history, weak power.** Sign ambiguous (revenue + vs input-cost echo +). Attribution. |
| **S4a investment realization** | `CEICI235844402` | supply | +1 | 0 | FDI/DDI into health/pharma capacity = structural build. **Quarterly (P3M), n145, lagged** → backdrop only. |

**Sub-driver chain on the top cost driver (S1, imported-device cost):**
`Fed funds / DXY / risk-off → USD/IDR → USD device-landed COGS (1–3m inventory lag) →
gross margin → earnings → price`. The **leading, observable node is USD/IDR** (daily,
exogenous); the trailing realised node is the device-import-value print (lagged). So the
cost tree has a **clean leading handle at the top (FX)** — the basket should de-rate
*ahead* of the reported margin hit. This is the single most defensible forward leaf.

**Honest read on the supply/cost tree:** the dominant cost line (imported devices) maps
to a **liquid, leading FX price (USD/IDR)** → genuinely forecastable *in mechanism*. But
OMED's part-domestic manufacture **dilutes** the FX elasticity vs a pure-distributor
basket, and the realised-cost prints are lagged → attribution. **Net: one strong forward
cost leaf (`usdidr −1`), already wired** — protect it; don't bury it under CEIC noise.

---

## 5. MACRO / RATE / FX / FLOW — the FX pillar (wired) + the missing duration leg

This is where the credible forward branches live. The seed has the **FX pillar**
(`usdidr −1`) but is **missing the duration leg** that the "defensive-ish" anchor (OMED)
and the Pharma/Hospitals read-across imply should be there.

| driver | series (RIC) | role | sign | LEAD | mechanism · forecast hypothesis |
|---|---|---|---|---|---|
| **`usdidr`** | `FX_IDC:USDIDR` | **macro/cost** | **−1** | **+1 to +3** | **WIRED — the pillar.** Twofold negative: (i) imported-device USD-cost squeeze (§4 S1a — the margin swing factor), (ii) EM-outflow/risk-off proxy that pressures the small, illiquid, foreign-sensitive tail. **Daily, deep, exogenous, leading.** Correct sign, correct role. **Keep — do not weaken.** |
| **`id_10y`** govt 10Y | `TVC:ID10Y` | macro | **−1** | **+1 to +3** | **ADD (priority 1).** OMED (the anchor) is a defensive health-products grower on a premium multiple → its valuation is local-discount-rate-elastic (the bond-proxy re-rating that gives Pharma its +0.17 and that the brief calls "defensive-duration"). Falling ID 10Y → multiple expansion; rising → de-rating. **Daily, deep (weekly_obs 798), exogenous, leading.** The single best *theory-motivated* addition — but **gate it hard on n=24** (it could just as easily add noise as signal on this sample). |
| **`us_10y`** UST 10Y | `TVC:US10Y` | macro | **−1** | **+1 to +3** | **ADD (priority 2).** Global discount rate / EM-duration — the same handle that anchors Pharma (+0.17) and the rest of the defensive complex. **Daily, deep (weekly_obs 800), leading.** Deepens the duration channel with the global leg. Test paired with `id_10y`; keep whichever holds IC without redundancy. |
| **`us_real_10y`** UST 10Y REAL (TIPS) | **`DFII10`** | macro | −1 | +1 to +3 | **CONSIDER (priority 3) — NEW RESOLVER.** The *real* discount rate is the theoretically-purest duration handle for a defensive grower. **`DFII10` is live in `market.json` (weekly_obs 800, "US 10Y Real") but has NO resolver** — would need `"us_real_10y": "DFII10"` added to `GLOBAL_CORR`. **On n=24, adding a third rate leg risks multiple-testing more than it helps — default test-then-likely-drop**; prefer the single cleanest duration leg. |
| **`id_gdp_real_q`** | `aIDGDPAR1` | demand | +1 | 0 | **WIRED.** Domestic-demand / healthcare-utilisation backdrop. **Quarterly, lagged** → weak structural prior; keep, expect no monthly forecast skill. |
| **`dxy`** | **`TVC:DXY`** | macro | −1 | +1 | Broad-USD / EM risk-off amplifier. **Resolver bug: current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** If ever used, must point to `TVC:DXY`. **Double-counts `usdidr`+`us_10y` → default SKIP** (especially on n=24). |

**Why duration *should* lead here (theory, not yet earned on data).** A defensive health-
products grower's price ≈ (steady earnings) / (discount rate − growth); with near-non-
cyclical demand, much of the price variance is the discount-rate denominator → the equity
behaves like a long-duration bond and re-prices when yields move, *before* earnings news.
This is the exact mechanism that gives Pharma a *trustworthy* +0.17 on n_oos=129. **The
hypothesis is that the same mechanism operates in OMED/this basket — but we have only 24
OOS months to test it, so it remains a hypothesis.** Adding `id_10y`/`us_10y` is the
theory-motivated way to *test* whether the basket's +0.29 is the duration+FX factor (good,
will persist) or a small-sample fluke (bad, will decay).

**Flow note.** The tail (CHEK/HALO/MEDS/LABS) is small, illiquid and foreign-flow-
sensitive; in EM risk-off (`usdidr`↑, `us_10y`↑) it de-rates with the small-cap complex.
That flow is captured by the `usdidr` (+ proposed `us_10y`) handles → a separate `dxy`
leaf re-expresses the same factor (and is currently broken) → keep the flow read *inside*
the FX/rate handles; don't multiply correlated leaves on a 24-month sample.

**The macro verdict:** the **FX-cost handle (`usdidr`, wired) + a duration leg (`id_10y`/
`us_10y`, to add)** is the only credible forward engine. Everything in §3–§4's CEIC prints
is attribution. **But all of this is provisional until n_oos grows** — see §8.

---

## 6. Cross-industry linkages

| linked sub-industry | borrowed series | direction | rationale |
|---|---|---|---|
| **Pharma** (Healthcare, +0.17, n_oos 129) | `id_10y`/`us_10y` duration; `usdidr` (imported APIs/devices) | shared factor + **reference** | **Same recipe** — clean imported-USD cost + defensive-duration. Pharma is the *trustworthy* version (n_oos 129); Healthcare-Equipment is the *same structure on a tiny sample*. Pharma is the reference for how the duration/FX handles should behave **and** for what a *credible* forward IC looks like (note Pharma's +0.17 on n=129 is more trustworthy than this basket's +0.29 on n=24). |
| **Hospitals** (Healthcare, −0.02) | `CEICI347651202` number-of-hospitals / bed build; `usdidr` | downstream demand | **Hospital capex IS device demand** — the bed/equipment build is the downstream pull for OMED/IRRA devices. The brief's "hospital capex (cross-ref Hospitals)" maps here. But the hospital-build series are **annual** → structural backdrop, not a monthly signal. |
| **Healthcare Services** (−0.03) | patient/test-utilisation proxies | sibling (LABS leg) | LABS (diagnostics/test) shares the test-volume / utilisation demand of the services cluster — also macro-flat. Confirms the diagnostic-volume leg is attribution-grade. |
| **Banks / Multifinance** | OJK healthcare-object financing (Multifinance block) | upstream | Device/diagnostic spend financing originates in the banking/multifinance system; the OJK series is a banking-block leaf re-used as a (lagged) demand proxy for D2. |
| **Chemicals / Basic Materials** | (resin / component feedstock — no clean ID series) | upstream cost (OMED) | OMED's disposables use resin/specialty inputs, but they are *imported/USD-priced*, so the linkage is to **`usdidr`**, not a local chemicals series. Noted to **avoid** a spurious domestic-chemicals cross-wire. |

---

## 7. Currently wired vs available

| status | driver | series (RIC) | role/sign | note |
|---|---|---|---|---|
| **WIRED — keep (PILLAR)** | `usdidr` | `FX_IDC:USDIDR` | macro/cost −1 | **the FX-cost pillar — correct; the most defensible forward leaf. Do not weaken.** |
| **WIRED — keep (weak prior)** | `id_gdp_real_q` | `aIDGDPAR1` | demand +1 | quarterly/lagged structural prior. |
| **WIRED — ceic block (SCOPE DOWN)** | `("Healthcare", None)` (**whole** block: 30 Hospitals + 27 Pharma + 4 Med-Device prints) | auto | mixed | **the main bug — pulls the entire Healthcare category** incl. irrelevant Hospitals/Pharma quantity prints. Scope to Medical-Devices import series; let the data-quality gate cull annual/short. |
| **ADD (priority 1)** | `id_10y` | `TVC:ID10Y` | macro −1 | the missing **defensive-duration** leg (OMED bond-proxy re-rating). Theory-motivated; **gate hard on n=24.** |
| **ADD (priority 2)** | `us_10y` | `TVC:US10Y` | macro −1 | global duration leg; deepens the same channel. |
| **CONSIDER (NEW RESOLVER)** | `us_real_10y` | **`DFII10`** | macro −1 | purest duration handle (TIPS); live (weekly_obs 800), **no resolver yet**. Test-then-likely-drop on n=24 (multiple-testing risk). |
| **CONSIDER (re-role)** | device-import value | `CEICI580035297` (+3) | cost −1 | re-role ≥1 from demand→cost so the FX channel isn't double-counted as pure demand; attribution either way. |
| **CONSIDER** | `id_consumer_confidence` | `aIDCONIAR` | demand +1 | the one timely demand handle (private-pay up-trade); modest. |
| **CONSIDER** | real retail sales | `CEIC322851702` | demand +1 | deep, timely mass-consumption proxy (OMED/HALO consumer-health); coincident → attribution. |
| **FIX (BUG, global)** | `dxy` resolver | `TVC:BBDXY` → **`TVC:DXY`** | — | **current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** Any `dxy` use is silently null. (Global; flag — out of scope to edit here.) |
| **SKIP (data-quality)** | PPI pharma / capacity-util | `CEICI527094247` (n13) / `CEICI506662937` (n14) | — | quarterly, n13–14 → too short for power; and not device-specific. |
| **SKIP (annual/lagged)** | Hospitals build, GDP-VA, investment-realization, by-province | `CEICI347651202` / `CEICI365…` / `235844402` / provincial | — | annual/quarterly + lagged → zero monthly-forecast value; these are most of the noise the whole-Healthcare pull drags in. |
| **SKIP (default)** | `dxy` as a leaf | `TVC:DXY` | — | double-counts `usdidr`+`us_10y` risk-off; **especially avoid on n=24.** |
| **UNAVAILABLE (the real demand node)** | BPJS e-catalogue **device** tender · covered-lives · clinical-test volume (PRDA-style) | — | **policy/company data, not series.** The leading device-volume node is unobservable to the engine. |

---

## 8. Forecastability — SKILL flag, but the sample is too small to trust

**This is the most important section. The headline +0.29 is real arithmetic on real data
— but it is a SKILL flag the engine should NOT lean on yet.** The reasoning, tied to the
backtest:

1. **n_oos = 24 is the disqualifier.** Every *trustworthy* SKILL basket in the book has
   64–129 OOS months (Coal 129, Pharma 129, Poultry 70, Alt-Energy 64). This basket has
   **24** — the members are recent IPOs (OMED, LABS, IRRA, CHEK, HALO, MEDS all short-
   history), so the blindfolded walk-forward simply could not accumulate more unseen
   months. A correlation/IC of +0.29 on n≈24 carries a standard error of roughly **±0.20**
   (≈1/√(n−3)) → the 95% interval runs from **≈0 (no skill) to ≈0.65 (huge skill)**. The
   point estimate is encouraging; **the uncertainty band makes it statistically fragile.**
2. **The placebo percentile (0.92) is weak evidence on this sample.** The circular-shift
   placebo null is built from the *same 24 short windows*; with so few months the null
   distribution is itself coarse and unstable. Clearing 0.90 *by a hair* on n=24 is **not**
   the same strength of evidence as Pharma clearing 0.97 on n=129. Read 0.92-on-24 as
   "suggestive," not "established."
3. **The SIGN of the tree is theory-correct — which is the genuinely reassuring part.**
   Unlike a basket that lucked into a high IC with nonsense drivers, this basket's posture
   is **mechanistically sound**: imported-USD-device cost (`usdidr −1`) + (to-add)
   defensive-duration re-rating are exactly the handles that give Pharma a *trustworthy*
   +0.17. So the +0.29 is **plausibly the early signature of a real factor**, not obviously
   a fluke. But "plausible and theory-aligned" ≠ "statistically demonstrated on this n."
4. **Contemporaneous vs forward.** As everywhere, contemporaneous co-movement (FX → import-
   distributor margin) is stronger and more reliable than the forward IC. The forward claim
   (the basket de-rates *ahead* of the reported FX-margin hit) is the part that needs the
   sample to grow before we believe the +0.29 magnitude.
5. **What would CONFIRM the skill (the keep-rule on n=24).** (i) **Accumulate OOS history**
   — re-run the backtest as months are added; the skill is trustworthy only when n_oos
   approaches ≥60 and the IC *holds*. (ii) **Adding the theory-motivated duration leg
   (`id_10y`/`us_10y`) should HOLD or LIFT the IC if the +0.29 is the duration+FX factor**;
   if it *degrades* the IC, that is evidence the +0.29 was small-sample noise. (iii)
   **Scoping the CEIC pull down to Medical-Devices** should hold/tick up IC by removing
   coincident Hospitals/Pharma noise.
6. **What would BREAK it.** (i) Over-fitting to 24 months by piling on correlated leaves
   (`dxy` + `usdidr` + `us_10y` + `id_10y` + `us_real_10y` all at once) → multiple-testing
   inflation is *catastrophic* on a tiny sample; **keep the tree parsimonious (FX + one
   duration leg).** (ii) Promoting the basket to **high confidence** on the strength of
   +0.29 → this would mis-state a fragile estimate as a settled forecast.

**Confidence: MEDIUM → arguably LOW until n_oos grows.** The current "medium" label is
appropriately cautious (not "high") and **should stay there or drop to low.** Present the
basket's macro read as: *"theory-clean import-USD-cost + defensive-duration structure;
early OOS is encouraging (+0.29) but the sample is only 24 months, so the skill claim is
provisional and needs more data before trust."* **Do not let the +0.29 headline drive
position sizing or override the LBC analysts' company-level device/FX/test-volume work.**

---

## 9. Engine-wiring spec (`mapping.py`)

Concrete, minimal, **sample-aware** change to the `"Healthcare Equipment"` SEED. Guiding
principle: **scope the CEIC pull to the device-import series, keep the FX pillar, add ONE
clean duration leg, and gate every change on the backtest — while NOT trusting the +0.29
until n_oos grows.** Parsimony matters more here than anywhere because n=24.

```python
"Healthcare Equipment": {
    # SCOPE DOWN: the current ("Healthcare", None) pulls the WHOLE Healthcare block
    # (30 Hospitals + 27 Pharma quantity prints) — irrelevant noise for a device basket.
    # Restrict to the Medical-Devices subcategory (the 4 import series that ARE this basket).
    "ceic": [("Healthcare", "Medical Devices")],
    # Re-role the realised device-import bill as a (lagged) COST echo, not pure demand,
    # so the FX channel isn't double-counted as demand:
    "ceic_override": [
        ("import: world (un comtrade)", "cost", -1),   # CEICI580035297 (+ pairs) — USD device cost
    ],
    # If the gate still drags annual/structural Healthcare prints, exclude explicitly:
    "ceic_exclude": [
        "number of hospitals", "by province",          # annual hospital build — no monthly value
        "investment realization", "gross domestic product",
    ],
    "globals": [],
    "macro": [
        # ---- FX-COST pillar (imported USD devices — the margin swing factor). KEEP. ----
        ("usdidr",  "macro", -1, "imported-device USD landed-cost squeeze (importers can't re-price into IDR/e-catalogue) + EM risk-off on the illiquid tail"),
        # ---- DURATION leg (the missing 'defensive-ish' handle). ADD — gate hard on n=24. ----
        ("id_10y",  "macro", -1, "ADD p1: OMED defensive health-products grower = bond-proxy duration re-rating (same factor as Pharma +0.17)"),
        ("us_10y",  "macro", -1, "ADD p2: global discount-rate / EM-duration leg of the same re-rating"),
        # ---- DEMAND backdrop (weak; keep parsimonious on a 24-month sample). ----
        ("id_gdp_real_q", "demand", +1, "WIRED: quarterly/lagged healthcare-utilisation backdrop (weak prior)"),
        # ("id_consumer_confidence", "demand", +1, "OPTIONAL p3: private-pay up-trade — add only if it lifts forward IC"),
        # ---- DO NOT add dxy by default: double-counts usdidr+us_10y risk-off, AND the
        #      global resolver dxy->TVC:BBDXY is DEAD (weekly_obs 0). On n=24, extra
        #      correlated leaves = multiple-testing poison. ----
        # ---- DO NOT add us_real_10y (DFII10) without first adding its resolver AND
        #      confirming it isn't redundant with us_10y on this tiny sample. ----
    ],
},
```

**New resolver required IF testing the real-yield leg (in `GLOBAL_CORR`):**
```python
"us_real_10y": "DFII10",   # US 10Y Real Yield (TIPS) — market.json weekly_obs 800, no prior resolver
```
**Resolver bug to fix (global, flag — affects every basket that uses `dxy`):**
```python
"dxy": "TVC:DXY",          # was "TVC:BBDXY" → DEAD (weekly_obs 0). TVC:DXY has weekly_obs 800.
```

**Resolvers already present** (no new work for the core spec): `usdidr → FX_IDC:USDIDR`,
`id_10y → TVC:ID10Y`, `us_10y → TVC:US10Y`, `id_gdp_real_q → aIDGDPAR1`,
`id_consumer_confidence → aIDCONIAR`.

**Falsifiable backtest plan (keep-rule: forward IC must hold or improve — but interpret
EVERY result through the n_oos=24 lens; never promote to high confidence on this sample):**
1. **Baseline** = current seed (`("Healthcare", None)`, `usdidr −1`, `id_gdp_real_q +1`)
   → reproduce **fwd IC +0.29, n_oos 24, placebo pctile 0.92, SKILL.** Note the n.
2. **Scope-down ceic** to `("Healthcare", "Medical Devices")` (+ override/exclude) →
   expected to **hold or tick up** by removing irrelevant Hospitals/Pharma noise. Keep iff
   non-degrading. This also makes the "12 kept drivers" honest (device series, not padding).
3. **+`id_10y`** alone → the key theory test. **If +0.29 is the duration+FX factor, this
   HOLDS/LIFTS it; if it DEGRADES, that is evidence the +0.29 was small-sample noise.**
   Keep iff IC ≥ baseline and placebo pctile ≥ 0.90.
4. **+`us_10y`** (paired with `id_10y`) → keep whichever (or the pair) maximises forward IC
   without redundancy.
5. **`us_real_10y`/`dxy`** → only after resolver fixes; **default REJECT on n=24** (multiple-
   testing). Test only if steps 2–4 leave headroom.
6. Run `backtest/bt.py "Healthcare Equipment"` after each step. **Confirmation criterion:**
   the scoped, FX+duration tree **holds the IC with a cleaner, theory-aligned driver set**
   AND, critically, **the IC persists as n_oos grows over time** (re-run periodically).
   **Falsifier:** if the theory-motivated duration leg *lowers* forward IC, or if the IC
   collapses once n_oos extends past ~40 months, the +0.29 was a small-sample artefact →
   downgrade the basket to attribution/low-confidence and lean on company-level analysis.

**Overriding instruction to the implementer:** **n_oos = 24 means this basket's SKILL flag
is provisional. Do not present +0.29 as a settled forecast, do not size on it, and do not
relabel the basket "high confidence." The drivers are theory-correct (import-USD cost +
defensive duration); the data is too thin to confirm the magnitude. Wire the clean tree,
keep it parsimonious, and let the sample grow before trusting the number.**

---
*Series cited exist in `plan/catalog/idind.json` (Healthcare/Medical Devices import series
`CEICI580035297`/`CEICI661052107`/`CEICI669240277`/`CEICI669602487` — each n158, P1M, USD,
last 2026-04; Pharma import-value `CEICI323782002`; investment `CEICI235844402`), `id.json`
(CPI Health `CEIC521347917` n41; consumer confidence `aIDCONIAR`; real retail `CEIC322851702`
n196; GDP `aIDGDPAR1`), `market.json` (`TVC:ID10Y` w798, `TVC:US10Y` w800, `DFII10` "US 10Y
Real" w800, `FX_IDC:USDIDR` w801, `TVC:DXY` w800; `TVC:BBDXY` **w0 = DEAD**), and
`mapping.py::GLOBAL_CORR`. Backtest figures from `BACKTEST.md` (Healthcare Equipment: fwd IC
+0.29, hit−up +0.19, placebo pctile 0.92, **n_oos 24**, SKILL, conf medium).*
