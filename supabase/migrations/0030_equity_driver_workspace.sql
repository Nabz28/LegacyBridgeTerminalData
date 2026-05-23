-- Per-account Equity Driver Lab workspace. Each LBC analyst keeps their own
-- driver models — pasted/auto-pulled financial metric series, macro drivers,
-- transforms/lags, fitted models and scenarios — serialized as one JSONB doc.
-- RLS gates every row to the caller's JWT sub (LBC auth-login token is HS256-
-- signed with the project secret, so auth.uid() resolves to management.users.id).
-- Mirrors the analysis_workspace per-account pattern; lives in public.

create table if not exists public.equity_driver_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.equity_driver_workspace is
  'Per-account Equity Driver Lab (financial-metric series + macro drivers + models + scenarios) as one JSONB doc. RLS: own row only.';

alter table public.equity_driver_workspace enable row level security;

drop policy if exists "own driver select" on public.equity_driver_workspace;
drop policy if exists "own driver insert" on public.equity_driver_workspace;
drop policy if exists "own driver update" on public.equity_driver_workspace;
drop policy if exists "own driver delete" on public.equity_driver_workspace;

create policy "own driver select" on public.equity_driver_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own driver insert" on public.equity_driver_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own driver update" on public.equity_driver_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own driver delete" on public.equity_driver_workspace
  for delete to authenticated using (auth.uid() = user_sub);

grant select, insert, update, delete on public.equity_driver_workspace to authenticated;
