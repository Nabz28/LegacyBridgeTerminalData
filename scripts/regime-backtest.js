// regime-backtest — the master validation gate for the MONITOR regime
// engine (roadmap 1.1). Rebuilds the composite over ~4y of live data and
// answers, with numbers:
//   A. does the smoothed composite LEAD forward returns? (Spearman IC vs
//      fwd 5/10/21d for SPX + every desk benchmark, block-bootstrap t)
//   B. which momentum spec wins — 1M or 6m-skip-1m? (composite IC A/B)
//   C. what should the component weights be? (per-component IC vs SPX 21d)
//   D. does hysteresis kill whipsaw? (flip counts raw vs smoothed labels)
//   E. regime playbook — per label, mean fwd 21d desk-minus-SPX + CI.
//   node scripts/regime-backtest.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy';
const yah = (id) => fetch(FN + '?source=YAHOO&id=' + encodeURIComponent(id) + '&range=5y&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-1400));

const BENCHES = [
  ['E1 Financials', 'XLF'], ['E2 RealEstate', 'XLRE'], ['E3 Tech', 'XLK'],
  ['E4 CommSvc', 'XLC'], ['E5 Staples', 'XLP'], ['E6 Discretionary', 'XLY'],
  ['E7 Health', 'XLV'], ['E8 Industrials', 'XLI'], ['E9 Energy', 'XLE'],
  ['E10 Materials', 'XLB'], ['SPX', '^GSPC'], ['IDX ^JKSE', '^JKSE'], ['EIDO', 'EIDO'],
];

// ---- stats helpers ----
function spearman(x, y) {
  const n = x.length;
  if (n < 30) return null;
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(n);
    idx.forEach(([, i], k) => { r[i] = k + 1; });
    return r;
  };
  const rx = rank(x), ry = rank(y);
  const mx = (n + 1) / 2;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - mx); dx += (rx[i] - mx) ** 2; dy += (ry[i] - mx) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}
// moving-block bootstrap t-stat for the IC (block = horizon)
function bootT(x, y, block, draws) {
  const base = spearman(x, y);
  if (base == null) return { ic: null, t: null };
  const n = x.length;
  const ics = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let d = 0; d < draws; d++) {
    const bx = [], by = [];
    while (bx.length < n) {
      const s = Math.floor(rnd() * (n - block));
      for (let k = 0; k < block && bx.length < n; k++) { bx.push(x[s + k]); by.push(y[s + k]); }
    }
    const ic = spearman(bx, by);
    if (ic != null) ics.push(ic);
  }
  const mean = ics.reduce((a, b) => a + b, 0) / ics.length;
  const sd = Math.sqrt(ics.reduce((a, b) => a + (b - mean) ** 2, 0) / (ics.length - 1));
  return { ic: base, t: sd > 0 ? base / sd : null };
}
const fwdRet = (s, i, h) => (i + h < s.length && s[i].value ? (s[i + h].value / s[i].value - 1) * 100 : null);

async function main() {
  console.log('fetching 4-5y inputs…');
  const [spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10] = await Promise.all([
    yah('^GSPC'), yah('^VIX'), yah('^VIX3M'), yah('DX-Y.NYB'), yah('HG=F'), yah('GC=F'), yah('IDR=X'),
    fred('BAMLH0A0HYM2'), fred('T10Y2Y'), fred('DGS10'),
  ]);
  const benches = {};
  for (const [name, sym] of BENCHES) benches[name] = await yah(sym);
  const inp = { spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10 };

  // ---- B: momentum horse race on the composite ----
  const variants = {};
  for (const momKind of ['r1m', 'skip']) {
    const built = R.buildComposite(inp, { momKind });
    if (!built) { console.log('BUILD FAILED', momKind); process.exit(1); }
    variants[momKind] = built.rows;
  }
  console.log('\ncomposite rows:', variants.r1m.length, '(' + variants.r1m[0].date + ' → ' + variants.r1m[variants.r1m.length - 1].date + ')');

  const spxBy = new Map(spx.map((o, i) => [o.date, i]));
  const align = (rows, bench, h) => {
    const bBy = new Map(bench.map((o, i) => [o.date, i]));
    const xs = [], ys = [];
    rows.forEach((r) => {
      const bi = bBy.get(r.date);
      if (bi == null) return;
      const fr = fwdRet(bench, bi, h);
      if (fr == null) return;
      xs.push(r.smooth); ys.push(fr);
    });
    return { xs, ys };
  };

  console.log('\n== B: momentum spec (composite IC vs fwd SPX / cyclicals, h=21) ==');
  for (const momKind of ['r1m', 'skip']) {
    let line = momKind.padEnd(6);
    for (const nm of ['SPX', 'E3 Tech', 'E9 Energy', 'E10 Materials']) {
      const { xs, ys } = align(variants[momKind], benches[nm], 21);
      const { ic, t } = bootT(xs, ys, 21, 300);
      line += '  ' + nm.split(' ')[0] + ' ic ' + (ic == null ? '—' : ic.toFixed(3)) + ' t ' + (t == null ? '—' : t.toFixed(1));
    }
    console.log(line);
  }

  // pick winner by SPX IC
  const icOf = (rows) => { const { xs, ys } = align(rows, benches['SPX'], 21); return spearman(xs, ys) || 0; };
  const winner = icOf(variants.skip) > icOf(variants.r1m) ? 'skip' : 'r1m';
  console.log('winner:', winner);
  const rows = variants[winner];

  // ---- A: IC table across benches & horizons ----
  console.log('\n== A: composite (' + winner + ') Spearman IC vs forward returns ==');
  console.log('bench'.padEnd(18) + ['h=5', 'h=10', 'h=21'].map((h) => h.padStart(18)).join(''));
  for (const [name] of BENCHES) {
    let line = name.padEnd(18);
    for (const h of [5, 10, 21]) {
      const { xs, ys } = align(rows, benches[name], h);
      const { ic, t } = bootT(xs, ys, h, 300);
      line += ((ic == null ? '—' : ic.toFixed(3)) + ' (t' + (t == null ? '—' : t.toFixed(1)) + ')').padStart(18);
    }
    console.log(line);
  }

  // ---- C: per-component IC vs fwd SPX 21d → weight suggestions ----
  console.log('\n== C: component IC vs fwd SPX 21d ==');
  const compKeys = ['trend', 'eqmom', 'vol', 'credit', 'usd', 'growth', 'curve', 'idr', 'div'];
  const sugg = {};
  for (const k of compKeys) {
    const xs = [], ys = [];
    rows.forEach((r) => {
      const c = r.comps.find((x) => x.key === k);
      const si = spxBy.get(r.date);
      if (!c || si == null) return;
      const fr = fwdRet(spx, si, 21);
      if (fr == null) return;
      xs.push(c.score); ys.push(fr);
    });
    const ic = spearman(xs, ys);
    sugg[k] = ic == null ? 0 : Math.max(0, ic);
    console.log(k.padEnd(8), xs.length, 'obs  ic', ic == null ? '—' : ic.toFixed(3));
  }
  const icSum = Object.values(sugg).reduce((a, b) => a + b, 0) || 1;
  console.log('suggested weights (0.5*IC-prop + 0.5*equal, x9):');
  const wOut = {};
  compKeys.forEach((k) => { wOut[k] = 0.5 * (sugg[k] / icSum) * compKeys.length + 0.5; });
  console.log(JSON.stringify(Object.fromEntries(compKeys.map((k) => [k, +wOut[k].toFixed(2)]))));

  // ---- D: whipsaw ----
  const flips = (arr) => arr.reduce((a, r, i) => a + (i > 0 && r !== arr[i - 1] ? 1 : 0), 0);
  const rawLabels = rows.map((r) => (r.score >= 0.35 ? 'ON' : r.score <= -0.35 ? 'OFF' : 'NEU'));
  const smLabels = rows.map((r) => r.label);
  console.log('\n== D: label flips over ' + rows.length + ' sessions ==  raw:', flips(rawLabels), ' hysteresis:', flips(smLabels));

  // ---- E: playbook — per label, mean fwd21 desk-minus-SPX + naive CI ----
  console.log('\n== E: regime playbook (mean fwd 21d desk return minus SPX, %) ==');
  const labels = ['RISK-ON', 'NEUTRAL', 'RISK-OFF'];
  console.log('desk'.padEnd(18) + labels.map((l) => l.padStart(16)).join(''));
  for (const [name] of BENCHES) {
    if (name === 'SPX') continue;
    const bench = benches[name];
    const bBy = new Map(bench.map((o, i) => [o.date, i]));
    let line = name.padEnd(18);
    for (const lab of labels) {
      const vals = [];
      rows.forEach((r) => {
        if (r.label !== lab) return;
        const bi = bBy.get(r.date), si = spxBy.get(r.date);
        if (bi == null || si == null) return;
        const fb = fwdRet(bench, bi, 21), fs = fwdRet(spx, si, 21);
        if (fb == null || fs == null) return;
        vals.push(fb - fs);
      });
      if (vals.length < 40) { line += '—'.padStart(16); continue; }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
      // overlapping-window correction: effective N ≈ N/21
      const se = sd / Math.sqrt(Math.max(2, vals.length / 21));
      const sig = Math.abs(mean) > 1.96 * se ? '*' : ' ';
      line += (mean.toFixed(2) + sig + ' n' + vals.length).padStart(16);
    }
    console.log(line);
  }
  console.log('\n(* = |mean| > 1.96 SE with overlap-corrected N. Cells without * are noise — do not trade them.)');
}
main().catch((e) => { console.error(e); process.exit(2); });
