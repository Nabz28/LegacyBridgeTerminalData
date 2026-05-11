// data-source.js — backend-agnostic facade for series observations.
//
// The dashboard treats data as four primitives:
//
//   open(country)              → Promise resolved once the backend is ready for the country.
//   getObservations(ric)       → Promise< [{date: Date, value: number}, ...] >
//   getSeriesCount()           → Number (for the status bar)
//   close()                    → release any resources held for the previous country
//
// Two backends ship in the repo:
//   - SqliteSource   (sql.js loaded from CDN; default)
//   - SupabaseSource (@supabase/supabase-js loaded from CDN; opt-in via config)
//
// Switching backends is purely a config concern (dashboard/js/config.js).
// Nothing in catalog-loader.js or the UI knows which one is active.

(function (global) {
  'use strict';

  function getConfig() {
    return (global.MACROTERM_CONFIG || {});
  }

  // ============================================================
  //  SQLite backend (sql.js + sqlite file fetched over HTTP)
  // ============================================================
  var SQL_WASM_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

  function SqliteSource() {
    this.kind = 'sqlite';
    this._sql = null;
    this._db = null;
    this._seriesCount = 0;
  }

  SqliteSource.prototype.open = function (country) {
    var self = this;
    if (!global.initSqlJs) {
      return Promise.reject(new Error('sql.js not loaded'));
    }
    var cfg = (getConfig().sqlite || {});
    var baseUrl = (cfg.baseUrl || '/data').replace(/\/$/, '');
    var url = baseUrl + '/' + country + '.sqlite';
    return Promise.all([
      global.initSqlJs({ locateFile: function (f) { return SQL_WASM_BASE + f; } }),
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('sqlite http ' + r.status + ' at ' + url);
        return r.arrayBuffer();
      })
    ]).then(function (results) {
      self._sql = results[0];
      self._db = new self._sql.Database(new Uint8Array(results[1]));
      var info = self._db.exec('SELECT COUNT(*) FROM series');
      self._seriesCount = (info && info[0]) ? info[0].values[0][0] : 0;
      return self;
    });
  };

  SqliteSource.prototype.getObservations = function (ric) {
    if (!this._db) return Promise.reject(new Error('database not loaded'));
    var stmt = this._db.prepare('SELECT date, value FROM observations WHERE ric = $ric ORDER BY date');
    stmt.bind({ $ric: ric });
    var out = [];
    while (stmt.step()) {
      var row = stmt.get();
      var d = new Date(row[0]);
      if (isNaN(d.getTime())) continue;
      out.push({ date: d, value: row[1] });
    }
    stmt.free();
    return Promise.resolve(out);
  };

  SqliteSource.prototype.getSeriesCount = function () { return this._seriesCount; };

  SqliteSource.prototype.close = function () {
    if (this._db) { try { this._db.close(); } catch (e) {} }
    this._db = null;
    this._seriesCount = 0;
  };

  // ============================================================
  //  Supabase backend
  // ============================================================
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  function SupabaseSource() {
    this.kind = 'supabase';
    this._client = null;
    this._country = null;
    this._seriesCount = 0;
    this._schema = 'macro';
  }

  SupabaseSource.prototype._ensureClient = function () {
    if (this._client) return Promise.resolve(this._client);
    var cfg = (getConfig().supabase || {});
    if (!cfg.url || !cfg.anonKey) {
      return Promise.reject(new Error('Supabase URL / anon key missing in MACROTERM_CONFIG'));
    }
    this._schema = cfg.macroSchema || 'macro';
    var self = this;
    return import(/* @vite-ignore */ SUPABASE_CDN).then(function (mod) {
      self._client = mod.createClient(cfg.url, cfg.anonKey, {
        db: { schema: self._schema }
      });
      return self._client;
    });
  };

  SupabaseSource.prototype.open = function (country) {
    var self = this;
    self._country = country;
    return self._ensureClient().then(function (client) {
      return client
        .from('series')
        .select('ric', { count: 'exact', head: true })
        .eq('country', country);
    }).then(function (res) {
      if (res.error) throw res.error;
      self._seriesCount = res.count || 0;
      return self;
    });
  };

  SupabaseSource.prototype.getObservations = function (ric) {
    var self = this;
    return self._ensureClient().then(function (client) {
      // Supabase caps a single SELECT at 1000 rows by default; page through.
      var pageSize = 1000;
      function fetchPage(from) {
        return client
          .from('observations')
          .select('date,value')
          .eq('ric', ric)
          .order('date', { ascending: true })
          .range(from, from + pageSize - 1)
          .then(function (res) {
            if (res.error) throw res.error;
            return res.data || [];
          });
      }
      var all = [];
      function loop(from) {
        return fetchPage(from).then(function (rows) {
          all = all.concat(rows);
          if (rows.length < pageSize) return all;
          return loop(from + pageSize);
        });
      }
      return loop(0);
    }).then(function (rows) {
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        var d = new Date(rows[i].date);
        if (isNaN(d.getTime())) continue;
        out.push({ date: d, value: rows[i].value });
      }
      return out;
    });
  };

  SupabaseSource.prototype.getSeriesCount = function () { return this._seriesCount; };

  SupabaseSource.prototype.close = function () { this._seriesCount = 0; };

  // ============================================================
  //  Factory
  // ============================================================
  function create() {
    var mode = (getConfig().dataSource || 'sqlite').toLowerCase();
    if (mode === 'supabase') return new SupabaseSource();
    return new SqliteSource();
  }

  global.DataSource = { create: create };
})(window);
