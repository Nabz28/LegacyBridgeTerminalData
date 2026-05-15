-- 0017 -- Meeting availability polls (When2Meet style) per project.
--
-- Two-table data model so the corpus stays small and easy to query:
--
--   meeting_polls       one row per poll (a "let's find a time" question).
--                       Carries the poll-level config: project, title,
--                       date range, slot length, state, creator.
--
--   meeting_responses   one row per (poll, user). The user's selected
--                       available + maybe slots are stored as JSONB
--                       arrays of ISO timestamps. One row per user keeps
--                       writes small (one upsert per save) and lets the
--                       frontend tell "who hasn't filled yet" with a
--                       single left-join.
--
-- Why JSONB arrays instead of a row per slot
--   - A typical poll spans a week at 60-min granularity = ~168 slots.
--     With 10 members that's 1680 rows per poll for normalized storage
--     vs 10 rows of ~3 kB each for JSONB. Reads + writes are simpler.
--   - All aggregation ("best slot for everyone") happens in the frontend
--     against a small fetched payload (poll + responses), which keeps
--     server logic stupid simple and avoids per-poll RPC functions.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS / IF NOT EXISTS indexes /
-- DROP POLICY IF EXISTS before CREATE POLICY / ON CONFLICT DO NOTHING
-- on the publication add.

-- ---------------------------------------------------------------------------
-- meeting_polls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.meeting_polls (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    -- Range over which respondents pick slots. Inclusive on both ends.
    date_from     DATE NOT NULL,
    date_to       DATE NOT NULL,
    -- Slot granularity in minutes (30 or 60 are the common picks).
    slot_minutes  INTEGER NOT NULL DEFAULT 60
                  CHECK (slot_minutes IN (15, 30, 60, 120)),
    -- Daily working-hours window. Stored as integer hours 0..24; the
    -- frontend uses these to draw the grid without re-deriving them.
    day_start_hour INTEGER NOT NULL DEFAULT 8
                   CHECK (day_start_hour BETWEEN 0 AND 23),
    day_end_hour   INTEGER NOT NULL DEFAULT 20
                   CHECK (day_end_hour BETWEEN 1 AND 24),
    -- IANA name for the poll's reference time zone. Stored as text so we
    -- never have to keep a curated table of zones in sync with the
    -- Postgres timezone catalog.
    time_zone     TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    state         TEXT NOT NULL DEFAULT 'open'
                  CHECK (state IN ('open','closed')),
    created_by    UUID REFERENCES management.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (date_from <= date_to),
    CHECK (day_start_hour < day_end_hour)
);

CREATE INDEX IF NOT EXISTS idx_meeting_polls_project
    ON management.meeting_polls (project_id, created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_meeting_polls_touch ON management.meeting_polls;
CREATE TRIGGER trg_meeting_polls_touch
    BEFORE UPDATE ON management.meeting_polls
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- ---------------------------------------------------------------------------
-- meeting_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.meeting_responses (
    poll_id           UUID NOT NULL REFERENCES management.meeting_polls(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    -- Each ISO timestamp is the START of a slot of `slot_minutes` length.
    available_slots   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- definite yes
    maybe_slots       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- conditional yes
    note              TEXT,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_responses_user
    ON management.meeting_responses (user_id, submitted_at DESC);

DROP TRIGGER IF EXISTS trg_meeting_responses_touch ON management.meeting_responses;
CREATE TRIGGER trg_meeting_responses_touch
    BEFORE UPDATE ON management.meeting_responses
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
ALTER TABLE management.meeting_polls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.meeting_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mgmt_meeting_polls_read     ON management.meeting_polls;
DROP POLICY IF EXISTS mgmt_meeting_responses_read ON management.meeting_responses;

CREATE POLICY mgmt_meeting_polls_read     ON management.meeting_polls     FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_meeting_responses_read ON management.meeting_responses FOR SELECT TO authenticated USING (true);

GRANT SELECT ON management.meeting_polls     TO authenticated;
GRANT SELECT ON management.meeting_responses TO authenticated;
GRANT ALL    ON management.meeting_polls     TO service_role;
GRANT ALL    ON management.meeting_responses TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['meeting_polls','meeting_responses'])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE management.%I', t);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
