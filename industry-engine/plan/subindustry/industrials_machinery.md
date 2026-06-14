# Machinery (UNTR / heavy-equipment + coal-contracting) — Driver Tree

> `basket_id: industrials_machinery` · sector **Industrials** · priority 20 ·
> mcap **107.5T** · **n_members = 19 (n_used = 12)** · grade **partial** · kept **8/47** ·
> **forward OOS IC +0.148 (n=129, placebo 98th pctile) → SKILL**.
>
> This basket already has forward skill — the rare case where `fwd_ic (+0.148)` ≈
> `contemp_ic (+0.136)`, i.e. the driver posture genuinely **leads** the equities
> rather than only explaining them contemporaneously. The mandate here is **deepen
> without breaking**: protect the coal-cycle lead that earns the skill, and replace
> the spurious/sign-flipping leaves the engine currently keeps (a stale *pharma*
> manufacturing series; two wrong-signed FDI prints) with the on-thesis
> coal-capex → equipment-sales chain. A structural trap is documented up front: the
> basket is **equal-weighted with `weight_cap 0.12`**, so UNTR (79% of mcap) is capped
> at ~12% and the *signal* is dominated by the 12 small dealer/parts names — which is
> exactly why UNTR's own Pamapersada volume prints **reject** at the basket level.

---

## 1. Snapshot — what the basket is, and the weight-cap trap

**Members (19; 12 used after coverage filter).** Hugely top-heavy by mcap but the
engine equal-weights with a 12% cap:

| Tier | Names | What they do |
|---|---|---|
| **Anchor** | **UNTR (84.8T, 79%)** | Komatsu heavy-equipment **dealer** + **Pamapersada** coal-mining contractor + Pama coal mines + a gold sleeve (Agincourt/Martabe). The whole thesis. |
| **Dealers / distributors** | HEXA (Hitachi/CAT heavy-equip dealer), INTA (Komatsu/Volvo via Intraco), TIRA, KOIN, ARKA | heavy-equipment dealers/rental — same coal-capex demand, no coal mine |
| **Parts / components / industrial** | MARK (radiators, mining-equip cooling), SMIL, JTPE (smart-card/printing machinery), ASGR (Astragraphia office machinery), SKRN (packaging machinery), SPTO (Selamat Sempurna-adjacent auto parts), KONI, KOBX, AMIN (mineral-processing plant EPC), KIAS (ceramics machinery), KUAS, LABA, CTTH | industrial-machinery makers/distributors; demand = broad capex + mining/auto/construction end-markets |

`basket` block confirms `n_used 12, members_used = [AMIN, ASGR, HEXA, INTA, JTPE,
KIAS, KOBX, MARK, SKRN, SMIL, TIRA, UNTR]`, coverage **798 W / 184 M / 61 Q**,
2011-01 → 2026-05, `weight_cap 0.12`, `equal_weight`.

**The weight-cap trap (the single most important structural fact).** With equal
weighting and a 12% cap, the basket return is *not* UNTR's return — it is roughly
"`0.12·UNTR + 0.88·(11 small dealers/parts makers)`". The small names are
**heavy-equipment dealers + industrial-machinery makers** whose demand is the
*derived* capex cycle (mining + construction + auto), one step downstream of
commodity prices. This is why the empirics below look the way they do:
- The **liquid commodity/capex cycle** (`bcom`, coal price) leads the *dealers'*
  order books → **positive, leading, the source of the skill**.
- **UNTR's own Pamapersada coal *production/overburden*** prints (`CEICI391910527/547`)
  **reject below_gate at corr −0.11** — because at 12% weight UNTR's own mine output
  doesn't drive the basket, and as a publication-lagged quantity it doesn't lead.
- The brief's "direct UNTR operating series" are real and valuable, but the *clean*
  read for this basket is the **Komatsu equipment-sales** series (the dealers' demand),
  **not** Pama's coal volume (UNTR's own output). That distinction is the heart of §8.

**The gap (grounded in `output/` + `backtest/results/industrials_machinery.json`).**
- `forward`: n=129, **fwd_ic +0.148**, fwd_pearson +0.137, hit 0.589, up_rate 0.56,
  edge +0.029, long_short +1.27%/mo, **placebo ic_pctile 0.983**. Real forward skill.
- `contemporaneous_ref`: fwd_ic **+0.136**, placebo 0.983 — forward ≳ contemporaneous,
  the leading-price signature.
- Engine model: **MILDLY BULLISH [56/100, low conf]**, `net_tilt +0.228`,
  **`model_conflict = true`** (`demand_tilt +0.213` vs `supply_tilt −0.273`),
  `macro_tilt +0.40`. Confidence reasons: `max|corr|=0.34`, `theory_agree=60%`,
  `stable=88%`, `mvR2=0.21`, `OOS=63%(pseudo)`, `mt_penalty=0.72(n=47)`,
  `model_conflict→downgraded`.
- Kept 8/47. The kept set is **half noise**: `bcom (+0.34)` and coal price
  `CEICI354326367 (+0.14)` are the real, theory-coherent workhorses; the **supply_tilt
  that creates `model_conflict` is driven by a STALE pharma-manufacturing series**
  (`CEICI323567902`, last_obs 2024-12, `stale(18m)`) that has no business in a
  machinery model, plus two **FDI quarterly prints with `theory_agree=false`**
  (`CEICI410108507/517`, emp_sign −1 vs +1 prior, one `stable=false`).

**One-line gap:** the engine earns its skill from the **liquid coal/commodity-cycle
lead on the dealers' order books**, but dilutes it with a spurious stale-pharma
"supply" leaf and two wrong-signed FDI prints (→ `model_conflict`), while the
**on-thesis Komatsu equipment-sales series is unreachable** (it lives in the
Infrastructure>Construction CEIC block the seed never pulls). Fix: reach Komatsu
cross-industry, anchor on the leading coal/commodity prices, and excise the noise.

---

## 2. Economic structure — how the basket makes money

**Revenue identity.** For the dominant **dealer/contractor** model (UNTR, HEXA, INTA,
TIRA) and by extension the small distributors, revenue ≈
`equipment_units_sold × ASP  +  parts&service_revenue  +  (UNTR only) coal_tonnes × (coal_price − cash_cost) + contractor_fee × overburden_bcm`.
For the **industrial-machinery makers** (MARK, JTPE, SKRN, AMIN, KIAS), revenue ≈
`machines/components_sold × ASP`, geared to their end-market capex (mining cooling,
packaging, ceramics, mineral-processing plant).

**The margin swing factor** differs by sleeve:
- **Dealers:** new-equipment units (cyclical, low-margin) vs **parts & service**
  (the annuity, high-margin, follows the *installed fleet* → lags new sales by 1–3y).
  The marginal earnings *surprise* is **new-unit volume**, which the **coal-capex
  cycle** drives.
- **UNTR coal sleeve:** the coal **price − cash-cost** spread (diesel/strip-ratio is
  the cost; API2/HBA is the price). Net-long coal ⇒ coal-price + is positive, partly
  offset by the diesel cost in a coal/oil spike.
- **Industrial-machinery makers:** input **steel/copper/aluminium** cost vs end-market
  demand; USD for imported components.

**What a sell-side analyst watches** (the high-frequency tells, in order):
1. **Komatsu monthly unit sales** (`CEICI391910517`) — UNTR's order book in one number;
   and its **mining-sector %** mix (`CEICI391910507`) — how much of demand is coal-capex.
2. **Coal price (API2 / HBA)** — sets both UNTR's mine margin and, via miners' cash
   flow, the *willingness to order equipment* (capex follows the coal P&L by ~2–4 quarters).
3. **Pamapersada overburden + production** — UNTR's contractor activity / strip work.
4. **Coal-mining capex** (FDI/DDI into coal mining) — the *forward* order pipeline.
5. **Rupiah & rates** — imported-equipment cost (CKD/CBU Komatsu units priced in JPY/USD)
   and the financing rate for equipment loans.

**Intra-basket dispersion (who dominates / differs).**
- **UNTR** is the only constituent with a coal *mine* + contractor + gold sleeve — it
  is a commodity-cash-flow stock as much as a machinery stock, and at 12% cap it is
  *under-represented* in the signal vs its economic reality.
- **HEXA, INTA, TIRA** = pure heavy-equipment dealers → cleanest play on the
  *equipment* channel without the coal-mine P&L.
- **MARK, JTPE, ASGR, SKRN, AMIN, KIAS** = industrial-machinery makers with
  *non-mining* end-markets (cooling, printing, packaging, ceramics, processing
  plant) → these dilute the coal beta and add idiosyncratic capex exposure. They are
  why the basket's coal sensitivity is *moderate* (`max|corr| 0.34`), not extreme.

---

## 3. DEMAND driver tree — branches → sub-drivers → real series

> Sign = a-priori sign on the basket's **excess return vs IHSG**. LEAD = months the
> series is expected to move *before* the equity. Empirical figures (corr/lead/t) are
> from `output/industrials_machinery.json` where the leaf was tested.

```
MACHINERY DEMAND
├── D1 COMMODITY / CAPEX CYCLE  (the skill engine — leading, liquid)
│   ├── D1a Broad commodity cycle ──► bcom (AMEX:DBC)  [market, n_weekly=800]
│   │       demand · +1 · W→M · LEAD 0–1m · KEPT: pearson +0.34 (p≈0), spearman +0.36,
│   │       HAC-OLS t +4.20, mv std_beta +0.019 (t +4.2), theory_agree✓ stable✓ — THE WORKHORSE
│   │       mechanism: commodity up-cycle → miner/planter cash flow → equipment capex → dealer orders
│   ├── D1b Coal price (HBA/referred) ──► CEICI354326367 "Referred Price: Coal" [n=210, M, last 2026-06]
│   │       demand · +1 · M · LEAD 0m · KEPT: pearson +0.145 (p 0.05), ic +0.104, HAC-OLS t +2.58,
│   │       mv std_beta +0.008 (t +2.01), theory_agree✓ stable✓ — coal P&L → coal-miner capex
│   └── D1c Coal price (API2, liquid) ──► wb_coal_au → ICEEUR:ATR1! [market, n_weekly=782]
│           demand · +1 · W→M · LEAD 1–3m · in seed/anchored set but NOT in engine kept (gated out by
│           collinearity w/ bcom+HBA). The liquid weekly LEAD candidate — pair w/ D1b's admin print.
├── D2 HEAVY-EQUIPMENT ORDER BOOK  (the DIRECT read — currently UNREACHABLE)
│   ├── D2a Komatsu total units ──► CEICI391910517 "Construction Machinery: UNTR (Komatsu): Total"
│   │       demand · +1 · M · n=232 · last 2026-04 · LEAD 0–2m · NOT A CANDIDATE (lives in
│   │       Infrastructure>Construction, seed pulls only Industrials+Energy>Coal) — see §7/§9
│   │       mechanism: ≈ UNTR equipment order book; the dealers (HEXA/INTA/TIRA) move with it
│   ├── D2b Komatsu mining-sector % ──► CEICI391910507 (n=232, M) — isolates the COAL-capex slice of orders
│   │       demand · +1 · M · LEAD 0–2m · the cleanest "coal-capex→equipment" read in the store
│   └── D2c Komatsu construction/agro % ──► CEICI391910487 / CEICI391910477 (n=232) — non-coal capex mix (context)
├── D3 COAL-MINING CAPEX PIPELINE  (forward order pipeline — quarterly-ish, leading)
│   ├── D3a Foreign coal-mining investment ──► CEICI412185207 "Investment Realization: Foreign: Mining: Coal & Lignite"
│   │       demand · +1 · M · n=87 · last 2026-03 · LEAD 1–3q · capex commitment → equipment orders
│   └── D3b Domestic coal-mining investment ──► CEICI412186037 (n=85, M) — domestic miners' capex pipeline
├── D4 DOMESTIC INVESTMENT / CAPEX BACKDROP
│   ├── D4a GFCF Machinery & Equipment ──► CEICI365764097 "GDP: GFCF: Machinery & Equipment" [n=65, Q]
│   │       demand · +1 · Q · LEAD 0q (coincident capex level; attribution, not forecast)
│   ├── D4b Real GDP ──► id_gdp_real_q (aIDGDPAR1) · demand +1 · Q · REJECTED below_gate (corr −0.26, wrong sign at level)
│   └── D4c Machinery imports ──► CEICI323787302 "Import Value: Machinery & Mechanical Appliances" [n=172, M]
│           demand · +1 · M · imported capital goods = domestic capex demand (CBU/CKD equipment)
└── D5 CHINA CONSTRUCTION-MACHINERY CYCLE  (global lead — needs resolver)
    ├── D5a China IP ──► cn_ip_yoy (aCNIP) · demand +1 · M · REJECTED below_gate (corr +0.11) — weak at basket level
    ├── D5b China excavator sales ──► aCNCNIQREQ "Excavator sales" [cn catalog, P3M] — the classic global
    │       construction-machinery lead; demand +1 · NOT WIRED (needs new resolver key + backfill — §9)
    └── D5c China FAI / mining investment ──► aCNT2SPCW (coal-mining turnover/profit) — China coal-capex pulse
```

**Forecast hypothesis (demand).** The **leading** demand leaves are the **liquid
commodity prices** (D1a `bcom`, D1c API2 coal) and the **coal-capex pipeline** (D3
FDI/DDI into coal mining) — these move *before* miners place equipment orders, which
move before the dealers book revenue, which moves before the equity. The chain is:
**coal price/China demand (W) → miner cash flow → coal-mining capex (D3, ~1–3q lead)
→ Komatsu unit sales (D2, ~0–2m) → dealer earnings → basket return.** The **CEIC
quantity prints** (D2 Komatsu units, D3 investment-realization, D4a GFCF) are
publication-lagged (~5–7 weeks) and **coincident-to-lagging** vs the equity — they
are **attribution/confirmation** leaves, not the forward signal. The forward skill
already in the backtest comes from D1 (the only branch that is liquid + leading +
kept); deepening D2/D3 should **confirm and stabilise** the posture (lift
`theory_agree%`, soften `model_conflict`) without manufacturing in-sample fit.

---

## 4. SUPPLY / COST driver tree

```
MACHINERY SUPPLY / COST
├── S1 STEEL input ──► steel_hrc → NYMEX:HRC1! [market, n_weekly=800]
│       cost · −1 · W→M · LEAD 1–3m · in seed/anchored set, gated out of kept (weak at basket level)
│       mechanism: fabricated-machinery body/structure + parts (MARK radiators, AMIN plant) steel cost
├── S2 COPPER input ──► copper → COMEX:HG1! [market, n_weekly=800]
│       cost · −1 · W→M · electrical/cooling components, wiring harnesses (MARK/electrical sleeve)
├── S3 ALUMINIUM input ──► aluminum → COMEX:ALI1! [market, n_weekly=621]
│       cost · −1 · W→M · radiators/coolers (MARK), light structures
├── S4 DIESEL / fuel (UNTR contractor cost) ──► brent → ICEEUR:BRN1! [market, n_weekly=800]
│       cost · −1 · W→M · Pamapersada fuel burn (strip work is diesel-intensive); partial offset to coal+
│       ⚠ in a coal/oil co-spike, S4 (cost) partially cancels D1b (revenue) for the UNTR sleeve
├── S5 IMPORTED-EQUIPMENT cost ──► usdidr → FX_IDC:USDIDR [market, n_weekly=801]
│       cost · −1 · M · LEAD 0m · Komatsu CBU/CKD units + components priced JPY/USD → IDR weakness = margin/affordability hit
│       (note: net-ambiguous for UNTR which also has USD coal revenue — see §5)
└── S6 OUTPUT / capacity context (CEIC 'supply', attribution only)
    ├── S6a Pamapersada coal production ──► CEICI391910527 [n=232, M] — REJECTED below_gate (corr −0.11, wrong sign at basket level)
    ├── S6b Pamapersada overburden ──► CEICI391910547 [n=232, M, bcm] — UNTR strip activity (contractor fee base)
    └── S6c Machinery & Equip mfg IPI ──► (Manufacturing Production Index: Machinery, P3M) — domestic output level
```

**Note on the engine's current kept "supply" set — this is the bug.** The engine's
`supply_tilt = −0.273` (the limb that creates `model_conflict`) is driven almost
entirely by a **mis-grabbed, stale series**: `CEICI323567902` **"Manufacturing:
Pharmaceuticals, Medicinal Chemical"** kept as a `supply` driver (role inferred from
the over-broad `Industrials & Manufacturing` pull), `theory_agree=null`,
**`stale(18m)` (last_obs 2024-12)**. Pharma manufacturing has no causal link to a
machinery basket — it is a spurious correlation that should be **excluded**. Removing
it (and the two wrong-signed FDI prints, §3 D-side) is the cleanest way to soften the
false `model_conflict` and raise confidence.

---

## 5. MACRO / RATE / FX / FLOW

| Driver | series | role | sign | empirical (engine) | mechanism |
|---|---|---|---|---|---|
| **BI 7DRR** | `id_bi_rate` → `ECONOMICS:IDINTR` | macro | **−1** | KEPT: pearson −0.137, **best_lag 2m corr −0.174, ic −0.171 (ic_t −2.29)**, HAC-OLS t −1.67, mv t −0.27, stable✓ | rate Δ → equipment-financing affordability + cyclical re-rating; the **best_lag 2m** is a genuine forward tell |
| Inflation | `id_cpi_yoy` → `ECONOMICS:IDIRYY` | macro | −1 | KEPT: pearson −0.143, best_lag 6m, mv t −1.79 (p 0.07), stable✓ | cost/real-income regime; weak, lagging — borderline keep |
| USD/IDR | `FX_IDC:USDIDR` (n_weekly=801) | macro | **0 (net)** | REJECTED below_gate (corr −0.16) | **two-sided**: − for imported-equipment cost & risk-off; + for UNTR USD coal/gold revenue ⇒ net ≈ 0 — gate rejection is *correct* |
| Real GDP | `aIDGDPAR1` | demand | +1 | REJECTED below_gate (corr −0.26, wrong sign at level) | broad capex backdrop; the *level* mis-signs — use *growth*/diff, or treat as context |
| DXY | (empty `TVC:BBDXY`, n=0) | macro | −1 | **unavailable — DATA BUG** | broad-USD headwind on commodity/capex equities; **requires repoint `dxy→TVC:DXY`** (800 wk) |
| China IP | `cn_ip_yoy` → `aCNIP` | demand | +1 | REJECTED below_gate (corr +0.11) | China industrial pulse → commodity demand → capex; weak direct, better via China-excavator (§3 D5) |

**Read.** The macro block carries real but modest forward content via **`id_bi_rate`
(best_lag 2m, ic_t −2.29)** — rate cuts lead the basket up ~2 months, consistent with
equipment-financing affordability and cyclical re-rating. The **FX prior is correctly
0** because UNTR's USD coal/gold revenue offsets the dealers' USD-import cost — the
same sum-of-offsets logic as the ASII conglomerate, in miniature. `usdidr` rejecting
is a *feature*, not a miss. **`dxy` is unavailable due to the empty-resolver bug** and
should be fixed (it would add a coherent broad-USD headwind leg).

**Flow.** UNTR is a top-20 IHSG liquid name and a foreign-favourite commodity proxy;
foreign risk-on/off (USD/IDR + yields) moves the UNTR sleeve as a *vehicle*. But at
12% cap this flow effect is diluted by the small illiquid dealers/parts names — which
is partly why the basket's macro sensitivity is moderate.

---

## 6. Cross-industry linkages — series borrowed from other categories

The basket's demand is, by construction, *other sub-industries' outputs*:

| Channel | borrows from category | series tags |
|---|---|---|
| Coal price / coal P&L | **Energy / Coal** + market | `CEICI354326367` (HBA), `CEICI506620937/947` (HBA I/II), `ICEEUR:ATR1!` (API2) |
| Coal-mining capex pipeline | **Energy / Coal** (investment realization) | `CEICI412185207` (FDI coal mining), `CEICI412186037` (DDI coal mining) |
| **Heavy-equipment order book** | **Infrastructure / Construction** | **`CEICI391910517`** (Komatsu total), **`CEICI391910507`** (mining %), `CEICI391910487/477` (constr/agro %) |
| Coal-contractor activity | **Energy / Coal** (UNTR group) | `CEICI391910527` (Pama production), `CEICI391910547` (overburden) |
| Input metals | **Basic Materials** (market) | `NYMEX:HRC1!` (steel), `COMEX:HG1!` (copper), `COMEX:ALI1!` (aluminium) |
| Diesel / fuel cost | **Energy** (market) | `ICEEUR:BRN1!` (brent) |
| China construction-machinery cycle | **CEIC China** | `aCNCNIQREQ` (excavator sales), `aCNT2SPCW` (coal-mining turnover), `aCNIP`/`aCNPMIMT` |
| Gold sleeve (UNTR) | **Basic Materials** (market) | `COMEX:GC1!` (gold — small UNTR weight, net-positive) |

**The key cross-industry move:** the on-thesis **Komatsu equipment-sales** series live
in **Infrastructure > Construction**, which the current Machinery seed never pulls.
Reaching them requires adding `("Infrastructure", "Construction")` to `ceic` (the same
pattern the Energy-Services file already uses) — see §9.

---

## 7. Currently wired vs available

| Branch | Engine uses NOW (kept, from output JSON) | Available to ADD (confirmed in catalog) | Priority |
|---|---|---|---|
| Commodity cycle | **`bcom` (+0.34, KEPT — workhorse)** | already optimal; keep as anchor | — |
| Coal price | **`CEICI354326367` HBA (+0.14, KEPT)** | add liquid **`wb_coal_au`→ICEEUR:ATR1!** (API2, weekly LEAD) as explicit global | **HIGH** |
| **Equipment order book** | — (UNREACHABLE) | **`CEICI391910517` Komatsu units (n=232)** + **`CEICI391910507` mining %** — via `("Infrastructure","Construction")` | **HIGH** |
| Coal-mining capex | — | **`CEICI412185207` FDI + `CEICI412186037` DDI coal mining (n≈85, M)** — forward pipeline | **HIGH** |
| Coal contractor activity | `CEICI502615757` coal-import-value (kept, lead 3m, noisy) | re-role **`CEICI391910547` overburden** (strip work) as demand; **drop** the import-value print | MED |
| Steel / metals cost | — (gated out) | keep `steel_hrc`; add `copper`, `aluminum` for the parts/cooling makers | MED |
| Diesel cost | — | add `brent` (UNTR Pama fuel; partial offset to coal+) | LOW |
| China cycle | `cn_ip_yoy` (rejected) | **`aCNCNIQREQ` China excavator sales** (needs resolver+backfill) | MED (infra) |
| Macro | `id_bi_rate` (KEPT, lag2m), `id_cpi_yoy` (KEPT, weak) | fix **`dxy→TVC:DXY`** (empty bug); set `usdidr` prior to **0** | MED |
| **NOISE to remove** | **`CEICI323567902` pharma mfg (STALE 18m, supply)**; **`CEICI410108507/517` FDI (theory_agree=false, emp_sign −1)** | exclude — these create the false `model_conflict` | **HIGH** |

**Headline:** the engine reads the basket through a **stale pharma-manufacturing
series and two wrong-signed FDI prints** while the **direct equipment-sales series
(Komatsu) is unreachable** and the **coal-mining-capex pipeline is unused**. The fix
is a category reach + a noise excise — not a rebuild.

---

## 8. Forecastability — protect the skill, do not break it

**The verdict from the OOS backtest (this one is real).** fwd_ic **+0.148**, placebo
pctile **0.983** (beats 98% of circular-shift nulls), n=129. Crucially
**fwd_ic (+0.148) ≳ contemp_ic (+0.136)** — the rare case where the posture **leads**
rather than merely co-moves. The mechanism is sound: the kept skill comes from
**`bcom` + coal price**, both *liquid, exogenous, weekly* commodity series that move
**before** the dealers' order books and earnings. This matches IMPROVEMENT_PLAN §3's
rule (liquid price series lead; CEIC quantity prints lag) — and it is *why* this
basket is one of only 12 SKILL baskets.

**Caveats on the skill (honest read).** It is **rank-correlation skill, not
direction skill**: hit_rate 0.589 vs up_rate 0.56 → **edge +0.029** only
(`binom_p 0.28` — not significant on hit-rate alone). The IC is in the *ordering* of
months, not in calling up/down. Confidence is `low` (`max|corr| 0.34`,
`model_conflict→downgraded`). So the bar for any change is strict: **keep only if
forward IC holds ≥ +0.14**.

**Which branches lead, and by how much:**
- **LEAD (forecast candidates):** D1a `bcom` (0–1m), D1c API2 coal (1–3m), D3 coal-mining
  capex (1–3q), `id_bi_rate` (best_lag **2m**). These are the posture's forward content.
- **COINCIDENT/LAG (attribution only):** D1b HBA admin coal (follows API2), D2 Komatsu
  units (publication-lagged ~6w; ≈ the order book *as reported*), D4a GFCF, S6 Pama
  volume. Use to *explain* a move, not to forecast it.

**Why UNTR's own coal-volume prints reject — and what that teaches.** `CEICI391910527`
(Pama production) and `CEICI391910437` (ytd) test at **corr −0.11, below_gate**. Two
reasons: (i) **weight-cap dilution** — UNTR is 12% of the signal, so *its own* output
doesn't drive the (small-cap-dominated) basket; (ii) it is a **publication-lagged
quantity** that lags the equity. The lesson: for *this* basket the on-thesis series is
the **Komatsu equipment-demand** read (the dealers' order book, D2) — *upstream*
demand — **not** Pama's coal *output* (UNTR's own supply). The brief's "deepen the
coal-capex→equipment-sales lead" is therefore precisely right, but the operative leaf
is **equipment sales (D2) + coal-mining capex (D3)**, not coal production volume.

**What would move it from explainer-with-lead to stronger forecaster:**
- **(A) Reach Komatsu + add the coal-capex pipeline** (D2/D3) as *attribution*
  confirmers — they should lift `theory_agree%` and soften `model_conflict`, raising
  confidence even if forward IC only holds.
- **(B) Lead with the liquid price.** Add `wb_coal_au` (API2 weekly) as an explicit
  global so the *weekly* lead is captured, not just the monthly HBA print.
- **(C) Excise the noise** (stale pharma, wrong-signed FDI) so the verdict stops being
  a `model_conflict` compromise and reflects the real demand-cycle posture.
- **Honest ceiling:** this is a *moderate-correlation, low-confidence, rank-skill*
  basket. The realistic target is "**hold +0.148 forward IC while raising confidence
  from low→medium**" by replacing noise with theory-coherent leaves — *not* a higher IC
  bought with in-sample fit. Any change that lifts in-sample R² but drops forward IC
  must be rejected.

---

## 9. Engine-wiring spec — concrete `mapping.py`

**Current seed (for reference):**
```python
"Machinery": {  # UNTR-dominated: Komatsu dealer + Pamapersada coal mining
    "ceic": [("Industrials & Manufacturing", None), ("Energy", "Coal")],
    "ceic_override": [("coal production", "demand", +1),
                      ("pamapersada", "demand", +1),
                      ("united tractors", "demand", +1),
                      ("mining & quarrying: coal", "demand", +1)],
    "globals": [("bcom", "demand", +1, "commodity cycle -> mining capex -> equipment"),
                ("wb_coal_au", "demand", +1, "mining-equipment demand (UNTR)"),
                ("steel_hrc", "cost", -1, "steel input")],
    "macro": [("cn_ip_yoy", "demand", +1, "capex cycle"),
              ("id_gdp_real_q", "demand", +1, "domestic capex")],
},
```

**Proposed seed (reach Komatsu + coal-capex pipeline; excise noise; fix priors):**
```python
"Machinery": {  # UNTR (Komatsu dealer + Pama coal contractor + gold) + heavy-equip dealers + machinery makers
    # Komatsu equipment sales live in Infrastructure>Construction — add it cross-industry
    # to reach the DIRECT equipment-demand read (currently unreachable). Energy>Coal for
    # the coal price + coal-mining capex pipeline. Industrials for the machinery makers.
    "ceic": [("Industrials & Manufacturing", None),
             ("Energy", "Coal"),
             ("Infrastructure", "Construction")],
    # Re-role the coal-capex -> equipment chain. Komatsu units = DEMAND (dealers' order
    # book). Coal-mining INVESTMENT (FDI/DDI) = DEMAND (forward equipment pipeline).
    # Pama OVERBURDEN = demand (contractor strip-work fee base). NOTE: Pama PRODUCTION
    # rejects at the basket level (corr -0.11, weight-cap dilution) — keep it OUT of the
    # headline by NOT overriding it to demand; let the gate drop it.
    "ceic_override": [
        ("united tractors (komatsu): total", "demand", +1),        # CEICI391910517 — order book (LEAD 0-2m)
        ("united tractors (komatsu): mining sector", "demand", +1),# CEICI391910507 — coal-capex slice of orders
        ("investment realization: foreign: primary sector: mining: 05 coal", "demand", +1),  # CEICI412185207 — FDI coal-mining capex pipeline
        ("investment realization: domestic: primary sector: mining: 05 coal", "demand", +1), # CEICI412186037 — DDI coal-mining capex
        ("pamapersada nusantara): coal overburden", "demand", +1), # CEICI391910547 — strip activity (contractor fee base)
        ("referred price: coal", "demand", +1),                    # CEICI354326367 — HBA = coal P&L -> miner capex (KEEP, kept today)
    ],
    # Excise the spurious / sign-flipping / stale leaves that create the false
    # model_conflict (supply_tilt -0.273). None are valid machinery drivers:
    "ceic_exclude": [
        "pharmaceuticals, medicinal chemical",  # CEICI323567902 — stale(18m), unrelated, drives the bogus supply tilt
        "fdi: machinery & electronics",         # CEICI410108517 — theory_agree=false (emp -1 vs +1), unstable
        "fdi: basic metals & metal goods",      # CEICI410108507 — theory_agree=false (emp -1 vs +1)
        "manufacturing: beverages",             # CEICI323567002 — over-broad Industrials grab, noise
        "gdp: furniture",                        # CEICI365765387 — wrong-signed (corr -0.23), noise
    ],
    "globals": [
        ("bcom", "demand", +1, "ANCHOR: commodity/capex cycle -> miner cash flow -> equipment orders (corr +0.34, t +4.2 — the skill)"),
        ("wb_coal_au", "demand", +1, "API2 coal (weekly) = leading coal-P&L -> coal-mining capex -> equipment (LEAD 1-3m)"),
        ("steel_hrc", "cost", -1, "fabricated-machinery steel input (MARK/AMIN/parts)"),
        ("copper", "cost", -1, "electrical/cooling components (MARK + electrical sleeve)"),
        ("brent", "cost", -1, "UNTR Pama diesel burn (partial offset to coal+ in a co-spike)"),
    ],
    "macro": [
        ("id_bi_rate", "macro", -1, "ANCHOR: equipment-financing affordability + cyclical re-rating (kept: best_lag 2m, ic_t -2.29)"),
        ("dxy", "macro", -1, "broad-USD headwind on commodity/capex equities — REQUIRES repoint TVC:BBDXY->TVC:DXY (empty resolver)"),
        ("usdidr", "macro", 0, "NET-AMBIGUOUS: -imported-equipment cost vs +UNTR USD coal/gold revenue (let data decide)"),
        ("cn_pmi_mfg", "demand", +1, "China mfg PMI leads commodity/capex demand (try as leading complement to cn_ip)"),
        ("id_gdp_real_q", "demand", +1, "domestic capex backdrop (use growth/diff — the level mis-signs)"),
    ],
},
```

**Resolver fix (separate, in `GLOBAL_CORR` — flag for engine owner; not edited here):**
```python
"dxy": "TVC:DXY",   # was TVC:BBDXY (weekly_obs=0, EMPTY) — TVC:DXY has 800 weekly obs
```

**New resolver to enable D5 China excavator (optional, needs data backfill — flag):**
```python
# add to GLOBAL_CORR if/when aCNCNIQREQ history is loaded into correlation.sqlite:
"cn_excavator": "aCNCNIQREQ",   # China excavator sales — classic global construction-machinery LEAD (P3M)
```
Then add `("cn_excavator", "demand", +1, "China construction-machinery cycle leads global equip demand")`
to macro. **Do not wire until the series is confirmed populated** — cn.json carries no
n_obs, so it must be verified live first.

**`ceic_exclude` rationale (spurious / stale / sign-flip — not endogeneity):**
- `CEICI323567902` pharma mfg — **stale 18m**, zero causal link to machinery; it is the
  sole large contributor to `supply_tilt −0.273` → the false `model_conflict`. Removing
  it is the highest-value single change.
- `CEICI410108507/517` FDI basic-metals / machinery-electronics — **`theory_agree=false`**
  (emp_sign −1 vs +1 prior), one `stable=false`; quarterly, weak, wrong-signed.
- `CEICI323567002` beverages mfg, `CEICI365765387` GDP furniture — collateral grabs from
  the over-broad `Industrials & Manufacturing` pull, wrong-signed / irrelevant.
- (No constituent-own-balance-sheet or system-ratio endogeneity here — all candidates are
  national/company *physical/price* series exogenous to the equities' own outcomes. Pama
  *production* is intentionally **not** force-overridden to demand because it rejects on
  its own at the basket level.)

**Falsifiable backtest plan (gate the change — keep ONLY if forward IC holds/improves):**
1. Re-run `backtest/bt.py "Machinery"` after the seed swap. **Expectation:** forward IC
   **holds ≥ +0.14** (do not break the existing SKILL) while **`theory_agree%`, `mvR2`,
   `stable%` rise** and **`model_conflict` flips to false / `supply_tilt` rises toward 0**
   — because excising the stale-pharma/FDI noise removes the bogus negative supply limb.
   **Reject if forward IC falls below +0.12.**
2. **Lead test on Komatsu (the core thesis):** confirm `CEICI391910517` (and the
   mining-% `CEICI391910507`) lead the basket return at h = 1–4m. If lead IC > 0 at
   h=1–4m, the coal-capex→equipment lead is real → promote to a forecast leaf; if
   coincident-only, keep as attribution. This **falsifies the "equipment sales lead"
   hypothesis cleanly** — and is the single test that decides whether the brief's
   deepening adds *forecast* content or only *attribution*.
3. **Coal-capex-pipeline test:** confirm `CEICI412185207/412186037` (coal-mining FDI/DDI)
   lead the basket by 1–3 quarters. If yes, the *pipeline → equipment* chain is wired
   end-to-end; if not, demote to context.
4. **`bcom`+coal-only benchmark:** run a 2-driver model on `bcom` + `wb_coal_au` alone.
   If the full deepened tree cannot beat it on forward IC, the honest verdict is
   **"a coal/commodity-cycle beta on the dealers' order books, confirmed by equipment
   activity"** — still SKILL, lead with the price, treat Komatsu/capex as attribution.
5. **DXY fix check:** after `dxy→TVC:DXY`, verify the macro block picks up a non-zero,
   theory-coherent (−1) DXY loading; `macro_tilt` should remain coherent (currently +0.40
   off the rate/CPI terms).

---
*Series cited exist in `plan/catalog/{idind,market,cn}.json` (RIC + n_obs verified for
idind/market). Empirical figures from `output/industrials_machinery.json` +
`backtest/results/industrials_machinery.json`. Forward skill (fwd_ic +0.148, placebo 98th
pctile) is REAL — this plan deepens and de-noises it, it does not rescue it. Data bugs found:
(1) `dxy→TVC:BBDXY` resolver empty (repoint to `TVC:DXY`, 800 wk); (2) engine keeps a STALE
(18m) pharma-manufacturing series as a 'supply' driver — the source of the false
`model_conflict`; (3) the on-thesis Komatsu equipment-sales series `CEICI391910517` is
UNREACHABLE under the current `ceic` categories (lives in Infrastructure>Construction).*
