// Public, deploy-time config for the Vercel build.
// Loaded by /network/dashboard/index.html. Optionally overridden by
// js/config.js (gitignored) for local dev.
//
// IMPORTANT: only values that are SAFE TO PUBLISH go here. The Supabase
// publishable key (`sb_publishable_*`) is designed to be client-visible —
// it's enforced by Row Level Security on the database side, not by hiding
// the key. NEVER put an `sb_secret_*` / service_role key in this file.
//
// Network runs on the shared "Narin's Plus" Supabase project
// (adnubucjlezrtusbicja) — the same project the launcher shell, Macro,
// Asset-Mgmt and Management use. The lns_* tables (public schema, allow_all
// RLS) were migrated here from the old decommission-bound temp project
// (ohbzrlobkjtbmukqthdu) via scripts/copy-lns-to-narins.js; this repoints the
// app at that copy. Publishable key only — RLS-gated, never an sb_secret_*.
// See supabase/migrations/0014_network_schema.sql (+ 0014b/0014c, 0026 grants).

window.LBC_NETWORK_CONFIG = {
  supabase: {
    url:     'https://adnubucjlezrtusbicja.supabase.co',
    anonKey: 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7'
  }
};
