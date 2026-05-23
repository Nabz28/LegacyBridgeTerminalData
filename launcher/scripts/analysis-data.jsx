// ================================================================
// analysis-data.jsx — data access for the Analysis workbench.
// Unified search + fetch across BOTH macro data sources:
//   • Live cross-asset/macro  → macro.live_indicators (catalog) + full
//     history via the series-proxy edge fn (FRED / DBnomics / Yahoo).
//   • Refinitiv macro          → macro.series_lite (catalog) + macro.observations.
// Exposes window.AnalysisData. No UI here.
// ================================================================
(function () {
  'use strict';
  var SB = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  var PROXY = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy';

  function sbGet(path, profile) {
    return fetch(SB + path, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Accept-Profile': profile } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); });
  }

  // ---- catalogs (cached) --------------------------------------------------
  var _live = null, _liveP = null;
  function liveCatalog() {
    if (_live) return Promise.resolve(_live);
    if (_liveP) return _liveP;
    _liveP = sbGet('/live_indicators?select=key,label,region,category,source,series_id,unit,freq&order=region,sort_order', 'macro')
      .then(function (rows) {
        _live = rows.map(function (r) {
          return {
            uid: 'live:' + r.key, kind: 'live', key: r.key, label: r.label,
            sub: r.region + ' · ' + r.category, source: r.source, seriesId: r.series_id,
            unit: r.unit || '', freq: r.freq || '', tag: r.source
          };
        });
        return _live;
      }).catch(function () { _live = []; return _live; });
    return _liveP;
  }

  var REF_COUNTRIES = [{ id: 'us', label: 'US' }, { id: 'id', label: 'ID' }, { id: 'cn', label: 'CN' }];

  // Refinitiv search is server-side (catalog is large) — ilike on description.
  function searchRefinitiv(q, country) {
    var c = country || 'us';
    var qq = encodeURIComponent((q || '').trim());
    var path = '/series_lite?country=eq.' + c + '&is_poll=eq.false&description=ilike.*' + qq + '*&select=ric,description,subcategory,category_slug,country&order=description.asc&limit=60';
    return sbGet(path, 'macro').then(function (rows) {
      return (rows || []).map(function (r) {
        return {
          uid: 'ref:' + r.ric, kind: 'ref', ric: r.ric, label: r.description,
          sub: (r.country || c).toUpperCase() + ' · ' + (r.subcategory || r.category_slug || 'Refinitiv'),
          source: 'Refinitiv', tag: 'Refinitiv', country: r.country || c
        };
      });
    }).catch(function () { return []; });
  }

  // Unified search: filter the (cached) live catalog client-side + query
  // Refinitiv server-side, merge. Returns up to `limit` items.
  function search(q, opts) {
    opts = opts || {}; var ql = (q || '').trim().toLowerCase();
    var jobs = [liveCatalog().then(function (cat) {
      if (!ql) return cat.slice(0, 40);
      return cat.filter(function (it) { return it.label.toLowerCase().indexOf(ql) > -1 || it.sub.toLowerCase().indexOf(ql) > -1 || it.key.indexOf(ql) > -1; });
    })];
    if (opts.refinitiv !== false && ql) jobs.push(searchRefinitiv(q, opts.country));
    return Promise.all(jobs).then(function (res) {
      var live = res[0] || [], ref = res[1] || [];
      var merged = live.concat(ref);
      return merged.slice(0, opts.limit || 120);
    });
  }

  // ---- series fetch (cached by uid) --------------------------------------
  var _cache = {};
  function fetchSeries(item) {
    if (_cache[item.uid]) return Promise.resolve(_cache[item.uid]);
    var p;
    if (item.kind === 'ref') {
      p = sbGet('/observations?ric=eq.' + encodeURIComponent(item.ric) + '&select=date,value&order=date.asc&limit=100000', 'macro')
        .then(function (rows) { return (rows || []).map(function (o) { return { date: o.date, value: Number(o.value) }; }); });
    } else {
      var qs = '?source=' + encodeURIComponent(item.source) + '&id=' + encodeURIComponent(item.seriesId);
      if (item.source === 'YAHOO') qs += '&range=max&interval=1mo';
      p = fetch(PROXY + qs, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
        .then(function (d) { return (d.obs || []).map(function (o) { return { date: o.date, value: Number(o.value) }; }); });
    }
    return p.then(function (s) {
      s = s.filter(function (o) { return o.date && o.value != null && isFinite(o.value); })
           .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      _cache[item.uid] = s;
      return s;
    });
  }

  // Fetch many series in parallel, returning a map uid -> series.
  function fetchAll(items) {
    return Promise.all(items.map(function (it) {
      return fetchSeries(it).then(function (s) { return { uid: it.uid, series: s }; })
        .catch(function (e) { return { uid: it.uid, series: [], error: String(e) }; });
    })).then(function (arr) { var m = {}; arr.forEach(function (r) { m[r.uid] = r; }); return m; });
  }

  window.AnalysisData = {
    SB: SB, ANON: ANON, PROXY: PROXY,
    REF_COUNTRIES: REF_COUNTRIES,
    liveCatalog: liveCatalog, search: search, searchRefinitiv: searchRefinitiv,
    fetchSeries: fetchSeries, fetchAll: fetchAll,
    clearCache: function () { _cache = {}; }
  };
})();
