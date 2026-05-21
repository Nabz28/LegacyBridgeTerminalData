-- Per-account macro dashboard preferences. Each LBC user keeps their own
-- active template + custom indicator selection. RLS gates every row to the
-- caller's JWT sub (the LBC auth-login token is HS256-signed with the project
-- secret, so auth.uid() resolves to management.users.id).

create table if not exists macro.user_dashboard (
  user_sub        uuid primary key,
  active_template text not null default 'us_overview',
  custom_keys     text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

comment on table macro.user_dashboard is
  'Per-account macro dashboard prefs (active template + custom indicator keys). RLS: own row only.';

alter table macro.user_dashboard enable row level security;

drop policy if exists "own dashboard select" on macro.user_dashboard;
drop policy if exists "own dashboard insert" on macro.user_dashboard;
drop policy if exists "own dashboard update" on macro.user_dashboard;

create policy "own dashboard select" on macro.user_dashboard
  for select to authenticated using (auth.uid() = user_sub);
create policy "own dashboard insert" on macro.user_dashboard
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own dashboard update" on macro.user_dashboard
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);

grant usage on schema macro to authenticated;
grant select, insert, update on macro.user_dashboard to authenticated;
