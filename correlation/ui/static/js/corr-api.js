// corr-api.js — backend-agnostic facade for the correlation UI.
//
// Two backends:
//   - Flask (local dev): hits /api/* and /static/* served by Python.
//   - Supabase (Vercel + anywhere static): hits the Supabase Postgres project
//     via PostgREST + supabase-js, using the publishable anon key from
//     window.CORRTERM_CONFIG.supabase. Static template/series_meta files are
//     fetched from `data/` relative to index.html.
//
// Selection: `window.CORRTERM_CONFIG.dataSource` ('flask' | 'supabase').
// Default falls back to 'flask' for local-only.
//
// All public methods return the SAME response shape as the Flask endpoints,
// so the rest of the UI (heatmap, pair detail) needs minimal changes.

(function (global) {
  'use strict';

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  var ROLLING_WINDOW_DEFAULT = 52;   // weeks
  var ROLLING_WINDOW_MONTHLY = 36;   // months

  function cfg() {
    return global.CORRTERM_CONFIG || { dataSource: 'flask' };
  }

  // ============================================================
  //  Flask backend (local)
  // ============================================================
  var FlaskAPI = {
    kind: 'flask',
    getTemplate: function (name) {
      return fetch('/api/template/' + encodeURIComponent(name)).then(toJSON);
    },
    getDates: function (freq) {
      return fetch('/api/dates?freq=' + encodeURIComponent(freq)).then(toJSON);
    },
    getPair: function (idA, idB, freq, opts) {
      var u = new URL('/api/pair/' + encodeURIComponent(idA) + '/' + encodeURIComponent(idB), location.origin);
      u.searchParams.set('freq', freq);
      if (opts && opts.start) u.searchParams.set('start_date', opts.start);
      if (opts && opts.end)   u.searchParams.set('end_date',   opts.end);
      return fetch(u).then(toJSON);
    },
    getRolling: function (idA, idB, window) {
      return fetch('/api/rolling/' + encodeURIComponent(idA) + '/' + encodeURIComponent(idB)
                   + '?window=' + encodeURIComponent(window || '52w')).then(toJSON);
    },
    computeSubset: function (body) {
      return fetch('/api/compute_subset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(toJSON);
    },
    getPCA: function (body) {
      return fetch('/api/pca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(toJSON);
    },
  };

  function toJSON(r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  // ============================================================
  //  Supabase backend
  //
  // Same response shape as Flask. Template + series_meta come from static
  // JSON files committed alongside this app. Pair stats + rolling correlation
  // come from RPC. Subset compute + PCA throw "cloud-mode unsupported".
  // ============================================================
  function SupabaseAPI() {
    this.kind = 'supabase';
    this._client = null;
    this._nameCache = null;  // id -> display name, lazy from series_meta.json
  }

  SupabaseAPI.prototype._ensureClient = function () {
    if (this._client) return Promise.resolve(this._client);
    var s = (cfg().supabase || {});
    if (!s.url || !s.anonKey) {
      return Promise.reject(new Error('Supabase URL / anon key missing in CORRTERM_CONFIG.supabase'));
    }
    var self = this;
    return import(/* @vite-ignore */ SUPABASE_CDN).then(function (mod) {
      self._client = mod.createClient(s.url, s.anonKey, {
        db: { schema: s.correlationSchema || 'correlation' },
      });
      return self._client;
    });
  };

  // Series id -> display name lookup (loads once).
  SupabaseAPI.prototype._names = function () {
    if (this._nameCache) return Promise.resolve(this._nameCache);
    var self = this;
    return fetch('data/series_meta.json').then(toJSON).then(function (rows) {
      var out = {};
      for (var i = 0; i < rows.length; i++) out[rows[i].id] = rows[i].name || rows[i].id;
      self._nameCache = out;
      return out;
    });
  };

  // Static template matrix.
  SupabaseAPI.prototype.getTemplate = function (name) {
    return fetch('data/matrices/' + encodeURIComponent(name) + '.json').then(toJSON);
  };

  // Date range for a frequency.
  // Implemented as a small Postgres query: min/max/count of dates in returns.
  SupabaseAPI.prototype.getDates = function (freq) {
    var table = freq === 'm' || freq === 'monthly' ? 'returns_monthly' : 'returns_weekly';
    return this._ensureClient().then(function (cli) {
      // PostgREST: we can't do MIN/MAX in a single query without RPC; use limits.
      return Promise.all([
        cli.from(table).select('date').order('date', { ascending: true  }).limit(1),
        cli.from(table).select('date').order('date', { ascending: false }).limit(1),
        cli.from(table).select('date', { count: 'estimated', head: true }),
      ]);
    }).then(function (res) {
      var first = res[0].data && res[0].data[0] ? res[0].data[0].date : null;
      var last  = res[1].data && res[1].data[0] ? res[1].data[0].date : null;
      var n     = res[2].count != null ? res[2].count : 0;
      return { start: first, end: last, n: n };
    });
  };

  // Pair detail. Issues 3 calls in parallel:
  //   - pair_stats RPC for Pearson + n + range
  //   - rolling_corr RPC for the rolling series
  //   - returns_weekly raw rows for both legs (scatter)
  SupabaseAPI.prototype.getPair = function (idA, idB, freq, opts) {
    freq = (freq === 'm' || freq === 'monthly') ? 'monthly' : 'weekly';
    var table = 'returns_' + freq;
    var window = freq === 'monthly' ? ROLLING_WINDOW_MONTHLY : ROLLING_WINDOW_DEFAULT;
    var fromDate = opts && opts.start || null;
    var toDate   = opts && opts.end   || null;
    var self = this;

    return Promise.all([
      self._ensureClient(),
      self._names(),
    ]).then(function (results) {
      var cli = results[0];
      var names = results[1];

      var rpcArgs = {
        series_a: idA, series_b: idB, frequency: freq,
        from_date: fromDate, to_date: toDate,
      };

      return Promise.all([
        cli.rpc('pair_stats', rpcArgs),
        cli.rpc('rolling_corr', Object.assign({}, rpcArgs, { window_size: window })),
        _fetchPairedReturns(cli, table, idA, idB, fromDate, toDate),
      ]).then(function (out) {
        var pairStatRow = (out[0].data || [])[0] || {};
        var rollingRows = out[1].data || [];
        var paired = out[2];

        // Ordinary-least-squares fit y = slope*x + intercept on paired returns.
        // Same shape as Flask's /api/pair regression field: 2-point line covering
        // the observed x-range so the chart can draw it as a single segment.
        var reg = _ols(paired);

        return {
          names: { a: names[idA] || idA, b: names[idB] || idB },
          pearson: pairStatRow.pearson != null ? pairStatRow.pearson : null,
          spearman: null,  // cloud mode doesn't compute Spearman
          n_obs: pairStatRow.n_obs || paired.length,
          date_range: [
            pairStatRow.first_obs || (paired[0] && paired[0].date) || null,
            pairStatRow.last_obs  || (paired[paired.length - 1] && paired[paired.length - 1].date) || null,
          ],
          scatter: paired.map(function (p) { return { x: p.a, y: p.b }; }),
          regression: reg ? { x: reg.x, y: reg.y, slope: reg.slope, intercept: reg.intercept } : null,
          rolling: {
            dates:  rollingRows.map(function (r) { return r.obs_date; }),
            values: rollingRows.map(function (r) { return r.corr_val; }),
            window: window + (freq === 'monthly' ? 'm' : 'w'),
          },
        };
      });
    });
  };

  // Rolling correlation only (e.g. when the pair panel needs to re-fetch
  // with a different window). Returns { dates, values, window }.
  SupabaseAPI.prototype.getRolling = function (idA, idB, windowSpec) {
    var m = /^(\d+)([wm])$/.exec(windowSpec || '52w');
    var window = m ? parseInt(m[1], 10) : ROLLING_WINDOW_DEFAULT;
    var freq = m && m[2] === 'm' ? 'monthly' : 'weekly';
    return this._ensureClient().then(function (cli) {
      return cli.rpc('rolling_corr', {
        series_a: idA, series_b: idB, frequency: freq,
        window_size: window, from_date: null, to_date: null,
      });
    }).then(function (res) {
      var rows = res.data || [];
      return {
        dates:  rows.map(function (r) { return r.obs_date; }),
        values: rows.map(function (r) { return r.corr_val; }),
        window: window + (freq === 'monthly' ? 'm' : 'w'),
      };
    });
  };

  // ============================================================
  //  Client-side compute: custom subset correlation + PCA
  //
  //  Fetch raw returns from Supabase for the requested series, then compute
  //  Pearson correlation and (optionally) eigendecomposition in the browser.
  //  Replaces the Flask /api/compute_subset and /api/pca endpoints.
  //  Tradeoff: heavier wire transfer (N series × ~800 weeks) but works
  //  without any server compute.
  // ============================================================
  SupabaseAPI.prototype.computeSubset = function (body) {
    var ids = (body && body.ids) || [];
    if (ids.length < 2) return Promise.reject(new Error('select at least 2 series'));
    var freq = (body.freq === 'm' || body.freq === 'monthly') ? 'monthly' : 'weekly';
    var table = 'returns_' + freq;
    var fromDate = body.start_date || null;
    var toDate   = body.end_date   || null;
    var self = this;

    return Promise.all([
      self._ensureClient(),
      self._names(),
    ]).then(function (results) {
      var cli = results[0];
      var nameMap = results[1];
      // Parallel fetch — one series at a time, paged. PostgREST caps each
      // page at 1000 rows; 800 weeks fits in one page per series.
      return Promise.all(ids.map(function (id) {
        return _fetchOneSeriesReturns(cli, table, id, fromDate, toDate);
      })).then(function (allSeries) {
        // Build a dates × series matrix, keeping only dates where ALL series have data.
        var byDate = _alignSeries(ids, allSeries);
        if (byDate.dates.length < 10) {
          throw new Error('not enough overlapping observations (n=' + byDate.dates.length + ')');
        }
        var matrix = _pearsonMatrix(byDate.values);
        return {
          ids: ids,
          names: ids.map(function (id) { return nameMap[id] || id; }),
          cats: ids.map(function (id) {
            // Lazy: cats come from series_meta; if frontend needs them, derive
            return (self._catCache && self._catCache[id]) || '';
          }),
          matrix: matrix,
          freq: freq === 'monthly' ? 'm' : 'w',
          method: 'pearson',  // cloud mode = Pearson only
          n_obs: byDate.dates.length,
          date_range: [byDate.dates[0], byDate.dates[byDate.dates.length - 1]],
        };
      });
    });
  };

  SupabaseAPI.prototype.getPCA = function (body) {
    var ids = (body && body.ids) || [];
    if (ids.length < 2) return Promise.reject(new Error('select at least 2 series'));
    var topK = body.top_k || 5;
    var self = this;
    // Compute the subset matrix first, then run eigendecomposition.
    return self.computeSubset(body).then(function (sub) {
      return _loadMlMatrix().then(function (ML) {
        return _pcaFromCorr(ML, sub.matrix, sub.ids, sub.names, topK);
      });
    });
  };

  // -- helpers --
  function _fetchOneSeriesReturns(cli, table, id, fromDate, toDate) {
    var pageSize = 1000;
    function loop(from, acc) {
      var q = cli.from(table).select('date,ret').eq('series_id', id)
                 .order('date', { ascending: true }).range(from, from + pageSize - 1);
      if (fromDate) q = q.gte('date', fromDate);
      if (toDate)   q = q.lte('date', toDate);
      return q.then(function (res) {
        var rows = res.data || [];
        acc = acc.concat(rows);
        if (rows.length < pageSize) return acc;
        return loop(from + pageSize, acc);
      });
    }
    return loop(0, []);
  }

  function _alignSeries(ids, allSeries) {
    // Build a per-date map: date -> [val_for_id_0, val_for_id_1, ...].
    // Drop rows where any value is missing.
    var dateSets = allSeries.map(function (rows) {
      var m = {};
      for (var i = 0; i < rows.length; i++) m[rows[i].date] = rows[i].ret;
      return m;
    });
    // Intersection of dates across all series.
    var firstDates = Object.keys(dateSets[0] || {}).sort();
    var dates = [];
    var values = [];  // array of [v0, v1, ...] per date
    for (var i = 0; i < firstDates.length; i++) {
      var d = firstDates[i];
      var row = new Array(ids.length);
      var ok = true;
      for (var j = 0; j < ids.length; j++) {
        var v = dateSets[j][d];
        if (v == null || !isFinite(v)) { ok = false; break; }
        row[j] = v;
      }
      if (ok) { dates.push(d); values.push(row); }
    }
    return { dates: dates, values: values };
  }

  function _ols(paired) {
    // Ordinary least-squares of y on x. Returns the two endpoints of the fit
    // line at min/max x so the scatter chart can draw it as a single segment,
    // plus slope + intercept for display. Null when degenerate.
    if (!paired || paired.length < 2) return null;
    var n = paired.length;
    var sx = 0, sy = 0;
    for (var i = 0; i < n; i++) { sx += paired[i].a; sy += paired[i].b; }
    var mx = sx / n, my = sy / n;
    var num = 0, den = 0;
    var minX = Infinity, maxX = -Infinity;
    for (var j = 0; j < n; j++) {
      var dx = paired[j].a - mx;
      num += dx * (paired[j].b - my);
      den += dx * dx;
      if (paired[j].a < minX) minX = paired[j].a;
      if (paired[j].a > maxX) maxX = paired[j].a;
    }
    if (den < 1e-12) return null;
    var slope = num / den;
    var intercept = my - slope * mx;
    return {
      slope: slope,
      intercept: intercept,
      x: [minX, maxX],
      y: [slope * minX + intercept, slope * maxX + intercept],
    };
  }

  function _pearsonMatrix(rows) {
    // rows: T × N (T dates, N series). Returns N × N Pearson correlation matrix.
    if (!rows.length) return [];
    var T = rows.length, N = rows[0].length;
    // Column means.
    var mean = new Array(N);
    for (var j = 0; j < N; j++) {
      var s = 0;
      for (var i = 0; i < T; i++) s += rows[i][j];
      mean[j] = s / T;
    }
    // Centered values.
    var centered = new Array(T);
    for (var i = 0; i < T; i++) {
      var r = new Array(N);
      for (var j = 0; j < N; j++) r[j] = rows[i][j] - mean[j];
      centered[i] = r;
    }
    // Column std (population).
    var std = new Array(N);
    for (var j = 0; j < N; j++) {
      var s2 = 0;
      for (var i = 0; i < T; i++) s2 += centered[i][j] * centered[i][j];
      std[j] = Math.sqrt(s2 / T) || 1;
    }
    // Correlation matrix.
    var out = new Array(N);
    for (var a = 0; a < N; a++) {
      var row = new Array(N);
      for (var b = 0; b < N; b++) {
        if (a === b) { row[b] = 1; continue; }
        if (b < a)  { row[b] = out[b][a]; continue; }
        var s = 0;
        for (var i = 0; i < T; i++) s += centered[i][a] * centered[i][b];
        row[b] = s / (T * std[a] * std[b]);
      }
      out[a] = row;
    }
    return out;
  }

  var _mlMatrixPromise = null;
  function _loadMlMatrix() {
    if (_mlMatrixPromise) return _mlMatrixPromise;
    _mlMatrixPromise = import('https://cdn.jsdelivr.net/npm/ml-matrix@6/+esm');
    return _mlMatrixPromise;
  }

  function _pcaFromCorr(ML, matrix, ids, names, topK) {
    var N = matrix.length;
    var M = new ML.Matrix(matrix);
    var evd = new ML.EigenvalueDecomposition(M, { assumeSymmetric: true });
    // Real eigenvalues + eigenvectors. Sort descending.
    var rev = evd.realEigenvalues.slice();
    var evec = evd.eigenvectorMatrix.to2DArray();
    var order = rev.map(function (v, i) { return [v, i]; })
                   .sort(function (a, b) { return b[0] - a[0]; });
    var totalVar = rev.reduce(function (s, v) { return s + Math.max(0, v); }, 0) || N;
    var factors = [];
    var cum = 0;
    for (var k = 0; k < Math.min(topK, N); k++) {
      var idx = order[k][1];
      var lambda = order[k][0];
      var explained = lambda / totalVar;
      cum += explained;
      // Loadings for this factor: signed |weight| sorted descending.
      var loadings = [];
      for (var i = 0; i < N; i++) {
        var w = evec[i][idx];
        loadings.push({
          id: ids[i],
          name: names[i],
          weight: Math.abs(w),
          sign: w >= 0 ? 1 : -1,
        });
      }
      loadings.sort(function (a, b) { return b.weight - a.weight; });
      factors.push({ k: k + 1, explained: explained, cumulative: cum, loadings: loadings });
    }
    return { factors: factors };
  }

  // Fetch raw paired returns for the scatter plot.
  // PostgREST caps responses at 1000 rows by default — paginate just in case.
  function _fetchPairedReturns(cli, table, idA, idB, fromDate, toDate) {
    var pageSize = 1000;
    function fetchSide(seriesId) {
      function loop(from, acc) {
        var q = cli.from(table).select('date,ret').eq('series_id', seriesId)
                   .order('date', { ascending: true }).range(from, from + pageSize - 1);
        if (fromDate) q = q.gte('date', fromDate);
        if (toDate)   q = q.lte('date', toDate);
        return q.then(function (res) {
          var rows = res.data || [];
          acc = acc.concat(rows);
          if (rows.length < pageSize) return acc;
          return loop(from + pageSize, acc);
        });
      }
      return loop(0, []);
    }
    return Promise.all([fetchSide(idA), fetchSide(idB)]).then(function (sides) {
      var aMap = {};
      sides[0].forEach(function (r) { aMap[r.date] = r.ret; });
      var paired = [];
      sides[1].forEach(function (r) {
        if (r.date in aMap) paired.push({ date: r.date, a: aMap[r.date], b: r.ret });
      });
      return paired;
    });
  }

  // ============================================================
  //  Factory
  // ============================================================
  function create() {
    var mode = (cfg().dataSource || 'flask').toLowerCase();
    return mode === 'supabase' ? new SupabaseAPI() : FlaskAPI;
  }

  global.CorrAPI = create();
})(window);
