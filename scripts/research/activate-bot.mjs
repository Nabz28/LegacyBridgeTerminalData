#!/usr/bin/env node
/**
 * One-command activation for the LBC Research Desk Telegram bot.
 *
 * Everything the system needs is automated except the two things only a human
 * with a Telegram account can produce: a bot token (from @BotFather) and the
 * numeric chat id of whoever should receive the briefs.
 *
 * Usage:
 *   node scripts/research/activate-bot.mjs --token=<botfather token> [--chat=<your numeric id>]
 *   node scripts/research/activate-bot.mjs --token=<token> --discover
 *   node scripts/research/activate-bot.mjs --status
 *
 * What it does, in order:
 *   1. verifies the token with getMe
 *   2. stores it in brain.vault as research_bot_token (never printed)
 *   3. generates + stores a webhook secret if one is missing
 *   4. points the Telegram webhook at /api/research-bot on the production host
 *   5. registers the chat id for daily pushes (research.config.telegram_push)
 *      and allow-lists it for conversation (research.config.telegram_allowed)
 *   6. sends a confirmation message so you know it works
 *
 * --discover polls getUpdates and picks up the id of whoever messages the bot
 * first, so you never have to look your own id up. Safe on a NEW bot: it has no
 * other consumer. Never run --discover against @LEGIONLBC_bot; OpenClaw owns
 * that bot's updates and polling would steal them.
 *
 * Requires SUPABASE_SERVICE_ROLE (or SUPABASE_SERVICE_ROLE_KEY) in the env.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://adnubucjlezrtusbicja.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOST = process.env.RESEARCH_HOST || 'https://legacy-bridge-terminal-data-umga.vercel.app';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

async function rest(path, { schema = 'research', method = 'GET', body, prefer } = {}) {
  if (!KEY) die('SUPABASE_SERVICE_ROLE is not set');
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Accept-Profile': schema,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Profile'] = schema;
    headers.Prefer = prefer || 'return=minimal,resolution=merge-duplicates';
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) die(`supabase ${method} ${path.split('?')[0]} -> ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function tg(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  return res.json();
}

async function getConfig(key) {
  const rows = await rest(`config?select=value&key=eq.${encodeURIComponent(key)}`);
  return rows && rows.length ? rows[0].value : null;
}

async function setConfig(key, value) {
  await rest('config?on_conflict=key', { method: 'POST', body: [{ key, value }] });
}

async function getVault(key) {
  const rows = await rest(`vault?select=value&key=eq.${encodeURIComponent(key)}`, { schema: 'brain' });
  return rows && rows.length ? rows[0].value : null;
}

async function setVault(key, value, note) {
  await rest('vault?on_conflict=key', {
    schema: 'brain',
    method: 'POST',
    body: [{ key, value, is_secret: true, note }],
  });
}

async function status() {
  const token = await getVault('research_bot_token');
  const push = await getConfig('telegram_push');
  const allowed = await getConfig('telegram_allowed');
  console.log(`bot token stored : ${token ? 'yes' : 'no'}`);
  console.log(`push recipients  : ${JSON.stringify((push && push.chat_ids) || [])}`);
  console.log(`conversation ids : ${JSON.stringify((allowed && allowed.user_ids) || [])}`);
  if (token) {
    const info = await tg(token, 'getWebhookInfo');
    console.log(`webhook          : ${info.result?.url || '(none)'}`);
    const me = await tg(token, 'getMe');
    console.log(`bot              : @${me.result?.username || '?'}`);
  }
}

async function discover(token, tries = 30) {
  console.log('waiting for a message to the bot (send it anything now)...');
  for (let i = 0; i < tries; i++) {
    const r = await tg(token, 'getUpdates', { timeout: 10, limit: 5 });
    const updates = r.result || [];
    for (const u of updates) {
      const msg = u.message || u.channel_post;
      const id = msg?.chat?.id;
      if (id) {
        console.log(`found chat id ${id} (${msg.chat.username || msg.chat.title || 'private'})`);
        return String(id);
      }
    }
    await new Promise((r2) => setTimeout(r2, 2000));
  }
  return null;
}

async function main() {
  if (args.status) return status();

  const token = args.token || (await getVault('research_bot_token'));
  if (!token || token === true) die('pass --token=<botfather token> (or --status to inspect)');

  const me = await tg(token, 'getMe');
  if (!me.ok) die(`token rejected by Telegram: ${me.description}`);
  console.log(`bot verified: @${me.result.username} (id ${me.result.id})`);
  if (String(me.result.id) === '8297239188' && !args['allow-legion']) {
    // Historical guard: OpenClaw (Nabil's laptop) used to own this bot's
    // updates. The CTO retired that claim on 2026-08-09 and made this bot the
    // research surface. The flag keeps the override deliberate: verify nothing
    // is polling (getUpdates must return 200, not 409) before passing it.
    die('that is @LEGIONLBC_bot. Its updates historically belong to OpenClaw. '
      + 'Pass --allow-legion ONLY after verifying nothing is polling it.');
  }

  await setVault('research_bot_token', token,
    'Research Desk Telegram bot. Used by api/research-bot.js webhook.');

  let secret = await getVault('research_bot_webhook_secret');
  if (!secret) {
    secret = [...crypto.getRandomValues(new Uint8Array(24))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    await setVault('research_bot_webhook_secret', secret, 'X-Telegram-Bot-Api-Secret-Token');
    console.log('generated a webhook secret');
  }

  let chat = args.chat && args.chat !== true ? String(args.chat) : null;
  if (!chat && args.discover) chat = await discover(token);

  const hook = `${HOST}/api/research-bot/`;
  const set = await tg(token, 'setWebhook', {
    url: hook,
    secret_token: secret,
    allowed_updates: ['message', 'edited_message'],
    drop_pending_updates: true,
  });
  if (!set.ok) die(`setWebhook failed: ${set.description}`);
  console.log(`webhook set: ${hook}`);

  if (chat) {
    const push = (await getConfig('telegram_push')) || {};
    const ids = new Set([...(push.chat_ids || []), chat]);
    await setConfig('telegram_push', {
      chat_ids: [...ids],
      note: 'Daily brief + alert recipients. Briefs carry position level P&L.',
    });
    const allowed = (await getConfig('telegram_allowed')) || {};
    const users = new Set([...(allowed.user_ids || []), chat]);
    await setConfig('telegram_allowed', { user_ids: [...users] });
    console.log(`registered chat ${chat} for pushes and conversation`);

    const sent = await tg(token, 'sendMessage', {
      chat_id: chat,
      text:
        'LBC Research Desk is live.\n\n' +
        'You will get the morning brief at 06:30 WIB, plus alerts when something ' +
        'material moves against the book.\n\n' +
        'Ask me anything: what the coal dial says, why nickel moved, what to look ' +
        'at this week, what is on the calendar. Commands: /brief /dials /watch ' +
        '/news /dates /ops /help',
    });
    console.log(sent.ok ? 'confirmation message delivered' : `send failed: ${sent.description}`);
  } else {
    console.log('no chat id yet. Re-run with --chat=<id> or --discover to enable pushes.');
  }

  console.log('\ndone. Run with --status any time to inspect.');
}

main().catch((e) => die(e.message));
