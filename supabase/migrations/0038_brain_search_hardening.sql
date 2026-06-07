-- ============================================================
-- 0038 — brain search + integrity hardening
-- Driven by a 4-panel expert review + an empirical recall benchmark
-- (ilike 0% recall@8 / seq-scan 3.2ms  vs  FTS+trigram hybrid 79% / index 0.19ms).
-- Additive + idempotent. Safe to re-run. No data drops.
--
-- NOTE: reuses the EXISTING expression FTS GIN index from 0034
--   notes_fts_idx = gin(to_tsvector('english', coalesce(title,'')||' '||coalesce(body,'')))
-- so the RPC's @@/ts_rank match it and stay index-backed. (We avoid a
-- generated tsvector column: to_tsvector generation expressions trip
-- Postgres's immutability check.)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ranked HYBRID search RPC — FTS (precision) + OR-expansion
--    (recall on natural-language questions) + trigram (typo/fuzzy)
--    + title-substring, with a title-match boost and a ts_headline
--    snippet so the model answers broad questions in ONE round
--    instead of fanning out into N brain_get calls.
--    status_snapshot excluded from generic search unless asked.
-- ------------------------------------------------------------
create or replace function brain.search_notes(
    q text,
    want_type text default null,
    include_archived boolean default false,
    lim int default 12)
  returns table (
    id uuid, title text, type text, folder text, status text,
    updated_at timestamptz, snippet text, score real)
  language sql stable
  set search_path = brain, public, extensions
as $$
  with qq as (
    select websearch_to_tsquery('english', coalesce(q,'')) as andq,
           nullif(replace(websearch_to_tsquery('english', coalesce(q,''))::text, '&', '|'), '')::tsquery as orq
  )
  select n.id, n.title, n.type, n.folder, n.status, n.updated_at,
         ts_headline('english', left(coalesce(n.body, n.title), 4000),
                     (select andq from qq),
                     'MaxFragments=2,MinWords=6,MaxWords=24,ShortWord=2,FragmentDelimiter= … ') as snippet,
         ( (case when n.title ilike '%' || coalesce(q,'') || '%' then 10.0 else 0 end)
         + coalesce(ts_rank(to_tsvector('english', coalesce(n.title,'')), (select andq from qq)), 0) * 8.0
         + coalesce(ts_rank(to_tsvector('english', coalesce(n.title,'')), (select orq  from qq)), 0) * 3.0
         + coalesce(word_similarity(coalesce(q,''), coalesce(n.title,'')), 0) * 6.0
         + coalesce(ts_rank(to_tsvector('english', coalesce(n.title,'')||' '||coalesce(n.body,'')), (select andq from qq)), 0) * 2.0
         + coalesce(ts_rank(to_tsvector('english', coalesce(n.body,'')), (select orq from qq)), 0) * 0.5
         + (case when n.type = 'todo' then -2.5
                 when n.type in ('note','initiative','person','goal','kpi') then 1.0 else 0 end)   -- knowledge over tasks
         )::real as score
  from brain.notes n, qq
  where (include_archived or n.status = 'filed')
    and (want_type is not null or n.type <> 'status_snapshot')
    and (want_type is null or n.type = want_type)
    and (
         (qq.andq is not null and to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.body,'')) @@ qq.andq)
      or (qq.orq  is not null and to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.body,'')) @@ qq.orq)
      or word_similarity(coalesce(q,''), coalesce(n.title,'') || ' ' || coalesce(n.body,'')) > 0.22
      or n.title ilike '%' || coalesce(q,'') || '%'
    )
  order by score desc, n.updated_at desc
  limit least(coalesce(lim,12), 30);
$$;
grant execute on function brain.search_notes(text, text, boolean, int) to service_role, authenticated;

-- ------------------------------------------------------------
-- 2) Atomic daily-usage increment (replaces the read-modify-write
--    TOCTOU in the proxy that let parallel turns under-count vs cap).
-- ------------------------------------------------------------
create or replace function brain.bump_ai_usage(p_user uuid, p_day date, p_tokens int, p_reqs int)
  returns void language sql
  set search_path = brain, public
as $$
  insert into brain.ai_usage (user_id, day, tokens, requests)
  values (p_user, p_day, coalesce(p_tokens,0), coalesce(p_reqs,1))
  on conflict (user_id, day) do update
    set tokens   = brain.ai_usage.tokens   + excluded.tokens,
        requests = brain.ai_usage.requests + excluded.requests;
$$;
grant execute on function brain.bump_ai_usage(uuid, date, int, int) to service_role;

-- ------------------------------------------------------------
-- 3) Taxonomy integrity: 'inbox' is a STATUS, not a TYPE.
--    Backfill the legacy type, then constrain both domains (idempotent).
-- ------------------------------------------------------------
update brain.notes set type = 'note' where type = 'inbox';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notes_status_chk') then
    alter table brain.notes add constraint notes_status_chk
      check (status in ('inbox','filed','archived')) not valid;
    alter table brain.notes validate constraint notes_status_chk;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notes_type_chk') then
    alter table brain.notes add constraint notes_type_chk
      check (type in ('note','goal','kpi','milestone','initiative','risk','todo','person','meeting','status_snapshot','hq_widget','system')) not valid;
    alter table brain.notes validate constraint notes_type_chk;
  end if;
end $$;

alter table brain.notes alter column folder set default 'home';

-- ------------------------------------------------------------
-- 4) Title integrity: prevent the upsert race that forks notes.
--    Active (non-archived) titles unique, case-insensitive.
-- ------------------------------------------------------------
create unique index if not exists notes_active_title_uq
  on brain.notes (lower(title)) where status <> 'archived';

-- ------------------------------------------------------------
-- 5) Index hygiene: drop redundant status-only index (covered by
--    (folder,status)); add a partial hot-path recency index.
-- ------------------------------------------------------------
drop index if exists brain.notes_status_idx;
create index if not exists notes_active_updated_idx
  on brain.notes(updated_at desc) where status = 'filed';

-- ------------------------------------------------------------
-- 6) Audit hardening: the application audit log (0053) must not be
--    writable by the authenticated (user-JWT) role — proxy/service only.
-- ------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='brain' and table_name='ai_audit') then
    execute 'revoke insert, update, delete on brain.ai_audit from authenticated';
  end if;
end $$;
