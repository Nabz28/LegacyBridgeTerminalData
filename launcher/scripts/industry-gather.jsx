// ================================================================
// IndustryGather — "Industry Data" gatherer for T3 (Industry).
// Mirrors the Macro Data Gatherer (category tree + search + chart +
// CSV export), but with a 4-LEVEL drill-down tailored to industry:
//   Industry → Sub-industry → {Demand | Supply} → curated series.
// Reads Narin's `macro` schema (anon key), country='idind'
// (2,061 CEIC Indonesia industry series · 797,659 observations).
// Styling reuses the shared mc-* classes (css/terminal.css), so it
// looks identical to the Macro gatherer. No maps / correlation.
// ================================================================

const IG_SB_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const IG_SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const igGet = (path) =>
  fetch(IG_SB_BASE + path, { headers: { apikey: IG_SB_ANON, Authorization: 'Bearer ' + IG_SB_ANON, 'Accept-Profile': 'macro' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

// CSV download (same helper shape as the macro gatherer)
const igDownloadCsv = (filename, rows) => {
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

const IG_FREQ_LABEL = { P1D: 'Daily', P7D: 'Weekly', P1M: 'Monthly', P3M: 'Quarterly', P6M: 'Semiannual', P1Y: 'Annual' };
const IG_SIDES = [
  { id: 'demand', label: 'Demand data', hint: 'sales · consumption · imports · prices · loans · traffic', color: '#5fd6a4' },
  { id: 'supply', label: 'Supply data', hint: 'production · output · capacity · exports · inventory', color: '#5B8DEF' },
];

// Build the 4-level tree once from the flat series list:
//   industry -> sub_industry -> side -> [series]
const igBuildTree = (rows) => {
  const t = {};
  rows.forEach((s) => {
    const ind = s.category || 'Other';
    const sub = s.subcategory || '—';
    const side = (s.stat_role === 'demand' || s.stat_role === 'supply') ? s.stat_role : 'supply';
    (t[ind] = t[ind] || {});
    (t[ind][sub] = t[ind][sub] || { demand: [], supply: [] });
    t[ind][sub][side].push(s);
  });
  return t;
};

const IndustryGather = () => {
  const { AreaChart } = window.ChartLib || {};
  const fmt = window.fmt || { num: (v, d = 2) => Number(v).toFixed(d) };

  const [rows, setRows]       = React.useState(null);   // all idind series (flat)
  const [tree, setTree]       = React.useState({});
  const [expInd, setExpInd]   = React.useState({});     // industry -> bool
  const [expSub, setExpSub]   = React.useState({});     // "ind||sub" -> bool
  const [expSide, setExpSide] = React.useState({});     // "ind||sub||side" -> bool
  const [search, setSearch]   = React.useState('');
  const [activeRic, setActiveRic] = React.useState(null);
  const [detail, setDetail]   = React.useState(null);
  const [obs, setObs]         = React.useState([]);
  const [err, setErr]         = React.useState('');

  // load all industry series once. Paginate to defeat PostgREST's default
  // max-rows cap (commonly 1000) — the full catalog is ~2,061 series, so a
  // single limited fetch would silently truncate the tree. Stable order +
  // ric tiebreaker makes offset paging deterministic.
  React.useEffect(() => {
    let cancelled = false;
    const cols = 'ric,description,category,subcategory,stat_role,units,source,frequency,n_obs,last_obs,indicator_topic';
    const PAGE = 1000;
    (async () => {
      try {
        let all = [], off = 0;
        for (;;) {
          const page = await igGet(`/series?country=eq.idind&select=${cols}&order=category.asc,subcategory.asc,description.asc,ric.asc&limit=${PAGE}&offset=${off}`);
          all = all.concat(page);
          if (page.length < PAGE) break;
          off += PAGE;
          if (off > 20000) break; // hard safety stop
        }
        if (!cancelled) { setRows(all); setTree(igBuildTree(all)); }
      } catch (c) { if (!cancelled) setErr('Catalog failed (' + c + ')'); }
    })();
    return () => { cancelled = true; };
  }, []);

  // selected series → detail + observations
  React.useEffect(() => {
    if (!activeRic) return;
    let cancelled = false;
    Promise.all([
      igGet(`/series?ric=eq.${activeRic}&select=ric,description,category,subcategory,stat_role,frequency,units,source,n_obs,last_obs,indicator_topic,metadata,country&limit=1`),
      igGet(`/observations?ric=eq.${activeRic}&select=date,value&order=date.desc&limit=600`),
    ]).then(([d, o]) => { if (cancelled) return; setDetail(d && d[0] ? d[0] : null); setObs((o || []).slice().reverse()); })
      .catch((c) => { if (!cancelled) setErr('Series failed (' + c + ')'); });
    return () => { cancelled = true; };
  }, [activeRic]);

  // search → flat matches across all idind series (overrides tree)
  const results = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !rows) return null;
    return rows.filter((s) =>
      (s.description || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.subcategory || '').toLowerCase().includes(q)
    ).slice(0, 300);
  }, [search, rows]);

  const paired = obs.filter((o) => o.value != null);
  const values = paired.map((o) => o.value);
  const dates  = paired.map((o) => o.date);
  const latest = values.length ? values[values.length - 1] : null;
  const prev   = values.length > 1 ? values[values.length - 2] : null;
  const chg    = latest != null && prev != null ? latest - prev : null;
  const unit   = (detail && detail.units) || '';
  const exportCsv = () => igDownloadCsv(`${activeRic}.csv`, [['date', 'value'], ...obs.map((o) => [o.date, o.value])]);

  const sideMeta = (id) => IG_SIDES.find((x) => x.id === id) || IG_SIDES[1];

  const SeriesRow = ({ s }) => (
    <div className={`mc-list-item ${activeRic === s.ric ? 'active' : ''}`} onClick={() => setActiveRic(s.ric)} style={{ paddingLeft: 30 }}>
      <div className="mc-li-top"><span className="mc-li-label">{s.indicator_topic || s.description}</span></div>
      <div className="mc-li-bot">
        <span className="mc-li-val" style={{ color: 'var(--text-tertiary)' }}>
          {[IG_FREQ_LABEL[s.frequency] || s.frequency, s.units, s.n_obs ? s.n_obs + ' obs' : null].filter(Boolean).join(' · ')}
        </span>
      </div>
    </div>
  );

  const industries = Object.keys(tree).sort();

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h">
        <span>Industry Data</span>
        <span className="mc-section-h-sub">
          CEIC Indonesia · {rows ? rows.length.toLocaleString() : '—'} series · Industry → Sub-industry → Demand / Supply · live
        </span>
      </div>
      <div className="mc-data-shell mc-data-shell--page">
        <aside className="mc-data-rail">
          <div className="mc-filter"><input placeholder="Search industry series…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="mc-list mc-list--page">
            {err && <div className="mc-news-empty">{err}</div>}
            {!rows && !err && <div className="mc-news-empty">Loading catalog…</div>}

            {/* search results override the tree */}
            {results ? (
              results.length ? results.map((s) => (
                <div key={s.ric} className={`mc-list-item ${activeRic === s.ric ? 'active' : ''}`} onClick={() => setActiveRic(s.ric)}>
                  <div className="mc-li-top"><span className="mc-li-label">{s.description}</span></div>
                  <div className="mc-li-bot">
                    <span className="mc-li-val" style={{ color: sideMeta(s.stat_role).color }}>
                      {s.category} › {s.subcategory} › {s.stat_role === 'demand' ? 'Demand' : 'Supply'}
                    </span>
                  </div>
                </div>
              )) : <div className="mc-news-empty">No matches.</div>
            ) : rows && (
              // LEVEL 1 — industry
              industries.map((ind) => {
                const subs = Object.keys(tree[ind]).sort();
                const indCount = subs.reduce((a, sub) => a + tree[ind][sub].demand.length + tree[ind][sub].supply.length, 0);
                return (
                  <div key={ind} className="mc-cat-group">
                    <div className="mc-cat-head" onClick={() => setExpInd((e) => ({ ...e, [ind]: !e[ind] }))}>
                      <span className="mc-cat-chev">{expInd[ind] ? '▾' : '▸'}</span>
                      <span className="mc-cat-name">{ind}</span>
                      <span className="mc-cat-count">{indCount}</span>
                    </div>
                    {expInd[ind] && (
                      <div className="mc-cat-series">
                        {/* LEVEL 2 — sub-industry */}
                        {subs.map((sub) => {
                          const subKey = ind + '||' + sub;
                          const node = tree[ind][sub];
                          const subCount = node.demand.length + node.supply.length;
                          return (
                            <div key={subKey} className="mc-cat-group">
                              <div className="mc-cat-head" style={{ paddingLeft: 14 }} onClick={() => setExpSub((e) => ({ ...e, [subKey]: !e[subKey] }))}>
                                <span className="mc-cat-chev">{expSub[subKey] ? '▾' : '▸'}</span>
                                <span className="mc-cat-name">{sub}</span>
                                <span className="mc-cat-count">{subCount}</span>
                              </div>
                              {expSub[subKey] && (
                                <div className="mc-cat-series">
                                  {/* LEVEL 3 — demand / supply */}
                                  {IG_SIDES.map((side) => {
                                    const arr = node[side.id];
                                    if (!arr.length) return null;
                                    const sideKey = subKey + '||' + side.id;
                                    return (
                                      <div key={sideKey} className="mc-cat-group">
                                        <div className="mc-cat-head" style={{ paddingLeft: 22 }} onClick={() => setExpSide((e) => ({ ...e, [sideKey]: !e[sideKey] }))}>
                                          <span className="mc-cat-chev">{expSide[sideKey] ? '▾' : '▸'}</span>
                                          <span className="mc-cat-name" style={{ color: side.color }}>{side.label}</span>
                                          <span className="mc-cat-count">{arr.length}</span>
                                        </div>
                                        {/* LEVEL 4 — series */}
                                        {expSide[sideKey] && (
                                          <div className="mc-cat-series">
                                            {arr.map((s) => <SeriesRow key={s.ric} s={s} />)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className="mc-data-main">
          {!activeRic && <div className="mc-news-empty" style={{ padding: 40 }}>Select an industry, drill into a sub-industry, then Demand or Supply data — or search.</div>}
          {activeRic && (
            <>
              <div className="mc-detail-head">
                <div>
                  <div className="mc-detail-tags">
                    <span className="mc-tag">ID · Industry</span>
                    {detail && detail.category && <span className="mc-tag">{detail.category}</span>}
                    {detail && detail.subcategory && <span className="mc-tag">{detail.subcategory}</span>}
                    {detail && detail.stat_role && (
                      <span className="mc-tag" style={{ background: 'rgba(95,214,164,0.14)', color: sideMeta(detail.stat_role).color, borderColor: 'rgba(95,214,164,0.3)' }}>
                        {detail.stat_role === 'demand' ? 'Demand' : 'Supply'}
                      </span>
                    )}
                    <span className="mc-tag src">{(detail && detail.source) || 'CEIC'}</span>
                    <span className="mc-tag" style={{ background: 'rgba(91,141,239,0.18)', color: '#9db8f5', borderColor: 'rgba(91,141,239,0.35)' }}>CEIC</span>
                    {detail && detail.units && <span className="mc-tag">{detail.units}</span>}
                    <span className="mc-tag" style={{ fontFamily: 'var(--font-mono)' }}>{activeRic}</span>
                  </div>
                  <div className="mc-detail-title">{(detail && detail.description) || activeRic}</div>
                  <div className="mc-detail-sub">
                    {obs.length ? `${obs.length} obs · latest ${obs[obs.length - 1].date}` : 'Loading…'}
                    {detail && detail.frequency ? ` · ${IG_FREQ_LABEL[detail.frequency] || detail.frequency}` : ''}
                    {detail && detail.units ? ` · ${detail.units}` : ''}
                    {detail && detail.source ? ` · src: ${detail.source}` : ''}
                  </div>
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
                {AreaChart && values.length ? <AreaChart data={values} labels={dates} unit={unit} height={250} color={detail ? sideMeta(detail.stat_role).color : '#5B8DEF'} /> : <div className="mc-news-empty" style={{ padding: 40 }}>No data</div>}
              </div>

              <div className="mc-card">
                <div className="mc-card-h">Series</div>
                <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {detail && detail.indicator_topic ? detail.indicator_topic + ' — ' : ''}
                  {detail ? `${detail.category}${detail.subcategory ? ' › ' + detail.subcategory : ''}, classified as ${detail.stat_role === 'demand' ? 'demand' : 'supply'}-side data.` : 'Loading…'}
                  {detail && detail.units ? ` Unit: ${detail.units}.` : ''}
                  {detail && detail.source ? ` Source: ${detail.source} (via CEIC).` : ''}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const IndGatherWorkspace = () => (
  <div className="ind-workspace" style={{ height: '100%' }}>
    <IndustryGather />
  </div>
);

window.IndustryGather = IndustryGather;
window.IndGatherWorkspace = IndGatherWorkspace;
