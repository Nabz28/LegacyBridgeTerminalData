-- MONITOR (T12) — global Index Lab templates. Team-wide (not per-user):
-- any authenticated analyst can publish/update a template, attribution via
-- made_by (display name from the session). Delete is management-only.

create table if not exists management.monitor_templates (
  id         text primary key,
  name       text not null,
  desk_id    text,
  tickers    text[] not null,
  weights    jsonb,
  w_mode     text not null default 'equal',
  note       text not null default '',
  made_by    text not null default '',
  updated_at timestamptz not null default now()
);

comment on table management.monitor_templates is
  'Global Index Lab templates (curated baskets). RLS: read/write all authenticated (made_by attribution), delete management only.';

alter table management.monitor_templates enable row level security;

drop policy if exists "templates select" on management.monitor_templates;
drop policy if exists "templates insert" on management.monitor_templates;
drop policy if exists "templates update" on management.monitor_templates;
drop policy if exists "templates delete" on management.monitor_templates;

create policy "templates select" on management.monitor_templates
  for select to authenticated using (true);
create policy "templates insert" on management.monitor_templates
  for insert to authenticated with check (true);
create policy "templates update" on management.monitor_templates
  for update to authenticated using (true) with check (true);
create policy "templates delete" on management.monitor_templates
  for delete to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'));

grant select, insert, update, delete on management.monitor_templates to authenticated;
