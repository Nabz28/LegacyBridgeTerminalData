// ================================================================
// MONITOR · regime engine (window.MONITOR_REGIME) — pure math, no I/O.
// Turns a handful of cross-asset series into a Risk-On / Neutral /
// Risk-Off composite plus named condition flags, and scores per-desk
// money-flow signals (momentum, relative strength, breadth).
//
// Design rules:
//   - Every component maps to a score in [-1, +1] with EXPLICIT
//     thresholds (documented inline) — no magic ML, auditable by eye.
//   - Composite = weighted mean of available components; missing data
//     lowers coverage, never fabricates a value.
//   - Positive score == risk-appetite supportive.
// All series are ascending [{date, value}] dailies.
// ================================================================
(function () {
  'use strict';

  // ---- series helpers ------------------------------------------------------
  const last = (s) => (s && s.length ? s[s.length - 1].value : null);
  const lastDate = (s) => (s && s.length ? s[s.length - 1].date : null);

  // value N trading days back (defensive against short series)
  function back(s, n) {
    if (!s || s.length <= n) return null;
    return s[s.length - 1 - n].value;
  }
  // % return over n trading days
  function ret(s, n) {
    const a = back(s, n), b = last(s);
    return a != null && b != null && a !== 0 ? (b / a - 1) * 100 : null;
  }
  // absolute change over n trading days (for yields/spreads, in native units)
  function chg(s, n) {
    const a = back(s, n), b = last(s);
    return a != null && b != null ? b - a : null;
  }
  // simple moving average of the last n values
  function sma(s, n) {
    if (!s || s.length < n) return null;
    let sum = 0;
    for (let i = s.length - n; i < s.length; i++) sum += s[i].value;
    return sum / n;
  }
  // percentile rank of the latest value within the whole series [0..100]
  function pctile(s) {
    const v = last(s);
    if (v == null || s.length < 30) return null;
    let below = 0;
    for (let i = 0; i < s.length; i++) if (s[i].value <= v) below++;
    return (below / s.length) * 100;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // linear score: value x mapped so x<=lo → -1, x>=hi → +1
  const lin = (x, lo, hi) => (x == null ? null : clamp(((x - lo) / (hi - lo)) * 2 - 1, -1, 1));

  // ---- cross-asset regime --------------------------------------------------
  // inputs: { spx, vix, dxy, copper, gold, usdidr }  — Yahoo dailies (~6mo)
  //         { hyOas, curve2s10 }                     — FRED dailies (~2y)
  // Every component: { key, label, value (display), score, note }
  function computeRegime(inp) {
    const comps = [];
    const push = (key, label, value, score, note, weight) => {
      if (score == null || value == null) return;
      comps.push({ key, label, value, score: clamp(score, -1, 1), note, weight: weight || 1 });
    };

    // 1) Equity trend — SPX vs 50d MA (±4% band) and 1M return (±6% band).
    if (inp.spx) {
      const px = last(inp.spx), ma = sma(inp.spx, 50), r1m = ret(inp.spx, 21);
      if (px != null && ma != null) {
        const dev = ((px / ma) - 1) * 100;
        push('trend', 'S&P vs 50d', dev.toFixed(1) + '%', lin(dev, -4, 4),
          'price ' + (dev >= 0 ? 'above' : 'below') + ' trend', 1.2);
      }
      if (r1m != null) push('eqmom', 'S&P 1M', r1m.toFixed(1) + '%', lin(r1m, -6, 6), 'equity momentum', 1);
    }

    // 2) Volatility — VIX level (12→30 maps +1→-1) with a 10d spike kicker.
    if (inp.vix) {
      const v = last(inp.vix), d10 = ret(inp.vix, 10);
      if (v != null) {
        let s = lin(v, 12, 30);
        if (s != null) s = -s;                       // high VIX = risk-off
        if (d10 != null && d10 > 25) s = clamp((s == null ? 0 : s) - 0.4, -1, 1); // vol spike
        push('vol', 'VIX', v.toFixed(1), s, d10 != null && d10 > 25 ? 'vol spiking (+' + d10.toFixed(0) + '% 10d)' : 'volatility level', 1.2);
      }
    }

    // 3) Credit — HY OAS: percentile of the 2y window (tight=risk-on) plus a
    //    widening kicker when the 20d move exceeds +30bp.
    if (inp.hyOas) {
      const lvl = last(inp.hyOas), pc = pctile(inp.hyOas), d20 = chg(inp.hyOas, 20);
      if (lvl != null && pc != null) {
        let s = lin(pc, 80, 20);                     // low percentile (tight) → +1
        if (d20 != null && d20 > 0.30) s = clamp(s - 0.5, -1, 1);
        push('credit', 'HY OAS', lvl.toFixed(2) + '%', s,
          d20 != null && d20 > 0.30 ? 'spreads widening fast' : 'credit ' + (pc <= 40 ? 'tight' : pc >= 70 ? 'stressed' : 'mid-range'), 1.4);
      }
    }

    // 4) USD — DXY 1M trend. Strong dollar = EM/liquidity headwind (±3% band).
    if (inp.dxy) {
      const r1m = ret(inp.dxy, 21);
      if (r1m != null) push('usd', 'DXY 1M', (r1m >= 0 ? '+' : '') + r1m.toFixed(1) + '%', -lin(r1m, -3, 3), r1m > 1.5 ? 'USD headwind' : r1m < -1.5 ? 'USD tailwind' : 'dollar quiet', 1);
    }

    // 5) Growth impulse — copper/gold ratio 1M trend (±6% band).
    if (inp.copper && inp.gold) {
      const cg = [], n = Math.min(inp.copper.length, inp.gold.length);
      const co = inp.copper.slice(-n), go = inp.gold.slice(-n);
      for (let i = 0; i < n; i++) {
        if (go[i].value) cg.push({ date: co[i].date, value: co[i].value / go[i].value });
      }
      const r1m = ret(cg, 21);
      if (r1m != null) push('growth', 'Copper/Gold 1M', (r1m >= 0 ? '+' : '') + r1m.toFixed(1) + '%', lin(r1m, -6, 6), r1m > 2 ? 'growth impulse' : r1m < -2 ? 'safety bid' : 'growth vs safety flat', 1);
    }

    // 6) Curve — 2s10s: inverted (<0) is a caution; steepening from inversion
    //    reads as late-cycle normalization (mildly positive), bull-flattening
    //    is neutral. Score = level band (−0.5%→+1.5%).
    if (inp.curve2s10) {
      const lvl = last(inp.curve2s10), d3m = chg(inp.curve2s10, 63);
      if (lvl != null) {
        push('curve', '2s10s', lvl.toFixed(2) + '%', lin(lvl, -0.5, 1.5),
          lvl < 0 ? 'curve inverted' : d3m != null && d3m > 0.25 ? 'steepening' : 'curve normal', 0.8);
      }
    }

    // 7) IDR — home-market stress gauge: USD/IDR 1M (±3% band, weaker IDR = risk-off locally).
    if (inp.usdidr) {
      const r1m = ret(inp.usdidr, 21);
      if (r1m != null) push('idr', 'USD/IDR 1M', (r1m >= 0 ? '+' : '') + r1m.toFixed(1) + '%', -lin(r1m, -3, 3), r1m > 1.5 ? 'IDR under pressure' : r1m < -1.5 ? 'IDR firming' : 'rupiah stable', 0.8);
    }

    if (!comps.length) return null;
    const wsum = comps.reduce((a, c) => a + c.weight, 0);
    const score = comps.reduce((a, c) => a + c.score * c.weight, 0) / wsum;
    const label = score >= 0.30 ? 'RISK-ON' : score <= -0.30 ? 'RISK-OFF' : 'NEUTRAL';
    // named condition flags (independent of the composite)
    const flags = [];
    const byKey = {};
    comps.forEach((c) => { byKey[c.key] = c; });
    if (byKey.credit && /widening/.test(byKey.credit.note)) flags.push('CREDIT STRESS');
    if (byKey.vol && /spiking/.test(byKey.vol.note)) flags.push('VOL SPIKE');
    if (byKey.usd && byKey.usd.note === 'USD headwind') flags.push('USD HEADWIND');
    if (byKey.curve && byKey.curve.note === 'curve inverted') flags.push('CURVE INVERTED');
    if (byKey.idr && byKey.idr.note === 'IDR under pressure') flags.push('IDR PRESSURE');
    if (byKey.growth && byKey.growth.note === 'growth impulse') flags.push('GROWTH IMPULSE');
    return { score, label, components: comps, flags, asOf: lastDate(inp.spx) || lastDate(inp.hyOas) };
  }

  // ---- per-desk money-flow signals ----------------------------------------
  // bench: desk benchmark dailies (~6mo); mkt: reference market dailies (SPX).
  // Returns flags like {momentum:{r1m,r3m,score}, rs:{diff,score}}.
  function deskSignals(bench, mkt) {
    if (!bench || bench.length < 30) return null;
    const r1m = ret(bench, 21), r3m = ret(bench, 63);
    const out = { r1m, r3m };
    if (r1m != null) out.momentum = r1m >= 3 ? 'strong' : r1m >= 0.5 ? 'up' : r1m <= -3 ? 'weak' : r1m <= -0.5 ? 'down' : 'flat';
    if (mkt && mkt.length > 21 && r1m != null) {
      const m1 = ret(mkt, 21);
      if (m1 != null) {
        out.rsDiff = r1m - m1;
        out.rs = out.rsDiff >= 1.5 ? 'leader' : out.rsDiff <= -1.5 ? 'laggard' : 'inline';
      }
    }
    return out;
  }

  // breadth from a batch of live quotes: {adv, dec, tot, advPct, bigMovers, medianChg}
  function breadth(quotes) {
    const chgs = Object.values(quotes || {})
      .filter((q) => q && !q.error && q.changePct != null)
      .map((q) => q.changePct);
    if (chgs.length < 5) return null;
    const adv = chgs.filter((c) => c > 0).length;
    const sorted = [...chgs].sort((a, b) => a - b);
    return {
      adv, dec: chgs.filter((c) => c < 0).length, tot: chgs.length,
      advPct: (adv / chgs.length) * 100,
      bigUp: chgs.filter((c) => c >= 2).length,
      bigDown: chgs.filter((c) => c <= -2).length,
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  window.MONITOR_REGIME = { computeRegime, deskSignals, breadth, _t: { ret, chg, sma, pctile, lin } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.MONITOR_REGIME;
})();
