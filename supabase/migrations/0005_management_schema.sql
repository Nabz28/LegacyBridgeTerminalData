-- Management Terminal schema.
-- Tracks LBC research project lifecycle: projects -> deliverables -> comments
-- + KPI views. Strictly auth-gated (no anon access). Writes go through Edge
-- Functions running as service_role; RLS gates reads for authenticated users.
--
-- Custom auth (no Supabase Auth, no emails). Login Edge Function validates
-- username + password against management.users and issues a Supabase-signed
-- JWT with `sub` = user.id and `role` = 'authenticated', so PostgREST honors
-- our RLS policies the same way it does for Supabase-Auth users.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS management;

-- ---------------------------------------------------------------------------
-- Users (custom auth -- no email field by design).
-- Passwords are bcrypt-hashed via pgcrypto's crypt() + gen_salt('bf', 10).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username            TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    full_name           TEXT NOT NULL,
    role                TEXT NOT NULL
                        CHECK (role IN ('admin','management','analyst','advisor')),
    division            TEXT
                        CHECK (division IN ('ERD','MRD','IRD','AMD','SPD','MND','Exec','Quant','Advisor')),
    title               TEXT,
    -- Gates the 15-day research-pipeline project type. Anyone can still
    -- create a 'general' project (free-form deliverables, Google-Sheets-
    -- style ACL); this flag only restricts the structured research kind.
    can_create_research_project BOOLEAN NOT NULL DEFAULT FALSE,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_division ON management.users (division);
CREATE INDEX IF NOT EXISTS idx_users_role     ON management.users (role);

-- Public-safe projection of users that omits password_hash.
-- This is what PostgREST exposes to authenticated readers.
CREATE OR REPLACE VIEW management.users_lite AS
SELECT id, username, full_name, role, division, title,
       can_create_research_project, active, created_at, last_login_at
FROM management.users;

-- ---------------------------------------------------------------------------
-- Teams (CRUD-able; seed populates Team 1/2/3, management can add more).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  UUID REFERENCES management.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS management.team_members (
    team_id UUID NOT NULL REFERENCES management.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON management.team_members (user_id);

-- ---------------------------------------------------------------------------
-- Projects.
-- IDs follow PROJ-YYYY-NNN convention, assigned by the create-project Edge
-- Function (not auto-sequenced here so we keep human-friendly codes).
--
-- project_type:
--   research  -- the 15-day pipeline (IM/MD/IO/ER/PUB_*). Creation restricted
--                to users with users.can_create_research_project = TRUE.
--   general   -- free-form work tracking. Any authenticated user can create.
--                Deliverables are kind='CUSTOM' with user-defined titles.
--
-- visibility:
--   org         -- any authenticated user can read (default for research)
--   restricted  -- only users listed in project_access can read/comment/edit
--                  (Google-Sheets-style sharing; default for general projects)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.projects (
    id           TEXT PRIMARY KEY,
    theme        TEXT NOT NULL,
    description  TEXT,
    project_type TEXT NOT NULL DEFAULT 'research'
                 CHECK (project_type IN ('research','general')),
    visibility   TEXT NOT NULL DEFAULT 'org'
                 CHECK (visibility IN ('org','restricted')),
    status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','completed','archived','cancelled')),
    day_zero     DATE NOT NULL,
    team_id      UUID REFERENCES management.teams(id) ON DELETE SET NULL,
    given_by     UUID NOT NULL REFERENCES management.users(id),
    given_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status   ON management.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_team     ON management.projects (team_id);
CREATE INDEX IF NOT EXISTS idx_projects_day_zero ON management.projects (day_zero);
CREATE INDEX IF NOT EXISTS idx_projects_type     ON management.projects (project_type);

-- ---------------------------------------------------------------------------
-- Per-project access list (Google-Sheets-style sharing).
-- For projects with visibility='restricted', only users in this table (plus
-- the project's given_by creator) can read / comment / edit per their
-- permission level. For visibility='org' projects, this table optionally
-- elevates specific users beyond read-only (e.g. analysts you grant 'editor'
-- on a general project).
--
-- Permission ladder: viewer < commenter < editor < owner.
--   viewer    -- read only
--   commenter -- read + post comments on deliverables
--   editor    -- read + comment + update deliverable state / files / blockers
--   owner     -- everything incl. modify ACL, archive project. given_by is
--                implicitly owner; this table adds co-owners.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.project_access (
    project_id TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'viewer'
               CHECK (permission IN ('viewer','commenter','editor','owner')),
    granted_by UUID REFERENCES management.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_access_user ON management.project_access (user_id);

-- ---------------------------------------------------------------------------
-- Per-project approver assignments.
-- Stacks on top of role-default approvers (division directors approve own
-- division; CEO/CRO/research directors approve IM). VDs added per project.
-- division uses the same vocabulary as deliverables: ERD/MRD/IRD/MND/IM/CROSS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.project_approvers (
    project_id TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    division   TEXT NOT NULL,
    user_id    UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, division, user_id)
);

CREATE INDEX IF NOT EXISTS idx_approvers_user ON management.project_approvers (user_id);

-- ---------------------------------------------------------------------------
-- Deliverables. Kinds:
--   IM            -- Investment Memo (Day 3, cross-division)
--   MD            -- Market Dive (Day 10, MRD)            sequence_no 1 or 2
--   IO            -- Industry Outlook (Day 12, IRD)
--   ER            -- Equity Research (Day 15, ERD)         sequence_no 1 or 2
--   PUB_LINKEDIN  -- LinkedIn publication (Day 18, M&D)
--   PUB_IG        -- Instagram publication (Day 18, M&D)
--   PUB_WEBSITE   -- Website publication (Day 18, M&D)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.deliverables (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    -- Kinds: research-pipeline (IM/MD/IO/ER/PUB_*) or CUSTOM for general projects.
    kind          TEXT NOT NULL
                  CHECK (kind IN ('IM','MD','IO','ER','PUB_LINKEDIN','PUB_IG','PUB_WEBSITE','CUSTOM')),
    sequence_no   INTEGER NOT NULL DEFAULT 1,
    title         TEXT,
    -- CROSS = inherently multi-division (IM). NONE = general-project deliverable
    -- not tied to a research division.
    division      TEXT NOT NULL
                  CHECK (division IN ('ERD','MRD','IRD','MND','CROSS','NONE')),
    due_date      DATE NOT NULL,
    state         TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (state IN ('not_started','in_progress','submitted','approved','published')),
    file_url      TEXT,
    storage_path  TEXT,
    file_name     TEXT,
    revision_count            INTEGER NOT NULL DEFAULT 0,
    blocked                   BOOLEAN NOT NULL DEFAULT FALSE,
    blocker_note              TEXT,
    blocked_by_deliverable_id UUID REFERENCES management.deliverables(id) ON DELETE SET NULL,
    submitted_at  TIMESTAMPTZ,
    approved_at   TIMESTAMPTZ,
    approved_by   UUID REFERENCES management.users(id) ON DELETE SET NULL,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, kind, sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_deliverables_project ON management.deliverables (project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_state   ON management.deliverables (state);
CREATE INDEX IF NOT EXISTS idx_deliverables_due     ON management.deliverables (due_date);

-- ---------------------------------------------------------------------------
-- Deliverable owners (supports multi-owner for IM, which the 6 team analysts
-- co-author per slide 1). is_lead flags an optional primary author.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.deliverable_owners (
    deliverable_id UUID NOT NULL REFERENCES management.deliverables(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    is_lead        BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (deliverable_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dlv_owners_user ON management.deliverable_owners (user_id);

-- ---------------------------------------------------------------------------
-- Comments / discussion thread per deliverable.
-- Kinds:
--   comment            free-form
--   submission         analyst marks submitted (auto-created by Edge Function)
--   revision_request   approver sends back; increments revision_count
--   approval           approver flips to approved
--   blocker            analyst raises a blocker
--   unblock            blocker resolved
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.comments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID NOT NULL REFERENCES management.deliverables(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES management.users(id) ON DELETE CASCADE,
    kind           TEXT NOT NULL DEFAULT 'comment'
                   CHECK (kind IN ('comment','submission','revision_request','approval','blocker','unblock')),
    body           TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_deliverable ON management.comments (deliverable_id, created_at);

-- ---------------------------------------------------------------------------
-- Activity log (auto-populated by Edge Functions on every state change).
-- Powers the per-project activity stream and audit trail.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS management.activity_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     TEXT REFERENCES management.projects(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES management.deliverables(id) ON DELETE SET NULL,
    actor_user_id  UUID REFERENCES management.users(id) ON DELETE SET NULL,
    event_type     TEXT NOT NULL,
    payload        JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON management.activity_log (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor   ON management.activity_log (actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger for deliverables.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliverables_touch ON management.deliverables;
CREATE TRIGGER trg_deliverables_touch
    BEFORE UPDATE ON management.deliverables
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- ---------------------------------------------------------------------------
-- KPI views (derived on read; no materialization needed at our scale).
-- ---------------------------------------------------------------------------

-- Health classification per deliverable. Drives R/A/G coloring on FLEET.
CREATE OR REPLACE VIEW management.v_deliverable_status AS
SELECT
    d.*,
    p.theme,
    p.day_zero,
    p.team_id,
    CASE
        WHEN d.state IN ('approved','published') THEN
            CASE WHEN d.approved_at::date <= d.due_date THEN 'on_time' ELSE 'late' END
        WHEN d.blocked THEN 'blocked'
        WHEN d.due_date < CURRENT_DATE THEN 'overdue'
        WHEN d.due_date - CURRENT_DATE <= 2 THEN 'risk'
        ELSE 'on_track'
    END AS health
FROM management.deliverables d
JOIN management.projects p ON p.id = d.project_id;

-- Per-analyst KPI rollup. Filters happen client-side via the filter ribbon.
CREATE OR REPLACE VIEW management.v_analyst_kpi AS
SELECT
    u.id          AS user_id,
    u.username,
    u.full_name,
    u.division,
    COUNT(d.*) FILTER (WHERE d.state IN ('approved','published')) AS completed,
    COUNT(d.*) FILTER (
        WHERE d.state IN ('approved','published')
          AND d.approved_at::date <= d.due_date
    ) AS on_time,
    COUNT(d.*) FILTER (WHERE d.state IN ('not_started','in_progress','submitted')) AS in_flight,
    COUNT(d.*) FILTER (
        WHERE d.due_date < CURRENT_DATE
          AND d.state NOT IN ('approved','published')
    ) AS overdue,
    COALESCE(SUM(d.revision_count), 0) AS total_revisions
FROM management.users u
LEFT JOIN management.deliverable_owners o ON o.user_id = u.id
LEFT JOIN management.deliverables d       ON d.id = o.deliverable_id
WHERE u.role = 'analyst'
GROUP BY u.id, u.username, u.full_name, u.division;

-- ---------------------------------------------------------------------------
-- RPCs for the auth-login + create-project Edge Functions.
-- ---------------------------------------------------------------------------

-- verify_login: returns the user row only if username + password match an
-- active account. Touches last_login_at on success. Called from auth-login.
-- crypt() is evaluated twice (UPDATE + SELECT) -- fine at our login volume.
CREATE OR REPLACE FUNCTION management.verify_login(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    division TEXT,
    title TEXT,
    can_create_research_project BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE management.users u
       SET last_login_at = now()
     WHERE u.username = p_username
       AND u.password_hash = crypt(p_password, u.password_hash)
       AND u.active = TRUE;

    RETURN QUERY
    SELECT u.id, u.username, u.full_name, u.role, u.division, u.title, u.can_create_research_project
      FROM management.users u
     WHERE u.username = p_username
       AND u.password_hash = crypt(p_password, u.password_hash)
       AND u.active = TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION management.verify_login(TEXT, TEXT) TO service_role;

-- next_project_id: returns the next available PROJ-YYYY-NNN for the current
-- year. Called from create-project before INSERTing the row. Race-free
-- because the create-project Edge Function wraps this + INSERT in one txn.
CREATE OR REPLACE FUNCTION management.next_project_id()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    yr      INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    next_n  INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(id FROM 'PROJ-' || yr || '-(\d+)')::INTEGER), 0) + 1
      INTO next_n
      FROM management.projects
     WHERE id LIKE 'PROJ-' || yr || '-%';

    RETURN 'PROJ-' || yr || '-' || LPAD(next_n::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION management.next_project_id() TO service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security.
-- Phase 1: authenticated users get read-only via PostgREST. All writes go
-- through Edge Functions with service_role. Anon has zero access.
-- ---------------------------------------------------------------------------
ALTER TABLE management.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.team_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.project_access     ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.project_approvers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.deliverables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.deliverable_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.activity_log       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mgmt_users_read           ON management.users;
DROP POLICY IF EXISTS mgmt_teams_read           ON management.teams;
DROP POLICY IF EXISTS mgmt_team_members_read    ON management.team_members;
DROP POLICY IF EXISTS mgmt_projects_read        ON management.projects;
DROP POLICY IF EXISTS mgmt_project_access_read  ON management.project_access;
DROP POLICY IF EXISTS mgmt_approvers_read       ON management.project_approvers;
DROP POLICY IF EXISTS mgmt_deliverables_read    ON management.deliverables;
DROP POLICY IF EXISTS mgmt_dlv_owners_read      ON management.deliverable_owners;
DROP POLICY IF EXISTS mgmt_comments_read        ON management.comments;
DROP POLICY IF EXISTS mgmt_activity_read        ON management.activity_log;

-- Note: management.users is read THROUGH users_lite (no password_hash exposure).
-- The base table policy below is needed for the view to function under RLS.
-- Phase 1 reads are open to all authenticated users; visibility enforcement
-- for 'restricted' projects is enforced in the Edge Functions until we tighten
-- RLS in Phase 2 once the general-project + ACL UI ships.
CREATE POLICY mgmt_users_read           ON management.users              FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_teams_read           ON management.teams              FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_team_members_read    ON management.team_members       FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_projects_read        ON management.projects           FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_project_access_read  ON management.project_access     FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_approvers_read       ON management.project_approvers  FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_deliverables_read    ON management.deliverables       FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_dlv_owners_read      ON management.deliverable_owners FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_comments_read        ON management.comments           FOR SELECT TO authenticated USING (true);
CREATE POLICY mgmt_activity_read        ON management.activity_log       FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Grants. authenticated reads via tables/views; service_role does writes.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA management TO authenticated, service_role;

-- authenticated never sees password_hash: read users via users_lite only.
REVOKE ALL ON TABLE management.users FROM authenticated;
GRANT SELECT ON management.users_lite           TO authenticated;
GRANT SELECT ON management.teams                TO authenticated;
GRANT SELECT ON management.team_members         TO authenticated;
GRANT SELECT ON management.projects             TO authenticated;
GRANT SELECT ON management.project_access       TO authenticated;
GRANT SELECT ON management.project_approvers    TO authenticated;
GRANT SELECT ON management.deliverables         TO authenticated;
GRANT SELECT ON management.deliverable_owners   TO authenticated;
GRANT SELECT ON management.comments             TO authenticated;
GRANT SELECT ON management.activity_log         TO authenticated;
GRANT SELECT ON management.v_deliverable_status TO authenticated;
GRANT SELECT ON management.v_analyst_kpi        TO authenticated;

-- service_role: full write access (used by Edge Functions).
GRANT ALL ON ALL TABLES    IN SCHEMA management TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA management TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA management TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA management GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA management GRANT ALL ON SEQUENCES TO service_role;
