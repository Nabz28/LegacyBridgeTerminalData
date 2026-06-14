# IT Services (Technology) — sub-industry driver plan

`id: technology_it_services` · sector **Technology** · mcap **≈842T** · benchmark **JCI**
Current: grade **needs_review / low** · kept drivers **3** · full-window IC **+0.12** ·
**blindfolded forward OOS = SKILL +0.115** (one of only ~13 baskets with positive forward
skill). This file's job is the rare one in the plan: **protect and DEEPEN an existing
forecaster without overfitting it away.**

---

## 1. Snapshot

15 names, but the basket is a **two-stock duration barbell** — it is effectively DCII +
MORA for the index and MLPT/MSTI/MTDL-style distributors for the breadth.

| symbol | what it does | mcap (T) | wt | beta | role in basket |
|---|---|---|---|---|---|
| **DCII** | DCI Indonesia — wholesale **data centres** (hyperscale/colo, AI-cloud power) | 460.1 | **54.6%** | 0.23 | THE driver — long-duration power-demand annuity |
| **MORA** | Mora Telematika (Moratelindo) — fibre backbone / data-centre interconnect | 320.1 | **38.0%** | 0.02 | second duration leg; low realised beta (illiquid) |
| MLPT | Multipolar Technology — IT system-integration / distribution (Lippo) | 36.0 | 4.3% | 1.40 | the *real* cyclical IT-services sleeve |
| EDGE | Indointernet — data centre + cloud/edge | 9.7 | 1.1% | 0.45 | DCII-correlated mini |
| CYBR | Cyber Network Indonesia | 8.1 | 1.0% | — | thin |
| MSTI | Mastersystem Infotama — enterprise IT integration | 4.3 | 0.5% | -0.32 | distributor sleeve |
| ATIC | ATIC — IT services & consulting | 1.1 | 0.1% | 0.68 | thin |
| NFCX | NFC Indonesia — digital distribution / e-voucher | 1.1 | 0.1% | -1.30 | digital-payment sleeve |
| TFAS, JATI, CASH, TOSK, WGSH, DIVA, HDIT | small IT-services / digital names | <0.4 each | <0.5% | mixed | noise floor |

**Concentration is the single most important fact: DCII+MORA = ~92.6% of mcap.** A
market-cap-weighted basket return is, to first order, *the return of two long-duration
Indonesian "infrastructure-tech" annuities*. The small IT-distributors (MLPT/MSTI/MTDL-
style) are economically a different business (cyclical, USD-hardware reseller margins) but
contribute almost nothing to the weighted return. **Model the cap-weighted index for the
backtest; describe both economic engines so the tree is honest.**

**The gap.** mapping.py wires only 3 surviving drivers (`id_10y`, `us_10y`, `ndx`) plus the
STD_MACRO overlay. The forward skill it already has is *coming from the duration leg*
(global real-yield → DCII/MORA discount rate). But two of the most theoretically-correct
leading drivers are **missing or broken**: there is **no US real-10Y (`DFII10`) token at all**
(the cleanest growth-duration series, 800 weekly obs, sitting unused), and **`dxy` resolves to
the empty `TVC:BBDXY`**. We close the tree to data-centre power demand, cloud/AI-capex beta,
digital-economy transaction volume, and USD hardware cost — while keeping the *forecasting*
weight on the liquid, real-time duration branch that already works.

---

## 2. Economic structure — how this basket makes money

There are **two distinct revenue engines** stacked in one basket. Conflating them is why a
naive "tech beta" mapping underperforms a duration mapping.

**(A) The data-centre / fibre annuity (DCII, MORA, EDGE — ~94% of weighted mcap).**
Revenue identity ≈ **contracted IT load (MW) × utilisation × price/kW-month**, plus
interconnect/fibre lease. This is a *capital-intensive, long-lived, contracted-cashflow*
business — economically a regulated-utility/REIT hybrid, **not** a software multiple.

- **Revenue driver:** booked MW and utilisation ramp. New capacity is leased years ahead
  (hyperscale + AI-inference demand); the demand impulse is *global cloud/AI capex* landing
  in Jakarta/Batam, financed by global money.
- **Cost stack:** (i) **electricity** — a data centre is a machine for converting power into
  rent; power is the dominant opex and the binding constraint on siting; (ii) **USD capex**
  for servers/cooling/switchgear (imported); (iii) **financing cost** on the build-out debt.
- **Margin swing factor:** *the discount rate.* With long-dated contracted cashflows and a
  high capex base, equity value is dominated by the rate at which those cashflows are
  discounted. A 50bp move in the global real yield moves the present value of a 15-year
  annuity far more than a quarter's utilisation surprise. **This is why the basket has a
  duration beta and why a real-yield series leads it.**

**(B) The IT-distribution / system-integration sleeve (MLPT, MSTI, ATIC, MTDL-style — ~6%).**
Revenue identity ≈ **enterprise/government IT project volume × reseller-and-services margin**.
Cost = **USD-priced hardware/licences** (Cisco/Dell/Microsoft) bought in USD, sold in IDR.
Margin swing factor = **USD/IDR** (importer squeeze) and **corporate/government digital
capex** (GDP/credit-cycle elastic). This sleeve is cyclical, not a duration play — but it is
a rounding error in the cap-weighted return.

**What a sell-side analyst watches:** DCII contracted-MW pipeline & utilisation; the global
**AI/cloud capex** read (hyperscaler guidance → NDX/data-centre proxies); **US real 10Y**
(the duration discount rate); PLN power availability/tariff and grid build at DC clusters;
USD/IDR for imported gear; and digital-economy throughput (e-commerce GMV, e-money volume)
as the secular demand backdrop for compute/connectivity.

**Intra-basket dispersion:** DCII/MORA = rate-sensitive annuity (low realised beta, high
duration); MLPT/MSTI = USD-cost cyclicals (high beta on MLPT). The **two legs can decouple**
(rates up + AI capex up → DCII flat, distributors hurt by USD) — but cap-weighting makes the
duration leg dominate, which is exactly what the forward-skilled mapping should respect.

---

## 3. DEMAND driver tree

Leaf format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.
Tag: **[F]** = forecast candidate (liquid/real-time/leading); **[A]** = attribution only
(CEIC quantity print, publication-lagged, coincident/lagging).

```
DEMAND
├── D1  Global AI / cloud capex impulse  (the data-centre demand engine)
│    ├─ NASDAQ-100  NASDAQ:NDX (w800) · demand · + · LEAD 1–3m · hyperscaler capex &
│    │     AI-infra sentiment lead Asian DC leasing & DCII/MORA re-rating · DAILY, real-time [F]
│    └─ Copper      COMEX:HG1! (w800) · demand · + · LEAD 1–2m · "AI electrification" /
│          grid+DC power build read-through; copper = the global data-centre/grid demand
│          tell · DAILY [F]  (secondary, low weight — keep only if IC holds)
├── D2  Global growth-duration appetite  (the discount-rate demand for the annuity)
│    └─ US 10Y real DFII10 (w800) · demand-via-duration · − · LEAD 1–3m · real yield = the
│          discount rate on 15-yr contracted DC cashflows; falling real yields pull capital
│          into long-duration infra-tech · DAILY, real-time — **NOT yet wired** [F]
├── D3  Domestic digital-economy throughput  (secular compute/connectivity demand)
│    ├─ E-Commerce txn Value  CEICI517698487 (n2385, P1D) · demand · + · LEAD 0–1m · GMV =
│    │     demand for cloud/CDN/DC capacity & payment rails · daily but a SCRAPED quantity
│    │     proxy, noisy, pub-lagged on join · treat [A] (secular backdrop, not a trigger)
│    ├─ E-Money txn Value     CEICI479936297 (n207, P1M) · demand · + · LEAD 0 · digital-
│    │     payment volume → transaction-processing & NFCX/digital-distribution demand · [A]
│    └─ Fixed Broadband Subs  CEICI265968802 (n25, P1Y) · demand · + · n/a · connectivity
│          penetration → fibre (MORA) demand · ANNUAL, n25 — too slow to score, context only
└── D4  Domestic corporate/government IT capex  (the distribution sleeve, ~6%)
     └─ id_gdp_real_q  aIDGDPAR1 (P3M) · demand · + · LEAD 0–1q · enterprise/gov digital
           spend rises with the cycle · quarterly, pub-lagged · [A]
```

**Demand leaves that should FORECAST: D1 (NDX), D2 (DFII10 real-10Y).** Both are liquid,
exogenous, daily, and lead the equity re-rating. Everything in D3/D4 is a slow domestic
quantity print — real economic content, but coincident/lagging → **attribution, not signal.**

---

## 4. SUPPLY / COST driver tree

A data centre's "supply" is **power + USD capex**; the distributor sleeve's cost is **USD
hardware**. There is no commodity-revenue leg here (unlike Coal/Metals), so this side is a
*cost/margin* tree, not an output tree.

```
SUPPLY / COST
├── S1  Electricity / power cost & availability  (dominant DC opex + siting constraint)
│    ├─ Electricity tariff: Industry  CEICI… "Tariff: Industry" (P1M, n138) · cost · − ·
│    │     LEAD 0 · grid power price = the core DC opex; tariff hikes compress DC margin ·
│    │     CEIC admin print, pub-lagged · [A]  (from Energy→Electricity block, cross-industry)
│    └─ (context) PLN industrial power consumption / installed capacity — capacity to serve
│          DC clusters; annual, context only, not scorable
├── S2  USD hardware / equipment cost  (servers, switchgear, cooling, reseller COGS)
│    └─ USD/IDR  FX_IDC:USDIDR (w800) · cost · − · LEAD 0–1m · weaker IDR raises imported
│          server/network capex AND squeezes distributor reseller margin · DAILY [F]
│          (note: sign is the COST leg; STD_MACRO carries the generic usdidr=0 prior —
│           override to −1 here because the whole basket is a net USD-cost importer)
└── S3  Financing cost of the build-out  (capex is debt-funded)
     ├─ id_10y  TVC:ID10Y (w-deep, daily) · cost/macro · − · LEAD 1–2m · domestic long
     │     yield = IDR financing cost on DC capex AND the local-currency discount rate · [F]
     └─ id_bi_rate  ECONOMICS:IDINTR (P1M) · macro · − · LEAD 0 · policy-rate level on
           working-capital & project debt · [A]
```

**Supply/cost leaves that should FORECAST: USD/IDR and id_10y** (both liquid/daily). The
electricity tariff is the *economically* dominant cost but is an admin, lagged print → **[A]**.

---

## 5. MACRO / RATE / FX / FLOW

This basket is, uniquely in the Indonesian universe, **more sensitive to the GLOBAL rate
curve than the domestic one** — because its dominant cashflows are long-duration and its
marginal buyer is global/foreign. The macro overlay should therefore *over-weight global
duration* relative to the standard STD_MACRO template.

| driver | ric (obs) | role | sign | lead | mechanism | quality |
|---|---|---|---|---|---|---|
| **US 10Y real** | `DFII10` (w800) | macro/duration | **−** | 1–3m | cleanest growth-duration discount rate; the primary forecaster — **must add a token** | daily [F] |
| US 10Y nominal | `TVC:US10Y` (w800) | macro | − | 1–3m | global risk-free / discount rate (already wired) | daily [F] |
| NDX | `NASDAQ:NDX` (w800) | demand | + | 1–3m | global tech/AI beta & capex sentiment (already wired) | daily [F] |
| ID 10Y | `TVC:ID10Y` (daily) | macro | − | 1–2m | local discount rate + IDR capex financing | daily [F] |
| USD/IDR | `FX_IDC:USDIDR` (w801) | macro→cost | − | 0–1m | net USD-cost importer (gear + reseller COGS); also EM risk-off flow tell | daily [F] |
| DXY | `TVC:DXY` (w800) | macro | − | 0–1m | broad-USD / EM-flow headwind; **use `TVC:DXY`, NOT empty `TVC:BBDXY`** | daily [F] |
| BI rate | `ECONOMICS:IDINTR` | macro | − | 0 | policy level on project debt | monthly [A] |
| ID CPI yoy | `ECONOMICS:IDIRYY` | macro | 0 | — | inflation regime (STD_MACRO) | monthly [A] |

**Flow note:** DCII/MORA are foreign-favourite, low-float, duration names; EM-equity flow
(proxied by DXY ↓ / USD/IDR ↓ / US-real-yield ↓) tends to *lead* their re-rating. The macro
block is therefore doing double duty as a **foreign-flow proxy**, which is why it forecasts.

---

## 6. Cross-industry linkages (made explicit)

| borrowed from | series | used here as | why |
|---|---|---|---|
| **Energy → Electricity** | `Tariff: Industry` / industrial power consumption (CEIC, P1M) | DC opex cost (S1) | data centres are power-to-rent machines; power is the binding cost & siting constraint |
| **Telecom → E-Money & Card Payments** | `E-Money Value` `CEICI479936297` (n207) | digital-throughput demand (D3) | payment volume → processing/digital-distribution demand (NFCX-type) |
| **US macro (market)** | `DFII10`, `NASDAQ:NDX`, `TVC:US10Y`, `TVC:DXY` | global duration & AI-capex (D1/D2/macro) | the basket's marginal cashflow discounter & demand impulse are global, not domestic |
| **Metals (market)** | `COMEX:HG1!` copper | AI-electrification demand tell (D1) | copper = the global grid/DC power-build read; secondary, IC-gated |

Note: the `Telecom Subscribers & Internet` operator series (Telkomsel/Indosat/XL customer
base) are in the same CEIC block but are **Telco constituents' own outputs** — economically
*Telco*, not IT-services demand. They should NOT be auto-pulled as demand for this basket;
they are near-endogenous to a different sub-industry. Keep them excluded.

---

## 7. Currently-wired vs available

| branch | series | wired now? | priority to add | note |
|---|---|---|---|---|
| US 10Y nominal | `TVC:US10Y` | ✅ macro −1 | keep | working duration leg |
| NDX | `NASDAQ:NDX` | ✅ demand +1 | keep | working AI/tech beta |
| ID 10Y | `TVC:ID10Y` | ✅ macro −1 | keep | local discount rate |
| **US 10Y real** | **`DFII10`** | ❌ **no token exists** | **P1 — highest** | cleanest forecaster; add resolver token + macro −1 |
| **DXY** | `TVC:DXY` | ⚠️ token → **empty `TVC:BBDXY`** | **P1 — bug** | flow/USD headwind; repoint token or add `TVC:DXY` |
| USD/IDR (as cost) | `FX_IDC:USDIDR` | ➖ STD_MACRO at sign 0 | P2 | override to −1: net USD-cost importer |
| CEIC Technology block | `("Technology", None)` | ✅ (all subcats) | re-scope | currently pulls e-commerce/internet/subscriber prints indiscriminately |
| Electricity tariff (DC opex) | CEIC `Energy→Electricity` | ❌ | P3 (attribution) | economically dominant cost, but lagged → won't forecast |
| E-Money payment volume | `CEICI479936297` | ❌ | P3 (attribution) | secular digital backdrop |
| Copper (AI-electrification) | `COMEX:HG1!` | ❌ | P4 — IC-gated | only if forward IC holds; drop otherwise |

**Current bugs found:**
1. **`DFII10` (US real 10Y) is absent from the macro-token map** despite existing in
   `market.json` with **800 weekly obs** — the single most theory-correct forecaster for a
   duration basket is unused.
2. **`dxy` → `TVC:BBDXY` which has `weekly_obs = 0`** (empty, per the verified caveat list).
   Any basket using `dxy` silently drops it. Use `TVC:DXY` (w800).
3. **`("Technology", None)`** sweeps the *entire* Technology CEIC block — including E-Commerce
   browser-share/AOV noise and Telco-operator subscriber series — into this basket as
   undifferentiated demand. Most are slow annual/scraped prints that add in-sample noise.

---

## 8. Forecastability

**Verdict: this basket is a genuine — but narrow — FORECASTER, and the skill is a DURATION
BETA, not a fundamental-quantity signal.** Forward OOS = **SKILL +0.115**; it is one of the
few baskets with positive blindfolded skill, and the reason is structural:

- The cap-weighted return ≈ the return of two long-duration annuities (DCII+MORA).
- Long-duration equity value is dominated by the **discount rate**, and the relevant discount
  rate is **global** (foreign marginal buyer, USD-capex, AI-capex demand).
- The global rate/risk series (`DFII10`, `US10Y`, `NDX`, `DXY`) are **liquid, daily, exogenous
  and LEAD** the slow Indonesian equity re-rating by ~1–3 months. That lead is the skill.

**Contemporaneous vs forward.** The engine `shift(1)`s every CEIC quantity print (publication
lag), so the e-commerce/e-money/subscriber series are joined as *coincident/lagging* — they
explain variance in-sample but cannot anticipate returns. The **market/macro globals are
real-time and unshifted** → they are the only branches that can forecast. The forward IC is
therefore *entirely carried by D1/D2/macro*; the CEIC tree is attribution scaffolding.

**Why it forecasts (one line):** *global-tech duration beta leads* — when the world's real
discount rate falls and AI-capex sentiment rises, capital rotates into long-duration infra-
tech, and Jakarta-listed DCII/MORA re-rate with a lag the liquid US series front-run.

**What would move it from +0.12 to a deeper, more robust forecaster (without overfitting):**
1. **Add the missing real-yield leg (`DFII10`).** Theory says it should be the *best* single
   driver; nominal-10Y is a noisier proxy for it. This is the highest-confidence add.
2. **Fix DXY** so the EM-flow/USD headwind branch actually resolves.
3. **Keep the forecasting weight on the 4–5 liquid global series; demote the CEIC block to a
   tightly-scoped attribution set.** The overfit risk here is *adding domestic quantity
   prints that fit in-sample and kill forward IC* — exactly the failure mode the plan warns
   about. Resist it: the secret of this basket is that *less domestic data is more skill.*

**Overfitting guardrails specific to this basket:**
- Only 99 obs and a 2-stock effective basket → **few drivers, high prior-confidence drivers
  only.** Do not exceed ~6–7 kept drivers.
- `DFII10` and `US10Y` are ~collinear; keep both only if the multivariate/IC step says the
  real-yield leg adds incremental forward IC, else keep `DFII10` alone (it is the cleaner
  theory leg).
- Copper (D1 secondary) is a *narrative* leaf — wire it **only behind an IC gate**; drop on
  any forward-IC regression.
- DCII has a short listing history; guard against the backtest being dominated by its IPO
  ramp. Verify the forward window is post-listing-stabilisation before trusting the IC.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

**(a) New resolver token (required).** Add to `MACRO_TOKEN_RICS` (the dict ending line 70):
```python
"us_real_10y": "DFII10",   # US 10Y real (TIPS) — growth/duration discount rate, w800
```
Also fix the broken broad-USD token so any basket that uses it resolves:
```python
"dxy": "TVC:DXY",          # was "TVC:BBDXY" (weekly_obs = 0, empty) — repoint to TVC:DXY
```
(`dxy` repoint is a global fix; if a one-line global change is out of scope for this basket,
reference `TVC:DXY` directly in the macro list below instead of the `dxy` token.)

**(b) Replace the `"IT Services"` SEED entry** (mapping.py ~lines 465–472) with a deeper,
duration-weighted tree that keeps forecasting weight on liquid globals and demotes CEIC to
scoped attribution:
```python
"IT Services": {
    # Scope CEIC tightly: keep the digital-economy demand proxy + DC power cost,
    # drop the Telco-operator subscriber prints and browser-share noise.
    "ceic": [("Telecom", "E-Money & Card Payments"),      # digital-payment volume (demand)
             ("Technology", "E-Commerce Transactions"),    # GMV proxy (demand, scraped)
             ("Energy", "Electricity")],                   # industrial tariff = DC opex (cost)
    "ceic_exclude": [
        "telkomsel", "indosat", "xl axiata",   # Telco constituents' own outputs (endogenous-ish)
        "browser share", "search engine", "social media", "device vendor",  # internet-noise
        "fixed telephone", "mobile cellular",  # legacy-telco penetration, not IT-services demand
    ],
    "ceic_override": [
        # electricity tariff is a COST (margin −), not generic demand
        ("tariff: industry", "cost", -1),
        ("electricity", "cost", -1),
    ],
    "globals": [
        ("copper", "demand", +1, "AI-electrification / DC+grid power-build demand tell (IC-gated)"),
    ],
    "macro": [
        ("us_real_10y", "macro", -1, "US 10Y real = discount rate on long-duration DC annuity (primary forecaster)"),
        ("us_10y",      "macro", -1, "global nominal discount rate (keep only if adds incremental IC vs real)"),
        ("ndx",         "demand", +1, "global AI/cloud-capex & tech beta"),
        ("id_10y",      "macro", -1, "domestic long yield: IDR capex financing + local discount rate"),
        ("usdidr",      "cost",  -1, "net USD-cost importer (servers/gear + reseller COGS) — override STD_MACRO 0"),
        ("dxy",         "macro", -1, "broad-USD / EM-flow headwind (ensure resolves to TVC:DXY, not empty BBDXY)"),
    ],
},
```

**(c) Endogenous / exclusion rationale.** No basket-constituent balance-sheet series are
pulled (none exist in the CEIC tech block). The exclusions above remove (i) Telco operators'
own subscriber/customer-base prints (those belong to the Telco sub-industry), and (ii)
browser/OS market-share and legacy fixed/mobile-penetration series that are demand for the
*internet* in general, not this equity basket — they add in-sample noise with no forward
content.

**(d) Falsifiable backtest plan.**
1. Baseline: re-run `backtest/bt.py "IT Services"` on the current 3-driver mapping → record
   forward IC (expect ≈ +0.12) as the bar to beat.
2. Add **only** `us_real_10y = DFII10` (macro −1). Re-run. **Confirm hypothesis if forward IC
   rises (target ≥ +0.14) or holds with the real-yield leg replacing nominal as top driver.**
   If forward IC falls, `DFII10`/`US10Y` collinearity is hurting — keep `DFII10`, drop `us_10y`.
3. Fix `dxy → TVC:DXY`; re-run. Keep only if forward IC holds/improves.
4. Add the scoped CEIC set (e-money / e-commerce / electricity) **last** and watch forward IC
   closely: **if it drops, revert** — that confirms the basket's skill is the global-duration
   beta and that domestic quantity prints are overfit noise here. A clean negative result on
   the CEIC adds is itself a valuable, honest finding.
5. Copper leaf is IC-gated: keep only if its inclusion does not lower forward IC.

**Expected outcome:** a 5–6-leaf, duration-weighted tree (DFII10 · US10Y · NDX · ID10Y ·
USD/IDR · DXY) with the CEIC block demoted to attribution, forward IC held or improved above
+0.12 — deepening a working forecaster by adding the one theory-correct series it was missing
(`DFII10`) rather than by piling on domestic data.

---

### 4-line summary
- **Leaves:** DEMAND 4 branches (NDX[F], DFII10-duration[F], digital-throughput e-com/e-money[A], GDP[A]) · SUPPLY/COST 3 (electricity tariff[A], USD/IDR[F], id_10y/BI[F/A]) · MACRO 6 (DFII10, US10Y, NDX, ID10Y, USD/IDR, DXY) — forecasting weight deliberately on the 4–5 liquid global series.
- **Key forecast hypothesis:** the basket is ~93% DCII+MORA, two long-duration infra-tech annuities; *global real yield (`DFII10`) + AI-capex (`NDX`) LEAD the discount-rate re-rating by 1–3m* → that duration beta is the +0.12 forward skill; deepen by adding the missing real-yield leg, NOT by adding domestic quantity prints (which would overfit).
- **Data bugs found:** (1) **no `us_real_10y`/`DFII10` token exists** though `DFII10` has 800 weekly obs unused; (2) **`dxy` → `TVC:BBDXY` is empty (weekly_obs 0)** — use `TVC:DXY`; (3) `("Technology", None)` over-sweeps Telco-operator + browser-share noise into the basket.
- **Net recommendation:** add `DFII10` (P1), fix `dxy` (P1), scope CEIC tightly + IC-gate every domestic/quantity add; cap at ~6–7 kept drivers given 99 obs and a 2-stock effective basket — protect the duration skill, do not dilute it.
