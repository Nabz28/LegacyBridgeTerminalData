-- ===========================================================================
-- 0065_research_calendar.sql
-- The RESEARCH (T13) calendar: our own events, and our priority on any event.
--
-- The macro terminal's calendar (macro.calendar, 0052) is a FEED: 863 events
-- written by the autonomous agent through the service role, with a `hash` dedup
-- key it re-syncs against. Clients hold SELECT only. So Research cannot — and
-- must not — write into it: an added row would be outside the agent's hash space
-- and a future re-sync could drop or duplicate it.
--
-- Instead Research owns two small tables and MERGES them with the feed at render
-- time:
--
--   research_event       our own events (an internal deadline, a site visit, a
--                        management meeting, an expected filing)
--   research_event_flag  star / priority / note on ANY event, feed or ours
--
-- The flag is keyed by a synthetic text `event_key`:
--   'macro:<hash>'     — a feed event. hash is the agent's own dedup key
--                        (region|category|date|title|ticker), so a star survives
--                        the nightly re-sync. id would not: it is an identity
--                        column that changes if a row is re-inserted.
--   'research:<uuid>'   — one of ours.
--
-- No foreign key to either side, deliberately: a star must outlive the feed
-- dropping an event, and must not block deleting one of our own.
-- ===========================================================================

-- ------------------------------------------------------------- custom events
-- Shape deliberately mirrors the useful columns of macro.calendar so the two
-- merge into one row type on the client, plus the taxonomy links the rest of
-- Research uses.
create table if not exists management.research_event (
  id              uuid primary key default gen_random_uuid(),
  event_date      date not null,
  event_time      text not null default '',
  region          text not null default 'Global',
  category        text not null default 'other',
  title           text not null,
  entity          text not null default '',
  ticker          text,
  detail          text not null default '',
  period          text not null default '',
  importance      text not null default 'med',
  status          text not null default 'confirmed',
  url             text not null default '',
  -- taxonomy: an event can belong to an industry / sub-industry
  desk_id         text,
  sub_id          text,
  created_by      uuid,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_event_importance_ck check (importance in ('high','med','low')),
  constraint research_event_status_ck     check (status in ('confirmed','tentative','estimated')),
  constraint research_event_region_ck     check (region in ('US','ID','Global'))
);

comment on table management.research_event is
  'RESEARCH (T13) our own calendar events, merged client-side with the macro.calendar feed. RLS: read all authenticated, write admin/management.';

create index if not exists research_event_date_idx  on management.research_event (event_date);
create index if not exists research_event_scope_idx on management.research_event (desk_id, sub_id);

drop trigger if exists research_event_touch on management.research_event;
create trigger research_event_touch before update on management.research_event
  for each row execute function management.research_touch();

-- --------------------------------------------------------------- star / flag
create table if not exists management.research_event_flag (
  event_key       text primary key,
  starred         boolean not null default true,
  priority        text not null default 'normal',
  note            text not null default '',
  -- denormalised so a starred feed event can still be listed if the feed drops
  -- it (the star is the record that we cared, and why)
  event_date      date,
  title           text not null default '',
  updated_by      uuid,
  updated_by_name text not null default '',
  updated_at      timestamptz not null default now(),
  constraint research_event_flag_priority_ck check (priority in ('critical','high','normal','low')),
  constraint research_event_flag_key_ck      check (event_key ~ '^(macro|research):')
);

comment on table management.research_event_flag is
  'RESEARCH (T13) star / priority / note on any calendar event. event_key is macro:<hash> or research:<uuid>. RLS: read all authenticated, write admin/management.';

create index if not exists research_event_flag_starred_idx on management.research_event_flag (starred, event_date);

drop trigger if exists research_event_flag_touch on management.research_event_flag;
create trigger research_event_flag_touch before update on management.research_event_flag
  for each row execute function management.research_touch();

-- ----------------------------------------------------------------------- RLS
alter table management.research_event      enable row level security;
alter table management.research_event_flag enable row level security;

do $$
declare
  t text;
  tbls text[] := array['research_event','research_event_flag'];
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

-- -------------------------------------------------------------------- grants
grant select, insert, update, delete on management.research_event      to authenticated;
grant select, insert, update, delete on management.research_event_flag to authenticated;
grant select, insert, update, delete on management.research_event      to service_role;
grant select, insert, update, delete on management.research_event_flag to service_role;
