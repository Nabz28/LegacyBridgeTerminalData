// Legacy Bridge Terminal — unified static dev server.
//
// One Node process serves:
//   /                      → 302 to /launcher/
//   /launcher/*            → static files in launcher/
//   /macro/*               → static files in macro/        (the macro terminal)
//   /macro                 → 302 to /macro/dashboard/
//   /data/macro/*          → data-store/macro/*            (SQLite + curation batches)
//   /data/correlation/*    → data-store/correlation/*      (parquet matrices/returns — for tooling only)
//
// The Correlation Terminal is intentionally NOT served by Node — its frontend
// uses absolute `/static/*` and `/api/*` paths that only resolve under Flask.
// The launcher's correlation button opens http://127.0.0.1:5174/ in a new tab.
// Start Flask before clicking it:
//   python correlation/ui/backend/app.py
//
// The data-store path is configurable via:
//   1. --data-store=<path>     CLI arg
//   2. DATA_STORE_PATH         env var
//   3. .env at repo root with  DATA_STORE_PATH=...
//   4. ../data-store           sibling of repo (default)
//
// Usage:
//   node scripts/serve.js [port]                       (default 4173)
//   node scripts/serve.js 4173 --data-store=../data-store

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
let port = 4173;
let cliDataStore = null;
args.forEach(function (a) {
  if (a.startsWith('--data-store=')) cliDataStore = a.slice('--data-store='.length);
  else if (a.startsWith('--port=')) port = Number(a.slice('--port='.length));
  else if (/^\d+$/.test(a)) port = Number(a);
});

function readDotEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) return;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
  return out;
}

const dotEnv = readDotEnv();
const dataStoreRoot = path.resolve(
  ROOT,
  cliDataStore
    || process.env.DATA_STORE_PATH
    || dotEnv.DATA_STORE_PATH
    || '../data-store'
);

if (!fs.existsSync(dataStoreRoot)) {
  console.warn('[serve] WARNING: data-store not found at ' + dataStoreRoot);
  console.warn('[serve] Set DATA_STORE_PATH in .env or pass --data-store=<path>.');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.sqlite': 'application/vnd.sqlite3',
  '.parquet': 'application/octet-stream'
};

function send(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
  res.end(body);
}

function streamFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveFromBase(base, rel, res) {
  const filePath = path.normalize(path.join(base, rel));
  if (!filePath.startsWith(base)) { send(res, 403, 'Forbidden'); return; }
  fs.stat(filePath, function (statErr, stat) {
    if (statErr || !stat.isFile()) { send(res, 404, 'Not found: ' + rel); return; }
    streamFile(res, filePath);
  });
}

http.createServer(function (req, res) {
  try {
    const url = new URL(req.url, 'http://' + req.headers.host);
    let pathname = decodeURIComponent(url.pathname);

    // Root → launcher
    if (!pathname || pathname === '/') {
      res.writeHead(302, { Location: '/launcher/' }); res.end(); return;
    }
    // Convenience redirects
    if (pathname === '/macro' || pathname === '/macro/') {
      res.writeHead(302, { Location: '/macro/dashboard/' }); res.end(); return;
    }
    // Correlation now ships as a static Supabase-driven app; serve it from
    // the filesystem. The Flask backend still exists for local-only compute
    // (custom subset, PCA) but isn't required — the static UI works on its own.
    if (pathname === '/correlation' || pathname === '/correlation/') {
      res.writeHead(302, { Location: '/correlation/ui/static/' }); res.end(); return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';

    // /data/macro/* and /data/correlation/* → external data-store
    if (pathname.startsWith('/data/macro/')) {
      return serveFromBase(path.join(dataStoreRoot, 'macro'),
                           pathname.slice('/data/macro/'.length), res);
    }
    if (pathname.startsWith('/data/correlation/')) {
      return serveFromBase(path.join(dataStoreRoot, 'correlation'),
                           pathname.slice('/data/correlation/'.length), res);
    }
    // Legacy macro path (pre-restructure dashboards may still ask for /data/<cc>.sqlite)
    if (pathname.startsWith('/data/')) {
      return serveFromBase(path.join(dataStoreRoot, 'macro'),
                           pathname.slice('/data/'.length), res);
    }

    // Anything else → repo root (matches /launcher/, /macro/, /correlation/, /supabase/)
    return serveFromBase(ROOT, pathname.replace(/^\//, ''), res);
  } catch (err) {
    send(res, 500, err.message || String(err));
  }
}).listen(port, '127.0.0.1', function () {
  console.log('Legacy Bridge Terminal — http://127.0.0.1:' + port + '/');
  console.log('  Macro Terminal       → http://127.0.0.1:' + port + '/macro/dashboard/');
  console.log('  Correlation Terminal → http://127.0.0.1:5174/   (Flask, start separately)');
  console.log('  Data store           → ' + dataStoreRoot);
  console.log('');
  console.log('Start the correlation Flask backend before clicking its launcher link:');
  console.log('  python correlation/ui/backend/app.py');
});
