// macro-map.js — vis-network wrapper for the macro influence graph.
//
// Two graphs available:
//   "condensed" — curated ~150 investor-relevant RICs, with hand-written display
//                 names on each node and ~170 hand-authored edges. Default view.
//   "full"      — all 3,886 RICs with auto-inferred edges. The "BIG map".
//
// Two render modes per graph:
//   renderMini(container, ric)         — active RIC + 1-hop neighbors (right panel)
//   renderFullscreen(container, mode)  — full overlay; "condensed" or "full"
//
// Visual conventions:
//   - Hand edges: solid, full opacity, optional "+Nmo" lag label
//   - Auto edges: 60% opacity, dashed if 'related'/'part_of'
//   - Active RIC: brighter ring + larger size
//   - Cluster colors come from the graph file
//   - PHYSICS DISABLED after stabilization (no jitter, no drift)
//   - vis-network's built-in nav buttons disabled; we provide custom +/- zoom in HTML
//
// Emits 'loadRic' CustomEvent on the container when a RIC node is clicked.

(function (global) {
  'use strict';

  var ACCENT = '#ff8a00';
  var TEXT = '#e6e8ec';
  var TEXT_DIM = '#9aa3b2';

  var miniNetwork = null;
  var fullNetwork = null;
  var fullState = { mode: 'condensed', view: 'cluster', expandedCluster: null };
  // Snapshots of original node/edge styling so we can restore after focus
  var fullSnapshot = null;   // { nodes: DataSet, edges: DataSet, originalNodes: {id->options}, originalEdges: {id->options}, focusedNode: id|null }
  // Orbital animation state (one rAF loop active at a time)
  var orbit = null;          // { rafId, startedAt, lastT, orbits: {id->{cx,cy,r,angle0,angVel,bobPhase,bobAmp}}, network }

  // --------- helpers ---------

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function clusterColorOf(clusterId, graphMode) {
    var g = global.Catalog && global.Catalog.getGraph(graphMode);
    if (!g) return ACCENT;
    var c = (g.clusters || []).find(function (x) { return x.id === clusterId; });
    return c ? c.color : '#94a3b8';
  }

  function emit(container, evtName, detail) {
    container.dispatchEvent(new CustomEvent(evtName, { detail: detail, bubbles: true }));
  }

  // ---------- common edge styling ----------

  function edgeOpts(edge, opts) {
    opts = opts || {};
    var isHand = edge.confidence === 'hand';
    var dim = isHand ? 0.95 : 0.45;
    var directed = edge.type === 'drives' || edge.type === 'leads' || edge.type === 'part_of';
    var color = isHand ? hexA('#cbd5e1', dim) : hexA('#94a3b8', dim);

    var cfg = {
      color: { color: color, highlight: ACCENT, hover: ACCENT, opacity: 1 },
      width: isHand ? 1.6 : 0.9,
      arrows: directed ? { to: { enabled: true, scaleFactor: 0.55, type: 'arrow' } } : undefined,
      smooth: { enabled: true, type: 'continuous', roundness: 0.18 },
      dashes: (edge.type === 'related' || edge.type === 'part_of') ? [4, 4] : false,
    };

    // Lag label on hand edges with a meaningful range. Mini-graph uses smaller font.
    if (isHand && edge.lag_months && edge.lag_months.length === 2 && edge.lag_months[1] > 0) {
      var lag = edge.lag_months;
      var lagLabel = (lag[0] === lag[1]) ? (lag[0] + 'mo') : (lag[0] + '–' + lag[1] + 'mo');
      cfg.label = '+' + lagLabel;
      cfg.font = {
        color: TEXT_DIM,
        size: opts.compact ? 8 : 9,
        face: 'JetBrains Mono, Consolas, monospace',
        strokeWidth: 0,
        background: hexA('#0e1116', 0.7),
        align: 'middle',
      };
    }

    cfg.title = edge.note || (edge.type + (edge.lag_months ? ' · lag ' + edge.lag_months.join('-') + 'mo' : ''));
    return cfg;
  }

  // ---------- node styling for the CONDENSED graph (rich labels) ----------

  function condensedNodeOpts(node, isCenter) {
    var color = clusterColorOf(node.cluster, 'condensed');
    var importance = node.importance || 2;
    var size = isCenter ? 22 : (importance === 1 ? 16 : (importance === 2 ? 12 : 9));
    var fontSize = isCenter ? 15 : (importance === 1 ? 13 : (importance === 2 ? 11 : 10));
    var label = node.label || node.id;
    return {
      label: label,
      title: (node.label || node.id) + '\n' + (node.description || '') + (node.frequency ? '\nFreq: ' + node.frequency : ''),
      color: {
        background: isCenter ? color : hexA(color, importance === 1 ? 0.7 : 0.45),
        border: isCenter ? '#ffffff' : color,
        highlight: { background: color, border: '#ffffff' },
        hover: { background: color, border: '#ffffff' },
      },
      borderWidth: isCenter ? 2.5 : (importance === 1 ? 1.5 : 1),
      font: {
        color: TEXT,
        size: fontSize,
        face: 'Segoe UI, system-ui, -apple-system, sans-serif',
        strokeWidth: 0,
        background: hexA('#0b0e13', 0.85),  // dark pill behind label for readability
        align: 'center',
        multi: false,
      },
      shape: 'dot',
      size: size,
    };
  }

  // ---------- node styling for the INSANE graph (tiny dots, RIC labels only) ----------

  function insaneNodeOpts(node) {
    // Polls get a distinct gold/yellow outline so they pop visually
    var color = node.cluster ? clusterColorOf(node.cluster, 'insane') : '#94a3b8';
    var isPoll = !!node.is_poll;
    var border = isPoll ? '#facc15' : color;
    return {
      label: node.id,
      title: (node.label || node.id) + '\nRIC: ' + node.id + (isPoll ? '\n[Poll forecast]' : ''),
      color: {
        background: hexA(color, isPoll ? 0.35 : 0.55),
        border: border,
        highlight: { background: color, border: '#ffffff' },
        hover: { background: color, border: '#ffffff' },
      },
      borderWidth: node.is_anchor ? 2 : (isPoll ? 1.5 : 0.6),
      font: {
        color: TEXT,
        size: node.is_anchor ? 12 : 9,
        face: 'JetBrains Mono, Consolas, monospace',
        strokeWidth: 0,
        background: hexA('#0b0e13', 0.85),
      },
      shape: isPoll ? 'square' : 'dot',
      size: node.is_anchor ? 8 : (isPoll ? 5 : 4),
      // Hide labels at fit-zoom (text soup); reveal as user zooms in
      scaling: {
        label: { enabled: true, min: 8, max: 14, drawThreshold: 9 },
      },
    };
  }

  // ---------- node styling for the FULL graph (RIC code labels only) ----------

  function fullNodeOpts(node, isCenter) {
    var color = clusterColorOf(node.cluster, 'full');
    var size = isCenter ? 14 : 8;
    return {
      label: node.id,
      title: (node.label || node.id) + '\nCluster: ' + (node.cluster || '—'),
      color: {
        background: isCenter ? color : hexA(color, 0.30),
        border: isCenter ? '#ffffff' : color,
        highlight: { background: color, border: '#ffffff' },
        hover: { background: color, border: '#ffffff' },
      },
      borderWidth: isCenter ? 2.5 : 1,
      font: {
        color: TEXT,
        size: 11,
        face: 'JetBrains Mono, Consolas, monospace',
        strokeWidth: 0,
      },
      shape: 'dot',
      size: size,
    };
  }

  // ---------- shared vis-network options ----------

  function baseOptions(physicsIterations, opts) {
    opts = opts || {};
    return {
      autoResize: true,
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: opts.gravity || -90,
          centralGravity: 0.008,
          springLength: opts.springLength || 220,
          springConstant: 0.06,
          damping: 0.6,
          avoidOverlap: 0.85,
        },
        stabilization: {
          enabled: true,
          iterations: physicsIterations,
          updateInterval: 25,
          onlyDynamicEdges: false,
          fit: true,
        },
        // Critical: stop simulating after stabilization → no jitter / drift
        adaptiveTimestep: true,
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: false,   // hide vis-network's green arrow buttons
        keyboard: { enabled: false },
        zoomView: true,
        dragView: true,
      },
      layout: { improvedLayout: false, randomSeed: 42 },  // forceAtlas2 handles layout; improvedLayout fails on dense graphs
      edges: {
        smooth: { enabled: true, type: 'continuous', roundness: 0.18 },
      },
    };
  }

  function freezeAfterStabilization(network, initialScale) {
    network.once('stabilizationIterationsDone', function () {
      network.setOptions({ physics: { enabled: false } });
      setTimeout(function () {
        try {
          // Fit first to center, then zoom in to make labels readable.
          network.fit({ animation: false });
          if (initialScale) {
            var s = network.getScale();
            network.moveTo({ scale: s * initialScale, animation: false });
          }
        } catch (e) {}
      }, 50);
    });
  }

  function sizeNetwork(network) {
    // No-op; vis-network auto-resizes via the autoResize flag
  }

  // ============================================================
  //  MINI-GRAPH (right panel)
  // ============================================================
  function renderMini(container, ric) {
    if (!container) return;
    if (!ready(container)) return;

    // Prefer condensed graph when the RIC exists there (richer labels);
    // fall back to full graph otherwise.
    var graphMode = global.Catalog.getNode(ric, 'condensed') ? 'condensed' : 'full';
    var node = global.Catalog.getNode(ric, graphMode);
    if (!node) {
      container.innerHTML = '<div class="map-placeholder">No graph node for ' + escapeHtml(ric) + '</div>';
      return;
    }

    var sub = global.Catalog.getNeighbors(ric, 1, graphMode);
    // Cap to 12 highest-priority neighbors
    var ranked = sub.edges.slice().sort(function (a, b) {
      var sa = (a.confidence === 'hand' ? 0 : 10) + ({ 'drives': 0, 'leads': 1, 'part_of': 2, 'related': 3 }[a.type] || 9);
      var sb = (b.confidence === 'hand' ? 0 : 10) + ({ 'drives': 0, 'leads': 1, 'part_of': 2, 'related': 3 }[b.type] || 9);
      return sa - sb;
    });
    var keepNodes = {}; keepNodes[ric] = true;
    var keepEdges = [];
    for (var i = 0; i < ranked.length && Object.keys(keepNodes).length < 13; i++) {
      var e = ranked[i];
      keepEdges.push(e);
      keepNodes[e.source] = true;
      keepNodes[e.target] = true;
    }

    var visNodes = Object.keys(keepNodes).map(function (id) {
      var n = global.Catalog.getNode(id, graphMode) || { id: id, label: id, cluster: 'misc', importance: 3 };
      return Object.assign({ id: id }, graphMode === 'condensed' ? condensedNodeOpts(n, id === ric) : fullNodeOpts(n, id === ric));
    });
    var visEdges = keepEdges.map(function (e, idx) {
      return Object.assign({ id: 'me' + idx, from: e.source, to: e.target }, edgeOpts(e, { compact: true }));
    });

    container.innerHTML = '';
    if (miniNetwork) miniNetwork.destroy();
    var data = { nodes: new global.vis.DataSet(visNodes), edges: new global.vis.DataSet(visEdges) };
    var opts = baseOptions(80, { gravity: -25, springLength: 90 });
    opts.interaction.zoomView = false;
    opts.interaction.dragView = false;

    miniNetwork = new global.vis.Network(container, data, opts);
    freezeAfterStabilization(miniNetwork);
    miniNetwork.on('click', function (params) {
      if (params.nodes && params.nodes.length) {
        var clicked = params.nodes[0];
        if (clicked !== ric) emit(container, 'loadRic', { ric: clicked });
      }
    });
  }

  // ============================================================
  //  FULLSCREEN
  // ============================================================
  function renderFullscreen(container, mode) {
    if (!container) return;
    if (!ready(container)) return;
    stopOrbit();    // any previous orbit gets cancelled before a fresh render
    var m = mode || 'condensed';

    // Country-aware fallback: the condensed graph is hand-curated for the US.
    // Other countries (e.g. Indonesia) currently have an empty condensed graph.
    // If the user lands on Condensed but it has 0 nodes, silently promote them
    // to Full so they actually see something.
    if (m === 'condensed') {
      var condG = global.Catalog && global.Catalog.getGraph('condensed');
      if (!condG || !condG.nodes || condG.nodes.length === 0) {
        m = 'full';
        // Sync the toolbar buttons so the active state matches reality
        var btnFull = document.getElementById('mapModeFull');
        var btnCond = document.getElementById('mapModeCondensed');
        if (btnFull && btnCond) {
          btnFull.classList.add('active');
          btnCond.classList.remove('active');
        }
        var hint = document.getElementById('mapHint');
        if (hint) {
          hint.textContent = 'Condensed view not yet curated for ' +
            (global.Catalog.getCountry() || '').toUpperCase() +
            ' — showing Full graph instead';
        }
      }
    }

    fullState = { mode: m, view: m === 'full' ? 'cluster' : 'flat', expandedCluster: null };

    if (m === 'condensed') {
      renderCondensedFlat(container);
    } else if (m === 'insane') {
      renderInsane(container);
    } else {
      renderFullClusterView(container);
    }
  }

  // ============================================================
  //  ORBITAL ANIMATION — gentle drift, not chaotic
  // ============================================================
  function stopOrbit() {
    if (orbit && orbit.rafId) {
      cancelAnimationFrame(orbit.rafId);
    }
    orbit = null;
  }

  function startOrbit(network, regions) {
    stopOrbit();
    if (!network || !regions || !regions.length) return;
    var regionCenters = {};
    regions.forEach(function (r) { regionCenters[r.id] = { cx: r.cx, cy: r.cy }; });

    // Snapshot initial polar coords relative to each node's region center
    var orbits = {};
    var data = network.body.data;
    var nodeList = data.nodes.get();
    nodeList.forEach(function (n) {
      var rc = regionCenters[n.region];
      if (!rc) return;
      var dx = (n.x != null ? n.x : 0) - rc.cx;
      var dy = (n.y != null ? n.y : 0) - rc.cy;
      var radius = Math.sqrt(dx * dx + dy * dy);
      var angle0 = Math.atan2(dy, dx);
      // Hash the id for deterministic-but-varied per-node phase/velocity
      var h = 0;
      for (var i = 0; i < n.id.length; i++) h = (h * 31 + n.id.charCodeAt(i)) & 0xffffffff;
      // Very slow angular velocity: ~0.05–0.12 rad/sec → full revolution every ~50–125 sec.
      // All same sign within a region (whole cluster rotates) to keep structure stable.
      var regionSign = (regionCenters[n.region] && hashCode(n.region) % 2 === 0) ? 1 : -1;
      var jitter = ((Math.abs(h) % 1000) / 1000) * 0.04 + 0.05;  // 0.05..0.09 rad/sec
      var angVel = regionSign * jitter * 0.0009;  // → very gentle (per-ms)
      var bobPhase = ((Math.abs(h) >> 10) % 1000) / 1000 * Math.PI * 2;
      var bobAmp = 1.5 + ((Math.abs(h) >> 6) % 100) / 100 * 2.5;  // 1.5..4 units
      orbits[n.id] = {
        cx: rc.cx, cy: rc.cy,
        radius: radius,
        angle0: angle0,
        angVel: angVel,
        bobPhase: bobPhase,
        bobAmp: bobAmp,
      };
    });

    var startedAt = performance.now();
    var lastUpdate = startedAt;
    orbit = { rafId: null, startedAt: startedAt, network: network, orbits: orbits };

    function tick(now) {
      if (!orbit || orbit.network !== network) return;
      // Throttle updates to ~30fps to keep CPU low
      if (now - lastUpdate < 33) {
        orbit.rafId = requestAnimationFrame(tick);
        return;
      }
      lastUpdate = now;
      var elapsed = now - startedAt;
      var updates = [];
      Object.keys(orbits).forEach(function (id) {
        var o = orbits[id];
        var angle = o.angle0 + o.angVel * elapsed;
        var bob = Math.sin(elapsed * 0.0006 + o.bobPhase) * o.bobAmp;
        var r = o.radius + bob;
        updates.push({ id: id, x: o.cx + r * Math.cos(angle), y: o.cy + r * Math.sin(angle) });
      });
      try { data.nodes.update(updates); } catch (e) {}
      orbit.rafId = requestAnimationFrame(tick);
    }
    orbit.rafId = requestAnimationFrame(tick);
  }

  function hashCode(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return Math.abs(h);
  }

  // ============================================================
  //  REGION BORDER DRAWING (canvas hook)
  // ============================================================
  // Draws rounded-rect border around each region. Borders are RECOMPUTED every
  // frame based on the network's current node positions — so they smoothly
  // track the orbital animation.
  function buildRegionDrawer(graph, network, opts) {
    opts = opts || {};
    var padding = opts.padding != null ? opts.padding : 32;
    var labelOffset = opts.labelOffset != null ? opts.labelOffset : 16;
    var labelSize = opts.labelSize || 14;
    var labelFamily = opts.labelFamily || 'Segoe UI, system-ui, sans-serif';

    var regionsById = {};
    (graph.regions || []).forEach(function (r) { regionsById[r.id] = r; });
    var nodeRegion = {};
    (graph.nodes || []).forEach(function (n) { if (n.region) nodeRegion[n.id] = n.region; });

    return function drawRegions(ctx) {
      // Dynamically compute current bboxes from the LIVE node positions
      var bboxes = {};
      var bodyNodes = network && network.body && network.body.nodes;
      if (!bodyNodes) return;
      Object.keys(nodeRegion).forEach(function (id) {
        var rid = nodeRegion[id];
        var bn = bodyNodes[id];
        if (!bn || typeof bn.x !== 'number' || typeof bn.y !== 'number') return;
        var b = bboxes[rid] || (bboxes[rid] = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        if (bn.x < b.minX) b.minX = bn.x;
        if (bn.y < b.minY) b.minY = bn.y;
        if (bn.x > b.maxX) b.maxX = bn.x;
        if (bn.y > b.maxY) b.maxY = bn.y;
      });

      ctx.save();
      Object.keys(bboxes).forEach(function (rid) {
        var b = bboxes[rid];
        var meta = regionsById[rid];
        if (!meta) return;
        var x = b.minX - padding;
        var y = b.minY - padding;
        var w = (b.maxX - b.minX) + padding * 2;
        var h = (b.maxY - b.minY) + padding * 2;
        // Rounded rect
        var radius = 18;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        // Fill + stroke
        ctx.fillStyle = hexA(meta.color, 0.06);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = hexA(meta.color, 0.85);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.font = '700 ' + labelSize + 'px ' + labelFamily;
        ctx.fillStyle = hexA(meta.color, 0.95);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        var label = meta.label;
        var labelMetrics = ctx.measureText(label);
        var lblX = x + 16;
        var lblY = y + labelOffset;
        // Background pill behind the label so it stays readable
        ctx.fillStyle = '#0b0e13';
        ctx.fillRect(lblX - 6, lblY - labelSize / 2 - 3, labelMetrics.width + 12, labelSize + 6);
        ctx.fillStyle = hexA(meta.color, 0.95);
        ctx.fillText(label, lblX, lblY);
      });
      ctx.restore();
    };
  }

  // --- CONDENSED: bordered-region map ---
  function renderCondensedFlat(container) {
    var g = global.Catalog.getGraph('condensed');
    if (!g) return;

    var visNodes = (g.nodes || []).map(function (n) {
      var opts = Object.assign({ id: n.id }, condensedNodeOpts(n, false));
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        opts.x = n.x;
        opts.y = n.y;
        opts.physics = false;
      }
      return opts;
    });
    var visEdges = (g.edges || []).map(function (e, idx) {
      return Object.assign({ id: 'ce' + idx, from: e.source, to: e.target }, edgeOpts(e, { compact: false }));
    });

    if (fullNetwork) fullNetwork.destroy();
    container.innerHTML = '';

    var data = { nodes: new global.vis.DataSet(visNodes), edges: new global.vis.DataSet(visEdges) };
    var opts = baseOptions(0, { gravity: 0, springLength: 0 });
    opts.physics = { enabled: false };
    opts.layout = { improvedLayout: false, randomSeed: 42 };
    opts.edges = {
      smooth: { enabled: true, type: 'continuous', roundness: 0.25 },
    };

    fullNetwork = new global.vis.Network(container, data, opts);

    // Draw region borders dynamically — recomputed each frame from live positions
    var drawer = buildRegionDrawer(g, fullNetwork, { padding: 38, labelOffset: 14, labelSize: 13 });
    fullNetwork.on('beforeDrawing', function (ctx) { drawer(ctx); });

    setTimeout(function () {
      try {
        fullNetwork.fit({ animation: false });
        var s = fullNetwork.getScale();
        fullNetwork.moveTo({ scale: s * 1.05, animation: false });
      } catch (e) {}
      // Start orbital animation once layout is set
      startOrbit(fullNetwork, g.regions || []);
    }, 80);
    setupFullClickHandlers(container, data);
  }

  // --- INSANE: all 3,886 RICs in bordered regions ---
  function renderInsane(container) {
    var g = global.Catalog.getGraph('insane');
    if (!g) return;

    var visNodes = (g.nodes || []).map(function (n) {
      var opts = Object.assign({ id: n.id }, insaneNodeOpts(n));
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        opts.x = n.x;
        opts.y = n.y;
        opts.physics = false;
      }
      return opts;
    });
    var visEdges = (g.edges || []).map(function (e, idx) {
      // Hand edges only — auto edges are 12,000+ which would be a hairball
      if (e.confidence !== 'hand') return null;
      return Object.assign({ id: 'ie' + idx, from: e.source, to: e.target }, edgeOpts(e, { compact: true }));
    }).filter(Boolean);

    if (fullNetwork) fullNetwork.destroy();
    container.innerHTML = '';

    var data = { nodes: new global.vis.DataSet(visNodes), edges: new global.vis.DataSet(visEdges) };
    var opts = baseOptions(0, { gravity: 0, springLength: 0 });
    opts.physics = { enabled: false };
    opts.layout = { improvedLayout: false, randomSeed: 42 };
    opts.edges = {
      smooth: { enabled: true, type: 'continuous', roundness: 0.18 },
    };

    fullNetwork = new global.vis.Network(container, data, opts);

    var drawer = buildRegionDrawer(g, fullNetwork, { padding: 80, labelOffset: 32, labelSize: 24 });
    fullNetwork.on('beforeDrawing', function (ctx) { drawer(ctx); });

    setTimeout(function () {
      try { fullNetwork.fit({ animation: false }); } catch (e) {}
      startOrbit(fullNetwork, g.regions || []);
    }, 80);
    setupFullClickHandlers(container, data);
  }

  // --- FULL graph: cluster overview ---
  function renderFullClusterView(container) {
    var g = global.Catalog.getGraph('full');
    if (!g) return;
    fullState.view = 'cluster';
    fullState.expandedCluster = null;

    var clusters = g.clusters || [];
    var clusterNodes = clusters.map(function (c) {
      return {
        id: 'cluster:' + c.id,
        label: c.name + '\n(' + c.ric_count + ')',
        title: c.name + ' — ' + c.ric_count + ' RICs',
        color: { background: c.color, border: '#ffffff', highlight: { background: c.color, border: ACCENT } },
        font: { color: '#ffffff', size: 12, face: 'Segoe UI, sans-serif', strokeWidth: 0 },
        borderWidth: 1.5,
        shape: 'dot',
        size: Math.max(16, Math.min(48, Math.sqrt(c.ric_count) * 3.2)),
      };
    });
    var aggregated = global.Catalog.getClusterEdges('full');
    var visEdges = aggregated
      .filter(function (e) { return e.has_hand || e.count >= 5; })
      .map(function (e, idx) {
        return {
          id: 'fce' + idx,
          from: 'cluster:' + e.source,
          to: 'cluster:' + e.target,
          width: e.has_hand ? 1.8 : 0.8,
          color: { color: e.has_hand ? hexA('#cbd5e1', 0.85) : hexA('#94a3b8', 0.30), highlight: ACCENT },
          arrows: (e.type === 'drives' || e.type === 'leads') ? { to: { enabled: true, scaleFactor: 0.45 } } : undefined,
          smooth: { enabled: true, type: 'continuous', roundness: 0.18 },
          dashes: e.type === 'related' ? [4, 4] : false,
          title: e.count + ' edges · ' + e.type + (e.has_hand ? ' (incl. hand-authored)' : ''),
        };
      });

    if (fullNetwork) fullNetwork.destroy();
    container.innerHTML = '';
    var data = { nodes: new global.vis.DataSet(clusterNodes), edges: new global.vis.DataSet(visEdges) };
    var opts = baseOptions(300, { gravity: -90, springLength: 230 });
    fullNetwork = new global.vis.Network(container, data, opts);
    freezeAfterStabilization(fullNetwork, 1.6);
    fullSnapshot = null;
    fullNetwork.on('click', function (params) {
      // Cluster overview: clicking a cluster drills in (no popup needed)
      if (!params.nodes || !params.nodes.length) {
        emit(container, 'mapBackgroundClick', {});
        return;
      }
      var clicked = params.nodes[0];
      if (clicked.indexOf('cluster:') === 0) {
        renderFullExpanded(container, clicked.slice('cluster:'.length));
      }
    });
  }

  // --- FULL graph: drill into one cluster ---
  function renderFullExpanded(container, clusterId) {
    var bundle = global.Catalog.getCluster(clusterId, 'full');
    if (!bundle) return;
    fullState.view = 'expanded';
    fullState.expandedCluster = clusterId;

    var members = bundle.members;
    var memberSet = new Set(members.map(function (m) { return m.id; }));
    var keepNodes = {};
    members.forEach(function (m) { keepNodes[m.id] = m; });

    var keepEdges = [];
    var g = global.Catalog.getGraph('full');
    (g.edges || []).forEach(function (e) {
      var srcInside = memberSet.has(e.source);
      var tgtInside = memberSet.has(e.target);
      if (srcInside && tgtInside) {
        keepEdges.push(e);
      } else if ((srcInside || tgtInside) && e.confidence === 'hand') {
        var other = srcInside ? e.target : e.source;
        var otherNode = global.Catalog.getNode(other, 'full');
        if (otherNode) {
          keepNodes[other] = otherNode;
          keepEdges.push(e);
        }
      }
    });

    var visNodes = Object.keys(keepNodes).map(function (id) {
      var n = keepNodes[id];
      return Object.assign({ id: id }, fullNodeOpts(n, n.is_anchor));
    });
    var visEdges = keepEdges.map(function (e, idx) {
      return Object.assign({ id: 'xe' + idx, from: e.source, to: e.target }, edgeOpts(e, { compact: false }));
    });

    if (fullNetwork) fullNetwork.destroy();
    container.innerHTML = '';
    var data = { nodes: new global.vis.DataSet(visNodes), edges: new global.vis.DataSet(visEdges) };
    var opts = baseOptions(300, { gravity: -60, springLength: 150 });
    fullNetwork = new global.vis.Network(container, data, opts);
    freezeAfterStabilization(fullNetwork, 1.6);
    setupFullClickHandlers(container, data);
  }

  // ============================================================
  //  CLICK HANDLERS — popup + neighbor focus (fullscreen only)
  // ============================================================
  function setupFullClickHandlers(container, data) {
    fullSnapshot = {
      nodes: data.nodes,
      edges: data.edges,
      originalNodes: {},
      originalEdges: {},
      focusedNode: null,
    };
    // Take a clean snapshot of the original styling so we can restore on de-focus
    data.nodes.forEach(function (n) { fullSnapshot.originalNodes[n.id] = JSON.parse(JSON.stringify(n)); });
    data.edges.forEach(function (e) { fullSnapshot.originalEdges[e.id] = JSON.parse(JSON.stringify(e)); });

    fullNetwork.on('click', function (params) {
      if (params.nodes && params.nodes.length) {
        var clicked = params.nodes[0];
        if (clicked.indexOf('cluster:') === 0) return; // cluster overview handles its own clicks
        focusNode(clicked, container);
        emitNodeSelected(container, clicked);
      } else {
        // Click on empty space — clear focus and dismiss popup
        clearFocus();
        emit(container, 'mapBackgroundClick', {});
      }
    });
  }

  function emitNodeSelected(container, ric) {
    if (!fullNetwork) { emit(container, 'loadRic', { ric: ric }); return; }
    // Compute screen position for the popup
    var canvasPos = fullNetwork.getPositions([ric])[ric];
    if (!canvasPos) { emit(container, 'loadRic', { ric: ric }); return; }
    var domPos = fullNetwork.canvasToDOM(canvasPos);
    emit(container, 'nodeSelected', {
      ric: ric,
      x: domPos.x,
      y: domPos.y,
    });
  }

  function focusNode(ric, container) {
    if (!fullSnapshot) return;
    var connected = new Set([ric]);
    (fullSnapshot.edges.get() || []).forEach(function (e) {
      if (e.from === ric) connected.add(e.to);
      if (e.to === ric) connected.add(e.from);
    });

    // Update node colors: focused node = bright, neighbors = full color, others = faded
    var updates = [];
    fullSnapshot.nodes.forEach(function (n) {
      var orig = fullSnapshot.originalNodes[n.id];
      if (!orig) return;
      var inFocus = connected.has(n.id);
      var isFocused = n.id === ric;
      if (inFocus) {
        // Restore original styling, slightly emphasized for focused node
        updates.push(Object.assign({}, orig, isFocused ? {
          borderWidth: 3,
          color: Object.assign({}, orig.color, { border: '#ffffff' }),
        } : {}));
      } else {
        // Fade out
        var faded = Object.assign({}, orig);
        faded.color = {
          background: 'rgba(60,65,75,0.18)',
          border: 'rgba(80,85,95,0.35)',
          highlight: faded.color && faded.color.highlight,
          hover: faded.color && faded.color.hover,
        };
        faded.font = Object.assign({}, orig.font || {}, { color: 'rgba(155,160,170,0.32)' });
        faded.borderWidth = 1;
        updates.push(faded);
      }
    });
    fullSnapshot.nodes.update(updates);

    // Update edges: connected edges full opacity, others faded
    var edgeUpdates = [];
    (fullSnapshot.edges.get() || []).forEach(function (e) {
      var origE = fullSnapshot.originalEdges[e.id];
      if (!origE) return;
      var touchesFocus = e.from === ric || e.to === ric;
      if (touchesFocus) {
        // Brighten the connection
        var bright = Object.assign({}, origE);
        bright.width = (origE.width || 1) * 1.6;
        bright.color = Object.assign({}, origE.color || {}, { color: '#ffffff', opacity: 1 });
        edgeUpdates.push(bright);
      } else {
        var faded = Object.assign({}, origE);
        faded.color = { color: 'rgba(80,85,95,0.12)', opacity: 1 };
        faded.label = '';   // hide lag labels on faded edges
        edgeUpdates.push(faded);
      }
    });
    fullSnapshot.edges.update(edgeUpdates);

    fullSnapshot.focusedNode = ric;

    // Show focus hint
    var hint = document.getElementById('mapFocusHint');
    if (hint) hint.style.display = '';
  }

  function clearFocus() {
    if (!fullSnapshot) return;
    // Restore everything to its original styling
    var nodeRestore = Object.keys(fullSnapshot.originalNodes).map(function (id) {
      return fullSnapshot.originalNodes[id];
    });
    var edgeRestore = Object.keys(fullSnapshot.originalEdges).map(function (id) {
      return fullSnapshot.originalEdges[id];
    });
    fullSnapshot.nodes.update(nodeRestore);
    fullSnapshot.edges.update(edgeRestore);
    fullSnapshot.focusedNode = null;
    var hint = document.getElementById('mapFocusHint');
    if (hint) hint.style.display = 'none';
  }

  // ============================================================
  //  FORECAST ERROR overlay — tints forecast nodes by their MAPE
  // ============================================================
  // Color ramp: small error → green, medium → yellow, large → red.
  function errorColor(pct) {
    if (pct == null) return '#94a3b8';
    if (pct < 5)   return '#22c55e';
    if (pct < 15)  return '#a3e635';
    if (pct < 30)  return '#eab308';
    if (pct < 60)  return '#fb923c';
    return '#ef4444';
  }

  function applyForecastErrors(errors) {
    if (!fullSnapshot) return;
    var updates = [];
    fullSnapshot.nodes.forEach(function (n) {
      var orig = fullSnapshot.originalNodes[n.id];
      if (!orig) return;
      var err = errors[n.id];
      if (err && err.error_pct != null) {
        var c = errorColor(err.error_pct);
        var labelExtra = '\nMAPE: ' + err.error_pct.toFixed(1) + '% (n=' + err.n + ')';
        updates.push(Object.assign({}, orig, {
          color: { background: c, border: '#ffffff', highlight: { background: c, border: '#ffffff' }, hover: { background: c, border: '#ffffff' } },
          borderWidth: 2.5,
          title: (orig.title || n.id) + labelExtra,
        }));
      } else {
        // Unrelated nodes: dim
        var faded = Object.assign({}, orig);
        faded.color = {
          background: 'rgba(60,65,75,0.18)',
          border: 'rgba(80,85,95,0.30)',
        };
        faded.font = Object.assign({}, orig.font || {}, { color: 'rgba(155,160,170,0.30)' });
        faded.borderWidth = 1;
        updates.push(faded);
      }
    });
    fullSnapshot.nodes.update(updates);
  }

  // ============================================================
  //  PATH HIGHLIGHT — used by the "Trace path" feature
  // ============================================================
  function highlightPath(pathNodes, pathEdges) {
    if (!fullSnapshot || !pathNodes || pathNodes.length < 2) return;
    var nodeSet = new Set(pathNodes);
    var edgeIds = new Set();
    pathEdges.forEach(function (e) {
      // Find the matching edge in the dataset by source/target/type
      fullSnapshot.edges.forEach(function (live) {
        if (live.from === e.source && live.to === e.target) {
          edgeIds.add(live.id);
        }
      });
    });

    var nodeUpdates = [];
    fullSnapshot.nodes.forEach(function (n) {
      var orig = fullSnapshot.originalNodes[n.id];
      if (!orig) return;
      var inPath = nodeSet.has(n.id);
      if (inPath) {
        // Brighter version of original
        nodeUpdates.push(Object.assign({}, orig, {
          borderWidth: 3,
          color: Object.assign({}, orig.color, { border: '#ffffff' }),
        }));
      } else {
        var faded = Object.assign({}, orig);
        faded.color = {
          background: 'rgba(60,65,75,0.12)',
          border: 'rgba(80,85,95,0.20)',
        };
        faded.font = Object.assign({}, orig.font || {}, { color: 'rgba(155,160,170,0.20)' });
        faded.borderWidth = 1;
        nodeUpdates.push(faded);
      }
    });
    fullSnapshot.nodes.update(nodeUpdates);

    var edgeUpdates = [];
    fullSnapshot.edges.forEach(function (e) {
      var origE = fullSnapshot.originalEdges[e.id];
      if (!origE) return;
      if (edgeIds.has(e.id)) {
        var bright = Object.assign({}, origE);
        bright.width = (origE.width || 1) * 2.2;
        bright.color = { color: ACCENT, opacity: 1 };
        edgeUpdates.push(bright);
      } else {
        var faded = Object.assign({}, origE);
        faded.color = { color: 'rgba(80,85,95,0.08)', opacity: 1 };
        faded.label = '';
        edgeUpdates.push(faded);
      }
    });
    fullSnapshot.edges.update(edgeUpdates);

    fullSnapshot.focusedNode = pathNodes[0];   // marks "non-default" state for clearFocus()
  }

  // ============================================================
  //  Public API
  // ============================================================

  function ready(container) {
    if (!global.vis || !global.vis.Network) {
      if (container) container.innerHTML = '<div class="map-placeholder">vis-network not loaded</div>';
      return false;
    }
    if (!global.Catalog || !global.Catalog.getGraph('condensed')) {
      if (container) container.innerHTML = '<div class="map-placeholder">graph not loaded yet</div>';
      return false;
    }
    return true;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // External zoom controls call this
  function zoom(delta) {
    if (!fullNetwork) return;
    var s = fullNetwork.getScale();
    fullNetwork.moveTo({ scale: s * (delta > 0 ? 1.25 : 0.8), animation: { duration: 200, easingFunction: 'easeInOutQuad' } });
  }
  function fitView() {
    if (!fullNetwork) return;
    fullNetwork.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
  }

  // Re-render the current map view in place. Used when polls toggle changes
  // (so polls nodes can appear/disappear without forcing a full reload).
  function refresh() {
    var fullEl = document.getElementById('mapFull');
    if (!fullEl) return;
    var mode = fullState.mode || 'full';
    renderFullscreen(fullEl, mode);
  }

  global.MacroMap = {
    renderMini: renderMini,
    renderFullscreen: renderFullscreen,
    renderFullClusters: function (container) { fullState.mode = 'full'; renderFullClusterView(container); },
    backToClusters: function (container) { renderFullClusterView(container); },
    setMode: function (container, mode) { renderFullscreen(container, mode); },
    refresh: refresh,
    currentMode: function () { return fullState.mode; },
    currentView: function () { return fullState.view; },
    expandedCluster: function () { return fullState.expandedCluster; },
    zoomIn: function () { zoom(1); },
    zoomOut: function () { zoom(-1); },
    fitView: fitView,
    clearFocus: clearFocus,
    highlightPath: highlightPath,
    applyForecastErrors: applyForecastErrors,
    stopOrbit: stopOrbit,
    isReady: function () { return !!(global.vis && global.Catalog && global.Catalog.getGraph('condensed')); },
  };
})(window);
