// Copy this file to `dashboard/js/config.js` and edit for your environment.
// `config.js` is gitignored so per-environment values never get committed.
//
// dataSource:
//   'sqlite'   — read /data/macro/<country>.sqlite (default, local dev). The
//                static server in scripts/serve.js maps /data/macro/* to the
//                <DATA_STORE_PATH>/macro/ folder configured in .env.
//   'supabase' — read from a Supabase Postgres project via @supabase/supabase-js.
//                The dashboard pulls the supabase JS client from a CDN at runtime.

window.MACROTERM_CONFIG = {
  dataSource: 'sqlite',

  sqlite: {
    // /data/macro/ → <DATA_STORE_PATH>/macro/ on disk (configured in repo .env).
    baseUrl: '/data/macro'
  },

  supabase: {
    url:     '',
    anonKey: '',
    // Postgres schema names — match the SQL migrations.
    macroSchema:       'macro',
    correlationSchema: 'correlation'
  }
};
