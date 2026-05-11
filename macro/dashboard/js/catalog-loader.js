// catalog-loader.js — fetches per-country catalog JSON + lazy loads category files,
// loads per-country SQLite via sql.js, and serves observations to the chart.
//
// Country handling:
//   - Defaults to whatever localStorage('macroterm.country') says, falling back
//     to the country flagged "default" in catalog/_countries.json (typically "us").
//   - setCountry(cc) re-points all paths and re-loads everything.

(function (global) {
  'use strict';

  var COUNTRIES_URL = '../catalog/_countries.json';

  // Active country state — set by init() before any data loads.
  var country = (function () {
    try { return localStorage.getItem('macroterm.country') || ''; } catch (e) { return ''; }
  })() || 'us';
  var countriesManifest = null;

  function paths() {
    var base = '../catalog/' + country + '/';
    return {
      index: base + '_index.json',
      graph: base + '_graph.json',
      graphCondensed: base + '_graph_condensed.json',
      graphInsane: base + '_graph_insane.json',
      catBase: base,
    };
  }

  var indexData = null;     // { categories: [{slug, name, source_file, ric_count}], rics: { ric: {slug, description, frequency} } }
  var graphData = null;     // FULL graph: { clusters, nodes, edges, stats }
  var graphIndex = null;    // { byNode: {ric -> node}, byCluster: {cluster_id -> cluster}, edgesByNode: {ric -> [edges]} }
  var graphCondensedData = null;   // CONDENSED graph (curated ~150 RICs, bordered regions)
  var graphCondensedIndex = null;
  var graphInsaneData = null;      // INSANE graph (all 3,886 RICs in bordered regions)
  var graphInsaneIndex = null;
  var categoryCache = {};   // slug -> full category JSON
  var dataSource = null;    // active DataSource backend (sqlite or supabase)

  var listeners = { ready: [], error: [] };
  function emit(evt, payload) { (listeners[evt] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error(e); } }); }

  function setStatus(id, klass, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('ok', 'warn', 'err');
    if (klass) el.classList.add(klass);
    var span = el.querySelector('span:last-child');
    if (span) span.textContent = text;
  }

  function loadIndex() {
    return fetch(paths().index, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('catalog index http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        indexData = data;
        setStatus('statusCatalog', 'ok', 'Catalog: ' + (data.categories || []).length + ' categories · ' + Object.keys(data.rics || {}).length + ' RICs');
        var sc = document.getElementById('statSeriesCount');
        var cc = document.getElementById('statCatCount');
        var su = document.getElementById('statUpdated');
        if (sc) sc.textContent = Object.keys(data.rics || {}).length.toLocaleString();
        if (cc) cc.textContent = (data.categories || []).length;
        if (su) su.textContent = data.generated_at ? data.generated_at.slice(0, 10) : '—';
        return data;
      })
      .catch(function (err) {
        setStatus('statusCatalog', 'err', 'Catalog: ' + err.message);
        emit('error', { stage: 'catalog', error: err });
        throw err;
      });
  }

  function indexGraph(data) {
    var byNode = {}, byCluster = {}, edgesByNode = {};
    (data.nodes || []).forEach(function (n) {
      byNode[n.id] = n;
      if (!edgesByNode[n.id]) edgesByNode[n.id] = [];
    });
    (data.clusters || []).forEach(function (c) { byCluster[c.id] = c; });
    (data.edges || []).forEach(function (e) {
      if (edgesByNode[e.source]) edgesByNode[e.source].push(e);
      if (edgesByNode[e.target]) edgesByNode[e.target].push(e);
    });
    return { byNode: byNode, byCluster: byCluster, edgesByNode: edgesByNode };
  }

  function loadGraph() {
    var p = paths();
    return Promise.all([
      fetch(p.graph, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('graph http ' + r.status);
        return r.json();
      }),
      fetch(p.graphCondensed, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('graph_condensed http ' + r.status);
        return r.json();
      }),
      fetch(p.graphInsane, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('graph_insane http ' + r.status);
        return r.json();
      })
    ]).then(function (results) {
      graphData = results[0];
      graphCondensedData = results[1];
      graphInsaneData = results[2];
      graphIndex = indexGraph(graphData);
      graphCondensedIndex = indexGraph(graphCondensedData);
      graphInsaneIndex = indexGraph(graphInsaneData);
      var fullStats = graphData.stats || {};
      var condStats = graphCondensedData.stats || {};
      var insStats = graphInsaneData.stats || {};
      setStatus('statusGraph', 'ok',
        'Graph: ' + (condStats.node_count || 0) + ' condensed · ' +
        (fullStats.node_count || 0).toLocaleString() + ' full · ' +
        (insStats.node_count || 0).toLocaleString() + ' insane');
      return { full: graphData, condensed: graphCondensedData, insane: graphInsaneData };
    }).catch(function (err) {
      setStatus('statusGraph', 'err', 'Graph: ' + err.message);
      emit('error', { stage: 'graph', error: err });
    });
  }

  function pickGraph(mode) {
    // mode: "full" (default) | "condensed" | "insane"
    if (mode === 'condensed') return { data: graphCondensedData, idx: graphCondensedIndex };
    if (mode === 'insane')    return { data: graphInsaneData,    idx: graphInsaneIndex };
    return { data: graphData, idx: graphIndex };
  }

  function getNeighbors(ric, hops, mode) {
    hops = hops || 1;
    var g = pickGraph(mode);
    if (!g.idx || !g.idx.byNode[ric]) return { nodes: [], edges: [] };
    var includeNodes = {};
    var includeEdges = [];
    var seenEdge = {};
    function include(n) { if (n && g.idx.byNode[n]) includeNodes[n] = g.idx.byNode[n]; }
    include(ric);
    var frontier = [ric];
    for (var h = 0; h < hops; h++) {
      var next = [];
      frontier.forEach(function (n) {
        (g.idx.edgesByNode[n] || []).forEach(function (e) {
          var key = e.source + '\x00' + e.target + '\x00' + e.type;
          if (seenEdge[key]) return;
          seenEdge[key] = true;
          includeEdges.push(e);
          var other = e.source === n ? e.target : e.source;
          if (!includeNodes[other]) {
            include(other);
            next.push(other);
          }
        });
      });
      frontier = next;
    }
    return {
      nodes: Object.keys(includeNodes).map(function (k) { return includeNodes[k]; }),
      edges: includeEdges,
    };
  }

  function getCluster(clusterId, mode) {
    var g = pickGraph(mode);
    if (!g.idx || !g.idx.byCluster[clusterId]) return null;
    var cluster = g.idx.byCluster[clusterId];
    var members = (g.data.nodes || []).filter(function (n) { return n.cluster === clusterId; });
    return { cluster: cluster, members: members };
  }

  function getClusterEdges(mode) {
    // Returns aggregated cluster-to-cluster edges. Used for cluster overview.
    var g = pickGraph(mode);
    if (!g.data) return [];
    var clusterPairs = {};
    (g.data.edges || []).forEach(function (e) {
      var src = g.idx.byNode[e.source];
      var tgt = g.idx.byNode[e.target];
      if (!src || !tgt) return;
      if (src.cluster === tgt.cluster) return;
      var key = src.cluster + '\x00' + tgt.cluster + '\x00' + e.type;
      if (!clusterPairs[key]) {
        clusterPairs[key] = {
          source: src.cluster, target: tgt.cluster, type: e.type,
          count: 0, has_hand: false,
        };
      }
      clusterPairs[key].count++;
      if (e.confidence === 'hand') clusterPairs[key].has_hand = true;
    });
    return Object.keys(clusterPairs).map(function (k) { return clusterPairs[k]; });
  }

  function loadCategory(slug) {
    if (categoryCache[slug]) return Promise.resolve(categoryCache[slug]);
    return fetch(paths().catBase + slug + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('category ' + slug + ' http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        categoryCache[slug] = data;
        return data;
      });
  }

  function loadDb() {
    if (!global.DataSource || !global.DataSource.create) {
      var err = new Error('DataSource abstraction missing');
      setStatus('statusDb', 'err', 'Database: data-source.js not loaded');
      return Promise.reject(err);
    }
    setStatus('statusDb', 'warn', 'Database: loading…');
    dataSource = global.DataSource.create();
    return dataSource.open(country).then(function () {
      var nSeries = dataSource.getSeriesCount();
      var label = dataSource.kind === 'supabase' ? 'Supabase' : 'Database';
      setStatus('statusDb', 'ok', label + ': ' + nSeries.toLocaleString() + ' series');
      return dataSource;
    }).catch(function (err) {
      setStatus('statusDb', 'err', 'Database: ' + err.message);
      emit('error', { stage: 'db', error: err });
      throw err;
    });
  }

  // ============================================================
  //  FORECAST vs ACTUAL — pairs + error computation
  // ============================================================
  // Forecast RIC → realized actual RIC. Hand-mapped; reflects the canonical
  // pairings already encoded as `related` edges between forecast and actual
  // nodes in build_graph_condensed.py.
  var FORECAST_PAIRS = [
    { forecast: 'aUSFCBOUT',  actual: 'aUSFOUTL',    name: 'CBO Outlays' },
    { forecast: 'aUSFCBREV',  actual: 'aUSFEDREC',   name: 'CBO Receipts' },
    { forecast: 'aUSFCCUFHR', actual: 'aUSUNTOTR',   name: 'Fed SEP UR' },
    { forecast: 'aUSFCCCFHR', actual: 'aUSPCE2AR',   name: 'Fed SEP Core PCE' },
    { forecast: 'aUSAGDPF',   actual: 'aUSCGDPPD/A', name: 'Reuters GDP poll' },
  ];
  var forecastErrorsCache = null;

  function _seriesForRic(ric) {
    // Returns Promise<[{date: Date, value: number}, ...]>.
    // Both backends return the same shape.
    if (!dataSource) return Promise.resolve([]);
    return dataSource.getObservations(ric);
  }

  function _alignByNearestDate(actuals, forecasts, maxLagDays) {
    // For each forecast point, find the nearest actual (by date) within maxLagDays.
    // Returns paired arrays [(forecast_value, actual_value), ...].
    if (!actuals.length || !forecasts.length) return [];
    var pairs = [];
    var maxDeltaMs = (maxLagDays || 365) * 86400 * 1000;
    forecasts.forEach(function (fp) {
      var ft = new Date(fp.date).getTime();
      // Walk actuals to find nearest
      var bestIdx = -1, bestDelta = Infinity;
      for (var i = 0; i < actuals.length; i++) {
        var dt = Math.abs(new Date(actuals[i].date).getTime() - ft);
        if (dt < bestDelta) { bestDelta = dt; bestIdx = i; }
        else if (dt > bestDelta) break;  // arrays sorted by date, so once delta increases we're past
      }
      if (bestIdx >= 0 && bestDelta <= maxDeltaMs) {
        pairs.push({ f: fp.value, a: actuals[bestIdx].value, date: fp.date });
      }
    });
    return pairs;
  }

  function getForecastErrors() {
    if (forecastErrorsCache) return Promise.resolve(forecastErrorsCache);
    if (!dataSource) return Promise.reject(new Error('database not loaded'));

    var seriesPromises = [];
    FORECAST_PAIRS.forEach(function (pair) {
      seriesPromises.push(_seriesForRic(pair.forecast));
      seriesPromises.push(_seriesForRic(pair.actual));
    });

    return Promise.all(seriesPromises).then(function (allSeries) {
      var results = {};
      FORECAST_PAIRS.forEach(function (pair, idx) {
        var fSeries = allSeries[idx * 2] || [];
        var aSeries = allSeries[idx * 2 + 1] || [];
        var pairs = _alignByNearestDate(aSeries, fSeries, 540);  // up to 18mo
        if (!pairs.length) {
          results[pair.forecast] = { error_abs: null, error_pct: null, n: 0 };
          return;
        }
        var sumAbs = 0, sumAbsPct = 0, n = 0;
        pairs.forEach(function (p) {
          if (p.a == null || p.f == null) return;
          var diff = p.f - p.a;
          sumAbs += Math.abs(diff);
          if (Math.abs(p.a) > 1e-6) sumAbsPct += Math.abs(diff / p.a) * 100;
          n++;
        });
        results[pair.forecast] = {
          actual: pair.actual,
          name: pair.name,
          error_abs: n ? sumAbs / n : null,
          error_pct: n ? sumAbsPct / n : null,
          n: n,
        };
      });
      forecastErrorsCache = results;
      return results;
    });
  }

  function getRicMeta(ric) {
    if (!indexData || !indexData.rics) return null;
    var lite = indexData.rics[ric];
    if (!lite) return null;
    var slug = lite.slug;
    return loadCategory(slug).then(function (cat) {
      var entry = (cat.rics || []).find(function (r) { return r.ric === ric; });
      if (!entry) return null;
      entry.category = cat.category;
      entry.category_slug = cat.category_slug;
      return entry;
    });
  }

  function getObservations(ric) {
    if (!dataSource) return Promise.reject(new Error('database not loaded'));
    return dataSource.getObservations(ric);
  }

  function searchRics(query, limit) {
    limit = limit || 30;
    if (!indexData || !indexData.rics) return [];
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    // Multi-token search: every token must match somewhere in the haystack
    var tokens = q.split(/\s+/).filter(function (t) { return t.length > 0; });
    var hits = [];
    var rics = indexData.rics;
    for (var ric in rics) {
      if (!Object.prototype.hasOwnProperty.call(rics, ric)) continue;
      var meta = rics[ric];
      var ricLower = ric.toLowerCase();
      var descLower = (meta.description || '').toLowerCase();
      var meaningLower = (meta.meaning || '').toLowerCase();
      var howLower = (meta.how_to_use || '').toLowerCase();
      var subLower = (meta.subcategory || '').toLowerCase();
      var slugLower = (meta.slug || '').toLowerCase();
      var hay = ricLower + ' ' + descLower + ' ' + meaningLower + ' ' + howLower + ' ' + subLower + ' ' + slugLower;

      // Every token must be present somewhere
      var allMatch = true;
      for (var i = 0; i < tokens.length; i++) {
        if (hay.indexOf(tokens[i]) === -1) { allMatch = false; break; }
      }
      if (!allMatch) continue;

      // Ranking against the full query (tightest match wins):
      //   0 = RIC code prefix
      //   1 = description prefix
      //   2 = subcategory prefix or contains
      //   3 = description contains
      //   4 = meaning contains
      //   5 = how_to_use contains
      //   6 = slug only
      var rank = 6;
      if (ricLower.indexOf(q) === 0) rank = 0;
      else if (descLower.indexOf(q) === 0) rank = 1;
      else if (subLower.indexOf(q) !== -1) rank = 2;
      else if (descLower.indexOf(q) !== -1 || ricLower.indexOf(q) !== -1) rank = 3;
      else if (meaningLower.indexOf(q) !== -1) rank = 4;
      else if (howLower.indexOf(q) !== -1) rank = 5;

      hits.push({
        ric: ric, description: meta.description, frequency: meta.frequency, slug: meta.slug,
        subcategory: meta.subcategory, rank: rank,
        // hint at where the match was found, for the UI
        hitField: rank <= 1 ? 'name' : (rank === 2 ? 'subcategory' : (rank === 3 ? 'description' : (rank === 4 ? 'meaning' : (rank === 5 ? 'how_to_use' : 'slug'))))
      });
      if (hits.length > limit * 6) break; // cap scan cost
    }
    hits.sort(function (a, b) { return a.rank - b.rank || a.ric.localeCompare(b.ric); });
    return hits.slice(0, limit);
  }

  function loadCountriesManifest() {
    return fetch(COUNTRIES_URL, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('countries http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        countriesManifest = data;
        // If no country was set in storage and the manifest has a default,
        // honor it. (We can't look up user storage on first load if it was
        // empty, so this just covers the freshest possible install.)
        if (!localStorage.getItem('macroterm.country')) {
          var def = (data.countries || []).find(function (c) { return c.default; });
          if (def) country = def.code;
        }
        return data;
      })
      .catch(function (err) {
        // Manifest is optional — fall back to single-country mode if missing.
        countriesManifest = { countries: [{ code: country, name: country.toUpperCase() }] };
      });
  }

  function init() {
    return loadCountriesManifest().then(function () {
      return Promise.all([loadIndex(), loadDb(), loadGraph()])
        .then(function () { emit('ready', { catalog: indexData, graph: graphData, country: country }); })
        .catch(function (err) { console.error('catalog init failed', err); });
    });
  }

  // Switch to another country: discard caches, reset state, reload everything.
  // Returns a Promise that resolves once the new data is loaded.
  function setCountry(cc) {
    cc = String(cc || '').toLowerCase();
    if (!cc || cc === country) return Promise.resolve(country);
    country = cc;
    try { localStorage.setItem('macroterm.country', cc); } catch (e) {}
    // Reset all caches so the new country's data isn't shadowed by US data.
    indexData = null;
    graphData = null; graphIndex = null;
    graphCondensedData = null; graphCondensedIndex = null;
    graphInsaneData = null; graphInsaneIndex = null;
    categoryCache = {};
    forecastErrorsCache = null;
    if (dataSource) { try { dataSource.close(); } catch (e) {} dataSource = null; }
    // Re-fetch
    return Promise.all([loadIndex(), loadDb(), loadGraph()])
      .then(function () {
        emit('ready', { catalog: indexData, graph: graphData, country: country });
        return country;
      });
  }

  global.Catalog = {
    init: init,
    on: function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    getIndex: function () { return indexData; },
    getCategory: loadCategory,
    getRicMeta: getRicMeta,
    getObservations: getObservations,
    search: searchRics,
    getGraph: function (mode) { return pickGraph(mode).data; },
    getNode: function (ric, mode) {
      var g = pickGraph(mode);
      return g.idx ? g.idx.byNode[ric] : null;
    },
    getNeighbors: getNeighbors,
    getCluster: getCluster,
    getClusterEdges: getClusterEdges,
    findPath: findPath,
    getForecastErrors: getForecastErrors,
    forecastPairs: function () { return FORECAST_PAIRS.slice(); },
    // Country API
    getCountry: function () { return country; },
    getCountries: function () { return countriesManifest ? countriesManifest.countries.slice() : []; },
    setCountry: setCountry,
  };

  // ---------- Shortest-path search through the influence graph ----------
  // Returns { nodes: [ric, ...], edges: [edge, ...], lag: [minSum, maxSum] }
  // or null if unreachable. BFS treats drives/leads/part_of as directed (forward),
  // related as bidirectional. Edges along the path keep their original direction.
  function findPath(srcRic, dstRic, mode) {
    var g = pickGraph(mode);
    if (!g.idx || !g.data) return null;
    if (srcRic === dstRic) return { nodes: [srcRic], edges: [], lag: [0, 0] };
    if (!g.idx.byNode[srcRic] || !g.idx.byNode[dstRic]) return null;

    // Build adjacency: src -> [{ via_edge, target }]
    var adj = {};
    (g.data.edges || []).forEach(function (e) {
      var directed = e.type === 'drives' || e.type === 'leads' || e.type === 'part_of';
      (adj[e.source] = adj[e.source] || []).push({ edge: e, target: e.target });
      if (!directed) {
        (adj[e.target] = adj[e.target] || []).push({ edge: e, target: e.source });
      }
    });

    // BFS
    var prev = {};            // ric -> { from_ric, edge }
    var visited = { };
    visited[srcRic] = true;
    var queue = [srcRic];
    var found = false;
    while (queue.length) {
      var cur = queue.shift();
      if (cur === dstRic) { found = true; break; }
      var nbrs = adj[cur] || [];
      for (var i = 0; i < nbrs.length; i++) {
        var nb = nbrs[i];
        if (!visited[nb.target]) {
          visited[nb.target] = true;
          prev[nb.target] = { from: cur, edge: nb.edge };
          queue.push(nb.target);
        }
      }
    }
    if (!found) return null;

    // Reconstruct path
    var pathNodes = [];
    var pathEdges = [];
    var cur2 = dstRic;
    while (cur2 !== srcRic) {
      pathNodes.push(cur2);
      var p = prev[cur2];
      if (!p) return null;
      pathEdges.push(p.edge);
      cur2 = p.from;
    }
    pathNodes.push(srcRic);
    pathNodes.reverse();
    pathEdges.reverse();

    // Sum lag (only on hand edges with concrete ranges)
    var minLag = 0, maxLag = 0;
    pathEdges.forEach(function (e) {
      if (e.confidence === 'hand' && e.lag_months && e.lag_months.length === 2) {
        minLag += e.lag_months[0];
        maxLag += e.lag_months[1];
      }
    });

    return { nodes: pathNodes, edges: pathEdges, lag: [minLag, maxLag] };
  }
})(window);
