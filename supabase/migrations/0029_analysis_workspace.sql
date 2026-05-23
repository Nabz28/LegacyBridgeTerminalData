-- Per-account Analysis workbench (Macro terminal → Analysis). Each LBC economist
-- keeps their own saved models, datasets, variable definitions, transforms,
-- cleaning recipes and results — serialized as one JSONB doc. RLS gates every
-- row to the caller's JWT sub (LBC auth-login token is HS256-signed with the
-- project secret, so auth.uid() resolves to management.users.id). Mirrors the
-- autocharter_workspace per-account pattern; lives in public (PostgREST-exposed).

create table if not exists public.analysis_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.analysis_workspace is
  'Per-account econometric Analysis workbench (saved models + datasets + recipes) as one JSONB doc. RLS: own row only.';

alter table public.analysis_workspace enable row level security;

drop policy if exists "own analysis select" on public.analysis_workspace;
drop policy if exists "own analysis insert" on public.analysis_workspace;
drop policy if exists "own analysis update" on public.analysis_workspace;
drop policy if exists "own analysis delete" on public.analysis_workspace;

create policy "own analysis select" on public.analysis_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own analysis insert" on public.analysis_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own analysis update" on public.analysis_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own analysis delete" on public.analysis_workspace
  for delete to authenticated using (auth.uid() = user_sub);

grant select, insert, update, delete on public.analysis_workspace to authenticated;
