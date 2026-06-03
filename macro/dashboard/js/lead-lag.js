// lead-lag.js — cross-correlation (lead/lag) analysis between two series.
//
// Answers the question a macro desk actually asks: "does A lead B, and by how
// many months?" Entirely client-side — it reads observations already loaded in
// the chart, so there's no backend dependency.
//
// Method (standard, trend-safe):
//   1. Resample both series to a dense monthly grid (forward-filled).
//   2. Take month-over-month CHANGES (first differences) so we correlate
//      co-movement, not shared trend (which would manufacture spurious r).
//   3. For each lag k in [-K, K], Pearson-correlate A[t] with B[t+k] over the
//      overlapping window. k > 0 ⇒ A leads B by k months.
//   4. Report the lag with the strongest |r| and the full curve for plotting.

(function (global) {
  'use strict';

  function monthIndex(d) { return d.getUTCFullYear() * 12 + d.getUTCMonth(); }

  // Forward-filled dense monthly change-series → { changesByMonth: {m: Δ}, first, last }.
  function monthlyChanges(obs) {
    var pts = (obs || []).filter(function (o) { return o.value != null; })
      .slice().sort(function (a, b) { return a.date - b.date; });
    if (pts.length < 3) return null;
    var m0 = monthIndex(pts[0].date), m1 = monthIndex(pts[pts.length - 1].date);
    if (m1 - m0 < 6) return null;
    // dense level by month (carry last known value forward)
    var level = {};
    var pi = 0, lastVal = pts[0].value;
    for (var m = m0; m <= m1; m++) {
      while (pi < pts.length && monthIndex(pts[pi].date) <= m) { lastVal = pts[pi].value; pi++; }
      level[m] = lastVal;
    }
    var changes = {};
    for (var mm = m0 + 1; mm <= m1; mm++) {
      if (level[mm] != null && level[mm - 1] != null) changes[mm] = level[mm] - level[mm - 1];
    }
    return { changes: changes, first: m0 + 1, last: m1 };
  }

  function pearson(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;
    var sx = 0, sy = 0;
    for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
    var mx = sx / n, my = sy / n;
    var num = 0, dx = 0, dy = 0;
    for (var j = 0; j < n; j++) {
      var a = xs[j] - mx, b = ys[j] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    if (dx < 1e-12 || dy < 1e-12) return null;
    return num / Math.sqrt(dx * dy);
  }

  // Returns { lags:[{lag,r,n}], peak:{lag,r,n}, maxLag, overlapMonths } or { error }.
  function compute(obsA, obsB, maxLag) {
    maxLag = maxLag || 12;
    var A = monthlyChanges(obsA), B = monthlyChanges(obsB);
    if (!A || !B) return { error: 'Need at least ~6 months of overlapping monthly history in both series.' };

    var lags = [];
    var peak = null;
    for (var k = -maxLag; k <= maxLag; k++) {
      var xs = [], ys = [];
      // pair A[m] with B[m+k]
      for (var m = A.first; m <= A.last; m++) {
        var av = A.changes[m];
        var bv = B.changes[m + k];
        if (av == null || bv == null) continue;
        xs.push(av); ys.push(bv);
      }
      var r = pearson(xs, ys);
      if (r == null) { lags.push({ lag: k, r: null, n: xs.length }); continue; }
      var rec = { lag: k, r: r, n: xs.length };
      lags.push(rec);
      if (!peak || Math.abs(r) > Math.abs(peak.r)) peak = rec;
    }
    if (!peak) return { error: 'Series do not overlap enough to correlate.' };
    var overlap = lags.reduce(function (mx, l) { return Math.max(mx, l.n); }, 0);
    return { lags: lags, peak: peak, maxLag: maxLag, overlapMonths: overlap };
  }

  // Plain-English read of the peak.
  function interpret(res, labelA, labelB) {
    if (res.error) return res.error;
    var p = res.peak;
    var strength = Math.abs(p.r);
    var sName = strength >= 0.6 ? 'strong' : strength >= 0.35 ? 'moderate' : strength >= 0.2 ? 'weak' : 'negligible';
    var sign = p.r >= 0 ? 'positive' : 'inverse';
    if (Math.abs(p.r) < 0.2) {
      return 'No meaningful lead/lag relationship in month-over-month changes (best |r| ' + p.r.toFixed(2) + ').';
    }
    if (p.lag === 0) {
      return labelA + ' and ' + labelB + ' move together contemporaneously — ' + sName + ' ' + sign + ' link (r ' + p.r.toFixed(2) + '), no clear lead.';
    }
    var leader = p.lag > 0 ? labelA : labelB;
    var follower = p.lag > 0 ? labelB : labelA;
    var months = Math.abs(p.lag);
    return leader + ' leads ' + follower + ' by ~' + months + ' month' + (months === 1 ? '' : 's') +
      ' — ' + sName + ' ' + sign + ' co-movement (r ' + p.r.toFixed(2) + ').';
  }

  global.LeadLag = { compute: compute, interpret: interpret };
})(window);
