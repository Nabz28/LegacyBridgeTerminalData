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

  const values = obs.map((o) => o.value).filter((v) => v != null);
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
                {AreaChart && values.length ? <AreaChart data={values} height={250} color="#5B8DEF" /> : <div className="mc-news-empty" style={{ padding: 40 }}>No data</div>}
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
// Dashboard wrapper — Narin's MacroDashboard needs region state.
const MacroDashboardTool = () => {
  const [region, setRegion] = React.useState('both');
  return window.MacroDashboard
    ? <div className="mc-workspace" style={{ height: '100%', overflow: 'auto' }}><window.MacroDashboard region={region} setRegion={setRegion} /></div>
    : <div className="mc-section mc-news-empty">Dashboard not loaded.</div>;
};
const wrapWs = (node) => <div className="mc-workspace" style={{ height: '100%', overflow: 'auto' }}>{node}</div>;

const MACRO_TOOLS = [
  { id: 'dashboard', label: 'Dashboard',     glyph: '◧' },
  { id: 'news',      label: 'News',          glyph: '❏' },
  { id: 'gather',    label: 'Data Gatherer', glyph: '▤' },
  { id: 'connect',   label: 'Connections',   glyph: '⊚' },
  { id: 'map',       label: 'Map · Globe',   glyph: '◍' },
  { id: 'corr',      label: 'Correlation',   glyph: '▦' },
];

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
  if (id === 'dashboard') return <MacroDashboardTool />;
  if (id === 'news')      return window.MacroNews        ? wrapWs(<window.MacroNews />)        : <div className="mc-section mc-news-empty">News not loaded.</div>;
  if (id === 'gather')    return <DataGatherer />;
  if (id === 'connect')   return window.MacroConnections ? wrapWs(<window.MacroConnections />) : <div className="mc-section mc-news-empty">Connections not loaded.</div>;
  if (id === 'map')       return window.MacroMap         ? wrapWs(<window.MacroMap />)         : <div className="mc-section mc-news-empty">Map not loaded.</div>;
  if (id === 'corr')      return <CorrelationTool />;
  return null;
};

const MacroTerminal = () => {
  const [tool, setTool] = React.useState('dashboard');
  const [opened, setOpened] = React.useState(['dashboard']);   // keep-alive set
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
