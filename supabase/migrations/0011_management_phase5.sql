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
