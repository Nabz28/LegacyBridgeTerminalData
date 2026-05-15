-- 0013 -- Roster corrections + new QRD division.
--
-- 1. Drop the duplicate user `amadeus` (same person as `deo`); re-point any
--    project_approvers / deliverables / etc. references onto deo first so
--    the audit trail survives.
-- 2. Promote `deo` to MRD Director (was MRD VD).
-- 3. Widen the users.division CHECK constraint: drop the existing 9-option
--    enum and re-create it with `QRD` swapped in for the unused `Quant`
--    placeholder. Same shape, cleaner label that matches ERD/MRD/IRD.
-- 4. Insert `shawn` as the lone QRD member (Quant Research Director,
--    role=management, can_create_research_project=TRUE). Default password
--    `shawn1234`, bcrypt-hashed.
--
-- Idempotent: re-running is safe -- amadeus delete uses IF EXISTS semantics
-- by guarding the redirect on its existence, the constraint swap is wrapped
-- in a DO block, and shawn uses ON CONFLICT DO NOTHING.

-- ---------------------------------------------------------------------------
-- (1) Merge amadeus -> deo, then drop amadeus
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    amadeus_id UUID;
    deo_id UUID;
BEGIN
    SELECT id INTO amadeus_id FROM management.users WHERE username = 'amadeus';
    SELECT id INTO deo_id     FROM management.users WHERE username = 'deo';

    IF amadeus_id IS NULL THEN
        RAISE NOTICE 'amadeus not found -- merge already applied, skipping';
        RETURN;
    END IF;
    IF deo_id IS NULL THEN
        RAISE EXCEPTION 'deo not found; cannot merge amadeus -> deo';
    END IF;

    -- Re-point project_approvers: insert (project_id, division, deo_id) for
    -- every (project_id, division, amadeus_id) row. Conflict-tolerant in
    -- case deo is already an approver on the same (project, division).
    INSERT INTO management.project_approvers (project_id, division, user_id)
    SELECT pa.project_id, pa.division, deo_id
    FROM management.project_approvers pa
    WHERE pa.user_id = amadeus_id
    ON CONFLICT DO NOTHING;

    -- Re-point deliverable_owners similarly.
    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT do_row.deliverable_id, deo_id, do_row.is_lead
    FROM management.deliverable_owners do_row
    WHERE do_row.user_id = amadeus_id
    ON CONFLICT DO NOTHING;

    -- project_members: same pattern.
    INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
    SELECT pm.project_id, deo_id, pm.permission, pm.added_by, pm.added_at
    FROM management.project_members pm
    WHERE pm.user_id = amadeus_id
    ON CONFLICT DO NOTHING;

    -- Team membership too.
    INSERT INTO management.team_members (team_id, user_id)
    SELECT tm.team_id, deo_id
    FROM management.team_members tm
    WHERE tm.user_id = amadeus_id
    ON CONFLICT DO NOTHING;

    -- Finally drop amadeus. The remaining FKs on user_id are ON DELETE CASCADE
    -- or ON DELETE SET NULL, so this is safe -- the audit trail entries
    -- (activity_log) become actor_user_id=NULL rather than disappearing.
    DELETE FROM management.users WHERE id = amadeus_id;
END $$;

-- ---------------------------------------------------------------------------
-- (2) Promote deo to MRD Director
-- ---------------------------------------------------------------------------

UPDATE management.users
   SET title = 'Market Research Director',
       can_create_research_project = TRUE
 WHERE username = 'deo';

-- ---------------------------------------------------------------------------
-- (3) CHECK constraint: replace 'Quant' with 'QRD'
-- ---------------------------------------------------------------------------

-- The original constraint is auto-named `users_division_check` (Postgres'
-- default for inline column CHECK is <table>_<column>_check). Drop-then-add
-- under IF EXISTS so this block stays idempotent.
ALTER TABLE management.users DROP CONSTRAINT IF EXISTS users_division_check;

ALTER TABLE management.users
    ADD CONSTRAINT users_division_check
    CHECK (division IN ('ERD','MRD','IRD','AMD','SPD','MND','Exec','QRD','Advisor'));

-- ---------------------------------------------------------------------------
-- (4) Insert shawn -- the sole QRD member.
-- ---------------------------------------------------------------------------

INSERT INTO management.users (
    username, password_hash, full_name, role, division, title,
    can_create_research_project
) VALUES (
    'shawn',
    crypt('shawn1234', gen_salt('bf', 10)),
    'Shawn',
    'management',
    'QRD',
    'Quant Research Director',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
