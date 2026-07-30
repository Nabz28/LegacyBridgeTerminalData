# RESEARCH (T13) — the research hub

Monitor (T12) answers *what is the market doing*. Research answers *what do we
think about it, and are we right*. Both sit on **one coverage spine**: the same
13 desks and their sub-industries from `launcher/scripts/monitor-data.js`.
Research imports that book rather than copying it, so a desk or sub-industry
added to Monitor appears in Research on the next reload with no migration.

```
monitor-data.js  ── the one coverage book (13 desks → sub-industries → names)
      │
      ├── MONITOR (T12)   prices, regime, breadth, indices   ← the tape
      └── RESEARCH (T13)  stance, notes, watchlist           ← the view
```

## Two modes

The terminal opens in **View** and stays there until you say otherwise.

| Mode | What it is |
|---|---|
| **◎ View** | Read-only. Every editor, capture box, add button and delete control is gone — not disabled, absent. You can read the whole book, switch geography, drill into any desk, search notes. Nothing you click can change anything. |
| **✎ Edit** | Everything becomes editable: set house views, capture and edit notes, add watchlist names, and change the taxonomy itself. |

The toggle is at the top of the rail and the choice persists per browser. The
default is View on purpose — the book is read far more often than written, and a
stray click should never mutate it.

**Mode is a UI gate, not a security boundary.** RLS is still the enforcement
point: the house view, watchlist and taxonomy need admin/management regardless of
mode, and notes are always your own. A read-tier user who switches to Edit gets
the note editors and a line in the rail explaining why the rest stays read-only.

## What it holds

| Surface | What it is |
|---|---|
| **Research Board** | Every industry as a card: the house view (stance + conviction + horizon), the thesis line, note/watchlist counts, how many sub-industries are flagged — and the desk's live 1M benchmark return next to it. |
| **Desk drill-in** | Set the house view for the desk or any single sub-industry, per geography. Tabs: Notes (scoped to the desk/sub), Watchlist (names flagged here), Coverage universe (every constituent, with watchlisted names marked). |
| **Note Book** | Every research note, newest first. Quick-capture (first line = title, ⌘/Ctrl+Enter to file) or long-form markdown. Filter by desk, kind, tag, or full-text. |
| **Watchlist** | Names with stance, conviction, status, thesis, target and catalyst — with live price, distance to target, and a catalyst countdown. Plus a "catalysts ≤30d" strip. |
| **Calendar** | The macro event feed (863 events) plus our own events, with a star and priority on any of them. |
| **Structure** | The taxonomy manager — add industries, sub-industry categories and countries. Edit mode only. |

## Geography — a view is scoped

A house view carries a geography: **Global**, a region (Americas, Europe,
Asia-Pacific, ASEAN) or a single country. "Bullish global banks" and "bearish
Indonesian banks" are two separate, simultaneously-valid views, not one
overwriting the other.

The picker sits in the board and desk headers. Switching it re-reads the whole
board as that geography's book — it selects *which* view you are reading and
writing, it is not a filter over one shared view.

The board and the Monitor bridge both show the **Global** view as the headline,
with a count of how many geography-specific views sit beneath it.

## Editable taxonomy

The coverage book in `monitor-data.js` is the shared spine with Monitor and stays
fixed. Research **overlays** it:

- **Add industries** — custom desks that sit alongside the 13 built-in ones.
- **Add sub-industry categories** — to a custom industry *or* to a built-in desk
  (e.g. an "AI Datacenter" cut on Technology). Built-in sub-industries stay.
- **Add countries** — geographies the built-in map never carried.

Built-in desks and countries are shown but **locked**: renaming them here would
desync Research from Monitor. Everything custom is fully editable.

Deleting a custom industry does **not** delete its research. Notes, stances and
watchlist rows survive unparented, and the desk view says so rather than
silently hiding them — losing a year of notes to a taxonomy edit would be far
worse than an orphan row.

**Stances**: `bullish · bearish · neutral · watching · avoid`, each with a
1–5 conviction and a horizon. Set them at desk level, sub-industry level, or
both — a sub-industry stance is independent of its desk's.

**Note kinds**: `note · idea · thesis · catalyst · risk · meeting · question · data`.
A note attaches to nothing, a desk, a sub-industry, or a single ticker.

**Watchlist statuses**: `watching → researching → candidate → position`, plus
`passed` / `exited` for the ones you killed.

## The integration that matters — conviction vs the tape

Because both terminals share the spine, Research can compare the house view
against Monitor's momentum signal for the same desk and flag the disagreement:

- **AGAINST TAPE** — bullish call while the benchmark is down >1% over 1M (or
  bearish while it's up). Not necessarily wrong; it is the position that needs
  a reason.
- **WITH TAPE** — the call and the 1M momentum agree.

The badge shows on Research desk cards, in the Research desk header, and on
Monitor's own coverage cards. When either side is unknown it renders nothing —
a missing signal never renders as agreement.

Cross-links both ways: Monitor's desk header carries the house-view chip and a
**Research →** button; Research's desk header carries the live 1M return and an
**Open in Monitor →** button. Both work by setting the URL hash, which the shell
turns into a terminal switch.

## Deep links

```
#research/board                     the board
#research/calendar                  the calendar
#research/structure                 the taxonomy manager
#research/notes                     the note book
#research/watchlist                 the watchlist
#research/desk/<deskId>             a desk       e.g. #research/desk/tech
#research/desk/<deskId>/<subId>     a sub        e.g. #research/desk/tech/semis
#research/note/<TICKER>             notes on one name
```

Bookmarkable, shareable and reload-safe — the shell opens T13 on any `#research`
hash, exactly as it does for `#monitor`.

## Data model — `management.research_*` (migrations `0059`, `0064`, `0065`)

| Table | Key | Written by |
|---|---|---|
| `research_stance` | `scope_id` = `desk:<deskId>@<geo>` or `sub:<deskId>/<subId>@<geo>` | admin / management |
| `research_note` | `id` uuid | any authenticated user (own rows) |
| `research_watch` | `id` uuid, unique on `ticker` | admin / management |
| `research_industry` | `id` slug | admin / management |
| `research_subindustry` | `id` slug | admin / management |
| `research_country` | `code` | admin / management |
| `research_event` | `id` uuid | admin / management |
| `research_event_flag` | `event_key` = `macro:<hash>` or `research:<uuid>` | admin / management |
| `research_desk_rollup` | view — GLOBAL stance + counts | read-only |

`desk_id` / `sub_id` / `ticker` are ids from the client-side coverage book and
are deliberately **not** foreign keys: the taxonomy versions with the frontend,
so renaming a desk must never orphan a year of research notes.

### RLS

The house view (stance, watchlist) is a management decision — read by everyone,
written by `admin`/`management`, matching `monitor_coverage`. Notes are personal
work — anyone signed in can write their own, nobody can forge authorship or edit
someone else's, and admin/management can override.

Verified with rollback-wrapped probes against the live database — 8/8 on the
core tables (0059) and 13/13 on the taxonomy + geography (0064):

| Assertion | Result |
|---|---|
| management sets a house view | allowed |
| analyst sets a house view | blocked |
| analyst reads the house view | allowed |
| analyst writes their own note | allowed |
| analyst forges another author's note | blocked |
| analyst edits someone else's note | blocked |
| admin edits any note | allowed |
| rollup view returns rows to the caller | allowed |

The rollup view is `security_invoker = true`, so it enforces the caller's RLS
rather than the owner's.

## Files

```
launcher/scripts/research-live.jsx    data layer — CRUD, session, divergence math
launcher/scripts/research-views.jsx   stance chips/editor, note cards/editor, watch table
launcher/scripts/research-taxonomy.jsx Structure page + geography picker
launcher/scripts/research-calendar.jsx  Calendar — feed merge, stars, priorities
launcher/scripts/research-ws.jsx      the terminal: board, desk view, notes, watchlist, routing
launcher/styles/research.css          rs- prefix, same tokens as monitor.css
supabase/migrations/0059_research_workspace.sql
supabase/migrations/0064_research_taxonomy.sql
supabase/migrations/0065_research_calendar.sql
```

Research deliberately owns **no** market data. Quotes, history and desk signals
all come from `MONITOR_LIVE`, so both terminals share one cache and one
concurrency queue — opening a Research desk costs no extra Yahoo traffic if
Monitor already loaded it.

## Notes for future sessions

- **The spine is Monitor's.** To add a sub-industry, edit `monitor-data.js`;
  Research picks it up. Never fork the taxonomy.
- **Stance scope keys are synthetic text** (`desk:tech`, `sub:tech/semis`) so a
  PostgREST upsert is one round-trip with no lookup.
- **Every mutation re-reads from the server** instead of patching local state.
  The book is small, and a wrong local guess about an RLS rejection is worse
  than one extra round-trip.
- **`canPublish()` mirrors RLS in the UI** so a read-tier analyst never meets a
  button that 403s — but the server is still the enforcement point.


## Verification — taxonomy + geography (0064)

| Assertion | Result |
|---|---|
| management creates a custom industry | allowed |
| sub-industry on a built-in desk | allowed |
| sub-industry on a custom industry | allowed |
| custom country | allowed |
| malformed slug | rejected by check constraint |
| two geographies on one desk coexist | both stored |
| stance on a custom industry | allowed |
| rollup stays one row per desk | one row |
| rollup reports the GLOBAL stance | correct |
| rollup counts geo-specific views | correct |
| analyst creates an industry | blocked |
| analyst deletes a country | blocked |
| analyst reads the taxonomy | allowed |


## Calendar — the feed, our events, and our priorities

`macro.calendar` (0052) is a **feed**: 863 events written by the autonomous agent
through the service role, re-synced against a `hash` dedup key. Clients hold
`SELECT` only. So Research **reads** it and never writes it — an added row would
sit outside the agent's hash space and a re-sync could drop or duplicate it.

Three things merge into one agenda:

1. **The feed** — the same events T2 shows, read via the anon key, shared cache.
2. **Our events** (`research_event`) — a site visit, an internal deadline, an
   expected filing. Same shape as the feed plus industry / sub-industry links.
3. **Our flags** (`research_event_flag`) — a star, a priority
   (`critical/high/normal/low`) and a private note, on **any** event of either
   kind. Starring a feed event is the point: the BoE decision is not ours to
   author, but caring about it is.

### Why the star keys on `hash`, not `id`

`event_key` is `macro:<hash>` for feed events and `research:<uuid>` for ours.
`macro.calendar.id` is an identity column — if the agent deletes and re-inserts a
row, the id changes and every star on it would silently detach. `hash` is the
agent's own dedup key (`region|category|date|title|ticker`), so it is stable
across re-syncs. **Verified**: the probe deletes and re-inserts a real feed row
with a new id and confirms the star still matches.

Title and date are denormalised onto the flag so a starred event can still be
listed if the feed ever drops it — the star is the record that we cared, and why.

Filters: region, multi-select category, search, high-impact, starred-only, and
include-past (off by default — a calendar is about what is coming). A
**Starred next** strip pins the flagged events that are actually approaching.

### Verification (0065)

| Assertion | Result |
|---|---|
| management adds our own event | allowed |
| star a macro FEED event | allowed |
| star survives a feed re-sync | still matched |
| malformed `event_key` | rejected |
| malformed priority | rejected |
| re-starring is an upsert | one row, updated |
| analyst adds an event | blocked |
| analyst stars an event | blocked |
| analyst reads events / stars / feed | allowed |
