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
