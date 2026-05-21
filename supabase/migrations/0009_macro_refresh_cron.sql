-- Schedule the macro-refresh edge function to run daily, so the live macro
-- dashboard "updates everyday". pg_cron fires net.http_post (pg_net) at the
-- function gateway. The anon publishable key is public-safe (already shipped
-- in the browser bundle) and only routes the request — verify_jwt is off.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop any prior schedule of the same name before re-creating.
do $$
begin
  perform cron.unschedule('macro-refresh-daily');
exception when others then null;
end $$;

select cron.schedule(
  'macro-refresh-daily',
  '0 6 * * *',   -- 06:00 UTC daily (~13:00 WIB)
  $job$
    select net.http_post(
      url     := 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/macro-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',
        'apikey', 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7'
      )
    );
  $job$
);
