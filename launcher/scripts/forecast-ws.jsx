// ================================================================
// forecast-ws.jsx — LBC Forecast Studio (window.ForecastLab).
// A scenario-driven, multi-layer forecasting desk for the Macro terminal.
// Build a GRAPH of variables: each node is forecast by a method (regression
// from its parents, a free-form equation, ARIMA/ETS, drift/random-walk,
// constant growth, or a fully manual scenario path). The graph resolves
// bottom-up, so you can forecast gold from DXY + 10Y yield, where DXY and the
// yield are themselves driven by their own drivers (3+ layers). Every driver
// is controllable — flip any node to a scenario and the cone of the target
// updates live. Horizon (M/Q/A × N periods) is fully customizable.
// Engine: window.Forecast. Data: window.DriverData / AnalysisData. Charts: own
// SVG. Per-account cloud sync → public.forecast_workspace.
// ================================================================
(function () {
  'use strict';
  var F = window.Forecast, DD = window.DriverData;
  var SB = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  // resolve chart strokes from the LBC design tokens (fall back to literals if unavailable)
  function tok(name, fb) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; } }
  var COL = { hist: tok('--brand', '#97AAC5'), fcst: tok('--paper', '#E8E4D9'), target: tok('--paper', '#E8E4D9'), pos: tok('--pos', '#19C37D'), band: 'rgba(232,228,217,.14)', grid: 'rgba(151,170,197,.14)' };

  // ---- per-account cloud sync ----
  function lbcSession() { try { var s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch (e) { return null; } }
  function lbcToken() { var s = lbcSession(); return s ? s.token : null; }
  function lbcSub() { var s = lbcSession(); return (s && s.user) ? s.user.id : null; }
  function cloudEnabled() { return !!(lbcToken() && lbcSub()); }
  function cloudLoad(table) {
    if (!cloudEnabled()) return Promise.resolve(null);
    return fetch(SB + '/' + table + '?user_sub=eq.' + encodeURIComponent(lbcSub()) + '&select=doc', { headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken() } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (rows) { return (rows && rows[0] && rows[0].doc) ? rows[0].doc : null; });
  }
  function cloudSave(table, doc) {
    if (!cloudEnabled()) return Promise.resolve(false);
    return fetch(SB + '/' + table, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_sub: lbcSub(), doc: doc, updated_at: new Date().toISOString() }]) })
      .then(function (r) { if (!r.ok) return Promise.reject('HTTP ' + r.status); return true; });
  }
  // two flavours of the same studio: macro drivers, and equity (metric pulled from a stock)
  var MACRO_CFG = { title: 'Forecast Studio', sub: 'scenario graph', table: 'forecast_workspace', localKey: 'lbcForecastWorkspace', equity: false, defFreq: 'Q' };
  var EQUITY_CFG = { title: 'Equity Forecast', sub: 'driver model · forecast a metric from its drivers', table: 'equity_forecast_workspace', localKey: 'lbcEquityForecastWorkspace', equity: true, defFreq: 'Q' };

  var FREQS = [{ id: 'M', label: 'Monthly', perYear: 12 }, { id: 'Q', label: 'Quarterly', perYear: 4 }, { id: 'A', label: 'Annual', perYear: 1 }];

  // ---- helpers ----
  function fmtVal(v, d) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }); return Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  // unit-aware formatter for a metric value: a margin prints %, a per-share/index drops the B/M suffix, currency keeps it
  function fmtKind(v, kind, ccy) { if (v == null || !isFinite(v)) return '—'; if (kind === 'percent') return fmtVal(v, 2) + '%'; if (kind === 'pershare' || kind === 'index') return (ccy ? ccy + ' ' : '') + fmtVal(v, 2); return (ccy ? ccy + ' ' : '') + fmtVal(v); }
  function symFrom(label, existing) { var base = String(label || 'X').replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || 'X'; if (/^[0-9]/.test(base)) base = 'X' + base; var s = base, i = 2; while (existing.indexOf(s) > -1) { s = base + i; i++; } return s; }
  function methodGlyph(m) { return ({ regression: 'β', equation: 'ƒ', arima: 'φ', ets: '⌁', drift: '↗', rw: '∼', growth: '%', scenario: '✎' })[m] || '•'; }
  // descendants of id (so we never offer a parent that would create a cycle)
  function descendantsOf(id, nodes) { var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; }); var seen = {}; var stack = [id]; while (stack.length) { var cur = stack.pop(); nodes.forEach(function (n) { if ((n.parents || []).indexOf(cur) > -1 && !seen[n.id]) { seen[n.id] = true; stack.push(n.id); } }); } return seen; }

  // ===================== macro picker =====================
  function FcPicker(props) {
    var _s = React.useState(''), q = _s[0], setQ = _s[1];
    var _r = React.useState(null), rows = _r[0], setRows = _r[1];
    var _c = React.useState('us'), country = _c[0], setCountry = _c[1];
    var _l = React.useState(false), loading = _l[0], setLoading = _l[1];
    React.useEffect(function () {
      var alive = true; setLoading(true);
      var t = setTimeout(function () { DD.searchMacro(q, { country: country }).then(function (res) { if (alive) { setRows(res); setLoading(false); } }).catch(function () { if (alive) { setRows([]); setLoading(false); } }); }, 220);
      return function () { alive = false; clearTimeout(t); };
    }, [q, country]);
    return (
      <div className="an-modal-bg" onClick={props.onClose}>
        <div className="an-modal" onClick={function (e) { e.stopPropagation(); }}>
          <div className="an-modal-h"><span>Add a variable from macro data</span><button className="an-modal-x" onClick={props.onClose}>×</button></div>
          <div className="an-modal-search">
            <input autoFocus placeholder="Search live + Refinitiv data…  (gold, DXY, 10Y yield, CPO, oil, CPI)" value={q} onChange={function (e) { setQ(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Escape') props.onClose(); else if (e.key === 'Enter' && rows && rows.length) { e.preventDefault(); props.onPick(rows[0]); } }} />
            <div className="an-ctry">{DD.REF_COUNTRIES.map(function (c) { return <button key={c.id} className={'an-ctry-btn ' + (country === c.id ? 'on' : '')} onClick={function () { setCountry(c.id); }}>{c.label}</button>; })}</div>
          </div>
          <div className="an-modal-body">
            {loading && <div className="an-empty">Searching…</div>}
            {rows && !rows.length && !loading && <div className="an-empty">No matches.</div>}
            {rows && rows.map(function (it) { return (
              <div key={it.uid} className="an-pick-row" onClick={function () { props.onPick(it); }}>
                <span className={'an-src an-src-' + (it.source || '').toLowerCase().replace(/[^a-z]/g, '')}>{it.tag}</span>
                <span className="an-pick-label">{it.label}</span><span className="an-pick-sub">{it.sub}</span>
              </div>
            ); })}
          </div>
        </div>
      </div>
    );
  }

  // ===================== stock metric picker (equity mode) =====================
  // Pulls a company's financial metric (revenue, EBIT, margin…) by ticker from the
  // equity-statements cache. IDX .JK names usually have no Yahoo fundamentals — the
  // note steers those to "+ Manual" (paste). Macro drivers use FcPicker.
  function StockMetricModal(props) {
    var _t = React.useState(''), ticker = _t[0], setTicker = _t[1];
    var _m = React.useState('revenue'), metricId = _m[0], setMetricId = _m[1];
    var _f = React.useState('quarterly'), freq = _f[0], setFreq = _f[1];
    var _b = React.useState(false), busy = _b[0], setBusy = _b[1];
    var _n = React.useState(''), note = _n[0], setNote = _n[1];
    function add() {
      if (!ticker.trim()) { setNote('Enter a ticker (e.g. AAPL, MSFT).'); return; }
      setBusy(true); setNote('Pulling ' + ticker.trim().toUpperCase() + '…');
      var tk = ticker.trim().toUpperCase();
      DD.autoPull(tk, metricId, freq).then(function (out) {
        setBusy(false);
        if (out.series && out.series.length) {
          var met = DD.METRICS.find(function (m) { return m.id === metricId; }) || {};
          props.onAdd(tk + ' ' + met.label, out.series, { kind: 'stock', ticker: tk, metricId: metricId, freq: freq }, out.currency || null, met.kind || 'currency');
        } else { setNote(out.note || 'No data — IDX names usually lack Yahoo fundamentals. Use “＋ Manual” to paste the series.'); }
      }).catch(function (e) { setBusy(false); setNote('Pull failed (' + e + ') — use “＋ Manual” to paste instead.'); });
    }
    var GROUPS = [{ id: 'income', label: 'Income statement' }, { id: 'balance', label: 'Balance sheet' }, { id: 'cashflow', label: 'Cash flow' }];
    return (
      <div className="an-modal-bg" onClick={props.onClose}>
        <div className="an-modal fc-stk-modal" onClick={function (e) { e.stopPropagation(); }}>
          <div className="an-modal-h"><span>Add a company financial metric</span><button className="an-modal-x" onClick={props.onClose}>×</button></div>
          <div className="fc-stk-body">
            <label className="fc-stk-lbl">Ticker</label>
            <input className="ed-input" autoFocus placeholder="AAPL, MSFT, NVDA …" value={ticker}
              onChange={function (e) { setTicker(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } else if (e.key === 'Escape') props.onClose(); }} />
            <div className="fc-stk-hint">US tickers auto-pull from Yahoo fundamentals. IDX <b>.JK</b> names usually have none — paste the series via <b>＋ Manual</b> instead.</div>
            <label className="fc-stk-lbl">Metric</label>
            <select className="ed-input" value={metricId} onChange={function (e) { setMetricId(e.target.value); }}>
              {GROUPS.map(function (g) { var ms = DD.METRICS.filter(function (m) { return m.stmt === g.id; }); return ms.length ? <optgroup key={g.id} label={g.label}>{ms.map(function (m) { return <option key={m.id} value={m.id}>{m.label}</option>; })}</optgroup> : null; })}
            </select>
            <label className="fc-stk-lbl">Frequency</label>
            <div className="ed-freq">{[['quarterly', 'Quarterly'], ['annual', 'Annual']].map(function (f) { return <button key={f[0]} className={'ed-freq-btn ' + (freq === f[0] ? 'on' : '')} onClick={function () { setFreq(f[0]); }}>{f[1]}</button>; })}</div>
            {note && <div className="ed-note">{note}</div>}
            <button className="an-btn ed-btn-wide" disabled={busy} onClick={add}>{busy ? '⟳ Pulling…' : '⤓ Add metric'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== forecast chart (history + fan + forecast) =====================
  function FcChart(props) {
    var hist = props.hist || [], fcst = props.fcst || [], lo = props.lo, hi = props.hi;
    var Ht = hist.length, H = fcst.length, N = Ht + H, W = 460, Hpx = props.height || 168, pad = { l: 46, r: 10, t: 10, b: 20 };
    var all = []; hist.concat(fcst).forEach(function (v) { if (v != null && isFinite(v)) all.push(v); });
    if (lo) lo.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); if (hi) hi.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); });
    if (props.base) props.base.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); });
    if (!all.length) return <div className="an-empty">no data</div>;
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mn === mx) { mx = mn + 1; mn -= 1; }
    var x = function (i) { return pad.l + (N <= 1 ? 0 : (i / (N - 1)) * (W - pad.l - pad.r)); };
    var y = function (v) { return pad.t + (1 - (v - mn) / (mx - mn)) * (Hpx - pad.t - pad.b); };
    function pathOf(arr, off) { var d = '', started = false; arr.forEach(function (v, i) { if (v == null || !isFinite(v)) { started = false; return; } var gi = off + i; d += (started ? 'L' : 'M') + x(gi).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; started = true; }); return d; }
    // band polygon over the forecast region
    var bandPath = null;
    if (lo && hi) { var up = [], dn = []; for (var i = 0; i < H; i++) { if (lo[i] != null && hi[i] != null && isFinite(lo[i]) && isFinite(hi[i])) { up.push(x(Ht + i).toFixed(1) + ' ' + y(hi[i]).toFixed(1)); dn.push(x(Ht + i).toFixed(1) + ' ' + y(lo[i]).toFixed(1)); } } if (up.length) bandPath = 'M' + up.join(' L') + ' L' + dn.reverse().join(' L') + ' Z'; }
    // last actual + first forecast (history may end before the axis end for a short series → bridge the gap)
    var lastIdx = -1, lastHist = null; for (var li = hist.length - 1; li >= 0; li--) { if (hist[li] != null && isFinite(hist[li])) { lastIdx = li; lastHist = hist[li]; break; } }
    var firstFc = null, firstOff = Ht; for (var fj = 0; fj < fcst.length; fj++) { if (fcst[fj] != null && isFinite(fcst[fj])) { firstFc = fcst[fj]; firstOff = Ht + fj; break; } }
    var connector = (lastHist != null && firstFc != null) ? ('M' + x(lastIdx).toFixed(1) + ' ' + y(lastHist).toFixed(1) + ' L' + x(firstOff).toFixed(1) + ' ' + y(firstFc).toFixed(1)) : null;
    var nowX = x(Ht - 1);
    var hd = props.histDates || [], fd = props.futureDates || [];
    return (
      <svg viewBox={'0 0 ' + W + ' ' + Hpx} className="an-svg fc-svg" preserveAspectRatio="none" style={{ width: '100%', height: Hpx }}>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={Hpx - pad.b} stroke={COL.grid} />
        <line x1={pad.l} y1={Hpx - pad.b} x2={W - pad.r} y2={Hpx - pad.b} stroke={COL.grid} />
        {bandPath && <path d={bandPath} fill={COL.band} stroke="none" />}
        <line x1={nowX} y1={pad.t} x2={nowX} y2={Hpx - pad.b} stroke="rgba(151,170,197,.35)" strokeDasharray="2 3" />
        {props.base && <path d={pathOf(props.base, Ht)} fill="none" stroke="rgba(232,228,217,.3)" strokeWidth="1.2" strokeDasharray="6 4" />}
        {props.fit && <path d={pathOf(props.fit, 0)} fill="none" stroke="rgba(151,170,197,.45)" strokeWidth="1" strokeDasharray="1 2" />}
        <path d={pathOf(hist, 0)} fill="none" stroke={COL.hist} strokeWidth="1.6" />
        {connector && <path d={connector} fill="none" stroke={props.color || COL.fcst} strokeWidth="1.7" strokeDasharray="4 2" />}
        <path d={pathOf(fcst, Ht)} fill="none" stroke={props.color || COL.fcst} strokeWidth="1.7" strokeDasharray="4 2" />
        {props.bandPct && bandPath && <text x={W - pad.r} y={pad.t + 8} className="an-axt" textAnchor="end">{props.bandPct}% band</text>}
        <text x={pad.l - 4} y={pad.t + 8} className="an-axt" textAnchor="end">{fmtVal(mx)}</text>
        <text x={pad.l - 4} y={Hpx - pad.b} className="an-axt" textAnchor="end">{fmtVal(mn)}</text>
        {hd.length > 0 && <text x={pad.l} y={Hpx - 6} className="an-axt" textAnchor="start">{String(hd[0]).slice(0, 7)}</text>}
        <text x={nowX} y={Hpx - 6} className="an-axt" textAnchor="middle">{hd.length ? String(hd[hd.length - 1]).slice(0, 7) : 'now'}</text>
        {fd.length > 0 && <text x={W - pad.r} y={Hpx - 6} className="an-axt" textAnchor="end">{String(fd[fd.length - 1]).slice(0, 7)}</text>}
      </svg>
    );
  }

  // ===================== node graph (auto-layout by dependency layer) =====================
  function GraphCanvas(props) {
    var nodes = props.nodes, sel = props.selectedId;
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    // only regression / equation nodes actually consume their parents — draw the
    // ACTIVE dependency structure (flip a node to a scenario and its edges drop away)
    function eff(n) { return (n && (n.method === 'regression' || n.method === 'equation')) ? (n.parents || []) : []; }
    // layer = longest path from a root node
    var layer = {}; function lay(id, guard) { if (layer[id] != null) return layer[id]; if (guard[id]) return 0; guard[id] = true; var ps = eff(byId[id]); var L = ps.length ? 1 + Math.max.apply(null, ps.map(function (p) { return lay(p, guard); })) : 0; layer[id] = L; return L; }
    nodes.forEach(function (n) { lay(n.id, {}); });
    var maxL = 0; nodes.forEach(function (n) { maxL = Math.max(maxL, layer[n.id]); });
    var cols = []; for (var i = 0; i <= maxL; i++) cols[i] = [];
    nodes.forEach(function (n) { cols[layer[n.id]].push(n); });
    var COLW = 150, ROWH = 62, NW = 124, NH = 42, padX = 18, padY = 16;
    var maxRows = Math.max.apply(null, cols.map(function (c) { return c.length; }).concat([1]));
    var Wpx = padX * 2 + (maxL + 1) * COLW, Hpx = padY * 2 + maxRows * ROWH;
    var pos = {};
    cols.forEach(function (col, ci) { var startY = padY + (maxRows - col.length) * ROWH / 2; col.forEach(function (n, ri) { pos[n.id] = { x: padX + ci * COLW, y: startY + ri * ROWH }; }); });
    var edges = []; nodes.forEach(function (n) { eff(n).forEach(function (p) { if (pos[p] && pos[n.id]) edges.push({ from: p, to: n.id }); }); });
    return (
      <div className="fc-graph-wrap">
        <svg viewBox={'0 0 ' + Wpx + ' ' + Hpx} width={Wpx} height={Hpx} className="fc-graph" style={{ maxWidth: '100%', height: 'auto' }}>
          <defs><marker id="fcArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.2" orient="auto"><path d="M0 0 L6 3.2 L0 6.4 Z" fill="rgba(151,170,197,.6)" /></marker></defs>
          {edges.map(function (e, i) { var a = pos[e.from], b = pos[e.to]; var x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2; var mx = (x1 + x2) / 2; return <path key={i} d={'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2} fill="none" stroke="rgba(151,170,197,.4)" strokeWidth="1.2" markerEnd="url(#fcArrow)" />; })}
          {nodes.map(function (n) { var p = pos[n.id]; var on = n.id === sel; return (
            <g key={n.id} className={'fc-node ' + (on ? 'on ' : '') + (n.isTarget ? 'target' : '')} transform={'translate(' + p.x + ',' + p.y + ')'} onClick={function () { props.onSelect(n.id); }} style={{ cursor: 'pointer' }}>
              <title>{n.label + '  ·  ' + n.method}</title>
              <rect width={NW} height={NH} rx="4" />
              <text x="9" y="17" className="fc-node-sym">{methodGlyph(n.method)} {n.sym}</text>
              <text x="9" y="32" className="fc-node-lbl">{(n.label || '').length > 16 ? (n.label || '').slice(0, 15) + '…' : (n.label || '')}</text>
              {n.isTarget && <text x={NW - 8} y="15" className="fc-node-star" textAnchor="end">★</text>}
            </g>
          ); })}
        </svg>
      </div>
    );
  }

  // ===================== node inspector =====================
  function NodeInspector(props) {
    var n = props.node, nodes = props.nodes;
    if (!n) return <div className="fc-insp fc-insp-empty">Select a node in the graph to edit how it's forecast, connect its drivers, or set a scenario.</div>;
    var desc = descendantsOf(n.id, nodes);
    var candidates = nodes.filter(function (o) { return o.id !== n.id && !desc[o.id]; });
    var needsParents = (F.METHODS.find(function (m) { return m.id === n.method; }) || {}).needsParents;
    var parentSyms = (n.parents || []).map(function (pid) { var pn = nodes.find(function (x) { return x.id === pid; }); return pn ? pn.sym : pid; });
    var freq = (props.horizon && props.horizon.freq) || 'Q';
    var perY = { M: 12, Q: 4, A: 1 }[freq] || 4;                 // seasonal period implied by the frequency
    var seasonalFreq = freq === 'Q' || freq === 'M';
    function up(patch) { props.onChange(n.id, patch); }
    function upParams(patch) { props.onChange(n.id, { params: Object.assign({}, n.params || {}, patch) }); }
    return (
      <div className="fc-insp">
        <div className="fc-insp-h">
          <input className="fc-insp-name" value={n.label} onChange={function (e) { up({ label: e.target.value }); }} />
          <input className="fc-insp-sym" value={n.sym} title="Symbol used in equations" onChange={function (e) { up({ sym: e.target.value.replace(/[^A-Za-z0-9_]/g, '') }); }} />
          <button className={'fc-target-btn ' + (n.isTarget ? 'on' : '')} title="Forecast target" onClick={function () { props.onSetTarget(n.id); }}>★ Target</button>
          <button className="an-var-x" title="Remove node" onClick={function () { props.onRemove(n.id); }}>×</button>
        </div>
        <div className="fc-insp-row">
          <label>Forecast method</label>
          <select value={n.method} onChange={function (e) { up({ method: e.target.value }); }}>
            {F.METHODS.map(function (m) { return <option key={m.id} value={m.id}>{methodGlyph(m.id) + '  ' + m.label}</option>; })}
          </select>
        </div>
        {n.series ? <div className="fc-insp-meta">{n.source === 'manual' ? 'Manual series' : n.source === 'stock' ? 'Stock metric' : 'Macro series'} · {n.series.length} obs</div> : <div className="fc-insp-meta">Derived (computed from parents — no observed history)</div>}

        {needsParents && <div className="fc-insp-block">
          <label>Drivers (parents)</label>
          <div className="fc-parent-chips">
            {candidates.length === 0 && <span className="fc-dim">add more nodes to connect</span>}
            {candidates.map(function (o) { var on = (n.parents || []).indexOf(o.id) > -1; return (
              <button key={o.id} className={'fc-pchip ' + (on ? 'on' : '')} onClick={function () { var ps = (n.parents || []).slice(); var lg = Object.assign({}, n.lags || {}); if (on) { ps = ps.filter(function (x) { return x !== o.id; }); delete lg[o.id]; } else { ps.push(o.id); } up({ parents: ps, lags: lg }); }}>{o.sym}</button>
            ); })}
          </div>
          {n.method === 'regression' && (n.parents || []).length > 0 && <div className="fc-lags">{(n.parents || []).map(function (pid) { var pn = nodes.find(function (x) { return x.id === pid; }); return <label key={pid} className="fc-lag" title="Lag this driver by N periods">{pn ? pn.sym : pid}<input type="number" min="0" max="12" value={(n.lags && n.lags[pid]) || 0} onChange={function (e) { var lg = Object.assign({}, n.lags || {}); lg[pid] = Math.max(0, +e.target.value || 0); up({ lags: lg }); }} /></label>; })}</div>}
          {n.method === 'regression' && <label className="fc-logchk" title="Fit log(Y) on level drivers — keeps a positive-only target (revenue, a price, an index) from forecasting negative, and reads β as a semi-elasticity (% per unit)."><input type="checkbox" checked={!!(n.params && n.params.logspace)} onChange={function (e) { upParams({ logspace: e.target.checked }); }} /> log Y — keep positive (semi-elasticity)</label>}
        </div>}

        {n.method === 'equation' && <div className="fc-insp-block">
          <label>Equation <span className="fc-dim">use symbols: {parentSyms.join(', ') || '(connect drivers first)'}</span></label>
          <input className="fc-eq" placeholder="e.g.  2200 - 9*DXY - 60*Y10" value={n.equation || ''} onChange={function (e) { up({ equation: e.target.value }); }} />
          <EqCheck equation={n.equation} syms={parentSyms} />
        </div>}

        {n.method === 'arima' && <div className="fc-insp-block fc-grid6">
          {[['p', 'p'], ['d', 'd'], ['q', 'q'], ['P', 'P'], ['D', 'D'], ['Q', 'Q'], ['s', 's']].map(function (o) { return <label key={o[0]} className="fc-mini">{o[1]}<input type="number" min="0" max={o[0] === 's' ? 24 : 3} value={(n.params && n.params[o[0]]) != null ? n.params[o[0]] : (o[0] === 'p' ? 1 : o[0] === 'd' ? 1 : o[0] === 's' ? perY : 0)} onChange={function (e) { var v = {}; v[o[0]] = +e.target.value || 0; upParams(v); }} /></label>; })}
          {seasonalFreq && !(n.params && (n.params.P || n.params.D || n.params.Q)) && <div className="fc-dim" style={{ flexBasis: '100%' }}>tip: {freq === 'Q' ? 'quarterly' : 'monthly'} financials are seasonal — set <b>D=1, P or Q=1</b> with s={perY} to model it</div>}
        </div>}
        {n.method === 'ets' && <div className="fc-insp-block fc-grid6">
          <label className="fc-mini fc-chk">trend<input type="checkbox" checked={!(n.params && n.params.trend === false)} onChange={function (e) { upParams({ trend: e.target.checked }); }} /></label>
          <label className="fc-mini">seasonal<select value={(n.params && n.params.seasonal) || 'none'} onChange={function (e) { upParams({ seasonal: e.target.value }); }}><option value="none">none</option><option value="add">add</option><option value="mul">mul</option></select></label>
          <label className="fc-mini">s<input type="number" min="2" max="24" value={(n.params && n.params.s) || perY} onChange={function (e) { upParams({ s: +e.target.value || perY }); }} /></label>
          {seasonalFreq && (!n.params || (n.params.seasonal || 'none') === 'none') && <div className="fc-dim" style={{ flexBasis: '100%' }}>tip: {freq === 'Q' ? 'quarterly' : 'monthly'} financials are seasonal — set <b>seasonal</b> to add/mul (s={perY})</div>}
        </div>}
        {n.method === 'growth' && <div className="fc-insp-block fc-row-inline"><label>Growth %/period</label><input type="number" step="0.5" value={(n.params && n.params.growthPct) || 0} onChange={function (e) { upParams({ growthPct: +e.target.value || 0 }); }} /></div>}

        {n.method === 'scenario' && <ScenarioEditor node={n} horizon={props.horizon} onParams={upParams} />}

        <div className="fc-insp-note">
          {n.method === 'regression' && 'Fitted on overlapping history (HAC SE). Forecast = c + Σβ·driver(−lag), drivers taken from their own forecasts.'}
          {n.method === 'equation' && 'Deterministic transform of its drivers — evaluated every period as the drivers evolve.'}
          {n.method === 'arima' && 'Univariate Box-Jenkins on this node\'s own history (no drivers used).'}
          {n.method === 'ets' && 'Holt-Winters level/trend/seasonal on this node\'s own history.'}
          {n.method === 'drift' && 'Random walk + average historical drift. Uncertainty grows with horizon.'}
          {n.method === 'rw' && 'Holds the last value flat; uncertainty grows with horizon.'}
          {n.method === 'growth' && 'Compounds the last value at a fixed rate — a clean assumption knob.'}
          {n.method === 'scenario' && 'Fully manual path — set this driver\'s future yourself; the cone above it narrows (no noise on a fixed assumption).'}
        </div>
      </div>
    );
  }

  function EqCheck(props) {
    var info = React.useMemo(function () {
      if (!props.equation) return { ok: null };
      try { var c = F.compileExpr(props.equation); var missing = c.vars.filter(function (v) { return (props.syms || []).indexOf(v) < 0; }); return { ok: missing.length === 0, missing: missing, vars: c.vars }; }
      catch (e) { return { ok: false, err: String(e.message || e) }; }
    }, [props.equation, (props.syms || []).join(',')]);
    if (info.ok == null) return null;
    if (info.err) return <div className="fc-eq-bad">✗ {info.err}</div>;
    if (!info.ok) return <div className="fc-eq-bad">✗ unknown symbol(s): {info.missing.join(', ')} — connect them as drivers or fix the name</div>;
    return <div className="fc-eq-ok">✓ valid · uses {info.vars.join(', ') || 'constants only'}</div>;
  }

  function ScenarioEditor(props) {
    var n = props.node, p = n.params || {}, mode = p.scenMode || 'growth', H = (props.horizon && props.horizon.n) || 12;
    return (
      <div className="fc-insp-block">
        <label>Scenario path</label>
        <div className="fc-scen-mode">
          <button className={'ed-freq-btn ' + (mode === 'growth' ? 'on' : '')} onClick={function () { props.onParams({ scenMode: 'growth' }); }}>% growth / period</button>
          <button className={'ed-freq-btn ' + (mode === 'level' ? 'on' : '')} onClick={function () { props.onParams({ scenMode: 'level' }); }}>Custom values</button>
        </div>
        {mode === 'growth'
          ? <div className="fc-row-inline"><label>Growth %/period</label><input type="number" step="0.5" value={p.growthPct || 0} onChange={function (e) { props.onParams({ growthPct: +e.target.value || 0 }); }} /></div>
          : <div>
              <textarea className="fc-scen-ta" placeholder={'one value per future period (comma or newline)\n' + H + ' periods — beyond what you enter holds the last value'} value={p.scenarioRaw || ''} onChange={function (e) { var raw = e.target.value; var vals = raw.split(/[\s,;]+/).filter(function (s) { return s !== ''; }).map(function (x) { var v = parseFloat(x); return isFinite(v) ? v : null; }); props.onParams({ scenarioRaw: raw, scenarioPath: vals }); }} />
              <div className="fc-dim">{(p.scenarioPath || []).filter(function (x) { return x != null; }).length} / {H} periods set</div>
            </div>}
      </div>
    );
  }

  // ===================== main =====================
  function ForecastStudio(props) {
    var cfg = (props && props.config) || MACRO_CFG;
    var LOCAL_KEY = cfg.localKey;
    var _n = React.useState([]), nodes = _n[0], setNodes = _n[1];
    var _sel = React.useState(null), selectedId = _sel[0], setSelectedId = _sel[1];
    var _h = React.useState({ n: 40, freq: cfg.defFreq || 'Q' }), horizon = _h[0], setHorizon = _h[1];
    var _bp = React.useState(80), bandPct = _bp[0], setBandPct = _bp[1];
    var _res = React.useState(null), result = _res[0], setResult = _res[1];
    var _run = React.useState(false), running = _run[0], setRunning = _run[1];
    var _err = React.useState(''), err = _err[0], setErr = _err[1];
    var _pick = React.useState(false), picking = _pick[0], setPicking = _pick[1];
    var _stk = React.useState(false), picking2 = _stk[0], setPicking2 = _stk[1];
    var _paste = React.useState(false), pasting = _paste[0], setPasting = _paste[1];
    var _sync = React.useState('idle'), sync = _sync[0], setSync = _sync[1];
    var _off = React.useState(false), cloudOff = _off[0], setCloudOff = _off[1];
    var _stale = React.useState(false), stale = _stale[0], setStale = _stale[1];
    var _pin = React.useState(null), pinned = _pin[0], setPinned = _pin[1];   // {target, sym, fcst:[]} baseline snapshot for overlay
    var loaded = React.useRef(false), cloudSafe = React.useRef(false), aliveUids = React.useRef({}), saveTimer = React.useRef(null), runTimer = React.useRef(null), idc = React.useRef(1);

    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var selected = byId[selectedId] || null;

    // boot
    React.useEffect(function () {
      cloudLoad(cfg.table).then(function (doc) { cloudSafe.current = true; if (!doc) { try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { } } if (doc) hydrate(doc); })
        .catch(function () { try { var d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (d) hydrate(d); } catch (e) { } if (cloudEnabled()) setCloudOff(true); })
        .then(function () { loaded.current = true; });
      return function () { if (saveTimer.current) clearTimeout(saveTimer.current); if (runTimer.current) clearTimeout(runTimer.current); };
    }, []);

    function hydrate(doc) {
      if (doc.horizon) setHorizon(Object.assign({ n: 40, freq: cfg.defFreq || 'Q' }, doc.horizon));
      if (doc.bandPct) setBandPct(doc.bandPct);
      if (doc.nodes && doc.nodes.length) {
        var max = 1; doc.nodes.forEach(function (n) { var m = parseInt(String(n.id).replace(/\D/g, ''), 10); if (m > max) max = m; aliveUids.current[n.id] = true; });
        idc.current = max + 1;
        setNodes(doc.nodes);
        doc.nodes.forEach(function (n) { if (n.seriesRef && !n.series) fetchNode(n); });
      }
    }

    function persist() {
      var hasContent = nodes.length > 0;
      var doc = { v: 1, horizon: horizon, bandPct: bandPct, nodes: nodes.map(function (n) {
        // macro nodes refetch on load (don't store the series); manual + stock metrics keep theirs
        var keepSeries = n.source === 'manual' || n.source === 'stock';
        return { id: n.id, label: n.label, sym: n.sym, method: n.method, parents: n.parents || [], lags: n.lags || {}, equation: n.equation || '', params: n.params || {}, isTarget: !!n.isTarget, source: n.source, seriesRef: n.seriesRef || null, currency: n.currency || null, kind: n.kind || null, series: keepSeries ? n.series : null };
      }), updated: new Date().toISOString() };
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch (e) { }
      if (cloudEnabled() && cloudSafe.current && hasContent) { setSync('saving'); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(function () { cloudSave(cfg.table, doc).then(function () { setSync('saved'); setTimeout(function () { setSync('idle'); }, 1500); }).catch(function () { setSync('local'); }); }, 700); }
    }
    React.useEffect(function () { if (loaded.current) persist(); }, [nodes, horizon, bandPct]);

    // live recompute on structural/param/scenario/horizon changes once a forecast exists
    var computeKey = React.useMemo(function () { return JSON.stringify({ h: horizon, b: bandPct, ns: nodes.map(function (n) { return { i: n.id, m: n.method, p: n.parents, l: n.lags, e: n.equation, pa: n.params, t: n.isTarget, s: n.series ? n.series.length : 0 }; }) }); }, [nodes, horizon, bandPct]);
    React.useEffect(function () {
      if (!loaded.current || !result) { return; }
      setStale(true);
      if (runTimer.current) clearTimeout(runTimer.current);
      runTimer.current = setTimeout(function () { doRun(); }, 400);
    }, [computeKey]);

    function fetchNode(n) {
      var ref = n.seriesRef; if (!ref) return;
      var p = ref.kind === 'stock'
        ? DD.autoPull(ref.ticker, ref.metricId, ref.freq).then(function (o) { return o.series || []; })
        : DD.fetchMacro({ uid: ref.uid, kind: ref.kind, source: ref.source, seriesId: ref.seriesId, ric: ref.ric });
      p.then(function (s) { if (!aliveUids.current[n.id]) return; setNodes(function (ns) { return ns.map(function (x) { return x.id === n.id ? Object.assign({}, x, { series: s }) : x; }); }); }).catch(function () { });
    }
    function newId() { var id = 'n' + (idc.current++); aliveUids.current[id] = true; return id; }

    function addMacro(item) {
      var existSyms = nodes.map(function (n) { return n.sym; });
      var id = newId();
      var node = { id: id, label: item.label, sym: symFrom(item.label, existSyms), method: nodes.length ? 'regression' : 'rw', parents: [], lags: {}, params: {}, isTarget: nodes.length === 0, source: 'macro', seriesRef: { uid: item.uid, kind: item.kind, source: item.source, seriesId: item.seriesId, ric: item.ric }, series: null };
      setNodes(function (ns) { return ns.concat([node]); }); setSelectedId(id); setPicking(false);
      fetchNode(node);
    }
    function addManual(label, series) {
      var existSyms = nodes.map(function (n) { return n.sym; }); var id = newId();
      var node = { id: id, label: label || 'Manual', sym: symFrom(label, existSyms), method: nodes.length ? 'regression' : 'rw', parents: [], lags: {}, params: {}, isTarget: nodes.length === 0, source: 'manual', series: series };
      setNodes(function (ns) { return ns.concat([node]); }); setSelectedId(id); setPasting(false);
    }
    function addStock(label, series, ref, currency, kind) {
      var existSyms = nodes.map(function (n) { return n.sym; }); var id = newId();
      var node = { id: id, label: label, sym: symFrom(label, existSyms), method: nodes.length ? 'regression' : 'rw', parents: [], lags: {}, params: {}, isTarget: nodes.length === 0, source: 'stock', seriesRef: ref, currency: currency || null, kind: kind || 'currency', series: series };
      setNodes(function (ns) { return ns.concat([node]); }); setSelectedId(id); setPicking2(false);
    }
    function addDerived() {
      var existSyms = nodes.map(function (n) { return n.sym; }); var id = newId();
      var node = { id: id, label: 'Derived', sym: symFrom('Derived', existSyms), method: 'equation', parents: [], lags: {}, equation: '', params: {}, isTarget: false, source: 'derived', series: null };
      setNodes(function (ns) { return ns.concat([node]); }); setSelectedId(id);
    }
    function changeNode(id, patch) { setNodes(function (ns) { return ns.map(function (n) { return n.id === id ? Object.assign({}, n, patch) : n; }); }); }
    function removeNode(id) { aliveUids.current[id] = false; setNodes(function (ns) { return ns.filter(function (n) { return n.id !== id; }).map(function (n) { if ((n.parents || []).indexOf(id) > -1) { var lg = Object.assign({}, n.lags); delete lg[id]; return Object.assign({}, n, { parents: n.parents.filter(function (p) { return p !== id; }), lags: lg }); } return n; }); }); if (selectedId === id) setSelectedId(null); }
    function setTarget(id) { setNodes(function (ns) { return ns.map(function (n) { return Object.assign({}, n, { isTarget: n.id === id }); }); }); }

    function doRun() {
      setErr(''); setRunning(true); setStale(false);
      setTimeout(function () {
        try {
          var out = F.runForecast({ horizon: horizon, bandPct: bandPct, sims: 240, nodes: nodes });
          if (out.error) { setErr(out.error); setResult(null); } else { setResult(out); }
        } catch (e) { setErr(String(e && e.message || e)); setResult(null); }
        setRunning(false);
      }, 20);
    }

    function pinBaseline() {
      if (!result) return;
      if (pinned) { setPinned(null); return; }
      var t = result.nodes[result.target];
      setPinned({ target: result.target, sym: t.sym, label: t.label, fcst: t.fcst.slice(), end: result.dates.future[result.dates.future.length - 1] });
    }
    function setFreq(fr) { setHorizon(Object.assign({}, horizon, { freq: fr })); }
    function setN(n) { setHorizon(Object.assign({}, horizon, { n: Math.max(1, Math.min(240, n || 1)) })); }
    function presetYears(yrs) { var py = (FREQS.find(function (f) { return f.id === horizon.freq; }) || { perYear: 4 }).perYear; setN(yrs * py); }
    var endLabel = result ? (result.dates.future[result.dates.future.length - 1] || '').slice(0, 7) : null;
    var loggedIn = cloudEnabled();
    var target = result ? result.nodes[result.target] : null;

    return (
      <section className="an-lab fc-lab">
        <div className="an-topbar">
          <div className="an-title">{cfg.title} <span className="an-title-sub">· {cfg.sub}</span></div>
          <div className="an-topbar-sp" />
          {stale && result && <span className="fc-stale">● updating…</span>}
          <span className={'an-sync an-sync-' + (cloudOff ? 'local' : sync)} title={cloudOff ? 'Cloud unreachable on load — local only this session.' : ''}>{cloudOff ? '⚠ Local only' : sync === 'saving' ? '⟳ Saving…' : sync === 'saved' ? '☁ Saved' : sync === 'local' ? '✓ Local' : (loggedIn ? '☁ Cloud' : '✓ Local')}</span>
          <button className="an-run fc-run" disabled={running} onClick={doRun}>{running ? '⟳ Running…' : result ? '↻ Re-run' : '▶ Run forecast'}</button>
        </div>

        <div className="fc-grid">
          {/* LEFT — horizon + variables */}
          <aside className="an-rail fc-rail">
            <div className="fc-horizon">
              <div className="an-rail-h">Horizon</div>
              <div className="ed-freq">{FREQS.map(function (f) { return <button key={f.id} className={'ed-freq-btn ' + (horizon.freq === f.id ? 'on' : '')} onClick={function () { setFreq(f.id); }}>{f.label}</button>; })}</div>
              <div className="fc-hn">
                <button className="fc-step" onClick={function () { setN(horizon.n - 1); }}>−</button>
                <input className="fc-hn-in" type="number" min="1" max="240" value={horizon.n} onChange={function (e) { setN(+e.target.value); }} />
                <button className="fc-step" onClick={function () { setN(horizon.n + 1); }}>+</button>
                <span className="fc-hn-unit">{FREQS.find(function (f) { return f.id === horizon.freq; }).label.toLowerCase().replace('ly', '') + 's'}</span>
              </div>
              <div className="fc-presets">{[5, 10, 20].map(function (y) { return <button key={y} className="fc-preset" onClick={function () { presetYears(y); }}>{y}y</button>; })}</div>
              {endLabel && <div className="fc-end">→ forecasts to <b>{endLabel}</b></div>}
              <div className="fc-band-row"><label>Band</label><select value={bandPct} onChange={function (e) { setBandPct(+e.target.value); }}><option value="50">50%</option><option value="80">80%</option><option value="90">90%</option><option value="95">95%</option></select></div>
            </div>

            <div className="an-rail-h" style={{ marginTop: 6 }}>Variables <span className="fc-count">{nodes.length}</span></div>
            <div className="fc-add-row">
              {cfg.equity && <button className="an-add fc-add-stock" onClick={function () { setPicking2(true); }}>＋ Stock metric</button>}
              <button className="an-add" onClick={function () { setPicking(true); }}>＋ Macro</button>
              <button className="an-add" onClick={function () { setPasting(true); }}>＋ Manual</button>
              <button className="an-add" onClick={addDerived}>＋ Equation</button>
            </div>
            <div className="an-tray fc-tray">
              {!nodes.length && (cfg.equity
                ? <div className="an-empty">No variables yet. Add the <b>target</b> — e.g. <b>＋ Stock metric</b> → a ticker's Revenue/EBIT — then its <b>drivers</b> (＋ Macro: CPO, FX, rates; or other stock metrics), connect them in the graph and pick a method for each.</div>
                : <div className="an-empty">No variables yet. Add the <b>target</b> (e.g. Gold) and its <b>drivers</b> (DXY, 10Y yield), then connect them in the graph and pick a forecast method for each.</div>)}
              {nodes.map(function (n) { return (
                <div key={n.id} className={'fc-vcard ' + (n.id === selectedId ? 'on' : '')} onClick={function () { setSelectedId(n.id); }}>
                  <span className="fc-vc-glyph" title={n.method}>{methodGlyph(n.method)}</span>
                  <span className="fc-vc-sym">{n.sym}</span>
                  <span className="fc-vc-lbl" title={n.label}>{n.label}</span>
                  {n.isTarget && <span className="fc-vc-star">★</span>}
                  {n.source !== 'derived' && !n.series && <span className="fc-vc-load" title="loading series">…</span>}
                </div>
              ); })}
            </div>
          </aside>

          {/* CENTER — graph + inspector */}
          <div className="fc-center">
            <div className="fc-graph-h">Model graph <span className="fc-dim">drivers flow → target · click a node to edit</span></div>
            {nodes.length ? <GraphCanvas nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} /> : <div className="an-empty fc-graph-empty">Your variable graph appears here.</div>}
            <NodeInspector node={selected} nodes={nodes} horizon={horizon} onChange={changeNode} onRemove={removeNode} onSetTarget={setTarget} />
            {err && <div className="an-err">{err}</div>}
          </div>

          {/* RIGHT — forecast output */}
          <div className={'an-results fc-out' + (stale && result ? ' fc-stale-out' : '')}>
            {!result && !running && <div className="an-empty an-results-empty">Build the graph, then <b>Run forecast</b>. The target's path + fan band and every driver's forecast appear here. Flip any driver to a <b>scenario</b> and the cone updates live.</div>}
            {running && !result && <div className="an-running"><div className="an-running-bar" />Forecasting…</div>}
            {result && target && (function () {
              var hL = (function (a) { for (var i = a.length - 1; i >= 0; i--) if (a[i] != null && isFinite(a[i])) return a[i]; return null; })(target.hist);
              var fL = target.fcst[target.fcst.length - 1];
              var up = (hL != null && fL != null) ? fL >= hL : null;
              var base = (pinned && pinned.target === result.target && pinned.fcst.length === target.fcst.length) ? pinned.fcst : null;
              var vsBase = base ? fL - base[base.length - 1] : null;
              var tf = target.fit || {};
              var tgtNode = byId[result.target] || {};
              var ccy = tgtNode.currency || '', tkind = tgtNode.kind || 'currency';
              var spuriousDrivers = result.order.filter(function (id) { return id !== result.target && result.nodes[id].fit && result.nodes[id].fit.spurious; }).map(function (id) { return result.nodes[id].sym; });
              return <div className="fc-res">
                {stale && <div className="fc-updating">● updating forecast…</div>}
                <div className="fc-res-h">
                  <span className="fc-res-title">★ {target.label}</span>
                  <span className="fc-res-actions">
                    <button className={'fc-pinbtn ' + (pinned ? 'on' : '')} title="Snapshot this forecast as a baseline, then change a driver's scenario to see the delta you caused" onClick={pinBaseline}>{pinned ? '✓ baseline pinned' : '⊕ Pin baseline'}</button>
                    <span className="fc-res-end">{result.H} {FREQS.find(function (f) { return f.id === result.freq; }) ? FREQS.find(function (f) { return f.id === result.freq; }).label.toLowerCase() : ''} → {endLabel}</span>
                  </span>
                </div>
                <div className="fc-res-now">last actual <b>{fmtKind(hL, tkind, ccy)}</b> → forecast <b className={up == null ? '' : up ? 'fc-pos' : 'fc-neg'}>{fmtKind(fL, tkind, ccy)}</b>{target.lo && target.lo[target.lo.length - 1] != null && <span className="fc-dim"> ({bandPct}% band {fmtKind(target.lo[target.lo.length - 1], tkind, ccy)} – {fmtKind(target.hi[target.hi.length - 1], tkind, ccy)})</span>}{vsBase != null && <span className="fc-dim"> · vs baseline <b className={vsBase >= 0 ? 'fc-pos' : 'fc-neg'}>{(vsBase >= 0 ? '+' : '') + fmtKind(vsBase, tkind, ccy)}</b></span>}</div>
                {tf.error && <div className="an-verdict warn">⚠ Target won't fit: {tf.error}</div>}
                {tf.spurious && <div className="an-verdict warn">⚠ <b>Likely spurious</b>: the target's residuals are non-stationary (DW={fmtVal(tf.dw, 2)}{tf.adfP != null ? ', ADF p≈' + fmtVal(tf.adfP, 2) : ''}). A high R² here can be a common-trend artefact — {tf.logspace ? 'try differenced / % growth drivers (log Y is already on).' : <span>try <b>differenced / % growth</b> drivers, or the <b>log Y</b> toggle for a price.</span>}</div>}
                {target.extreme && <div className="an-verdict warn">⚠ Forecast runs far beyond the historical range (runaway compounding) — sanity-check the driver scenarios / growth rates.</div>}
                {spuriousDrivers.length > 0 && <div className="an-note">⚠ {spuriousDrivers.length} driver fit(s) flagged spurious ({spuriousDrivers.join(', ')}) — the target cone inherits their uncertainty.</div>}
                {tf.kind === 'regression' && tf.thin && !tf.error && <div className="an-verdict warn">⚠ <b>Thin fit</b>: only {tf.nfit} overlapping periods (auto-pulled fundamentals are short). Treat βs as indicative — paste a longer metric history (＋ Manual) or forecast it univariately (drift/growth).</div>}
                {tf.kind === 'regression' && !tf.error && <div className="an-note">Fit R²={fmtVal(tf.r2, 3)} on {tf.nfit} periods · {(tf.names || []).slice(1).join(', ')}{tf.logspace ? ' · log Y (point = median)' : ''}{tf.holdout ? ' · hold-out RMSE ' + fmtVal(tf.holdout.rmse) + ' / MAE ' + fmtVal(tf.holdout.mae) + ' (last ' + tf.holdout.n + ')' : ''}</div>}
                <FcChart hist={target.hist} fcst={target.fcst} lo={target.lo} hi={target.hi} fit={tf.fittedHist} base={base} bandPct={bandPct} histDates={result.dates.hist} futureDates={result.dates.future} color={COL.target} height={184} />
                <div className="fc-legend"><span className="fc-lg"><i className="fc-lg-hist" />history</span><span className="fc-lg"><i className="fc-lg-fcst" />forecast</span>{tf.fittedHist && <span className="fc-lg"><i className="fc-lg-fit" />in-sample fit</span>}{base && <span className="fc-lg"><i className="fc-lg-base" />baseline</span>}<span className="fc-lg"><i className="fc-lg-band" />{bandPct}% band</span></div>
                <div className="fc-sm-h">Drivers</div>
                <div className="fc-smalls">
                  {result.order.filter(function (id) { return id !== result.target; }).map(function (id) { var nd = result.nodes[id]; return (
                    <div key={id} className="fc-sm" onClick={function () { setSelectedId(id); }}>
                      <div className="fc-sm-top"><span className="fc-sm-sym">{methodGlyph(nd.method)} {nd.sym}</span><span className="fc-sm-val">{fmtVal(nd.fcst[nd.fcst.length - 1])}</span></div>
                      <FcChart hist={nd.hist} fcst={nd.fcst} lo={nd.lo} hi={nd.hi} fit={nd.fit && nd.fit.fittedHist} histDates={result.dates.hist} futureDates={result.dates.future} height={92} />
                      {nd.fit && nd.fit.error && <div className="fc-sm-err">⚠ {nd.fit.error}</div>}
                      {nd.fit && nd.fit.spurious && <div className="fc-sm-err">⚠ spurious fit (non-stationary residuals)</div>}
                      {nd.extreme && <div className="fc-sm-err">⚠ runs far beyond history</div>}
                    </div>
                  ); })}
                </div>
              </div>;
            })()}
          </div>
        </div>

        {picking && <FcPicker onClose={function () { setPicking(false); }} onPick={addMacro} />}
        {picking2 && <StockMetricModal onClose={function () { setPicking2(false); }} onAdd={addStock} />}
        {pasting && <PasteModal onClose={function () { setPasting(false); }} onAdd={addManual} />}
      </section>
    );
  }

  // ---- manual series paste modal ----
  function PasteModal(props) {
    var _l = React.useState(''), label = _l[0], setLabel = _l[1];
    var _t = React.useState(''), text = _t[0], setText = _t[1];
    var _e = React.useState(''), e = _e[0], setE = _e[1];
    function add() { var r = (window.DriverData ? window.DriverData.parseSeries(text) : { series: [] }); if (!r.series.length) { setE('Could not parse any (date, value) rows.'); return; } props.onAdd(label || 'Manual series', r.series); }
    return (
      <div className="an-modal-bg" onClick={props.onClose}>
        <div className="an-modal" onClick={function (ev) { ev.stopPropagation(); }}>
          <div className="an-modal-h"><span>Add a manual series</span><button className="an-modal-x" onClick={props.onClose}>×</button></div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="ed-input" placeholder="Label (e.g. House view CPI)" value={label} onChange={function (ev) { setLabel(ev.target.value); }} />
            <textarea className="ed-paste" placeholder={'2020-Q1, 100\n2020-Q2, 102\n…  (one period per line)'} value={text} onChange={function (ev) { setText(ev.target.value); }} />
            {e && <div className="an-err">{e}</div>}
            <button className="an-btn ed-btn-wide" onClick={add}>Add series</button>
          </div>
        </div>
      </div>
    );
  }

  // macro (drivers from macro data) and equity (target metric pulled from a stock) flavours
  window.ForecastLab = function ForecastLab() { return React.createElement(ForecastStudio, { config: MACRO_CFG }); };
  window.EquityForecastLab = function EquityForecastLab() { return React.createElement(ForecastStudio, { config: EQUITY_CFG }); };
})();
