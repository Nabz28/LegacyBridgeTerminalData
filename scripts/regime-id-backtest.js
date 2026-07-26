// regime-id-backtest — validation gate for the Indonesia dial (roadmap 3.1).
// House verdict from the 1.1 run: composites here are tape-STATE gauges, not
// return forecasters. The ship gate for a SECOND dial is therefore:
//   A. STATE test — does the ID composite describe the ID tape better than
//      the global composite does? (contemporaneous Spearman of the smoothed
//      score vs TRAILING 21d ^JKSE return, head-to-head on common dates)
//   B. forward ICs vs fwd 5/10/21d ^JKSE + EIDO (for the record; expected
//      ~0 or negative, same as global)
//   C. per-component forward IC (record only)
//   D. hysteresis flip count (sanity)
//   node scripts/regime-id-backtest.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1';
const yah = (id) => fetch(FN + '/series-proxy?source=YAHOO&id=' + encodeURIComponent(id) + '&range=5y&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '/series-proxy?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-1400));
const bars = (id) => fetch(FN + '/monitor-bars?ticker=' + encodeURIComponent(id) + '&range=5y')
  .then((r) => r.json()).then((j) => j.bars || []);

// ---- stats (same machinery as regime-backtest.js) ----
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
  const m = (n + 1) / 2;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (rx[i] - m) * (ry[i] - m); dx += (rx[i] - m) ** 2; dy += (ry[i] - m) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}
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
const trailRet = (s, i, h) => (i - h >= 0 && s[i - h].value ? (s[i].value / s[i - h].value - 1) * 100 : null);

async function main() {
  console.log('fetching 5y inputs…');
  const [jkse, usdidr, eido, spy, copper, gold, eidoBars,
    spx, vix, vix3m, dxy, hyOas, curve2s10, dgs10] = await Promise.all([
    yah('^JKSE'), yah('IDR=X'), yah('EIDO'), yah('SPY'), yah('HG=F'), yah('GC=F'), bars('EIDO'),
    yah('^GSPC'), yah('^VIX'), yah('^VIX3M'), yah('DX-Y.NYB'),
    fred('BAMLH0A0HYM2'), fred('T10Y2Y'), fred('DGS10'),
  ]);
  console.log('legs: jkse', jkse.length, 'idr', usdidr.length, 'eido', eido.length, 'spy', spy.length,
    'cu', copper.length, 'au', gold.length, 'eidoBars', eidoBars.length);

  const idBuilt = R.buildCompositeID({ jkse, usdidr, eido, spy, copper, gold, eidoBars });
  if (!idBuilt) { console.log('ID BUILD FAILED'); process.exit(1); }
  const idRows = idBuilt.rows;
  console.log('ID composite rows:', idRows.length, '(' + idRows[0].date + ' → ' + idRows[idRows.length - 1].date + ')');
  const avgCov = idRows.reduce((a, r) => a + r.coverage, 0) / idRows.length;
  console.log('avg coverage:', avgCov.toFixed(2));

  const glBuilt = R.buildComposite({ spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10 });
  if (!glBuilt) { console.log('GLOBAL BUILD FAILED'); process.exit(1); }
  const glRows = glBuilt.rows;

  const by = (s) => new Map(s.map((o, i) => [o.date, i]));
  const jkBy = by(jkse), eidoBy = by(eido);
  const glByDate = new Map(glRows.map((r) => [r.date, r]));

  // ---- A: STATE test, head-to-head on common dates ----
  // global rows are on the US calendar; for a JKSE date use the last global
  // row STRICTLY BEFORE it (same no-look-ahead convention as the engine).
  const glDates = glRows.map((r) => r.date);
  const glAt = (d) => {
    let lo = 0, hi = glDates.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (glDates[mid] < d) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans >= 0 ? glRows[ans] : null;
  };
  const xId = [], xGl = [], yTrail = [];
  idRows.forEach((r) => {
    const ji = jkBy.get(r.date);
    const g = glAt(r.date);
    if (ji == null || !g) return;
    const tr = trailRet(jkse, ji, 21);
    if (tr == null) return;
    xId.push(r.smooth); xGl.push(g.smooth); yTrail.push(tr);
  });
  const stateId = spearman(xId, yTrail);
  const stateGl = spearman(xGl, yTrail);
  console.log('\n== A: STATE test — Spearman(smooth score, TRAILING 21d ^JKSE return), n=' + xId.length + ' ==');
  console.log('  ID dial     :', stateId == null ? '—' : stateId.toFixed(3));
  console.log('  Global dial :', stateGl == null ? '—' : stateGl.toFixed(3));
  const pass = stateId != null && stateGl != null && stateId > stateGl + 0.10;
  console.log('  GATE (ID > global + 0.10):', pass ? 'PASS' : 'FAIL');

  // ---- B: forward ICs (record) ----
  console.log('\n== B: forward ICs (Spearman smooth vs fwd return) ==');
  for (const [nm, s, sBy] of [['^JKSE', jkse, jkBy], ['EIDO', eido, eidoBy]]) {
    let line = nm.padEnd(8);
    for (const h of [5, 10, 21]) {
      const xs = [], ys = [];
      idRows.forEach((r) => {
        const i = sBy.get(r.date);
        if (i == null) return;
        const fr = fwdRet(s, i, h);
        if (fr == null) return;
        xs.push(r.smooth); ys.push(fr);
      });
      const { ic, t } = bootT(xs, ys, h, 300);
      line += ('  h=' + h + ' ic ' + (ic == null ? '—' : ic.toFixed(3)) + ' (t' + (t == null ? '—' : t.toFixed(1)) + ')');
    }
    console.log(line);
  }

  // ---- C: per-component forward IC vs fwd ^JKSE 21d (record) ----
  console.log('\n== C: component fwd IC vs ^JKSE 21d ==');
  for (const k of ['trend', 'mom', 'idr', 'eidors', 'growth', 'flow']) {
    const xs = [], ys = [];
    idRows.forEach((r) => {
      const c = r.comps.find((x) => x.key === k);
      const ji = jkBy.get(r.date);
      if (!c || ji == null) return;
      const fr = fwdRet(jkse, ji, 21);
      if (fr == null) return;
      xs.push(c.score); ys.push(fr);
    });
    const ic = spearman(xs, ys);
    console.log(' ', k.padEnd(8), String(xs.length).padStart(5), 'obs  ic', ic == null ? '—' : ic.toFixed(3));
  }

  // ---- D: flips ----
  const flips = (arr) => arr.reduce((a, r, i) => a + (i > 0 && r !== arr[i - 1] ? 1 : 0), 0);
  const rawL = idRows.map((r) => (r.score >= 0.35 ? 'ON' : r.score <= -0.35 ? 'OFF' : 'NEU'));
  const smL = idRows.map((r) => r.label);
  console.log('\n== D: label flips over ' + idRows.length + ' sessions ==  raw:', flips(rawL), ' hysteresis:', flips(smL));

  console.log('\ncurrent ID state:', idRows[idRows.length - 1].label,
    'smooth', idRows[idRows.length - 1].smooth.toFixed(2),
    'asOf', idRows[idRows.length - 1].date);
  console.log('\nVERDICT:', pass
    ? 'SHIP the second dial (ID describes the ID tape better than the global dial by >0.10 Spearman).'
    : 'DO NOT ship as-is — ID dial does not beat the global dial on its own tape; document and revisit.');
}
main().catch((e) => { console.error(e); process.exit(2); });
