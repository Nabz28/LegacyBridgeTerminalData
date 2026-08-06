-- LBC Research System — news, sentiment, screens, calendar links (2026-08-07)

-- ---------------------------------------------------------------- news
create table if not exists research.news (
  id           bigserial primary key,
  published_at timestamptz not null,
  source       text not null,
  headline     text not null,
  url          text,
  summary      text,
  desk_ids     text[] not null default '{}',
  tickers      text[] not null default '{}',
  region       text,
  sentiment    numeric,          -- -1..+1
  sent_label   text,             -- bullish | bearish | neutral
  importance   int not null default 50,
  hash         text not null unique,
  created_at   timestamptz not null default now()
);
create index if not exists news_published_idx on research.news (published_at desc);
create index if not exists news_desk_idx on research.news using gin (desk_ids);

-- rolling per-desk sentiment, written nightly
create table if not exists research.desk_sentiment (
  desk_id     text not null references research.desk(id),
  asof        date not null,
  news_count  int not null default 0,
  sentiment   numeric,          -- mean sentiment over window
  sent_z      numeric,          -- vs own 90d history
  vol_z       numeric,          -- article-volume anomaly
  top_headline text,
  primary key (desk_id, asof)
);

-- ---------------------------------------------------------------- screens
create table if not exists research.candidate (
  id          bigserial primary key,
  asof        date not null,
  desk_id     text references research.desk(id),
  ticker      text not null,
  name        text,
  score       numeric,           -- composite rank score
  side        text not null default 'long' check (side in ('long','short')),
  reason      text,
  metrics     jsonb not null default '{}'::jsonb,
  in_book     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (asof, desk_id, ticker)
);
create index if not exists candidate_asof_idx on research.candidate (asof desc, score desc);

-- ---------------------------------------------------------------- calendar
-- research-owned event view: macro.calendar plus book relevance
create table if not exists research.calendar_flag (
  event_hash  text primary key,
  event_date  date not null,
  title       text not null,
  desk_ids    text[] not null default '{}',
  tickers     text[] not null default '{}',
  touches_book boolean not null default false,
  importance  text,
  notified_at timestamptz
);

grant select on all tables in schema research to anon, authenticated;
grant all on all tables in schema research to service_role;
grant usage, select on all sequences in schema research to service_role;

do $$
declare t text;
begin
  foreach t in array array['research.news','research.desk_sentiment',
                           'research.candidate','research.calendar_flag'] loop
    execute format('alter table %s enable row level security', t);
    begin
      execute format('create policy anon_read on %s for select using (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
