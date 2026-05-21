-- ============================================================
-- asset_mgmt schema — the Asset Management book (M06)
-- Additive + isolated; does NOT touch public/macro/correlation/management.
-- RLS gated on the auth-login JWT `user_role` claim (admin|management).
-- Idempotent: safe to re-run.
-- ============================================================

create schema if not exists asset_mgmt;

-- Funds (two subsidiaries; extensible) ------------------------
create table if not exists asset_mgmt.funds (
  id            text primary key,            -- 'asset_mgmt' | 'quant_fund'
  name          text not null,
  base_currency text not null default 'USD',
  created_at    timestamptz not null default now()
);

-- Positions (per fund) ----------------------------------------
create table if not exists asset_mgmt.positions (
  id            uuid primary key default gen_random_uuid(),
  fund_id       text not null references asset_mgmt.funds(id),
  symbol        text not null,
  exchange      text,
  name          text,
  asset_class   text not null default 'equity',  -- equity|etf|crypto|fx
  currency      text not null default 'USD',
  direction     text not null default 'long',     -- long|short
  quantity      numeric not null default 0,
  avg_cost      numeric not null default 0,        -- weighted-average, native ccy
  stop          numeric,
  target        numeric,
  conviction    int,                               -- 1..5
  thesis_idea_id uuid,
  status        text not null default 'open',      -- open|closed
  opened_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists positions_fund_idx on asset_mgmt.positions(fund_id, status);

-- Cash ledger (per fund, multi-currency) ----------------------
create table if not exists asset_mgmt.cash_ledger (
  id          uuid primary key default gen_random_uuid(),
  fund_id     text not null references asset_mgmt.funds(id),
  currency    text not null default 'USD',
  type        text not null,                        -- deposit|withdrawal|dividend|fee|trade
  amount      numeric not null,
  occurred_on date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists cash_fund_idx on asset_mgmt.cash_ledger(fund_id);

-- Watchlists (shared; optional fund tag) ----------------------
create table if not exists asset_mgmt.watchlists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  fund_id    text references asset_mgmt.funds(id),
  created_at timestamptz not null default now()
);
create table if not exists asset_mgmt.watchlist_items (
  id           uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references asset_mgmt.watchlists(id) on delete cascade,
  symbol       text not null,
  exchange     text,
  note         text,
  status       text default 'idea',                 -- idea|researching|ready|passed
  created_at   timestamptz not null default now()
);

-- Ideas / [A1]/[A2] memos -------------------------------------
create table if not exists asset_mgmt.ideas (
  id            uuid primary key default gen_random_uuid(),
  fund_id       text references asset_mgmt.funds(id),
  symbol        text,
  name          text,
  conviction    int,
  status        text default 'idea',                 -- idea|researching|conviction|sized|entered|exited|archived
  target_price  numeric,
  target_weight numeric,
  pillars       jsonb not null default '[]'::jsonb,   -- [{page:equity|industry|macro, a1, a2, side:bull|bear}]
  catalysts     jsonb not null default '[]'::jsonb,   -- [{label, date}]
  notes_md      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trades / journal (every fill) -------------------------------
create table if not exists asset_mgmt.trades (
  id           uuid primary key default gen_random_uuid(),
  fund_id      text not null references asset_mgmt.funds(id),
  symbol       text not null,
  exchange     text,
  side         text not null,                         -- buy|sell
  quantity     numeric not null,
  price        numeric not null,
  fees         numeric not null default 0,
  currency     text not null default 'USD',
  occurred_at  timestamptz not null default now(),
  idea_id      uuid,
  rationale    text,
  realized_pnl numeric
);
create index if not exists trades_fund_idx on asset_mgmt.trades(fund_id, occurred_at);

-- Quotes (daily marks from tvDatafeed) ------------------------
create table if not exists asset_mgmt.quotes (
  symbol   text not null,
  exchange text not null default '',
  last     numeric,
  currency text default 'USD',
  as_of    date not null default current_date,
  primary key (symbol, exchange, as_of)
);

-- FX rates (native -> base) -----------------------------------
create table if not exists asset_mgmt.fx_rates (
  pair  text not null,                                -- e.g. 'USDIDR'
  rate  numeric not null,
  as_of date not null default current_date,
  primary key (pair, as_of)
);

-- NAV snapshots (per fund, daily; for TWR) --------------------
create table if not exists asset_mgmt.nav_snapshots (
  fund_id         text not null references asset_mgmt.funds(id),
  as_of           date not null,
  nav             numeric,
  cash            numeric,
  positions_value numeric,
  primary key (fund_id, as_of)
);

-- Seed the two funds ------------------------------------------
insert into asset_mgmt.funds (id, name, base_currency) values
  ('asset_mgmt', 'LBC Asset Management', 'USD'),
  ('quant_fund', 'LBC Quant Fund',       'USD')
on conflict (id) do nothing;

-- Grants: authenticated only (NOT anon) -----------------------
grant usage on schema asset_mgmt to authenticated;
grant select, insert, update, delete on all tables in schema asset_mgmt to authenticated;
alter default privileges in schema asset_mgmt
  grant select, insert, update, delete on tables to authenticated;

-- RLS: management tier only (user_role in admin|management) ----
do $mig$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'asset_mgmt'
  loop
    execute format('alter table asset_mgmt.%I enable row level security;', t);
    execute format('drop policy if exists mgmt_only on asset_mgmt.%I;', t);
    execute format($p$
      create policy mgmt_only on asset_mgmt.%I for all to authenticated
      using ( coalesce((current_setting('request.jwt.claims', true)::json->>'user_role'), '') in ('admin','management') )
      with check ( coalesce((current_setting('request.jwt.claims', true)::json->>'user_role'), '') in ('admin','management') );
    $p$, t);
  end loop;
end
$mig$;
