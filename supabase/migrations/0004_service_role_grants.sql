-- Adds service_role write access to our schemas.
-- The first migration only granted SELECT to anon/authenticated; the new
-- sb_secret_* API key routes through PostgREST as `service_role`, which
-- needs explicit write permission.
--
-- Idempotent — safe to re-run. Touches only macro.* and correlation.*.

GRANT USAGE ON SCHEMA macro       TO service_role;
GRANT USAGE ON SCHEMA correlation TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA macro       TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA macro       TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA correlation TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA correlation TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA macro       GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA macro       GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA correlation GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA correlation GRANT ALL ON SEQUENCES TO service_role;

GRANT EXECUTE ON FUNCTION correlation.rolling_corr(TEXT, TEXT, TEXT, INTEGER, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION correlation.pair_stats(TEXT, TEXT, TEXT, DATE, DATE) TO service_role;
