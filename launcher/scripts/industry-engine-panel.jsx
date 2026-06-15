/* =========================================================================
   DRIVER ENGINE  (T3 · "Sector Drivers") — quant demand/supply driver engine.

   Reads window.INDUSTRY_ENGINE (built by industry-engine/engine/persist.py,
   served as scripts/industry-engine-data.js). Three navigation levels:
     1. SECTORS        — major industries as clickable tiles (default view)
     2. SUB-INDUSTRIES — the baskets inside the chosen sector
     3. DETAIL (modal) — per-basket: verdict, a basket performance curve, and the
        validated drivers grouped by demand / supply / cost / macro, each with a
        time-series sparkline of the driver's level.

   Self-contained. Uses window.IND.Modal + the in-* classes (industry.css).
   Exposes window.IndustryEnginePanel.
   ========================================================================= */
(function () {
  const { useState, useMemo } = React;
  const h = React.createElement;
  const ENG = () => window.INDUSTRY_ENGINE || null;
  const IND = () => window.IND || {};

  /* ---------- palette + helpers ---------------------------------------- */
  const POS = 'var(--pos,#19c37d)', NEG = 'var(--neg,#ff5c70)', AMBER = 'var(--in,#f5a623)', BLUE = '#7fb6ff';
  const MUT = 'var(--text-tertiary,#8e9ab0)', SEC = 'var(--text-secondary,#d4dcea)', PRI = 'var(--text-primary,#fff)';
  const BG1 = 'var(--bg-1,#0a0a0b)', BG2 = 'var(--bg-2,#111114)', BG3 = 'var(--bg-3,#17171b)';
  const MONO = 'var(--font-mono,monospace)';

  const safe = (v) => (v == null || (typeof v === 'number' && isNaN(v))) ? null : v;
  const verdictTone = (v) => !v ? MUT : v.indexOf('BULL') >= 0 ? POS : v.indexOf('BEAR') >= 0 ? NEG : AMBER;
  const verdictBucket = (v) => !v ? 'neutral' : v.indexOf('BULL') >= 0 ? 'bull' : v.indexOf('BEAR') >= 0 ? 'bear' : 'neutral';
  const gradeChip = (g) => g === 'perfected' ? 'tail' : g === 'partial' ? 'mix' : g === 'blocked' ? 'neu' : 'head';
  const postureChip = (p) => p === 'tailwind' ? 'tail' : p === 'headwind' ? 'head' : 'neu';
  const roleColor = (r) => r === 'demand' ? POS : r === 'supply' ? NEG : r === 'cost' ? AMBER : BLUE;
  const oosTone = (fl) => fl === 'skill' ? POS : fl === 'marginal' ? AMBER : NEG;
  const oosLabel = (fl) => fl === 'skill' ? 'SKILL' : fl === 'marginal' ? 'MARGINAL' : 'NO SKILL';
  const oosMark = (fl) => fl === 'skill' ? '✓' : fl === 'marginal' ? '~' : '✗';
  function pct(v, d) { const n = safe(v); if (n == null) return '—'; return (n > 0 ? '+' : '') + (n * 100).toFixed(d == null ? 0 : d) + '%'; }
  function fix(v, d) { const n = safe(v); if (n == null) return '—'; return Number(n).toFixed(d == null ? 2 : d); }
  function signed(v, d) { const n = safe(v); if (n == null) return '—'; return (n >= 0 ? '+' : '') + n.toFixed(d == null ? 2 : d); }
  const fmtMcapT = (v) => v == null ? '—' : (v / 1e12 >= 100 ? (v / 1e12).toFixed(0) : (v / 1e12).toFixed(1)) + 'T';
  function bandStyle(band) {
    if (band === 'Overweight') return ['rgba(25,195,125,0.20)', POS];
    if (band === 'Slight OW') return ['rgba(25,195,125,0.10)', POS];
    if (band === 'Underweight') return ['rgba(255,92,112,0.20)', NEG];
    if (band === 'Slight UW') return ['rgba(255,92,112,0.10)', NEG];
    return [BG3, MUT];
  }
  const ROLES = [
    { key: 'demand', label: 'Demand', tilt: 'demand_tilt', desc: 'pulls revenue / volume up' },
    { key: 'supply', label: 'Supply', tilt: 'supply_tilt', desc: 'own-output / capacity price' },
    { key: 'cost', label: 'Cost', tilt: 'cost_tilt', desc: 'input cost — margin pressure' },
    { key: 'macro', label: 'Macro · Rates · FX', tilt: 'macro_tilt', desc: 'discount rate · financing · currency · flow' },
  ];

  /* ---------- sparkline (SVG, handles nulls + cumulative) -------------- */
  function Sparkline({ data, color, w, ht, fill, cumulative, baseline }) {
    ht = ht || 34;
    const fluid = !(typeof w === 'number' && w);
    const VW = fluid ? 240 : w;
    let vals = (data || []).map(v => (v == null || (typeof v === 'number' && isNaN(v))) ? null : +v);
    if (cumulative) { let acc = 100; vals = vals.map(v => { if (v == null) return null; acc = acc * (1 + v); return acc; }); }
    const real = vals.filter(v => v != null);
    if (real.length < 2) return h('div', { style: { width: fluid ? '100%' : w, height: ht, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUT, fontSize: 9, fontFamily: MONO } }, 'no series');
    const mn = Math.min.apply(null, real), mx = Math.max.apply(null, real), rng = (mx - mn) || 1, pad = 3, n = vals.length;
    const X = (i) => pad + (n === 1 ? 0 : (i / (n - 1)) * (VW - 2 * pad));
    const Y = (v) => ht - pad - ((v - mn) / rng) * (ht - 2 * pad);
    let firstI = -1, lastI = -1;
    for (let i = 0; i < n; i++) if (vals[i] != null) { firstI = i; break; }
    for (let i = n - 1; i >= 0; i--) if (vals[i] != null) { lastI = i; break; }
    let dpath = '', started = false;
    vals.forEach((v, i) => { if (v == null) { started = false; return; } dpath += (started ? ' L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); started = true; });
    const col = color || SEC, baseY = ht - pad;
    return h('svg', { viewBox: '0 0 ' + VW + ' ' + ht, width: fluid ? '100%' : w, height: ht, preserveAspectRatio: 'none', style: { display: 'block', overflow: 'visible' } },
      (fill !== false && firstI >= 0) ? h('path', { d: dpath + ' L' + X(lastI).toFixed(1) + ' ' + baseY + ' L' + X(firstI).toFixed(1) + ' ' + baseY + ' Z', fill: col, opacity: 0.12, stroke: 'none' }) : null,
      (baseline != null) ? h('line', { x1: pad, x2: VW - pad, y1: Y(baseline), y2: Y(baseline), stroke: 'rgba(255,255,255,0.13)', strokeWidth: 0.7, strokeDasharray: '2 2' }) : null,
      h('path', { d: dpath, fill: 'none', stroke: col, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      (lastI >= 0) ? h('circle', { cx: X(lastI), cy: Y(vals[lastI]), r: 2.2, fill: col }) : null
    );
  }

  /* ---------- small stat ----------------------------------------------- */
  function Stat({ label, val, tone, title }) {
    return h('div', { title: title || label, style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 } },
      h('span', { style: { fontSize: 8, letterSpacing: '0.05em', color: MUT, textTransform: 'uppercase', fontFamily: MONO } }, label),
      h('span', { style: { fontSize: 11.5, fontWeight: 700, fontFamily: MONO, color: tone || SEC } }, val));
  }

  /* ---------- driver card (with time-series sparkline) ----------------- */
  function DriverCard({ d }) {
    const corr = safe(d.pearson);
    const corrTone = corr == null ? MUT : corr > 0 ? POS : NEG;
    const thy = d.theory_agree === true ? '✓ theory' : d.theory_agree === false ? '✗ theory' : '· theory';
    const thyTone = d.theory_agree === true ? POS : d.theory_agree === false ? NEG : MUT;
    const rc = roleColor(d.role);
    const latest = (d.chart && d.chart.length) ? d.chart[d.chart.length - 1] : null;
    return h('div', { style: { background: BG1, border: '1px solid rgba(255,255,255,0.05)', borderLeft: '2px solid ' + rc, borderRadius: 4, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' } },
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 600, color: PRI, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: d.label || d.key }, d.label || d.key),
          d.why ? h('div', { style: { fontSize: 10, color: MUT, marginTop: 2, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, d.why) : null),
        h('div', { style: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, width: 128 } },
          h(Sparkline, { data: d.chart, color: rc, w: 124, ht: 30 }),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
            (latest != null) ? h('span', { style: { fontSize: 9.5, color: MUT, fontFamily: MONO }, title: 'latest level (' + (d.transform || '') + ')' }, 'now ' + (Math.abs(latest) >= 1000 ? latest.toFixed(0) : latest.toFixed(2))) : null,
            h('span', { className: 'in-chip ' + postureChip(d.posture), style: { fontSize: 8 } }, (d.posture || 'neutral').toUpperCase())))),
      h('div', { style: { display: 'flex', gap: 13, alignItems: 'flex-end', flexWrap: 'wrap' } },
        h(Stat, { label: 'corr', val: fix(corr), tone: corrTone, title: 'contemporaneous Pearson vs basket return' }),
        h(Stat, { label: 'lead', val: d.best_lag != null ? d.best_lag + 'm' : '—', title: 'best predictive lead (months)' }),
        h(Stat, { label: 'IC', val: fix(d.ic), title: 'forward rank information coefficient' }),
        h(Stat, { label: 'R²', val: fix(d.r2), title: 'univariate R²' }),
        h(Stat, { label: 'p', val: fix(d.p, 3), tone: (safe(d.p) != null && d.p < 0.1) ? POS : MUT, title: 'HAC p-value' }),
        h('span', { style: { fontSize: 10, fontWeight: 700, color: thyTone, fontFamily: MONO, marginLeft: 'auto' }, title: 'empirical sign vs economic theory' }, thy)));
  }

  /* ---------- driver group (one economic role) ------------------------- */
  function DriverGroup({ role, label, desc, drivers, tilt }) {
    if (!drivers.length) return null;
    const rc = roleColor(role), t = safe(tilt);
    return h('div', { style: { marginBottom: 13 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 } },
        h('span', { style: { width: 8, height: 8, borderRadius: 2, background: rc, flexShrink: 0 } }),
        h('span', { style: { fontSize: 12, fontWeight: 700, color: PRI, letterSpacing: '0.02em' } }, label),
        h('span', { style: { fontSize: 9.5, color: MUT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, drivers.length + (drivers.length === 1 ? ' driver · ' : ' drivers · ') + desc),
        (t != null) ? h('span', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
          h('span', { style: { fontSize: 8.5, color: MUT, textTransform: 'uppercase', fontFamily: MONO } }, 'tilt'),
          h('span', { style: { fontSize: 11.5, fontWeight: 700, fontFamily: MONO, color: t >= 0 ? POS : NEG } }, signed(t))) : null),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 8 } },
        drivers.map((d, i) => h(DriverCard, { key: d.key + i, d: d }))));
  }

  /* ---------- detail modal --------------------------------------------- */
  function BasketDetail({ b, onClose }) {
    const Modal = IND().Modal;
    const mv = b.multivariate || {};
    const conf = b.confidence || {};
    const drivers = b.drivers || [];
    const byRole = { demand: [], supply: [], cost: [], macro: [] };
    drivers.forEach(d => { (byRole[d.role] || byRole.macro).push(d); });
    const tone = verdictTone(b.verdict);
    const win = (b.chart && b.chart.n) || 36;
    const head = (lbl, node) => h('div', null, h('div', { className: 'in-panel-tag' }, lbl), node);

    const body = [
      h('div', { key: 'hd', style: { display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, paddingBottom: 13, borderBottom: '1px solid rgba(255,255,255,0.07)' } },
        head('VERDICT', h('div', { style: { fontSize: 21, fontWeight: 800, fontFamily: MONO, color: tone } }, (b.verdict || '—') + ' ' + (safe(b.score) != null ? b.score : '—'))),
        head('CONFIDENCE', h('span', { className: 'in-chip ' + (conf.level === 'high' ? 'tail' : conf.level === 'medium' ? 'mix' : 'neu'), style: { fontSize: 11, padding: '3px 9px' } }, (conf.level || '—').toUpperCase())),
        head('GRADE', h('span', { className: 'in-chip ' + gradeChip(b.grade), style: { fontSize: 11, padding: '3px 9px' } }, (b.grade || '—').toUpperCase())),
        head('BASKET', h('div', { style: { fontSize: 13, fontFamily: MONO, color: SEC } }, (b.n_used || 0) + ' names · ' + (b.n_kept || 0) + '/' + (b.n_tested || 0) + ' drivers')),
        b.oos ? head('BLINDFOLDED OOS', h('div', { title: 'forward IC ' + fix(b.oos.fwd_ic) + ' · beats ' + Math.round((b.oos.placebo_pctile || 0) * 100) + '% of random placebos (n=' + b.oos.n + ' months)', style: { fontSize: 13, fontFamily: MONO, fontWeight: 700, color: oosTone(b.oos.flag) } }, oosLabel(b.oos.flag) + ' · IC ' + fix(b.oos.fwd_ic))) : null,
        b.xs_band ? head('ALLOCATION', (function () { const bs = bandStyle(b.xs_band); return h('span', { title: 'cross-sectional rank ' + (b.xs_rank || '') + '/' + (b.xs_of || ''), style: { fontSize: 11, padding: '3px 9px', borderRadius: 3, fontFamily: MONO, background: bs[0], color: bs[1] } }, b.xs_band); })()) : null),

      h('div', { key: 'cn', style: { display: 'grid', gridTemplateColumns: '232px 1fr', gap: 16, marginBottom: 16, alignItems: 'stretch' } },
        h('div', { className: 'in-panel', style: { padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
          h('div', { className: 'in-panel-tag', style: { marginBottom: 5 } }, 'BASKET CURVE · equal-weight'),
          b.chart ? h(Sparkline, { data: b.chart.ret, color: tone, w: 204, ht: 54, cumulative: true, baseline: 100 }) : h('div', { className: 'in-muted', style: { fontSize: 11, padding: 12 } }, 'no return series'),
          h('div', { style: { fontSize: 9.5, color: MUT, fontFamily: MONO, marginTop: 5 } }, b.chart ? ('cumulative return · since ' + b.chart.t0) : '')),
        b.narrative ? h('div', { className: 'in-concl', style: { lineHeight: 1.55, margin: 0, display: 'flex', alignItems: 'center' } }, b.narrative) : h('div')),

      h('div', { key: 'dg' },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: PRI } }, 'Validated Drivers'),
          h('span', { className: 'in-muted', style: { fontSize: 10.5 } }, drivers.length + ' kept · grouped by economic role · each sparkline is the driver’s level over the last ' + win + ' months')),
        ROLES.map(r => h(DriverGroup, { key: r.key, role: r.key, label: r.label, desc: r.desc, drivers: byRole[r.key], tilt: b[r.tilt] })),
        !drivers.length ? h('div', { className: 'in-muted', style: { padding: 12, fontSize: 12 } }, 'No drivers crossed the validation gate.') : null),

      h('div', { key: 'mv', className: 'in-panel', style: { marginTop: 4 } },
        h('div', { className: 'in-panel-h' }, h('span', { className: 'in-panel-title' }, 'Multivariate Model'),
          mv.available ? h('span', { className: 'in-panel-tag in-pos' }, 'n=' + (mv.n || '—')) : h('span', { className: 'in-panel-tag' }, 'n/a')),
        mv.available ? h('div', { style: { display: 'flex', gap: 28, flexWrap: 'wrap', padding: '11px 4px 5px' } },
          h(Stat, { label: 'Joint R²', val: fix(mv.r2) + ' (adj ' + fix(mv.adj_r2) + ')', title: 'variance explained by the joint model' }),
          h(Stat, { label: 'OOS hit-rate (pseudo)', val: pct(mv.oos_hit_rate), tone: (safe(mv.oos_hit_rate) || 0) > 0.5 ? POS : NEG, title: mv.oos_kind || 'expanding-window directional hit-rate' }),
          h(Stat, { label: 'in-sample model read', val: pct(mv.expected_monthly_ret, 1) + '/mo', tone: (safe(mv.expected_monthly_ret) || 0) >= 0 ? POS : NEG }),
          h(Stat, { label: 'net driver tilt', val: signed(b.net_tilt), tone: (safe(b.net_tilt) || 0) >= 0 ? POS : NEG }))
          : h('div', { className: 'in-muted', style: { padding: 12, fontSize: 12 } }, 'No multivariate model (too few long-history drivers).')),

      h('div', { key: 'mb', style: { marginTop: 12, fontFamily: MONO, fontSize: 10.5, color: MUT, lineHeight: 1.5 } },
        h('b', { style: { color: SEC } }, 'Basket (' + (b.n_used || 0) + '): '), (b.members_used || []).join(', ')),
      h('div', { key: 'lg', style: { marginTop: 8, fontSize: 9.5, color: MUT, fontFamily: MONO, lineHeight: 1.5 } },
        'corr = contemporaneous Pearson vs basket return · lead = best predictive lag · IC = forward rank info-coefficient · thy = empirical sign vs economic theory · sparkline = driver level (last ' + win + 'm, step-filled). Equal-weight basket return (no mcap look-ahead), HAC-estimated, blindfolded-OOS validated; CEIC drivers publication-lagged.')
    ].filter(Boolean);

    const title = b.sub_sector + ' — ' + b.sector + ' · Driver Engine';
    if (Modal) return h(Modal, { title: title, onClose: onClose, wide: true }, body);
    return h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 9999, display: 'flex', padding: 24, overflow: 'auto' }, onClick: onClose },
      h('div', { style: { background: BG2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 20, maxWidth: 1060, margin: 'auto', width: '100%' }, onClick: (e) => e.stopPropagation() },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 } }, h('b', null, title), h('button', { className: 'in-btn in-btn-ghost', onClick: onClose }, '✕')), body));
  }

  /* ---------- sub-industry card ---------------------------------------- */
  function BasketCard({ b, onClick, showSector }) {
    const tone = verdictTone(b.verdict);
    return h('div', {
      onClick: onClick,
      style: { cursor: 'pointer', background: BG1, border: '1px solid var(--border-subtle,rgba(255,255,255,0.06))', borderLeft: '2px solid ' + tone, borderRadius: 'var(--r-3,4px)', padding: '10px 12px', transition: 'background 0.15s' },
      onMouseEnter: (e) => e.currentTarget.style.background = BG2,
      onMouseLeave: (e) => e.currentTarget.style.background = BG1,
    },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 } },
        h('span', { style: { fontWeight: 600, fontSize: 13, color: PRI, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, b.sub_sector),
        h('span', { style: { fontSize: 15, fontWeight: 800, color: tone, fontFamily: MONO, flexShrink: 0 } }, safe(b.score) != null ? b.score : '—')),
      showSector ? h('div', { style: { fontSize: 9.5, color: MUT, marginBottom: 5, fontFamily: MONO } }, b.sector) : null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 } },
        h('span', { style: { color: tone, fontWeight: 700, fontSize: 11.5, fontFamily: MONO } }, b.verdict || '—'),
        b.model_conflict ? h('span', { title: 'verdict diverges from the multivariate model read', style: { fontSize: 11, color: NEG } }, '⚠') : null),
      b.chart ? h(Sparkline, { data: b.chart.ret, color: tone, ht: 26, cumulative: true }) : h('div', { style: { height: 26 } }),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 7, fontFamily: MONO, fontSize: 9.5, color: MUT, alignItems: 'center' } },
        h('span', { className: 'in-chip ' + gradeChip(b.grade), style: { fontSize: 8, padding: '1px 5px' } }, (b.grade || '').slice(0, 4).toUpperCase()),
        b.oos ? h('span', { title: 'OOS forward IC ' + fix(b.oos.fwd_ic) + ' · beats ' + Math.round((b.oos.placebo_pctile || 0) * 100) + '% of placebos (n=' + b.oos.n + ')', style: { color: oosTone(b.oos.flag), fontWeight: b.oos.flag !== 'none' ? 700 : 400 } }, oosMark(b.oos.flag) + ' IC' + fix(b.oos.fwd_ic)) : null,
        h('span', { style: { marginLeft: 'auto' } }, fmtMcapT(b.total_mcap))));
  }

  /* ---------- sector tile ---------------------------------------------- */
  function SectorCard({ name, baskets, onClick }) {
    const n = baskets.length;
    const mcap = baskets.reduce((s, b) => s + (b.total_mcap || 0), 0);
    const skill = baskets.filter(b => b.oos && b.oos.flag === 'skill').length;
    const marg = baskets.filter(b => b.oos && b.oos.flag === 'marginal').length;
    let bull = 0, bear = 0, neu = 0;
    baskets.forEach(b => { const k = verdictBucket(b.verdict); if (k === 'bull') bull++; else if (k === 'bear') bear++; else neu++; });
    const tot = (bull + bear + neu) || 1;
    return h('div', {
      onClick: onClick,
      style: { cursor: 'pointer', background: BG1, border: '1px solid var(--border-subtle,rgba(255,255,255,0.06))', borderRadius: 'var(--r-3,5px)', padding: '14px 16px', transition: 'background 0.15s, border-color 0.15s' },
      onMouseEnter: (e) => { e.currentTarget.style.background = BG2; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; },
      onMouseLeave: (e) => { e.currentTarget.style.background = BG1; e.currentTarget.style.borderColor = 'var(--border-subtle,rgba(255,255,255,0.06))'; },
    },
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 } },
        h('span', { style: { fontSize: 14.5, fontWeight: 700, color: PRI } }, name),
        h('span', { style: { fontSize: 12, color: MUT, fontFamily: MONO } }, fmtMcapT(mcap))),
      h('div', { style: { display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: BG3, marginBottom: 10 } },
        bull ? h('div', { title: bull + ' bullish', style: { width: (bull / tot * 100) + '%', background: POS } }) : null,
        neu ? h('div', { title: neu + ' neutral', style: { width: (neu / tot * 100) + '%', background: 'rgba(255,255,255,0.15)' } }) : null,
        bear ? h('div', { title: bear + ' bearish', style: { width: (bear / tot * 100) + '%', background: NEG } }) : null),
      h('div', { style: { display: 'flex', gap: 13, fontFamily: MONO, fontSize: 10.5, color: MUT, alignItems: 'center' } },
        h('span', null, n + ' sub-industries'),
        skill ? h('span', { style: { color: POS, fontWeight: 700 }, title: 'sub-industries with blindfolded forward OOS skill' }, skill + ' skill') : null,
        marg ? h('span', { style: { color: AMBER } }, marg + ' marginal') : null,
        h('span', { style: { marginLeft: 'auto', color: SEC } }, 'view →')));
  }

  /* ---------- main workspace ------------------------------------------- */
  function IndustryEnginePanel() {
    const eng = ENG();
    const [sector, setSector] = useState(null);
    const [sel, setSel] = useState(null);
    const [q, setQ] = useState('');
    const [sortKey, setSortKey] = useState('priority');

    const baskets = (eng && eng.baskets) || [];
    const sectors = useMemo(() => {
      const m = {};
      baskets.forEach(b => { (m[b.sector] = m[b.sector] || []).push(b); });
      return Object.keys(m).map(name => ({ name: name, baskets: m[name], mcap: m[name].reduce((s, b) => s + (b.total_mcap || 0), 0) }))
        .sort((a, b) => b.mcap - a.mcap);
    }, [baskets]);
    const counts = useMemo(() => {
      const c = { skill: 0, marginal: 0, perfected: 0 };
      baskets.forEach(b => { if (b.oos) { if (b.oos.flag === 'skill') c.skill++; else if (b.oos.flag === 'marginal') c.marginal++; } if (b.grade === 'perfected') c.perfected++; });
      return c;
    }, [baskets]);

    const searching = q.trim().length > 0;
    const results = useMemo(() => {
      let v;
      if (searching) { const s = q.trim().toLowerCase(); v = baskets.filter(b => (b.sub_sector + ' ' + b.sector).toLowerCase().indexOf(s) >= 0); }
      else if (sector) v = baskets.filter(b => b.sector === sector);
      else return [];
      v = v.slice();
      v.sort((a, b) => {
        if (sortKey === 'rank') return (a.xs_rank || 999) - (b.xs_rank || 999);
        if (sortKey === 'score') return (safe(b.score) || 0) - (safe(a.score) || 0);
        if (sortKey === 'oos') return ((b.oos ? b.oos.fwd_ic : -9)) - ((a.oos ? a.oos.fwd_ic : -9));
        return (a.priority || 999) - (b.priority || 999);
      });
      return v;
    }, [baskets, sector, q, sortKey, searching]);

    const selB = useMemo(() => baskets.find(b => b.id === sel) || null, [baskets, sel]);

    if (!eng) {
      return h('div', { className: 'in-root' },
        h('div', { className: 'in-work', style: { padding: 30 } },
          h('div', { className: 'in-banner' }, 'Driver Engine data not loaded. Ensure scripts/industry-engine-data.js is present (run industry-engine/engine/persist.py).')));
    }

    const inList = searching || sector;

    return h('div', { className: 'in-root' },
      h('div', { className: 'in-head' },
        h('div', { className: 'in-head-mark' },
          h('svg', { viewBox: '0 0 15 15', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
            h('path', { d: 'M2 13L5 8L8 10L13 3' }), h('circle', { cx: 13, cy: 3, r: 1.3, fill: 'currentColor', stroke: 'none' }))),
        h('div', null,
          h('div', { className: 'in-head-title' }, 'Sector Drivers'),
          h('div', { className: 'in-head-sub' }, 'Quant demand/supply driver engine · per IDX sub-industry')),
        h('div', { className: 'in-head-spacer' }),
        h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', fontFamily: MONO } },
          h('span', { className: 'in-chip tail', style: { fontSize: 9 }, title: 'blindfolded forward OOS skill' }, counts.skill + ' OOS skill'),
          counts.marginal ? h('span', { className: 'in-chip mix', style: { fontSize: 9 } }, counts.marginal + ' marginal') : null,
          h('span', { className: 'in-chip neu', style: { fontSize: 9 } }, baskets.length + ' baskets'))),

      h('div', { className: 'in-work', style: { padding: '16px 20px 50px' } },
        // controls
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          h('input', { className: 'in-select', placeholder: 'Search all sub-industries…', value: q, onChange: (e) => setQ(e.target.value), style: { minWidth: 220 } }),
          inList ? h('label', { className: 'in-pick-lbl' }, 'SORT') : null,
          inList ? h('select', { className: 'in-select', value: sortKey, onChange: (e) => setSortKey(e.target.value) },
            [['priority', 'by size (mcap)'], ['score', 'by score'], ['oos', 'by OOS skill'], ['rank', 'by allocation rank']].map(o => h('option', { key: o[0], value: o[0] }, o[1]))) : null,
          h('span', { className: 'in-muted', style: { marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5 } },
            searching ? (results.length + ' match' + (results.length === 1 ? '' : 'es')) : sector ? (results.length + ' sub-industries') : (sectors.length + ' major industries'))),

        // breadcrumb (when drilled in or searching)
        inList ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 } },
          h('button', { className: 'in-btn in-btn-ghost in-btn-sm', onClick: () => { setSector(null); setQ(''); }, style: { cursor: 'pointer' } }, '← All industries'),
          searching ? h('span', { style: { fontSize: 13, color: SEC } }, 'Search') : h('span', { style: { fontSize: 14, fontWeight: 700, color: PRI } }, sector)) : null,

        // hint on sector view
        (!inList) ? h('div', { style: { fontSize: 11.5, color: MUT, marginBottom: 14, fontFamily: MONO } }, 'Select a major industry to drill into its sub-industries, drivers and time-series.') : null,

        // grid
        inList
          ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(224px, 1fr))', gap: 9 } },
            results.map(b => h(BasketCard, { key: b.id, b: b, onClick: () => setSel(b.id), showSector: searching })))
          : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(262px, 1fr))', gap: 11 } },
            sectors.map(s => h(SectorCard, { key: s.name, name: s.name, baskets: s.baskets, onClick: () => setSector(s.name) }))),

        (inList && results.length === 0) ? h('div', { className: 'in-muted', style: { padding: 24, textAlign: 'center' } }, 'No sub-industries match.') : null,

        // method footnote
        h('div', { style: { marginTop: 22, fontSize: 10, color: MUT, lineHeight: 1.5, maxWidth: 1000, fontFamily: MONO } },
          (eng.method || '') + (eng.generated_at ? '  ·  generated ' + eng.generated_at : ''))),

      selB ? h(BasketDetail, { b: selB, onClose: () => setSel(null) }) : null);
  }

  window.IndustryEnginePanel = IndustryEnginePanel;
})();
