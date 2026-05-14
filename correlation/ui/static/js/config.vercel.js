// Public, deploy-time config for the correlation terminal.
// Loaded when `config.js` (local override, gitignored) is absent.
//
// Vercel mode: pulls correlation data straight from Supabase Postgres.
//   - Templates + series_meta come from static JSON shipped in this folder.
//   - Pair detail + rolling correlation come from RPC (correlation.pair_stats,
//     correlation.rolling_corr).
//   - Custom subset compute + PCA require the local Flask backend.
//
// Only sb_publishable_* keys go here. Never put sb_secret_* in client code.

window.CORRTERM_CONFIG = {
  dataSource: 'supabase',

  supabase: {
    // Paid project — shared with Narin's website, but our schemas
    // (macro.*, correlation.*) are isolated from public.*.
    url:                'https://adnubucjlezrtusbicja.supabase.co',
    anonKey:            'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',
    correlationSchema:  'correlation',
  },
};
