# Insurance (Financials) — Deep Driver-Tree Plan

> Basket id **`financials_insurance`** · Sector Financials · ~Rp 152T mcap · 16 names.
> Status in BACKTEST.md: **grade needs_review · conf low · n_oos 129 · forward IC +0.15 ·
> hit−up +0.01 · placebo pctile 0.93 → flag: SKILL.** This is the **best-forecasting
> financials basket in the engine** and one of only twelve SKILL baskets overall — the
> *opposite* of Banks (−0.15, anti-predictive). The job of this file is to explain **WHY a
> 5-driver seed forecasts insurers when the identical-vintage Banks seed forecasts banks
> worse than a coin flip**, to name the mechanism (the float / investment-yield channel
> leads), and to *deepen the duration-yield branch* without breaking the skill — while being
> honest that the +0.15 is a **magnitude/tail** effect, not a directional-hit effect
> (hit−up is only +0.01).

---

## 1. Snapshot + the OOS-positive gap (the inverse of Banks)

**Members (equal-weighted target; mcap weight shown to expose the concentration trap):**

| RIC | Name | mcap | wt% | JCI β | what it is |
|---|---|---|---|---|---|
| `IDX:SMMA` | Sinarmas Multiartha | 115.7T | 76.3% | −0.20 | financial **holding co** (Sinarmas life/general + bank + multifinance) — NOT a pure insurer |
| `IDX:LIFE` | MNC Life / Asuransi Jiwa | 12.2T | 8.0% | +0.20 | life insurer (UL-heavy, market-linked book) |
| `IDX:PNLF` | Panin Financial | 7.6T | 5.0% | **−0.53** | life-insurance holding (Panin Dai-ichi Life) — strongly *negative* JCI beta |
| `IDX:TUGU` | Tugu Pratama | 4.1T | 2.7% | +0.14 | general (energy/marine/aviation P&C), large investment book |
| `IDX:PNIN` | Paninvest | 3.1T | 2.1% | −0.24 | general-insurance holding (Panin) |
| `IDX:LPGI` | Lippo General | 2.1T | 1.4% | +0.13 | general insurer |
| `IDX:ABDA` | Asuransi Bina Dana Arta | 2.1T | 1.4% | −0.12 | general insurer |
| `IDX:AMAG` | Asuransi Multi Artha Guna | 2.0T | 1.3% | −0.04 | general insurer (Sinarmas group) |
| `IDX:MTWI` `IDX:MREI` `IDX:AHAP` `IDX:ASRM` `IDX:ASJT` `IDX:VINS` `IDX:ASDM` `IDX:ASBI` | Maskapai/Mar.Re/Harta/Ramayana/Jasa Tania/Victoria/Dayin/Bintang | 0.14–0.80T | ≤0.5% ea | mixed | small general/re insurers |

**The concentration trap, resolved.** By *mcap* the basket is 76% SMMA — but the engine's
backtest target is the **equal-weighted** basket (BACKTEST.md §intro: "equal-weighted average …
the same baskets the engine uses"). Equal-weight ⇒ each name ≈ 6.25%, so the **signal's
variance is driven by the ~14 small/mid pure insurers (PNLF, PNIN, TUGU, ABDA, AMAG, ASRM,
LPGI, ASDM, …), not by the SMMA conglomerate.** This is *why* the basket behaves like a clean
"pure-insurer" instrument rather than a Sinarmas-holding-company proxy, and it is central to
the result: the equal-weight target is a **levered bet on Indonesian insurer investment
books**, which are overwhelmingly **fixed-income** (govvies + corporate bonds + time deposits).

**The β tell.** Most of the pure insurers carry **low-to-negative JCI beta** (PNLF −0.53,
PNIN −0.24, SMMA −0.20, ABDA −0.12, AMAG −0.04). These are **not market-beta / foreign-flow
names** the way the index banks are. A negative-beta, rate-sensitive, bond-heavy basket is a
**duration instrument**, and duration instruments are driven by *yields*, which are liquid,
exogenous, daily price series that **lead** — the exact category the backtest says forecasts.
This single structural fact is the seed of the +0.15.

**Current kept-driver seed (`mapping.py`, 5 candidates, all theory-anchored, 0 params fit):**
```python
"Insurance": {
    "ceic": [("Banks", "Insurance Premiums")],
    "globals": [],
    "macro": [("id_bi_rate",     "macro", +1, "investment yield on float"),
              ("us_10y",         "macro", +1, "long-bond reinvestment yield"),
              ("id_gdp_real_q",  "demand", +1, "premium growth")],
},
```
Plus the curated `("Banks","Insurance Premiums")` CEIC group (≈30 premium series, almost all
**annual**). Note what is **already right**: `us_10y` carries sign **+1** (rising long yield is
GOOD for an insurer — the reinvestment-yield channel), which is the *opposite* of the Banks
sign and is exactly why the insurer seed forecasts where the bank seed doesn't.

**The gap, stated precisely.** The skill exists *despite* the seed being thin and *despite* the
premium-demand branch being near-useless (annual, pub-lagged). The skill is carried almost
entirely by the **two yield drivers** (`id_bi_rate`, `us_10y`) and the **+1 sign** on them. The
gap is that **the single most important float series — the domestic long yield `id_10y`
(`TVC:ID10Y`, the IDR govvie the insurers actually reinvest into) — is NOT wired**, and the
yield channel is represented by only two coarse levels rather than the **reinvestment-yield Δ /
duration-MTM** structure that actually drives insurer earnings and book value. §§8–9 deepen this
without disturbing the working priors.

---

## 2. Economic structure — how an insurer actually makes money (two engines)

An insurer's profit has **two independent engines**, and Indonesian listed insurers earn the
*majority* of bottom-line from the **second** one:

```
Underwriting result  =  Earned Premium  −  Incurred Claims  −  Acquisition/Opex
                     =  Earned Premium × (1 − Combined Ratio)
Investment result    =  Investment Yield × Investable Assets ("the FLOAT")
                        + Realised/Unrealised MTM on the bond & equity book
Pre-tax Profit       ≈  Underwriting result  +  Investment result
Book Value Δ         ≈  Retained profit  +  ΔAFS-reserve (bond/equity MTM, OCI)
```

**(a) The FLOAT and its reinvestment yield — the earnings swing factor (why this has skill).**
An insurer collects premium *today* and pays claims *later*; in between it holds a large pool of
investable assets — **the float** — that is, for Indonesian life and general insurers,
**dominantly fixed-income**: government bonds (SUN/SBN), corporate bonds, and time deposits,
with a minority equity sleeve. The earnings sensitivity is therefore:
- **Reinvestment-yield channel (a *level/Δ* effect, POSITIVE):** when IDR/US yields **rise**,
  every maturing bond and new premium dollar is reinvested at a **higher** coupon → recurring
  investment income climbs over the following quarters. Higher-for-longer rates = a **structural
  earnings tailwind** for a bond-heavy insurer. This is the *opposite* of a bank, whose funding
  cost rises with rates. **This is the mechanism that leads the equities and produces the +0.15.**
- **Duration / MTM channel (a *book-value* effect, sign-nuanced):** the **stock** of AFS bonds is
  marked-to-market through OCI. A yield *spike* inflicts an immediate **negative** mark on the
  existing book (book value down), even as it improves *future* reinvestment. So the *instant*
  reaction to a yield jump can be negative (MTM hit) while the *multi-quarter* reaction is
  positive (yield pickup). The net a-priori sign on the *equity return* is **positive** because
  the market prices insurers off **forward earnings power** (recurring yield), and because these
  are low-duration-mismatch books where the reinvestment benefit dominates the transient mark —
  but the MTM nuance is real and is why a *Δ-yield* feature beats a raw *level* (§9).

**(b) Underwriting / combined ratio — the cost stack.** `Combined Ratio = Loss Ratio + Expense
Ratio`. Below 100% the book is underwriting-profitable; above 100% the insurer relies on
investment income to make money. The swing input is the **claims (loss) ratio**: catastrophe
events, motor/health frequency, FX-inflated repair/medical costs. Claims data is slow and
annual here (§4) — good for attribution, useless as a forecaster.

**(c) Premium growth (volume).** New business + renewals. Driven by GDP/income, credit-linked
cover (bancassurance, auto/KPR creditor insurance), and insurance *penetration* (premium/GDP,
structurally low in Indonesia → secular growth). Premium series are **annual** in the store
(§3) → attribution only.

**(d) Equity-book / UL mark (market-linked).** Life insurers with **unit-linked (UL)** products
pass investment risk to policyholders but still carry a proprietary equity sleeve, and UL fee
income scales with AUM, which scales with the equity market. This is a *market-beta* node — but
wiring it via JCI would be **circular** (the basket is in JCI). It must be reached through a
**bounded proxy** (§5), not the index.

**What a sell-side insurance analyst watches (in priority order):** (1) **investment yield /
new-money reinvestment rate** and the **bond-book duration** (the earnings swing); (2) the
**10Y govvie level and Δ** (book MTM + reinvestment); (3) **combined ratio** (underwriting);
(4) **premium growth & APE/new-business** (volume); (5) **solvency/RBC ratio** (a constraint,
endogenous). Items (1)–(2) are exactly the liquid, leading, daily yield series — which is why
this basket forecasts.

**Intra-basket dispersion.** Life names (LIFE, PNLF) skew to **duration + UL equity** (longer
bond books, UL AUM beta); general/P&C names (TUGU, ABDA, AMAG, ASRM, LPGI, small-caps) skew to
**short-tail underwriting + shorter-duration float**; reinsurers (MREI, MTWI) to claims cycle.
The equal-weight basket therefore blends a **long-duration life sleeve** with a **short-duration
P&C sleeve** — net it is a **mid-duration fixed-income proxy with a small UL-equity kicker**.
A single +1 yield prior fits the *whole* basket far better than a single rate prior fits the
heterogeneous bank basket — another reason this seed works where the Banks seed fails.

---

## 3. DEMAND driver tree (premium growth + the float's reinvestment opportunity)

> All series real + populated, cited with exact RIC + n_obs + last_obs. Sign = a-priori on the
> basket's *excess* return vs JCI. LEAD = expected months the series moves *before* the equities.
> Plane tag flags how the engine can reach it (idind `CEICI…` = `ceic` plane; id `CEIC…` =
> needs the `ID_MACRO_OBS` resolver of §9; market id = `GLOBAL_CORR`/corr plane).

```
DEMAND
├── D1  Reinvestment-yield OPPORTUNITY (the float's "demand for yield") [LEADING — the engine's edge]
│   ├── D1a  ID 10Y govvie yield ......... TVC:ID10Y  (market, w≈798, key id_10y) — NOT WIRED ❗
│   │         sign +1 · LEAD +1 to +3 · the IDR govbond the float reinvests into; a higher level
│   │         lifts recurring investment income over the next 1–3 quarters. THE single most
│   │         important missing driver — wire it.
│   ├── D1b  BI policy rate ............... ECONOMICS:IDINTR (corr, key id_bi_rate) — WIRED +1
│   │         sign +1 · LEAD +1–2 · sets the time-deposit & short-bond reinvestment rate on the
│   │         short-duration P&C float; the *level* anchor the seed already uses.
│   ├── D1c  US 10Y ....................... TVC:US10Y (market, w≈800, key us_10y) — WIRED +1
│   │         sign +1 · LEAD +1–2 · global discount/EM-yield anchor; ID yields track it. The
│   │         co-mover that makes the yield branch robust.
│   └── D1d  ID 1Y / short curve .......... TVC:ID01Y (market, w≈793, key id_01y) — NOT WIRED
│             sign +1 · LEAD +1 · the short-end reinvestment rate for the P&C/time-deposit sleeve.
├── D2  Premium growth (volume) — the slow demand engine          [ATTRIBUTION ONLY]
│   ├── D2a  Life net premium income ...... CEICI479948257 (idind, P1M, n=135, last 2026-03) — reachable
│   │         sign +1 · LEAD ~0 (coincident, pub-lagged) · the ONLY monthly premium series in the
│   │         whole complex — usable, but coincident not leading.
│   ├── D2b  Life premium: Total .......... CEICI254354603 (idind, P1Y, n=30) — reachable, ANNUAL
│   ├── D2c  Non-life premium earned ...... CEICI252415902 (idind, P1Y, n=37) — reachable, ANNUAL
│   │         sign +1 · LEAD ~0 · P&C top-line; annual ⇒ attribution, weak forecaster.
│   └── D2d  Non-life premium written ..... CEICI252416002 (idind, P1Y, n=37) — reachable, ANNUAL
├── D3  Macro demand for cover (penetration cycle)                [cycle, slow]
│   ├── D3a  Real GDP YoY ................. aIDGDPAR1 (key id_gdp_real_q) — WIRED +1 · LEAD ~0 (quarterly, lags)
│   │         premium-penetration grows with income; the secular demand backdrop.
│   └── D3b  Consumer confidence .......... aIDCONIAR (key id_consumer_confidence, P1M, n≈196) — NOT WIRED
│             sign +1 · LEAD +1–2 · expected-income/durables intent leads new-policy & creditor-cover demand.
└── D4  Credit-linked / bancassurance demand                      [cross-industry, §6]
    ├── D4a  System bank credit YoY ....... aIDLONYAR (key id_bank_credit) — NOT WIRED
    │         sign +1 · LEAD +1 · KPR/auto/working-capital credit drags creditor & bancassurance premium.
    └── D4b  Consumption / KPR credit ..... CEIC230931602 / CEIC389692087 (id, n=279/119) — needs resolver
              sign +1 · LEAD +1 · the mortgage/auto books that carry attached creditor insurance.
```

**Forecast hypothesis for DEMAND.** The premium-volume branch (**D2, D3a**) is *annual /
quarterly, publication-lagged* — strong for attribution, weak as a forecaster (IMPROVEMENT_PLAN
§3 rule). The forecast power lives entirely in **D1 — the reinvestment-yield opportunity** —
because yields are **liquid, exogenous, daily prices that move months before** the realised
investment-income line and the re-rating. **D1a (ID10Y, currently unwired) and the already-wired
D1b/D1c are the engine's whole edge.** D4 (consumer confidence, credit) is a *secondary*
leading candidate worth a bounded test.

---

## 4. SUPPLY / COST driver tree (claims + the duration MTM cost)

An insurer's "cost stack" is **incurred claims** (the combined ratio) plus the **mark-to-market
cost of a yield spike on the existing bond book**. The discipline: most claims/ratio data is slow
and annual (attribution), and **solvency/RBC ratios are endogenous outcomes that must be
excluded** (they co-move mechanically with insurer equity).

```
SUPPLY / COST
├── S1  Claims / combined ratio (underwriting cost)               [ATTRIBUTION — lagged, annual]
│   └── S1a  Loss/claims ratio — no clean separate RIC; embedded in premium-earned vs claims annual
│             prints (idind Insurance Premiums block). sign −1 · LEAD lagging · use Δ if at all;
│             ANNUAL ⇒ attribution only. (No monthly claims series exists in the store.)
├── S2  Duration / MTM cost of a yield SPIKE on the existing book [the sign-nuance node]
│   └── S2a  Δ(ID10Y), large positive jumps .. TVC:ID10Y differenced (market, key id_10y)
│             sign −1 ON THE STOCK (a yield spike marks the AFS book down through OCI), +1 on the
│             FLOW (future reinvestment). Net equity sign is +1 (earnings-power dominates), but the
│             *transient* MTM is why a Δ-yield feature (§9) beats a raw level — a yield *spike*
│             hurts book first, helps earnings later.
├── S3  Imported claims / FX cost                                 [minor cost]
│   └── S3a  USD/IDR .......................... FX_IDC:USDIDR (corr, key usdidr) — NOT WIRED
│             sign −1 (weak) · LEAD ~0 · IDR weakness inflates USD-denominated reinsurance cost and
│             imported repair/medical claims for motor/health/marine lines; second-order.
└── S4  Float SIZE (technical reserves)  — endogenous-ish, caution [DO NOT wire naively]
    └── S4a  Insurance Technical Reserves ..... CEIC224777801 (id Money Supply, P1M, n=292, last 2026-03)
              the *size* of the industry float (reserves the reinvestment is earned on). Tempting as a
              float-scale demand proxy, BUT it is the insurance sector's OWN balance-sheet liability →
              co-moves with the basket's own book ⇒ treat as ENDOGENOUS, EXCLUDE (see §7/§9).
```

**Endogeneity verdict.** Only **S2a (Δ ID10Y)** and **S3a (USD/IDR)** are admissible leading
cost inputs; **S1 claims is annual attribution**; **S4a technical-reserves and any RBC/solvency
ratio are endogenous outcomes — exclude.** The cost side adds little forecast power; the
basket's skill is a *demand-side (reinvestment-yield)* story, not a cost story — the mirror image
of a commodity producer.

---

## 5. MACRO / RATE / FX / FLOW — the branch that IS the thesis

For insurers the macro branch is **not** a backdrop — it **is** the primary earnings driver,
because the float's return *is* a macro variable (the yield curve). This is the structural reason
insurers forecast and banks don't: a bank's rate exposure is **ambiguous and regime-dependent**
(funding cost vs asset yield, §Banks-file §2a), whereas an insurer's rate exposure is **clean and
one-signed** — higher yields ⇒ higher reinvestment income ⇒ higher forward earnings.

```
MACRO / RATE / FX / FLOW
├── M1  Domestic reinvestment yield  (the anchor)                 [CORE — partly wired]
│   ├── id_10y .......... TVC:ID10Y (corr, w≈798) — NOT WIRED ❗ sign +1 · LEAD +1–3
│   │     the IDR govvie the float reinvests into; the SINGLE most important add. Higher level =
│   │     structurally higher recurring investment income. Use the LEVEL (yield carry) and a Δ leg.
│   └── id_bi_rate ..... ECONOMICS:IDINTR (corr) — WIRED +1 · short-end reinvestment rate (P&C/TD float).
├── M2  Global discount rate / EM yield anchor                    [WIRED — the co-mover]
│   ├── us_10y ......... TVC:US10Y (corr, w≈800) — WIRED +1 · LEAD +1–2 · global yield anchor; ID
│   │     yields track it, so it doubles as a reinvestment-yield proxy AND a global-duration gauge.
│   └── us_real10y ..... DFII10 (market, w≈800) — NOT WIRED (needs GLOBAL_CORR key) · sign +1 ·
│         the cleanest real-yield reinvestment gauge; test as a refinement of us_10y.
├── M3  Curve / spread refinements                                [optional depth]
│   ├── id_01y ......... TVC:ID01Y (corr, w≈793) — short-end reinvestment (P&C). sign +1.
│   └── us10y_breakeven  TVC:US10YIE (corr, w≈800) — inflation-comp; nominal-yield decomposition. test.
├── M4  FX / risk-off                                             [second-order]
│   └── usdidr ......... FX_IDC:USDIDR (corr) — NOT WIRED · sign −1 (weak) · risk-off + imported claims.
│         Far less central than for banks — insurers are low-beta, not the foreign-flow long.
└── M5  Equity-book / UL market beta  (BOUNDED proxy — never JCI) [the equity sleeve]
    └── M5a  bcom / global-risk proxy ...... AMEX:DBC (key bcom) OR ndx (NASDAQ:NDX) — NOT WIRED
              sign +1 (weak) · LEAD ~0 · a BOUNDED, EXOGENOUS proxy for the UL/equity-sleeve mark and
              risk appetite, used INSTEAD of the circular JCI. Keep small weight; test, do not assume.
              (Rationale for not using JCI: the basket is part of JCI ⇒ circular market beta, banned
              engine-wide. A bounded external proxy captures the equity-book mark without circularity.)
```

**The honest read on the macro branch.** The yield drivers are **liquid, exogenous, daily price
series** — the category the backtest confirms *leads*. Crucially, and unlike the Banks flow
branch, the insurer yield channel is **NOT primarily mean-reverting at the monthly horizon**: a
*level* of yields persists (rates are highly autocorrelated), and the reinvestment benefit
**accrues over quarters as bonds mature and roll** — a genuinely *forward* mechanism, not a
contemporaneous bounce. That persistence is precisely why insurers show forward IC +0.15 while
banks (whose flow drivers bounce) show −0.15 with the *same* yield series. The yield branch is
both the attribution lens AND the forecaster here.

---

## 6. Cross-industry linkages

- **Banks ↔ Insurance (the shared yield/float node).** Both hold large IDR govvie books, so
  `id_10y`/`us_10y` feed both — but with **opposite earnings signs**: a yield rise is a
  *reinvestment tailwind* for the insurer float (+1) and a *funding-cost / NIM* problem for the
  liability-sensitive bank (−). The engine encodes this correctly (insurer `us_10y` is +1, the
  Banks file argues −1). The contrast is the cleanest illustration in the whole engine of
  *why the sign prior, not the series, carries the skill.*
- **Banks/Multifinance ↔ Insurance (bancassurance & creditor cover).** KPR/auto/working-capital
  credit growth (`aIDLONYAR`, `CEIC230931602`, `CEIC389692087`) drags **attached creditor
  insurance and bancassurance premium** — a demand bridge (D4). BBCA/BMRI distribution and Adira
  (BDMN) auto financing are the channel.
- **Capital Markets ↔ Insurance (the float's mark).** The PHEI govvie curve (`CEIC2479…`,
  P1D, n=4282) and the equity market drive the AFS/UL book mark. Reached cleanly via the
  **market-plane `TVC:ID10Y`** and a **bounded** equity proxy — *not* via JCI.
- **Property/Auto ↔ general insurers (claims base).** Motor (auto cycle) and property (fire/
  catastrophe) drive P&C claims frequency — but no clean monthly claims series exists, so this is
  conceptual, not wired.
- **JCI is NEVER a driver** — circular market beta; the equity-book exposure is captured by a
  bounded external proxy (M5a) instead. Keep JCI absent.

---

## 7. Currently wired vs available (the "what we COULD add")

| Driver | Series (RIC) | n_obs / freq | plane / reachable? | wired now? | priority |
|---|---|---|---|---|---|
| BI policy rate | ECONOMICS:IDINTR | corr | macro (corr) | ✅ +1 | keep (the short-end anchor) |
| US 10Y | TVC:US10Y | w800 | macro (corr) | ✅ +1 | keep (global yield anchor) |
| Real GDP YoY | aIDGDPAR1 | live | macro | ✅ +1 (demand) | keep (premium backdrop) |
| **ID 10Y govvie** | **TVC:ID10Y** | **w798** | **macro (corr, key id_10y)** | ❌ | **HIGH — the missing anchor, add +1** |
| **ID 1Y short curve** | TVC:ID01Y | w793 | macro (corr, key id_01y) | ❌ | MED — short-end reinvestment, +1 |
| US real 10Y | DFII10 | w800 | macro (needs GLOBAL_CORR key) | ❌ | MED — cleaner real reinvestment gauge |
| Life net premium (monthly) | CEICI479948257 | 135 / P1M | **ceic (idind, reachable!)** | partly (in group, annual-dominated) | **MED — force the monthly leg** |
| Non-life premium earned | CEICI252415902 | 37 / P1Y | ceic (idind) | ✅ (in group) | keep — attribution |
| Consumer confidence | aIDCONIAR | live / P1M | macro | ❌ | MED — leads cover demand |
| System bank credit YoY | aIDLONYAR | live | macro (key id_bank_credit) | ❌ | MED — bancassurance/creditor demand |
| USD/IDR | FX_IDC:USDIDR | w801 | macro (corr) | ❌ | LOW — imported claims / risk-off, weak |
| Equity-book proxy (bounded) | AMEX:DBC / NASDAQ:NDX | w800 | macro (corr, key bcom/ndx) | ❌ | LOW — UL/equity sleeve, small, test |
| Insurance Technical Reserves | CEIC224777801 | 292 / P1M | id (needs resolver) | ❌ | **EXCLUDE — endogenous float size** |
| Solvency / RBC / outcome ratios | (insurer balance-sheet) | — | — | n/a | **KEEP EXCLUDED (endogenous)** |

**The plane note (matters for §9).** The two highest-value adds — **`id_10y` and `id_01y`** —
are **already reachable today** via `GLOBAL_CORR` → `correlation.sqlite` (`TVC:ID10Y`/`TVC:ID01Y`,
w≈798/793). **No new plumbing is needed for the single most important fix.** The monthly **life
premium** (`CEICI479948257`) sits in the **idind `CEICI…` plane** and is therefore reachable via
the existing `("Banks","Insurance Premiums")` `ceic` group — but the group is *swamped by ~28
annual series*, so a `ceic_override` should **promote the monthly leg** and the annual prints
should be allowed to fail the data-quality/frequency gate as attribution noise. `DFII10` and the
`id`-plane credit/KPR series would need the `ID_MACRO_OBS` resolver pattern (§9 Tier 2),
identical to the Banks-file proposal.

**No live data bug specific to this basket**, but the engine-wide **`dxy` → `TVC:BBDXY` is EMPTY
(weekly_obs 0)** — if any financials basket (or a future insurer revision) reaches for `dxy`, it
silently dies; the populated `TVC:DXY` (w800) should be the resolver target. (Flagging per the
brief; the Insurance seed does not currently use `dxy`, so it is not *currently* broken here.)

---

## 8. Forecastability — WHY this basket has skill (the most important section)

**The fact to explain:** Insurance has forward IC **+0.15** at the **93rd placebo percentile**
(n_oos 129) — genuine SKILL — while the *identical-vintage* Banks seed has **−0.15** at the 5th
percentile. Same engine, same yield series, opposite result. Four structural reasons, in order:

**(1) The float earns the yield, and the yield LEADS — a persistent, forward mechanism.**
Indonesian insurers hold bond-heavy floats. When yields rise, the **reinvestment of maturing
bonds + new premium at higher coupons lifts recurring investment income over the NEXT several
quarters.** Yields are *liquid, exogenous, daily, and highly autocorrelated* — they move *months
before* the realised investment-income line and the re-rating, and (critically) the benefit
**accrues forward as bonds roll**, so it does NOT mean-revert at +1M the way bank foreign-flow
does. **The driver leads the earnings, and the earnings lead the price.** This is the +0.15.

**(2) The sign is clean and one-directional — no regime ambiguity.** A bank's rate sign is
ambiguous (funding cost vs asset yield, cut-vs-hike regime), which broke the +1 prior and forced
sign-0. An insurer's rate sign is **unambiguously +1** (higher yield ⇒ higher float income), so a
*static* +1 prior — exactly what the seed has on `us_10y` and `id_bi_rate` — is *correct* rather
than mis-signed. **The skill is in the sign, not the cleverness.**

**(3) It is a low-beta DURATION basket, not a foreign-flow basket.** The pure insurers carry
low-to-negative JCI beta (PNLF −0.53, PNIN −0.24, SMMA −0.20). They are **not** the EM-Indonesia
"long" that foreigners whip in and out monthly; their returns track the **bond-yield level**, a
slow forward variable, not a fast mean-reverting flow. The equal-weight target (§1) concentrates
exactly this pure-insurer duration exposure.

**(4) Premium volume — the part that *would* be coincident/lagging — is a small share of the
signal.** Because the premium series are annual and the seed's only volume driver is GDP, the
forecast is **not** diluted by slow pub-lagged quantity prints the way a loan-growth-heavy bank
seed is. The seed is *accidentally* concentrated on the one branch that leads.

**Honest caveat — the skill is MAGNITUDE, not direction.** **hit−up is only +0.01** while IC is
+0.15. The engine is **not** beating a coin flip on the *sign* of next-month return; the +0.15 IC
comes from **getting the big moves right** — when yields move a lot, the basket's large moves are
correctly *scaled and signed*, and the tail months dominate the rank correlation. Practically:
this is a **conviction/sizing signal on large rate moves**, not a high-hit-rate timing signal.
Deepening must protect the *magnitude* behaviour (favour Δ-yield/level features, n_oos-stable),
not chase hit-rate with noisy slow series.

**Branch-by-branch forward-skill verdict:**

| Branch | Forward-skill verdict |
|---|---|
| **ID10Y / US10Y / BI-rate reinvestment yield (D1/M1/M2)** | **YES — the source of the skill.** Liquid, exogenous, persistent, one-signed, leads earnings. Deepen here. |
| Real yield DFII10 / curve refinements (M2/M3) | **Maybe (refinement).** Cleaner reinvestment gauge; test as enhancement, keep only if IC holds. |
| Premium volume (D2) — annual + monthly | **No (attribution).** Annual pub-lagged; the monthly life leg is coincident at best. |
| GDP / penetration (D3a) | **No (attribution).** Slow, quarterly, secular backdrop. |
| Consumer confidence / credit (D3b/D4) | **Maybe (weak).** Leads cover demand; secondary. |
| Claims / combined ratio (S1) | **No.** Annual, lagging. |
| Δ-yield MTM (S2a) | **Refinement.** Captures the transient book hit; sharpens the level signal. |
| Equity-book / UL bounded proxy (M5a) | **Maybe (weak).** Small UL-equity kicker; bounded proxy only, never JCI. |

**The verdict.** *Insurance is a forward-skilled **duration / reinvestment-yield basket** — the
cleanest "rates-as-earnings" instrument in the engine.* The job is **NOT to add breadth** (that
risks diluting the working yield concentration with slow attribution series) but to **deepen the
yield channel**: wire the **domestic anchor `id_10y`** (the float's actual reinvestment bond,
currently missing), add the **short curve `id_01y`**, optionally refine with the **real yield
`DFII10`**, and consider a **Δ-yield feature** to capture the reinvestment-vs-MTM timing. Hold
the +1 signs. Keep premium-volume as attribution and all solvency/reserve outcomes excluded.
Target: **hold or raise IC ≥ +0.15 with a richer, more *honest* yield tree** — and explicitly
flag the verdict as a **magnitude/conviction signal on large rate moves**, since hit−up ≈ 0.

---

## 9. Engine-wiring spec — concrete `mapping.py` changes

**Two tiers, each independently A/B-testable against `backtest/bt.py "Insurance"`. Adopt only
what holds or improves forward IC — the bar is HIGH here because the basket already has skill;
the prime directive is "first, do not break the +0.15."**

### Tier 1 — fixes reachable with TODAY's engine (no new resolver) — do first

```python
"Insurance": {
    # promote the MONTHLY life-premium leg out of the annual-swamped group;
    # the ~28 annual premium series stay as attribution and will fail the
    # frequency/data-quality gate harmlessly.
    "ceic": [("Banks", "Insurance Premiums")],
    "ceic_override": [("life: net premium income", "demand", +1)],  # CEICI479948257, P1M n=135
    "globals": [],
    "macro": [
        # --- the yield channel (the skill) — DEEPEN ---
        ("id_10y",        "macro", +1, "ID govvie reinvestment yield on the float (the anchor)"),  # NEW — highest value
        ("id_bi_rate",    "macro", +1, "short-end reinvestment / time-deposit rate on the float"), # keep
        ("us_10y",        "macro", +1, "global EM-yield anchor; ID yields track it (reinvestment)"),# keep
        ("id_01y",        "macro", +1, "short-curve reinvestment rate for the P&C/TD sleeve"),      # NEW — test
        # --- premium / penetration (attribution) ---
        ("id_gdp_real_q", "demand", +1, "premium growth / penetration backdrop"),                   # keep
        # --- secondary leading candidates (test, keep only if IC holds) ---
        ("id_consumer_confidence","demand", +1, "leads new-policy & creditor-cover demand"),        # NEW — test
        ("id_bank_credit","demand", +1, "bancassurance / creditor-cover demand bridge"),            # NEW — test
        # --- second-order FX (weak; test) ---
        ("usdidr",        "macro", -1, "imported reinsurance/medical claims + risk-off (weak)"),     # NEW — test
    ],
    # DO NOT wire JCI (circular). Equity-book sleeve only via a BOUNDED external proxy (Tier-2 test).
    # DO NOT wire Insurance Technical Reserves / solvency / RBC (endogenous float/outcome).
}
```
- **Add `id_10y` (sign +1)** — the single highest-value change: the domestic bond the float
  actually reinvests into, already in `GLOBAL_CORR` → `TVC:ID10Y` (w≈798), **zero plumbing**.
- **Add `id_01y` (+1)** for the short-duration P&C/time-deposit reinvestment leg (w≈793).
- **`ceic_override` promotes the monthly life-premium** (`CEICI479948257`) so the demand read is
  not purely annual; verify it survives `_curate_ceic` (P1M, n=135 — passes comfortably).
- **Hold the existing +1 signs** on `id_bi_rate`/`us_10y` — they ARE the skill.
- Test `id_consumer_confidence`, `id_bank_credit`, `usdidr` *one at a time*; keep only if forward
  IC holds — they are secondary and could dilute the yield concentration.

### Tier 2 — refinements requiring small engine changes (test as enhancements, not core)

1. **Real-yield reinvestment gauge.** Add a `GLOBAL_CORR` key for the real 10Y:
   ```python
   GLOBAL_CORR["us_real10y"] = "DFII10"   # US 10Y real, market id, w≈800
   ```
   then test `("us_real10y","macro",+1,"real reinvestment yield (cleaner duration gauge)")` as a
   *replacement/refinement* of `us_10y`, not an addition (avoid collinear double-counting).
2. **Δ-yield (reinvestment-vs-MTM) feature.** In `drivers/stats`, in addition to the yield
   *level*, test a **3-month Δ of `id_10y`** as a separate signed leg: the level captures carry
   (+1), the Δ captures the transient AFS-MTM hit on a yield *spike* (−1 on the stock, fading to
   +1 on the flow). This sharpens the magnitude behaviour that the +0.15 already rewards. Keep
   only if it improves IC AND the placebo percentile.
3. **Bounded equity-book proxy (UL sleeve).** Test a *small-weight* `("bcom","demand",+1,…)` or
   `("ndx","demand",+1,…)` as an EXOGENOUS stand-in for the UL/equity mark — **never JCI**. Drop
   if it adds noise; the basket is primarily a bond proxy.
4. **id-macro resolver (shared with Banks file).** If `id_bank_credit`/KPR detail proves useful,
   the same `ID_MACRO_OBS` resolver pattern proposed in the Banks file reaches the id-plane
   `CEIC…` credit/KPR series for the bancassurance bridge. Optional, low priority.

### What to test in the backtest (`backtest/bt.py "Insurance"`), and the keep-rule

Ablation ladder; keep a change only if forward IC **improves or holds** while the tree gets
richer and more honest — **never trade the +0.15 for in-sample fit**:
1. Baseline (current 3-macro seed) → confirm **+0.15** (n_oos 129, pctile 0.93).
2. **+`id_10y`** (the anchor) → expect IC **≥ +0.15** and a tighter, more theory-clean yield tree.
3. **+`id_01y`** and the monthly-premium `ceic_override`.
4. **+Δ-yield feature** (Tier-2.2) → expect sharper magnitude/conviction behaviour.
5. **+secondary drivers** (consumer-confidence, credit, usdidr, real-yield refinement) — adopt
   *only* the subset that holds IC; **revert any that dilute it.**

**Success = forward IC holds or rises above +0.15 with the domestic reinvestment anchor wired
and the verdict explicitly framed as a *magnitude/conviction signal on large rate moves*
(hit−up ≈ 0).** The failure mode to avoid is **over-broadening**: adding slow premium/claims
attribution series that drag the concentrated yield signal back toward the noise floor. If a
proposed driver does not clearly belong to the *reinvestment-yield / duration* mechanism, the
default is **do not add it.**

---

### Capsule (for IMPROVEMENT_PLAN §5 row 17)

> **Insurance · Financials · 152T · OOS ✓+0.15 (SKILL, 93rd pctile, n_oos 129).** The
> best-forecasting financials basket — a **duration / reinvestment-yield instrument**: the
> bond-heavy float earns more as yields rise, yields are liquid/exogenous/persistent and **lead**
> earnings, and the rate sign is cleanly **+1** (the mirror image of liability-sensitive Banks at
> −0.15). Skill is **magnitude, not direction** (hit−up ≈ 0) — a conviction signal on large rate
> moves. **Deepen, don't broaden:** wire the missing domestic anchor **`id_10y` (+1, `TVC:ID10Y`,
> the float's actual reinvestment bond)**, add short-curve **`id_01y` (+1)**, promote the monthly
> life-premium leg via `ceic_override` (`CEICI479948257`, P1M n=135 vs ~28 annual prints), and
> hold the existing +1 signs on `us_10y`/`id_bi_rate`. Optional refinements: real-yield `DFII10`,
> a Δ(ID10Y) MTM feature, a **bounded** equity-book proxy (`bcom`/`ndx` — **never JCI**, circular).
> Keep Insurance Technical Reserves (`CEIC224777801`) and all solvency/RBC outcomes **EXCLUDED**
> (endogenous). Premium/claims = annual ⇒ attribution. Bug noted engine-wide: `dxy`→`TVC:BBDXY`
> is empty (use `TVC:DXY`), though this seed does not use `dxy`.
