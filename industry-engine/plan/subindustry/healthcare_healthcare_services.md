# Healthcare Services (Healthcare) — Driver-Tree Plan

> Detail file for `IMPROVEMENT_PLAN.md` §4 · basket `healthcare_healthcare_services` ·
> sector Healthcare · mcap **~2.5T** · grade **perfected** · conf **medium** · kept **6** ·
> **forward OOS IC −0.03 (n_oos 58, hit−up −0.03, placebo pctile 0.42) — flag NONE.**
>
> **Verdict up front — READ THIS BEFORE THE TREE.** This is **not a sub-industry in any
> statistical sense — it is a 2-stock idiosyncratic basket** (PRDA Prodia + DGNS Diagnos,
> two clinical-diagnostics-lab operators). With only **two members**, the "basket return"
> is dominated by **company-specific** events — Prodia's branch-rollout / test-mix /
> corporate actions, Diagnos's micro-cap liquidity and AI-diagnostics story — **not** by
> any common macro factor. The blindfolded OOS confirms exactly this: **fwd IC −0.03 on
> n_oos 58, placebo percentile 0.42 (below the median of the null), flag NONE** — i.e. the
> theory-anchored driver posture has **no forward skill and is, if anything, very slightly
> anti-predictive**, indistinguishable from noise. **No systematic forecast is credible at
> this concentration.** This file does the honest two things: (1) lays out what the drivers
> *should* be on first principles (a clean defensive service-volume × tariff − labour − USD
> tree — the same family as Hospitals/Pharma), so the engine's *attribution* read is
> theory-correct; and (2) states plainly and repeatedly that with **n=2 names**, the basket
> is **idiosyncratic-dominated** and the engine must present it as **contemporaneous
> attribution / beta only — never as a forecast**, and defer to the LBC analysts'
> company-level work on Prodia and Diagnos. The §9 wiring keeps the tree theory-clean and
> parsimonious precisely so the engine does not *manufacture* false confidence from a
> two-stock signal.

---

## 1. Snapshot — a 2-name diagnostics-lab basket with no forward skill

**Members (2 names, ~2.5T total — one name is ~89% of the cap).** This is the most
concentrated basket in the Healthcare complex, and one of the most concentrated in the
whole 52-basket book. Both are **clinical-diagnostics-laboratory** operators — *non-
hospital* health services (lab testing, check-ups, diagnostics), distinct from the
Hospitals basket (MIKA/SILO/HEAL inpatient operators) and from Healthcare-Equipment
(device distributors/manufacturers).

| name | what it does | mcap | beta | role in basket |
|---|---|---|---|---|
| **PRDA** (Prodia Widyahusada) | **the anchor (~89% of cap)** — Indonesia's largest clinical-lab chain (~150+ labs / outlets): routine & specialty diagnostic tests, health check-ups, wellness/preventive screening. Test-volume × tariff model; quality, cash-generative, *defensive*. | **2.23T** | **−0.299** | **the basket IS effectively PRDA** |
| **DGNS** (Diagnos Laboratorium Utama) | small-cap clinical-lab / diagnostics operator with an AI-assisted-diagnostics angle; recent IPO, thin float, high retail-sentiment beta. | 0.29T | **0.776** | small, high-beta, idiosyncratic tail |

| field | value |
|---|---|
| current grade | **perfected** (a *fit* label — do NOT read as forecast confidence) |
| current confidence | **medium** (`_state.txt` / BACKTEST.md — should arguably be **low**, see §8) |
| kept drivers | **6** (`_state.txt`) — almost all auto-pulled CEIC quantity prints |
| current seed (`mapping.py`) | ceic `("Healthcare", None)` (the **WHOLE** Healthcare block); macro `id_gdp_real_q +1` — **a single macro leaf** |
| **forward OOS IC** | **−0.03** (BACKTEST.md — negative; no forward skill) |
| **n_oos** | **58** (BACKTEST.md — modest, but the real problem is n=2 *names*, not n=58 *months*) |
| hit-rate vs up-market | **−0.03** (no edge) |
| placebo percentile | **0.42** (below the median of the placebo null — worse than a coin-flip control) |
| flag | **NONE** (no forward skill — see §8) |

**The two distinct problems.** Note the *betas*: PRDA's is **−0.30** (it trades like a
defensive, almost counter-cyclical name), DGNS's is **+0.78** (a high-beta micro-cap). The
two members **point in opposite directions on the market factor** — so even the basket's
*market beta* partly cancels, leaving an aggregate that is mostly idiosyncratic. That is the
core reason the engine finds no systematic handle.

**The gap — different in kind from Pharma or Equipment.** Pharma's gap is *depth* (it has
real skill, +0.17, n_oos 129); Healthcare-Equipment's gap is *small sample* (a fragile
+0.29 on n_oos 24); **Healthcare-Services' gap is *concentration*: there is essentially no
common factor to model across two stocks.** Concretely:

1. **n = 2 names → idiosyncratic-dominated.** The "sub-industry return" is ~89% Prodia plus
   a noisy micro-cap tail. Company-specific events (branch openings, test-mix shifts, a
   buy-back, an index inclusion, DGNS's liquidity spikes) swamp any macro signal. **A
   driver tree built for a 20-name basket simply does not aggregate here.** This is the
   single most important fact about the basket and it is *structural*, not fixable by
   adding series.
2. **The seed pulls the ENTIRE Healthcare block (`("Healthcare", None)`)** — dragging in
   **30 Hospitals quantity prints + 27 Pharmaceuticals prints + 4 Medical-Devices import
   lines**, almost none of which is about a *diagnostics-lab* basket. These pad the "6 kept
   drivers" with coincident, publication-lagged noise.
3. **One thin macro leaf.** `id_gdp_real_q +1` is a defensible *structural* prior (health-
   service utilisation rises with affluence) but it is quarterly, lagged, and far too weak
   to be a forecaster — and the seed is **missing the defensive-duration handle** (`id_10y`
   / `us_10y`) that is the *only* theoretically-credible systematic leaf for a quality,
   negative-beta defensive like Prodia.

The job here is **not** to chase a forecast (there is none to chase). It is to (a) scope
the CEIC pull down to the few genuinely health-services-relevant series, (b) add the one
theory-correct duration leaf so the *attribution* is clean, and (c) **flag, loudly, that
this is a 2-stock idiosyncratic basket the engine should treat as attribution/beta only.**

---

## 2. Economic structure — how a diagnostics-lab basket makes money

**The revenue identity.** Both names run the same fundamental model — a **clinical-lab /
diagnostics service** business:

```
Revenue = Σ over [ PRDA (chain of labs/outlets) , DGNS (small lab + AI-diagnostics) ]
          ( test/visit VOLUME  ×  tariff per test )
          ▲ VOLUME : # patient visits × tests-per-visit (routine + specialty + check-up)
          ▲ TARIFF : price per test — part private-pay (out-of-pocket / corporate / insurer)
                     and part BPJS/insurer-administered (sticky, regulated)
Gross margin = Revenue − COGS, where COGS ≈ reagents/consumables (USD-priced) + lab labour
EBIT         = Gross margin − (branch network opex: rent, skilled-staff salaries, logistics)
```

- **Volume engine.** Test/visit volume is **defensive and structural** — it tracks
  health-seeking behaviour, chronic-disease screening, corporate health programmes,
  preventive check-ups, and **insurance/BPJS coverage** that brings more lives into formal
  diagnostics. The post-COVID story is **normalisation**: the 2021–22 COVID-PCR-testing
  spike unwound (a *negative* base effect for both names through 2022–23), and the
  structural driver reverted to routine clinical volume growing with access + affluence.
- **Tariff / price.** Part **private-pay** (out-of-pocket, corporate contracts, private
  insurers — repriceable, the higher-margin segment Prodia leans into), part **BPJS/insurer-
  administered** (regulated, sticky). The **margin swing** comes from **mix** (premium
  specialty tests + check-ups vs commodity routine tests) more than from headline tariff.
- **Cost stack — the margin swing factor.** Two cost pillars:
  - **Reagents / consumables / analysers — largely IMPORTED and USD-priced.** Lab reagents,
    test kits and instruments are overwhelmingly imported, so a weak IDR raises COGS with a
    pass-through that is **slow and partial** (private tariffs reprice with a lag; BPJS
    tariffs barely). → **USD/IDR is a genuine, if second-order, margin headwind.**
  - **Skilled labour & branch network (IDR).** Pathologists, lab technicians, phlebotomists,
    plus rent/utilities across the outlet network. Labour-cost inflation (domestic CPI /
    minimum-wage regime) is the dominant *domestic* cost and the reason the model has
    operating leverage: volume scales over a fixed branch cost base.
- **Defensive duration.** Prodia is a **quality, cash-generative, low-/negative-beta
  defensive compounder** on a premium multiple. To the extent the market prices it as a
  steady-grower bond-proxy, its valuation is **discount-rate-sensitive** — falling local
  yields → multiple expansion; rising yields → de-rating. **This is the *only* mechanism
  that could give the basket any systematic (non-idiosyncratic) forward sensitivity, and
  it is exactly the handle the current seed lacks.**

**What a sell-side analyst actually watches:** **test/visit volume & same-clinic growth**,
**revenue per test / test-mix (specialty & check-up share)**, **branch rollout & utilisation
ramp**, **private-pay vs BPJS/insurer mix**, **reagent cost / USD purchasing & inventory
days**, **EBITDA margin (operating leverage on the network)** — and, for the multiple, the
**10Y yield** and broad-market risk appetite for defensives. Crucially, **most of this is
company-level data that does not exist as a macro series** — which is *why* the engine has
nothing to forecast with.

**Intra-basket dispersion — the crux.** PRDA *is* the basket (~89% cap), a defensive
negative-beta lab compounder; DGNS is a tiny, high-beta, illiquid micro-cap whose returns
are driven by float dynamics and a thematic AI story. **The two have opposite market betas
(−0.30 vs +0.78) and almost no shared systematic factor beyond "Indonesian healthcare."**
The aggregate basket return is therefore **dominated by PRDA's idiosyncratic path with a
noisy DGNS overlay** — the textbook definition of a basket where a factor model has no
purchase.

---

## 3. DEMAND driver tree

Diagnostics-service demand is **defensive and structural** (health need + screening +
insurance/BPJS coverage + post-COVID normalisation), so the *level* is non-cyclical. The
forecastable variation would be **healthcare-access / coverage volume** and **real-income-
driven private diagnostics** — but, as in Hospitals, the CEIC quantity prints are
**publication-lagged → attribution, not forecast**, and the timely demand handles are weak
*macro* income proxies. **With only 2 member names, even a perfectly-measured demand series
would not aggregate into a forecastable basket signal — treat every leaf here as
attribution context, not a predictor.**

```
DEMAND
├── D1 healthcare access / insurance & BPJS coverage  (the volume engine)
│   ├── D1a hospital/health-services financing (OJK)  → CEICI462441447 (dem,IDR bn, n85, P1M, ~6m lag)
│   └── D1b [NO DIRECT BPJS / diagnostics-coverage SERIES IN STORE — gap]  ← the real leading node
├── D2 real income & private-pay diagnostics  (out-of-pocket / corporate / private insurer)
│   ├── D2a consumer confidence / income expectations → id_consumer_confidence → aIDCONIAR (M, deep, timely)
│   ├── D2b retail sales (real mass-consumption proxy) → id_retail → aIDRSLSAR (M, deep, timely)
│   └── D2c real GDP (affluence / utilisation backdrop)→ id_gdp_real_q → aIDGDPAR1 (Q, lagged) — WIRED
├── D3 health-service price / tariff level  (revenue-per-test, partial)
│   └── D3a CPI: Health                                → CEIC521347917 (—, 2022=100, n41, P1M, timely)
│   └── D3b CPI weight: Hospital/Health Fees           → CEICI523280047 (dem,%, n53, P1M)
└── D4 structural utilisation backdrop  (per-capita health spend — annual)
    ├── D4a HH expenditure: Private Hospital (Total)    → CEICI261015903 (dem,IDR, n23, P1Y) — annual
    └── D4b Hospital beds per 1000                      → CEICI271671702 (—, Number, n35, P1Y) — annual
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **D1a OJK health financing** | `CEICI462441447` | demand | **+1** | **0** (lag) | OJK financing distribution to hospital/health services = proxy for system health-spend flow reaching diagnostics. **n85, monthly, but ~6m publication-lagged** (last_obs 2025-08). Coincident-to-lagging → **attribution.** The closest thing to a "coverage volume" series we hold. |
| **D1b BPJS/diagnostics coverage** | — | demand | +1 | — | The *real* leading node — BPJS covered-lives × diagnostics utilisation / referral volume — is a **policy/administrative quantity, not a series in the store.** Unobservable → gap. |
| **D2a consumer confidence** | `aIDCONIAR` | demand | **+1** | **+1** | Income expectations → private-pay (out-of-pocket / corporate) diagnostics & elective check-ups — the higher-margin segment Prodia leans into. **Monthly, deep, timely.** The cleanest *timely* demand handle, but modest (private-pay is a minority of total volume). |
| **D2b retail sales** | `aIDRSLSAR` | demand | +1 | 0 | Real mass-consumption / discretionary proxy for out-of-pocket health spending. **Monthly, deep, timely.** Coincident → attribution-grade. |
| **D2c real GDP** | `aIDGDPAR1` | demand | +1 | 0 | Affluence / healthcare-utilisation backdrop. **Quarterly, lagged** → weak structural prior. **WIRED.** |
| **D3a CPI: Health** | `CEIC521347917` | demand | **+1** | 0 | Health-service price level = tariff/fee inflation = revenue-per-test. **Monthly, n41 only (2023→), timely (last 2026-05) → short history, weak power.** Coincident → attribution. |
| **D3b CPI weight: Health/Hospital fees** | `CEICI523280047` | demand | +1 | 0 | Share of household budget on inpatient/health care = structural demand intensity. **Monthly, n53.** Coincident → attribution. |
| **D4a HH expend: private hospital** | `CEICI261015903` | demand | +1 | 0 | Per-capita private-hospital/health spend. **Annual (n23)** → useless for monthly forecasting; pure structural attribution. |
| **D4b beds per 1000** | `CEICI271671702` | demand | +1 | 0 | Structural healthcare-capacity backdrop (diagnostics rides hospital/clinic build-out). **Annual (n35)** → thesis backdrop only. |

**Sub-driver chain on the top demand driver (D1, coverage/utilisation volume):**
`insurance/BPJS coverage & screening policy → covered-lives × diagnostics-utilisation rate →
test/visit VOLUME → lab revenue → earnings → price`. **We hold none of the leading nodes** —
BPJS diagnostics coverage and test-volume are company/policy data, not series; the closest
proxy (OJK health financing) sits at the *lagged, coincident* end. So the forecastable
demand variation does **not** live in the volume branch — at best it lives, weakly, in
**D2 (real income → private-pay)** via `aIDCONIAR` (+1 lead). **And even that weak handle
cannot rescue a 2-name basket.**

**Honest read on the demand tree:** the only somewhat-relevant series are **lagged,
coincident attribution prints** (OJK financing, health CPI, HH-spend). The volume engine
(BPJS coverage, test volume, same-clinic growth) is **unobservable at the leading node and,
critically, is company-specific to Prodia/Diagnos.** Net: ~7 demand leaves, all
attribution-grade except a modest `aIDCONIAR` — **and none forecastable at n=2 names.**

---

## 4. SUPPLY / COST driver tree — imported reagents (USD) + domestic labour

The cost side has two real pillars, but neither is a strong *liquid leading price* the way
a commodity is for, say, Cement — and on a 2-name basket neither aggregates into a forecast.

```
SUPPLY / COST
├── S1 imported reagent / consumable / analyser cost  (USD — the margin headwind)
│   ├── S1a USD/IDR                                    → usdidr → FX_IDC:USDIDR (D, deep, LEADS)
│   ├── S1b DXY (broad USD / EM import-cost regime)    → dxy → **TVC:DXY** (current BBDXY = DEAD, §7)
│   └── S1c Medical-device / instrument imports (USD)  → CEICI580035297 (dem,USD, n158, P1M, lag)
├── S2 domestic labour & branch-network cost  (IDR — the dominant operating cost)
│   └── S2a CPI YoY (wage/overhead inflation regime)   → id_cpi_yoy → ECONOMICS:IDIRYY (M, timely)
├── S3 health-service price level  (selling tariff = revenue-per-unit, partial cost offset)
│   └── S3a CPI: Health                                → CEIC521347917 (—, 2022=100, n41, P1M)
└── S4 capacity / investment build  (structural — lagged)
    └── S4a Health/pharma investment realization (FDI/DDI) → CEICI235844402 (USD mn, n145, P3M, lag)
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **S1a USD/IDR** | `FX_IDC:USDIDR` | **cost** | **−1** | **+1 to +3** | **The cleanest cost leaf — imported, USD-priced reagents/consumables/analysers.** IDR weakness raises lab COGS with an inventory/purchasing lag; private tariffs reprice slowly, BPJS barely → margin squeeze. **Daily, deep, exogenous, leading.** BUT diagnostics is *less* import-levered than a device distributor (labour-heavy model), so the elasticity is **modest** — and on 2 names it does not aggregate into forward skill. NOT currently wired → **add as the cost pillar.** |
| **S1b DXY** | `TVC:DXY` | cost/macro | −1 | +1 | Broad USD strength = EM-wide import-cost + risk-off. **Daily, deep.** **NB: current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** Redundant with `usdidr` → **default SKIP** (especially on a 2-name basket where extra correlated leaves only add noise). |
| **S1c device/instrument imports** | `CEICI580035297` | cost | −1 | 0 | Realised USD import bill for instruments/appliances (UN Comtrade) = the reagent/analyser cost echo *after the fact*. **n158, deep, fresh (last 2026-04), but ~2m lagged + confounds volume with FX.** Attribution confirmation, not a forecaster. |
| **S2a CPI YoY** | `ECONOMICS:IDIRYY` | cost | **−1** | 0 | **The dominant domestic cost** — skilled-labour wages + branch overhead inflation. Monthly, timely. Coincident; weak forward. Optional. |
| **S3a CPI: Health** | `CEIC521347917` | cost/demand | ambiguous | 0 | Health price level = diagnostics tariff = revenue-per-test (partial FX/labour offset, to the extent labs pass cost through). **Monthly, n41 only → short, weak.** Sign ambiguous (revenue + vs input-cost echo +). Attribution. |
| **S4a investment realization** | `CEICI235844402` | supply | +1 | 0 | FDI/DDI into health/pharma capacity = structural build (proxy for lab/clinic capex backdrop). **Quarterly (P3M), n145, lagged** → backdrop only. |

**Sub-driver chain on the top cost driver (S1, imported reagent cost):**
`Fed funds / DXY / risk-off → USD/IDR → USD reagent/analyser COGS (1–3m inventory lag) →
gross margin → earnings → price`. The leading, observable node is **USD/IDR** (daily,
exogenous); the trailing realised node is the import-value print (lagged). So the cost tree
*does* have a clean leading handle at the top — but its **elasticity is small** (labour-heavy
model) and it **cannot generate forward skill on a 2-name basket.**

**Honest read on the supply/cost tree:** the imported-reagent cost maps to a liquid leading
FX price (`usdidr`), and the dominant domestic cost is labour (CPI). Both are theory-correct
*attribution* leaves. **Neither is a forecaster here** — diagnostics is less import-levered
than the device basket, and 2 names cannot average out idiosyncratic noise. Net: one
theory-clean FX-cost leaf to add (`usdidr −1`), plus a CPI labour echo (optional).

---

## 5. MACRO / RATE / FX / FLOW — the missing defensive-duration leg (+ FX cost)

This is where the *only* theoretically-systematic branch lives — and the seed currently has
**none of it**. PRDA's **−0.30 beta** is the tell: it behaves like a **defensive, rate-
sensitive bond-proxy**, exactly the family that gives Pharma (+0.17) and Hospitals' *only*
systematic leaf their duration sensitivity. The honest expectation, though, is that even a
correctly-specified duration leg **will not produce forward skill on 2 names** — it is added
to make the *attribution* theory-complete and to capture PRDA's defensive re-rating, not to
forecast.

| driver | series (RIC) | role | sign | LEAD | mechanism · forecast hypothesis |
|---|---|---|---|---|---|
| **`id_10y`** govt 10Y | `TVC:ID10Y` | macro | **−1** | **+1 to +3** | **ADD (priority 1).** PRDA is a defensive lab-compounder on a premium multiple with **negative beta** → its valuation is local-discount-rate-elastic (the bond-proxy re-rating that anchors Pharma +0.17). Falling ID 10Y → multiple expansion; rising → de-rating. **Daily, deep (weekly_obs 798), exogenous, leading.** The single best *theory-motivated* leaf — but expect it to lift *attribution*, not necessarily forward IC, given n=2. |
| **`us_10y`** UST 10Y | `TVC:US10Y` | macro | **−1** | **+1 to +3** | **ADD (priority 2).** Global discount rate / EM-duration — the global leg of the same defensive re-rating. **Daily, deep (weekly_obs 800), leading.** Test paired with `id_10y`; keep whichever holds without redundancy. |
| **`usdidr`** | `FX_IDC:USDIDR` | **macro/cost** | **−1** | **+1 to +3** | **ADD (priority 3).** Twofold negative: (i) imported-reagent USD-cost squeeze (§4 S1a — modest, labour-heavy model), (ii) EM-outflow/risk-off proxy that pressures the illiquid DGNS tail. **Daily, deep, exogenous, leading.** Theory-correct; small elasticity. |
| **`id_gdp_real_q`** | `aIDGDPAR1` | demand | +1 | 0 | **WIRED (the only current leaf).** Affluence / healthcare-utilisation backdrop. **Quarterly, lagged** → weak structural prior; keep, expect no monthly forecast skill. |
| **`id_consumer_confidence`** | `aIDCONIAR` | demand | +1 | +1 | **CONSIDER.** The one timely demand handle (private-pay up-trade); modest. |
| **`dxy`** | **`TVC:DXY`** | macro | −1 | +1 | Broad-USD / EM risk-off amplifier. **Resolver bug: current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** Double-counts `usdidr`+`us_10y` → **default SKIP.** |

**Why duration *should* lead here (theory) — and why it still won't forecast (data).** A
defensive grower's price ≈ (steady earnings) / (discount rate − growth); with near-non-
cyclical diagnostics demand, much of PRDA's price variance is the **discount-rate
denominator** → it behaves like a long-duration bond and re-prices when yields move, before
earnings news. This is the exact mechanism behind Pharma's *trustworthy* +0.17 on n_oos 129.
**The difference is sample structure, not mechanism: Pharma averages that re-rating across
~15 quality defensives; here we have 1.x usable names (PRDA + a noisy micro-cap), so the
common duration signal is buried under Prodia's idiosyncratic path and DGNS's float noise.**
Adding `id_10y`/`us_10y` is the right way to make the *attribution* theory-complete — but
the §8 backtest is the arbiter, and at n=2 the honest prior is "no forward skill."

**Flow note.** DGNS is a tiny, illiquid, retail-sentiment-driven micro-cap; in EM risk-off
(`usdidr`↑, `us_10y`↑) it de-rates with the small-cap complex, while PRDA (negative beta)
often does the *opposite*. **The two legs partly cancel on the market/flow factor** — another
reason the aggregate has no clean systematic handle. Keep the flow read inside the FX/rate
handles; do not multiply correlated leaves on a 2-name basket.

**The macro verdict:** the **defensive-duration leg (`id_10y`/`us_10y`, to add) + the FX-
cost handle (`usdidr`, to add)** are the theory-correct systematic leaves and will improve
the *attribution*. **But the backtest already says the posture does not forecast (IC −0.03,
placebo 0.42, NONE), and n=2 names means that is unlikely to change** — see §8.

---

## 6. Cross-industry linkages

| linked sub-industry | borrowed series | direction | rationale |
|---|---|---|---|
| **Hospitals** (Healthcare, NONE, −0.02→−0.07) | `CEICI462441447` OJK health financing; `CEICI271671702` beds/1000; `usdidr` | shared demand + **reference** | **The closest sibling — same BPJS/coverage volume engine, same attribution-only verdict.** Hospital build-out is the downstream capacity that drives diagnostics referral volume. Hospitals is the reference for *how an honest "macro can't forecast this" Healthcare basket reads*. |
| **Pharma** (Healthcare, +0.17, n_oos 129) | `id_10y`/`us_10y` duration; `usdidr` (imported inputs) | shared factor + **reference** | **Same defensive-duration recipe** — Pharma is the *trustworthy, well-diversified* version; Healthcare-Services is the *same mechanism on 2 names*. Pharma shows what a credible forward IC looks like and why diversification (15 names) is what makes its duration signal survive. |
| **Healthcare Equipment** (Healthcare, +0.29, n_oos 24) | medical-device/instrument imports `CEICI580035297`; `usdidr` | shared cost | The reagent/analyser import-cost channel is the same USD-import pillar; Equipment shows the FX-cost mechanism (and its own small-sample fragility). |
| **Insurance** (Financials, +0.15, marginal) | private-health-insurance premium growth / coverage (insurer book) | upstream demand | **Insurance penetration is a structural demand driver for private-pay diagnostics** (insurers fund check-ups & specialty tests). The brief's "insurance penetration (cross-ref Insurance)" maps here — but **no clean ID monthly *health-insurance-premium* series exists in the store** (Insurance's own tree leans on premium-growth + investment-yield proxies), so this is a *conceptual* cross-ref, not a wireable series. Noted to avoid a spurious wire. |
| **Banks / Multifinance** | OJK health-services financing (`CEICI462441447`) | upstream | Health-spend financing originates in the banking/multifinance system; the OJK financing series is re-used as a (lagged) demand proxy for D1. |

---

## 7. Currently wired vs available

| status | driver | series (RIC) | role/sign | note |
|---|---|---|---|---|
| **WIRED — keep (weak prior)** | `id_gdp_real_q` | `aIDGDPAR1` | demand +1 | the *only* current macro leaf; quarterly/lagged structural prior. Keep, expect no forecast. |
| **WIRED — ceic block (SCOPE DOWN)** | `("Healthcare", None)` (**whole** block: 30 Hospitals + 27 Pharma + 4 Med-Device prints) | auto | mixed | **the main config bug — pulls the entire Healthcare category** incl. irrelevant Hospitals/Pharma quantity prints. Scope to the few health-services-relevant series; let the data-quality gate cull annual/short. |
| **ADD (priority 1)** | `id_10y` | `TVC:ID10Y` | macro −1 | the missing **defensive-duration** leg (PRDA bond-proxy re-rating; −0.30 beta). Theory-correct; improves attribution. |
| **ADD (priority 2)** | `us_10y` | `TVC:US10Y` | macro −1 | global duration leg; deepens the same channel. |
| **ADD (priority 3)** | `usdidr` | `FX_IDC:USDIDR` | macro/cost −1 | imported-reagent USD-cost squeeze + EM risk-off on the DGNS tail. Modest elasticity (labour-heavy). |
| **CONSIDER** | `id_consumer_confidence` | `aIDCONIAR` | demand +1 | the one timely demand handle (private-pay up-trade); modest. |
| **CONSIDER (re-role)** | device/instrument imports | `CEICI580035297` | cost −1 | re-role from demand→cost so the FX channel isn't double-counted as pure demand; attribution either way. |
| **CONSIDER** | `id_cpi_yoy` | `ECONOMICS:IDIRYY` | cost −1 | domestic labour/overhead cost echo (the dominant operating cost); coincident → attribution. |
| **FIX (BUG, global)** | `dxy` resolver | `TVC:BBDXY` → **`TVC:DXY`** | — | **current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** Any `dxy` use is silently null. (Global; flag — out of scope to edit here.) |
| **SKIP (annual/lagged)** | HH-expend, beds/1000, GDP-VA, investment-realization, by-province | `CEICI261015903` / `271671702` / `365…` / `235844402` / provincial | — | annual/quarterly + lagged → zero monthly-forecast value; most of the noise the whole-Healthcare pull drags in. |
| **SKIP (default)** | `dxy` as a leaf | `TVC:DXY` | — | double-counts `usdidr`+`us_10y` risk-off; avoid extra correlated leaves on a 2-name basket. |
| **UNAVAILABLE (the real demand node)** | BPJS diagnostics coverage · clinical test/visit VOLUME · same-clinic growth · test-mix · branch rollout (Prodia/Diagnos company data) | — | **policy/company data, not series.** The leading volume node — and almost everything that actually moves these two stocks — is **idiosyncratic and unobservable to the engine.** |

---

## 8. Forecastability — NONE flag; an idiosyncratic 2-stock basket; attribution only

**This is the most important section. The engine has NO forward skill on this basket, and
the reason is structural — it is a 2-stock basket, not a sub-industry.** Tied to the
backtest:

1. **n = 2 *names* is the disqualifier — not n = 58 *months*.** Diversified baskets (Pharma
   15, Coal multi-name) average idiosyncratic noise away, leaving a common macro factor the
   engine can forecast. **Two names cannot.** The basket return is ~89% Prodia + a noisy
   Diagnos micro-cap, so it *is* Prodia's idiosyncratic path (branch rollout, test-mix,
   corporate actions, index events) plus float noise. **No driver tree, however well
   specified, can forecast that with macro series.** This is a hard ceiling on what the
   engine can claim here.
2. **The OOS confirms it directly.** **fwd IC −0.03, hit−up −0.03, placebo percentile 0.42,
   flag NONE.** The posture is *very slightly anti-predictive* and **below the median of the
   placebo null** — i.e. statistically indistinguishable from (slightly worse than) a random
   control. There is no signal to lean on. The −0.03 is not "small skill," it is **noise.**
3. **The opposing betas compound the problem.** PRDA beta −0.30, DGNS beta +0.78 — the two
   members point in **opposite directions on the market factor**, so even the basket's market
   beta partly cancels. Whatever common signal a duration/FX tree captures in PRDA is offset
   by DGNS, leaving an aggregate with no clean factor exposure to forecast.
4. **The SIGN of the tree is still theory-correct — which matters for *attribution*.** The
   posture (defensive duration `id_10y −1`, imported-reagent FX `usdidr −1`, income/
   utilisation `+1`) is mechanistically sound and matches Pharma/Hospitals. So the engine's
   **contemporaneous attribution** (why did the basket move *this* month?) is theory-aligned
   and useful as *context*. The **forward** claim is what fails — and at n=2 names it is
   *expected* to fail.
5. **Contemporaneous vs forward.** As everywhere, contemporaneous co-movement (FX → reagent
   margin; yields → PRDA multiple) is more reliable than the forward IC. Even so, here the
   contemporaneous read is **diluted by the idiosyncratic dominance** — present it as "this
   is the macro backdrop," not "this is why the basket will move."
6. **What would (modestly) IMPROVE the attribution — NOT create a forecast.** (i) **Scope
   the CEIC pull** down to health-services-relevant series → removes Hospitals/Pharma
   coincident noise, makes the "6 kept drivers" honest. (ii) **Add the duration + FX legs**
   → theory-complete the attribution; if they HOLD the (already-zero) IC, fine; if they lift
   it toward zero from −0.03, that is *attribution cleanup*, not forecast skill. **Do not
   interpret any tick-up as "the basket now forecasts."**
7. **What would (falsely) BREAK it — guard against this.** (i) Piling correlated leaves
   (`dxy` + `usdidr` + `us_10y` + `id_10y`) onto a 2-name basket → multiple-testing noise.
   (ii) **Promoting the basket above attribution/low confidence** because a duration leg
   nudged the IC — on 2 names that is over-fitting, not skill.

**Concession — stated plainly.** **This basket is attribution / beta ONLY. There is no
credible systematic forecast, and at a 2-name concentration there cannot be one.** The
engine should present Healthcare-Services as: *"a 2-stock idiosyncratic basket (Prodia +
Diagnos); the macro tree is theory-correct (defensive-duration + imported-reagent FX +
income-driven utilisation) and explains the backdrop contemporaneously, but the blindfolded
OOS shows no forward skill (IC −0.03, placebo 0.42, NONE), and with two names dominated by
company-specific events, none is achievable. Defer to company-level analysis of Prodia and
Diagnos."*

**Confidence: MEDIUM → should be LOW.** The "medium" label overstates it; this basket
warrants **low / attribution-only**. **Do not let any post-cleanup IC nudge drive position
sizing or override the LBC analysts' company work on PRDA/DGNS.**

---

## 9. Engine-wiring spec (`mapping.py`)

Concrete, minimal, **concentration-aware** change to the `"Healthcare Services"` SEED.
Guiding principle: **scope the CEIC pull down, add the theory-correct duration + FX legs so
the *attribution* is clean and complete, keep it parsimonious (this is a 2-name basket —
extra correlated leaves only add noise), and — above all — do NOT present the result as a
forecast.** Every change is gated on the backtest, but with the explicit understanding that
the honest target is *cleaner attribution*, not forward IC (which is structurally ~0).

```python
"Healthcare Services": {
    # SCOPE DOWN: the current ("Healthcare", None) pulls the WHOLE Healthcare block
    # (30 Hospitals + 27 Pharma + 4 Med-Device prints) — almost all irrelevant noise for a
    # 2-name diagnostics-lab basket. Keep only the genuinely health-services-relevant slice.
    # (Hospitals carries the OJK financing + health-CPI + per-capita-spend series we want;
    #  exclude the build/throughput prints that are about inpatient operators, not labs.)
    "ceic": [("Healthcare", "Hospitals")],
    # Re-role the realised device/instrument-import bill as a (lagged) COST echo (reagents/
    # analysers), not pure demand, so the FX channel isn't double-counted as demand:
    "ceic_override": [
        ("import: world (un comtrade)", "cost", -1),   # CEICI580035297 — USD reagent/instrument cost
    ],
    # Cull the annual/structural prints the gate would otherwise keep as coincident noise:
    "ceic_exclude": [
        "number of hospitals", "by province",          # annual hospital build — no monthly value
        "job postings", "hospital count",              # LinkUp inpatient-operator labour signals — not labs
        "hh expenditure", "beds per 1000",             # annual per-capita / capacity backdrop
        "investment realization", "gross domestic product",
    ],
    "globals": [],
    "macro": [
        # ---- DEFENSIVE-DURATION leg (the missing, most-defensible attribution handle). ADD. ----
        ("id_10y",  "macro", -1, "ADD p1: PRDA defensive lab-compounder (beta -0.30) = bond-proxy duration re-rating (same factor as Pharma +0.17)"),
        ("us_10y",  "macro", -1, "ADD p2: global discount-rate / EM-duration leg of the same re-rating"),
        # ---- FX-COST pillar (imported USD reagents/analysers; EM risk-off on the DGNS tail). ADD. ----
        ("usdidr",  "macro", -1, "ADD p3: imported-reagent USD-cost squeeze (modest, labour-heavy model) + EM risk-off on illiquid DGNS"),
        # ---- DEMAND backdrop (weak; keep parsimonious on a 2-name basket). ----
        ("id_gdp_real_q", "demand", +1, "WIRED: quarterly/lagged healthcare-utilisation backdrop (weak prior)"),
        # ("id_consumer_confidence", "demand", +1, "OPTIONAL: private-pay up-trade — add only if it holds attribution without padding"),
        # ---- DO NOT add dxy: double-counts usdidr+us_10y, AND the global resolver
        #      dxy->TVC:BBDXY is DEAD (weekly_obs 0). On a 2-name basket, correlated leaves = noise. ----
    ],
},
```

**Resolvers already present** (no new resolver needed for this spec): `id_10y → TVC:ID10Y`,
`us_10y → TVC:US10Y`, `usdidr → FX_IDC:USDIDR`, `id_gdp_real_q → aIDGDPAR1`,
`id_consumer_confidence → aIDCONIAR`, `id_cpi_yoy → ECONOMICS:IDIRYY`, `id_retail → aIDRSLSAR`.

**Resolver bug to fix (global, flag — affects every basket that uses `dxy`):**
```python
"dxy": "TVC:DXY",          # was "TVC:BBDXY" → DEAD (weekly_obs 0). TVC:DXY has weekly_obs 800.
```

**Falsifiable backtest plan (keep-rule: do NOT degrade; the honest target is cleaner
*attribution*, not forward IC — which is structurally ≈0 at n=2 names):**
1. **Baseline** = current seed (`("Healthcare", None)`, `id_gdp_real_q +1`) → reproduce
   **fwd IC −0.03, n_oos 58, placebo pctile 0.42, NONE.** Confirm the no-skill baseline.
2. **Scope-down ceic** to `("Healthcare", "Hospitals")` (+ override/exclude) → expected to
   **hold ≈0** while removing irrelevant Hospitals-throughput/Pharma noise; makes the "6
   kept drivers" honest. Keep iff non-degrading.
3. **+`id_10y`** alone → the key theory test. **If the basket has *any* latent defensive-
   duration exposure (via PRDA), this lifts the IC toward 0 / slightly positive; if it does
   nothing, that confirms the idiosyncratic-dominance read.** Keep iff IC ≥ baseline.
4. **+`us_10y` + `usdidr`** (paired) → keep whichever combination holds the IC without
   redundancy; drop any leaf that degrades it.
5. **`dxy`** → only after the resolver fix, and **default REJECT** (redundant; noise on 2
   names).
6. Run `backtest/bt.py "Healthcare Services"` after each step. **Confirmation criterion:**
   the scoped, theory-complete tree **holds the IC at/near zero with a cleaner, honest
   driver set** — i.e. it improves *attribution* without manufacturing false forward skill.
   **Falsifier / hard stop:** if any change pushes the basket toward a *positive* IC that
   the placebo does **not** validate (pctile < 0.80), treat it as over-fitting on 2 names,
   not skill — revert and keep the basket at **attribution / low confidence.**

**Overriding instruction to the implementer:** **Healthcare-Services is a 2-stock
idiosyncratic basket (PRDA ~89% + DGNS), not a forecastable sub-industry. The OOS is NONE
(IC −0.03, placebo 0.42) and that is structural, not fixable. Wire the theory-clean tree
(defensive duration + imported-reagent FX + income/utilisation) ONLY to make the engine's
*contemporaneous attribution* correct. Do NOT present any IC, do NOT size on it, and do NOT
relabel the basket above attribution/low-confidence. The signal that actually moves these
two stocks is company-specific (Prodia's branch/test-mix/corporate actions; Diagnos's
micro-cap liquidity & AI story) and belongs to the LBC analysts, not the macro engine.**

---
*Series cited exist in `plan/catalog/idind.json` (OJK health financing `CEICI462441447`
n85 P1M last 2025-08; CPI weight health/hospital `CEICI523280047` n53 P1M; HH-expend private
hospital `CEICI261015903` n23 P1Y; beds/1000 `CEICI271671702` n35 P1Y; med-device/instrument
imports `CEICI580035297` n158 P1M last 2026-04; pharma import `CEICI323782002` n172 P1M;
investment `CEICI235844402` n145 P3M), `id.json` (CPI Health `CEIC521347917` n41 P1M last
2026-05; consumer confidence `aIDCONIAR` P1M; retail `aIDRSLSAR` P1M; GDP `aIDGDPAR1` P3M;
CPI YoY `ECONOMICS:IDIRYY`), `market.json` (`TVC:ID10Y` w798, `TVC:US10Y` w800,
`FX_IDC:USDIDR` w801, `TVC:DXY` w800; `TVC:BBDXY` **w0 = DEAD**), and `mapping.py::GLOBAL_CORR`.
Backtest figures from `BACKTEST.md` (Healthcare Services: fwd IC −0.03, hit−up −0.03, placebo
pctile 0.42, **n_oos 58**, flag NONE, conf medium). Member betas (PRDA −0.299, DGNS +0.776)
and mcaps from `state/worklist.json`.*
