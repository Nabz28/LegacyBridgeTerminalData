# Containers & Packaging (Basic Materials) — Driver Tree

> Sub-industry detail file (framework: `plan/IMPROVEMENT_PLAN.md` §1–§4). Tier-C by
> mcap (108 T, 19th-largest), currently **needs_review / 0 kept drivers**, yet it is
> one of only **12 SKILL baskets** in the blindfolded OOS (**fwd IC +0.09, placebo
> pctile 0.90**). All series cited exist in `catalog/{idind,id,cn,market}.json`; RICs +
> n_obs are real and quoted.
> **Central caveat up front: the variable that actually moves this basket — the
> conversion SPREAD (selling price − resin cost) — has no direct series. Resin (PE/PP/PET)
> has NO price anywhere in the store; the only resin signal is *oil* (Brent/WTI), which is
> the *cost leg only*, not the spread. This file is as much about how to proxy the missing
> resin-margin as about wiring what we have — and about an unusual puzzle: the basket
> already scores SKILL with effectively zero kept drivers, so the job is to find out *why*
> and key the tree so the skill survives, not break it.**

---

## 1. Snapshot — the "SKILL with 0 kept drivers" puzzle

| field | value |
|---|---|
| basket | **Containers & Packaging**, sector Basic Materials, id `basic_materials_containers_packaging` |
| mcap | **108 T** (19th-largest); ~91% concentrated in **one name (IMPC)** |
| members (11) | **IMPC** (Impack Pratama — rigid uPVC roofing/building-plastics, **~90.5% of basket cap**, β 0.43), **PBID** (Panca Budi Idaman — flexible HDPE/LDPE plastic bags & film for FMCG, 3.5 T, β −0.12), **FPNI** (Lotte Chemical Titan / Titan Kimia — PE resin + film, 1.85 T, β 0.05), **TRST** (Trias Sentosa — BOPP/BOPET film + rigid packaging, 1.26 T, β 0.08), **TALF** (Tunas Alfin — printed flexible packaging, 1.06 T, β −0.23), **BRNA** (Berlina — rigid plastic bottles/closures, 0.59 T, β −0.25), **SMKL** (Sampharindo — pharma packaging, 0.49 T, β 0.13), **IGAR** (Champion Pacific / Kageo Igar Jaya — pharma/FMCG rigid packaging, 0.42 T, β −0.02), **YPAS** (Yanaprima — woven PP sacks, 0.40 T, β −0.39), **APLI** (Asiaplast — PVC sheet/film, 0.35 T, β −0.16), **AKPI** (Argha Karya — BOPP/BOPET/CPP flexible film, 0.32 T, β 0.17) |
| current grade | **needs_review** |
| current kept drivers | **0** (BACKTEST.md `kept`=0; `_state.txt` row 19) |
| **current forward OOS skill** | **fwd IC +0.09 · hit−up +0.01 · placebo pctile 0.90 · flag `SKILL`** (n_oos 129) |
| current seed | 3 wired (`brent` cost −1, `steel_hrc` cost −1, `id_gdp_real_q` demand +1) + STD_MACRO |

**The gap, precisely — two layers.**

**(a) Concentration.** The basket is **~91% IMPC**. IMPC is *not* a classic
resin-converter — it makes **rigid uPVC building products** (uPVC roofing sheet, gutters,
PVC ceiling, polycarbonate sheet) sold into **construction/renovation**, with a premium
brand (Alderon) and *fatter, more stable* margins than the thin-margin flexible-film
converters. So the cap-weighted basket is, in economic substance, a **building-products
plastics company with a small flexible-packaging tail**. The "FMCG-volume × resin-spread"
thesis in the brief is exactly right for the *tail* (PBID, TALF, AKPI, TRST, IGAR) but only
*partly* right for the 90% (IMPC), whose demand is **construction/renovation**, not FMCG
offtake. A faithful seed must carry **both** demand channels — FMCG volume *and*
construction/property — and weight the construction channel up to match IMPC's dominance.

**(b) The "SKILL with 0 kept" anomaly.** The engine kept **zero** drivers in-sample, yet
the blindfolded forward IC is **+0.09 at the 90th placebo percentile** — a genuine SKILL
flag. This is not noise; it is the single most important fact about the basket. The most
likely reading: the **theory-anchored a-priori posture** (resin-cost −1 via oil, +construction/
FMCG demand) *does* forecast forward returns even though no single driver was statistically
"kept" by the in-sample selection gate (a thin 3-driver seed gives the gate little to lock
onto, but the *aggregate sign vector* still leans the right way). **The danger is therefore
asymmetric: a rich, mis-signed re-wire could destroy a working +0.09.** The job here is
diagnostic — deepen the tree *in the direction the current posture already leans* (oil-as-resin-cost
−1, construction/FMCG demand +1), add the leading branches that should *strengthen* that
lean, and treat every addition as a keep/kill ablation against the +0.09 line. This is the
rare basket where "do no harm" is the operative instruction.

---

## 2. Economic structure — how this basket makes money

Packaging/converted-plastics economics are a **thin spread on a volume business**:

```
Converter margin ≈  P(sell, converted product)  −  Cost(resin feedstock)  −  conversion/energy
Revenue          ≈  Σ ( ASP[product] × volume[product] )            (volume = customer offtake)
EBITDA           ≈  (ASP − resin_cost) × volume  −  fixed conversion − SG&A
                    └────────── THE SPREAD ──────────┘   ← the swing factor for the 9% tail
```

**Two distinct business models inside one basket:**

- **IMPC (≈90%) — rigid building-products plastics.** uPVC roofing/ceiling, polycarbonate,
  PVC profiles. Resin (PVC) is the input, but IMPC has **brand pricing power (Alderon)** and
  sells into **construction & home-renovation**, so margins are *wider and stickier* and
  demand tracks the **property/construction cycle and household renovation spend**, not FMCG
  consumption. Resin cost still matters (PVC ← ethylene/chlor-alkali ← oil/gas) but the
  spread is *defended by brand*, so the equity is less of a pure margin-taker.
- **The tail (≈9%) — classic thin-margin converters.** PBID (flexible HDPE/LDPE bags for
  FMCG), AKPI/TRST/TALF (BOPP/BOPET film for snack/food wrap), IGAR/SMKL/BRNA (rigid
  bottles/closures for pharma/FMCG), YPAS (woven PP sacks for cement/fertiliser/rice),
  APLI/FPNI (PVC/PE sheet & resin). Here the brief's identity is exact: **volume = FMCG/consumer
  offtake**, **margin = ASP − resin cost**, resin is **60–75% of COGS**, so a swing in resin
  (oil-linked) *dominates* earnings and the equity is a near-pure **inverse-resin-cost play**
  with a volume overlay.

**The cost stack (the swing factor).** Resin = **60–75% of converter COGS**. Resin types:
**PE (HDPE/LDPE), PP (incl. BOPP), PET/BOPET, PVC** — all **oil/gas-derived** (naphtha →
ethylene/propylene → PE/PP; PTA/MEG → PET; ethylene + chlorine → PVC). Indonesia is a **net
resin importer** (TPIA/Chandra Asri supplies part of PE/PP domestically; PET/specialty grades
imported), so resin cost = **global resin price (oil-linked) × USD/IDR**. Secondary inputs:
**energy** (electricity/gas for extrusion/BOPP lines), **aluminium foil & kraft/paper** (for
laminates and paper packaging), **steel/tinplate** (for the small metal-can sleeve), **inks/
adhesives**. The margin swing is **almost entirely resin**, which is why the basket is a
**short-resin / long-volume** trade — and why oil (the only resin signal in store) is the
load-bearing driver.

**What a sell-side analyst actually watches:** **resin prices** (PE/PP/PET CFR SE-Asia,
$/t) and the **resin–oil lag**; **converter spread** (ASP − resin); **USD/IDR** (imported
resin cost + USD debt at AKPI/TRST); **FMCG volume** (Nielsen offtake, food/bev IP); for IMPC
specifically **property/construction starts and renovation demand**; utilisation of BOPP/BOPET
lines (regional oversupply is chronic → spread compression); **plant utilisation**. **None of
the resin-price or spread series exists in our store** — the data gap §7b is honest about.

**Intra-basket dispersion.** This is the defining structural fact: **IMPC alone = 90.5%** of
cap. So the basket return ≈ IMPC return + ~9% converter-tail noise. Two implications:
(1) the **construction/property + renovation demand channel must be weighted up** (it is
IMPC's demand), and the FMCG-volume channel — though textbook-correct for the tail — is a
*minority* driver at the basket level; (2) the **resin-cost (oil) channel is shared by both**
(IMPC's PVC and the tail's PE/PP/PET are all oil-linked), so it is the one driver that is
material across the whole basket — consistent with it being the spine of the +0.09 skill.

---

## 3. DEMAND driver tree

> Convention (matches `mapping.py`): `sign` = sign on the basket's return for a *rise* in
> the driver. `lead` = expected months the driver moves *before* the equities. Liquid
> exogenous price/rate series → forecast candidates; CEIC quantity prints are
> publication-lagged → attribution. ⚠ marks data-gap proxies.

### D1 — Construction / building-products demand (IMPC's channel — the 90%)
```
CONSTRUCTION / RENOVATION demand   (dominant: IMPC = uPVC roofing/ceiling/profiles)
├─ D1a domestic activity backdrop ──► [aIDGDPAR1 ID Real GDP YoY, P3M]  sign +1 · lead 0m · attribution (currently wired)
├─ D1b property/construction cycle ─► [TVC:ID10Y ID 10Y yield, w800]    sign −1 · lead 2-4m · FORECAST (mortgage/build rate-elastic)
│                                     [ECONOMICS:IDINTR BI 7DRR, P1M]   sign −1 · lead 3-6m · policy-rate → construction
├─ D1c household renovation pulse ──► [aIDCONIAR Consumer Confidence, P1M]  sign +1 · lead 1-2m · home-improvement intent
│                                     [aIDCSBYDUBG Buying-durables-conditions, P1M]  sign +1 · lead 1-2m · durables/home-fit-out intent
└─ D1d construction-materials demand ► [CEICI323568102 IPI Non-Metallic Mineral Products, 2010=100, n180 P1M]  sign +1 · lead 0m · cement/building-materials co-cycle (attribution)
```
- **D1b is the forecast candidate for IMPC.** uPVC roofing/ceiling demand is **renovation +
  new-build**, which is **rate-elastic** (mortgage cost, developer financing). The **ID 10Y
  (`TVC:ID10Y`, daily, w800)** and the **BI 7DRR (`ECONOMICS:IDINTR`)** are *liquid/leading*
  and should **lead** the building-products cycle by a quarter or two — a genuine forward
  branch, and one the current seed entirely omits (it only carries GDP, a coincident print).
- **D1c.** Consumer confidence (`aIDCONIAR`) and the **durables-buying-conditions sub-index
  (`aIDCSBYDUBG`)** capture **home-improvement intent** — directly relevant to IMPC's Alderon
  premium-roofing demand. Monthly survey, mildly leading (intent precedes purchase).
- **D1a** GDP is the wired coincident backdrop — keep as attribution, do not over-weight.

### D2 — FMCG / consumer-staples volume (the converter-tail channel — the brief's thesis)
```
FMCG OFFTAKE demand   (the tail: PBID/AKPI/TRST/TALF/IGAR/BRNA — packaging IS bought by FMCG)
├─ D2a food-&-bev consumption ──────► [CEIC322851902 Retail Sales Survey: Real RSI: Food, Beverages & Tobacco, n196 P1M]  sign +1 · lead 0-1m · the literal customer-offtake series
│                                     [aIDRSLSAR Retail Sales YoY, P1M]  sign +1 · lead 0-1m · broad offtake (wired key, unused)
├─ D2b FMCG manufacturing throughput ► [CEICI323566902 IPI Food Products, 2010=100, n180 P1M]  sign +1 · lead 0m · food-maker volume = packaging pull
│                                     [CEICI323567002 IPI Beverages, n180 P1M]   sign +1 · lead 0m · beverage-maker volume
│                                     [CEICI323567102 IPI Tobacco, n180 P1M]     sign +1 · lead 0m · cigarette-pack demand (TALF/AKPI customer)
└─ D2c real income / staples budget ─► [aIDCONIAR Consumer Confidence]  sign +1 · lead 1-2m · staples-volume backdrop
                                       [ECONOMICS:IDIRYY ID CPI YoY]    sign -1 · lead 0m · high inflation erodes real FMCG volume
```
- **D2a is the single best-keyed demand series in the whole tree.** The **Real Retail Sales
  Index: Food, Beverages & Tobacco (`CEIC322851902`, n196, monthly)** is *exactly* the FMCG
  offtake that flexible/rigid packaging wraps. When food/bev/tobacco sell-through rises,
  converters' volume rises 0–1m later. Monthly, publication-lagged → attribution/near-coincident,
  but **on-mechanism** in a way the current seed (headline GDP only) completely misses.
- **D2b.** The monthly **IPI Food / Beverages / Tobacco** indices (each n180) are the
  *production* side of the same customer — packaging is a consumable input to FMCG manufacturing,
  so these move near-coincidentally with packaging demand. Tobacco IPI specifically is the
  customer for TALF/AKPI cigarette-pack film.
- **Honest weight note.** D2 is textbook-correct but addresses the **~9% tail**; at the
  cap-weighted basket level it is a *minority* channel vs D1 (IMPC construction). Wire it, but
  do not let it dominate the construction/resin spine.

### D3 — Export / regional packaging demand (small, USD-linked)
```
EXPORT demand   (AKPI/TRST export BOPP/BOPET film regionally)
├─ D3a regional industrial pulse ───► [aCNIP CN IP YoY, P1M]  sign +1 · lead 1-2m · regional film/packaging offtake
│                                     [aCNPMIMT CN Mfg PMI, P1M]  sign +1 · lead 1-2m · regional demand pulse
└─ D3b ID export volume ────────────► [aIDEXGAR ID Exports YoY, P1M]  sign +1 · lead 0m · incl. converted-plastics exports (attribution)
```
- AKPI and TRST run **BOPP/BOPET lines** with regional export exposure; **China IP/PMI** is
  the marginal regional demand and, being liquid/monthly, **leads** modestly. Secondary channel.

---

## 4. SUPPLY / COST driver tree (the resin leg — the swing factor — and the data gap)

```
COST / SUPPLY   (resin = 60-75% of COGS — handle the SIGN carefully; resin has NO direct series)
├─ S1 resin feedstock ⚠ ────────────► NO RESIN (PE/PP/PET/PVC) PRICE IN STORE.
│      proxy via crude (imperfect)    [ICEEUR:BRN1! Brent, w800]   sign -1 · lead 1-3m · RESIN-COST proxy (oil → naphtha → resin, lagged)  [WIRED]
│                                     [NYMEX:CL1! WTI, w800]       sign -1 · lead 1-3m · corroborant crude
│                                     [NYMEX:RB1! Gasoline, w800]  sign -1 · lead 1-2m · light-distillate (closer to naphtha) feedstock proxy
├─ S2 resin price proxy (equity) ⚠ ─► [LYB LyondellBasell, w800]  sign -1 · lead 0-1m · resin PRODUCER margin: high LYB = expensive resin = converter cost up
│      (resin maker, not converter)   (read INVERSE to the basket: LYB up ⇒ converter squeeze)
├─ S3 energy / conversion cost ─────► [ICEEUR:ATR1! API2 coal, w800]  sign -1 · lead 0-1m · power/steam for extrusion/BOPP lines
│                                     [NYMEX:NG1! Henry Hub, w800]     sign -1 · lead 0-1m · gas feedstock/energy (secondary)
├─ S4 secondary inputs ─────────────► [NYMEX:HRC1! US HRC steel, w800]  sign -1 · lead 1-2m · tinplate/metal-can sleeve (small) [WIRED]
│                                     [ICE:CT1! cotton — N/A] · [aluminium COMEX:ALI1! foil-laminate, w800]  sign -1 · minor
├─ S5 imported-resin FX channel ────► [FX_IDC:USDIDR, w801]  sign -1 · lead 0m · weak IDR ⇒ dearer imported resin/USD debt (see M1)
└─ S6 own / domestic throughput ────► [CEICI323568002 IPI Rubber & Plastics Products, 2010=100, n180 P1M]  sign +1 · lead 0m · the basket's OWN output volume (attribution)
                                       [CEICI359239987 Rubber&plastic gross output, IDR bn, n15 P1Y]  sign +1 · annual, weak (candidate-list series)
```
- **S1 is the crux and the load-bearing driver.** Resin (PE/PP/PET/PVC) is 60–75% of COGS,
  and **there is no resin price in the store** (verified: a regex over all 4,142 market ids for
  resin/PE/PP/PET/PVC/polyeth/propyl/styrene/naphtha/ethylene returns **only** Brent, WTI,
  gasoline, natgas — no polymer or naphtha series). **Oil is the only resin signal**, and the
  causality is clean and *one-directional* for a converter: **oil ↑ → naphtha ↑ → PE/PP/PET
  resin ↑ (1–3m lag) → converter cost ↑ → margin ↓ → equity ↓**, i.e. **sign −1, with a
  genuine 1–3m LEAD** (resin reprices off oil with a lag, and converters' inventory smooths it
  further). This is **fundamentally different from the Chemicals basket**, where oil is *both*
  cost and product, so its net sign is ambiguous. **Here the basket is the resin *buyer*, not
  the resin *maker* — so oil is an unambiguous cost (−1) and the existing wired sign is
  correct.** This is almost certainly the spine of the +0.09 forward skill, and it must be
  *protected*, not demoted.
- **S2 is the resin-price workaround — and it has the *opposite* sign to oil's "demand" usage
  elsewhere.** We hold **`LYB` (LyondellBasell, w800)** — a global **resin/polyolefin
  PRODUCER**. For a resin *producer* a high polyolefin margin is good (LYB up); for our
  *converters* the same expensive resin is a **cost squeeze**. So **LYB must be wired
  INVERSE (−1)** to this basket: LYB-up ⇒ resin dear ⇒ converter margin compressed ⇒ basket
  down. This is the on-mechanism stand-in for the missing resin price — liquid, daily, leading
  — and the mirror image of how `LYB` is (correctly) wired **+1** in the Chemicals seed.
  *Caveat:* it imports global-equity beta (partly circular vs an IDX equity basket); keep
  moderate weight and treat as the resin-cost forward signal, not gospel.
- **S3.** BOPP/BOPET/extrusion are **energy-intensive**; API2 coal (`ICEEUR:ATR1!`) and gas
  proxy the power/steam cost. Secondary but real.
- **S4** (wired `steel_hrc` −1) is the **tinplate/metal-can** input — but **no basket member
  is a metal-can maker** (all are plastics/paper converters). So `steel_hrc` is **near-irrelevant
  at the basket level** and is a candidate to *demote/drop* (it likely contributes nothing,
  consistent with kept=0). Keep available, sign-0, low priority.
- **S6.** Indonesia's own **IPI Rubber & Plastics Products (`CEICI323568002`, monthly, n180)**
  is the basket's own-output throughput — a far better series than the **n14–n15 annual**
  Rubber-&-Plastic candidates the worklist surfaced (`CEICI297618704` etc., P1Y, n14). Those
  annual series are too short/low-frequency to key on; **prefer the monthly IPI**.

---

## 5. MACRO / RATE / FX / FLOW

```
MACRO overlay
├─ M1 USD/IDR ──────────────────────► [FX_IDC:USDIDR, w801]  sign -1 · lead 0m · macro · weak IDR ⇒ dearer imported resin + USD debt (AKPI/TRST) — net COST (importer)
├─ M2 domestic rates / construction ─► [TVC:ID10Y, w800] · [ECONOMICS:IDINTR BI 7DRR]  sign -1 · lead 2-6m · IMPC building-products demand rate-elastic (see D1b)
├─ M3 inflation regime ─────────────► [ECONOMICS:IDIRYY ID CPI YoY, P1M]  sign -1 · lead 0m · high CPI erodes real FMCG volume (D2c)
├─ M4 broad USD (DXY) ──────────────► [TVC:DXY, w800]  sign -1 · lead 0-1m · macro  ⚠ use DXY — BBDXY is EMPTY (w0)
└─ M5 global risk / small-cap beta ─► [SP:SPX] / [IDX:COMPOSITE JCI benchmark — NEVER a driver]  · most members are illiquid small-caps; keep low
```
- **M1 USD/IDR is a clean −1 here, unlike Chemicals.** The basket is a **net resin importer**
  with some USD debt (AKPI/TRST) and **predominantly domestic-IDR revenue** (IMPC sells
  domestically; the tail sells mostly to domestic FMCG). So weak IDR is **dearer imported resin
  + FX loss with little USD-revenue offset** → unambiguous −1. The STD_MACRO default carries
  `usdidr` at sign 0 ("ambiguous"); for *this* basket the importer −1 is the correct prior and
  should be set explicitly. (Contrast Chemicals/Plantation, where USD product revenue makes it
  two-sided/positive.)
- **M2 rates** are the IMPC building-products demand channel (D1b) — the only genuinely
  *leading* macro branch (rates lead construction by a quarter+). Currently the seed has no
  rate driver at all; STD_MACRO's `id_bi_rate` enters at sign 0. Set **−1** to capture the
  construction-demand lead.
- **M4 DXY = −1.** **Data caveat: `TVC:BBDXY` is EMPTY (weekly_obs 0) — `dxy` must resolve to
  `TVC:DXY` (w800).** This is a store-wide resolver bug (`GLOBAL_CORR["dxy"]="TVC:BBDXY"`,
  mapping.py line 55) affecting every basket; flag separately. DXY-up ⇒ EM-flow headwind for
  illiquid small-caps + resin priced in USD.
- **M5.** 10 of 11 members are **micro/small-caps** (β mostly < |0.4|, several negative); the
  basket carries idiosyncratic, low-liquidity noise. Global-risk beta should stay low-weight.

---

## 6. Cross-industry linkages

| borrowed series | from category | role here | why |
|---|---|---|---|
| `ICEEUR:BRN1!` Brent · `NYMEX:CL1!` WTI · `NYMEX:RB1!` gasoline | Energy / Crude | **cost (S1)** | the only resin (PE/PP/PET/PVC)-cost signal — oil → naphtha → resin (1–3m lag) |
| `LYB` LyondellBasell | market / US equities | **cost (S2)** — *INVERSE* | global resin *producer*; high LYB = dear resin = converter cost ↑ ⇒ wire **−1** |
| `ICEEUR:ATR1!` API2 coal · `NYMEX:NG1!` Henry Hub | Energy | **cost (S3)** | power/steam for extrusion/BOPP lines |
| `NYMEX:HRC1!` US HRC steel · `COMEX:ALI1!` aluminium | Basic Materials / Metals | **cost (S4)** — *low/zero weight* | tinplate metal-can + foil-laminate (no member is a can-maker → near-irrelevant) |
| `CEIC322851902` Real RSI: Food, Bev & Tobacco | ID macro / Consumer Surveys | **demand (D2a)** | the literal FMCG-offtake customer of flexible/rigid packaging |
| `CEICI323566902/.567002/.567102` IPI Food/Bev/Tobacco | Industrials / Mfg Prod Index | **demand (D2b)** | FMCG-maker throughput = packaging pull-through |
| `CEICI323568102` IPI Non-Metallic Minerals | Industrials / Mfg Prod Index | **demand (D1d)** | cement/building-materials co-cycle = IMPC construction proxy |
| `CEICI323568002` IPI Rubber & Plastics | Industrials / Mfg Prod Index | **own-supply (S6)** | the basket's own output volume |
| `aCNIP` / `aCNPMIMT` China activity | China macro | **demand (D3a)** | regional BOPP/BOPET film export offtake |
| `TVC:ID10Y` · `ECONOMICS:IDINTR` BI rate | ID macro / rates | **macro (D1b/M2)** | IMPC building-products demand is rate-elastic (the leading branch) |

**Deliberate non-linkage / cautions:** the primary CEIC block per the brief is **Rubber &
Plastic Products**, but its candidate series are **all annual n14–n15** (`CEICI297618704`,
`CEICI359239987`, etc.) — too short and low-frequency to forecast. **Prefer the monthly IPI
series** (`CEICI323568002` and the FMCG IPIs, all n180) from the *Manufacturing Production
Index* block, which the worklist did not surface but which is the same `Industrials &
Manufacturing` category. Do **not** pull a blanket `("Basic Materials", None)` sweep — it would
leak Copper/Gold/Tin/Nickel/Steel/Cement and the **Total Reserves Minus Gold** FX-reserves
series, none of which a packaging converter produces or consumes (the same leak documented in
the Chemicals file).

---

## 7. Currently wired vs available

### 7a. Wired now (the 3-driver seed + STD_MACRO) vs proposed

| driver (now) | role/sign now | verdict | proposed change |
|---|---|---|---|
| `brent` `ICEEUR:BRN1!` | **cost −1** | **KEEP — this is the spine of the +0.09** | confirm; add WTI/gasoline corroborants; this is the resin-cost proxy and the basket is an unambiguous resin *buyer* (−1 correct) |
| `steel_hrc` `NYMEX:HRC1!` | **cost −1** | **DEMOTE → sign 0 / drop** | no member is a metal-can maker; near-irrelevant at basket level (likely contributes to kept=0) |
| `id_gdp_real_q` | **demand +1** | **keep (attribution)** | coincident backdrop; supplement with leading construction & FMCG branches |
| `usdidr` (STD_MACRO) | macro 0 | **re-role to −1** | net importer: dearer imported resin + USD debt, domestic-IDR revenue → clean −1 |
| `id_bi_rate` (STD_MACRO) | macro 0 | **re-role to −1** | IMPC building-products demand is rate-elastic (the leading macro branch) |
| `id_cpi_yoy` (STD_MACRO) | macro 0 | **re-role to −1** | high inflation erodes real FMCG volume |
| `ceic` (none beyond sector fallback) | — | **ADD** | monthly IPI: Rubber&Plastics (own), Food/Bev/Tobacco (demand), Non-Metallic Minerals (construction proxy) |
| *(none)* `LYB` | — | **ADD cost −1 (new resolver, INVERSE)** | resin-producer margin = converter cost; the resin-price workaround |
| *(none)* `TVC:ID10Y` | — | **ADD macro −1** | construction-demand lead (forecast branch) |
| *(none)* `CEIC322851902` Real RSI F&B&T | — | **ADD demand +1** | the literal FMCG-offtake customer series |
| *(none)* `aIDCONIAR` / `aIDRSLSAR` | — | **ADD demand +1** | confidence + retail offtake (wired keys, currently unused) |
| *(none)* `TVC:DXY` | — | **ADD macro −1** | EM-flow + USD-priced resin (and fix the BBDXY-empty bug) |

### 7b. The resin / conversion-SPREAD data gap — concretely

This is the defining problem of the basket, identical in shape to Chemicals but with the
basket on the **opposite side of the resin trade** (buyer, not maker). **There is no PE, PP,
PET, BOPP, PVC, naphtha, ethylene, or propylene price anywhere in `market.json`** (verified by
regex over all 4,142 market ids: only Brent/WTI/gasoline/natgas in the petro-chain; no polymer,
no naphtha, no resin index). The margin that *is* the tail-converters' entire earnings — and a
real cost driver for IMPC's PVC — cannot be observed directly. Options, in order of preference:

1. **PREFERRED — oil as the resin-COST proxy (already wired, KEEP).** Unlike Chemicals, the
   sign is unambiguous: the basket *buys* resin, oil leads resin by 1–3m, so **`brent` cost −1
   with a 1–3m lead** is the honest, on-mechanism prior — and it is almost certainly what is
   generating the forward skill. Add `WTI`/`gasoline` as corroborants (gasoline, a light
   distillate, co-moves with naphtha more tightly than crude).
2. **SECONDARY — `LYB` resin-producer equity, wired INVERSE (−1).** LyondellBasell's stock
   *is* a traded polyolefin margin; for a resin *buyer*, expensive resin (LYB up) is a cost
   squeeze, so it enters **−1**. Liquid, daily, leading — the closest thing to a resin-price
   series we have. *Caveat:* equity beta is partly circular; moderate weight.
3. **PROXY for the missing converter ASP** — none exists; the **IPI Rubber & Plastics
   (`CEICI323568002`)** gives *volume*, not price, and the annual gross-output candidate series
   (`CEICI359239987`) give *value* at too-low frequency to recover a clean ASP. Accept that the
   *spread* itself is unobservable and the engine reconstructs it implicitly from oil (cost)
   minus volume/demand drivers.
4. **REJECT — `steel_hrc` as a packaging cost.** It is the metal-can input, but **no member
   makes metal cans**; it is near-noise here and should be demoted from the current −1.

**Recommendation:** keep oil as the load-bearing resin-cost driver (−1, the skill spine), add
`LYB` (−1) as the resin-price workaround, add the FMCG-offtake (`CEIC322851902`, IPI Food/Bev)
and construction (ID 10Y, IPI Non-Metallic) demand branches, set the importer FX/rate/CPI signs
explicitly, and **ablate every addition against the +0.09 line** — keeping only what holds or
improves forward IC. Accept that, with resin price unobservable, the basket stays **part
forecaster (off oil's resin-cost lead), part explainer**.

---

## 8. Forecastability — why it already scores SKILL, and how to defend it

**Diagnosis (fwd IC +0.09, hit−up +0.01, placebo pctile 0.90, SKILL — with kept=0).** This is
the unusual case: **forward skill without a statistically "kept" driver**. The reading:

- The **a-priori sign posture itself forecasts**, even though the thin 3-driver seed gave the
  in-sample keep-gate too little to lock a single name onto. The spine is **`brent` cost −1**:
  oil is a *genuinely leading* (liquid, daily, exogenous) price that moves resin cost — and
  hence converter margin — with a **1–3m lag**, so the equities reprice *after* oil. That lead
  is exactly the structure the OOS rewards (cf. the broader pattern: "forward skill is
  concentrated in physical-commodity / cost-pass-through baskets"). Packaging is a textbook
  **cost-pass-through** basket, and oil is its leading input → it sits naturally in the SKILL
  cohort alongside Coal, Poultry (feed), Cement (coal), Apparel (cotton/oil).
- The **contemporaneous-vs-forward distinction** here is favourable: oil *leads* the margin,
  so the forward IC is real (not just co-movement). This is the opposite of the financials/
  sentiment baskets that co-move contemporaneously but mean-revert.
- The danger is **over-fitting the re-wire**: the current edge is fragile (kept=0 means it
  rests on the aggregate sign vector, not a robust selected driver). Adding many CEIC quantity
  prints (publication-lagged, coincident) could *dilute* the oil lead and *lower* the +0.09.

**Which branches should LEAD (and by how much):**
- **`brent`/`WTI`/`gasoline` (resin cost, −1, lead 1–3m)** — the forecast spine. Resin reprices
  off oil with a lag; converter inventory smooths further → 1–3m is realistic.
- **`LYB` (resin-producer, −1, lead 0–1m)** — leading resin-price proxy; global price discovery
  precedes Jakarta.
- **`TVC:ID10Y` / BI rate (construction demand, −1, lead 2–6m)** — rates lead IMPC's
  building-products demand by a quarter+; a *second* forward branch the current seed lacks.
- **FMCG/IPI/RSI demand prints (+1, lead 0–1m)** — publication-lagged → **attribution**, not
  forecast; they deepen the explanation of the 9% tail but should be *moderate weight*.

**The path to defending/improving forward skill (testable, do-no-harm ordering):**
1. **Protect the spine.** Confirm `brent` −1 survives; add `WTI`/`gasoline` corroborants. Expect
   the +0.09 to hold or firm.
2. **Demote the dead weight.** Set `steel_hrc` → 0/drop (no metal-can member). Expect kept-count
   to rise from 0 and IC to hold (removing a near-noise driver).
3. **Add the second forward branch** — `TVC:ID10Y` −1 (construction-demand lead). Test whether
   it adds *forward* IC beyond the oil spine.
4. **Add `LYB` −1** resin-proxy and the FMCG demand prints (`CEIC322851902`, IPI Food/Bev,
   `aIDCONIAR`/`aIDRSLSAR`). Expect these to lift *contemporaneous* (attribution) more than
   forward; keep only those that don't dilute the +0.09.
5. **Set the importer macro signs** (`usdidr` −1, `id_bi_rate` −1, `id_cpi_yoy` −1) and fix
   the DXY-empty bug.

**Honest expectation.** This basket is **already a modest forecaster** off the oil→resin-cost
lead — a real, defensible +0.09. The realistic target is to **deepen the tree without breaking
the spine**, lifting forward IC toward **+0.10–0.13** by adding the rate→construction lead and
the resin-equity proxy, while the FMCG/IPI branches improve attribution. The honest concession:
**with no resin (PE/PP/PET/PVC) price in the store, the conversion spread is unobservable; the
basket forecasts via oil's *cost* lead and rates' *demand* lead, and explains the rest — it is
not a clean spread-forecaster.** Ingesting a CFR-SE-Asia PE/PP/PET resin price (or even a naphtha
price) is the single data change that would convert it from a cost-lead forecaster into a true
margin-forecaster.

---

## 9. Engine-wiring spec — concrete `mapping.py`

Replace the current `"Containers & Packaging"` seed with the resin-cost-keyed tree below.
**New `GLOBAL_CORR` keys must be added first** (the resin-producer equity proxy and the DXY
fix); confirm each id resolves in `correlation.sqlite` / catalogs at build time (catalog shows
`LYB` w800, `TVC:DXY` w800). The monthly IPI / RSI CEIC series are pulled via `ceic` categories
+ `ceic_override` (lowercase substring match on indicator description, per the Chemicals
precedent).

```python
# --- add to GLOBAL_CORR (resin-producer proxy + DXY fix) ---
#   "resin_lyb":  "LYB",        # LyondellBasell — resin/polyolefin PRODUCER margin (wired INVERSE: dear resin = converter cost)
#   "wti":        "NYMEX:CL1!"  # (already present) crude corroborant
#   "gasoline":   "NYMEX:RB1!"  # (already present) light-distillate ~ naphtha proxy
#   "dxy":        "TVC:DXY",    # FIX: BBDXY is empty (w0) -> use TVC:DXY (w800)  [store-wide bug]

"Containers & Packaging": {  # ~90% IMPC (rigid uPVC building products) + thin-margin
                             # flexible/rigid converter tail. Driver = resin cost
                             # (oil-linked, the basket BUYS resin) + construction (IMPC)
                             # & FMCG (tail) volume. Resin price unobservable -> proxy by oil.
                             # NB: scores SKILL (+0.09) with kept=0 today -> DO NO HARM:
                             # deepen in the direction of the existing oil-cost / demand lean.
    "ceic": [("Industrials & Manufacturing", "Manufacturing Production Index"),  # monthly IPI block (n180)
             ("Industrials & Manufacturing", "Rubber & Plastic Products")],      # primary block (annual n14 — weak, attribution)
    "ceic_override": [
        ("rubber and plastics products", "supply", +1),   # CEICI323568002 own output (IPI, monthly)
        ("food products", "demand", +1),                  # CEICI323566902 FMCG-maker throughput
        ("beverages", "demand", +1),                      # CEICI323567002 beverage-maker throughput
        ("tobacco", "demand", +1),                        # CEICI323567102 cigarette-pack demand
        ("non- metallic mineral", "demand", +1),          # CEICI323568102 construction co-cycle (IMPC proxy)
    ],
    # off-theme CEIC series to exclude even if a category pull surfaces them:
    "ceic_exclude": ["total reserves", "copper", "gold", "tin", "nickel",
                     "cement sales", "basic metals"],
    "globals": [
        # --- THE RESIN-COST SPINE (oil = the only resin signal; basket BUYS resin -> -1) ---
        ("brent",     "cost", -1, "resin (PE/PP/PET/PVC) cost proxy: oil -> naphtha -> resin, 1-3m lag [SKILL spine]"),
        ("wti",       "cost", -1, "crude corroborant"),
        ("gasoline",  "cost", -1, "light-distillate ~ naphtha feedstock proxy"),
        # --- resin-PRICE workaround: resin PRODUCER equity, wired INVERSE ---
        ("resin_lyb", "cost", -1, "LyondellBasell resin-maker margin = converter cost (dear resin -> margin squeeze)"),
        # --- energy / conversion ---
        ("wb_coal_au","cost", -1, "power/steam for extrusion/BOPP lines (API2)"),
        # steel_hrc DEMOTED: no metal-can member -> sign 0 / dropped (was a near-noise -1)
    ],
    "macro": [
        ("id_10y",     "macro", -1, "IMPC building-products demand rate-elastic (construction lead, 2-6m)"),
        ("id_bi_rate", "macro", -1, "policy rate -> construction/renovation demand"),
        ("usdidr",     "macro", -1, "net resin importer: dearer imported resin + USD debt, domestic-IDR revenue"),
        ("id_cpi_yoy", "macro", -1, "high inflation erodes real FMCG volume"),
        ("dxy",        "macro", -1, "broad USD: EM small-cap flow headwind + USD-priced resin (FIX BBDXY->DXY)"),
        ("id_gdp_real_q",       "demand", +1, "domestic activity backdrop (coincident attribution)"),
        ("id_consumer_confidence","demand", +1, "renovation + FMCG-staples intent (aIDCONIAR)"),
        ("id_retail",  "demand", +1, "consumer offtake (aIDRSLSAR)"),
    ],
},
```

**Notes for the implementer.**
- `resin_lyb` is a **new `GLOBAL_CORR` key** resolving to **`LYB`** — add and verify it resolves
  before the seed references it. It is wired **−1 (inverse)** here, the mirror of its **+1** in
  the Chemicals seed (resin maker vs resin buyer). If multi-name blending is wanted, `SLGN`/`AMCR`/
  `SEE`/`PKG`/`IP` (all w729–800, all global packaging-CONVERTER peers) could be added **+1** as
  a converter-equity beta proxy — but they import equity beta and are *lower* priority than the
  oil spine; test before adding.
- **`dxy` must be remapped `TVC:BBDXY` → `TVC:DXY`** (BBDXY empty, w0) — a store-wide resolver
  bug affecting every basket using `dxy`; flag separately.
- **`steel_hrc` is demoted/dropped** — no basket member is a metal-can maker; the current −1 is
  near-noise and a likely contributor to kept=0.
- **Prefer the monthly IPI series** (`CEICI323568002`, `…566902`, `…567002`, `…567102`,
  `…568102`, all n180 P1M) over the **annual n14–n15** Rubber-&-Plastic candidate series — the
  annual series are too short/low-frequency to key on (attribution only).
- The new demand branches (`CEIC322851902` Real RSI Food/Bev/Tobacco, the IPIs, confidence/retail)
  are **publication-lagged → attribution**; keep moderate weight so they do not dilute the oil
  forward lead.

**What to backtest (the keep/kill gate — DO NO HARM is paramount here).** Run
`backtest/bt.py "Containers & Packaging"` and KEEP the change only if forward IC **holds or
rises from +0.09** (this basket is already SKILL — a regression below +0.08 means revert).
Ablations, in order:
1. **Protect the spine** — confirm `brent` −1 (+ `wti`/`gasoline`) reproduces ≈+0.09; this is
   the existing edge. If it doesn't, stop and diagnose before touching anything else.
2. **Demote `steel_hrc`** (→0/drop) — expect kept-count to rise off 0 and IC to hold (removing
   near-noise). 
3. **+ construction lead** (`id_10y` −1, `id_bi_rate` −1) — does the rate→construction branch add
   *forward* IC beyond the oil spine? (IMPC is 90% — this should be the second real forward branch.)
4. **+ resin proxy `resin_lyb` −1** — does the resin-producer equity add forward IC, or just
   contemporaneous? Keep only if forward holds and circularity is acceptable.
5. **+ FMCG/IPI demand prints + importer macro signs** — expect these to lift *contemporaneous*
   (attribution) more than forward; keep those that don't pull forward IC below +0.08.

The success criterion is honest and conservative: **this basket already forecasts (+0.09) off
oil's resin-cost lead — the win is to deepen the tree (add the rate→construction demand lead and
the resin-equity proxy, fix the importer FX/rate signs and the DXY bug, drop the irrelevant
steel input) without breaking a working SKILL.** Without a real resin/naphtha price in the store,
it remains a cost-lead forecaster plus an explainer — not a clean conversion-spread forecaster.
