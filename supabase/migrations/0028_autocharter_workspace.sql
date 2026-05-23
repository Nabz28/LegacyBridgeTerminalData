-- Per-account Autocharter workspace (Tools terminal). Each LBC user keeps their
-- own charting workspace — projects, categories, charts, uploaded CSV/XLSX data
-- and per-chart formatting — serialized as a single JSONB doc. RLS gates every
-- row to the caller's JWT sub (the LBC auth-login token is HS256-signed with the
-- project secret, so auth.uid() resolves to management.users.id). Mirrors the
-- macro.user_dashboard per-account pattern but lives in public (already exposed
-- to PostgREST, so the iframe needs no Accept-Profile header).

create table if not exists public.autocharter_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.autocharter_workspace is
  'Per-account Autocharter workspace (projects + charts + uploaded data) as one JSONB doc. RLS: own row only.';

alter table public.autocharter_workspace enable row level security;

drop policy if exists "own autocharter select" on public.autocharter_workspace;
drop policy if exists "own autocharter insert" on public.autocharter_workspace;
drop policy if exists "own autocharter update" on public.autocharter_workspace;
drop policy if exists "own autocharter delete" on public.autocharter_workspace;

create policy "own autocharter select" on public.autocharter_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own autocharter insert" on public.autocharter_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own autocharter update" on public.autocharter_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own autocharter delete" on public.autocharter_workspace
  for delete to authenticated using (auth.uid() = user_sub);

grant select, insert, update, delete on public.autocharter_workspace to authenticated;
