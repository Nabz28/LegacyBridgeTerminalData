// ================================================================
// MONITOR terminal (window.MonitorTerminal) — T12.
// The research-division operating map, live: 10 specialist equity
// desks + FX / Rates & Credit / Economics market desks. Coverage
// board → desk drill-in (sub-industries panel + live detail panel),
// global markets board, screener, newswire. selfNav (owns its rail).
// ================================================================
(function () {
  'use strict';

  const MD = () => window.MONITOR_DATA;
  const MV = () => window.MONITOR_VIEWS;
  const ML = () => window.MONITOR_LIVE;

  // ---- Coverage board ------------------------------------------------------
  const DeskCard = ({ desk, assign, onOpen }) => {
    const { useQuote, useHistory, useDeskSignals, MonSpark } = ML();
    const { fmtPct, pctCls } = MV();
    const benchY = (desk.bench || []).find((b) => b.y);
    const { quote } = useQuote(benchY ? benchY.y : null);
    const { obs } = useHistory(benchY ? benchY.y : null, '6mo', '1d');
    const sig = useDeskSignals(benchY ? benchY.y : null);
    const a = assign[desk.id] || {};
    const people = [a.head, ...(a.analysts || [])].filter(Boolean);
    const nSubs = (desk.subs || []).length;
    const nNames = (desk.subs || []).reduce((s, x) => s + (x.u || []).length, 0);
    return (
      <div className="mon-card" style={{ ['--ac']: desk.accent }} onClick={() => onOpen(desk.id)}
           role="button" tabIndex={0}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(desk.id); } }}>
        <div className="mon-card-top">
          <span className="num">{desk.num}</span>
          <span className="gics">{desk.gics !== '—' ? desk.gics : 'Market desk'}</span>
          {quote && !quote.error && quote.changePct != null && (
            <span className={'chg ' + pctCls(quote.changePct)}>{fmtPct(quote.changePct)}</span>
          )}
        </div>
        <div className="mon-card-name">{desk.name}</div>
        <div className="mon-card-short">{desk.short}</div>
        {sig && (sig.momentum || sig.rs) && (
          <div className="mon-card-sigs">
            {sig.momentum && sig.momentum !== 'flat' && (
              <span className={'mon-sig ' + ((sig.momentum === 'strong' || sig.momentum === 'up') ? 'pos' : 'neg')}
                    title={'benchmark 1M ' + fmtPct(sig.r1m) + ' · 3M ' + fmtPct(sig.r3m)}>
                MOM {sig.momentum === 'strong' ? '▲▲' : sig.momentum === 'up' ? '▲' : sig.momentum === 'weak' ? '▼▼' : '▼'}
              </span>
            )}
            {sig.rs && sig.rs !== 'inline' && (
              <span className={'mon-sig ' + (sig.rs === 'leader' ? 'pos' : 'neg')}
                    title={'1M relative strength vs S&P 500: ' + fmtPct(sig.rsDiff)}>
                RS {sig.rs === 'leader' ? 'LEADER' : 'LAGGARD'}
              </span>
            )}
          </div>
        )}
        <div className="mon-card-mid">
          <div className="facts">
            {desk.group === 'equity'
              ? <><span><b>{nSubs}</b> sub-industries</span><span><b>{nNames}</b> names</span></>
              : <><span><b>{nSubs}</b> books</span>{nNames ? <span><b>{nNames}</b> instruments</span> : <span>live board</span>}</>}
          </div>
          {obs && obs.length > 3 && <MonSpark obs={obs} color={desk.accent} w={96} h={30} />}
        </div>
        <div className="mon-card-foot">
          {people.length
            ? people.slice(0, 3).map((p) => <span key={p} className="mon-person">{p}</span>)
            : <span className="mon-person unset">Unassigned</span>}
          {people.length > 3 && <span className="mon-person">+{people.length - 3}</span>}
          <span className="open">Open →</span>
        </div>
      </div>
    );
  };

  // Sector rotation: every equity desk's benchmark 1M return vs S&P, ranked.
  // Histories come from the same cache the desk cards fill — no extra load.
  const useRotation = () => {
    const [rows, setRows] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      const ds = MD().DESKS.filter((d) => d.group === 'equity' && (d.bench || []).find((b) => b.y));
      Promise.all(ds.map((d) => {
        const y = d.bench.find((b) => b.y).y;
        return Promise.all([ML().fetchHistory(y, '6mo', '1d'), ML().fetchHistory('^GSPC', '6mo', '1d')])
          .then(([b, s]) => ({ d, sig: window.MONITOR_REGIME.deskSignals(b, s) }), () => null);
      })).then((list) => {
        if (!alive) return;
        setRows(list.filter((x) => x && x.sig && x.sig.r1m != null).sort((a, b) => b.sig.r1m - a.sig.r1m));
      });
      return () => { alive = false; };
    }, []);
    return rows;
  };

  const RotationStrip = ({ onOpenDesk }) => {
    const rows = useRotation();
    const { fmtPct } = MV();
    if (!rows || rows.length < 4) return null;
    return (
      <div className="mon-rotation">
        <span className="t" title="equity desks ranked by benchmark 1M return — money rotates toward the left">Rotation 1M</span>
        {rows.map(({ d, sig }) => (
          <button key={d.id} className={'mon-rot ' + (sig.r1m > 0.5 ? 'pos' : sig.r1m < -0.5 ? 'neg' : '')}
                  style={{ ['--ac']: d.accent }} onClick={() => onOpenDesk(d.id)}
                  title={d.name + ' · ' + (d.bench.find((b) => b.y) || {}).label + ' · 3M ' + fmtPct(sig.r3m) + (sig.rs ? ' · RS ' + sig.rs : '')}>
            <span className="n">{d.num}</span>
            <span className="p">{fmtPct(sig.r1m)}</span>
          </button>
        ))}
      </div>
    );
  };

  const CoverageBoard = ({ assign, onOpenDesk }) => {
    const md = MD();
    const { RegimeStrip, MorningNote, DeskCompare } = MV();
    const equity = md.DESKS.filter((d) => d.group === 'equity');
    const markets = md.DESKS.filter((d) => d.group === 'markets');
    const [noteOpen, setNoteOpen] = React.useState(false);
    const [cmpOpen, setCmpOpen] = React.useState(false);
    // the explainer hero collapses after the first visit — regime + desks
    // are the daily content; the structure story is one click away.
    const [heroOpen, setHeroOpen] = React.useState(() => {
      try { return !localStorage.getItem('lbc-monitor-hero-seen'); } catch { return true; }
    });
    React.useEffect(() => { try { localStorage.setItem('lbc-monitor-hero-seen', '1'); } catch {} }, []);
    return (
      <div className="mon-page">
        {!heroOpen && (
          <div className="mon-hero-mini">
            <span className="k">LBC Research Division · coverage operating map</span>
            <h1>Monitor</h1>
            <button className="mon-chip cta" onClick={() => setNoteOpen(true)} title="auto-composed standup brief — dials, alerts, per-desk tape and movers">☀ Morning note</button>
            <button className="mon-chip" onClick={() => setCmpOpen(true)} title="two desks side by side — overlaid benchmarks, pulse, correlation, movers">⇄ Compare desks</button>
            <button className="mon-chip" onClick={() => setHeroOpen(true)}>About the structure</button>
          </div>
        )}
        {heroOpen && (
        <div className="mon-hero">
          <div className="mon-hero-l">
            <div className="k">LBC Research Division · coverage operating map</div>
            <h1>Monitor</h1>
            <p>
              Every public company maps to exactly one of <b>10 specialist equity desks</b> (MECE, GICS-aligned),
              flanked by three market desks — <b>FX</b>, <b>Rates &amp; Credit</b> and <b>Economics</b> — that give the
              division its cross-asset context. Click a desk to drill into sub-industries, live constituents,
              custom indices and news.
            </p>
          </div>
          <div className="mon-hero-r">
            {md.ROADMAP.map((r) => (
              <div key={r.phase} className={'mon-phase ' + (r.active ? 'active' : '')} title={r.note}>
                <span className="p">{r.phase}</span>
                <span className="t">{r.teams}</span>
                {r.active && <span className="now">LIVE</span>}
              </div>
            ))}
            <button className="mon-chip cta" style={{ alignSelf: 'flex-start' }} onClick={() => setNoteOpen(true)} title="auto-composed standup brief — dials, alerts, per-desk tape and movers">☀ Morning note</button>
            <button className="mon-chip" style={{ alignSelf: 'flex-start' }} onClick={() => setCmpOpen(true)} title="two desks side by side">⇄ Compare desks</button>
            <button className="mon-chip" style={{ alignSelf: 'flex-start' }} onClick={() => setHeroOpen(false)} title="Collapse">✕</button>
          </div>
        </div>
        )}

        <RegimeStrip />
        <RotationStrip onOpenDesk={onOpenDesk} />
        {noteOpen && <MorningNote assign={assign} onClose={() => setNoteOpen(false)} />}
        {cmpOpen && <DeskCompare onClose={() => setCmpOpen(false)} />}

        <div className="mon-sec-h"><span>Equity Research</span><span className="n">{equity.length} sector desks</span></div>
        <div className="mon-cards">
          {equity.map((d) => <DeskCard key={d.id} desk={d} assign={assign} onOpen={onOpenDesk} />)}
        </div>
        <div className="mon-sec-h"><span>Markets &amp; Macro</span><span className="n">{markets.length} desks — the strategy layer</span></div>
        <div className="mon-cards">
          {markets.map((d) => <DeskCard key={d.id} desk={d} assign={assign} onOpen={onOpenDesk} />)}
        </div>
      </div>
    );
  };

  // ---- Desk view -----------------------------------------------------------
  // Index Lab leads for equity desks (custom index building is the primary
  // workflow); Overview demoted to third.
  const DESK_TABS = (desk) => {
    if (desk.id === 'fx') return ['Overview', 'Cross Rates', 'Pairs', 'News'];
    if (desk.id === 'rates') return ['Overview', 'Curve & Spreads', 'Board', 'News'];
    if (desk.id === 'econ') return ['Indicators', 'Calendar', 'News'];
    return ['Index Lab', 'Constituents', 'Overview', 'News'];
  };

  const DeskView = ({ deskId, assign, onAssign, subId, setSubId }) => {
    const md = MD(), mv = MV();
    const desk = md.deskById(deskId);
    const [tab, setTab] = React.useState(DESK_TABS(desk)[0]);
    const [region, setRegion] = React.useState('ALL');
    const [country, setCountry] = React.useState('');
    const [benchIdx, setBenchIdx] = React.useState(0);
    const [detail, setDetail] = React.useState(null);
    const [dossier, setDossier] = React.useState(false);
    const [assignOpen, setAssignOpen] = React.useState(false);
    // Index Lab stays mounted after first open (work preservation).
    const [labTouched, setLabTouched] = React.useState(false);
    React.useEffect(() => { if (tab === 'Index Lab') setLabTouched(true); }, [tab]);
    // NOTE: DeskView is remounted per desk via key={view.id} at the call
    // site, so all state above starts fresh on a desk switch — no reset
    // effect needed here.

    if (!desk) return null;
    const isEcon = desk.id === 'econ';
    const rows = isEcon ? [] : md.deskUniverse(desk, subId, region, country || null);
    const countries = md.deskCountries(desk);
    const a = assign[desk.id] || {};
    const people = [a.head, ...(a.analysts || [])].filter(Boolean);
    const bench = desk.bench || [];
    const activeBench = bench[Math.min(benchIdx, bench.length - 1)] || null;
    const tabs = DESK_TABS(desk);
    const econRegion = isEcon ? (subId === 'all' ? 'United States' : subId) : null;

    return (
      <div className="mon-desk" style={{ ['--ac']: desk.accent }}>
        {/* header */}
        <div className="mon-desk-h">
          <div className="mon-desk-id">
            <span className="num">{desk.num}</span>
            <div>
              <div className="name">{desk.name}</div>
              <div className="short">{desk.short}</div>
            </div>
          </div>
          <div className="mon-desk-people">
            {people.length
              ? people.map((p) => <span key={p} className="mon-person">{p}</span>)
              : <span className="mon-person unset">Unassigned</span>}
            <button className="mon-chip" onClick={() => setAssignOpen(true)} title="Assign desk head & analysts">Assign</button>
            <button className="mon-chip" onClick={() => setDossier(true)} title="Desk dossier — mandate, themes, valuation toolkit">Dossier</button>
          </div>
        </div>

        {/* filters */}
        {!isEcon && (
          <div className="mon-desk-filters">
            {md.REGION_FILTERS.map((r) => (
              <button key={r.id} className={'mon-chip ' + (region === r.id && !country ? 'active' : '')}
                      onClick={() => { setRegion(r.id); setCountry(''); }}>{r.label}</button>
            ))}
            <select className="mon-select" value={country} onChange={(e) => { setCountry(e.target.value); if (e.target.value) setRegion('ALL'); }}>
              <option value="">By country…</option>
              {countries.map((c) => <option key={c} value={c}>{(md.COUNTRIES[c] || {}).f} {(md.COUNTRIES[c] || {}).n}</option>)}
            </select>
            <span className="mon-desk-count">{rows.length} instruments</span>
            <span className="sp"></span>
            {tabs.map((t) => (
              <button key={t} className={'mon-tab ' + (tab === t ? 'active' : '')} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        )}
        {isEcon && (
          <div className="mon-desk-filters">
            <span className="mon-desk-count">Live indicator book · Refinitiv/FRED/DBnomics via T2 pipelines</span>
            <span className="sp"></span>
            {tabs.map((t) => (
              <button key={t} className={'mon-tab ' + (tab === t ? 'active' : '')} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        )}

        {/* body: sub panel + detail panel */}
        <div className="mon-desk-body">
          <div className="mon-subs">
            <div className="mon-subs-h">{isEcon ? 'Regions' : 'Sub-industries'}</div>
            {!isEcon && (
              <div className={'mon-sub ' + (subId === 'all' ? 'active' : '')} onClick={() => setSubId('all')}>
                <span className="n">All {desk.name}</span>
                <span className="ct">{md.deskUniverse(desk, 'all', region, country || null).length}</span>
              </div>
            )}
            {desk.subs.map((s) => (
              <div key={s.id} className={'mon-sub ' + (subId === s.id || (isEcon && subId === 'all' && s.id === 'United States') ? 'active' : '')}
                   onClick={() => setSubId(s.id)}>
                <span className="n">{s.name}</span>
                {!isEcon && <span className="ct">{md.deskUniverse(desk, s.id, region, country || null).length}</span>}
              </div>
            ))}
            {subId !== 'all' && !isEcon && (
              <div className="mon-subs-note">{(desk.subs.find((s) => s.id === subId) || {}).note || ''}</div>
            )}
          </div>

          <div className="mon-detail">
            {/* ---- equity/fx/rates: Overview ---- */}
            {tab === 'Overview' && (
              <OverviewPanel desk={desk} rows={rows} bench={bench} benchIdx={benchIdx} setBenchIdx={setBenchIdx} activeBench={activeBench} />
            )}

            {/* ---- equity constituents / fx pairs ---- */}
            {(tab === 'Constituents' || tab === 'Pairs') && (
              <mv.QuoteTable rows={rows} onOpen={(r) => setDetail(r)} withFundamentals={desk.group === 'equity'} />
            )}

            {/* ---- Index Lab — stays MOUNTED once opened so a half-built
                 basket survives peeking at News/Overview. The region/country/
                 sub filters feed its picker. ---- */}
            {(tab === 'Index Lab' || labTouched) && tabs.includes('Index Lab') && (
              <div style={{ display: tab === 'Index Lab' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
                <mv.IndexLab desk={desk} accent={desk.accent} filterRows={rows}
                  filterLabel={(country ? ((md.COUNTRIES[country] || {}).n || country)
                    : (md.REGION_FILTERS.find((r) => r.id === region) || {}).label || 'Global')
                    + (subId !== 'all' ? ' · ' + ((desk.subs.find((s) => s.id === subId) || {}).name || '') : '')} />
              </div>
            )}

            {/* ---- FX cross rates ---- */}
            {tab === 'Cross Rates' && (
              <div className="mon-fill"><mv.TvFxHeatmap /></div>
            )}

            {/* ---- Rates boards ---- */}
            {tab === 'Curve & Spreads' && <mv.RatesBoard desk={desk} accent={desk.accent} />}
            {tab === 'Board' && (
              /* the free TV quotes widget refuses non-US sovereign yields, so
                 this board is OURS: live Yahoo table (US yields, bond futures,
                 credit/intl ETFs) + deep links for TV-only sovereigns. */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <mv.QuoteTable rows={rows} onOpen={(r) => setDetail(r)} />
                <div className="mon-panel">
                  <div className="mon-panel-h">Global sovereign 10Y <span className="sub">restricted in free embeds — open in TradingView</span></div>
                  <div className="mon-bench-strip">
                    {md.deskUniverse(desk, 'all', 'ALL', null).filter((r) => !r.t && r.tv).map((r) => (
                      <a key={r.tv} className="mon-chip" href={mv.tvDeepLink(r.tv)} target="_blank" rel="noopener"
                         style={{ textDecoration: 'none' }}>{r.n} ↗</a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Economics ---- */}
            {tab === 'Indicators' && isEcon && (
              <mv.EconBoard region={econRegion} accent={desk.accent} />
            )}
            {tab === 'Calendar' && <div className="mon-fill"><mv.TvCalendar /></div>}

            {/* ---- News ---- */}
            {tab === 'News' && (
              <DeskNews desk={desk} activeBench={activeBench} rows={rows} />
            )}
          </div>
        </div>

        {detail && (
          <mv.HistoryModal
            title={detail.n} sub={(detail.sub ? detail.sub + ' · ' : '') + (detail.t || '')}
            ticker={detail.t} onClose={() => setDetail(null)} />
        )}
        {dossier && <mv.DossierDrawer desk={desk} onClose={() => setDossier(false)} />}
        {assignOpen && <mv.AssignEditor desk={desk} assign={assign} onSave={onAssign} onClose={() => setAssignOpen(false)} />}
      </div>
    );
  };

  // Overview panel — owns ONE shared quote batch for the desk's filtered
  // universe; DeskPulse and TopMovers consume it as props (no double polling).
  const OverviewPanel = ({ desk, rows, bench, benchIdx, setBenchIdx, activeBench }) => {
    const mv = MV();
    const tickers = rows.filter((r) => r.t).map((r) => r.t);
    const { quotes } = ML().useQuotes(tickers);
    // hook must run unconditionally (rules of hooks) — non-equity desks get
    // an empty sample which resolves to null flow.
    const flow = ML().useVolumeFlow(desk.group === 'equity' ? rows : []);
    return (
      <div className="mon-overview">
        <div className="mon-bench-strip">
          {bench.map((b, i) => (
            <button key={b.label} className={'mon-chip ' + (i === benchIdx ? 'active' : '')}
                    onClick={() => setBenchIdx(i)} title={b.region}>{b.label}</button>
          ))}
        </div>
        <div className="mon-overview-chart">
          {/* prefer our own chart whenever the TV embed would be blocked */}
          {activeBench && activeBench.tv && mv.tvEmbeddable(activeBench.tv)
            ? <mv.TvAdvancedChart symbol={activeBench.tv} />
            : activeBench && activeBench.y
              ? <YahooFallbackChart ticker={activeBench.y} label={activeBench.label} accent={desk.accent} />
              : activeBench && activeBench.tv
                ? <mv.TvAdvancedChart symbol={activeBench.tv} /* renders the deep-link notice */ />
                : <div className="mon-chart-empty">No benchmark configured</div>}
        </div>
        {desk.group === 'equity' && rows.length > 3 && <mv.DeskPulse desk={desk} quotes={quotes} flow={flow} />}
        {rows.length > 3 && <mv.TopMovers rows={rows} quotes={quotes} flow={flow} />}
      </div>
    );
  };

  // Yahoo fallback chart for benches without a TV symbol.
  const YahooFallbackChart = ({ ticker, label, accent }) => {
    const { useHistory, MultiLineChart } = ML();
    const { obs, err } = useHistory(ticker, '2y', '1d');
    if (err) return <div className="mon-chart-empty">{err}</div>;
    if (!obs) return <div className="mon-chart-empty">Loading…</div>;
    return <MultiLineChart series={[{ label, color: accent, points: obs }]} height={380} />;
  };

  // Desk news: symbol feed follows the active benchmark / first TV constituent,
  // with a market-feed fallback toggle.
  const DeskNews = ({ desk, activeBench, rows }) => {
    const mv = MV();
    // only offer instruments the free news embed can actually resolve
    const emb = MV().tvEmbeddable;
    const symCandidates = [
      ...(activeBench && activeBench.tv && emb(activeBench.tv) ? [{ label: activeBench.label, tv: activeBench.tv }] : []),
      ...rows.filter((r) => r.tv && emb(r.tv)).slice(0, 10).map((r) => ({ label: r.n, tv: r.tv })),
    ];
    const market = desk.id === 'fx' ? 'forex' : desk.id === 'rates' ? 'index' : 'stock';
    const [mode, setMode] = React.useState(symCandidates.length ? 'symbol' : 'market');
    const [sym, setSym] = React.useState(symCandidates.length ? symCandidates[0].tv : '');
    return (
      <div className="mon-news">
        <div className="mon-news-bar">
          <button className={'mon-chip ' + (mode === 'symbol' ? 'active' : '')} onClick={() => setMode('symbol')} disabled={!symCandidates.length}>By instrument</button>
          <button className={'mon-chip ' + (mode === 'market' ? 'active' : '')} onClick={() => setMode('market')}>Market wire</button>
          {mode === 'symbol' && (
            <select className="mon-select" value={sym} onChange={(e) => setSym(e.target.value)}>
              {symCandidates.map((s) => <option key={s.tv} value={s.tv}>{s.label}</option>)}
            </select>
          )}
        </div>
        <div className="mon-fill">
          {mode === 'symbol' && sym
            ? <mv.TvNews mode="symbol" symbol={sym} />
            : <mv.TvNews mode="market" market={market} />}
        </div>
      </div>
    );
  };

  // ---- Global markets board ------------------------------------------------
  const MarketsBoard = () => {
    const md = MD(), mv = MV();
    const [region, setRegion] = React.useState('ALL');
    const [detail, setDetail] = React.useState(null);
    const rows = md.COUNTRY_INDICES
      .filter((r) => md.inRegion(r.c, region))
      .map((r) => ({ t: r.y, tv: r.tv, n: r.n, c: r.c, sub: (md.COUNTRIES[r.c] || {}).n || '' }));
    return (
      <div className="mon-page mon-markets">
        <div className="mon-ticker"><mv.TvTickerTape /></div>
        <mv.RegimeStrip compact />
        <div className="mon-markets-grid">
          <div className="mon-panel">
            <div className="mon-panel-h">Index by country <span className="sub">Yahoo live-ish · click a row for full history + CSV</span></div>
            <div className="mon-bench-strip">
              {md.REGION_FILTERS.map((r) => (
                <button key={r.id} className={'mon-chip ' + (region === r.id ? 'active' : '')} onClick={() => setRegion(r.id)}>{r.label}</button>
              ))}
            </div>
            <mv.QuoteTable rows={rows} onOpen={(r) => setDetail(r)} />
          </div>
          <div className="mon-panel mon-panel-tv">
            <div className="mon-panel-h">Live markets <span className="sub">TradingView streaming</span></div>
            <div className="mon-fill">
              <mv.TvQuotesBoard groups={[
                { name: 'Sovereign 10Y', symbols: [
                  { name: 'TVC:US10Y', displayName: 'United States 10Y' }, { name: 'TVC:DE10Y', displayName: 'Germany 10Y' },
                  { name: 'TVC:GB10Y', displayName: 'UK 10Y' }, { name: 'TVC:JP10Y', displayName: 'Japan 10Y' },
                  { name: 'TVC:CN10Y', displayName: 'China 10Y' }, { name: 'TVC:ID10Y', displayName: 'Indonesia 10Y' },
                  { name: 'TVC:IN10Y', displayName: 'India 10Y' },
                ] },
                { name: 'FX', symbols: [
                  { name: 'TVC:DXY', displayName: 'Dollar Index' }, { name: 'FX:EURUSD', displayName: 'EUR/USD' },
                  { name: 'FX:USDJPY', displayName: 'USD/JPY' }, { name: 'FX:USDCNH', displayName: 'USD/CNH' },
                  { name: 'FX_IDC:USDIDR', displayName: 'USD/IDR' }, { name: 'FX:USDSGD', displayName: 'USD/SGD' },
                ] },
                { name: 'Commodities', symbols: [
                  { name: 'TVC:GOLD', displayName: 'Gold' }, { name: 'TVC:SILVER', displayName: 'Silver' },
                  { name: 'TVC:USOIL', displayName: 'WTI Crude' }, { name: 'TVC:UKOIL', displayName: 'Brent' },
                  { name: 'CAPITALCOM:NATURALGAS', displayName: 'Nat Gas' }, { name: 'CAPITALCOM:COPPER', displayName: 'Copper' },
                ] },
                { name: 'Crypto', symbols: [
                  { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' }, { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
                  { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
                ] },
              ]} />
            </div>
          </div>
        </div>
        {detail && (
          <mv.HistoryModal title={detail.n} sub={detail.sub + ' · ' + detail.t} ticker={detail.t} onClose={() => setDetail(null)} />
        )}
      </div>
    );
  };

  // ---- Screener ------------------------------------------------------------
  // Two screeners: the LBC BOOK sweep (default — desk/sub/region columns
  // TradingView can't know) and the TV widget for anything outside the book.
  const ScreenerPage = () => {
    const md = MD(), mv = MV();
    const [mode, setMode] = React.useState('book');
    const [market, setMarket] = React.useState('america');
    return (
      <div className="mon-page mon-screener">
        <div className="mon-panel-h">Screener
          <span className="sub">{mode === 'book' ? 'the LBC coverage book, ranked live' : 'TradingView screener · any market, any filter'}</span>
          <span style={{ flex: 1 }}></span>
          <button className={'mon-chip ' + (mode === 'book' ? 'active' : '')} onClick={() => setMode('book')}>LBC book</button>
          <button className={'mon-chip ' + (mode === 'tv' ? 'active' : '')} onClick={() => setMode('tv')}>All markets (TV)</button>
        </div>
        {mode === 'book' ? <mv.BookScreener /> : (
          <>
            <div className="mon-bench-strip" style={{ flexWrap: 'wrap' }}>
              {md.SCREENER_MARKETS.map((m) => (
                <button key={m.id} className={'mon-chip ' + (market === m.id ? 'active' : '')} onClick={() => setMarket(m.id)}>{m.label}</button>
              ))}
            </div>
            <div className="mon-fill"><mv.TvScreener key={market} market={market} /></div>
          </>
        )}
      </div>
    );
  };

  // ---- Newswire ------------------------------------------------------------
  const NewswirePage = () => {
    const mv = MV();
    const FEEDS = [
      { id: 'stock', label: 'Global Stocks' }, { id: 'index', label: 'Indices' },
      { id: 'forex', label: 'FX' }, { id: 'crypto', label: 'Crypto' },
    ];
    const [feed, setFeed] = React.useState('stock');
    const [sym, setSym] = React.useState('');
    const [input, setInput] = React.useState('');
    return (
      <div className="mon-page mon-newswire">
        <div className="mon-panel-h">Newswire <span className="sub">live headlines · pick a wire or pin an instrument (e.g. IDX:BBCA, NASDAQ:NVDA)</span></div>
        <div className="mon-bench-strip">
          {FEEDS.map((f) => (
            <button key={f.id} className={'mon-chip ' + (feed === f.id && !sym ? 'active' : '')}
                    onClick={() => { setFeed(f.id); setSym(''); }}>{f.label}</button>
          ))}
          <input className="mon-input" style={{ maxWidth: 220 }} placeholder="TV symbol + Enter…" value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { setSym(input.trim().toUpperCase()); } }} />
          {sym && <span className="mon-tag" onClick={() => setSym('')}>{sym} ✕</span>}
        </div>
        <div className="mon-fill">
          {sym ? <mv.TvNews mode="symbol" symbol={sym} /> : <mv.TvNews mode="market" market={feed} />}
        </div>
      </div>
    );
  };

  // ---- error boundary — a bad widget/data path must never unmount the shell
  class MonBoundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) {
      this.lastErr = err;
      // 5.2: silent breakage becomes a telemetry row, never a user report
      try { ML().beacon('boundary', err && err.message || String(err), (info && info.componentStack || '').slice(0, 900)); } catch {}
    }
    render() {
      if (this.state.err) {
        return (
          <div className="mon-page">
            <div className="mon-chart-empty" style={{ flexDirection: 'column', gap: 10, minHeight: 220 }}>
              <div>Something broke in this Monitor view ({String(this.state.err && this.state.err.message || this.state.err)}).</div>
              <button className="mon-chip" onClick={() => this.setState({ err: null })}>Reload view</button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // ---- rail + root ---------------------------------------------------------
  const RAIL_TOP = [
    { id: 'coverage', label: 'Coverage Map', glyph: '⊞' },
    { id: 'markets', label: 'Global Markets', glyph: '◍' },
    { id: 'screener', label: 'Screener', glyph: '⌕' },
    { id: 'news', label: 'Newswire', glyph: '❏' },
  ];

  // Deep links: #monitor/coverage | #monitor/markets|screener|news |
  // #monitor/desk/<deskId>[/<subId>] — restore on mount, mirror on change.
  const parseMonitorHash = () => {
    const m = (window.location.hash || '').match(/^#monitor(?:\/([a-z]+))?(?:\/([a-z0-9-]+))?(?:\/([^/]+))?/);
    if (!m) return null;
    const kind = m[1], id = m[2], sub = m[3];
    if (kind === 'desk' && id && MD().deskById(id)) {
      return { view: { type: 'desk', id }, subId: sub ? decodeURIComponent(sub) : 'all' };
    }
    if (['coverage', 'markets', 'screener', 'news'].includes(kind)) return { view: { type: kind }, subId: 'all' };
    return { view: { type: 'coverage' }, subId: 'all' };
  };

  const MonitorTerminal = () => {
    const md = MD();
    const initial = React.useMemo(parseMonitorHash, []);
    const [view, setView] = React.useState(initial ? initial.view : { type: 'coverage' });
    const [subId, setSubId] = React.useState(initial ? initial.subId : 'all');
    // mirror state → hash (replaceState: no history spam, F5/bookmark/share
    // safe — and replaceState does NOT fire hashchange, so no loops)
    React.useEffect(() => {
      const h = view.type === 'desk'
        ? '#monitor/desk/' + view.id + (subId && subId !== 'all' ? '/' + encodeURIComponent(subId) : '')
        : '#monitor/' + view.type;
      try { history.replaceState(null, '', h); } catch {}
    }, [view, subId]);
    // external hash updates (late fragment application, user-edited URL)
    // navigate the already-mounted terminal.
    React.useEffect(() => {
      const onHash = () => {
        const p = parseMonitorHash();
        if (p) { setView(p.view); setSubId(p.subId); }
      };
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }, []);
    const [assign, setAssign] = React.useState(() => ML().loadAssign());
    const [assignNote, setAssignNote] = React.useState('');
    // Pull the shared assignment book (management.monitor_coverage) once per
    // mount; server state wins over the local cache and refreshes it.
    React.useEffect(() => {
      let alive = true;
      ML().fetchCoverage().then((m) => {
        if (!alive) return;
        if (m) { setAssign((prev) => ({ ...prev, ...m })); ML().saveAssign(m); }
        else if (ML().lbcSession()) {
          setAssignNote('Showing cached assignments — server sync unavailable.');
          setTimeout(() => setAssignNote(''), 6000);
        }
      });
      return () => { alive = false; };
    }, []);
    const onAssign = (deskId, val) => {
      const next = { ...assign, [deskId]: val };
      setAssign(next); ML().saveAssign(next);
      ML().saveCoverage(deskId, val).then(
        () => setAssignNote('Assignments published to the team.'),
        (e) => setAssignNote('Kept locally only — publishing needs a management/admin login (' + (e.message || e) + ').')
      );
      setTimeout(() => setAssignNote(''), 6000);
    };
    const openDesk = (id) => { setSubId('all'); setView({ type: 'desk', id }); };
    const equity = md.DESKS.filter((d) => d.group === 'equity');
    const markets = md.DESKS.filter((d) => d.group === 'markets');

    const keyAct = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
    const RailDesk = ({ d }) => (
      <div className={'mon-rail-item desk ' + (view.type === 'desk' && view.id === d.id ? 'active' : '')}
           style={{ ['--ac']: d.accent }} onClick={() => openDesk(d.id)} title={d.short}
           role="button" tabIndex={0} onKeyDown={keyAct(() => openDesk(d.id))}>
        <span className="num">{d.num}</span>
        <span className="lbl">{d.name}</span>
      </div>
    );

    return (
      <div className="mon-root">
        <div className="mon-rail">
          <div className="mon-rail-brand">MONITOR<span className="v">T12</span></div>
          {RAIL_TOP.map((r) => (
            <div key={r.id} className={'mon-rail-item ' + (view.type === r.id ? 'active' : '')}
                 onClick={() => setView({ type: r.id })}
                 role="button" tabIndex={0} onKeyDown={keyAct(() => setView({ type: r.id }))}>
              <span className="glyph">{r.glyph}</span>
              <span className="lbl">{r.label}</span>
            </div>
          ))}
          <div className="mon-rail-sec">Equity desks</div>
          {equity.map((d) => <RailDesk key={d.id} d={d} />)}
          <div className="mon-rail-sec">Market desks</div>
          {markets.map((d) => <RailDesk key={d.id} d={d} />)}
          <div className="mon-rail-foot">Coverage v{md.VERSION}<br />10 + 3 desk model</div>
        </div>
        <div className="mon-body">
          {assignNote && <div className="mon-assign-note">{assignNote}</div>}
          <MonBoundary key={view.type + ':' + (view.id || '')}>
            {view.type === 'coverage' && <CoverageBoard assign={assign} onOpenDesk={openDesk} />}
            {view.type === 'desk' && (
              /* key by desk id so ALL desk-local state (tab, filters, bench) resets on switch */
              <DeskView key={view.id} deskId={view.id} assign={assign} onAssign={onAssign} subId={subId} setSubId={setSubId} />
            )}
            {view.type === 'markets' && <MarketsBoard />}
            {view.type === 'screener' && <ScreenerPage />}
            {view.type === 'news' && <NewswirePage />}
          </MonBoundary>
        </div>
      </div>
    );
  };

  window.MonitorTerminal = MonitorTerminal;
})();
