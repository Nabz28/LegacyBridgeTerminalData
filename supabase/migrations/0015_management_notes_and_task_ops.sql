-- 0015 -- Notes feature + richer task customization.
--
-- 1. `management.deliverable_notes`: a dedicated, separately-listable
--    place for important per-deliverable notes. NOT the same as
--    management.comments (which is the chat-style discussion thread).
--    Each note can be pinned, colour-coded, and edited/deleted by its
--    author (or by admin/management).
--
-- 2. `management.deliverables.description`: a richer free-text field
--    so a CUSTOM-kind task can carry a paragraph of context, not just
--    a one-line title. Optional, NULL-tolerant, no UI is required.
--
-- 3. Adds deliverable_notes to the supabase_realtime publication so
--    edits propagate across browsers.
--
-- Idempotent: every CREATE / ADD uses IF NOT EXISTS / safe re-run guards.

-- ---------- 1. deliverable_notes ----------
CREATE TABLE IF NOT EXISTS management.deliverable_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id  UUID NOT NULL REFERENCES management.deliverables(id) ON DELETE CASCADE,
    author_user_id  UUID REFERENCES management.users(id) ON DELETE SET NULL,
    body            TEXT NOT NULL,
    pinned          BOOLEAN NOT NULL DEFAULT FALSE,
    color           TEXT
                    CHECK (color IS NULL OR color IN ('yellow','pink','blue','green','red','gray')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_notes_deliverable
    ON management.deliverable_notes (deliverable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverable_notes_pinned
    ON management.deliverable_notes (deliverable_id) WHERE pinned;

ALTER TABLE management.deliverable_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mgmt_notes_read ON management.deliverable_notes;
CREATE POLICY mgmt_notes_read
    ON management.deliverable_notes
    FOR SELECT TO authenticated USING (true);

GRANT SELECT ON management.deliverable_notes TO authenticated;
GRANT ALL    ON management.deliverable_notes TO service_role;

-- updated_at trigger so 'last edited' badges work in the UI.
DROP TRIGGER IF EXISTS trg_notes_touch ON management.deliverable_notes;
CREATE TRIGGER trg_notes_touch
    BEFORE UPDATE ON management.deliverable_notes
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- Realtime publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE management.deliverable_notes;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- ---------- 2. deliverables.description ----------
ALTER TABLE management.deliverables
    ADD COLUMN IF NOT EXISTS description TEXT;

NOTIFY pgrst, 'reload schema';
