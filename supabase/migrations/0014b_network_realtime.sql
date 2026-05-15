-- 0014b -- Add lns_* tables to the supabase_realtime publication so the
-- Network Terminal gets live INSERT/UPDATE/DELETE pushes across browsers.
-- Idempotent: each ALTER PUBLICATION is wrapped in an exception handler
-- so re-running on a project that already has the table in the publication
-- is a no-op.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'lns_categories',
        'lns_sectors',
        'lns_members',
        'lns_connections',
        'lns_company_meta'
    ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN duplicate_object THEN
            NULL;  -- already in the publication
        END;
    END LOOP;
END $$;
