-- ===========================================================================
-- 0062_series_coverage.sql
-- Backfill observation-coverage on macro.series and expose empty series.
--
-- Context: macro.series has first_obs / last_obs / n_obs columns but they were
-- never populated (all NULL), so there was no way to tell which catalog RICs
-- actually have data. The QA report hit this via "Markit Comp Final PMI shows
-- nothing" (RIC aUSPMIPAQ, 0 observations). This migration computes coverage for
-- every RIC in one aggregate pass and adds a view that lists the empty ones, so
-- ingest gaps are visible instead of surfacing one dead tile at a time.
--
-- Safe + idempotent: it only writes derived counts onto series and (re)creates a
-- view. Re-run any time to refresh coverage after an ingest.
-- ===========================================================================
-- RENUMBERED 0058 -> 0062 (2026-07-29). Authored on a branch that was
-- never merged; meanwhile 0058 was taken on main by a MONITOR migration.
-- Content is unchanged from the original.

BEGIN;

-- Coverage from observations in a single GROUP BY (cheap vs per-RIC counts).
UPDATE macro.series s
   SET n_obs     = agg.n,
       first_obs = agg.f,
       last_obs  = agg.l
  FROM (
    SELECT ric, count(*) AS n, min(date) AS f, max(date) AS l
      FROM macro.observations
     GROUP BY ric
  ) agg
 WHERE agg.ric = s.ric;

-- Series with no matching observations get an explicit 0 (was NULL).
UPDATE macro.series SET n_obs = 0 WHERE n_obs IS NULL;

-- Empty-series audit: catalog RICs the Data Gatherer would render as "no data".
-- Drive ingest-or-hide decisions from this instead of discovering gaps by click.
CREATE OR REPLACE VIEW macro.series_empty AS
  SELECT ric, country, category, subcategory, description, frequency
    FROM macro.series
   WHERE coalesce(n_obs, 0) = 0
   ORDER BY country, category, ric;

GRANT SELECT ON macro.series_empty TO authenticated, anon;

COMMIT;

-- After deploy, the empty-series list is one query:
--   select count(*) from macro.series_empty;               -- how many gaps
--   select * from macro.series_empty where country = 'us'; -- triage list
