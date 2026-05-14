// Copy to `config.js` (gitignored) to override the public config.
// Set dataSource='flask' for local mode with the Python backend on :5174,
// or fill in supabase.url / anonKey to point at your own project.

window.CORRTERM_CONFIG = {
  dataSource: 'flask',   // 'flask' | 'supabase'

  supabase: {
    url:                '',
    anonKey:            '',
    correlationSchema:  'correlation',
  },
};
