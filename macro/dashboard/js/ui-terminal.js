// ui-terminal.js — wires search, category tree, watchlist, metadata panel
// to Catalog (data) and ChartEngine (rendering).

(function (global) {
  'use strict';

  var WATCHLIST_KEY = 'rmt.watchlist.v1';
  var activeRic = null;
  var watchlist = loadWatchlist();
  var searchActiveIdx = -1;
  var searchHits = [];

  function loadWatchlist() {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveWatchlist() {
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist)); } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // ============== SEARCH ==============
  function setupSearch() {
    var input = document.getElementById('globalSearch');
    var box = document.getElementById('searchResults');
    if (!input || !box) return;

    var debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      var q = input.value;
      debounce = setTimeout(function () { runSearch(q); }, 100);
    });
    input.addEventListener('keydown', function (e) {
      if (!searchHits.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); searchActiveIdx = Math.min(searchActiveIdx + 1, searchHits.length - 1); paintSearch(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); searchActiveIdx = Math.max(searchActiveIdx - 1, 0); paintSearch(); }
      else if (e.key === 'Enter' && searchActiveIdx >= 0) {
        e.preventDefault();
        loadRic(searchHits[searchActiveIdx].ric);
        closeSearch();
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
    input.addEventListener('focus', function () { if (input.value) runSearch(input.value); });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) closeSearch();
    });
  }
  var lastSearchQuery = '';

  function runSearch(q) {
    var box = document.getElementById('searchResults');
    if (!q || !q.trim()) { closeSearch(); return; }
    lastSearchQuery = q.trim();
    searchHits = global.Catalog.search(q, 40);
    searchActiveIdx = searchHits.length ? 0 : -1;
    paintSearch();
    box.classList.add('open');
  }

  // Highlight any occurrence of the query tokens (case-insensitive) inside text.
  // Returns HTML-safe string with <mark> wrappers around matches.
  function highlight(text, query) {
    if (!text) return '';
    var safe = escapeHtml(String(text));
    if (!query) return safe;
    var tokens = String(query).trim().split(/\s+/).filter(function (t) { return t.length > 0; });
    if (!tokens.length) return safe;
    // Build a single regex that matches any token, longest-first to avoid stale matches
    tokens.sort(function (a, b) { return b.length - a.length; });
    var escaped = tokens.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    var re = new RegExp('(' + escaped.join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function paintSearch() {
    var box = document.getElementById('searchResults');
    var q = lastSearchQuery;
    var header = '<div class="search-status">' +
      '<span class="search-status-query">Searching: <strong>' + escapeHtml(q) + '</strong></span>' +
      '<span class="search-status-count">' + (searchHits.length ? searchHits.length + ' matches' : 'no matches') + '</span>' +
      '</div>';

    if (!searchHits.length) {
      box.innerHTML = header + '<div class="search-empty">No RICs match <strong>"' + escapeHtml(q) + '"</strong>. Try a different keyword (e.g. CPI, NFP, GDP, BIS, M2).</div>';
      return;
    }

    var FIELD_LABEL = { name: 'name', subcategory: 'subcategory', description: 'description', meaning: 'meaning', how_to_use: 'how to use', slug: 'category' };
    var rowsHtml = searchHits.map(function (h, i) {
      var hitField = FIELD_LABEL[h.hitField] || h.hitField || 'match';
      return '<div class="search-result' + (i === searchActiveIdx ? ' active' : '') + '" data-ric="' + escapeHtml(h.ric) + '">' +
        '<span class="ric">' + highlight(h.ric, q) + '</span>' +
        '<span class="desc">' + highlight(h.description || '', q) +
        ' <span class="search-result-hit">— matched ' + escapeHtml(hitField) + '</span>' +
        '</span>' +
        '<span class="freq">' + escapeHtml(h.frequency || '') + '</span>' +
        '</div>';
    }).join('');

    box.innerHTML = header + rowsHtml;
    box.querySelectorAll('.search-result').forEach(function (el) {
      el.addEventListener('click', function () {
        loadRic(el.dataset.ric);
        closeSearch();
      });
    });
  }
  function closeSearch() {
    var box = document.getElementById('searchResults');
    var input = document.getElementById('globalSearch');
    if (box) box.classList.remove('open');
    searchHits = []; searchActiveIdx = -1;
    if (input) input.value = '';
  }

  // ============== CATEGORY TREE ==============
  function renderCategoryTree() {
    var tree = document.getElementById('catTree');
    var idx = global.Catalog.getIndex();
    if (!tree || !idx) return;

    // Polls toggle is a VIEW SWITCH, not an additive overlay. When polls
    // are visible, only the polls categories show; regular categories hide.
    // When polls are off (default), regular categories show; polls hide.
    var pollsVisible = isPollsVisible();
    var allCats = idx.categories || [];
    var pollCats = allCats.filter(function (c) { return c.section === 'Polls'; });
    var regularCats = allCats.filter(function (c) { return c.section !== 'Polls'; });

    var html = '';
    if (pollsVisible && pollCats.length) {
      // POLLS VIEW: show only polls categories
      html += '<div class="polls-section-header">📊 Reuters Economic Indicator Polls</div>';
      html += pollCats.map(function (c) {
        return '<div class="cat-group poll-section" data-slug="' + escapeHtml(c.slug) + '">' +
          '<div class="cat-header">' +
          '<span class="chev">▸</span>' +
          '<span class="cat-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="count">' + (c.ric_count || 0) + '</span>' +
          '</div>' +
          '<div class="cat-rics"></div>' +
          '</div>';
      }).join('');
    } else {
      // REGULAR VIEW: show only regular categories (polls hidden)
      html += regularCats.map(function (c) {
        return '<div class="cat-group" data-slug="' + escapeHtml(c.slug) + '">' +
          '<div class="cat-header">' +
          '<span class="chev">▸</span>' +
          '<span class="cat-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="count">' + (c.ric_count || 0) + '</span>' +
          '</div>' +
          '<div class="cat-rics"></div>' +
          '</div>';
      }).join('');
    }
    tree.innerHTML = html;
    tree.querySelectorAll('.cat-group').forEach(function (g) {
      g.querySelector('.cat-header').addEventListener('click', function () {
        toggleCategory(g);
      });
    });
    var filter = document.getElementById('catFilter');
    if (filter) {
      filter.addEventListener('input', function () {
        var q = filter.value.trim().toLowerCase();
        tree.querySelectorAll('.cat-group').forEach(function (g) {
          var name = g.querySelector('.cat-name').textContent.toLowerCase();
          g.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        });
      });
    }
  }
  function toggleCategory(group) {
    var slug = group.dataset.slug;
    var rics = group.querySelector('.cat-rics');
    if (group.classList.contains('open')) {
      group.classList.remove('open');
      return;
    }
    group.classList.add('open');
    if (rics.dataset.loaded === '1') return;
    rics.innerHTML = '<div class="ric-item" style="color:#6b7280">Loading…</div>';
    global.Catalog.getCategory(slug).then(function (cat) {
      // Polls categories collapse to one row per indicator (the actual RIC) —
      // clicking a row loads the indicator's full stat bundle as multi-series.
      var isPollsCategory = (cat.section === 'Polls') || /^us_polls_/.test(slug);
      if (isPollsCategory) {
        rics.innerHTML = renderPollsCategory(cat);
        wirePollsCategory(rics, cat);
      } else {
        rics.innerHTML = (cat.rics || []).map(function (r) {
          var starred = watchlist.indexOf(r.ric) !== -1;
          return '<div class="ric-item" data-ric="' + escapeHtml(r.ric) + '">' +
            '<span class="code">' + escapeHtml(r.ric) + '</span>' +
            '<span class="star ' + (starred ? 'on' : '') + '" title="Add to watchlist">' + (starred ? '★' : '☆') + '</span>' +
            '<span class="desc">' + escapeHtml(r.description || '') + '</span>' +
            '</div>';
        }).join('');
        rics.querySelectorAll('.ric-item').forEach(function (it) {
          it.addEventListener('click', function (e) {
            if (e.target.classList.contains('star')) {
              e.stopPropagation();
              toggleWatchlist(it.dataset.ric, e.target);
            } else {
              loadRic(it.dataset.ric);
            }
          });
        });
      }
      rics.dataset.loaded = '1';
    }).catch(function (err) {
      rics.innerHTML = '<div class="ric-item" style="color:#ef4444">' + escapeHtml(err.message) + '</div>';
    });
  }

  // Group a polls category's rics by indicator_group_id; render one item per
  // indicator using the actual ('=ECI') RIC's metadata as the label.
  function renderPollsCategory(cat) {
    var byGroup = {};
    (cat.rics || []).forEach(function (r) {
      var gid = r.indicator_group_id || r.indicator || r.ric;
      if (!byGroup[gid]) byGroup[gid] = { anchor: null, stats: [] };
      byGroup[gid].stats.push(r);
      if (r.stat_role === 'actual') byGroup[gid].anchor = r;
    });
    var html = '';
    Object.keys(byGroup).forEach(function (gid) {
      var g = byGroup[gid];
      var anchor = g.anchor || g.stats[0];
      var indicatorName = (anchor.indicator || (anchor.description || '').split('—')[0].trim()) || anchor.ric;
      var statCount = g.stats.length;
      var starred = watchlist.indexOf(anchor.ric) !== -1;
      html += '<div class="ric-item poll-indicator" data-group="' + escapeHtml(gid) + '" data-anchor="' + escapeHtml(anchor.ric) + '">' +
        '<span class="code">📊</span>' +
        '<span class="star ' + (starred ? 'on' : '') + '" title="Add to watchlist">' + (starred ? '★' : '☆') + '</span>' +
        '<span class="desc">' + escapeHtml(indicatorName) +
        ' <span style="color:#facc15;font-size:9px;letter-spacing:.5px">▸ ' + statCount + ' stats</span></span>' +
        '</div>';
    });
    return html;
  }

  function wirePollsCategory(container, cat) {
    var byGroup = {};
    (cat.rics || []).forEach(function (r) {
      var gid = r.indicator_group_id || r.indicator || r.ric;
      if (!byGroup[gid]) byGroup[gid] = [];
      byGroup[gid].push(r);
    });
    container.querySelectorAll('.ric-item.poll-indicator').forEach(function (it) {
      it.addEventListener('click', function (e) {
        if (e.target.classList.contains('star')) {
          e.stopPropagation();
          toggleWatchlist(it.dataset.anchor, e.target);
          return;
        }
        var gid = it.dataset.group;
        loadIndicatorBundle(byGroup[gid] || []);
      });
    });
  }

  // Load an entire poll indicator bundle as multi-series overlay.
  // Default: shows Actual (bold) + Median + Min/Max range + SmartEcon. Other
  // stats (Mean, Mode, StdDev, # Forecasters, Surprise) are hidden by default
  // but can be added via the search/watchlist if needed.
  function loadIndicatorBundle(rics) {
    if (!rics.length) return;
    // Find the anchor (actual)
    var anchor = rics.find(function (r) { return r.stat_role === 'actual'; }) || rics[0];
    var DEFAULT_STATS = ['actual', 'median', 'min', 'max', 'smart'];
    var COLOR_MAP = {
      actual: '#ff8a00',  // accent orange
      median: '#22c55e',  // green
      mean:   '#3b82f6',  // blue
      mode:   '#a855f7',  // purple
      min:    '#94a3b8',  // grey lighter
      max:    '#94a3b8',  // grey lighter
      smart:  '#ec4899',  // magenta
      stddev: '#eab308',
      forecasters: '#06b6d4',
      surprise: '#f97316',
    };
    var pickable = rics.filter(function (r) { return DEFAULT_STATS.indexOf(r.stat_role) !== -1; });
    if (!pickable.length) pickable = [anchor];

    // Clear existing series first (single-indicator view)
    if (global.ChartEngine && global.ChartEngine.clear) global.ChartEngine.clear();
    activeRic = anchor.ric;

    // Paint header from anchor
    var hRic = document.getElementById('hRic');
    var hDesc = document.getElementById('hDesc');
    var hSub = document.getElementById('hSub');
    if (hRic) hRic.textContent = anchor.indicator_group_id ? '📊 ' + (anchor.indicator || anchor.ric) : anchor.ric;
    if (hDesc) hDesc.textContent = (anchor.indicator || (anchor.description || '').split('—')[0].trim()) + ' — Poll Bundle';
    var bits = [];
    if (anchor.indicator_topic) bits.push('Polls / ' + anchor.indicator_topic);
    if (anchor.frequency) bits.push(anchor.frequency);
    if (anchor.units) bits.push(anchor.units);
    if (hSub) hSub.textContent = bits.join(' · ');

    // Load each pickable stat in order (anchor first for primary color)
    pickable.sort(function (a, b) {
      var order = ['actual', 'median', 'min', 'max', 'smart', 'mean', 'mode'];
      return order.indexOf(a.stat_role) - order.indexOf(b.stat_role);
    });

    var promises = pickable.map(function (r) {
      return global.Catalog.getObservations(r.ric).then(function (obs) {
        global.ChartEngine.add({
          ric: r.ric,
          label: titleForStat(r),
          observations: obs,
          color: COLOR_MAP[r.stat_role] || '#94a3b8',
        });
      });
    });
    Promise.all(promises).then(function () {
      paintMetaPanelForIndicator(anchor, rics);
      global.Catalog.getNeighbors && repaintMiniMap(anchor.ric);
    });
  }

  function titleForStat(r) {
    var role = r.stat_role || '';
    var roleLabel = {
      actual: 'Actual', median: 'Median', mean: 'Mean', mode: 'Mode',
      min: 'Min', max: 'Max', smart: 'SmartEcon', stddev: 'StdDev',
      forecasters: '# Forecasters', surprise: 'Predicted Surprise',
    }[role] || role;
    return (r.indicator || r.ric) + ' — ' + roleLabel;
  }

  function paintMetaPanelForIndicator(anchor, rics) {
    var box = document.getElementById('metaContent');
    if (!box) return;
    var lines = [];
    lines.push('<div class="meta-section"><div class="meta-label">Indicator</div>' +
      '<div class="meta-value">' + escapeHtml(anchor.indicator || anchor.description || anchor.ric) + '</div></div>');
    lines.push('<div class="meta-section"><div class="meta-label">Topic</div>' +
      '<div class="meta-value">' + escapeHtml(anchor.indicator_topic || '—') + '</div></div>');
    lines.push('<div class="meta-section"><div class="meta-label">Units</div>' +
      '<div class="meta-value">' + escapeHtml(anchor.units || '—') + '</div></div>');
    lines.push('<div class="meta-section"><div class="meta-label">Frequency</div>' +
      '<div class="meta-value">' + escapeHtml(anchor.frequency || '—') + '</div></div>');
    if (anchor.meaning) {
      lines.push('<div class="meta-section"><div class="meta-label">Meaning</div>' +
        '<div class="meta-value">' + escapeHtml(anchor.meaning) + '</div></div>');
    }
    if (anchor.how_to_use) {
      lines.push('<div class="meta-section"><div class="meta-label">How to use</div>' +
        '<div class="meta-value">' + escapeHtml(anchor.how_to_use) + '</div></div>');
    }
    // Per-stat list with quick-add toggles
    var statList = rics.map(function (r) {
      var roleLabel = ({actual:'Actual', median:'Median Consensus', mean:'Mean Forecast', mode:'Mode Forecast',
        min:'Min Forecast', max:'Max Forecast', smart:'SmartEconomics Forecast', stddev:'Forecast StdDev',
        forecasters:'Number of Forecasters', surprise:'Predicted Surprise'})[r.stat_role] || r.stat_role;
      var charted = global.ChartEngine && global.ChartEngine.has && global.ChartEngine.has(r.ric);
      return '<div class="poll-stat-row" data-ric="' + escapeHtml(r.ric) + '">' +
        '<span class="poll-stat-tick" style="color:' + (charted ? '#22c55e' : '#52525b') + '">' + (charted ? '●' : '○') + '</span>' +
        '<span class="poll-stat-name">' + escapeHtml(roleLabel) + '</span>' +
        '<span class="poll-stat-ric">' + escapeHtml(r.ric) + '</span>' +
        '</div>';
    }).join('');
    lines.push('<div class="meta-section"><div class="meta-label">Statistics in this bundle</div>' +
      '<div class="meta-value" style="font-family:var(--mono);font-size:10px">' + statList + '</div></div>');
    box.innerHTML = lines.join('');
    box.querySelectorAll('.poll-stat-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var ric = row.dataset.ric;
        if (global.ChartEngine.has(ric)) {
          global.ChartEngine.remove(ric);
          row.querySelector('.poll-stat-tick').textContent = '○';
          row.querySelector('.poll-stat-tick').style.color = '#52525b';
        } else {
          // Find the entry to get its stat_role for color
          var entry = rics.find(function (r) { return r.ric === ric; });
          var COLOR = {actual:'#ff8a00',median:'#22c55e',mean:'#3b82f6',mode:'#a855f7',min:'#94a3b8',max:'#94a3b8',smart:'#ec4899',stddev:'#eab308',forecasters:'#06b6d4',surprise:'#f97316'};
          global.Catalog.getObservations(ric).then(function (obs) {
            global.ChartEngine.add({
              ric: ric, label: titleForStat(entry || {ric: ric, stat_role: ''}),
              observations: obs,
              color: COLOR[entry ? entry.stat_role : ''] || '#94a3b8',
            });
            row.querySelector('.poll-stat-tick').textContent = '●';
            row.querySelector('.poll-stat-tick').style.color = '#22c55e';
          });
        }
      });
    });
  }

  function repaintMiniMap(ric) {
    var miniContainer = document.getElementById('miniMap');
    if (miniContainer && global.MacroMap && global.MacroMap.renderMini) {
      global.MacroMap.renderMini(miniContainer, ric);
    }
  }

  // ============== WATCHLIST ==============
  function toggleWatchlist(ric, starEl) {
    var idx = watchlist.indexOf(ric);
    if (idx === -1) {
      watchlist.push(ric);
      if (starEl) { starEl.classList.add('on'); starEl.textContent = '★'; }
    } else {
      watchlist.splice(idx, 1);
      if (starEl) { starEl.classList.remove('on'); starEl.textContent = '☆'; }
    }
    saveWatchlist();
    renderWatchlist();
  }
  function renderWatchlist() {
    var box = document.getElementById('watchlistItems');
    var empty = document.getElementById('watchlistEmpty');
    if (!box || !empty) return;
    if (!watchlist.length) {
      box.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    var idx = global.Catalog.getIndex();
    var rics = (idx && idx.rics) || {};
    box.innerHTML = watchlist.map(function (ric) {
      var meta = rics[ric] || {};
      return '<div class="ric-item" data-ric="' + escapeHtml(ric) + '">' +
        '<span class="code">' + escapeHtml(ric) + '</span>' +
        '<span class="star on" title="Remove">★</span>' +
        '<span class="desc">' + escapeHtml(meta.description || '(unknown)') + '</span>' +
        '</div>';
    }).join('');
    box.querySelectorAll('.ric-item').forEach(function (it) {
      it.addEventListener('click', function (e) {
        if (e.target.classList.contains('star')) {
          e.stopPropagation();
          toggleWatchlist(it.dataset.ric);
        } else {
          loadRic(it.dataset.ric);
        }
      });
    });
  }

  // ============== TABS ==============
  function setupTabs() {
    document.querySelectorAll('.sidebar-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.sidebar-tab').forEach(function (x) { x.classList.toggle('active', x === t); });
        var pane = t.dataset.pane;
        document.getElementById('paneCategories').classList.toggle('hidden', pane !== 'categories');
        document.getElementById('paneWatchlist').classList.toggle('hidden', pane !== 'watchlist');
        if (pane === 'watchlist') renderWatchlist();
      });
    });
  }

  // ============== CHART CONTROLS ==============
  function setupChartControls() {
    // Chart-type toggles (Line/Area/Bar) — scoped to [data-type] so the export
    // and clear buttons (no data-type attribute) don't get caught up in the
    // active-state logic.
    document.querySelectorAll('.chart-actions .chart-btn[data-type]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.chart-actions .chart-btn[data-type]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        global.ChartEngine.setType(b.dataset.type);
      });
    });
    document.querySelectorAll('.range-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.range-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        global.ChartEngine.setRange(b.dataset.range);
      });
    });

    // Transform segmented control — one active mode applied to every series.
    document.querySelectorAll('#xformBtns .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#xformBtns .seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        global.ChartEngine.setTransform(b.dataset.xform);
        announceTransform();
      });
    });
    // Smoothing segmented control.
    document.querySelectorAll('#smoothBtns .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#smoothBtns .seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        global.ChartEngine.setSmoothing(b.dataset.smooth);
        announceTransform();
      });
    });

    var clearBtn = document.getElementById('clearAllBtn');
    var csvBtn = document.getElementById('exportCsvBtn');
    var pngBtn = document.getElementById('exportPngBtn');

    if (clearBtn) clearBtn.addEventListener('click', clearAllSeries);
    if (csvBtn) csvBtn.addEventListener('click', downloadCsv);
    if (pngBtn) pngBtn.addEventListener('click', downloadPng);

    // Sync the enabled-state on chart changes — observe the legend element
    // (it's hidden when zero series, shown when ≥1) and update buttons.
    var legend = document.getElementById('legend');
    if (legend && window.MutationObserver) {
      var refreshExportBtns = function () {
        var hasSeries = global.ChartEngine.list().length > 0;
        if (clearBtn) clearBtn.disabled = !hasSeries;
        if (csvBtn) csvBtn.disabled = !hasSeries;
        if (pngBtn) pngBtn.disabled = !hasSeries;
      };
      new MutationObserver(refreshExportBtns).observe(legend, { childList: true, attributes: true, attributeFilter: ['style'] });
      // Initial sync
      refreshExportBtns();
    }
  }

  function clearAllSeries() {
    if (!global.ChartEngine.list().length) return;
    global.ChartEngine.clear();
    activeRic = null;
    // Reset header to default placeholder state
    var ricEl = document.getElementById('hRic');
    var descEl = document.getElementById('hDesc');
    var subEl = document.getElementById('hSub');
    if (ricEl) ricEl.textContent = '—';
    if (descEl) descEl.textContent = 'Select a series to begin';
    if (subEl) subEl.textContent = '';
    // Reset metadata panel and mini-graph to empty state
    var meta = document.getElementById('metaContent');
    if (meta) {
      meta.innerHTML = '<div class="meta-empty">Series metadata and skill notes appear here.<br><br>Click a RIC to load.</div>';
    }
    var status = document.getElementById('chartStatus');
    if (status) status.textContent = 'Ready';
  }

  function triggerDownload(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadCsv() {
    var out = global.ChartEngine.exportCsv();
    if (!out) return;
    triggerDownload(out.filename, out.content, out.mime);
    var status = document.getElementById('chartStatus');
    if (status) {
      var prev = status.textContent;
      status.textContent = 'Downloaded ' + out.filename;
      setTimeout(function () { status.textContent = prev || 'Ready'; }, 2500);
    }
  }

  function downloadPng() {
    var out = global.ChartEngine.exportPng();
    if (!out) return;
    var a = document.createElement('a');
    a.href = out.dataUrl;
    a.download = out.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    var status = document.getElementById('chartStatus');
    if (status) {
      var prev = status.textContent;
      status.textContent = 'Downloaded ' + out.filename;
      setTimeout(function () { status.textContent = prev || 'Ready'; }, 2500);
    }
  }

  // Brief status hint describing the active transform + smoothing, so the
  // change is legible even before the user reads the axis title.
  function announceTransform() {
    var status = document.getElementById('chartStatus');
    if (!status || !global.ChartEngine) return;
    var XF = { level: 'Level', yoy: 'YoY %', qoq: 'QoQ %', mom: 'Period %', diff: 'Δ change', index: 'Index = 100', zscore: 'Z-score' };
    var t = global.ChartEngine.getTransform ? global.ChartEngine.getTransform() : 'level';
    var s = global.ChartEngine.getSmoothing ? global.ChartEngine.getSmoothing() : 0;
    var msg = 'Transform: ' + (XF[t] || t) + (s ? ' · ' + s + '-period MA' : '');
    status.textContent = msg;
    clearTimeout(announceTransform._t);
    announceTransform._t = setTimeout(function () {
      if (status.textContent === msg) status.textContent = 'Ready';
    }, 2600);
  }

  // ============== LOAD A RIC ==============
  // opts.replace = true → clear chart first (single-series view)
  // opts.replace = false (default) → append to existing chart (multi-series overlay)
  function loadRic(ric, opts) {
    opts = opts || {};
    var statusEl = document.getElementById('chartStatus');
    if (statusEl) statusEl.textContent = 'Loading ' + ric + '…';
    activeRic = ric;
    Promise.all([
      global.Catalog.getRicMeta(ric),
      global.Catalog.getObservations(ric)
    ]).then(function (results) {
      var meta = results[0] || { ric: ric, description: '(no metadata)' };
      var obs = results[1] || [];
      paintMetaPanel(meta, obs);
      paintHeader(meta);
      if (opts.replace) global.ChartEngine.clear();
      global.ChartEngine.add({
        ric: ric,
        label: meta.description || ric,
        observations: obs
      });
      // mark active in tree
      document.querySelectorAll('.ric-item').forEach(function (it) {
        it.classList.toggle('active', it.dataset.ric === ric);
      });
      // Render mini-map after the panel HTML is laid out
      var miniContainer = document.getElementById('miniMap');
      if (miniContainer && global.MacroMap && global.MacroMap.isReady()) {
        global.MacroMap.renderMini(miniContainer, ric);
        // The container fires 'loadRic' on neighbor click. Mini-graph clicks REPLACE
        // the chart (single-focus exploration mode), unlike search/sidebar which append.
        miniContainer.addEventListener('loadRic', function (ev) {
          if (ev.detail && ev.detail.ric) loadRic(ev.detail.ric, { replace: true });
        });
      }
      if (statusEl) statusEl.textContent = obs.length + ' observations';
    }).catch(function (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = 'Error: ' + err.message;
    });
  }

  function paintHeader(meta) {
    var ric = document.getElementById('hRic');
    var desc = document.getElementById('hDesc');
    var sub = document.getElementById('hSub');
    if (ric) ric.textContent = meta.ric || '—';
    if (desc) desc.textContent = meta.description || '—';
    var bits = [];
    if (meta.category) bits.push(meta.category);
    if (meta.frequency) bits.push(meta.frequency);
    if (meta.units) bits.push(meta.units);
    if (sub) sub.textContent = bits.join(' · ');
  }

  function paintMetaPanel(meta, obs) {
    var box = document.getElementById('metaContent');
    if (!box) return;
    var first = obs.length ? obs[0] : null;
    var last = obs.length ? obs[obs.length - 1] : null;
    var html = '';

    html += '<div class="meta-section">' +
      '<div class="meta-label">RIC</div>' +
      '<div class="meta-value mono">' + escapeHtml(meta.ric) + '</div>' +
      '</div>';

    html += '<div class="meta-section">' +
      '<div class="meta-label">Description</div>' +
      '<div class="meta-value">' + escapeHtml(meta.description || '—') + '</div>' +
      '</div>';

    html += '<div class="meta-section">' +
      '<div class="meta-grid">' +
      '<div><div class="meta-label">Frequency</div><div class="meta-value mono">' + escapeHtml(meta.frequency || '—') + '</div></div>' +
      '<div><div class="meta-label">Units</div><div class="meta-value mono">' + escapeHtml(meta.units || '—') + '</div></div>' +
      '<div><div class="meta-label">Observations</div><div class="meta-value mono">' + obs.length.toLocaleString() + '</div></div>' +
      '<div><div class="meta-label">Last value</div><div class="meta-value mono">' + (last && last.value != null ? Number(last.value).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—') + '</div></div>' +
      '<div><div class="meta-label">First obs</div><div class="meta-value mono">' + (first ? first.date.toISOString().slice(0, 10) : '—') + '</div></div>' +
      '<div><div class="meta-label">Last obs</div><div class="meta-value mono">' + (last ? last.date.toISOString().slice(0, 10) : '—') + '</div></div>' +
      '</div></div>';

    if (meta.category) {
      html += '<div class="meta-section">' +
        '<div class="meta-label">Category</div>' +
        '<div class="meta-value dim">' + escapeHtml(meta.category) + (meta.subcategory ? ' › ' + escapeHtml(meta.subcategory) : '') + '</div>' +
        '</div>';
    }

    // Mini-map slot — populated after the panel renders
    html += '<div class="meta-section meta-map-section">' +
      '<h3>Connections</h3>' +
      '<div id="miniMap" class="mini-map"></div>' +
      '<div class="meta-map-hint">Click a node to chart it</div>' +
      '</div>';

    html += '<div class="meta-section">' +
      '<h3>Meaning</h3>' +
      (meta.meaning ? '<p>' + escapeHtml(meta.meaning) + '</p>' : '<p class="empty">Not yet documented.</p>') +
      '</div>';

    html += '<div class="meta-section">' +
      '<h3>How to use</h3>' +
      (meta.how_to_use ? '<p>' + escapeHtml(meta.how_to_use) + '</p>' : '<p class="empty">Not yet documented.</p>') +
      '</div>';

    if (Array.isArray(meta.related_series) && meta.related_series.length) {
      html += '<div class="meta-section">' +
        '<h3>Related series</h3>' +
        '<div class="related">' +
        meta.related_series.map(function (r) { return '<a data-ric="' + escapeHtml(r) + '">' + escapeHtml(r) + '</a>'; }).join('') +
        '</div>' +
        '</div>';
    }

    if (meta.notes) {
      html += '<div class="meta-section"><h3>Notes</h3><p>' + escapeHtml(meta.notes) + '</p></div>';
    }

    box.innerHTML = html;
    box.querySelectorAll('.related a').forEach(function (a) {
      a.addEventListener('click', function () { loadRic(a.dataset.ric); });
    });
  }

  // ============== MAP OVERLAY ==============
  function setupMap() {
    var btn = document.getElementById('mapToggle');
    var overlay = document.getElementById('mapOverlay');
    var closeBtn = document.getElementById('mapClose');
    var backBtn = document.getElementById('mapBack');
    var fullEl = document.getElementById('mapFull');
    var modeCondensed = document.getElementById('mapModeCondensed');
    var modeFull = document.getElementById('mapModeFull');
    var modeInsane = document.getElementById('mapModeInsane');
    var hint = document.getElementById('mapHint');
    var zoomInBtn = document.getElementById('mapZoomIn');
    var zoomOutBtn = document.getElementById('mapZoomOut');
    var zoomFitBtn = document.getElementById('mapZoomFit');
    var popup = document.getElementById('mapNodePopup');
    var popupRic = document.getElementById('mapNodePopupRic');
    var popupLabel = document.getElementById('mapNodePopupLabel');
    var popupMeta = document.getElementById('mapNodePopupMeta');
    var popupGo = document.getElementById('mapNodePopupGo');
    var popupTrace = document.getElementById('mapNodePopupTrace');
    var popupDismiss = document.getElementById('mapNodePopupDismiss');
    var traceBanner = document.getElementById('mapTraceBanner');
    var traceContent = document.getElementById('mapTraceContent');
    var traceCancel = document.getElementById('mapTraceCancel');
    var forecastBtn = document.getElementById('mapToolForecast');
    if (!btn || !overlay || !fullEl) return;

    var pendingPopupRic = null;
    var pathSourceRic = null;       // when set, next node click is the destination

    function ricLabelFor(ric) {
      var node = global.Catalog.getNode(ric, currentMode) || global.Catalog.getNode(ric);
      return (node && node.label && node.label !== ric) ? node.label : ric;
    }
    function showTraceBanner(html) {
      if (!traceBanner) return;
      traceContent.innerHTML = html;
      traceBanner.classList.remove('hidden');
    }
    function hideTraceBanner() {
      if (traceBanner) traceBanner.classList.add('hidden');
    }
    function exitPathMode() {
      pathSourceRic = null;
      hideTraceBanner();
      if (global.MacroMap) global.MacroMap.clearFocus();
    }

    function hidePopup() {
      if (popup) popup.classList.add('hidden');
      pendingPopupRic = null;
    }

    function showPopup(ric, x, y) {
      if (!popup) return;
      // Look up display label + cluster info from condensed first, fall back to full graph
      var node = global.Catalog.getNode(ric, 'condensed') || global.Catalog.getNode(ric, 'full');
      var meta = global.Catalog.getIndex()?.rics?.[ric] || {};
      var displayLabel = (node && node.label && node.label !== ric) ? node.label : (meta.description || ric);
      if (popupRic) popupRic.textContent = ric;
      if (popupLabel) popupLabel.textContent = displayLabel;
      if (popupMeta) {
        var bits = [];
        if (node && node.cluster) bits.push(node.cluster.replace(/_/g, ' '));
        if (meta.frequency) bits.push(meta.frequency);
        if (meta.units) bits.push(meta.units);
        popupMeta.textContent = bits.join(' · ');
      }
      // Position: clamp inside the body wrap so it never overflows
      var wrap = fullEl.parentElement;
      var wrapRect = wrap.getBoundingClientRect();
      var px = Math.max(120, Math.min(x, wrapRect.width - 120));
      var py = Math.max(140, y);
      popup.style.left = px + 'px';
      popup.style.top = py + 'px';
      popup.classList.remove('hidden');
      pendingPopupRic = ric;
    }

    var currentMode = 'condensed';

    function setModeButton(mode) {
      currentMode = mode;
      if (modeCondensed) modeCondensed.classList.toggle('active', mode === 'condensed');
      if (modeFull) modeFull.classList.toggle('active', mode === 'full');
      if (modeInsane) modeInsane.classList.toggle('active', mode === 'insane');
      if (hint) {
        if (mode === 'condensed') {
          hint.textContent = '~160 investor series · grouped by region · click any node to chart it';
        } else if (mode === 'full') {
          hint.textContent = '3,886 series · click a cluster to drill in · right-click to go back';
        } else {
          hint.textContent = 'INSANE: all 3,886 series in bordered regions · pan & zoom to explore';
        }
      }
      if (backBtn) backBtn.style.display = 'none';
    }

    function openMap(mode) {
      if (!global.MacroMap || !global.MacroMap.isReady()) return;
      overlay.classList.remove('hidden');
      setModeButton(mode || currentMode);
      global.MacroMap.renderFullscreen(fullEl, currentMode);
    }
    function closeMap() {
      hidePopup();
      if (global.MacroMap) {
        global.MacroMap.clearFocus();
        global.MacroMap.stopOrbit();
      }
      overlay.classList.add('hidden');
    }

    btn.addEventListener('click', function () { openMap(currentMode); });
    closeBtn.addEventListener('click', closeMap);

    if (modeCondensed) modeCondensed.addEventListener('click', function () {
      if (currentMode === 'condensed') return;
      setModeButton('condensed');
      global.MacroMap.renderFullscreen(fullEl, 'condensed');
    });
    if (modeFull) modeFull.addEventListener('click', function () {
      if (currentMode === 'full') return;
      setModeButton('full');
      global.MacroMap.renderFullscreen(fullEl, 'full');
    });
    if (modeInsane) modeInsane.addEventListener('click', function () {
      if (currentMode === 'insane') return;
      setModeButton('insane');
      global.MacroMap.renderFullscreen(fullEl, 'insane');
    });

    if (backBtn) backBtn.addEventListener('click', function () {
      backBtn.style.display = 'none';
      global.MacroMap.backToClusters(fullEl);
    });

    if (zoomInBtn) zoomInBtn.addEventListener('click', function () { global.MacroMap.zoomIn(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { global.MacroMap.zoomOut(); });
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', function () { global.MacroMap.fitView(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // Priority: path-trace mode → popup → overlay
        if (pathSourceRic || (traceBanner && !traceBanner.classList.contains('hidden'))) {
          exitPathMode();
        } else if (popup && !popup.classList.contains('hidden')) {
          hidePopup();
          if (global.MacroMap) global.MacroMap.clearFocus();
        } else if (!overlay.classList.contains('hidden')) {
          closeMap();
        }
      }
    });

    // Node-clicked popup flow
    fullEl.addEventListener('nodeSelected', function (ev) {
      if (!ev.detail || !ev.detail.ric) return;
      var ric = ev.detail.ric;
      // If we're in "choose destination" path mode, this click is the destination
      if (pathSourceRic && pathSourceRic !== ric) {
        var path = global.Catalog.findPath(pathSourceRic, ric, currentMode);
        var srcLabel = ricLabelFor(pathSourceRic);
        var dstLabel = ricLabelFor(ric);
        if (!path) {
          showTraceBanner(
            'No causal path found from <span class="accent">' + escapeHtml(srcLabel) +
            '</span> to <span class="accent">' + escapeHtml(dstLabel) + '</span>'
          );
        } else {
          global.MacroMap.highlightPath(path.nodes, path.edges);
          var lagText = '';
          if (path.lag && path.lag[1] > 0) {
            var l = path.lag;
            lagText = '<span class="lag">+' + (l[0] === l[1] ? l[0] + 'mo' : l[0] + '–' + l[1] + 'mo') + ' total</span>';
          }
          var hops = path.nodes.map(function (n) { return ricLabelFor(n); }).join(' → ');
          showTraceBanner(
            '<span class="accent">' + escapeHtml(srcLabel) + '</span> → ... → <span class="accent">' +
            escapeHtml(dstLabel) + '</span>: ' + (path.edges.length) + ' hop' + (path.edges.length === 1 ? '' : 's') +
            lagText + '<br><span style="opacity:.7;font-size:10px">' + escapeHtml(hops) + '</span>'
          );
        }
        pathSourceRic = null;
        hidePopup();
        return;
      }
      // Default: show node popup
      showPopup(ric, ev.detail.x, ev.detail.y);
    });
    // Click on empty canvas → dismiss popup + clear focus + cancel path mode
    fullEl.addEventListener('mapBackgroundClick', function () {
      hidePopup();
      if (pathSourceRic) exitPathMode();
    });

    if (popupGo) popupGo.addEventListener('click', function () {
      var ric = pendingPopupRic;
      hidePopup();
      if (ric) {
        closeMap();
        loadRic(ric, { replace: true });
      }
    });
    if (popupTrace) popupTrace.addEventListener('click', function () {
      var ric = pendingPopupRic;
      hidePopup();
      if (!ric) return;
      pathSourceRic = ric;
      showTraceBanner(
        'Tracing from <span class="accent">' + escapeHtml(ricLabelFor(ric)) +
        '</span> · click any node to set the destination · Esc to cancel'
      );
    });
    if (popupDismiss) popupDismiss.addEventListener('click', function () {
      hidePopup();
      if (global.MacroMap) global.MacroMap.clearFocus();
    });
    if (traceCancel) traceCancel.addEventListener('click', exitPathMode);

    // Forecast-errors toggle
    var forecastActive = false;
    if (forecastBtn) {
      forecastBtn.addEventListener('click', function () {
        if (forecastActive) {
          forecastActive = false;
          forecastBtn.classList.remove('active');
          if (global.MacroMap) global.MacroMap.clearFocus();
          hideTraceBanner();
          return;
        }
        forecastActive = true;
        forecastBtn.classList.add('active');
        showTraceBanner('Computing forecast errors…');
        global.Catalog.getForecastErrors().then(function (errors) {
          var rows = Object.keys(errors).filter(function (k) { return errors[k].error_pct != null; });
          if (!rows.length) {
            showTraceBanner('No forecast/actual pairs have data overlap.');
            return;
          }
          global.MacroMap.applyForecastErrors(errors);
          var summary = rows.map(function (k) {
            var e = errors[k];
            return e.name + ': ' + e.error_pct.toFixed(1) + '%';
          }).join(' · ');
          showTraceBanner(
            '<span class="accent">FORECAST MAPE</span> &nbsp; ' + summary +
            '<br><span style="opacity:.7;font-size:10px">Green: <5% · Yellow: 5-30% · Red: 30%+ &nbsp;&nbsp; click ' +
            '<span class="accent">Forecast Errors</span> again to clear</span>'
          );
        }).catch(function (err) {
          showTraceBanner('Error: ' + err.message);
          forecastActive = false;
          forecastBtn.classList.remove('active');
        });
      });
    }

    // Show back button only when in full-mode + a cluster has been expanded.
    fullEl.addEventListener('click', function () {
      if (currentMode === 'full' && global.MacroMap && global.MacroMap.currentView() === 'expanded') {
        if (backBtn) backBtn.style.display = 'inline-flex';
      }
    });
    // Right-click in full mode: pop back to cluster view (also dismiss popup)
    fullEl.addEventListener('contextmenu', function (e) {
      if (currentMode === 'full' && global.MacroMap && global.MacroMap.currentView() === 'expanded') {
        e.preventDefault();
        hidePopup();
        global.MacroMap.clearFocus();
        global.MacroMap.backToClusters(fullEl);
        if (backBtn) backBtn.style.display = 'none';
      }
    });

    // When the user switches mode, dismiss any open popup + cancel path mode
    if (modeCondensed) modeCondensed.addEventListener('click', function () { hidePopup(); exitPathMode(); });
    if (modeFull) modeFull.addEventListener('click', function () { hidePopup(); exitPathMode(); });
    if (modeInsane) modeInsane.addEventListener('click', function () { hidePopup(); exitPathMode(); });
  }

  // ============== COUNTRY SWITCHER ==============
  function setupCountrySwitcher() {
    var sel = document.getElementById('countrySelect');
    var flag = document.getElementById('countryFlag');
    if (!sel) return;

    function paintCountryControls() {
      var countries = global.Catalog.getCountries();
      var current = global.Catalog.getCountry();
      // Repopulate options
      sel.innerHTML = '';
      countries.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = c.name + ' (' + (c.flag || c.code.toUpperCase()) + ')';
        sel.appendChild(opt);
      });
      sel.value = current;
      sel.disabled = countries.length < 2;
      if (flag) {
        var match = countries.find(function (c) { return c.code === current; });
        flag.textContent = (match && match.flag) ? match.flag : current.toUpperCase();
      }
    }

    function handleSwitch() {
      var target = sel.value;
      if (target === global.Catalog.getCountry()) return;
      // Wipe current view BEFORE switching so the user gets immediate feedback.
      // The 'ready' event handler will redraw the category tree once new data lands.
      if (typeof clearAllSeries === 'function') clearAllSeries();
      hideAllOverlays();

      var status = document.getElementById('chartStatus');
      if (status) status.textContent = 'Switching to ' + target.toUpperCase() + '…';
      sel.disabled = true;
      global.Catalog.setCountry(target).then(function () {
        // setCountry emits 'ready' which triggers renderCategoryTree + paint.
        // Just re-enable the dropdown and update the flag.
        paintCountryControls();
        if (status) status.textContent = 'Ready';
      }).catch(function (err) {
        console.error('country switch failed', err);
        if (status) status.textContent = 'Switch failed: ' + err.message;
        // Roll back the dropdown to the current country
        sel.value = global.Catalog.getCountry();
        sel.disabled = false;
      });
    }

    sel.addEventListener('change', handleSwitch);
    // Repaint whenever Catalog finishes (re)loading
    global.Catalog.on('ready', paintCountryControls);
  }

  // Hide any overlay/popup state that's tied to the previous country's data.
  function hideAllOverlays() {
    var overlay = document.getElementById('mapOverlay');
    if (overlay) overlay.classList.add('hidden');
    var popup = document.getElementById('mapNodePopup');
    if (popup) popup.classList.add('hidden');
    var traceBanner = document.getElementById('mapTraceBanner');
    if (traceBanner) traceBanner.classList.add('hidden');
  }

  // ============== POLLS TOGGLE ==============
  // Polls are hidden from the category tree by default. The "📊 Polls"
  // topbar button toggles their visibility. Only enabled when the active
  // country has polls data (US for now).
  function isPollsVisible() {
    try { return localStorage.getItem('macroterm.pollsVisible') === '1'; }
    catch (e) { return false; }
  }
  function setPollsVisible(v) {
    try { localStorage.setItem('macroterm.pollsVisible', v ? '1' : '0'); } catch (e) {}
  }
  function pollsAvailableForCountry(cc) {
    // Polls categories present? Only US ships polls today.
    var idx = global.Catalog.getIndex();
    if (!idx) return false;
    return (idx.categories || []).some(function (c) { return c.section === 'Polls'; });
  }
  function setupPollsToggle() {
    var btn = document.getElementById('pollsToggle');
    if (!btn) return;
    function paint() {
      var available = pollsAvailableForCountry(global.Catalog.getCountry());
      btn.disabled = !available;
      btn.title = available
        ? 'Toggle Reuters Economic Indicator Polls (forecast surveys, surprise vs actual)'
        : 'Polls are not yet available for ' + (global.Catalog.getCountry() || '').toUpperCase();
      btn.classList.toggle('active', available && isPollsVisible());
    }
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      setPollsVisible(!isPollsVisible());
      btn.classList.toggle('active', isPollsVisible());
      renderCategoryTree();
      // Notify map (if open) so it can repaint with/without polls overlay
      var map = document.getElementById('mapOverlay');
      if (map && !map.classList.contains('hidden') && global.MacroMap && global.MacroMap.refresh) {
        global.MacroMap.refresh();
      }
    });
    global.Catalog.on('ready', paint);
    paint();
  }

  // ============== BOOT ==============
  function boot() {
    setupSearch();
    setupTabs();
    setupChartControls();
    setupMap();
    setupCountrySwitcher();
    setupPollsToggle();
    global.Catalog.on('ready', function () {
      renderCategoryTree();
      renderWatchlist();
    });
    global.Catalog.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
