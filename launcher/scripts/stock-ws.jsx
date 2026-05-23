// ================================================================
// Stock Workspace — Capital IQ-style split with left section nav,
// header, big chart, and tabbed deep-dive sections.
// ================================================================

const { CandleChart, AreaChart, ColumnChart, buildCandles } = window.ChartLib;

// ---------- live header data (equity-quote + equity-statements snapshot) -----
const SW_SB_URL  = 'https://adnubucjlezrtusbicja.supabase.co';
const SW_SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const SW_HDRS    = { apikey: SW_SB_ANON, Authorization: 'Bearer ' + SW_SB_ANON };
const SW_QUOTE_FN = SW_SB_URL + '/functions/v1/equity-quote';
const SW_STMT_FN  = SW_SB_URL + '/functions/v1/equity-statements';
const swYahoo = (sym) => sym + '.JK';
const _swLast = (o) => { if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };
const _swRp = (v, div, d, suf) => (v == null || !isFinite(v)) ? '—' : 'Rp ' + (v / div).toFixed(d) + suf;

// Merge a fresh quote + the statements snapshot into a header object, recomputing
// valuation multiples off the LIVE price so nothing is ever stale.
function buildLiveHeader(symbol, base, quote, doc) {
  const snap = (doc && doc.snapshot) || {};
  const A = (doc && doc.statements && doc.statements.annual) || {};
  const inc = A.income || {}, bal = A.balance || {}, cf = A.cashflow || {};
  const shares = snap.sharesOutstanding ?? null;
  const price = quote ? quote.price : null;
  const mktcap = (price != null && shares) ? price * shares : (snap.marketCap ?? null);
  const eps = _swLast(inc.DilutedEPS) ?? _swLast(inc.BasicEPS)
    ?? ((_swLast(inc.NetIncome) != null && shares) ? _swLast(inc.NetIncome) / shares : null);
  const equity = _swLast(bal.StockholdersEquity) ?? _swLast(bal.CommonStockEquity);
  const dps = (_swLast(cf.CashDividendsPaid) != null && shares) ? Math.abs(_swLast(cf.CashDividendsPaid)) / shares : null;
  return {
    symbol, exchange: base.exchange || 'IDX', name: snap.longName || base.name || symbol,
    sector: snap.sector || base.sector || '—', industry: snap.industry || base.industry || '—',
    currency: (quote && quote.currency) || 'IDR',
    price, chg: quote ? quote.change : null, chgp: quote ? quote.changePct : null,
    open: quote ? quote.open : null, high: quote ? quote.high : null, low: quote ? quote.low : null,
    prevClose: quote ? quote.prevClose : null, volume: quote ? quote.volume : null,
    w52h: quote ? quote.fiftyTwoWeekHigh : null, w52l: quote ? quote.fiftyTwoWeekLow : null,
    mcap: _swRp(mktcap, 1e12, 2, ' T'),
    shares: shares != null ? (shares / 1e9).toFixed(2) + ' B' : '—',
    value: (quote && quote.volume != null && price != null) ? _swRp(quote.volume * price, 1e12, 2, ' T') : '—',
    pe: (price != null && eps) ? price / eps : null,
    pb: (mktcap != null && equity) ? mktcap / equity : null,
    divYield: (dps != null && price) ? (dps / price) * 100 : null,
    beta: snap.beta ?? null,
  };
}

// ---------- HEADER ----------
const StockHeader = ({ t, live, asOf }) => {
  const isPos = (t.chgp ?? 0) >= 0;
  const nf = (v, d = 0) => (v == null || !isFinite(v)) ? '—' : fmt.num(v, d);
  const xf = (v, d = 1, suf = '') => (v == null || !isFinite(v)) ? '—' : v.toFixed(d) + suf;
  const asOfLabel = asOf ? new Date(asOf).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <div className="sw-header">
      <div className="sw-header-main">
        <div className="sw-symbol-block">
          <div className="sw-sym-row">
            <span className="sw-sym">{t.symbol}</span>
            <span className="sw-exch">{t.exchange}</span>
            <span className="sw-name">{t.name}</span>
            <span className={`prov-badge ${live ? 'live' : 'sample'}`} title={live ? ('Live quote · ' + asOfLabel + ' · Yahoo') : 'Loading / sample'}>
              <span className={`prov-dot ${live ? 'live' : 'sample'}`} />{live ? 'LIVE' : 'SAMPLE'}
            </span>
          </div>
          <div className="sw-meta-row">
            <span>{t.sector}</span>
            <span className="dot-sep">·</span>
            <span>{t.industry}</span>
            <span className="dot-sep">·</span>
            <span>Mkt Cap {t.mcap}</span>
            <span className="dot-sep">·</span>
            <span>{t.shares} shares</span>
          </div>
        </div>
        <div className="sw-quote-block">
          <div className="sw-px">{t.currency} {nf(t.price)}</div>
          <div className={`sw-chg ${isPos ? 'pos' : 'neg'}`}>
            {isPos ? '+' : ''}{nf(t.chg)} ({isPos ? '+' : ''}{xf(t.chgp, 2)}%)
          </div>
          <div className="sw-asof">{live ? ('As of ' + asOfLabel + ' WIB · Yahoo') : 'Loading live quote…'}</div>
        </div>
      </div>
      <div className="sw-stats">
        {[
          ['Open',   nf(t.open)],
          ['High',   nf(t.high)],
          ['Low',    nf(t.low)],
          ['Prev',   nf(t.prevClose)],
          ['Volume', t.volume != null ? (t.volume / 1e6).toFixed(1) + 'M' : '—'],
          ['Value',  t.value],
          ['52W H',  nf(t.w52h)],
          ['52W L',  nf(t.w52l)],
          ['P/E',    xf(t.pe, 1, 'x')],
          ['P/B',    xf(t.pb, 1, 'x')],
          ['Div Y',  xf(t.divYield, 1, '%')],
          ['β',      xf(t.beta, 2)],
        ].map(([l, v]) => (
          <div key={l} className="sw-stat">
            <div className="sw-stat-l">{l}</div>
            <div className="sw-stat-v">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- LEFT RAIL (section nav) ----------
// `live`: true = real runtime data (gets a green LIVE pip); false = mock/sample
// fixture (amber SAMPLE pip + a banner). Live sections lead each group.
const SECTIONS = [
  { id: 'chart',        label: 'Chart',              group: 'main',         live: true  },
  { id: 'overview',     label: 'Overview',           group: 'main',         live: true  },
  { id: 'financials',   label: 'Financials',         group: 'fundamentals', live: true  },
  { id: 'wacc',         label: 'WACC',               group: 'fundamentals', live: true  },
  { id: 'comparable',   label: 'Comparable',         group: 'fundamentals', live: true  },
  { id: 'owners',       label: 'Owners (KSEI)',      group: 'fundamentals', live: false },
  { id: 'suppliers',    label: 'Suppliers & Buyers', group: 'fundamentals', live: false },
  { id: 'transact',     label: 'Transactional',      group: 'main',         live: false },
  { id: 'risk',         label: 'Risk',               group: 'risk',         live: true  },
  { id: 'esg',          label: 'ESG',                group: 'risk',         live: false },
  { id: 'thesis',       label: 'AI Thesis',          group: 'thesis',       live: false },
  { id: 'monte',        label: 'Monte Carlo',        group: 'thesis',       live: true  },
  { id: 'notes',        label: 'Thesis Notes',       group: 'thesis',       live: false },
  { id: 'news',         label: 'News',               group: 'thesis',       live: true  },
  { id: 'mirofish',     label: 'MiroFish',           group: 'thesis',       live: false },
];

const StockLeftRail = ({ active, setActive }) => {
  const groups = {
    main: 'Analysis',
    fundamentals: 'Fundamentals',
    risk: 'Risk & ESG',
    thesis: 'Thesis',
  };
  const grouped = {};
  SECTIONS.forEach(s => { (grouped[s.group] = grouped[s.group] || []).push(s); });
  return (
    <div className="sw-rail">
      {Object.entries(grouped).map(([g, items]) => (
        <div key={g} className="sw-rail-group">
          <div className="sw-rail-group-label">{groups[g]}</div>
          {items.map(s => (
            <div key={s.id}
                 className={`sw-rail-item ${active === s.id ? 'active' : ''}`}
                 onClick={() => setActive(s.id)}
                 title={s.live ? 'Live data' : 'Sample data — illustrative, not a live feed'}>
              <span className="sw-rail-label">{s.label}</span>
              <span className={`sw-rail-pip ${s.live ? 'live' : 'sample'}`} />
            </div>
          ))}
        </div>
      ))}
      <div className="sw-rail-foot">
        <div className="sw-rail-foot-row">
          <span>Last sync</span><span>14:58 WIB</span>
        </div>
        <div className="sw-rail-foot-row">
          <span>Coverage</span><span>Qars Research</span>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// EQUITY DASHBOARD LANDING — Stockbit-style
// Left rail: 3 collapsible groups (IDX Universe / Watchlists / Scanners)
// Main: TradingView IHSG + Cmd-K index search + context news feed
// ================================================================

// Full IHSG universe (idx-universe.js, loaded earlier) when present; the inline
// list below is just a fallback for local dev without that file.
const IDX_UNIVERSE = (typeof window !== 'undefined' && window.IDX_UNIVERSE_FULL) || [
  { sym: 'BBCA', name: 'Bank Central Asia',     board: 'Main', sector: 'Banks',     mcap: 1242 },
  { sym: 'BBRI', name: 'Bank Rakyat Indonesia', board: 'Main', sector: 'Banks',     mcap:  812 },
  { sym: 'BMRI', name: 'Bank Mandiri',          board: 'Main', sector: 'Banks',     mcap:  580 },
  { sym: 'BBNI', name: 'Bank Negara Indonesia', board: 'Main', sector: 'Banks',     mcap:  214 },
  { sym: 'TLKM', name: 'Telkom Indonesia',      board: 'Main', sector: 'Telco',     mcap:  368 },
  { sym: 'ASII', name: 'Astra International',   board: 'Main', sector: 'Industrials', mcap: 230 },
  { sym: 'UNVR', name: 'Unilever Indonesia',    board: 'Main', sector: 'Consumer',  mcap:  140 },
  { sym: 'BYAN', name: 'Bayan Resources',       board: 'Main', sector: 'Coal',      mcap:  650 },
  { sym: 'ADRO', name: 'Adaro Energy',          board: 'Main', sector: 'Coal',      mcap:   75 },
  { sym: 'ITMG', name: 'Indo Tambangraya',      board: 'Main', sector: 'Coal',      mcap:   28 },
  { sym: 'ANTM', name: 'Aneka Tambang',         board: 'Main', sector: 'Mining',    mcap:   42 },
  { sym: 'GOTO', name: 'GoTo Gojek Tokopedia',  board: 'Main', sector: 'Tech',      mcap:   95 },
  { sym: 'AALI', name: 'Astra Agro Lestari',    board: 'Main', sector: 'Plantation', mcap:  16 },
  { sym: 'INDF', name: 'Indofood Sukses Makmur',board: 'Main', sector: 'Consumer',  mcap:   62 },
  { sym: 'BSDE', name: 'Bumi Serpong Damai',    board: 'Main', sector: 'Property',  mcap:   24 },
  { sym: 'PWON', name: 'Pakuwon Jati',          board: 'Main', sector: 'Property',  mcap:   18 },
  { sym: 'EXCL', name: 'XL Axiata',             board: 'Main', sector: 'Telco',     mcap:   31 },
  { sym: 'ARTO', name: 'Bank Jago',             board: 'Main', sector: 'Banks',     mcap:   38 },
  { sym: 'BRIS', name: 'Bank Syariah Indonesia',board: 'Main', sector: 'Banks',     mcap:   46 },
];
// Exposed for the WACC tool's peer-comparison engine (same-sector bottom-up beta).
window.IDX_UNIVERSE = IDX_UNIVERSE;

const EQUITY_WATCHLISTS = [
  { id: 'wl1', name: 'High-conviction long', items: 7,  thesis: 'Compounders with structural moats — BBCA, TLKM, ASII…' },
  { id: 'wl2', name: 'Coal beta basket',     items: 5,  thesis: 'Long-duration thermal coal exposure tied to Newcastle…' },
  { id: 'wl3', name: 'EV materials',         items: 4,  thesis: 'Nickel + battery materials — ANTM, MDKA, MBMA…' },
  { id: 'wl4', name: 'Yield + dividend',     items: 8,  thesis: 'High-payout names — UNVR, INDF, GGRM…' },
];

const EQUITY_SCANNERS = [
  { id: 'best80',   name: 'Qars Best 80%',           lastRun: '14:42', matches: 12 },
  { id: 'breakout', name: 'Breakout — 20D highs',    lastRun: '14:30', matches:  6 },
  { id: 'rotation', name: 'Sector rotation',         lastRun: '13:58', matches:  9 },
];

const EQUITY_INDEX_NEWS = [
  { time: '14:58', source: 'Bloomberg', sent: 'pos', net: 38, headline: 'IHSG breaks above 7,275 as foreign flows turn net positive ahead of BI decision', region: 'IDX' },
  { time: '14:42', source: 'Bisnis',    sent: 'pos', net: 72, headline: 'BBCA tembus 10,050 dengan volume 3× ADV', region: 'IDX' },
  { time: '13:21', source: 'Kontan',    sent: 'neg', net: -38, headline: 'Coal miners lag as Newcastle slips below USD 143/t', region: 'IDX' },
  { time: '11:08', source: 'Reuters',   sent: 'pos', net: 41, headline: 'BI poll — 71% of economists expect 25 bps cut at next meeting', region: 'IDX' },
];

const EquityIndexChart = ({ symbolKey = 'IDX:COMPOSITE' }) => {
  const ref = React.useRef(null);
  const idRef = React.useRef(`tv_idx_${Math.random().toString(36).slice(2)}`);
  React.useEffect(() => {
    const ensureScript = () => new Promise((res) => {
      if (window.TradingView) return res();
      const existing = document.getElementById('tv-loader');
      if (existing) { existing.addEventListener('load', res); existing.addEventListener('error', res); return; }
      const s = document.createElement('script');
      s.id = 'tv-loader';
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
    ensureScript().then(() => {
      if (!window.TradingView || !ref.current) return;
      ref.current.innerHTML = '';
      const inner = document.createElement('div');
      inner.id = idRef.current;
      inner.style.height = '100%';
      ref.current.appendChild(inner);
      try {
        new window.TradingView.widget({
          autosize: true, symbol: symbolKey, interval: 'D', timezone: 'Asia/Jakarta', theme: 'dark', style: '3',
          locale: 'en', toolbar_bg: '#020203', enable_publishing: false, hide_side_toolbar: true,
          allow_symbol_change: true, container_id: idRef.current,
        });
      } catch {}
    });
  }, [symbolKey]);
  return <div ref={ref} className="tv-mount" style={{ height: 360 }} />;
};

const EquityDashboard = ({ openStockTab }) => {
  const [groupOpen, setGroupOpen] = React.useState({ universe: true, watchlists: true, scanners: true });
  const [universeFilter, setUniverseFilter] = React.useState({ board: 'all', sector: 'all', mcap: 'all' });
  const [universeSearch, setUniverseSearch] = React.useState('');
  const [indexSym, setIndexSym] = React.useState('IDX:COMPOSITE');
  const [showSwitcher, setShowSwitcher] = React.useState(false);
  const indexOptions = [
    { v: 'IDX:COMPOSITE', l: '^JKSE — IHSG' },
    { v: 'TVC:LQ45',      l: '^LQ45' },
    { v: 'TVC:JII',       l: '^JII — Jakarta Islamic' },
    { v: 'SP:SPX',        l: '^GSPC — S&P 500' },
    { v: 'NASDAQ:IXIC',   l: '^IXIC — NASDAQ Composite' },
    { v: 'TVC:DXY',       l: '^DXY — Dollar index' },
  ];
  const filteredUniverse = IDX_UNIVERSE.filter(s =>
    (!universeSearch || s.sym.toLowerCase().includes(universeSearch.toLowerCase()) || s.name.toLowerCase().includes(universeSearch.toLowerCase())) &&
    (universeFilter.sector === 'all' || s.sector === universeFilter.sector)
  );
  const sectors = ['all', ...Array.from(new Set(IDX_UNIVERSE.map(s => s.sector)))];
  // Open any IDX ticker the user types (covers names not in the browse list).
  const openTyped = () => {
    const q = (universeSearch || '').trim().toUpperCase();
    if (q && openStockTab) openStockTab(q, (IDX_UNIVERSE.find(s => s.sym === q) || {}).name || q);
  };

  return (
    <div className="eq-dash">
      <aside className="eq-rail">
        {/* IDX UNIVERSE */}
        <div className={`eq-rail-group ${groupOpen.universe ? 'is-open' : 'is-closed'}`}>
          <button className="eq-rail-group-h" onClick={() => setGroupOpen(g => ({ ...g, universe: !g.universe }))}>
            <span className="eq-rail-group-glyph">{groupOpen.universe ? '▾' : '▸'}</span>
            <span className="eq-rail-group-l">IDX Universe</span>
            <span className="eq-rail-group-c">{IDX_UNIVERSE.length}</span>
          </button>
          {groupOpen.universe && (
            <div className="eq-rail-group-body">
              <div className="eq-rail-search">
                <input placeholder="Search or type a ticker → Enter…" value={universeSearch}
                       onChange={(e) => setUniverseSearch(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') openTyped(); }} />
              </div>
              <div className="eq-rail-chips">
                <span className="eq-rail-chip-l">Sector</span>
                {sectors.map(s => (
                  <button key={s} className={`eq-rail-chip ${universeFilter.sector === s ? 'is-on' : ''}`} onClick={() => setUniverseFilter(f => ({ ...f, sector: s }))}>{s}</button>
                ))}
              </div>
              <div className="eq-rail-count">{filteredUniverse.length} names · ↵ opens any IDX ticker</div>
              <ul className="eq-rail-list">
                {filteredUniverse.map(s => (
                  <li key={s.sym} className="eq-rail-item" onClick={() => openStockTab && openStockTab(s.sym, s.name)}>
                    <span className="eq-rail-item-sym">{s.sym}</span>
                    <span className="eq-rail-item-name">{s.name}</span>
                    <span className="eq-rail-item-meta">{s.sub || s.sector}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* WATCHLISTS */}
        <div className={`eq-rail-group ${groupOpen.watchlists ? 'is-open' : 'is-closed'}`}>
          <button className="eq-rail-group-h" onClick={() => setGroupOpen(g => ({ ...g, watchlists: !g.watchlists }))}>
            <span className="eq-rail-group-glyph">{groupOpen.watchlists ? '▾' : '▸'}</span>
            <span className="eq-rail-group-l">Watchlists</span>
            <span className="eq-rail-group-c">{EQUITY_WATCHLISTS.length}</span>
          </button>
          {groupOpen.watchlists && (
            <div className="eq-rail-group-body">
              {EQUITY_WATCHLISTS.map(w => (
                <div key={w.id} className="eq-rail-wl">
                  <div className="eq-rail-wl-h">
                    <span className="eq-rail-wl-name">{w.name}</span>
                    <span className="eq-rail-wl-c">{w.items} items</span>
                    <button className="eq-rail-wl-cog" title="Settings">⚙</button>
                  </div>
                  <div className="eq-rail-wl-thesis">{w.thesis}</div>
                </div>
              ))}
              <button className="eq-rail-add">+ New watchlist</button>
            </div>
          )}
        </div>

        {/* SCANNERS */}
        <div className={`eq-rail-group ${groupOpen.scanners ? 'is-open' : 'is-closed'}`}>
          <button className="eq-rail-group-h" onClick={() => setGroupOpen(g => ({ ...g, scanners: !g.scanners }))}>
            <span className="eq-rail-group-glyph">{groupOpen.scanners ? '▾' : '▸'}</span>
            <span className="eq-rail-group-l">Scanners</span>
            <span className="eq-rail-group-c">{EQUITY_SCANNERS.length}</span>
          </button>
          {groupOpen.scanners && (
            <div className="eq-rail-group-body">
              {EQUITY_SCANNERS.map(s => (
                <div key={s.id} className="eq-rail-scanner">
                  <span className="eq-rail-scanner-name">{s.name}</span>
                  <span className="eq-rail-scanner-meta">{s.matches} matches · {s.lastRun} WIB</span>
                </div>
              ))}
              <button className="eq-rail-add">→ Open Scanner workspace</button>
            </div>
          )}
        </div>
      </aside>

      <main className="eq-main">
        <div className="eq-index-head">
          <div className="eq-index-l">
            <button className="eq-index-switch" onClick={() => setShowSwitcher(s => !s)}>
              <span className="eq-index-cur">{indexOptions.find(o => o.v === indexSym)?.l}</span>
              <span className="eq-index-cmd">⌘K</span>
            </button>
            {showSwitcher && (
              <div className="eq-index-pop">
                <input autoFocus placeholder="Search index — IHSG, S&P, NASDAQ…" />
                <ul>
                  {indexOptions.map(o => (
                    <li key={o.v} onClick={() => { setIndexSym(o.v); setShowSwitcher(false); }}>{o.l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="eq-index-r">
            <span>last sync 14:58 WIB</span>
          </div>
        </div>

        <div className="eq-chart">
          <EquityIndexChart symbolKey={indexSym} />
        </div>

        <div className="eq-news">
          <div className="eq-news-h">
            <span>Index news</span>
            <span className="sub-h">context-aware · {indexSym}</span>
          </div>
          <ul className="nf-feed" style={{ borderTop: 'none' }}>
            {EQUITY_INDEX_NEWS.map((n, i) => (
              <li key={i} className={`nf-row is-${n.sent}`}>
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
      </main>
    </div>
  );
};

window.EquityDashboard = EquityDashboard;

// ---------- STICKY THESIS NOTES BAND (per stock, persisted) ----------
// Lives directly under the StockHeader on every tab. Collapsible.
// 5 fields: thesis, catalyst, key data, risks, additional research.
const ThesisBand = ({ symbol }) => {
  const storageKey = `lbc-thesis-${symbol}`;
  const [open, setOpen] = React.useState(() => {
    try {
      const v = localStorage.getItem(`${storageKey}-open`);
      return v === null ? false : v === '1';   // collapsed by default — frees the top for content
    } catch { return false; }
  });
  const [data, setData] = React.useState(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) return JSON.parse(v);
    } catch {}
    // Sensible default seeds keyed by symbol
    const seeds = {
      BBCA: {
        thesis:    'Best-in-class Indonesian deposit franchise. Premium justified by NPL leadership and digital channel migration.',
        catalyst:  'Q1 beat (May 8) · BI 25 bps cut window · Buyback authorization',
        keyData:   'CASA 82.6% · NIM 5.6% · NPL 1.04% · ROE 21.4%',
        risks:     'Peak NIM if BI over-cuts · Foreign flow rotation to value · Regulator-mandated rate caps',
        research:  'Q1 transcript · KSEI flow file · IDX-Banks peer benchmark',
      },
    };
    return seeds[symbol] || { thesis: '', catalyst: '', keyData: '', risks: '', research: '' };
  });
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [data, storageKey]);
  React.useEffect(() => {
    try { localStorage.setItem(`${storageKey}-open`, open ? '1' : '0'); } catch {}
  }, [open, storageKey]);
  const fields = [
    ['thesis',   'Investment thesis'],
    ['catalyst', 'Key catalyst'],
    ['keyData',  'Key data'],
    ['risks',    'Risks & validations'],
    ['research', 'Additional research'],
  ];
  return (
    <div className={`sw-thesis-band ${open ? 'is-open' : 'is-closed'}`}>
      <button className="sw-thesis-toggle" onClick={() => setOpen(o => !o)}>
        <span className="sw-thesis-toggle-glyph">{open ? '▾' : '▸'}</span>
        <span className="sw-thesis-toggle-l">Thesis Notes</span>
        <span className="sw-thesis-toggle-sub">{open ? 'expanded' : 'collapsed'} · auto-saved · {symbol}</span>
        <span className="sw-thesis-toggle-spacer" />
        {!open && data.thesis && <span className="sw-thesis-preview">{data.thesis.slice(0, 120)}{data.thesis.length > 120 ? '…' : ''}</span>}
      </button>
      {open && (
        <div className="sw-thesis-grid">
          {fields.map(([k, l]) => (
            <label key={k} className="sw-thesis-field">
              <span className="sw-thesis-l">{l}</span>
              <textarea
                rows={2}
                value={data[k] || ''}
                placeholder={`Add ${l.toLowerCase()}…`}
                onChange={(e) => setData(d => ({ ...d, [k]: e.target.value }))}
              />
            </label>
          ))}
          <div className="sw-thesis-foot">
            <span>📎 Drag a file or PDF here to attach</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>autosaves to localStorage · drives the equity Watchlist summaries</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- TRADINGVIEW EMBED ----------
// Free Advanced Chart Widget — owns its own indicators + drawing tools.
// Loads tv.js once; re-creates the widget on symbol change.
const TradingViewChart = ({ symbol = 'BBCA' }) => {
  const ref = React.useRef(null);
  const idRef = React.useRef(`tv_${Math.random().toString(36).slice(2)}`);
  const [status, setStatus] = React.useState('loading TradingView…');

  React.useEffect(() => {
    let cancelled = false;
    const ensureScript = () => new Promise((resolve) => {
      if (window.TradingView) return resolve();
      const existing = document.getElementById('tv-loader');
      if (existing) {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', resolve);
        return;
      }
      const s = document.createElement('script');
      s.id = 'tv-loader';
      s.src = 'https://s3.tradingview.com/tv.js';
      s.async = true;
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });

    ensureScript().then(() => {
      if (cancelled || !ref.current || !window.TradingView) {
        setStatus('TradingView offline — placeholder');
        return;
      }
      ref.current.innerHTML = '';
      const inner = document.createElement('div');
      inner.id = idRef.current;
      inner.style.height = '100%';
      ref.current.appendChild(inner);
      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: `IDX:${symbol}`,
          interval: 'D',
          timezone: 'Asia/Jakarta',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#020203',
          enable_publishing: false,
          hide_side_toolbar: false,
          hide_legend: false,
          allow_symbol_change: true,
          studies: ['MASimple@tv-basicstudies', 'Volume@tv-basicstudies'],
          container_id: idRef.current,
        });
        setStatus('online');
      } catch (e) {
        setStatus('TradingView init failed · ' + e.message);
      }
    });
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div className="tv-wrap">
      <div className="tv-status">{symbol} · TradingView · {status}</div>
      <div ref={ref} className="tv-mount" />
    </div>
  );
};

// ---------- CHART TOOLBAR ----------
const ChartToolbar = ({ tf, setTf, intervals, indicators, toggleIndicator }) => {
  const TFS = ['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'];
  return (
    <div className="sw-chart-toolbar">
      <div className="sw-tf-row">
        {TFS.map(t => (
          <button key={t} className={`sw-tf ${tf === t ? 'active' : ''}`} onClick={() => setTf(t)}>{t}</button>
        ))}
      </div>
      <div className="sw-tf-divider"></div>
      <div className="sw-tf-row">
        {[['ma','MA'],['bb','Bollinger'],['rsi','RSI']].map(([k, l]) => (
          <button key={k} className={`sw-tf ${indicators[k] ? 'active' : ''}`} onClick={() => toggleIndicator(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="sw-tf-spacer"></div>
      <button className="sw-tf">+ Compare</button>
      <button className="sw-tf">Indicators</button>
      <button className="sw-tf">⛶</button>
    </div>
  );
};

// ---------- OVERVIEW TAB ----------
const OverviewTab = ({ t, fix, candles, indicators }) => {
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">AI Thesis Snapshot <span className="conv-pill">Conviction {fix.thesis.conviction}</span></div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {fix.thesis.summary}
            </p>
            <div className="sw-pt-bar">
              <div className="sw-pt-track">
                <div className="sw-pt-marker bear" style={{ left: '6%' }}><span>Bear</span><b>{fmt.num(fix.thesis.pt.bear,0)}</b></div>
                <div className="sw-pt-marker base" style={{ left: '46%' }}><span>Base</span><b>{fmt.num(fix.thesis.pt.base,0)}</b></div>
                <div className="sw-pt-marker bull" style={{ left: '88%' }}><span>Bull</span><b>{fmt.num(fix.thesis.pt.bull,0)}</b></div>
                <div className="sw-pt-current" style={{ left: '34%' }}><span>Now</span><b>{fmt.num(fix.thesis.pt.current,0)}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="sw-panel">
          <div className="sw-panel-h">Key Stats — Q1 FY26</div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <div className="sw-kv-grid">
              <div className="sw-kv"><div className="l">Net Profit</div><div className="v">Rp 13.8 T</div><div className="sub pos">+11.7% YoY</div></div>
              <div className="sw-kv"><div className="l">Net Interest Income</div><div className="v">Rp 22.1 T</div><div className="sub pos">+13.4% YoY</div></div>
              <div className="sw-kv"><div className="l">Loans</div><div className="v">Rp 884 T</div><div className="sub pos">+9.2% YoY</div></div>
              <div className="sw-kv"><div className="l">Deposits</div><div className="v">Rp 1,184 T</div><div className="sub pos">+8.4% YoY</div></div>
              <div className="sw-kv"><div className="l">CASA</div><div className="v">82.6%</div><div className="sub pos">+0.8 pp</div></div>
              <div className="sw-kv"><div className="l">NPL</div><div className="v">1.04%</div><div className="sub pos">-0.14 pp</div></div>
              <div className="sw-kv"><div className="l">CAR</div><div className="v">27.8%</div><div className="sub pos">+0.7 pp</div></div>
              <div className="sw-kv"><div className="l">ROE</div><div className="v">21.4%</div><div className="sub pos">+0.8 pp</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h">Catalysts (next 90 days)</div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <table className="sw-tbl">
              <thead><tr><th>Date</th><th>Event</th><th>Impact</th><th style={{ textAlign: 'right' }}>Bias</th></tr></thead>
              <tbody>
                {fix.thesis.catalysts.map((c, i) => (
                  <tr key={i}>
                    <td>{c.date}</td>
                    <td className="ln">{c.event}</td>
                    <td><span className={`imp imp-${c.impact}`}>{c.impact}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={c.dir === 'pos' ? 'pos' : c.dir === 'neg' ? 'neg' : ''}>
                        {c.dir === 'pos' ? '▲' : c.dir === 'neg' ? '▼' : '◆'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Foreign Flow (5d net, Rp B)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <ColumnChart data={[
              { label: 'Mon', v: 412 }, { label: 'Tue', v: -184 }, { label: 'Wed', v: 624 },
              { label: 'Thu', v: 218 }, { label: 'Fri', v: 1421 },
            ]} height={160} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <span>5d net: <span className="pos">+Rp 2,491 B</span></span>
              <span>vs 30d avg: <span className="pos">+312%</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- TRANSACTIONAL TAB ----------
// ---------- BROKER ACCUMULATION + SCRIP/SCRIPLESS ----------
const BROKERS = [
  { code: 'CC',  name: 'Mandiri Sek',     color: '#19C37D' },
  { code: 'YP',  name: 'Mirae Asset',     color: '#97AAC5' },
  { code: 'BK',  name: 'JP Morgan',       color: '#F0AC4A' },
  { code: 'MG',  name: 'Maybank',         color: '#B988E0' },
  { code: 'CG',  name: 'Citi',            color: '#FF5C70' },
];
// 30 days of cumulative broker net positioning (Rp B)
const buildBrokerSeries = (seed) => {
  const out = [];
  for (let b = 0; b < BROKERS.length; b++) {
    const arr = [];
    let cum = 0;
    for (let i = 0; i < 30; i++) {
      const day = Math.sin((i + seed + b * 5) * 0.42) * 18 + (b - 2) * 1.6;
      cum += day;
      arr.push(cum);
    }
    out.push(arr);
  }
  return out;
};

const BrokerAccumulationChart = ({ symbol }) => {
  const series = React.useMemo(() => buildBrokerSeries(symbol.length), [symbol]);
  const W = 700, H = 200, pad = { l: 8, r: 8, t: 14, b: 22 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const all = series.flat();
  const min = Math.min(...all), max = Math.max(...all);
  const range = max - min || 1;
  const x = (i) => pad.l + (i / 29) * pw;
  const y = (v) => pad.t + (1 - (v - min) / range) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
      <defs>
        <pattern id="ba-grid" width="40" height="32" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect x={pad.l} y={pad.t} width={pw} height={ph} fill="url(#ba-grid)" />
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--text-tertiary)" strokeOpacity="0.4" strokeDasharray="3 3" strokeWidth="0.5" />
      {series.map((arr, b) => {
        const d = arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        return <path key={b} d={d} fill="none" stroke={BROKERS[b].color} strokeWidth="1.6" strokeLinecap="round" />;
      })}
      {[0, 7, 14, 21, 29].map((i, idx) => (
        <text key={idx} x={x(i)} y={H - 6} fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)" textAnchor={idx === 0 ? 'start' : idx === 4 ? 'end' : 'middle'}>D-{29 - i}</text>
      ))}
    </svg>
  );
};

const ScripVsScriplessBreakdown = ({ symbol }) => {
  // Mocked but stable per symbol
  const seed = symbol.length;
  const scripPct = 8 + (seed % 4); // 8-11%
  const scriplessPct = 100 - scripPct;
  const total = 14_240_000_000; // ~14.24B shares
  const scrip = Math.round(total * scripPct / 100);
  const scripless = total - scrip;
  return (
    <div className="sw-scrip">
      <div className="sw-scrip-bar">
        <span className="sw-scrip-seg sw-scrip-seg--scripless" style={{ width: `${scriplessPct}%` }}>{scriplessPct}% Scripless</span>
        <span className="sw-scrip-seg sw-scrip-seg--scrip" style={{ width: `${scripPct}%` }}>{scripPct}% Scrip</span>
      </div>
      <div className="sw-scrip-rows">
        <div className="sw-scrip-row">
          <span className="sw-scrip-l">Scripless (KSEI dematerialized)</span>
          <span className="sw-scrip-v">{(scripless / 1e9).toFixed(2)} B shares</span>
          <span className="sw-scrip-pct">{scriplessPct}%</span>
        </div>
        <div className="sw-scrip-row">
          <span className="sw-scrip-l">Scrip (physical certificates)</span>
          <span className="sw-scrip-v">{(scrip / 1e9).toFixed(2)} B shares</span>
          <span className="sw-scrip-pct">{scripPct}%</span>
        </div>
      </div>
      <div className="sw-scrip-note">
        ▒▓ Scrip-form holdings are a leading indicator of legacy / locked-up holders; declining over time as KSEI conversion continues.
      </div>
    </div>
  );
};

const TransactionalTab = ({ fix, symbol = 'BBCA' }) => {
  const flowMax = Math.max(...fix.flowBuckets.map(b => Math.abs(b.net)));
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">Broker accumulation (30d, cumulative Rp B)
            <span className="sw-broker-legend">
              {BROKERS.map(b => (
                <span key={b.code} className="sw-broker-leg">
                  <span className="sw-broker-dot" style={{ background: b.color }} />
                  <b>{b.code}</b> {b.name}
                </span>
              ))}
            </span>
          </div>
          <div className="sw-panel-body" style={{ padding: 12 }}>
            <BrokerAccumulationChart symbol={symbol} />
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Scrip vs Scripless breakdown
            <span className="sub-h">KSEI registry · YTD trend</span>
          </div>
          <div className="sw-panel-body" style={{ padding: 16 }}>
            <ScripVsScriplessBreakdown symbol={symbol} />
          </div>
        </div>
      </div>

      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">Participant Flow (today, Rp B)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            {fix.flowBuckets.map((b, i) => {
              const isPos = b.net >= 0;
              const w = (Math.abs(b.net) / flowMax) * 100;
              return (
                <div key={i} className="flow-row">
                  <div className="flow-label">{b.label}</div>
                  <div className="flow-bar">
                    <div className="flow-bar-track">
                      <div className={`flow-bar-fill ${isPos ? 'pos' : 'neg'}`}
                           style={{ width: `${w}%`, marginLeft: isPos ? '50%' : `${50 - w}%` }}></div>
                      <div className="flow-bar-zero"></div>
                    </div>
                  </div>
                  <div className={`flow-num ${isPos ? 'pos' : 'neg'}`}>
                    {isPos ? '+' : ''}{fmt.num(b.net, 0)}
                  </div>
                  <div className={`flow-pct ${isPos ? 'pos' : 'neg'}`}>
                    {isPos ? '+' : ''}{b.netPct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
            <div className="flow-foot">
              Total turnover Rp 4,432 B · Foreign net buy lead since Apr 24 (5/5 sessions)
            </div>
          </div>
        </div>

        <div className="sw-panel">
          <div className="sw-panel-h">Broker Stalker — top net (today)</div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <table className="sw-tbl">
              <thead><tr><th>Code</th><th>Broker</th><th style={{ textAlign: 'right' }}>Buy</th><th style={{ textAlign: 'right' }}>Sell</th><th style={{ textAlign: 'right' }}>Net</th></tr></thead>
              <tbody>
                {fix.brokers.map((b, i) => (
                  <tr key={i}>
                    <td><span className="brk-code">{b.code}</span></td>
                    <td className="ln">{b.name}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(b.buy, 0)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(b.sell, 0)}</td>
                    <td style={{ textAlign: 'right' }} className={`num ${b.net >= 0 ? 'pos' : 'neg'}`}>
                      {b.net >= 0 ? '+' : ''}{fmt.num(b.net, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h">Balance Position (cumulative net flow, 40d, Rp B)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <AreaChart data={fix.balancePosition.map(p => p.cum)} height={200} color="#5B8DEF" baseline={0} />
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
              <span>Net 40d: <span className="pos">+Rp 4,184 B</span></span>
              <span>Days net buy: 28 / 40</span>
              <span>Vol-weighted bias: <span className="pos">Bullish</span></span>
            </div>
          </div>
        </div>

        <div className="sw-panel">
          <div className="sw-panel-h">Seasonality (avg monthly return %)</div>
          <div className="sw-panel-body" style={{ padding: 0, overflow: 'auto' }}>
            <table className="sw-tbl seasonality-tbl">
              <thead><tr><th>Year</th>{['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => <th key={i} style={{ textAlign: 'center' }}>{m}</th>)}<th style={{ textAlign: 'right' }}>Σ</th></tr></thead>
              <tbody>
                {fix.seasonality.map((row, i) => {
                  const sum = row.months.reduce((a, b) => a + b.ret, 0);
                  return (
                    <tr key={i}>
                      <td>{row.year}</td>
                      {row.months.map((c, j) => {
                        const intensity = Math.min(1, Math.abs(c.ret) / 8);
                        const bg = c.ret >= 0
                          ? `rgba(31, 184, 119, ${intensity * 0.45})`
                          : `rgba(240, 71, 92, ${intensity * 0.45})`;
                        return (
                          <td key={j} style={{ background: bg, textAlign: 'center' }} className="num">
                            {c.ret >= 0 ? '+' : ''}{c.ret.toFixed(1)}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right' }} className={`num ${sum >= 0 ? 'pos' : 'neg'}`}>{sum >= 0 ? '+' : ''}{sum.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- FINANCIALS TAB ----------
// ---------- INDUSTRY-AWARE OP-KPI SCHEMAS ----------
// Spec calls for: Coal · Banks · Plantations · Consumer · Telco · Property.
// Hand-curated fixtures for ~6 reference tickers, drives the Operational KPI panel.
const OP_KPI_SCHEMAS = {
  coal: {
    name: 'Coal mining operations',
    sections: [
      { title: 'Pricing', items: [
        { l: 'ASP realized (FY25)',   v: 'USD 132.5/t', sub: 'YoY −4.8%', tone: 'neg' },
        { l: 'Forecast price (FY26)',  v: 'USD 138.0/t', sub: 'mgmt mid-pt', tone: 'flat' },
        { l: 'Newcastle bench (now)', v: 'USD 142.8/t', sub: '−2.1% MTD', tone: 'neg' },
      ]},
      { title: 'Reserves & permits', items: [
        { l: 'Proved reserves',         v: '418 Mt',  sub: 'JORC 2012',          tone: 'pos' },
        { l: 'Probable reserves',       v: '912 Mt',  sub: 'incl. Tabang ext.',  tone: 'pos' },
        { l: 'IUP / PKP2B status',      v: 'Active',  sub: 'expiry 2042+',       tone: 'pos' },
        { l: 'Concession area',         v: '102,950 ha', sub: '4 mining permits', tone: 'flat' },
      ]},
      { title: 'Production & efficiency', items: [
        { l: 'Production (FY25)',       v: '52.1 Mt',  sub: '+8.6% YoY',         tone: 'pos' },
        { l: 'Stripping ratio',         v: '4.2× (waste:coal)', sub: 'better than 5.0× plan', tone: 'pos' },
        { l: 'Cash cost / tonne',       v: 'USD 41.2/t',     sub: 'industry low quartile', tone: 'pos' },
        { l: 'Carrying value (mining properties, audited)', v: 'USD 405.8M', sub: 'as of Dec 2025', tone: 'flat' },
      ]},
      { title: 'Mine-by-mine breakdown', items: [
        { l: 'Tabang complex',          v: '34.8 Mt',  sub: 'flagship · low SR', tone: 'pos' },
        { l: 'Pakar',                   v: '11.2 Mt',  sub: 'mid-grade thermal', tone: 'flat' },
        { l: 'Bara Tabang',             v: '4.6 Mt',   sub: 'ramp-up phase',     tone: 'pos' },
        { l: 'Brian Anjat / others',    v: '1.5 Mt',   sub: 'satellite mines',   tone: 'flat' },
      ]},
    ],
  },
  banks: {
    name: 'Bank operating KPIs',
    sections: [
      { title: 'Profitability', items: [
        { l: 'NIM',  v: '5.62%', sub: '+12 bps QoQ',   tone: 'pos' },
        { l: 'CIR',  v: '36.4%', sub: '−180 bps YoY',  tone: 'pos' },
        { l: 'ROE',  v: '21.4%', sub: '+0.8 pp',       tone: 'pos' },
        { l: 'ROA',  v: '3.18%', sub: 'cycle high',    tone: 'pos' },
      ]},
      { title: 'Funding', items: [
        { l: 'CASA ratio', v: '82.6%', sub: 'peer avg ~70%', tone: 'pos' },
        { l: 'CASA growth', v: '+9.4% YoY', sub: 'best in cycle', tone: 'pos' },
        { l: 'Deposits',  v: 'Rp 1,184 T', sub: '+8.4% YoY', tone: 'pos' },
        { l: 'LDR',        v: '74.6%', sub: 'capital flexibility', tone: 'pos' },
      ]},
      { title: 'Asset quality', items: [
        { l: 'NPL',     v: '1.04%', sub: '−14 bps YoY', tone: 'pos' },
        { l: 'Coverage ratio', v: '258%', sub: 'overprovisioned', tone: 'pos' },
        { l: 'Special mention', v: '0.83%', sub: 'stable',       tone: 'flat' },
      ]},
      { title: 'Capital', items: [
        { l: 'CAR',     v: '27.8%', sub: '+0.7 pp', tone: 'pos' },
        { l: 'CET1',    v: '24.6%', sub: 'capital buffer ample', tone: 'pos' },
        { l: 'Dividend payout', v: '54%',  sub: 'sustainable',   tone: 'pos' },
      ]},
    ],
  },
  plantation: {
    name: 'Plantation operating KPIs',
    sections: [
      { title: 'Pricing', items: [
        { l: 'CPO ASP realized', v: 'MYR 4,250/t', sub: 'YoY +6.8%', tone: 'pos' },
        { l: 'CPO bench (Bursa)', v: 'MYR 4,180/t', sub: '+1.2% MTD', tone: 'pos' },
      ]},
      { title: 'Productivity', items: [
        { l: 'FFB yield',            v: '21.4 t/ha', sub: '+0.8 YoY',          tone: 'pos' },
        { l: 'Oil extraction rate',  v: '22.6%',     sub: 'best-in-class',     tone: 'pos' },
        { l: 'Planted area',         v: '142,500 ha', sub: '92% mature',        tone: 'flat' },
      ]},
    ],
  },
  consumer: {
    name: 'Consumer operating KPIs',
    sections: [
      { title: 'Same-store growth', items: [
        { l: 'SSSG (current Q)', v: '+4.8%', sub: 'volume +2.1, mix +2.7', tone: 'pos' },
        { l: 'SSSG (LTM)',       v: '+5.6%', sub: 'mid-cycle pace',         tone: 'pos' },
      ]},
      { title: 'Margin', items: [
        { l: 'Gross margin',     v: '52.4%', sub: '+80 bps YoY',            tone: 'pos' },
        { l: 'Premium SKU mix',  v: '38.2%', sub: 'shift continuing',       tone: 'pos' },
        { l: 'Distribution reach', v: '1.2M outlets', sub: '+5.4% YoY',     tone: 'pos' },
      ]},
    ],
  },
  telco: {
    name: 'Telco operating KPIs',
    sections: [
      { title: 'Subscriber economics', items: [
        { l: 'ARPU',  v: 'Rp 51,200', sub: '+2.4% YoY', tone: 'pos' },
        { l: 'MoU',   v: '120 min',   sub: 'flat',      tone: 'flat' },
        { l: 'Data MB / sub',  v: '14.2 GB', sub: '+18% YoY', tone: 'pos' },
        { l: 'Churn',         v: '2.1%',  sub: '−40 bps',  tone: 'pos' },
      ]},
      { title: 'Network', items: [
        { l: 'BTS sites',     v: '286,400', sub: '+4.2% YoY', tone: 'pos' },
        { l: '5G coverage',   v: '38% pop', sub: 'rollout ongoing', tone: 'pos' },
      ]},
    ],
  },
  property: {
    name: 'Property operating KPIs',
    sections: [
      { title: 'Sales velocity', items: [
        { l: 'Marketing sales (QTD)', v: 'Rp 4.2 T', sub: '+11% YoY', tone: 'pos' },
        { l: 'Pre-sold backlog',      v: 'Rp 18.4 T', sub: '8.6 mo of revenue', tone: 'pos' },
      ]},
      { title: 'Land & recurring', items: [
        { l: 'Landbank',              v: '7,840 ha', sub: 'Greater Jakarta',  tone: 'flat' },
        { l: 'Recurring rent ratio',  v: '32.4%',    sub: 'mall + office',    tone: 'pos' },
      ]},
    ],
  },
};

const symbolToSchema = (symbol) => {
  const map = {
    BBCA: 'banks', BBRI: 'banks', BMRI: 'banks', BBNI: 'banks', BBTN: 'banks', BRIS: 'banks', ARTO: 'banks',
    BYAN: 'coal', ADRO: 'coal', ITMG: 'coal', PTBA: 'coal', BUMI: 'coal',
    AALI: 'plantation', LSIP: 'plantation', SIMP: 'plantation', SSMS: 'plantation',
    UNVR: 'consumer', INDF: 'consumer', MYOR: 'consumer', ICBP: 'consumer', GGRM: 'consumer',
    TLKM: 'telco', EXCL: 'telco', ISAT: 'telco',
    BSDE: 'property', SMRA: 'property', PWON: 'property', LPKR: 'property',
  };
  return map[symbol] || 'banks';
};
// Exposed for the FinancialsPro terminal's curated Operating-KPI panel.
window.OP_KPI_SCHEMAS = OP_KPI_SCHEMAS;
window.symbolToSchema = symbolToSchema;

const OperationalKpiPanel = ({ symbol }) => {
  const schemaKey = symbolToSchema(symbol);
  const schema = OP_KPI_SCHEMAS[schemaKey];
  return (
    <div className="sw-panel" style={{ marginTop: 10 }}>
      <div className="sw-panel-h">
        Operational KPIs
        <span className="sub-h">industry-aware schema · {schemaKey} · {schema.name}</span>
      </div>
      <div className="sw-panel-body" style={{ padding: 0 }}>
        <div className="sw-opkpi-grid">
          {schema.sections.map((sec, si) => (
            <div key={si} className="sw-opkpi-section">
              <div className="sw-opkpi-section-h">{sec.title}</div>
              <div className="sw-opkpi-items">
                {sec.items.map((it, ii) => (
                  <div key={ii} className="sw-opkpi-item">
                    <span className="sw-opkpi-l">{it.l}</span>
                    <span className={`sw-opkpi-v sw-opkpi-v--${it.tone}`}>{it.v}</span>
                    <span className={`sw-opkpi-sub sw-opkpi-sub--${it.tone}`}>{it.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FinancialsTab = ({ fix, symbol }) => {
  return (
    <div className="sw-section">
      <OperationalKpiPanel symbol={symbol} />
      <div className="sw-panel">
        <div className="sw-panel-h">Income Statement (Rp Bn) — annual</div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          <table className="sw-tbl">
            <thead>
              <tr>
                <th>Line item</th>
                <th style={{ textAlign: 'right' }}>FY22</th>
                <th style={{ textAlign: 'right' }}>FY23</th>
                <th style={{ textAlign: 'right' }}>FY24</th>
                <th style={{ textAlign: 'right' }}>FY25</th>
                <th style={{ textAlign: 'right' }}>YoY</th>
              </tr>
            </thead>
            <tbody>
              {fix.financials.income.map((r, i) => {
                const yoy = ((r.y2025 - r.y2024) / Math.abs(r.y2024)) * 100;
                const isTotal = ['Operating Income','Pre-Tax Profit','Net Profit','EPS (IDR)'].includes(r.label);
                return (
                  <tr key={i} className={isTotal ? 'bold-row' : ''}>
                    <td className="ln">{r.label}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(r.y2022, 0)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(r.y2023, 0)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(r.y2024, 0)}</td>
                    <td style={{ textAlign: 'right' }} className="num">{fmt.num(r.y2025, 0)}</td>
                    <td style={{ textAlign: 'right' }} className={`num ${yoy >= 0 ? 'pos' : 'neg'}`}>
                      {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sw-panel" style={{ marginTop: 10 }}>
        <div className="sw-panel-h">Key Ratios — annual</div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          <table className="sw-tbl">
            <thead>
              <tr>
                <th>Ratio</th>
                <th style={{ textAlign: 'right' }}>FY22</th>
                <th style={{ textAlign: 'right' }}>FY23</th>
                <th style={{ textAlign: 'right' }}>FY24</th>
                <th style={{ textAlign: 'right' }}>FY25</th>
                <th style={{ textAlign: 'right' }}>5y trend</th>
              </tr>
            </thead>
            <tbody>
              {fix.financials.ratios.map((r, i) => (
                <tr key={i}>
                  <td className="ln">{r.label}</td>
                  <td style={{ textAlign: 'right' }} className="num">{r.y2022}</td>
                  <td style={{ textAlign: 'right' }} className="num">{r.y2023}</td>
                  <td style={{ textAlign: 'right' }} className="num">{r.y2024}</td>
                  <td style={{ textAlign: 'right' }} className="num">{r.y2025}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', width: 70 }}>
                      <Spark data={[r.y2022, r.y2023, r.y2024, r.y2025]} color={r.y2025 >= r.y2022 ? 'var(--pos)' : 'var(--neg)'} w={70} h={20} fill={false} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------- COMPARABLE ----------
const ComparableTab = ({ fix }) => {
  return (
    <div className="sw-section">
      <div className="sw-panel">
        <div className="sw-panel-h">Comparable Analysis — IDX Banks</div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          <table className="sw-tbl">
            <thead>
              <tr>
                <th>Ticker</th><th>Name</th>
                <th style={{ textAlign: 'right' }}>Mkt Cap (T)</th>
                <th style={{ textAlign: 'right' }}>P/E</th>
                <th style={{ textAlign: 'right' }}>P/B</th>
                <th style={{ textAlign: 'right' }}>ROE</th>
                <th style={{ textAlign: 'right' }}>NIM</th>
                <th style={{ textAlign: 'right' }}>Div Y</th>
                <th style={{ textAlign: 'right' }}>YTD</th>
              </tr>
            </thead>
            <tbody>
              {fix.peers.map((p, i) => (
                <tr key={i} className={p.sym === 'BBCA' ? 'sel' : ''}>
                  <td><span className="brk-code">{p.sym}</span></td>
                  <td className="ln">{p.name}</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.mcap}</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.pe.toFixed(1)}x</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.pb.toFixed(1)}x</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.roe.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.nim.toFixed(2)}%</td>
                  <td style={{ textAlign: 'right' }} className="num">{p.divY.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }} className={`num ${p.ytd >= 0 ? 'pos' : 'neg'}`}>
                    {p.ytd >= 0 ? '+' : ''}{p.ytd.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h">P/B vs ROE (IDX Banks)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <ScatterChart points={fix.peers.map(p => ({ x: p.roe, y: p.pb, label: p.sym, hl: p.sym === 'BBCA' }))}
                          xLabel="ROE %" yLabel="P/B (x)" height={240} />
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">FA / VA Score (composite vs peers)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            {[
              ['Profitability', 92, 76],
              ['Asset Quality', 96, 72],
              ['Capital',       94, 78],
              ['Funding',       89, 68],
              ['Growth',        78, 71],
              ['Valuation',     56, 64],
            ].map(([l, b, p], i) => (
              <div key={i} className="fa-row">
                <div className="fa-label">{l}</div>
                <div className="fa-track">
                  <div className="fa-fill peer" style={{ width: `${p}%` }}></div>
                  <div className="fa-fill mine" style={{ width: `${b}%` }}></div>
                  <span className="fa-marker mine"  style={{ left: `${b}%` }}>{b}</span>
                  <span className="fa-marker peer" style={{ left: `${p}%` }}>{p}</span>
                </div>
              </div>
            ))}
            <div className="fa-legend">
              <span><i className="mine"></i> BBCA</span>
              <span><i className="peer"></i> Peer median</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- SCATTER ----------
const ScatterChart = ({ points, height = 220, xLabel, yLabel }) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(400);
  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(160, e.contentRect.width));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xMin = Math.min(...xs) * 0.85, xMax = Math.max(...xs) * 1.1;
  const yMin = Math.min(...ys) * 0.85, yMax = Math.max(...ys) * 1.1;
  const padL = 36, padR = 8, padT = 12, padB = 24;
  const innerW = w - padL - padR, innerH = height - padT - padB;
  const sx = (v) => padL + ((v - xMin) / (xMax - xMin)) * innerW;
  const sy = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        {[0,0.25,0.5,0.75,1].map((p, i) => (
          <line key={`gx${i}`} x1={padL + p*innerW} x2={padL+p*innerW} y1={padT} y2={padT+innerH}
                stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth="0.5" />
        ))}
        {[0,0.25,0.5,0.75,1].map((p, i) => (
          <line key={`gy${i}`} x1={padL} x2={padL+innerW} y1={padT + p*innerH} y2={padT+p*innerH}
                stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth="0.5" />
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={p.hl ? 7 : 5}
                    fill={p.hl ? 'var(--brand-steel)' : 'var(--text-tertiary)'}
                    opacity={p.hl ? 1 : 0.7}
                    stroke={p.hl ? '#fff' : 'none'} strokeWidth="1" />
            <text x={sx(p.x) + 9} y={sy(p.y) + 3}
                  fontSize="10.5" fontFamily="var(--font-mono)"
                  fill={p.hl ? 'var(--text-primary)' : 'var(--text-secondary)'}>
              {p.label}
            </text>
          </g>
        ))}
        <text x={padL + innerW / 2} y={height - 6} fill="var(--text-tertiary)" fontSize="10" textAnchor="middle">{xLabel}</text>
        <text x={10} y={padT + innerH/2} fill="var(--text-tertiary)" fontSize="10" textAnchor="middle"
              transform={`rotate(-90 12 ${padT + innerH/2})`}>{yLabel}</text>
      </svg>
    </div>
  );
};

// ---------- OWNERS (KSEI-style) ----------
// ---------- STOCKHOLDER TREE (force-directed placeholder) ----------
const STOCKHOLDER_TREE = {
  // Hand-curated UBO graph for BBCA. In production this would be derived from
  // KSEI ownership filings + BO disclosure forms.
  nodes: [
    { id: 'bbca',     label: 'BBCA',                           type: 'issuer',   pct: 100.0, x: 0.50, y: 0.50, r: 32 },
    { id: 'farindo',  label: 'PT Dwimuria Investama Andalan',  type: 'corp',     pct: 54.94, x: 0.18, y: 0.30, r: 24 },
    { id: 'hartono',  label: 'Hartono Family',                 type: 'family',   pct: 100.0, x: 0.05, y: 0.16, r: 18 },
    { id: 'rfree',    label: 'Public Float',                   type: 'free',     pct: 39.28, x: 0.85, y: 0.30, r: 22 },
    { id: 'foreign',  label: 'Foreign institutions',           type: 'inst',     pct: 33.42, x: 0.92, y: 0.10, r: 16 },
    { id: 'dom',      label: 'Domestic institutions',          type: 'inst',     pct: 17.61, x: 0.95, y: 0.50, r: 14 },
    { id: 'retail',   label: 'Retail',                         type: 'retail',   pct: 8.25,  x: 0.78, y: 0.56, r: 12 },
    { id: 'employee', label: 'ESOP / Treasury',                type: 'corp',     pct: 5.78,  x: 0.50, y: 0.84, r: 14 },
  ],
  edges: [
    ['hartono', 'farindo', 100.0],
    ['farindo', 'bbca',     54.94],
    ['rfree',   'bbca',     39.28],
    ['employee','bbca',      5.78],
    ['foreign', 'rfree',    85.10],
    ['dom',     'rfree',    44.85],
    ['retail',  'rfree',    21.00],
  ],
};

const StockholderTree = ({ tree, depthLimit, minPct, onPick, focus }) => {
  const W = 720, H = 360;
  const visible = tree.nodes.filter(n => n.pct >= minPct);
  const visibleSet = new Set(visible.map(n => n.id));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: H }}>
      <defs>
        <pattern id="ow-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#ow-grid)" />
      {tree.edges.filter(([a, b]) => visibleSet.has(a) && visibleSet.has(b)).map(([a, b, w], i) => {
        const na = tree.nodes.find(n => n.id === a);
        const nb = tree.nodes.find(n => n.id === b);
        const isFocused = focus === a || focus === b;
        return (
          <g key={i}>
            <line x1={na.x*W} y1={na.y*H} x2={nb.x*W} y2={nb.y*H}
                  stroke="var(--brand)" strokeWidth={Math.max(1, (w/100) * 5)}
                  strokeOpacity={isFocused ? 0.9 : 0.32} />
            <text x={(na.x*W + nb.x*W) / 2} y={(na.y*H + nb.y*H) / 2 - 4}
                  textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5"
                  fill={isFocused ? 'var(--brand-strong)' : 'var(--text-tertiary)'}
                  letterSpacing="0.04em">{w.toFixed(2)}%</text>
          </g>
        );
      })}
      {visible.map(n => {
        const isFocus = n.id === focus;
        const colors = { issuer: 'var(--brand)', corp: '#97AAC5', family: '#F0AC4A', inst: '#19C37D', free: '#B988E0', retail: '#C76F4D' };
        return (
          <g key={n.id} onClick={() => onPick(n.id)} style={{ cursor: 'pointer' }}>
            <circle cx={n.x*W} cy={n.y*H} r={n.r}
                    fill={isFocus ? colors[n.type] : 'var(--bg-3)'}
                    stroke={colors[n.type]} strokeWidth={isFocus ? 3 : 1.5} />
            <text x={n.x*W} y={n.y*H + 3} textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="9"
                  fill={isFocus ? 'var(--ink-deep)' : 'var(--text-primary)'}
                  fontWeight="700">{n.pct.toFixed(1)}%</text>
            <text x={n.x*W} y={n.y*H + n.r + 14} textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="9.5"
                  fill="var(--text-secondary)" letterSpacing="0.04em">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const OwnersTab = ({ fix }) => {
  let cum = 0;
  const [depthLimit, setDepthLimit] = React.useState(3);
  const [minPct, setMinPct] = React.useState(2.0);
  const [focus, setFocus] = React.useState('bbca');
  const focusNode = STOCKHOLDER_TREE.nodes.find(n => n.id === focus);
  const freeFloat = STOCKHOLDER_TREE.nodes.find(n => n.id === 'rfree')?.pct || 0;
  return (
    <div className="sw-section">
      {/* Free-float banner — surfaced prominently */}
      <div className="sw-ff-banner">
        <div className="sw-ff-l">Free float</div>
        <div className="sw-ff-v">{freeFloat.toFixed(2)}%</div>
        <div className="sw-ff-bar"><span style={{ width: `${freeFloat}%` }} /></div>
        <div className="sw-ff-meta">
          <span>Foreign 33.42%</span>·<span>Domestic 17.61%</span>·<span>Retail 8.25%</span>
        </div>
      </div>

      <div className="sw-panel" style={{ marginTop: 10 }}>
        <div className="sw-panel-h">
          Stockholder tree
          <span className="sub-h">UBO graph · click any node</span>
          <span className="sw-ff-controls">
            <label>Min holding ≥ <input type="range" min="0.5" max="10" step="0.5" value={minPct} onChange={(e) => setMinPct(parseFloat(e.target.value))} /> <b>{minPct.toFixed(1)}%</b></label>
            <label>Depth ≤ <input type="range" min="1" max="4" step="1" value={depthLimit} onChange={(e) => setDepthLimit(parseInt(e.target.value, 10))} /> <b>{depthLimit}</b></label>
          </span>
        </div>
        <div className="sw-panel-body sw-tree-body">
          <div className="sw-tree-canvas">
            <StockholderTree tree={STOCKHOLDER_TREE} depthLimit={depthLimit} minPct={minPct} onPick={setFocus} focus={focus} />
          </div>
          {focusNode && (
            <aside className="sw-tree-drawer">
              <div className="sw-tree-drawer-h">
                <span className={`mc-tag`}>{focusNode.type}</span>
                <h3>{focusNode.label}</h3>
              </div>
              <div className="sw-tree-drawer-section">
                <div className="ind-graph-drawer-h-sub">Holding</div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)' }}><b>{focusNode.pct.toFixed(2)}%</b></p>
              </div>
              <div className="sw-tree-drawer-section">
                <div className="ind-graph-drawer-h-sub">Direct relations</div>
                <ul>
                  {STOCKHOLDER_TREE.edges.filter(([a,b]) => a === focus || b === focus).map(([a,b,w], i) => {
                    const other = a === focus ? b : a;
                    const dir = a === focus ? '→' : '←';
                    const node = STOCKHOLDER_TREE.nodes.find(n => n.id === other);
                    return <li key={i}><span>{dir} {node?.label}</span><span className="num">{w.toFixed(2)}%</span></li>;
                  })}
                </ul>
              </div>
              <div className="sw-tree-drawer-section">
                <div className="ind-graph-drawer-h-sub">Profile</div>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {focusNode.id === 'farindo' && 'Holding company controlled by the Hartono family. The largest single shareholder of BBCA. Listed on IDX as Indonesia\'s largest private financial conglomerate.'}
                  {focusNode.id === 'hartono' && 'Robert Budi Hartono and Michael Bambang Hartono. Indonesia\'s wealthiest family. Also controls Djarum, Polytron, Mola TV.'}
                  {focusNode.id === 'rfree' && 'Public float — distributed across foreign institutions, domestic institutions, and retail investors. Free-float weight in IDX-LQ45 = 30.96%.'}
                  {focusNode.id === 'bbca' && 'Bank Central Asia Tbk. Largest private bank in Indonesia. Listed on IDX since 2000. ~22,000 employees, ~1,250 branches.'}
                  {focusNode.id !== 'farindo' && focusNode.id !== 'hartono' && focusNode.id !== 'rfree' && focusNode.id !== 'bbca' && 'Disclosure-driven counterparty class. Aggregated from KSEI registry data.'}
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>

      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h">Holder breakdown <span className="sub-h">KSEI · Mar 2026</span></div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <div className="holder-bar">
              {fix.holders.map((h, i) => (
                <div key={i} className="holder-seg" style={{ width: `${h.pct}%`, background: h.color }}
                     title={`${h.label} ${h.pct}%`}></div>
              ))}
            </div>
            <div className="holder-list">
              {fix.holders.map((h, i) => (
                <div key={i} className="holder-row">
                  <div className="holder-swatch" style={{ background: h.color }}></div>
                  <div className="holder-label">{h.label}</div>
                  <div className="holder-pct">{h.pct.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Domestic vs Foreign trend (12m)</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <AreaChart
              data={[31.2, 31.8, 32.1, 32.4, 32.6, 32.9, 33.1, 33.0, 33.2, 33.3, 33.4, 33.42]}
              height={180} color="#5B8DEF" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <span>Foreign holding %</span>
              <span><span className="pos">+2.22 pp</span> vs Apr 2025</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sw-panel" style={{ marginTop: 10 }}>
        <div className="sw-panel-h">Top holders (Mar 2026)</div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          <table className="sw-tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Holder</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Shares</th>
                <th style={{ textAlign: 'right' }}>% Float</th>
                <th style={{ textAlign: 'right' }}>Δ QoQ</th>
                <th style={{ textAlign: 'right' }}>As of</th>
              </tr>
            </thead>
            <tbody>
              {fix.topHolders.map((h, i) => (
                <tr key={i}>
                  <td className="num">{i+1}</td>
                  <td className="ln">{h.name}</td>
                  <td>{h.type}</td>
                  <td style={{ textAlign: 'right' }} className="num">{h.shares}</td>
                  <td style={{ textAlign: 'right' }} className="num">{h.pct.toFixed(2)}%</td>
                  <td style={{ textAlign: 'right' }} className={`num ${h.changeQ >= 0 ? 'pos' : h.changeQ < 0 ? 'neg' : ''}`}>
                    {h.changeQ === 0 ? '—' : (h.changeQ >= 0 ? '+' : '') + h.changeQ.toFixed(2) + ' pp'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }} className="num">{h.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------- RISK ----------
const RiskTab = ({ fix }) => {
  const r = fix.risk;
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">Risk metrics</div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <div className="sw-kv-grid">
              <div className="sw-kv"><div className="l">Beta (1y)</div><div className="v">{r.beta.toFixed(2)}</div><div className="sub">vs IHSG</div></div>
              <div className="sw-kv"><div className="l">Vol 30d</div><div className="v">{r.vol30}%</div><div className="sub">annualized</div></div>
              <div className="sw-kv"><div className="l">Vol 1y</div><div className="v">{r.vol1y}%</div><div className="sub">annualized</div></div>
              <div className="sw-kv"><div className="l">VaR 95%</div><div className="v neg">{r.var95}%</div><div className="sub">1d parametric</div></div>
              <div className="sw-kv"><div className="l">Sharpe (1y)</div><div className="v">{r.sharpe.toFixed(2)}</div><div className="sub">rf 5.5%</div></div>
              <div className="sw-kv"><div className="l">Drawdown 1y</div><div className="v neg">{r.drawdown1y}%</div><div className="sub">peak-to-trough</div></div>
              <div className="sw-kv"><div className="l">Max DD</div><div className="v neg">{r.drawdownMax}%</div><div className="sub">since 2018</div></div>
              <div className="sw-kv"><div className="l">Liquidity</div><div className="v pos">High</div><div className="sub">ADV Rp 1.6T</div></div>
            </div>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Correlations</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            {Object.entries(r.correl).map(([k, v]) => (
              <div key={k} className="fa-row">
                <div className="fa-label">{k.toUpperCase()}</div>
                <div className="fa-track">
                  <div className="fa-fill mine" style={{ width: `${Math.abs(v) * 100}%` }}></div>
                  <span className="fa-marker mine" style={{ left: `${Math.abs(v) * 100}%` }}>{v.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- ESG ----------
const EsgTab = ({ fix }) => {
  const e = fix.esg;
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">ESG ratings</div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <div className="sw-kv-grid">
              <div className="sw-kv"><div className="l">MSCI ESG</div><div className="v" style={{ color: '#1FB877' }}>{e.msci}</div><div className="sub">on AAA scale</div></div>
              <div className="sw-kv"><div className="l">Sustainalytics</div><div className="v">{e.sustainalytics}</div><div className="sub">low risk</div></div>
              <div className="sw-kv"><div className="l">Controversies</div><div className="v pos">{e.controversies}</div><div className="sub">last 24m</div></div>
              <div className="sw-kv"><div className="l">Sustainable finance</div><div className="v">{e.sustainableFinance}%</div><div className="sub">of loan book</div></div>
            </div>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Pillar scores</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            {Object.entries(e.pillars).map(([k, v]) => (
              <div key={k} className="fa-row">
                <div className="fa-label">{k === 'e' ? 'Environment' : k === 's' ? 'Social' : 'Governance'}</div>
                <div className="fa-track">
                  <div className="fa-fill mine" style={{ width: `${(v / 10) * 100}%` }}></div>
                  <span className="fa-marker mine" style={{ left: `${(v / 10) * 100}%` }}>{v.toFixed(1)}</span>
                </div>
              </div>
            ))}
            <div className="fa-legend"><span><i className="mine"></i> Score / 10</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- THESIS ----------
const ThesisTab = ({ fix }) => {
  return (
    <div className="sw-section">
      <div className="sw-panel">
        <div className="sw-panel-h">
          AI Thesis · Conviction {fix.thesis.conviction}
          <span className="sub-h">{fix.thesis.lastUpdate}</span>
        </div>
        <div className="sw-panel-body" style={{ padding: 16 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{fix.thesis.summary}</p>
        </div>
      </div>

      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h" style={{ color: 'var(--pos)' }}>Bull Case</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <ul className="thesis-list pos">{fix.thesis.bullCase.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h" style={{ color: 'var(--neg)' }}>Bear Case</div>
          <div className="sw-panel-body" style={{ padding: 14 }}>
            <ul className="thesis-list neg">{fix.thesis.bearCase.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- MONTE CARLO ----------
const MonteCarloTab = ({ fix }) => {
  const paths = fix.thesis.monteCarloPaths;
  const allVals = paths.flat();
  const yMin = Math.min(...allVals) * 0.97;
  const yMax = Math.max(...allVals) * 1.03;
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(800);
  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(320, e.contentRect.width));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const h = 320;
  const padL = 50, padR = 60, padT = 12, padB = 24;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const px = (i) => padL + (i / (paths[0].length - 1)) * innerW;
  const py = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  return (
    <div className="sw-section">
      <div className="sw-panel">
        <div className="sw-panel-h">Monte Carlo simulation · 60 trading days · {paths.length} paths · σ 18.6%</div>
        <div ref={wrapRef} className="sw-panel-body" style={{ padding: 14 }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const v = yMin + (yMax - yMin) * (1 - p);
              const y = padT + p * innerH;
              return (
                <g key={i}>
                  <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth="0.5" />
                  <text x={padL - 6} y={y + 3} fill="var(--text-tertiary)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">{fmt.num(v, 0)}</text>
                </g>
              );
            })}
            {paths.map((p, i) => (
              <polyline key={i} fill="none" stroke="var(--brand-steel)" strokeOpacity="0.18" strokeWidth="0.8"
                        points={p.map((v, j) => `${px(j)},${py(v)}`).join(' ')} />
            ))}
            {/* Mean path */}
            {(() => {
              const mean = paths[0].map((_, j) => paths.reduce((a, p) => a + p[j], 0) / paths.length);
              return <polyline fill="none" stroke="#F5B544" strokeWidth="1.6"
                               points={mean.map((v, j) => `${px(j)},${py(v)}`).join(' ')} />;
            })()}
          </svg>
          <div style={{ display: 'flex', gap: 28, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11.5, flexWrap: 'wrap' }}>
            <div><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>P5 path end</div><div className="neg">{fmt.num(yMin * 1.01, 0)}</div></div>
            <div><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Mean</div><div>{fmt.num(11240, 0)}</div></div>
            <div><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>P95 path end</div><div className="pos">{fmt.num(yMax * 0.99, 0)}</div></div>
            <div><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Prob &gt; PT base</div><div className="pos">68%</div></div>
            <div><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>Prob &gt; PT bull</div><div>22%</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- THESIS NOTES ----------
const NotesTab = () => {
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">Investment Thesis <span className="sub-h">Aldi · 2 days ago</span></div>
          <div className="sw-panel-body" style={{ padding: 16 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              Long BBCA on relative quality re-rating. Best-in-class CASA franchise compounds at 14-16% NII with sub-1.1% NPL through cycle. Premium multiple is not the bug — it's the feature: pricing power on funding side translates structurally. Catalysts cluster May-Aug.
            </p>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Key Catalysts <span className="sub-h">monitoring 4</span></div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <ul className="note-list">
              <li><span className="dot pos"></span><b>Q1 FY26 results</b> — beat consensus by 4-6% (May)</li>
              <li><span className="dot"></span><b>BI rate decision</b> — hold expected, watch dot plot</li>
              <li><span className="dot pos"></span><b>Buyback authorization</b> — board approval mid-July</li>
              <li><span className="dot"></span><b>AGM dividend declaration</b> — base case 60% payout</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="sw-grid-2" style={{ marginTop: 10 }}>
        <div className="sw-panel">
          <div className="sw-panel-h">Risk & Validation Points</div>
          <div className="sw-panel-body" style={{ padding: 16 }}>
            <ul className="note-list">
              <li><span className="dot neg"></span><b>NIM compression</b> — invalidate if NIM &lt; 5.5% for 2 quarters</li>
              <li><span className="dot neg"></span><b>NPL inflection</b> — invalidate if NPL &gt; 1.4% or coverage &lt; 200%</li>
              <li><span className="dot neg"></span><b>Loan growth stall</b> — concern if YoY &lt; 6% for 2 quarters</li>
            </ul>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Additional Research <span className="sub-h">3 docs</span></div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <ul className="note-list links">
              <li>📄 BBCA Q4 FY25 transcript — annotated</li>
              <li>📄 IDX Banks deep dive — peer benchmarking (Apr 2026)</li>
              <li>📄 KSEI ownership analysis — foreign flow regime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- SUPPLIERS & BUYERS ----------
const SUPPLIERS_DATA = [
  { id: 's1', name: 'PT Sumber Energi Andalan', exp: 14.2, sector: 'Coal logistics',  rev: 'Rp 2.4T',  tag: 'top',  country: 'ID', listed: false, since: 2014, contractType: '5y rolling supply', notes: 'Trucking + barge logistics partner servicing Tabang and Pakar mines. Long-term contract with annual price escalator tied to Newcastle benchmark.', news: ['Q1 volume +12% on Tabang ramp', 'Renewed 5y contract Mar 2026'] },
  { id: 's2', name: 'PT Indo Tambang Servis',   exp: 9.8,  sector: 'Mining services', rev: 'Rp 1.6T',  tag: 'core', country: 'ID', listed: false, since: 2017, contractType: 'Annual master', notes: 'Drill-and-blast contractor. Performance-linked pricing. Concentrated exposure to BYAN/BUMI.', news: ['Won expansion at Bara Tabang', 'Safety audit completed Apr 2026'] },
  { id: 's3', name: 'Caterpillar Indonesia',    exp: 7.1,  sector: 'Heavy equipment', rev: 'USD 78M',  tag: 'core', country: 'US', listed: true,  since: 2009, contractType: 'OEM + service',  notes: 'Equipment + parts + service. Strategic partner for fleet electrification roadmap. New 793 fleet rollout in H2 2026.', news: ['CAT 793F-XE order delivered', 'Service-level agreement extended'] },
  { id: 's4', name: 'Pertamina Patra Niaga',    exp: 6.4,  sector: 'Fuel',            rev: 'Rp 1.0T',  tag: 'core', country: 'ID', listed: true,  since: 2003, contractType: 'B2B fuel supply', notes: 'Diesel and biodiesel supply. Pricing pass-through. Risk: subsidy regime change.', news: ['Subsidy review pending Q3 2026'] },
  { id: 's5', name: 'PT Trakindo Utama',        exp: 5.2,  sector: 'Heavy equipment', rev: 'Rp 0.9T',  tag: '',     country: 'ID', listed: false, since: 2011, contractType: 'CAT dealer',     notes: 'Domestic CAT distributor. Rental + parts inventory. Backup to direct CAT relationship.', news: [] },
];
const BUYERS_DATA = [
  { id: 'b1', name: 'Tata Power Trading',       exp: 22.6, sector: 'Utility',  rev: 'USD 412M', tag: 'top',  country: 'IN', listed: true,  since: 2012, contractType: '10y FOB offtake', notes: 'India\'s largest private utility. Largest single-buyer concentration in BYAN portfolio. Pricing quarterly reset to Newcastle minus discount.', news: ['Q1 lifting +8%', 'Contract review 2027'] },
  { id: 'b2', name: 'Korea Electric Power',     exp: 18.4, sector: 'Utility',  rev: 'USD 336M', tag: 'top',  country: 'KR', listed: true,  since: 2008, contractType: '8y CIF',          notes: 'KEPCO — Korea\'s national utility. Long-term volume floor with annual price negotiation.', news: ['Volume committed for 2026', 'No re-negotiation Q2'] },
  { id: 'b3', name: 'Posco',                    exp: 11.0, sector: 'Steel',    rev: 'USD 201M', tag: 'core', country: 'KR', listed: true,  since: 2014, contractType: 'Annual',           notes: 'Steel manufacturer using thermal coal in coking blend. Spec-driven pricing.', news: ['Steel demand soft', 'Bid-ask widening'] },
  { id: 'b4', name: 'Tokyo Electric Power',     exp: 9.7,  sector: 'Utility',  rev: 'USD 178M', tag: 'core', country: 'JP', listed: true,  since: 2010, contractType: '5y CIF',           notes: 'TEPCO — Tokyo utility. Specs require low-sulphur grade — premium pricing.', news: [] },
  { id: 'b5', name: 'PLN Indonesia',            exp: 8.3,  sector: 'Utility',  rev: 'Rp 2.4T',  tag: '',     country: 'ID', listed: false, since: 2005, contractType: 'DMO',              notes: 'Domestic Market Obligation buyer. Regulated price ceiling. Volume floor mandated.', news: ['DMO ceiling adjustment Q4'] },
];

const SuppliersTab = ({ fix }) => {
  const [open, setOpen] = React.useState(null);
  const [side, setSide] = React.useState('buyer'); // suppliers | buyers
  const Row = ({ r, side }) => (
    <tr className="sw-cp-row" onClick={() => setOpen({ ...r, side })} style={{ cursor: 'pointer' }}>
      <td className="ln"><b>{r.name}</b><div className="sub">{r.sector} · {r.country}</div></td>
      <td className="num">{r.exp.toFixed(1)}%</td>
      <td className="num">{r.rev}</td>
      <td>{r.tag && <span className={`imp imp-${r.tag === 'top' ? 'high' : 'med'}`}>{r.tag.toUpperCase()}</span>}</td>
      <td style={{ textAlign: 'right' }}><button className="sw-tf">Open →</button></td>
    </tr>
  );
  return (
    <div className="sw-section">
      <div className="sw-grid-2">
        <div className="sw-panel">
          <div className="sw-panel-h">Top Suppliers <span className="sub-h">value-chain upstream · FY25 disclosures</span></div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <table className="sw-tbl">
              <thead><tr><th>Counterparty</th><th>Exp</th><th>FY25 Rev</th><th>Tag</th><th></th></tr></thead>
              <tbody>{SUPPLIERS_DATA.map(r => <Row key={r.id} r={r} side="supplier" />)}</tbody>
            </table>
          </div>
        </div>
        <div className="sw-panel">
          <div className="sw-panel-h">Top Buyers <span className="sub-h">offtake / customers · FY25 disclosures</span></div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            <table className="sw-tbl">
              <thead><tr><th>Counterparty</th><th>Exp</th><th>FY25 Rev</th><th>Tag</th><th></th></tr></thead>
              <tbody>{BUYERS_DATA.map(r => <Row key={r.id} r={r} side="buyer" />)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="sw-panel" style={{ marginTop: 10 }}>
        <div className="sw-panel-h">Counterparty concentration · top-5 buyer share</div>
        <div className="sw-panel-body" style={{ padding: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
          Top-5 buyers represent <b style={{ color: 'var(--text-primary)' }}>70.0%</b> of FY25 revenue — concentration risk flagged. Geographic spread: India 32%, Korea 28%, Japan 11%, Domestic 18%, Other 11%.
        </div>
      </div>

      {open && (
        <div className="sw-cp-overlay" onClick={() => setOpen(null)}>
          <aside className="sw-cp-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sw-cp-drawer-h">
              <div>
                <span className={`imp imp-${open.tag === 'top' ? 'high' : open.tag === 'core' ? 'med' : 'low'}`}>{(open.tag || 'standard').toUpperCase()}</span>
                <span className="mc-tag" style={{ marginLeft: 6 }}>{open.side.toUpperCase()}</span>
                <span className="mc-tag" style={{ marginLeft: 6 }}>{open.country}</span>
                {open.listed && <span className="mc-tag" style={{ marginLeft: 6, color: 'var(--brand)', borderColor: 'var(--brand-dim)' }}>LISTED</span>}
              </div>
              <button className="sw-tf" onClick={() => setOpen(null)}>✕</button>
            </div>
            <h2 className="sw-cp-drawer-title">{open.name}</h2>
            <div className="sw-cp-drawer-meta">
              <div><span>Sector</span><b>{open.sector}</b></div>
              <div><span>Exposure</span><b>{open.exp.toFixed(1)}%</b></div>
              <div><span>FY25 Rev (this name)</span><b>{open.rev}</b></div>
              <div><span>Counterparty since</span><b>{open.since}</b></div>
              <div><span>Contract type</span><b>{open.contractType}</b></div>
            </div>
            <div className="sw-cp-drawer-section">
              <div className="ind-graph-drawer-h-sub">Profile</div>
              <p>{open.notes}</p>
            </div>
            {open.news.length > 0 && (
              <div className="sw-cp-drawer-section">
                <div className="ind-graph-drawer-h-sub">Recent news</div>
                <ul>
                  {open.news.map((n, i) => <li key={i}>· {n}</li>)}
                </ul>
              </div>
            )}
            <div className="sw-cp-drawer-section">
              <div className="ind-graph-drawer-h-sub">Financial snapshot</div>
              <table className="sw-tbl" style={{ fontSize: 11 }}>
                <tbody>
                  <tr><td>Revenue (FY25)</td><td className="num">{open.rev}</td></tr>
                  <tr><td>Op margin</td><td className="num">{(8 + open.exp / 4).toFixed(1)}%</td></tr>
                  <tr><td>Leverage (D/EBITDA)</td><td className="num">{(0.8 + open.exp / 30).toFixed(1)}×</td></tr>
                  <tr><td>Credit rating</td><td>{open.country === 'ID' ? 'BBB-' : 'A-'} (S&P)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="sw-cp-drawer-actions">
              <button className="sw-tf is-active">Open as standalone tab →</button>
              <button className="sw-tf">⤓ CSV / drilldown</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

// ---------- NEWS (single-stock feed) ----------
const StockNewsTab = ({ fix, t }) => {
  const items = [
    { time: '14:42', src: 'Bloomberg', sent: 'pos', net: 72, headline: `${t.sym} foreign net buy reaches 3× ADV — KSEI confirms institutional accumulation`, blurb: 'Custodian flow data shows three consecutive sessions of net foreign accumulation, with combined volume 3.2× the 30-day average.' },
    { time: '13:21', src: 'Kontan',    sent: 'flat',net: 8,  headline: 'Q1 results in line — net profit Rp 13.8T, NIM stable',     blurb: 'Reported earnings slightly above consensus. Loan growth 9.2% YoY meets management guidance corridor.' },
    { time: '11:08', src: 'Reuters',   sent: 'pos', net: 41, headline: 'Indonesia BI poll — 71% of economists expect 25 bps cut',  blurb: 'Survey of 14 economists points to easing at next meeting; banks index up 2.4% MTD.' },
    { time: '09:58', src: 'CNBC ID',   sent: 'neg', net: -26,headline: 'Sector rotation: insurance underweights banking heading into FY26', blurb: 'Two large life insurers reduced bank weight by 80–110 bps last quarter, citing peak NIM concerns.' },
  ];
  return (
    <div className="sw-section">
      <div className="sw-panel">
        <div className="sw-panel-h">News · {t.sym} <span className="sub-h">IndoBERT sentiment · last 24h</span></div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          <ul className="nf-feed" style={{ borderTop: 'none' }}>
            {items.map((n, i) => (
              <li key={i} className={`nf-row is-${n.sent}`}>
                <span className="nf-row__time">{n.time}</span>
                <span className="nf-row__source">{n.src}</span>
                <span className="nf-row__headline">{n.headline}<div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{n.blurb}</div></span>
                <span className={`db-mini__sent db-mini__sent--${n.sent}`}><span className="db-mini__sent-dot" />{n.sent === 'pos' ? 'Bull' : n.sent === 'neg' ? 'Bear' : 'Mixed'}<span className="db-mini__sent-net">{n.net >= 0 ? '+' : ''}{n.net}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ---------- MIROFISH (multi-agent prediction sandbox placeholder) ----------
// ---------- MIROFISH BRANCHING SIMULATION ----------
// Output is a tree of simulated parallel futures. Each branch carries
// probability + return + key signal. Visualized as horizontal SVG.
const buildBranchTree = (sym) => {
  // Root simulation → 3 macro branches → 2-3 sub-paths each
  return {
    root: { label: 't+0', signal: 'Seed ingested · 22 agents online' },
    branches: [
      { id: 'b1', label: 'Bull case · BI cuts 50bp + EM rotation',  prob: 0.42, ret: 14.1, sub: [
        { label: 't+30d · CASA expansion + foreign NB',          prob: 0.62, ret: 17.4 },
        { label: 't+30d · Earnings beat · NIM resilience',       prob: 0.38, ret: 11.8 },
      ]},
      { id: 'b2', label: 'Base case · BI cuts 25bp + flat coal', prob: 0.41, ret:  4.8, sub: [
        { label: 't+30d · Range-bound ' + sym + ' 9,800–10,400',     prob: 0.55, ret:  3.2 },
        { label: 't+30d · Mild rotation away from value names',  prob: 0.30, ret:  6.1 },
        { label: 't+30d · Foreign flow neutral',                  prob: 0.15, ret:  4.6 },
      ]},
      { id: 'b3', label: 'Bear case · sticky CPI · Fed pause',    prob: 0.17, ret: -3.2, sub: [
        { label: 't+30d · Yields lift · DM premium',              prob: 0.65, ret: -4.1 },
        { label: 't+30d · IDR 16,200 · risk-off',                 prob: 0.35, ret: -1.8 },
      ]},
    ],
  };
};

const BranchingSimulationTree = ({ tree }) => {
  const W = 880, leftPad = 90, branchY = [110, 270, 430], rootY = 270;
  const branchX = 380, leafX = 720;
  return (
    <svg viewBox={`0 0 ${W} 540`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 540 }}>
      <defs>
        <pattern id="mf-tree-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width={W} height={540} fill="url(#mf-tree-grid)" />

      {/* time axis */}
      <line x1={leftPad} x2={W - 30} y1={510} y2={510} stroke="var(--border-default)" strokeWidth="1" />
      {[['t+0', leftPad], ['t+5d', branchX - 10], ['t+30d', leafX - 30]].map(([l, x], i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={500} y2={520} stroke="var(--text-tertiary)" strokeWidth="0.5" />
          <text x={x} y={534} fill="var(--text-tertiary)" fontSize="10" fontFamily="var(--font-mono)" textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{l}</text>
        </g>
      ))}

      {/* root node */}
      <circle cx={leftPad} cy={rootY} r={18} fill="var(--brand)" stroke="var(--paper-strong)" strokeWidth="2" />
      <text x={leftPad} y={rootY + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--ink-deep)">SEED</text>
      <text x={leftPad} y={rootY - 28} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--brand)" letterSpacing="0.06em">{tree.root.signal}</text>

      {/* branches */}
      {tree.branches.map((b, bi) => {
        const by = branchY[bi];
        const tone = b.ret >= 4 ? 'pos' : b.ret >= 0 ? 'flat' : 'neg';
        const stroke = tone === 'pos' ? 'var(--pos)' : tone === 'neg' ? 'var(--neg)' : 'var(--text-tertiary)';
        // Draw curved path from root to branch midpoint
        const pathD = `M${leftPad + 18},${rootY} C${leftPad + 120},${rootY} ${branchX - 100},${by} ${branchX},${by}`;
        return (
          <g key={b.id}>
            <path d={pathD} fill="none" stroke={stroke} strokeWidth={Math.max(2, b.prob * 8)} strokeOpacity="0.85" />
            {/* Branch midpoint hub */}
            <circle cx={branchX} cy={by} r={14} fill="var(--bg-3)" stroke={stroke} strokeWidth="2" />
            <text x={branchX} y={by + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill={stroke}>{Math.round(b.prob * 100)}%</text>
            {/* Branch label */}
            <text x={branchX} y={by - 24} textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fontWeight="600" fill="var(--text-primary)">{b.label}</text>
            <text x={branchX} y={by - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={stroke}>{b.ret >= 0 ? '+' : ''}{b.ret.toFixed(1)}%</text>

            {/* Leaves */}
            {b.sub.map((s, si) => {
              const span = (b.sub.length - 1) * 50;
              const ly = by - span / 2 + si * 50;
              const leafD = `M${branchX + 14},${by} C${branchX + 80},${by} ${leafX - 80},${ly} ${leafX},${ly}`;
              return (
                <g key={si}>
                  <path d={leafD} fill="none" stroke={stroke} strokeWidth={Math.max(1.5, s.prob * 5)} strokeOpacity="0.6" />
                  <circle cx={leafX} cy={ly} r={9} fill={tone === 'pos' ? 'var(--pos)' : tone === 'neg' ? 'var(--neg)' : 'var(--text-tertiary)'} fillOpacity="0.6" stroke={stroke} strokeWidth="1.5" />
                  <text x={leafX + 14} y={ly + 3} fontFamily="var(--font-mono)" fontSize="10" fill="var(--text-secondary)">{s.label}</text>
                  <text x={leafX + 14} y={ly + 16} fontFamily="var(--font-mono)" fontSize="9" fill="var(--text-tertiary)">P {Math.round(s.prob * 100)}% · {s.ret >= 0 ? '+' : ''}{s.ret.toFixed(1)}%</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

const MirofishTab = ({ t }) => {
  const [prompt, setPrompt] = React.useState(`What happens to ${t.sym} if BI cuts 50 bps over the next 2 meetings while Newcastle coal stays below USD 145?`);
  const [running, setRunning] = React.useState(false);
  const [phase, setPhase] = React.useState(''); // staged progress
  const [result, setResult] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [sliders, setSliders] = React.useState({ vol: 0.42, liq: 0.66, geo: 0.28, ear: 0.55 });

  const run = () => {
    setResult(null);
    setRunning(true);
    const phases = ['ingest', 'expand', 'branch', 'converge'];
    phases.forEach((p, i) => setTimeout(() => setPhase(p), i * 250));
    setTimeout(() => {
      setPhase('done');
      setResult({
        verdict: 'CONSTRUCTIVE',
        net: 38,
        agents: 22,
        paths: 1024,
        iterations: 9,
        tree: buildBranchTree(t.sym),
        keySignals: [
          { t: 't+0',   sig: 'BI minutes parsed · dovish skew confirmed' },
          { t: 't+5d',  sig: 'Foreign flow doubles to 6.2× ADV (KSEI feed)' },
          { t: 't+10d', sig: 'Earnings agent: Q2 NIM compression −8bp priced in' },
          { t: 't+30d', sig: `Consensus path: ${t.sym} +9.4% to +14.1%, Bear leg −3.2%` },
        ],
        notes: 'Swarm of 22 specialized agents · 1,024 simulated futures · convergence after 9 iterations.',
      });
      setRunning(false);
    }, 1100);
  };

  return (
    <div className="sw-section">
      <div className="mf-grid">
        {/* SEED */}
        <div className="sw-panel">
          <div className="sw-panel-h">Seed · Prediction Prompt <span className="sub-h">multi-agent simulation engine · "God's-eye view"</span></div>
          <div className="sw-panel-body" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="mf-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const names = Array.from(e.dataTransfer.files || []).map(f => f.name); if (names.length) setFiles(f => [...f, ...names]); }}>
              <span className="mf-drop-glyph">▒▓</span>
              <div>Drop news clippings, transcripts, PDFs, or macro fixtures here.<br/><span style={{ color: 'var(--text-tertiary)' }}>Agents will ingest seed material before simulating.</span></div>
            </div>
            {files.length > 0 && (
              <ul className="mf-files">
                {files.map((f, i) => (
                  <li key={i}><span>📎 {f}</span><button onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button></li>
                ))}
              </ul>
            )}
            <textarea className="mf-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Describe a scenario in plain language…" />
            <div className="mf-sliders">
              {[['vol','Volatility regime'],['liq','Liquidity overlay'],['geo','Geopolitics weight'],['ear','Earnings revisions']].map(([k, l]) => (
                <div key={k} className="mf-slider">
                  <span>{l}</span>
                  <input type="range" min="0" max="1" step="0.01" value={sliders[k]} onChange={(e) => setSliders(s => ({ ...s, [k]: parseFloat(e.target.value) }))} />
                  <b>{Math.round(sliders[k] * 100)}</b>
                </div>
              ))}
            </div>
            <button className="sw-tf is-active" disabled={running} onClick={run}>
              {running ? `▒▓█▓▒ ${phase}…` : '▶ Run swarm simulation'}
            </button>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="sw-panel">
          <div className="sw-panel-h">
            Output · Prediction Report
            <span className="sub-h">{result ? `${result.paths.toLocaleString()} paths · ${result.agents} agents · convergence ${result.iterations}` : 'awaiting run'}</span>
          </div>
          <div className="sw-panel-body" style={{ padding: 0 }}>
            {!result && !running && (
              <div className="mf-empty">
                <div className="mf-empty-glyph">┌─────────────┐<br/>│  awaiting   │<br/>│ simulation  │<br/>└─────────────┘</div>
                <p>Configure seed material + prompt, then run the swarm. Output is a tree of parallel futures with probability, returns, and key signals per branch.</p>
              </div>
            )}
            {running && (
              <div className="mf-running">
                <div className="mf-running-glyph">▒▓█▓▒</div>
                <div>Running swarm: <b>{phase}</b>…</div>
                <div className="mf-running-bar"><span /></div>
              </div>
            )}
            {result && (
              <>
                <div className={`mf-verdict mf-verdict--${result.net >= 0 ? 'pos' : 'neg'}`}>
                  <span className="mf-verdict-word">{result.verdict}</span>
                  <span className="mf-verdict-net">{result.net >= 0 ? '+' : ''}{result.net}</span>
                  <span className="mf-verdict-meta">net · {result.paths.toLocaleString()} paths</span>
                </div>
                <div className="mf-tree-wrap">
                  <div className="mf-tree-h">Branching simulation tree</div>
                  <BranchingSimulationTree tree={result.tree} />
                </div>
                <div className="mf-signals">
                  <div className="mf-signals-h">Key signals along consensus path</div>
                  <ul>
                    {result.keySignals.map((s, i) => (
                      <li key={i}><span className="mf-tl-t">{s.t}</span><span>{s.sig}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mf-notes">{result.notes}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- MAIN STOCK WORKSPACE ----------
const StockWorkspace = ({ symbol = 'BBCA', selectedSymbol, setSelectedSymbol }) => {
  const t = window.DATA_EXT.TICKER_UNIVERSE[symbol] || window.DATA_EXT.TICKER_UNIVERSE.BBCA;
  const fix = window.DATA_EXT.STOCK_FIXTURES[symbol] || window.DATA_EXT.STOCK_FIXTURES.BBCA;
  const [active, setActive] = React.useState('overview');
  const activeSection = SECTIONS.find(s => s.id === active);
  const WaccTab = window.WaccTab;
  const FinancialsPro = window.FinancialsPro;
  const EquityPeers = window.EquityPeers;
  const RiskPro = window.RiskPro;
  const MonteCarloPro = window.MonteCarloPro;
  const OverviewPro = window.OverviewPro;
  const StockNewsPro = window.StockNewsPro;
  // Live header: fresh quote + statements snapshot → recompute multiples off live price.
  const [quote, setQuote] = React.useState(null);
  const [headerDoc, setHeaderDoc] = React.useState(null);
  const [headerAsOf, setHeaderAsOf] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    setQuote(null); setHeaderDoc(null); setHeaderAsOf(null);
    fetch(`${SW_QUOTE_FN}?ticker=${encodeURIComponent(swYahoo(symbol))}`, { headers: SW_HDRS })
      .then(r => r.json()).then(j => { if (alive && j.ok) { setQuote(j.quote); setHeaderAsOf(j.quote.asOf); } }).catch(() => {});
    fetch(`${SW_STMT_FN}?ticker=${encodeURIComponent(swYahoo(symbol))}`, { headers: SW_HDRS })
      .then(r => r.json()).then(j => { if (alive && j.doc) setHeaderDoc(j.doc); }).catch(() => {});
    return () => { alive = false; };
  }, [symbol]);
  const _hbase = (window.IDX_UNIVERSE || []).find(u => u.sym === symbol) || { name: t.name, sector: t.sector };
  const liveT = buildLiveHeader(symbol, { exchange: 'IDX', name: _hbase.name, sector: _hbase.sector }, quote, headerDoc);
  const [tf, setTf] = React.useState('3M');
  const [indicators, setIndicators] = React.useState({ ma: true, bb: false, rsi: false });
  const toggleIndicator = (k) => setIndicators(s => ({ ...s, [k]: !s[k] }));
  const candles = React.useMemo(() => {
    const map = { '1D': 24, '5D': 30, '1M': 22, '3M': 66, '6M': 130, 'YTD': 90, '1Y': 252, '5Y': 260, 'MAX': 260 };
    return buildCandles(map[tf] || 90, t.price * 0.9, 0.018, 0.0008);
  }, [tf, symbol]);

  return (
    <div className="stock-ws">
      <StockHeader t={liveT} live={!!quote} asOf={headerAsOf} />
      <ThesisBand symbol={symbol} />
      <div className="sw-body">
        <StockLeftRail active={active} setActive={setActive} />
        <div className="sw-main">
          <div className="sw-content">
            {activeSection && !activeSection.live && (
              <div className="sw-sample-bar">
                <span className="prov-dot sample" />
                <b>SAMPLE DATA</b> — illustrative fixtures, not a live feed. Live sections are tagged <span className="prov-dot live" style={{ margin: '0 3px' }} />LIVE.
              </div>
            )}
            {active === 'chart'      && <div className="sw-chart-section"><TradingViewChart symbol={symbol} /></div>}
            {active === 'overview'   && (OverviewPro ? <OverviewPro symbol={symbol} /> : <OverviewTab t={t} fix={fix} candles={candles} indicators={indicators} />)}
            {active === 'transact'   && <TransactionalTab fix={fix} symbol={symbol} />}
            {active === 'financials' && (FinancialsPro ? <FinancialsPro symbol={symbol} t={t} /> : <FinancialsTab fix={fix} symbol={symbol} />)}
            {active === 'wacc'       && WaccTab && <WaccTab symbol={symbol} t={t} />}
            {active === 'comparable' && (EquityPeers ? <EquityPeers symbol={symbol} /> : <ComparableTab fix={fix} />)}
            {active === 'owners'     && <OwnersTab        fix={fix} />}
            {active === 'risk'       && (RiskPro ? <RiskPro symbol={symbol} /> : <RiskTab fix={fix} />)}
            {active === 'esg'        && <EsgTab           fix={fix} />}
            {active === 'thesis'     && <ThesisTab        fix={fix} />}
            {active === 'monte'      && (MonteCarloPro ? <MonteCarloPro symbol={symbol} /> : <MonteCarloTab fix={fix} />)}
            {active === 'notes'      && <NotesTab />}
            {active === 'suppliers'  && <SuppliersTab    fix={fix} />}
            {active === 'news'       && (StockNewsPro ? <StockNewsPro symbol={symbol} /> : <StockNewsTab fix={fix} t={t} />)}
            {active === 'mirofish'   && <MirofishTab     t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
};

window.StockWorkspace = StockWorkspace;
