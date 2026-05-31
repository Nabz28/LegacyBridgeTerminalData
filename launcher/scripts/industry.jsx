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

  /* ---- favorability score (ML-free blend, 0-100) ---- */
  // fav = conviction*0.5 + (50 + weightedNet*40)*0.3 + clamp(50 + rs*3, 0, 100)*0.2
  const clampFav = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const calcFav = (conviction, tilt, rs) => {
    const driverComp = 50 + (tilt && tilt.weightedNet != null ? tilt.weightedNet * 40 : 0);
    const rsComp     = rs != null ? clampFav(50 + rs * 3, 0, 100) : 50;
    return Math.round(clampFav(conviction * 0.5 + driverComp * 0.3 + rsComp * 0.2, 0, 100));
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
    const conviction = useMemo(() => an.conviction(snap), [snap]);
    const status = useMemo(() => an.status(conviction, snap), [conviction, snap]);
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
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
        if (subSort === 'chg1d')   { const va = a.chg1d == null ? -Infinity : a.chg1d;   const vb = b.chg1d == null ? -Infinity : b.chg1d;   return vb - va; }
        if (subSort === 'breadth') { return b.breadth - a.breadth; }
        if (subSort === 'n')       { return b.n - a.n; }
        if (subSort === 'medPE')   { const va = a.medPE == null ? Infinity : a.medPE;    const vb = b.medPE == null ? Infinity : b.medPE;    return va - vb; }
        if (subSort === 'medROE')  { const va = a.medROE == null ? -Infinity : a.medROE; const vb = b.medROE == null ? -Infinity : b.medROE; return vb - va; }
        return 0;
      });
    }, [subIndustryData, subSort]);

    const chipCls = statusChipClass(status);

    const DriverCard = ({ p }) => {
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

    // Find the primary commodity driver for the proxy chart:
    // first supply driver with a spark, else first supply driver, else first driver with spark
    const primaryProxyPosture = useMemo(() => {
      const supplyWithSpark = postures.find(p => p.driver && p.driver.kind === 'supply' && p.spark && p.spark.length > 1);
      if (supplyWithSpark) return supplyWithSpark;
      const firstSupply = postures.find(p => p.driver && p.driver.kind === 'supply');
      if (firstSupply) return firstSupply;
      return postures.find(p => p.spark && p.spark.length > 1) || null;
    }, [postures]);

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
            h('div', { style: { fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 } }, 'Conviction'),
            h('div', { style: { fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: conviction >= 65 ? 'var(--pos)' : conviction <= 35 ? 'var(--neg)' : 'var(--text-primary)' } }, conviction + '/100')
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

      /* sector performance proxy chart panel */
      h('div', { className: 'in-chart-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-chart-header' },
          h('div', null,
            h('div', { className: 'in-chart-title' }, 'Sector Performance'),
            primaryProxyPosture
              ? h('div', { className: 'in-chart-subtitle' }, 'Proxy: ' + primaryProxyPosture.label + ' (' + primaryProxyPosture.driver.kind + ' driver)')
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
                  h('td', { className: 'r in-num ' + (sub.medROE > 0 ? 'in-pos' : sub.medROE < 0 ? 'in-neg' : '') }, fmt.pct(sub.medROE))
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
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
    const fav = useMemo(() => calcFav(conviction, tilt, rs), [conviction, tilt, rs]);

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
          rsBadge,
          h('span', { className: 'in-chip ' + chipCls }, statusLabel(status))
        )
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
     ===================================================================== */
  function MovementAlerts({ indicators, indByKey }) {
    const HIGH_THRESH = 10;
    const MED_THRESH  = 5;

    // Collect all driver keys referenced across TAXONOMY (deduplicated)
    const allDriverKeys = useMemo(() => {
      const seen = new Set();
      TAXONOMY.forEach(ind => (ind.drivers || []).forEach(d => seen.add(d.key)));
      return Array.from(seen);
    }, []);

    const bigAlerts = useMemo(() =>
      allDriverKeys
        .map(k => indByKey[k])
        .filter(Boolean)
        .filter(i => Math.abs(Number(i.change_pct)) >= HIGH_THRESH)
        .sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct))),
      [allDriverKeys, indByKey]
    );

    const medAlerts = useMemo(() =>
      allDriverKeys
        .map(k => indByKey[k])
        .filter(Boolean)
        .filter(i => { const abs = Math.abs(Number(i.change_pct)); return abs >= MED_THRESH && abs < HIGH_THRESH; })
        .sort((a, b) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct))),
      [allDriverKeys, indByKey]
    );

    if (!bigAlerts.length && !medAlerts.length) return null;

    return h('div', { className: 'in-banner', style: { flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginBottom: 12 } },
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
        h('div', { className: 'in-panel-tag' }, 'feed integration pending')
      ),
      h('div', { className: 'in-news-placeholder-note' },
        '⚠ Placeholder headlines — live news feed not yet wired.'
      ),
      NEWS_PLACEHOLDER.map((item, i) =>
        h('div', { key: i, className: 'in-news-item' },
          h('div', { className: 'in-news-title' }, item.title),
          h('div', { className: 'in-news-src' },
            item.src,
            h('span', { className: 'in-news-tag' }, item.tag)
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
    { id: 'conviction', label: 'Conviction' },
    { id: 'rs',         label: 'RS vs IHSG' },
    { id: 'chg1d',      label: '1D Chg' },
    { id: 'mcap',       label: 'Mcap' },
  ];

  // Wrapper to pre-compute all sort metrics for one sector then render SectorCard
  function SortableSectorCard({ ind, equity, indByKey, cycleData, onClick, onMetrics }) {
    const tickers = useMemo(() => an.tickersFor(ind, equity), [ind, equity]);
    const snap = useMemo(() => an.snapshot(tickers), [tickers]);
    const conviction = useMemo(() => an.conviction(snap), [snap]);
    const tilt = useMemo(() => an.driverTilt(ind, indByKey), [ind, indByKey]);
    const rs = useMemo(() => an.rsVsMarket(snap, indByKey), [snap, indByKey]);
    const fav = useMemo(() => calcFav(conviction, tilt, rs), [conviction, tilt, rs]);

    // Bubble metrics up to Landing so it can sort without re-computing
    useEffect(() => {
      if (onMetrics) onMetrics(ind.id, { fav, conviction, rs, chg1d: snap.mcapChg, mcap: snap.mcap });
    }, [ind.id, fav, conviction, rs, snap.mcapChg, snap.mcap]);

    return h(SectorCard, { ind, equity, indByKey, cycleData, onClick });
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

    const filteredTaxonomy = useMemo(() =>
      region === 'id' ? TAXONOMY : TAXONOMY.filter(ind => ind.region === region || ind.region === 'id'),
      [region]
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
                ? h('div', { className: 'in-tile-spark' }, h(Spark, { data: item.spark, w: null, ht: 28, color: item.change_pct >= 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)' }))
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
