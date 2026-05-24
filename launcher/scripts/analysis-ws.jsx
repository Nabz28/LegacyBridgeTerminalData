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

  // build: 'eq'=Y+X equation, 'one'=single series, 'multi'=endogenous set,
  // 'set'=variable set, 'arima'=Y+order(+xreg), 'panel'=long CSV.
  var METHODS = [
    { id: 'ols', group: 'Regression', build: 'eq', glyph: 'β', label: 'OLS Regression', desc: 'Y = c + ΣβⱼXⱼ + ε · HC1 / Newey-West SE + diagnostics' },
    { id: 'loglinear', group: 'Regression', build: 'eq', glyph: 'ln', label: 'Log-Linear (elasticities)', desc: 'auto-logs level variables' },
    { id: 'factor', group: 'Regression', build: 'eq', glyph: 'ƒ', label: 'Factor · CAPM · Fama-French', desc: 'alpha + factor betas on excess returns (HAC SE)' },
    { id: 'rolling', group: 'Regression', build: 'eq', glyph: '↻', label: 'Rolling Regression (β)', desc: 'time-varying coefficients over a moving window' },
    { id: 'quantile', group: 'Regression', build: 'eq', glyph: 'τ', label: 'Quantile Regression', desc: 'conditional-quantile (τ) regression' },
    { id: 'logit', group: 'Regression', build: 'eq', glyph: '⌇', label: 'Logistic Regression', desc: 'binary outcome (recession/default prob) · IRLS' },
    { id: 'chow', group: 'Regression', build: 'eq', glyph: '⊻', label: 'Chow Break Test', desc: 'structural-break F-test at a split point' },
    { id: 'arima', group: 'Time Series', build: 'arima', glyph: 'φ', label: 'ARIMA · ARIMAX · SARIMA · SARIMAX', desc: 'Box-Jenkins (p,d,q)(P,D,Q)ₛ + exogenous + forecast' },
    { id: 'ets', group: 'Time Series', build: 'one', glyph: '⌁', label: 'Exponential Smoothing (ETS)', desc: 'Holt-Winters level/trend/seasonal + forecast' },
    { id: 'hp', group: 'Time Series', build: 'one', glyph: '∿', label: 'HP Filter (trend / cycle)', desc: 'Hodrick-Prescott output-gap decomposition' },
    { id: 'decompose', group: 'Time Series', build: 'one', glyph: '❍', label: 'Seasonal Decomposition', desc: 'trend + seasonal + remainder (additive/mult.)' },
    { id: 'adf', group: 'Time Series', build: 'one', glyph: '√', label: 'ADF / Stationarity', desc: 'Augmented Dickey-Fuller (AIC lag) + p-value' },
    { id: 'acf', group: 'Time Series', build: 'one', glyph: '⟂', label: 'ACF / PACF', desc: 'autocorrelation & partial autocorrelation' },
    { id: 'garch', group: 'Volatility', build: 'one', glyph: 'σ', label: 'GARCH · GJR-GARCH', desc: 'conditional volatility (MLE) for risk / VaR' },
    { id: 'var', group: 'Multivariate (VAR)', build: 'multi', glyph: 'V', label: 'VAR', desc: 'vector autoregression · lag-select · Cholesky IRF / FEVD' },
    { id: 'svar', group: 'Multivariate (VAR)', build: 'multi', glyph: 'S', label: 'Structural VAR (SVAR)', desc: 'recursive or Blanchard-Quah long-run identification' },
    { id: 'bvar', group: 'Multivariate (VAR)', build: 'multi', glyph: 'B', label: 'Bayesian VAR', desc: 'Minnesota prior + posterior IRF bands' },
    { id: 'coint', group: 'Cointegration', build: 'eq', glyph: '∫', label: 'Engle-Granger', desc: 'single-equation long-run test (spurious-regression guard)' },
    { id: 'johansen', group: 'Cointegration', build: 'multi', glyph: '∮', label: 'Johansen', desc: 'trace & max-eigenvalue cointegration rank' },
    { id: 'vecm', group: 'Cointegration', build: 'multi', glyph: 'Ω', label: 'VECM', desc: 'vector error-correction (cointegrated systems)' },
    { id: 'corr', group: 'Statistics', build: 'set', glyph: 'ρ', label: 'Correlation', desc: 'Pearson / Spearman matrix' },
    { id: 'pca', group: 'Statistics', build: 'set', glyph: '⊕', label: 'PCA', desc: 'principal components (yield-curve / factor extraction)' },
    { id: 'descriptive', group: 'Statistics', build: 'set', glyph: 'Σ', label: 'Descriptive', desc: 'summary statistics + distribution' },
    { id: 'granger', group: 'Statistics', build: 'set', glyph: '→', label: 'Granger Causality', desc: 'predictive-causality F-tests' },
    { id: 'panel', group: 'Panel', build: 'panel', glyph: '▦', label: 'Panel (FE / RE)', desc: 'fixed / random effects · cluster SE · Hausman' }
  ];
  var METHOD_GROUPS = ['Regression', 'Time Series', 'Volatility', 'Multivariate (VAR)', 'Cointegration', 'Statistics', 'Panel'];
  var FREQS = [{ id: 'auto', label: 'Auto (detect)' }, { id: '', label: 'Native (exact dates)' }, { id: 'W', label: 'Weekly' }, { id: 'M', label: 'Monthly' }, { id: 'Q', label: 'Quarterly' }, { id: 'A', label: 'Annual' }];

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
    var CFG0 = { y: null, x: [], endo: [], setvars: [], one: null, lags: 2, trend: 'c', robust: 'none', lambda1: 0.2, lambda2: 0.5, lambda3: 1, corrMethod: 'pearson', effects: 'fixed', irfH: 12,
      p: 1, d: 0, q: 0, P: 0, D: 0, Q: 0, s: 12, h: 12, ident: 'recursive', hpLambda: 1600, tau: 0.5, win: 36, gjr: false, decType: 'add', rank: 1, breakPct: 50 };
    var _cfg = React.useState(CFG0), cfg = _cfg[0], setCfg = _cfg[1];
    var _cl = React.useState({ freq: 'auto' }), cleaning = _cl[0], setCleaning = _cl[1];
    var _res = React.useState(null), result = _res[0], setResult = _res[1];
    var _run = React.useState(false), running = _run[0], setRunning = _run[1];
    var _err = React.useState(''), err = _err[0], setErr = _err[1];
    var _pick = React.useState(null), picker = _pick[0], setPicker = _pick[1];   // {target:'tray'|'y'|'x'|'endo'|...}
    var _saved = React.useState([]), saved = _saved[0], setSaved = _saved[1];
    var _sync = React.useState('idle'), sync = _sync[0], setSync = _sync[1];
    var _panel = React.useState(''), panelCsv = _panel[0], setPanelCsv = _panel[1];
    var _tab = React.useState('res'), resTab = _tab[0], setResTab = _tab[1];        // 'res' | 'data'
    var loaded = React.useRef(false);
    var saveTimer = React.useRef(null);
    var resultsRef = React.useRef(null);

    var byUid = {}; vars.forEach(function (v) { byUid[v.uid] = v; });

    // The variable uids that feed the current method (mirrors compute()'s picks).
    function activeUids() {
      var b = (METHODS.find(function (m) { return m.id === method; }) || {}).build;
      if (b === 'one') return cfg.one ? [cfg.one] : [];
      if (b === 'arima' || b === 'eq') return (cfg.y ? [cfg.y] : []).concat(cfg.x || []);
      if (b === 'multi') return (cfg.endo || []).slice();
      if (b === 'set') return (cfg.setvars || []).slice();
      return [];
    }

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
      var freqMode = cleaning.freq;  // 'auto' | '' (native) | 'W'|'M'|'Q'|'A'
      // Per-variable native-frequency detection (drives the freq strip + auto align).
      var detected = uids.map(function (uid) {
        var s = seriesMap[uid]; var d = s && s.length ? E.detectFreq(s) : null;
        return { uid: uid, label: byUid[uid] ? byUid[uid].label : uid, freq: d };
      });
      // Resolve the alignment frequency: 'auto' -> coarsest detected.
      var freq = freqMode;
      if (freqMode === 'auto') freq = E.autoFreq(uids.map(function (uid) { return seriesMap[uid] || []; })).id;
      var resampled = uids.map(function (uid) {
        var vd = byUid[uid], s = seriesMap[uid]; if (!vd || !s) return null;
        return { vd: vd, series: freq ? E.resample(s, freq, vd.agg || 'last') : s.slice() };
      });
      if (resampled.some(function (r) { return !r || !r.series.length; })) return { error: 'Some series are still loading (or returned no data) — try again in a moment.' };
      var alignedRaw = E.alignVars(resampled.map(function (r) { return { name: r.vd.label, series: r.series }; }), {});
      var fl = (E.FREQ_LABEL[freq] || 'native').toLowerCase();
      if (alignedRaw.n < 5) return { error: 'Only ' + alignedRaw.n + ' overlapping ' + fl + ' observations across the chosen series. Their date ranges barely overlap — pick a longer common span or a lower frequency' + (!freq ? ' (mixed native frequencies rarely share exact dates — switch Frequency to Auto).' : '.') };
      var tcols = alignedRaw.columns.map(function (col, i) { return E.transform(col, tf(byUid[uids[i]]), { k: byUid[uids[i]].k || 1 }); });
      var keep = [];
      for (var r = 0; r < alignedRaw.n; r++) { var ok = true; for (var c = 0; c < tcols.length; c++) { var v = tcols[c][r]; if (v == null || !isFinite(v)) { ok = false; break; } } if (ok) keep.push(r); }
      if (keep.length < 8) return { error: 'Only ' + keep.length + ' usable observations after transforms (lags/diffs drop leading rows). Lower the frequency, shorten lags, or add more history.' };
      return {
        dates: keep.map(function (r) { return alignedRaw.dates[r]; }),
        names: uids.map(function (uid) { var vd = byUid[uid]; return (ddopts.forceLog && vd.transform === 'level') ? ('ln ' + vd.label) : alias(vd); }),
        columns: tcols.map(function (col) { return keep.map(function (r) { return col[r]; }); }),
        n: keep.length, freq: freq, freqMode: freqMode, perYear: (E.FREQ_PER_YEAR[freq] || 252), detected: detected,
        dropped: alignedRaw.n - keep.length
      };
    }

    function run() {
      setErr(''); setRunning(true);
      setTimeout(function () {  // let spinner paint
        try {
          var res = compute();
          setResult(res); setResTab('res');
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
      if (method === 'garch') {
        if (!cfg.one) throw new Error('Pick a series (returns / Δln, not levels).');
        var dg = buildDataset([cfg.one]); if (dg.error) throw new Error(dg.error);
        var rg = E.garch(dg.columns[0], { gjr: cfg.gjr }); if (rg.error) throw new Error(rg.error);
        rg._name = dg.names[0]; rg._dates = dg.dates; return rg;
      }
      if (method === 'hp') {
        if (!cfg.one) throw new Error('Pick a series.');
        var dh = buildDataset([cfg.one]); if (dh.error) throw new Error(dh.error);
        var rh = E.hpFilter(dh.columns[0], cfg.hpLambda); if (rh.error) throw new Error(rh.error);
        rh._name = dh.names[0]; rh._series = dh.columns[0]; rh._dates = dh.dates; return rh;
      }
      if (method === 'ets') {
        if (!cfg.one) throw new Error('Pick a series.');
        var de = buildDataset([cfg.one]); if (de.error) throw new Error(de.error);
        var re = E.ets(de.columns[0], { trend: cfg.etsTrend !== false, seasonal: cfg.etsSeason || 'none', s: cfg.s, h: cfg.h }); if (re.error) throw new Error(re.error);
        re._name = de.names[0]; re._series = de.columns[0]; return re;
      }
      if (method === 'decompose') {
        if (!cfg.one) throw new Error('Pick a series.');
        var dd = buildDataset([cfg.one]); if (dd.error) throw new Error(dd.error);
        var rd = E.seasonalDecompose(dd.columns[0], cfg.s, cfg.etsSeason === 'mul' ? 'mul' : 'add'); if (rd.error) throw new Error(rd.error);
        rd._name = dd.names[0]; rd._series = dd.columns[0]; return rd;
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
      if (method === 'factor') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set the asset (Y) and at least one factor (X).');
        var dsf = buildDataset([cfg.y].concat(cfg.x)); if (dsf.error) throw new Error(dsf.error);
        var ppy = dsf.perYear || 12;
        var rf = E.factorModel(dsf.columns[0], dsf.columns.slice(1), { names: dsf.names.slice(1), robust: cfg.robust === 'none' ? 'hac' : cfg.robust, periodsPerYear: ppy });
        rf._yName = dsf.names[0]; return rf;
      }
      if (method === 'rolling') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set Y and at least one X.');
        var dsr = buildDataset([cfg.y].concat(cfg.x)); if (dsr.error) throw new Error(dsr.error);
        if (cfg.win >= dsr.n) throw new Error('Window (' + cfg.win + ') ≥ observations (' + dsr.n + '). Use a smaller window.');
        var rr = E.rollingOls(dsr.columns[0], dsr.columns.slice(1), { window: cfg.win, names: dsr.names.slice(1) });
        rr._yName = dsr.names[0]; rr._dates = dsr.dates; return rr;
      }
      if (method === 'quantile') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set Y and at least one X.');
        var dsq = buildDataset([cfg.y].concat(cfg.x)); if (dsq.error) throw new Error(dsq.error);
        var rq = E.quantReg(dsq.columns[0], dsq.columns.slice(1), { tau: cfg.tau, names: dsq.names.slice(1) });
        rq._yName = dsq.names[0]; return rq;
      }
      if (method === 'logit') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set a binary Y (0/1) and at least one X.');
        var dsl = buildDataset([cfg.y].concat(cfg.x)); if (dsl.error) throw new Error(dsl.error);
        var rl = E.logit(dsl.columns[0], dsl.columns.slice(1), { names: dsl.names.slice(1) });
        if (rl.error) throw new Error(rl.error); rl._yName = dsl.names[0]; return rl;
      }
      if (method === 'chow') {
        if (!cfg.y || !cfg.x.length) throw new Error('Set Y and at least one X.');
        var dsch = buildDataset([cfg.y].concat(cfg.x)); if (dsch.error) throw new Error(dsch.error);
        var bk = Math.max(2, Math.min(dsch.n - 2, Math.round(dsch.n * (cfg.breakPct / 100))));
        var rc = E.chow(dsch.columns[0], dsch.columns.slice(1), bk);
        rc._breakDate = dsch.dates[bk]; return rc;
      }
      if (method === 'arima') {
        if (!cfg.y) throw new Error('Pick the series (Y).');
        var uidsA = [cfg.y].concat(cfg.x);
        var dsA = buildDataset(uidsA); if (dsA.error) throw new Error(dsA.error);
        var ar = E.arima(dsA.columns[0], { p: cfg.p, d: cfg.d, q: cfg.q, P: cfg.P, D: cfg.D, Q: cfg.Q, s: cfg.s, h: cfg.h, xreg: cfg.x.length ? dsA.columns.slice(1) : null, xnames: dsA.names.slice(1) });
        if (ar.error) throw new Error(ar.error);
        if (!ar.forecast || !ar.forecast.length) throw new Error('ARIMA could not fit this series (too few observations, or it is too smooth/constant). Try a longer/cleaner series, fewer terms, or ETS.');
        ar._yName = dsA.names[0]; ar._dates = dsA.dates; return ar;
      }
      if (method === 'corr') {
        if (cfg.setvars.length < 2) throw new Error('Pick at least 2 variables.');
        var ds3 = buildDataset(cfg.setvars); if (ds3.error) throw new Error(ds3.error);
        var cm = E.corrMatrix(ds3.columns, ds3.names, { method: cfg.corrMethod });
        return { method: 'corr', names: cm.names, matrix: cm.matrix, n: cm.n, methodKind: cfg.corrMethod };
      }
      if (method === 'pca') {
        if (cfg.setvars.length < 2) throw new Error('Pick at least 2 variables.');
        var dp = buildDataset(cfg.setvars); if (dp.error) throw new Error(dp.error);
        var rp = E.pca(dp.columns, dp.names, {}); if (rp.error) throw new Error(rp.error); return rp;
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
      if (method === 'svar') {
        if (cfg.endo.length < 2) throw new Error('SVAR needs at least 2 endogenous variables.');
        var dss = buildDataset(cfg.endo); if (dss.error) throw new Error(dss.error);
        var ps = Math.max(1, Math.min(cfg.lags, Math.floor(dss.n / (cfg.endo.length + 2)) - 1));
        var sv = E.svar(dss.columns, dss.names, ps, { trend: cfg.trend, ident: cfg.ident, horizon: cfg.irfH }); if (sv.error) throw new Error(sv.error);
        sv._irf = sv.irf; sv._fevd = sv.fevd; return sv;
      }
      if (method === 'johansen') {
        if (cfg.endo.length < 2) throw new Error('Johansen needs at least 2 variables.');
        var dsj = buildDataset(cfg.endo); if (dsj.error) throw new Error(dsj.error);
        var rj = E.johansen(dsj.columns, dsj.names, cfg.lags, { det: cfg.trend === 'n' ? 'n' : 'c' }); if (rj.error) throw new Error(rj.error); return rj;
      }
      if (method === 'vecm') {
        if (cfg.endo.length < 2) throw new Error('VECM needs at least 2 variables.');
        var dsv = buildDataset(cfg.endo); if (dsv.error) throw new Error(dsv.error);
        var rv = E.vecm(dsv.columns, dsv.names, cfg.lags, { r: cfg.rank }); if (rv.error) throw new Error(rv.error); return rv;
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
    function loadModel(entry) { setMethod(entry.method); setCfg(Object.assign({}, CFG0, entry.cfg)); if (entry.cleaning) setCleaning(entry.cleaning); setResult(null); }
    function delModel(id) { var next = saved.filter(function (s) { return s.id !== id; }); setSaved(next); persist(null, next); }

    var loggedIn = cloudEnabled();
    var curMethod = METHODS.find(function (m) { return m.id === method; });

    // ---- frequency strip (live, method-independent) ----
    var uidsNow = activeUids();
    var detList = uidsNow.map(function (uid) {
      var s = seriesMap[uid];
      return { label: byUid[uid] ? byUid[uid].label : uid, d: (s && s.length) ? E.detectFreq(s) : null };
    });
    var resolvedId = cleaning.freq === 'auto'
      ? (uidsNow.length ? E.autoFreq(uidsNow.map(function (u) { return seriesMap[u] || []; })).id : null)
      : cleaning.freq;
    var resolvedLabel = cleaning.freq === '' ? 'Native (exact dates)' : (E.FREQ_LABEL[resolvedId] || '—');

    // ---- aligned dataset for the Data tab + CSV export ----
    function displayDataset() {
      if (curMethod.build === 'panel') return { error: 'Panel models use pasted long-format CSV — export from your source.' };
      if (!uidsNow.length) return { error: 'Pick the variables for this model first.' };
      return buildDataset(uidsNow);
    }
    function exportCsv() {
      var ds = displayDataset();
      if (ds.error) { setErr(ds.error); return; }
      var headers = ['Date'].concat(ds.names);
      var rows = ds.dates.map(function (d, i) { return [d].concat(ds.columns.map(function (c) { return c[i]; })); });
      window.LbcExport.saveCSV('analysis-' + method + '-' + window.LbcExport.stamp() + '.csv', { headers: headers, rows: rows });
    }
    function exportPng() {
      if (!window.LbcExport) return;
      window.LbcExport.pngFromContainer(resultsRef.current, {
        filename: 'analysis-' + method + '-' + window.LbcExport.stamp() + '.png',
        onError: function (m) { setErr(m || 'Nothing chart-like to export as PNG. Switch to a method with a chart, or use CSV.'); }
      });
    }

    return (
      <section className="an-lab">
        <div className="an-topbar">
          <div className="an-title">Analysis <span className="an-title-sub">· econometric workbench</span></div>
          <div className="an-method-wrap">
            <span className="an-method-lbl">Method</span>
            <select className="an-method-select" value={method} onChange={function (e) { setMethod(e.target.value); setResult(null); setErr(''); }}>
              {METHOD_GROUPS.map(function (g) { return <optgroup key={g} label={g}>{METHODS.filter(function (m) { return m.group === g; }).map(function (m) { return <option key={m.id} value={m.id}>{m.glyph + '  ' + m.label}</option>; })}</optgroup>; })}
            </select>
            <span className="an-method-caret">▾</span>
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

              {curMethod.build === 'eq' && (
                <div className="an-eq">
                  <Slot role="y" vd={byUid[cfg.y]} placeholder={method === 'logit' ? 'Y (binary 0/1)' : 'Y (dependent)'} onClick={function () { setPicker({ target: 'y' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { y: uid }); }); }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { y: null }); }); }} />
                  <span className="an-eq-op">=</span><span className="an-eq-c">c</span>
                  {cfg.x.map(function (uid, i) { return <span key={uid} className="an-eq-x"><span className="an-eq-op">+</span><span className="an-beta">β{i + 1}</span><Slot vd={byUid[uid]} onClick={function () { setPicker({ target: 'xswap', idx: i }); }} onDrop={function (u2) { setCfg(function (c) { var nx = c.x.slice(); if (i < nx.length) nx[i] = u2; return Object.assign({}, c, { x: nx }); }); }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { x: c.x.filter(function (u) { return u !== uid; }) }); }); }} /></span>; })}
                  <Slot vd={null} placeholder={method === 'factor' ? '+ factor' : '+ regressor'} onClick={function () { setPicker({ target: 'x' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { x: c.x.indexOf(uid) > -1 ? c.x : c.x.concat([uid]) }); }); }} />
                  <span className="an-eq-err">+ ε</span>
                  {method === 'loglinear' && <div className="an-note an-note-inline">Level variables are auto-logged (ln). A coefficient on ln X is an <b>elasticity</b>; on a level X it's a semi-elasticity.</div>}
                  {method === 'coint' && <div className="an-note an-note-inline">Use <b>levels</b> (not differences). Engle-Granger tests whether the residual of Y on X is stationary — a genuine long-run relationship vs a spurious one.</div>}
                  {method === 'factor' && <div className="an-note an-note-inline">Y = the asset's (excess) return; X = factor returns (Mkt-Rf, SMB, HML, …). The intercept is <b>Jensen's α</b> (annualized in results); slopes are factor betas.</div>}
                  {method === 'logit' && <div className="an-note an-note-inline">Y must be <b>0/1</b> (e.g. recession or default flag). Results show coefficients, odds ratios and McFadden pseudo-R².</div>}
                  {method === 'quantile' && <div className="an-note an-note-inline">Estimates the conditional <b>τ-quantile</b> of Y (median regression at τ=0.5).</div>}
                  {method === 'chow' && <div className="an-note an-note-inline">Tests whether the regression coefficients <b>break</b> at the split point below.</div>}
                  <div className="an-opts">
                    {(method === 'ols' || method === 'loglinear' || method === 'factor') && <div className="an-opt"><label>Std. errors</label><select value={cfg.robust} onChange={function (e) { setCfg(Object.assign({}, cfg, { robust: e.target.value })); }}><option value="none">Classical</option><option value="hc1">Robust (HC1)</option><option value="hac">HAC (Newey-West)</option></select></div>}
                    {method === 'rolling' && <div className="an-opt"><label>Window</label><input type="number" min="8" max="240" value={cfg.win} onChange={function (e) { setCfg(Object.assign({}, cfg, { win: +e.target.value || 36 })); }} /></div>}
                    {method === 'quantile' && <div className="an-opt"><label>τ quantile</label><input type="number" step="0.05" min="0.05" max="0.95" value={cfg.tau} onChange={function (e) { setCfg(Object.assign({}, cfg, { tau: +e.target.value })); }} /></div>}
                    {method === 'chow' && <div className="an-opt"><label>Break at %</label><input type="number" min="10" max="90" step="5" value={cfg.breakPct} onChange={function (e) { setCfg(Object.assign({}, cfg, { breakPct: +e.target.value || 50 })); }} /></div>}
                  </div>
                </div>
              )}

              {curMethod.build === 'arima' && (
                <div className="an-multi">
                  <div className="an-eq">
                    <span className="an-eq-lbl">Series</span>
                    <Slot role="y" vd={byUid[cfg.y]} placeholder="Y (the series)" onClick={function () { setPicker({ target: 'y' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { y: uid }); }); }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { y: null }); }); }} />
                    {cfg.x.length > 0 && <span className="an-eq-lbl" style={{ marginLeft: 10 }}>exog (X):</span>}
                    {cfg.x.map(function (uid) { return <Slot key={uid} vd={byUid[uid]} onClick={function () { }} onDrop={function () { }} onClear={function () { setCfg(function (c) { return Object.assign({}, c, { x: c.x.filter(function (u) { return u !== uid; }) }); }); }} />; })}
                    <Slot vd={null} placeholder="+ exog (ARIMAX)" onClick={function () { setPicker({ target: 'x' }); }} onDrop={function (uid) { setCfg(function (c) { return Object.assign({}, c, { x: c.x.indexOf(uid) > -1 ? c.x : c.x.concat([uid]) }); }); }} />
                  </div>
                  <div className="an-note an-note-inline" style={{ fontFamily: 'var(--an-mono)' }}>{(byUid[cfg.y] ? byUid[cfg.y].label : 'Y')} ~ ARIMA(<b>{cfg.p},{cfg.d},{cfg.q}</b>){(cfg.P + cfg.D + cfg.Q) > 0 ? <span>(<b>{cfg.P},{cfg.D},{cfg.Q}</b>)<sub>{cfg.s}</sub></span> : ''}{cfg.x.length ? ' + ' + cfg.x.length + ' exog' : ''}</div>
                  <div className="an-opts">
                    <span className="an-dim">non-seasonal (p,d,q):</span>
                    {[['p', 'p'], ['d', 'd'], ['q', 'q']].map(function (o) { return <div key={o[0]} className="an-opt"><label>{o[1]}</label><input type="number" min="0" max="5" value={cfg[o[0]]} onChange={function (e) { var v = +e.target.value || 0; setCfg(function (c) { var n = {}; n[o[0]] = v; return Object.assign({}, c, n); }); }} /></div>; })}
                    <span className="an-dim">‖ seasonal (P,D,Q)·s:</span>
                    {[['P', 'P'], ['D', 'D'], ['Q', 'Q'], ['s', 's']].map(function (o) { return <div key={o[0]} className="an-opt"><label>{o[1]}</label><input type="number" min="0" max={o[0] === 's' ? 24 : 3} value={cfg[o[0]]} onChange={function (e) { var v = +e.target.value || 0; setCfg(function (c) { var n = {}; n[o[0]] = v; return Object.assign({}, c, n); }); }} /></div>; })}
                    <span className="an-dim">‖</span>
                    <div className="an-opt"><label>Forecast h</label><input type="number" min="0" max="60" value={cfg.h} onChange={function (e) { setCfg(Object.assign({}, cfg, { h: +e.target.value || 0 })); }} /></div>
                  </div>
                </div>
              )}

              {curMethod.build === 'multi' && (
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
                    {(method === 'var' || method === 'svar' || method === 'bvar') && <div className="an-opt"><label>IRF horizon</label><input type="number" min="4" max="48" value={cfg.irfH} onChange={function (e) { setCfg(Object.assign({}, cfg, { irfH: +e.target.value || 12 })); }} /></div>}
                    {method === 'svar' && <div className="an-opt"><label>Identification</label><select value={cfg.ident} onChange={function (e) { setCfg(Object.assign({}, cfg, { ident: e.target.value })); }}><option value="recursive">Recursive (Cholesky)</option><option value="bq">Blanchard-Quah (long-run)</option></select></div>}
                    {method === 'vecm' && <div className="an-opt"><label title="Number of cointegrating relationships (run Johansen first)">Coint. rank r</label><input type="number" min="1" max="5" value={cfg.rank} onChange={function (e) { setCfg(Object.assign({}, cfg, { rank: +e.target.value || 1 })); }} /></div>}
                    {method === 'bvar' && <div className="an-opt"><label title="Overall prior tightness — smaller = tighter to the random-walk prior">λ₁ tight</label><input type="number" step="0.05" min="0.01" max="2" value={cfg.lambda1} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda1: +e.target.value })); }} /></div>}
                    {method === 'bvar' && <div className="an-opt"><label title="Cross-variable shrinkage — smaller = other variables' lags shrunk harder toward 0">λ₂ cross</label><input type="number" step="0.05" min="0.01" max="1" value={cfg.lambda2} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda2: +e.target.value })); }} /></div>}
                    {method === 'bvar' && <div className="an-opt"><label title="Lag-decay exponent — higher = distant lags shrunk harder">λ₃ decay</label><input type="number" step="0.5" min="0.5" max="3" value={cfg.lambda3} onChange={function (e) { setCfg(Object.assign({}, cfg, { lambda3: +e.target.value })); }} /></div>}
                  </div>
                </div>
              )}

              {curMethod.build === 'set' && (
                <div className="an-multi">
                  <div className="an-drop" onDragOver={function (e) { e.preventDefault(); e.currentTarget.classList.add('drag'); }} onDragLeave={function (e) { e.currentTarget.classList.remove('drag'); }} onDrop={function (e) { e.preventDefault(); e.currentTarget.classList.remove('drag'); var uid = e.dataTransfer.getData('text/uid'); if (uid) setCfg(function (c) { return c.setvars.indexOf(uid) < 0 ? Object.assign({}, c, { setvars: c.setvars.concat([uid]) }) : c; }); }}>
                    <div className="an-drop-h">Variables{method === 'pca' ? ' (≥2 — standardized to a correlation-matrix PCA)' : ''}</div>
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

              {curMethod.build === 'one' && (
                <div className="an-multi">
                  <div className="an-eq"><span className="an-eq-lbl">{method === 'adf' ? 'Test series' : 'Series'}</span><Slot vd={byUid[cfg.one]} placeholder="pick a variable" onClick={function () { setPicker({ target: 'one' }); }} onDrop={function (uid) { setCfg(Object.assign({}, cfg, { one: uid })); }} onClear={function () { setCfg(Object.assign({}, cfg, { one: null })); }} /></div>
                  <div className="an-opts">
                    {method === 'adf' && <div className="an-opt"><label>Deterministic</label><select value={cfg.trend} onChange={function (e) { setCfg(Object.assign({}, cfg, { trend: e.target.value })); }}><option value="c">Constant</option><option value="ct">Const+Trend</option><option value="n">None</option></select></div>}
                    {method === 'adf' && <span className="an-dim">Lag length auto-selected by AIC.</span>}
                    {method === 'garch' && <div className="an-opt"><label title="Add the GJR asymmetry term (leverage effect)">GJR asymmetry</label><input type="checkbox" checked={cfg.gjr} onChange={function (e) { setCfg(Object.assign({}, cfg, { gjr: e.target.checked })); }} /></div>}
                    {method === 'garch' && <span className="an-dim">Tip: model returns/changes (Δln), not levels.</span>}
                    {method === 'hp' && <div className="an-opt"><label title="HP smoothing: 1600 quarterly, 129600 monthly, 6.25 annual">λ smoothing</label><input type="number" min="1" value={cfg.hpLambda} onChange={function (e) { setCfg(Object.assign({}, cfg, { hpLambda: +e.target.value || 1600 })); }} /></div>}
                    {method === 'ets' && <div className="an-opt"><label>Trend</label><input type="checkbox" checked={cfg.etsTrend !== false} onChange={function (e) { setCfg(Object.assign({}, cfg, { etsTrend: e.target.checked })); }} /></div>}
                    {(method === 'ets' || method === 'decompose') && <div className="an-opt"><label>Seasonal</label><select value={cfg.etsSeason || (method === 'decompose' ? 'add' : 'none')} onChange={function (e) { setCfg(Object.assign({}, cfg, { etsSeason: e.target.value })); }}><option value="none">None</option><option value="add">Additive</option><option value="mul">Multiplicative</option></select></div>}
                    {(method === 'ets' || method === 'decompose') && <div className="an-opt"><label title="Seasonal period: 4 quarterly · 12 monthly · 52 weekly · 5 or 7 daily">Period s</label><input type="number" min="2" max="366" value={cfg.s} onChange={function (e) { setCfg(Object.assign({}, cfg, { s: +e.target.value || 12 })); }} /></div>}
                    {method === 'ets' && <div className="an-opt"><label>Forecast h</label><input type="number" min="1" max="60" value={cfg.h} onChange={function (e) { setCfg(Object.assign({}, cfg, { h: +e.target.value || 12 })); }} /></div>}
                  </div>
                </div>
              )}

              {curMethod.build === 'panel' && (
                <div className="an-multi">
                  <div className="an-note">Panel uses <b>long-format</b> data. Paste/upload columns: <code>entity, time, y, x1, x2, …</code></div>
                  <textarea className="an-panel-csv" placeholder={'country,year,gdp,inv,cpi\nUS,2018,2.9,21.0,2.4\nUS,2019,2.3,20.1,1.8\nID,2018,5.2,32.0,3.2\n…'} value={panelCsv} onChange={function (e) { setPanelCsv(e.target.value); }} />
                  <div className="an-opts"><div className="an-opt"><label>Effects</label><select value={cfg.effects} onChange={function (e) { setCfg(Object.assign({}, cfg, { effects: e.target.value })); }}><option value="fixed">Fixed effects</option><option value="random">Random effects</option><option value="pooled">Pooled OLS</option></select></div></div>
                </div>
              )}

              {curMethod.build !== 'panel' && detList.length > 0 && (
                <div className="an-freqstrip">
                  {detList.map(function (it, i) {
                    return <span key={i} className="an-freqchip" title={it.d ? (it.d.n + ' obs' + (it.d.gapDays != null ? ' · ~' + it.d.gapDays + 'd median gap' : '')) : 'still loading'}>
                      <span className="an-freqchip-lbl">{it.label}</span>
                      <span className={'an-freqchip-f' + (it.d && resolvedId && it.d.id !== resolvedId ? ' an-freqchip-coerced' : '')}>{it.d ? it.d.label : '…'}</span>
                    </span>;
                  })}
                  <span className="an-freqarrow">→ aligned to</span>
                  <span className="an-freqchip an-freqchip-out"><span className="an-freqchip-f">{resolvedLabel}</span></span>
                </div>
              )}
              <div className="an-runrow">
                {curMethod.build !== 'panel' && <div className="an-clean"><label>Frequency</label><select value={cleaning.freq} onChange={function (e) { setCleaning({ freq: e.target.value }); }}>{FREQS.map(function (f) { return <option key={f.id} value={f.id}>{f.label}</option>; })}</select><span className="an-dim">{cleaning.freq === 'auto' ? 'auto = align to the coarsest series · missing rows dropped' : 'aligned by date intersection · missing rows dropped'}</span></div>}
                <span className="an-topbar-sp" />
                <button className="an-run" disabled={running} onClick={run}>{running ? '⟳ Running…' : '▶ Run analysis'}</button>
              </div>
              {err && <div className="an-err">{err}</div>}
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="an-results">
            {result && (
              <div className="an-resbar">
                <div className="an-restabs">
                  <button className={'an-restab' + (resTab === 'res' ? ' on' : '')} onClick={function () { setResTab('res'); }}>Results</button>
                  <button className={'an-restab' + (resTab === 'data' ? ' on' : '')} onClick={function () { setResTab('data'); }}>Data</button>
                </div>
                <div className="an-resexp">
                  <button className="an-exp-btn" onClick={exportCsv} title="Download the aligned dataset as CSV">↓ CSV</button>
                  {resTab === 'res' && <button className="an-exp-btn" onClick={exportPng} title="Download the chart as a white-background PNG">↓ PNG</button>}
                </div>
              </div>
            )}
            <div className="an-res-body" ref={resultsRef}>
              {!result && !running && <div className="an-empty an-results-empty">Build a model and hit <b>Run analysis</b>. Results — coefficients, diagnostics, IRFs, heatmaps — appear here.</div>}
              {running && <div className="an-running"><div className="an-running-bar" />Computing…</div>}
              {result && resTab === 'data' && (function () {
                var ds = displayDataset();
                if (ds.error) return <div className="an-err">{ds.error}</div>;
                var headers = ['Date'].concat(ds.names);
                var rows = ds.dates.map(function (d, i) { return [d].concat(ds.columns.map(function (c) { return c[i]; })); });
                return <window.LbcDataGrid title="Aligned dataset" freqBadge={(resolvedLabel || 'native') + (cleaning.freq === 'auto' ? ' · auto' : '')} headers={headers} rows={rows} note={ds.n + ' rows after alignment' + (ds.dropped ? ' · ' + ds.dropped + ' dropped (lags/diffs/NA)' : '')} filename={'analysis-' + method + '-data-' + window.LbcExport.stamp() + '.csv'} maxHeight={460} />;
              })()}
              {result && resTab === 'res' && R && <R.ResultView result={result} yName={result._yName} vars={byUid} />}
            </div>
          </div>
        </div>

        {picker && <SeriesPicker title={picker.target === 'y' ? 'Choose the dependent variable (Y)' : picker.target === 'x' ? 'Add a regressor (X)' : 'Add a data series'} onClose={function () { setPicker(null); }} onPick={onPick} />}
      </section>
    );
  }

  window.AnalysisLab = AnalysisLab;
})();
