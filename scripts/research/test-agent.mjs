#!/usr/bin/env node
// Test harness for /api/research-agent and /api/research-bot.
//
//   node scripts/research/test-agent.mjs
//
// Modes:
//   MOCK (default): if SUPABASE_SERVICE_ROLE_KEY / OPENROUTER_API_KEY / LBC_JWT_SECRET
//     are absent, fake values are injected BEFORE import (the modules read env at load).
//     Verifies: module load, method gate, auth rejection paths, pure helpers.
//   LIVE: if the real env vars are present, additionally runs a real agent question.
//     A live authed run also needs LBC_TEST_USER_SUB (an active management.users id)
//     to mint a JWT. Secrets are never printed.
//
// Exit code 0 = all pass.

import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mod = (...p) => pathToFileURL(path.join(ROOT, ...p)).href;

const LIVE = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPENROUTER_API_KEY && process.env.LBC_JWT_SECRET);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
if (!process.env.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = 'mock-openrouter-key';
if (!process.env.LBC_JWT_SECRET) process.env.LBC_JWT_SECRET = 'mock-jwt-secret';
const JWT_SECRET = process.env.LBC_JWT_SECRET;

// import AFTER env is set (modules capture env at module scope, like api/bridge.js)
const agent = (await import(mod('api', 'research-agent.js'))).default;
const bot = (await import(mod('api', 'research-bot.js'))).default;
const core = (await import(mod('api', '_research', 'core.js'))).default;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

function mockRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = (s) => { r.body = s; r._done = true; };
  return r;
}
async function invoke(handler, req) {
  const res = mockRes();
  await handler(req, res);
  let json = null; try { json = JSON.parse(res.body); } catch { /* not json */ }
  return { status: res.statusCode, json, raw: res.body };
}
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function signJwt(payload, secret) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(h + '.' + p).digest();
  return h + '.' + p + '.' + b64url(sig);
}

// ---------- 1. pure helpers (no network) ----------
const I = core._internal;
check('pctile: median of 1..100 is ~50', I.pctile(Array.from({ length: 100 }, (_, i) => i + 1), 50) === 50);
check('pctile: max is 100', I.pctile([1, 2, 3], 3) === 100);
check('pearson: perfect positive corr = 1', I.pearson(Array.from({ length: 30 }, (_, i) => i), Array.from({ length: 30 }, (_, i) => 2 * i + 5)) === 1);
check('pearson: <10 points -> null', I.pearson([1, 2], [2, 4]) === null);
const ds = I.downsample(Array.from({ length: 1000 }, (_, i) => ['d' + i, i]), 200);
check('downsample: <=200 points, keeps last', ds.length <= 200 && ds[ds.length - 1][1] === 999);
check('isSeriesKey: us.rate.dgs10 -> series', I.isSeriesKey('us.rate.dgs10') === true);
check('isSeriesKey: cmd.gold -> series', I.isSeriesKey('cmd.gold') === true);
check('isSeriesKey: BBCA.JK -> ticker', I.isSeriesKey('BBCA.JK') === false);
check('isSeriesKey: ^GSPC -> ticker', I.isSeriesKey('^GSPC') === false);
const chunks = I.splitText('line\n'.repeat(2000), 4000);
check('splitText: all chunks <= 4000', chunks.every((c) => c.length <= 4000) && chunks.join('').replace(/\n/g, '').length === 'line'.repeat(2000).length);
check('seriesReturns: pct when positive', Math.abs(I.seriesReturns([100, 110])[0] - 0.1) < 1e-9);
check('seriesReturns: diffs when zero present', I.seriesReturns([0, 5, 3]).join(',') === '5,-2');

// ---------- 2. research-agent: method + auth gates (mirror bridge.js) ----------
{
  const r = await invoke(agent, { method: 'GET', headers: {}, body: null });
  check('agent: GET -> 405', r.status === 405, r.raw);
}
{
  const r = await invoke(agent, { method: 'POST', headers: {}, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent: no token -> 401', r.status === 401 && /auth:/.test((r.json && r.json.error) || ''), r.raw);
}
{
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer not.a.jwt' }, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent: garbage token -> 401', r.status === 401, r.raw);
}
{
  const bad = signJwt({ sub: 'x', exp: Math.floor(Date.now() / 1000) + 600 }, 'wrong-secret');
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer ' + bad }, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent: wrong-secret token -> 401 bad signature', r.status === 401 && /signature/.test((r.json && r.json.error) || ''), r.raw);
}
{
  const expired = signJwt({ sub: 'x', exp: Math.floor(Date.now() / 1000) - 600 }, JWT_SECRET);
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer ' + expired }, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent: expired token -> 401', r.status === 401 && /expired/.test((r.json && r.json.error) || ''), r.raw);
}
{
  const noExp = signJwt({ sub: 'x' }, JWT_SECRET);
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer ' + noExp }, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent: token missing exp -> 401', r.status === 401 && /exp/.test((r.json && r.json.error) || ''), r.raw);
}
if (!LIVE) {
  // valid signature but mock Supabase creds: must pass auth then fail at user lookup (500), same order as bridge.js
  const ok = signJwt({ sub: '00000000-0000-0000-0000-000000000000', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer ' + ok }, body: { messages: [{ role: 'user', content: 'hi' }] } });
  check('agent(mock): valid token passes auth, fails at lookup -> 500', r.status === 500 && /lookup:/.test((r.json && r.json.error) || ''), r.raw);
}

// ---------- 3. research-bot: method gate + config path ----------
{
  const r = await invoke(bot, { method: 'GET', headers: {}, body: null });
  check('bot: GET -> 405', r.status === 405, r.raw);
}
{
  const update = { update_id: 1, message: { message_id: 1, from: { id: 12345, is_bot: false, first_name: 'T' }, chat: { id: 12345, type: 'private' }, text: '/id' } };
  const r = await invoke(bot, { method: 'POST', headers: {}, body: update });
  if (LIVE) {
    // real Supabase: either no vault token yet ({ok:false,reason:'no token'}) or a real path; must always be 200
    check('bot(live): webhook POST -> 200', r.status === 200 && r.json && typeof r.json.ok === 'boolean', r.raw);
    console.log('      bot response: ' + r.raw);
  } else {
    check('bot(mock): webhook POST -> 200 config error (never 5xx to Telegram)', r.status === 200 && r.json && r.json.ok === false, r.raw);
  }
}

// ---------- 4. live agent run (real env + a real user sub only) ----------
if (LIVE && process.env.LBC_TEST_USER_SUB) {
  const tok = signJwt({ sub: process.env.LBC_TEST_USER_SUB, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 }, JWT_SECRET);
  const r = await invoke(agent, { method: 'POST', headers: { authorization: 'Bearer ' + tok }, body: { messages: [{ role: 'user', content: 'How fresh are the research pipelines right now?' }] } });
  check('agent(live): answered 200 with reply + tool_trace', r.status === 200 && r.json && typeof r.json.reply === 'string' && Array.isArray(r.json.tool_trace), r.raw && r.raw.slice(0, 300));
  if (r.json && r.json.reply) {
    console.log('      tools used: ' + JSON.stringify((r.json.tool_trace || []).map((t) => t.tool)));
    console.log('      reply: ' + r.json.reply.slice(0, 500));
  }
} else if (LIVE) {
  console.log('note: LIVE env present but LBC_TEST_USER_SUB not set; skipped the live agent question.');
} else {
  console.log('note: mock mode (no real SUPABASE/OPENROUTER/JWT env); live agent question skipped.');
}

console.log(`\n${pass} passed, ${fail} failed (${LIVE ? 'LIVE' : 'MOCK'} mode)`);
// no process.exit(): let undici keep-alive sockets drain (hard exit trips a libuv
// assertion on Windows); the process ends on its own with this code.
process.exitCode = fail ? 1 : 0;
