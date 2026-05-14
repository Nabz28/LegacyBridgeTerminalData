-- Phase 4: project members + schedule events + customizable due dates.
--
-- Replaces the per-user ACL with a simpler two-tier model:
--   t1 - edit deliverables in your own division (plus IM, which is CROSS)
--   t2 - edit any deliverable on this project
-- Comments + reads stay open org-wide for authenticated users.
--
-- Adds project_events for arbitrary calendar items (Zoom calls, onboarding
-- sessions, milestones) so analysts have somewhere to record cadence beyond
-- the fixed 7+ deliverables.

-- ---------------------------------------------------------------------------
-- project_members: who is on the project and what they can edit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.project_members (
    project_id  TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    permission  TEXT NOT NULL DEFAULT 't1'
                CHECK (permission IN ('t1','t2')),
    added_by    UUID REFERENCES management.users(id) ON DELETE SET NULL,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON management.project_members (user_id);

ALTER TABLE management.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mgmt_project_members_read ON management.project_members;
CREATE POLICY mgmt_project_members_read ON management.project_members
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON management.project_members TO authenticated;
GRANT ALL    ON management.project_members TO service_role;

-- ---------------------------------------------------------------------------
-- project_events: calendar items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.project_events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    start_at         TIMESTAMPTZ NOT NULL,
    end_at           TIMESTAMPTZ,
    kind             TEXT NOT NULL DEFAULT 'meeting'
                     CHECK (kind IN ('meeting','milestone','deadline','onboarding','other')),
    location_or_link TEXT,
    description      TEXT,
    created_by       UUID REFERENCES management.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project ON management.project_events (project_id, start_at);

CREATE TABLE IF NOT EXISTS management.project_event_attendees (
    event_id UUID NOT NULL REFERENCES management.project_events(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
);

ALTER TABLE management.project_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.project_event_attendees  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mgmt_events_read    ON management.project_events;
DROP POLICY IF EXISTS mgmt_attendees_read ON management.project_event_attendees;
CREATE POLICY mgmt_events_read    ON management.project_events          FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_attendees_read ON management.project_event_attendees FOR SELECT TO authenticated USING (true);

GRANT SELECT ON management.project_events          TO authenticated;
GRANT SELECT ON management.project_event_attendees TO authenticated;
GRANT ALL    ON management.project_events          TO service_role;
GRANT ALL    ON management.project_event_attendees TO service_role;

-- Trigger to keep events.updated_at fresh
DROP TRIGGER IF EXISTS trg_events_touch ON management.project_events;
CREATE TRIGGER trg_events_touch
    BEFORE UPDATE ON management.project_events
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Lock down project creation to management/admin only.
-- (Analyst can_create_research_project flags become inactive in practice;
-- the create-project Edge Function checks the role too.)
-- ---------------------------------------------------------------------------
UPDATE management.users
   SET can_create_research_project = FALSE
 WHERE role = 'analyst';

-- ---------------------------------------------------------------------------
-- Seed: backfill project_members for existing projects from their team roster.
-- Default permission = 't1'. Management can promote individuals to 't2' via
-- the new Members modal. Idempotent because of ON CONFLICT.
-- ---------------------------------------------------------------------------
INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
SELECT
    p.id        AS project_id,
    tm.user_id  AS user_id,
    't1'        AS permission,
    p.given_by  AS added_by,
    p.created_at AS added_at
FROM management.projects p
JOIN management.team_members tm ON tm.team_id = p.team_id
ON CONFLICT (project_id, user_id) DO NOTHING;

-- SPD assignments per-project. SPD = management authority -> seed as t2.
-- Faiq->Project 1, Grace->Project 2, Nadine->Project 3 (matches the current
-- staffing model). Only applies to projects ending in -001/-002/-003.
INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
SELECT p.id, u.id, 't2', p.given_by, p.created_at
FROM management.projects p
JOIN management.users u ON u.username = (
    CASE
        WHEN p.id LIKE '%-001' THEN 'faiq'
        WHEN p.id LIKE '%-002' THEN 'grace'
        WHEN p.id LIKE '%-003' THEN 'nadine'
    END
)
WHERE p.id LIKE '%-001' OR p.id LIKE '%-002' OR p.id LIKE '%-003'
ON CONFLICT (project_id, user_id) DO NOTHING;
