# Construction (Infrastructure) — Driver-Tree Plan

> Detail file for the `Construction` sub-industry basket (id `infrastructure_construction`).
> Framework: `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4
> template · §5 capsule #29). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs`.
>
> **One-line thesis: this basket is a portfolio of HIGHLY-LEVERAGED SOE constructors (the
> "Karya" co's — WIKA, PTPP, ADHI, WSKT) whose equity is driven by THREE things in order of
> forecast value: (1) financing cost / leverage stress — the leading, daily rate prices
> `id_10y` + WC lending rate — because these names are balance-sheet-distressed and
> rate-elastic; (2) new-contract / APBN-infra-capex flow — slow, lumpy, political, captured
> only by publication-lagged GDP-Construction / FDI-DDI-Construction prints (attribution,
> not forecast); (3) the steel+cement cost stack. The honest verdict (matching the current
> OOS = NONE, +0.05) is that govt-capex demand is forward-FLAT — lumpy and political — while
> rates give the only lead, and the Karya balance-sheet distress is idiosyncratic noise.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Construction**, sector *Infrastructure*, id `infrastructure_construction` |
| mcap | **~37T** (capsule #29; worklist total_mcap 37.3T) |
| n_names | **16** |
| Members | **WIKA** (`IDX:WIKA`, 8.1T, β0.12) — Wijaya Karya, flagship SOE EPC, deeply leveraged; **SSIA** (`IDX:SSIA`, 7.5T, β0.83) — Surya Semesta, industrial-estate + private constructor (NOT a Karya; high-beta, the real cyclical); **WSKT** (`IDX:WSKT`, 5.8T, β n/a) — Waskita Karya, the most balance-sheet-distressed Karya (debt restructuring, suspended); **TOTL** (`IDX:TOTL`, 3.6T, β0.35) — Total Bangun Persada, private, low-leverage building contractor; **BUKK** (`IDX:BUKK`, 1.9T, β−0.40) — Bukaka, infra steel/equipment; **ADHI** (`IDX:ADHI`, 1.5T, β0.38) — Adhi Karya, Karya (LRT/MRT); **ACST** (`IDX:ACST`, 1.4T, β0.10) — Acset Indonusa (Astra), distressed; **PTPP** (`IDX:PTPP`, 1.3T, β0.26) — PP (Persero), Karya; **NRCA** (`IDX:NRCA`, β−0.09), **JKON** (`IDX:JKON`, β0.23) — Jaya Konstruksi (private, healthy), **PPRE** (`IDX:PPRE`, β0.63) — PP Presisi (precast), **PTPW**, **DGIK**, **IDPR**, **WEGE** (Wika Gedung), **MTRA** (mcap≈0, noise). |
| Effective composition | **Bimodal.** ~57% of mcap is leveraged SOE "Karya" EPC (WIKA+WSKT+ADHI+PTPP+PPRE+WEGE) — the rate/balance-sheet-stress complex; the rest is **private constructors** (SSIA, TOTL, JKON, NRCA) that are healthier and more demand-cyclical. The equal-weight basket the engine builds blends a *distressed-SOE-leverage* factor with a *private-cyclical* factor. SSIA (β0.83) and PPRE (β0.63) carry the cyclical beta; the Karya names carry the idiosyncratic restructuring news. **Read every driver as "does this move the blended Karya-plus-private constructor basket".** |
| Current grade | **perfected** (a label on a thin seed — see gap) |
| Current kept-driver count | **7** (`_state.txt` rank 29) |
| Current forward OOS | **NONE** — fwd IC **+0.05** / **−0.05** hit-up, placebo pctile **0.77**, n_oos 129 (BACKTEST.md row 45: "perfected / high confidence_label / +0.04 trailing / −0.05 fwd / 0.77 / weak"). The basket has **no blindfolded forward skill** today: the forward IC sign flips negative and the placebo pctile (0.77) is below the 0.80 marginal bar. |

**Current seed (`mapping.py` → `SEED["Construction"]`):**
```python
"Construction": {
    "ceic": [("Industrials & Manufacturing", None)],
    "globals": [("steel_hrc", "cost", -1, "rebar input"),
                ("wb_coal_au", "cost", -1, "cement/energy input")],
    "macro": [("id_10y", "macro", -1, "10Y yield: financing cost (leveraged SOEs)"),
              ("id_bi_rate", "macro", -1, "policy rate"),
              ("id_gdp_real_q", "demand", +1, "APBN infra spend proxy"),
              ("usdidr", "macro", -1, "FX risk for leveraged balance sheets")],
},
```

**The gap (three problems).**
1. **Wrong CEIC block.** The seed pulls `("Industrials & Manufacturing", None)` — the entire
   220-series manufacturing block (Manufacturing Production Index, Textiles, Chemicals,
   Basic-Metals output…), almost all of which are **endogenous manufacturing-output prints**
   irrelevant to construction demand and which *swamp* the candidate set. It does **NOT** pull
   the **`("Infrastructure", "Construction")`** sub-block — the one place where the genuine
   construction-demand series live: **GDP: Construction**, **FDI/DDI: Construction**,
   **Machinery: Construction share**, **Consumer-Confidence**, **Household % Loan-Repayments /
   % Savings**. The single most important fix is to swap the CEIC pull.
2. **APBN capex proxied by whole-economy GDP.** `id_gdp_real_q` → `aIDGDPAR1` is *total* real
   GDP, not construction activity. The construction-specific **`GDP: Construction`**
   (`CEICI365751867`, P3M, n=73) is a far tighter activity proxy and lives in the block we are
   not pulling. There is **no clean APBN-capex / govt-infra-spend price series** in the store
   (`id_govt_debt` → None), so GDP-Construction + FDI/DDI-Construction + Cement-consumption
   are the best available demand attribution.
3. **Financing cost is under-specified.** The thesis is that these are *highly leveraged,
   working-capital-intensive* SOEs — yet the seed wires only the policy rate and the 10Y. The
   real borrowing cost is the **WC lending rate** (`CEIC14405201`, n=397) and the system **WC /
   investment loan flow** (`CEIC230931402` / `CEIC230932202`), none currently used.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (EPC / general contracting):**
```
Revenue(t)  ≈ Σ projects:  burn-rate(new-contract orderbook)        ← APBN/SOE/private capex AWARDS
            (revenue is recognised % -of-completion off the BACKLOG won in prior periods → built-in LAG)
Gross prof. ≈ Revenue − (steel + cement + aggregates + subcontract + labour)
EBIT        ≈ Gross − SG&A
Net/EPS     ≈ EBIT − INTEREST(net debt × borrowing rate)            ← the swing factor for the Karya names
FCF         ≈ Net + D&A − ΔWorking-capital(receivables + retentions + advances)  ← chronic WC drain
```

Five structural facts drive the modelling:

1. **New-contract flow is the demand primitive, and it is LUMPY + POLITICAL.** A constructor's
   forward revenue is its **orderbook** (new contracts won). For the SOE Karya names, the
   dominant customer is the **government (APBN infrastructure capex)** — toll roads, dams,
   ports, IKN (the new capital), LRT/MRT. APBN capex is set annually in the budget, released
   in tranches, front/back-loaded for political reasons (elections, fiscal consolidation), and
   periodically *frozen* (the 2024-25 efficiency drive cut infra allocations sharply). There is
   **no monthly new-contract series in the store**; the closest proxies are quarterly
   **GDP-Construction** and **FDI/DDI-Construction**. This lumpiness is *why the basket is
   forward-flat on the demand side* — the signal arrives in slow, political, publication-lagged
   prints.

2. **These are HIGHLY LEVERAGED, balance-sheet-stressed SOEs → rate- and credit-sensitive.**
   The Karya co's funded a decade of state-directed infra build with debt and short-dated
   working-capital facilities, leaving them with **very high net-debt/EBITDA and chronic
   negative operating cash flow** (turnkey/deferred-payment projects where the contractor
   finances the asset until the state pays). WSKT entered formal debt restructuring and was
   suspended; ACST near-distress. Consequently **interest cost is the earnings swing factor**,
   and the equities are *acutely* sensitive to (a) the level of rates (`id_10y`, WC lending
   rate) and (b) credit/refinancing availability. A rate cut or a state bailout/rights-issue
   moves these names more than a new project award does. This is the **balance-sheet-distress
   idiosyncrasy** that the §1 OOS = NONE reflects: much of the variance is name-specific
   refinancing news, not a systematic factor.

3. **Working-capital intensity amplifies rate sensitivity.** Constructors carry huge
   receivables + retention money + project advances. Funding that swing needs **working-capital
   credit**; the cost is the **WC lending rate**. When WC credit tightens or its rate rises,
   the leveraged names' cash flow and equity suffer disproportionately. The system WC-loan
   growth (`CEIC230931402`) and WC lending rate (`CEIC14405201`) are the cleanest financing
   proxies available.

4. **Cost stack = steel + cement + energy.** Reinforcing bar/structural steel and cement are
   the dominant bought-in materials. Steel is import/global-priced (HRC `NYMEX:HRC1!`); cement
   cost tracks coal (~30% of cement cash cost, API2 `ICEEUR:ATR1!`). On *fixed-price* contracts
   a steel/cement spike compresses margin (cost −1); on *cost-plus* it passes through. Net, the
   input commodities are a **margin-swing**, secondary to financing.

5. **Intra-basket dispersion is large.** SSIA / TOTL / JKON / NRCA are **private, lower-
   leverage, demand-cyclical** — they respond to private-construction and industrial-estate
   demand and carry the basket's positive beta. The Karya SOEs respond to APBN + their own
   refinancing. So the basket is a *blend of a cyclical-demand factor and a distressed-SOE-
   leverage factor* — which is exactly why a single clean systematic driver is hard to find
   and the forward IC is near zero.

**What a sell-side analyst actually watches:** **new-contract / orderbook value and burn**
(reported quarterly per name; no aggregate series), **APBN infrastructure budget realisation**,
**net gearing & operating cash flow** (the distress gauge), the **10Y yield + WC lending rate**
(interest cost), **steel & cement prices** (margin), and **rights-issue / state-capital-injection
(PMN) / debt-restructuring headlines** (idiosyncratic). Of these, only rates, FX and steel are
high-frequency leading prices; everything demand-side is slow.

---

## 3. DEMAND driver tree

> Demand = **new-contract flow**, dominated by govt (APBN) infra capex for the SOEs and private
> capex for SSIA/TOTL/JKON. In our data this is captured **only by slow quarterly/annual CEIC
> prints** (GDP-Construction, FDI/DDI-Construction) plus one *monthly* real-activity proxy
> (machinery-construction-share, cement consumption). Per IMPROVEMENT_PLAN §3, these quantity
> prints are publication-lagged → **strong for attribution, weak-to-useless for forecasting.**

```
DEMAND (forward revenue = new-contract orderbook flow)
├── D1 Govt / APBN infrastructure capex (the SOE demand primitive) ─► public construction activity
│     ├─ GDP: Construction ··············  CEICI365751867 [sup→DEMAND-proxy, IDR bn, P3M, n=73]  sign +1, lag ~0 (coincident, pub-lagged ~45d) ★best activity proxy
│     │     (dup print: CEICI365752057, same series; annual CEICI365752837 / CEICI365753027 [P1Y, n=18])
│     ├─ DDI: Construction ··············  CEICI235842602 [dem, IDR bn, P3M, n=117]   sign +1, lag ~0-1 (domestic direct investment INTO construction)
│     ├─ FDI: Construction ··············  CEICI235845302 [dem, USD mn, P3M, n=138 since 1990]  sign +1, lag ~0-1 (foreign capex into construction; long history)
│     │     (alt FDI print: CEICI357004677 [P3M, n=65])
│     └─ (NO direct APBN-capex / govt-infra-spend price series — id_govt_debt→None. STRUCTURAL GAP, §7.)
├── D2 Real-construction activity (higher-frequency proxy) ─► heavy-equipment + materials pull
│     ├─ Machinery: Construction share ··  CEICI391910487 [dem, %, P1M, n=232]   sign +1, lag ~0-1 ★only MONTHLY demand series — share of heavy-equipment sales going to construction
│     ├─ Machinery sales: Total ·········  CEICI391910517 [dem, Unit, P1M, n=232]  sign +1, lag ~0-1 (total heavy-equipment demand; cross-link Machinery #20 / UNTR)
│     ├─ Cement Consumption ·············  CEICI13536901 [dem, Ton th, P1M, n=388 since 1994]  sign +1, lag ~0 ★longest monthly construction-volume pulse
│     └─ Cement Sales ··················   CEICI13536401 / CEICI252871102 [dem, Ton, P1M, n=358/256]  sign +1 (corroborates volume)
├── D3 Private-construction / discretionary demand backdrop (SSIA/TOTL/JKON leg) ─► confidence & income
│     ├─ Consumer Confidence Index ······  CEICI277372502 [dem, Point, P1M, n=196]  sign +1, lag ~0-1 (monthly; private-build sentiment)
│     ├─ CCI: Expected Business Condition  CEICI277373202 [dem, Point, P1M, n=196]  sign +1 (forward-looking component)
│     └─ id_gdp_real_q ·················   aIDGDPAR1 [P3M]  sign +1 (current seed; whole-economy demand backdrop, coarse)
└── D4 Household financing intent (gearing/affordability read) ─► credit appetite
      ├─ Household: % Loan Repayments ···  CEICI373675847 [dem, %, P1M, n=168]  sign −1 (rising repayment burden = stressed credit = weaker private build)
      └─ Household: % Savings ···········  CEICI373675857 [dem, %, P1M, n=168]  sign ~0 (precautionary-savings read; ambiguous)
```

**Forecast hypothesis (demand): forward-FLAT.** D1 (the *core* demand — APBN/private capex
flow) is **quarterly, publication-lagged, lumpy and political** → it explains the basket's
multi-year trend (the 2015-19 infra boom; the 2020-25 deleveraging bust) but **cannot forecast
next month's excess return**. The only monthly demand series — **machinery-construction-share
(D2) and cement consumption** — are coincident real-activity pulses, useful for *attribution*
and marginally leading at best. **Net: the demand tree is an attribution tree. The lumpy,
political nature of APBN capex is precisely why this branch does not forecast** — there is no
liquid leading price for government infrastructure spending.

---

## 4. SUPPLY / COST driver tree

> "Supply" for a constructor is its delivery capacity (labour + equipment) — not a binding
> constraint here — so this section is really the **input-cost stack** (steel + cement + energy)
> that swings margin. The cost branch carries the **leading, liquid commodity prices**.

```
SUPPLY / COST (input-cost stack → gross margin)
├── C1 Steel (rebar + structural) — primary bought-in material ─► margin on fixed-price work
│     ├─ steel_hrc ····················  NYMEX:HRC1! [cost, wk=800]  sign −1, lag ~0-1 ★leading daily price; rebar/structural-steel proxy
│     │     mechanism: HRC ↑ → material cost ↑ → margin ↓ on fixed-price contracts (pass-through on cost-plus)
│     └─ CEIC Steel import value ······  (Basic Materials/Steel block, idind) [P1M, n=172]  sign −1 (slow quantity confirm; attribution)
├── C2 Cement — second material + the property/infra demand mirror ─► dual cost/demand read
│     ├─ wb_coal_au (API2) ············  ICEEUR:ATR1! [cost, wk]  sign −1, lag ~0-1 (coal ≈ 30% of cement cash cost → cement price proxy, leading)
│     ├─ Cement Consumption ···········  CEICI13536901 [dem, Ton th, P1M, n=388]  sign +1 (see D2 — a DEMAND read, not cost; cement is BOUGHT not made here)
│     └─ (NOTE: this basket BUYS cement → Cement #28 is the SELLER. Cement price ↑ = cost −1; cement VOLUME ↑ = construction demand +1. Keep the two roles distinct.)
├── C3 Energy / fuel / logistics ─► site power, diesel, haulage
│     └─ brent ························  ICEEUR:BRN1! [cost, wk]  sign −1 (diesel for plant + aggregate haulage; small, second-order)
└── C4 Aggregates / labour ─► local, unpriced
      └─ (no clean time series — domestic sand/gravel/labour; structural, document only, §7)
```

**Forecast hypothesis (supply/cost): the only forecastable cost branch is `steel_hrc`** —
daily, exogenous, genuinely leading the margin print. API2 coal (cement-cost proxy) is
secondary; Brent (diesel) is third-order. CEIC steel/cement *quantity* prints are
attribution-only. **Net cost forecast candidate: `steel_hrc`, sign −1** (margin compression),
with `wb_coal_au` −1 as the cement-cost corroborant. But note: cost is *second-order* to
financing for these leveraged names — a 10% steel move matters far less to EPS than a 100bp
rate move does, because interest is the swing factor.

---

## 5. MACRO / RATE / FX / FLOW — the systematic core (this is where the lead lives)

> **This is the section that matters for Construction.** Highly-leveraged, WC-intensive SOEs
> are, to first order, a **rates + credit-availability trade**. The demand tree is slow and
> the cost tree is secondary; the financing branch is the one liquid, leading, daily-priced
> systematic driver — and even it competes with idiosyncratic refinancing news.

```
MACRO / RATE / FX / FLOW
├── M1 FINANCING COST — the dominant systematic branch ★★★
│     ├─ id_10y ·················  TVC:ID10Y [P1D, wk=798]   sign −1, lag ~0-1 ★the leveraged-balance-sheet discount/refinancing rate
│     │     mechanism: 10Y ↑ → refinancing + new-debt cost ↑ on heavily-geared Karya book → interest ↑ → EPS/equity ↓. Bonds move first, daily.
│     ├─ WC lending rate ········  CEIC14405201 [P1M, n=397]  sign −1, lag ~0-1 ★the ACTUAL working-capital borrowing cost (fixes dead id_lending_rate)
│     ├─ id_bi_rate ·············  ECONOMICS:IDINTR [P1M]    sign −1 (policy anchor; coarse STEP — confirm, not primary; current seed)
│     ├─ id_01y ·················  TVC:ID01Y [P1D, wk=793]   sign −1 (short-end / WC-refi cost; constructors fund short)
│     └─ us_10y ·················  TVC:US10Y [P1D, wk=800]   sign −1 (global rate beta; ID curve co-moves)
├── M2 CREDIT AVAILABILITY / refinancing window ─► can the leveraged names roll their debt?
│     ├─ Working-capital loan growth ··  CEIC230931402 [dem, P1M, n=279]  sign +1, lag ~1 (system WC credit flow; tight credit starves WC-intensive constructors)
│     ├─ Investment loan growth ······  CEIC230932202 [dem, P1M, n=279]  sign +1, lag ~1 (capex-financing availability)
│     └─ id_bank_credit ············   aIDLONYAR [P1M]  sign +1 (broad system credit growth; liquidity regime)
├── M3 FX / balance-sheet risk ─► IDR weakness on FX debt + EM risk-off
│     └─ usdidr ··················  FX_IDC:USDIDR [P1D, wk=801]  sign −1, lag ~0 (USD-debt revaluation on geared book + EM risk-off proxy; current seed)
└── M4 RISK APPETITE / flow ─► high-beta cyclical leg (SSIA/PPRE) + EM flow
      ├─ dxy ····················  TVC:DXY (NOT TVC:BBDXY) [P1D, wk=800]  sign −1 (broad USD → EM outflow → ID rates up → constructors down)
      └─ jci ····················  benchmark only — NEVER a driver (excess-return base)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
DXY / Fed / US10Y ─► ID 10Y + WC lending rate ─► Karya interest cost & refi window ─► EPS / equity
   (global, daily)     (market/admin, leading)      (the leverage transmission)         (the basket)

APBN budget (annual, political) ─► new-contract awards ─► GDP-Construction print (Q, lagged) ─► revenue (recognised over years)
   (no price series)                 (no monthly series)        (attribution only)                (already in the past by print time)
```
The engine should lean on the **leading financing parent (rates → WC rate → refi)** to
anticipate the equity, because the demand parent (APBN capex) has *no leading price* and arrives
only as a stale quarterly quantity print — the textbook IMPROVEMENT_PLAN §1 pattern, here with a
*broken* demand chain and an *intact* financing chain.

**Forecast hypothesis (macro): this is the only place forecastability could live, via RATES +
CREDIT.** `id_10y` and the **WC lending rate** (M1) are the best forward candidates: liquid/
administered, leading, and they hit the leverage transmission directly. `usdidr` (M3) and `dxy`
(M4) are secondary leading prices. **But** — honest caveat — much of these names' variance is
*idiosyncratic refinancing / restructuring / state-injection news* (WSKT suspension, PMN, rights
issues) that no macro series predicts, which caps the achievable systematic IC and is the likely
reason the current forward IC is ~0.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Cement #28 / Construction Materials #37** (the SELLERS) | Cement Consumption `CEICI13536901`, Cement Sales `CEICI13536401` | demand +1 (volume) / cost −1 (price) | This basket BUYS cement; cement *volume* is a construction-demand mirror (+1), cement *price/cash-cost* (API2 `ICEEUR:ATR1!`) is an input cost (−1). Keep roles distinct. Cement #28 and this basket should co-move on the infra cycle. |
| **Metals (steel) #35 / Basic Materials Steel** | `steel_hrc` (`NYMEX:HRC1!`); CEIC steel import value | cost −1 | Rebar/structural steel is the #1 material; steel-makers (#35) are the counterparties — opposite cost/revenue sign. |
| **Machinery #20 (UNTR) / Conglomerate (ASII)** | Machinery: Construction share `CEICI391910487`, total `CEICI391910517` | demand +1 | Heavy-equipment-sales-to-construction is a shared real-activity pulse: UNTR sells the machines, constructors buy them. ACST is an Astra co (ASII linkage). |
| **Banks #1 / Multifinance** | WC lending rate `CEIC14405201`; WC loan `CEIC230931402`; investment loan `CEIC230932202`; `aIDLONYAR` | macro −1 (rate) / +1 (credit flow) | The financing transmission. Bank credit-tightening starves WC-intensive constructors; same rate regime drives both. |
| **Property #7** | RPPI / mortgage-loan growth (Property block) | demand +1 (indirect) | Private-residential constructors (TOTL/JKON) feed off the property cycle; SSIA sells industrial estates. The infra-SOE leg is govt-driven and decoupled from property. |
| **Toll Road #46** | `id_10y`, `id_gdp_real_q` | macro | Toll operators are the *downstream owners* of what the SOEs build (WIKA/ADHI have toll subsidiaries); both are leveraged-annuity, rate-sensitive — shared duration factor. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC pull** | **`("Industrials & Manufacturing", None)` — WRONG block** (220 endogenous mfg-output series, no construction demand) | **swap to `("Infrastructure", "Construction")` + `("Infrastructure", "Cement")`** — the real demand block | **P0 — the central fix** |
| Govt/APBN capex (demand) | `id_gdp_real_q` (whole-economy GDP, coarse) | **GDP-Construction `CEICI365751867` +1**; FDI-Construction `CEICI235845302` +1; DDI-Construction `CEICI235842602` +1 | **P0** |
| Real-activity proxy (monthly) | none | **Machinery-Construction-share `CEICI391910487` +1**; Cement-Consumption `CEICI13536901` +1 | **P1 — the only monthly demand pulse** |
| Financing cost (rates) | `id_10y` −1 ✓, `id_bi_rate` −1 ✓ | **WC lending rate `CEIC14405201` −1** (fixes dead `id_lending_rate`); `id_01y` −1 | **P0 — the leverage transmission** |
| Credit availability | none | WC-loan `CEIC230931402` +1; investment-loan `CEIC230932202` +1; `id_bank_credit` +1 | P1 |
| FX / balance-sheet risk | `usdidr` −1 ✓ (kept) | `dxy` −1 (flow parent) | P1 |
| Steel cost | `steel_hrc` −1 ✓ (kept) | (already optimal) | — |
| Cement/energy cost | `wb_coal_au` −1 ✓ (kept) | `brent` −1 (diesel, small) | P2 |
| Private-build sentiment | none | Consumer-Confidence `CEICI277372502` +1; CCI-Expected-Business `CEICI277373202` +1 | P2 |
| Household credit stress | none | `% Loan Repayments` `CEICI373675847` −1 | P3 |
| **New-contract / orderbook** | none | **NO aggregate series in store** — per-name quarterly only. STRUCTURAL GAP. | document only |
| **APBN-capex price series** | none | **NONE** (`id_govt_debt`→None). Govt fiscal series in `id.json` are annual `n_obs=None` / quarterly debt prints (`CEIC396549377` Gross Public Debt P3M n=64) — lagged, not capex. | document only |

**Bugs / resolver issues to call out:**
- **`dxy` → `TVC:BBDXY` is EMPTY (weekly_obs=0)** in the store. Use **`TVC:DXY` (wk=800)** —
  either remap `dxy`→`TVC:DXY` in `GLOBAL_CORR` or cite `TVC:DXY` directly. (Same bug noted in
  `infrastructure_telco.md`.)
- **`id_lending_rate` → None** (spark-only). Map the financing branch to the real CEIC **WC
  lending rate `CEIC14405201`** (n=397) instead — the correct borrowing cost for WC-intensive
  constructors.
- **`id_govt_debt` → None** — there is no APBN-capex price series; do not pretend GDP is it.
  GDP-Construction + FDI/DDI-Construction are the honest demand attribution.
- The current `("Industrials & Manufacturing", None)` pull is **endogenous-leak-prone**: it
  rakes in Manufacturing-Production-Index / Basic-Metals-output / textile prints that are other
  industries' supply and dilute the candidate set with irrelevant series.

---

## 8. Forecastability verdict

**The basket is forward-FLAT today (OOS = NONE, +0.05 trailing / −0.05 fwd / 0.77 pctile), and
the honest framing is: the only branch that *could* lead is FINANCING (rates + WC rate + credit),
while the core DEMAND branch (APBN/govt-infra capex) is structurally un-forecastable here.**

- **Why demand does NOT lead (the central concession).** New-contract flow for the SOE Karya
  names is **government APBN infrastructure capex** — lumpy (budget tranches), political
  (election cycles, the 2024-25 efficiency freeze), and captured in our data only by
  **quarterly, publication-lagged GDP-Construction / FDI-DDI prints**. There is **no liquid,
  leading price for government spending** anywhere in the store. So the demand tree explains the
  multi-year trend (boom 2015-19, deleveraging bust 2020-25) but cannot forecast monthly excess
  return. *This is the structural reason for forward-flatness, exactly as the brief anticipates.*

- **Why the residual is idiosyncratic (the second concession).** Even holding the cycle fixed,
  the Karya names' returns are dominated by **name-specific balance-sheet events** — WSKT debt
  restructuring/suspension, ACST distress, state-capital injections (PMN), rights issues,
  contract-receivable write-downs. No macro series predicts these. They inject noise that caps
  the systematic IC and is the most likely reason the current forward IC sits at ~0.

- **Where the (modest) lead could come from — RATES + CREDIT.** Because these are *highly
  leveraged, WC-intensive* balance sheets, the **financing branch is genuinely transmissive and
  leading**: `id_10y` (wk=798) and the **WC lending rate** (n=397) are liquid/administered,
  move ahead of the earnings print, and hit interest cost — the EPS swing factor — directly. A
  falling-rate / easing-credit regime should lift the leveraged Karya leg before any new award
  shows up; a tightening regime should crush it. `usdidr`/`dxy` add a secondary FX/flow lead on
  the geared book.

- **Contemporaneous vs forward.** GDP-Construction, FDI/DDI, cement-consumption and machinery-
  share are **contemporaneous attribution** — they tell you *why* the basket moved (the infra
  cycle), not where it goes next. The rate prices are the only plausible *forward* signal.

**What would move it from NONE → marginal:**
1. **Fix the CEIC block** (P0): pull `("Infrastructure","Construction")`+`("Infrastructure","Cement")`
   so the engine sees real construction-demand series instead of 220 endogenous mfg prints.
2. **Wire the financing transmission cleanly** (P0): add the **WC lending rate `CEIC14405201`**
   (−1) alongside `id_10y`, and keep `id_bi_rate` only as a coarse confirm. Hypothesis: the WC
   rate + 10Y combination forecasts the leveraged leg better than the policy step alone.
3. **Add credit-availability** (P1): WC/investment-loan growth (+1) — a tightening proxy that
   should lead the distressed names.
4. **Down-weight demand to attribution** and accept the lumpy/political concession.

**Honest ceiling.** Given (a) un-forecastable lumpy political govt-capex demand and (b)
idiosyncratic SOE-distress noise, the realistic ceiling is **marginal (IC ~0.05-0.08)**, achieved
by a *thin, financing-led* posture — NOT by piling on lagging quantity prints. **If, after the
rates-led rewire, forward IC stays < 0.05, the honest verdict is to read Construction's engine
output as a contemporaneous infra-cycle + rates-posture ATTRIBUTION (and a leveraged beta on the
rate regime), NOT a forecaster** — consistent with how BACKTEST.md treats lumpy/idiosyncratic
baskets.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Construction"]`:**
```python
"Construction": {  # leveraged SOE "Karya" constructors (WIKA/PTPP/ADHI/WSKT) + private (SSIA/TOTL/JKON).
    # P0: pull the REAL construction-demand block (Infrastructure/Construction +
    # Infrastructure/Cement), NOT the 220-series Industrials manufacturing block
    # (endogenous mfg-output prints with no construction-demand content).
    "ceic": [("Infrastructure", "Construction"),
             ("Infrastructure", "Cement")],
    # Re-role the construction-demand prints to demand (+); the block tags
    # GDP-Construction as 'supply' and cement as mixed — correct them:
    "ceic_override": [("gdp: construction",          "demand", +1),   # CEICI365751867 — APBN/activity proxy
                      ("fdi: construction",          "demand", +1),   # CEICI235845302
                      ("ddi: construction",          "demand", +1),   # CEICI235842602
                      ("machinery: construction",    "demand", +1),   # CEICI391910487 — monthly real-activity
                      ("cement consumption",         "demand", +1),   # CEICI13536901 — volume = construction demand
                      ("consumer confidence index",  "demand", +1)],  # CEICI277372502 — private-build sentiment
    # Exclude endogenous / irrelevant prints the cement block drags in (the basket
    # BUYS cement; trade-value/USD HS-code lines are noise, not drivers):
    "ceic_exclude": [("value: articles of stone"),   # HS-code trade-value noise
                     ("china:"), ("usa:"),           # bilateral trade-value lines
                     ("aneka tambang"),              # silver-output mis-filed under Cement
                     ("dental cement")],             # pharmaceutical mis-match
    "globals": [("steel_hrc",  "cost", -1, "rebar/structural steel = #1 material (leading price)"),
                ("wb_coal_au",  "cost", -1, "API2 coal ~30% of cement cash cost (cement-cost proxy)"),
                ("brent",       "cost", -1, "site diesel + aggregate haulage (small, second-order)")],
    "macro": [
        # ── the systematic spine: FINANCING COST (leveraged, WC-intensive SOEs) ──
        ("id_10y",       "macro", -1, "PRIMARY: refinancing/discount rate on geared Karya book (leading)"),
        ("id_lending_rate","macro",-1, "WC borrowing cost — REMAP to CEIC14405201 (see resolver note)"),
        ("id_01y",       "macro", -1, "short-end / WC-refi cost (constructors fund short)"),
        ("id_bi_rate",   "macro", -1, "policy anchor (coarse confirm, not primary)"),
        # ── credit availability / refinancing window ──
        ("id_bank_credit","demand",+1, "system credit growth — tight credit starves WC-intensive constructors"),
        # ── FX / balance-sheet + flow ──
        ("usdidr",       "macro", -1, "USD-debt revaluation on geared book + EM risk-off"),
        ("dxy",          "macro", -1, "broad USD -> EM outflow -> ID rates up (REMAP to TVC:DXY)"),
        # ── demand backdrop (attribution; slow, lumpy, political) ──
        ("id_gdp_real_q","demand", +1, "whole-economy demand backdrop (coarse; GDP-Construction added via ceic)"),
    ],
},
```

**Resolver notes / required `GLOBAL_CORR` fixes:**
1. **`dxy` → `TVC:BBDXY` is EMPTY (wk=0).** Remap `"dxy": "TVC:DXY"` (wk=800, populated) in
   `GLOBAL_CORR`, or the `dxy` hint silently resolves to an empty series. (Same fix flagged in
   Telco.)
2. **`id_lending_rate` → None** currently. Add a resolver `"id_lending_rate": "CEIC14405201"`
   (Lending Rate: IDR: Commercial Banks: Working Capital, P1M, n=397) — the correct WC borrowing
   cost for this basket. Alternatively add a *new* tag, e.g. `"id_wc_lending_rate":
   "CEIC14405201"`, and use it in the macro list. **This is the single most thesis-relevant
   resolver fix** (financing is the swing factor).
3. `id_10y`/`id_01y`/`id_bi_rate`/`usdidr`/`steel_hrc`/`wb_coal_au`/`brent`/`id_bank_credit`
   all already resolve correctly — no change.
4. **Structural gaps (document, do not fake):** no aggregate new-contract/orderbook series and
   no APBN-capex price series exist in the store. Do NOT proxy APBN capex with a fabricated
   number; GDP-Construction + FDI/DDI-Construction are the honest attribution.

**Falsifiable backtest plan (`backtest/bt.py "Construction"`; keep a change only if forward IC
improves or holds with a richer, more honest tree):**
1. **A/B the CEIC swap:** current `("Industrials & Manufacturing", None)` vs proposed
   `("Infrastructure","Construction")+("Infrastructure","Cement")`. Expect forward IC to hold or
   improve and the candidate set to become construction-relevant (endogenous-mfg leak removed).
2. **Financing-rate test:** add WC lending rate `CEIC14405201` (−1). Hypothesis: it lifts forward
   IC for the leveraged Karya leg vs `id_bi_rate` alone, because it is the actual WC borrowing
   cost. **Confirmation: forward IC up AND empirical sign of the WC-rate driver comes out −.**
3. **Credit-availability test:** add WC/investment-loan growth (+1). Hypothesis: easing credit
   leads the distressed names up; tightening leads them down. Confirmation: IC up, sign +.
4. **Sign sanity on `id_10y`:** verify empirical sign is **−** (financing cost). If it comes out
   +, the leveraged-rate-sensitivity thesis is mis-specified for the period → downgrade to
   attribution-only.
5. **Thin-vs-fat:** financing-led ~8-driver posture vs a fat all-demand posture. Hypothesis: the
   thinner, rates-led tree forecasts at least as well (fewer lumpy/lagging prints diluting the
   leading rate branch).
6. **Honesty gate:** if forward IC stays < 0.05 after the rewire, **label Construction a
   contemporaneous infra-cycle + rates-posture ATTRIBUTION (leveraged beta), not a forecaster**
   — the lumpy-political-capex + idiosyncratic-SOE-distress concession from §8.
