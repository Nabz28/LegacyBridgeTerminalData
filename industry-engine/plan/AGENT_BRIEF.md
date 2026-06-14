# Sub-industry plan — analyst brief (read fully before writing)

You are a senior Indonesian-equity sector analyst + quant. Your job: write ONE deep,
data-grounded driver-tree plan for the sub-industry you were assigned. **Write ONLY
your file `industry-engine/plan/subindustry/<id>.md`. Read-only on everything else —
do NOT edit mapping.py or any other file.**

## Read first (cwd = worktree root)
1. `industry-engine/plan/IMPROVEMENT_PLAN.md` — the **framework (§1 driver tree)**, the
   reusable **DRIVER LIBRARY (§2 — real series tags for rates/FX/credit/consumer/
   commodities/China/global)**, the **data palette (§3)**, the **TEMPLATE (§4 — FOLLOW
   ITS 9 SECTIONS)**, and **your basket's capsule row in §5**.
2. `industry-engine/plan/DATA_INVENTORY.md` — the FULL inventory. Find **your primary
   CEIC industry block** (§1) by sector, plus the ID-macro (§2: Banking, Consumer
   Surveys, Money Supply, CPI, Capital Markets…), China/US macro, and **market** (§3)
   sections. Also pull series from OTHER industry blocks where they are your INPUTS
   (cross-industry: e.g. Property←cement/steel, Poultry←corn/soymeal).
3. `industry-engine/plan/catalog/idind.json`, `id.json`, `cn.json`, `market.json` —
   grep these to **confirm exact RICs and n_obs** and to discover MORE series. Every
   series you cite MUST exist here. Quote the real ric + n_obs (and units/freq).
4. `industry-engine/engine/mapping.py` — your CURRENT `SEED[...]` entry (the thin
   status quo — the gap you are closing).
5. `industry-engine/BACKTEST.md` + `industry-engine/plan/_state.txt` — your basket's
   current grade, kept-driver count, and **blindfolded forward OOS skill** (`✓`/`✗`/IC).

## Find your slice
In `industry-engine/state/worklist.json` find the basket with your `sub_sector`; use
its `id` (the filename), `members` (the 15-30 real stocks), and `ceic_candidates`.

## DATA-QUALITY CAVEATS (verified — honour these)
- Always check `weekly_obs` in `market.json` before citing a market id. **EMPTY
  (weekly_obs 0): `TVC:BBDXY` (use `TVC:DXY`), `ICE:RC1!` robusta (use `ICE:KC1!`),
  `SHFE:RB1!`, `SGX:FEF1!`, `ICEEUR:ATW1!` Newcastle (use `ICEEUR:ATR1!` API2).**
- `id_lending_rate` currently resolves to None (spark-only) → map to a real CEIC rate
  ric where relevant. `wb_nickel`/`wb_tin`/`wb_urea`/`wb_potash` → None (no clean price).
- CEIC quantity prints (production/loans/sales) are PUBLICATION-LAGGED and tend to be
  coincident/lagging → good for attribution, weak for forecasting. Liquid market
  *price/rate* series (commodities/FX/yields) tend to LEAD → forecast candidates.
  Tag which branch is expected to forecast.
- Exclude ENDOGENOUS series (a constituent's own balance sheet; system outcome ratios
  like NIM/CAR/BOPO/LDR; the basket's own output level).

## Write `industry-engine/plan/subindustry/<id>.md` — DEPTH, multi-page, the §4 template:
1. **Snapshot** — basket (members + what each does), mcap, current grade/kept/OOS, the gap.
2. **Economic structure** — how the basket makes money: the revenue identity (price ×
   volume), the cost stack, the margin swing factor, what a sell-side analyst watches,
   intra-basket dispersion (which names dominate / differ).
3. **DEMAND driver tree** — branches → sub-drivers → REAL series, each leaf:
   `series ric (n_obs) · role · sign · expected LEAD months · mechanism · data quality`.
4. **SUPPLY / COST driver tree** — same (input commodities, capacity, policy).
5. **MACRO / RATE / FX / FLOW** — rate curve, USD/IDR, DXY, risk appetite, liquidity.
6. **Cross-industry linkages** — series borrowed from other categories (make explicit).
7. **Currently-wired vs available** — table: what mapping.py uses now vs the full tree
   (the "what we COULD add"), prioritised; call out current bugs (empty/None resolvers).
8. **Forecastability** — which branches should LEAD (months) and why; what the OOS
   backtest says; the contemporaneous-vs-forward distinction; what would move it from
   explainer to forecaster — OR an honest concession that it is attribution/beta only.
9. **Engine-wiring spec** — concrete `mapping.py` changes: `ceic` categories,
   `ceic_override` (re-role series), `ceic_exclude` (endogenous), global/macro hints
   with signs + roles, any new resolver, and a falsifiable backtest plan (what to add,
   what IC change would confirm).

Be specific, theoretical, grounded (real rics + n_obs). This is a reference a quant
implements from — depth and correctness over length-padding. Return a 4-line summary
(n demand/supply/macro leaves + the key forecast hypothesis + any data bug found).
