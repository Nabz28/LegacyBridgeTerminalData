-- 0038_finance_period_insert_lock.sql
-- Control fix: the closed-period lock (finance.enforce_closed_period_lock) was
-- wired BEFORE UPDATE OR DELETE only, so a NEW backdated entry could still be
-- posted into a closed month — silently mutating a filed P&L. Extend it to
-- INSERT as well. The function already uses coalesce(new.*, old.*) and returns
-- NEW, so it is correct for INSERT with no body change.
drop trigger if exists transactions_period_lock on finance.transactions;
create trigger transactions_period_lock
before insert or update or delete on finance.transactions
for each row execute function finance.enforce_closed_period_lock();
