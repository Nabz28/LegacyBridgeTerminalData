-- =====================================================================
-- LBC Management Terminal -- consolidated bootstrap (migrations 0005-0012)
-- =====================================================================
-- Paste this entire file into your Supabase project's SQL Editor and run.
-- Idempotent: every statement uses CREATE ... IF NOT EXISTS, OR REPLACE,
-- ON CONFLICT, or guarded DO blocks, so re-running is safe.
--
-- Touches ONLY the management.* schema (plus an INSERT into
-- storage.buckets and one ALTER PUBLICATION on supabase_realtime).
-- Never touches public.*, auth.*, or any other existing schema.
--
-- After running, go to:
--   Project Settings -> API -> Exposed schemas
-- and ADD management to the comma-separated list. Without this,
-- PostgREST returns 'Schema "management" does not exist'.
-- =====================================================================


-- ========== 0005_management_schema.sql ==========

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


-- ========== 0006_management_seed.sql ==========

-- Management Terminal seed.
-- Seeds 43 user accounts, 3 default teams, and team membership matching the
-- current LBC research org. Default password for any user is <username>1234,
-- bcrypt-hashed via pgcrypto's crypt() + gen_salt('bf', 10). Users should
-- change their passwords on first login (account-management UI ships later).
--
-- Idempotent: ON CONFLICT DO NOTHING preserves existing rows so re-running
-- the seed never overwrites a user that already exists (which would otherwise
-- rotate their password to the default).

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
-- can_create_research_project = TRUE for: all C-suite, advisors (read+comment
-- only so set FALSE), research directors/VDs, SPD, AMD (incl. AMD analysts
-- per slide), and M&D director Farhan. Everyone else can still create
-- 'general' projects (free-form work tracking with Google-Sheets-style ACL).

INSERT INTO management.users (username, password_hash, full_name, role, division, title, can_create_research_project) VALUES
  -- C-suite
  ('nabil',      crypt('nabil1234',      gen_salt('bf', 10)), 'Nabil Sachio Refat',     'management', 'Exec', 'Chief Executive Officer',     TRUE),
  ('khalif',     crypt('khalif1234',     gen_salt('bf', 10)), 'M. Khalif P. Karnova',   'management', 'Exec', 'Chief Research Officer',      TRUE),
  ('rattana',    crypt('rattana1234',    gen_salt('bf', 10)), 'Rattana A. Chaniago',    'management', 'Exec', 'Chief Financial Officer',     TRUE),
  ('charlie',    crypt('charlie1234',    gen_salt('bf', 10)), 'Charlie Verchius',       'management', 'Exec', 'Chief Investment Officer',    TRUE),
  ('rizky',      crypt('rizky1234',      gen_salt('bf', 10)), 'M. Rizky Narindra',      'management', 'Exec', 'Chief Technological Officer', TRUE),
  ('kayla',      crypt('kayla1234',      gen_salt('bf', 10)), 'Kayla Kwok',             'management', 'Exec', 'Chief Strategy Officer',      TRUE),

  -- Advisors (read + comment, no create / no approve)
  ('stefano',    crypt('stefano1234',    gen_salt('bf', 10)), 'Stefano Ryan Oliver Yap','advisor',   'Advisor', 'Research Advisor',         FALSE),
  ('fakih',      crypt('fakih1234',      gen_salt('bf', 10)), 'Fakih Habib Dzulfikar',  'advisor',   'Advisor', 'Investment Advisor',       FALSE),

  -- Research directors + VDs
  ('satya',      crypt('satya1234',      gen_salt('bf', 10)), 'Satya Damba Pramudita',  'management', 'ERD', 'Equity Research Director',   TRUE),
  ('dzaki',      crypt('dzaki1234',      gen_salt('bf', 10)), 'Ahmad Dzaki Sofyan',     'management', 'ERD', 'ERD Vice Director 1',        TRUE),
  ('marselinus', crypt('marselinus1234', gen_salt('bf', 10)), 'A. Marselinus S.D.',     'management', 'ERD', 'ERD Vice Director 2',        TRUE),
  ('amadeus',    crypt('amadeus1234',    gen_salt('bf', 10)), 'Amadeus B.H. Sianturi',  'management', 'MRD', 'Market Research Director',   TRUE),
  ('deo',        crypt('deo1234',        gen_salt('bf', 10)), 'Deo',                    'management', 'MRD', 'MRD Vice Director',          TRUE),
  ('aqila',      crypt('aqila1234',      gen_salt('bf', 10)), 'Aqila Muhammad Taqy',    'management', 'IRD', 'Industry Research Director', TRUE),
  ('bintang',    crypt('bintang1234',    gen_salt('bf', 10)), 'Bintang Bintara',        'management', 'IRD', 'IRD Vice Director',          TRUE),

  -- AMD (under CIO). Per slide, AMD gives projects; all AMD members can create.
  ('aurafa',     crypt('aurafa1234',     gen_salt('bf', 10)), 'M. Aurafa Muhidin',      'management', 'AMD', 'AMD Vice Director',          TRUE),
  ('jonathan',   crypt('jonathan1234',   gen_salt('bf', 10)), 'Jonathan',               'analyst',    'AMD', 'AMD Analyst',                TRUE),
  ('farren',     crypt('farren1234',     gen_salt('bf', 10)), 'Farren',                 'analyst',    'AMD', 'AMD Analyst',                TRUE),
  ('rafif',      crypt('rafif1234',      gen_salt('bf', 10)), 'Rafif',                  'analyst',    'AMD', 'AMD Analyst',                TRUE),

  -- SPD (people management arm; read everything + assign analysts)
  ('grace',      crypt('grace1234',      gen_salt('bf', 10)), 'Grace',                  'management', 'SPD', 'Strategy & Performance',     TRUE),
  ('faiq',       crypt('faiq1234',       gen_salt('bf', 10)), 'Faiq',                   'management', 'SPD', 'Strategy & Performance',     TRUE),
  ('nadine',     crypt('nadine1234',     gen_salt('bf', 10)), 'Nadine',                 'management', 'SPD', 'Strategy & Performance',     TRUE),

  -- M&D
  ('farhan',     crypt('farhan1234',     gen_salt('bf', 10)), 'Farhan Yudha Satria',    'management', 'MND', 'Marketing & Design Director', TRUE),
  ('dharma',     crypt('dharma1234',     gen_salt('bf', 10)), 'Dharma',                 'analyst',    'MND', 'M&D Analyst',                 FALSE),
  ('tristan',    crypt('tristan1234',    gen_salt('bf', 10)), 'Tristan',                'analyst',    'MND', 'M&D Analyst',                 FALSE),
  ('fayyaz',     crypt('fayyaz1234',     gen_salt('bf', 10)), 'Fayyaz',                 'analyst',    'MND', 'M&D Analyst',                 FALSE),

  -- ERD analysts (6)
  ('bulan',      crypt('bulan1234',      gen_salt('bf', 10)), 'Bulan',                  'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('james',      crypt('james1234',      gen_salt('bf', 10)), 'James',                  'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('fauzan',     crypt('fauzan1234',     gen_salt('bf', 10)), 'Fauzan',                 'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('sheila',     crypt('sheila1234',     gen_salt('bf', 10)), 'Sheila',                 'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('tio',        crypt('tio1234',        gen_salt('bf', 10)), 'Tio',                    'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('phillip',    crypt('phillip1234',    gen_salt('bf', 10)), 'Phillip',                'analyst', 'ERD', 'ERD Analyst', FALSE),

  -- MRD analysts (6)
  ('resti',      crypt('resti1234',      gen_salt('bf', 10)), 'Resti',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('aldrian',    crypt('aldrian1234',    gen_salt('bf', 10)), 'Aldrian',                'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('samuel',     crypt('samuel1234',     gen_salt('bf', 10)), 'Samuel',                 'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('sella',      crypt('sella1234',      gen_salt('bf', 10)), 'Sella',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('ghani',      crypt('ghani1234',      gen_salt('bf', 10)), 'Ghani',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('bhadra',     crypt('bhadra1234',     gen_salt('bf', 10)), 'Bhadra',                 'analyst', 'MRD', 'MRD Analyst', FALSE),

  -- IRD analysts (6)
  ('tiangga',    crypt('tiangga1234',    gen_salt('bf', 10)), 'Tiangga',                'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('gede',       crypt('gede1234',       gen_salt('bf', 10)), 'Gede',                   'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('azka',       crypt('azka1234',       gen_salt('bf', 10)), 'Azka',                   'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('jevan',      crypt('jevan1234',      gen_salt('bf', 10)), 'Jevan',                  'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('rifqi',      crypt('rifqi1234',      gen_salt('bf', 10)), 'Rifqi',                  'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('kenneth',    crypt('kenneth1234',    gen_salt('bf', 10)), 'Kenneth',                'analyst', 'IRD', 'IRD Analyst', FALSE)
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teams (current batch). Management can rename / add / archive later via UI.
-- ---------------------------------------------------------------------------
INSERT INTO management.teams (slug, name, description) VALUES
  ('team-1', 'Team 1', 'Current Project 1 crew (Fauzan/Tio ERD, Resti/Bhadra MRD, Gede/Tiangga IRD)'),
  ('team-2', 'Team 2', 'Current Project 2 crew (Phillip/Sheila ERD, Samuel/Sella MRD, Rifqi/Jevan IRD)'),
  ('team-3', 'Team 3', 'Current Project 3 crew (Bulan/James ERD, Aldrian/Ghani MRD, Kenneth/Azka IRD)')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Team membership (the 18 research analysts; each on exactly one team).
-- ---------------------------------------------------------------------------
INSERT INTO management.team_members (team_id, user_id)
SELECT t.id, u.id
FROM management.users u
JOIN management.teams t ON
       (t.slug = 'team-1' AND u.username IN ('fauzan','tio','resti','bhadra','gede','tiangga'))
    OR (t.slug = 'team-2' AND u.username IN ('phillip','sheila','samuel','sella','rifqi','jevan'))
    OR (t.slug = 'team-3' AND u.username IN ('bulan','james','aldrian','ghani','kenneth','azka'))
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage bucket for deliverable file uploads.
-- Private bucket; the management-files-upload Edge Function returns signed
-- URLs scoped to the requesting user. 50 MB per file is plenty for PDFs/PPTX.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('management-files', 'management-files', FALSE, 52428800)
ON CONFLICT (id) DO NOTHING;


-- ========== 0007_management_storage.sql ==========

-- Storage RLS for the management-files bucket.
-- Bucket itself is created in 0006_management_seed.sql.
--
-- Phase 2: authenticated users can list/read/insert. Updates and deletes go
-- through the service-role Edge Function path so the deliverable row and the
-- storage object stay in lockstep. Anon role has zero access.

DROP POLICY IF EXISTS mgmt_storage_select ON storage.objects;
DROP POLICY IF EXISTS mgmt_storage_insert ON storage.objects;

CREATE POLICY mgmt_storage_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'management-files');

CREATE POLICY mgmt_storage_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'management-files');


-- ========== 0008_management_admin.sql ==========

-- Phase 3 admin support.
-- Adds an admin user, two SECURITY DEFINER RPCs for password operations
-- (so bcrypt happens in the DB, never in JS), and a convenience view that
-- the admin UI uses to roll up project counts per user.
--
-- RLS stays permissive on reads in Phase 3 -- visibility + ACL is enforced
-- by the admin-mutate Edge Function and the share UI. A dedicated security
-- pass (migration 0009 or later) will tighten read policies to honor
-- projects.visibility and management.project_access.

-- ---------------------------------------------------------------------------
-- Seed admin account. Default password is `aldee1234`. Reset via the admin
-- UI on first login or via the admin_reset_password RPC.
-- ---------------------------------------------------------------------------
INSERT INTO management.users (
    username, password_hash, full_name, role, division, title, can_create_research_project
) VALUES (
    'aldee',
    crypt('aldee1234', gen_salt('bf', 10)),
    'Aldee (System Admin)',
    'admin',
    'Exec',
    'System Administrator',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- admin_create_user: bcrypt hash happens server-side via pgcrypto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.admin_create_user(
    p_username                    TEXT,
    p_password                    TEXT,
    p_full_name                   TEXT,
    p_role                        TEXT,
    p_division                    TEXT,
    p_title                       TEXT,
    p_can_create_research_project BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO management.users (
        username, password_hash, full_name, role, division, title, can_create_research_project
    ) VALUES (
        lower(trim(p_username)),
        crypt(p_password, gen_salt('bf', 10)),
        p_full_name,
        p_role,
        NULLIF(p_division, ''),
        NULLIF(p_title, ''),
        COALESCE(p_can_create_research_project, FALSE)
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION management.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
    TO service_role;

-- ---------------------------------------------------------------------------
-- admin_reset_password: rotate password without exposing the hash.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.admin_reset_password(
    p_user_id UUID,
    p_new_password TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE management.users
       SET password_hash = crypt(p_new_password, gen_salt('bf', 10))
     WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION management.admin_reset_password(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Per-user activity rollup view -- used by the admin user list to show
-- "currently assigned to N projects".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW management.v_user_activity AS
SELECT
    u.id AS user_id,
    u.username,
    u.full_name,
    u.role,
    u.division,
    u.active,
    COUNT(DISTINCT d.project_id) FILTER (
        WHERE d.state NOT IN ('approved','published')
    ) AS active_projects,
    COUNT(d.*) FILTER (WHERE d.state NOT IN ('approved','published')) AS in_flight,
    COUNT(d.*) FILTER (WHERE d.state IN ('approved','published')) AS completed
FROM management.users u
LEFT JOIN management.deliverable_owners o ON o.user_id = u.id
LEFT JOIN management.deliverables d       ON d.id = o.deliverable_id
GROUP BY u.id, u.username, u.full_name, u.role, u.division, u.active;

GRANT SELECT ON management.v_user_activity TO authenticated;


-- ========== 0009_management_phase4.sql ==========

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


-- ========== 0010_management_realtime.sql ==========

-- Enable Supabase Realtime on the management.* tables.
--
-- Once published, any INSERT/UPDATE/DELETE on these tables fans out over the
-- `mgmt-realtime` channel (subscribed to from management/src/lib/realtime.ts)
-- and every open browser refreshes automatically. RLS still applies to the
-- pushed payloads, so anonymous users see nothing.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'projects',
            'deliverables',
            'deliverable_owners',
            'comments',
            'activity_log',
            'project_events',
            'project_event_attendees',
            'project_members',
            'project_approvers',
            'project_access',
            'teams',
            'team_members',
            'users'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE management.%I', t);
        EXCEPTION WHEN duplicate_object THEN
            -- Already in the publication; safe to ignore.
            NULL;
        END;
    END LOOP;
END;
$$;


-- ========== 0011_management_phase5.sql ==========

-- Phase 5: multi-division responsibility + custom tasks.
--
-- responsible_divisions stores every division responsible for a deliverable.
-- The legacy single `division` column stays for fast filtering + bar color
-- ("primary" division: first element of the array, or 'CROSS' for multi).
--
-- For Phase 4-era rows we backfill responsible_divisions from the single
-- division column (IM expands to all three research divisions).

ALTER TABLE management.deliverables
    ADD COLUMN IF NOT EXISTS responsible_divisions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: any row with an empty array gets one based on its current division.
UPDATE management.deliverables
   SET responsible_divisions = CASE
       WHEN kind = 'IM' THEN ARRAY['ERD','MRD','IRD']
       WHEN division = 'CROSS' THEN ARRAY['ERD','MRD','IRD']
       WHEN division IN ('NONE') THEN ARRAY[]::TEXT[]
       ELSE ARRAY[division]
   END
 WHERE responsible_divisions = ARRAY[]::TEXT[];

-- The trigger keeps `division` (primary) in sync whenever responsible_divisions
-- changes via Edge Function or direct UPDATE.
CREATE OR REPLACE FUNCTION management.sync_primary_division()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.responsible_divisions IS NOT NULL AND array_length(NEW.responsible_divisions, 1) >= 1 THEN
        IF array_length(NEW.responsible_divisions, 1) = 1 THEN
            NEW.division := NEW.responsible_divisions[1];
        ELSE
            NEW.division := 'CROSS';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliverables_sync_division ON management.deliverables;
CREATE TRIGGER trg_deliverables_sync_division
    BEFORE INSERT OR UPDATE OF responsible_divisions ON management.deliverables
    FOR EACH ROW EXECUTE FUNCTION management.sync_primary_division();


-- ========== 0012_management_seed_first_cycle.sql ==========

-- Phase 5: seed three projects for the first research cycle.
--
-- All three start on the day this migration runs (CURRENT_DATE), one per
-- team, with the standard deliverable pipeline auto-spawned at:
--   IM   D5
--   MD   D15
--   IO   D20
--   ER   D25
--   LinkedIn + Website  D27
--   Instagram           D34
--
-- Themes are placeholders (Project 1/2/3) -- the CIO/CEO renames them in the
-- UI via Members modal or the "project_set_theme" admin action once the
-- actual cycle's themes are picked.
--
-- Idempotent: skipped if any first-cycle projects already exist (ID match).

DO $$
DECLARE
    cycle_start DATE := CURRENT_DATE;
    cycle_year  INTEGER := EXTRACT(YEAR FROM cycle_start);
    p1_id TEXT := 'PROJ-' || cycle_year || '-001';
    p2_id TEXT := 'PROJ-' || cycle_year || '-002';
    p3_id TEXT := 'PROJ-' || cycle_year || '-003';
    given_by_id UUID;
    erd_dir UUID; mrd_dir UUID; ird_dir UUID; mnd_dir UUID; mrd_vd UUID;
    cro_id  UUID; ceo_id UUID;
BEGIN
    -- Bail if the first project already exists -- assume the seed already ran.
    IF EXISTS (SELECT 1 FROM management.projects WHERE id = p1_id) THEN
        RAISE NOTICE 'first-cycle projects already seeded; skipping';
        RETURN;
    END IF;

    -- Anchor the "given_by" to the CIO (matches Phase 4 demo flow).
    SELECT id INTO given_by_id FROM management.users WHERE username = 'charlie';
    SELECT id INTO erd_dir     FROM management.users WHERE username = 'satya';
    SELECT id INTO mrd_dir     FROM management.users WHERE username = 'amadeus';
    SELECT id INTO ird_dir     FROM management.users WHERE username = 'aqila';
    SELECT id INTO mnd_dir     FROM management.users WHERE username = 'farhan';
    SELECT id INTO mrd_vd      FROM management.users WHERE username = 'deo';
    SELECT id INTO cro_id      FROM management.users WHERE username = 'khalif';
    SELECT id INTO ceo_id      FROM management.users WHERE username = 'nabil';

    IF given_by_id IS NULL THEN
        RAISE EXCEPTION 'expected users (charlie etc.) not seeded; run 0006/0008 first';
    END IF;

    -- 1. Insert projects (theme is a placeholder; CIO renames in the UI).
    INSERT INTO management.projects (id, theme, description, project_type, visibility, status, day_zero, team_id, given_by)
    SELECT v.id, v.theme, v.description, 'research', 'org', 'active', cycle_start, v.team_id, given_by_id
    FROM (VALUES
        (p1_id, 'Project 1 â€” Theme TBD', 'First-cycle project 1. Theme to be set by CIO.',
            (SELECT id FROM management.teams WHERE slug = 'team-1')),
        (p2_id, 'Project 2 â€” Theme TBD', 'First-cycle project 2. Theme to be set by CIO.',
            (SELECT id FROM management.teams WHERE slug = 'team-2')),
        (p3_id, 'Project 3 â€” Theme TBD', 'First-cycle project 3. Theme to be set by CIO.',
            (SELECT id FROM management.teams WHERE slug = 'team-3'))
    ) AS v(id, theme, description, team_id);

    -- 2. Spawn the standard pipeline per project (offsets matching the cycle).
    INSERT INTO management.deliverables (project_id, kind, sequence_no, title, division, responsible_divisions, due_date)
    SELECT pid, kind, seq, title, division, resp, cycle_start + offset_days
    FROM (VALUES
        ('IM',           1, 'Investment Memo',       'CROSS', ARRAY['ERD','MRD','IRD']::TEXT[],  5),
        ('MD',           1, 'Market Dive',           'MRD',   ARRAY['MRD']::TEXT[],             15),
        ('IO',           1, 'Industry Outlook',      'IRD',   ARRAY['IRD']::TEXT[],             20),
        ('ER',           1, 'Equity Research',       'ERD',   ARRAY['ERD']::TEXT[],             25),
        ('PUB_LINKEDIN', 1, 'LinkedIn Publication',  'MND',   ARRAY['MND']::TEXT[],             27),
        ('PUB_WEBSITE',  1, 'Website Publication',   'MND',   ARRAY['MND']::TEXT[],             27),
        ('PUB_IG',       1, 'Instagram Publication', 'MND',   ARRAY['MND']::TEXT[],             34)
    ) AS t(kind, seq, title, division, resp, offset_days)
    CROSS JOIN (VALUES (p1_id), (p2_id), (p3_id)) AS p(pid);

    -- 3. Bind owners from team roster:
    --    IM -> all 6 team analysts
    --    MD -> one MRD analyst
    --    IO -> two IRD analysts
    --    ER -> one ERD analyst
    --    PUB_* stay unassigned -- M&D director staffs them at finalization
    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT d.id, tm.user_id, FALSE
    FROM management.deliverables d
    JOIN management.projects p     ON p.id = d.project_id
    JOIN management.team_members tm ON tm.team_id = p.team_id
    WHERE d.kind = 'IM' AND p.id IN (p1_id, p2_id, p3_id);

    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT DISTINCT ON (d.id) d.id, u.id, TRUE
    FROM management.deliverables d
    JOIN management.projects p     ON p.id = d.project_id
    JOIN management.team_members tm ON tm.team_id = p.team_id
    JOIN management.users u         ON u.id = tm.user_id
    WHERE p.id IN (p1_id, p2_id, p3_id)
      AND ((d.kind = 'MD' AND u.division = 'MRD')
        OR (d.kind = 'ER' AND u.division = 'ERD'))
    ORDER BY d.id, u.username;

    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT d.id, u.id, FALSE
    FROM management.deliverables d
    JOIN management.projects p     ON p.id = d.project_id
    JOIN management.team_members tm ON tm.team_id = p.team_id
    JOIN management.users u         ON u.id = tm.user_id
    WHERE p.id IN (p1_id, p2_id, p3_id)
      AND d.kind = 'IO' AND u.division = 'IRD';

    -- 4. Backfill project_members from team roster (T1).
    INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
    SELECT p.id, tm.user_id, 't1', given_by_id, now()
    FROM management.projects p
    JOIN management.team_members tm ON tm.team_id = p.team_id
    WHERE p.id IN (p1_id, p2_id, p3_id);

    -- 5. SPD assignments (T2 â€” management authority on each project):
    --    Faiq -> Project 1, Grace -> Project 2, Nadine -> Project 3.
    INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
    SELECT v.pid, u.id, 't2', given_by_id, now()
    FROM (VALUES (p1_id, 'faiq'), (p2_id, 'grace'), (p3_id, 'nadine')) AS v(pid, uname)
    JOIN management.users u ON u.username = v.uname;

    -- 6. Approver matrix per project.
    --    ERD/MRD/IRD/MND directors + MRD VD Deo + IM approvers (CEO/CRO/3 res dirs).
    INSERT INTO management.project_approvers (project_id, division, user_id)
    SELECT p.id, v.division, v.uid
    FROM management.projects p
    CROSS JOIN (VALUES
        ('ERD', erd_dir),
        ('MRD', mrd_dir),
        ('MRD', mrd_vd),
        ('IRD', ird_dir),
        ('MND', mnd_dir),
        ('IM',  ceo_id),
        ('IM',  cro_id),
        ('IM',  erd_dir),
        ('IM',  mrd_dir),
        ('IM',  ird_dir)
    ) AS v(division, uid)
    WHERE p.id IN (p1_id, p2_id, p3_id)
      AND v.uid IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 7. Activity log marker so audit trail starts here.
    INSERT INTO management.activity_log (project_id, deliverable_id, actor_user_id, event_type, payload)
    SELECT p.id, NULL, given_by_id, 'create_project',
        jsonb_build_object('seed', 'first-cycle', 'cycle_start', cycle_start)
    FROM management.projects p
    WHERE p.id IN (p1_id, p2_id, p3_id);

    RAISE NOTICE 'seeded first-cycle projects: %, %, %', p1_id, p2_id, p3_id;
END;
$$;


