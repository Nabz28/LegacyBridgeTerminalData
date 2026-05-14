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
    // Paid project — shared with Narin's website, but our schemas
    // (macro.*, correlation.*) are isolated from public.*.
    url:     'https://adnubucjlezrtusbicja.supabase.co',
    anonKey: 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',
    macroSchema:       'macro',
    correlationSchema: 'correlation'
  }
};
