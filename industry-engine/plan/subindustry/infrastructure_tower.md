# Tower (Telecom Towers / Passive Infrastructure) — deep driver-tree plan

> Basket id `infrastructure_tower` · sector Infrastructure · benchmark JCI ·
> 2 members · mcap ≈ 2.51T IDR · grade **partial** · kept **1** ·
> blindfolded forward OOS **none** · fwd IC **−0.195** · hit−up −0.06 ·
> placebo percentile **0.02** (i.e. the engine's posture is **worse than 98% of
> random placebos** — it is *strongly anti-predictive*, not merely skill-less).
> This is the loudest negative-skill signal in the entire 52-basket panel
> (only Utilities −0.218 is lower, and for a related reason).

**Headline finding (the bug).** The Tower posture is anti-predictive because the
engine is wiring the **wrong block with the wrong sign**: the SEED maps
`ceic = [("Telecom", None)]`, but the CEIC "Telecom" industry block in this store
is **not towers** — it is **30 Card-Transaction + 23 E-Money/card-payment series**
(plus 2 BTS counts). All 53 payment series are CEIC-tagged `demand`, and the engine
defaults every `demand` CEIC series to sign **+1** (`drivers.py:_ceic_role_sign`,
line 133). So the basket is told *"towers rise when card-payment volume rises"* — a
pro-cyclical **nominal-growth / consumption** posture. Towers are the purest
**bond proxy** in the market (contracted, inflation-linked lease cashflow on a
heavily levered balance sheet → return is almost all discount-rate duration), so the
correct posture is the **opposite**: load the rate curve **−1**. The 2 correct rate
drivers in the SEED (`id_bi_rate −1`, `us_10y −1`) are outvoted ~13:1 by the
mis-signed payment block, and the residual sign of the whole tree flips positive on a
duration asset → −0.195 forward IC. **The fix is a block swap + sign re-role, not a
parameter tweak.** Details in §7 and §9.

---

## 1. Snapshot

| | |
|---|---|
| Basket id | `infrastructure_tower` |
| Sub-sector | Tower (Infrastructure) |
| Members (engine) | **CENT** (Centratama Telekomunikasi / Edge Point Indonesia — independent tower-co, beta 0.38, ≈2.37T, **94% of basket mcap**), **LCKM** (Lockton/Locktama Mineratama tower-network services, beta 0.39, ≈0.14T, 6%) |
| Total mcap | ≈ 2.51T IDR (`worklist.json`) |
| Grade / kept / conf | partial / **1 kept driver** / low |
| Forward OOS (BACKTEST.md) | **none** · fwd IC **−0.195** · placebo pctile **0.02** · n_oos 127 |
| Current SEED | `ceic [("Telecom", None)]` · globals [] · macro `id_bi_rate −1`, `us_10y −1` |

**Economic archetype vs the actual basket.** The brief's archetype names
**TBIG (Tower Bersama) + TOWR (Sarana Menara / Protelindo)** — the two large listed
independent tower-cos and the canonical bond-proxy towers. **They are not in this
2-name engine basket** (the engine's universe survives to today and slots names by
sub-sector; CENT + LCKM are what carry the `Tower` tag). This matters two ways:
(1) CENT *is* a genuine independent tower-co (Edge Point / Centratama portfolio of
~1,200+ towers) — the economics below hold; (2) the basket is **highly concentrated**
(CENT = 94% mcap), so the basket return is essentially CENT, a small-cap, thinly
traded, low-beta (0.38) tower name. Wire the tree to **TBIG/TOWR-style economics**
(the correct duration posture) and treat the kept signal as **attribution on a
concentrated, illiquid name**, not a high-confidence forecast. Where the data and
wiring are identical for TBIG/TOWR, this file is the reference for the whole
sub-industry.

**The gap.** A 3T sub-industry is "modelled" with **1 kept driver** and an
**anti-predictive** posture. The store holds the exact series a tower analyst wants —
the full ID + US govt curve (`TVC:ID10Y` 798, `TVC:ID30Y` 738, `TVC:US10Y` 800),
the **US real 10Y `DFII10` (800 wk obs, populated but UNWIRED)**, breakeven
inflation (`TVC:US10YIE` 800), curve slope (`US10Y-US02Y` 800), real CEIC IDR
lending/deposit rates (`CEIC224795501` n=480), and telco-capex/BTS demand proxies —
**none of the rate-duration tree is wired**, and the block that *is* wired is the
wrong one with the wrong sign.

---

## 2. Economic structure — how a tower-co makes money

**Revenue identity.** `Revenue = Σ towers × tenancy_ratio × monthly_rent × (1 + escalator)^t`.
- **Towers** (capacity): the asset base. Grows by build-to-suit + acquisition.
- **Tenancy ratio** (utilisation): tenants per tower (1.0 → 2.0+). The single biggest
  operating-leverage lever — a second tenant on an existing tower is ~near-100%
  incremental margin (colocation). This is the only real *volume/demand* variable.
- **Rent per tenancy**: set by **long-term (8–10yr) master-lease agreements**, mostly
  fixed in IDR with an **inflation/CPI escalator**. Revenue is therefore *contracted,
  visible, and inflation-linked* — bond-like.
- **Escalator**: CPI-indexed → inflation is a *small revenue tailwind*, not a cost.

**Cost stack.** Towers are ~98% fixed once built: ground lease, O&M, power (for some
sites), and — dominating everything — **interest expense on a large debt load**.
Tower-cos run very high leverage (net debt / EBITDA ~3–5x) because the cashflow is
contracted and predictable, exactly like a utility or a REIT. **Margin swing factor =
the cost and duration of debt**, i.e. interest rates. A 100bp move in the funding
curve moves both the interest bill *and* the present value of the 8-year contracted
annuity. There is **no commodity input, no FX revenue, no demand cyclicality** in the
classic sense — the only "demand" is incremental colocation, which is slow and
contracted forward.

**Why this is the purest bond proxy in the market.** Stable contracted cashflow +
heavy leverage = the equity is a **levered long-duration annuity**. Its fair value is
`Σ contracted_lease_t / (1+r)^t − net_debt`. Almost all of the variance in the equity
is the **discount rate `r`** (govt curve) and the **credit spread on the debt**. When
rates fall, the annuity is worth more *and* refinancing is cheaper → the equity
re-rates up. When rates rise, the opposite. Sign on the rate curve is unambiguously
**−1**. This is *more* rate-sensitive than property (which has cyclical pre-sales
demand) and *more* than a normal utility (which has a regulated-WACC reset). Towers
have the longest contractual duration and the least demand cyclicality → the highest
pure-duration loading of any IDX sub-industry.

**What a sell-side analyst watches** (in order of price impact):
1. **10Y govt yield (ID & US) and the real yield** — the discount rate. Dominant.
2. **Refinancing schedule & funding spread** — credit channel; USD-debt portion.
3. **Tenancy / colocation adds & build-to-suit pipeline** — telco capex (5G/4G fill).
4. **Lease-renewal pricing & churn** (Indosat/XL merger consolidation reduced tenants).
5. **Inflation print** (escalator pass-through — second-order tailwind).

**Intra-basket dispersion.** CENT (94%) dominates → the basket *is* CENT, a small
independent tower-co. LCKM is a tiny network-services name. Neither is as
liquid/clean a duration play as TBIG/TOWR, so expect a **lower, noisier rate beta**
than the textbook — but the *sign* is still −1. Concentration also means
idiosyncratic CENT events (ownership changes, tower-portfolio M&A) inject noise the
macro tree cannot explain.

---

## 3. DEMAND driver tree (tenancy / colocation — the only real volume lever)

Demand for towers = **telco network rollout** (more sites + more colocations). It is
slow, contracted forward, and CEIC-measured only by lagging quantity prints → good
for **attribution, weak for forecasting**. The *leading* version of this branch is
not in CEIC; it is the telcos' own capex guidance and their equity (cross-ref Telco).

```
DEMAND (tenancy growth)
├── D1 Telco network capex / 5G–4G rollout  ──► BTS (base-station) build
│     └── CEICI65399201 · BTS: Telkomsel (quarterly) · supply-tag · n=97 · P3M
│     └── CEICI65990601 · BTS: Indosat (annual)       · supply-tag · n=26 · P1Y
├── D2 Subscriber / data-traffic growth (drives telco capex → tenancy)
│     └── CEICI65397101 · Telkomsel: Customer Base · n=97 · P3M
│     └── CEICI265785702 · Mobile Cellular Subscriptions · n=53 · P1Y
└── D3 Telco financial health (can they pay rent / add tenants?)  → cross-ref Telco basket
      └── (telco ARPU / blended-rev series, low-n quarterly; see Telco file)
```

| leaf | series (ric) | n_obs | role | sign | lead | mechanism | data quality |
|---|---|---|---|---|---|---|---|
| BTS Telkomsel | `CEICI65399201` | 97 | demand | **+1** | ~0 / lag | base-station count = sites that need towers = tenancy | **quarterly, coincident/lagging**, pub-lagged → attribution only |
| BTS Indosat | `CEICI65990601` | 26 | demand | **+1** | lag | second-operator rollout = colocation demand | annual, too few obs to score reliably |
| Telkomsel cust. base | `CEICI65397101` | 97 | demand | **+1** | lag | subscriber growth → data → capex → tenancy | quarterly, slow, lagging |
| Mobile subs | `CEICI265785702` | 53 | demand | **+1** | lag | national penetration | annual |

**Forecast hypothesis (demand):** *none of these forecast.* They are quarterly/annual,
publication-lagged quantity prints that move *after* the capex decision and *long
after* the tower equity has discounted it. Their only legitimate engine use is
**override the wrong-block payment series with these 4 genuinely-tower-relevant
demand series** and keep them at low weight for **attribution** (does tenancy growth
explain a sliver of co-movement?). They will not, and should not, drive the forward
posture. **The demand side of a bond proxy is a rounding error; the discount rate is
the whole game.**

---

## 4. SUPPLY / COST driver tree (debt service is the entire cost stack)

There is **no commodity input** and **no capacity-price** branch for towers. The
"cost" is financial: the level and duration of interest rates and the credit spread.
This collapses the supply/cost tree into the **rate / FX / flow** block (§5) — which
is *correct* for a bond proxy and is the heart of the fix.

```
COST (≈ entirely financial)
├── S1 Cost of debt / refinancing  ──► funding-curve level
│     └── id_lending_rate → REWIRE to CEIC224795501 (Lending rate IDR, n=480)
│     └── CEIC230931402 · Working-capital loan rate · n=279 · P1M
├── S2 Discount rate on the contracted annuity  ──► govt curve (see §5, the core)
└── S3 Ground-lease / O&M inflation  ──► id_cpi_yoy (net-neutral: also escalates revenue)
```

| leaf | series | n_obs | role | sign | lead | mechanism | data quality |
|---|---|---|---|---|---|---|---|
| IDR lending rate (real CEIC) | `CEIC224795501` | 480 | cost | **−1** | 0–1m | higher loan yields = higher interest bill + tougher refi | monthly, pub-lagged; real series (fixes `id_lending_rate→None`) |
| Working-capital loan rate | `CEIC230931402` | 279 | cost | **−1** | 0–1m | corporate funding cost | monthly, pub-lagged |
| CPI YoY | `ECONOMICS:IDIRYY` (`id_cpi_yoy`) | — | macro | **0** | — | escalator raises BOTH revenue (contract) and O&M cost → ~net-neutral; leave sign 0 | the rate channel already captures the inflation→yield link |

**Forecast hypothesis (cost):** the **CEIC rate prints lag**, but the **liquid market
yields they track lead** (§5). Use the CEIC lending rate for *attribution* (it
confirms the cost mechanism) and the **govt-yield curve for forecasting**.

---

## 5. MACRO / RATE / FX / FLOW — the core of a tower (duration −1)

This is where the basket lives. For a levered contracted annuity, **the discount-rate
curve is the model**. Every leaf here is a **liquid, real-time, leading** market price
→ these are the **forecast candidates**.

```
RATE CURVE (the dominant duration channel, sign −1 throughout)
├── M1 Domestic discount rate
│     ├── TVC:ID10Y  (id_10y)   · 798 wk · −1 · the IDR annuity discount rate ★core
│     ├── TVC:ID30Y  (UNWIRED)  · 738 wk · −1 · longest-duration point — best match to 8–10yr lease
│     ├── TVC:ID01Y  (id_01y)   · 793 wk · −1 · short-end / refi cost
│     └── ECONOMICS:IDINTR (id_bi_rate) · −1 · policy anchor (already wired, KEEP)
├── M2 Global discount rate / risk-free
│     ├── TVC:US10Y  (us_10y)   · 800 wk · −1 · global duration (already wired, KEEP)
│     ├── DFII10     (UNWIRED)  · 800 wk · −1 · ★US REAL 10Y — the single most correct driver for a bond proxy
│     └── US10Y-US02Y (UNWIRED) · 800 wk · −1 · curve slope: steepening (term-premium up) hurts long-duration
├── M3 Inflation expectations (escalator vs nominal-yield drag)
│     └── TVC:US10YIE (UNWIRED) · 800 wk · sign ambiguous → leave 0 (breakeven; rate channel dominates)
├── M4 FX / USD-debt portion
│     └── FX_IDC:USDIDR (usdidr) · 801 wk · −1 · IDR weakness raises USD-debt service & is risk-off for EM duration
└── M5 EM risk appetite / flow (broad USD)
      └── TVC:DXY (REWIRE dxy from empty BBDXY) · 800 wk · −1 · strong USD = EM-duration outflow headwind
```

| leaf | series (ric) | n_obs (wk) | role | sign | lead | mechanism | data quality |
|---|---|---|---|---|---|---|---|
| **ID 10Y** | `TVC:ID10Y` (`id_10y`) | 798 | macro | **−1** | 1–2m | IDR discount rate on the contracted annuity — *the* core driver | liquid daily/weekly, leads ✓ |
| **ID 30Y** | `TVC:ID30Y` | 738 | macro | **−1** | 1–2m | longest govt point ≈ duration of an 8–10yr lease book — best PV match | liquid, **unwired** |
| ID 1Y | `TVC:ID01Y` (`id_01y`) | 793 | macro | **−1** | 1m | short-end refi cost | liquid |
| BI policy rate | `ECONOMICS:IDINTR` (`id_bi_rate`) | — | macro | **−1** | 1–3m | policy anchor; cuts re-rate towers (KEEP — already wired) | monthly step series |
| **US 10Y** | `TVC:US10Y` (`us_10y`) | 800 | macro | **−1** | 1–2m | global risk-free / EM-duration beta (KEEP) | liquid, leads ✓ |
| **US real 10Y** | `DFII10` | 800 | macro | **−1** | 1–2m | ★ real discount rate — the cleanest bond-proxy driver; **unwired despite being populated** | liquid, **unwired** |
| US curve slope | `US10Y-US02Y` | 800 | macro | **−1** | 1–2m | bear-steepening = term-premium repricing = duration drawdown | liquid, **unwired** |
| USD/IDR | `FX_IDC:USDIDR` (`usdidr`) | 801 | macro | **−1** | 1–2m | USD-debt service + EM risk-off; tower revenue is IDR (no USD-earner offset) | liquid, leads ✓ |
| Broad USD | `TVC:DXY` (rewire `dxy`) | 800 | macro | **−1** | 1–2m | strong dollar drains EM-duration flows | **current `dxy`→`TVC:BBDXY` is EMPTY (wk_obs 0)** |
| US 10Y breakeven | `TVC:US10YIE` | 800 | macro | **0** | — | escalator tailwind vs nominal-yield drag — ambiguous, leave 0 | liquid, unwired |

**Forecast hypothesis (rate/FX — this is the whole thesis):** the govt curve and the
real yield are **liquid, exogenous, leading** price series. Bond proxies discount
rate moves with a short lag, and (unlike Banks/Securities which mean-revert) a tower's
re-rating to a lower-rate regime *persists* because the cashflow re-pricing is
structural, not a sentiment swing. So **this branch should genuinely lead by 1–2
months with sign −1.** Wiring it correctly should flip the basket from −0.195 to a
**positive forward IC** — the single highest-conviction repair in the panel, precisely
*because* the current number is so far below the placebo null (0.02 pctile): a clean
sign error produces a large, fixable negative, not random noise.

---

## 6. Cross-industry linkages (make explicit)

- **← Telco basket (Infrastructure).** Tower *demand* (tenancy) = telco *capex*. The
  leading version of demand is the telcos' own capex cycle and their equities, not the
  lagging CEIC BTS counts. Borrow the Telco subscriber/ARPU series
  (`CEICI65397101`, `CEICI65987401`) for attribution; cross-read the Telco basket's
  capex posture. **Note the consolidation risk:** the Indosat–Hutchison and XL–Smartfren
  mergers *reduce* the number of distinct tenants → a structural headwind to tenancy
  the macro tree cannot see (idiosyncratic, flag in commentary).
- **← Banking block (ID macro).** The real cost-of-debt channel: `CEIC224795501`
  (lending rate IDR, n=480), `CEIC230931402` (working-capital rate, n=279). These are
  the CEIC analogue of the govt-yield discount channel — use for attribution.
- **← US rates complex (market).** `DFII10`, `TVC:US10Y`, `US10Y-US02Y`,
  `TVC:US10YIE` — the global duration block, shared with Property, Pharma (defensives),
  and Utilities. Towers should load it *harder* than any of them.
- **NOT linked:** no commodity, no plantation/metal input, no China-demand channel.
  Towers are a pure rate/credit asset — deliberately *exclude* the broad-commodity and
  China branches that other Infrastructure names (Ports, Cement) carry.

---

## 7. Currently wired vs available (and the bugs)

**Wired now** (`worklist.json` for `infrastructure_tower`):
- `ceic = [("Telecom", None)]` → resolves to **55 candidates: 30 Card-Transaction +
  23 E-Money payment + 2 BTS** series. **53 are `demand`-tagged → default sign +1.**
  Curation (`MAX_CEIC//2+4 = 27` demand cap) keeps ~27 payment series at +1.
- `macro_hints`: `id_bi_rate −1`, `us_10y −1`, `usdidr 0`, `id_cpi_yoy 0`,
  `id_gdp_real_q +1` (the last three from `STD_MACRO`, auto-added).
- `global_hints`: none. `ceic_override`: none. `ceic_exclude`: none.

**The bugs (prioritised):**

| # | severity | bug | evidence | fix |
|---|---|---|---|---|
| B1 | **CRITICAL** | **Wrong block + wrong sign.** "Telecom" CEIC block = card/e-money **payments**, not towers; 53 series wired `demand +1` → pro-cyclical posture on a duration asset. ~27 kept at +1 outvote the 2 rate drivers ~13:1 → **−0.195 / placebo 0.02**. | `worklist.json` roles `Counter({'demand':53,'supply':2})`; `drivers.py:133` default `demand→+1`; signal = equal-wt `Σ sign·tanh(z)` | **drop `ceic Telecom`**; keep only the 2 BTS series via a narrow `ceic` subcategory; add the rate-curve tree (§5) with −1. |
| B2 | HIGH | **`DFII10` (US real 10Y) populated but UNWIRED.** 800 wk obs, the single most theory-correct driver for a bond proxy. | `market.json` `DFII10 weekly_obs=800`; absent from `GLOBAL_CORR` (`mapping.py:56-58`) | add `"us_real_10y": "DFII10"` to `GLOBAL_CORR`; wire `−1`. |
| B3 | HIGH | **`dxy` resolves to EMPTY `TVC:BBDXY`** (wk_obs 0) — any DXY hint silently no-history-drops. | `market.json` `TVC:BBDXY weekly_obs=0`; `GLOBAL_CORR["dxy"]="TVC:BBDXY"` | repoint `dxy → TVC:DXY` (800) — global resolver fix, helps every EM-flow basket. |
| B4 | MED | **`id_lending_rate → None`** — the real cost-of-debt channel is dark. | `GLOBAL_CORR["id_lending_rate"]=None` | repoint to `CEIC224795501` (lending rate IDR, n=480) or add a `us_real_10y`-style override. |
| B5 | MED | **`id_30y` / curve-slope unwired.** `TVC:ID30Y` (738) is the longest-duration point — best PV match to the lease book; `US10Y-US02Y` (800) captures term-premium repricing. | absent from `GLOBAL_CORR` | add `"id_30y":"TVC:ID30Y"`, `"us_2s10s":"US10Y-US02Y"`; wire −1. |
| B6 | LOW | **`id_gdp_real_q +1`** auto-added by STD_MACRO is mild but *wrong-signed* for a counter-cyclical duration asset (hot GDP → higher rates → lower towers). | `STD_MACRO` | override to 0 (or −1) for this basket, or rely on it being outvoted by the rate tree. |

**Available but unused (the "what we COULD add"), prioritised:**
1. `DFII10` −1 (US real 10Y) — **highest priority**, the cleanest bond-proxy driver.
2. `TVC:ID10Y` −1, `TVC:ID30Y` −1 — IDR discount curve (long end).
3. `US10Y-US02Y` −1 (curve slope), `TVC:DXY` −1 (broad USD).
4. `CEIC224795501` −1 (real IDR lending rate — cost-of-debt attribution).
5. 2 BTS series (`CEICI65399201`, `CEICI65990601`) — tenancy-demand attribution only.

---

## 8. Forecastability

**What the OOS backtest says.** Forward IC **−0.195**, placebo percentile **0.02** —
the posture is *significantly anti-predictive*. Crucially, this is **not** the
"co-moves contemporaneously but mean-reverts" pattern of Banks/Securities (which sit
near IC 0 to −0.15 with the *right* sign but no forward edge). −0.195 below the 2nd
placebo percentile is the signature of a **sign error**: the engine has the
*magnitude* of co-movement right but the *direction* inverted. A correctly-signed
duration posture on the same data should produce a *symmetric positive* IC of similar
size. So the OOS verdict is, paradoxically, **encouraging**: a strong, clean negative
from a sign bug is the most repairable state in the panel.

**Contemporaneous vs forward.** Towers discount rate moves with a **1–2 month lag**
(slower than liquid equities, faster than CEIC quantity prints), and the re-rating
*persists* (structural cashflow re-pricing, not sentiment) — so unlike the financials,
the rate branch should forecast forward, not just explain contemporaneously. The
demand (BTS/subscriber) branch is the reverse: publication-lagged, coincident/lagging
→ **attribution only, never a forecaster**.

**Which branches lead:**
- **LEADS (forecast candidates, sign −1):** `DFII10`, `TVC:ID10Y`, `TVC:ID30Y`,
  `TVC:US10Y`, `US10Y-US02Y`, `usdidr`, `TVC:DXY`. Liquid, exogenous, real-time.
- **LAGS (attribution only):** BTS counts, subscriber base, CEIC lending rate.

**What would move it from explainer to forecaster.** (1) **Swap the block and fix the
sign** (B1) — this alone should flip the IC positive. (2) **Add `DFII10` −1** (B2) —
the real-yield is the highest-signal duration driver. (3) **Concentrate the tree on
the curve** so the rate posture is not diluted by ~27 irrelevant payment series. The
*honest residual caveat*: the basket is 94% one small-cap, low-beta (0.38), illiquid
name (CENT) — even a perfectly-signed rate tree will carry a **lower, noisier rate
beta** than TBIG/TOWR would. Expect the fix to land the IC **positive but modest**
(target +0.05 to +0.12, marginal/SKILL), and read the verdict as *duration
attribution on a concentrated name* rather than a high-conviction forecast. For the
TBIG/TOWR archetype the same wiring should produce a cleaner, larger positive.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

### 9a. Global resolver fixes (`GLOBAL_CORR`) — benefit the whole panel
```python
# in GLOBAL_CORR:
"us_real_10y": "DFII10",        # NEW — US real 10Y (wk_obs 800), the bond-proxy driver
"id_30y":      "TVC:ID30Y",     # NEW — longest IDR govt point (wk_obs 738)
"us_2s10s":    "US10Y-US02Y",   # NEW — curve slope / term premium (wk_obs 800)
"dxy":         "TVC:DXY",        # FIX — was "TVC:BBDXY" (EMPTY, wk_obs 0)
"id_lending_rate": "CEIC224795501",  # FIX — was None; real IDR lending rate (n=480, P1M)
```

### 9b. Replace the Tower SEED entry
```python
"Tower": {
    # DROP the whole "Telecom" payment block (wrong block, wrong sign — the B1 bug).
    # Keep ONLY the 2 genuinely tower-relevant BTS series, re-roled as demand attribution.
    "ceic": [("Telecom", "Network Infrastructure")],   # → just CEICI65399201 + CEICI65990601
    "ceic_override": [
        # BTS counts are tenancy-demand proxies, not the engine's default; pin demand +1, low weight.
        ("bts", "demand", +1),
    ],
    "globals": [
        # the rate-duration tree — liquid, leading, all sign -1 (the core of a bond proxy)
        ("us_real_10y", "macro", -1, "US real 10Y — purest discount rate for a levered annuity"),
        ("id_10y",      "macro", -1, "IDR 10Y — domestic discount rate on contracted leases"),
        ("id_30y",      "macro", -1, "IDR 30Y — duration match to 8-10yr lease book"),
        ("us_10y",      "macro", -1, "global risk-free / EM-duration beta"),
        ("us_2s10s",    "macro", -1, "bear-steepening = term-premium repricing = duration drawdown"),
        ("dxy",         "macro", -1, "strong USD drains EM-duration flows"),
    ],
    "macro": [
        ("id_bi_rate",      "macro", -1, "policy rate: cuts re-rate the annuity (KEEP)"),
        ("id_lending_rate", "cost",  -1, "real IDR cost-of-debt / refinancing"),
        ("usdidr",          "macro", -1, "USD-debt service + EM risk-off; revenue is IDR (no USD offset)"),
        ("id_cpi_yoy",      "macro",  0, "escalator raises BOTH revenue and O&M → net-neutral"),
        ("id_gdp_real_q",   "macro",  0, "OVERRIDE STD_MACRO +1→0: towers are counter-cyclical duration, not growth"),
    ],
},
```
*(If `("Telecom","Network Infrastructure")` does not resolve as a subcategory key in
`build_worklist`, fall back to `"ceic": []` and rely on the BTS series being too low-n
to matter — the critical action is **removing the payment block**, not adding BTS.)*

### 9c. `ceic_exclude` (endogenous / wrong-block guard)
Not strictly needed once the block is dropped, but as a belt-and-braces guard if the
sector fallback ever re-introduces it:
```python
"ceic_exclude": ["card", "e-money", "atm", "debit", "credit card", "rtgs"],
```

### 9d. Falsifiable backtest plan
1. **Baseline:** current fwd IC = **−0.195**, placebo pctile 0.02 (recorded).
2. Apply 9a + 9b → `build_worklist.py` → `controller.py --only Tower` →
   `backtest/bt.py "Tower"`.
3. **Confirm hypotheses:**
   - **H1 (sign flip):** fwd IC moves from −0.195 to **positive**. A flip from a deep
     negative to a positive of similar magnitude is the proof the bug was a sign/block
     error, not noise. *Confirm if IC > +0.04 AND placebo pctile > 0.70.*
   - **H2 (real-yield is the driver):** ablate `us_real_10y` (DFII10) alone → IC drops
     most vs ablating any other single leaf. *Confirms `DFII10` is the load-bearing leaf.*
   - **H3 (block was the poison):** re-add `ceic Telecom` on top of the new tree → IC
     collapses back toward negative. *Confirms the payment block, not the absence of a
     better one, was driving −0.195.*
4. **Keep the change only if** forward IC improves materially (target +0.05–0.12) AND
   the tree is more honest (rate-duration, no payment series). If IC lands positive but
   weak, **still keep it** (correct posture > anti-predictive posture) and label the
   verdict **"duration attribution on a concentrated small-cap"**, not a forecaster.

---

### 4-line summary
- **Leaves:** DEMAND 4 (BTS×2 + subscribers×2, all attribution-only/lagging) · COST 3
  (real IDR lending + WC rate + CPI-neutral) · MACRO/RATE/FX 10 (ID10Y/ID30Y/ID1Y/BI −1,
  US10Y/**DFII10 real**/2s10s −1, USDIDR/DXY −1, US10YIE 0) — the rate-duration block is the model.
- **Key forecast hypothesis:** towers are the purest bond proxy → load the rate curve
  **−1** (esp. `DFII10` real 10Y); this branch leads 1–2m and *persists* (structural
  re-pricing, not mean-reversion like the financials) → should flip IC −0.195 → positive.
- **The bug (sign error confirmed):** SEED wires `ceic Telecom`, but that block is
  card/e-money **payments**, 53 series tagged `demand → default +1` (`drivers.py:133`),
  ~27 kept, outvoting the 2 rate drivers ~13:1 → pro-cyclical posture on a duration
  asset → −0.195 / placebo 0.02. **Fix = drop the block + wire the rate tree −1.**
- **Data bugs found:** `DFII10` (US real 10Y, 800 obs) populated but **unwired**;
  `dxy → TVC:BBDXY` is **EMPTY** (wk_obs 0; use `TVC:DXY`); `id_lending_rate → None`
  (use `CEIC224795501`, n=480); `TVC:ID30Y`/`US10Y-US02Y` unwired.
