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
  // unit-aware formatter — money aggregates get B/M/K; ratios print %/pp; per-share keeps the currency but no magnitude suffix.
  function fmtMetric(v, kind, ccy, isDelta) {
    if (v == null || !isFinite(v)) return '—';
    if (kind === 'percent') return fmtNum(v, 2) + (isDelta ? ' pp' : '%');
    if (kind === 'pershare') return (ccy ? ccy + ' ' : '') + fmtNum(v, 2);
    if (kind === 'index') return fmtNum(v, 2);
    var a = Math.abs(v), s; // currency
    if (a >= 1e12) s = (v / 1e12).toFixed(2) + 'T'; else if (a >= 1e9) s = (v / 1e9).toFixed(2) + 'B'; else if (a >= 1e6) s = (v / 1e6).toFixed(2) + 'M'; else if (a >= 1e3) s = (v / 1e3).toFixed(2) + 'K'; else s = fmtNum(v, 2);
    return (ccy ? ccy + ' ' : '') + s;
  }
  // dedupe display names so the correlation matrix / coef table never collide on identical labels
  function dedupeNames(names) { var seen = {}; return names.map(function (n) { if (seen[n] == null) { seen[n] = 0; return n; } seen[n]++; return n + ' #' + (seen[n] + 1); }); }
  // detect the apparent cadence of a pasted series (so we can warn on a freq mismatch)
  function detectCadence(series) {
    if (!series || series.length < 2) return null;
    var allDec = series.every(function (o) { return /-12-31$/.test(String(o.date)) || /^\d{4}$/.test(String(o.date)); });
    if (allDec) return 'annual';
    // median gap in months
    var gaps = []; for (var i = 1; i < series.length; i++) { var a = new Date(series[i - 1].date), b = new Date(series[i].date); if (!isNaN(a) && !isNaN(b)) gaps.push((b - a) / (1000 * 60 * 60 * 24 * 30.4)); }
    if (!gaps.length) return null; gaps.sort(function (x, y) { return x - y; }); var med = gaps[Math.floor(gaps.length / 2)];
    return med >= 9 ? 'annual' : 'quarterly';
  }

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
    var scen = props.scen, K = scen.metricKind, ccy = scen.currency;
    var _sh = React.useState({}), shocks = _sh[0], setShocks = _sh[1];
    function setShock(uid, v) { setShocks(function (m) { var n = Object.assign({}, m); n[uid] = v; return n; }); }

    // Per driver: 'pct' shock (level-transform driver) interprets the input as a
    // % move in the driver's latest level; 'abs' (Δ/growth driver) interprets it
    // as an absolute change in the modeled (already-differenced) regressor.
    var rows = scen.drivers.map(function (d) {
      var shock = parseFloat(shocks[d.uid]); if (!isFinite(shock)) shock = 0;
      var dX = d.shockKind === 'pct' ? (d.lastLevel * shock / 100) : shock; // change in the regressor's modeled units
      if (scen.elasticity) {
        // logged driver: Δln X ≈ ln(1+s/100); else β already multiplies the modeled Δ
        var dLn = d.logged ? d.beta * Math.log(1 + shock / 100) : d.beta * dX;
        return { d: d, shock: shock, dLn: isFinite(dLn) ? dLn : 0 };
      }
      var dY = d.beta * dX;
      return { d: d, shock: shock, dX: dX, dY: isFinite(dY) ? dY : 0 };
    });

    var predicted, totalDelta, pctDelta, contribVals, pctValid;
    if (scen.elasticity) {
      var sumLn = rows.reduce(function (a, r) { return a + r.dLn; }, 0);
      predicted = scen.baseY * Math.exp(sumLn);
      totalDelta = predicted - scen.baseY;
      pctDelta = (Math.exp(sumLn) - 1) * 100; pctValid = true;
      contribVals = rows.map(function (r) { return (Math.exp(r.dLn) - 1) * 100; }); // ≈ % contribution
    } else {
      totalDelta = rows.reduce(function (a, r) { return a + r.dY; }, 0);
      predicted = scen.baseY + totalDelta;
      pctValid = !!scen.baseY; pctDelta = pctValid ? totalDelta / scen.baseY * 100 : NaN;
      contribVals = rows.map(function (r) { return r.dY; });
    }
    var any = rows.some(function (r) { return r.shock !== 0; });
    var deltaKind = scen.elasticity ? 'percent' : K;       // contribution units
    var pctStr = pctValid ? ((pctDelta >= 0 ? '+' : '') + fmtNum(pctDelta, 2) + '%') : 'n/a';

    return (
      <div className="ed-scenario">
        <div className="ed-scen-h">Scenario — shock the macro drivers</div>
        <div className="an-note">For a <b>%</b>-shock driver, enter how much higher/lower the macro variable is vs its latest period (e.g. +10). For a <b>Δ</b> driver (modelled on changes), enter the absolute change in that differenced value. The model implies the move in <b>{scen.metricLabel}</b>{scen.elasticity ? ' (elasticity / multiplicative)' : ' (level model / additive)'}{(scen.r2 != null ? ' · fit R²=' + fmtNum(scen.r2, 3) + (scen.n ? ' on ' + scen.n + ' periods' : '') : '')}.</div>
        <table className="an-table ed-scen-tbl">
          <thead><tr><th>Driver</th><th>β</th><th>Shock</th><th>Contribution {scen.elasticity ? '≈ %Δ' : 'Δ'}</th></tr></thead>
          <tbody>{rows.map(function (r, i) { return (
            <tr key={r.d.uid}>
              <td className="an-vn" title={r.d.label}>{r.d.label}{r.d.lag > 0 ? <span className="ed-lag-tag" title={'lagged ' + r.d.lag + ' period(s) — a shock today feeds the metric ' + r.d.lag + ' period(s) later'}> t+{r.d.lag}</span> : ''}</td>
              <td className="an-num">{fmtNum(r.d.beta, 4)}</td>
              <td className="an-num"><span className="ed-shock-wrap"><input className="ed-shock" type="number" step="1" value={shocks[r.d.uid] == null ? '' : shocks[r.d.uid]} placeholder="0" onChange={function (e) { setShock(r.d.uid, e.target.value); }} /><span className="ed-shock-u">{r.d.shockKind === 'pct' ? '%' : 'Δ'}</span></span></td>
              <td className="an-num">{scen.elasticity ? (fmtNum(contribVals[i], 2) + '%') : fmtMetric(contribVals[i], deltaKind, ccy, true)}</td>
            </tr>
          ); })}</tbody>
        </table>
        {any && Viz && <div className="an-chart-card" style={{ marginTop: 10 }}><div className="an-chart-h">Per-driver contribution{scen.elasticity ? ' (≈ %Δ)' : ''} — magnitudes in the table</div><Viz.Bars values={contribVals} labels={scen.drivers.map(function (d) { return d.label; })} /></div>}
        <div className="ed-scen-out">
          <div className="ed-scen-cell"><span className="ed-scen-l">Base ({scen.baseKey})</span><span className="ed-scen-v">{fmtMetric(scen.baseY, K, ccy)}</span></div>
          <div className="ed-scen-cell"><span className="ed-scen-l">Predicted</span><span className="ed-scen-v">{fmtMetric(predicted, K, ccy)}</span></div>
          <div className="ed-scen-cell"><span className="ed-scen-l">Δ</span><span className={'ed-scen-v ' + (totalDelta >= 0 ? 'pos' : 'neg')}>{(totalDelta >= 0 ? '+' : '') + fmtMetric(totalDelta, K, ccy, true)}{pctValid && K !== 'percent' ? ' (' + pctStr + ')' : ''}</span></div>
        </div>
        {scen.multiDriver && <div className="an-note">⚠ βs are <b>partial</b> (each holds the others fixed). Correlated macro drivers (e.g. CPO / FX / oil) shocked independently can double-count — check <b>Max VIF</b> in the diagnostics panel and the correlation screen before trusting the combined move.</div>}
        {scen.elasticity && <div className="an-note">Elasticity scenario compounds multiplicatively; per-driver figures are first-order approximations. βs on Δ/growth drivers are semi-elasticities, not pure elasticities.</div>}
      </div>
    );
  }

  // ===================== main lab =====================
  function EquityDriverLab() {
    var METRIC0 = { label: '', freq: 'quarterly', series: [], source: '', ticker: '', metricId: 'revenue', currency: null, rawPaste: '', kind: 'currency' };
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
    var _edit = React.useState(true), editingY = _edit[0], setEditingY = _edit[1]; // collapse Y inputs once a series is loaded
    var loaded = React.useRef(false);
    var cloudSafe = React.useRef(false);   // only auto-write to cloud after a CLEAN load (never clobber on a transient load error)
    var aliveUids = React.useRef({});      // guard against stale in-flight driver fetches re-inserting removed series
    var saveTimer = React.useRef(null);

    // boot: load workspace (cloud-first, local fallback)
    React.useEffect(function () {
      cloudLoad().then(function (doc) {
        cloudSafe.current = true;          // cloud reachable & answered — safe to write back
        if (!doc) { try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { } }
        if (doc) hydrate(doc);
      }).catch(function () { try { var d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (d) hydrate(d); } catch (e) { } /* cloud unreachable — stay local-only this session */ })
        .then(function () { loaded.current = true; });
    }, []);
    React.useEffect(function () { return function () { if (saveTimer.current) clearTimeout(saveTimer.current); }; }, []);

    function hydrate(doc) {
      if (doc.metric) { setMetric(Object.assign({}, METRIC0, doc.metric)); if (doc.metric.series && doc.metric.series.length) setEditingY(false); }
      if (doc.method) setMethod(doc.method);
      if (doc.cfg) setCfg(Object.assign({ robust: 'hac' }, doc.cfg));
      if (doc.saved) setSaved(doc.saved);
      if (doc.drivers && doc.drivers.length) {
        doc.drivers.forEach(function (d) { aliveUids.current[d.uid] = true; });
        setDrivers(doc.drivers);
        doc.drivers.forEach(function (d) { fetchDriver(d); });
      }
    }

    function persist(over) {
      var hasContent = (metric.series && metric.series.length) || drivers.length || saved.length;
      var doc = Object.assign({
        v: 1,
        metric: { label: metric.label, freq: metric.freq, series: metric.series, source: metric.source, ticker: metric.ticker, metricId: metric.metricId, currency: metric.currency, rawPaste: metric.rawPaste, kind: metric.kind },
        drivers: drivers.map(function (d) { return { uid: d.uid, kind: d.kind, label: d.label, source: d.source, seriesId: d.seriesId, ric: d.ric, transform: d.transform, lag: d.lag, agg: d.agg }; }),
        method: method, cfg: cfg, saved: saved, updated: new Date().toISOString()
      }, over || {});
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch (e) { }
      // never push an empty doc to the cloud, and never write before a clean load (both would clobber a good remote row)
      if (cloudEnabled() && cloudSafe.current && hasContent) {
        setSync('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(function () { cloudSave(doc).then(function () { setSync('saved'); setTimeout(function () { setSync('idle'); }, 1500); }).catch(function () { setSync('local'); }); }, 700);
      }
    }
    // persist whenever the model definition changes (after initial load)
    React.useEffect(function () { if (loaded.current) persist(); }, [metric, drivers, method, cfg, saved]);

    function fetchDriver(d) {
      DD.fetchMacro({ uid: d.uid, kind: d.kind, source: d.source, seriesId: d.seriesId, ric: d.ric })
        .then(function (s) { if (!aliveUids.current[d.uid]) return; setSeriesMap(function (m) { var n = Object.assign({}, m); n[d.uid] = s; return n; }); })
        .catch(function () { });
    }
    function addDriver(item) {
      if (drivers.some(function (d) { return d.uid === item.uid; })) { setPicking(false); return; }
      var d = { uid: item.uid, kind: item.kind, label: item.label, source: item.source, seriesId: item.seriesId, ric: item.ric, transform: 'level', lag: 0, agg: 'mean' };
      aliveUids.current[item.uid] = true;
      setDrivers(drivers.concat([d]));
      fetchDriver(d);
      setPicking(false);
    }
    function removeDriver(uid) { aliveUids.current[uid] = false; setDrivers(drivers.filter(function (d) { return d.uid !== uid; })); }
    function changeDriver(uid, patch) { setDrivers(drivers.map(function (d) { return d.uid === uid ? Object.assign({}, d, patch) : d; })); }

    function parsePaste() {
      var r = DD.parseSeries(metric.rawPaste || '');
      if (!r.series.length) { setErr('Could not parse any (date, value) rows. Use one period per line, e.g.  2023-Q1, 12500   or   2022, 48.3'); return; }
      setErr('');
      var cad = detectCadence(r.series), warn = (cad && cad !== metric.freq) ? ' ⚠ rows look ' + cad + ' but frequency is set to ' + metric.freq + ' — switch the toggle to match.' : '';
      setPullNote((r.bad ? (r.bad + ' line(s) skipped. ') : '') + r.series.length + ' periods parsed.' + warn);
      setMetric(Object.assign({}, metric, { series: r.series, source: 'paste' }));
      setEditingY(false);
    }
    function autoFill() {
      if (!metric.ticker.trim()) { setErr('Enter a ticker to auto-fill (e.g. AAPL, MSFT). IDX .JK names usually have no Yahoo fundamentals — paste instead.'); return; }
      setErr(''); setPulling(true); setPullNote('Pulling ' + metric.ticker + '…');
      DD.autoPull(metric.ticker.trim(), metric.metricId, metric.freq).then(function (out) {
        setPulling(false);
        if (out.series && out.series.length) {
          var met = DD.METRICS.find(function (m) { return m.id === metric.metricId; }) || {};
          var lbl = metric.label || (metric.ticker.trim().toUpperCase() + ' ' + met.label);
          setMetric(Object.assign({}, metric, { series: out.series, source: 'auto', currency: out.currency || metric.currency, label: lbl, kind: met.kind || 'currency' }));
          setPullNote(out.note || (out.series.length + ' periods pulled.'));
          setEditingY(false);
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
      var preLag = [];           // transformed-but-not-lagged column (the scenario shocks the CURRENT value, not the lagged one)
      var xCols = drivers.map(function (d, j) {
        var tf = (elasticity && d.transform === 'level') ? 'log' : d.transform;
        var col = E.transform(xLevel[j], tf, { k: 1 });
        preLag[j] = col.slice();
        if (d.lag > 0) col = E.transform(col, 'lag', { k: d.lag });
        return col;
      });
      var keep = [], allNull = [];
      for (var r = 0; r < keys.length; r++) {
        var ok = (yCol[r] != null && isFinite(yCol[r]));
        for (var c = 0; ok && c < xCols.length; c++) { var vv = xCols[c][r]; if (vv == null || !isFinite(vv)) ok = false; }
        if (ok) keep.push(r);
      }
      // surface a driver that wiped out the whole sample (e.g. log of non-positive values)
      drivers.forEach(function (d, j) { if (xCols[j].every(function (v) { return v == null || !isFinite(v); })) allNull.push(driverAlias(d)); });
      if (keep.length < 6) return { error: allNull.length ? ('Driver "' + allNull[0] + '" has no usable values under its transform (e.g. log/Δln needs positive levels) — change its transform.') : ('Only ' + keep.length + ' usable periods after transforms/lags (they drop leading rows). Reduce lags, change transforms, or add more history.') };
      var yK = keep.map(function (r) { return yCol[r]; });
      var yLevelK = keep.map(function (r) { return yLevel[r]; });
      var xK = xCols.map(function (col) { return keep.map(function (r) { return col[r]; }); });
      // pre-lag last value within the kept window — the "current" modeled level the scenario shocks
      var lastLevel = preLag.map(function (col) { var last = null; for (var r2 = 0; r2 < keys.length; r2++) { if (col[r2] != null && isFinite(col[r2])) last = col[r2]; } return last; });
      var names = dedupeNames(drivers.map(function (d) { return (elasticity && d.transform === 'level') ? ('ln ' + driverAlias(d)) : driverAlias(d); }));
      return { y: yK, x: xK, names: names, dates: keep.map(function (r) { return keys[r]; }), n: keep.length, baseY: yLevelK[yLevelK.length - 1], baseKey: keep.length ? keys[keep[keep.length - 1]] : '', lastLevel: lastLevel };
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
        var cols = [dc.y].concat(dc.x), nm = dedupeNames([metric.label || 'Metric'].concat(dc.names));
        var cm = E.corrMatrix(cols, nm, { method: 'pearson' });
        return { method: 'corr', names: cm.names, matrix: cm.matrix, n: cm.n, methodKind: 'pearson' };
      }
      var elasticity = method === 'elasticity';
      var ds = buildDriverDataset(elasticity); if (ds.error) throw new Error(ds.error);
      var res = E.ols(ds.y, ds.x, { names: ds.names, robust: cfg.robust });
      res._yName = elasticity ? ('ln ' + (metric.label || 'Metric')) : (metric.label || 'Metric');
      res._dates = ds.dates; res._n = ds.n; res._logged = elasticity;
      // honesty flags: tiny sample, and spurious-regression risk when everything is in levels
      res._smallN = ds.n < 20;
      if (method === 'driver' && drivers.every(function (d) { return d.transform === 'level'; })) {
        try { var ra = E.adf(res.resid, { trend: 'c' }); if (ra && ra.stationary === false) res._spurious = { p: ra.p }; } catch (e) { }
      }
      res._scen = {
        elasticity: elasticity, baseY: ds.baseY, baseKey: ds.baseKey, currency: metric.currency, metricKind: metric.kind || 'currency',
        metricLabel: metric.label || 'Metric', r2: res.r2, n: ds.n, multiDriver: drivers.length > 1,
        drivers: drivers.map(function (d, j) {
          return { uid: d.uid, label: driverAlias(d), transform: d.transform, lag: d.lag, beta: res.coef[j + 1], lastLevel: ds.lastLevel[j], logged: elasticity && d.transform === 'level', shockKind: d.transform === 'level' ? 'pct' : 'abs' };
        })
      };
      return res;
    }

    function saveModel() {
      var name = window.prompt('Save model as:', (metric.label || 'Driver model') + ' · ' + (METHODS.find(function (m) { return m.id === method; }) || {}).label);
      if (!name) return;
      var entry = { id: 'm' + Date.now(), name: name, method: method, cfg: cfg, metric: { label: metric.label, freq: metric.freq, series: metric.series, source: metric.source, ticker: metric.ticker, metricId: metric.metricId, currency: metric.currency, rawPaste: metric.rawPaste, kind: metric.kind }, drivers: drivers, at: new Date().toISOString() };
      var next = [entry].concat(saved).slice(0, 40); setSaved(next);
    }
    function loadModel(entry) {
      setMethod(entry.method); if (entry.cfg) setCfg(Object.assign({ robust: 'hac' }, entry.cfg));
      if (entry.metric) { setMetric(Object.assign({}, METRIC0, entry.metric)); setEditingY(!(entry.metric.series && entry.metric.series.length)); }
      aliveUids.current = {};                          // invalidate any in-flight fetches from the previous model
      if (entry.drivers) { entry.drivers.forEach(function (d) { aliveUids.current[d.uid] = true; }); setDrivers(entry.drivers); setSeriesMap({}); entry.drivers.forEach(function (d) { fetchDriver(d); }); }
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
            <div className="an-rail-h">Financial metric (Y){yReady && !editingY && <button className="an-add" onClick={function () { setEditingY(true); }}>✎ Edit</button>}</div>
            <div className="ed-metric">
              <input className="ed-input" placeholder="Label  (e.g. BBCA Revenue)" value={metric.label} onChange={function (e) { setMetric(Object.assign({}, metric, { label: e.target.value })); }} />
              <div className="ed-row2">
                <div className="ed-freq">
                  {[['quarterly', 'Quarterly'], ['annual', 'Annual']].map(function (f) { return <button key={f[0]} className={'ed-freq-btn ' + (metric.freq === f[0] ? 'on' : '')} onClick={function () { setMetric(Object.assign({}, metric, { freq: f[0] })); }}>{f[1]}</button>; })}
                </div>
                <select className="an-tf ed-unitsel" value={metric.kind} title="Metric units — controls formatting & scenario math (currency aggregate vs ratio vs per-share)" onChange={function (e) { setMetric(Object.assign({}, metric, { kind: e.target.value })); }}>
                  <option value="currency">Currency</option><option value="percent">% / ratio</option><option value="pershare">Per share</option><option value="index">Index / unit</option>
                </select>
              </div>
              {(editingY || !yReady) ? (
                <React.Fragment>
                  <div className="ed-paste-h">Paste a (date, value) series</div>
                  <textarea className="ed-paste" placeholder={'2023-Q1, 12500\n2023-Q2, 13100\n2023-Q3, 12880\n…\nor  2021, 48.3   /   31/12/2022  52.1'} value={metric.rawPaste} onChange={function (e) { setMetric(Object.assign({}, metric, { rawPaste: e.target.value })); }} />
                  <button className="an-btn ed-btn-wide" onClick={parsePaste}>Parse pasted series</button>
                  <div className="ed-or">— or auto-pull (US / select global) —</div>
                  <div className="ed-pull">
                    <input className="ed-input ed-tick" placeholder="Ticker (AAPL)" value={metric.ticker} onChange={function (e) { setMetric(Object.assign({}, metric, { ticker: e.target.value })); }} />
                    <select className="an-tf ed-metricsel" value={metric.metricId} onChange={function (e) { setMetric(Object.assign({}, metric, { metricId: e.target.value })); }}>
                      {metricLabels.map(function (m) { return <option key={m.id} value={m.id}>{m.label}</option>; })}
                    </select>
                  </div>
                  <button className="an-btn ed-btn-wide" disabled={pulling} onClick={autoFill}>{pulling ? '⟳ Pulling…' : '⤓ Auto-fill from ticker'}</button>
                  {pullNote && <div className="ed-note">{pullNote}</div>}
                </React.Fragment>
              ) : null}
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
            {result && result._spurious && <div className="an-verdict warn">⚠ Likely <b>spurious regression</b>: all drivers are in levels and the residuals are non-stationary (ADF p≈{fmtNum(result._spurious.p, 3)}). A high R²/t-stat here can be an artefact of common trends. Switch the drivers (and ideally the metric) to <b>Δ / % growth / Δln</b> before trusting the βs.</div>}
            {result && result._smallN && !result._spurious && <div className="an-verdict warn">⚠ Only <b>{result._n} periods</b> — too few for reliable inference (HAC SEs and t-stats are barely meaningful below ~20 obs). Treat the βs as indicative, not precise.</div>}
            {result && R && <R.ResultView result={result} yName={result._yName} vars={{}} />}
          </div>
        </div>

        {picking && <DriverPicker onClose={function () { setPicking(false); }} onPick={addDriver} />}
      </section>
    );
  }

  window.EquityDriverLab = EquityDriverLab;
})();
