-- 0015b -- Restore PROJ-2026-002 after accidental delete.
--
-- Idempotent: bails out if PROJ-2026-002 already exists. Re-creates with
-- the same shape as the original 0012 first-cycle seed: 7 deliverables on
-- the canonical schedule, team-2 analysts as owners + project_members,
-- grace as the SPD T2 lead, plus the full approver matrix.

DO $$
DECLARE
    cycle_start DATE := DATE '2026-05-14';   -- match the surviving projects
    p_id        TEXT := 'PROJ-2026-002';
    given_by_id UUID;
    erd_dir UUID; mrd_dir UUID; ird_dir UUID; mnd_dir UUID; mrd_vd UUID;
    cro_id  UUID; ceo_id UUID;
    _team_id UUID;
    grace_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM management.projects WHERE id = p_id) THEN
        RAISE NOTICE 'PROJ-2026-002 already exists; skipping restore';
        RETURN;
    END IF;

    SELECT id INTO given_by_id FROM management.users WHERE username = 'charlie';
    SELECT id INTO erd_dir     FROM management.users WHERE username = 'satya';
    SELECT id INTO mrd_dir     FROM management.users WHERE username = 'deo';        -- deo is MRD Director post-0013
    SELECT id INTO ird_dir     FROM management.users WHERE username = 'aqila';
    SELECT id INTO mnd_dir     FROM management.users WHERE username = 'farhan';
    SELECT id INTO mrd_vd      FROM management.users WHERE username = 'deo';        -- same person; kept for matrix shape
    SELECT id INTO cro_id      FROM management.users WHERE username = 'khalif';
    SELECT id INTO ceo_id      FROM management.users WHERE username = 'nabil';
    SELECT id INTO _team_id     FROM management.teams WHERE slug = 'team-2';
    SELECT id INTO grace_id    FROM management.users WHERE username = 'grace';

    IF given_by_id IS NULL OR _team_id IS NULL OR grace_id IS NULL THEN
        RAISE EXCEPTION 'Required users/teams missing; cannot restore PROJ-2026-002';
    END IF;

    -- 1. Project row (theme matches the Fleet screenshot the user had)
    INSERT INTO management.projects
        (id, theme, description, project_type, visibility, status, day_zero, team_id, given_by)
    VALUES
        (p_id, 'Project Team 2: AI Bubble',
         'Restored first-cycle project 2 (was accidentally deleted).',
         'research', 'org', 'active', cycle_start, _team_id, given_by_id);

    -- 2. The 7 standard deliverables on the canonical schedule
    INSERT INTO management.deliverables
        (project_id, kind, sequence_no, title, division, responsible_divisions, due_date)
    VALUES
        (p_id, 'IM',           1, 'Investment Memo',       'CROSS', ARRAY['ERD','MRD','IRD']::TEXT[], cycle_start +  5),
        (p_id, 'MD',           1, 'Market Dive',           'MRD',   ARRAY['MRD']::TEXT[],             cycle_start + 15),
        (p_id, 'IO',           1, 'Industry Outlook',      'IRD',   ARRAY['IRD']::TEXT[],             cycle_start + 20),
        (p_id, 'ER',           1, 'Equity Research',       'ERD',   ARRAY['ERD']::TEXT[],             cycle_start + 25),
        (p_id, 'PUB_LINKEDIN', 1, 'LinkedIn Publication',  'MND',   ARRAY['MND']::TEXT[],             cycle_start + 27),
        (p_id, 'PUB_WEBSITE',  1, 'Website Publication',   'MND',   ARRAY['MND']::TEXT[],             cycle_start + 27),
        (p_id, 'PUB_IG',       1, 'Instagram Publication', 'MND',   ARRAY['MND']::TEXT[],             cycle_start + 34);

    -- 3. Owners. IM gets all 6 team-2 analysts. MD = one MRD analyst. ER = one ERD analyst.
    --    IO = the two IRD team analysts. PUB_* unassigned (MND director staffs at finalisation).
    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT d.id, tm.user_id, FALSE
      FROM management.deliverables d
      JOIN management.team_members tm ON tm.team_id = _team_id
     WHERE d.project_id = p_id AND d.kind = 'IM';

    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT DISTINCT ON (d.id) d.id, u.id, TRUE
      FROM management.deliverables d
      JOIN management.team_members tm ON tm.team_id = _team_id
      JOIN management.users u ON u.id = tm.user_id
     WHERE d.project_id = p_id
       AND ((d.kind = 'MD' AND u.division = 'MRD')
         OR (d.kind = 'ER' AND u.division = 'ERD'))
     ORDER BY d.id, u.username;

    INSERT INTO management.deliverable_owners (deliverable_id, user_id, is_lead)
    SELECT d.id, u.id, FALSE
      FROM management.deliverables d
      JOIN management.team_members tm ON tm.team_id = _team_id
      JOIN management.users u ON u.id = tm.user_id
     WHERE d.project_id = p_id
       AND d.kind = 'IO' AND u.division = 'IRD';

    -- 4. project_members from the team-2 roster (T1).
    INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
    SELECT p_id, tm.user_id, 't1', given_by_id, now()
      FROM management.team_members tm
     WHERE tm.team_id = _team_id;

    -- 5. SPD lead Grace gets T2 on Project 2 (matches the original 0012 layout:
    --    Faiq->001, Grace->002, Nadine->003).
    INSERT INTO management.project_members (project_id, user_id, permission, added_by, added_at)
    VALUES (p_id, grace_id, 't2', given_by_id, now())
    ON CONFLICT DO NOTHING;

    -- 6. Approver matrix. ERD/MRD/IRD/MND directors approve their own division;
    --    Deo (MRD VD now MRD Director, same person) on MRD; the IM approvers
    --    are CEO + CRO + 3 research directors.
    INSERT INTO management.project_approvers (project_id, division, user_id)
    SELECT p_id, v.division, v.uid
      FROM (VALUES
          ('ERD', erd_dir),
          ('MRD', mrd_dir),
          ('IRD', ird_dir),
          ('MND', mnd_dir),
          ('IM',  ceo_id),
          ('IM',  cro_id),
          ('IM',  erd_dir),
          ('IM',  mrd_dir),
          ('IM',  ird_dir)
      ) AS v(division, uid)
     WHERE v.uid IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 7. Audit-trail marker so it's clear this was a restore, not a fresh seed.
    INSERT INTO management.activity_log (project_id, deliverable_id, actor_user_id, event_type, payload)
    VALUES (p_id, NULL, given_by_id, 'project_restore',
            jsonb_build_object('reason', 'accidental_delete', 'cycle_start', cycle_start));

    RAISE NOTICE 'restored PROJ-2026-002 with 7 deliverables, % team members + grace (T2)',
        (SELECT count(*) FROM management.team_members tm WHERE tm.team_id = _team_id);
END $$;
