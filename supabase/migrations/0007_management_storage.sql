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
