/* =========================================================================
   INDUSTRY (T3) — W2 Competitive Positioning workspace.
   Peer comps table · positioning quadrant · market-share proxy bar ·
   6-dimension score modal. Pure vanilla Babel-in-browser React.
   No imports — reads window.INDUSTRY, window.IND (from industry-core.jsx).
   Exposes window.IndCompsWorkspace.
   Accent: amber via in- CSS classes. IDX data only (equity_screen).
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const { h, Spinner, Empty, useToast, Modal, fmt } = window.IND;
  const { TAXONOMY, an, equity: fetchEquity } = window.INDUSTRY;

  /* ---- helpers ---------------------------------------------------------- */
  const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(v);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Build a peer-median object from an array of equity rows
  function computePeerMed(rows) {
    const med = (field) => {
      const vals = rows.map(r => r[field]).filter(isNum).map(Number).sort((a, b) => a - b);
      if (!vals.length) return null;
      const m = Math.floor(vals.length / 2);
      return vals.length % 2 ? vals[m] : (vals[m - 1] + vals[m]) / 2;
    };
    return {
      pe: med('pe'), pb: med('pb'), ps: med('ps'), ev_ebitda: med('ev_ebitda'),
      roe: med('roe'), roa: med('roa'), net_margin: med('net_margin'),
      gross_margin: med('gross_margin'), rev_growth: med('rev_growth'),
      earnings_growth: med('earnings_growth'), div_yield: med('div_yield'),
      debt_equity: med('debt_equity'), current_ratio: med('current_ratio'),
      beta: med('beta'), mcap: med('mcap'), change_pct: med('change_pct'),
    };
  }

  // Color a cell vs peer median: green = better, red = worse
  // lowerBetter=true for valuation (PE, PB, EV/EBITDA)
  function cellCls(val, medVal, lowerBetter) {
    if (!isNum(val) || !isNum(medVal) || medVal === 0) return '';
    const better = lowerBetter ? Number(val) < Number(medVal) : Number(val) > Number(medVal);
    return better ? 'in-pos' : 'in-neg';
  }

  // Verdict display label + pill class
  const VERDICT_MAP = {
    STRONG_BUY: { label: 'Strong Buy', cls: 'strong_buy' },
    BUY:        { label: 'Buy',        cls: 'buy' },
    ACCUMULATE: { label: 'Accum.',     cls: 'accumulate' },
    HOLD:       { label: 'Hold',       cls: 'hold' },
    REDUCE:     { label: 'Reduce',     cls: 'reduce' },
    AVOID:      { label: 'Avoid',      cls: 'avoid' },
  };

  // Percentile rank of value v within array vals (higher = better unless inverted)
  function pctRank(v, vals, invert) {
    if (!isNum(v)) return 0.5;
    const nums = vals.filter(isNum).map(Number);
    if (!nums.length) return 0.5;
    const below = nums.filter(x => x < Number(v)).length;
    const rank = below / nums.length;
    return invert ? 1 - rank : rank;
  }

  // Build per-ticker x/y for the positioning quadrant
  // x = valuation (cheap = right = high x), y = quality (high ROE/margin = top = high y)
  function buildQuadrantCoords(rows) {
    const pes   = rows.map(r => r.pe);
    const pbs   = rows.map(r => r.pb);
    const evs   = rows.map(r => r.ev_ebitda);
    const roes  = rows.map(r => r.roe);
    const nmgns = rows.map(r => r.net_margin);
    return rows.map(r => {
      const vx = (pctRank(r.pe, pes, true) + pctRank(r.pb, pbs, true) + pctRank(r.ev_ebitda, evs, true)) / 3;
      const vy = (pctRank(r.roe, roes, false) + pctRank(r.net_margin, nmgns, false)) / 2;
      return { ...r, qx: vx, qy: vy };
    });
  }

  /* ---- build sector/sub_sector pick list from TAXONOMY + live equity ---- */
  function buildSectorList(equityRows) {
    // Derive distinct sectors from live equity rows
    const sectorSet = {};
    equityRows.forEach(r => {
      if (!r.sector) return;
      if (!sectorSet[r.sector]) sectorSet[r.sector] = new Set();
      if (r.sub_sector) sectorSet[r.sector].add(r.sub_sector);
    });
    return Object.entries(sectorSet)
      .map(([sector, subs]) => ({ sector, subSectors: Array.from(subs).sort() }))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }

  /* =========================================================================
     Sub-component: METHODOLOGY NOTE
     ========================================================================= */
  function MethodologyNote() {
    return h('div', { style: { marginTop: 20, padding: '12px 14px', background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-tertiary,#8e9ab0)' } },
      h('span', { style: { color: 'var(--in,#f5a623)', fontWeight: 600, fontFamily: 'var(--font-mono,monospace)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 8 } }, 'Methodology'),
      'Score (0–100) = Macro 15% + Industry 15% + Technical 20% + Fundamental 20% + Valuation 15% + Risk 15%. ',
      'Valuation is ',
      h('em', null, 'peer-relative'),
      ': cheaper vs the selected peer set scores higher. Fundamental quality (ROE, margins, growth) likewise peer-relative. Technical proxied by 1-day change and 52-week range position. Risk uses beta, D/E, and current ratio. Macro and Industry dimensions inherit the sector-level conviction. All data from IDX equity_screen (daily snapshot).'
    );
  }

  /* =========================================================================
     Sub-component: TICKER DETAIL MODAL
     ========================================================================= */
  function TickerModal({ row, score, peerRankText, onClose }) {
    if (!row || !score) return null;
    const dims = [
      { key: 'macro',       label: 'Macro',       w: 15 },
      { key: 'industry',    label: 'Industry',    w: 15 },
      { key: 'technical',   label: 'Technical',   w: 20 },
      { key: 'fundamental', label: 'Fundamental', w: 20 },
      { key: 'valuation',   label: 'Valuation',   w: 15 },
      { key: 'risk',        label: 'Risk',        w: 15 },
    ];
    const vmap = VERDICT_MAP[score.verdict] || { label: score.verdict, cls: 'hold' };
    return h(Modal, { title: row.symbol + ' — Competitive Score', onClose, wide: false },
      // header row
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 } },
        h('div', null,
          h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary,#8e9ab0)' } }, row.sector + (row.sub_sector ? ' · ' + row.sub_sector : '')),
          h('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary,#fff)', marginTop: 2 } }, row.name || row.symbol),
        ),
        h('div', { style: { marginLeft: 'auto', textAlign: 'right' } },
          h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 22, fontWeight: 700, color: 'var(--in,#f5a623)' } }, score.total),
          h('span', { className: 'in-verdict ' + vmap.cls }, vmap.label),
        ),
      ),
      // peer rank note
      peerRankText && h('div', { style: { fontSize: 12, color: 'var(--text-tertiary,#8e9ab0)', marginBottom: 14, fontFamily: 'var(--font-mono,monospace)' } }, peerRankText),
      // dimension bars
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        dims.map(d => {
          const v = Math.round(score.dims[d.key] || 0);
          const pct = v + '%';
          const barColor = v >= 65 ? 'var(--pos,#19c37d)' : v >= 45 ? 'var(--in,#f5a623)' : 'var(--neg,#ff5c70)';
          return h('div', { key: d.key },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 12, color: 'var(--text-secondary,#d4dcea)' } },
                d.label,
                h('span', { style: { fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)', marginLeft: 8 } }, '(wt ' + d.w + '%)')
              ),
              h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 12, fontWeight: 600, color: barColor } }, v),
            ),
            h('div', { style: { height: 7, background: 'var(--bg-3,#17171b)', borderRadius: 4, overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: pct, background: barColor, borderRadius: 4, transition: 'width 0.4s ease' } })
            )
          );
        })
      ),
      // key stats
      h('div', { style: { marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 } },
        [
          ['Price', fmt.money(row.price)],
          ['Mkt Cap', fmt.mcap(row.mcap)],
          ['1D Chg', fmt.pct(row.change_pct)],
          ['P/E', fmt.num(row.pe, 1)],
          ['P/B', fmt.num(row.pb, 2)],
          ['EV/EBITDA', fmt.num(row.ev_ebitda, 1)],
          ['ROE', fmt.pct(row.roe, 1)],
          ['Net Margin', fmt.pct(row.net_margin, 1)],
          ['Rev Growth', fmt.pct(row.rev_growth, 1)],
          ['Div Yield', fmt.pct(row.div_yield, 2)],
          ['Beta', fmt.num(row.beta, 2)],
          ['D/E', fmt.num(row.debt_equity, 2)],
        ].map(([label, val]) =>
          h('div', { key: label, style: { background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3, padding: '8px 10px' } },
            h('div', { style: { fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 } }, label),
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, val),
          )
        )
      )
    );
  }

  /* =========================================================================
     Sub-component: PEER COMPS TABLE
     ========================================================================= */
  function PeerCompsTable({ peers, peerMed, scores, conviction, onRowClick }) {
    const sorted = useMemo(() => {
      return [...peers].sort((a, b) => {
        const sa = scores[a.symbol] ? scores[a.symbol].total : 0;
        const sb = scores[b.symbol] ? scores[b.symbol].total : 0;
        return sb - sa;
      });
    }, [peers, scores]);

    const cols = [
      { key: 'symbol',          label: 'Symbol',      cls: '',    render: (r) => h('span', { className: 'in-sym' }, r.symbol) },
      { key: 'name',            label: 'Name',        cls: '',    render: (r) => h('span', { style: { fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' } }, r.name || '—') },
      { key: 'mcap',            label: 'Mcap',        cls: 'r',   render: (r) => h('span', { className: 'in-num' }, fmt.mcap(r.mcap)) },
      { key: 'change_pct',      label: '1D%',         cls: 'r',   render: (r) => h('span', { className: 'in-num ' + fmt.cls(r.change_pct) }, fmt.pct(r.change_pct)) },
      { key: 'pe',              label: 'P/E',         cls: 'r',   lowerBetter: true,  render: (r) => h('span', { className: 'in-num ' + cellCls(r.pe, peerMed.pe, true) }, fmt.num(r.pe, 1)) },
      { key: 'pb',              label: 'P/B',         cls: 'r',   lowerBetter: true,  render: (r) => h('span', { className: 'in-num ' + cellCls(r.pb, peerMed.pb, true) }, fmt.num(r.pb, 2)) },
      { key: 'ev_ebitda',       label: 'EV/EBITDA',  cls: 'r',   lowerBetter: true,  render: (r) => h('span', { className: 'in-num ' + cellCls(r.ev_ebitda, peerMed.ev_ebitda, true) }, fmt.num(r.ev_ebitda, 1)) },
      { key: 'roe',             label: 'ROE%',        cls: 'r',   lowerBetter: false, render: (r) => h('span', { className: 'in-num ' + cellCls(r.roe, peerMed.roe, false) }, fmt.pct(r.roe, 1)) },
      { key: 'net_margin',      label: 'Net Mgn%',    cls: 'r',   lowerBetter: false, render: (r) => h('span', { className: 'in-num ' + cellCls(r.net_margin, peerMed.net_margin, false) }, fmt.pct(r.net_margin, 1)) },
      { key: 'rev_growth',      label: 'Rev Grw%',   cls: 'r',   lowerBetter: false, render: (r) => h('span', { className: 'in-num ' + cellCls(r.rev_growth, peerMed.rev_growth, false) }, fmt.pct(r.rev_growth, 1)) },
      { key: 'div_yield',       label: 'Div%',        cls: 'r',   lowerBetter: false, render: (r) => h('span', { className: 'in-num ' + cellCls(r.div_yield, peerMed.div_yield, false) }, fmt.pct(r.div_yield, 2)) },
      { key: '_score',          label: 'Score',       cls: 'r',   render: (r) => { const s = scores[r.symbol]; if (!s) return h('span', { className: 'in-muted' }, '—'); return h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, color: s.total >= 62 ? 'var(--pos,#19c37d)' : s.total <= 42 ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)' } }, s.total); } },
      { key: '_verdict',        label: 'Verdict',     cls: '',    render: (r) => { const s = scores[r.symbol]; if (!s) return null; const v = VERDICT_MAP[s.verdict] || { label: s.verdict, cls: 'hold' }; return h('span', { className: 'in-verdict ' + v.cls }, v.label); } },
    ];

    // Median pseudo-row
    const medRow = h('tr', { key: '__median', style: { background: 'rgba(245,166,35,0.08)', borderTop: '1px solid var(--in-edge,rgba(245,166,35,0.34))' } },
      h('td', { colSpan: 2, style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--in,#f5a623)', fontWeight: 700, paddingLeft: 12, height: 34 } }, 'Peer Median'),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.mcap(peerMed.mcap)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.pct(peerMed.change_pct)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.num(peerMed.pe, 1)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.num(peerMed.pb, 2)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.num(peerMed.ev_ebitda, 1)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.pct(peerMed.roe, 1)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.pct(peerMed.net_margin, 1)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.pct(peerMed.rev_growth, 1)),
      h('td', { className: 'r in-num', style: { height: 34 } }, fmt.pct(peerMed.div_yield, 2)),
      h('td', { className: 'r', style: { height: 34 } }, '—'),
      h('td', { style: { height: 34 } }, '—'),
    );

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Peer Comps'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, sorted.length + ' names · sorted by score · green = better vs median'),
      ),
      h('div', { className: 'in-tablewrap' },
        h('table', { className: 'in-table' },
          h('thead', null,
            h('tr', null, cols.map(c => h('th', { key: c.key, className: c.cls }, c.label)))
          ),
          h('tbody', null,
            sorted.map(r =>
              h('tr', { key: r.symbol, className: 'click', onClick: () => onRowClick(r) },
                cols.map(c => h('td', { key: c.key, className: c.cls }, c.render(r)))
              )
            ),
            medRow
          )
        )
      )
    );
  }

  /* =========================================================================
     Sub-component: POSITIONING QUADRANT (div-based scatter)
     ========================================================================= */
  function PositioningQuadrant({ peers, scores }) {
    const [hovered, setHovered] = useState(null);
    const BOX_H = 320;

    const coordRows = useMemo(() => buildQuadrantCoords(peers), [peers]);
    const totalMcap = peers.reduce((s, r) => s + (Number(r.mcap) || 0), 0);
    const maxMcap   = Math.max(...peers.map(r => Number(r.mcap) || 0), 1);

    const PAD = 36; // padding inside scatter box for labels

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Positioning Quadrant'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, 'x = cheaper (right) · y = higher quality (top) · size ~ mcap'),
      ),
      h('div', { className: 'in-scatter', style: { height: BOX_H, overflow: 'hidden' } },
        // quadrant background lines (center cross)
        h('div', { style: { position: 'absolute', left: '50%', top: PAD, bottom: PAD, width: 1, background: 'rgba(255,255,255,0.05)' } }),
        h('div', { style: { position: 'absolute', top: '50%', left: PAD, right: PAD, height: 1, background: 'rgba(255,255,255,0.05)' } }),
        // quadrant labels
        h('div', { className: 'in-axis-lbl', style: { top: PAD + 6, right: PAD + 4, color: 'var(--pos,#19c37d)', opacity: 0.6 } }, 'Quality Value'),
        h('div', { className: 'in-axis-lbl', style: { top: PAD + 6, left: PAD + 4, opacity: 0.5 } }, 'Quality Premium'),
        h('div', { className: 'in-axis-lbl', style: { bottom: PAD + 6, right: PAD + 4, opacity: 0.5 } }, 'Value Trap risk'),
        h('div', { className: 'in-axis-lbl', style: { bottom: PAD + 6, left: PAD + 4, color: 'var(--neg,#ff5c70)', opacity: 0.6 } }, 'Avoid'),
        // axis labels
        h('div', { className: 'in-axis-lbl', style: { bottom: 4, left: '50%', transform: 'translateX(-50%)' } }, 'Valuation (cheap →)'),
        h('div', { className: 'in-axis-lbl', style: { left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center center' } }, '← Quality →'),
        // dots
        coordRows.map(r => {
          const s = scores[r.symbol];
          const score = s ? s.total : 50;
          const dotSize = Math.max(8, Math.min(28, Math.sqrt((Number(r.mcap) || 0) / maxMcap) * 38));
          // x: 0=left cheap=right → left%=(1-qx)*available + PAD
          const leftPct = PAD + r.qx * (100 - PAD * 2 / (window.innerWidth || 800) * 100);
          // For absolute positioning use direct px from parent
          const xFrac = r.qx;
          const yFrac = 1 - r.qy; // invert: high quality = top
          const dotColor = score >= 65 ? 'var(--pos,#19c37d)' : score <= 40 ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)';
          const isHov = hovered === r.symbol;
          return h('div', {
            key: r.symbol,
            className: 'in-dot',
            title: r.symbol + ' · Score ' + score,
            onMouseEnter: () => setHovered(r.symbol),
            onMouseLeave: () => setHovered(null),
            style: {
              left: 'calc(' + PAD + 'px + ' + (xFrac * 100) + '% * ((100% - ' + (PAD * 2) + 'px) / 100%))',
              top:  'calc(' + PAD + 'px + ' + (yFrac * 100) + '% * ((100% - ' + (PAD * 2) + 'px) / 100%))',
              width:  dotSize,
              height: dotSize,
              background: dotColor,
              border: isHov ? '2px solid #fff' : '1.5px solid rgba(0,0,0,0.3)',
              opacity: hovered && !isHov ? 0.35 : 0.85,
              zIndex: isHov ? 10 : 1,
              transition: 'opacity 0.15s, border 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(7, Math.min(10, dotSize * 0.38)),
              color: '#000',
              fontFamily: 'var(--font-mono,monospace)',
              fontWeight: 700,
              userSelect: 'none',
              overflow: 'hidden',
            }
          }, dotSize >= 16 ? r.symbol.slice(0, dotSize >= 22 ? 4 : 2) : null);
        })
      )
    );
  }

  /* =========================================================================
     Sub-component: MARKET-SHARE PROXY BAR
     ========================================================================= */
  function MarketShareBar({ peers, subSector }) {
    const totalMcap = peers.reduce((s, r) => s + (Number(r.mcap) || 0), 0);
    if (!totalMcap) return null;

    const sorted = [...peers]
      .filter(r => isNum(r.mcap) && Number(r.mcap) > 0)
      .sort((a, b) => Number(b.mcap) - Number(a.mcap));

    const TOP = 8;
    const top8 = sorted.slice(0, TOP);
    const rest = sorted.slice(TOP);
    const restMcap = rest.reduce((s, r) => s + (Number(r.mcap) || 0), 0);

    const COLORS = [
      'var(--in,#f5a623)', '#19c37d', '#4f86e0', '#b06ad6', '#5fd6d6',
      '#e08a4f', '#7fb6ff', '#6bbf8a', '#a0a0b0',
    ];

    const bars = [...top8.map((r, i) => ({ label: r.symbol, mcap: Number(r.mcap), color: COLORS[i % COLORS.length] }))];
    if (restMcap > 0) bars.push({ label: 'Others (' + rest.length + ')', mcap: restMcap, color: 'rgba(255,255,255,0.12)' });

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Market-Share Proxy'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, (subSector || 'sector') + ' · mcap weight · top 8 + others'),
      ),
      // stacked bar
      h('div', { style: { display: 'flex', height: 28, borderRadius: 3, overflow: 'hidden', marginBottom: 10 } },
        bars.map(b => h('div', { key: b.label, title: b.label + ' ' + ((b.mcap / totalMcap) * 100).toFixed(1) + '%', style: { width: ((b.mcap / totalMcap) * 100) + '%', background: b.color, transition: 'width 0.3s' } }))
      ),
      // legend rows
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        bars.map(b => {
          const pct = (b.mcap / totalMcap) * 100;
          return h('div', { key: b.label, style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('div', { style: { width: 10, height: 10, borderRadius: 2, background: b.color, flexShrink: 0 } }),
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--text-secondary,#d4dcea)', minWidth: 56 } }, b.label),
            h('div', { style: { flex: 1, height: 5, background: 'var(--bg-3,#17171b)', borderRadius: 2, overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: pct + '%', background: b.color, borderRadius: 2 } })
            ),
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--in,#f5a623)', minWidth: 44, textAlign: 'right' } }, pct.toFixed(1) + '%'),
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--text-tertiary,#8e9ab0)', minWidth: 60, textAlign: 'right' } }, fmt.mcap(b.mcap)),
          );
        })
      )
    );
  }

  /* =========================================================================
     ROOT: IndCompsWorkspace
     ========================================================================= */
  function IndCompsWorkspace({ openTab }) {
    const [equity, setEquity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [toastNode, pushToast] = useToast();

    // selector state
    const [selSector, setSelSector] = useState('Financials');
    const [selSubSector, setSelSubSector] = useState('');

    // modal state
    const [modalRow, setModalRow] = useState(null);
    const [modalScore, setModalScore] = useState(null);
    const [modalRankText, setModalRankText] = useState('');

    // load equity once
    useEffect(() => {
      setLoading(true);
      fetchEquity()
        .then(rows => {
          setEquity(rows);
          setLoading(false);
        })
        .catch(e => {
          setErr(e.message || 'Failed to load equity data');
          setLoading(false);
        });
    }, []);

    // sector list derived from equity
    const sectorList = useMemo(() => equity ? buildSectorList(equity) : [], [equity]);

    // reset sub_sector when sector changes
    useEffect(() => { setSelSubSector(''); }, [selSector]);

    // sub-sectors for selected sector
    const subSectors = useMemo(() => {
      const found = sectorList.find(s => s.sector === selSector);
      return found ? found.subSectors : [];
    }, [sectorList, selSector]);

    // peer set: all rows in selected sector (+ optional sub_sector filter)
    const peers = useMemo(() => {
      if (!equity) return [];
      return equity.filter(r => r.sector === selSector && (!selSubSector || r.sub_sector === selSubSector));
    }, [equity, selSector, selSubSector]);

    // peer median
    const peerMed = useMemo(() => peers.length ? computePeerMed(peers) : {}, [peers]);

    // sector snapshot + conviction
    const snap = useMemo(() => an.snapshot(peers), [peers]);
    const conviction = useMemo(() => an.conviction(snap), [snap]);

    // 6-dim scores for all peers
    const scores = useMemo(() => {
      if (!peers.length || !peerMed) return {};
      const out = {};
      peers.forEach(r => {
        out[r.symbol] = an.competitive(r, peers, { peerMed, conviction, driverNet: 0 });
      });
      return out;
    }, [peers, peerMed, conviction]);

    // row click handler
    const handleRowClick = useCallback((row) => {
      const score = scores[row.symbol];
      if (!score) return;
      const sortedByScore = [...peers].sort((a, b) => (scores[b.symbol]?.total || 0) - (scores[a.symbol]?.total || 0));
      const rank = sortedByScore.findIndex(r => r.symbol === row.symbol) + 1;
      setModalRankText('Ranked #' + rank + ' of ' + peers.length + ' peers · Conviction ' + conviction + '/100');
      setModalRow(row);
      setModalScore(score);
    }, [scores, peers, conviction]);

    if (loading) return h('div', { className: 'in-root' }, h(Spinner, { label: 'Loading equity data…' }));
    if (err)     return h('div', { className: 'in-root' }, h(Empty, { title: 'Error', sub: err }));
    if (!equity) return h('div', { className: 'in-root' }, h(Empty, { title: 'No data' }));

    const hasPeers = peers.length > 0;
    const statusMap = { BULLISH: 'bull', BEARISH: 'bear', ROTATION: 'rot', NEUTRAL: 'neu' };
    const status = an.status(conviction, snap);

    return h('div', { className: 'in-root' },
      toastNode,
      modalRow && h(TickerModal, { row: modalRow, score: modalScore, peerRankText: modalRankText, onClose: () => setModalRow(null) }),

      // ---- HEADER ----
      h('div', { className: 'in-head' },
        h('div', { className: 'in-head-mark' },
          h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
            h('circle', { cx: 8, cy: 8, r: 6 }),
            h('line', { x1: 8, y1: 2, x2: 8, y2: 5 }),
            h('line', { x1: 8, y1: 11, x2: 8, y2: 14 }),
            h('line', { x1: 2, y1: 8, x2: 5, y2: 8 }),
            h('line', { x1: 11, y1: 8, x2: 14, y2: 8 }),
          )
        ),
        h('div', null,
          h('div', { className: 'in-head-title' }, 'Competitive Positioning'),
          h('div', { className: 'in-head-sub' }, 'T3 · Peer Comps · IDX'),
        ),
        h('div', { className: 'in-head-spacer' }),

        // sector selector
        h('div', { className: 'in-pick' },
          h('span', { className: 'in-pick-lbl' }, 'Sector'),
          h('select', { className: 'in-select', value: selSector, onChange: e => setSelSector(e.target.value) },
            sectorList.map(s => h('option', { key: s.sector, value: s.sector }, s.sector))
          ),
        ),

        // sub-sector selector
        subSectors.length > 0 && h('div', { className: 'in-pick' },
          h('span', { className: 'in-pick-lbl' }, 'Sub-Sector'),
          h('select', { className: 'in-select', value: selSubSector, onChange: e => setSelSubSector(e.target.value) },
            h('option', { value: '' }, 'All Sub-sectors'),
            subSectors.map(s => h('option', { key: s, value: s }, s + ' (' + equity.filter(r => r.sector === selSector && r.sub_sector === s).length + ')'))
          ),
        ),

        // conviction badge
        hasPeers && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 } },
          h('span', { className: 'in-chip ' + (statusMap[status] || 'neu') }, status),
          h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--text-tertiary,#8e9ab0)' } },
            'Conv ' + conviction + ' · ' + peers.length + ' names'
          ),
        ),
      ),

      // ---- BODY ----
      h('div', { className: 'in-work', style: { display: 'flex', flexDirection: 'column', gap: 20 } },
        !hasPeers
          ? h(Empty, { title: 'No tickers', sub: 'Select a sector with IDX coverage' })
          : h(React.Fragment, null,

              // conviction bar strip
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--text-tertiary,#8e9ab0)', whiteSpace: 'nowrap' } }, 'Conviction'),
                h('div', { className: 'in-convbar', style: { flex: 1 } },
                  h('div', { className: 'in-convbar-fill', style: {
                    width: conviction + '%',
                    background: conviction >= 65 ? 'var(--pos,#19c37d)' : conviction <= 35 ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)',
                    transition: 'width 0.4s ease',
                  } })
                ),
                h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 13, color: 'var(--in,#f5a623)', minWidth: 32 } }, conviction),
                h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: 'var(--text-tertiary,#8e9ab0)' } },
                  snap.up + '↑ ' + snap.down + '↓ · breadth ' + Math.round(snap.breadth * 100) + '% · mcap-wtd ' + fmt.pct(snap.mcapChg)
                ),
              ),

              // PEER COMPS TABLE
              h('div', { className: 'in-panel', style: { padding: 0 } },
                h('div', { style: { padding: '14px 16px' } },
                  h(PeerCompsTable, { peers, peerMed, scores, conviction, onRowClick: handleRowClick })
                )
              ),

              // QUADRANT + MARKET SHARE (2-col)
              h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 } },
                h('div', { className: 'in-panel' },
                  h(PositioningQuadrant, { peers, scores })
                ),
                h('div', { className: 'in-panel' },
                  h(MarketShareBar, { peers, subSector: selSubSector || selSector })
                ),
              ),

              // METHODOLOGY NOTE
              h(MethodologyNote, null),
            )
      )
    );
  }

  window.IndCompsWorkspace = IndCompsWorkspace;
})();
