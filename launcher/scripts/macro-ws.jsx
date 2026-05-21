// ================================================================
// Macro Workspace — router shell + dashboard landing
// Five routes:
//   dashboard   — RegimeBand + HeroGrid + NewsAndSentiment (this file)
//   news        — window.MacroNews        (scripts/macro-news.jsx)
//   data        — window.MacroData        (scripts/macro-data.jsx)
//   connections — window.MacroConnections (scripts/macro-connections.jsx)
//   map         — window.MacroMap         (scripts/macro-map.jsx)
//
// Shared fixtures (regime, hero, news, graph nodes/edges) are exposed
// on window.MACRO_DATA so the sub-page files can read them without
// duplication.
// ================================================================

const MACRO_REGIME_SUMMARY = {
  ID: 'Cut cycle in motion · IHSG defensive rotation · Rupiah firm at 15,820',
  US: 'Fed pause holding · mega-cap leadership · 2y-10y bear-steepens',
};

const MACRO_HERO = [
  { id: 'cpi_us',  label: 'US CPI YoY',         val: '3.2',   unit: '%',  chg: -0.1, ai: 'Disinflation glide path intact — services sticky',  sent: 'pos',  region: 'US' },
  { id: 'cpi_id',  label: 'Indonesia CPI YoY',  val: '2.6',   unit: '%',  chg: -0.2, ai: 'Within BI corridor; rate-cut window wide open',     sent: 'pos',  region: 'ID' },
  { id: 'fed',     label: 'Fed Funds (mid)',    val: '4.875', unit: '%',  chg: 0,    ai: 'No move expected · 2 cuts priced H2',               sent: 'flat', region: 'US' },
  { id: 'bi',      label: 'BI 7DRR',            val: '5.75',  unit: '%',  chg: 0,    ai: '25 bps cut majority view at next meeting',          sent: 'pos',  region: 'ID' },
  { id: 'idr',     label: 'USD/IDR',            val: '15,820',unit: '',   chg: -0.3, ai: 'Reserves at 8.4mo import cover',                    sent: 'pos',  region: 'ID' },
  { id: 'wti',     label: 'WTI Crude',          val: '78.4',  unit: '$',  chg: 1.2,  ai: 'Geopolitical premium re-engaged',                   sent: 'flat', region: 'World' },
  { id: 'newc',    label: 'Newcastle Coal',     val: '142.8', unit: '$',  chg: -2.1, ai: 'China inventories build · BYAN/ADRO drag',          sent: 'neg',  region: 'World' },
  { id: 'cny',     label: 'USD/CNY',            val: '7.18',  unit: '',   chg: 0.04, ai: 'PBOC fix steady — managed depreciation',            sent: 'flat', region: 'World' },
];

const MACRO_NEWS_FIXTURES = [
  { id: 1, region: 'US',     time: '04:12', source: 'Bloomberg', sent: 'pos', net: 41, headline: 'US labor data soft enough to keep cuts on the table — services payrolls slow', summary: 'April nonfarm came in at 175K vs 240K consensus, with services payrolls decelerating sharply for the third consecutive month.', impact: 'Rate-cut window widens; rate-sensitive equities tilted bullish over 30d horizon.' },
  { id: 2, region: 'ID',     time: '13:54', source: 'Kontan',    sent: 'pos', net: 56, headline: 'Indonesia trade surplus widens to USD 4.2B — coal volume offsets price softness', summary: 'Export volumes from BYAN, ADRO and ITMG offset Newcastle weakness; non-oil/gas surplus at 18-month high.', impact: 'Rupiah supportive; BI cut probability rises to 71% on poll.' },
  { id: 3, region: 'World',  time: '11:08', source: 'Reuters',   sent: 'flat',net: 8,  headline: 'PBOC sets USD/CNY fix steady — signals patience on stimulus pace', summary: 'Mid-point fix held within 5 pip range for fifth session; market read as China defending pace, not direction.', impact: 'EM FX bid; commodity-sensitive rotation paused.' },
  { id: 4, region: 'US',     time: '09:42', source: 'WSJ',       sent: 'neg', net: -22,headline: 'Sticky services CPI flagged by Fed staff — pivot debate intensifies', summary: 'Internal Fed staff memo (leaked) suggests services CPI ex-housing remains 4.1% — well above 2% target trajectory.', impact: 'Long-end yields lift; tech multiples vulnerable to repricing.' },
  { id: 5, region: 'ID',     time: '08:30', source: 'Bisnis',    sent: 'pos', net: 33, headline: 'BI poll — 71% of economists expect 25bp cut at next meeting',           summary: 'Rapid consensus shift after softer-than-expected CPI; rates curve bull-steepens.', impact: 'IDR bonds outperform; banks index +1.8% on the session.' },
  { id: 6, region: 'World',  time: '07:14', source: 'FT',        sent: 'neg', net: -18,headline: 'Newcastle coal benchmark slips below USD 143/t on China demand softness', summary: 'Stockpile builds at major Chinese ports continue; producers BYAN/ADRO/ITMG reactive.', impact: 'Coal miners broadly red; integrated names with low strip ratios best positioned.' },
];

const MACRO_GRAPH_NODES = [
  { id: 'fed',    label: 'Fed Funds',  x: 0.20, y: 0.30, r: 22, group: 'rates' },
  { id: 'us10y',  label: 'US 10Y',     x: 0.32, y: 0.18, r: 18, group: 'rates' },
  { id: 'dxy',    label: 'DXY',        x: 0.45, y: 0.25, r: 16, group: 'fx' },
  { id: 'sp500',  label: 'S&P 500',    x: 0.30, y: 0.55, r: 22, group: 'eq' },
  { id: 'btc',    label: 'BTC',        x: 0.55, y: 0.65, r: 14, group: 'risk' },
  { id: 'cpi_us', label: 'US CPI',     x: 0.10, y: 0.60, r: 18, group: 'macro' },
  { id: 'wti',    label: 'WTI',        x: 0.62, y: 0.40, r: 16, group: 'comm' },
  { id: 'newc',   label: 'Newcastle',  x: 0.74, y: 0.52, r: 14, group: 'comm' },
  { id: 'idr',    label: 'USD/IDR',    x: 0.70, y: 0.20, r: 14, group: 'fx' },
  { id: 'bi',     label: 'BI 7DRR',    x: 0.85, y: 0.30, r: 16, group: 'rates' },
  { id: 'ihsg',   label: 'IHSG',       x: 0.85, y: 0.55, r: 18, group: 'eq' },
  { id: 'gold',   label: 'Gold',       x: 0.40, y: 0.78, r: 16, group: 'comm' },
  { id: 'vix',    label: 'VIX',        x: 0.18, y: 0.85, r: 12, group: 'risk' },
];
const MACRO_GRAPH_EDGES = [
  ['fed','us10y',0.85],['us10y','dxy',0.62],['dxy','sp500',-0.55],['fed','sp500',-0.40],
  ['cpi_us','fed',0.78],['us10y','idr',0.45],['idr','bi',0.30],['bi','ihsg',-0.55],
  ['wti','newc',0.68],['newc','ihsg',-0.42],['gold','vix',0.30],
  ['btc','sp500',0.50],['sp500','vix',-0.72],['dxy','gold',-0.62],
];

// Expose shared fixtures to sibling sub-page files.
window.MACRO_DATA = {
  REGIME_SUMMARY: MACRO_REGIME_SUMMARY,
  HERO:           MACRO_HERO,
  NEWS_FIXTURES:  MACRO_NEWS_FIXTURES,
  GRAPH_NODES:    MACRO_GRAPH_NODES,
  GRAPH_EDGES:    MACRO_GRAPH_EDGES,
};

// ----------------------------------------------------------------
// Dashboard — MacroThesis + RegimeBand + HeroGrid + NewsAndSentiment
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// MacroThesis — the opening band of the Dashboard
// Magazine-grade lede with three quantified signals + an AI-style
// paragraph + a "what changed in the last 4h" diff strip. This is
// the section that gives the dashboard a *thesis*, not just data.
// ----------------------------------------------------------------
const MACRO_THESIS_DIFFS = [
  {
    dir: 'pos',
    headline: 'BI cut probability heightened to 71%',
    from: '64%', to: '71%',
    why: 'A decisive shift in rate-cut expectations strengthens liquidity outlook and risk appetite for Indonesian assets.',
    tag: 'Risk-on signal',
    spark: [62, 62.4, 63, 63.2, 63.5, 63.4, 63.8, 64, 64.2, 64.6, 65, 65.5, 66.2, 67, 67.6, 68.1, 68.4, 68.9, 69.3, 69.8, 70.2, 70.6, 70.8, 71],
  },
  {
    dir: 'neg',
    headline: 'Newcastle coal fell $1.7',
    from: '$144.9', to: '$142.8',
    why: 'Coal softness weakens export earnings expectations and pressures Indonesia commodity sentiment.',
    tag: 'Commodity pressure',
    spark: [145.2, 145.1, 144.9, 144.9, 144.8, 144.7, 144.6, 144.5, 144.4, 144.2, 144.0, 143.8, 143.7, 143.6, 143.5, 143.4, 143.3, 143.2, 143.1, 143.0, 142.95, 142.9, 142.85, 142.8],
  },
  {
    dir: 'pos',
    headline: 'IDR strengthened to 15,820',
    from: '15,855', to: '15,820',
    why: 'A stronger rupiah improves external stability and reduces imported inflation pressure.',
    tag: 'Macro support',
    // Spark is inverted (lower USD/IDR = stronger IDR) so we plot -value to read as "up = strengthening".
    spark: [-15860, -15858, -15856, -15855, -15853, -15850, -15848, -15845, -15842, -15840, -15838, -15835, -15832, -15830, -15828, -15826, -15825, -15824, -15823, -15822, -15821, -15820, -15820, -15820],
  },
  {
    dir: 'neg',
    headline: 'Mag-7 breadth worsened to 4 of 7',
    from: '6 of 7', to: '4 of 7',
    why: 'Narrower US leadership increases volatility risk and weakens global risk appetite confirmation.',
    tag: 'Breadth warning',
    spark: [6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4],
  },
];

const MacroThesis = () => {
  // Recompute the lede's quantified signals from the live fixtures.
  const news = MACRO_NEWS_FIXTURES;
  const bull = news.filter(n => n.sent === 'pos').length;
  const bear = news.filter(n => n.sent === 'neg').length;
  const total = Math.max(news.length, 1);
  const sentimentNet = Math.round(((bull - bear) / total) * 100);
  const regimeScore = 64; // mock — "cut cycle in motion" composite
  const surpriseIdx = 0.42; // mock — "macro surprise index"

  return (
    <section className="mc-thesis">
      <div className="mc-thesis-grid">
        <div className="mc-thesis-eyebrow">
          <span className="mc-thesis-eyebrow-label">Macro Lab</span>
          <span className="mc-thesis-eyebrow-sep" />
          <span>Daily thesis</span>
          <span className="mc-thesis-eyebrow-sep" />
          <span>Updated 14:32 WIB</span>
        </div>

        <h1 className="mc-thesis-headline">
          <span>Cut cycle is no longer hypothesis — it's </span>
          <span className="mc-thesis-pos">consensus</span>
          <span>. Coal pricing power keeps fading; tape sentiment leans </span>
          <span className="mc-thesis-pos">+{sentimentNet}</span>
          <span> on softer US services prints.</span>
        </h1>

        <p className="mc-thesis-body">
          The 24h tape paints a coherent picture: <b>71% of the BI poll now expects a cut at the next meeting</b>,
          confirmed by a trade-surplus print that read through coal-price softness via volume. US side, the
          services payroll deceleration takes the rate-cut window from "possible" to "priced". Sticky-services
          CPI (Fed staff memo, leaked) is the one cross-current. Watch China stimulus communications and the
          next Newcastle benchmark for regime confirmation.
        </p>

        <div className="mc-thesis-stats">
          <div className="mc-thesis-stat">
            <div className="mc-thesis-stat-label">Regime score · ID</div>
            <div className="mc-thesis-stat-value pos">{regimeScore}<span>/100</span></div>
            <div className="mc-thesis-stat-sub">cut cycle · risk-on tilt</div>
          </div>
          <div className="mc-thesis-stat">
            <div className="mc-thesis-stat-label">Sentiment net · 24h</div>
            <div className={`mc-thesis-stat-value ${sentimentNet >= 0 ? 'pos' : 'neg'}`}>{sentimentNet >= 0 ? '+' : ''}{sentimentNet}</div>
            <div className="mc-thesis-stat-sub">{bull} bull · {bear} bear · {total - bull - bear} mixed</div>
          </div>
          <div className="mc-thesis-stat">
            <div className="mc-thesis-stat-label">Macro surprise · US</div>
            <div className={`mc-thesis-stat-value ${surpriseIdx >= 0 ? 'pos' : 'neg'}`}>{surpriseIdx >= 0 ? '+' : ''}{surpriseIdx.toFixed(2)}σ</div>
            <div className="mc-thesis-stat-sub">labor cooler · CPI sticky</div>
          </div>
        </div>

        <div className="mc-thesis-diffs">
          <div className="mc-thesis-diffs-label">What changed · last 4h</div>
          <ul className="mc-thesis-diffs-list">
            {MACRO_THESIS_DIFFS.map((d, i) => {
              const Spark = window.Spark;
              const arrow = d.dir === 'pos' ? '▲' : '▼';
              const sparkColor = d.dir === 'pos' ? 'var(--pos)' : 'var(--neg)';
              return (
                <li key={i} className={`mc-diff-card mc-diff-card--${d.dir}`}>
                  <span className={`mc-diff-card-icon ${d.dir}`}>{arrow}</span>
                  <div className="mc-diff-card-body">
                    <div className="mc-diff-card-headline">{d.headline}</div>
                    <div className="mc-diff-card-meta">
                      <span className="mc-diff-card-delta">
                        <span className="mc-diff-card-from">{d.from}</span>
                        <span className="mc-diff-card-arrow">→</span>
                        <span className={`mc-diff-card-to ${d.dir}`}>{d.to}</span>
                      </span>
                      <span className={`mc-diff-card-tag ${d.dir}`}>{d.tag}</span>
                    </div>
                    <p className="mc-diff-card-why">{d.why}</p>
                  </div>
                  <div className={`mc-diff-card-spark ${d.dir}`}>
                    {Spark && <Spark data={d.spark} color={sparkColor} w={88} h={32} fill={false} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

const RegimeBand = ({ region, setRegion }) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <section className="mc-regime-shell">
      <header className="mc-regime-head">
        <div className="mc-regime-eyebrow">Macro Lab · Regime snapshot</div>
        <div className="mc-regime-date">{today} · 14:32 WIB</div>
      </header>
      <div className="mc-regime-cards">
        <article className="mc-regime-card mc-regime-card--id">
          <div className="mc-regime-card-h">
            <span className="mc-regime-card-tag">Indonesia</span>
            <span className="mc-regime-card-state">Cut cycle</span>
          </div>
          <h3 className="mc-regime-card-headline">{MACRO_REGIME_SUMMARY.ID}</h3>
          <ul className="mc-regime-card-points">
            <li>BI 7DRR <b>5.75%</b> · 25 bp cut majority view at next meeting</li>
            <li>Reserves <b>8.4 mo</b> import cover · IDR firm at 15,820</li>
            <li>IHSG defensive rotation · banks index +2.4% MTD</li>
          </ul>
        </article>
        <article className="mc-regime-card mc-regime-card--us">
          <div className="mc-regime-card-h">
            <span className="mc-regime-card-tag">United States</span>
            <span className="mc-regime-card-state">Fed pause</span>
          </div>
          <h3 className="mc-regime-card-headline">{MACRO_REGIME_SUMMARY.US}</h3>
          <ul className="mc-regime-card-points">
            <li>Fed Funds <b>4.875%</b> · 2 cuts priced H2 (services CPI sticky)</li>
            <li>2y-10y curve <b>+38bp</b> · bear-steepening into pivot</li>
            <li>Mega-cap leadership · Mag-7 +5.2% MTD vs equal-weight +1.1%</li>
          </ul>
        </article>
        <article className="mc-regime-card mc-regime-card--filter">
          <div className="mc-regime-card-h">
            <span className="mc-regime-card-tag">View</span>
          </div>
          <div className="mc-region-tabs">
            {[['both','Both regions'],['ID','Indonesia only'],['US','US only']].map(([k, l]) => (
              <button key={k} className={`mc-region-tab ${region === k ? 'is-on' : ''}`} onClick={() => setRegion(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="mc-regime-card-foot">
            <span>Sources</span>
            <span>· Bloomberg · Reuters · Kontan · IndoBERT · IDX · BI · Fed</span>
          </div>
        </article>
      </div>
    </section>
  );
};

// HeroGrid — Magazine-grade composition: one oversized LEAD card
// (today's biggest move) + 7 compact rest-cards in a strip. User can
// click any rest-card to promote it to the lead position.
const HeroGrid = ({ region }) => {
  const Spark = window.Spark;
  const items = MACRO_HERO.filter(h => region === 'both' || h.region === region || h.region === 'World');
  // Default lead = biggest absolute move; user can pin a different one
  const defaultLeadId = items.slice().sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))[0]?.id;
  const [leadId, setLeadId] = React.useState(defaultLeadId);
  React.useEffect(() => { if (defaultLeadId) setLeadId(defaultLeadId); /* re-pick when region changes */ }, [defaultLeadId]);

  const lead = items.find(h => h.id === leadId) || items[0];
  const rest = items.filter(h => h.id !== (lead && lead.id));

  const buildSeries = (h) => Array.from({ length: 40 }, (_, i) =>
    Math.sin(i * 0.42 + h.id.length) * 2 + parseFloat(String(h.val).replace(/,/g, '')) * (1 + Math.sin(i * 0.31) * 0.012)
  );

  return (
    <section className="mc-section mc-hero-section">
      <div className="mc-section-h">
        <span>Key indicators</span>
        <span className="mc-section-h-sub">{items.length} of {MACRO_HERO.length} · live · 14:32 WIB · click any card to promote</span>
      </div>

      <div className="mc-hero-layout">
        {/* LEAD — oversized, rich annotation */}
        {lead && (
          <article className={`mc-hero-lead mc-hero-lead--${lead.sent}`}>
            <div className="mc-hero-lead-eyebrow">
              <span className="mc-hero-lead-eyebrow-label">Today's lead</span>
              <span className="mc-hero-lead-sep" />
              <span>{lead.region === 'US' ? 'United States' : lead.region === 'ID' ? 'Indonesia' : 'Global'}</span>
              <span className="mc-hero-lead-sep" />
              <span>14:32 WIB</span>
            </div>
            <div className="mc-hero-lead-title">{lead.label}</div>
            <div className="mc-hero-lead-val">
              {lead.unit === '$' && <span className="mc-hero-lead-unit">{lead.unit}</span>}
              {lead.val}
              {lead.unit && lead.unit !== '$' && <span className="mc-hero-lead-unit">{lead.unit}</span>}
              <span className={`mc-hero-lead-chg ${lead.chg > 0 ? 'pos' : lead.chg < 0 ? 'neg' : 'flat'}`}>
                {lead.chg > 0 ? '▲ +' : lead.chg < 0 ? '▼ ' : '◆ '}{lead.chg.toFixed(2)}
              </span>
            </div>
            <div className="mc-hero-lead-spark">
              <Spark data={buildSeries(lead)} color={lead.chg >= 0 ? 'var(--pos)' : 'var(--neg)'} w={520} h={72} fill={true} />
            </div>
            <ul className="mc-hero-lead-substats">
              <li><span>vs week</span><b className={lead.chg >= 0 ? 'pos' : 'neg'}>{lead.chg >= 0 ? '+' : ''}{(lead.chg * 1.4).toFixed(2)}</b></li>
              <li><span>vs month</span><b className={lead.chg >= 0 ? 'pos' : 'neg'}>{lead.chg >= 0 ? '+' : ''}{(lead.chg * 3.1).toFixed(2)}</b></li>
              <li><span>vs ytd</span><b className={lead.chg >= 0 ? 'pos' : 'neg'}>{lead.chg >= 0 ? '+' : ''}{(lead.chg * 6.8).toFixed(2)}</b></li>
              <li><span>3M σ</span><b>{(0.8 + Math.abs(lead.chg) * 0.5).toFixed(2)}</b></li>
            </ul>
            <div className="mc-hero-lead-ai">
              <span className="mc-hero-lead-ai-rule" />
              <span>{lead.ai}</span>
            </div>
          </article>
        )}

        {/* REST — compact strip */}
        <div className="mc-hero-rest">
          {rest.map(h => {
            const series = buildSeries(h);
            return (
              <button
                key={h.id}
                className={`mc-hero-mini mc-hero-mini--${h.sent}`}
                onClick={() => setLeadId(h.id)}
                title={`Promote ${h.label} to lead`}
              >
                <div className="mc-hero-mini-h">
                  <span className="mc-hero-mini-label">{h.label}</span>
                  <span className={`mc-hero-mini-chg ${h.chg > 0 ? 'pos' : h.chg < 0 ? 'neg' : 'flat'}`}>{h.chg > 0 ? '+' : ''}{h.chg.toFixed(2)}</span>
                </div>
                <div className="mc-hero-mini-val">
                  {h.unit === '$' && <span className="mc-hero-mini-unit">{h.unit}</span>}
                  {h.val}
                  {h.unit && h.unit !== '$' && <span className="mc-hero-mini-unit">{h.unit}</span>}
                </div>
                <div className="mc-hero-mini-spark">
                  <Spark data={series} color={h.chg >= 0 ? 'var(--pos)' : 'var(--neg)'} w={170} h={20} fill={false} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const NewsAndSentiment = ({ region }) => {
  const [open, setOpen] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const items = MACRO_NEWS_FIXTURES.filter(n =>
    (region === 'both' || n.region === region || n.region === 'World') &&
    (filter === 'all' || n.region.toLowerCase() === filter)
  );
  const bull = items.filter(n => n.sent === 'pos').length;
  const bear = items.filter(n => n.sent === 'neg').length;
  const flat = items.filter(n => n.sent === 'flat').length;
  const total = items.length || 1;

  return (
    <section className="mc-section mc-news-section">
      <div className="mc-section-h"><span>Macro news feed</span><span className="mc-section-h-sub">last 24h · IndoBERT + GPT sentiment</span></div>
      <div className="mc-news-layout">
        <div className="mc-news-feed">
          <div className="mc-news-tabs">
            {['all','us','id','world'].map(f => (
              <button key={f} className={`mc-news-tab ${filter === f ? 'is-on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f.toUpperCase()}</button>
            ))}
            <div className="mc-news-search"><input placeholder="Search headlines, regions, sources…" /></div>
          </div>
          <ul className="nf-feed">
            {items.map(n => (
              <li key={n.id} className={`nf-row is-${n.sent}`} onClick={() => setOpen(n)} style={{ cursor: 'pointer' }}>
                <span className="nf-row__time">{n.time}</span>
                <span className="nf-row__source">{n.source}</span>
                <span className="nf-row__headline">
                  <span style={{ marginRight: 8, color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em' }}>{n.region}</span>
                  {n.headline}
                </span>
                <span className={`db-mini__sent db-mini__sent--${n.sent}`}>
                  <span className="db-mini__sent-dot" />
                  {n.sent === 'pos' ? 'Bull' : n.sent === 'neg' ? 'Bear' : 'Mixed'}
                  <span className="db-mini__sent-net">{n.net >= 0 ? '+' : ''}{n.net}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="mc-sent-summary">
          <div className="mc-sent-h">Sentiment summary</div>
          <div className="mc-sent-bar">
            <span className="mc-sent-seg pos" style={{ width: `${(bull / total) * 100}%` }} title={`Bullish ${bull}`} />
            <span className="mc-sent-seg flat" style={{ width: `${(flat / total) * 100}%` }} title={`Mixed ${flat}`} />
            <span className="mc-sent-seg neg" style={{ width: `${(bear / total) * 100}%` }} title={`Bearish ${bear}`} />
          </div>
          <ul className="mc-sent-stats">
            <li><span className="dot pos" />Bullish<b>{bull}</b></li>
            <li><span className="dot flat" />Mixed<b>{flat}</b></li>
            <li><span className="dot neg" />Bearish<b>{bear}</b></li>
            <li className="mc-sent-stats-sep" />
            <li><span>Net score</span><b>{((bull - bear) / total * 100).toFixed(0)}</b></li>
            <li><span>Items</span><b>{items.length}</b></li>
          </ul>
          <div className="mc-sent-note">
            <span className="mc-sent-note-rule" />
            <span>
              Sentiment net of <b>{((bull - bear) / total * 100).toFixed(0)}</b> over the last 24h leans {bull > bear ? 'bullish' : bear > bull ? 'bearish' : 'mixed'}.
              Watch services CPI + China stimulus tape for regime change.
            </span>
          </div>
        </aside>
      </div>

      {open && (
        <div className="mc-news-drawer-overlay" onClick={() => setOpen(null)}>
          <div className="mc-news-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mc-news-drawer-h">
              <div>
                <span className="mc-tag">{open.region}</span>
                <span className="mc-tag src">{open.source}</span>
                <span className="mc-tag">{open.time} WIB</span>
              </div>
              <button className="sw-tf" onClick={() => setOpen(null)}>✕</button>
            </div>
            <h2 className="mc-news-drawer-title">{open.headline}</h2>
            <p className="mc-news-drawer-body">{open.summary}</p>
            <div className="mc-news-drawer-h-sub">Where it leads</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{open.impact}</p>
            <div className="mc-news-drawer-h-sub">MiroFish · simulate this story</div>
            <div className="mf-drop">
              <span className="mf-drop-rule" />
              <div>Run multi-agent simulation seeded by this article. <span style={{ color: 'var(--text-tertiary)' }}>Returns prediction report + branching simulation timeline.</span></div>
            </div>
            <button className="sw-tf is-active" style={{ marginTop: 10 }}>▶ Run swarm simulation</button>
          </div>
        </div>
      )}
    </section>
  );
};

const MacroDashboard = ({ region, setRegion }) => (
  <>
    <MacroThesis />
    <RegimeBand region={region} setRegion={setRegion} />
    <HeroGrid region={region} />
    <NewsAndSentiment region={region} />
  </>
);

// ----------------------------------------------------------------
// Tab strip + router shell
// ----------------------------------------------------------------

const MACRO_ROUTES = [
  { key: 'dashboard',   label: 'Dashboard'   },
  { key: 'news',        label: 'News'        },
  { key: 'data',        label: 'Data'        },
  { key: 'connections', label: 'Connections' },
  { key: 'map',         label: 'Map'         },
];

const MacroTabStrip = ({ route, setRoute }) => {
  const containerRef = React.useRef(null);
  const [cursorStyle, setCursorStyle] = React.useState({ left: 0, width: 0, opacity: 0 });

  // Measure the active tab on mount + route change → animate the underline cursor
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('.mc-tab.is-active');
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setCursorStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  }, [route]);

  return (
    <div className="mc-tabs" ref={containerRef}>
      <div className="mc-tabs-cursor" style={cursorStyle} />
      {MACRO_ROUTES.map(r => (
        <button
          key={r.key}
          className={`mc-tab ${route === r.key ? 'is-active' : ''}`}
          onClick={() => setRoute(r.key)}
        >
          <span className="mc-tab-num">{String(MACRO_ROUTES.indexOf(r) + 1).padStart(2, '0')}</span>
          <span className="mc-tab-label">{r.label}</span>
        </button>
      ))}
      <div className="mc-tabs-spacer" />
      <span className="mc-tabs-meta">macro · {route} · live</span>
    </div>
  );
};

const MacroWorkspace = () => {
  const [route,  setRoute]  = React.useState('dashboard');
  const [region, setRegion] = React.useState('both');

  let body = null;
  switch (route) {
    case 'news':        body = window.MacroNews        ? <window.MacroNews        /> : <div className="mc-section mc-news-empty">MacroNews not loaded.</div>;        break;
    case 'data':        body = window.MacroData        ? <window.MacroData        /> : <div className="mc-section mc-news-empty">MacroData not loaded.</div>;        break;
    case 'connections': body = window.MacroConnections ? <window.MacroConnections /> : <div className="mc-section mc-news-empty">MacroConnections not loaded.</div>; break;
    case 'map':         body = window.MacroMap         ? <window.MacroMap         /> : <div className="mc-section mc-news-empty">MacroMap not loaded.</div>;         break;
    case 'dashboard':
    default:            body = <MacroDashboard region={region} setRegion={setRegion} />; break;
  }

  return (
    <div className="mc-workspace">
      <MacroTabStrip route={route} setRoute={setRoute} />
      {body}
    </div>
  );
};

window.MacroWorkspace = MacroWorkspace;
