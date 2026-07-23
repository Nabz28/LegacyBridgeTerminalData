-- MONITOR (T12) — per-user preferences (saved custom indices etc.) as one
-- JSONB doc, mirroring the autocharter_workspace / macro.user_dashboard
-- pattern. RLS: own row only (auth.uid() = management.users.id via the
-- LBC custom JWT sub).

create table if not exists management.monitor_prefs (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table management.monitor_prefs is
  'Per-user MONITOR terminal prefs (saved custom indices, view state) as one JSONB doc. RLS: own row only.';

alter table management.monitor_prefs enable row level security;

drop policy if exists "own monitor prefs select" on management.monitor_prefs;
drop policy if exists "own monitor prefs insert" on management.monitor_prefs;
drop policy if exists "own monitor prefs update" on management.monitor_prefs;

create policy "own monitor prefs select" on management.monitor_prefs
  for select to authenticated using (auth.uid() = user_sub);
create policy "own monitor prefs insert" on management.monitor_prefs
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own monitor prefs update" on management.monitor_prefs
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);

grant select, insert, update on management.monitor_prefs to authenticated;
