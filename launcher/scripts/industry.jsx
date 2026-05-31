/* =========================================================================
   INDUSTRY (T3) — Sector Map workspace (W1).
   Landing page (commodity strip + business-cycle banner + sector grid + news)
   + Sector Detail (drill-in via router state).
   All React via Babel-in-browser. No imports. All globals on window.
   Exposes window.IndustryWorkspace.
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback } = React;
  const h = window.IND.h;
  const { Spark, Spinner, Empty, useToast, Modal, fmt } = window.IND;
  const { TAXONOMY, COMMODITY_TILES, REGIONS, an } = window.INDUSTRY;

  /* =====================================================================
     HELPERS
     ===================================================================== */
  const statusChipClass = (s) => {
    if (s === 'BULLISH') return 'bull';
    if (s === 'BEARISH') return 'bear';
    if (s === 'ROTATION') return 'rot';
    return 'neu';
  };
  const statusLabel = (s) => {
    if (s === 'BULLISH') return 'Bull';
    if (s === 'BEARISH') return 'Bear';
    if (s === 'ROTATION') return 'Rot';
    return 'Neu';
  };
  const postureChipClass = (p) => {
    if (p === 'tailwind') return 'tail';
    if (p === 'headwind') return 'head';
    return 'mix';
  };
  const postureLabel = (p) => {
    if (p === 'tailwind') return 'Tailwind';
    if (p === 'headwind') return 'Headwind';
    return 'Mixed';
  };

  /* =====================================================================
     COMMODITY DETAIL MODAL
     ===================================================================== */
  function CommodityModal({ item, onClose }) {
    const [obs, setObs] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!item) return;
      setLoading(true);
      window.INDUSTRY.obs(item.key, 180)
        .then(rows => {
          setObs(rows);
          setLoading(false);
        })
        .catch(() => {
          setObs([]);
          setLoading(false);
        });
    }, [item && item.key]);

    if (!item) return null;

    const drivers = TAXONOMY.filter(ind =>
      (ind.drivers || []).some(d => d.key === item.key)
    );

    const sparkData = obs && obs.length > 1
      ? obs.slice().reverse().map(r => ({ v: r.value }))
      : (item.spark || []);

    return h(Modal, { title: item.label + ' — Driver Detail', onClose, wide: false },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 16 } },
          h('div', { className: 'in-tile-val' }, fmt.val(item.latest_value, item.unit)),
          h('div', { className: 'in-tile-chg ' + fmt.cls(item.change_pct) }, fmt.pct(item.change_pct))
        ),
        loading
          ? h(Spinner, { label: 'Loading history…' })
          : sparkData.length > 1
            ? h('div', { style: { padding: '8px 0' } },
                h(Spark, { data: sparkData, w: 580, ht: 80, color: item.change_pct >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' })
              )
            : h('div', { className: 'in-muted', style: { fontSize: 12 } }, 'No historical series available.'),
        drivers.length > 0
          ? h('div', null,
              h('div', { className: 'in-panel-h' }, h('div', { className: 'in-panel-title' }, 'Sectors Driven by This Indicator')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                drivers.map(ind => {
                  const drv = ind.drivers.find(d => d.key === item.key);
                  return h('div', { key: ind.id, style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', { style: { color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 } }, ind.name),
                    h('span', { className: 'in-chip ' + (drv.upIs === 'tailwind' ? 'tail' : drv.upIs === 'headwind' ? 'head' : 'mix') },
                      drv.upIs === 'tailwind' ? 'T/W' : drv.upIs === 'headwind' ? 'H/W' : 'Mix')
                  );
                })
              )
            )
          : null
      )
    );
  }

  /* =====================================================================
     TICKER DETAIL MODAL
     ===================================================================== */
  function TickerModal({ row, peers, conviction, driverNet, onClose }) {
    if (!row) return null;
    const peerMed = useMemo(() => {
      const vals = (k) => peers.map(r => r[k]).filter(v => v != null && !isNaN(v)).map(Number);
      const med = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      return { pe: med(vals('pe')), pb: med(vals('pb')), ev_ebitda: med(vals('ev_ebitda')), roe: med(vals('roe')), net_margin: med(vals('net_margin')), rev_growth: med(vals('rev_growth')) };
    }, [peers]);

    const comp = an.competitive(row, peers, { peerMed, conviction, driverNet });
    const w52pos = (row.w52_high > row.w52_low && row.price != null)
      ? Math.round(((row.price - row.w52_low) / (row.w52_high - row.w52_low)) * 100)
      : null;

    const statRow = (label, val) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 } },
      h('span', { className: 'in-muted' }, label),
      h('span', { className: 'in-num', style: { color: 'var(--text-primary)' } }, val)
    );

    return h(Modal, { title: row.symbol + ' — ' + (row.name || ''), onClose, wide: false },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' } }, fmt.money(row.price)),
          h('div', { className: fmt.cls(row.change_pct), style: { fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600 } }, fmt.pct(row.change_pct)),
          h('span', { className: 'in-verdict ' + comp.verdict.toLowerCase(), style: { marginLeft: 'auto' } }, comp.verdict.replace('_', ' '))
        ),
        w52pos != null
          ? h('div', null,
              h('div', { className: 'in-muted', style: { fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 } }, '52-Week Range'),
              h('div', { style: { position: 'relative', height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'visible' } },
                h('div', { style: { position: 'absolute', left: 0, top: 0, width: w52pos + '%', height: '100%', background: 'var(--in)', borderRadius: 3 } }),
                h('div', { style: { position: 'absolute', left: w52pos + '%', top: -5, width: 2, height: 16, background: 'var(--in-strong)', transform: 'translateX(-50%)' } })
              ),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' } },
                h('span', null, 'L: ' + fmt.money(row.w52_low)),
                h('span', null, w52pos + '% of range'),
                h('span', null, 'H: ' + fmt.money(row.w52_high))
              )
            )
          : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
          h('div', null,
            h('div', { className: 'in-panel-title', style: { marginBottom: 8 } }, 'Valuation'),
            statRow('P/E', fmt.num(row.pe)),
            statRow('P/B', fmt.num(row.pb)),
            statRow('P/S', fmt.num(row.ps)),
            statRow('EV/EBITDA', fmt.num(row.ev_ebitda)),
            statRow('Div Yield', fmt.pct(row.div_yield))
          ),
          h('div', null,
            h('div', { className: 'in-panel-title', style: { marginBottom: 8 } }, 'Quality'),
            statRow('ROE', fmt.pct(row.roe)),
            statRow('ROA', fmt.pct(row.roa)),
            statRow('Net Margin', fmt.pct(row.net_margin)),
            statRow('Rev Growth', fmt.pct(row.rev_growth)),
            statRow('D/E', fmt.num(row.debt_equity))
          )
        ),
        h('div', null,
          h('div', { className: 'in-panel-title', style: { marginBottom: 8 } }, 'Competitive Score — ' + comp.total + '/100'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 } },
            Object.entries(comp.dims).map(([k, v]) =>
              h('div', { key: k, style: { background: 'var(--bg-2)', borderRadius: 3, padding: '6px 8px' } },
                h('div', { className: 'in-muted', style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 } }, k),
                h('div', { style: { fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: v >= 65 ? 'var(--pos)' : v <= 35 ? 'var(--neg)' : 'var(--text-primary)' } }, Math.round(v))
              )
            )
          )
        ),
        h('div', { className: 'in-muted', style: { fontSize: 11 } }, 'Mcap: ' + fmt.mcap(row.mcap) + ' IDR · Beta: ' + fmt.num(row.beta) + ' · Current Ratio: ' + fmt.num(row.current_ratio))
      )
    );
  }

  /* =====================================================================
     SECTOR DETAIL VIEW
     ===================================================================== */
  function SectorDetail({ ind, equity, indicators, onBack }) {
    const [toast, push] = useToast();
    const [tickerModal, setTickerModal] = useState(null);

    const indByKey = useMemo(() => {
      const m = {};
      indicators.forEach(i => { m[i.key] = i; });
      return m;
    }, [indicators]);

    const tickers = useMemo(() => an.tickersFor(ind, equity), [ind, equity]);
    const snap = useMemo(() => an.snapshot(tickers), [tickers]);
    const conviction = useMemo(() => an.conviction(snap), [snap]);
    const status = useMemo(() => an.status(conviction, snap), [conviction, snap]);
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    const kesimpulan = useMemo(() => an.kesimpulan(ind, snap, conviction, status, tilt), [ind, snap, conviction, status, tilt]);

    const postures = useMemo(() => (ind.drivers || []).map(d => an.posture(d, indByKey)), [ind, indByKey]);

    const demandDrivers = postures.filter(p => p.driver && p.driver.kind === 'demand');
    const supplyDrivers = postures.filter(p => p.driver && p.driver.kind === 'supply');
    const macroDrivers  = postures.filter(p => p.driver && p.driver.kind === 'macro');

    const peerMed = useMemo(() => {
      const vals = (k) => tickers.map(r => r[k]).filter(v => v != null && !isNaN(v)).map(Number);
      const med = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      return { pe: med(vals('pe')), roe: med(vals('roe')), net_margin: med(vals('net_margin')), rev_growth: med(vals('rev_growth')) };
    }, [tickers]);

    const chipCls = statusChipClass(status);

    const DriverCard = ({ p }) => {
      if (!p.found) {
        return h('div', { className: 'in-driver neutral' },
          h('div', { className: 'in-driver-lbl' }, h('span', null, p.driver.label), h('span', { className: 'in-chip neu' }, 'N/A')),
          h('div', { className: 'in-driver-val in-muted' }, '—'),
          h('div', { className: 'in-driver-meta' }, h('span', { className: 'in-kind' }, p.driver.kind))
        );
      }
      const pCls = postureChipClass(p.posture);
      return h('div', { className: 'in-driver ' + pCls },
        h('div', { className: 'in-driver-lbl' },
          h('span', null, p.label),
          h('span', { className: 'in-chip ' + pCls }, postureLabel(p.posture))
        ),
        h('div', { className: 'in-driver-val' }, fmt.val(p.value, p.unit)),
        h('div', { className: 'in-driver-meta' },
          h('span', { className: 'in-kind' }, p.driver.kind),
          h('span', { className: fmt.cls(p.chg), style: { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 } }, fmt.pct(p.chg))
        ),
        p.spark && p.spark.length > 1
          ? h('div', { style: { marginTop: 8 } }, h(Spark, { data: p.spark, w: 100, ht: 22 }))
          : null
      );
    };

    const DriversGroup = ({ title, items }) => {
      if (!items.length) return null;
      return h('div', { style: { marginBottom: 12 } },
        h('div', { style: { fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 } }, title),
        h('div', { className: 'in-grid in-grid-3', style: { gap: 8 } },
          items.map((p, i) => h(DriverCard, { key: p.driver.key + i, p }))
        )
      );
    };

    const sortedTickers = useMemo(() =>
      tickers.slice().sort((a, b) => (Number(b.mcap) || 0) - (Number(a.mcap) || 0)),
      [tickers]
    );

    return h('div', { className: 'in-work' },
      toast,
      tickerModal && h(TickerModal, {
        row: tickerModal,
        peers: tickers,
        conviction,
        driverNet: tilt.net,
        onClose: () => setTickerModal(null)
      }),

      /* header */
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
        h('button', { className: 'in-back', onClick: onBack }, '← Sector Map'),
        h('div', { className: 'in-work-title' }, ind.name),
        h('span', { className: 'in-chip ' + chipCls }, statusLabel(status)),
        h('span', { className: 'in-muted', style: { fontSize: 11, fontFamily: 'var(--font-mono)' } }, 'Conviction ' + conviction + '/100'),
        h('span', { className: 'in-muted', style: { fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 'auto' } }, snap.n + ' tickers · ' + snap.up + ' up · ' + snap.down + ' dn')
      ),

      /* kesimpulan */
      h('div', { className: 'in-concl', style: { marginBottom: 16 } },
        h('b', null, 'Kesimpulan: '),
        kesimpulan
      ),

      /* driver panel — priority lens */
      h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'Demand / Supply Drivers'),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pos)' } }, tilt.tail + ' tailwind'),
            h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono)', fontSize: 11 } }, '·'),
            h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neg)' } }, tilt.head + ' headwind')
          )
        ),
        h(DriversGroup, { title: 'Demand Drivers', items: demandDrivers }),
        h(DriversGroup, { title: 'Supply Drivers', items: supplyDrivers }),
        h(DriversGroup, { title: 'Macro Drivers', items: macroDrivers })
      ),

      /* ticker table */
      h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'Tickers — ' + ind.name),
          h('div', { className: 'in-panel-tag' }, 'sorted by mcap · click for detail')
        ),
        h('div', { style: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--warn)', marginBottom: 8 } },
          '7D and 30D returns are pending a price-history table (later round). 1D data is live.'
        ),
        tickers.length === 0
          ? h(Empty, { title: 'No tickers', sub: 'No equity_screen rows matched this sector.' })
          : h('div', { className: 'in-tablewrap' },
              h('table', { className: 'in-table' },
                h('thead', null,
                  h('tr', null,
                    h('th', null, 'Symbol'),
                    h('th', null, 'Name'),
                    h('th', { className: 'r' }, 'Price'),
                    h('th', { className: 'r' }, '1D %'),
                    h('th', { className: 'r' }, 'Mcap'),
                    h('th', { className: 'r' }, 'P/E'),
                    h('th', { className: 'r' }, 'ROE'),
                    h('th', { className: 'r' }, 'Div%')
                  )
                ),
                h('tbody', null,
                  sortedTickers.map(row =>
                    h('tr', { key: row.symbol, className: 'click', onClick: () => setTickerModal(row) },
                      h('td', null, h('span', { className: 'in-sym' }, row.symbol)),
                      h('td', { style: { maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' } }, row.name || '—'),
                      h('td', { className: 'r in-num' }, fmt.money(row.price)),
                      h('td', { className: 'r in-num ' + fmt.cls(row.change_pct) }, fmt.pct(row.change_pct)),
                      h('td', { className: 'r in-num' }, fmt.mcap(row.mcap)),
                      h('td', { className: 'r in-num' }, fmt.num(row.pe)),
                      h('td', { className: 'r in-num ' + (row.roe > 0 ? 'in-pos' : row.roe < 0 ? 'in-neg' : '') }, fmt.pct(row.roe)),
                      h('td', { className: 'r in-num' }, fmt.pct(row.div_yield))
                    )
                  )
                )
              )
            )
      ),

      /* peer comps note */
      h('div', { className: 'in-banner', style: { fontSize: 11 } },
        'Full peer comps, positioning quadrant, and 6-dim ticker rankings are in the ',
        h('b', null, 'Peer Comps (W2)'),
        ' workspace.'
      )
    );
  }

  /* =====================================================================
     SECTOR CARD (Landing)
     ===================================================================== */
  function SectorCard({ ind, equity, indByKey, cycleData, onClick }) {
    const tickers = useMemo(() => an.tickersFor(ind, equity), [ind, equity]);
    const snap = useMemo(() => an.snapshot(tickers), [tickers]);
    const conviction = useMemo(() => an.conviction(snap), [snap]);
    const status = useMemo(() => an.status(conviction, snap), [conviction, snap]);
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);

    const chipCls = statusChipClass(status);
    const convColor = status === 'BULLISH' ? 'var(--pos)' : status === 'BEARISH' ? 'var(--neg)' : status === 'ROTATION' ? 'var(--in)' : 'var(--text-tertiary)';
    const isFavored = cycleData && cycleData.favored && cycleData.favored.includes(ind.id);

    return h('div', {
      className: 'in-card',
      style: isFavored ? { borderColor: 'var(--in-edge)', background: 'var(--in-softer)' } : {},
      onClick
    },
      h('div', { className: 'in-card-h' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          h('div', { className: 'in-card-name' }, ind.name),
          isFavored
            ? h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--in)', letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Cycle Favored')
            : null
        ),
        h('span', { className: 'in-chip ' + chipCls }, statusLabel(status))
      ),

      h('div', { className: 'in-convbar' },
        h('div', { className: 'in-convbar-fill', style: { width: conviction + '%', background: convColor } })
      ),

      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 } },
        h('div', { style: { display: 'flex', gap: 12 } },
          h('div', null,
            h('div', { className: 'in-muted', style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, '1D mcap-wt'),
            h('div', { className: 'in-num ' + fmt.cls(snap.mcapChg), style: { fontSize: 12 } }, fmt.pct(snap.mcapChg))
          ),
          h('div', null,
            h('div', { className: 'in-muted', style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Breadth'),
            h('div', { className: 'in-num', style: { fontSize: 12 } }, snap.up + '/' + snap.n)
          )
        ),
        h('div', { style: { textAlign: 'right' } },
          h('div', { className: 'in-muted', style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Drivers'),
          h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono)' } },
            h('span', { style: { color: 'var(--pos)' } }, tilt.tail + 'T'),
            h('span', { className: 'in-muted' }, ' / '),
            h('span', { style: { color: 'var(--neg)' } }, tilt.head + 'H')
          )
        )
      ),

      h('div', { className: 'in-card-thesis' }, ind.thesis)
    );
  }

  /* =====================================================================
     MOVEMENT ALERTS
     ===================================================================== */
  function MovementAlerts({ indicators, indByKey }) {
    const THRESH = 5;
    const alerts = COMMODITY_TILES
      .map(k => indByKey[k])
      .filter(Boolean)
      .filter(i => Math.abs(Number(i.change_pct)) >= THRESH)
      .sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct)));

    if (!alerts.length) return null;

    return h('div', { className: 'in-banner', style: { flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 } },
      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 } }, 'Movement Alerts'),
      alerts.map(i =>
        h('span', { key: i.key, style: { background: 'var(--bg-2)', border: '1px solid ' + (i.change_pct > 0 ? 'rgba(25,195,125,0.3)' : 'rgba(255,92,112,0.3)'), borderRadius: 3, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: i.change_pct > 0 ? 'var(--pos)' : 'var(--neg)', whiteSpace: 'nowrap' } },
          i.label + ' ' + fmt.pct(i.change_pct)
        )
      )
    );
  }

  /* =====================================================================
     NEWS PANEL
     ===================================================================== */
  const NEWS_PLACEHOLDER = [
    { src: 'Financial Times', title: 'Indonesia commodity exports surge amid global demand recovery', tag: 'Global' },
    { src: 'CNBC International', title: 'Asian equity markets mixed; coal and CPO lead emerging-market gains', tag: 'Global' },
    { src: 'The Economist', title: 'Indonesia commodity windfall: structural reform or cyclical uplift?', tag: 'Global' },
    { src: 'Forbes Asia', title: 'EV battery metals: nickel oversupply clouds Indonesian miner outlook', tag: 'Global' },
    { src: 'NYT Business', title: 'Palm oil prices jump on supply disruptions and biodiesel mandates', tag: 'Global' },
    { src: 'CNBC Indonesia', title: 'IHSG melemah di tengah aksi profit taking sektor energi dan perbankan', tag: 'Local' },
    { src: 'Kontan', title: 'Emiten batu bara cetak kinerja memuaskan kuartal ini, kenaikan harga Newcastle jadi katalis', tag: 'Local' },
    { src: 'Bisnis Indonesia', title: 'BI pertahankan suku bunga acuan; sektor properti dan konsumer berpotensi diuntungkan', tag: 'Local' },
    { src: 'IDX News', title: 'Laporan keuangan Q1 2026: mayoritas emiten bank catat pertumbuhan kredit di atas 10%', tag: 'Local' },
    { src: 'Kompas Bisnis', title: 'Pemerintah dorong hilirisasi nikel; saham INCO dan ANTM jadi sorotan analis', tag: 'Local' },
  ];

  function NewsPanel() {
    return h('div', { className: 'in-panel' },
      h('div', { className: 'in-panel-h' },
        h('div', { className: 'in-panel-title' }, 'News'),
        h('div', { className: 'in-panel-tag' }, 'news feed integration pending')
      ),
      h('div', { className: 'in-banner', style: { fontSize: 11, marginBottom: 10 } },
        'Live news feeds are not yet wired. The items below are placeholder headlines for layout purposes.'
      ),
      NEWS_PLACEHOLDER.map((item, i) =>
        h('div', { key: i, className: 'in-news-item' },
          h('div', { className: 'in-news-title' }, item.title),
          h('div', { className: 'in-news-src' },
            item.src,
            h('span', { style: { marginLeft: 8, padding: '1px 5px', borderRadius: 2, background: 'var(--bg-3)', fontSize: 9, letterSpacing: '0.04em', textTransform: 'uppercase' } }, item.tag)
          )
        )
      )
    );
  }

  /* =====================================================================
     LANDING VIEW
     ===================================================================== */
  function Landing({ equity, indicators, region, onSelectSector }) {
    const [commodityModal, setCommodityModal] = useState(null);

    const indByKey = useMemo(() => {
      const m = {};
      indicators.forEach(i => { m[i.key] = i; });
      return m;
    }, [indicators]);

    const cycleData = useMemo(() => {
      if (!Object.keys(indByKey).length) return null;
      return an.cyclePhase(indByKey);
    }, [indByKey]);

    const filteredTaxonomy = useMemo(() =>
      region === 'id' ? TAXONOMY : TAXONOMY.filter(ind => ind.region === region || ind.region === 'id'),
      [region]
    );

    const regionNote = region !== 'id'
      ? h('div', { className: 'in-banner', style: { marginBottom: 12 } },
          h('span', null, region === 'global' ? 'Global' : 'US'), ' lens: commodity and macro indicators are shown for this region. ',
          h('b', null, 'IDX (Indonesia)'), ' is the data-complete lens for single-name equity prices and breadth.'
        )
      : null;

    return h('div', { className: 'in-work' },
      commodityModal && h(CommodityModal, { item: commodityModal, onClose: () => setCommodityModal(null) }),
      regionNote,

      /* cycle banner */
      cycleData && h('div', { className: 'in-cycle', style: { marginBottom: 14 } },
        h('div', { className: 'in-cycle-phase' }, cycleData.phase),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 } }, cycleData.note),
          cycleData.favored && cycleData.favored.length > 0
            ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 } },
                h('span', { style: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Favored:'),
                cycleData.favored.map(id => {
                  const ind = TAXONOMY.find(t => t.id === id);
                  return ind
                    ? h('span', { key: id, className: 'in-chip rot' }, ind.name)
                    : null;
                })
              )
            : null
        ),
        h('div', { style: { textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' } },
          cycleData.infl != null ? h('div', null, 'CPI ' + fmt.num(cycleData.infl, 1) + '%') : null,
          cycleData.growth != null ? h('div', null, 'GDP ' + fmt.num(cycleData.growth, 1) + 'T') : null,
          cycleData.rateRising != null ? h('div', null, cycleData.rateRising ? 'Rates Rising' : 'Rates Stable') : null
        )
      ),

      /* movement alerts */
      h(MovementAlerts, { indicators, indByKey }),

      /* commodity strip */
      h('div', { style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h', style: { marginBottom: 8 } },
          h('div', { className: 'in-panel-title' }, 'Commodity Prices'),
          h('div', { className: 'in-panel-tag' }, 'click for detail')
        ),
        h('div', { className: 'in-grid in-grid-5', style: { gap: 8 } },
          COMMODITY_TILES.map(key => {
            const item = indByKey[key];
            if (!item) return h('div', { key, className: 'in-tile' },
              h('div', { className: 'in-tile-lbl' }, key),
              h('div', { className: 'in-tile-val in-muted' }, '—')
            );
            return h('div', { key, className: 'in-tile', onClick: () => setCommodityModal(item) },
              h('div', { className: 'in-tile-lbl' }, item.label),
              h('div', { className: 'in-tile-val' }, fmt.val(item.latest_value, item.unit)),
              h('div', { className: 'in-tile-chg ' + fmt.cls(item.change_pct) }, fmt.pct(item.change_pct)),
              item.spark && item.spark.length > 1
                ? h('div', { style: { marginTop: 6 } }, h(Spark, { data: item.spark, w: 80, ht: 20 }))
                : null
            );
          })
        )
      ),

      /* sector grid */
      h('div', { style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h', style: { marginBottom: 8 } },
          h('div', { className: 'in-panel-title' }, 'Sector Grid'),
          h('div', { className: 'in-panel-tag' }, filteredTaxonomy.length + ' sectors · click to drill in')
        ),
        h('div', { className: 'in-grid in-grid-3', style: { gap: 10 } },
          filteredTaxonomy.map(ind =>
            h(SectorCard, {
              key: ind.id,
              ind,
              equity,
              indByKey,
              cycleData,
              onClick: () => onSelectSector(ind)
            })
          )
        )
      ),

      /* news */
      h(NewsPanel, null)
    );
  }

  /* =====================================================================
     HEADER
     ===================================================================== */
  function Header({ region, onRegion }) {
    return h('div', { className: 'in-head' },
      h('div', { className: 'in-head-mark' },
        h('svg', { viewBox: '0 0 15 15', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
          h('rect', { x: 1, y: 1, width: 5, height: 5, rx: 0.5 }),
          h('rect', { x: 9, y: 1, width: 5, height: 5, rx: 0.5 }),
          h('rect', { x: 1, y: 9, width: 5, height: 5, rx: 0.5 }),
          h('rect', { x: 9, y: 9, width: 5, height: 5, rx: 0.5 })
        )
      ),
      h('div', null,
        h('div', { className: 'in-head-title' }, 'Industry'),
        h('div', { className: 'in-head-sub' }, 'Sector Intelligence')
      ),
      h('div', { className: 'in-head-spacer' }),
      h('div', { className: 'in-pick' },
        h('div', { className: 'in-pick-lbl' }, 'Region'),
        h('div', { className: 'in-seg' },
          REGIONS.map(r =>
            h('button', { key: r.id, className: region === r.id ? 'on' : '', onClick: () => onRegion(r.id) }, r.label)
          )
        )
      )
    );
  }

  /* =====================================================================
     ROOT: IndustryWorkspace
     ===================================================================== */
  function IndustryWorkspace({ openTab }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [equity, setEquity] = useState([]);
    const [indicators, setIndicators] = useState([]);
    const [region, setRegion] = useState('id');
    const [selectedSector, setSelectedSector] = useState(null);
    const [toast, push] = useToast();

    useEffect(() => {
      setLoading(true);
      setError(null);
      Promise.all([
        window.INDUSTRY.equity(),
        window.INDUSTRY.indicators()
      ])
        .then(([eq, ind]) => {
          setEquity(Array.isArray(eq) ? eq : []);
          setIndicators(Array.isArray(ind) ? ind : []);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load industry data. ' + (err && err.message ? err.message : 'Check network.'));
          setLoading(false);
        });
    }, []);

    const handleBack = useCallback(() => setSelectedSector(null), []);
    const handleSelectSector = useCallback((ind) => {
      setSelectedSector(ind);
    }, []);

    return h('div', { className: 'in-root' },
      toast,
      h(Header, { region, onRegion: (r) => { setRegion(r); setSelectedSector(null); } }),

      loading
        ? h(Spinner, { label: 'Loading sector data…' })
        : error
          ? h('div', { className: 'in-work' },
              h('div', { className: 'in-banner' }, error)
            )
          : selectedSector
            ? h(SectorDetail, {
                ind: selectedSector,
                equity,
                indicators,
                onBack: handleBack
              })
            : h(Landing, {
                equity,
                indicators,
                region,
                onSelectSector: handleSelectSector
              })
    );
  }

  window.IndustryWorkspace = IndustryWorkspace;
})();
