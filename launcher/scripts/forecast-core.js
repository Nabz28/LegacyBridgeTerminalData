// ================================================================
// forecast-core.js — window.Forecast: a scenario-driven, multi-layer
// node/equation forecasting engine for the Macro terminal.
//
// A model is a DAG of variable NODES. Each node has a history (a macro/manual
// series, or a value derived from its parents) and a forecast METHOD:
//   • regression — node = c + Σβⱼ·parentⱼ(−lag)   (OLS fitted on history)
//   • equation   — node = f(parent symbols)        (user formula, deterministic)
//   • arima/ets  — univariate Box-Jenkins / Holt-Winters on the node's own history
//   • drift/rw   — random walk (with/without drift)
//   • growth     — compound % per period (a scenario assumption)
//   • scenario   — a user-supplied future path (full manual control)
// Forecasting topologically sorts the DAG and propagates period-by-period, so a
// 3-layer model (gold ← {DXY, yield} ← {their own drivers}) resolves bottom-up.
// Monte-Carlo simulation produces fan bands; scenario/growth/equation nodes are
// treated as fixed assumptions (no noise) so "controlled" drivers narrow the cone.
//
// Pure JS, no deps beyond window.Econ (OLS / ARIMA / ETS / resample). No UI.
// ================================================================
(function () {
  'use strict';
  var E = window.Econ;

  // ---------------- safe expression evaluator (shunting-yard) ----------------
  // Supports + - * / ^ %, unary minus, parentheses, numbers (incl. 1.2e3),
  // identifiers (node symbols), and functions: log, ln, exp, sqrt, abs, pow,
  // min, max. Compiled once to RPN; evaluated against a {sym:value} scope.
  var FUNCS = {
    ln: function (a) { return Math.log(a); }, log: function (a) { return Math.log(a); },
    log10: function (a) { return Math.log10(a); }, exp: function (a) { return Math.exp(a); },
    sqrt: function (a) { return Math.sqrt(a); }, abs: function (a) { return Math.abs(a); },
    pow: function (a, b) { return Math.pow(a, b); }, min: function (a, b) { return Math.min(a, b); },
    max: function (a, b) { return Math.max(a, b); }
  };
  var FUNC_ARITY = { ln: 1, log: 1, log10: 1, exp: 1, sqrt: 1, abs: 1, pow: 2, min: 2, max: 2 };

  function tokenize(s) {
    var toks = [], i = 0, n = s.length;
    while (i < n) {
      var c = s[i];
      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)/.exec(s.slice(i));
        if (!m) throw new Error('bad number at ' + i);
        toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var im = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
        var name = im[0]; i += name.length;
        // a following '(' makes it a function call
        var j = i; while (j < n && (s[j] === ' ')) j++;
        if (s[j] === '(') toks.push({ t: 'func', v: name });
        else toks.push({ t: 'var', v: name });
        continue;
      }
      if (c === ',') { toks.push({ t: 'comma' }); i++; continue; }
      if (c === '(') { toks.push({ t: 'lp' }); i++; continue; }
      if (c === ')') { toks.push({ t: 'rp' }); i++; continue; }
      if ('+-*/^%'.indexOf(c) > -1) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw new Error('unexpected "' + c + '"');
    }
    return toks;
  }
  var PREC = { '+': 2, '-': 2, '*': 3, '/': 3, '%': 3, '^': 4 };
  var RIGHT = { '^': true };
  function toRPN(toks) {
    var out = [], ops = [], prev = null;
    for (var k = 0; k < toks.length; k++) {
      var tk = toks[k];
      if (tk.t === 'num' || tk.t === 'var') { out.push(tk); }
      else if (tk.t === 'func') { ops.push(tk); }
      else if (tk.t === 'comma') { while (ops.length && ops[ops.length - 1].t !== 'lp') out.push(ops.pop()); if (!ops.length) throw new Error('misplaced comma'); }
      else if (tk.t === 'op') {
        // unary minus / plus
        var unary = (prev == null || prev.t === 'op' || prev.t === 'lp' || prev.t === 'comma');
        if (unary && (tk.v === '-' || tk.v === '+')) { tk = { t: 'op', v: tk.v === '-' ? 'u-' : 'u+', unary: true }; }
        else {
          while (ops.length) {
            var top = ops[ops.length - 1];
            if (top.t === 'op' && (top.unary || (RIGHT[tk.v] ? PREC[top.v] > PREC[tk.v] : PREC[top.v] >= PREC[tk.v]))) out.push(ops.pop());
            else break;
          }
        }
        ops.push(tk);
      }
      else if (tk.t === 'lp') { ops.push(tk); }
      else if (tk.t === 'rp') {
        while (ops.length && ops[ops.length - 1].t !== 'lp') out.push(ops.pop());
        if (!ops.length) throw new Error('unbalanced )');
        ops.pop();
        if (ops.length && ops[ops.length - 1].t === 'func') out.push(ops.pop());
      }
      prev = tk;
    }
    while (ops.length) { var o = ops.pop(); if (o.t === 'lp') throw new Error('unbalanced ('); out.push(o); }
    return out;
  }
  function compileExpr(str) {
    var rpn = toRPN(tokenize(String(str || '')));
    var vars = {};
    rpn.forEach(function (t) { if (t.t === 'var' && !(t.v in FUNCS)) vars[t.v] = true; });
    return {
      vars: Object.keys(vars),
      eval: function (scope) {
        var st = [];
        for (var i = 0; i < rpn.length; i++) {
          var t = rpn[i];
          if (t.t === 'num') st.push(t.v);
          else if (t.t === 'var') { var v = scope[t.v]; if (v == null || !isFinite(v)) return NaN; st.push(v); }
          else if (t.t === 'func') { var ar = FUNC_ARITY[t.v]; if (ar == null) throw new Error('unknown fn ' + t.v); var args = st.splice(st.length - ar, ar); st.push(FUNCS[t.v].apply(null, args)); }
          else if (t.t === 'op') {
            if (t.unary) { var x = st.pop(); st.push(t.v === 'u-' ? -x : x); }
            else { var b = st.pop(), a = st.pop(); st.push(t.v === '+' ? a + b : t.v === '-' ? a - b : t.v === '*' ? a * b : t.v === '/' ? a / b : t.v === '%' ? a % b : Math.pow(a, b)); }
          }
        }
        return st.length === 1 ? st[0] : NaN;
      }
    };
  }

  // ---------------- DAG ----------------
  // nodes: [{id, parents:[ids]}]. Returns {order:[ids]} or {error}.
  function topoSort(nodes) {
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var state = {}, order = [], bad = null;       // 0=unseen 1=visiting 2=done
    function visit(id, stack) {
      if (state[id] === 2) return true;
      if (state[id] === 1) { bad = stack.concat([id]); return false; }
      if (!byId[id]) return true;                  // unknown parent: ignore (validated elsewhere)
      state[id] = 1;
      var ps = byId[id].parents || [];
      for (var i = 0; i < ps.length; i++) { if (!visit(ps[i], stack.concat([id]))) return false; }
      state[id] = 2; order.push(id); return true;
    }
    for (var k = 0; k < nodes.length; k++) { if (!visit(nodes[k].id, [])) return { error: 'Cycle detected: ' + bad.join(' → '), cycle: bad }; }
    return { order: order };
  }

  // ---------------- period keys / dates ----------------
  function pkey(date, freq) { var s = String(date); if (freq === 'A') return s.slice(0, 4); if (freq === 'M') return s.slice(0, 7); var mo = parseInt(s.slice(5, 7), 10) || 1; return s.slice(0, 4) + '-Q' + Math.ceil(mo / 3); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function lastDayOfMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }     // m=1..12
  // advance a period key by `step` periods → a representative end-of-period date string
  function advanceKey(lastDate, freq, step) {
    var d = new Date(String(lastDate) + 'T00:00:00Z'); if (isNaN(d.getTime())) d = new Date();
    var y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1;
    if (freq === 'A') { return (y + step) + '-12-31'; }
    if (freq === 'M') { var idx = (y * 12 + (mo - 1)) + step; var ny = Math.floor(idx / 12), nm = (idx % 12) + 1; return ny + '-' + pad2(nm) + '-' + pad2(lastDayOfMonth(ny, nm)); }
    // quarterly
    var q = Math.ceil(mo / 3); var qi = (y * 4 + (q - 1)) + step; var qy = Math.floor(qi / 4), qq = (qi % 4) + 1; var qm = qq * 3; var day = (qm === 6 || qm === 9) ? 30 : 31; return qy + '-' + pad2(qm) + '-' + day;
  }

  // ---------------- RNG (seedable, gaussian) ----------------
  function mulberry32(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(rng) { var u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // ---------------- helpers ----------------
  function diffs(a) { var d = []; for (var i = 1; i < a.length; i++) { if (a[i] != null && a[i - 1] != null && isFinite(a[i]) && isFinite(a[i - 1])) d.push(a[i] - a[i - 1]); } return d; }
  function mean(a) { var s = 0, c = 0; for (var i = 0; i < a.length; i++) if (a[i] != null && isFinite(a[i])) { s += a[i]; c++; } return c ? s / c : 0; }
  function sd(a) { var m = mean(a), s = 0, c = 0; for (var i = 0; i < a.length; i++) if (a[i] != null && isFinite(a[i])) { s += (a[i] - m) * (a[i] - m); c++; } return c > 1 ? Math.sqrt(s / (c - 1)) : 0; }
  function lastFinite(a) { for (var i = a.length - 1; i >= 0; i--) if (a[i] != null && isFinite(a[i])) return a[i]; return null; }

  // ====================================================================
  // runForecast(model) → forecast every node + bands for all.
  //   model = { horizon:{n, freq:'A'|'Q'|'M'}, nodes:[ ... ], bandPct }
  //   node  = { id, label, sym, series:[{date,value}]|null, method, parents:[ids],
  //             lags:{pid:int}, equation, params:{p,d,q,P,D,Q,s, growthPct,
  //             scenarioPath:[...], scenMode:'level'|'growth'} }
  // ====================================================================
  function runForecast(model) {
    if (!model || !model.nodes || !model.nodes.length) return { error: 'Add at least one variable node.' };
    var nodes = model.nodes, byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var freq = (model.horizon && model.horizon.freq) || 'Q';
    var H = Math.max(1, Math.min(240, (model.horizon && model.horizon.n) || 20));
    var S = Math.max(0, Math.min(500, model.sims != null ? model.sims : 240));
    var bandPct = model.bandPct || 80;                       // central interval width

    // validate parents / methods
    for (var vi = 0; vi < nodes.length; vi++) {
      var nd = nodes[vi];
      (nd.parents || []).forEach(function (pid) { if (!byId[pid]) throw 0; });
    }
    var topo = topoSort(nodes); if (topo.error) return { error: topo.error };
    var order = topo.order;

    // ---- 1) common historical grid from data-bearing nodes ----
    var dataNodes = nodes.filter(function (n) { return n.series && n.series.length; });
    if (!dataNodes.length) return { error: 'At least one node needs a historical series (add macro data or paste a series).' };
    var keyMaps = {};                                        // id -> {pkey: value}
    dataNodes.forEach(function (n) {
      var rs = E.resample(n.series.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), freq, 'last');
      var m = {}; rs.forEach(function (o) { if (o.value != null && isFinite(o.value)) m[pkey(o.date, freq)] = o.value; });
      keyMaps[n.id] = m;
    });
    // common keys = intersection across all data nodes
    var first = keyMaps[dataNodes[0].id];
    var commonKeys = Object.keys(first).filter(function (k) { return dataNodes.every(function (n) { return keyMaps[n.id][k] != null; }); }).sort();
    if (commonKeys.length < 8) return { error: 'Only ' + commonKeys.length + ' overlapping ' + freq + ' periods across the data nodes (need ≥ 8). Pick series with a longer common span or a lower frequency.' };
    var Ht = commonKeys.length;
    var histDates = commonKeys.map(function (k) { return keyDate(k, freq); });

    // future dates
    var lastDate = keyDate(commonKeys[Ht - 1], freq);
    var futureDates = []; for (var f = 1; f <= H; f++) futureDates.push(advanceKey(lastDate, freq, f));

    // ---- 2) assemble each node's full path: history (len Ht) then forecast (len H) ----
    var path = {};       // id -> array length Ht+H
    var fit = {};        // id -> fit metadata
    var uni = {};        // id -> precomputed univariate forecast array (len H) when applicable
    var compiled = {};   // id -> compiled equation

    // history for data nodes
    dataNodes.forEach(function (n) { var arr = new Array(Ht + H).fill(null); for (var i = 0; i < Ht; i++) arr[i] = keyMaps[n.id][commonKeys[i]]; path[n.id] = arr; });

    // history for derived/equation nodes (no own series): eval from parents over history, in topo order
    order.forEach(function (id) {
      var n = byId[id]; if (path[id]) return;                 // already has history (data node)
      var arr = new Array(Ht + H).fill(null);
      if (n.method === 'equation' && n.equation) {
        var c = getCompiled(id, n); for (var i = 0; i < Ht; i++) arr[i] = evalEq(c, n, i); }
      else if (n.method === 'regression') {
        // regression node with no own series can't be fit; treat as equation-less → leave null history
      }
      path[id] = arr;
    });

    function getCompiled(id, n) { if (!compiled[id]) { try { compiled[id] = compileExpr(n.equation); } catch (e) { compiled[id] = { vars: [], eval: function () { return NaN; }, _err: String(e.message || e) }; } } return compiled[id]; }
    function evalEq(c, n, gi) { var scope = {}; (n.parents || []).forEach(function (pid) { var lg = (n.lags && n.lags[pid]) || 0; var src = path[pid]; scope[byId[pid].sym] = src ? src[gi - lg] : null; }); return c.eval(scope); }

    // ---- 3) fit each node's model on history ----
    order.forEach(function (id) {
      var n = byId[id]; var hist = path[id];
      var histVals = hist.slice(0, Ht);
      if (n.method === 'regression') {
        var ps = (n.parents || []); if (!ps.length) { fit[id] = { error: 'no parents' }; return; }
        // aligned rows where y and all lagged parents are finite
        var Y = [], X = [], rows = [];
        for (var t = 0; t < Ht; t++) {
          var y = histVals[t]; if (y == null || !isFinite(y)) continue;
          var xr = [], ok = true;
          for (var j = 0; j < ps.length; j++) { var lg = (n.lags && n.lags[ps[j]]) || 0; var pv = path[ps[j]] ? path[ps[j]][t - lg] : null; if (pv == null || !isFinite(pv)) { ok = false; break; } xr.push(pv); }
          if (!ok) continue; Y.push(y); X.push(xr); rows.push(t);
        }
        if (Y.length < ps.length + 3) { fit[id] = { error: 'too few aligned points to fit (' + Y.length + ')' }; return; }
        var Xcols = ps.map(function (_, j) { return X.map(function (r) { return r[j]; }); });
        var res = E.ols(Y, Xcols, { names: ps.map(function (pid) { return byId[pid].sym; }), robust: 'hac' });
        fit[id] = { kind: 'regression', coef: res.coef, sigma: res.sigma, r2: res.r2, names: res.names, nfit: Y.length };
      } else if (n.method === 'arima') {
        var pp = n.params || {}; try { var ar = E.arima(histVals.filter(isF), { p: pp.p || 1, d: pp.d || 1, q: pp.q || 0, P: pp.P || 0, D: pp.D || 0, Q: pp.Q || 0, s: pp.s || 4, h: H }); uni[id] = (ar.forecast || []).map(function (o) { return o.mean; }); fit[id] = { kind: 'arima', sigma: ar.sigma || sd(diffs(histVals)), order: ar.order }; } catch (e) { uni[id] = null; fit[id] = { error: 'arima failed: ' + (e.message || e) }; }
      } else if (n.method === 'ets') {
        var pe = n.params || {}; try { var et = E.ets(histVals.filter(isF), { trend: pe.trend !== false, seasonal: pe.seasonal || 'none', s: pe.s || 4, h: H }); uni[id] = (et.forecast || []).map(function (o) { return o.mean; }); fit[id] = { kind: 'ets', sigma: Math.sqrt((et.sse || 0) / Math.max(1, histVals.filter(isF).length)) }; } catch (e) { uni[id] = null; fit[id] = { error: 'ets failed: ' + (e.message || e) }; }
      } else if (n.method === 'drift') {
        var dd = diffs(histVals); fit[id] = { kind: 'drift', slope: mean(dd), sigma: sd(dd), last: lastFinite(histVals) };
      } else if (n.method === 'rw') {
        var dr = diffs(histVals); fit[id] = { kind: 'rw', sigma: sd(dr), last: lastFinite(histVals) };
      } else if (n.method === 'growth') {
        fit[id] = { kind: 'growth', g: (n.params && n.params.growthPct || 0) / 100, last: lastFinite(histVals), sigma: 0 };
      } else if (n.method === 'scenario') {
        fit[id] = { kind: 'scenario', last: lastFinite(histVals), sigma: 0 };
      } else if (n.method === 'equation') {
        fit[id] = { kind: 'equation', sigma: 0, err: getCompiled(id, n)._err };
      } else { fit[id] = { kind: n.method || 'rw', sigma: 0, last: lastFinite(histVals) }; }
    });

    // ---- 4) deterministic forecast (no noise) ----
    fillForecast(false, null);

    // ---- 5) Monte-Carlo bands ----
    var lo = {}, hi = {}, sims = {};
    if (S > 0) {
      order.forEach(function (id) { sims[id] = []; for (var f = 0; f < H; f++) sims[id].push([]); });
      var rng = mulberry32(20260524);
      // fillForecast only writes the forecast slots (index ≥ Ht); history is never
      // touched, so each sim simply overwrites the previous sim's forecast portion.
      for (var s = 0; s < S; s++) {
        fillForecast(true, rng);
        order.forEach(function (id) { for (var f = 0; f < H; f++) sims[id][f].push(path[id][Ht + f]); });
      }
      // restore the deterministic (point) path over the noisy last sim
      fillForecast(false, null);
      var zlo = (100 - bandPct) / 200, zhi = 1 - zlo;
      order.forEach(function (id) {
        lo[id] = []; hi[id] = [];
        for (var f = 0; f < H; f++) { var col = sims[id][f].filter(isF).sort(function (a, b) { return a - b; }); if (!col.length) { lo[id].push(null); hi[id].push(null); continue; } lo[id].push(quantile(col, zlo)); hi[id].push(quantile(col, zhi)); }
      });
    }

    // ---- assemble output ----
    var target = (nodes.find(function (n) { return n.isTarget; }) || nodes[nodes.length - 1]).id;
    var out = { dates: { hist: histDates, future: futureDates }, order: order, target: target, freq: freq, H: H, bandPct: bandPct, nodes: {} };
    order.forEach(function (id) {
      var n = byId[id];
      out.nodes[id] = {
        label: n.label, sym: n.sym, method: n.method, isTarget: !!n.isTarget,
        hist: path[id].slice(0, Ht), fcst: path[id].slice(Ht), lo: lo[id] || null, hi: hi[id] || null,
        fit: fit[id] || null
      };
    });
    return out;

    // -- inner: fill the forecast portion of every node's path, optionally with noise --
    function fillForecast(noise, rng) {
      for (var f = 1; f <= H; f++) {
        var gi = Ht - 1 + f;                                    // global index of this future step
        for (var oi = 0; oi < order.length; oi++) {
          var id = order[oi], n = byId[id], fi = fit[id] || {}, val;
          // scenario override path always wins
          if (n.method === 'scenario') { val = scenarioVal(n, f); }
          else if (n.method === 'regression') {
            if (fi.error) { val = null; }
            else { val = fi.coef[0]; var ps = n.parents || [], okp = true; for (var j = 0; j < ps.length; j++) { var lg = (n.lags && n.lags[ps[j]]) || 0; var pv = path[ps[j]] ? path[ps[j]][gi - lg] : null; if (pv == null || !isFinite(pv)) { okp = false; break; } val += fi.coef[j + 1] * pv; } if (!okp) val = null; else if (noise) val += gauss(rng) * (fi.sigma || 0); }
          }
          else if (n.method === 'equation') { var c = getCompiled(id, n); val = evalEq(c, n, gi); }
          else if (n.method === 'arima' || n.method === 'ets') { val = uni[id] ? uni[id][f - 1] : null; if (noise && val != null) val += gauss(rng) * (fi.sigma || 0) * Math.sqrt(f); }
          else if (n.method === 'drift') { var base = path[id][gi - 1]; if (base == null) base = fi.last; val = (base != null ? base : 0) + (fi.slope || 0) + (noise ? gauss(rng) * (fi.sigma || 0) : 0); }
          else if (n.method === 'growth') { var pb = path[id][gi - 1]; if (pb == null) pb = fi.last; val = (pb != null ? pb : 0) * (1 + (fi.g || 0)); }
          else { /* rw */ var rb = path[id][gi - 1]; if (rb == null) rb = fi.last; val = (rb != null ? rb : 0) + (noise ? gauss(rng) * (fi.sigma || 0) : 0); }
          path[id][gi] = (val != null && isFinite(val)) ? val : null;
        }
      }
    }
    function scenarioVal(n, f) {
      var p = n.params || {};
      // default mode is compound growth (matches the inspector's default view); only an
      // explicit 'level' mode reads the manual path. growthPct 0 ⇒ holds the last value flat.
      if (p.scenMode !== 'level') { var base = lastFinite(path[n.id].slice(0, Ht)); return base != null ? base * Math.pow(1 + (p.growthPct || 0) / 100, f) : null; }
      var sp = p.scenarioPath || []; if (f - 1 < sp.length && sp[f - 1] != null && isFinite(sp[f - 1])) return +sp[f - 1];
      // beyond provided path → hold last provided (or last history)
      var lastSp = null; for (var i = sp.length - 1; i >= 0; i--) { if (sp[i] != null && isFinite(sp[i])) { lastSp = +sp[i]; break; } }
      return lastSp != null ? lastSp : lastFinite(path[n.id].slice(0, Ht));
    }
  }

  function isF(v) { return v != null && isFinite(v); }
  function quantile(sortedArr, q) { if (!sortedArr.length) return null; var pos = (sortedArr.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos); if (lo === hi) return sortedArr[lo]; return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (pos - lo); }
  // representative end-of-period date for a period key
  function keyDate(key, freq) {
    if (freq === 'A') return key + '-12-31';
    if (freq === 'M') { var y = +key.slice(0, 4), m = +key.slice(5, 7); return key + '-' + pad2(lastDayOfMonth(y, m)); }
    var yr = +key.slice(0, 4), q = +key.slice(key.indexOf('Q') + 1); var qm = q * 3; var day = (qm === 6 || qm === 9) ? 30 : 31; return yr + '-' + pad2(qm) + '-' + day;
  }

  window.Forecast = {
    runForecast: runForecast,
    compileExpr: compileExpr,
    topoSort: topoSort,
    advanceKey: advanceKey,
    METHODS: [
      { id: 'regression', label: 'Regression (from parents)', needsParents: true },
      { id: 'equation', label: 'Equation (formula)', needsParents: true },
      { id: 'arima', label: 'ARIMA / SARIMA', needsParents: false },
      { id: 'ets', label: 'Exponential smoothing', needsParents: false },
      { id: 'drift', label: 'Trend (random walk + drift)', needsParents: false },
      { id: 'rw', label: 'Random walk (hold last)', needsParents: false },
      { id: 'growth', label: 'Constant % growth', needsParents: false },
      { id: 'scenario', label: 'Scenario (manual path)', needsParents: false }
    ]
  };
})();
