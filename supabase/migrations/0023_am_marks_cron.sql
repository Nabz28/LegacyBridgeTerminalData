-- Schedule the am-marks edge function daily so The Book's marks, FX rates,
-- and NAV snapshots refresh automatically (EOD). pg_cron fires net.http_post
-- (pg_net) at the function gateway. The anon publishable key is public-safe
-- and only routes the request — verify_jwt is off on the function.
-- 21:30 UTC ≈ after the US close; ~04:30 WIB next day. Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('am-marks-daily');
exception when others then null;
end $$;

select cron.schedule(
  'am-marks-daily',
  '30 21 * * 1-5',   -- 21:30 UTC, weekdays (after US close)
  $job$
    select net.http_post(
      url     := 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/am-marks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',
        'apikey', 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7'
      )
    );
  $job$
);
