-- 0049_macro_news_impact.sql
-- Enrich macro.news for the revamped news panel:
--   affects     — market-impact breakdown [{label, dir (+1/-1/0), note}]
--   analysis    — stronger 2-3 sentence transmission read ("where it leads")
--   importance  — high | med | low (drives sort + visual weight)
-- (ts already holds the published timestamp; source/url already exist.)
-- Idempotent.

alter table macro.news add column if not exists affects     jsonb default '[]'::jsonb;
alter table macro.news add column if not exists analysis    text;
alter table macro.news add column if not exists importance  text default 'med';
