# Coal (Energy) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-B
> target: **big mcap AND already the engine's best forward forecaster**
> (blindfolded OOS **IC +0.23**, placebo pctile **1.00**). The job here is *not* to
> rescue a broken basket — it is to **deepen an already-strong tree without breaking
> it**, sharpen the lead/lag attribution, and document precisely *why* Coal forecasts
> when most baskets do not. Every series cited exists in
> `catalog/{idind,id,cn,market}.json`; RICs, n_obs and obs-dates are real and quoted.

---

## 1. Snapshot — the engine's best forecaster

| field | value |
|---|---|
| basket id | **`energy_coal`** · sub_sector **Coal** · sector **Energy** |
| mcap | **835 T** (3rd-largest sub-industry; #1 in Energy) |
| n members | **22** thermal-coal names |
| current grade | **perfected** · conf **high** |
| current kept drivers | **12** |
| **current forward OOS skill** | **IC +0.23 · hit−up +0.04 · placebo pctile 1.00 · flag `SKILL`** (n_oos **129**) |
| the gap | not a *rescue* — a **deepen-and-protect**: the seed leans on one dead resolver-key (`wb_coal_au→ICEEUR:ATR1!`, which is fine) but **misroutes DXY to an empty series** (`TVC:BBDXY`, wk=0), under-uses the **HBA admin price** for attribution, and has **no explicit supply/oversupply headwind branch** despite 232-obs production data sitting in the candidate list. |

**Members (what each does).** The basket is dominated by **thermal (steam) coal**
exporters selling USD-priced tonnes off an IDR cost base:

- **BYAN** (Bayan Resources, ~333 T = **~40% of basket cap**) — low-strip, high-CV
  thermal; an **illiquid mega-cap** (tiny free float, β −0.385): it dominates *cap*
  but its price barely co-moves with the sector, so a cap-weighted basket is heavily
  distorted by a name that is nearly a fixed point. **This is the single most important
  structural fact about the basket** (see §2 dispersion).
- **ADRO / AADI** (Adaro Energy + its spun-out thermal arm Adaro Andalan) — large
  integrated thermal exporter; AADI now holds the pure-thermal sleeve post-2024 split.
- **ITMG** (Indo Tambangraya / Banpu) — high-CV thermal, dividend payer, near-pure
  price-taker.
- **PTBA** (Bukit Asam, SOE) — domestic-tilted thermal, **most exposed to the
  PLN/DMO domestic-price channel** (β −0.412).
- **BUMI** (Bumi Resources) — large-volume thermal (KPC/Arutmin), high leverage, the
  highest-β liquid name (β +0.205) → the sleeve that actually *moves* with coal.
- **ADMR** (Adaro Minerals) — **metallurgical/coking** coal (the basket's one
  coking-coal exposure; revenue driver is HCC, not API2 thermal — see §3 D1d).
- **HRUM** (Harum Energy) — thermal + a **nickel diversification** sleeve (HPAL JV) →
  partial cross-contamination with the nickel complex (β +0.206).
- **CUAN** (Petrindo, β +1.06) — the highest-β name, coal + gold-adjacent (Prajogo
  vehicle); a sentiment/momentum sleeve, not a clean coal price-taker.
- Mid/small thermal + contractors: **GEMS** (Golden Energy), **INDY** (Indika, thermal
  + diversification), **MCOL** (Prima Andalan), **RMKE** (RMK Energy, logistics),
  **BSSR** (Baramulti), **SMMT, TOBA, DAAZ, MYOH** (BUMA contractor),
  **MBAP, KKGI, ARII, IATA**.

**The one-line characterisation:** ~85% of the basket's economic exposure is
**thermal-coal price × export volume in USD**, with one ~40% illiquid mega-cap (BYAN)
that mutes basket-level co-movement, one coking-coal name (ADMR), and a handful of
diversifiers (HRUM/CUAN/INDY) leaking into nickel/gold/sentiment.

---

## 2. Economic structure — how the basket makes money

Almost every name is a **price-taker on internationally-quoted thermal coal**, selling
USD-priced tonnes off a largely-IDR cost base. The revenue identity:

```
Revenue ≈ realised_price ($/t) × export_volume (t)          (USD)
realised_price ≈ f( API2 / Newcastle global thermal,        ← the swing variable
                    CV/quality premium-discount,
                    HBA govt benchmark — sets the floor on royalty & some DMO sales )
EBITDA   ≈ Revenue − cash_cost×volume − royalty − freight
cash_cost = mining/strip + diesel haulage + processing + overburden removal
royalty   = f(HBA tier, production, contract generation — PKP2B vs IUPK)
```

**The margin swing factor is the price–cost *gap*, and it is highly geared.** Cash
costs are sticky (strip ratio, diesel, contractor rates) while the **selling price is
fully exposed to a volatile global benchmark**. So a +20% move in API2 drops almost
entirely to EBITDA → equity returns are a **levered call on the thermal-coal price**.
This high price-to-margin gearing, on a *liquid exogenous* input, is the structural
reason Coal forecasts well (§8).

**The cost stack (what compresses margin):**
- **Diesel / haulage** (Brent-linked) — mine fleet + barging fuel.
- **Overburden removal** — strip ratio × fuel; rises as mines age (a *volume-cost*).
- **Royalty** — a function of the **HBA** tier and contract type; the HBA is therefore
  both a *revenue-floor* signal and a *cost* (higher HBA → higher royalty rate).
- **Freight** — seaborne Capesize/Panamax to China/India (no clean freight series in
  store — see §6 gap).

**Intra-basket dispersion — the dominant subtlety:**
- **BYAN (~40% cap, β −0.385, illiquid):** dominates cap weight but is nearly inert in
  return space. A **cap-weighted** basket signal is therefore *diluted* by BYAN; an
  **equal-weighted** basket (which the engine uses — see BACKTEST.md header) is the
  honest representation and is what drives the +0.23. **Do not cap-weight this basket.**
- **High-β liquid sleeve (BUMI +0.205, CUAN +1.06, RMKE +0.629, SMMT +0.848,
  TOBA +1.03):** these are the names that actually *move* with the coal price and carry
  the forecastable signal.
- **ADMR (coking):** revenue driver is **hard-coking-coal**, not thermal API2 — a
  different (steel-led) cycle. Small weight, but a clean thermal signal misattributes it.
- **HRUM / CUAN / INDY (diversifiers):** nickel/gold/sentiment leakage; the coal signal
  is partially "wrong instrument" for these.

**What a sell-side analyst actually watches:** weekly **API2 / Newcastle** prints; the
monthly **HBA** (royalty + DMO pricing); **China thermal-power coal burn + port
inventory (Qinhuangdao) + domestic raw-coal production** (the import-swing); **India
thermal demand (Coal India output, CEA stocks)**; **Capesize/Panamax freight**;
**USD/IDR** (translation); and Indonesian **production / DMO / royalty policy**.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return
> vs IHSG for a *rise* in the driver. `lead` = expected months the driver moves
> *before* the equities (the forecastability claim). **Liquid exogenous price/rate
> series → forecast candidates; CEIC quantity/price prints are publication-lagged →
> attribution.** China demand-macro series quoted by RIC carry weekly-resolved history
> in `correlation.sqlite` (market.json `china_macro`, wk shown); the deep CEIC
> coal-import/inventory series live in `cn.json` but are **not in the resolvable
> weekly store** (n_obs unpopulated) → flagged as a backfill gap, not wired in v1.

### D1 — THERMAL-COAL PRICE (the revenue engine — ~85% of the basket)
```
THERMAL-COAL PRICE  (revenue/tonne; price-taker)
├─ D1a global thermal benchmark ─► [ICEEUR:ATR1! API2 Coal, wk782]      sign +1 · lead 0–1m · FORECAST ★primary
│      (CIF ARA, the live proxy)   [ICEEUR:ATW1! Newcastle, wk0]        DEAD — do NOT wire (empty)
├─ D1b energy-complex co-move ───► [ICEEUR:BRN1! Brent, wk800]          sign +1 · lead 0–1m · FORECAST
│      (oil–coal substitution +    [NYMEX:NG1! Henry Hub, wk800]        sign +1 · lead 0–1m · gas–coal switch (US)
│       gas–coal power switching)  [SGX:JKM1! JKM LNG, wk0]             DEAD — Asian-LNG switch unmeasurable (empty)
├─ D1c broad-commodity beta ─────► [AMEX:DBC DB Commodity, wk800]       sign +1 · lead 0–1m · FORECAST (bcom proxy)
├─ D1d coking-coal (ADMR sleeve) ─► [SGX:FFX1! Coking Coal, wk0]        DEAD — no HCC price; ADMR met-coal unmodelled
│                                   [NYMEX:HRC1! US HRC steel, wk800]   sign +1 · lead 0–1m · weak met-coal proxy (steel demand)
└─ D1e HBA govt reference price ──► [CEICI354326367 Referred Price: Coal, USD/Ton, n210, →2026-06]  sign +1 · lead 0m · ATTRIBUTION
       (admin/lagged — NOT forecast) [CEICI506620937/947 HBA I/II, USD/Ton, n40, →2026-06]          sign +1 · lead 0m · ATTRIBUTION
                                     [CEICI522153977 HBA III, USD/Ton, n35]                          sign +1 · lead 0m · ATTRIBUTION
```

- **D1a — the single most important driver, and why it forecasts.** `ICEEUR:ATR1!`
  (**API2**, CIF Rotterdam thermal, **wk782**, weekly back to ~2009) is a *liquid,
  exogenous, real-time* price. It is **not** the exact grade Indonesia ships (which is
  lower-CV, sold FOB Kalimantan into China/India), but it tracks the global thermal
  cycle tightly and is the honest proxy. Because it is a market price, it **moves
  contemporaneously-to-slightly-ahead** of the IDX equities (lead 0–1m) rather than
  lagging — this is the forecast backbone. **Newcastle (`ICEEUR:ATW1!`) is wk0 (DEAD)**;
  API2 is the only live thermal benchmark — already correctly chosen in the seed.
- **D1b — energy-complex co-movement.** Coal does not trade in isolation: **Brent**
  (`ICEEUR:BRN1!`, wk800) captures oil–coal substitution and the shared "energy risk
  premium"; **Henry Hub natgas** (`NYMEX:NG1!`, wk800) captures **gas-to-coal power
  switching** (when gas is dear, utilities burn more coal → +demand). Both lead. **JKM
  LNG (`SGX:JKM1!`) is wk0 (DEAD)** — the *Asian* gas-switch channel (the more relevant
  one for Indonesian export demand) is therefore **unmeasurable** in-store; Henry Hub is
  a weaker US-centric stand-in. Honest gap.
- **D1c — broad commodity beta.** `AMEX:DBC` (the `bcom` resolver, wk800) is the
  cross-commodity risk-on/off state; coal equities carry a commodity beta on top of the
  coal-specific signal. Leads modestly.
- **D1d — the coking-coal blind spot (ADMR).** ADMR earns on **hard-coking coal**, a
  *steel*-driven cycle distinct from thermal. The store has **no live coking-coal price**
  (`SGX:FFX1!` wk0). `NYMEX:HRC1!` (US HRC steel, wk800) is a *demand-side* proxy for
  met-coal (steel output → coke demand) — weak, but the only live handle. ADMR is small,
  so this is a documented minor mis-attribution, not a basket-mover.
- **D1e — the HBA reference price (attribution, NOT forecast).** `CEICI354326367`
  (**"Referred Price: Coal"**, USD/Ton, **n210, 2009→2026-06**) is the long-history
  **HBA-family** government benchmark; the newer tiered **HBA I/II/III**
  (`CEICI506620937/947`, `CEICI522153977`, n35–40, since 2023) split by CV grade. The
  HBA is an **administered, publication-lagged price** set monthly by the government off
  a basket of indices — it **trails** the market (API2) and **sets royalty + some DMO
  sale prices**. So it is a **clean attribution variable** ("how much of last month's
  move was the official price catching up") but a **poor forecaster** (it lags the very
  market price we already have in D1a). **Wire it as attribution, sign +1, lead 0; never
  let it carry a forward claim** — that would double-count a lagged echo of API2.

### D2 — CHINA THERMAL DEMAND (the #1 seaborne import sink)
```
CHINA thermal demand  (China = largest seaborne thermal importer; sets the marginal $)
├─ D2a China industrial pulse ───► [aCNIP CN IP YoY, wk524]            sign +1 · lead 1–2m · attribution
│                                  [aCNPMIMT CN NBS Mfg PMI, wk524]    sign +1 · lead 1–2m · FORECAST (survey leads)
├─ D2b China power demand / burn ─► [0902.HK Huaneng Power, wk801]     sign +1 · lead 0–1m · peer-equity proxy ⚠circular
│      (thermal gencos = coal burn) [2728.HK Datang Intl Power, wk800] sign +1 · lead 0–1m · peer-equity proxy ⚠circular
├─ D2c China credit/property ────► [aCNSFLMA Social Financing Flow, wk524]  sign +1 · lead 3–6m · FORECAST (leading)
│      (steel/cement → coal burn)   [aCNHPIAR House Px Newly Built YoY, wk524] sign +1 · lead 2–4m
│                                   [aCNLPR5YRR 5Y LPR, wk350]         sign −1 · lead 3–6m · FORECAST
└─ D2d China coal IMPORTS / stock ─► [aCNIMPCOAL Imports Coal incl lignite] sign +1 · lead 0–1m · ATTRIBUTION (cn.json — NOT in weekly store ⚠)
       (the direct import-swing)     [aCNCNYHVM Coal stock/inventory]        sign −1 · lead 1–2m · ATTRIBUTION (high stock → less import)
                                     [aCNCNKMHRM Raw coal production, mn t]   sign −1 · lead 1–2m · ATTRIBUTION (domestic up → import down)
```

- **D2a — China activity.** `aCNIP` (wk524) and `aCNPMIMT` (wk524) are the resolvable
  China-activity series; the **PMI survey leads** physical demand by 1–2 months. Both
  already partly in the seed (`cn_ip_yoy`, `cn_pmi_mfg`) — keep.
- **D2b — China power-burn proxies (peer-equity, ⚠circular).** There is **no
  resolvable China thermal-power-generation or coal-burn series** in the weekly store.
  The Chinese thermal **gencos** — Huaneng (`0902.HK`), Datang (`2728.HK`), China Power
  (`2380.HK`), CR Power (`0836.HK`), all wk≈800 — are *equity* proxies for coal burn.
  Use only as **low-weight regime context**: they are equities (sentiment-contaminated)
  and burn coal as a *cost*, so their own returns can move opposite to coal demand.
  **Not a primary driver** — flagged.
- **D2c — China credit/property (the leading fundamental).** `aCNSFLMA` (social
  financing flow, wk524) is the **credit impulse**: credit → property/infra starts →
  steel & cement → coking + thermal-power coal burn, with a **3–6 month lead**. This is
  the *cleanest leading fundamental* in the China branch and is **not currently wired**.
  `aCNHPIAR` (house prices) and `aCNLPR5YRR` (5Y LPR, the mortgage anchor) are the
  sub-drivers one level up.
- **D2d — the direct import-swing (attribution; DATA GAP).** The economically *ideal*
  drivers — **China coal imports** (`aCNIMPCOAL`), **port/coal inventory**
  (`aCNCNYHVM`), and **domestic raw-coal production** (`aCNCNKMHRM`, the import
  substitute) — all exist in `cn.json` but have **n_obs unpopulated and are absent from
  the resolvable weekly store** (`market.json china_macro`). They are publication-lagged
  CEIC prints → **attribution only**, and would need a **resolver + backfill** before
  wiring (§9 gap). Mechanism is first-order: high Chinese port inventory or strong
  domestic production *displaces* seaborne imports → bearish Indonesian volume.

### D3 — INDIA THERMAL DEMAND (the #2 sink; the structural-growth leg)
```
INDIA thermal demand  (India = #2 seaborne thermal importer; coal-fired base-load growth)
├─ D3a India coal output/demand ─► [COALINDIA.NS Coal India, wk801]    sign +1 · lead 0–1m · peer-equity proxy ⚠circular
├─ D3b India thermal-power pull ──► [NTPC.NS NTPC, wk801]              sign +1 · lead 0–1m · peer-equity proxy ⚠circular
│                                   [TATAPOWER.NS Tata Power, wk801]    sign +1 · lead 0–1m · peer-equity proxy ⚠circular
└─ D3c India FX channel ─────────► [FX_IDC:USDINR USD/INR, wk801]      sign −1 · lead 0m · weak (strong INR → cheaper coal imports → +demand)
```

- **India is the swing buyer that absorbs Indonesian thermal when China softens** — the
  reason Indonesian coal demand has been more resilient than China alone implies. But
  the store has **no India coal-demand macro series**: the only handles are
  **peer-equities** — **Coal India** (`COALINDIA.NS`, wk801, India's domestic monopoly
  miner: its output is *inversely* related to India's *import* need), Indian thermal
  gencos **NTPC** (`NTPC.NS`) / **Tata Power** (`TATAPOWER.NS`). All ⚠circular (equities,
  and Coal India's sign is genuinely ambiguous — strong domestic output reduces seaborne
  pull). **Context overlays only.** `USD/INR` (`FX_IDC:USDINR`, wk801) is a thin
  affordability channel. India is therefore an acknowledged **attribution/context gap**,
  not a wireable forecast branch.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (output, oversupply headwind, input cost, policy)
├─ S1 diesel / haulage cost ─────► [ICEEUR:BRN1! Brent, wk800]          sign −1 · lead 0–1m · COST (fleet + barging fuel)
│      (note: Brent is +demand in D1b AND −cost here → net sign is empirically estimated)
├─ S2 Indonesian production / ───► [CEICI391910527 Pamapersada (UNTR) prod, Ton mn, n232, →2026-04] sign −1 · lead 0m · ATTRIBUTION (oversupply)
│      oversupply headwind          [CEICI391910437 Pamapersada YTD prod, Ton mn, n232]              sign −1 · lead 0m · ATTRIBUTION
│                                   [CEICI391910547 Overburden removal, bcm mn, n232]                sign −1 · lead 0m · strip/cost-volume
├─ S3 export value (price×vol) ──► [CEICI324715601 Export Value: Coal, USD mn, n171, →2026-03]       sign +1 · lead 0m · ATTRIBUTION (realised revenue)
│                                   [CEICI357008197 BoP Export: Coal, USD mn, n195, →2026-03]        sign +1 · lead 0m · ATTRIBUTION
├─ S4 royalty / HBA cost leg ────► [CEICI354326367 Referred Price: Coal]  sign −1(cost) — higher HBA → higher royalty (offsets the +1 revenue role)
└─ S5 DMO / domestic policy ─────► (no clean monthly DMO price series — annual consumption only) — POLICY annotation
       PLN domestic obligation       [CEICI254158602 Final Consumption Industry&Construction: Hard Coal, TJ, n19 ANNUAL] — too slow to wire
```

- **S1 — the energy AISC swing.** Diesel (mine fleet, overburden trucks, barge fuel)
  tracks **Brent**. Note the **sign tension**: Brent is **+1 on the demand side**
  (energy-complex co-move, D1b) but **−1 as a cost**. The two partly offset; the
  *empirical* net sign is whatever the engine's theory-reconciliation gate estimates —
  historically the **revenue/co-move channel dominates** for producers (coal price and
  oil rise together in an energy bull market, lifting the equities), so the net realised
  sign is **positive**. Wire Brent as **demand +1** (co-move) and keep the cost channel
  as a *documented* offset, not a second forced driver, to avoid double-counting.
- **S2 — production / oversupply (the missing headwind branch).** **Pamapersada
  (UNTR) coal production** (`CEICI391910527`, **n232, 2007→2026-04**) and **overburden
  removal** (`CEICI391910547`, bcm) are a high-frequency (monthly), long-history proxy
  for **Indonesian output**. Rising production into a soft market is a **supply
  headwind** (−1) — the oversupply that periodically crushes the FOB-Kalimantan
  discount. CEIC quantity print → **attribution, publication-lagged ~3–6 weeks, NOT
  forecast**. It is a *single contractor* (Pama serves multiple miners incl. KPC/Adaro)
  so it proxies national output well but is not the whole. **Currently not wired — the
  clearest depth-add on the supply side.**
- **S3 — export value (realised revenue).** `CEICI324715601` (Export Value: Coal, USD
  mn, n171) and `CEICI357008197` (BoP coal export, n195) are **price × volume** — the
  realised-revenue attribution series. They confirm *ex-post* what API2 + volume implied.
  Attribution.
- **S4 — the HBA cost leg.** Same series as D1e but in its **royalty-cost role**:
  higher HBA raises the royalty rate (−1 cost), partly offsetting the +1 revenue-floor
  role. Net: keep HBA as a single attribution series with the **revenue (+1) role
  dominant**; do not wire twice.
- **S5 — DMO / PLN domestic channel (DATA GAP).** PTBA especially sells a quota
  domestically at the capped **DMO price** (US$70/t for power). There is **no clean
  monthly DMO-price or PLN-coal-offtake series** — only **annual** energy-consumption
  prints (`CEICI254158602`, TJ, n19) that are far too slow to wire. The DMO/domestic
  channel is therefore a **policy annotation**, not a fitted driver.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR ──────────────────► [FX_IDC:USDIDR, wk801]   sign +1 · lead 0m · macro (USD coal revenue vs IDR cost → weak IDR helps)
├─ M2 broad USD (DXY) ──────────► [TVC:DXY US Dollar Index, wk800]  sign −1 · lead 0–1m · macro  ★FIX: seed routes to TVC:BBDXY (wk0, DEAD)
├─ M3 China FX (USD/CNY) ───────► [FX_IDC:USDCNY, wk801]   sign −1 · lead 0m · macro (weak CNY → dearer USD coal for China → −import pull)
├─ M4 Indonesia exports (vol) ──► [aIDEXGAR Indonesia Exports YoY, wk524]  sign +1 · lead 0m · attribution (coal ~ large share of ID exports)
└─ M5 US 10Y / risk appetite ───► [TVC:US10Y, wk800] (secondary)  sign ~0 · global discount/commodity-flow regime
```

- **M1 USD/IDR = +1.** Uncontested: USD revenue on an IDR cost base → IDR depreciation
  is a translation tailwind. Keep.
- **M2 DXY = −1 — and the resolver BUG.** A stronger broad dollar caps USD commodity
  prices and drains EM commodity flow → negative for coal equities. **But the engine's
  `dxy` resolver points to `TVC:BBDXY`, which is wk0 (EMPTY) — so DXY is effectively
  unwired for the entire engine.** The honest fix is **`TVC:DXY`** (wk800), per the
  AGENT_BRIEF data-quality caveat. This is a real, falsifiable bug (§9).
- **M3 USD/CNY = −1.** A weaker CNY makes USD-priced seaborne coal dearer for Chinese
  utilities → softer import pull → mild negative. Available (`FX_IDC:USDCNY`, wk801),
  not currently wired — a reasonable depth-add to test.
- **M4 Indonesia exports.** `aIDEXGAR` (exports YoY, wk524) — coal is a large share of
  Indonesian exports, so this is partly *endogenous* to the basket's own output; treat as
  **attribution**, low weight. (Borderline — see §9 exclude note.)
- **M5** US 10Y is a weak commodity-flow/discount regime overlay; deliberately left near
  **0** — forcing a sign here is false precision (coal is not a duration asset).

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `ICEEUR:BRN1!` Brent | Energy / Oil | **demand +1** (D1b) & cost (S1) | energy-complex co-move + diesel AISC |
| `NYMEX:NG1!` Henry Hub | Energy / Gas | **demand +1** (D1b) | gas→coal power switching |
| `NYMEX:HRC1!` US HRC steel | Metals / Steel | **demand +1** (D1d) | met-coal (ADMR) demand proxy via steel |
| `aCNSFLMA` social financing | China / Money | **demand +1** (D2c) | credit impulse → steel/cement/power → coal burn (lead 3–6m) |
| `aCNHPIAR` China house px | China / Property | **demand +1** (D2c) | property → construction → steel → coking/thermal |
| `0902.HK / 2728.HK` China gencos | China / Utilities | context only ⚠ | coal-burn proxy (equity, circular) |
| `COALINDIA.NS / NTPC.NS` India | India / Mining,Utilities | context only ⚠ | India thermal-demand proxy (equity, circular, ambiguous sign) |
| `AMEX:DBC` DB Commodity | Cross-commodity | **demand +1** (D1c) | broad commodity beta (`bcom`) |
| `FX_IDC:USDCNY` | China / FX | **macro −1** (M3) | China import affordability |

**Deliberate non-linkages.** Do **not** wire `SGX:FEF1!` iron ore (wk0, DEAD anyway),
`SHFE:RB1!` China rebar (wk0, DEAD), or the nickel complex — even though HRUM/CUAN have
nickel sleeves, the *coal* basket's signal must stay coal-led; the diversifier leakage
is a known, accepted noise floor, not a driver to chase.

---

## 7. Currently-wired vs available

### 7a. The 12-driver `Coal` seed vs proposed (depth-add, protect the +0.23)

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `wb_coal_au` | supply +1 | `ICEEUR:ATR1!` API2 wk782 | **KEEP — the backbone** | re-label "API2", not "Newcastle" (comment only) |
| `brent` | demand +1 | `ICEEUR:BRN1!` wk800 | **keep** | net sign empirical (co-move > cost) |
| `natgas` | demand +1 | `NYMEX:NG1!` wk800 | **keep** | gas→coal switch (US-only; JKM dead) |
| `bcom` | demand +1 | `AMEX:DBC` wk800 | **keep** | broad commodity beta |
| `cn_ip_yoy` | demand +1 | `aCNIP` wk524 | **keep** | China activity attribution |
| `cn_pmi_mfg` | demand +1 | `aCNPMIMT` wk524 | **keep** | survey leads 1–2m |
| `usdidr` | macro +1 | `FX_IDC:USDIDR` wk801 | **keep** | translation tailwind |
| `id_exports` | demand +1 | `aIDEXGAR` wk524 | **keep (demote)** | partly endogenous → attribution, low weight |
| `ceic ("Energy","Coal")` | category pull | idind Energy/Coal block | **keep** | this pulls HBA + production candidates |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | the resolver bug; add macro −1 |
| *(none)* `aCNSFLMA` credit impulse | — | (add to GLOBAL_CORR) | **ADD demand +1** | the leading China branch (lead 3–6m) |
| *(none)* Pamapersada production | — | `CEICI391910527` n232 | **ADD supply −1** via override | the oversupply headwind branch |
| *(none)* HBA reference price | — | `CEICI354326367` n210 | **ADD attribution +1** via override | admin-price catch-up (lead 0, NOT forecast) |
| *(none)* `usdcny` | — | `FX_IDC:USDCNY` wk801 | **ADD macro −1 (test)** | China import affordability |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| Asian LNG (gas-switch) | `SGX:JKM1!` | **wk0 DEAD** — Henry Hub is a weak US stand-in |
| Newcastle thermal | `ICEEUR:ATW1!` | **wk0 DEAD** — API2 substitutes |
| Hard-coking-coal price (ADMR) | `SGX:FFX1!` | **wk0 DEAD** — HRC steel weak proxy |
| China coal imports / port stock | `aCNIMPCOAL`,`aCNCNYHVM`,`aCNCNKMHRM` | in `cn.json` but **n_obs unpopulated, not in weekly store** → needs resolver + backfill |
| Baltic Dry / Capesize freight | *(none)* | **no freight index in store at all** — true gap |
| China thermal-power coal burn | `0902.HK`/`2728.HK` | only **equity** proxies (circular) |
| India thermal demand | `COALINDIA.NS`/`NTPC.NS` | only **equity** proxies (circular, ambiguous) |
| Indonesia DMO/PLN price | annual `CEICI254158602` (TJ) | **annual only** — too slow to wire |

---

## 8. Forecastability — why Coal forecasts well

**The backtest fact:** Coal is **IC +0.23 at the 1.00 placebo percentile** over **129**
forward months — tied with Alternative Energy for the **highest forward IC in the entire
52-basket universe**, and the most robust (placebo pctile 1.00 = it beats *every* one of
the 60 circular-shift null draws). BACKTEST.md names it explicitly as the archetype of
the cluster that *does* forecast: *"physical-commodity / cost-pass-through baskets — coal,
energy services, plantation-adjacent, machinery, pharma, metals... their drivers are real,
exogenous prices that genuinely lead the equities."*

**Why it leads (the mechanism), branch by branch:**

1. **The revenue driver is a *liquid exogenous price* (API2), not a quantity print.**
   Unlike Banks (loan growth = a lagged CEIC quantity that mean-reverts) or Property
   (RPPI prints quarterly, far behind the equities), Coal's #1 driver `ICEEUR:ATR1!` is a
   **weekly, real-time, externally-set** price. It is *not* the basket's own output and
   does **not** mean-revert against the equities — it **leads or moves with** them (lead
   0–1m). That is the structural difference between a forecaster and an explainer.
2. **High price-to-margin gearing makes the equities a *levered call* on that price.**
   Sticky cash costs + a volatile selling price → a clean, high-beta transmission from
   API2 to EBITDA to equity return. The signal-to-noise from price → return is unusually
   high here.
3. **The signs are unambiguous and aligned.** Coal-price +1, energy-complex +1, China
   demand +1, USD/IDR +1, DXY −1 — these point the *same* way in most macro states
   (a commodity/energy bull lifts coal price, oil, China demand together). Contrast
   Mining, where copper (+cyclical) and gold (+monetary) point *opposite* ways and the
   blended signal mis-signs (IC −0.15). **Coal has no internal sign-contradiction** —
   that coherence is why the equal-weight anchored posture forecasts cleanly.

**The contemporaneous-vs-forward distinction (honest).** Even for Coal, contemporaneous
IC > forward IC (true everywhere). The **hit−up is only +0.04** — the *directional* hit
rate above the unconditional up-rate is modest; the +0.23 IC is carried by **getting the
*magnitude/severity* of big moves right** (large API2 swings → large coal-equity moves),
not by nailing the sign of every small month. So the honest read: **Coal is a strong
forecaster of the *amplitude* of commodity-driven moves, a fair forecaster of *direction*,
and a near-pure cost-pass-through beta** — exactly what theory predicts for a levered
price-taker.

**Which branches lead vs lag:**
- **LEAD (forecast):** API2 (0–1m), Brent/natgas/DBC (0–1m), China PMI (1–2m), **China
  social-financing credit impulse (3–6m — the longest clean lead, currently unwired)**.
- **COINCIDENT/LAG (attribution):** HBA reference price (lags API2 by construction),
  Pamapersada production, export value, China IP, Indonesia exports, all China
  import/stock CEIC prints.

**What would move it from +0.23 toward higher skill (the upside test):** wire the
**China credit impulse `aCNSFLMA`** (the one branch with a genuine *multi-month* lead) —
if it adds forward IC beyond the contemporaneous price set, that is incremental skill the
current seed leaves on the table. The risk is that API2 already prices in the credit
impulse fast enough that `aCNSFLMA` is redundant; that is precisely the falsifiable
ablation in §9. **This is not a rescue — it is a search for marginal forward edge on top
of the best basket in the book, with a hard keep/kill gate so we never trade the +0.23
for an in-sample mirage.**

---

## 9. Engine-wiring spec — concrete `mapping.py`

Most resolvers already populate correctly (`wb_coal_au→ICEEUR:ATR1!`,
`brent→ICEEUR:BRN1!`, `natgas→NYMEX:NG1!`, `bcom→AMEX:DBC`, `usdidr→FX_IDC:USDIDR`,
`cn_ip_yoy→aCNIP`, `cn_pmi_mfg→aCNPMIMT`, `id_exports→aIDEXGAR`). **Two resolver edits
and one new key** are needed first:

```python
# --- GLOBAL_CORR edits (apply once; helps the whole engine, not just Coal) ---
#   "dxy": "TVC:DXY",          # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
#   "cn_social_fin": "aCNSFLMA",  # NEW: China social-financing flow (credit impulse), wk524
#   ("usdcny" already resolves to FX_IDC:USDCNY, wk801 — no change)
```

```python
"Coal": {  # 22 thermal exporters; equal-weighted (do NOT cap-weight — BYAN ~40% is illiquid/inert).
    # Best forward forecaster in the book (OOS IC +0.23, placebo 1.00). DEEPEN, don't break.
    "ceic": [("Energy", "Coal")],
    # Re-role the CEIC pulls explicitly: HBA = lagged admin price (ATTRIBUTION, +1 revenue
    # floor), production/overburden = supply headwind (-1), export value = realised revenue.
    "ceic_override": [
        ("referred price: coal", "supply", +1),   # CEICI354326367 HBA — revenue floor (attribution)
        ("hba",                  "supply", +1),    # CEICI506620937/947, 522153977 (tiered HBA)
        ("pamapersada",          "supply", -1),    # CEICI391910527/437 production = oversupply headwind
        ("overburden",           "supply", -1),    # CEICI391910547 strip/cost-volume
        ("export value: coal",   "supply", +1),    # CEICI324715601 realised revenue (price×vol)
    ],
    # CEIC quantity prints are PUBLICATION-LAGGED → attribution, never forecast.
    "ceic_exclude": [
        ("manufacturing industry: coal; oil & gas refinery", None, None),  # GDP-deflator-ish, slow annual/qtrly noise
        ("dry rubber", None, None),  # mis-tagged "Volume: Dry Rubber" sits in the Coal sub — pure noise, drop
    ],
    "globals": [
        ("wb_coal_au", "supply",  +1, "API2 (ICEEUR:ATR1!) = thermal revenue/tonne — the backbone, LEADING price"),
        ("brent",      "demand",  +1, "energy-complex co-move (net of diesel cost) — leads"),
        ("natgas",     "demand",  +1, "gas->coal power switching (US/Henry Hub; JKM dead)"),
        ("bcom",       "demand",  +1, "broad commodity beta (AMEX:DBC)"),
        ("steel_hrc",  "demand",  +1, "met-coal (ADMR) demand via steel — weak, small weight"),  # NYMEX:HRC1! wk800
    ],
    "macro": [
        ("cn_pmi_mfg",   "demand", +1, "China mfg PMI survey LEADS thermal demand 1-2m — forecast"),
        ("cn_ip_yoy",    "demand", +1, "China industrial output = coal-burn attribution (coincident)"),
        ("cn_social_fin","demand", +1, "China credit impulse LEADS coal demand 3-6m — the new forward branch"),  # NEW key
        ("usdidr",       "macro",  +1, "USD coal revenue vs IDR cost (translation tailwind on weak IDR)"),
        ("dxy",          "macro",  -1, "broad USD caps commodity prices + EM flow (FIXED resolver -> TVC:DXY)"),
        ("usdcny",       "macro",  -1, "weak CNY -> dearer USD coal for China -> softer import pull (test)"),
        ("id_exports",   "demand", +1, "Indonesia export volume incl. coal — ATTRIBUTION (partly endogenous, low weight)"),
    ],
},
```

**Notes for the implementer.**
- **`dxy` resolver fix (`TVC:BBDXY`→`TVC:DXY`) is the one CRITICAL bug** and helps every
  basket that uses DXY, not just Coal. Apply it in `GLOBAL_CORR`, then verify DXY now
  resolves (n≈800 weekly) rather than falling back to a low-confidence spark.
- **Do NOT cap-weight.** BYAN's ~40% illiquid weight would mute the signal; the engine's
  equal-weight basket is what produces the +0.23 — keep it equal-weighted.
- The **HBA + production overrides are ATTRIBUTION** — they add explanatory depth and a
  supply headwind, but the forward claim rests on the **price/rate** leaves (API2, Brent,
  natgas, PMI, credit impulse). Tag them so the engine does not credit them with lead.
- **China import/stock CEIC series (`aCNIMPCOAL`, `aCNCNYHVM`, `aCNCNKMHRM`)** are the
  economically-ideal demand drivers but are **not in the weekly store** — file a backfill
  task (resolver + history) before wiring; do not fake them in v1.
- **Freight is a true gap** — no Baltic/Capesize series exists; leave it as a documented
  hole, not a proxy.

**Falsifiable backtest plan (the keep/kill gate — protect the +0.23).** Run
`backtest/bt.py "Coal"` and **keep each change only if forward IC holds at ≥ +0.23 or
improves**, with these ablations:
1. **`dxy` fix alone** (`TVC:DXY`) vs the dead `BBDXY` — confirm DXY now contributes and
   IC holds/improves (it was contributing *nothing* before).
2. **+ `cn_social_fin` credit impulse** (lead 3–6m) — *the* upside test: does the
   longest-lead branch add forward IC beyond the contemporaneous price set, or is it
   already priced into API2? **Keep only if additive.**
3. **+ Pamapersada production (−1) + HBA (+1) overrides** — confirm the richer
   supply/attribution tree does **not** dilute forward IC (these are attribution; they
   may add explanatory R² without forward skill — that is acceptable *iff* IC does not
   fall).
4. **+ `usdcny` (−1)** — marginal; keep only if it survives the theory gate and IC holds.
5. Confirm **`id_exports` demotion** to low-weight attribution does not cost forward IC
   (it is partly endogenous to coal output).

Success criterion: **a richer, more honest tree (energy-complex + China-demand-with-a-
leading-credit-branch + an explicit supply headwind + a fixed DXY) that holds or beats
the +0.23** — never a change that only lifts in-sample fit. If any addition drops forward
IC below +0.23, revert it; the current seed is already the best in the book.
