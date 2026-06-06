// ================================================================
// Macro · News  (window.MacroNews)  — revamped newswire
// Reads live macro.news (via window.MACRO_LIVE). Each item: explicit date,
// full source, clickable link, a single bear↔bull sentiment spectrum with a
// position needle, and a market-impact breakdown (what it moves, which way).
// Falls back to MACRO_DATA.NEWS_FIXTURES only if the live feed is empty.
// ================================================================

const nsScoreColor = (v) => (v == null ? 'var(--text-tertiary)' : v > 12 ? 'var(--pos)' : v < -12 ? 'var(--neg)' : '#d8a13a');
const nsSentOf = (score, label) => label || (score > 12 ? 'pos' : score < -12 ? 'neg' : 'flat');
const nsSentWord = (s) => (s === 'pos' ? 'Bullish' : s === 'neg' ? 'Bearish' : 'Mixed');

// Single bear↔bull spectrum with the needle AND the score value AT its position.
const SentSpectrum = ({ score, big = false }) => {
  const v = Math.max(-100, Math.min(100, Number(score) || 0));
  const pct = (v + 100) / 2;
  // Clamp the floating readout/needle position so the pill never clips off the
  // ends or collides with the Bearish/Bullish labels at extreme scores.
  const cpct = Math.max(7, Math.min(93, pct));
  const txt = (v >= 0 ? '+' : '') + v;
  return (
    <div className={'ns-spectrum-wrap' + (big ? ' big' : '')}>
      {big && (
        <div className="ns-spectrum-floatval" style={{ left: cpct + '%', color: nsScoreColor(v) }}>
          {txt}
        </div>
      )}
      <div className="ns-spectrum">
        <div className="ns-spectrum-fill" style={{ left: Math.min(50, cpct) + '%', width: Math.abs(cpct - 50) + '%' }} />
        <div className="ns-spectrum-mid" />
        <div className="ns-needle" style={{ left: cpct + '%' }} title={txt} />
      </div>
      <div className="ns-spectrum-scale">
        <span>Bearish</span>
        {!big && <span className="ns-spectrum-val" style={{ left: cpct + '%', color: nsScoreColor(v) }}>{txt}</span>}
        <span>Bullish</span>
      </div>
    </div>
  );
};

const NS_STRENGTH = ['—', 'minor', 'moderate', 'large', 'very large', 'extreme'];
const NS_UNIT = { bp: ' bp', pct: '%', pp: ' pp', usdm: 'm', qual: '' };
// Format the engine's quantitative expected move in the asset's natural unit.
const nsMove = (a) => {
  if (a.move == null) return a.sigma_x ? a.sigma_x.toFixed(1) + 'σ' : '—';
  const u = a.unit || '';
  const sign = a.move > 0 ? '+' : a.move < 0 ? '-' : '';
  const cur = u === 'usdm' ? '$' : '';
  return sign + cur + Math.abs(a.move) + (NS_UNIT[u] || '');
};
// Impact row: target + the EXPECTED MOVE (quantitative) + a σ-scaled bar + note.
const ImpactRow = ({ a }) => {
  // new shape uses signed `level` (−5..+5); legacy shape used `dir`.
  const lvl = a.level != null ? a.level : (a.dir || 0) * 2;
  const sx = a.sigma_x != null ? a.sigma_x : Math.min(5, Math.abs(Math.round(lvl))) * 0.7;
  const up = lvl > 0, down = lvl < 0;
  const col = up ? 'var(--pos)' : down ? 'var(--neg)' : 'var(--text-tertiary)';
  const arrow = up ? '▲' : down ? '▼' : '■';
  const lab = a.label || a.target;
  const fill = Math.max(6, Math.min(100, (sx / 3.5) * 100));     // σ multiple → bar length
  return (
    <div className="ns-impact-row" title={(a.note || '') + '  (' + (sx ? sx.toFixed(2) + 'σ' : 'n/a') + ')'}>
      <span className="ns-impact-arrow" style={{ color: col }}>{arrow}</span>
      <span className="ns-impact-label" title={lab}>{lab}</span>
      <span className="ns-mag">
        <span className="ns-mag-move" style={{ color: col }}>{nsMove(a)}</span>
        <span className="ns-mag-track" title={sx ? sx.toFixed(2) + 'σ expected move' : ''}>
          <span className="ns-mag-fill" style={{ width: fill + '%', background: col }} />
        </span>
        <span className="ns-mag-sig">{sx ? sx.toFixed(1) + 'σ' : ''}</span>
      </span>
      <span className="ns-impact-note">{a.note || ''}</span>
    </div>
  );
};

const NS_CAT_LABELS = { monetary: 'Monetary', inflation: 'Inflation', growth: 'Growth', fiscal: 'Fiscal', politics: 'Politics', trade: 'Trade', commodities: 'Commodities', markets: 'Markets', fx: 'FX', banking: 'Banking', corporate: 'Corporate', geopolitics: 'Geopolitics', other: 'Other' };
// Stable display order for the type filter (matches news_taxonomy.json).
const NS_CAT_ORDER = ['monetary', 'inflation', 'growth', 'fiscal', 'politics', 'trade', 'commodities', 'markets', 'fx', 'banking', 'corporate', 'geopolitics', 'other'];
const NS_SURPRISE_LABEL = { priced: 'Priced in', partial: 'Partly priced', surprise: 'Surprise' };

const mapNewsRow = (r) => {
  const t = r.ts ? new Date(r.ts) : null;
  const score = r.sent_score == null ? 0 : Math.round(r.sent_score);
  return {
    id: 'n' + r.id, dt: t, source: r.source || '—', region: r.region || 'World',
    headline: r.headline, summary: r.summary || '', analysis: r.analysis || r.impact || '',
    url: r.url || '', sent: nsSentOf(score, r.sent_label), net: score,
    importance: r.importance || 'med', affects: Array.isArray(r.affects) ? r.affects : [],
    category: r.category || 'other', surprise: r.surprise || null,
  };
};

const nsFmtTime = (d) => d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
const nsFmtDate = (d) => d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
const nsDayKey = (d) => {
  if (!d) return 'Earlier';
  const now = new Date(); const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b - a) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
};

const MacroNews = () => {
  const FIX = (window.MACRO_DATA && window.MACRO_DATA.NEWS_FIXTURES) || [];
  const [live, setLive] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const [cat, setCat] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [openId, setOpenId] = React.useState(null);

  React.useEffect(() => {
    let on = true;
    if (window.MACRO_LIVE) {
      window.MACRO_LIVE.news(120).then((rows) => {
        if (on && Array.isArray(rows) && rows.length) {
          const mapped = rows.map(mapNewsRow);
          setLive(mapped); setOpenId(mapped[0].id);
        }
      }).catch(() => {});
    }
    return () => { on = false; };
  }, []);

  // Bridge Copilot can drive this panel (ui_set_news_filter).
  React.useEffect(() => {
    const h = (e) => {
      const d = e.detail || {};
      if (d.region) setFilter(String(d.region).toLowerCase());
      if (d.type) setCat(d.type);
      if (typeof d.q === 'string') setQuery(d.q);
    };
    window.addEventListener('macro:news-filter', h);
    return () => window.removeEventListener('macro:news-filter', h);
  }, []);

  const NEWS = live || FIX.map((f) => ({ ...f, dt: null, affects: [], analysis: f.impact || '', importance: 'med' }));
  const isLive = !!live;

  const regionPass = (n) => filter === 'all'
    || (filter === 'us' && n.region === 'US')
    || (filter === 'idx' && n.region === 'ID')
    || (filter === 'world' && (n.region === 'World' || n.region === 'CN' || n.region === 'EU'));
  const queryPass = (n) => !query || (n.headline + ' ' + n.source + ' ' + (n.summary || '')).toLowerCase().includes(query.toLowerCase());
  // First filter = region (+search); second filter = news type (category).
  const base = NEWS.filter((n) => regionPass(n) && queryPass(n));
  const cats = NS_CAT_ORDER.filter((c) => base.some((n) => n.category === c));
  const effCat = (cat !== 'all' && !cats.includes(cat)) ? 'all' : cat;   // auto-reset if region hides it
  const filtered = base.filter((n) => effCat === 'all' || n.category === effCat);
  const selected = filtered.find((n) => n.id === openId) || filtered[0] || null;

  const bull = filtered.filter((n) => n.sent === 'pos').length;
  const bear = filtered.filter((n) => n.sent === 'neg').length;
  const mixed = filtered.filter((n) => n.sent === 'flat').length;
  const net = filtered.length ? Math.round(filtered.reduce((s, n) => s + (n.net || 0), 0) / filtered.length) : 0;
  const latest = NEWS.reduce((m, n) => (n.dt && (!m || n.dt > m) ? n.dt : m), null);

  // group filtered by day (filtered is already ts-desc from the query)
  const groups = [];
  filtered.forEach((n) => {
    const k = nsDayKey(n.dt);
    let g = groups.find((x) => x.k === k);
    if (!g) { g = { k, items: [] }; groups.push(g); }
    g.items.push(n);
  });

  const openSentiment = () => {
    const ev = new CustomEvent('macro:navtool', { detail: { tool: 'sentiment' } });
    window.dispatchEvent(ev);
  };

  return (
    <section className="mc-section mc-news-page">
      <div className="mc-section-h">
        <span>Macro · News</span>
        <span className="mc-section-h-sub">
          {filtered.length} items · {isLive ? 'live · RSS + model-scored' : 'sample feed'}
          {latest ? ' · updated ' + nsFmtDate(latest) + ' ' + nsFmtTime(latest) : ''}
        </span>
      </div>

      <div className="mc-news-page-layout">
        <div className="mc-news-page-list">
          <div className="mc-news-tabs">
            {[['all', 'All'], ['us', 'US'], ['idx', 'IDX'], ['world', 'World']].map(([k, l]) => (
              <button key={k} className={`mc-news-tab ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
            <div className="mc-news-search">
              <input placeholder="Search headlines, sources…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          {/* second filter — news TYPE (reflects the current region) */}
          <div className="ns-cattabs">
            <span className="ns-cattabs-label">Type</span>
            <button className={`ns-cattab ${effCat === 'all' ? 'is-on' : ''}`} onClick={() => setCat('all')}>All</button>
            {cats.map((c) => (
              <button key={c} className={`ns-cattab ${effCat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>{NS_CAT_LABELS[c]}</button>
            ))}
          </div>

          {/* aggregate bear↔bull for the current filter */}
          <div className="ns-aggregate">
            <div className="ns-agg-head">
              <span className="ns-agg-title">Net sentiment · {filter === 'all' ? 'all regions' : filter.toUpperCase()}</span>
              <button className="ns-agg-link" onClick={openSentiment} title="Open the macro Sentiment engine">Full macro read →</button>
            </div>
            <SentSpectrum score={net} />
            <div className="ns-agg-counts">
              <span className="up">▲ {bull} bullish</span>
              <span className="mid">■ {mixed} mixed</span>
              <span className="dn">▼ {bear} bearish</span>
            </div>
          </div>

          <ul className="nf-feed ns-feed">
            {groups.map((g) => (
              <React.Fragment key={g.k}>
                <li className="ns-daygroup">{g.k}</li>
                {g.items.map((n) => (
                  <li key={n.id} className={`ns-row is-${n.sent} imp-${n.importance} ${selected && selected.id === n.id ? 'is-open' : ''}`} onClick={() => setOpenId(n.id)}>
                    <div className="ns-row-meta">
                      <span className="ns-row-time">{nsFmtTime(n.dt) || '—'}</span>
                      <span className="ns-row-src">{n.source}</span>
                      <span className="ns-row-region">{n.region}</span>
                      <span className="ns-row-cat">{NS_CAT_LABELS[n.category] || n.category}</span>
                    </div>
                    <div className="ns-row-head">{n.headline}</div>
                    <div className={`ns-pill ns-pill--${n.sent}`}>
                      {nsSentWord(n.sent)} <b>{n.net >= 0 ? '+' : ''}{n.net}</b>
                    </div>
                  </li>
                ))}
              </React.Fragment>
            ))}
            {!filtered.length && <li className="mc-news-empty">No articles match your filter.</li>}
          </ul>
        </div>

        <aside className="mc-news-page-drawer">
          {selected ? (
            <div className="ns-detail">
              <div className="ns-detail-meta">
                <span className="mc-tag">{selected.region}</span>
                <span className="mc-tag">{NS_CAT_LABELS[selected.category] || selected.category}</span>
                <span className="mc-tag src">{selected.source}</span>
                <span className="mc-tag">{nsFmtDate(selected.dt)} · {nsFmtTime(selected.dt)} WIB</span>
                {selected.surprise && <span className="ns-detail-surprise">{NS_SURPRISE_LABEL[selected.surprise] || selected.surprise}</span>}
                {selected.importance === 'high' && <span className="ns-tag-high">HIGH IMPACT</span>}
              </div>

              {/* orientation first: the single bear↔bull spectrum — score sits AT the needle */}
              <div className="ns-detail-spectrum">
                <SentSpectrum score={selected.net} big />
              </div>

              {selected.url
                ? <a className="ns-detail-title ns-detail-title--link" href={selected.url} target="_blank" rel="noopener noreferrer">{selected.headline} <span className="ns-ext">↗</span></a>
                : <div className="ns-detail-title">{selected.headline}</div>}

              {selected.summary && <p className="ns-detail-summary">{selected.summary}</p>}

              {selected.analysis && (
                <>
                  <div className="ns-detail-h">Where it leads</div>
                  <p className="ns-detail-analysis">{selected.analysis}</p>
                </>
              )}

              {selected.affects && selected.affects.length > 0 && (
                <>
                  <div className="ns-detail-h">Market impact</div>
                  <div className="ns-impact">
                    {selected.affects.map((a, i) => <ImpactRow key={i} a={a} />)}
                  </div>
                </>
              )}

              <div className="ns-detail-actions">
                {selected.url && <a className="sw-tf" href={selected.url} target="_blank" rel="noopener noreferrer">↗ Open source</a>}
                <button className="sw-tf" onClick={openSentiment}>◑ Open in Sentiment</button>
              </div>
            </div>
          ) : (
            <div className="mc-news-empty">Select an article to read.</div>
          )}
        </aside>
      </div>
    </section>
  );
};

window.MacroNews = MacroNews;
