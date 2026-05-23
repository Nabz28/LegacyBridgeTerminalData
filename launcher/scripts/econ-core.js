// ================================================================
// econ-core.js — LBC Analysis econometrics engine (window.Econ).
// Pure functions, no DOM. Numerics on ml-matrix (Matrix/inverse/SVD/eigen)
// + jStat (t / F / chi-square / normal distributions for p-values).
// Loaded as a plain <script> (no Babel) before the Analysis UI.
//
// Methods: transforms, frequency align/resample, descriptive stats,
// correlation (Pearson/Spearman), OLS (full diagnostics), ADF stationarity,
// ACF/PACF, Granger causality, VAR (lag-select, stability, orthogonalized
// IRF, FEVD), BVAR (conjugate Minnesota prior, posterior mean + IRF bands),
// and panel (pooled / fixed-effects within / random-effects).
// ================================================================
(function () {
  'use strict';
  var M = (window.mlMatrix && window.mlMatrix.Matrix) || null;
  var inverse = window.mlMatrix && window.mlMatrix.inverse;
  var SVD = window.mlMatrix && window.mlMatrix.SingularValueDecomposition;
  var EVD = window.mlMatrix && window.mlMatrix.EigenvalueDecomposition;
  var JS = window.jStat;

  // ---------------- distribution helpers (graceful if jStat missing) -------
  function tCdf(x, df) { return JS ? JS.studentt.cdf(x, df) : null; }
  function fCdf(x, d1, d2) { return JS ? JS.centralF.cdf(x, d1, d2) : null; }
  function chiCdf(x, df) { return JS ? JS.chisquare.cdf(x, df) : null; }
  function normCdf(x) { return JS ? JS.normal.cdf(x, 0, 1) : null; }
  function tInv(p, df) { return JS ? JS.studentt.inv(p, df) : 1.96; }
  function tPtwo(tval, df) { var c = tCdf(Math.abs(tval), df); return c == null ? null : 2 * (1 - c); }

  // ---------------- basic stats --------------------------------------------
  function clean(a) { return a.filter(function (v) { return v != null && isFinite(v); }); }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { a = clean(a); return a.length ? sum(a) / a.length : NaN; }
  function variance(a, ddof) { a = clean(a); var m = mean(a), s = 0, n = a.length; if (n < 2) return NaN; for (var i = 0; i < n; i++) s += (a[i] - m) * (a[i] - m); return s / (n - (ddof == null ? 1 : ddof)); }
  function std(a, ddof) { return Math.sqrt(variance(a, ddof)); }
  function quantile(a, q) { a = clean(a).slice().sort(function (x, y) { return x - y; }); if (!a.length) return NaN; var pos = (a.length - 1) * q, b = Math.floor(pos), r = pos - b; return a[b + 1] !== undefined ? a[b] + r * (a[b + 1] - a[b]) : a[b]; }
  function median(a) { return quantile(a, 0.5); }
  function skewness(a) { a = clean(a); var m = mean(a), s = std(a, 0), n = a.length; if (n < 3 || !s) return NaN; var t = 0; for (var i = 0; i < n; i++) t += Math.pow((a[i] - m) / s, 3); return t / n; }
  function kurtosis(a) { a = clean(a); var m = mean(a), s = std(a, 0), n = a.length; if (n < 4 || !s) return NaN; var t = 0; for (var i = 0; i < n; i++) t += Math.pow((a[i] - m) / s, 4); return t / n - 3; }
  function describe(a) {
    var c = clean(a);
    return { n: c.length, nMissing: a.length - c.length, mean: mean(c), std: std(c), min: c.length ? Math.min.apply(null, c) : NaN, p25: quantile(c, 0.25), median: median(c), p75: quantile(c, 0.75), max: c.length ? Math.max.apply(null, c) : NaN, skew: skewness(c), kurt: kurtosis(c), sum: sum(c) };
  }

  // ---------------- transforms ---------------------------------------------
  // Each returns a new array the same length as input; values that become
  // undefined (leading lag/diff) are null so alignment can drop them.
  function transform(arr, kind, opt) {
    opt = opt || {}; var k = opt.k || 1, n = arr.length, out = new Array(n), i;
    var v = arr.map(function (x) { return (x == null || !isFinite(x)) ? null : x; });
    switch (kind) {
      case 'level': return v.slice();
      case 'log': case 'ln':
        return v.map(function (x) { return (x != null && x > 0) ? Math.log(x) : null; });
      case 'log10':
        return v.map(function (x) { return (x != null && x > 0) ? Math.log10(x) : null; });
      case 'diff':
        for (i = 0; i < n; i++) out[i] = (i >= k && v[i] != null && v[i - k] != null) ? v[i] - v[i - k] : null; return out;
      case 'log-diff': case 'dlog':
        for (i = 0; i < n; i++) out[i] = (i >= k && v[i] > 0 && v[i - k] > 0) ? Math.log(v[i]) - Math.log(v[i - k]) : null; return out;
      case 'growth': case 'pct':
        for (i = 0; i < n; i++) out[i] = (i >= k && v[i] != null && v[i - k]) ? (v[i] / v[i - k] - 1) * 100 : null; return out;
      case 'lag':
        for (i = 0; i < n; i++) out[i] = (i >= k) ? v[i - k] : null; return out;
      case 'lead':
        for (i = 0; i < n; i++) out[i] = (i + k < n) ? v[i + k] : null; return out;
      case 'standardize': case 'zscore': {
        var m = mean(v), s = std(v); return v.map(function (x) { return (x != null && s) ? (x - m) / s : null; });
      }
      case 'index100': {
        var base = null; for (i = 0; i < n; i++) { if (v[i] != null) { base = v[i]; break; } }
        return v.map(function (x) { return (x != null && base) ? x / base * 100 : null; });
      }
      case 'cumsum': { var acc = 0; return v.map(function (x) { if (x == null) return null; acc += x; return acc; }); }
      default: return v.slice();
    }
  }
  var TRANSFORMS = [
    { id: 'level', label: 'Level' }, { id: 'log', label: 'Log (ln)' }, { id: 'diff', label: 'Δ First diff' },
    { id: 'log-diff', label: 'Δln (log diff)' }, { id: 'growth', label: '% Growth (MoM/QoQ)' },
    { id: 'lag', label: 'Lag', hasK: true }, { id: 'standardize', label: 'Standardize (z)' }, { id: 'index100', label: 'Index = 100' }
  ];

  // ---------------- frequency resample -------------------------------------
  // series = [{date:'YYYY-MM-DD', value:number}] ascending. Aggregates to the
  // target frequency by taking the last observation in each bucket.
  function bucketKey(dateStr, freq) {
    var d = dateStr; // YYYY-MM-DD
    if (freq === 'A') return d.slice(0, 4);
    if (freq === 'Q') { var m = parseInt(d.slice(5, 7), 10); return d.slice(0, 4) + '-Q' + (Math.floor((m - 1) / 3) + 1); }
    if (freq === 'M') return d.slice(0, 7);
    if (freq === 'W') { var dt = new Date(d + 'T00:00:00Z'); var day = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - day); return dt.toISOString().slice(0, 10); }
    return d; // D
  }
  function resample(series, freq, agg) {
    if (freq === 'D' || !freq) return series.slice();
    var map = {}; agg = agg || 'last';
    series.forEach(function (o) {
      var key = bucketKey(o.date, freq);
      if (!map[key]) map[key] = [];
      if (o.value != null && isFinite(o.value)) map[key].push(o.value);
    });
    return Object.keys(map).sort().map(function (key) {
      var vals = map[key], v;
      if (agg === 'mean') v = mean(vals); else if (agg === 'sum') v = sum(vals); else if (agg === 'first') v = vals[0]; else v = vals[vals.length - 1];
      // normalize bucket key back to a representative date
      var date = key.length === 4 ? key + '-12-31' : (key.indexOf('Q') > -1 ? key.slice(0, 4) + '-' + String(parseInt(key.slice(6), 10) * 3).padStart(2, '0') + '-01' : (key.length === 7 ? key + '-01' : key));
      return { date: date, value: v };
    });
  }

  // ---------------- alignment ----------------------------------------------
  // vars = [{name, series:[{date,value}]}] -> {dates, names, columns:[col per var], rows:[[...]]}
  // Inner-join on dates after optional resample; drops rows with any null.
  function alignVars(vars, opt) {
    opt = opt || {};
    var prepped = vars.map(function (v) {
      var s = v.series.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      if (opt.freq) s = resample(s, opt.freq, opt.agg);
      var mp = {}; s.forEach(function (o) { mp[o.date] = o.value; });
      return { name: v.name, map: mp };
    });
    // candidate dates = union, then keep only fully-populated rows
    var dateSet = {};
    prepped.forEach(function (p) { Object.keys(p.map).forEach(function (d) { dateSet[d] = 1; }); });
    var dates = Object.keys(dateSet).sort();
    var rows = [], keptDates = [];
    dates.forEach(function (d) {
      var row = [], ok = true;
      for (var i = 0; i < prepped.length; i++) { var val = prepped[i].map[d]; if (val == null || !isFinite(val)) { ok = false; break; } row.push(val); }
      if (ok) { rows.push(row); keptDates.push(d); }
    });
    var columns = vars.map(function (_, i) { return rows.map(function (r) { return r[i]; }); });
    return { dates: keptDates, names: vars.map(function (v) { return v.name; }), columns: columns, rows: rows, n: rows.length };
  }

  // ---------------- correlation --------------------------------------------
  function pearson(x, y) {
    var n = x.length, mx = mean(x), my = mean(y), sx = 0, sy = 0, sxy = 0;
    for (var i = 0; i < n; i++) { var dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sx += dx * dx; sy += dy * dy; }
    return (sx && sy) ? sxy / Math.sqrt(sx * sy) : NaN;
  }
  function rank(a) { var idx = a.map(function (v, i) { return [v, i]; }).sort(function (p, q) { return p[0] - q[0]; }); var r = new Array(a.length); for (var i = 0; i < idx.length;) { var j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; var avg = (i + j - 1) / 2 + 1; for (var k = i; k < j; k++) r[idx[k][1]] = avg; i = j; } return r; }
  function spearman(x, y) { return pearson(rank(x), rank(y)); }
  function corrMatrix(columns, names, opt) {
    opt = opt || {}; var method = opt.method || 'pearson', k = columns.length, mat = [];
    for (var i = 0; i < k; i++) { mat[i] = []; for (var j = 0; j < k; j++) { mat[i][j] = i === j ? 1 : (method === 'spearman' ? spearman(columns[i], columns[j]) : pearson(columns[i], columns[j])); } }
    return { names: names, matrix: mat, method: method, n: columns[0] ? columns[0].length : 0 };
  }

  // ---------------- linear algebra helpers ---------------------------------
  function mat(rows) { return new M(rows); }
  function diag(Mx) { var d = []; for (var i = 0; i < Mx.rows; i++) d.push(Mx.get(i, i)); return d; }
  function colVec(a) { return M.columnVector(a); }

  // Inverse with a clear, human error on singular / near-singular design.
  function safeInverse(A, label) {
    try {
      var inv = inverse(A);
      var arr = inv.to1DArray();
      for (var i = 0; i < arr.length; i++) if (!isFinite(arr[i])) throw 0;
      return inv;
    } catch (e) {
      throw new Error((label || "Design matrix") + " is singular or near-singular — two regressors are perfectly collinear (e.g. a constant series plus the intercept, or a variable and a duplicate/linear transform of it), or there are fewer observations than parameters. Drop one regressor or change a transform.");
    }
  }

  // Solve OLS given design matrix Xrows (n×k, caller includes intercept) + y.
  function olsFit(Xrows, y) {
    if (Xrows.length < Xrows[0].length) throw new Error("Not enough observations (" + Xrows.length + ") for " + Xrows[0].length + " parameters.");
    var X = mat(Xrows), yv = colVec(y);
    var Xt = X.transpose();
    var XtX = Xt.mmul(X);
    var XtXinv = safeInverse(XtX, "Regressor matrix X'X");
    var beta = XtXinv.mmul(Xt).mmul(yv);          // k×1
    var fitted = X.mmul(beta);
    var resid = yv.clone().sub(fitted);
    return { X: X, y: yv, beta: beta, XtXinv: XtXinv, fitted: fitted, resid: resid };
  }

  // R² of an auxiliary regression (null if it can't be fit).
  function r2of(yv, Xrows) {
    try {
      var f = olsFit(Xrows, yv);
      var e = f.resid.to1DArray(); var rss = sum(e.map(function (v) { return v * v; }));
      var m = mean(yv); var tss = sum(yv.map(function (v) { return (v - m) * (v - m); }));
      return tss ? 1 - rss / tss : 0;
    } catch (_) { return null; }
  }
  // Misspecification diagnostics: Breusch-Pagan (heteroskedasticity),
  // Breusch-Godfrey (serial correlation), VIF (multicollinearity).
  function regDiag(resid, Xrows, intercept, kReg) {
    var n = resid.length, out = {};
    var e2 = resid.map(function (e) { return e * e; });
    var r2bp = r2of(e2, Xrows);
    if (r2bp != null && kReg > 0) { out.bp = n * r2bp; out.bpDf = kReg; out.bpP = 1 - chiCdf(out.bp, kReg); }
    var h = Math.max(1, Math.min(4, Math.floor(n / 10)));
    var Xaug = [], yBG = [];
    for (var i = h; i < n; i++) { var row = Xrows[i].slice(); for (var l = 1; l <= h; l++) row.push(resid[i - l]); Xaug.push(row); yBG.push(resid[i]); }
    var r2bg = r2of(yBG, Xaug);
    if (r2bg != null) { out.bg = (n - h) * r2bg; out.bgH = h; out.bgP = 1 - chiCdf(out.bg, h); }
    if (kReg >= 2) {
      out.vif = []; var start = intercept ? 1 : 0;
      for (var c = start; c < Xrows[0].length; c++) {
        var yc = Xrows.map(function (r) { return r[c]; });
        var Xother = Xrows.map(function (r) { var rr = []; for (var cc = 0; cc < r.length; cc++) if (cc !== c) rr.push(r[cc]); if (!intercept) rr.unshift(1); return rr; });
        var r2v = r2of(yc, Xother);
        out.vif.push(r2v != null && r2v < 1 ? 1 / (1 - r2v) : null);
      }
    }
    return out;
  }

  // ---------------- OLS with full diagnostics ------------------------------
  // y: number[], X: number[][] (regressors WITHOUT intercept), opts {names, intercept(true), robust('none'|'hc1')}
  function ols(y, Xraw, opts) {
    opts = opts || {};
    var intercept = opts.intercept !== false;
    var names = (opts.names || Xraw.map(function (_, i) { return 'X' + (i + 1); })).slice();
    var n = y.length;
    var Xrows = [];
    for (var i = 0; i < n; i++) {
      var row = intercept ? [1] : [];
      for (var j = 0; j < Xraw.length; j++) row.push(Xraw[j][i]);
      Xrows.push(row);
    }
    var colNames = intercept ? ['(const)'].concat(names) : names.slice();
    var k = Xrows[0].length;
    var f = olsFit(Xrows, y);
    var resid = f.resid.to1DArray(), fitted = f.fitted.to1DArray(), betaArr = f.beta.to1DArray();
    var rss = sum(resid.map(function (e) { return e * e; }));
    var yMean = mean(y); var tss = sum(y.map(function (v) { return (v - yMean) * (v - yMean); }));
    var df = n - k;
    var sigma2 = rss / df, sigma = Math.sqrt(sigma2);
    // covariance: classical or HC1 robust (White)
    var vcov, hacL = null;
    if (opts.robust === 'hc1') {
      var Xm = f.X, meat = new M(k, k);
      for (var r = 0; r < n; r++) { var xr = Xm.getRowVector(r); meat.add(xr.transpose().mmul(xr).mul(resid[r] * resid[r])); }
      var bread = f.XtXinv;
      vcov = bread.mmul(meat).mmul(bread).mul(n / df);
    } else if (opts.robust === 'hac') {
      // Newey-West HAC: Bartlett kernel, automatic bandwidth L = floor(4·(n/100)^(2/9)).
      var Xh = f.X; hacL = opts.hacLags != null ? opts.hacLags : Math.max(1, Math.floor(4 * Math.pow(n / 100, 2 / 9)));
      var S = new M(k, k);
      for (var t0 = 0; t0 < n; t0++) { var x0 = Xh.getRowVector(t0); S.add(x0.transpose().mmul(x0).mul(resid[t0] * resid[t0])); }
      for (var L = 1; L <= hacL; L++) {
        var w = 1 - L / (hacL + 1), G = new M(k, k);
        for (var t = L; t < n; t++) { var xt = Xh.getRowVector(t), xl = Xh.getRowVector(t - L); G.add(xt.transpose().mmul(xl).mul(resid[t] * resid[t - L])); }
        var GG = G.clone().add(G.transpose()); S.add(GG.mul(w));
      }
      var breadH = f.XtXinv;
      vcov = breadH.mmul(S).mmul(breadH).mul(n / df);
    } else {
      vcov = f.XtXinv.mul(sigma2);
    }
    var se = diag(vcov).map(function (v) { return Math.sqrt(Math.max(v, 0)); });
    var t = betaArr.map(function (b, i2) { return se[i2] ? b / se[i2] : NaN; });
    var p = t.map(function (tv) { return tPtwo(tv, df); });
    var tcrit = tInv(0.975, df);
    var ci = betaArr.map(function (b, i2) { return [b - tcrit * se[i2], b + tcrit * se[i2]]; });
    var r2 = tss ? 1 - rss / tss : NaN;
    var adjR2 = tss ? 1 - (rss / df) / (tss / (n - 1)) : NaN;
    var kReg = k - (intercept ? 1 : 0);
    var fStat = (kReg > 0 && df > 0) ? ((tss - rss) / kReg) / (rss / df) : NaN;
    var fP = isFinite(fStat) ? 1 - fCdf(fStat, kReg, df) : null;
    // Durbin-Watson
    var dwNum = 0; for (var d2 = 1; d2 < n; d2++) dwNum += (resid[d2] - resid[d2 - 1]) * (resid[d2] - resid[d2 - 1]);
    var dw = rss ? dwNum / rss : NaN;
    // info criteria (gaussian llf)
    var llf = -0.5 * n * (Math.log(2 * Math.PI) + Math.log(rss / n) + 1);
    var aic = -2 * llf + 2 * k, bic = -2 * llf + k * Math.log(n);
    // Jarque-Bera on residuals
    var sk = skewness(resid), ku = kurtosis(resid);
    var jb = n / 6 * (sk * sk + ku * ku / 4); var jbP = isFinite(jb) ? 1 - chiCdf(jb, 2) : null;
    return {
      method: 'OLS', names: colNames, intercept: intercept, n: n, k: k, df: df,
      coef: betaArr, se: se, t: t, p: p, ci: ci,
      r2: r2, adjR2: adjR2, fStat: fStat, fP: fP, sigma: sigma, rmse: Math.sqrt(rss / n),
      aic: aic, bic: bic, llf: llf, dw: dw, jb: jb, jbP: jbP,
      resid: resid, fitted: fitted, yMean: yMean, rss: rss, tss: tss,
      vcov: vcov.to2DArray(), robust: opts.robust || 'none', hacLags: hacL,
      diag: regDiag(resid, Xrows, intercept, kReg)
    };
  }

  // ---------------- ADF stationarity test ----------------------------------
  // MacKinnon approximate critical values + a p-value interpolated from the
  // Dickey-Fuller τ percentile surface (case-specific). Lag length chosen by AIC.
  var ADF_CRIT = {
    c: { '1%': -3.43, '5%': -2.86, '10%': -2.57 },
    ct: { '1%': -3.96, '5%': -3.41, '10%': -3.13 },
    n: { '1%': -2.58, '5%': -1.95, '10%': -1.62 }
  };
  // (p, τ) percentile points — increasing in τ as p rises. Used to interpolate p.
  var ADF_SURF = {
    c: [[0.01, -3.43], [0.025, -3.12], [0.05, -2.86], [0.10, -2.57], [0.20, -2.23], [0.50, -1.57], [0.90, -0.44], [0.99, 0.60]],
    ct: [[0.01, -3.96], [0.025, -3.66], [0.05, -3.41], [0.10, -3.13], [0.20, -2.79], [0.50, -2.18], [0.90, -1.14], [0.99, -0.07]],
    n: [[0.01, -2.58], [0.025, -2.23], [0.05, -1.95], [0.10, -1.62], [0.20, -1.28], [0.50, -0.50], [0.90, 0.91], [0.99, 1.60]]
  };
  function dfPvalue(stat, trend) {
    var g = ADF_SURF[trend] || ADF_SURF.c;
    if (stat <= g[0][1]) return g[0][0] * 0.5;            // more extreme than 1% point
    if (stat >= g[g.length - 1][1]) return g[g.length - 1][0];
    for (var i = 1; i < g.length; i++) { if (stat <= g[i][1]) { var t0 = g[i - 1][1], t1 = g[i][1], p0 = g[i - 1][0], p1 = g[i][0]; return p0 + (p1 - p0) * (stat - t0) / (t1 - t0); } }
    return 0.5;
  }
  // single ADF regression at a given lag → {stat, aic, k, nobs, gamma}
  function adfFit(y, dy, trend, lag) {
    var Y = [], Xr = [];
    for (var t = lag; t < dy.length; t++) {
      var row = [];
      if (trend !== 'n') row.push(1);
      if (trend === 'ct') row.push(t);
      row.push(y[t]);                              // y_{t-1}
      for (var L = 1; L <= lag; L++) row.push(dy[t - L]);
      Xr.push(row); Y.push(dy[t]);
    }
    var k = Xr[0].length, nobs = Y.length, dfa = nobs - k;
    if (dfa < 1) return null;
    var f = olsFit(Xr, Y); var beta = f.beta.to1DArray(); var resid = f.resid.to1DArray();
    var rss = sum(resid.map(function (e) { return e * e; }));
    if (!isFinite(rss) || rss <= 0) return null;
    var vcov = f.XtXinv.mul(rss / dfa); var gIdx = (trend === 'n' ? 0 : (trend === 'ct' ? 2 : 1));
    var seg = Math.sqrt(vcov.get(gIdx, gIdx)); var gamma = beta[gIdx]; var stat = gamma / seg;
    if (!isFinite(stat)) return null;
    var aic = nobs * Math.log(rss / nobs) + 2 * k;
    return { stat: stat, aic: aic, k: k, nobs: nobs, gamma: gamma, lag: lag };
  }
  function adf(yArr, opts) {
    opts = opts || {}; var trend = opts.trend || 'c';
    var y = clean(yArr); var n = y.length;
    var maxLag = opts.lags == null ? Math.min(12, Math.floor(Math.pow(n - 1, 1 / 3))) : opts.lags;
    if (n < maxLag + 6) return { error: 'Series too short for ADF (' + n + ' obs, need ≥ ' + (maxLag + 6) + '). Try a longer span or lower frequency.' };
    var dy = []; for (var i = 1; i < n; i++) dy.push(y[i] - y[i - 1]);
    var best = null;
    if (opts.lags != null) { best = adfFit(y, dy, trend, opts.lags); }
    else { for (var L = 0; L <= maxLag; L++) { var fit = adfFit(y, dy, trend, L); if (fit && (!best || fit.aic < best.aic)) best = fit; } }
    if (!best) return { error: 'ADF regression could not be estimated (insufficient/degenerate data).' };
    var crit = ADF_CRIT[trend] || ADF_CRIT.c;
    var p = dfPvalue(best.stat, trend);
    return {
      method: 'ADF', stat: best.stat, lags: best.lag, lagAuto: opts.lags == null, trend: trend, n: best.nobs,
      critical: crit, p: p, stationary: best.stat < crit['5%'], gamma: best.gamma,
      decision: best.stat < crit['5%'] ? 'Reject unit root at 5% (p≈' + p.toFixed(3) + ') — series is stationary I(0)' : 'Cannot reject unit root at 5% (p≈' + p.toFixed(3) + ') — series is non-stationary; difference it (likely I(1))'
    };
  }

  // ---------------- Engle-Granger cointegration ----------------------------
  // Step 1: OLS of y on X (the cointegrating regression). Step 2: ADF on its
  // residuals (no deterministics). Compares to Engle-Granger critical values
  // (more negative than ADF; depend on # regressors).
  var EG_CRIT = { 1: { '1%': -3.90, '5%': -3.34, '10%': -3.04 }, 2: { '1%': -4.29, '5%': -3.74, '10%': -3.45 }, 3: { '1%': -4.64, '5%': -4.10, '10%': -3.81 } };
  function engleGranger(y, Xcols, names) {
    var reg = ols(y, Xcols, { names: names, intercept: true });
    var u = reg.resid;
    var adfu = adf(u, { trend: 'n' });
    if (adfu.error) return { method: 'cointegration', error: adfu.error };
    var nx = Math.min(3, Xcols.length); var crit = EG_CRIT[nx] || EG_CRIT[1];
    return {
      method: 'cointegration', test: 'Engle-Granger', stat: adfu.stat, lags: adfu.lags, nReg: Xcols.length,
      critical: crit, cointegrated: adfu.stat < crit['5%'], beta: reg.coef, names: reg.names,
      decision: adfu.stat < crit['5%'] ? 'Residuals are stationary — variables are COINTEGRATED at 5% (a long-run relationship exists; consider a VECM)' : 'Residuals have a unit root — NOT cointegrated at 5% (a levels regression here is likely spurious — use differences)'
    };
  }

  // ---------------- ACF / PACF ---------------------------------------------
  function acf(yArr, maxLag) {
    var y = clean(yArr), n = y.length, m = mean(y); maxLag = maxLag || Math.min(40, Math.floor(n / 4));
    var c0 = 0; for (var i = 0; i < n; i++) c0 += (y[i] - m) * (y[i] - m); c0 /= n;
    var out = [], cumsq = 0;
    for (var L = 1; L <= maxLag; L++) {
      var ck = 0; for (var t = L; t < n; t++) ck += (y[t] - m) * (y[t - L] - m); ck /= n;
      var r = c0 ? ck / c0 : 0;
      var ci = 1.96 * Math.sqrt((1 + 2 * cumsq) / n);   // Bartlett bands widen with prior autocorrelations
      out.push({ lag: L, value: r, ci: ci });
      cumsq += r * r;
    }
    return out;
  }
  function pacf(yArr, maxLag) {
    var ac = acf(yArr, maxLag).map(function (o) { return o.value; }); var n = clean(yArr).length;
    maxLag = ac.length; var phi = [], prev = []; var out = [];
    for (var k = 1; k <= maxLag; k++) {
      var num = ac[k - 1]; for (var j = 1; j < k; j++) num -= prev[j - 1] * ac[k - 1 - j];
      var den = 1; for (var j2 = 1; j2 < k; j2++) den -= prev[j2 - 1] * ac[j2 - 1];
      var pk = (Math.abs(den) > 1e-10) ? num / den : 0;
      if (pk > 1) pk = 1; else if (pk < -1) pk = -1;   // a partial autocorrelation must lie in [-1,1]
      var cur = [];
      for (var i = 0; i < k - 1; i++) cur.push(prev[i] - pk * prev[k - 2 - i]);
      cur.push(pk); prev = cur; out.push({ lag: k, value: pk, ci: 1.96 / Math.sqrt(n) });
    }
    return out;
  }

  // ---------------- Granger causality --------------------------------------
  // Does x Granger-cause y? Restricted: y~lags(y). Unrestricted: +lags(x).
  function granger(y, x, lags) {
    lags = lags || 2; var n = y.length; var Y = [], Xr = [], Xu = [];
    for (var t = lags; t < n; t++) {
      var base = [1]; for (var L = 1; L <= lags; L++) base.push(y[t - L]);
      var unr = base.slice(); for (var L2 = 1; L2 <= lags; L2++) unr.push(x[t - L2]);
      Y.push(y[t]); Xr.push(base); Xu.push(unr);
    }
    var rss = function (Xrows) { var f = olsFit(Xrows, Y); return sum(f.resid.to1DArray().map(function (e) { return e * e; })); };
    var rssR = rss(Xr), rssU = rss(Xu); var T = Y.length; var q = lags, kU = Xu[0].length;
    var F = ((rssR - rssU) / q) / (rssU / (T - kU));
    var pval = isFinite(F) ? 1 - fCdf(F, q, T - kU) : null;
    return { method: 'Granger', fStat: F, df1: q, df2: T - kU, p: pval, lags: lags, causes: pval != null && pval < 0.05 };
  }
  function grangerMatrix(columns, names, lags) {
    var k = columns.length, mat2 = [];
    for (var i = 0; i < k; i++) { mat2[i] = []; for (var j = 0; j < k; j++) { mat2[i][j] = i === j ? null : granger(columns[j], columns[i], lags).p; } }
    // mat2[i][j] = p-value that series i Granger-causes series j
    return { names: names, pmatrix: mat2, lags: lags };
  }

  // ---------------- VAR ----------------------------------------------------
  // Y: number[][] columns (each is a variable, equal length), names, p lags.
  function buildVarDesign(cols, p, trend) {
    var K = cols.length, T = cols[0].length; var Yt = [], Zt = [];
    for (var t = p; t < T; t++) {
      var z = (trend === 'n') ? [] : [1];
      for (var L = 1; L <= p; L++) for (var v = 0; v < K; v++) z.push(cols[v][t - L]);
      Zt.push(z);
      var yrow = []; for (var v2 = 0; v2 < K; v2++) yrow.push(cols[v2][t]); Yt.push(yrow);
    }
    return { Y: Yt, Z: Zt, K: K, T: Yt.length, m: Zt[0].length };
  }
  function varFit(cols, names, p, opts) {
    opts = opts || {}; var trend = opts.trend || 'c';
    var d = buildVarDesign(cols, p, trend);
    var Z = mat(d.Z), Y = mat(d.Y);
    var ZtZ = Z.transpose().mmul(Z); var ZtZinv = safeInverse(ZtZ, "VAR regressor matrix Z'Z");
    var B = ZtZinv.mmul(Z.transpose()).mmul(Y);   // m×K  (coeffs per equation in columns)
    var resid = Y.clone().sub(Z.mmul(B));
    var T = d.T, K = d.K, m = d.m;
    var Sigma = resid.transpose().mmul(resid).mul(1 / (T - m)); // K×K
    // info criteria
    var detS = detSmall(Sigma.to2DArray());
    var llf = -0.5 * T * (K * Math.log(2 * Math.PI) + Math.log(Math.max(detS, 1e-300)) + K);
    var nparams = K * m;
    var aic = -2 * llf + 2 * nparams, bic = -2 * llf + nparams * Math.log(T);
    var hqic = -2 * llf + 2 * nparams * Math.log(Math.log(T));
    // companion matrix eigenvalues (stability)
    var eig = varStability(B.to2DArray(), K, p, trend);
    return {
      method: 'VAR', names: names, p: p, trend: trend, K: K, T: T, m: m,
      B: B.to2DArray(), Sigma: Sigma.to2DArray(), resid: resid.to2DArray(), ZtZinv: ZtZinv.to2DArray(),
      aic: aic, bic: bic, hqic: hqic, llf: llf, eigen: eig,
      stable: eig.every(function (e) { return e.mod < 1 + 1e-8; })
    };
  }
  function detSmall(A) { // determinant via ml-matrix LU (robust)
    try { return new M(A).determinant ? new M(A).determinant() : luDet(A); } catch (e) { return luDet(A); }
  }
  function luDet(A) { var n = A.length, m = A.map(function (r) { return r.slice(); }), det = 1; for (var i = 0; i < n; i++) { var piv = i; for (var r = i + 1; r < n; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r; if (piv !== i) { var tmp = m[i]; m[i] = m[piv]; m[piv] = tmp; det = -det; } if (!m[i][i]) return 0; det *= m[i][i]; for (var r2 = i + 1; r2 < n; r2++) { var f = m[r2][i] / m[i][i]; for (var c = i; c < n; c++) m[r2][c] -= f * m[i][c]; } } return det; }
  // Build companion matrix from B (m×K), extract A_l (K×K) blocks.
  function coefBlocks(B, K, p, trend) {
    var off = (trend === 'n') ? 0 : (trend === 'ct' ? 2 : 1);
    var A = []; // A[l] is K×K, row = equation, col = variable
    for (var l = 0; l < p; l++) { var Al = []; for (var eq = 0; eq < K; eq++) { var rowv = []; for (var v = 0; v < K; v++) rowv.push(B[off + l * K + v][eq]); Al.push(rowv); } A.push(Al); }
    return A;
  }
  function varStability(B, K, p, trend) {
    var A = coefBlocks(B, K, p, trend);
    var Kp = K * p; var comp = []; for (var i = 0; i < Kp; i++) { comp.push(new Array(Kp).fill(0)); }
    for (var l = 0; l < p; l++) for (var r = 0; r < K; r++) for (var c = 0; c < K; c++) comp[r][l * K + c] = A[l][r][c];
    for (var i2 = K; i2 < Kp; i2++) comp[i2][i2 - K] = 1;
    try {
      var e = new EVD(new M(comp));
      var re = e.realEigenvalues, im = e.imaginaryEigenvalues;
      return re.map(function (rv, i3) { return { re: rv, im: im[i3], mod: Math.sqrt(rv * rv + im[i3] * im[i3]) }; }).sort(function (a, b) { return b.mod - a.mod; });
    } catch (e2) { return []; }
  }
  // Orthogonalized IRF via Cholesky(Sigma). Returns irf[h][i][j] = response of i to shock j at horizon h.
  function varIRF(model, horizon, orth) {
    var K = model.K, p = model.p; var A = coefBlocks(model.B, K, p, model.trend);
    var P = orth === false ? eye(K) : cholesky(model.Sigma);
    var Phi = [eye(K)]; // MA coefficients
    for (var h = 1; h <= horizon; h++) {
      var Ph = zeros(K, K);
      for (var l = 1; l <= Math.min(h, p); l++) Ph = matAdd(Ph, matMul(A[l - 1], Phi[h - l]));
      Phi.push(Ph);
    }
    return Phi.map(function (ph) { return matMul(ph, P); }); // each K×K
  }
  function varFEVD(model, horizon) {
    var irf = varIRF(model, horizon, true); var K = model.K;
    // contribution of shock j to variance of var i over horizon
    var fevd = []; // fevd[h][i][j]
    var cum = zeros(K, K); // cum[i][j] sum of squared responses
    var totals = new Array(K).fill(0);
    var out = [];
    for (var h = 0; h <= horizon; h++) {
      for (var i = 0; i < K; i++) for (var j = 0; j < K; j++) cum[i][j] += irf[h][i][j] * irf[h][i][j];
      var rowOut = [];
      for (var i2 = 0; i2 < K; i2++) { var tot = 0; for (var j2 = 0; j2 < K; j2++) tot += cum[i2][j2]; var contrib = []; for (var j3 = 0; j3 < K; j3++) contrib.push(tot ? cum[i2][j3] / tot : 0); rowOut.push(contrib); }
      out.push(rowOut);
    }
    return out;
  }

  // small matrix ops on plain arrays
  function eye(n) { var m = []; for (var i = 0; i < n; i++) { m.push(new Array(n).fill(0)); m[i][i] = 1; } return m; }
  function zeros(r, c) { var m = []; for (var i = 0; i < r; i++) m.push(new Array(c).fill(0)); return m; }
  function matMul(A, B) { var r = A.length, n = B.length, c = B[0].length, out = zeros(r, c); for (var i = 0; i < r; i++) for (var k = 0; k < n; k++) { var a = A[i][k]; if (!a) continue; for (var j = 0; j < c; j++) out[i][j] += a * B[k][j]; } return out; }
  function matAdd(A, B) { return A.map(function (row, i) { return row.map(function (v, j) { return v + B[i][j]; }); }); }
  function cholesky(S) {
    var n = S.length, L = zeros(n, n);
    for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
      var s = 0; for (var k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) { var d = S[i][i] - s; if (d <= 1e-10) throw new Error('Residual covariance matrix is not positive definite — two endogenous variables are collinear (or one is a transform of another). Remove one.'); L[i][j] = Math.sqrt(d); }
      else L[i][j] = (S[i][j] - s) / (L[j][j] || 1e-12);
    }
    return L;
  }
  // standard-normal matrix r×c (Box-Muller) — for posterior IRF draws.
  function randn(r, c) { var m = zeros(r, c); for (var i = 0; i < r; i++) for (var j = 0; j < c; j++) { var u1 = Math.random() || 1e-12, u2 = Math.random(); m[i][j] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); } return m; }
  function transposeM(A) { var r = A.length, c = A[0].length, t = zeros(c, r); for (var i = 0; i < r; i++) for (var j = 0; j < c; j++) t[j][i] = A[i][j]; return t; }

  function selectVarLag(cols, names, maxP, trend) {
    var out = [];
    for (var p = 1; p <= maxP; p++) { try { var m = varFit(cols, names, p, { trend: trend }); out.push({ p: p, aic: m.aic, bic: m.bic, hqic: m.hqic, llf: m.llf }); } catch (e) { } }
    var best = function (key) { var b = out[0]; out.forEach(function (o) { if (o[key] < b[key]) b = o; }); return b ? b.p : null; };
    return { table: out, aic: best('aic'), bic: best('bic'), hqic: best('hqic') };
  }

  // ---------------- BVAR (Litterman / Minnesota prior) ---------------------
  // Per-equation Bayesian ridge with a proper Minnesota prior. For equation i,
  // the prior on the coefficient of variable j at lag l has mean 1 if (own,
  // lag-1) else 0, and variance:
  //   own:   (λ1 / l^λ3)²
  //   cross: (λ1·λ2·σ_i/σ_j / l^λ3)²
  // deterministics get a near-flat prior. Posterior (equation variance σ_i²):
  //   β = (Z'Z/σ_i² + V0⁻¹)⁻¹ (Z'y/σ_i² + V0⁻¹ μ0),  V_post = (Z'Z/σ_i² + V0⁻¹)⁻¹.
  function arSigma(c, p) {
    var Y = [], X = []; for (var t = p; t < c.length; t++) { var row = [1]; for (var L = 1; L <= p; L++) row.push(c[t - L]); X.push(row); Y.push(c[t]); }
    try { var f = olsFit(X, Y); var e = f.resid.to1DArray(); return Math.sqrt(sum(e.map(function (v) { return v * v; })) / Math.max(1, Y.length - X[0].length)) || (std(c) || 1); } catch (_) { return std(c) || 1; }
  }
  function bvar(cols, names, p, opts) {
    opts = opts || {};
    var l1 = opts.lambda1 == null ? 0.2 : opts.lambda1;   // overall tightness
    var l2 = opts.lambda2 == null ? 0.5 : opts.lambda2;   // cross-variable shrinkage
    var l3 = opts.lambda3 == null ? 1 : opts.lambda3;     // lag-decay exponent
    var trend = opts.trend || 'c';
    var K = cols.length, off = (trend === 'n') ? 0 : (trend === 'ct' ? 2 : 1);
    var sig = cols.map(function (c) { return arSigma(c, p); });
    var d = buildVarDesign(cols, p, trend), m = d.m, T = d.T;
    var Z = mat(d.Z), Y = mat(d.Y);
    var ZtZ = Z.transpose().mmul(Z);              // m×m
    var ZtY = Z.transpose().mmul(Y);              // m×K
    // prior variance vector + mean for equation i
    function priorFor(i) {
      var V0 = new Array(m), mu0 = new Array(m).fill(0);
      for (var dpos = 0; dpos < off; dpos++) V0[dpos] = 1e6;     // near-flat on const/trend
      for (var l = 1; l <= p; l++) for (var j = 0; j < K; j++) {
        var pos = off + (l - 1) * K + j;
        if (j === i) { V0[pos] = Math.pow(l1 / Math.pow(l, l3), 2); if (l === 1) mu0[pos] = 1; }
        else { V0[pos] = Math.pow(l1 * l2 * (sig[i] / sig[j]) / Math.pow(l, l3), 2); }
      }
      return { V0: V0, mu0: mu0 };
    }
    var Bcols = [], Vpost = [];                    // per-equation posterior mean (m×1) + cov (m×m)
    for (var i = 0; i < K; i++) {
      var pr = priorFor(i), s2 = sig[i] * sig[i] || 1;
      var A = ZtZ.clone().mul(1 / s2);             // Z'Z/σ²
      for (var r = 0; r < m; r++) A.set(r, r, A.get(r, r) + 1 / pr.V0[r]);   // + V0⁻¹
      var Ainv = safeInverse(A, 'BVAR posterior precision');
      // rhs = Z'y_i/σ² + V0⁻¹ μ0
      var rhs = new Array(m);
      for (var rr = 0; rr < m; rr++) rhs[rr] = ZtY.get(rr, i) / s2 + (1 / pr.V0[rr]) * pr.mu0[rr];
      var bpost = Ainv.mmul(colVec(rhs));          // m×1
      Bcols.push(bpost.to1DArray());
      Vpost.push(Ainv.to2DArray());
    }
    // assemble B (m×K), residuals, Sigma
    var Barr = []; for (var rrr = 0; rrr < m; rrr++) { var row = []; for (var c2 = 0; c2 < K; c2++) row.push(Bcols[c2][rrr]); Barr.push(row); }
    var B = mat(Barr); var resid = Y.clone().sub(Z.mmul(B));
    var Sigma = resid.transpose().mmul(resid).mul(1 / Math.max(1, T - m));
    var model = { method: 'BVAR', names: names, p: p, trend: trend, K: K, T: T, m: m, B: Barr, Sigma: Sigma.to2DArray(), _Vpost: Vpost, priors: { lambda1: l1, lambda2: l2, lambda3: l3 } };
    model.eigen = varStability(model.B, K, p, trend);
    model.stable = model.eigen.every(function (e) { return e.mod < 1 + 1e-8; });
    return model;
  }

  // IRF with credible/confidence bands via legitimate posterior / sampling draws.
  //   BVAR: draw each equation's coeffs from its Normal posterior N(β̂_i, V_post_i).
  //   VAR : matrix-normal sampling vec(B) ~ N(vec(B̂), Σ ⊗ (Z'Z)⁻¹).
  function drawB(model) {
    var K = model.K, m = model.m, B = model.B;
    if (model.method === 'BVAR' && model._Vpost) {
      var cols2 = [];
      for (var i = 0; i < K; i++) {
        var L = cholesky(model._Vpost[i]);          // m×m
        var z = randn(m, 1); var d0 = matMul(L, z); // m×1 perturbation
        var bi = []; for (var r = 0; r < m; r++) bi.push(B[r][i] + d0[r][0]);
        cols2.push(bi);
      }
      var out = []; for (var rr = 0; rr < m; rr++) { var row = []; for (var c = 0; c < K; c++) row.push(cols2[c][rr]); out.push(row); }
      return out;
    }
    // VAR matrix-normal: B + chol(ZtZinv)·N(m×K)·chol(Σ)'
    if (model.ZtZinv) {
      var Lz = cholesky(model.ZtZinv);              // m×m
      var Ls = cholesky(model.Sigma);               // K×K
      var N = randn(m, K);
      var pert = matMul(matMul(Lz, N), transposeM(Ls)); // m×K
      return matAdd(B, pert);
    }
    return B;
  }
  function irfWithBands(model, horizon, draws) {
    draws = draws || 200; var K = model.K;
    var point = varIRF(model, horizon, true);
    var all = [];
    for (var dd = 0; dd < draws; dd++) {
      try {
        var jModel = { method: model.method, K: K, p: model.p, trend: model.trend, B: drawB(model), Sigma: model.Sigma };
        all.push(varIRF(jModel, horizon, true));
      } catch (e) { /* skip a non-PD draw */ }
    }
    if (!all.length) return { point: point, lower: null, upper: null, draws: 0 };
    var lower = [], upper = [];
    for (var h = 0; h <= horizon; h++) {
      lower.push(zeros(K, K)); upper.push(zeros(K, K));
      for (var i = 0; i < K; i++) for (var j = 0; j < K; j++) {
        var vals = all.map(function (a) { return a[h][i][j]; }).sort(function (x, y) { return x - y; });
        lower[h][i][j] = vals[Math.floor(0.16 * vals.length)]; upper[h][i][j] = vals[Math.min(vals.length - 1, Math.floor(0.84 * vals.length))];
      }
    }
    return { point: point, lower: lower, upper: upper, draws: all.length };
  }

  // ---------------- panel data ---------------------------------------------
  // Arellano entity-clustered covariance: (X'X)⁻¹ (Σ_e (X_e'û_e)(X_e'û_e)') (X'X)⁻¹.
  function panelClusterVcov(Xrows, resid, entW, XtXinv, k) {
    var byE = {}, G = 0;
    for (var i = 0; i < Xrows.length; i++) { var e = entW[i]; if (!byE[e]) { byE[e] = new Array(k).fill(0); G++; } for (var c = 0; c < k; c++) byE[e][c] += Xrows[i][c] * resid[i]; }
    var meat = zeros(k, k);
    Object.keys(byE).forEach(function (e) { var s = byE[e]; for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) meat[a][b] += s[a] * s[b]; });
    var n = Xrows.length, cF = (G / Math.max(1, G - 1)) * ((n - 1) / Math.max(1, n - k));
    var v = matMul(matMul(XtXinv, meat), XtXinv);
    for (var a2 = 0; a2 < k; a2++) for (var b2 = 0; b2 < k; b2++) v[a2][b2] *= cF;
    return { vcov: v, G: G };
  }
  // rows: [{entity, time, y, x:[...]}], names. effects: 'pooled'|'fixed'|'random'
  function panel(data, names, opts) {
    opts = opts || {}; var effects = opts.effects || 'fixed';
    var y = data.map(function (r) { return r.y; });
    var Xcols = names.map(function (_, j) { return data.map(function (r) { return r.x[j]; }); });
    if (effects === 'pooled') { var res = ols(y, Xcols, { names: names, intercept: true }); res.method = 'Panel (Pooled OLS)'; res.effects = 'pooled'; res.entities = uniq(data.map(function (r) { return r.entity; })).length; return res; }
    if (effects === 'fixed') {
      // within transform: demean by entity (track entity per within-row for clustering)
      var byEnt = groupBy(data, 'entity');
      var yw = [], xw = names.map(function () { return []; }), entW = [];
      Object.keys(byEnt).forEach(function (e) {
        var grp = byEnt[e]; var ym = mean(grp.map(function (r) { return r.y; }));
        var xm = names.map(function (_, j) { return mean(grp.map(function (r) { return r.x[j]; })); });
        grp.forEach(function (r) { yw.push(r.y - ym); entW.push(e); names.forEach(function (_, j) { xw[j].push(r.x[j] - xm[j]); }); });
      });
      var nEnt = Object.keys(byEnt).length;
      var res2 = ols(yw, xw, { names: names, intercept: false });
      var k = res2.k, dfFE = res2.n - nEnt - k;             // residual df = NT − N − K
      var sigma2FE = dfFE > 0 ? res2.rss / dfFE : res2.rss / Math.max(1, res2.df);
      res2.sigma = Math.sqrt(sigma2FE);
      // (X'X)⁻¹ from the classical vcov (= σ²_ols·(X'X)⁻¹)
      var sig2ols = res2.rss / (res2.n - k);
      var XtXinv = res2.vcov.map(function (row) { return row.map(function (v) { return v / sig2ols; }); });
      // df-corrected classical FE covariance (for the Hausman test)
      res2._vcovFE = XtXinv.map(function (row) { return row.map(function (v) { return v * sigma2FE; }); });
      res2._dfResid = dfFE;
      // entity-clustered (Arellano) covariance — the right default for panels
      var Xrows = []; for (var ii = 0; ii < yw.length; ii++) { var rr = []; for (var jj = 0; jj < k; jj++) rr.push(xw[jj][ii]); Xrows.push(rr); }
      var cl = panelClusterVcov(Xrows, res2.resid, entW, XtXinv, k);
      var dfc = Math.max(1, cl.G - 1);
      res2.se = []; for (var d = 0; d < k; d++) res2.se.push(Math.sqrt(Math.max(cl.vcov[d][d], 0)));
      res2.t = res2.coef.map(function (b, i) { return res2.se[i] ? b / res2.se[i] : NaN; });
      res2.p = res2.t.map(function (tv) { return tPtwo(tv, dfc); });
      var tcc = tInv(0.975, dfc);
      res2.ci = res2.coef.map(function (b, i) { return [b - tcc * res2.se[i], b + tcc * res2.se[i]]; });
      res2.df = dfc; res2.clustered = cl.G; res2.vcov = res2._vcovFE;
      res2.method = 'Panel (Fixed Effects)'; res2.effects = 'fixed'; res2.entities = nEnt;
      res2.dfAdjNote = 'within estimator · ' + nEnt + ' entity intercepts absorbed · cluster-robust SE by entity (' + cl.G + ' clusters)';
      return res2;
    }
    // random effects (simplified FGLS via Swamy-Arora quasi-demean)
    var poolRes = ols(y, Xcols, { names: names, intercept: true });
    var feRes = panel(data, names, { effects: 'fixed' });
    var byEnt2 = groupBy(data, 'entity'); var Ti = Object.keys(byEnt2).map(function (e) { return byEnt2[e].length; });
    var sigE2 = feRes.rss / (feRes._dfResid || feRes.df); var sigU2 = Math.max((poolRes.rss / poolRes.df) - sigE2, sigE2 * 0.05);
    var Tbar = mean(Ti); var theta = 1 - Math.sqrt(sigE2 / (sigE2 + Tbar * sigU2));
    var yq = [], xq = names.map(function () { return []; }), cq = [];
    Object.keys(byEnt2).forEach(function (e) {
      var grp = byEnt2[e]; var ym = mean(grp.map(function (r) { return r.y; }));
      var xm = names.map(function (_, j) { return mean(grp.map(function (r) { return r.x[j]; })); });
      grp.forEach(function (r) { yq.push(r.y - theta * ym); cq.push(1 - theta); names.forEach(function (_, j) { xq[j].push(r.x[j] - theta * xm[j]); }); });
    });
    // include quasi-demeaned constant as a regressor
    var res3 = ols(yq, [cq].concat(xq), { names: ['(const)'].concat(names), intercept: false });
    res3.method = 'Panel (Random Effects)'; res3.effects = 'random'; res3.theta = theta; res3.entities = Object.keys(byEnt2).length;
    // Hausman test: H = (β_FE−β_RE)'(V_FE−V_RE)⁻¹(β_FE−β_RE) ~ χ²(K). Large H ⇒ prefer FE.
    try {
      var bFE = feRes.coef, bRE = res3.coef.slice(1), kk = bFE.length;
      var dV = zeros(kk, kk);
      for (var a = 0; a < kk; a++) for (var b = 0; b < kk; b++) dV[a][b] = feRes._vcovFE[a][b] - res3.vcov[a + 1][b + 1];
      var dvec = colVec(bFE.map(function (v, i) { return v - bRE[i]; }));
      var H = dvec.transpose().mmul(safeInverse(mat(dV), 'Hausman')).mmul(dvec).get(0, 0);
      if (isFinite(H) && H >= 0) { res3.hausman = H; res3.hausmanDf = kk; res3.hausmanP = 1 - chiCdf(H, kk); res3.hausmanPrefer = res3.hausmanP < 0.05 ? 'FE' : 'RE'; }
    } catch (e) { res3.hausmanNote = 'Hausman test not computable (V_FE−V_RE not positive definite for this sample).'; }
    return res3;
  }
  function uniq(a) { return Object.keys(a.reduce(function (o, v) { o[v] = 1; return o; }, {})); }
  function groupBy(a, key) { return a.reduce(function (o, r) { (o[r[key]] = o[r[key]] || []).push(r); return o; }, {}); }

  // ---------------- export -------------------------------------------------
  window.Econ = {
    ready: !!(M && JS),
    mean: mean, std: std, variance: variance, median: median, quantile: quantile, skewness: skewness, kurtosis: kurtosis, describe: describe,
    transform: transform, TRANSFORMS: TRANSFORMS, resample: resample, alignVars: alignVars,
    pearson: pearson, spearman: spearman, corrMatrix: corrMatrix,
    ols: ols, adf: adf, engleGranger: engleGranger, acf: acf, pacf: pacf, granger: granger, grangerMatrix: grangerMatrix,
    varFit: varFit, selectVarLag: selectVarLag, varIRF: varIRF, varFEVD: varFEVD,
    bvar: bvar, irfWithBands: irfWithBands, panel: panel,
    _tCdf: tCdf, _fCdf: fCdf
  };
})();
