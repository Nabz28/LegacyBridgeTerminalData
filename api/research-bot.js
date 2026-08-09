// LEGION research desk — Telegram webhook handler (Vercel serverless, Node).
// POST from Telegram only. The bot token comes EXCLUSIVELY from brain.vault key
// 'research_bot_token'. Since 2026-08-09 (CTO decision) that key holds the
// @LEGIONLBC_bot token (id 8297239188): LEGION's original bot IS the research
// surface now. OpenClaw's polling claim on it is retired — verified idle
// (getUpdates 200, no webhook, nothing pending) before the webhook was set.
// Private chats ONLY: the bot sits in the LBC exec group with privacy off.
//
// Flow per update:
//   1. load vault + research.config (60s module-scope TTL)
//   2. no token -> 200 {ok:false, reason:'no token'} (webhook is a no-op until provisioned)
//   3. validate X-Telegram-Bot-Api-Secret-Token against vault 'research_bot_webhook_secret'
//   4. allow-list from research.config 'telegram_allowed' {user_ids:[...]}
//      - empty list: reply with the sender id + admin instructions, capture the first
//        sender id into research.config 'telegram_pending' for review (never auto-authorize)
//      - non-empty and sender not on it: reply "not authorized" + their id
//   5. commands /start /help /brief /dials /news /watch /dates /ops /id, anything
//      else runs the same agent loop as /api/research-agent (api/_research/core.js)
//   6. agent charts render via quickchart.io (POST Chart.js config) -> sendPhoto;
//      any chart failure degrades to text only
//
// Replies > 4000 chars are split. Always answers 200 to Telegram (except the
// secret-token mismatch, which is a 401 so Telegram retries do not flood us).

const core = require('./_research/core.js');

const TG_API = 'https://api.telegram.org/bot';
const QUICKCHART = 'https://quickchart.io/chart';

// ---------- config (brain.vault + research.config), 60s TTL ----------
let _botCfg = null, _botCfgAt = 0;
const BOT_CFG_TTL = 60000;
async function loadBotConfig() {
  if (_botCfg && Date.now() - _botCfgAt < BOT_CFG_TTL) return _botCfg;
  const [vaultRows, cfg] = await Promise.all([
    core.sb('/vault?key=in.(research_bot_token,research_bot_webhook_secret)&select=key,value', { profile: 'brain' }),
    core.loadResearchConfig(),
  ]);
  const vault = {}; for (const r of vaultRows || []) vault[r.key] = r.value;
  const allowedRaw = (cfg.telegram_allowed && Array.isArray(cfg.telegram_allowed.user_ids)) ? cfg.telegram_allowed.user_ids : [];
  _botCfg = {
    token: vault.research_bot_token || null,
    secret: vault.research_bot_webhook_secret || null,
    allowed: allowedRaw.map((x) => String(x)),
    pending: cfg.telegram_pending || null,
    enabled: cfg.enabled !== false,
  };
  _botCfgAt = Date.now();
  return _botCfg;
}

// ---------- Telegram API (token never logged; errors carry method + description only) ----------
async function tg(token, method, payload) {
  const r = await fetch(TG_API + token + '/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.ok === false) throw new Error('telegram ' + method + ' failed: ' + ((d && d.description) || ('HTTP ' + r.status)));
  return d.result;
}

async function sendText(token, chatId, text) {
  for (const chunk of core.splitText(text, 4000)) {
    await tg(token, 'sendMessage', { chat_id: chatId, text: chunk, disable_web_page_preview: true });
  }
}

// ---------- charts: quickchart.io -> sendPhoto (multipart, no deps) ----------
function toChartJs(chart) {
  const series = (chart && Array.isArray(chart.series)) ? chart.series : [];
  const labels = ((series[0] && series[0].points) || []).map((p) => p[0]);
  const colors = ['#4cc9f0', '#f4a261', '#90be6d', '#e76f51'];
  // second axis when two series live on wildly different scales
  const med = (pts) => { const v = pts.map((p) => Math.abs(p[1])).filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  const twoAxes = series.length === 2 && med(series[0].points) > 0 && med(series[1].points) > 0
    && (med(series[0].points) / med(series[1].points) > 8 || med(series[1].points) / med(series[0].points) > 8);
  const axisColor = '#8b949e', gridColor = 'rgba(139,148,158,0.15)';
  return {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s.label, data: (s.points || []).map((p) => p[1]),
        borderColor: colors[i % colors.length], backgroundColor: 'transparent',
        borderWidth: 1.5, pointRadius: 0, tension: 0.1,
        yAxisID: twoAxes && i === 1 ? 'y1' : 'y',
      })),
    },
    options: {
      plugins: { legend: { labels: { color: '#c9d1d9' } } },
      scales: {
        x: { ticks: { color: axisColor, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: gridColor } },
        y: { ticks: { color: axisColor }, grid: { color: gridColor } },
        ...(twoAxes ? { y1: { position: 'right', ticks: { color: axisColor }, grid: { drawOnChartArea: false } } } : {}),
      },
    },
  };
}

async function sendChart(token, chatId, chart) {
  const qr = await fetch(QUICKCHART, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart: toChartJs(chart), width: 900, height: 420, backgroundColor: '#0d1117', format: 'png', version: '4' }),
    signal: AbortSignal.timeout(20000),
  });
  if (!qr.ok) throw new Error('quickchart HTTP ' + qr.status);
  const png = Buffer.from(await qr.arrayBuffer());
  const boundary = '----lbcresearch' + Date.now().toString(16);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="chart.png"\r\nContent-Type: image/png\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch(TG_API + token + '/sendPhoto', {
    method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
    body: Buffer.concat([head, png, tail]), signal: AbortSignal.timeout(20000),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.ok === false) throw new Error('sendPhoto failed: ' + ((d && d.description) || ('HTTP ' + r.status)));
}

// ---------- conversation state: last 10 turns per chat, 24h TTL ----------
// This is what makes "what about the other one" work. Short-term only; durable
// facts go to the brain via the remember tool inside the agent loop.
const CHAT_TURNS_MAX = 10;      // 5 exchanges
const CHAT_TTL_MS = 24 * 3600 * 1000;
async function loadChatTurns(chatId) {
  try {
    const rows = await core.sb(`/chat_state?chat_id=eq.${encodeURIComponent(String(chatId))}&select=turns,updated_at&limit=1`, { profile: 'research' });
    const row = rows && rows[0];
    if (!row || !Array.isArray(row.turns)) return [];
    if (Date.now() - new Date(row.updated_at).getTime() > CHAT_TTL_MS) return [];
    return row.turns.filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string');
  } catch (e) { return []; }
}
async function saveChatTurns(chatId, turns) {
  try {
    const trimmed = turns.slice(-CHAT_TURNS_MAX).map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) }));
    await core.sb('/chat_state?on_conflict=chat_id', {
      method: 'POST', profile: 'research', prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ chat_id: String(chatId), turns: trimmed, updated_at: new Date().toISOString() }],
    });
  } catch (e) { /* state is best-effort; the answer already went out */ }
}

// ---------- debug trace: last update + last error, one config row each ----------
// Vercel logs are not reachable from this project's tooling, so the handler
// leaves a breadcrumb in research.config. Overwritten every update; no content
// beyond routing metadata and error text.
async function traceDebug(key, value) {
  try {
    await core.sb('/config?on_conflict=key', {
      method: 'POST', profile: 'research', prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ key, value: { ...value, at: new Date().toISOString() } }],
    });
  } catch (e) { /* tracing must never break handling */ }
}

// ---------- pending-id capture (first unknown sender only, never auto-authorize) ----------
async function capturePending(from) {
  try {
    await core.sb('/config?on_conflict=key', {
      method: 'POST', profile: 'research', prefer: 'resolution=ignore-duplicates,return=minimal',
      body: [{ key: 'telegram_pending', value: { user_id: from.id, username: from.username || null, first_name: from.first_name || null, captured_at: new Date().toISOString() } }],
    });
  } catch (e) { /* capture is best-effort */ }
}

// ---------- command renderers ----------
async function cmdDials() {
  const out = await core.runTool('list_dials', {});
  if (out.error) return 'Dials unavailable: ' + out.error;
  if (!out.dials.length) return 'No dials yet.';
  const lines = out.dials.map((d) => {
    const star = d.stance_source === 'human' ? '*' : '';
    const m = d.machine_score == null ? 'na' : (d.machine_score > 0 ? '+' : '') + d.machine_score.toFixed(2);
    return `${d.name}: ${d.stance}${d.conviction}${star} m:${m}`;
  });
  return `Dials asof ${out.asof} (*=human override, m=machine score)\n` + lines.join('\n');
}

async function cmdOps() {
  const out = await core.runTool('get_ops', {});
  if (out.error) return 'Ops unavailable: ' + out.error;
  if (!out.pipelines.length) return 'No pipelines registered.';
  const c = out.counts;
  const lines = out.pipelines.map((p) => {
    const when = p.last_success_at ? p.last_success_at.slice(0, 16).replace('T', ' ') : 'never';
    return `${p.pipeline}: ${p.status} (last ok ${when}, ${p.rows_written == null ? '?' : p.rows_written} rows)`;
  });
  return `Freshness: ${c.ok || 0} ok, ${c.stale || 0} stale, ${c.error || 0} error, ${c.init || 0} init\n` + lines.join('\n');
}

async function cmdBrief() {
  const out = await core.runTool('get_brief', { kind: 'morning' });
  if (out.error) return 'No morning brief yet: ' + out.error;
  return `Morning brief ${out.asof}\n\n${out.body}`;
}

// /news [desk_id|TICKER] — headlines + the three loudest desks
const SENT_GLYPH = { bullish: '+', bearish: '-', neutral: '=' };
async function cmdNews(arg) {
  const a = String(arg || '').trim();
  const args = { days: 2, limit: 12 };
  if (a) { if (/^[a-z][a-z0-9-]*$/.test(a)) args.desk_id = a; else args.ticker = a.toUpperCase(); }
  const out = await core.runTool('get_news', args);
  if (out.error) return 'News unavailable: ' + out.error;
  if (!out.news.length) return `No headlines in the last ${out.window_days}d${a ? ' for ' + a : ''}.`;
  const when = (ts) => { const t = new Date(ts); return isNaN(t) ? '' : t.toISOString().slice(5, 16).replace('T', ' '); };
  const lines = out.news.map((n) => `${SENT_GLYPH[n.sent_label] || '='} ${when(n.published_at)} ${n.headline} (${n.source})`);
  let head = `News, last ${out.window_days}d${a ? ' · ' + a : ''} (+ bullish, - bearish, = neutral)`;
  if (!a) {
    const s = await core.runTool('get_sentiment', {});
    const loud = (s.desks || []).filter((d) => d.news_count > 0).slice(0, 3);
    if (loud.length) head += '\nLoudest desks: ' + loud.map((d) =>
      `${d.name} ${d.news_count} stories, tone ${d.sentiment == null ? 'na' : (d.sentiment > 0 ? '+' : '') + d.sentiment.toFixed(2)}` +
      (d.vol_z == null ? '' : ` (vol z ${(d.vol_z > 0 ? '+' : '') + d.vol_z.toFixed(1)})`)).join('; ');
  }
  return head + '\n' + lines.join('\n');
}

// /watch [desk_id] — the nightly candidate screen
async function cmdWatch(arg) {
  const a = String(arg || '').trim();
  const out = await core.runTool('get_candidates', { desk_id: a || undefined, limit: a ? 8 : 12 });
  if (out.error) return 'Screen unavailable: ' + out.error;
  if (!out.candidates.length) return `Nothing on the screen${a ? ' for ' + a : ''} as of ${out.asof}.`;
  const p = (v) => (v == null ? 'na' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%');
  const lines = out.candidates.map((c) => {
    const m = c.metrics || {};
    return `${c.side === 'short' ? 'S' : 'L'} ${c.ticker} (${c.desk}) score ${c.score == null ? 'na' : c.score.toFixed(2)}`
      + ` · 12-1m ${p(m.ret_12_1)} · vs200 ${p(m.vs_ma200)} · from 52wh ${p(m.from_52w_high)}`;
  });
  return `Screen asof ${out.asof}${a ? ' · ' + a : ''} (book names excluded)\n` + lines.join('\n');
}

// /dates [days] — upcoming flagged events
async function cmdDates(arg) {
  const days = /^\d+$/.test(String(arg || '').trim()) ? parseInt(arg, 10) : 14;
  const out = await core.runTool('get_key_dates', { days });
  if (out.error) return 'Calendar unavailable: ' + out.error;
  if (!out.events.length) return `Nothing flagged between ${out.from} and ${out.to}.`;
  const lines = out.events.slice(0, 30).map((e) =>
    `${e.event_date} [${(e.importance || '?').toUpperCase()}]${e.touches_book ? ' *BOOK*' : ''} ${e.title}`
    + (e.desks && e.desks.length ? ` · ${e.desks.join(', ')}` : ''));
  return `Key dates ${out.from} to ${out.to} (* = touches the book)\n` + lines.join('\n');
}

// /whatsnew [days] — the self-correction diff
async function cmdWhatsNew(arg) {
  const days = /^\d+$/.test(String(arg || '').trim()) ? parseInt(arg, 10) : 7;
  const out = await core.runTool('whats_changed_since', { days });
  if (out.error) return 'Diff unavailable: ' + out.error;
  const lines = [`Changed since ${out.since}`];
  if (out.stance_changes.length) {
    lines.push('', 'STANCES');
    for (const s of out.stance_changes) lines.push(`  ${s.desk_id}: ${s.from} -> ${s.to}${s.why ? ' · ' + s.why.slice(0, 90) : ''}`);
  }
  if (out.corrections.length) {
    lines.push('', 'CORRECTIONS (we had these wrong)');
    for (const c of out.corrections.slice(0, 8)) lines.push(`  ${c.asof} ${c.headline}`.slice(0, 180));
  }
  if (out.thesis_events.length) {
    lines.push('', 'THESES WOUNDED OR KILLED');
    for (const t of out.thesis_events) lines.push(`  ${t.ticker || '-'} ${t.status}: ${(t.adversary_verdict && t.adversary_verdict.case_against) || t.title}`.slice(0, 180));
  }
  if (out.deep_briefs.length) {
    lines.push('', 'DEEP/FLASH BRIEFS');
    for (const b of out.deep_briefs) lines.push(`  ${b.asof} [${b.kind}] ${b.head.slice(0, 120)}`);
  }
  if (lines.length === 1) lines.push('', 'Quiet. No stance changes, corrections, thesis events or special briefs in the window.');
  return lines.join('\n');
}

// /health — what the system does not know right now
async function cmdHealth() {
  const out = await core.runTool('data_health', {});
  if (out.error) return 'Health unavailable: ' + out.error;
  const lines = [`Data health: ${out.pipelines_ok} pipelines ok, ${out.pipelines_not_ok.length} not ok`];
  for (const p of out.pipelines_not_ok) lines.push(`  ${p.pipeline}: ${p.status}${p.note ? ' · ' + String(p.note).slice(0, 80) : ''}`);
  if (out.low_coverage_desks.length) {
    lines.push('', 'DESKS BELOW 60% DRIVER COVERAGE (no machine view by design)');
    for (const d of out.low_coverage_desks) lines.push(`  ${d.desk_id}: ${d.coverage_pct}% (${d.dead_drivers.map((x) => x.label).join(', ').slice(0, 100)})`);
  }
  if (out.fundamentals) lines.push('', `Fundamentals snapshot: ${out.fundamentals.as_of}, ${out.fundamentals.age_weeks} weeks old. ${out.fundamentals.note || ''}`);
  return lines.join('\n');
}

const HELP = [
  'LEGION. Research desk.',
  '',
  '/brief    latest morning brief',
  '/dials    every desk stance, machine score sorted',
  '/news     headlines, last 2d. /news oil-gas or /news BBCA.JK to filter',
  '/watch    the nightly candidate screen. /watch semiconductors for one desk',
  '/dates    flagged events for the next 14d. /dates 30 for a longer horizon',
  '/whatsnew what changed: stances, corrections, wounded theses. /whatsnew 14 for two weeks',
  '/health   what I do not know right now: stale pipelines, thin desks, fundamentals age',
  '/deep     queue a real research round: /deep should we cut APLN',
  '/ops      pipeline freshness',
  '/id       your Telegram and chat ids',
  '/help     this list',
  '',
  'Anything else in plain text is a conversation. I remember the last day of it, hold views you can argue with, and tell you when the desk had something wrong.',
].join('\n');

// ---------- handler ----------
async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'POST only' })); }
  if (!core.hasEnv()) { res.statusCode = 200; return res.end(JSON.stringify({ ok: false, reason: 'not configured' })); }

  let cfg;
  try { cfg = await loadBotConfig(); }
  catch (e) { res.statusCode = 200; return res.end(JSON.stringify({ ok: false, reason: 'config error' })); }
  if (!cfg.token) { res.statusCode = 200; return res.end(JSON.stringify({ ok: false, reason: 'no token' })); }

  // webhook secret gate (set via scripts/research/set-webhook.mjs)
  if (cfg.secret) {
    const given = req.headers['x-telegram-bot-api-secret-token'];
    if (given !== cfg.secret) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'bad secret token' })); }
  }

  let update = req.body;
  if (typeof update === 'string') { try { update = JSON.parse(update); } catch (e) { update = {}; } }
  const msg = (update && (update.message || update.edited_message)) || null;
  if (!msg || !msg.from || msg.from.is_bot || !msg.chat) { res.statusCode = 200; return res.end(JSON.stringify({ ok: true, skipped: true })); }
  // DM-only, enforced BEFORE any reply logic. This bot sits in the LBC exec
  // group with privacy mode off, so it receives every group message; replying
  // there (even "not authorized") would spam the whole executive team, and
  // research answers carry position-level P&L that a group must never see.
  if (msg.chat.type !== 'private') { res.statusCode = 200; return res.end(JSON.stringify({ ok: true, skipped: 'non-private chat' })); }

  const from = msg.from, uid = String(from.id), chatId = msg.chat.id;
  const text = String(msg.text || '').trim();
  const token = cfg.token;
  const done = (extra) => { res.statusCode = 200; res.end(JSON.stringify({ ok: true, ...(extra || {}) })); };
  await traceDebug('bot_last_update', { uid, chat: String(chatId), type: msg.chat.type, text_head: text.slice(0, 40), authorized: cfg.allowed.includes(uid) });

  try {
    // ---- allow-list ----
    if (!cfg.allowed.length) {
      await capturePending(from);
      await sendText(token, chatId,
        `No users are authorized yet. Your Telegram id is ${uid}. ` +
        `An admin must add it to research.config key 'telegram_allowed' as {"user_ids":[${uid}]}. ` +
        `Your id was recorded under 'telegram_pending' for review.`);
      return done({ authorized: false });
    }
    if (!cfg.allowed.includes(uid)) {
      await sendText(token, chatId, `Not authorized. Your Telegram id is ${uid}. Ask an admin to add it to the research bot allow-list.`);
      return done({ authorized: false });
    }

    // ---- commands ----
    const cmd = /^\/(\w+)(?:@\w+)?\s*(.*)$/s.exec(text);
    if (cmd) {
      const name = cmd[1].toLowerCase();
      const rest = (cmd[2] || '').trim();
      if (name === 'start' || name === 'help') {
        await sendText(token, chatId, HELP + `\n\nYour Telegram id: ${uid}.`);
        return done();
      }
      if (name === 'id') { await sendText(token, chatId, `user id: ${uid}\nchat id: ${chatId}`); return done(); }
      if (name === 'brief') { await sendText(token, chatId, await cmdBrief()); return done(); }
      if (name === 'dials') { await sendText(token, chatId, await cmdDials()); return done(); }
      if (name === 'ops') { await sendText(token, chatId, await cmdOps()); return done(); }
      if (name === 'news') { await sendText(token, chatId, await cmdNews(rest)); return done(); }
      if (name === 'watch') { await sendText(token, chatId, await cmdWatch(rest)); return done(); }
      if (name === 'dates') { await sendText(token, chatId, await cmdDates(rest)); return done(); }
      if (name === 'whatsnew') { await sendText(token, chatId, await cmdWhatsNew(rest)); return done(); }
      if (name === 'health') { await sendText(token, chatId, await cmdHealth()); return done(); }
      if (name === 'deep') {
        if (!rest) { await sendText(token, chatId, 'Give me the question: /deep should we cut APLN'); return done(); }
        const q = await core.runTool('deep_research', { question: rest }, { canSecret: true, chatId });
        await sendText(token, chatId, q.error ? 'Queue failed: ' + q.error : `Queued as deep round #${q.queue_id}. ${q.note}`);
        return done();
      }
      await sendText(token, chatId, `Unknown command /${name}. /help lists everything, or just ask in plain text.`);
      return done();
    }
    if (!text) { await sendText(token, chatId, 'Send text. /start for what I can do.'); return done(); }

    // ---- free text -> the agent loop, with the last day of conversation in context ----
    if (!cfg.enabled) { await sendText(token, chatId, 'The research agent is disabled (research.config enabled=false).'); return done(); }
    let out;
    const history = await loadChatTurns(chatId);
    const userTurn = { role: 'user', content: text.slice(0, 8000) };
    try {
      out = await core.runAgent([...history, userTurn], { canSecret: true, chatId });
      core.logAgent('research-bot', out, null);
    } catch (e) {
      core.logAgent('research-bot', null, e.message);
      await sendText(token, chatId, 'Agent error: ' + String(e.message || e).slice(0, 300));
      return done({ agent: 'error' });
    }
    await saveChatTurns(chatId, [...history, userTurn, { role: 'assistant', content: out.reply }]);
    await sendText(token, chatId, out.reply);
    for (const chart of (out.charts || []).slice(0, 3)) {
      try { await sendChart(token, chatId, chart); }
      catch (e) { /* chart failure degrades to text only */ }
    }
    return done({ agent: 'ok' });
  } catch (e) {
    // Telegram send failed or similar: still 200 so Telegram does not retry-flood
    await traceDebug('bot_last_error', { uid, chat: String(chatId), text_head: text.slice(0, 40), error: String(e && e.message || e).slice(0, 400) });
    res.statusCode = 200; return res.end(JSON.stringify({ ok: false, reason: 'handler error' }));
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
