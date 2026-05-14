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
