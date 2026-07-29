-- ===========================================================================
-- 0060_network_rls.sql
-- Server-side write-authorization for the Network Terminal (Legacy Network System).
--
-- Background: the network dashboard previously wrote to public.lns_* tables with
-- the anon publishable key and only a client-side check, so any signed-in user
-- (indeed anyone who could reach the anon key) could add or delete members and
-- connections. The QA report flagged this. The dashboard now sends the LBC session
-- JWT (HS256-signed with Supabase's secret, so PostgREST accepts it and exposes
-- auth.jwt()). This migration enforces the rule server-side as the real backstop.
--
-- Rule:
--   * SELECT  — any caller (anon + authenticated). The graph is readable behind the
--               shared sign-in overlay; reads were never the concern.
--   * INSERT/UPDATE/DELETE — only JWTs whose `user_role` claim is admin or
--               management. (The finer "Director title" refinement stays in the
--               client; this is the coarse role gate.)
--
-- DEPLOYMENT NOTE: test with each role before relying on this. Confirm an admin can
-- still write and a read-tier account gets 403 on write and still sees the graph.
-- If writes break, the likely cause is the dashboard not sending the JWT (see the
-- sbClient creation in network/dashboard/index.html) or an expired token.
-- ===========================================================================
-- RENUMBERED 0056 -> 0060 (2026-07-29). Authored on a branch that was
-- never merged; meanwhile 0056 was taken on main by a MONITOR migration.
-- Content is unchanged from the original.

BEGIN;

-- helper: does the current JWT carry a write-privileged role?
CREATE OR REPLACE FUNCTION public.lns_can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'user_role')
      IN ('admin', 'management'),
    false
  );
$$;

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'lns_categories', 'lns_sectors', 'lns_members', 'lns_connections', 'lns_company_meta'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- read: everyone
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);',
      t || '_read', t
    );

    -- write: admin / management only (insert, update, delete)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.lns_can_write());',
      t || '_insert', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.lns_can_write()) WITH CHECK (public.lns_can_write());',
      t || '_update', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.lns_can_write());',
      t || '_delete', t
    );
  END LOOP;
END $$;

COMMIT;
