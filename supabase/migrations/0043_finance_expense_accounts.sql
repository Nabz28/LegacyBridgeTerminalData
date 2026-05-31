-- 0043_finance_expense_accounts.sql
-- Expense accounts to classify LBC's real cost base (from the expense summary):
-- software/data subscriptions (Claude, TradingView, Hostinger, Bloomberg) and
-- marketing/branding (business cards, holders). Existing 5xxx leaves stay.
insert into finance.accounts (entity_id, code, name, type, parent_id, is_root, is_active)
select e.id, '5600', 'Software & Data Subscriptions', 'expense',
       (select id from finance.accounts where entity_id = e.id and code = '5000'), false, true
from finance.entities e where e.code = 'LBC'
on conflict (entity_id, code) do nothing;

insert into finance.accounts (entity_id, code, name, type, parent_id, is_root, is_active)
select e.id, '5700', 'Marketing & Branding', 'expense',
       (select id from finance.accounts where entity_id = e.id and code = '5000'), false, true
from finance.entities e where e.code = 'LBC'
on conflict (entity_id, code) do nothing;
