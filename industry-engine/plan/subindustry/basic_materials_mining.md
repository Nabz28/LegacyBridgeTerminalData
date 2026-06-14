# Mining (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-A
> target: big mcap **and** currently anti-predictive. All series cited exist in
> `catalog/{idind,id,cn,market}.json`; RICs + n_obs are real.

---

## 1. Snapshot — and the OOS-negative gap

| field | value |
|---|---|
| basket | **Mining**, sector Basic Materials |
| mcap | **492 T** (4th-largest sub-industry in the universe) |
| members | **AMMN** (copper-gold, ~43% of basket cap), **MDKA** (copper-gold + nickel HPAL), **BRMS** (gold), **NCKL** (nickel/HPAL), **ARCI** (gold-copper), **CITA** (nickel/bauxite), tail of smaller miners |
| current grade | **partial** |
| current kept drivers | **12** |
| **current forward OOS skill** | **IC −0.15 · hit−up −0.14 · placebo pctile 0.05 · flag `none`** |

This is the single worst forward-IC reading in the whole 52-basket backtest table
(tied with Banks at −0.15; only Tower −0.20 and Utilities −0.22 are lower, and both
are tiny). **An IC of −0.15 at the 5th placebo percentile is not "no skill" — it is
*reliably anti-predictive*.** The engine's current posture, applied blindfolded one
month forward, has been systematically *wrong* on the sign.

**Why that is diagnostic, not random.** The current seed (see §7) mixes **copper**
(`copper`, +1) and **gold** (`gold`, +1) as if they were one revenue metal, then
overlays **China IP** (+1), **USD/IDR** (+1) and **DXY** (−1). Copper and gold are
driven by *opposite* macro states:

- **Copper** rises with global growth / China credit / risk-on; falls when the
  dollar and real yields rise.
- **Gold** rises when real yields and the dollar *fall* (risk-off, easing); it is a
  monetary, not a cyclical, asset.

Averaging a +1 copper signal and a +1 gold signal into one basket posture means the
engine is long "both metals up together" — a state that, macro-historically, is the
exception, not the rule. When growth accelerates (copper up, gold flat/down) or when
the Fed eases into a slowdown (gold up, copper down), the blended signal points the
wrong way. The basket *is* roughly 43% AMMN, which is itself a copper-**and**-gold
producer, so the two metals partly net inside a single name — but the macro *signal*
the engine sends does not net; it double-counts a coincidence. **That sign-confusion
is the mechanical source of the −0.15.** Fixing it is the entire job of this file:
split the tree by metal and give each sleeve its *own* correct macro driver.

---

## 2. Economic structure — how this basket makes money

Every name here is a **price-taker on a globally-quoted metal**, selling USD-priced
output off an IDR/USD cost base. The revenue identity is the same for all:

```
Revenue ≈ Σ_metal ( global_price[metal] × volume[metal] )      (USD)
EBITDA  ≈ Revenue − AISC×volume − royalty − treatment/refining charges
AISC    = mining cost + processing + G&A − by-product credits   (the cost floor)
```

Two economically distinct engines sit inside one IDX label:

**(a) The copper-gold engine — AMMN, MDKA, ARCI, BRMS (~70%+ of basket cap).**
Porphyry copper deposits carry **gold as a co-/by-product**. AMMN (Batu Hijau /
Elang) and Freeport-style geology produce a copper concentrate whose gold content is
credited against copper AISC. So a single name has **two revenue metals with opposite
macro drivers**:
- copper revenue ← global growth / China (cyclical),
- gold revenue ← real yields / USD (monetary, counter-cyclical).
The **by-product credit** means gold strength can *lower* effective copper AISC even
when copper price is soft — a natural hedge inside the name, but one the current flat
seed cannot represent. MDKA adds a **nickel/HPAL** leg (Konawe) on top of its
gold (Tujuh Bukit), making it a three-metal composite.

**(b) The nickel engine — NCKL, CITA, MDKA's HPAL sleeve.** Indonesian nickel is
**ferronickel / NPI (nickel pig iron) + HPAL MHP** feeding the **China stainless-steel
and EV-battery** chains. Revenue ≈ LME-nickel-linked price × tonnes, but realised
price is heavily policy-shaped: the **2020 ore-export ban** forced downstream smelting
(higher local volume, captured value-add), while the **2023–24 RKAB permitting glut**
and Indonesian supply flood **crashed the LME nickel price** from ~$30k to ~$16k/t —
the dominant reason the nickel sleeve has been a drag. China stainless output is the
swing demand; EV-battery (Class-1 sulphate) is the structural-growth overlay.

**What a sell-side analyst actually watches**, name by name:
- AMMN/MDKA: **COMEX copper, COMEX gold**, head grade / strip ratio, **AISC vs oil &
  grid power**, smelter ramp (AMMN's own smelter), treatment-and-refining charge (TC/RC).
- NCKL/CITA: **LME nickel** (proxied — see §7 data gap), **China stainless output &
  300-series inventory**, NPI-vs-LME discount, **MHP payable %**, ore HPM (govt
  benchmark price), the **ore-export-ban / RKAB quota** policy state.
- All: **USD/IDR** (USD revenue, IDR cost → translation tailwind on weak IDR),
  **DXY / US real 10Y** (metals discount), royalty regime, energy cost.

The split in (a) vs (b) is why a *single* blended driver posture fails: the basket is
two opposite macro animals stapled together.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return
> vs IHSG for a *rise* in the driver. `lead` = expected months the driver moves
> *before* the equities (the forecastability claim). Price/rate series are liquid and
> exogenous → forecast candidates; CEIC quantity prints are publication-lagged →
> attribution.

### D1 — COPPER demand (cyclical; the AMMN/MDKA copper leg)
```
COPPER demand
├─ D1a global growth / China IP ─► [aCNIP CN IP YoY, w524]      sign +1 · lead 1–2m · attribution
│                                  [COMEX:HG1! copper, w800]    sign +1 · lead 0–1m · FORECAST
├─ D1b China credit impulse ─────► [aCNSFLMA Social Financing Flow, w524]  sign +1 · lead 3–6m · FORECAST*
│      (parent of copper demand)   [aCNLPR5YRR 5Y LPR, w350]    sign −1 · lead 3–6m · FORECAST
└─ D1c global manufacturing ─────► [aCNPMIMT CN NBS Mfg PMI, w524]  sign +1 · lead 1–2m
                                   (US ISM / global PMI co-moves)
```
- **D1a mechanism.** Copper is "Dr. Copper" — its price *is* the global-growth state
  variable. `COMEX:HG1!` (the LME-equivalent we hold, n=800 weekly) is the direct
  revenue driver for the copper leg and is *liquid and exogenous*, so it leads the
  IDX equities by 0–1 month rather than lagging.
- **D1b mechanism — the key forecast branch.** Chinese **credit impulse** (the YoY
  change in the flow of aggregate financing, `aCNSFLMA`) leads **physical copper
  demand by one to two quarters**: credit → property/infra starts → wire & cable →
  refined-copper draw. This is the cleanest *leading* fundamental in the whole tree.
  `*` It is a CEIC print (publication-lagged ~2–4 weeks), so use it as a slow leading
  signal, not a same-week trigger; the **price** that *anticipates* it is `COMEX:HG1!`.
- **D1c.** China mfg PMI (`aCNPMIMT`) is the survey pulse; corroborates D1a.

### D2 — GOLD demand (monetary / counter-cyclical; the AMMN/MDKA/BRMS gold leg)
```
GOLD demand
├─ D2a US real 10Y yield ────────► [DFII10 US 10Y Real, w800]   sign −1 · lead 0–1m · FORECAST (INVERSE)
├─ D2b broad USD ────────────────► [TVC:BBDXY DXY, w?]          sign −1 · lead 0–1m · FORECAST (INVERSE)
├─ D2c gold spot itself ─────────► [COMEX:GC1! gold, w800]      sign +1 · lead 0–1m · FORECAST
└─ D2d risk-off / real-rate vol ─► [CBOE:VIX, w800] (secondary) sign +1 · lead 0m
```
- **D2a is the single most important fix in this file.** Gold's opportunity cost is
  the **real** yield; `DFII10` (TIPS 10Y real, n=800 weekly) is *the* gold driver and
  it carries a **−1** sign (real yields up → gold down → gold-leg revenue down). The
  current seed has **no real-yield driver at all** — it is the missing variable that,
  more than anything, makes the gold leg unforecastable today.
- **D2b.** Gold is priced in USD; a stronger broad dollar (`TVC:BBDXY`) mechanically
  caps the USD gold price → **−1**. (Note: DXY is *also* a copper headwind, so its
  basket-level sign is genuinely negative across *both* legs — the one macro driver
  that points the same way for copper and gold.)
- **D2c.** `COMEX:GC1!` is the direct revenue series for the gold leg; exogenous,
  leads the equities.

### D3 — NICKEL demand (China stainless + EV battery; the NCKL/CITA/MDKA-HPAL leg)
```
NICKEL demand
├─ D3a China stainless output ───► [aCNCNBFWHM Crude Steel National, w?]  sign +1 · lead 1–2m · attribution
│      (300-series = nickel sink)  (stainless-specific output not in store; crude steel = proxy)
├─ D3b EV-battery pull ──────────► [AMEX:LIT lithium/battery ETF, w?]     sign +1 · lead 0–1m · weak proxy
├─ D3c Indonesia nickel export $ ► [CEICI388026027 Ferro alloy nickel exp val, USD mn, n112]  sign +1 · lead 0m · PRICE×VOL proxy
│      (CEIC override — see §7)     [CEICI294139602 Antam nickel ore prod, WMT, n111]  sign +1 (volume)
└─ D3d China property (nickel via  ► [aCNHPIAR House Px Newly Built YoY, w524]  sign +1 · lead 2–4m
        stainless appliances/build)  [aCNBCOMPCB Floor Space Completed, mn sqm]   sign +1 · lead 2–4m
```
- **D3a mechanism.** ~70% of global nickel ends up in **stainless steel**; China is
  ~60% of stainless. China **crude-steel output** (`aCNCNBFWHM`, monthly) is the best
  in-store proxy for the stainless swing (no stainless-only series exists). Attribution,
  publication-lagged.
- **D3c is the data-gap workaround (detailed in §7).** With **no clean LME nickel
  price** (`wb_nickel → None`), Indonesia's **ferronickel export *value*** in USD
  (`CEICI388026027`, n=112, runs to 2026-04) is `price × volume` — a *price-inclusive*
  demand proxy. Pair with the Antam **ore-production volume** (`CEICI294139602`, n=111)
  to separate the price component (value ÷ volume ≈ realised $/unit). Both are CEIC →
  publication-lagged → attribution, not forecast.
- **D3d.** China property is a *shared* copper+nickel demand channel (rebar→steel for
  copper-wired buildings; stainless appliances/elevators for nickel). `aCNHPIAR`
  (newly-built house prices YoY) and `aCNBCOMPCB` (completed floor space) lead the
  metals-demand impulse by a quarter.

---

## 4. SUPPLY / COST driver tree (AISC stack + policy)

```
COST / SUPPLY
├─ S1 energy in AISC ────────────► [ICEEUR:BRN1! Brent, w800]   sign −1 · lead 0–1m · cost (diesel haulage, generators)
│                                  [ICEEUR:ATR1! API2 coal, w800]  sign −1 · lead 0–1m · cost (smelter/grid power, esp. nickel)
├─ S2 ore grade / strip ratio ───► (name-level, no clean series) — idiosyncratic, not wired
├─ S3 smelter ramp / TC-RC ──────► [CEICI294139602 Antam ore prod, WMT] (own-volume) sign +1 · supply
│      AMMN smelter, MDKA HPAL      treatment/refining charge — not in store
├─ S4 Indonesia nickel-ore EXPORT-BAN regime ─► POLICY (no price series)
│      ├─ ore-export ban (2020→)   raises local smelting volume, captures value-add  sign +1 structural
│      └─ RKAB quota glut (2023–4) Indo oversupply → LME nickel crash               sign −1 realised-price
│      proxy: [CEICI388026027 ferronickel export val] inflection + news/manual flag
├─ S5 Philippine ore (marginal supply) ─► (no in-store series) — qualitative
└─ S6 treasury-metal spread ─────► [COMEX:GC1! gold] − [COMEX:HG1! copper] by-product-credit spread (AMMN AISC)
```
- **S1 — the AISC swing.** Diesel (haulage, mine generators) tracks **Brent**; smelter
  & grid **power** for nickel/copper smelting tracks **thermal coal (API2)**. Both are
  *cost* (−1). Nickel smelting (NPI/HPAL) is especially energy-intensive → coal cost is
  a first-order nickel-margin driver, not a footnote.
- **S4 — the policy regime, handled honestly.** There is **no price series for the
  export-ban policy state**. Its *effect* shows up as inflections in Indonesia's
  ferronickel export value (`CEICI388026027`). Wire the export-value series; flag the
  ban/RKAB regime as a **manual/news annotation**, not a fitted driver. The structural
  ban is bullish (value capture); the 2023–24 quota glut was bearish (price crash) —
  the engine should not pretend a single sign captures both.
- **S6 — the by-product spread.** For AMMN, effective copper AISC falls when gold
  (the by-product credit) outpaces copper. The **gold-minus-copper** relative is a
  real margin lever, expressible from two series we already hold.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR ──────────────────► [FX_IDC:USDIDR, w?]   sign +1 · lead 0m · macro (USD revenue, IDR cost → weak IDR helps)
├─ M2 broad USD (DXY) ──────────► [TVC:BBDXY, w?]        sign −1 · lead 0–1m · macro (metals priced in USD; EM-flow headwind)
├─ M3 US real 10Y ──────────────► [DFII10, w800]         sign −1 · lead 0–1m · macro (GOLD leg discount; also growth-duration)
├─ M4 risk appetite ────────────► [CBOE:VIX, w800] / [NASDAQ:NDX] (secondary)  copper +/risk-on, gold +/risk-off (net ~0 at basket level)
└─ M5 US nominal 10Y ───────────► [TVC:US10Y, w800]      sign ~ · global discount rate (weaker than real-yield channel)
```
- **M1 USD/IDR = +1** is correct and uncontested: these names earn USD and spend a
  large IDR share, so IDR depreciation is a translation tailwind. Keep.
- **M2 DXY = −1** is the one macro variable that is *unambiguously* negative for the
  *whole* basket (caps both copper and gold). Keep, and lean on it.
- **M3 DFII10 = −1** is the **new** macro driver and the gold-leg fix from §3 D2a —
  it belongs in the macro overlay too because real yields also compress mining
  duration generally.
- **M4 risk appetite is deliberately *not* given a strong sign**: VIX-up hurts the
  copper/cyclical leg but *helps* the gold leg, so at the blended-basket level it
  nets near zero. Forcing a sign here is exactly the kind of false precision that
  produced the −0.15. Leave it out or at 0.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `ICEEUR:ATR1!` API2 coal | Energy / Coal | **cost** (S1) | smelter & grid power for nickel/copper processing |
| `aCNCNBFWHM` China crude steel | (China IP block) | **demand** (D3a) | stainless = nickel's #1 sink |
| `aCNHPIAR` / `aCNBCOMPCB` China property | (China housing) | **demand** (D1/D3d) | property → copper wire + stainless fittings |
| `aCNSFLMA` China social financing | (China money) | **demand** (D1b) | credit impulse leads copper demand |
| `SGX:FEF1!` iron ore *(optional, watch only)* | Metals/Steel | context | China-construction read-through; **do not** wire as a Mining revenue driver (no member produces iron ore) |
| `COMEX:GC1!` gold | (own) | by-product credit (S6) | also AMMN's effective AISC offset |

Note the deliberate **negative** linkage: iron ore is a *China-demand thermometer* but
must **not** be wired as a Mining revenue series (that error belongs to the separate
"Metals & Mining" nickel basket and the "Metals" steel basket — not here).

---

## 7. Currently wired vs available — and the nickel-price DATA GAP

### 7a. Wired now (the 12-driver `Mining` seed) vs proposed

| driver (now) | role/sign now | verdict | proposed change |
|---|---|---|---|
| `copper` `COMEX:HG1!` | supply +1 | **keep**, re-tag to **copper sleeve** | split out; pair with China credit |
| `gold` `COMEX:GC1!` | supply +1 | **keep**, re-tag to **gold sleeve** | pair with `DFII10`/`DXY` (the missing macro) |
| `wb_nickel` → **None** | supply +1 | **DEAD** (resolves to nothing) | replace with CEIC override (below) |
| `cn_ip_yoy` `aCNIP` | demand +1 | keep (copper attribution) | add `aCNSFLMA` credit impulse (leading) |
| `usdidr` `FX_IDC:USDIDR` | macro +1 | keep | — |
| `dxy` `TVC:BBDXY` | macro −1 | keep | lean harder; it's the one all-basket-negative macro |
| *(none)* `DFII10` real 10Y | — | **ADD −1** | the gold-leg fix; biggest single improvement |
| *(none)* `ICEEUR:BRN1!` Brent | — | **ADD cost −1** | AISC energy |
| *(none)* `ICEEUR:ATR1!` API2 coal | — | **ADD cost −1** | smelter/grid power (nickel-heavy) |
| *(none)* `aCNSFLMA` social financing | — | **ADD demand +1** | leading copper-demand branch |
| *(none)* CEIC ferronickel export $ | — | **ADD via `ceic_override`** | the nickel-price proxy |

### 7b. The nickel-price data gap — concretely

`wb_nickel` maps to **None** in `GLOBAL_CORR`; there is **no LME nickel future** in
`correlation.sqlite`. The current `Mining` seed lists `("wb_nickel","supply",+1,…)`
which silently **resolves to nothing** (engine falls back to the live indicator's
`spark`, flagged low-confidence) — so the nickel sleeve is effectively *unmodelled*
today. Three options, in order of preference:

1. **PREFERRED — CEIC nickel export-value override (price-inclusive, in-store).**
   In `ceic_override`, wire **`CEICI388026027`** (*Export value: Ferro alloy nickel*,
   USD mn, **n=112**, → 2026-04) as `("ferro alloy nickel","demand",+1)`, plus
   **`CEICI294139602`** (*Antam nickel ore production*, WMT, **n=111**) as a *volume*
   control. Export **value = realised price × volume**, so it carries the nickel-price
   signal we lack; dividing value by the volume series recovers an implied realised
   $/unit. Limitation: monthly, **publication-lagged ~3–6 weeks**, and value blends
   price with volume — strictly **attribution, not forecast**. This is the honest
   primary fix.

2. **ACCEPTABLE proxy with a caveat — `AMEX:PICK` (Industrial Metals Miners ETF,
   n=744 weekly).** Liquid, daily, leads. But it is an *equity* basket of global
   miners (BHP/Vale/Glencore), so using it to predict IDX miners is **partly circular**
   (miner-equity → miner-equity). Use it only as a **context/regime overlay**, never as
   the primary nickel driver, and never let it dominate the posture. `AMEX:COPX`
   (Copper Miners, n=800) and `AMEX:XME` (Metals & Mining, n=800) have the same
   circularity caveat — fine as sanity overlays, wrong as the seed's backbone.

3. **REJECT for nickel — `NYSE:VALE` (n=800).** Vale is an **iron-ore + nickel** major;
   using it as a nickel proxy imports a huge iron-ore signal that is *wrong* for this
   basket (no member produces iron ore). Too contaminated; do not wire.

**Recommendation:** use **option 1** as the wired nickel driver (CEIC override), keep
**option 2 (`PICK`/`COPX`)** only as an optional low-weight regime context, and reject
VALE. The nickel sleeve is ~20–25% of basket cap, so getting it *roughly right via
export value* matters less than getting the **copper-gold macro split** right — which
is where the −0.15 actually comes from.

---

## 8. Forecastability — why the current set is anti-predictive, and the fix

**Diagnosis (the −0.15).** The basket is anti-predictive for one structural reason:
**copper and gold have opposite macro drivers, and the current seed signs them the
same way and blends them.** Concretely:

- The seed is long `copper(+1) + gold(+1)` → it implicitly bets on the **rare** joint
  state "growth-metal *and* monetary-metal both rallying." Most months are *not* that
  state; they are either "growth up, gold flat/down" or "easing into slowdown, gold up,
  copper down." In both common states the blended signal has the **wrong sign on one
  leg**, and because the legs are similar magnitude, the basket posture flips wrong.
- Worse, the seed **lacks the real-yield variable entirely** (`DFII10`), so the gold
  leg has *no* correct macro anchor — it free-rides on `cn_ip_yoy`/`usdidr`, which are
  copper/cyclical variables that are **anti-correlated** with what actually moves gold.
- The mining-conglomerate names are also **mean-reverting sentiment vehicles** (BACKTEST
  §"the pattern" explicitly groups "Mining-conglomerates" with the no-forward-skill,
  contemporaneous-only cluster): they co-move with their drivers *this* month and give
  it back *next* month, so a contemporaneous posture forecasts negatively.

**The path to forward skill.** Two concrete, testable moves:

1. **Split the basket signal by metal sleeve and give each its correct leading macro.**
   - **Copper sleeve** (AMMN/MDKA/ARCI weight): driver = **China credit impulse
     (`aCNSFLMA`, +1, lead 3–6m)** anticipating **`COMEX:HG1!`**. Credit impulse is a
     genuine *leading* fundamental for copper demand — the one branch with a real
     forward claim.
   - **Gold sleeve** (BRMS + AMMN/MDKA by-product): driver = **US real 10Y
     (`DFII10`, −1, lead 0–1m)** and **DXY (`TVC:BBDXY`, −1)**. Real yields are the
     gold opportunity cost; this is the missing anchor.
   - Net the two sleeve signals with **cap weights**, not a naive average, so AMMN's
     internal copper/gold mix is represented once, correctly, instead of double-counted.

2. **Demote the contemporaneous/mean-reverting drivers to attribution.** Tag
   `cn_ip_yoy`, the CEIC export-value nickel proxy, and `usdidr` as **explainers**
   (contemporaneous attribution) and let the **leading price/rate series**
   (`aCNSFLMA`→`HG1!`, `DFII10`, `DXY`) carry the forward claim. This matches the
   backtest's own rule of thumb: liquid exogenous *price/rate* series lead; slow CEIC
   *quantity* prints are coincident/lagging.

**Honest expectation.** Even done right, this is a **diversified, partly sentiment-led
basket** — the realistic target is to move forward IC from **−0.15 (reliably wrong)**
toward **0 / mildly positive**, i.e. to stop the engine confidently mis-signing, and
to earn a small positive lead from the credit-impulse→copper and real-yield→gold
channels. A SKILL-grade (+0.10) outcome would require the credit-impulse lead to
dominate; that is the upside case to test, not the base case.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Mining"` seed with the metal-split tree below. (`copper`/`gold`
already resolve to `COMEX:HG1!`/`COMEX:GC1!`; `dxy`→`TVC:BBDXY`; `brent`→`ICEEUR:BRN1!`;
`wb_coal_au`→`ICEEUR:ATR1!`; all populated. `aCNSFLMA` is a **new** macro key — add it
to `GLOBAL_CORR` first.)

```python
# --- add to GLOBAL_CORR (China credit impulse — leading copper-demand driver) ---
#   "cn_social_fin": "aCNSFLMA",   # CN Social Financing Flow YoY (w524)
#   "us_real_10y":   "DFII10",     # US 10Y real (already used by other baskets)

"Mining": {  # AMMN/MDKA copper-GOLD led + NCKL/CITA nickel sleeve. Metal-SPLIT tree.
    # copper + gold + (nickel via CEIC export-value, since wb_nickel->None).
    "ceic": [("Basic Materials", "Copper"),
             ("Basic Materials", "Gold & Precious Metals"),
             ("Basic Materials", "Nickel"),
             ("Metals & Mining", None)],
    # nickel-price DATA GAP: ferronickel export VALUE = price×volume proxy (n112);
    # ore-production volume as the volume control (n111). Attribution, not forecast.
    "ceic_override": [("ferro alloy nickel", "demand", +1),     # CEICI388026027
                      ("antam nickel",       "demand", +1),     # CEICI294139602 (volume)
                      ("copper ore",         "supply", +1),     # CEICI357008177 (own volume)
                      ("gold export",        "supply", +1)],
    "globals": [
        # --- copper sleeve (cyclical) ---
        ("copper",        "supply", +1, "COMEX copper = AMMN/MDKA copper revenue (leading price)"),
        # --- gold sleeve (monetary) — the fix: opposite macro from copper ---
        ("gold",          "supply", +1, "COMEX gold = BRMS + AMMN/MDKA by-product revenue"),
        ("us_real_10y",   "macro",  -1, "US real 10Y = gold opportunity cost (MISSING before; gold-leg anchor)"),
        # --- AISC energy cost ---
        ("brent",         "cost",   -1, "diesel/haulage AISC"),
        ("wb_coal_au",    "cost",   -1, "smelter & grid power (nickel/copper processing)"),
    ],
    "macro": [
        ("cn_social_fin", "demand", +1, "China credit impulse LEADS copper demand (3-6m) — forward branch"),
        ("cn_ip_yoy",     "demand", +1, "China IP = metals-demand attribution (coincident)"),
        ("dxy",           "macro",  -1, "broad USD caps BOTH metals (only all-basket-negative macro)"),
        ("usdidr",        "macro",  +1, "USD revenue vs IDR cost (translation tailwind on weak IDR)"),
        # risk-appetite (VIX/NDX) deliberately OMITTED: nets ~0 across copper vs gold legs.
    ],
},
```

**Notes for the implementer.**
- `wb_nickel` is **removed** from the seed (it resolved to None — a dead driver).
- `cn_social_fin`/`us_real_10y` must be added to `GLOBAL_CORR` (RICs `aCNSFLMA`,
  `DFII10`) before the seed references them.
- Keep the China-property series (`aCNHPIAR`, `aCNBCOMPCB`) available via the China
  category pull but **do not hard-wire with a forced sign** in v1 — add only if the
  backtest shows it helps (it is a slow, shared copper/nickel channel).
- **iron_ore / VALE are intentionally absent** — no member produces iron ore.

**What to backtest (the keep/kill gate).** Run `backtest/bt.py "Mining"` and KEEP the
change only if forward IC **moves up from −0.15** (target: ≥ 0, ideally toward the
placebo median). Specifically test, as ablations:
1. **metal-split + `DFII10`** (the core hypothesis) vs the current flat seed —
   expect the largest IC gain here;
2. **+ `aCNSFLMA` credit-impulse** (lead 3–6m) — does the *leading* branch add forward
   skill beyond the contemporaneous set?
3. **nickel via CEIC export-value override** vs **nickel dropped entirely** — confirm
   the proxy is additive, not noise (if export-value hurts forward IC, drop it and run
   Mining as a clean copper-gold basket).
4. confirm **DXY −1** and **USD/IDR +1** still survive the theory-reconciliation gate.

The success criterion is honest: this basket may never be a strong forecaster, but it
must **stop being reliably wrong**. Killing the copper/gold sign-confusion and adding
the real-yield anchor is the move that gets it from −0.15 to neutral.
