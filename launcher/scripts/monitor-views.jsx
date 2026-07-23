// ================================================================
// MONITOR · desk-view building blocks (window.MONITOR_VIEWS)
// Constituent quote tables, the Index Lab (custom basket builder),
// TradingView chart/news surfaces, the Economics live-indicator board
// and the Rates curve/spread board. Pure components — the workspace
// shell (monitor-ws.jsx) wires them together.
// ================================================================
(function () {
  'use strict';

  const MD = () => window.MONITOR_DATA;
  const ML = () => window.MONITOR_LIVE;

  const fmtNum = (v, d) => (v == null || isNaN(v)) ? '—'
    : Number(v).toLocaleString('en-US', { minimumFractionDigits: d ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 2 : 0), maximumFractionDigits: d ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 2 : 0) });
  const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  const pctCls = (v) => (v == null || isNaN(v)) ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  const flag = (c) => (MD().COUNTRIES[c] || {}).f || '';

  // ---- TradingView wrappers ----------------------------------------------
  const TV = (props) => {
    const W = window.TVWidget;
    return W ? <W {...props} /> : <div className="mon-chart-empty">TradingView unavailable</div>;
  };

  const TvAdvancedChart = ({ symbol, height }) => (
    <TV kind="advanced-chart" height={height || '100%'} config={{
      autosize: true, symbol, interval: 'D', timezone: 'Asia/Jakarta', theme: 'dark', style: '1',
      locale: 'en', hide_side_toolbar: true, hide_top_toolbar: false, allow_symbol_change: true,
      save_image: false, withdateranges: true, backgroundColor: 'rgba(2,2,3,1)',
      gridColor: 'rgba(151,170,197,0.06)', support_host: 'https://www.tradingview.com',
    }} />
  );

  const TvNews = ({ mode, symbol, market, height }) => (
    <TV kind="timeline" height={height || '100%'} config={
      mode === 'symbol'
        ? { feedMode: 'symbol', symbol, colorTheme: 'dark', isTransparent: true, displayMode: 'regular', width: '100%', height: '100%', locale: 'en' }
        : { feedMode: 'market', market: market || 'stock', colorTheme: 'dark', isTransparent: true, displayMode: 'regular', width: '100%', height: '100%', locale: 'en' }
    } />
  );

  const TvQuotesBoard = ({ groups, height }) => (
    <TV kind="market-quotes" height={height || '100%'} config={{
      width: '100%', height: '100%', colorTheme: 'dark', isTransparent: true, showSymbolLogo: true, locale: 'en',
      symbolsGroups: groups,
    }} />
  );

  const TvFxHeatmap = ({ height }) => (
    <TV kind="forex-cross-rates" height={height || '100%'} config={{
      width: '100%', height: '100%', colorTheme: 'dark', isTransparent: true, locale: 'en',
      currencies: ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'AUD', 'IDR', 'SGD'],
      backgroundColor: 'rgba(2,2,3,0)',
    }} />
  );

  const TvCalendar = ({ height }) => (
    <TV kind="events" height={height || '100%'} config={{
      colorTheme: 'dark', isTransparent: true, width: '100%', height: '100%', locale: 'en',
      importanceFilter: '0,1', countryFilter: 'us,eu,cn,id,jp,gb,kr,in,au',
    }} />
  );

  const TvScreener = ({ market, height }) => (
    <TV kind="screener" height={height || '100%'} config={{
      width: '100%', height: '100%', defaultColumn: 'overview', defaultScreen: 'most_capitalized',
      market, showToolbar: true, colorTheme: 'dark', locale: 'en', isTransparent: true,
    }} />
  );

  const TvTickerTape = () => (
    <TV kind="ticker-tape" height={46} config={{
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' }, { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
        { proName: 'IDX:COMPOSITE', title: 'IDX' }, { proName: 'TVC:DXY', title: 'DXY' },
        { proName: 'FX_IDC:USDIDR', title: 'USD/IDR' }, { proName: 'TVC:US10Y', title: 'US 10Y' },
        { proName: 'TVC:ID10Y', title: 'ID 10Y' }, { proName: 'TVC:GOLD', title: 'Gold' },
        { proName: 'TVC:USOIL', title: 'WTI' }, { proName: 'CAPITALCOM:COPPER', title: 'Copper' },
        { proName: 'BINANCE:BTCUSDT', title: 'BTC' },
      ],
      colorTheme: 'dark', isTransparent: true, showSymbolLogo: true, displayMode: 'adaptive', locale: 'en',
    }} />
  );

  // ---- Detail modal: full Yahoo history + CSV ------------------------------
  const HistoryModal = ({ title, sub, ticker, source, seriesId, onClose }) => {
    const { MultiLineChart, fetchHistory, fetchFred, fetchDbnomics, downloadCsv } = ML();
    const [range, setRange] = React.useState('2y');
    const [obs, setObs] = React.useState(null);
    const [err, setErr] = React.useState('');
    const isYahoo = !source || source === 'YAHOO';
    React.useEffect(() => {
      let alive = true;
      setObs(null); setErr('');
      const p = isYahoo ? fetchHistory(ticker, range === 'max' ? 'max' : range, '1d')
        : source === 'FRED' ? fetchFred(seriesId)
        : source === 'DBNOMICS' ? fetchDbnomics(seriesId)
        : fetchHistory(ticker, range, '1d');
      p.then((o) => {
        if (!alive) return;
        let cut = o;
        if (!isYahoo && range !== 'max') {
          const years = { '1y': 1, '2y': 2, '5y': 5, '10y': 10 }[range] || 2;
          const min = new Date(); min.setFullYear(min.getFullYear() - years);
          const minS = min.toISOString().slice(0, 10);
          cut = o.filter((x) => x.date >= minS);
        }
        setObs(cut);
      }, (e) => alive && setErr(String(e.message || e)));
      return () => { alive = false; };
    }, [ticker, seriesId, range]);
    return (
      <div className="mon-modal-backdrop" onClick={onClose}>
        <div className="mon-modal" onClick={(e) => e.stopPropagation()}>
          <div className="mon-modal-h">
            <div>
              <div className="t">{title}</div>
              <div className="s">{sub || ticker || seriesId}</div>
            </div>
            <div className="mon-modal-actions">
              {['1y', '2y', '5y', '10y', 'max'].map((r) => (
                <button key={r} className={'mon-chip ' + (range === r ? 'active' : '')} onClick={() => setRange(r)}>{r.toUpperCase()}</button>
              ))}
              <button className="mon-chip" onClick={() => obs && downloadCsv((ticker || seriesId) + '.csv', [['date', 'value'], ...obs.map((o) => [o.date, o.value])])}>CSV</button>
              <button className="mon-chip" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="mon-modal-body">
            {err ? <div className="mon-chart-empty">{err}</div>
              : !obs ? <div className="mon-chart-empty">Loading…</div>
              : <MultiLineChart series={[{ label: title, color: 'var(--paper)', points: obs }]} height={340} />}
          </div>
        </div>
      </div>
    );
  };

  // ---- Constituents quote table -------------------------------------------
  const QuoteTable = ({ rows, onOpen }) => {
    const { useQuotes } = ML();
    const [sort, setSort] = React.useState({ k: 'changePct', dir: -1 });
    const tickers = rows.filter((r) => r.t).map((r) => r.t);
    const { quotes, loading } = useQuotes(tickers);
    const enriched = rows.filter((r) => r.t).map((r) => ({ ...r, q: quotes[r.t] || null }));
    const sorted = [...enriched].sort((a, b) => {
      const dir = sort.dir;
      if (sort.k === 'name') return (a.n < b.n ? -1 : 1) * dir;
      if (sort.k === 't') return (a.t < b.t ? -1 : 1) * dir;
      if (sort.k === 'sub') return ((a.sub || '') < (b.sub || '') ? -1 : 1) * dir;
      if (sort.k === 'c') return ((a.c || '') < (b.c || '') ? -1 : 1) * dir;
      const av = a.q && !a.q.error ? a.q[sort.k] : null, bv = b.q && !b.q.error ? b.q[sort.k] : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
    const th = (label, k, num) => (
      <th className={num ? 'num' : ''} onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : num ? -1 : 1 }))}>
        {label}{sort.k === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
      </th>
    );
    return (
      <div className="mon-table-wrap">
        <table className="mon-table">
          <thead>
            <tr>
              {th('Name', 'name')}{th('Ticker', 't')}{th('', 'c')}{th('Sub-industry', 'sub')}
              {th('Last', 'price', 1)}{th('Δ', 'change', 1)}{th('Δ%', 'changePct', 1)}{th('Volume', 'volume', 1)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const q = r.q, err = q && q.error;
              return (
                <tr key={r.t} onClick={() => onOpen && onOpen(r)} title="Open chart + history">
                  <td className="nm">{r.n}</td>
                  <td className="tk">{r.t.replace('.JK', '')}<span className="sfx">{r.t.includes('.JK') ? '.JK' : ''}</span></td>
                  <td className="fl">{flag(r.c)}</td>
                  <td className="sb">{r.sub}</td>
                  <td className="num">{err ? '—' : q ? fmtNum(q.price) : '·'}</td>
                  <td className={'num ' + (q && !err ? pctCls(q.change) : '')}>{err ? '—' : q ? fmtNum(q.change) : '·'}</td>
                  <td className={'num ' + (q && !err ? pctCls(q.changePct) : '')}>{err ? '—' : q ? fmtPct(q.changePct) : '·'}</td>
                  <td className="num dim">{err ? '—' : q && q.volume != null ? Intl.NumberFormat('en', { notation: 'compact' }).format(q.volume) : '·'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="mon-table-note">streaming quotes…</div>}
      </div>
    );
  };

  // ---- Top movers strip ----------------------------------------------------
  // quotes come from the shared Overview batch (OverviewPanel) — this
  // component holds no polling of its own.
  const TopMovers = ({ rows, quotes }) => {
    const scored = rows.filter((r) => r.t && quotes[r.t] && !quotes[r.t].error && quotes[r.t].changePct != null)
      .map((r) => ({ ...r, pct: quotes[r.t].changePct }))
      .sort((a, b) => b.pct - a.pct);
    if (scored.length < 4) return null;
    const up = scored.slice(0, 4), down = scored.slice(-4).reverse();
    const Cell = ({ r }) => (
      <div className="mon-mover">
        <span className="t">{r.t.replace('.JK', '')}</span>
        <span className={'p ' + pctCls(r.pct)}>{fmtPct(r.pct)}</span>
      </div>
    );
    return (
      <div className="mon-movers">
        <div className="col"><div className="h pos">▲ Leaders</div>{up.map((r) => <Cell key={r.t} r={r} />)}</div>
        <div className="col"><div className="h neg">▼ Laggards</div>{down.map((r) => <Cell key={r.t} r={r} />)}</div>
      </div>
    );
  };

  // ---- Index Lab — custom basket builder ----------------------------------
  const IndexLab = ({ desk, accent }) => {
    const { fetchHistory, computeBasket, basketStats, basketCorrelation, overlayStats, MultiLineChart, downloadCsv, loadIndices, saveIndices } = ML();
    const md = MD();
    const deskRows = desk ? md.deskUniverse(desk, 'all', 'ALL', null) : [];
    const [picked, setPicked] = React.useState(() => deskRows.slice(0, 6).filter((r) => r.t).map((r) => r.t));
    const [range, setRange] = React.useState('1y');
    const [overlay, setOverlay] = React.useState(desk && desk.bench && desk.bench.find((b) => b.y) ? desk.bench.find((b) => b.y).y : '');
    const [q, setQ] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [err, setErr] = React.useState('');
    const [saved, setSaved] = React.useState(loadIndices());
    const [name, setName] = React.useState('');
    const [wMode, setWMode] = React.useState('equal');       // 'equal' | 'custom'
    const [wMap, setWMap] = React.useState({});              // ticker -> weight number
    const [showCorr, setShowCorr] = React.useState(false);

    const searchRows = q ? md.searchUniverse(q).slice(0, 12) : deskRows.filter((r) => r.t);
    const toggle = (t) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length >= 20 ? p : [...p, t]));

    const build = React.useCallback(() => {
      if (picked.length < 2) { setErr('Pick at least 2 instruments.'); return; }
      setBusy(true); setErr(''); setResult(null);
      const want = overlay ? [...picked, overlay] : picked;
      Promise.all(want.map((t) => fetchHistory(t, range, '1d').then((o) => [t, o], () => [t, null])))
        .then((pairs) => {
          const map = {}, failed = [];
          pairs.forEach(([t, o]) => {
            if (!picked.includes(t)) return;
            if (o && o.length > 1) map[t] = o;
            else failed.push(t);
          });
          const basket = computeBasket(map, wMode === 'custom' ? wMap : null);
          if (!basket) { setErr('Not enough overlapping history for that selection.' + (failed.length ? ' Failed to load: ' + failed.join(', ') : '')); setBusy(false); return; }
          // surface anything that was silently dropped or has a dead tail
          const endDate = basket.composite[basket.composite.length - 1].date;
          const cutoff = new Date(Date.parse(endDate) - 7 * 86400000).toISOString().slice(0, 10);
          const staleMembers = basket.tickers.filter((t) => basket.lastReal && basket.lastReal[t] < cutoff);
          const warns = [];
          if (failed.length) warns.push('no data for ' + failed.join(', ') + ' — built without them');
          if (staleMembers.length) warns.push('stale feed (>1wk behind): ' + staleMembers.join(', '));
          setErr(warns.length ? 'Heads-up: ' + warns.join(' · ') : '');
          let overlaySeries = null;
          if (overlay) {
            const oPair = pairs.find(([t]) => t === overlay);
            if (oPair && oPair[1] && oPair[1].length > 1) {
              const startDate = basket.composite[0].date;
              const cut = oPair[1].filter((o) => o.date >= startDate);
              if (cut.length > 1) {
                const b0 = cut[0].value;
                overlaySeries = cut.map((o) => ({ date: o.date, value: (o.value / b0) * 100 }));
              }
            }
          }
          setResult({ basket, overlaySeries });
          setBusy(false);
        });
    }, [picked.join(','), range, overlay, wMode, JSON.stringify(wMap)]);

    React.useEffect(() => { if (picked.length >= 2) build(); }, []); // initial build

    const stats = result ? basketStats(result.basket.composite) : null;
    const corrData = result && showCorr ? basketCorrelation(result.basket) : null;
    const ovStats = result && result.overlaySeries ? overlayStats(result.basket.composite, result.overlaySeries) : null;
    const perName = result ? result.basket.tickers.map((t) => {
      const s = result.basket.perName[t];
      return { t, w: result.basket.weights ? result.basket.weights[t] : null, ret: s.length > 1 ? s[s.length - 1].value - 100 : null };
    }).sort((a, b) => (b.ret ?? -999) - (a.ret ?? -999)) : [];

    const saveCurrent = () => {
      if (!name.trim() || picked.length < 2) return;
      const next = [...saved.filter((s) => s.name !== name.trim()), { name: name.trim(), deskId: desk ? desk.id : null, tickers: picked, range, created: new Date().toISOString().slice(0, 10) }];
      setSaved(next); saveIndices(next); setName('');
    };
    const loadSaved = (s) => { setPicked(s.tickers); setRange(s.range || '1y'); };
    const delSaved = (s) => { const next = saved.filter((x) => x.name !== s.name); setSaved(next); saveIndices(next); };

    return (
      <div className="mon-lab">
        <div className="mon-lab-side">
          <div className="mon-lab-h">Constituents <span className="ct">{picked.length}/20</span></div>
          <input className="mon-input" placeholder="Search all desks or type any Yahoo symbol…" value={q}
                 onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && !searchRows.length) { toggle(q.trim().toUpperCase()); setQ(''); } }} />
          <div className="mon-lab-list">
            {searchRows.map((r) => (
              <div key={r.t} className={'mon-lab-row ' + (picked.includes(r.t) ? 'on' : '')} onClick={() => toggle(r.t)}>
                <span className="fl">{flag(r.c)}</span>
                <span className="nm">{r.n}</span>
                <span className="tk">{r.t}</span>
                <span className="pick">{picked.includes(r.t) ? '✓' : '+'}</span>
              </div>
            ))}
            {q && !searchRows.length && (
              <div className="mon-lab-row" onClick={() => { toggle(q.trim().toUpperCase()); setQ(''); }}>
                <span className="nm">Add “{q.trim().toUpperCase()}” (Yahoo symbol)</span><span className="pick">+</span>
              </div>
            )}
          </div>
          {picked.length > 0 && (
            <div className="mon-lab-picked">
              {picked.map((t) => (
                <span key={t} className="mon-lab-pick">
                  <span className="mon-tag" onClick={() => toggle(t)}>{t} ✕</span>
                  {wMode === 'custom' && (
                    <input className="mon-w" type="number" min="0" step="0.5"
                           value={wMap[t] != null ? wMap[t] : 1}
                           onChange={(e) => setWMap({ ...wMap, [t]: parseFloat(e.target.value) || 0 })}
                           title="relative weight (normalized on build)" />
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="mon-lab-save">
            <input className="mon-input" placeholder="Save as… (e.g. LBC Nickel 6)" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="mon-chip" onClick={saveCurrent}>Save</button>
          </div>
          {saved.length > 0 && (
            <div className="mon-lab-saved">
              <div className="mon-lab-h">Saved indices</div>
              {saved.map((s) => (
                <div key={s.name} className="mon-lab-row">
                  <span className="nm" onClick={() => loadSaved(s)} title={s.tickers.join(', ')}>{s.name}</span>
                  <span className="tk">{s.tickers.length}</span>
                  <span className="pick" onClick={() => delSaved(s)}>🗑</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mon-lab-main">
          <div className="mon-lab-toolbar">
            <span className="lbl">Rebased 100</span>
            <button className={'mon-chip ' + (wMode === 'equal' ? 'active' : '')} onClick={() => setWMode('equal')}>Equal-wt</button>
            <button className={'mon-chip ' + (wMode === 'custom' ? 'active' : '')} onClick={() => setWMode('custom')}
                    title="set per-member weights next to the ticker tags">Custom-wt</button>
            {['6mo', '1y', '2y', '5y'].map((r) => (
              <button key={r} className={'mon-chip ' + (range === r ? 'active' : '')} onClick={() => setRange(r)}>{r.toUpperCase()}</button>
            ))}
            <select className="mon-select" value={overlay} onChange={(e) => setOverlay(e.target.value)}>
              <option value="">No benchmark overlay</option>
              {(desk && desk.bench ? desk.bench.filter((b) => b.y) : []).map((b) => <option key={b.y} value={b.y}>{b.label}</option>)}
              <option value="^GSPC">S&P 500</option>
              <option value="^JKSE">IDX Composite</option>
            </select>
            <button className="mon-chip cta" onClick={build} disabled={busy}>{busy ? 'Building…' : 'Build index'}</button>
            {result && (
              <button className="mon-chip" onClick={() => downloadCsv('lbc-custom-index.csv',
                [['date', 'index'], ...result.basket.composite.map((o) => [o.date, o.value.toFixed(4)])])}>CSV</button>
            )}
          </div>
          {err && <div className="mon-warn">{err}</div>}
          {result ? (
            <>
              <MultiLineChart rebased series={[
                { label: 'LBC Custom Index', color: accent || 'var(--paper)', points: result.basket.composite },
                ...(result.overlaySeries ? [{ label: overlay, color: 'rgba(151,170,197,0.85)', points: result.overlaySeries }] : []),
              ]} height={300} />
              {stats && (
                <div className="mon-stats">
                  <div className="st"><span className="k">Period return</span><span className={'v ' + pctCls(stats.ret)}>{fmtPct(stats.ret)}</span></div>
                  <div className="st"><span className="k">Ann. volatility</span><span className="v">{stats.vol.toFixed(1)}%</span></div>
                  <div className="st"><span className="k">Max drawdown</span><span className="v neg">{stats.mdd.toFixed(1)}%</span></div>
                  {ovStats && ovStats.beta != null && (
                    <div className="st"><span className="k">β vs {overlay}</span><span className="v">{ovStats.beta.toFixed(2)}</span></div>
                  )}
                  {ovStats && ovStats.corr != null && (
                    <div className="st"><span className="k">ρ vs {overlay}</span><span className="v">{ovStats.corr.toFixed(2)}</span></div>
                  )}
                  <div className="st"><span className="k">Members</span><span className="v">{result.basket.tickers.length}</span></div>
                  <button className="mon-chip" style={{ alignSelf: 'center' }} onClick={() => setShowCorr(!showCorr)}>
                    {showCorr ? 'Hide correlations' : 'Correlations'}
                  </button>
                </div>
              )}
              <div className="mon-lab-members">
                {perName.map((m) => (
                  <div key={m.t} className="mon-lab-member">
                    <span className="t">{m.t}</span>
                    {m.w != null && wMode === 'custom' && <span className="w">{(m.w * 100).toFixed(0)}%</span>}
                    <span className={'p ' + pctCls(m.ret)}>{m.ret == null ? '—' : fmtPct(m.ret)}</span>
                  </div>
                ))}
              </div>
              {corrData && (
                <div className="mon-corr">
                  <div className="mon-corr-h">
                    Member correlations (daily log-returns · {range.toUpperCase()})
                    {corrData.avg != null && <span className="avg">avg pairwise ρ <b>{corrData.avg.toFixed(2)}</b>{corrData.avg > 0.7 ? ' — low diversification' : corrData.avg < 0.35 ? ' — well diversified' : ''}</span>}
                  </div>
                  <div className="mon-corr-grid" style={{ gridTemplateColumns: '70px repeat(' + corrData.tickers.length + ', 1fr)' }}>
                    <span></span>
                    {corrData.tickers.map((t) => <span key={'h' + t} className="hd">{t.replace('.JK', '')}</span>)}
                    {corrData.tickers.map((a, i) => (
                      <React.Fragment key={a}>
                        <span className="hd row">{a.replace('.JK', '')}</span>
                        {corrData.tickers.map((b, j) => {
                          const v = corrData.matrix[i][j];
                          const bg = v == null ? 'transparent'
                            : v >= 0 ? 'rgba(31,184,119,' + (Math.abs(v) * 0.45).toFixed(2) + ')'
                            : 'rgba(240,71,92,' + (Math.abs(v) * 0.45).toFixed(2) + ')';
                          return <span key={b} className="cell" style={{ background: bg }} title={a + ' × ' + b}>{v == null ? '—' : v.toFixed(2)}</span>;
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : !err && <div className="mon-chart-empty">{busy ? 'Fetching histories…' : 'Pick instruments on the left, then Build index.'}</div>}
        </div>
      </div>
    );
  };

  // ---- Economics desk: live indicator board -------------------------------
  const EconBoard = ({ region, accent }) => {
    const { fetchLiveIndicators, MonSpark } = ML();
    const [rows, setRows] = React.useState(null);
    const [err, setErr] = React.useState('');
    const [detail, setDetail] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      fetchLiveIndicators().then((r) => alive && setRows(r), (e) => alive && setErr(String(e)));
      return () => { alive = false; };
    }, []);
    if (err) return <div className="mon-chart-empty">Failed to load live indicators ({err})</div>;
    if (!rows) return <div className="mon-chart-empty">Loading live indicator book…</div>;
    const mine = rows.filter((r) => r.region === region);
    const cats = [...new Set(mine.map((r) => r.category))];
    return (
      <div className="mon-econ">
        {cats.map((cat) => (
          <div key={cat} className="mon-econ-cat">
            <div className="mon-econ-cat-h">{cat}</div>
            <div className="mon-econ-grid">
              {mine.filter((r) => r.category === cat).map((r) => {
                const spark = (r.spark || []).map((s) => ({ date: s.d, value: s.v }));
                const chg = r.change_pct;
                return (
                  <div key={r.key} className="mon-econ-card" onClick={() => setDetail(r)}>
                    <div className="l">{r.label}</div>
                    <div className="row">
                      <span className="v">{fmtNum(r.latest_value)}<span className="u">{r.unit}</span></span>
                      <MonSpark obs={spark} color={accent || 'var(--brand)'} />
                    </div>
                    <div className="meta">
                      <span className={pctCls(chg)}>{r.change_abs != null ? (r.change_abs >= 0 ? '+' : '') + fmtNum(r.change_abs) : '—'}{chg != null ? ' (' + fmtPct(chg) + ')' : ''}</span>
                      <span className="d">{r.latest_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {detail && (
          <HistoryModal
            title={detail.label} sub={detail.region + ' · ' + detail.source + ' · ' + detail.series_id}
            ticker={detail.series_id} source={detail.source === 'FRED' ? 'FRED' : detail.source === 'DBNOMICS' ? 'DBNOMICS' : 'YAHOO'}
            seriesId={detail.series_id}
            onClose={() => setDetail(null)} />
        )}
      </div>
    );
  };

  // ---- Rates desk: US curve + spreads (FRED) ------------------------------
  const RatesBoard = ({ desk, accent }) => {
    const { fetchFred, MultiLineChart } = ML();
    const [curves, setCurves] = React.useState(null);
    const [spreads, setSpreads] = React.useState(null);
    const hasFred = !!(desk && desk.fred);
    React.useEffect(() => {
      let alive = true;
      const f = desk.fred;
      if (!f) return;
      Promise.all(f.curve.map((c) => fetchFred(c.id).then((o) => [c, o], () => [c, []])))
        .then((pairs) => alive && setCurves(pairs));
      Promise.all(f.spreads.map((c) => fetchFred(c.id).then((o) => [c, o], () => [c, []])))
        .then((pairs) => alive && setSpreads(pairs));
      return () => { alive = false; };
    }, [desk.id]);

    const cut1y = (o) => {
      const min = new Date(); min.setFullYear(min.getFullYear() - 2);
      const s = min.toISOString().slice(0, 10);
      return o.filter((x) => x.date >= s);
    };
    if (!hasFred) return <div className="mon-chart-empty">No curve config for this desk</div>;
    const curveNow = curves ? curves.map(([c, o]) => ({ label: c.label, v: o.length ? o[o.length - 1].value : null, d: o.length ? o[o.length - 1].date : '' })) : [];
    const palette = ['#7fdc9a', '#66c6e8', '#e8c766', '#f26f8f'];
    return (
      <div className="mon-rates">
        <div className="mon-rates-row">
          <div className="mon-panel">
            <div className="mon-panel-h">US Treasury curve <span className="sub">{curveNow.length && curveNow[0].d ? 'FRED · ' + curveNow[0].d : ''}</span></div>
            <div className="mon-curve">
              {curveNow.map((c) => (
                <div key={c.label} className="mon-curve-pt">
                  <div className="v">{c.v != null ? c.v.toFixed(2) + '%' : '—'}</div>
                  <div className="bar" style={{ height: c.v != null ? Math.max(8, c.v * 22) : 4, background: accent }}></div>
                  <div className="k">{c.label.replace('US ', '')}</div>
                </div>
              ))}
            </div>
            <div className="mon-panel-h" style={{ marginTop: 12 }}>Yield history (2Y window)</div>
            {curves ? (
              <MultiLineChart series={curves.map(([c, o], i) => ({ label: c.label, color: palette[i % palette.length], points: cut1y(o) }))} height={220} yFmt={(v) => v.toFixed(1) + '%'} />
            ) : <div className="mon-chart-empty">Loading FRED curve…</div>}
          </div>
          <div className="mon-panel">
            <div className="mon-panel-h">Curve & credit spreads</div>
            {spreads ? spreads.map(([c, o], i) => (
              <div key={c.id} className="mon-spread">
                <div className="k">{c.label} <span className="v">{o.length ? o[o.length - 1].value.toFixed(2) + '%' : '—'}</span></div>
                <MultiLineChart series={[{ label: c.label, color: palette[i % palette.length], points: cut1y(o) }]} height={110} yFmt={(v) => v.toFixed(1)} />
              </div>
            )) : <div className="mon-chart-empty">Loading spreads…</div>}
          </div>
        </div>
      </div>
    );
  };

  // Rolling regime-score sparkline: bars colored by sign, ±1 band.
  const RegimeSpark = ({ points, w = 120, h = 22 }) => {
    const bw = Math.max(1, Math.floor(w / points.length) - 1);
    const mid = h / 2;
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <line x1="0" x2={w} y1={mid} y2={mid} stroke="rgba(232,228,217,0.18)" strokeWidth="1" />
        {points.map((p, i) => {
          const x = (i / points.length) * w;
          const hh = Math.max(1, Math.abs(p.score) * (h / 2 - 1));
          return (
            <rect key={p.date} x={x} width={bw}
                  y={p.score >= 0 ? mid - hh : mid}
                  height={hh}
                  fill={p.score >= 0.3 ? 'var(--pos, #1FB877)' : p.score <= -0.3 ? 'var(--neg, #F0475C)' : '#d8a13a'}
                  opacity={0.35 + Math.min(0.65, Math.abs(p.score))} />
          );
        })}
      </svg>
    );
  };

  // ---- Regime strip --------------------------------------------------------
  // Cross-asset Risk-On/Off composite + component chips + condition flags.
  const RegimeStrip = ({ compact }) => {
    const { useRegime } = ML();
    const { regime, err } = useRegime();
    if (err) return null;
    if (!regime) return <div className="mon-regime mon-regime-loading">Reading the tape — credit, vol, USD, curve, growth…</div>;
    const cls = regime.label === 'RISK-ON' ? 'on' : regime.label === 'RISK-OFF' ? 'off' : 'mid';
    const pct = ((regime.score + 1) / 2) * 100; // gauge position
    return (
      <div className={'mon-regime ' + cls + (compact ? ' compact' : '')}>
        <div className="mon-regime-head">
          <span className={'mon-regime-label ' + cls}>{regime.label}</span>
          <span className="mon-regime-gauge" title={'composite ' + regime.score.toFixed(2) + ' (−1 risk-off … +1 risk-on)'}>
            <span className="track"></span>
            <span className="mid"></span>
            <span className="needle" style={{ left: pct + '%' }}></span>
          </span>
          <span className="mon-regime-score">{(regime.score >= 0 ? '+' : '') + regime.score.toFixed(2)}</span>
          {regime.history && regime.history.points.length > 5 && (
            <span className="mon-regime-hist" title={'composite score, last ' + regime.history.points.length + ' sessions'}>
              <RegimeSpark points={regime.history.points} />
              <span className="streak">{regime.history.streak} session{regime.history.streak === 1 ? '' : 's'} in {regime.history.label.toLowerCase()}</span>
            </span>
          )}
          {regime.flags.map((f) => <span key={f} className="mon-regime-flag">{f}</span>)}
          <span className="mon-regime-asof">as of {regime.asOf}</span>
        </div>
        {!compact && (
          <div className="mon-regime-comps">
            {regime.components.map((c) => (
              <span key={c.key} className={'mon-regime-comp ' + (c.score > 0.15 ? 'pos' : c.score < -0.15 ? 'neg' : '')}
                    title={c.note + ' · score ' + (c.score >= 0 ? '+' : '') + c.score.toFixed(2)}>
                <span className="k">{c.label}</span>
                <span className="v">{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ---- Desk pulse — momentum / relative strength / breadth today ----------
  // quotes come from the shared Overview batch (OverviewPanel).
  const DeskPulse = ({ desk, quotes }) => {
    const { useDeskSignals } = ML();
    const benchY = (desk.bench || []).find((b) => b.y);
    const sig = useDeskSignals(benchY ? benchY.y : null);
    const br = window.MONITOR_REGIME ? window.MONITOR_REGIME.breadth(quotes || {}) : null;
    if (!sig && !br) return null;
    const momCls = sig && (sig.momentum === 'strong' || sig.momentum === 'up') ? 'pos' : sig && (sig.momentum === 'weak' || sig.momentum === 'down') ? 'neg' : '';
    const rsCls = sig && sig.rs === 'leader' ? 'pos' : sig && sig.rs === 'laggard' ? 'neg' : '';
    return (
      <div className="mon-pulse">
        <span className="mon-pulse-t">Desk pulse</span>
        {sig && sig.r1m != null && (
          <span className={'mon-pulse-item ' + momCls} title={benchY.label + ' — 1M / 3M benchmark return'}>
            Momentum <b>{fmtPct(sig.r1m)}</b> 1M · <b>{fmtPct(sig.r3m)}</b> 3M
          </span>
        )}
        {sig && sig.rs && (
          <span className={'mon-pulse-item ' + rsCls} title={'benchmark 1M return minus S&P 500 1M'}>
            RS vs S&P <b>{fmtPct(sig.rsDiff)}</b> · {sig.rs}
          </span>
        )}
        {br && (
          <span className={'mon-pulse-item ' + (br.advPct >= 60 ? 'pos' : br.advPct <= 40 ? 'neg' : '')}
                title={'today: ' + br.adv + ' up / ' + br.dec + ' down of ' + br.tot + ' quoted · median ' + fmtPct(br.median)}>
            Breadth <b>{br.advPct.toFixed(0)}%</b> adv · {br.bigUp}▲ {br.bigDown}▼ &gt;2%
          </span>
        )}
      </div>
    );
  };

  // ---- Desk dossier drawer -------------------------------------------------
  const DossierDrawer = ({ desk, onClose }) => {
    const d = desk.dossier || {};
    const F = [
      ['Mandate', d.mandate], ['Macro drivers', d.macro], ['Research themes', d.themes],
      ['Fundamental factors', d.factors], ['Valuation toolkit', d.valuation],
      ['Regulatory watch', d.regulation], ['Analytical complexity', d.complexity],
    ];
    return (
      <div className="mon-drawer-backdrop" onClick={onClose}>
        <div className="mon-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="mon-drawer-h">
            <div>
              <span className="num" style={{ color: desk.accent }}>{desk.num}</span>
              <span className="t">{desk.name}</span>
            </div>
            <button className="mon-chip" onClick={onClose}>✕</button>
          </div>
          <div className="mon-drawer-gics">{desk.gics !== '—' ? 'GICS: ' + desk.gics : 'Market desk (non-GICS)'}</div>
          {F.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="mon-drawer-sec">
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
          <div className="mon-drawer-foot">From the LBC Research Division Coverage Design (Jul 2026) — 17-point desk profile, condensed.</div>
        </div>
      </div>
    );
  };

  // ---- Assignment editor ---------------------------------------------------
  const AssignEditor = ({ desk, assign, onSave, onClose }) => {
    const { fetchRoster } = ML();
    const [roster, setRoster] = React.useState([]);
    const cur = assign[desk.id] || { head: '', analysts: [] };
    const [head, setHead] = React.useState(cur.head || '');
    const [analysts, setAnalysts] = React.useState(cur.analysts || []);
    const [manual, setManual] = React.useState('');
    React.useEffect(() => { let a = true; fetchRoster().then((r) => a && setRoster(r || [])); return () => { a = false; }; }, []);
    const names = roster.map((r) => r.full_name || r.username);
    const addAnalyst = (n) => { if (n && !analysts.includes(n)) setAnalysts([...analysts, n]); };
    return (
      <div className="mon-modal-backdrop" onClick={onClose}>
        <div className="mon-modal mon-modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="mon-modal-h">
            <div><div className="t">Assign · {desk.name}</div><div className="s">Synced team-wide via Supabase (management/admin can publish; others keep a local copy).</div></div>
            <button className="mon-chip" onClick={onClose}>✕</button>
          </div>
          <div className="mon-modal-body">
            <div className="mon-form-row">
              <label>Desk head</label>
              <input className="mon-input" list="mon-roster" value={head} onChange={(e) => setHead(e.target.value)} placeholder="name…" />
            </div>
            <div className="mon-form-row">
              <label>Analysts</label>
              <div className="mon-tags">
                {analysts.map((a) => <span key={a} className="mon-tag" onClick={() => setAnalysts(analysts.filter((x) => x !== a))}>{a} ✕</span>)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="mon-input" list="mon-roster" value={manual} onChange={(e) => setManual(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') { addAnalyst(manual.trim()); setManual(''); } }} placeholder="add analyst + Enter" />
                <button className="mon-chip" onClick={() => { addAnalyst(manual.trim()); setManual(''); }}>Add</button>
              </div>
              <datalist id="mon-roster">{names.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="mon-chip" onClick={onClose}>Cancel</button>
              <button className="mon-chip cta" onClick={() => { onSave(desk.id, { head: head.trim(), analysts }); onClose(); }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  window.MONITOR_VIEWS = {
    TvAdvancedChart, TvNews, TvQuotesBoard, TvFxHeatmap, TvCalendar, TvScreener, TvTickerTape,
    HistoryModal, QuoteTable, TopMovers, IndexLab, EconBoard, RatesBoard, DossierDrawer, AssignEditor,
    RegimeStrip, DeskPulse,
    fmtNum, fmtPct, pctCls, flag,
  };
})();
