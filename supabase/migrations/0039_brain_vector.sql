-- ============================================================
-- 0039 — brain semantic search (pgvector hybrid)
-- Adds embeddings + an HNSW index and upgrades brain.search_notes to a
-- HYBRID retriever: lexical (FTS + OR-expansion + trigram + title boost +
-- type prior) FUSED with vector cosine via Reciprocal Rank Fusion (k=60).
-- Embeddings: openai/text-embedding-3-small (1536d) via OpenRouter, computed
-- in the proxy on write + per query and passed in as q_embedding (text -> vector).
-- Backward-compatible: q_embedding NULL => pure lexical (no behaviour change).
-- Additive + idempotent.
-- ============================================================

create extension if not exists vector with schema extensions;

alter table brain.notes add column if not exists embedding extensions.vector(1536);
-- HNSW for fast cosine ANN; small table now, scales to 100k+.
create index if not exists notes_embedding_idx on brain.notes
  using hnsw (embedding extensions.vector_cosine_ops);

-- new signature (adds q_embedding) — drop the old 4-arg version first.
drop function if exists brain.search_notes(text, text, boolean, int);

create or replace function brain.search_notes(
    q text,
    q_embedding text default null,
    want_type text default null,
    include_archived boolean default false,
    lim int default 12)
  returns table (id uuid, title text, type text, folder text, status text,
                 updated_at timestamptz, snippet text, score real)
  language sql stable set search_path = brain, public, extensions
as $$
  with qq as (
    select websearch_to_tsquery('english', coalesce(q,'')) as andq,
           nullif(replace(websearch_to_tsquery('english', coalesce(q,''))::text, '&', '|'), '')::tsquery as orq,
           case when q_embedding is null or q_embedding = '' then null else q_embedding::vector end as qe
  ),
  base as (
    select n.* from brain.notes n
    where (include_archived or n.status = 'filed')
      and (want_type is not null or n.type <> 'status_snapshot')
      and (want_type is null or n.type = want_type)
  ),
  lex as (
    select b.id,
      ( (case when b.title ilike '%' || coalesce(q,'') || '%' then 10.0 else 0 end)
      + coalesce(ts_rank(to_tsvector('english', coalesce(b.title,'')), (select andq from qq)), 0) * 8.0
      + coalesce(ts_rank(to_tsvector('english', coalesce(b.title,'')), (select orq  from qq)), 0) * 3.0
      + coalesce(word_similarity(coalesce(q,''), coalesce(b.title,'')), 0) * 6.0
      + coalesce(ts_rank(to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.body,'')), (select andq from qq)), 0) * 2.0
      + coalesce(ts_rank(to_tsvector('english', coalesce(b.body,'')), (select orq from qq)), 0) * 0.5
      + (case when b.type = 'todo' then -2.5 when b.type in ('note','initiative','person','goal','kpi') then 1.0 else 0 end)
      ) as lexscore
    from base b
    where ( ((select andq from qq) is not null and to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.body,'')) @@ (select andq from qq))
         or ((select orq  from qq) is not null and to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.body,'')) @@ (select orq from qq))
         or word_similarity(coalesce(q,''), coalesce(b.title,'')||' '||coalesce(b.body,'')) > 0.22
         or b.title ilike '%' || coalesce(q,'') || '%' )
    order by lexscore desc
    limit 30
  ),
  lex_r as (select id, row_number() over (order by lexscore desc) as rnk from lex),
  vec_r as (
    select b.id, row_number() over (order by b.embedding <=> (select qe from qq)) as rnk
    from base b
    where (select qe from qq) is not null and b.embedding is not null
    order by b.embedding <=> (select qe from qq)
    limit 30
  ),
  fused as (
    select id, sum(1.0 / (60 + rnk)) as rrf
    from (select id, rnk from lex_r union all select id, rnk from vec_r) u
    group by id
  )
  select n.id, n.title, n.type, n.folder, n.status, n.updated_at,
         ts_headline('english', left(coalesce(n.body, n.title), 4000), (select andq from qq),
                     'MaxFragments=2,MinWords=6,MaxWords=24,ShortWord=2,FragmentDelimiter= … ') as snippet,
         f.rrf::real as score
  from fused f join brain.notes n on n.id = f.id
  order by f.rrf desc, n.updated_at desc
  limit least(coalesce(lim,12), 30);
$$;
grant execute on function brain.search_notes(text, text, text, boolean, int) to service_role, authenticated;
