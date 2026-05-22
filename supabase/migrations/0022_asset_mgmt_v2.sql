-- ============================================================
-- 0022_asset_mgmt_v2 — The Book V2.
-- Adds: platforms (custodians), per-position sizing tranches,
-- per-name intel log, research-request queue, restricted list,
-- and platform + author attribution on the existing tables.
-- Additive + isolated to asset_mgmt (does NOT touch public/macro/
-- correlation/management). Idempotent: safe to re-run.
-- ============================================================

-- Platforms / custodians (Stockbit, Pluang, Bitget, IBKR; extensible) -----
create table if not exists asset_mgmt.platforms (
  id            text primary key,                    -- 'stockbit' | 'pluang' | 'bitget' | 'ibkr'
  label         text not null,
  kind          text not null default 'broker',      -- broker|exchange|wallet
  base_currency text not null default 'USD',          -- default ccy of cash held there
  sort          int  not null default 100,
  created_at    timestamptz not null default now()
);
insert into asset_mgmt.platforms (id, label, kind, base_currency, sort) values
  ('stockbit', 'Stockbit', 'broker',   'IDR', 1),
  ('pluang',   'Pluang',   'broker',   'IDR', 2),
  ('bitget',   'Bitget',   'exchange', 'USD', 3),
  ('ibkr',     'IBKR',     'broker',   'USD', 4)
on conflict (id) do nothing;

-- Platform + sizing + attribution on positions ---------------------------
alter table asset_mgmt.positions add column if not exists platform        text references asset_mgmt.platforms(id);
alter table asset_mgmt.positions add column if not exists target_size      numeric;   -- full intended size (qty)
alter table asset_mgmt.positions add column if not exists note             text;       -- thesis / current thinking
alter table asset_mgmt.positions add column if not exists risk_budget_pct  numeric;    -- % of NAV risked (entry->stop)
alter table asset_mgmt.positions add column if not exists created_by       uuid;       -- JWT sub

alter table asset_mgmt.cash_ledger add column if not exists platform   text references asset_mgmt.platforms(id);
alter table asset_mgmt.cash_ledger add column if not exists created_by uuid;

alter table asset_mgmt.trades add column if not exists platform   text references asset_mgmt.platforms(id);
alter table asset_mgmt.trades add column if not exists created_by uuid;

alter table asset_mgmt.ideas add column if not exists created_by uuid;

-- Sizing plan: planned scale-in tranches per position --------------------
create table if not exists asset_mgmt.position_tranches (
  id          uuid primary key default gen_random_uuid(),
  position_id uuid not null references asset_mgmt.positions(id) on delete cascade,
  level_price numeric,
  size        numeric,
  status      text not null default 'planned',        -- planned|filled
  sort        int  not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists tranches_pos_idx on asset_mgmt.position_tranches(position_id);

-- Per-name intel log -----------------------------------------------------
create table if not exists asset_mgmt.intel_log (
  id          uuid primary key default gen_random_uuid(),
  fund_id     text references asset_mgmt.funds(id),
  symbol      text,
  exchange    text,
  type        text not null default 'note',           -- channel_check|mgmt_meeting|insider_txn|rumor|filing|news|note
  source      text,
  confidence  int,                                     -- 1..5
  note        text not null,
  occurred_on date not null default current_date,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists intel_symbol_idx on asset_mgmt.intel_log(symbol);
create index if not exists intel_fund_idx   on asset_mgmt.intel_log(fund_id);

-- Research-request queue (promotable to the Management terminal) ----------
create table if not exists asset_mgmt.research_requests (
  id                    uuid primary key default gen_random_uuid(),
  fund_id               text references asset_mgmt.funds(id),
  symbol                text,
  title                 text not null,
  category              text default 'idea',          -- idea|deep_dive|valuation|channel_check|thesis_review|risk|macro
  priority              text default 'normal',        -- low|normal|high
  status                text default 'open',          -- open|in_progress|promoted|done|dropped
  management_project_id text,                          -- set on "promote" (no cross-schema FK)
  detail                text,
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists rr_status_idx on asset_mgmt.research_requests(status);

-- Restricted / no-trade list (soft flag -> warning banner) ----------------
create table if not exists asset_mgmt.restrictions (
  id      uuid primary key default gen_random_uuid(),
  symbol  text not null,
  fund_id text references asset_mgmt.funds(id),        -- null = all funds
  reason  text,
  active  boolean not null default true,
  set_by  uuid,
  set_at  timestamptz not null default now()
);
create index if not exists restr_symbol_idx on asset_mgmt.restrictions(symbol);

-- Grants + RLS for any newly-created tables (re-run the 0011 pattern) -----
grant usage on schema asset_mgmt to authenticated;
grant select, insert, update, delete on all tables in schema asset_mgmt to authenticated;
alter default privileges in schema asset_mgmt
  grant select, insert, update, delete on tables to authenticated;

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

-- Tell PostgREST to pick up the new tables/columns immediately.
notify pgrst, 'reload schema';
