# Pharma (Healthcare) — Driver-Tree Plan

> Detail file for `IMPROVEMENT_PLAN.md` §4 · basket `healthcare_pharma` · sector Healthcare ·
> mcap **~92T** · grade **perfected** · kept **5** · **forward OOS IC +0.17 (SKILL, placebo 0.97, n_oos 129)**.
> **Verdict up front:** this is one of only **12 SKILL baskets** in the book and the
> *cleanest forecaster in Healthcare* alongside Healthcare-Equipment (+0.29). Unlike
> Hospitals (idiosyncratic, OOS ≈ 0), Pharma has **two genuinely leading, exogenous,
> traded handles**: (i) **defensive-duration re-rating** of quality compounders (KLBF,
> SIDO) that re-price *ahead* of the market when local/global real yields move, and
> (ii) **USD/IDR on a ~90%-imported-API cost base** that squeezes margin with an FX
> lead. The engine already anchors the basket on `id_10y −0.29` — that single duration
> leaf is the documented source of the skill. **The mandate here is to DEEPEN the rate
> and FX-cost channels and PROTECT the +0.17 — not to bolt on noise that dilutes it.**
> The marginal additions below (`us_10y`, a real-yield handle via **`DFII10`**, and a
> `dxy` bug-fix) are all *more of the same factor the basket already forecasts on*, not
> new bets — and every one is backtest-gated with an explicit keep-rule in §9.

---

## 1. Snapshot — the basket and the skill we are protecting

**Members (13 names, ~92T).** The basket is **top-heavy on quality defensives** and a
long, thinner tail:

| name | what it does | mcap | basket beta | role in basket |
|---|---|---|---|---|
| **KLBF** (Kalbe Farma) | **the dominant name** — diversified: prescription, OTC (Promag, Mixagrip), nutritionals (Entrasol), distribution (EPM). ~40% of basket cap. | 36.2T | **0.013** | the anchor — near-zero beta, the quintessential **bond-proxy quality defensive** |
| **SOHO** (Soho Global Health) | branded ethical + natural/herbal, distribution. | 20.2T | 1.015 | 2nd-largest cap, higher beta (thinner float) |
| **SIDO** (Sido Muncul) | **herbal / jamu** (Tolak Angin), OTC, supplements — high-margin consumer-health. | 12.0T | **0.069** | the **real-income / mass-consumption** leg; near-zero beta defensive |
| **TSPC** (Tempo Scan Pacific) | ethical + OTC (Bodrex, Hemaviton) + consumer/cosmetics + distribution. | 10.7T | 0.221 | diversified defensive |
| **DVLA** (Darya-Varia) | ethical + OTC (Decolgen, Natur-E), MNC-linked (Zuellig). | 1.78T | **−0.105** | small, *negative* beta — pure defensive |
| MDLA, PYFA, KAEF, MERK, DVLA, INAF, PEHA, OBAT, SCPI | mid/small: **KAEF & INAF** = SOE pharma (Bio Farma group, USD-import + BPJS-generic exposed); **MERK** = MNC; **PYFA/PEHA/MDLA/OBAT** = small caps; **SCPI** mcap ≈ 0 (illiquid). | <3T each | mixed | idiosyncratic tail; KAEF/INAF add SOE/BPJS-generic and FX-cost beta |

| field | value |
|---|---|
| current grade | **perfected** |
| current confidence | **high** |
| kept drivers | **5** (`_state.txt`) |
| current seed (`mapping.py`) | ceic `Healthcare/Pharmaceuticals`; macro `id_bi_rate −1`, `id_10y −1`, `usdidr −1`, `id_gdp_real_q +1`, `id_cpi_yoy −1` |
| **forward OOS IC** | **+0.17** (BACKTEST.md) |
| n_oos | **129** |
| hit-rate vs up-market | **+0.05** |
| placebo percentile | **0.97** (beats 97% of circular-shift placebos) |
| flag | **SKILL** |

**The gap (different from a broken basket).** Pharma is *not* broken — it forecasts.
The gap is **depth and robustness**, not rescue:
1. The seed leans on `id_10y` + `id_bi_rate` (two correlated *domestic* rate handles)
   but omits the **global discount-rate / real-yield** leg (`us_10y`, **`DFII10`**) that
   drives the *same* defensive-duration trade and is the cleanest version of the handle
   already generating the skill.
2. The FX-cost channel (`usdidr −1`) is correct but **under-explained and single-leaf**:
   ~90% of APIs are USD-imported, yet the seed carries no DXY/EM-flow companion, and the
   one it *would* use (`dxy → TVC:BBDXY`) **resolves to a dead series** (weekly_obs 0 — a
   live bug, see §7).
3. The CEIC `Healthcare/Pharmaceuticals` block auto-pulls **27 candidate series**, but
   they are almost all **publication-lagged quantity prints** (export/import value+volume,
   GDP VA, investment realization, quarterly business surveys) → coincident/lagging,
   good for *attribution*, weak for *forecasting*. They risk **diluting** the duration
   signal that does the forecasting. The plan tags which to keep and which to cull.

The job: add the global-duration + real-yield handles, fix the `dxy` resolver, prune the
lagged CEIC noise, **and confirm via the blindfolded backtest that forward IC holds ≥+0.17
or improves** — never keep an in-sample-only gain.

---

## 2. Economic structure — how a pharma basket makes money

**The revenue identity.** Pharma revenue is a price × volume across two very different
demand regimes, plus distribution:

```
Revenue = Σ over [ethical (Rx) , OTC/consumer-health , herbal/jamu , distribution]
          ( Price  ×  Volume )
          ▲ ethical: BPJS formulary / e-catalogue tender price (administered, low-margin)
          ▲ OTC/jamu: brand pricing power (real income, mass consumption — HIGH margin)
          ▲ distribution: third-party logistics scale (KLBF EPM, TSPC, SOHO)
```

- **Ethical / prescription (Rx).** Increasingly **BPJS-driven**: the single-payer scheme
  procures generics through the **e-catalogue / tender** at administered prices. This is a
  *volume* story at *thin, policy-set margins* — heavily exposed to KAEF/INAF (SOE
  generics) and the formulary. Demand is defensive (disease burden, not the cycle).
- **OTC / consumer-health.** Branded self-medication (Promag, Bodrex, Mixagrip,
  Hemaviton, Natur-E) + nutritionals. **This is where the margin and the pricing power
  live** — it behaves like branded FMCG/staples: defensive volume + real-income-elastic
  trade-up/trade-down + brand moat. KLBF, TSPC, SOHO, DVLA dominate here.
- **Herbal / jamu (SIDO).** Tolak Angin and supplements — **mass-market, rural-skewed,
  real-income-sensitive consumer health** at staple-like (often higher) margins. SIDO is
  effectively a consumer-staples name wearing a pharma label.

**The cost stack — the margin swing factor.** The defining feature of Indonesian pharma:
**~90% of active pharmaceutical ingredients (APIs) and raw materials are IMPORTED and
USD-priced.** The cost stack is therefore:

```
COGS  ≈  imported APIs / raw materials (USD)   ← ~90% of inputs; the margin swing factor
       + packaging / excipients (part-USD)
       + energy / manufacturing overhead (IDR + part-imported)
       + distribution / logistics (IDR)
SG&A  ≈  marketing (OTC brand-building) + sales force (ethical detailing) + admin
```

The **margin swing factor is USD/IDR on the API base**: a weak IDR raises COGS with a
1–3-month lag (inventory + purchasing lead), and pricing pass-through is *asymmetric* —
OTC/jamu (SIDO, KLBF-consumer) can re-price (pricing power), but **BPJS ethical prices are
administered and cannot** (margin compression on KAEF/INAF). So FX hits the SOE/ethical
sub-basket harder than the branded-OTC names.

**Why the basket is a "bond proxy."** KLBF (β 0.013), SIDO (0.069), DVLA (−0.105) are
**low-beta, high-ROE, cash-generative compounders on premium P/Es**. The market prices
them like **long-duration defensive bonds**: their valuation is dominated by the discount
rate, not by near-term earnings surprise. When real/long yields fall, these high-multiple
defensives **re-rate up first** (duration leads); when yields rise, they de-rate. This is
the source of the +0.17 forward skill — see §5 and §8.

**What a sell-side analyst actually watches:** **USD/IDR** (gross-margin call — the #1
swing factor), **BPJS e-catalogue tender outcomes & formulary additions** (ethical
volume/price), **OTC pricing actions & real income** (the margin leg), **SIDO jamu volume
/ rural demand**, **inventory days** (FX-timing of API purchasing), and the **10Y yield**
(the multiple). Note the asymmetry vs Hospitals: here **two of the top watch-items
(USD/IDR, 10Y) ARE liquid macro series we hold and that LEAD** — which is precisely why
Pharma forecasts and Hospitals does not.

**Intra-basket dispersion.** KLBF sets the factor (defensive duration + OTC margin). SIDO
is the real-income/jamu leg. KAEF/INAF carry the FX-cost + BPJS-generic squeeze most
sharply. DVLA/MERK are MNC-linked pure defensives. The tail (PYFA/PEHA/MDLA/OBAT/SCPI) is
idiosyncratic and illiquid → contributes noise, not factor. The basket signal is
**dominated by the KLBF/SIDO/TSPC defensive-duration + FX-cost block.**

---

## 3. DEMAND driver tree

Pharma demand is **defensive and structural** (disease burden + demographics + coverage),
so the *level* of demand is non-cyclical. The forecastable variation is **mix and
real-income** (OTC trade-up/down) plus the **BPJS coverage** volume engine. As with all
CEIC quantity prints, the demand series we hold are **publication-lagged → attribution,
not forecast**; the timely demand handles are the *macro* income/confidence series.

```
DEMAND
├── D1 BPJS coverage & formulary  (the ethical/generic volume engine)
│   ├── D1a [NO DIRECT BPJS / e-catalogue SERIES IN STORE — gap]   ← the real leading node
│   ├── D1b OJK health-object financing (Multifinance) → CEICI462440547 (Banks/Multifinance, n93, P1M, lag)
│   └── D1c CPI: Health (admin-price echo)            → CEIC521347917  (n41, P1M, 2022=100)
├── D2 real income & mass consumption  (OTC/jamu trade-up — the MARGIN leg)
│   ├── D2a consumer confidence                       → id_consumer_confidence → aIDCONIAR (M, deep)
│   ├── D2b present-income / current-income survey    → aIDCSCRICMP / aIDCSINC6MN (M, BI survey)
│   ├── D2c real retail sales index                   → CEIC322851702 (n196, P1M, last 2026-04)
│   └── D2d real GDP (domestic-demand backdrop)       → id_gdp_real_q → aIDGDPAR1 (Q, lagged)
├── D3 drug volume  (system throughput — coincident proxy)
│   ├── D3a Pharma import VOLUME (APIs+finished)       → CEICI323791702 (dem, kg mn, n172, P1M, ~2m lag)
│   └── D3b Pharma import VALUE (USD)                  → CEICI323782002 (dem, USD mn, n172, P1M, ~2m lag)
└── D4 demographics / aging / disease burden  (the decade thesis)
    └── D4a [structural — no monthly series; demographic backdrop only]
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **D1b OJK health financing** | `CEICI462440547` | demand | **+1** | **0** (lag) | Multifinance "financing receivables based on financing objects: health" proxies consumer health-spend financing flow. n93 monthly but **~6m publication-lagged** (last 2025-11). Coincident-to-lagging → **attribution.** |
| **D1c CPI: Health** | `CEIC521347917` | demand | **+1** | 0 | Health price level = administered/retail drug-price inflation = revenue-per-unit (for re-priceable lines). Monthly, **n41 only** (2023→), timely (last 2026-05) but **short history** → weak power; coincident. Sign ambiguous (revenue + vs input-cost echo +). |
| **D2a consumer confidence** | `aIDCONIAR` | demand | **+1** | **+1** | Confidence/income expectations → OTC/jamu trade-up (discretionary self-medication, supplements). **Monthly, deep, timely** — the cleanest *timely* demand handle. SIDO/KLBF-consumer most exposed. Modest but real. |
| **D2b present-income survey** | `aIDCSCRICMP` / `aIDCSINC6MN` | demand | +1 | +1 | BI consumer-survey current/forward income → mass-consumption (jamu) demand. Monthly. **n_obs None in catalog (spark-only) — verify resolves before wiring;** else fold into D2a. Experimental. |
| **D2c real retail sales** | `CEIC322851702` | demand | +1 | 0 | Real retail-sales index = mass-consumption proxy for OTC/jamu volume. Monthly, **n196, deep, timely** (last 2026-04). Coincident → attribution-grade but high-quality. |
| **D2d real GDP** | `aIDGDPAR1` | demand | +1 | 0 | Domestic-demand backdrop. **Quarterly, lagged** → weak structural prior; keep but expect no monthly forecast skill. |
| **D3a import VOLUME** | `CEICI323791702` | demand | **+1** | 0 | Pharma import *volume* (APIs + finished) = system throughput. n172 monthly, deep, but **~2m lagged + confounds API-input with finished-drug demand.** Coincident → attribution. |
| **D3b import VALUE** | `CEICI323782002` | demand | +1 | 0 | Import *value* (USD) = volume × USD price → confounds demand with FX. Better read as a *cost* echo (see §4). Attribution. |

**Sub-driver chain on the top demand driver (D1, BPJS/ethical volume):**
`BPJS budget & e-catalogue tender → formulary listing × covered-lives × utilisation →
generic volume at administered price → SOE/ethical revenue (KAEF/INAF) → earnings`. **We
hold none of the leading nodes** — tender outcomes and formulary decisions are *policy
events*, not series; the closest proxy (`CEICI462440547`) sits at the far, lagged end.
The leading, forecastable demand variation therefore lives **not** in the BPJS-volume
branch but in **D2 (real income → OTC/jamu margin)**, where `aIDCONIAR` actually leads.

**Sub-driver chain on D2 (real-income / margin leg):**
`real wages / confidence → discretionary self-medication & supplement spend → OTC/jamu
VOLUME and MIX (trade-up) → branded margin (KLBF-consumer, SIDO, TSPC) → earnings → price`.
This is the branch where the basket's *margin* (not just volume) responds, and where the
one timely handle (`aIDCONIAR`, +1 lead) sits.

**Honest read on the demand tree:** the *volume* engine (BPJS) is unobservable at the
leading node and lagged everywhere else → attribution only. The *forecastable* demand is
the **real-income / OTC-mix leg** via consumer confidence (modest +1 lead). Net: demand
contributes **one modest forward leaf (`aIDCONIAR`)** and several attribution-grade
quantity prints. Demand is *not* where the +0.17 comes from — the rate/FX channels are.

---

## 4. SUPPLY / COST driver tree — the FX-cost channel (the margin swing factor)

This is the more important of the two fundamental trees, because **the ~90%-imported-API
cost base is the basket's margin swing factor** and it is driven by a *liquid, leading,
exogenous price*: **USD/IDR**.

```
SUPPLY / COST
├── S1 imported-API / raw-material cost  (USD — ~90% of inputs; the SWING factor)
│   ├── S1a USD/IDR                                  → usdidr → FX_IDC:USDIDR (D, deep, LEADS)
│   ├── S1b DXY (broad USD / EM-import-cost regime)  → dxy → **TVC:DXY** (D; current BBDXY = DEAD, see §7)
│   └── S1c Pharma import VALUE (USD, realised cost) → CEICI323782002 / CEICI323803602 (USD mn, n172, lag)
├── S2 domestic input-cost inflation  (energy/packaging/overhead echo)
│   ├── S2a CPI YoY (general inflation regime)       → id_cpi_yoy → ECONOMICS:IDIRYY (M)
│   └── S2b Producer Price Index: Pharma mfg         → CEICI527094247 (sup, 2016=100, n13, P3M) — short
├── S3 domestic output / capacity  (supply response — coincident)
│   ├── S3a IPI: Manufacturing: Pharmaceuticals      → CEICI323567902 (sup, 2010=100, n180, P1M) — STALE (last 2024-12)
│   ├── S3b Pharma capacity utilization (biz survey) → CEICI506662937 (sup, %, n14, P3M)
│   └── S3c Pharma PMI subsector                     → CEICI506661587 (sup, %, n15, P3M, timely 2026-06)
└── S4 investment / capacity build  (structural — lagged)
    └── S4a Investment realization (FDI/DDI pharma)  → CEICI235841702 / CEICI412186197 (IDR/USD bn, P3M, lag)
```

| leaf | series (RIC) | role | sign | LEAD | mechanism · quality · forecast hypothesis |
|---|---|---|---|---|---|
| **S1a USD/IDR** | `FX_IDC:USDIDR` | **cost** | **−1** | **+1 to +3** | **The core cost branch.** IDR weakness raises USD-API COGS with a 1–3m inventory/purchasing lag → margin squeeze → earnings cut. **Daily, deep, exogenous, leading.** Asymmetric pass-through: OTC/jamu re-price (cushioned), **BPJS-ethical cannot (KAEF/INAF squeezed hardest)**. This is a genuine forecast leaf — the basket de-rates *ahead* of the reported margin hit. |
| **S1b DXY** | `TVC:DXY` | cost/macro | **−1** | +1 | Broad USD strength = EM-wide import-cost + risk-off regime; reinforces the USD/IDR cost hit and pressures premium-multiple defensives via outflows. **Daily, deep.** **NB: wire to `TVC:DXY` — the current `dxy → TVC:BBDXY` resolver is a DEAD series (weekly_obs 0).** Add only if it carries orthogonal info beyond `usdidr` (test; avoid double-count). |
| **S1c import VALUE** | `CEICI323782002` (+`CEICI323803602`) | cost | −1 | 0 | Realised USD import bill = the cost *after the fact* (volume × USD price). n172 monthly deep but **~2m lagged + confounded** → attribution confirmation of the FX channel, not a forecaster. |
| **S2a CPI YoY** | `ECONOMICS:IDIRYY` | cost | **−1** | 0 | General inflation = domestic input/overhead cost echo (and a margin-squeeze proxy). Monthly, timely. Currently wired. Coincident; weak forward. |
| **S2b PPI: Pharma mfg** | `CEICI527094247` | cost | −1 | 0 | Producer-price index for pharma manufacturing = direct input-cost level. **n13 only (P3M) → too short for power.** Attribution; drop or hold as confirmation. |
| **S3a IPI Pharma** | `CEICI323567902` | supply | +1 | 0 | Domestic pharma production volume. n180 monthly **but STALE (last 2024-12, ~18m old)** → data-quality reject for forecasting; do not wire until refreshed. |
| **S3c Pharma PMI** | `CEICI506661587` | supply | +1 | **+1?** | Prompt Manufacturing Index pharma subsector = forward-looking activity survey. **Quarterly (P3M), n15, but timely (last 2026-06).** Faint forward tell on output; low power (short, quarterly). Experimental. |
| **S4a investment realization** | `CEICI235841702` | supply | +1 | 0 | FDI/DDI into pharma capacity = structural build. Quarterly, lagged → backdrop only. |

**Sub-driver chain on the top cost driver (S1, imported-API cost):**
`Fed funds / DXY / risk-off → USD/IDR → USD-API COGS (1–3m inventory lag) → gross margin
→ earnings → price`. The **leading, observable nodes are USD/IDR and DXY** (both daily,
exogenous), and the trailing realised node is the import-value print (lagged). So the cost
tree, unlike Hospitals', has a **clean leading handle at the top (FX)** — this is the
second pillar of the skill.

**Honest read on the supply/cost tree:** the dominant, value-relevant cost line (imported
APIs) maps to a **liquid, leading FX price (USD/IDR)** → genuinely forecastable, asymmetric
across the basket. The domestic-output and PPI prints are lagged/short/stale → attribution
only. Net: supply/cost contributes the **second forward leaf (USD/IDR, −1)** plus a
backtest-gated DXY companion (with a resolver bug to fix).

---

## 5. MACRO / RATE / FX / FLOW — the defensive-duration anchor (the source of skill)

This is where the **primary forecast branch** lives. The engine's documented +0.17 is
anchored on `id_10y −0.29` — quality-defensive duration re-rating. The mandate is to
**deepen this channel** with the global discount-rate and real-yield legs.

| driver | series (RIC) | role | sign | LEAD | mechanism · forecast hypothesis |
|---|---|---|---|---|---|
| **`id_10y`** govt 10Y | `TVC:ID10Y` | macro | **−1** | **+1 to +3** | **THE ANCHOR — the source of the skill.** KLBF/SIDO/DVLA are long-duration defensive compounders on premium P/Es; their valuation is dominated by the local discount rate. Falling ID 10Y → multiple expansion (re-rate up); rising → de-rating. **Daily, deep (weekly_obs 798), exogenous, leading.** Quality defensives re-price *before* the broad market reads the rate move → this is what generates +0.17. **Do not touch the sign or weight without a backtest.** |
| **`id_bi_rate`** policy 7DRR | `ECONOMICS:IDINTR` | macro | **−1** | 0 to +1 | Policy rate = the front end of the same duration trade + funding cost. Wired. **Correlated with `id_10y`** (same factor) → keep, but recognise it adds little *orthogonal* forward info beyond the 10Y; the 10Y is the cleaner leading leaf. Watch for redundancy in the backtest. |
| **`us_10y`** UST 10Y | `TVC:US10Y` | macro | **−1** | **+1 to +3** | **ADD (priority 1).** Global discount rate / EM-duration. Indonesian quality-defensive multiples co-move with global long rates and the global duration trade — the *same* mechanism that gives Healthcare-Equipment (+0.29) and other defensives their `us_10y` handle. **Daily, deep (weekly_obs 800), leading.** The cleanest single deepening of the anchor: it captures the *global* leg of the duration re-rating that `id_10y` only partly spans. |
| **`us_real_10y`** UST 10Y REAL (TIPS) | **`DFII10`** | macro | **−1** | **+1 to +3** | **ADD (priority 2) — NEW RESOLVER.** The *real* discount rate is the theoretically correct duration handle for a defensive compounder (it strips the inflation component that muddies the nominal yield's signal on multiples). **`DFII10` is live in `market.json` with weekly_obs 800 ("US 10Y Real")** but has **no GLOBAL_CORR resolver** — add `"us_real_10y": "DFII10"`. This is the purest version of the channel the basket already forecasts on. Backtest vs `us_10y`; keep whichever (or the pair) lifts/holds IC without redundancy. |
| **`usdidr`** | `FX_IDC:USDIDR` | macro/cost | **−1** | +1 to +3 | Twofold negative: (i) imported-API cost squeeze (§4 S1a), (ii) EM-outflow/risk-off proxy that pressures premium-multiple defensives. Daily, deep, leading. Wired — the FX pillar. |
| **`dxy`** | **`TVC:DXY`** | macro | −1 | +1 | Broad-USD / EM risk-off regime amplifier. **Resolver bug: current `dxy → TVC:BBDXY` is DEAD (weekly_obs 0).** If added, must point to `TVC:DXY`. Likely **double-counts `usdidr` + `us_10y`** risk-off → add only if backtest shows orthogonal lift; default **SKIP**. |
| `us_2s10s` curve slope | `TVC:US10Y − TVC:US02Y` | macro | (cycle) | — | Both legs exist (US02Y weekly_obs 800). A steepening/flattening cycle proxy. Out-of-scope for a defensive basket; note as available, not recommended. |

**Why duration LEADS here specifically.** A defensive compounder's price ≈ (stable
earnings) / (discount rate − stable growth). With earnings near-non-cyclical, **almost all
the price variance is the denominator** — so the equity is mechanically a *long-duration
bond* and re-prices the *instant* the rate moves, *before* any earnings news. Liquid yield
series (ID10Y, US10Y, DFII10) move continuously and exogenously, while the equity's
re-rating diffuses over weeks → a **structural 1–3 month lead of the yield over the
basket's excess return.** This is the exact mechanism the +0.17 OOS captures, and adding
`us_10y`/`DFII10` deepens the *same* mechanism rather than introducing a new bet — which
is why it is the **skill-protecting** way to add depth.

**Flow note.** These are crowded, foreign-favoured quality names; in EM risk-off
(`usdidr`↑, `us_10y`↑) they de-rate with the global defensive-growth complex. That flow is
*already* captured by the `usdidr` + `us_10y` handles → a separate `dxy` leaf mostly
re-expresses the same factor (and is currently broken). Keep the flow read inside the
rate/FX handles; don't multiply correlated leaves and inflate multiple-testing risk.

**The macro verdict:** the **rate-duration block (`id_10y` anchor + `us_10y` + `DFII10`)
plus the FX-cost handle (`usdidr`)** is the forecast engine. Everything in §3–§4's CEIC
quantity prints is attribution. Deepen the rate block, fix the FX resolver, prune the rest.

---

## 6. Cross-industry linkages

| linked sub-industry | borrowed series | direction | rationale |
|---|---|---|---|
| **Hospitals** (Healthcare, −0.02) | `id_10y`/`us_10y` duration; `usdidr` (imported devices/drugs) | shared factor | Same **defensive-duration + imported-USD-cost** factors. Pharma has the *clean* version (a single dominant USD-API cost line + low-beta bond-proxy names) — which is why Pharma forecasts (+0.17) and Hospitals (noisier bed-ramp idiosyncrasy) does not. Pharma is the *reference* for how the duration handle should behave. |
| **Healthcare Equipment** (+0.29) | `usdidr`; imported-device USD price; `us_10y` duration | sibling forecaster | The other Healthcare SKILL basket — same recipe (clean imported-USD price + defensive duration). Confirms the **USD-import-cost + duration** combination is *the* forecastable structure in Indonesian healthcare. |
| **Household / Staples** (Consumer Non-Cyclicals) | `id_10y` (UNVR bond-proxy −1); `id_cpi_yoy`; real retail | shared factor | **SIDO and KLBF-consumer behave like branded staples**: the same defensive-duration re-rating (UNVR is mapped `id_10y −1`) and real-income/CPI demand logic apply. SIDO's jamu leg is effectively a staples driver set. |
| **Banks / Multifinance** | `CEICI462440547` (OJK health-object financing) | upstream | Consumer health-spend financing originates in the banking/multifinance system; the OJK series is a banking-block leaf re-used as a (lagged) demand proxy for D1. |
| **Chemicals / Basic Materials** | (API feedstock — no clean ID series) | upstream cost | APIs are *imported*, so the domestic chemicals block does **not** drive Pharma cost; the linkage is to global USD pricing (`usdidr`), not to a local feedstock series. Noted to **avoid** a spurious domestic-chemicals cross-wire. |

---

## 7. Currently wired vs available

| status | driver | series (RIC) | role/sign | note |
|---|---|---|---|---|
| **WIRED — keep (ANCHOR)** | `id_10y` | `TVC:ID10Y` | macro −1 | **the source of +0.17 — do not weaken.** |
| **WIRED — keep** | `usdidr` | `FX_IDC:USDIDR` | macro/cost −1 | the FX-cost pillar (imported APIs). |
| **WIRED — keep (watch redundancy)** | `id_bi_rate` | `ECONOMICS:IDINTR` | macro −1 | correlated with `id_10y`; keep, but it adds little orthogonal forward info. |
| **WIRED — keep (weak prior)** | `id_gdp_real_q` | `aIDGDPAR1` | demand +1 | quarterly/lagged structural prior. |
| **WIRED — keep (weak)** | `id_cpi_yoy` | `ECONOMICS:IDIRYY` | cost −1 | input-cost echo; coincident. |
| **WIRED — ceic block (PRUNE)** | `Healthcare/Pharmaceuticals` (27 series) | auto | mixed | mostly **lagged quantity prints** (export/import value+vol, GDP VA, investment realization, quarterly biz-surveys) → coincident/lagging; let data-quality gate cull P1Y + stale + n<20; **exclude the stale IPI**. |
| **ADD (priority 1)** | `us_10y` | `TVC:US10Y` | macro −1 | global duration leg — deepens the anchor with the global discount-rate factor. |
| **ADD (priority 2, NEW RESOLVER)** | `us_real_10y` | **`DFII10`** | macro −1 | **real** discount rate (TIPS) — the theoretically purest duration handle; live in market.json (weekly_obs 800) but **no resolver yet**. |
| **ADD (priority 3)** | `id_consumer_confidence` | `aIDCONIAR` | demand +1 | the one timely *demand* handle (OTC/jamu real-income trade-up); modest. |
| **CONSIDER** | real retail sales | `CEIC322851702` | demand +1 | deep, timely mass-consumption proxy (SIDO/OTC); coincident → attribution. |
| **CONSIDER (gated)** | `dxy` | **`TVC:DXY`** | macro −1 | EM risk-off amplifier; **only if orthogonal to `usdidr`+`us_10y`** in the backtest. |
| **FIX (BUG)** | `dxy` resolver | `TVC:BBDXY` → **`TVC:DXY`** | — | **current `dxy → TVC:BBDXY` is a DEAD series (weekly_obs 0).** Any `dxy` use elsewhere is silently null. (Global mapping bug; out of scope to edit here, but flag.) |
| **SKIP (data-quality)** | IPI Pharma (monthly) | `CEICI323567902` | — | **STALE** (last 2024-12, ~18m) → would inject lookback noise; reject until refreshed. |
| **SKIP (short)** | PPI Pharma / capacity-util / biz-survey | `CEICI527094247` / `506662937` / … | — | n13–15, quarterly → too short for power; attribution at best. |
| **SKIP (annual/lagged)** | GDP-VA, investment-realization, by-province | `CEICI365…` / `235841702` / `368955287` | — | annual/quarterly + lagged → zero monthly-forecast value. |
| **UNAVAILABLE (the real demand node)** | BPJS e-catalogue tender price · formulary listings · covered-lives | — | **policy events, not series.** The leading BPJS-volume node is unobservable to the engine (proxied only by lagged financing). |

---

## 8. Forecastability — why this one LEADS (and how to keep it leading)

**Pharma is a genuine forecaster, and we know why.** Tie to the backtest:

1. **It has TWO leading, exogenous, traded handles — both at the TOP of their chains.**
   Unlike Hospitals (whose value drivers are unobservable corporate ramps), Pharma's two
   biggest price movers are **(a) the discount rate** (`id_10y`/`us_10y`/`DFII10` — daily,
   leading) and **(b) USD/IDR on the API cost base** (daily, leading). Both *precede* the
   reported earnings effect by 1–3 months. The backtest rewards exactly this: **fwd IC
   +0.17, placebo percentile 0.97, n_oos 129, SKILL.**
2. **The defensive-duration mechanism is structural, not fitted.** A near-non-cyclical
   compounder is mechanically a long-duration bond (§5): almost all its price variance is
   the discount-rate denominator, so it re-prices the moment yields move — *before* any
   earnings news. This is a real lead, not a data artefact, which is why it survives the
   blindfolded walk-forward and the placebo null.
3. **Contemporaneous vs forward.** Like everywhere, the contemporaneous co-movement is
   stronger than the forward IC — but here the forward IC is *positive and significant*
   (+0.17), because the yield/FX inputs genuinely lead. This is the opposite of the
   financials/sentiment baskets that co-move contemporaneously then mean-revert (negative
   forward IC). Pharma's posture **forecasts**, not just attributes.
4. **What deepens it (and the keep-rule).** Adding `us_10y` and `us_real_10y` (`DFII10`)
   extends the *same* duration factor that already generates the skill — the highest-
   probability way to **hold or lift** +0.17. Fixing the `dxy` resolver and pruning the
   lagged CEIC quantity prints **removes dilution** of the duration/FX signal. None of
   these is a new bet; all are refinements of the two channels that already work.
5. **What would BREAK it (the protect-the-skill warning).** (i) Over-weighting the lagged
   CEIC quantity block (import/export/GDP-VA) would **dilute** the duration signal with
   coincident noise — the data-quality gate must cull it. (ii) Adding correlated
   risk-off leaves (`dxy` *and* `usdidr` *and* `us_10y` *and* `id_bi_rate` *and* `id_10y`
   all at once) inflates multiple-testing and can degrade OOS even if in-sample R² rises —
   keep the rate block parsimonious (the 10Y anchor + one global leg). (iii) Flipping any
   sign or chasing an in-sample weight would risk the +0.17. **Every change is
   backtest-gated; keep only if forward IC ≥ +0.17 holds or improves.**

**Confidence: HIGH — but parsimonious.** The forward skill is real and mechanism-backed.
Target: **hold/lift +0.17** by deepening the duration channel (global + real yield) and
fixing the FX-resolver bug, while **pruning lagged CEIC noise**. Do not over-engineer; the
two channels (duration + FX-cost) are the whole story.

---

## 9. Engine-wiring spec (`mapping.py`)

Concrete, minimal, **skill-protecting** change to the `"Pharma"` SEED. The guiding
principle: **deepen the two channels that forecast (duration, FX-cost), prune the lagged
CEIC quantity prints, and gate every addition on the blindfolded backtest holding +0.17.**

```python
"Pharma": {
    "ceic": [("Healthcare", "Pharmaceuticals")],
    # Cull the lagged/short/stale quantity prints that dilute the duration signal.
    # The data-quality gate should drop P1Y + n<20 + stale; exclude the worst explicitly:
    "ceic_exclude": [
        "ipi: manufacturing: pharmaceuticals",   # CEICI323567902 — STALE (last 2024-12)
        "investment realization",                # FDI/DDI — quarterly, lagged, no forecast value
        "gross domestic product",                # GDP-VA — quarterly/annual, lagged
        "by province",                           # provincial GDP-VA — annual
    ],
    # Re-role the realised import bill as a (lagged) COST confirmation, not demand:
    "ceic_override": [
        ("import: value: pharmaceutical products", "cost", -1),   # CEICI323782002
    ],
    "globals": [],
    "macro": [
        # ---- RATE-DURATION block (the ANCHOR — source of +0.17). Keep parsimonious. ----
        ("id_10y",       "macro", -1, "ANCHOR: quality-defensive (KLBF/SIDO) bond-proxy duration re-rating — the source of skill"),
        ("us_10y",       "macro", -1, "ADD p1: global discount-rate / EM-duration leg of the same re-rating"),
        ("us_real_10y",  "macro", -1, "ADD p2: REAL discount rate (DFII10/TIPS) — purest duration handle (NEW RESOLVER)"),
        ("id_bi_rate",   "macro", -1, "policy-rate front end (correlated w/ id_10y — watch redundancy)"),
        # ---- FX-COST channel (imported ~90% USD APIs — the margin swing factor) ----
        ("usdidr",       "macro", -1, "imported-API USD cost squeeze (asymmetric: BPJS-ethical can't re-price) + EM risk-off on premium multiples"),
        # ---- DEMAND / real-income (the OTC/jamu margin leg — modest forward) ----
        ("id_consumer_confidence", "demand", +1, "ADD p3: OTC/jamu real-income trade-up (SIDO/KLBF-consumer); only timely demand handle"),
        ("id_gdp_real_q", "demand", +1, "weak structural domestic-demand prior (quarterly, lagged)"),
        ("id_cpi_yoy",    "cost",  -1, "domestic input-cost echo (coincident)"),
        # ---- DO NOT add dxy by default: it double-counts usdidr+us_10y risk-off,
        #      AND the global resolver dxy->TVC:BBDXY is DEAD (weekly_obs 0). If tested,
        #      first fix GLOBAL_CORR: "dxy": "TVC:DXY". ----
    ],
},
```

**New resolver required (in `GLOBAL_CORR`):**
```python
"us_real_10y": "DFII10",   # US 10Y Real Yield (TIPS) — market.json, weekly_obs 800, no prior resolver
```
**Resolver bug to fix (global, flag — affects every basket that uses `dxy`):**
```python
"dxy": "TVC:DXY",          # was "TVC:BBDXY" → DEAD (weekly_obs 0). TVC:DXY has weekly_obs 800.
```

**Resolvers already present** (no new work): `id_10y → TVC:ID10Y`, `us_10y → TVC:US10Y`,
`id_bi_rate → ECONOMICS:IDINTR`, `usdidr → FX_IDC:USDIDR`, `id_consumer_confidence →
aIDCONIAR`, `id_gdp_real_q → aIDGDPAR1`, `id_cpi_yoy → ECONOMICS:IDIRYY`.

**Falsifiable backtest plan (keep-rule: forward IC must hold ≥ +0.17 or improve; never
keep an in-sample-only gain):**
1. **Baseline** = current seed → reproduce **fwd IC +0.17, placebo 0.97, n_oos 129**.
2. **+`us_10y`** alone → expected to **hold/lift** IC (deepens the anchor with the global
   duration leg). Keep iff IC ≥ +0.17 and placebo ≥ 0.95.
3. **+`us_real_10y` (`DFII10`)** → test alone *and* paired with `us_10y`; keep whichever
   maximises forward IC without redundancy (if `us_10y` and `DFII10` are near-collinear,
   keep the **real** one — purer mechanism). Add the new resolver first.
4. **ceic prune** (exclude stale IPI / investment / GDP-VA / provincial) → expected to
   **hold or tick up** by removing coincident dilution; keep iff non-degrading.
5. **+`id_consumer_confidence`** → keep only if it adds *orthogonal* forward signal
   (likely a small lift via the OTC/jamu margin leg; drop if it doesn't move IC).
6. **`dxy` (`TVC:DXY`)** → test *only after* the resolver fix; **expect redundancy** with
   `usdidr`+`us_10y` → default **reject** unless it adds orthogonal lift.
7. Run `backtest/bt.py "Pharma"` after each step. **Confirmation criterion:** the deepened
   rate block (`id_10y`+`us_10y`+`DFII10`) raises forward IC above +0.17 (or holds it with
   a richer, more honest tree) while the prune removes noise — confirming the skill is the
   *duration channel*, not the CEIC quantity prints. **Falsifier:** if adding the global/
   real-yield legs *lowers* forward IC or drops the placebo percentile below ~0.90, the
   global-duration hypothesis is wrong for this basket → revert to the `id_10y`-only anchor.

---
*Series cited exist in `plan/catalog/idind.json` (Healthcare/Pharmaceuticals — 27 RICs incl.
`CEICI324037702`/`CEICI323782002`/`CEICI323567902`), `id.json` (CPI Health `CEIC521347917`,
consumer survey `aIDCONIAR`/`aIDCSCRICMP`, real retail `CEIC322851702`), `market.json`
(`TVC:ID10Y` w798, `TVC:US10Y` w800, `DFII10` "US 10Y Real" w800, `FX_IDC:USDIDR` w801,
`TVC:DXY` w800; `TVC:BBDXY` **w0 = DEAD**), and `mapping.py::GLOBAL_CORR`. Backtest figures
from `BACKTEST.md` (Pharma: fwd IC +0.17, n_oos 129, placebo 0.97, SKILL).*
