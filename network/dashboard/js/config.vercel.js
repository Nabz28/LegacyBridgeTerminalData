// Public, deploy-time config for the Vercel build.
// Loaded by /network/dashboard/index.html. Optionally overridden by
// js/config.js (gitignored) for local dev.
//
// IMPORTANT: only values that are SAFE TO PUBLISH go here. The Supabase
// publishable key (`sb_publishable_*`) is designed to be client-visible —
// it's enforced by Row Level Security on the database side, not by hiding
// the key. NEVER put an `sb_secret_*` / service_role key in this file.
//
// Same Supabase project as macro/correlation/management — tables live in
// public.lns_* (see supabase/migrations/0013_network_schema.sql).

window.LBC_NETWORK_CONFIG = {
  supabase: {
    url:     'https://adnubucjlezrtusbicja.supabase.co',
    anonKey: 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7'
  }
};
