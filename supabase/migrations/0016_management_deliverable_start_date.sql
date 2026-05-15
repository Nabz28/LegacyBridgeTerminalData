-- 0016 -- start_date on deliverables.
--
-- Until now a deliverable was a single-point milestone (`due_date` only).
-- Real tasks span a range: "from May 14 to May 19". Adding a nullable
-- start_date lets each Gantt bar render as a range; rows without a
-- start_date keep their existing milestone look (a single bar at due).
--
-- A CHECK constraint enforces start_date <= due_date so the UI never
-- has to deal with inverted ranges. Idempotent: ADD COLUMN IF NOT
-- EXISTS, constraint guarded by name-existence.

ALTER TABLE management.deliverables
    ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add the ordering constraint only if it doesn't already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'management.deliverables'::regclass
          AND conname  = 'deliverables_start_before_due'
    ) THEN
        ALTER TABLE management.deliverables
            ADD CONSTRAINT deliverables_start_before_due
            CHECK (start_date IS NULL OR start_date <= due_date);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
