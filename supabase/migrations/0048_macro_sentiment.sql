-- 0048_macro_sentiment.sql
-- News + sentiment store for the autonomous macro feed.
--   macro.news       — gathered news items with per-item sentiment
--   macro.sentiment  — composite macro-sentiment snapshots (data + news blend)
-- Scraped macro data (e.g. BPS Indonesia) reuses macro.series / macro.observations
-- with source tagged, so no new table is needed for it.
--
-- Idempotent: safe to re-run.

create schema if not exists macro;

-- ---------------------------------------------------------------- news ------
create table if not exists macro.news (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),   -- article timestamp
  region       text not null default 'World',        -- US | ID | CN | EU | World
  source       text,
  headline     text not null,
  url          text,
  summary      text,
  impact       text,                                  -- "where it leads"
  sent_label   text,                                  -- pos | neg | flat
  sent_score   numeric,                               -- -100..+100 (article-level)
  confidence   numeric,                               -- 0..1 model confidence
  topics       text[] default '{}',
  hash         text unique,                           -- dedup key (source|headline|day)
  created_at   timestamptz not null default now()
);
create index if not exists macro_news_ts_idx     on macro.news (ts desc);
create index if not exists macro_news_region_idx  on macro.news (region, ts desc);

-- ----------------------------------------------------------- sentiment ------
create table if not exists macro.sentiment (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),
  region       text not null,                          -- US | ID | CN | Global
  composite    numeric,                                -- -100..+100 blended read
  data_score   numeric,                                -- -100..+100 from indicators
  news_score   numeric,                                -- -100..+100 from news
  regime       text,                                   -- Reflation | Goldilocks | Stagflation | Risk-off | Disinflation
  components   jsonb default '{}'::jsonb,               -- per-pillar scores + raw inputs (audit trail)
  headline     text,                                    -- one-line human read
  by           text default 'engine',
  created_at   timestamptz not null default now()
);
create index if not exists macro_sentiment_region_ts_idx on macro.sentiment (region, ts desc);

-- ------------------------------------------------------------------ RLS -----
alter table macro.news      enable row level security;
alter table macro.sentiment enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='macro' and tablename='news' and policyname='news_read') then
    create policy news_read on macro.news for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='macro' and tablename='sentiment' and policyname='sentiment_read') then
    create policy sentiment_read on macro.sentiment for select to anon, authenticated using (true);
  end if;
end $$;

grant usage on schema macro to anon, authenticated;
grant select on macro.news, macro.sentiment to anon, authenticated;
grant all    on macro.news, macro.sentiment to service_role;
