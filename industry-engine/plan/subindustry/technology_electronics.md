# Electronics (`technology_electronics`) — driver-tree plan

> Sector **Technology** · sub_sector **Electronics** · 6 members · mcap ≈ 10.2T
> Current state (`_state.txt`/`BACKTEST.md`): grade **perfected**, kept **6**, conf
> **medium**, n_oos **129**, **fwd IC +0.07**, hit−up **−0.06**, placebo pctile
> **0.85** → flag **marginal**. The marginal skill is real but thin, and the wiring
> behind it is **mis-specified** (see §7 — the engine's `("Technology", None)` block
> pulls e-commerce/browser-share noise, not electronics demand). This file rebuilds
> the tree on the *correct* CEIC blocks and is honest that most of the forward edge is
> an **import-cost (USD) + global-tech-cycle (NDX/SOX) beta**, not a domestic lead.

---

## 1. Snapshot — the basket

Six thin-margin electronics distributors / assemblers / component names. This is **not**
a semiconductor basket — there is no IDX chipmaker. It is *distribution + contract
assembly + IT hardware reselling*, and one MTDL name dominates the cap.

| Sym | name | what it does | mcap (T) | yf β | weight note |
|---|---|---|---|---|---|
| **MTDL** | Metrodata Electronics | #1 IT-hardware distributor + IT-services (Cisco/HP/Lenovo/MS reseller) | 6.69 | 0.14 | **66% of basket cap** — dominates everything |
| **PTSN** | Sat Nusapersada | contract electronics manufacturer (EMS) — assembles phones/boards for global OEMs, exports | 1.43 | 0.48 | the only true **exporter** + highest β |
| **CHIP** | Pengusahaan Optikal (Steadfast/"CHIP") | electronics/optical distribution | 0.78 | −0.05 | small, near-zero β |
| **AXIO** | Axioo / Tera Data Indonusa | laptop & phone brand + distribution | 0.65 | 0.17 | consumer-electronics retail demand |
| **GLVA** | Galva Technologies | electronics distribution (pro-audio/AV/consumer) | 0.49 | 0.64 | highest non-PTSN β |
| **ZYRX** | Zyrexindo Mandiri Buana | laptop/PC assembler-brand (gov't "laptop merah putih") | 0.17 | n/a | thinnest, idiosyncratic gov't-tender driven |

**The gap.** Cap is ~⅔ MTDL, whose β to global tech is only 0.14 — so the *equal-weighted*
basket the engine targets over-weights the small, high-β assemblers (PTSN/GLVA) relative
to their cap. The basket return is therefore noisier and more tech-cycle/FX-beta-driven
than a cap-weighted read of "Indonesian electronics" would be. Honest framing matters here.

---

## 2. Economic structure — how the basket makes money

**Revenue identity.** Two distinct models inside one basket:

- **Distributors / resellers (MTDL, CHIP, GLVA, AXIO):**
  `revenue = unit volume × ASP`, `gross profit = revenue × (distribution spread)`.
  Spread is **2–8%** — wafer-thin. They buy USD-priced hardware, sell in IDR, and carry
  inventory + FX exposure between purchase and sale. They are **importers**: a weaker IDR
  *raises* COGS faster than they can re-price → margin squeeze. Demand is domestic
  consumer/enterprise IT refresh.
- **Contract assembler / EMS (PTSN; ZYRX partly):**
  `revenue = export/contract volume × assembly fee`, where components are **imported
  (USD)** and finished goods are **exported (USD)** to global OEMs. PTSN is a USD-in /
  USD-out pass-through with a thin labour-arbitrage assembly margin; its swing factor is
  **global OEM order flow** (the tech cycle) far more than domestic Indonesian demand.

**Cost stack (the margin swing factor).**
1. **Imported component / finished-goods cost (USD)** — the dominant cost. `usdidr` ↑ ⇒
   COGS ↑ for distributors (−), broadly neutral/pass-through for PTSN's USD-out leg.
2. **Component metal content (copper / minor)** — small for assemblers; a second-order cost.
3. Labour + logistics — domestic, slow-moving.

**What a sell-side analyst watches:** USD/IDR (margin), the global semi/hardware cycle
(NDX/SOX → OEM orders → PTSN; replacement-cycle demand → MTDL/AXIO), Indonesian
**Information & Communication Equipment retail sales** + durables-buying intent
(consumer refresh), enterprise IT capex (MTDL), and chip-availability/lead-time regimes
(2021–22 shortage was a margin windfall for distributors holding inventory).

**Intra-basket dispersion.** MTDL = enterprise-IT distributor + services (rate/GDP-sensitive,
low β). PTSN = export-EMS (global-tech-cycle + USD, high β). AXIO/GLVA/CHIP = consumer
distribution (retail/confidence/USD). ZYRX = idiosyncratic (gov't tenders). **The shared,
modellable factor across all six is the USD-cost / global-tech-cycle beta** — everything
else is name-specific.

---

## 3. DEMAND driver tree

```
DEMAND (electronics volume up)
├─ D1 Global tech / OEM order cycle  ──► PTSN exports + ASP refresh
│    ├─ NDX (Nasdaq-100)         NASDAQ:NDX
│    ├─ SOX/semis (PROXY)        NASDAQ:SOXX / AMEX:SMH   ← NOT wired today
│    └─ China IC production      aCNCSINC (sparse)
├─ D2 Domestic consumer electronics demand
│    ├─ Info & Comm Equip retail CEIC322852102
│    ├─ Other Household Equip     CEIC322852202
│    ├─ Durables-buying intent    CEIC277372902 / aIDCSBYDUBG
│    └─ Consumer confidence       aIDCONIAR
├─ D3 Enterprise / IT capex (MTDL leg)
│    ├─ GFCF Machinery (real)     CEICI365764097
│    └─ FDI Machinery&electronics CEICI410108517
└─ D4 Export order volume (EMS)
     └─ Export: machinery/electronics CEICI324032102
```

| leaf | series ric (n_obs) · freq | role | sign | LEAD (mo) | mechanism | data quality |
|---|---|---|---|---|---|---|
| **NDX** | `NASDAQ:NDX` (weekly_obs 800) D→W | demand | **+1** | **1–3 (LEADS)** | global tech sentiment → OEM orders → PTSN; risk-on for high-β EMS/distributors | liquid price, real-time, clean — **forecast candidate** |
| **Semi cycle (SOX)** | `NASDAQ:SOXX` (800) / `AMEX:SMH` (800) | demand | **+1** | **2–4 (LEADS)** | semiconductor cycle = component availability + downstream OEM build → assembly orders; the purest "global electronics cycle" signal | liquid, clean — **forecast candidate; NOT wired today** |
| China IC production | `aCNCSINC` (monthly, sparse) | demand | +1 | 0–2 | China is the upstream electronics supply chain; IC output ≈ regional build pulse | CEIC quantity, pub-lagged, **thin history** — attribution only |
| Info&Comm Equip retail | `CEIC322852102` (n196, P1M, 2010=100) | demand | +1 | 0 (coincident) | the single most on-point demand proxy — phone/PC retail volume (AXIO/GLVA/MTDL channel) | survey index, ~6-wk pub lag → **attribution, weak forecast** |
| Other Household Equip retail | `CEIC322852202` (n196, P1M) | demand | +1 | 0 | durables refresh demand | survey, pub-lagged → attribution |
| Durables-buying intent | `CEIC277372902` (n196, P1M) · `aIDCSBYDUBG` | demand | +1 | **1–2 (mild lead)** | "buying condition for durable goods" — an *intent* survey, leads actual purchase | survey, intent-based → **mild forecast candidate** |
| Consumer confidence | `aIDCONIAR` (`CEIC277372502` n196) P1M | demand | +1 | 0–1 | discretionary electronics are confidence-elastic | survey, pub-lagged → attribution |
| GFCF Machinery (real) | `CEICI365764097` (n65, P3M) | demand | +1 | 0 (lagging) | enterprise hardware capex (MTDL) | quarterly, heavily pub-lagged → attribution |
| FDI Machinery&electronics | `CEICI410108517` (n145, P1M) | demand | +1 | 0 | sector investment pulse | CEIC, pub-lagged → attribution |
| Export: machinery/electronics | `CEICI324032102` (n172, P1M, USD mn) | demand | +1 | 0 (coincident, **PTSN-specific**) | direct read on EMS export order value (PTSN exports to OEMs) | CEIC trade print, pub-lagged → **attribution, the cleanest PTSN attributor** |

**Forecast hypothesis (demand):** the *only* genuinely leading demand branch is **D1
(NDX + SOX)** — liquid global-tech prices that move 1–4 months before Indonesian EMS/
distributor earnings and before the basket re-rates. **D2/D3/D4 are publication-lagged
CEIC quantity prints → coincident/lagging → attribution, not forecast.** Durables-buying
*intent* (`CEIC277372902`) is the one domestic series with a mild lead.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST (margin)
├─ S1 Imported input cost (USD)  ── THE dominant margin driver
│    ├─ USD/IDR                  FX_IDC:USDIDR        (cost, −1)
│    ├─ DXY (broad USD/EM flow)  TVC:DXY              (cost/flow, −1)  ← BBDXY bug, see §7
│    └─ Import: electrical mach  CEICI323787402       (cost proxy)
├─ S2 Component metal content
│    └─ Copper                   COMEX:HG1!           (cost, −1, minor)
├─ S3 Domestic output / capacity (attribution)
│    ├─ IPI Computers&Electronics CEIC323568402 (P1M) / CEICI323566102 (P3M)
│    └─ IPI Electrical Equipment  CEICI323566202
└─ S4 Chip availability / lead-time regime  (no clean series — see §8)
```

| leaf | series ric (n_obs) · freq | role | sign | LEAD (mo) | mechanism | data quality |
|---|---|---|---|---|---|---|
| **USD/IDR** | `FX_IDC:USDIDR` (weekly_obs 801) | **cost** | **−1** | **0–1 (LEADS mildly)** | weaker IDR raises USD COGS for importers faster than IDR re-pricing → margin squeeze; the basket's primary identifiable swing factor | liquid FX, real-time — **forecast candidate (cost beta)** |
| **DXY** | `TVC:DXY` (800) — **use, not BBDXY** | cost/flow | **−1** | 0–1 | broad USD strength = EM-flow headwind + import-cost proxy for small-cap importers | liquid; **GLOBAL_CORR currently maps `dxy`→empty BBDXY (bug)** |
| Import: electrical machinery | `CEICI323787402` (n172, P1M, USD mn) | cost | −1 (level) | 0 | USD value of imported electrical inputs — a direct import-cost read | CEIC trade, pub-lagged → attribution |
| Copper | `COMEX:HG1!` (800) | cost | −1 | 0–2 | component metal (wiring/connectors/boards) — **minor** for assemblers vs cable names | liquid; small weight — keep but expect low IC |
| IPI Computers & Electronics | `CEIC323568402` (n180, P1M) / `CEICI323566102` (n60, P3M) | supply | +1 | 0 (coincident) | domestic electronics output level — co-moves with the basket's own activity | pub-lagged; the monthly id.json series (n180) > quarterly catalog (n60) |
| IPI Electrical Equipment | `CEICI323566202` (n60, P3M) | supply | +1 | 0 | sector output proxy | quarterly, pub-lagged → attribution |

**Forecast hypothesis (cost):** **S1 USD/IDR + DXY** is the spine. These are liquid,
exogenous, real-time prices with a clean −1 sign (importer margin), and they carry a mild
0–1-month lead because FX moves before quarterly margins print. This — together with the
NDX/SOX demand beta — is **the marginal skill the backtest is picking up**. The CEIC IPI /
import-value prints are coincident attribution.

---

## 5. MACRO / RATE / FX / FLOW

| leaf | series ric · freq | role | sign | LEAD | mechanism | note |
|---|---|---|---|---|---|---|
| USD/IDR | `FX_IDC:USDIDR` | macro/cost | **−1** | 0–1 | importer margin (see S1) — the single most important macro for this basket | already wired |
| DXY | `TVC:DXY` (fix from BBDXY) | macro | −1 | 0–1 | EM small-cap flow + USD-cost | **bug fix** |
| US 10Y | `TVC:US10Y` (800) | macro | −1 | 0–2 | global discount-rate / duration on the small-cap tech beta | candidate to add |
| US real 10Y | `DFII10` (800) | macro | −1 | 0–2 | the cleaner duration signal for tech multiples; **not wired anywhere in GLOBAL_CORR** | candidate (new resolver) |
| BI 7DRR | `ECONOMICS:IDINTR` | macro | −1 | 0–3 | domestic financing / consumer-credit cost for durables (AXIO/GLVA channel) | std macro |
| ID 10Y | `TVC:ID10Y` (800) | macro | −1 | 0–2 | local discount rate | optional |
| GDP real (q) | `aIDGDPAR1` | demand | +1 | 0 (lagging) | domestic-demand backdrop (MTDL services/enterprise) | std macro, pub-lagged |
| VIX | `CBOE:VIX` (800) | macro | −1 | 0–1 | risk-off crushes high-β small caps (PTSN/GLVA) | optional flow overlay |

**Flow note:** the basket's high-β sleeves (PTSN 0.48, GLVA 0.64) make it a **risk-appetite
proxy** — DXY/VIX/NDX move it through the EM-small-cap-flow channel as much as through
fundamentals. That is genuine but it is *beta, not a domestic lead*.

---

## 6. Cross-industry linkages (series borrowed from other CEIC categories)

- **Information & Communication Equipment retail** (`CEIC322852102`, *Retail Sales*
  category, not Technology) — the on-point demand proxy lives in the **macro/retail**
  block, not the equity-Technology CEIC block.
- **Machinery & Equipment trade** (`CEICI324032102` export machinery/electronics;
  `CEICI323787402` import electrical machinery) — these sit under **Industrials &
  Manufacturing :: Machinery & Equipment**, borrowed as PTSN export + import-cost reads.
- **Computer & Electronics Mfg IPI** (`CEIC323568402`) — **Industrial Production**
  category.
- **Consumer Surveys** (`aIDCONIAR`, `CEIC277372902` durables intent) — macro consumer block.
- **Global tech** (`NASDAQ:NDX`, `NASDAQ:SOXX`) — market category; the true upstream of
  PTSN's order book.

The current `("Technology", None)` CEIC group is a **mis-link**: that category in this
store contains only *E-Commerce / Internet / Telecom-subscriber* series (browser share,
e-money, AOV) — irrelevant to a hardware-distribution basket and a source of curation noise.

---

## 7. Currently-wired vs available

**Wired now** (`SEED["Electronics"]`, keyed by sub_sector):
```python
"Electronics": {
    "ceic": [("Industrials & Manufacturing", "Electrical Equipment"),
             ("Technology", None)],
    "globals": [("copper", "cost", -1, "component metal input")],
    "macro": [("usdidr", "macro", -1, "imported components"),
              ("cn_ip_yoy", "demand", +1, "electronics supply chain")],
}
```

| theme | wired now | available to ADD (priority) | bug / note |
|---|---|---|---|
| Global tech cycle | — | **NDX (+1)**, **SOX via `NASDAQ:SOXX`/`AMEX:SMH` (+1)** | **highest priority; no semi key in GLOBAL_CORR** |
| USD cost | `usdidr −1` ✓ | **DXY −1** | `dxy`→`TVC:BBDXY` is **EMPTY (weekly_obs 0)** → must remap to `TVC:DXY` |
| Domestic demand | — | Info&Comm Equip retail `CEIC322852102`, durables intent `CEIC277372902` | via Retail Sales / Consumer Surveys CEIC (not the Technology group) |
| EMS export (PTSN) | — | `CEICI324032102` export machinery/electronics | attribution |
| Domestic output | Electrical-Equip IPI (in ceic) | swap toward `CEIC323568402` Computer&Electronics IPI | better-matched output proxy |
| Metal cost | `copper −1` ✓ | keep, low weight | minor for assemblers |
| China link | `cn_ip_yoy +1` ✓ | keep (broad); `aCNCSINC` too thin to rely on | ok |
| Duration | — | `us_10y −1`, `DFII10` (US real, **new resolver**) | small-cap tech multiple |
| CEIC group | `("Technology", None)` | **REMOVE / replace** — pulls e-commerce/browser-share noise | mis-link |

---

## 8. Forecastability — the honest verdict

**What the OOS backtest says.** n_oos 129, **fwd IC +0.07**, **hit−up −0.06**, placebo
pctile **0.85** → *marginal*. There **is** a forward signal (beats 85% of placebos) but it
is weak and the directional hit-rate on up-moves is slightly negative — i.e. the edge is
sign-magnitude / continuous, not a reliable up/down call.

**Where the edge comes from (mechanistically).** Two leading, liquid, exogenous prices:
1. **USD/IDR (−1, importer cost beta)** — moves before margins print.
2. **Global tech (NDX, and SOX once added) (+1)** — moves before EMS orders and before the
   high-β sleeves re-rate.
Both **lead 1–4 months**. This is the part worth keeping and amplifying.

**Where it is NOT a forecaster (concede this).** Every CEIC branch here — Info&Comm
retail, IPI, import/export value, FDI, GFCF — is a **publication-lagged quantity print**:
coincident-to-lagging, good for *attribution* ("the quarter was driven by IDR + a soft
tech cycle") but **weak for forecasting**. And the on-point domestic demand series
(`CEIC322852102`) is coincident, not leading.

**Is the marginal skill a real lead or just import-cost beta?** Honestly: **mostly an FX
import-cost beta plus a global-tech-cycle beta.** It is a *real* relationship (the
mechanism is sound and the placebo percentile is 0.85), but it is not a domestic-data
*lead* in the way coal (HBA→earnings) or poultry (feed→margin) are. The basket is closer to
"a leveraged play on IDR weakness and the Nasdaq" than to a domestically-forecastable
industry.

**What would move it from explainer to forecaster.**
- **Add the SOX/semiconductor leaf** — the single highest-expected-value change; the semi
  cycle leads downstream electronics builds by 2–4 months and is currently absent.
- **Fix DXY** (empty→populated) — restores a real flow/cost signal.
- **Drop the e-commerce CEIC noise** so the curated candidate set isn't diluted.
- Concede that beyond FX + global-tech beta, this thin-margin small-cap basket is
  **attribution-grade**, and report the engine verdict as a *contemporaneous read* (per
  the BACKTEST.md guidance for sentiment/beta baskets), not a forecast.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

**(a) GLOBAL_CORR — fix the DXY bug + add the semiconductor proxy + US real yield.**
```python
# FIX (currently maps to empty TVC:BBDXY, weekly_obs 0):
"dxy": "TVC:DXY",                 # was "TVC:BBDXY" (EMPTY) — also fixes every DXY user
# ADD:
"soxx": "NASDAQ:SOXX",            # PHLX-SOX proxy (weekly_obs 800); SMH is an alt
"us_real_10y": "DFII10",          # US 10Y real yield (weekly_obs 800) — tech duration
```
> Note: the `dxy` fix is global; it benefits any basket wiring DXY, not just Electronics.

**(b) `SEED["Electronics"]` — replace the mis-linked tree.**
```python
"Electronics": {
    # correct CEIC blocks: drop ("Technology", None) e-commerce noise.
    "ceic": [("Industrials & Manufacturing", "Computer & Electronics Mfg"),
             ("Industrials & Manufacturing", "Electrical Equipment"),
             ("Industrials & Manufacturing", "Machinery & Equipment")],
    # keep only the demand/cost trade prints; drop GDP/GFCF/establishment-count cruft.
    "ceic_exclude": [("number of establishments", None, None),
                     ("value added", None, None),
                     ("gross output", None, None),
                     ("ddi", None, None)],
    # re-role: export machinery/electronics is a PTSN demand attributor;
    # import electrical machinery is an import COST, not demand.
    "ceic_override": [("export value: machinery/electronics", "demand", +1),
                      ("import value: electrical machinery", "cost", -1)],
    "globals": [
        ("ndx",  "demand", +1, "global tech cycle -> OEM orders + high-beta re-rate (LEADS)"),
        ("soxx", "demand", +1, "semiconductor cycle -> downstream electronics build (LEADS)"),
        ("copper", "cost", -1, "minor component metal input"),
    ],
    "macro": [
        ("usdidr", "cost",  -1, "imported components/finished goods = COGS (importer margin)"),
        ("dxy",    "macro", -1, "broad USD: EM small-cap flow + import-cost beta"),
        ("us_real_10y", "macro", -1, "global tech-multiple duration"),
        ("id_consumer_confidence", "demand", +1, "discretionary electronics refresh"),
        ("cn_ip_yoy", "demand", +1, "China electronics supply-chain pulse"),
    ],
}
```
Rationale for the role flips: `usdidr` re-tagged **cost** (importer, not USD-earner — the
old "macro,−1" sign was right but the role was vague); the CEIC import line is a **cost**,
the CEIC export line a **demand** attributor.

**(c) New resolver.** None strictly required beyond the two GLOBAL_CORR additions
(`soxx`, `us_real_10y`) and the `dxy` remap. `id_consumer_confidence` already resolves to
`aIDCONIAR`. Optionally add a `("Retail Sales", "Information & Communication Equipment")`
CEIC link if the curator can reach the macro Retail-Sales block — otherwise cite
`CEIC322852102` only as an attribution series in the panel, not a wired driver.

**(d) Falsifiable backtest plan.**
1. Baseline: re-run `backtest/bt.py "Electronics"` → confirm fwd IC ≈ **+0.07**, pctile 0.85.
2. Apply (a)+(b), `build_worklist.py` → `controller.py --only`, re-run the blindfolded bt.
3. **Confirm hypothesis if:** fwd IC rises (target **≥ +0.10**, pctile **≥ 0.88**) — i.e.
   the **NDX+SOX demand leg + DXY fix** add forward skill. The leading FX/tech prices
   should carry the improvement; the CEIC prints should not move forward IC (they are
   attribution).
4. **Falsify / concede if:** adding SOX/DXY does **not** lift forward IC — then the basket
   is confirmed **import-cost + tech-beta attribution only**, keep the leaner tree (usdidr
   + ndx + dxy), and **flag the verdict as contemporaneous** in the terminal panel.
5. Guard: never keep a CEIC quantity print that only helps in-sample (per IMPROVEMENT_PLAN §6).

---

### Data bugs found (honour these)
- **`dxy` → `TVC:BBDXY` is EMPTY (weekly_obs 0)** in `market.json`; must remap to
  `TVC:DXY` (weekly_obs 800). This is a **global GLOBAL_CORR bug** affecting every DXY user.
- **No semiconductor key in GLOBAL_CORR** — `sox`/`soxx`/`smh`/`semiconduct` all absent;
  the global tech-cycle's purest signal is unwired. Use `NASDAQ:SOXX` or `AMEX:SMH` (both
  weekly_obs 800). There is no `NASDAQ:SOX` index id in this store.
- **`("Technology", None)` mis-link:** the Technology CEIC category here holds only
  E-Commerce / Internet / Telecom-subscriber series — irrelevant noise for a hardware basket.
- `DFII10` (US real 10Y, populated) is available but **unwired** anywhere in GLOBAL_CORR.
