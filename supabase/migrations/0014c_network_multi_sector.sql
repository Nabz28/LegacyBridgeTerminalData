-- 0014c -- Multi-sector / multi-category on lns_connections.
--
-- The Network Terminal originally let a connection live under exactly one
-- sector (and the sector's parent category). Real connections often span
-- multiple sub-industries (e.g. an ex-banker who now runs a fintech), so
-- both fields become arrays. The legacy `sector_id` column stays for back-
-- compat with any old reader and acts as "primary" = sector_ids[0].
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, conditional backfill, GIN index
-- with IF NOT EXISTS.

ALTER TABLE public.lns_connections
    ADD COLUMN IF NOT EXISTS sector_ids   text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.lns_connections
    ADD COLUMN IF NOT EXISTS category_ids text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill sector_ids from the legacy single-value column. Only rows where
-- the new array is empty get rewritten, so re-running is a no-op.
UPDATE public.lns_connections
   SET sector_ids = ARRAY[sector_id]
 WHERE sector_id IS NOT NULL
   AND (sector_ids IS NULL OR cardinality(sector_ids) = 0);

-- Backfill category_ids by joining sector_ids -> lns_sectors.category_id.
-- Distinct in case multiple sectors share a category.
UPDATE public.lns_connections c
   SET category_ids = sub.cats
  FROM (
    SELECT c2.id,
           ARRAY(SELECT DISTINCT s.category_id
                   FROM public.lns_sectors s
                  WHERE s.id = ANY (c2.sector_ids)
                    AND s.category_id IS NOT NULL) AS cats
      FROM public.lns_connections c2
     WHERE cardinality(c2.sector_ids) > 0
  ) sub
 WHERE c.id = sub.id
   AND (c.category_ids IS NULL OR cardinality(c.category_ids) = 0);

-- GIN indexes for "match any" filter queries on the arrays.
CREATE INDEX IF NOT EXISTS idx_lns_connections_sector_ids_gin
    ON public.lns_connections USING gin (sector_ids);
CREATE INDEX IF NOT EXISTS idx_lns_connections_category_ids_gin
    ON public.lns_connections USING gin (category_ids);

NOTIFY pgrst, 'reload schema';
