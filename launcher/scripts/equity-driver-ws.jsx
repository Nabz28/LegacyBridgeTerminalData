// ================================================================
// equity-driver-ws.jsx — LBC Equity Driver Lab (window.EquityDriverLab).
// Lets an equity researcher link a company's financial metric (revenue,
// EBIT, margin, …) to macro drivers and quantify the relationship:
//   • Driver Regression — metric = c + Σβⱼ·driverⱼ (levels/changes, HAC SE)
//   • Elasticity (log-log) — βⱼ read directly as % metric per % driver
//   • Correlation — quick screen of metric vs each driver
// then run a SCENARIO: shock each macro driver by ±%, see the implied move
// in the financial metric (per-driver contribution + predicted level).
// Y comes from a pasted (date,value) series or auto-pull (equity-statements);
// X reuses the macro data layer. Workspaces save per-account to
// public.equity_driver_workspace. Reuses window.Econ / DriverData /
// AnalysisData / AnalysisResults / AnalysisViz.
// ================================================================
(function () {
  'use strict';
  var E = window.Econ, DD = window.DriverData, R = window.AnalysisResults, Viz = window.AnalysisViz;
  var SB = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  var COL = { line: '#97AAC5', line2: '#19C37D', line3: '#FF5C70' };

  // ---- per-account cloud sync (same pattern as the Analysis lab) ----
  function lbcSession() { try { var s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch (e) { return null; } }
  function lbcToken() { var s = lbcSession(); return s ? s.token : null; }
  function lbcSub() { var s = lbcSession(); return (s && s.user) ? s.user.id : null; }
  function cloudEnabled() { return !!(lbcToken() && lbcSub()); }
  function cloudLoad() {
    if (!cloudEnabled()) return Promise.resolve(null);
    return fetch(SB + '/equity_driver_workspace?user_sub=eq.' + encodeURIComponent(lbcSub()) + '&select=doc', { headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken() } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (rows) { return (rows && rows[0] && rows[0].doc) ? rows[0].doc : null; });
  }
  function cloudSave(doc) {
    if (!cloudEnabled()) return Promise.resolve(false);
    return fetch(SB + '/equity_driver_workspace', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_sub: lbcSub(), doc: doc, updated_at: new Date().toISOString() }]) })
      .then(function (r) { if (!r.ok) return Promise.reject('HTTP ' + r.status); return true; });
  }
  var LOCAL_KEY = 'lbcEquityDriverWorkspace';

  var METHODS = [
    { id: 'driver', glyph: 'β', label: 'Driver Regression', desc: 'metric = c + Σβⱼ·driverⱼ + ε · levels or changes · HAC SE + diagnostics' },
    { id: 'elasticity', glyph: 'ln', label: 'Elasticity (log-log)', desc: 'logs metric & level drivers — βⱼ = % move in the metric per % move in the driver' },
    { id: 'corr', glyph: 'ρ', label: 'Correlation screen', desc: 'Pearson correlation of the metric with each macro driver' }
  ];

  // ---- helpers ----
  function aggVals(arr, how) {
    if (!arr || !arr.length) return null;
    if (how === 'sum') return arr.reduce(function (a, b) { return a + b; }, 0);
    if (how === 'last') return arr[arr.length - 1];
    if (how === 'first') return arr[0];
    return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; // mean
  }
  // Bucket a YYYY-MM-DD date to a period key matching the metric frequency.
  function periodKey(date, freq) {
    var s = String(date);
    if (freq === 'annual') return s.slice(0, 4);
    var mo = parseInt(s.slice(5, 7), 10) || 1;
    return s.slice(0, 4) + '-Q' + Math.ceil(mo / 3);
  }
  function driverAlias(d) {
    var t = (E.TRANSFORMS.find(function (x) { return x.id === d.transform; }) || {}).label || d.transform;
    var base = d.transform === 'level' ? d.label : d.label + ' [' + t + ']';
    return d.lag > 0 ? base + ' (−' + d.lag + ')' : base;
  }
  var fmtNum = function (v, d) { if (v == null || !isFinite(v)) return '—'; d = d == null ? 2 : d; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  function fmtMoney(v, ccy) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), s; if (a >= 1e12) s = (v / 1e12).toFixed(2) + 'T'; else if (a >= 1e9) s = (v / 1e9).toFixed(2) + 'B'; else if (a >= 1e6) s = (v / 1e6).toFixed(2) + 'M'; else if (a >= 1e3) s = (v / 1e3).toFixed(2) + 'K'; else s = fmtNum(v, 2); return (ccy ? ccy + ' ' : '') + s; }

  // ===================== macro driver picker =====================
  function DriverPicker(props) {
    var _s = React.useState(''), q = _s[0], setQ = _s[1];
    var _r = React.useState(null), rows = _r[0], setRows = _r[1];
    var _c = React.useState('us'), country = _c[0], setCountry = _c[1];
    var _l = React.useState(false), loading = _l[0], setLoading = _l[1];
    React.useEffect(function () {
      var alive = true; setLoading(true);
      var t = setTimeout(function () {
        DD.searchMacro(q, { country: country }).then(function (res) { if (alive) { setRows(res); setLoading(false); } }).catch(function () { if (alive) { setRows([]); setLoading(false); } });
      }, 220);
      return function () { alive = false; clearTimeout(t); };
    }, [q, country]);
    return (
      <div className="an-modal-bg" onClick={props.onClose}>
        <div className="an-modal" onClick={function (e) { e.stopPropagation(); }}>
          <div className="an-modal-h"><span>Add a macro driver (X)</span><button className="an-modal-x" onClick={props.onClose}>×</button></div>
          <div className="an-modal-search">
            <input autoFocus placeholder="Search live + Refinitiv macro data…  (e.g. CPO, oil, USDIDR, CPI, GDP, rates)" value={q}
              onChange={function (e) { setQ(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Escape') { e.preventDefault(); props.onClose(); } else if (e.key === 'Enter' && rows && rows.length) { e.preventDefault(); props.onPick(rows[0]); } }} />
            <div className="an-ctry">{DD.REF_COUNTRIES.map(function (c) { return <button key={c.id} className={'an-ctry-btn ' + (country === c.id ? 'on' : '')} onClick={function () { setCountry(c.id); }} title={'Refinitiv country: ' + c.label}>{c.label}</button>; })}</div>
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

  // ===================== driver chip =====================
  function DriverChip(props) {
    var d = props.d;
    return (
      <div className="an-var">
        <div className="an-var-top">
          <span className={'an-src an-src-' + (d.source || '').toLowerCase().replace(/[^a-z]/g, '')}>{d.source === 'Refinitiv' ? 'RIC' : d.source}</span>
          <span className="an-var-label" title={d.label}>{d.label}</span>
          <button className="an-var-x" title="Remove" onClick={function () { props.onRemove(d.uid); }}>×</button>
        </div>
        <div className="an-var-bot">
          <select className="an-tf" value={d.transform} onChange={function (e) { props.onChange(d.uid, { transform: e.target.value }); }} title="Transform applied to the driver">
            {E.TRANSFORMS.map(function (t) { return <option key={t.id} value={t.id}>{t.label}</option>; })}
          </select>
          <label className="ed-lag" title="Lag the driver by N periods — useful when macro moves feed through to financials with a delay">lag
            <input type="number" min="0" max="8" value={d.lag} onChange={function (e) { props.onChange(d.uid, { lag: Math.max(0, +e.target.value || 0) }); }} />
          </label>
          <select className="an-tf" value={d.agg || 'mean'} onChange={function (e) { props.onChange(d.uid, { agg: e.target.value }); }} title="How to collapse higher-frequency macro data into each metric period">
            <option value="mean">Avg</option><option value="last">Last</option><option value="sum">Sum</option>
          </select>
          <span className="an-var-n">{props.n != null ? props.n + ' obs' : ''}</span>
        </div>
      </div>
    );
  }

  // ===================== scenario panel =====================
  function ScenarioPanel(props) {
    var scen = props.scen;
    var _sh = React.useState({}), shocks = _sh[0], setShocks = _sh[1];
    function setShock(uid, v) { setShocks(function (m) { var n = Object.assign({}, m); n[uid] = v; return n; }); }

    var rows = scen.drivers.map(function (d) {
      var shock = parseFloat(shocks[d.uid]); if (!isFinite(shock)) shock = 0;
      if (scen.elasticity) {
        var dLn = d.logged ? d.beta * Math.log(1 + shock / 100) : d.beta * (d.lastModeled * shock / 100);
        return { d: d, shock: shock, dLn: dLn };
      }
      var dX = d.lastModeled * shock / 100;
      return { d: d, shock: shock, dX: dX, dY: d.beta * dX };
    });

    var predicted, totalDelta, pctDelta, contribVals;
    if (scen.elasticity) {
      var sumLn = rows.reduce(function (a, r) { return a + (isFinite(r.dLn) ? r.dLn : 0); }, 0);
      predicted = scen.baseY * Math.exp(sumLn);
      totalDelta = predicted - scen.baseY;
      pctDelta = (Math.exp(sumLn) - 1) * 100;
      contribVals = rows.map(function (r) { return (Math.exp(r.dLn) - 1) * 100; }); // ≈ % contribution
    } else {
      totalDelta = rows.reduce(function (a, r) { return a + (isFinite(r.dY) ? r.dY : 0); }, 0);
      predicted = scen.baseY + totalDelta;
      pctDelta = scen.baseY ? totalDelta / scen.baseY * 100 : NaN;
      contribVals = rows.map(function (r) { return r.dY; });
    }
    var any = rows.some(function (r) { return r.shock !== 0; });

    return (
      <div className="ed-scenario">
        <div className="ed-scen-h">Scenario — shock the macro drivers</div>
        <div className="an-note">Enter a % move for each driver (e.g. +10 = the macro variable is 10% higher than its latest period). The model implies the move in <b>{scen.metricLabel}</b>{scen.elasticity ? ' (elasticity / multiplicative)' : ' (level model / additive contributions)'}.</div>
        <table className="an-table ed-scen-tbl">
          <thead><tr><th>Driver</th><th>β</th><th>Shock %</th><th>{scen.elasticity ? 'Contribution ≈ %Δ' : 'Contribution Δ'}</th></tr></thead>
          <tbody>{rows.map(function (r, i) { return (
            <tr key={r.d.uid}>
              <td className="an-vn" title={r.d.label}>{r.d.label}</td>
              <td className="an-num">{fmtNum(r.d.beta, 4)}</td>
              <td className="an-num"><input className="ed-shock" type="number" step="1" value={shocks[r.d.uid] == null ? '' : shocks[r.d.uid]} placeholder="0" onChange={function (e) { setShock(r.d.uid, e.target.value); }} /></td>
              <td className="an-num">{scen.elasticity ? (fmtNum(contribVals[i], 2) + '%') : fmtMoney(contribVals[i], scen.currency)}</td>
            </tr>
          ); })}</tbody>
        </table>
        {any && Viz && <div className="an-chart-card" style={{ marginTop: 10 }}><div className="an-chart-h">Per-driver contribution</div><Viz.Bars values={contribVals} labels={scen.drivers.map(function (d) { return d.label; })} /></div>}
        <div className="ed-scen-out">
          <div className="ed-scen-cell"><span className="ed-scen-l">Base ({scen.baseKey})</span><span className="ed-scen-v">{fmtMoney(scen.baseY, scen.currency)}</span></div>
          <div className="ed-scen-cell"><span className="ed-scen-l">Predicted</span><span className="ed-scen-v">{fmtMoney(predicted, scen.currency)}</span></div>
          <div className="ed-scen-cell"><span className="ed-scen-l">Δ</span><span className={'ed-scen-v ' + (totalDelta >= 0 ? 'pos' : 'neg')}>{(totalDelta >= 0 ? '+' : '') + fmtMoney(totalDelta, scen.currency)} ({(pctDelta >= 0 ? '+' : '') + fmtNum(pctDelta, 2)}%)</span></div>
        </div>
        {scen.elasticity && <div className="an-note">Elasticity scenario compounds multiplicatively; per-driver figures are first-order approximations. Coefficients on non-logged (Δ/growth) drivers are semi-elasticities, not pure elasticities.</div>}
      </div>
    );
  }

  // ===================== main lab =====================
  function EquityDriverLab() {
    var METRIC0 = { label: '', freq: 'quarterly', series: [], source: '', ticker: '', metricId: 'revenue', currency: null, rawPaste: '' };
    var _met = React.useState(METRIC0), metric = _met[0], setMetric = _met[1];
    var _drv = React.useState([]), drivers = _drv[0], setDrivers = _drv[1];
    var _sm = React.useState({}), seriesMap = _sm[0], setSeriesMap = _sm[1];
    var _m = React.useState('driver'), method = _m[0], setMethod = _m[1];
    var _cfg = React.useState({ robust: 'hac' }), cfg = _cfg[0], setCfg = _cfg[1];
    var _res = React.useState(null), result = _res[0], setResult = _res[1];
    var _run = React.useState(false), running = _run[0], setRunning = _run[1];
    var _err = React.useState(''), err = _err[0], setErr = _err[1];
    var _pick = React.useState(false), picking = _pick[0], setPicking = _pick[1];
    var _note = React.useState(''), pullNote = _note[0], setPullNote = _note[1];
    var _pull = React.useState(false), pulling = _pull[0], setPulling = _pull[1];
    var _saved = React.useState([]), saved = _saved[0], setSaved = _saved[1];
    var _sync = React.useState('idle'), sync = _sync[0], setSync = _sync[1];
    var loaded = React.useRef(false);
    var saveTimer = React.useRef(null);

    // boot: load workspace (cloud-first, local fallback)
    React.useEffect(function () {
      cloudLoad().then(function (doc) {
        if (!doc) { try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { } }
        if (doc) hydrate(doc);
      }).catch(function () { try { var d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (d) hydrate(d); } catch (e) { } })
        .then(function () { loaded.current = true; });
    }, []);
    React.useEffect(function () { return function () { if (saveTimer.current) clearTimeout(saveTimer.current); }; }, []);

    function hydrate(doc) {
      if (doc.metric) setMetric(Object.assign({}, METRIC0, doc.metric));
      if (doc.method) setMethod(doc.method);
      if (doc.cfg) setCfg(Object.assign({ robust: 'hac' }, doc.cfg));
      if (doc.saved) setSaved(doc.saved);
      if (doc.drivers && doc.drivers.length) {
        setDrivers(doc.drivers);
        doc.drivers.forEach(function (d) { fetchDriver(d); });
      }
    }

    function persist(over) {
      var doc = Object.assign({
        v: 1,
        metric: { label: metric.label, freq: metric.freq, series: metric.series, source: metric.source, ticker: metric.ticker, metricId: metric.metricId, currency: metric.currency, rawPaste: metric.rawPaste },
        drivers: drivers.map(function (d) { return { uid: d.uid, kind: d.kind, label: d.label, source: d.source, seriesId: d.seriesId, ric: d.ric, transform: d.transform, lag: d.lag, agg: d.agg }; }),
        method: method, cfg: cfg, saved: saved, updated: new Date().toISOString()
      }, over || {});
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch (e) { }
      if (cloudEnabled()) {
        setSync('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(function () { cloudSave(doc).then(function () { setSync('saved'); setTimeout(function () { setSync('idle'); }, 1500); }).catch(function () { setSync('local'); }); }, 700);
      }
    }
    // persist whenever the model definition changes (after initial load)
    React.useEffect(function () { if (loaded.current) persist(); }, [metric, drivers, method, cfg]);

    function fetchDriver(d) {
      DD.fetchMacro({ uid: d.uid, kind: d.kind, source: d.source, seriesId: d.seriesId, ric: d.ric })
        .then(function (s) { setSeriesMap(function (m) { var n = Object.assign({}, m); n[d.uid] = s; return n; }); })
        .catch(function () { });
    }
    function addDriver(item) {
      if (drivers.some(function (d) { return d.uid === item.uid; })) { setPicking(false); return; }
      var d = { uid: item.uid, kind: item.kind, label: item.label, source: item.source, seriesId: item.seriesId, ric: item.ric, transform: 'level', lag: 0, agg: 'mean' };
      setDrivers(drivers.concat([d]));
      fetchDriver(d);
      setPicking(false);
    }
    function removeDriver(uid) { setDrivers(drivers.filter(function (d) { return d.uid !== uid; })); }
    function changeDriver(uid, patch) { setDrivers(drivers.map(function (d) { return d.uid === uid ? Object.assign({}, d, patch) : d; })); }

    function parsePaste() {
      var r = DD.parseSeries(metric.rawPaste || '');
      if (!r.series.length) { setErr('Could not parse any (date, value) rows. Use one period per line, e.g.  2023-Q1, 12500   or   2022, 48.3'); return; }
      setErr(''); setPullNote(r.bad ? (r.bad + ' line(s) skipped (unparseable).') : '');
      setMetric(Object.assign({}, metric, { series: r.series, source: 'paste' }));
    }
    function autoFill() {
      if (!metric.ticker.trim()) { setErr('Enter a ticker to auto-fill (e.g. AAPL, MSFT). IDX .JK names usually have no Yahoo fundamentals — paste instead.'); return; }
      setErr(''); setPulling(true); setPullNote('Pulling ' + metric.ticker + '…');
      DD.autoPull(metric.ticker.trim(), metric.metricId, metric.freq).then(function (out) {
        setPulling(false);
        if (out.series && out.series.length) {
          var lbl = metric.label || (metric.ticker.trim().toUpperCase() + ' ' + (DD.METRICS.find(function (m) { return m.id === metric.metricId; }) || {}).label);
          setMetric(Object.assign({}, metric, { series: out.series, source: 'auto', currency: out.currency || metric.currency, label: lbl }));
          setPullNote(out.note || (out.series.length + ' periods pulled.'));
        } else { setPullNote(out.note || 'No data returned.'); }
      }).catch(function (e) { setPulling(false); setPullNote('Auto-pull failed (' + e + ') — paste the series instead.'); });
    }

    // Align metric (Y) + drivers (X) on PERIOD KEYS, transform + lag, drop nulls.
    function buildDriverDataset(elasticity) {
      if (!metric.series || metric.series.length < 4) return { error: 'Add the financial metric (Y) first — paste a (date, value) series or auto-fill from a ticker.' };
      if (!drivers.length) return { error: 'Add at least one macro driver (X) from the tray.' };
      var freq = metric.freq;
      var yMap = {}; metric.series.forEach(function (o) { yMap[periodKey(o.date, freq)] = o.value; });
      var yKeys = Object.keys(yMap).sort();
      var dmaps = [];
      for (var i = 0; i < drivers.length; i++) {
        var d = drivers[i], s = seriesMap[d.uid];
        if (!s || !s.length) return { error: 'Driver "' + d.label + '" is still loading (or returned no data) — try again in a moment.' };
        var buckets = {}; s.forEach(function (o) { var k = periodKey(o.date, freq); (buckets[k] = buckets[k] || []).push(o.value); });
        var m = {}; Object.keys(buckets).forEach(function (k) { m[k] = aggVals(buckets[k], d.agg || 'mean'); });
        dmaps.push(m);
      }
      var keys = yKeys.filter(function (k) { return dmaps.every(function (mm) { return mm[k] != null && isFinite(mm[k]); }); });
      if (keys.length < 6) return { error: 'Only ' + keys.length + ' overlapping ' + freq + ' periods between the metric and the driver(s) (need ≥ 6). Paste more history or pick drivers with a longer common span.' };
      var yLevel = keys.map(function (k) { return yMap[k]; });
      var xLevel = dmaps.map(function (mm) { return keys.map(function (k) { return mm[k]; }); });
      var yCol = elasticity ? E.transform(yLevel, 'log') : yLevel.slice();
      var xCols = drivers.map(function (d, j) {
        var tf = (elasticity && d.transform === 'level') ? 'log' : d.transform;
        var col = E.transform(xLevel[j], tf, { k: 1 });
        if (d.lag > 0) col = E.transform(col, 'lag', { k: d.lag });
        return col;
      });
      var keep = [];
      for (var r = 0; r < keys.length; r++) {
        var ok = (yCol[r] != null && isFinite(yCol[r]));
        for (var c = 0; ok && c < xCols.length; c++) { var vv = xCols[c][r]; if (vv == null || !isFinite(vv)) ok = false; }
        if (ok) keep.push(r);
      }
      if (keep.length < 6) return { error: 'Only ' + keep.length + ' usable periods after transforms/lags (they drop leading rows). Reduce lags, change transforms, or add more history.' };
      var yK = keep.map(function (r) { return yCol[r]; });
      var yLevelK = keep.map(function (r) { return yLevel[r]; });
      var xK = xCols.map(function (col) { return keep.map(function (r) { return col[r]; }); });
      var names = drivers.map(function (d) { return (elasticity && d.transform === 'level') ? ('ln ' + driverAlias(d)) : driverAlias(d); });
      return { y: yK, x: xK, names: names, dates: keep.map(function (r) { return keys[r]; }), n: keep.length, baseY: yLevelK[yLevelK.length - 1], baseKey: keep.length ? keys[keep[keep.length - 1]] : '' , xModeled: xK };
    }

    function run() {
      setErr(''); setRunning(true);
      setTimeout(function () {
        try { setResult(compute()); }
        catch (e) { setErr(String(e && e.message || e)); setResult(null); }
        setRunning(false);
      }, 20);
    }

    function compute() {
      if (method === 'corr') {
        var dc = buildDriverDataset(false); if (dc.error) throw new Error(dc.error);
        var cols = [dc.y].concat(dc.x), nm = [metric.label || 'Metric'].concat(dc.names);
        var cm = E.corrMatrix(cols, nm, { method: 'pearson' });
        return { method: 'corr', names: cm.names, matrix: cm.matrix, n: cm.n, methodKind: 'pearson' };
      }
      var elasticity = method === 'elasticity';
      var ds = buildDriverDataset(elasticity); if (ds.error) throw new Error(ds.error);
      var res = E.ols(ds.y, ds.x, { names: ds.names, robust: cfg.robust });
      res._yName = elasticity ? ('ln ' + (metric.label || 'Metric')) : (metric.label || 'Metric');
      res._dates = ds.dates; res._n = ds.n; res._logged = elasticity;
      res._scen = {
        elasticity: elasticity, baseY: ds.baseY, baseKey: ds.baseKey, currency: metric.currency, metricLabel: metric.label || 'Metric',
        drivers: drivers.map(function (d, j) {
          var col = ds.xModeled[j];
          return { uid: d.uid, label: driverAlias(d), transform: d.transform, lag: d.lag, beta: res.coef[j + 1], lastModeled: col[col.length - 1], logged: elasticity && d.transform === 'level' };
        })
      };
      return res;
    }

    function saveModel() {
      var name = window.prompt('Save model as:', (metric.label || 'Driver model') + ' · ' + (METHODS.find(function (m) { return m.id === method; }) || {}).label);
      if (!name) return;
      var entry = { id: 'm' + Date.now(), name: name, method: method, cfg: cfg, metric: { label: metric.label, freq: metric.freq, series: metric.series, source: metric.source, ticker: metric.ticker, metricId: metric.metricId, currency: metric.currency, rawPaste: metric.rawPaste }, drivers: drivers, at: new Date().toISOString() };
      var next = [entry].concat(saved).slice(0, 40); setSaved(next);
    }
    function loadModel(entry) {
      setMethod(entry.method); if (entry.cfg) setCfg(Object.assign({ robust: 'hac' }, entry.cfg));
      if (entry.metric) setMetric(Object.assign({}, METRIC0, entry.metric));
      if (entry.drivers) { setDrivers(entry.drivers); setSeriesMap({}); entry.drivers.forEach(function (d) { fetchDriver(d); }); }
      setResult(null); setErr('');
    }
    function delModel(id) { setSaved(saved.filter(function (s) { return s.id !== id; })); }

    var curMethod = METHODS.find(function (m) { return m.id === method; });
    var loggedIn = cloudEnabled();
    var yReady = metric.series && metric.series.length >= 4;
    var metricLabels = DD.METRICS;
    var spark = metric.series && metric.series.length ? metric.series.map(function (o) { return o.value; }) : null;
    var eqOp = method === 'elasticity' ? 'ln ' : '';

    return (
      <section className="an-lab ed-lab">
        <div className="an-topbar">
          <div className="an-title">Equity Driver Lab <span className="an-title-sub">· macro → financial drivers</span></div>
          <div className="an-method-wrap">
            <span className="an-method-lbl">Model</span>
            <select className="an-method-select" value={method} onChange={function (e) { setMethod(e.target.value); setResult(null); setErr(''); }}>
              {METHODS.map(function (m) { return <option key={m.id} value={m.id}>{m.glyph + '  ' + m.label}</option>; })}
            </select>
            <span className="an-method-caret">▾</span>
          </div>
          <div className="an-topbar-sp" />
          <span className={'an-sync an-sync-' + sync}>{sync === 'saving' ? '⟳ Saving…' : sync === 'saved' ? '☁ Saved' : sync === 'local' ? '✓ Local' : (loggedIn ? '☁ Cloud' : '✓ Local')}</span>
          <button className="an-btn" onClick={saveModel}>＋ Save model</button>
        </div>

        <div className="an-grid">
          {/* LEFT — metric (Y) + drivers (X) */}
          <aside className="an-rail">
            <div className="an-rail-h">Financial metric (Y)</div>
            <div className="ed-metric">
              <input className="ed-input" placeholder="Label  (e.g. BBCA Revenue)" value={metric.label} onChange={function (e) { setMetric(Object.assign({}, metric, { label: e.target.value })); }} />
              <div className="ed-freq">
                {[['quarterly', 'Quarterly'], ['annual', 'Annual']].map(function (f) { return <button key={f[0]} className={'ed-freq-btn ' + (metric.freq === f[0] ? 'on' : '')} onClick={function () { setMetric(Object.assign({}, metric, { freq: f[0] })); }}>{f[1]}</button>; })}
              </div>
              <div className="ed-paste-h">Paste a (date, value) series</div>
              <textarea className="ed-paste" placeholder={'2023-Q1, 12500\n2023-Q2, 13100\n2023-Q3, 12880\n…\nor  2021, 48.3   /   31/12/2022  52.1'} value={metric.rawPaste} onChange={function (e) { setMetric(Object.assign({}, metric, { rawPaste: e.target.value })); }} />
              <button className="an-btn ed-btn-wide" onClick={parsePaste}>Parse pasted series</button>
              <div className="ed-or">— or auto-pull (US / global fundamentals) —</div>
              <div className="ed-pull">
                <input className="ed-input ed-tick" placeholder="Ticker (AAPL)" value={metric.ticker} onChange={function (e) { setMetric(Object.assign({}, metric, { ticker: e.target.value })); }} />
                <select className="an-tf ed-metricsel" value={metric.metricId} onChange={function (e) { setMetric(Object.assign({}, metric, { metricId: e.target.value })); }}>
                  {metricLabels.map(function (m) { return <option key={m.id} value={m.id}>{m.label}</option>; })}
                </select>
              </div>
              <button className="an-btn ed-btn-wide" disabled={pulling} onClick={autoFill}>{pulling ? '⟳ Pulling…' : '⤓ Auto-fill from ticker'}</button>
              {pullNote && <div className="ed-note">{pullNote}</div>}
              {yReady && <div className="ed-yok">✓ {metric.series.length} periods{metric.currency ? ' · ' + metric.currency : ''}{metric.source === 'paste' ? ' · pasted' : metric.source === 'auto' ? ' · auto' : ''}</div>}
              {spark && Viz && <div className="ed-spark"><Viz.MiniLine series={[{ name: 'Y', values: spark, color: COL.line2 }]} labels={metric.series.map(function (o) { return o.date; })} height={64} /></div>}
            </div>

            <div className="an-rail-h" style={{ marginTop: 12 }}>Macro drivers (X) <button className="an-add" onClick={function () { setPicking(true); }}>＋ Add driver</button></div>
            <div className="an-tray">
              {!drivers.length && <div className="an-empty">No drivers yet. Click <b>＋ Add driver</b> to search live + Refinitiv macro data (CPO, oil, FX, CPI, rates…), then set a transform / lag.</div>}
              {drivers.map(function (d) { return <DriverChip key={d.uid} d={d} n={(seriesMap[d.uid] || []).length || null} onChange={changeDriver} onRemove={removeDriver} />; })}
            </div>

            {saved.length > 0 && <div className="an-saved">
              <div className="an-rail-h">Saved models</div>
              {saved.map(function (s) { return <div key={s.id} className="an-saved-row"><span className="an-saved-name" onClick={function () { loadModel(s); }} title={s.name}>{s.name}</span><span className="an-saved-m">{s.method}</span><button className="an-var-x" onClick={function () { delModel(s.id); }}>×</button></div>; })}
            </div>}
          </aside>

          {/* CENTER — model + run + scenario */}
          <div className="an-center">
            <div className="an-builder">
              <div className="an-builder-h">{curMethod.glyph} {curMethod.label}<span className="an-builder-desc">{curMethod.desc}</span></div>

              <div className="an-eq ed-eq">
                <span className="an-slot filled an-slot-y"><span className="an-slot-lbl">{eqOp}{metric.label || 'metric'}</span></span>
                <span className="an-eq-op">=</span><span className="an-eq-c">c</span>
                {drivers.map(function (d, i) { return <span key={d.uid} className="an-eq-x"><span className="an-eq-op">+</span><span className="an-beta">β{i + 1}</span><span className="an-slot filled"><span className="an-slot-lbl">{(method === 'elasticity' && d.transform === 'level') ? 'ln ' : ''}{driverAlias(d)}</span></span></span>; })}
                {!drivers.length && <span className="an-slot empty"><span className="an-slot-ph">add drivers →</span></span>}
                <span className="an-eq-err">+ ε</span>
              </div>

              {method === 'elasticity' && <div className="an-note an-note-inline">Metric & level drivers are auto-logged. Each <b>β</b> on a logged driver is an <b>elasticity</b> — a 1% move in the driver implies a β% move in the metric. Drivers left on Δ/growth give semi-elasticities.</div>}
              {method === 'driver' && <div className="an-note an-note-inline">Levels regression. For trending series prefer <b>Δ / % growth / Δln</b> transforms to avoid spurious fits, and use <b>HAC</b> standard errors. Add a <b>lag</b> if macro feeds through with a delay.</div>}
              {method === 'corr' && <div className="an-note an-note-inline">Quick screen — Pearson correlation of the metric with each driver (and among drivers). Not a causal/predictive model; use it to shortlist drivers before regressing.</div>}

              {method !== 'corr' && <div className="an-opts">
                <div className="an-opt"><label>Std. errors</label><select value={cfg.robust} onChange={function (e) { setCfg(Object.assign({}, cfg, { robust: e.target.value })); }}><option value="hac">HAC (Newey-West)</option><option value="hc1">Robust (HC1)</option><option value="none">Classical</option></select></div>
              </div>}

              <div className="an-runrow">
                <span className="an-dim">aligned on {metric.freq === 'annual' ? 'fiscal years' : 'fiscal quarters'} · drivers bucketed to each period</span>
                <span className="an-topbar-sp" />
                <button className="an-run" disabled={running} onClick={run}>{running ? '⟳ Running…' : '▶ Run model'}</button>
              </div>
              {err && <div className="an-err">{err}</div>}
            </div>

            {result && result._scen && <ScenarioPanel scen={result._scen} />}
          </div>

          {/* RIGHT — results */}
          <div className="an-results">
            {!result && !running && <div className="an-empty an-results-empty">Set the financial metric (Y), add macro drivers (X), then <b>Run model</b>. Coefficients, fit, diagnostics — and a driver scenario — appear here.</div>}
            {running && <div className="an-running"><div className="an-running-bar" />Computing…</div>}
            {result && R && <R.ResultView result={result} yName={result._yName} vars={{}} />}
          </div>
        </div>

        {picking && <DriverPicker onClose={function () { setPicking(false); }} onPick={addDriver} />}
      </section>
    );
  }

  window.EquityDriverLab = EquityDriverLab;
})();
