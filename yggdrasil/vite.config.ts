import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Module 04 inside the Legacy Bridge Terminal multi-app.
// Served from `/yggdrasil/` in production via vercel.json rewrites.
// Static-only viewer: reads pre-baked tree snapshots from /yggdrasil/data/
// (bundled at build time via public/data/). No backend.
export default defineConfig({
  base: "/yggdrasil/",
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
