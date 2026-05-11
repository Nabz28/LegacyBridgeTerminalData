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
