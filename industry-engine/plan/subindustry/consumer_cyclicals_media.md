# Media (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_media` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #24). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: this basket is the *advertising-spend beta* of the Indonesian consumption cycle —
> free-to-air broadcasters (SCMA, MNCN), an MNC content/IP holding (MSIN), a cinema/content name (FILM),
> and a long tail of digital/OOH/print micro-caps — whose revenue is essentially `ad-inventory × ad-rate`,
> i.e. *ad-spend = f(GDP, retail sales, consumer/business confidence) − content cost*. Ad-spend is the most
> textbook PRO-CYCLICAL, GDP-elastic revenue line in the whole equity complex (advertising budgets are the
> first thing cut in a downturn and the first restored in an upturn, with a high income-elasticity ≈ 1.3–1.5×
> GDP). The honest problem: every series that measures the ad-spend driver (GDP, retail-sales index, consumer
> confidence) is a publication-lagged, COINCIDENT, mean-reverting *quantity/sentiment* print, and the equities
> themselves are a **low-coherence, high-idiosyncratic-beta** bag (MSIN β 0.60, FILM β −0.26, SCMA β 0.11,
> MDIA β 2.02, VIVA β 0.99, DOOH β −0.63) that trades on M&A/relisting/IP-deal news, not on a clean macro
> factor. BACKTEST.md files Media squarely in the *"diversified/sentiment baskets show NO forward skill —
> mean-revert"* cluster alongside Retail, Internet, Auto, Investment (fwd IC +0.015, contemp IC −0.11,
> placebo pctile 0.48, n_oos 129). The only genuine forward-edge candidates are the few *forward-intent*
> survey series (business/retail confidence expectations, expected income) and the leading *risk-appetite*
> prices (JCI, foreign flow, NDX for the digital sleeve, USD/IDR for content cost) — and even those are thin.
> Verdict: contemporaneous ad-spend / risk-appetite attribution, NOT a forecaster.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Media**, sector *Consumer Cyclicals*, id `consumer_cyclicals_media` |
| mcap | **~87T** (capsule #24; worklist total_mcap 86.9T), benchmark JCI |
| n_names | **18** real members |
| Top members (what each does) | **MSIN** (`IDX:MSIN`, 32.8T, β 0.60) — MNC Digital Entertainment: the MNC group's content/IP/digital-platform holding (RCTI+, Vision+, content library) — *by far the largest weight (~38% of basket mcap)*, a content/IP-and-streaming holding, NOT a pure ad-broadcaster; **FILM** (`IDX:FILM`, 22.4T, β −0.26) — MD Pictures/MD Entertainment: film & content production / IP, cinema-cycle and streaming-licensing driven, **carries a NEGATIVE β** (re-rated on IP/streaming-deal news, decoupled from the consumption cycle); **SCMA** (`IDX:SCMA`, 14.0T, β 0.11) — Surya Citra Media (Emtek): owner of **SCTV + Indosiar** free-to-air TV + Vidio streaming — the *cleanest ad-spend broadcaster* in the basket; **MDIA** (4.3T, β **2.02**) — Media Nusantara Citra adjacency / MNC-linked, *extreme high-beta micro-cap*; **NETV** (2.8T, β 0.75) — Net Visi Media (NET TV) FTA broadcaster; **MNCN** (`IDX:MNCN`, 2.7T, β 0.30) — Media Nusantara Citra: RCTI/MNCTV/GTV/iNews FTA-TV + content — the **other core ad-broadcaster** (note: trades small here despite being the largest Indonesian FTA group — float/holding structure); **IPTV** (1.5T, β 0.16) — MNC Vision Networks (pay-TV/IPTV); **RAAM** (1.4T, β 0.42) — Tripar/Raam Punjabi content; **FUTR** (1.2T, β 0.98) — Lini Imaji/digital; **DOOH** (1.1T, β **−0.63**) — Mediaqi / digital out-of-home (NEGATIVE β); **MSKY** (0.6T, β 0.05) — MNC Sky Vision pay-TV; **VIVA** (0.6T, β 0.99) — Visi Media Asia (antv/tvOne/viva.co.id); plus a print/digital micro-tail (**FORU** Fortune Indonesia ad-agency β 0.01, **VERN**, **MARI**, **ABBA**, **TMPO** Tempo print/media β 0.68, **DIGI**). |
| Effective concentration | **MSIN + FILM + SCMA ≈ 81% of mcap.** The basket is, in practice, an **MNC-content/IP holding (MSIN) + a film/IP producer (FILM) + one clean FTA-ad broadcaster (SCMA)**, with the *actual* ad-spend broadcasters that the brief targets (MNCN, NETV, VIVA, MDIA) sitting in the small/micro tail. This is a problem for the thesis: **the ad-spend cyclical story applies cleanly to SCMA/MNCN/NETV/VIVA (~21% of mcap), but the two dominant names (MSIN 38%, FILM 26%) are content/IP/streaming holdings that re-rate on deal/relisting/IP news and one of which (FILM) is outright anti-cyclical (β −0.26).** Cross-member beta dispersion is severe (DOOH −0.63, FILM −0.26, ABBA −0.24 vs MDIA 2.02, VIVA 0.99, FUTR 0.98) → the equal-weight engine basket is a *media-sentiment / event-driven* composite, not a single clean ad-spend factor. |
| Current grade | **partial** (`_state.txt` line 25) |
| Current kept-driver count | **10** (`_state.txt` line 25) — a relatively *high* kept count, but as shown below most are co-linear auto/textile/internet quantity prints raked in by the mis-pointed CEIC pull, not genuine media drivers. |
| Current forward OOS | **NONE — fwd IC +0.015** (essentially zero / placebo-level), contemp IC **−0.11**, placebo pctile **0.48** (≈ median — indistinguishable from random), n_oos 129 (BACKTEST.md line 53). The forward IC is a hair above zero but **statistically indistinguishable from the placebo median (0.48)** → no real forward skill. The *contemporaneous* IC is **negative (−0.11)** — so even the co-movement explanation is poor with the current map. BACKTEST.md §17 explicitly files Media in the **"diversified/sentiment baskets show NO forward skill — mean-revert"** cluster (with Retail, Internet, Auto, Mining-conglomerates), to be read as *contemporaneous attribution, NOT a forecast*. |

**Current seed (`mapping.py` → `SEED["Media"]`, lines 397–402):**
```python
"Media": {
    "ceic": [("Consumer Discretionary", None), ("Technology", None)],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "ad spend pro-cyclical"),
              ("id_bank_credit", "demand", +1, "consumer-demand proxy")],
},
```

**The gap (three problems).**
1. **The CEIC pull is badly mis-pointed — there is no media block, so it rakes in pure noise.** `("Consumer Discretionary", None)` + `("Technology", None)` pulls **182 candidate series** (worklist `n_ceic_candidates: 182`), of which the overwhelming majority are **auto production/sales unit prints** (Toyota/Honda/Daihatsu/by-cc/by-tonnage/Wuling/Hyundai EV — ~90 series, `sub: "Auto Production"` / `"Auto Sales"`), **textile & apparel volumes**, **telecom-subscriber counts**, **e-commerce transaction values**, and **internet browser-/social-media-share** series. **None of these describe broadcasters or ad-spend.** Critically, **there is NO "advertising", "broadcast", "television", "media", or "streaming" series anywhere in the CEIC `idind` industry inventory** (verified by grep) — Media has *no native industry block at all*. The current pull therefore loads the engine with ~90+ co-linear auto-unit prints that mis-apply the Auto/Internet baskets to Media and over-fit in-sample (a direct cause of the −0.11 contemporaneous IC and the placebo-level forward IC). This is the core wiring error.
2. **No ad-spend proxy branch is actually reachable.** The seed's intent (`id_gdp_real_q` "ad spend pro-cyclical") is right *in spirit*, but ad-spend's best high-frequency proxies — the **BI Retail-Sales Survey** (real RSI, monthly n=196), **Consumer Confidence** (n=196) and its **forward-expectation/intent** sub-indices, and the **Business/Retail-Trade Confidence Survey** (n=97) — **live in the `id` macro inventory, not in the Consumer Discretionary industry block**, so the current `ceic` pull cannot reach them. The seed reaches only coarse quarterly `id_gdp_real_q` + a mis-labelled `id_bank_credit` ("consumer-demand proxy" — credit growth is a weak ad-spend proxy).
3. **No risk-appetite / flow / FX branch despite a high-beta, event-driven, USD-content basket.** Media here is a **mid-to-high-β sentiment basket** (several β ~1–2) that moves with JCI risk-on/off and foreign flow; its largest digital names (MSIN, FILM) are **terminal-value/streaming** stories sensitive to global-tech sentiment (NDX) and the real discount rate; and **content is USD-priced** (licensed films/series, sports rights, set-top boxes → USD/IDR cost). The seed has **none** of JCI/foreign-flow/NDX/USD-IDR. The risk/flow/FX complex is the most *leading* (daily, exogenous) channel available and is entirely missing.

This file rebuilds the tree as: an **ad-spend demand spine** (GDP × retail-sales × confidence/intent — mostly attribution, with the *intent* sub-indices as the only forward leaves), a thin **content-cost (USD) + structural digital-shift cost branch**, a **risk-appetite / foreign-flow / NDX / USD-IDR macro branch** (the leading prices), an explicit **election-cycle and FTA→digital structural note**, and an honest forecastability concession.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (free-to-air broadcaster / content house):**
```
Revenue (broadcaster) = Ad inventory (spots × seconds × prime-time mix) × Ad rate (CPRP/rate-card × utilisation)
                      ≈ Audience share (rating) × Ad-spend pool × yield      (the ad-spend pool is the macro driver)
Revenue (content/IP)  = Theatrical box office + streaming-licensing fees + IP/library monetisation   (FILM, MSIN, RAAM)
Revenue (pay-TV/OOH)  = Subscribers × ARPU  (IPTV/MSKY)  +  OOH inventory × occupancy × rate  (DOOH)
Gross profit          = Revenue − content cost (programming/licensing, much USD) − production/transmission cost
EBIT                  = Gross profit − SG&A − marketing  (HIGH operating leverage: content cost is largely fixed/committed)
Net income            = EBIT − interest − tax
Equity value          ≈ PV(ad-spend-pool trajectory × audience share × yield × content-cost discipline) at a discretionary WACC
                        + (for MSIN/FILM) PV(streaming-subscriber ramp + IP-library option value) re-rated off global-tech sentiment
```

Six structural facts drive the modelling:

1. **Ad-spend is the whole game for the broadcasters, and it is intensely pro-cyclical.** SCMA/MNCN/NETV/VIVA earn ~85–95% of revenue from advertising. **Advertising is one of the most income-elastic spend lines in the economy** (income-elasticity ≈ 1.3–1.5×: ad budgets are discretionary, set as a % of advertiser revenue, and are the first cut in a downturn / first restored in an upturn). So broadcaster revenue is a **levered bet on nominal consumption (GDP × retail sales × FMCG advertiser health)**. This is the correct economic core — but it is also why the basket **co-moves with the consumption cycle contemporaneously and mean-reverts** rather than being forecastable.

2. **Content cost is the margin swing — and it is structurally rising + partly USD.** The cost stack is dominated by **programming/content**: licensed films/series, sports rights, locally-produced sinetron, and (for MSIN/IPTV/MSKY) streaming-content acquisition and set-top-box hardware. A large share is **USD-priced** (Hollywood licensing, sports rights, devices) → **USD/IDR is a direct margin lever**. Content cost is largely **fixed/committed ahead of the ad-cycle**, giving the broadcasters **high operating leverage** — a few points of ad-spend flow disproportionately to EBIT (and brutally in reverse). This amplifies cyclicality.

3. **Structural FTA-TV → digital/streaming shift is a secular headwind for the broadcasters and a tailwind for the content/IP names.** Ad budgets are migrating from FTA-TV to digital (search/social/programmatic/e-commerce) and OOH-digital. This **structurally compresses the FTA-ad pool** that SCMA/MNCN/NETV/VIVA depend on, while **lifting the streaming/IP/content names** (MSIN's Vision+/RCTI+, SCMA's Vidio, FILM's licensing). The basket therefore contains **two opposite secular bets**, which is a key reason the equal-weight basket lacks a clean macro factor and shows split betas.

4. **The two dominant names are NOT ad-spend stories.** **MSIN (38% of mcap)** is a content/IP/streaming *holding* — its value is driven by the Vision+/RCTI+ subscriber ramp, IP-library option value, and **MNC-group corporate actions/relistings**, re-rating off *global-tech/streaming sentiment (NDX) and idiosyncratic deal news*, not the domestic ad-cycle. **FILM (26%)** is a film/IP producer whose value is *box-office cycle + streaming-licensing deals + IP monetisation* — and it carries a **NEGATIVE β (−0.26)**, i.e. it has been re-rating on IP/streaming-deal news *decoupled from* the consumption cycle. So **~64% of the basket by mcap is event-driven content/IP, not cyclical ad-spend** — a fundamental cap on how well any macro engine can fit it.

5. **It is a high-beta, event-driven sentiment basket.** Several names carry β ~1–2 (MDIA 2.02, VIVA 0.99, FUTR 0.98) while others are negative (DOOH −0.63, FILM −0.26, ABBA −0.24). The micro-caps trade on **relisting/M&A/IP-deal/ownership-change news** (the Emtek/MNC/SCMA corporate complex is famously deal-heavy) far more than on macro. The basket is therefore a **risk-appetite (JCI / foreign-flow) beta with huge idiosyncratic noise**, which is exactly the profile that *mean-reverts* and shows no forward skill.

6. **Election-cycle ad bursts are real but episodic and a CALENDAR, not a wireable macro driver.** Indonesian election years (legislative + presidential in **2024**; regional **Pilkada 2024**; next general election **2029**) generate a **large, concentrated political-advertising and campaign-spend pulse** that disproportionately lifts FTA-TV ad revenue (TV is the dominant political-ad medium). This is a **first-order revenue swing for the broadcasters in election years** — but it is an **event/calendar effect** tied to a fixed political schedule, not a macro series. The closest wireable proxy is the **monthly Government Expenditure YTD** print (election-year fiscal expansion), but that is a loose, lagged proxy. Like festive seasonality in Retail, this must be documented as structural, not engineered into the macro tree.

**What a sell-side analyst actually watches:** the **ad-spend pool growth** (Nielsen/industry ad-expenditure — *not in our data*), **audience share / prime-time ratings** per broadcaster, **gross margin / content-cost discipline**, **digital-ad share-shift** (FTA vs digital), **streaming subscriber adds + ARPU** (MSIN Vision+, SCMA Vidio), **box-office + IP-licensing pipeline** (FILM), **USD/IDR** (content cost), the **election calendar** (political-ad burst), **consumer confidence / retail-sales** (advertiser health), and **foreign flow / JCI risk appetite** (the high-β re-rate channel). Of these, only **USD/IDR, JCI, foreign flow, and NDX are high-frequency leading prices**; the ad-spend, confidence, retail-sales, and government-spend series are monthly/quarterly, publication-lagged and coincident; and the ad-spend *pool* itself (the cleanest driver) is **not in the inventory at all** — it must be proxied.

---

## 3. DEMAND driver tree

> Demand = the advertising-spend pool = `nominal GDP × advertiser health × confidence × election-burst`. **There is
> no direct ad-spend series in the inventory** — so the demand spine is built from the best macro PROXIES for the
> ad-pool: GDP (the income-elastic backbone), the BI Retail-Sales Survey (advertiser-volume read), Consumer
> Confidence (sentiment → advertiser willingness), and the Business/Retail-Trade Confidence survey (advertiser
> sentiment directly). These are high-frequency *by publication* but economically **coincident-to-lagging** for the
> *level* series, with a small set of genuinely **forward-looking *expectation/intent*** series that are the only
> demand leaves with real lead potential. ⚠ All of these live in the **`id` macro inventory**, NOT in the Consumer
> Discretionary *industry* block, so the current `("Consumer Discretionary"/"Technology", …)` CEIC pull cannot reach
> them — they must be wired as `macro` keys or via a dedicated CEIC pull on the `id` Retail-Sales / Consumer-Surveys
> categories (see §7/§9).

```
DEMAND (ad-spend pool = nominal GDP × advertiser health × confidence × election burst)
├── D1 ECONOMIC ACTIVITY / NOMINAL INCOME (the ad-pool backbone — coincident) ─► ad budgets scale with advertiser revenue
│     ├─ Real GDP YoY ················ id_gdp_real_q → aIDGDPAR1 [dem, P3M]  sign +1, lag ~0 (coincident, coarse) ★the seed's anchor; ad-spend elasticity ≈1.3-1.5× GDP
│     ├─ GDP: Final Consumption: Private  CEIC224812701 [dem, IDR mn, P3M, n=73]  sign +1 (private consumption = FMCG-advertiser demand backbone)
│     └─ Retail Sales: Real RSI ········ CEIC322851702 [dem, 2010=100, P1M, n=196]  sign +1, lag ~0 ★monthly advertiser-volume read (FMCG/retail = the biggest ad-buyers)
│        ⚠ caveat: GDP is quarterly/coarse; RSI is a survey LEVEL, publication-lagged ~5-6 wks, coincident → attribution, weak forecast.
├── D2 ADVERTISER / RETAIL-TRADE CONFIDENCE (the directest sentiment proxy for ad budgets) ─► willingness to advertise
│     ├─ Retail Trade Confidence Index  CEIC459387527 [dem, %, P3M, n=97]  sign +1, lag ~0-1 ★retailers' (= core advertisers') own confidence; closest ad-sentiment read
│     ├─ Consumer Confidence Index ····· CEIC277372502 (aIDCONIAR) [dem, Point, P1M, n=196]  sign +1, lag ~0-1 ★headline CCI; consumer sentiment → advertiser willingness
│     └─ CCI: Present Situation ········ CEIC277372602 [dem, Point, P1M, n=196]  sign +1 (current-conditions read)
├── D3 FORWARD EXPECTATION / INTENT (the FORWARD leaves — the only real lead) ★
│     ├─ CCI: Expectations (headline) ·· CEIC277372702 [dem, Point, P1M, n=196]  sign +1, lag ~1-3 ★forward consumer expectations → forward advertiser budgets
│     ├─ CCI: Expect 6M Ahead: Income ·· CEIC277373102 [dem, Point, P1M, n=196]  sign +1, lag ~1-3 ★expected income → forward discretionary/ad demand
│     ├─ CCI: Expect 6M Ahead: Business  CEIC277373302 [dem, Point, P1M, n=196]  sign +1, lag ~1-3 (forward business-conditions expectation)
│     ├─ Retail Trade Confidence: Employment (Future)  CEIC459398247 [dem, %, P3M, n=97]  sign +1 (retailers' forward hiring intent = activity proxy)
│     └─ Retailer Expectation: Sales Next 3M  CEIC322852502 [dem, %, P1M, n=195]  sign +1, lag ~1-3 ★retailers'/advertisers' own forward sales expectation
│        mechanism: D3 are EX-ANTE intent — they describe what consumers/retailers/advertisers PLAN, so they lead the realised
│        ad-spend pool by 1-3 months. This is the only branch with a credible forward claim; everything else confirms, not leads.
├── D4 STREAMING / DIGITAL-MEDIA DEMAND (the MSIN/FILM/SCMA-Vidio sleeve — structural, not cyclical) ─► subscriber + e-commerce-ad pool
│     ├─ E-Commerce Transactions: Value  CEICI517698487 [dem, USD, P1D, n=2385]  sign +1 — digital-commerce growth = the digital-ad pool advertisers chase (cross-link, Internet #15)
│     ├─ Mobile Cellular Subs per 100  · CEICI265807702 [dem, Number, P1Y, n=53]  sign +1 (streaming/digital-media addressable base — ANNUAL, structural only)
│     └─ Fixed Broadband Subs ·········· CEICI265968802 [dem, Person, P1Y, n=25]  sign +1 (broadband = streaming reach — ANNUAL, structural only)
│        mechanism: this is the STRUCTURAL digital-shift demand for the content/IP/streaming names (MSIN/FILM) — but note it is the SAME
│        force that ERODES the FTA-ad pool in D1/D2 for the broadcasters. The basket nets two opposite secular bets → low coherence.
└── D5 ELECTION-CYCLE AD BURST (2024/2029 — first-order, but a CALENDAR/event) ★
      ├─ (no clean ad-burst series) — the political-advertising + campaign-spend pulse in election years (2024 GE+Pilkada; 2029 GE) is the
      │   single largest non-cyclical revenue swing for FTA broadcasters, but it is an EVENT tied to a fixed schedule → not a macro series.
      └─ Govt Expenditure YTD (monthly) CEIC367490707 [dem, IDR tn, P1M, n=149]  sign +1 — LOOSE proxy: election-year fiscal expansion co-occurs with the
          political-ad burst, but it is lagged/indirect and NOT a clean instrument. Document the election calendar as a structural overlay, not a driver.
```

**Forecast hypothesis (demand): mostly attribution; the one real hope is the D3 intent branch.**
D1 (GDP/RSI) and D2 (present-situation confidence) are **coincident-to-lagging level prints** that confirm the ad-cycle
but do not lead next month's excess return — and because they are **survey/quantity levels that drift with the
consumption cycle while the high-β equity has already moved on risk appetite and deal news**, loading on them tends to
mean-revert against returns OOS (the mechanical recipe for the placebo-level +0.015 forward IC). D4 is structural
(annual subscriber data) and internally contradictory (helps content names, hurts broadcasters). D5 is a calendar.
**The only branch with a credible forward claim is D3 — the *ex-ante expectation/intent* series** (consumer
expectations, expected income, retailer 3-month sales expectation): these describe what consumers/advertisers *plan*,
so they lead the realised ad-spend pool by 1–3 months. Even so the lead is short and noisy. **Net: anchor demand on D3
(intent, the forecast candidate) + GDP + 1–2 D1/D2 prints (attribution); demote the rest to attribution and do NOT let
the co-linear auto/internet quantity tree (raked in by the mis-pointed CEIC pull) dominate the fit.**

---

## 4. SUPPLY / COST driver tree

> A broadcaster/content house has no physical "supply"; its cost stack is **content/programming cost (much USD-licensed),
> production/transmission, SG&A, and financing.** The only branch with a clean exogenous *leading price* is the
> **USD-content / FX** channel — content licensing (Hollywood films/series, sports rights) and set-top-box hardware are
> USD-priced, so a weaker IDR squeezes margin. The structural digital-shift is a *cost-of-relevance* driver (broadcasters
> must spend to build streaming) more than a commodity input. There is no clean leading commodity series here — itself a
> finding: the cost side that *moves* the equity (USD-content margin shock + financing + digital-build capex) is a
> price/rate branch, not a commodity input.

```
SUPPLY / COST (content + production + financing)
├── C1 USD-LICENSED CONTENT COST — the margin lever (THE leading cost price) ★
│     └─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1, lag ~0-1  ★weak IDR raises USD content-licensing + sports-rights + STB cost
│        mechanism: Hollywood film/series licensing, sports rights, and set-top-box hardware (IPTV/MSKY) are USD-priced. ↑USD/IDR → ↑content COGS →
│        gross-margin squeeze. Daily, exogenous, LEADS the margin print → the cleanest leading cost driver. Sign −1 on the basket (importer of content).
├── C2 BROAD-USD / EM-IMPORT-COST + RISK PARENT (the parent of C1) ─► global dollar regime
│     └─ dxy ························· dxy → TVC:DXY [P1D, wk=800]  sign −1  (strong USD → IDR pressure → content-cost + EM-risk-off outflow on a high-β basket)
│        ⚠ resolver bug: GLOBAL_CORR maps dxy→TVC:BBDXY which is EMPTY (wk=0). Use TVC:DXY (wk=800). See §7/§9.
├── C3 STRUCTURAL DIGITAL-SHIFT / CONTENT-BUILD COST (the secular margin headwind) ─► cost of staying relevant
│     └─ (no clean leading series) — the FTA→digital shift forces broadcasters to fund streaming platforms (Vidio/RCTI+/Vision+) and outbid for content
│        ahead of monetisation → a structural margin drag. Proxy loosely by the e-commerce/digital-ad growth in D4 (the share-shift it tracks), but there is
│        no direct cost series → structural note. This is the cost-side mirror of the D4 demand split.
├── C4 GENERAL COST INFLATION (production / labour / transmission) ─► fixed-cost base
│     └─ CPI YoY ···················· id_cpi_yoy → ECONOMICS:IDIRYY [%, P1M]  sign −1 (production/labour cost inflation; weak, also a real-income/ad-demand drag)
└── C5 FINANCING COST (working-capital + content-amortisation + capex) ─► cost of debt
      └─ (see §5 rate branch) — content/IP names carry content-amortisation + capex debt; financing cost is a P&L line. Captured in §5 to avoid double-count.
```

**Forecast hypothesis (supply/cost): the cost side that matters is FX + financing — both leading prices.**
Unlike a commodity producer, this basket's decisive cost is **USD-licensed content (C1) + digital-build capex/financing
(C3/C5)**. `USD/IDR` (−1) is the single cleanest leading cost driver and the brief's "USD content" channel — liquid,
exogenous, daily, and it leads the margin print. `dxy` (−1) is its parent and doubles as the EM-risk-off proxy. The
structural digital-build drag (C3) and production-cost inflation (C4) have no clean leading series and are immaterial vs
FX at the monthly horizon. **Net cost forecast candidate: `usdidr` (−1), with `dxy` (−1) as its parent and the rate
branch (§5) as financing.**

---

## 5. MACRO / RATE / FX / FLOW

> For a **high-β, event-driven, USD-content-exposed sentiment basket**, the systematic core is **risk appetite (JCI /
> foreign flow) + global-tech sentiment (NDX, for the MSIN/FILM streaming sleeve) + USD/IDR (content cost) + the
> discount/financing rate.** The risk/flow/FX/NDX series are the only *liquid, daily, leading* drivers in the whole
> tree; the consumption/ad-spend backdrop (§3) is coincident. The risk-appetite channel is the natural lead-parent of a
> basket whose dominant moves are re-rates on flow and deal news, not on slow ad-spend prints.

```
MACRO / RATE / FX / FLOW
├── M1 RISK APPETITE / DOMESTIC FLOW — the high-β re-rate channel (the primary leading driver) ★
│     ├─ JCI (benchmark) ············· jci → IDX:COMPOSITE [P1D, wk=790]  sign +1, lag ~0  ★the basket is a high-β domestic-risk play; ⚠ JCI is the BENCHMARK — see caveat
│     │     ⚠ NOTE: JCI is the excess-return benchmark (IMPROVEMENT_PLAN §2.8: "JCI — NEVER a driver"). The current seed lists jci as a macro_hint, but it
│     │       CANNOT be a driver of excess return vs itself. Use it only conceptually (the basket's β to JCI is the risk-appetite read); do NOT wire as a driver.
│     ├─ IDX Net Foreign Flow ········ CEIC14620601 [macro, IDR bn, P1M, n=405]  sign +1, lag ~0-1 ★foreign-flow risk-on/off; high-β media re-rates with flow
│     └─ IDX Net Foreign Volume ······ CEICI14620501 [macro, P1M, n=405]  sign +1 (flow-intensity cross-check; same channel)
│        mechanism: high-β media (MDIA 2.02, VIVA 0.99) is bought in risk-on and dumped in risk-off; foreign flow is the transmission from DXY/global-risk to the de-rate.
├── M2 GLOBAL-TECH / STREAMING SENTIMENT — the MSIN/FILM digital-content sleeve ★
│     ├─ NDX ····················· ndx → NASDAQ:NDX [P1D, wk=800]  sign +1, lag ~0  ★global streaming/tech sentiment; MSIN(38%)/FILM(26%) are terminal-value content/IP re-rates
│     └─ US 10Y Real (DFII10) ······· us_real10y → DFII10 [P1D, wk=800]  sign −1, lag ~0-1 (real WACC on the streaming/IP terminal-value sleeve; ⚠ NEEDS NEW RESOLVER — see §9)
│        mechanism: the two dominant names are NOT ad-spend stories — they are streaming/IP terminal-value re-rates that track global-tech sentiment (NDX +) and
│        the real discount rate (DFII10 −), the SAME duration channel as the Internet basket (#15). For the pure broadcasters (SCMA/MNCN) this leg is irrelevant.
├── M3 FX — USD content cost + EM-risk (dual role with C1/C2) ─► IDR level
│     ├─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [P1D, wk=801]  sign −1 (USD content-cost squeeze + foreign-flow risk-off on a high-β consumer cyclical)
│     └─ DXY ······················· dxy → TVC:DXY [P1D, wk=800]  sign −1 (strong USD → IDR weakness + EM equity outflow) ⚠ TVC:BBDXY→TVC:DXY resolver bug
├── M4 FINANCING / DISCOUNT RATE (content-amortisation + capex + discretionary WACC) ─► cost of debt
│     ├─ BI policy rate ············· id_bi_rate → ECONOMICS:IDINTR [P1M, wk=186]  sign −1, lag ~1-3 (discretionary WACC; cheaper credit lifts both advertiser demand and basket valuation)
│     └─ ID 10Y yield ··············· id_10y → TVC:ID10Y [P1D, wk=798]  sign −1, lag ~0-1 (daily domestic discount-rate proxy; LEADS the slow ad/earnings chain)
└── M5 AD-SPEND / CONSUMPTION BACKDROP (coincident) ─► domestic demand cycle
      ├─ Real GDP YoY ··············· id_gdp_real_q → aIDGDPAR1 [P3M]  sign +1 (current seed; coarse quarterly ad-pool backbone)
      └─ Broad money M2 YoY ········· id_m2 → aIDM2AR [%, P1M]  sign +1 (liquidity → nominal spend → ad budgets; secondary)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Global risk / Fed real-rate / DXY  ──►  NDX + DFII10 + foreign flow + USD/IDR  ──►  basket risk re-rate + content-cost  ──►  basket
   (global, daily)                       (market, daily, LEADS)                     (the high-β re-rate, ~contemporaneous)   (the equities)

GDP / advertiser confidence  ──►  retail sales + CCI expectations  ──►  ad-spend pool  ──►  broadcaster ad revenue → earnings  ──►  basket
   (slow, coincident)            (survey, monthly, lagged)            (coincident)        (quarterly)                            (the equities, already moved)
```
The engine should lean on the **leading risk/flow/FX/NDX prices** to capture the dominant re-rate, while treating the
ad-spend/confidence spine as **attribution**. The difference vs a *forecastable* basket (Coal, Pharma) is that here the
leading prices move *risk appetite and content cost*, but the equity is ultimately governed by **deal news +
mean-reverting ad-spend sentiment** — so the co-movement is real but the forward edge is fragile and regime-dependent.

**Forecast hypothesis (macro): this is where forecastability lives, IF anywhere — but it is thin.**
`NDX` (+1), `usdidr`/`dxy` (−1), `foreign flow` (+1) and the rate complex (`id_10y`/`id_bi_rate` −1) are the best forward
candidates: liquid, exogenous, daily, and they *do* lead the **risk-appetite re-rate and content-cost** channel — the
right instruments for a high-β, USD-content, streaming-exposed basket. **But** the channel prices *risk and content cost
on an event-driven, sentiment-reverting bag of names*; when media sentiment / deal-flow mean-reverts (and FILM's −0.26
β shows large parts are decoupled from the cycle entirely), the basket reverts regardless of where rates/risk sit —
which is exactly how a contemporaneously-correct map produces a *near-zero/negative forward* IC. So even the strong
branch is best read as **contemporaneous risk/flow/content-cost-posture attribution**, with only a marginal,
regime-dependent forward claim.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Consumer Surveys / Retail (macro `id`)** — #21 Retail | `Real RSI` CEIC322851702 (n=196); `CCI` CEIC277372502 (n=196); `CCI Expectations` CEIC277372702 / `Expected Income` CEIC277373102 (n=196); `Retailer Expectation: Sales 3M` CEIC322852502 (n=195) | demand +1 | The **ad-spend pool's best high-frequency proxy** is the *same* retail-sales + consumer-confidence block the Retail basket (#21) uses — because retailers/FMCG are the dominant advertisers. Here they are an *input* (advertiser health → ad demand), not the retailer's own sales. The forward-intent sub-indices are the only forecast candidates. |
| **Business Surveys (macro `id`)** | `Retail Trade Confidence Index` CEIC459387527 (n=97); `…Employment Future` CEIC459398247 (n=97) | demand +1 | The **directest advertiser-sentiment read** in the inventory — retailers' (= core advertisers') own confidence. Quarterly, short history, but conceptually the closest thing to an "ad-spend sentiment" series. |
| **Internet / e-commerce (#15)** | `E-Commerce Transactions: Value` CEICI517698487 (n=2385, daily) | demand +1 (digital sleeve) / −1 (FTA sleeve) | E-commerce growth = the **digital-ad pool** advertisers are migrating into → tailwind for MSIN/FILM/Vidio streaming/digital-ad, **headwind** for FTA broadcasters (the share-shift). Net sign ambiguous → use as a structural digital-shift proxy, not a clean driver. Same series the Internet basket uses. |
| **Securities / Capital Markets (#34)** | `IDX Net Foreign Flow` CEIC14620601 (n=405); `Net Foreign Volume` CEICI14620501 (n=405) | macro +1 | High-β media is bought in risk-on and sold first in risk-off; **foreign flow is the transmission** from DXY/global-risk to the re-rate. Same flow channel the Securities/Banks/Internet maps use. |
| **Technology / Internet (#15)** — global-tech duration | `ndx` NASDAQ:NDX (wk=800); `us_real10y` DFII10 (wk=800) | demand +1 / macro −1 | The MSIN(38%)/FILM(26%) **streaming/IP terminal-value sleeve** re-rates off the same NDX (+) / real-rate (−) duration channel as the Internet basket — because they are content/IP growth stories, not ad-broadcasters. |
| **Government / fiscal (election proxy)** | `Govt Expenditure YTD` CEIC367490707 (n=149, monthly) | demand +1 | Loose proxy for the **election-year political-ad burst** (2024/2029) — election-year fiscal expansion co-occurs with campaign-ad spend on FTA-TV. Indirect/lagged; document the election *calendar* as structural rather than relying on this. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC pull (badly mis-pointed)** | `("Consumer Discretionary", None)` + `("Technology", None)` → **182 candidates, ~90+ auto-unit prints + textile + telecom-subs + e-commerce + browser-share** | **RE-POINT**: there is **NO media industry block** in CEIC — the current pull is pure noise (auto/internet baskets mis-applied to media). Drop both broad pulls; reach the ad-spend proxies via the **`id` Retail-Sales + Consumer-Surveys + Business-Surveys** categories (macro path) and keep, at most, the e-commerce digital-ad-shift series via `ceic_override`. | **P0 — the core wiring error** |
| **Ad-spend proxy (GDP/retail)** | `id_gdp_real_q` +1 (kept); `id_bank_credit` +1 (mislabelled "consumer-demand proxy") | **Real RSI** CEIC322851702 (+1) as the monthly advertiser-volume read; keep `id_gdp_real_q`; **drop/demote `id_bank_credit`** (credit growth is a weak ad proxy) | **P0 — the direct ad-pool read is currently unreachable** |
| **Advertiser/consumer confidence** | none | **CCI** CEIC277372502 / `id_consumer_confidence` aIDCONIAR (+1); **Retail Trade Confidence** CEIC459387527 (+1) | **P1 — the directest ad-sentiment proxy, missing** |
| **Forward intent (the only lead)** | none | **CCI Expectations** CEIC277372702 (+1); **Expected Income** CEIC277373102 (+1); **Retailer Sales Expectation 3M** CEIC322852502 (+1) | **P0 — the only forecast-candidate branch** |
| **Risk appetite / foreign flow** | none | **IDX Net Foreign Flow** CEIC14620601 (+1, the high-β transmission channel) | **P0 — the dominant re-rate channel, entirely missing** |
| **Global-tech / streaming sentiment** | none | **`ndx`** NASDAQ:NDX (+1) for MSIN/FILM sleeve; **`us_real10y`** DFII10 (−1, needs new resolver) | **P0 — the dominant-names' actual driver, missing** |
| **USD-content cost FX** | none | **`usdidr` −1** (content licensing/sports-rights/STB cost) | **P0 — the cleanest leading cost price, missing** |
| **Broad-USD / flow** | none | **`dxy` −1** (after `TVC:BBDXY → TVC:DXY` resolver fix) | **P1** |
| **Financing / discount rate** | none | **`id_10y` −1** (daily, leading); **`id_bi_rate` −1** (discretionary WACC) | **P1 — leading channel, missing** |
| **Digital-shift (structural)** | none | optional `E-Commerce Value` CEICI517698487 (ambiguous sign) | P3 (test) |
| **Election-cycle burst** | none | **no clean series** — calendar/event; `Govt Expenditure YTD` CEIC367490707 is a loose proxy only; document as structural | n/a |
| `id_bank_credit` (mislabelled) | `id_bank_credit` +1 | **DROP or demote** — system credit growth is a weak, coincident ad-spend proxy that adds co-linear noise | P0 (remove) |

**Two concrete problems with the current pulls:** (a) the **CEIC categories are pure noise** — `Consumer Discretionary`
+ `Technology` deliver ~90+ **auto** unit prints (Toyota/Honda/by-cc) plus textile/telecom-subs/e-commerce/browser-share
that describe the **Auto/Apparel/Telco/Internet** baskets, while **Media has no native industry block at all** and the
genuine ad-spend proxies (Retail-Sales Survey + Consumer Surveys + Business Surveys) sit in the **`id` macro inventory,
unreachable from this pull**. The high kept-count (10) is therefore mostly co-linear auto/internet quantity prints
over-fitting in-sample → the −0.11 contemporaneous IC and placebo-level forward IC. The fix is to **drop both broad CEIC
pulls** and wire the macro ad-spend/confidence/intent + risk/flow/FX/NDX series. (b) **Resolver bug:** `dxy → TVC:BBDXY`
is empty (wk=0); use **`TVC:DXY`** (wk=800) — the same bug flagged in the Internet/Telco/Retail files. Also note `id_10y`
(wk=798, daily) leads better than the short `id_bi_rate → ECONOMICS:IDINTR` (wk=186); prefer the daily yield as the
leading rate read.

---

## 8. Forecastability verdict

**The basket is an attribution / ad-spend-and-risk-appetite-beta basket — no forward skill (placebo-level). The map
explains co-movement (when correctly re-pointed) but does NOT forecast. The only systematic, leading branches are the
risk/flow complex (foreign flow +1, `ndx` +1), `usdidr`/`dxy` (−1, USD-content cost) and the rate complex
(`id_10y`/`id_bi_rate` −1), plus the thin forward-intent survey branch (D3) — and even those are
contemporaneous/short-lead, not a fundamental edge.** Reasoning:

- **Why nothing forecasts:** the equity is governed by (1) **ad-spend sentiment that mean-reverts** around the
  consumption cycle, amplified by **high operating leverage**; (2) **idiosyncratic deal/relisting/IP news** in the
  Emtek/MNC/SCMA corporate complex; and (3) for ~64% of mcap (MSIN + FILM), a **streaming/IP terminal-value re-rate
  decoupled from the domestic ad-cycle** (FILM's β is *negative*). The fundamentals we *can* observe (GDP, retail-sales
  index, consumer confidence) are **coincident-to-lagging survey/quantity prints** that drift with the consumption cycle
  while the high-β equity has already re-priced on risk and deals — so loading on them produces a posture that
  mean-reverts *against* returns out of sample. That is the textbook profile of a near-zero/negative forward IC, and it
  matches BACKTEST.md: fwd **+0.015** (≈ placebo median 0.48 → indistinguishable from random), contemp **−0.11**
  (anti-predictive even contemporaneously with the current noisy map), n_oos 129 — filed in the
  "diversified/sentiment baskets mean-revert" cluster (Retail, Internet, Auto, Mining-conglomerates).

- **Why the risk/FX/NDX/intent branches are the best (but still thin) hope:** foreign flow (+1), `ndx` (+1),
  `usdidr`/`dxy` (−1) and `id_10y` (−1) are liquid, exogenous, daily, and they *do* lead the **risk-appetite re-rate and
  USD-content-cost** channel — the right instruments for a high-β, USD-content, streaming-exposed basket. The **D3
  forward-intent survey series** (consumer expectations, expected income, retailer 3-month sales expectation) are
  *ex-ante* and lead the realised ad-spend pool by 1–3 months — the only genuinely forward demand leaves. A *thinner,
  risk+FX+NDX+intent* posture (after killing the mis-pointed auto/internet CEIC pull and the `id_bank_credit` noise)
  should at minimum **stop being anti-predictive contemporaneously** and may recover a small **regime-conditional**
  edge (skill in risk-shock / FX-shock / election-burst regimes, none in mean-reverting media-sentiment chop). But
  because the basket ultimately rides *deal news + mean-reverting ad-spend sentiment* (and a quarter of it is
  anti-cyclical), its forward IC will flip whenever media sentiment reverts — so the realistic ceiling is **weak/marginal
  at best.**

- **Honest concession (structure):** (1) The **election-cycle ad burst** (2024 GE+Pilkada; 2029 GE) — a first-order
  revenue swing for the broadcasters — is an *event/calendar* effect tied to a fixed political schedule, not a macro
  driver, so a macro engine structurally under-explains election years. (2) The basket **staples three incompatible
  business models** with *opposite secular bets and contradictory betas*: cyclical FTA ad-broadcasters (SCMA/MNCN/NETV/VIVA,
  ~21% mcap, β +0.1 to +1.0) being structurally *eroded* by the digital shift; vs streaming/IP content holdings
  (MSIN 38%, FILM 26%, β +0.60 / **−0.26**) being structurally *lifted* by it and re-rating on global-tech/deal news.
  Cross-member betas range DOOH −0.63 / FILM −0.26 to MDIA **2.02** — low coherence, *not fixable in `mapping.py`*
  (membership is fixed upstream). (3) The single cleanest driver — the **advertising-spend pool itself** (Nielsen/industry
  ad-expenditure) — **is not in the inventory at all**; everything in §3 is a proxy. All three must be stated, not
  engineered away.

**What would move it from placebo-level → neutral/marginal:** (1) **drop the mis-pointed CEIC pull** (Consumer
Discretionary + Technology = ~90+ auto/internet noise prints) and the weak `id_bank_credit`; (2) wire the **risk/flow +
NDX + USD/IDR** complex (the high-β re-rate + content-cost channel, entirely missing) and fix `dxy → TVC:DXY`; (3) add
the **ad-spend proxy spine** (Real RSI + GDP) and the **D3 forward-intent** branch (CCI expectations / expected income /
retailer sales expectation) as the only forecast candidate; (4) add the **rate complex** (`id_10y`/`id_bi_rate` −1).
**Hypothesis: a thinner risk+FX+NDX+ad-proxy+intent posture lifts the contemporaneous IC out of negative territory and
nudges the forward IC from +0.015 toward a small positive, regime-conditional value. If forward IC stays ≈ 0 after the
rewire, the correct verdict is to label Media a *contemporaneous ad-spend / risk-appetite attribution* (a foreign-flow /
NDX / USD-IDR / consumer-confidence beta on an event-driven, FTA→digital-transitioning media bag), NOT a forecaster** —
consistent with how BACKTEST.md treats the sentiment/diversified cluster (Retail, Internet, Auto, Investment).

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Media"]`:**
```python
"Media": {  # ~81% MSIN+FILM+SCMA: an MNC content/IP holding (MSIN, 38%) + a film/IP producer
    # (FILM, 26%, NEGATIVE beta) + one clean FTA-ad broadcaster (SCMA, 16%); the actual ad-spend
    # broadcasters the brief targets (MNCN/NETV/VIVA/MDIA) sit in the micro tail (~21% mcap).
    # Revenue = ad-inventory x ad-rate ~= ad-spend pool (pro-cyclical, GDP/retail/confidence-linked)
    # - USD-licensed content cost; structural FTA-TV -> digital/streaming shift; election-cycle ad
    # bursts (2024/2029). The basket is a high-beta, event-driven, mean-reverting SENTIMENT bag with
    # split betas (FILM -0.26, DOOH -0.63 vs MDIA 2.02) -> NO forward skill (fwd IC +0.015 ~ placebo).
    # There is NO media block in CEIC -> the old ("Consumer Discretionary"/"Technology") pull rakes in
    # ~90+ AUTO-unit + textile + telecom-subs + e-commerce noise prints (the kept=10 over-fit and the
    # -0.11 contemp IC). DROP both broad pulls; reach the ad-spend proxies via the id macro path; add
    # the leading RISK/FLOW + NDX + USD-content-FX complex (entirely missing today); keep the rest for
    # ATTRIBUTION ONLY.
    "ceic": [("Consumer Surveys", None),    # ★ ad-spend proxy: confidence + forward intent (id macro category)
             ("Retail Sales", None)],       # ★ advertiser-volume read (Real RSI + retailer 3M expectation)
    # (verify the worklist builder can pull these id-macro categories as ceic candidates; if not, wire
    #  via the macro keys below + new resolver leaves — see the caveat note.)
    "ceic_override": [
        ("retail sales survey: real retail sales index",                  "demand", +1),  # monthly ad-pool/advertiser-volume read
        ("consumer confidence index: expectations",                       "demand", +1),  # ★ forward consumer expectation
        ("consumer confidence index: expectations: 6 months ahead: expecte","demand", +1),# ★ expected income (forward)
        ("retail sales survey: retailer expectation: sales: next 3 month", "demand", +1),  # ★ retailer/advertiser 3M sales expectation
        ("retail trade: seasonally adjusted: confidence indi",            "demand", +1)],  # advertiser (retail-trade) confidence
    # drop the auto/textile/telecom/e-commerce quantity noise that mis-applies other baskets to Media:
    "ceic_exclude": ["motor vehicle", "wholesale", "wholesales", "auto production",
                     "sedan", "pick up", "truck", "4x2 type", "4x4 type", "below 1500",
                     "1500 to 3000", "over 3000", "textile", "apparel", "footwear",
                     "browser share", "search engine share", "social media share",
                     "device vendor", "internet banking", "telephone subscriptions"],
    "globals": [
        ("ndx",    "demand", +1, "global streaming/tech sentiment: MSIN(38%)/FILM(26%) are content/IP terminal-value re-rates"),
        ("usdidr", "macro",  -1, "weak IDR raises USD-licensed content/sports-rights/STB cost -> margin squeeze (content importer)"),
        ("dxy",    "macro",  -1, "broad USD -> IDR pressure + EM equity outflow on a high-beta media bag"),
    ],
    "macro": [
        # ── the leading systematic spine: RISK/FLOW + RATE + FX (entirely missing today) ──
        ("id_10y",       "macro",  -1, "daily domestic discount/financing proxy; LEADS the slow ad/earnings chain"),
        ("id_bi_rate",   "macro",  -1, "discretionary WACC: cheaper credit lifts advertiser demand + valuation (regime cross-check; short-history)"),
        # ── ad-spend / consumption backdrop (attribution; coincident) ──
        ("id_gdp_real_q","demand", +1, "ad-spend pool backbone: ad-spend elasticity ~1.3-1.5x GDP (coarse, quarterly)"),
        ("id_consumer_confidence","demand", +1, "consumer sentiment -> advertiser willingness (monthly present-situation CCI)"),
        ("id_retail",    "demand", +1, "real retail-sales YoY: FMCG/retail advertiser-volume proxy (coincident)"),
        ("id_cpi_yoy",   "macro",  -1, "inflation squeezes real ad-budgets AND raises production cost"),
        # NOTE: DROP the old ("id_bank_credit","demand",+1) -- credit growth is a weak, co-linear ad proxy.
        # NOTE: do NOT wire jci as a driver -- it is the excess-return BENCHMARK (cannot drive return vs itself).
    ],
}
```

**Resolvers — what already works, what to fix, and the one new resolver.**
- **Already mapped (no new resolver):** `usdidr → FX_IDC:USDIDR` (wk=801), `ndx → NASDAQ:NDX` (wk=800),
  `id_10y → TVC:ID10Y` (wk=798), `id_bi_rate → ECONOMICS:IDINTR` (wk=186, short), `id_gdp_real_q → aIDGDPAR1`,
  `id_consumer_confidence → aIDCONIAR`, `id_retail → aIDRSLSAR`, `id_cpi_yoy → ECONOMICS:IDIRYY` — all in `GLOBAL_CORR`.
- **Fix the `dxy` resolver:** `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **empty (wk=0)** — remap to **`"TVC:DXY"`** (wk=800)
  or the `dxy` global resolves to nothing (same bug flagged in the Internet/Telco/Retail files).
- **One optional NEW resolver** for the streaming-sleeve real-rate leg: add **`"us_real10y": "DFII10"`** to `GLOBAL_CORR`
  (DFII10 exists in `market.json`, wk=800, but is currently unmapped — same gap noted in the Internet file). Then add
  `("us_real10y","macro",-1,"real WACC on the MSIN/FILM streaming/IP terminal-value sleeve")` to `globals`. This is the
  cleaner discount instrument for the content/IP names than nominal `id_10y`; keep it optional pending the backtest.
- **Optional cross-industry leaf (foreign flow):** the **risk-appetite/flow channel** (`IDX Net Foreign Flow`
  CEIC14620601, n=405) is the high-β transmission driver. It can be wired as a `ceic_override` demand/macro leaf via a
  Capital-Markets pull, or (cleaner) added as a new `id_foreign_flow → CEIC14620601` resolver + macro hint
  `("id_foreign_flow","macro",+1,"foreign-flow risk-on/off: high-beta media re-rates with flow")`. Test before keeping.

> ⚠ Verify the exact category labels for `("Consumer Surveys", None)` and `("Retail Sales", None)` against the
> `build_worklist.py` pull mechanism before committing — these categories live in the **macro (`id`) inventory**, and
> the current pull may only reach **industry (`idind`)** categories. If the worklist builder cannot pull macro
> categories as `ceic` candidates, wire the ad-spend/confidence/intent reads through the **`macro` keyed path** instead
> (via `id_retail`/`id_consumer_confidence` resolvers above, plus new resolver keys for the forward-intent series —
> `id_cci_expect → CEIC277372702`, `id_expected_income → CEIC277373102`, `id_retailer_exp_sales → CEIC322852502` — if
> dedicated forward leaves are desired). This is the single thing to confirm.

**What to backtest (`backtest/bt.py "Media"`), keep only if forward IC improves/holds:**
1. **Drop-the-noise test (the big one):** current (`Consumer Discretionary` + `Technology` = ~90+ auto/internet prints,
   kept=10) vs proposed (drop both broad pulls; wire macro ad-spend/confidence/intent + risk/FX/NDX). **Hypothesis:
   removing the ~90+ co-linear auto/internet quantity prints that mis-apply other baskets lifts the contemporaneous IC
   out of negative (−0.11) and the forward IC off the placebo floor.** This is the single most important test.
2. **Risk/flow + NDX add:** confirm foreign flow (+1) and `ndx` (+1) help or are neutral — they are the high-β re-rate
   channel and the dominant-names' (MSIN/FILM) actual driver, both entirely absent today. Verify `ndx` empirical sign is
   **+** and foreign-flow sign is **+**. If `ndx` comes out non-significant, it means the FILM/MSIN sleeve is purely
   idiosyncratic/deal-driven → downgrade to attribution.
3. **USD-content FX sign sanity:** verify `usdidr` empirical sign is **−** (content-cost importer). Verify `dxy` resolves
   to `TVC:DXY` (non-empty) before trusting its load.
4. **Forward-intent vs coincident-level:** A/B the **D3 intent branch** (CCI expectations / expected income / retailer
   3M sales expectation) against the coincident retail-sales/GDP *level* prints. **Hypothesis: the ex-ante intent series
   carry the only positive forward IC; the level prints are attribution-only and may be anti-predictive.**
5. **Honesty gate:** if forward IC stays ≈ 0 after the drop-noise + risk/FX/NDX + intent rewire, **label Media a
   *contemporaneous ad-spend / risk-appetite attribution* (a foreign-flow / NDX / USD-IDR / consumer-confidence beta on
   an event-driven, FTA→digital-transitioning media bag), NOT a forecaster** in the capsule — and note the
   **election-cycle calendar**, the **three-incompatible-models / split-beta membership** (FILM −0.26 vs MDIA 2.02), and
   the **absence of any direct ad-spend-pool series** as the structural reasons macro cannot forecast it.
```
