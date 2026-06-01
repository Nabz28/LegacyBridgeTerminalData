-- 0044_finance_legion_posting.sql
-- LEGION service-role posting path for the finance ledger.
--
-- finance.post_transaction is SECURITY INVOKER and requires auth.uid(), so it
-- cannot be called with the service_role key (no user identity). This wrapper
-- mirrors that function's exact double-entry logic but takes an explicit actor,
-- so the legion-terminals write skill (OpenClaw, service_role) can post balanced
-- transactions from WhatsApp. SECURITY DEFINER; granted to service_role only.
--
-- All existing triggers (deferred balance check, period-insert lock, audit)
-- still fire because the inserts go through the same tables.

create or replace function finance.post_transaction_svc(
  p_entity_id uuid,
  p_date      date,
  p_memo      text,
  p_lines     jsonb,                 -- [{ account_id, debit, credit, line_order, tag_value_ids[] }]
  p_actor     uuid default '1e610000-0000-4000-8000-000000000001'  -- LEGION system actor
)
returns table (txn_id uuid, ref text)
language plpgsql
security definer
set search_path = finance, public
as $$
declare
  v_txn_id uuid; v_ref text; v_year int; v_line jsonb; v_line_id uuid;
  v_dr numeric(20,4) := 0; v_cr numeric(20,4) := 0; v_tag uuid;
begin
  if p_actor is null then
    raise exception 'post_transaction_svc requires an actor';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) < 2 then
    raise exception 'A transaction requires at least 2 journal lines';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_dr := v_dr + coalesce((v_line->>'debit')::numeric, 0);
    v_cr := v_cr + coalesce((v_line->>'credit')::numeric, 0);
  end loop;
  if v_dr <> v_cr then
    raise exception 'Unbalanced transaction: DR=% CR=%', v_dr, v_cr;
  end if;
  if v_dr = 0 then
    raise exception 'Transaction totals are zero';
  end if;

  v_year := extract(year from p_date)::int;
  v_ref  := finance.next_txn_ref(p_entity_id, v_year);

  insert into finance.transactions (ref, entity_id, date, memo, created_by, is_demo)
  values (v_ref, p_entity_id, p_date, p_memo, p_actor, false)
  returning id into v_txn_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into finance.journal_lines (txn_id, account_id, debit_idr, credit_idr, line_order)
    values (
      v_txn_id,
      (v_line->>'account_id')::uuid,
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0),
      coalesce((v_line->>'line_order')::int, 0)
    )
    returning id into v_line_id;

    if v_line ? 'tag_value_ids' then
      for v_tag in select (value)::uuid from jsonb_array_elements_text(v_line->'tag_value_ids') loop
        insert into finance.journal_line_tags (line_id, value_id)
        values (v_line_id, v_tag) on conflict do nothing;
      end loop;
    end if;
  end loop;

  return query select v_txn_id, v_ref;
end;
$$;

revoke all on function finance.post_transaction_svc(uuid, date, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function finance.post_transaction_svc(uuid, date, text, jsonb, uuid) to service_role;

-- Soft-delete (void) a posted transaction by ref, service-role callable.
create or replace function finance.void_transaction_svc(p_ref text, p_actor uuid default '1e610000-0000-4000-8000-000000000001')
returns table (out_txn_id uuid, out_ref text)
language plpgsql
security definer
set search_path = finance, public
as $$
declare v_id uuid;
begin
  update finance.transactions t
     set deleted_at = now(), updated_at = now()
   where t.ref = p_ref and t.deleted_at is null
   returning t.id into v_id;
  if v_id is null then
    raise exception 'No open transaction with ref %', p_ref;
  end if;
  return query select v_id, p_ref;
end;
$$;

revoke all on function finance.void_transaction_svc(text, uuid) from public, anon, authenticated;
grant execute on function finance.void_transaction_svc(text, uuid) to service_role;
