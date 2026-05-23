// ================================================================
// NewsPro — live company news via GDELT (keyless, CORS-enabled). Yahoo's news
// search returns US-only results for IDX names, so GDELT is the realistic free
// path for Indonesian coverage. window.StockNewsPro.
// ================================================================
(function () {
  const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';

  function gdeltDate(s) {
    // "20260520T120000Z" → Date
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s || '');
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }
  const ago = (d) => {
    if (!d) return '';
    const h = (Date.now() - d.getTime()) / 36e5;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm';
    if (h < 24) return Math.round(h) + 'h';
    return Math.round(h / 24) + 'd';
  };

  const StockNewsPro = ({ symbol = 'BBCA' }) => {
    const [articles, setArticles] = React.useState(null);
    const [err, setErr] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [reload, setReload] = React.useState(0);

    const name = React.useMemo(() => {
      const u = (window.IDX_UNIVERSE || []).find(s => s.sym === symbol);
      return u ? u.name.replace(/\s*\(.*?\)\s*/g, '').trim() : symbol;
    }, [symbol]);

    React.useEffect(() => {
      let alive = true; setLoading(true); setErr(null); setArticles(null);
      const q = encodeURIComponent(`"${name}"`);
      const url = `${GDELT}?query=${q}&mode=artlist&format=json&maxrecords=40&sort=datedesc&timespan=6m`;
      fetch(url)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('GDELT ' + r.status)))
        .then(j => {
          if (!alive) return;
          const arts = (j.articles || []).map(a => ({
            url: a.url, title: a.title, domain: a.domain,
            country: a.sourcecountry, lang: a.language,
            date: gdeltDate(a.seendate),
          })).filter(a => a.title && a.url);
          // Prefer Indonesian-source coverage (cleaner relevance for IDX names);
          // fall back to all results if there isn't enough local coverage.
          const idn = arts.filter(a => (a.country || '').toLowerCase().includes('indonesia'));
          setArticles(idn.length >= 5 ? idn : arts);
        })
        .catch(e => { if (alive) setErr(e.message || 'news unavailable'); })
        .finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, [name, reload]);

    if (loading) return <div className="sw-section"><div className="risk-msg">Loading news for {name}… <span className="dim">(GDELT can take ~10s)</span></div></div>;
    if (err) return <div className="sw-section"><div className="risk-msg">News unavailable: {err} <button className="fin-btn" onClick={() => setReload(r => r + 1)}>↻ Retry</button></div></div>;
    if (!articles || !articles.length) return <div className="sw-section"><div className="risk-msg">No recent news found for "{name}".</div></div>;

    return (
      <div className="sw-section">
        <div className="risk-head" style={{ marginBottom: 8 }}>
          <div>
            <span className="prov-badge live"><span className="prov-dot" />LIVE</span>
            <span className="risk-src">{articles.length} articles · GDELT · "{name}" · last 6 months</span>
          </div>
        </div>
        <ul className="news-feed">
          {articles.map((a, i) => (
            <li key={i} className="news-row">
              <span className="news-time">{ago(a.date)}</span>
              <a className="news-title" href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
              <span className="news-src">{a.domain}{a.country ? ' · ' + a.country : ''}</span>
            </li>
          ))}
        </ul>
        <div className="risk-foot">Source: GDELT Doc API (keyless, global news index). Coverage favors larger/English-covered names; thin for micro-caps.</div>
      </div>
    );
  };
  window.StockNewsPro = StockNewsPro;
})();
