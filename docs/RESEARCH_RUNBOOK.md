# RESEARCH SYSTEM — RUNBOOK

Operational guide for the LBC Research Desk (built 2026-08-07). Design:
[RESEARCH_SYSTEM.md](RESEARCH_SYSTEM.md). Everything below assumes the repo
root as working directory.

## Daily rhythm (all automatic)

| WIB | What happens | Where |
|---|---|---|
| 16:30 | Asia close ingest: IDX prices + foreign flows, JP/HK/KR/SG | Actions `research-ingest-asia` |
| 05:30 | US close ingest: FRED, yahoo, DBnomics, commodities, FX | Actions `research-nightly` step 1 |
| ~05:45 | GDELT + central-bank statements + EDGAR, then compute (dials, signals, book), then 23 desk agents + Editor | `research-nightly` step 2 |
| ~06:30 | Morning brief pushed to Telegram + stored in `research.brief` | same |
| hourly | Level alerts checked (market hours) | Actions `research-alerts` |
| every 6h | Freshness assertions; Telegram alert if any pipeline stops delivering | Actions `research-freshness` |
| Sun 17:00 | COT + HBA ingest, adversary pass on every open thesis, weekly IC packet | Actions `research-weekly` |
| 1st of month | TSMC/HBA scrapes, monthly attribution | Actions `research-monthly` |

Manual trigger: `gh workflow run research-nightly` (or any of the others).

## Where to look

- **Terminal:** https://legacy-bridge-terminal-data-umga.vercel.app/launcher/ →
  Research Desk. Dial board, desk drill-ins, signals + graveyard, briefs
  archive, book, ops (freshness), chat.
- **Chat agent:** the Chat tab (same login as the rest of the terminal), or the
  Telegram bot once activated. Tools: dials, series, compare, book, signals,
  calendar, memory search, screens, log_idea, set_alert, update_stance.
- **Ops truth:** Research Desk → Ops. Red banner = data stopped arriving.
  The pipeline writes `research.ops_freshness` on every run; a green status is
  earned by rows landing, not by a job exiting 0.

## Telegram

**Push (built, recipients empty by design — one step to turn on):** the brief
carries position-level P&L, so nothing is broadcast until a human names the
recipient. To start daily delivery to yourself:

1. DM @userinfobot on Telegram, it replies with your numeric id.
2. Message @LEGIONLBC_bot once (Telegram will not let a bot open a
   conversation).
3. Add the id to `research.config` key `telegram_push`:
   `{"chat_ids": ["<your id>"]}` — via the terminal chat ("add telegram chat
   id X to the push list") or directly against the config row.

The LBC exec group id is `-5196396460`; add it only if a firm-wide brief is
intended. Push uses @LEGIONLBC_bot as sender and is send-only: this system
never reads that bot's updates (OpenClaw owns its receive path). Until a
recipient exists, every brief still lands in `research.brief` and the Research
Desk → Briefs tab, so nothing is lost.

**Interactive bot (dormant until activated, ~3 minutes of human work):**
1. Message @BotFather → `/newbot` → e.g. `LBCResearchBot`. Copy the token.
2. File it: `insert into brain.vault (key, value, is_secret, note) values
   ('research_bot_token', '<token>', true, 'research desk bot')` (via the
   Management API SQL runner, or ask the terminal chat agent to do it).
3. `node scripts/research/set-webhook.mjs --token=<token>
   --secret=$(<research_bot_webhook_secret from vault>)`
4. DM the new bot `/start`; it replies with your user id and files it under
   config `telegram_pending`; add it to config `telegram_allowed`
   `{"user_ids":[...]}`.
Commands: `/brief` `/dials` `/ops` `/id`, free text runs the full agent.

## Human overrides

- **Stance:** in chat: "move precious metals to overweight, conviction 4".
  Sets `stance_source='human'`; the nightly engine keeps updating
  `machine_score`/`machine_stance` alongside but will not overwrite your call.
  The dial shows both and flags disagreement.
- **Ideas:** "log an idea: long PTBA, thesis is China restocking, entry 2400,
  target 3200, stop 2100" → `research.thesis` (draft) + `research.idea`
  (pending). Sizing is checked against max 40% single / min 3 positions /
  −20% cut-loss.
- **Alerts:** "alert me if USDIDR breaks 16,500" → `research.alert`; fires via
  the hourly job, one-shot (re-arm by asking again).
- **Kill switch:** config `enabled=false` stops pushes and the chat agent;
  pipelines keep writing data.

## Failure modes and fixes

- **A pipeline shows stale on Ops:** read its `note` (last error). Sources
  that block datacenter IPs (IDX sometimes, TSA always) are expected to be
  flaky from Actions; the freshness alert tells you when it matters. IDX flow
  has a 78h window before alarming.
- **fredgraph.csv timeouts:** happens on throttled networks; Actions runners
  are normally fine. Rerun `gh workflow run research-nightly`.
- **Desk agent JSON errors:** logged in `research.agent_log` (error column);
  the desk is skipped that night, everything else proceeds.
- **Graveyard:** a (kind, desk) signal retires automatically at <45% hit rate
  over 20 scored signals. Resurrect by deleting its `research.graveyard` row.
- **Schema changes:** edit `supabase/research/0001_research_schema.sql`
  (append migrations as 0002+), apply via the Management API, then
  `python pipeline/seed.py` if seeds changed.

## Costs

Data: $0 (all keyless sources). LLM: OpenRouter — nightly is 23 haiku desk
agents + 1 sonnet editor (~$0.10–0.30/day), weekly adversary ~$0.05/thesis,
bot per query ~$0.01–0.05. Models are swappable in config key `models`.

## Security debts inherited from the old system (not fixed here)

- The service-role JWT, Management PAT, and GitHub token have circulated in
  plaintext handoffs; the repo is public. Rotate: Supabase dashboard →
  Settings → API (roll service_role + PAT), GitHub → revoke/reissue, then
  update GitHub Actions secrets + Vercel env + brain.vault.
- `management.users.password_plain` stores plaintext passwords.
- Old workflows `brain-backup` (failing — PAT likely expired) and
  `legion-tg-setup` predate this system and were left untouched.
