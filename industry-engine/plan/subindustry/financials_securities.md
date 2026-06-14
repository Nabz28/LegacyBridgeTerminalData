# Securities (Brokerages) — `financials_securities`

> Sector **Financials** · 6 members · mcap **≈ Rp 22.5tn** · benchmark **JCI** ·
> grade **perfected** · kept drivers **3** (macro-only seed) ·
> **blindfolded forward OOS skill = NONE** · fwd IC **−0.113** · hit−up **−0.15** ·
> placebo pctile **0.12** (below the 5th percentile of random series → *anti-predictive*).
>
> **One-line thesis.** This basket is a **leveraged claim on Indonesian market
> ACTIVITY** — its P&L is turnover × take-rate + prop-book P&L + underwriting + margin
> interest. The single thing that drives all four legs (equity-market turnover) is the
> same thing the equities are benchmarked against (the JCI). That makes broker excess
> return **mechanically circular and mean-reverting**, which is *why* the forward IC is
> negative, not merely zero. The honest deliverable here is an **attribution tree**
> (turnover/flow co-movement) plus a falsifiable test of whether **turnover/flow
> MOMENTUM** carries any *non-circular* forward edge. Spoiler in §8: probably not, but
> there are two narrow, testable exceptions.

---

## 1. Snapshot

| field | value |
|---|---|
| basket id | `financials_securities` |
| sector / sub_sector | Financials / Securities |
| members (n=6) | APIC, TRIM, PANS, RELI, AMOR, KREN |
| total mcap | Rp 22,456,948,228,096 (≈ Rp 22.5tn) |
| benchmark | `jci` (IHSG) — excess return is vs IHSG |
| current grade | perfected (in-sample confidence) |
| kept drivers | 3 (all macro hints; **zero CEIC series wired**) |
| forward OOS | **NONE** · n_oos 129 · fwd IC −0.113 · hit−up −0.15 · placebo 0.12 |

**Members — what each actually is (intra-basket dispersion matters here):**
- **APIC** — Pacific Strategic Financial (Pasific). Holding/financial-services group, by far the **largest by mcap (≈Rp 15.8tn, ~70% of basket weight)**. Thinly traded, holding-company optics → its price is *idiosyncratic / illiquid*, not a clean turnover play. This single name dominates the cap-weighted basket and drags the signal toward a low-float, non-fundamental print.
- **TRIM** — Trimegah Sekuritas (≈Rp 3.5tn). A *real* full-service broker: brokerage commission + fixed-income/underwriting + asset management. The cleanest "turnover beta" constituent. β to JCI ≈ 0.044 (reported beta is near-zero, i.e. low *measured* co-movement — consistent with illiquidity, not true low risk).
- **PANS** — Panin Sekuritas (≈Rp 1.2tn). Brokerage + the listed parent of Panin Asset Management → fee income skews to **AUM/fund flows** as much as raw turnover. β ≈ 0.009.
- **RELI** — Reliance Sekuritas (≈Rp 0.9tn). Retail-tilted broker + multi-finance arm. β null (illiquid).
- **AMOR** — tagged "Other – Financials" in the basket; small (≈Rp 0.8tn), β ≈ 0.576 (the only constituent with a meaningful measured market beta).
- **KREN** — Kresna Graha Investama (≈Rp 0.25tn). Investment/securities holding; historically distressed/idiosyncratic. β ≈ 0.488.

> **Dispersion read.** The cap weight is ~70% APIC (a holding-company, not a pure broker) and the *measured* JCI betas are tiny except AMOR/KREN. So the basket is **NOT a clean high-beta brokerage index** — it is a low-float, holding-heavy sleeve. Any "broker = market beta" intuition is *diluted by illiquidity and holding-company optics*, which is a second reason the engine struggles: the true economic driver (turnover) does not even cleanly transmit into these specific prices. The prompt's wider universe (PANS/TRIM/RELI/KREN/YULE/AKSI) overlaps but the live worklist basket also carries **APIC + AMOR** instead of YULE/AKSI — and APIC's weight is the dominant fact about this basket.

**The gap.** Current `SEED["Securities"]` = `ceic:[("Banks", None)]` + 3 macro hints
(`id_bi_rate −1`, `id_gdp_real_q +1`, `id_bank_credit +1`). The `("Banks", None)` group
resolves to the **Banking** idind category — it **never reaches the Capital Markets
turnover series**, which live under category `Financials (non-bank)` / subcategory
`Capital Markets`. So the *one variable that actually defines this industry's revenue —
IDX turnover/value-traded — is not wired at all.* The basket is "modelled" entirely on
banking-system and rate macro. That is the headline fix.

---

## 2. Economic structure — how the basket makes money

**Revenue identity (price × volume), four legs:**

```
Broker revenue ≈
   (A) Brokerage commission  = Σ client TURNOVER × take-rate (bps)        ← market activity
 + (B) Prop-trading P&L      = Δ(own book) ≈ β·equity return + carry      ← market DIRECTION
 + (C) Underwriting/IB fees  = IPO + rights-issue + bond issuance volume  ← primary-market window
 + (D) Margin-lending NII    = margin book × (margin rate − funding cost) ← retail leverage × spread
```

- **(A) Commission** is the core and is *almost a pure linear function of equity-market
  value-traded*. Take-rate is structurally compressed (retail discount-broker pricing),
  so commission ≈ a constant × turnover. **Turnover is the master driver.**
- **(B) Prop P&L** makes the book *directionally long the market* → this is the leg that
  injects **JCI beta directly into earnings** (and the circularity into the excess-return
  problem in §8).
- **(C) Underwriting** is lumpy and tied to the **IPO/rights/bond issuance pipeline**,
  which itself opens when the index is high and volatility is low (so it co-moves with the
  market with a *lead* of weeks-to-months from mandate to listing).
- **(D) Margin lending** scales with **retail participation and leverage appetite**;
  its margin = (lending rate − funding cost) widens when policy rates fall.

**Cost stack.** Brokers are *operationally light* (people + tech + exchange/clearing fees +
funding for the margin and prop book). The dominant *swing* factor is not cost — it is the
**revenue's own volatility**: a 2× swing in turnover swings commission ~2× against a largely
fixed cost base → **huge operating leverage on market activity**. Funding cost (rates) is the
only macro cost that matters, via legs (B) prop carry and (D) margin spread.

**Margin swing factor.** Operating leverage on **turnover**; secondarily the **margin
spread** (rates) and **prop-book mark** (index direction).

**What a sell-side analyst watches (in order):**
1. **Average daily value traded (ADVT / RNTH)** — the turnover master variable.
2. **Retail participation / new SID (single investor ID) account growth** — the structural
   demand for (A) and (D). *(NB: not in our data plane — see §6/§8.)*
3. **IPO + rights-issue + corporate-bond issuance pipeline** — leg (C).
4. **Net foreign flow** — sets the *marginal price-setter* and large-ticket turnover.
5. **Policy-rate path** — margin spread (D) + prop carry (B) + the discount rate on the
   whole complex.
6. **Index level / volatility** — prop mark (B) and the IPO window (C).

**Intra-basket dispersion (which names differ):** TRIM is the cleanest turnover+IB play;
PANS skews to **AUM/fund-flow fees**; RELI to **retail + multifinance**; APIC/KREN are
**holding-company / idiosyncratic** and dominate cap weight while being least
turnover-sensitive. A turnover signal will fit TRIM/RELI/PANS far better than the
cap-weighted basket APIC drags.

---

## 3. DEMAND driver tree (revenue/volume up)

> Leaf format: `series ric (n_obs) · role · sign · expected LEAD (months) · mechanism · data quality`.
> **All Capital-Markets idind series carry a +1-period publication-lag shift in the engine
> (drivers.py L155) AND are CEIC-tagged `demand`.** They are *coincident-to-lagging* activity
> prints, not leading prices — strong for attribution, weak/circular for forecasting (§8).

### D1 — Equity-market TURNOVER (the master demand driver, leg A + the base for B/D)
- `CEICI13610301` Turnover: Domestic-Domestic (**n7579, P1D**, IDR bn) · demand · **+1** ·
  lead **0** (coincident) · *domestic-retail+institutional value traded → commission base; the
  largest, most persistent turnover block* · quality: **31yr daily history, deepest series in
  the basket**; but engine joins it monthly and pub-lag-shifts it → effectively coincident.
- `CEICI13610201` Turnover: Domestic-sell/Foreign-buy (**n7579, P1D**) · demand · **+1** ·
  lead 0 · *cross foreign-inflow turnover leg* · quality: deep daily.
- `CEICI13610501` Turnover: Foreign-Foreign (**n7579, P1D**) · demand · **+1** · lead 0 ·
  *foreign-to-foreign value traded; big-ticket institutional flow* · quality: deep daily.
- `CEICI14620001` Trading value: Buy (**n405, P1M**, IDR bn) · demand · **+1** · lead 0 ·
  *monthly aggregate buy value-traded; cleaner monthly ADVT proxy* · quality: 34yr monthly.
- `CEICI14620201` Trading value: Sell (**n405, P1M**) · demand · **+1** · lead 0 · *sell leg
  of value-traded* · quality: 34yr monthly. **(Buy+Sell ≈ total value traded — the single
  best monthly turnover index for this basket.)**
- `CEICI14619901` Trading volume: Buy (**n405, P1M**, Share mn) · demand · +1 · lead 0 ·
  *share-count turnover (price-independent activity)* · quality: 34yr monthly.
- `CEICI14620101` Trading volume: Sell (**n405, P1M**, Share mn) · demand · +1 · lead 0 ·
  *share-count sell leg* · quality: 34yr monthly.

> **Forecast tag on D1:** turnover is **coincident, not leading**, and it co-moves with the
> JCI the basket is benchmarked to → contemporaneous attribution only. The *forward* test
> is whether **Δturnover momentum** predicts next-month broker excess return (§8) — expected
> weak/negative (mean reversion).

### D2 — FOREIGN FLOW (marginal price-setter; large-ticket turnover; risk appetite)
- `CEICI14620501` Volume: Net foreign purchase (**n405, P1M**, Share mn) · demand · **+1** ·
  lead **0–1** · *net foreign buying = inflow regime → lifts both turnover and the index → a
  rising tide for fees and prop marks* · quality: 34yr monthly; sign can flip in risk-off.
- `CEICI14618801` Trading: Foreign-sell to Domestic (**n405, P1M**) · demand · +1 · lead 0 ·
  *foreign-distribution-to-local turnover leg* · quality: monthly.
- `CEICI14619101` Trading: Domestic-sell to Foreign (**n405, P1M**) · demand · +1 · lead 0 ·
  *local-distribution-to-foreign leg* · quality: monthly.
- `CEICI14618501` Trading: Foreign-Foreign value (**n405, P1M**) · demand · +1 · lead 0 ·
  *foreign-to-foreign value turnover* · quality: monthly.

> Foreign flow is the *closest thing to a leading demand signal* here: inflows tend to
> precede sustained turnover and index strength by a few weeks. But the net-purchase series
> is itself a noisy, mean-reverting flow — see §8 for why this rarely survives forward.

### D3 — PRIMARY-MARKET / ISSUANCE pipeline (underwriting + IB fees, leg C)
- `CEICI133649801` Number of listed companies (**n316, P1M**, Unit) · *CEIC-tagged supply* ·
  re-role **demand +1** via `ceic_override` · lead **1–3** · *net new listings = realised IPO
  flow → underwriting fees earned with a lag from mandate; rising listing count = active
  primary market* · quality: 26yr monthly; slow-moving, near-monotone trend (weak as a Δ).
- `CEICI278891503` Market cap: % of GDP (**n16, P1Y**) · supply · +1 · annual → **drop**
  (freq P1Y is excluded by `_OK_FREQ`; listed here only to mark it as *not usable*).
- *(id-macro plane, reachable only if a resolver is added — see §6/§9):*
  `Bonds Issuance: Value: Outstanding Corporate Bonds, Sukuk, EBA` (n392, P1M) and
  `IDX: Turnover: Monthly: Exchange Traded Fund` (`CEIC212666702`, n223, P1M) — bond-
  underwriting and ETF-activity proxies for leg C/A.

**Demand-tree forecast hypothesis.** The only demand branch with a *theoretical* lead is
**D2 foreign flow → D1 turnover → broker fees**. Everything else (D1, D3) is coincident or
lagging. Net: demand side is an **attribution engine**, with one thin forward candidate
(flow momentum) that §8 expects to fail the placebo gate.

---

## 4. SUPPLY / COST driver tree

Brokers have **no physical input commodity** — there is no supply/cost tree in the
commodity sense. The economically real "cost/supply" axis is **(i) funding cost of the
margin+prop book** and **(ii) industry capacity/competition (take-rate compression)**.

### S1 — Funding cost of the margin + prop book (the only real cost lever)
- `id_10y` → `TVC:ID10Y` (daily govt 10Y) · **cost** · **−1** · lead **1–2** · *the broker's
  marginal funding/benchmark cost for the margin book and bond inventory; higher yields raise
  funding cost AND mark down the fixed-income prop book* · quality: real-time daily, **leads**.
- `id_01y` → `TVC:ID01Y` (daily 1Y) · cost · −1 · lead 1 · *short-end funding cost for the
  margin loan book; the relevant tenor for margin financing* · quality: daily, leads.
- `id_bi_rate` → `ECONOMICS:IDINTR` (BI 7DRR, M) · macro/cost · **sign ambiguous (0)** ·
  lead 1–3 · *policy rate: lower rates WIDEN the margin spread and cheapen prop carry (+ for
  earnings) BUT the level also proxies the discount rate / risk regime (−). Net empirical
  sign is what the engine must estimate — see §5.* · quality: monthly policy print.

### S2 — Industry capacity / structural take-rate (slow, non-cyclical)
- `CEICI133649801` Number of listed companies (**n316, P1M**) — doubles as a *supply-of-
  product* proxy (more listings = more to trade). Net supply effect on take-rate is small;
  primary use is the D3 issuance read above.
- *No clean series for take-rate / commission-rate compression exists in the plane* →
  structural, modelled as a slow negative drift, **not wireable**. Honest gap.

> **Supply/cost forecast tag.** The funding-cost branch (S1, `id_10y`/`id_01y`) is the
> **only genuinely leading, exogenous, liquid price** in the whole tree → it is the basket's
> best (and possibly only) honest *forward* candidate. The mechanism is real: rates lead the
> margin spread and the bond-book mark by 1–2 months. See §8.

---

## 5. MACRO / RATE / FX / FLOW

- **Rate level & curve** — `id_bi_rate` (BI 7DRR) · macro · **−1 net prior** · lead 1–3 ·
  *lower policy rates → (a) cheaper margin/prop funding, (b) re-rating of risk assets → more
  turnover, (c) wider margin spread. Dominant prior is **−1 (rate cut = broker up)**, which
  is the current seed sign.* Caveat: the *spread* (S1) and the *level* (discount) pull
  opposite ways — keep sign loose / let the engine reconcile.
- `id_10y` / `id_01y` — see S1; **−1**, leading. The 1Y is the cleaner *funding-cost* tenor;
  the 10Y is the *bond-prop-mark + duration* tenor. Add both, let the engine pick.
- **Liquidity** — `id_m2` → `aIDM2AR` (broad money YoY, M) · demand · **+1** · lead 2–4 ·
  *system liquidity is the fuel for turnover and margin leverage; money growth tends to lead
  participation* · quality: monthly, mild lead. **Not in current seed — add.**
- `id_bank_credit` → `aIDLONYAR` (system credit YoY, M) · demand · +1 · lead 1–3 · *credit/
  liquidity backdrop → risk appetite → turnover* · quality: monthly (current seed keeps this).
- **Growth** — `id_gdp_real_q` → `aIDGDPAR1` (real GDP, Q) · demand · +1 · lead 0 · *activity
  backdrop; weak quarterly, coincident* (current seed). Low forward value (quarterly, lagging).
- **FX / risk-off proxy** — `usdidr` → `FX_IDC:USDIDR` (daily) · macro · **−1** · lead 0–1 ·
  *IDR weakness ≈ EM risk-off / foreign-outflow regime → kills foreign turnover and marks
  down the prop book; a real-time, liquid risk-appetite proxy* · quality: daily, leads.
  **Not in current seed — add** (also force-injected by `STD_MACRO`).
- **Broad USD / EM-flow headwind** — `dxy` → `TVC:BBDXY`. **Caveat: `TVC:BBDXY` is EMPTY
  (weekly_obs 0) — use `TVC:DXY`.** Since `GLOBAL_CORR["dxy"]` currently points at the empty
  `TVC:BBDXY`, a dxy hint would silently fall back to spark. **Do NOT rely on dxy until the
  resolver is fixed** — use `usdidr` as the live risk-off proxy instead.
- **Global risk appetite** — `vix` (`CBOE:VIX`), `spx`/`ndx` — risk-on lifts EM turnover.
  Low priority and circular-adjacent; leave to the macro-sentiment layer, not here.

> **JCI is deliberately excluded as a driver.** The benchmark *is* the basket's excess-return
> denominator and the direct input to prop P&L — wiring it is pure circularity. (Consistent
> with the engine-wide "jci dropped — circular market beta" comment in mapping.py.) This is
> the single most important *don't* for this basket.

---

## 6. Cross-industry linkages

- **Banking block (`Banks` idind + `aIDLONYAR`/`aIDM2AR`)** — system credit & money growth as
  the *liquidity supply* that funds turnover and margin leverage. This is the only part of the
  current `("Banks", None)` seed that is economically defensible; keep `aIDLONYAR`/`aIDM2AR`
  as macro hints but **stop using the whole Banks idind category as the CEIC source** (it
  imports bank-NPL/loan-by-sector noise irrelevant to brokers).
- **Insurance / Asset-management adjacency** — PANS's fee income is **AUM-driven**; the
  `Insurance Premiums` and mutual-fund-flow series are weak cousins of broker fee income but
  there is **no clean AUM / mutual-fund-NAV-flow series** in the plane → gap, do not force.
- **Government bond complex (`Capital Markets & Equities` id-macro)** — `Government Securities:
  Outstanding: Non Bank: Foreign` (n4094, P1D) and the corporate-bond-outstanding series are
  *fixed-income underwriting + prop-inventory* proxies for legs (B)/(C). Reachable only via a
  new resolver (§9); flagged as optional depth.
- **US brokerage beta (market.json)** — `GS`/`MS`/`SCHW`/`RJF`/`LPLA` (Investment Banking &
  Brokerage, weekly_obs 800) and `FUTU` (China ADR online brokerage). These are **global broker
  beta**, NOT Indonesian turnover. **Recommended NOT to wire**: they import US-rate/US-equity
  beta and re-introduce a circular "broker = global market beta" signal with no ID-specific
  content. Listed only for completeness.

---

## 7. Currently-wired vs available

| driver | wired now? | source / ric | role·sign | priority to ADD | note |
|---|---|---|---|---|---|
| **IDX turnover (Buy+Sell value)** | **NO** | `CEICI14620001`+`CEICI14620201` (n405,M) | demand +1 | **P0** | the master variable; today completely missing |
| IDX turnover (daily Dom-Dom) | NO | `CEICI13610301` (n7579,D) | demand +1 | P0 | deepest history; coincident |
| Net foreign purchase | NO | `CEICI14620501` (n405,M) | demand +1 | **P1** | only thin *leading* demand candidate |
| Foreign-flow turnover legs | NO | `CEICI13610201/0501`, `CEICI14618801/19101` | demand +1 | P2 | flow-regime attribution |
| Listed-company count (IPO proxy) | NO | `CEICI133649801` (n316,M) | demand +1 (override) | P2 | leg C; slow Δ, weak |
| `id_10y` funding/bond-mark | NO | `TVC:ID10Y` (D) | cost −1 | **P1** | best *leading* exogenous price |
| `id_01y` margin funding | NO | `TVC:ID01Y` (D) | cost −1 | P1 | short-end margin-cost tenor |
| `id_bi_rate` | **YES** | `ECONOMICS:IDINTR` | macro −1 | keep | loosen sign (level vs spread) |
| `id_gdp_real_q` | **YES** | `aIDGDPAR1` | demand +1 | keep | weak/coincident |
| `id_bank_credit` | **YES** | `aIDLONYAR` | demand +1 | keep | liquidity backdrop |
| `id_m2` liquidity | NO | `aIDM2AR` | demand +1 | P2 | leading liquidity fuel |
| `usdidr` risk-off | (via STD_MACRO) | `FX_IDC:USDIDR` | macro −1 | P1 | live risk-appetite proxy |
| CEIC source group | **`("Banks", None)`** | Banking idind | — | **FIX** | wrong category — misses Capital Markets entirely |

**Bugs / dead resolvers called out:**
- **CORE GAP:** `ceic:[("Banks", None)]` resolves to the **Banking** idind category; the
  turnover series are under **`("Financials (non-bank)", "Capital Markets")`** — so the
  industry's defining variable is unreachable today. *(Verified against `build_worklist.py`
  L65–71: groups are looked up by `(category, subcategory)`.)*
- `dxy` → `GLOBAL_CORR["dxy"] = "TVC:BBDXY"` is **EMPTY (weekly_obs 0)** → any dxy hint
  silently degrades to spark. Use `TVC:DXY` or stick to `usdidr`.
- `id_lending_rate` → `None` (spark-only) — irrelevant here (brokers fund off bond/short
  yields, not the bank lending rate), so no loss; just don't lean on it.
- **No data exists** for: **retail SID / investor-account growth**, **margin-lending book**,
  **take-rate/commission-rate**, **AUM/mutual-fund NAV flow**. The prompt's "retail-investor
  SID growth" and "margin-lending" branches are **NOT in the id-macro plane** — flagged as
  genuine gaps, not wired (would need an OJK/KSEI feed).

---

## 8. Forecastability — the honest verdict

**Why fwd IC = −0.11 (anti-predictive), mechanistically:**
1. **Circularity.** Broker revenue (legs A/B) is a near-linear function of **turnover**, and
   **turnover co-moves contemporaneously with the JCI** — the *exact* index used to compute
   the basket's *excess* return. When the engine "predicts" broker excess return from
   turnover, it is effectively regressing (broker − JCI) on a variable that is itself driven
   by the JCI. There is no independent forward information; there is only **noise plus mean
   reversion**.
2. **Mean reversion.** High turnover / strong-flow months are exactly when brokers have
   **already** outperformed; the *next* month tends to give it back (the excess return
   reverts). So a positive-loading contemporaneous attribution becomes a **negative** forward
   loading — which is precisely a negative IC below the placebo floor (pctile 0.12).
3. **Illiquidity / holding-company drag.** 70% of cap weight (APIC) plus several null-beta,
   thin names means the basket print is partly stale/idiosyncratic. Stale prices induce
   spurious negative serial dependence vs a liquid driver → another source of negative
   forward IC.

**Contemporaneous vs forward.** Like the rest of Financials in this engine, **contemporaneous
IC ≫ forward IC**. Turnover, flow, and rate moves *explain* broker co-movement well in-sample
(good attribution), but do **not forecast** next-period excess return. The grade "perfected"
reflects in-sample fit; the OOS gate correctly says **NONE**.

**Is there ANY non-circular forward edge?** Two narrow, *testable* candidates — both must be
proven against the placebo gate, not assumed:
- **(i) Funding-cost lead (`id_10y`/`id_01y`, cost −1).** Rates are exogenous, liquid, and
  lead the **margin spread** and the **bond-prop mark** by 1–2 months. This is the *only*
  branch whose mechanism is genuinely forward and **not** a function of the JCI. Best shot at
  a positive (even if small) forward IC. *Hypothesis: a falling-yield month → positive broker
  excess return 1–2 months later, via widening spread + bond-book gains.*
- **(ii) Foreign-flow momentum (`CEICI14620501`).** *Sustained* (multi-month) net foreign
  inflow may precede a turnover *regime* (not just a one-month blip), giving a short lead. But
  flow is itself mean-reverting and partly circular with the index → expected to **fail** the
  forward/placebo test more often than not.

**What would move it from explainer to forecaster:**
- Wire the **turnover tree for ATTRIBUTION** (so the panel correctly says "this month's broker
  move = turnover × flow × spread"), and **explicitly label it contemporaneous**, not a
  forecast — matching the BACKTEST.md guidance for Financials.
- For *forecast*, lean on the **rate/funding branch (S1)** and test **turnover/flow MOMENTUM
  (Δ over 3–6m), de-meaned vs the JCI**, so the signal is the *non-market* residual of
  turnover rather than raw turnover (kills the circularity). If even the de-meaned momentum
  fails the placebo gate, **concede the basket is attribution/beta-only** and stop trying to
  forecast it.

**Verdict:** **Attribution/beta basket.** Expect to *improve the explainer* materially (wire
turnover/flow/rates) and to *hold or marginally improve* the forward IC at best — most likely
it stays ≤0. The win is honesty + a correct contemporaneous decomposition, not a forecast.

---

## 9. Engine-wiring spec (concrete `mapping.py` changes)

Replace the current `SEED["Securities"]` block. Rationale inline.

```python
"Securities": {
    # FIX the core bug: pull the Capital Markets turnover/flow series (category
    # "Financials (non-bank)", subcategory "Capital Markets") — NOT the Banks idind
    # category. This is the industry's defining demand variable; it was unreachable.
    "ceic": [("Financials (non-bank)", "Capital Markets")],

    # Re-role the listed-company count (CEIC-tagged 'supply') as a DEMAND/IPO-pipeline
    # proxy for underwriting (leg C). Substr match against topic+sub (drivers.py L127).
    "ceic_override": [("number of listed", "demand", +1)],

    # Exclude the slow/endogenous-ish structural prints that add noise, not signal:
    #  - "market cap" (% of GDP) is P1Y (already freq-dropped) and ~ the index level
    #    (circular); "frequency" trade-count is a redundant turnover echo.
    "ceic_exclude": ["market cap", "frequency"],

    "globals": [],   # do NOT wire US broker betas (GS/MS/SCHW) — circular global beta.

    "macro": [
        # Funding-cost / bond-mark branch — the ONLY genuinely leading, non-circular
        # forward candidate (rates lead margin spread + prop mark by 1-2m).
        ("id_10y", "cost", -1, "funding cost + bond-prop mark; leads margin spread"),
        ("id_01y", "cost", -1, "short-end margin-loan funding cost"),
        # Policy rate: keep but loosen the sign — level (discount, -) vs spread (+) net out.
        ("id_bi_rate", "macro", -1, "rate cuts widen margin spread + lift turnover (net prior -)"),
        # Liquidity fuel for turnover/leverage (leading-ish).
        ("id_m2", "demand", +1, "system liquidity -> participation/turnover"),
        ("id_bank_credit", "demand", +1, "credit/liquidity backdrop -> risk appetite"),
        # Risk-off / foreign-flow proxy (live, daily). usdidr is also STD_MACRO-injected.
        ("usdidr", "macro", -1, "IDR weakness ~ EM risk-off -> foreign turnover + prop down"),
        # Activity backdrop (weak/coincident; keep for attribution completeness).
        ("id_gdp_real_q", "demand", +1, "activity -> trading volume (coincident)"),
    ],
    # NOTE: jci intentionally NOT a driver (circular benchmark / prop input).
    # NOTE: dxy intentionally NOT used until GLOBAL_CORR["dxy"] is repointed from the
    #       EMPTY TVC:BBDXY to TVC:DXY (data bug). usdidr covers the risk-off axis.
},
```

**Resolver work (optional depth, not required for the core fix):**
- None of the new series need a *new* `GLOBAL_CORR` entry — turnover/flow enter via the
  **idind `ceic` path** (raw `CEICI…` rics, fetched by `get_observations`), and
  `id_10y`/`id_01y`/`id_m2`/`usdidr` already resolve. So the fix is **pure SEED edits**.
- If later wiring the **id-macro** bond-issuance / ETF-turnover / foreign-bond-holding series
  (`CEIC212666702`, `Bonds Issuance…`, `Government Securities: Outstanding: Foreign`), those
  live in the `id` plane and would need a small resolver to fetch by `CEIC…` id — defer.
- **Fix the dxy data bug** centrally: `GLOBAL_CORR["dxy"]: "TVC:BBDXY" -> "TVC:DXY"`
  (helps every basket, not just this one) — flag to the engine owner, do not edit here.

**Falsifiable backtest plan (what to add → what would confirm):**
1. **Baseline.** Re-run `backtest/bt.py "Securities"` after the SEED swap. Current fwd IC
   = −0.113 / placebo 0.12.
2. **Add turnover tree (D1/D2) only.** Hypothesis: **contemporaneous** IC rises sharply
   (better explainer); **forward** IC stays ≤0 or worsens (circularity/mean-reversion).
   *Confirms the "attribution-only" verdict if forward does not clear the placebo 80th pctile.*
3. **Add the rate/funding branch (S1: `id_10y`,`id_01y`).** Hypothesis: this is the only branch
   that can nudge **forward** IC up. **KEEP-criterion:** keep the SEED change only if forward
   IC **improves or holds** AND the tree is richer/more honest (per IMPROVEMENT_PLAN §6 / §7).
   A move from −0.11 toward **≥ 0 with placebo pctile ≥ 0.50** on the rate-driven version would
   be the (modest) success signal. If forward IC stays negative, **lock the basket as
   contemporaneous-attribution** and label the panel accordingly — do not chase in-sample fit.
4. **De-meaned momentum probe (research, not a default wire).** Test Δ(turnover, 3–6m) and
   Δ(net-foreign, 3–6m) **orthogonalised vs JCI return** as forward drivers. Only promote to
   SEED if they independently clear the placebo gate — otherwise discard (expected outcome).
```
```
```

---

### 4-line summary
- **Leaves:** DEMAND ~11 (turnover Buy/Sell value + 3 daily turnover blocks + 4 foreign-flow legs + listed-company IPO proxy), SUPPLY/COST 3 (`id_10y`/`id_01y` funding+bond-mark, `id_bi_rate` spread), MACRO/FLOW 5 (`id_bi_rate`,`id_m2`,`id_bank_credit`,`usdidr`,`id_gdp_real_q`); JCI and US-broker betas deliberately excluded as circular.
- **Key forecast hypothesis:** turnover/flow are **coincident and circular with the JCI** → they make a great *contemporaneous attribution* but a *negative forward IC* (mean reversion); the **only non-circular forward candidate is the rate/funding branch** (`id_10y`/`id_01y`, cost −1, 1–2m lead) via the margin spread + bond-prop mark. De-meaned turnover momentum is the sole research probe; expect it to fail the placebo gate.
- **Honest verdict:** attribution/beta basket — expect a much better explainer, forward IC holds ≤0 at best; concede forecast-only-if-rates.
- **Data bugs found:** (1) CORE — current `ceic:[("Banks",None)]` never reaches the Capital Markets turnover series (they sit under `("Financials (non-bank)","Capital Markets")`), so the industry's defining variable is unwired; (2) `GLOBAL_CORR["dxy"]→TVC:BBDXY` is EMPTY (use `TVC:DXY`); (3) **no plane data** for retail-SID/account growth, margin-lending book, take-rate, or AUM flow — genuine gaps, not wired.
