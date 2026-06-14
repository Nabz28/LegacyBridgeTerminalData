# Durables (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_durables` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #45). Every RIC below is confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
> **Primary CEIC block (as wired today) = `Consumer Discretionary` (whole category) —
> which is WRONG: in `idind` that category is 100% Auto/Motorcycle/Textile and contains
> ZERO furniture/wood/houseware series. The basket's real block lives under
> `Industrials & Manufacturing → {Furniture Mfg, Wood & Cork, Manufacturing Production
> Index}`.** This file's central finding is that mis-pointing.
>
> **One-line thesis: this is NOT a coherent "consumer durables" basket and NOT the
> auto/discretionary basket the seed maps it to. It is a thin (~5T), heterogeneous,
> low-beta small-cap mix of (a) a single dominant EXPORT furniture maker (WOOD/Integra,
> ~32% of mcap, sells wooden furniture to the US — a US-housing/renovation + USD play),
> (b) domestic furniture/houseware makers (CINT/Chitose office furniture, KICI enamel/
> houseware, LMPI paint+consumer, GEMA building-material distribution), and (c) a tail of
> mis-bucketed non-durables names the IDX "Durables" label swept in (LIVE pet-shops, BIKE
> bicycles, UNTD heavy-equipment dealer, SCNP pet/animal-health, MICE office-services,
> CBMF cosmetics-ODM, TOYS toys). The economic engine that *should* drive the durable-
> goods core is product price × volume = (domestic housing/renovation + furniture-buying
> intent + big-ticket credit) on the demand side and (timber/lumber + steel + foam-resin/
> oil + USD imported inputs) on the cost side, with the export sleeve (WOOD) keyed to
> US housing/retail. But three structural facts cap it: (1) the CEIC pull is pointed at
> AUTOS, so none of the right furniture/wood/houseware series are even loaded; (2) the
> basket is heterogeneous — domestic furniture, an export furniture name, and a tail of
> non-durables that no single macro posture fits, which is exactly why the IC is 0.00; (3)
> the durable-goods demand reads that DO exist (durable-goods buying confidence, household-
> equipment retail sales, furniture IPI) are slow monthly CEIC quantity prints that are
> coincident/publication-lagged → attribution, not forecast. The HONEST verdict: today
> this is an explainer/beta basket with NO forward skill (fwd IC +0.002, placebo pctile
> 0.40 — below the median null). The realistic lever is NOT to manufacture forecast skill
> from slow domestic quantity prints, but to (i) FIX the auto mis-pointing so the engine at
> least attributes to the right industry, and (ii) wire the two genuinely LEADING exogenous
> price channels that touch the durable-goods core — US housing/homebuilder demand
> (`AMEX:XHB`/`HOUST`, for the WOOD export sleeve) and the lumber/steel input stack
> (`CME:LBR1!`/`NYMEX:HRC1!`) — and concede that the heterogeneous non-durables tail is an
> irreducible cap. If the housing-cycle-lag or USD/export channel produces a positive
> forward IC after the fix, the basket becomes a modest housing-and-input-cost beta; if not,
> the honest label is "heterogeneous small-cap attribution basket, no forward edge".**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Durables**, sector *Consumer Cyclicals*, id `consumer_cyclicals_durables` |
| mcap | **~5.05T** (capsule #45 lists 5T), benchmark JCI — one of the smallest baskets in the universe |
| n_names | **12** real members |
| Members (what each does) | **WOOD** (`IDX:WOOD`, **1.63T, β 0.32**) — Integra Indocabinet: integrated **wooden-furniture & component manufacturer and EXPORTER** (bulk of sales to US/Europe retail; the basket's anchor and only genuine large-cap). **LIVE** (`IDX:LIVE`, 1.01T, β 0.81) — Hewan Peliharaan Indonesia (Pet Kingdom): **pet-shop/pet-supplies retailer** — *not a durable good*; highest-β name, sweeps consumer-retail beta in. **BIKE** (`IDX:BIKE`, 0.66T, β 0.34) — Terang Dunia Internusa (United Bike): **bicycle manufacturer** (United/Genio brands) — a discretionary durable, metal+rubber input. **UNTD** (`IDX:UNTD`, 0.49T, β 0.13) — United Tractors-adjacent? No — **PT Trimitra Trans Persada / heavy-equipment & vehicle dealer**; near-zero β, industrial not consumer-durable. **SCNP** (`IDX:SCNP`, 0.35T, β 0.35) — Selaras Citra Nusantara Perkasa: **pet food / animal-health consumer products** — *non-durable*, mis-bucketed. **MICE** (`IDX:MICE`, 0.29T, β 0.28) — Multi Indocitra: distribution of **baby/mother-care + office** consumer products. **CINT** (`IDX:CINT`, 0.17T, β 0.07) — Chitose Internasional: **office & institutional FURNITURE** (chairs/tables) — a core domestic durable, near-zero β. **LMPI** (`IDX:LMPI`, 0.15T, β 0.23) — Langgeng Makmur Industri: **paint, plastic houseware, aluminium goods** — domestic durable/houseware. **GEMA** (`IDX:GEMA`, 0.14T, β 0.19) — Gema Grahasarana (Vivere): **interior/furniture fit-out & building-material distribution** — durable, project-cycle linked. **CBMF** (`IDX:CBMF`, 0.09T, β null) — Cahaya Bintang Medan: **furniture (panel/RTA furniture) manufacturer**. **KICI** (`IDX:KICI`, 0.06T, **β 0.91**) — Kedaung Indah Can: **enamelware / kitchen houseware** (cans, glass, enamel) — small but high-β. **TOYS** (`IDX:TOYS`, 0.01T, β 0.34) — Sunindo Adipersada: **soft-toy / stuffed-toy manufacturer & EXPORTER** — tiny, export-linked. |
| Effective concentration | **WOOD alone ≈ 32% of mcap; WOOD + LIVE ≈ 52%.** The "true durable-goods core" — furniture/houseware makers WOOD (export), CINT, LMPI, GEMA, CBMF, KICI + bicycle BIKE + toy TOYS — is ~**73%** of mcap, but it splits into an **EXPORT sleeve (WOOD ~32%, TOYS ~0.2% — US/EU demand + USD)** and a **DOMESTIC sleeve (CINT/LMPI/GEMA/CBMF/KICI/BIKE ~41% — housing/renovation + local income)** that respond to *opposite-signed* FX and *different* demand drivers. The remaining ~27% (LIVE pet-retail, UNTD equipment dealer, SCNP pet-food, MICE/CBMF-cosmetics distribution) are **not durable goods at all** and inject orthogonal consumer-retail / industrial-dealer beta. Betas are incoherent and low: KICI 0.91 and LIVE 0.81 vs CINT 0.07, UNTD 0.13, GEMA 0.19, plus a **null** (CBMF). The equal-weight engine basket therefore averages an export-furniture play, a domestic-furniture/houseware play, a bicycle/toy play, and a non-durable retail/dealer tail — **with no single coherent business and a thin, illiquid float**. |
| Current grade | **partial / needs_review** (engine in-sample confidence: **low**) |
| Current kept-driver count | **12** (`_state.txt` line 46: `45|Durables|Consumer Cyclicals|5|partial|12|none|0.002`) |
| Current forward OOS | **NONE — fwd IC +0.002** (≈0.00), hit−up **+0.02**, placebo pctile **0.40**, n_oos **129** (BACKTEST.md line 55: `Durables … partial low 129 +0.00 +0.02 0.40 none`). The placebo percentile **0.40 is below the median (0.50) null** — the driver posture does **not even beat a coin-flip control**, i.e. the current 12-driver fit carries *no* forward information. This is the diagnostic signature of a basket whose drivers are (a) pointed at the wrong industry (autos) and (b) averaged across incoherent legs. |

**Current seed (`mapping.py` → `SEED["Durables"]`):**
```python
"Durables": {
    "ceic": [("Consumer Discretionary", None)],          # ← WHOLE Consumer Discretionary category
    "globals": [("steel_hrc", "cost", -1, "metal input"),
                ("aluminum", "cost", -1, "metal input")],
    "macro": [("id_10y", "macro", -1, "durables financing rate-elastic"),
              ("id_bi_rate", "macro", -1, "policy rate"),
              ("id_gdp_real_q", "demand", +1, "household durables"),
              ("usdidr", "macro", -1, "imported durable goods")],
}
```

**The gap (five problems).**
1. **The CEIC pull is MIS-POINTED to autos — the single biggest bug.** `("Consumer Discretionary", None)` pulls the *whole* `Consumer Discretionary` idind category, which is **100% Auto Sales (45), Auto Production (28), Motorcycles & Retail Trade (14), Motorcycle Sales/Prod (2), Textile & Apparel (12)** — and contains **ZERO furniture, wood, or houseware series** (verified: there is no Furniture subcategory under Consumer Discretionary). So the engine is "explaining" a furniture/houseware/toy basket with **car and motorcycle sales/production**. The worklist's 101 `ceic_candidates` are *all* auto/motorcycle/textile prints. The right block — **Furniture Mfg (11 series), Wood & Cork (11), and the monthly IPI: Furniture / IPI: Wood (under Manufacturing Production Index)** — lives under category **`Industrials & Manufacturing`** and is **entirely invisible to the current pull**. This alone is enough to explain IC 0.00.
2. **The domestic durable-goods DEMAND channel is completely unwired.** The seed has only `id_gdp_real_q` (+1) as demand. But there exist **purpose-built durable-goods reads** in the `id` macro inventory, none mapped: **Consumer Confidence: Present Situation: Durable Goods `CEIC277372902` (Point, P1M, n196)** — the literal "is now a good time to buy durables" read; **Retail Sales Survey: Real Retail Sales Index: Other Household Equipment `CEIC322852202` (2010=100, P1M, n196)** — direct domestic furniture/houseware sell-through; **IPI: Furniture `CEIC323568902` (n180)** and **IPI: Wood `CEIC323567502` (n180)** — the production read. These are the basket's actual demand spine and not one is in the seed.
3. **The EXPORT sleeve (WOOD, ~32% of mcap, US-furniture exporter) has no demand proxy and the WRONG FX sign.** WOOD/Integra and TOYS earn USD exporting wooden furniture / soft-toys to US retail — their demand is **US housing/renovation + US retail**, and a weak IDR **helps** their margin (sign **+1**). The seed wires `usdidr` at **−1** ("imported durable goods") — correct for the *domestic* importer sleeve (KICI/LMPI import inputs) but **backwards for the 32%-mcap export anchor**. There is no US-housing or US-retail demand proxy wired at all. The cleanest leading reads — **US homebuilders `AMEX:XHB` / `AMEX:ITB` (wk=800), US Housing Starts `HOUST` (wk=797), US Real Retail Sales `RRSFS` (wk=797)** — are all populated in the market store but **absent from `GLOBAL_CORR`** → unreachable.
4. **The input-cost stack is half-built.** Furniture's true inputs are **timber/lumber, steel (for office/metal furniture, bicycles), and foam/resin (oil-derived upholstery/plastic) + USD on imported components**. The seed has `steel_hrc` (−1) and `aluminum` (−1) but is **missing lumber** — and `GLOBAL_CORR["wb_logs"] = "CME:LBR1!"` (Lumber, wk=196) is **populated and unused**. Foam/resin has no clean future → proxy via Brent/oil (cost −1).
5. **The known DXY resolver bug is latent here too.** Although `dxy` is not in the current seed, any flow/risk branch added later must use `TVC:DXY` (wk=800) — `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **EMPTY (weekly_obs 0)** (the same bug flagged across Retail/Telco/Apparel files).

This file rebuilds the tree as: a **domestic housing/renovation + durable-goods-buying-intent + big-ticket-credit demand spine** (the right CEIC furniture block, re-pointed off autos), an **export sleeve** keyed to **US housing/retail (WOOD/TOYS, sign-flipped FX)**, a **timber + steel + foam-resin/oil + USD-import cost stack** (adding the missing lumber), a **rate/credit macro branch** (durables are big-ticket, credit-elastic), and an explicit, honest **heterogeneous-non-durables-tail concession** that caps coherence.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (split by sleeve — this basket has three distinct P&Ls):**

```
DOMESTIC FURNITURE / HOUSEWARE leg (CINT, LMPI, GEMA, CBMF, KICI, BIKE ≈ 41% mcap):
  Revenue   = units sold × IDR price        (units ← housing completions/renovation + income + big-ticket credit)
  Gross prof= Revenue − timber/board − steel/aluminium − foam/resin − labour − imported components(USD)
  Margin    = price-pass-through vs the timber+steel+foam input stack  ←── the domestic swing factor
              (weak IDR HURTS via imported inputs/components → usdidr -1 for this leg)

EXPORT FURNITURE / TOY leg (WOOD ≈ 32% mcap, TOYS ≈ 0.2%):
  Revenue   = export order volume × USD price-per-unit   (orders ← US housing/renovation + US retail demand)
  Gross prof= Revenue − timber/board COGS(IDR) − labour − conversion
  Margin    = USD revenue vs (largely IDR) cost base     ←── weak IDR EXPANDS margin (exporter → usdidr +1)
              + lumber cost is the key COGS line; US housing cycle is the demand lead

NON-DURABLE TAIL (LIVE pet-retail 20%, UNTD equip-dealer 10%, SCNP pet-food 7%, MICE distribution 6% ≈ 27%):
  Revenue   ≈ consumer-retail / industrial-dealer volumes; driven by household spend / capex, NOT durable-goods drivers.
```

Six structural facts drive the modelling:

1. **The basket is a SUM of opposite-signed sleeves, which is why a single posture gives IC ≈ 0.** The domestic furniture/houseware leg (41%) wants **weak-IDR = bad** (imported inputs/components, sign −1) and is driven by **domestic housing + income**. The export leg (32%, WOOD/TOYS) wants **weak-IDR = good** (USD revenue, sign +1) and is driven by **US housing/retail**. The non-durable tail (27%) responds to neither. **A single `usdidr` sign cannot be right for the whole basket** — this is the structural reason the equal-weight return barely correlates with any macro driver and the IC sits at 0.00. The best the engine can do is split the FX channel by sleeve (impossible at the basket level) or accept that FX nets to noise here.

2. **Durables are BIG-TICKET and CREDIT-ELASTIC — rates are a genuine demand driver, not just a discount rate.** Furniture, bicycles, and houseware are deferrable, financeable purchases. When rates rise, households delay big-ticket durable purchases and consumer-financing volume falls — so **`id_bi_rate` / `id_10y` (−1)** act on *demand*, not only on the equity discount rate. This is the seed's one correct economic instinct (it has `id_10y −1` and `id_bi_rate −1`), and it is the channel most likely to carry *some* signal — but it is shared with every other consumer-cyclical basket, so it is beta, not edge.

3. **Durable demand LAGS the housing cycle (the "follow home purchases" mechanism).** Furniture and houseware are bought *after* a home is purchased or renovated — the canonical durable-goods lag. So **property/housing demand leads durable demand by ~1–3 quarters**: mortgage/housing-loan growth → home completions → move-in/renovation → furniture & houseware purchase. The cross-ref is **Property (#7)**: its mortgage-loan-growth and RPPI series are leading indicators for *this* basket. ⚠ But the cleanest ID housing-loan read here, **`aIDLOBHH` (housing mortgage outstanding)**, has **`n_obs: None`** in the catalog (spark-only, not loadable) — so the domestic housing-lead must come from the **Property basket's wired series** or be conceded as a gap (see §6).

4. **The export sleeve's demand is the US housing/renovation cycle — a genuinely LEADING, liquid, exogenous read.** WOOD exports wooden furniture to US retailers (RH, Williams-Sonoma-type channels) whose orders track **US new-home sales, housing starts, and home-improvement retail**. **US homebuilders `AMEX:XHB`/`ITB` (wk=800), Housing Starts `HOUST` (wk=797), US Real Retail Sales `RRSFS` (wk=797)** lead WOOD's order book by ~1–2 quarters and are daily/weekly liquid prices. **This is the one branch with real forecast potential** — but it only touches the 32% WOOD sleeve, so its basket-level IC is diluted by the other 68%.

5. **The cost stack is timber + steel + foam-resin/oil + imported components (USD) — and lumber is missing today.** Timber/board (`CME:LBR1!` Lumber, wk=196) is the primary COGS for WOOD/CINT/CBMF; steel/aluminium (`NYMEX:HRC1!`/`COMEX:ALI1!`) for office-metal furniture, bicycles (BIKE), and enamel/houseware (KICI); foam/resin (oil-derived, proxy `ICEEUR:BRN1!`) for upholstery/plastic houseware (LMPI); and **USD on imported hardware/components/machinery** (the importer-sleeve −1 FX channel). The seed has steel+aluminium but **omits lumber** — the single most furniture-specific input.

6. **Intra-basket heterogeneity is the binding constraint, not data scarcity.** The right CEIC furniture/wood/houseware series DO exist (durable-goods CCI n196, HH-equipment retail n196, IPI furniture/wood n180, furniture export n111). The problem is that even with the perfect domestic furniture demand+cost tree, **the basket still contains a pet-retailer, an equipment dealer, a pet-food maker, and a distribution company** whose returns are orthogonal to every furniture driver. No `mapping.py` change can fix membership; the realistic ceiling is "the furniture-core attribution is right, but the tail caps forward IC".

**What a sell-side analyst actually watches:** for the **domestic** furniture/houseware names — **household-equipment retail sales, durable-goods buying confidence, residential property completions/renovation activity, big-ticket consumer-financing volume, minimum-wage/real-income trajectory, and the timber+steel+foam input stack vs price pass-through**; for the **export** anchor (WOOD) — **US new-home sales/housing starts, US home-improvement retail, the lumber price, USD/IDR, and freight**. Of these, only **US housing/retail, lumber, steel, oil, and USD/IDR are high-frequency leading prices**; the ID durable-goods CCI / retail / IPI / furniture-export series are monthly, publication-lagged, and coincident.

---

## 3. DEMAND driver tree

> Demand = **domestic housing/renovation + durable-goods buying intent + big-ticket credit** (the 41% domestic furniture/houseware sleeve) + **US housing/retail order-pull** (the 32% WOOD/TOYS export sleeve). The genuinely *leading* demand read is the **US housing cycle** (`AMEX:XHB`/`HOUST`, weekly, leads WOOD orders ~1–2 quarters) and, with a lag, the **domestic housing cycle** (Property cross-ref). The ID durable-goods CCI / household-equipment retail / furniture IPI series are the right *content* but are monthly, publication-lagged, coincident → attribution. ⚠ The US-housing proxies are **not in `GLOBAL_CORR`** → need new resolver keys (§9); the domestic housing-loan lead (`aIDLOBHH`) is **n_obs None / unloadable** → use the Property basket's wired series or concede.

```
DEMAND (domestic housing/income/credit  +  US-housing export order-pull)
├── D1 DOMESTIC DURABLE-GOODS BUYING INTENT — the literal "good time to buy durables" read ★ NEW
│     ├─ CCI Present: Durable Goods ·· CEIC277372902 [id-macro, Point, P1M, n196] sign +1, lag ~1-2m ★the purpose-built durables read
│     ├─ CCI Expectations: Income 6m · CEIC277373102 [id-macro, Point, P1M, n196] sign +1, lag ~1-3m (forward income → big-ticket willingness)
│     ├─ CCI Present: Current Income · CEIC277372802 [id-macro, Point, P1M, n196] sign +1 (real-income proxy for discretionary durables)
│     └─ Consumer Confidence (hdr) ··· CEIC277372502 [id-macro, Point, P1M, n196] / aIDCONIAR resolver sign +1 (broad willingness-to-spend)
│        mechanism: durables are deferrable/financeable — the BI consumer survey directly asks "is now a good time to buy durable
│        goods" (CEIC277372902) and "expected income 6m ahead" (…373102). These are the cleanest domestic-demand leads. Monthly,
│        publication-lagged ~3-4 wks → coincident-to-slightly-leading; attribution-leaning. ⚠ aIDCSBYDUBG (buying-durables sub-index)
│        exists but n_obs=None (spark-only) → use the CEIC277372902 deep print (n196) instead.
├── D2 DOMESTIC HOUSEHOLD-EQUIPMENT SELL-THROUGH — direct furniture/houseware retail volume ★ NEW
│     ├─ Retail: Other HH Equipment ·· CEIC322852202 [id-macro, 2010=100, P1M, n196] sign +1, lag ~1m ★direct domestic durables sell-through
│     └─ id_retail (broad) ··········· aIDRSLSAR "Retail Sales YoY" [id-macro, %, P1M] sign +1 — coarse total-retail backdrop
│        mechanism: the BI Retail Sales Survey breaks out "Other Household Equipment" — the single best monthly read on domestic
│        furniture/houseware demand. n196, deep history. Publication-lagged → coincident; good for attribution.
├── D3 HOUSING / PROPERTY CYCLE — the LAG that durables follow (domestic move-in/renovation) ★ NEW (cross-ref Property #7)
│     ├─ Housing mortgage outstanding  aIDLOBHH [id-macro, IDR bn, P1M, n=None ⚠UNLOADABLE] sign +1, lag ~2-3q (home purchase → furnish)
│     ├─ RPPI / mortgage-loan growth ·· (Property #7 wired series) sign +1, lag ~2-4q ★the canonical durable-goods lag
│     └─ Building-material distribution GEMA/LMPI revenue proxy ── via id_bank_credit (construction/property loans) sign +1
│        mechanism: furniture & houseware are bought AFTER a home purchase/renovation — property demand LEADS durable demand by
│        ~2-4 quarters. This is the theoretically strongest domestic lead, BUT the cleanest ID read (aIDLOBHH) is n_obs=None →
│        unloadable. Realise this lead via the PROPERTY basket's already-wired mortgage/RPPI series (cross-industry borrow, §6),
│        or concede the domestic-housing-lead is a data gap and rely on D1/D2 + the US-housing lead (D4).
├── D4 US HOUSING / RETAIL — the EXPORT order-pull for WOOD/TOYS (THE leading demand read) ★ NEW
│     ├─ US Homebuilders (SPDR) ······ AMEX:XHB [market, wk=800] sign +1, lag ~1-2q ★US new-home/renovation → US furniture demand
│     ├─ US Home Construction ········ AMEX:ITB [market, wk=800] sign +1, lag ~1-2q (alt/cross-check to XHB)
│     ├─ US Housing Starts ··········· HOUST    [us-macro, wk=797] sign +1, lag ~1-2q (physical housing pipeline → furnish demand)
│     └─ US Real Retail Sales ········ RRSFS    [us-macro, wk=797] sign +1, lag ~1-2q (US home-improvement/furniture retail sell-through)
│        mechanism: WOOD/Integra exports wooden furniture to US retail; orders track US new-home sales, housing starts and
│        home-improvement retail, placed ~1-2 quarters ahead of shipment. These are LIQUID, WEEKLY, EXOGENOUS, LEADING prices →
│        the basket's only genuine forecast candidates. ⚠ touch only the ~32% WOOD sleeve → basket-level IC diluted by the other 68%.
│        ⚠ none in GLOBAL_CORR → unreachable without new resolver keys (§9).
├── D5 BIG-TICKET CONSUMER CREDIT — durables are financed (rate-elastic demand) ─► financing availability
│     ├─ Consumption credit ·········· CEIC230931602 "Commercial Banks: Credit: Consumption" [id-macro, IDR bn?, P1M, n279] sign +1, lag ~1-2m
│     ├─ Loans by use: Consumption ···· CEIC481151407 [id-macro, P1M, n139] sign +1 (alt consumption-loan read)
│     └─ id_bank_credit (system) ······ aIDLONYAR "Bank Credit YoY" [id-macro, %, P1M] sign +1 — broad credit pulse (CURRENT SEED absent)
│        mechanism: furniture/bicycle/houseware purchases are often financed; rising consumption credit = more big-ticket durable
│        demand. n279 deep history. Publication-lagged → coincident. Pairs with the rate channel (M-branch) as the credit transmission.
└── D6 BROAD DOMESTIC ACTIVITY (the seed's only demand leaf) ─► household backdrop
      └─ id_gdp_real_q ················ aIDGDPAR1 [demand, %, P3M] sign +1 — CURRENT SEED; coarse quarterly backdrop (keep, but thin signal)
```

**Forecast hypothesis (demand): the only genuinely leading demand read is the US housing cycle (D4) for the WOOD export sleeve; the domestic reads (D1/D2/D5) are coincident attribution and the strongest domestic lead (D3 housing) is a data gap.**
WOOD (~32% mcap) is a US-furniture exporter, so **US homebuilders/housing-starts (D4, weekly, leading) genuinely LEAD its order book by ~1–2 quarters** — the one place forward skill could live, exactly the "liquid exogenous price leads the equity" pattern IMPROVEMENT_PLAN §3 rewards. The domestic durable-goods buying-intent (D1, CEIC277372902) and household-equipment retail (D2, CEIC322852202) are the right *content* but monthly, publication-lagged, and coincident → **attribution, not forecast**. The theoretically strongest domestic lead — **the housing cycle (D3), which durables follow with a ~2–4 quarter lag** — is crippled by data: `aIDLOBHH` is unloadable (n_obs None), so it must be borrowed from the Property basket or conceded. Net: **anchor the forecast attempt on D4 (US housing, for WOOD); use D1/D2/D5 as domestic attribution; flag D3 as the right-but-broken lead.**

---

## 4. SUPPLY / COST driver tree

> The cost stack is **timber/lumber (primary furniture COGS) + steel/aluminium (office-metal furniture, bicycles, enamel houseware) + foam-resin/oil (upholstery, plastic houseware) + imported components/hardware (USD)**. The genuinely leading, exogenous cost prices are **lumber, steel, aluminium, and oil** — all liquid market futures, three already in the seed; **lumber is the furniture-specific one that is MISSING.** "Supply" in the production sense (furniture/wood IPI, gross output) is the previously-invisible Industrials → Furniture/Wood block.

```
SUPPLY / COST (timber + steel + aluminium + foam-resin/oil + USD imports + output)
├── C1 TIMBER / LUMBER — the PRIMARY furniture COGS (the swing factor for WOOD/CINT/CBMF) ★ NEW (MISSING in seed)
│     └─ Lumber ····················· wb_logs → CME:LBR1! [market, wk=196] sign −1, lag ~1-2m ★the single most furniture-specific input
│        mechanism: wooden furniture (WOOD/Integra, CINT, CBMF) is timber/board-intensive; higher lumber = direct COGS squeeze
│        unless passed through. CME:LBR1! is populated (wk=196 — shorter than steel's 800 but usable). The seed OMITS this — the
│        most important furniture cost leaf is absent today. ⚠ wb_logs is the GLOBAL_CORR alias → CME:LBR1! (confirmed populated).
├── C2 STEEL / ALUMINIUM — office-metal furniture, bicycles (BIKE), enamel/houseware (KICI) ★ (in seed)
│     ├─ HRC steel ·················· steel_hrc → NYMEX:HRC1! [market, wk=800] sign −1, lag ~1-2m  CURRENT SEED
│     └─ Aluminium ················· aluminum → COMEX:ALI1! [market, wk=621] sign −1, lag ~1-2m  CURRENT SEED
│        mechanism: metal-frame furniture, bicycle frames, aluminium houseware (LMPI), enamelware (KICI) are steel/aluminium-input.
│        Liquid, leading futures — keep. ⚠ relevant to only part of the basket (metal-goods leg) → expect a noisy, partial −.
├── C3 FOAM / RESIN / PLASTIC — upholstery foam + plastic houseware (oil-derived) ★ NEW (proxy)
│     └─ Brent (oil proxy) ·········· brent → ICEEUR:BRN1! [market, wk=800] sign −1, lag ~1-2m  (polyurethane foam, PP/PVC houseware ← oil)
│        mechanism: upholstery foam (polyurethane) and plastic houseware (LMPI) are oil-derivatives. NO clean foam/resin/PU future
│        exists in the store (searched: none) → Brent is the honest, liquid, leading proxy for the foam/plastic cost line. Partial −.
├── C4 IMPORTED COMPONENTS / HARDWARE (USD) — the importer-sleeve cost (KICI/LMPI/BIKE) ─► FX on inputs
│     └─ usdidr (import-cost channel) usdidr → FX_IDC:USDIDR [market, wk=801] sign −1 FOR THE DOMESTIC LEG (see §5 — net-ambiguous basket)
│        mechanism: domestic furniture/houseware/bicycle makers import hardware, fittings, machinery, components priced in USD →
│        weak IDR RAISES their input cost (−1). This is the seed's `usdidr −1` rationale — correct for the importer leg, WRONG for
│        the WOOD/TOYS exporter leg (+1). The two net toward zero at the basket level (see §5 M1).
└── C5 OUTPUT / CAPACITY — the previously-invisible Industrials → Furniture/Wood block (production read) ★ NEW BLOCK
      ├─ IPI: Furniture ············· CEIC323568902 [supply, 2010=100, P1M, n180] sign +1 (higher furniture output = healthier sector)
      ├─ IPI: Wood & Cork ··········· CEIC323567502 [supply, 2010=100, P1M, n180] sign +1 (upstream wood-products output)
      ├─ Furniture BoP export (BI) ·· CEICI536976467 [→demand, USD th, P1M, n111] sign +1 ★the EXPORT order-book read (WOOD/TOYS)
      ├─ Prompt Mfg Index: Furniture  CEICI506661657 [supply, %, P3M, n15] sign +1 (forward activity; SHORT history)
      ├─ PMI: Wood & Cork ··········· CEICI506661567 [supply, %, P3M, n15] sign +1 (SHORT history)
      └─ Furniture GDP (quarterly) ·· CEICI365765387 [demand, IDR bn, P3M, n73] sign +1 (sector value-add; coincident)
         ⚠ caveat: IPI/GDP are monthly-to-quarterly, publication-lagged, coincident-to-lagging → ATTRIBUTION not forecast. The
         Furniture BoP EXPORT print (CEICI536976467, n111) is the right EXPORT order content but lagged ~5-6 wks → coincident.
         This whole block lives under category `Industrials & Manufacturing` (Furniture Mfg / Wood & Cork / Manufacturing Production
         Index) → the current `("Consumer Discretionary", None)` pull MISSES ALL OF IT.
```

**Forecast hypothesis (supply/cost): the cost side that matters is the timber + steel + oil input stack — all leading prices, and the engine's realistic edge if any exists. Lumber is the furniture-specific addition the seed omits.**
For a furniture/houseware complex the decisive cost is **lumber (C1, −1)** — the most furniture-specific input and **MISSING from the seed today**; plus **steel/aluminium (C2, −1, in seed)** for the metal-goods leg and **oil/Brent (C3, −1)** for foam/plastic. These are liquid, daily/weekly, exogenous, leading prices — the only cost channel with a chance of carrying forward information (cost-pass-through pattern, IMPROVEMENT_PLAN §3). But each touches only part of the basket (lumber → wooden-furniture leg; steel → metal leg; oil → plastic/foam leg), so expect **noisy, partial −** signs reconciled empirically. The CEIC furniture/wood IPI + export block (C5) is the right *content* finally pointed at the correct industry, but monthly/quarterly and coincident → **attribution only**. **Net cost forecast candidates: `wb_logs`/lumber (−1, primary, NEW), `steel_hrc`/`aluminum` (−1, keep), `brent` (−1, foam/plastic proxy, NEW); the IPI/export block is attribution.**

---

## 5. MACRO / RATE / FX / FLOW

> For a **heterogeneous, low-beta, credit-elastic durable-goods** basket, the systematic core is **the rate/credit channel (big-ticket demand, −1) + a FX channel that NETS TO NOISE because the basket is half-importer/half-exporter**. The rate channel is the seed's one correct instinct and the most likely (if weak) source of beta; the FX channel is the basket's defining ambiguity.

```
MACRO / RATE / FX / FLOW
├── M1 FX — the SPLIT/NETTING channel (importer −1 vs exporter +1 → basket ≈ 0) ⚠ THE KEY AMBIGUITY
│     └─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [market, wk=801] sign 0 (NET) — CURRENT SEED has −1 (importer-only view)
│        mechanism: DOMESTIC leg (CINT/LMPI/KICI/BIKE ~41%) imports components/hardware → weak IDR HURTS (−1). EXPORT leg
│        (WOOD/TOYS ~32%) earns USD → weak IDR HELPS (+1). At the equal-weight basket level these NET toward ~0. The seed's −1 is
│        the importer-only view and is WRONG for the 32% WOOD anchor. ★Recommend sign 0 (let stats decide) OR split-sleeve concession.
│        This netting is a primary reason the basket IC is ~0.00 — no single FX sign fits.
├── M2 RATES — BIG-TICKET / CREDIT-ELASTIC DEMAND (the seed's correct instinct) ★ sign −1 on DEMAND
│     ├─ id_bi_rate ················· ECONOMICS:IDINTR [macro, %, P1M, wk=186] sign −1, lag ~1-3m  CURRENT SEED; policy rate → financing cost
│     └─ id_10y ····················· TVC:ID10Y [market, %, wk=798] sign −1, lag ~0-1m  CURRENT SEED; mortgage/consumer-loan benchmark
│        mechanism: durables are deferrable & financed — higher rates DELAY big-ticket furniture/bicycle purchases AND raise the
│        equity discount rate (double −1). This is a genuine DEMAND channel (not just discount rate) and the most likely source of
│        whatever modest beta the basket has. Shared with all consumer-cyclicals → beta, not edge. Keep both (id_10y leads, daily).
├── M3 INFLATION / REAL INCOME — discretionary squeeze on big-ticket durables ─► purchasing power
│     ├─ id_cpi_yoy ················· ECONOMICS:IDIRYY [macro, %, P1M] sign −1 (inflation squeezes deferrable durable spend)
│     └─ CPI: Household Equipment ··· CEIC521347907 [id-macro, 2022=100, P1M, n41] sign +/− (own-category price: demand − / revenue +; ambiguous)
│        mechanism: high inflation erodes real income → households defer durables (−1). The household-equipment CPI is the basket's
│        OWN output price (revenue +) vs a demand headwind (−) → ambiguous; SHORT history (n41). Treat id_cpi_yoy as the clean read.
└── M4 EM RISK / FLOW — thin-float, illiquid small-caps (risk-off sensitivity) ─► global appetite
      └─ dxy ························· dxy → TVC:DXY [market, wk=800] sign ? — DUAL: strong USD helps WOOD translation (+) but EM
            risk-off hits illiquid small-caps (−). Net weak/ambiguous → reconcile empirically. ⚠ RESOLVER BUG: GLOBAL_CORR["dxy"]
            ="TVC:BBDXY" is EMPTY (wk=0) → use TVC:DXY (wk=800). Same bug as Apparel/Retail/Telco. Low weight / attribution only.
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
US-housing(XHB/HOUST) + lumber + ID-rates/credit  ──►  WOOD export orders + domestic big-ticket demand + furniture COGS  ──►  furniture revenue & margin  ──►  basket
  (market/us-macro, weekly, LEADING)                    (CEIC furniture export/IPI + durables CCI, monthly, lagged)          (quarterly earnings, illiquid)     (the 12 equities, heterogeneous)
```
The engine should lean on the **leading exogenous prices (US homebuilders for the WOOD export order book, lumber/steel/oil for the input stack, ID 10Y for the rate-elastic demand)** to anticipate the slow CEIC furniture prints — the "liquid price leads the equity" pattern IMPROVEMENT_PLAN §3 rewards. **But the basket-level dilution (only ~32% is the export sleeve the US-housing lead touches; FX nets to noise) is why even a correct tree may not lift the IC much above 0.**

**Forecast hypothesis (macro): the rate/credit channel (M2, −1) is the most likely source of modest beta; the FX channel (M1) NETS to noise and should be neutralised, not signed −1.**
`id_10y`/`id_bi_rate` (−1) is the seed's correct instinct — big-ticket durables are rate-elastic on *demand*, and the daily 10Y leads. This is shared consumer-cyclical beta, not edge, but it is real. The FX channel (M1) is the basket's defining ambiguity: importer −1 vs exporter +1 → **recommend `usdidr` sign 0** (let the stats reconcile) rather than the seed's importer-only −1, which is wrong for the 32% WOOD anchor. DXY (M4) is dual-signed and low-weight. **Net: keep the rate channel, neutralise FX, and accept that none of these will produce strong forward skill on a half-importer/half-exporter heterogeneous basket.**

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Property & Real Estate** (#7) — *the durable-goods LAG* | Property basket's wired mortgage-loan-growth / RPPI series (e.g. RPPI 18-city, KPR/mortgage growth); ID `aIDLOBHH` housing mortgage (⚠ **n_obs None — unloadable**) | demand +1, lag ~2-4q | **The defining cross-link:** furniture & houseware are bought AFTER a home purchase/renovation, so domestic property demand LEADS this basket by ~2-4 quarters. The cleanest ID read (`aIDLOBHH`) is unloadable → realise the lead by borrowing the **Property basket's already-wired mortgage/RPPI series**, or concede the domestic-housing-lead as a data gap. |
| **US Housing / Homebuilders (external demand)** | `AMEX:XHB` SPDR Homebuilders, `AMEX:ITB` US Home Construction (wk=800), `HOUST` US Housing Starts, `RRSFS` US Real Retail Sales (wk=797) | demand +1, lag ~1-2q | The **WOOD/TOYS export order book = US housing/renovation demand**. Borrow US-housing/retail market proxies as the leading export-pull read. ⚠ none in GLOBAL_CORR → new resolver keys (§9). The cleanest "what we COULD add" and the only genuine forecast candidate. |
| **Basic Materials → timber/lumber** | `wb_logs` → `CME:LBR1!` (Lumber, wk=196) | cost −1 | The primary furniture COGS — borrowed from the commodity complex. **Populated but UNUSED in the current seed** (the most furniture-specific input is missing). |
| **Basic Materials → Steel/Metals** (#35/#4) | `steel_hrc` NYMEX:HRC1! (wk=800); `aluminum` COMEX:ALI1! (wk=621) | cost −1 | Office-metal furniture, bicycle frames (BIKE), enamel/aluminium houseware (KICI/LMPI). In seed — keep. |
| **Energy / Oil & Gas** (#16) | `brent` ICEEUR:BRN1! (wk=800) | cost −1 | Upholstery foam (polyurethane) + plastic houseware (LMPI) are oil-derivatives; no clean foam/resin/PU future exists → Brent is the honest proxy. NEW. |
| **Banks / Multifinance** (#1/#30) — *big-ticket financing* | Consumption credit `CEIC230931602` (n279); Loans-by-use: Consumption `CEIC481151407` (n139); system credit `aIDLONYAR` | demand +1 | Durables are financed — consumer-financing volume is a demand transmission. Borrow the consumption-credit prints from the Banking block. |
| **Consumer Cyclicals → Retail** (#21) — *contaminant overlap* | (no series) | — | LIVE (pet-retail), MICE (distribution) behave like Retail #21, not durables; a membership artifact that injects retail beta. Disclose, do not wire. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **CEIC industry pull** | `("Consumer Discretionary", None)` ⚠ **= 100% AUTO/MOTORCYCLE/TEXTILE, ZERO furniture** | **re-point** to `("Industrials & Manufacturing","Furniture Mfg")` + `("…","Wood & Cork")` + the IPI Furniture/Wood prints | **P0 — fix the mis-pointing; this is the root cause of IC 0.00** |
| **Domestic durable-goods buying intent** | **none** | **CCI Present: Durable Goods** `CEIC277372902` (+1, n196); CCI Expected Income `CEIC277373102` (+1, n196); Current Income `CEIC277372802` (+1) — via new resolver keys | **P1 — the basket's purpose-built demand read, entirely missing** |
| **Domestic HH-equipment retail** | **none** | **Retail: Other HH Equipment** `CEIC322852202` (+1, n196) — new resolver key | **P1 — direct domestic furniture/houseware sell-through** |
| **Domestic housing-cycle LEAD** | **none** | Property #7 mortgage/RPPI cross-ref (+1, lag 2-4q); `aIDLOBHH` ⚠ **n_obs None → unloadable** | **P2 — the right lead, but data-gapped; borrow Property or concede** |
| **US housing/retail export-pull** | **none** | **`AMEX:XHB`/`AMEX:ITB`/`HOUST`/`RRSFS`** (+1, leading, for WOOD/TOYS) — **new GLOBAL_CORR keys** | **P1 — the only genuine forecast candidate, entirely missing** |
| **Big-ticket consumer credit** | **none** | Consumption credit `CEIC230931602` (+1, n279); `id_bank_credit`/`aIDLONYAR` (+1) | **P2 — financing transmission for big-ticket durables** |
| **Timber / lumber cost** | **none** ⚠ (the key furniture input is absent) | **`wb_logs` → `CME:LBR1!`** (−1, wk=196) — populated and unused | **P0 — add the most furniture-specific cost leaf** |
| **Steel / aluminium cost** | `steel_hrc` −1 ✓, `aluminum` −1 ✓ | keep (metal-furniture/bicycle/houseware leg) — allow empirical partial − | P1 — keep |
| **Foam / resin / plastic cost** | **none** | **`brent`** (−1, oil proxy for foam/plastic houseware) | P2 — add as oil-proxy |
| **Furniture IPI / export output** | **none** (different category — pull misses it) | IPI Furniture `CEIC323568902` (+1, n180); IPI Wood `CEIC323567502` (+1); **Furniture BoP export** `CEICI536976467` (→demand +1, n111); PMI Furniture/Wood (short) | **P2 — attribution depth, finally on the right industry** |
| **FX** | `usdidr` **−1** (importer-only view) | **change to sign 0 (NET)** — basket is half-importer (−1) / half-exporter (WOOD +1) → no single sign is right | **P0 — neutralise the wrong-for-32% sign** |
| **Rates / credit (big-ticket demand)** | `id_10y` −1 ✓, `id_bi_rate` −1 ✓ | keep — the seed's correct instinct (rate-elastic durables); add credit (D5) | P1 — keep |
| **Inflation / real income** | **none** | `id_cpi_yoy` (−1, discretionary squeeze) | P2 |
| **EM risk / flow** | none | `dxy` (after resolver fix to TVC:DXY) — dual-signed, low weight | P3 (test; ambiguous) |
| **Non-durable tail (LIVE/UNTD/SCNP/MICE)** | none | **no wireable fix** — pet-retail / equipment-dealer / pet-food are not durables; membership artifact | n/a |

**Three concrete problems with the current setup:** (a) **the CEIC pull is pointed at AUTOS** — `("Consumer Discretionary", None)` in `idind` is 100% Auto/Motorcycle/Textile and has **no furniture subcategory at all**, so the engine explains a furniture/houseware/toy basket with car/motorcycle sales — the root cause of the 0.00 IC, and the whole furniture/wood/houseware data block (which exists, richly, under `Industrials & Manufacturing`) is invisible. (b) **`usdidr` is signed −1 (importer-only)** while the 32%-mcap anchor (WOOD) is a USD *exporter* (+1) — the two sleeves NET to noise, so −1 is wrong for a third of the basket and the FX channel should be neutralised. (c) **the most furniture-specific cost input — lumber (`CME:LBR1!`, populated, wk=196) — is missing** while less-relevant steel/aluminium are wired. Also note the latent **`dxy → TVC:BBDXY` empty-resolver bug** (use `TVC:DXY`), the **`aIDLOBHH` housing-loan series being unloadable (n_obs None)** which gaps the domestic housing lead, and the **heterogeneous non-durables tail (LIVE/UNTD/SCNP/MICE ≈ 27%)** that no furniture driver can fit (membership artifact).

---

## 8. Forecastability verdict

**The basket is an EXPLAINER/BETA basket with NO forward skill today (fwd IC +0.002, placebo pctile 0.40 — below the median null), and the honest expectation is that it stays that way even after the fixes, because two of its three structural problems are irreducible. Problem one — the CEIC mis-pointing to autos — IS fixable and MUST be fixed (it is the proximate cause of the 0.00 IC). Problems two and three — the half-importer/half-exporter FX netting and the heterogeneous non-durables tail — are membership/structure artifacts that no `mapping.py` change can remove. The single lever with genuine forecast potential is the US-housing export-pull (XHB/HOUST) for the WOOD sleeve, but it touches only ~32% of mcap, so its basket-level IC is diluted. The realistic post-fix verdict is "a modest housing-and-input-cost beta if the US-housing/lumber channel survives the backtest; otherwise a heterogeneous small-cap attribution basket with no forward edge".**

Reasoning:

- **Why it does NOT forecast today (placebo pctile 0.40, below the median null):** the 12 kept drivers are (a) pointed at the **wrong industry** (auto sales/production explaining a furniture basket — pure noise w.r.t. the equities), and (b) averaged across **opposite-signed, incoherent sleeves** (an export-furniture +FX play, a domestic-furniture −FX play, and a non-durable retail/dealer tail). The result is a driver posture that carries *less* forward information than a coin-flip control. This is the worst kind of basket for the equal-weight, single-sign engine: heterogeneous membership + a mis-pointed data pull.

- **Why a fix might produce MODEST skill — and where it would come from:** the one branch with real forecast potential is the **US housing cycle (D4: `AMEX:XHB`/`HOUST`/`RRSFS`) leading the WOOD export order book by ~1–2 quarters** — liquid, weekly, exogenous prices anticipating a slow, illiquid exporter, exactly IMPROVEMENT_PLAN §3's winning "physical/external-price leads the equity" profile. The **lumber + steel + oil cost stack (C1–C3)** adds a leading cost-pass-through channel. And the **rate-elastic big-ticket demand (M2: `id_10y` −1)** is genuine shared beta. If these survive the backtest, the basket becomes a modest **housing-and-input-cost beta**.

- **Why even the fix is capped (the honest concession):** (1) **the US-housing lead touches only ~32% (WOOD)** of mcap — the other 68% (domestic furniture, bicycle, toy, and the non-durable tail) dilutes it; (2) **the FX channel nets to noise** (importer −1 vs exporter +1) — it cannot contribute clean signal at the basket level; (3) **the ~27% non-durable tail (LIVE pet-retail, UNTD equipment-dealer, SCNP pet-food, MICE distribution) is orthogonal** to every furniture driver and cannot be removed in `mapping.py` (membership is upstream); (4) **the strongest domestic lead — the housing cycle — is data-gapped** (`aIDLOBHH` unloadable), so the domestic side is reduced to coincident attribution. The realistic ceiling is "modest beta", not "skill".

**What would lift it from none → modest-beta (and what would confirm it):**
1. **FIX the CEIC mis-pointing (P0, mandatory):** re-point from `("Consumer Discretionary", None)` to the **Industrials → Furniture Mfg / Wood & Cork + IPI Furniture/Wood** block. **Hypothesis: even with no new globals, attributing to the right industry removes the auto-noise and moves the placebo percentile above 0.50.** The foundational test.
2. **Add the US-housing export-pull (the big one):** `+us_housing` (`AMEX:XHB`/`HOUST` +1). **Hypothesis: the US-housing lead carries a positive forward IC on the WOOD sleeve and is the highest-value addition — but basket-diluted to ~32%.**
3. **Add lumber (`wb_logs`/`CME:LBR1!` −1)** — the missing furniture-specific cost; confirm it helps or is neutral.
4. **Neutralise FX (`usdidr` −1 → 0)** — verify the empirical sign is indeed ~0 (importer/exporter netting); if it comes out cleanly − or +, one sleeve is dominating and the basket can be re-labelled accordingly.
5. **Add domestic demand attribution (D1/D2 durable-goods CCI + HH-equipment retail)** — these will not forecast (coincident) but make the attribution honest.
**Verdict: keep the basket labelled a *heterogeneous small-cap durables-and-housing beta with no current forward skill*. After fixing the auto mis-pointing and wiring the US-housing + lumber channel, if forward IC turns positive and clears the 0.50 placebo median, promote to "modest housing-and-input-cost beta"; if it holds ~0.00, the honest verdict is "attribution-only, no forward edge — capped by FX-netting and a non-durable membership tail". The one outcome that would justify deeper work: if the WOOD-sleeve US-housing signal is strong enough to dominate despite the 32% weight, consider that this basket is really a US-housing-furniture-exporter proxy wearing a Consumer-Cyclicals label.**

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Durables"]`:**
```python
"Durables": {  # ~32% EXPORT wooden-furniture anchor (WOOD/Integra -> US retail; USD +1) + ~41% DOMESTIC
    # furniture/houseware (CINT office furniture, LMPI paint/houseware, GEMA fit-out, CBMF panel furniture,
    # KICI enamelware, BIKE bicycles; import inputs -> USD -1) + a ~27% NON-DURABLE tail mis-bucketed by the
    # IDX label (LIVE pet-retail, UNTD equip-dealer, SCNP pet-food, MICE distribution). NOT the auto basket the
    # old "Consumer Discretionary" pull mapped it to (that category is 100% auto/motorcycle/textile, ZERO furniture).
    # No forward skill today (fwd IC +0.002, placebo 0.40); the root cause is the auto mis-pointing + FX-netting
    # + heterogeneous tail. Fix the pull first; the only genuine forecast candidate is the US-housing lead on WOOD.
    "ceic": [("Industrials & Manufacturing", "Furniture Mfg"),    # ★ the real block (was invisible)
             ("Industrials & Manufacturing", "Wood & Cork"),       # upstream wood-products
             ("Industrials & Manufacturing", "Manufacturing Production Index")],  # IPI Furniture/Wood lives here
    # Re-role: the Furniture BoP EXPORT print is the order-book DEMAND read (CEIC tags it "supply"); the IPI
    # prints are coincident attribution (+1). The Manufacturing Production Index category is broad -> exclude the
    # non-furniture IPI lines so the pull stays furniture/wood-specific.
    "ceic_override": [("furniture: bop export", "demand", +1),     # WOOD/TOYS export order book
                      ("manufacturing: furniture", "supply", +1),  # IPI Furniture (attribution)
                      ("wood and prod of woods", "supply", +1)],   # IPI Wood (attribution)
    "ceic_exclude": ["motor vehicle", "auto", "sedan", "truck", "bus", "motorcycle",  # belt-and-braces vs auto bleed
                     "textile", "apparel",                                            # vs textile bleed
                     "chemicals", "basic metals", "pharmaceutic", "beverages", "food products",
                     "electrical equipment", "machinery", "computers", "paper", "tobacco"],  # other IPI lines
    "globals": [
        ("wb_logs",    "cost", -1, "PRIMARY furniture input: TIMBER/LUMBER (CME:LBR1!) - the most furniture-specific cost (was MISSING)"),
        ("steel_hrc",  "cost", -1, "metal-furniture / bicycle (BIKE) / enamel-houseware (KICI) steel input"),
        ("aluminum",   "cost", -1, "aluminium houseware (LMPI) / metal-frame furniture input"),
        ("brent",      "cost", -1, "foam/resin proxy: polyurethane upholstery foam + plastic houseware (LMPI) <- oil"),
        # NEW: US-housing export-pull for the WOOD/TOYS exporter sleeve (the only genuine forecast candidate) --
        ("us_housing", "demand", +1, "US homebuilders/housing-starts -> US furniture demand -> WOOD export orders (leads ~1-2q)"),  # NEW resolver
    ],
    "macro": [
        # -- FX: NET sign 0 (basket is half-importer -1 / half-exporter WOOD +1) -- do NOT keep the seed's -1 --
        ("usdidr", "macro", 0, "NET: domestic leg imports inputs (-1) vs WOOD/TOYS export USD revenue (+1) -> ~cancels"),
        # -- rate-elastic BIG-TICKET demand (the seed's correct instinct) + credit transmission --
        ("id_10y",     "macro",  -1, "big-ticket durables are rate-elastic: higher 10Y delays furniture/bicycle purchase (demand) + discount rate"),
        ("id_bi_rate", "macro",  -1, "policy/financing rate -> consumer-credit cost for big-ticket durables"),
        ("id_bank_credit", "demand", +1, "consumption-credit availability finances big-ticket durable purchases"),
        # -- domestic durable-goods DEMAND attribution (coincident; the right content, finally) --
        ("id_durables_cci", "demand", +1, "CCI Present: Durable Goods - the purpose-built 'good time to buy durables' read"),  # NEW resolver
        ("id_hh_equip_retail", "demand", +1, "Retail Sales: Other Household Equipment - direct domestic furniture/houseware sell-through"),  # NEW resolver
        ("id_gdp_real_q", "demand", +1, "broad domestic activity backdrop (CURRENT SEED; coarse)"),
        ("id_cpi_yoy",    "demand", -1, "inflation/real-income squeeze on deferrable big-ticket durables"),
    ],
}
```

**Resolvers — what works, the bugs, and the new keys to add in `GLOBAL_CORR`:**
- **Already work (no change):** `steel_hrc → NYMEX:HRC1!` (wk=800), `aluminum → COMEX:ALI1!` (wk=621), `brent → ICEEUR:BRN1!` (wk=800), `usdidr → FX_IDC:USDIDR` (wk=801), `id_10y → TVC:ID10Y` (wk=798), `id_bi_rate → ECONOMICS:IDINTR` (wk=186), `id_bank_credit → aIDLONYAR`, `id_gdp_real_q → aIDGDPAR1`, `id_cpi_yoy → ECONOMICS:IDIRYY`.
- **Already mapped but UNUSED — just reference it:** `wb_logs → CME:LBR1!` (Lumber, wk=196) is in `GLOBAL_CORR` and populated — the seed simply never used it. Add the leaf (no resolver change needed).
- **Bug to FIX (latent):** `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **EMPTY (wk=0)** → remap to **`"TVC:DXY"`** (wk=800) if a DXY/flow leaf is added later (same bug flagged in Apparel/Retail/Telco).
- **Data GAP to concede:** `aIDLOBHH` (housing mortgage outstanding — the domestic durable-goods LEAD) has **n_obs None / unloadable** → realise the domestic housing-lead via the **Property #7 wired mortgage/RPPI series (cross-industry borrow)** or concede it; do not wire `aIDLOBHH` directly.
- **NEW resolver keys to add** (the durable-goods demand + US-housing export-pull, currently unreachable):
  ```python
  "us_housing":          "AMEX:XHB",       # SPDR Homebuilders, wk=800 (US housing/renovation -> WOOD export demand)
  #  (alt/cross-check: "AMEX:ITB" US Home Construction wk=800, "HOUST" Housing Starts wk=797, "RRSFS" US Real Retail wk=797)
  "id_durables_cci":     "CEIC277372902",  # CCI Present Situation: Durable Goods, P1M, n196 (purpose-built durables read)
  "id_hh_equip_retail":  "CEIC322852202",  # Retail Sales: Other Household Equipment, 2010=100, P1M, n196 (sell-through)
  ```
  ⚠ Confirm the `id`-macro RICs (`CEIC277372902`, `CEIC322852202`) and the market RICs (`AMEX:XHB`) are loadable by `_global_history` (they resolve through correlation.sqlite, same path as existing CEIC/market resolvers) before relying on them; if a CEIC `id`-macro ric is not in correlation.sqlite, fall back to the populated market proxy (`AMEX:XHB`/`HOUST`/`RRSFS` for the US-housing demand lead, confirmed wk≈800/797).

**What to backtest (`backtest/bt.py "Durables"`), keep only if forward IC improves/holds (current +0.002, placebo 0.40):**
1. **Re-point the CEIC pull (the foundational fix):** old `("Consumer Discretionary", None)` vs new Furniture/Wood/IPI block. **Hypothesis: removing the auto-noise and attributing to the right industry moves the placebo percentile above 0.50 (above the median null) — the minimum bar for "not anti-informative".** This is the make-or-break test; nothing else matters if the pull stays on autos.
2. **US-housing export-pull add (the upside test):** current vs +`us_housing` (AMEX:XHB +1). **Hypothesis: the US-housing lead carries a positive forward IC on the WOOD sleeve; the question is whether the ~32% weight is enough to lift the basket-level IC.** The single best chance at forward skill.
3. **Lumber add:** confirm `wb_logs` (−1, the missing furniture input) helps or is neutral; reconcile the empirical sign (partial − expected — touches only the wooden-furniture leg).
4. **FX-sign test:** verify `usdidr` empirical sign is ~**0** (importer/exporter netting). **If it comes out cleanly − or +, one sleeve dominates** → re-label (clean − = domestic-importer basket; clean + = WOOD-export-proxy basket) and set the sign accordingly.
5. **Domestic demand attribution:** add `id_durables_cci` (+1) and `id_hh_equip_retail` (+1); confirm they improve in-sample attribution without dragging forward IC (they are coincident → keep out of the forward signal if they dilute it — attribution-only).
6. **Honesty gate:** if forward IC stays ~0.00 (does not clear the 0.50 placebo median) after re-pointing + US-housing + lumber, **label Durables a *heterogeneous small-cap attribution basket with no forward edge* — a domestic-furniture/houseware + bicycle/toy mix plus a US-furniture-export anchor (WOOD) and a non-durable membership tail, whose FX nets to noise and whose strongest lead (domestic housing) is data-gapped.** Do NOT manufacture skill from slow domestic quantity prints; concede the cap is the heterogeneous membership + FX-netting, and note that the only path to a real edge would be isolating the WOOD US-housing-export sleeve (a membership change, not a mapping change).
```

---

### 4-line summary
- **Leaves: ~13 demand** (domestic durable-goods CCI `CEIC277372902` ★ + HH-equipment retail `CEIC322852202` + expected/current-income CCI + US-housing export-pull `AMEX:XHB`/`HOUST`/`RRSFS` ★ + property-cycle lag cross-ref + consumption credit + GDP backdrop) · **~9 supply/cost** (lumber `CME:LBR1!` ★ MISSING-in-seed + steel/aluminium + Brent foam-proxy + IPI Furniture/Wood `CEIC323568902`/`…323567502` + Furniture BoP export `CEICI536976467` + PMI Furniture/Wood) · **~6 macro** (USD/IDR NET 0 not −1, id_10y −1 + id_bi_rate −1 big-ticket-rate-elastic, id_bank_credit +1, id_cpi_yoy −1, dxy dual).
- **Key forecast hypothesis:** there is NO forward skill today (fwd IC +0.002, placebo 0.40 — below the median null) and the **root cause is the CEIC pull being mis-pointed to AUTOS** (`Consumer Discretionary` in idind is 100% auto/motorcycle/textile, ZERO furniture). The only genuine forecast candidate is the **US-housing cycle (`AMEX:XHB`/`HOUST`) leading the WOOD furniture-export order book ~1–2 quarters**, but it touches only ~32% of mcap; the **FX channel NETS to noise** (importer −1 vs exporter WOOD +1) and the **~27% non-durable tail (LIVE/UNTD/SCNP/MICE) is orthogonal** → realistic ceiling is "modest housing-and-input-cost beta", not skill.
- **Data bugs found:** (1) **`SEED["Durables"].ceic = ("Consumer Discretionary", None)` is MIS-POINTED to autos** — that idind category has NO furniture subcategory; the real Furniture Mfg / Wood & Cork / IPI-Furniture block lives under `Industrials & Manufacturing` and is **entirely invisible to the current pull** (root cause of IC 0.00); (2) **`usdidr` signed −1 is wrong for the 32%-mcap WOOD exporter** (should be NET 0 — importer/exporter sleeves cancel); (3) **lumber (`wb_logs → CME:LBR1!`, wk=196) is populated but UNUSED** while less-relevant steel/aluminium are wired — the most furniture-specific cost is missing; (4) **`aIDLOBHH` housing-mortgage series has n_obs None (unloadable)** → the domestic housing-cycle lead (the canonical durable-goods driver) is data-gapped; (5) latent **`dxy → TVC:BBDXY` EMPTY (wk=0)** → use `TVC:DXY`; (6) **heterogeneous membership** — LIVE (pet-retail), UNTD (equipment dealer), SCNP (pet-food), MICE (distribution) ≈ 27% are not durable goods (membership artifact, not fixable in mapping.py).
- **Wiring asks:** re-point CEIC to `("Industrials & Manufacturing","Furniture Mfg")` + `("…","Wood & Cork")` + `("…","Manufacturing Production Index")` with a 3-rule `ceic_override` (furniture export → demand +1; IPI furniture/wood → supply +1) and an auto/textile/other-IPI `ceic_exclude`; add `wb_logs` (−1, lumber) + `brent` (−1, foam proxy); change `usdidr` to NET sign **0**; new `GLOBAL_CORR` keys `us_housing → AMEX:XHB` (wk=800), `id_durables_cci → CEIC277372902` (n196), `id_hh_equip_retail → CEIC322852202` (n196); keep `id_10y`/`id_bi_rate` −1.
