# INDUSTRY Terminal — v1 Build Spec
**LBC Legacy Bridge Terminal · T3 · 2026-05-31**

---

## A. VISION

The Industry terminal is LBC's sector intelligence layer — the bridge between macro drivers and individual equity positions. Its purpose: **a principal clicks a sector that's moving and immediately understands why, who's winning, and what the underlying demand/supply structure looks like.** This is the "kesimpulan machine."

### The Three Lenses (principal's priorities, in order)

| # | Lens | What it shows | Primary data source |
|---|------|--------------|-------------------|
| 1 | **Demand/Supply Drivers** | Commodity prices + macro series driving each sector's revenue and cost base. THE most important view. | `macro.live_indicators`, `macro.observations` (RICs) |
| 2 | **Live Prices / Ticker Table** | IDX tickers within the sector: price, % change, 7d, 30d, breadth, conviction. | `public.equity_screen` |
| 3 | **Competitive Positioning** | Peer comps table + positioning quadrant + market-share proxy by mcap weight. | `public.equity_screen` (valuation/quality/growth columns) |

### Region Toggle

Three coverage modes, surfaced as a pill toggle on every view:

- **Global** — commodity tiles + macro indicator series (live from `macro.live_indicators`). No single-name US/global stock prices in v1 (flag; Yahoo edge-fn is a later round).
- **US** — US macro regime + sector-rotation phase overlay. No US single-name tickers in v1.
- **Indonesia (IDX)** — data-complete lens: real tickers + real drivers. Default region for all views.

---

## B. INFORMATION ARCHITECTURE

### Navigation tree

```
T3 Industry
├── [W1] industry      → LANDING (Sector Map)          ← built=true (replace existing stub)
├── [W2] ind-comps     → COMPETITIVE POSITIONING        ← built=false → v1 target
└── [W3] ind-data      → INDUSTRY DATA (Drivers)        ← built=false → v1 target
```

All three workspaces already registered in `lbc-shell.jsx` lines 54-56. `ind-comps` and `ind-data` need to be added to `LBC_LIVE_KINDS`.

### Views per workspace

#### W1 — LANDING (Sector Map)
Replaces the current `industry-ws.jsx` stub. Three stacked zones, all on one scrollable page:

```
┌──────────────────────────────────────────────────┐
│  COMMODITY PRICE TILES (horizontal strip)        │
│  WTI · Brent · Newcastle Coal · CPO · Nickel     │
│  Iron Ore · Gold · Copper · USD/IDR · IHSG       │
├──────────────────────────────────────────────────┤
│  SECTOR GRID (cards, 3-4 cols)                   │
│  Each card: sector name · conviction bar         │
│  · performance (1W/1M) · breadth · status badge  │
│  · click → Sector Detail page                    │
├──────────────────────────────────────────────────┤
│  FILTERED NEWS FEED                               │
│  Global: FT · NYT · CNBC · Forbes · Economist   │
│  Local: CNBC ID · Kontan · Bisnis · IDX · Kompas │
│  Chip filter: sector tag                         │
└──────────────────────────────────────────────────┘
```

**Sector Detail** (drill-in, replaces main area — same workspace W1, router state):
```
┌─────────────────────────────────────────────────────┐
│  Header: Sector name · conviction · status badge     │
│  Thesis line · region toggle                         │
├─────────────────┬───────────────────────────────────┤
│  TICKER TABLE   │  PRICE CHART (TradingView widget  │
│  ticker|%|7d|30d│  or Chart.js sparkline series)    │
│  breadth bar    │                                   │
├─────────────────┴───────────────────────────────────┤
│  DRIVER PANEL (demand vs supply)                    │
│  Each driver: label · current value · trend arrow   │
│  · tailwind / headwind / mixed badge · sparkline    │
├──────────────────────────────────────────────────────┤
│  KESIMPULAN (computed conclusion)                    │
│  "Coal: Headwinds dominate. ITMG leads on RS.       │
│   Newcastle -9% 30d. 3/5 tickers below 50DMA."     │
├──────────────────────────────────────────────────────┤
│  SECTOR NEWS (filtered to this sector)              │
└──────────────────────────────────────────────────────┘
```

**Movement Alerts** (sub-section on Commodity tiles area or as a banner):
Any commodity/driver with |30d change| > 10% gets a highlighted alert pill.
Example: `Coal −13% 30d` · `Nickel +16% 4W`. Derived from live_indicators change_pct or manual threshold applied to spark data.

#### W2 — COMPETITIVE POSITIONING (ind-comps)
Full-width workspace. Sector selector in a left rail. Main area:
```
┌─────────────────────────────────────────────────────┐
│  Sector picker rail (left, 200px)                  │
│  Main:                                              │
│  1. PEER COMPS TABLE                               │
│     ticker | name | mcap | PE | PB | EV/EBITDA      │
│     ROE | net_margin | rev_growth | earnings_growth │
│     div_yield | vs-sector-median delta column       │
│  2. POSITIONING QUADRANT (scatter)                 │
│     x = Valuation score (low PE/PB = right)        │
│     y = Quality score (high ROE/margins = top)     │
│     size = mcap; color = conviction                │
│  3. MARKET-SHARE PROXY BAR                         │
│     mcap weight within sub_sector (% of total)    │
│  4. PER-TICKER RANK TABLE                          │
│     6-dim score card (Macro/Industry/Technical/    │
│     Fundamental/Valuation/Risk) → total → verdict  │
└─────────────────────────────────────────────────────┘
```

#### W3 — INDUSTRY DATA (ind-data)
Demand/supply driver deep-dive. Left: sector list. Right:
```
┌─────────────────────────────────────────────────────┐
│  DRIVER TIME SERIES                                 │
│  Per driver: 12-month Chart.js line from            │
│  macro.observations (ric, date, value)              │
│  Overlaid with sector performance index             │
├──────────────────────────────────────────────────────┤
│  BUSINESS-CYCLE PHASE INDICATOR                     │
│  Current phase: Recovery / Expansion /              │
│  Slowdown / Contraction                             │
│  Favored sectors for this phase (lookup table)      │
├──────────────────────────────────────────────────────┤
│  RELATIVE-RETURN TABLE                              │
│  Sector vs IHSG: 1W / 1M / 3M / YTD / 1Y          │
│  momentum streak (consecutive up weeks)             │
└─────────────────────────────────────────────────────┘
```

---

## C. THE TAXONOMY

LBC's sector list is GICS-aligned with Indonesia-relevant decomposition. 13 sectors, each with IDX sub_sectors, concrete demand/supply drivers (mapped to real data sources), and a one-line thesis.

### Driver source legend
- **[LIVE]** = `macro.live_indicators` key (real-time, region=global/indonesia)
- **[RIC]** = `macro.series` RIC + `macro.observations` (historical series)
- **[CALC]** = derived from equity_screen columns
- **[PLACEHOLDER]** = concept identified, no RIC/key confirmed yet; needs data curation

---

### Sector 1 — ENERGY / COAL

**IDX sub_sectors:** `Coal Mining`, `Oil & Gas`
**Key IDX tickers:** BYAN, ADRO, ITMG, PTBA, BUMI, HRUM, KKGI, MBAP

**Demand drivers:**
| Driver | Source | Key / RIC |
|--------|--------|-----------|
| China power consumption | [LIVE] | key: `china_power_consumption` or [PLACEHOLDER] |
| India thermal coal import | [PLACEHOLDER] | no RIC confirmed |
| Newcastle coal spot | [LIVE] | key: `newcastle_coal` (region=global, category=markets) |
| IHSG industrial production | [LIVE] | key: `id_industrial_production` |

**Supply drivers:**
| Driver | Source | Key / RIC |
|--------|--------|-----------|
| PLN domestic electricity demand | [PLACEHOLDER] | |
| Coal export quota (Indonesia) | [PLACEHOLDER] | |
| China ban/tariff regime | [PLACEHOLDER] | news-derived |
| USD/IDR FX (cost base) | [LIVE] | key: `idr_usd` (region=indonesia, category=fx) |

**Thesis:** Newcastle price is the single most important signal; China power demand creates the demand floor; a rising IDR compresses USD-denominated revenue per ton.

---

### Sector 2 — METALS & MINING / NICKEL

**IDX sub_sectors:** `Metal & Mineral Mining`, `Basic Metal & Steel`
**Key IDX tickers:** ANTM, MDKA, MBMA, INCO, NCKL, KRAS, ISSP

**Demand drivers:**
| Driver | Source |
|--------|--------|
| LME Nickel spot | [LIVE] key: `nickel_spot` (category=markets) |
| EV battery demand (proxy: global EV sales) | [PLACEHOLDER] |
| China stainless steel output | [PLACEHOLDER] |
| Iron ore spot | [LIVE] key: `iron_ore_spot` |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Indonesia nickel ore export ban regime | [PLACEHOLDER] news-derived |
| Philippine ore volumes | [PLACEHOLDER] |
| USD/IDR | [LIVE] |
| Energy cost (coal) | [LIVE] key: `newcastle_coal` |

**Thesis:** Nickel is an EV-cycle play trapped in an oversupply correction; HPAL capex cycle and export ban enforcement are the alpha-generating variable.

---

### Sector 3 — BANKS / FINANCIALS

**IDX sub_sectors:** `Bank`, `Financing`, `Insurance`, `Securities`
**Key IDX tickers:** BBCA, BBRI, BMRI, BBNI, BRIS, BDMN, NISP, ARTO, BBYB

**Demand drivers:**
| Driver | Source |
|--------|--------|
| BI 7DRR policy rate | [LIVE] key: `bi_rate` (region=indonesia, category=rates) |
| Indonesia GDP growth | [LIVE] key: `id_gdp_growth` (category=growth) |
| Credit growth (BI monthly) | [PLACEHOLDER] |
| Consumer confidence | [LIVE] key: `id_consumer_confidence` |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| NPL ratio (system-wide) | [PLACEHOLDER] BI data |
| CASA ratio | [CALC] equity_screen |
| USD/IDR (FX loan risk) | [LIVE] |
| US10Y (risk appetite) | [RIC] US10YT=RR or equivalent |

**Thesis:** Rate-cut cycle is the primary tailwind — every 25bps cut expands NIM optionality for liability-sensitive banks; BBCA/BBRI most leveraged.

---

### Sector 4 — PROPERTY / REAL ESTATE

**IDX sub_sectors:** `Property & Real Estate`, `Building Construction`
**Key IDX tickers:** BSDE, CTRA, SMRA, PWON, ASRI, LPKR, JSMR, WIKA, PTPP

**Demand drivers:**
| Driver | Source |
|--------|--------|
| BI mortgage rate | [PLACEHOLDER] derived from BI rate + spread |
| Residential price/m2 index | [PLACEHOLDER] — principal's example "house rate /m2" |
| Population urbanization rate | [PLACEHOLDER] |
| Government infrastructure spend | [PLACEHOLDER] APBN data |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Cement price | [PLACEHOLDER] |
| Steel rebar price | [LIVE] key: `steel_rebar` if available, else [PLACEHOLDER] |
| Labor cost index | [PLACEHOLDER] |
| Land bank (company-specific) | [CALC] equity_screen + company disclosures |

**Thesis:** Rate-cut cycle is the key unlock — affordability is rate-elastic; infrastructure pipeline from state constructors creates secondary demand.

---

### Sector 5 — PLANTATION / CPO

**IDX sub_sectors:** `Plantation`
**Key IDX tickers:** AALI, LSIP, SIMP, SSMS, PALM, TAPG, TBLA

**Demand drivers:**
| Driver | Source |
|--------|--------|
| CPO (Palm Oil) spot — Bursa Malaysia | [LIVE] key: `cpo_spot` (category=markets) |
| China vegetable oil import | [PLACEHOLDER] |
| India CPO import demand | [PLACEHOLDER] |
| Biodiesel mandate (B35/B40) | [PLACEHOLDER] news/policy |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| El Nino / La Nina cycle | [PLACEHOLDER] weather-derived |
| Replanting cycle age profile | [PLACEHOLDER] company-level |
| Malaysia production volume | [PLACEHOLDER] MPOB data |
| USD/IDR | [LIVE] |

**Thesis:** CPO spot is the single price signal; the B35/B40 domestic mandate creates a price floor and volumes backstop; El Nino risk is the supply shock variable.

---

### Sector 6 — CONSUMER STAPLES

**IDX sub_sectors:** `Food & Beverages`, `Household Products`, `Tobacco`
**Key IDX tickers:** UNVR, INDF, ICBP, MYOR, MLBI, GGRM, HMSP, KLBF

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia CPI | [LIVE] key: `id_cpi` (region=indonesia, category=inflation) |
| Consumer confidence | [LIVE] key: `id_consumer_confidence` |
| Real wage growth | [PLACEHOLDER] BPS data |
| Population / middle-class growth | [PLACEHOLDER] |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Wheat price (global) | [RIC] WHc1 or CBOT Wheat RIC |
| Sugar price | [RIC] SBc1 or equivalent |
| CPO (ingredient cost) | [LIVE] key: `cpo_spot` |
| USD/IDR (imported inputs) | [LIVE] |

**Thesis:** Defensive sector; real wage recovery and lower-than-expected CPI are the growth unlock; input costs (wheat/sugar/CPO) are the margin risk.

---

### Sector 7 — CONSUMER DISCRETIONARY / RETAIL

**IDX sub_sectors:** `Retail Trade`, `Automotive`, `Apparel`
**Key IDX tickers:** MAPI, ACES, LPPF, RALS, ASII, AUTO, SMSM, IMAS, ERAA

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia consumer confidence | [LIVE] |
| Indonesia retail sales index | [PLACEHOLDER] BI data |
| Automotive sales (Gaikindo monthly) | [PLACEHOLDER] |
| Middle-income disposable income | [PLACEHOLDER] |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| USD/IDR (imported goods cost) | [LIVE] |
| Fuel price (transport cost) | [LIVE] or [PLACEHOLDER] |
| VAT/import duty regime | [PLACEHOLDER] policy-derived |

**Thesis:** Cyclical demand; luxury retail and auto are most rate-sensitive — rate cuts drive financing, driving purchase decisions.

---

### Sector 8 — INDUSTRIALS

**IDX sub_sectors:** `Heavy Construction`, `Industrial Machinery`, `Logistics`, `Shipping`
**Key IDX tickers:** SMDR, HITS, BBRM, SMSM, WIKA, PTPP, ADHI, TLKM (infra)

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia infrastructure capex (APBN) | [PLACEHOLDER] |
| Coal/commodity export volume (shipping demand) | [LIVE] via Newcastle/CPO volumes |
| Manufacturing PMI (Indonesia) | [LIVE] key: `id_pmi` (category=growth) |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Steel / rebar price | [PLACEHOLDER] |
| Fuel (bunker oil) | [LIVE] key: `wti_crude` or `brent_crude` |
| USD/IDR | [LIVE] |

**Thesis:** Government infrastructure spend is the demand anchor; commodity export volumes drive bulk shipping; PMI expansion drives capex orders.

---

### Sector 9 — HEALTHCARE

**IDX sub_sectors:** `Pharmaceuticals`, `Healthcare Equipment`, `Hospital`
**Key IDX tickers:** KLBF, SIDO, PYFA, MIKA, SILO, HEAL

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia CPI health sub-index | [PLACEHOLDER] |
| Government healthcare spend (APBN) | [PLACEHOLDER] |
| BPJS coverage expansion | [PLACEHOLDER] |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Active pharmaceutical ingredients (USD import) | [PLACEHOLDER] |
| USD/IDR | [LIVE] |

**Thesis:** Structural growth from BPJS expansion and aging demographics; defensive against economic cycles; FX is the primary risk (imported APIs).

---

### Sector 10 — TELECOMMUNICATIONS

**IDX sub_sectors:** `Telecommunication`
**Key IDX tickers:** TLKM, EXCL, ISAT, FREN, LINK

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia data traffic growth | [PLACEHOLDER] |
| Smartphone penetration | [PLACEHOLDER] |
| 5G spectrum rollout | [PLACEHOLDER] policy |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Tower lease costs | [PLACEHOLDER] |
| USD debt service (FX-denominated capex) | [LIVE] USD/IDR |
| Spectrum fee (government) | [PLACEHOLDER] |

**Thesis:** ARPU recovery from data monetization is the key variable; TLKM is a quasi-utility with state backstop; FX-denominated debt is the risk for leveraged operators.

---

### Sector 11 — UTILITIES

**IDX sub_sectors:** `Electricity`, `Gas & Water Supply`
**Key IDX tickers:** PGAS, POWR, CINI, ARNA

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia electricity consumption | [PLACEHOLDER] PLN data |
| Industrial output | [LIVE] key: `id_industrial_production` |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| Gas/LNG price | [LIVE] key: `lng_spot` or [RIC] LNGc1 |
| Coal price (power gen input) | [LIVE] key: `newcastle_coal` |
| Regulated tariff regime | [PLACEHOLDER] policy |

**Thesis:** Regulated, defensive; coal/gas input costs are the margin variable — tariff adjustments lag, creating periodic squeeze.

---

### Sector 12 — TECHNOLOGY

**IDX sub_sectors:** `Computer & Services`, `Electronic & Components`
**Key IDX tickers:** GOTO, BUKA, EMTK, ARTO, BBYB, DNET

**Demand drivers:**
| Driver | Source |
|--------|--------|
| Indonesia internet economy GMV | [PLACEHOLDER] |
| Digital payment volume | [PLACEHOLDER] |
| Global tech sentiment (NASDAQ) | [LIVE] key: `nasdaq_comp` (category=markets) |

**Supply drivers:**
| Driver | Source |
|--------|--------|
| US10Y (DCF discount rate) | [RIC] US10YT=RR |
| USD/IDR | [LIVE] |
| Regulatory OJK fintech rules | [PLACEHOLDER] |

**Thesis:** Early-stage; GMV growth vs. path-to-profitability is the core tension; global risk appetite (US10Y) drives re-rating more than IDX fundamentals.

---

### Commodities Layer (cross-sector, on Landing page tiles)

These appear as the commodity price tile strip on the Landing page and feed into sector driver panels.

| Commodity | Source | Live key / RIC |
|-----------|--------|----------------|
| WTI Crude Oil | [LIVE] | `wti_crude` (region=global, category=markets) |
| Brent Crude | [LIVE] | `brent_crude` |
| Newcastle Coal | [LIVE] | `newcastle_coal` |
| CPO (Palm Oil) | [LIVE] | `cpo_spot` |
| Nickel LME | [LIVE] | `nickel_spot` |
| Iron Ore | [LIVE] | `iron_ore_spot` |
| Gold | [LIVE] | `gold_spot` |
| Copper LME | [LIVE] | `copper_spot` |
| USD/IDR | [LIVE] | `idr_usd` (region=indonesia, category=fx) |
| IHSG | [LIVE] | `ihsg` (category=markets) |

> **Note:** All keys above are best-guess canonical labels inferred from `macro.live_indicators` schema. Builder must run `SELECT key, label FROM macro.live_indicators WHERE category='markets'` to confirm exact key strings before wiring.

---

## D. ANALYTICS (ML-Free, All Pure Functions)

All analytics live in `industry-core.jsx` as pure JS functions. No server compute.

### D1 — Conviction Score

Ported from MERIDIAN `aggregator.ts`. Inputs computed from `equity_screen` rows filtered to sector.

```js
// breadth  = (count tickers where price > 50DMA proxy) / total tickers
// 50DMA proxy: price vs w52_low + (w52_high - w52_low)*0.5 — approximation
// flow     = sector avg_volume / sector 20d-avg-vol (same column if available)
//            v1 fallback: avg_volume / (adv_value / price) to approximate 20d avg
// m1       = avg change_pct (1-day) across sector tickers
// w1       = sign flag: +1 if majority tickers positive change_pct, else -1

function computeConviction(m1, breadth, flow, w1) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const sign = v => v >= 0 ? 1 : -1;
  return clamp(
    50
    + clamp(m1 / 5, -1, 1) * 25
    + clamp((breadth - 0.5) * 2, -1, 1) * 25
    + sign(w1) * clamp((flow - 1) / 0.5, -1, 1) * 10,
    0, 100
  );
}
```

### D2 — Sector Status

```js
function deriveStatus(conviction, m1, breadthDelta) {
  if (conviction >= 65 && m1 > 0)                 return 'BULLISH';
  if (conviction <= 35 && m1 < 0)                 return 'BEARISH';
  if (Math.abs(breadthDelta) > 0.15)               return 'ROTATION';
  return 'NEUTRAL';
}
// breadthDelta = breadth(now) - breadth(1W ago) — approximated from price changes
```

### D3 — Relative-Return Ranking vs IHSG

Inputs: `change_pct` (1d), and computed 7d/30d from current price vs w52_low/high proxies.

```js
// relReturn(period) = sectorAvgReturn(period) - benchmarkReturn(period)
// benchmark = IHSG change from macro.live_indicators (key: ihsg, change_pct or spark)
// Rank sectors by relReturn descending for each period.
```

### D4 — Momentum Streak

```js
// From spark data [{d, v}] sorted by date:
function momentumStreak(spark) {
  let streak = 0;
  for (let i = spark.length - 1; i > 0; i--) {
    if (spark[i].v > spark[i-1].v) streak++;
    else break;
  }
  return streak; // consecutive up-weeks
}
```

### D5 — Business-Cycle Phase Detection

Four inputs from `macro.live_indicators`:
- `id_pmi` (Manufacturing PMI, Indonesia) — proxy for growth momentum
- `id_yieldcurve` or US10Y vs US2Y spread (yield curve) — [RIC] US10YT=RR / US2YT=RR
- `id_cpi` (inflation trend, 3M change direction)
- `id_gdp_growth` (YoY, latest vs prior)

```js
const PHASES = {
  Recovery:    { pmi: 'rising', curve: 'steepening', cpi: 'low',   growth: 'trough'   },
  Expansion:   { pmi: 'above50', curve: 'normal',  cpi: 'rising', growth: 'above_avg' },
  Slowdown:    { pmi: 'falling', curve: 'flattening', cpi: 'high', growth: 'peaking'  },
  Contraction: { pmi: 'below50', curve: 'inverted', cpi: 'falling',growth: 'below_avg'},
};

// Sector favorability lookup table (ML-free, rule-based):
const PHASE_FAVORITES = {
  Recovery:    ['Banks', 'Consumer Discretionary', 'Industrials', 'Technology'],
  Expansion:   ['Energy', 'Metals & Mining', 'Plantation', 'Industrials'],
  Slowdown:    ['Consumer Staples', 'Healthcare', 'Utilities', 'Telco'],
  Contraction: ['Consumer Staples', 'Healthcare', 'Utilities', 'Gold/Precious Metals'],
};

function detectPhase(pmi, curveSteepness, cpiTrend, gdpMomentum) {
  // Simple scoring: each input votes for a phase; majority wins.
  // Returns: { phase: 'Expansion', confidence: 0.75, favorites: [...] }
}
```

### D6 — Driver Tailwind/Headwind Posture

```js
// For each driver in a sector's driver list:
// posture = 'tailwind' | 'headwind' | 'mixed'
// Rule: compare latest_value vs prev_value (change direction) + upIs field from taxonomy
// upIs = 'tailwind' means rising price is good for the sector

function driverPosture(driver) {
  const dir = driver.latest_value > driver.prev_value ? 'up' : 'down';
  if (driver.upIs === 'tailwind') return dir === 'up' ? 'tailwind' : 'headwind';
  if (driver.upIs === 'headwind') return dir === 'up' ? 'headwind' : 'tailwind';
  return 'mixed';
}

// Aggregate: if >= 60% of demand drivers are tailwind AND <40% of supply drivers are headwind → FAVORABLE
// If >= 60% of demand drivers are headwind → UNFAVORABLE
// Else MIXED
```

### D7 — Kesimpulan Generator

Computed string from sector analytics. No LLM — deterministic template.

```js
function generateKesimpulan(sector, tickers, drivers, conviction, status) {
  // Leader: ticker with highest change_pct in sector
  // Laggard: ticker with lowest change_pct
  const leader   = tickers.reduce((a,b) => a.change_pct > b.change_pct ? a : b);
  const laggard  = tickers.reduce((a,b) => a.change_pct < b.change_pct ? a : b);
  const bullDrvrs = drivers.filter(d => d.posture === 'tailwind');
  const bearDrvrs = drivers.filter(d => d.posture === 'headwind');
  const breadthPct = Math.round(tickers.filter(t => t.change_pct > 0).length / tickers.length * 100);

  const driverLine = bearDrvrs.length > bullDrvrs.length
    ? `Headwinds dominate: ${bearDrvrs.slice(0,2).map(d=>d.label).join(', ')}.`
    : bullDrvrs.length > 0
    ? `Tailwinds present: ${bullDrvrs.slice(0,2).map(d=>d.label).join(', ')}.`
    : `Driver picture mixed.`;

  return `${sector.name}: ${status}. ${driverLine} ` +
    `${leader.symbol} leads (+${leader.change_pct?.toFixed(1)}%); ` +
    `${laggard.symbol} lags (${laggard.change_pct?.toFixed(1)}%). ` +
    `${breadthPct}% of tickers positive. Conviction ${conviction}/100.`;
}
```

### D8 — 6-Dimension Competitive Score (per ticker)

Weights: Macro 15 / Industry 15 / Technical 20 / Fundamental 20 / Valuation 15 / Risk 15 = 100

```js
function computeTickerScore(t, sectorMedians, macroPhase) {
  // Macro (15): business-cycle phase → sector favored? +1.0 : 0.5 : 0.0
  const macroScore = PHASE_FAVORITES[macroPhase]?.includes(t.sector) ? 1.0 : 0.5;

  // Industry (15): RS vs sector (change_pct vs sector avg)
  const sectorAvgChg = sectorMedians.change_pct;
  const indScore = clamp((t.change_pct - sectorAvgChg) / 5 + 0.5, 0, 1);

  // Technical (20): price vs 52W midpoint proxy
  const midpoint = (t.w52_high + t.w52_low) / 2;
  const techScore = clamp((t.price - t.w52_low) / (t.w52_high - t.w52_low || 1), 0, 1);

  // Fundamental (20): ROE + net_margin + earnings_growth vs medians
  const fundScore = clamp(
    ((t.roe / (sectorMedians.roe || 1)) * 0.4 +
     (t.net_margin / (sectorMedians.net_margin || 1)) * 0.3 +
     (t.earnings_growth > 0 ? 0.3 : 0)) , 0, 1);

  // Valuation (15): lower PE/PB/EV_EBITDA vs median = better
  const valScore = clamp(
    1 - ((t.pe / (sectorMedians.pe || 1)) * 0.4 +
         (t.pb / (sectorMedians.pb || 1)) * 0.3 +
         (t.ev_ebitda / (sectorMedians.ev_ebitda || 1)) * 0.3) / 3, 0, 1);

  // Risk (15): lower beta + positive current_ratio + lower debt_equity
  const riskScore = clamp(
    (1 - clamp(t.beta / 2, 0, 1)) * 0.4 +
    clamp(t.current_ratio / 3, 0, 1) * 0.3 +
    (1 - clamp(t.debt_equity / 3, 0, 1)) * 0.3, 0, 1);

  const total =
    macroScore * 15 + indScore * 15 + techScore * 20 +
    fundScore * 20 + valScore * 15 + riskScore * 15;

  const verdict =
    total >= 80 ? 'STRONG_BUY' : total >= 65 ? 'BUY' :
    total >= 55 ? 'ACCUMULATE' : total >= 45 ? 'HOLD' :
    total >= 35 ? 'REDUCE' : 'AVOID';

  return { total, verdict, breakdown: { macroScore, indScore, techScore, fundScore, valScore, riskScore } };
}
```

---

## E. COMPETITIVE POSITIONING DESIGN

### E1 — Peer Comps Table (W2)

Source: `equity_screen` filtered by `sub_sector`. All columns available directly.

Columns displayed:
```
Symbol | Name | MCap (Rp T) | PE | PB | EV/EBITDA | ROE% | Net Margin% |
Rev Growth% | Earnings Growth% | Div Yield% | [PE vs median Δ] | Rank
```

Sector median row pinned at bottom. Delta column: `(ticker.pe - median.pe) / median.pe * 100` → displayed as `±X%` in --pos/--neg color.

### E2 — Positioning Quadrant (Scatter)

```
Y axis: Quality Score = (ROE rank + net_margin rank) / 2, normalized 0–1
X axis: Valuation Score = inverted (PE rank + PB rank + EV/EBITDA rank) / 3, normalized 0–1
         (right = cheaper)
Dot size: mcap (log scale)
Dot color: conviction (amber gradient)
Label: ticker symbol
```

Quadrant labels:
- Top-right: "Quality Value" (ideal)
- Top-left: "Quality Premium" (expensive quality)
- Bottom-right: "Value Trap risk"
- Bottom-left: "Avoid"

### E3 — Market-Share Proxy

```js
// mcapWeight(ticker) = ticker.mcap / sum(sector tickers mcap)
// Rendered as horizontal bar chart, sorted descending.
```

### E4 — Per-Ticker Rank Table

6-dim scores (from D8) as spark-like mini-bars, total score, verdict badge.
Sorted by total score descending. Clickable → opens stock workspace (T4 Equity deep-dive).

---

## F. DATA WIRING

### F1 — window.INDUSTRY API

Expose as a global helper (mirroring `window.LEGION`, `window.FINANCE` patterns):

```js
// industry-core.jsx exposes:
window.INDUSTRY = {
  // PostgREST base
  BASE: 'https://adnubucjlezrtusbicja.supabase.co/rest/v1',
  ANON: 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',

  // Auth: read JWT from localStorage lbc_auth
  headers() {
    const tok = JSON.parse(localStorage.getItem('lbc_auth') || '{}');
    return {
      'apikey': this.ANON,
      'Authorization': `Bearer ${tok.access_token || this.ANON}`,
      'Accept-Profile': 'public',
    };
  },
  macroHeaders() {
    return { ...this.headers(), 'Accept-Profile': 'macro' };
  },

  // ---- Live Indicators (Landing commodity tiles + driver panels) ----
  // GET macro.live_indicators filtered by key list
  async fetchIndicators(keys) {
    const q = keys.map(k => `key.eq.${k}`).join(',');
    const r = await fetch(
      `${this.BASE}/live_indicators?or=(${q})&select=key,label,latest_value,prev_value,change_pct,spark,unit`,
      { headers: this.macroHeaders() }
    );
    return r.json();
  },

  // ---- Equity Screen (sector tickers) ----
  // GET equity_screen filtered by sub_sector list
  async fetchSectorTickers(subSectors) {
    const q = subSectors.map(s => `sub_sector.eq.${encodeURIComponent(s)}`).join(',');
    const r = await fetch(
      `${this.BASE}/equity_screen?or=(${q})&select=symbol,yahoo,name,sector,sub_sector,price,change_pct,mcap,avg_volume,adv_value,pe,pb,ps,ev_ebitda,roe,roa,net_margin,gross_margin,rev_growth,earnings_growth,debt_equity,current_ratio,beta,div_yield,w52_high,w52_low,updated_at&order=mcap.desc`,
      { headers: this.headers() }
    );
    return r.json();
  },

  // ---- All sectors (sector grid on Landing) ----
  async fetchAllEquity() {
    const r = await fetch(
      `${this.BASE}/equity_screen?select=symbol,name,sector,sub_sector,price,change_pct,mcap,pe,pb,roe,net_margin,w52_high,w52_low&order=mcap.desc`,
      { headers: this.headers() }
    );
    return r.json();
  },

  // ---- Historical driver series (W3 Industry Data charts) ----
  // Query macro.observations for a given RIC, last 52 weeks
  async fetchDriverHistory(ric, weeksBack = 52) {
    const since = new Date(Date.now() - weeksBack * 7 * 86400000).toISOString().slice(0,10);
    const r = await fetch(
      `${this.BASE}/observations?ric=eq.${encodeURIComponent(ric)}&date=gte.${since}&select=date,value&order=date.asc`,
      { headers: this.macroHeaders() }
    );
    return r.json();
  },

  // ---- Sector list with available RICs ----
  async fetchSeries(category) {
    const r = await fetch(
      `${this.BASE}/series?category=eq.${encodeURIComponent(category)}&select=ric,description,units&limit=200`,
      { headers: this.macroHeaders() }
    );
    return r.json();
  },
};
```

### F2 — What's Live vs Placeholder

| Data | Status | Notes |
|------|--------|-------|
| `equity_screen` ticker prices, valuation, fundamentals | **LIVE** | IDX universe only |
| `macro.live_indicators` commodity prices (coal, CPO, nickel, WTI, gold, copper) | **LIVE** — confirm keys | Run SELECT to confirm key strings |
| `macro.live_indicators` macro rates (BI, CPI, GDP, PMI, FX) | **LIVE** — confirm keys | Same |
| `macro.observations` historical RIC series | **LIVE** | Series by RIC; confirm which commodity RICs are populated |
| US/Global single-name stock prices | **PLACEHOLDER** | Yahoo edge-fn, later round |
| Residential property price/m2 index | **PLACEHOLDER** | No BPS/BI series wired yet |
| Coal export quota data | **PLACEHOLDER** | News-derived only |
| China-side demand data (power consumption, stainless output) | **PLACEHOLDER** | No China sub-indicators confirmed |
| Business-cycle yield curve spread | **LIVE (partial)** | US10Y RIC should exist in macro.series; confirm |
| News feed (FT/CNBC/Kontan/etc.) | **PLACEHOLDER** | No news API wired in Industry yet; reuse macro-news.jsx approach |

### F3 — Caching Strategy

All `INDUSTRY.*` fetches cache to `sessionStorage` with a 5-minute TTL:
```js
// Key: `ind_cache_${fetchFnName}_${JSON.stringify(args)}`
// On read: if (Date.now() - cached.ts < 300000) return cached.data;
// On write: sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
```

Equity screen data refreshes on sector navigation (not on every render).
Live indicators refresh every 60 seconds if user is on Landing.

---

## G. BUILD FILE PLAN

### G1 — New / Modified Files

```
launcher/scripts/
├── industry-core.jsx     NEW  — window.INDUSTRY helper + analytics + taxonomy
│                               (pure functions: computeConviction, deriveStatus,
│                                driverPosture, generateKesimpulan, computeTickerScore,
│                                detectPhase, momentumStreak, relReturnRank)
│                               + SECTOR_TAXONOMY constant (all 13 sectors with
│                                 subSectors[], demandDrivers[], supplyDrivers[], thesis)
│                               + COMMODITY_KEYS constant
│                               + window.INDUSTRY PostgREST API object
│                               Target: ~400 lines
│
├── industry.jsx          REPLACE current stub
│                               Root component IndustryWorkspace:
│                               - Landing page (commodity tiles + sector grid + news)
│                               - Sector Detail page (router state: selectedSector)
│                               - Movement Alerts sub-component
│                               - Region toggle (Global / US / Indonesia)
│                               Target: ~500 lines
│
├── industry-comps.jsx    NEW  — W2 Competitive Positioning
│                               - SectorPicker rail
│                               - PeerCompsTable (equity_screen data)
│                               - PositioningQuadrant (SVG scatter)
│                               - MarketShareBar
│                               - TickerRankTable (6-dim scores)
│                               Target: ~400 lines
│
├── industry-data.jsx     NEW  — W3 Industry Data (drivers deep-dive)
│                               - SectorPicker rail
│                               - DriverTimeSeries (Chart.js, macro.observations)
│                               - BusinessCyclePanel
│                               - RelativeReturnTable
│                               Target: ~350 lines
│
└── industry-ws.jsx       RETIRE → content migrated into industry.jsx above

launcher/styles/
├── industry-ws.css       EXTEND — keep existing classes, add new ones for:
│                               commodity tiles, driver panels, kesimpulan block,
│                               positioning quadrant, comps table, movement alerts
│                               Accent: --ind-accent: #f5a623 (amber/gold)
│                               Target: existing + ~200 new lines
│
└── tokens.css            NO CHANGE — uses existing --bg-*, --paper, --pos, --neg, --font-mono
```

### G2 — Registration Changes

**lbc-shell.jsx** — update industry terminal workspaces (lines 53-57):
```js
{ id: 'industry', num: 'T3', name: 'Industry', accent: '#f5a623', icon: LBC_ICONS.industry,
  desc: 'Sectors, peer comps and demand-supply drivers across IDX — commodity prices, driver analysis, competitive positioning.',
  workspaces: [
    { kind: 'industry',  label: 'Sector Map',    built: true },
    { kind: 'ind-comps', label: 'Peer Comps',    built: true },  // flip to true in v1
    { kind: 'ind-data',  label: 'Industry Data', built: true },  // flip to true in v1
  ] },
```

**LBC_LIVE_KINDS** (line 108) — add `'ind-comps'` and `'ind-data'`:
```js
const LBC_LIVE_KINDS = new Set([..., 'industry', 'ind-comps', 'ind-data', ...]);
```

**app.jsx or lbc-shell render branch** — add kind routing:
```js
// In the workspace render switch:
case 'industry':  return <IndustryWorkspace />;       // window.IndustryWorkspace
case 'ind-comps': return <IndustryComps />;           // window.IndustryComps
case 'ind-data':  return <IndustryData />;            // window.IndustryData
```

**index.html** — add script tags in load order:
```html
<script src="scripts/industry-core.jsx" type="text/babel"></script>
<script src="scripts/industry.jsx"      type="text/babel"></script>
<script src="scripts/industry-comps.jsx" type="text/babel"></script>
<script src="scripts/industry-data.jsx"  type="text/babel"></script>
```
(Replace single `industry-ws.jsx` tag.)

### G3 — Window Globals Exposed

| Global | Defined in | Consumed by |
|--------|-----------|-------------|
| `window.INDUSTRY` | industry-core.jsx | all three workspaces |
| `window.SECTOR_TAXONOMY` | industry-core.jsx | all three workspaces |
| `window.COMMODITY_KEYS` | industry-core.jsx | industry.jsx |
| `window.IndustryWorkspace` | industry.jsx | app.jsx render |
| `window.IndustryComps` | industry-comps.jsx | app.jsx render |
| `window.IndustryData` | industry-data.jsx | app.jsx render |

### G4 — v1 vs Later Rounds

**v1 (this build):**
- All three workspaces functional with IDX data (equity_screen + confirmed live_indicators)
- Landing: commodity tiles + sector grid + sector detail with ticker table + driver panel + kesimpulan
- W2: peer comps table + positioning quadrant + market-share bar + 6-dim rank table
- W3: driver time series (for drivers with confirmed RICs) + business-cycle phase panel + relative-return table
- Movement alerts on Landing (>10% threshold)
- Region toggle renders (Global and US views show available macro data; placeholder notice for missing single-name prices)

**Later rounds:**
- US single-name stock prices via Yahoo Finance edge function
- News feed integration (reuse macro-news pattern or dedicated feed API)
- Confirmed China-side macro series wired into driver panels
- Property price/m2 index when BPS data is wired
- Moving average computation from observation history (for true 50DMA breadth, not proxy)
- Pairs/rotation radar (MERIDIAN pairs.ts concept)
- TradingView chart embed on sector detail (if TV license covers this)

---

## H. OPEN RISKS / DECISIONS

| # | Risk / Decision | Recommendation |
|---|----------------|---------------|
| 1 | **Exact `macro.live_indicators` key strings are unconfirmed.** Builder must run `SELECT key, label, category FROM macro.live_indicators ORDER BY category, sort_order` before wiring commodity tiles. | Assign first 30 min of build to this query. |
| 2 | **Which commodity RICs have populated `macro.observations`?** Coal, CPO, nickel may be sparse. | Run `SELECT ric, COUNT(*) FROM macro.observations GROUP BY ric HAVING COUNT(*) > 10` to find populated series. Only wire confirmed RICs in W3. |
| 3 | **Accent color.** Current T3 accent is `#4f86e0` (same blue family as other terminals). Spec proposes amber `#f5a623` for sector/commodity character. | Decision: change accent in lbc-shell.jsx line 51 or keep blue family for consistency. |
| 4 | **News feed source.** No news API is wired for Industry. Macro terminal has `macro-news.jsx`. | v1 option A: reuse `window.MacroNews` component with sector filter. Option B: placeholder. Recommend option A. |
| 5 | **50DMA proxy accuracy.** True 50DMA requires 50 days of price history per ticker. equity_screen has only current price + 52W high/low. The w52 midpoint proxy is an approximation. | Flag to user as "approximate breadth" in v1. True DMA requires a price-history table (later round). |
| 6 | **Business-cycle phase detection.** PMI series for Indonesia — confirm `id_pmi` key exists in live_indicators. Yield curve requires two rate RICs (2Y + 10Y) to be present in macro.series. | Check both before building the phase panel; if missing, show "phase detection unavailable" gracefully. |
| 7 | **TradingView chart on sector detail.** TradingView widget works for IDX symbols but requires TV account/license for embedding. | v1 fallback: Chart.js line chart from equity_screen history (limited) or skip chart, show ticker table only. Confirm TV license. |
| 8 | **`industry-ws.jsx` retirement.** Existing file has EMERGING_ID/US static data and the supplier→demander graph nodes/edges. These are worth preserving — the graph edge data (coal→utility 0.92 etc.) is useful for the driver visualization. | Migrate the edge data into SECTOR_TAXONOMY in industry-core.jsx rather than discarding it. |
| 9 | **Performance with large equity_screen.** If equity_screen has 500+ IDX rows, fetching all for the Landing sector grid is fine once; but per-sector queries are cheap. | fetchAllEquity() for Landing, fetchSectorTickers() for detail — two-tier pattern avoids over-fetching. |
| 10 | **`ind-comps` and `ind-data` are currently `built: false`** in lbc-shell.jsx. Flip both to `built: true` only when the corresponding jsx files are complete and tested. | Do NOT flip until the file is wired and renders without errors. |

---

*End of DESIGN.md — v1 Build Spec for LBC Industry Terminal (T3)*
*Author: Claude (assisting Aldee) · 2026-05-31*
