-- LBC Research System — core schema (2026-08-07)
-- Applied via Management API. Idempotent where possible.

create schema if not exists research;
create schema if not exists mkt;
create schema if not exists doc;

grant usage on schema research to anon, authenticated, service_role;
grant usage on schema mkt to anon, authenticated, service_role;
grant usage on schema doc to anon, authenticated, service_role;

-- ---------------------------------------------------------------- desks
create table if not exists research.desk (
  id           text primary key,
  name         text not null,
  basket       text not null check (basket in ('cyclical','secular','country')),
  kind         text not null check (kind in ('industry','country')),
  tickers      text[] not null default '{}',
  benchmark    text,                       -- ticker used for relative-performance stats
  template_ids text[] not null default '{}', -- management.monitor_templates lineage
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists research.driver (
  id          serial primary key,
  desk_id     text not null references research.desk(id),
  series_key  text not null,               -- -> mkt.series.key
  label       text not null,
  direction   int not null default 1 check (direction in (-1, 1)),
  weight      numeric not null default 1,
  lag_days    int not null default 0,
  shared_factor text,                      -- e.g. 'real_rates' for the secular-rates trap check
  active      boolean not null default true,
  note        text,
  created_at  timestamptz not null default now(),
  unique (desk_id, series_key)
);

-- ---------------------------------------------------------------- dials
create table if not exists research.dial (
  desk_id       text primary key references research.desk(id),
  asof          date not null,
  stance        text not null default 'N' check (stance in ('OW','N','UW')),
  conviction    smallint not null default 3 check (conviction between 1 and 5),
  machine_score numeric,                   -- [-2, +2]
  machine_stance text,                     -- what the engine proposes
  regime        text,
  drivers       jsonb not null default '[]'::jsonb, -- [{series_key,label,value,z,pctile,direction,contrib}]
  what_changed  text,
  flip_condition text,
  stance_source text not null default 'machine' check (stance_source in ('machine','human')),
  updated_by    text,
  updated_at    timestamptz not null default now()
);

create table if not exists research.dial_history (
  id            bigserial primary key,
  desk_id       text not null references research.desk(id),
  asof          date not null,
  stance        text not null,
  conviction    smallint not null,
  machine_score numeric,
  machine_stance text,
  regime        text,
  drivers       jsonb not null default '[]'::jsonb,
  what_changed  text,
  stance_source text,
  created_at    timestamptz not null default now(),
  unique (desk_id, asof)
);

-- ---------------------------------------------------------------- signals
create table if not exists research.signal (
  id          bigserial primary key,
  asof        date not null,
  desk_id     text references research.desk(id),
  kind        text not null,
  ref         text,                        -- series_key / ticker / document id
  headline    text not null,
  payload     jsonb not null default '{}'::jsonb,
  salience    int not null default 50 check (salience between 0 and 100),
  direction   int check (direction in (-1, 0, 1)),  -- implied direction for the desk
  dedupe_key  text not null,
  retired     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (dedupe_key, asof)
);
create index if not exists signal_asof_idx on research.signal (asof desc, salience desc);
create index if not exists signal_desk_idx on research.signal (desk_id, asof desc);

create table if not exists research.signal_score (
  signal_id     bigint not null references research.signal(id),
  horizon_days  int not null,
  realized_ret  numeric,
  hit           boolean,
  scored_at     timestamptz not null default now(),
  primary key (signal_id, horizon_days)
);

create table if not exists research.graveyard (
  id         serial primary key,
  kind       text not null,
  desk_id    text,
  retired_at timestamptz not null default now(),
  hit_rate   numeric,
  n_obs      int,
  reason     text,
  unique (kind, desk_id)
);

-- ---------------------------------------------------------------- theses & ideas
create table if not exists research.thesis (
  id              uuid primary key default gen_random_uuid(),
  desk_id         text not null references research.desk(id),
  ticker          text,
  title           text not null,
  body            text not null,            -- three sentences
  driver_id       int references research.driver(id),
  entry           numeric,
  target          numeric,
  stop            numeric,
  horizon         text,
  invalidation    jsonb not null default '{}'::jsonb, -- {observable, threshold, note}
  macro_assumption text,
  status          text not null default 'open' check (status in ('draft','open','wounded','invalidated','closed_win','closed_loss','closed_flat')),
  health          jsonb not null default '{}'::jsonb, -- weekly adversary verdicts
  opened_at       timestamptz,
  closed_at       timestamptz,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists research.idea (
  id            uuid primary key default gen_random_uuid(),
  thesis_id     uuid not null references research.thesis(id),
  proposed_size_pct numeric,
  size_check    jsonb not null default '{}'::jsonb,  -- rule check results
  decision      text check (decision in ('pending','taken','passed','expired')),
  decided_by    text,
  decided_at    timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);

create table if not exists research.position_link (
  thesis_id   uuid not null references research.thesis(id),
  position_id uuid not null,               -- -> asset_mgmt.positions.id
  primary key (thesis_id, position_id)
);

-- ---------------------------------------------------------------- alerts
create table if not exists research.alert (
  id           serial primary key,
  kind         text not null check (kind in ('level','invalidation','regime','calendar','freshness','custom')),
  target       text not null,              -- series_key or ticker
  condition    jsonb not null,             -- {op:'gt'|'lt'|'cross', value:...}
  note         text,
  active       boolean not null default true,
  created_by   text,
  last_fired_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists research.alert_fire (
  id        bigserial primary key,
  alert_id  int not null references research.alert(id),
  fired_at  timestamptz not null default now(),
  payload   jsonb not null default '{}'::jsonb,
  was_actionable boolean
);

-- ---------------------------------------------------------------- briefs
create table if not exists research.brief (
  id        bigserial primary key,
  kind      text not null check (kind in ('morning','weekly','monthly','flash')),
  asof      date not null,
  body      text not null,                 -- rendered text as pushed
  items     jsonb not null default '[]'::jsonb, -- structured items w/ signal refs
  sent_to   jsonb not null default '[]'::jsonb,
  sent_at   timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, asof)
);

-- ---------------------------------------------------------------- ops
create table if not exists research.ops_freshness (
  pipeline        text primary key,
  last_run_at     timestamptz,
  last_success_at timestamptz,
  rows_written    int,
  expect_within_hours int not null default 26,
  status          text not null default 'init' check (status in ('init','ok','stale','error')),
  note            text
);

create table if not exists research.config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists research.agent_log (
  id         bigserial primary key,
  agent      text not null,
  desk_id    text,
  model      text,
  input_tokens  int,
  output_tokens int,
  output     jsonb,
  error      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- market data
create table if not exists mkt.series (
  key        text primary key,             -- e.g. 'us.rate.dgs10'
  label      text not null,
  country    text,
  category   text,
  unit       text,
  freq       text not null default 'd' check (freq in ('d','w','m','q')),
  source     text not null,                -- fredcsv | yahoo | stooq | dbnomics | cftc | scrape_idx | scrape_tsmc | scrape_hba | scrape_tsa | manual
  source_id  text not null,
  transform_default text not null default 'level', -- level|yoy|mom|z
  active     boolean not null default true,
  note       text,
  updated_at timestamptz not null default now()
);

create table if not exists mkt.observation (
  series_key text not null references mkt.series(key),
  date       date not null,
  value      double precision not null,
  primary key (series_key, date)
);
create index if not exists observation_date_idx on mkt.observation (series_key, date desc);

create table if not exists mkt.instrument (
  ticker    text primary key,              -- yahoo convention
  name      text,
  exchange  text,
  currency  text,
  desk_id   text,
  active    boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists mkt.price (
  ticker    text not null,
  date      date not null,
  open      double precision,
  high      double precision,
  low       double precision,
  close     double precision not null,
  volume    double precision,
  adj_close double precision,
  primary key (ticker, date)
);
create index if not exists price_date_idx on mkt.price (ticker, date desc);

create table if not exists mkt.flow (
  date         date not null,
  market       text not null default 'idx',
  ticker       text not null default '_market',
  foreign_buy  double precision,
  foreign_sell double precision,
  net          double precision,
  value_total  double precision,
  primary key (date, market, ticker)
);

-- ---------------------------------------------------------------- documents
create table if not exists doc.document (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,              -- filing_10k | filing_10q | filing_8k | cb_fomc | cb_bi | cb_boj | cb_ecb | idx_disclosure
  entity       text,                       -- ticker or institution
  title        text,
  published_at timestamptz,
  url          text,
  raw_text     text,
  hash         text not null unique,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists document_kind_idx on doc.document (kind, published_at desc);

create table if not exists doc.diff (
  id                 bigserial primary key,
  document_id        uuid not null references doc.document(id),
  prior_document_id  uuid references doc.document(id),
  summary            text,
  salience           int check (salience between 0 and 100),
  changes            jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- grants & RLS
grant select on all tables in schema research to anon, authenticated;
grant select on all tables in schema mkt to anon, authenticated;
grant select on all tables in schema doc to anon, authenticated;
grant all on all tables in schema research to service_role;
grant all on all tables in schema mkt to service_role;
grant all on all tables in schema doc to service_role;
grant usage, select on all sequences in schema research to service_role;
grant usage, select on all sequences in schema mkt to service_role;
grant usage, select on all sequences in schema doc to service_role;

alter default privileges in schema research grant select on tables to anon, authenticated;
alter default privileges in schema mkt grant select on tables to anon, authenticated;
alter default privileges in schema doc grant select on tables to anon, authenticated;
alter default privileges in schema research grant all on tables to service_role;
alter default privileges in schema mkt grant all on tables to service_role;
alter default privileges in schema doc grant all on tables to service_role;

-- RLS: public read for display tables, service-only for config/agent_log/vault-ish
do $$
declare t text;
begin
  foreach t in array array[
    'research.desk','research.driver','research.dial','research.dial_history',
    'research.signal','research.signal_score','research.graveyard','research.thesis',
    'research.idea','research.position_link','research.alert','research.alert_fire',
    'research.brief','research.ops_freshness',
    'mkt.series','mkt.observation','mkt.instrument','mkt.price','mkt.flow',
    'doc.document','doc.diff'
  ] loop
    execute format('alter table %s enable row level security', t);
    begin
      execute format('create policy anon_read on %s for select using (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

alter table research.config enable row level security;
alter table research.agent_log enable row level security;
revoke select on research.config from anon, authenticated;
revoke select on research.agent_log from anon, authenticated;
