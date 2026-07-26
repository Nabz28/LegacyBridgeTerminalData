// regime-id-candidates — pre-registered gates for roadmap 3.2 / 3.3 / 3.4,
// candidate components for the Indonesia dial. Run AFTER 3.1 shipped.
//
//   3.2 FX carry-unwind basket: mean(ret21 USD/high-yielders) minus
//       mean(ret21 USD/funders), z-scored & inverted.
//       GATE: beats DXY head-to-head on the IDX sleeve — |state corr| and
//       |fwd 21d IC| vs ^JKSE both >= the DXY signal's.
//   3.3 EM flow proxy: d21 ln(EEM/SPY).
//       GATE: LEADS ^JKSE — cross-correlogram of its daily changes vs JKSE
//       daily returns peaks at positive lag (proxy first), else it just
//       duplicates 3.2 and is dropped.
//   3.4 ACM 10y term premium (FRED THREEFYTP10), 30d change inverted.
//       GATE: |t| > 1.5 for IC vs fwd 21d EIDO or EEM, else drop.
//
//   node scripts/regime-id-candidates.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));
const { retDaysAt, zAt, idxAt } = R._t;

const FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1';
const yah = (id) => fetch(FN + '/series-proxy?source=YAHOO&id=' + encodeURIComponent(id) + '&range=5y&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '/series-proxy?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-1400));

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
const pearson = (x, y) => {
  const n = x.length;
  if (n < 30) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
};

// build a daily z-signal series [{date, value(z)}] on its own calendar
function zSeries(raw, win) {
  const vals = raw.map((o) => o.value);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const z = zAt(vals, i, win);
    if (z != null) out.push({ date: raw[i].date, value: z });
  }
  return out;
}

async function main() {
  console.log('fetching legs…');
  const HY = ['MXN=X', 'BRL=X', 'INR=X', 'ZAR=X', 'IDR=X'];
  const FUND = ['JPY=X', 'CHF=X'];
  const [jkse, eido, eem, emb, spy, dxy, tp] = await Promise.all([
    yah('^JKSE'), yah('EIDO'), yah('EEM'), yah('EMB'), yah('SPY'), yah('DX-Y.NYB'), fred('THREEFYTP10'),
  ]);
  const hyS = await Promise.all(HY.map(yah));
  const fundS = await Promise.all(FUND.map(yah));
  console.log('jkse', jkse.length, 'eem', eem.length, 'emb', emb.length, 'tp', tp.length,
    'hy', hyS.map((s) => s.length).join('/'), 'fund', fundS.map((s) => s.length).join('/'));

  const jkBy = new Map(jkse.map((o, i) => [o.date, i]));
  const eidoBy = new Map(eido.map((o, i) => [o.date, i]));
  const eemBy = new Map(eem.map((o, i) => [o.date, i]));

  // helper: align a signal series to JKSE dates with STRICT < (no same-day
  // US close look-ahead), then compute state corr + fwd ICs vs ^JKSE.
  const evalVsJkse = (sig) => {
    const xs = [], yTrail = [], yF21 = [], yF10 = [];
    jkse.forEach((o, ji) => {
      const si = idxAt(sig, o.date, true);
      if (si < 0) return;
      const tr = trailRet(jkse, ji, 21), f21 = fwdRet(jkse, ji, 21), f10 = fwdRet(jkse, ji, 10);
      if (tr == null) return;
      xs.push(sig[si].value); yTrail.push(tr);
      yF21.push(f21); yF10.push(f10);
    });
    const pairs21 = xs.map((v, i) => [v, yF21[i]]).filter((p) => p[1] != null);
    const pairs10 = xs.map((v, i) => [v, yF10[i]]).filter((p) => p[1] != null);
    return {
      n: xs.length,
      state: spearman(xs, yTrail),
      ic21: bootT(pairs21.map((p) => p[0]), pairs21.map((p) => p[1]), 21, 300),
      ic10: bootT(pairs10.map((p) => p[0]), pairs10.map((p) => p[1]), 10, 300),
    };
  };

  // ---- 3.2 carry-unwind basket ----
  console.log('\n== 3.2: FX carry-unwind basket vs DXY (both z-inverted, on ^JKSE) ==');
  // per-date mean ret21 across pairs (USD/XXX: + = EM weakening)
  const meanRet21 = (list) => {
    const byDate = new Map();
    list.forEach((s) => {
      for (let i = 0; i < s.length; i++) {
        const r = retDaysAt(s, i, 30);
        if (r == null) continue;
        const d = s[i].date;
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(r);
      }
    });
    return [...byDate.entries()]
      .filter(([, v]) => v.length >= Math.max(1, list.length - 1))
      .map(([d, v]) => ({ date: d, value: v.reduce((a, b) => a + b, 0) / v.length }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  };
  const hyR = meanRet21(hyS);
  const fundR = meanRet21(fundS);
  const fundBy = new Map(fundR.map((o) => [o.date, o.value]));
  const unwindRaw = hyR.filter((o) => fundBy.has(o.date))
    .map((o) => ({ date: o.date, value: o.value - fundBy.get(o.date) }));
  const carrySig = zSeries(unwindRaw, 252).map((o) => ({ date: o.date, value: -o.value })); // inverted: unwind = risk-off
  const dxyR = [];
  for (let i = 0; i < dxy.length; i++) { const r = retDaysAt(dxy, i, 30); if (r != null) dxyR.push({ date: dxy[i].date, value: r }); }
  const dxySig = zSeries(dxyR, 252).map((o) => ({ date: o.date, value: -o.value }));
  const evC = evalVsJkse(carrySig), evD = evalVsJkse(dxySig);
  const fmt = (e) => 'n=' + e.n + '  state ' + (e.state == null ? '—' : e.state.toFixed(3)) +
    '  ic21 ' + (e.ic21.ic == null ? '—' : e.ic21.ic.toFixed(3)) + ' (t' + (e.ic21.t == null ? '—' : e.ic21.t.toFixed(1)) + ')' +
    '  ic10 ' + (e.ic10.ic == null ? '—' : e.ic10.ic.toFixed(3)) + ' (t' + (e.ic10.t == null ? '—' : e.ic10.t.toFixed(1)) + ')';
  console.log('  carry :', fmt(evC));
  console.log('  DXY   :', fmt(evD));
  const pass32 = evC.state != null && evD.state != null &&
    Math.abs(evC.state) >= Math.abs(evD.state) && Math.abs(evC.ic21.ic || 0) >= Math.abs(evD.ic21.ic || 0);
  console.log('  GATE 3.2 (carry >= DXY on BOTH |state| and |ic21|):', pass32 ? 'PASS' : 'FAIL');

  // ---- 3.3 EM flow proxy: does d21 ln(EEM/SPY) LEAD ^JKSE? ----
  console.log('\n== 3.3: EM flow proxy lead-lag (daily d ln(EEM/SPY) vs ^JKSE daily ret) ==');
  const spyBy = new Map(spy.map((o) => [o.date, o.value]));
  const ratio = eem.filter((o) => spyBy.has(o.date)).map((o) => ({ date: o.date, value: Math.log(o.value / spyBy.get(o.date)) }));
  const dRatio = [];
  for (let i = 1; i < ratio.length; i++) dRatio.push({ date: ratio[i].date, value: ratio[i].value - ratio[i - 1].value });
  const jkRet = [];
  for (let i = 1; i < jkse.length; i++) {
    if (jkse[i - 1].value) jkRet.push({ date: jkse[i].date, value: Math.log(jkse[i].value / jkse[i - 1].value) });
  }
  // align by JKSE session index: signal at strict-< then lag/lead in SESSIONS
  const sigOnJk = jkRet.map((o) => { const si = idxAt(dRatio, o.date, true); return si >= 0 ? dRatio[si].value : null; });
  const rets = jkRet.map((o) => o.value);
  const corrAtLag = (lag) => { // lag>0: signal LEADS by `lag` sessions
    const xs = [], ys = [];
    for (let i = 0; i < rets.length; i++) {
      const j = i - lag;
      if (j < 0 || j >= sigOnJk.length || sigOnJk[j] == null) continue;
      xs.push(sigOnJk[j]); ys.push(rets[i]);
    }
    return pearson(xs, ys);
  };
  let best = { lag: null, c: null };
  const prof = [];
  for (let lag = -5; lag <= 5; lag++) {
    const c = corrAtLag(lag);
    prof.push(lag + ':' + (c == null ? '—' : c.toFixed(3)));
    if (c != null && (best.c == null || Math.abs(c) > Math.abs(best.c))) best = { lag, c };
  }
  console.log('  correlogram (lag: corr, lag>0 = proxy leads):', prof.join('  '));
  console.log('  peak |corr| at lag', best.lag, '(' + (best.c == null ? '—' : best.c.toFixed(3)) + ')');
  const pass33 = best.lag != null && best.lag > 0;
  console.log('  GATE 3.3 (peak at positive lag):', pass33 ? 'PASS' : 'FAIL — duplicates FX complex, drop');

  // ---- 3.4 term premium: d30 THREEFYTP10 inverted vs fwd EIDO / EEM ----
  console.log('\n== 3.4: ACM 10y term premium (d30, inverted) vs fwd 21d EIDO / EEM ==');
  const tpChg = [];
  for (let i = 0; i < tp.length; i++) {
    const j = idxAt(tp, new Date(Date.parse(tp[i].date) - 30 * 86400000).toISOString().slice(0, 10), false);
    if (j >= 0 && tp[j].value != null && tp[i].value != null) tpChg.push({ date: tp[i].date, value: -(tp[i].value - tp[j].value) });
  }
  const tpSig = zSeries(tpChg, 252);
  const evalFwd = (sig, s, sBy, h) => {
    const xs = [], ys = [];
    s.forEach((o, i) => {
      const si = idxAt(sig, o.date, true);
      if (si < 0) return;
      const fr = fwdRet(s, i, h);
      if (fr == null) return;
      xs.push(sig[si].value); ys.push(fr);
    });
    return bootT(xs, ys, h, 300);
  };
  const tpEido = evalFwd(tpSig, eido, eidoBy, 21);
  const tpEem = evalFwd(tpSig, eem, eemBy, 21);
  console.log('  vs EIDO fwd21: ic', tpEido.ic == null ? '—' : tpEido.ic.toFixed(3), '(t' + (tpEido.t == null ? '—' : tpEido.t.toFixed(1)) + ')');
  console.log('  vs EEM  fwd21: ic', tpEem.ic == null ? '—' : tpEem.ic.toFixed(3), '(t' + (tpEem.t == null ? '—' : tpEem.t.toFixed(1)) + ')');
  const pass34 = (tpEido.t != null && Math.abs(tpEido.t) > 1.5) || (tpEem.t != null && Math.abs(tpEem.t) > 1.5);
  console.log('  GATE 3.4 (|t| > 1.5 on either):', pass34 ? 'PASS' : 'FAIL — drop');

  console.log('\n==== VERDICTS ====');
  console.log('3.2 carry basket :', pass32 ? 'SHIP as ID-dial component' : 'DROP (document)');
  console.log('3.3 EM flow proxy:', pass33 ? 'SHIP as ID-dial component' : 'DROP (document)');
  console.log('3.4 term premium :', pass34 ? 'SHIP as ID-dial component' : 'DROP (document)');
}
main().catch((e) => { console.error(e); process.exit(2); });
