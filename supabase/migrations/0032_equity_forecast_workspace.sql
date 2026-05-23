-- Per-account Equity Forecast workspace. Each LBC analyst keeps their own
-- equity forecast models — the node/equation graph where a node's history can
-- be a company's financial metric (revenue, EBIT, margin… pulled by ticker) or
-- a macro driver — serialized as one JSONB doc. RLS gates every row to the
-- caller's JWT sub. Mirrors forecast_workspace; separate table so the macro
-- Forecast Studio and the Equity Forecast keep independent models. Lives in public.

create table if not exists public.equity_forecast_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.equity_forecast_workspace is
  'Per-account Equity Forecast (node/equation forecast graph over financial-metric + macro drivers) as one JSONB doc. RLS: own row only.';

alter table public.equity_forecast_workspace enable row level security;

drop policy if exists "own eqfc select" on public.equity_forecast_workspace;
drop policy if exists "own eqfc insert" on public.equity_forecast_workspace;
drop policy if exists "own eqfc update" on public.equity_forecast_workspace;
drop policy if exists "own eqfc delete" on public.equity_forecast_workspace;

create policy "own eqfc select" on public.equity_forecast_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own eqfc insert" on public.equity_forecast_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own eqfc update" on public.equity_forecast_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own eqfc delete" on public.equity_forecast_workspace
  for delete to authenticated using (auth.uid() = user_sub);

grant select, insert, update, delete on public.equity_forecast_workspace to authenticated;

notify pgrst, 'reload schema';
