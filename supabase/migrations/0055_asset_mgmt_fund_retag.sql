-- ============================================================
-- 0055_asset_mgmt_fund_retag — fix mis-tagged Asset Management data.
--
-- Bug: two custodian PLATFORMS ('stockbit' IDR, 'pluang' USD) were
-- inserted into asset_mgmt.funds as if they were funds, and all the
-- existing trades/positions/cash/NAV were tagged with those platform
-- names in `fund_id` instead of the real fund 'asset_mgmt'. The fund
-- switcher only offers asset_mgmt | quant_fund | all, so the data only
-- ever showed under "All Funds".
--
-- Fix: move the custody info into the proper `platform` column, re-tag
-- every row to fund_id='asset_mgmt', collapse the duplicated NAV
-- snapshots (both already USD-normalised) into one combined series, and
-- remove the bogus platform-as-fund rows.
--
-- Idempotent: safe to re-run (no-op once stockbit/pluang funds are gone).
-- ============================================================

-- 1) Preserve custodian: backfill platform from the mis-used fund_id ------
update asset_mgmt.positions   set platform = fund_id
  where fund_id in ('stockbit','pluang') and platform is null;
update asset_mgmt.trades      set platform = fund_id
  where fund_id in ('stockbit','pluang') and platform is null;
update asset_mgmt.cash_ledger set platform = fund_id
  where fund_id in ('stockbit','pluang') and platform is null;

-- 2) Re-tag row-level tables to the real fund ----------------------------
update asset_mgmt.positions   set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.trades      set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.cash_ledger set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');

-- (defensive — these were empty, but re-tag any future strays) -----------
update asset_mgmt.ideas             set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.intel_log         set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.research_requests set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.restrictions      set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');
update asset_mgmt.watchlists        set fund_id = 'asset_mgmt' where fund_id in ('stockbit','pluang');

-- 3) NAV snapshots: two platform rows per date -> one combined fund row ---
--    (stockbit + pluang NAVs are both USD-normalised, so sum is valid)
insert into asset_mgmt.nav_snapshots (fund_id, as_of, nav, cash, positions_value)
select 'asset_mgmt', as_of, sum(nav), sum(cash), sum(positions_value)
from asset_mgmt.nav_snapshots
where fund_id in ('stockbit','pluang')
group by as_of
on conflict (fund_id, as_of) do update
  set nav             = excluded.nav,
      cash            = excluded.cash,
      positions_value = excluded.positions_value;

delete from asset_mgmt.nav_snapshots where fund_id in ('stockbit','pluang');

-- 4) Drop the bogus platform-as-fund rows so the mistake can't recur -----
delete from asset_mgmt.funds where id in ('stockbit','pluang');

notify pgrst, 'reload schema';
