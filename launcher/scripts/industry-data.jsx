/* =========================================================================
   INDUSTRY DATA (W3) — Demand / Supply Driver intelligence layer.
   The most important feature of T3 — understanding what drives each sector.

   Sections:
     0. This Week's Driver Moves  — top ~6 absolute movers across ALL taxonomy
                                    driver keys; at-a-glance digest strip
     1. Industry Selector         — pick sector, see region/thesis note
     2. Driver Matrix             — demand vs supply vs macro groups; posture cards
                                    + net tilt gauge headline (uses weightedNet)
     3. Driver Detail Modal       — real historical chart via INDUSTRY.obs(),
                                    graceful spark fallback, cross-industry impact,
                                    % off recent high stat
     4. Cross-Map                 — driver → industry matrix, grouped by kind
                                    (demand / supply / macro), live posture colour
     5. Business-Cycle strip      — current phase + favored industries

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

  /* ---------- safe number coercion ------------------------------------- */
  const safeNum = (v) => {
    if (v == null || v === '' || v === false) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  const fmtChg = (v, digits) => {
    const n = safeNum(v);
    if (n == null) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(digits != null ? digits : 1) + '%';
  };
  const chgCls = (v) => {
    const n = safeNum(v);
    if (n == null) return 'in-muted';
    return n > 0 ? 'in-pos' : n < 0 ? 'in-neg' : 'in-muted';
  };

  /* =========================================================================
     POSTURE ONE-LINER
     ========================================================================= */
  function postureOneLiner(p) {
    if (!p || !p.found) return 'Data not yet available for this driver.';
    const chgFmt = p.chg != null ? fmtChg(p.chg) : '—';
    const dir = p.chg != null ? (p.chg > 0 ? 'rising' : 'falling') : 'flat';
    if (p.posture === 'tailwind') return p.label + ' ' + chgFmt + ' w/w — ' + dir + ' price is a tailwind.';
    if (p.posture === 'headwind') return p.label + ' ' + chgFmt + ' w/w — ' + dir + ' is a headwind.';
    if (p.posture === 'mixed')    return p.label + ' ' + chgFmt + ' w/w — mixed impact on this sector.';
    return (p.label || 'Driver') + ' — negligible move (' + chgFmt + '), posture neutral.';
  }

  /* =========================================================================
     NET TILT GAUGE — uses weightedNet when available
     ========================================================================= */
  function TiltGauge({ tail, head, net, weightedNet }) {
    const wn = weightedNet != null ? weightedNet : net;
    const total    = (tail + head) || 1;
    const tailPct  = Math.round((tail / total) * 100);
    const headPct  = Math.round((head / total) * 100);
    const netLabel = wn > 0.15 ? 'NET TAILWIND' : wn < -0.15 ? 'NET HEADWIND' : 'BALANCED';
    const netCls   = wn > 0.15 ? 'in-pos' : wn < -0.15 ? 'in-neg' : 'in-muted';
    const netScore = wn != null ? ((wn >= 0 ? '+' : '') + (wn * 100).toFixed(0) + ' pts') : '—';
    return h('div', { style: { marginBottom: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
        h('span', { className: 'in-panel-title', style: { fontSize: 14 } }, 'Driver Tilt'),
        h('span', { className: netCls, style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' } }, netLabel),
        weightedNet != null && h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10 } }, '(weighted ' + netScore + ')'),
        h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, marginLeft: 'auto' } },
          tail + ' tailwind · ' + head + ' headwind')
      ),
      h('div', { style: { display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-3,#17171b)', gap: 1 } },
        tailPct > 0 && h('div', { style: { width: tailPct + '%', background: 'var(--pos,#19c37d)', transition: 'width 0.4s' } }),
        headPct > 0 && h('div', { style: { width: headPct + '%', background: 'var(--neg,#ff5c70)', transition: 'width 0.4s' } })
      )
    );
  }

  /* =========================================================================
     THIS WEEK'S DRIVER MOVES — top absolute change_pct movers across ALL
     taxonomy driver keys (deduped). Shows label, value, change %, and which
     industries the driver feeds (as mini chips).
     ========================================================================= */
  function DriverMoveDigest({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const fmt = INDUSTRY_.fmt;
    const TAXONOMY = INDUSTRY_.TAXONOMY;

    const movers = useMemo(() => {
      // Collect all unique driver keys from TAXONOMY
      const seen = new Set();
      const keys = [];
      TAXONOMY.forEach(t => {
        (t.drivers || []).forEach(d => {
          if (!seen.has(d.key)) { seen.add(d.key); keys.push(d); }
        });
      });

      // Map each key to live data and compute absolute chg
      return keys
        .map(d => {
          const live = indByKey[d.key];
          if (!live) return null;
          let chg = safeNum(live.change_pct);
          if (chg == null) {
            const lv = safeNum(live.latest_value), pv = safeNum(live.prev_value);
            if (lv != null && pv != null && pv !== 0) chg = ((lv - pv) / Math.abs(pv)) * 100;
          }
          if (chg == null) return null; // skip no-change-data drivers
          // Find which industries use this driver, and which direction
          const impacts = [];
          TAXONOMY.forEach(t => {
            const td = (t.drivers || []).find(x => x.key === d.key);
            if (!td) return;
            let posture = 'neutral';
            if (Math.abs(chg) > 0.2) {
              if (td.upIs === 'tailwind') posture = chg > 0 ? 'tailwind' : 'headwind';
              else if (td.upIs === 'headwind') posture = chg > 0 ? 'headwind' : 'tailwind';
              else posture = 'mixed';
            }
            impacts.push({ name: t.name, posture });
          });
          return {
            key: d.key,
            label: live.label || d.label,
            value: safeNum(live.latest_value),
            unit: live.unit,
            chg,
            absChg: Math.abs(chg),
            impacts,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.absChg - a.absChg)
        .slice(0, 6);
    }, [TAXONOMY, indByKey]);

    if (movers.length === 0) return null;

    return h('div', { style: { marginBottom: 20 } },
      // section header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
        h('div', { style: { width: 3, height: 14, borderRadius: 1, background: 'var(--in,#f5a623)', flexShrink: 0 } }),
        h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--in,#f5a623)' } }, "This Week's Driver Moves"),
        h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10 } }, '· biggest absolute movers across all sectors')
      ),
      // horizontal scroll strip of mover cards
      h('div', { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 } },
        movers.map(m =>
          h('div', {
            key: m.key,
            style: {
              flexShrink: 0,
              minWidth: 180,
              maxWidth: 220,
              background: 'var(--bg-1,#0a0a0b)',
              border: '1px solid var(--border-subtle,rgba(255,255,255,0.05))',
              borderTop: '2px solid ' + (m.chg > 0 ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)'),
              borderRadius: 'var(--r-3,4px)',
              padding: '9px 11px 8px',
            }
          },
            // label
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-tertiary,#8e9ab0)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, m.label),
            // value + change row
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
              h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary,#fff)' } },
                m.value != null ? fmt.val(m.value, m.unit) : '—'),
              h('span', { className: chgCls(m.chg), style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 11 } },
                fmtChg(m.chg))
            ),
            // industry impact chips
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3 } },
              m.impacts.map((imp, i) =>
                h('span', {
                  key: i,
                  title: imp.posture,
                  style: {
                    fontSize: 9, padding: '1px 5px', borderRadius: 2,
                    fontFamily: 'var(--font-mono,monospace)',
                    background: imp.posture === 'tailwind' ? 'rgba(25,195,125,0.12)' : imp.posture === 'headwind' ? 'rgba(255,92,112,0.12)' : 'var(--bg-3,#17171b)',
                    color: imp.posture === 'tailwind' ? 'var(--pos,#19c37d)' : imp.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--text-tertiary,#8e9ab0)',
                  }
                }, imp.name)
              )
            )
          )
        )
      )
    );
  }

  /* =========================================================================
     DRIVER CARD — single posture card in the matrix
     ========================================================================= */
  function DriverCard({ posture: p, driver, onClick }) {
    const IND_ = IND();
    const Spark = IND_.Spark;
    const fmt   = INDUSTRY().fmt;
    const cls   = p && p.found ? (p.posture === 'n/a' ? 'neutral' : p.posture) : 'neutral';
    const chgVal = p ? safeNum(p.chg) : null;
    const chgClsStr = chgCls(chgVal);
    const kindLabel = driver.kind === 'demand' ? 'DEMAND' : driver.kind === 'supply' ? 'SUPPLY' : 'MACRO';
    const postureLabel = (!p || !p.found) ? 'N/A' : p.posture === 'tailwind' ? 'TAILWIND' : p.posture === 'headwind' ? 'HEADWIND' : p.posture === 'mixed' ? 'MIXED' : p.posture === 'n/a' ? 'NO DATA' : 'NEUTRAL';
    const postureChipCls = (!p || !p.found || p.posture === 'n/a') ? 'neu' : p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix';
    const sparkRaw = p ? p.spark : null;
    const sparkPts = Array.isArray(sparkRaw) ? sparkRaw.filter(v => safeNum(v) != null) : [];
    const valueStr = (p && p.found && p.value != null) ? fmt.val(safeNum(p.value), p.unit) : '—';

    return h('div', {
      className: 'in-driver ' + cls,
      onClick: () => onClick && onClick(p || { driver, found: false, posture: 'n/a', chg: null, value: null }, driver),
    },
      h('div', { className: 'in-driver-lbl' },
        h('span', null, driver.label),
        h('span', { className: 'in-chip ' + postureChipCls, style: { fontSize: 9, padding: '1px 5px', flexShrink: 0 } }, postureLabel)
      ),
      h('div', { className: 'in-driver-val in-num' }, valueStr),
      h('div', { className: 'in-driver-meta' },
        h('span', { className: chgClsStr + ' in-num', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11.5, fontWeight: 700 } },
          chgVal != null ? fmtChg(chgVal) : '—'),
        h('span', { className: 'in-kind' }, kindLabel)
      ),
      sparkPts.length >= 2 && h('div', { className: 'in-driver-spark' },
        h(Spark, { data: sparkPts, w: null, ht: 26,
          color: (p && p.posture === 'tailwind') ? 'var(--pos,#19c37d)' : (p && p.posture === 'headwind') ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)' })
      ),
      h('div', { className: 'in-driver-hint' }, p ? postureOneLiner(p) : 'No data.')
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
        const w = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
        if (w > 0) setWidth(Math.floor(w));
      });
      obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, []);

    const values = pts
      .map(p => (p && typeof p === 'object' ? (p.v != null ? safeNum(p.v) : safeNum(p.value)) : safeNum(p)))
      .filter(v => v != null);
    if (values.length < 2) return null;

    const W = width, H = 120;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const rng = (max - min) || 1;
    const color = posture === 'tailwind' ? '#19c37d' : posture === 'headwind' ? '#ff5c70' : '#f5a623';
    const d = values.map(function (v, i) {
      return (i / (values.length - 1) * W).toFixed(1) + ',' + (H - ((v - min) / rng) * (H - 8) - 4).toFixed(1);
    }).join(' ');

    // % off recent high
    const pctOffHigh = max > 0 ? (((values[values.length - 1] - max) / max) * 100) : null;

    return h('div', { ref: containerRef, style: { width: '100%' } },
      // stat bar: min / current / max + % off high
      h('div', { style: { display: 'flex', gap: 18, marginBottom: 8, fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5, alignItems: 'baseline', flexWrap: 'wrap' } },
        h('span', { className: 'in-muted' }, 'Low: ', h('b', { style: { color: 'var(--text-secondary,#d4dcea)' } }, min.toLocaleString('en-US', { maximumFractionDigits: 2 }))),
        h('span', { className: 'in-muted' }, 'High: ', h('b', { style: { color: 'var(--text-secondary,#d4dcea)' } }, max.toLocaleString('en-US', { maximumFractionDigits: 2 }))),
        h('span', { className: 'in-muted' }, 'Current: ', h('b', { style: { color: 'var(--text-primary,#fff)' } }, values[values.length - 1].toLocaleString('en-US', { maximumFractionDigits: 2 }))),
        pctOffHigh != null && h('span', {
          className: pctOffHigh < -5 ? 'in-neg' : 'in-muted',
          style: { marginLeft: 'auto', fontWeight: 700 }
        }, pctOffHigh.toFixed(1) + '% off high')
      ),
      h('svg', { width: W, height: H, style: { display: 'block', width: '100%' } },
        h('polyline', { points: d, fill: 'none', stroke: color, strokeWidth: 1.8 }),
        pts[0] && pts[0].d && h('text', { x: 4, y: H - 4, fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, String(pts[0].d).slice(0, 7)),
        pts[pts.length - 1] && pts[pts.length - 1].d && h('text', { x: W - 4, y: H - 4, textAnchor: 'end', fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace' }, String(pts[pts.length - 1].d).slice(0, 7))
      )
    );
  }

  /* =========================================================================
     DRIVER DETAIL MODAL — real historical chart + metadata + cross-industry
     ========================================================================= */
  function DriverDetailModal({ posture: p, driver, ind, indByKey, onClose }) {
    const IND_ = IND();
    const { Spark, Spinner, Empty, Modal: ModalComp } = IND_;
    const fmt = INDUSTRY().fmt;
    const TAXONOMY = INDUSTRY().TAXONOMY;
    const [obsData, setObsData] = useState(null); // null=loading, []=empty, rows=data
    const [obsErr,  setObsErr]  = useState(null);

    useEffect(() => {
      setObsData(null); setObsErr(null);
      INDUSTRY().obs(driver.key, 260)
        .then(rows => setObsData(Array.isArray(rows) ? rows : []))
        .catch(() => { setObsErr('Could not load history'); setObsData([]); });
    }, [driver.key]);

    // Build chart pts: prefer obs (chronological), fall back to spark
    const chartPts = useMemo(() => {
      if (obsData && obsData.length >= 4) {
        return obsData
          .slice()
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .map(r => ({ d: r.date, v: safeNum(r.value) }))
          .filter(r => r.v != null);
      }
      const sp = p && p.spark;
      if (Array.isArray(sp)) return sp.filter(v => safeNum(typeof v === 'object' ? (v.v != null ? v.v : v.value) : v) != null);
      return [];
    }, [obsData, p && p.spark]);

    const isLoading = obsData === null;
    const hasObs    = !isLoading && obsData && obsData.length >= 4;
    const noChart   = !isLoading && chartPts.length < 2;

    // All industries this driver feeds — with live posture
    const impactedInds = useMemo(() => {
      const results = [];
      TAXONOMY.forEach(t => {
        const td = (t.drivers || []).find(d => d.key === driver.key);
        if (!td) return;
        const live = indByKey[driver.key];
        let chgN = null;
        if (live) {
          chgN = safeNum(live.change_pct);
          if (chgN == null) {
            const lv = safeNum(live.latest_value), pv = safeNum(live.prev_value);
            if (lv != null && pv != null && pv !== 0) chgN = ((lv - pv) / Math.abs(pv)) * 100;
          }
        }
        let posture = 'neutral';
        if (chgN != null && Math.abs(chgN) > 0.2) {
          if (td.upIs === 'tailwind') posture = chgN > 0 ? 'tailwind' : 'headwind';
          else if (td.upIs === 'headwind') posture = chgN > 0 ? 'headwind' : 'tailwind';
          else posture = 'mixed';
        }
        results.push({ id: t.id, name: t.name, upIs: td.upIs, posture });
      });
      return results;
    }, [driver.key, TAXONOMY, indByKey]);

    const postureChipCls = (!p || !p.found || p.posture === 'n/a') ? 'neu' : p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix';
    const chgVal = p ? safeNum(p.chg) : null;
    const chgClsStr = chgCls(chgVal);
    const valueStr = (p && p.found && p.value != null) ? fmt.val(safeNum(p.value), p.unit) : '—';
    const postureStr = (p && p.posture) ? p.posture.toUpperCase() : 'N/A';

    return h(ModalComp, { title: driver.label + ' — Driver Detail', onClose, wide: true },
      // top stat row
      h('div', { style: { display: 'flex', gap: 24, marginBottom: 18, flexWrap: 'wrap', alignItems: 'flex-start' } },
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'LATEST'),
          h('div', { className: 'in-driver-val in-num', style: { fontSize: 20 } }, valueStr)
        ),
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'W/W CHANGE'),
          h('div', { className: chgClsStr + ' in-num', style: { fontSize: 18, fontFamily: 'var(--font-mono,monospace)', fontWeight: 700 } },
            chgVal != null ? fmtChg(chgVal, 2) : '—')
        ),
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'POSTURE (THIS SECTOR)'),
          h('span', { className: 'in-chip ' + postureChipCls, style: { fontSize: 11, padding: '4px 10px' } }, postureStr)
        ),
        p && p.tv && h('div', { style: { display: 'flex', alignItems: 'flex-end' } },
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
          hasObs
            ? h('span', { className: 'in-panel-tag in-pos' }, obsData.length + ' observations · from DB')
            : (!isLoading && chartPts.length >= 2
              ? h('span', { className: 'in-panel-tag in-warn' }, 'spark only · no DB history')
              : null)
        ),
        isLoading && h(Spinner, { label: 'Loading history…' }),
        !isLoading && noChart && h('div', { style: { padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', fontSize: 12 } },
          obsErr
            ? h('span', { className: 'in-neg' }, obsErr)
            : 'History pending — series not yet in observations table.'
        ),
        !isLoading && !noChart && h('div', { style: { padding: '10px 0 4px' } },
          h(LargeSparkLine, { pts: chartPts, posture: p ? p.posture : 'neutral' })
        )
      ),

      // one-liner explanation
      h('div', { className: 'in-concl', style: { marginBottom: 16 } },
        h('b', null, driver.label + ': '),
        p ? postureOneLiner(p) : 'No live data for this driver.',
        ' upIs=', driver.upIs || '—', '.'
      ),

      // cross-industry impact table
      h('div', { className: 'in-panel' },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Cross-Industry Impact'),
          h('span', { className: 'in-panel-tag' }, impactedInds.length + ' sectors')
        ),
        impactedInds.length === 0
          ? h('div', { className: 'in-muted', style: { fontSize: 12 } }, 'No sectors mapped to this driver.')
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              impactedInds.map(ti =>
                h('div', {
                  key: ti.id,
                  style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '5px 10px', borderRadius: 3,
                    background: ti.posture === 'tailwind' ? 'rgba(25,195,125,0.07)' : ti.posture === 'headwind' ? 'rgba(255,92,112,0.07)' : 'var(--bg-2,#111114)',
                    border: '1px solid ' + (ti.posture === 'tailwind' ? 'rgba(25,195,125,0.18)' : ti.posture === 'headwind' ? 'rgba(255,92,112,0.18)' : 'rgba(255,255,255,0.05)'),
                  }
                },
                  h('span', { style: { fontSize: 12, color: 'var(--text-secondary,#d4dcea)' } }, ti.name),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    h('span', { className: 'in-muted', style: { fontSize: 10, fontFamily: 'var(--font-mono,monospace)' } }, 'upIs=' + ti.upIs),
                    h('span', {
                      className: 'in-chip ' + (ti.posture === 'tailwind' ? 'tail' : ti.posture === 'headwind' ? 'head' : 'mix'),
                      style: { fontSize: 9 }
                    }, ti.posture.toUpperCase())
                  )
                )
              )
            )
      )
    );
  }

  /* =========================================================================
     DRIVER GROUP SECTION — renders a labelled group of driver cards
     ========================================================================= */
  function DriverGroup({ title, drivers, postures, onCardClick }) {
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
          const p = postures.find(pp => pp && pp.driver && pp.driver.key === d.key) || { driver: d, found: false, posture: 'neutral', chg: null, value: null };
          return h(DriverCard, { key: d.key, posture: p, driver: d, onClick: onCardClick });
        })
      )
    );
  }

  /* =========================================================================
     CROSS-MAP — driver → industry matrix, grouped by kind (demand/supply/macro)
     ========================================================================= */
  function CrossMap({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const fmt = INDUSTRY_.fmt;
    const TAXONOMY = INDUSTRY_.TAXONOMY;

    // Build deduped driver map keyed by driver key
    const driverMap = useMemo(() => {
      const map = {};
      TAXONOMY.forEach(t => {
        (t.drivers || []).forEach(d => {
          if (!map[d.key]) {
            map[d.key] = {
              key: d.key,
              label: d.label,
              kind: d.kind || 'macro',
              entries: [],
            };
          }
          const live = indByKey[d.key];
          let chgN = null;
          if (live) {
            chgN = safeNum(live.change_pct);
            if (chgN == null) {
              const lv = safeNum(live.latest_value), pv = safeNum(live.prev_value);
              if (lv != null && pv != null && pv !== 0) chgN = ((lv - pv) / Math.abs(pv)) * 100;
            }
          }
          let posture = 'neutral';
          if (chgN != null && Math.abs(chgN) > 0.2) {
            if (d.upIs === 'tailwind') posture = chgN > 0 ? 'tailwind' : 'headwind';
            else if (d.upIs === 'headwind') posture = chgN > 0 ? 'headwind' : 'tailwind';
            else posture = 'mixed';
          }
          map[d.key].entries.push({ indName: t.name, indId: t.id, upIs: d.upIs, posture });
        });
      });
      return Object.values(map);
    }, [TAXONOMY, indByKey]);

    // Group by kind
    const byKind = useMemo(() => {
      const groups = { demand: [], supply: [], macro: [] };
      driverMap.forEach(dm => {
        const k = (dm.kind === 'demand' || dm.kind === 'supply') ? dm.kind : 'macro';
        groups[k].push(dm);
      });
      // sort each group by label
      Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.label.localeCompare(b.label)));
      return groups;
    }, [driverMap]);

    const kindConfig = [
      { key: 'demand', label: 'DEMAND', color: 'var(--pos,#19c37d)' },
      { key: 'supply', label: 'SUPPLY', color: 'var(--neg,#ff5c70)' },
      { key: 'macro',  label: 'MACRO',  color: 'var(--in,#f5a623)' },
    ];

    const renderGroup = (cfg) => {
      const drivers = byKind[cfg.key];
      if (!drivers || drivers.length === 0) return null;
      return h('div', { key: cfg.key, style: { marginBottom: 18 } },
        // group header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 0 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' } },
          h('div', { style: { width: 3, height: 12, borderRadius: 1, background: cfg.color, flexShrink: 0 } }),
          h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: cfg.color } }, cfg.label + ' DRIVERS'),
          h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5 } }, '· ' + drivers.length)
        ),
        // driver rows
        drivers.map(dm => {
          const live = indByKey[dm.key];
          let chgN = null;
          if (live) {
            chgN = safeNum(live.change_pct);
            if (chgN == null) {
              const lv = safeNum(live.latest_value), pv = safeNum(live.prev_value);
              if (lv != null && pv != null && pv !== 0) chgN = ((lv - pv) / Math.abs(pv)) * 100;
            }
          }
          return h('div', {
            key: dm.key,
            style: {
              display: 'grid',
              gridTemplateColumns: '160px 80px 70px 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '4px 6px',
              borderRadius: 3,
              marginBottom: 2,
              background: 'var(--bg-1,#0a0a0b)',
              border: '1px solid rgba(255,255,255,0.03)',
            }
          },
            h('span', { style: { fontSize: 11.5, color: 'var(--text-secondary,#d4dcea)', fontFamily: 'var(--font-sans,sans-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, dm.label),
            h('span', { className: 'in-num', style: { fontSize: 11, color: 'var(--text-primary,#fff)', fontFamily: 'var(--font-mono,monospace)' } },
              live ? fmt.val(safeNum(live.latest_value), live.unit) : '—'),
            h('span', { className: chgCls(chgN) + ' in-num', style: { fontSize: 11, fontFamily: 'var(--font-mono,monospace)', fontWeight: 700 } },
              chgN != null ? fmtChg(chgN) : '—'),
            // sector impact chips
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3 } },
              dm.entries.map(e =>
                h('span', {
                  key: e.indId,
                  title: e.upIs,
                  style: {
                    fontSize: 9, padding: '1px 5px', borderRadius: 2,
                    fontFamily: 'var(--font-mono,monospace)',
                    background: e.posture === 'tailwind' ? 'rgba(25,195,125,0.12)' : e.posture === 'headwind' ? 'rgba(255,92,112,0.12)' : 'var(--bg-3,#17171b)',
                    color: e.posture === 'tailwind' ? 'var(--pos,#19c37d)' : e.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--text-tertiary,#8e9ab0)',
                  }
                }, e.indName)
              )
            )
          );
        })
      );
    };

    return h('div', { className: 'in-panel', style: { marginBottom: 20 } },
      h('div', { className: 'in-panel-h' },
        h('span', { className: 'in-panel-title' }, 'Cross-Industry Driver Map'),
        h('span', { className: 'in-panel-tag' }, driverMap.length + ' drivers · ' + TAXONOMY.length + ' sectors')
      ),
      kindConfig.map(renderGroup)
    );
  }

  /* =========================================================================
     BUSINESS CYCLE STRIP
     ========================================================================= */
  function CycleStrip({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const cycle = useMemo(() => {
      try { return INDUSTRY_.an.cyclePhase(indByKey); } catch (e) { return null; }
    }, [indByKey]);
    if (!cycle) return null;

    const phaseColor = {
      'Expansion': 'var(--pos,#19c37d)',
      'Expansion (late)': 'var(--in,#f5a623)',
      'Slowdown': 'var(--neg,#ff5c70)',
      'Contraction / Late-cycle': 'var(--neg,#ff5c70)',
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
          (cycle.favored || []).map(fav => {
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
        cycle.spread != null && h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono,monospace)', color: 'var(--text-tertiary,#8e9ab0)', marginTop: 2 } },
          'Spread: ', h('span', { className: cycle.spread < 0 ? 'in-neg' : 'in-pos' }, cycle.spread.toFixed(2) + 'pp')
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
      selected && selected.thesis && h('div', {
        style: {
          fontSize: 12, color: 'var(--text-tertiary,#8e9ab0)', lineHeight: 1.5, maxWidth: 860,
          background: 'var(--in-softer,rgba(245,166,35,0.06))',
          border: '1px solid var(--in-edge,rgba(245,166,35,0.34))',
          borderRadius: 3, padding: '8px 12px'
        }
      },
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
    const useToast_ = IND_.useToast;
    const [toastNode] = (typeof useToast_ === 'function') ? useToast_() : [null];

    const [loading, setLoading]       = useState(true);
    const [error,   setError]         = useState(null);
    const [indics,  setIndics]        = useState([]);
    const [selectedId, setSelectedId] = useState('coal');
    const [detailState, setDetailState] = useState(null); // { posture, driver }
    const [reloadKey, setReloadKey]   = useState(0);

    // Load live_indicators once
    useEffect(() => {
      setLoading(true);
      setError(null);
      INDUSTRY_.indicators()
        .then(rows => { setIndics(Array.isArray(rows) ? rows : []); setLoading(false); })
        .catch(err => { setError(String(err)); setLoading(false); });
    }, [reloadKey]);

    // Build indByKey lookup — coerce numeric strings
    const indByKey = useMemo(() => {
      const m = {};
      (indics || []).forEach(r => {
        if (r && r.key) m[r.key] = r;
      });
      return m;
    }, [indics]);

    const TAXONOMY = INDUSTRY_.TAXONOMY;
    const ind = useMemo(
      () => TAXONOMY.find(t => t.id === selectedId) || TAXONOMY[0],
      [selectedId, TAXONOMY]
    );

    // Split drivers
    const demandDrivers = useMemo(() => (ind && ind.drivers || []).filter(d => d.kind === 'demand'), [ind]);
    const supplyDrivers = useMemo(() => (ind && ind.drivers || []).filter(d => d.kind === 'supply'), [ind]);
    const macroDrivers  = useMemo(() => (ind && ind.drivers || []).filter(d => d.kind === 'macro'),  [ind]);

    // Postures for all drivers of selected industry
    const allPostures = useMemo(() => {
      if (!ind || !ind.drivers) return [];
      return ind.drivers.map(d => {
        try { return INDUSTRY_.an.posture(d, indByKey); }
        catch (e) { return { driver: d, found: false, posture: 'n/a', chg: null, value: null }; }
      });
    }, [ind, indByKey]);

    // Tilt — uses weightedNet when available
    const tilt = useMemo(() => {
      if (!ind) return { net: null, weightedNet: null, tail: 0, head: 0 };
      try { return INDUSTRY_.an.driverTilt(ind, indByKey); }
      catch (e) { return { net: null, weightedNet: null, tail: 0, head: 0 }; }
    }, [ind, indByKey]);

    const handleCardClick = useCallback((p, driver) => {
      if (p && driver) setDetailState({ posture: p, driver });
    }, []);

    if (loading) return h('div', { className: 'in-root' },
      h('div', { className: 'in-work' }, h(Spinner, { label: 'Loading driver data…' }))
    );
    if (error) return h('div', { className: 'in-root' },
      h('div', { className: 'in-work' },
        h('div', { className: 'in-banner', style: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 } },
          h('div', null, 'Failed to load indicators: ' + error),
          h('button', {
            className: 'in-btn',
            onClick: () => setReloadKey(k => k + 1),
            style: { marginTop: 4 }
          }, 'Retry')
        )
      )
    );

    const hasNoDrivers = !ind || !ind.drivers || ind.drivers.length === 0;
    const fallbackDrivers = hasNoDrivers ? [] : (demandDrivers.length === 0 && supplyDrivers.length === 0 && macroDrivers.length === 0 ? ind.drivers : []);

    return h('div', { className: 'in-root' },
      // header
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

      // scrollable body
      h('div', { className: 'in-work', style: { padding: '18px 22px 50px' } },

        // 0. THIS WEEK'S DRIVER MOVES — top absolute movers digest
        h(DriverMoveDigest, { indByKey }),

        // divider
        h('div', { style: { height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 18 } }),

        // 1. Industry selector
        h(IndustrySelector, { selectedId, onChange: setSelectedId }),

        // 2. Net tilt gauge (weightedNet when available)
        h(TiltGauge, { tail: tilt.tail, head: tilt.head, net: tilt.net, weightedNet: tilt.weightedNet }),

        // 3. Driver Matrix — the centerpiece: demand / supply / macro groups
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 } },
          // Demand
          h(DriverGroup, {
            title: 'DEMAND',
            drivers: demandDrivers.length > 0 ? demandDrivers : fallbackDrivers,
            postures: allPostures,
            onCardClick: handleCardClick,
          }),
          // Supply
          supplyDrivers.length > 0 && h(DriverGroup, {
            title: 'SUPPLY',
            drivers: supplyDrivers,
            postures: allPostures,
            onCardClick: handleCardClick,
          }),
          // Macro
          macroDrivers.length > 0 && h(DriverGroup, {
            title: 'MACRO',
            drivers: macroDrivers,
            postures: allPostures,
            onCardClick: handleCardClick,
          }),
          // Empty state
          hasNoDrivers && h('div', { className: 'in-muted', style: { fontSize: 12, padding: 12 } },
            'No demand, supply, or macro drivers mapped for this sector.')
        ),

        // 4. Business-Cycle strip
        h(CycleStrip, { indByKey }),

        // 5. Cross-Map — grouped by kind
        h(CrossMap, { indByKey })
      ),

      // Driver Detail Modal
      detailState && h(DriverDetailModal, {
        key: detailState.driver.key,
        posture: detailState.posture,
        driver: detailState.driver,
        ind: ind,
        indByKey: indByKey,
        onClose: () => setDetailState(null),
      }),

      toastNode
    );
  }

  window.IndDataWorkspace = IndDataWorkspace;
})();
