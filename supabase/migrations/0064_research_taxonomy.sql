-- ===========================================================================
-- 0064_research_taxonomy.sql
-- Make the RESEARCH (T13) taxonomy editable, and give a house view a geography.
--
-- Until now the coverage taxonomy was entirely code (monitor-data.js): 13 desks
-- with fixed sub-industries and a fixed country map. That is right for MONITOR,
-- whose desks mirror the firm's operating structure — but Research needs to
-- follow the principal's own map: new industries, new sub-industry categories,
-- countries the coverage book never listed.
--
-- Approach: OVERLAY, not replacement. The built-in book stays the spine (so
-- Monitor and Research keep sharing it); these tables ADD to it and the client
-- merges the two into one taxonomy. Nothing here can delete or corrupt a
-- built-in desk, so a bad row can never break Monitor.
--
-- No foreign keys to research_stance / research_note / research_watch, matching
-- the convention set in 0059: research must outlive a taxonomy edit. Deleting a
-- custom industry leaves its notes and stances intact but unparented; the client
-- surfaces those rather than silently hiding them.
-- ===========================================================================

-- ------------------------------------------------------------------ industry
-- A custom industry (desk). `id` is a slug and must not collide with a built-in
-- desk id — the client validates that before insert, since the built-in list
-- lives in JS and Postgres cannot see it.
create table if not exists management.research_industry (
  id              text primary key,
  name            text not null,
  short           text not null default '',
  gics            text not null default '',
  grp             text not null default 'equity',
  accent          text not null default '#b8a7f0',
  sort_order      int  not null default 100,
  created_by      uuid,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_industry_grp_ck check (grp in ('equity','markets','custom')),
  constraint research_industry_id_ck  check (id ~ '^[a-z0-9][a-z0-9-]{0,38}$')
);

comment on table management.research_industry is
  'RESEARCH (T13) custom industries — overlay on top of the built-in coverage desks. RLS: read all authenticated, write admin/management.';

-- -------------------------------------------------------------- sub-industry
-- industry_id may reference EITHER a built-in desk id (e.g. "tech") or a
-- research_industry.id. Deliberately untyped for that reason.
create table if not exists management.research_subindustry (
  id              text primary key,
  industry_id     text not null,
  name            text not null,
  note            text not null default '',
  sort_order      int  not null default 100,
  created_by      uuid,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_subindustry_id_ck check (id ~ '^[a-z0-9][a-z0-9-]{0,38}$')
);

comment on table management.research_subindustry is
  'RESEARCH (T13) custom sub-industries. industry_id points at a built-in desk id OR a research_industry id.';

create index if not exists research_subindustry_industry_idx
  on management.research_subindustry (industry_id);

-- ------------------------------------------------------------------ country
-- Custom geographies. Countries the built-in COUNTRIES map does not carry, or
-- bespoke groupings the principal wants to take a view on.
create table if not exists management.research_country (
  code            text primary key,
  name            text not null,
  region          text not null default '',
  flag            text not null default '',
  asean           boolean not null default false,
  sort_order      int  not null default 100,
  created_by      uuid,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_country_code_ck check (code ~ '^[A-Z0-9][A-Z0-9_-]{0,11}$')
);

comment on table management.research_country is
  'RESEARCH (T13) custom countries/geographies — overlay on the built-in COUNTRIES map.';

-- ---------------------------------------------------- geography on the stance
-- A view now carries a geography: GLOBAL, a region (AM/EU/AP/ME/ASEAN) or a
-- country code. "Bullish Indonesian banks" and "bearish global banks" are two
-- different, simultaneously-valid house views.
--
-- scope_id encodes it — desk:tech@GLOBAL, sub:tech/semis@ID — so the primary key
-- keeps working and an upsert stays a single round-trip. The column is stored
-- separately too, so filtering by geography does not mean parsing the key.
alter table management.research_stance
  add column if not exists geo text not null default 'GLOBAL';

create index if not exists research_stance_geo_idx on management.research_stance (geo);

-- --------------------------------------------------------------------- touch
drop trigger if exists research_industry_touch on management.research_industry;
create trigger research_industry_touch before update on management.research_industry
  for each row execute function management.research_touch();

drop trigger if exists research_subindustry_touch on management.research_subindustry;
create trigger research_subindustry_touch before update on management.research_subindustry
  for each row execute function management.research_touch();

drop trigger if exists research_country_touch on management.research_country;
create trigger research_country_touch before update on management.research_country
  for each row execute function management.research_touch();

-- ----------------------------------------------------------------------- RLS
-- The taxonomy is house structure, so it follows the house-view rule: everyone
-- reads it (the whole terminal is unusable otherwise), admin/management writes.
alter table management.research_industry     enable row level security;
alter table management.research_subindustry  enable row level security;
alter table management.research_country      enable row level security;

do $$
declare
  t text;
  tbls text[] := array['research_industry','research_subindustry','research_country'];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists %I on management.%I;', t || '_select', t);
    execute format('drop policy if exists %I on management.%I;', t || '_insert', t);
    execute format('drop policy if exists %I on management.%I;', t || '_update', t);
    execute format('drop policy if exists %I on management.%I;', t || '_delete', t);

    execute format(
      'create policy %I on management.%I for select to authenticated using (true);',
      t || '_select', t);
    execute format(
      'create policy %I on management.%I for insert to authenticated with check ((auth.jwt() ->> ''user_role'') in (''admin'',''management''));',
      t || '_insert', t);
    execute format(
      'create policy %I on management.%I for update to authenticated using ((auth.jwt() ->> ''user_role'') in (''admin'',''management'')) with check ((auth.jwt() ->> ''user_role'') in (''admin'',''management''));',
      t || '_update', t);
    execute format(
      'create policy %I on management.%I for delete to authenticated using ((auth.jwt() ->> ''user_role'') in (''admin'',''management''));',
      t || '_delete', t);
  end loop;
end $$;

-- ------------------------------------------------------------ rollup rebuild
-- 0059's rollup assumed one desk-level stance per desk. With geography there can
-- now be several (GLOBAL, ID, AP…), which would fan the board out to duplicate
-- rows per desk. The board shows the GLOBAL view as the headline, plus a count
-- of how many geo-specific views exist beneath it.
create or replace view management.research_desk_rollup
with (security_invoker = true) as
with ids as (
  select desk_id from management.research_stance where desk_id is not null
  union
  select desk_id from management.research_note   where desk_id is not null
  union
  select desk_id from management.research_watch  where desk_id is not null
)
select
  i.desk_id,
  st.stance,
  st.conviction,
  st.thesis,
  st.horizon,
  st.updated_at,
  (select count(*)::int from management.research_note  n where n.desk_id = i.desk_id) as notes,
  (select count(*)::int from management.research_watch w where w.desk_id = i.desk_id) as watches,
  (select count(*)::int from management.research_stance s
     where s.desk_id = i.desk_id and s.sub_id is not null)                            as subs_flagged,
  (select count(*)::int from management.research_stance g
     where g.desk_id = i.desk_id and g.sub_id is null and g.geo <> 'GLOBAL')          as geo_views
from ids i
left join management.research_stance st
  on st.desk_id = i.desk_id and st.sub_id is null and st.geo = 'GLOBAL';

comment on view management.research_desk_rollup is
  'RESEARCH (T13) per-desk rollup — GLOBAL desk stance + note/watch/flagged-sub/geo-view counts.';

grant select on management.research_desk_rollup to authenticated, service_role;

-- -------------------------------------------------------------------- grants
grant select, insert, update, delete on management.research_industry    to authenticated;
grant select, insert, update, delete on management.research_subindustry to authenticated;
grant select, insert, update, delete on management.research_country     to authenticated;

grant select, insert, update, delete on management.research_industry    to service_role;
grant select, insert, update, delete on management.research_subindustry to service_role;
grant select, insert, update, delete on management.research_country     to service_role;
