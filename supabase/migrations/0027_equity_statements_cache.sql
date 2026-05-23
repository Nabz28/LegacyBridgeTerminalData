-- 0027_equity_statements_cache.sql
-- Cache backing the Equity terminal's CIQ-style financials viewer + the WACC
-- tool. One row per Yahoo ticker (e.g. 'BBRI.JK'); `doc` is the merged
-- financial document the equity-statements edge fn assembles from Yahoo
-- (fundamentals-timeseries statements + quoteSummary snapshot + estimates).
--
-- JSONB is TOAST-compressed automatically, so the "everything, compressed"
-- requirement is satisfied without an explicit gzip column. Lives in `public`
-- (always PostgREST-exposed) to avoid an exposed-schema config change; it holds
-- only public fundamentals, no secrets. Written exclusively by the edge fn
-- under service_role (which bypasses RLS); world-readable for a fast direct
-- read path.

create table if not exists public.equity_statements_cache (
  symbol      text primary key,
  doc         jsonb       not null,
  fetched_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.equity_statements_cache enable row level security;

drop policy if exists equity_cache_read on public.equity_statements_cache;
create policy equity_cache_read on public.equity_statements_cache
  for select to anon, authenticated using (true);

grant select on public.equity_statements_cache to anon, authenticated;
grant all    on public.equity_statements_cache to service_role;
