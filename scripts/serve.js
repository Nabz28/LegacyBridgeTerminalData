const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = Number(process.argv[2] || 4173);

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
  '.sqlite': 'application/vnd.sqlite3'
};

function send(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
  res.end(body);
}

http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (!pathname || pathname === '/') pathname = '/dashboard/index.html';
    const filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root)) {
      send(res, 403, 'Forbidden');
      return;
    }
    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        send(res, 404, 'Not found: ' + pathname);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) {
    send(res, 500, err.message || String(err));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Refinitiv Macro Terminal — http://127.0.0.1:${port}/`);
});
