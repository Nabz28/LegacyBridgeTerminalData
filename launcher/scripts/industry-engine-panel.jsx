/* =========================================================================
   DRIVER ENGINE (T3 · W?) — the quant demand/supply driver engine surface.

   Reads window.INDUSTRY_ENGINE (built by industry-engine/engine/persist.py,
   served as scripts/industry-engine-data.js): for each of the 52 IDX equity
   sub-industry baskets, the statistically-validated drivers (HAC-OLS + lead-lag
   + IC + multivariate + OOS, theory-reconciled), the live verdict, model quality
   and confidence. Read-only overlay — independent of the hand-set Sector Drivers
   taxonomy, which stays as-is.

   Self-contained. Uses window.IND primitives (Modal, fmt) + in-* classes
   (industry.css). Exposes window.IndustryEnginePanel.
   ========================================================================= */
(function () {
  const { useState, useMemo } = React;
  const h = React.createElement;
  const ENG = () => window.INDUSTRY_ENGINE || null;
  const IND = () => window.IND || {};

  /* ---------- helpers --------------------------------------------------- */
  const safe = (v) => (v == null || (typeof v === 'number' && isNaN(v))) ? null : v;
  function verdictCls(v) {
    if (!v) return 'in-muted';
    if (v.indexOf('BULL') >= 0) return 'in-pos';
    if (v.indexOf('BEAR') >= 0) return 'in-neg';
    return 'in-muted';
  }
  function gradeChip(g) {
    return g === 'perfected' ? 'tail' : g === 'partial' ? 'mix'
      : g === 'blocked' ? 'neu' : 'head';
  }
  function pct(v, d) {
    const n = safe(v); if (n == null) return '—';
    return (n > 0 ? '+' : '') + (n * 100).toFixed(d == null ? 0 : d) + '%';
  }
  function fix(v, d) {
    const n = safe(v); if (n == null) return '—';
    return Number(n).toFixed(d == null ? 2 : d);
  }
  function roleColor(role) {
    return role === 'demand' ? 'var(--pos,#19c37d)'
      : role === 'supply' ? 'var(--neg,#ff5c70)'
      : role === 'cost' ? '#f5a623' : '#7fb6ff';
  }
  function postureChip(p) {
    return p === 'tailwind' ? 'tail' : p === 'headwind' ? 'head' : 'neu';
  }
  const fmtMcapT = (v) => v == null ? '—' : (v / 1e12).toFixed(0) + 'T';
  function bandStyle(band) {
    if (band === 'Overweight') return ['rgba(25,195,125,0.20)', 'var(--pos,#19c37d)'];
    if (band === 'Slight OW') return ['rgba(25,195,125,0.10)', 'var(--pos,#19c37d)'];
    if (band === 'Underweight') return ['rgba(255,92,112,0.20)', 'var(--neg,#ff5c70)'];
    if (band === 'Slight UW') return ['rgba(255,92,112,0.10)', 'var(--neg,#ff5c70)'];
    return ['var(--bg-3,#17171b)', 'var(--text-tertiary,#8e9ab0)'];
  }

  /* ---------- driver row ------------------------------------------------ */
  function DriverRow({ d }) {
    const corr = safe(d.pearson);
    const corrCls = corr == null ? 'in-muted' : corr > 0 ? 'in-pos' : 'in-neg';
    const thy = d.theory_agree === true ? '✓' : d.theory_agree === false ? '✗' : '·';
    const thyCls = d.theory_agree === true ? 'in-pos' : d.theory_agree === false ? 'in-neg' : 'in-muted';
    return h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.7fr 64px 52px 46px 52px 50px 40px 86px',
        gap: 7, alignItems: 'center', padding: '5px 8px', borderRadius: 3,
        background: 'var(--bg-1,#0a0a0b)', border: '1px solid rgba(255,255,255,0.04)',
        marginBottom: 3, fontFamily: 'var(--font-mono,monospace)', fontSize: 11,
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
        h('span', { style: { width: 3, height: 12, borderRadius: 1, background: roleColor(d.role), flexShrink: 0 } }),
        h('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary,#d4dcea)', fontFamily: 'var(--font-sans,sans-serif)' }, title: (d.label || d.key) + (d.why ? ' — ' + d.why : '') }, d.label || d.key)
      ),
      h('span', { className: corrCls + ' in-num', style: { textAlign: 'right', fontWeight: 700 } }, fix(corr)),
      h('span', { className: 'in-muted', style: { textAlign: 'right' }, title: 'best predictive lead (months)' }, (d.best_lag != null ? d.best_lag + 'm' : '—')),
      h('span', { className: 'in-muted', style: { textAlign: 'right' }, title: 'information coefficient' }, fix(d.ic)),
      h('span', { className: 'in-muted', style: { textAlign: 'right' }, title: 'univariate R²' }, fix(d.r2)),
      h('span', { className: (safe(d.p) != null && d.p < 0.1) ? 'in-pos' : 'in-muted', style: { textAlign: 'right' }, title: 'HAC p-value' }, fix(d.p, 3)),
      h('span', { className: thyCls, style: { textAlign: 'center', fontWeight: 700 }, title: 'theory agreement' }, thy),
      h('span', { className: 'in-chip ' + postureChip(d.posture), style: { fontSize: 8.5, justifySelf: 'end' } }, (d.posture || 'neutral').toUpperCase())
    );
  }

  /* ---------- tilt bar -------------------------------------------------- */
  function TiltRow({ label, v }) {
    const n = safe(v); if (n == null) return null;
    const w = Math.min(50, Math.abs(n) * 50);
    const pos = n >= 0;
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 } },
      h('span', { className: 'in-panel-tag', style: { width: 64, flexShrink: 0 } }, label),
      h('div', { style: { flex: 1, height: 6, position: 'relative', background: 'var(--bg-3,#17171b)', borderRadius: 3 } },
        h('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' } }),
        h('div', { style: { position: 'absolute', left: pos ? '50%' : (50 - w) + '%', width: w + '%', top: 0, bottom: 0, background: pos ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)', borderRadius: 3 } })
      ),
      h('span', { className: (pos ? 'in-pos' : 'in-neg') + ' in-num', style: { width: 44, textAlign: 'right', fontSize: 10.5 } }, (n >= 0 ? '+' : '') + n.toFixed(2))
    );
  }

  /* ---------- detail modal ---------------------------------------------- */
  function BasketDetail({ b, onClose }) {
    const Modal = IND().Modal;
    const mv = b.multivariate || {};
    const conf = b.confidence || {};
    const body = [
      // headline
      h('div', { key: 'hd', style: { display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 14 } },
        h('div', null,
          h('div', { className: 'in-panel-tag' }, 'VERDICT'),
          h('div', { className: verdictCls(b.verdict), style: { fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono,monospace)' } }, (b.verdict || '—') + ' ' + (safe(b.score) != null ? b.score : '—'))
        ),
        h('div', null, h('div', { className: 'in-panel-tag' }, 'CONFIDENCE'),
          h('span', { className: 'in-chip ' + (conf.level === 'high' ? 'tail' : conf.level === 'medium' ? 'mix' : 'neu'), style: { fontSize: 11, padding: '3px 9px' } }, (conf.level || '—').toUpperCase())),
        h('div', null, h('div', { className: 'in-panel-tag' }, 'GRADE'),
          h('span', { className: 'in-chip ' + gradeChip(b.grade), style: { fontSize: 11, padding: '3px 9px' } }, (b.grade || '—').toUpperCase())),
        h('div', null, h('div', { className: 'in-panel-tag' }, 'BASKET'),
          h('div', { className: 'in-num', style: { fontSize: 13 } }, (b.n_used || 0) + ' names · ' + (b.n_kept || 0) + '/' + (b.n_tested || 0) + ' drivers')),
        b.oos && h('div', null, h('div', { className: 'in-panel-tag' }, 'BLINDFOLDED OOS'),
          h('div', { title: 'forward IC ' + fix(b.oos.fwd_ic) + ', beats ' + Math.round((b.oos.placebo_pctile || 0) * 100) + '% of placebos (n=' + b.oos.n + ' months)', style: { fontSize: 13, fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, color: b.oos.flag === 'skill' ? 'var(--pos,#19c37d)' : b.oos.flag === 'marginal' ? 'var(--in,#f5a623)' : 'var(--neg,#ff5c70)' } },
            (b.oos.flag === 'skill' ? 'SKILL' : b.oos.flag === 'marginal' ? 'MARGINAL' : 'NO SKILL') + ' · IC ' + fix(b.oos.fwd_ic)))
      ),
      // narrative
      b.narrative && h('div', { key: 'nr', className: 'in-concl', style: { marginBottom: 14, lineHeight: 1.5 } }, b.narrative),
      // tilts + multivariate
      h('div', { key: 'tm', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 } },
        h('div', { className: 'in-panel' },
          h('div', { className: 'in-panel-h' }, h('span', { className: 'in-panel-title' }, 'Net Driver Tilt')),
          h('div', { style: { padding: '8px 4px 2px' } },
            h(TiltRow, { label: 'DEMAND', v: b.demand_tilt }),
            h(TiltRow, { label: 'SUPPLY', v: b.supply_tilt }),
            h(TiltRow, { label: 'COST', v: b.cost_tilt }),
            h(TiltRow, { label: 'MACRO', v: b.macro_tilt }),
            h(TiltRow, { label: 'NET', v: b.net_tilt })
          )
        ),
        h('div', { className: 'in-panel' },
          h('div', { className: 'in-panel-h' }, h('span', { className: 'in-panel-title' }, 'Multivariate Model'),
            mv.available ? h('span', { className: 'in-panel-tag in-pos' }, 'n=' + (mv.n || '—')) : h('span', { className: 'in-panel-tag' }, 'n/a')),
          mv.available
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 2px', fontFamily: 'var(--font-mono,monospace)', fontSize: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { className: 'in-muted' }, 'Joint R²'), h('b', null, fix(mv.r2) + '  (adj ' + fix(mv.adj_r2) + ')')),
              h('div', { style: { display: 'flex', justifyContent: 'space-between' }, title: mv.oos_kind || '' }, h('span', { className: 'in-muted' }, 'OOS hit-rate (pseudo)'), h('b', { className: (safe(mv.oos_hit_rate) || 0) > 0.5 ? 'in-pos' : 'in-neg' }, pct(mv.oos_hit_rate))),
              h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { className: 'in-muted' }, 'Model read'), h('b', { className: (safe(mv.expected_monthly_ret) || 0) >= 0 ? 'in-pos' : 'in-neg' }, pct(mv.expected_monthly_ret, 1) + '/mo')))
            : h('div', { className: 'in-muted', style: { padding: 12, fontSize: 12 } }, 'No multivariate model (too few long-history drivers).')
        )
      ),
      // driver table
      h('div', { key: 'dv', className: 'in-panel' },
        h('div', { className: 'in-panel-h' },
          h('span', { className: 'in-panel-title' }, 'Validated Drivers'),
          h('span', { className: 'in-panel-tag' }, (b.drivers || []).length + ' kept')),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1.7fr 64px 52px 46px 52px 50px 40px 86px', gap: 7, padding: '2px 8px 6px', fontFamily: 'var(--font-mono,monospace)', fontSize: 9, color: 'var(--text-tertiary,#8e9ab0)', textTransform: 'uppercase', letterSpacing: '0.04em' } },
          h('span', null, 'Driver'), h('span', { style: { textAlign: 'right' } }, 'corr'),
          h('span', { style: { textAlign: 'right' } }, 'lead'), h('span', { style: { textAlign: 'right' } }, 'IC'),
          h('span', { style: { textAlign: 'right' } }, 'R²'), h('span', { style: { textAlign: 'right' } }, 'p'),
          h('span', { style: { textAlign: 'center' } }, 'thy'), h('span', { style: { textAlign: 'right' } }, 'now')),
        (b.drivers || []).map((d, i) => h(DriverRow, { key: d.key + i, d })),
        (!b.drivers || !b.drivers.length) && h('div', { className: 'in-muted', style: { padding: 10, fontSize: 12 } }, 'No drivers crossed the validation gate.')
      ),
      // members + legend
      h('div', { key: 'mb', style: { marginTop: 12, fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5, color: 'var(--text-tertiary,#8e9ab0)' } },
        h('b', { style: { color: 'var(--text-secondary,#d4dcea)' } }, 'Basket (' + (b.n_used || 0) + '): '),
        (b.members_used || []).join(', ')),
      h('div', { key: 'lg', style: { marginTop: 8, fontSize: 9.5, color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', lineHeight: 1.5 } },
        'corr = contemporaneous Pearson vs basket return · lead = best predictive lag · IC = rank info-coefficient · thy ✓/✗ = empirical sign vs economic theory · now = current driver posture. Equal-weight basket return (no mcap look-ahead), overlap-aware HAC-estimated, pseudo-OOS-validated; CEIC drivers publication-lagged.')
    ].filter(Boolean);

    if (Modal) return h(Modal, { title: b.sub_sector + ' — ' + b.sector + ' · Driver Engine', onClose, wide: true }, body);
    // fallback inline overlay
    return h('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', padding: 24, overflow: 'auto' }, onClick: onClose },
      h('div', { style: { background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 20, maxWidth: 920, margin: 'auto', width: '100%' }, onClick: (e) => e.stopPropagation() },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 } },
          h('b', null, b.sub_sector + ' — Driver Engine'),
          h('button', { className: 'in-btn in-btn-ghost', onClick: onClose }, '✕')),
        body));
  }

  /* ---------- basket card ----------------------------------------------- */
  function BasketCard({ b, onClick }) {
    const top = (b.drivers || [])[0];
    const mv = b.multivariate || {};
    return h('div', {
      onClick, style: {
        cursor: 'pointer', background: 'var(--bg-1,#0a0a0b)',
        border: '1px solid var(--border-subtle,rgba(255,255,255,0.06))',
        borderLeft: '2px solid ' + (verdictCls(b.verdict) === 'in-pos' ? 'var(--pos,#19c37d)' : verdictCls(b.verdict) === 'in-neg' ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)'),
        borderRadius: 'var(--r-3,4px)', padding: '9px 11px', transition: 'background 0.15s',
      },
      onMouseEnter: (e) => e.currentTarget.style.background = 'var(--bg-2,#111114)',
      onMouseLeave: (e) => e.currentTarget.style.background = 'var(--bg-1,#0a0a0b)',
    },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 5 } },
        h('span', { style: { fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary,#fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, b.sub_sector),
        h('span', { className: 'in-chip ' + gradeChip(b.grade), style: { fontSize: 8, padding: '1px 5px', flexShrink: 0 } }, (b.grade || '').slice(0, 4).toUpperCase())
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 } },
        h('span', { className: verdictCls(b.verdict) + ' in-num', style: { fontWeight: 700, fontSize: 12.5 } }, (b.verdict || '—')),
        b.model_conflict && h('span', { title: 'verdict diverges from the multivariate model read', style: { fontSize: 11, color: 'var(--neg,#ff5c70)', flexShrink: 0 } }, '⚠'),
        b.xs_band && (function () { const bs = bandStyle(b.xs_band); return h('span', { title: 'cross-sectional allocation rank ' + (b.xs_rank || '') + '/' + (b.xs_of || ''), style: { fontSize: 8, padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono,monospace)', whiteSpace: 'nowrap', background: bs[0], color: bs[1] } }, b.xs_band); })(),
        h('span', { className: 'in-num', style: { marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: 'var(--text-primary,#fff)' } }, safe(b.score) != null ? b.score : '—')
      ),
      h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, color: 'var(--text-tertiary,#8e9ab0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
        top ? (top.label || top.key) + ' ' + fix(top.pearson) : 'no validated driver'),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 5, fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, color: 'var(--text-tertiary,#8e9ab0)' } },
        h('span', null, (b.confidence || {}).level || '—'),
        mv.available && h('span', null, 'R² ' + fix(mv.r2)),
        b.oos && (function () {
          var fl = b.oos.flag, col = fl === 'skill' ? 'var(--pos,#19c37d)' : fl === 'marginal' ? 'var(--in,#f5a623)' : 'var(--neg,#ff5c70)';
          var mk = fl === 'skill' ? '✓' : fl === 'marginal' ? '~' : '✗';
          return h('span', { title: 'blindfolded out-of-sample: forward IC ' + fix(b.oos.fwd_ic) + ', beats ' + Math.round((b.oos.placebo_pctile || 0) * 100) + '% of placebos (n=' + b.oos.n + ')', style: { color: col, fontWeight: fl !== 'none' ? 700 : 400 } }, 'OOS' + mk + fix(b.oos.fwd_ic));
        })(),
        h('span', { style: { marginLeft: 'auto' } }, fmtMcapT(b.total_mcap))
      )
    );
  }

  /* ---------- main workspace -------------------------------------------- */
  function IndustryEnginePanel() {
    const eng = ENG();
    const [sel, setSel] = useState(null);
    const [sortKey, setSortKey] = useState('priority');
    const [gFilter, setGFilter] = useState('all');
    const [q, setQ] = useState('');

    const baskets = (eng && eng.baskets) || [];
    const counts = useMemo(() => {
      const c = { perfected: 0, partial: 0, needs_review: 0, blocked: 0 };
      baskets.forEach(b => { c[b.grade] = (c[b.grade] || 0) + 1; });
      return c;
    }, [baskets]);

    const view = useMemo(() => {
      let v = baskets.slice();
      if (gFilter !== 'all') v = v.filter(b => b.grade === gFilter);
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        v = v.filter(b => (b.sub_sector + ' ' + b.sector).toLowerCase().indexOf(s) >= 0);
      }
      const dir = sortKey === 'score' ? -1 : 1;
      v.sort((a, b) => {
        if (sortKey === 'rank') return (a.xs_rank || 999) - (b.xs_rank || 999);
        if (sortKey === 'score') return (safe(b.score) || 0) - (safe(a.score) || 0);
        if (sortKey === 'verdict') return (safe(b.score) || 50) - (safe(a.score) || 50);
        return ((a.priority || 999) - (b.priority || 999)) * dir;
      });
      return v;
    }, [baskets, gFilter, q, sortKey]);

    const selB = useMemo(() => baskets.find(b => b.id === sel) || null, [baskets, sel]);

    if (!eng) {
      return h('div', { className: 'in-root' },
        h('div', { className: 'in-work', style: { padding: 30 } },
          h('div', { className: 'in-banner' }, 'Driver Engine data not loaded. Ensure scripts/industry-engine-data.js is present (run industry-engine/engine/persist.py).')));
    }

    return h('div', { className: 'in-root' },
      // header
      h('div', { className: 'in-head' },
        h('div', { className: 'in-head-mark' },
          h('svg', { viewBox: '0 0 15 15', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
            h('path', { d: 'M2 13L5 8L8 10L13 3' }), h('circle', { cx: 13, cy: 3, r: 1.3, fill: 'currentColor', stroke: 'none' }))),
        h('div', null,
          h('div', { className: 'in-head-title' }, 'Driver Engine'),
          h('div', { className: 'in-head-sub' }, 'Quant demand/supply drivers · per IDX sub-industry')),
        h('div', { className: 'in-head-spacer' }),
        h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5 } },
          h('span', { className: 'in-chip tail', style: { fontSize: 9 } }, counts.perfected + ' perfected'),
          h('span', { className: 'in-chip mix', style: { fontSize: 9 } }, counts.partial + ' partial'),
          (counts.needs_review ? h('span', { className: 'in-chip head', style: { fontSize: 9 } }, counts.needs_review + ' review') : null))
      ),
      // body
      h('div', { className: 'in-work', style: { padding: '16px 20px 50px' } },
        // method line
        h('div', { style: { fontSize: 11, color: 'var(--text-tertiary,#8e9ab0)', lineHeight: 1.5, marginBottom: 14, maxWidth: 980, fontFamily: 'var(--font-mono,monospace)' } },
          (eng.method || '') + (eng.generated_at ? '  ·  generated ' + eng.generated_at : '')),
        // controls
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          h('input', {
            className: 'in-select', placeholder: 'Filter baskets…', value: q,
            onChange: (e) => setQ(e.target.value), style: { minWidth: 180 }
          }),
          h('label', { className: 'in-pick-lbl' }, 'GRADE'),
          h('select', { className: 'in-select', value: gFilter, onChange: (e) => setGFilter(e.target.value) },
            ['all', 'perfected', 'partial', 'needs_review', 'blocked'].map(g => h('option', { key: g, value: g }, g))),
          h('label', { className: 'in-pick-lbl' }, 'SORT'),
          h('select', { className: 'in-select', value: sortKey, onChange: (e) => setSortKey(e.target.value) },
            [['rank', 'by allocation rank'], ['priority', 'by size (mcap)'], ['score', 'by score'], ['verdict', 'by verdict']].map(o => h('option', { key: o[0], value: o[0] }, o[1]))),
          h('span', { className: 'in-muted', style: { marginLeft: 'auto', fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5 } }, view.length + ' / ' + baskets.length + ' baskets')
        ),
        // grid
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 9 } },
          view.map(b => h(BasketCard, { key: b.id, b, onClick: () => setSel(b.id) }))),
        view.length === 0 && h('div', { className: 'in-muted', style: { padding: 24, textAlign: 'center' } }, 'No baskets match.')
      ),
      // detail modal
      selB && h(BasketDetail, { b: selB, onClose: () => setSel(null) })
    );
  }

  window.IndustryEnginePanel = IndustryEnginePanel;
})();
