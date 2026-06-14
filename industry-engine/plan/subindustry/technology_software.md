# Software (Technology) — Driver-Tree Plan

> Detail file for the `technology_software` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #44). All RICs below are confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
>
> **One-line thesis: this is a tiny (6T), illiquid, equal-weighted bag of small/mid growth-tech
> names (AR/VR, ad-tech, fibre/data-infra, niche SaaS/IT-product) whose returns are dominated by
> idiosyncratic story / dilution / IPO-froth, NOT by any macro series. The fundamentals we can
> observe (internet penetration, e-commerce GMV, payment rails) are slow secular ramps that
> describe the digital economy but do not forecast these stocks. The ONLY systematic, leading
> handle is the long-duration discount-rate + global-tech-risk-appetite re-rate (`DFII10` real
> yield −1, `NASDAQ:NDX` +1) — and even that is a thin contemporaneous beta on a basket too small
> and idiosyncratic to carry it. The −0.01 forward IC is statistically indistinguishable from
> zero (placebo 50th pctile): not anti-predictive, just NOISE. Honest verdict: a long-duration /
> NDX-beta attribution basket, not a forecaster.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Software**, sector *Technology*, id `technology_software` |
| mcap | **~6T** (capsule #44) — one of the smallest baskets in the universe |
| Members (8, equal-weight) | **IRSX** (`IDX:IRSX`, mcap 2.80T, β n/a) — PT Ingria/“Indo” data-centre & digital-infra play (the single largest leg, ~47% of basket mcap; long-duration infra/AI-capex story); **DMMX** (`IDX:DMMX`, 1.27T, β 0.05) — Digital Mediatama Maxima: ad-tech / digital out-of-home / retail-media SaaS; **WIRG** (`IDX:WIRG`, 0.74T, β n/a) — WIR Group: AR/VR / metaverse / digital-engagement, a pure story/IPO-froth name; **AWAN** (`IDX:AWAN`, 0.48T, β 0.09) — Hyperdata/“Awan” cloud & data-centre / connectivity; **UVCR** (`IDX:UVCR`, 0.46T, β n/a) — Trimegah/Universal Video (digital media/services); **RUNS** (`IDX:RUNS`, 0.08T, β 0.32) — Global Sukses Solusi: cloud accounting/ERP SaaS (RUN System) — the closest to a “real” recurring-revenue SaaS; **TECH** (`IDX:TECH`, 0.06T, β n/a) — Indosterling/“Tech” niche IT; **LMAS** (`IDX:LMAS`, 0.04T, β n/a) — Limas Indonesia Makmur: legacy IT-product/distribution micro-cap. |
| Effective concentration | **IRSX alone ≈ 47% of basket mcap; IRSX+DMMX+WIRG ≈ 80%.** The bottom four (UVCR/RUNS/TECH/LMAS) are sub-0.5T micro/penny names that are **thinly traded** — their weekly returns are dominated by single-trade prints and bid/ask bounce, not by any economic driver. The equal-weight engine basket is therefore a *data-infra (IRSX/AWAN) + ad-tech (DMMX) + AR/VR-story (WIRG) + micro-SaaS tail* composite with **low cross-member coherence** and several names that barely trade. |
| Current grade | **partial** |
| Current kept-driver count | **4** (`_state.txt`) |
| Current forward OOS | **NONE — fwd IC −0.01**, hit−up **+0.15**, placebo pctile **0.50**, n_oos 112, conf *low*, flag *weak* (BACKTEST.md). The forward IC sits **exactly at the placebo median (50th pctile)** — i.e. the current map has **no forward skill and is not anti-predictive either; it is indistinguishable from random**. (Note hit−up +0.15 is a thin directional sliver on an n=112, low-confidence sample — not robust enough to claim skill.) |

**Current seed (`mapping.py` → `SEED["Software"]`):**
```python
"Software": {
    "ceic": [("Technology", None)],
    "globals": [],
    "macro": [("ndx",    "demand", +1, "tech beta"),
              ("us_10y", "macro",  -1, "duration")],
}
```
**The gap.** The seed has the right *instinct* (NDX tech-beta + a duration leg) but three problems:
(1) the duration branch is wired to the **nominal** `us_10y`, whereas a profitless, long-duration
growth-tech basket re-rates off the **real** yield — `DFII10` (US 10Y Real, weekly_obs 800) — which is
the cleaner discount-rate instrument and exactly what the analyst brief specifies (`DFII10` real-yield
−1); (2) `("Technology", None)` **bulk-pulls the entire 81-series Technology block** — ~67 daily/yearly
co-linear *quantity* prints (browser-share %, e-commerce GMV value/volume/AOV × mobile/desktop/vertical,
telecom subscriber counts, e-money) that are publication-lagged, secularly trending and almost perfectly
co-linear; on a tiny, noisy 112-month sample this is pure over-fit fuel that can only add variance, not
forward edge; (3) there is **no FX / risk-appetite / liquidity (M2) overlay** — the EM-flow channel
through which global risk-off actually de-rates illiquid high-beta IDX tech. This file rebuilds the tree
as a *thin, real-yield + global-tech-sentiment + EM-risk* posture, demotes the entire Technology CEIC
block to **attribution-only** (a few representative digital-economy prints), and — critically — states up
front that the structural ceiling is **idiosyncrasy + illiquidity**, not driver selection.

---

## 2. Economic structure — how the basket makes money

The eight names are **not one business** — they span four micro-models, so there is no single revenue
identity. The closest common abstraction:
```
Revenue        = (licences/subscriptions  +  project/integration fees  +  ad-tech take  +  infra/colo rent)
Gross profit   ≈ Revenue − (cloud/hosting + hardware COGS + delivery labour)
EBITDA / FCF   ≈ Gross profit − S&M − R&D/engineering − G&A − (heavy upfront infra capex for IRSX/AWAN)
Equity value   ≈ PV(future FCF, terminal monetised TAM) discounted at a HIGH, rate-sensitive WACC
                 ±  IPO-narrative / dilution / placement premium (often the dominant term for WIRG/UVCR/micro tail)
```

Six structural facts drive (and limit) the modelling:

1. **Long-duration → a REAL-RATE / WACC asset.** Most names have thin or negative near-term earnings;
   value is almost entirely *terminal* — profits years out (AR/VR adoption for WIRG; data-centre/AI
   utilisation for IRSX/AWAN; SaaS seat-expansion for RUNS). That makes the basket **duration-sensitive**:
   when the global real discount rate (`DFII10`) rises, the PV of distant cash flows collapses. This is the
   single most *systematic and leading* channel — the bond/real-yield market moves daily and first, while
   any operating print lands quarterly/yearly. **Sign on DFII10: −1.**

2. **Global-tech / NASDAQ sentiment beta (NDX).** These trade as a local proxy for the global growth-tech
   complex. When NDX / ARKK-style unprofitable-tech rallies (risk-on), the basket re-rates up regardless of
   domestic fundamentals; in risk-off it de-rates. This is a *sentiment* channel, not a cash-flow one.
   **Sign on NDX: +1.** Contemporaneous-to-slightly-leading and high-beta in theory — but the basket’s tiny
   floats mute and distort the beta, so it attributes loosely rather than forecasting.

3. **Illiquidity is a first-order modelling fact, not a footnote.** Five of eight names are <0.5T; several
   barely trade weekly. Returns are then dominated by **micro-structure** (a single block trade, a placement,
   bid/ask bounce, lock-up expiry) that no macro series can see and that **mean-reverts**. This mechanically
   *attenuates* any true factor IC toward zero — which is exactly the −0.01 / 50th-pctile signature observed.

4. **Idiosyncratic story / dilution / IPO froth is the dominant return term.** WIRG (metaverse/AR-VR) and
   the micro tail are *narrative* stocks: they spiked on IPO/thematic hype and de-rated on dilution, rights
   issues, private-placement overhang and profit-warning news. IRSX/AWAN move on **specific data-centre /
   AI-capex contract announcements**. This company-specific flow is **un-modellable from macro data** and is
   a large share of realised variance — the core reason macro cannot forecast this basket.

5. **The basket is internally incoherent.** Data-centre infra (IRSX, AWAN) is a *rate-sensitive,
   capex-heavy, quasi-REIT/utility duration* asset; ad-tech (DMMX) is a *cyclical ad-spend/GDP* asset; AR/VR
   (WIRG) is *pure thematic option value*; RUNS is a *recurring SaaS* compounder; LMAS is *legacy IT
   distribution*. Their economic drivers point in different directions, so any single systematic load is
   diluted. Membership is fixed upstream — this must be **acknowledged**, not engineered away.

6. **Digital-economy demand is real but secular and slow.** Internet penetration, e-commerce GMV and
   digital-payment volume genuinely set the *TAM* these firms sell into — but they ramp upward almost
   monotonically (penetration 30%→70%, GMV/TPV up every year) **independent of the stock cycle**, so loading
   on them injects a structural positive trend that carries no forward information about next month’s excess
   return (and risks mean-reverting against returns, as it did for the sister Internet basket).

**What a sell-side analyst actually watches:** for IRSX/AWAN — contracted data-centre MW, utilisation,
take-or-pay tenancy, AI/cloud capex pipeline, and the **US real 10Y** (infra duration); for DMMX — ad-spend
/ retail-media budgets (GDP, retail sales); for RUNS — ARR, net revenue retention, seat growth; for WIRG and
the micro tail — *the cap table* (placements, dilution, lock-ups) far more than any operating metric. For the
**stock**, the high-frequency leading prices are the **US real 10Y**, **NDX / global growth-tech beta**,
**USD/IDR** (foreign risk-off proxy) and broad **USD/DXY** — everything else is quarterly or lagged.

---

## 3. DEMAND driver tree

> Demand here = *the size and growth of the digital economy these firms sell into* — internet/broadband
> penetration (the TAM), e-commerce GMV and digital-payment volume (activity), and ad-spend/GDP (the
> cyclical budget for ad-tech). In our data this is **slow annual penetration counts + daily Grips
> e-commerce prints + monthly BI payment prints** — high-frequency by *publication* but economically
> **coincident-to-lagging secular activity**, heavily **co-linear**, and a TAM proxy not a revenue proxy.
> Strong for attribution / narrative, weak-to-useless for forecasting an illiquid micro-cap basket.

```
DEMAND (digital-economy TAM = penetration × usage × monetisation)
├── D1 Internet / broadband penetration (the structural TAM) ─► addressable users
│     ├─ Individuals using Internet: % of Population ·· CEICI386873017 [dem, %, P1Y, n=32]   sign +1, lag n/a (annual, structural)  ★the cleanest TAM proxy
│     ├─ Fixed Broadband Subscribers ················ CEICI265968802 [dem, Person, P1Y, n=25] sign +1 (fibre/connectivity demand → IRSX/AWAN)
│     ├─ Fixed Broadband per 100 People ············· CEICI265989402 [dem, Ratio, P1Y, n=25]  sign +1 (penetration ratio)
│     └─ Mobile Cellular Subscriptions ·············· CEICI265785702 [dem, Person, P1Y, n=53] sign +1 (mobile-internet base)
│        ⚠ all annual, n≤53, publication-lagged years — structural backdrop ONLY, cannot forecast monthly returns.
├── D2 E-commerce GMV (digital-spend activity; DMMX retail-media + ecosystem pulse) ─► value transacted
│     ├─ E-Commerce Value ·········· CEICI517698487 [dem, USD, P1D, n=2385]   sign +1, lag ~0 (coincident)  ★widest daily history
│     ├─ E-Commerce Volume ········· CEICI517809607 [dem, Unit, P1D, n=2385]  sign +1, lag ~0 (cleanest unit-demand)
│     └─ E-Commerce Value: Finance·· CEICI519453277 [dem, USD, P1D, n=1716]   sign +1 (fintech GMV — higher-monetisation vertical)
│        ⚠ Value ≈ Volume × AOV by construction → co-linear; keep ONE value + ONE volume only.
├── D3 Digital-payment rails (cashless ramp; ad-tech/retail-media + SaaS billing pulse) ─► e-money usage
│     ├─ E-Money Value ············· (Telecom “E-Money & Card Payments”, P1M, n=207) sign +1, lag ~0 ★monthly TPV proxy
│     └─ Internet banking txn value · CEICI476067207 [dem, IDR bn, P1M, n=162]  sign +1 (digital-banking activity)
├── D4 Ad-spend / discretionary digital budget (the DMMX cyclical lever) ─► marketing budgets
│     ├─ Real GDP YoY ·············· id_gdp_real_q → aIDGDPAR1 [P3M]            sign +1 (coarse ad-budget proxy; quarterly)
│     ├─ Retail sales YoY ·········· id_retail → aIDRSLSAR [P1M]               sign +1 (retail-media / DOOH budget proxy, monthly)
│     └─ Consumer Confidence ······· id_consumer_confidence → aIDCONIAR [P1M]  sign +1, lag ~0-1 (discretionary-spend pulse)
└── D5 Telecom subscriber base (broadband/connectivity demand → IRSX/AWAN colo & transit) ─► carrier capex pull
      └─ Telkomsel / Indosat Customer Base ·· CEICI65397101 / CEICI65987401 [dem, P3M, n≈97-103] sign +1 (carrier scale → data-infra demand; indirect)
```

**Forecast hypothesis (demand): attribution-only / weak.** D1 (penetration) is annual and structural —
it sets the *story*, not next month’s return. D2–D3 (GMV / payments) are **coincident-to-lagging,
mutually co-linear secular ramps** that climb regardless of the stock cycle (the digital economy grew
every year while WIRG fell ~80% post-IPO) — loading on them adds variance and risks the same
mean-reversion that made the sister *Internet* basket anti-predictive. D4 (ad-spend via GDP/retail/
confidence) is the only branch with a genuine, if second-order, monthly lead, and it only maps cleanly to
**one** member (DMMX). **Net: collapse the Technology CEIC block to 2–3 representative attribution prints;
do not let the quantity tree dominate the fit.**

---

## 4. SUPPLY / COST driver tree

> Software/IT-product has little physical “supply”. The cost stack is **cloud/hosting (USD-priced),
> engineering labour, hardware COGS (for IRSX/AWAN data-centre build-out), and — most importantly — the
> cost & availability of CAPITAL** (these names live on equity placements and rights issues). None of the
> operating inputs has a clean exogenous *price* series in the store, which is itself a finding: the cost
> side that actually moves these equities (funding/dilution and the real WACC) is captured by the
> macro/rate branch (§5), not by a commodity.

```
SUPPLY / COST (cloud + hardware + labour + cost-of-capital)
├── C1 Cost of CAPITAL / funding (THE swing for cash-light growth names) ─► real WACC + risk premium
│     ├─ US 10Y Real (DFII10) ······ DFII10 [P1D, weekly_obs=800]   sign −1, lag ~0-1  ★real WACC: ↑real-rate → terminal-value collapse + equity-raise窗口 shuts
│     └─ NDX (risk-appetite parent)·· NASDAQ:NDX [P1D, weekly_obs=800] sign +1 (growth-tech risk-on → cheap/abundant placement capital)
│        mechanism: WIRG/UVCR/micro tail fund opex via placements; rising real rates raise the discount rate AND dry up the IPO/placement bid → double hit.
├── C2 Cloud / hosting cost (USD-priced infrastructure) ─► transaction & hosting COGS
│     └─ USD/IDR ·················· usdidr → FX_IDC:USDIDR [P1D, weekly_obs=801] sign −1 (AWS/GCP/Azure billed in USD; weaker IDR → higher hosting cost; also for IRSX/AWAN imported hardware)
├── C3 Data-centre hardware / build capex (IRSX/AWAN only) ─► imported servers/network gear
│     ├─ USD/IDR ·················· (as C2) sign −1 (imported GPUs/servers/switchgear are USD-priced)
│     └─ (copper) ················· COMEX:HG1! sign −1 (cabling/power-infra metal — tiny 3rd-order input; omit unless IRSX/AWAN dominate)
└── C4 Engineering / labour opex ─► fixed cost base
      └─ (no clean series) — wage inflation loosely proxied by id_cpi_yoy (ECONOMICS:IDIRYY); immaterial vs the funding channel. Note only.
```

**Forecast hypothesis (supply/cost): the cost side IS the macro/funding side.** Like the sister Internet
basket, this has **no leading input-price branch** — its decisive cost is the **cost of capital** (C1),
which is the same `DFII10` / NDX risk-appetite branch as §5. USD/IDR (C2/C3) is a real, secondary
cloud-and-hardware-cost lever that also doubles as an EM-risk-off proxy. The biggest real cost lever —
dilution / placement timing — has **no time series**, which is precisely why a macro engine cannot
forecast the basket. **Net cost forecast candidate: `DFII10` (−1), reinforced by `NDX` (+1) and `usdidr`
(−1).**

---

## 5. MACRO / RATE / FX / FLOW — the systematic core (the only place forecastability could live)

> **This is the section that matters for Software.** A profitless, long-duration, illiquid growth-tech
> bag is — to first order — a *real-rate + global-tech-risk-appetite* trade with an EM-flow/liquidity
> overlay. The demand/supply quantity trees are slow, co-linear and secular; this branch holds the only
> liquid, leading, daily-priced systematic drivers. (Caveat: illiquidity + idiosyncrasy attenuate even
> this branch toward zero.)

```
MACRO / RATE / FX / FLOW
├── M1 DURATION — real discount rate (the dominant systematic branch) ★★★
│     ├─ US 10Y Real (DFII10) ······ DFII10 [P1D, weekly_obs=800]   sign −1, lag ~0-1  ★the WACC re-rate on terminal-value-heavy growth-tech
│     │     mechanism: profitless growth = mostly terminal value; ↑real yield → PV of distant FCF falls → de-rate. REAL (not nominal) because there are
│     │     no near-term nominal cash flows to inflate away — the discount that matters is real. This is the single channel the brief flags as primary.
│     ├─ US 10Y nominal ············ us_10y → TVC:US10Y [P1D, weekly_obs=800]  sign −1 (current seed; keep as cross-check, DFII10 is cleaner)
│     └─ (id_10y local duration)···· id_10y → TVC:ID10Y [P1D, weekly_obs=798] sign −1 (weaker — these trade on GLOBAL growth-tech rates, not local govt curve; relevant mainly for IRSX/AWAN infra)
├── M2 GLOBAL-TECH SENTIMENT / RISK APPETITE ★★
│     ├─ NDX ···················· ndx → NASDAQ:NDX [P1D, weekly_obs=800]  sign +1, lag ~0  ★global growth-tech beta; risk-on/off switch
│     └─ (ARKK unprofitable-tech)·· AMEX:ARKK [P1D, weekly_obs=601]      sign +1 (cleaner “profitless-tech” proxy than NDX; optional cross-check)
├── M3 FX / RISK-OFF & cloud cost ─► IDR as EM-risk barometer
│     └─ usdidr ················· FX_IDC:USDIDR [P1D, weekly_obs=801]  sign −1 (weak IDR = EM risk-off = foreign exit from high-beta illiquid IDX tech; + USD cloud/hardware cost)
├── M4 BROAD-USD / EM-FLOW (the parent of M3) ─► global dollar regime
│     └─ dxy ···················· TVC:DXY [P1D, weekly_obs=800]  sign −1 (strong USD → EM equity outflow → illiquid high-beta tech sold first)
│        ⚠ resolver bug: GLOBAL_CORR maps dxy→TVC:BBDXY which is EMPTY (weekly_obs=0). Use TVC:DXY (weekly_obs=800). See §7/§9.
└── M5 LIQUIDITY / RISK-APPETITE (domestic) ─► broad money as a flows proxy
      └─ id_m2 (M2 YoY) ········· aIDM2AR [P1M]  sign +1 (broad money / system liquidity → speculative bid for small-cap growth-tech; the brief’s liquidity channel)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Fed real-rate / global risk  ──►  DFII10 (real yield) + NDX (risk appetite) + DXY (USD)  ──►  growth-tech WACC + placement/IPO window + EM flow  ──►  basket re-rate
        (global, daily)                  (market, daily, LEADS)                                  (PV + funding-window shift, ~days-weeks)                  (the illiquid equities, attenuated)
```
The engine should lean on the **leading parents (real yield + NDX + DXY)** to anticipate the re-rate — the
“liquid price leads the equity” pattern IMPROVEMENT_PLAN §3 rewards. The difference versus a *forecastable*
basket (Coal, Pharma, Healthcare Equipment) is that those drivers move a real near-term cash-flow; here they
move *sentiment/discount on a profitless asset that barely trades*, so the signal is **both mean-reverting
and micro-structure-attenuated** — real co-movement, fragile-to-absent forward edge.

**Forecast hypothesis (macro): this is where forecastability lives IF anywhere — but it is thin and
attenuated.** `DFII10` (−1) and `NDX` (+1) are the best forward candidates: liquid, exogenous, daily, and
they genuinely *lead* a duration/sentiment re-rate. `usdidr`/`dxy` (−1) and `id_m2` (+1) are the EM-risk /
liquidity overlay explaining *who bids and who sells*. **But** the channel is a *beta on global risk*, not a
fundamental edge; the basket’s tiny floats attenuate the beta and inject idiosyncratic noise; and when global
growth-tech mean-reverts, the branch flips sign with it. So even the strong branch is best read as
**contemporaneous risk-posture attribution**, with at most a marginal, regime-dependent forward claim.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **US growth-tech complex** (global) | NDX `NASDAQ:NDX` (wk=800); ARKK `AMEX:ARKK` (wk=601) | demand +1 | The single largest co-movement source. Empirically the basket is a small, levered, illiquid local proxy for global profitless-tech. |
| **Internet** (#15, sister basket) | E-Commerce `CEICI517698487`/`CEICI517809607`; E-Money; same `DFII10`/`NDX` spine | demand +1 / macro ±1 | Same duration + sentiment regime drives both; Software shares the GMV/payment TAM pulse with Internet but is smaller, illiquid and more idiosyncratic — read together, model thin. |
| **Telco / broadband infra** (#10, #48 Tower) | id_10y `TVC:ID10Y` (wk=798); usdidr | macro −1 | IRSX/AWAN are data-centre / fibre infra → rate-sensitive, capex-heavy, quasi-REIT/utility duration like Telco/Tower. Reinforces the duration branch for the infra members. |
| **Capital Markets / foreign flow** (#34 Securities) | Net foreign purchase `CEICI14620501` (n=405); Foreign-Foreign turnover (Capital Markets sub, n=7579) | macro +1 | Illiquid high-β IDX tech is among the first things foreigners exit in risk-off; flow is the transmission from DXY/real-rates to the de-rate. Test as a P2 overlay only. |
| **Media / ad-spend** (#24) | id_gdp_real_q; id_retail `aIDRSLSAR` | demand +1 | DMMX is ad-tech / retail-media / DOOH → the same ad-budget cycle as the Media basket. The only member with a clean domestic cyclical demand link. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Real-rate duration** | `us_10y` (nominal) −1 | **`DFII10` (US 10Y Real, wk=800) −1** as PRIMARY; keep `us_10y` as cross-check | **P0 — the core thesis instrument (brief-specified)** |
| Global-tech sentiment | `ndx` +1 ✓ (kept) | optionally cross-check `AMEX:ARKK` (wk=601) | P0 — keep |
| FX / EM risk-off | none | **`usdidr` −1** (risk-off + USD cloud/hardware cost); **`dxy` −1** (flow parent) | **P1** |
| Liquidity / risk-appetite | none | **`id_m2` +1** (broad money → small-cap speculative bid) | P1 |
| Internet/broadband penetration (TAM) | (inside bulk Technology pull) | demote to 1–2 prints: `CEICI386873017` (internet % pop), `CEICI265968802` (broadband subs) — attribution only | P2 (structural, annual) |
| E-commerce GMV / payments | **bulk-pulled (full Technology block, ~67 co-linear prints)** | **down-weight to 1 Value + 1 Volume** (`CEICI517698487`, `CEICI517809607`) + 1 e-money — attribution only | **P0 — fix the over-fit** |
| Ad-spend (DMMX) | none explicit | `id_gdp_real_q` +1 (current is GDP via NDX only), `id_retail` +1, `id_consumer_confidence` +1 | P2 |
| Local infra duration (IRSX/AWAN) | none | `id_10y` −1 (weak, infra-leg only) | P3 |
| Take-rate / ARR / utilisation | none | **no margin/ARR/utilisation series in store** — structural gap, document only | n/a |
| Dilution / placement / IPO-froth | none | **no series** — the dominant idiosyncratic + illiquidity risk is invisible to macro data | n/a — explains the zero forward IC |

**Two concrete problems with the current pull:** (a) `("Technology", None)` rakes in the **entire 81-series
Technology block** — browser-share %, telecom subscriber counts, e-commerce GMV value/volume/AOV ×
mobile/desktop/vertical, e-money — i.e. **~67 daily/annual quantity prints that are near-perfectly co-linear
and secularly trending**. On a tiny, illiquid 112-month sample this is pure over-fit fuel: it cannot add
forward edge, only variance, and risks the mean-reversion that made the sister *Internet* basket
*anti-predictive*. The fix is to keep only a handful of representative prints for attribution and let the
systematic load sit on the rate/sentiment/FX branch. (b) **Resolver bug:** `dxy → TVC:BBDXY` is **empty
(weekly_obs=0)**; use **`TVC:DXY`** (wk=800). And there is **no `us_real10y` key** in `GLOBAL_CORR` —
`DFII10` exists in `market.json` (wk=800) but is unmapped, so a new key is required to wire the
brief-specified real-yield branch (see §9).

---

## 8. Forecastability verdict

**The basket is an attribution / beta basket — NOT a forecaster, and (unlike Internet) not anti-predictive
either: the −0.01 forward IC at the 50th placebo percentile is statistically indistinguishable from NOISE.
The only systematic, leading branch is the real-rate + global-tech-sentiment re-rate (`DFII10` −1, `NDX`
+1), and even that is a contemporaneous risk beta that is attenuated to near-zero by the basket’s size,
illiquidity and idiosyncrasy.** Reasoning:

- **Why nothing forecasts — three compounding reasons.** (i) **Idiosyncrasy:** returns are dominated by
  company-specific story / dilution / placement / IPO-froth / single-contract news (WIRG metaverse hype,
  IRSX/AWAN data-centre-contract prints, micro-tail rights issues) that **no macro series can see**. (ii)
  **Illiquidity:** five of eight names are <0.5T and barely trade; weekly returns are micro-structure noise
  (block trades, bid/ask bounce) that **mean-reverts and mechanically attenuates any true factor IC toward
  zero** — the textbook signature of a near-zero IC at the placebo median. (iii) **Secular-but-uninformative
  fundamentals:** the digital-economy prints we *can* observe (penetration, GMV, payments) ramp upward every
  year independent of the stock cycle, so they carry no forward information about next-month excess return.
  Together these explain the BACKTEST.md profile exactly: fwd −0.01, placebo pctile 0.50, n_oos 112, conf
  *low*, flag *weak* — *random, not skilful, not perverse*.

- **Why the duration/sentiment branch is the best (but still thin) hope.** `DFII10` and `NDX` are liquid,
  exogenous, daily, and they *do* lead the WACC/funding re-rate — the right economic instruments for a
  long-duration growth basket, and the only channel the analyst brief flags as systematic. A *thin,
  real-yield-led + EM-risk* posture (kill the bulk-Technology over-fit, swap nominal→real yield, add
  `usdidr`/`dxy`/`id_m2`) should at minimum **keep the IC at ~0 rather than letting the co-linear secular
  ramp drag it negative**, and *may* recover a small **regime-dependent** edge in clear rate-shock / risk-off
  windows. But because the channel is a *beta on global risk appetite* on an *illiquid, idiosyncratic*
  basket, the realistic ceiling is **weak/marginal at best** — and the honest base case is that this basket
  simply cannot be forecast from macro data.

- **Honest concession (membership + microstructure).** The basket staples data-infra duration (IRSX/AWAN),
  cyclical ad-tech (DMMX), thematic AR/VR option-value (WIRG) and a barely-trading micro-SaaS/IT tail
  (UVCR/RUNS/TECH/LMAS) with low coherence and several near-untradeable floats. This is *not fixable in
  `mapping.py`* (membership and liquidity are fixed upstream). It is the structural reason the basket sits at
  the placebo median and must be **stated, not engineered away**.

**What would move it from noise → neutral/marginal (and the falsifiable test):** (1) swap nominal `us_10y` →
**real `DFII10`** as the primary duration instrument; (2) add the **risk-off / liquidity overlay** (`usdidr`,
`dxy`, `id_m2`); (3) **demote the bulk Technology CEIC pull to 2–3 attribution prints** so the co-linear
secular ramp stops adding variance; (4) add the ad-spend leg (`id_retail`, `id_consumer_confidence`) for
DMMX. Hypothesis: a *thinner, real-yield + sentiment + EM-risk* posture holds the forward IC at ~0 (does not
go anti-predictive like Internet) and earns at most a small, regime-conditional edge. **If forward IC stays
≈ 0 / ≤ 0 after the rewire, the correct verdict is to label Software a *contemporaneous long-duration /
NDX-beta attribution basket dominated by idiosyncratic illiquidity*, NOT a forecaster** — consistent with how
BACKTEST.md treats the small/diversified/sentiment cluster.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Software"]`:**
```python
"Software": {  # ~6T, 8 illiquid small/mid growth-tech names (data-infra IRSX/AWAN, ad-tech DMMX,
    # AR/VR story WIRG, micro-SaaS/IT tail). Returns dominated by idiosyncratic story/dilution/
    # IPO-froth + illiquidity -> the -0.01 forward IC is NOISE (placebo 50th pctile), not skill.
    # The only systematic handle is the long-duration discount-rate + global-tech-risk re-rate.
    # Keep a FEW Technology CEIC prints for ATTRIBUTION ONLY; the full block (~67 co-linear secular
    # prints) is over-fit fuel on a tiny sample.
    "ceic": [("Technology", None)],
    # demote the co-linear quantity block to representative digital-economy attribution prints:
    "ceic_override": [("e-commerce transactions: value",  "demand", +1),   # GMV / digital-spend proxy
                      ("e-commerce transactions: volume", "demand", +1),   # order count
                      ("individuals: % of population",    "demand", +1),   # internet penetration TAM
                      ("fixed broadband internet subscribers", "demand", +1)],  # fibre/connectivity TAM (IRSX/AWAN)
    # optional: trim the noisiest co-linear panels (browser/social/search share %, mobile/desktop/
    # vertical GMV splits, per-100-people ratios) so they don't add variance. Enable after A/B test:
    # "ceic_exclude": [("browser share",), ("social media share",), ("search engine share",),
    #                  ("device vendor share",), ("per 100 people",), ("desktop",), ("aov",)],
    "globals": [
        ("usdidr", "macro", -1, "weak IDR = EM risk-off (foreigners exit illiquid high-beta tech) + USD cloud/hardware cost"),
        ("dxy",    "macro", -1, "broad USD -> EM equity outflow -> illiquid high-beta tech sold first"),
    ],
    "macro": [
        # ── the systematic spine: REAL-RATE duration + global-tech sentiment + liquidity ──
        ("us_real10y", "macro",  -1, "PRIMARY: real WACC re-rate on profitless terminal-value growth-tech (brief-specified)"),
        ("us_10y",     "macro",  -1, "nominal-yield cross-check (DFII10 is the cleaner instrument)"),
        ("ndx",        "demand", +1, "global growth-tech sentiment / risk-appetite beta"),
        ("id_m2",      "macro",  +1, "broad money / liquidity -> speculative small-cap growth-tech bid"),
        # ── demand backdrop (attribution; slow / ad-spend for DMMX) ──
        ("id_gdp_real_q",          "demand", +1, "domestic digital spend / ad budgets (coarse, quarterly)"),
        ("id_retail",              "demand", +1, "retail-media / DOOH ad-budget proxy (DMMX), monthly"),
        ("id_consumer_confidence", "demand", +1, "discretionary digital-spend pulse, monthly"),
    ],
}
```

**New resolver required (the real-yield branch).** `DFII10` (US 10Y Real) is present in `market.json`
(weekly_obs=800) but **has no key in `GLOBAL_CORR`**. Add:
```python
# rates / yields  (in GLOBAL_CORR)
"us_real10y": "DFII10",   # US 10Y real yield — growth-tech / profitless-tech duration
```
Also fix the existing **`dxy` resolver**: `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is empty (weekly_obs=0) — remap
to **`"TVC:DXY"`** (weekly_obs=800), or the `dxy` global above resolves to nothing (the same bug noted in the
Internet/Telco files). `ndx → NASDAQ:NDX`, `us_10y → TVC:US10Y`, `id_10y → TVC:ID10Y`, `usdidr →
FX_IDC:USDIDR`, `id_m2 → aIDM2AR`, `id_gdp_real_q → aIDGDPAR1`, `id_retail → aIDRSLSAR`,
`id_consumer_confidence → aIDCONIAR` are all already mapped — no further resolvers needed. (Optional: add
`"arkk": "AMEX:ARKK"` if you want a cleaner profitless-tech cross-check than NDX.)

**What to backtest (`backtest/bt.py "Software"`), keep only if forward IC improves/holds:**
1. **Thin-vs-fat (the single most important test):** the 7-driver rates+sentiment+liquidity posture with the
   **demoted** Technology CEIC pull vs the current fat bulk-CEIC posture. **Hypothesis: the thin posture holds
   forward IC at ~0** (does not go anti-predictive like Internet) by removing the co-linear secular-ramp
   prints that add variance on a tiny sample.
2. **A/B the real-vs-nominal duration swap:** current (`us_10y` primary) vs proposed (`us_real10y` `DFII10`
   primary). Expect the real yield to be the cleaner discount instrument for profitless growth — but on an
   illiquid n=112 sample the difference may be within noise; report honestly.
3. **EM-risk / liquidity overlay:** confirm adding `usdidr`/`dxy` (−1) and `id_m2` (+1) helps or is neutral.
   **Verify `dxy` resolves to `TVC:DXY` (non-empty) first** — otherwise that leg is silently dead.
4. **Sign sanity on `us_real10y`:** verify the empirical sign is **−** (a true long-duration asset). If it
   comes out + or insignificant, the duration thesis is too weak to forecast this basket → downgrade to
   attribution-only.
5. **Honesty gate:** if forward IC stays ≈ 0 / ≤ 0 after the rewire (the expected base case given illiquidity
   + idiosyncrasy), **label Software a contemporaneous long-duration / NDX-beta attribution basket dominated
   by idiosyncratic, illiquid story/dilution/IPO-froth — NOT a forecaster** in the capsule, and note the
   incoherent membership and near-untradeable micro-cap tail as the structural reasons macro cannot forecast
   it. Do not add any driver that only improves the in-sample fit.
