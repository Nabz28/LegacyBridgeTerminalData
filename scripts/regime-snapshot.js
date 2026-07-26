// regime-snapshot — roadmap 4.1: persist BOTH regime dials into
// management.monitor_regime_history and diff vs the prior session to raise
// rows in management.monitor_alerts (regime flips, flags turning on).
//
// Runs the SAME engine as the terminal (launcher/scripts/monitor-regime.js)
// so server history can never diverge from what users see. Invoked nightly
// by GitHub Actions (.github/workflows/monitor-ci.yml) and on demand:
//
//   SUPABASE_SERVICE_KEY=... node scripts/regime-snapshot.js            # daily upsert + alerts
//   SUPABASE_SERVICE_KEY=... node scripts/regime-snapshot.js --backfill # seed full history (no alerts)
//
// History rows carry score/raw/label/coverage/comps for every session;
// flags are only stored for rows written by daily runs (the engine derives
// flags from the LAST row's component notes — backfilled rows store []).
'use strict';
const path = require('path');
global.window = {};
const R = require(path.join(__dirname, '..', 'launcher', 'scripts', 'monitor-regime.js'));

const SB = 'https://adnubucjlezrtusbicja.supabase.co';
const FN = SB + '/functions/v1';
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!KEY) { console.error('SUPABASE_SERVICE_KEY not set'); process.exit(1); }
const BACKFILL = process.argv.includes('--backfill');

const yah = (id) => fetch(FN + '/series-proxy?source=YAHOO&id=' + encodeURIComponent(id) + '&range=5y&interval=1d')
  .then((r) => r.json()).then((j) => j.obs || []);
const fred = (id) => fetch(FN + '/series-proxy?source=FRED&id=' + id).then((r) => r.json())
  .then((j) => (j.obs || []).slice(-1400));
const bars = (id) => fetch(FN + '/monitor-bars?ticker=' + encodeURIComponent(id) + '&range=5y')
  .then((r) => r.json()).then((j) => j.bars || []);

const rest = (pathQ, opts) => fetch(SB + '/rest/v1/' + pathQ, {
  ...opts,
  headers: {
    apikey: KEY, Authorization: 'Bearer ' + KEY,
    'Content-Type': 'application/json',
    'Accept-Profile': 'management', 'Content-Profile': 'management',
    ...(opts && opts.headers),
  },
}).then(async (r) => {
  if (!r.ok) throw new Error('PostgREST ' + r.status + ' on ' + pathQ + ': ' + (await r.text()).slice(0, 300));
  const t = await r.text();
  return t ? JSON.parse(t) : null;
});

const compact = (comps) => comps.map((c) => ({ key: c.key, label: c.label, value: c.value, score: +c.score.toFixed(3), note: c.note }));
const histRow = (dial, r, flags) => ({
  dial, date: r.date, score: +r.smooth.toFixed(4), raw: +r.score.toFixed(4),
  label: r.label, coverage: r.coverage != null ? +r.coverage.toFixed(3) : null,
  flags: flags || [], comps: compact(r.comps),
});

async function upsertHistory(rows) {
  for (let i = 0; i < rows.length; i += 400) {
    await rest('monitor_regime_history?on_conflict=dial,date', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 400)),
    });
  }
}
async function insertAlerts(rows) {
  if (!rows.length) return;
  await rest('monitor_alerts?on_conflict=dial,date,kind', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

async function main() {
  console.log('fetching legs…');
  const [spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10, tp10,
    jkse, eido, spy, eidoBars] = await Promise.all([
    yah('^GSPC'), yah('^VIX'), yah('^VIX3M'), yah('DX-Y.NYB'), yah('HG=F'), yah('GC=F'), yah('IDR=X'),
    fred('BAMLH0A0HYM2'), fred('T10Y2Y'), fred('DGS10'), fred('THREEFYTP10'),
    yah('^JKSE'), yah('EIDO'), yah('SPY'), bars('EIDO'),
  ]);
  const hyFx = await Promise.all(['MXN=X', 'BRL=X', 'INR=X', 'ZAR=X', 'IDR=X'].map(yah));
  const fundFx = await Promise.all(['JPY=X', 'CHF=X'].map(yah));

  const gl = R.computeRegime({ spx, vix, vix3m, dxy, copper, gold, usdidr, hyOas, curve2s10, dgs10 });
  const id = R.computeRegimeID({ jkse, usdidr, eido, spy, copper, gold, eidoBars, hyFx, fundFx, tp10 });
  if (!gl || !id) { console.error('BUILD FAILED', { gl: !!gl, id: !!id }); process.exit(1); }
  console.log('global:', gl.label, gl.score.toFixed(2), 'asOf', gl.asOf, '· id:', id.label, id.score.toFixed(2), 'asOf', id.asOf);

  if (BACKFILL) {
    const glRows = gl._rows.map((r) => histRow('global', r, r.date === gl.asOf ? gl.flags : []));
    const idRows = id._rows.map((r) => histRow('id', r, r.date === id.asOf ? id.flags : []));
    await upsertHistory(glRows);
    await upsertHistory(idRows);
    console.log('backfilled', glRows.length, 'global +', idRows.length, 'id rows');
    return;
  }

  // ---- daily: upsert today's row per dial, diff vs the prior stored row ----
  const alerts = [];
  for (const [dial, reg] of [['global', gl], ['id', id]]) {
    await upsertHistory([histRow(dial, reg._rows[reg._rows.length - 1], reg.flags)]);
    const prior = await rest('monitor_regime_history?dial=eq.' + dial + '&date=lt.' + reg.asOf + '&order=date.desc&limit=1', {});
    const prev = prior && prior[0];
    const dialName = dial === 'global' ? 'GLOBAL' : 'IDX';
    if (prev && prev.label && prev.label !== reg.label) {
      alerts.push({
        dial, date: reg.asOf, kind: 'flip',
        title: dialName + ' regime flipped: ' + prev.label + ' → ' + reg.label,
        detail: 'smoothed score ' + Number(prev.score).toFixed(2) + ' → ' + reg.score.toFixed(2) + ' (' + prev.date + ' → ' + reg.asOf + ')',
      });
    }
    const prevFlags = new Set((prev && prev.flags) || []);
    reg.flags.filter((f) => !prevFlags.has(f)).forEach((f) => {
      alerts.push({
        dial, date: reg.asOf, kind: 'flag:' + f,
        title: dialName + ' flag on: ' + f,
        detail: 'first seen ' + reg.asOf + ' · score ' + reg.score.toFixed(2) + ' (' + reg.label + ')',
      });
    });
  }
  await insertAlerts(alerts);
  console.log('daily snapshot written ·', alerts.length, 'new alert(s)');
  alerts.forEach((a) => console.log('  ALERT:', a.title));
}
main().catch((e) => { console.error(e); process.exit(2); });
