-- 0041_finance_audit_skip_hard_delete.sql
-- Bug (final piece of the hard-delete path): finance.log_transaction_change()
-- runs AFTER DELETE and tries to INSERT a transaction_history row referencing
-- the txn that was just deleted → FK violation (txn_id not present). The normal
-- "deletion" in this product is a SOFT delete (UPDATE deleted_at), which is
-- audited via the UPDATE branch. A true hard DELETE (admin/cleanup) should not
-- attempt to log against a row that no longer exists.
-- Fix: skip the audit insert on TG_OP = 'DELETE'. INSERT/UPDATE auditing
-- (including soft-delete + restore) is unchanged.
create or replace function finance.log_transaction_change()
returns trigger language plpgsql as $$
declare
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid;
begin
  if tg_op = 'DELETE' then
    return old;  -- hard delete: nothing to log; row (and its history) is gone
  end if;

  v_actor := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_after := to_jsonb(new);
  else  -- UPDATE
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'delete';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
  end if;

  insert into finance.transaction_history (txn_id, edited_by, action, before_json, after_json)
  values (new.id, v_actor, v_action, v_before, v_after);

  return new;
end$$;
