# LEGION — the research desk agent

**2026-08-09 (evening) additions.** (1) The terminal's Research Desk was
restructured around the CRO's three-level model: Global Industries / Countries /
Country Industries (`research.desk.nav_group`, seeded; `research_url` links each
desk to the published site). Desk pages read brief → watchlist → news → movers
(assurance chips visible) with deep material folded; rail is Desks/Briefs/Book/
Chat + FEEDS. (2) LEGION's OpenClaw host carries a 15-minute research cache
(`scripts/research-cache.mjs` → `cache/research.json`: live signals with
assurance, all briefs incl deep reports in full, candidates, news, theses,
dials, book) and the skill's fast commands — `overview`, `pack`, `find`,
`brief_full` — answer research questions from disk in ~60ms with a visible
cache age. The deep reports are kept as distinct documents (last 5, full body)
so a small new dive can never shadow the flagship report.

**Built 2026-08-09.** The research bot rewritten as LEGION per `docs/AGENT_HANDOFF.md`:
same 21-tool data surface underneath, now with identity, memory, honesty, judgement,
views and depth. All five handoff phases shipped in one pass.

## What changed

**Identity.** The agent is LEGION on the research surface. Her persona loads from the
brain (pinned note `LEGION — Research Desk Embodiment`, cached 10 min, baked fallback
in `core.js`) so voice edits never need a deploy. The Narin calibration applies: no
Nabil heat rules; analyst-colleague register. Style is enforced in code
(`enforceStyle`): no em dashes, no markdown emphasis on chat surfaces.

**Honesty (phase 1).**
- Every `research.signal` now carries `payload.assurance`; the engine writes
  `computed` on everything it fires (`db.upsert` injects it; the 158 legacy
  unlabelled rows were backfilled 2026-08-09). The adversary's kill signals carry
  `adversarially_verified`.
- `get_signals` lifts `assurance` + `assurance_tier` (verified / corrected /
  computed / unverified) to the top level of each signal; the prompt requires the
  tier to be voiced and corrections to lead.
- `data_health`: stale pipelines, per-desk driver coverage (dead = z null, current
  false, OR age over the per-frequency budget d8/w21/m75/q200), fundamentals
  snapshot age (from `research.config.data_limits`).
- `whats_changed_since`: stance moves, corrected findings, wounded/killed theses,
  retired signals, deep/flash briefs. `/whatsnew` on Telegram.
- Factual disputes are verified with tools before any concession or memory write.

**Memory (phase 2).**
- Long-term: `remember`/`recall` over `brain.notes` (folder `research`, tags
  `kind:*`, embeddings synced, created_by LEGION). Recall returns FULL bodies of
  top hits, never just snippets — a truncated snippet once got a stored preference
  quoted backwards in testing.
- Short-term: `research.chat_state`, last 10 turns per Telegram chat, 24h TTL.

**Judgement (phase 3).**
- `pipeline/lbc/push/notify.py`: every push candidate scored on book-touch,
  change-vs-level, assurance tier, novelty vs `research.push_log`. Tiers
  silent/notify/interrupt, thresholds 1.00/1.25; at most one notify-tier item per
  hourly run; interrupts ring, notifies are silent notifications.
- `research.push_log` records every send (alerts, judged signals, briefs,
  freshness, deep answers).
- Mandate lives in `research.config.mandate` (sizing folded from `sizing_rules`;
  null fields are genuinely unset and the agent says so). It is injected into the
  system prompt, and `get_book` marks `breached_cut_loss` per position.

**Views (phase 4).** `get_theses` (with the adversary's attack record),
`propose_thesis` (invalidation conditions mandatory), `update_thesis` (reason
mandatory, concessions logged into `health.checks`). Answer shape: what changed,
why, book impact, break condition.

**Depth (phase 5).** `deep_research` queues into `research.deep_queue` and
dispatches `.github/workflows/research-deep.yml` via the GitHub API (vault
`github_pat`); a 2-hourly cron sweeps anything missed. Worker
(`pipeline/lbc/reason/deep.py`): evidence bundle → analyst draft → adversary
attack → revision that states what was challenged; stored on the queue row and as
`brief` kind `deep`, pushed to Telegram. `/deep <question>` on Telegram.

## Operating notes

- Bot: **@LEGIONLBC_bot itself** (CTO decision 2026-08-09). Its token sits in vault
  `research_bot_token`; the webhook points at `/api/research-bot/` with the vault
  secret. OpenClaw's historical claim on its updates is retired — verified idle
  (getUpdates 200, no webhook, zero pending) before activation. If OpenClaw on
  Nabil's laptop ever resumes polling it will get 409s; disable its scheduled
  tasks when convenient. DM-only is enforced in code; the bot still sits in the
  LBC exec group with privacy off, so consider BotFather `/setprivacy` ENABLE to
  cut no-op webhook traffic. Allow-list: `research.config.telegram_allowed`
  (Nabil pre-authorized; add ids via `activate-bot.mjs --chat=<id>` which also
  registers pushes, or edit the config key for conversation only).
- Kill switch unchanged: `research.config.enabled=false` stops pushes and the agent.
- Telegram delivery for pipeline pushes: `research.config.telegram_push.chat_ids`
  (empty by design until Narin opts in).
- The persona note and the operational contract are separate on purpose: the note
  is voice, the baked prompt is the honesty/verification contract. Do not move the
  contract into the brain — the agent must keep it even if the brain is unreachable.
- Two mirrors that must stay in sync: `ASSURANCE_TIER` in `api/_research/core.js`
  and in `pipeline/lbc/push/notify.py`.

## Verified in the 2026-08-09 build (live runs, real data)

Staleness caveat before answer (eurozone); assurance tiers voiced on the tape
read; no-view stated plainly with an offer to form one; remember → recall verbatim
across conversations; false challenge held off with tool evidence (after two
prompt-contract fixes — see AGENT_HANDOFF section 6, tests 1-8); "the other one"
resolved from book P&L; notify scoring tiers unit-tested; chat_state round-trip;
deep queue insert. Deep worker end-to-end verified post-deploy.
