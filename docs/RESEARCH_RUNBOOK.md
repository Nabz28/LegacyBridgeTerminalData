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

## Telegram: your personal CRO

### The host decision — a dedicated bot on Vercel, not OpenClaw, not Hermes

**Chosen: the research bot already deployed at `/api/research-bot`, running on
Vercel + GitHub Actions.** The reasoning, since OpenClaw and Hermes were both on
the table:

- **OpenClaw is laptop-bound.** LBC's own note [[LEGION - OpenClaw Production
  State]] says it plainly: "Current setup is laptop-bound; 24/7 operation needs
  an always-on host." A CRO that goes quiet when the laptop sleeps is not a CRO.
  The morning brief fires at 06:30 WIB from GitHub's cloud regardless of what
  hardware is awake.
- **OpenClaw already owns @LEGIONLBC_bot**, polling it for Nabil with the LEGION
  persona. Telegram allows exactly one consumer per bot: `getUpdates` and a
  webhook are mutually exclusive. Putting the research desk on that token would
  break LEGION, and the two systems answer to different principals anyway.
- **Hermes** (in any of its forms) still needs a host you would then own and
  babysit, and nothing Hermes-shaped exists in the stack today. It solves no
  problem the current design has.
- The deployed bot **shares one tool layer** with the terminal chat panel, so
  Telegram and the browser answer identically and there is one thing to maintain.

OpenClaw is not shut out: if you later want it as a front end, give it a skill
that POSTs to `/api/research-agent` and it inherits every tool. That is a config
change, not a rebuild.

### Turning it on (one command, about two minutes)

The system automated everything except the two things only your Telegram account
can produce: a bot token and your chat id.

1. Message **@BotFather** → `/newbot` → name it (e.g. `LBC Research Desk`).
   Copy the token.
2. Run this from the repo root:

```bash
node scripts/research/activate-bot.mjs --token=PASTE_TOKEN_HERE --discover
```

Then message your new bot once. `--discover` picks up your chat id, stores the
token in `brain.vault`, generates and stores a webhook secret, points the
webhook at production, registers you for daily pushes and conversation, and
sends a confirmation message. `--status` inspects the state any time.

If you would rather not use `--discover`, get your id from @userinfobot and pass
`--chat=<id>` instead.

### What it does once live

- **06:30 WIB daily:** the morning brief (regime, book, up to five changes, up
  to two decisions, watchlist, news, key dates, where it is blind).
- **Hourly during market hours:** pushes anything with salience 85+, which in
  practice means cut-loss breaches, stop proximity, factor concentration, and
  regime flips. It warns you rather than waiting for the morning.
- **Every 6h:** data freshness violations, so you learn a feed died from the
  system rather than from a wrong number.
- **Conversation:** free text with the full tool set — dials, series, compare,
  book, factor exposure, signals, news, sentiment, candidates, key dates, memory
  search, screens. Commands: `/brief` `/dials` `/watch` `/news` `/dates` `/ops`
  `/help`.
- **Commands that write:** log an idea, set an alert, change a stance. Those are
  recorded with `stance_source='human'` so the machine never overwrites your call.

Recipients ship **empty by design**: the brief carries position-level P&L, so
nothing broadcasts until you name a recipient. The LBC exec group is
`-5196396460` if you ever want a firm-wide version. Until then every brief still
lands in `research.brief` and the Research Desk → Briefs tab, so nothing is lost.

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
