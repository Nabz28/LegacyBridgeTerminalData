-- Per-account Forecast Studio workspace. Each LBC analyst keeps their own
-- forecast models — the node/equation graph (variables, parents, methods,
-- scenarios, horizon) serialized as one JSONB doc. RLS gates every row to the
-- caller's JWT sub (LBC auth-login token is HS256-signed with the project
-- secret, so auth.uid() resolves to management.users.id). Mirrors the
-- analysis_workspace / equity_driver_workspace per-account pattern; lives in public.

create table if not exists public.forecast_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.forecast_workspace is
  'Per-account Forecast Studio (node/equation forecast graph + scenarios + horizon) as one JSONB doc. RLS: own row only.';

alter table public.forecast_workspace enable row level security;

drop policy if exists "own forecast select" on public.forecast_workspace;
drop policy if exists "own forecast insert" on public.forecast_workspace;
drop policy if exists "own forecast update" on public.forecast_workspace;
drop policy if exists "own forecast delete" on public.forecast_workspace;

create policy "own forecast select" on public.forecast_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own forecast insert" on public.forecast_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own forecast update" on public.forecast_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own forecast delete" on public.forecast_workspace
  for delete to authenticated using (auth.uid() = user_sub);

grant select, insert, update, delete on public.forecast_workspace to authenticated;

notify pgrst, 'reload schema';
