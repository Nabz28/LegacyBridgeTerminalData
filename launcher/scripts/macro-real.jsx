// ================================================================
// MacroLab — REAL Macro Indicator Lab (Phase 2).
// Reads Narin's `macro` Supabase schema (series_lite catalog +
// observations) via PostgREST with the public anon key. Search-driven
// (PostgREST max_rows=1000), reuses the .mc-* styles + window.ChartLib.
// ================================================================

const MACRO_API  = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const MACRO_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const macroFetch = (path) =>
  fetch(MACRO_API + path, {
    headers: {
      apikey: MACRO_ANON,
      Authorization: 'Bearer ' + MACRO_ANON,
      'Accept-Profile': 'macro',
    },
  }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

const MACRO_COUNTRIES = [
  { id: 'us', label: 'US' },
  { id: 'id', label: 'ID' },
  { id: 'cn', label: 'CN' },
];

const MacroLab = () => {
  const { AreaChart } = window.ChartLib || {};
  const Spark = window.Spark;
  const fmt = window.fmt || { num: (v, d = 2) => Number(v).toFixed(d) };

  const [country, setCountry] = React.useState('us');
  const [search, setSearch]   = React.useState('');
  const [list, setList]       = React.useState([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [activeRic, setActiveRic]     = React.useState(null);
  const [detail, setDetail]   = React.useState(null);
  const [obs, setObs]         = React.useState([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [err, setErr]         = React.useState('');

  // Catalog: fetch series_lite for the country (+ optional search), non-poll.
  React.useEffect(() => {
    let cancelled = false;
    setListLoading(true); setErr('');
    let q = `/series_lite?country=eq.${country}&is_poll=eq.false`
          + `&select=ric,description,subcategory,category_slug,frequency`
          + `&order=description.asc&limit=200`;
    if (search.trim()) q += `&description=ilike.*${encodeURIComponent(search.trim())}*`;
    macroFetch(q)
      .then((rows) => {
        if (cancelled) return;
        setList(rows);
        setListLoading(false);
        if (rows.length && !rows.find((r) => r.ric === activeRic)) setActiveRic(rows[0].ric);
        if (!rows.length) { setActiveRic(null); setDetail(null); setObs([]); }
      })
      .catch((code) => { if (!cancelled) { setErr('Catalog load failed (' + code + ')'); setListLoading(false); } });
    return () => { cancelled = true; };
  }, [country, search]);

  // Detail + observations for the selected RIC.
  React.useEffect(() => {
    if (!activeRic) return;
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([
      macroFetch(`/series?ric=eq.${activeRic}&select=description,units,source,meaning,frequency,subcategory,category,country&limit=1`),
      macroFetch(`/observations?ric=eq.${activeRic}&select=date,value&order=date.desc&limit=240`),
    ])
      .then(([d, o]) => {
        if (cancelled) return;
        setDetail(d && d[0] ? d[0] : null);
        setObs((o || []).slice().reverse()); // ascending for the chart
        setDetailLoading(false);
      })
      .catch((code) => { if (!cancelled) { setErr('Series load failed (' + code + ')'); setDetailLoading(false); } });
    return () => { cancelled = true; };
  }, [activeRic]);

  const values = obs.map((o) => o.value).filter((v) => v != null);
  const latest = values.length ? values[values.length - 1] : null;
  const prev   = values.length > 1 ? values[values.length - 2] : null;
  const chg    = latest != null && prev != null ? latest - prev : null;
  const unit   = (detail && detail.units) || '';

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h">
        <span>Macro · Indicator Lab</span>
        <span className="mc-section-h-sub">Refinitiv macro · {country.toUpperCase()} · search to filter · live from Supabase</span>
      </div>
      <div className="mc-data-shell mc-data-shell--page">
        <aside className="mc-data-rail">
          <div className="mc-chips">
            <div className="mc-chip-label">Country</div>
            <div className="mc-chip-row">
              {MACRO_COUNTRIES.map((c) => (
                <button key={c.id} className={`mc-chip ${country === c.id ? 'active' : ''}`}
                        onClick={() => { setCountry(c.id); setSearch(''); }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="mc-filter">
            <input placeholder="Search indicators (CPI, GDP, rate…)" value={search}
                   onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mc-list mc-list--page">
            {listLoading && <div className="mc-news-empty">Loading catalog…</div>}
            {!listLoading && err && <div className="mc-news-empty">{err}</div>}
            {!listLoading && !err && !list.length && <div className="mc-news-empty">No indicators match.</div>}
            {!listLoading && list.map((i) => (
              <div key={i.ric} className={`mc-list-item ${activeRic === i.ric ? 'active' : ''}`}
                   onClick={() => setActiveRic(i.ric)}>
                <div className="mc-li-top">
                  <span className={`mc-li-region r-${country.toUpperCase()}`}>{country.toUpperCase()}</span>
                  <span className="mc-li-label">{i.description}</span>
                </div>
                <div className="mc-li-bot">
                  <span className="mc-li-val" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{i.subcategory || i.category_slug}</span>
                  <span className="mc-li-chg" style={{ color: 'var(--text-tertiary)' }}>{(i.frequency || '').replace('P', '')}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="mc-data-main">
          {!activeRic && <div className="mc-news-empty" style={{ padding: 40 }}>Select an indicator.</div>}
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
                  <div className="mc-detail-sub">
                    {obs.length ? `${obs.length} observations · latest ${obs[obs.length - 1].date}` : (detailLoading ? 'Loading…' : 'No observations')}
                    {detail && detail.frequency ? ` · ${detail.frequency}` : ''}
                  </div>
                </div>
                <div className="mc-detail-quote">
                  <div className="qv">{latest != null ? fmt.num(latest, Math.abs(latest) < 10 ? 2 : 0) : '—'}<span>{unit}</span></div>
                  {chg != null && <div className={`qc ${chg >= 0 ? 'pos' : 'neg'}`}>{chg >= 0 ? '+' : ''}{fmt.num(chg, 2)} vs prior</div>}
                </div>
              </div>

              <div className="mc-chart-card">
                <div className="mc-chart-h">
                  <span>{(detail && detail.description) || activeRic} · last {values.length} points</span>
                </div>
                {AreaChart && values.length
                  ? <AreaChart data={values} height={260} color="#5B8DEF" />
                  : <div className="mc-news-empty" style={{ padding: 40 }}>{detailLoading ? 'Loading chart…' : 'No data'}</div>}
              </div>

              <div className="mc-data-table-wrap">
                <table className="sw-tbl">
                  <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>Value</th><th style={{ textAlign: 'right' }}>Δ</th></tr></thead>
                  <tbody>
                    {obs.slice(-8).reverse().map((o, idx, arr) => {
                      const next = arr[idx + 1];
                      const d = next ? o.value - next.value : null;
                      return (
                        <tr key={o.date}>
                          <td>{o.date}</td>
                          <td style={{ textAlign: 'right' }} className="num">{fmt.num(o.value, 2)}</td>
                          <td style={{ textAlign: 'right' }} className={`num ${d == null ? '' : d >= 0 ? 'pos' : 'neg'}`}>{d == null ? '' : (d >= 0 ? '+' : '') + fmt.num(d, 2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {detail && detail.meaning && (
                <div className="mc-card">
                  <div className="mc-card-h">What it is</div>
                  <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{detail.meaning}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

window.MacroLab = MacroLab;
