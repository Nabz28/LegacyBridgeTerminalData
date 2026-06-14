# Apparel (Consumer Cyclicals) — Driver-Tree Plan

> Detail file for the `consumer_cyclicals_apparel` sub-industry basket. Framework:
> `plan/IMPROVEMENT_PLAN.md` (§1 tree · §2 driver library · §3 palette · §4 template ·
> §5 capsule #31). Every RIC below is confirmed present in
> `plan/catalog/{idind,id,market}.json` with the cited `n_obs` / `weekly_obs`.
> Primary CEIC block = **Consumer Discretionary → Textile & Apparel** (idind), with a
> large **Industrials & Manufacturing → Textile & Apparel** sub-block the worklist
> never surfaced.
>
> **One-line thesis: this is NOT a domestic-consumer-discretionary basket — it is a
> distressed, micro-cap, oil-linked *synthetic-fibre + garment-export* complex wearing a
> Consumer-Cyclicals label. Indonesian textile is SYNTHETIC/polyester-heavy (oil-derived
> feedstock — PTA/MEG/PET, not cotton), and the garment sleeve is an EXPORTER of finished
> apparel to US/EU retail. So the real driver stack is: (1) oil/Brent as the synthetic-fibre
> *cost* (−1), with a thin cotton (`ICE:CT1!`) sleeve; (2) US/EU retail-import *demand* for
> garment export orders (proxy: US retail/discretionary + Indonesia Export-to-USA value);
> (3) USD/IDR + REER *competitiveness* for the exporters (weak IDR helps — opposite sign to
> Retail #21); (4) rubber for the footwear leg (resolver currently EMPTY); (5) a large,
> un-modellable *distressed-name idiosyncratic* layer — SRIL's bankruptcy, PBRX/Pan Brothers
> restructuring, ARGO/ESTI/HDTX delisting/suspension risk. The marginal forward skill the
> backtest already sees (+0.10, kept=4) is REAL and comes from the two genuinely leading,
> exogenous price channels — *Brent (synthetic input cost) and USD/IDR (export
> competitiveness)*. The drag that keeps it "marginal" not "skill" is the distressed-micro-cap
> NOISE: half the basket is illiquid, restructuring, near-zero-mcap names whose returns are
> driven by corporate-action / solvency events orthogonal to any macro series, plus the
> contaminating presence of a 10.7T GOLD-jewellery name (HRTA) that is not textile at all.
> Verdict: a genuine but capped cost-and-competitiveness forecaster — lift it by sharpening
> the synthetic-input + export-order channel and demoting the idiosyncratic noise; concede it
> can never fully forecast the corporate-action-driven distressed tail.**

---

## 1. Snapshot + current state

| field | value |
|---|---|
| Basket | **Apparel**, sector *Consumer Cyclicals*, id `consumer_cyclicals_apparel` |
| mcap | **~32.1T** (capsule #31), benchmark JCI |
| n_names | **23** real members |
| Top members (what each does) | **HRTA** (`IDX:HRTA`, 10.7T, β 0.70) — Hartadinata Abadi: **GOLD jewellery** manufacturer/retailer — *not textile at all*; a gold-price/USD play mis-bucketed into Apparel, and the single largest weight (33% of mcap). **POLU** (`IDX:POLU`, 7.3T, β ≈0) — Golden Flower: towel/home-textile + toiletries exporter; near-zero β. **SRIL** (`IDX:SRIL`, 3.0T, β null) — Sri Rejeki Isman (Sritex): once SE-Asia's largest integrated **synthetic-textile + garment** maker, **declared bankrupt (pailit) 2024–25**, trading suspended/idiosyncratic. **TFCO** (`IDX:TFCO`, 2.9T, β 0.92) — Tifico Fiber: **polyester staple fibre / filament** producer — the purest *oil-linked synthetic feedstock* name. **ARGO** (`IDX:ARGO`, 2.6T, β 0.34) — Argo Pantes: integrated textile, long-suspended/distressed. **INDR** (`IDX:INDR`, 1.5T, β 0.39) — Indo-Rama Synthetics: **polyester + PET resin + spun yarn** integrated petrochemical-textile exporter — the other pure synthetic name. **BELL** (`IDX:BELL`, 0.83T, β 1.31) — Trisula Textile: woven/uniform fabrics. **SSTM** (0.57T, β null) — Sunson Textile. **PBRX** (`IDX:PBRX`, 0.56T, β 0.35) — **Pan Brothers**: large **garment EXPORTER** (Uniqlo/Adidas/North Face OEM) in **debt restructuring** (PKPU). **TRIS** (0.52T) — Trisula Intl (garment/retail). **MYTX** (0.32T, β 1.15) — Asia Pacific Investama (Mayora textile), distressed. **ESTI** (0.28T) — Ever Shine Tex. **INOV** (0.22T) — Inocycle: **recycled-PET (rPET) fibre** from plastic bottles — oil-substitute fibre. **ACRO** (0.22T, β null) — Acro/Tripar garment. **ERTX** (0.21T) — Eratex Djaja garment. **POLY** (`IDX:POLY`, 0.08T, β 0.65) — **Asia Pacific Fibers**: polyester/PET, long-distressed. **BATA** (`IDX:BATA`, 0.08T, β 0.53) — Sepatu Bata: **footwear** (rubber/leather). **RICY** (0.05T) — Ricky Putra Globalindo (garment/underwear). **BIMA** (0.05T, β −0.44) — Primarindo (footwear, distressed). **CNTX** (0.03T, β 0) — Centex. **UNIT** (0.02T, β null) — Nusantara Inti Corpora. **SBAT** (0.005T, β −0.07) — Sejahtera Bintang. **HDTX** (`IDX:HDTX`, **0.0T**, β null) — Panasia Indo Resources: **delisted/zero-mcap** textile husk. |
| Effective concentration | **HRTA (gold) ≈ 33% + POLU (home-textile/toiletries) ≈ 23% ≈ 56% of mcap in two NON-synthetic-garment names.** The "pure" oil-linked synthetic-fibre thesis (TFCO+INDR+POLY+INOV) is only **~33% of mcap**, the garment exporters (PBRX+TRIS+ACRO+ERTX+RICY) ~5%, footwear (BATA+BIMA) ~0.4%, and a long **distressed/suspended/zero-mcap tail** (SRIL, ARGO, MYTX, ESTI, CNTX, UNIT, SBAT, HDTX). Betas are incoherent: BELL 1.31, MYTX 1.15 vs POLU ≈0, BIMA −0.44, CNTX 0, plus several **null** betas (SRIL, SSTM, ACRO, UNIT, HDTX — too illiquid/suspended to estimate). The equal-weight engine basket therefore mixes **(a)** a gold play, **(b)** an oil-linked synthetic-fibre/petrochemical play, **(c)** a USD/IDR-competitive garment-export play, **(d)** a rubber-footwear play, and **(e)** a distressed corporate-action lottery — with no single coherent business. |
| Current grade | **perfected** (engine in-sample confidence: **medium**) |
| Current kept-driver count | **4** (`_state.txt` line 32: `…|perfected|4|marginal|0.105`) |
| Current forward OOS | **MARGINAL — fwd IC +0.10**, contemp IC **−0.04**, hit−up not separately listed, placebo pctile **0.88**, n_oos **129** (BACKTEST.md line 36: `Apparel … perfected medium 129 +0.10 -0.04 0.88 marginal`). Sits just under the SKILL bar (needs IC≥0.08 **and** ≥0.90 placebo; it clears the IC but lands at the 88th placebo pctile). Notably the **forward IC (+0.10) EXCEEDS the contemporaneous IC (−0.04)** — unusual and a tell: the driver posture *leads* rather than co-moves, consistent with leading exogenous *prices* (Brent, USD/IDR) anticipating a slow, distressed, illiquid equity basket. |

**Current seed (`mapping.py` → `SEED["Apparel"]`):**
```python
"Apparel": {
    "ceic": [("Consumer Discretionary", "Textile & Apparel")],
    "globals": [("brent", "cost", -1, "polyester/synthetic feedstock (ID textile is synthetic-heavy)"),
                ("cotton", "cost", -1, "cotton input"),
                ("wb_rubber", "cost", -1, "footwear/elastomer input")],
    "macro": [("usdidr", "macro", +1, "garment export competitiveness"),
              ("id_gdp_real_q", "demand", +1, "domestic apparel demand"),
              ("id_cpi_yoy", "demand", -1, "discretionary squeeze")],
}
```

**The gap (four problems).**
1. **The CEIC pull is mis-roled, not mis-pointed.** `("Consumer Discretionary","Textile & Apparel")` correctly reaches the right block (12 candidates in the worklist), **but the series are EXPORT/IMPORT trade volumes whose CEIC `stat_role` is backwards for this basket.** The "supply"-tagged series (`CEICI324050702`, `…323977302`, etc.) are **Export volumes/values** — for an *exporter* basket, export volume is the **demand/order-book** read, not supply. The "demand"-tagged series (`CEICI323795002` etc.) are **Import volumes** — for domestic producers, rising imports are **competition** (a headwind), not demand. The engine's default `_ceic_role_sign` takes the CEIC role literally (supply→sign 0, demand→sign +1), so the export order-book is left un-signed and the import-competition is signed +1 (wrong). This needs `ceic_override`.
2. **A whole sub-block is invisible to the pull.** The worklist surfaced only the 12 *Consumer Discretionary* trade-volume prints. The richer **`Industrials & Manufacturing → Textile & Apparel`** sub-block (27 idind series) — **quarterly IPI: Textiles `CEICI323564902`, Wearing Apparel `CEICI323565002`, Leather & Footwear `CEICI323565102` (each 2010=100, P3M, n=60)**, **Capacity-Utilization: Textiles `CEICI506662897` (P3M, n=14)**, **Investment Realization: Textile `CEICI235841302` (P3M, n=143)** — is the actual *output/activity* read and is NOT in the current pull (different `category` key). Adding `("Industrials & Manufacturing","Textile & Apparel")` reaches it.
3. **The export-DEMAND channel (the brief's core "garment export orders") has no series wired.** The seed has Brent/cotton/rubber (cost) and USD/IDR (competitiveness) but **nothing that proxies US/EU retail demand pull** — the order book. The cleanest reads exist but are unwired: **Indonesia Export: Value: USA `CEIC324065502` (P1M, n=172)** and **…China `CEIC324084502`** in the `id` macro inventory, plus deep-weekly **US-demand market proxies** (`AMEX:XRT` SPDR Retail, `AMEX:XLY` Consumer Discretionary, `RRSFS`/`RSAFS` US retail sales — all wk≈800/797) that are **not in `GLOBAL_CORR`** and therefore unreachable today.
4. **Two resolver bugs + one mis-bucketed name.** (a) **`wb_rubber → SGX:TF1!` is EMPTY (weekly_obs 0)** — the footwear/elastomer cost driver resolves to nothing (the BATA/BIMA leg has no working cost input). (b) **`usdidr` sign is +1 (correct for exporters)** — this is the *opposite* of Retail #21's −1, and is the single thing the engine must NOT get wrong. (c) **HRTA (gold jewellery, 33% of mcap) is not textile** — it injects a gold/USD signal into an apparel basket; not fixable in `mapping.py` (membership is upstream) but must be stated as a structural contaminant.

This file rebuilds the tree as: a **synthetic-fibre (oil) + cotton + rubber cost stack** (the leading prices — the source of the marginal skill), an **export-order demand spine** (US/EU retail pull + Indonesia-export-to-USA, re-roled), a **USD/IDR + REER competitiveness macro branch** (exporter sign +1), the previously-invisible **IPI/cap-util output block**, and an explicit, honest **distressed-micro-cap idiosyncratic concession**.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (split by leg — this basket has three distinct P&Ls):**

```
SYNTHETIC-FIBRE leg (TFCO, INDR, POLY, INOV ≈ 33% mcap):
  Revenue   = polyester/PET tonnes × fibre price        (fibre price tracks the PTA/MEG/oil chain)
  Gross prof= Revenue − feedstock(PTA, MEG ← oil/naphtha) − energy − labour
  Margin    = the FIBRE-minus-FEEDSTOCK SPREAD  ←── the swing factor (oil-linked, NOT cotton)

GARMENT-EXPORT leg (PBRX, TRIS, ACRO, ERTX, RICY, SRIL-when-alive ≈ 5–10% mcap):
  Revenue   = export order volume × USD price-per-piece  (orders ← US/EU retail demand)
  Gross prof= Revenue − fabric/fibre COGS − labour − conversion
  Margin    = USD revenue vs (largely IDR) cost base   ←── weak IDR EXPANDS margin (exporter)

GOLD-JEWELLERY leg (HRTA ≈ 33% mcap, mis-bucketed):
  Revenue   ≈ gold weight × (gold price + making charge);  driven by COMEX:GC1! + USD/IDR, not textile
FOOTWEAR leg (BATA, BIMA ≈ 0.4%): rubber/leather input + domestic discretionary demand.
```

Six structural facts drive the modelling:

1. **Indonesian textile is SYNTHETIC, so the input is OIL, not cotton.** Unlike a US/India cotton-spinner, the Indonesian complex (TFCO, INDR, POLY, Sritex's upstream) runs on **polyester/PET → PTA (purified terephthalic acid) + MEG (mono-ethylene-glycol) → naphtha/oil**. The margin swing is the **fibre-to-feedstock spread**, which moves with **Brent/oil** (−1 on the basket: higher oil = higher feedstock = margin squeeze, unless fibre prices pass through). Cotton (`ICE:CT1!`) matters only for the minority cotton-blend / natural-fibre sleeve and as a **substitute price** (when cotton spikes, polyester demand and pricing firm — a partial *offset* to the pure-cost sign). **This is why Brent, not cotton, is the dominant input — and why the seed's −1 Brent prior is the most important leaf in the tree.**

2. **The garment leg is an EXPORTER → USD/IDR sign is +1 (opposite to Retail).** PBRX (Uniqlo/Adidas/North Face OEM), TRIS, RICY, ERTX, and Sritex-when-solvent earn **USD revenue on a mostly-IDR cost base**. A weaker IDR **expands** export margin and improves price competitiveness vs Vietnam/Bangladesh. The competitiveness read is **USD/IDR (+1)** reinforced by **REER (−1: a *stronger* real exchange rate erodes competitiveness)**. This is the cleanest macro distinction from the domestic-retail basket and a genuine, leading, exogenous channel.

3. **Demand is US/EU RETAIL ORDER FLOW, not Indonesian household spend.** The garment leg's revenue is **export orders booked by US/EU brands and retailers** 3–6 months ahead of shipment. The forward read is therefore **US retail/discretionary demand** (proxy: `AMEX:XRT`/`AMEX:XLY`/`RRSFS`) and **Indonesia Export: Value: USA `CEIC324065502`**. The seed's `id_gdp_real_q` (+1, domestic demand) is **largely the wrong demand** — it fits only the small domestic-apparel/footwear sleeve. The order-book channel has a natural **lead** (orders precede shipments precede revenue) — the structural reason forward IC > contemp IC.

4. **The cost stack is a SPREAD, so signs partly net.** Higher oil = higher feedstock cost (−1) **but** also higher fibre selling price and a cotton-substitution tailwind; higher cotton = direct cost on the cotton sleeve (−1) **but** firms polyester demand/pricing (+ for the synthetic majority). The engine should expect **noisy, partially-offsetting** commodity signs — which is exactly why a naive "all commodities −1" cost map under-performs and why the empirical sign-reconciliation gate matters here.

5. **Half the basket is DISTRESSED — returns are corporate-action-driven, orthogonal to macro.** SRIL (bankrupt/suspended), PBRX (PKPU restructuring), ARGO/ESTI/MYTX/CNTX/UNIT/SBAT (long-suspended, micro-cap), HDTX (zero mcap, delisted). Their price moves are **solvency/restructuring/relisting events** — un-modellable from any commodity or macro series. This is **idiosyncratic noise** that caps R² and forward IC and is the reason the basket is "marginal" not "skill". It cannot be wired away (membership is fixed upstream); it can only be **diluted** by anchoring on the leading-price channel and not over-fitting the noisy CEIC quantity tree.

6. **Intra-basket dispersion is extreme + a mis-bucketed gold name.** Gold-jewellery (HRTA, 33%), home-textile/toiletries (POLU, 23%), pure synthetic-fibre (TFCO/INDR/POLY/INOV, 33%), garment-export (~5–10%), footwear (~0.4%), distressed tail. **A single macro posture cannot fit a gold play, an oil-fibre play, and a USD-competitive exporter play simultaneously** — another hard cap on coherence, and the reason the basket's marginal skill comes from the *few* drivers (oil, USD/IDR) that happen to touch *several* legs at once (oil → fibre cost AND, via USD, gold; USD/IDR → exporter margin AND gold).

**What a sell-side analyst actually watches:** the **polyester-to-PTA/MEG (oil) spread**, **cotton price** (substitute + cotton-sleeve cost), **export order book / US-EU retail inventory cycle**, **USD/IDR and REER** (competitiveness vs Vietnam/Bangladesh), **import competition** (cheap Chinese fabric/finished-garment dumping), **minimum-wage trajectory** (labour cost, the other margin lever), and **name-specific solvency/restructuring news**. Of these, only **oil/Brent, cotton, USD/IDR, REER and the US-retail proxies are high-frequency leading prices**; the CEIC export/IPI/cap-util series are monthly-to-quarterly, publication-lagged and coincident.

---

## 3. DEMAND driver tree

> Demand = **export order pull from US/EU retail** (the dominant channel for the garment leg) + a thin **domestic apparel/footwear** sleeve. The genuinely *leading* demand read is **US retail/discretionary demand** (orders precede shipments by 3–6 months) and the **Indonesia Export-to-USA value** print. The CEIC trade-volume series are the right *content* but carry the **wrong `stat_role`** (export volume tagged "supply", import volume tagged "demand") and must be re-roled. ⚠ The US-demand market proxies (`AMEX:XRT`/`XLY`, `RRSFS`) and the `id`-macro export-to-USA print are **not in `GLOBAL_CORR`** — they need new resolver keys (see §9).

```
DEMAND (export-order pull from US/EU retail  +  thin domestic sleeve)
├── D1 US / EU RETAIL DEMAND — the order-book pull (THE leading demand read) ★ NEW
│     ├─ US Consumer-Discretionary ·· AMEX:XLY [market, wk=800] sign +1, lag ~3-6m ★brand/retailer demand → garment orders
│     ├─ US Retail (SPDR) ··········· AMEX:XRT [market, wk=800] sign +1, lag ~3-6m ★apparel-retailer inventory/sell-through cycle
│     ├─ US Real Retail Sales ······· RRSFS    [us_macro, wk=797] sign +1, lag ~3-6m  realised US retail volume
│     └─ US Retail Sales (nominal) ·· RSAFS    [us_macro, wk=797] sign +1, lag ~3-6m
│        mechanism: US/EU brands place OEM orders 3–6 months ahead of shelf; their demand/inventory cycle LEADS Indonesian
│        garment-export revenue. These are liquid/weekly (XLY/XRT) or monthly (RRSFS) → genuine forecast candidates.
│        ⚠ none mapped in GLOBAL_CORR today → unreachable without new resolver keys (§9).
├── D2 INDONESIA EXPORT ORDERS — direct realised export value (coincident-to-leading) ★ NEW
│     ├─ Export: Value: USA ········· CEIC324065502 [id-macro, USD?, P1M, n=172] sign +1, lag ~0-2m ★the single best export-pull read
│     ├─ Export: Value: China ······· CEIC324084502 [id-macro, P1M, n=172] sign +1 (regional order pull; also fibre off-take)
│     ├─ Exports Non Oil & Gas Total · CEIC13921201 [id-macro, P1M, n=511] sign +1 (broad export pulse; deep history)
│     └─ id_exports resolver ········· aIDEXGAR "Exports Chg YoY" [id-macro, %, P1M] sign +1 — coarse total-export YoY proxy
│        ⚠ caveat: CEIC export-VALUE includes a price (USD) component co-linear with USD/IDR; treat as order-pull attribution,
│        and prefer the volume re-role (D3) for a cleaner quantity read. These are publication-lagged ~5-6 wks.
├── D3 TEXTILE/APPAREL EXPORT VOLUME — re-role of the mis-tagged CEIC block (order book) ★ RE-ROLE
│     ├─ Export Vol: Made-up textile articles  CEICI324050702 [→demand, kg mn, P1M, n=172] sign +1 (CEIC tags "supply" — WRONG for exporter)
│     ├─ Export Val: Textile Yarns/Fabrics/Products CEICI323977302 [→demand, USD mn, P1M, n=172] sign +1 ★fibre+fabric export value
│     ├─ Export Val: Textile Fibres & Waste    CEICI323975002 [→demand, USD mn, P1M, n=172] sign +1 (synthetic-fibre export off-take)
│     └─ Export Vol: Carpets/floor coverings ·· CEICI324050102 [→demand, kg mn, P1M, n=172] sign +1
│        mechanism: for an EXPORTER basket, export volume/value IS the demand/order read. The CEIC `stat_role="supply"` is
│        production-side framing; re-role to demand +1 via ceic_override. Monthly, publication-lagged → attribution-leaning.
├── D4 IMPORT COMPETITION — re-role of the mis-tagged "demand" imports (a HEADWIND) ★ RE-ROLE
│     ├─ Import Vol: Made-up textile articles  CEICI323795002 [→supply(competition), kg mn, P1M, n=172] sign −1
│     ├─ Import Vol: Carpets/floor coverings · CEICI323794402 [→supply, kg mn, P1M, n=172] sign −1
│     └─ Import Vol: Impregnated/coated textiles CEICI323794602 [→supply, kg mn, P1M, n=172] sign −1
│        mechanism: rising textile IMPORTS = cheaper Chinese fabric/finished-garment competition undercutting domestic
│        producers → margin/volume headwind → sign −1. CEIC tags these "demand"; for a PRODUCER basket they are competition.
└── D5 DOMESTIC APPAREL / FOOTWEAR DEMAND (the thin local sleeve) ─► household discretionary
      ├─ id_retail ················· aIDRSLSAR (→CEIC retail-sales) [demand, %, P1M] sign +1 — domestic retail incl. clothing (small sleeve)
      ├─ id_consumer_confidence ···· aIDCONIAR [demand, Point, P1M] sign +1 — domestic willingness-to-spend (footwear/local apparel)
      ├─ id_gdp_real_q ············· aIDGDPAR1 [demand, %, P3M] sign +1 — CURRENT SEED; broad domestic backdrop (over-weighted: most revenue is EXPORT)
      └─ id_cpi_yoy ··············· ECONOMICS:IDIRYY [demand, %, P1M] sign −1 — CURRENT SEED; inflation squeezes domestic discretionary apparel
         ⚠ caveat: D5 is the MINORITY channel — only BATA/BIMA/local-TRIS/RICY sell domestically. The seed leans on D5
         (id_gdp_real_q) while the basket's revenue is largely EXPORT → demote D5, promote D1/D2/D3.
```

**Forecast hypothesis (demand): the export-order channel (D1/D2) is the real, leading demand read; the domestic sleeve (D5, current seed) is largely the wrong demand.**
The garment leg's revenue is booked from **US/EU orders 3–6 months ahead**, so **US discretionary/retail demand (D1, weekly, leading) and Indonesia export-to-USA value (D2, monthly) genuinely LEAD** Indonesian garment-export earnings — the structural reason this basket's *forward* IC (+0.10) beats its *contemporaneous* IC (−0.04). The CEIC export volume/value re-role (D3, +1) is the right content but monthly/lagged → attribution-leaning. Import competition (D4, −1) is a real headwind worth testing. **The current seed's domestic demand spine (D5: id_gdp_real_q +1) fits only ~a few small-cap names and should be demoted.** Net: **anchor demand on D1 (US-retail proxies, forecast candidate) + D2/D3 (export value/volume, re-roled); demote D5 to a thin domestic sleeve.**

---

## 4. SUPPLY / COST driver tree

> The cost stack is the **oil-linked synthetic-fibre feedstock** (the swing factor), a thin **cotton** sleeve, **rubber** for footwear, **energy** and **labour (minimum wage)**. The genuinely leading, exogenous cost prices are **Brent (synthetic), cotton, and — once fixed — rubber**; these are the source of the marginal forward skill. "Supply" in the production sense (IPI, capacity utilization) is the previously-invisible Industrials sub-block.

```
SUPPLY / COST (synthetic feedstock + cotton + rubber + energy + labour + output)
├── C1 SYNTHETIC-FIBRE FEEDSTOCK — oil-linked (THE margin swing, the leading cost price) ★
│     ├─ Brent ····················· brent → ICEEUR:BRN1! [market, wk=800] sign −1, lag ~1-2m ★CURRENT SEED; polyester/PET ← PTA/MEG ← naphtha/oil
│     └─ WTI (parent/cross-check) ··· wti → NYMEX:CL1! [market, wk=800] sign −1 (crude complex; redundant w/ Brent — test one)
│        mechanism: Indonesian textile is synthetic. Higher oil → higher PTA/MEG feedstock → fibre-minus-feedstock spread
│        squeeze → margin hit for TFCO/INDR/POLY/INOV (and upstream of the garment leg). NO clean PTA/MEG/PET future exists in
│        the store (searched: none) → Brent is the honest, liquid, LEADING proxy. This is the single most important leaf.
│        ⚠ sign nuance: for a fibre PRODUCER, higher oil can also lift fibre SELLING price (pass-through) → empirical sign may
│        be weaker than −1; the substitution tailwind (cotton-up → polyester demand-up) further nets it. Expect a noisy −.
├── C2 COTTON — natural-fibre sleeve cost + synthetic SUBSTITUTE price ★
│     └─ Cotton ···················· cotton → ICE:CT1! [market, wk=800] sign −1, lag ~1-2m  CURRENT SEED
│        mechanism: direct input for the cotton-blend/natural sleeve (BELL/SSTM/garment). BUT cotton is also the SUBSTITUTE for
│        polyester — a cotton spike firms polyester demand & pricing for the synthetic majority (a partial OFFSET, +). Net sign
│        is genuinely ambiguous and basket-weighted toward a weak −1; flag for empirical reconciliation (do not force −1).
├── C3 RUBBER / FOOTWEAR INPUT — elastomer + sole (BATA/BIMA leg) ⚠ RESOLVER EMPTY
│     └─ Rubber ···················· wb_rubber → SGX:TF1! [market, wk=0 EMPTY] sign −1  CURRENT SEED — RESOLVES TO NOTHING
│        ⚠ DATA BUG: SGX:TF1! (Rubber TSR20) has weekly_obs 0 → the footwear cost driver loads nothing today (falls to spark/
│        no_history). No clean alternative rubber future is populated in the store (TF1! is the only rubber id, and it's empty).
│        → CONCEDE: rubber is un-resolvable; the BATA/BIMA footwear leg (~0.4% mcap) has no working cost input. Drop or accept None.
├── C4 ENERGY / UTILITIES (fibre & spinning are energy-intensive) ─► power/gas cost
│     └─ natgas / coal (no clean ID industrial-tariff series) — captured loosely by Brent (C1) / id_cpi_yoy. Note only;
│        Indonesian industrial power is PLN-regulated (no market price); immaterial vs feedstock at the monthly horizon.
├── C5 LABOUR COST — minimum wage (the other margin lever for garment) ─► wage floor
│     └─ Min Wage: National Avg ····· CEIC303317302 [cost, IDR th, P1Y, n=36] sign −1 — ANNUAL → too slow to wire; structural note.
│        mechanism: garment is labour-intensive; rising minimum wage erodes the cost advantage vs Vietnam/Bangladesh. Real and
│        large structurally, but ANNUAL frequency (n=36) → cannot drive a monthly fit; document, do not wire.
└── C6 OUTPUT / CAPACITY — the previously-invisible Industrials sub-block (production read) ★ NEW BLOCK
      ├─ IPI Qtrly: Textiles ········ CEICI323564902 [supply, 2010=100, P3M, n=60] sign +1 (higher output = healthier sector)
      ├─ IPI Qtrly: Wearing Apparel · CEICI323565002 [supply, 2010=100, P3M, n=60] sign +1
      ├─ IPI Qtrly: Leather & Footwear CEICI323565102 [supply, 2010=100, P3M, n=60] sign +1 (the footwear leg's output)
      ├─ Capacity-Util: Textiles ···· CEICI506662897 [supply, %, P3M, n=14] sign +1 (utilisation = pricing power; SHORT history)
      └─ Investment Realization: Textile CEICI235841302 [supply, IDR bn, P3M, n=143] sign +1 (capex = forward capacity/confidence)
         ⚠ caveat: quarterly, publication-lagged, coincident-to-lagging → ATTRIBUTION not forecast. Cap-util is too short (n=14).
         This block lives under category `Industrials & Manufacturing` (NOT Consumer Discretionary) → the current pull misses it.
```

**Forecast hypothesis (supply/cost): the cost side that matters is the oil-linked feedstock (C1) + cotton (C2) — both leading prices, and the engine's real edge.**
For a synthetic-textile complex the decisive cost is **Brent-linked feedstock (C1, −1)** — liquid, daily/weekly, exogenous, and it **leads** the fibre-spread margin. Cotton (C2) adds a noisy −/+ via the cotton-sleeve cost vs polyester-substitution offset. **These two leading commodity prices are almost certainly the source of the basket's +0.10 forward IC** (a cost-pass-through pattern exactly like IMPROVEMENT_PLAN §3's "physical-commodity / cost-pass-through" winners). Rubber (C3) is **un-resolvable (empty SGX:TF1!)** → concede. Labour (C5) is annual → structural note. The IPI/cap-util output block (C6) is quarterly/coincident → attribution. **Net cost forecast candidates: `brent` (−1, primary), `cotton` (−1/ambiguous, reconcile empirically); everything else is attribution or un-wireable.**

---

## 5. MACRO / RATE / FX / FLOW

> For an **exporter** with an oil-linked cost base, the systematic core is **USD/IDR + REER (competitiveness, +1 — opposite to Retail), the oil/commodity complex (already in §4), and EM risk/flow**. The rate channel matters mainly via the distressed names' **solvency/refinancing** (a *credit-spread* sensitivity, not a discount-rate one), which is the right way to read `id_bi_rate` here.

```
MACRO / RATE / FX / FLOW
├── M1 FX COMPETITIVENESS — USD/IDR (exporter margin + price competitiveness) ★ sign +1 (NOT −1)
│     ├─ USD/IDR ···················· usdidr → FX_IDC:USDIDR [market, wk=801] sign +1, lag ~0-1 ★CURRENT SEED; weak IDR EXPANDS export margin
│     │     mechanism: garment/fibre exporters earn USD on an IDR cost base; ↑USD/IDR → ↑margin + better vs Vietnam/Bangladesh.
│     │     This is the cleanest macro distinction from domestic Retail (#21, where usdidr is −1). Daily, exogenous, LEADING.
│     └─ USD/CNY (regional cross) ··· usdcny → FX_IDC:USDCNY [market, wk=801] sign +1 (CNY weakness = Chinese-textile competitiveness
│           → headwind for ID exporters; ambiguous — test). Secondary.
├── M2 REAL EXCHANGE RATE — competitiveness level (stronger REER = LESS competitive) ★ NEW
│     ├─ REER CPI-based ············ CEIC459705817 [macro, 2015=100, P1M, n=677] sign −1, lag ~1-2m ★deepest-history competitiveness read
│     └─ REER BIS Broad ············ CEIC502748747 [macro, 2020=100, P1M, n=388] sign −1 (alt; reconcile w/ above)
│        mechanism: REER nets nominal FX against relative inflation — a RISE means ID textile is getting expensive vs trade
│        partners → export-order headwind. Sign −1. Monthly, publication-lagged. ⚠ lives in `id` macro → needs resolver key (§9).
├── M3 EM RISK / GLOBAL FLOW — micro-cap, illiquid, high-beta-to-risk-off ─► global appetite
│     ├─ DXY ······················· dxy → TVC:DXY [market, wk=800] sign ? lag ~0-1 — DUAL: strong USD helps exporter translation (+)
│     │     but drives EM risk-off outflow from illiquid micro-caps (−). Net ambiguous → reconcile empirically (likely weak −).
│     │     ⚠ RESOLVER BUG: GLOBAL_CORR["dxy"]="TVC:BBDXY" is EMPTY (wk=0) → remap to TVC:DXY (wk=800). Same bug as Retail/Telco.
│     └─ VIX / NDX ················· vix → CBOE:VIX (wk=800) sign −1; ndx → NASDAQ:NDX (wk=800) — risk-appetite proxy for the
│           illiquid micro-cap tail (risk-off crushes thin-float distressed names). Secondary/attribution.
├── M4 RATES — SOLVENCY/REFINANCING channel for the distressed names (NOT discount rate) ─► credit risk
│     └─ id_bi_rate ················ ECONOMICS:IDINTR [macro, %, P1M, wk=186] sign −1 (higher rates worsen refi for PBRX/SRIL-type
│           leveraged restructurings → −). Read as a credit-spread proxy, not a consumer-discount rate. Short history; cross-check only.
└── M5 DOMESTIC BACKDROP (the thin local sleeve, from §3 D5) ─► household demand
      └─ id_gdp_real_q +1 / id_cpi_yoy −1 (current seed) — coarse, fits only BATA/BIMA/local apparel. Demote vs the export spine.
```

**Sub-driver chain (the leading→lagging logic the engine should exploit):**
```
Oil(Brent) + US-retail-demand + USD/IDR  ──►  fibre-feedstock spread + export order book  ──►  textile/garment revenue & margin  ──►  basket
  (market, daily/weekly, LEADING)             (CEIC export value/vol, monthly, lagged)         (quarterly earnings, illiquid)        (the equities)
```
The engine should lean on the **leading exogenous prices (Brent for the cost spread, USD/IDR for competitiveness, US-retail for the order book)** to anticipate the slow CEIC export/IPI prints — the "liquid price leads the equity" pattern IMPROVEMENT_PLAN §3 rewards and the documented source of this basket's marginal forward skill.

**Forecast hypothesis (macro): USD/IDR (+1) and REER (−1) are genuine leading competitiveness reads; the rest is risk/credit attribution.**
`usdidr` (+1) is the single cleanest macro forecast candidate — exogenous, daily, and it *leads* exporter margin. REER (−1) adds a slower competitiveness level. DXY is dual-signed (translation + vs risk-off −) → expect a weak/ambiguous empirical sign. The rate channel (M4) is a **solvency/refinancing** read for the distressed tail, not a consumer-discount rate, and should be kept as a low-weight cross-check. **This is where part of the +0.10 lives (USD/IDR), alongside Brent — keep usdidr at +1 and DO NOT flip it to Retail's −1.**

---

## 6. Cross-industry linkages

| linkage | series | role/sign | note |
|---|---|---|---|
| **Energy / Oil & Gas** (#16) | `brent` ICEEUR:BRN1!; `wti` NYMEX:CL1! (wk=800) | cost −1 | The synthetic-fibre feedstock (PTA/MEG/PET) is an **oil derivative** — Apparel borrows the crude complex as its primary *cost*. This is the defining cross-link: an "apparel" basket whose #1 driver is **oil**. |
| **Plantation / Agri-soft** (#12) | `cotton` ICE:CT1! (wk=800) | cost −1 / ambiguous | Cotton = natural-fibre sleeve cost AND the polyester substitute price; borrowed from the agri-soft complex. Net sign ambiguous (see §4 C2). |
| **US Consumer / Retail (external demand)** | `AMEX:XLY` Consumer-Discretionary, `AMEX:XRT` SPDR Retail, `RRSFS`/`RSAFS` US retail sales (all wk≈800/797) | demand +1 | The garment leg's **order book is US/EU retail demand** — borrow US-retail market proxies as the leading export-pull read. ⚠ none in GLOBAL_CORR → new resolver keys (§9). The cleanest "what we COULD add". |
| **Trade / Balance-of-Payments (macro)** | `Export: Value: USA` CEIC324065502 (n=172); `…China` CEIC324084502; `Exports Non O&G` CEIC13921201 (n=511) | demand +1 | Indonesia's realised export-value prints by destination — the direct order-pull read; borrowed from the `id` Imports & Exports macro block. ⚠ macro inventory → not reachable via the `ceic` (idind) pull; wire via resolver (§9). |
| **Banks / Multifinance** (#1/#30) | `id_bi_rate` ECONOMICS:IDINTR; lending rates CEIC14405201 (working-cap, n=397) | macro −1 (credit) | For the **distressed/leveraged** names (PBRX/SRIL/ARGO) the rate complex is a **refinancing/solvency** sensitivity (credit spread), not a consumer-discount rate. Borrow as a low-weight credit cross-check. |
| **Basic Materials / Chemicals** (#8) | (no clean PTA/MEG/PET future in store) | cost — | The *true* feedstock (PTA/MEG/purified-terephthalic-acid) has no populated market series — searched: none. Brent (#16) is the honest proxy. Note the gap. |
| **Metals (gold)** — *contaminant, not a true link* | `gold` COMEX:GC1! (HRTA jewellery) | — | HRTA (33% mcap) is a **gold-jewellery** name mis-bucketed into Apparel; its returns track **gold + USD/IDR**, injecting a metals signal. Not a genuine apparel linkage — a membership artifact to disclose, not to wire. |

---

## 7. Currently wired vs available

| branch | wired now | available to add | priority |
|---|---|---|---|
| **Synthetic feedstock (oil)** | `brent` −1 ✓ (kept, the key driver) | keep; `wti` as redundant cross-check (test one, not both) | **P0 — keep, the source of skill** |
| **Cotton sleeve / substitute** | `cotton` −1 ✓ | keep but **allow empirical sign** (substitution offset makes −1 only weakly right) | P0 — keep, reconcile |
| **Rubber / footwear** | `wb_rubber → SGX:TF1!` ⚠ **EMPTY (wk=0)** | **no working alternative** — TF1! is the only rubber id and it's empty → **DROP** (resolves to nothing today) | **P0 — remove the dead driver** |
| **FX competitiveness** | `usdidr` **+1** ✓ (kept, exporter sign) | keep at **+1** (do NOT flip to Retail's −1); add `usdcny` +1 (regional competition) test | **P0 — keep, guard the sign** |
| **REER competitiveness** | **none** | **REER CPI-based** CEIC459705817 (−1, n=677); BIS-broad CEIC502748747 (−1) — via new resolver key | **P1 — the missing competitiveness level** |
| **Export-order DEMAND (US/EU)** | **none** | **`AMEX:XLY`/`AMEX:XRT`/`RRSFS`** (+1, US-retail pull, leading) — **new GLOBAL_CORR keys** | **P1 — the brief's core demand channel, entirely missing** |
| **Export-value (ID realised)** | **none** (only coarse `id_exports`) | **Export: Value: USA** CEIC324065502 (+1), **…China** CEIC324084502 (+1), **Non-O&G** CEIC13921201 (+1, n=511) — new resolver keys | **P1 — direct order-pull read** |
| **CEIC export volume (re-role)** | pulled but **mis-roled** (export-vol tagged "supply", un-signed) | `ceic_override`: re-role export volume/value → **demand +1** (CEICI324050702, …323977302, …323975002, …324050102) | **P0 — fixes the wrong default role** |
| **CEIC import competition (re-role)** | pulled but **mis-roled** (import-vol tagged "demand", +1) | `ceic_override`: re-role import volume → **supply/competition −1** (CEICI323795002, …323794402, …323794602) | **P1 — flips a wrong-signed headwind** |
| **IPI / capacity / capex output** | **none** (different category — pull misses it) | add `("Industrials & Manufacturing","Textile & Apparel")`: IPI Textiles/Apparel/Footwear (CEICI323564902/…565002/…565102, n=60), Investment-Realization CEICI235841302 (n=143) | **P2 — attribution depth** |
| **Domestic demand sleeve** | `id_gdp_real_q` +1, `id_cpi_yoy` −1 (seed) | **demote** — most revenue is EXPORT; keep as a thin domestic sleeve; optionally add `id_retail`/`id_consumer_confidence` (small) | **P2 — demote, do not lead on it** |
| **EM risk / flow** | none | **`dxy`** (after resolver fix to TVC:DXY) — but dual-signed; `vix`/`ndx` for the micro-cap tail | P3 (test; ambiguous) |
| **Labour (min wage)** | none | `Min Wage: National Avg` CEIC303317302 — **ANNUAL (n=36)** → too slow; structural note only | n/a |
| **Distressed idiosyncratic** | none | **no wireable series** — SRIL/PBRX/ARGO solvency/restructuring is corporate-action driven; document as irreducible noise | n/a |

**Three concrete problems with the current setup:** (a) the **CEIC role/sign is wrong by default** — the Consumer-Discretionary block is **export/import TRADE volumes**, so export-volume (CEIC role "supply") should be **demand +1** (order book) and import-volume (CEIC role "demand") should be **competition −1**; without `ceic_override` the export order-book is left un-signed and import-competition is signed +1 (backwards). (b) **`wb_rubber → SGX:TF1!` is EMPTY (wk=0)** — the footwear cost driver loads nothing; no populated alternative exists → drop it. (c) the **brief's core export-demand channel (US/EU retail pull + ID export-to-USA value)** and the **REER competitiveness level** are **entirely unreachable** — they live in the market store / `id` macro inventory but are **not in `GLOBAL_CORR`**, so they need **new resolver keys** to be testable. Also note the **`dxy → TVC:BBDXY` empty-resolver bug** (use `TVC:DXY`) and that **HRTA (gold, 33% mcap) contaminates the basket** with a metals signal that no apparel driver can fit.

---

## 8. Forecastability verdict

**The basket is a GENUINE but CAPPED cost-and-competitiveness forecaster — marginal forward skill (+0.10) that is real, not noise, and comes from the few leading exogenous prices (Brent for the synthetic-fibre cost spread, USD/IDR for export competitiveness). It is held below the SKILL bar by an irreducible distressed-micro-cap idiosyncratic layer and a mis-bucketed gold name. The lever to lift it is to SHARPEN the synthetic-input + export-order + competitiveness channel; the honest ceiling is "marginal/weak-skill" because half the basket trades on corporate-action events orthogonal to any macro series.**

Reasoning:

- **Why it DOES forecast (the source of +0.10):** unlike the domestic-sentiment baskets (Retail, Media, Auto) that mean-revert, Apparel's drivers are **real, exogenous, leading PRICES that move the margin and the order book before the equities** — exactly IMPROVEMENT_PLAN §3's "physical-commodity / cost-pass-through" winning profile. **Brent** leads the polyester-feedstock spread (the margin swing of the 33%-mcap synthetic leg); **USD/IDR** leads exporter translation and competitiveness; **US-retail demand** leads the garment order book by 3–6 months. The diagnostic tell is in the backtest itself: **forward IC (+0.10) EXCEEDS contemporaneous IC (−0.04)** — the posture *anticipates* rather than co-moves, the signature of leading inputs feeding a slow, illiquid equity. This is a legitimate (if modest) forward edge, placebo pctile 0.88.

- **Why it is only MARGINAL, not SKILL:** four caps. (1) **Distressed-micro-cap noise** — SRIL (bankrupt), PBRX (PKPU), ARGO/MYTX/ESTI/CNTX/UNIT/SBAT (suspended), HDTX (zero mcap): roughly half the names move on **solvency/restructuring/relisting events** that no commodity or FX series can predict, injecting un-forecastable variance into the equal-weight return. (2) **The gold contaminant** — HRTA (33% mcap) tracks gold + USD/IDR, not textile, so a third of the basket responds to a driver outside the apparel tree. (3) **Sign-netting in the cost stack** — Brent and cotton each carry partially-offsetting effects (feedstock cost vs fibre pass-through vs cotton-substitution), muddying the empirical signal. (4) **Coincident/lagged CEIC quantity prints** (export/IPI/cap-util) add attribution but not forecast and, if over-weighted, dilute the leading-price edge.

- **Honest concession (structure):** (1) the **distressed tail is irreducible** — it cannot be modelled or removed in `mapping.py` (membership is fixed upstream); the realistic forward ceiling is "marginal/weak-skill", not "skill", until/unless the universe excludes suspended/zero-mcap names. (2) **HRTA mis-bucketing** is a membership artifact, not fixable here — state it. (3) The **true feedstock price (PTA/MEG/PET) is unavailable**; Brent is a proxy with imperfect spread-tracking. (4) **Rubber is un-resolvable** (empty SGX:TF1!), so the footwear leg has no cost input.

**What would lift it from marginal → weak-skill/skill (and what would confirm it):**
1. **Add the export-DEMAND channel** (`AMEX:XLY`/`XRT`/`RRSFS` +1 and/or `Export: Value: USA` CEIC324065502 +1) — the brief's core, leading, currently-missing order-book read. **Hypothesis: the US-retail pull carries a positive forward IC and is the highest-value addition.**
2. **Add REER (−1)** — the competitiveness level that complements USD/IDR; deep history (n=677).
3. **Re-role the CEIC export/import block** (export-vol → demand +1, import-vol → competition −1) so the order book and the dumping headwind enter with correct signs.
4. **Drop the dead `wb_rubber` driver** and **guard the `usdidr = +1`** exporter sign (the one thing that must not be flipped).
5. **Demote the domestic sleeve** (`id_gdp_real_q`) so it stops fitting the wrong (domestic) demand.
**Verdict: keep the basket labelled a genuine *cost-and-competitiveness forecaster* (oil/synthetic-input + USD/IDR/REER + export-order beta), explicitly capped by a distressed-micro-cap idiosyncratic tail. If the export-demand + REER additions raise forward IC above ~0.13 and clear the 0.90 placebo bar, promote to SKILL; if they hold ~+0.10, the honest verdict is "marginal cost-pass-through skill, distressed-noise-capped".** The one outcome that would force a downgrade: if the empirical `usdidr` sign comes out **−** in this window, the exporter thesis is contaminated by the domestic/gold legs → fall back to "Brent-driven synthetic-fibre-cost beta only".

---

## 9. Engine-wiring spec (`mapping.py`)

**Proposed replacement for `SEED["Apparel"]`:**
```python
"Apparel": {  # ~33% gold (HRTA, mis-bucketed) + ~33% oil-linked SYNTHETIC fibre (TFCO/INDR/POLY/INOV)
    # + garment EXPORTERS (PBRX/TRIS/RICY) + footwear (BATA/BIMA) + a distressed/suspended tail
    # (SRIL bankrupt, ARGO/MYTX/ESTI/HDTX). NOT a domestic-discretionary basket: input is OIL (polyester
    # feedstock, not cotton); demand is US/EU retail ORDERS; FX sign is +1 (exporter, opposite to Retail).
    # The marginal forward skill (+0.10) comes from the leading exogenous PRICES (Brent cost-spread +
    # USD/IDR competitiveness); the cap is distressed-micro-cap idiosyncratic noise that no series predicts.
    "ceic": [("Consumer Discretionary", "Textile & Apparel"),      # export/import TRADE volumes (re-roled below)
             ("Industrials & Manufacturing", "Textile & Apparel")], # ★ IPI / capacity / capex output block (was unreachable)
    # Re-role the mis-tagged trade block: for an EXPORTER, export volume/value is DEMAND (+1, order book),
    # and import volume is COMPETITION (-1, cheap Chinese fabric/garment dumping) — NOT the CEIC default roles.
    "ceic_override": [("export: volume",  "demand", +1),   # export order-book (CEIC tags these "supply")
                      ("exports: value",  "demand", +1),   # textile yarn/fabric/fibre export value
                      ("import: volume",  "supply", -1),   # import competition (CEIC tags these "demand")
                      ("ipi: quarterly",  "supply", +1),   # production output (attribution)
                      ("capacity utiliz", "supply", +1),   # utilisation = pricing power (short history)
                      ("investment realization", "supply", +1)], # textile capex = forward capacity/confidence
    # No endogenous own-balance-sheet series in this block to exclude; keep the GDP/IPI as attribution.
    "ceic_exclude": [],
    "globals": [
        ("brent",  "cost",   -1, "PRIMARY: polyester/PET <- PTA/MEG <- oil; the synthetic-fibre feedstock spread (margin swing)"),
        ("cotton", "cost",   -1, "natural-fibre sleeve cost AND polyester substitute price (sign ambiguous; reconcile empirically)"),
        # wb_rubber DROPPED: SGX:TF1! is EMPTY (wk=0); no populated rubber series exists -> dead driver.
    ],
    "macro": [
        # -- the leading systematic spine: FX competitiveness (exporter +1) + REER level + export-order pull --
        ("usdidr", "macro",  +1, "EXPORTER margin + competitiveness: weak IDR EXPANDS export margin (opposite of Retail -1)"),
        ("id_reer", "macro", -1, "real exchange rate: a STRONGER REER erodes export competitiveness vs Vietnam/Bangladesh"),  # NEW resolver
        ("us_retail", "demand", +1, "US/EU retail demand = garment EXPORT order book (leads shipments 3-6m)"),               # NEW resolver
        ("id_export_usa", "demand", +1, "Indonesia Export: Value: USA = direct realised order-pull read"),                   # NEW resolver
        # -- risk / flow (ambiguous; low weight) --
        ("dxy",    "macro",   0, "DUAL: strong USD helps exporter translation (+) but EM risk-off hits illiquid micro-caps (-)"),
        # -- thin DOMESTIC sleeve (demoted: most revenue is EXPORT) --
        ("id_gdp_real_q", "demand", +1, "domestic apparel/footwear sleeve (BATA/BIMA/local) — coarse, minority channel"),
        ("id_cpi_yoy",    "demand", -1, "domestic discretionary squeeze (minority sleeve)"),
        # -- distressed-name refinancing cross-check (credit, not discount rate) --
        ("id_bi_rate",    "macro",  -1, "refinancing/solvency stress for the leveraged distressed tail (PBRX/SRIL-type)"),
    ],
}
```

**Resolvers — what works, the bugs, and the new keys to add in `GLOBAL_CORR`:**
- **Already work (no change):** `brent → ICEEUR:BRN1!` (wk=800), `cotton → ICE:CT1!` (wk=800), `usdidr → FX_IDC:USDIDR` (wk=801), `id_gdp_real_q → aIDGDPAR1`, `id_cpi_yoy → ECONOMICS:IDIRYY`, `id_bi_rate → ECONOMICS:IDINTR` (wk=186, short).
- **Bug to FIX:** `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **EMPTY (wk=0)** → remap to **`"TVC:DXY"`** (wk=800) (same bug flagged in Retail/Telco/Internet files).
- **Dead driver to DROP:** `wb_rubber → SGX:TF1!` is **EMPTY (wk=0)** and has no populated alternative → remove the rubber leaf (the footwear leg has no resolvable cost input).
- **NEW resolver keys to add** (the brief's core export-demand + competitiveness channel, currently unreachable):
  ```python
  "id_reer":       "CEIC459705817",  # REER CPI-based 2015=100, P1M, n=677 (deepest competitiveness history)
  "us_retail":     "AMEX:XLY",       # US Consumer-Discretionary ETF, wk=800 (leading US/EU demand pull)
  #  (alt/cross-check: "AMEX:XRT" SPDR Retail wk=800, or "RRSFS" US Real Retail Sales wk=797)
  "id_export_usa": "CEIC324065502",  # Indonesia Export: Value: USA, P1M, n=172 (direct order-pull)
  ```
  ⚠ Confirm the `id`-macro RICs (`CEIC459705817`, `CEIC324065502`) and the market RICs (`AMEX:XLY`) are loadable by `_global_history` (they resolve through correlation.sqlite, same path as the existing CEIC/market resolvers) before relying on them; if a CEIC `id`-macro ric is not in correlation.sqlite, fall back to the populated market proxies (`AMEX:XLY`/`RRSFS` for demand) which are confirmed wk≈800/797.

**What to backtest (`backtest/bt.py "Apparel"`), keep only if forward IC improves/holds (current +0.10, placebo 0.88):**
1. **Export-demand add (the big one):** current vs +`us_retail` (AMEX:XLY +1) and/or +`id_export_usa` (+1). **Hypothesis: the US-retail order-book pull carries a positive forward IC and pushes the basket toward/over the 0.90 placebo SKILL bar.** Single most important test.
2. **REER add:** confirm `id_reer` (−1) helps or is neutral — the competitiveness level complementing USD/IDR. Verify the empirical sign is **−** (stronger REER = headwind); if +, the competitiveness thesis is contaminated.
3. **FX-sign guard:** verify `usdidr` empirical sign stays **+** (exporter). **If it comes out −, the gold/domestic legs are dominating** → downgrade the exporter thesis and fall back to a Brent-cost-beta read. This is the make-or-break sign check.
4. **CEIC re-role test:** confirm re-roling export-volume → demand +1 and import-volume → competition −1 helps vs the mis-roled default. Add the Industrials IPI/cap-util block as attribution and confirm it does not dilute the leading-price edge (if it drags forward IC, keep it out of the forward signal — attribution-only).
5. **Dead-driver / bug fixes:** confirm dropping `wb_rubber` (empty) and remapping `dxy → TVC:DXY` (was empty) change nothing for the worse (rubber loaded nothing anyway; dxy now actually loads, with an expected weak/ambiguous sign).
6. **Honesty gate:** if forward IC holds ~+0.10 (does not clear 0.90 placebo) after the export-demand + REER adds, **label Apparel a *marginal cost-and-competitiveness forecaster* — an oil/synthetic-feedstock + USD/IDR/REER + export-order beta, capped by a distressed-micro-cap idiosyncratic tail and a mis-bucketed gold name (HRTA)** — a genuine but modest edge, NOT promoted to SKILL, with the distressed tail named as the structural ceiling.
```

---

### 4-line summary
- **Leaves: ~12 demand** (US-retail pull XLY/XRT/RRSFS + ID export-to-USA/China value + re-roled CEIC export vol/val + import-competition + thin domestic sleeve) · **~8 supply/cost** (Brent synthetic feedstock ★, cotton, dead rubber, IPI Textiles/Apparel/Footwear + cap-util + textile capex, annual min-wage note) · **~6 macro** (USD/IDR +1 exporter, REER −1, DXY dual, VIX/NDX risk, BI-rate refi, domestic backdrop).
- **Key forecast hypothesis:** the marginal +0.10 forward skill is REAL and comes from leading exogenous PRICES — **Brent (oil-linked synthetic-fibre cost spread) + USD/IDR (exporter competitiveness, sign +1 NOT −1)**; lift it by wiring the missing **export-order demand** (US-retail proxies + ID-export-to-USA) and **REER** competitiveness; concede the cap is an irreducible **distressed-micro-cap idiosyncratic** tail.
- **Data bugs found:** (1) **`wb_rubber → SGX:TF1!` EMPTY (wk=0)** — footwear cost driver resolves to nothing, no populated alternative → drop; (2) **`dxy → TVC:BBDXY` EMPTY (wk=0)** → use `TVC:DXY` (wk=800); (3) CEIC block is **EXPORT/IMPORT trade volumes mis-roled** (export-vol tagged "supply", import-vol tagged "demand") → needs `ceic_override`; (4) the **Industrials & Manufacturing → Textile & Apparel** IPI/cap-util/capex sub-block (27 series) is **invisible to the current pull**; (5) **HRTA (gold jewellery, 33% mcap) is mis-bucketed** into Apparel (membership artifact, not fixable in mapping.py).
- **Wiring asks:** add `("Industrials & Manufacturing","Textile & Apparel")` CEIC pull + 6-rule `ceic_override`; new `GLOBAL_CORR` keys `id_reer → CEIC459705817` (n=677), `us_retail → AMEX:XLY` (wk=800), `id_export_usa → CEIC324065502` (n=172); keep `usdidr` at **+1**; drop the empty `wb_rubber`.
