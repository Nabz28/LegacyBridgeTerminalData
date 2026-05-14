import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// `base` ensures asset URLs in the built HTML reference `/management/...` so
// the bundle works behind the Vercel rewrite that points `/management/*` at
// `management/dist/*`. Adjust only if the public mount path changes.
export default defineConfig({
    plugins: [react()],
    base: "/management/",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        sourcemap: false,
        target: "es2020",
    },
    server: {
        // 5180 to avoid colliding with the correlation Flask backend on 5174.
        // strictPort errors out instead of silently falling back, so you always
        // know exactly which port to hit in the browser.
        port: 5180,
        strictPort: true,
    },
});
