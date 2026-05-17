-- 0018 -- Re-expand v_deliverable_status so it includes the columns added
--         after migration 0005.
--
-- THE BUG: 0005 created the view as `SELECT d.*, ...`. Postgres expands
-- `*` to an explicit column list AT VIEW-CREATION TIME and freezes it.
-- Columns added to management.deliverables in later migrations were
-- therefore invisible through the view:
--
--   0011  responsible_divisions TEXT[]
--   0015  description           TEXT
--   0016  start_date            DATE
--
-- The Project Tab + Fleet read deliverables exclusively through
-- v_deliverable_status, so the UI never saw start_date / description /
-- the real responsible_divisions array even though the Edge Function
-- wrote them correctly. That's why "set start date" looked broken.
--
-- CREATE OR REPLACE VIEW re-runs the `d.*` expansion against the CURRENT
-- table shape, so all present + future-at-this-point columns are exposed.
-- Idempotent and safe -- the view contract only ever grows.

-- CREATE OR REPLACE can only APPEND view columns; the new base-table
-- columns land mid-list (table column order), which it rejects with
-- "cannot change name of view column". v_deliverable_status is a leaf
-- view (only PostgREST/clients read it; nothing in the DB depends on
-- it), so a DROP + CREATE is safe and has no cascade fallout.
DROP VIEW IF EXISTS management.v_deliverable_status;

CREATE VIEW management.v_deliverable_status AS
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

-- The view's SELECT privilege survives CREATE OR REPLACE, but re-grant
-- defensively in case this runs on a project where it was revoked.
GRANT SELECT ON management.v_deliverable_status TO authenticated;

NOTIFY pgrst, 'reload schema';
