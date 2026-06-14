# Telco (Infrastructure) — Driver-Tree Plan

> Detail file for the `Telco` sub-industry basket. Framework: `plan/IMPROVEMENT_PLAN.md`
> (§1 tree · §2 driver library · §3 palette · §4 template · §5 capsule #10). All RICs
> below are confirmed present in `plan/catalog/{idind,id,market}.json` with the cited
> `n_obs`. **One-line thesis: this basket is ~85% TLKM, and TLKM trades as a rate-sensitive
> quasi-utility bond-proxy — so the single forecastable systematic branch is DURATION
> (`id_10y`), not the slow subscriber/ARPU quantity prints.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Telco**, sector *Infrastructure* |
| mcap | **289T** (capsule #10) |
| Members | **TLKM** (`IDX:TLKM`, wk=793) — dominant, quasi-utility, state-backed (52% govt); **KBLV** (`IDX:KBLV`, wk=793) — pay-TV/broadband (Lippo, distressed); **JAST** (`IDX:JAST`, wk=361) — small fixed/IoT |
| Effective concentration | **basket ≈ TLKM.** TLKM mcap (~hundreds-T) dwarfs KBLV+JAST (sub-1T each). The equal-weight member basket the engine builds is numerically a TLKM tracker with two penny-stock idiosyncratic legs that mostly add noise. **Every driver hypothesis below should be read as "does this forecast TLKM".** |
| Current grade | **partial** |
| Current kept-driver count | **— (effectively the 3-line seed below; no demand/supply split)** |
| Current forward OOS | **weak** — fwd IC **+0.04**, hit−up +0.05, placebo pctile **0.82**, n_oos 129 (BACKTEST.md). Positive but below the marginal bar (≥0.05 / 0.80 borderline). A coin-flip-plus. |

**Current seed (`mapping.py` → `SEED["Telco"]`):**
```python
"Telco": {
    "ceic": [("Telecom", None), ("Technology", "Telecom Subscribers & Internet")],
    "globals": [],
    "macro": [("id_gdp_real_q", "demand", +1, "data ARPU/consumption"),
              ("usdidr", "macro", -1, "USD capex/equipment"),
              ("id_bi_rate", "macro", -1, "quasi-utility bond proxy")],
}
```
**The gap.** Three flat macro lines, no globals, no demand/supply tree, and — critically —
the bond-proxy branch is wired to `id_bi_rate` (the *policy* rate, a coarse step series)
**not** to `id_10y` (`TVC:ID10Y`, the *market* long yield, 798 weekly obs). For a duration
asset the 10Y is the correct discount-rate instrument and the only liquid leading price in
the whole map. The CEIC `("Telecom", None)` pull also silently rakes in 53 Card-Transaction
/ E-Money payment series that belong to *Banks/Internet*, not Telco revenue (see §6/§7).

---

## 2. Economic structure — how the basket makes money

**Revenue identity (mobile, ~70% of TLKM group):**
```
Revenue ≈ Subscribers × ARPU(blended)  +  fixed-broadband(IndiHome) ARPU × homes-passed
EBITDA  ≈ Revenue − network opex(energy+lease+spectrum) − S&M
FCF/DPS ≈ EBITDA − network capex(USD equipment) − USD debt service − tax
```

Four structural facts drive the modelling:

1. **Quasi-utility, low-beta, bond-proxy.** TLKM is a mature, cash-generative,
   high-dividend-payout (~70–80%) SOE. Its equity behaves like a **long-duration bond**:
   the dividend yield re-rates **inversely to the 10Y govt yield**. When `id_10y` rises,
   the required yield on TLKM rises → price falls (and vice-versa). This is the **strongest,
   most systematic, and most *leading* channel** because the bond market moves first and
   daily, while subscriber/ARPU prints land quarterly and stale.

2. **The data-monetisation / ARPU-recovery thesis.** Indonesian mobile has shifted from
   a price war (declining ARPU) toward consolidation (XL-Smartfren merger, Indosat-Tri done)
   and data-led ARPU recovery. The bull case is *price discipline × data-traffic growth →
   ARPU up*. But ARPU (`CEICI65398401`, **quarterly**, n=97) is slow and publication-lagged
   — good for *attribution*, weak for *forecasting*.

3. **Capex / FX asymmetry.** Network gear (Ericsson/Nokia/Huawei) and a slice of debt are
   **USD-denominated**, while ~all revenue is IDR. A weaker IDR (`usdidr` ↑) raises capex
   and USD-debt service → margin/FCF headwind → **sign −1**. This is the cleanest cost branch.

4. **Fixed broadband + tower/fibre.** IndiHome (now folded into Telkomsel) is the fixed-line
   growth leg; tower/fibre (Mitratel, a TLKM subsidiary) overlaps the separate **Tower**
   sub-industry (capsule #48) and is itself a duration asset. Reinforces (1).

**What a sell-side analyst actually watches:** quarterly ARPU trend, net-adds, data traffic
(PB/quarter), IndiHome subs, capex-to-sales guidance, the **10Y yield** (for the dividend-
yield re-rate), and USD/IDR (for capex/debt). Note: of those, only the 10Y and USD/IDR are
high-frequency leading prices.

---

## 3. DEMAND driver tree

> Demand is *quantity × price* of connectivity. In our data it is overwhelmingly **slow
> annual/quarterly CEIC prints** → strong for attribution, **publication-lagged and
> coincident/lagging for forecasting** (IMPROVEMENT_PLAN §3 rule-of-thumb).

```
DEMAND (connectivity revenue = subs × ARPU + digital adjacency)
├── D1 Subscriber base ─────────────► mobile/fixed customer count
│     ├─ Telkomsel Customer Base ··· CEICI65397101 [dem, Unit, P3M, n=97]      sign +1, lag ~0 (coincident, slow)
│     ├─ Mobile Cellular Subs ······ CEICI265785702 [dem, Person, P1Y, n=53]   sign +1, lag +12 (annual, stale)
│     ├─ Mobile Subs per 100 ······· CEICI265807702 [dem, Number, P1Y, n=53]   sign +1 (penetration saturating ~130/100 → low Δ)
│     └─ Indosat CB / XL annual ····  CEICI65987401 / CEICI65989201            sign +1 (competitor proxy, market-share read)
├── D2 ARPU (the monetisation lever — the thesis) ─► blended revenue/unit
│     ├─ Telkomsel ARPU Blended ····  CEICI65398401 [dem, IDR, P3M, n=97]       sign +1, lag ~0  ★thesis core, but quarterly+lagged
│     ├─ Indosat ARPU Blended ······  CEICI65988201 [dem, IDR th, P3M, n=101]   sign +1 (industry pricing discipline read)
│     └─ XL ARPU Blended ···········  CEICI65989501 [dem, IDR, P1Y, n=26]       sign +1 (annual, weak)
├── D3 Fixed broadband (IndiHome growth leg) ─► homes-passed × fixed ARPU
│     ├─ Fixed Broadband Subscribers  CEICI265968802 [dem, Person, P1Y, n=25]   sign +1, lag +12 (annual)
│     ├─ Fixed Broadband per 100 ···  CEICI265989402 [dem, Ratio, P1Y, n=25]    sign +1 (low base → structural growth)
│     └─ Internet Users % of Pop ····  CEICI386873017 [dem, %, P1Y, n=32]        sign +1 (TAM expansion, very slow)
├── D4 Digital-payment / e-money rails (adjacency, NOT core telco revenue) ─► usage proxy
│     ├─ E-Money Transaction Value ··  CEICI479936297 [dem, IDR bn, P1M, n=207]  sign +1, lag ~0  ★only MONTHLY demand series
│     ├─ E-Money Volume ············  CEICI479936217 [dem, Unit th, P1M, n=207]  sign +1
│     └─ Card (ATM+Debit) Value ····  CEICI313914702 [dem, IDR bn, P1M, n=243]   sign +1 (digital-economy pulse, n=243)
│        ⚠ caveat: this is a *digital-economy activity* proxy, not TLKM revenue. Weak, indirect.
└── D5 Macro demand backdrop (income → data spend) ─► real consumption / confidence
      ├─ Private Consumption (real) ·  CEIC224812701 [dem, P3M, n=73]            sign +1, lag ~0 (quarterly)
      ├─ Real GDP YoY ··············  id_gdp_real_q → aIDGDPAR1 [P3M]            sign +1 (current seed; coarse)
      └─ Consumer Confidence ·······  id_consumer_confidence → aIDCONIAR / CEIC277372502 [P1M, n=196]  sign +1, lag ~0-1 ★monthly, leads spend
```

**Forecast hypothesis (demand):** *weak.* D1–D3 are annual/quarterly quantity prints that
move slowly and arrive late — they explain TLKM's secular trend but cannot forecast monthly
excess return. The only demand branches with forecasting potential are the **monthly** ones:
e-money/card value (D4) and **consumer confidence** (D5, `aIDCONIAR`/`CEIC277372502`, n=196) —
and even those are indirect. **Net: demand is an attribution tree, not a forecast tree.**

---

## 4. SUPPLY / COST driver tree

> Telco "supply" = network capacity built and the cost stack to run it. Capacity (BTS/fibre)
> is built ahead of demand; the cost side is where the *leading, USD-priced* signal lives.

```
SUPPLY / COST (network capacity + opex/capex stack)
├── S1 Network capacity (capex output) ─► sites built
│     ├─ BTS: Telkomsel ············  CEICI65399201 [sup, Unit, P3M, n=97]   sign +1 (coverage/capacity); but capex SPEND is a cost
│     └─ BTS: Indosat ··············  CEICI65990601 [sup, Unit, P1Y, n=26]   sign +1 (industry capacity, annual)
│        note: more BTS = more capacity = revenue enabler, BUT the capex to build is a cash drain → net sign ambiguous
├── C1 USD equipment capex (the clean cost branch) ─► imported network gear
│     └─ USD/IDR ···················  usdidr → FX_IDC:USDIDR [P1D, wk=801]    sign −1, lag ~0  ★leading price, daily
│        mechanism: weaker IDR → more IDR per USD of Ericsson/Nokia/Huawei capex → margin/FCF hit
├── C2 USD-denominated debt service ─► FX on the balance sheet
│     └─ USD/IDR ···················  (same FX_IDC:USDIDR)                    sign −1  (reinforces C1; TLKM carries USD bonds)
├── C3 Energy / BTS power (grid + diesel) ─► tower running cost
│     ├─ Electricity tariff (Industry) CEIC idind Energy/Electricity "Tariff: Industry" [dem, IDR/kWh] sign −1 (grid power for BTS)
│     └─ Brent (diesel gensets) ····  brent → ICEEUR:BRN1! [wk]              sign −1 (off-grid BTS diesel; small, leading)
├── C4 Tower lease cost ─► opex to tower-cos (cross-link to Tower #48)
│     └─ (no clean lease-rate series) — proxy via id_10y: lease economics are rate-indexed; rising rates raise tower-co required returns → lease cost pressure. sign −1, indirect.
└── C5 Spectrum / regulatory fees ─► govt BHP frequency charges
      └─ (no time series in store) — administrative, lumpy, govt-set. NOTE as structural; not wireable. Flag in §7.
```

**Forecast hypothesis (supply/cost):** the **only forecastable cost branch is `usdidr`**
(C1+C2) — daily, exogenous, genuinely leads the equity because capex/debt revaluation hits
sentiment fast. Brent (C3) is a tiny, second-order diesel cost. BTS counts (S1) are
attribution-only and sign-ambiguous (capacity-good vs capex-drain). **Net cost forecast
candidate: USD/IDR, sign −1.**

---

## 5. MACRO / RATE / FX / FLOW — the systematic core

> **This is the section that matters for Telco.** A quasi-utility bond-proxy is, to first
> order, a *rates* trade. The demand/supply trees above are slow; this branch is the one
> liquid, leading, daily-priced systematic driver.

```
MACRO / RATE / FX / FLOW
├── M1 DURATION — the dominant systematic branch ★★★
│     ├─ id_10y ··················  TVC:ID10Y [P1D, wk=798]   sign −1, lag ~0-1  ★the bond-proxy re-rate
│     │     mechanism: TLKM div-yield re-rates inverse to 10Y. Rising 10Y → required yield up → price down.
│     │     This is the cleanest, most leading branch — bonds move before the equity reprices.
│     ├─ id_01y / id_05y ········  TVC:ID01Y (wk=793) / TVC:ID05Y (wk=795)   sign −1 (curve/short-duration cross-check)
│     ├─ id_bi_rate ·············  ECONOMICS:IDINTR [P1M]    sign −1 (policy anchor; coarse STEP series — keep as confirm, not primary)
│     └─ us_10y ················   TVC:US10Y [P1D, wk=800]   sign −1 (global duration / EM-rates beta; ID10Y co-moves with UST)
├── M2 FX / capex-debt ─► (mirrors C1/C2)
│     └─ usdidr ················   FX_IDC:USDIDR [P1D, wk=801]  sign −1  (USD capex + USD debt; also EM risk-off proxy)
├── M3 FOREIGN FLOW (why duration leads, the parent driver) ─► EM bond-flow regime
│     ├─ dxy ···················   TVC:DXY / TVC:BBDXY        sign −1 (strong USD → EM outflow → ID10Y up → TLKM down)
│     └─ M2 Net Foreign Asset ··  CEIC64074501 [P1M, n=292]   sign +1 (foreign liquidity into IDR assets; slow confirm)
└── M4 ACTIVITY backdrop ─► (mirrors D5)
      └─ id_gdp_real_q ·········  aIDGDPAR1 [P3M]            sign +1 (current seed; data/consumption demand)
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
DXY / Fed / US10Y  ──►  ID 10Y govt yield (id_10y)  ──►  TLKM required dividend yield  ──►  TLKM price
   (global, daily)        (market, daily, LEADS)            (re-rate, ~weeks)               (the basket)
```
The engine should lean on the **leading parent (rates/DXY)** to anticipate the equity, exactly
the pattern IMPROVEMENT_PLAN §1 prescribes (rate → loan → sales → price, here compressed to
rate → re-rate → price).

**Forecast hypothesis (macro):** **strong relative to the rest of the tree.** `id_10y`
(sign −1) is the single best forward candidate in the entire Telco map: liquid, exogenous,
daily, and it genuinely *leads* a duration asset's reprice. `usdidr` (−1) and `dxy` (−1) are
secondary leading prices. This is where the basket's forecastability — such as it is — lives.

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Tower / fibre** (#48) | id_10y / us_10y (`TVC:ID10Y`/`TVC:US10Y`) | macro −1 | Tower-cos are REIT-like duration; TLKM owns Mitratel → same rate sensitivity. Tower's own basket is also rate-driven (#48 OOS ✗−0.20). |
| **Technology / digital-payments** (#15 Internet, #2 IT Services) | E-Money `CEICI479936297`, Card `CEICI313914702` | demand +1 (indirect) | The CEIC "Telecom" category *houses* the payment rails, but they are an Internet/Banks output, not telco revenue. Borrow as a digital-economy pulse only, low weight. |
| **Energy / power** | Electricity "Tariff: Industry" (idind Energy/Electricity); brent `ICEEUR:BRN1!` | cost −1 | BTS grid power + off-grid diesel. Small. |
| **Banks** (#1) | M2 Net Foreign Asset `CEIC64074501`; lending rate `CEIC14405201` | macro | Same foreign-flow / rate regime that drives the duration branch. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Duration (10Y)** | `id_bi_rate` only (policy step) | **`id_10y` (TVC:ID10Y, wk=798) sign −1** + `us_10y`, `id_05y` | **P0 — highest. The whole thesis.** |
| FX capex/debt | `usdidr` −1 ✓ (kept) | `dxy` −1 (flow parent) | P1 |
| ARPU (thesis) | via `("Technology",…)` bulk pull | explicit `ARPU Blended` `CEICI65398401` +1 | P1 (attribution) |
| Subscribers | via bulk CEIC | explicit `CEICI65397101` +1, `CEICI265785702` +1 | P2 (attribution) |
| Fixed broadband | via bulk CEIC | `CEICI265968802` +1 | P2 |
| Network capacity (BTS) | via bulk CEIC (Network Infra) | `CEICI65399201` (sign-ambiguous) | P3 — consider excluding |
| Energy/BTS power | none | electricity tariff −1; brent −1 | P3 |
| Digital-payment rails | **bulk-pulled (53 Card/E-Money series) — OVER-WEIGHTED, mis-roled** | down-weight to 1–2 representative series; `ceic_exclude` the rest | **P0 — fix the leak** |
| Spectrum / regulatory | none | **no series in store** — structural gap, document only | n/a |

**Two concrete problems with the current `("Telecom", None)` pull:** (a) it ingests **53
Card-Transaction + E-Money series** that are payment-system data (Internet/Banks), swamping
the ~30 genuine subscriber/ARPU series with the wrong domain; (b) the genuine telco series are
all P1Y/P3M, so once publication-lagged they are near-useless for forward signal. The fix is
to **stop bulk-pulling `("Telecom", None)`**, pull only `Network Infrastructure` from Telecom,
keep the `Technology / Telecom Subscribers & Internet` subscriber/ARPU set for attribution,
and add **`id_10y`** as the systematic forecast spine.

---

## 8. Forecastability verdict

**The leading branch is RATES (`id_10y`, sign −1), and only rates.** Reasoning:

- **Why rates lead:** TLKM is a high-payout quasi-utility whose equity is a long-duration
  bond-proxy. The IDR govt 10Y is a liquid, daily, exogenous price that *moves before* the
  equity reprices its dividend yield. This is the textbook "liquid price series leads the
  equity" pattern that the backtest rewards (IMPROVEMENT_PLAN §3).
- **Why the rest lags:** subscribers, ARPU, broadband, BTS are **annual/quarterly CEIC
  quantity prints** with publication lag. They are coincident-to-lagging and explain the
  secular trend, not next month's return. E-money/card (the only monthly demand series) are
  an indirect digital-economy proxy, not TLKM revenue.
- **Honest low-beta caveat:** TLKM is **low-beta and mean-reverting**. The current forward IC
  is **+0.04 / 0.82 pctile (weak)** — barely above noise. A quasi-utility will *never* be a
  high-IC forecast target the way a commodity producer is; its excess return is dominated by
  the slow rate re-rate plus idiosyncratic SOE/regulatory/dividend-policy news. The realistic
  ceiling is **marginal** (IC ~0.05–0.08), achieved by making the duration branch clean and
  leading, **not** by piling on lagging quantity drivers (which only help in-sample and were
  the likely cause of the weak forward number — too many coincident CEIC prints diluting the
  one leading price).

**What would move it from weak → marginal:** swap `id_bi_rate` (policy step) for **`id_10y`**
(market, leading) as the primary duration driver; add `dxy`/`us_10y` as the flow parents;
**down-weight the demand quantity tree to attribution-only** and exclude the 53 mis-roled
payment series. Hypothesis: a *thinner, rates-led* posture forecasts better than the current
fat coincident one. **If even that does not lift forward IC, the honest verdict is to read
Telco's engine output as a contemporaneous attribution (a "rates/FX posture on a bond-proxy"),
NOT a forecast** — consistent with how BACKTEST.md treats low-beta/mean-reverting baskets.

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Telco"]`:**
```python
"Telco": {  # ~85% TLKM: a rate-sensitive quasi-utility bond-proxy.
    # Pull ONLY genuine telco capacity + the subscriber/ARPU set for attribution;
    # do NOT bulk-pull ("Telecom", None) — it rakes in 53 Card/E-Money payment
    # series that are Internet/Banks output, not telco revenue.
    "ceic": [("Telecom", "Network Infrastructure"),
             ("Technology", "Telecom Subscribers & Internet")],
    # BTS capacity is sign-ambiguous (capacity-good vs capex-drain) -> let stats
    # decide; ARPU/subs are demand +1 (attribution).
    "ceic_override": [("average revenue per unit", "demand", +1),   # ARPU thesis
                      ("number of subscriber",     "demand", +1),
                      ("fixed broadband",          "demand", +1)],
    # Optional: drop the noisiest annual penetration ratios if they dilute signal.
    # "ceic_exclude": [("per 100 people", )],
    "globals": [("usdidr", "cost",  -1, "USD network capex + USD debt service"),
                ("dxy",    "macro", -1, "broad USD -> EM bond outflow -> ID10Y up -> TLKM down"),
                ("brent",  "cost",  -1, "off-grid BTS diesel (small)")],
    "macro": [
        # ── the systematic spine: DURATION ──
        ("id_10y",      "macro",  -1, "PRIMARY: bond-proxy dividend-yield re-rate (leading)"),
        ("us_10y",      "macro",  -1, "global duration / EM-rates beta"),
        ("id_bi_rate",  "macro",  -1, "policy anchor (coarse confirm, not primary)"),
        # ── demand backdrop (attribution; slow) ──
        ("id_gdp_real_q",         "demand", +1, "data/consumption demand"),
        ("id_consumer_confidence","demand", +1, "monthly income pulse -> data spend"),
    ],
}
```

**Resolver note:** `id_10y` already maps in `GLOBAL_CORR` → `TVC:ID10Y` (798 wk obs) — no new
resolver needed. `id_consumer_confidence` → `aIDCONIAR` is already present. `dxy` → `TVC:BBDXY`
is mapped but **wk=0 (empty)** in the store; **prefer `TVC:DXY` (wk=800, populated)** — either
remap `dxy`→`TVC:DXY` in `GLOBAL_CORR` or use it directly. No other new keys required.

**What to backtest (`backtest/bt.py "Telco"`), keep only if forward IC improves/holds:**
1. **A/B the duration swap:** current (`id_bi_rate` primary) vs proposed (`id_10y` primary).
   Expect `id_10y` to lift forward IC — it is the leading market price; `id_bi_rate` is a lagged step.
2. **Thin-vs-fat:** rates-led 5-driver posture vs the fat bulk-CEIC posture. Hypothesis: thinner forecasts better (fewer coincident prints diluting the one leading branch).
3. **Payment-leak fix:** confirm dropping `("Telecom", None)` (the 53 Card/E-Money series) does not hurt forward IC — it should help or be neutral.
4. **Sign sanity on `id_10y`:** verify the empirical sign is **−** (a true bond-proxy). If it comes out +, the bond-proxy thesis is wrong for this period and the basket should be downgraded to attribution-only.
5. **Honesty gate:** if forward IC stays < 0.05 after the rates-led rewire, **label Telco a contemporaneous attribution, not a forecaster** in the capsule.
