-- 0042_finance_performance_fee.sql
-- LBC earns 25% of realized P&L on AUM (both funds) as revenue, accrued (a
-- receivable) even before the fund transfers cash. This adds the LBC chart
-- accounts for that, plus a table that records each fee RECOGNITION and thereby
-- the per-fund high-water mark (cumulative realized P&L, in USD, at which fee
-- was last taken). Accrued-but-unrecognised fee = 25% * max(0, cum_realized_now
-- - high_water_mark). Realized P&L itself lives in asset_mgmt and is read live
-- in-browser via window.AM (no cross-schema DB dependency here).

-- 1) LBC chart accounts: receivable (asset) + income.
insert into finance.accounts (entity_id, code, name, type, parent_id, is_root, is_active)
select e.id, '1600', 'Performance Fee Receivable', 'asset',
       (select id from finance.accounts where entity_id = e.id and code = '1000'), false, true
from finance.entities e where e.code = 'LBC'
on conflict (entity_id, code) do nothing;

insert into finance.accounts (entity_id, code, name, type, parent_id, is_root, is_active)
select e.id, '4500', 'Performance Fee Income', 'income',
       (select id from finance.accounts where entity_id = e.id and code = '4000'), false, true
from finance.entities e where e.code = 'LBC'
on conflict (entity_id, code) do nothing;

-- 2) Fee recognition / high-water-mark ledger.
create table if not exists finance.performance_fee_recognitions (
  id                uuid primary key default gen_random_uuid(),
  fund_key          text not null,                       -- 'asset_mgmt' | 'quant_fund'
  fund_name         text,
  entity_id         uuid not null references finance.entities(id),
  cum_realized_usd  numeric(20, 4) not null,             -- cumulative realized P&L (USD) at recognition = new HWM
  prior_hwm_usd     numeric(20, 4) not null default 0,
  basis_usd         numeric(20, 4) not null,             -- max(0, cum - prior_hwm)
  fee_rate          numeric(6, 4) not null default 0.25,
  fx_usd_idr        numeric(20, 6),
  fee_amount_idr    numeric(20, 4) not null,
  txn_id            uuid references finance.transactions(id) on delete set null,
  note              text,
  recognized_at     timestamptz not null default now(),
  created_by        uuid default auth.uid()
);
create index if not exists pfr_fund_idx on finance.performance_fee_recognitions (fund_key, recognized_at desc);

alter table finance.performance_fee_recognitions enable row level security;
drop policy if exists pfr_all on finance.performance_fee_recognitions;
create policy pfr_all on finance.performance_fee_recognitions for all to authenticated
  using (finance.is_finance_user()) with check (finance.is_finance_user());

grant select, insert, update, delete on finance.performance_fee_recognitions to authenticated;
grant all on finance.performance_fee_recognitions to service_role;
