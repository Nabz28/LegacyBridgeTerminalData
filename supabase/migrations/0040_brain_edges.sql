-- ============================================================
-- 0040 — brain graph: id-based edge table (backlink integrity + rename-safety)
-- Today notes.links is a text[] of TITLES: a rename breaks every inbound edge
-- and backlinks are unqueryable (IA panel finding). This adds an id-based edge
-- table as the integrity layer while KEEPING notes.links[] as the launcher-facing
-- mirror (the graph view reads it) — kept in sync by triggers, both directions:
--   links[] (titles)  --[sync_edges_from_links]-->  note_links (ids)
--   title rename       --[rebuild_links_for_targets]--> refresh pointing notes' links[]
-- Additive + idempotent. No data loss.
-- ============================================================

create table if not exists brain.note_links (
  src_id uuid not null references brain.notes(id) on delete cascade,
  dst_id uuid not null references brain.notes(id) on delete cascade,
  rel    text not null default 'links',
  primary key (src_id, dst_id, rel)
);
create index if not exists note_links_dst_idx on brain.note_links(dst_id);

-- links[] (titles) -> edges (ids). Fires whenever a note's links change, regardless
-- of writer (brain_write, browser wiki, reorg). Resolves each title to the active note.
create or replace function brain.sync_edges_from_links() returns trigger
  language plpgsql set search_path = brain, public as $fn$
begin
  delete from brain.note_links where src_id = new.id and rel = 'links';
  if new.links is not null and array_length(new.links, 1) > 0 then
    insert into brain.note_links (src_id, dst_id, rel)
      select new.id, d.id, 'links'
      from unnest(new.links) as lt
      join lateral (
        select id from brain.notes
        where title = lt and status <> 'archived'
        order by (status = 'filed') desc limit 1
      ) d on true
      where d.id <> new.id
    on conflict do nothing;
  end if;
  return new;
end $fn$;
drop trigger if exists notes_links_sync on brain.notes;
create trigger notes_links_sync after insert or update of links on brain.notes
  for each row execute function brain.sync_edges_from_links();

-- rename-safety: when a note's TITLE changes, refresh the links[] mirror of every
-- note that points at it (edges are id-based, so they survive; the title mirror is
-- what would otherwise go stale). Guarded to avoid no-op churn / recursion.
create or replace function brain.rebuild_links_for_targets() returns trigger
  language plpgsql set search_path = brain, public as $fn$
begin
  if new.title is distinct from old.title then
    update brain.notes s set links = sub.arr
    from (
      select e.src_id, coalesce(array_agg(distinct d.title), '{}') as arr
      from brain.note_links e
      join brain.notes d on d.id = e.dst_id
      where e.src_id in (select src_id from brain.note_links where dst_id = new.id)
      group by e.src_id
    ) sub
    where s.id = sub.src_id and s.links is distinct from sub.arr;
  end if;
  return new;
end $fn$;
drop trigger if exists notes_rename_sync on brain.notes;
create trigger notes_rename_sync after update of title on brain.notes
  for each row execute function brain.rebuild_links_for_targets();

-- backlinks: notes that link TO a given note (id-stable). + a title convenience.
create or replace function brain.backlinks(p_id uuid)
  returns table (id uuid, title text, type text, folder text)
  language sql stable set search_path = brain, public as $fn$
  select n.id, n.title, n.type, n.folder
  from brain.note_links e join brain.notes n on n.id = e.src_id
  where e.dst_id = p_id and n.status <> 'archived'
  order by n.title;
$fn$;
create or replace function brain.backlinks_by_title(p_title text)
  returns table (id uuid, title text, type text, folder text)
  language sql stable set search_path = brain, public as $fn$
  select b.* from brain.backlinks(
    (select id from brain.notes where title = p_title and status <> 'archived' order by (status='filed') desc limit 1)
  ) b;
$fn$;
grant execute on function brain.backlinks(uuid) to service_role, authenticated;
grant execute on function brain.backlinks_by_title(text) to service_role, authenticated;

-- backfill: fire the sync trigger for every note that has links (set links = links
-- counts as an update OF links). Populates note_links from the current mirror.
update brain.notes set links = links where array_length(links, 1) > 0;
