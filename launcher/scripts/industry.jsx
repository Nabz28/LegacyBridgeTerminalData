/* =========================================================================
   INDUSTRY (T3) — Sector Map workspace (W1).
   Landing page (commodity strip + business-cycle banner + sector grid + news)
   + Sector Detail (drill-in via router state).
   All React via Babel-in-browser. No imports. All globals on window.
   Exposes window.IndustryWorkspace.
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const h = window.IND.h;
  const { Spark, Spinner, Empty, useToast, Modal, fmt } = window.IND;
  const { TAXONOMY, COMMODITY_TILES, REGIONS, an } = window.INDUSTRY;

  /* ---- favorability score (ML-free blend, 0-100) ---- */
  // fav = convScore*0.5 + (50 + weightedNet*40)*0.3 + clamp(50 + rs*3, 0, 100)*0.2
  const clampFav = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const calcFav = (convScore, tilt, rs) => {
    const driverComp = 50 + (tilt && tilt.weightedNet != null ? tilt.weightedNet * 40 : 0);
    const rsComp     = rs != null ? clampFav(50 + rs * 3, 0, 100) : 50;
    return Math.round(clampFav(convScore * 0.5 + driverComp * 0.3 + rsComp * 0.2, 0, 100));
  };

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

  /* ---- CSV export helper ---- */
  const downloadCsv = (filename, rows, cols) => {
    const header = cols.map(c => c.label).join(',');
    const body = rows.map(row => cols.map(c => {
      const v = c.get(row);
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  function TickerModal({ row, peers, convResult, driverNet, onClose }) {
    if (!row) return null;
    const conviction = convResult && typeof convResult === 'object' ? convResult.score : (convResult != null ? Number(convResult) : 50);
    const peerMed = useMemo(() => {
      const vals = (k) => peers.map(r => r[k]).filter(v => v != null && !isNaN(v)).map(Number);
      const med = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      return { pe: med(vals('pe')), pb: med(vals('pb')), ev_ebitda: med(vals('ev_ebitda')), roe: med(vals('roe')), net_margin: med(vals('net_margin')), rev_growth: med(vals('rev_growth')) };
    }, [peers]);

    const sectorAvgChg = useMemo(() => {
      const vals = peers.map(r => r.change_pct).filter(v => v != null && !isNaN(v)).map(Number);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }, [peers]);

    const comp = an.competitive(row, peers, { peerMed, sectorAvgChg, driverNet, conviction });
    const price52  = Number(row.price);
    const w52h     = Number(row.w52_high);
    const w52l     = Number(row.w52_low);
    const w52pos = (w52h > w52l && !isNaN(price52) && !isNaN(w52h) && !isNaN(w52l))
      ? Math.round(((price52 - w52l) / (w52h - w52l)) * 100)
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
                h('span', null, 'L: ' + fmt.money(w52l)),
                h('span', null, w52pos + '% of range'),
                h('span', null, 'H: ' + fmt.money(w52h))
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
    const [subSort, setSubSort] = useState('chg1d'); // sub-industry table sort

    const indByKey = useMemo(() => {
      const m = {};
      indicators.forEach(i => { m[i.key] = i; });
      return m;
    }, [indicators]);

    const tickers = useMemo(() => an.tickersFor(ind, equity), [ind, equity]);
    const snap = useMemo(() => an.snapshot(tickers), [tickers]);
    // tilt must be computed before conviction so the driver component can contribute
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    // conviction() now returns {score, signalLabel, driverNet}
    const convResult = useMemo(() => an.conviction(snap, tilt), [snap, tilt]);
    const convScore = convResult.score;
    const status = useMemo(() => an.status(convResult, snap), [convResult, snap]);
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
    // kesimpulan now takes 6th arg indByKey
    const kesimpulan = useMemo(() => an.kesimpulan(ind, snap, convResult, status, tilt, indByKey), [ind, snap, convResult, status, tilt, indByKey]);

    const postures = useMemo(() => (ind.drivers || []).map(d => an.posture(d, indByKey)), [ind, indByKey]);

    const demandDrivers = postures.filter(p => p.driver && p.driver.kind === 'demand');
    const supplyDrivers = postures.filter(p => p.driver && p.driver.kind === 'supply');
    const macroDrivers  = postures.filter(p => p.driver && p.driver.kind === 'macro');

    const peerMed = useMemo(() => {
      const vals = (k) => tickers.map(r => r[k]).filter(v => v != null && !isNaN(v)).map(Number);
      const med = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      return { pe: med(vals('pe')), roe: med(vals('roe')), net_margin: med(vals('net_margin')), rev_growth: med(vals('rev_growth')) };
    }, [tickers]);

    // Sub-industry breakdown grouped by sub_sector
    const subIndustryData = useMemo(() => {
      const groups = {};
      tickers.forEach(row => {
        const key = (row.sub_sector && row.sub_sector.trim()) ? row.sub_sector.trim() : 'Uncategorized';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      return Object.entries(groups).map(([name, rows]) => {
        const s = an.snapshot(rows);
        return {
          name,
          n: rows.length,
          chg1d: s.mcapChg,
          breadth: s.breadth,
          breadthStr: s.up + '/' + rows.length,
          medPE: s.medPE,
          medROE: s.medROE,
          mcap: s.mcap,
        };
      });
    }, [tickers]);

    const sortedSubIndustry = useMemo(() => {
      return subIndustryData.slice().sort((a, b) => {
        if (subSort === 'chg1d')   { const va = (a.chg1d == null || isNaN(a.chg1d)) ? -Infinity : a.chg1d;   const vb = (b.chg1d == null || isNaN(b.chg1d)) ? -Infinity : b.chg1d;   return vb - va; }
        if (subSort === 'breadth') { const va = isNaN(a.breadth) ? -1 : a.breadth; const vb = isNaN(b.breadth) ? -1 : b.breadth; return vb - va; }
        if (subSort === 'n')       { return b.n - a.n; }
        if (subSort === 'medPE')   { const va = (a.medPE == null || isNaN(a.medPE)) ? Infinity : a.medPE;    const vb = (b.medPE == null || isNaN(b.medPE)) ? Infinity : b.medPE;    return va - vb; }
        if (subSort === 'medROE')  { const va = (a.medROE == null || isNaN(a.medROE)) ? -Infinity : a.medROE; const vb = (b.medROE == null || isNaN(b.medROE)) ? -Infinity : b.medROE; return vb - va; }
        return 0;
      });
    }, [subIndustryData, subSort]);

    const chipCls = statusChipClass(status);

    const DriverCard = ({ p }) => {
      // noSeries: key intentionally absent from live_indicators — show "no series" explicitly
      if (!p.found && p.noSeries) {
        return h('div', { className: 'in-driver neutral' },
          h('div', { className: 'in-driver-lbl' }, h('span', null, p.driver.label), h('span', { className: 'in-chip neu', style: { fontSize: 9, padding: '1px 5px' } }, 'no series')),
          h('div', { className: 'in-driver-val in-muted' }, '—'),
          h('div', { className: 'in-driver-meta' }, h('span', { className: 'in-kind' }, p.driver.kind), h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono)', fontSize: 11 } }, 'not in feed'))
        );
      }
      if (!p.found) {
        return h('div', { className: 'in-driver neutral' },
          h('div', { className: 'in-driver-lbl' }, h('span', null, p.driver.label), h('span', { className: 'in-chip neu', style: { fontSize: 9, padding: '1px 5px' } }, 'N/A')),
          h('div', { className: 'in-driver-val in-muted' }, '—'),
          h('div', { className: 'in-driver-meta' }, h('span', { className: 'in-kind' }, p.driver.kind), h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono)', fontSize: 11 } }, '—'))
        );
      }
      const pCls = postureChipClass(p.posture);
      const chgCls = p.chg != null ? (p.chg > 0 ? 'in-pos' : p.chg < 0 ? 'in-neg' : 'in-muted') : 'in-muted';
      const sparkColor = p.posture === 'tailwind' ? 'var(--pos,#19c37d)' : p.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)';
      return h('div', { className: 'in-driver ' + pCls },
        h('div', { className: 'in-driver-lbl' },
          h('span', null, p.label || p.driver.label),
          h('span', { className: 'in-chip ' + pCls, style: { fontSize: 9, padding: '1px 5px', flexShrink: 0 } }, postureLabel(p.posture))
        ),
        h('div', { className: 'in-driver-val in-num' }, fmt.val(p.value, p.unit)),
        h('div', { className: 'in-driver-meta' },
          h('span', { className: chgCls + ' in-num', style: { fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700 } }, fmt.pct(p.chg)),
          h('span', { className: 'in-kind' }, p.driver.kind)
        ),
        p.spark && p.spark.length > 1
          ? h('div', { className: 'in-driver-spark' }, h(Spark, { data: p.spark, w: null, ht: 26, color: sparkColor }))
          : null
      );
    };

    const DriversGroup = ({ title, items }) => {
      if (!items.length) return null;
      return h('div', { style: { marginBottom: 12 } },
        h('div', { style: { fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7 } }, title),
        h('div', { className: 'in-grid in-grid-3', style: { gap: 8 } },
          items.map((p, i) => h(DriverCard, { key: p.driver.key + i, p }))
        )
      );
    };

    const sortedTickers = useMemo(() =>
      tickers.slice().sort((a, b) => (Number(b.mcap) || 0) - (Number(a.mcap) || 0)),
      [tickers]
    );

    // Find the primary commodity driver for the proxy chart.
    // Only consider postures where found===true so label/spark/value are present.
    // Priority: (1) supply driver with spark, (2) any driver with spark, (3) supply driver (no spark → empty state)
    const primaryProxyPosture = useMemo(() => {
      const found = postures.filter(p => p.found);
      const supplyWithSpark = found.find(p => p.driver && p.driver.kind === 'supply' && p.spark && p.spark.length > 1);
      if (supplyWithSpark) return supplyWithSpark;
      const anyWithSpark = found.find(p => p.spark && p.spark.length > 1);
      if (anyWithSpark) return anyWithSpark;
      // fallback: supply driver even without spark (chart shows empty state gracefully)
      return found.find(p => p.driver && p.driver.kind === 'supply') || null;
    }, [postures]);

    // driverNet for the TickerModal (from convResult)
    const driverNet = convResult.driverNet != null ? convResult.driverNet : (tilt.weightedNet != null ? tilt.weightedNet : 0);

    // CSV export for ticker table
    const handleTickerCsv = useCallback(() => {
      downloadCsv(ind.id + '_tickers.csv', sortedTickers, [
        { label: 'Symbol',    get: r => r.symbol },
        { label: 'Name',      get: r => r.name || '' },
        { label: 'Price',     get: r => r.price },
        { label: 'Change%',   get: r => r.change_pct },
        { label: 'Mcap_IDR',  get: r => r.mcap },
        { label: 'PE',        get: r => r.pe },
        { label: 'ROE%',      get: r => r.roe },
        { label: 'DivYield%', get: r => r.div_yield },
        { label: 'Beta',      get: r => r.beta },
      ]);
    }, [sortedTickers, ind.id]);

    return h('div', { className: 'in-work' },
      toast,
      tickerModal && h(TickerModal, {
        row: tickerModal,
        peers: tickers,
        convResult,
        driverNet,
        onClose: () => setTickerModal(null)
      }),

      /* header */
      h('div', { style: { marginBottom: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 } },
          h('button', { className: 'in-back', onClick: onBack }, '← Sector Map'),
          h('div', { className: 'in-work-title' }, ind.name),
          h('span', { className: 'in-chip ' + chipCls }, statusLabel(status)),
          h('span', { className: 'in-muted', style: { fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 'auto' } }, snap.n + ' tickers · ' + snap.up + ' up · ' + snap.down + ' dn')
        ),
        /* tight stat row */
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 0, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' } },
          h('div', { style: { padding: '6px 14px', borderRight: '1px solid var(--border-subtle,rgba(255,255,255,0.05))' } },
            h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, convResult.signalLabel || '1D Signal'),
            h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: convScore >= 65 ? 'var(--pos)' : convScore <= 35 ? 'var(--neg)' : 'var(--text-primary)' } }, convScore + '/100')
          ),
          h('div', { style: { padding: '6px 14px', borderRight: '1px solid var(--border-subtle,rgba(255,255,255,0.05))' } },
            h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, 'Status'),
            h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 } }, h('span', { className: 'in-chip ' + chipCls, style: { fontSize: 11 } }, statusLabel(status)))
          ),
          h('div', { style: { padding: '6px 14px', borderRight: '1px solid var(--border-subtle,rgba(255,255,255,0.05))' } },
            h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, 'RS vs IHSG'),
            rs != null
              ? h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: rs > 0 ? 'var(--pos)' : rs < 0 ? 'var(--neg)' : 'var(--text-tertiary)' } }, (rs > 0 ? '+' : '') + rs.toFixed(1) + ' pp')
              : h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' } }, '—')
          ),
          snap.beta != null
            ? h('div', { style: { padding: '6px 14px', borderRight: '1px solid var(--border-subtle,rgba(255,255,255,0.05))' } },
                h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, 'Beta'),
                h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: snap.beta > 1.3 ? 'var(--warn,#ffc65c)' : 'var(--text-primary)' } }, 'β ' + snap.beta.toFixed(2))
              )
            : null,
          h('div', { style: { padding: '6px 14px' } },
            h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, 'Driver Tilt'),
            h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
              tilt.net != null
                ? h('span', {
                    style: { color: tilt.net > 0.15 ? 'var(--pos)' : tilt.net < -0.15 ? 'var(--neg)' : 'var(--text-tertiary)' }
                  },
                  tilt.tail + 'T / ' + tilt.head + 'H · ' + (tilt.net > 0.15 ? 'Tail' : tilt.net < -0.15 ? 'Head' : 'Bal')
                )
                : h('span', { style: { color: 'var(--text-tertiary)' } }, '—')
            )
          )
        )
      ),

      /* driver panel — HERO, placed first */
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

      /* primary driver chart panel — renamed from "Sector Performance" */
      h('div', { className: 'in-chart-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-chart-header' },
          h('div', null,
            h('div', { className: 'in-chart-title' }, 'Primary Driver Chart'),
            primaryProxyPosture
              ? h('div', { className: 'in-chart-subtitle' }, primaryProxyPosture.label + ' — ' + primaryProxyPosture.driver.kind + ' driver')
              : h('div', { className: 'in-chart-subtitle' }, 'commodity proxy')
          ),
          primaryProxyPosture && h('div', { className: 'in-chart-kpis' },
            h('div', { className: 'in-chart-kpi' },
              h('span', { className: 'in-chart-kpi-lbl' }, 'Latest'),
              h('span', { className: 'in-chart-kpi-val in-num' }, fmt.val(primaryProxyPosture.value, primaryProxyPosture.unit))
            ),
            h('div', { className: 'in-chart-kpi' },
              h('span', { className: 'in-chart-kpi-lbl' }, 'W/W'),
              h('span', { className: 'in-chart-kpi-val in-num ' + fmt.cls(primaryProxyPosture.chg) }, fmt.pct(primaryProxyPosture.chg))
            )
          )
        ),
        primaryProxyPosture && primaryProxyPosture.spark && primaryProxyPosture.spark.length > 1
          ? h(React.Fragment, null,
              h('div', { className: 'in-chart-body' },
                h(Spark, { data: primaryProxyPosture.spark, w: null, ht: 120, color: (primaryProxyPosture.chg || 0) >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' })
              ),
              h('div', { className: 'in-chart-footer' },
                h('span', null, primaryProxyPosture.label),
                h('span', null, ind.idxSector + ' · IDX')
              )
            )
          : h('div', { className: 'in-chart-empty' },
              'Price history pending — commodity spark series not yet available for this sector.'
            )
      ),

      /* kesimpulan */
      h('div', { className: 'in-concl', style: { marginBottom: 16 } },
        h('b', null, 'Kesimpulan: '),
        kesimpulan
      ),

      /* ticker table */
      h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'Tickers — ' + ind.name),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('div', { className: 'in-panel-tag' }, 'sorted by mcap · click for detail'),
            tickers.length > 0 && h('button', {
              className: 'in-btn in-btn-ghost in-btn-sm',
              onClick: handleTickerCsv,
              title: 'Download CSV',
              style: { fontSize: 10, padding: '3px 8px' }
            }, 'CSV')
          )
        ),
        h('div', { className: 'in-note', style: { marginBottom: 8 } },
          '1D data live. 7D/30D returns require a price-history table (pending).'
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
                      h('td', { className: 'r in-num ' + (Number(row.roe) > 0 ? 'in-pos' : Number(row.roe) < 0 ? 'in-neg' : '') }, fmt.pct(row.roe)),
                      h('td', { className: 'r in-num' }, fmt.pct(row.div_yield))
                    )
                  )
                )
              )
            )
      ),

      /* sub-industry drill */
      subIndustryData.length > 1 && h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'Sub-Industry Breakdown'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
            h('span', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Sort'),
            h('div', { className: 'in-seg' },
              [
                { id: 'chg1d',   label: '1D' },
                { id: 'breadth', label: 'Breadth' },
                { id: 'n',       label: 'Names' },
                { id: 'medPE',   label: 'P/E' },
                { id: 'medROE',  label: 'ROE' },
              ].map(opt =>
                h('button', {
                  key: opt.id,
                  className: subSort === opt.id ? 'on' : '',
                  onClick: () => setSubSort(opt.id),
                  style: { fontSize: 10 }
                }, opt.label)
              )
            )
          )
        ),
        h('div', { className: 'in-tablewrap' },
          h('table', { className: 'in-table' },
            h('thead', null,
              h('tr', null,
                h('th', null, 'Sub-Industry'),
                h('th', { className: 'r' }, 'Names'),
                h('th', { className: 'r' }, '1D Mcap-Wt'),
                h('th', { className: 'r' }, 'Breadth'),
                h('th', { className: 'r' }, 'Med P/E'),
                h('th', { className: 'r' }, 'Med ROE')
              )
            ),
            h('tbody', null,
              sortedSubIndustry.map(sub =>
                h('tr', { key: sub.name },
                  h('td', { style: { fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' } }, sub.name),
                  h('td', { className: 'r in-num' }, sub.n),
                  h('td', { className: 'r in-num ' + fmt.cls(sub.chg1d) }, fmt.pct(sub.chg1d)),
                  h('td', { className: 'r in-num' }, sub.breadthStr),
                  h('td', { className: 'r in-num' }, fmt.num(sub.medPE)),
                  h('td', { className: 'r in-num ' + (Number(sub.medROE) > 0 ? 'in-pos' : Number(sub.medROE) < 0 ? 'in-neg' : '') }, fmt.pct(sub.medROE))
                )
              )
            )
          )
        )
      ),

      /* peer comps note — quiet .in-note, not a yellow box */
      h('div', { className: 'in-note' },
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
    // tilt before conviction so driver component contributes
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    // conviction() returns {score, signalLabel, driverNet}
    const convResult = useMemo(() => an.conviction(snap, tilt), [snap, tilt]);
    const convScore = convResult.score;
    const status = useMemo(() => an.status(convResult, snap), [convResult, snap]);
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
    const fav = useMemo(() => calcFav(convScore, tilt, rs), [convScore, tilt, rs]);

    const chipCls = statusChipClass(status);
    const convColor = status === 'BULLISH' ? 'var(--pos)' : status === 'BEARISH' ? 'var(--neg)' : status === 'ROTATION' ? 'var(--in)' : 'var(--text-tertiary)';
    const isFavored = cycleData && cycleData.favored && cycleData.favored.includes(ind.id);

    const borderLeft = status === 'BULLISH' ? '2px solid var(--pos)' : status === 'BEARISH' ? '2px solid var(--neg)' : status === 'ROTATION' ? '2px solid var(--in)' : undefined;
    const baseStyle = borderLeft ? { borderLeft } : {};
    const cardStyle = isFavored ? { ...baseStyle, borderColor: 'var(--in-edge)', background: 'var(--in-softer)' } : baseStyle;

    // RS badge: "+x.x pp vs IHSG"
    const rsBadge = rs != null
      ? h('span', {
          style: {
            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
            padding: '1px 5px', borderRadius: 3,
            background: rs > 0 ? 'rgba(25,195,125,0.13)' : rs < 0 ? 'rgba(255,92,112,0.13)' : 'var(--bg-3)',
            color: rs > 0 ? 'var(--pos)' : rs < 0 ? 'var(--neg)' : 'var(--text-tertiary)',
            border: '1px solid ' + (rs > 0 ? 'rgba(25,195,125,0.35)' : rs < 0 ? 'rgba(255,92,112,0.35)' : 'transparent'),
            whiteSpace: 'nowrap',
          }
        },
        (rs > 0 ? '+' : '') + rs.toFixed(1) + ' pp vs IHSG'
      )
      : null;

    // β pill — amber if high beta (>1.3)
    const betaPill = snap.beta != null
      ? h('span', {
          style: {
            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
            padding: '1px 5px', borderRadius: 3,
            background: snap.beta > 1.3 ? 'rgba(255,198,92,0.15)' : 'var(--bg-3)',
            color: snap.beta > 1.3 ? 'var(--warn,#ffc65c)' : 'var(--text-tertiary)',
            border: snap.beta > 1.3 ? '1px solid rgba(255,198,92,0.35)' : '1px solid transparent',
            whiteSpace: 'nowrap',
          }
        }, 'β ' + snap.beta.toFixed(1))
      : null;

    return h('div', {
      className: 'in-card',
      style: cardStyle,
      onClick
    },
      h('div', { className: 'in-card-h' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          h('div', { className: 'in-card-name' }, ind.name),
          isFavored
            ? h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--in)', letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Cycle Favored')
            : null
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
          betaPill,
          rsBadge,
          h('span', { className: 'in-chip ' + chipCls }, statusLabel(status))
        )
      ),

      h('div', { className: 'in-convbar' },
        h('div', { className: 'in-convbar-fill', style: { width: convScore + '%', background: convColor } })
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
          h('div', { className: 'in-muted', style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Fav / Drivers'),
          h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono)' } },
            h('span', { style: { color: fav >= 60 ? 'var(--pos)' : fav <= 40 ? 'var(--neg)' : 'var(--text-secondary)', fontWeight: 700 } }, fav),
            h('span', { className: 'in-muted' }, ' · '),
            h('span', { style: { color: 'var(--pos)' } }, tilt.tail + 'T'),
            h('span', { className: 'in-muted' }, '/'),
            h('span', { style: { color: 'var(--neg)' } }, tilt.head + 'H')
          )
        )
      ),

      h('div', { className: 'in-card-thesis' }, ind.thesis)
    );
  }

  /* =====================================================================
     MOVEMENT ALERTS
     Per-commodity thresholds stored in TAXONOMY tile config.
     ===================================================================== */
  // Per-commodity alert thresholds (key -> {high, med}). Defaults fall through.
  const COMMODITY_THRESHOLDS = {
    'wb_coal_au':  { high: 8,  med: 4 },
    'wb_nickel':   { high: 8,  med: 4 },
    'wb_palm_oil': { high: 6,  med: 3 },
    'wb_tin':      { high: 8,  med: 4 },
    'wti':         { high: 5,  med: 2.5 },
    'brent':       { high: 5,  med: 2.5 },
    'natgas':      { high: 8,  med: 4 },
    'gold':        { high: 3,  med: 1.5 },
    'copper':      { high: 5,  med: 2.5 },
    'iron_ore':    { high: 6,  med: 3 },
    'aluminum':    { high: 5,  med: 2.5 },
    'lithium_etf': { high: 8,  med: 4 },
    'dxy':         { high: 1.5,med: 0.75 },
    'id_bi_rate':  { high: 0.5,med: 0.25 },
    'id_cpi_yoy':  { high: 0.5,med: 0.25 },
  };
  const DEFAULT_THRESH = { high: 10, med: 5 };

  function MovementAlerts({ indicators, indByKey }) {
    // Collect all driver keys referenced across TAXONOMY (deduplicated)
    const allDriverKeys = useMemo(() => {
      const seen = new Set();
      TAXONOMY.forEach(ind => (ind.drivers || []).forEach(d => seen.add(d.key)));
      return Array.from(seen);
    }, []);

    const bigAlerts = useMemo(() =>
      allDriverKeys
        .map(k => ({ item: indByKey[k], key: k }))
        .filter(x => x.item)
        .filter(x => {
          const t = COMMODITY_THRESHOLDS[x.key] || DEFAULT_THRESH;
          return Math.abs(Number(x.item.change_pct)) >= t.high;
        })
        .map(x => x.item)
        .sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct))),
      [allDriverKeys, indByKey]
    );

    const medAlerts = useMemo(() =>
      allDriverKeys
        .map(k => ({ item: indByKey[k], key: k }))
        .filter(x => x.item)
        .filter(x => {
          const t = COMMODITY_THRESHOLDS[x.key] || DEFAULT_THRESH;
          const abs = Math.abs(Number(x.item.change_pct));
          return abs >= t.med && abs < t.high;
        })
        .map(x => x.item)
        .sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct))),
      [allDriverKeys, indByKey]
    );

    if (!bigAlerts.length && !medAlerts.length) return null;

    // Movement alerts use .in-alert (amber, bold border) — not .in-banner
    return h('div', { className: 'in-alert', style: { flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginBottom: 12 } },
      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 } }, 'Movement Alerts'),
      bigAlerts.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
        bigAlerts.map(i =>
          h('span', { key: i.key, style: { background: i.change_pct > 0 ? 'rgba(25,195,125,0.14)' : 'rgba(255,92,112,0.14)', border: '1px solid ' + (i.change_pct > 0 ? 'rgba(25,195,125,0.4)' : 'rgba(255,92,112,0.4)'), borderRadius: 3, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: i.change_pct > 0 ? 'var(--pos)' : 'var(--neg)', whiteSpace: 'nowrap' } },
            i.label + ' ' + fmt.pct(i.change_pct)
          )
        )
      ),
      medAlerts.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
        medAlerts.map(i =>
          h('span', { key: i.key, style: { background: 'rgba(255,198,92,0.10)', border: '1px solid rgba(255,198,92,0.28)', borderRadius: 3, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--warn,#ffc65c)', whiteSpace: 'nowrap' } },
            i.label + ' ' + fmt.pct(i.change_pct)
          )
        )
      )
    );
  }

  /* =====================================================================
     TOP OPPORTUNITIES STRIP
     CIO at-a-glance: top 3 favored + bottom 2 laggards by favorability.
     Derived from the metricsMap bubbled up by SortableSectorCard.
     Each chip is clickable and jumps straight to that sector's detail.
     ===================================================================== */
  function TopOpportunities({ metricsMap, taxonomy, onSelectSector, cycleData }) {
    // Only show when at least half the sectors have reported metrics
    const readyIds = Object.keys(metricsMap);
    if (readyIds.length < Math.ceil(taxonomy.length / 2)) return null;

    // Sort all sectors that have metrics by favorability descending
    const sorted = taxonomy
      .filter(ind => metricsMap[ind.id] != null)
      .slice()
      .sort((a, b) => {
        const fa = metricsMap[a.id] ? metricsMap[a.id].fav : 0;
        const fb = metricsMap[b.id] ? metricsMap[b.id].fav : 0;
        return fb - fa;
      });

    if (sorted.length < 2) return null;

    const top = sorted.slice(0, 3);
    const bot = sorted.slice(-2).reverse(); // worst first in bottom strip

    const favored = (cycleData && cycleData.favored) ? new Set(cycleData.favored) : new Set();

    const TopChip = ({ ind, rank }) => {
      const m = metricsMap[ind.id] || {};
      const isCycleFav = favored.has(ind.id);
      return h('button', {
        key: ind.id,
        onClick: () => onSelectSector(ind),
        style: {
          display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start',
          background: 'rgba(25,195,125,0.07)', border: '1px solid rgba(25,195,125,0.28)',
          borderRadius: 4, padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
          minWidth: 140, transition: 'background 0.12s, border-color 0.12s',
        },
        onMouseEnter: (e) => { e.currentTarget.style.background = 'rgba(25,195,125,0.14)'; e.currentTarget.style.borderColor = 'rgba(25,195,125,0.5)'; },
        onMouseLeave: (e) => { e.currentTarget.style.background = 'rgba(25,195,125,0.07)'; e.currentTarget.style.borderColor = 'rgba(25,195,125,0.28)'; },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--pos)', fontWeight: 700, opacity: 0.7 } }, '#' + rank),
          isCycleFav && h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--in)', background: 'var(--in-soft)', borderRadius: 2, padding: '0 4px', fontWeight: 700 } }, 'CYCLE')
        ),
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 } }, ind.name),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--pos)' } }, 'Fav ' + (m.fav != null ? m.fav : '—')),
          m.chg1d != null
            ? h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: m.chg1d >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 } }, (m.chg1d >= 0 ? '+' : '') + m.chg1d.toFixed(1) + '%')
            : null
        )
      );
    };

    const BotChip = ({ ind, rank }) => {
      const m = metricsMap[ind.id] || {};
      return h('button', {
        key: ind.id,
        onClick: () => onSelectSector(ind),
        style: {
          display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start',
          background: 'rgba(255,92,112,0.07)', border: '1px solid rgba(255,92,112,0.25)',
          borderRadius: 4, padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
          minWidth: 120, transition: 'background 0.12s, border-color 0.12s',
        },
        onMouseEnter: (e) => { e.currentTarget.style.background = 'rgba(255,92,112,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,92,112,0.45)'; },
        onMouseLeave: (e) => { e.currentTarget.style.background = 'rgba(255,92,112,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,92,112,0.25)'; },
      },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neg)', fontWeight: 700, opacity: 0.7 } }, 'AVOID'),
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 } }, ind.name),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--neg)' } }, 'Fav ' + (m.fav != null ? m.fav : '—')),
          m.chg1d != null
            ? h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: m.chg1d >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 } }, (m.chg1d >= 0 ? '+' : '') + m.chg1d.toFixed(1) + '%')
            : null
        )
      );
    };

    return h('div', {
      style: {
        background: 'var(--bg-1)', border: '1px solid var(--border-subtle,rgba(255,255,255,0.05))',
        borderRadius: 4, padding: '12px 16px', marginBottom: 14,
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' } }, 'Top Opportunities'),
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' } }, 'by favorability · click to drill in')
      ),
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
          h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--pos)', marginBottom: 2 } }, 'Leaders'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
            top.map((ind, i) => h(TopChip, { key: ind.id, ind, rank: i + 1 }))
          )
        ),
        h('div', { style: { width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', flexShrink: 0 } }),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
          h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--neg)', marginBottom: 2 } }, 'Laggards'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
            bot.map((ind, i) => h(BotChip, { key: ind.id, ind, rank: i + 1 }))
          )
        )
      )
    );
  }

  /* =====================================================================
     NEWS PANEL — live RSS via Google News JSON bridge
     Cached in sessionStorage per sector keyword (5 min TTL).
     ===================================================================== */
  // Sector keyword map for Google News query
  const SECTOR_KEYWORDS = {
    coal:       'coal Indonesia IDX ADRO PTBA',
    nickel:     'nickel Indonesia LME INCO ANTM',
    cpo:        'palm oil CPO Indonesia AALI LSIP',
    tin:        'tin Indonesia TINS LME',
    oilgas:     'oil gas Indonesia MEDC PGAS energy',
    goldmetal:  'gold mining Indonesia MDKA ANTM',
    banks:      'bank Indonesia BCA BRI MANDIRI BBRI',
    property:   'property real estate Indonesia IDX',
    consumer:   'consumer retail Indonesia IDX saham',
    staples:    'consumer staples Indonesia UNVR ICBP MYOR',
    tech:       'technology digital Indonesia IDX saham',
    health:     'healthcare hospital pharma Indonesia IDX',
    industrials:'industrials manufacturing Indonesia IDX INTP SMGR',
    infra:      'infrastructure toll Indonesia IDX JSMR WSKT',
    transport:  'transport logistics Indonesia IDX GIAA ASSA',
  };
  const DEFAULT_NEWS_KEYWORD = 'Indonesia IDX stock market saham IHSG';
  const NEWS_CACHE_TTL = 300000; // 5 min

  function NewsPanel({ sectorId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const kw = (sectorId && SECTOR_KEYWORDS[sectorId]) ? SECTOR_KEYWORDS[sectorId] : DEFAULT_NEWS_KEYWORD;
      const cacheKey = 'news:' + kw;
      // Check sessionStorage cache
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
        if (cached && Date.now() - cached.t < NEWS_CACHE_TTL) {
          setItems(cached.v);
          setLoading(false);
          return;
        }
      } catch (e) {}

      setLoading(true);
      setError(null);

      // Use rss2json.com public API to convert Google News RSS to JSON
      const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=' + encodeURIComponent(kw) + '&hl=en-ID&gl=ID&ceid=ID:en');
      fetch('https://api.rss2json.com/v1/api.json?rss_url=' + rssUrl + '&count=10')
        .then(r => r.ok ? r.json() : Promise.reject(new Error('news fetch failed')))
        .then(data => {
          const entries = (data && data.items) ? data.items.map(item => ({
            title: item.title || '',
            src: item.author || (item.source && item.source.name) || 'Google News',
            url: item.link || item.guid || '',
            pub: item.pubDate || '',
          })) : [];
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: entries })); } catch(e) {}
          setItems(entries);
          setLoading(false);
        })
        .catch(err => {
          setError('News feed temporarily unavailable.');
          setLoading(false);
        });
    }, [sectorId]);

    return h('div', { className: 'in-panel' },
      h('div', { className: 'in-panel-h' },
        h('div', { className: 'in-panel-title' }, 'News'),
        h('div', { className: 'in-panel-tag' }, sectorId ? (SECTOR_KEYWORDS[sectorId] ? sectorId + ' feed' : 'general feed') : 'general feed')
      ),
      loading
        ? h('div', { className: 'in-loading', style: { padding: 20 } }, h('span', { className: 'in-spin' }), 'Loading news…')
        : error
          ? h('div', { className: 'in-muted', style: { fontSize: 11, padding: '10px 0' } }, error)
          : items.length === 0
            ? h('div', { className: 'in-muted', style: { fontSize: 11, padding: '10px 0' } }, 'No news items found.')
            : items.map((item, i) =>
                h('a', {
                  key: i,
                  className: 'in-news-item',
                  href: item.url || '#',
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  style: { textDecoration: 'none' }
                },
                  h('div', { className: 'in-news-title' }, item.title),
                  h('div', { className: 'in-news-src' },
                    item.src,
                    item.pub && h('span', { className: 'in-news-tag' }, item.pub.slice(0, 10))
                  )
                )
              )
    );
  }

  /* =====================================================================
     LANDING VIEW
     ===================================================================== */
  // Sort keys for the sector grid
  const SORT_OPTIONS = [
    { id: 'fav',        label: 'Favorability' },
    { id: 'conviction', label: '1D Signal' },
    { id: 'rs',         label: 'RS vs IHSG' },
    { id: 'chg1d',      label: '1D Chg' },
    { id: 'mcap',       label: 'Mcap' },
  ];

  // Wrapper to pre-compute all sort metrics for one sector then render SectorCard
  function SortableSectorCard({ ind, equity, indByKey, cycleData, onClick, onMetrics }) {
    const tickers = useMemo(() => an.tickersFor(ind, equity), [ind, equity]);
    const snap = useMemo(() => an.snapshot(tickers), [tickers]);
    // tilt before conviction so driver component contributes
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    // conviction() returns {score, signalLabel, driverNet}
    const convResult = useMemo(() => an.conviction(snap, tilt), [snap, tilt]);
    const convScore = convResult.score;
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
    const fav = useMemo(() => calcFav(convScore, tilt, rs), [convScore, tilt, rs]);

    // Bubble metrics up to Landing so it can sort without re-computing
    useEffect(() => {
      if (onMetrics) onMetrics(ind.id, { fav, conviction: convScore, rs, chg1d: snap.mcapChg, mcap: snap.mcap });
    }, [ind.id, fav, convScore, rs, snap.mcapChg, snap.mcap]);

    return h(SectorCard, { ind, equity, indByKey, cycleData, onClick });
  }

  /* =====================================================================
     GLOBAL / US DRIVER LENS — shown when region !== 'id'
     Renders commodity tiles + commodity-driven industries (posture view)
     + US macro indicators (US only). No empty IDX sector cards.
     ===================================================================== */
  // Commodity-industry mapping for the driver lens
  const COMMODITY_INDUSTRIES = [
    { id: 'coal',      label: 'Coal & Mining',         keys: ['wb_coal_au', 'bcom', 'natgas'] },
    { id: 'nickel',    label: 'Nickel & Battery Metals', keys: ['wb_nickel', 'copper', 'lithium_etf'] },
    { id: 'cpo',       label: 'Plantation & CPO',       keys: ['wb_palm_oil', 'soybean_oil', 'wb_urea'] },
    { id: 'tin',       label: 'Tin',                    keys: ['wb_tin', 'copper', 'cn_ip_yoy'] },
    { id: 'oilgas',    label: 'Oil & Gas',               keys: ['wti', 'brent', 'wb_lng_jp'] },
    { id: 'goldmetal', label: 'Gold & Precious',         keys: ['gold', 'copper', 'dxy'] },
  ];
  const US_MACRO_KEYS = ['us_2s10s', 'us_3m10y', 'us_fed_funds', 'us_10y', 'us_cpi', 'us_indpro', 'us_caputil', 'us_housing_starts', 'us_umich', 'dxy'];

  function GlobalDriverLens({ indicators, region, setCommodityModal }) {
    const indByKey = useMemo(() => {
      const m = {};
      indicators.forEach(i => { if (i && i.key) m[i.key] = i; });
      return m;
    }, [indicators]);

    const usMacroItems = useMemo(() => {
      if (region !== 'us') return [];
      return US_MACRO_KEYS.map(k => indByKey[k]).filter(Boolean);
    }, [region, indByKey]);

    // US single-name universe (public.equity_screen_global) -> live sector grid
    const [usRows, setUsRows] = useState(null);
    useEffect(() => {
      if (region !== 'us') { setUsRows(null); return; }
      let alive = true;
      window.INDUSTRY.usEquity().then(rs => { if (alive) setUsRows(rs || []); }).catch(() => { if (alive) setUsRows([]); });
      return () => { alive = false; };
    }, [region]);
    const usSectors = useMemo(() => {
      if (!usRows || !usRows.length) return [];
      const g = {};
      usRows.forEach(r => { const s = r.sector || 'Other'; (g[s] = g[s] || []).push(r); });
      const med = (arr) => { const v = arr.filter(x => x != null && !isNaN(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
      return Object.keys(g).map(s => {
        const rows = g[s];
        const totMcap = rows.reduce((a, r) => a + (Number(r.mcap) || 0), 0);
        const wChg = totMcap > 0 ? rows.reduce((a, r) => a + (Number(r.change_pct) || 0) * (Number(r.mcap) || 0), 0) / totMcap : 0;
        const betas = rows.map(r => Number(r.beta)).filter(x => !isNaN(x));
        const top = rows.slice().sort((a, b) => (Number(b.mcap) || 0) - (Number(a.mcap) || 0)).slice(0, 3).map(r => r.symbol);
        return { sector: s, n: rows.length, wChg, medPE: med(rows.map(r => Number(r.pe))), avgBeta: betas.length ? betas.reduce((a, b) => a + b, 0) / betas.length : null, top };
      }).sort((a, b) => b.wChg - a.wChg);
    }, [usRows]);

    return h('div', { className: 'in-work' },
      // region note — quiet gray text, NOT a yellow box
      h('div', { className: 'in-note', style: { marginBottom: 14 } },
        h('b', null, region === 'us' ? 'US' : 'Global'),
        region === 'us'
          ? ' lens — US large-cap sector grid (live) + commodity & macro drivers. Per-name detail & peer ranking in Competitive Positioning.'
          : ' lens — global commodity & macro driver view. Single-name equities in the Indonesia & US lenses.'
      ),

      /* commodity strip */
      h('div', { style: { marginBottom: 18 } },
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
                ? h('div', { className: 'in-tile-spark' }, h(Spark, { data: item.spark, w: null, ht: 28, color: Number(item.change_pct) >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' }))
                : null
            );
          })
        )
      ),

      /* US macro indicators (US lens only) */
      usMacroItems.length > 0 && h('div', { style: { marginBottom: 18 } },
        h('div', { className: 'in-panel-h', style: { marginBottom: 8 } },
          h('div', { className: 'in-panel-title' }, 'US Macro Indicators'),
          h('div', { className: 'in-panel-tag' }, 'rates · inflation · risk')
        ),
        h('div', { className: 'in-grid in-grid-5', style: { gap: 8 } },
          usMacroItems.map(item =>
            h('div', { key: item.key, className: 'in-tile', onClick: () => setCommodityModal(item) },
              h('div', { className: 'in-tile-lbl' }, item.label),
              h('div', { className: 'in-tile-val' }, fmt.val(item.latest_value, item.unit)),
              h('div', { className: 'in-tile-chg ' + fmt.cls(item.change_pct) }, fmt.pct(item.change_pct)),
              item.spark && item.spark.length > 1
                ? h('div', { className: 'in-tile-spark' }, h(Spark, { data: item.spark, w: null, ht: 28, color: Number(item.change_pct) >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' }))
                : null
            )
          )
        )
      ),

      /* US live sector grid (single-name coverage from equity_screen_global) */
      region === 'us' && h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'US Sectors — Live' + (usRows ? ' (' + usRows.length + ' large-caps)' : '')),
          h('div', { className: 'in-panel-tag' }, 'cap-weighted 1D · sorted by performance')
        ),
        usRows === null
          ? h('div', { className: 'in-muted', style: { padding: '10px 2px', fontSize: 12 } }, 'Loading US coverage…')
          : usSectors.length === 0
            ? h('div', { className: 'in-muted', style: { padding: '10px 2px', fontSize: 12 } }, 'US coverage unavailable.')
            : h('div', { className: 'in-grid in-grid-3', style: { gap: 10 } },
                usSectors.map(s => h('div', { key: s.sector, className: 'in-tile', style: { textAlign: 'left', padding: '11px 13px' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 } },
                    h('div', { style: { fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' } }, s.sector),
                    h('span', { className: fmt.cls(s.wChg), style: { fontFamily: 'var(--font-mono)', fontWeight: 600 } }, fmt.pct(s.wChg))
                  ),
                  h('div', { className: 'in-muted', style: { fontSize: 10.5, marginTop: 5, fontFamily: 'var(--font-mono)' } },
                    s.n + ' names · PE ' + (s.medPE != null ? s.medPE.toFixed(1) : '—') + ' · β ' + (s.avgBeta != null ? s.avgBeta.toFixed(2) : '—')),
                  h('div', { className: 'in-muted', style: { fontSize: 10.5, marginTop: 3 } }, s.top.join(' · '))
                ))
              )
      ),

      /* commodity-driven industries view */
      h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('div', { className: 'in-panel-title' }, 'Commodity-Driven Industries — Driver Postures'),
          h('div', { className: 'in-panel-tag' }, 'based on live commodity moves')
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          COMMODITY_INDUSTRIES.map(ci => {
            // Calculate postures for this commodity-industry's drivers
            const indEntry = TAXONOMY.find(t => t.id === ci.id);
            if (!indEntry) return null;
            const postures = (indEntry.drivers || []).map(d => {
              const live = indByKey[d.key];
              if (!live) return { driver: d, found: false, posture: 'n/a', chg: null };
              let chg = live.change_pct != null ? Number(live.change_pct) : null;
              if (chg == null) {
                const lv = Number(live.latest_value), pv = Number(live.prev_value);
                if (!isNaN(lv) && !isNaN(pv) && pv !== 0) chg = ((lv - pv) / Math.abs(pv)) * 100;
              }
              let posture = 'neutral';
              if (chg != null && Math.abs(chg) > 0.2) {
                if (d.upIs === 'tailwind') posture = chg > 0 ? 'tailwind' : 'headwind';
                else if (d.upIs === 'headwind') posture = chg > 0 ? 'headwind' : 'tailwind';
                else posture = 'mixed';
              }
              return { driver: d, found: true, posture, chg, value: live.latest_value, unit: live.unit, label: live.label || d.label };
            });

            const tailCount = postures.filter(p => p.posture === 'tailwind').length;
            const headCount = postures.filter(p => p.posture === 'headwind').length;
            const netPosture = tailCount > headCount ? 'tailwind' : headCount > tailCount ? 'headwind' : 'mixed';
            const netCls = netPosture === 'tailwind' ? 'tail' : netPosture === 'headwind' ? 'head' : 'mix';

            return h('div', { key: ci.id, style: { padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                h('div', { style: { fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' } }, ci.label),
                h('span', { className: 'in-chip ' + netCls, style: { fontSize: 9 } }, netPosture === 'tailwind' ? 'Net Tailwind' : netPosture === 'headwind' ? 'Net Headwind' : 'Mixed'),
                h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 'auto' } },
                  tailCount + 'T / ' + headCount + 'H · ' + postures.filter(p => p.found).length + ' drivers live')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                postures.filter(p => p.found).map(p =>
                  h('div', { key: p.driver.key, style: { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-1)', borderRadius: 3, padding: '3px 8px', border: '1px solid rgba(255,255,255,0.04)' } },
                    h('span', { style: { fontSize: 11, color: 'var(--text-secondary)' } }, p.label || p.driver.label),
                    h('span', { className: 'in-chip ' + (p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix'), style: { fontSize: 8, padding: '1px 4px' } },
                      p.posture === 'tailwind' ? 'T/W' : p.posture === 'headwind' ? 'H/W' : 'Mix'),
                    p.chg != null
                      ? h('span', { className: (p.chg > 0 ? 'in-pos' : p.chg < 0 ? 'in-neg' : 'in-muted') + ' in-num', style: { fontFamily: 'var(--font-mono)', fontSize: 10 } },
                          (p.chg > 0 ? '+' : '') + p.chg.toFixed(1) + '%')
                      : null
                  )
                )
              )
            );
          })
        )
      )
    );
  }

  function Landing({ equity, indicators, region, onSelectSector }) {
    const [commodityModal, setCommodityModal] = useState(null);
    const [sortBy, setSortBy] = useState('fav');
    const [metricsMap, setMetricsMap] = useState({});

    const indByKey = useMemo(() => {
      const m = {};
      indicators.forEach(i => { m[i.key] = i; });
      return m;
    }, [indicators]);

    const cycleData = useMemo(() => {
      if (!Object.keys(indByKey).length) return null;
      return an.cyclePhase(indByKey);
    }, [indByKey]);

    // FIXED: real region filter — 'id' shows only id-region taxonomy entries;
    // non-'id' regions show the GlobalDriverLens component (no empty IDX cards)
    const filteredTaxonomy = useMemo(() =>
      TAXONOMY.filter(ind => ind.region === 'id'),
      []
    );

    // Stable metrics callback
    const handleMetrics = useCallback((id, m) => {
      setMetricsMap(prev => {
        const cur = prev[id];
        if (cur && cur.fav === m.fav && cur.conviction === m.conviction && cur.rs === m.rs && cur.chg1d === m.chg1d && cur.mcap === m.mcap) return prev;
        return { ...prev, [id]: m };
      });
    }, []);

    // Sort the taxonomy according to sortBy (desc; nulls last)
    const sortedTaxonomy = useMemo(() => {
      const get = (ind) => {
        const m = metricsMap[ind.id];
        if (!m) return null;
        if (sortBy === 'fav')        return m.fav;
        if (sortBy === 'conviction') return m.conviction;
        if (sortBy === 'rs')         return m.rs;
        if (sortBy === 'chg1d')      return m.chg1d;
        if (sortBy === 'mcap')       return m.mcap;
        return null;
      };
      return filteredTaxonomy.slice().sort((a, b) => {
        const va = get(a), vb = get(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return vb - va; // descending
      });
    }, [filteredTaxonomy, metricsMap, sortBy]);

    // Global/US lens: show commodity + driver view, not sector grid
    if (region !== 'id') {
      return h('div', null,
        commodityModal && h(CommodityModal, { item: commodityModal, onClose: () => setCommodityModal(null) }),
        h(GlobalDriverLens, { indicators, region, setCommodityModal })
      );
    }

    return h('div', { className: 'in-work' },
      commodityModal && h(CommodityModal, { item: commodityModal, onClose: () => setCommodityModal(null) }),

      /* cycle banner — graceful "Insufficient data" render */
      cycleData && h('div', { className: 'in-cycle', style: { marginBottom: 14 } },
        h('div', { className: 'in-cycle-phase', style: { color: cycleData.phase === 'Insufficient data' ? 'var(--text-tertiary)' : 'var(--in)' } }, cycleData.phase),
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
            : null,
          cycleData.confidence && cycleData.confidence !== 'none'
            ? h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 4 } },
                cycleData.votes + '/' + cycleData.totalVotes + ' signals · ' + cycleData.confidence + ' confidence')
            : null
        ),
        h('div', { style: { textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' } },
          cycleData.infl != null ? h('div', null, 'CPI ' + fmt.num(cycleData.infl, 1) + '%') : null,
          cycleData.biRate != null ? h('div', null, 'BI Rate ' + fmt.num(cycleData.biRate, 2) + '%') : null,
          cycleData.rateRising != null ? h('div', null, cycleData.rateRising ? 'Rates Rising' : 'Rates Stable') : null
        )
      ),

      /* movement alerts — uses .in-alert class */
      h(MovementAlerts, { indicators, indByKey }),

      /* top opportunities strip — leaders / laggards at a glance */
      h(TopOpportunities, { metricsMap, taxonomy: filteredTaxonomy, onSelectSector, cycleData }),

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
                ? h('div', { className: 'in-tile-spark' }, h(Spark, { data: item.spark, w: null, ht: 28, color: Number(item.change_pct) >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' }))
                : null
            );
          })
        )
      ),

      /* sector grid */
      h('div', { style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h', style: { marginBottom: 8 } },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            h('div', { className: 'in-panel-title' }, 'Sector Grid'),
            h('div', { className: 'in-panel-tag' }, sortedTaxonomy.length + ' sectors · click to drill in')
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
            h('span', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Sort'),
            h('div', { className: 'in-seg' },
              SORT_OPTIONS.map(opt =>
                h('button', {
                  key: opt.id,
                  className: sortBy === opt.id ? 'on' : '',
                  onClick: () => setSortBy(opt.id),
                  style: { fontSize: 10 }
                }, opt.label)
              )
            )
          )
        ),
        h('div', { className: 'in-grid in-grid-3', style: { gap: 10 } },
          sortedTaxonomy.map(ind =>
            h(SortableSectorCard, {
              key: ind.id,
              ind,
              equity,
              indByKey,
              cycleData,
              onMetrics: handleMetrics,
              onClick: () => onSelectSector(ind)
            })
          )
        )
      ),

      /* news — live feed, no sectorId on landing (general feed) */
      h(NewsPanel, { sectorId: null })
    );
  }

  /* =====================================================================
     HEADER — distinct icons per region + terminal mark
     ===================================================================== */
  function Header({ region, onRegion }) {
    return h('div', { className: 'in-head' },
      h('div', { className: 'in-head-mark' },
        /* Industry terminal mark: landscape/grid icon (4 rects) */
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
    const [reloadKey, setReloadKey] = useState(0);
    const [toast, push] = useToast();

    // Keyboard shortcuts: 1/2/3 → workspace tabs (if openTab available),
    // I → Indonesia, G → Global, U → US, Esc → back to landing
    useEffect(() => {
      const handler = (e) => {
        // Skip if user is in an input/textarea
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
        if (e.key === 'Escape' && selectedSector) {
          setSelectedSector(null);
        } else if (e.key === 'i' || e.key === 'I') {
          setRegion('id'); setSelectedSector(null);
        } else if (e.key === 'g' || e.key === 'G') {
          setRegion('global'); setSelectedSector(null);
        } else if (e.key === 'u' || e.key === 'U') {
          setRegion('us'); setSelectedSector(null);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [selectedSector]);

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
    }, [reloadKey]);

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
              h('div', { className: 'in-error-banner', style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 } },
                h('div', null, error),
                h('button', {
                  className: 'in-btn',
                  onClick: () => setReloadKey(k => k + 1),
                  style: { marginTop: 4 }
                }, 'Retry')
              )
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
