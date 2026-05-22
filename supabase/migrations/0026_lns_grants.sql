-- Network (lns_*) was migrated onto Narin's Plus (consolidated off the old
-- temp project) so it lives on the live project like every other module.
-- 0014/0014b/0014c create the tables + RLS allow_all; this grants the
-- PostgREST roles so the in-terminal native Network map (and the standalone
-- /network/ app) can read/write via the publishable key / lbc session.
-- Idempotent.

grant select, insert, update, delete on
  public.lns_categories, public.lns_sectors, public.lns_members,
  public.lns_connections, public.lns_company_meta
to anon, authenticated;

notify pgrst, 'reload schema';
