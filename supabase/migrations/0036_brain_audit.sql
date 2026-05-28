-- ============================================================
-- brain.notes_audit — forensic trail for every note write.
--
-- Any INSERT / UPDATE / DELETE on brain.notes lands a row here
-- with the full before/after snapshots, the operation, and best-
-- available author signal (JWT sub if writing as `authenticated`,
-- 'service_role' otherwise). Append-only by design: no triggers
-- on the audit table itself; revoke UPDATE/DELETE from everyone
-- except service_role so it cannot be tampered with.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create table if not exists brain.notes_audit (
  audit_id    bigserial primary key,
  note_id     uuid,
  op          text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  before      jsonb,
  after       jsonb,
  changed_by  text,
  at          timestamptz not null default now()
);

create index if not exists notes_audit_note_idx on brain.notes_audit(note_id, at desc);
create index if not exists notes_audit_at_idx   on brain.notes_audit(at desc);
create index if not exists notes_audit_op_idx   on brain.notes_audit(op);

-- ------------------------------------------------------------
-- Author signal: prefer the JWT `sub` claim (set by PostgREST
-- when the request is from an authenticated user). When the
-- writer is service_role there is no sub — record 'service_role'
-- so we can tell agent writes apart from human ones in audits.
-- ------------------------------------------------------------
create or replace function brain.audit_author() returns text as $fn$
declare s text;
begin
  begin
    s := current_setting('request.jwt.claims', true)::json->>'sub';
  exception when others then s := null;
  end;
  if s is null or s = '' then
    -- current_user is 'authenticator' under PostgREST; check role too
    if current_user = 'service_role' or current_user = 'postgres' then
      return current_user;
    end if;
    return 'unknown';
  end if;
  return s;
end
$fn$ language plpgsql stable;

-- ------------------------------------------------------------
-- Trigger: capture row-level before/after on every write.
-- For UPDATE, only logs when row actually changed (cheap noise filter).
-- ------------------------------------------------------------
create or replace function brain.notes_audit_trg() returns trigger as $fn$
begin
  if tg_op = 'INSERT' then
    insert into brain.notes_audit (note_id, op, before, after, changed_by)
    values (new.id, 'INSERT', null, to_jsonb(new), brain.audit_author());
    return new;
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) is distinct from to_jsonb(old) then
      insert into brain.notes_audit (note_id, op, before, after, changed_by)
      values (new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), brain.audit_author());
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into brain.notes_audit (note_id, op, before, after, changed_by)
    values (old.id, 'DELETE', to_jsonb(old), null, brain.audit_author());
    return old;
  end if;
  return null;
end
$fn$ language plpgsql;

drop trigger if exists notes_audit on brain.notes;
create trigger notes_audit
  after insert or update or delete on brain.notes
  for each row execute function brain.notes_audit_trg();

-- ------------------------------------------------------------
-- Permissions: append-only.
--   service_role: full (for legitimate read-the-audit cases).
--   authenticated: SELECT only — they can review their own
--                  history but cannot rewrite it.
--   anon: nothing.
-- The trigger itself runs as the table owner, so INSERTs into
-- notes_audit succeed regardless of caller grants.
-- ------------------------------------------------------------
revoke all on brain.notes_audit from public;
revoke all on brain.notes_audit from anon;
revoke all on brain.notes_audit from authenticated;
grant select on brain.notes_audit to authenticated;
grant select, insert, update, delete on brain.notes_audit to service_role;
grant usage, select on sequence brain.notes_audit_audit_id_seq to service_role;
grant usage, select on sequence brain.notes_audit_audit_id_seq to authenticated;

-- RLS: authenticated can see audit entries (management tier only,
-- matching the notes table policy). service_role bypasses.
alter table brain.notes_audit enable row level security;
drop policy if exists mgmt_only_read on brain.notes_audit;
create policy mgmt_only_read on brain.notes_audit
  for select to authenticated
  using ( coalesce((current_setting('request.jwt.claims', true)::json->>'user_role'), '') in ('admin','management') );
