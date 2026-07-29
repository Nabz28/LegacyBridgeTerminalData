-- RESEARCH (T13) — the research hub that sits on the same desk / sub-industry
-- spine as MONITOR (T12). Monitor answers "what is the market doing"; Research
-- stores "what do WE think about it": a house stance per desk & sub-industry,
-- free-form research notes attached anywhere on the spine, and a watchlist of
-- names with thesis / target / catalyst.
--
-- Taxonomy note: desk_id / sub_id / ticker are the ids from the client-side
-- coverage book (launcher/scripts/monitor-data.js). They are deliberately NOT
-- foreign keys — the taxonomy lives in code and versions with the frontend, so
-- a desk rename must never orphan a year of research notes.
--
-- RLS mirrors the established pattern:
--   * stance + watchlist = house view    -> read all authenticated, write admin/management
--   * notes              = personal work -> read all authenticated, insert any authenticated,
--                                           update/delete own rows (admin/management override)

-- ---------------------------------------------------------------- shared bits
create or replace function management.research_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

comment on function management.research_touch is
  'RESEARCH (T13): stamps updated_at on write so clients cannot backdate a row.';

-- ------------------------------------------------------------------- stance
-- One row per scope. scope_id is a synthetic text key ('desk:tech',
-- 'sub:tech/semis') so PostgREST upserts need no lookup round-trip.
create table if not exists management.research_stance (
  scope_id        text primary key,
  desk_id         text not null,
  sub_id          text,
  stance          text not null default 'watching',
  conviction      smallint not null default 3,
  thesis          text not null default '',
  horizon         text not null default '6M',
  updated_by      uuid,
  updated_by_name text not null default '',
  updated_at      timestamptz not null default now(),
  constraint research_stance_stance_ck
    check (stance in ('bullish','bearish','neutral','watching','avoid')),
  constraint research_stance_conviction_ck
    check (conviction between 1 and 5)
);

comment on table management.research_stance is
  'RESEARCH (T13) house view per coverage desk / sub-industry. RLS: read all authenticated, write admin/management.';

create index if not exists research_stance_desk_idx on management.research_stance (desk_id);

drop trigger if exists research_stance_touch on management.research_stance;
create trigger research_stance_touch before update on management.research_stance
  for each row execute function management.research_touch();

-- -------------------------------------------------------------------- notes
create table if not exists management.research_note (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  body        text not null default '',
  kind        text not null default 'note',
  desk_id     text,
  sub_id      text,
  ticker      text,
  tags        text[] not null default '{}',
  pinned      boolean not null default false,
  author_id   uuid,
  author      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint research_note_kind_ck
    check (kind in ('note','idea','thesis','catalyst','risk','meeting','question','data'))
);

comment on table management.research_note is
  'RESEARCH (T13) research notes, attachable to a desk, sub-industry or single name. RLS: read all authenticated, write own rows (admin/management override).';

create index if not exists research_note_scope_idx   on management.research_note (desk_id, sub_id);
create index if not exists research_note_ticker_idx  on management.research_note (ticker);
create index if not exists research_note_updated_idx on management.research_note (updated_at desc);
create index if not exists research_note_tags_idx    on management.research_note using gin (tags);

drop trigger if exists research_note_touch on management.research_note;
create trigger research_note_touch before update on management.research_note
  for each row execute function management.research_touch();

-- ---------------------------------------------------------------- watchlist
-- One row per name: a ticker carries a single house view, not one per author.
create table if not exists management.research_watch (
  id              uuid primary key default gen_random_uuid(),
  ticker          text not null unique,
  name            text not null default '',
  desk_id         text,
  sub_id          text,
  stance          text not null default 'watching',
  conviction      smallint not null default 3,
  status          text not null default 'watching',
  thesis          text not null default '',
  target_price    numeric,
  entry_price     numeric,
  currency        text not null default '',
  catalyst        text not null default '',
  catalyst_date   date,
  tags            text[] not null default '{}',
  author_id       uuid,
  author          text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_watch_stance_ck
    check (stance in ('bullish','bearish','neutral','watching','avoid')),
  constraint research_watch_status_ck
    check (status in ('watching','researching','candidate','position','passed','exited')),
  constraint research_watch_conviction_ck
    check (conviction between 1 and 5)
);

comment on table management.research_watch is
  'RESEARCH (T13) watchlist — names flagged to watch with thesis, target and catalyst. RLS: read all authenticated, write admin/management.';

create index if not exists research_watch_scope_idx  on management.research_watch (desk_id, sub_id);
create index if not exists research_watch_status_idx on management.research_watch (status);

drop trigger if exists research_watch_touch on management.research_watch;
create trigger research_watch_touch before update on management.research_watch
  for each row execute function management.research_touch();

-- ----------------------------------------------------------------------- RLS
alter table management.research_stance enable row level security;
alter table management.research_note   enable row level security;
alter table management.research_watch  enable row level security;

-- stance — house view, management writes
drop policy if exists "research stance select" on management.research_stance;
drop policy if exists "research stance insert" on management.research_stance;
drop policy if exists "research stance update" on management.research_stance;
drop policy if exists "research stance delete" on management.research_stance;

create policy "research stance select" on management.research_stance
  for select to authenticated using (true);
create policy "research stance insert" on management.research_stance
  for insert to authenticated
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "research stance update" on management.research_stance
  for update to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'))
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "research stance delete" on management.research_stance
  for delete to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'));

-- notes — everyone contributes, everyone reads, you own what you wrote
drop policy if exists "research note select" on management.research_note;
drop policy if exists "research note insert" on management.research_note;
drop policy if exists "research note update" on management.research_note;
drop policy if exists "research note delete" on management.research_note;

create policy "research note select" on management.research_note
  for select to authenticated using (true);
create policy "research note insert" on management.research_note
  for insert to authenticated with check (auth.uid() = author_id);
create policy "research note update" on management.research_note
  for update to authenticated
  using (auth.uid() = author_id or (auth.jwt() ->> 'user_role') in ('admin','management'))
  with check (auth.uid() = author_id or (auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "research note delete" on management.research_note
  for delete to authenticated
  using (auth.uid() = author_id or (auth.jwt() ->> 'user_role') in ('admin','management'));

-- watchlist — house view, management writes
drop policy if exists "research watch select" on management.research_watch;
drop policy if exists "research watch insert" on management.research_watch;
drop policy if exists "research watch update" on management.research_watch;
drop policy if exists "research watch delete" on management.research_watch;

create policy "research watch select" on management.research_watch
  for select to authenticated using (true);
create policy "research watch insert" on management.research_watch
  for insert to authenticated
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "research watch update" on management.research_watch
  for update to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'))
  with check ((auth.jwt() ->> 'user_role') in ('admin','management'));
create policy "research watch delete" on management.research_watch
  for delete to authenticated
  using ((auth.jwt() ->> 'user_role') in ('admin','management'));

-- -------------------------------------------------------------------- grants
grant usage on schema management to authenticated;
grant select, insert, update, delete on management.research_stance to authenticated;
grant select, insert, update, delete on management.research_note   to authenticated;
grant select, insert, update, delete on management.research_watch  to authenticated;

-- LEGION (T9) reads the research hub server-side via service_role.
grant select, insert, update, delete on management.research_stance to service_role;
grant select, insert, update, delete on management.research_note   to service_role;
grant select, insert, update, delete on management.research_watch  to service_role;

-- ------------------------------------------------------------------ rollups
-- One cheap round-trip for the Research board: per-desk note + watch counts
-- and the desk-level stance, so the board does not fan out 13 requests.
-- security_invoker: the view must enforce the caller's RLS, not the owner's.
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
     where s.desk_id = i.desk_id and s.sub_id is not null)                            as subs_flagged
from ids i
left join management.research_stance st
  on st.desk_id = i.desk_id and st.sub_id is null;

comment on view management.research_desk_rollup is
  'RESEARCH (T13) per-desk rollup (stance + note/watch/flagged-sub counts) for the board.';

grant select on management.research_desk_rollup to authenticated, service_role;
