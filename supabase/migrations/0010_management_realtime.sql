-- Enable Supabase Realtime on the management.* tables.
--
-- Once published, any INSERT/UPDATE/DELETE on these tables fans out over the
-- `mgmt-realtime` channel (subscribed to from management/src/lib/realtime.ts)
-- and every open browser refreshes automatically. RLS still applies to the
-- pushed payloads, so anonymous users see nothing.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'projects',
            'deliverables',
            'deliverable_owners',
            'comments',
            'activity_log',
            'project_events',
            'project_event_attendees',
            'project_members',
            'project_approvers',
            'project_access',
            'teams',
            'team_members',
            'users'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE management.%I', t);
        EXCEPTION WHEN duplicate_object THEN
            -- Already in the publication; safe to ignore.
            NULL;
        END;
    END LOOP;
END;
$$;
