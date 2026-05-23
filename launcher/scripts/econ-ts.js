// ================================================================
// econ-ts.js — LBC Analysis time-series extensions for window.Econ.
// Plain ES5 (var / function declarations), no DOM, no JSX, no imports.
// Loaded as a plain <script> AFTER econ-core.js. Extends the global
// window.Econ via Object.assign inside an IIFE, building on the toolkit
// exposed at window.Econ._lib (ml-matrix wrappers + stats helpers).
//
// Adds: Ljung-Box, Box-Jenkins ARIMA/SARIMAX (Hannan-Rissanen),
// Holt-Winters ETS, Hodrick-Prescott filter, classical seasonal
// decomposition.
// ================================================================
(function () {
  'use strict';

  var Econ = window.Econ;
  if (!Econ || !Econ._lib) { return; }     // econ-core must load first
  var L = Econ._lib;

  // ---------------- small local helpers ------------------------------------
  function sumSq(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i]; return s; }
  // Inverse standard-normal CDF (Acklam approximation) — for forecast bands.
  function approxNormInv(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var plow = 0.02425, phigh = 1 - plow, q, r;
    if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Difference an array at a given lag (drops the first `lag` elements).
  function diffAt(arr, lag) {
    var out = []; for (var i = lag; i < arr.length; i++) out.push(arr[i] - arr[i - lag]); return out;
  }

  // ====================================================================
  // 1) Ljung-Box Q test on residual autocorrelations.
  //    Q = n(n+2) Σ_{k=1..lags} ρ_k² / (n−k), df = lags − dfAdjust.
  // ====================================================================
  function ljungBox(resid, lags, dfAdjust) {
    var e = L.clean(resid || []);
    var n = e.length;
    lags = lags || Math.min(20, Math.max(1, Math.floor(n / 5)));
    dfAdjust = dfAdjust || 0;
    if (n < lags + 2) return { method: 'ljungBox', error: 'Series too short for Ljung-Box (' + n + ' obs, need ≥ ' + (lags + 2) + ').' };
    // autocorrelations of the residuals (econ-core acf returns [{lag,value,ci}])
    var ac = Econ.acf(e, lags);
    var Q = 0;
    for (var k = 1; k <= lags; k++) {
      var rho = ac[k - 1] ? ac[k - 1].value : 0;
      Q += (rho * rho) / (n - k);
    }
    Q = n * (n + 2) * Q;
    var df = Math.max(1, lags - dfAdjust);
    var cc = L.chiCdf ? L.chiCdf(Q, df) : null;
    var p = cc == null ? null : 1 - cc;
    return { method: 'ljungBox', stat: Q, df: df, p: p, lags: lags };
  }

  // ====================================================================
  // 2) Box-Jenkins ARIMA / ARIMAX / SARIMA / SARIMAX via the
  //    Hannan-Rissanen two-stage OLS algorithm.
  // ====================================================================

  // Build the column-positions (lags) for AR and MA terms given orders.
  function arLags(p, P, s) {
    var lags = [];
    for (var i = 1; i <= p; i++) lags.push(i);
    for (var j = 1; j <= P; j++) lags.push(j * s);
    return lags;
  }

  function arima(y, opts) {
    opts = opts || {};
    var p = opts.p | 0, d = opts.d | 0, q = opts.q | 0;
    var P = opts.P | 0, D = opts.D | 0, Q = opts.Q | 0;
    var s = opts.s || 12;
    var h = opts.h || 12;
    var xreg = opts.xreg || null;          // array of regressor columns (each same length as y)
    var xnames = opts.xnames || null;

    var orig = L.clean(y);
    if (orig.length < 8) return { method: 'arima', error: 'Series too short for ARIMA (' + orig.length + ' obs).' };

    // ---- differencing: seasonal (D times at lag s) then regular (d at lag 1)
    var w = orig.slice();
    var xcols = xreg ? xreg.map(function (c) { return c.slice(); }) : null;
    var i;
    for (i = 0; i < D; i++) {
      if (w.length <= s) return { method: 'arima', error: 'Not enough observations to seasonally difference D=' + D + ' at lag s=' + s + '.' };
      w = diffAt(w, s);
      if (xcols) xcols = xcols.map(function (c) { return diffAt(c, s); });
    }
    for (i = 0; i < d; i++) {
      if (w.length <= 1) return { method: 'arima', error: 'Not enough observations to difference d=' + d + '.' };
      w = diffAt(w, 1);
      if (xcols) xcols = xcols.map(function (c) { return diffAt(c, 1); });
    }
    var n = w.length;
    if (n < 8) return { method: 'arima', error: 'Too few observations after differencing (' + n + ').' };

    var arL = arLags(p, P, s);             // AR lag positions
    var maL = arLags(q, Q, s);             // MA lag positions
    var maxArL = arL.length ? arL[arL.length - 1] : 0;
    var maxMaL = maL.length ? maL[maL.length - 1] : 0;

    // ---- Hannan-Rissanen stage 1: long AR(m) to recover residual proxies ê.
    var m = Math.min(Math.max(maxArL, maxMaL) + 8, Math.floor(n / 2));
    m = Math.max(m, 1);
    var ehat = new Array(n);               // residual proxy aligned to w (0-padded for first m)
    for (i = 0; i < m; i++) ehat[i] = 0;
    if (q + Q > 0) {
      // fit w_t ~ const + Σ_{j=1..m} w_{t-j}
      var X1 = [], Y1 = [];
      for (var t = m; t < n; t++) {
        var row = [1];
        for (var j1 = 1; j1 <= m; j1++) row.push(w[t - j1]);
        X1.push(row); Y1.push(w[t]);
      }
      if (X1.length > X1[0].length) {
        try {
          var f1 = L.olsFit(X1, Y1);
          var r1 = f1.resid.to1DArray();
          for (var k1 = 0; k1 < r1.length; k1++) ehat[m + k1] = r1[k1];
        } catch (e1) { for (i = m; i < n; i++) ehat[i] = 0; }
      } else {
        // not enough rows for the long AR — fall back to zero MA proxies
        for (i = m; i < n; i++) ehat[i] = 0;
      }
    }

    // ---- stage 2: regress w_t on const + AR lags + MA(ê) lags + xreg.
    var start = Math.max(maxArL, maxMaL, (q + Q > 0 ? m : 0));
    var names = ['const'];
    var ai;
    for (ai = 0; ai < arL.length; ai++) names.push((arL[ai] % s === 0 && arL[ai] >= s && P > 0 && arL[ai] > p) ? ('sar' + (arL[ai] / s)) : ('ar' + arL[ai]));
    for (ai = 0; ai < maL.length; ai++) names.push((maL[ai] % s === 0 && maL[ai] >= s && Q > 0 && maL[ai] > q) ? ('sma' + (maL[ai] / s)) : ('ma' + maL[ai]));
    var nx = xcols ? xcols.length : 0;
    for (ai = 0; ai < nx; ai++) names.push(xnames && xnames[ai] ? xnames[ai] : ('xreg' + (ai + 1)));

    var X2 = [], Y2 = [];
    for (var tt = start; tt < n; tt++) {
      var r2 = [1];
      for (ai = 0; ai < arL.length; ai++) r2.push(w[tt - arL[ai]]);
      for (ai = 0; ai < maL.length; ai++) r2.push(ehat[tt - maL[ai]]);
      for (ai = 0; ai < nx; ai++) r2.push(xcols[ai][tt]);
      X2.push(r2); Y2.push(w[tt]);
    }
    if (!X2.length || X2.length <= X2[0].length) {
      return { method: 'arima', error: 'Not enough effective observations (' + X2.length + ') for ' + (X2[0] ? X2[0].length : '?') + ' parameters. Reduce the orders.' };
    }

    var f2, coef, fittedW, residW;
    try {
      f2 = L.olsFit(X2, Y2);
      coef = f2.beta.to1DArray();
      fittedW = f2.fitted.to1DArray();
      residW = f2.resid.to1DArray();
    } catch (e2) {
      return { method: 'arima', error: 'ARIMA estimation failed: ' + (e2 && e2.message ? e2.message : e2) };
    }

    var neff = Y2.length, kparams = coef.length;
    var rss = sumSq(residW);
    var dfres = Math.max(1, neff - kparams);
    var sigma2 = rss / dfres;
    var sigma = Math.sqrt(sigma2);

    // standard errors from XtXinv·σ²
    var XtXinv = f2.XtXinv.to2DArray();
    var se = [], tstat = [], pval = [];
    for (i = 0; i < kparams; i++) {
      var v = XtXinv[i][i] * sigma2;
      var sei = Math.sqrt(Math.max(v, 0));
      se.push(sei);
      var ti = sei ? coef[i] / sei : NaN;
      tstat.push(ti);
      pval.push(L.tPtwo ? L.tPtwo(ti, dfres) : null);
    }

    // information criteria (gaussian, on the differenced scale)
    var llf = -0.5 * neff * (Math.log(2 * Math.PI) + Math.log(rss / neff) + 1);
    var aic = -2 * llf + 2 * kparams;
    var bic = -2 * llf + kparams * Math.log(neff);

    var lb = ljungBox(residW, 8, p + q + P + Q);

    // ------------------------------------------------------------------
    // Forecast on the differenced (w) scale, recursively. future ê = 0.
    // ------------------------------------------------------------------
    var forecast = null, forecastScale = 'level', note = null;
    var canForecast = true;
    if (nx > 0 && !opts.xregFuture) {
      canForecast = false;
      note = 'Forecast skipped: exogenous regressors present but opts.xregFuture not supplied.';
    }

    if (canForecast) {
      // decompose coefficients
      var idx = 1;                          // skip const
      var arCoef = []; for (ai = 0; ai < arL.length; ai++) arCoef.push(coef[idx++]);
      var maCoef = []; for (ai = 0; ai < maL.length; ai++) maCoef.push(coef[idx++]);
      var xCoef = []; for (ai = 0; ai < nx; ai++) xCoef.push(coef[idx++]);
      var c0 = coef[0];

      // working buffers extended forward
      var wExt = w.slice();                 // appended with forecasts
      var eExt = ehat.slice();              // appended with 0 for future
      var fmeansW = [];
      for (var fstep = 1; fstep <= h; fstep++) {
        var idxNow = wExt.length;           // position of the value we are forecasting
        var pred = c0;
        for (ai = 0; ai < arL.length; ai++) { var pos = idxNow - arL[ai]; pred += arCoef[ai] * (pos >= 0 ? wExt[pos] : 0); }
        for (ai = 0; ai < maL.length; ai++) { var posm = idxNow - maL[ai]; pred += maCoef[ai] * (posm >= 0 && posm < eExt.length ? eExt[posm] : 0); }
        if (nx > 0 && opts.xregFuture) {
          for (ai = 0; ai < nx; ai++) {
            var xf = opts.xregFuture[ai];
            pred += xCoef[ai] * (xf && xf[fstep - 1] != null ? xf[fstep - 1] : 0);
          }
        }
        wExt.push(pred); eExt.push(0); fmeansW.push(pred);
      }

      // ψ-weights (MA-∞ representation) for forecast variance accumulation.
      // ψ_0 = 1; ψ_j = Σ_i φ_i ψ_{j-i} + θ_j  (AR via arCoef at lag arL, MA via maCoef at lag maL).
      var psi = [1];
      for (var jp = 1; jp <= h - 1; jp++) {
        var pj = 0;
        for (ai = 0; ai < arL.length; ai++) { var lg = arL[ai]; if (jp - lg >= 0) pj += arCoef[ai] * psi[jp - lg]; }
        for (ai = 0; ai < maL.length; ai++) { if (maL[ai] === jp) pj += maCoef[ai]; }
        psi.push(pj);
      }
      var z80 = approxNormInv(0.90), z95 = approxNormInv(0.975);
      var varCum = 0;
      var fcW = [];
      for (var hh = 0; hh < h; hh++) {
        varCum += psi[hh] * psi[hh];
        var seh = sigma * Math.sqrt(varCum);
        fcW.push({ h: hh + 1, mean: fmeansW[hh], se: seh });
      }

      // ----- integrate back to the original level scale (d ≤ 1 and D ≤ 1).
      if (d <= 1 && D <= 1) {
        var lvl = integrate(fcW.map(function (o) { return o.mean; }), orig, d, D, s);
        forecast = [];
        for (var g = 0; g < h; g++) {
          var seL = fcW[g].se;             // SE carried through (linear integration leaves σ scale ~unchanged for d,D ≤1 approx)
          forecast.push({
            h: g + 1, mean: lvl[g],
            lo80: lvl[g] - z80 * seL, hi80: lvl[g] + z80 * seL,
            lo95: lvl[g] - z95 * seL, hi95: lvl[g] + z95 * seL
          });
        }
        forecastScale = 'level';
      } else {
        forecast = fcW.map(function (o) {
          return { h: o.h, mean: o.mean, lo80: o.mean - z80 * o.se, hi80: o.mean + z80 * o.se, lo95: o.mean - z95 * o.se, hi95: o.mean + z95 * o.se };
        });
        forecastScale = 'differenced';
        note = (note ? note + ' ' : '') + 'Forecast left on the differenced scale (d>1 or D>1 integration not performed).';
      }
    }

    return {
      method: 'arima',
      order: { p: p, d: d, q: q, P: P, D: D, Q: Q, s: s },
      names: names, coef: coef, se: se, t: tstat, p: pval,
      sigma2: sigma2, sigma: sigma, aic: aic, bic: bic, n: neff,
      fitted: fittedW, resid: residW, ljung: lb,
      forecast: forecast, forecastScale: forecastScale, note: note
    };
  }

  // Undo regular (d) then seasonal (D) differencing to recover level forecasts.
  // fcW: forecasts on the differenced scale (length h). orig: original cleaned y.
  // Supports d ≤ 1 and D ≤ 1 only.
  function integrate(fcW, orig, d, D, s) {
    var h = fcW.length;
    var out = fcW.slice();
    var no = orig.length;

    // First undo regular differencing (the inner-most transform was applied last).
    if (d === 1) {
      // We need the last value on the (seasonally-differenced) scale. If D===1,
      // reconstruct the seasonally-differenced series; else it's just orig.
      var base;
      if (D === 1) {
        var sd = diffAt(orig, s);          // seasonally-differenced series
        base = sd.length ? sd[sd.length - 1] : 0;
        // cumulate the regular-diff forecasts onto the last seasonal-diff value
        var cumSD = []; var prev = base;
        for (var i = 0; i < h; i++) { prev = prev + out[i]; cumSD.push(prev); }
        out = cumSD;
        // now undo seasonal differencing: y_t = sd_t + y_{t-s}
        var lvl = []; var hist = orig.slice();
        for (var g = 0; g < h; g++) {
          var ref = hist[hist.length - s + g];   // y_{t-s} for this future point
          if (ref == null) ref = hist[hist.length - 1];
          var val = out[g] + ref;
          lvl.push(val); hist.push(val);
        }
        return lvl;
      } else {
        // d===1, D===0: cumulate onto last original value
        base = orig[no - 1];
        var prevv = base, cum = [];
        for (var i2 = 0; i2 < h; i2++) { prevv = prevv + out[i2]; cum.push(prevv); }
        return cum;
      }
    }

    // d === 0
    if (D === 1) {
      // undo seasonal differencing directly: y_t = w_t + y_{t-s}
      var lvl2 = []; var hist2 = orig.slice();
      for (var g2 = 0; g2 < h; g2++) {
        var ref2 = hist2[hist2.length - s + g2];
        if (ref2 == null) ref2 = hist2[hist2.length - 1];
        var val2 = out[g2] + ref2;
        lvl2.push(val2); hist2.push(val2);
      }
      return lvl2;
    }

    // d === 0 and D === 0: already on the level scale
    return out;
  }

  // ====================================================================
  // 3) Holt-Winters exponential smoothing (ETS).
  //    trend on/off; seasonal 'none' | 'add' | 'mul'.
  // ====================================================================
  function ets(y, opts) {
    opts = opts || {};
    var data = L.clean(y);
    var n = data.length;
    var hasTrend = opts.trend !== false;          // default: include trend
    var seasonal = opts.seasonal || 'none';
    var s = opts.s || 12;
    var alpha = opts.alpha == null ? 0.3 : opts.alpha;
    var beta = opts.beta == null ? 0.1 : opts.beta;
    var gamma = opts.gamma == null ? 0.1 : opts.gamma;
    var h = opts.h || 12;

    var seasOn = (seasonal === 'add' || seasonal === 'mul');
    var minN = seasOn ? 2 * s : 3;
    if (n < minN) return { method: 'ets', error: 'Series too short for ETS (' + n + ' obs, need ≥ ' + minN + ').' };

    // ---- initialization
    var level, trend = 0, seas = [];
    if (seasOn) {
      // initial level = mean of first season; initial trend = avg per-period change across first two seasons
      var s1 = data.slice(0, s), s2 = data.slice(s, 2 * s);
      var m1 = L.mean(s1), m2 = L.mean(s2);
      level = m1;
      trend = hasTrend ? (m2 - m1) / s : 0;
      for (var i = 0; i < s; i++) {
        seas[i] = (seasonal === 'mul') ? (m1 ? data[i] / m1 : 1) : (data[i] - m1);
      }
    } else {
      level = data[0];
      trend = hasTrend ? (data[1] - data[0]) : 0;
    }

    var fitted = new Array(n);
    var sse = 0;
    for (var t = 0; t < n; t++) {
      var sIdx = t % s;
      var yhat;
      if (seasOn) {
        yhat = (seasonal === 'mul') ? (level + (hasTrend ? trend : 0)) * seas[sIdx] : (level + (hasTrend ? trend : 0) + seas[sIdx]);
      } else {
        yhat = level + (hasTrend ? trend : 0);
      }
      fitted[t] = yhat;
      var err = data[t] - yhat;
      if (t > 0) sse += err * err;          // skip the seed point's error

      // ---- update recursions
      var prevLevel = level;
      if (seasOn) {
        if (seasonal === 'mul') {
          var sv = seas[sIdx] || 1;
          level = alpha * (data[t] / sv) + (1 - alpha) * (prevLevel + (hasTrend ? trend : 0));
          if (hasTrend) trend = beta * (level - prevLevel) + (1 - beta) * trend;
          seas[sIdx] = gamma * (data[t] / (level || 1e-9)) + (1 - gamma) * seas[sIdx];
        } else {
          level = alpha * (data[t] - seas[sIdx]) + (1 - alpha) * (prevLevel + (hasTrend ? trend : 0));
          if (hasTrend) trend = beta * (level - prevLevel) + (1 - beta) * trend;
          seas[sIdx] = gamma * (data[t] - level) + (1 - gamma) * seas[sIdx];
        }
      } else {
        level = alpha * data[t] + (1 - alpha) * (prevLevel + (hasTrend ? trend : 0));
        if (hasTrend) trend = beta * (level - prevLevel) + (1 - beta) * trend;
      }
    }

    // ---- h-step forecast
    var forecast = [];
    for (var fstep = 1; fstep <= h; fstep++) {
      var fval;
      var trendPart = hasTrend ? trend * fstep : 0;
      if (seasOn) {
        var seasIdx = (n + fstep - 1) % s;
        var sf = seas[seasIdx];
        fval = (seasonal === 'mul') ? (level + trendPart) * sf : (level + trendPart + sf);
      } else {
        fval = level + trendPart;
      }
      forecast.push({ h: fstep, mean: fval });
    }

    return {
      method: 'ets', alpha: alpha, beta: hasTrend ? beta : null, gamma: seasOn ? gamma : null,
      sse: sse, fitted: fitted, forecast: forecast,
      config: { trend: hasTrend, seasonal: seasonal, s: s, h: h }
    };
  }

  // ====================================================================
  // 4) Hodrick-Prescott filter. τ = (I + λ·D'D)⁻¹ y, D = 2nd-difference op.
  // ====================================================================
  function hpFilter(y, lambda) {
    if (lambda && typeof lambda === 'object') lambda = lambda.lambda;  // accept opts {lambda} or a bare number
    var data = L.clean(y);
    var T = data.length;
    lambda = (lambda == null || !isFinite(lambda)) ? 1600 : lambda;
    if (T < 4) return { method: 'hp', error: 'Series too short for HP filter (' + T + ' obs, need ≥ 4).' };

    // second-difference operator D: (T-2) × T, rows [1, -2, 1] sliding.
    var Drows = [];
    for (var i = 0; i < T - 2; i++) {
      var row = new Array(T);
      for (var j = 0; j < T; j++) row[j] = 0;
      row[i] = 1; row[i + 1] = -2; row[i + 2] = 1;
      Drows.push(row);
    }
    // A = I + λ·D'D  (T × T)
    var DtD = L.matMul(L.transposeM(Drows), Drows);  // T × T
    var Arows = [];
    for (var r = 0; r < T; r++) {
      var ar = new Array(T);
      for (var c = 0; c < T; c++) ar[c] = (r === c ? 1 : 0) + lambda * DtD[r][c];
      Arows.push(ar);
    }
    var Ainv;
    try {
      Ainv = L.safeInverse(L.mat(Arows), 'HP filter (I + λ·D\'D)');
    } catch (e) {
      return { method: 'hp', error: e && e.message ? e.message : 'HP filter matrix is singular.' };
    }
    var trendV = Ainv.mmul(L.colVec(data)).to1DArray();
    var cycle = [];
    for (var k = 0; k < T; k++) cycle.push(data[k] - trendV[k]);
    return { method: 'hp', lambda: lambda, trend: trendV, cycle: cycle };
  }

  // ====================================================================
  // 5) Classical seasonal decomposition. type 'add' | 'mul'.
  //    trend = centered MA of length s; seasonal = season-position means
  //    (normalized); remainder = the rest.
  // ====================================================================
  function seasonalDecompose(y, s, type) {
    var data = L.clean(y);
    var n = data.length;
    s = s || 12;
    type = type || 'add';
    if (n < 2 * s) return { method: 'decompose', error: 'Series too short to decompose (' + n + ' obs, need ≥ ' + (2 * s) + ').' };

    // ---- centered moving average of length s.
    // Even s: average two consecutive s-MAs (2×s weighting); odd s: plain s-MA.
    var trend = new Array(n);
    for (var i = 0; i < n; i++) trend[i] = null;
    var half = Math.floor(s / 2);
    if (s % 2 === 0) {
      for (var t = half; t < n - half; t++) {
        var acc = 0;
        acc += 0.5 * data[t - half];
        for (var k = -half + 1; k <= half - 1; k++) acc += data[t + k];
        acc += 0.5 * data[t + half];
        trend[t] = acc / s;
      }
    } else {
      for (var t2 = half; t2 < n - half; t2++) {
        var a2 = 0;
        for (var k2 = -half; k2 <= half; k2++) a2 += data[t2 + k2];
        trend[t2] = a2 / s;
      }
    }

    // ---- detrended series
    var detr = new Array(n);
    for (var d0 = 0; d0 < n; d0++) {
      if (trend[d0] == null) { detr[d0] = null; continue; }
      if (type === 'mul') detr[d0] = trend[d0] ? data[d0] / trend[d0] : null;
      else detr[d0] = data[d0] - trend[d0];
    }

    // ---- seasonal indices: average detrended by season position.
    var bucket = [];
    for (var b = 0; b < s; b++) bucket[b] = [];
    for (var p = 0; p < n; p++) { if (detr[p] != null && isFinite(detr[p])) bucket[p % s].push(detr[p]); }
    var rawSeas = [];
    for (var bb = 0; bb < s; bb++) rawSeas[bb] = bucket[bb].length ? L.mean(bucket[bb]) : (type === 'mul' ? 1 : 0);
    // normalize: additive → mean 0; multiplicative → mean 1
    var sMean = L.mean(rawSeas);
    var normSeas = [];
    for (var nn = 0; nn < s; nn++) {
      if (type === 'mul') normSeas[nn] = sMean ? rawSeas[nn] / sMean : 1;
      else normSeas[nn] = rawSeas[nn] - sMean;
    }

    var seasonal = new Array(n), remainder = new Array(n);
    for (var q = 0; q < n; q++) {
      seasonal[q] = normSeas[q % s];
      if (trend[q] == null) { remainder[q] = null; continue; }
      if (type === 'mul') remainder[q] = (trend[q] && seasonal[q]) ? data[q] / (trend[q] * seasonal[q]) : null;
      else remainder[q] = data[q] - trend[q] - seasonal[q];
    }

    return { method: 'decompose', s: s, type: type, trend: trend, seasonal: seasonal, remainder: remainder };
  }

  // ---------------- export (extend the global Econ) ------------------------
  if (window.Econ) Object.assign(window.Econ, { ljungBox: ljungBox, arima: arima, ets: ets, hpFilter: hpFilter, seasonalDecompose: seasonalDecompose });
})();
