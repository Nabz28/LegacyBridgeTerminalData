// Main controller. Wires universe + templates + heatmap + pair detail + search +
// time slider + PCA panel + diff/denoise toggles + keyboard + storage.
(function () {
  const S = window.AppState;

  const els = {
    matrixTitle: document.getElementById('matrix-title'),
    matrixMeta:  document.getElementById('matrix-meta'),
    statusEl:    document.getElementById('status'),
    legendAsset: document.getElementById('legend-asset'),

    heatmapCanvas: document.getElementById('heatmap-canvas'),
    tooltipEl:   document.getElementById('heatmap-tooltip'),
    emptyEl:     document.getElementById('heatmap-empty'),
    loadingEl:   document.getElementById('heatmap-loading'),

    pairTitle:   document.getElementById('pair-title'),
    pairMeta:    document.getElementById('pair-meta'),
    pairHint:    document.getElementById('pair-empty-hint'),
    pairBody:    document.getElementById('pair-body'),
    scatter:     document.getElementById('scatter-canvas'),
    rolling:     document.getElementById('rolling-canvas'),

    denoiseBtn:  document.getElementById('denoise-btn'),
    diffBtn:     document.getElementById('diff-btn'),
    diffLabel:   document.getElementById('diff-label'),
    diffMenu:    document.getElementById('diff-menu'),

    helpBtn:     document.getElementById('help-btn'),
    helpModal:   document.getElementById('help-modal'),
    helpClose:   document.getElementById('help-close'),

    rightTabs:   document.querySelectorAll('.rail-tab'),
    railPanes:   document.querySelectorAll('.rail-pane'),

    statGrid:    document.getElementById('stat-grid'),
    topPairs:    document.getElementById('top-pairs'),

    savedList:   document.getElementById('saved-list'),
    recentList:  document.getElementById('recent-list'),
    saveBtn:     document.getElementById('save-current'),

    pcaEigenbar: document.getElementById('pca-eigenbar'),
    pcaFactors:  document.getElementById('pca-factors'),
    pcaExplained:document.getElementById('pca-explained'),

    tsTrack:     document.getElementById('ts-track'),
    tsFill:      document.getElementById('ts-fill'),
    tsHandleA:   document.getElementById('ts-handle-a'),
    tsHandleB:   document.getElementById('ts-handle-b'),
    tsStart:     document.getElementById('ts-start'),
    tsEnd:       document.getElementById('ts-end'),
    tsLen:       document.getElementById('ts-len'),
    tsPresets:   document.querySelectorAll('.ts-presets button'),

    // download buttons (per-chart)
    dlHeatmapCsv:  document.getElementById('dl-heatmap-csv'),
    dlHeatmapPng:  document.getElementById('dl-heatmap-png'),
    dlPairCsv:     document.getElementById('dl-pair-csv'),
    dlScatterPng:  document.getElementById('dl-scatter-png'),
    dlRollingPng:  document.getElementById('dl-rolling-png'),
    dlPcaCsv:      document.getElementById('dl-pca-csv'),
    dlPcaPng:      document.getElementById('dl-pca-png'),
  };

  const heatmap = new Heatmap(els.heatmapCanvas, els.tooltipEl);
  const pair    = new PairDetail(els.scatter, els.rolling, els.pairTitle, els.pairMeta, els.pairHint, els.pairBody);
  const universe = new Universe(
    document.getElementById('universe-tree'),
    document.getElementById('universe-filter'),
    document.getElementById('universe-count'),
    document.getElementById('universe-clear'),
    document.getElementById('universe-compute'),
  );
  const templates = new Templates(
    document.getElementById('templates-btn'),
    document.getElementById('templates-menu'),
  );
  const search = new Search(
    document.getElementById('search-modal'),
    document.getElementById('search-input'),
    document.getElementById('search-results'),
    document.querySelector('#search-modal .search-footer') || document.createElement('div'),
  );
  const pca = new PCAPanel(els.pcaEigenbar, els.pcaFactors, els.pcaExplained);
  const slider = new TimeSlider(
    els.tsTrack, els.tsFill, els.tsHandleA, els.tsHandleB,
    els.tsStart, els.tsEnd, els.tsLen, Array.from(els.tsPresets),
  );

  function setStatus(msg) { els.statusEl.textContent = msg; }
  function setLoading(on) { els.loadingEl.hidden = !on; }

  // -------- legend rendering ---------------------------------------------
  function renderAssetLegend(cats) {
    const present = Array.from(new Set(cats || []));
    els.legendAsset.innerHTML = '';
    const colors = window.CAT_COLORS || {};
    const labels = window.CAT_LABELS || {};
    for (const c of present) {
      const el = document.createElement('span');
      el.className = 'legend-asset';
      el.innerHTML = `<span class="swatch" style="background:${colors[c] || '#5b626d'}"></span><span>${labels[c] || c}</span>`;
      els.legendAsset.appendChild(el);
    }
  }

  // -------- main matrix flow ---------------------------------------------
  function applyMatrix(payload, displayName) {
    S.set({ matrix: payload, diffMatrix: payload.diff?.matrix || null });
    els.matrixTitle.textContent = displayName || payload.display || payload.name || 'Custom selection';
    const fr = payload.freq === 'm' ? 'monthly' : 'weekly';
    const meth = (payload.method || S.get().method).toUpperCase();
    const dr = payload.date_range && payload.date_range[0] ? `${payload.date_range[0]} → ${payload.date_range[1]}` : 'no overlap';
    els.matrixMeta.textContent = `${payload.ids.length} series · ${meth} · ${fr} · n=${payload.n_obs} · ${dr}`;
    els.emptyEl.hidden = payload.ids.length > 0;

    heatmap.setData(payload);
    if (S.get().diffWindowDays && payload.diff && payload.diff.matrix) {
      heatmap.setDiff(payload.diff.matrix, true);
    } else {
      heatmap.setDiff(null, false);
    }
    universe.setSelected(payload.ids);
    renderAssetLegend(payload.cats);
    refreshStats();
    refreshPCA();
    syncSegs();
  }

  async function loadTemplate(key, opts = {}) {
    setStatus(`loading ${key}…`);
    setLoading(true);
    const t0 = performance.now();
    try {
      let data;
      try {
        data = await window.CorrAPI.getTemplate(key);
      } catch (e) {
        setStatus(e.message); setLoading(false); return;
      }
      if (data.error) { setStatus(data.error); setLoading(false); return; }
      S.set({ template: key, freq: data.freq, method: data.method });
      const display = (window.TEMPLATE_LIST.find(t => t.key === key) || {}).name || key;
      applyMatrix(data, display);
      setStatus(`${key} · ${Math.round(performance.now() - t0)}ms`);
      Storage.pushRecent({ key, name: display, freq: data.freq, method: data.method });
      renderRecent();
      if (!opts.skipHash) updateHash();
    } finally {
      setLoading(false);
    }
  }

  async function computeFromSelection(ids) {
    if (!ids || ids.length < 2) { setStatus('select at least 2 series'); return; }
    setStatus(`computing ${ids.length}×${ids.length}…`);
    setLoading(true);
    const t0 = performance.now();
    try {
      const body = {
        ids,
        freq: S.get().freq,
        method: S.get().method,
        denoise: S.get().denoise,
      };
      if (S.get().startDate) body.start_date = S.get().startDate;
      if (S.get().endDate)   body.end_date   = S.get().endDate;
      if (S.get().diffWindowDays) body.diff_window_days = S.get().diffWindowDays;
      let data;
      try {
        data = await window.CorrAPI.computeSubset(body);
      } catch (e) {
        // Cloud mode rejects this — show the message and bail.
        setStatus(e.message);
        return;
      }
      if (data.error) { setStatus(data.error); return; }
      S.set({ template: null });
      applyMatrix(data, `Custom · ${data.ids.length} series`);
      setStatus(`computed in ${Math.round(performance.now() - t0)}ms`);
      updateHash();
    } finally {
      setLoading(false);
    }
  }

  function syncSegs() {
    document.querySelectorAll('#freq-seg button').forEach(b => {
      b.classList.toggle('active', b.dataset.freq === S.get().freq);
    });
    document.querySelectorAll('#method-seg button').forEach(b => {
      b.classList.toggle('active', b.dataset.method === S.get().method);
    });
    els.denoiseBtn.classList.toggle('active', !!S.get().denoise);
    els.diffBtn.classList.toggle('active', !!S.get().diffWindowDays);
    const labels = { 0: 'off', 180: '6m', 365: '1y', 730: '2y', 1825: '5y' };
    els.diffLabel.textContent = labels[S.get().diffWindowDays] || 'off';
  }

  async function recompute() {
    const ids = S.get().matrix ? S.get().matrix.ids : [];
    if (ids.length) await computeFromSelection(ids);
  }

  // -------- right rail: stats / pca / history --------------------------
  function refreshStats() {
    const m = S.get().matrix;
    if (!m || !m.matrix) {
      els.statGrid.innerHTML = '';
      els.topPairs.innerHTML = '';
      return;
    }
    const N = m.ids.length;
    const offDiag = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const v = m.matrix[i][j];
        if (isFinite(v)) offDiag.push({ i, j, v });
      }
    }
    if (!offDiag.length) {
      els.statGrid.innerHTML = '<div class="muted small">no off-diagonal values</div>';
      els.topPairs.innerHTML = '';
      return;
    }
    const sorted = offDiag.slice().sort((a, b) => b.v - a.v);
    const median = offDiag.slice().sort((a, b) => a.v - b.v)[Math.floor(offDiag.length / 2)].v;
    const mean   = offDiag.reduce((s, x) => s + x.v, 0) / offDiag.length;
    const absMean= offDiag.reduce((s, x) => s + Math.abs(x.v), 0) / offDiag.length;

    const card = (label, val, sub, cls) => `
      <div class="stat-card">
        <div class="label">${label}</div>
        <div class="value ${cls || ''}">${val}</div>
        ${sub ? `<div class="sub">${sub}</div>` : ''}
      </div>`;
    const sign = (v) => (v >= 0 ? '+' : '') + v.toFixed(3);

    els.statGrid.innerHTML =
      card('Mean ρ', sign(mean), '', mean >= 0 ? 'pos' : 'neg') +
      card('Median ρ', sign(median), '', median >= 0 ? 'pos' : 'neg') +
      card('Mean |ρ|', absMean.toFixed(3), '', '') +
      card('Pairs', String(offDiag.length), `${N} series`, '');

    // Top |ρ| (mix of strongest positive + strongest negative).
    const topPos = sorted.slice(0, 5);
    const topNeg = sorted.slice(-5).reverse();
    const html = ['<div class="rail-section-title" style="margin-top:0">Strongest +</div>'];
    for (const t of topPos) html.push(pairLine(m, t, 'pos'));
    html.push('<div class="rail-section-title" style="margin-top:8px">Strongest −</div>');
    for (const t of topNeg) html.push(pairLine(m, t, 'neg'));
    els.topPairs.innerHTML = html.join('');
    els.topPairs.querySelectorAll('.top-pair').forEach((row, idx) => {
      const isPos = idx < topPos.length;
      const t = isPos ? topPos[idx] : topNeg[idx - topPos.length];
      row.addEventListener('click', () => pair.load(m.ids[t.i], m.ids[t.j], S.get().freq, { start: S.get().startDate, end: S.get().endDate }));
    });
  }

  function pairLine(m, t, cls) {
    const a = (m.ids[t.i] || '').split(':').pop();
    const b = (m.ids[t.j] || '').split(':').pop();
    const sign = t.v >= 0 ? '+' : '';
    return `<div class="top-pair"><span class="pair-name">${a} ↔ ${b}</span><span class="pair-rho ${cls}">${sign}${t.v.toFixed(2)}</span></div>`;
  }

  async function refreshPCA() {
    const m = S.get().matrix;
    if (!m || m.ids.length < 2) { pca.clear(); return; }
    pca.load(m.ids, S.get().freq, S.get().method, S.get().startDate, S.get().endDate);
  }

  // -------- saved views / recent ---------------------------------------
  function renderSaved() {
    const items = Storage.listSaved();
    els.savedList.innerHTML = items.length ? '' : '<div class="muted small">No saved views yet — press S to save.</div>';
    for (const v of items) {
      const row = document.createElement('div');
      row.className = 'saved-item';
      row.innerHTML = `<span class="name">${v.name || v.template || 'view'}</span><span class="meta">${(v.ids || []).length}</span><span class="del" title="delete">✕</span>`;
      row.querySelector('.name').addEventListener('click', () => loadSaved(v));
      row.querySelector('.del').addEventListener('click', e => { e.stopPropagation(); Storage.deleteView(v.id); renderSaved(); });
      els.savedList.appendChild(row);
    }
  }
  function renderRecent() {
    const items = Storage.listRecent();
    els.recentList.innerHTML = items.length ? '' : '<div class="muted small">No recent views.</div>';
    for (const v of items) {
      const row = document.createElement('div');
      row.className = 'saved-item';
      row.innerHTML = `<span class="name">${v.name}</span><span class="meta">${v.freq}</span>`;
      row.addEventListener('click', () => loadTemplate(v.key));
      els.recentList.appendChild(row);
    }
  }
  function saveCurrent() {
    const m = S.get().matrix;
    if (!m) return;
    const name = prompt('Save view as:', S.get().template || 'custom');
    if (!name) return;
    Storage.saveView({
      name, ids: m.ids, freq: S.get().freq, method: S.get().method,
      denoise: S.get().denoise, diff: S.get().diffWindowDays,
      start: S.get().startDate, end: S.get().endDate,
    });
    renderSaved();
    setStatus('view saved');
  }

  // -------- downloads (CSV + PNG per chart) ---------------------------
  function wireDownloads() {
    // Heatmap CSV
    els.dlHeatmapCsv?.addEventListener('click', () => {
      const m = S.get().matrix;
      if (!m || !m.ids?.length) { setStatus('no matrix to export'); return; }
      try {
        CorrExport.exportHeatmapCSV(m);
        setStatus(`exported heatmap CSV (${m.ids.length}×${m.ids.length})`);
      } catch (e) { setStatus('export failed: ' + e.message); }
    });
    // Heatmap PNG
    els.dlHeatmapPng?.addEventListener('click', async () => {
      const m = S.get().matrix;
      if (!m || !m.ids?.length) { setStatus('no matrix to export'); return; }
      try {
        await CorrExport.exportHeatmapPNG(m, els.heatmapCanvas);
        setStatus('exported heatmap PNG');
      } catch (e) { setStatus('export failed: ' + e.message); }
    });
    // PCA CSV
    els.dlPcaCsv?.addEventListener('click', () => {
      const m = S.get().matrix;
      const pcaData = pca.getData();
      if (!m || !pcaData || !pcaData.factors?.length) {
        setStatus('PCA not yet computed — open the PCA tab first');
        return;
      }
      try {
        CorrExport.exportPCACSV(pcaData, m);
        setStatus(`exported PCA CSV (${pcaData.factors.length} factors)`);
      } catch (e) { setStatus('export failed: ' + e.message); }
    });
    // PCA PNG (snapshots the right-rail PCA pane)
    els.dlPcaPng?.addEventListener('click', async () => {
      const m = S.get().matrix;
      if (!m) { setStatus('no PCA to export'); return; }
      try {
        await CorrExport.exportPCAPNG(els.pcaEigenbar, els.pcaFactors, m);
        setStatus('exported PCA PNG');
      } catch (e) { setStatus('PCA PNG failed: ' + e.message); }
    });
    // Pair buttons: the PairDetail instance owns the data + chart instances;
    // it wires its own three buttons (CSV + scatter PNG + rolling PNG).
    pair.wireDownloads({
      csv: els.dlPairCsv,
      scatterPng: els.dlScatterPng,
      rollingPng: els.dlRollingPng,
      onStatus: setStatus,
    });
  }

  function loadSaved(v) {
    S.set({
      freq: v.freq, method: v.method,
      denoise: !!v.denoise, diffWindowDays: v.diff || 0,
      startDate: v.start || null, endDate: v.end || null,
    });
    syncSegs();
    computeFromSelection(v.ids);
  }

  // -------- URL hash state --------------------------------------------
  function updateHash() {
    const s = S.get();
    const params = new URLSearchParams();
    params.set('freq', s.freq);
    params.set('method', s.method);
    if (s.denoise) params.set('denoise', '1');
    if (s.diffWindowDays) params.set('diff', String(s.diffWindowDays));
    if (s.startDate) params.set('start', s.startDate);
    if (s.endDate) params.set('end', s.endDate);
    const path = s.template ? `/template/${s.template}` : '/custom';
    location.hash = `#${path}?${params.toString()}`;
  }
  function readHash() {
    const m = location.hash.match(/^#\/(template\/([^?]+)|custom)\??(.*)$/);
    if (!m) return null;
    const params = new URLSearchParams(m[3] || '');
    return {
      template: m[2] || null,
      freq: params.get('freq') || 'w',
      method: params.get('method') || 'pearson',
      denoise: params.get('denoise') === '1',
      diff: parseInt(params.get('diff') || '0', 10) || 0,
      start: params.get('start') || null,
      end: params.get('end') || null,
    };
  }

  // -------- regimes -------------------------------------------------
  async function loadRegimes() {
    try {
      const r = await fetch('data/regimes.json');
      const data = await r.json();
      pair.setRegimes(data.regimes, data.colors);
      S.set({ regimes: data.regimes });
    } catch (_) {}
  }

  // -------- date range -----------------------------------------------
  async function loadDateRange() {
    let data;
    try {
      data = await window.CorrAPI.getDates(S.get().freq);
    } catch (e) {
      console.warn('[corr] date range load failed', e.message);
      return;
    }
    S.set({ dateRange: { start: data.start, end: data.end } });
    slider.setRange(data.start, data.end);
  }

  // -------- event wiring --------------------------------------------
  let lastFocusId = null;   // most recently inspected series (for the → Macro hand-off)
  function nameForId(id) {
    var s = (S.get().seriesById || {})[id];
    return s ? (s.name || id) : id;
  }
  heatmap.onCellClick = ({ id_a, id_b }) => {
    lastFocusId = id_a;
    pair.load(id_a, id_b, S.get().freq, { start: S.get().startDate, end: S.get().endDate });
  };
  heatmap.onCellSelect = ({ id_a, id_b }) => { lastFocusId = id_a; setStatus(`selected ${id_a} ↔ ${id_b}`); };

  // Reverse cross-link → open the macro terminal, seeded with the last series.
  var toMacroBtn = document.getElementById('to-macro-btn');
  if (toMacroBtn) toMacroBtn.addEventListener('click', () => {
    var url = '/macro/dashboard/';
    if (lastFocusId) url += '?q=' + encodeURIComponent(nameForId(lastFocusId));
    window.location.href = url;
  });

  universe.onCompute = (ids) => computeFromSelection(ids);
  templates.onPick = (k) => loadTemplate(k);
  search.onAddId = (id) => universe.add(id);
  search.onRemoveId = (id) => universe.remove(id);
  search.onFocusId = (id) => {
    if (!S.get().matrix) return;
    const idx = S.get().matrix.ids.indexOf(id);
    if (idx === -1) {
      universe.add(id);
      setStatus(`${id} added — click Compute`);
    } else {
      heatmap.setSelection({ i: idx, j: idx });
      setStatus(`focused ${id}`);
    }
  };

  document.querySelectorAll('#freq-seg button').forEach(b => {
    b.addEventListener('click', () => {
      if (S.get().freq === b.dataset.freq) return;
      S.set({ freq: b.dataset.freq });
      syncSegs();
      loadDateRange();
      recompute();
    });
  });
  document.querySelectorAll('#method-seg button').forEach(b => {
    b.addEventListener('click', () => {
      if (S.get().method === b.dataset.method) return;
      S.set({ method: b.dataset.method });
      syncSegs();
      recompute();
    });
  });

  els.denoiseBtn.addEventListener('click', () => {
    S.set({ denoise: !S.get().denoise });
    syncSegs();
    recompute();
  });

  // Diff dropdown
  els.diffBtn.addEventListener('click', e => {
    e.stopPropagation();
    els.diffMenu.hidden = !els.diffMenu.hidden;
  });
  document.addEventListener('click', e => {
    if (!els.diffMenu.contains(e.target) && e.target !== els.diffBtn) els.diffMenu.hidden = true;
  });
  els.diffMenu.querySelectorAll('.menu-item').forEach(it => {
    it.addEventListener('click', () => {
      S.set({ diffWindowDays: parseInt(it.dataset.diff, 10) });
      els.diffMenu.hidden = true;
      syncSegs();
      recompute();
    });
  });

  // Right rail tabs
  els.rightTabs.forEach(t => {
    t.addEventListener('click', () => {
      const pane = t.dataset.tab;
      els.rightTabs.forEach(x => x.classList.toggle('active', x === t));
      els.railPanes.forEach(p => p.hidden = p.dataset.pane !== pane);
      if (pane === 'history') renderSaved();
    });
  });

  els.saveBtn.addEventListener('click', saveCurrent);

  // Help modal
  function openHelp() { els.helpModal.hidden = false; }
  function closeHelp() { els.helpModal.hidden = true; }
  els.helpBtn.addEventListener('click', openHelp);
  els.helpClose.addEventListener('click', closeHelp);
  els.helpModal.querySelector('.modal-backdrop').addEventListener('click', closeHelp);

  // Search button
  document.getElementById('search-btn').addEventListener('click', () => search.open());

  // Time slider — debounced commit on release.
  slider.onChange = (startMs, endMs) => {
    const start = new Date(startMs).toISOString().slice(0, 10);
    const end   = new Date(endMs).toISOString().slice(0, 10);
    const dr = S.get().dateRange;
    // Treat full range as no-window so backend uses default (faster path).
    const isFull = dr && start === dr.start && end === dr.end;
    S.set({ startDate: isFull ? null : start, endDate: isFull ? null : end });
    recompute();
  };

  // Keyboard
  new Keyboard({
    onEscape:        () => { closeHelp(); search.close(); },
    focusFilter:     () => universe.focusFilter(),
    openTemplates:   () => templates.toggle(),
    toggleFreq:      () => { S.set({ freq: S.get().freq === 'w' ? 'm' : 'w' }); syncSegs(); loadDateRange(); recompute(); },
    toggleMethod:    () => { S.set({ method: S.get().method === 'pearson' ? 'spearman' : 'pearson' }); syncSegs(); recompute(); },
    toggleDenoise:   () => { S.set({ denoise: !S.get().denoise }); syncSegs(); recompute(); },
    cycleDiff:       () => {
      const seq = [0, 180, 365, 730, 1825];
      const cur = seq.indexOf(S.get().diffWindowDays);
      S.set({ diffWindowDays: seq[(cur + 1) % seq.length] });
      syncSegs(); recompute();
    },
    saveCurrent:     saveCurrent,
    resetWindow:     () => { S.set({ startDate: null, endDate: null }); slider.applyPreset('all'); recompute(); },
    openHelp:        openHelp,
    activateSelection: () => heatmap.activateSelection(),
    move: (dx, dy) => heatmap.moveSelection(dx, dy),
  });

  // -------- bootstrap -----------------------------------------------
  async function boot() {
    setStatus('loading…');
    const r = await fetch('data/series_meta.json');
    const seriesArr = await r.json();
    const byId = {};
    const avail = new Set();
    for (const s of seriesArr) { byId[s.id] = s; if (s.available) avail.add(s.id); }
    S.set({ series: seriesArr, seriesById: byId, availableIds: avail });
    universe.setSeries(seriesArr);
    search.setSeries(seriesArr);

    await loadDateRange();
    await loadRegimes();

    // Template counts.
    const counts = {};
    for (const t of window.TEMPLATE_LIST) {
      try {
        const cr = await fetch(`data/matrices/${t.key}.json`);
        if (cr.ok) {
          const cd = await cr.json();
          counts[t.key] = `${cd.ids.length}`;
        }
      } catch (_) {}
    }
    templates.setCounts(counts);

    renderRecent();
    renderSaved();
    wireDownloads();

    const hash = readHash();
    if (hash && hash.template) {
      S.set({
        freq: hash.freq, method: hash.method,
        denoise: hash.denoise, diffWindowDays: hash.diff,
        startDate: hash.start, endDate: hash.end,
      });
      await loadTemplate(hash.template, { skipHash: true });
    } else {
      await loadTemplate('us_macro_xa', { skipHash: true });
    }

    // Cross-terminal hand-off: the macro terminal links here with ?q=<name>.
    // Open the spotlight pre-filled so the user lands on the right series.
    try {
      const q = new URLSearchParams(location.search).get('q');
      if (q) setTimeout(() => search.openWith(q), 350);
    } catch (_) {}
  }

  boot().catch(err => {
    setStatus('boot error: ' + err.message);
    console.error(err);
  });
})();
