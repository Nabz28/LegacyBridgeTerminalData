-- MONITOR (T12) — shared desk assignments. One row per coverage desk
-- (fig, rep, tech, … fx, rates, econ). Everyone authenticated can read;
-- only admin/management can write (assignments are a management decision).
-- The LBC custom JWT carries `user_role` (see 0021) and sub = users.id.

create table if not exists management.monitor_coverage (
  desk_id    text primary key,
  head       text not null default '',
  analysts   text[] not null default '{}',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

comment on table management.monitor_coverage is
  'MONITOR terminal desk assignments (head + analysts per coverage desk). RLS: read all authenticated, write admin/management.';

alter table management.monitor_coverage enable row level security;

drop policy if exists "monitor coverage select" on management.monitor_coverage;
drop policy if exists "monitor coverage insert" on management.monitor_coverage;
drop policy if exists "monitor coverage update" on management.monitor_coverage;

create policy "monitor coverage select" on management.monitor_coverage
  for select to authenticated using (true);
create policy "monitor coverage insert" on management.monitor_coverage
  for insert to authenticated
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "monitor coverage update" on management.monitor_coverage
  for update to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'))
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));

grant usage on schema management to authenticated;
grant select, insert, update on management.monitor_coverage to authenticated;
