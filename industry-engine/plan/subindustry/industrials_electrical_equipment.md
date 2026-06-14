# Electrical Equipment (`industrials_electrical_equipment`) — driver-tree plan

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Sector
> **Industrials** · sub_sector **Electrical Equipment** · **7 members** · mcap **≈ 5.97 T**
> (#43 of 52). Current state (`_state.txt` / `BACKTEST.md`): grade **partial** · conf
> **low** · kept **2** · n_oos **129** · **fwd IC +0.10 · hit−up +0.01 · placebo pctile
> 0.83 → flag `marginal`** (just below the skill line, same neighbourhood as Apparel /
> Toll Road / Electronics).
>
> **The one-sentence thesis of this file.** The basket is a pack of **copper-cable
> makers**, and almost all of its (real but thin) forward edge comes from **one series —
> copper (`COMEX:HG1!`)** — because copper plays a **dual role**: it is the **#1 raw-input
> cost** (~60–70 % of cable COGS) *and* the **cleanest live barometer of the global
> electrification / grid-build demand** that drives cable volume (China is ~55 % of world
> copper use, so the LME/COMEX price *is* a China-grid-demand index). That dual role is
> the marginal skill. It is "not stronger" because the two channels **partly cancel** (a
> copper rally is a demand tailwind *and* a margin headwind), because the basket is
> **low-β and IDR-domestic**, and because the dedicated CEIC demand block is **trade-flow
> only and the volume series are stale/annual**. Every RIC, n_obs and last_obs below is
> real and quoted from `catalog/{idind,id,market}.json`.

---

## 1. Snapshot — a copper-cable basket sitting one notch below skill

| field | value |
|---|---|
| basket id | **`industrials_electrical_equipment`** · sub_sector **Electrical Equipment** · sector **Industrials** |
| mcap | **5.97 T** (#43 of 52; tiny — below Healthcare-Equipment, above Software) |
| n members | **7** cable / electrical-conductor makers |
| current grade | **partial** · conf **low** |
| current kept drivers | **2** (the engine keeps only copper + aluminium as statistically live; the rate/GDP macro leaves are mapped but did not survive the keep-gate) |
| **current forward OOS skill** | **IC +0.10 · hit−up +0.01 · placebo pctile 0.83 · flag `marginal`** (n_oos **129**) |
| the gap | the seed pulls `ceic: [("Industrials & Manufacturing", "Electrical Equipment")]` — a block whose only usable monthly series are **two trade-flow prints** (`CEICI537025287` import, `CEICI536976317` export), both **mis-tagged** (import labelled `demand`, export labelled `supply` — the economics are the *reverse*; see §3/§4). The dedicated **manufacturing-volume** series (`CEICI323568502` IPI Electrical Equipment, n180) is **⚠STALE → 2024-12** and not pulled by the sub-block at all. There is **no demand branch** for the basket's actual end-markets — **PLN/grid capex, construction/property, and the China-electrification cycle** — even though all three are reachable cross-industry. Copper and aluminium are correctly wired; **DXY is silently dead** (`TVC:BBDXY` wk0 bug) and **`id_lending_rate` resolves to None**. |

**Members (what each does, and why the weighting matters).** Seven names; SCCO + KBLI
are ~54 % of cap, but the engine targets the **equal-weighted** basket, so the smaller,
higher-β names (JECC, CCSI, VOKS) carry more signal weight than their cap implies.

| sym | name | what it makes | mcap (T) | yf β | weight note |
|---|---|---|---|---|---|
| **SCCO** | Supreme Cable (Sucaco) | power & telecom copper/aluminium cable; the bellwether, strong PLN order book | **1.94** | 0.158 | **#1 cap (~33 %)**, low-β, the "quality" name |
| **KBLI** | KMI Wire & Cable | power cable / enamelled wire; large PLN/building-wire exposure | **1.29** | 0.081 | **lowest β** — near-inert, partly a fixed point |
| **VOKS** | Voksel Electric | power, fibre-optic & building cable; copper + some fibre/data | 0.88 | n/a | mid-cap, β unestimated (thin trade) |
| **IKBI** | Sumi Indo Kabel | copper power & winding wire (Sumitomo-affiliated) | 0.66 | 0.181 | export/affiliate tilt; USD-cost sensitive |
| **JECC** | Jembo Cable | power & telecom cable | 0.51 | **0.373 — highest** | the genuine **mover**; over-weighted in the EW signal |
| **CCSI** | Communication Cable Systems | **fibre-optic / data / structured cabling** (least copper) | 0.35 | 0.258 | **the odd one out** — data-cable, telco-capex-driven, *not* copper-led |
| **KBLM** | Kabelindo Murni | power & telecom copper cable | 0.33 | 0.064 | tiny, low-β |

**One-line characterisation:** ~85 % of the basket is **copper-cable volume (PLN/grid +
building wire) × copper-pass-through price − copper/aluminium cash cost**, with **JECC the
only real β mover**, KBLI/KBLM/SCCO low-β anchors, and **CCSI a fibre-optic dissenter**
whose driver is telco/data-centre capex, not the copper complex. Betas of 0.06–0.37 →
this is a **low-amplitude, IDR-domestic industrial** basket: its excess-return signal is
small and easily drowned, which caps how high the IC can realistically go (§8).

---

## 2. Economic structure — how the basket makes money

Cable manufacturing is a **thin-margin metal-conversion business**: the maker buys copper
(and aluminium) rod/cathode, draws and insulates it, and sells finished cable at a price
**indexed to the metal** plus a **conversion premium**. The revenue identity:

```
Revenue   ≈ volume (km / tonnes) × ASP (IDR/t)
ASP       ≈ LME/COMEX copper (IDR-translated) + conversion premium + insulation/PVC
volume    ≈ f( PLN grid capex + electrification + construction/property + data-cable )
EBITDA    ≈ Revenue − metal_cost×volume − conversion (energy, PVC, labour) − fixed
metal_cost≈ COPPER (~60–70 % of COGS)  +  ALUMINIUM (overhead/ACSR conductor)  +  PVC/XLPE (oil-linked)
```

**The margin swing factor is the copper *timing mismatch*, not the copper *level*.**
Because ASP is metal-indexed, a cable maker is in principle **cost-pass-through** — a
higher copper price lifts both COGS *and* revenue, so the *level* of copper is closer to
margin-neutral than for, say, cement (where the output price is not metal-indexed). What
actually moves the margin is the **lead/lag of price-through vs inventory**:

- **Rising copper, short term = MARGIN HEADWIND.** Tenders and order books are priced
  weeks/months ahead; finished-goods and rod inventory was bought cheaper; a fast copper
  rally squeezes the spread until ASP catches up (1–2 quarters). So a copper *spike*
  compresses near-term margin → **cost sign −1 on the basket's return**, with the equity
  *anticipating* the squeeze. This is the channel the engine sees.
- **Rising copper, also = DEMAND TAILWIND** (the dual role — see §3). A copper rally is
  usually *caused by* strong global electrification / China grid demand, which is exactly
  what fills the cable order book. So the **same series carries a +demand signal and a
  −cost signal at once**; the net basket sign is the *residual* of two opposing channels.
  This is *the* reason the marginal skill exists *and* the reason it is not larger (§8).
- **Inventory windfall/loss.** With metal-indexed ASP, a maker holding rod inventory
  books an **inventory gain** when copper rises (sell at the new higher index off
  cheaper stock) and a loss when it falls — a second, lumpier margin term that adds noise.

**The cost stack (what eats the conversion margin):**
- **Copper (~60–70 % of COGS)** — `COMEX:HG1!` (wk800). **The dominant input and the
  single most important series in the file.** Sucaco/KMI/Jembo all buy copper rod indexed
  to LME; COMEX HG is the liquid, leading global proxy.
- **Aluminium (overhead/ACSR conductor, ~5–15 %)** — `COMEX:ALI1!` (wk621). Aluminium
  conductor (ACSR) substitutes for copper in transmission/overhead lines; a secondary
  but real input, and a **partial copper hedge** (when copper gets dear, demand shifts to
  aluminium conductor — so aluminium is *both* a cost and a substitution-demand read).
- **PVC / XLPE insulation (oil-linked)** — no clean dedicated series; **Brent
  (`ICEEUR:BRN1!`) is the honest proxy** for the polymer-jacket cost (~5–10 %).
- **Energy / labour (conversion)** — electricity + wire-drawing energy; PLN industrial
  tariff is administered (annotation, §4).

**Intra-basket dispersion — the subtleties a sell-side analyst watches:**
- **SCCO + KBLI ≈ the low-β PLN-order-book core** (~54 % cap): their returns track the
  *grid-capex cycle* and the *copper-margin spread*, but with muted amplitude.
- **JECC (β 0.373)** is the only name that genuinely *moves* — the EW basket's realised
  signal leans on it, so the basket is noisier than the low betas suggest.
- **CCSI** is a **fibre-optic/data-cable** name: its driver is **telco + data-centre
  capex** (cross-ref Telco/IT-Services), **not** copper. Lumping it into a copper-cost
  tree mis-attributes ~6 % of the basket — small, but it dilutes the clean copper read.
- **IKBI (Sumitomo-affiliated)** has the most **export / USD-cost** tilt → the most
  exposed to USD/IDR on the *imported-rod* side.

**What a sell-side analyst actually watches:** **copper (LME/COMEX)** — both as cost and
as the order-book demand tell; the **copper–aluminium spread** (conductor substitution);
**PLN's RUPTL / grid-capex programme and tender flow** (the volume driver, no clean
monthly series — policy annotation + construction-loan proxy); **construction / property
starts** (building-wire demand, cross-industry); **China IP / global electrification**
(`aCNIP` — the upstream copper-demand pulse); and **USD/IDR** (imported copper-rod parity
+ FX-debt on the more-levered names).

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's **excess** return vs
> JCI for a *rise* in the driver. `lead` = expected months the driver moves *before* the
> equities. **Liquid exogenous price series (copper, aluminium, FX) → forecast
> candidates; CEIC quantity/trade prints are publication-lagged → attribution.** The
> Electrical-Equipment CEIC sub-block is almost entirely **trade-flow or stale/annual** →
> the *leading* demand handle is **copper itself** (D1) and the **China-IP / construction-
> loan** cross-industry chain (D2/D3).

### D1 — COPPER-AS-DEMAND (the electrification barometer — the LEADING leaf, dual-role)
```
GLOBAL ELECTRIFICATION / GRID DEMAND  (the order-book pulse, read off the metal price)
├─ D1a copper price (demand read) ─► [COMEX:HG1! Copper, wk800]   sign +1(demand) · lead 1–3m · FORECAST ★the dual-role core
│      (China ~55% of Cu use →       — NOTE: this SAME series is also S1 cost −1 (§4). The basket sign is the RESIDUAL.
│       LME price = grid-demand idx)
├─ D1b aluminium (conductor demand)► [COMEX:ALI1! Aluminium, wk621]  sign +1(demand) · lead 1–3m · FORECAST (ACSR overhead-line demand + Cu substitution)
└─ D1c China industrial pulse ─────► [aCNIP China IP YoY (cn_ip_yoy), monthly]   sign +1 · lead 1–2m · the upstream copper-demand driver (slower, publication-lagged)
```

- **D1a — the single most important leaf in the file, and it is genuinely *leading*.**
  `COMEX:HG1!` (copper, wk800 weekly to ~2009) is a **liquid, exogenous, daily price**
  that *leads* the equities. Its **demand reading** works because copper is the most
  electrification-levered metal and **China is ~55 % of world consumption**, so the price
  *is* a real-time index of the grid-build / power-capex / EV-and-renewables demand that
  fills Indonesian cable order books. When copper rallies on demand, the cable order book
  and the equities rally with it (lead 1–3m). **This is the +demand half of the dual
  role.** It is *the* reason the basket has any forward IC at all.
- **D1b — aluminium = conductor demand + a copper hedge.** `COMEX:ALI1!` (wk621) reads
  overhead-line / ACSR demand and **rises when copper substitution kicks in** (dear
  copper → switch to aluminium conductor). Same dual role as copper, smaller weight.
- **D1c — China IP, the slower upstream pulse.** `aCNIP` (`cn_ip_yoy`) confirms the
  copper-demand story from the quantity side, but it is **publication-lagged → coincident**
  → attribution, not a second forecaster (copper price already prices it in faster).

### D2 — DOMESTIC GRID / PLN CAPEX (the structural volume driver — mostly attribution)
```
PLN / GRID CAPEX DEMAND  (transmission + distribution build = the #1 domestic volume sink)
├─ D2a grid/utility loan demand ──► [CEICI285015402 Banking Survey: New-Loan Demand: Electricity sector, n70, P3M →2026-03]  sign +1 · lead 1–2m · survey LEADS (the cleanest PLN-capex-financing tell)
├─ D2b electricity consumption ───► [CEICI13523401 Electricity Consumption: Industrial, MWh mn, n40, P1Y →2025-12]  sign +1 · lead 0m · ATTRIBUTION (annual, lagged — grid-utilisation proxy)
├─ D2c electricity tariff (cost to PLN)► [CEICI385762057 Electricity Tariff: Industry I3, IDR/kWh, n138, P1M →2026-06]  sign ~0 · admin · POLICY annotation (tariff = PLN's capex-funding capacity, ambiguous on cable demand)
└─ D2d PLN grid-capex / RUPTL ───► (no clean monthly grid-capex-realisation series in store) — POLICY annotation; proxy via D2a + D3b construction loans
```

- **D2a — the one genuinely *leading* domestic demand handle.** `CEICI285015402`
  (**Banking Survey: Demand for New Loans: Electricity & Gas sector**, n70 quarterly →
  2026-03) is a **forward-looking BI survey** of credit demand from the electricity
  sector → it leads physical grid-capex (and thus cable tenders) by ~1–2 months. The
  cleanest domestic forward signal the seed completely misses. **Cross-industry (Banks
  block); needs the `id`-macro resolver path** (§9).
- **D2b — electricity consumption (annual, attribution only).** `CEICI13523401`
  (Industrial electricity consumption, MWh mn, **n40 ANNUAL** → 2025-12) confirms grid
  utilisation but is annual + lagged → weak attribution, document don't lean on it.
- **D2c — tariff is a PLN-funding variable, not a cable-demand variable.** A higher
  industrial tariff funds PLN capex (→ +cable demand) *and* signals cost pressure (→
  ambiguous). Sign ~0; annotation, not a fitted driver.
- **D2d — PLN's RUPTL grid-capex programme is the structural driver and has no clean
  monthly series** → policy annotation, proxied by D2a (utility loan-demand survey) +
  D3b (construction loans). Document, don't fake.

### D3 — CONSTRUCTION / PROPERTY (building-wire demand — rate-elastic, cross-industry)
```
BUILDING-WIRE DEMAND  (residential + commercial construction = building cable / wire pull)
├─ D3a construction activity ─────► [CEICI365752057 GDP: Construction (2010p), IDR bn, n73, P3M →2026-03]  sign +1 · lead 0–1m · ATTRIBUTION ★better than generic GDP
├─ D3b construction loans ────────► [CEICI225728402 Property Loan: Construction, IDR bn, n292, P1M →2026-04]  sign +1 · lead 2–4m · cross-industry (contractor/grid-build pipeline)
├─ D3c property price / starts ───► [CEICI500272547 Residential Property Price Index: 18 Cities, 2018=100, n33, P3M →2026-03]  sign +1 · lead 1–3m · cross-industry (RPPI → starts → building wire)
└─ D3d construction sentiment ────► [CEICI277372502 Consumer Confidence Index (Infra/Constr block), Point, n196, P1M →2026-04]  sign +1 · lead 1–2m · survey LEADS (self-build/renovation wire demand)
```

- **D3a — GDP-Construction beats the seed's generic GDP.** The seed leans on
  `id_gdp_real_q` (`aIDGDPAR1`, whole-economy); `CEICI365752057` (**GDP: Construction**,
  n73 quarterly) is the theory-correct activity attribution — building-wire demand *is*
  construction activity. Publication-lagged → attribution.
- **D3b — construction loans, the contractor/grid-build pipeline lead.** `CEICI225728402`
  (**Property Loan: Construction**, IDR bn, **n292 monthly** → 2026-04 — a long, clean
  series) leads physical construction (and thus building-wire + distribution-cable
  off-take) by ~2–4m as contractors draw working capital. Cross-industry (Property/Banking
  plane), no resolver today.
- **D3c — RPPI (the property-cycle lead).** `CEICI500272547` (Residential Property Price
  Index, 18 Cities, n33 quarterly) leads housing starts → building-wire demand 1–3m. The
  same RPPI the Property file needs — one shared resolver task (§9).
- **D3d — construction/consumer confidence (self-build wire).** `CEICI277372502` (CCI in
  the Infrastructure/Construction block, n196 monthly) proxies self-build / renovation
  wire demand (a large informal slice of Indonesian building-wire off-take); survey leads
  physical demand 1–2m.

---

## 4. SUPPLY / COST driver tree

```
SUPPLY / COST  (copper-dominated conversion margin + aluminium + polymer + the trade-flow block)
├─ S1 COPPER (~60–70% COGS) ──────► [COMEX:HG1! Copper, wk800]   sign −1(cost) · lead 1–2m · COST ★PRIMARY swing (the near-term margin squeeze)
│      (SAME series as D1a +1 demand — the dual role; the engine fits the RESIDUAL net sign)
├─ S2 ALUMINIUM (conductor) ──────► [COMEX:ALI1! Aluminium, wk621]  sign −1(cost) · lead 1–2m · COST (ACSR input; also a copper-substitution hedge → net cost milder than copper)
├─ S3 PVC/XLPE insulation (oil) ──► [ICEEUR:BRN1! Brent, wk800]   sign −1 · lead 0–1m · COST (polymer jacket ~5–10%; proxy — no dedicated resin series)
├─ S4 imported equipment / rod ───► [CEICI537025287 Import: Electrical Equipment, USD th, n111, P1M →2026-03]  sign −1(as COST/competing supply) · lead 0m · ⚠RE-ROLE (catalog tags 'demand' — WRONG; import = input cost + competing finished-goods supply)
├─ S5 export competitiveness ─────► [CEICI536976317 Export: Electrical Equipment, USD th, n111, P1M →2026-03]  sign +1(as foreign DEMAND) · lead 0m · ⚠RE-ROLE (catalog tags 'supply' — it is export *demand*; IKBI/affiliate exporters)
└─ S6 domestic mfg output ────────► [CEICI323568502 IPI: Manufacturing: Electrical Equipment, 2010=100, n180, P1M →2024-12 ⚠STALE]  sign +1 · lead 0m · ATTRIBUTION (stale 18m — do not wire live)
```

- **S1 — COPPER is the margin swing, and the −cost half of the dual role.** `COMEX:HG1!`
  is the **#1 cost** (~60–70 % of COGS) and the near-term margin squeeze: a fast copper
  rally compresses the conversion spread until ASP re-indexes (1–2 quarters), so the
  equity *anticipates* the squeeze (**sign −1, lead 1–2m**). **This is the same series as
  D1a (+1 demand).** The engine cannot wire copper *twice* with opposite signs — it wires
  **one net sign** and lets the data pick the residual. Empirically the basket's marginal
  +0.10 IC says the **net** copper effect on *forward* return is **mildly positive**
  (demand dominates the lead), which is why the current seed wires copper as **cost −1
  and it survives** as one of the two kept drivers — i.e. the engine is reading the
  cost-squeeze co-movement. **The single most important wiring decision in the file is
  how to represent copper's dual role** (§9): the honest options are (a) keep it a single
  net leaf and let the keep-gate decide the sign, or (b) split copper *level* (demand +1,
  the China-grid read) from copper *momentum/Δ* (cost −1, the squeeze) if the resolver can
  express both — option (b) is the falsifiable upgrade (§8/§9).
- **S2 — aluminium = cost AND copper hedge.** `COMEX:ALI1!` (wk621) is a real conductor
  input (cost −1), but because aluminium gains *share* when copper is dear, its net cost
  bite is milder and it carries a substitution-demand offset. Already wired (cost −1) —
  keep, lower weight than copper.
- **S3 — Brent (polymer insulation proxy).** PVC/XLPE jacket tracks oil; **`ICEEUR:BRN1!`
  (wk800) is the honest proxy** (no dedicated resin series in store). Cost −1, ~5–10 % of
  COGS, secondary to the metals. Not currently wired — a cheap add.
- **S4 — import trade-flow, MIS-TAGGED.** `CEICI537025287` (**Import: Electrical
  Equipment**, USD th, n111 monthly → 2026-03) is tagged `demand` in the catalog — but
  **imported electrical equipment is a COST/competing-supply variable** (imported
  copper-rod / finished cable that competes with the domestic basket), so its return sign
  should be **−1, not +1**. **Re-role via `ceic_override`** (§9). This is a concrete
  catalog sign bug.
- **S5 — export trade-flow, ALSO mis-tagged.** `CEICI536976317` (**Export: Electrical
  Equipment**, USD th, n111 monthly) is tagged `supply` — but **export value is foreign
  *demand*** for the basket's output (IKBI/Sumitomo-affiliate + PTSN-type exporters), so
  **+1 demand**. Re-role. (Both S4/S5 are coincident trade prints → attribution, not
  forecast, but the *sign* must be right or they fight the copper leaf.)
- **S6 — domestic manufacturing output (STALE).** `CEICI323568502` (**IPI: Electrical
  Equipment**, n180 monthly) is the output-volume mirror but **last obs 2024-12 → ~18
  months stale** → wire as low-weight attribution *only* if backfilled; flag for backfill.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay  (financing rate for grid/construction demand + imported-metal FX + flow)
├─ M1 BI policy rate ────────────► [ECONOMICS:IDINTR BI 7DRR, monthly]   sign −1 · lead 3–6m · MACRO (grid/construction-capex financing; the demand-chain root)
├─ M2 ID 10Y govt yield ─────────► [TVC:ID10Y, wk798]   sign −1 · lead 1–3m · MACRO (infra/SOE-capex financing cost; LEADING price)
├─ M3 USD/IDR ───────────────────► [FX_IDC:USDIDR, wk801]  sign −1 · lead 0–1m · MACRO (imported copper-rod parity in USD + FX debt; mild + for IKBI export sleeve → net −)
├─ M4 broad USD (DXY) ───────────► [TVC:DXY US Dollar Index, wk800]  sign −1 · lead 0–1m · MACRO  ★FIX: seed/engine routes dxy→TVC:BBDXY (wk0, DEAD)
└─ M5 GDP / activity ────────────► [CEICI365752057 GDP: Construction, n73] (see D3a)  sign +1 · lead 0–1m · attribution (replaces generic id_gdp_real_q)
```

- **M1 BI rate = −1, the demand-chain root (but weak for low-β industrials).** The BI 7DRR
  (`ECONOMICS:IDINTR`) leads the grid/construction-capex financing chain (rate ↓ → cheaper
  contractor/PLN financing → more cable tenders) by 3–6m. **Mapped in the seed but did NOT
  survive the keep-gate** (only copper+aluminium kept) — its effect is diffuse on a low-β
  IDR-domestic basket. Keep as a theory leaf; expect it to attribute, not forecast.
- **M2 ID 10Y = −1, a LEADING liquid price.** `TVC:ID10Y` (wk798) is the infra/SOE-capex
  financing anchor and, being a daily yield, it *leads*. Mapped (macro −1); did not
  survive the keep-gate either. Keep — it is the best-shaped macro leaf even if thin.
- **M3 USD/IDR = −1.** Cable makers **import copper rod / cathode priced in USD**, so a
  weak IDR raises the IDR cost of the dominant input (and FX-debt service on the more-
  levered names). The **IKBI export sleeve** gets a mild translation *offset*, so the net
  is a modest **−1**. (The seed currently has usdidr sign **0** "ambiguous" — sharpen to
  −1: copper-rod import cost dominates the small export offset.)
- **M4 DXY = −1 — and the resolver BUG.** A stronger broad dollar = EM-flow headwind +
  IDR pressure → negative for these low-β domestic cyclicals. **But `dxy` resolves to
  `TVC:BBDXY` (wk0, EMPTY) → DXY is silently unwired everywhere** (DATA_BUGS.md). Fix to
  **`TVC:DXY`** (wk800). Free, engine-wide, falsifiable.
- **M5 — replace generic GDP with GDP-Construction.** `id_gdp_real_q` (`aIDGDPAR1`) is
  whole-economy; `CEICI365752057` (GDP: Construction) is the theory-correct activity
  attribution for building-wire demand (D3a). Demote/replace.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `COMEX:HG1!` copper | **market / metals** | **demand +1 AND cost −1 (dual)** (D1a/S1) | ~60–70 % of COGS *and* the global-electrification / China-grid demand barometer — the basket's whole edge |
| `COMEX:ALI1!` aluminium | **market / metals** | **demand +1 / cost −1** (D1b/S2) | ACSR conductor input + the copper-substitution hedge |
| `ICEEUR:BRN1!` Brent | Energy / Oil | **cost −1** (S3) | PVC/XLPE insulation jacket (~5–10 %; proxy — no resin series) |
| `aCNIP` China IP | **CEIC China** | **demand +1** (D1c) | China = ~55 % of copper demand → upstream grid/electrification pulse (slower confirm of the copper read) |
| `CEICI285015402` electricity-sector new-loan demand | **Banks** (`id`-macro plane) | **demand +1** (D2a) | forward survey of PLN/grid-capex financing → cable tenders (lead 1–2m) |
| `CEICI225728402` construction loans | **Property & RE** (`id`-macro plane) | **demand +1** (D3b) | contractor/grid-build pipeline → building-wire off-take (lead 2–4m) |
| `CEICI500272547` RPPI 18-city | **Property & RE** (`id`-macro) | **demand +1** (D3c) | property cycle → starts → building wire (lead 1–3m) |
| `CEICI365752057` GDP: Construction | **Infrastructure / Construction** | **demand +1** (D3a/M5) | building-wire demand IS construction (replaces generic GDP) |
| `CEICI277372502` consumer confidence | Consumer Surveys (Constr block) | **demand +1** (D3d) | self-build / renovation wire purchasing power |

**The cross-industry story.** Electrical Equipment is a **downstream read on two cycles
it does not contain**: (1) the **utilities / grid** cycle (PLN capex — cross-ref
`infrastructure_construction`, the AltEnergy/Utilities baskets) and (2) the **property /
construction** cycle (building wire — cross-ref `properties_real_estate_property`). Both
demand legs live on the **same Banking/Property `id`-macro plane** the Property and Cement
files need — wiring it here is the same shared resolver task (§9). The **CCSI fibre-cable
sleeve** additionally borrows from **Telco / IT-Services** (data-centre + telco capex) —
acknowledged but too small (~6 % cap) to wire as its own branch.

**Deliberate non-linkages.** Do **not** wire `SGX:FEF1!` iron ore or `SHFE:RB1!` rebar
(both wk0, DEAD, and steel is not a cable input). Do **not** treat the electricity-tariff
series as a cable-demand driver (it is PLN's funding/cost variable, sign ~0). Do **not**
wire the **stale** IPI Electrical Equipment (`CEICI323568502` → 2024-12) as a live leaf.

---

## 7. Currently-wired vs available

### 7a. The current `Electrical Equipment` seed vs proposed (rescue marginal → skill)

| driver (now) | role/sign now | resolves to | verdict | proposed change |
|---|---|---|---|---|
| `ceic ("Industrials & Manufacturing","Electrical Equipment")` | category pull | 2 usable monthly series (both mis-tagged) + stale IPI + annuals | **★KEEP block, RE-ROLE** | re-role import→cost −1, export→demand +1 (`ceic_override`); accept the rest are attribution/stale |
| `copper` | cost −1 | `COMEX:HG1!` wk800 | **KEEP — the backbone** | the dual-role core; **test split** of level(+1 demand) vs Δ(−1 cost) |
| `aluminum` | cost −1 | `COMEX:ALI1!` wk621 | **keep** | conductor input + Cu-substitution hedge; lower weight |
| `id_bi_rate` | macro −1 | `ECONOMICS:IDINTR` | **keep (thin)** | grid/construction financing root; did not survive keep-gate — theory leaf |
| `id_10y` | macro −1 | `TVC:ID10Y` wk798 | **keep (thin)** | infra-capex financing; leading yield |
| `id_gdp_real_q` | demand +1 | `aIDGDPAR1` | **replace** | → `CEICI365752057` GDP: Construction (theory-correct) |
| `usdidr` | macro 0 | `FX_IDC:USDIDR` wk801 | **sharpen → −1** | imported copper-rod parity dominates small IKBI export offset |
| `id_cpi_yoy` | macro 0 | `ECONOMICS:IDIRYY` | **keep 0** | inflation regime, no clean sign |
| *(none)* `brent` | — | `ICEEUR:BRN1!` wk800 | **ADD cost −1** | PVC/XLPE insulation proxy (~5–10 % COGS) |
| *(none)* `cn_ip_yoy` | — | `aCNIP` | **ADD demand +1** | China = ~55 % copper demand → grid/electrification pulse |
| *(none)* `dxy` | — | **`TVC:BBDXY` wk0 DEAD** | **★FIX → `TVC:DXY` wk800** | engine-wide resolver bug; add macro −1 |
| *(none)* electricity-sector loan demand | — | `CEICI285015402` n70 | **ADD demand +1** (needs `id`-resolver) | the leading PLN-capex-financing survey |
| *(none)* construction loans | — | `CEICI225728402` n292 | **ADD demand +1** (needs `id`-resolver) | contractor/grid pipeline (2–4m) |
| *(none)* RPPI 18-city | — | `CEICI500272547` n33 | **ADD demand +1** (needs `id`-resolver) | property cycle → building wire |

### 7b. Available-but-NOT-wireable (documented gaps, do not fake)

| ideal driver | best in-store handle | why not wired |
|---|---|---|
| PLN RUPTL grid-capex realisation (the structural volume driver) | proxy `CEICI285015402` + `CEICI225728402` | no clean monthly grid-capex series |
| Copper–aluminium conversion spread (the true margin) | derive HG1! − ALI1! | engine has no spread primitive; derive offline or test as a ratio |
| PVC / XLPE resin price | proxy `ICEEUR:BRN1!` Brent | no dedicated resin/polymer series in store |
| Domestic cable volume / tender flow | `CEICI323568502` IPI (n180) | **⚠STALE → 2024-12** (~18m) — backfill task |
| Data-centre / telco capex (CCSI fibre sleeve) | (Telco/IT-Services blocks) | too small (~6 % cap) to wire its own branch; cross-ref only |
| PLN industrial electricity tariff as a *demand* read | `CEICI385762057` (n138) | tariff is PLN's funding/cost variable, sign ~0 — annotation |

---

## 8. Forecastability — why it's marginal, why copper gives the skill, and how to lift it

**The backtest fact.** Electrical Equipment is **IC +0.10 · hit−up +0.01 · placebo pctile
0.83 → `marginal`** over **129** forward months — it sits *just below* the skill line
(IC ≥ 0.08 *and* placebo ≥ 0.90), alongside Apparel (+0.10), Toll Road (+0.10) and
Electronics (+0.07). It is **not broken**; it has a real, leading driver. It is **not yet
a forecaster** because the signal is thin and the dual role partly self-cancels.

**Why the marginal skill exists — it is the copper dual role.** With only **2 kept
drivers** (copper + aluminium) the basket *still* clears +0.10 forward IC at the 83rd
placebo percentile. That edge is **copper doing two jobs at once**:
1. **Copper-as-cost** (−1): a copper spike squeezes the conversion margin 1–2 quarters
   ahead of ASP re-indexing → the equity anticipates the squeeze.
2. **Copper-as-demand** (+1): a copper rally signals global electrification / China-grid
   demand → cable order books fill → the equity rallies.
Because copper is a **liquid, exogenous, *leading*** price (unlike the basket's
publication-lagged CEIC volume prints), it carries genuine forward information on *both*
channels. The marginal +0.10 is the **net residual** of the two — and the residual is
**positive**, i.e. on the forward horizon the **demand tailwind modestly outweighs the
cost squeeze**. That is the marginal skill, and it is the cleanest, most honest single
fact about this basket.

**Why it is *not stronger* (the honest diagnosis):**
1. **The two copper channels partly cancel.** A +1 demand read and a −1 cost read on the
   *same series* net to a small residual — so even the basket's best driver delivers a
   *muted* signal by construction. This is structural, not a wiring bug.
2. **Low-β, IDR-domestic, equal-weighted.** Betas 0.06–0.37; the EW basket over-weights
   the thin high-β names (JECC) and is easily drowned by idiosyncratic moves. Low equity
   amplitude caps the achievable IC regardless of how clean the driver is.
3. **The domestic demand block is unmodelled.** The dedicated CEIC sub-block is **trade-
   flow + stale/annual**; the genuinely leading domestic demand handles (PLN-sector
   loan-demand survey, construction loans, RPPI) live on the **`id`-macro plane no
   resolver reads**. The basket is blind to its own grid/construction demand cycle's
   leading indicators — so copper has to carry everything.
4. **A sign bug fights the copper leaf.** The mis-tagged import/export trade prints (S4/S5
   tagged the *wrong* way) push against the copper read until re-roled.

**Which branches lead vs lag:**
- **LEAD (forecast candidates):** copper `HG1!` (1–3m, the dual-role backbone), aluminium
  `ALI1!` (1–3m), DXY/USDIDR (0–1m, once DXY is un-bugged), electricity-sector loan-demand
  survey (1–2m, UNWIRED), construction loans (2–4m, UNWIRED), ID 10Y / BI rate (1–6m).
- **COINCIDENT/LAG (attribution):** import/export trade prints, IPI (stale), GDP-
  Construction, electricity consumption (annual), China IP — publication-lagged. They
  anchor attribution; they do not forecast.

**What would move it from +0.10 toward skill (the upside tests, keep-gated):**
1. **Re-role the trade prints** (import→cost −1, export→demand +1) — stop the sign bug
   fighting copper. *Expected small lift, free.*
2. **Fix DXY** (`TVC:DXY`) and **sharpen USDIDR to −1** — free engine-wide correction;
   adds the imported-copper-FX channel the seed currently zeroes out.
3. **Add Brent (insulation) + China IP (grid pulse)** — cheap leaves that are already in
   GLOBAL_CORR; test whether they add forward IC beyond copper or are redundant.
4. **★The high-value structural test — split copper's dual role.** Wire copper *level*
   (the China-grid demand read, +1) **separately** from copper *momentum / Δ* (the cost
   squeeze, −1). If the resolver can express a transform, this **un-cancels** the two
   channels and is the single most promising path from +0.10 toward the +0.14–0.20 band
   (the Metals-steel / cost-pass-through neighbourhood). **Keep only if forward IC rises.**
5. **Wire the `id`-macro demand chain** (electricity-sector loan demand, construction
   loans, RPPI) once the resolver lands — the only genuinely *leading domestic* signals
   the basket lacks. Keep only if additive to the copper/FX set.

**Honest ceiling.** Even fully wired, Electrical Equipment is a **low-β, IDR-domestic,
metal-conversion beta** whose best driver self-partially-cancels. Its realistic forward
IC ceiling is the **modest-skill band (≈ +0.12–0.18)**, not the Coal/AltEnergy +0.23
tier. The achievable win is to **lift it cleanly across the marginal → skill line**
(target placebo pctile > 0.90, IC ≥ +0.12) by un-cancelling copper and fixing the sign
bugs — **and to keep the attribution honest** about the dual role, rather than to
manufacture a top-tier forecaster.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Two resolver edits help the whole engine; the rest is basket-local. The **`id`-macro
resolver** (to read `CEICI…` Banking / Property RICs) is a **shared infrastructure task**
also required by Property / Banks / Cement / Construction — flag it, wire the price/FX
leaves now, add the loan/RPPI leaves when the resolver lands. **Do not fabricate series.**

```python
# --- GLOBAL_CORR edits (apply once; help the whole engine) ---
#   "dxy": "TVC:DXY",                  # FIX: was "TVC:BBDXY" (wk0, EMPTY). TVC:DXY = wk800.
#   "id_lending_rate": "CEIC14419701", # FIX: was None (KPR/consumption lending rate) — used by the demand-chain baskets.
#   "id_loan_demand_power":  "CEICI285015402",  # NEW (needs id-macro plane): electricity-sector new-loan demand survey, n70
#   "id_credit_construction":"CEICI225728402",  # NEW: property/construction loans, n292
#   "id_rppi_18c":           "CEICI500272547",  # NEW: Residential Property Price Index 18 cities, n33
#   "id_gdp_construction":   "CEICI365752057",  # NEW: GDP Construction sub-aggregate, n73
#   (copper, aluminum, brent, cn_ip_yoy, id_10y, id_bi_rate, usdidr already resolve correctly.)
```

```python
"Electrical Equipment": {  # 7 cable makers; SCCO/KBLI low-β core, JECC the mover, CCSI = fibre dissenter.
    # Marginal forward (OOS IC +0.10, placebo 0.83). The edge is COPPER's DUAL ROLE
    # (cost -1 AND electrification-demand +1). LIFT: re-role the mis-tagged trade prints,
    # fix DXY/USDIDR, add insulation + China-IP, and TEST splitting copper level vs Δ.
    "ceic": [("Industrials & Manufacturing", "Electrical Equipment")],
    # Re-role the two mis-tagged monthly trade prints (catalog signs are backwards):
    "ceic_override": [
        ("import: bpm6: non-oil & gas",  "cost",   -1),  # CEICI537025287 — imported equip = input cost / competing supply (was 'demand')
        ("export: bpm6: non-oil & gas",  "demand", +1),  # CEICI536976317 — export value = foreign demand (was 'supply')
    ],
    # Exclude the stale IPI and the near-useless annual establishment/value-added prints.
    "ceic_exclude": [
        ("ipi: manufacturing: electrical equipment", None, None),  # CEICI323568502 — STALE -> 2024-12 (backfill task)
        ("number of establishments",                 None, None),  # annual n14-18, noise
        ("value added",                              None, None),  # annual n14-17, noise
        ("gross output",                             None, None),  # annual n14, noise
    ],
    "globals": [
        ("copper",   "cost",   -1, "COMEX:HG1! ~60-70% of COGS — near-term margin squeeze (LEADS 1-2m). DUAL ROLE: also the China-grid demand read (+1). Net forward sign is mildly +; TEST level(+1)/Δ(-1) split."),
        ("aluminum", "cost",   -1, "COMEX:ALI1! ACSR conductor input + copper-substitution hedge (milder net cost than copper)"),
        ("brent",    "cost",   -1, "PVC/XLPE insulation jacket proxy (~5-10% COGS) — no dedicated resin series"),
    ],
    "macro": [
        ("cn_ip_yoy",            "demand", +1, "aCNIP — China ~55% of copper demand -> grid/electrification pulse (the upstream demand read)"),
        ("id_bi_rate",           "macro",  -1, "BI 7DRR — grid/construction-capex financing root (thin on low-beta industrials; theory leaf)"),
        ("id_10y",               "macro",  -1, "ID 10Y — infra/SOE-capex financing cost (leading yield)"),
        ("id_gdp_construction",  "demand", +1, "GDP: Construction (CEICI365752057) — building-wire demand IS construction (replaces id_gdp_real_q)"),  # needs id-macro plane
        ("id_loan_demand_power", "demand", +1, "electricity-sector new-loan demand survey (CEICI285015402) -> PLN/grid capex -> cable tenders (lead 1-2m)"),  # needs id-macro plane
        ("id_credit_construction","demand",+1, "construction loans (CEICI225728402) -> contractor/grid pipeline -> building wire (lead 2-4m)"),  # needs id-macro plane
        ("usdidr",               "macro",  -1, "imported copper-rod parity in USD dominates the small IKBI export offset (SHARPEN from 0 -> -1)"),
        ("dxy",                  "macro",  -1, "broad USD = EM-flow headwind (FIXED resolver -> TVC:DXY)"),
        ("id_cpi_yoy",           "macro",   0, "inflation regime — no clean sign"),
    ],
},
```

**Notes for the implementer.**
- **Copper is the whole basket — represent its dual role deliberately.** Today it is a
  single `cost −1` leaf and that already delivers +0.10. The **highest-value experiment**
  is to express copper **twice**: *level* as `demand +1` (the China-grid read) and
  *momentum/Δ* as `cost −1` (the squeeze). If the engine has no transform primitive, keep
  the single net leaf and document the dual role — **do not** naively add a second copper
  leaf with the opposite sign on the *same* transform (it would self-cancel to ~0).
- **Re-roling the trade prints is a real catalog sign fix** (import is `demand`-tagged but
  is a *cost*; export is `supply`-tagged but is foreign *demand*). Verify the override
  string-matches the right RICs (`CEICI537025287` / `CEICI536976317`).
- **`dxy → TVC:DXY`, `id_lending_rate → CEIC14419701`, and `usdidr 0 → −1`** are clean,
  free wins (the first two are engine-wide).
- **The `id`-macro plane is a dependency, not a fabrication.** `id_loan_demand_power`,
  `id_credit_construction`, `id_rppi_18c`, `id_gdp_construction` resolve to `CEICI…` RICs
  **no current resolver reads** (DATA_BUGS.md §"ID-macro plane not read"). Wire the
  price/FX leaves (copper, aluminium, brent, China-IP, rates, DXY, the re-roled trade
  prints) **now**; add the four `id`-plane demand leaves in the **same PR as
  Property/Cement** once the resolver lands.
- **CCSI is a fibre/data-cable dissenter** (~6 % cap) — not worth its own branch, but note
  it dilutes the copper read; do not be surprised if the basket's copper IC is capped by it.

**Falsifiable backtest plan (the keep/kill gate).** Run `backtest/bt.py "Electrical
Equipment"` and **keep each change only if forward IC improves or holds at ≥ +0.10 with a
more honest tree**, ablating in this order:
1. **Re-role trade prints + fix DXY + sharpen USDIDR(−1)** — *expected small free lift*;
   confirm the sign-corrected trade prints and the un-bugged FX leaves stop fighting copper.
2. **+ Brent (insulation) + `cn_ip_yoy` (grid pulse)** — confirm each adds forward IC
   beyond copper; **drop either if redundant/collinear** with the copper complex.
3. **★+ copper level/Δ split** (if a transform is available) — *the upside test*: does
   un-cancelling the dual role lift IC toward +0.14–0.18? **Keep only if it rises.**
4. **+ `id`-macro demand chain** (electricity-sector loan demand, construction loans, RPPI;
   once the resolver lands) — does the leading domestic demand chain add beyond copper +
   rates, or is it already priced into copper/yields? **Keep only if additive.**
5. Confirm **`id_gdp_construction`** replacing generic `id_gdp_real_q` holds IC (theory-
   cleaner, should not hurt).

Success criterion: a **copper-dual-role-aware, sign-corrected** tree that lifts Electrical
Equipment across the **marginal → skill** line (target placebo pctile > 0.90, IC ≥ +0.12)
with honest attribution — never a change that only lifts in-sample fit. If the copper
split and the `id`-macro chain prove redundant to the single copper leaf, **revert them
and keep the (still-improved) re-roled + FX-fixed core** — the basket's honest identity is
"a single-driver copper-dual-role beta", and the plan should not pretend otherwise.
