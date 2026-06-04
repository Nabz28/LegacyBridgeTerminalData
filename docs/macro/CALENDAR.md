# Macro Calendar

An economic + corporate-event calendar for the macro terminal, spanning **Indonesia,
US, and Global** events. It lives as the **Calendar** tool in the launcher shell
(right toolbar, below Sentiment and Data Gatherer).

## What it covers

| Region | Categories |
|--------|-----------|
| **Indonesia** | BI Board-of-Governors (RDG) rate decisions · BPS releases (CPI, trade, GDP, reserves, PMI) · SUN/SBSN bond auctions · fiscal milestones (APBN, Nota Keuangan) · public holidays / IDX closures · IDX index reviews (LQ45/IDX30/IDX80…) · **RUPS (AGM/EGM) for individual listed companies** · dividends (cum/ex) · IPOs |
| **US** | FOMC decisions + minutes + Powell pressers · Fed speakers · BLS/BEA/Census data (CPI, PCE, NFP, GDP, retail sales, ISM, claims, housing…) · Treasury auctions · mega-cap earnings · S&P/Nasdaq index rebalances · options expiry (witching) |
| **Global** | ECB / BoE / BoJ / PBOC / RBA / BoC / SNB / RBI / BoK / BNM / BSP / BoT decisions · China data (GDP, PMI, CPI, trade) · euro-area/UK/Japan data · OPEC+ · G7/G20/Davos · major elections · MSCI/FTSE reviews |

## Data model — `macro.calendar`

```
region       'US' | 'ID' | 'Global'
event_date   date
event_time   text   -- local label, e.g. '08:30 ET', '14:00 WIB'
category     central_bank | data | rups | earnings | dividend | auction | ipo
             | index | speech | fiscal | holiday | geopolitics | commodity | other
title        text
entity       text   -- agency / central bank / company
ticker       text   -- IDX/US ticker (rups, earnings)
importance   'high' | 'med' | 'low'
period       text   -- 'May 2026', 'Q1 2026' (data releases)
prev/forecast/actual  text
detail       text   -- agenda / notes (RUPS agenda, dividend, speaker topic)
status       'confirmed' | 'tentative' | 'estimated'
source, url  text
hash         text unique  -- dedup: region|category|date|title|ticker
```

RLS: anon `select`. Written with the service-role key. Migration: `supabase/migrations/0052_macro_calendar.sql`.

`status` is honest about certainty: **confirmed** = official date published, **tentative**
= announced but movable, **estimated** = typical recurring window with no official date
yet (e.g. a future-quarter earnings slot by historical cadence). The UI badges anything
that isn't confirmed.

## Ingest — `scripts/post_calendar.py`

Agents/curators write a JSON array of event objects and upsert:

```
SUPABASE_SERVICE_ROLE_KEY=... python scripts/post_calendar.py events.json [more.json ...]
```

`hash` is computed if absent and used for idempotent dedup (merge-duplicates), so
re-running the same batch is safe. Off-shape rows (bad region/date/missing title) are
dropped, not inserted.

## How the data is gathered

The initial population was done by a fan-out of curation agents (one per
region/sector slice — US data, global central banks, ID macro, and ID RUPS split by
sector: financials, consumer/telco/health, energy/mining, industrials/property,
tech + IPOs, mid-caps). Each agent web-searches **real** scheduled events, marks
`status` honestly, and never fabricates a confirmed date — if a company's RUPS date
isn't public yet, it's omitted rather than guessed.

To refresh, re-run the same agent contract (region/sector slices), write each slice to
`.cal/*.json`, and `post_calendar.py .cal/*.json`. RUPS coverage deepens naturally as
companies file disclosures closer to their meetings.

## UI

`launcher/scripts/macro-calendar.jsx` (`window.MacroCalendar`), styled in
`launcher/styles/macro-ws.css` (`.mcal-*`). Reads via `window.MACRO_LIVE.calendar()`.
Two-level filter (region tabs → type chips), search (ticker/company/event), a
high-impact-only toggle, and a past/upcoming toggle. Events are grouped by day with
sticky headers (TODAY / TOMORROW), sorted within a day by importance. A summary pill
shows the count of high-impact events in the next 7 days.
