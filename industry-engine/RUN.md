# RUN.md — Industry Engine autonomous controller (READ THIS EACH CRON FIRE)

> This is the **living instruction**. The cron prompt is a thin pointer to this
> file — editing this file changes the behaviour of every future fire WITHOUT
> recreating the cron ("reprompt yourself"). `CRON_VERSION` below is bumped only
> when the cron's *prompt or cadence* must change.

**CRON_VERSION: 1**
**Cadence:** every 20 min (`7,27,47 * * * *`), durable. **Budget per fire: small.**

---

## MISSION
Build, to **perfection, one IDX sub-industry basket at a time**, a quant-grade
demand/supply driver engine: for each of the 52 IDX equity baskets, discover and
statistically validate which macro + CEIC industry data series actually drive the
basket's stock returns (correlation, lead-lag, HAC-OLS, IC, multivariate, OOS),
reconcile with economic theory, and emit a verdict (bullish/bearish + why + how
much + confidence). Quality over coverage. If only 20% is perfected by morning,
that is fine — but what is done must be **rigorous and honest**.

## GROUND TRUTH (read every fire)
- `industry-engine/state/progress.json` — per-basket status/grade. **Source of truth.**
- `industry-engine/state/worklist.json` — 52 baskets (priority by mcap) + driver hints.
- `industry-engine/output/<id>.json` — per-basket artifacts. `output/engine.json` — compiled.
- `industry-engine/output/engine.json` + `launcher/scripts/industry-engine-data.js` — terminal payload.

## THE PER-FIRE PROCEDURE (do exactly ONE of these, then STOP)

1. **Safety first.** If you are near a token/rate limit, do the smallest safe
   thing: run nothing heavy, just ensure `progress.json` is consistent and stop.
   The next fire (post-reset) resumes — everything is checkpointed + committed.

2. **Decide the mode from `progress.json` summary:**

   - **BREADTH mode** — if `pending > 0`:
     Run the deterministic advancer (cheap, ~10–20s, near-zero tokens):
     ```
     python industry-engine/engine/controller.py --n 2
     ```
     It picks the next pending basket(s) by priority, runs the full pipeline,
     grades, recompiles `engine.json` + JS, and **commits**. Read its printed
     summary, then STOP. (You may use `--n 3` if fires are landing reliably and
     tokens are plentiful; keep it ≤3 so a fire never runs long.)

   - **DEPTH / ENRICHMENT mode** — if `pending == 0` and any basket is
     `needs_review` or `partial` that is NOT data-limited:
     Pick the **highest-priority** such basket. Open its `output/<id>.json`,
     look at `rejected_top` and `unscored` and the kept drivers, and make it
     **perfect** by improving the candidate set in `engine/mapping.py`:
       * add the right driver keys (e.g. for rate-sensitive baskets add
         `TVC:ID10Y` curve/level, `dxy`, `us_10y`; for tech add weekly NASDAQ
         beta; for exporters add the correct commodity),
       * fix `sign` priors that the data clearly refutes (theory_agree=False on a
         strong stable driver usually means the prior was wrong — correct it),
       * drop endogenous "drivers" that are really outcomes (a basket's own
         balance-sheet/NIM/asset series) if they crowd out real exogenous drivers.
     **IMPORTANT:** after editing `mapping.py` you MUST rebuild the worklist
     (it embeds the driver hints) BEFORE re-running, then re-run just that basket:
     ```
     python industry-engine/engine/build_worklist.py
     python industry-engine/engine/controller.py --only "<Sub Sector>"
     ```
     (`build_worklist.py` only regenerates `worklist.json`; it does NOT touch
     `progress.json`, so progress is preserved. Commit `engine/mapping.py` too —
     the controller only auto-commits output/state/JS, not the code.)

     Proven enrichment examples (mirror these):
       * rate-sensitive baskets (property/construction/financing/durables/autos):
         add `("id_10y","macro",-1,...)` — the Indo 10Y yield (`TVC:ID10Y`) is a
         strong, liquid, theory-clean driver where BI-rate *changes* are too sparse
         monthly. This flipped Cement/Construction/Multifinance/Durables to perfected.
       * exporters earning USD: ensure `usdidr` (+1) is present; importers (-1).
       * metal processors (steel/apparel/electronics): add the right input
         commodity (`steel_hrc`, `iron_ore`, `cotton`, `copper`) as a `cost` (-1).
     Confirm it reached `perfected` (or is honestly `partial` because the data
     ceiling is reached). One basket per fire. STOP.

   - **FINALISE mode** — if every basket is `perfected`/`partial`/`blocked`:
     Do ONE finalisation task per fire from **## FINALISATION** below, commit, STOP.

3. **Always** end a fire having committed any changes (the controller commits
   automatically; if you edited code/docs, `git add` + commit them too with a
   `feat(industry-engine): ...` message, no attribution trailer — repo convention).

## WHAT "PERFECT" MEANS (verify.py enforces the core; you enforce the spirit)
- ≥3 validated drivers; ≥1 **theory-anchored** driver that is significant
  (|r|≥0.15, p<0.10 under HAC) — i.e. the sign makes economic sense AND the data
  agrees; a working multivariate model with an out-of-sample directional
  hit-rate; confidence ≥ medium; a clear narrative (verdict + why + how much).
- Honesty beats optimism. A basket that is genuinely market-beta with weak
  idiosyncratic drivers should say so and grade `partial` — do **not** fabricate
  strength. Never keep a driver that only "works" via data-mining (no theory, no
  stability, short sample).
- Commodity baskets should be anchored by their commodity (Coal→BCOM/Brent/HBA,
  Plantation→CPO, Mining→nickel/metals, etc.). If the obvious commodity anchor is
  missing from the kept set, that basket is NOT perfect yet — fix the mapping.

## TOKEN-RESET RESILIENCE (why this is safe to leave overnight)
- Every fire is bounded (1–3 baskets) and **idempotent**; all state is written to
  `progress.json` and **git-committed** by the controller before the fire ends.
- If a fire is interrupted (token reset, crash), nothing is lost — the next
  scheduled fire reads `progress.json` and continues. The 20-min recurring,
  durable cron **automatically resumes after a 5-hour limit resets**. Do not
  worry about "catching up" — just advance one step.

## CRON MANAGEMENT (self-reprompt / "don't get stuck with stale crons")
- The cron prompt only says "read RUN.md and do one step". To change *behaviour*,
  **edit this file** — no cron change needed.
- To change *cadence or the prompt itself*: bump `CRON_VERSION`, then
  `CronList` → `CronDelete` the old industry-engine job → `CronCreate` a new one
  with the updated `cron`/prompt (see ## CRON SPEC). Only do this if a fire
  detects the running cron is stale vs `CRON_VERSION`.
- If you (the human-facing agent) are asked to "remake with newer instructions",
  update this file and, if needed, recreate the cron per ## CRON SPEC.

## CRON SPEC (for recreate)
- `cron`: `7,27,47 * * * *`  (every 20 min, off-:00 to avoid fleet collisions)
- `durable`: true, `recurring`: true
- `prompt`: see `industry-engine/state/cron_prompt.txt`

## FINALISATION (all baskets resolved; one item per fire, in this order)
1. [DONE] Full-book refresh: `python industry-engine/engine/controller.py --rerun-all`
   (refreshes every model, preserves grades). Re-run only if mapping/scoring changed.
2. [DONE] `python industry-engine/engine/report.py` — regenerate REPORT.md. Re-run
   after any basket changes.
3. **DEFAULT ONGOING SAFE WORK — lift a `partial` basket toward `perfected`.**
   Pick the highest-priority `partial` that is NOT data-limited (n_used>=5 and not
   a single idiosyncratic mega-cap). Inspect `output/<id>.json` (`rejected_top`,
   kept drivers): is there a real economic driver missing or mis-signed? Common
   wins seen so far: set the right input-commodity `cost` prior, give `usdidr` an
   importer(-1)/exporter(+1) prior, add `id_10y`/`id_bi_rate` (-1) for
   construction/financing/discretionary/durables demand. Edit `mapping.py` →
   `build_worklist.py` → `controller.py --only "<Sub Sector>"`. **Only keep the
   change if it legitimately crosses the bar (theory-anchored, not data-mined).**
   If it stays partial, that is the honest ceiling — `git checkout` the mapping
   edit (or leave it if the drivers are economically sound) and move on. Commit
   `mapping.py` + worklist if kept. Then run report.py + commit. This is the
   productive work for every finalisation fire until partials are exhausted.
4. **UI wiring (CAUTION — needs browser verification; do not rush headless).**
   The launcher is Babel-in-browser React with no build step, so a syntax error
   in a live `.jsx` breaks that terminal. Do this as a NEW, additive,
   defensively-coded workspace (new `launcher/scripts/industry-engine-panel.jsx`
   exposing `window.IndustryEnginePanel`, reading `window.INDUSTRY_ENGINE` via a
   new `index.html` script tag), and VERIFY it renders (Claude Preview / Chrome MCP,
   or hand it to the principal to confirm) BEFORE flipping any `built:true`. Until
   verified, leave the terminal UI untouched — the engine outputs are fully usable
   via REPORT.md + output/engine.json + window.INDUSTRY_ENGINE.

## SANITY / DEBUG
- `python industry-engine/engine/controller.py --status` — progress summary.
- `python industry-engine/engine/controller.py --recompile` — rebuild engine.json.
- `python industry-engine/engine/common.py` — connectivity self-test.
- Logs: `industry-engine/logs/engine.log` (gitignored).
