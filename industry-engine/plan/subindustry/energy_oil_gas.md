# Oil & Gas — sub-industry driver plan (`energy_oil_gas`)

> Sector **Energy** · basket id `energy_oil_gas` · benchmark `jci` (IHSG, excess-return)
> Primary CEIC block: **Energy → Crude Oil + Natural Gas**
> Current state (BACKTEST.md): grade **perfected** · conf **high** · n_oos 129 ·
> fwd IC **+0.03** · hit−up **−0.03** · placebo pctile **0.65** · flag **weak**.

**The one-line problem.** This basket is *not one business*. It blends a **regulated
gas-transmission utility (PGAS)** whose gas is a pass-through *cost / regulated margin*
and whose equity trades as a **bond-proxy (duration)**, with **upstream E&P (MEDC,
ENRG, RATU)** whose revenue *is* the Brent/ICP price, plus **midstream/LNG-processing
(ESSA, RAJA, CGAS)**. A *single* sign on Brent or on gas is wrong for half the basket
by construction — so a theory-anchored, equal-weight, sign-fixed posture (which is
exactly what the engine runs) **nets to ~flat (+0.03)**. The fix is not "find a better
single driver"; it is to recognise the basket is a **two-regime mix** and either
(a) split it into an *upstream* sleeve and a *utility* sleeve, or (b) keep it blended
but only wire drivers whose sign is *common to both sleeves* (USD/IDR, ICP level,
broad risk) and **set the offsetting drivers (Brent vs gas-cost) to sign 0** so the
engine learns magnitude per-name instead of being forced into a basket-wide lie.

---

## 1. Snapshot

**Members (9 real names, mcap-sorted; total ≈ IDR 157T):**

| symbol | mcap (T) | β | what it actually is | gas exposure | Brent exposure |
|---|---|---|---|---|---|
| **PGAS** | 44.1 | 0.13 | Perusahaan Gas Negara — **regulated gas transmission + distribution UTILITY** (Pertamina sub-holding gas). | **gas = COST** (buys gas, sells regulated transmission/distribution margin) | indirect (volume) |
| **ENRG** | 39.3 | 0.39 | Energi Mega Persada — **upstream oil & gas E&P**. | gas = **revenue** | revenue + |
| **MEDC** | 33.1 | 0.30 | Medco Energi — **upstream E&P (Brent-linked) + power**. | gas = **revenue** | **revenue +** |
| **RAJA** | 14.5 | −0.21 | Rukun Raharja — gas trading / midstream transport & LNG/CNG distribution. | margin on gas throughput | indirect |
| **ESSA** | 12.1 | 0.24 | Surya Esa Perkasa — **ammonia/LPG gas-processing** (gas → ammonia). | gas = **feedstock COST** | indirect |
| **RATU** | 11.8 | n/a | Raharja Energi Cepu — upstream Cepu working-interest (oil). | low | **revenue +** |
| **SUNI** | 1.6 | −0.66 | gas distribution / utility-like. | gas = COST/throughput | low |
| **CGAS** | 0.3 | −0.14 | Citra Nusantara Gemilang — CNG/gas distribution. | throughput margin | low |
| **SICO** | 0.1 | 0.09 | small distribution. | throughput | low |

> **Basket-composition note (honest correction to the brief).** The brief named
> **AKRA** (fuel distribution) and **ELSA** (oilfield services) as members — they are
> **NOT** in this worklist basket. AKRA sits in fuel distribution/trading and ELSA in
> **Energy Services** (the coal-mining-contractor + oilfield-services basket). The real
> mix here is **upstream E&P (ENRG/MEDC/RATU) vs gas utility/midstream/processing
> (PGAS/RAJA/ESSA/SUNI/CGAS/SICO)**. The "opposite gas sign" thesis is *correct and
> if anything stronger*: PGAS+ESSA buy gas (cost ↑ = margin ↓), while ENRG/MEDC sell
> it (price ↑ = revenue ↑). PGAS alone is **28% of basket mcap** and trades like a
> bond (β 0.13); the three upstream names are **53%**. Two engines in one ticker.

**Current kept drivers (6, from the SEED below):** Brent (+), WTI (+), natgas (0),
USD/IDR (+), ID 10Y (−), US 10Y (−). Plus STD_MACRO (BI rate 0, CPI 0, GDP +1).

**The gap.** (i) The CEIC `ceic` group is `("Energy","Crude Oil")` only — it **never
pulls the Natural Gas subcategory** that PGAS/ESSA/RAJA live on. (ii) Brent is wired
`+1` for the *whole* basket, but it is sign-ambiguous-to-negative for the 47% utility/
processing sleeve (higher oil → higher LNG/feedstock cost, and PGAS is a defensive
that *de-rates* when the energy/commodity-risk trade is "on"). (iii) The largest name
(PGAS) is fundamentally a **rate/duration** instrument, but `id_10y` is only one of six
drivers and gets diluted to flat by the upstream sleeve. Result: forward-flat.

---

## 2. Economic structure — how the basket makes money

Two distinct revenue identities living in one basket.

**A. Upstream E&P sleeve (MEDC, ENRG, RATU ≈ 53% mcap)**
```
revenue ≈ Σ (lifted bbl-equivalent) × (realised price)
realised price ≈ f(Brent, ICP, Henry-Hub/JKM gas, USD/IDR)
margin swing ≈ price − lifting cost (lifting cost ~ fixed in USD; high op-leverage)
```
- Price is **USD-denominated** → USD/IDR weakness *adds* to IDR-reported revenue.
- Volume (lifting/production) is slow, mature, declining for Indonesia → the **price**
  term dominates the equity, not volume. So a *price* driver (Brent/ICP) leads; a
  *volume/lifting* CEIC print explains but does not forecast.
- What a sell-side analyst watches: Brent strip, **ICP** (Indonesian Crude Price — the
  official monthly govt reference that actually sets realised revenue & PSC splits),
  lifting cost/boe, USD/IDR, hedge book, and reserve/PSC terms.

**B. Gas utility / midstream / processing sleeve (PGAS, RAJA, ESSA, SUNI, CGAS, SICO ≈ 47%)**
```
PGAS distribution margin ≈ (regulated sell price) − (gas purchase cost)
  → gas purchase cost ↑  ⇒  margin ↓   (gas is a COST, not revenue)
  → equity = regulated, stable cash-flow ⇒ DURATION / bond-proxy ⇒ falls when yields rise
ESSA: ammonia/LPG price − gas feedstock cost  (feedstock = COST)
RAJA/SUNI/CGAS: volume × transport/distribution tariff (throughput, GDP-linked)
```
- **HGBT (Harga Gas Bumi Tertentu)** — the govt "certain industries" capped gas price
  of **USD 6/MMBTU** — is the *policy* swing factor for PGAS: when the cap is enforced/
  widened, PGAS's *sell* price is squeezed while its *purchase* cost is not → margin
  compression. This is a **policy** driver with no clean market proxy (see §4).
- PGAS equity behaves like a **regulated utility / bond**: its dominant systematic
  factor is the **discount rate (ID 10Y, BI rate)**, not the oil price. β = 0.13.

**Margin swing factor for the blend:** the *spread*, not the level. Upstream wants oil
↑; PGAS/ESSA want gas-cost ↓. A move that lifts both oil and gas together (energy-bull)
is **good for upstream, bad for the utility** → near-cancellation at the basket level.
This is the mechanical reason the single Brent sign nets to +0.03.

**Intra-basket dispersion (this is the whole story):** β ranges from **−0.66 (SUNI)**
to **+0.39 (ENRG)** — a 1.0 spread within one "sub-industry". The negative-β names
(SUNI, RAJA, CGAS) are defensive distribution/utility; the positive-β names are
commodity-upstream. **No single factor can be the right sign for both ends.**

---

## 3. DEMAND driver tree

> Leaf format: `series ric (n_obs) · role · sign · expected LEAD · mechanism · data quality`.
> Sign = effect of a RISE in the driver on the **basket's excess return vs IHSG**.

```
DEMAND
├── D1  Crude price level (upstream revenue)  ── the dominant lever for 53% of mcap
│   ├── Brent            ICEEUR:BRN1! (wk_obs 800) · supply* · +1 (upstream) /
│   │                    BUT 0 at basket level (utility offset) · LEAD 0–1m ·
│   │                    realised E&P price; *leads* equity weakly (priced fast) ·
│   │                    liquid daily, clean.
│   ├── WTI             NYMEX:CL1! (800) · supply · +1(upstream)/0(basket) · LEAD 0–1m ·
│   │                    co-moves Brent; redundant — keep ONE of Brent/WTI ·
│   │                    liquid daily.
│   └── ICP (gov ref)   CEICI14459401 (n413, P1M, USD/Barrel) · demand · +1(upstream)/
│                        0(basket) · LEAD 0m (coincident) · the OFFICIAL Indonesian
│                        Crude Price that sets realised PSC revenue — better-targeted
│                        than Brent for IDX names · **MISFILED** under Consumer
│                        Staples/"Food Retail Prices" (won't be auto-pulled; needs an
│                        explicit override or resolver) · monthly, publication-lagged.
├── D2  Domestic gas/energy demand (volume → distribution & throughput sleeve)
│   ├── Gas consumption  CEICI… "Total energy consumption: Gas" (Energy/Natural Gas,
│   │                    P1Y, n45) · demand · +1 · LEAD n/a · PGAS/RAJA throughput ·
│   │                    **annual → dropped by _OK_FREQ** (attribution only, unusable).
│   ├── GDP real        id_gdp_real_q → aIDGDPAR1 · demand · +1 · LEAD 0–1q · industrial
│   │                    gas/fuel demand tracks activity · quarterly, lagged.
│   └── Industrial prod id_pmi → aIDPMIMAQ · demand · +1 · LEAD 1–2m · factory gas
│                        offtake (PGAS industrial customers) · monthly survey, timely.
└── D3  Crude lifting / production (upstream VOLUME — attribution, not forecast)
    ├── Daily lifting   CEICI468154637 (n994, P1D) · supply · +1 · LEAD lag · realised
    │                    volume; declining trend · daily but publication-lagged.
    └── Crude+condensate CEICI403931877 (n216, P1M) · supply · +1 · LEAD lag ·
                         production volume · monthly, coincident/lagging.
```
\* the engine tags own-commodity *price* as CEIC-role "supply"; here we re-read sign by
sleeve. **Forecast hypothesis (D1):** Brent/ICP *level changes* lead the upstream
sleeve by 0–1 month but **not the blended basket**, because the utility sleeve carries
the opposite sign. ⇒ D1 forecasts a *split* basket, not the blend.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST
├── S1  Natural-gas COST (the offsetting axis — the reason the blend is flat)
│   ├── Henry Hub gas   NYMEX:NG1! (wk_obs 800) · COST · **−1 for utility/processing
│   │                    sleeve (PGAS,ESSA), +1 for upstream (ENRG,MEDC)** ⇒ basket 0 ·
│   │                    LEAD 0–1m · PGAS buys gas / ESSA feedstock = cost ↑ ⇒ margin ↓;
│   │                    upstream sells gas = revenue ↑ · liquid daily. **This single
│   │                    series has opposite signs inside the basket → keep at 0.**
│   ├── JKM Asian LNG   SGX:JKM1! · COST · −1(util)/+1(up) · LEAD 0–1m · the *right*
│   │                    Asian gas benchmark for PGAS LNG purchases & ESSA — **BUT
│   │                    wk_obs = 0 (EMPTY in store)** → resolver `wb_lng_jp` is DEAD.
│   │                    Proxy with NYMEX:NG1! or Brent (Asian LNG is ~13% Brent-linked).
│   └── HGBT gas-price cap (POLICY) · — · regulated · LEAD policy-event · the USD-6/
│                        MMBTU "certain industry" cap squeezes PGAS sell-margin · **NO
│                        market series** — qualitative overlay; flag as un-modellable
│                        policy risk (like coal HBA / DMO).
├── S2  Refined-product / margin cost (distribution & processing)
│   ├── Heating oil     NYMEX:HO1! (800) · cost/proxy · 0 · LEAD 0–1m · diesel/distillate
│   │                    crack proxy for distribution names · liquid daily (low priority).
│   └── Gasoline        NYMEX:RB1! (800) · cost/proxy · 0 · LEAD 0–1m · downstream crack ·
│                        liquid daily (low priority).
└── S3  USD-denominated input/financing cost
    └── USD/IDR (cost leg) usdidr → FX_IDC:USDIDR (801) · macro · see §5 · gas/LNG
                         imports & USD debt service are a COST; nets against the USD
                         revenue benefit on the upstream side → ambiguous (see §5).
```

**Forecast hypothesis (S1):** natural-gas cost is the **structural offset** to Brent.
The basket has a long Brent leg (upstream) and a short-gas-cost leg (utility) that
the energy complex moves *together* → they cancel. Wiring gas at **sign 0** (status
quo) is correct *for the blend*; the only way to extract its signal is to **split the
basket** so PGAS/ESSA carry gas as `cost −1` and ENRG/MEDC carry it as `supply +1`.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO
├── M1  Duration / discount rate  ── the DOMINANT factor for PGAS (28% mcap, β 0.13)
│   ├── ID 10Y          id_10y → TVC:ID10Y (wk_obs 798) · macro · **−1** · LEAD 0–1m ·
│   │                    PGAS regulated cash-flows = bond-proxy; yields ↑ ⇒ de-rate ·
│   │                    daily, clean. **Up-weight: this is PGAS's real factor.**
│   ├── ID 1Y           id_01y → TVC:ID01Y (793) · macro · −1 · LEAD 0–1m · short-rate /
│   │                    funding cost for leveraged midstream · daily, clean.
│   ├── US 10Y          us_10y → TVC:US10Y · macro · −1 · LEAD 0–1m · global discount
│   │                    rate / EM duration · daily.
│   └── BI policy rate  id_bi_rate → ECONOMICS:IDINTR · macro · −1 (utility tilt) ·
│                        LEAD 1–3m · financing cost + utility de-rate · monthly.
├── M2  USD/IDR (the two-sided FX axis)
│   └── USD/IDR         usdidr → FX_IDC:USDIDR (801) · macro · **+1 net (upstream USD
│                        revenue) but partly offset by utility USD gas-import/debt
│                        cost** · LEAD 0–1m · weak-IDR lifts IDR-reported E&P revenue,
│                        hurts gas importers/USD-leveraged distributors · daily, clean.
├── M3  USD / global risk
│   ├── DXY            dxy → **TVC:BBDXY is EMPTY (wk_obs 0) — resolver DEAD**; use
│   │                    **TVC:DXY (wk_obs 800)** · macro · −1 · LEAD 0–1m · broad USD =
│   │                    EM-equity & commodity headwind · daily.
│   └── VIX/SPX        vix CBOE:VIX / spx SP:SPX · macro · risk-off −1 · LEAD 0m ·
│                        global risk appetite; energy is high-beta to risk · daily.
└── M4  Inflation / activity backdrop
    ├── CPI YoY        id_cpi_yoy → ECONOMICS:IDIRYY · macro · 0 · regime flag · monthly.
    └── GDP real       id_gdp_real_q → aIDGDPAR1 · macro/demand · +1 · gas-volume demand.
```

**Key macro read:** if you had to pick *one* honest driver for the **blended** basket,
it is **ID 10Y (−1)** — because the offsetting commodity legs cancel but PGAS's
duration does not, and PGAS is the single largest weight. The basket's lowest-β,
highest-weight name dominates the *common* signal, and that signal is a rate signal,
not an oil signal. This is why a "commodity" basket has a *defensive/duration* core.

---

## 6. Cross-industry linkages (series borrowed from other categories)

| linkage | series | why it belongs here |
|---|---|---|
| **ICP from Consumer-Staples block** | `CEICI14459401` "Crude Oil: Indonesia" (USD/Bbl, n413) | The official Indonesian Crude Price is **misfiled** under Consumer Staples / Food Retail Prices, not Energy/Crude Oil. It is the *best-targeted* upstream-revenue driver for IDX names but won't be auto-pulled by `("Energy","Crude Oil")` — needs an explicit cross-category override/resolver. |
| **Electricity / PLN demand (Energy block)** | Electricity sub (tariffs, consumption: Industrial/Total) | MEDC and gas names sell to power gen; PLN gas offtake = volume demand. Mostly annual/coincident → attribution. |
| **Power-plant capacity (Energy block)** | Power Plant Capacity: Gas turbine / Combined cycle (MW) | gas-fired capacity growth = structural PGAS/upstream gas demand. Annual → context only. |
| **Banking — system credit / rates** | `id_bank_credit` aIDLONYAR, BI rate | leveraged midstream (RAJA, distribution) funding; PGAS capex financing. |
| **China IP (commodity demand)** | `cn_ip_yoy` aCNIP | sets the global oil-demand impulse behind Brent — the *parent* of D1. |

---

## 7. Currently-wired vs available

**Wired now (SEED["Oil & Gas"]):**
```python
"ceic":   [("Energy", "Crude Oil")],          # ← Natural Gas subcat NOT included
"globals":[("brent","supply",+1), ("wti","supply",+1), ("natgas","supply",0)],
"macro":  [("usdidr","macro",+1), ("id_10y","macro",-1), ("us_10y","macro",-1)]
# + STD_MACRO: bi_rate 0, cpi 0, gdp +1
```

| driver | now | proposed | priority | note / bug |
|---|---|---|---|---|
| Brent | supply +1 | **supply 0** (basket) | **P0** | +1 is wrong for the 47% utility/processing sleeve; forces the flat blend. |
| WTI | supply +1 | **drop** (redundant w/ Brent) | P1 | 0.99-corr with Brent; one crude leg is enough. |
| **ICP** `CEICI14459401` | — | **demand +1 (upstream) via override** | **P0** | govt crude reference, n413; misfiled → needs explicit add. |
| natgas `NYMEX:NG1!` | supply 0 | **keep 0** (blend) / split to ±1 | P0 | opposite sign per-name; 0 is the only honest blend value. |
| **Natural Gas CEIC subcat** | **excluded** | **add `("Energy","Natural Gas")`** | **P1** | PGAS/ESSA live here; currently invisible. (Most are annual → may still be dropped by freq gate — attribution only.) |
| JKM LNG `wb_lng_jp`→SGX:JKM1! | (not wired) | **do not wire — wk_obs 0** | P2 | DEAD series; proxy with NYMEX:NG1!/Brent. |
| DXY `dxy`→TVC:BBDXY | (not wired) | **wire as TVC:DXY −1** | P1 | **BBDXY is empty (wk_obs 0)**; DXY has 800. |
| ID 10Y | macro −1 | **macro −1, up-weight** | P0 | correct & dominant; this is PGAS's true factor. |
| ID 1Y `id_01y` | — | macro −1 | P2 | short-end funding for midstream. |
| US 10Y | macro −1 | keep −1 | — | global duration. |
| BI rate | macro 0 | **macro −1** | P2 | utility/duration tilt argues for a sign. |
| VIX / SPX | — | macro risk −1 | P3 | energy = high risk-beta; optional. |
| crude lifting/production CEIC | supply (auto) | keep as attribution | — | publication-lagged volume; explains, doesn't forecast. |

---

## 8. Forecastability

**Verdict: this blended basket is an ATTRIBUTION/beta instrument, not a forecaster —
*by construction*, because of internal sign cancellation.** The forward IC of +0.03
(placebo pctile 0.65, "weak") is exactly what a near-cancelling long-Brent / short-
gas-cost / long-duration mix should produce: the legs are individually real and
*contemporaneously* explanatory, but they offset, and what survives (PGAS duration)
mean-reverts like a bond.

**Which branches *should* lead (if the basket were split):**
- **Brent / ICP (D1) → upstream sleeve:** LEAD 0–1m, modest. Oil is priced fast, so
  even the upstream lead is short; this is co-movement more than prediction.
- **ID 10Y / BI rate (M1) → utility sleeve (PGAS):** LEAD 0–1m. Duration de-rating is
  the cleaner, more persistent signal — and it is the one the *blend* actually keeps
  (because the commodity legs cancel). A **PGAS-only / utility sleeve** wired on
  `id_10y −1, bi_rate −1, gas-cost −1` is the most plausible forecaster in this group.
- **Natural-gas cost (S1):** would lead the utility sleeve **negatively** and the
  upstream sleeve positively — only usable *after a split*.

**Contemporaneous vs forward:** like the rest of the book, contemporaneous IC >> forward
IC here. The engine is a good *explainer* of why these names moved (oil up, yields down)
but the blend's posture does not forecast t+1.

**What would move it from explainer to forecaster:**
1. **Split the basket** into `energy_oil_gas_upstream` (ENRG, MEDC, RATU) and
   `energy_oil_gas_utility` (PGAS, RAJA, SUNI, CGAS, SICO, ESSA). Then wire opposite
   gas signs and let each sleeve carry a *coherent* posture. **Falsifiable:** the
   upstream sleeve's Brent-IC and the utility sleeve's 10Y-IC should each exceed the
   blend's +0.03 and beat ≥80% of placebos; if neither does, the names are pure
   idiosyncratic beta and even the split won't help.
2. If a split is not allowed, **set Brent → 0** at basket level and **let ID 10Y −1
   dominate** — i.e. accept that the only non-cancelling signal is duration. Test
   whether fwd IC rises from +0.03 toward the utility-sleeve value.
3. Add **ICP (`CEICI14459401`)** so the upstream revenue driver is IDX-specific rather
   than a generic global Brent.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

> Read-only on mapping.py per the brief — this is the spec a quant implements & backtests.

### 9a. Blended-basket fix (minimal, keep one basket) — `SEED["Oil & Gas"]`
```python
"Oil & Gas": {
    # add Natural Gas so PGAS/ESSA inputs are at least visible (mostly annual ->
    # will be freq-gated to attribution, but correct to include):
    "ceic": [("Energy", "Crude Oil"), ("Energy", "Natural Gas")],

    # re-role / add the misfiled ICP (lives in Consumer Staples/Food Retail Prices,
    # so it is NOT in the ceic groups above) via override substring on its topic.
    # NOTE: ceic_override only re-roles series ALREADY pulled by `ceic`; to inject
    # ICP needs either (i) a new ("Consumer Staples","Food Retail Prices") group
    # filtered to the crude topic, or (ii) a new resolver (see 9c). Cleanest = 9c.
    "ceic_exclude": [],   # nothing endogenous to drop here

    "globals": [
        ("brent",  "supply", 0, "Brent: +upstream revenue, -utility/feedstock cost -> cancels at blend"),
        # drop WTI (redundant with Brent)
        ("natgas", "cost",   0, "gas: COST for PGAS/ESSA, REVENUE for ENRG/MEDC -> opposite signs -> 0"),
        ("dxy",    "macro",  -1, "broad USD = EM/commodity headwind (use TVC:DXY; BBDXY empty)"),
    ],
    "macro": [
        ("id_10y",   "macro", -1, "PGAS bond-proxy duration — dominant blend factor"),
        ("id_01y",   "macro", -1, "short-end funding for leveraged midstream"),
        ("us_10y",   "macro", -1, "global discount rate / EM duration"),
        ("id_bi_rate","macro", -1, "policy rate: utility/duration de-rate + funding"),
        ("usdidr",   "macro", +1, "net USD-revenue benefit (upstream) > importer drag"),
    ],
},
```
- **Resolver bug to fix in `GLOBAL_CORR`:** `"dxy": "TVC:BBDXY"` → **`"TVC:DXY"`**
  (BBDXY weekly_obs = 0). And `"wb_lng_jp": "SGX:JKM1!"` is **dead (wk_obs 0)** — do
  not rely on it for PGAS LNG cost; proxy with `natgas`/`brent`.

### 9b. ICP resolver (preferred way to inject the misfiled govt crude price)
Add a global key so the engine can use the IDX-specific crude reference directly:
```python
# in GLOBAL_CORR:
"id_icp": "CEICI14459401",   # Indonesian Crude Price, USD/Bbl, n413 (misfiled in CEIC)
```
then in the seed `globals`: `("id_icp", "supply", 0, "ICP = realised IDX crude revenue; +upstream, cancels at blend")`
(sign 0 for the blend; +1 if used in an upstream-only split).

### 9c. The real fix — SPLIT into two seeds (recommended; requires a basket split upstream of mapping)
```python
# energy_oil_gas_upstream  (ENRG, MEDC, RATU)
"Oil & Gas — Upstream": {
    "ceic":   [("Energy", "Crude Oil")],
    "globals":[("brent","supply",+1,"realised E&P revenue"),
               ("id_icp","supply",+1,"IDX crude reference"),
               ("natgas","supply",+1,"upstream gas revenue")],
    "macro":  [("usdidr","macro",+1,"USD revenue, weak IDR helps"),
               ("us_10y","macro",-1,"duration"), ("dxy","macro",-1,"USD headwind")],
},
# energy_oil_gas_utility   (PGAS, RAJA, ESSA, SUNI, CGAS, SICO)
"Oil & Gas — Gas Utility": {
    "ceic":   [("Energy", "Natural Gas")],
    "globals":[("natgas","cost",-1,"gas purchase/feedstock cost -> margin"),
               ("brent","cost",-1,"oil-linked LNG cost + risk-on de-rate of defensive")],
    "macro":  [("id_10y","macro",-1,"regulated bond-proxy duration"),
               ("id_01y","macro",-1,"funding"), ("id_bi_rate","macro",-1,"de-rate"),
               ("us_10y","macro",-1,"global duration")],
},
```

### 9d. Falsifiable backtest plan
1. **Baseline:** re-run `backtest/bt.py "Oil & Gas"` — record fwd IC +0.03 / pctile 0.65.
2. **Blend fix (9a/9b):** Brent→0, drop WTI, gas→0, add DXY(real), up-weight 10Y,
   add BI−1 / ID1Y−1 / ICP. **Confirm if** fwd IC moves toward the duration signal
   and **does not fall below** +0.03 / 0.65 (we are removing a cancelling driver, so
   IC should at worst hold; a drop falsifies the "Brent is just noise here" claim).
3. **Split test (9c):** build the two sleeves; **confirm if** the *utility* sleeve's
   fwd IC on `id_10y −1` and the *upstream* sleeve's IC on `brent +1` each clear
   ≥ +0.05 and ≥ 80th placebo pctile. **If both clear**, the split is the answer and
   the blend should be deprecated to "attribution-only". **If neither clears**, concede
   the basket is idiosyncratic beta and keep it as a contemporaneous explainer.
4. **Never keep** any driver that only improves in-sample fit without raising forward
   IC (per IMPROVEMENT_PLAN §6).

---

### Summary (4 lines)
- **Tree:** ~8 demand leaves (Brent/WTI/ICP price, GDP/PMI/gas-consumption volume, crude lifting/production), ~6 supply/cost leaves (Henry-Hub & JKM gas cost, HGBT policy, heating-oil/gasoline cracks, USD input), ~10 macro/rate/FX leaves (ID 10Y/1Y, US 10Y, BI rate, USD/IDR, DXY, VIX/SPX, CPI, GDP).
- **Key forecast hypothesis:** the blend is forward-flat (+0.03) **by sign cancellation** — long-Brent upstream (53%) vs short-gas-cost/long-duration utility (47%) offset; the only non-cancelling signal is **PGAS duration (ID 10Y −1)**. Splitting into upstream (Brent +1) and utility (gas-cost −1, 10Y −1) sleeves is the path from explainer to forecaster.
- **Data bugs found:** (1) `dxy → TVC:BBDXY` is **empty (wk_obs 0)** → use `TVC:DXY`; (2) `wb_lng_jp → SGX:JKM1!` JKM LNG is **empty (wk_obs 0)** → proxy with Henry Hub/Brent; (3) the **ICP** govt crude price `CEICI14459401` (n413) is **misfiled** under Consumer Staples/Food Retail Prices so the `("Energy","Crude Oil")` group never pulls it; (4) seed `ceic` omits the **Natural Gas** subcategory entirely (PGAS/ESSA inputs invisible).
- **Membership correction:** brief's AKRA/ELSA are **not** in this basket; real mix is upstream ENRG/MEDC/RATU vs gas-utility PGAS/RAJA/ESSA/SUNI/CGAS/SICO (β spread −0.66→+0.39), which *strengthens* the opposite-sign thesis.
