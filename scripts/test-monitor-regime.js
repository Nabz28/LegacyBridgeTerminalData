// Smoke-test the regime engine v2 against LIVE data (same feeds the UI uses).
//   node scripts/test-monitor-regime.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy';
const yah = (id) => fetch(FN + '?source=YAHOO&id=' + encodeURIComponent(id) + '&range=2y&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-700));

async function main() {
  const [spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10] = await Promise.all([
    yah('^GSPC'), yah('^VIX'), yah('^VIX3M'), yah('DX-Y.NYB'), yah('HG=F'), yah('GC=F'), yah('IDR=X'),
    fred('BAMLH0A0HYM2'), fred('T10Y2Y'), fred('DGS10'),
  ]);
  const inp = { spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10 };
  console.log('series lengths:', JSON.stringify(Object.fromEntries(Object.entries(inp).map(([k, v]) => [k, v.length]))));
  const reg = R.computeRegime(inp);
  if (!reg) { console.log('NO REGIME (insufficient data)'); process.exit(1); }
  console.log('\nREGIME: ' + reg.label + '  smooth ' + reg.score.toFixed(2) + '  raw ' + reg.raw.toFixed(2) +
    '  coverage ' + (reg.coverage * 100).toFixed(0) + '%  asOf ' + reg.asOf);
  console.log('flags: ' + (reg.flags.join(', ') || 'none'));
  reg.components.forEach((c) => console.log(
    '  ' + c.label.padEnd(16) + String(c.value).padStart(10) + '  score ' + (c.score >= 0 ? '+' : '') + c.score.toFixed(2) +
    '  w ' + c.weight.toFixed(2) + '  ' + c.note));
  const hist = R.computeRegimeSeries(inp, 60);
  console.log('\nhistory: ' + hist.points.length + ' pts, streak ' + hist.streak + ' in ' + hist.label);
  const sig = R.deskSignals(await yah('XLE'), spx);
  console.log('XLE signals:', JSON.stringify({ r1m: +sig.r1m.toFixed(2), momZ: sig.momZ && +sig.momZ.toFixed(2), momentum: sig.momentum, beta: sig.beta && +sig.beta.toFixed(2), rsDiff: +sig.rsDiff.toFixed(2), rs: sig.rs }));
}
main().catch((e) => { console.error(e); process.exit(2); });
