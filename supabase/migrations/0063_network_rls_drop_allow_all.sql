-- ===========================================================================
-- 0063_network_rls_drop_allow_all.sql
-- Finish what 0060 started: remove the legacy wide-open policy on public.lns_*.
--
-- 0060 enabled RLS and added read-all / write-admin-management policies, but it
-- only dropped policies matching its OWN naming scheme (lns_<table>_read /
-- _insert / _update / _delete). The tables already carried a policy named
-- `allow_all`: PERMISSIVE, FOR ALL, TO public, USING (true).
--
-- Postgres OR's permissive policies together, so `allow_all` kept granting
-- everything and 0060's rules were dead weight. Verified after applying 0060:
-- an `analyst` JWT could still insert AND delete members, and so could `anon`.
-- The migration looked applied and changed nothing.
--
-- This drops `allow_all` on all five tables, leaving 0060's policies as the only
-- ones — read for anon + authenticated, write for admin/management via
-- public.lns_can_write().
--
-- Prerequisite already shipped: the network dashboard now sends the LBC session
-- JWT (network/dashboard/index.html), so admin/management writes still resolve.
-- Without that, every write would arrive as anon and be denied.
-- ===========================================================================

BEGIN;

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'lns_categories', 'lns_sectors', 'lns_members', 'lns_connections', 'lns_company_meta'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Guard: never drop the open policy unless 0060's replacement is present,
    -- otherwise this would silently lock the graph out of its own dashboard.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_read'
    ) THEN
      RAISE EXCEPTION
        'Refusing to drop allow_all on public.%: 0060_network_rls policies are missing. Apply 0060 first.', t;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS allow_all ON public.%I;', t);
  END LOOP;
END $$;

COMMIT;
