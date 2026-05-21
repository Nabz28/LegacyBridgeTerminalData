-- Live macro dashboard: one row per indicator, refreshed daily by the
-- `macro-refresh` edge function (FRED + DBnomics). Public read-only reference
-- table — writes only via service_role (bypasses grants). No RLS needed.

create table if not exists macro.live_indicators (
  key          text primary key,
  region       text not null,                       -- global | china | indonesia
  category     text not null,                       -- rates | inflation | growth | labor | markets | fx | trade
  label        text not null,
  unit         text default '',                     -- %, $, Rp, idx, k, ''
  source       text not null,                       -- FRED | DBnomics
  series_id    text not null,
  transform    text not null default 'level',       -- level | yoy
  freq         text default '',                     -- daily | monthly | quarterly
  latest_date  date,
  latest_value double precision,
  prev_value   double precision,
  change_abs   double precision,
  change_pct   double precision,
  spark        jsonb default '[]'::jsonb,            -- [{d, v}] oldest -> newest (display values)
  sort_order   int  default 100,
  updated_at   timestamptz not null default now()
);

comment on table macro.live_indicators is
  'Live macro dashboard indicators, refreshed daily from FRED + DBnomics by the macro-refresh edge function.';

grant usage on schema macro to anon, authenticated;
grant select on macro.live_indicators to anon, authenticated;
