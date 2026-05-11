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
