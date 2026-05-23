// ================================================================
// econ-xs.js — LBC Analysis: cross-sectional / advanced models.
// Plain ES5 <script>, loaded AFTER econ-core.js. Extends window.Econ
// via Object.assign. No DOM, no imports. Builds on window.Econ._lib.
//
// Methods: garch (GARCH(1,1) / GJR via Nelder-Mead MLE), pca (correlation
// PCA), logit (IRLS logistic), quantReg (IRLS quantile regression),
// factorModel (CAPM / Fama-French via OLS), rollingOls (rolling-window
// regression), chow (structural-break F-test).
// ================================================================
(function () {
  'use strict';
  if (!window.Econ || !window.Econ._lib) return;   // core must load first
  var L = window.Econ._lib;
  var Econ = window.Econ;

  // tiny guards / helpers ---------------------------------------------------
  function cleanPairsByMask(arrs) {
    // arrs: array of equal-length number arrays. Keep rows finite across all.
    var n = arrs[0].length, keep = [];
    for (var i = 0; i < n; i++) {
      var ok = true;
      for (var j = 0; j < arrs.length; j++) { var v = arrs[j][i]; if (v == null || !isFinite(v)) { ok = false; break; } }
      if (ok) keep.push(i);
    }
    return arrs.map(function (a) { return keep.map(function (i) { return a[i]; }); });
  }

  // ========================================================================
  // 1) GARCH(1,1) / GJR-GARCH via Gaussian MLE (Nelder-Mead simplex).
  // ========================================================================
  function garch(yArr, opts) {
    opts = opts || {};
    var gjr = !!opts.gjr;
    var raw = L.clean(yArr);
    var n = raw.length;
    if (n < 20) return { method: 'garch', error: 'Series too short for GARCH (' + n + ' obs, need ≥ 20).' };

    // De-mean (constant mean model), then SCALE residuals to unit variance so the
    // optimizer is well-conditioned regardless of return magnitude (daily returns
    // ~1e-2..1e-4). ω and vol are rescaled back at the end; α,β,γ are scale-free.
    var mu = L.mean(raw);
    var r = raw.map(function (v) { return v - mu; });
    var v0 = L.variance(r, 0) || 1e-8;
    var sc = Math.sqrt(v0) || 1;
    var rs = r.map(function (v) { return v / sc; });   // unit-variance residuals
    var e2 = rs.map(function (e) { return e * e; });

    var idxB = gjr ? 3 : 2;                          // position of β in θ = [ω,α,(γ),β]
    var BIG = 1e10;

    function negLL(theta) {
      var omega = theta[0], alpha = theta[1];
      var gamma = gjr ? theta[2] : 0;
      var beta = theta[idxB];
      if (!(omega > 0) || alpha < 0 || beta < 0 || gamma < 0) return BIG;
      var pers = alpha + beta + gamma / 2;
      if (pers >= 0.9999) return BIG;
      var sig2 = 1, ll = 0, half = 0.5 * Math.log(2 * Math.PI);   // scaled var = 1
      for (var t = 0; t < n; t++) {
        if (t > 0) {
          var prevE2 = e2[t - 1];
          var lev = (gjr && rs[t - 1] < 0) ? gamma * prevE2 : 0;
          sig2 = omega + alpha * prevE2 + lev + beta * sig2;
        }
        if (!(sig2 > 0) || !isFinite(sig2)) return BIG;
        ll += half + 0.5 * Math.log(sig2) + 0.5 * e2[t] / sig2;
      }
      return isFinite(ll) ? ll : BIG;
    }

    // ---- Nelder-Mead simplex (minimizes negLL) on the unit-variance scale ----
    var start = gjr ? [0.05, 0.03, 0.03, 0.9] : [0.05, 0.05, 0.9];
    var theta = nelderMead(negLL, start, 400);
    var alpha = theta[1], gamma = gjr ? theta[2] : 0, beta = theta[idxB];
    var omegaS = theta[0];                             // scaled ω
    var persistence = alpha + beta + gamma / 2;
    var llf = -negLL(theta);

    // Reconstruct conditional vol on the ORIGINAL scale (σ_t = sc·√sig2_scaled).
    var condVol = new Array(n), stdResid = new Array(n), sig2 = 1;
    for (var t = 0; t < n; t++) {
      if (t > 0) { var pe2 = e2[t - 1]; var lev2 = (gjr && rs[t - 1] < 0) ? gamma * pe2 : 0; sig2 = omegaS + alpha * pe2 + lev2 + beta * sig2; }
      condVol[t] = Math.sqrt(Math.max(sig2, 0)) * sc;
      stdResid[t] = condVol[t] > 0 ? r[t] / condVol[t] : 0;
    }

    var omega = omegaS * v0;                           // rescale ω to original variance units
    var kParams = gjr ? 4 : 3;
    var aic = -2 * llf + 2 * kParams, bic = -2 * llf + kParams * Math.log(n);
    var uncondVol = persistence < 1 ? Math.sqrt(omega / (1 - persistence)) : NaN;

    var out = {
      method: 'garch', gjr: gjr, omega: omega, alpha: alpha, beta: beta,
      persistence: persistence, uncondVol: uncondVol, llf: llf, aic: aic, bic: bic,
      condVol: condVol, stdResid: stdResid, mean: mu, n: n
    };
    if (gjr) out.gamma = gamma;
    return out;
  }

  // Nelder-Mead simplex optimizer (downhill, in-place safe). Returns best vertex.
  function nelderMead(fn, x0, maxIter) {
    var nd = x0.length;
    var alphaR = 1, gammaE = 2, rhoC = 0.5, sigmaS = 0.5;   // reflect/expand/contract/shrink
    // build initial simplex (nd+1 vertices)
    var simplex = [x0.slice()];
    for (var i = 0; i < nd; i++) {
      var v = x0.slice();
      var step = (Math.abs(v[i]) > 1e-8 ? 0.1 * v[i] : 0.05);
      v[i] += step;
      simplex.push(v);
    }
    var fval = simplex.map(function (v) { return fn(v); });

    function order() {
      var idx = simplex.map(function (_, i) { return i; });
      idx.sort(function (a, b) { return fval[a] - fval[b]; });
      simplex = idx.map(function (i) { return simplex[i]; });
      fval = idx.map(function (i) { return fval[i]; });
    }

    for (var iter = 0; iter < maxIter; iter++) {
      order();
      // centroid of all but the worst vertex
      var cen = new Array(nd);
      for (var d = 0; d < nd; d++) { var s = 0; for (var j = 0; j < nd; j++) s += simplex[j][d]; cen[d] = s / nd; }
      var worst = nd;                                  // last after ordering
      // reflection
      var xr = new Array(nd); for (var d2 = 0; d2 < nd; d2++) xr[d2] = cen[d2] + alphaR * (cen[d2] - simplex[worst][d2]);
      var fr = fn(xr);
      if (fr < fval[0]) {
        // expansion
        var xe = new Array(nd); for (var d3 = 0; d3 < nd; d3++) xe[d3] = cen[d3] + gammaE * (cen[d3] - simplex[worst][d3]);
        var fe = fn(xe);
        if (fe < fr) { simplex[worst] = xe; fval[worst] = fe; } else { simplex[worst] = xr; fval[worst] = fr; }
      } else if (fr < fval[worst - 1]) {
        simplex[worst] = xr; fval[worst] = fr;          // accept reflection
      } else {
        // contraction toward the better of (worst, reflection)
        var xc = new Array(nd);
        if (fr < fval[worst]) { for (var d4 = 0; d4 < nd; d4++) xc[d4] = cen[d4] + rhoC * (xr[d4] - cen[d4]); }
        else { for (var d5 = 0; d5 < nd; d5++) xc[d5] = cen[d5] + rhoC * (simplex[worst][d5] - cen[d5]); }
        var fc = fn(xc);
        if (fc < Math.min(fr, fval[worst])) { simplex[worst] = xc; fval[worst] = fc; }
        else {
          // shrink toward best
          for (var k = 1; k <= nd; k++) {
            for (var d6 = 0; d6 < nd; d6++) simplex[k][d6] = simplex[0][d6] + sigmaS * (simplex[k][d6] - simplex[0][d6]);
            fval[k] = fn(simplex[k]);
          }
        }
      }
    }
    order();
    return simplex[0];
  }

  // ========================================================================
  // 2) PCA on K standardized columns (correlation-matrix PCA).
  // ========================================================================
  function pca(cols, names, opts) {
    opts = opts || {};
    if (!cols || cols.length < 2) return { method: 'pca', error: 'PCA needs at least 2 variables.' };
    var K = cols.length;
    var clean = cleanPairsByMask(cols);              // row-wise complete cases
    var n = clean[0].length;
    if (n < K + 1) return { method: 'pca', error: 'Too few complete observations (' + n + ') for ' + K + ' variables.' };
    names = names || cols.map(function (_, i) { return 'X' + (i + 1); });

    // z-score each column
    var means = clean.map(function (c) { return L.mean(c); });
    var sds = clean.map(function (c) { return L.std(c, 1); });
    var Z = [];                                       // n×K standardized data (row-major)
    for (var i = 0; i < n; i++) {
      var row = new Array(K);
      for (var j = 0; j < K; j++) { var sd = sds[j] || 1; row[j] = (clean[j][i] - means[j]) / sd; }
      Z.push(row);
    }

    // correlation matrix C = (1/(n-1)) Z'Z  (Z already standardized)
    var C = L.zeros(K, K);
    for (var a = 0; a < K; a++) for (var b = 0; b < K; b++) {
      var s = 0; for (var t = 0; t < n; t++) s += Z[t][a] * Z[t][b];
      C[a][b] = s / (n - 1);
    }

    // EVD → eigenvalues + eigenvectors (columns)
    var evd = new L.EVD(L.mat(C));
    var evals = evd.realEigenvalues;
    var Vmat = evd.eigenvectorMatrix.to2DArray();    // K×K, eigenvector j in column j
    // sort descending by eigenvalue
    var order = evals.map(function (_, i) { return i; }).sort(function (x, y) { return evals[y] - evals[x]; });
    var eigenvalues = order.map(function (i) { return evals[i]; });
    var loadings = [];                                // K×K, row=variable, col=component
    for (var vr = 0; vr < K; vr++) { loadings.push(order.map(function (i) { return Vmat[vr][i]; })); }

    var totalVar = L.sum(eigenvalues.map(function (e) { return Math.max(e, 0); })) || K;
    var explained = eigenvalues.map(function (e) { return Math.max(e, 0) / totalVar; });
    var cumExplained = []; var acc = 0;
    for (var c = 0; c < explained.length; c++) { acc += explained[c]; cumExplained.push(acc); }

    // scores = Z · loadings  (n×K)
    var scores = L.matMul(Z, loadings);

    return {
      method: 'pca', names: names, eigenvalues: eigenvalues, explained: explained,
      cumExplained: cumExplained, loadings: loadings, scores: scores, n: n
    };
  }

  // ========================================================================
  // 3) Logistic regression via IRLS (Newton-Raphson).
  // ========================================================================
  function logit(y, Xcols, opts) {
    opts = opts || {};
    var arrs = cleanPairsByMask([y].concat(Xcols || []));
    var yv = arrs[0], X = arrs.slice(1);
    var n = yv.length;
    // validate binary 0/1
    for (var i = 0; i < n; i++) { if (yv[i] !== 0 && yv[i] !== 1) return { method: 'logit', error: 'Logit requires a binary 0/1 dependent variable.' }; }
    var ones = 0; for (var i2 = 0; i2 < n; i2++) ones += yv[i2];
    if (ones === 0 || ones === n) return { method: 'logit', error: 'Dependent variable has no variation (all 0s or all 1s).' };

    var p = X.length, k = p + 1;                      // + intercept
    if (n < k + 1) return { method: 'logit', error: 'Too few observations (' + n + ') for ' + k + ' parameters.' };
    var names = ['(const)'].concat(opts.names || X.map(function (_, i) { return 'X' + (i + 1); }));

    // design rows (intercept first)
    var rows = [];
    for (var t = 0; t < n; t++) { var row = [1]; for (var j = 0; j < p; j++) row.push(X[j][t]); rows.push(row); }

    var beta = new Array(k).fill(0);
    var XtWXinv = null;
    for (var iter = 0; iter < 25; iter++) {
      var Xb = new Array(n), pr = new Array(n), w = new Array(n), z = new Array(n);
      for (var r = 0; r < n; r++) {
        var lin = 0; for (var c = 0; c < k; c++) lin += rows[r][c] * beta[c];
        Xb[r] = lin;
        var pi = 1 / (1 + Math.exp(-lin));
        pi = Math.min(Math.max(pi, 1e-10), 1 - 1e-10);
        pr[r] = pi;
        var wi = pi * (1 - pi);
        w[r] = wi;
        z[r] = lin + (yv[r] - pi) / wi;               // working response
      }
      // X'WX and X'Wz
      var XtWX = L.zeros(k, k), XtWz = new Array(k).fill(0);
      for (var rr = 0; rr < n; rr++) {
        var wr = w[rr], zr = z[rr], xr = rows[rr];
        for (var a = 0; a < k; a++) {
          XtWz[a] += xr[a] * wr * zr;
          for (var b = a; b < k; b++) XtWX[a][b] += xr[a] * wr * xr[b];
        }
      }
      for (var a2 = 0; a2 < k; a2++) for (var b2 = 0; b2 < a2; b2++) XtWX[a2][b2] = XtWX[b2][a2];  // symmetric
      var inv;
      try { inv = L.safeInverse(L.mat(XtWX), 'Logit X\'WX'); }
      catch (e) { return { method: 'logit', error: e.message }; }
      XtWXinv = inv.to2DArray();
      var newBeta = new Array(k);
      for (var a3 = 0; a3 < k; a3++) { var s = 0; for (var b3 = 0; b3 < k; b3++) s += XtWXinv[a3][b3] * XtWz[b3]; newBeta[a3] = s; }
      // convergence check
      var delta = 0; for (var d = 0; d < k; d++) delta += Math.abs(newBeta[d] - beta[d]);
      beta = newBeta;
      if (delta < 1e-8) break;
    }
    if (!XtWXinv) return { method: 'logit', error: 'IRLS failed to converge.' };

    // fitted probabilities + log-likelihood
    var fitted = new Array(n), llf = 0;
    for (var f = 0; f < n; f++) {
      var lin2 = 0; for (var c2 = 0; c2 < k; c2++) lin2 += rows[f][c2] * beta[c2];
      var pf = 1 / (1 + Math.exp(-lin2)); pf = Math.min(Math.max(pf, 1e-12), 1 - 1e-12);
      fitted[f] = pf;
      llf += yv[f] * Math.log(pf) + (1 - yv[f]) * Math.log(1 - pf);
    }
    // null model (intercept only): p0 = mean(y)
    var p0 = ones / n; var llf0 = ones * Math.log(p0) + (n - ones) * Math.log(1 - p0);
    var pseudoR2 = llf0 ? 1 - llf / llf0 : NaN;

    var se = new Array(k), zStat = new Array(k), pval = new Array(k), or = new Array(k);
    for (var s2 = 0; s2 < k; s2++) {
      se[s2] = Math.sqrt(Math.max(XtWXinv[s2][s2], 0));
      zStat[s2] = se[s2] ? beta[s2] / se[s2] : NaN;
      pval[s2] = isFinite(zStat[s2]) ? 2 * (1 - L.normCdf(Math.abs(zStat[s2]))) : NaN;
      or[s2] = Math.exp(beta[s2]);
    }

    return {
      method: 'logit', names: names, coef: beta, se: se, z: zStat, p: pval,
      oddsRatio: or, pseudoR2: pseudoR2, llf: llf, n: n, fitted: fitted
    };
  }

  // ========================================================================
  // 4) Quantile regression at tau via IRLS approximation.
  // ========================================================================
  function quantReg(y, Xcols, opts) {
    opts = opts || {};
    var tau = opts.tau == null ? 0.5 : opts.tau;
    if (!(tau > 0 && tau < 1)) return { method: 'quantreg', error: 'tau must be in (0,1).' };
    var arrs = cleanPairsByMask([y].concat(Xcols || []));
    var yv = arrs[0], X = arrs.slice(1);
    var n = yv.length, p = X.length, k = p + 1;
    if (n < k + 1) return { method: 'quantreg', error: 'Too few observations (' + n + ') for ' + k + ' parameters.' };
    var names = ['(const)'].concat(opts.names || X.map(function (_, i) { return 'X' + (i + 1); }));

    // design rows (intercept first)
    var rows = [];
    for (var t = 0; t < n; t++) { var row = [1]; for (var j = 0; j < p; j++) row.push(X[j][t]); rows.push(row); }

    // OLS start (intercept + Xcols)
    var coef;
    try { coef = L.olsFit(rows, yv).beta.to1DArray(); }
    catch (e) { return { method: 'quantreg', error: e.message }; }

    var FLOOR = 1e-6;
    for (var iter = 0; iter < 50; iter++) {
      // residuals + IRLS weights for the check loss ρ_τ
      var w = new Array(n);
      for (var r = 0; r < n; r++) {
        var fit = 0; for (var c = 0; c < k; c++) fit += rows[r][c] * coef[c];
        var res = yv[r] - fit;
        var ar = Math.abs(res); if (ar < FLOOR) ar = FLOOR;
        w[r] = (res > 0 ? tau : (1 - tau)) / ar;
      }
      // weighted LS: (X'WX)⁻¹ X'Wy
      var XtWX = L.zeros(k, k), XtWy = new Array(k).fill(0);
      for (var rr = 0; rr < n; rr++) {
        var wr = w[rr], xr = rows[rr], yr = yv[rr];
        for (var a = 0; a < k; a++) {
          XtWy[a] += xr[a] * wr * yr;
          for (var b = a; b < k; b++) XtWX[a][b] += xr[a] * wr * xr[b];
        }
      }
      for (var a2 = 0; a2 < k; a2++) for (var b2 = 0; b2 < a2; b2++) XtWX[a2][b2] = XtWX[b2][a2];
      var inv;
      try { inv = L.safeInverse(L.mat(XtWX), 'QuantReg X\'WX').to2DArray(); }
      catch (e2) { return { method: 'quantreg', error: e2.message }; }
      var newCoef = new Array(k), delta = 0;
      for (var a3 = 0; a3 < k; a3++) { var s = 0; for (var b3 = 0; b3 < k; b3++) s += inv[a3][b3] * XtWy[b3]; newCoef[a3] = s; delta += Math.abs(s - coef[a3]); }
      coef = newCoef;
      if (delta < 1e-8) break;
    }

    var fitted = new Array(n);
    for (var f = 0; f < n; f++) { var fv = 0; for (var c2 = 0; c2 < k; c2++) fv += rows[f][c2] * coef[c2]; fitted[f] = fv; }

    return { method: 'quantreg', tau: tau, names: names, coef: coef, n: n, fitted: fitted };
  }

  // ========================================================================
  // 5) Factor model (CAPM / Fama-French) — OLS, intercept = Jensen's alpha.
  // ========================================================================
  function factorModel(y, factorCols, opts) {
    opts = opts || {};
    var fnames = opts.names || (factorCols || []).map(function (_, i) { return 'F' + (i + 1); });
    var res = Econ.ols(y, factorCols, { names: fnames, intercept: true, robust: opts.robust || 'hac' });
    if (res.error) return { method: 'factor', error: res.error };
    var ppy = opts.periodsPerYear == null ? 12 : opts.periodsPerYear;
    var alpha = res.coef[0];
    res.method = 'factor';
    res.alpha = alpha;
    res.alphaAnn = alpha * ppy;
    res.alphaT = res.t[0];
    res.alphaP = res.p[0];
    res.betas = res.coef.slice(1);
    res.betaNames = fnames;
    res.periodsPerYear = ppy;
    return res;
  }

  // ========================================================================
  // 6) Rolling-window OLS — coefficient paths over time.
  // ========================================================================
  function rollingOls(y, Xcols, opts) {
    opts = opts || {};
    var win = opts.window == null ? 36 : opts.window;
    var arrs = cleanPairsByMask([y].concat(Xcols || []));
    var yv = arrs[0], X = arrs.slice(1);
    var n = yv.length, p = X.length, k = p + 1;
    if (win < k + 1) return { method: 'rolling', error: 'Window (' + win + ') too small for ' + k + ' parameters.' };
    if (n < win) return { method: 'rolling', error: 'Series (' + n + ') shorter than window (' + win + ').' };
    var names = ['(const)'].concat(opts.names || X.map(function (_, i) { return 'X' + (i + 1); }));

    var coefPaths = []; for (var c = 0; c < k; c++) coefPaths.push([]);
    var dates = [];
    for (var end = win; end <= n; end++) {
      var sub = Econ.ols(
        yv.slice(end - win, end),
        X.map(function (col) { return col.slice(end - win, end); }),
        { names: names.slice(1), intercept: true }
      );
      if (sub.error) { for (var ce = 0; ce < k; ce++) coefPaths[ce].push(NaN); }
      else { for (var cc = 0; cc < k; cc++) coefPaths[cc].push(sub.coef[cc]); }
      dates.push(end - 1);                            // index of the window's last obs
    }

    return { method: 'rolling', window: win, names: names, coefPaths: coefPaths, dates: dates, n: n };
  }

  // ========================================================================
  // 7) Chow structural-break F-test at breakIndex.
  // ========================================================================
  function chow(y, Xcols, breakIndex) {
    var arrs = cleanPairsByMask([y].concat(Xcols || []));
    var yv = arrs[0], X = arrs.slice(1);
    var n = yv.length, p = X.length, k = p + 1;      // params incl. intercept
    if (breakIndex == null || breakIndex < k + 1 || (n - breakIndex) < k + 1) {
      return { method: 'chow', error: 'Break index must leave at least ' + (k + 1) + ' observations on each side.' };
    }

    function rss(yy, cols) {
      var rows = [];
      for (var t = 0; t < yy.length; t++) { var row = [1]; for (var j = 0; j < cols.length; j++) row.push(cols[j][t]); rows.push(row); }
      var f = L.olsFit(rows, yy);
      var e = f.resid.to1DArray();
      return L.sum(e.map(function (v) { return v * v; }));
    }

    var rssP, rss1, rss2;
    try {
      rssP = rss(yv, X);
      rss1 = rss(yv.slice(0, breakIndex), X.map(function (c) { return c.slice(0, breakIndex); }));
      rss2 = rss(yv.slice(breakIndex), X.map(function (c) { return c.slice(breakIndex); }));
    } catch (e) { return { method: 'chow', error: e.message }; }

    var df1 = k, df2 = n - 2 * k;
    if (df2 < 1) return { method: 'chow', error: 'Not enough observations for the Chow test.' };
    var num = (rssP - (rss1 + rss2)) / df1;
    var den = (rss1 + rss2) / df2;
    var fStat = den > 0 ? num / den : NaN;
    var cdf = isFinite(fStat) ? Econ._fCdf(fStat, df1, df2) : null;
    var pval = cdf == null ? null : 1 - cdf;

    return {
      method: 'chow', fStat: fStat, df1: df1, df2: df2, p: pval,
      breakIndex: breakIndex, broke: pval != null && pval < 0.05,
      rssPooled: rssP, rss1: rss1, rss2: rss2
    };
  }

  // ---------------- export -------------------------------------------------
  if (window.Econ) Object.assign(window.Econ, {
    garch: garch, pca: pca, logit: logit, quantReg: quantReg,
    factorModel: factorModel, rollingOls: rollingOls, chow: chow
  });
})();
