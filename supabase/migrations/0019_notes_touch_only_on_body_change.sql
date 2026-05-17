-- 0019: Note "· edited" badge should reflect a real body edit, not a pin or
-- recolor. The original trg_notes_touch fired on EVERY UPDATE, so pinning or
-- changing a note's colour bumped updated_at and the UI (which shows "edited"
-- when updated_at != created_at) falsely flagged the note as edited.
--
-- Fix: only touch updated_at when the body column actually changes. Pin and
-- colour updates now leave updated_at == created_at, so the badge is accurate.

DROP TRIGGER IF EXISTS trg_notes_touch ON management.deliverable_notes;

CREATE TRIGGER trg_notes_touch
    BEFORE UPDATE ON management.deliverable_notes
    FOR EACH ROW
    WHEN (OLD.body IS DISTINCT FROM NEW.body)
    EXECUTE FUNCTION management.touch_updated_at();
