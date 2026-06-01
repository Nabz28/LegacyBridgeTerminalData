-- 0046_asset_mgmt_investors.sql
-- Per-partner AUM (NAV) ledger for The Book + Finance "Investor AUM" views.
-- Pooled-fund pro-rata snapshot: each partner's contribution, current NAV, P&L.
create table if not exists asset_mgmt.investors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contributed_idr numeric not null default 0,
  current_nav_idr numeric not null default 0,
  pnl_idr numeric not null default 0,
  pnl_pct numeric not null default 0,
  as_of date not null default current_date,
  updated_at timestamptz not null default now()
);
alter table asset_mgmt.investors enable row level security;
drop policy if exists investors_read on asset_mgmt.investors;
create policy investors_read on asset_mgmt.investors for select using (true);
grant select, insert, update, delete on asset_mgmt.investors to service_role, authenticated, anon;
