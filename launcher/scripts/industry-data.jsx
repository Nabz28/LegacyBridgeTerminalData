/* =========================================================================
   INDUSTRY DATA (W3) — Demand / Supply Driver intelligence layer.
   The most important feature of T3 — understanding what drives each sector.

   Sections:
     1. Industry Selector   — pick sector, see region/thesis note
     2. Driver Matrix       — demand vs supply vs macro groups; posture cards
                              + net tilt gauge headline
     3. Driver Detail Modal — historical chart (spark or obs), metadata,
                              cross-industry impact
     4. Cross-Map           — commodity/macro → industry(tailwind/headwind) matrix
     5. Business-Cycle strip — current phase + favored industries

   Contracts:
     window.INDUSTRY  — .indicators(), .obs(), .TAXONOMY, .fmt, .an
     window.IND       — { h, Spark, Spinner, Empty, useToast, Modal, fmt }

   All classes: in-* (industry.css). Vanilla Babel-in-browser React, no imports.
   Exposes: window.IndDataWorkspace
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const h = React.createElement;

  /* ---------- shared refs ---------------------------------------------- */
  const INDUSTRY = () => window.INDUSTRY;
  const IND      = () => window.IND;

  /* =========================================================================
     POSTURE ONE-LINER
     Plain-language sentence describing a driver's current posture.
     ========================================================================= */
  function postureOneLiner(p) {
    if (!p.found) return 'Data not yet available for this driver.';
    const chgFmt = p.chg != null ? (p.chg > 0 ? '+' : '') + p.chg.toFixed(1) + '%' : '—';
    const dir = p.chg != null ? (p.chg > 0 ? 'rising' : 'falling') : 'flat';
    if (p.posture === 'tailwind') return `${p.label} ${chgFmt} w/w — rising price is a tailwind.`;
    if (p.posture === 'headwind') return `${p.label} ${chgFmt} w/w — ${dir} is a headwind.`;
    if (p.posture === 'mixed')    return `${p.label} ${chgFmt} w/w — mixed impact on this sector.`;
    return `${p.label} — negligible move (${chgFmt}), posture neutral.`;
  }

  /* =========================================================================
     NET TILT GAUGE — visual bar showing tail vs head count
     ========================================================================= */
  function TiltGauge({ tail, head, net }) {
    const total  = (tail + head) || 1;
    const tailPct = Math.round((tail / total) * 100);
    const headPct = Math.round((head / total) * 100);
    const netLabel = net > 0.15 ? 'NET TAILWIND' : net < -0.15 ? 'NET HEADWIND' : 'BALANCED';
    const netCls   = net > 0.15 ? 'in-pos' : net < -0.15 ? 'in-neg' : 'in-muted';
    return h('div', { style: { marginBottom: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
        h('span', { className: 'in-panel-title', style: { fontSize: 14 } }, 'Driver Tilt'),
        h('span', { className: netCls, style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' } }, netLabel),
        h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11 } },
          tail + ' tailwind · ' + head + ' headwind')
      ),
      h('div', { style: { display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-3,#17171b)', gap: 1 } },
        tailPct > 0 && h('div', { style: { width: tailPct + '%', background: 'var(--pos,#19c37d)', transition: 'width 0.4s' } }),
        headPct > 0 && h('div', { style: { width: headPct + '%', background: 'var(--neg,#ff5c70)', transition: 'width 0.4s' } })
      )
    );
  }

  /* =========================================================================
     DRIVER CARD — single posture card in the matrix
     ========================================================================= */
  function DriverCard({ posture: p, driver, onClick }) {
    const IND_ = IND();
    const Spark = IND_.Spark;
    const fmt  = INDUSTRY().fmt;
    const cls  = p.found ? p.posture : 'neutral';   // tail | head | mixed | neutral
    const chgCls = p.chg != null ? (p.chg > 0 ? 'in-pos' : p.chg < 0 ? 'in-neg' : 'in-muted') : 'in-muted';
    const kindLabel = driver.kind === 'demand' ? 'DEMAND' : driver.kind === 'supply' ? 'SUPPLY' : 'MACRO';
    const postureLabel = p.posture === 'tailwind' ? 'TAILWIND' : p.posture === 'headwind' ? 'HEADWIND' : p.posture === 'mixed' ? 'MIXED' : 'NEUTRAL';
    const postureChipCls = p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix';
    const sparkPts = p.spark ? (Array.isArray(p.spark) ? p.spark : []) : [];

    return h('div', {
      className: 'in-driver ' + cls,
      onClick: () => onClick && onClick(p, driver),
    },
      /* label row: driver name + posture chip */
      h('div', { className: 'in-driver-lbl' },
        h('span', null, driver.label),
        h('span', { className: 'in-chip ' + postureChipCls, style: { fontSize: 9, padding: '1px 5px', flexShrink: 0 } }, postureLabel)
      ),
      /* prominent value */
      h('div', { className: 'in-driver-val in-num' }, p.found ? fmt.val(p.value, p.unit) : '—'),
      /* meta: pct change + kind pill */
      h('div', { className: 'in-driver-meta' },
        h('span', { className: chgCls + ' in-num', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11.5, fontWeight: 700 } },
          p.chg != null ? (p.chg > 0 ? '+' : '') + p.chg.toFixed(1) + '%' : '—'),
        h('span', { className: 'in-kind' }, kindLabel)
      ),
      /* sparkline with baseline feel */
      sparkPts.length >= 2 && h('div', { className: 'in-driver-spark' },
        h(Spark, { data: sparkPts, w: null, ht: 26,
          color: p.posture === 'tailwind' ? 'var(--pos,#19c37d)' : p.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)' })
      ),
      /* one-liner explanation */
      h('div', { className: 'in-driver-hint' }, postureOneLiner(p))
    );
  }

  /* =========================================================================
     DRIVER DETAIL MODAL — larger historical chart + metadata
     ========================================================================= */
  function DriverDetailModal({ posture: p, driver, ind, indByKey, onClose }) {
    const IND_ = IND();
    const { Spark, Spinner, Empty, Modal: ModalComp } = IND_;
    const fmt = INDUSTRY().fmt;
    const [obsData, setObsData] = useState(null);  // null=loading, []= empty, rows=data
    const [obsErr,  setObsErr]  = useState(null);

    // Try to load obs using the driver key as a pseudo-RIC; fall back to spark
    useEffect(() => {
      setObsData(null); setObsErr(null);
      INDUSTRY().obs(driver.key, 260)
        .then(rows => setObsData(Array.isArray(rows) ? rows : []))
        .catch(() => setObsData([]));
    }, [driver.key]);

    // Build chart data: prefer obs (chronological), fall back to spark
    const chartPts = useMemo(() => {
      if (obsData && obsData.length >= 4) {
        return [...obsData].sort((a, b) => a.date < b.date ? -1 : 1).map(r => ({ d: r.date, v: Number(r.value) }));
      }
      const sp = p.spark;
      if (Array.isArray(sp) && sp.length >= 2) return sp;
      return [];
    }, [obsData, p.spark]);

    const isLoading = obsData === null;
    const noData    = !isLoading && chartPts.length < 2;

    // Find all industries that share this driver key
    const impactedInds = useMemo(() => {
      return INDUSTRY().TAXONOMY.filter(t =>
        (t.drivers || []).some(d => d.key === driver.key)
      ).map(t => {
        const dd = t.drivers.find(d => d.key === driver.key);
        return { id: t.id, name: t.name, upIs: dd.upIs };
      });
    }, [driver.key]);

    const postureChipCls = p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix';
    const chgCls = p.chg != null ? (p.chg > 0 ? 'in-pos' : p.chg < 0 ? 'in-neg' : 'in-muted') : 'in-muted';

    return h(ModalComp, { title: driver.label + ' — Driver Detail', onClose, wide: true },
      // top stat row
      h('div', { style: { display: 'flex', gap: 24, marginBottom: 18, flexWrap: 'wrap' } },
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'LATEST'),
          h('div', { className: 'in-driver-val in-num', style: { fontSize: 20 } },
            p.found ? fmt.val(p.value, p.unit) : '—')
        ),
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'W/W CHANGE'),
          h('div', { className: chgCls + ' in-num', style: { fontSize: 18, fontFamily: 'var(--font-mono,monospace)', fontWeight: 700 } },
            p.chg != null ? (p.chg > 0 ? '+' : '') + p.chg.toFixed(2) + '%' : '—')
        ),
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'POSTURE FOR THIS SECTOR'),
          h('span', { className: 'in-chip ' + postureChipCls, style: { fontSize: 11, padding: '4px 10px' } },
            p.posture.toUpperCase())
        ),
        p.tv && h('div', { style: { display: 'flex', alignItems: 'flex-end' } },
          h('a', {
            href: 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(p.tv),
            target: '_blank', rel: 'noopener noreferrer',
            className: 'in-btn in-btn-ghost',
            style: { textDecoration: 'none', fontSize: 11, padding: '5px 10px' }
          }, 'TradingView ↗')
        )
      ),

      // chart section
      h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Historical Series'),
          obsData && obsData.length > 0 &&
            h('span', { className: 'in-panel-tag' }, obsData.length + ' observations from DB')
        ),
        isLoading && h(Spinner, { label: 'Loading history…' }),
        !isLoading && noData && h('div', { style: { padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', fontSize: 12 } },
          'History pending — series not yet in observations table. Live snapshot only.'
        ),
        !isLoading && !noData && h('div', { style: { padding: '10px 0 4px' } },
          h(LargeSparkLine, { pts: chartPts, posture: p.posture })
        )
      ),

      // one-liner explanation
      h('div', { className: 'in-concl', style: { marginBottom: 16 } },
        h('b', null, driver.label + ': '),
        postureOneLiner(p),
        ' upIs=', driver.upIs, '.'
      ),

      // cross-industry impact
      h('div', { className: 'in-panel' },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Cross-Industry Impact'),
          h('span', { className: 'in-panel-tag' }, impactedInds.length + ' sectors')
        ),
        impactedInds.length === 0 && h('div', { className: 'in-muted', style: { fontSize: 12 } }, 'No other sectors mapped to this driver.'),
        impactedInds.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          impactedInds.map(ti =>
            h('div', { key: ti.id, style: { background: 'var(--bg-2,#111114)', border: '1px solid var(--border-subtle,rgba(255,255,255,0.05))', borderRadius: 3, padding: '5px 10px', display: 'flex', gap: 8, alignItems: 'center' } },
              h('span', { style: { fontSize: 12, color: 'var(--text-secondary,#d4dcea)' } }, ti.name),
              h('span', { className: 'in-chip ' + (ti.upIs === 'tailwind' ? 'tail' : ti.upIs === 'headwind' ? 'head' : 'mix'), style: { fontSize: 9 } },
                ti.upIs.toUpperCase())
            )
          )
        )
      )
    );
  }

  /* =========================================================================
     LARGE SPARKLINE for detail modal (SVG, responsive width)
     ========================================================================= */
  function LargeSparkLine({ pts, posture }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(560);
    useEffect(() => {
      if (!containerRef.current) return;
      const obs = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect?.width;
        if (w > 0) setWidth(Math.floor(w));
      });
      obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, []);

    const values = pts.map(p => (typeof p === 'object' ? (p.v != null ? p.v : p.value) : p)).filter(v => v != null && !isNaN(v));
    if (values.length < 2) return null;

    const W = width, H = 120;
    const min = Math.min(...values), max = Math.max(...values), rng = (max - min) || 1;
    const color = posture === 'tailwind' ? '#19c37d' : posture === 'headwind' ? '#ff5c70' : '#f5a623';
    const d = values.map((v, i) => (i / (values.length - 1) * W).toFixed(1) + ',' + (H - ((v - min) / rng) * (H - 8) - 4).toFixed(1)).join(' ');

    return h('div', { ref: containerRef, style: { width: '100%' } },
      h('svg', { width: W, height: H, style: { display: 'block', width: '100%' } },
        h('polyline', { points: d, fill: 'none', stroke: color, strokeWidth: 1.8 }),
        // min/max labels
        h('text', { x: 4, y: H - 4, fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, min.toLocaleString('en-US', { maximumFractionDigits: 2 })),
        h('text', { x: 4, y: 12, fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, max.toLocaleString('en-US', { maximumFractionDigits: 2 })),
        // first & last date labels
        pts[0]?.d && h('text', { x: 4, y: H - 14, fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, String(pts[0].d).slice(0, 7)),
        pts[pts.length - 1]?.d && h('text', { x: W - 4, y: H - 14, textAnchor: 'end', fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, String(pts[pts.length - 1].d).slice(0, 7))
      )
    );
  }

  /* =========================================================================
     DRIVER GROUP SECTION — renders a labelled group of driver cards
     ========================================================================= */
  function DriverGroup({ title, drivers, postures, accent, onCardClick }) {
    if (!drivers || drivers.length === 0) return null;
    const colorMap = { DEMAND: 'var(--pos,#19c37d)', SUPPLY: 'var(--neg,#ff5c70)', MACRO: 'var(--in,#f5a623)' };
    const accentColor = colorMap[title] || 'var(--in,#f5a623)';
    return h('div', { style: { marginBottom: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
        h('div', { style: { width: 3, height: 14, borderRadius: 1, background: accentColor, flexShrink: 0 } }),
        h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: accentColor } }, title + ' DRIVERS'),
        h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10 } }, '· ' + drivers.length)
      ),
      h('div', { className: 'in-grid in-grid-3', style: { gap: 8 } },
        drivers.map(d => {
          const p = postures.find(p => p.driver.key === d.key) || { driver: d, found: false, posture: 'neutral', chg: null, value: null };
          return h(DriverCard, { key: d.key, posture: p, driver: d, onClick: onCardClick });
        })
      )
    );
  }

  /* =========================================================================
     CROSS-MAP — commodity/macro driver → which industries it feeds
     ========================================================================= */
  function CrossMap({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const fmt = INDUSTRY_.fmt;
    const TAXONOMY = INDUSTRY_.TAXONOMY;

    // Build map: driverKey → { label, industries: [{name, upIs, posture}] }
    const driverMap = useMemo(() => {
      const map = {};
      TAXONOMY.forEach(t => {
        (t.drivers || []).forEach(d => {
          if (!map[d.key]) map[d.key] = { key: d.key, label: d.label, entries: [] };
          const ind = indByKey[d.key];
          const chg = ind ? Number(ind.change_pct) : null;
          let posture = 'neutral';
          if (chg != null && Math.abs(chg) > 0.2) {
            const rising = chg > 0;
            if (d.upIs === 'tailwind') posture = rising ? 'tailwind' : 'headwind';
            else if (d.upIs === 'headwind') posture = rising ? 'headwind' : 'tailwind';
            else posture = 'mixed';
          }
          map[d.key].entries.push({ indName: t.name, indId: t.id, upIs: d.upIs, posture });
        });
      });
      // sort by driver label
      return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
    }, [TAXONOMY, indByKey]);

    return h('div', { className: 'in-panel', style: { marginBottom: 20 } },
      h('div', { className: 'in-panel-h' },
        h('span', { className: 'in-panel-title' }, 'Cross-Industry Driver Map'),
        h('span', { className: 'in-panel-tag' }, driverMap.length + ' drivers · ' + TAXONOMY.length + ' sectors')
      ),
      h('div', { className: 'in-tablewrap' },
        h('table', { className: 'in-table' },
          h('thead', null,
            h('tr', null,
              h('th', null, 'Driver'),
              h('th', { className: 'r' }, 'Value'),
              h('th', { className: 'r' }, 'W/W'),
              h('th', null, 'Sectors impacted')
            )
          ),
          h('tbody', null,
            driverMap.map(dm => {
              const live = indByKey[dm.key];
              const chg  = live ? Number(live.change_pct) : null;
              const chgCls = chg != null ? (chg > 0 ? 'in-pos' : chg < 0 ? 'in-neg' : 'in-muted') : 'in-muted';
              return h('tr', { key: dm.key },
                h('td', null, h('span', { style: { color: 'var(--text-secondary,#d4dcea)', fontSize: 12 } }, dm.label)),
                h('td', { className: 'r in-num' }, live ? fmt.val(live.latest_value, live.unit) : '—'),
                h('td', { className: 'r in-num ' + chgCls },
                  chg != null ? (chg > 0 ? '+' : '') + chg.toFixed(1) + '%' : '—'),
                h('td', null,
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                    dm.entries.map(e =>
                      h('span', {
                        key: e.indId,
                        title: e.upIs,
                        style: {
                          fontSize: 10, padding: '1px 6px', borderRadius: 3,
                          background: e.posture === 'tailwind' ? 'rgba(25,195,125,0.12)' : e.posture === 'headwind' ? 'rgba(255,92,112,0.12)' : 'var(--bg-3,#17171b)',
                          color: e.posture === 'tailwind' ? 'var(--pos,#19c37d)' : e.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--text-tertiary,#8e9ab0)',
                          fontFamily: 'var(--font-mono,monospace)'
                        }
                      }, e.indName)
                    )
                  )
                )
              );
            })
          )
        )
      )
    );
  }

  /* =========================================================================
     BUSINESS CYCLE STRIP
     ========================================================================= */
  function CycleStrip({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const cycle = useMemo(() => INDUSTRY_.an.cyclePhase(indByKey), [indByKey]);
    if (!cycle) return null;

    const phaseColor = {
      'Expansion': 'var(--pos,#19c37d)',
      'Expansion (late)': 'var(--in,#f5a623)',
      'Slowdown': 'var(--neg,#ff5c70)',
      'Recovery': '#7fb6ff',
    };
    const color = phaseColor[cycle.phase] || 'var(--in,#f5a623)';
    const TAXONOMY = INDUSTRY_.TAXONOMY;

    return h('div', { className: 'in-cycle', style: { marginBottom: 20 } },
      h('div', { style: { flexShrink: 0 } },
        h('div', { className: 'in-panel-tag' }, 'BUSINESS CYCLE'),
        h('div', { className: 'in-cycle-phase', style: { color } }, cycle.phase)
      ),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: 12, color: 'var(--text-secondary,#d4dcea)', marginBottom: 6, lineHeight: 1.45 } }, cycle.note),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
          h('span', { className: 'in-panel-tag', style: { marginRight: 2 } }, 'FAVORED:'),
          cycle.favored.map(fav => {
            const t = TAXONOMY.find(t => t.id === fav);
            return h('span', { key: fav,
              style: { fontSize: 10.5, padding: '2px 8px', borderRadius: 3, background: 'rgba(25,195,125,0.12)', color: 'var(--pos,#19c37d)', fontFamily: 'var(--font-mono,monospace)', fontWeight: 600 } },
              t ? t.name : fav);
          })
        )
      ),
      h('div', { style: { flexShrink: 0, textAlign: 'right' } },
        cycle.infl != null && h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono,monospace)', color: 'var(--text-tertiary,#8e9ab0)' } },
          'CPI: ', h('span', { className: cycle.infl > 4 ? 'in-neg' : 'in-pos' }, cycle.infl.toFixed(1) + '%')
        ),
        cycle.growth != null && h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono,monospace)', color: 'var(--text-tertiary,#8e9ab0)', marginTop: 2 } },
          'GDP: ', h('span', { className: cycle.growth < 4.5 ? 'in-warn' : 'in-pos' }, cycle.growth.toFixed(1))
        )
      )
    );
  }

  /* =========================================================================
     INDUSTRY SELECTOR HEADER
     ========================================================================= */
  function IndustrySelector({ selectedId, onChange }) {
    const INDUSTRY_ = INDUSTRY();
    const TAXONOMY  = INDUSTRY_.TAXONOMY;
    const selected  = TAXONOMY.find(t => t.id === selectedId) || TAXONOMY[0];

    return h('div', { style: { marginBottom: 18 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' } },
        h('label', { className: 'in-pick-lbl' }, 'INDUSTRY'),
        h('select', {
          className: 'in-select',
          value: selectedId,
          onChange: e => onChange(e.target.value),
          style: { minWidth: 200 }
        },
          TAXONOMY.map(t => h('option', { key: t.id, value: t.id }, t.name))
        ),
        selected && h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5 } },
          'IDX Sector: ' + selected.idxSector
        )
      ),
      selected && selected.thesis && h('div', { style: { fontSize: 12, color: 'var(--text-tertiary,#8e9ab0)', lineHeight: 1.5, maxWidth: 860, background: 'var(--in-softer,rgba(245,166,35,0.06))', border: '1px solid var(--in-edge,rgba(245,166,35,0.34))', borderRadius: 3, padding: '8px 12px' } },
        h('span', { style: { color: 'var(--in,#f5a623)', fontWeight: 600, marginRight: 6 } }, 'Thesis:'),
        selected.thesis
      )
    );
  }

  /* =========================================================================
     MAIN WORKSPACE: IndDataWorkspace
     ========================================================================= */
  function IndDataWorkspace({ openTab }) {
    const INDUSTRY_ = INDUSTRY();
    const IND_      = IND();
    const { Spinner, Empty } = IND_;
    const [toastNode] = IND_.useToast ? IND_.useToast() : [null];

    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);
    const [indics,  setIndics]      = useState([]);
    const [selectedId, setSelectedId] = useState('coal');
    const [detailState, setDetailState] = useState(null); // { posture, driver }

    // Load live_indicators once
    useEffect(() => {
      setLoading(true);
      INDUSTRY_.indicators()
        .then(rows => { setIndics(Array.isArray(rows) ? rows : []); setLoading(false); })
        .catch(err => { setError(String(err)); setLoading(false); });
    }, []);

    // Build indByKey lookup
    const indByKey = useMemo(() => {
      const m = {};
      (indics || []).forEach(r => { if (r.key) m[r.key] = r; });
      return m;
    }, [indics]);

    const TAXONOMY = INDUSTRY_.TAXONOMY;
    const ind      = useMemo(() => TAXONOMY.find(t => t.id === selectedId) || TAXONOMY[0], [selectedId, TAXONOMY]);

    // Split drivers into demand / supply / macro groups
    const demandDrivers = useMemo(() => (ind.drivers || []).filter(d => d.kind === 'demand'), [ind]);
    const supplyDrivers = useMemo(() => (ind.drivers || []).filter(d => d.kind === 'supply'), [ind]);
    const macroDrivers  = useMemo(() => (ind.drivers || []).filter(d => d.kind === 'macro'),  [ind]);

    // Compute postures for all drivers of this industry
    const allPostures = useMemo(() => {
      return (ind.drivers || []).map(d => INDUSTRY_.an.posture(d, indByKey));
    }, [ind, indByKey]);

    // Net tilt
    const tilt = useMemo(() => INDUSTRY_.an.driverTilt(ind, indByKey), [ind, indByKey]);

    const handleCardClick = useCallback((p, driver) => {
      setDetailState({ posture: p, driver });
    }, []);

    if (loading) return h('div', { className: 'in-root' }, h('div', { className: 'in-work' }, h(Spinner, { label: 'Loading driver data…' })));
    if (error)   return h('div', { className: 'in-root' }, h('div', { className: 'in-work' }, h(Empty, { title: 'Failed to load indicators', sub: error })));

    return h('div', { className: 'in-root' },
      // ---- page header ----
      h('div', { className: 'in-head' },
        h('div', { className: 'in-head-mark' },
          h('svg', { viewBox: '0 0 15 15', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
            h('path', { d: 'M7.5 1.5v12M1.5 7.5h12M3.5 3.5l8 8M11.5 3.5l-8 8' }))
        ),
        h('div', null,
          h('div', { className: 'in-head-title' }, 'Industry Data'),
          h('div', { className: 'in-head-sub' }, 'Demand / Supply Drivers')
        ),
        h('div', { className: 'in-head-spacer' }),
        h('div', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5 } },
          indics.length + ' indicators loaded')
      ),

      // ---- scrollable body ----
      h('div', { className: 'in-work', style: { padding: '18px 22px 50px' } },

        // 1. Industry selector
        h(IndustrySelector, { selectedId, onChange: setSelectedId }),

        // 2. Net tilt gauge
        h(TiltGauge, { tail: tilt.tail, head: tilt.head, net: tilt.net }),

        // 3. Demand / Supply / Macro driver groups (the centerpiece) — full-width stacked rows
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 } },
          // Demand row — full width
          h(DriverGroup, {
            title: 'DEMAND',
            drivers: demandDrivers.length > 0 ? demandDrivers : (macroDrivers.length === 0 ? ind.drivers : []),
            postures: allPostures,
            onCardClick: handleCardClick
          }),
          // Supply row — full width
          h(DriverGroup, {
            title: 'SUPPLY',
            drivers: supplyDrivers,
            postures: allPostures,
            onCardClick: handleCardClick
          }),
          // Macro row — full width
          macroDrivers.length > 0 && h(DriverGroup, {
            title: 'MACRO',
            drivers: macroDrivers,
            postures: allPostures,
            onCardClick: handleCardClick
          }),
          // If demand/supply/macro are all absent
          demandDrivers.length === 0 && supplyDrivers.length === 0 && macroDrivers.length === 0 && h('div', { className: 'in-muted', style: { fontSize: 12, padding: 12 } },
            'No demand, supply, or macro drivers mapped for this sector.')
        ),

        // No drivers at all
        ind.drivers.length === 0 && h(Empty, { title: 'No drivers mapped', sub: 'This sector has no demand/supply drivers in TAXONOMY.' }),

        // 4. Business-Cycle strip
        h(CycleStrip, { indByKey }),

        // 5. Cross-Map
        h(CrossMap, { indByKey })
      ),

      // ---- driver detail modal ----
      detailState && h(DriverDetailModal, {
        key: detailState.driver.key,
        posture: detailState.posture,
        driver: detailState.driver,
        ind,
        indByKey,
        onClose: () => setDetailState(null)
      }),

      toastNode
    );
  }

  window.IndDataWorkspace = IndDataWorkspace;
})();
