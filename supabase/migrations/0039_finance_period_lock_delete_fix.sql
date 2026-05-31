-- 0039_finance_period_lock_delete_fix.sql
-- Bug: finance.enforce_closed_period_lock() ended with `return new`. In a
-- BEFORE DELETE trigger NEW is NULL, and returning NULL silently CANCELS the
-- delete (no error, 0 rows affected). The app normally soft-deletes (UPDATE
-- deleted_at) so it never surfaced, but hard deletes (demo cleanup, cascades)
-- were silently no-ops. Return OLD on DELETE so deletes proceed (still blocked
-- by the closed-period RAISE above when the period is locked).
create or replace function finance.enforce_closed_period_lock()
returns trigger language plpgsql as $$
declare
  v_status finance.period_status;
  v_date date;
  v_entity uuid;
begin
  v_date := coalesce(new.date, old.date);
  v_entity := coalesce(new.entity_id, old.entity_id);

  select status into v_status
    from finance.periods
   where entity_id = v_entity
     and year = extract(year from v_date)
     and month = extract(month from v_date);

  if v_status = 'closed' then
    raise exception 'Period for % (entity %) is closed; post a reversing entry instead',
      to_char(v_date, 'YYYY-MM'), v_entity;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end$$;
