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
        {loading && <div className="mon-table-note top">streaming quotes…</div>}
        <table className="mon-table">
          <thead>
            <tr>
              {th('Name', 'name')}{th('Ticker', 't')}{th('', 'c')}{th('Sub-industry', 'sub')}
              {th('Last', 'price', 1)}{th('Δ', 'change', 1)}{th('Δ%', 'changePct', 1)}{th('Volume', 'volume', 1)}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '22px 10px', color: 'var(--text-tertiary)' }}>
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
                  <td className={'num ' + (q && !err ? pctCls(q.change) : '')}>{err ? '—' : q ? fmtNum(q.change) : '·'}</td>
                  <td className={'num ' + (q && !err ? pctCls(q.changePct) : '')}>{err ? '—' : q ? fmtPct(q.changePct) : '·'}</td>
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
    const [wMap, setWMap] = React.useState({});              // ticker -> weight number (custom)
    const [showCorr, setShowCorr] = React.useState(false);

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
      setPicked((tpl.tickers || []).slice(0, 20));
      setWMode(tpl.w_mode === 'mcap' ? 'mcap' : tpl.w_mode === 'custom' ? 'custom' : 'equal');
      setWMap(tpl.weights || {});
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
    const toggle = (t) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length >= 20 ? p : [...p, t]));
    const addAll = () => setPicked((p) => {
      const next = [...p];
      pickerRows.forEach((r) => { if (!next.includes(r.t) && next.length < 20) next.push(r.t); });
      return next;
    });

    const build = React.useCallback(() => {
      if (picked.length < 2) { setErr('Pick at least 2 instruments.'); return; }
      setBusy(true); setErr(''); setResult(null);
      const want = overlay ? [...picked, overlay] : picked;
      // mcap mode resolves USD market caps first (missing members are
      // EXCLUDED with a warning — never silently equal-weighted).
      const weightsP = wMode === 'mcap' ? fetchMcapWeights(picked)
        : Promise.resolve({ weights: wMode === 'custom' ? wMap : null, missing: [] });
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
      const next = [...saved.filter((s) => s.name !== name.trim()),
        { name: name.trim(), deskId: desk ? desk.id : null, tickers: picked, range,
          wMode, wMap: wMode === 'custom' ? wMap : undefined, created: new Date().toISOString().slice(0, 10) }];
      persistSaved(next); setName('');
    };
    const loadSaved = (s) => {
      setPicked(s.tickers); setRange(s.range || '1y');
      setWMode(s.wMode === 'custom' ? 'custom' : 'equal');
      setWMap(s.wMap || {});
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
        picked.forEach((t) => { raw[t] = Number(wMap[t]) > 0 ? Number(wMap[t]) : 1; sum += raw[t]; });
        const out = {}; picked.forEach((t) => { out[t] = raw[t] / sum; });
        return out;
      }
      if (wMode === 'mcap') return null; // resolved at build time
      const eq = 1 / picked.length, out = {};
      picked.forEach((t) => { out[t] = eq; });
      return out;
    }, [picked.join(','), wMode, JSON.stringify(wMap)]);
    const rowMeta = (t) => md.searchUniverse(t).find((r) => r.t === t) || { n: t, c: null };

    // publish the current basket as a GLOBAL template (made_by attribution)
    const publishTemplate = () => {
      const nm = window.prompt('Template name (visible to the whole team):', name || '');
      if (!nm || !nm.trim() || picked.length < 2) return;
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
            1 · Pick instruments <span className="ct">{picked.length}/20</span>
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
              <button key={k} className={'mon-chip ' + (wMode === k ? 'active' : '')} onClick={() => setWMode(k)}
                      title={k === 'mcap' ? 'weights from live USD market caps (fetched on build)' : k === 'custom' ? 'set relative weights per member below' : 'every member weighted equally'}>
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
                      <input className="mon-w" type="number" min="0" step="0.5"
                             value={wMap[t] != null ? wMap[t] : 1}
                             onChange={(e) => setWMap({ ...wMap, [t]: parseFloat(e.target.value) || 0 })}
                             title="relative weight (normalized)" />
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
          {resultStale && <div className="mon-warn">Selection changed since this build — hit “Build index” to refresh.</div>}
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

  const RegimeStrip = ({ compact }) => {
    const { useRegime } = ML();
    const { regime, err } = useRegime();
    const [drill, setDrill] = React.useState(null);
    // flip notice: compare against the last label this browser saw, ONCE per
    // regime arrival (an inline compare would self-erase on re-render).
    const [flippedFrom, setFlippedFrom] = React.useState(null);
    React.useEffect(() => {
      if (!regime) return;
      try {
        const prev = JSON.parse(localStorage.getItem('lbc-monitor-regime-last') || 'null');
        if (prev && prev.label && prev.label !== regime.label) setFlippedFrom(prev);
        localStorage.setItem('lbc-monitor-regime-last', JSON.stringify({ label: regime.label, date: regime.asOf }));
      } catch {}
    }, [regime && regime.label]);
    if (err) return (
      <div className="mon-regime mon-regime-loading">
        Regime feed unavailable ({err}) — <button className="mon-chip" onClick={() => location.reload()}>retry</button>
      </div>
    );
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
          {flippedFrom && (
            <span className="mon-regime-flag" title={'was ' + flippedFrom.label + ' when you last looked (' + (flippedFrom.date || '') + ')'}>
              FLIPPED FROM {flippedFrom.label}
            </span>
          )}
          {regime.flags.map((f) => <span key={f} className="mon-regime-flag">{f}</span>)}
          <span className="mon-regime-asof">as of {regime.asOf}</span>
        </div>
        {!compact && (
          <div className="mon-regime-comps">
            {regime.components.map((c) => (
              <span key={c.key} className={'mon-regime-comp ' + (c.score > 0.15 ? 'pos' : c.score < -0.15 ? 'neg' : '')}
                    title={c.note + ' · score ' + (c.score >= 0 ? '+' : '') + c.score.toFixed(2) + ' · click for full history'}
                    onClick={() => REGIME_DRILL[c.key] && setDrill(REGIME_DRILL[c.key])}>
                <span className="k">{c.label}</span>
                <span className="v">{c.value}</span>
              </span>
            ))}
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
        {flow && (
          <span className={'mon-pulse-item ' + (flow.median >= 1.25 && flow.surgesUp >= flow.surges - flow.surgesUp ? 'pos' : flow.median <= 0.75 ? 'neg' : '')}
                title={'relative volume vs 20d avg across ' + flow.n + ' of ' + flow.universe + ' names (sampled ' + flow.sampled + ') · ' + flow.surges + ' names ≥1.8× avg volume, ' + flow.surgesUp + ' of them up'}>
            Volume <b>{flow.median.toFixed(2)}×</b> med · {flow.surges}⚡ surging ({flow.surgesUp}▲)
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

  window.MONITOR_VIEWS = {
    TvAdvancedChart, TvNews, TvQuotesBoard, TvFxHeatmap, TvCalendar, TvScreener, TvTickerTape,
    HistoryModal, QuoteTable, TopMovers, IndexLab, EconBoard, RatesBoard, DossierDrawer, AssignEditor,
    RegimeStrip, DeskPulse,
    fmtNum, fmtPct, pctCls, flag,
  };
})();
