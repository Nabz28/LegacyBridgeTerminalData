// ================================================================
// Macro · Sentiment engine panel  (window.MacroSentiment)
// Reads live macro.sentiment + macro.news from Supabase (Accept-Profile: macro)
// and renders the scored read: per-region composite, regime, data-vs-news
// split, and pillar breakdown. Methodology: docs/macro/SENTIMENT_ENGINE.md.
// Falls back to a graceful empty state if the engine hasn't published yet.
// ================================================================

// --- live macro reader (mirrors window.BRAIN, but on the `macro` schema) -----
const ML_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const ML_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const mlGet = (path) =>
  fetch(ML_BASE + path, { headers: { apikey: ML_ANON, Authorization: 'Bearer ' + ML_ANON, 'Accept-Profile': 'macro' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
window.MACRO_LIVE = {
  // latest snapshot per region
  sentiment: () => mlGet('/sentiment?select=*&order=ts.desc&limit=24').then((rows) => {
    const byRegion = {};
    for (const r of rows) if (!byRegion[r.region]) byRegion[r.region] = r;
    return byRegion;
  }),
  news: (limit) => mlGet('/news?select=*&order=ts.desc&limit=' + (limit || 60)),
};

const scoreColor = (v) => (v == null ? 'var(--text-tertiary)' : v > 12 ? 'var(--pos)' : v < -12 ? 'var(--neg)' : '#d8a13a');
const regimeColor = (rg) => ({
  Reflation: '#e0823a', Goldilocks: 'var(--pos)', Stagflation: 'var(--neg)',
  'Risk-off': 'var(--neg)', Disinflation: '#5B8DEF', Neutral: 'var(--text-tertiary)', Blend: '#9b87f5',
}[rg] || 'var(--text-tertiary)');

// Score gauge: a zero-centered bar, fill from middle toward the value.
const Gauge = ({ value }) => {
  const v = Math.max(-100, Math.min(100, value || 0));
  const pct = Math.abs(v) / 2;            // 0..50 (% of half-track)
  const col = scoreColor(v);
  return (
    <div style={{ position: 'relative', height: 6, background: 'var(--bg-elevated, #1a1d24)', borderRadius: 3, margin: '6px 0' }}>
      <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--border, #2a2e37)' }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, borderRadius: 3, background: col,
        left: v >= 0 ? '50%' : (50 - pct) + '%', width: pct + '%',
      }} />
    </div>
  );
};

const PillarBar = ({ label, v, cov }) => {
  const has = v != null;
  const pct = has ? Math.abs(v) * 50 : 0;
  const col = !has ? 'var(--text-tertiary)' : v > 0.08 ? 'var(--pos)' : v < -0.08 ? 'var(--neg)' : '#d8a13a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0', fontSize: 11 }}>
      <span style={{ width: 78, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ flex: 1, position: 'relative', height: 5, background: 'var(--bg-elevated,#1a1d24)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border,#2a2e37)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 3, background: col, left: has && v >= 0 ? '50%' : (50 - pct) + '%', width: pct + '%' }} />
      </div>
      <span style={{ width: 30, textAlign: 'right', color: col, fontVariantNumeric: 'tabular-nums' }}>{has ? (v >= 0 ? '+' : '') + v.toFixed(2) : '—'}</span>
      {cov && <span style={{ width: 26, textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 9 }}>{cov}</span>}
    </div>
  );
};

const MacroSentiment = () => {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(false);
  const [sel, setSel] = React.useState('US');
  const ORDER = ['Global', 'US', 'ID', 'CN'];

  React.useEffect(() => {
    let live = true;
    window.MACRO_LIVE.sentiment().then((d) => { if (live) setData(d); }).catch(() => { if (live) setErr(true); });
    return () => { live = false; };
  }, []);

  if (err) return (
    <section className="mc-section">
      <div className="mc-section-h"><span>Macro · Sentiment</span></div>
      <div className="mc-news-empty" style={{ padding: 24 }}>Sentiment engine offline — could not reach the data service.</div>
    </section>
  );
  if (!data) return (
    <section className="mc-section">
      <div className="mc-section-h"><span>Macro · Sentiment</span><span className="mc-section-h-sub">loading engine…</span></div>
    </section>
  );

  const regions = ORDER.filter((r) => data[r]);
  if (!regions.length) return (
    <section className="mc-section">
      <div className="mc-section-h"><span>Macro · Sentiment</span></div>
      <div className="mc-news-empty" style={{ padding: 24 }}>No sentiment snapshot yet — the autonomous engine publishes every 6h (08:00 / 14:00 / 20:00 WIB).</div>
    </section>
  );

  const cur = data[sel] || data[regions[0]];
  const comp = cur.components || {};
  const pillars = comp.pillars || {};
  const cov = comp.coverage || {};
  const asof = cur.ts ? new Date(cur.ts) : null;
  const PILL = [['growth', 'Growth'], ['labor', 'Labor'], ['inflation', 'Inflation'], ['liquidity', 'Liquidity'], ['external', 'External']];

  return (
    <section className="mc-section mc-sentiment">
      <div className="mc-section-h">
        <span>Macro · Sentiment engine</span>
        <span className="mc-section-h-sub">
          data + news blend · regime model · {asof ? asof.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} · scored −100…+100
        </span>
      </div>

      {/* region scorecards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${regions.length}, 1fr)`, gap: 10, padding: '4px 0 12px' }}>
        {regions.map((r) => {
          const d = data[r];
          const on = r === sel;
          return (
            <button key={r} onClick={() => setSel(r)} className="mc-card" style={{
              textAlign: 'left', cursor: 'pointer', padding: 12, border: on ? '1px solid var(--accent,#5B8DEF)' : '1px solid var(--border,#2a2e37)',
              background: on ? 'var(--bg-elevated,#1a1d24)' : 'transparent', borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{r}</span>
                <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 4, color: regimeColor(d.regime), border: '1px solid currentColor' }}>{d.regime}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor(d.composite), fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {d.composite >= 0 ? '+' : ''}{d.composite}
              </div>
              <Gauge value={d.composite} />
              <div style={{ display: 'flex', gap: 10, fontSize: 9.5, color: 'var(--text-tertiary)' }}>
                <span>data <b style={{ color: scoreColor(d.data_score) }}>{d.data_score >= 0 ? '+' : ''}{d.data_score}</b></span>
                <span>news <b style={{ color: d.news_score == null ? 'var(--text-tertiary)' : scoreColor(d.news_score) }}>{d.news_score == null ? '—' : (d.news_score >= 0 ? '+' : '') + d.news_score}</b></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* selected region detail */}
      <div className="mc-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div className="mc-card-h" style={{ padding: 0 }}>{sel} · pillar breakdown</div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>G {comp.G >= 0 ? '+' : ''}{comp.G} · I {comp.I >= 0 ? '+' : ''}{comp.I} · {comp.n_news || 0} news (48h)</span>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{cur.headline}</p>
        {sel === 'Global'
          ? <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>GDP-weighted blend of US / CN / ID composites.</div>
          : PILL.map(([k, lbl]) => <PillarBar key={k} label={lbl} v={pillars[k]} cov={cov[k]} />)}
        <div style={{ marginTop: 10, fontSize: 9.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Signed pillar scores (−1…+1). Coverage shows indicators with data / mapped. Positive = risk-on / growth-supportive / easing.
          Full methodology &amp; audit trail in <code>docs/macro/SENTIMENT_ENGINE.md</code>.
        </div>
      </div>
    </section>
  );
};

window.MacroSentiment = MacroSentiment;
