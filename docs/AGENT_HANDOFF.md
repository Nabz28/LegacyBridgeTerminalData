# Handoff: turning the research bot into a real analyst

**For whoever builds this next. Written 2026-08-07 by the agent that built the current version.**

You are not adding features to a chatbot. You are closing the gap between a competent query
interface and something that behaves like the best analyst on a desk. This document says exactly
what exists, exactly what is missing, and the order to build in.

Read the whole thing before writing code. The last section, on what will bite you, is the part that
saves you a week.

---

## 1. What "great" means here, concretely

Narin is CRO. He is not short of data. He is short of a colleague who holds the whole picture in
their head, tells him the one thing that changed, and admits when they were wrong.

Eight behaviours separate that from a query bot. Everything in this document serves one of them.

| # | Behaviour | Current state |
|---|---|---|
| 1 | **Remembers** what he asked, decided and worried about | None. Every message starts cold |
| 2 | **Holds a view** and defends it under challenge | None. It reports, it does not argue |
| 3 | **Says when it was wrong**, unprompted | None. This is the single biggest gap |
| 4 | **Wakes him only for things that matter** | Partial. Cron briefs, no judgement |
| 5 | **Knows what it does not know** | Data exists, unused |
| 6 | **Explains mechanisms**, not just numbers | Partial. Reports levels, rarely causes |
| 7 | **Knows the book and the constraints** | Reads positions, knows no mandate |
| 8 | **Goes deep on demand** | None. 45s timeout, one model |

The measure of success is not tool count. It is whether Narin stops opening the terminal because
asking the bot is faster and better.

---

## 2. What exists today

Accurate as of this handoff. Verify before you trust it.

**Files**
```
api/research-bot.js      311 lines   Telegram webhook, slash commands, push
api/research-agent.js    105 lines   terminal endpoint, JWT-gated
api/_research/core.js    716 lines   21 tools, tool loop, system prompt, Supabase client
```

**Tools (21).** `get_dial`, `list_dials`, `get_signals`, `get_brief`, `get_book`, `get_news`,
`get_sentiment`, `get_candidates`, `get_calendar`, `get_key_dates`, `get_crowding`,
`factor_exposure`, `get_series`, `list_series`, `compare`, `screen`, `get_ops`, `search_memory`,
`log_idea`, `set_alert`, `update_stance`.

**The loop.** `runAgent()` in core.js. Up to `MAX_TOOL_ROUNDS` tool iterations, then forces an
answer with `tool_choice:'none'`. Temperature 0.2, 1400 max tokens, 45s timeout. Model from
`research.config.models.bot`, default in core.js.

**The system prompt** is a baked-in array of strings in `systemPrompt()`. It carries voice rules and
tool-routing hints. It is rebuilt per call so the date is always current.

**Auth.** Terminal endpoint takes an HS256 JWT signed with `LBC_JWT_SECRET`, subject must be an
active `management.users` row. Telegram is a separate BotFather token, webhook only. **The LEGION
bot token (id 8297239188) must never be used here.** There is a guard in
`scripts/research/activate-bot.mjs` and you should not remove it.

**Kill switch.** `research.config.enabled = false` disables pushes and the chat agent. 60s cache.

**Logging.** `research.agent_log`, 245 rows. It is a log, not memory. Nothing reads it back.

**Tables available.** `desk`, `dial`, `dial_history`, `driver`, `signal`, `signal_score`, `thesis`,
`idea`, `alert`, `alert_fire`, `brief`, `news`, `desk_sentiment`, `candidate`, `calendar_flag`,
`graveyard`, `ops_freshness`, `position_link`, `config`, `agent_log`.

---

## 3. The eight gaps, and how to close them

### Gap 1 — It has no memory

Every Telegram message is a cold start. Narin asked about coal on Tuesday; on Wednesday the bot has
no idea. He cannot say "what about the other one" or "did that change".

**Build:**

```sql
create table research.memory (
  id          bigserial primary key,
  kind        text not null check (kind in ('fact','preference','decision','question','correction')),
  subject     text,              -- 'coal', 'APLN', 'mandate', free text
  body        text not null,     -- one fact, stated plainly
  source      text,              -- 'narin' | 'agent' | 'brief:15'
  confidence  text default 'stated' check (confidence in ('stated','inferred','verified')),
  supersedes  bigint references research.memory(id),
  active      boolean default true,
  created_at  timestamptz default now(),
  last_used_at timestamptz
);
create index on research.memory (subject) where active;
create index on research.memory (kind) where active;
```

Two new tools: `remember(kind, subject, body)` and `recall(query, limit)`. Retrieval is trigram or
embedding match on `subject` and `body`.

**Rules that matter more than the schema.** One fact per row. When a fact changes, insert a new row
with `supersedes` set and flip the old one to `active=false`; never update in place, because the
history of what he believed and when is itself information. Write a memory when Narin states a
preference, makes a decision, or corrects the agent. Do not write one for things the database
already knows: positions, prices, dial states. Those are queries, not memories.

Also add short-term conversation state, separately: last 10 turns per Telegram chat, in a table or
`config` blob keyed by chat id, with a 24h TTL. That is what makes "what about the other one" work.

### Gap 2 — It has no view

Ask it about coal and it tells you the coal numbers. It does not tell you what it thinks, and it
cannot be argued with.

**Build.** The `thesis` table already exists and is barely used. Give the agent tools to
`propose_thesis`, `challenge_thesis` and `update_thesis`. Then add a rule to the system prompt: when
asked "what do you think about X", if a thesis exists, lead with it and its confidence; if none
exists, say so and offer to form one.

The `adversary` module in `pipeline/lbc/reason/adversary.py` already attacks theses on a schedule.
Wire its verdicts into the bot so that when it states a view it can also say "the adversary wounded
this on 3 August over the diesel cost line".

### Gap 3 — It never says it was wrong

**This is the most important gap in the document.** Read
`docs/RESEARCH_SYSTEM.md` and the correction tables at `/research/indonesia/` first.

The finding from four rounds of review: roughly two thirds of this system's research claims failed
on first check, and **corrections failed at the same rate as the claims they replaced**. Eight
corrections were themselves wrong.

Research findings carry an `assurance` field in `signal.payload`, with values
`adversarially_verified`, `verified_by_desk`, `challenged_corrected`, `challenged_survived`,
`verified_full_history`, `computed`, `unchallenged`. As of this handoff **78 of 184 live signals
carry it** — the ones from the research rounds. The rest are machine-computed signals from the
nightly engine, which have no assurance concept yet. Giving them one is part of this gap: a
mechanically-fired signal is not the same kind of claim as a reviewed finding, and the bot should
not present them identically either.

**The bot does not read the field at all.** It presents a checked claim and an unchecked one in the
same voice. Fix that first, before anything else in this document.

**Build:**
- Every tool that returns signals must return `assurance` with them.
- System prompt rule: never state an `unchallenged` finding without saying so. "On a single
  unverified read" is the phrasing used in the reports.
- New tool `whats_changed_since(date)` that diffs stances, retired signals and corrected claims, so
  the agent can proactively say "I told you X on Tuesday. That was wrong, here is why."
- When a signal's `payload.corrected_by` is set, the agent should surface the correction the next
  time that subject comes up. This is what `research.memory` with `kind='correction'` is for.

### Gap 4 — It cannot judge what is worth interrupting for

Currently: scheduled briefs at fixed times, plus hourly alert checks that fire on mechanical
thresholds. No sense of "this one matters, wake him".

**Build.** A `notify` decision step, run after each signal computation, that scores each candidate
push on four things: does it touch an open position, is it a change rather than a level, how
verified is it, and has something similar been said recently. Only the top item clears unless
something is genuinely urgent.

Keep a `research.push_log` so the agent knows what it already told him. Nothing erodes trust faster
than being told the same thing three days running.

Escalation tiers worth implementing: **silent** (goes in the brief), **notify** (a message),
**interrupt** (a message that says why it could not wait). Default hard toward silent.

### Gap 5 — It does not flag its own blind spots

The data is all there and unused. `ops_freshness` knows which pipelines are stale.
`dial.coverage` knows when a desk is scoring on too few drivers. Company financials are eleven weeks
old and **nothing in the system can refresh them** — see the note at the end of
`/research/indonesia/`.

**Build.** A `data_health` tool returning stale pipelines, low-coverage desks, and the age of the
fundamentals snapshot. Then a system prompt rule: if the question depends on stale data, say so
before answering, not after.

### Gap 6 — It reports numbers without mechanisms

"Overnight rates went from 3.66% to 5.98%" is a fact. "Banks priced their loan books for a cutting
cycle that ended seven weeks later, so their margin halved" is an insight. The bot does the first.

**Build.** This is mostly prompt work, not code. Give it a required shape for any substantive
answer: what changed, why it changed, what it means for the book, what would prove it wrong. The
existing `dial.flip_condition` field already holds the fourth one and is barely used.

The desk agent prompt in `pipeline/lbc/reason/desk_agent.py` was rewritten in August 2026 with eight
hard rules drawn from actual failures. **Read it and port the same rules into the bot prompt.** The
adversary prompt in `adversary.py` has a matching where-to-look-first list.

### Gap 7 — It does not know the mandate

It can read positions. It does not know position limits, risk tolerance, liquidity needs, what Narin
will and will not own, or what the fund promised its investors.

**Build.** A `mandate` blob in `research.config`, and load it into the system prompt every call.
Minimum: position size limits, sector caps, liquidity floor, instruments that are off the table,
the stop-loss rule (currently −20%, referenced in the book work), and the reporting cycle.

Then it can say "that would put you 14% in one sector against a 10% cap" instead of "here is the
data".

### Gap 8 — It cannot go deep

45 second timeout, one model, up to a handful of tool rounds. Fine for "what is the coal dial".
Useless for "should we cut APLN".

**Build.** A `deep_research(question)` tool that writes the question to a queue table and returns
immediately with "working on it". A separate worker, on GitHub Actions or a longer-running Vercel
function, picks it up, runs a proper multi-step analysis, and pushes the answer to Telegram when
done. The workflow patterns in `pipeline/research_local/` show what a real research round looks
like: extract, analyse, then have a second agent attack the result.

Do not skip the attack step. That is what produced every genuine finding in this system.

---

## 4. Build order

Each phase should ship and be usable before the next starts.

**Phase 1 — Honesty (do this first).** Assurance surfacing, `data_health`, `whats_changed_since`.
Small, and it makes everything the bot already says more trustworthy.
*Done when:* asking about an unverified finding produces a caveat without prompting.

**Phase 2 — Memory.** The `research.memory` table, `remember` and `recall`, plus 24h conversation
state per chat.
*Done when:* Narin can say "what about the other one" and be understood, and the bot recalls a
preference he stated a week earlier.

**Phase 3 — Judgement.** Notification scoring, push log, escalation tiers, mandate in config.
*Done when:* the bot goes quiet on a dull day and interrupts on a real one.

**Phase 4 — Views.** Thesis tools, adversary verdicts in replies, the required answer shape.
*Done when:* asking "what do you think" gets a position with a confidence and a break condition,
not a summary.

**Phase 5 — Depth.** The `deep_research` queue and worker.
*Done when:* a question that needs twenty minutes gets twenty minutes, and comes back attacked.

---

## 5. What will bite you

These are learned the expensive way. Every one cost real accuracy.

**PostgREST silently caps responses at 1000 rows** and returns the *first* page. Every statistic in
the first build was computed on stale windows because of this. Paginate everything and order newest
first. There is a working client in `pipeline/lbc/db.py`.

**Never put a percentile or z-score on a growing number.** Loan balances, index levels, turnover,
market cap. A series that has grown 132% sits at the 99th percentile permanently and it tells you
nothing. This error was made in every round of research, including inside a note correcting the
error. Only rates, ratios and bounded series support a percentile.

**Check the calendar actually moved.** Eid, Ramadan, Lunar New Year shift between months. Two of the
most dramatic findings in the entire research programme were purely calendar artifacts.

**Compare the same month a year earlier before calling anything a break.** A routine seasonal, an
annual dividend appropriation and a recurring loan-ratio move were each published as regime changes.

**A correction is not self-validating.** Route corrections through the same review as originals.

**"This data does not exist" is a claim that needs checking.** It failed three times: twice because
an extract had silently dropped a file, once because the search used the wrong name.

**Do not webhook the LEGION bot token.** OpenClaw owns it. Separate token, separate bot.

**Never log or echo secrets.** The vault holds them; `hasEnv()` in core.js is the pattern for
checking presence without printing.

**Telegram has a 4096 character limit.** `splitText()` in core.js already handles it. Use it.

**Test the prompt changes.** After editing `systemPrompt()`, actually run a query. A prompt that
parses is not a prompt that works. There is a live test pattern in the August 2026 session: feed it
a deliberately flawed thesis and check it gets killed.

---

## 6. How to know it is actually good

Not "does it answer". These:

1. Ask something whose answer depends on eleven-week-old financials. It should flag the staleness
   before answering.
2. State a preference, wait a day, ask something that depends on it. It should remember.
3. Ask about a finding the system later corrected. It should lead with the correction.
4. Ask "what do you think about coal". It should give a view, a confidence, and what would break it.
5. Have a quiet day. It should stay quiet.
6. Ask "should we cut APLN". It should either give a real answer with the mandate applied, or say it
   needs twenty minutes and then deliver.
7. Argue with it when it is right. It should hold.
8. Argue with it when it is wrong. It should fold, and remember it folded.

---

## 7. Where things are

```
api/_research/core.js          tools, loop, prompt. Start here
api/research-bot.js            Telegram
api/research-agent.js          terminal
pipeline/lbc/reason/           desk_agent, adversary, editor prompts. Port the rules
pipeline/research_local/       what a deep research round looks like
docs/RESEARCH_SYSTEM.md        architecture
docs/RESEARCH_RUNBOOK.md       operations
/research/                     the published research, including every correction
```

Supabase project `adnubucjlezrtusbicja`. Schemas `research`, `mkt`, `macro`, `management`, `brain`.
DDL goes through the Management API; the direct database host is IPv6-only and will not resolve.

One last thing. The most valuable property of this system is not any tool. It is that it publishes
what it got wrong. Forty-eight corrections are in the record, eight of them corrections to
corrections. Whatever you build, do not build something that hides its own errors to sound more
confident. That is the failure mode this whole system was designed against.
