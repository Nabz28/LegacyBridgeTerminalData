-- =====================================================================
-- Legacy Bridge Terminal — consolidated migration
-- =====================================================================
-- Paste this entire file into Supabase SQL Editor and click "Run".
-- It is IDEMPOTENT (CREATE ... IF NOT EXISTS, OR REPLACE, DROP IF EXISTS).
--
-- Touches ONLY: macro.* and correlation.* schemas.
-- Never touches: public.*, auth.*, storage.*, graphql_public.*, or any
-- other existing schema.
--
-- After running this, go to:
--   Project Settings -> API -> Exposed schemas
-- and ADD `macro, correlation` to the comma-separated list.
-- =====================================================================


-- ========== 0001_macro_schema.sql ==========

-- Macro Terminal schema.
-- One schema per terminal so storage stays cleanly partitioned.
-- All upserts in the uploader use (ric) or (ric, date) PKs so re-runs are idempotent.

CREATE SCHEMA IF NOT EXISTS macro;

-- ---------------------------------------------------------------------------
-- Series catalog (one row per RIC across US / ID / CN, including polls).
-- Mirrors catalog/<cc>/<cc>_<category>.json entries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS macro.series (
    ric                   TEXT PRIMARY KEY,
    country               TEXT NOT NULL,                   -- 'us' | 'id' | 'cn'
    slug                  TEXT,
    category              TEXT,                            -- category display name
    category_slug         TEXT,                            -- e.g. 'us_consumer_prices_inflation'
    subcategory           TEXT,
    section               TEXT,
    description           TEXT,
    frequency             TEXT,                            -- ISO 8601 duration: P1D / P1W / P1M / P3M / P1Y
    units                 TEXT,
    source                TEXT,
    source_file           TEXT,

    -- Poll-specific fields (NULL for regular series)
    is_poll               BOOLEAN NOT NULL DEFAULT FALSE,
    indicator_topic       TEXT,                            -- agri | gdp | housing | ism | labor | trade
    indicator_group_id    TEXT,                            -- groups all stats for the same indicator
    indicator_anchor_ric  TEXT,                            -- the published-actual RIC
    stat_role             TEXT,                            -- actual | median | min | max | smart | range | latest | high | total | count

    -- Curated content
    meaning               TEXT,
    how_to_use            TEXT,
    related_series        JSONB,                           -- array of RIC strings
    notes                 TEXT,

    first_obs             DATE,
    last_obs              DATE,
    n_obs                 INTEGER,

    metadata              JSONB,                           -- free-form spillover
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macro_series_country         ON macro.series (country);
CREATE INDEX IF NOT EXISTS idx_macro_series_country_cat     ON macro.series (country, category_slug);
CREATE INDEX IF NOT EXISTS idx_macro_series_country_slug    ON macro.series (country, slug);
CREATE INDEX IF NOT EXISTS idx_macro_series_is_poll         ON macro.series (country, is_poll);
CREATE INDEX IF NOT EXISTS idx_macro_series_indicator_group ON macro.series (indicator_group_id) WHERE indicator_group_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Time series observations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS macro.observations (
    ric    TEXT             NOT NULL REFERENCES macro.series(ric) ON DELETE CASCADE,
    date   DATE             NOT NULL,
    value  DOUBLE PRECISION,
    PRIMARY KEY (ric, date)
);

CREATE INDEX IF NOT EXISTS idx_macro_obs_ric_date ON macro.observations (ric, date DESC);

-- ---------------------------------------------------------------------------
-- Causal influence graph (per country).
-- Stored as denormalized JSON because the graph is consumed wholesale
-- on the client. One row per (country, graph_kind).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS macro.graph (
    country     TEXT NOT NULL,                              -- 'us' | 'id' | 'cn'
    graph_kind  TEXT NOT NULL,                              -- 'full' | 'condensed' | 'insane'
    payload     JSONB NOT NULL,                             -- { clusters, nodes, edges, stats }
    generated_at TIMESTAMPTZ,
    PRIMARY KEY (country, graph_kind)
);

-- ---------------------------------------------------------------------------
-- Convenience views for the dashboard (read-only).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW macro.series_lite AS
SELECT ric, country, slug, category_slug, description, frequency, subcategory, is_poll
FROM macro.series;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- The dashboard reads anonymously, so allow SELECT for `anon` role
-- and full access for `service_role`. Writes go through the uploader
-- which uses the service role key.
ALTER TABLE macro.series       ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro.graph        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS macro_series_read       ON macro.series;
DROP POLICY IF EXISTS macro_observations_read ON macro.observations;
DROP POLICY IF EXISTS macro_graph_read        ON macro.graph;

CREATE POLICY macro_series_read       ON macro.series       FOR SELECT USING (true);
CREATE POLICY macro_observations_read ON macro.observations FOR SELECT USING (true);
CREATE POLICY macro_graph_read        ON macro.graph        FOR SELECT USING (true);

GRANT USAGE ON SCHEMA macro TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA macro TO anon, authenticated;
-- service_role gets full write access (used by the upload pipeline).
GRANT ALL    ON ALL TABLES    IN SCHEMA macro TO service_role;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA macro TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA macro GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA macro GRANT ALL ON SEQUENCES TO service_role;

-- ========== 0002_correlation_schema.sql ==========

-- Correlation Terminal schema.
-- Mirrors the SQLite shape from correlation/scripts/db.py exactly,
-- plus a small place to register precomputed correlation matrices
-- that live in Supabase Storage (the matrix files are too large to
-- store in Postgres rows comfortably).

CREATE SCHEMA IF NOT EXISTS correlation;

-- ---------------------------------------------------------------------------
-- Series universe (one row per tradable / observable).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correlation.series (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    yf_symbol    TEXT,
    source       TEXT,
    category     TEXT,
    subcategory  TEXT,
    return_type  TEXT,
    data_start   INTEGER,
    metadata     JSONB,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corr_series_cat ON correlation.series (category, subcategory);

-- ---------------------------------------------------------------------------
-- Prices and returns, weekly + monthly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correlation.prices_weekly (
    series_id TEXT NOT NULL REFERENCES correlation.series(id) ON DELETE CASCADE,
    date      DATE NOT NULL,
    close     DOUBLE PRECISION,
    PRIMARY KEY (series_id, date)
);
CREATE INDEX IF NOT EXISTS idx_corr_pw_date ON correlation.prices_weekly (date);

CREATE TABLE IF NOT EXISTS correlation.prices_monthly (
    series_id TEXT NOT NULL REFERENCES correlation.series(id) ON DELETE CASCADE,
    date      DATE NOT NULL,
    close     DOUBLE PRECISION,
    PRIMARY KEY (series_id, date)
);
CREATE INDEX IF NOT EXISTS idx_corr_pm_date ON correlation.prices_monthly (date);

CREATE TABLE IF NOT EXISTS correlation.returns_weekly (
    series_id TEXT NOT NULL REFERENCES correlation.series(id) ON DELETE CASCADE,
    date      DATE NOT NULL,
    ret       DOUBLE PRECISION,
    PRIMARY KEY (series_id, date)
);
CREATE INDEX IF NOT EXISTS idx_corr_rw_date ON correlation.returns_weekly (date);

CREATE TABLE IF NOT EXISTS correlation.returns_monthly (
    series_id TEXT NOT NULL REFERENCES correlation.series(id) ON DELETE CASCADE,
    date      DATE NOT NULL,
    ret       DOUBLE PRECISION,
    PRIMARY KEY (series_id, date)
);
CREATE INDEX IF NOT EXISTS idx_corr_rm_date ON correlation.returns_monthly (date);

-- ---------------------------------------------------------------------------
-- Precomputed correlation matrices.
-- These are large (parquet files, several GB total) and live in Supabase
-- Storage; this table is just an index pointing to the storage objects.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correlation.matrices (
    matrix_key   TEXT PRIMARY KEY,                          -- e.g. 'pearson_full_weekly'
    kind         TEXT NOT NULL,                             -- 'pearson' | 'spearman' | 'rolling_pearson'
    frequency    TEXT NOT NULL,                             -- 'weekly' | 'monthly'
    window_size  INTEGER,                                   -- NULL for full-period matrices
    storage_path TEXT NOT NULL,                             -- bucket-relative path
    storage_bucket TEXT NOT NULL DEFAULT 'correlation-matrices',
    n_series     INTEGER,
    n_periods    INTEGER,
    generated_at TIMESTAMPTZ,
    metadata     JSONB
);

-- ---------------------------------------------------------------------------
-- Row Level Security (read-only for anon, same as macro schema).
-- ---------------------------------------------------------------------------
ALTER TABLE correlation.series           ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation.prices_weekly    ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation.prices_monthly   ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation.returns_weekly   ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation.returns_monthly  ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation.matrices         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS corr_series_read         ON correlation.series;
DROP POLICY IF EXISTS corr_prices_weekly_read  ON correlation.prices_weekly;
DROP POLICY IF EXISTS corr_prices_monthly_read ON correlation.prices_monthly;
DROP POLICY IF EXISTS corr_returns_weekly_read ON correlation.returns_weekly;
DROP POLICY IF EXISTS corr_returns_monthly_read ON correlation.returns_monthly;
DROP POLICY IF EXISTS corr_matrices_read       ON correlation.matrices;

CREATE POLICY corr_series_read          ON correlation.series           FOR SELECT USING (true);
CREATE POLICY corr_prices_weekly_read   ON correlation.prices_weekly    FOR SELECT USING (true);
CREATE POLICY corr_prices_monthly_read  ON correlation.prices_monthly   FOR SELECT USING (true);
CREATE POLICY corr_returns_weekly_read  ON correlation.returns_weekly   FOR SELECT USING (true);
CREATE POLICY corr_returns_monthly_read ON correlation.returns_monthly  FOR SELECT USING (true);
CREATE POLICY corr_matrices_read        ON correlation.matrices         FOR SELECT USING (true);

GRANT USAGE ON SCHEMA correlation TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA correlation TO anon, authenticated;
-- service_role gets full write access (used by the upload pipeline).
GRANT ALL    ON ALL TABLES    IN SCHEMA correlation TO service_role;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA correlation TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA correlation GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA correlation GRANT ALL ON SEQUENCES TO service_role;

-- ========== 0003_correlation_functions.sql ==========

-- Rolling correlation as a Postgres function.
-- Replaces the precomputed rolling_pearson_*.parquet files (~10 GB on disk)
-- with an on-demand computation that returns the rolling Pearson correlation
-- for a single pair over time.
--
-- Implementation note: avoids dynamic SQL (EXECUTE format) — Postgres
-- window-frame offsets parse strictly inside dynamic SQL and the format-string
-- dance made the error path opaque. We branch on frequency with direct SQL
-- instead, which the planner can validate properly.

-- DROP first because the OUT parameter names changed (Postgres won't let
-- CREATE OR REPLACE change them). Safe to re-run.
DROP FUNCTION IF EXISTS correlation.rolling_corr(TEXT, TEXT, TEXT, INTEGER, DATE, DATE);
DROP FUNCTION IF EXISTS correlation.pair_stats(TEXT, TEXT, TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION correlation.rolling_corr(
    series_a    TEXT,
    series_b    TEXT,
    frequency   TEXT,                     -- 'weekly' | 'monthly'
    window_size INTEGER DEFAULT 52,
    from_date   DATE DEFAULT NULL,
    to_date     DATE DEFAULT NULL
) RETURNS TABLE (
    obs_date  DATE,
    corr_val  DOUBLE PRECISION,
    n_obs     INTEGER
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    IF window_size < 3 THEN
        RAISE EXCEPTION 'window_size must be >= 3, got %', window_size;
    END IF;

    IF frequency = 'weekly' THEN
        RETURN QUERY
        WITH joined AS (
            SELECT a.date AS d, a.ret AS ret_a, b.ret AS ret_b
            FROM correlation.returns_weekly a
            JOIN correlation.returns_weekly b USING (date)
            WHERE a.series_id = series_a
              AND b.series_id = series_b
              AND (from_date IS NULL OR a.date >= from_date)
              AND (to_date   IS NULL OR a.date <= to_date)
            ORDER BY a.date
        ),
        windowed AS (
            SELECT d,
                   corr(ret_a, ret_b) OVER w AS c,
                   count(*) OVER w           AS n
            FROM joined
            WINDOW w AS (ORDER BY d ROWS BETWEEN window_size - 1 PRECEDING AND CURRENT ROW)
        )
        SELECT d, c, n::INTEGER FROM windowed ORDER BY d;
    ELSIF frequency = 'monthly' THEN
        RETURN QUERY
        WITH joined AS (
            SELECT a.date AS d, a.ret AS ret_a, b.ret AS ret_b
            FROM correlation.returns_monthly a
            JOIN correlation.returns_monthly b USING (date)
            WHERE a.series_id = series_a
              AND b.series_id = series_b
              AND (from_date IS NULL OR a.date >= from_date)
              AND (to_date   IS NULL OR a.date <= to_date)
            ORDER BY a.date
        ),
        windowed AS (
            SELECT d,
                   corr(ret_a, ret_b) OVER w AS c,
                   count(*) OVER w           AS n
            FROM joined
            WINDOW w AS (ORDER BY d ROWS BETWEEN window_size - 1 PRECEDING AND CURRENT ROW)
        )
        SELECT d, c, n::INTEGER FROM windowed ORDER BY d;
    ELSE
        RAISE EXCEPTION 'frequency must be weekly or monthly, got %', frequency;
    END IF;
END
$$;

GRANT EXECUTE ON FUNCTION correlation.rolling_corr(TEXT, TEXT, TEXT, INTEGER, DATE, DATE) TO anon, authenticated, service_role;

COMMENT ON FUNCTION correlation.rolling_corr IS
$$Compute rolling Pearson correlation between two series, returned as
(obs_date, corr_val, n_obs). Window size is in rows of the chosen frequency
(52 weeks ~= 1 year, 156 weeks ~= 3 years, 36 months = 3 years).
Replaces the obsolete rolling_pearson_*.parquet files.$$;

-- Pair-statistics convenience: full-sample correlation + observation count
-- for a pair over an optional date range. Used by the pair drilldown panel.
CREATE OR REPLACE FUNCTION correlation.pair_stats(
    series_a   TEXT,
    series_b   TEXT,
    frequency  TEXT DEFAULT 'weekly',
    from_date  DATE DEFAULT NULL,
    to_date    DATE DEFAULT NULL
) RETURNS TABLE (
    pearson    DOUBLE PRECISION,
    n_obs      INTEGER,
    first_obs  DATE,
    last_obs   DATE
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    IF frequency = 'weekly' THEN
        RETURN QUERY
        WITH joined AS (
            SELECT a.date AS d, a.ret AS ret_a, b.ret AS ret_b
            FROM correlation.returns_weekly a
            JOIN correlation.returns_weekly b USING (date)
            WHERE a.series_id = series_a
              AND b.series_id = series_b
              AND (from_date IS NULL OR a.date >= from_date)
              AND (to_date   IS NULL OR a.date <= to_date)
        )
        SELECT corr(ret_a, ret_b),
               count(*)::INTEGER,
               min(d),
               max(d)
        FROM joined;
    ELSIF frequency = 'monthly' THEN
        RETURN QUERY
        WITH joined AS (
            SELECT a.date AS d, a.ret AS ret_a, b.ret AS ret_b
            FROM correlation.returns_monthly a
            JOIN correlation.returns_monthly b USING (date)
            WHERE a.series_id = series_a
              AND b.series_id = series_b
              AND (from_date IS NULL OR a.date >= from_date)
              AND (to_date   IS NULL OR a.date <= to_date)
        )
        SELECT corr(ret_a, ret_b),
               count(*)::INTEGER,
               min(d),
               max(d)
        FROM joined;
    ELSE
        RAISE EXCEPTION 'frequency must be weekly or monthly, got %', frequency;
    END IF;
END
$$;

GRANT EXECUTE ON FUNCTION correlation.pair_stats(TEXT, TEXT, TEXT, DATE, DATE) TO anon, authenticated, service_role;

-- ========== 0004_service_role_grants.sql ==========

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
