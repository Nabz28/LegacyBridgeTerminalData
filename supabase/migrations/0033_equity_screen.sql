-- Equity screener dataset + per-account saved screens.
--
-- public.equity_screen — one row per IDX name with the screenable market &
-- fundamental metrics (refreshed from Yahoo by the equity-screen edge fn, which
-- writes with the service-role key and therefore bypasses RLS). It is shared
-- REFERENCE data (no PII), so every signed-in analyst can read it.
--
-- public.equity_screen_workspace — each analyst's saved screen definitions
-- (named filter sets + column layout) as one JSONB doc, own-row RLS, mirroring
-- the analysis_workspace / equity_driver_workspace pattern.

create table if not exists public.equity_screen (
  symbol         text primary key,          -- IDX ticker without suffix, e.g. BBCA
  yahoo          text,                       -- the .JK ticker used to fetch
  name           text,
  sector         text,
  sub_sector     text,
  currency       text,
  price          double precision,
  change_pct     double precision,
  mcap           double precision,           -- market cap (reporting currency)
  shares_out     double precision,
  free_float_pct double precision,           -- floatShares / sharesOutstanding × 100
  adv_value      double precision,           -- avg daily traded value (liquidity) = avgVol × price
  avg_volume     double precision,
  pe             double precision,
  pb             double precision,
  ps             double precision,
  ev_ebitda      double precision,
  roe            double precision,            -- %
  roa            double precision,            -- %
  net_margin     double precision,            -- %
  gross_margin   double precision,            -- %
  rev_growth     double precision,            -- YoY %
  earnings_growth double precision,           -- YoY %
  debt_equity    double precision,
  current_ratio  double precision,
  div_yield      double precision,            -- %
  beta           double precision,
  w52_high       double precision,
  w52_low        double precision,
  updated_at     timestamptz not null default now()
);

create index if not exists equity_screen_sector_idx on public.equity_screen (sector);
create index if not exists equity_screen_mcap_idx on public.equity_screen (mcap);

comment on table public.equity_screen is
  'IDX screener dataset (market + fundamental metrics per name), refreshed from Yahoo by the equity-screen edge fn (service-role writes). Shared reference data: read-only for signed-in users.';

alter table public.equity_screen enable row level security;
drop policy if exists "screen read" on public.equity_screen;
create policy "screen read" on public.equity_screen
  for select to anon, authenticated using (true);
grant select on public.equity_screen to anon, authenticated;

-- per-account saved screens
create table if not exists public.equity_screen_workspace (
  user_sub   uuid primary key,
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.equity_screen_workspace is
  'Per-account saved equity screens (named filter sets + column layout) as one JSONB doc. RLS: own row only.';

alter table public.equity_screen_workspace enable row level security;
drop policy if exists "own screen select" on public.equity_screen_workspace;
drop policy if exists "own screen insert" on public.equity_screen_workspace;
drop policy if exists "own screen update" on public.equity_screen_workspace;
drop policy if exists "own screen delete" on public.equity_screen_workspace;
create policy "own screen select" on public.equity_screen_workspace
  for select to authenticated using (auth.uid() = user_sub);
create policy "own screen insert" on public.equity_screen_workspace
  for insert to authenticated with check (auth.uid() = user_sub);
create policy "own screen update" on public.equity_screen_workspace
  for update to authenticated using (auth.uid() = user_sub) with check (auth.uid() = user_sub);
create policy "own screen delete" on public.equity_screen_workspace
  for delete to authenticated using (auth.uid() = user_sub);
grant select, insert, update, delete on public.equity_screen_workspace to authenticated;

notify pgrst, 'reload schema';
