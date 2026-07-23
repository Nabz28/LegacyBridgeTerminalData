// validate-monitor-tickers — checks every Yahoo symbol in the MONITOR
// coverage data actually resolves and quotes through the equity-quote
// edge fn. Run before shipping any universe change:
//   node scripts/validate-monitor-tickers.js            (full book)
//   node scripts/validate-monitor-tickers.js AAPL BBCA.JK  (ad-hoc list)
// Exit 1 if any symbol fails.

'use strict';

const path = require('path');
const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/equity-quote?ticker=';
const CONCURRENCY = 8;

function collectSymbols() {
  global.window = {};
  require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-data.js'));
  const MD = global.window.MONITOR_DATA;
  if (!MD) throw new Error('MONITOR_DATA did not load');
  const out = new Map(); // sym -> where
  const add = (sym, where) => { if (sym && !out.has(sym)) out.set(sym, where); };
  MD.DESKS.forEach((d) => {
    (d.bench || []).forEach((b) => add(b.y, d.id + ' bench ' + b.label));
    (d.subs || []).forEach((s) => (s.u || []).forEach((r) => add(r.t, d.id + '/' + s.id + ' ' + r.n)));
  });
  MD.COUNTRY_INDICES.forEach((r) => add(r.y, 'country-index ' + r.n));
  return out;
}

async function checkOne(sym) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(FN + encodeURIComponent(sym), { signal: ctl.signal });
    if (!res.ok) return { sym, ok: false, why: 'HTTP ' + res.status };
    const j = await res.json();
    if (!j.ok) return { sym, ok: false, why: j.error || 'not ok' };
    const q = j.quote || {};
    if (q.price == null) return { sym, ok: false, why: 'null price' };
    // staleness: FX/indices update daily minimum; anything older than 14 days
    // is a dead or renamed listing (suspensions excepted — flag, don't fail).
    const ageDays = (Date.now() - Date.parse(q.asOf)) / 86400000;
    if (ageDays > 14) return { sym, ok: true, warn: 'stale ' + ageDays.toFixed(0) + 'd (suspended/renamed?)', price: q.price };
    return { sym, ok: true, price: q.price };
  } catch (e) {
    return { sym, ok: false, why: String(e && e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const adhoc = process.argv.slice(2);
  const book = collectSymbols();
  const syms = adhoc.length ? adhoc : [...book.keys()];
  console.log('validating ' + syms.length + ' symbols…');
  const results = [];
  let i = 0;
  async function worker() {
    while (i < syms.length) {
      const sym = syms[i++];
      const r = await checkOne(sym);
      r.where = book.get(sym) || 'ad-hoc';
      results.push(r);
      if (!r.ok) console.log('  FAIL ' + r.sym + '  (' + r.why + ')  @ ' + r.where);
      else if (r.warn) console.log('  WARN ' + r.sym + '  ' + r.warn + '  @ ' + r.where);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const fails = results.filter((r) => !r.ok);
  const warns = results.filter((r) => r.ok && r.warn);
  console.log('\n' + (syms.length - fails.length) + '/' + syms.length + ' ok · ' + warns.length + ' warnings · ' + fails.length + ' failures');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
