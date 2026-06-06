// Bridge Copilot — secure server proxy (Vercel serverless, Node).
// Holds the OpenRouter key; verifies the LBC JWT (HS256 legacy secret); resolves
// the caller's role from management.users; runs the model turn and executes
// data.* / write.* tools server-side (service role, owner-gated, audited).
// ui.* tools are NOT executed here — they run in the browser.
//
// Endpoint: POST /api/bridge
//   { mode:'chat', messages:[...], model? }  -> { message, usage, role, owner }
//   { mode:'tool', tool:'data.x'|'write.x', args:{...} } -> { result } | { error }
//
// Env (set on Vercel): OPENROUTER_API_KEY, LBC_JWT_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const crypto = require('crypto');

const SB_URL = process.env.SUPABASE_URL || 'https://adnubucjlezrtusbicja.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.LBC_JWT_SECRET;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

module.exports.config = { maxDuration: 60 };

// ---------- JWT (HS256) ----------
function b64url(buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function verifyJwt(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('unsupported alg');     // reject alg-confusion / "none"
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(parts[0] + '.' + parts[1]).digest();
  const given = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (sig.length !== given.length || !crypto.timingSafeEqual(sig, given)) throw new Error('bad signature');
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (payload.exp && Date.now() / 1000 > payload.exp + 5) throw new Error('expired');
  return payload;
}

// ---------- Supabase REST (service role) ----------
async function sb(path, opts = {}) {
  const { method = 'GET', body, profile = 'public', prefer } = opts;
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Accept-Profile': profile };
  if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Profile'] = profile; }
  if (prefer) headers['Prefer'] = prefer;
  const r = await fetch(SB_URL + '/rest/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ': ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}

async function loadConfig() {
  const rows = await sb('/bridge_config?select=key,value', { profile: 'brain' });
  const c = {}; for (const r of rows) c[r.key] = r.value; return c;
}
async function loadUser(sub) {
  const rows = await sb('/users?select=id,username,full_name,role,active&id=eq.' + encodeURIComponent(sub), { profile: 'management' });
  return rows && rows[0];
}
async function audit(row) { try { await sb('/ai_audit', { method: 'POST', profile: 'brain', body: [row], prefer: 'return=minimal' }); } catch (e) {} }
async function bumpUsage(userId, tokens) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const cur = await sb(`/ai_usage?user_id=eq.${userId}&day=eq.${day}&select=tokens,requests`, { profile: 'brain' });
    if (cur && cur[0]) await sb(`/ai_usage?user_id=eq.${userId}&day=eq.${day}`, { method: 'PATCH', profile: 'brain', body: { tokens: cur[0].tokens + tokens, requests: cur[0].requests + 1 }, prefer: 'return=minimal' });
    else await sb('/ai_usage', { method: 'POST', profile: 'brain', body: [{ user_id: userId, day, tokens, requests: 1 }], prefer: 'return=minimal' });
  } catch (e) {}
}

// ---------- data access policy ----------
const READ_SCHEMAS = new Set(['macro', 'correlation', 'network', 'asset_mgmt', 'management', 'finance', 'public']);
const COLUMN_BLOCK = /pass|secret|token|hash|credential|salt/i;        // never return secret-ish columns
function scrub(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((r) => { const o = {}; for (const k in r) if (!COLUMN_BLOCK.test(k)) o[k] = r[k]; return o; });
}

// ---------- tool catalog ----------
function toolDefs(isOwner) {
  const t = [
    { type: 'function', function: { name: 'data_query', description: 'Read rows from any whitelisted table. schemas: macro, correlation, network, asset_mgmt, management, finance, public. Use PostgREST filters.', parameters: { type: 'object', properties: { schema: { type: 'string' }, table: { type: 'string' }, select: { type: 'string', description: 'comma cols or *' }, filters: { type: 'string', description: 'PostgREST query string e.g. region=eq.ID&order=event_date.asc' }, limit: { type: 'integer' } }, required: ['schema', 'table'] } } },
    { type: 'function', function: { name: 'data_macro_overview', description: 'Latest per-region sentiment composites + the most recent scored news headlines. Best first call for "how do markets look".', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'data_search_news', description: 'Search scored macro news.', parameters: { type: 'object', properties: { q: { type: 'string' }, region: { type: 'string', enum: ['US', 'IDX', 'World'] }, limit: { type: 'integer' } } } } },
    { type: 'function', function: { name: 'data_calendar', description: 'Economic/corporate calendar events (BI, Fed, data, RUPS, earnings...).', parameters: { type: 'object', properties: { region: { type: 'string', enum: ['US', 'ID', 'Global'] }, from: { type: 'string' }, to: { type: 'string' }, category: { type: 'string' }, limit: { type: 'integer' } } } } },
    // ui.* are executed in the browser; declared so the model can drive the terminal.
    { type: 'function', function: { name: 'ui_navigate', description: 'Open a macro terminal tool.', parameters: { type: 'object', properties: { tool: { type: 'string', enum: ['data', 'news', 'sentiment', 'gather', 'calendar', 'analysis', 'forecast', 'connect', 'map', 'corr'] } }, required: ['tool'] } } },
    { type: 'function', function: { name: 'ui_search', description: 'Run the terminal global search.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'ui_set_news_filter', description: 'Filter the News panel.', parameters: { type: 'object', properties: { region: { type: 'string', enum: ['All', 'US', 'IDX', 'World'] }, type: { type: 'string' }, highOnly: { type: 'boolean' } } } } },
    { type: 'function', function: { name: 'ui_set_calendar', description: 'Set the Calendar view.', parameters: { type: 'object', properties: { region: { type: 'string', enum: ['All', 'ID', 'US', 'Global'] }, month: { type: 'string', description: 'YYYY-MM' }, view: { type: 'string', enum: ['month', 'agenda'] }, highOnly: { type: 'boolean' } } } } },
  ];
  if (isOwner) {
    t.push(
      { type: 'function', function: { name: 'write_add_calendar_event', description: 'OWNER ONLY. Add an event to macro.calendar.', parameters: { type: 'object', properties: { region: { type: 'string', enum: ['US', 'ID', 'Global'] }, event_date: { type: 'string' }, category: { type: 'string' }, title: { type: 'string' }, entity: { type: 'string' }, ticker: { type: 'string' }, importance: { type: 'string', enum: ['high', 'med', 'low'] }, detail: { type: 'string' }, status: { type: 'string', enum: ['confirmed', 'tentative', 'estimated'] } }, required: ['region', 'event_date', 'category', 'title'] } } },
      { type: 'function', function: { name: 'write_delete_calendar_event', description: 'OWNER ONLY. Delete a macro.calendar event by id.', parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } } },
    );
  }
  return t;
}

// ---------- server-executed tools (data.* / write.*) ----------
async function runTool(name, args, ctx) {
  args = args || {};
  if (name === 'data_query') {
    if (!READ_SCHEMAS.has(args.schema)) throw new Error('schema not allowed: ' + args.schema);
    const sel = args.select || '*';
    const lim = Math.min(args.limit || 50, 200);
    const qs = (args.filters ? args.filters + '&' : '') + 'select=' + encodeURIComponent(sel) + '&limit=' + lim;
    return scrub(await sb('/' + args.table + '?' + qs, { profile: args.schema }));
  }
  if (name === 'data_macro_overview') {
    const sent = await sb('/sentiment?select=region,composite,regime,data_score,news_score,ts&order=ts.desc&limit=8', { profile: 'macro' });
    const seen = {}; const latest = []; for (const s of sent) if (!seen[s.region]) { seen[s.region] = 1; latest.push(s); }
    const news = await sb('/news?select=region,headline,sent_score,importance,ts&order=ts.desc&limit=12', { profile: 'macro' });
    return { sentiment: latest, latest_news: news };
  }
  if (name === 'data_search_news') {
    let q = 'select=ts,region,source,headline,sent_score,sent_label,importance,url&order=ts.desc&limit=' + Math.min(args.limit || 20, 60);
    if (args.region) q += '&region=eq.' + args.region;
    if (args.q) q += '&headline=ilike.*' + encodeURIComponent(args.q) + '*';
    return await sb('/news?' + q, { profile: 'macro' });
  }
  if (name === 'data_calendar') {
    let q = 'select=event_date,event_time,region,category,title,entity,ticker,importance,status,detail&order=event_date.asc&limit=' + Math.min(args.limit || 60, 200);
    if (args.region) q += '&region=eq.' + args.region;
    if (args.category) q += '&category=eq.' + args.category;
    if (args.from) q += '&event_date=gte.' + args.from;
    if (args.to) q += '&event_date=lte.' + args.to;
    return await sb('/calendar?' + q, { profile: 'macro' });
  }
  // ---- writes: owner only ----
  if (name.startsWith('write_')) {
    if (!ctx.isOwner) throw new Error('not authorized: writes are owner-only');
    if (name === 'write_add_calendar_event') {
      const tick = args.ticker || '';
      const hash = crypto.createHash('sha1').update(`${args.region}|${(args.category || '').toLowerCase()}|${args.event_date}|${args.title.toLowerCase()}|${tick}`).digest('hex');
      const row = { region: args.region, event_date: args.event_date, category: (args.category || 'other').toLowerCase(), title: args.title, entity: args.entity || null, ticker: args.ticker || null, importance: args.importance || 'med', detail: args.detail || null, status: args.status || 'confirmed', source: 'Bridge Copilot', hash };
      await sb('/calendar?on_conflict=hash', { method: 'POST', profile: 'macro', body: [row], prefer: 'resolution=merge-duplicates,return=minimal' });
      return { ok: true, added: row.title };
    }
    if (name === 'write_delete_calendar_event') {
      await sb('/calendar?id=eq.' + parseInt(args.id, 10), { method: 'DELETE', profile: 'macro', prefer: 'return=minimal' });
      return { ok: true, deleted: args.id };
    }
    throw new Error('unknown write tool: ' + name);
  }
  throw new Error('tool not server-executable: ' + name);
}

// ---------- handler ----------
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'POST only' })); }
  if (!SB_KEY || !JWT_SECRET || !OR_KEY) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'proxy not configured' })); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  // auth
  let claims;
  try { claims = verifyJwt((req.headers.authorization || '').replace(/^Bearer\s+/i, '')); }
  catch (e) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'auth: ' + e.message })); }
  const sub = claims.sub || claims.user_id || claims.id;
  if (!sub) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'no subject in token' })); }

  let cfg, user;
  try { cfg = await loadConfig(); user = await loadUser(sub); }
  catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'lookup: ' + e.message })); }
  if (cfg.enabled === false) { res.statusCode = 503; return res.end(JSON.stringify({ error: 'assistant disabled' })); }
  if (!user || user.active === false) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'unknown or inactive user' })); }
  const role = user.role || claims.user_role || 'analyst';
  const owners = Array.isArray(cfg.owners) ? cfg.owners : [];
  const isOwner = owners.indexOf(sub) !== -1;
  const ctx = { sub, role, isOwner, username: user.username };

  // ---- tool execution ----
  if (body.mode === 'tool') {
    try {
      const result = await runTool(body.tool, body.args, ctx);
      audit({ user_id: sub, username: user.username, role, action: body.tool, detail: { args: body.args }, ok: true });
      res.statusCode = 200; return res.end(JSON.stringify({ result }));
    } catch (e) {
      audit({ user_id: sub, username: user.username, role, action: body.tool, detail: { args: body.args, err: e.message }, ok: false });
      res.statusCode = 200; return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ---- chat turn ----
  if (body.mode === 'chat') {
    const model = body.model || cfg.model_main || 'anthropic/claude-sonnet-4.6';
    const who = user.full_name || user.username;
    const heat = isOwner
      ? `WHO YOU'RE TALKING TO: ${who} — this is NABIL, the principal and CEO. Address him as Nabil. FULL HEAT is authorized and he explicitly prefers it: when he slacks, ducks a decision, repeats a mistake, or bullshits himself, hit the pattern hard — strong language is allowed — but aimed only at the behavior and the stakes, never his worth, and always paired with the exact corrective action. Hold him to the $1B standard every time.`
      : `WHO YOU'RE TALKING TO: ${who} (role: ${role}) — firm staff, NOT the principal. Keep LEGION's professional register: direct, demanding, devil's-advocate, always-suggesting, status-read open and next-action close, sign off "— LEGION". But NO profanity and no personal heat aimed at them — be the sharp, respectful chief of staff, not a drill sergeant. Save the fire for Nabil.`;
    const ops = [
      `TOOLS: READ all firm data via data_* tools (use them — don't guess), DRIVE the terminal via ui_* tools (open panels, search, filter — never code). When the user asks to open/show/find/filter something, CALL the matching ui_ tool, then confirm what you did.`,
      isOwner
        ? `WRITES: as owner you may use write_* tools — but state exactly what you'll write first; the user confirms before it executes.`
        : `WRITES: this user is NOT an owner — you cannot change any data. If asked to add/edit, tell them plainly that only the principal can write, and offer to draft it instead.`,
    ].join(' ');
    const sys = [cfg.persona || 'You are LEGION, LBC\'s AI chief of staff.', '', heat, '', ops].join('\n');
    const messages = [{ role: 'system', content: sys }, ...(body.messages || [])];
    try {
      const r = await fetch(OR_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + OR_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://legacy-bridge-terminal-data-umga.vercel.app', 'X-Title': 'LBC Bridge Copilot' },
        body: JSON.stringify({ model, messages, tools: toolDefs(isOwner), tool_choice: 'auto', temperature: 0.3, max_tokens: 1500 }),
      });
      const data = await r.json();
      if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'openrouter: ' + JSON.stringify(data).slice(0, 300) })); }
      const usage = data.usage || {};
      bumpUsage(sub, usage.total_tokens || 0);
      audit({ user_id: sub, username: user.username, role, action: 'chat', detail: { model, in: usage.prompt_tokens, out: usage.completion_tokens }, tokens: usage.total_tokens || 0, ok: true });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: data.choices && data.choices[0] && data.choices[0].message, usage, role, owner: isOwner }));
    } catch (e) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'model call failed: ' + e.message })); }
  }

  res.statusCode = 400; return res.end(JSON.stringify({ error: 'unknown mode' }));
};
