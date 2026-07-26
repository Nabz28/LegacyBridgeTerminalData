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

  // Escape closes any modal/drawer that mounts this hook.
  const useEscape = (onClose) => {
    React.useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
  };

  const fmtNum = (v, d) => (v == null || isNaN(v)) ? '—'
    : Number(v).toLocaleString('en-US', { minimumFractionDigits: d ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 2 : 0), maximumFractionDigits: d ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 2 : 0) });
  const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  const pctCls = (v) => (v == null || isNaN(v)) ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  const flag = (c) => (MD().COUNTRIES[c] || {}).f || '';

  // ---- TradingView wrappers ----------------------------------------------
  // Symbols the FREE anonymous embed refuses to render ("only available on
  // TradingView"): every non-US TVC sovereign yield + all FX_IDC pairs in
  // chart embeds (the macro terminal learned this list the hard way). For
  // these we fall back to our own Yahoo chart or a deep link.
  const TV_EMBED_BLOCK = new Set([
    'TVC:JP10Y', 'TVC:DE10Y', 'TVC:GB10Y', 'TVC:ID10Y', 'TVC:CN10Y', 'TVC:IN10Y',
    'TVC:BR10Y', 'TVC:FR10Y', 'TVC:IT10Y', 'TVC:AU10Y', 'TVC:CA10Y', 'TVC:KR10Y',
    'TVC:MX10Y', 'TVC:TR10Y', 'TVC:US02Y',
  ]);
  const tvEmbeddable = (sym) => !!sym && !TV_EMBED_BLOCK.has(sym) && !sym.startsWith('FX_IDC:');
  const tvDeepLink = (sym) => 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(sym);

  const TV = (props) => {
    const W = window.TVWidget;
    return W ? <W {...props} /> : <div className="mon-chart-empty">TradingView unavailable</div>;
  };

  const TvAdvancedChart = ({ symbol, height }) => {
    if (!tvEmbeddable(symbol)) {
      return (
        <div className="mon-chart-empty" style={{ flexDirection: 'column', gap: 10 }}>
          <div>{symbol} is restricted in free TradingView embeds.</div>
          <a className="mon-chip" href={tvDeepLink(symbol)} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>Open in TradingView ↗</a>
        </div>
      );
    }
    return (
      <TV kind="advanced-chart" height={height || '100%'} config={{
        autosize: true, symbol, interval: 'D', timezone: 'Asia/Jakarta', theme: 'dark', style: '1',
        locale: 'en', hide_side_toolbar: true, hide_top_toolbar: false, allow_symbol_change: true,
        save_image: false, withdateranges: true, backgroundColor: 'rgba(2,2,3,1)',
        gridColor: 'rgba(151,170,197,0.06)', support_host: 'https://www.tradingview.com',
      }} />
    );
  };

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
    useEscape(onClose);
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
          const days = { '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 731, '5y': 1827, '10y': 3653 }[range] || 731;
          const minS = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
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
              {['1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'].map((r) => (
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
  const RET_COLS = [['r3d', '3D'], ['r1w', '1W'], ['r2w', '2W'], ['r1m', '1M']];
  // fundamentals columns (4.4): USD mcap; P/E and P/B derived in LOCAL
  // currency (both sides share it, so the ratios need no FX); Yahoo beta.
  const FUND_COLS = [['mcapUsd', 'Mcap $'], ['pe', 'P/E'], ['pb', 'P/B'], ['fbeta', 'β']];
  const QuoteTable = ({ rows, onOpen, withFundamentals }) => {
    const { useQuotes, useReturns } = ML();
    const [sort, setSort] = React.useState({ k: 'changePct', dir: -1 });
    const [fundOn, setFundOn] = React.useState(false);
    const [funds, setFunds] = React.useState({});
    const [fundBusy, setFundBusy] = React.useState(false);
    const tickers = rows.filter((r) => r.t).map((r) => r.t);
    const { quotes, loading } = useQuotes(tickers);
    const rets = useReturns(rows);
    const RETK = new Set(RET_COLS.map(([k]) => k));
    const FUNDK = new Set(FUND_COLS.map(([k]) => k));
    const loadFunds = () => {
      if (fundBusy) return;
      setFundOn(true); setFundBusy(true);
      const L = ML();
      const list = tickers.slice(0, 80);
      Promise.all(list.map((t) =>
        L.fetchFundamentals(t).then((f) => {
          // Yahoo's own ratios first; statement-derived fallbacks second
          const ni = f.pretaxIncome != null && f.taxProvision != null ? f.pretaxIncome - f.taxProvision : null;
          const base = {
            pe: f.trailingPE != null ? f.trailingPE : (f.marketCap && ni > 0 ? f.marketCap / ni : null),
            pb: f.priceToBook != null ? f.priceToBook : (f.marketCap && f.totalEquityBook > 0 ? f.marketCap / f.totalEquityBook : null),
            fbeta: f.yahooBeta != null ? f.yahooBeta : null,
          };
          return [t, base, f.marketCap ? f : null];
        }, () => [t, null, null])
      )).then(async (triples) => {
        // USD conversion only for the mcap column (ratios are FX-free)
        const out = {};
        for (const [t, base, f] of triples) {
          if (!base) { out[t] = { error: true }; continue; }
          let mcapUsd = null;
          if (f && f.marketCap) {
            try { const r = await ML().usdRate(f.currency); mcapUsd = r ? f.marketCap * r : null; } catch {}
          }
          out[t] = { ...base, mcapUsd };
        }
        setFunds(out); setFundBusy(false);
      });
    };
    const enriched = rows.filter((r) => r.t).map((r) => ({ ...r, q: quotes[r.t] || null, rr: rets[r.t] || null, f: funds[r.t] || null }));
    const sorted = [...enriched].sort((a, b) => {
      const dir = sort.dir;
      if (sort.k === 'name') return (a.n < b.n ? -1 : 1) * dir;
      if (sort.k === 't') return (a.t < b.t ? -1 : 1) * dir;
      if (sort.k === 'sub') return ((a.sub || '') < (b.sub || '') ? -1 : 1) * dir;
      if (sort.k === 'c') return ((a.c || '') < (b.c || '') ? -1 : 1) * dir;
      const pick = (x) => RETK.has(sort.k)
        ? (x.rr ? x.rr[sort.k] : null)
        : FUNDK.has(sort.k)
          ? (x.f && !x.f.error ? x.f[sort.k] : null)
          : (x.q && !x.q.error ? x.q[sort.k] : null);
      const av = pick(a), bv = pick(b);
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
    const nCols = 11 + (fundOn ? FUND_COLS.length : 0);
    return (
      <div className="mon-table-wrap">
        {loading && <div className="mon-table-note top">streaming quotes…</div>}
        {withFundamentals && (
          <div className="mon-table-note top">
            <span className="mon-tag" onClick={() => (fundOn ? setFundOn(false) : loadFunds())} role="button" tabIndex={0}>
              {fundBusy ? 'loading fundamentals…' : fundOn ? 'hide fundamentals' : '+ fundamentals (mcap · P/E · P/B · β)'}
            </span>
            {fundOn && !fundBusy && ' P/E and P/B derived from Yahoo statements in local currency · mcap converted to USD · β vs local index'}
          </div>
        )}
        <table className="mon-table">
          <thead>
            <tr>
              {th('Name', 'name')}{th('Ticker', 't')}{th('', 'c')}{th('Sub-industry', 'sub')}
              {th('Last', 'price', 1)}{th('1D%', 'changePct', 1)}
              {RET_COLS.map(([k, l]) => <React.Fragment key={k}>{th(l, k, 1)}</React.Fragment>)}
              {fundOn && FUND_COLS.map(([k, l]) => <React.Fragment key={k}>{th(l, k, 1)}</React.Fragment>)}
              {th('Volume', 'volume', 1)}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={nCols} style={{ textAlign: 'center', padding: '22px 10px', color: 'var(--text-tertiary)' }}>
                No instruments match this filter.
              </td></tr>
            )}
            {sorted.map((r) => {
              const q = r.q, err = q && q.error;
              return (
                <tr key={r.t} onClick={() => onOpen && onOpen(r)}
                    title={err ? r.n + ' — quote unavailable (click for history)' : r.n + ' — open chart + history'}>
                  <td className="nm" title={r.n}>{r.n}</td>
                  <td className="tk">{r.t.replace('.JK', '')}<span className="sfx">{r.t.includes('.JK') ? '.JK' : ''}</span></td>
                  <td className="fl">{flag(r.c)}</td>
                  <td className="sb">{r.sub}</td>
                  <td className="num">{err ? '—' : q ? fmtNum(q.price) : '·'}</td>
                  <td className={'num ' + (q && !err ? pctCls(q.changePct) : '')}>{err ? '—' : q ? fmtPct(q.changePct) : '·'}</td>
                  {RET_COLS.map(([k]) => {
                    const v = r.rr ? r.rr[k] : null;
                    return <td key={k} className={'num ' + pctCls(v)}>{v == null ? '·' : fmtPct(v)}</td>;
                  })}
                  {fundOn && FUND_COLS.map(([k]) => {
                    const f = r.f && !r.f.error ? r.f[k] : null;
                    let txt = '·';
                    if (f != null) {
                      if (k === 'mcapUsd') txt = '$' + Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(f);
                      else if (k === 'fbeta') txt = f.toFixed(2);
                      else txt = f > 200 ? '>200' : f.toFixed(1);
                    } else if (r.f && !fundBusy) txt = '—';
                    return <td key={k} className="num dim">{txt}</td>;
                  })}
                  <td className="num dim">{err ? '—' : q && q.volume != null ? Intl.NumberFormat('en', { notation: 'compact' }).format(q.volume) : '·'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ---- Top movers strip ----------------------------------------------------
  // quotes come from the shared Overview batch (OverviewPanel) — this
  // component holds no polling of its own.
  const TopMovers = ({ rows, quotes, flow }) => {
    const scored = rows.filter((r) => r.t && quotes[r.t] && !quotes[r.t].error && quotes[r.t].changePct != null)
      .map((r) => ({ ...r, pct: quotes[r.t].changePct }))
      .sort((a, b) => b.pct - a.pct);
    if (scored.length < 4) return null;
    const up = scored.slice(0, 4), down = scored.slice(-4).reverse();
    const Cell = ({ r }) => {
      const vf = flow && flow.perName && flow.perName[r.t];
      const surge = vf && vf.rvol >= 1.8;
      return (
        <div className="mon-mover" title={surge ? r.n + ' — ' + vf.rvol.toFixed(1) + '× average volume' : r.n}>
          <span className="t">{r.t.replace('.JK', '')}</span>
          <span className={'p ' + pctCls(r.pct)}>{fmtPct(r.pct)}</span>
          {surge && <span className="vf">⚡{vf.rvol.toFixed(1)}×</span>}
        </div>
      );
    };
    return (
      <div className="mon-movers">
        <div className="col"><div className="h pos">▲ Leaders</div>{up.map((r) => <Cell key={r.t} r={r} />)}</div>
        <div className="col"><div className="h neg">▼ Laggards</div>{down.map((r) => <Cell key={r.t} r={r} />)}</div>
      </div>
    );
  };

  // ---- Index Lab — custom basket builder ----------------------------------
  // filterRows/filterLabel come from DeskView: the region/country/sub-industry
  // filters DRIVE the picker (the #1 confusion in v2 was that they didn't).
  const IndexLab = ({ desk, accent, filterRows, filterLabel }) => {
    const { fetchHistory, computeBasket, basketStats, basketCorrelation, overlayStats, MultiLineChart, downloadCsv, loadIndices, saveIndices, fetchMcapWeights, fetchTemplates, saveTemplate, lbcSession } = ML();
    const md = MD();
    const deskRows = desk ? md.deskUniverse(desk, 'all', 'ALL', null) : [];
    const scopedRows = (filterRows && filterRows.length ? filterRows : deskRows).filter((r) => r.t);
    const [useFilters, setUseFilters] = React.useState(true);
    const pickerRows = useFilters ? scopedRows : deskRows.filter((r) => r.t);
    const [picked, setPicked] = React.useState(() => scopedRows.slice(0, 6).map((r) => r.t));
    const [range, setRange] = React.useState('1y');
    const [overlay, setOverlay] = React.useState(desk && desk.bench && desk.bench.find((b) => b.y) ? desk.bench.find((b) => b.y).y : '');
    const [q, setQ] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [err, setErr] = React.useState('');
    const [saved, setSaved] = React.useState(loadIndices());
    const [name, setName] = React.useState('');
    const [wMode, setWMode] = React.useState('equal');       // 'equal' | 'custom' | 'mcap'
    const [wMap, setWMap] = React.useState({});              // ticker -> weight in PERCENT (custom)
    const [showCorr, setShowCorr] = React.useState(false);
    // pinned comparison indices: build one, pin it, build the next — the
    // chart overlays every pinned composite next to the current build.
    const [pinned, setPinned] = React.useState([]);          // [{name, color, composite}]
    const PIN_COLORS = ['#D8A13A', '#1FB877', '#F0475C', '#B48EAD'];

    // custom weights are expressed in percent (they get normalized anyway, so
    // 100 is just the natural scale) — seed equal percents so the inputs never
    // show a bare "1"
    const equalPct = (n) => +(100 / Math.max(1, n)).toFixed(1);
    const seedPercents = (tickers) => {
      const eq = equalPct(tickers.length), out = {};
      tickers.forEach((t) => { out[t] = eq; });
      return out;
    };
    const weightsToPercents = (tickers, weights) => {
      if (!weights) return seedPercents(tickers);
      const valid = tickers.map((t) => Number(weights[t])).filter((v) => v > 0);
      if (!valid.length) return seedPercents(tickers);
      // members missing from the stored map get the AVERAGE raw weight so the
      // shown percents always cover the whole basket and sum to ~100
      const fallback = valid.reduce((a, v) => a + v, 0) / valid.length;
      const raw = {}; let sum = 0;
      tickers.forEach((t) => { raw[t] = Number(weights[t]) > 0 ? Number(weights[t]) : fallback; sum += raw[t]; });
      const out = {};
      tickers.forEach((t) => { out[t] = +((raw[t] / sum) * 100).toFixed(1); });
      return out;
    };
    const pickWMode = (k) => {
      setWMode(k);
      if (k === 'custom') setWMap((m) => (Object.keys(m).length ? m : seedPercents(picked)));
    };

    // global template library (management.monitor_templates, made_by attribution)
    const [templates, setTemplates] = React.useState([]);
    const [tplId, setTplId] = React.useState('');
    const [tplOpen, setTplOpen] = React.useState(false);
    React.useEffect(() => {
      let alive = true;
      fetchTemplates().then((rows) => alive && setTemplates(rows || []));
      return () => { alive = false; };
    }, []);
    const applyTemplate = (id) => {
      const tpl = templates.find((x) => x.id === id);
      if (!tpl) return;
      setTplId(id);
      const tks = (tpl.tickers || []).slice(0, 20);
      setPicked(tks);
      const mode = tpl.w_mode === 'mcap' ? 'mcap' : tpl.w_mode === 'custom' ? 'custom' : 'equal';
      setWMode(mode);
      setWMap(mode === 'custom' ? weightsToPercents(tks, tpl.weights) : {});
    };
    const tplGroups = React.useMemo(() => {
      const mine = templates.filter((t) => t.desk_id === (desk && desk.id));
      const rest = templates.filter((t) => t.desk_id !== (desk && desk.id));
      return { mine, rest };
    }, [templates, desk && desk.id]);

    // saved indices sync to management.monitor_prefs (server wins on load;
    // every save/delete pushes the doc back; logged-out stays local-only)
    React.useEffect(() => {
      let alive = true;
      ML().fetchPrefs().then((doc) => {
        if (alive && doc && Array.isArray(doc.indices)) { setSaved(doc.indices); saveIndices(doc.indices); }
      });
      return () => { alive = false; };
    }, []);
    const persistSaved = (next) => {
      setSaved(next); saveIndices(next);
      ML().savePrefs({ indices: next }).catch(() => {});
    };

    const searchRows = q ? md.searchUniverse(q).slice(0, 14) : pickerRows;
    const toggle = (t) => setPicked((p) => {
      if (p.includes(t)) return p.filter((x) => x !== t);
      if (p.length >= 20) return p;
      // a member added while in custom mode gets an equal-percent slot, not a
      // near-zero orphan weight
      if (wMode === 'custom') setWMap((m) => (m[t] != null ? m : { ...m, [t]: equalPct(p.length + 1) }));
      return [...p, t];
    });
    const addAll = () => setPicked((p) => {
      const next = [...p];
      pickerRows.forEach((r) => { if (!next.includes(r.t) && next.length < 20) next.push(r.t); });
      return next;
    });

    const build = React.useCallback(() => {
      if (picked.length < 1) { setErr('Pick at least 1 instrument.'); return; }
      setBusy(true); setErr(''); setResult(null);
      const want = overlay ? [...picked, overlay] : picked;
      // mcap mode resolves USD market caps first (missing members are
      // EXCLUDED with a warning — never silently equal-weighted).
      // custom percents are resolved to a FULL map so a member without an
      // input value gets an equal share, matching the preview exactly.
      const customW = wMode === 'custom'
        ? picked.reduce((o, t) => { o[t] = Number(wMap[t]) > 0 ? Number(wMap[t]) : equalPct(picked.length); return o; }, {})
        : null;
      const weightsP = wMode === 'mcap' ? fetchMcapWeights(picked)
        : Promise.resolve({ weights: customW, missing: [] });
      Promise.all([
        weightsP,
        Promise.all(want.map((t) => fetchHistory(t, range, '1d').then((o) => [t, o], () => [t, null]))),
      ]).then(([wres, pairs]) => {
          const mcapMissing = wMode === 'mcap' ? wres.missing : [];
          const usable = wMode === 'mcap' ? picked.filter((t) => !mcapMissing.includes(t)) : picked;
          const map = {}, failed = [];
          pairs.forEach(([t, o]) => {
            if (!usable.includes(t)) return;
            if (o && o.length > 1) map[t] = o;
            else failed.push(t);
          });
          const basket = computeBasket(map, wres.weights);
          if (!basket) { setErr('Not enough overlapping history for that selection.' + (failed.length ? ' Failed to load: ' + failed.join(', ') : '')); setBusy(false); return; }
          // surface anything that was dropped or has a dead tail
          const endDate = basket.composite[basket.composite.length - 1].date;
          const cutoff = new Date(Date.parse(endDate) - 7 * 86400000).toISOString().slice(0, 10);
          const staleMembers = basket.tickers.filter((t) => basket.lastReal && basket.lastReal[t] < cutoff);
          const warns = [];
          if (failed.length) warns.push('no data for ' + failed.join(', ') + ' — built without them');
          if (mcapMissing.length) warns.push('no market cap for ' + mcapMissing.join(', ') + ' — excluded from the cap-weighted basket');
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
          setBuiltKey(picked.join(',') + '|' + range + '|' + overlay + '|' + wMode + '|' + JSON.stringify(wMap));
          setBusy(false);
        });
    }, [picked.join(','), range, overlay, wMode, JSON.stringify(wMap)]);

    React.useEffect(() => { if (picked.length >= 1) build(); }, []); // initial build

    const stats = result ? basketStats(result.basket.composite) : null;
    // risk lab (4.5): python-reference-gated stats on the built composite
    const risk = result && window.MONITOR_REGIME ? window.MONITOR_REGIME.riskStats(result.basket.composite) : null;
    const corrData = result && showCorr ? basketCorrelation(result.basket) : null;
    const ovStats = result && result.overlaySeries ? overlayStats(result.basket.composite, result.overlaySeries) : null;
    const perName = result ? result.basket.tickers.map((t) => {
      const s = result.basket.perName[t];
      return { t, w: result.basket.weights ? result.basket.weights[t] : null, ret: s.length > 1 ? s[s.length - 1].value - 100 : null };
    }).sort((a, b) => (b.ret ?? -999) - (a.ret ?? -999)) : [];

    const saveCurrent = () => {
      if (!name.trim() || picked.length < 1) return;
      const next = [...saved.filter((s) => s.name !== name.trim()),
        { name: name.trim(), deskId: desk ? desk.id : null, tickers: picked, range,
          wMode, wMap: wMode === 'custom' ? wMap : undefined, created: new Date().toISOString().slice(0, 10) }];
      persistSaved(next); setName('');
    };
    const loadSaved = (s) => {
      setPicked(s.tickers); setRange(s.range || '1y');
      const mode = s.wMode === 'custom' ? 'custom' : 'equal';
      setWMode(mode);
      setWMap(mode === 'custom' ? weightsToPercents(s.tickers, s.wMap) : {});
    };
    const delSaved = (s) => {
      if (!window.confirm('Delete saved index "' + s.name + '"? This also removes it from your account.')) return;
      persistSaved(saved.filter((x) => x.name !== s.name));
    };
    // built-vs-current mismatch → the shown result is stale
    const [builtKey, setBuiltKey] = React.useState('');
    const currentKey = picked.join(',') + '|' + range + '|' + overlay + '|' + wMode + '|' + JSON.stringify(wMap);
    const resultStale = result && builtKey && builtKey !== currentKey;

    // live weight preview for the basket panel (mirrors computeBasket's math)
    const previewW = React.useMemo(() => {
      if (!picked.length) return {};
      if (wMode === 'custom') {
        const raw = {}; let sum = 0;
        picked.forEach((t) => { raw[t] = Number(wMap[t]) > 0 ? Number(wMap[t]) : equalPct(picked.length); sum += raw[t]; });
        const out = {}; picked.forEach((t) => { out[t] = raw[t] / sum; });
        return out;
      }
      if (wMode === 'mcap') return null; // resolved at build time
      const eq = 1 / picked.length, out = {};
      picked.forEach((t) => { out[t] = eq; });
      return out;
    }, [picked.join(','), wMode, JSON.stringify(wMap)]);
    const rowMeta = (t) => md.searchUniverse(t).find((r) => r.t === t) || { n: t, c: null };

    // pin the current build for side-by-side comparison (max 4)
    const pinCurrent = () => {
      if (!result || pinned.length >= PIN_COLORS.length) return;
      const nm = (name.trim() || (result.basket.tickers.length === 1
        ? (rowMeta(result.basket.tickers[0]).n || result.basket.tickers[0])
        : 'Index ' + (pinned.length + 1) + ' (' + result.basket.tickers.length + ')')).slice(0, 40);
      setPinned([...pinned, { name: nm, color: PIN_COLORS[pinned.length], composite: result.basket.composite }]);
    };
    // every pinned composite is cut to the current window and re-based to 100
    // at its first visible point, so all lines are honestly comparable.
    const chartSeries = result ? [
      { label: result.basket.tickers.length === 1 ? (rowMeta(result.basket.tickers[0]).n || result.basket.tickers[0]) : 'LBC Custom Index',
        color: accent || 'var(--paper)', points: result.basket.composite },
      ...pinned.map((p) => {
        const start = result.basket.composite[0].date;
        const cut = p.composite.filter((o) => o.date >= start);
        if (cut.length < 2) return null;
        const b0 = cut[0].value;
        return { label: p.name, color: p.color, points: cut.map((o) => ({ date: o.date, value: (o.value / b0) * 100 })) };
      }).filter(Boolean),
      ...(result.overlaySeries ? [{ label: overlay, color: 'rgba(151,170,197,0.85)', points: result.overlaySeries }] : []),
    ] : [];
    // instant momentum readout above the chart: trailing returns per series
    const retOf = (pts, k) => {
      const n = pts.length;
      if (n <= k) return null;
      const a = pts[n - 1 - k].value, b = pts[n - 1].value;
      return Math.abs(a) > 1e-9 ? (b / a - 1) * 100 : null;
    };

    // publish the current basket as a GLOBAL template (made_by attribution)
    const publishTemplate = () => {
      const nm = window.prompt('Template name (visible to the whole team):', name || '');
      if (!nm || !nm.trim() || picked.length < 1) return;
      const note = window.prompt('One-line note (what is this basket?):', '') || '';
      const s = lbcSession();
      const madeBy = (s && s.user && (s.user.full_name || s.user.username)) || 'unknown';
      const id = nm.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const row = { id, name: nm.trim(), desk_id: desk ? desk.id : null, tickers: picked,
        weights: wMode === 'custom' ? wMap : null, w_mode: wMode, note, made_by: madeBy };
      saveTemplate(row).then(
        () => { setTemplates((ts) => [...ts.filter((x) => x.id !== id), { ...row, updated_at: new Date().toISOString() }]); setTplId(id); setErr('Template "' + nm.trim() + '" published to the team.'); },
        (e) => setErr('Publish failed (' + (e.message || e) + ').')
      );
    };

    return (
      <div className="mon-lab-wrap">
        {/* ---- template bar — the fast path to a working index ---- */}
        <div className="mon-tpl-bar">
          <span className="t">Templates</span>
          <select className="mon-select" value={tplId} onChange={(e) => applyTemplate(e.target.value)} style={{ maxWidth: 340 }}>
            <option value="">Load a template… ({templates.length})</option>
            {tplGroups.mine.length > 0 && (
              <optgroup label={'This desk — ' + (desk ? desk.name : '')}>
                {tplGroups.mine.map((t) => <option key={t.id} value={t.id}>{t.name} · by {t.made_by}</option>)}
              </optgroup>
            )}
            <optgroup label="Thematic & other desks">
              {tplGroups.rest.map((t) => <option key={t.id} value={t.id}>{t.name} · by {t.made_by}</option>)}
            </optgroup>
          </select>
          {tplId && (() => { const t = templates.find((x) => x.id === tplId); return t ? (
            <span className="mon-tpl-note" title={t.note}>{t.note ? t.note.slice(0, 90) : ''}{t.note && t.note.length > 90 ? '…' : ''}</span>
          ) : null; })()}
          <span className="sp"></span>
          <button className="mon-chip" onClick={publishTemplate} title="Publish the current basket as a team-wide template">Publish as template</button>
        </div>

        <div className="mon-lab">
        <div className="mon-lab-side">
          <div className="mon-lab-h">
            1 · Pick instruments <span className="ct">{picked.length}/20 · even one works</span>
          </div>
          <div className="mon-lab-scope">
            <button className={'mon-chip ' + (useFilters ? 'active' : '')} onClick={() => setUseFilters(true)}
                    title="picker follows the region / country / sub-industry filters above">
              {filterLabel || 'Filtered'} ({scopedRows.length})
            </button>
            <button className={'mon-chip ' + (!useFilters ? 'active' : '')} onClick={() => setUseFilters(false)}>
              Whole desk ({deskRows.filter((r) => r.t).length})
            </button>
            {pickerRows.length > 0 && pickerRows.length <= 20 && (
              <button className="mon-chip" onClick={addAll} title="add every listed name to the basket">+ all</button>
            )}
          </div>
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
            {searchRows.length === 0 && !q && (
              <div className="mon-lab-row"><span className="nm" style={{ color: 'var(--text-tertiary)' }}>No names match the current filters — switch to “Whole desk” or search.</span></div>
            )}
            {q && !searchRows.length && (
              <div className="mon-lab-row" onClick={() => { toggle(q.trim().toUpperCase()); setQ(''); }}>
                <span className="nm">Add “{q.trim().toUpperCase()}” (Yahoo symbol)</span><span className="pick">+</span>
              </div>
            )}
          </div>

          <div className="mon-lab-h" style={{ marginTop: 10 }}>2 · Basket & weights</div>
          <div className="mon-lab-wmode">
            {[['equal', 'Equal'], ['mcap', 'Market cap'], ['custom', 'Custom']].map(([k, l]) => (
              <button key={k} className={'mon-chip ' + (wMode === k ? 'active' : '')} onClick={() => pickWMode(k)}
                      title={k === 'mcap' ? 'weights from live USD market caps (fetched on build)' : k === 'custom' ? 'set weight percentages per member below (normalized to 100%)' : 'every member weighted equally'}>
                {l}
              </button>
            ))}
          </div>
          {picked.length > 0 && (
            <div className="mon-basket">
              {picked.map((t) => {
                const meta = rowMeta(t);
                return (
                  <div key={t} className="mon-basket-row">
                    <span className="fl">{flag(meta.c)}</span>
                    <span className="nm" title={meta.n}>{meta.n}</span>
                    <span className="tk">{t.replace('.JK', '')}</span>
                    {wMode === 'custom' && (
                      <span className="mon-w-wrap">
                        <input className="mon-w" type="number" min="0" step="0.5"
                               value={wMap[t] != null ? wMap[t] : equalPct(picked.length)}
                               onChange={(e) => setWMap({ ...wMap, [t]: parseFloat(e.target.value) || 0 })}
                               title="target weight in % (normalized to 100% across the basket)" />
                        <span className="sfx">%</span>
                      </span>
                    )}
                    <span className="pw">{previewW ? (previewW[t] * 100).toFixed(1) + '%' : 'cap'}</span>
                    <span className="rm" onClick={() => toggle(t)} title="remove">✕</span>
                  </div>
                );
              })}
            </div>
          )}
          {picked.length === 0 && <div className="mon-subs-note">Basket is empty — pick from the list above or load a template.</div>}

          <div className="mon-lab-save">
            <input className="mon-input" placeholder="Save privately as… (e.g. LBC Nickel 6)" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="mon-chip" onClick={saveCurrent}>Save</button>
          </div>
          {saved.length > 0 && (
            <div className="mon-lab-saved">
              <div className="mon-lab-h">My saved indices</div>
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
            <span className="lbl">3 · Build — rebased 100 · {wMode === 'mcap' ? 'cap-weighted' : wMode === 'custom' ? 'custom weights' : 'equal weight'}</span>
            {['1mo', '3mo', '6mo', '1y', '2y', '5y'].map((r) => (
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
            {result && !resultStale && (
              <button className="mon-chip" onClick={pinCurrent} disabled={pinned.length >= PIN_COLORS.length}
                      title="keep this index on the chart, then change the basket and build another to compare">
                ＋ Pin to compare
              </button>
            )}
          </div>
          {pinned.length > 0 && (
            <div className="mon-pin-row">
              <span className="t">Comparing</span>
              {pinned.map((p, i) => (
                <span key={i} className="mon-pin-chip">
                  <span className="sw" style={{ background: p.color }}></span>{p.name}
                  <span className="x" onClick={() => setPinned(pinned.filter((_, j) => j !== i))} title="unpin">✕</span>
                </span>
              ))}
              <button className="mon-chip" onClick={() => setPinned([])}>Clear</button>
            </div>
          )}
          {err && <div className="mon-warn">{err}</div>}
          {resultStale && <div className="mon-warn">Selection changed since this build — hit “Build index” to refresh.</div>}
          {result ? (
            <>
              <div className="mon-ret-strip">
                {chartSeries.map((s, i) => (
                  <div key={i} className="row">
                    <span className="sw" style={{ background: s.color }}></span>
                    <span className="l" title={s.label}>{s.label}</span>
                    {[[1, '1D'], [3, '3D'], [5, '5D'], [21, '1M']].map(([k, lab]) => {
                      const r = retOf(s.points, k);
                      return (
                        <span key={lab} className="cell">
                          <span className="k">{lab}</span>
                          <span className={'v ' + pctCls(r)}>{r == null ? '—' : fmtPct(r)}</span>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <MultiLineChart rebased series={chartSeries} height={300} />
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
                  {risk && (
                    <div className="st" title={'historical 1-day Value-at-Risk from ' + risk.n + ' daily returns: on the worst 5% of days the index lost at least this much (95%), worst 1% (99%). Parametric (normal-fit): ' + risk.pvar95.toFixed(2) + '% / ' + risk.pvar99.toFixed(2) + '%.'}>
                      <span className="k">VaR 1d 95/99</span>
                      <span className="v neg">{risk.var95.toFixed(2)}% / {risk.var99.toFixed(2)}%</span>
                    </div>
                  )}
                  {risk && (
                    <div className="st" title={'worst single session in the window · best was ' + fmtPct(risk.best.ret) + ' on ' + risk.best.date + ' · skew ' + (risk.skew == null ? '—' : risk.skew.toFixed(2)) + ', excess kurtosis ' + (risk.kurtosis == null ? '—' : risk.kurtosis.toFixed(1))}>
                      <span className="k">Worst day · {risk.worst.date}</span>
                      <span className="v neg">{fmtPct(risk.worst.ret)}</span>
                    </div>
                  )}
                  <div className="st"><span className="k">Members</span><span className="v">{result.basket.tickers.length}</span></div>
                  {result.basket.tickers.length > 1 && (
                    <button className="mon-chip" style={{ alignSelf: 'center' }} onClick={() => setShowCorr(!showCorr)}>
                      {showCorr ? 'Hide correlations' : 'Correlations'}
                    </button>
                  )}
                </div>
              )}
              <div className="mon-lab-members">
                {perName.map((m) => (
                  <div key={m.t} className="mon-lab-member">
                    <span className="t">{m.t}</span>
                    {m.w != null && wMode !== 'equal' && <span className="w">{(m.w * 100).toFixed(1)}%</span>}
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
          ) : !err && <div className="mon-chart-empty">{busy ? 'Fetching histories…' : 'Pick instruments (1), set weights (2), then Build (3) — or load a template above.'}</div>}
        </div>
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
  // component key → drill-down series (click a chip to open full history)
  const REGIME_DRILL = {
    trend: { title: 'S&P 500', ticker: '^GSPC' },
    eqmom: { title: 'S&P 500', ticker: '^GSPC' },
    vol: { title: 'VIX', ticker: '^VIX' },
    credit: { title: 'US High-Yield OAS', source: 'FRED', seriesId: 'BAMLH0A0HYM2' },
    usd: { title: 'Dollar Index (DXY)', ticker: 'DX-Y.NYB' },
    growth: { title: 'Copper (HG=F)', ticker: 'HG=F' },
    curve: { title: '2s10s Treasury Curve', source: 'FRED', seriesId: 'T10Y2Y' },
    idr: { title: 'USD/IDR', ticker: 'IDR=X' },
  };
  // Indonesia dial (3.1) — its trend/mom keys drill to ^JKSE, not S&P
  const REGIME_DRILL_ID = {
    trend: { title: 'IDX Composite (^JKSE)', ticker: '^JKSE' },
    mom: { title: 'IDX Composite (^JKSE)', ticker: '^JKSE' },
    idr: { title: 'USD/IDR', ticker: 'IDR=X' },
    eidors: { title: 'EIDO (iShares Indonesia)', ticker: 'EIDO' },
    growth: { title: 'Copper (HG=F)', ticker: 'HG=F' },
    flow: { title: 'EIDO (iShares Indonesia)', ticker: 'EIDO' },
    carry: { title: 'USD/MXN (carry proxy leg)', ticker: 'MXN=X' },
    tp: { title: 'ACM 10y Term Premium', source: 'FRED', seriesId: 'THREEFYTP10' },
  };

  // Alert inbox (4.1): flip/flag rows written by the nightly snapshot job.
  const AlertBell = () => {
    const alerts = ML().useAlerts();
    const [open, setOpen] = React.useState(false);
    const [seenAt, setSeenAt] = React.useState(() => {
      try { return Number(localStorage.getItem('lbc-monitor-alerts-seen') || 0); } catch { return 0; }
    });
    if (!alerts.length) return null;
    const unseen = alerts.filter((a) => Date.parse(a.created_at) > seenAt).length;
    const markSeen = () => {
      const t = Date.now();
      setSeenAt(t);
      try { localStorage.setItem('lbc-monitor-alerts-seen', String(t)); } catch {}
    };
    return (
      <span className="mon-alert-wrap">
        <button className={'mon-alert-bell' + (unseen ? ' has' : '')}
                onClick={() => { const next = !open; setOpen(next); if (next) markSeen(); }}
                title="regime alerts — flips and flags from the nightly snapshot">
          ◉ Alerts{unseen > 0 && <span className="ct">{unseen}</span>}
        </button>
        {open && (
          <div className="mon-alert-panel">
            <div className="h">Regime alerts <span className="s">last 14 days · nightly snapshot</span>
              <span className="x" onClick={() => setOpen(false)}>✕</span></div>
            {alerts.map((a) => (
              <div key={a.id} className="row" title={a.detail}>
                <span className={'dial ' + a.dial}>{a.dial === 'global' ? 'GLOBAL' : 'IDX'}</span>
                <span className="t">{(a.title || '').replace(/^(GLOBAL|IDX)\s+/, '')}</span>
                <span className="d">{a.date}</span>
              </div>
            ))}
          </div>
        )}
      </span>
    );
  };

  // One dial row (head + component chips). Used twice: GLOBAL and IDX 🇮🇩.
  const RegimeDial = ({ regime, tag, tip, drillMap, setDrill, compact, storeKey, extra }) => {
    // flip notice: compare against the last label this browser saw, ONCE per
    // regime arrival (an inline compare would self-erase on re-render).
    const [flippedFrom, setFlippedFrom] = React.useState(null);
    React.useEffect(() => {
      if (!regime) return;
      try {
        const prev = JSON.parse(localStorage.getItem(storeKey) || 'null');
        if (prev && prev.label && prev.label !== regime.label) setFlippedFrom(prev);
        localStorage.setItem(storeKey, JSON.stringify({ label: regime.label, date: regime.asOf }));
      } catch {}
    }, [regime && regime.label]);
    if (!regime) return null;
    const cls = regime.label === 'RISK-ON' ? 'on' : regime.label === 'RISK-OFF' ? 'off' : 'mid';
    const pct = ((regime.score + 1) / 2) * 100; // gauge position
    return (
      <>
        <div className="mon-regime-head">
          {tag && <span className="mon-regime-tag" title={tip}>{tag}</span>}
          <span className={'mon-regime-label ' + cls} title={tip}>{regime.label}</span>
          {regime.coverage != null && regime.coverage < 0.6 && (
            <span className="mon-regime-flag" title="less than 60% of component weight has fresh data">PARTIAL DATA</span>
          )}
          <span className="mon-regime-gauge" title={'smoothed composite ' + regime.score.toFixed(2) + ' (−1 risk-off … +1 risk-on) · raw ' + (regime.raw != null ? regime.raw.toFixed(2) : '—')}>
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
          {flippedFrom && (
            <span className="mon-regime-flag" title={'was ' + flippedFrom.label + ' when you last looked (' + (flippedFrom.date || '') + ')'}>
              FLIPPED FROM {flippedFrom.label}
            </span>
          )}
          {regime.flags.map((f) => <span key={f} className="mon-regime-flag">{f}</span>)}
          <span className="mon-regime-asof">as of {regime.asOf}</span>
          {extra}
        </div>
        {!compact && (
          <div className="mon-regime-comps">
            {regime.components.map((c) => (
              <span key={c.key} className={'mon-regime-comp ' + (c.score > 0.15 ? 'pos' : c.score < -0.15 ? 'neg' : '')}
                    title={c.note + ' · score ' + (c.score >= 0 ? '+' : '') + c.score.toFixed(2) + ' · click for full history'}
                    onClick={() => drillMap[c.key] && setDrill(drillMap[c.key])}>
                <span className="k">{c.label}</span>
                <span className="v">{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </>
    );
  };

  const RegimeStrip = ({ compact }) => {
    const { useRegime, useRegimeID } = ML();
    const { regime, err } = useRegime();
    const { regime: regimeId } = useRegimeID(); // additive — silent if unavailable
    const [drill, setDrill] = React.useState(null);
    if (err) return (
      <div className="mon-regime mon-regime-loading">
        Regime feed unavailable ({err}) — <button className="mon-chip" onClick={() => location.reload()}>retry</button>
      </div>
    );
    if (!regime) return <div className="mon-regime mon-regime-loading">Reading the tape — credit, vol, USD, curve, growth…</div>;
    const cls = regime.label === 'RISK-ON' ? 'on' : regime.label === 'RISK-OFF' ? 'off' : 'mid';
    return (
      <div className={'mon-regime ' + cls + (compact ? ' compact' : '')}>
        <RegimeDial regime={regime} tag="GLOBAL" storeKey="lbc-monitor-regime-last"
          tip="Cross-asset tape STATE (descriptive, hysteresis-smoothed). Backtested 2022-26: this dial describes conditions — it does not forecast returns; stretched risk-on readings have historically mean-reverted over ~1M."
          drillMap={REGIME_DRILL} setDrill={setDrill} compact={compact} extra={<AlertBell />} />
        {regimeId && (
          <div className="mon-regime-id">
            <RegimeDial regime={regimeId} tag="IDX 🇮🇩" storeKey="lbc-monitor-regime-id-last"
              tip="Indonesia tape STATE (^JKSE trend/momentum, USD/IDR stress + acceleration, EIDO/SPY foreign appetite, copper/gold, EIDO dollar-volume flow). Gate-tested 2022-26: tracks the trailing-1M IDX tape at 0.86 rank-correlation vs 0.32 for the global dial. Like the global dial it DESCRIBES conditions — it does not forecast returns."
              drillMap={REGIME_DRILL_ID} setDrill={setDrill} compact={compact} />
          </div>
        )}
        {drill && (
          <HistoryModal title={drill.title} sub={drill.source ? drill.source + ' · ' + drill.seriesId : 'Yahoo · ' + drill.ticker}
                        ticker={drill.ticker} source={drill.source} seriesId={drill.seriesId}
                        onClose={() => setDrill(null)} />
        )}
      </div>
    );
  };

  // ---- Desk pulse — momentum / relative strength / breadth today ----------
  // quotes come from the shared Overview batch (OverviewPanel).
  const DeskPulse = ({ desk, quotes, flow }) => {
    const { useDeskSignals } = ML();
    const benchY = (desk.bench || []).find((b) => b.y);
    const sig = useDeskSignals(benchY ? benchY.y : null);
    const br = window.MONITOR_REGIME ? window.MONITOR_REGIME.breadth(quotes || {}) : null;
    if (!sig && !br && !flow) return null;
    const momCls = sig && (sig.momentum === 'strong' || sig.momentum === 'up') ? 'pos' : sig && (sig.momentum === 'weak' || sig.momentum === 'down') ? 'neg' : '';
    const rsCls = sig && sig.rs === 'leader' ? 'pos' : sig && sig.rs === 'laggard' ? 'neg' : '';
    return (
      <div className="mon-pulse">
        <span className="mon-pulse-t">Desk pulse</span>
        {sig && sig.r1m != null && (
          <span className={'mon-pulse-item ' + momCls} title={benchY.label + ' — trailing benchmark returns (1W / 2W / 1M / 3M)'}>
            Momentum <b>{fmtPct(sig.r1w)}</b> 1W · <b>{fmtPct(sig.r2w)}</b> 2W · <b>{fmtPct(sig.r1m)}</b> 1M · <b>{fmtPct(sig.r3m)}</b> 3M
          </span>
        )}
        {sig && sig.rs && (
          <span className={'mon-pulse-item ' + rsCls}
                title={'BETA-ADJUSTED relative strength: benchmark 1M minus β×(S&P 1M)' + (sig.beta != null ? ' · β=' + sig.beta.toFixed(2) : '') + ' · leader/laggard at ±1 residual σ'}>
            RS vs S&P <b>{fmtPct(sig.rsDiff)}</b> · {sig.rs}{sig.beta != null ? ' (β' + sig.beta.toFixed(1) + ')' : ''}
          </span>
        )}
        {br && (
          <span className={'mon-pulse-item ' + (br.advPct >= 60 ? 'pos' : br.advPct <= 40 ? 'neg' : '')}
                title={'today: ' + br.adv + ' up / ' + br.dec + ' down of ' + br.tot + ' quoted · median ' + fmtPct(br.median)}>
            Breadth <b>{br.advPct.toFixed(0)}%</b> adv · {br.bigUp}▲ {br.bigDown}▼ &gt;2%
          </span>
        )}
        {flow && (
          <span className={'mon-pulse-item ' + (flow.median >= 1.25 && flow.surgesUp >= flow.surges - flow.surgesUp ? 'pos' : flow.median <= 0.75 ? 'neg' : '')}
                title={'relative DOLLAR volume vs 20d avg across ' + flow.n + ' of ' + flow.universe + ' names (sampled ' + flow.sampled + ')' + (flow.partial ? ' · today is a PARTIAL session bar' : '') + ' · ' + flow.surges + ' names ≥1.8× avg $vol (' + flow.surgesUp + ' up) · 20d accumulation: ' + flow.accum + ' names, distribution: ' + flow.distrib + (flow.divergers ? ' · ' + flow.divergers + ' price/OBV divergences' : '')}>
            $Vol <b>{flow.median.toFixed(2)}×</b>{flow.partial ? '·intraday' : ''} · {flow.surges}⚡ ({flow.surgesUp}▲) · A/D {flow.accum}/{flow.distrib}
          </span>
        )}
        {flow && flow.tb && (
          <span className={'mon-pulse-item ' + (flow.tb.pctAbove50 >= 60 ? 'pos' : flow.tb.pctAbove50 <= 40 ? 'neg' : '')}
                title={'trend breadth over ' + flow.tb.n + ' sampled names: % trading above their 50-day average, and % at fresh 20-day highs'}>
            Trend <b>{flow.tb.pctAbove50.toFixed(0)}%</b> &gt;50d · {flow.tb.pctNH20.toFixed(0)}% at 20d highs
          </span>
        )}
      </div>
    );
  };

  // ---- Desk dossier drawer -------------------------------------------------
  const DossierDrawer = ({ desk, onClose }) => {
    useEscape(onClose);
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
    useEscape(onClose);
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

  // ---- Morning Desk Note (roadmap 4.2) ------------------------------------
  // One click composes a markdown standup brief: both dials, recent alerts,
  // and a tape+movers line per equity desk — copy-out or download.
  const dialLine = (name, reg) => {
    if (!reg) return '- ' + name + ': unavailable';
    return '- **' + name + ': ' + reg.label + '** (' + (reg.score >= 0 ? '+' : '') + reg.score.toFixed(2) + ')' +
      (reg.history ? ' · ' + reg.history.streak + ' session' + (reg.history.streak === 1 ? '' : 's') + ' in ' + reg.history.label.toLowerCase() : '') +
      (reg.flags && reg.flags.length ? ' · flags: ' + reg.flags.join(', ') : ' · no flags') +
      ' · as of ' + reg.asOf;
  };
  const buildNote = ({ regime, regimeId, alerts, deskRows, assign }) => {
    const today = new Date().toISOString().slice(0, 10);
    const L = [];
    L.push('# LBC Morning Desk Note — ' + today);
    L.push('');
    L.push('## Tape');
    L.push(dialLine('GLOBAL', regime));
    L.push(dialLine('IDX 🇮🇩', regimeId));
    L.push('');
    L.push('_Both dials are tape-STATE gauges (descriptive, hysteresis-smoothed) — they do not forecast returns._');
    const recent = (alerts || []).slice(0, 6);
    if (recent.length) {
      L.push('');
      L.push('## Alerts (last 14 days)');
      recent.forEach((a) => L.push('- ' + a.date + ' · ' + a.title));
    }
    L.push('');
    L.push('## Equity desks');
    deskRows.forEach(({ d, benchY, sig, movers }) => {
      const a = (assign || {})[d.id] || {};
      const people = [a.head, ...(a.analysts || [])].filter(Boolean);
      L.push('');
      L.push('### ' + d.num + ' · ' + d.name + (benchY ? ' — bench ' + benchY.label : '') + (people.length ? ' — ' + people.join(', ') : ''));
      if (sig) {
        L.push('- Tape: 1D ' + fmtPct(sig.r1d) + ' · 1W ' + fmtPct(sig.r1w) + ' · 1M ' + fmtPct(sig.r1m) + ' · 3M ' + fmtPct(sig.r3m) +
          ' · momentum **' + (sig.momentum || 'n/a') + '**' +
          (sig.rs ? ' · RS vs S&P **' + sig.rs + '**' + (sig.beta != null ? ' (β' + sig.beta.toFixed(1) + ')' : '') : ''));
      } else {
        L.push('- Tape: benchmark data unavailable');
      }
      if (movers && movers.n >= 5) {
        L.push('- Movers (' + movers.n + ' quoted): ' +
          movers.up.map((m) => m.t + ' ' + fmtPct(m.chg)).join(', ') + '  /  ' +
          movers.down.map((m) => m.t + ' ' + fmtPct(m.chg)).join(', '));
      }
    });
    L.push('');
    L.push('---');
    L.push('_Composed by MONITOR (T12) · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC · not investment advice_');
    return L.join('\n');
  };

  const MorningNote = ({ assign, onClose }) => {
    const md = MD();
    const [busy, setBusy] = React.useState(true);
    const [progress, setProgress] = React.useState('reading the dials…');
    const [text, setText] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    useEscape(onClose);
    React.useEffect(() => {
      let alive = true;
      const L = ML();
      (async () => {
        try {
          const [regime, regimeId, alerts] = await Promise.all([
            L.fetchRegime().catch(() => null), L.fetchRegimeID().catch(() => null), L.fetchAlerts().catch(() => []),
          ]);
          if (!alive) return;
          const spx = await L.fetchHistory('^GSPC', '6mo', '1d').catch(() => null);
          const desks = md.DESKS.filter((d) => d.group === 'equity');
          const deskRows = [];
          for (const d of desks) {
            if (!alive) return;
            setProgress('reading ' + d.name + '…');
            const benchY = (d.bench || []).find((b) => b.y);
            const bench = benchY ? await L.fetchHistory(benchY.y, '6mo', '1d').catch(() => null) : null;
            const sig = bench && spx && window.MONITOR_REGIME ? window.MONITOR_REGIME.deskSignals(bench, spx) : null;
            let movers = null;
            try {
              const uni = (d.subs || []).flatMap((s) => s.u || []).filter((r) => r.t).slice(0, 40).map((r) => r.t);
              const q = await L.fetchQuotesBatch(uni);
              const rows = Object.keys(q)
                .filter((t) => q[t] && !q[t].error && q[t].changePct != null)
                .map((t) => ({ t: t.replace('.JK', ''), chg: q[t].changePct }))
                .sort((a, b) => b.chg - a.chg);
              if (rows.length >= 5) movers = { up: rows.slice(0, 3), down: rows.slice(-3).reverse(), n: rows.length };
            } catch {}
            deskRows.push({ d, benchY, sig, movers });
          }
          if (!alive) return;
          setText(buildNote({ regime, regimeId, alerts, deskRows, assign }));
          setBusy(false);
        } catch (e) {
          if (alive) { setText('Failed to compose the note: ' + (e && e.message || e)); setBusy(false); }
        }
      })();
      return () => { alive = false; };
    }, []);
    const copy = () => {
      const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    };
    return (
      <div className="mon-modal-backdrop" onClick={onClose}>
        <div className="mon-modal" onClick={(e) => e.stopPropagation()}>
          <div className="mon-modal-h">
            <div>
              <div className="t">Morning Desk Note</div>
              <div className="s">auto-composed from live dials, alerts, desk tape and movers</div>
            </div>
            <div className="mon-modal-actions">
              <button className="mon-chip" onClick={copy} disabled={busy}>{copied ? 'Copied ✓' : 'Copy markdown'}</button>
              <button className="mon-chip" onClick={() => downloadCsvText('lbc-morning-note-' + new Date().toISOString().slice(0, 10) + '.md', text)} disabled={busy}>Download .md</button>
              <button className="mon-chip" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="mon-modal-body">
            {busy ? <div className="mon-chart-empty">Composing — {progress}</div>
              : <pre className="mon-note-pre">{text}</pre>}
          </div>
        </div>
      </div>
    );
  };
  // plain-text download (the CSV helper quotes commas — notes need raw md)
  const downloadCsvText = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---- LBC Book Screener (roadmap 4.3) ------------------------------------
  // Scans the WHOLE validated book in one batch-quote sweep and ranks it
  // with the columns TradingView can't know: desk, sub-industry, region.
  const BookScreener = () => {
    const md = MD();
    const universe = React.useMemo(() => {
      const out = [];
      const seen = new Set();
      md.DESKS.forEach((d) => (d.subs || []).forEach((s) => (s.u || []).forEach((r) => {
        if (r.t && !seen.has(r.t)) { seen.add(r.t); out.push({ t: r.t, n: r.n, c: r.c, deskId: d.id, deskNum: d.num, deskName: d.name, sub: s.name }); }
      })));
      return out;
    }, []);
    const [quotes, setQuotes] = React.useState(null);
    const [took, setTook] = React.useState(null);
    const [err, setErr] = React.useState('');
    const scan = () => {
      setQuotes(null); setTook(null); setErr('');
      const t0 = performance.now();
      ML().fetchQuotesBatch(universe.map((r) => r.t)).then(
        (qm) => { setQuotes(qm); setTook((performance.now() - t0) / 1000); },
        (e) => { setQuotes({}); setErr('Scan failed (' + (e && e.message || e) + ') — retry.'); });
    };
    React.useEffect(scan, []);
    const [q, setQ] = React.useState('');
    const [deskF, setDeskF] = React.useState('');
    const [regionF, setRegionF] = React.useState('');
    const [sort, setSort] = React.useState({ k: 'chg', dir: -1 });
    const clickSort = (k) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: k === 'n' ? 1 : -1 }));
    const rows = React.useMemo(() => {
      if (!quotes) return [];
      let list = universe.map((r) => {
        const qq = quotes[r.t];
        return {
          ...r,
          last: qq && qq.price != null ? qq.price : null,
          chg: qq && qq.changePct != null ? qq.changePct : null,
          vol: qq && qq.volume != null ? qq.volume : null,
        };
      });
      if (deskF) list = list.filter((r) => r.deskId === deskF);
      if (regionF) list = list.filter((r) => md.inRegion(r.c, regionF));
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        list = list.filter((r) => r.n.toLowerCase().includes(needle) || r.t.toLowerCase().includes(needle) || (r.sub || '').toLowerCase().includes(needle));
      }
      const dir = sort.dir, k = sort.k;
      list.sort((a, b) => {
        const av = a[k], bv = b[k];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
      });
      return list;
    }, [quotes, q, deskF, regionF, sort]);
    const quoted = rows.filter((r) => r.chg != null).length;
    const adv = rows.filter((r) => r.chg > 0).length, dec = rows.filter((r) => r.chg < 0).length;
    const SHOW = 250;
    const HEADS = [['n', 'Name'], ['t', 'Ticker'], ['c', ''], ['deskNum', 'Desk'], ['sub', 'Sub-industry'], ['last', 'Last'], ['chg', '1D%'], ['vol', 'Volume']];
    return (
      <div className="mon-book-screener">
        <div className="mon-lab-toolbar">
          <span className="lbl">LBC book · {universe.length} validated names</span>
          <input className="mon-input" style={{ maxWidth: 240 }} placeholder="Filter name / ticker / sub…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="mon-select" value={deskF} onChange={(e) => setDeskF(e.target.value)}>
            <option value="">All desks</option>
            {md.DESKS.filter((d) => d.group === 'equity').map((d) => <option key={d.id} value={d.id}>{d.num} · {d.name}</option>)}
          </select>
          <select className="mon-select" value={regionF} onChange={(e) => setRegionF(e.target.value)}>
            <option value="">All regions</option>
            {md.REGION_FILTERS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button className="mon-chip" onClick={scan} disabled={!quotes}>{quotes ? 'Rescan' : 'Scanning…'}</button>
          {rows.length > 0 && (
            <button className="mon-chip" onClick={() => downloadCsv('lbc-book-screen.csv',
              [['name', 'ticker', 'country', 'desk', 'sub', 'last', 'chg_pct', 'volume'],
                ...rows.map((r) => [r.n, r.t, r.c || '', r.deskNum, r.sub, r.last ?? '', r.chg ?? '', r.vol ?? ''])])}>CSV</button>
          )}
        </div>
        {quotes && (
          <div className="mon-table-note">
            scanned {quoted}/{universe.length} names{took != null ? ' in ' + took.toFixed(1) + 's' : ''} ·
            {' '}{adv} adv / {dec} dec{rows.length > SHOW ? ' · showing top ' + SHOW + ' of ' + rows.length + ' (CSV has all)' : ''}
          </div>
        )}
        {err && <div className="mon-warn">{err}</div>}
        {!quotes && !err && <div className="mon-chart-empty" style={{ minHeight: 120 }}>Sweeping the whole book…</div>}
        {quotes && (
          <div className="mon-table-wrap" style={{ maxHeight: '58vh' }}>
            <table className="mon-table">
              <thead>
                <tr>{HEADS.map(([k, l]) => (
                  <th key={k} className={['last', 'chg', 'vol'].includes(k) ? 'num' : ''} onClick={() => clickSort(k)}>
                    {l}{sort.k === k ? (sort.dir < 0 ? ' ▼' : ' ▲') : ''}
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.slice(0, SHOW).map((r) => (
                  <tr key={r.t}>
                    <td className="nm" title={r.n}>{r.n}</td>
                    <td className="tk">{r.t}</td>
                    <td className="fl">{flag(r.c)}</td>
                    <td className="dim">{r.deskNum}</td>
                    <td className="sb" title={r.sub}>{r.sub}</td>
                    <td className="num">{r.last == null ? '·' : fmtNum(r.last)}</td>
                    <td className={'num ' + pctCls(r.chg)}>{r.chg == null ? '·' : fmtPct(r.chg)}</td>
                    <td className="num dim">{r.vol == null ? '·' : Intl.NumberFormat('en', { notation: 'compact' }).format(r.vol)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={8} className="dim" style={{ padding: 14 }}>Nothing matches the current filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ---- Desk compare (roadmap 4.6) -----------------------------------------
  // Two desks side by side: overlaid rebased benchmarks (the chart inherits
  // drag-to-measure), pulse diff, return correlation + relative beta, and
  // each desk's movers from one batch-quote sweep.
  const DeskCompare = ({ onClose }) => {
    const md = MD();
    const { MultiLineChart } = ML(); // destructure first — bare module refs crash (and beacon'd!)
    const equity = md.DESKS.filter((d) => d.group === 'equity');
    const [aId, setA] = React.useState('tech');
    const [bId, setB] = React.useState('fig');
    const [range, setRange] = React.useState('6mo');
    const [data, setData] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    useEscape(onClose);
    React.useEffect(() => {
      let alive = true;
      const L = ML();
      const dA = md.deskById(aId), dB = md.deskById(bId);
      const yA = (dA.bench || []).find((b) => b.y), yB = (dB.bench || []).find((b) => b.y);
      if (!yA || !yB) { setData(null); return; }
      setBusy(true);
      const movers = (d) => {
        const uni = (d.subs || []).flatMap((s) => s.u || []).filter((r) => r.t).slice(0, 40).map((r) => r.t);
        return L.fetchQuotesBatch(uni).then((q) => {
          const rows = Object.keys(q).filter((t) => q[t] && !q[t].error && q[t].changePct != null)
            .map((t) => ({ t: t.replace('.JK', ''), chg: q[t].changePct }))
            .sort((x, y) => y.chg - x.chg);
          return rows.length >= 5 ? { up: rows.slice(0, 3), down: rows.slice(-3).reverse() } : null;
        }).catch(() => null);
      };
      Promise.all([
        L.fetchHistory(yA.y, range, '1d'), L.fetchHistory(yB.y, range, '1d'),
        L.fetchHistory('^GSPC', '6mo', '1d').catch(() => null),
        movers(dA), movers(dB),
      ]).then(([sa, sb, spx, mA, mB]) => {
        if (!alive) return;
        const start = sa[0] && sb[0] ? (sa[0].date > sb[0].date ? sa[0].date : sb[0].date) : null;
        const cut = (s) => {
          const c = s.filter((o) => o.date >= start);
          return c.length > 1 ? c.map((o) => ({ date: o.date, value: (o.value / c[0].value) * 100 })) : null;
        };
        const ra = cut(sa), rb = cut(sb);
        const R = window.MONITOR_REGIME;
        setData({
          dA, dB, yA, yB, ra, rb,
          rel: ra && rb ? ML().overlayStats(ra, rb) : null,
          sigA: spx ? R.deskSignals(sa, spx) : null,
          sigB: spx ? R.deskSignals(sb, spx) : null,
          mA, mB,
        });
        setBusy(false);
      }, () => { if (alive) { setData(null); setBusy(false); } });
      return () => { alive = false; };
    }, [aId, bId, range]);
    const pulseRow = (d, y, sig) => sig ? (
      <div className="mon-cmp-pulse" style={{ ['--ac']: d.accent }}>
        <span className="d">{d.num} · {d.name}</span>
        <span>1D <b className={pctCls(sig.r1d)}>{fmtPct(sig.r1d)}</b></span>
        <span>1W <b className={pctCls(sig.r1w)}>{fmtPct(sig.r1w)}</b></span>
        <span>1M <b className={pctCls(sig.r1m)}>{fmtPct(sig.r1m)}</b></span>
        <span>3M <b className={pctCls(sig.r3m)}>{fmtPct(sig.r3m)}</b></span>
        <span>mom <b>{sig.momentum || '—'}</b></span>
        {sig.rs && <span>RS <b>{sig.rs}</b>{sig.beta != null ? ' (β' + sig.beta.toFixed(1) + ')' : ''}</span>}
      </div>
    ) : null;
    const moverChips = (m) => m ? (
      <span className="mon-cmp-movers">
        {m.up.map((x) => <span key={x.t} className="pos">{x.t} {fmtPct(x.chg)}</span>)}
        <span className="sep">/</span>
        {m.down.map((x) => <span key={x.t} className="neg">{x.t} {fmtPct(x.chg)}</span>)}
      </span>
    ) : null;
    return (
      <div className="mon-modal-backdrop" onClick={onClose}>
        <div className="mon-modal" onClick={(e) => e.stopPropagation()}>
          <div className="mon-modal-h">
            <div>
              <div className="t">Desk compare</div>
              <div className="s">overlaid benchmarks (rebased 100) · pulse · correlation · movers</div>
            </div>
            <div className="mon-modal-actions">
              <select className="mon-select" value={aId} onChange={(e) => setA(e.target.value)}>
                {equity.map((d) => <option key={d.id} value={d.id}>{d.num} · {d.name}</option>)}
              </select>
              <span style={{ color: 'var(--text-tertiary)' }}>vs</span>
              <select className="mon-select" value={bId} onChange={(e) => setB(e.target.value)}>
                {equity.map((d) => <option key={d.id} value={d.id}>{d.num} · {d.name}</option>)}
              </select>
              {['3mo', '6mo', '1y'].map((r) => (
                <button key={r} className={'mon-chip ' + (range === r ? 'active' : '')} onClick={() => setRange(r)}>{r.toUpperCase()}</button>
              ))}
              <button className="mon-chip" onClick={onClose}>✕</button>
            </div>
          </div>
          <div className="mon-modal-body">
            {busy && <div className="mon-chart-empty" style={{ minHeight: 100 }}>Loading both desks…</div>}
            {!busy && data && data.ra && data.rb && (
              <>
                <MultiLineChart rebased height={260} series={[
                  { label: data.dA.num + ' ' + data.yA.label, color: data.dA.accent || 'var(--paper)', points: data.ra },
                  { label: data.dB.num + ' ' + data.yB.label, color: data.dB.accent || '#d8a13a', points: data.rb },
                ]} />
                {pulseRow(data.dA, data.yA, data.sigA)}
                {pulseRow(data.dB, data.yB, data.sigB)}
                {data.rel && (
                  <div className="mon-table-note">
                    daily-return correlation <b>{data.rel.corr == null ? '—' : data.rel.corr.toFixed(2)}</b>
                    {' '}· β of {data.dA.num} vs {data.dB.num} <b>{data.rel.beta == null ? '—' : data.rel.beta.toFixed(2)}</b>
                    {' '}· window {range.toUpperCase()}
                  </div>
                )}
                <div className="mon-cmp-moverrow"><span className="k">{data.dA.num} movers</span>{moverChips(data.mA)}</div>
                <div className="mon-cmp-moverrow"><span className="k">{data.dB.num} movers</span>{moverChips(data.mB)}</div>
              </>
            )}
            {!busy && (!data || !data.ra || !data.rb) && (
              <div className="mon-chart-empty" style={{ minHeight: 100 }}>Benchmark history unavailable for that pair.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  window.MONITOR_VIEWS = {
    TvAdvancedChart, TvNews, TvQuotesBoard, TvFxHeatmap, TvCalendar, TvScreener, TvTickerTape,
    HistoryModal, QuoteTable, TopMovers, IndexLab, EconBoard, RatesBoard, DossierDrawer, AssignEditor,
    RegimeStrip, DeskPulse, MorningNote, BookScreener, DeskCompare,
    tvEmbeddable, tvDeepLink,
    fmtNum, fmtPct, pctCls, flag,
  };
})();
