-- ============================================================
-- brain schema — LEGION's knowledge base (the 9th terminal, T9)
-- Legacy Bridge Capital's Engine for Growth, Intelligence &
-- Operational Networks. An Obsidian-like, ever-growing store of
-- everything about LBC: strategy, operations, HR, investments,
-- people, growth — plus the company-level goals / KPIs /
-- milestones that drive the HQ dashboard.
--
-- Additive + isolated; does NOT touch public/macro/correlation/
-- management/asset_mgmt. RLS gated on the auth-login JWT
-- `user_role` claim (admin|management). Idempotent: safe to re-run.
-- ============================================================

create schema if not exists brain;

-- pg_trgm powers fast ILIKE search across a large brain.
create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------
-- notes — the single flexible store. Everything is a note.
--   type    = note | inbox | goal | kpi | milestone | initiative
--             | risk | todo | person | meeting | status_snapshot
--   folder  = home | strategy | operations | hr | investments
--             | people | growth | knowledge | inbox  (free-form)
--   status  = inbox (raw, unfiled) | filed | archived
--   body    = markdown, supports [[wikilinks]]
--   links   = resolved outbound wikilink targets (note titles)
--   data    = typed extras (JSONB), by type:
--     goal        { target, current, unit, due, progress, status, owner }
--     kpi         { value, target, unit, period, trend }
--     milestone   { due, status, done_at }
--     initiative  { priority, stage, impact }
--     status_snapshot { generated_at, headline, behind[], ahead[],
--                       next_actions[], by }
--   source_id = for a filed note derived from an inbox dump, the
--               inbox note it was triaged from (audit trail).
-- ------------------------------------------------------------
create table if not exists brain.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  folder      text not null default 'inbox',
  type        text not null default 'note',
  tags        text[] not null default '{}',
  body        text not null default '',
  links       text[] not null default '{}',
  status      text not null default 'filed',
  data        jsonb not null default '{}'::jsonb,
  pinned      boolean not null default false,
  source_id   uuid,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_folder_idx  on brain.notes(folder, status);
create index if not exists notes_type_idx    on brain.notes(type);
create index if not exists notes_status_idx  on brain.notes(status);
create index if not exists notes_updated_idx on brain.notes(updated_at desc);
create index if not exists notes_tags_idx    on brain.notes using gin(tags);
create index if not exists notes_fts_idx     on brain.notes
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')));
create index if not exists notes_title_trgm  on brain.notes using gin(title  extensions.gin_trgm_ops);
create index if not exists notes_body_trgm   on brain.notes using gin(body   extensions.gin_trgm_ops);

-- keep updated_at honest regardless of who writes (browser, Claude Code, edge fn)
create or replace function brain.touch_updated_at() returns trigger as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$ language plpgsql;

drop trigger if exists notes_touch on brain.notes;
create trigger notes_touch before update on brain.notes
  for each row execute function brain.touch_updated_at();

-- ------------------------------------------------------------
-- Seed: a Brain-Home note + a few starter records so the HQ and
-- the wiki render on first load. Fixed UUIDs => idempotent.
-- (Real strategy/goals are loaded by LEGION on the first /lbc run.)
-- ------------------------------------------------------------
insert into brain.notes (id, title, folder, type, tags, status, pinned, body, data) values
(
  '00000000-0000-0000-0000-000000000001',
  'LEGION — Brain Home',
  'home', 'note', '{index,start-here}', 'filed', true,
  E'# LEGION\n\nLegacy Bridge Capital''s **E**ngine for **G**rowth, **I**ntelligence & **O**perational **N**etworks.\n\nThis is the brain — everything LBC knows, lives here. Dump anything into the **Inbox** and LEGION will sort, assess, and file it.\n\n## Folders\n- [[strategy]] — direction, positioning, big bets\n- [[operations]] — process, tooling, the terminal itself\n- [[hr]] — team, hiring, roles, performance\n- [[investments]] — the book, theses, mandates\n- [[people]] — contacts, clients, network\n- [[growth]] — funnel, AUM, distribution\n- [[knowledge]] — durable reference\n\n## How it works\n- **Browser** = capture + read (dump + browse the wiki + HQ dashboard).\n- **Claude Code** (`/lbc`) = LEGION reasons, triages the inbox, updates goals, computes status.',
  '{}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000002',
  'Reach 8 fully-active terminals',
  'growth', 'goal', '{product,terminal}', 'filed', false,
  'First company-level goal seeded with the brain. Replace/extend on the first /lbc run.',
  '{"target": 8, "current": 8, "unit": "terminals", "due": "2026-06-30", "progress": 100, "status": "done", "owner": "product"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000003',
  'Ship LEGION (T9)',
  'operations', 'milestone', '{product,legion}', 'filed', false,
  'The 9th terminal — LEGION — goes live.',
  '{"due": "2026-05-25", "status": "pending"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000004',
  'Active terminals',
  'product', 'kpi', '{product}', 'filed', false,
  'Live terminal count across the LBC research OS.',
  '{"value": 9, "target": 9, "unit": "terminals", "period": "now", "trend": "up"}'::jsonb
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Grants: authenticated (browser, user JWT) + service_role
-- (Claude Code / edge fns). NOT anon. service_role granted up
-- front so LEGION-the-reasoner can read/write without RLS hassle.
-- ------------------------------------------------------------
grant usage on schema brain to authenticated, service_role;
grant select, insert, update, delete on all tables in schema brain to authenticated, service_role;
grant execute on all functions in schema brain to authenticated, service_role;
alter default privileges in schema brain
  grant select, insert, update, delete on tables to authenticated, service_role;

-- ------------------------------------------------------------
-- RLS: management tier only (user_role in admin|management).
-- service_role bypasses RLS by design.
-- ------------------------------------------------------------
do $mig$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'brain'
  loop
    execute format('alter table brain.%I enable row level security;', t);
    execute format('drop policy if exists mgmt_only on brain.%I;', t);
    execute format($p$
      create policy mgmt_only on brain.%I for all to authenticated
      using ( coalesce((current_setting('request.jwt.claims', true)::json->>'user_role'), '') in ('admin','management') )
      with check ( coalesce((current_setting('request.jwt.claims', true)::json->>'user_role'), '') in ('admin','management') );
    $p$, t);
  end loop;
end
$mig$;
