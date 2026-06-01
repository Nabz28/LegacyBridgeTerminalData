/* =========================================================================
   INDUSTRY DATA (W3) — Demand / Supply Driver intelligence layer.
   The most important feature of T3 — understanding what drives each sector.

   Sections:
     0. This Week's Driver Moves  — top ~6 absolute movers across ALL taxonomy
                                    driver keys; at-a-glance digest strip
     1. Industry Selector         — pick sector, see region/thesis note
     2. Driver Matrix             — demand vs supply vs macro groups; posture cards
                                    + net tilt gauge headline (uses weightedNet)
     3. Driver Detail Modal       — real historical chart via fetchDriverHistory,
                                    CSV download, graceful spark fallback,
                                    cross-industry impact, % off recent high stat
     4. Cross-Map                 — driver → industry matrix, grouped by kind
                                    (demand / supply / macro), live posture colour
                                    + CSV export of full matrix
     5. Business-Cycle strip      — current phase + favored industries
     6. Sector RS Comparison      — multi-line SVG chart comparing sectors by
                                    primary-driver spark/history

   Contracts:
     window.INDUSTRY  — .indicators(), .obs(), .TAXONOMY, .fmt, .an
                        .an.posture() may return {found:false,noSeries:true}
                        .an.conviction() returns {score,signalLabel,driverNet}
                        .an.competitive(row,peers,ctx) needs ctx.sectorAvgChg+driverNet
                        .an.snapshot() has beta field
                        .an.kesimpulan() 6th arg is indByKey
     window.INDUSTRY.fetchDriverHistory(key) — tries macro.observations then
                        falls back to spark JSONB on live_indicators
     window.IND      — { h, Spark, Spinner, Empty, useToast, Modal, fmt }

   All classes: in-* (industry.css). Vanilla Babel-in-browser React, no imports.
   Exposes: window.IndDataWorkspace

   CHANGELOG (round 5):
   - Added INDUSTRY.fetchDriverHistory(key): observations first, spark fallback.
   - DriverDetailModal: real time-series line chart (SVG AreaChart via ChartLib)
     per driver + CSV download button (<driverkey>.csv). noSeries shows chip.
   - DriverCard: noSeries renders an explicit "NO SERIES" chip (not silent N/A).
   - postureOneLiner: guards noSeries case.
   - CrossMap: CSV export button for full driver matrix (sector × driver posture).
   - SectorRSChart: new multi-line SVG chart comparing all TAXONOMY sectors by
     their primary-driver spark/history — shows rotation at a glance.
   - IndDataWorkspace: wires SectorRSChart panel above the cross-map.
   - All posture() call-sites: handle {found:false,noSeries:true}.
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

  /* ---------- fetchDriverHistory ----------------------------------------
     Tries macro.observations (real deep history) first; if empty falls back
     to the driver's spark JSONB ([{d,v}]) from live_indicators.
     Returns Promise<Array<{d:string, v:number}>> (sorted asc).
     Exposed on window.INDUSTRY.fetchDriverHistory for reuse.
     ----------------------------------------------------------------------- */
  function buildFetchDriverHistory() {
    return function fetchDriverHistory(key) {
      const INDUSTRY_ = window.INDUSTRY;
      // 1. Try observations (deep history backfilled into macro.observations)
      return INDUSTRY_.obs(key, 500)
        .then(function (rows) {
          if (Array.isArray(rows) && rows.length >= 4) {
            return rows
              .slice()
              .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
              .map(function (r) { return { d: r.date, v: safeNum(r.value) }; })
              .filter(function (r) { return r.v != null; });
          }
          // 2. Fallback: spark JSONB on live_indicators (real recent history)
          return INDUSTRY_.indicators().then(function (indics) {
            const row = (indics || []).find(function (r) { return r.key === key; });
            if (!row || !row.spark) return [];
            var sp = Array.isArray(row.spark) ? row.spark : [];
            return sp
              .map(function (pt) {
                if (pt == null) return null;
                var val = typeof pt === 'object' ? (pt.v != null ? pt.v : pt.value) : pt;
                var date = typeof pt === 'object' ? (pt.d || pt.date || '') : '';
                var n = safeNum(val);
                return n != null ? { d: String(date), v: n } : null;
              })
              .filter(Boolean);
          });
        });
    };
  }

  /* ---------- CSV download helper --------------------------------------- */
  function downloadCSV(filename, csvStr) {
    try {
      var blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    } catch (e) { /* noop */ }
  }

  function historyToCSV(key, pts) {
    var header = 'date,value\n';
    var rows = pts.map(function (p) { return p.d + ',' + p.v; }).join('\n');
    return header + rows;
  }

  /* ---------- Inline SVG line chart (no external dep) -------------------
     Used for: driver history in modal, sector RS comparison.
     Accepts pts=[{d,v}], width auto via ResizeObserver.
     ----------------------------------------------------------------------- */
  function InlineLine({ pts, color, height }) {
    var containerRef = useRef(null);
    var ht = height || 120;
    var [width, setWidth] = useState(560);
    useEffect(function () {
      if (!containerRef.current) return;
      var obs = new ResizeObserver(function (entries) {
        var w = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
        if (w > 0) setWidth(Math.floor(w));
      });
      obs.observe(containerRef.current);
      return function () { obs.disconnect(); };
    }, []);

    var values = pts.map(function (p) { return p.v; }).filter(function (v) { return v != null; });
    if (values.length < 2) return h('div', { ref: containerRef }, null);

    var W = width, H = ht;
    var mn = Math.min.apply(null, values);
    var mx = Math.max.apply(null, values);
    var rng = (mx - mn) || 1;
    var lineColor = color || 'var(--in,#f5a623)';

    // area fill path
    var pathPts = pts.map(function (p, i) {
      var x = (i / (pts.length - 1) * W).toFixed(1);
      var y = (H - ((p.v - mn) / rng) * (H - 10) - 5).toFixed(1);
      return x + ',' + y;
    }).join(' ');

    var last = values[values.length - 1];
    var pctOffHigh = mx > 0 ? (((last - mx) / mx) * 100) : null;
    var firstDate = pts[0] && pts[0].d ? String(pts[0].d).slice(0, 10) : '';
    var lastDate = pts[pts.length - 1] && pts[pts.length - 1].d ? String(pts[pts.length - 1].d).slice(0, 10) : '';

    return h('div', { ref: containerRef, style: { width: '100%' } },
      // stat bar
      h('div', { style: { display: 'flex', gap: 18, marginBottom: 6, fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5, alignItems: 'baseline', flexWrap: 'wrap' } },
        h('span', { className: 'in-muted' }, 'Low: ', h('b', { style: { color: 'var(--text-secondary,#d4dcea)' } }, mn.toLocaleString('en-US', { maximumFractionDigits: 3 }))),
        h('span', { className: 'in-muted' }, 'High: ', h('b', { style: { color: 'var(--text-secondary,#d4dcea)' } }, mx.toLocaleString('en-US', { maximumFractionDigits: 3 }))),
        h('span', { className: 'in-muted' }, 'Current: ', h('b', { style: { color: 'var(--text-primary,#fff)' } }, last.toLocaleString('en-US', { maximumFractionDigits: 3 }))),
        pctOffHigh != null && h('span', {
          className: pctOffHigh < -5 ? 'in-neg' : 'in-muted',
          style: { marginLeft: 'auto', fontWeight: 700, fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5 }
        }, pctOffHigh.toFixed(1) + '% off high')
      ),
      h('svg', { width: W, height: H, style: { display: 'block', width: '100%', overflow: 'visible' } },
        // grid lines
        h('line', { x1: 0, x2: W, y1: H - 5, y2: H - 5, stroke: 'rgba(255,255,255,0.05)', strokeWidth: 0.5 }),
        h('line', { x1: 0, x2: W, y1: H / 2, y2: H / 2, stroke: 'rgba(255,255,255,0.05)', strokeWidth: 0.5 }),
        // area fill (subtle)
        h('polygon', {
          points: '0,' + H + ' ' + pathPts + ' ' + W + ',' + H,
          fill: lineColor, fillOpacity: 0.06
        }),
        // line
        h('polyline', { points: pathPts, fill: 'none', stroke: lineColor, strokeWidth: 1.8 }),
        // dot at end
        h('circle', { cx: W, cy: (H - ((last - mn) / rng) * (H - 10) - 5).toFixed(1), r: 3, fill: lineColor }),
        // date labels
        firstDate && h('text', { x: 2, y: H + 2, fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace', dominantBaseline: 'hanging' }, firstDate),
        lastDate && h('text', { x: W - 2, y: H + 2, textAnchor: 'end', fill: 'var(--text-tertiary,#8e9ab0)', fontSize: 9, fontFamily: 'monospace', dominantBaseline: 'hanging' }, lastDate)
      )
    );
  }

  /* =========================================================================
     POSTURE ONE-LINER
     ========================================================================= */
  function postureOneLiner(p) {
    if (!p || !p.found) {
      if (p && p.noSeries) return 'This driver has no time series in macro.observations or live_indicators.';
      return 'Data not yet available for this driver.';
    }
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
     DRIVER CARD — single posture card in the matrix.
     noSeries case: shows an explicit "NO SERIES" chip, not silent N/A.
     ========================================================================= */
  function DriverCard({ posture: p, driver, onClick }) {
    const IND_ = IND();
    const Spark = IND_.Spark;
    const fmt   = INDUSTRY().fmt;

    // noSeries: driver intentionally absent — show distinct chip
    var isNoSeries = (p && p.noSeries) || (driver && driver.noSeries && (!p || !p.found));
    var cls   = (p && p.found && !isNoSeries) ? (p.posture === 'n/a' ? 'neutral' : p.posture) : 'neutral';
    var chgVal = p ? safeNum(p.chg) : null;
    var chgClsStr = chgCls(chgVal);
    var kindLabel = driver.kind === 'demand' ? 'DEMAND' : driver.kind === 'supply' ? 'SUPPLY' : 'MACRO';

    var postureLabel, postureChipCls;
    if (isNoSeries) {
      postureLabel = 'NO SERIES';
      postureChipCls = 'neu';
    } else if (!p || !p.found) {
      postureLabel = 'N/A';
      postureChipCls = 'neu';
    } else {
      postureLabel = p.posture === 'tailwind' ? 'TAILWIND' : p.posture === 'headwind' ? 'HEADWIND' : p.posture === 'mixed' ? 'MIXED' : p.posture === 'n/a' ? 'NO DATA' : 'NEUTRAL';
      postureChipCls = p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : p.posture === 'mixed' ? 'mix' : 'neu';
    }

    var sparkRaw = p ? p.spark : null;
    var sparkPts = Array.isArray(sparkRaw) ? sparkRaw.filter(v => safeNum(v != null && typeof v === 'object' ? (v.v != null ? v.v : v.value) : v) != null) : [];
    var valueStr = (p && p.found && !isNoSeries && p.value != null) ? fmt.val(safeNum(p.value), p.unit) : '—';

    return h('div', {
      className: 'in-driver ' + cls,
      onClick: () => onClick && onClick(p || { driver, found: false, posture: 'n/a', chg: null, value: null, noSeries: isNoSeries }, driver),
    },
      h('div', { className: 'in-driver-lbl' },
        h('span', null, driver.label),
        h('div', { style: { display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 } },
          isNoSeries && h('span', { className: 'in-chip neu', style: { fontSize: 8, padding: '1px 4px', opacity: 0.75, letterSpacing: '0.04em' } }, 'NO SERIES'),
          h('span', { className: 'in-chip ' + postureChipCls, style: { fontSize: 9, padding: '1px 5px' } }, postureLabel)
        )
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
      h('div', { className: 'in-driver-hint' },
        isNoSeries
          ? 'No time series for this driver in macro.observations.'
          : (p ? postureOneLiner(p) : 'No data.')
      )
    );
  }

  /* =========================================================================
     DRIVER DETAIL MODAL — real historical chart + CSV + metadata + cross-industry
     Uses fetchDriverHistory: macro.observations first, spark fallback.
     noSeries drivers show an explicit info panel.
     ========================================================================= */
  function DriverDetailModal({ posture: p, driver, ind, indByKey, onClose }) {
    const IND_ = IND();
    const { Spark, Spinner, Empty, Modal: ModalComp } = IND_;
    const fmt = INDUSTRY().fmt;
    const TAXONOMY = INDUSTRY().TAXONOMY;
    const [histData, setHistData] = useState(null); // null=loading, []=empty, pts=data
    const [histErr,  setHistErr]  = useState(null);
    const [histSource, setHistSource] = useState(''); // 'observations' | 'spark' | ''

    var isNoSeries = (p && p.noSeries) || (driver && driver.noSeries && (!p || !p.found));

    useEffect(() => {
      if (isNoSeries) { setHistData([]); return; }
      setHistData(null); setHistErr(null); setHistSource('');

      // Use fetchDriverHistory (observations → spark fallback)
      var fetchFn = window.INDUSTRY.fetchDriverHistory || buildFetchDriverHistory();
      fetchFn(driver.key)
        .then(function (pts) {
          setHistData(Array.isArray(pts) ? pts : []);
          // Determine source label: if pts have real dates from observations they'll be YYYY-MM-DD
          if (pts && pts.length >= 4) {
            // Check if dates look like real DB dates (observations returns ISO date strings)
            var hasRealDates = pts.some(function (p) { return p.d && /^\d{4}-\d{2}-\d{2}/.test(p.d); });
            setHistSource(hasRealDates ? 'observations' : 'spark');
          } else {
            setHistSource('spark');
          }
        })
        .catch(function (e) { setHistErr(String(e)); setHistData([]); });
    }, [driver.key]);

    var isLoading = histData === null;
    var hasChart  = !isLoading && histData && histData.length >= 2;
    var noChart   = !isLoading && (!histData || histData.length < 2);

    // postureColor for chart line
    var postureColor = (p && p.posture === 'tailwind') ? '#19c37d' : (p && p.posture === 'headwind') ? '#ff5c70' : '#f5a623';

    // CSV download handler
    var handleCSV = useCallback(function () {
      if (!histData || histData.length === 0) return;
      var csv = historyToCSV(driver.key, histData);
      downloadCSV(driver.key + '.csv', csv);
    }, [histData, driver.key]);

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

    const postureChipCls = isNoSeries ? 'neu' : ((!p || !p.found || p.posture === 'n/a') ? 'neu' : p.posture === 'tailwind' ? 'tail' : p.posture === 'headwind' ? 'head' : 'mix');
    const chgVal = p ? safeNum(p.chg) : null;
    const chgClsStr = chgCls(chgVal);
    const valueStr = (p && p.found && !isNoSeries && p.value != null) ? fmt.val(safeNum(p.value), p.unit) : '—';
    const postureStr = isNoSeries ? 'NO SERIES' : ((p && p.posture) ? p.posture.toUpperCase() : 'N/A');

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
          h('div', { className: 'in-panel-tag' }, 'POSTURE'),
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

      // noSeries explicit info panel
      isNoSeries && h('div', { className: 'in-panel', style: { marginBottom: 16, borderColor: 'rgba(255,92,112,0.2)' } },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Series Status'),
          h('span', { className: 'in-chip neu', style: { fontSize: 9 } }, 'NO SERIES')
        ),
        h('div', { style: { padding: '10px 0', fontSize: 12, color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)' } },
          'This driver key (' + driver.key + ') is not present in macro.live_indicators or macro.observations. ' +
          'It is mapped in the taxonomy but its live feed is not yet active. No chart or CSV available.'
        )
      ),

      // chart section (only if not noSeries)
      !isNoSeries && h('div', { className: 'in-panel', style: { marginBottom: 16 } },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Historical Series'),
          hasChart
            ? h('span', { className: 'in-panel-tag ' + (histSource === 'observations' ? 'in-pos' : 'in-warn') },
                histData.length + (histSource === 'observations' ? ' obs · DB' : ' pts · spark fallback'))
            : null,
          // CSV button — always shown when data available
          hasChart && h('button', {
            className: 'in-btn in-btn-ghost',
            onClick: handleCSV,
            style: { marginLeft: 'auto', fontSize: 10, padding: '3px 8px' },
            title: 'Download ' + driver.key + '.csv'
          }, '⤓ CSV')
        ),
        isLoading && h(Spinner, { label: 'Loading history…' }),
        !isLoading && noChart && h('div', { style: { padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', fontSize: 12 } },
          histErr
            ? h('span', { className: 'in-neg' }, histErr)
            : 'History pending — series not yet in observations table or spark.'
        ),
        !isLoading && hasChart && h('div', { style: { padding: '10px 0 4px' } },
          h(InlineLine, { pts: histData, color: postureColor, height: 130 })
        )
      ),

      // one-liner explanation
      !isNoSeries && h('div', { className: 'in-concl', style: { marginBottom: 16 } },
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
     + CSV export of the full driver × sector posture matrix.
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
              noSeries: d.noSeries || false,
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
          if (d.noSeries) posture = 'no_series';
          else if (chgN != null && Math.abs(chgN) > 0.2) {
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
      Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.label.localeCompare(b.label)));
      return groups;
    }, [driverMap]);

    // CSV export: driver × sector matrix
    const handleMatrixCSV = useCallback(function () {
      var sectors = TAXONOMY.map(function (t) { return t.name; });
      var header = 'driver_key,driver_label,kind,' + sectors.join(',');
      var rows = driverMap.map(function (dm) {
        var cells = sectors.map(function (sName) {
          var entry = dm.entries.find(function (e) { return e.indName === sName; });
          return entry ? entry.posture : '';
        });
        return [dm.key, dm.label, dm.kind].concat(cells).join(',');
      });
      downloadCSV('driver_matrix.csv', header + '\n' + rows.join('\n'));
    }, [driverMap, TAXONOMY]);

    const kindConfig = [
      { key: 'demand', label: 'DEMAND', color: 'var(--pos,#19c37d)' },
      { key: 'supply', label: 'SUPPLY', color: 'var(--neg,#ff5c70)' },
      { key: 'macro',  label: 'MACRO',  color: 'var(--in,#f5a623)' },
    ];

    const renderGroup = (cfg) => {
      const drivers = byKind[cfg.key];
      if (!drivers || drivers.length === 0) return null;
      return h('div', { key: cfg.key, style: { marginBottom: 18 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 0 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' } },
          h('div', { style: { width: 3, height: 12, borderRadius: 1, background: cfg.color, flexShrink: 0 } }),
          h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: cfg.color } }, cfg.label + ' DRIVERS'),
          h('span', { className: 'in-muted', style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5 } }, '· ' + drivers.length)
        ),
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
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 } },
              h('span', { style: { fontSize: 11.5, color: 'var(--text-secondary,#d4dcea)', fontFamily: 'var(--font-sans,sans-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, dm.label),
              dm.noSeries && h('span', { className: 'in-chip neu', style: { fontSize: 7.5, padding: '1px 3px', flexShrink: 0, opacity: 0.7 } }, 'NO SERIES')
            ),
            h('span', { className: 'in-num', style: { fontSize: 11, color: 'var(--text-primary,#fff)', fontFamily: 'var(--font-mono,monospace)' } },
              live ? fmt.val(safeNum(live.latest_value), live.unit) : '—'),
            h('span', { className: chgCls(chgN) + ' in-num', style: { fontSize: 11, fontFamily: 'var(--font-mono,monospace)', fontWeight: 700 } },
              chgN != null ? fmtChg(chgN) : '—'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3 } },
              dm.entries.map(e =>
                h('span', {
                  key: e.indId,
                  title: e.upIs,
                  style: {
                    fontSize: 9, padding: '1px 5px', borderRadius: 2,
                    fontFamily: 'var(--font-mono,monospace)',
                    background: e.posture === 'tailwind' ? 'rgba(25,195,125,0.12)' : e.posture === 'headwind' ? 'rgba(255,92,112,0.12)' : e.posture === 'no_series' ? 'rgba(100,100,120,0.08)' : 'var(--bg-3,#17171b)',
                    color: e.posture === 'tailwind' ? 'var(--pos,#19c37d)' : e.posture === 'headwind' ? 'var(--neg,#ff5c70)' : 'var(--text-tertiary,#8e9ab0)',
                    opacity: e.posture === 'no_series' ? 0.5 : 1,
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
        h('span', { className: 'in-panel-tag' }, driverMap.length + ' drivers · ' + TAXONOMY.length + ' sectors'),
        h('button', {
          className: 'in-btn in-btn-ghost',
          onClick: handleMatrixCSV,
          style: { marginLeft: 'auto', fontSize: 10, padding: '3px 8px' },
          title: 'Download full driver × sector matrix as CSV'
        }, '⤓ Matrix CSV')
      ),
      kindConfig.map(renderGroup)
    );
  }

  /* =========================================================================
     SECTOR RS COMPARISON — multi-line SVG chart.
     Each sector line = its primary driver's spark values (most recent common
     window). Lets the CIO see rotation at a glance.
     ========================================================================= */
  function SectorRSChart({ indByKey }) {
    const INDUSTRY_ = INDUSTRY();
    const TAXONOMY  = INDUSTRY_.TAXONOMY;
    var containerRef = useRef(null);
    var [width, setWidth] = useState(700);

    useEffect(function () {
      if (!containerRef.current) return;
      var obs = new ResizeObserver(function (entries) {
        var w = entries[0] && entries[0].contentRect && entries[0].contentRect.width;
        if (w > 0) setWidth(Math.floor(w));
      });
      obs.observe(containerRef.current);
      return function () { obs.disconnect(); };
    }, []);

    // For each sector find its primary driver (highest weight), get spark values
    var seriesData = useMemo(function () {
      return TAXONOMY.map(function (t) {
        if (!t.drivers || !t.drivers.length) return null;
        // primary = highest weight
        var primary = t.drivers.reduce(function (best, d) {
          return ((d.weight || 1) > (best.weight || 1)) ? d : best;
        }, t.drivers[0]);
        var live = indByKey[primary.key];
        if (!live || !live.spark) return null;
        var sp = Array.isArray(live.spark) ? live.spark : [];
        var vals = sp.map(function (pt) {
          if (pt == null) return null;
          var v = typeof pt === 'object' ? (pt.v != null ? pt.v : pt.value) : pt;
          return safeNum(v);
        }).filter(function (v) { return v != null; });
        if (vals.length < 3) return null;
        return {
          id: t.id,
          name: t.name,
          accent: t.accent || '#f5a623',
          primaryKey: primary.key,
          primaryLabel: live.label || primary.label,
          vals: vals,
        };
      }).filter(Boolean);
    }, [TAXONOMY, indByKey]);

    if (seriesData.length === 0) return null;

    var W = width, H = 160;
    var padL = 6, padR = 6, padT = 10, padB = 30;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;

    // Normalize each series to 0-100 for comparison (index = (v-min)/(max-min)*100)
    var normalizedSeries = seriesData.map(function (s) {
      var mn = Math.min.apply(null, s.vals);
      var mx = Math.max.apply(null, s.vals);
      var rng = (mx - mn) || 1;
      return Object.assign({}, s, {
        norm: s.vals.map(function (v) { return (v - mn) / rng * 100; })
      });
    });

    // Common x-axis: use the max series length (shorter series align to right)
    var maxLen = Math.max.apply(null, normalizedSeries.map(function (s) { return s.norm.length; }));

    function buildPolyline(normVals) {
      var n = normVals.length;
      // right-align shorter series
      var offset = maxLen - n;
      return normVals.map(function (nv, i) {
        var x = padL + ((i + offset) / Math.max(1, maxLen - 1)) * innerW;
        var y = padT + (1 - nv / 100) * innerH;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
    }

    return h('div', { className: 'in-panel', style: { marginBottom: 20 } },
      h('div', { className: 'in-panel-h' },
        h('span', { className: 'in-panel-title' }, 'Sector RS — Primary Driver Comparison'),
        h('span', { className: 'in-panel-tag' }, seriesData.length + ' sectors · primary driver spark · normalized')
      ),
      h('div', { ref: containerRef, style: { width: '100%', position: 'relative' } },
        h('svg', { width: W, height: H, style: { display: 'block', width: '100%', overflow: 'visible' } },
          // grid
          [0, 0.25, 0.5, 0.75, 1].map(function (p, i) {
            var y = padT + p * innerH;
            return h('line', { key: i, x1: padL, x2: padL + innerW, y1: y, y2: y,
              stroke: 'rgba(255,255,255,0.04)', strokeWidth: 0.5 });
          }),
          // lines
          normalizedSeries.map(function (s) {
            var pts = buildPolyline(s.norm);
            var lastNorm = s.norm[s.norm.length - 1];
            var endX = padL + innerW;
            var endY = padT + (1 - lastNorm / 100) * innerH;
            return h('g', { key: s.id },
              h('polyline', { points: pts, fill: 'none', stroke: s.accent, strokeWidth: 1.2, opacity: 0.85 }),
              h('circle', { cx: endX, cy: endY.toFixed(1), r: 2.5, fill: s.accent })
            );
          })
        ),
        // legend strip below the chart
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 } },
          normalizedSeries.map(function (s) {
            return h('div', { key: s.id, style: { display: 'flex', alignItems: 'center', gap: 4 } },
              h('div', { style: { width: 10, height: 2.5, borderRadius: 1, background: s.accent, flexShrink: 0 } }),
              h('span', { style: { fontSize: 9.5, fontFamily: 'var(--font-mono,monospace)', color: 'var(--text-tertiary,#8e9ab0)', whiteSpace: 'nowrap' } },
                s.name + ' (' + s.primaryLabel + ')')
            );
          })
        )
      )
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

    // Attach fetchDriverHistory to window.INDUSTRY once (idempotent)
    useEffect(function () {
      if (!window.INDUSTRY.fetchDriverHistory) {
        window.INDUSTRY.fetchDriverHistory = buildFetchDriverHistory();
      }
    }, []);

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
    // Handles {found:false,noSeries:true} from posture() API
    const allPostures = useMemo(() => {
      if (!ind || !ind.drivers) return [];
      return ind.drivers.map(d => {
        try {
          var p = INDUSTRY_.an.posture(d, indByKey);
          return p;
        } catch (e) {
          return { driver: d, found: false, posture: 'n/a', chg: null, value: null };
        }
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
            // gauge icon (distinct from other workspaces)
            h('path', { d: 'M7.5 13A5.5 5.5 0 1 0 2 7.5' }),
            h('path', { d: 'M7.5 7.5L10.5 4.5' }),
            h('circle', { cx: 7.5, cy: 7.5, r: 1.2, fill: 'currentColor', stroke: 'none' }))
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

        // 5. Sector RS Comparison — multi-line chart (rotation at a glance)
        h(SectorRSChart, { indByKey }),

        // 6. Cross-Map — grouped by kind + CSV export
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
