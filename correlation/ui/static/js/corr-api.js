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

  SupabaseAPI.prototype.computeSubset = function () {
    return Promise.reject(new Error(
      'Custom subset compute is available in local mode only. ' +
      'Clone the repo and run `python correlation/ui/backend/app.py`.'
    ));
  };

  SupabaseAPI.prototype.getPCA = function () {
    return Promise.reject(new Error(
      'PCA is available in local mode only. ' +
      'Clone the repo and run `python correlation/ui/backend/app.py`.'
    ));
  };

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
