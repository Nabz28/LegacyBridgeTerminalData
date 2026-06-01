-- 0045_finance_audit_reset.sql
-- Full audit reset of the LBC books (2026-06-01): fix the void bug in the
-- balance views, add Stockbit/Pluang/partner-loan accounts, and wipe the stale
-- April import so the fully-audited Jago ledger can be posted clean.

-- 1. FIX VOID BUG: deleted transactions' journal lines must not count.
create or replace view finance.account_balances as
select a.id as account_id, a.entity_id, a.code, a.name, a.type,
  coalesce(sum(case when t.deleted_at is null then jl.debit_idr - jl.credit_idr else 0 end), 0) as balance_idr
from finance.accounts a
left join finance.journal_lines jl on jl.account_id = a.id
left join finance.transactions t on t.id = jl.txn_id
group by a.id, a.entity_id, a.code, a.name, a.type;

create or replace view finance.cash_position as
select a.entity_id,
  coalesce(sum(case when t.deleted_at is null then jl.debit_idr - jl.credit_idr else 0 end), 0) as cash_idr
from finance.accounts a
left join finance.journal_lines jl on jl.account_id = a.id
left join finance.transactions t on t.id = jl.txn_id
where a.type = 'asset'
  and (a.parent_id in (select id from finance.accounts where code = '1100' and type = 'asset')
       or a.code = '1100')
group by a.entity_id;

-- 2. NEW ACCOUNTS under LBC
do $$
declare lbc uuid; p1300 uuid; p2200 uuid;
begin
  select id into lbc from finance.entities where code = 'LBC';
  select id into p1300 from finance.accounts where entity_id = lbc and code = '1300';
  select id into p2200 from finance.accounts where entity_id = lbc and code = '2200';

  if not exists (select 1 from finance.accounts where entity_id=lbc and code='1310') then
    insert into finance.accounts (entity_id, code, name, type, parent_id)
    values (lbc,'1310','Investments — Stockbit','asset',p1300); end if;
  if not exists (select 1 from finance.accounts where entity_id=lbc and code='1320') then
    insert into finance.accounts (entity_id, code, name, type, parent_id)
    values (lbc,'1320','Investments — Pluang','asset',p1300); end if;
  if not exists (select 1 from finance.accounts where entity_id=lbc and code='2210') then
    insert into finance.accounts (entity_id, code, name, type, parent_id)
    values (lbc,'2210','Loan Payable — Nabil','liability',p2200); end if;
  if not exists (select 1 from finance.accounts where entity_id=lbc and code='2220') then
    insert into finance.accounts (entity_id, code, name, type, parent_id)
    values (lbc,'2220','Loan Payable — Rattana','liability',p2200); end if;
end $$;

-- 3. WIPE old LBC ledger (clean slate) + reset ref counters. Triggers off for the bulk delete.
set session_replication_role = replica;

delete from finance.journal_line_tags where line_id in (
  select jl.id from finance.journal_lines jl
  join finance.transactions t on t.id = jl.txn_id
  join finance.entities e on e.id = t.entity_id where e.code = 'LBC');

delete from finance.journal_lines where txn_id in (
  select t.id from finance.transactions t
  join finance.entities e on e.id = t.entity_id where e.code = 'LBC');

delete from finance.transactions where entity_id in (select id from finance.entities where code = 'LBC');

delete from finance.ref_counters where entity_id in (select id from finance.entities where code = 'LBC');

set session_replication_role = default;
