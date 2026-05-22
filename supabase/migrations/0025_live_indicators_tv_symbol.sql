-- Add tv_symbol to macro.live_indicators so market cards (commodities/FX/
-- indices/crypto) can open the TradingView live chart in the detail modal.
-- Additive + idempotent.

alter table macro.live_indicators add column if not exists tv_symbol text;

notify pgrst, 'reload schema';
