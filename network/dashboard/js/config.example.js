// Copy this file to `dashboard/js/config.js` and edit for local dev.
// `config.js` is gitignored so per-environment values never get committed.
//
// At runtime, index.html loads config.vercel.js first (public defaults
// committed in the repo) and then config.js if present (local override).
// On Vercel, config.js 404s harmlessly and config.vercel.js values stand.

window.LBC_NETWORK_CONFIG = {
  supabase: {
    // Override only if you want to point at a different Supabase project
    // (e.g. a personal sandbox). Leaving these empty falls back to whatever
    // config.vercel.js sets.
    url:     '',
    anonKey: ''
  }
};
