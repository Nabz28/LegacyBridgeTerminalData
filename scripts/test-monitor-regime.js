// Smoke-test the regime engine against LIVE data (same feeds the UI uses).
//   node scripts/test-monitor-regime.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy';
const yah = (id, range) => fetch(FN + '?source=YAHOO&id=' + encodeURIComponent(id) + '&range=' + (range || '6mo') + '&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-520));

async function main() {
  const [spx, vix, dxy, copper, gold, usdidr, hyOas, curve2s10] = await Promise.all([
    yah('^GSPC'), yah('^VIX'), yah('DX-Y.NYB'), yah('HG=F'), yah('GC=F'), yah('IDR=X'),
    fred('BAMLH0A0HYM2'), fred('T10Y2Y'),
  ]);
  const lens = { spx: spx.length, vix: vix.length, dxy: dxy.length, copper: copper.length, gold: gold.length, usdidr: usdidr.length, hyOas: hyOas.length, curve2s10: curve2s10.length };
  console.log('series lengths:', JSON.stringify(lens));
  const reg = R.computeRegime({ spx, vix, dxy, copper, gold, usdidr, hyOas, curve2s10 });
  if (!reg) { console.log('NO REGIME (insufficient data)'); process.exit(1); }
  console.log('\nREGIME: ' + reg.label + '  (score ' + reg.score.toFixed(2) + ')  asOf ' + reg.asOf);
  console.log('flags: ' + (reg.flags.join(', ') || 'none'));
  reg.components.forEach((c) => console.log(
    '  ' + c.label.padEnd(16) + String(c.value).padStart(9) + '  score ' + (c.score >= 0 ? '+' : '') + c.score.toFixed(2) + '  ' + c.note));
  const sig = R.deskSignals(await yah('XLE'), spx);
  console.log('\nXLE desk signals:', JSON.stringify(sig));
}
main().catch((e) => { console.error(e); process.exit(2); });
