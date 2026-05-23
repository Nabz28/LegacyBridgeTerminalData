// ================================================================
// analysis-ws.jsx — LBC Analysis workbench (window.AnalysisLab).
// A god-level econometrics desk for the Macro terminal: pick macro data
// (live + Refinitiv), build a model (drag-drop / click-to-assign equation
// builder + method templates), clean/transform, and run OLS / VAR / BVAR /
// panel / ADF / Granger / correlation / descriptive — all client-side via
// window.Econ. Workspaces save per-account to public.analysis_workspace.
// ================================================================
(function () {
  'use strict';
  var E = window.Econ, D = window.AnalysisData, R = window.AnalysisResults, Viz = window.AnalysisViz;
  var SB = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  // ---- per-account cloud sync (same pattern as autocharter) ----
  function lbcSession() { try { var s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch (e) { return null; } }
  function lbcToken() { var s = lbcSession(); return s ? s.token : null; }
  function lbcSub() { var s = lbcSession(); return (s && s.user) ? s.user.id : null; }
  function cloudEnabled() { return !!(lbcToken() && lbcSub()); }
  function cloudLoad() {
    if (!cloudEnabled()) return Promise.resolve(null);
    return fetch(SB + '/analysis_workspace?user_sub=eq.' + encodeURIComponent(lbcSub()) + '&select=doc', { headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken() } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (rows) { return (rows && rows[0] && rows[0].doc) ? rows[0].doc : null; });
  }
  function cloudSave(doc) {
    if (!cloudEnabled()) return Promise.resolve(false);
    return fetch(SB + '/analysis_workspace', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_sub: lbcSub(), doc: doc, updated_at: new Date().toISOString() }]) })
      .then(function (r) { if (!r.ok) return Promise.reject('HTTP ' + r.status); return true; });
  }
  var LOCAL_KEY = 'lbcAnalysisWorkspace';

  var METHODS = [
    { id: 'ols', label: 'Regression (OLS)', group: 'equation', glyph: 'β', desc: 'Y = c + ΣβⱼXⱼ + ε · HC1 / Newey-West SE + diagnostics' },
    { id: 'loglinear', label: 'Log-Linear', group: 'equation', glyph: 'ln', desc: 'auto-logs level vars → elasticities / semi-elasticities' },
    { id: 'coint', label: 'Cointegration', group: 'equation', glyph: '∫', desc: 'Engle-Granger long-run test (guards against spurious regression)' },
    { id: 'var', label: 'VAR', group: 'multi', glyph: 'V', desc: 'Vector autoregression · lag-select · Cholesky IRF / FEVD' },
    { id: 'bvar', label: 'Bayesian VAR', group: 'multi', glyph: 'B', desc: 'Minnesota prior + posterior IRF bands' },
    { id: 'panel', label: 'Panel (FE / RE)', group: 'panel', glyph: '▦', desc: 'Fixed / random effects on long data' },
    { id: 'corr', label: 'Correlation', group: 'set', glyph: 'ρ', desc: 'Pearson / Spearman matrix' },
    { id: 'descriptive', label: 'Descriptive', group: 'set', glyph: 'Σ', desc: 'Summary statistics + distribution' },
    { id: 'adf', label: 'ADF / Stationarity', group: 'one', glyph: '√', desc: 'Augmented Dickey-Fuller (AIC lag) + p-value' },
    { id: 'acf', label: 'ACF / PACF', group: 'one', glyph: '⟂', desc: 'Autocorrelation & partial autocorrelation' },
    { id: 'granger', label: 'Granger Causality', group: 'set', glyph: '→', desc: 'Predictive causality F-tests' }
  ];
  var FREQS = [{ id: '', label: 'Native' }, { id: 'W', label: 'Weekly' }, { id: 'M', label: 'Monthly' }, { id: 'Q', label: 'Quarterly' }, { id: 'A', label: 'Annual' }];

  function alias(vd) { var t = (E.TRANSFORMS.find(function (x) { return x.id === vd.transform; }) || {}).label || vd.transform; return vd.transform === 'level' ? vd.label : vd.label + ' [' + t + ']'; }
  function histogram(col, name) { var n = col.length; if (!n) return null; var lo = Math.min.apply(null, col), hi = Math.max.apply(null, col); var bins = Math.min(20, Math.max(6, Math.ceil(Math.sqrt(n)))); var w = (hi - lo) / bins || 1; var counts = new Array(bins).fill(0), edges = []; for (var b = 0; b < bins; b++) edges.push((lo + b * w).toFixed(1)); col.forEach(function (v) { var i = Math.min(bins - 1, Math.floor((v - lo) / w)); counts[i]++; }); return { counts: counts, edges: edges, name: name }; }

  // ===================== data picker popup =====================
  function SeriesPicker(props) {
    var _s = React.useState(''), q = _s[0], setQ = _s[1];
    var _r = React.useState(null), rows = _r[0], setRows = _r[1];
    var _c = React.useState('us'), country = _c[0], setCountry = _c[1];
    var _l = React.useState(false), loading = _l[0], setLoading = _l[1];
    React.useEffect(function () {
      var alive = true; setLoading(true);
      var t = setTimeout(function () {
        D.search(q, { country: country }).then(function (res) { if (alive) { setRows(res); setLoading(false); } }).catch(function () { if (alive) { setRows([]); setLoading(false); } });
      }, 220);
      return function () { alive = false; clearTimeout(t); };
    }, [q, country]);
    return (
      <div className="an-modal-bg" onClick={props.onClose}>
        <div className="an-modal" onClick={function (e) { e.stopPropagation(); }}>
          <div className="an-modal-h"><span>{props.title || 'Choose a data series'}</span><button className="an-modal-x" onClick={props.onClose}>×</button></div>
          <div className="an-modal-search">
            <input autoFocus placeholder="Search live + Refinitiv macro data…  (e.g. CPI, palm oil, 10Y, GDP)" value={q}
              onChange={function (e) { setQ(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Escape') { e.preventDefault(); props.onClose(); } else if (e.key === 'Enter' && rows && rows.length) { e.preventDefault(); props.onPick(rows[0]); } }} />
            <div className="an-ctry">{D.REF_COUNTRIES.map(function (c) { return <button key={c.id} className={'an-ctry-btn ' + (country === c.id ? 'on' : '')} onClick={function () { setCountry(c.id); }} title={'Refinitiv country: ' + c.label}>{c.label}</button>; })}</div>
          </div>
          <div className="an-modal-body">
            {loading && <div className="an-empty">Searching…</div>}
            {rows && !rows.length && !loading && <div className="an-empty">No matches. Try a different term.</div>}
            {rows && rows.map(function (it) { return (
              <div key={it.uid} className="an-pick-row" onClick={function () { props.onPick(it); }}>
                <span className={'an-src an-src-' + (it.source || '').toLowerCase().replace(/[^a-z]/g, '')}>{it.tag}</span>
                <span className="an-pick-label">{it.label}</span>
                <span className="an-pick-sub">{it.sub}</span>
              </div>
            ); })}
          </div>
        </div>
      </div>
    );
  }

  // ===================== variable tray chip =====================
  function VarChip(props) {
    var vd = props.vd;
    return (
      <div className="an-var" draggable onDragStart={function (e) { e.dataTransfer.setData('text/uid', vd.uid); }}>
        <div className="an-var-top">
          <span className="an-var-grip">⠿</span>
          <span className={'an-src an-src-' + (vd.source || '').toLowerCase().replace(/[^a-z]/g, '')}>{vd.source === 'Refinitiv' ? 'RIC' : vd.source}</span>
          <span className="an-var-label" title={vd.label}>{vd.label}</span>
          <button className="an-var-x" title="Remove" onClick={function () { props.onRemove(vd.uid); }}>×</button>
        </div>
        <div className="an-var-bot">
          <select className="an-tf" value={vd.transform} onChange={function (e) { props.onTransform(vd.uid, e.target.value); }} title="Transform">
            {E.TRANSFORMS.map(function (t) { return <option key={t.id} value={t.id}>{t.label}</option>; })}
          </select>
          <select className="an-tf" value={vd.agg || 'last'} onChange={function (e) { props.onAgg(vd.uid, e.target.value); }} title="Resample aggregation — use Sum/Avg for flow variables (GDP, exports), Last for stocks/levels">
            <option value="last">Last</option><option value="mean">Avg</option><option value="sum">Sum</option>
          </select>
          <span className="an-var-n">{props.n != null ? props.n + ' obs' : ''}</span>
        </div>
      </div>
    );
  }

  // a slot in the equation builder (Y or an X)
  function Slot(props) {
    var vd = props.vd;
    return (
      <span className={'an-slot ' + (vd ? 'filled' : 'empty') + (props.role === 'y' ? ' an-slot-y' : '')}
        onClick={props.onClick}
        onDragOver={function (e) { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
        onDragLeave={function (e) { e.currentTarget.classList.remove('drag'); }}
        onDrop={function (e) { e.preventDefault(); e.currentTarget.classList.remove('drag'); var uid = e.dataTransfer.getData('text/uid'); if (uid) props.onDrop(uid); }}>
        {vd ? <span className="an-slot-lbl" title={alias(vd)}>{vd.label}{vd.transform !== 'level' ? ' ·' + vd.transform : ''}</span> : <span className="an-slot-ph">{props.placeholder || 'click / drop'}</span>}
        {vd && props.onClear && <button className="an-slot-x" onClick={function (e) { e.stopPropagation(); props.onClear(); }}>×</button>}
      </span>
    );
  }

  // ===================== main lab =====================
  function AnalysisLab() {
    var _v = React.useState([]), vars = _v[0], setVars = _v[1];                 // tray: [{uid,label,source,transform,k,seriesId,kind,ric}]
    var _sm = React.useState({}), seriesMap = _sm[0], setSeriesMap = _sm[1];     // uid -> series
    var _m = React.useState('ols'), method = _m[0], setMethod = _m[1];
    var _cfg = React.useState({ y: null, x: [], endo: [], setvars: [], one: null, lags: 2, trend: 'c', robust: 'none', lambda1: 0.2, lambda2: 0.5, lambda3: 1, corrMethod: 'pearson', effects: 'fixed', irfH: 12 }), cfg = _cfg[0], setCfg = _cfg[1];
    var _cl = React.useState({ freq: 'M' }), cleaning = _cl[0], setCleaning = _cl[1];
    var _res = React.useState(null), result = _res[0], setResult = _res[1];
    var _run = React.useState(false), running = _run[0], setRunning = _run[1];
    var _err = React.useState(''), err = _err[0], setErr = _err[1];
    var _pick = React.useState(null), picker = _pick[0], setPicker = _pick[1];   // {target:'tray'|'y'|'x'|'endo'|...}
    var _saved = React.useState([]), saved = _saved[0], setSaved = _saved[1];
    var _sync = React.useState('idle'), sync = _sync[0], setSync = _sync[1];
    var _panel = React.useState(''), panelCsv = _panel[0], setPanelCsv = _panel[1];
    var loaded = React.useRef(false);
    var saveTimer = React.useRef(null);

    var byUid = {}; vars.forEach(function (v) { byUid[v.uid] = v; });

    // boot: load workspace (cloud-first, local fallback)
    React.useEffect(function () {
      cloudLoad().then(function (doc) {
        if (!doc) { try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { } }
        if (doc) { if (doc.vars) hydrateVars(doc.vars); if (doc.saved) setSaved(doc.saved); }
      }).catch(function () { try { var d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (d) { if (d.vars) hydrateVars(d.vars); if (d.saved) setSaved(d.saved); } } catch (e) { } })
        .then(function () { loaded.current = true; });
    }, []);

    // clear any pending debounced cloud save on unmount (no setState on dead component)
    React.useEffect(function () { return function () { if (saveTimer.current) clearTimeout(saveTimer.current); }; }, []);

    function hydrateVars(vlist) {
      setVars(vlist);
      // refetch series for restored vars
      D.fetchAll(vlist).then(function (m) { var sm = {}; Object.keys(m).forEach(function (uid) { sm[uid] = m[uid].series; }); setSeriesMap(sm); });
    }

    function persist(nextVars, nextSaved) {
      var doc = { v: 1, vars: (nextVars || vars).map(function (v) { return { uid: v.uid, kind: v.kind, label: v.label, source: v.source, seriesId: v.seriesId, ric: v.ric, transform: v.transform, agg: v.agg, k: v.k }; }), saved: nextSaved || saved, updated: new Date().toISOString() };
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch (e) { }
      // debounce cloud writes so rapid edits don't race / clobber across tabs
      if (cloudEnabled()) {
        setSync('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(function () { cloudSave(doc).then(function () { setSync('saved'); setTimeout(function () { setSync('idle'); }, 1500); }).catch(function () { setSync('local'); }); }, 600);
      }
    }

    function addVar(item) {
      if (byUid[item.uid]) return;
      var vd = { uid: item.uid, kind: item.kind, label: item.label, source: item.source, seriesId: item.seriesId, ric: item.ric, transform: 'level', agg: 'last', k: 1 };
      var next = vars.concat([vd]); setVars(next); persist(next, null);
      D.fetchSeries(item).then(function (s) { setSeriesMap(function (m) { var n = Object.assign({}, m); n[item.uid] = s; return n; }); }).catch(function () { });
    }
    function removeVar(uid) {
      var next = vars.filter(function (v) { return v.uid !== uid; }); setVars(next);
      setCfg(function (c) { return Object.assign({}, c, { y: c.y === uid ? null : c.y, one: c.one === uid ? null : c.one, x: c.x.filter(function (u) { return u !== uid; }), endo: c.endo.filter(function (u) { return u !== uid; }), setvars: c.setvars.filter(function (u) { return u !== uid; }) }); });
      persist(next, null);
    }
    function setTransform(uid, t) { var next = vars.map(function (v) { return v.uid === uid ? Object.assign({}, v, { transform: t }) : v; }); setVars(next); persist(next, null); }
    function setAgg(uid, a) { var next = vars.map(function (v) { return v.uid === uid ? Object.assign({}, v, { agg: a }) : v; }); setVars(next); persist(next, null); }

    function onPick(item) {
      var tgt = picker && picker.target;
      addVar(item);
      if (tgt === 'y') setCfg(function (c) { return Object.assign({}, c, { y: item.uid }); });
      else if (tgt === 'x') setCfg(function (c) { return Object.assign({}, c, { x: c.x.indexOf(item.uid) > -1 ? c.x : c.x.concat([item.uid]) }); });
      else if (tgt === 'xswap') { var sidx = picker.idx; setCfg(function (c) { var nx = c.x.slice(); if (sidx < nx.length) nx[sidx] = item.uid; return Object.assign({}, c, { x: nx }); }); }
      else if (tgt === 'one') setCfg(function (c) { return Object.assign({}, c, { one: item.uid }); });
      else if (tgt === 'endo') setCfg(function (c) { return Object.assign({}, c, { endo: c.endo.indexOf(item.uid) > -1 ? c.endo : c.endo.concat([item.uid]) }); });
      else if (tgt === 'set') setCfg(function (c) { return Object.assign({}, c, { setvars: c.setvars.indexOf(item.uid) > -1 ? c.setvars : c.setvars.concat([item.uid]) }); });
      setPicker(null);
    }

    // Assemble an aligned dataset for a list of var uids.
    // ORDER MATTERS (fixes the mixed-frequency / lag-meaning bug):
    //   1) resample each raw series to the common frequency,
    //   2) inner-join on dates (so every column is on the SAME calendar grid),
    //   3) THEN apply each variable's transform on its aligned column, so a
    //      "lag 1" / "diff" always means one common period — never 1 native day
    //      for one series and 1 month for another.
    function buildDataset(uids, ddopts) {
      ddopts = ddopts || {};
      var tf = function (vd) { return (ddopts.forceLog && vd.transform === 'level') ? 'log' : vd.transform; };
      var freq = cleaning.freq;  // '' = native (no resample)
      var resampled = uids.map(function (uid) {
        var vd = byUid[uid], s = seriesMap[uid]; if (!vd || !s) return null;
        return { vd: vd, series: freq ? E.resample(s, freq, vd.agg || 'last') : s.slice() };
      });
      if (resampled.some(function (r) { return !r || !r.series.length; })) return { error: 'Some series are still loading (or returned no data) — try again in a moment.' };
      var alignedRaw = E.alignVars(resampled.map(function (r) { return { name: r.vd.label, series: r.series }; }), {});
      var fl = (FREQS.find(function (f) { return f.id === freq; }) || { label: 'native' }).label.toLowerCase();
      if (alignedRaw.n < 5) return { error: 'Only ' + alignedRaw.n + ' overlapping ' + fl + ' observations across the chosen series. Their date ranges barely overlap — pick a longer common span or a lower frequency' + (!freq ? ' (mixed native frequencies rarely share exact dates — set a Frequency above).' : '.') };
      var tcols = alignedRaw.columns.map(function (col, i) { return E.transform(col, tf(byUid[uids[i]]), { k: byUid[uids[i]].k || 1 }); });
      var keep = [];
      for (var r = 0; r < alignedRaw.n; r++) { var ok = true; for (var c = 0; c < tcols.length; c++) { var v = tcols[c][r]; if (v == null || !isFinite(v)) { ok = false; break; } } if (ok) keep.push(r); }
      if (keep.length < 8) return { error: 'Only ' + keep.length + ' usable observations after transforms (lags/diffs drop leading rows). Lower the frequency, shorten lags, or add more history.' };
      return {
        dates: keep.map(function (r) { return alignedRaw.dates[r]; }),
        names: uids.map(function (uid) { var vd = byUid[uid]; return (ddopts.forceLog && vd.transform === 'level') ? ('ln ' + vd.label) : alias(vd); }),
        columns: tcols.map(function (col) { return keep.map(function (r) { return col[r]; }); }),
        n: keep.length, freq: freq
      };
    }

    function run() {
      setErr(''); setRunning(true);
      setTimeout(function () {  // let spinner paint
        try {
          var res = compute();
          setResult(res);
        } catch (e) { setErr(String(e && e.message || e)); setResult(null); }
        setRunning(false);
      }, 20);
    }

    function compute() {
      if (method === 'panel') return runPanel();
      if (method === 'adf') {
        if (!cfg.one) throw new Error('Pick a variable to test.');
        var ds = buildDataset([cfg.one]); if (ds.error) throw new Error(ds.error);
        return E.adf(ds.columns[0], { trend: cfg.trend });
      }
      if (method === 'acf') {
        if (!cfg.one) throw new Error('Pick a variable.');
        var dsa = buildDataset([cfg.one]); if (dsa.error) throw new Error(dsa.error);
        var col = dsa.columns[0]; var mL = Math.min(36, Math.max(4, Math.floor(col.length / 3)));
        return { method: 'acf', name: dsa.names[0], n: col.length, acf: E.acf(col, mL), pacf: E.pacf(col, mL) };
      }
      if (method === 'ols' || method === 'loglinear') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set a dependent (Y) and at least one regressor (X).');
        var uids = [cfg.y].concat(cfg.x);
        var ds2 = buildDataset(uids, { forceLog: method === 'loglinear' }); if (ds2.error) throw new Error(ds2.error);
        var res = E.ols(ds2.columns[0], ds2.columns.slice(1), { names: ds2.names.slice(1), robust: cfg.robust });
        res._yName = ds2.names[0]; res._dates = ds2.dates; res._n = ds2.n; res._logged = method === 'loglinear';
        return res;
      }
      if (method === 'coint') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set a dependent (Y) and at least one regressor (X).');
        var dsc = buildDataset([cfg.y].concat(cfg.x)); if (dsc.error) throw new Error(dsc.error);
        return E.engleGranger(dsc.columns[0], dsc.columns.slice(1), dsc.names.slice(1));
      }
      if (method === 'corr') {
        if (cfg.setvars.length < 2) throw new Error('Pick at least 2 variables.');
        var ds3 = buildDataset(cfg.setvars); if (ds3.error) throw new Error(ds3.error);
        var cm = E.corrMatrix(ds3.columns, ds3.names, { method: cfg.corrMethod });
        return { method: 'corr', names: cm.names, matrix: cm.matrix, n: cm.n, methodKind: cfg.corrMethod };
      }
      if (method === 'descriptive') {
        if (!cfg.setvars.length) throw new Error('Pick at least 1 variable.');
        var ds4 = buildDataset(cfg.setvars); if (ds4.error) throw new Error(ds4.error);
        var rows = ds4.columns.map(function (c, i) { return Object.assign({ name: ds4.names[i] }, E.describe(c)); });
        return { method: 'descriptive', rows: rows, hist: histogram(ds4.columns[0], ds4.names[0]) };
      }
      if (method === 'granger') {
        if (cfg.setvars.length < 2) throw new Error('Pick at least 2 variables.');
        var ds5 = buildDataset(cfg.setvars); if (ds5.error) throw new Error(ds5.error);
        if (cfg.setvars.length === 2) { var g = E.granger(ds5.columns[1], ds5.columns[0], cfg.lags); g._x = ds5.names[0]; g._y = ds5.names[1]; return g; }
        var gm = E.grangerMatrix(ds5.columns, ds5.names, cfg.lags); gm.method = 'Granger'; return gm;
      }
      if (method === 'var' || method === 'bvar') {
        if (cfg.endo.length < 2) throw new Error('VAR needs at least 2 endogenous variables.');
        var ds6 = buildDataset(cfg.endo); if (ds6.error) throw new Error(ds6.error);
        var p = Math.max(1, Math.min(cfg.lags, Math.floor(ds6.n / (cfg.endo.length + 2)) - 1));
        if (method === 'var') {
          var m = E.varFit(ds6.columns, ds6.names, p, { trend: cfg.trend });
          m._lagSel = E.selectVarLag(ds6.columns, ds6.names, Math.min(8, p + 4), cfg.trend);
          m._irf = E.varIRF(m, cfg.irfH, true);
          try { m._fevd = E.varFEVD(m, cfg.irfH); } catch (e) { m._fevd = null; }
          return m;
        } else {
          var bm = E.bvar(ds6.columns, ds6.names, p, { lambda1: cfg.lambda1, lambda2: cfg.lambda2, lambda3: cfg.lambda3, trend: cfg.trend });
          var bands = E.irfWithBands(bm, cfg.irfH, 160);
          bm._irf = bands.point; bm._irfBands = { lower: bands.lower, upper: bands.upper };
          try { bm._fevd = E.varFEVD(bm, cfg.irfH); } catch (e) { bm._fevd = null; }
          return bm;
        }
      }
      throw new Error('Unknown method');
    }

    function runPanel() {
      var txt = (panelCsv || '').trim(); if (!txt) throw new Error('Paste long-format data: columns entity,time,y,x1,x2,…');
      var lines = txt.split(/\r?\n/).filter(function (l) { return l.trim(); });
      var head = lines[0].split(/[,\t]/).map(function (h) { return h.trim(); });
      if (head.length < 4) throw new Error('Need ≥ 4 columns: entity, time, y, x1[, x2…]');
      var data = []; for (var i = 1; i < lines.length; i++) { var c = lines[i].split(/[,\t]/); var x = []; for (var j = 3; j < head.length; j++) x.push(parseFloat(c[j])); var row = { entity: c[0], time: c[1], y: parseFloat(c[2]), x: x }; if (isFinite(row.y) && x.every(isFinite)) data.push(row); }
      if (data.length < 6) throw new Error('Too few valid rows.');
      var names = head.slice(3);
      var res = E.panel(data, names, { effects: cfg.effects });
      res._yName = head[2];
      return res;
    }

    function saveModel() {
      var name = window.prompt('Save model as:', METHODS.find(function (m) { return m.id === method; }).label + ' ' + new Date().toLocaleDateString());
      if (!name) return;
      var entry = { id: 'm' + Date.now(), name: name, method: method, cfg: cfg, cleaning: cleaning, vars: vars.map(function (v) { return v.uid; }), at: new Date().toISOString() };
      var next = [entry].concat(saved).slice(0, 50); setSaved(next); persist(null, next);
    }
    function loadModel(entry) { setMethod(entry.method); setCfg(Object.assign({ y: null, x: [], endo: [], setvars: [], one: null, lags: 2, trend: 'c', robust: 'none', lambda1: 0.2, lambda2: 0.5, lambda3: 1, corrMethod: 'pearson', effects: 'fixed', irfH: 12 }, entry.cfg)); if (entry.cleaning) setCleaning(entry.cleaning); setResult(null); }
    function delModel(id) { var next = saved.filter(function (s) { return s.id !== id; }); setSaved(next); persist(null, next); }

    var loggedIn = cloudEnabled();
    var curMethod = METHODS.find(function (m) { return m.id === method; });

    return (
      <section className="an-lab">
        <div className="an-topbar">
          <div className="an-title">Analysis <span className="an-title-sub">· econometric workbench</span></div>
          <div className="an-method-chips">
            {METHODS.map(function (m) { return <button key={m.id} className={'an-mchip ' + (method === m.id ? 'on' : '')} title={m.desc} onClick={function () { setMethod(m.id); setResult(null); setErr(''); }}><span className="an-mchip-g">{m.glyph}</span>{m.label}</button>; })}
          </div>
          <div className="an-topbar-sp" />
          <span className={'an-sync an-sync-' + sync}>{sync === 'saving' ? '⟳ Saving…' : sync === 'saved' ? '☁ Saved' : sync === 'local' ? '✓ Local' : (loggedIn ? '☁ Cloud' : '✓ Local')}</span>
          <button className="an-btn" onClick={saveModel}>＋ Save model</button>
        </div>

        <div className="an-grid">
          {/* LEFT — data + variables */}
          <aside className="an-rail">
            <div className="an-rail-h">Data <button className="an-add" onClick={function () { setPicker({ target: 'tray' }); }}>＋ Add series</button></div>
            <div className="an-tray">
              {!vars.length && <div className="an-empty">No series yet. Click <b>＋ Add series</b> to search live + Refinitiv macro data, then drag them into your model.</div>}
              {vars.map(function (vd) { return <VarChip key={vd.uid} vd={vd} n={(seriesMap[vd.uid] || []).length || null} onTransform={setTransform} onAgg={setAgg} onRemove={removeVar} />; })}
            </div>
            {saved.length > 0 && <div className="an-saved">
              <div className="an-rail-h">Saved models</div>
              {saved.map(function (s) { return <div key={s.id} className="an-saved-row"><span className="an-saved-name" onClick={function () { loadModel(s); }} title={s.name}>{s.name}</span><span className="an-saved-m">{s.method}</span><button className="an-var-x" onClick={function () { delModel(s.id); }}>×</button></div>; })}
            </div>}
          </aside>

          {/* CENTER — model builder + run */}
          <div className="an-center">
            <div className="an-builder">
              <div className="an-builder-h">{curMethod.glyph} {curMethod.label}<span className="an-builder-desc">{curMethod.desc}</span></div>

              {(method === 'ols' || method === 'loglinear' || method === 'coint') && (
                <div className="an-eq">
                  <Slot role="y" vd={byUid[cfg.y]} placeholder="Y (dependent)" onClick={function () { setPicker({ target: 'y' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { y: uid }); }); }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { y: null }); }); }} />
                  <span className="an-eq-op">=</span><span className="an-eq-c">c</span>
                  {cfg.x.map(function (uid, i) { return <span key={uid} className="an-eq-x"><span className="an-eq-op">+</span><span className="an-beta">β{i + 1}</span><Slot vd={byUid[uid]} onClick={function () { setPicker({ target: 'xswap', idx: i }); }} onDrop={function (u2) { setCfg(function (c) { var nx = c.x.slice(); if (i < nx.length) nx[i] = u2; return Object.assign({}, c, { x: nx }); }); }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { x: c.x.filter(function (u) { return u !== uid; }) }); }); }} /></span>; })}
                  <Slot vd={null} placeholder="+ regressor" onClick={function () { setPicker({ target: 'x' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { x: c.x.indexOf(uid) > -1 ? c.x : c.x.concat([uid]) }); }); }} />
                  <span className="an-eq-err">+ ε</span>
                  {method === 'loglinear' && <div className="an-note an-note-inline">Level variables are auto-logged (ln). A coefficient on ln X is an <b>elasticity</b>; on a level X it's a semi-elasticity. Override per variable in the tray.</div>}
                  {method === 'coint' && <div className="an-note an-note-inline">Use <b>levels</b> (not differences) here. Engle-Granger tests whether the residual of Y on X is stationary — i.e. a genuine long-run relationship rather than a spurious one.</div>}
                  {method !== 'coint' && <div className="an-opt"><label>Std. errors</label><select value={cfg.robust} onChange={function (e) { setCfg(Object.assign({}, cfg, { robust: e.target.value })); }}><option value="none">Classical</option><option value="hc1">Robust (HC1)</option><option value="hac">HAC (Newey-West)</option></select></div>}
                </div>
              )}

              {(method === 'var' || method === 'bvar') && (
                <div className="an-multi">
                  <div className="an-drop" onDragOver={function (e) { e.preventDefault(); e.currentTarget.classList.add('drag'); }} onDragLeave={function (e) { e.currentTarget.classList.remove('drag'); }} onDrop={function (e) { e.preventDefault(); e.currentTarget.classList.remove('drag'); var uid = e.dataTransfer.getData('text/uid'); if (uid) setCfg(function (c) { return c.endo.indexOf(uid) < 0 ? Object.assign({}, c, { endo: c.endo.concat([uid]) }) : c; }); }}>
                    <div className="an-drop-h">Endogenous variables <span className="an-dim">(order matters for Cholesky IRF)</span></div>
                    <div className="an-drop-items">
                      {cfg.endo.map(function (uid, i) { return <span key={uid} className="an-tag">{i + 1}. {byUid[uid] ? byUid[uid].label : uid}<button onClick={function () { setCfg(Object.assign({}, cfg, { endo: cfg.endo.filter(function (u) { return u !== uid; }) })); }}>×</button></span>; })}
                      <button className="an-tag-add" onClick={function () { setPicker({ target: 'endo' }); }}>＋ add / drop here</button>
                    </div>
                  </div>
                  <div className="an-opts">
                    <div className="an-opt"><label>Lags (p)</label><input type="number" min="1" max="12" value={cfg.lags} onChange={function (e) { setCfg(Object.assign({}, cfg, { lags: +e.target.value || 1 })); }} /></div>
                    <div className="an-opt"><label>Trend</label><select value={cfg.trend} onChange={function (e) { setCfg(Object.assign({}, cfg, { trend: e.target.value })); }}><option value="c">Constant</option><option value="ct">Const+Trend</option><option value="n">None</option></select></div>
                    <div className="an-opt"><label>IRF horizon</label><input type="number" min="4" max="48" value={cfg.irfH} onChange={function (e) { setCfg(Object.assign({}, cfg, { irfH: +e.target.value || 12 })); }} /></div>
                    {method === 'bvar' && <div className="an-opt"><label title="Overall prior tightness — smaller = tighter to the random-walk prior">λ₁ tight</label><input type="number" step="0.05" min="0.01" max="2" value={cfg.lambda1} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda1: +e.target.value })); }} /></div>}
                    {method === 'bvar' && <div className="an-opt"><label title="Cross-variable shrinkage — smaller = other variables' lags shrunk harder toward 0">λ₂ cross</label><input type="number" step="0.05" min="0.01" max="1" value={cfg.lambda2} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda2: +e.target.value })); }} /></div>}
                    {method === 'bvar' && <div className="an-opt"><label title="Lag-decay exponent — higher = distant lags shrunk harder">λ₃ decay</label><input type="number" step="0.5" min="0.5" max="3" value={cfg.lambda3} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda3: +e.target.value })); }} /></div>}
                  </div>
                </div>
              )}

              {(method === 'corr' || method === 'descriptive' || method === 'granger') && (
                <div className="an-multi">
                  <div className="an-drop" onDragOver={function (e) { e.preventDefault(); e.currentTarget.classList.add('drag'); }} onDragLeave={function (e) { e.currentTarget.classList.remove('drag'); }} onDrop={function (e) { e.preventDefault(); e.currentTarget.classList.remove('drag'); var uid = e.dataTransfer.getData('text/uid'); if (uid) setCfg(function (c) { return c.setvars.indexOf(uid) < 0 ? Object.assign({}, c, { setvars: c.setvars.concat([uid]) }) : c; }); }}>
                    <div className="an-drop-h">Variables</div>
                    <div className="an-drop-items">
                      {cfg.setvars.map(function (uid) { return <span key={uid} className="an-tag">{byUid[uid] ? byUid[uid].label : uid}<button onClick={function () { setCfg(Object.assign({}, cfg, { setvars: cfg.setvars.filter(function (u) { return u !== uid; }) })); }}>×</button></span>; })}
                      <button className="an-tag-add" onClick={function () { setPicker({ target: 'set' }); }}>＋ add / drop here</button>
                    </div>
                  </div>
                  <div className="an-opts">
                    {method === 'corr' && <div className="an-opt"><label>Method</label><select value={cfg.corrMethod} onChange={function (e) { setCfg(Object.assign({}, cfg, { corrMethod: e.target.value })); }}><option value="pearson">Pearson</option><option value="spearman">Spearman</option></select></div>}
                    {method === 'granger' && <div className="an-opt"><label>Lags</label><input type="number" min="1" max="12" value={cfg.lags} onChange={function (e) { setCfg(Object.assign({}, cfg, { lags: +e.target.value || 2 })); }} /></div>}
                  </div>
                </div>
              )}

              {(method === 'adf' || method === 'acf') && (
                <div className="an-multi">
                  <div className="an-eq"><span className="an-eq-lbl">{method === 'adf' ? 'Test series' : 'Series'}</span><Slot vd={byUid[cfg.one]} placeholder="pick a variable" onClick={function () { setPicker({ target: 'one' }); }} onDrop={function (uid) { setCfg(Object.assign({}, cfg, { one: uid })); }} onClear={function () { setCfg(Object.assign({}, cfg, { one: null })); }} /></div>
                  {method === 'adf' && <div className="an-opts"><div className="an-opt"><label>Deterministic</label><select value={cfg.trend} onChange={function (e) { setCfg(Object.assign({}, cfg, { trend: e.target.value })); }}><option value="c">Constant</option><option value="ct">Const+Trend</option><option value="n">None</option></select></div><span className="an-dim">Lag length auto-selected by AIC.</span></div>}
                </div>
              )}

              {method === 'panel' && (
                <div className="an-multi">
                  <div className="an-note">Panel uses <b>long-format</b> data. Paste/upload columns: <code>entity, time, y, x1, x2, …</code></div>
                  <textarea className="an-panel-csv" placeholder={'country,year,gdp,inv,cpi\nUS,2018,2.9,21.0,2.4\nUS,2019,2.3,20.1,1.8\nID,2018,5.2,32.0,3.2\n…'} value={panelCsv} onChange={function (e) { setPanelCsv(e.target.value); }} />
                  <div className="an-opts"><div className="an-opt"><label>Effects</label><select value={cfg.effects} onChange={function (e) { setCfg(Object.assign({}, cfg, { effects: e.target.value })); }}><option value="fixed">Fixed effects</option><option value="random">Random effects</option><option value="pooled">Pooled OLS</option></select></div></div>
                </div>
              )}

              <div className="an-runrow">
                {method !== 'panel' && <div className="an-clean"><label>Frequency</label><select value={cleaning.freq} onChange={function (e) { setCleaning({ freq: e.target.value }); }}>{FREQS.map(function (f) { return <option key={f.id} value={f.id}>{f.label}</option>; })}</select><span className="an-dim">aligned by date intersection · missing rows dropped</span></div>}
                <span className="an-topbar-sp" />
                <button className="an-run" disabled={running} onClick={run}>{running ? '⟳ Running…' : '▶ Run analysis'}</button>
              </div>
              {err && <div className="an-err">{err}</div>}
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="an-results">
            {!result && !running && <div className="an-empty an-results-empty">Build a model and hit <b>Run analysis</b>. Results — coefficients, diagnostics, IRFs, heatmaps — appear here.</div>}
            {running && <div className="an-running"><div className="an-running-bar" />Computing…</div>}
            {result && R && <R.ResultView result={result} yName={result._yName} vars={byUid} />}
          </div>
        </div>

        {picker && <SeriesPicker title={picker.target === 'y' ? 'Choose the dependent variable (Y)' : picker.target === 'x' ? 'Add a regressor (X)' : 'Add a data series'} onClose={function () { setPicker(null); }} onPick={onPick} />}
      </section>
    );
  }

  window.AnalysisLab = AnalysisLab;
})();
