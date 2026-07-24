// Unit tests for the MONITOR regime engine v2 — pure functions, no network.
//   node scripts/test-monitor-engine.js
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

let failed = 0;
const ok = (cond, name) => { console.log((cond ? '  ok  ' : '  FAIL') + ' ' + name); if (!cond) failed++; };
const day = (i) => new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10);
// weekday-only calendar (the engine consumes trading-day series; weekend
// rows would make the FRED T+1 business-day staleness decay oscillate)
const BDAYS = (() => {
  const out = [];
  let i = 0;
  while (out.length < 900) {
    const d = new Date(Date.UTC(2022, 0, 3) + i * 86400000);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    i++;
  }
  return out;
})();
const bday = (i) => BDAYS[i];
const series = (n, fn) => Array.from({ length: n }, (_, i) => ({ date: bday(i), value: fn(i) }));

// ---- helpers ----
const { retDaysAt, zAt, idxAt, bdaysBetween } = R._t;

// retDaysAt uses CALENDAR windows (weekday series: 30 cal days ≈ 22 rows)
{
  const s = series(100, (i) => 100 + i);           // +1/session
  const target = new Date(Date.parse(s[99].date) - 30 * 86400000).toISOString().slice(0, 10);
  let j = -1;
  for (let k = 0; k < s.length; k++) if (s[k].date <= target) j = k;
  const expect = (s[99].value / s[j].value - 1) * 100;
  const r = retDaysAt(s, 99, 30);
  ok(r != null && Math.abs(r - expect) < 0.01, 'retDaysAt: 30-calendar-day window on a weekday grid');
}
// zAt: constant series → z = 0
{
  const arr = new Array(300).fill(5);
  ok(zAt(arr, 299, 252) === 0, 'zAt: constant series has z=0');
}
// idxAt strict vs non-strict (the FRED T+1 lag mechanism)
{
  const s = series(10, (i) => i);
  ok(idxAt(s, s[5].date, false) === 5, 'idxAt: <= includes same day');
  ok(idxAt(s, s[5].date, true) === 4, 'idxAt: < excludes same day (T+1 lag)');
}
// bdays: Mon→Fri same week = 4
ok(bdaysBetween('2026-07-20', '2026-07-24') === 4, 'bdaysBetween: Mon->Fri = 4');

// ---- composition stability (0.4): constant inputs → flat composite ----
{
  const N = 400;
  const inp = {
    spx: series(N, () => 100), vix: series(N, () => 18), dxy: series(N, () => 100),
    copper: series(N, () => 4), gold: series(N, () => 2000), usdidr: series(N, () => 16000),
    hyOas: series(N, () => 3), curve2s10: series(N, () => 0.5), dgs10: series(N, () => 4),
  };
  const built = R.buildComposite(inp);
  ok(!!built && built.rows.length > 50, 'buildComposite: constant inputs build');
  const scores = built.rows.map((r) => r.score);
  const spread = Math.max(...scores) - Math.min(...scores);
  ok(spread < 1e-9, 'composition stable: constant inputs -> flat composite (spread ' + spread.toExponential(1) + ')');
  ok(built.rows.every((r) => r.label === 'NEUTRAL'), 'constant inputs -> NEUTRAL throughout');
}

// ---- hysteresis (0.2): adaptive scoring reacts to SHOCKS, not steady
// trends — flat tape for 450 sessions, then a sharp 40-session melt-up
// (vol crush, credit compression, SPX ramp) must flip to RISK-ON once.
{
  const N = 520, S = 460;
  const after = (i, a, b) => (i < S ? a : a + (b - a) * Math.min(1, (i - S) / 25));
  const inp = {
    spx: series(N, (i) => (i < S ? 100 + 0.01 * Math.sin(i) : 100 * (1 + 0.006 * (i - S)))),
    vix: series(N, (i) => after(i, 22, 12)),
    dxy: series(N, (i) => after(i, 105, 100)),
    copper: series(N, (i) => after(i, 3.5, 4.2)), gold: series(N, () => 2000),
    usdidr: series(N, (i) => after(i, 16500, 16000)),
    hyOas: series(N, (i) => after(i, 4.0, 2.6)),
    curve2s10: series(N, (i) => after(i, 0.2, 0.9)), dgs10: series(N, () => 4),
  };
  const built = R.buildComposite(inp);
  ok(built.rows[built.rows.length - 1].label === 'RISK-ON', 'hysteresis: shock melt-up ends RISK-ON (got ' + built.rows[built.rows.length - 1].label + ')');
  const flips = built.rows.reduce((a, r, i) => a + (i > 0 && r.label !== built.rows[i - 1].label ? 1 : 0), 0);
  ok(flips <= 2, 'hysteresis: single-shock tape flips at most twice (got ' + flips + ')');
}

// ---- volumeFlow v2: dollar-volume surge + partial flag ----
{
  const bars = (n, vol, close) => Array.from({ length: n }, (_, i) => ({
    date: day(i), o: close(i), h: close(i), l: close(i), c: close(i), v: vol(i),
  }));
  const map = {
    AAA: bars(30, (i) => (i === 29 ? 5e6 : 1e6), () => 10),   // 5x $vol surge, flat price
    BBB: bars(30, () => 1e6, (i) => 10 + i * 0.1),
    CCC: bars(30, () => 1e6, () => 10),
    DDD: bars(30, () => 1e6, () => 10),
    EEE: bars(30, () => 1e6, () => 10),
  };
  const f = R.volumeFlow(map);
  ok(!!f && f.n === 5, 'volumeFlow: 5 names computed');
  ok(f.perName.AAA.rvol > 4.5, 'volumeFlow: dollar-volume surge detected (rDV ' + f.perName.AAA.rvol.toFixed(1) + ')');
  ok(f.surges === 1, 'volumeFlow: exactly one surge');
  ok(f.partial === false, 'volumeFlow: synthetic 2024 bars are not partial-today');
}

// ---- trendBreadth ----
{
  const up = Array.from({ length: 60 }, (_, i) => ({ date: day(i), c: 100 + i, v: 1e6, o: 100 + i, h: 100 + i, l: 100 + i }));
  const dn = Array.from({ length: 60 }, (_, i) => ({ date: day(i), c: 200 - i, v: 1e6, o: 200 - i, h: 200 - i, l: 200 - i }));
  const tb = R.trendBreadth({ A: up, B: up, C: up, D: dn, E: dn });
  ok(!!tb && Math.abs(tb.pctAbove50 - 60) < 0.01, 'trendBreadth: 3/5 above 50d = 60%');
}

// ---- deskSignals: beta of a 2x-levered clone ≈ 2 ----
{
  const N = 300;
  const mkt = series(N, (i) => 100 * (1 + 0.001 * Math.sin(i / 5) + 0.0004 * i));
  const bench = mkt.map((o, i) => ({ date: o.date, value: 100 * Math.pow(o.value / 100, 2) }));
  const sig = R.deskSignals(bench, mkt);
  ok(!!sig && sig.beta != null && Math.abs(sig.beta - 2) < 0.15, 'deskSignals: 2x clone beta ~2 (got ' + (sig && sig.beta && sig.beta.toFixed(2)) + ')');
  ok(sig.rs === 'inline' || Math.abs(sig.rsDiff) < 3, 'deskSignals: levered clone is not an RS leader after beta adjustment');
}

console.log(failed ? '\n' + failed + ' FAILURES' : '\nall tests passed');
process.exit(failed ? 1 : 0);
