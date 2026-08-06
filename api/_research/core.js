// LBC Research System — shared agent core for /api/research-agent and /api/research-bot.
// Mirrors api/bridge.js conventions: Node runtime, CommonJS, zero npm deps (global fetch),
// PostgREST against SUPABASE_URL with the service role key, schema routing via
// Accept-Profile / Content-Profile headers (research, mkt, asset_mgmt, macro, brain).
//
// This folder (api/_research/) is NOT a Vercel function — only top-level api/*.js are.
// NEVER log or echo secrets. All keys come from env (Vercel) or brain.vault.

const SB_URL = process.env.SUPABASE_URL || 'https://adnubucjlezrtusbicja.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
const MAX_TOOL_ROUNDS = 6;        // hard cap, then a forced final answer (tool_choice:none)
const TOOL_RESULT_MAX = 12000;    // chars of tool JSON fed back to the model

function hasEnv() { return !!(SB_KEY && OR_KEY); }

// ---------- Supabase REST (service role) — same shape as bridge.js ----------
async function sb(path, opts = {}) {
  const { method = 'GET', body, profile = 'public', prefer } = opts;
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Accept-Profile': profile };
  if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Profile'] = profile; }
  if (prefer) headers['Prefer'] = prefer;
  const r = await fetch(SB_URL + '/rest/v1' + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const t = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ': ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}

// ---------- research.config cache (60s TTL, module scope — warm across invocations) ----------
let _cfgCache = null, _cfgAt = 0;
const CFG_TTL = 60000;
async function loadResearchConfig() {
  if (_cfgCache && Date.now() - _cfgAt < CFG_TTL) return _cfgCache;
  const rows = await sb('/config?select=key,value', { profile: 'research' });
  const c = {}; for (const r of rows || []) c[r.key] = r.value;
  _cfgCache = c; _cfgAt = Date.now(); return c;
}

// ---------- small numeric helpers (exported for tests) ----------
const enc = encodeURIComponent;
function isoDaysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function clampInt(v, lo, hi, dflt) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }
function round(v, dp = 2) { return v == null || !Number.isFinite(v) ? null : +(+v).toFixed(dp); }

// percentile of x within values (0..100): share of observations <= x
function pctile(values, x) {
  const v = (values || []).filter((n) => Number.isFinite(n));
  if (!v.length || !Number.isFinite(x)) return null;
  let le = 0; for (const n of v) if (n <= x) le++;
  return round((le / v.length) * 100, 1);
}

// Pearson correlation of two equal-length arrays
function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 10) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const x = xs[i], y = ys[i]; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n, vy = syy - (sy * sy) / n;
  if (vx <= 0 || vy <= 0) return null;
  return round(cov / Math.sqrt(vx * vy), 3);
}

// day-over-day % changes; falls back to first differences if any level is <= 0
function seriesReturns(vals) {
  const anyNonPos = vals.some((v) => !(v > 0));
  const out = [];
  for (let i = 1; i < vals.length; i++) out.push(anyNonPos ? vals[i] - vals[i - 1] : vals[i] / vals[i - 1] - 1);
  return out;
}

// downsample [[date,value],...] to <= max points, always keeping the last point
function downsample(points, max = 200) {
  if (!Array.isArray(points) || points.length <= max) return points || [];
  const stride = Math.ceil(points.length / max);
  const out = [];
  for (let i = points.length - 1; i >= 0; i -= stride) out.push(points[i]);
  return out.reverse();
}

// series key ('us.rate.dgs10', 'cmd.gold', 'fx.usdidr', 'idx.jkse') vs ticker ('BBCA.JK', '^GSPC')
// rule: lowercase word followed by a dot => mkt.series key; anything else => mkt.price ticker
function isSeriesKey(x) { return /^[a-z][a-z0-9_]*\./.test(String(x || '')); }

// split long text into <= max-char chunks on newline boundaries where possible
function splitText(s, max = 4000) {
  const text = String(s == null ? '' : s);
  if (text.length <= max) return [text];
  const out = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest) out.push(rest);
  return out;
}

// ---------- data fetch helpers ----------
async function fetchSeries(seriesKey, sinceISO) {
  const rows = await sb(`/observation?series_key=eq.${enc(seriesKey)}&date=gte.${sinceISO}&select=date,value&order=date.asc&limit=2000`, { profile: 'mkt' });
  return (rows || []).map((r) => [r.date, r.value]);
}
async function fetchPrices(ticker, sinceISO) {
  const rows = await sb(`/price?ticker=eq.${enc(ticker)}&date=gte.${sinceISO}&select=date,close&order=date.asc&limit=2000`, { profile: 'mkt' });
  return (rows || []).map((r) => [r.date, r.close]);
}
async function fetchAny(id, sinceISO) {
  const points = isSeriesKey(id) ? await fetchSeries(id, sinceISO) : await fetchPrices(id, sinceISO);
  return { label: String(id), kind: isSeriesKey(id) ? 'series' : 'ticker', points };
}

// ---------- tool implementations ----------
async function toolGetDial(args) {
  const id = String(args.desk_id || '').trim();
  if (!id) return { error: 'desk_id required' };
  const [desk, dial, history] = await Promise.all([
    sb(`/desk?id=eq.${enc(id)}&select=id,name,basket,kind,tickers,benchmark&limit=1`, { profile: 'research' }),
    sb(`/dial?desk_id=eq.${enc(id)}&limit=1`, { profile: 'research' }),
    sb(`/dial_history?desk_id=eq.${enc(id)}&order=asof.desc&limit=10`, { profile: 'research' }),
  ]);
  if (!desk || !desk.length) return { error: 'unknown desk_id: ' + id };
  return { desk: desk[0], dial: (dial && dial[0]) || null, history: history || [] };
}

async function toolListDials() {
  const [dials, desks] = await Promise.all([
    sb('/dial?select=desk_id,asof,stance,conviction,machine_score,machine_stance,regime,stance_source,what_changed,updated_at', { profile: 'research' }),
    sb('/desk?select=id,name,basket,sort_order&active=eq.true', { profile: 'research' }),
  ]);
  const byId = new Map((desks || []).map((d) => [d.id, d]));
  const rows = (dials || []).map((d) => ({
    desk_id: d.desk_id,
    name: (byId.get(d.desk_id) || {}).name || d.desk_id,
    basket: (byId.get(d.desk_id) || {}).basket || null,
    asof: d.asof, stance: d.stance, conviction: d.conviction,
    machine_score: d.machine_score == null ? null : round(d.machine_score, 2),
    machine_stance: d.machine_stance, regime: d.regime,
    stance_source: d.stance_source, what_changed: d.what_changed,
  }));
  rows.sort((a, b) => (Math.abs(b.machine_score == null ? -1 : b.machine_score)) - (Math.abs(a.machine_score == null ? -1 : a.machine_score)));
  return { count: rows.length, asof: rows.reduce((m, r) => (r.asof > m ? r.asof : m), ''), dials: rows };
}

async function toolGetSeries(args) {
  const key = String(args.series_key || '').trim();
  if (!key) return { error: 'series_key required' };
  const days = clampInt(args.days, 30, 3650, 365);
  const points = await fetchSeries(key, isoDaysAgo(Math.max(days, 380)));
  if (!points.length) return { error: 'no observations for ' + key };
  const last = points[points.length - 1];
  const at = (n) => (points.length > n ? points[points.length - 1 - n][1] : null);
  const chg = (n) => { const p = at(n); return p == null ? null : round(last[1] - p, 4); };
  const chgPct = (n) => { const p = at(n); return p == null || p === 0 ? null : round(((last[1] - p) / Math.abs(p)) * 100, 2); };
  const yearCut = isoDaysAgo(365);
  const yearVals = points.filter((p) => p[0] >= yearCut).map((p) => p[1]);
  return {
    series_key: key, latest: { date: last[0], value: last[1] },
    chg_1d: chg(1), chg_5d: chg(5), chg_21d: chg(21),
    chg_1d_pct: chgPct(1), chg_5d_pct: chgPct(5), chg_21d_pct: chgPct(21),
    pctile_12m: pctile(yearVals, last[1]), n_obs: points.length, window_days: days,
  };
}

async function toolCompare(args) {
  const a = String(args.a || '').trim(), b = String(args.b || '').trim();
  if (!a || !b) return { error: 'a and b required (series_key or ticker)' };
  const days = clampInt(args.days, 30, 3650, 365);
  const since = isoDaysAgo(Math.max(days, 380));
  const [sa, sbb] = await Promise.all([fetchAny(a, since), fetchAny(b, since)]);
  if (!sa.points.length) return { error: 'no data for ' + a + ' (' + sa.kind + ')' };
  if (!sbb.points.length) return { error: 'no data for ' + b + ' (' + sbb.kind + ')' };
  const mapB = new Map(sbb.points);
  const aligned = sa.points.filter((p) => mapB.has(p[0])).map((p) => [p[0], p[1], mapB.get(p[0])]);
  if (aligned.length < 10) return { error: 'fewer than 10 overlapping dates between ' + a + ' and ' + b };
  const last90 = aligned.slice(-91);
  const corr90 = pearson(seriesReturns(last90.map((r) => r[1])), seriesReturns(last90.map((r) => r[2])));
  const ratios = aligned.filter((r) => r[2] !== 0).map((r) => [r[0], r[1] / r[2]]);
  const lastRatio = ratios.length ? ratios[ratios.length - 1] : null;
  const yearCut = isoDaysAgo(365);
  const ratioPct = lastRatio ? pctile(ratios.filter((r) => r[0] >= yearCut).map((r) => r[1]), lastRatio[1]) : null;
  const pa = downsample(aligned.map((r) => [r[0], r[1]]), 200);
  const pb = downsample(aligned.map((r) => [r[0], r[2]]), 200);
  const lastRow = aligned[aligned.length - 1];
  return {
    a: { id: a, kind: sa.kind, latest: { date: lastRow[0], value: lastRow[1] } },
    b: { id: b, kind: sbb.kind, latest: { date: lastRow[0], value: lastRow[2] } },
    n_aligned: aligned.length, corr_90d: corr90,
    ratio_latest: lastRatio ? { date: lastRatio[0], value: round(lastRatio[1], 4) } : null,
    ratio_pctile_12m: ratioPct,
    chart: { series: [{ label: a, points: pa }, { label: b, points: pb }] },
  };
}

async function toolGetBook() {
  const [positions, navs, theses] = await Promise.all([
    sb('/positions?status=eq.open&select=fund_id,symbol,exchange,name,asset_class,currency,direction,quantity,avg_cost,stop,target,conviction,opened_at&order=opened_at.asc&limit=200', { profile: 'asset_mgmt' }),
    sb('/nav_snapshots?select=fund_id,as_of,nav,cash,positions_value&order=as_of.desc&limit=5', { profile: 'asset_mgmt' }),
    sb('/thesis?status=in.(open,wounded)&select=id,desk_id,ticker,title,status,entry,target,stop,horizon,opened_at&order=updated_at.desc&limit=100', { profile: 'research' }),
  ]);
  const base = (t) => String(t || '').toUpperCase().split('.')[0];
  const pos = (positions || []).map((p) => {
    const linked = (theses || []).filter((t) => t.ticker && base(t.ticker) === base(p.symbol));
    return linked.length ? { ...p, theses: linked.map((t) => ({ id: t.id, title: t.title, status: t.status, desk_id: t.desk_id })) } : p;
  });
  const linkedIds = new Set(pos.flatMap((p) => (p.theses || []).map((t) => t.id)));
  return {
    positions: pos, nav_snapshots: navs || [],
    theses_open_or_wounded: theses || [],
    theses_without_position: (theses || []).filter((t) => !linkedIds.has(t.id)).map((t) => ({ id: t.id, ticker: t.ticker, title: t.title, status: t.status })),
  };
}

async function toolGetSignals(args) {
  const days = clampInt(args.days, 1, 90, 7);
  const minSal = clampInt(args.min_salience, 0, 100, 0);
  let path = `/signal?asof=gte.${isoDaysAgo(days)}&salience=gte.${minSal}&retired=eq.false`
    + '&select=asof,desk_id,kind,ref,headline,salience,direction,payload&order=asof.desc,salience.desc&limit=50';
  if (args.desk_id) path += '&desk_id=eq.' + enc(String(args.desk_id));
  const rows = await sb(path, { profile: 'research' });
  return { count: (rows || []).length, signals: rows || [] };
}

async function toolGetCalendar(args) {
  const days = clampInt(args.days, 1, 90, 14);
  const rows = await sb(`/calendar?event_date=gte.${todayISO()}&event_date=lte.${isoDaysAgo(-days)}`
    + '&select=event_date,region,category,title,entity,ticker,importance,detail,status&order=event_date.asc&limit=100', { profile: 'macro' });
  const rank = { high: 0, med: 1, low: 2 };
  const sorted = (rows || []).slice().sort((a, b) =>
    a.event_date === b.event_date ? (rank[a.importance] ?? 3) - (rank[b.importance] ?? 3) : (a.event_date < b.event_date ? -1 : 1));
  return { from: todayISO(), to: isoDaysAgo(-days), count: sorted.length, events: sorted };
}

async function toolSearchMemory(args) {
  const q = String(args.query || '').trim();
  if (!q) return { error: 'query required' };
  // brain.search_notes(q text, q_embedding text default null, want_type text default null,
  //                    include_archived boolean default false, lim int default 12)  -- 0039_brain_vector.sql
  try {
    const rows = await sb('/rpc/search_notes', { method: 'POST', profile: 'brain',
      body: { q, q_embedding: null, want_type: null, include_archived: false, lim: 5 } });
    return { notes: (rows || []).map((r) => ({ title: r.title, folder: r.folder, type: r.type, updated_at: r.updated_at, snippet: String(r.snippet || '').slice(0, 500) })) };
  } catch (e) {
    // RPC unavailable -> plain ilike fallback over brain.notes
    try {
      const rows = await sb(`/notes?select=title,folder,body&body=ilike.*${enc(q)}*&limit=5`, { profile: 'brain' });
      return { notes: (rows || []).map((r) => ({ title: r.title, folder: r.folder, body: String(r.body || '').slice(0, 500) })), fallback: 'ilike' };
    } catch (e2) { return { error: 'memory search failed: ' + e2.message }; }
  }
}

async function toolScreen(args) {
  const m = /^ret_(\d{1,2})d$/.exec(String(args.metric || 'ret_21d'));
  const n = Math.min(m ? parseInt(m[1], 10) : 21, 21);          // supported: ret_1d .. ret_21d
  const limit = clampInt(args.limit, 1, 50, 10);
  let instPath = '/instrument?select=ticker,desk_id&active=eq.true&limit=500';
  if (args.desk_id) instPath += '&desk_id=eq.' + enc(String(args.desk_id));
  const inst = await sb(instPath, { profile: 'mkt' });
  if (!inst || !inst.length) return { error: 'no instruments' + (args.desk_id ? ' for desk ' + args.desk_id : '') };
  const deskOf = new Map(inst.map((i) => [i.ticker, i.desk_id]));
  const tickers = [...new Set(inst.map((i) => i.ticker))];
  const since = isoDaysAgo(70);                                  // ~45 trading rows per ticker
  const byTicker = new Map();
  for (let i = 0; i < tickers.length; i += 15) {                 // chunk: stay under PostgREST max-rows
    const chunk = tickers.slice(i, i + 15);
    const inList = enc(chunk.map((t) => '"' + String(t).replace(/"/g, '') + '"').join(','));
    const rows = await sb(`/price?ticker=in.(${inList})&date=gte.${since}&select=ticker,date,close&order=ticker.asc,date.asc&limit=1000`, { profile: 'mkt' });
    for (const r of rows || []) { if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []); byTicker.get(r.ticker).push(r); }
  }
  const ranked = [];
  for (const [t, rows] of byTicker) {
    if (rows.length <= n) continue;
    const last = rows[rows.length - 1], prev = rows[rows.length - 1 - n];
    if (!prev || !prev.close) continue;
    ranked.push({ ticker: t, desk_id: deskOf.get(t) || null, ['ret_' + n + 'd_pct']: round((last.close / prev.close - 1) * 100, 2), last_date: last.date, last_close: last.close });
  }
  ranked.sort((a, b) => b['ret_' + n + 'd_pct'] - a['ret_' + n + 'd_pct']);
  return { metric: 'ret_' + n + 'd', universe: tickers.length, ranked: ranked.slice(0, limit) };
}

async function toolGetBrief(args) {
  const kind = ['morning', 'weekly', 'monthly', 'flash'].includes(args.kind) ? args.kind : 'morning';
  const rows = await sb(`/brief?kind=eq.${kind}&select=kind,asof,body,sent_at&order=asof.desc&limit=1`, { profile: 'research' });
  if (!rows || !rows.length) return { error: 'no ' + kind + ' brief found' };
  return rows[0];
}

async function toolLogIdea(args) {
  const desk_id = String(args.desk_id || '').trim(), title = String(args.title || '').trim(), body = String(args.body || '').trim();
  if (!desk_id || !title || !body) return { error: 'desk_id, title and body are required' };
  const num = (v) => (v == null || v === '' || !Number.isFinite(+v) ? null : +v);
  const thesisRow = {
    desk_id, ticker: args.ticker ? String(args.ticker).trim() : null, title, body,
    entry: num(args.entry), target: num(args.target), stop: num(args.stop),
    horizon: args.horizon ? String(args.horizon) : null, status: 'draft', created_by: 'bot',
  };
  const tRows = await sb('/thesis', { method: 'POST', profile: 'research', body: [thesisRow], prefer: 'return=representation' });
  const thesis = tRows && tRows[0];
  if (!thesis || !thesis.id) return { error: 'thesis insert returned no id' };
  const iRows = await sb('/idea', { method: 'POST', profile: 'research', body: [{ thesis_id: thesis.id, decision: 'pending' }], prefer: 'return=representation' });
  return { ok: true, thesis_id: thesis.id, idea_id: iRows && iRows[0] && iRows[0].id, status: 'draft', decision: 'pending' };
}

async function toolSetAlert(args) {
  const kinds = ['level', 'invalidation', 'regime', 'calendar', 'freshness', 'custom'];
  const kind = kinds.includes(args.kind) ? args.kind : 'custom';
  const target = String(args.target || '').trim();
  if (!target) return { error: 'target required (series_key or ticker)' };
  let condition = args.condition;
  if (typeof condition === 'string') { try { condition = JSON.parse(condition); } catch (e) { condition = { note: condition }; } }
  if (!condition || typeof condition !== 'object') return { error: 'condition required, e.g. {"op":"gt","value":110}' };
  const rows = await sb('/alert', { method: 'POST', profile: 'research',
    body: [{ kind, target, condition, note: args.note ? String(args.note) : null, active: true, created_by: 'bot' }],
    prefer: 'return=representation' });
  return { ok: true, alert_id: rows && rows[0] && rows[0].id, kind, target, condition };
}

async function toolUpdateStance(args) {
  const desk_id = String(args.desk_id || '').trim();
  const stance = String(args.stance || '').toUpperCase();
  if (!desk_id) return { error: 'desk_id required' };
  if (!['OW', 'N', 'UW'].includes(stance)) return { error: 'stance must be OW, N or UW' };
  const conviction = clampInt(args.conviction, 1, 5, 3);
  const patch = {
    stance, conviction, stance_source: 'human', updated_by: 'narin',
    what_changed: args.thesis ? String(args.thesis) : null,
    updated_at: new Date().toISOString(),
  };
  const rows = await sb(`/dial?desk_id=eq.${enc(desk_id)}`, { method: 'PATCH', profile: 'research', body: patch, prefer: 'return=representation' });
  if (!rows || !rows.length) return { error: 'no dial row for desk_id ' + desk_id };
  const d = rows[0];
  return { ok: true, desk_id, stance: d.stance, conviction: d.conviction, stance_source: d.stance_source, machine_stance: d.machine_stance, machine_score: d.machine_score };
}

async function toolGetOps() {
  const rows = await sb('/ops_freshness?select=pipeline,status,last_run_at,last_success_at,rows_written,expect_within_hours,note&order=pipeline.asc', { profile: 'research' });
  const counts = { ok: 0, stale: 0, error: 0, init: 0 };
  for (const r of rows || []) counts[r.status] = (counts[r.status] || 0) + 1;
  return { counts, pipelines: rows || [] };
}

// ---------- tool catalog (OpenRouter / OpenAI function-calling shape) ----------
const TOOL_DEFS = [
  { type: 'function', function: { name: 'get_dial', description: 'One desk: current dial (stance, conviction, machine score, drivers), the desk row, and the last 10 dial_history rows.', parameters: { type: 'object', properties: { desk_id: { type: 'string' } }, required: ['desk_id'] } } },
  { type: 'function', function: { name: 'list_dials', description: 'All desk dials with desk names, sorted by absolute machine score desc. Best first call for "where are the strongest signals".', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_series', description: 'One macro/market series from mkt.observation (key like us.rate.dgs10): latest value, 1d/5d/21d change, 12m percentile.', parameters: { type: 'object', properties: { series_key: { type: 'string' }, days: { type: 'integer', description: 'lookback window, default 365' } }, required: ['series_key'] } } },
  { type: 'function', function: { name: 'compare', description: 'Compare two series/tickers aligned by date: 90d correlation of daily changes, latest a/b ratio vs its 12m percentile, plus a line-chart payload. Lowercase dotted ids (us./cmd./fx./idx.) are series keys, anything else is a price ticker.', parameters: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' }, days: { type: 'integer', description: 'default 365' } }, required: ['a', 'b'] } } },
  { type: 'function', function: { name: 'get_book', description: 'The book: open positions, last 5 NAV snapshots, and open/wounded theses joined to positions by ticker.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_signals', description: 'Recent research signals (non-retired), optionally for one desk.', parameters: { type: 'object', properties: { desk_id: { type: 'string' }, days: { type: 'integer', description: 'default 7' }, min_salience: { type: 'integer', description: '0-100, default 0' } } } } },
  { type: 'function', function: { name: 'get_calendar', description: 'Macro/corporate calendar events from today forward, ordered by date then importance.', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'default 14' } } } } },
  { type: 'function', function: { name: 'search_memory', description: 'Search the firm knowledge base (brain notes) for context: people, decisions, prior work.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'screen', description: 'Rank desk tickers by trailing return (ret_1d..ret_21d) computed from mkt.price.', parameters: { type: 'object', properties: { desk_id: { type: 'string', description: 'omit for the whole universe' }, metric: { type: 'string', description: 'ret_21d (default), ret_5d, ret_1d' }, limit: { type: 'integer', description: 'default 10' } } } } },
  { type: 'function', function: { name: 'get_brief', description: 'Latest research brief of a kind (morning, weekly, monthly, flash).', parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['morning', 'weekly', 'monthly', 'flash'] } } } } },
  { type: 'function', function: { name: 'log_idea', description: 'WRITE: log a draft thesis + pending idea for review. Confirm in one sentence after.', parameters: { type: 'object', properties: { desk_id: { type: 'string' }, ticker: { type: 'string' }, title: { type: 'string' }, body: { type: 'string', description: 'three sentences' }, entry: { type: 'number' }, target: { type: 'number' }, stop: { type: 'number' }, horizon: { type: 'string' } }, required: ['desk_id', 'title', 'body'] } } },
  { type: 'function', function: { name: 'set_alert', description: 'WRITE: create an active alert on a series_key or ticker. condition e.g. {"op":"gt","value":110}.', parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['level', 'invalidation', 'regime', 'calendar', 'freshness', 'custom'] }, target: { type: 'string' }, condition: { type: 'object' }, note: { type: 'string' } }, required: ['kind', 'target', 'condition'] } } },
  { type: 'function', function: { name: 'update_stance', description: 'WRITE: set the human stance on a desk dial (OW/N/UW, conviction 1-5) with a one-line thesis for what changed.', parameters: { type: 'object', properties: { desk_id: { type: 'string' }, stance: { type: 'string', enum: ['OW', 'N', 'UW'] }, conviction: { type: 'integer' }, thesis: { type: 'string' } }, required: ['desk_id', 'stance'] } } },
  { type: 'function', function: { name: 'get_ops', description: 'Pipeline freshness: every research pipeline with status (ok/stale/error) and last success time.', parameters: { type: 'object', properties: {} } } },
];

// ---------- tool dispatch ----------
async function runTool(name, args, opts = {}) {
  args = args || {};
  if (name === 'get_dial') return toolGetDial(args);
  if (name === 'list_dials') return toolListDials(args);
  if (name === 'get_series') return toolGetSeries(args);
  if (name === 'compare') return toolCompare(args);
  if (name === 'get_book') return toolGetBook(args);
  if (name === 'get_signals') return toolGetSignals(args);
  if (name === 'get_calendar') return toolGetCalendar(args);
  if (name === 'search_memory') {
    if (opts.canSecret === false) return { error: 'the firm knowledge base is restricted to management' };
    return toolSearchMemory(args);
  }
  if (name === 'screen') return toolScreen(args);
  if (name === 'get_brief') return toolGetBrief(args);
  if (name === 'log_idea') return toolLogIdea(args);
  if (name === 'set_alert') return toolSetAlert(args);
  if (name === 'update_stance') return toolUpdateStance(args);
  if (name === 'get_ops') return toolGetOps(args);
  return { error: 'unknown tool: ' + name };
}

// ---------- system prompt (baked in) ----------
function systemPrompt() {
  const nowWIB = new Date(Date.now() + 7 * 3600 * 1000);
  return [
    'You are the LBC Research Desk agent, speaking to Narin (CRO).',
    'Voice: direct, terse, C-level. No em dashes anywhere. No markdown headers in replies.',
    '2-5 sentences for simple questions. Numbers always with dates.',
    'You interpret only what tools return. Never invent numbers.',
    'When asked to act (log idea, set alert, change stance) confirm what you did in one sentence.',
    'If data is missing say so plainly.',
    'Today is ' + nowWIB.toISOString().slice(0, 10) + ' (WIB).',
  ].join(' ');
}

// ---------- the tool-use loop ----------
// Runs up to MAX_TOOL_ROUNDS tool iterations, then forces a final answer
// (tool_choice:'none'). Chart payloads from tools are lifted out of the tool
// result (the model sees {attached:true}, the caller gets the full points).
async function runAgent(messages, opts = {}) {
  let cfg = {};
  try { cfg = await loadResearchConfig(); } catch (e) { /* config unreadable -> defaults */ }
  if (cfg.enabled === false) return { reply: 'The research agent is disabled (research.config enabled=false).', charts: [], tool_trace: [], usage: {}, model: null };
  const model = (opts.model) || (cfg.models && cfg.models.bot) || DEFAULT_MODEL;
  const convo = [{ role: 'system', content: systemPrompt() }, ...messages];
  const charts = [], trace = [];
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const force = round === MAX_TOOL_ROUNDS;
    const r = await fetch(OR_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + OR_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://legacy-bridge-terminal-data-umga.vercel.app', 'X-Title': 'LBC Research Agent' },
      body: JSON.stringify({ model, messages: convo, tools: TOOL_DEFS, tool_choice: force ? 'none' : 'auto', temperature: 0.2, max_tokens: 1400 }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) throw new Error('openrouter: ' + (data ? JSON.stringify(data).slice(0, 300) : 'HTTP ' + r.status));
    const u = data.usage || {};
    usage.prompt_tokens += u.prompt_tokens || 0; usage.completion_tokens += u.completion_tokens || 0; usage.total_tokens += u.total_tokens || 0;
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) throw new Error('openrouter: empty choice');

    if (!force && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      convo.push(msg);
      for (const tc of msg.tool_calls) {
        const fname = tc.function && tc.function.name;
        let targs = {};
        try { targs = JSON.parse((tc.function && tc.function.arguments) || '{}'); } catch (e) { /* leave {} */ }
        trace.push({ tool: fname, args_summary: JSON.stringify(targs).slice(0, 160) });
        let result;
        try { result = await runTool(fname, targs, opts); }
        catch (e) { result = { error: String(e.message || e).slice(0, 400) }; }   // PostgREST errors surface as data, not stacks
        if (result && result.chart) { charts.push(result.chart); result = { ...result, chart: { attached: true } }; }
        convo.push({ role: 'tool', tool_call_id: tc.id, name: fname, content: JSON.stringify(result).slice(0, TOOL_RESULT_MAX) });
      }
      continue;
    }
    return { reply: (msg.content || '').trim() || 'No answer produced.', charts, tool_trace: trace, usage, model };
  }
  return { reply: 'Hit the tool limit without a final answer.', charts, tool_trace: trace, usage, model };
}

// best-effort run log into research.agent_log (never blocks, never throws)
async function logAgent(agent, out, error) {
  try {
    await sb('/agent_log', { method: 'POST', profile: 'research', prefer: 'return=minimal',
      body: [{
        agent, model: (out && out.model) || null,
        input_tokens: out && out.usage ? out.usage.prompt_tokens || null : null,
        output_tokens: out && out.usage ? out.usage.completion_tokens || null : null,
        output: out ? { reply_chars: (out.reply || '').length, tools: (out.tool_trace || []).map((t) => t.tool), charts: (out.charts || []).length } : null,
        error: error ? String(error).slice(0, 500) : null,
      }] });
  } catch (e) { /* never fail the request on logging */ }
}

module.exports = {
  SB_URL, hasEnv, sb, loadResearchConfig, runAgent, runTool, logAgent, splitText,
  TOOL_DEFS, DEFAULT_MODEL,
  _internal: { pctile, pearson, seriesReturns, downsample, isSeriesKey, clampInt, isoDaysAgo, splitText },
};
