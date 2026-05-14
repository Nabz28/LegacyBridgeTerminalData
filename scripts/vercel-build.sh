#!/usr/bin/env bash
# Vercel production build for the multi-app repo.
#
# For each Vite-driven module (management, yggdrasil):
#   1. npm install + npm run build (produces dist/)
#   2. Strip source files we no longer need at runtime
#   3. Flatten dist/* up to the module root so /module/ resolves to
#      <module>/index.html directly via filesystem -- no rewrites needed.
#
# Reason for the flatten: Vercel's filesystem-vs-rewrite precedence with
# trailingSlash:true does NOT cleanly route /module/ -> /module/dist/
# index.html through rewrites. Serving the built index.html directly at
# the module root sidesteps the issue entirely.

set -euo pipefail

build_module () {
  local mod="$1"
  echo "=== Building $mod ==="
  cd "$mod"
  npm install
  npm run build

  # Drop source files that are useless post-build (Vite already inlined
  # everything into dist/). Keep package.json + package-lock.json so the
  # next deploy can use Vercel's npm cache.
  rm -rf src node_modules index.html vite.config.ts tsconfig*.json

  # Yggdrasil ships static run snapshots from public/data/; Vite already
  # copied them into dist/data/, so the source public/ can go too.
  rm -rf public

  # Flatten dist/* up to the module root. After this, /module/ resolves
  # to <mod>/index.html and /module/assets/* to <mod>/assets/*.
  cp -r dist/. .
  rm -rf dist

  cd ..
  echo "=== Done $mod ==="
}

build_module management
build_module yggdrasil
