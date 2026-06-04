// ================================================================
// Macro · Calendar  (window.MacroCalendar)
// Economic + corporate-event calendar over macro.calendar (via window.MACRO_LIVE).
// Regions: Indonesia / US / Global. Two-level filter (region → category), search,
// high-impact toggle, past/upcoming toggle. Chronological agenda, day-grouped.
// ================================================================

const MCAL_CATS = {
  central_bank: { label: 'Central Bank', glyph: '▣' },
  data:         { label: 'Data',         glyph: '▤' },
  rups:         { label: 'RUPS',         glyph: '⚖' },
  earnings:     { label: 'Earnings',     glyph: '$' },
  dividend:     { label: 'Dividend',     glyph: '◈' },
  auction:      { label: 'Auction',      glyph: '⊞' },
  ipo:          { label: 'IPO',          glyph: '✦' },
  index:        { label: 'Index',        glyph: '▦' },
  speech:       { label: 'Speakers',     glyph: '❝' },
  fiscal:       { label: 'Fiscal',       glyph: '◰' },
  holiday:      { label: 'Holiday',      glyph: '☼' },
  geopolitics:  { label: 'Geopolitics',  glyph: '◎' },
  commodity:    { label: 'Commodity',    glyph: '⛁' },
  other:        { label: 'Other',        glyph: '•' },
};
// stable filter-chip order (only those present get rendered)
const MCAL_CAT_ORDER = ['central_bank', 'data', 'rups', 'earnings', 'dividend', 'auction', 'ipo', 'index', 'speech', 'fiscal', 'holiday', 'geopolitics', 'commodity', 'other'];
const MCAL_REGIONS = [{ k: 'All', label: 'All' }, { k: 'ID', label: 'Indonesia' }, { k: 'US', label: 'US' }, { k: 'Global', label: 'Global' }];
const MCAL_REGION_CHIP = { ID: { t: 'ID', c: '#e0823a' }, US: { t: 'US', c: '#5B8DEF' }, Global: { t: 'GL', c: '#19C37D' } };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const mcalCat = (c) => MCAL_CATS[c] || MCAL_CATS.other;
const mcalImpColor = (i) => (i === 'high' ? '#e0823a' : i === 'low' ? 'var(--text-tertiary)' : 'var(--brand)');
const mcalISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// "2026-06-18" -> { key, label, sub } group header
const mcalDayLabel = (iso, todayISO) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - t0) / 86400000);
  let tag = '';
  if (diff === 0) tag = 'TODAY';
  else if (diff === 1) tag = 'TOMORROW';
  else if (diff === -1) tag = 'YESTERDAY';
  return { label: WDAYS[dt.getDay()] + ' · ' + d + ' ' + MONTHS[m - 1] + ' ' + y, tag, diff };
};

const MCalRow = ({ e }) => {
  const cat = mcalCat(e.category);
  const chip = MCAL_REGION_CHIP[e.region];
  const hasData = e.forecast || e.prev || e.actual;
  return (
    <div className={'mcal-row imp-' + e.importance}>
      <span className="mcal-time">{e.event_time || '—'}</span>
      <span className="mcal-cat" title={cat.label}><span className="mcal-cat-glyph">{cat.glyph}</span></span>
      <span className="mcal-body">
        <span className="mcal-title-line">
          {chip && <span className="mcal-rchip" style={{ color: chip.c, borderColor: chip.c }}>{chip.t}</span>}
          {e.ticker && <span className="mcal-ticker">{e.ticker}</span>}
          <span className="mcal-title">{e.title}</span>
          {e.status !== 'confirmed' && <span className={'mcal-status mcal-status--' + e.status}>{e.status === 'tentative' ? 'tentative' : 'est.'}</span>}
        </span>
        {(e.entity || e.detail || hasData) && (
          <span className="mcal-meta">
            {e.entity && <span className="mcal-entity">{e.entity}</span>}
            {e.period && <span className="mcal-period">{e.period}</span>}
            {hasData && (
              <span className="mcal-figs">
                {e.actual != null && e.actual !== '' && <span className="mcal-fig"><b>A</b> {e.actual}</span>}
                {e.forecast && <span className="mcal-fig"><b>F</b> {e.forecast}</span>}
                {e.prev && <span className="mcal-fig"><b>P</b> {e.prev}</span>}
              </span>
            )}
            {e.detail && <span className="mcal-detail">{e.detail}</span>}
            {e.url && <a className="mcal-src" href={e.url} target="_blank" rel="noopener noreferrer">{e.source || 'source'} ↗</a>}
          </span>
        )}
      </span>
      <span className="mcal-impdot" style={{ background: mcalImpColor(e.importance) }} title={e.importance + ' impact'} />
    </div>
  );
};

const MacroCalendar = () => {
  const [events, setEvents] = React.useState([]);
  const [status, setStatus] = React.useState('loading');
  const [region, setRegion] = React.useState('All');
  const [cat, setCat] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [highOnly, setHighOnly] = React.useState(false);
  const [showPast, setShowPast] = React.useState(false);
  const [view, setView] = React.useState('month');               // 'month' | 'agenda'
  const _now0 = new Date();
  const [monthISO, setMonthISO] = React.useState(mcalISO(new Date(_now0.getFullYear(), _now0.getMonth(), 1)));
  const [selDay, setSelDay] = React.useState(mcalISO(_now0));

  React.useEffect(() => {
    let dead = false;
    if (!window.MACRO_LIVE || !window.MACRO_LIVE.calendar) { setStatus('empty'); return; }
    window.MACRO_LIVE.calendar().then((rows) => {
      if (dead) return;
      setEvents(Array.isArray(rows) ? rows : []);
      setStatus(rows && rows.length ? 'ok' : 'empty');
    }).catch(() => !dead && setStatus('error'));
    return () => { dead = true; };
  }, []);

  const todayISO = mcalISO(new Date());

  // categories that actually exist for the current region (drives the chip row)
  const cats = React.useMemo(() => {
    const s = new Set();
    events.forEach((e) => { if (region === 'All' || e.region === region) s.add(e.category); });
    return MCAL_CAT_ORDER.filter((c) => s.has(c));
  }, [events, region]);

  // if the active category vanishes for the chosen region, reset to All
  React.useEffect(() => { if (cat !== 'all' && !cats.includes(cat)) setCat('all'); }, [cats, cat]);

  const IMP_ORD = { high: 0, med: 1, low: 2 };
  // region/type/high/search filter — WITHOUT any date cutoff (shared by both views)
  const base = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (region !== 'All' && e.region !== region) return false;
      if (cat !== 'all' && e.category !== cat) return false;
      if (highOnly && e.importance !== 'high') return false;
      if (needle) {
        const hay = (e.title + ' ' + (e.entity || '') + ' ' + (e.ticker || '') + ' ' + (e.detail || '')).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [events, region, cat, q, highOnly]);

  // events indexed by date (used by both the month grid and the day detail)
  const byDate = React.useMemo(() => {
    const m = {};
    base.forEach((e) => { (m[e.event_date] = m[e.event_date] || []).push(e); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (IMP_ORD[a.importance] - IMP_ORD[b.importance]) || a.region.localeCompare(b.region)));
    return m;
  }, [base]);

  // AGENDA view: ascending day groups (applies the past cutoff / Show-past toggle)
  const agendaGroups = React.useMemo(() => (
    Object.keys(byDate).filter((d) => showPast || d >= todayISO).sort().map((d) => ({ date: d, items: byDate[d] }))
  ), [byDate, showPast, todayISO]);

  // MONTH view: 6×7 cell grid for the displayed month (Mon-start)
  const monthGrid = React.useMemo(() => {
    const [y, m] = monthISO.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = (first.getDay() + 6) % 7;               // Mon=0
    const start = new Date(y, m - 1, 1 - startDow);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = mcalISO(d);
      cells.push({ iso, day: d.getDate(), inMonth: d.getMonth() === m - 1, items: byDate[iso] || [] });
    }
    return cells;
  }, [monthISO, byDate]);

  const selItems = byDate[selDay] || [];
  const shiftMonth = (delta) => {
    const [y, m] = monthISO.split('-').map(Number);
    setMonthISO(mcalISO(new Date(y, m - 1 + delta, 1)));
  };
  const gotoToday = () => { const t = new Date(); setMonthISO(mcalISO(new Date(t.getFullYear(), t.getMonth(), 1))); setSelDay(mcalISO(t)); };
  const [my, mm] = monthISO.split('-').map(Number);
  const monthTitle = MONTHS[mm - 1] + ' ' + my;

  // next-7-day high-impact count for the summary strip
  const weekHigh = React.useMemo(() => {
    const end = new Date(); end.setDate(end.getDate() + 7); const endISO = mcalISO(end);
    return events.filter((e) => e.importance === 'high' && e.event_date >= todayISO && e.event_date <= endISO &&
      (region === 'All' || e.region === region)).length;
  }, [events, region, todayISO]);

  return (
    <div className="mcal-shell">
      <div className="mcal-tabs">
        {MCAL_REGIONS.map((r) => (
          <button key={r.k} className={'mc-news-tab' + (region === r.k ? ' is-on' : '')} onClick={() => setRegion(r.k)}>{r.label}</button>
        ))}
        <span className="mcal-tabs-spacer" />
        <span className="mcal-weekpill" title="High-impact events in the next 7 days">{weekHigh} high-impact · next 7d</span>
      </div>

      <div className="mcal-cattabs">
        <span className="ns-cattabs-label">TYPE</span>
        <button className={'ns-cattab' + (cat === 'all' ? ' is-on' : '')} onClick={() => setCat('all')}>All</button>
        {cats.map((c) => (
          <button key={c} className={'ns-cattab' + (cat === c ? ' is-on' : '')} onClick={() => setCat(c)}>
            <span className="mcal-chip-glyph">{mcalCat(c).glyph}</span> {mcalCat(c).label}
          </button>
        ))}
      </div>

      <div className="mcal-controls">
        <div className="mcal-viewseg">
          <button className={'mcal-segbtn' + (view === 'month' ? ' is-on' : '')} onClick={() => setView('month')}>▦ Month</button>
          <button className={'mcal-segbtn' + (view === 'agenda' ? ' is-on' : '')} onClick={() => setView('agenda')}>☰ Agenda</button>
        </div>
        <input className="mcal-search" placeholder="Search ticker, company, event…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={'mcal-toggle' + (highOnly ? ' is-on' : '')} onClick={() => setHighOnly((v) => !v)}>● High impact</button>
        {view === 'agenda' && <button className={'mcal-toggle' + (showPast ? ' is-on' : '')} onClick={() => setShowPast((v) => !v)}>Show past</button>}
        <span className="mcal-count">{base.length} events</span>
      </div>

      {status !== 'ok' && (
        <div className="mcal-feed">
          {status === 'loading' && <div className="mcal-empty">Loading calendar…</div>}
          {status === 'error' && <div className="mcal-empty">Couldn’t reach the calendar feed.</div>}
          {status === 'empty' && <div className="mcal-empty">The calendar hasn’t been populated yet.</div>}
        </div>
      )}

      {/* ---- MONTH GRID ---- */}
      {status === 'ok' && view === 'month' && (
        <div className="mcal-month">
          <div className="mcal-monthbar">
            <button className="mcal-navbtn" onClick={() => shiftMonth(-1)} title="Previous month">‹</button>
            <span className="mcal-month-title">{monthTitle}</span>
            <button className="mcal-navbtn" onClick={() => shiftMonth(1)} title="Next month">›</button>
            <button className="mcal-today-btn" onClick={gotoToday}>Today</button>
          </div>
          <div className="mcal-wkhead">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <span key={w} className="mcal-wk">{w}</span>)}
          </div>
          <div className="mcal-grid">
            {monthGrid.map((c) => {
              const hi = c.items.some((e) => e.importance === 'high');
              const cls = 'mcal-cell' + (c.inMonth ? '' : ' dim') + (c.iso === todayISO ? ' is-today' : '') + (c.iso === selDay ? ' is-sel' : '') + (hi ? ' has-high' : '');
              return (
                <div key={c.iso} className={cls} onClick={() => setSelDay(c.iso)}>
                  <div className="mcal-cell-top">
                    <span className="mcal-cell-date">{c.day}</span>
                    {c.items.length > 0 && <span className="mcal-cell-n">{c.items.length}</span>}
                  </div>
                  <div className="mcal-cell-evts">
                    {c.items.slice(0, 3).map((e) => {
                      const chip = MCAL_REGION_CHIP[e.region];
                      return (
                        <div key={e.id} className={'mcal-evt imp-' + e.importance} title={(e.ticker ? e.ticker + ' · ' : '') + e.title}>
                          <span className="mcal-evt-dot" style={{ background: chip ? chip.c : 'var(--text-tertiary)' }} />
                          <span className="mcal-evt-txt">{e.ticker || mcalCat(e.category).label}{e.ticker ? '' : ''} <span className="mcal-evt-sub">{e.ticker ? mcalCat(e.category).label : e.title}</span></span>
                        </div>
                      );
                    })}
                    {c.items.length > 3 && <div className="mcal-more">+{c.items.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mcal-daydetail">
            <div className="mcal-dd-head">
              {(() => { const dl = mcalDayLabel(selDay, todayISO); return (<>
                <span className="mcal-dayname">{dl.label}</span>
                {dl.tag && <span className="mcal-daytag">{dl.tag}</span>}
                <span className="mcal-daycount">{selItems.length} event{selItems.length === 1 ? '' : 's'}</span>
              </>); })()}
            </div>
            <div className="mcal-dd-list">
              {selItems.length ? selItems.map((e) => <MCalRow key={e.id} e={e} />)
                : <div className="mcal-empty mcal-empty--sm">No events on this day.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ---- AGENDA LIST ---- */}
      {status === 'ok' && view === 'agenda' && (
        <div className="mcal-feed">
          {!agendaGroups.length && <div className="mcal-empty">No events match this filter.{!showPast && ' Try “Show past”.'}</div>}
          {agendaGroups.map((g) => {
            const dl = mcalDayLabel(g.date, todayISO);
            return (
              <div className="mcal-daygroup" key={g.date}>
                <div className={'mcal-dayhead' + (dl.tag === 'TODAY' ? ' is-today' : '')}>
                  <span className="mcal-dayname">{dl.label}</span>
                  {dl.tag && <span className="mcal-daytag">{dl.tag}</span>}
                  <span className="mcal-daycount">{g.items.length}</span>
                </div>
                {g.items.map((e) => <MCalRow key={e.id} e={e} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

window.MacroCalendar = MacroCalendar;
