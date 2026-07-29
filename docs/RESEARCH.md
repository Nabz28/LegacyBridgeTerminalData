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

## What it holds

| Surface | What it is |
|---|---|
| **Research Board** | All 13 desks as cards: the house view (stance + conviction + horizon), the thesis line, note/watchlist counts, how many sub-industries are flagged — and the desk's live 1M benchmark return next to it. |
| **Desk drill-in** | Set the house view for the desk or any single sub-industry. Tabs: Notes (scoped to the desk/sub), Watchlist (names flagged here), Coverage universe (every constituent, with watchlisted names marked). |
| **Note Book** | Every research note, newest first. Quick-capture (first line = title, ⌘/Ctrl+Enter to file) or long-form markdown. Filter by desk, kind, tag, or full-text. |
| **Watchlist** | Names with stance, conviction, status, thesis, target and catalyst — with live price, distance to target, and a catalyst countdown. Plus a "catalysts ≤30d" strip. |

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
#research/notes                     the note book
#research/watchlist                 the watchlist
#research/desk/<deskId>             a desk       e.g. #research/desk/tech
#research/desk/<deskId>/<subId>     a sub        e.g. #research/desk/tech/semis
#research/note/<TICKER>             notes on one name
```

Bookmarkable, shareable and reload-safe — the shell opens T13 on any `#research`
hash, exactly as it does for `#monitor`.

## Data model — `management.research_*` (migration `0059`)

| Table | Key | Written by |
|---|---|---|
| `research_stance` | `scope_id` = `desk:<deskId>` or `sub:<deskId>/<subId>` | admin / management |
| `research_note` | `id` uuid | any authenticated user (own rows) |
| `research_watch` | `id` uuid, unique on `ticker` | admin / management |
| `research_desk_rollup` | view — per-desk stance + counts | read-only |

`desk_id` / `sub_id` / `ticker` are ids from the client-side coverage book and
are deliberately **not** foreign keys: the taxonomy versions with the frontend,
so renaming a desk must never orphan a year of research notes.

### RLS

The house view (stance, watchlist) is a management decision — read by everyone,
written by `admin`/`management`, matching `monitor_coverage`. Notes are personal
work — anyone signed in can write their own, nobody can forge authorship or edit
someone else's, and admin/management can override.

Verified with a rollback-wrapped probe against the live database (all 8 pass):

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
launcher/scripts/research-ws.jsx      the terminal: board, desk view, notes, watchlist, routing
launcher/styles/research.css          rs- prefix, same tokens as monitor.css
supabase/migrations/0059_research_workspace.sql
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
