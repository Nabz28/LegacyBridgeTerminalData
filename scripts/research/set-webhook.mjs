#!/usr/bin/env node
// Set (or delete) the Telegram webhook for the LBC research bot.
//
// Usage (run locally, never in CI logs):
//   node scripts/research/set-webhook.mjs --token=<bot token> --secret=<webhook secret>
//   node scripts/research/set-webhook.mjs                      # token/secret from env
//   node scripts/research/set-webhook.mjs --delete             # remove the webhook
//   node scripts/research/set-webhook.mjs --url=https://.../api/research-bot/ --drop
//
// Args / env:
//   --token=...   or env RESEARCH_BOT_TOKEN (fallback TELEGRAM_BOT_TOKEN)
//                 Must be the DEDICATED research bot token (brain.vault key
//                 'research_bot_token'). NEVER the LEGION bot (@LEGIONLBC_bot).
//   --secret=...  or env RESEARCH_BOT_WEBHOOK_SECRET (fallback TELEGRAM_WEBHOOK_SECRET)
//                 Sent by Telegram as X-Telegram-Bot-Api-Secret-Token; must match
//                 brain.vault key 'research_bot_webhook_secret'.
//   --url=...     webhook URL, default:
//                 https://legacy-bridge-terminal-data-umga.vercel.app/api/research-bot/
//                 (trailing slash matters: vercel.json has trailingSlash:true)
//   --drop        pass drop_pending_updates:true on setWebhook
//   --delete      call deleteWebhook instead of setWebhook
//
// Prints getWebhookInfo at the end. The token itself is never printed.

const DEFAULT_URL = 'https://legacy-bridge-terminal-data-umga.vercel.app/api/research-bot/';

const args = {};
for (const a of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (m) args[m[1]] = m[2] === undefined ? true : m[2];
}

const token = args.token || process.env.RESEARCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const secret = args.secret || process.env.RESEARCH_BOT_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
const url = args.url || DEFAULT_URL;

if (!token) {
  console.error('No bot token. Pass --token=... or set RESEARCH_BOT_TOKEN.');
  process.exit(1);
}

async function call(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.ok === false) {
    throw new Error(`${method} failed: ` + ((d && d.description) || `HTTP ${r.status}`));
  }
  return d.result;
}

try {
  if (args.delete) {
    const out = await call('deleteWebhook', { drop_pending_updates: !!args.drop });
    console.log('deleteWebhook:', out);
  } else {
    if (!secret) console.warn('WARNING: no webhook secret given; the handler will accept any caller until one is set in brain.vault.');
    const payload = { url, allowed_updates: ['message'], drop_pending_updates: !!args.drop };
    if (secret) payload.secret_token = secret;
    const out = await call('setWebhook', payload);
    console.log('setWebhook:', out, '->', url);
  }
  const info = await call('getWebhookInfo', {});
  console.log('getWebhookInfo:', JSON.stringify(info, null, 2));
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}
