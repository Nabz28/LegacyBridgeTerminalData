# Household (Home & Personal Care) — Driver-Tree Plan

> Sub-industry detail file (template §4 of `plan/IMPROVEMENT_PLAN.md`). Sector:
> Consumer Non-Cyclicals · basket id `consumer_non_cyclicals_household` · IDX
> sub_sector key **"Household"** · ~74T mcap. Every series cited is confirmed live in
> `plan/DATA_INVENTORY.md` + `plan/catalog/*.json` with its RIC and n_obs. Library
> tags (`CPO`, `USDIDR`, `ID10Y`…) are defined in IMPROVEMENT_PLAN §2 and not re-derived.
>
> **The blunt thesis of this file, stated up front so the wiring is read honestly:**
> this basket's return is ~90%-weight **UNVR** (Unilever Indonesia), and UNVR's price
> over the sample is driven by an *idiosyncratic, multi-year market-share decline* that
> no macro series forecasts. The macro tree below is real and worth wiring for
> **attribution** (input-cost-margin + defensive-duration), but the forecastability
> verdict is, and should remain, **explainer/beta — not forecaster**. Pretending
> otherwise would be dishonest about why forward OOS is ~0.

---

## 1. Snapshot + current state

**Basket.** 6 names, ~74.5T mcap, but the mcap and the return are **dominated by a
single stock**. UNVR is 67.0T of the 74.5T — **90.0% of basket weight** — and is the
only member with deep, liquid price history. The "basket" is, statistically, UNVR
plus noise.

| Name | RIC | weekly_obs | mcap | beta | What it makes |
|---|---|---|---|---|---|
| **Unilever Indonesia** | `IDX:UNVR` | **793** | **67.0T (90%)** | **0.206** | home care (Rinso, Sunlight, Wipol), personal care (Lifebuoy, Pepsodent, Dove, Sunsilk), + a foods/ice-cream tail |
| Eterindo Wahanatama | `IDX:EURO` | 0 (no hist) | 4.9T | 2.09 | chemicals/oleochemical-adjacent trading (autoclassified here; high-beta, illiquid) |
| Sariguna / "MSJA" | `IDX:MSJA` | 0 (no hist) | 2.3T | 0.342 | small consumer/utility name |
| Falmaco Nonwoven | `IDX:FLMC` | 0 (no hist) | 0.12T | 1.82 | nonwoven fabric (wipes/hygiene substrate) |
| "NANO" | `IDX:NANO` | 0 (no hist) | 0.11T | 0.261 | micro-cap |
| Cottonindo Ariesta | `IDX:KPAS` | 353 | 0.05T | n/a | cotton products (hygiene/cosmetic cotton) |

> **Liquidity reality (confirmed in `catalog/market.json`):** only `IDX:UNVR` (793 wk)
> and `IDX:KPAS` (353 wk) resolve to real weekly history. EURO/MSJA/FLMC/NANO have
> **0 weekly_obs** — too newly-listed/illiquid to carry the basket. So the
> equal-/cap-weighted basket return ≈ **UNVR's return**. This single fact governs the
> entire forecastability section (§8): we are modelling one defensive staple losing
> share, not a diversified HPC sector.

**Current engine state (SEED `"Household"` in `mapping.py`, lines 243–251):**
- `ceic`: `[("Consumer Staples", None)]` — the whole 356-series Consumer Staples block,
  undifferentiated (rice/garlic/beef/poultry price tickers dragged in — **none of which
  are HPC inputs**; the autoclassifier's `ceic_candidates` for this basket is almost
  entirely Poultry-Trade and food noise).
- `globals`: `brent` (cost −1, "surfactant/packaging feedstock"), `wb_palm_oil`
  (cost −1, "oleochemical input").
- `macro`: `id_10y` (macro −1, "defensive bond-proxy re-rates on yields"),
  `id_cpi_yoy` (demand −1), `id_gdp_real_q` (demand +1), `usdidr` (macro −1).
- **kept = 4** drivers (per `_state.txt`); **grade = partial**; **forward OOS:
  IC = +0.02, hit−up −0.02, placebo pctile 0.53, flag = weak** (BACKTEST.md line 52:
  n_oos 129). That is a coin-flip — the posture has essentially **no forward skill**,
  which is the truthful state for a share-loss-dominated single name.

**The gap.** The seed is directionally sane (the two real macro handles for UNVR —
input-cost-margin and defensive duration — are already present) but:
1. **The CEIC block is 100% noise here.** `("Consumer Staples", None)` pulls food/agri
   price tickers; UNVR/HPC has **no dedicated CEIC industry sub-block** (there is no
   "Soap & Detergent" or "Surfactant" CEIC series — confirmed: grep of `idind.json`
   for soap/detergent/surfactant/oleochemical returns **nothing**). The block should be
   narrowed/dropped and replaced with the *real* HPC demand proxies that live in the
   **ID-macro CPI + Consumer-Surveys** blocks instead.
2. **A shared data bug sits one hop away.** The seed does not wire `dxy`, but if it (or
   any reviewer) reaches for it, `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **EMPTY
   (weekly_obs 0)** — must use `TVC:DXY` (weekly_obs 800). Flagged here so the wiring
   spec uses the populated ric. Also `id_lending_rate → None` (spark-only).
3. **No demand tree.** The only demand handles are GDP (+1) and a crude CPI (−1). The
   HPC-specific demand reads — **CPI Personal Care**, **CPI Household Equipment**,
   **Current/Expected Income**, **real wages**, **distribution-reach proxies** — are all
   held by the engine and **unwired**.
4. **The honesty gap.** The seed implicitly treats the basket as a forecastable macro
   object. It is not. The dominant return driver — UNVR ceding share to Wings, P&G,
   local challengers, and the post-2023 distributor-restructuring volume hit — is
   **company-specific** and absent from every macro series. The fix is not "more
   drivers"; it is to wire the genuine attribution handles, weight them low, and **tag
   the verdict as beta/attribution**.

This file builds the (modest) demand tree, narrows the dead CEIC block, repairs the
DXY trap, sequences the input-cost lag, and — most importantly — sets the correct
forecastability expectation.

---

## 2. Economic structure — how an HPC basket (= UNVR) makes money

The HPC revenue identity is **volume × price**, and — exactly as in branded food — the
earnings swing variable is the **gross margin**, because input cost is volatile and the
selling price is sticky:

```
Revenue   = Volume                         ×  ASP (price)
          = (population × penetration × frequency × share)  ×  (list price · mix · promo)

Gross $   = Revenue − COGS
COGS      = Σ(oleochemical + surfactant feedstock + fragrance + packaging) + conversion + freight
Gross %   = 1 − COGS/Revenue        ← the earnings driver that re-rates the stock
EBIT      = Gross $ − A&P (advertising&promotion, very large for HPC) − distribution
```

Four structural facts define this basket:

- **Volume is defensive and slow.** Soap, toothpaste, detergent, shampoo are bought
  every week regardless of the cycle — the textbook low-beta staple (UNVR realised
  **beta 0.206**). So aggregate category *volume* barely cycles; the macro demand
  series have very little to explain.
- **The swing term is `share`, not the macro `volume` envelope.** This is the crux and
  what separates Household from Food & Beverage. For UNVR the dominant year-to-year
  revenue mover has been **loss of market share** (and the 2023–24 distributor
  inventory de-stock and a consumer-boycott episode), not category demand. *No macro
  series carries `share`.* It is idiosyncratic, governance/execution-driven, and
  enters the model only as the residual the engine cannot explain.
- **Price is sticky; input cost is fast and exogenous.** UNVR raises list prices in
  steps, after cost moves; the input commodities (palm oleochemicals, surfactant
  feedstock) are global, liquid, daily-priced. So margin = ASP − input cost swings with
  the inputs, with an inventory/forward-contract lag (≈1–2 quarters to the P&L) — the
  one genuinely *leading*, exploitable mechanism here (§4, §8).
- **A&P + duration give a second-order macro handle.** HPC majors are **bond-proxy
  defensives**: stable cash flows discounted at a long duration. When yields fall, they
  re-rate up; when yields rise, the "expensive defensive" de-rates. UNVR has
  historically traded on a very high P/E — i.e. long duration — so `id_10y` is a real,
  if secondary, valuation handle (and one the seed already has the sign right on).

**What a sell-side HPC analyst actually watches:** (1) **volume/share** by category
(Nielsen panel — *not in our data*; this is the residual); (2) **gross margin vs the
CPO/oleochemical and crude-surfactant cost curve** with the inventory lag; (3) **A&P
intensity** (reinvestment to defend share); (4) **the multiple vs the 10Y** (duration).
Only (2) and (4) are macro-mappable. (1) and (3) are the idiosyncratic core — and they
dominate UNVR's tape.

**Intra-basket dispersion.** There is effectively none to model: 90% UNVR + a tail of
zero-history micro-caps with wildly different betas (EURO 2.09, FLMC 1.82 vs UNVR 0.21).
The high-beta tail, *if* it ever gains weight/liquidity, would inject a pro-cyclical
signal opposite to UNVR's defensive one — but today it contributes ~0 to the return.
Treat the basket as UNVR for all wiring purposes.

---

## 3. DEMAND driver tree

Demand drives **category volume** — which, for a defensive staple, is the *low-variance*
term (most return variance is share + margin, §2). So the demand tree here is
deliberately **thin and attribution-tagged**: it explains the slow level, not the
forecast. The HPC-specific reads (Personal Care / Household-Equipment CPI, income) are
better than the generic GDP/CPI the seed uses, but none is a strong forward signal.

```
DEMAND (category volume × pricing power)   [mostly attribution; weak-forecast]
├── D1 Real household income  ──►  the staples-spend envelope (penetration/frequency)
│     ├─ D1a Current Income Index  `CEIC277372802`
│     │      "CCI: Present Situation: Compare 6m Ago: Current Income" [Point,P1M,n196]
│     │      sign +1 · LEAD 0–1m · MONTHLY, timely → best demand read in the tree
│     ├─ D1b Expected Income 6m ahead  `CEIC277373102` [Point,P1M,n196]
│     │      sign +1 · LEAD ~1Q (expectations lead spend) · monthly, timely
│     └─ D1c Real wage = nominal wage − CPI
│            • nominal: "Monthly Minimum Wage: Average"  `CEIC303317302` [IDR th,P1Y,n36]
│            • deflate by → "CPI Personal Care & Svc"  `CEIC521347977` [2022=100,P1M,n41]
│            sign +1 · LEAD 1–2Q · ANNUAL nominal → slow, attribution-only
├── D2 Consumer confidence / willingness-to-spend  ──►  trade-up vs downtrade in HPC
│     ├─ D2a Consumer Confidence Index  `aIDCONIAR` [Point,P1M,n196]
│     │      sign +1 · LEAD 1–2m · monthly, timely → best-timed demand forecast candidate
│     └─ D2b CCI: Buying Condition for Durable Goods [Point,P1M,n196]
│            sign +1 · proxy for overall discretionary willingness (premium HPC trade-up)
├── D3 HPC-specific price/throughput  ──►  realised category spend
│     ├─ D3a "CPI: Personal Care and Other Services"  `CEIC521347977` [2022=100,P1M,n41]
│     │      AMBIGUOUS sign (prior 0): high HPC-CPI = UNVR HAS pricing power (margin +)
│     │      BUT real-volume drag (vol −). Net unknown → let data decide. Better than
│     │      the seed's blanket headline-CPI demand −1. LEAD 0 (coincident) · attribution
│     ├─ D3b "CPI: Household Equipment, Equipment & Routine Maint."  `CEIC521347907`
│     │      [2022=100,P1M,n41] — the home-care/cleaning CPI read · prior 0 · coincident
│     └─ D3c Retail Sales: "Other Household Equipment"  `CEIC322852202` [2010=100,P1M,n196]
│            sign +1 · LEAD 0 (coincident, ~6-wk pub lag) · realised home-care volume → attribution
├── D4 Distribution reach  ──►  UNVR-specific volume (the warung/GT footprint)
│     • UNVR sells ~80% through general trade (warung) + a restructured distributor
│       network. The 2023–24 *distributor de-stock* was a pure volume hit invisible to
│       macro. PROXY (weak): Retail Sales YoY `aIDRSLSAR` + M2 liquidity (D5). Honest
│       call: distribution reach is largely IDIOSYNCRATIC → not cleanly wireable; the
│       de-stock shows up as unexplained residual, not as a macro driver.
├── D5 Liquidity / nominal-spend backdrop
│     ├─ D5a Broad Money M2 YoY  `aIDM2AR` [%,P1M] · sign +1 · LEAD ~1–2Q (liquidity
│     │      precedes nominal consumption) · timely-ish
│     └─ D5b Bank credit YoY  `aIDLONYAR` (`id_bank_credit`) · sign +1 · low prior
└── D6 Population × penetration  ──►  structural volume floor (+~1%/yr)
      • slow, non-tradable; the defensive base growth. Not wired as a driver.
```

**Downtrading vs trade-up (regime, both-signed — why blanket CPI −1 is wrong).** In a
real-income squeeze HPC spend holds but **mix shifts**: premium (Dove, Tresemme) →
mass (Lifebuoy, Sunsilk) → unbranded/refill/sachet, and consumers stretch usage
(dilute detergent, smaller sachets). So a CPI spike is **margin-mix negative** for the
premium sleeve but **volume-resilient** for the mass sleeve → the *basket-level* demand
sign of inflation is ambiguous, which is exactly why the seed's `id_cpi_yoy demand −1`
is too crude and should be re-roled to a prior-0 macro term (§9).

**Demand-tree verdict:** every leaf here is a slow or coincident *quantity/survey*
print → **attribution, not forecast**, per the IMPROVEMENT_PLAN §3 rule of thumb. The
least-bad forward candidate is **Consumer Confidence / Expected Income** (monthly,
forward-looking), but even that is weak against a return dominated by share loss.

---

## 4. SUPPLY / COST driver tree — the INPUT STACK (the one leading axis)

This is where the only genuinely *leading* signal lives. UNVR's COGS is built on
**palm-derived oleochemicals** (fatty acids/alcohols → soap, surfactants) and
**crude-derived petrochemical surfactants** (LAB/ethylene-oxide-route → detergents),
plus fragrance, plastic packaging, and freight. Each is a liquid, exogenous, daily
price that LEADS the equity by the inventory/forward-contract lag (≈3–6m to the P&L,
≈1–2Q to the print and the stock). Sign **−1 on the basket** (input up → margin down →
de-rate). RICs/weekly_obs confirmed in `catalog/market.json`.

> **No domestic surfactant/oleochemical CEIC series exists** (grep of `idind.json` for
> oleochemical/fatty-acid/surfactant/detergent/soap = no matches). The input stack is
> therefore built entirely from **liquid global commodity futures** — which is fine,
> and is precisely the kind of leading price the backtest rewards.

```
SUPPLY / COST  (input cost → gross margin → earnings → price)   [sign −1 unless noted]
├── S1 CPO / palm oleochemical  ──►  soap noodles, fatty acids/alcohols, surfactant base
│     tag CPO · `MYX:FCPO1!` (Bursa) weekly_obs 800  ✓ populated, Indo-critical
│     sign −1 · LEAD 3–6m to margin (~1–2Q to print) · the #1 HPC input
│     mechanism: palm kernel oil / palm stearin → C12–C18 fatty acids → soap & anionic
│       surfactants. UNVR's soap/personal-wash COGS tracks CPO/PKO closely.
│     ⚠ do NOT wire the empty `BMFBOVESPA:FCPO1!` (weekly_obs 0) — use MYX only.
├── S2 CRUDE / petrochemical surfactant feedstock  ──►  detergent actives, LAB, plastics
│     tag BRENT · `ICEEUR:BRN1!` weekly_obs 800  ✓ (and `wti NYMEX:CL1!` 800 as alt)
│     sign −1 · LEAD 1–3m (shorter petrochem inventory than palm)
│     mechanism: benzene/ethylene → LAB / ethoxylates → synthetic detergent actives;
│       also resin (HDPE/PP bottles, films) and energy/freight. Brent is the honest
│       single proxy for the crude-derived half of the surfactant + packaging stack.
├── S3 VEG-OIL / oleochemical co-move  ──►  fatty-feedstock substitution check
│     tag SOYOIL · `CBOT:ZL1!` weekly_obs 800  ✓
│     sign −1 · LEAD 3–6m · soyoil/palm co-move (~0.7) → cross-checks the CPO read and
│       captures the tallow/soy-fatty-acid substitution margin. Low prior; optional.
├── S4 PACKAGING (resin)  ──►  HDPE/PP bottles, sachets, flexible film (~10–15% of COGS)
│     resin proxy `brent → ICEEUR:BRN1!` (oil-linked polymer feedstock) sign −1
│     LEAD 1–3m (short inventory). Largely covered by S2; flagged for completeness.
├── S5 FRAGRANCE / SPECIALTY  ──►  perfume oils, actives (imported, USD)
│     ⚠ DATA GAP: no clean price series. Channel is captured by USDIDR (M1, imported,
│       USD-priced) — flag "no fragrance/specialty price" and lean on FX.
└── S6 FX AMPLIFIER on the whole imported stack → see M1 (§5). Most actives, fragrance,
      and specialty chemicals are imported/USD-priced; FX multiplies the entire S1–S5.
```

**The forecast hierarchy inside the stack (strongest leading input first):**

| COGS sleeve | Strongest leading input | RIC | Why it (weakly) forecasts |
|---|---|---|---|
| Soap / personal wash / surfactant base | **CPO oleochemical** | `MYX:FCPO1!` (800) | largest single input; 1–2Q inventory lag to margin |
| Synthetic detergent actives + plastics | **Crude (Brent)** | `ICEEUR:BRN1!` (800) | petrochem surfactant + resin feedstock |
| Imported actives / fragrance | **USDIDR** | `FX_IDC:USDIDR` (801) | ~fully imported; FX is the landed-cost driver |
| Fatty-feedstock substitution | **Soyoil** | `CBOT:ZL1!` (800) | palm co-move cross-check |

> **Honest caveat on S1/EURO:** the autoclassifier put **Eterindo Wahanatama (EURO)**,
> an oleochemical/biodiesel-adjacent name, in this basket. For EURO a CPO rise is
> partly *revenue* (+), the opposite of UNVR's *cost* (−) sign — a within-basket sign
> conflict. But EURO has **0 weekly_obs and 6.6% weight**, so the net basket sign on
> CPO is unambiguously **−1** (UNVR dominates). Note it; don't let it flip the prior.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 USD/IDR  `FX_IDC:USDIDR`  weekly_obs 801  ── sign −1 on the basket
│     mechanism: oleochemical actives, surfactants, fragrance, specialty chemicals, and
│       resin are largely imported/USD-priced → IDR weakness raises landed input cost =
│       margin −. This is the FX amplifier on the WHOLE input stack (§4) → the single
│       highest-confidence macro cost handle. LEAD short (1–3m); FX is fast.
│     (Counter-channel: UNVR is a pure domestic seller with no USD revenue, so unlike an
│      exporter there is NO offsetting +; the sign is cleanly −1.)
├── M2 Defensive duration  ──►  UNVR is a long-duration bond-proxy defensive
│     • `id_10y` `TVC:ID10Y` weekly_obs 798 · sign −1 (yields DOWN → re-rate UP)
│     • `id_bi_rate` `ECONOMICS:IDINTR` · sign −1 · policy-rate proxy · prior low
│     mechanism: stable HPC cash flows discounted long → high P/E → most rate-sensitive
│       of the staples on the MULTIPLE (not earnings). This is the seed's existing,
│       correctly-signed handle and mirrors the Pharma/Food-defensive duration trade.
│     ⚠ `id_lending_rate → None` (spark-only) — do not rely on it; use id_10y/id_bi_rate.
├── M3 CPI regime  ── re-role the seed's blanket demand −1:
│     • "CPI Personal Care & Svc" `CEIC521347977` [2022=100,P1M,n41] → prior 0
│       (pricing power + vs real-income drag −, net ambiguous; §3 D3a)
│     • headline `id_cpi_yoy` `ECONOMICS:IDIRYY` → keep but re-role to macro prior 0
│       (real-income deflator, not a clean demand −1 for a downtrading-resilient staple)
├── M4 Activity backdrop  `id_gdp_real_q` `aIDGDPAR1` · sign +1 (keep) · demand level
└── M5 Flow / risk  `dxy` ── ⚠ USE `TVC:DXY` (weekly_obs 800), NOT `TVC:BBDXY` (EMPTY,0)
      sign −1 · EM-staples are a foreign-owned, index-heavy crowd (UNVR is a large MSCI
      Indonesia constituent) → USD strength = passive-outflow headwind. Optional, low
      prior, and partly redundant with USDIDR.
```

---

## 6. Cross-industry linkages

- **Plantation (CPO) — the key seam.** `MYX:FCPO1!` is **revenue (+1) for Plantation**
  (and for EURO's oleochemical sleeve) but **cost (−1) for UNVR/Household** — the same
  price, opposite sign. The engine already keeps signs basket-specific (Plantation seed:
  `wb_palm_oil supply +1`; Household: `cost −1`). The EURO caveat (§4 S1) sits exactly
  on this seam.
- **Energy / Chemicals (crude surfactant + resin).** `brent`/`wti` is the petrochemical
  feedstock for synthetic detergents (LAB/ethoxylates) and for plastic packaging — a
  cost shared with the **Chemicals** and **Containers & Packaging** baskets. UNVR is the
  *demand* side of packaging; for margin it is a cost input.
- **Containers & Packaging.** Resin/PET bottle + flexible-film cost (S4) is the same
  `brent`-linked input the Containers basket prices as its own COGS.
- **Staple Retail / distribution.** AMRT/MIDI/modern-trade + general-trade warung
  networks distribute UNVR volume → shared demand top (retail sales, real wage, income
  surveys). UNVR's distributor restructuring is the idiosyncratic piece no shared series
  captures.
- **FX (imported actives).** The USD-priced fragrance/specialty channel ties UNVR to the
  same `USDIDR` amplifier that hits every importer (Pharma API, F&B wheat/milk-powder).

---

## 7. Currently wired vs available

| Branch | Wired now? | Series (RIC) | n_obs / freq | Priority to ADD/FIX |
|---|---|---|---|---|
| CPO oleochemical (cost) | ✅ | `MYX:FCPO1!` | 800 wk | keep (lead-tag it) |
| Crude/surfactant feedstock | ✅ (`brent`) | `ICEEUR:BRN1!` | 800 wk | keep (covers resin too) |
| Soyoil oleochemical co-move | ❌ | `CBOT:ZL1!` | 800 wk | ADD (low prior, cross-check) |
| USD/IDR stack amplifier | ✅ | `FX_IDC:USDIDR` | 801 wk | keep (raise role to stack-wide) |
| Defensive duration (10Y) | ✅ | `TVC:ID10Y` | 798 wk | keep (correctly signed) |
| BI policy rate | ❌ | `ECONOMICS:IDINTR` | deep | ADD (low prior) |
| `id_lending_rate` | ❌ (None) | — resolves to None | — | **do NOT use** (spark-only bug) |
| DXY flow | ❌ | use `TVC:DXY` (800) **NOT** `TVC:BBDXY` (**0**) | deep | ADD low prior — **FX bug** |
| GDP (demand level) | ✅ | `aIDGDPAR1` | quarterly | keep |
| Headline CPI | ⚠ crude −1 | `ECONOMICS:IDIRYY` | deep | **RE-ROLE → prior 0** |
| **CPI Personal Care** | ❌ | `CEIC521347977` | n41 P1M | **ADD** (prior 0, HPC-specific) |
| **CPI Household Equipment** | ❌ | `CEIC521347907` | n41 P1M | ADD (prior 0, home-care) |
| **Consumer Confidence** | ❌ | `aIDCONIAR` | n196 P1M | **ADD** (best-timed demand) |
| **Current Income** | ❌ | `CEIC277372802` | n196 P1M | ADD (income envelope) |
| **Expected Income 6m** | ❌ | `CEIC277373102` | n196 P1M | ADD (leads spend ~1Q) |
| **Retail: Other Household Equip** | ❌ | `CEIC322852202` | n196 P1M | ADD (realised home-care vol) |
| Real wage (Min Wage ÷ CPI) | ❌ | `CEIC303317302` ÷ `CEIC521347977` | n36 / n41 | ADD (resolver; attribution) |
| M2 liquidity | ❌ | `aIDM2AR` | P1M | ADD (lead ~1–2Q) |
| CEIC Consumer Staples block | ✅ (whole 356) | `("Consumer Staples", None)` | 356 series | **DROP / NARROW** — all noise for HPC |
| **Market share / distribution** | ❌ | *no macro series exists* | — | unmappable → residual (§8) |

---

## 8. Forecastability — the honest verdict: attribution/beta, not forecaster

**Why the basket is forward-flat (OOS IC +0.02, placebo pctile 0.53 = coin-flip).**
The basket return ≈ UNVR (§1), and UNVR's multi-year tape is dominated by an
**idiosyncratic market-share decline** plus one-off events (2023–24 distributor
inventory de-stock; a 2024 consumer-boycott episode; aggressive A&P-vs-share trade-offs).
**None of these is in any macro series.** When the single biggest source of return
variance is orthogonal to every driver you can wire, forward IC pins near zero — and the
backtest correctly reports that (+0.02, beating only 53% of placebos, hit−up −0.02).
This is not a wiring failure; it is the **true signal-to-noise** of a share-loss story.

**Is there ANY edge? Two thin ones, both weak, and one fake one to avoid:**

1. **Input-cost → margin (the only leading axis).** CPO and crude are liquid, exogenous,
   and lead UNVR's gross margin by the inventory/forward-contract lag (≈1–2Q):
   > CPO/crude up today → oleochemical & surfactant COGS reprice in 1–2Q → gross margin
   > compresses → earnings miss vs consensus → de-rate.
   Because the commodity is observable now and the margin hit is not yet in the print or
   the price, a posture *short after a CPO/crude/FX spike* has a faint forward basis.
   But it is **diluted to near-zero** by the much larger share-loss residual. Expectation:
   real but small; the cost branch should out-IC the demand branch, yet still struggle to
   clear the SKILL bar **at the basket level** because share noise swamps it.

2. **Defensive duration (a beta, not a forecast).** `id_10y` genuinely moves UNVR's
   multiple (it is a high-P/E bond-proxy). But this is a **contemporaneous beta** — when
   yields fall, UNVR re-rates *with* them, it does not *predict* them. So id_10y is an
   excellent **attribution** handle and a poor **forecaster**, exactly the
   contemporaneous-vs-forward distinction the backtest preamble warns about. Tag it
   "attribution."

3. **The fake edge to NOT chase:** do not over-fit the demand quantity prints (retail
   sales, GDP) to manufacture an in-sample IC. They are slow, coincident, and
   publication-lagged; any apparent forward skill is sample noise. The IMPROVEMENT_PLAN
   §6 gate (KEEP only if blindfolded forward IC improves) will (correctly) reject them.

**The contemporaneous-vs-forward read.** Contemporaneous IC here is modestly positive
(the input-cost and duration betas are real co-moves), but forward IC ≈ 0 — UNVR
co-moves with its cost/rate drivers and then the share residual dominates the next-month
return. So the engine's verdict for this basket should read: **"contemporaneous
attribution (input-cost-margin + defensive duration); NOT a forward forecaster — return
dominated by idiosyncratic share loss."**

**What would move it from explainer to forecaster?** Honestly, only data we do not have:
a **market-share / Nielsen volume panel** or a **UNVR-specific volume/distribution
nowcast**. Those carry the missing `share` term. Within the macro toolkit, the
*marginal* improvements are: (a) apply the **1–2Q input-cost lag** (the only structural
forward mechanism); (b) **clean the dilution** (drop the dead CEIC block, re-role the
crude CPI to prior 0, fix the DXY ric); (c) **report cost-branch vs demand-branch IC
separately** so the terminal shows the cost axis is the only one with any forward basis.
Even done perfectly, the realistic ceiling is **weak/marginal**, because the dominant
variance is idiosyncratic. The correct deliverable is an **honest attribution model with
a low-confidence tag**, not a forced forecaster.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Household"` SEED (lines 243–251) with the structure below. Tuple
driver = `(key, role, sign, why)`. No new `GLOBAL_CORR` tag is strictly required (all
keys below exist), but **two GLOBAL_CORR fixes** are flagged for the shared resolver.

```python
"Household": {
    # DROP the whole-Consumer-Staples block: HPC has NO dedicated CEIC sub-block and
    # the food/agri price tickers are pure noise here. Keep only the CPI/income reads,
    # which live in the ID-macro layer (added via `macro` below), not the idind block.
    # If the engine requires a ceic key, point it at the (small, coincident) HPC-price
    # read and exclude the food/agri noise:
    "ceic": [("Consumer Staples", "Food Retail Prices")],   # coincident COGS/price read only
    "ceic_exclude": ["garlic", "chili", "beef", "onion", "rice:", "poultry", "egg",
                     "livestock", "tobacco", "coffee", "sugar", "maize", "cocoa",
                     "wheat", "fishery", "cooking oil"],     # strip all food/agri tickers
    "globals": [
        # --- input stack (cost -1); the only LEADING axis; engine applies 1-2Q lag ---
        ("wb_palm_oil",  "cost", -1, "palm oleochemical: soap noodles/fatty acids/surfactant base; MYX:FCPO1! 800obs"),
        ("brent",        "cost", -1, "crude->petrochem surfactant (LAB/ethoxylate) + resin packaging; ICEEUR:BRN1! 800obs"),
        ("soybean_oil",  "cost", -1, "veg-oil/oleochemical co-move cross-check; CBOT:ZL1! 800obs (low prior)"),
    ],
    "macro": [
        # --- FX amplifier on the whole imported actives/fragrance/resin stack (HIGH prior) ---
        ("usdidr",       "macro", -1, "IDR weakness raises landed cost of imported actives/fragrance/specialty/resin; no USD revenue offset (pure domestic seller)"),
        # --- defensive duration: the valuation handle (ATTRIBUTION, not forecast) ---
        ("id_10y",       "macro", -1, "high-P/E bond-proxy defensive: yields down -> re-rate up; TVC:ID10Y 798obs"),
        ("id_bi_rate",   "macro", -1, "policy-rate proxy for the duration trade (low prior)"),
        # --- demand level (keep GDP; RE-ROLE crude CPI to prior 0 = ambiguous) ---
        ("id_gdp_real_q","demand", +1, "consumption growth / category-volume level"),
        ("id_cpi_yoy",   "macro",  0, "AMBIGUOUS for a downtrading-resilient staple: real-income drag (vol -) vs pricing power (margin +); was demand -1"),
        # --- HPC-specific demand tree (ATTRIBUTION-tagged; confidence is best-timed) ---
        ("id_consumer_confidence","demand",+1,"CCI aIDCONIAR n196 monthly: leading demand/willingness-to-spend"),
        ("id_retail",    "demand", +1, "retail sales aIDRSLSAR: realised category volume (coincident, pub-lagged)"),
        ("id_m2",        "demand", +1, "M2 aIDM2AR liquidity precedes nominal consumption (lead ~1-2Q)"),
        # --- flow (low prior; FIX the ric: use TVC:DXY, NOT empty TVC:BBDXY) ---
        ("dxy",          "macro", -1, "EM-staple passive-outflow headwind on USD strength; REQUIRES GLOBAL_CORR['dxy']->TVC:DXY (BBDXY is empty)"),
    ],
},
```

**Two shared-resolver fixes (in `GLOBAL_CORR`, lines 31–70 — flagged, not edited here):**
1. **`"dxy": "TVC:BBDXY"` → `"TVC:DXY"`.** `TVC:BBDXY` has **weekly_obs 0** (empty);
   `TVC:DXY` has **800**. This is a live bug affecting every basket that wires `dxy`,
   not just Household. (The Food & Beverage file also leans on `dxy`/`TVC:BBDXY` — same
   trap.)
2. **`"id_lending_rate": None`** is unresolved (spark-only) — do not map it; rely on
   `id_10y` + `id_bi_rate` for the rate/duration channel (already done above).

**HPC-specific CPI / income reads (need ID-macro resolvers, not in `GLOBAL_CORR` today).**
The cleaner-than-headline demand handles are HPC CPI sub-indices and income surveys that
live in `catalog/id.json` but have no `GLOBAL_CORR` key:
- `CEIC521347977` "CPI Personal Care & Svc" [n41, P1M] — role macro, **prior 0**.
- `CEIC521347907` "CPI Household Equipment" [n41, P1M] — role macro, **prior 0**.
- `CEIC277372802` "Current Income" + `CEIC277373102` "Expected Income 6m" [n196, P1M] —
  role demand, **+1**, attribution-tagged; Expected Income leads ~1Q.
- `CEIC322852202` Retail "Other Household Equipment" [n196, P1M] — role demand, +1,
  coincident.
- **Real-wage resolver:** `CEIC303317302` "Min Wage: Average" [IDR th, P1Y, n36]
  **deflated by** `CEIC521347977` Personal-Care CPI → role demand, +1, lead ~1–2Q,
  attribution. If a resolver is too heavy for v1, approximate the real-income channel
  with the already-wired `id_consumer_confidence` (Current Income sub-index, monthly).

**Backtest plan (the KEEP/REJECT gate, per IMPROVEMENT_PLAN §6):**
1. Re-run `backtest/bt.py "Household"` after each change; KEEP only if forward IC
   improves or holds with a **cleaner, more honest** tree (never an in-sample-only gain).
2. **Lag test (highest value):** the input stack (CPO/Brent/USDIDR) at LEAD 0 vs LEAD 1Q
   vs LEAD 2Q. Hypothesis: cost-branch IC rises with the lag (the inventory→margin
   thesis). This is the one experiment with a real forward mechanism.
3. **Ablation (dilution check):** confirm that DROPPING the whole `("Consumer Staples",
   None)` block, RE-ROLING `id_cpi_yoy` to prior 0, and FIXING the DXY ric each **hold or
   raise** IC (i.e. they were noise/wrong-signed). Falsifiable: if IC *falls* when the
   food-ticker block is removed, the block was carrying accidental signal — investigate.
4. **Cost vs demand split:** report cost-branch IC and demand-branch IC separately. The
   thesis predicts **cost > demand**, and **both modest**. Tag the terminal verdict:
   *"contemporaneous attribution (cost-margin + duration); NOT a forecaster — UNVR share
   loss is idiosyncratic."*
5. **Single-name honesty flag:** because the basket is ~90% UNVR with a zero-history
   micro-cap tail, set the basket **confidence = low** regardless of any IC bump, and do
   not over-interpret a marginal forward IC as skill — it would more likely be one stock's
   noise. The correct success criterion here is a **cleaner attribution**, not a higher IC.
```

---

### 4-line summary
- **Leaves:** DEMAND 9 (Current/Expected Income, CCI, Personal-Care & Household-Equip CPI, Retail-HouseholdEquip, real-wage, M2, credit) · SUPPLY/COST 4 (CPO oleochemical `MYX:FCPO1!`, crude/surfactant `ICEEUR:BRN1!`, soyoil `CBOT:ZL1!`, resin via brent) · MACRO 5 (USDIDR amplifier, id_10y + bi_rate duration, GDP, DXY flow).
- **Key forecast hypothesis:** the ONLY leading axis is input-cost→gross-margin (CPO + crude lead margin ~1–2Q via inventory); everything else is attribution. Honest verdict = **explainer/beta, not forecaster** — basket ≈ UNVR (90% wt, beta 0.21) whose returns are dominated by **idiosyncratic market-share loss** absent from all macro data (OOS +0.02, placebo pctile 0.53 = coin-flip), so forward-flat by construction.
- **Data bugs found:** `GLOBAL_CORR["dxy"]="TVC:BBDXY"` is **EMPTY (weekly_obs 0)** → must use `TVC:DXY` (800); `id_lending_rate→None` (spark-only); the autoclassified `("Consumer Staples", None)` CEIC block is **100% food/agri noise** for HPC (no soap/surfactant/oleochemical CEIC series exists) → drop/narrow.
- **Liquidity caveat:** only `IDX:UNVR` (793 wk) + `IDX:KPAS` (353 wk) have price history; EURO/MSJA/FLMC/NANO = 0 weekly_obs → set basket confidence LOW; EURO's oleochemical sleeve would flip CPO to +1 but is too small (6.6%, no history) to move the basket's −1 prior.
