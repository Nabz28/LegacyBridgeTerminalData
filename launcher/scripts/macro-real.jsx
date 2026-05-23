// ================================================================
// MacroTerminal — multi-tool Macro workspace with a RIGHT toolbar.
// Tools: Data Gatherer (old LBC structure: category tree + search +
// chart + skill panel + CSV export), Correlation, Macro Variables Map.
// Reads Narin's macro + correlation Supabase schemas (anon key).
// Structure/functions follow the old terminal; design = new v5.
// ================================================================

const SB_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const sbGet = (path, profile) =>
  fetch(SB_BASE + path, { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Accept-Profile': profile } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
const sbRpc = (fn, body, profile) =>
  fetch(SB_BASE + '/rpc/' + fn, { method: 'POST', headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', 'Content-Profile': profile }, body: JSON.stringify(body) })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

// ---- authed access (per-account dashboard prefs) — uses the LBC session JWT ----
const lbcSession = () => {
  try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; }
};
const lbcToken = () => { const s = lbcSession(); return s ? s.token : null; };
const lbcSub   = () => { const s = lbcSession(); return s && s.user ? s.user.id : null; };
const sbAuthGet = (path, profile) => {
  const t = lbcToken() || SB_ANON;
  return fetch(SB_BASE + path, { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + t, 'Accept-Profile': profile } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
};
const sbAuthSave = (path, rows, profile) => {
  const t = lbcToken();
  if (!t) return Promise.reject('no-auth');
  return fetch(SB_BASE + path, { method: 'POST', headers: { apikey: SB_ANON, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', 'Content-Profile': profile, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) })
    .then((r) => (r.ok ? true : Promise.reject(r.status)));
};

const MACRO_COUNTRIES = [{ id: 'us', label: 'US' }, { id: 'id', label: 'ID' }, { id: 'cn', label: 'CN' }];

// ---- CSV download (old terminal "export" function) ----
const downloadCsv = (filename, rows) => {
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// ================================================================
// SeriesDetailModal — click a Dashboard card or a Live Markets row to
// pull the FULL history (via the series-proxy edge fn: FRED / DBnomics /
// Yahoo), shown in the Data-Gatherer crosshair chart with CSV export.
// ================================================================
const SERIES_PROXY = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/series-proxy';
const SERIES_RANGES = [{ k: '1y', l: '1Y' }, { k: '2y', l: '2Y' }, { k: '5y', l: '5Y' }, { k: '10y', l: '10Y' }, { k: 'max', l: 'Max' }];
const SERIES_INTERVALS = [{ k: '1d', l: 'D' }, { k: '1wk', l: 'W' }, { k: '1mo', l: 'M' }];
const RANGE_YEARS = { '1y': 1, '2y': 2, '5y': 5, '10y': 10 };
const TV_INTERVAL = { '1d': 'D', '1wk': 'W', '1mo': 'M' };
const TV_RANGE = { '1y': '12M', '2y': '60M', '5y': '60M', '10y': 'ALL', 'max': 'ALL' };
const _wkKey = (ds) => { const d = new Date(ds + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); };
const resampleObs = (arr, interval) => {
  if (interval === '1d' || arr.length < 2) return arr;
  const keyfn = interval === '1mo' ? (o) => o.date.slice(0, 7) : (o) => _wkKey(o.date);
  const m = new Map(); arr.forEach((o) => m.set(keyfn(o), o));   // ascending -> last per bucket
  return [...m.values()];
};

// title, sub, source(FRED|DBnomics|YAHOO), id, unit, tvSymbol(optional), onClose
const SeriesDetailModal = ({ title, sub, source, id, unit, tvSymbol, onClose }) => {
  const { AreaChart } = window.ChartLib || {};
  const fmt = window.fmt || { num: (v, d = 2) => Number(v).toFixed(d) };
  const isY = source === 'YAHOO';
  const [range, setRange] = React.useState('5y');
  const [interval, setIntervalState] = React.useState('1d');
  const [obs, setObs] = React.useState(null);
  const [err, setErr] = React.useState('');
  React.useEffect(() => {
    let cancelled = false; setObs(null); setErr('');
    // Yahoo: server returns the exact range+interval. FRED/DBnomics: fetch full once, shape client-side.
    const yqs = isY ? `&range=${range}&interval=${interval}` : '';
    fetch(`${SERIES_PROXY}?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}${yqs}`, { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (cancelled) return; if (d.error) { setErr(d.error); setObs([]); } else setObs(d.obs || []); })
      .catch((c) => { if (!cancelled) { setErr('Fetch failed (' + c + ')'); setObs([]); } });
    return () => { cancelled = true; };
  }, [source, id, isY ? range + '|' + interval : 'x']);
  const all = obs || [];
  // FRED/DBnomics: filter by range + resample to the chosen interval client-side. Yahoo is server-shaped.
  let series = all;
  if (!isY && all.length) {
    if (range !== 'max') { const cut = new Date(); cut.setFullYear(cut.getFullYear() - (RANGE_YEARS[range] || 5)); const cs = cut.toISOString().slice(0, 10); series = all.filter((o) => o.date >= cs); }
    series = resampleObs(series, interval);
  }
  const MAXPTS = 1500;
  const shown = series.length > MAXPTS
    ? (() => { const out = []; const step = series.length / MAXPTS; for (let i = 0; i < MAXPTS; i++) out.push(series[Math.floor(i * step)]); out.push(series[series.length - 1]); return out; })()
    : series;
  const values = shown.map((o) => o.value);
  const dates = shown.map((o) => o.date);
  const latest = all.length ? all[all.length - 1].value : null;
  const exportCsv = () => downloadCsv(`${(id || 'series').replace(/[^a-z0-9_.-]/gi, '_')}.csv`, [['date', 'value'], ...series.map((o) => [o.date, o.value])]);
  // Some TradingView symbols (non-US sovereign yields + a few data symbols) are
  // restricted in the free embed widget ("only available on TradingView"). A
  // personal Premium account can't unlock the anonymous embed, so we skip the
  // embed for those (our own data chart already covers them) and offer an
  // "Open in TradingView ↗" deep link instead (opens in the user's TV login).
  const tvBlocked = tvSymbol && SeriesDetailModal.EMBED_BLOCK.has(tvSymbol);
  const tvUrl = tvSymbol ? 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(tvSymbol) : null;
  const tvCfg = (tvSymbol && !tvBlocked) ? {
    symbol: tvSymbol, interval: TV_INTERVAL[interval] || 'D', range: TV_RANGE[range] || '60M',
    theme: 'dark', style: '2', locale: 'en', autosize: true, hide_side_toolbar: true, allow_symbol_change: false,
    save_image: false, backgroundColor: 'rgba(10,10,11,1)', gridColor: 'rgba(151,170,197,0.06)',
  } : null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(2,2,3,.7)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(1280px,97vw)', height: 'min(720px,92vh)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1,#0A0A0B)', border: '1px solid var(--border-default,rgba(255,255,255,.12))', borderRadius: 12, boxShadow: '0 24px 70px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle,rgba(255,255,255,.07))' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15.5, color: '#EAEFF7', letterSpacing: '-.01em' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary,#8E9AB0)', marginTop: 3 }}>{sub}{obs ? ` · ${series.length} points` : ''}{latest != null ? ` · latest ${fmt.num(latest, Math.abs(latest) < 10 ? 2 : 0)}${unit ? ' ' + unit : ''}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary,#8E9AB0)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 20px', borderBottom: '1px solid var(--border-subtle,rgba(255,255,255,.05))' }}>
          <div className="mtv-range">{SERIES_RANGES.map((r) => <button key={r.k} className={`mtv-range-btn ${range === r.k ? 'active' : ''}`} onClick={() => setRange(r.k)}>{r.l}</button>)}</div>
          <div className="mtv-range">{SERIES_INTERVALS.map((iv) => <button key={iv.k} className={`mtv-range-btn ${interval === iv.k ? 'active' : ''}`} onClick={() => setIntervalState(iv.k)}>{iv.l}</button>)}</div>
          <span style={{ flex: 1 }} />
          {tvUrl && <a href={tvUrl} target="_blank" rel="noopener" className="sw-tf" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} title={tvBlocked ? 'This symbol charts on TradingView (free embed restricted) — opens in your TV session' : 'Open this symbol on TradingView'}>Open in TradingView ↗</a>}
          <button className="sw-tf" onClick={exportCsv} disabled={!obs || !series.length}>⤓ CSV</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: '14px 18px' }}>
          <div style={{ flex: tvCfg ? 1.35 : 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {!obs && !err && <div className="mc-news-empty" style={{ padding: 40 }}>Loading history…</div>}
            {err && <div className="mc-news-empty" style={{ padding: 40 }}>{err}</div>}
            {obs && values.length > 0 && AreaChart && <AreaChart data={values} labels={dates} unit={unit} height={tvCfg ? 480 : 500} color="#5B8DEF" />}
            {obs && values.length === 0 && !err && <div className="mc-news-empty" style={{ padding: 40 }}>No data for this range.</div>}
          </div>
          {tvCfg && window.TVWidget && (
            <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-tertiary,#8E9AB0)', marginBottom: 6 }}>⚡ TradingView · live</div>
              <div style={{ flex: 1, minHeight: 0 }}><window.TVWidget kind="advanced-chart" config={tvCfg} height="100%" /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// TradingView symbols restricted in the free embed widget ("only available on
// TradingView") — non-US sovereign yields + a few data symbols. We skip the
// embed for these and rely on our own data chart + the Open-in-TradingView link.
SeriesDetailModal.EMBED_BLOCK = new Set(['TVC:JP10Y', 'TVC:DE10Y', 'TVC:GB10Y', 'TVC:ID10Y', 'TVC:CN10Y', 'TVC:IN10Y', 'TVC:BR10Y', 'TVC:FR10Y', 'TVC:IT10Y']);
window.SeriesDetailModal = SeriesDetailModal;

// ================================================================
// MacroSubMap — per-variable influence sub-map (drivers / driven / related)
// ================================================================
const MacroSubMap = ({ centerRic, centerName, neighbors, labels, onPick }) => {
  const W = 620, H = 300, cx = W / 2, cy = H / 2, R = 116;
  const relColor = { driver: '#19C37D', driven: '#FF5C70', related: '#97AAC5' };
  const nodes = neighbors.map((n, i) => {
    const ang = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
    return Object.assign({}, n, { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * (R * 0.74), name: labels[n.ric] || n.ric });
  });
  return (
    <div className="mc-card">
      <div className="mc-card-h">Variable map — drivers · driven · related</div>
      <div style={{ padding: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {nodes.map((n, i) => (
            <line key={'l' + i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={relColor[n.rel]} strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray={n.rel === 'related' ? '3 3' : ''} />
          ))}
          {nodes.map((n, i) => (
            <g key={'n' + i} style={{ cursor: 'pointer' }} onClick={() => onPick(n.ric)}>
              <text x={n.x} y={n.y - 9} fontSize="9" fill="#D4DCEA" textAnchor="middle">{String(n.name).slice(0, 20)}</text>
              <circle cx={n.x} cy={n.y} r="5" fill={relColor[n.rel]} />
              {n.lag && <text x={n.x} y={n.y + 15} fontSize="7.5" fill="#8E9AB0" textAnchor="middle" fontFamily="var(--font-mono)">{n.lag.join('–')}m</text>}
            </g>
          ))}
          <circle cx={cx} cy={cy} r="9" fill="#E8E4D9" stroke="#fff" strokeWidth="1" />
          <text x={cx} y={cy - 15} fontSize="10.5" fill="#fff" textAnchor="middle" fontWeight="600">{String(centerName || centerRic || '').slice(0, 28)}</text>
        </svg>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 10, color: '#8E9AB0', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          <span><span style={{ color: relColor.driver }}>●</span> driver</span>
          <span><span style={{ color: relColor.driven }}>●</span> drives</span>
          <span><span style={{ color: relColor.related }}>●</span> related</span>
          <span style={{ color: 'var(--text-tertiary)' }}>· click a node to open it</span>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// TOOL 1 — Data Gatherer (old structure, new design)
// ================================================================
const DataGatherer = () => {
  const { AreaChart } = window.ChartLib || {};
  const fmt = window.fmt || { num: (v, d = 2) => Number(v).toFixed(d) };

  const [country, setCountry] = React.useState('us');
  const [tree, setTree]       = React.useState([]);
  const [expanded, setExpanded] = React.useState({});   // slug -> series[]
  const [search, setSearch]   = React.useState('');
  const [results, setResults] = React.useState(null);   // search results (flat) or null
  const [activeRic, setActiveRic] = React.useState(null);
  const [detail, setDetail]   = React.useState(null);
  const [obs, setObs]         = React.useState([]);
  const [err, setErr]         = React.useState('');
  const [graph, setGraph]     = React.useState([]);      // condensed influence edges for the country
  const [subLabels, setSubLabels] = React.useState({});  // ric -> name for sub-map neighbors

  // category tree per country
  React.useEffect(() => {
    setErr(''); setExpanded({}); setResults(null);
    sbGet(`/category_tree?country=eq.${country}&select=category,category_slug,n&order=category.asc`, 'macro')
      .then(setTree).catch((c) => setErr('Catalog failed (' + c + ')'));
  }, [country]);

  // search (flat results override the tree)
  React.useEffect(() => {
    if (!search.trim()) { setResults(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      sbGet(`/series_lite?country=eq.${country}&is_poll=eq.false&description=ilike.*${encodeURIComponent(search.trim())}*&select=ric,description,subcategory,category_slug&order=description.asc&limit=200`, 'macro')
        .then((r) => { if (!cancelled) setResults(r); }).catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, country]);

  const toggleCat = (slug) => {
    if (expanded[slug]) { const e = { ...expanded }; delete e[slug]; setExpanded(e); return; }
    setExpanded({ ...expanded, [slug]: 'loading' });
    sbGet(`/series_lite?country=eq.${country}&category_slug=eq.${slug}&is_poll=eq.false&select=ric,description,subcategory&order=description.asc&limit=1000`, 'macro')
      .then((rows) => setExpanded((e) => ({ ...e, [slug]: rows }))).catch(() => setExpanded((e) => ({ ...e, [slug]: [] })));
  };

  // selected series → detail + observations
  React.useEffect(() => {
    if (!activeRic) return;
    let cancelled = false;
    Promise.all([
      sbGet(`/series?ric=eq.${activeRic}&select=ric,description,category,subcategory,frequency,units,source,meaning,how_to_use,related_series,notes,country&limit=1`, 'macro'),
      sbGet(`/observations?ric=eq.${activeRic}&select=date,value&order=date.desc&limit=240`, 'macro'),
    ]).then(([d, o]) => { if (cancelled) return; setDetail(d && d[0] ? d[0] : null); setObs((o || []).slice().reverse()); })
      .catch((c) => { if (!cancelled) setErr('Series failed (' + c + ')'); });
    return () => { cancelled = true; };
  }, [activeRic]);

  // Influence sub-map: condensed graph edges for the country (cached on country change)
  React.useEffect(() => {
    sbGet(`/graph?country=eq.${country}&graph_kind=eq.condensed&select=payload&limit=1`, 'macro')
      .then((r) => setGraph(r && r[0] && r[0].payload && r[0].payload.edges ? r[0].payload.edges : []))
      .catch(() => setGraph([]));
  }, [country]);

  // Neighbors of the selected variable: drivers (→it), driven (it→), curated related.
  const neighbors = React.useMemo(() => {
    if (!activeRic) return [];
    const out = []; const seen = new Set();
    graph.forEach((e) => {
      if (e.target === activeRic && !seen.has(e.source)) { seen.add(e.source); out.push({ ric: e.source, rel: 'driver', lag: e.lag_months }); }
      if (e.source === activeRic && !seen.has(e.target)) { seen.add(e.target); out.push({ ric: e.target, rel: 'driven', lag: e.lag_months }); }
    });
    const rel = detail && detail.related_series;
    (Array.isArray(rel) ? rel : []).forEach((r) => { if (r && !seen.has(r)) { seen.add(r); out.push({ ric: r, rel: 'related' }); } });
    return out.slice(0, 12);
  }, [activeRic, graph, detail]);

  React.useEffect(() => {
    const rics = neighbors.map((n) => n.ric);
    if (!rics.length) { setSubLabels({}); return; }
    sbGet('/series_lite?select=ric,description&ric=in.(' + rics.map((r) => encodeURIComponent('"' + r + '"')).join(',') + ')', 'macro')
      .then((rows) => { const m = {}; (rows || []).forEach((r) => { m[r.ric] = r.description; }); setSubLabels(m); }).catch(() => {});
  }, [neighbors]);

  const paired = obs.filter((o) => o.value != null);
  const values = paired.map((o) => o.value);
  const dates  = paired.map((o) => o.date);
  const latest = values.length ? values[values.length - 1] : null;
  const prev   = values.length > 1 ? values[values.length - 2] : null;
  const chg    = latest != null && prev != null ? latest - prev : null;
  const unit   = (detail && detail.units) || '';
  const exportCsv = () => downloadCsv(`${activeRic}.csv`, [['date', 'value'], ...obs.map((o) => [o.date, o.value])]);

  const SeriesRow = ({ s }) => (
    <div className={`mc-list-item ${activeRic === s.ric ? 'active' : ''}`} onClick={() => setActiveRic(s.ric)}>
      <div className="mc-li-top"><span className="mc-li-label">{s.description}</span></div>
      {s.subcategory && <div className="mc-li-bot"><span className="mc-li-val" style={{ color: 'var(--text-tertiary)' }}>{s.subcategory}</span></div>}
    </div>
  );

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h">
        <span>Data Gatherer</span>
        <span className="mc-section-h-sub">Refinitiv macro · {country.toUpperCase()} · browse by category or search · live</span>
      </div>
      <div className="mc-data-shell mc-data-shell--page">
        <aside className="mc-data-rail">
          <div className="mc-chips">
            <div className="mc-chip-label">Country</div>
            <div className="mc-chip-row">
              {MACRO_COUNTRIES.map((c) => (
                <button key={c.id} className={`mc-chip ${country === c.id ? 'active' : ''}`} onClick={() => { setCountry(c.id); setSearch(''); }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="mc-filter"><input placeholder="Search indicators…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="mc-list mc-list--page">
            {err && <div className="mc-news-empty">{err}</div>}
            {results ? (
              results.length ? results.map((s) => <SeriesRow key={s.ric} s={s} />) : <div className="mc-news-empty">No matches.</div>
            ) : (
              tree.map((cat) => (
                <div key={cat.category_slug} className="mc-cat-group">
                  <div className="mc-cat-head" onClick={() => toggleCat(cat.category_slug)}>
                    <span className="mc-cat-chev">{expanded[cat.category_slug] ? '▾' : '▸'}</span>
                    <span className="mc-cat-name">{cat.category}</span>
                    <span className="mc-cat-count">{cat.n}</span>
                  </div>
                  {expanded[cat.category_slug] && (
                    <div className="mc-cat-series">
                      {expanded[cat.category_slug] === 'loading' ? <div className="mc-news-empty">Loading…</div>
                        : expanded[cat.category_slug].map((s) => <SeriesRow key={s.ric} s={s} />)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="mc-data-main">
          {!activeRic && <div className="mc-news-empty" style={{ padding: 40 }}>Select an indicator from the category tree or search.</div>}
          {activeRic && (
            <>
              <div className="mc-detail-head">
                <div>
                  <div className="mc-detail-tags">
                    <span className="mc-tag">{country.toUpperCase()}</span>
                    {detail && detail.category && <span className="mc-tag">{detail.category}</span>}
                    <span className="mc-tag src">{(detail && detail.source) || 'Refinitiv'}</span>
                    <span className="mc-tag" style={{ fontFamily: 'var(--font-mono)' }}>{activeRic}</span>
                  </div>
                  <div className="mc-detail-title">{(detail && detail.description) || activeRic}</div>
                  <div className="mc-detail-sub">{obs.length ? `${obs.length} obs · latest ${obs[obs.length - 1].date}` : 'Loading…'}{detail && detail.frequency ? ` · ${detail.frequency}` : ''}</div>
                </div>
                <div className="mc-detail-quote">
                  <div className="qv">{latest != null ? fmt.num(latest, Math.abs(latest) < 10 ? 2 : 0) : '—'}<span>{unit}</span></div>
                  {chg != null && <div className={`qc ${chg >= 0 ? 'pos' : 'neg'}`}>{chg >= 0 ? '+' : ''}{fmt.num(chg, 2)} vs prior</div>}
                </div>
              </div>

              <div className="mc-chart-card">
                <div className="mc-chart-h">
                  <span>{(detail && detail.description) || activeRic} · {values.length} points</span>
                  <button className="sw-tf" onClick={exportCsv} disabled={!obs.length}>⤓ CSV</button>
                </div>
                {AreaChart && values.length ? <AreaChart data={values} labels={dates} unit={unit} height={250} color="#5B8DEF" /> : <div className="mc-news-empty" style={{ padding: 40 }}>No data</div>}
              </div>

              {/* Skill panel — old terminal structure */}
              <div className="mc-card">
                <div className="mc-card-h">Meaning</div>
                <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{(detail && detail.meaning) || 'Not yet documented.'}</div>
              </div>
              {detail && detail.how_to_use && (
                <div className="mc-card"><div className="mc-card-h">How to use</div>
                  <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{detail.how_to_use}</div></div>
              )}
              {detail && detail.related_series && (
                <div className="mc-card"><div className="mc-card-h">Related series</div>
                  <div style={{ padding: 14, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand, #97AAC5)' }}>{Array.isArray(detail.related_series) ? detail.related_series.join(' · ') : String(detail.related_series)}</div></div>
              )}
              {neighbors.length > 0 && <MacroSubMap centerRic={activeRic} centerName={detail && detail.description} neighbors={neighbors} labels={subLabels} onPick={(r) => setActiveRic(r)} />}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// ================================================================
// TOOL 2 — Correlation Terminal (full app, restyled to v5, embedded)
// All features preserved: Pearson/Spearman · Weekly/Monthly · MP denoise ·
// Δ-vs · custom-subset Universe builder (scrollable sidebar) · time slider ·
// PCA/Stats/History rail · scatter + rolling pair detail · CSV/PNG downloads ·
// spotlight + help. The /correlation app is restyled in css/terminal.css.
// ================================================================
const CorrelationTool = () => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-0,#020203)' }}>
    <iframe src="/correlation/ui/static/" title="Correlation Terminal"
            style={{ flex: 1, width: '100%', border: 0, display: 'block' }} />
  </div>
);

// ================================================================
// TOOL 3 — Macro Variables Map (from macro.graph, redesigned)
// ================================================================
const MacroMapTool = () => {
  const [country, setCountry] = React.useState('us');
  const [edges, setEdges] = React.useState(null);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    setEdges(null); setErr('');
    sbGet(`/graph?country=eq.${country}&graph_kind=eq.condensed&select=payload&limit=1`, 'macro')
      .then((r) => setEdges(r && r[0] && r[0].payload && r[0].payload.edges ? r[0].payload.edges : []))
      .catch((c) => setErr('Graph failed (' + c + ')'));
  }, [country]);

  // group edges by source (causal links view)
  const bySource = {};
  (edges || []).forEach((e) => { (bySource[e.source] = bySource[e.source] || []).push(e); });

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h"><span>Macro Variables Map</span><span className="mc-section-h-sub">Causal influence graph · {country.toUpperCase()} · {edges ? edges.length : '—'} links · hand-authored + inferred</span></div>
      <div style={{ padding: '14px 22px' }}>
        <div className="mc-chip-row" style={{ marginBottom: 16 }}>
          {MACRO_COUNTRIES.map((c) => <button key={c.id} className={`mc-chip ${country === c.id ? 'active' : ''}`} onClick={() => setCountry(c.id)}>{c.label}</button>)}
        </div>
        {err && <div className="mc-news-empty">{err}</div>}
        {!edges && !err && <div className="mc-news-empty">Loading graph…</div>}
        {edges && !edges.length && <div className="mc-news-empty">No curated influence map for {country.toUpperCase()} yet — the hand-authored map currently covers US.</div>}
        {edges && edges.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
            {Object.keys(bySource).slice(0, 200).map((src) => (
              <div key={src} className="mc-card">
                <div className="mc-card-h" style={{ fontFamily: 'var(--font-mono)' }}>{src} <span style={{ color: 'var(--text-tertiary)' }}>drives →</span></div>
                <div style={{ padding: 12 }}>
                  {bySource[src].map((e, i) => (
                    <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,.05))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand, #97AAC5)' }}>{e.target}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{e.lag_months ? `lag ${e.lag_months.join('–')}m` : ''} · {e.confidence}</span>
                      </div>
                      {e.note && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>{e.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ================================================================
// MacroTerminal — container + RIGHT toolbar
// ================================================================
// ================================================================
// TOOL 0 — Live Macro Dashboard (real data, NOT Refinitiv).
// Reads macro.live_indicators, refreshed daily by the macro-refresh
// edge function (FRED + DBnomics). Grouped by region; each indicator
// shows latest value, change vs prior, a sparkline + "as of" stamp.
// ================================================================
const LD_REGIONS = [
  { id: 'United States',  label: 'United States' },
  { id: 'Global',         label: 'Global · DM' },
  { id: 'Indonesia',      label: 'Indonesia' },
  { id: 'China',          label: 'China' },
  { id: 'Commodities',    label: 'Commodities' },
  { id: 'FX',             label: 'FX' },
  { id: 'Equity Indices', label: 'Equity Indices' },
  { id: 'Rates',          label: 'Rates' },
  { id: 'Crypto',         label: 'Crypto' },
];
const LD_REGION_LABEL = LD_REGIONS.reduce((m, r) => { m[r.id] = r.label; return m; }, {});
// category now holds the human-readable subcategory ("Monetary & Rates", "Energy"…);
// LD_CAT_LABEL is just a passthrough fallback.
const LD_CAT_LABEL = {};

// Dropdown-grouped views. A view selects rows by: keys[] (curated), keys===null
// (everything), region (whole region), or region+cat (one commodity category).
// 'custom' is special (per-account selection built with the + picker).
const LD_TEMPLATES = [
  // — Featured —
  { id: 'us_overview', group: 'Featured', label: 'US Overview', keys: ['us_10y', 'us_2s10s', 'us_fed_funds', 'us_cpi', 'us_core_cpi', 'us_unrate', 'spx', 'vix', 'dxy', 'wti', 'gold', 'btc'] },
  { id: 'indo',        group: 'Featured', label: 'Indonesia Macro', keys: ['id_bi_rate', 'id_cpi_yoy', 'id_gdp_real_q', 'id_exports', 'id_imports', 'id_fx_reserves', 'id_m2', 'usdidr', 'jci'] },
  { id: 'indo_cmdty',  group: 'Featured', label: 'Indonesia Commodity Complex', keys: ['wb_coal_au', 'wb_palm_oil', 'wb_nickel', 'wb_tin', 'wb_rubber', 'wb_coffee_robusta', 'wb_rice', 'wb_shrimp', 'wb_urea', 'gold', 'usdidr', 'jci'] },
  { id: 'all',         group: 'Featured', label: 'Everything', keys: null },
  // — Regions —
  { id: 'region_us',     group: 'Regions', label: 'United States', region: 'United States' },
  { id: 'region_global', group: 'Regions', label: 'Global · DM',    region: 'Global' },
  { id: 'region_china',  group: 'Regions', label: 'China',          region: 'China' },
  // — Rates & Inflation —
  { id: 'rates',     group: 'Rates & Inflation', label: 'Rates',     keys: ['us_3m', 'us_2y', 'us_5y', 'us_10y', 'us_30y', 'us_2s10s', 'us_be_10y', 'ea_10y', 'jp_10y', 'uk_10y'] },
  { id: 'inflation', group: 'Rates & Inflation', label: 'Inflation', keys: ['us_cpi', 'us_core_cpi', 'us_pce', 'us_core_pce', 'ea_hicp', 'uk_cpi', 'jp_cpi', 'id_cpi_yoy', 'cn_cpi_yoy'] },
  // — Cross-Asset —
  { id: 'fx',      group: 'Cross-Asset', label: 'FX',             region: 'FX' },
  { id: 'indices', group: 'Cross-Asset', label: 'Equity Indices', region: 'Equity Indices' },
  { id: 'crypto',  group: 'Cross-Asset', label: 'Crypto',         region: 'Crypto' },
  // — Commodities —
  { id: 'cmd_all',        group: 'Commodities', label: 'All Commodities',     region: 'Commodities' },
  { id: 'cmd_energy',     group: 'Commodities', label: 'Energy',              region: 'Commodities', cat: 'Energy' },
  { id: 'cmd_precious',   group: 'Commodities', label: 'Precious Metals',     region: 'Commodities', cat: 'Precious Metals' },
  { id: 'cmd_industrial', group: 'Commodities', label: 'Industrial Metals',   region: 'Commodities', cat: 'Industrial Metals' },
  { id: 'cmd_palm',       group: 'Commodities', label: 'Palm Oil & Veg Oils', region: 'Commodities', cat: 'Palm Oil & Veg Oils' },
  { id: 'cmd_grains',     group: 'Commodities', label: 'Grains & Food',       region: 'Commodities', cat: 'Grains & Food' },
  { id: 'cmd_softs',      group: 'Commodities', label: 'Softs & Beverages',   region: 'Commodities', cat: 'Softs & Beverages' },
  { id: 'cmd_agriraw',    group: 'Commodities', label: 'Agri Raw Materials',  region: 'Commodities', cat: 'Agri Raw Materials' },
  { id: 'cmd_fert',       group: 'Commodities', label: 'Fertilizers · Pupuk', region: 'Commodities', cat: 'Fertilizers' },
  { id: 'cmd_meat',       group: 'Commodities', label: 'Meat & Seafood',      region: 'Commodities', cat: 'Meat & Seafood' },
  { id: 'cmd_battery',    group: 'Commodities', label: 'Battery & Critical',  region: 'Commodities', cat: 'Battery & Critical' },
  { id: 'cmd_indices',    group: 'Commodities', label: 'Commodity Indices',   region: 'Commodities', cat: 'Commodity Indices' },
];
const LD_GROUP_ORDER = ['Featured', 'Regions', 'Rates & Inflation', 'Cross-Asset', 'Commodities'];

const ldNum = (v, d) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const ldFmtVal = (v, unit) => {
  if (v === null || v === undefined) return '—';
  const d = Math.abs(v) >= 1000 ? 0 : 2;
  const n = ldNum(v, d);
  if (unit === '%') return n + '%';
  if (unit === '$bn') return '$' + n + 'B';
  if (unit === '$mn') return '$' + n + 'M';
  if (unit === 'Rp') return 'Rp' + n;
  if (unit === 'k') return n + 'k';
  // commodity benchmarks: $, $/mt, $/kg, $/bbl, $/mmbtu, $/m3, $/lb → $-prefixed; ¢/lb, ¢/kg → ¢-suffixed
  if (unit && unit.charAt(0) === '$') return '$' + n;
  if (unit && unit.charAt(0) === '¢') return n + '¢';
  return n;
};
const ldFmtChange = (v) => {
  if (v === null || v === undefined) return '';
  const d = Math.abs(v) >= 1000 ? 0 : 2;
  return (v > 0 ? '+' : '') + ldNum(v, d);
};
const ldAgo = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

const LdSpark = ({ data, color }) => {
  if (!data || data.length < 2) return <div style={{ height: 34 }} />;
  const vs = data.map((p) => p.v);
  const min = Math.min(...vs), max = Math.max(...vs), rng = (max - min) || 1;
  const W = 132, H = 34;
  const pts = data.map((p, i) => [(i / (data.length - 1)) * W, H - ((p.v - min) / rng) * (H - 6) - 3]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 34, display: 'block' }}>
      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const LdCard = ({ r, onRemove, onOpen }) => {
  const ch = r.change_abs;
  const dir = ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat';
  const col = dir === 'up' ? 'var(--pos,#19C37D)' : dir === 'down' ? 'var(--neg,#FF5C70)' : 'var(--brand,#97AAC5)';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  return (
    <div className={`mld-card ${onOpen ? 'mld-card-click' : ''}`} onClick={() => onOpen && onOpen(r)} title={onOpen ? 'Open full history' : ''}>
      {onRemove && <button className="mld-card-x" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(r.key); }}>×</button>}
      <div className="mld-card-top">
        <span className="mld-card-label">{r.label}</span>
        <span className="mld-card-tag">{LD_CAT_LABEL[r.category] || r.category}</span>
      </div>
      <div className="mld-card-val">{ldFmtVal(r.latest_value, r.unit)}{r.transform === 'yoy' && <span className="mld-yoy">YoY</span>}</div>
      <div className="mld-card-change" style={{ color: col }}>
        {ch !== null && ch !== undefined ? <span>{arrow} {ldFmtChange(ch)}{r.unit === '%' ? ' pp' : ''}</span> : <span style={{ color: 'var(--brand,#97AAC5)' }}>—</span>}
        <span className="mld-card-prevlbl"> vs prior</span>
      </div>
      <LdSpark data={r.spark} color={col} />
      <div className="mld-card-foot">
        <span>as of {r.latest_date || '—'}</span>
        <span className="mld-src">{r.source}</span>
      </div>
    </div>
  );
};

// Catalog picker — browse every available (live) indicator by country +
// category and check the ones you want on your dashboard.
const LdPicker = ({ rows, selected, onClose, onSave }) => {
  const [draft, setDraft] = React.useState(() => new Set(selected));
  const [q, setQ] = React.useState('');
  const toggle = (k) => setDraft((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const ql = q.trim().toLowerCase();
  const visible = rows.filter((r) => !ql || (r.label || '').toLowerCase().includes(ql) || r.key.includes(ql) || (r.category || '').includes(ql));
  return (
    <div className="mld-modal-bg" onClick={onClose}>
      <div className="mld-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mld-modal-h">
          <span>Add data · {rows.length} live indicators available</span>
          <button className="mld-modal-x" onClick={onClose}>×</button>
        </div>
        <input className="mld-search" placeholder="Search indicators (e.g. gold, cpi, yield)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mld-modal-body">
          {LD_REGIONS.map((rg) => {
            const items = visible.filter((r) => r.region === rg.id);
            if (!items.length) return null;
            const cats = [...new Set(items.map((r) => r.category))];
            return (
              <div key={rg.id} className="mld-pick-region">
                <div className="mld-pick-region-h">{rg.label}</div>
                {cats.map((cat) => (
                  <div key={cat} className="mld-pick-cat">
                    <div className="mld-pick-cat-h">{LD_CAT_LABEL[cat] || cat}</div>
                    <div className="mld-pick-list">
                      {items.filter((r) => r.category === cat).map((r) => (
                        <label key={r.key} className={`mld-pick-item ${draft.has(r.key) ? 'on' : ''}`}>
                          <input type="checkbox" checked={draft.has(r.key)} onChange={() => toggle(r.key)} />
                          <span className="mld-pick-name">{r.label}</span>
                          <span className="mld-pick-val">{ldFmtVal(r.latest_value, r.unit)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mld-modal-foot">
          <span className="mld-pick-count">{draft.size} selected</span>
          <button className="sw-tf" onClick={onClose}>Cancel</button>
          <button className="mld-save-btn" onClick={() => onSave([...draft])}>Save dashboard</button>
        </div>
      </div>
    </div>
  );
};

const MacroLiveDashboard = () => {
  const [rows, setRows]             = React.useState(null);
  const [err, setErr]               = React.useState('');
  const [tick, setTick]             = React.useState(0);
  const [active, setActive]         = React.useState('us_overview');   // template id | 'custom'
  const [customKeys, setCustomKeys] = React.useState([]);
  const [picker, setPicker]         = React.useState(false);
  const [detail, setDetail]         = React.useState(null);   // clicked card -> full-history modal
  const loggedIn = !!lbcToken();

  // catalog (anon)
  React.useEffect(() => {
    let cancelled = false;
    setErr('');
    sbGet('/live_indicators?select=*&order=region,sort_order', 'macro')
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((c) => { if (!cancelled) setErr('Failed to load live data (' + c + ')'); });
    return () => { cancelled = true; };
  }, [tick]);

  // per-account prefs (authed, once)
  React.useEffect(() => {
    let cancelled = false;
    if (!loggedIn) return;
    sbAuthGet('/user_dashboard?select=active_template,custom_keys&user_sub=eq.' + lbcSub(), 'macro')
      .then((r) => { if (!cancelled && r && r[0]) { setActive(r[0].active_template || 'us_overview'); setCustomKeys(r[0].custom_keys || []); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const persist = (nextActive, nextCustom) => {
    if (!loggedIn) return;
    sbAuthSave('/user_dashboard', [{ user_sub: lbcSub(), active_template: nextActive, custom_keys: nextCustom, updated_at: new Date().toISOString() }], 'macro').catch(() => {});
  };
  const chooseTemplate = (id) => { setActive(id); persist(id, customKeys); };
  const saveCustom = (keys) => { setCustomKeys(keys); setActive('custom'); setPicker(false); persist('custom', keys); };
  const removeFromCustom = (key) => { const next = customKeys.filter((k) => k !== key); setCustomKeys(next); persist('custom', next); };

  const byKey = rows ? rows.reduce((m, r) => { m[r.key] = r; return m; }, {}) : {};
  const tmpl = LD_TEMPLATES.find((t) => t.id === active);
  let shownRows = [];
  if (rows) {
    if (active === 'custom') shownRows = customKeys.map((k) => byKey[k]).filter(Boolean);
    else if (!tmpl) shownRows = rows;                                              // unknown/legacy id → Everything
    else if (tmpl.keys === null) shownRows = rows;                                 // Everything
    else if (tmpl.keys) shownRows = tmpl.keys.map((k) => byKey[k]).filter(Boolean); // curated key list
    else if (tmpl.cat) shownRows = rows.filter((r) => r.region === tmpl.region && r.category === tmpl.cat); // one commodity category
    else if (tmpl.region) shownRows = rows.filter((r) => r.region === tmpl.region); // whole region
  }
  const lastUpdated = rows && rows.length ? rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '') : '';

  return (
    <section className="mc-section mld-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', flex: '0 0 auto' }}>
        <TVWidget kind="ticker-tape" config={TV_TICKER_CFG} height={46} />
      </div>
      <div className="mc-section-h">
        <span>Live Macro · your dashboard</span>
        <span className="mc-section-h-sub">{lastUpdated ? 'updated ' + ldAgo(lastUpdated) + ' · FRED + DBnomics · auto-refreshed daily' : 'FRED + DBnomics'}</span>
      </div>
      <div className="mld-tabs">
        <span className="mld-cat-lbl">Category</span>
        <div className="mld-cat-wrap">
          <select
            className="mld-cat-select"
            value={active}
            onChange={(e) => { const v = e.target.value; if (v === 'custom') { setActive('custom'); persist('custom', customKeys); } else chooseTemplate(v); }}
          >
            {LD_GROUP_ORDER.map((g) => (
              <optgroup key={g} label={g}>
                {LD_TEMPLATES.filter((t) => t.group === g).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            ))}
            <optgroup label="Personal">
              <option value="custom">My Custom View{customKeys.length ? ' · ' + customKeys.length : ''}</option>
            </optgroup>
          </select>
          <span className="mld-cat-caret">▾</span>
        </div>
        <span className="mld-cat-count">{shownRows.length} indicator{shownRows.length === 1 ? '' : 's'}</span>
        <button className="mld-add-btn" title="Build a custom view" onClick={() => setPicker(true)}>+ Add data</button>
        <button className="sw-tf" style={{ marginLeft: 'auto' }} title="Refresh" onClick={() => setTick((t) => t + 1)}>↻</button>
      </div>
      <div className="mld-scroll">
        {err && <div className="mc-news-empty" style={{ padding: 30 }}>{err}</div>}
        {!rows && !err && <div className="mc-news-empty" style={{ padding: 30 }}>Loading live macro data…</div>}
        {rows && active === 'custom' && customKeys.length === 0 && (
          <div className="mc-news-empty" style={{ padding: 40, textAlign: 'center' }}>
            Your custom dashboard is empty.<br />
            <button className="mld-save-btn" style={{ marginTop: 14 }} onClick={() => setPicker(true)}>+ Add data</button>
          </div>
        )}
        {rows && LD_REGIONS.map((rg) => {
          const items = shownRows.filter((r) => r.region === rg.id);
          if (!items.length) return null;
          // group the region's items by subcategory (the `category` field)
          const subs = [];
          items.forEach((it) => { let s = subs.find((x) => x.cat === it.category); if (!s) { s = { cat: it.category, items: [] }; subs.push(s); } s.items.push(it); });
          const mkOpen = (row) => setDetail({ source: row.source, id: row.series_id, title: row.label, sub: row.source + ' · ' + (LD_REGION_LABEL[row.region] || row.region) + ' · ' + (LD_CAT_LABEL[row.category] || row.category), unit: row.unit, tvSymbol: row.tv_symbol || (row.source === 'YAHOO' ? '' : '') });
          return (
            <div key={rg.id} className="mld-region">
              <div className="mld-region-h"><span className="mld-region-bar" />{rg.label}<span className="mld-region-n">{items.length}</span></div>
              {subs.map((s) => (
                <div key={s.cat} className="mld-sub">
                  <div className="mld-sub-h">{s.cat}</div>
                  <div className="mld-grid">{s.items.map((r) => <LdCard key={r.key} r={r} onRemove={active === 'custom' ? removeFromCustom : null} onOpen={mkOpen} />)}</div>
                </div>
              ))}
            </div>
          );
        })}
        {rows && !loggedIn && <div className="mld-note">Sign in to save your dashboard across sessions.</div>}
      </div>
      {picker && rows && <LdPicker rows={rows} selected={shownRows.map((r) => r.key)} onClose={() => setPicker(false)} onSave={saveCustom} />}
      {detail && <SeriesDetailModal title={detail.title} sub={detail.sub} source={detail.source} id={detail.id} unit={detail.unit} tvSymbol={detail.tvSymbol} onClose={() => setDetail(null)} />}
    </section>
  );
};

const MacroDashboardTool = () => <MacroLiveDashboard />;
const wrapWs = (node) => <div className="mc-workspace" style={{ height: '100%', overflow: 'auto' }}>{node}</div>;

// ================================================================
// TradingView live widgets — client-side embeds from s3.tradingview.com
// (same family the Equity stock charts already load via tv.js). These give
// live intraday market prices the FRED/DBnomics curated cards can't —
// futures, indices, FX crosses, crypto. Display-only; nothing is stored.
// ================================================================
const TVWidget = ({ kind, config, height, minHeight }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    host.appendChild(widget);
    const s = document.createElement('script');
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`;
    s.async = true;
    s.type = 'text/javascript';
    s.innerHTML = JSON.stringify(config);
    host.appendChild(s);
    return () => { host.innerHTML = ''; };
  }, [kind, JSON.stringify(config)]);
  return <div className="tradingview-widget-container" ref={ref} style={{ height: height || '100%', minHeight, width: '100%' }} />;
};
window.TVWidget = TVWidget;

const TV_TICKER_CFG = {
  symbols: [
    { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
    { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
    { proName: 'IDX:COMPOSITE', title: 'IDX' },
    { proName: 'TVC:GOLD', title: 'Gold' },
    { proName: 'TVC:SILVER', title: 'Silver' },
    { proName: 'TVC:USOIL', title: 'WTI Crude' },
    { proName: 'TVC:UKOIL', title: 'Brent' },
    { proName: 'CAPITALCOM:NATURALGAS', title: 'Nat Gas' },
    { proName: 'CAPITALCOM:COPPER', title: 'Copper' },
    { proName: 'FX_IDC:USDIDR', title: 'USD/IDR' },
    { proName: 'FX:USDCNH', title: 'USD/CNH' },
    { proName: 'TVC:DXY', title: 'Dollar Index' },
    { proName: 'TVC:US10Y', title: 'US 10Y' },
    { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
    { proName: 'BINANCE:ETHUSDT', title: 'ETH' },
  ],
  colorTheme: 'dark', isTransparent: true, showSymbolLogo: true, displayMode: 'adaptive', locale: 'en',
};

const TV_OVERVIEW_CFG = {
  colorTheme: 'dark', dateRange: '12M', showChart: true, locale: 'en',
  width: '100%', height: '100%', isTransparent: true, showSymbolLogo: true, showFloatingTooltip: true,
  plotLineColorGrowing: '#19C37D', plotLineColorFalling: '#FF5C70',
  belowLineFillColorGrowing: 'rgba(25,195,125,0.10)', belowLineFillColorFalling: 'rgba(255,92,112,0.10)',
  gridLineColor: 'rgba(151,170,197,0.08)', scaleFontColor: '#8E9AB0',
  tabs: [
    { title: 'Indices', symbols: [
      { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }, { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' }, { s: 'FOREXCOM:DJI', d: 'Dow 30' },
      { s: 'TVC:RUT', d: 'Russell 2000' }, { s: 'XETR:DAX', d: 'DAX' }, { s: 'TVC:UKX', d: 'FTSE 100' },
      { s: 'INDEX:NKY', d: 'Nikkei 225' }, { s: 'TVC:HSI', d: 'Hang Seng' }, { s: 'TVC:SSEC', d: 'Shanghai' },
      { s: 'KRX:KOSPI', d: 'KOSPI' }, { s: 'IDX:COMPOSITE', d: 'IDX Composite' },
    ] },
    { title: 'Commodities', symbols: [
      { s: 'TVC:GOLD', d: 'Gold' }, { s: 'TVC:SILVER', d: 'Silver' }, { s: 'TVC:PLATINUM', d: 'Platinum' }, { s: 'TVC:PALLADIUM', d: 'Palladium' },
      { s: 'CAPITALCOM:COPPER', d: 'Copper' }, { s: 'CAPITALCOM:CORN', d: 'Corn' }, { s: 'CAPITALCOM:WHEAT', d: 'Wheat' }, { s: 'CAPITALCOM:SOYBEANS', d: 'Soybeans' },
      { s: 'CAPITALCOM:COFFEE', d: 'Coffee' }, { s: 'CAPITALCOM:SUGAR', d: 'Sugar' }, { s: 'CAPITALCOM:COTTON', d: 'Cotton' }, { s: 'CAPITALCOM:COCOA', d: 'Cocoa' },
    ] },
    { title: 'Energy', symbols: [
      { s: 'TVC:USOIL', d: 'WTI Crude' }, { s: 'TVC:UKOIL', d: 'Brent' }, { s: 'CAPITALCOM:NATURALGAS', d: 'Nat Gas' },
      { s: 'CAPITALCOM:GASOLINE', d: 'Gasoline' },
    ] },
    { title: 'Forex', symbols: [
      { s: 'TVC:DXY', d: 'Dollar Index' }, { s: 'FX:EURUSD', d: 'EUR/USD' }, { s: 'FX:USDJPY', d: 'USD/JPY' }, { s: 'FX:GBPUSD', d: 'GBP/USD' },
      { s: 'FX:AUDUSD', d: 'AUD/USD' }, { s: 'FX:USDCAD', d: 'USD/CAD' }, { s: 'FX_IDC:USDIDR', d: 'USD/IDR' }, { s: 'FX:USDCNH', d: 'USD/CNH' },
      { s: 'FX:USDSGD', d: 'USD/SGD' }, { s: 'FX_IDC:USDINR', d: 'USD/INR' },
    ] },
    { title: 'Crypto', symbols: [
      { s: 'BINANCE:BTCUSDT', d: 'Bitcoin' }, { s: 'BINANCE:ETHUSDT', d: 'Ethereum' }, { s: 'BINANCE:SOLUSDT', d: 'Solana' }, { s: 'BINANCE:BNBUSDT', d: 'BNB' },
      { s: 'BINANCE:XRPUSDT', d: 'XRP' }, { s: 'BINANCE:ADAUSDT', d: 'Cardano' }, { s: 'BINANCE:DOGEUSDT', d: 'Dogecoin' }, { s: 'BINANCE:AVAXUSDT', d: 'Avalanche' },
    ] },
    { title: 'Rates', symbols: [
      { s: 'TVC:US10Y', d: 'US 10Y' }, { s: 'TVC:US02Y', d: 'US 2Y' }, { s: 'TVC:US30Y', d: 'US 30Y' },
      { s: 'TVC:DE10Y', d: 'Germany 10Y' }, { s: 'TVC:GB10Y', d: 'UK 10Y' }, { s: 'TVC:JP10Y', d: 'Japan 10Y' }, { s: 'TVC:ID10Y', d: 'Indonesia 10Y' },
    ] },
  ],
};

// Deep-dive catalog — same instruments mapped to Yahoo tickers. Clicking a
// chip opens the full-history detail modal (TradingView's iframe rows can't
// be intercepted, so this is our own clickable layer over the same names).
const TV_DEEPDIVE = [
  { cat: 'Indices', items: [
    { label: 'S&P 500', y: '^GSPC', tv: 'FOREXCOM:SPXUSD' }, { label: 'Nasdaq 100', y: '^NDX', tv: 'FOREXCOM:NSXUSD' }, { label: 'Dow 30', y: '^DJI', tv: 'FOREXCOM:DJI' }, { label: 'Russell 2000', y: '^RUT', tv: 'TVC:RUT' },
    { label: 'DAX', y: '^GDAXI', tv: 'XETR:DAX' }, { label: 'FTSE 100', y: '^FTSE', tv: 'TVC:UKX' }, { label: 'Nikkei 225', y: '^N225', tv: 'INDEX:NKY' }, { label: 'Hang Seng', y: '^HSI', tv: 'TVC:HSI' },
    { label: 'Shanghai', y: '000001.SS', tv: 'TVC:SSEC' }, { label: 'KOSPI', y: '^KS11', tv: 'KRX:KOSPI' }, { label: 'IDX Composite', y: '^JKSE', tv: 'IDX:COMPOSITE' },
  ] },
  { cat: 'Commodities', items: [
    { label: 'Gold', y: 'GC=F', tv: 'TVC:GOLD' }, { label: 'Silver', y: 'SI=F', tv: 'TVC:SILVER' }, { label: 'Platinum', y: 'PL=F', tv: 'TVC:PLATINUM' }, { label: 'Palladium', y: 'PA=F', tv: 'TVC:PALLADIUM' },
    { label: 'Copper', y: 'HG=F', tv: 'CAPITALCOM:COPPER' }, { label: 'Corn', y: 'ZC=F', tv: 'CAPITALCOM:CORN' }, { label: 'Wheat', y: 'ZW=F', tv: 'CAPITALCOM:WHEAT' }, { label: 'Soybeans', y: 'ZS=F', tv: 'CAPITALCOM:SOYBEANS' },
    { label: 'Coffee', y: 'KC=F', tv: 'CAPITALCOM:COFFEE' }, { label: 'Sugar', y: 'SB=F', tv: 'CAPITALCOM:SUGAR' }, { label: 'Cotton', y: 'CT=F', tv: 'CAPITALCOM:COTTON' }, { label: 'Cocoa', y: 'CC=F', tv: 'CAPITALCOM:COCOA' },
  ] },
  { cat: 'Energy', items: [
    { label: 'WTI Crude', y: 'CL=F', tv: 'TVC:USOIL' }, { label: 'Brent', y: 'BZ=F', tv: 'TVC:UKOIL' }, { label: 'Nat Gas', y: 'NG=F', tv: 'CAPITALCOM:NATURALGAS' }, { label: 'Gasoline', y: 'RB=F', tv: 'CAPITALCOM:GASOLINE' }, { label: 'Heating Oil', y: 'HO=F', tv: 'NYMEX:HO1!' },
  ] },
  { cat: 'Forex', items: [
    { label: 'Dollar Index', y: 'DX-Y.NYB', tv: 'TVC:DXY' }, { label: 'EUR/USD', y: 'EURUSD=X', tv: 'FX:EURUSD' }, { label: 'USD/JPY', y: 'JPY=X', tv: 'FX:USDJPY' }, { label: 'GBP/USD', y: 'GBPUSD=X', tv: 'FX:GBPUSD' },
    { label: 'AUD/USD', y: 'AUDUSD=X', tv: 'FX:AUDUSD' }, { label: 'USD/CAD', y: 'CAD=X', tv: 'FX:USDCAD' }, { label: 'USD/IDR', y: 'IDR=X', tv: 'FX_IDC:USDIDR' }, { label: 'USD/CNH', y: 'CNH=X', tv: 'FX:USDCNH' },
    { label: 'USD/SGD', y: 'SGD=X', tv: 'FX:USDSGD' }, { label: 'USD/INR', y: 'INR=X', tv: 'FX_IDC:USDINR' },
  ] },
  { cat: 'Crypto', items: [
    { label: 'Bitcoin', y: 'BTC-USD', tv: 'BINANCE:BTCUSDT' }, { label: 'Ethereum', y: 'ETH-USD', tv: 'BINANCE:ETHUSDT' }, { label: 'Solana', y: 'SOL-USD', tv: 'BINANCE:SOLUSDT' }, { label: 'BNB', y: 'BNB-USD', tv: 'BINANCE:BNBUSDT' },
    { label: 'XRP', y: 'XRP-USD', tv: 'BINANCE:XRPUSDT' }, { label: 'Cardano', y: 'ADA-USD', tv: 'BINANCE:ADAUSDT' }, { label: 'Dogecoin', y: 'DOGE-USD', tv: 'BINANCE:DOGEUSDT' }, { label: 'Avalanche', y: 'AVAX-USD', tv: 'BINANCE:AVAXUSDT' },
  ] },
  { cat: 'Rates', items: [
    { label: 'US 10Y', y: '^TNX', tv: 'TVC:US10Y' }, { label: 'US 5Y', y: '^FVX', tv: 'TVC:US05Y' }, { label: 'US 30Y', y: '^TYX', tv: 'TVC:US30Y' }, { label: 'US 13W', y: '^IRX', tv: 'TVC:US03MY' },
  ] },
];

const TVMarketsTool = () => {
  const [detail, setDetail] = React.useState(null);
  return (
    <section className="mc-section mc-data-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mc-section-h">
        <span>Live Markets</span>
        <span className="mc-section-h-sub">TradingView live · click any instrument in the right rail for full history + CSV</span>
      </div>
      <div className="mtv-wrap">
        <div className="mtv-widget"><TVWidget kind="market-overview" config={TV_OVERVIEW_CFG} height="100%" /></div>
        <div className="mtv-deep">
          <div className="mtv-deep-h">Deep dive — full history + CSV (Yahoo)</div>
          {TV_DEEPDIVE.map((g) => (
            <div key={g.cat} className="mtv-grp">
              <div className="mtv-grp-h">{g.cat}</div>
              <div className="mtv-grp-items">
                {g.items.map((it) => (
                  <button key={it.y} className="mtv-item" onClick={() => setDetail({ source: 'YAHOO', id: it.y, title: it.label, sub: 'Yahoo history · ' + it.y, unit: '', tvSymbol: it.tv })}>{it.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {detail && <SeriesDetailModal title={detail.title} sub={detail.sub} source={detail.source} id={detail.id} unit={detail.unit} tvSymbol={detail.tvSymbol} onClose={() => setDetail(null)} />}
    </section>
  );
};

// One subterminal: live macro (FRED/DBnomics cards) + live markets (TradingView)
// behind a Macro/Markets toggle, both kept mounted. Every item opens the same
// enhanced detail modal (full history · 1Y–10Y · D/W/M · CSV · live TV chart).
const MacroMarketsTool = () => {
  const [view, setView] = React.useState('macro');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: '1px solid var(--border-subtle,rgba(255,255,255,.06))' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#EAEFF7' }}>Markets &amp; Macro</span>
        <div className="mtv-range">
          <button className={`mtv-range-btn ${view === 'macro' ? 'active' : ''}`} onClick={() => setView('macro')}>Macro</button>
          <button className={`mtv-range-btn ${view === 'markets' ? 'active' : ''}`} onClick={() => setView('markets')}>Markets</button>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-tertiary,#8E9AB0)', fontFamily: 'var(--font-mono)' }}>click any data → full history · 1Y–10Y · D/W/M · CSV · live</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: view === 'macro' ? 'block' : 'none', overflow: 'hidden' }}><MacroLiveDashboard /></div>
        <div style={{ position: 'absolute', inset: 0, display: view === 'markets' ? 'flex' : 'none', flexDirection: 'column' }}><TVMarketsTool /></div>
      </div>
    </div>
  );
};

const MACRO_TOOLS = [
  { id: 'data',    label: 'Markets & Macro', glyph: '◧' },
  { id: 'news',    label: 'News',            glyph: '❏' },
  { id: 'gather',  label: 'Data Gatherer',   glyph: '▤' },
  { id: 'connect', label: 'Connections',     glyph: '⊚' },
  { id: 'map',     label: 'Map · Globe',     glyph: '◍' },
  { id: 'corr',    label: 'Correlation',     glyph: '▦' },
];

// ================================================================
// Connections — the old Refinitiv influence map (vis-network) over
// macro.graph: nodes (pre-positioned, cluster-colored) + edges
// (hand = solid + lag label, auto = dashed). Click a node to focus.
// ================================================================
// 3 influence link types (part_of is structural — rendered faint, not a "type").
const MC_EDGE_STYLE = {
  drives:  { color: '#19C37D', width: 1.7, dashes: false,  arrow: true,  label: 'drives' },
  leads:   { color: '#5B8DEF', width: 1.4, dashes: false,  arrow: true,  label: 'leads' },
  related: { color: '#97AAC5', width: 0.9, dashes: [4, 4], arrow: false, label: 'related' },
};

const MacroConnectionsMap = () => {
  const [country, setCountry] = React.useState('us');
  const [status, setStatus] = React.useState('loading');
  const wrapRef = React.useRef(null);
  const netRef = React.useRef(null);
  const roRef = React.useRef(null);

  // Always the curated "condensed" graph — the most important variables per
  // country. The old full/insane graphs (1000s of nodes) lagged the browser
  // and were dropped. Edges are typed into 3 influence kinds via MC_EDGE_STYLE.
  React.useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    if (netRef.current) { netRef.current.destroy(); netRef.current = null; }
    sbGet(`/graph?country=eq.${country}&graph_kind=eq.condensed&select=payload&limit=1`, 'macro')
      .then((r) => {
        if (cancelled) return;
        const g = r && r[0] && r[0].payload;
        if (!g || !g.nodes || !g.nodes.length) { setStatus('empty'); return; }
        const vis = window.vis;
        if (!vis || !wrapRef.current) { setStatus('novis'); return; }
        const cc = {}; (g.clusters || []).forEach((c) => { cc[c.id] = c.color; });
        const nodes = new vis.DataSet(g.nodes.map((n) => ({
          id: n.id, label: n.label || n.id, title: n.description || n.id,
          x: n.x, y: n.y, value: n.importance || 1,
          color: { background: cc[n.cluster] || '#5b8def', border: 'rgba(255,255,255,.25)',
                   highlight: { background: '#E8E4D9', border: '#fff' } },
          font: { color: '#D4DCEA', size: 12, face: 'Geist, Inter, sans-serif' },
        })));
        const edges = new vis.DataSet(g.edges.map((e) => {
          const st = MC_EDGE_STYLE[e.type];
          if (!st) {   // part_of / structural → faint dotted, no arrow, not a legend type
            return { from: e.source, to: e.target, dashes: [1, 3], width: 0.4, title: e.note || '',
                     color: { color: 'rgba(151,170,197,0.16)', highlight: 'rgba(151,170,197,0.45)' } };
          }
          return {
            from: e.source, to: e.target, dashes: st.dashes,
            label: e.lag_months ? '+' + e.lag_months.join('–') + 'mo' : '',
            title: e.note || '', arrows: st.arrow ? 'to' : undefined,
            color: { color: st.color, opacity: 0.55, highlight: st.color },
            font: { color: '#8E9AB0', size: 9, strokeWidth: 0, background: 'rgba(2,2,3,0.6)' },
            width: st.width,
          };
        }));
        netRef.current = new vis.Network(wrapRef.current, { nodes, edges }, {
          physics: false,
          interaction: { hover: true, tooltipDelay: 120, navigationButtons: false, keyboard: false },
          nodes: { shape: 'dot', scaling: { min: 8, max: 28 }, borderWidth: 1.5 },
          edges: { smooth: { type: 'continuous' } },
        });
        setStatus('ok');
        netRef.current.on('click', (p) => { if (p.nodes && p.nodes[0]) netRef.current.focus(p.nodes[0], { scale: 1.05, animation: true }); });
        // Force a resize after layout settles (the container can be 0-height when
        // vis measures it on create) + observe future resizes (keep-alive show/hide).
        const refit = () => { const el = wrapRef.current; if (!netRef.current || !el) return; netRef.current.setSize(el.clientWidth + 'px', el.clientHeight + 'px'); netRef.current.redraw(); netRef.current.fit({ animation: false }); };
        requestAnimationFrame(refit); setTimeout(refit, 200);
        if (window.ResizeObserver && wrapRef.current) { roRef.current = new ResizeObserver(refit); roRef.current.observe(wrapRef.current); }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; if (roRef.current) { roRef.current.disconnect(); roRef.current = null; } if (netRef.current) { netRef.current.destroy(); netRef.current = null; } };
  }, [country]);

  const msg = { loading: 'Loading influence graph…', empty: `No curated influence map for ${country.toUpperCase()} yet — the hand-authored map currently covers US.`, error: 'Failed to load graph', novis: 'vis-network not loaded' };

  return (
    <section className="mc-section mc-data-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mc-section-h">
        <span>Connections · influence map</span>
        <span className="mc-section-h-sub">{country.toUpperCase()} · most-important macro variables · {status === 'ok' ? 'drag to pan · scroll to zoom · click a node' : '…'}</span>
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="mc-chip-row">{MACRO_COUNTRIES.map((c) => <button key={c.id} className={`mc-chip ${country === c.id ? 'active' : ''}`} onClick={() => setCountry(c.id)}>{c.label}</button>)}</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 10.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {Object.keys(MC_EDGE_STYLE).map((k) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 16, height: 0, borderTop: `2px ${MC_EDGE_STYLE[k].dashes ? 'dashed' : 'solid'} ${MC_EDGE_STYLE[k].color}` }} />
              {MC_EDGE_STYLE[k].label}{MC_EDGE_STYLE[k].arrow ? ' →' : ''}
            </span>
          ))}
        </div>
        <button className="sw-tf" style={{ marginLeft: 'auto' }} onClick={() => netRef.current && netRef.current.fit({ animation: true })}>Fit</button>
      </div>
      <div style={{ flex: 1, minHeight: 440, position: 'relative' }}>
        <div ref={wrapRef} style={{ position: 'absolute', inset: 0, background: 'var(--bg-0,#020203)' }} />
        {status !== 'ok' && <div className="mc-news-empty" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>{msg[status] || '…'}</div>}
      </div>
    </section>
  );
};

// Error boundary — a single tool (e.g. the Cesium globe tearing down) can't
// black out the whole terminal; it shows a retry fallback instead.
class MtoolBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch() {}
  render() {
    if (this.state.err) {
      return (
        <div className="mc-section mc-news-empty" style={{ padding: 40 }}>
          This tool hit an error.{' '}
          <button className="sw-tf" onClick={() => this.setState({ err: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const macroToolNode = (id) => {
  if (id === 'data')      return <MacroMarketsTool />;
  if (id === 'news')      return window.MacroNews        ? wrapWs(<window.MacroNews />)        : <div className="mc-section mc-news-empty">News not loaded.</div>;
  if (id === 'gather')    return <DataGatherer />;
  if (id === 'connect')   return <MacroConnectionsMap />;
  if (id === 'map')       return window.MacroMap         ? wrapWs(<window.MacroMap />)         : <div className="mc-section mc-news-empty">Map not loaded.</div>;
  if (id === 'corr')      return <CorrelationTool />;
  return null;
};

const MacroTerminal = () => {
  const [tool, setTool] = React.useState('data');
  const [opened, setOpened] = React.useState(['data']);   // keep-alive set
  const open = (id) => { setTool(id); setOpened((o) => (o.includes(id) ? o : [...o, id])); };
  return (
    <div className="mtool-shell">
      {/* Keep-alive: each tool mounts on first open and stays mounted (hidden when
          inactive). Critical for the Cesium globe — unmounting it threw on teardown
          and black-screened the app. Also preserves each tool's state on switch. */}
      <div className="mtool-main">
        {MACRO_TOOLS.map((t) => (
          opened.includes(t.id) ? (
            <div key={t.id} style={{ height: '100%', display: tool === t.id ? 'block' : 'none' }}>
              <MtoolBoundary>{macroToolNode(t.id)}</MtoolBoundary>
            </div>
          ) : null
        ))}
      </div>
      <div className="mtool-bar">
        {MACRO_TOOLS.map((t) => (
          <button key={t.id} className={`mtool-btn ${tool === t.id ? 'active' : ''}`} onClick={() => open(t.id)} title={t.label}>
            <span className="mtool-glyph">{t.glyph}</span>
            <span className="mtool-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
window.MacroLab = MacroTerminal;       // kept name for the existing render branch
window.MacroTerminal = MacroTerminal;
