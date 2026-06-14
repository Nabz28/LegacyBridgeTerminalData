# Retail (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_retail` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #21). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: this basket is the cyclical, rate-and-credit-elastic, festive-seasonal arm of
> Indonesian household consumption — discretionary specialty / department-store / electronics
> retailers whose revenue is `SSSG × store count`. Demand is driven by *real income + confidence +
> consumer credit + the Ramadan/Lebaran calendar*; cost is *imported (USD) merchandise + rent +
> labour*; margin is *SSSG operating leverage*. The honest problem: every observable demand series
> (CCI, retail-sales index, consumption loans) is a publication-lagged, COINCIDENT, mean-reverting
> *quantity* print, and the equities themselves trade on forward SSSG sentiment that reverts. So the
> map explains co-movement well but does NOT forecast — the basket is currently anti-predictive
> (fwd IC −0.07, kept=1). The ONLY genuine forward-edge candidates are the few *forward-intent*
> survey series (durable-goods buying condition, expected income, household spend-vs-save allocation)
> and the leading *price* series (USD/IDR for imported COGS, the rate complex for financing) — and
> even those are thin. Verdict: contemporaneous attribution / consumption beta, not a forecaster.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Retail**, sector *Consumer Cyclicals*, id `consumer_cyclicals_retail` |
| mcap | **~101T** (capsule #21), benchmark JCI |
| n_names | **29** real members |
| Top members (what each does) | **MAPI** (`IDX:MAPI`, 25.0T, β 0.22) — Mitra Adiperkasa: Indonesia's dominant *fashion/lifestyle + F&B franchise* operator (Zara, Starbucks, Sports Station, dept-store concessions); **MDIY** (`IDX:MDIY`, 19.9T) — Mr DIY home-improvement/variety value retailer (newly listed); **MAPA** (`IDX:MAPA`, 16.5T, β 0.37) — MAP Aktif, the active/sports-lifestyle franchise sleeve of MAP; **ACES** (`IDX:ACES`, 6.0T, β 0.14) — Aspirasi Hidup Indonesia (Ace Hardware + Informa) home-improvement/durables; **ERAA** (`IDX:ERAA`, 5.8T, β 0.43) — Erajaya: phones/gadget distribution + retail (USD-imported handsets); **BOGA** (4.8T) — F&B franchise (Boga Group); **MPMX** (4.4T, β 0.21) — Mitra Pinasthika, auto/2-wheeler retail+financing; **IMAS** (3.6T) — Indomobil auto dealer/distribution; **RALS** (`IDX:RALS`, 2.4T, β 0.49) — Ramayana: lower-mid department store, **Lebaran-driven**; **LPPF** (`IDX:LPPF`, 1.9T, β −0.03) — Matahari Department Store, mid-market apparel/fashion; **ERAL** (1.5T) — Erajaya digital/lifestyle sleeve; **CSAP** (1.5T) — Catur Sentosa, building-materials + consumer distribution; **MPMX/SONA/CARS** auto & travel-retail; plus a long penny tail (ZATA, BABY, UFOE, ZONE, ECII, SLIS, GLOB, TOOL, YELO, KLIN, BAUT, TELE, MKNT, TRIO). |
| Effective concentration | **MAPI + MDIY + MAPA + ACES + ERAA ≈ 73% of mcap.** The basket is, in practice, a **MAP-complex (fashion/F&B/sport franchise) + hardware/durables (ACES/MDIY/CSAP) + gadget-retail (ERAA/ERAL)** composite. Department stores (RALS, LPPF) are now small-cap and add a distinct lower-income/festive leg. LPPF carries a **negative β (−0.03)** and several tail names have erratic betas (ZATA 3.04, SONA 1.22, ZONE −0.30, KLIN −0.56) → low cross-member coherence; the equal-weight engine basket is a *discretionary-consumption-beta* composite, not a single clean business. |
| Current grade | **needs_review** |
| Current kept-driver count | **1** (`_state.txt` line 21) — the engine currently anchors on essentially a *single* surviving driver; the seed's four-driver macro spine mostly fails the significance/theory-reconciliation gates. |
| Current forward OOS | **NONE — fwd IC −0.067**, contemp IC **−0.14**, hit−up **−0.07**, placebo pctile **0.27**, n_oos 129 (BACKTEST.md line 65). **Anti-predictive** (negative IC, below placebo median). Note the *contemporaneous* IC is **also negative (−0.14)** — so the current thin map barely explains co-movement either. BACKTEST.md §"pattern" explicitly files Retail in the **"diversified/sentiment baskets show NO forward skill — mean-revert"** cluster alongside Auto, Media, Internet, Investment. |

**Current seed (`mapping.py` → `SEED["Retail"]`):**
```python
"Retail": {
    "ceic": [("Consumer Discretionary", "Auto Sales"),
             ("Consumer Discretionary", None)],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "discretionary spend"),
              ("id_cpi_yoy", "demand", -1, "real income squeeze"),
              ("id_bank_credit", "demand", +1, "consumer credit"),
              ("usdidr", "macro", -1, "imported merchandise cost")],
}
```

**The gap (three problems).**
1. **The CEIC pull is mis-pointed.** `("Consumer Discretionary","Auto Sales")` + `("Consumer Discretionary", None)` rakes in **~80 auto wholesale/production unit prints** (Toyota/Honda/Daihatsu/by-cc/by-tonnage — see worklist `ceic_candidates`, 96 series, the vast majority Auto Sales/Production). **Auto sales describe the *Auto* basket (#50), not specialty/department/gadget retail.** Only ~2 members (MPMX, IMAS) are auto-retail; for MAPI/MDIY/ACES/RALS/LPPF/ERAA the auto prints are noise. The genuine retail-demand block — the **BI Retail-Sales Survey** (Real Retail Sales Index + clothing/household/recreation sub-indices, monthly, n=196) and the **Consumer-Surveys** confidence/intent series — **is in the *macro* (`id`) inventory, not in the Consumer Discretionary *industry* block**, so the current `ceic` pull cannot reach it. This is the core wiring error.
2. **No forward-intent branch.** The seed uses coincident `id_gdp_real_q` (quarterly, coarse), `id_cpi_yoy`, `id_bank_credit`, `usdidr` — all real but coincident/lagging. It omits the **only series with genuine lead potential**: the forward-looking survey intent (durable-goods buying condition, expected income, household spend-vs-save allocation) and the monthly retail-sales-expectation print.
3. **No financing/rate branch despite the brief.** Discretionary retail (gadgets on installment, durables, dept-store credit) is **rate/credit-elastic**, yet the seed has **no `id_bi_rate`/`id_10y`** and only a coarse `id_bank_credit`. The rate complex is the most *leading* (daily, exogenous) channel available and is missing.

This file rebuilds the tree as: a **real-retail-sales + confidence/intent demand spine** (mostly attribution), a thin **USD-COGS + rate-financing cost/macro branch** (the leading prices), an explicit **festive-seasonality note**, and an honest forecastability concession.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (specialty / department / gadget retailer):**
```
Revenue        = Σ_store (Sales per store)  =  Store count × ASP × Transactions per store
               ≈  Store count × SSSG-grown base   (SSSG = same-store-sales growth, the analyst's north star)
Gross profit   = Revenue × gross margin            (margin = 1 − COGS/Revenue; COGS = merchandise, much USD-imported)
EBIT           = Gross profit − rent − staff − utilities − marketing  (a HIGH-operating-leverage cost base)
Net income     = EBIT − interest (financing/leases) − tax
Equity value   ≈ PV(SSSG trajectory × store-expansion pipeline × margin) at a consumer-discretionary WACC
```

Six structural facts drive the modelling:

1. **SSSG × store count is the whole game, and SSSG is the swing.** Sell-side prices these names almost entirely off **same-store-sales growth** (footfall × conversion × basket size) and the **net-new-store pipeline**. SSSG is *sentiment-and-income-driven* and **mean-reverts** around the consumption cycle — which is exactly why the *equity* mean-reverts and why coincident demand prints fail to forecast it.

2. **High operating leverage → margin amplifies the demand swing.** Rent, staff and utilities are largely fixed; a few points of SSSG flow disproportionately to EBIT (positive operating leverage on the way up, brutal on the way down). This makes the basket **more cyclical than the underlying consumption** — small confidence/income moves produce large earnings moves, amplifying both the co-movement and the reversion.

3. **Rate- and credit-elastic demand.** Big-ticket discretionary (ACES/MDIY home-improvement durables, ERAA phones on installment, dept-store store-cards, auto-retail at MPMX/IMAS) is **financed**. Falling BI rate / cheaper consumer credit pulls demand forward; rising rates choke it. Financing cost is also a direct P&L line (leases, working-capital). **The rate complex is the most *leading* (daily, exogenous) driver in the tree.**

4. **Imported-merchandise USD cost is the margin lever.** Fashion (Zara/MAP brands), gadgets (ERAA handsets ~all imported), hardware (ACES/Informa SKUs) and electronics are **USD-priced COGS**. A weaker IDR raises landed cost and squeezes gross margin unless passed through (which dents volume). **USD/IDR is the cleanest leading *cost* price.** Sign is **−1** on the basket (weak IDR = margin/volume headwind) — note this is the *opposite* sign to an exporter and is the dominant FX channel here.

5. **Festive seasonality is a first-order revenue driver — and it is a calendar, not a price.** Ramadan/Lebaran (and to a lesser degree Christmas/New-Year and back-to-school) concentrate a disproportionate share of annual sales, especially for **lower-mid department stores (RALS, LPPF)** and apparel. THR (the mandatory religious-holiday bonus) is a genuine income pulse. **This is real and large but it is seasonal/calendar-driven**, so it is captured by *seasonal adjustment / YoY differencing*, not by a macro driver series — a structural reason a generic macro engine under-explains the basket month-to-month.

6. **Intra-basket dispersion is high.** MAP-complex (MAPI/MAPA) = aspirational mid-upper fashion/F&B/sport, USD-COGS-heavy, urban; ACES/MDIY/CSAP = home-improvement/durables, more rate-elastic; ERAA/ERAL = gadget distribution, thinnest-margin + most USD-exposed + tech-cycle-linked; RALS/LPPF = lower-income, most festive-/THR-elastic, structurally challenged by e-commerce. A single macro posture cannot fit all four legs — another cap on coherence.

**What a sell-side analyst actually watches:** monthly/quarterly **SSSG** per name, **store-count net adds** and expansion capex, **gross margin** (USD-COGS pass-through), **BI Retail-Sales Survey** (Real RSI + sub-indices), **Consumer Confidence** (esp. durable-goods buying condition + expected income), **THR/Lebaran timing and strength**, **consumer-loan growth + lending rate**, **USD/IDR**, and footfall/e-commerce-cannibalisation trends. Of these, only **USD/IDR and the rate curve are high-frequency leading prices**; the survey/sales/loan series are monthly, publication-lagged and coincident.

---

## 3. DEMAND driver tree

> Demand = real household discretionary spend routed through stores = `income × confidence × credit ×
> festive-calendar`. In our data the headline reads are the **BI Retail-Sales Survey** (monthly real RSI +
> category sub-indices, n=196) and the **Consumer-Surveys** confidence/intent block (n=196). These are
> high-frequency *by publication* but economically **coincident-to-lagging** for the *level* series, with a
> small set of genuinely **forward-looking *intent*** series buried inside the survey block — those are the
> only demand leaves with real lead potential. ⚠ All of these live in the **`id` macro inventory**, NOT in the
> Consumer Discretionary *industry* block, so the current `("Consumer Discretionary", …)` CEIC pull cannot
> reach them — they must be wired as `macro`/`global` keys or via a dedicated CEIC pull (see §7/§9).

```
DEMAND (spend = income × confidence × credit × festive)
├── D1 RETAIL-SALES ACTIVITY (the direct read — coincident) ─► real retail volume
│     ├─ Real Retail Sales Index ········ CEIC322851702 [dem, 2010=100, P1M, n=196]  sign +1, lag ~0 (coincident) ★headline retail pulse
│     ├─ RSI: Other Goods of which: Clothing  CEIC293015904 [dem, 2010=100, P1M, n=180] sign +1, lag ~0 ★apparel/fashion (MAPI/LPPF/RALS) read
│     ├─ RSI: Other Household Equipment ·· CEIC322852202 [dem, 2010=100, P1M, n=196]  sign +1 (durables/home-improvement = ACES/MDIY/CSAP)
│     ├─ RSI: Cultural & Recreation Goods  CEIC322852302 [dem, 2010=100, P1M, n=196]  sign +1 (discretionary leisure spend)
│     ├─ RSI: Information & Comm Equipment CEIC322852102 [dem, 2010=100, P1M, n=196]  sign +1 (gadgets/phones = ERAA/ERAL)
│     └─ (id_retail resolver) ··········· aIDRSLSAR "Retail Sales Chg Y/Y" [dem, %, P1M] sign +1 — the seed's coarse YoY proxy for the above
│        ⚠ caveat: these are SURVEY *level* indices, publication-lagged ~5-6 wks, and co-linear with each other → attribution, weak forecast.
├── D2 CONSUMER CONFIDENCE — present situation (coincident sentiment) ─► willingness to spend
│     ├─ Consumer Confidence Index ······ aIDCONIAR (→ CEIC277372502) [dem, Point, P1M, n=196]  sign +1, lag ~0-1 ★current seed-adjacent; headline CCI
│     └─ CCI: Present: Buying Condition for Durable Goods  CEIC277372902 [dem, Point, P1M, n=196] sign +1 ★the big-ticket (ACES/MDIY/ERAA) read
├── D3 CONSUMER CONFIDENCE — EXPECTATIONS / INTENT (the FORWARD leaves — the only real lead) ★
│     ├─ CCI: Expectations: 6M Ahead: Expected Income  CEIC277373102 [dem, Point, P1M, n=196] sign +1, lag ~1-3 ★forward income intent
│     ├─ HH Expense Allocation: Consumption  CEIC373675837 [dem, %, P1M, n=168] sign +1, lag ~1-2 ★share of budget households PLAN to spend (vs save)
│     ├─ HH Expense Allocation: Savings ··· CEIC373675857 [dem, %, P1M, n=168]  sign −1 (rising savings intent = deferred discretionary spend)
│     ├─ HH Expense Allocation: Loan Repay  CEIC373675847 [dem, %, P1M, n=168]  sign −1 (debt-service crowding out discretionary spend)
│     └─ Retailer Expectation: Sales Next 3M  CEIC322852502 [dem, %, P1M, n=195] sign +1, lag ~1-3 ★retailers' own forward sales expectation
│        mechanism: D3 are EX-ANTE intent — they describe what households/retailers PLAN, so they lead realised SSSG by 1-3 months. This is the
│        only branch with a credible forward claim; everything else is a level/activity print that confirms, not leads.
├── D4 REAL INCOME / PURCHASING POWER (the budget constraint) ─► wages vs inflation
│     ├─ CPI YoY ····················· id_cpi_yoy → ECONOMICS:IDIRYY [dem(-), %, P1M]  sign −1 (current seed; food/energy inflation squeezes discretionary)
│     ├─ Avg Monthly Net Wage (DKI Jakarta) CEIC299173502 [dem, IDR, P1Y, n=37] sign +1 — real-wage level (ANNUAL → too slow to wire; structural note)
│     └─ HH Consumption Expenditure (GDP) CEIC365749347 [dem, IDR bn, P3M, n=65] sign +1 — quarterly final-consumption (coarse backdrop, ≈ id_gdp_real_q)
├── D5 CONSUMER CREDIT (financed big-ticket demand) ─► loan availability/growth
│     ├─ System bank credit YoY ········ id_bank_credit → aIDLONYAR [dem, %, P1M]  sign +1 (current seed; broad credit impulse)
│     ├─ Loans: Household Consumption ··· CEIC389692077 [dem, IDR bn, P1M, n=119]  sign +1 (total HH consumption credit)
│     ├─ Loans: HH Consumption: Vehicles  CEIC389692117 [dem, IDR bn, P1M, n=119]  sign +1 (auto-retail leg MPMX/IMAS; vehicle financing)
│     ├─ Loans: HH Consumption: Others ·· CEIC389692127 [dem, IDR bn, P1M, n=119]  sign +1 (non-housing/non-vehicle = durables/gadgets installment)
│     └─ Credit: Consumption (Comm Banks) CEIC230931602 [dem, IDR bn, P1M, n=279]  sign +1 (longer-history consumption-credit level)
└── D6 FESTIVE / SEASONAL DEMAND (Ramadan/Lebaran/THR — first-order, but a CALENDAR) ★
      └─ (no driver series) — the Lebaran/THR bonus pulse and Ramadan trading peak are the single largest intra-year
         revenue swing (esp. RALS/LPPF). They are CALENDAR effects captured by seasonal-adjustment / YoY differencing,
         NOT by a macro series → document as structural. A weak proxy is the spike pattern in D1 (RSI) and D5
         (consumption-loan drawdown) around Q1-Q2; but festive strength (THR size, timing shift of the lunar calendar)
         cannot be wired. This is a key reason a macro engine under-explains the month-to-month basket.
```

**Forecast hypothesis (demand): mostly attribution; the one real hope is the D3 intent branch.**
D1 (retail-sales index) and D2 (present-situation CCI) are **coincident-to-lagging level prints** that confirm the
trend but do not lead next month's excess return — and because they are **survey levels that drift with the
consumption cycle while the equity has already moved on SSSG sentiment**, loading on them tends to mean-revert
against returns OOS (the mechanical recipe for the −0.07 forward IC). D4/D5 are real but coarse/coincident. **The
only branch with a credible forward claim is D3 — the *ex-ante intent* series** (expected income, household
spend-vs-save allocation, retailer 3-month sales expectation): these describe what households/retailers *plan*,
so they lead realised SSSG by 1–3 months. Even so the lead is short and noisy. **Net: anchor demand on D3 (intent,
forecast candidate) + 1–2 D1 prints (attribution); demote the rest to attribution and do NOT let the co-linear
level/quantity tree dominate the fit.**

---

## 4. SUPPLY / COST driver tree

> A retailer has no physical "supply"; its cost stack is **merchandise COGS (much USD-imported), rent, labour,
> utilities, and financing.** The only branch with a clean exogenous *leading price* is the **USD-COGS / FX**
> channel — which is also the basket's main margin lever. Rent/labour/utilities have no clean leading series and
> are captured loosely by CPI; financing is the rate branch (§5). This is itself a finding: the cost side that
> *moves* the equity (FX margin shock + financing) is a price/rate branch, not a commodity input.

```
SUPPLY / COST (merchandise + rent + labour + financing)
├── C1 IMPORTED MERCHANDISE COGS — the margin lever (THE leading cost price) ★
│     └─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1, lag ~0-1  ★weak IDR raises landed COGS for fashion/gadgets/hardware
│        mechanism: MAP brands, ERAA handsets, ACES/Informa SKUs are USD-priced. ↑USD/IDR → ↑COGS → gross-margin squeeze (or pass-through that
│        dents volume). Daily, exogenous, LEADS the margin print → the cleanest leading cost driver. Sign is −1 on the basket (importer, not exporter).
├── C2 BROAD-USD / EM-IMPORT-COST PARENT (the parent of C1) ─► global dollar regime
│     └─ dxy ························· dxy → TVC:DXY [P1D, wk=800]  sign −1  (strong USD → IDR pressure → import-cost + EM-risk-off outflow)
│        ⚠ resolver bug: GLOBAL_CORR maps dxy→TVC:BBDXY which is EMPTY (wk=0). Use TVC:DXY (wk=800). See §7/§9.
├── C3 GENERAL COST INFLATION (rent / labour / utilities) ─► fixed-cost base
│     ├─ CPI YoY ···················· id_cpi_yoy → ECONOMICS:IDIRYY [%, P1M]  sign −1 (dual role: squeezes real income AND raises operating cost)
│     └─ Minimum Wage: Average ······· CEIC303317302 [cost, IDR th, P1Y, n=36] sign −1 — staff-cost floor (ANNUAL → structural note only, too slow to wire)
├── C4 FINANCING COST (working-capital + leases + store-expansion capex) ─► cost of debt
│     └─ (see §5 rate branch) — BI rate / id_10y. Retailers carry working-capital + lease debt; financing cost is BOTH a demand lever (C-credit) and a
│        direct P&L line. Captured in §5 to avoid double-count.
└── C5 GADGET / TECH PRODUCT CYCLE (ERAA-specific input/sell-through) ─► handset supply
      └─ (no clean series) — ERAA/ERAL sell-through depends on the global smartphone replacement cycle (Apple/Samsung launches), un-wireable from
         macro data; idiosyncratic. Note only.
```

**Forecast hypothesis (supply/cost): the cost side that matters is FX + financing — both leading prices.**
Unlike a commodity producer, this basket's decisive cost is **USD-imported merchandise (C1) + financing (C4)**,
both of which are **liquid, exogenous, daily, and lead** the margin/earnings print. `USD/IDR` (−1) is the single
cleanest leading cost driver and the brief's "USD imported merchandise" channel. The fixed-cost base (rent/labour,
C3) has only slow annual proxies and is immaterial vs FX at the monthly horizon. **Net cost forecast candidate:
`usdidr` (−1), with `dxy` (−1) as its parent and the rate branch (§5) as financing.**

---

## 5. MACRO / RATE / FX / FLOW

> For a rate-and-credit-elastic discretionary basket, the systematic core is the **financing-rate complex +
> USD/IDR + the broad consumption/discount backdrop.** The rate and FX series are the only *liquid, daily,
> leading* drivers in the whole tree; the consumption backdrop (GDP/CPI/credit) is coincident. The rate channel
> is the natural lead-parent of the slow credit/SSSG chain (rate → consumer-loan growth → financed big-ticket
> demand → SSSG → earnings → price).

```
MACRO / RATE / FX / FLOW
├── M1 FINANCING RATE — policy + curve (rate-elastic big-ticket demand + cost of debt) ★
│     ├─ BI policy rate ············· id_bi_rate → ECONOMICS:IDINTR [P1M, wk=186]  sign −1, lag ~1-3  ★cheaper credit pulls discretionary demand forward
│     │     (cleaner monthly CEIC alts exist: "Policy Rate: 7D Reverse Repo" CEIC..n=132; aIDRREP7DR. ECONOMICS:IDINTR resolves but is short-history.)
│     ├─ Lending Rate: Consumption ··· CEIC14419701 [macro, % pa, P1M, n=304]  sign −1 ★the ACTUAL consumer-loan rate (transmission of policy → demand)
│     ├─ ID 10Y yield ··············· id_10y → TVC:ID10Y [P1D, wk=798]  sign −1, lag ~0-1 ★daily duration/financing proxy; LEADS the slow loan print
│     └─ ID 1Y yield ················ id_01y → TVC:ID01Y [P1D, wk=793]  sign −1 (front-end financing cost)
│        mechanism: discretionary big-ticket (durables/gadgets/auto-retail) is bought on installment; ↓rates → cheaper financing → demand pull-forward
│        AND lower retailer working-capital/lease cost. The DAILY yields lead the MONTHLY loan-growth and quarterly SSSG → the engine's best lead chain.
├── M2 FX — imported COGS + EM-risk (dual role with C1) ─► IDR level
│     └─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1 (import-cost margin squeeze + foreign-flow risk-off on consumer cyclicals)
├── M3 BROAD-USD / EM-FLOW ─► global dollar regime
│     └─ dxy ························· dxy → TVC:DXY [P1D, wk=800]  sign −1 (strong USD → IDR weakness + EM equity outflow; consumer-cyclicals are mid-beta)
│        ⚠ same TVC:BBDXY→TVC:DXY resolver bug as above.
└── M4 CONSUMPTION / DISCOUNT BACKDROP (coincident) ─► domestic demand cycle
      ├─ Real GDP YoY ··············· id_gdp_real_q → aIDGDPAR1 [P3M]  sign +1 (current seed; coarse, quarterly — broad consumption backdrop)
      └─ Broad money M2 YoY ········· id_m2 → aIDM2AR [%, P1M]  sign +1 (liquidity → nominal spend; secondary)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
BI rate / Fed-IDR pressure  ──►  id_10y + lending rate + USD/IDR  ──►  consumer-loan growth + import COGS  ──►  financed SSSG + margin  ──►  basket
   (policy, monthly)              (market, daily, LEADS)               (CEIC, monthly, lagged)               (quarterly earnings)        (the equities)
```
The engine should lean on the **leading parents (daily yields + USD/IDR)** to anticipate the slow loan/SSSG child —
the same "liquid price leads the equity" pattern IMPROVEMENT_PLAN §3 rewards. The difference vs a *forecastable*
basket (Coal, Pharma) is that here the leading prices move *financing cost and import margin*, but the equity is
ultimately governed by **SSSG sentiment that mean-reverts** — so the co-movement is real but the forward edge is
fragile and regime-dependent (skill in rate-shock / FX-shock regimes, none in mean-reverting consumption chop).

**Forecast hypothesis (macro): this is where forecastability lives, IF anywhere — but it is thin.**
`id_10y`/lending-rate (−1) and `usdidr` (−1) are the best forward candidates: liquid, exogenous, daily/monthly, and
they *do* lead the financing-and-margin channel. `id_bi_rate` (−1) and `dxy` (−1) reinforce. **But** the channel
prices *financing and import-cost on a sentiment-driven SSSG asset*; when consumption confidence mean-reverts, the
basket reverts with it regardless of where rates sit — which is exactly how a contemporaneously-correct map produces
a *negative forward* IC. So even the strong branch is best read as **contemporaneous risk/financing-posture
attribution**, with only a marginal, regime-dependent forward claim.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Banking / consumer credit** (#1 Banks) | `Loans: HH Consumption` CEIC389692077, `…Vehicles` CEIC389692117, `…Others` CEIC389692127 (all n=119); `Lending Rate: Consumption` CEIC14419701 (n=304) | demand/cost +1 / −1 | Borrow the **consumer-credit block** from the Banking macro category as the financed-demand proxy + the actual consumer lending rate. Same series the Banks/Multifinance maps use; here they are an *input* (credit availability → big-ticket retail demand), not bank revenue. |
| **Apparel** (#31) | `cotton` ICE:CT1!; `brent` (polyester) | cost −1 | The MAP-complex + LPPF/RALS sell apparel; cotton/synthetic input feeds private-label COGS. Weak, second-order vs USD/IDR (most merchandise is imported finished goods, not made from raw fibre) — note, do not over-weight. |
| **Auto** (#50) / **Multifinance** (#30) | `Auto Sales` CEIC pulls (worklist); `Loans: HH Consumption: Vehicles` CEIC389692117 | demand +1 | Only the **MPMX/IMAS auto-retail leg** (~2 of 29 names) genuinely links to vehicle sales/financing. The current seed's full Auto-Sales CEIC pull mis-applies this to the whole basket → demote to a vehicle-financing proxy only. |
| **Technology / Internet** (#15) | `E-Commerce Value` CEICI517698487 (n=2385) | demand −1 (cannibalisation) | E-commerce growth is a **structural headwind** for physical department stores (LPPF/RALS in particular). A rising e-commerce GMV trend coincides with dept-store de-rating. Optional contrarian read; sign is −1 here (substitution), opposite to the Internet basket. |
| **Staple Retail** (#51) | `Food Retail Prices` CEIC (Consumer Staples block) | demand — | The brief's "Consumer Staples (Food Retail Prices)" block belongs to the **grocery/MIDI/AMRT-adjacent** staple leg (#51, which already has OOS skill +0.12). For *discretionary* retail it is only a weak real-spend/footfall proxy (food-price inflation crowds out discretionary). Borrow as a real-income squeeze proxy, low weight. |
| **Consumption / macro backdrop** | `id_gdp_real_q` aIDGDPAR1; `HH Consumption Expenditure` CEIC365749347 (n=65) | demand +1 | Quarterly final-consumption backdrop — coarse but the broad cyclical anchor. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC pull (mis-pointed)** | `("Consumer Discretionary","Auto Sales")` + `("Consumer Discretionary", None)` → ~80 auto unit prints | **RE-POINT**: the auto prints describe the *Auto* basket, not specialty/dept/gadget retail. Either drop the Auto-Sales sub and add the **Retail-Sales-Survey + Consumer-Surveys** reads via macro keys, or `ceic_override` the auto noise down to a vehicle-financing proxy. | **P0 — the core wiring error** |
| **Retail-sales activity** | none reachable (the RSI lives in `id` macro, not the CEIC industry block) | **Real Retail Sales Index** CEIC322851702 (+1); clothing CEIC293015904 (+1); household-equipment CEIC322852202 (+1); ICT CEIC322852102 (+1) — wire via a CEIC pull on the `id` Retail-Sales category or as `id_retail` aIDRSLSAR | **P0 — the direct demand read is currently unreachable** |
| **Forward intent (the only lead)** | none | **Expected Income** CEIC277373102 (+1); **HH Expense Allocation: Consumption** CEIC373675837 (+1) / **Savings** CEIC373675857 (−1) / **Loan Repay** CEIC373675847 (−1); **Retailer Sales Expectation 3M** CEIC322852502 (+1) | **P0 — the only forecast-candidate branch** |
| Confidence (present) | none explicit | `id_consumer_confidence` aIDCONIAR (+1); **Durable-Goods Buying Condition** CEIC277372902 (+1) | **P1** |
| **Financing rate** | **none** (seed has no rate driver) | **`id_bi_rate`** ECONOMICS:IDINTR (−1); **`id_10y`** TVC:ID10Y (−1, daily, leading); **Consumption Lending Rate** CEIC14419701 (−1) | **P0 — the leading channel, entirely missing** |
| Imported-COGS FX | `usdidr` −1 ✓ (kept) | — (correctly wired) | P0 — keep |
| Broad-USD / flow | none | **`dxy` −1** (after resolver fix) | P1 |
| Consumer credit | `id_bank_credit` aIDLONYAR +1 | add `Loans: HH Consumption` CEIC389692077 (+1) + `…Vehicles` CEIC389692117 (+1) for the financed/auto-retail legs | P2 |
| Real-income squeeze | `id_cpi_yoy` −1 ✓ | keep; add `id_gdp_real_q` +1 (already in seed) | keep |
| Festive seasonality | none | **no wireable series** — calendar effect; document as structural | n/a |
| Real wages | none | `Avg Net Wage`/`Min Wage` are **ANNUAL (n=36-37)** → too slow to wire; structural note only | n/a |
| E-commerce cannibalisation | none | optional contrarian `E-Commerce Value` CEICI517698487 (−1) for dept-store leg | P3 (test) |

**Two concrete problems with the current pulls:** (a) the **CEIC categories are mis-pointed** — `Auto Sales` +
`Consumer Discretionary (all)` deliver ~80 **auto** unit prints (Toyota/Honda/by-cc/by-tonnage) that describe the
*Auto* basket, while the genuine retail-demand reads (BI Retail-Sales Survey + Consumer Surveys) sit in the **`id`
macro inventory and are unreachable from this pull**. The fix is to re-point to the macro retail/confidence/intent
series and demote auto to a vehicle-financing proxy. (b) **Resolver bug:** `dxy → TVC:BBDXY` is empty (wk=0); use
**`TVC:DXY`** (wk=800) — same bug noted in the Internet/Telco files. Also note `id_bi_rate → ECONOMICS:IDINTR`
resolves but is **short-history (wk=186)** vs the daily `id_10y` (wk=798) — prefer the daily yields as the leading
rate read and keep BI rate as the policy-regime cross-check.

---

## 8. Forecastability verdict

**The basket is an attribution / consumption-beta basket — anti-predictive forward. The map explains
co-movement (when correctly re-pointed) but does NOT forecast. The only systematic, leading branches are the
rate complex (`id_10y`/lending rate −1) and `usdidr`/`dxy` (−1, imported-COGS margin), plus the thin
forward-intent survey branch (D3) — and even those are contemporaneous/short-lead, not a fundamental edge.**
Reasoning:

- **Why nothing forecasts:** the equity is governed by **SSSG sentiment + festive timing + idiosyncratic
  store-expansion / e-commerce-disruption news**, amplified by **high operating leverage** — a *sentiment-and-
  calendar* asset that **mean-reverts**. The fundamentals we *can* observe (retail-sales index, present-situation
  CCI, consumption loans, GDP) are **coincident-to-lagging survey/quantity prints** that drift with the consumption
  cycle while the equity has already re-priced the forward SSSG — so loading on them produces a posture that
  mean-reverts *against* returns out of sample. That is the textbook profile of a negative forward IC, and it matches
  BACKTEST.md: fwd −0.07, contemp **−0.14** (anti-predictive even contemporaneously in this window, with kept=1),
  placebo pctile 0.27, n_oos 129 — filed in the "diversified/sentiment baskets mean-revert" cluster.

- **Why the rate/FX/intent branches are the best (but still thin) hope:** `id_10y`/lending-rate and `usdidr`/`dxy`
  are liquid, exogenous, daily, and they *do* lead the **financing-cost and import-margin** channel — the right
  instruments for a rate-and-credit-elastic, import-COGS-heavy retailer. The **D3 forward-intent survey series**
  (expected income, household spend-vs-save allocation, retailer 3-month sales expectation) are *ex-ante* and lead
  realised SSSG by 1–3 months — the only genuinely forward demand leaves. A *thinner, rate+FX+intent* posture
  (after killing the mis-pointed auto pull and the co-linear retail-level over-fit) should at minimum **stop being
  anti-predictive** and may recover a small **regime-conditional** edge (skill in rate-shock / FX-shock regimes,
  none in mean-reverting consumption chop). But because the channel ultimately rides a *sentiment-driven SSSG*, its
  forward IC will flip whenever consumption confidence mean-reverts — so the realistic ceiling is **weak/marginal at best.**

- **Honest concession (structure):** (1) **festive/Lebaran/THR** — the single largest revenue swing — is a *calendar*
  effect captured by seasonal differencing, not a macro driver, so a macro engine structurally under-explains the
  month-to-month basket. (2) The basket **staples four distinct retail models** (MAP fashion/F&B franchise; ACES/MDIY
  hardware-durables; ERAA gadget-distribution; RALS/LPPF lower-income dept stores) with **contradictory betas**
  (LPPF −0.03, ZONE −0.30, KLIN −0.56 vs ZATA 3.04, SONA 1.22) and low cross-member coherence — *not fixable in
  `mapping.py`* (membership is fixed upstream). Both must be stated, not engineered away.

**What would move it from anti-predictive → neutral/marginal:** (1) **re-point the CEIC pull** off Auto-Sales onto
the **BI Retail-Sales Survey + Consumer-Surveys** reads; (2) add the **rate complex** (`id_10y`/`id_bi_rate`/
consumption lending rate, −1) — the leading channel that is entirely missing; (3) add the **D3 forward-intent**
branch (expected income, spend-vs-save allocation, retailer expectation) as the only forecast candidate; (4) fix
the `dxy → TVC:DXY` resolver and add it (−1); (5) **demote the coincident retail-level + auto-quantity trees to
1–2 attribution prints** so the co-linear secular drift stops driving the fit. **Hypothesis: a thinner, rate+FX+
intent posture goes from −0.07 toward ~0 (stops being anti-predictive) and earns a small, honest, regime-conditional
edge. If forward IC stays ≤ 0 after the rewire, the correct verdict is to label Retail a *contemporaneous
consumption / financing-posture attribution* (a rate / USD-IDR / consumer-confidence beta on a festive-seasonal
discretionary basket), NOT a forecaster** — consistent with how BACKTEST.md treats the sentiment/diversified
cluster (Auto, Media, Internet, Investment).

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Retail"]`:**
```python
"Retail": {  # ~73% MAPI+MDIY+MAPA+ACES+ERAA: specialty/dept/gadget discretionary retail.
    # Revenue = SSSG × store count; rate/credit-elastic + festive(Ramadan/Lebaran)-seasonal;
    # USD-imported merchandise COGS. The basket is a sentiment-driven SSSG asset that
    # MEAN-REVERTS -> anti-predictive forward. Re-point the CEIC pull off Auto-Sales (which
    # describes the Auto basket, not specialty retail) onto the real retail/confidence reads,
    # add the leading RATE complex (entirely missing today) + the forward-INTENT survey branch,
    # and keep the rest for ATTRIBUTION ONLY. The full Auto-Sales sub is ~80 co-linear unit
    # prints that over-fit in-sample and mean-revert OOS (a cause of the -0.07 forward IC).
    "ceic": [("Consumer Discretionary", None),     # keep for the auto-retail (MPMX/IMAS) leg ONLY
             ("Retail Sales", None),               # ★ the BI Retail-Sales Survey (real RSI + sub-indices) — the direct demand read
             ("Consumer Surveys", None)],          # ★ confidence + forward-intent (expected income, spend-vs-save allocation)
    # demote the co-linear auto-unit quantity tree to a vehicle-financing-demand proxy; the
    # specialty/dept/gadget legs are NOT auto-sales-driven.
    "ceic_override": [("real retail sales index",            "demand", +1),   # headline retail pulse
                      ("retail sales index: other goods of which: clothing", "demand", +1),  # apparel (MAPI/LPPF/RALS)
                      ("expectations: 6 months ahead: expected income",      "demand", +1),  # ★ forward income intent
                      ("household expense allocation: consumption",          "demand", +1),  # ★ planned spend share
                      ("household expense allocation: savings",              "demand", -1),  # deferred-spend intent
                      ("retailer expectation: sales",                        "demand", +1)], # ★ retailer 3M sales expectation
    # drop the auto-quantity / endogenous co-linear noise that mis-applies the Auto basket to retail.
    "ceic_exclude": ["wholesale", "wholesales", "motor vehicle production",
                     "auto production", "4x2 type", "4x4 type", "pick up",
                     "to be", "below 1500", "1500 to 3000", "over 3000"],
    "globals": [
        ("usdidr", "macro", -1, "weak IDR raises USD-imported merchandise COGS -> margin squeeze (importer, not exporter)"),
        ("dxy",    "macro", -1, "broad USD -> IDR pressure + EM equity outflow on consumer cyclicals"),
    ],
    "macro": [
        # ── the leading systematic spine: RATE complex + FX (entirely missing today) ──
        ("id_10y",       "macro",  -1, "PRIMARY rate read: daily duration/financing proxy; LEADS the slow consumer-loan/SSSG chain"),
        ("id_bi_rate",   "macro",  -1, "policy rate: big-ticket discretionary is financed/rate-elastic (regime cross-check; short-history)"),
        # ── demand backdrop (attribution; coincident) ──
        ("id_bank_credit", "demand", +1, "consumer-credit impulse -> financed big-ticket demand"),
        ("id_consumer_confidence", "demand", +1, "monthly spend-willingness pulse (present-situation CCI)"),
        ("id_retail",      "demand", +1, "real retail-sales YoY (coarse activity proxy; coincident)"),
        ("id_cpi_yoy",     "demand", -1, "food/energy inflation squeezes real discretionary income AND raises opex"),
        ("id_gdp_real_q",  "demand", +1, "broad consumption backdrop (coarse, quarterly)"),
    ],
}
```

**Resolvers — what already works, and the one bug to fix.** `usdidr → FX_IDC:USDIDR` (wk=801), `id_10y →
TVC:ID10Y` (wk=798), `id_bi_rate → ECONOMICS:IDINTR` (wk=186, short), `id_bank_credit → aIDLONYAR`,
`id_consumer_confidence → aIDCONIAR`, `id_retail → aIDRSLSAR`, `id_cpi_yoy → ECONOMICS:IDIRYY`, `id_gdp_real_q →
aIDGDPAR1` are **all already mapped** — no new resolver required for the macro spine. **Fix the `dxy` resolver:**
`GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is empty (wk=0) — remap to **`"TVC:DXY"`** (wk=800) or the `dxy` global resolves
to nothing (same bug flagged in the Internet/Telco files). Optional cleaner rate read: the daily `id_10y`/`id_01y`
already lead better than the short `ECONOMICS:IDINTR`; if a monthly policy rate is wanted, the CEIC
`Policy Rate: Month End: 7 Days Reverse Repo Rate` (n=132) or `aIDRREP7DR` are longer than `IDINTR`.

> ⚠ Verify the exact CEIC category labels for `("Retail Sales", None)` and `("Consumer Surveys", None)` against the
> `id`-macro pull mechanism in `build_worklist.py` before committing — these categories live in the **macro (`id`)
> inventory**, and the current pull only reaches **industry (`idind`)** categories. If the worklist builder cannot
> pull macro categories as `ceic` candidates, wire the Retail-Sales / Consumer-Surveys reads through the
> **`macro`/`global` keyed path** instead (via `id_retail`/`id_consumer_confidence` resolvers above, plus new
> resolver keys for the forward-intent series if a dedicated leaf is desired). This is the single thing to confirm.

**What to backtest (`backtest/bt.py "Retail"`), keep only if forward IC improves/holds:**
1. **Re-point test (the big one):** current (Auto-Sales CEIC pull) vs proposed (Retail-Sales + Consumer-Surveys +
   auto demoted to vehicle-financing). **Hypothesis: removing the ~80 co-linear auto-unit prints that mis-apply the
   Auto basket lifts forward IC from −0.07 toward ≥ 0** by killing the mean-reverting over-fit. This is the single
   most important test.
2. **Rate-complex add:** confirm `id_10y` / `id_bi_rate` / consumption-lending-rate (−1) help or are neutral — they
   are the leading channel and are entirely absent today. Verify the empirical sign is **−** (rate-elastic). If it
   comes out +, the rate-elasticity thesis is broken for this window → downgrade to attribution.
3. **Forward-intent vs coincident-level:** A/B the **D3 intent branch** (expected income / spend-vs-save allocation /
   retailer expectation) against the coincident retail-sales *level* prints. **Hypothesis: the ex-ante intent series
   carry the only positive forward IC; the level prints are attribution-only and may be anti-predictive.**
4. **FX sign sanity:** verify `usdidr` empirical sign is **−** (importer margin squeeze). Verify `dxy` resolves to
   `TVC:DXY` (non-empty) before trusting its load.
5. **Honesty gate:** if forward IC stays ≤ 0 after the re-point + rate + intent rewire, **label Retail a
   *contemporaneous consumption / financing-posture attribution* (a rate / USD-IDR / consumer-confidence beta on a
   festive-seasonal discretionary basket), NOT a forecaster** in the capsule — and note the **festive-calendar
   seasonality** and the **incoherent four-model membership** as the structural reasons macro cannot forecast it.
