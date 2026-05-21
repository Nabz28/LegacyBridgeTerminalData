// ================================================================
// Today's Brief — editorial morning briefing
// ----------------------------------------------------------------
// Renders inside the news widget on the Markets dashboard.
// Hierarchy: 1 lead story (Jakarta) + 2 smaller supporting briefs
// (New York, Global) stacked beside it. Each card carries region,
// timestamp, source attribution pills, and sentiment.
// ================================================================

const DailyBrief = ({ embedded = false }) => {
  const B = window.DATA_EXT.AI_BRIEF;

  const lead = {
    id: 'id',
    region: 'Jakarta',
    locale: 'WIB',
    time: '14:58',
    data: B.id,
  };
  const supp = [
    { id: 'us',     region: 'New York', locale: 'EDT pre-market', time: '04:00', data: B.us },
    { id: 'global', region: 'Global',   locale: 'Macro mix',      time: '14:32', data: B.global },
  ];

  const sentimentWord = (s) => {
    if (s.bull >= 0.50) return { word: 'Bullish',     tone: 'pos' };
    if (s.bear >= 0.40) return { word: 'Bearish',     tone: 'neg' };
    if (Math.abs(s.bull - s.bear) < 0.10) return { word: 'Mixed', tone: 'flat' };
    return s.bull > s.bear
      ? { word: 'Constructive', tone: 'pos' }
      : { word: 'Cautious',     tone: 'neg' };
  };

  const Card = ({ entry, lead }) => {
    const sent = sentimentWord(entry.data.sentiment);
    const net  = Math.round((entry.data.sentiment.bull - entry.data.sentiment.bear) * 100);
    const tickPct = ((net + 100) / 200) * 100;
    const sources = entry.data.sources || [];

    const visiblePills = sources.slice(0, lead ? 3 : 3);
    const hiddenPills  = sources.length - visiblePills.length;

    const related = lead && entry.data.related ? entry.data.related : null;

    return (
      <article className={`db-card ${lead ? 'db-card--lead' : 'db-card--supp'}`}>
        <header className="db-card__head">
          <span className="db-card__region">{entry.region}</span>
          <span className="db-card__time">
            {entry.time} <span className="db-card__locale">{entry.locale}</span>
          </span>
        </header>

        <h2 className="db-card__headline">{entry.data.headline}</h2>

        {lead && <p className="db-card__lede">{entry.data.body}</p>}

        <ul className="db-card__points">
          {entry.data.bullets.slice(0, lead ? 3 : 3).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>

        {related && (
          <div className="db-related">
            <div className="db-related__rule">
              <span className="db-related__title">Compiled from</span>
              <span className="db-related__line" />
              <button type="button" className="db-related__more">See all news →</button>
            </div>
            <ul className="db-related__grid">
              {related.map((r, i) => {
                const sent = r.sentiment || { tone: 'flat', label: 'Mixed', net: 0 };
                return (
                  <li key={i} className="db-mini">
                    <div className="db-mini__thumb">
                      {r.img && (
                        <img
                          src={r.img}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <span className="db-mini__source">{r.source}</span>
                      <span className={`db-mini__sent db-mini__sent--${sent.tone}`}>
                        <span className="db-mini__sent-dot" />
                        {sent.label}
                        <span className="db-mini__sent-net">{sent.net >= 0 ? '+' : ''}{sent.net}</span>
                      </span>
                    </div>
                    <div className="db-mini__body">
                      <h3 className="db-mini__headline">{r.headline}</h3>
                      <p className="db-mini__summary">{r.summary || r.blurb}</p>
                      <div className="db-mini__foot">
                        <span className="db-mini__time">{r.time} WIB</span>
                        <button type="button" className="db-mini__open" aria-label="Open story">Open →</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <footer className="db-card__foot">
          <div className={`db-card__sent-row db-card__sent-row--${sent.tone}`}>
            <span className="db-card__sent-word">{sent.word.toUpperCase()}</span>
            <span className="db-card__sent-track" aria-hidden="true">
              <span className="db-card__sent-fill" style={{ width: `${tickPct}%` }} />
              <span className="db-card__sent-tick" style={{ left: `${tickPct}%` }} />
            </span>
            <span className="db-card__sent-net">{net >= 0 ? '+' : ''}{net}</span>
          </div>
          <div className="db-card__sources">
            <span className="db-card__sources-count">
              Compiled from {entry.data.sentiment.n.toLocaleString()} sources
            </span>
            <ul className="db-card__source-pills">
              {visiblePills.map(src => (
                <li key={src} className="db-card__pill">{src}</li>
              ))}
              {hiddenPills > 0 && <li className="db-card__pill db-card__pill--more">+{hiddenPills}</li>}
            </ul>
          </div>
        </footer>
      </article>
    );
  };

  return (
    <section className={`db-strip ${embedded ? 'db-strip--embedded' : ''}`} aria-label="Today's Brief">
      {!embedded && (
        <div className="db-strip__rule" aria-hidden="true">
          <span className="db-strip__title">Today’s Brief</span>
          <span className="db-strip__line" />
          <span className="db-strip__date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
      <div className="db-strip__grid">
        <Card entry={lead} lead={true} />
        <div className="db-strip__supp">
          {supp.map(e => <Card key={e.id} entry={e} lead={false} />)}
        </div>
      </div>
    </section>
  );
};

window.DailyBrief      = DailyBrief;
window.DailyBriefStrip = DailyBrief;  // back-compat
window.AIBriefStrip    = DailyBrief;  // back-compat

// ================================================================
// SentimentChip — uniform pill used by news lists, mini cards,
// brief lead. Tone: 'pos' | 'neg' | 'flat'. Net: -100..+100.
// ================================================================
window.SentimentChip = ({ tone = 'flat', label, net }) => {
  const labelText = label || (tone === 'pos' ? 'Bullish' : tone === 'neg' ? 'Bearish' : 'Mixed');
  return (
    <span className={`db-mini__sent db-mini__sent--${tone}`}>
      <span className="db-mini__sent-dot" />
      {labelText}
      {typeof net === 'number' && (
        <span className="db-mini__sent-net">{net >= 0 ? '+' : ''}{net}</span>
      )}
    </span>
  );
};
