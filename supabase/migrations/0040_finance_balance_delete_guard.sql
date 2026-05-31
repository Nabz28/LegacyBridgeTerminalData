-- 0040_finance_balance_delete_guard.sql
-- Bug: the deferred constraint trigger finance.enforce_balanced_transaction()
-- runs AFTER DELETE on journal_lines too. When a transaction is hard-deleted,
-- its journal_lines cascade-delete; at commit the deferred check sums the (now
-- empty) lines for that txn_id, sees DR=0, and raises "zero journal lines or
-- zero totals" — making it impossible to ever hard-delete a transaction
-- (cascades, demo cleanup). The app soft-deletes so it never surfaced.
-- Fix: if the parent transaction no longer exists (it's being deleted), there
-- is nothing to validate — skip. Normal posting (txn + lines present) still
-- validates DR=CR and non-zero exactly as before.
create or replace function finance.enforce_balanced_transaction()
returns trigger language plpgsql as $$
declare
  v_dr numeric(20, 4);
  v_cr numeric(20, 4);
  v_txn uuid;
begin
  v_txn := coalesce(new.txn_id, old.txn_id);

  -- parent transaction gone (being hard-deleted) → nothing to validate
  if not exists (select 1 from finance.transactions where id = v_txn) then
    return null;
  end if;

  select coalesce(sum(debit_idr), 0), coalesce(sum(credit_idr), 0)
    into v_dr, v_cr
    from finance.journal_lines
   where txn_id = v_txn;

  if v_dr <> v_cr then
    raise exception 'Transaction % is unbalanced: DR=% CR=%', v_txn, v_dr, v_cr;
  end if;
  if v_dr = 0 then
    raise exception 'Transaction % has zero journal lines or zero totals', v_txn;
  end if;

  return null;
end$$;
