// ================================================================
// Macro · Data sub-page
// Statista-inspired catalog: left rail (search + region/group chips +
// indicator list) → main panel (chart + full data table + AI comment + CSV)
// Indicators live on window.DATA_EXT.MACRO_INDICATORS
// ================================================================

const MacroData = () => {
  const { AreaChart } = window.ChartLib;
  const Spark = window.Spark;
  const fmt = window.fmt;
  const ALL = (window.DATA_EXT && window.DATA_EXT.MACRO_INDICATORS) || [];

  const [region,    setRegion]   = React.useState('all');
  const [group,     setGroup]    = React.useState('all');
  const [activeId,  setActiveId] = React.useState(ALL[0]?.id || 'cpi_us');
  const [search,    setSearch]   = React.useState('');

  const regions = ['all', ...Array.from(new Set(ALL.map(i => i.region)))];
  const groups  = ['all', ...Array.from(new Set(ALL.map(i => i.group)))];
  const items = ALL.filter(i =>
    (region === 'all' || i.region === region) &&
    (group  === 'all' || i.group === group) &&
    (!search || i.label.toLowerCase().includes(search.toLowerCase()) || i.id.includes(search.toLowerCase()))
  );
  const active = ALL.find(i => i.id === activeId) || items[0];

  return (
    <section className="mc-section mc-data-page">
      <div className="mc-section-h">
        <span>Macro · Data catalog</span>
        <span className="mc-section-h-sub">{ALL.length} series · taxonomy → drill · click any series</span>
      </div>
      <div className="mc-data-shell mc-data-shell--page">
        <aside className="mc-data-rail">
          <div className="mc-filter"><input placeholder="Search series…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="mc-chips">
            <div className="mc-chip-label">Region</div>
            <div className="mc-chip-row">
              {regions.map(r => (
                <button key={r} className={`mc-chip ${region === r ? 'active' : ''}`} onClick={() => setRegion(r)}>{r}</button>
              ))}
            </div>
            <div className="mc-chip-label">Group</div>
            <div className="mc-chip-row">
              {groups.map(g => (
                <button key={g} className={`mc-chip ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div className="mc-list mc-list--page">
            {items.map(i => (
              <div key={i.id} className={`mc-list-item ${activeId === i.id ? 'active' : ''}`} onClick={() => setActiveId(i.id)}>
                <div className="mc-li-top">
                  <span className={`mc-li-region r-${i.region}`}>{i.region}</span>
                  <span className="mc-li-label">{i.label}</span>
                </div>
                <div className="mc-li-bot">
                  <span className="mc-li-val">{fmt.num(i.latest, Math.abs(i.latest) < 10 ? 2 : 0)}{i.unit}</span>
                  <span className={`mc-li-chg ${i.chg >= 0 ? 'pos' : 'neg'}`}>{i.chg >= 0 ? '+' : ''}{fmt.num(i.chg, 2)}</span>
                  <span className="mc-li-spark"><Spark data={i.series} color={i.chg >= 0 ? 'var(--pos)' : 'var(--neg)'} w={48} h={16} fill={false} /></span>
                </div>
              </div>
            ))}
            {!items.length && <div className="mc-news-empty">No series match.</div>}
          </div>
        </aside>

        {active && (
          <div className="mc-data-main">
            <div className="mc-detail-head">
              <div>
                <div className="mc-detail-tags">
                  <span className="mc-tag">{active.region}</span>
                  <span className="mc-tag">{active.group}</span>
                  <span className="mc-tag src">{active.source}</span>
                </div>
                <div className="mc-detail-title">{active.label}</div>
                <div className="mc-detail-sub">Latest reading {active.latest}{active.unit} · last updated 14:32 WIB · source {active.source}</div>
              </div>
              <div className="mc-detail-quote">
                <div className="qv">{fmt.num(active.latest, Math.abs(active.latest) < 10 ? 2 : 0)}<span>{active.unit}</span></div>
                <div className={`qc ${active.chg >= 0 ? 'pos' : 'neg'}`}>{active.chg >= 0 ? '+' : ''}{fmt.num(active.chg, 2)} vs prior</div>
              </div>
            </div>
            <div className="mc-chart-card">
              <div className="mc-chart-h">
                <span>{active.label} · 40 periods</span>
                <div className="mc-tf-row">{['1Y','3Y','5Y','10Y','MAX'].map(t => <button key={t} className={`mc-tf ${t === '5Y' ? 'active' : ''}`}>{t}</button>)}</div>
                <button className="sw-tf">⤓ CSV</button>
              </div>
              <AreaChart data={active.series} height={260} color="#5B8DEF" />
            </div>
            <div className="mc-data-table-wrap">
              <table className="sw-tbl">
                <thead><tr><th>Period</th><th style={{ textAlign: 'right' }}>Actual</th><th style={{ textAlign: 'right' }}>Cons</th><th style={{ textAlign: 'right' }}>Prior</th><th style={{ textAlign: 'right' }}>Surprise</th></tr></thead>
                <tbody>
                  {[0,1,2,3,4,5,6,7].map(i => {
                    const v = active.series[active.series.length - 1 - i];
                    if (v === undefined) return null;
                    const cons = v - (Math.sin(i*1.7) * 0.3);
                    const prev = v - active.chg + Math.cos(i*1.3)*0.2;
                    const surp = v - cons;
                    return (
                      <tr key={i}>
                        <td>{['Apr 26','Mar 26','Feb 26','Jan 26','Dec 25','Nov 25','Oct 25','Sep 25'][i]}</td>
                        <td style={{ textAlign: 'right' }} className="num">{fmt.num(v, 2)}</td>
                        <td style={{ textAlign: 'right' }} className="num">{fmt.num(cons, 2)}</td>
                        <td style={{ textAlign: 'right' }} className="num">{fmt.num(prev, 2)}</td>
                        <td style={{ textAlign: 'right' }} className={`num ${surp >= 0 ? 'pos' : 'neg'}`}>{surp >= 0 ? '+' : ''}{fmt.num(surp, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mc-card">
              <div className="mc-card-h">AI commentary</div>
              <div style={{ padding: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {active.region === 'US' && 'US macro mix remains supportive of risk: labor cooling without breaking, inflation glide path intact.'}
                {active.region === 'ID' && 'Indonesia: BI policy patience justified — IDR stable, reserves at 8.4 months import cover.'}
                {active.region === 'Global' && 'Global commodity / FX backdrop: dollar weakness narrative re-engaging as Fed pricing softens.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

window.MacroData = MacroData;
