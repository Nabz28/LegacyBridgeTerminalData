#!/usr/bin/env node
/**
 * AISStream local WebSocket proxy
 * ───────────────────────────────
 * Run alongside the dashboard when a browser extension / wallet / AV / firewall
 * is killing the direct wss://stream.aisstream.io WebSocket (close code 1006
 * before the first frame).
 *
 * The proxy listens on ws://127.0.0.1:8123 and pipes frames bidirectionally
 * to the upstream AISStream server. Browser extensions cannot intercept
 * loopback (127.0.0.1) WebSockets, so the data path is clean.
 *
 * Usage
 * ─────
 *   $ node scripts/aisstream-proxy.js
 *
 * The terminal will print:
 *   [proxy] listening on ws://127.0.0.1:8123
 *   [proxy] proxying to wss://stream.aisstream.io/v0/stream
 *
 * Then hard-refresh the dashboard. The globe will auto-detect the proxy
 * and route live AIS through it. No further config required.
 *
 * Optional environment variables
 *   AIS_PROXY_PORT   default 8123
 *   AIS_UPSTREAM_URL default wss://stream.aisstream.io/v0/stream
 */

const http = require('http');
let WebSocket;
try { WebSocket = require('ws'); }
catch (err) {
  console.error('[proxy] missing dependency: ws');
  console.error('[proxy] install once with: npm install ws');
  console.error('[proxy] (a global install also works: npm install -g ws)');
  process.exit(1);
}

const PORT     = parseInt(process.env.AIS_PROXY_PORT || '8123', 10);
const UPSTREAM = process.env.AIS_UPSTREAM_URL || 'wss://stream.aisstream.io/v0/stream';

const server = http.createServer((req, res) => {
  // Tiny health endpoint so the browser can check the proxy is alive
  // without opening a WebSocket. CORS open since localhost only.
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, upstream: UPSTREAM }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AISStream proxy is running.\nWebSocket endpoint: ws://127.0.0.1:' + PORT + '\n');
});

const wss = new WebSocket.Server({ server });

let clientSeq = 0;
wss.on('connection', (client, req) => {
  const id = ++clientSeq;
  const remote = req.socket.remoteAddress;
  console.log('[proxy:' + id + '] client connected from', remote);

  let upstreamReady = false;
  const pendingFromClient = [];

  const upstream = new WebSocket(UPSTREAM, {
    handshakeTimeout: 10_000,
    // Some AIS upstreams care about Origin; AISStream does not, but set one
    // for transparency.
    origin: 'http://localhost',
  });

  // Hoisted so upstream.on('open') flush can use it
  const forwardToUpstream = (data, isBinary) => {
    if (isBinary) return upstream.send(data, { binary: true });
    return upstream.send(typeof data === 'string' ? data : data.toString('utf8'));
  };

  upstream.on('open', () => {
    upstreamReady = true;
    console.log('[proxy:' + id + '] upstream connected');
    // Flush any subscription messages that arrived before upstream was ready.
    while (pendingFromClient.length) {
      const m = pendingFromClient.shift();
      try { forwardToUpstream(m.data, m.isBinary); } catch (_) {}
    }
  });

  let frameCount = 0;
  upstream.on('message', (data, isBinary) => {
    frameCount++;
    if (frameCount === 1)   console.log('[proxy:' + id + '] first upstream frame · isBinary=' + isBinary);
    if (frameCount % 500 === 0) console.log('[proxy:' + id + ']', frameCount, 'frames piped');
    if (client.readyState !== WebSocket.OPEN) return;
    // AISStream payload is always JSON. Even though `ws` reports upstream
    // as binary, we always forward as a TEXT frame so the browser hands the
    // listener a string and `JSON.parse(ev.data)` works directly — no Blob /
    // ArrayBuffer / TextDecoder dance required client-side.
    const text = typeof data === 'string' ? data : data.toString('utf8');
    client.send(text);
  });

  upstream.on('close', (code, reason) => {
    console.log('[proxy:' + id + '] upstream closed · code', code, '· reason', reason.toString() || '(none)', '· frames', frameCount);
    try { client.close(); } catch (_) {}
  });

  upstream.on('error', (err) => {
    console.error('[proxy:' + id + '] upstream error:', err.message);
    try { client.close(); } catch (_) {}
  });

  client.on('message', (data, isBinary) => {
    if (upstreamReady && upstream.readyState === WebSocket.OPEN) {
      try { forwardToUpstream(data, isBinary); } catch (e) { console.error('[proxy:' + id + '] forward error:', e.message); }
    } else {
      // Buffer subscription messages until upstream finishes its handshake.
      pendingFromClient.push({ data, isBinary });
    }
  });

  client.on('close', () => {
    console.log('[proxy:' + id + '] client disconnected · frames piped:', frameCount);
    try { upstream.close(); } catch (_) {}
  });

  client.on('error', (err) => {
    console.error('[proxy:' + id + '] client error:', err.message);
    try { upstream.close(); } catch (_) {}
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('────────────────────────────────────────────────────────');
  console.log('  AISStream local proxy ready');
  console.log('  Listening:  ws://127.0.0.1:' + PORT);
  console.log('  Forwarding: ' + UPSTREAM);
  console.log('  Health:     http://127.0.0.1:' + PORT + '/health');
  console.log('────────────────────────────────────────────────────────');
  console.log('Hard-refresh the dashboard; the globe will detect this proxy automatically.');
});

process.on('SIGINT',  () => { console.log('\n[proxy] shutting down'); process.exit(0); });
process.on('SIGTERM', () => { console.log('[proxy] shutting down');   process.exit(0); });
