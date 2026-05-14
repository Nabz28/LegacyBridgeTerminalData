// Public, deploy-time config for the Vercel build.
// Loaded when `config.js` (local override, gitignored) is absent.
//
// IMPORTANT: only values that are SAFE TO PUBLISH go here. The Supabase
// publishable key (`sb_publishable_*`) is designed to be client-visible —
// it's enforced by Row Level Security on the database side, not by hiding
// the key. Never put a `sb_secret_*` key in this file.

window.MACROTERM_CONFIG = {
  dataSource: 'supabase',

  sqlite: {
    // Unused in Vercel deploys — kept so the file works locally too.
    baseUrl: '/data/macro'
  },

  supabase: {
    url:     'https://pkthsteoflatyppwduqu.supabase.co',
    anonKey: 'sb_publishable_t53sdIf9bpuOGurMHinfgA_fomWtRGq',
    macroSchema:       'macro',
    correlationSchema: 'correlation'
  }
};
