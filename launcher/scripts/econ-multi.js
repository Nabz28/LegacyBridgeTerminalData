// ================================================================
// econ-multi.js — LBC Analysis multivariate / cointegration engine.
// Pure functions, no DOM. Plain ES5 (var/function). Loaded as a <script>
// AFTER econ-core.js; extends window.Econ via Object.assign in an IIFE.
//
// Builds strictly on window.Econ._lib (matrix toolkit) + window.Econ.varFit
// / varIRF / ols. Adds: Structural VAR (recursive + Blanchard-Quah),
// Johansen cointegration (trace + max-eigenvalue), VECM, and VAR forecasts.
// ================================================================
(function () {
  'use strict';
  if (!window.Econ || !window.Econ._lib) return;     // econ-core must load first
  var L = window.Econ._lib;
  var Econ = window.Econ;

  // ---- thin aliases over the core toolkit (do NOT reimplement) ------------
  var inverse = L.inverse;          // (Matrix)->Matrix
  var safeInverse = L.safeInverse;  // (Matrix,label)->Matrix
  var cholesky = L.cholesky;        // (2D)->2D lower-triangular (throws if non-PD)
  var matMul = L.matMul;            // (2D,2D)->2D
  var matAdd = L.matAdd;            // (2D,2D)->2D
  var transposeM = L.transposeM;    // (2D)->2D
  var zeros = L.zeros, eye = L.eye;
  var coefBlocks = L.coefBlocks;    // (B,K,p,trend)->A[l][eq][var] (K×K blocks)
  var mat = L.mat, MClass = L.M;
  var sum = L.sum;

  // ---- small helpers -------------------------------------------------------
  function inv2D(A2D, label) { return safeInverse(mat(A2D), label || 'matrix').to2DArray(); }
  function mul2D(A, B) { return matMul(A, B); }
  // M - W (W'W)^-1 W' M  : residual of projecting columns of M on W (all 2D).
  function projResid(Mrows, Wrows, label) {
    var W = mat(Wrows), Wt = W.transpose();
    var WtWinv = safeInverse(Wt.mmul(W), label || "short-run regressor matrix W'W");
    var Mm = mat(Mrows);
    var hat = W.mmul(WtWinv).mmul(Wt).mmul(Mm);        // projection of M onto W
    return Mm.clone().sub(hat).to2DArray();            // residual rows
  }
  // S = A' B / scale  (A,B are 2D T×k). Returns k×k 2D.
  function crossProd(A, B, scale) {
    var prod = mat(A).transpose().mmul(mat(B)).to2DArray();
    if (scale && scale !== 1) for (var i = 0; i < prod.length; i++) for (var j = 0; j < prod[i].length; j++) prod[i][j] /= scale;
    return prod;
  }
  // Real eigenvalues+vectors of a (possibly non-symmetric) 2D matrix via ml-matrix EVD.
  // Returns { values:[{re,idx}], vectors:2D (columns = eigenvectors) } sorted desc by re.
  function eigDesc(A2D) {
    var e = new L.EVD(mat(A2D));
    var re = e.realEigenvalues, V = e.eigenvectorMatrix.to2DArray();
    var order = re.map(function (v, i) { return { re: v, idx: i }; })
      .sort(function (a, b) { return b.re - a.re; });
    return { order: order, vectors: V, real: re };
  }
  // First-difference each column; returns { dy:2D (T-1 × K), level:2D (T-1 × K) of y_{t-1} }.
  function firstDiff(cols) {
    var K = cols.length, T = cols[0].length, dy = [], lev = [];
    for (var t = 1; t < T; t++) {
      var dr = [], lr = [];
      for (var v = 0; v < K; v++) { dr.push(cols[v][t] - cols[v][t - 1]); lr.push(cols[v][t - 1]); }
      dy.push(dr); lev.push(lr);
    }
    return { dy: dy, level: lev };
  }

  // =========================================================================
  // 1) Structural VAR — recursive (Cholesky) or Blanchard-Quah (long-run).
  // =========================================================================
  function svar(cols, names, p, opts) {
    opts = opts || {};
    var trend = opts.trend || 'c';
    var ident = opts.ident || 'recursive';
    var horizon = opts.horizon == null ? 12 : opts.horizon;
    var K = cols.length;
    var T0 = cols[0] ? cols[0].length : 0;
    // need T_eff = T0 - p observations comfortably above the parameter count
    if (T0 - p <= K * p + 10) return { method: 'svar', error: 'Not enough observations for an SVAR (need T − p > K·p + 10). Use a longer span, fewer lags, or fewer variables.' };

    var model;
    try { model = Econ.varFit(cols, names, p, { trend: trend }); }
    catch (e) { return { method: 'svar', error: e.message || String(e) }; }
    var Sigma = model.Sigma;                            // K×K reduced-form cov

    // Reduced-form (un-orthogonalized) MA matrices Φ_h. orth=false ⇒ P=I in core,
    // so varIRF returns the raw Φ_h (each Φ_h·I = Φ_h). Verified in econ-core.js.
    var Phi = Econ.varIRF(model, horizon, false);       // array of (h+1) K×K

    // Structural impact matrix B0 (columns = structural shocks).
    var B0;
    try {
      if (ident === 'bq') {
        // Long-run reduced-form multiplier Ψ1 = (I − ΣA_l)^-1.
        var A = coefBlocks(model.B, K, p, trend);       // A[l][eq][var]
        var sumA = zeros(K, K);
        for (var l = 0; l < p; l++) sumA = matAdd(sumA, A[l]);
        var ImA = matAdd(eye(K), sumA.map(function (row) { return row.map(function (x) { return -x; }); })); // I − ΣA
        var Psi1 = inv2D(ImA, 'Long-run VAR multiplier (I − ΣAₗ)');
        // Long-run covariance and its Cholesky (lower-triangular long-run impact).
        var LR = matMul(matMul(Psi1, Sigma), transposeM(Psi1));
        var Cl = cholesky(LR);                          // throws if not PD
        // Structural long-run impact is lower-triangular ⇒ B0 = Ψ1^-1 · Cl.
        var Psi1inv = inv2D(Psi1, 'Long-run VAR multiplier inverse');
        B0 = matMul(Psi1inv, Cl);
      } else {
        ident = 'recursive';
        B0 = cholesky(Sigma);                           // lower-triangular impact
      }
    } catch (e2) { return { method: 'svar', ident: ident, error: e2.message || String(e2) }; }

    // Structural IRF_h = Φ_h · B0 (response of var i to structural shock j).
    var irf = Phi.map(function (ph) { return matMul(ph, B0); });

    // Structural FEVD: share of var i's h-step forecast variance from shock j.
    var fevd = [], cum = zeros(K, K);
    for (var h = 0; h <= horizon; h++) {
      var Ih = irf[h];
      for (var i = 0; i < K; i++) for (var j = 0; j < K; j++) cum[i][j] += Ih[i][j] * Ih[i][j];
      var row = [];
      for (var i2 = 0; i2 < K; i2++) {
        var tot = 0; for (var j2 = 0; j2 < K; j2++) tot += cum[i2][j2];
        var sh = []; for (var j3 = 0; j3 < K; j3++) sh.push(tot ? cum[i2][j3] / tot : 0);
        row.push(sh);
      }
      fevd.push(row);
    }

    return {
      method: 'svar', ident: ident, names: names, p: p, K: K, horizon: horizon,
      B0: B0, irf: irf, fevd: fevd, stable: model.stable, sigma: Sigma
    };
  }

  // =========================================================================
  // 2) Johansen cointegration — trace + maximum-eigenvalue tests.
  //    Osterwald-Lenum 5% critical values (constant in cointegration space).
  // =========================================================================
  // Indexed by n−r (number of common stochastic trends being tested), 1..5.
  var JOHANSEN_TRACE_5 = { 1: 3.84, 2: 15.49, 3: 29.80, 4: 47.86, 5: 68.81 };
  var JOHANSEN_MAXEIG_5 = { 1: 3.84, 2: 14.26, 3: 21.13, 4: 27.58, 5: 33.88 };

  function johansen(cols, names, p, opts) {
    opts = opts || {};
    var det = opts.det || 'c';
    var K = cols.length;
    var T0 = cols[0] ? cols[0].length : 0;
    if (p < 1) p = 1;
    // After differencing and (p−1) lags of ΔY we keep Teff rows.
    var Teff = T0 - p;
    if (Teff <= K * (p) + 10) return { method: 'johansen', error: 'Not enough observations for the Johansen test (need T − p > K·p + 10). Use a longer span, fewer lags, or fewer variables.' };

    // ΔY (T-1 × K) and Y_{-1} (T-1 × K), then trim the first (p−1) rows so the
    // short-run lagged differences ΔY_{t-i} are available.
    var fd = firstDiff(cols);                            // dy, level over rows t=1..T0-1
    var dyAll = fd.dy, levAll = fd.level;
    var lagD = p - 1;
    var dY = [], Ym1 = [], W = [];
    for (var r = lagD; r < dyAll.length; r++) {
      dY.push(dyAll[r].slice());
      Ym1.push(levAll[r].slice());
      var w = (det === 'c') ? [1] : [];                  // deterministic term
      for (var i = 1; i <= lagD; i++) {                  // (p−1) lags of ΔY
        var prev = dyAll[r - i];
        for (var v = 0; v < K; v++) w.push(prev[v]);
      }
      if (!w.length) w.push(1);                          // never leave W empty (det:'n', p=1)
      W.push(w);
    }
    var T = dY.length;
    if (T < K + 5) return { method: 'johansen', error: 'Too few effective observations after lagging for the Johansen test.' };

    // Concentrate out the short-run regressors W.
    var R0, R1;
    try {
      R0 = projResid(dY, W, "Johansen short-run matrix W'W");   // residual of ΔY ~ W
      R1 = projResid(Ym1, W, "Johansen short-run matrix W'W");  // residual of Y_{-1} ~ W
    } catch (e) { return { method: 'johansen', error: e.message || String(e) }; }

    // Product-moment matrices.
    var S00 = crossProd(R0, R0, T);
    var S11 = crossProd(R1, R1, T);
    var S01 = crossProd(R0, R1, T);
    var S10 = transposeM(S01);

    // Eigenvalues of S11^-1 S10 S00^-1 S01.
    var lambdas, eigvecRaw;
    try {
      var S11inv = inv2D(S11, 'Johansen S11');
      var S00inv = inv2D(S00, 'Johansen S00');
      var Mmat = matMul(matMul(matMul(S11inv, S10), S00inv), S01);   // K×K
      var ed = eigDesc(Mmat);
      lambdas = ed.order.map(function (o) {
        var lam = o.re; if (!isFinite(lam)) lam = 0;
        if (lam < 0) lam = 0; if (lam > 0.999999) lam = 0.999999;     // clamp to (0,1)
        return { lam: lam, idx: o.idx };
      });
      eigvecRaw = ed.vectors;                                          // columns are eigenvectors
    } catch (e2) { return { method: 'johansen', error: e2.message || String(e2) }; }

    // Test statistics. trace_r = −T Σ_{i=r+1}^{K} ln(1−λ_i);
    // maxeig_r = −T ln(1−λ_{r+1}). r = 0..K−1.
    var trace = [], maxeig = [], rank = 0, rankDecided = false;
    for (var rr = 0; rr < K; rr++) {
      var tr = 0;
      for (var ii = rr; ii < K; ii++) tr += -Math.log(1 - lambdas[ii].lam);
      tr *= T;
      var me = -T * Math.log(1 - lambdas[rr].lam);
      var nMinusR = K - rr;                                            // dimension being tested
      var traceCrit = JOHANSEN_TRACE_5[nMinusR] != null ? JOHANSEN_TRACE_5[nMinusR] : null;
      var maxCrit = JOHANSEN_MAXEIG_5[nMinusR] != null ? JOHANSEN_MAXEIG_5[nMinusR] : null;
      trace.push({ r: rr, stat: tr, crit5: traceCrit });
      maxeig.push({ r: rr, stat: me, crit5: maxCrit });
      // Rank = first r for which the trace test fails to reject (stat < crit).
      if (!rankDecided) {
        if (traceCrit != null && tr < traceCrit) { rank = rr; rankDecided = true; }
      }
    }
    if (!rankDecided) rank = K;                                        // never accepted ⇒ full rank

    return {
      method: 'johansen', names: names, K: K, p: p, det: det,
      eigenvalues: lambdas.map(function (o) { return o.lam; }),
      eigenvectors: eigvecRaw,                                         // columns = β candidates
      _S11: S11, _R1: R1, _R0: R0, _T: T,                              // reused by vecm()
      trace: trace, maxeig: maxeig, rank: rank
    };
  }

  // =========================================================================
  // 3) VECM — given cointegrating rank r, estimate α, β, Γ via OLS.
  //    ΔY_t = α β' Y_{t-1} + Σ Γ_i ΔY_{t-i} + ε_t.
  // =========================================================================
  function vecm(cols, names, p, opts) {
    opts = opts || {};
    var K = cols.length;
    // Run (or reuse) the Johansen step to get β candidates and the rank.
    var jo = johansen(cols, names, p, { det: opts.det || 'c' });
    if (jo.error) return { method: 'vecm', error: jo.error };
    var r = opts.r == null ? jo.rank : opts.r;
    if (r < 1) return { method: 'vecm', rank: 0, names: names, beta: [], alpha: [], gamma: [], sigma: jo._S11 ? null : null, note: 'Johansen rank = 0 — no cointegration; estimate a VAR in differences instead.' };
    if (r > K - 1) r = K - 1;                            // at most K−1 cointegrating vectors

    // β = first r eigenvectors (columns of jo.eigenvectors), normalized so the
    // first element of each vector is 1.
    var V = jo.eigenvectors, K2 = V.length;
    var beta = [];                                       // K×r
    for (var i = 0; i < K2; i++) beta.push(new Array(r).fill(0));
    for (var c = 0; c < r; c++) {
      var srcCol = c;                                    // eigenvectors already sorted desc
      var first = V[0][srcCol];
      var scale = (first && isFinite(first) && Math.abs(first) > 1e-12) ? 1 / first : 1;
      for (var rIdx = 0; rIdx < K2; rIdx++) beta[rIdx][c] = V[rIdx][srcCol] * scale;
    }

    // Build the error-correction term ECT_t = β' Y_{t-1} (one column per coint vector)
    // and the regressor block [ECT_{t}, ΔY_{t-1}, ..., ΔY_{t-(p-1)}, const].
    var fd = firstDiff(cols);
    var dyAll = fd.dy, levAll = fd.level;
    var lagD = p - 1;
    var dY = [], Xr = [], ectSeries = [];
    for (var t = lagD; t < dyAll.length; t++) {
      dY.push(dyAll[t].slice());
      // ECT = β' y_{t-1}  (r values)
      var ylev = levAll[t];                              // K-vector y_{t-1}
      var ect = [];
      for (var cc = 0; cc < r; cc++) {
        var s = 0; for (var k = 0; k < K; k++) s += beta[k][cc] * ylev[k];
        ect.push(s);
      }
      ectSeries.push(ect);
      var row = ect.slice();                             // start with ECT terms
      for (var lg = 1; lg <= lagD; lg++) {               // lagged ΔY
        var pr = dyAll[t - lg];
        for (var v = 0; v < K; v++) row.push(pr[v]);
      }
      row.push(1);                                       // constant
      Xr.push(row);
    }
    var T = dY.length;
    if (T <= Xr[0].length) return { method: 'vecm', error: 'Not enough observations to estimate the VECM short-run system.' };

    // OLS equation-by-equation: each ΔY_i column on the shared regressor block X.
    var m = Xr[0].length;
    var coefByEq = [];                                   // K equations × m
    var residCols = [];                                  // K residual series
    for (var eq = 0; eq < K; eq++) {
      var yEq = dY.map(function (rw) { return rw[eq]; });
      var f;
      try { f = L.olsFit(Xr, yEq); }
      catch (e) { return { method: 'vecm', error: e.message || String(e) }; }
      coefByEq.push(f.beta.to1DArray());
      residCols.push(f.resid.to1DArray());
    }

    // α = coefficient on the ECT terms (first r columns of each equation), K×r.
    var alpha = [];
    for (var e2 = 0; e2 < K; e2++) { var ar = []; for (var rc = 0; rc < r; rc++) ar.push(coefByEq[e2][rc]); alpha.push(ar); }

    // Γ blocks: Γ_i is K×K, taken from regressor columns after the r ECT terms.
    var gamma = [];
    for (var gi = 0; gi < lagD; gi++) {
      var Gi = [];
      for (var ge = 0; ge < K; ge++) {
        var gr = [];
        for (var gv = 0; gv < K; gv++) gr.push(coefByEq[ge][r + gi * K + gv]);
        Gi.push(gr);
      }
      gamma.push(Gi);
    }

    // Residual covariance Σ = E'E / (T − m).
    var Erows = [];
    for (var rt = 0; rt < T; rt++) { var er = []; for (var ek = 0; ek < K; ek++) er.push(residCols[ek][rt]); Erows.push(er); }
    var Sigma = crossProd(Erows, Erows, Math.max(1, T - m));

    return {
      method: 'vecm', rank: r, names: names, p: p, det: opts.det || 'c',
      beta: beta, alpha: alpha, gamma: gamma, sigma: Sigma, ect: ectSeries,
      stable: jo.rank, johansenRank: jo.rank
    };
  }

  // =========================================================================
  // 4) VAR forecast — recursive h-step-ahead projection from a fitted VAR.
  //    Needs the last p observations (opts.lastObs = the cols used to fit).
  // =========================================================================
  function varForecast(model, horizon, opts) {
    opts = opts || {};
    if (!model || !model.B) return { method: 'varforecast', error: 'A fitted VAR model (with coefficient matrix B) is required.' };
    horizon = horizon == null ? 12 : horizon;
    var K = model.K, p = model.p, trend = model.trend || 'c';
    var names = model.names || [];
    var off = (trend === 'n') ? 0 : (trend === 'ct' ? 2 : 1);

    // Seed history: last p rows of the original series (cols-of-arrays).
    var lastObs = opts.lastObs || model.lastObs;
    if (!lastObs || !lastObs.length || lastObs.length < K) return { method: 'varforecast', error: 'Pass opts.lastObs = the K series used to fit the model (last p rows are read).' };
    var Tin = lastObs[0].length;
    if (Tin < p) return { method: 'varforecast', error: 'Need at least p observations in opts.lastObs to seed the forecast.' };

    // history[i] = most-recent-last array of values for variable i (mutable copy).
    var history = [];
    for (var i = 0; i < K; i++) history.push(lastObs[i].slice(Tin - p));   // length p

    var A = coefBlocks(model.B, K, p, trend);             // A[l][eq][var]
    var B = model.B;                                      // m×K
    var trendStart = Tin;                                 // t index for the 'ct' trend term

    var out = [];
    for (var h = 1; h <= horizon; h++) {
      var pred = new Array(K).fill(0);
      for (var eq = 0; eq < K; eq++) {
        var val = 0;
        if (trend !== 'n') val += B[0][eq];               // constant
        if (trend === 'ct') val += B[1][eq] * (trendStart + h);  // linear trend
        for (var lag = 1; lag <= p; lag++) {
          for (var v = 0; v < K; v++) {
            var laggedVal = history[v][history[v].length - lag];
            val += A[lag - 1][eq][v] * laggedVal;
          }
        }
        pred[eq] = val;
      }
      // append prediction to each variable's history, drop the oldest
      for (var v2 = 0; v2 < K; v2++) { history[v2].push(pred[v2]); history[v2].shift(); }
      out.push({ h: h, values: pred.slice() });
    }

    // Simple ±σ bands from the residual covariance diagonal (1-step variance,
    // grown by the cumulative MA contribution for an honest fan).
    var sigma = model.Sigma;
    var sd1 = [];
    for (var s = 0; s < K; s++) sd1.push(sigma && sigma[s] ? Math.sqrt(Math.max(sigma[s][s], 0)) : 0);
    // cumulative forecast-error variance via MA matrices Φ_h (reduced form)
    var Phi;
    try { Phi = Econ.varIRF(model, horizon, false); } catch (e) { Phi = null; }
    for (var hh = 0; hh < out.length; hh++) {
      var band = [];
      if (Phi) {
        // var_i(h) = Σ_{s=0}^{h-1} Σ_k Φ_s[i][k]^2 · σ_k^2  (diagonal-Σ approximation)
        for (var iv = 0; iv < K; iv++) {
          var varSum = 0;
          for (var sStep = 0; sStep <= hh; sStep++) {
            var Ps = Phi[sStep];
            for (var kk = 0; kk < K; kk++) { var c = Ps[iv][kk]; varSum += c * c * (sigma[kk] ? sigma[kk][kk] : 0); }
          }
          band.push(Math.sqrt(Math.max(varSum, 0)));
        }
      } else {
        for (var iv2 = 0; iv2 < K; iv2++) band.push(sd1[iv2] * Math.sqrt(hh + 1));
      }
      out[hh].sd = band;
      out[hh].lower = out[hh].values.map(function (val, idx) { return val - 1.96 * band[idx]; });
      out[hh].upper = out[hh].values.map(function (val, idx) { return val + 1.96 * band[idx]; });
    }

    return { method: 'varforecast', names: names, horizon: horizon, K: K, p: p, trend: trend, forecast: out };
  }

  // ---- export --------------------------------------------------------------
  if (window.Econ) Object.assign(window.Econ, { svar: svar, johansen: johansen, vecm: vecm, varForecast: varForecast });
})();
