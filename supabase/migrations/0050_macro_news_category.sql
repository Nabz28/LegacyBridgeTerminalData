-- 0050_macro_news_category.sql
-- News "type" dimension for the second filter (region -> type).
-- category in: monetary | inflation | growth | markets | fx | commodities
--              | geopolitics | fiscal | banking | trade | other
alter table macro.news add column if not exists category text default 'other';
create index if not exists macro_news_category_idx on macro.news (category, ts desc);
