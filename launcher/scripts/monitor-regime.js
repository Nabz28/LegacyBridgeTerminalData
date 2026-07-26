// ================================================================
// MONITOR · regime engine v2 (window.MONITOR_REGIME) — pure math, no I/O.
//
// v2 upgrades (roadmap Phases 0-2, each gated by scripts/regime-backtest.js):
//   0.1 FRED legs (HY OAS, 2s10s, DGS10) align with STRICT < date — a
//       T+1-published print is never visible same-day; staleness decays
//       a component's weight to 0 over 5 business days.
//   0.2 label hysteresis: EMA-smoothed score + Schmitt trigger
//       (enter |s̄|>=0.35, exit at 0.20) — no more daily flip-flops.
//   0.3 continuous kickers (vol spike, credit widening, backwardation,
//       bear steepening) — no binary jumps.
//   0.4 composition-stable history: component availability is frozen for
//       a whole buildComposite run; coverage is reported.
//   0.5 calendar-day return windows (retDays) — gappy series can't
//       stretch "1M" into 6 weeks.
//   1.2 adaptive normalization: every component is a rolling 252-obs
//       z-score (or percentile) of its own derived stat — no fixed bands.
//   2.3 VIX term structure (VIX/VIX3M backwardation kicker).
//   2.4 credit-equity divergence component.
//   2.5 bear- vs bull-steepening discrimination (needs dgs10).
//
// Architecture: buildComposite(inp) computes daily component-score rows
// over the whole SPX calendar once (O(n) per component); computeRegime
// and computeRegimeSeries are views on the last row / last N rows.
// All series are ascending [{date, value}] dailies.
// ================================================================
(function () {
  'use strict';

  const DAY = 86400000;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- series helpers ------------------------------------------------------
  const last = (s) => (s && s.length ? s[s.length - 1].value : null);
  const lastDate = (s) => (s && s.length ? s[s.length - 1].date : null);

  // index of last obs with date <= d (binary search); -1 if none
  function idxAt(s, d, strict) {
    let lo = 0, hi = s.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const ok = strict ? s[mid].date < d : s[mid].date <= d;
      if (ok) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  // calendar-window return / change ending at index i
  function retDaysAt(s, i, days) {
    if (i < 1) return null;
    const target = new Date(Date.parse(s[i].date) - days * DAY).toISOString().slice(0, 10);
    const j = idxAt(s, target, false);
    if (j < 0 || j >= i) return null;
    const a = s[j].value, b = s[i].value;
    return a ? (b / a - 1) * 100 : null;
  }
  function chgDaysAt(s, i, days) {
    if (i < 1) return null;
    const target = new Date(Date.parse(s[i].date) - days * DAY).toISOString().slice(0, 10);
    const j = idxAt(s, target, false);
    if (j < 0 || j >= i) return null;
    return s[i].value - s[j].value;
  }
  function smaAt(s, i, n) {
    if (i + 1 < n) return null;
    let sum = 0;
    for (let k = i - n + 1; k <= i; k++) sum += s[k].value;
    return sum / n;
  }
  const ret = (s, n) => (s && s.length > n && s[s.length - 1 - n].value ? (last(s) / s[s.length - 1 - n].value - 1) * 100 : null);

  // rolling z of arr[i] vs trailing `win` values (incl. i); null-aware
  function zAt(arr, i, win) {
    const lo = Math.max(0, i - win + 1);
    let n = 0, sum = 0;
    for (let k = lo; k <= i; k++) { const v = arr[k]; if (v != null) { n++; sum += v; } }
    if (n < 60 || arr[i] == null) return null;
    const mean = sum / n;
    let varr = 0;
    for (let k = lo; k <= i; k++) { const v = arr[k]; if (v != null) varr += (v - mean) * (v - mean); }
    const sd = Math.sqrt(varr / Math.max(1, n - 1));
    return sd > 0 ? (arr[i] - mean) / sd : 0;
  }
  // rolling percentile rank of arr[i] within trailing window → [0,100]
  function pctileAt(arr, i, win) {
    const lo = Math.max(0, i - win + 1);
    let n = 0, below = 0;
    for (let k = lo; k <= i; k++) { const v = arr[k]; if (v != null) { n++; if (v <= arr[i]) below++; } }
    if (n < 60 || arr[i] == null) return null;
    return (below / n) * 100;
  }
  const zScore = (z) => (z == null ? null : clamp(z / 1.5, -1, 1));

  function bdaysBetween(d0, d1) {
    let n = 0;
    let t = Date.parse(d0);
    const end = Date.parse(d1);
    while (t < end) { t += DAY; const dow = new Date(t).getUTCDay(); if (dow !== 0 && dow !== 6) n++; }
    return n;
  }

  // ---- composite ----------------------------------------------------------
  // Component weights are DESCRIPTIVE (hand-balanced), not IC-fitted.
  // The 2026-07-24 harness run (scripts/regime-backtest.js, 954 sessions)
  // found composite ICs vs forward returns are mildly NEGATIVE at 5-21d
  // (stretched risk-on mean-reverts) and per-component ICs are unstable/
  // regime-dependent — so IC-weighting was REJECTED by its gate and this
  // dial is presented as a tape-STATE gauge, not a return forecaster.
  const WEIGHTS = { trend: 1.1, eqmom: 1.0, vol: 1.1, credit: 1.3, usd: 0.9, growth: 1.0, curve: 0.7, idr: 0.7, div: 0.8 };

  // inp: { spx, vix, vix3m, dxy, copper, gold, usdidr,  — Yahoo (<= asOf)
  //        hyOas, curve2s10, dgs10 }                     — FRED (STRICT < asOf)
  // opts: { momKind: 'r1m'|'skip' }
  // Returns { dates, rows: [ {date, score, comps:[...] } ] } after warmup.
  function buildComposite(inp, opts) {
    const momKind = (opts && opts.momKind) || 'r1m';
    if (!inp.spx || inp.spx.length < 320) return null;
    const spx = inp.spx;
    const N = spx.length;
    const WIN = 252;

    // availability frozen for the whole run (0.4)
    const has = {
      vix: !!(inp.vix && inp.vix.length > 300),
      vix3m: !!(inp.vix3m && inp.vix3m.length > 60),
      dxy: !!(inp.dxy && inp.dxy.length > 300),
      growth: !!(inp.copper && inp.gold && inp.copper.length > 300 && inp.gold.length > 300),
      credit: !!(inp.hyOas && inp.hyOas.length > 300),
      curve: !!(inp.curve2s10 && inp.curve2s10.length > 300),
      dgs10: !!(inp.dgs10 && inp.dgs10.length > 300),
      idr: !!(inp.usdidr && inp.usdidr.length > 300),
    };

    // date-keyed copper/gold ratio (never positional)
    let cuau = null;
    if (has.growth) {
      const goldBy = new Map(inp.gold.map((o) => [o.date, o.value]));
      cuau = [];
      inp.copper.forEach((o) => { const g = goldBy.get(o.date); if (g) cuau.push({ date: o.date, value: o.value / g }); });
      if (cuau.length < 300) { cuau = null; has.growth = false; }
    }

    // ---- daily stat arrays on the SPX calendar ----
    // For non-SPX series, map spx date -> its own index (Yahoo <=, FRED <).
    const mapIdx = (s, strict) => spx.map((o) => (s ? idxAt(s, o.date, strict) : -1));
    const iVix = has.vix ? mapIdx(inp.vix, false) : null;
    const iV3 = has.vix3m ? mapIdx(inp.vix3m, false) : null;
    const iDxy = has.dxy ? mapIdx(inp.dxy, false) : null;
    const iCu = has.growth ? mapIdx(cuau, false) : null;
    const iHy = has.credit ? mapIdx(inp.hyOas, true) : null;      // 0.1: strict
    const iCv = has.curve ? mapIdx(inp.curve2s10, true) : null;   // 0.1: strict
    const iG10 = has.dgs10 ? mapIdx(inp.dgs10, true) : null;      // 0.1: strict
    const iIdr = has.idr ? mapIdx(inp.usdidr, false) : null;

    const A = {
      dev: new Array(N).fill(null), mom: new Array(N).fill(null),
      vix: new Array(N).fill(null), ts: new Array(N).fill(null), vixSpike: new Array(N).fill(null),
      hy: new Array(N).fill(null), hyChg: new Array(N).fill(null),
      dxyR: new Array(N).fill(null), cuauR: new Array(N).fill(null),
      cvLvl: new Array(N).fill(null), cvChg: new Array(N).fill(null), g10Chg: new Array(N).fill(null),
      idrR: new Array(N).fill(null), spxR21: new Array(N).fill(null),
    };
    for (let i = 0; i < N; i++) {
      const ma = smaAt(spx, i, 50);
      if (ma) A.dev[i] = (spx[i].value / ma - 1) * 100;
      A.mom[i] = momKind === 'skip'
        ? (() => { const a = retDaysAt(spx, i, 180), b = retDaysAt(spx, i, 30); return a != null && b != null ? a - b : null; })()
        : retDaysAt(spx, i, 30);
      A.spxR21[i] = retDaysAt(spx, i, 30);
      if (iVix && iVix[i] >= 0) {
        A.vix[i] = inp.vix[iVix[i]].value;
        A.vixSpike[i] = retDaysAt(inp.vix, iVix[i], 14);
        if (iV3 && iV3[i] >= 0 && inp.vix3m[iV3[i]].value) A.ts[i] = inp.vix[iVix[i]].value / inp.vix3m[iV3[i]].value;
      }
      if (iHy && iHy[i] >= 0) { A.hy[i] = inp.hyOas[iHy[i]].value; A.hyChg[i] = chgDaysAt(inp.hyOas, iHy[i], 30); }
      if (iDxy && iDxy[i] >= 0) A.dxyR[i] = retDaysAt(inp.dxy, iDxy[i], 30);
      if (iCu && iCu[i] >= 0) A.cuauR[i] = retDaysAt(cuau, iCu[i], 30);
      if (iCv && iCv[i] >= 0) { A.cvLvl[i] = inp.curve2s10[iCv[i]].value; A.cvChg[i] = chgDaysAt(inp.curve2s10, iCv[i], 30); }
      if (iG10 && iG10[i] >= 0) A.g10Chg[i] = chgDaysAt(inp.dgs10, iG10[i], 30);
      if (iIdr && iIdr[i] >= 0) A.idrR[i] = retDaysAt(inp.usdidr, iIdr[i], 30);
    }

    // staleness decay factor for a mapped series at spx index i (0.1)
    const decay = (s, iMap, i) => {
      if (!iMap || iMap[i] < 0) return 0;
      const sd = bdaysBetween(s[iMap[i]].date, spx[i].date);
      return Math.max(0, 1 - sd / 5);
    };

    const start = 300; // warmup for 252-window stats
    const rows = [];
    for (let i = start; i < N; i++) {
      const comps = [];
      const push = (key, label, value, score, note, wScale) => {
        if (score == null || value == null) return;
        comps.push({ key, label, value, score: clamp(score, -1, 1), note, weight: (WEIGHTS[key] || 1) * (wScale == null ? 1 : wScale) });
      };

      // 1) trend — SPX vs 50d, z-scored (1.2)
      push('trend', 'S&P vs 50d', A.dev[i] != null ? A.dev[i].toFixed(1) + '%' : null,
        zScore(zAt(A.dev, i, WIN)), A.dev[i] >= 0 ? 'price above trend' : 'price below trend');

      // 2) momentum — r1m or skip-month (harness-chosen), z-scored
      push('eqmom', momKind === 'skip' ? 'S&P 6m-1m' : 'S&P 1M',
        A.mom[i] != null ? (A.mom[i] >= 0 ? '+' : '') + A.mom[i].toFixed(1) + '%' : null,
        zScore(zAt(A.mom, i, WIN)), 'equity momentum');

      // 3) vol — VIX level z (inverted) + continuous spike & backwardation kickers (0.3, 2.3)
      if (has.vix && A.vix[i] != null) {
        let s = zScore(zAt(A.vix, i, WIN));
        if (s != null) s = -s;
        let note = 'volatility level';
        if (A.vixSpike[i] != null && A.vixSpike[i] > 15) {
          s = clamp((s == null ? 0 : s) - 0.4 * clamp((A.vixSpike[i] - 15) / 20, 0, 1), -1, 1);
          note = 'vol spiking (+' + A.vixSpike[i].toFixed(0) + '% 2wk)';
        }
        if (A.ts[i] != null && A.ts[i] > 0.95) {
          s = clamp((s == null ? 0 : s) - 0.5 * clamp((A.ts[i] - 0.95) / 0.15, 0, 1), -1, 1);
          if (A.ts[i] >= 1) note = 'curve backwardated (VIX>VIX3M)';
        }
        push('vol', 'VIX', A.vix[i].toFixed(1), s, note, decay(inp.vix, iVix, i));
      }

      // 4) credit — HY OAS 252-pctile + continuous widening kicker (lagged input)
      if (has.credit && A.hy[i] != null) {
        const pc = pctileAt(A.hy, i, WIN);
        if (pc != null) {
          let s = clamp(((pc - 80) / (20 - 80)) * 2 - 1, -1, 1); // pc 80→-1, 20→+1
          let note = pc <= 40 ? 'credit tight' : pc >= 70 ? 'credit stressed' : 'credit mid-range';
          if (A.hyChg[i] != null && A.hyChg[i] > 0.15) {
            s = clamp(s - 0.5 * clamp((A.hyChg[i] - 0.15) / 0.30, 0, 1), -1, 1);
            note = 'spreads widening';
          }
          push('credit', 'HY OAS', A.hy[i].toFixed(2) + '%', s, note, decay(inp.hyOas, iHy, i));
        }
      }

      // 5) USD — DXY 30-cal-day return, z-scored, inverted
      if (has.dxy && A.dxyR[i] != null) {
        const z = zAt(A.dxyR, i, WIN);
        push('usd', 'DXY 1M', (A.dxyR[i] >= 0 ? '+' : '') + A.dxyR[i].toFixed(1) + '%',
          z == null ? null : -zScore(z), A.dxyR[i] > 1.5 ? 'USD headwind' : A.dxyR[i] < -1.5 ? 'USD tailwind' : 'dollar quiet',
          decay(inp.dxy, iDxy, i));
      }

      // 6) growth — copper/gold 1M, z-scored
      if (has.growth && A.cuauR[i] != null) {
        push('growth', 'Copper/Gold 1M', (A.cuauR[i] >= 0 ? '+' : '') + A.cuauR[i].toFixed(1) + '%',
          zScore(zAt(A.cuauR, i, WIN)), A.cuauR[i] > 2 ? 'growth impulse' : A.cuauR[i] < -2 ? 'safety bid' : 'growth vs safety flat');
      }

      // 7) curve — 2s10s level z + bear-steepening penalty (2.5, lagged)
      if (has.curve && A.cvLvl[i] != null) {
        let s = zScore(zAt(A.cvLvl, i, WIN));
        let note = A.cvLvl[i] < 0 ? 'curve inverted' : 'curve normal';
        if (has.dgs10 && A.cvChg[i] != null && A.cvChg[i] > 0.10 && A.g10Chg[i] != null && A.g10Chg[i] > 0.25) {
          s = clamp((s == null ? 0 : s) - 0.4 * clamp((A.g10Chg[i] - 0.25) / 0.25, 0, 1), -1, 1);
          note = 'bear steepening (10y selloff)';
        } else if (A.cvChg[i] != null && A.cvChg[i] > 0.25) {
          note = 'steepening';
        }
        push('curve', '2s10s', A.cvLvl[i].toFixed(2) + '%', s, note, decay(inp.curve2s10, iCv, i));
      }

      // 8) IDR — USD/IDR 1M, z-scored, inverted (home-market stress)
      if (has.idr && A.idrR[i] != null) {
        const z = zAt(A.idrR, i, WIN);
        push('idr', 'USD/IDR 1M', (A.idrR[i] >= 0 ? '+' : '') + A.idrR[i].toFixed(1) + '%',
          z == null ? null : -zScore(z), A.idrR[i] > 1.5 ? 'IDR under pressure' : A.idrR[i] < -1.5 ? 'IDR firming' : 'rupiah stable',
          decay(inp.usdidr, iIdr, i));
      }

      // 9) credit-equity divergence (2.4): spreads widening WHILE equity up
      if (has.credit && A.hyChg[i] != null && A.spxR21[i] != null) {
        const zH = zAt(A.hyChg, i, WIN), zS = zAt(A.spxR21, i, WIN);
        if (zH != null && zS != null && zH > 0 && zS > 0) {
          push('div', 'Credit÷Equity', 'z ' + zH.toFixed(1) + '/' + zS.toFixed(1),
            -clamp(Math.min(zH, zS) / 1.5, 0, 1),
            zH > 1 && zS > 1 ? 'credit-equity divergence' : 'mild divergence',
            decay(inp.hyOas, iHy, i));
        }
      }

      if (!comps.length) continue;
      const wsum = comps.reduce((a, c) => a + c.weight, 0);
      if (wsum <= 0) continue;
      const score = comps.reduce((a, c) => a + c.score * c.weight, 0) / wsum;
      const wFull = Object.keys(WEIGHTS).reduce((a, k) => a + WEIGHTS[k], 0);
      rows.push({ date: spx[i].date, score, comps, coverage: Math.min(1, wsum / wFull) });
    }
    if (!rows.length) return null;
    applySmoothing(rows);
    return { rows };
  }

  // ---- smoothing + hysteresis labels (0.2), shared by both dials ----------
  function applySmoothing(rows) {
    let sBar = rows[0].score;
    let label = 'NEUTRAL';
    rows.forEach((r) => {
      sBar = 0.7 * sBar + 0.3 * r.score;
      r.smooth = sBar;
      if (label === 'RISK-ON') { if (sBar < 0.20) label = sBar <= -0.35 ? 'RISK-OFF' : 'NEUTRAL'; }
      else if (label === 'RISK-OFF') { if (sBar > -0.20) label = sBar >= 0.35 ? 'RISK-ON' : 'NEUTRAL'; }
      else { if (sBar >= 0.35) label = 'RISK-ON'; else if (sBar <= -0.35) label = 'RISK-OFF'; }
      r.label = label;
    });
  }

  // ---- public API (kept compatible with v1 callers) -----------------------
  function computeRegime(inp, opts) {
    const built = buildComposite(inp, opts);
    if (!built) return null;
    const lastRow = built.rows[built.rows.length - 1];
    const comps = lastRow.comps;
    const byKey = {};
    comps.forEach((c) => { byKey[c.key] = c; });
    const flags = [];
    if (byKey.credit && /widening/.test(byKey.credit.note)) flags.push('CREDIT STRESS');
    if (byKey.vol && /spiking/.test(byKey.vol.note)) flags.push('VOL SPIKE');
    if (byKey.vol && /backwardated/.test(byKey.vol.note)) flags.push('VIX BACKWARDATION');
    if (byKey.usd && byKey.usd.note === 'USD headwind') flags.push('USD HEADWIND');
    if (byKey.curve && byKey.curve.note === 'curve inverted') flags.push('CURVE INVERTED');
    if (byKey.curve && /bear steepening/.test(byKey.curve.note)) flags.push('BEAR STEEPENING');
    if (byKey.idr && byKey.idr.note === 'IDR under pressure') flags.push('IDR PRESSURE');
    if (byKey.growth && byKey.growth.note === 'growth impulse') flags.push('GROWTH IMPULSE');
    if (byKey.div && byKey.div.note === 'credit-equity divergence') flags.push('CREDIT-EQUITY DIVERGENCE');
    return {
      score: lastRow.smooth, raw: lastRow.score, label: lastRow.label,
      components: comps, flags, asOf: lastRow.date, coverage: lastRow.coverage,
      _rows: built.rows,
    };
  }

  function computeRegimeSeries(inp, lookback, opts) {
    const reg = (inp && inp._rows) ? { _rows: inp._rows } : computeRegime(inp, opts);
    if (!reg || !reg._rows) return null;
    const rows = reg._rows;
    const n = Math.min(lookback || 60, rows.length);
    const points = rows.slice(-n).map((r) => ({ date: r.date, score: r.smooth, label: r.label }));
    const cur = points[points.length - 1].label;
    let streak = 0;
    for (let i = rows.length - 1; i >= 0 && rows[i].label === cur; i--) streak++;
    return { points, streak, label: cur };
  }

  // ---- per-desk money-flow signals (1.4: beta-adjusted RS, vol-scaled mom)
  // bench/mkt: ~1-2y dailies. Returns v1 fields + betaRS additions.
  function deskSignals(bench, mkt) {
    if (!bench || bench.length < 90) return null;
    const r1m = ret(bench, 21), r3m = ret(bench, 63);
    const out = { r1m, r3m, r1d: ret(bench, 1), r1w: ret(bench, 5), r2w: ret(bench, 10) };
    // vol-scaled momentum: z = r1m / (sigma_daily * sqrt(21))
    const rets = [];
    for (let i = Math.max(1, bench.length - 126); i < bench.length; i++) {
      if (bench[i - 1].value) rets.push(Math.log(bench[i].value / bench[i - 1].value));
    }
    if (rets.length > 40 && r1m != null) {
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rets.length - 1));
      const momZ = sd > 0 ? (r1m / 100) / (sd * Math.sqrt(21)) : null;
      out.momZ = momZ;
      out.momentum = momZ == null ? 'flat' : momZ >= 1.5 ? 'strong' : momZ >= 0.5 ? 'up' : momZ <= -1.5 ? 'weak' : momZ <= -0.5 ? 'down' : 'flat';
    } else if (r1m != null) {
      out.momentum = r1m >= 3 ? 'strong' : r1m >= 0.5 ? 'up' : r1m <= -3 ? 'weak' : r1m <= -0.5 ? 'down' : 'flat';
    }
    if (mkt && mkt.length > 90 && r1m != null) {
      // beta over the common window of daily log-returns
      const mBy = new Map(mkt.map((o) => [o.date, o.value]));
      const rb = [], rm = [];
      for (let i = 1; i < bench.length; i++) {
        const m0 = mBy.get(bench[i - 1].date), m1 = mBy.get(bench[i].date);
        if (m0 && m1 && bench[i - 1].value) { rb.push(Math.log(bench[i].value / bench[i - 1].value)); rm.push(Math.log(m1 / m0)); }
      }
      const m1r = ret(mkt, 21);
      if (rb.length > 60 && m1r != null) {
        const mb = rb.reduce((a, b) => a + b, 0) / rb.length, mm = rm.reduce((a, b) => a + b, 0) / rm.length;
        let cov = 0, vm = 0;
        for (let i = 0; i < rb.length; i++) { cov += (rb[i] - mb) * (rm[i] - mm); vm += (rm[i] - mm) * (rm[i] - mm); }
        const beta = vm > 0 ? cov / vm : 1;
        out.beta = beta;
        // residual RS: desk 1M minus beta-scaled market 1M, labeled at ±1 residual sd
        const resid = [];
        for (let i = 0; i < rb.length; i++) resid.push(rb[i] - beta * rm[i]);
        const rsd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / resid.length) * Math.sqrt(21) * 100;
        out.rsDiff = r1m - beta * m1r;
        out.rs = rsd > 0 ? (out.rsDiff >= rsd ? 'leader' : out.rsDiff <= -rsd ? 'laggard' : 'inline') : 'inline';
      }
    }
    return out;
  }

  // breadth from a batch of live quotes (unchanged from v1)
  function breadth(quotes) {
    const chgs = Object.values(quotes || {})
      .filter((q) => q && !q.error && q.changePct != null)
      .map((q) => q.changePct);
    if (chgs.length < 5) return null;
    const adv = chgs.filter((c) => c > 0).length;
    const sorted = [...chgs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return {
      adv, dec: chgs.filter((c) => c < 0).length, tot: chgs.length,
      advPct: (adv / chgs.length) * 100,
      bigUp: chgs.filter((c) => c >= 2).length,
      bigDown: chgs.filter((c) => c <= -2).length,
      median,
    };
  }

  // trend breadth from OHLCV bars (2.1): % above 50d SMA, % at 20d highs.
  function trendBreadth(barsByTicker) {
    let above = 0, nh = 0, n = 0;
    Object.keys(barsByTicker || {}).forEach((t) => {
      const bars = barsByTicker[t];
      if (!bars || bars.length < 55) return;
      const closes = bars.map((b) => b.c);
      const lastC = closes[closes.length - 1];
      const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
      const hi20 = Math.max(...closes.slice(-20));
      n++;
      if (lastC > sma50) above++;
      if (lastC >= hi20) nh++;
    });
    if (n < 5) return null;
    return { pctAbove50: (above / n) * 100, pctNH20: (nh / n) * 100, n };
  }

  // volume flow v2 (2.2): DOLLAR volume rDV, 20d up/down dollar-volume
  // ratio, OBV-vs-price divergence, partial-session flag.
  function volumeFlow(barsByTicker) {
    const per = {};
    const rdvs = [];
    let surges = 0, surgesUp = 0, udUp = 0, udDown = 0, divergers = 0;
    const today = new Date().toISOString().slice(0, 10);
    let partial = false;
    Object.keys(barsByTicker || {}).forEach((t) => {
      const bars = barsByTicker[t];
      if (!bars || bars.length < 25) return;
      const lastBar = bars[bars.length - 1];
      if (!lastBar.v || !lastBar.c) return;
      if (lastBar.date === today) partial = true;
      const win = bars.slice(-21, -1);
      const dvs = win.map((b) => (b.v && b.c ? b.v * b.c : null)).filter((v) => v);
      if (dvs.length < 10) return;
      const avgDV = dvs.reduce((a, b) => a + b, 0) / dvs.length;
      if (!avgDV) return;
      const rdv = (lastBar.v * lastBar.c) / avgDV;
      const up = lastBar.o != null ? lastBar.c >= lastBar.o
        : bars.length > 1 ? lastBar.c >= bars[bars.length - 2].c : true;
      // 20d up/down dollar-volume ratio (accumulation vs distribution)
      let uDV = 0, dDV = 0;
      for (let i = bars.length - 20; i < bars.length; i++) {
        if (i < 1) continue;
        const b = bars[i];
        if (!b.v || !b.c) continue;
        const dv = b.v * b.c;
        if (b.c >= bars[i - 1].c) uDV += dv; else dDV += dv;
      }
      const ud = dDV > 0 ? uDV / dDV : null;
      // OBV 20d slope vs price 20d slope → divergence
      let obv = 0;
      const obvArr = [];
      for (let i = Math.max(1, bars.length - 21); i < bars.length; i++) {
        const b = bars[i];
        if (b.v) obv += (b.c >= bars[i - 1].c ? 1 : -1) * b.v;
        obvArr.push(obv);
      }
      const priceUp20 = bars.length > 21 ? lastBar.c >= bars[bars.length - 21].c : null;
      const obvUp20 = obvArr.length > 1 ? obvArr[obvArr.length - 1] >= obvArr[0] : null;
      const diverging = priceUp20 != null && obvUp20 != null && priceUp20 !== obvUp20;
      per[t] = { rvol: rdv, up, ud, diverging };
      rdvs.push(rdv);
      if (ud != null) { if (ud >= 1) udUp++; else udDown++; }
      if (diverging) divergers++;
      if (rdv >= 1.8) { surges++; if (up) surgesUp++; }
    });
    const n = rdvs.length;
    if (n < 5) return null;
    rdvs.sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 ? rdvs[mid] : (rdvs[mid - 1] + rdvs[mid]) / 2;
    return { perName: per, median, surges, surgesUp, n, accum: udUp, distrib: udDown, divergers, partial };
  }

  // ---- Indonesia dial (roadmap 3.1) ---------------------------------------
  // Parallel composite on the ^JKSE calendar. All non-Jakarta series (FX,
  // US-listed EIDO/SPY, futures) map with STRICT < — a Jakarta close cannot
  // observe the same calendar date's US close. ID 10y was DROPPED from v1:
  // TVC:ID10Y is embed-only, no fetchable daily series in the stack.
  // Weights are DESCRIPTIVE (same house verdict as the global dial: this is
  // a tape-STATE gauge, not a return forecaster).
  // carry 0.8 + tp 0.6 added 2026-07-26 after their pre-registered gates
  // passed (scripts/regime-id-candidates.js): carry beat DXY head-to-head
  // (state 0.226 vs 0.189, |ic21| 0.104 vs 0.016); term premium IC vs fwd
  // 21d EIDO 0.158 (t 1.8). EM flow proxy (EEM/SPY) FAILED its lead gate
  // (correlogram peaks at lag −1 — ^JKSE leads it) and was dropped.
  const WEIGHTS_ID = { trend: 1.1, mom: 1.0, idr: 1.3, eidors: 1.0, growth: 0.8, flow: 0.7, carry: 0.8, tp: 0.6 };

  // inp: { jkse, usdidr, eido, spy, copper, gold, eidoBars? [{date,c,v}],
  //        hyFx? [series...], fundFx? [series...],  — USD/XXX pairs (3.2)
  //        tp10? }                                   — FRED THREEFYTP10 (3.4)
  function buildCompositeID(inp) {
    if (!inp || !inp.jkse || inp.jkse.length < 320) return null;
    const jk = inp.jkse;
    const N = jk.length;
    const WIN = 252;
    const has = {
      idr: !!(inp.usdidr && inp.usdidr.length > 300),
      rs: !!(inp.eido && inp.spy && inp.eido.length > 300 && inp.spy.length > 300),
      growth: !!(inp.copper && inp.gold && inp.copper.length > 300 && inp.gold.length > 300),
      flow: !!(inp.eidoBars && inp.eidoBars.length > 300),
      carry: !!(inp.hyFx && inp.fundFx && inp.hyFx.filter((s) => s && s.length > 300).length >= 3
        && inp.fundFx.filter((s) => s && s.length > 300).length >= 1),
      tp: !!(inp.tp10 && inp.tp10.length > 300),
    };
    // date-keyed ratios (never positional)
    let cuau = null;
    if (has.growth) {
      const goldBy = new Map(inp.gold.map((o) => [o.date, o.value]));
      cuau = [];
      inp.copper.forEach((o) => { const g = goldBy.get(o.date); if (g) cuau.push({ date: o.date, value: o.value / g }); });
      if (cuau.length < 300) { cuau = null; has.growth = false; }
    }
    let rsRatio = null;
    if (has.rs) {
      const spyBy = new Map(inp.spy.map((o) => [o.date, o.value]));
      rsRatio = [];
      inp.eido.forEach((o) => { const s = spyBy.get(o.date); if (s) rsRatio.push({ date: o.date, value: o.value / s }); });
      if (rsRatio.length < 300) { rsRatio = null; has.rs = false; }
    }
    // signed dollar-volume flow proxy from EIDO bars: 20d sum of
    // sign(Δclose)·close·volume over 20× the trailing-year average dollar
    // volume — a foreign-appetite accumulation/distribution line in [-1, 1].
    let flowSeries = null;
    if (has.flow) {
      const bars = inp.eidoBars.filter((b) => b && b.c != null && b.v != null && b.v > 0);
      if (bars.length > 300) {
        const sdv = [];
        for (let i = 1; i < bars.length; i++) {
          sdv.push({ date: bars[i].date, s: (bars[i].c >= bars[i - 1].c ? 1 : -1) * bars[i].c * bars[i].v, a: bars[i].c * bars[i].v });
        }
        flowSeries = [];
        let s20 = 0, aSum = 0, aN = 0;
        for (let i = 0; i < sdv.length; i++) {
          s20 += sdv[i].s;
          if (i >= 20) s20 -= sdv[i - 20].s;
          aSum += sdv[i].a; aN++;
          if (aN > 252) { aSum -= sdv[i - 252].a; aN--; }
          if (i >= 20 && aSum > 0) flowSeries.push({ date: sdv[i].date, value: s20 / (20 * (aSum / aN)) });
        }
        if (flowSeries.length < 250) { flowSeries = null; has.flow = false; }
      } else has.flow = false;
    }
    // carry-unwind raw series (3.2): mean 30-cal-day return of USD/high-
    // yielder pairs minus the funders' — positive = EM FX weakening while
    // funders bid, the classic carry-unwind footprint.
    let unwind = null;
    if (has.carry) {
      const meanRet = (list) => {
        const byDate = new Map();
        list.filter((s) => s && s.length > 300).forEach((s) => {
          for (let i = 0; i < s.length; i++) {
            const r = retDaysAt(s, i, 30);
            if (r == null) continue;
            if (!byDate.has(s[i].date)) byDate.set(s[i].date, []);
            byDate.get(s[i].date).push(r);
          }
        });
        return [...byDate.entries()].map(([d, v]) => ({ date: d, value: v.reduce((a, b) => a + b, 0) / v.length }))
          .sort((a, b) => (a.date < b.date ? -1 : 1));
      };
      const hyR = meanRet(inp.hyFx);
      const fundBy = new Map(meanRet(inp.fundFx).map((o) => [o.date, o.value]));
      unwind = hyR.filter((o) => fundBy.has(o.date)).map((o) => ({ date: o.date, value: o.value - fundBy.get(o.date) }));
      if (unwind.length < 300) { unwind = null; has.carry = false; }
    }
    // term-premium 30-cal-day change (3.4), computed on the FRED series
    let tpChg = null;
    if (has.tp) {
      tpChg = [];
      for (let i = 0; i < inp.tp10.length; i++) {
        const c = chgDaysAt(inp.tp10, i, 30);
        if (c != null) tpChg.push({ date: inp.tp10[i].date, value: c });
      }
      if (tpChg.length < 300) { tpChg = null; has.tp = false; }
    }

    const mapIdx = (s) => jk.map((o) => (s ? idxAt(s, o.date, true) : -1)); // STRICT for all non-JK series
    const iIdr = has.idr ? mapIdx(inp.usdidr) : null;
    const iRs = has.rs ? mapIdx(rsRatio) : null;
    const iCu = has.growth ? mapIdx(cuau) : null;
    const iFl = has.flow ? mapIdx(flowSeries) : null;
    const iCr = has.carry ? mapIdx(unwind) : null;
    const iTp = has.tp ? mapIdx(tpChg) : null;

    const A = {
      dev: new Array(N).fill(null), mom: new Array(N).fill(null),
      idrR: new Array(N).fill(null), idrR10: new Array(N).fill(null),
      rsR: new Array(N).fill(null), cuauR: new Array(N).fill(null),
      flow: new Array(N).fill(null), carry: new Array(N).fill(null), tp: new Array(N).fill(null),
    };
    for (let i = 0; i < N; i++) {
      const ma = smaAt(jk, i, 50);
      if (ma) A.dev[i] = (jk[i].value / ma - 1) * 100;
      A.mom[i] = retDaysAt(jk, i, 30);
      if (iIdr && iIdr[i] >= 0) { A.idrR[i] = retDaysAt(inp.usdidr, iIdr[i], 30); A.idrR10[i] = retDaysAt(inp.usdidr, iIdr[i], 10); }
      if (iRs && iRs[i] >= 0) A.rsR[i] = retDaysAt(rsRatio, iRs[i], 30);
      if (iCu && iCu[i] >= 0) A.cuauR[i] = retDaysAt(cuau, iCu[i], 30);
      if (iFl && iFl[i] >= 0) A.flow[i] = flowSeries[iFl[i]].value;
      if (iCr && iCr[i] >= 0) A.carry[i] = unwind[iCr[i]].value;
      if (iTp && iTp[i] >= 0) A.tp[i] = tpChg[iTp[i]].value;
    }
    const decay = (s, iMap, i) => {
      if (!iMap || iMap[i] < 0) return 0;
      const sd = bdaysBetween(s[iMap[i]].date, jk[i].date);
      return Math.max(0, 1 - sd / 5);
    };

    const start = 300;
    const rows = [];
    for (let i = start; i < N; i++) {
      const comps = [];
      const push = (key, label, value, score, note, wScale) => {
        if (score == null || value == null) return;
        comps.push({ key, label, value, score: clamp(score, -1, 1), note, weight: (WEIGHTS_ID[key] || 1) * (wScale == null ? 1 : wScale) });
      };

      // 1) trend — JKSE vs 50d, z-scored
      push('trend', 'JKSE vs 50d', A.dev[i] != null ? A.dev[i].toFixed(1) + '%' : null,
        zScore(zAt(A.dev, i, WIN)), A.dev[i] >= 0 ? 'price above trend' : 'price below trend');

      // 2) momentum — JKSE 30-cal-day return, z-scored
      push('mom', 'JKSE 1M', A.mom[i] != null ? (A.mom[i] >= 0 ? '+' : '') + A.mom[i].toFixed(1) + '%' : null,
        zScore(zAt(A.mom, i, WIN)), 'home-market momentum');

      // 3) IDR — USD/IDR 1M z inverted + ACCELERATION ramp (a fast 10-day
      // slide is worse than the level implies)
      if (has.idr && A.idrR[i] != null) {
        const z = zAt(A.idrR, i, WIN);
        let s = z == null ? null : -zScore(z);
        let note = A.idrR[i] > 1.5 ? 'IDR under pressure' : A.idrR[i] < -1.5 ? 'IDR firming' : 'rupiah stable';
        if (A.idrR10[i] != null && A.idrR10[i] > 1.0) {
          s = clamp((s == null ? 0 : s) - 0.4 * clamp((A.idrR10[i] - 1.0) / 1.5, 0, 1), -1, 1);
          note = 'IDR slide accelerating (+' + A.idrR10[i].toFixed(1) + '% 10d)';
        }
        push('idr', 'USD/IDR 1M', (A.idrR[i] >= 0 ? '+' : '') + A.idrR[i].toFixed(1) + '%', s, note, decay(inp.usdidr, iIdr, i));
      }

      // 4) EIDO/SPY — foreign appetite for Indonesia specifically
      if (has.rs && A.rsR[i] != null) {
        push('eidors', 'EIDO/SPY 1M', (A.rsR[i] >= 0 ? '+' : '') + A.rsR[i].toFixed(1) + '%',
          zScore(zAt(A.rsR, i, WIN)),
          A.rsR[i] > 2 ? 'foreign bid for Indonesia' : A.rsR[i] < -2 ? 'Indonesia out of favor' : 'in line with world',
          decay(rsRatio, iRs, i));
      }

      // 5) growth — copper/gold 1M (commodity terms-of-trade impulse)
      if (has.growth && A.cuauR[i] != null) {
        push('growth', 'Copper/Gold 1M', (A.cuauR[i] >= 0 ? '+' : '') + A.cuauR[i].toFixed(1) + '%',
          zScore(zAt(A.cuauR, i, WIN)), A.cuauR[i] > 2 ? 'growth impulse' : A.cuauR[i] < -2 ? 'safety bid' : 'growth vs safety flat',
          decay(cuau, iCu, i));
      }

      // 6) flow — EIDO signed dollar-volume A/D (foreign-flow proxy)
      if (has.flow && A.flow[i] != null) {
        push('flow', 'EIDO $flow 20d', (A.flow[i] >= 0 ? '+' : '') + (A.flow[i] * 100).toFixed(0) + '%',
          zScore(zAt(A.flow, i, WIN)),
          A.flow[i] > 0.15 ? 'accumulation' : A.flow[i] < -0.15 ? 'distribution' : 'flow balanced',
          decay(flowSeries, iFl, i));
      }

      // 7) carry (3.2) — EM-FX carry unwind, z inverted (unwind = risk-off)
      if (has.carry && A.carry[i] != null) {
        const z = zAt(A.carry, i, WIN);
        push('carry', 'EM carry 1M', (A.carry[i] >= 0 ? '+' : '') + A.carry[i].toFixed(1) + '%',
          z == null ? null : -zScore(z),
          A.carry[i] > 1.5 ? 'carry unwinding' : A.carry[i] < -1.5 ? 'carry bid (EM FX firm)' : 'carry quiet',
          decay(unwind, iCr, i));
      }

      // 8) tp (3.4) — ACM 10y term-premium 30d change, z inverted (repricing
      // = EM headwind); FRED series, strict-mapped + staleness-decayed
      if (has.tp && A.tp[i] != null) {
        const z = zAt(A.tp, i, WIN);
        push('tp', 'Term premium Δ1M', (A.tp[i] >= 0 ? '+' : '') + (A.tp[i] * 100).toFixed(0) + 'bp',
          z == null ? null : -zScore(z),
          A.tp[i] > 0.15 ? 'term premium repricing' : A.tp[i] < -0.15 ? 'term premium compressing' : 'term premium quiet',
          decay(tpChg, iTp, i));
      }

      if (!comps.length) continue;
      const wsum = comps.reduce((a, c) => a + c.weight, 0);
      if (wsum <= 0) continue;
      const score = comps.reduce((a, c) => a + c.score * c.weight, 0) / wsum;
      const wFull = Object.keys(WEIGHTS_ID).reduce((a, k) => a + WEIGHTS_ID[k], 0);
      rows.push({ date: jk[i].date, score, comps, coverage: Math.min(1, wsum / wFull) });
    }
    if (!rows.length) return null;
    applySmoothing(rows);
    return { rows };
  }

  function computeRegimeID(inp) {
    const built = buildCompositeID(inp);
    if (!built) return null;
    const lastRow = built.rows[built.rows.length - 1];
    const byKey = {};
    lastRow.comps.forEach((c) => { byKey[c.key] = c; });
    const flags = [];
    if (byKey.idr && /pressure/.test(byKey.idr.note)) flags.push('IDR PRESSURE');
    if (byKey.idr && /accelerating/.test(byKey.idr.note)) flags.push('IDR SLIDE ACCELERATING');
    if (byKey.flow && byKey.flow.note === 'distribution') flags.push('FOREIGN OUTFLOW');
    if (byKey.flow && byKey.flow.note === 'accumulation') flags.push('FOREIGN ACCUMULATION');
    if (byKey.eidors && byKey.eidors.note === 'Indonesia out of favor') flags.push('ID OUT OF FAVOR');
    if (byKey.trend && byKey.trend.note === 'price below trend') flags.push('JKSE BELOW TREND');
    if (byKey.growth && byKey.growth.note === 'growth impulse') flags.push('GROWTH IMPULSE');
    if (byKey.carry && byKey.carry.note === 'carry unwinding') flags.push('CARRY UNWIND');
    if (byKey.tp && byKey.tp.note === 'term premium repricing') flags.push('TERM-PREMIUM REPRICING');
    return {
      score: lastRow.smooth, raw: lastRow.score, label: lastRow.label,
      components: lastRow.comps, flags, asOf: lastRow.date, coverage: lastRow.coverage,
      _rows: built.rows,
    };
  }

  window.MONITOR_REGIME = {
    buildComposite, computeRegime, computeRegimeSeries, deskSignals, breadth, trendBreadth, volumeFlow,
    buildCompositeID, computeRegimeID,
    _t: { retDaysAt, chgDaysAt, zAt, pctileAt, idxAt, bdaysBetween, ret },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.MONITOR_REGIME;
})();
