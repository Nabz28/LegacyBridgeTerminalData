// Public, deploy-time config for the Vercel build.
// Loaded by /network/dashboard/index.html. Optionally overridden by
// js/config.js (gitignored) for local dev.
//
// IMPORTANT: only values that are SAFE TO PUBLISH go here. The Supabase
// publishable key (`sb_publishable_*`) is designed to be client-visible —
// it's enforced by Row Level Security on the database side, not by hiding
// the key. NEVER put an `sb_secret_*` / service_role key in this file.
//
// Network shares its Supabase project with the Management Terminal
// (ohbzrlobkjtbmukqthdu). Same auth-login Edge Function, same JWT signing
// secret, same PostgREST instance — so the same JWT works for both modules
// and for the lns_* tables. See supabase/migrations/0014_network_schema.sql.

window.LBC_NETWORK_CONFIG = {
  supabase: {
    url:     'https://ohbzrlobkjtbmukqthdu.supabase.co',
    anonKey: 'sb_publishable_V6CYOsEiXLO1Sz0TL4nH4A_uEOTuO2y'
  }
};
