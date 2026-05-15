-- ============================================================
-- 0013_network_schema.sql — Module 04 (Network Terminal)
--
-- Codifies the schema for the Legacy Network System (LNS) — a D3 +
-- Supabase relationship mapper that lives at /network/ in the Legacy
-- Bridge Terminal alongside macro/, correlation/, and management/.
--
-- The Network System tables live in `public.lns_*` (NOT a dedicated
-- `network.*` schema) because the original standalone app was already
-- deployed against this Supabase project with that prefix, and the
-- data is live. This migration is therefore NON-DESTRUCTIVE —
-- `create table if not exists`, no drops — safe to apply on top of
-- an already-populated project as well as a fresh one.
--
-- To recreate from scratch on a clean project: just apply this file.
-- To reset on an existing project: see the destructive block at the
-- bottom (commented out).
-- ============================================================

-- ---------- 1. Tables ----------
create table if not exists public.lns_categories (
  id   text primary key,
  name text not null
);

create table if not exists public.lns_sectors (
  id          text primary key,
  name        text not null,
  category_id text references public.lns_categories(id) on delete cascade
);

create table if not exists public.lns_members (
  id    text primary key,
  name  text not null,
  role  text,
  image text
);

create table if not exists public.lns_connections (
  id              text primary key,
  name            text not null,
  sector_id       text references public.lns_sectors(id) on delete set null,
  closeness_index integer default 5,
  -- v4: structured fields (jsonb arrays)
  affiliations    jsonb  default '[]'::jsonb,   -- [{ company, position, current }]
  known_by        jsonb  default '[]'::jsonb,   -- [{ id, type:'member'|'connection', relType }]
  notes           jsonb  default '[]'::jsonb,   -- [{ id, text, ts }]
  -- denormalized primary affiliation (kept in sync by client) for legacy queries
  affiliation     text,
  position        text,
  image           text,
  -- v5: section / visibility / sub-type attributes
  section         text default 'network'    check (section in ('network','clients','talents')),
  visibility      text default 'public'     check (visibility in ('public','admin')),
  client_type     text                      check (client_type in ('research','investor')),
  client_status   text                      check (client_status in ('current','lead')),
  talent_stage    text                      check (talent_stage in ('undergrad','grad','experienced','alumni','other')),
  created_at      timestamptz default now()
);

create table if not exists public.lns_company_meta (
  name text primary key,
  logo text
);

-- ---------- 2. Backfill new columns on pre-v5 deployments ----------
-- These ALTER ... ADD IF NOT EXISTS so the migration is safe on databases
-- that were created from an older schema dump.
alter table public.lns_connections add column if not exists section       text default 'network'
  check (section in ('network','clients','talents'));
alter table public.lns_connections add column if not exists visibility    text default 'public'
  check (visibility in ('public','admin'));
alter table public.lns_connections add column if not exists client_type   text
  check (client_type in ('research','investor'));
alter table public.lns_connections add column if not exists client_status text
  check (client_status in ('current','lead'));
alter table public.lns_connections add column if not exists talent_stage  text
  check (talent_stage in ('undergrad','grad','experienced','alumni','other'));

-- ---------- 3. Realtime publication ----------
-- Wrapped in DO blocks so re-runs don't fail if a table is already published.
do $$ begin
  alter publication supabase_realtime add table public.lns_categories;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.lns_sectors;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.lns_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.lns_connections;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.lns_company_meta;
exception when duplicate_object then null; end $$;

-- ---------- 4. Row-Level Security ----------
-- RLS is REQUIRED for any table reachable by the anon publishable key.
-- Default policy is `allow_all` — anyone with the URL can read/write.
-- This is OK for a private internal tool whose URL is gated by Vercel
-- access controls / obscurity. TIGHTEN when wired to management's
-- auth-login (Edge Function) — see migration 0014 (queued).
alter table public.lns_categories   enable row level security;
alter table public.lns_sectors      enable row level security;
alter table public.lns_members      enable row level security;
alter table public.lns_connections  enable row level security;
alter table public.lns_company_meta enable row level security;

drop policy if exists "allow_all" on public.lns_categories;
drop policy if exists "allow_all" on public.lns_sectors;
drop policy if exists "allow_all" on public.lns_members;
drop policy if exists "allow_all" on public.lns_connections;
drop policy if exists "allow_all" on public.lns_company_meta;

create policy "allow_all" on public.lns_categories   for all using (true) with check (true);
create policy "allow_all" on public.lns_sectors      for all using (true) with check (true);
create policy "allow_all" on public.lns_members      for all using (true) with check (true);
create policy "allow_all" on public.lns_connections  for all using (true) with check (true);
create policy "allow_all" on public.lns_company_meta for all using (true) with check (true);

-- ---------- 5. Helpful indexes ----------
create index if not exists idx_lns_sectors_category    on public.lns_sectors (category_id);
create index if not exists idx_lns_connections_sector  on public.lns_connections (sector_id);
create index if not exists idx_lns_connections_created on public.lns_connections (created_at desc);
create index if not exists idx_lns_connections_section on public.lns_connections (section);
create index if not exists idx_lns_connections_vis     on public.lns_connections (visibility);

-- ---------- 6. Refresh PostgREST schema cache ----------
notify pgrst, 'reload schema';

-- ============================================================
-- DESTRUCTIVE RESET (commented out — uncomment only on a fresh project
-- or when you really want to wipe Network data):
--
-- drop table if exists public.lns_connections   cascade;
-- drop table if exists public.lns_company_meta  cascade;
-- drop table if exists public.lns_sectors       cascade;
-- drop table if exists public.lns_categories    cascade;
-- drop table if exists public.lns_members       cascade;
-- ============================================================

-- Done. Expected output: "Success. No rows returned."
