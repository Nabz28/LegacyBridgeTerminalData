// Research Desk agent — secure server endpoint (Vercel serverless, Node).
// Call-compatible with /api/bridge from the terminal client: POST + Bearer LBC JWT.
//
// Endpoint: POST /api/research-agent
//   { messages:[{role:'user'|'assistant', content:string}, ...] }
//   -> { reply: string, charts?: [{series:[{label,points:[[date,value],...]}]}],
//        tool_trace: [{tool, args_summary}], usage, model }
//
// Auth gates EXACTLY like api/bridge.js: HS256 LBC_JWT (LBC_JWT_SECRET), then the
// subject must be an active management.users row. Tool loop + tools live in
// api/_research/core.js (shared with the Telegram bot).
//
// Env (set on Vercel): OPENROUTER_API_KEY, LBC_JWT_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Never logged, never echoed.

const crypto = require('crypto');
const core = require('./_research/core.js');

const JWT_SECRET = process.env.LBC_JWT_SECRET;

// ---------- JWT (HS256) — identical checks to api/bridge.js ----------
function verifyJwt(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('unsupported alg');     // reject alg-confusion / "none"
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(parts[0] + '.' + parts[1]).digest();
  const given = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (sig.length !== given.length || !crypto.timingSafeEqual(sig, given)) throw new Error('bad signature');
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const now = Date.now() / 1000;
  if (!payload.exp) throw new Error('token missing exp');                 // no eternal tokens
  if (now > payload.exp + 5) throw new Error('expired');
  if (payload.iat && now - payload.iat > 86400) throw new Error('token too old');  // cap stolen-token window
  return payload;
}

// user + owner lookups (30s TTL, same policy as bridge.js)
const _userCache = new Map();
let _ownersCache = null, _ownersAt = 0;
const CACHE_TTL = 30000;
async function loadUser(sub) {
  const e = _userCache.get(sub);
  if (e && Date.now() - e.at < CACHE_TTL) return e.u;
  const rows = await core.sb('/users?select=id,username,full_name,role,active&id=eq.' + encodeURIComponent(sub), { profile: 'management' });
  const u = rows && rows[0];
  _userCache.set(sub, { u, at: Date.now() });
  return u;
}
async function loadOwners() {
  if (_ownersCache && Date.now() - _ownersAt < CACHE_TTL) return _ownersCache;
  try {
    const rows = await core.sb('/bridge_config?select=value&key=eq.owners', { profile: 'brain' });
    _ownersCache = (rows && rows[0] && Array.isArray(rows[0].value)) ? rows[0].value : [];
  } catch (e) { _ownersCache = []; }
  _ownersAt = Date.now(); return _ownersCache;
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'POST only' })); }
  if (!core.hasEnv() || !JWT_SECRET) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'proxy not configured' })); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body) body = {};

  // auth — same token check as bridge.js
  let claims;
  try { claims = verifyJwt((req.headers.authorization || '').replace(/^Bearer\s+/i, '')); }
  catch (e) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'auth: ' + e.message })); }
  const sub = claims.sub || claims.user_id || claims.id;
  if (!sub) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'no subject in token' })); }

  let user, owners;
  try { [user, owners] = await Promise.all([loadUser(sub), loadOwners()]); }
  catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'lookup: ' + e.message })); }
  if (!user || user.active === false) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'unknown or inactive user' })); }
  const role = user.role || claims.user_role || 'analyst';
  const isOwner = owners.indexOf(sub) !== -1;
  const canSecret = isOwner || role === 'admin' || role === 'management';   // gates search_memory (brain), mirrors bridge tiering

  // sanitize the transcript: user/assistant text turns only, capped
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    res.statusCode = 400; return res.end(JSON.stringify({ error: 'messages must end with a user turn' }));
  }

  try {
    const out = await core.runAgent(messages, { canSecret });
    core.logAgent('research-agent', out, null);                     // best-effort, non-blocking failure mode
    const resp = { reply: out.reply, tool_trace: out.tool_trace, usage: out.usage, model: out.model };
    if (out.charts && out.charts.length) resp.charts = out.charts;
    res.statusCode = 200; return res.end(JSON.stringify(resp));
  } catch (e) {
    core.logAgent('research-agent', null, e.message);
    res.statusCode = 502; return res.end(JSON.stringify({ error: 'agent failed: ' + String(e.message || e).slice(0, 300) }));
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
