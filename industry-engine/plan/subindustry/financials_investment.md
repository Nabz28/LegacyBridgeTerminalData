# Investment / Holding Companies (Financials) — Deep Driver-Tree Plan

> `basket_id: financials_investment` · sector **Financials** · priority 26 ·
> mcap **~62.0T** · **n_members = 9 (7 used)** · grade **partial** · kept **6/32** ·
> **forward OOS IC −0.13 (placebo 10th pctile — ANTI-predictive), hit−up −0.04,
> long-short −1.1%/mo, flag: none.**
>
> This is the IDX **investment-holding-company** basket: NAV-discount vehicles whose
> return is the *look-through* value of their underlying stakes minus the swing in the
> holding-company discount. The flagship name is **SRTG (Saratoga)** — a coal-levered
> holdco via its **ADRO/Alamtri** stake, plus **MPMX** (auto retail) and **TBIG**
> (towers). The whole point of this file is to explain *why* the engine is
> anti-predictive on this basket, to show that the current driver set is **structurally
> the wrong tree** (it reads holdcos through bank NIM and insurance-premium prints), and
> to decide honestly whether the **look-through commodity exposure** gives any forward
> edge or whether this is — as the backtest says — a **discount/beta basket that should
> be read as attribution, not forecast.**

---

## 1. Snapshot — the basket, and the structural mismatch

**Members (real RICs, weekly obs in `correlation.sqlite`; from `backtest/results/financials_investment.json`):**

| RIC | Name | mcap (T) | β (vs basket) | w_obs | what it actually IS |
|---|---|---|---|---|---|
| `IDX:BNBR` | Bakrie & Brothers | 24.6 | 1.55 | 793 | Bakrie-group holdco (coal BUMI/ENRG/DEWA, infra) — penny-stock, high-β tail |
| `IDX:SRTG` | **Saratoga Investama** | **22.3** | **0.33** | 665 | **the anchor**: NAV = ADRO/Alamtri (coal) + MPMX (auto) + TBIG (towers) + private |
| `IDX:BHAT` | Bhakti Multi Artha | 5.4 | 0.05 | — | small financial holdco |
| `IDX:BHIT` | MNC Asia Holding | 2.3 | 0.34 | — | MNC-group holdco (media/financials) |
| `IDX:BCAP` | MNC Kapital | 2.1 | −0.15 | — | MNC financial holdco (bank/insurance/multifinance) |
| `IDX:VICO` | Victoria Investama | 2.1 | 0.15 | — | Victoria-group financial holdco |
| `IDX:GSMF` | Equity Development Inv. | 1.4 | −0.54 | — | small holdco |
| `IDX:ARTA` | Arthavest | 0.9 | −0.14 | — | hospitality/property holdco |
| `IDX:NICK` | Charnic Capital | 0.7 | −0.34 | — | micro-cap holdco |

This is a **two-name basket in practice**: BNBR + SRTG are ~75% of the 62T mcap, and on
an **equal-weight** target (what the engine scores) the *dispersion* is enormous — betas
run from **+1.55 (BNBR)** to **−0.54 (GSMF)**. SRTG, the cleanest and largest "real"
holdco, has a **basket-β of just 0.33** — i.e. it barely co-moves with the rest of the
group, because its NAV is a *specific* coal+auto+tower portfolio, not a generic
"holding-company" factor. There is **no single economic factor** that ties a Bakrie coal
holdco, an MNC media/financial holdco, and a hospitality holdco together except the
*structural form* (a listed wrapper trading at a discount to a portfolio of stakes).

**Current kept-driver set (`output/financials_investment.json`, 6/32 kept):**
`jci` (the only structural driver, corr +0.33, **circular market beta**), plus five
**banking/multifinance** CEIC prints with the *wrong* economic content —
`CEICI481150147`/`...117` (bank NIM by KBMI tier), `CEICI462440337`/`...047` (multifinance
two-wheeler / freight-car financing volumes), `CEICI344102402` (bank BOPO efficiency
ratio). The current `mapping.py` seed:

```python
"Investment": {
    "ceic": [("Banks", None)],
    "ceic_exclude": ["pt bank", "syariah indonesia"],  # endogenous single-bank
    "globals": [("bcom", "demand", +1, "diversified asset beta")],
    "macro": [("id_gdp_real_q", "demand", +1, "portfolio earnings"),
              ("id_10y", "macro", -1, "discount rate on holdings")],
},
```

**The gap, stated precisely.** The seed feeds the basket **147 CEIC candidates that are
ALL banking/insurance/multifinance/sharia-prudential series** (tally from worklist:
*38 Banking-Prudential, 30 Insurance Premiums, 30 Multifinance, 29 Sharia-BSI, 18 Loan
Demand, 1 BOPO, 1 P2P*). **Not one of these describes what a holding company owns.** SRTG
does not earn a net interest margin; it owns *coal* (ADRO/Alamtri), *auto retail* (MPMX)
and *towers* (TBIG). The engine is therefore reading a coal-levered NAV vehicle through
**bank NIM and insurance premiums** — a category error baked in by `("Banks", None)`. The
only thing that survives is `jci` (circular), and the only honest commodity hook (`bcom`)
**was anchored but did not make the kept set** (it failed the gate). The −0.13 anti-
predictive IC is the symptom of mapping a NAV/discount basket onto the banking tree.

**The model output confirms incoherence:** verdict **NEUTRAL [50/100, low conf]**,
`model_conflict=true` (demand_tilt −0.075 vs supply_tilt +0.095 — the spurious bank/
multifinance drivers pull opposite ways and net to noise), `theory_agree=33%`,
`max|corr|=0.33` (all of it `jci`). The two-driver multivariate is `jci` + a freight-car
financing print, R² 0.12, of which `jci` does essentially all the work (`std_beta` 0.029,
t 3.28, p 0.001; the CEIC leg t −0.87, p 0.39).

---

## 2. Economic structure — how a NAV-discount holdco return is built

A listed investment holding company's market value is, to first order:

```
HoldCo_MktCap   =   NAV   ×   (1 − Discount)
NAV             =   Σ_i  stake_i × MktValue_i(stake)          (look-through portfolio)
HoldCo_return   ≈   w_look-through · Σ_i ω_i · r_i(holding)    +   Δ(−Discount)   +   Δ(net cash/leverage)
```

There is **no revenue identity of its own** (no price × volume, no cost stack). The
return decomposes into exactly three blocks, each a distinct driver branch:

**(a) Look-through portfolio return — the dominant block.** The holdco *is* its
underlying stakes. For SRTG the look-through is concentrated:

| SRTG stake | Listed? | RIC | w_obs | underlying driver family |
|---|---|---|---|---|
| **ADRO / Alamtri (Adaro)** | yes | `IDX:ADRO` (793) · `IDX:ADMR` (223) | deep | **thermal coal** (API2/HBA), China power demand, IDR |
| **MPMX (Mitra Pinasthika)** | yes | `IDX:MPMX` (669) | deep | auto retail/financing — vehicle sales, rates, income |
| **TBIG (Tower Bersama)** | yes | `IDX:TBIG` (793) | deep | tower lease / telco capex / **rates (REIT-like duration)** |
| Private (Saratoga power, etc.) | no | — | — | infra / GDP |

So **SRTG's NAV is heavily coal-weighted** (ADRO+Alamtri historically the single largest
slug), with an auto-retail sleeve and a rate-sensitive tower sleeve. **The look-through is
constructible from real price series we already hold** (ADRO/ADMR/MPMX/TBIG all have weekly
history) — this is the central wiring opportunity of §9. BNBR's look-through is *also*
coal-heavy (Bakrie group: BUMI coal, ENRG oil&gas, DEWA mining services) — `IDX:BUMI`,
`IDX:ENRG`, `IDX:DEWA` are all in the catalog (793 wk each). The two dominant names share a
**coal/commodity terms-of-trade** factor; the small MNC/financial holdcos (BHIT/BCAP/VICO)
do not.

**(b) The discount swing — the mean-reverting block (why this is anti-predictive).**
Holdcos trade at a **discount to NAV** (typically 30–60% on IDX) that *itself* fluctuates
with sentiment, liquidity, governance perception and "is the parent monetising?" The
discount **mean-reverts**: when commodities rally and NAV jumps, the discount often *widens*
(the market doesn't fully credit the paper gain), damping the holdco return below the pure
look-through; when sentiment sours the discount narrows from extreme levels. This discount
dynamic is **the structural reason a NAV-up signal does not forecast a holdco-return-up next
month** — the discount absorbs and reverses part of the move. There is no clean series for
the discount (it is `1 − HoldCoMktCap/NAV`, partly endogenous), but its *behaviour* is the
key to §8's verdict.

**(c) Net cash / leverage.** SRTG is lowly geared (net-cash at times); BNBR is highly
geared (the β of 1.55 is balance-sheet leverage amplifying the equity). Leverage is why
BNBR is a high-β commodity-sentiment call option and SRTG is a steadier NAV proxy.

**What a sell-side analyst watches:** (1) the **look-through NAV mark** (driven by ADRO,
MPMX, TBIG closing prices — they literally re-mark daily), (2) the **discount-to-NAV** vs
its own history (is it cheap?), (3) **monetisation catalysts** (divestments, dividends up
from holdings), (4) the **commodity cycle** (because the largest stake is coal). The first
and fourth are *quantifiable from prices we hold*; the second and third are sentiment/event
and are where the forward-unpredictability lives.

**Intra-basket dispersion (the deepest problem).** A single sign prior is structurally
wrong for a basket whose betas span −0.54 to +1.55. The equal-weight target averages a
coal-NAV proxy (SRTG), a levered coal option (BNBR), and a clutch of uncorrelated micro
financial holdcos — washing out exactly the coal signal that *is* real in the two big names.

---

## 3. DEMAND driver tree (what lifts the look-through NAV)

> Sign = a-priori on the basket's return. LEAD = expected months the series moves
> *before* the equities. The genuine forecast candidates are the **liquid commodity
> prices** that lead the coal NAV; the CEIC quantity prints are attribution-only.

```
DEMAND  (= look-through NAV uplift)
├── D1  COAL / commodity NAV beta  (SRTG via ADRO/Alamtri; BNBR via BUMI)   [CORE — the real demand factor]
│   ├── D1a  API2 thermal coal ........ wb_coal_au → ICEEUR:ATR1! (market, w=782) — WIRED-able, NOT in seed
│   │         role demand · sign +1 · LEAD 1–3m · coal price re-marks ADRO/Alamtri NAV; liquid, exogenous, weekly → THE forecast candidate
│   ├── D1b  broad commodity beta ...... bcom → AMEX:DBC (market, w=800) — ANCHORED but FAILED GATE
│   │         demand · +1 · LEAD 0–1m · diversified NAV proxy; too broad → diluted by SRTG's coal specificity (use coal directly, D1a)
│   └── D1c  China thermal-coal demand .. cn_ip_yoy (aCNIP) · cn_pmi_mfg (aCNPMIMT)
│             demand · +1 · LEAD 2–4m (China IP/PMI leads API2, which leads ADRO NAV) — the parent of D1a
├── D2  LOOK-THROUGH equity marks (the most direct NAV read)               [DIRECT — currently UNUSED]
│   ├── D2a  ADRO/Alamtri price ........ IDX:ADRO (w=793) · IDX:ADMR (w=223)  demand · +1 · LEAD 0m (≈ NAV itself)
│   ├── D2b  MPMX price ................ IDX:MPMX (w=669)                       demand · +1 · LEAD 0m (auto-retail sleeve)
│   └── D2c  TBIG price ................ IDX:TBIG (w=793)                       demand · +1 · LEAD 0m (tower sleeve)
│             ⚠ these are NAV marks — coincident by construction. Great for ATTRIBUTION, near-zero forward lead. See §8 caveat.
├── D3  Portfolio EARNINGS / macro cycle                                    [cycle, lagging]
│   ├── D3a  Real GDP YoY ............. id_gdp_real_q (aIDGDPAR1) — WIRED  demand +1 · LEAD ~0 (quarterly, pub-lagged)
│   └── D3b  IDX net foreign buy ...... CEIC14620601 (id Capital Mkts, n=405) — NOT reachable (id-plane)
│             demand · +1 · LEAD 0 · holdcos are illiquid small/mid-caps; flow drives the discount
└── D4  AUTO sleeve demand (MPMX, BNBR-adjacent)                            [secondary]
    └── D4a  vehicle financing/sales ... CEICI462440337 (2W) etc — currently KEPT but emp_sign −1 (theory_agree=false)
              demand · prior +1 · the engine kept these with the WRONG sign — they are noise for a coal-NAV basket
```

**Forecast hypothesis (demand).** The only demand leaf with a credible *lead* is **D1a
(API2 coal)** and its parent **D1c (China IP/PMI)** — liquid, exogenous, weekly prices that
re-mark the dominant ADRO/Alamtri slug 1–3 months before the holdco fully reflects it. The
**look-through marks (D2)** are mechanically *coincident* (they ARE the NAV), so they are
the best **attribution** lens and the worst **forecast** input. The CEIC banking/multifinance
prints the engine currently kept (D4a) are economically irrelevant to a coal/auto/tower NAV
and should be removed — they are the source of `model_conflict` and the `theory_agree=33%`.

---

## 4. SUPPLY / COST driver tree (a holdco's "cost" = the discount + the rate on the discount)

A holding company has **no physical output and no input cost stack of its own.** Its
"supply/cost" side is (i) the **discount to NAV** (the wrapper's friction) and (ii) the
**input costs of its underlying holdings**, which only matter *through* the look-through.

```
SUPPLY / COST
├── S1  Discount-to-NAV widening  (the holdco-specific "cost")             [ENDOGENOUS / mean-reverting — see §8]
│   └── = 1 − HoldCoMktCap/NAV — no clean exogenous series; partly the basket's own output.
│         EXCLUDE as a driver (circular); but it is the mechanism behind the negative IC.
├── S2  Look-through INPUT costs (only via the holdings)                   [cross-industry, second-order]
│   ├── S2a  diesel/fuel for ADRO/BUMI mines .... brent → ICEEUR:BRN1! (w=800)  cost · −1 · LEAD 1–3m (AISC of coal sleeve)
│   └── S2b  coal-royalty / DMO regime .......... CEICI354326367 HBA ref price (id, n=210) — admin coal anchor
│             cost/revenue ambiguous · the HBA sets ADRO's realised price floor + royalty base
├── S3  Net leverage / funding (BNBR especially)                          [balance-sheet]
│   └── S3a  cost of debt .............. id_10y / id_bi_rate (see §5) — the levered holdco's interest burden
│             cost · −1 · BNBR's 1.55 β is leverage; a rate-rise hurts the geared wrapper disproportionately
└── S4  ENDOGENOUS bank/multifinance prints  (EXCLUDE — current bug)
    └── CEICI481150147/...117 (bank NIM), CEICI344102402 (BOPO), CEICI462440337/...047 (mf financing)
          These are OTHER sub-industries' outcome ratios, currently KEPT with null/wrong priors.
          They are NOT this basket's supply. REMOVE via tighter ceic scope (see §9).
```

**Endogeneity verdict.** The holdco "supply" side is almost entirely **the discount** (S1),
which is *endogenous to the basket's own price* and must be excluded as a driver even though
it is the economic crux. The only admissible cost leaves are **second-order, through the
holdings** — diesel/AISC for the coal sleeve (S2a) and the rate on leverage (S3a). The bank
NIM / BOPO / multifinance series the engine currently kept (S4) are **not costs of this
basket at all** — they leak in from `("Banks", None)` and are the direct cause of the
spurious `supply_tilt +0.095` and the model conflict. **The single highest-value fix is to
stop feeding this basket the banking tree.**

---

## 5. MACRO / RATE / FX / FLOW — the discount rate and the dollar

This is where a NAV-discount basket's *non-commodity* variance lives: the **discount rate**
on the holdings (TBIG towers and the SOTP multiple are duration-sensitive), the **dollar**
(coal/ADRO revenue is USD; IDR is the translation), and **risk appetite / flow** (holdcos
are illiquid mid-caps whose discount blows out in risk-off).

```
MACRO / RATE / FX / FLOW
├── M1  Domestic discount rate / duration                                 [the rate leg of the discount]
│   ├── id_10y ........ TVC:ID10Y (corr, w=798) — WIRED, sign −1 · LEAD 0–1m
│   │     mechanism: SOTP discount rate; TBIG tower-lease cashflows are REIT-like (long-duration);
│   │     a yield fall lifts the multiple on the holdings and narrows the discount.
│   └── id_bi_rate ... ECONOMICS:IDINTR — policy parent of id_10y · sign −1 (cuts bullish for geared holdcos)
├── M2  USD / IDR  (the coal-revenue translation, two-sided)              [FX]
│   └── usdidr ........ FX_IDC:USDIDR (corr, w=801) — NOT in seed
│         sign AMBIGUOUS-to-NEGATIVE: +helps ADRO/coal USD revenue (NAV up) BUT −risk-off for illiquid
│         holdco discounts. For a coal-heavy NAV the revenue channel can dominate → test sign, don't force.
├── M3  GLOBAL discount rate / dollar  (EM-duration & flow)               [global]
│   ├── us_10y ........ TVC:US10Y (corr, w=800) — sign −1 · global EM-duration / risk-free on the SOTP
│   └── dxy ........... key resolves to TVC:BBDXY which is EMPTY (w=0) — DEAD (see §7 data bug); real id TVC:DXY (w=800)
│         sign −1 · strong dollar = EM small-cap outflow = discount widening
└── M4  Risk appetite / flow  (illiquid mid-cap discount driver)          [flow]
    └── IDX net foreign buy CEIC14620601 (id, n=405) — NOT reachable (id-plane resolver missing)
          sign +1 · holdco discounts narrow on inflow, blow out on outflow — but FLOW MEAN-REVERTS monthly (§8)
```

**The honest read on the macro branch.** `id_10y` (−1) is the most defensible *fundamental*
macro driver — it sets the SOTP discount and the TBIG/tower multiple — and it is wired. But
the variance that actually dominates the holdco's monthly return is **(a) the coal NAV
(§3 D1)** and **(b) the discount swing (§4 S1)**, and the discount swing is a
**mean-reverting, flow-driven** thing that no level driver forecasts. USD/IDR is genuinely
two-sided here (unlike most baskets): a weaker IDR *raises* the rupiah value of ADRO's USD
coal revenue (NAV+) but signals risk-off for an illiquid wrapper (discount+). Let the data
decide the sign rather than forcing −1.

---

## 6. Cross-industry linkages — this basket IS a re-use of other trees

By construction a holdco's drivers are *other sub-industries' outputs*. The explicit map:

| Look-through sleeve | borrows from category | series tags |
|---|---|---|
| **Coal NAV** (SRTG←ADRO/Alamtri; BNBR←BUMI) | **Energy / Coal** + market | `ICEEUR:ATR1!` (API2), `CEICI354326367` (HBA), `cn_ip_yoy`/`cn_pmi_mfg`, **`IDX:ADRO`/`IDX:ADMR`/`IDX:BUMI` marks** |
| **Auto-retail** (SRTG←MPMX) | **Consumer Cyclicals / Auto** + Multifinance | `IDX:MPMX` mark; vehicle-sales/financing (used as *attribution*, not the kept bank prints) |
| **Towers** (SRTG←TBIG) | **Infrastructure / Tower** | `IDX:TBIG` mark; `id_10y` / `us_10y` (REIT-like duration) |
| **Oil & gas** (BNBR←ENRG) | **Energy / Oil & Gas** | `ICEEUR:BRN1!` (Brent) |
| Discount-rate / leverage | rates | `id_10y`, `id_bi_rate`, `us_10y` |
| FX translation | FX | `usdidr` |

So the Investment model should be a **weighted re-use of the Coal, Auto/Multifinance,
Tower, and Oil&Gas trees** — exactly as the Conglomerate (ASII) file does its SOTP. The
cleanest wiring (the look-through marks, §9) *implicitly* borrows all of these at once,
because ADRO/MPMX/TBIG prices already embed their own driver trees.

**JCI is NEVER a legitimate driver** — but it is the engine's current top driver here. The
basket members (BNBR/SRTG/BHIT…) *are* constituents of the index; using `jci` is **circular
market beta**, the exact pattern the brief and the Banks/Insurance files forbid. It must be
removed (§9). Its +0.33 correlation is just "small-cap holdcos move with the market," not a
fundamental driver, and it is structurally why the engine looks like it "explains" 12% of
variance while forecasting nothing.

---

## 7. Currently wired vs available (the "what we COULD add")

| Driver | Series (RIC) | n / w_obs | plane / reachable? | wired now? | priority |
|---|---|---|---|---|---|
| **JCI** | IDX:COMPOSITE | w800 | corr | ✅ kept (top driver) | **REMOVE — circular market beta** |
| **API2 coal** | ICEEUR:ATR1! (`wb_coal_au`) | w782 | global (corr) | ❌ | **HIGH — the real NAV-beta forecast candidate** |
| broad commodity | AMEX:DBC (`bcom`) | w800 | global (corr) | ⚠️ anchored, **failed gate** | MED — too broad; prefer coal directly |
| **ADRO/Alamtri mark** | IDX:ADRO / IDX:ADMR | w793 / 223 | corr (needs new key) | ❌ | **HIGH (attribution) — direct NAV read** |
| **MPMX mark** | IDX:MPMX | w669 | corr (needs new key) | ❌ | MED (attribution) |
| **TBIG mark** | IDX:TBIG | w793 | corr (needs new key) | ❌ | MED (attribution) |
| BUMI/ENRG/DEWA mark (BNBR) | IDX:BUMI/ENRG/DEWA | w793 | corr (needs new key) | ❌ | LOW (attribution, BNBR sleeve) |
| China IP / PMI | aCNIP / aCNPMIMT | live | global | ❌ | MED — parent that LEADS coal |
| id_10y (discount rate) | TVC:ID10Y | w798 | macro (corr) | ✅ −1 | keep |
| BI rate | ECONOMICS:IDINTR | w186 | macro (corr) | ❌ | MED — policy parent, cuts bullish for geared holdcos |
| us_10y | TVC:US10Y | w800 | macro (corr) | ❌ | MED — global EM-duration |
| USD/IDR | FX_IDC:USDIDR | w801 | macro (corr) | ❌ | MED — two-sided (coal revenue vs risk-off), test sign |
| **DXY** | key→**TVC:BBDXY (EMPTY w0)** | — | macro (corr) | ❌ | **dead key — repoint to TVC:DXY (w800) or skip** |
| Brent (coal AISC) | ICEEUR:BRN1! | w800 | global (corr) | ❌ | LOW — second-order cost |
| Real GDP | aIDGDPAR1 | live | macro | ✅ +1 | keep (attribution) |
| IDX net foreign buy | CEIC14620601 | 405 | id-plane (no resolver) | ❌ | MED — discount/flow, needs resolver |
| **Bank NIM / BOPO / multifinance prints** | CEICI481150147 / 344102402 / 462440337… | 43–91 | CEIC (`Banks` scope) | **✅ kept (BUG)** | **REMOVE — wrong sub-industry; cause of model_conflict** |

**The category-error problem (critical for §9).** The seed's `ceic: [("Banks", None)]`
feeds **147 banking/insurance/multifinance candidates**, none of which is what a holdco
owns. The engine, lacking any coal/look-through driver, latches onto whatever clears the
gate — which is `jci` (circular) plus a handful of bank/mf prints that survive on noise with
the *wrong* sign (`theory_agree=33%`). The fix is twofold: **(1) remove the Banks CEIC scope
entirely** (it is structurally irrelevant), and **(2) add the real NAV drivers** — coal
price as the forecast candidate and the look-through marks as attribution. The look-through
marks need a **new resolver path**: the engine only resolves global keys through
`GLOBAL_CORR` → `correlation.sqlite` (`drivers._global_history`, line 71), so wiring
`IDX:ADRO` as a driver requires registering a new `GLOBAL_CORR` key (e.g.
`"holdco_adro": "IDX:ADRO"`). The plumbing is trivial (same path as `jci`→`IDX:COMPOSITE`);
the *honesty caveat* (these are coincident NAV marks) is in §8.

---

## 8. Forecastability — the honest verdict (the most important section)

**The fact to explain:** Investment has forward IC **−0.13** at the **10th placebo
percentile** — anti-predictive, and sitting in the financials cluster that BACKTEST.md
explicitly says *"co-move with their drivers contemporaneously but mean-revert, so the
posture does not forecast… read as a contemporaneous attribution, NOT a forecast."*
Contemporaneous-ref IC is *also* negative (−0.12) — so the current set is a poor explainer
*and* a poor forecaster, because it is reading the **wrong tree** (banks, not coal). Three
structural reasons, in order of importance:

**(1) The discount-to-NAV mean-reverts — this is the core mechanism.** A holdco return is
`look-through NAV change + discount swing`. When coal rallies and the ADRO-heavy NAV jumps,
the discount typically *widens* (the market under-credits the paper mark), so the holdco
return *lags* the NAV up-move — and then partially *reverses* as the discount re-converges.
A signal that reads "NAV looks strong now" is reading the *top* of a move that the discount
will fade. **A contemporaneously-true NAV signal becomes a forward-wrong forecast** precisely
because the discount is a mean-reverting wedge between NAV and price. This is the holdco
analogue of the flow-mean-reversion that makes Banks/Securities anti-predictive.

**(2) The current driver tree is the wrong sub-industry.** Even before mean-reversion, the
engine has *no coal driver* — it reads SRTG (a coal-levered NAV) through bank NIM and
multifinance two-wheeler financing. Those have no causal link to a coal/auto/tower portfolio,
so they contribute noise with unstable signs (`theory_agree=33%`, `model_conflict=true`). A
chunk of the −0.13 is simply **mis-specification**, not an irreducible property of holdcos.

**(3) Equal-weight averages away the one real signal.** The basket β spans −0.54 to +1.55.
The coal-NAV signal is real in SRTG and BNBR but absent in the MNC/financial micro-holdcos;
equal-weighting dilutes the coal factor with uncorrelated discount noise from the tail.

**Does the look-through commodity exposure give a forward edge? Branch-by-branch:**

| Branch | Forward-skill verdict |
|---|---|
| **API2 coal price (D1a)** + China IP/PMI parent (D1c) | **The only real hope.** Liquid, exogenous, weekly; leads the ADRO/Alamtri NAV by 1–3m. *Coal itself forecasts* (Coal basket OOS +0.23) — the question is whether the **discount** lets that lead survive to the holdco. Likely **partially**: the coal lead is real but the discount damps/reverses it. Worth a dedicated OOS test; expectation is a *weak positive*, not the +0.23 of pure coal. |
| **Look-through marks ADRO/MPMX/TBIG (D2)** | **No (forward) — yes (attribution).** They ARE the NAV; coincident by construction. Best attribution lens ("SRTG fell because ADRO fell"), ~zero forward lead. Use to *explain*, never to *forecast*. |
| **id_10y discount rate (M1)** | **Weak.** Real fundamental channel (SOTP + TBIG duration) but rate moves are anticipated; modest forward content at best. |
| **USD/IDR (M2)** | **No as level; two-sided.** Coal-revenue+ vs risk-off−; nets ambiguous; mean-reverts. Attribution only. |
| Bank NIM / multifinance prints (current kept set) | **Negative — remove.** Wrong sub-industry; the source of the anti-predictiveness via spurious sign-flipping. |
| **JCI** | **Circular — remove.** Not a forecast, just market beta on index constituents. |

**The verdict.** *Investment/holdcos is fundamentally a **NAV-discount + market-beta
basket**, and on the current (mis-specified) tree it is anti-predictive. The look-through
commodity exposure — chiefly **thermal coal via SRTG's ADRO/Alamtri stake and BNBR's BUMI
stake** — is **real and is the one branch with any forward hope**, because coal prices
genuinely lead and the Coal basket itself forecasts (+0.23). But the **discount-to-NAV
mean-reversion** sits between the coal lead and the holdco return and is expected to **damp
most of that edge**. The honest target is: (a) **fix the mis-specification** — strip the
banking tree and `jci`, wire coal price (forecast candidate) + look-through marks
(attribution) — which should move the IC **from −0.13 toward neutral** by removing the
wrong-sign noise; and (b) make a **bounded, falsifiable attempt** at forward skill via
**API2 coal + China IP/PMI**, keeping it only if the blindfolded forward IC improves. The
expected best case is **a coal-conditioned attribution** — "SRTG/BNBR moved because the coal
NAV moved, modulated by the discount" — with **forecast=low**, NOT a positive-skill basket.
This is a **discount/beta basket whose verdict should be shipped as attribution**, with the
coal look-through as the named driver of the move.**

---

## 9. Engine-wiring spec — concrete `mapping.py` changes

**Current seed (for reference):**
```python
"Investment": {
    "ceic": [("Banks", None)],
    "ceic_exclude": ["pt bank", "syariah indonesia"],
    "globals": [("bcom", "demand", +1, "diversified asset beta")],
    "macro": [("id_gdp_real_q", "demand", +1, "portfolio earnings"),
              ("id_10y", "macro", -1, "discount rate on holdings")],
},
```

**Three tiers, each independently A/B-testable against `backtest/bt.py "Investment"`.
Adopt only what holds/improves forward IC.**

### Tier 1 — fixes reachable with TODAY's engine (no new resolver) — do first

```python
"Investment": {   # NAV-discount holdcos: SRTG (coal via ADRO/Alamtri + MPMX + TBIG), BNBR (Bakrie coal), MNC/financial tail
    "ceic": [],   # REMOVE ("Banks", None): holdcos do NOT earn NIM/premiums. The banking tree
                  # is the wrong sub-industry and is the direct cause of model_conflict + theory_agree=33%.
    "globals": [
        ("wb_coal_au", "demand", +1, "API2 thermal coal = SRTG(ADRO/Alamtri)+BNBR(BUMI) NAV beta — the real forecast candidate (LEADS 1-3m)"),
        ("cn_ip_yoy",  "demand", +1, "China IP — parent that leads thermal-coal demand → coal NAV"),
        ("cn_pmi_mfg", "demand", +1, "China mfg PMI — coal-demand pulse"),
        # ("bcom", "demand", +1, ...) — drop or keep small: too broad, already fails the gate vs coal-specific NAV
    ],
    "macro": [
        ("id_10y",       "macro", -1, "SOTP discount rate + TBIG tower duration (narrows discount on a yield fall)"),
        ("id_bi_rate",   "macro", -1, "policy parent; rate cuts bullish for geared holdcos (BNBR leverage)"),
        ("usdidr",       "macro",  0, "TWO-SIDED: +ADRO USD coal revenue (NAV up) vs -risk-off discount widening — let data decide"),
        ("us_10y",       "macro", -1, "global EM-duration / risk-free on the SOTP"),
        ("id_gdp_real_q","demand", +1, "portfolio earnings backdrop (attribution)"),
    ],
    # NB: jci is the engine BENCHMARK and is excluded from drivers by design — but verify it is
    # NOT being injected as a candidate here (it is currently the kept top driver = circular). If a
    # fallback path is adding it, add jci to an explicit driver-exclude. The basket members ARE index
    # constituents, so jci is market beta, not a fundamental driver.
}
```
- **Remove the Banks CEIC scope and `jci`** — the two changes that fix the *mis-specification*
  half of the −0.13. This alone should lift `theory_agree` and kill `model_conflict`.
- **Add `wb_coal_au` (API2)** — already a working `GLOBAL_CORR` key (→`ICEEUR:ATR1!`, w=782);
  zero plumbing. This is the single highest-value addition: the real NAV-beta and the only
  forecast candidate.
- **Add China IP/PMI** (`cn_ip_yoy`, `cn_pmi_mfg`) — the leading parents of coal demand.
- **`usdidr` sign 0** (not −1): for a coal-USD-revenue NAV the FX effect is genuinely two-sided.

### Tier 2 — look-through NAV marks (needs new `GLOBAL_CORR` keys — trivial, one line each)

The engine resolves global keys only via `GLOBAL_CORR` → `correlation.sqlite`
(`drivers._global_history`, line 71). The holdings' prices are all in the store with deep
weekly history, so register them as new keys and wire them as **attribution** drivers
(coincident NAV marks — keep them flagged, do not expect forward skill):

```python
# mapping.py GLOBAL_CORR — add (all confirmed in catalog/market.json with w_obs shown):
    "holdco_adro": "IDX:ADRO",   # w793 — SRTG flagship coal stake (Adaro)
    "holdco_admr": "IDX:ADMR",   # w223 — Alamtri/Adaro Andalan coal spin-off
    "holdco_mpmx": "IDX:MPMX",   # w669 — SRTG auto-retail sleeve
    "holdco_tbig": "IDX:TBIG",   # w793 — SRTG tower sleeve (REIT-like duration)
    "holdco_bumi": "IDX:BUMI",   # w793 — BNBR/Bakrie coal stake
```
Then add to the Investment `globals` (each tested individually; kept only if it improves the
*attribution* coherence — these will NOT improve forward IC by construction):
```python
        ("holdco_adro", "demand", +1, "direct ADRO NAV mark (SRTG's largest stake) — ATTRIBUTION, coincident"),
        ("holdco_mpmx", "demand", +1, "MPMX NAV mark (auto-retail sleeve) — attribution"),
        ("holdco_tbig", "demand", +1, "TBIG NAV mark (tower sleeve) — attribution"),
```
**Honesty flag:** these are NAV *marks*, coincident by construction (§8). They belong in the
narrative ("SRTG moved because ADRO moved") and should carry a low forward weight; do not let
them dominate the forecast. The *forecast* job stays with the coal *price* (Tier 1, D1a).

### Tier 3 — the discount-conditioning transform (feature engineering)

The structural reason for the −0.13 is the **mean-reverting discount** (§8.1). Two options
for the engine owner, in priority order:

1. **Lead the cycle, not the mark.** Forecast from the **liquid coal price** (`wb_coal_au`)
   and **China IP/PMI** — the leaves that genuinely lead the NAV — and treat the look-through
   *marks* as coincident attribution with an explicit "coincident" tag, never as the forward
   signal. (Same discipline as the Conglomerate file: lead the cycle, not the print.)
2. **Optional discount-reversion guard.** If the engine can carry a per-basket transform,
   feed the coal-NAV signal as a *moderated* impulse (e.g. dampen when the trailing NAV move
   is already extreme), encoding "the discount fades big NAV jumps." This is speculative;
   only pursue if Tier 1–2 leave residual anti-predictiveness traceable to overshoot.

### Data bug to flag (not this file's to fix)

- **`dxy` GLOBAL_CORR key → `TVC:BBDXY` is EMPTY (weekly_obs 0).** Any basket relying on
  `dxy` (this one does not, post-fix) gets a dead resolver → spark fallback. The working
  series is **`TVC:DXY` (w=800)**. Flag for the engine owner: repoint `GLOBAL_CORR["dxy"]`
  to `TVC:DXY`. (Same caveat already noted in the master DATA-QUALITY list.)

### What to backtest (`backtest/bt.py "Investment"`), and the keep-rule

Ablation ladder; keep a change only if forward IC **improves or holds** with a more honest,
coherent tree (never an in-sample-only gain):
1. **Baseline** (current seed) → confirm fwd IC −0.13, placebo 0.10.
2. **+Tier 1 strip** (remove Banks CEIC + jci; add API2 coal + China IP/PMI; usdidr→0).
   *Expectation:* `model_conflict` clears, `theory_agree` rises, IC moves **−0.13 → toward 0**
   (mis-specification removed). This is the primary success criterion.
3. **+China IP/PMI as the lead** vs coal-price-only → keep whichever holds forward IC.
4. **+Tier 2 look-through marks** (ADRO/MPMX/TBIG) → expect **contemporaneous/attribution**
   coherence to rise, forward IC ≈ unchanged (coincident). Keep for the narrative only.

**Success = forward IC rises from −0.13 toward ≥0 (anti-predictiveness removed) with the
placebo percentile climbing off 0.10, and `model_conflict` cleared.** If, after Tiers 1–3,
the IC is still ≤0, the honest conclusion stands and is the *expected* one: **Investment is a
NAV-discount / market-beta basket whose discount mean-reverts; ship the verdict as a
coal-conditioned attribution (SRTG/BNBR ≈ a levered coal-NAV call), flag `forecast=low`, and
stop adding drivers.** Do **not** re-add the banking prints or `jci` to manufacture in-sample
fit — that is exactly what produced the anti-predictive result.

---

### Capsule (for IMPROVEMENT_PLAN §5 row 26)

> **Investment / Holdcos · Financials · 62T · OOS ✗−0.13 (anti-predictive, 10th pctile).**
> Current tree is the **wrong sub-industry**: `("Banks", None)` feeds 147 banking/insurance/
> multifinance prints to a basket that owns *coal/auto/towers*, and the only kept structural
> driver is **`jci` (circular market beta)**. Fix: **strip the Banks CEIC scope and jci**, add
> **API2 coal (`wb_coal_au`→ICEEUR:ATR1!)** as the real NAV-beta forecast candidate (SRTG is
> coal-levered via ADRO/Alamtri; BNBR via BUMI) + **China IP/PMI** as its leading parent + the
> **discount-rate** (`id_10y`/`id_bi_rate`, cuts bullish for geared holdcos) + **two-sided
> `usdidr` (sign 0)**. Add look-through NAV marks (`IDX:ADRO/ADMR/MPMX/TBIG/BUMI` via new
> GLOBAL_CORR keys) as **attribution** (coincident, not forecast). **Data bug:** `dxy`→`TVC:BBDXY`
> is empty; use `TVC:DXY`. Honest verdict: a **NAV-discount / market-beta basket** — the
> look-through coal gives a *weak* forward hook but the **discount mean-reverts**, so read it as
> a **coal-conditioned attribution**; target is moving IC from −0.13 toward neutral, not to skill.

---
*Series cited exist in `plan/catalog/{idind,id,market}.json`; empirical figures from
`output/financials_investment.json` + `backtest/results/financials_investment.json` +
`BACKTEST.md`. Members from `state/worklist.json`. The basket is ~75% two names (BNBR+SRTG),
both coal-levered NAVs trading at a discount — the verdict is an attribution of the
coal-NAV-minus-discount path, not a cross-sectional forecast.*
