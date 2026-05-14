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
        (p1_id, 'Project 1 — Theme TBD', 'First-cycle project 1. Theme to be set by CIO.',
            (SELECT id FROM management.teams WHERE slug = 'team-1')),
        (p2_id, 'Project 2 — Theme TBD', 'First-cycle project 2. Theme to be set by CIO.',
            (SELECT id FROM management.teams WHERE slug = 'team-2')),
        (p3_id, 'Project 3 — Theme TBD', 'First-cycle project 3. Theme to be set by CIO.',
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

    -- 5. SPD assignments (T2 — management authority on each project):
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
