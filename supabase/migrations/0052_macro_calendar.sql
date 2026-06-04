-- 0052_macro_calendar.sql — economic / corporate-event calendar for the macro terminal.
-- Regions: US, ID, Global. Categories span central-bank decisions, data releases,
-- auctions, Fed/CB speakers, IDX RUPS (AGM/EGM), earnings, dividends, IPOs, index
-- reviews, holidays, geopolitics and commodity events. Read by the launcher shell
-- via the anon key; written by the autonomous agent via the service-role key.

create table if not exists macro.calendar (
  id           bigint generated always as identity primary key,
  region       text not null check (region in ('US','ID','Global')),
  event_date   date not null,
  event_time   text,                        -- local label, e.g. '08:30 ET', '14:00 WIB'
  category     text not null,               -- central_bank|data|auction|speech|rups|earnings|dividend|ipo|index|holiday|geopolitics|commodity|fiscal|other
  title        text not null,
  entity       text,                        -- agency / central bank / company name
  ticker       text,                        -- IDX / US ticker (rups, earnings)
  importance   text not null default 'med' check (importance in ('high','med','low')),
  period       text,                        -- data period e.g. 'May 2026', 'Q1 2026'
  prev         text,
  forecast     text,
  actual       text,
  detail       text,                        -- agenda / notes (RUPS agenda, speaker topic, …)
  status       text not null default 'confirmed' check (status in ('confirmed','tentative','estimated')),
  source       text,
  url          text,
  hash         text unique,                 -- dedup key (region|category|date|title|ticker)
  created_at   timestamptz not null default now()
);

alter table macro.calendar enable row level security;
drop policy if exists calendar_anon_read on macro.calendar;
create policy calendar_anon_read on macro.calendar for select using (true);

grant usage on schema macro to anon, authenticated;
grant select on macro.calendar to anon, authenticated;

create index if not exists calendar_region_date_idx on macro.calendar (region, event_date);
create index if not exists calendar_date_idx on macro.calendar (event_date);
create index if not exists calendar_cat_idx on macro.calendar (category);
