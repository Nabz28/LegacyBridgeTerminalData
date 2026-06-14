# Energy Services — Driver Tree

> `basket_id: energy_energy_services` · sector **Energy** · priority 9 ·
> mcap **320.8T** · **n_members = 11 (n_used = 10)** · grade **partial** ·
> kept **12/48** · **forward OOS IC +0.121 (placebo 92nd pctile → SKILL)** ·
> contemporaneous IC **+0.17 (placebo 100th pctile)**.
>
> This basket **already has forward skill** — it is one of the eight perfected/partial
> baskets the master backtest flags as genuinely predictive (BACKTEST.md §"the pattern":
> *"Forward skill is concentrated in physical-commodity / cost-pass-through baskets —
> coal, **energy services**, plantation-adjacent, machinery (coal capex)…"*). The job here
> is **not** to rescue a broken model; it is to **deepen the activity→contractor-revenue
> lead** that already works, replace the engine's stale/noisy top leaves with the clean
> company operating series the store actually holds, and fix two live data bugs without
> breaking the skill. The thesis to sharpen: **these are coal-mining CONTRACTORS — their
> revenue tracks mining ACTIVITY & capex (overburden, volumes, equipment orders), not just
> the coal price.** The engine currently leans on coal *price/value* prints; the edge is in
> the *activity* prints it under-uses.

---

## 1. Snapshot — what the basket is, and the gap

**Members (11; 10 used — coverage 798W / 184M / 61Q, 2011-01 → 2026-05):**

| Symbol | mcap | what it does | driver family |
|---|---|---|---|
| **CDIA** | 93.6T | Petrindo/Barito-linked coal-services & infra (recent listing) | coal-mining activity (short history → `n_used` drops it) |
| **DSSA** | 84.3T | Dian Swastatika Sentosa — Sinarmas **energy** (power, coal, digital/data-centre) | coal + power + USD energy revenue |
| **TCPI** | 56.6T | Transcoal Pacific — coal **barging/marine logistics** | coal haulage volume |
| **PTRO** | 37.8T | **Petrosea** — coal-mining contractor (EPC + mining services) | overburden/volume, capex |
| **DEWA** | 15.4T | **Darma Henwa** — coal-mining contractor | overburden/volume, capex |
| **BIPI** | 11.7T | Astrindo/Benakat — energy & coal-infra | coal + energy |
| **ABMM** | 6.5T | **ABM Investama** — integrated coal contractor (mining services + own mines + power) | activity + coal price |
| **ELSA** | 4.8T | **Elnusa** — upstream **oil & gas services** (seismic, drilling, OFS) | Brent capex cycle |
| **SGER** | 4.6T | Sumber Global Energy — **coal/energy trading & supply** | coal price × volume |
| **SURE** | 3.8T | Super Energy — LPG/gas distribution | gas volume |
| **DOID** | 1.5T | **Delta Dunia / BUMA** — the largest pure coal-mining **contractor** | overburden/volume, capex |

\* `CDIA` is excluded by `n_used` (insufficient price history); the realised signal is the
equal-weight return of the other 10. `weight_cap 0.12`, `equal_weight`.

**The economic centre of gravity.** Despite DSSA's headline mcap, the basket's *identity*
and its *driver coherence* come from the **coal-mining contractors** — DOID/BUMA, PTRO,
DEWA, ABMM — plus the coal-haulage/trading names (TCPI, SGER) and one oil-services outlier
(ELSA). A contractor like BUMA or Petrosea is paid **per bcm of overburden moved and per
tonne of coal mined** under multi-year USD-denominated contracts. Its revenue is therefore
a function of **mine production volume and stripping ratio**, which is driven by the coal
*price cycle* with a lag (miners ramp output and capex when prices are high), **not** by the
spot coal price directly. That one-step-removed, lagged, activity-driven structure is
exactly why the basket forecasts: the liquid coal price leads, the activity follows, and the
contractor equity re-rates on the activity outlook.

**Current model state (`output/energy_energy_services.json`).** Verdict **NEUTRAL [53/100,
low confidence]**, `net_tilt +0.135`, `demand_tilt +0.251` vs `supply_tilt +0.09`,
`macro_tilt 0.0`, **`model_conflict = true`**. Confidence reasons: `max|corr|=0.25`,
`theory_agree=100%`, `stable=75%`, `mvR2=0.09`, `OOS=56%`, `mt_penalty=0.71(n=48)`,
`model_conflict→downgraded`. Kept **12 of 48** candidates.

**The gap (one line).** The engine is a *working forecaster running on second-best fuel*:
its kept set is dominated by coal **price/export-value** prints (Newcastle/API2, "Value:
Coal Briquettes", "Value: Coal Coke", "Mining Products: Coal") and a **stale** natural-gas
*production* series — while the **direct contractor-activity series** (BUMA/Petrosea
overburden + production, Komatsu mining-equipment orders) that map one-to-one onto these
companies' P&L are **in the store and barely used**. Deepening = swap the activity series in,
demote the redundant export-value prints, fix the two FX/LNG data bugs, and keep the
coal-price lead as the *regime* that conditions the activity.

---

## 2. Economic structure — how a coal-services basket makes money

**Revenue identity (the contractor core, DOID/PTRO/DEWA/ABMM):**

```
contractor_revenue ≈  Σ ( overburden_bcm × strip_rate_USD )  +  ( coal_tonnes × mining_fee_USD )
gross_margin       ≈  revenue − ( diesel + explosives + tyres + equipment_depreciation + labour )
```

- **Volume side (the demand the basket actually sells into):** total **overburden removed
  (bcm)** and **coal mined (tonnes)** across client mines. This is the cleanest read on
  contractor topline and is *the* thing a sell-side analyst tracks (BUMA/Petrosea publish
  monthly OB + production; Komatsu unit sales proxy the fleet/capex build).
- **Price side (what conditions the volume):** the **coal price cycle** (API2 / HBA). High
  prices → miners maximise output, lift strip ratios, and award new capex/contracts →
  contractor volumes rise **6–18 months later**. Low prices → mines defer waste removal and
  re-tender rates down. So coal price is a **leading regime variable**, not a direct revenue
  line, for the contractor sleeve.
- **Cost side (the margin swing):** **diesel/fuel** (Brent-linked) is 25–35% of a
  contractor's cash cost; a coal spike that is *also* an oil spike compresses the very margin
  it should expand. Tyres/steel/explosives and **equipment depreciation** (USD capex) round
  out the stack. Rising **USD/IDR** is *double-edged*: revenue is USD-contracted (helps) but
  imported diesel/equipment is USD-priced (hurts) — net positive for the integrated names,
  closer to neutral for pure-service names.

**The non-contractor sleeves (why the basket is not perfectly coherent):**
- **DSSA** (84T, the mcap heavyweight) is a Sinarmas *energy* conglomerate — coal +
  independent power + a fast-growing **data-centre/digital** limb — so part of the basket's
  marginal return is a power-tariff / digital-infra story, not a mining-activity story. Its
  beta is **−0.706** (defensive/idiosyncratic), which dilutes the commodity beta.
- **ELSA** (Elnusa) is **oil & gas services** — its driver is the **Brent upstream capex
  cycle** (seismic/drilling demand), a *different* commodity from coal. Small weight, but it
  is why **Brent** belongs in the tree even though the basket is coal-dominated.
- **TCPI/SGER/SURE** are **volume/logistics/trading** plays — paid on coal *throughput* and
  gas distribution, reinforcing the *activity > price* thesis.

**Intra-basket dispersion.** Betas span **−0.74 (ABMM) to +1.79 (BIPI)** with two negative
heavyweights (DSSA −0.71, ABMM −0.74). This wide, partly-offsetting beta spread is the
mechanical source of `model_conflict`: the contractors are pro-cyclical coal-activity beta
while DSSA/ABMM carry defensive/idiosyncratic loadings, so a single blended sign is
genuinely hard — yet the *activity* channel survives because every contractor sleeve loads on
it the same way (more mining ⇒ more contractor work) regardless of equity beta.

---

## 3. DEMAND driver tree (what drives contractor revenue/volume up)

> Leaf format: `series ric (n_obs) · role · sign · LEAD(months) · mechanism · data quality`.
> Sign = a-priori sign on the basket's **excess return vs IHSG**. **Bold** = currently kept
> by the engine. ★ = recommended ADD (high-value, in-store, under-used).

```
ENERGY-SERVICES DEMAND
├── D1  COAL-MINING ACTIVITY  (the contractor topline — THE deepening target)
│   ├── ★ Overburden removed (BUMA/Pamapersada) ─► CEICI391910547 (n=232, M, bcm mn)
│   │       demand · +1 · LEAD 0–2m · DIRECT contractor topline (strip work = the fee base)
│   │       quality: monthly, deep (2007→2026-04), publication-lagged ~5wk → ATTRIBUTION/near-coincident
│   ├── ★ Coal production (BUMA/Pamapersada) ─► CEICI391910527 (n=232, M, Ton mn)
│   │       demand · +1 · LEAD 0–2m · tonnes mined = mining-fee base · same quality as above
│   │       (pair with YTD print CEICI391910437 n=232 for level/trend cross-check)
│   ├── ★ Komatsu mining-equipment unit sales ─► CEICI391910517 (n=232, M, Unit)  [CROSS-INDUSTRY: Infrastructure/Construction]
│   │       demand · +1 · LEAD 1–4m · fleet build LEADS the volume it will later move (capex pulse)
│   │   └── sub: Komatsu MINING-sector share ─► CEICI391910507 (n=232, M, %) — isolates the coal-capex slice from agro/construction
│   ├── **Mining & Quarrying: Coal & Lignite (GDP)** ─► CEICI365765217 (n=60, Q)
│   │       demand · +1 · KEPT but UNSTABLE (best_lag 1Q corr −0.31, ic −0.27, stable=false) — quarterly, noisy → DEMOTE/attribution only
│   └── sub-driver (the parent that LEADS all of D1): coal PRICE cycle → see D2
├── D2  COAL PRICE CYCLE  (regime that conditions activity & contract re-tendering)
│   ├── **API2 thermal coal (Newcastle proxy)** ─► ICEEUR:ATR1! (weekly_obs=782)
│   │       demand · +1 · LEAD 1m (corr_at_best +0.21, ic +0.19 ic_t 2.56, ols_pred t +4.76, theory✓ stable✓)
│   │       quality: LIQUID weekly price → THE forecast leaf · the single best driver in the set
│   ├── HBA admin reference (Indonesian royalty/price anchor)
│   │   ├── **HBA III** ─► CEICI522153977 (n=32, M, USD/Ton) · supply · +1 · KEPT but stable=false (short history 2023→)
│   │   ├── **HBA I** ─► CEICI506620937 (n=37, M) · supply · KEPT, emp_sign −1, stable=false → NOISY, demote
│   │   └── (HBA tracks API2 with a 0–1m admin lag → coincident, not leading)
│   └── **BCOM broad commodity** ─► AMEX:DBC (weekly_obs=800)
│           demand · +1 · LEAD 0m (corr +0.18, spearman +0.23) · KEPT · capex-cycle beta, co-incident
├── D3  CHINA / GLOBAL THERMAL DEMAND  (the parent that leads the coal price)
│   ├── cn_ip_yoy China industrial production ─► aCNIP · demand · +1 · LEAD 1–3m
│   │       REJECTED below_gate (pearson +0.04) — weak here; keep as conditioning context not a leaf
│   └── ★ cn_pmi_mfg China mfg PMI ─► aCNPMIMT · demand · +1 · LEAD 1–2m · forward-looking survey (try as leading complement to cn_ip)
├── D4  OIL-SERVICES (ELSA sleeve) — upstream capex cycle
│   └── **Brent crude** ─► ICEEUR:BRN1! (weekly_obs=800)
│           demand · +1 · LEAD 1–3m · upstream E&P capex follows Brent → seismic/drilling demand
│           REJECTED below_gate (pearson +0.11, p 0.20) — small ELSA weight; keep low-priority
└── D5  COAL THROUGHPUT / EXPORT (TCPI/SGER barging & trading)
    ├── **Export value: Coal, Coke & Briquettes** ─► CEICI323975402 (n=170, M) · KEPT · +1 · co-incident
    ├── **Value: Coal Briquettes/Ovoids** ─► CEICI502615757 & CEICI502587247 (n=86, M) · KEPT (×2, redundant)
    └── **Mining Products: Coal (BoP export)** ─► CEICI357008197 (n=182, M) · KEPT · +1 · co-incident
        ⚠ D5 is FOUR near-duplicate USD coal-export-value prints — price×volume blended,
          publication-lagged, co-incident. Collinear; collapse to ONE + keep the price (D2) clean.
```

**Forecast hypothesis (demand).** Only **D2 API2 coal** (and secondarily Brent for the ELSA
sleeve, BCOM for beta) is a *liquid, exogenous, weekly price* — the type that genuinely
**leads** (IMPROVEMENT_PLAN §3 rule of thumb, confirmed: API2 ic_t 2.56, ols_pred t +4.76 at
lead 1m). The **activity series (D1: overburden, production, Komatsu)** are monthly CEIC
quantity prints, publication-lagged ~5 weeks → **coincident-to-slightly-leading**; they are
the *attribution* of the contractor topline and the *confirmation* that the coal-price regime
is feeding through to real work. The right forecasting posture is therefore: **coal price
(API2) → conditions → contractor activity (overburden/Komatsu) → confirms → equity** — lead
with the price, attribute with the activity. The current engine has the price (good) but is
attributing through noisy *export-value* prints instead of the *physical-activity* prints
that are the cleaner contractor read.

---

## 4. SUPPLY / COST driver tree (output, input cost, margin)

```
ENERGY-SERVICES SUPPLY / COST
├── S1  DIESEL / FUEL  (25–35% of contractor cash cost — the margin swing)
│   └── Brent ─► ICEEUR:BRN1! (weekly_obs=800) · cost · −1 · LEAD 1–3m
│           NOTE sign conflict with D4: Brent is +1 for the ELSA oil-services sleeve (revenue)
│           but −1 for contractor fuel cost. Net across the basket ≈ small +; the engine
│           currently anchors brent as DEMAND +1 — honest, but the COST leg is why it sits
│           below_gate (the two legs partially cancel). Tag as net-ambiguous.
├── S2  COAL as CONTRACTOR COST? — NO (contractors are paid to move it, do not buy it)
│       ⇒ coal price is unambiguously demand/regime for the contractor sleeve (≠ a coal
│         CONSUMER like cement/power). This is the key sign distinction vs the Cement basket.
├── S3  EQUIPMENT / CAPITAL COST  (USD-priced fleet, tyres, steel)
│   ├── usdidr (FX_IDC:USDIDR, weekly_obs=801) · cost −1 (imported equipment/diesel)
│   │       ┐ NET with revenue leg (USD-contracts +1) ⇒ basket-level FX sign ≈ small +
│   └── steel_hrc / aluminum — tyre/steel input (no clean contractor-specific series; low priority)
├── S4  MINING POLICY / TARIFF  (royalty, DMO, contract re-tendering)
│   └── HBA admin price ─► CEICI522153977 (HBA III, n=32) / CEICI506620937 (HBA I, n=37)
│           supply · +1 · admin price sets royalty & re-tender ceiling · short history, NOISY
└── S5  POWER-TARIFF / ELECTRICITY  (DSSA/ABMM own-power sleeve)
    └── PLN tariff prints (CEICI3857621xx family, anchored in backtest, not kept) · supply +1
        · regulated tariff = DSSA/ABMM IPP revenue · slow annual/monthly admin series → attribution
```

**Read on the cost side.** The defining feature is **S2**: unlike every coal-*consuming*
basket (Cement, Power), a coal-services basket does **not** bear coal as a cost — it is paid
to extract it. That is why the whole coal complex enters with sign **+1** (demand/regime) and
the engine's `theory_agree = 100%` on the kept set is correct. The genuine cost lever is
**S1 diesel (Brent)**, which is also a *revenue* for the ELSA sleeve — the one true sign
ambiguity in the tree. The cleanest improvement is to keep coal as +1 demand/regime and let
the engine estimate Brent's net sign empirically (it currently sits below_gate, consistent
with the two legs cancelling).

---

## 5. MACRO / RATE / FX / FLOW

| Driver | series | role | sign | empirical (engine output) | mechanism |
|---|---|---|---|---|---|
| **BI 7DRR** | `ECONOMICS:IDINTR` | macro | −1 (emp) | **KEPT**: pearson −0.16, ols t −3.42, p 0.0006, stable✓ (prior 0) | rate Δ: discount-rate + coal-capex financing; rate cuts re-rate the cyclical contractors |
| **USD/IDR** | `FX_IDC:USDIDR` (weekly_obs=801) | macro | **+1 (net)** | anchored, below_gate | **two-sided**: +USD coal/contract revenue vs −USD diesel/equipment cost ⇒ small net + |
| BCOM | `AMEX:DBC` (800) | demand | +1 | **KEPT** corr +0.18 | broad commodity/capex-cycle beta |
| Real GDP | `aIDGDPAR1` | demand | +1 | anchored | domestic mining/infra activity backdrop |
| **DXY** | mapping → `TVC:BBDXY` **(weekly_obs=0, EMPTY)** | macro | −1 | **UNAVAILABLE — DATA BUG** | EM-flow / USD headwind on commodity equities — use `TVC:DXY` (weekly_obs=800) |

**Read.** `macro_tilt = 0.0` — the macro block is the *weakest* limb of this otherwise
working model, and that is honest: a coal-services basket is a **commodity-activity play, not
a rate play**. BI-rate is kept (clean −0.16, t −3.42) as a mild cyclical/financing channel.
The FX prior is rightly small-positive-to-neutral (the revenue-vs-cost USD legs offset). The
one actionable macro item is the **DXY data bug** (§7) — the broad-USD headwind on commodity
equities is currently *unmeasurable* because `dxy` resolves to the empty `TVC:BBDXY`.

**Flow.** No `jci`/index-vehicle circularity concern here (the basket is mid-cap, not an
index proxy). Foreign risk-on/off enters through USD/IDR + DXY (once fixed) as a commodity-EM
beta, not as a dominant driver.

---

## 6. Cross-industry linkages (series borrowed from other categories)

The contractor thesis is **inherently cross-industry** — these companies sit *between* the
coal sector and the machinery/construction sector, so their best drivers live in other blocks:

| Sleeve | borrows from category | series tags |
|---|---|---|
| Coal-mining contractors (DOID/PTRO/DEWA/ABMM) | **Energy / Coal** (activity) | `CEICI391910547` (overburden), `CEICI391910527` (production), `CEICI391910437` (YTD prod) |
| Contractor fleet/capex | **Infrastructure / Construction** (Komatsu) | `CEICI391910517` (units total), `CEICI391910507` (mining-share %) — *cross-block, currently under-used* |
| Coal price regime | **Market commodities** | `ICEEUR:ATR1!` (API2), `AMEX:DBC` (BCOM) |
| Oil-services (ELSA) | **Energy / Crude Oil** + market | `ICEEUR:BRN1!` (Brent), `CEICI468154637` (daily oil lifting, n=994), `CEICI403931877` (crude+condensate prod, n=216) |
| Power sleeve (DSSA/ABMM IPP) | **Energy / Electricity** | PLN tariff family `CEICI3857621xx` |
| China demand | **CEIC China macro** | `aCNIP`, `aCNPMIMT` |

The single highest-value cross-industry borrow is **Komatsu mining-equipment unit sales
(`CEICI391910517`, Infrastructure block)** — it is the *same UNTR data feed* used by the
Conglomerate and Machinery files, and it **leads** contractor volumes (fleet build precedes
the work the fleet does). It is in the store, monthly, 232 obs, and currently sits in a
*different category* than the basket's primary `ceic` grab, which is why the engine misses it.

---

## 7. Currently wired vs available

| Branch | Engine uses NOW (from output JSON, n_kept=12) | Available to ADD (confirmed in catalog) | Priority |
|---|---|---|---|
| Coal-mining ACTIVITY | only quarterly **GDP coal&lignite** `CEICI365765217` (unstable, ic −0.27) | ★ **overburden `CEICI391910547`** + **production `CEICI391910527`** (n=232, M) | **HIGH** |
| Contractor fleet/capex | — (nothing) | ★ **Komatsu units `CEICI391910517`** + mining-share `CEICI391910507` (n=232, M) | **HIGH** |
| Coal price (leading) | **API2 `ICEEUR:ATR1!`** ✓ (best leaf, ic_t 2.56) | already wired — keep, it's the forecast anchor | KEEP |
| Coal export VALUE (redundant) | **4 near-duplicate prints**: `CEICI323975402`, `CEICI502615757`, `CEICI502587247`, `CEICI357008197` | collapse to ONE; they are collinear price×vol, co-incident | **DEMOTE** |
| Nat-gas production (#1 ranked) | **`CEICI403931887`** kept, corr +0.16 lead 2m | ⚠ **STALE: last_obs 2024-12, flag `stale(18m)`** — only SURE/SUREsleeve relevance; demote | **FIX/DEMOTE** |
| HBA admin coal | **HBA III `CEICI522153977`** (n=32, stable=false) + **HBA I `CEICI506620937`** (emp_sign −1, noisy) | keep ≤1, short history; not a forecast leaf | LOW |
| Oil-services (ELSA) | brent below_gate | keep `brent` low-priority; crude-lifting `CEICI468154637` (n=994 daily) as activity proxy | LOW |
| Macro | **BI-rate** (kept, −0.16 t −3.42), usdidr, GDP anchored | ✶ **DXY broken** → repoint `TVC:BBDXY`→`TVC:DXY` | MED (bug) |
| China demand | cn_ip below_gate | try **`aCNPMIMT`** (PMI leads IP) as leading complement | LOW |

**Two live data bugs to flag (read-only here — do not edit mapping.py):**
1. **`dxy → TVC:BBDXY` is EMPTY (`weekly_obs=0`).** The broad-USD headwind on commodity
   equities is unmeasured. Fix in `GLOBAL_CORR`: `"dxy": "TVC:DXY"` (weekly_obs=800). This is
   the same bug the DATA-QUALITY CAVEATS in AGENT_BRIEF call out globally.
2. **`wb_lng_jp → SGX:JKM1!` is EMPTY (`weekly_obs=0`).** Not in this basket's kept set, but
   if a gas leaf is ever wired for the SURE/DSSA gas sleeve, JKM LNG is unusable — use
   `NYMEX:NG1!` (Henry Hub) as the populated proxy.
3. **Engine's #1-ranked driver is STALE.** `CEICI403931887` Production: Natural gas (scf) is
   ranked top of the narrative but `last_obs = 2024-12-01` (`stale(18m)`). A stale series
   should not headline the live posture — demote and replace with the fresh activity series
   (overburden/Komatsu last_obs 2026-04).

**Headline:** the engine forecasts *despite* running on coal **price/export-value** prints and
a **stale gas-production** series, while the **clean, fresh, direct contractor-activity feeds**
(BUMA/Petrosea overburden + production, Komatsu mining-equipment orders) — the literal fee
base of these companies — sit in the store **barely used**. Wiring them in is the deepening.

---

## 8. Forecastability

**What the OOS backtest says (`backtest/results/energy_energy_services.json`).**
- `forward`: n=129, **fwd_ic +0.121**, fwd_pearson +0.185, hit_rate 0.543, edge −0.028,
  long_short **+2.5%/mo**, **placebo ic_pctile 0.917** → above the 90th percentile of the
  circular-shift null ⇒ **genuine forward SKILL** (not noise). This is one of the few baskets
  that clears the placebo bar on a *forward* basis.
- `contemporaneous_ref`: fwd_ic **+0.17**, placebo pctile **1.0** → even stronger co-movement.
  The gap (contemp +0.17 > forward +0.121) is the standard signature: a *strong explainer*
  that is also a *real, if more modest, forecaster*.
- `latest_signal 0.034` (mildly positive), 25 anchored drivers, 12 kept.

**Why it forecasts (the mechanism behind the skill).** The basket's revenue is **one
causal step removed** from a liquid leading price. Coal price (API2, weekly, exogenous)
**leads** → miners' production/capex decisions → contractor overburden & equipment orders →
contractor equity. Because the equity re-rates on the *forward activity outlook* implied by
the price move, the price genuinely **leads the equity** (lead 1m, ic_t 2.56), and the
activity prints **confirm** it. This is precisely the "physical-commodity / cost-pass-through"
pattern the master backtest says forward skill concentrates in.

**Which branches LEAD vs attribute:**
- **LEAD (forecast candidates):** API2 coal (1m), BCOM (0–1m), Brent (1–3m, ELSA sleeve),
  China PMI (1–2m). Liquid/exogenous/forward-looking. **API2 is the workhorse.**
- **ATTRIBUTE (coincident/lagging):** overburden, production, Komatsu units, export-value,
  HBA, GDP coal&lignite — monthly/quarterly publication-lagged quantity prints. Excellent for
  *explaining* a move and *confirming* the regime, weak as the forward signal on their own.

**What would move it from "working partial" to "perfected/high-confidence":**
1. **Replace noisy attribution with clean attribution.** Swap the 4 redundant export-value
   prints + stale gas-production for **overburden + production + Komatsu** (fresher, more
   directly mapped, less collinear). This should *raise* `mvR2`, `theory_agree` and `stable%`
   and soften `model_conflict` without touching the API2 lead — i.e. deepen the skill, not
   add in-sample noise.
2. **Lead the activity, not just the price.** Test whether **Komatsu mining-equipment orders
   LEAD** the contractor return by 1–4m (fleet build precedes work). If it leads, it becomes a
   *second* forecast leaf alongside API2 — the one genuinely activity-based forward signal.
3. **Fix DXY** so the broad-USD commodity-equity headwind is actually in the macro block
   (currently `macro_tilt=0` partly because the one macro leaf that should matter is empty).

**Honest verdict.** This is a **real forecaster** (forward IC +0.12, 92nd placebo pctile,
+2.5%/mo long-short), unusually so for the engine. The model_conflict/NEUTRAL label is driven
by the **wide, partly-offsetting beta spread** (DSSA −0.71, ABMM −0.74 vs BIPI +1.79) and the
demand/supply tilts nearly cancelling — but the *activity channel is coherent across all
sleeves*. The deepening goal is to **let the activity channel carry more weight** so the
verdict stops collapsing to NEUTRAL while preserving the forward skill the backtest confirms.

---

## 9. Engine-wiring spec — concrete `mapping.py`

**Current seed (for reference, lines ~127–139):**
```python
"Energy Services": {  # mostly coal-mining contractors (DOID/PTRO/DEWA/ABMM)
    "ceic": [("Energy", None)],
    "ceic_override": [("mining & quarrying: coal", "demand", +1),
                      ("coal production", "demand", +1),
                      ("production: natural gas", "demand", +1)],
    "globals": [("bcom", "demand", +1, "commodity cycle -> coal-miner capex -> contractor demand"),
                ("brent", "demand", +1, "upstream capex follows crude"),
                ("wb_coal_au", "demand", +1, "coal services demand")],
    "macro": [("cn_ip_yoy", "demand", +1, "China demand -> coal volumes -> services"),
              ("usdidr", "macro", +1, "USD-denominated contracts")],
},
```

**Proposed seed (deepen the activity→revenue lead; demote redundant/stale leaves):**
```python
"Energy Services": {  # coal-mining CONTRACTORS (DOID/BUMA, PTRO, DEWA, ABMM) + DSSA/SGER energy + ELSA oil-services
    # Energy block (coal activity + crude for the ELSA sleeve). Komatsu lives in the
    # Infrastructure block, so add Construction to reach it cross-industry.
    "ceic": [("Energy", None), ("Infrastructure", "Construction")],
    # ACTIVITY is the contractor fee base and is DEMAND for a services basket (CEIC tags
    # these 'supply' as physical output). Re-role the direct UNTR/BUMA operating series.
    "ceic_override": [
        ("pamapersada nusantara): coal overburden", "demand", +1),   # CEICI391910547 — strip work = fee base (LEAD 0-2m)
        ("pamapersada nusantara): coal production", "demand", +1),    # CEICI391910527 — tonnes mined = mining-fee base
        ("united tractors (komatsu): total", "demand", +1),          # CEICI391910517 — fleet/capex pulse (LEADS volumes 1-4m)
        ("united tractors (komatsu): mining sector", "demand", +1),  # CEICI391910507 — isolate the coal-capex slice
        ("mining & quarrying: coal", "demand", +1),                  # keep (GDP context, attribution)
    ],
    # Drop the collinear coal-export-VALUE quartet (co-incident price×vol duplicates) and the
    # STALE nat-gas production series (last_obs 2024-12, stale(18m)) from headlining the posture.
    "ceic_exclude": ["exports: value: coal", "imports: value: coal",
                     "value: coal; briquettes", "production: natural gas"],
    "globals": [
        ("wb_coal_au", "demand", +1, "API2 coal = leading regime for mining activity (LEAD 1m, ic_t 2.56 — the forecast anchor)"),
        ("bcom", "demand", +1, "broad commodity/capex-cycle beta (co-incident)"),
        ("brent", "demand", 0, "NET-AMBIGUOUS: +ELSA oil-services revenue vs -contractor diesel cost (let data decide)"),
    ],
    "macro": [
        ("usdidr", "macro", +1, "NET +: USD coal/contract revenue > USD diesel/equipment cost"),
        ("id_bi_rate", "macro", -1, "rate Δ: coal-capex financing + cyclical re-rating (kept: corr -0.16, t -3.42)"),
        ("dxy", "macro", -1, "broad-USD headwind on commodity equities — REQUIRES repoint TVC:BBDXY->TVC:DXY (empty resolver)"),
        ("cn_pmi_mfg", "demand", +1, "China mfg PMI leads thermal-coal demand (try as leading complement to cn_ip)"),
    ],
},
```

**Resolver fix (separate, in `GLOBAL_CORR` — flag for engine owner; not edited here):**
```python
"dxy": "TVC:DXY",   # was TVC:BBDXY (weekly_obs=0, EMPTY) — TVC:DXY has 800 weekly obs
```

**`ceic_exclude` rationale (endogeneity / redundancy / staleness — not look-ahead):**
- The four coal-export-VALUE prints (`CEICI323975402`, `CEICI502615757`, `CEICI502587247`,
  `CEICI357008197`) are collinear USD price×volume duplicates → keep at most one; the rest add
  multiple-testing penalty (`mt_penalty 0.71(n=48)`) without independent signal.
- `production: natural gas` (`CEICI403931887`) is stale 18m and weakly basket-relevant
  (only SURE/DSSA gas sleeve) — should not headline a live posture.
- (No constituent-own-balance-sheet or system-ratio endogeneity risk here — these are
  national/company *physical-volume* series, exogenous to the equities' own outcomes.)

**Falsifiable backtest plan (gate the change — keep ONLY if forward IC holds/improves):**
1. Re-run `backtest/bt.py "Energy Services"` after the seed swap. **Expectation:** forward IC
   **holds ≥ +0.12** (do not break the existing skill) while **contemporaneous IC, `mvR2`,
   `theory_agree%`, and `stable%` rise** and `model_conflict` softens — because the direct
   activity series replace the noisy export-value/stale-gas leaves. **Reject the change if
   forward IC falls** — the existing tree already works, so the bar is "deepen without
   regressing".
2. **Lead test on Komatsu:** confirm `CEICI391910517` (mining-equipment orders) leads the
   basket return by 1–4m. If lead IC > 0 at h=1–4m, promote it to a forecast leaf; if it is
   coincident-only, keep it as attribution. (Falsifies the "activity leads, not just price"
   hypothesis cleanly.)
3. **API2-only benchmark:** run a one-driver model on `wb_coal_au` (API2) alone. If the full
   activity-deepened tree cannot beat API2-only on forward IC, the honest verdict is that the
   basket is **"a coal-price beta confirmed by mining activity"** — still SKILL, but lead with
   the price and treat activity as attribution. (Both outcomes are publishable; this just
   pins down how much the activity series *add* beyond the price.)
4. **DXY fix check:** after repointing `dxy→TVC:DXY`, verify the macro block picks up a
   non-zero, theory-coherent (−1) DXY loading; `macro_tilt` should move off 0.0.

---
*Series cited exist in `plan/catalog/{idind,market}.json` (RIC + n_obs verified). Empirical
figures from `output/energy_energy_services.json` + `backtest/results/energy_energy_services.json`.
Forward skill (fwd_ic +0.121, placebo 92nd pctile) is REAL — this plan deepens it, it does not
rescue it. Data bugs found: dxy→TVC:BBDXY empty; wb_lng_jp→SGX:JKM1! empty; engine's #1 leaf
(nat-gas production) stale 18m.*
