// ================================================================
// scanners-ws.jsx — LBC Equity Screener (window.ScannersWorkspace).
// A Bloomberg/CapIQ-style screener over the IDX universe: set parameters
// (sector, market cap, free float, liquidity, valuation, profitability,
// growth, leverage, yield) and get a sortable, exportable result set. Data
// lives in public.equity_screen (refreshed from Yahoo by the equity-screen
// edge fn); saved screens persist per-account to equity_screen_workspace.
// LBC dark skin (reuses the .an-* token system). No sample data.
// ================================================================
(function () {
  'use strict';
  var SB = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  var FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/equity-screen';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  // ---- per-account cloud sync (saved screens) ----
  function lbcSession() { try { var s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch (e) { return null; } }
  function lbcToken() { var s = lbcSession(); return s ? s.token : null; }
  function lbcSub() { var s = lbcSession(); return (s && s.user) ? s.user.id : null; }
  function cloudEnabled() { return !!(lbcToken() && lbcSub()); }
  function cloudLoad() {
    if (!cloudEnabled()) return Promise.resolve(null);
    return fetch(SB + '/equity_screen_workspace?user_sub=eq.' + encodeURIComponent(lbcSub()) + '&select=doc', { headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken() } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (rows) { return (rows && rows[0] && rows[0].doc) ? rows[0].doc : null; });
  }
  function cloudSave(doc) {
    if (!cloudEnabled()) return Promise.resolve(false);
    return fetch(SB + '/equity_screen_workspace', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + lbcToken(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_sub: lbcSub(), doc: doc, updated_at: new Date().toISOString() }]) })
      .then(function (r) { if (!r.ok) return Promise.reject('HTTP ' + r.status); return true; });
  }
  var LOCAL_KEY = 'lbcEquityScreens';

  // ---- formatting ----
  function fmtMoney(v) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'; if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K'; return Number(v).toFixed(0); }
  function fmtNum(v, d) { if (v == null || !isFinite(v)) return '—'; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  function fmtPct(v) { if (v == null || !isFinite(v)) return '—'; return Number(v).toFixed(1) + '%'; }

  // ---- column metadata (single source of truth) ----
  var COLUMNS = [
    { key: 'symbol', label: 'Ticker', kind: 'text', frozen: true },
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'sector', label: 'Sector', kind: 'text' },
    { key: 'price', label: 'Price', kind: 'num', d: 0 },
    { key: 'change_pct', label: 'Δ%', kind: 'signpct' },
    { key: 'mcap', label: 'Mkt Cap', kind: 'money' },
    { key: 'free_float_pct', label: 'Free float', kind: 'pct' },
    { key: 'adv_value', label: 'Liquidity', kind: 'money' },
    { key: 'pe', label: 'P/E', kind: 'num' },
    { key: 'pb', label: 'P/B', kind: 'num' },
    { key: 'ev_ebitda', label: 'EV/EBITDA', kind: 'num' },
    { key: 'roe', label: 'ROE', kind: 'pct' },
    { key: 'roa', label: 'ROA', kind: 'pct' },
    { key: 'net_margin', label: 'Net mgn', kind: 'pct' },
    { key: 'gross_margin', label: 'Gross mgn', kind: 'pct' },
    { key: 'rev_growth', label: 'Rev g', kind: 'pct' },
    { key: 'earnings_growth', label: 'EPS g', kind: 'pct' },
    { key: 'debt_equity', label: 'D/E', kind: 'num' },
    { key: 'current_ratio', label: 'Current', kind: 'num' },
    { key: 'div_yield', label: 'Div yld', kind: 'pct' },
    { key: 'beta', label: 'Beta', kind: 'num' }
  ];
  var DEFAULT_COLS = ['symbol', 'name', 'sector', 'price', 'mcap', 'free_float_pct', 'adv_value', 'pe', 'pb', 'roe', 'net_margin', 'rev_growth', 'div_yield', 'beta'];

  // numeric filters → PostgREST gte/lte. bound: 'min'|'max'|'minmax'
  var FILTERS = [
    { key: 'mcap', label: 'Market cap', bound: 'minmax', hint: 'IDR' },
    { key: 'free_float_pct', label: 'Free float %', bound: 'min' },
    { key: 'adv_value', label: 'Liquidity (avg daily value)', bound: 'min', hint: 'IDR/day' },
    { key: 'pe', label: 'P/E', bound: 'minmax' },
    { key: 'pb', label: 'P/B', bound: 'minmax' },
    { key: 'ev_ebitda', label: 'EV/EBITDA', bound: 'max' },
    { key: 'roe', label: 'ROE %', bound: 'min' },
    { key: 'net_margin', label: 'Net margin %', bound: 'min' },
    { key: 'gross_margin', label: 'Gross margin %', bound: 'min' },
    { key: 'rev_growth', label: 'Revenue growth %', bound: 'min' },
    { key: 'earnings_growth', label: 'EPS growth %', bound: 'min' },
    { key: 'debt_equity', label: 'Debt / Equity', bound: 'max' },
    { key: 'current_ratio', label: 'Current ratio', bound: 'min' },
    { key: 'div_yield', label: 'Dividend yield %', bound: 'min' },
    { key: 'beta', label: 'Beta', bound: 'max' }
  ];

  function fmtCell(col, v) {
    if (col.kind === 'text') return v == null ? '—' : v;
    if (col.kind === 'money') return fmtMoney(v);
    if (col.kind === 'pct') return fmtPct(v);
    if (col.kind === 'signpct') return v == null ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
    return fmtNum(v, col.d == null ? 2 : col.d);
  }

  function sectorsFromUniverse() {
    var u = window.IDX_UNIVERSE_FULL || [];
    var set = {}; u.forEach(function (r) { if (r.sector) set[r.sector] = 1; });
    return Object.keys(set).sort();
  }

  function EquityScreener(props) {
    var _f = React.useState({}), filters = _f[0], setFilters = _f[1];        // {key__min, key__max}
    var _sec = React.useState([]), secs = _sec[0], setSecs = _sec[1];          // selected sectors
    var _sort = React.useState({ col: 'mcap', dir: 'desc' }), sort = _sort[0], setSort = _sort[1];
    var _rows = React.useState([]), rows = _rows[0], setRows = _rows[1];
    var _ld = React.useState(false), loading = _ld[0], setLoading = _ld[1];
    var _err = React.useState(''), err = _err[0], setErr = _err[1];
    var _cov = React.useState(null), coverage = _cov[0], setCoverage = _cov[1];
    var _cols = React.useState(DEFAULT_COLS), cols = _cols[0], setCols = _cols[1];
    var _colpick = React.useState(false), colPick = _colpick[0], setColPick = _colpick[1];
    var _saved = React.useState([]), saved = _saved[0], setSaved = _saved[1];
    var _sync = React.useState('idle'), sync = _sync[0], setSync = _sync[1];
    var _ref = React.useState(null), refresh = _ref[0], setRefresh = _ref[1];
    var loaded = React.useRef(false), cloudSafe = React.useRef(false), saveTimer = React.useRef(null), cancelRef = React.useRef(false);
    var sectors = React.useMemo(sectorsFromUniverse, []);

    React.useEffect(function () {
      cloudLoad().then(function (doc) { cloudSafe.current = true; if (!doc) { try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { } } if (doc && doc.saved) setSaved(doc.saved); })
        .catch(function () { try { var d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); if (d && d.saved) setSaved(d.saved); } catch (e) { } })
        .then(function () { loaded.current = true; });
      fetchCoverage();
      runQuery({}, [], { col: 'mcap', dir: 'desc' });
      return function () { cancelRef.current = true; if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, []);

    function fetchCoverage() {
      fetch(SB + '/equity_screen?select=symbol', { headers: { apikey: ANON, Prefer: 'count=exact', Range: '0-0' } })
        .then(function (r) { var cr = r.headers.get('content-range'); var total = cr ? parseInt(cr.split('/')[1], 10) : NaN; setCoverage(isFinite(total) ? total : 0); })
        .catch(function () { setCoverage(null); });
    }

    function persistSaved(next) {
      var doc = { v: 1, saved: next, updated: new Date().toISOString() };
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch (e) { }
      if (cloudEnabled() && cloudSafe.current) { setSync('saving'); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(function () { cloudSave(doc).then(function () { setSync('saved'); setTimeout(function () { setSync('idle'); }, 1400); }).catch(function () { setSync('local'); }); }, 500); }
    }

    // build the PostgREST query from filter state and fetch
    function runQuery(fl, sectorsSel, srt) {
      fl = fl || filters; sectorsSel = sectorsSel || secs; srt = srt || sort;
      var qs = ['select=*', 'limit=500'];
      FILTERS.forEach(function (f) {
        var mn = parseFloat(fl[f.key + '__min']), mx = parseFloat(fl[f.key + '__max']);
        if (isFinite(mn)) qs.push(encodeURIComponent(f.key) + '=gte.' + mn);
        if (isFinite(mx)) qs.push(encodeURIComponent(f.key) + '=lte.' + mx);
      });
      if (sectorsSel.length) qs.push('sector=in.(' + sectorsSel.map(function (s) { return '"' + s.replace(/"/g, '') + '"'; }).join(',') + ')');
      qs.push('order=' + encodeURIComponent(srt.col) + '.' + srt.dir + '.nullslast');
      setLoading(true); setErr('');
      fetch(SB + '/equity_screen?' + qs.join('&'), { headers: { apikey: ANON } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
        .then(function (data) { setRows(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(function (e) { setErr('Query failed (' + e + ').'); setRows([]); setLoading(false); });
    }

    function setF(key, bound, val) { setFilters(function (cur) { var next = Object.assign({}, cur); var k = key + '__' + bound; if (val === '' || val == null) delete next[k]; else next[k] = val; return next; }); }
    function applyNow() { runQuery(filters, secs, sort); }
    function clearAll() { setFilters({}); setSecs([]); runQuery({}, [], sort); }
    function toggleSector(s) { setSecs(function (cur) { return cur.indexOf(s) > -1 ? cur.filter(function (x) { return x !== s; }) : cur.concat([s]); }); }
    function setSortCol(col) { var dir = (sort.col === col && sort.dir === 'desc') ? 'asc' : 'desc'; var srt = { col: col, dir: dir }; setSort(srt); runQuery(filters, secs, srt); }
    function toggleCol(key) { setCols(function (cur) { return cur.indexOf(key) > -1 ? cur.filter(function (k) { return k !== key; }) : cur.concat([key]); }); }

    function activeCount() { var c = secs.length ? 1 : 0; FILTERS.forEach(function (f) { if (isFinite(parseFloat(filters[f.key + '__min'])) || isFinite(parseFloat(filters[f.key + '__max']))) c++; }); return c; }

    function saveScreen() {
      var name = window.prompt('Save screen as:', 'Screen ' + new Date().toLocaleDateString());
      if (!name) return;
      var entry = { id: 's' + Date.now(), name: name, filters: filters, secs: secs, sort: sort, at: new Date().toISOString() };
      var next = [entry].concat(saved).slice(0, 40); setSaved(next); persistSaved(next);
    }
    function loadScreen(e) { setFilters(e.filters || {}); setSecs(e.secs || []); setSort(e.sort || { col: 'mcap', dir: 'desc' }); runQuery(e.filters || {}, e.secs || [], e.sort || { col: 'mcap', dir: 'desc' }); }
    function delScreen(id) { var next = saved.filter(function (s) { return s.id !== id; }); setSaved(next); persistSaved(next); }

    function exportCSV() {
      var visible = COLUMNS.filter(function (c) { return cols.indexOf(c.key) > -1; });
      var head = visible.map(function (c) { return c.label; }).join(',');
      var lines = rows.map(function (r) { return visible.map(function (c) { var v = r[c.key]; if (v == null) return ''; return (c.kind === 'text') ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(','); });
      var blob = new Blob([head + '\n' + lines.join('\n')], { type: 'text/csv' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lbc-screen-' + Date.now() + '.csv'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }

    // ---- dataset refresh: chunk the IDX universe through the edge fn ----
    function startRefresh() {
      var u = window.IDX_UNIVERSE_FULL || [];
      if (!u.length) { setErr('IDX universe not loaded.'); return; }
      if (!window.confirm('Refresh fundamentals for ' + u.length + ' IDX names from Yahoo? Runs in the background (a few minutes); you can keep working and stop anytime.')) return;
      cancelRef.current = false;
      var CH = 10, batches = []; for (var i = 0; i < u.length; i += CH) batches.push(u.slice(i, i + CH));
      var state = { running: true, done: 0, total: u.length, written: 0, failed: 0 };
      setRefresh(Object.assign({}, state));
      var bi = 0;
      function step() {
        if (cancelRef.current || bi >= batches.length) { setRefresh(Object.assign({}, state, { running: false })); fetchCoverage(); runQuery(filters, secs, sort); return; }
        var batch = batches[bi++];
        var payload = { rows: batch.map(function (r) { return { symbol: r.sym, yahoo: r.sym + '.JK', name: r.name, sector: r.sector, sub_sector: r.sub }; }) };
        fetch(FN, { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (j) { state.written += (j && j.written) || 0; })
          .catch(function () { /* batch failed; counted in done below */ })
          .then(function () { state.done = Math.min(state.total, bi * CH); state.failed = state.done - state.written; setRefresh(Object.assign({}, state)); setTimeout(step, 150); });
      }
      step();
    }
    function cancelRefresh() { cancelRef.current = true; }

    var visibleCols = COLUMNS.filter(function (c) { return cols.indexOf(c.key) > -1; });
    var loggedIn = cloudEnabled();

    return (
      <section className="an-lab sc-lab">
        <div className="an-topbar">
          <div className="an-title">Equity Screener <span className="an-title-sub">· IDX fundamentals & market data</span></div>
          {coverage != null && <span className="sc-cov">{coverage} names in dataset</span>}
          <div className="an-topbar-sp" />
          {refresh && refresh.running && <span className="sc-refrun">⟳ {refresh.done}/{refresh.total} · {refresh.written} ok <button className="sc-cancel" onClick={cancelRefresh}>stop</button></span>}
          <span className={'an-sync an-sync-' + sync}>{sync === 'saving' ? '⟳ Saving…' : sync === 'saved' ? '☁ Saved' : (loggedIn ? '☁ Cloud' : '✓ Local')}</span>
          <button className="an-btn" onClick={startRefresh} disabled={!!(refresh && refresh.running)} title="Pull/refresh fundamentals for the IDX universe from Yahoo">⟳ Refresh data</button>
        </div>

        <div className="sc-grid">
          {/* LEFT — filters */}
          <aside className="an-rail sc-rail">
            <div className="an-rail-h">Filters <span className="sc-fcount">{activeCount()}</span></div>
            <div className="sc-sectors">
              <div className="sc-sub">Sectors</div>
              <div className="sc-sec-chips">
                {sectors.map(function (s) { return <button key={s} className={'sc-sec ' + (secs.indexOf(s) > -1 ? 'on' : '')} onClick={function () { toggleSector(s); }}>{s}</button>; })}
              </div>
            </div>
            <div className="sc-filters">
              {FILTERS.map(function (f) {
                var bMin = f.bound === 'min' || f.bound === 'minmax', bMax = f.bound === 'max' || f.bound === 'minmax';
                return (
                  <div key={f.key} className="sc-filt">
                    <label className="sc-filt-l">{f.label}{f.hint ? <span className="sc-hint"> · {f.hint}</span> : ''}</label>
                    <div className="sc-filt-in">
                      {bMin && <input type="number" placeholder="min" value={filters[f.key + '__min'] == null ? '' : filters[f.key + '__min']} onChange={function (e) { setF(f.key, 'min', e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') applyNow(); }} />}
                      {bMin && bMax && <span className="sc-dash">–</span>}
                      {bMax && <input type="number" placeholder="max" value={filters[f.key + '__max'] == null ? '' : filters[f.key + '__max']} onChange={function (e) { setF(f.key, 'max', e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') applyNow(); }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sc-filt-actions">
              <button className="an-run sc-apply" onClick={applyNow}>▶ Run screen</button>
              <button className="an-btn" onClick={clearAll}>Clear</button>
            </div>
            {saved.length > 0 && <div className="an-saved sc-saved">
              <div className="an-rail-h">Saved screens</div>
              {saved.map(function (s) { return <div key={s.id} className="an-saved-row"><span className="an-saved-name" onClick={function () { loadScreen(s); }} title={s.name}>{s.name}</span><button className="an-var-x" onClick={function () { delScreen(s.id); }}>×</button></div>; })}
            </div>}
          </aside>

          {/* RIGHT — results */}
          <div className="sc-main">
            <div className="sc-toolbar">
              <span className="sc-count">{loading ? 'Screening…' : rows.length + ' matches'}</span>
              <span className="an-topbar-sp" />
              <button className="an-btn" onClick={function () { setColPick(!colPick); }}>▦ Columns</button>
              <button className="an-btn" onClick={saveScreen}>＋ Save screen</button>
              <button className="an-btn" onClick={exportCSV} disabled={!rows.length}>⤓ CSV</button>
            </div>
            {colPick && <div className="sc-colpick">{COLUMNS.map(function (c) { if (c.key === 'symbol') return null; var on = cols.indexOf(c.key) > -1; return <button key={c.key} className={'sc-col-tog ' + (on ? 'on' : '')} onClick={function () { toggleCol(c.key); }}>{c.label}</button>; })}</div>}
            {err && <div className="an-err">{err}</div>}
            {!loading && !rows.length && !err && <div className="an-empty sc-empty">{coverage === 0 ? <span>No screener data yet. Click <b>⟳ Refresh data</b> to pull IDX fundamentals from Yahoo (runs in the background).</span> : 'No names match these filters — loosen them and Run screen.'}</div>}
            {!!rows.length && <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr>{visibleCols.map(function (c) { return <th key={c.key} className={(c.frozen ? 'sc-frozen ' : '') + (c.kind === 'text' ? 'sc-th-l' : 'sc-th-r') + (sort.col === c.key ? ' sc-sorted' : '')} onClick={function () { setSortCol(c.key); }} title="Click to sort">{c.label}{sort.col === c.key ? (sort.dir === 'desc' ? ' ▾' : ' ▴') : ''}</th>; })}</tr></thead>
                <tbody>{rows.map(function (r) { return (
                  <tr key={r.symbol} className="sc-row" onClick={function () { if (props.openTab) props.openTab({ kind: 'stock', symbol: r.symbol, title: r.symbol + ' · ' + (r.name || '') }); }}>
                    {visibleCols.map(function (c) { var v = r[c.key]; var cls = (c.frozen ? 'sc-frozen ' : '') + (c.kind === 'text' ? 'sc-td-l' : 'sc-td-r'); if (c.kind === 'signpct' && v != null) cls += v >= 0 ? ' sc-pos' : ' sc-neg'; return <td key={c.key} className={cls} title={c.key === 'name' && v ? v : undefined}>{fmtCell(c, v)}</td>; })}
                  </tr>
                ); })}</tbody>
              </table>
            </div>}
          </div>
        </div>
      </section>
    );
  }

  window.ScannersWorkspace = EquityScreener;
})();
