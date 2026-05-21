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
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// ================================================================
// TOOL 2 — Correlation Terminal (templates → heatmap → pair detail)
// ================================================================
const CORR_DATA = 'corr-data';   // bundled from the correlation app (relative to /launcher/)
const CORR_TEMPLATES = [
  { name: 'us_macro_xa',      display: 'US Macro Cross-Asset' },
  { name: 'asia_beta',        display: 'Asia Beta' },
  { name: 'g10_em_fx',        display: 'G10 / EM FX' },
  { name: 'risk_factors',     display: 'Risk Factors' },
  { name: 'crypto_equity',    display: 'Crypto × Equity' },
  { name: 'commodities',      display: 'Commodities' },
  { name: 'energy_transition',display: 'Energy Transition' },
  { name: 'indo_domestic',    display: 'Indonesia Domestic' },
  { name: 'indo_xborder',     display: 'Indonesia Cross-Border' },
  { name: 'china_hk',         display: 'China / HK' },
  { name: 'europe_xa',        display: 'Europe Cross-Asset' },
];
const corrColor = (v) => {
  if (v == null) return 'transparent';
  const a = Math.min(1, Math.abs(v));
  return v >= 0 ? `rgba(25,195,125,${0.10 + a * 0.72})` : `rgba(255,92,112,${0.10 + a * 0.72})`;
};
const corrShort = (s) => (s && s.length > 11 ? s.slice(0, 10) + '…' : s);

const CorrelationTool = () => {
  const { AreaChart } = window.ChartLib || {};
  const fmt = window.fmt || { num: (v, d = 2) => Number(v).toFixed(d) };
  const [tplName, setTplName] = React.useState('us_macro_xa');
  const [tpl, setTpl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [sel, setSel] = React.useState(null);    // {i,j}
  const [pair, setPair] = React.useState(null);   // {na,nb,r,loading,rolling}

  React.useEffect(() => {
    setLoading(true); setTpl(null); setSel(null); setPair(null);
    fetch(`${CORR_DATA}/matrices/${tplName}.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setTpl(d); setLoading(false); }).catch(() => setLoading(false));
  }, [tplName]);

  const pickCell = (i, j) => {
    if (!tpl || i === j) return;
    setSel({ i, j });
    setPair({ na: tpl.names[i], nb: tpl.names[j], r: tpl.matrix[i][j], loading: true });
    sbRpc('rolling_corr', { series_a: tpl.ids[i], series_b: tpl.ids[j], frequency: 'weekly', window_size: 52 }, 'correlation')
      .then((rows) => setPair((p) => ({ ...p, loading: false, rolling: (rows || []).map((x) => x.corr_val) })))
      .catch(() => setPair((p) => ({ ...p, loading: false, rolling: [] })));
  };

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h"><span>Correlation Terminal</span><span className="mc-section-h-sub">{tpl ? tpl.display : '…'} · {tpl ? tpl.ids.length : '—'} series · weekly · click a cell for the pair</span></div>
      <div style={{ padding: '12px 18px' }}>
        <div className="mc-chip-row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          {CORR_TEMPLATES.map((t) => <button key={t.name} className={`mc-chip ${tplName === t.name ? 'active' : ''}`} onClick={() => setTplName(t.name)}>{t.display}</button>)}
        </div>
        {loading && <div className="mc-news-empty">Loading matrix…</div>}
        {!loading && !tpl && <div className="mc-news-empty">Could not load this template.</div>}
        {tpl && (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ overflow: 'auto', maxWidth: '100%' }}>
              <table className="corr-heat"><tbody>
                <tr><th></th>{tpl.names.map((n, j) => <th key={j} title={n} className="corr-colh">{corrShort(n)}</th>)}</tr>
                {tpl.matrix.map((row, i) => (
                  <tr key={i}>
                    <th className="corr-rowh" title={tpl.names[i]}>{corrShort(tpl.names[i])}</th>
                    {row.map((v, j) => (
                      <td key={j} className={`corr-cell ${sel && sel.i === i && sel.j === j ? 'sel' : ''}`}
                          style={{ background: i === j ? 'rgba(151,170,197,.18)' : corrColor(v) }}
                          title={`${tpl.names[i]} × ${tpl.names[j]}: ${fmt.num(v, 2)}`} onClick={() => pickCell(i, j)}>
                        {fmt.num(v, 1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody></table>
            </div>
            {pair && (
              <div className="mc-chart-card" style={{ minWidth: 320, flex: 1 }}>
                <div className="mc-chart-h"><span>{pair.na} × {pair.nb}</span></div>
                <div style={{ padding: '16px 16px 6px', textAlign: 'center' }}>
                  <div className="num-hero" style={{ fontSize: 38, color: pair.r >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{fmt.num(pair.r, 2)}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>full-period Pearson (weekly)</div>
                </div>
                <div className="mc-chart-h"><span>52-week rolling correlation</span></div>
                {pair.loading ? <div className="mc-news-empty">Computing rolling…</div>
                  : (AreaChart && pair.rolling && pair.rolling.length ? <AreaChart data={pair.rolling} height={160} color="#97AAC5" /> : <div className="mc-news-empty">No rolling overlap</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

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
const MACRO_TOOLS = [
  { id: 'gather', label: 'Data Gatherer', glyph: '▤' },
  { id: 'corr',   label: 'Correlation',   glyph: '▦' },
  { id: 'map',    label: 'Variables Map', glyph: '⊕' },
];

const MacroTerminal = () => {
  const [tool, setTool] = React.useState('gather');
  return (
    <div className="mtool-shell">
      <div className="mtool-main">
        {tool === 'gather' && <DataGatherer />}
        {tool === 'corr'   && <CorrelationTool />}
        {tool === 'map'    && <MacroMapTool />}
      </div>
      <div className="mtool-bar">
        {MACRO_TOOLS.map((t) => (
          <button key={t.id} className={`mtool-btn ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)} title={t.label}>
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
