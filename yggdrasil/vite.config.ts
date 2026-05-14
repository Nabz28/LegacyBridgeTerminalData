import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Module 04 inside the Legacy Bridge Terminal multi-app.
// Served from /yggdrasil/ in production via vercel.json + scripts/vercel-build.sh.
// Static-only viewer: every endpoint pre-baked to /yggdrasil/data/api/*.json
// by `python scripts/dump_terminal_static.py` in the standalone Yggdrasil
// Framework repo. No backend at runtime.
export default defineConfig({
  base: '/yggdrasil/',
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
