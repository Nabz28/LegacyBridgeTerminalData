// ================================================================
// Macro · News sub-page
// Full-bleed news view: list (left ~60%) + drawer (right ~40%)
// Region chips: All / US / IDX / World · MiroFish placeholder per article
// Fixtures live on window.MACRO_DATA.NEWS_FIXTURES
// ================================================================

const MacroNews = () => {
  const NEWS = (window.MACRO_DATA && window.MACRO_DATA.NEWS_FIXTURES) || [];
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery]   = React.useState('');
  const [openId, setOpenId] = React.useState(NEWS[0]?.id ?? null);

  const filtered = NEWS.filter(n => {
    const okRegion = filter === 'all'
      || (filter === 'us'    && n.region === 'US')
      || (filter === 'idx'   && n.region === 'ID')
      || (filter === 'world' && n.region === 'World');
    const okQuery = !query || (n.headline + ' ' + n.source + ' ' + n.summary).toLowerCase().includes(query.toLowerCase());
    return okRegion && okQuery;
  });
  const selected = filtered.find(n => n.id === openId) || filtered[0] || null;

  const bull = filtered.filter(n => n.sent === 'pos').length;
  const bear = filtered.filter(n => n.sent === 'neg').length;
  const flat = filtered.filter(n => n.sent === 'flat').length;
  const net  = filtered.length ? Math.round(((bull - bear) / filtered.length) * 100) : 0;

  return (
    <section className="mc-section mc-news-page">
      <div className="mc-section-h">
        <span>Macro · News</span>
        <span className="mc-section-h-sub">{filtered.length} items · IndoBERT + GPT sentiment · last 24h · net {net >= 0 ? '+' : ''}{net}</span>
      </div>
      <div className="mc-news-page-layout">
        <div className="mc-news-page-list">
          <div className="mc-news-tabs">
            {[['all','All'],['us','US'],['idx','IDX'],['world','World']].map(([k, l]) => (
              <button key={k} className={`mc-news-tab ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
            <div className="mc-news-search">
              <input placeholder="Search headlines, sources, regions…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          <ul className="nf-feed mc-news-page-feed">
            {filtered.map(n => (
              <li
                key={n.id}
                className={`nf-row is-${n.sent} ${selected && selected.id === n.id ? 'is-open' : ''}`}
                onClick={() => setOpenId(n.id)}
                style={{ cursor: 'pointer' }}
              >
                <span className="nf-row__time">{n.time}</span>
                <span className="nf-row__source">{n.source}</span>
                <span className="nf-row__headline">
                  <span className="nf-row__region">{n.region}</span>
                  {n.headline}
                </span>
                <span className={`db-mini__sent db-mini__sent--${n.sent}`}>
                  <span className="db-mini__sent-dot" />
                  {n.sent === 'pos' ? 'Bull' : n.sent === 'neg' ? 'Bear' : 'Mixed'}
                  <span className="db-mini__sent-net">{n.net >= 0 ? '+' : ''}{n.net}</span>
                </span>
              </li>
            ))}
            {!filtered.length && <li className="mc-news-empty">No articles match your filter.</li>}
          </ul>
        </div>

        <aside className="mc-news-page-drawer">
          {selected ? (
            <>
              <div className="mc-news-drawer-h">
                <div className="mc-news-drawer-h-tags">
                  <span className="mc-tag">{selected.region}</span>
                  <span className="mc-tag src">{selected.source}</span>
                  <span className="mc-tag">{selected.time} WIB</span>
                  <span className={`db-mini__sent db-mini__sent--${selected.sent}`}>
                    <span className="db-mini__sent-dot" />
                    {selected.sent === 'pos' ? 'Bullish' : selected.sent === 'neg' ? 'Bearish' : 'Mixed'}
                    <span className="db-mini__sent-net">{selected.net >= 0 ? '+' : ''}{selected.net}</span>
                  </span>
                </div>
              </div>
              <h2 className="mc-news-drawer-title">{selected.headline}</h2>
              <p className="mc-news-drawer-body">{selected.summary}</p>
              <div className="mc-news-drawer-h-sub">Where it leads</div>
              <p className="mc-news-drawer-impact">{selected.impact}</p>

              <div className="mc-news-drawer-h-sub">MiroFish · simulate this story</div>
              <div className="mf-drop">
                <span className="mf-drop-rule" />
                <div>
                  Run multi-agent simulation seeded by this article.{' '}
                  <span style={{ color: 'var(--text-tertiary)' }}>Returns prediction report + branching simulation timeline.</span>
                </div>
              </div>
              <div className="mc-news-drawer-actions">
                <button className="sw-tf is-active">▶ Run swarm simulation</button>
                <button className="sw-tf">⤓ Save to research</button>
                <button className="sw-tf">↗ Open source</button>
              </div>

              <div className="mc-news-drawer-h-sub">Sentiment summary · current filter</div>
              <div className="mc-sent-bar">
                <span className="mc-sent-seg pos"  style={{ width: `${(bull / Math.max(filtered.length, 1)) * 100}%` }} />
                <span className="mc-sent-seg flat" style={{ width: `${(flat / Math.max(filtered.length, 1)) * 100}%` }} />
                <span className="mc-sent-seg neg"  style={{ width: `${(bear / Math.max(filtered.length, 1)) * 100}%` }} />
              </div>
              <ul className="mc-sent-stats mc-sent-stats--inline">
                <li><span className="dot pos" />Bullish<b>{bull}</b></li>
                <li><span className="dot flat" />Mixed<b>{flat}</b></li>
                <li><span className="dot neg" />Bearish<b>{bear}</b></li>
              </ul>
            </>
          ) : (
            <div className="mc-news-empty">Select an article to read.</div>
          )}
        </aside>
      </div>
    </section>
  );
};

window.MacroNews = MacroNews;
