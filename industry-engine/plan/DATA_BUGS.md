# Engine resolver / data bugs found during the deep-plan pass

Consolidated from the per-sub-industry plans. These are **implementation TODOs** —
mostly `mapping.GLOBAL_CORR` resolver fixes that affect MANY baskets. Fix + re-grade
+ re-backtest when implementing the plans.

## Resolver bugs (affect the whole engine — fix first)
| key | current | problem | fix |
|---|---|---|---|
| `dxy` | `TVC:BBDXY` | **EMPTY (weekly_obs 0)** → DXY silently unwired everywhere | `TVC:DXY` (wk 800) |
| `us_real10y` | *(missing)* | **DFII10 (US real 10Y, wk 800) has NO resolver key** — the single most theory-correct driver for every duration basket (Property, Telco, Tower, IT, Internet, Pharma, AltEnergy) | add `"us_real10y": "DFII10"` |
| `wb_coffee_robusta` | `ICE:RC1!` | EMPTY | `ICE:KC1!` (Arabica, wk 800) |
| `wb_rubber` | `SGX:TF1!` | EMPTY → Plantation/auto rubber sleeve unpriced | (no clean fix; proxy) |
| `wb_lng_jp` | `SGX:JKM1!` | EMPTY → Asian LNG gas-switch channel unmeasurable | `NYMEX:NG1!` (proxy) |
| `wb_coal_au` | `ICEEUR:ATW1!`→fixed→`ICEEUR:ATR1!` | Newcastle empty; API2 used | OK (already fixed) |
| `wb_nickel` `wb_tin` `wb_urea` `wb_potash` | `None` | no clean price in store | nickel→`IGO.AX`/`GLEN.L` equity proxy; urea→CEIC fertiliser value÷volume |
| `id_lending_rate` | `None` (spark only) | unwired | map to a real CEIC lending/KPR-rate ric (e.g. KPR rate `CEIC14419701`) |

Other empty market ids to AVOID wiring: `SGX:FFX1!` (coking coal), `SGX:FEF1!`
(iron ore), `SHFE:RB1!` (China rebar), `BMFBOVESPA:FCPO1!` (use `MYX:FCPO1!`),
`CME:DC1!` (milk). Always check `weekly_obs` in `catalog/market.json` before wiring.

## Candidate-set / sign bugs (per basket — in the wiring specs)
- **Telco**: `("Telecom", None)` sweeps ~53 card-payment / e-money series (Internet/
  Banks output, not telco revenue) that drown the ~30 subscriber/ARPU series.
- **Chemicals**: `("Basic Materials", None)` sweeps `Total Reserves Minus Gold`
  (`CEICI224743301`) — the spurious "strong driver"; narrow the block.
- **Coal**: `Volume: Dry Rubber` (`CEICI13515501`) is mis-filed under the Coal sub →
  `ceic_exclude`.
- **F&B**: `soybean_meal` (poultry feed) wrongly applied to branded food; `id_cpi_yoy
  demand −1` mis-signs pricing power → split to 0.
- **Mining / Metals & Mining**: copper(+China) and gold(−real-yield/USD) have OPPOSITE
  macro drivers — a single +1 blend muddies the signal; split or use real-yield for
  the gold sleeve.
- **ID-macro plane not read**: the richest leading bank/flow series (loan-by-type,
  NPL formation, foreign net-buy `CEIC14620501`) live in `country=id` (`CEIC…` RICs)
  that NO current resolver path reads — needs a thin `id`-macro observations resolver.

## Structural data GAPS (no series exists — document, don't fake)
- Foreign equity flow (KSEI net-buy) — only proxied by DXY/yields.
- Baltic/Capesize freight, charter/rig day-rates — none in store (Coal, Shipping, EnergyServices).
- Rainfall / El-Niño / ENSO — none (Plantation weather→yield lead unbuildable).
- Ethylene–naphtha spread / olefin prices — none (Chemicals; proxy via cracker equities).
- BPJS claims/coverage — none (Hospitals/Pharma; proxy via OJK healthcare financing).
- Spectrum/regulatory fees — none (Telco).
