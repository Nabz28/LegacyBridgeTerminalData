# Banks (Financials) — Deep Driver-Tree Plan

> Basket id **2354T** · Sector Financials · the largest IDX sub-industry (~Rp 2,354T mcap).
> Status in BACKTEST.md: **grade perfected · conf medium · n_oos 129 · forward IC −0.15 ·
> hit−up −0.11 · placebo pctile 0.05 → flag: none (anti-predictive).** This is the single
> worst-forecasting big-cap basket in the engine, tied with Mining, and below the 5th
> placebo percentile. The whole point of this file is to explain *why* a 6-driver,
> theory-clean seed forecasts the largest, most-researched sector in Indonesia **worse than
> a coin flip**, and to decide honestly whether any branch can fix it.

---

## 1. Snapshot + the OOS-negative gap

**Members (real RICs, weekly obs in `correlation.sqlite`):**

| RIC | Name | w_obs | role in basket |
|---|---|---|---|
| `IDX:BBCA` | Bank Central Asia | 793 | the franchise — CASA king, lowest CoF, premium re-rating name |
| `IDX:BBRI` | Bank Rakyat Indonesia | 793 | micro/SME, highest-NIM, most foreign-flow-sensitive |
| `IDX:BMRI` | Bank Mandiri | 793 | corporate/SOE flagship |
| `IDX:BBNI` | Bank Negara Indonesia | 793 | corporate SOE |
| `IDX:BBTN` | Bank Tabungan Negara | 793 | mortgage/KPR monoline (rate-sensitive book) |
| `IDX:BNGA` | CIMB Niaga | 793 | mid-cap private |
| `IDX:BDMN` | Bank Danamon | 793 | mid-cap, auto-finance linked (Adira) |
| `IDX:MEGA` | Bank Mega | 793 | CT-group mid-cap |
| `IDX:NISP` | OCBC NISP | 793 | foreign-parent mid-cap |
| `IDX:BTPN` | SMBC Indonesia | 793 | foreign-parent, pension/productive-poor |
| `IDX:BRIS` | Bank Syariah Indonesia | 414 | sharia flagship |
| `IDX:ARTO` | Bank Jago | 534 | digital-bank, duration/growth proxy |
| `IDX:BNLI` `IDX:PNBN` | Permata, Panin | 0 | illiquid/suspended in store — drop from basket |

This is **not a homogeneous basket.** It is a barbell: four mega-cap "index banks"
(BBCA/BBRI/BMRI/BBNI ≈ 80%+ of the basket weight and of foreign ownership) plus a tail of
mid-caps with idiosyncratic stories (BBTN mortgage duration, ARTO digital duration, BDMN
auto). The equal-weight basket the engine targets is dominated in *variance* by the four
index banks, whose short-run returns are governed by **foreign portfolio flow and global
risk appetite**, not by Indonesian loan or NPL prints.

**Current kept-driver seed (`mapping.py`, 6 drivers, all theory-anchored, 0 params fit):**
`id_bi_rate` (sign **0**), `id_lending_rate` (sign **0**), `id_bank_credit` (+1),
`id_m2` (+1), `id_gdp_real_q` (+1), `usdidr` (−1). Plus the curated `("Banks", None)` CEIC
category with a long exclude list (`pt bank`, `syariah indonesia`, `capital adequacy`,
`bopo`, `net interest margin`, `nim:`, `loan-to-deposit`).

**The gap, stated precisely.** The seed is *theoretically* defensible and *contemporaneously*
correct — banks genuinely co-move with credit growth, M2, GDP and (inversely) with USD/IDR.
But contemporaneous co-movement is not forecast. At horizon *t→t+1* the posture has
**negative** IC: when the macro posture looks most bullish (credit accelerating, IDR firm),
forward bank returns are slightly *below* average, because by the time those slow CEIC
quantities print, the re-rating has already happened and the basket **mean-reverts**. The
seed is a clean *attribution engine* wearing a *forecaster's* clothes. Sections 8–9 decide
what to do about it.

---

## 2. Economic structure — how a bank actually makes money

A bank's pre-provision operating profit is, to first order:

```
PPOP  ≈  NIM × Avg Earning Assets   +   Fee Income   −   Opex
Net Profit ≈ PPOP  −  Credit Cost (provisions)  −  Tax
NIM   =  Asset Yield  −  Cost of Funds
```

Four levers, each mapping to a different driver branch:

**(a) NIM = asset yield − cost of funds — the rate-sensitivity sign problem.**
This is *the* reason the +1 BI-rate prior failed and why both rate priors are now 0.
Whether a rate rise helps or hurts depends on **repricing speed**:
- *Asset-sensitive* bank: loans reprice faster than deposits → a hike *widens* NIM (+).
- *Liability-sensitive* bank: deposits/funding reprice faster than the loan book →
  a hike *compresses* NIM, a cut *widens* it (−).

**IDX banks are, in aggregate, liability-sensitive on the margin and — crucially — the
*market* trades them as rate-CUT beneficiaries.** Two compounding mechanisms make a cut
bullish for the *equity* even where it is NIM-neutral for the *P&L*:
1. **Funding relief + loan demand:** lower policy rate → cheaper time-deposit competition,
   lower CoF, and a revival of loan demand (KPR, auto, working capital). The CEIC time-
   deposit rate (`CEIC14408301`, n=449) reprices within 1–3 months; the loan book reprices
   slower, so the *first-order* P&L effect of a cut is often funding relief.
2. **Re-rating / duration:** banks are the highest-weight, most-liquid, most-foreign-owned
   block in JCI. A BI cut (or a Fed cut transmitted via DXY/US10Y) lifts the whole EM-duration
   trade; foreign money rotates *into* BBCA/BBRI first. This re-rating channel is a
   **discount-rate / flow** effect, not an earnings effect, and it dominates short-run returns.

The net: the *a-priori sign of rates on the bank basket is genuinely ambiguous-to-negative*
(cuts bullish), which is exactly why setting `id_bi_rate`/`id_lending_rate` to +1 (the naive
"banks like high rates" textbook prior) produced a mis-signed, anti-predictive driver. The 0
prior was the right round-2 fix; Section 9 proposes going further to an explicit **cut-vs-hike
regime asymmetry** rather than a flat 0.

**(b) Loan growth (volume).** Even at flat NIM, earning-asset growth drives PPOP. System loan
growth by *type* — working capital, investment, consumption (KPR/vehicle) — is the cleanest
*demand* read and the engine already proxies it crudely via `id_bank_credit` (aIDLONYAR YoY).
The richer by-type series exist (Section 3) and the **forward-looking loan-demand survey**
(`CEICI…` Loan Demand, quarterly, n up to 70) is the only series in the whole complex that is
*designed* to lead.

**(c) Credit cost / asset quality (NPL).** Provisions are the swing factor in a downturn.
NPL *formation* (the flow, ΔNPL) can lead earnings; the NPL *ratio* (the stock) is a lagging
outcome. Both exist as real series (Section 4). This is the branch most likely to add forward
skill *in a stress regime* and the one most likely to be useless in a benign one.

**(d) Funding mix / CASA & fee income.** BBCA's entire premium valuation is a CASA story —
~80% low-cost current-and-savings deposits → structurally low CoF → NIM resilience through
the cycle → the market pays 4–5x book for it. State banks (BMRI/BBNI) run richer time-deposit
mixes, so their NIM is more rate-sensitive and their multiples lower. The CASA ratio is
constructible from Money Supply series (saving+demand vs time deposits, Section 4) but is a
slow structural variable, not a forecaster.

**The BBCA-vs-state-bank dispersion.** Because the basket is equal-weighted across very
different sensitivities (BBCA: liability-insensitive franchise re-rating; BBRI: NIM + flow;
BBTN: pure rate-duration; ARTO: growth duration), a *single* sign prior on rates is
structurally wrong for half the basket at any time. This intra-basket heterogeneity is a
second, independent reason the flat-prior approach under-performs: the equal-weight target
averages out exactly the dispersion that a name-level model would exploit.

---

## 3. DEMAND driver tree (what drives the loan book and net interest income up)

> All series below are **real, populated** and cited with exact RIC + n_obs. Sign = a-priori
> on the basket's *excess* return vs JCI. LEAD = expected months the series moves *before* the
> equities. The plane tag flags how the engine can reach it (this matters — see §7/§9).

```
DEMAND
├── D1  System loan growth (volume)                          [CORE demand]
│   ├── D1a  Total bank credit YoY ........ aIDLONYAR (id, GLOBAL_CORR key id_bank_credit) — WIRED
│   │         sign +1 · LEAD ~0 (coincident, pub-lagged) · units %YoY · n via live
│   ├── D1b  Working-capital credit ....... CEIC230931402 / CEIC389699457 (id Banking) [IDR bn, n=279/119]
│   │         sign +1 · LEAD ~0–1 · the cyclical core of corporate-bank revenue
│   ├── D1c  Investment credit ............ CEIC230932202 / CEIC389697937 (id) [IDR bn, n=279/119]
│   │         sign +1 · LEAD +1–2 · capex-driven, slowest to turn, most cyclical
│   └── D1d  Consumption credit ........... CEIC230931602 (id) [IDR bn, n=279]
│             ├ housing/KPR ............... CEIC389692087 (id) [IDR bn, n=119]  sign +1 · LEAD +1
│             ├ vehicles ................... CEIC389692117 (id) [IDR bn, n=119]  sign +1 · LEAD +1
│             └ flat/apartment ............ CEIC389692097 / ...107 (id) [IDR bn, n=119]
├── D2  Loan PIPELINE — forward demand (the only true leader)  [LEADING candidate]
│   └── D2a  Banking Survey: Demand for New Loans, by sector  (CEIC idind "Banks/Loan Demand")
│             e.g. CEICI285015602 (Wholesale) n=70, CEICI285015302 (Manuf) n=70,
│                  CEICI285015502 (Construction) n=70, CEICI315892302 (Real Estate) n=60
│             sign +1 · LEAD +1 to +2 quarters · P3M · units % balance-of-opinion
│             mechanism: BI's quarterly bank lending survey asks banks their EXPECTED loan
│             demand next quarter — a genuine ex-ante read that precedes the actual draw-down,
│             the earnings, and (the hope) the price. THIS is the demand branch most likely to
│             carry forward skill, because it is an expectation, not a realisation.
├── D3  Liquidity / deposit funding base                      [demand-enabling]
│   ├── D3a  M2 growth YoY ................ aIDM2AR (id, key id_m2) — WIRED  sign +1 · LEAD ~0
│   ├── D3b  Third-party funds (deposits) . CEIC328058702 (id Banking) [IDR bn, n=183]  +1 · LEAD ~0
│   └── D3c  Quasi-money / time+saving dep . CEIC64073601 etc (Money Supply) [n=292/268]  +1
├── D4  Macro demand for credit                               [cycle]
│   ├── D4a  Real GDP YoY ................. aIDGDPAR1 (id, key id_gdp_real_q) — WIRED  +1 · LEAD ~0 (lags, quarterly)
│   └── D4b  Consumer confidence .......... aIDCONIAR (id, key id_consumer_confidence) [n via live, P1M] +1 · LEAD +1
│             sub: expected-income / durables-buying intent (Consumer Surveys, n=196) — leads
│             consumer-loan demand (KPR/vehicle) by 1–2 quarters.
```

**Forecast hypothesis for the DEMAND tree.** D1 (realised loan growth) and D4a (GDP) are
*coincident, publication-lagged quantity prints* — strong for attribution, weak as
forecasters (the IMPROVEMENT_PLAN §3 rule of thumb). The genuine forecast candidates are
**D2a (loan-demand survey)** and **D4b (consumer confidence / expected income)** — both are
*expectations* published *ahead* of the realised loan draw-down. If any demand branch lifts
the forward IC off −0.15, it is these two. Everything else in the demand tree is honest
attribution, not prediction.

---

## 4. SUPPLY / COST driver tree (a bank's "supply" = funding cost + risk)

A bank has no physical output; its cost stack is **funding cost** and **credit cost**, and its
"capacity" constraint is **capital + liquidity**. The discipline here is separating the few
*leading* series from the many *endogenous outcomes* that must be excluded (a system-NPL ratio
or CAR co-moves mechanically with bank equity and would leak in-sample fit while adding no
forward skill).

```
SUPPLY / COST
├── S1  Cost of funds (the liability side of NIM)              [LEADING-ish cost]
│   ├── S1a  Time-deposit rate (WA) ...... CEIC14408301 / CEIC14408201 (id Banking) [% pa, n=449] — NOT WIRED
│   │         sign −1 (higher CoF → margin squeeze) · LEAD ~0 · reprices faster than loans →
│   │         this is the mechanical core of the liability-sensitivity story (§2a).
│   └── S1b  Policy / JIBOR-ON ............ id_bi_rate, aIDONINTR — WIRED (rate, see §5)
├── S2  Asset yield (the asset side of NIM)                    [cost/revenue]
│   └── S2a  Lending rate, by use ........ CEIC14405201 (WC), CEIC14404801 (Inv),
│             CEIC14419701 (Consumption) (id Banking) [% pa, n=397/397/304] — partly proxied by id_lending_rate (None src!)
│             sign ambiguous (↑yield helps NIM but signals tightening) · the NIM = S2a − S1a spread
│             is the economically right construction, not either leg alone.
├── S3  Credit cost / asset quality                            [LEADING in stress, lagging in calm]
│   ├── S3a  NPL formation (ΔNPL flow) .... from CEIC229675802 NPL ratio (id) [%, n=279] differenced
│   │         sign −1 · LEAD +1 · the FLOW (deterioration rate) can precede provisioning &
│   │         earnings cuts; the engine should use Δ(ratio), not the level.
│   ├── S3b  Consumption NPL .............. CEIC52767201 (id) [IDR bn, n=279]  sign −1 · LEAD +1
│   └── S3c  Household residential NPL .... CEIC646480227 (id) [IDR bn, n=39]  sign −1 · LEAD +1 (short history)
├── S4  Liquidity constraint  (ENDOGENOUS — exclude as driver)
│   └── LDR aIDCBLODPR / CEIC65801101 (id) [%] — co-moves with the cycle but is a bank CHOICE/outcome;
│         already excluded via ceic_exclude "loan-to-deposit". KEEP excluded.
└── S5  Capital constraint   (ENDOGENOUS OUTCOME — exclude)
    └── CAR CEIC419361027 / ROA CEIC65800201 / BOPO / NIM-ratio CEIC481150237 (id Banks-prudential)
          These are OUTCOME ratios that move *with* bank equity, not before it. Already excluded.
          KEEP excluded — wiring them would inflate in-sample R² and *worsen* the OOS honesty.
```

**Endogeneity verdict (the key discipline of this section).** Of the bank-specific "supply"
series, only **S1a (deposit rate)**, **S2a (lending rate, as the NIM spread)** and **S3a NPL
*formation* (the flow)** are admissible as drivers — and even these are weak forecasters
because they print with a lag. **Every ratio outcome — NIM-level, CAR, ROA, BOPO, LDR — is
endogenous to the equity and must stay excluded** (the current `ceic_exclude` is correct and
should be *kept*, not relaxed). The one improvement: replace the *implicit* "rates" proxy with
the *explicit* **NIM spread = lending_rate − deposit_rate**, which is the economically correct
margin variable and is at least not a pure outcome ratio.

---

## 5. MACRO / RATE / FX / FLOW — the branch that actually moves the basket short-run

This is where the bank basket's short-run variance lives, and where the OOS-negative result is
ultimately decided. For the four index banks, **monthly returns are a foreign-flow / global-
risk-appetite story far more than a domestic-fundamentals story.**

```
MACRO / RATE / FX / FLOW
├── M1  BI policy-rate Δ-REGIME (cuts vs hikes, ASYMMETRIC)    [the central rate question]
│   ├── id_bi_rate ........ ECONOMICS:IDINTR (corr, n weekly ~186) — WIRED, sign currently 0
│   │     PROBLEM: a flat sign-0 throws the driver away; but the relationship is not 0, it is
│   │     STATE-DEPENDENT. Cuts (Δ<0) are bullish (funding relief + re-rating); hikes (Δ>0) are
│   │     bearish-to-neutral. A signed-level prior cannot capture this; a regime/asymmetry
│   │     feature can (see §9).
│   └── id_lending_rate ... GLOBAL_CORR key resolves to **None** → falls back to live spark
│         (recent-only, low-confidence). EITHER point it at a real CEIC lending-rate RIC
│         (CEIC14405201) or drop it — a None-sourced driver is dead weight.
├── M2  Domestic curve / duration
│   └── id_10y ............ TVC:ID10Y (corr, daily, w≈798) — leading, liquid · sign −1
│         mechanism: ID10Y is the EM-duration & risk-premium gauge; a fall (rally) lifts bank
│         re-rating and the value of HTM/AFS bond books (state banks hold large govvie books).
├── M3  GLOBAL discount rate / dollar  (the dominant short-run driver)
│   ├── us_10y ............ TVC:US10Y (corr, w≈800) — sign −1 · LEAD 0–1
│   ├── DXY .............. TVC:BBDXY (corr, key "dxy") — sign −1 · LEAD 0–1
│   │     mechanism: a strong dollar / rising US10Y is the textbook EM-equity-outflow signal;
│   │     BBCA/BBRI are the first sells. This is liquid, exogenous, and PRICE-based — the
│   │     category the backtest says actually leads. **DXY is currently NOT in the Banks seed —
│   │     this is the single biggest omission.**
│   └── us_real10y ....... DFII10 (us_macro, w≈800) — sign −1 · the cleanest EM-duration gauge.
├── M4  FX / risk-off
│   └── usdidr ........... FX_IDC:USDIDR (corr, key usdidr) — WIRED, sign −1 · LEAD 0
│         IDR weakness ≈ foreign outflow ≈ risk-off; already the seed's flow proxy, but it is a
│         *symptom* of flow, not the flow itself.
└── M5  DIRECT FOREIGN-FLOW proxies  (the honest, explicit flow read — NOT wired)
    ├── M5a  IDX net foreign purchase .... CEIC14620601 (id Capital Markets) [IDR bn, P1M, n=405, last 2026-05] — NOT WIRED
    │         sign +1 · LEAD 0 (coincident with returns, but the *trend/persistence* of flow has
    │         short-run momentum). The most direct equity-flow series in the store.
    └── M5b  Govt-bond foreign holdings .. CEIC234293802 (id Capital Markets) [IDR bn, P1D, n=4094, last 2026-06-05] — NOT WIRED
              sign +1 · LEAD 0–1 · daily, deep history; foreigners de-risk IDR *bonds* and *equities*
              together, so Δ(foreign bond holdings) is a clean, high-frequency risk-appetite proxy
              that often moves a touch ahead of the equity flow.
```

**The honest read on the macro branch.** The drivers most correlated with bank returns are the
*price/flow* series — DXY, US10Y, USD/IDR, foreign-flow — exactly the liquid exogenous category
the backtest says *leads*. But here is the trap that produces the negative IC: these flow
variables are **contemporaneously** powerful and **mean-reverting at the monthly horizon**. A
big foreign-inflow month (IDR strong, DXY down, net-buy positive) is associated with *high
same-month* returns and slightly *negative next-month* returns (the bounce fades). So even the
"right" flow drivers, used as a *level/sign* prior on next-month return, can be anti-predictive.
The flow branch is the best *attribution* lens and the most dangerous *forecast* input — it
must be used as a **momentum/regime** feature (Δ-persistence), not a contemporaneous level, if
it is to forecast at all.

---

## 6. Cross-industry linkages

- **Property ↔ Banks (KPR):** the same household-mortgage series feed both — KPR growth
  (`CEIC389692087`) and mortgage NPL (Property block `Bank Loans NPL: Mortgage`, n=180) are a
  shared demand/risk node. BBTN is the pure expression; a property up-cycle is a BBTN/KPR-book
  tailwind and a mortgage-NPL up-cycle is the risk.
- **Auto/Multifinance ↔ Banks:** vehicle-consumption credit (`CEIC389692117`) and the
  Multifinance financing-receivables block (CEIC462… n=128–240) lead auto-bank credit cost;
  BDMN (Adira) is the linkage name.
- **Coal/Commodity terms-of-trade ↔ Banks:** Indonesia's bank cycle rides the commodity cycle
  via corporate working-capital and investment loan demand and via the current-account/IDR. A
  commodity boom (BCOM/coal up) → strong IDR, fat corporate deposits, benign NPL → bullish
  banks. This is an *indirect* macro channel already partly captured by usdidr/GDP, but a
  `bcom`/terms-of-trade hint is a plausible cross-industry demand proxy worth testing.
- **JCI is NEVER a driver** — the basket is ~30%+ of the index; using JCI would be circular
  market-beta. (Correctly absent from the seed; keep it absent.)

---

## 7. Currently wired vs available (the "what we COULD add")

| Driver | Series (RIC) | n_obs | plane / reachable? | wired now? | priority |
|---|---|---|---|---|---|
| Total credit YoY | aIDLONYAR | live | macro (GLOBAL_CORR) | ✅ +1 | keep |
| M2 YoY | aIDM2AR | live | macro | ✅ +1 | keep |
| Real GDP YoY | aIDGDPAR1 | live | macro | ✅ +1 | keep |
| USD/IDR | FX_IDC:USDIDR | w801 | macro (corr) | ✅ −1 | keep |
| BI 7DRR | ECONOMICS:IDINTR | w186 | macro (corr) | ✅ sign 0 | **re-spec as Δ-regime** |
| Lending rate | (key → **None**) | — | macro → spark | ⚠️ 0, dead src | **repoint to CEIC14405201 or drop** |
| **DXY** | TVC:BBDXY | w (corr) | macro (corr) | ❌ | **HIGH — add −1** |
| **US10Y** | TVC:US10Y | w800 | macro (corr) | ❌ | **HIGH — add −1** |
| US real 10Y | DFII10 | w800 | macro (corr) | ❌ | MED − duration gauge |
| ID10Y | TVC:ID10Y | w798 | macro (corr) | ❌ | MED − local duration/bond book |
| **IDX net foreign buy** | CEIC14620601 | 405 | id-macro (needs resolver) | ❌ | **HIGH — flow, as momentum** |
| **Govt-bond foreign hold** | CEIC234293802 | 4094 | id-macro (needs resolver) | ❌ | **HIGH — flow, daily** |
| **Loan-demand survey** | CEICI2850156.. / 3158923.. | 60–70 | CEIC idind (reachable!) | ❌ (excluded by default curation?) | **HIGH — only true leader** |
| Loan growth by type (WC/Inv/Cons) | CEIC2309314../316../322.. | 279 | id-macro (needs resolver) | ❌ | MED − attribution |
| KPR / vehicle credit | CEIC389692087 / ..117 | 119 | id-macro (needs resolver) | ❌ | MED |
| Deposit rate (CoF) | CEIC14408301 | 449 | id-macro (needs resolver) | ❌ | MED − for NIM spread |
| NPL formation (ΔNPL) | CEIC229675802 (diff) | 279 | id-macro (needs resolver) | ❌ | MED − stress regime |
| Consumer confidence | aIDCONIAR | live | macro | ❌ | MED − leads consumer credit |
| Third-party funds | CEIC328058702 | 183 | id-macro (needs resolver) | ❌ | LOW |
| NIM / CAR / ROA / BOPO / LDR ratios | CEIC481150237 / 419361027 / 65800201 / 65801101 | 138–279 | CEIC | **excluded** | **KEEP EXCLUDED (endogenous)** |
| Single-bank balance sheets (BSI) | CEIC462208… | 63 | CEIC | **excluded** | KEEP EXCLUDED |

**The plane problem (critical for §9).** The richest, most bank-specific leading series —
loan-by-type, NPL formation, deposit rate, foreign flow — live in the **`id` macro catalog**
with RICs of the form `CEIC…` (not `CEICI…`). The engine's two reach mechanisms are:
(1) the **`ceic` plane**, which only indexes the **idind** catalog (`CEICI…`, via
`get_idind_series()`), and (2) the **macro plane**, which resolves a `GLOBAL_CORR` key to a
**`correlation.sqlite`** id (with a `live_indicators.spark` fallback). **Neither path currently
reads an `id`-plane `CEIC…` RIC from `macro.observations`.** So today these series are simply
**unreachable** — which is a structural reason the Banks seed is thin. The one rich leading
series that *is* reachable is the **Loan-Demand survey** (it lives under the idind "Banks"
category as `CEICI…`), but the default `ceic_exclude` / province-curation may be dropping it —
this must be verified and the survey explicitly *included*.

---

## 8. Forecastability — the honest verdict (the most important section)

**The fact to explain:** Banks, the largest and most-researched IDX sector, has forward IC
**−0.15** at the 5th placebo percentile — statistically *anti*-predictive, not merely
skill-less. Three structural reasons, in order of importance:

**(1) The basket is a foreign-flow / market-beta instrument, and flow mean-reverts monthly.**
The four index banks are the EM-Indonesia "long" — the first thing foreigners buy in a
risk-on rotation and sell in risk-off. Their monthly returns are dominated by DXY/US10Y/flow,
which are *contemporaneously* huge and *serially mean-reverting* at the 1-month horizon. A
posture that reads "macro looks good now" (credit up, IDR firm, flow positive) is reading the
*top* of a flow impulse that statistically *fades* next month. **A contemporaneously-correct
attribution becomes a forward-wrong forecast** precisely because the driver is a fast,
mean-reverting flow rather than a slow fundamental. This is the core of the −0.15.

**(2) Publication-lagged quantity prints are coincident-to-lagging.** The fundamental drivers
that *are* in the seed (credit YoY, M2, GDP) print with a lag and turn *after* the price.
Using them as a forward signal adds noise, not lead. (IMPROVEMENT_PLAN §3 rule: slow CEIC
quantities are for attribution, not forecasting.)

**(3) The flat single-sign prior is wrong for half the basket and for the rate variable.**
A liability-sensitive franchise (BBCA) and a rate-duration monoline (BBTN) and a growth-
duration digital bank (ARTO) cannot share one rate sign; and the rate effect itself is
*regime-dependent* (cuts bullish, hikes bearish), which no static sign can represent. The
equal-weight target then averages out the very dispersion a name/regime model would exploit.

**Can any branch give forward skill? Branch-by-branch:**

| Branch | Forward-skill verdict |
|---|---|
| Realised loan growth / M2 / GDP (D1, D3a, D4a) | **No.** Coincident, pub-lagged. Attribution only. |
| **Loan-DEMAND survey (D2a)** | **Maybe — best hope.** Ex-ante expectation, P3M, leads the draw-down by 1–2 quarters. The one series *designed* to lead. Worth a dedicated OOS test. |
| **Consumer confidence / expected income (D4b)** | **Maybe (weak).** Leads consumer-credit demand; monthly; but a soft sentiment read. |
| **NPL formation Δ (S3a)** | **Regime-conditional.** Can lead earnings cuts *in a deteriorating regime*; useless in a benign one. Only helps if used as a stress trigger, not a continuous driver. |
| **Rate Δ-REGIME (M1, asymmetric cuts)** | **Maybe.** A cut-vs-hike regime feature is more defensible than a flat sign and is the most theory-grounded fix. But cuts are *anticipated* by the market, so even this leads weakly. |
| Flow / DXY / US10Y / USDIDR (M3–M5) | **No as a level; maybe as Δ-momentum.** Powerful contemporaneously, mean-reverting forward. Best for attribution; only a *flow-momentum/persistence* transform has any forward hope. |

**The verdict.** *Banks is fundamentally a foreign-flow / market-beta basket and should be
read primarily as a **contemporaneous attribution**, not a forecast.* The engine's most honest
posture is to (a) **label the Banks verdict explicitly as attribution, not forecast** (as
BACKTEST.md already recommends for financials), and (b) make a **bounded, falsifiable attempt**
at forward skill via the three genuine ex-ante leads — the **loan-demand survey**, the
**rate-cut regime asymmetry**, and **NPL-formation flow** — *keeping each change only if the
blindfolded forward IC improves or holds*. The expected best case is moving from −0.15 toward
~0 (removing anti-predictiveness) rather than to a positive-skill basket; an honest neutral is
a real win here. Do **not** chase in-sample R² by re-adding the excluded outcome ratios — that
would raise the contemporaneous fit and leave (or worsen) the forward gap.

---

## 9. Engine-wiring spec — concrete `mapping.py` changes

**Three tiers, each independently A/B-testable against `backtest/bt.py "Banks"`. Adopt only
what holds/improves forward IC.**

### Tier 1 — fixes reachable with TODAY's engine (no new resolver) — do first

```python
"Banks": {
    "ceic": [("Banks", "Loan Demand")],          # FORCE-INCLUDE the loan-demand survey
                                                 # (idind CEICI… → reachable). The only true leader.
    "ceic_exclude": [ ... keep the full existing exclude list (endogenous ratios + single banks) ... ],
    "globals": [("dxy",  "macro", -1, "broad USD: EM-equity outflow headwind (flow)"),
                ("bcom", "demand", +1, "terms-of-trade / corporate-credit cycle")],  # optional, test
    "macro": [
        # rate: regime-aware, not a flat 0 — see ID_RATE_REGIME note below
        ("id_bi_rate",   "macro", 0, "policy rate — use Δ-regime feature, cuts bullish (see §2a)"),
        ("id_10y",       "macro", -1, "ID10Y duration / bond-book re-rating"),
        ("us_10y",       "macro", -1, "global discount rate — EM-duration outflow"),
        ("id_bank_credit","demand", +1, "system loan growth (attribution)"),
        ("id_m2",        "demand", +1, "liquidity/deposits"),
        ("id_gdp_real_q","demand", +1, "credit demand & asset quality"),
        ("id_consumer_confidence","demand", +1, "leads consumer-credit demand (KPR/vehicle)"),
        ("usdidr",       "macro", -1, "IDR weakness ~ foreign-outflow risk-off (flow proxy)"),
    ],
    # DROP id_lending_rate: its GLOBAL_CORR key resolves to None (dead spark source).
}
```
- **Add `dxy` and `us_10y`** (both already in `GLOBAL_CORR` → corr.sqlite, w≈800). This is the
  single highest-value, zero-plumbing change — the dominant short-run drivers were missing.
- **Force-include the Loan-Demand survey** via `("Banks", "Loan Demand")` so curation cannot
  silently drop it; verify it survives `_curate_ceic` (it is % balance-of-opinion, P3M — should
  pass the data-quality gate at n=60–70).
- **Remove `id_lending_rate`** (None source) or repoint it (Tier 2).

### Tier 2 — requires a small engine change: an `id`-macro resolver

The genuinely bank-specific leading series (loan-by-type, deposit rate, NPL formation, foreign
flow) live in `macro.observations` under `id`-plane `CEIC…` RICs that **no current code path
reads**. Add a thin resolver so `_global_history` can fall through to `macro.observations` for
a registered `id`-macro key, using the existing `common.get_observations(ric)`:

```python
# mapping.py — new table, analogous to GLOBAL_CORR but for id-plane CEIC RICs
ID_MACRO_OBS = {
    "id_foreign_net_buy":   "CEIC14620601",   # IDX net foreign purchase, P1M, n=405
    "id_foreign_bond_hold": "CEIC234293802",  # Govt sec foreign holdings, P1D, n=4094
    "id_loan_wc":           "CEIC230931402",  # working-capital credit, n=279
    "id_loan_inv":          "CEIC230932202",  # investment credit, n=279
    "id_loan_cons":         "CEIC230931602",  # consumption credit, n=279
    "id_loan_kpr":          "CEIC389692087",  # household housing loans, n=119
    "id_deposit_rate":      "CEIC14408301",   # WA time-deposit rate, n=449
    "id_lending_rate_wc":   "CEIC14405201",   # lending rate, working capital, n=397
    "id_npl_ratio":         "CEIC229675802",  # commercial-bank NPL ratio, n=279
}
# drivers._global_history(): after the GLOBAL_CORR miss, before spark, try
#   ric = M.ID_MACRO_OBS.get(key);  if ric: obs = C.get_observations(ric)  -> use if len>=18
```
Then add to the Banks `macro` list (each tested individually, kept only if forward IC holds):
```python
        ("id_foreign_net_buy",  "macro", +1, "direct equity foreign flow — use as Δ-momentum"),
        ("id_foreign_bond_hold","macro", +1, "foreign bond de-risking leads equity flow"),
        ("id_deposit_rate",     "cost",  -1, "cost of funds (liability-sensitivity leg of NIM)"),
        ("id_npl_ratio",        "cost",  -1, "use Δ(ratio)=NPL formation, lead +1, stress regime"),
```

### Tier 3 — the two transforms that matter most (feature engineering, in `drivers/stats`)

1. **Rate Δ-REGIME asymmetry.** Replace the flat sign-0 BI-rate driver with a *signed Δ
   feature*: signal contribution `= +1` when the 3-month policy-rate change is a **cut**
   (Δ<0), `≈0/−` on a **hike** — encoding "cuts are bullish for the bank basket via funding
   relief + re-rating." This is the single most defensible rate fix and directly addresses why
   the +1 prior failed. Implement as a regime indicator on `id_bi_rate` rather than a static
   sign; backtest the asymmetric vs flat-0 versions.
2. **Flow as momentum, not level.** For `usdidr`, `id_foreign_net_buy`, `id_foreign_bond_hold`,
   feed the **persistence/momentum** (sign of trailing 2–3M flow), not the contemporaneous
   level — because the level mean-reverts at +1M (the mechanism behind the −0.15). Test
   momentum-transformed vs raw.

### What to test in the backtest (`backtest/bt.py "Banks"`), and the keep-rule

Run these as an ablation ladder, keeping a change only if forward IC **improves or holds**
while the tree gets richer and more honest (never keep an in-sample-only gain):
1. Baseline (current seed) → confirm −0.15.
2. +Tier 1 (add DXY, US10Y, consumer-confidence; force loan-demand survey; drop dead lending-rate).
3. +Rate Δ-regime asymmetry (replace flat 0).
4. +Flow-momentum transform on USDIDR / foreign-flow.
5. +Tier 2 id-macro leads (loan-demand survey already in; add NPL-formation Δ, deposit rate).

**Success = forward IC rises from −0.15 toward ≥0 (anti-predictiveness removed) with the
placebo percentile climbing off 0.05.** If after Tiers 1–3 the IC is still negative, the honest
conclusion stands: **Banks is a contemporaneous flow/beta basket; ship the verdict as
attribution, flag `forecast=low`, and stop adding drivers.** A neutral, honest Banks read is
the target — not a manufactured positive.

---

### Capsule (for IMPROVEMENT_PLAN §5 row 1)

> **Banks · Financials · 2354T · OOS ✗−0.15 (anti-predictive, 5th pctile).** Add DXY + US10Y
> (dominant short-run flow drivers, currently missing), force-include the BI loan-demand survey
> (only true ex-ante leader), re-spec BI-rate as a cut-vs-hike Δ-regime (cuts bullish — why the
> +1 prior failed), drop the dead-sourced lending-rate, and add an id-macro resolver for direct
> foreign-flow (net-buy n=405 / bond-holdings n=4094, used as momentum) + NPL-formation Δ. Keep
> all outcome ratios (NIM/CAR/ROA/BOPO/LDR) and single-bank sheets EXCLUDED. Honest verdict:
> a foreign-flow / market-beta basket — read as **attribution, not forecast**; target is moving
> the IC from −0.15 toward neutral, not to positive skill.
