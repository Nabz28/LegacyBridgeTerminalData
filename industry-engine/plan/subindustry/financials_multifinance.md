# Multifinance (Financials) — Deep Driver-Tree Plan

> Basket id **`financials_multifinance`** · Sector Financials · ~Rp 33T mcap (the smallest
> of the four Financials baskets, behind Banks 2354T / Insurance 152T / Securities 23T —
> mid-cap, thin-float consumer-finance names).
> Status in BACKTEST.md: **grade perfected · conf medium · n_oos 129 · forward IC −0.02 ·
> hit−up −0.05 · placebo pctile 0.37 → flag: none.** The current verdict is essentially a
> coin-flip with a faintly negative tilt: the seed explains co-movement but does **not**
> forecast. This file builds the demand/funding/credit-cost tree behind a multifinance P&L,
> diagnoses *why* it does not lead (funding cost co-moves and mean-reverts; the financing
> book is the basket's own coincident output), and decides honestly whether the
> vehicle-sales-volume branch or a rate-cut regime can give it a real lead.

---

## 1. Snapshot + the OOS-flat gap

**Members (real RICs from worklist; 11 names, equal-weighted target):**

| RIC | Name | mcap (Rp) | what it does |
|---|---|---|---|
| `IDX:BFIN` | BFI Finance | 10.5T | the franchise — used-car + multi-purpose financing, lowest-leverage, highest-ROE; basket anchor |
| `IDX:ADMF` | Adira Dinamika Multi Finance | 10.3T | new+used 4W/2W auto, **Bank Danamon (BDMN) subsidiary** — bank-funded book |
| `IDX:BPII` | Batavia Prosperindo Internasional | 4.6T | holding/investment-finance, idiosyncratic (β −0.47, anti-beta) |
| `IDX:IMJS` | Indomobil Multi Jasa | 1.6T | captive finance of the Indomobil auto group (dealer-linked) |
| `IDX:CFIN` | Clipan Finance | 1.3T | Panin-group, 4W + heavy-equipment financing |
| `IDX:TIFA` | Tifa Finance | 1.2T | heavy-equipment / productive-goods leasing (β ~0) |
| `IDX:BBLD` | Buana Finance | 1.0T | mixed consumer + leasing |
| `IDX:WOMF` | Wahana Ottomitra Multiartha | 1.0T | **2W (motorcycle) monoline**, Maybank-linked — most consumer-cyclical |
| `IDX:BPFI` | Batavia Prosperindo Finance | 0.7T | small multi-purpose financier |
| `IDX:HDFA` | Radana Bhaskara Finance | 0.6T | small, distressed-tilt (β null in store) |
| `IDX:VRNA` | Verena Multi Finance | 0.4T | small 4W/multipurpose (β ~0) |

This is a **barbell of two real franchises + a long tail.** BFIN + ADMF ≈ **63% of basket
mcap** and dominate its variance; the other nine are small, thin-float, and idiosyncratic
(BPII is an outright anti-beta holding co; TIFA/VRNA/BPFI are near-zero-beta heavy-equipment
or micro names). **The equal-weight target is therefore noisier than a mcap-weight one** — it
upweights nine illiquid small-caps whose returns are dominated by liquidity/idiosyncratic
events rather than the auto-finance cycle that BFIN/ADMF actually express. This dispersion is
the first structural reason a single macro posture forecasts the basket weakly.

**Current kept-driver seed (`mapping.py` "Multifinance", 5 macro drivers, 0 params fit):**
```python
"Multifinance": {
    "ceic": [("Banks", "Multifinance"), ("Banks", "Loan Demand")],
    "globals": [],
    "macro": [("id_10y",        "macro", -1, "funding cost (bond-funded book)"),
              ("id_bi_rate",    "macro", -1, "policy funding cost"),
              ("id_bank_credit","demand", +1, "consumer financing"),
              ("id_gdp_real_q", "demand", +1, "auto/durables demand"),
              ("usdidr",        "macro", -1, "risk-off / FX funding")],
}
```
Plus the curated `("Banks","Multifinance")` CEIC category (30 financing-receivables series,
all `demand`) and `("Banks","Loan Demand")` (the BI bank-lending survey, P3M).

**The gap, stated precisely.** The seed is theoretically coherent — a multifinance share
*should* fall when funding costs (`id_10y`/`id_bi_rate`) rise and rise with consumer-credit
and auto demand. And contemporaneously it does. But the forward IC is −0.02 at the 37th
placebo percentile: **no lead, faint anti-tilt.** Three reasons developed below: (i) the
"demand" CEIC series wired are the **basket's own financing-receivables level** — coincident,
publication-lagged, partly endogenous output, not a leading input; (ii) the funding-cost
branch (10Y/BI rate) is *contemporaneously* powerful but **mean-reverts** at the 1-month
horizon and is largely *anticipated* by the market; (iii) the one genuinely *exogenous,
leading* demand series — **new-vehicle sales volume** — is a cross-industry input that is
**not currently wired**. Sections 8–9 decide what to do.

---

## 2. Economic structure — how a multifinance company makes money

A consumer-finance company's net profit is, to first order:

```
Net Financing Income ≈ NIM_fin × Avg Financing Receivables   −   Opex   −   Credit Cost
NIM_fin  =  Lending Yield (flat installment rate on auto/2W)  −  Cost of Funds
New Bookings (the flow) ≈ Vehicle Sales Volume × Financing-Penetration × Avg Ticket
Avg Financing Receivables (the stock) = prior stock + New Bookings − Amortisation − Write-offs
```

Four levers, each a different driver branch — and the **revenue identity is volume × spread −
credit cost**, exactly the brief's framing:

**(a) New-financing VOLUME = vehicle sales × penetration (the demand engine).**
A multifinance book is a *flow* business: each month's new bookings are roughly
**new + used vehicle units sold × the share financed (not paid cash) × ticket size.** The
single most important exogenous driver is therefore **vehicle sales volume** — 4W (Gaikindo
wholesale) for ADMF/CFIN/BFIN and **2W (motorcycle) for WOMF**. When auto/2W sales turn, new
bookings turn *with* them; the receivables *stock* (and hence net financing income) follows
1–2 quarters later as the book builds. This is why the sell-side watches **monthly Gaikindo
auto wholesale** and **AISI motorcycle sales** as the leading read on the sub-sector, *not* the
OJK financing-receivables print (which is the lagged consequence).

**(b) Spread = lending yield − cost of funds — the margin swing factor.**
Multifinance lending yields are **sticky** (flat installment rates on 1–4-year contracts,
fixed at origination), but **cost of funds reprices fast** because the books are **bond- and
bank-loan funded, not deposit funded** (multifinance companies cannot take deposits). So a rise
in the **10Y govt yield / corporate bond spread / BI rate** flows into CoF within a quarter
while the asset yield is locked — a **classic liability-sensitivity / margin-squeeze on hikes**,
and margin relief on cuts. This is *the* reason `id_10y` and `id_bi_rate` carry a −1 prior, and
it is economically correct **contemporaneously**. The question (Section 8) is whether it
*forecasts*: bond yields mean-revert and are anticipated, so the level is a weak forward signal.

**(c) Credit cost / NPL (the downside swing).**
The second margin swing is **credit cost** — repossession losses and provisions when borrowers
default. In an auto book this is collateralised by the vehicle, so **used-car prices** set the
recovery value (loss-given-default). A used-car price slump (or an oversupply of repossessed
units) raises credit cost even at flat default rates. NPL *formation* (the flow) can lead
earnings; the NPL *ratio* (the stock) lags. **Data caveat (a real gap, see §4/§7): the CEIC
multifinance block has NO non-performing-financing / asset-quality ratio series** — the closest
admissible proxy is the **system consumption-loan NPL** from the Banking macro block
(`CEIC52767201`, n=279), cross-read.

**(d) Funding access / leverage (the capacity constraint).**
A multifinance company grows the book only as fast as it can fund it. In a credit crunch
(spreads blow out, bond market shuts), even strong vehicle demand cannot be booked. This is why
**system liquidity / consumer-credit growth** (`id_bank_credit`, `id_m2`) matters as a
*demand-enabling* condition, and why bank-owned financiers (ADMF←BDMN, WOMF←Maybank) have a
funding-cost edge over standalone bond issuers (BFIN, CFIN) — an **intra-basket dispersion**.

**The BFIN-vs-the-rest dispersion.** BFIN is a *used-car + multipurpose* lender with the lowest
leverage and highest ROE — it behaves like a quality compounder and is least sensitive to the
new-car cycle. ADMF is a *new-auto captive* (Danamon-funded) — most exposed to Gaikindo 4W and
to BDMN's cost of funds. WOMF is a *2W monoline* — its demand driver is motorcycle sales and the
mass-market consumer, not 4W. A *single* sign prior on "auto demand" or "funding cost" is
therefore structurally right for the two anchors and noisy for the tail — the equal-weight
target averages out exactly this dispersion.

---

## 3. DEMAND driver tree (what drives new financing bookings and the receivables book up)

> All series below are **real, populated**, cited with exact RIC + n_obs. Sign = a-priori on
> the basket's *excess* return vs JCI. LEAD = expected months the series moves *before* the
> equities. The plane tag flags how the engine can reach it (see §7/§9).

```
DEMAND
├── D1  Vehicle SALES VOLUME — the exogenous demand engine (THE LEADING BRANCH)   [cross-industry]
│   ├── D1a  4W auto wholesale (Gaikindo) .. CEICI13839901 (idind Consumer Discretionary/Auto Sales)
│   │         [Unit, P1M, n=448] · sign +1 · LEAD +1 to +2 · reachable via ceic plane (CEICI…)
│   │         mechanism: units sold this month → financed bookings this/next month → book builds
│   │         → financing income builds over 1–2 quarters. The cleanest EX-ANTE demand read.
│   ├── D1b  4W "Local" (domestic assembled) CEICI13839601 / CEICI13834801 [Unit, n=425/424] · +1 · LEAD +1
│   ├── D1c  Affordable/LCGC 4x2 ............ CEICI412545807 (4x2) / CEICI412545847 (LCGC) [n=328/154] · +1
│   │         the mass-market, most-financed segment — the heart of ADMF/WOMF demand.
│   └── D1d  (2W proxy — see §7 gap) AISI motorcycle units NOT in idind as a sales-unit series;
│             nearest is Vehicle Registrations: Motorcycles (CEIC, annual n=63) — too coarse to wire.
│             WOMF's 2W demand is proxied indirectly by D1c (mass-market) + D4 (real income).
├── D2  Consumer credit appetite (financing penetration)                          [demand-enabling]
│   ├── D2a  Consumption credit (system) ... id_bank_credit → aIDLONYAR (live, key) — WIRED · +1 · LEAD ~0
│   │         a coincident, pub-lagged system aggregate; attribution, not lead.
│   ├── D2b  Consumption credit level ...... CEIC230931602 (id Banking) [IDR bn, n=279] · +1 · LEAD ~0
│   └── D2c  Household VEHICLE loans ....... CEIC389692117 (id Banking) [IDR bn, n=119] · +1 · LEAD ~0
│             the bank-channel analogue of the multifinance book — co-moves, doesn't lead.
├── D3  Forward loan-demand survey (the only designed-to-lead series)             [LEADING candidate]
│   └── D3a  BI bank lending survey ........ ("Banks","Loan Demand") idind, e.g. CEICI285015402 (n=70),
│             CEICI315892002 (n=63) [% balance-of-opinion, P3M] — WIRED via ceic · +1 · LEAD +1–2q
│             mechanism: banks' EXPECTED next-quarter loan demand — an ex-ante read; but it is a
│             BANK survey (not multifinance-specific) and household/consumption sub-series are the
│             relevant cut. Genuine lead, weak specificity.
├── D4  Real income / consumer cycle (affordability of installments)              [cycle]
│   ├── D4a  Real GDP YoY .................. id_gdp_real_q → aIDGDPAR1 (live, key) — WIRED · +1 · LEAD ~0 (qtrly, lags)
│   ├── D4b  Consumer confidence ........... id_consumer_confidence → aIDCONIAR (live, key) [P1M] — NOT WIRED · +1 · LEAD +1
│   │         sub: Buying Condition for Durable Goods (CEIC277372902, n=196) — the durables-intent
│   │         leaf that most directly leads big-ticket vehicle financing demand by 1–2 quarters.
│   └── D4c  Expected income 6M ahead ...... CEIC277373102 (id Consumer Surveys) [Point, n=196] · +1 · LEAD +1
│             ex-ante household income expectation → installment-affordability → 4W/2W bookings.
└── D5  OWN financing-receivables book (ENDOGENOUS OUTPUT — attribution only, demote)
    ├── Assets: Financing Receivables ...... CEICI355184817 [IDR bn, n=240] — WIRED (ceic) · the basket's OWN output level
    ├── Financing Receivables: Total ....... CEICI462344467 [n=128] · New 4W CEICI462440357 / New 2W CEICI462440337 [n=91]
    └── these are the LAGGED CONSEQUENCE of D1 (sales) + D2 (penetration). They co-move with, and
        publish AFTER, the equities. Keep for ATTRIBUTION; they cannot forecast (see §8).
```

**Forecast hypothesis for the DEMAND tree.** The wired "demand" today (D2a `id_bank_credit`,
D4a GDP, and the D5 own-book CEIC series) is **coincident/lagging** — strong for attribution,
weak as a forecaster (IMPROVEMENT_PLAN §3 rule). The genuine forecast candidates are
**D1a 4W auto wholesale volume** (a real, liquid, monthly *unit* series that turns *before* the
book builds — the multifinance read on "the demand" in the revenue identity) and the
**ex-ante expectation series D3a (loan-demand survey) and D4b/c (durables intent / expected
income).** If any demand branch lifts the forward IC off −0.02, it is **vehicle-sales volume**
— it is exogenous to the basket, leads the receivables flow mechanically, and is the specific
hook the brief calls out.

---

## 4. SUPPLY / COST driver tree (a financier's "supply" = funding cost + credit cost + collateral)

A multifinance company has no physical output; its cost stack is **cost of funds** and
**credit cost**, and its "supply" of new credit is constrained by **funding access**. The
discipline: separate the few *leading/exogenous* cost series from the basket's own endogenous
outcomes.

```
SUPPLY / COST
├── S1  Cost of funds — the spread squeeze (THE MARGIN SWING)                     [contemporaneous, mean-reverting]
│   ├── S1a  10Y govt yield ............... id_10y → TVC:ID10Y (corr, daily, w=798) — WIRED · sign −1 · LEAD 0–1
│   │         bond-funded books reprice off the govvie curve; a sell-off raises CoF vs a locked
│   │         asset yield → margin squeeze. Liquid, PRICE-based → the forecast-candidate leg, BUT
│   │         it co-moves/mean-reverts (see §8) — best as Δ/momentum, not level.
│   ├── S1b  BI policy rate ............... id_bi_rate → ECONOMICS:IDINTR (corr) — WIRED · sign −1 (use Δ-regime)
│   │         policy funding cost; cuts = margin relief + re-rating (bullish), hikes = squeeze.
│   │         A flat −1 cannot encode the cut-vs-hike asymmetry — see §9 Tier 3.
│   ├── S1c  WA time-deposit rate 12M ..... CEIC14408501 (id Banking) [% pa, n=448] — NOT WIRED · −1 · LEAD 0
│   │         proxy for the bank-funding leg (ADMF/WOMF borrow from parent banks); reprices fast.
│   └── S1d  1M time-deposit rate ......... CEIC14408201 (id Banking) [% pa, n=449] — NOT WIRED · −1
├── S2  Lending yield (the sticky asset leg of the spread)                        [slow, sticky]
│   └── S2a  Consumption lending rate ..... CEIC14419701 (id Banking) [% pa, n=304] — NOT WIRED
│             sign +1 (higher yield helps NIM) BUT sticky/regulated → the economically right
│             construction is the SPREAD = S2a − S1c (lending yield − funding cost), not either leg.
├── S3  Credit cost / asset quality (the downside swing)                          [LEADING in stress]
│   ├── S3a  System consumption NPL ....... CEIC52767201 (id Banking) [IDR bn, n=279] — NOT WIRED · −1 · LEAD +1
│   │         **the ONLY admissible credit-cost proxy** — the multifinance block has NO NPL series
│   │         (data gap, §7). Use Δ (formation), not level; leads earnings cuts in a stress regime.
│   └── S3b  Commercial-bank NPL ratio .... CEIC229675802 (id Banking) [%, n=279] — NOT WIRED · −1 · LEAD +1
│             system asset-quality regime; differenced = formation rate.
├── S4  Collateral value — used-car prices (loss-given-default)                   [GAP — no clean series]
│   └── used-car / 2W resale price index: NOT in idind/id/market as a clean price series.
│       Nearest demand-side proxy: multifinance Used 2W / Used 4W financing VALUE
│       (CEICI462440347 n=91 / CEICI462440367 n=91) — a VOLUME proxy, not a price; cannot stand in
│       for collateral value. HONEST GAP: collateral/recovery branch is UNMAPPED (§7).
└── S5  Funding access / leverage (ENDOGENOUS capacity — exclude as driver)
    └── the basket's own gearing / financing-receivables growth is an outcome, not a driver.
        (D5 own-book series belong here too — attribution, demoted from "demand".)
```

**Endogeneity / data verdict.** The admissible cost drivers are **S1 funding cost** (10Y / BI /
deposit rate — already partly wired), the **S2−S1 spread** (the economically correct margin
variable), and **S3 NPL formation** (cross-read from the Banking block — the multifinance block
has none). The **collateral/used-car branch (S4) is an honest gap** — no clean resale-price
series exists, so loss-given-default cannot be modelled directly. The own-book financing
receivables (D5) must be read as **attribution, not a leading driver** — they are the basket's
own lagged output.

---

## 5. MACRO / RATE / FX / FLOW — where the short-run variance lives

```
MACRO / RATE / FX / FLOW
├── M1  Rate Δ-REGIME — the central funding-cost question (cuts vs hikes, ASYMMETRIC)
│   ├── id_bi_rate ........ ECONOMICS:IDINTR (corr) — WIRED, sign −1
│   │     PROBLEM: a flat −1 treats a 25bp cut and a 25bp hike as symmetric. They are not: a
│   │     CUT is doubly bullish (margin relief on the fast-repricing funding leg + a duration
│   │     re-rating of the rate-sensitive book), a HIKE squeezes margin. A cut-vs-hike Δ-regime
│   │     feature is more defensible than a static sign (see §9). Multifinance is MORE rate-
│   │     sensitive than banks here — it has NO deposit franchise to cushion CoF.
│   └── id_10y ........... TVC:ID10Y (corr, w=798) — WIRED, sign −1 · the bond-funding-cost gauge
│         and the duration of the book; the most direct funding-cost market price.
├── M2  Domestic credit / liquidity backdrop
│   ├── id_bank_credit ... aIDLONYAR (live) — WIRED · +1 · system consumer-credit availability
│   └── id_m2 ............ aIDM2AR (live) — NOT WIRED · +1 · liquidity that funds the bond market
│         (multifinance funding access tightens when system liquidity drains).
├── M3  FX / risk-off (funding & flow)
│   └── usdidr ........... FX_IDC:USDIDR (corr, w=801) — WIRED · sign −1 · LEAD 0
│         IDR weakness ≈ risk-off ≈ wider domestic credit spreads ≈ harder/costlier multifinance
│         funding; also some USD-denominated wholesale funding. A *symptom* of flow.
├── M4  GLOBAL discount rate (transmitted to local funding cost)
│   ├── us_10y ........... TVC:US10Y (corr, w=800) — NOT WIRED · −1 · LEAD 0–1
│   │     global risk-free → ID10Y → multifinance CoF; the upstream of the funding-cost chain.
│   └── dxy .............. TVC:DXY (corr, w=800) — NOT WIRED · −1 · LEAD 0–1
│         **NB: the GLOBAL_CORR key "dxy" currently points at TVC:BBDXY, which is EMPTY
│         (weekly_obs=0). Any dxy hint added here is DEAD until that resolver is repointed to
│         TVC:DXY (w=800).** (Data bug — §7.) EM-funding-stress / outflow gauge.
└── M5  Cycle
    └── id_gdp_real_q .... aIDGDPAR1 (live) — WIRED · +1 · domestic demand / borrower income
          (quarterly, lags — attribution).
```

**The honest read on the macro branch.** The drivers most correlated with multifinance returns
are the **funding-cost / rate** series (ID10Y, BI rate, US10Y) and the **risk-off** proxy
(USD/IDR) — liquid, exogenous, price-based, the category the backtest says *can* lead. But the
same trap as Banks applies, **amplified**: rate/spread moves are (a) **anticipated** by the
market (a telegraphed BI cut is priced before it prints) and (b) **mean-reverting** at the
1-month horizon. A posture that reads "funding cost just fell, bullish" is often reading the
*end* of a yield rally that retraces. So the funding-cost branch is the best *attribution* lens
and a treacherous *forecast* input — it must be used as a **Δ-regime / momentum** feature, not
a contemporaneous level, to have any forward hope.

---

## 6. Cross-industry linkages (made explicit)

- **Auto (Consumer Cyclicals) → Multifinance — the central link.** 4W vehicle **sales volume**
  (`CEICI13839901`, n=448, idind Auto Sales) is the *demand* that the financing book monetises.
  This is a borrowed series from the **Consumer Discretionary / Auto Sales** block, reachable
  via the `ceic` plane with an override (it is tagged `demand` already). ADMF/CFIN/BFIN (4W) and
  WOMF (2W mass-market) are the expressions. **This is the single highest-value addition.**
- **Banks → Multifinance (funding + parent).** ADMF is funded by **Bank Danamon (BDMN)** and
  WOMF by **Maybank** — bank cost-of-funds (deposit rate `CEIC14408501`/`CEIC14408201`) flows
  into their CoF. The system **consumption NPL** (`CEIC52767201`) and **vehicle loans**
  (`CEIC389692117`) are shared risk/demand nodes with the Banks basket. Conversely, **BDMN's own
  equity carries Adira's auto-finance cycle** — the reverse linkage noted in `financials_banks.md`.
- **Conglomerate / Auto group → captive financiers.** IMJS is the captive finance arm of the
  **Indomobil** auto group; its demand is dealer-channel auto sales, tying it to the same
  Gaikindo volume node.
- **JCI is NEVER a driver** — the basket is part of the index; JCI would be circular market-beta.
  (Correctly absent from the seed; keep it absent.)

---

## 7. Currently wired vs available (the "what we COULD add")

| Driver | Series (RIC) | n_obs | plane / reachable? | wired now? | priority |
|---|---|---|---|---|---|
| 10Y govt yield (funding cost) | TVC:ID10Y | w798 | macro (corr) | ✅ −1 | keep (re-spec as Δ/momentum) |
| BI policy rate | ECONOMICS:IDINTR | corr | macro (corr) | ✅ −1 | **re-spec as Δ-regime (cuts bullish)** |
| System consumer credit YoY | aIDLONYAR | live | macro | ✅ +1 | keep (attribution) |
| Real GDP YoY | aIDGDPAR1 | live | macro | ✅ +1 | keep (attribution) |
| USD/IDR | FX_IDC:USDIDR | w801 | macro (corr) | ✅ −1 | keep (as momentum) |
| Multifinance financing book | CEICI355184817 / CEICI462344467 | 240/128 | ceic (CEICI…) | ✅ demand | **demote to attribution (own output)** |
| BI loan-demand survey | CEICI285015402 / CEICI315892002 | 70/63 | ceic (reachable) | ✅ | keep (true ex-ante lead) |
| **4W auto wholesale (Gaikindo)** | **CEICI13839901** | **448** | **ceic (cross-industry CEICI…)** | ❌ | **HIGH — the leading demand series** |
| 4W "Local" / LCGC 4x2 | CEICI13839601 / CEICI412545807 | 425/328 | ceic (cross-industry) | ❌ | MED — mass-market cut |
| **US10Y** (upstream funding cost) | TVC:US10Y | w800 | macro (corr) | ❌ | **HIGH — add −1** |
| **DXY** (EM funding stress) | TVC:DXY | w800 | macro (corr) | ❌ (key→empty BBDXY) | **HIGH — add −1 AFTER repointing dxy resolver** |
| M2 YoY (funding liquidity) | aIDM2AR | live | macro | ❌ | MED |
| Consumer confidence | aIDCONIAR | live | macro (key id_consumer_confidence) | ❌ | MED — leads consumer credit |
| Durables-buying intent | CEIC277372902 | 196 | id-macro (needs resolver) | ❌ | MED — leads big-ticket demand |
| Expected income 6M ahead | CEIC277373102 | 196 | id-macro (needs resolver) | ❌ | MED |
| Deposit rate (CoF leg) | CEIC14408501 / CEIC14408201 | 448/449 | id-macro (needs resolver) | ❌ | MED — for spread |
| Consumption lending rate (yield leg) | CEIC14419701 | 304 | id-macro (needs resolver) | ❌ | MED — for spread |
| **System consumption NPL** | CEIC52767201 | 279 | id-macro (needs resolver) | ❌ | **MED — only credit-cost proxy, as Δ** |
| Household vehicle loans | CEIC389692117 | 119 | id-macro (needs resolver) | ❌ | LOW — co-moves |
| Used-car / collateral price | — none — | — | — | ❌ | **GAP — no clean series** |
| Multifinance NPL/asset-quality | — none in block — | — | — | ❌ | **GAP — proxy via CEIC52767201** |

**Data bugs / gaps found (honour these):**
1. **`dxy` resolver is dead.** `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` has **weekly_obs=0** (empty in
   the store). Use **`TVC:DXY`** (w=800). Any dxy hint is inert until the resolver is repointed —
   this is a shared engine bug (also flagged for Banks), fix in `GLOBAL_CORR`, not per-basket.
2. **No multifinance NPL series exists.** The CEIC "Multifinance" block (30 series) is entirely
   financing-receivables *levels* — there is **no non-performing-financing ratio**. Credit cost
   must be proxied by the **system consumption NPL** (`CEIC52767201`, Banking block).
3. **No used-car / collateral price series** in idind/id/market — the recovery-value (LGD)
   branch is unmappable; flag `forecast=low` honestly rather than faking a proxy.

**The plane problem (critical for §9).** The richest *leading* multifinance demand series —
**4W auto wholesale `CEICI13839901`** — is a `CEICI…` idind RIC and is therefore **reachable
today via the `ceic` plane** with a cross-category override (no new resolver needed). By
contrast, the funding-spread and NPL series (deposit rate `CEIC14408501`, lending rate
`CEIC14419701`, consumption NPL `CEIC52767201`, durables intent `CEIC277372902`) live in the
**`id` macro catalog** as `CEIC…` RICs (no trailing-`I`) that **no current code path reads** —
the same structural gap documented in `financials_banks.md`. They need the proposed
`ID_MACRO_OBS` resolver (§9 Tier 2).

---

## 8. Forecastability — the honest verdict

**The fact to explain:** Multifinance has forward IC **−0.02** at the 37th placebo percentile —
not anti-predictive like Banks (−0.15) or Securities (−0.11), but **flat with a faint negative
tilt**: a coin-flip. Three structural reasons:

**(1) The wired "demand" is the basket's own lagged output, not a leading input.**
The CEIC "Multifinance" financing-receivables series — wired today as `demand` — are the
basket's *own* book level. They co-move with the equities and publish *after* them. Used as a
forward signal, they add lag, not lead. The genuine *exogenous, leading* demand — **vehicle
sales volume** — is the one demand series **not wired**. The seed has the *consequence* and is
missing the *cause*.

**(2) The funding-cost branch is contemporaneous and mean-reverting, and anticipated.**
ID10Y / BI-rate / USD-IDR are *contemporaneously* powerful (a yield spike hammers the basket
same-month) but (a) **mean-revert** at +1M and (b) are **anticipated** — the market prices a
telegraphed BI cut before it prints. So a level/sign prior on next-month return is weak-to-
anti-predictive, exactly the financials pattern BACKTEST.md §3 describes ("co-move
contemporaneously but mean-revert; read as attribution, not forecast"). Multifinance is *more*
exposed to this than banks because it has **no deposit franchise** to dampen CoF — its margin is
a pure, fast-repricing rate bet.

**(3) The equal-weight target dilutes the two real franchises with nine idiosyncratic small-caps.**
BFIN+ADMF (63% of mcap) carry the auto-finance cycle; the other nine are thin-float
small/micro-caps and an anti-beta holding co (BPII, β −0.47) whose returns are
liquidity/idiosyncratic. Equal-weighting upweights the noise and averages out the signal.

**Can any branch give forward skill? Branch-by-branch:**

| Branch | Forward-skill verdict |
|---|---|
| Own financing-receivables book (D5) | **No.** Coincident/lagging own output. Attribution only. |
| **4W auto sales volume (D1a)** | **Maybe — best hope.** Exogenous monthly *unit* series that leads the book-build by 1–2 quarters. The cross-industry "demand" leg of the revenue identity. Worth a dedicated OOS test. |
| **Loan-demand survey / durables intent / expected income (D3a/D4b/D4c)** | **Maybe (weak).** Ex-ante expectations that lead consumer-credit demand; soft, not multifinance-specific. |
| Funding cost level — ID10Y / BI / USDIDR (S1, M1–M3) | **No as a level; maybe as Δ-regime/momentum.** Powerful contemporaneously, mean-reverting + anticipated forward. Best for attribution; only a cut-vs-hike regime / flow-momentum transform has forward hope. |
| **NPL formation Δ (S3a)** | **Regime-conditional.** Leads earnings cuts in a deteriorating credit regime; useless in a benign one. Proxy only (no multifinance NPL). |
| Collateral / used-car (S4) | **Unmappable.** No clean series. |

**The verdict.** *Multifinance is a rate-sensitive, auto-cycle consumer-finance basket whose
short-run returns are dominated by anticipated, mean-reverting funding-cost moves — it should be
read primarily as a **contemporaneous attribution**, not a forecast.* The brief's question —
*does vehicle-sales volume or a rate-cut regime give a lead?* — resolves to: **the rate branch
forward-flat because funding cost co-moves and mean-reverts (and is anticipated); the genuine
lead, if any, is the vehicle-sales-VOLUME branch** (exogenous, leads the book-build) and the
**ex-ante expectation surveys** — plus a **cut-vs-hike rate-regime asymmetry** (cuts doubly
bullish via margin relief + duration re-rating). The honest target is moving the IC from −0.02
toward a small positive via the sales-volume lead, or — failing that — confirming the basket is
attribution-only and flagging `forecast=low`. Do **not** chase in-sample fit by upweighting the
own-book financing-receivables series — that raises contemporaneous R² and leaves the forward
gap.

---

## 9. Engine-wiring spec — concrete `mapping.py` changes

**Three tiers, each independently A/B-testable against `backtest/bt.py "Multifinance"`. Adopt
only what holds/improves the blindfolded forward IC.**

### Tier 1 — fixes reachable with TODAY's engine (no new resolver) — do first

```python
"Multifinance": {
    "ceic": [("Banks", "Multifinance"),       # keep — but DEMOTE to attribution (own output)
             ("Banks", "Loan Demand"),          # keep — ex-ante lending survey (true lead)
             ("Consumer Discretionary", "Auto Sales")],  # ADD — cross-industry vehicle-sales VOLUME
    "ceic_override": [("wholesales", "demand", +1),       # CEICI13839901 4W wholesale = the demand leader
                      ("local",      "demand", +1)],       # CEICI13839601/...34801 domestic units
    "globals": [("us_10y", "macro", -1, "global risk-free → ID10Y → multifinance funding cost"),
                ("dxy",    "macro", -1, "EM funding-stress / outflow (NB: repoint dxy→TVC:DXY first)")],
    "macro": [
        ("id_10y",        "macro", -1, "10Y govt yield — bond-funding cost (use Δ/momentum, see Tier 3)"),
        ("id_bi_rate",    "macro", -1, "policy funding cost — re-spec as cut-vs-hike Δ-regime (Tier 3)"),
        ("id_bank_credit","demand", +1, "system consumer-credit availability (attribution)"),
        ("id_m2",         "demand", +1, "system liquidity that funds the bond market"),
        ("id_gdp_real_q", "demand", +1, "borrower income / domestic demand (attribution)"),
        ("id_consumer_confidence","demand", +1, "leads big-ticket vehicle-financing demand"),
        ("usdidr",        "macro", -1, "risk-off / wider credit spreads / FX funding (use as momentum)"),
    ],
}
```
- **Add `("Consumer Discretionary","Auto Sales")` with an override** so the 4W wholesale unit
  series (`CEICI13839901`, n=448) is pulled as a **demand** driver — the single highest-value,
  zero-plumbing change (it is already a `CEICI…` idind RIC, reachable via the `ceic` plane).
  Verify it survives `_curate_ceic` (n=448, P1M, clean — should pass).
- **Add `us_10y`** (corr, w=800) — the upstream of the funding-cost chain, currently missing.
- **Add `dxy` ONLY after** repointing `GLOBAL_CORR["dxy"]` from the empty `TVC:BBDXY` to
  `TVC:DXY` (w=800); otherwise it is a dead driver.
- **Demote the own-book CEIC financing-receivables** to attribution (it is the lagged output;
  do not let it dominate the demand vote).

### Tier 2 — requires the `id`-macro resolver (shared with Banks)

The funding-spread, NPL, and durables-intent series live in `macro.observations` under
`id`-plane `CEIC…` RICs that no current path reads. Reuse the `ID_MACRO_OBS` resolver proposed
in `financials_banks.md` §9 (a thin fall-through from a registered key to
`common.get_observations(ric)`), adding the multifinance-relevant keys:

```python
ID_MACRO_OBS = {  # (extend the shared table)
    "id_deposit_rate_12m": "CEIC14408501",   # WA 12M time-deposit rate, n=448  (CoF leg)
    "id_lending_rate_cons":"CEIC14419701",   # consumption lending rate, n=304  (yield leg)
    "id_npl_cons":         "CEIC52767201",   # system consumption NPL, n=279    (credit-cost proxy)
    "id_durables_intent":  "CEIC277372902",  # durables-buying intent, n=196    (demand lead)
    "id_expected_income":  "CEIC277373102",  # expected income 6M ahead, n=196  (demand lead)
}
```
Then add to the Multifinance `macro` list (each tested individually, kept only if forward IC
holds), and construct the **funding spread** as a derived feature:
```python
        ("id_durables_intent", "demand", +1, "durables-buying intent leads 4W/2W bookings +1–2q"),
        ("id_npl_cons",        "cost",  -1, "system consumption-NPL formation (Δ), stress regime"),
        # spread = id_lending_rate_cons − id_deposit_rate_12m  (the economically right margin var,
        # not either leg alone) — build in drivers/stats, sign +1 on widening.
```

### Tier 3 — the two transforms that matter most (feature engineering, in `drivers/stats`)

1. **Rate Δ-REGIME asymmetry (the brief's "rate-cut regime" question).** Replace the flat −1
   BI-rate driver with a *signed Δ feature*: bullish contribution when the 3-month policy-rate
   change is a **cut** (Δ<0 → margin relief + duration re-rating), bearish/neutral on a **hike**.
   Multifinance, with no deposit cushion, is the *most* rate-cut-levered financials basket — this
   is the single most defensible forward fix. Backtest asymmetric vs flat −1.
2. **Funding cost & flow as momentum, not level.** For `id_10y`, `usdidr`, feed the
   **persistence/momentum** (sign of trailing 2–3M move), not the contemporaneous level —
   because the level mean-reverts and is anticipated at +1M (the mechanism behind the flat IC).
   Test momentum-transformed vs raw.

### What to test in the backtest (`backtest/bt.py "Multifinance"`), and the keep-rule

Ablation ladder — keep a change only if forward IC **improves or holds** while the tree gets
richer and more honest (never keep an in-sample-only gain):
1. Baseline (current 5-driver seed) → confirm −0.02.
2. +Tier 1 (add 4W auto-sales volume + US10Y + consumer-confidence; demote own-book; add DXY
   after repointing the resolver).
3. +Rate Δ-regime asymmetry (replace flat −1).
4. +Momentum transform on ID10Y / USDIDR.
5. +Tier 2 id-macro leads (durables intent, NPL-formation Δ, funding spread).

**Success = forward IC rises from −0.02 toward a small positive (the auto-sales-volume lead
genuinely forecasts the book-build), with the placebo percentile climbing off 0.37.** If after
Tiers 1–3 the IC is still ~0 or negative, the honest conclusion stands: **Multifinance is a
rate-sensitive, mean-reverting consumer-finance basket; ship the verdict as attribution, flag
`forecast=low`, and stop adding drivers.** A neutral, honest read with the vehicle-sales-volume
attribution made explicit is a real win here — not a manufactured positive.

---

### Capsule (for IMPROVEMENT_PLAN §5 row 30)

> **Multifinance · Financials · 33T · OOS ~−0.02 (flat, 37th pctile).** Wire the missing
> *cause* of demand: cross-industry **4W auto-sales VOLUME** (`CEICI13839901`, n=448, via a
> `("Consumer Discretionary","Auto Sales")` override) — the financing book follows it by 1–2q;
> the currently-wired CEIC "demand" is the basket's own lagged receivables book (demote to
> attribution). Add **US10Y** (funding-cost upstream) and **DXY** (after repointing the dead
> `dxy→TVC:BBDXY` resolver to `TVC:DXY`). Re-spec **BI-rate as a cut-vs-hike Δ-regime** (cuts
> doubly bullish — margin relief + duration re-rating; multifinance has no deposit cushion, so
> it is the most rate-cut-levered financials basket) and use ID10Y/USDIDR as momentum, not
> level. Tier-2 id-macro resolver adds the funding **spread** (lending − deposit rate),
> **durables-buying intent**, and a **consumption-NPL** credit-cost proxy. **Data gaps:** no
> multifinance NPL series (proxy via system consumption NPL `CEIC52767201`); no clean used-car
> collateral price (LGD branch unmappable). Honest verdict: a rate-sensitive, mean-reverting
> consumer-finance basket — read as **attribution**, with vehicle-sales volume the one genuine
> lead; target the IC from −0.02 toward a small positive, not a forced skill claim.
