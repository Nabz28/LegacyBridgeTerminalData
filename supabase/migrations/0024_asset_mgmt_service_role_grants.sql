-- The am-marks edge function writes asset_mgmt.quotes / fx_rates /
-- nav_snapshots with the service role, but 0011 only granted the schema to
-- `authenticated`. Grant the service role too (it bypasses RLS but still
-- needs schema USAGE + table privileges). Idempotent.

grant usage on schema asset_mgmt to service_role;
grant select, insert, update, delete on all tables in schema asset_mgmt to service_role;
alter default privileges in schema asset_mgmt
  grant select, insert, update, delete on tables to service_role;

notify pgrst, 'reload schema';
