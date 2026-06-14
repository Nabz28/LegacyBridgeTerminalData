# Internet (Technology) — Driver-Tree Plan

> Detail file for the `technology_internet` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #15). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs`.
>
> **One-line thesis: this basket is two unrelated things stapled together — (a) a pair of
> loss-making consumer-internet platforms (GOTO, BUKA, BELI) that trade as a LONG-DURATION /
> RISK-APPETITE re-rating (US real-10Y `DFII10` ↓ and NDX ↑), and (b) a holding/idiosyncratic
> tail (EMTK, WIFI, INET, KIOS). The slow GMV / e-money / card *quantity* prints describe the
> business but do NOT forecast the equity; the only systematic, leading branch is the
> duration / global-tech-sentiment re-rate — and even that is a contemporaneous beta, not a
> forecaster. Honest verdict: attribution/beta basket, anti-predictive forward.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Internet**, sector *Technology* |
| mcap | **167T** (capsule #15) |
| Members (7) | **GOTO** (`IDX:GOTO`, mcap 53.1T, β 0.53) — Gojek×Tokopedia super-app: ride-hail + food + e-commerce GMV + GoPay fintech, structurally loss-making, burn/path-to-profit story; **BELI** (`IDX:BELI`, 45.4T, β −0.20) — Blibli/GDP Venture e-commerce + omnichannel, loss-making; **EMTK** (`IDX:EMTK`, 40.4T, β 0.41) — Emtek media+digital holding (owns Bukalapak stake, DANA e-wallet, Vidio) — a NAV/holding-co, not an operating platform; **BUKA** (`IDX:BUKA`, 11.9T, β 0.31) — Bukalapak marketplace + virtual goods, downsizing to profitability; **WIFI** (`IDX:WIFI`, 11.3T, β 0.28) — Surge/fixed-wireless broadband infra; **INET** (`IDX:INET`, 5.1T, β −0.66) — small ISP/connectivity; **KIOS** (`IDX:KIOS`, 0.09T, β 0.20) — Kioson micro O2O (penny). |
| Effective concentration | **~3 names ≈ 89% of mcap (GOTO+BELI+EMTK).** The equal-weight engine basket is a *GMV-platform + holding-co* composite. EMTK is a holding company (NAV beta), BELI carries a **negative β (−0.20)**, INET **−0.66** — so the basket has **internally contradictory betas** and low cross-member coherence. Read every systematic hypothesis below as "does this forecast the GOTO/BUKA/BELI platform cluster", because the EMTK/WIFI/INET/KIOS legs add idiosyncratic NAV/infra noise. |
| Current grade | **partial** |
| Current kept-driver count | **5** (`_state.txt`) |
| Current forward OOS | **NONE — fwd IC −0.10**, contemp IC **−0.03**, hit−up **−0.03**, placebo pctile **0.17**, n_oos 128 (BACKTEST.md). **Anti-predictive** (negative IC well below the placebo median). Critically, even the *contemporaneous* IC is ≈ 0 / slightly negative — so the current map barely explains co-movement, let alone forecasts. Sits in the BACKTEST.md "diversified/sentiment baskets show NO forward skill — mean-revert" cluster alongside Retail/Auto/Investment. |

**Current seed (`mapping.py` → `SEED["Internet"]`):**
```python
"Internet": {
    "ceic": [("Technology", "E-Commerce Transactions"),
             ("Telecom", "E-Money & Card Payments")],
    "globals": [],
    "macro": [("us_10y", "macro", -1, "growth-stock duration"),
              ("ndx",    "demand", +1, "global tech sentiment"),
              ("id_gdp_real_q", "demand", +1, "GMV growth")],
}
```
**The gap.** The seed already has the right *instinct* (E-commerce + e-money CEIC, plus the
duration/NDX/GDP macro spine). The problems are three: (1) the duration branch is wired to the
**nominal** `us_10y`, but a long-duration, no-near-term-earnings growth basket re-rates off the
**real** yield — `DFII10` (US 10Y Real, wk=800) — which is the cleaner discount-rate instrument
and what the brief specifies (`DFII10` duration −1); (2) the CEIC pulls drag in **dozens of
daily/monthly *quantity* prints** (GMV value/volume/AOV × mobile/desktop/vertical; e-money
top-up/redeem/withdrawal/on-us/off-us) that are **publication-lagged, coincident-to-lagging,
and almost perfectly co-linear** — they bloat the in-sample fit and are the likely cause of the
*negative* forward IC (over-fit coincident prints that mean-revert out of sample); (3) there is
**no risk-appetite / funding branch**, which is the actual swing factor for cash-burning
platforms. This file rebuilds the tree as a *thin, real-yield + global-tech-sentiment* posture
with the GMV/payment quantity trees demoted to **attribution-only**.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (marketplace / super-app core, GOTO+BUKA+BELI):**
```
GMV            = orders × AOV (gross merchandise value transacted on the platform)
Net Revenue    ≈ GMV × take-rate  +  ads/fintech/fulfilment monetisation  −  incentives/promos
Contribution   ≈ Net Revenue − transaction cost (payment, courier, cloud) − S&M (subsidies)
EBITDA / FCF   ≈ Contribution − fixed opex (engineering, G&A) − cash burn
Equity value   ≈ PV(future FCF, terminal monetised TAM) discounted at a HIGH, rate-sensitive WACC
```

Five structural facts drive the modelling:

1. **Long-duration, no-near-term-earnings → a REAL-RATE / WACC asset.** GOTO, BUKA and BELI are
   (or were until very recently) loss-making; their valuation is almost entirely *terminal value*
   — PV of profits years out. That makes them **the most duration-sensitive equities on the IDX**:
   when the global real discount rate (`DFII10`) rises, the present value of distant cash flows
   collapses. This is the single most *systematic and leading* channel, because the bond/real-yield
   market moves daily and first, while GMV prints land slow. **Sign on DFII10: −1.**

2. **Global-tech sentiment / risk-appetite beta (NDX).** These names trade as the local proxy for
   the global growth-tech complex. When NDX / ARKK-style "unprofitable tech" rallies (risk-on),
   GOTO/BUKA re-rate up regardless of domestic fundamentals; in risk-off they de-rate hard. This is
   a *sentiment* channel, not a cash-flow one. **Sign on NDX: +1.** It is contemporaneous-to-slightly-
   leading and high-beta — it explains a lot of variance but mean-reverts, so it attributes better
   than it forecasts.

3. **GMV growth vs path-to-profitability — the fundamental swing, but slow & lagged.** The bull/bear
   debate is *can monetisation (take-rate, fintech, ads) outrun the cessation of subsidies before
   cash runs out*. The observable proxies — e-commerce **GMV value, order volume, AOV** (daily, Grips
   Intelligence) and **e-money / card** payment value (monthly, BI) — are real and exist, but they are
   **coincident-to-lagging activity prints**: they confirm the trend, they do not lead next month's
   excess return. Worse, monetisation (take-rate) is *margin-on-GMV*, which these series cannot see.

4. **Idiosyncratic burn / funding / dilution — the dominant idiosyncratic risk.** Each name has its
   own cash runway, buyback (GOTO ran a buyback), share-lockup expiry, capital raise, and
   profitability-pivot news. This is **un-modellable from macro series** and is a large share of the
   realised variance — a key reason the basket is anti-predictive: macro drivers cannot price the
   company-specific funding/dilution shocks that move these stocks.

5. **The basket is not internally coherent.** EMTK is a **holding company** (its value is a NAV
   discount on Bukalapak + DANA + Vidio stakes — a *financials/investment* behaviour, not an operating
   platform), and WIFI/INET are **broadband infra** (closer to Telco/Tower duration). Stapling these to
   GOTO/BUKA dilutes any clean platform signal. This is structural and cannot be fixed in `mapping.py`
   (the membership is fixed) — it must be *acknowledged* in the forecast verdict.

**What a sell-side analyst actually watches:** quarterly GMV, take-rate / monetisation rate,
adjusted-EBITDA trajectory and "quarters to profitability", cash balance / burn rate, GoPay-DANA
TPV (total payment volume), MTU (monthly transacting users), and — for the *stock* — the **US real
10Y**, **NDX / global growth-tech beta**, **USD/IDR** (foreign-investor risk-off proxy) and **foreign
equity flow**. Of those, only the real-yield, NDX, USD/IDR and flow series are high-frequency leading
prices; the operating metrics are quarterly and lagged.

---

## 3. DEMAND driver tree

> Demand here = *GMV transacted on the platforms* = orders × AOV, plus the digital-payment rails that
> ride the same consumption. In our data this is **daily Grips e-commerce prints + monthly BI payment
> prints** — high-frequency by *publication* but economically **coincident-to-lagging activity**, and
> heavily **co-linear** (value ≈ volume × AOV by construction). Strong for attribution, weak for forecast.

```
DEMAND (GMV = orders × AOV + payment-rail volume)
├── D1 E-commerce GMV (the headline activity proxy) ─► total value transacted
│     ├─ E-Commerce Value ··········· CEICI517698487 [dem, USD, P1D, n=2385]   sign +1, lag ~0 (coincident) ★widest history, thru 2026-06-02
│     ├─ E-Commerce Value (alt)······ CEICI517864907 [dem, USD, P1D, n=2384]   sign +1 (duplicate panel, co-linear — keep one)
│     └─ E-Commerce Value: Mobile···· CEICI517817637 [dem, USD, P1D, n=2384]   sign +1 (mobile-share read; ~all GMV is mobile)
├── D2 Order volume (the "real" demand quantity) ─► transactions count
│     ├─ E-Commerce Volume ·········· CEICI517809607 [dem, Unit, P1D, n=2385]  sign +1, lag ~0 (coincident)  ★cleanest unit-demand
│     └─ E-Commerce Volume: Mobile··· CEICI517672587 [dem, Unit, P1D, n=2384]  sign +1
├── D3 AOV / monetisation-adjacent (basket size) ─► value per order
│     ├─ Average Order Value (AOV)···· CEICI517835347 [dem, USD, P1D, n=2384]  sign ±  (↑AOV can = premiumisation OR weak-volume mix; ambiguous)
│     └─ AOV: Mobile ················ CEICI517830907 [dem, USD, P1D, n=2384]   sign ±
├── D4 Vertical mix (fintech / services GMV — the monetisation thesis proxy) ─► high-take-rate verticals
│     ├─ Value: Finance ············· CEICI519453277 [dem, USD, P1D, n=1716]   sign +1 (fintech GMV = GoPay/DANA-adjacent, higher monetisation)
│     └─ Value: Business & Cons Svcs·· CEICI519397687 [dem, USD, P1D, n=1624]  sign +1 (services GMV)
├── D5 Digital-payment rails (TPV proxy — GoPay/DANA/ShopeePay pulse) ─► e-money + card usage
│     ├─ E-Money Value ·············· CEICI479936297 [dem, IDR bn, P1M, n=207] sign +1, lag ~0 ★monthly TPV proxy (super-app wallet pulse)
│     ├─ E-Money Volume ············· CEICI479936217 [dem, Unit th, P1M, n=207] sign +1
│     ├─ ATM+Debit Card Value ······· CEICI313914702 [dem, IDR bn, P1M, n=243] sign +1 (broad digital-economy pulse; thru 2026-03)
│     └─ Credit Card Value ·········· CEICI313915302 [dem, IDR bn, P1M, n=243] sign +1 (discretionary-spend proxy)
│        ⚠ caveat: payment rails are an INDUSTRY pulse, not these issuers' revenue; cash-substitution inflates the trend independent of GMV.
└── D6 Macro demand backdrop (consumption → online spend) ─► income / confidence
      ├─ Real GDP YoY ·············· id_gdp_real_q → aIDGDPAR1 [P3M]           sign +1 (current seed; coarse, quarterly)
      └─ Consumer Confidence ······· id_consumer_confidence → aIDCONIAR [P1M, n~196] sign +1, lag ~0-1 ★monthly, leads discretionary spend
```

**Forecast hypothesis (demand): weak / attribution-only.** D1–D5 are activity prints that
co-move with the platforms *contemporaneously* but (a) are **mutually co-linear** (Value ≈ Volume ×
AOV; e-money/card all track the same cashless secular ramp), (b) miss **take-rate / margin**, which is
where the equity actually re-rates, and (c) ramp **secularly upward** regardless of the stock cycle
(the cashless transition lifts GMV/TPV even as GOTO's price fell 70%+), which *injects a structural
positive-trend bias that mean-reverts against returns out-of-sample* — the mechanical recipe for a
negative forward IC. The only demand series with genuine lead potential is **consumer confidence**
(D6, monthly, leads spend) — and even that is second-order. **Net: collapse D1–D5 to 1–2 representative
prints for attribution; do not let the quantity tree dominate the fit.**

---

## 4. SUPPLY / COST driver tree

> A platform has no physical "supply"; its cost stack is **incentives/subsidies, payment & courier cost,
> cloud/engineering, and — most importantly — the cost & availability of CAPITAL (funding/burn).** None of
> these has a clean exogenous *price* series in the store, which is itself a structural finding: the cost
> side that actually moves these equities (funding risk-off) is captured by the macro/rate branch (§5), not
> by a commodity input.

```
SUPPLY / COST (incentives + transaction cost + cost of capital)
├── C1 Cost of CAPITAL / funding (THE swing for cash-burners) ─► risk-free + risk-premium
│     ├─ US 10Y Real (DFII10) ······ DFII10 [P1D, wk=800]      sign −1, lag ~0 ★real WACC: ↑real-rate → terminal-value collapse + funding scarce
│     └─ NDX (risk-appetite parent)·· NASDAQ:NDX [P1D]          sign +1 (when growth-tech risk-on, capital is cheap/abundant for burners)
│        mechanism: these names live or die on access to cheap equity/credit; rising real rates raise discount rate AND choke funding → double hit.
├── C2 Subsidy / incentive intensity (the path-to-profit lever) ─► promo spend
│     └─ (no series) — internal P&L decision (GOTO/BUKA cutting incentives to reach profitability). NOT wireable. Document as structural; it is the
│        single biggest margin swing and is invisible to macro data → a core reason macro cannot forecast this basket.
├── C3 Payment & infra cost (cloud / courier / interchange) ─► transaction COGS
│     ├─ USD/IDR (cloud is USD-priced) usdidr → FX_IDC:USDIDR [P1D, wk~801] sign −1 (AWS/GCP billed in USD; weaker IDR → higher cloud cost)
│     └─ (courier/fuel) — brent is a tiny 3rd-order input for GoFood/GoSend; omit, dominated by C1/risk channel.
└── C4 Labour / engineering opex ─► fixed cost base
      └─ (no clean series) — wage inflation proxied loosely by id_cpi_yoy; immaterial vs the funding channel. Note only.
```

**Forecast hypothesis (supply/cost): the cost side IS the macro/funding side.** Unlike a commodity
producer, this basket has **no leading input-price branch** — its decisive cost is the **cost of capital**
(C1), which is the same `DFII10` / NDX risk-appetite branch as §5. The genuine operating-margin lever
(C2 subsidy discipline) is an internal decision with **no time series**, which is precisely why a macro
engine cannot forecast the profitability pivot. USD/IDR (C3) is a small, real cloud-cost branch and also
doubles as a risk-off proxy (§5). **Net cost forecast candidate: `DFII10` (−1), reinforced by NDX (+1).**

---

## 5. MACRO / RATE / FX / FLOW — the systematic core

> **This is the section that matters for Internet.** A profitless long-duration basket is, to first order,
> a *real-rate + global-risk-appetite* trade with an EM-flow overlay. The demand/supply quantity trees are
> slow and co-linear; this branch holds the only liquid, leading, daily-priced systematic drivers.

```
MACRO / RATE / FX / FLOW
├── M1 DURATION — real discount rate (the dominant systematic branch) ★★★
│     ├─ US 10Y Real (DFII10) ······ DFII10 [P1D, wk=800]   sign −1, lag ~0-1  ★the WACC re-rate on terminal-value-heavy equities
│     │     mechanism: profitless growth = mostly terminal value; ↑real yield → PV of distant FCF falls → de-rate. Real (not nominal) is the right
│     │     instrument because there are no near-term nominal cash flows to inflate-away — the discount is real.
│     ├─ US 10Y nominal ············ us_10y → TVC:US10Y [P1D, wk=800]  sign −1 (current seed; keep as cross-check, but DFII10 is cleaner)
│     └─ (id_10y) ················· TVC:ID10Y [P1D]   sign −1 (local duration; weaker channel — these trade on GLOBAL not local rates)
├── M2 GLOBAL-TECH SENTIMENT / RISK APPETITE ★★
│     └─ NDX ···················· ndx → NASDAQ:NDX [P1D]   sign +1, lag ~0  ★global unprofitable-tech beta; risk-on/off switch for burners
├── M3 FX / RISK-OFF & cloud cost ─► IDR as EM-risk barometer
│     └─ usdidr ················· FX_IDC:USDIDR [P1D, wk~801]  sign −1 (weak IDR = EM risk-off = foreign exit from high-beta IDX tech; + USD cloud cost)
├── M4 BROAD-USD / EM-FLOW (the parent of M3) ─► global dollar regime
│     └─ dxy ···················· TVC:DXY [P1D, wk=800]  sign −1 (strong USD → EM equity outflow → high-beta tech sold first)
│        ⚠ resolver bug: GLOBAL_CORR maps dxy→TVC:BBDXY which is EMPTY (wk=0). Use TVC:DXY (wk=800). See §7/§9.
└── M5 FOREIGN EQUITY FLOW (why the de-rate happens — cross-link to Capital Markets) ─► who is selling
      ├─ Net foreign purchase ···· CEICI14620501 [dem, Share mn, P1M, n=405]  sign +1 (foreigners buying IDX = risk-on for high-beta names)
      └─ Turnover: Foreign-Foreign CEICI13610501 [dem, IDR bn, P1D, n=7579]   sign + (foreign-flow intensity; daily, very long history)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Fed real-rate / global risk  ──►  DFII10 (real yield) + NDX (risk appetite)  ──►  GOTO/BUKA terminal-value WACC + funding  ──►  basket re-rate
        (global, daily)                  (market, daily, LEADS)                      (PV collapse / expansion, ~days-weeks)         (the equities)
```
The engine should lean on the **leading parents (real yield + NDX + DXY/flow)** to anticipate the
re-rate — the same "liquid price leads the equity" pattern IMPROVEMENT_PLAN §3 rewards. The difference
versus a *forecastable* basket (Coal, Pharma) is that those drivers move a real cash-flow; here they move
*sentiment/discount on a profitless asset*, which **mean-reverts** — so the co-movement is real but the
forward edge is fragile.

**Forecast hypothesis (macro): this is where forecastability lives, IF anywhere — but it is thin.**
`DFII10` (−1) and `NDX` (+1) are the best forward candidates: liquid, exogenous, daily, and they
genuinely *lead* a duration/sentiment re-rate. `usdidr`/`dxy` (−1) and foreign flow (+1) are the EM-risk
overlay explaining *who sells*. **But** the channel is a *beta on global risk*, not a fundamental edge:
when global growth-tech mean-reverts (as it did 2022–24), this branch flips sign with it, which is exactly
how a contemporaneously-correct map produces a *negative forward* IC. So even the strong branch is best
read as **contemporaneous risk-posture attribution**, with only a marginal, regime-dependent forward claim.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Capital Markets / foreign flow** (#34 Securities) | Net foreign purchase `CEICI14620501` (n=405); Turnover: Foreign-Foreign `CEICI13610501` (n=7579) | macro +1 | High-β IDX tech is the first thing foreigners sell in risk-off and buy in risk-on; flow is the transmission from DXY/real-rates to the de-rate. Same regime that drives Securities/Banks foreign-flow branch. |
| **Banks / digital payments** (#1) | E-Money `CEICI479936297`, Card `CEICI313914702`/`CEICI313915302` | demand +1 (indirect) | The BI payment rails are a *system* output (also used by Banks/Telco maps). Borrow as a low-weight TPV/digital-economy pulse, NOT as issuer revenue. |
| **Telco / broadband infra** (#10, #48 Tower) | id_10y `TVC:ID10Y`; usdidr | macro −1 | WIFI/INET legs are fixed-wireless/ISP infra → rate-sensitive duration like Telco/Tower. Reinforces the duration branch for the non-platform members. |
| **Investment / holding-cos** (#26) | (NAV beta — no clean series) | — | EMTK is a holding co (Bukalapak/DANA/Vidio NAV). Behaves like the Investment basket (#26, also OOS ✗−0.13). No wireable series; flag as idiosyncratic. |
| **US growth-tech complex** (global) | NDX `NASDAQ:NDX`; (QQQ/ARKK-style) | demand +1 | The single largest co-movement source. The basket is, empirically, a levered local NDX-growth proxy. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Real-rate duration** | `us_10y` (nominal) −1 | **`DFII10` (US 10Y Real, wk=800) −1** as PRIMARY; keep `us_10y` as cross-check | **P0 — the core thesis instrument** |
| Global-tech sentiment | `ndx` +1 ✓ (kept) | — (correctly wired) | P0 — keep |
| FX / EM risk-off | none explicit | **`usdidr` −1** (risk-off + USD cloud cost); **`dxy` −1** (flow parent) | **P1** |
| Foreign equity flow | none | Net foreign purchase `CEICI14620501` +1; Foreign-Foreign turnover `CEICI13610501` | P2 (transmission proxy) |
| E-commerce GMV | **bulk-pulled (full E-Commerce Transactions sub — ~25 daily co-linear prints)** | **down-weight to 1 Value + 1 Volume** (`CEICI517698487`, `CEICI517809607`); attribution only | **P0 — fix the over-fit** |
| Digital-payment rails | **bulk-pulled (full E-Money sub — ~23 monthly co-linear prints)** | down-weight to E-Money Value `CEICI479936297` (+ optional Card `CEICI313914702`) | **P1 — fix the over-fit** |
| Consumer backdrop | `id_gdp_real_q` +1 | add `id_consumer_confidence` +1 (monthly, leads spend) | P2 |
| Take-rate / monetisation | none | **no margin/take-rate series in store** — structural gap, document only | n/a |
| Subsidy/burn/funding/dilution | none | **no series** — the dominant idiosyncratic risk is invisible to macro data | n/a — explains the anti-predictiveness |

**Two concrete problems with the current pulls:** (a) `("Technology","E-Commerce Transactions")` and
`("Telecom","E-Money & Card Payments")` together rake in **~45+ daily/monthly quantity prints that are
near-perfectly co-linear** (value/volume/AOV × mobile/desktop/vertical; e-money top-up/redeem/withdraw/
on-us/off-us). They balloon the in-sample R² and, because they ramp secularly while the stocks fell,
**mean-revert against returns OOS → the −0.10 forward IC.** The fix is to keep only **one Value + one
Volume + one e-money** print for attribution and let the systematic load sit on the rate/sentiment branch.
(b) **Resolver bug:** `dxy → TVC:BBDXY` is empty (wk=0); use **`TVC:DXY`** (wk=800). And there is **no
`us_real10y` key** in `GLOBAL_CORR` — `DFII10` exists in `market.json` (wk=800) but is unmapped, so a new
key is required to wire the real-yield branch (see §9).

---

## 8. Forecastability verdict

**The basket is an attribution / beta basket — anti-predictive forward. The only systematic, leading
branch is the real-rate + global-tech-sentiment re-rate (`DFII10` −1, `NDX` +1), and even that is a
contemporaneous risk beta, not a fundamental forecast.** Reasoning:

- **Why nothing forecasts:** the equity value is dominated by (i) the **global real-rate / risk-appetite
  re-rate** of a profitless terminal-value asset — a *sentiment beta* that mean-reverts; and (ii)
  **idiosyncratic burn / funding / dilution / profitability-pivot** news that **no macro series can see.**
  The fundamentals we *can* observe (GMV value/volume/AOV, e-money/card TPV) are coincident-to-lagging
  activity prints that ramp secularly with the cashless transition independent of the stock cycle — so
  loading on them produces a structurally positive trend that goes the **wrong way** versus returns out of
  sample. That is the textbook profile of a negative forward IC, and it matches BACKTEST.md: fwd −0.10,
  contemp −0.03, placebo pctile 0.17, n_oos 128 — *anti-predictive even contemporaneously* in this window.

- **Why the duration/sentiment branch is the best (but still thin) hope:** `DFII10` and `NDX` are liquid,
  exogenous, daily, and they *do* lead the WACC/funding re-rate — the right economic instrument for a
  long-duration growth basket. A *thin, real-yield-led* posture should at minimum stop being
  anti-predictive (kill the over-fit on co-linear GMV prints) and may recover a small **regime-dependent**
  edge: skill in risk-off/rate-shock regimes, none in mean-reverting chop. But because the channel is a
  *beta on global risk appetite* rather than a domestic cash-flow, its forward IC will flip sign whenever
  global growth-tech mean-reverts — so the realistic ceiling is **weak/marginal at best**.

- **Honest concession (membership):** the basket staples GMV-platforms (GOTO/BUKA/BELI), a holding-co
  (EMTK, NAV beta, like Investment #26), and broadband infra (WIFI/INET, rate-duration like Telco) with
  **contradictory betas** (BELI −0.20, INET −0.66). This low internal coherence caps any single systematic
  signal and is *not fixable in `mapping.py`* (membership is fixed upstream). It must be stated, not engineered away.

**What would move it from anti-predictive → neutral/marginal:** (1) swap nominal `us_10y` → **real
`DFII10`** as the primary duration instrument; (2) add the **risk-off/flow overlay** (`usdidr`, `dxy`,
foreign flow); (3) **demote the GMV/payment quantity trees to 1–2 attribution prints** so the co-linear
secular ramp stops driving the fit; (4) add monthly consumer confidence. Hypothesis: a *thinner,
real-yield + sentiment* posture goes from −0.10 toward ~0 (stops being anti-predictive) and earns a small,
honest, regime-conditional edge. **If forward IC stays ≤ 0 after the rewire, the correct verdict is to
label Internet a *contemporaneous risk-posture attribution* ("a real-rate / NDX / EM-risk beta on a
profitless-growth basket"), NOT a forecaster** — consistent with how BACKTEST.md treats the
sentiment/diversified cluster (Retail, Auto, Investment, Conglomerate).

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Internet"]`:**
```python
"Internet": {  # ~89% GOTO+BELI+EMTK: loss-making platforms + a holding-co. A long-duration /
    # global-tech-sentiment re-rating basket with large idiosyncratic burn/funding noise.
    # Keep the GMV + payment CEIC pulls for ATTRIBUTION ONLY and down-weight to a few
    # representative prints — the full subs are ~45 co-linear secular-ramp series that
    # over-fit in-sample and mean-revert OOS (the cause of the -0.10 forward IC).
    "ceic": [("Technology", "E-Commerce Transactions"),
             ("Telecom", "E-Money & Card Payments")],
    # demote the co-linear quantity tree: keep value + volume + one e-money as the demand proxy.
    "ceic_override": [("e-commerce transactions: value",  "demand", +1),   # GMV proxy
                      ("e-commerce transactions: volume", "demand", +1),   # order count
                      ("e-money & card payments: value",  "demand", +1)],  # TPV / wallet pulse
    # optional: trim the noisiest co-linear panels (mobile/desktop/vertical splits, on-us/off-us,
    # top-up/redeem/withdraw) so they don't dominate the fit. Uncomment after A/B test:
    # "ceic_exclude": [("desktop",), ("on us transaction",), ("off us transaction",),
    #                  ("reload/top up",), ("redeem transaction",), ("withdrawal",)],
    "globals": [
        ("usdidr", "macro", -1, "weak IDR = EM risk-off (foreigners sell high-beta tech) + USD cloud cost"),
        ("dxy",    "macro", -1, "broad USD -> EM equity outflow -> high-beta tech de-rate"),
    ],
    "macro": [
        # ── the systematic spine: REAL-RATE duration + global-tech sentiment ──
        ("us_real10y", "macro",  -1, "PRIMARY: real WACC re-rate on profitless terminal-value equities"),
        ("us_10y",     "macro",  -1, "nominal-yield cross-check (DFII10 is the cleaner instrument)"),
        ("ndx",        "demand", +1, "global unprofitable-tech sentiment / risk-appetite beta"),
        # ── demand backdrop (attribution; slow) ──
        ("id_gdp_real_q",          "demand", +1, "domestic consumption -> GMV (coarse, quarterly)"),
        ("id_consumer_confidence", "demand", +1, "monthly discretionary-spend pulse -> online orders"),
    ],
}
```

**New resolver required (the real-yield branch).** `DFII10` (US 10Y Real) is present in
`market.json` (wk=800) but **has no key in `GLOBAL_CORR`**. Add:
```python
# rates / yields  (in GLOBAL_CORR)
"us_real10y": "DFII10",   # US 10Y real yield — growth-stock / profitless-tech duration
```
Also fix the existing **`dxy` resolver**: `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is empty (wk=0) — remap to
**`"TVC:DXY"`** (wk=800) or the `dxy` global above will resolve to nothing (same bug noted in the Telco
file). `ndx → NASDAQ:NDX`, `us_10y → TVC:US10Y`, `usdidr → FX_IDC:USDIDR`, `id_gdp_real_q → aIDGDPAR1`,
`id_consumer_confidence → aIDCONIAR` are all already mapped — no further resolvers needed.

**Optional cross-industry flow add (P2, test before keeping):** wire foreign equity flow as a
risk-transmission proxy via a small CEIC override or a dedicated pull:
`Net foreign purchase` `CEICI14620501` (+1) / `Turnover: Foreign-Foreign` `CEICI13610501`.

**What to backtest (`backtest/bt.py "Internet"`), keep only if forward IC improves/holds:**
1. **A/B the real-vs-nominal duration swap:** current (`us_10y` primary) vs proposed (`us_real10y`
   `DFII10` primary). Expect the real yield to be the cleaner discount instrument for profitless growth.
2. **Thin-vs-fat:** rates+sentiment 5-driver posture with **demoted** GMV/payment trees vs the current
   fat bulk-CEIC posture. **Hypothesis: the thin posture lifts forward IC from −0.10 toward ≥ 0** by
   removing the co-linear secular-ramp prints that mean-revert OOS. This is the single most important test.
3. **Risk-off overlay:** confirm adding `usdidr`/`dxy` (−1) and foreign flow (+1) helps or is neutral
   (they should explain the de-rate transmission). Verify `dxy` resolves to `TVC:DXY` (non-empty) first.
4. **Sign sanity on `us_real10y`:** verify the empirical sign is **−** (a true long-duration asset). If it
   comes out +, the duration thesis is broken for this period → downgrade to attribution-only.
5. **Honesty gate:** if forward IC stays ≤ 0 after the real-yield + thin rewire, **label Internet a
   contemporaneous risk-posture attribution (a real-rate / NDX / EM-risk beta on a profitless-growth +
   holding-co basket), NOT a forecaster** in the capsule — and note the idiosyncratic burn/funding and the
   incoherent-membership ceiling as the structural reasons macro cannot forecast it.
