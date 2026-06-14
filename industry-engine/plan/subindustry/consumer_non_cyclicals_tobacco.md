# Tobacco (Kretek) — Driver-Tree Plan

> Sub-industry detail file (template §4 of `plan/IMPROVEMENT_PLAN.md`). Sector:
> Consumer Non-Cyclicals · basket id `consumer_non_cyclicals_tobacco` · ~120T mcap ·
> IDX sub_sector key **"Tobacco"**. Every series cited is confirmed live in
> `plan/DATA_INVENTORY.md` + `plan/catalog/*.json` with its RIC and n_obs. Library
> tags (`USDIDR`, `DXY`, `BRENT`…) are defined in IMPROVEMENT_PLAN §2 and not
> re-derived here.
>
> **The one-line thesis.** This is a defensive, near-monopolistic domestic staple
> whose single dominant driver — the **annual excise tariff (cukai / CK) hike** — is a
> *policy step shock*, set once a year (Oct–Nov, effective 1 Jan), that the engine's
> monthly liquid-price machinery structurally cannot forecast. The honest verdict is
> **attribution / event basket, not a monthly forecaster**; the file below maps the
> full tree anyway, isolates the *only* branches with any monthly skill candidacy
> (real-income / volume momentum), and flags a hard data bug: there is **no clove and
> no tobacco-leaf input-cost series anywhere in the inventory**, and the one series
> named "Excise duty: tobacco" is **YTD government revenue, not the tariff rate**.

---

## 1. Snapshot + current state

**Basket.** 5 names in the worklist, but the investable reality is **3 kretek
makers** (GGRM + HMSP ≈ 96% of basket mcap) plus a micro tail. All make
*kretek* (clove cigarettes) — the dominant Indonesian format — split across SKM
(machine-rolled), SKT (hand-rolled), and SPM (white/non-clove).

| Name | RIC | weekly_obs | mcap (worklist) | What it makes | Mix / note |
|---|---|---|---|---|---|
| HM Sampoerna | `IDX:HMSP` | 793 | 86.1T (71%) | SKM (A Mild) + SKT (Dji Sam Soe) | Philip Morris control; premium SKM leader; β 0.64 |
| Gudang Garam | `IDX:GGRM` | 793 | 30.4T (25%) | SKM (Surya) + SKT; IDX listed | full-spectrum kretek; β 0.84; most leveraged to excise |
| Wismilak (WIIM) | `IDX:WIIM` | 691 | 3.7T (3%) | SKT-heavy, lower-tier SKM | small-tier excise advantage; β −0.29 (idiosyncratic) |
| ITIC | `IDX:ITIC` | 354 | 0.21T (<1%) | small cigarette/filter | micro, illiquid |
| RMBA (Bentoel) | `IDX:RMBA` | **absent** | 0.0 | BAT-owned (Dunhill/Lucky Strike) | mcap 0, not in `market.json` → **dead constituent, exclude** |

Two names (HMSP+GGRM) are 96% of the basket; the engine's signal is effectively a
**2-stock bet** on the kretek duopoly. WIIM's negative β makes it a small-tier
contrarian sleeve (it *benefits* from excise gaps that punish the majors).

**Current engine state (SEED `"Tobacco"` in `mapping.py`):**
- `ceic`: `[("Consumer Staples", "Tobacco"), ("Consumer Staples", "Tobacco & Cigarette")]`
  — pulls the 23-series Tobacco block + the 5-series annual Tobacco & Cigarette block.
- `globals`: **`[]`** — empty. No commodity input wired (correct, given the data gap —
  but the file should say *why* rather than leave it implicit).
- `macro`: `id_cpi_yoy` (cost −1, "excise/CPI pass-through pressure"),
  `id_gdp_real_q` (demand +1, "disposable income"), `id_bank_credit` (demand +1,
  "consumer liquidity").
- **kept = 5** (BACKTEST.md / `_state.txt`); **grade = perfected**; **forward OOS =
  none** (fwd IC **+0.00**, hit−up −0.02, placebo pctile **0.47** — literally at the
  coin-flip median of the null; n_oos 129).

**The gap.** Three things, only one of which is fixable into forecast skill:
1. **The dominant driver is not wired and arguably *cannot* be wired as a monthly
   series.** The excise tariff (CK) is an annual step. The closest CEIC series,
   `CEICI456545587` "Excise duty: tobacco", is **ytd cumulative government excise
   *revenue*** (`Government Revenue: ... ytd: ... Excises Duties: Tobacco Products`,
   IDR tn, P1M, n75) — a *collection* number (≈ volume × tariff, with a saw-tooth
   ytd-reset and ~6-week pub lag), **not the policy rate** and **not forward-looking**.
2. **No input-cost tree exists.** Clove and tobacco-leaf are ~the entire raw-material
   bill, and **neither exists in the inventory** (grep of all catalogs: zero clove
   series, the only domestic leaf line is the GDP/IPI volume aggregate). So the
   supply/cost side is structurally un-modellable from prices — a real, honest hole.
3. **The macro tree is thin and partly mis-signed.** `id_cpi_yoy cost −1` conflates
   two opposite channels (excise-driven CPI = pricing power +, real-income drag = vol −);
   `id_bank_credit demand +1` is a weak link for a cash-purchase staple. The volume
   and real-income series that actually move kretek demand are unwired.

This file maps the full tree, names the excise mechanism precisely, isolates the only
plausible monthly-skill branches, and concedes the forecast verdict where honest.

---

## 2. Economic structure — how a kretek basket makes money

The revenue identity is **volume × net price**, but the defining feature is that
**the government sits inside the price**: excise (cukai) is a per-stick specific tax
that is by far the largest single cost line — bigger than tobacco + cloves combined.

```
Retail price/stick = ex-factory price + EXCISE (CK, per-stick, by tier) + VAT (PPN) + margin
Ex-factory price   = leaf + cloves + labour (SKT) + conversion + SG&A + producer margin

Producer revenue   = Volume(sticks) × ex-factory net price
Producer EBIT      = Revenue − COGS(leaf+clove+labour) − opex
                     ⟂ but the BINDING constraint is whether the consumer can absorb
                       (ex-factory + ΔExcise) at the till without dropping volume.
Margin swing       = the firm's ability to PASS THROUGH the annual excise hike
                     without losing more volume than the price gain. ← the whole game.
```

Four structural facts a sell-side tobacco analyst actually watches, in order:

- **Excise (CK) is the price, the tax, and the risk.** Every Oct–Nov the Ministry of
  Finance announces the next year's per-stick tariff by tier (SKM/SPM/SKT × tier I/II,
  by production-volume band). A double-digit hike forces a retail price rise; the
  question is **pass-through vs volume loss**. This single policy event explains most
  of the multi-month return dispersion in the basket. It is *lumpy, annual, and
  pre-announced* — the opposite of a smooth monthly driver.
- **Downtrading is the volume release valve.** When a hike + weak real income squeezes
  the consumer, volume migrates **premium SKM → cheaper SKM → SKT/small-tier → illicit
  (non-excised) sticks**. This *hurts HMSP/GGRM premium mix* but can *help WIIM /
  small-tier* and outright leak to the untaxed grey market. So the **basket-level**
  sign of a hike is ambiguous and dispersed across the 3 names — exactly why a single
  averaged signal washes out (and the basket prints fwd IC ≈ 0).
- **Volume is structurally flat-to-declining and inelastic.** National cigarette
  consumption is ~300bn sticks/yr, drifting down ~1–2%/yr on health/regulation, with
  low short-run price elasticity (addiction). Quarter-to-quarter volume barely moves
  except around the Jan excise step and Ramadan. Low-variance revenue → little for a
  monthly engine to grip.
- **Input cost (leaf + clove) is second-order and unobservable.** Cloves (cengkeh)
  are a domestic smallholder crop with a multi-year bearing cycle and notoriously
  volatile farmgate prices; tobacco leaf is part-domestic, part-imported. Both matter
  to gross margin, but **no price series for either exists in the data** (§4), and in
  any case their P&L weight is dwarfed by excise.

**Intra-basket dispersion (why the average is near-zero):**
- **HMSP** — premium-SKM-heavy (A Mild), most exposed to *premium downtrading* losses;
  PMI-controlled, high payout, lowest β (0.64) — the defensive anchor.
- **GGRM** — broadest mix, most *operationally* geared to excise (thinner margins,
  higher tier exposure); highest β (0.84) — the excise-cycle proxy.
- **WIIM** — SKT/small-tier, *benefits* from tier gaps and downtrading *into* cheap
  sticks; β −0.29 — moves against the majors. The basket's internal hedge.

So the basket nets a **policy-event beta with internal offsets**, which is why the
honest engine verdict is *attribution of the excise/real-income regime*, not forecast.

---

## 3. DEMAND driver tree

Demand drives **volume and mix**. The dominant node (D1, excise) is a *policy step*,
not a market price — it is the thing that matters most and forecasts least on a
monthly axis. The only branches with monthly-skill candidacy are **D3 real income**
(leads downtrading) and **D5 volume momentum** (the IPI/excise-revenue prints, used as
attribution). Demand series here are slow CEIC quantity/policy prints → mostly
**attribution-tagged** per IMPROVEMENT_PLAN §3.

```
DEMAND (volume × mix × pricing power)
├── D1 EXCISE TARIFF (cukai / CK)  ──►  THE driver: retail price step → downtrading
│     ├─ D1a Excise revenue (ytd)  `CEICI456545587` [IDR tn, P1M, n75]
│     │      ⚠ this is COLLECTED REVENUE (≈ volume×tariff), NOT the tariff rate;
│     │        saw-tooth ytd series, resets each Jan, ~6-wk pub lag.
│     │      role demand · sign AMBIGUOUS (rev up = tariff hike = pricing power +,
│     │        but also = the volume-squeezing shock −) · LEAD negative (LAGS the
│     │        Oct announcement & Jan effect by months) · attribution only.
│     ├─ D1b CPI weight: Cigarettes and Tobacco  `CEICI522348097` [%, P1M, n53]
│     │      the CPI basket weight that the excise pass-through inflates; proxy for
│     │        the price-step landing in the index. role cost · sign +1 (higher weight
│     │        ⇒ price rises absorbed) · LEAD ~0 (coincident with the Jan step) · attrib.
│     └─ D1c THE POLICY EVENT ITSELF (not a series) — the Oct–Nov CK announcement
│            and the 1-Jan effective date. Best handled as an ENGINE CALENDAR/REGIME
│            flag (Jan = excise-step month), NOT a `mapping.py` driver. (see §9)
├── D2 Affordability / purchasing power  ──►  can the consumer absorb the hike?
│     ├─ D2a Headline CPI YoY  `ECONOMICS:IDIRYY` (= `id_cpi_yoy`) [%, P1M]
│     │      real-income deflator; high CPI + excise = double squeeze on sticks.
│     │      role demand · sign −1 (inflation erodes the cigarette budget) · LEAD 0–1m.
│     └─ D2b GDP real YoY  `aIDGDPAR1` (= `id_gdp_real_q`) [%, P3M, quarterly]
│            disposable-income backdrop. role demand · sign +1 · LEAD 0 · attribution.
├── D3 Real income / downtrading trigger  ──►  premium→SKM→SKT mix shift  ★MONTHLY-SKILL CANDIDATE
│     ├─ D3a Income Expectations: "Incomes, 6 months hence" `aIDCSINC6MN`
│     │      [Index, P1M] — survey, forward-ish, MONTHLY, timely (no pub lag).
│     │      role demand · sign +1 on PREMIUM mix (rising income ⇒ trade UP to HMSP) ·
│     │      LEAD ~1 quarter (expectation precedes spend) · the best demand forecast leaf.
│     ├─ D3b Consumer Confidence Index  `aIDCONIAR` (= `id_consumer_confidence`)
│     │      [Index, P1M, n196] · role demand · sign +1 · LEAD 1–2m · monthly, timely.
│     └─ D3c Retail Sales YoY  `aIDRSLSAR` (= `id_retail`) [%, P1M]
│            realised mass-consumer throughput · sign +1 · LEAD 0 (coincident, pub-lag) · attrib.
├── D4 Liquidity backdrop  ──►  nominal mass-market spend (weak link for cash staple)
│     ├─ D4a Bank credit YoY  `aIDLONYAR` (= `id_bank_credit`) [%, P1M]
│     │      ⚠ kretek is a CASH purchase; credit is a weak demand proxy. sign +1 · LOW prior.
│     └─ D4b Broad money M2 YoY  `aIDM2AR` (= `id_m2`) [%, P1M] · sign +1 · LEAD 1–2Q · low prior.
└── D5 Volume / production momentum  ──►  realised stick output  ★ATTRIBUTION ANCHOR
      ├─ D5a IPI Manufacturing: Tobacco  `CEICI323567102` [2010=100, P1M, n180]
      │      ⚠ CROSS-BLOCK pull (sits in Industrials "Manufacturing Production Index",
      │        NOT in the basket's own ceic_candidates). The single cleanest monthly
      │        VOLUME proxy. role demand · sign +1 · LEAD 0 (coincident) · ⚠ STALE
      │        (last_obs 2024-12) → attribution only, watch staleness.
      ├─ D5b IPI Quarterly: Tobacco  `CEICI...` "IPI (quarterly): Tobacco" [2010=100, P3M, n60]
      │      lower-freq corroborant of D5a.
      └─ D5c GDP: Tobacco Processing  `CEICI365765267` [IDR bn, P3M, n73]
             ⚠ ENDOGENOUS-ADJACENT: this is the basket's own output value → use as
             attribution context, NOT as a forecasting driver (see §9 exclude).
```

**Downtrading mechanism (the regime that actually matters, dispersed-sign).** A big
excise hike + weak real income (D2/D3) triggers the mix cascade **premium SKM (HMSP)
→ value SKM → SKT/small-tier (WIIM) → illicit untaxed sticks**. Basket-level volume is
sticky (addiction) but **earnings disperse**: HMSP loses premium margin, WIIM can gain
small-tier share, GGRM straddles. This is why the *averaged* basket signal is ≈0 and
why the forecast verdict is attribution: the engine can *explain* a down-mix regime
contemporaneously but cannot *forecast* which name wins from a single averaged z-score.

---

## 4. SUPPLY / COST driver tree — the DATA HOLE (honest)

The two inputs that define kretek COGS — **cloves (cengkeh)** and **tobacco leaf** —
have **no price series anywhere in the inventory**. This is the central honest
limitation of the basket and must be stated plainly rather than papered over.

```
SUPPLY / COST  (raw-material bill → gross margin; sign −1 where wired)
├── S1 CLOVES (cengkeh)  ──►  ~the defining kretek input (clove ÷ tobacco blend)
│     ❌ NO SERIES. grep of id/idind/cn/market catalogs = ZERO clove price/volume.
│        Cloves are a domestic smallholder crop (multi-year bearing cycle, very
│        volatile farmgate price) but it is simply not in the data. UNMODELLABLE.
│     (If ever sourced: domestic cengkeh farmgate IDR/kg, sign −1, LEAD 1–2Q to margin.)
├── S2 TOBACCO LEAF  ──►  part-domestic, part-imported
│     ⚠ NO clean price. The only domestic leaf signals are VOLUME/value aggregates:
│        • Import value: Tobacco & Manufactured Tobacco Sub `CEICI323781402`
│          [USD mn, P1M, n172] — a proxy for imported-leaf *value* (price×qty), USD-
│          denominated → FX-amplified. role cost · sign −1 · LEAD ~0 · noisy attrib.
│        • Import volume: Tobacco & Manufactured Tobacco Sub `CEICI323791102`
│          [kg mn, P1M, n172] — divide value/volume for a crude unit-value, but messy.
│     No exchange-traded leaf future exists for Indonesian/Oriental leaf.
├── S3 LABOUR (SKT hand-rolling)  ──►  HMSP/GGRM/WIIM hand-rolled lines are labour-heavy
│     proxy: minimum-wage / nominal wage trend (annual). Not a tradable monthly driver;
│     relevant to SKT-tier margin and to the policy rationale for SKT excise leniency.
├── S4 USD inputs (imported leaf + filter/flavour/machinery)  ──►  FX on the COGS tail
│     `FX_IDC:USDIDR` (= `usdidr`) weekly_obs 801 ✓ · role cost · sign −1 · LEAD 1–3m
│       (FX is fast). The ONLY liquid, populated cost lever available — and it only
│       touches the imported-input tail, NOT the dominant clove/excise mass. Low prior.
└── S5 EXCISE-AS-COST  ──►  (see D1) excise is economically a COST too, but it is a
      policy step, attribution-tagged, handled on the demand/price side.
```

**The honest supply-side verdict.** The cost tree is **un-forecastable from prices**:
the two dominant inputs (clove, leaf) have no series, and the only liquid lever
(USDIDR) touches a minor imported tail. There is no commodity-lead margin trade here
analogous to Food & Beverage's wheat/CPO/sugar stack. **Do not fabricate a cost
signal** — wire USDIDR at low prior, flag the clove/leaf gap, and lean on the
demand/excise/real-income side for whatever skill exists.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1 CPI regime  `ECONOMICS:IDIRYY` (= `id_cpi_yoy`) [%, P1M]  ── SPLIT the seed sign
│     The seed's `cost −1` is too crude. Two opposite channels:
│       • pricing-power / pass-through: excise+CPI ⇒ firms raise price ⇒ margin can be + ;
│       • real-income drag: high CPI ⇒ cigarette budget shrinks ⇒ volume −.
│     Net AMBIGUOUS → set prior **0** and let the engine reconcile, OR keep a small
│       demand −1 (real-income channel dominates for a price-taking staple). LEAD 0–1m.
├── M2 Rates / defensive duration  ── kretek majors are high-payout bond-proxies
│     • `id_10y` `TVC:ID10Y` (daily) sign −1 — HMSP/GGRM are dividend-yield defensives;
│       they re-rate UP when yields FALL (the staples-as-duration trade). LEAD 0–1m.
│     • `id_bi_rate` `ECONOMICS:IDINTR` sign −1 · low prior · same channel.
├── M3 Activity backdrop  `aIDGDPAR1` (= `id_gdp_real_q`) sign +1 · demand level · keep.
├── M4 USD/IDR  `FX_IDC:USDIDR` (weekly_obs 801) sign −1 — touches the imported-leaf /
│     filter / machinery COGS tail only; NOT a dominant lever (kretek is ~domestic).
│     Low prior — distinct from exporter baskets where USDIDR is +1.
└── M5 Flow / risk  `dxy` ── ⚠ BUG: `id_10y`-adjacent `TVC:BBDXY` is EMPTY (weekly_obs 0).
      USE `TVC:DXY` (weekly_obs 800). EM-defensive ownership is foreign-heavy (esp HMSP
      via PMI float) → USD strength = mild outflow headwind. sign −1 · optional, low prior.
```

These macro leaves are mostly **contemporaneous attribution** (defensive re-rating,
real-income drag), not forecasters — consistent with the basket's fwd IC ≈ 0.

---

## 6. Cross-industry linkages (make explicit)

- **IPI Manufacturing: Tobacco** `CEICI323567102` (D5a) is **borrowed from the
  Industrials "Manufacturing Production Index" block**, not the basket's own
  Consumer-Staples Tobacco candidates. It is the single cleanest monthly volume
  proxy and the most important cross-link to add.
- **Fiscal / government revenue.** The excise-revenue series `CEICI456545587` sits at
  the seam with the *fiscal* macro block (it is a Ministry-of-Finance tax-collection
  line). It is the basket's policy driver but behaves like a fiscal series (ytd,
  saw-tooth) → treat accordingly.
- **Plantation (cloves) — the MISSING link.** Cloves are an agricultural smallholder
  crop and *should* live in the Plantation/Agriculture industry block, but **no clove
  series exists** there either (confirmed by grep). If a domestic cengkeh farmgate
  price is ever ingested, it belongs as a `cost −1` cross-link here.
- **Consumer Surveys (shared demand top).** Income Expectations `aIDCSINC6MN`,
  Consumer Confidence `aIDCONIAR`, Retail Sales `aIDRSLSAR` are the same demand-tree
  top shared with Food & Beverage / Staple Retail — kretek is the most *income-
  inelastic* node on that tree (downtrading destination, not discretionary trade-up).
- **FX (USDIDR) shared cost amplifier** with every importing basket — but here it is a
  *minor* tail (domestic crop dominates), unlike F&B where the whole input stack is
  imported.

---

## 7. Currently wired vs available

| Branch | Wired now? | Series (RIC) | n_obs / freq | Priority |
|---|---|---|---|---|
| Excise revenue (ytd) | ⚠ via CEIC block | `CEICI456545587` | n75 P1M | **RE-ROLE**: it's revenue not tariff; sign-ambiguous, attribution |
| CPI weight: Cigarettes&Tobacco | ⚠ via block | `CEICI522348097` | n53 P1M | keep as price-pass-through attribution |
| **IPI Manufacturing: Tobacco** | ❌ (other block) | `CEICI323567102` | n180 P1M | **ADD** (best monthly volume proxy; flag stale 2024-12) |
| IPI Quarterly: Tobacco | ⚠ via block | "IPI (quarterly): Tobacco" | n60 P3M | keep (corroborant) |
| GDP: Tobacco Processing | ⚠ via block | `CEICI365765267` | n73 P3M | **EXCLUDE** (basket's own output = endogenous) |
| **Clove (cengkeh) cost** | ❌ NONE | — | — | **DATA GAP — unmodellable** |
| **Tobacco-leaf cost** | ❌ NONE (price) | leaf import value/volume `CEICI323781402/...102` | n172 P1M | proxy only (USD value), low prior |
| Headline CPI (real income) | ✅ | `ECONOMICS:IDIRYY` (`id_cpi_yoy`) | P1M | **SPLIT/RE-SIGN** (cost −1 → demand −1 or 0) |
| GDP (demand level) | ✅ | `aIDGDPAR1` (`id_gdp_real_q`) | quarterly | keep |
| Bank credit (liquidity) | ✅ | `aIDLONYAR` (`id_bank_credit`) | P1M | **DROP/low-prior** (cash staple; weak link) |
| **Income Expectations 6m** | ❌ | `aIDCSINC6MN` | P1M | **ADD** (best demand forecast leaf; downtrading lead) |
| **Consumer Confidence** | ❌ | `aIDCONIAR` (`id_consumer_confidence`) | n196 P1M | **ADD** (monthly, timely) |
| **Retail Sales** | ❌ | `aIDRSLSAR` (`id_retail`) | P1M | ADD (attribution) |
| M2 liquidity | ❌ | `aIDM2AR` (`id_m2`) | P1M | optional, low prior |
| USD/IDR (import tail) | ❌ | `FX_IDC:USDIDR` (`usdidr`) | 801 wk | ADD (cost −1, low prior) |
| Defensive duration | ❌ | `id_10y TVC:ID10Y` / `id_bi_rate` | deep | ADD (low prior, bond-proxy) |
| Flow / DXY | ❌ | `TVC:DXY` (NOT `TVC:BBDXY`=0) | 800 wk | optional · **avoid the empty BBDXY** |
| **Excise-step calendar** | ❌ | regime flag (not a series) | — | **ADD as engine flag** (Jan step) |

---

## 8. Forecastability — the honest concession

**Verdict: attribution / event basket, NOT a monthly forecaster.** The basket prints
**fwd IC +0.00, placebo pctile 0.47, hit−up −0.02** (BACKTEST.md, n_oos 129) — dead at
the null median. This is *structural*, not a tuning failure, for four reasons:

1. **The dominant driver is an annual policy step, not a monthly market price.** The
   excise (CK) hike is announced once a year (Oct–Nov) and effective 1 Jan. A monthly
   z-scored liquid-price engine has *nothing leading* to grip: there is no daily excise
   future, no forward curve, no smooth series. The one excise series is *ytd revenue*
   (coincident-to-lagging, saw-tooth). The IMPROVEMENT_PLAN §3 rule — *liquid exogenous
   prices lead, slow policy/quantity prints lag* — places the whole basket on the
   lagging/attribution side.
2. **The cost side is unobservable.** Clove + leaf (the COGS mass) have **no series**;
   the only liquid lever (USDIDR) touches a minor imported tail. Unlike Coal/Plantation/
   F&B, there is **no commodity-lead margin trade** to capture. The forward-skill
   baskets in this engine are *all* physical-commodity cost-pass-through stories
   (BACKTEST §"the pattern"); kretek has no such commodity axis.
3. **Dispersed, offsetting reactions wash the average to zero.** A hike hurts HMSP
   premium mix, can help WIIM small-tier, and leaks to illicit sticks. A single
   equal-weighted basket z-score averages these opposing reactions → no net signal.
   WIIM's β of −0.29 vs the majors' +0.6/+0.8 is this offset made explicit.
4. **Low-variance inelastic volume** gives the engine little month-to-month to predict
   even when correctly signed.

**What COULD give *some* monthly skill (the only honest candidates):**
- **Real-income / downtrading lead (D3).** `aIDCSINC6MN` (income expectations, 6m
  ahead) and `aIDCONIAR` (confidence) are **monthly, timely, and forward-ish**, and
  they lead the *mix* decision (trade-up to premium HMSP vs down to SKT). This is the
  single branch most likely to add a sliver of forward IC — test it as a *demand-mix*
  signal, expecting it to help **HMSP** (premium) more than the basket average.
- **Volume momentum (D5a, IPI Tobacco).** Coincident, but momentum in tobacco IPM can
  proxy the post-hike volume air-pocket vs recovery; **attribution**, not forecast, and
  it is **stale (last_obs 2024-12)** — handle with care.
- **Defensive duration (M2).** `TVC:ID10Y` falling → bond-proxy re-rate of HMSP/GGRM.
  This is a *macro beta*, shared with Pharma/Household, and is the most "forecast-like"
  macro leaf (rates lead the re-rate), but it is a market-wide defensive trade, not
  tobacco-specific alpha.

**What would move it from explainer to forecaster:** realistically, *little*, until
either (a) a **clove/leaf price series** is ingested (would create a genuine cost-margin
lag like F&B), or (b) the engine adds a **discrete excise-event regime** (a Jan-step
dummy + a "year-of-hike-magnitude" overlay) so the policy shock is *modelled as an
event* rather than smeared into a monthly z-score. Absent those, the correct terminal
label is **"contemporaneous attribution of the excise / real-income regime — not a
monthly forecast."** Tag it honestly rather than overclaiming the "perfected" grade.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Tobacco"` SEED with the structure below. Tuple driver =
`(key, role, sign, why)`. **No new `GLOBAL_CORR` tag is needed** (USDIDR/DXY/ID10Y
already exist); the new monthly demand leaves resolve via existing macro aliases
(`id_consumer_confidence`, `id_retail`, `id_m2`) — only **Income Expectations
`aIDCSINC6MN` needs a small new resolver**.

```python
"Tobacco": {
    # keep the basket's own CEIC blocks, but EXCLUDE the endogenous own-output series
    # and RE-ROLE the excise-revenue series (it is collected revenue, not the tariff):
    "ceic": [("Consumer Staples", "Tobacco"),
             ("Consumer Staples", "Tobacco & Cigarette")],
    # cross-block ADD: the monthly volume proxy lives in the Industrials MPI block:
    "ceic_extra": [("Industrials & Manufacturing", "Manufacturing Production Index",
                    "Manufacturing: Tobacco")],   # CEICI323567102 — flag stale (2024-12)
    "ceic_exclude": [
        "GDP: Tobacco Processing",   # CEICI365765267/...827/...697 — basket's OWN output (endogenous)
        "Value Added", "No. of Establishments", "Tobacco processing industry",  # annual structural, n14-18
    ],
    "ceic_override": [
        # excise "duty" is YTD COLLECTED REVENUE (≈vol×tariff), NOT the tariff rate:
        ("CEICI456545587", "demand", 0, "excise REVENUE ytd (not tariff); sign-ambiguous, attribution"),
        # CPI weight cig&tobacco = price-pass-through coincident read:
        ("CEICI522348097", "cost",  +1, "CPI weight cig&tobacco: excise pass-through into the index"),
    ],
    "globals": [
        # NO clove / leaf price exists -> cost tree intentionally near-empty (honest):
        # USDIDR is the only liquid cost lever, and only on the imported-input tail:
        ("usdidr", "cost", -1, "imported leaf/filter/machinery tail (minor; domestic crop dominates)"),
    ],
    "macro": [
        # --- real income / downtrading lead (the ONLY monthly-skill candidates) ---
        ("id_consumer_confidence", "demand", +1, "CCI aIDCONIAR n196 monthly: real-income/downtrading lead (helps premium HMSP)"),
        # income-expectations 6m ahead -> needs a new resolver (see note):
        ("id_income_expect_6m",    "demand", +1, "aIDCSINC6MN income 6m-ahead: leads premium↔SKT mix; LEAD ~1Q"),
        ("id_retail",              "demand", +1, "aIDRSLSAR retail throughput (coincident, pub-lagged; attribution)"),
        # --- affordability / activity ---
        ("id_cpi_yoy",   "demand", -1, "real-income drag on cigarette budget (was cost -1; pricing-power channel offsets, so could be 0)"),
        ("id_gdp_real_q","demand", +1, "disposable-income backdrop / volume level"),
        # --- defensive duration (bond-proxy; the most 'forecast-like' macro leaf) ---
        ("id_10y",       "macro", -1, "HMSP/GGRM high-yield defensives re-rate UP as yields FALL"),
        # --- flow (low prior) -> use TVC:DXY, NOT the empty TVC:BBDXY ---
        ("dxy",          "macro", -1, "foreign-owned EM defensives: USD strength = mild outflow (use TVC:DXY)"),
        # --- DROPPED from seed: id_bank_credit (cash-purchase staple; weak demand link) ---
    ],
},
```

**New resolver needed.** `id_income_expect_6m → aIDCSINC6MN` ("Incomes, 6 months
hence", Consumer Surveys, Index, P1M). Add to the macro alias map in `mapping.py`. If a
new resolver is too heavy for v1, the `id_consumer_confidence` (`aIDCONIAR`) leaf
already covers ~80% of the real-income demand channel — ship that and defer the
expectations leaf.

**Cross-block resolver for the volume proxy.** `Manufacturing: Tobacco`
(`CEICI323567102`) is in the Industrials MPI category, not the Tobacco candidates, so
it needs a `ceic_extra`-style explicit pull (or a direct RIC override). It is the
single best monthly volume read — **but stale (last_obs 2024-12)** → attribution, and
the engine should down-weight or staleness-guard it.

**Excise-step calendar flag (NOT a `mapping.py` driver).** The CK hike is an annual
*event* (announced Oct–Nov, effective 1 Jan). Model it engine-side as a **regime/
calendar overlay** — a Jan "excise-step" dummy and, if feasible, a per-year hike-
magnitude scalar — applied *outside* the monthly z-scoring. Do not try to smear the
annual policy step into a monthly series; that is precisely what kills the IC today.

**What to backtest (the KEEP/REJECT gate, per IMPROVEMENT_PLAN §6):**
1. Re-run `backtest/bt.py "Tobacco"` after each change; KEEP only if forward IC
   improves or holds with a cleaner, more honest tree (never an in-sample-only gain).
2. **Demand-lead test (highest value):** add `id_consumer_confidence` + the income-
   expectations leaf and check whether the real-income/downtrading branch lifts fwd IC
   off zero — expect a *small* gain, concentrated on **HMSP** (premium mix), and test
   per-name, not just basket-average (the average offsets HMSP↑ vs WIIM↓).
3. **Endogenous ablation:** confirm EXCLUDING `GDP: Tobacco Processing` (own output)
   and DROPPING `id_bank_credit` each hold or raise IC (i.e. they were noise/endogenous).
4. **Re-sign CPI:** test `id_cpi_yoy` at demand −1 vs 0 vs cost −1; report which the
   data prefers (real-income drag vs pricing-power offset).
5. **Excise-event overlay:** if implemented, test whether the Jan-step regime flag +
   hike-magnitude overlay does what no monthly series can — capture the policy shock as
   an event. This is the *only* change with a real shot at moving the verdict from
   "attribution" toward "forecast."
6. **Honesty gate:** if (2)+(5) still leave fwd IC ≈ 0 / sub-0.90 placebo, **relabel
   the terminal verdict from "perfected/forecast" to "attribution — excise event
   basket, no monthly forward skill,"** rather than carrying a misleading grade.
```
