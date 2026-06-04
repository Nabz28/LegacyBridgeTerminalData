-- 0051_macro_news_scoring.sql
-- Standardized scoring infrastructure fields on macro.news.
--   surprise         — priced | partial | surprise (the surprise multiplier key)
--   score_components — audit trail of the deterministic score (raw, severity, ...)
-- (affects jsonb is reshaped to [{target,level,risk_sign,tier,weight,label,note}]
--  in-place; category already holds the 12-type key.)
alter table macro.news add column if not exists surprise         text;
alter table macro.news add column if not exists score_components jsonb;
