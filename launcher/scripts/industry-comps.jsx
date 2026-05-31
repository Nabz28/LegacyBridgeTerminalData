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
  const { TAXONOMY, an, equity: fetchEquity, indicators: fetchIndicators } = window.INDUSTRY;

  /* ---- helpers ---------------------------------------------------------- */
  const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const toN   = (v) => Number(v);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Build a peer-median object from an array of equity rows
  function computePeerMed(rows) {
    const med = (field) => {
      const vals = rows
        .map(r => r[field])
        .filter(isNum)
        .map(toN)
        .sort((a, b) => a - b);
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
  // For lowerBetter metrics, negative/zero values are loss-makers — not a value signal.
  function cellCls(val, medVal, lowerBetter) {
    if (!isNum(val) || !isNum(medVal) || toN(medVal) === 0) return '';
    if (lowerBetter && toN(val) <= 0) return 'in-neg'; // loss-maker: never color green
    const better = lowerBetter ? toN(val) < toN(medVal) : toN(val) > toN(medVal);
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

  // Percentile rank of value v within array vals (higher = better unless inverted).
  // Returns 0.5 (neutral) when v is missing or non-positive for lowerBetter metrics.
  function pctRank(v, vals, invert) {
    if (!isNum(v)) return 0.5;
    // For invert=true (valuation), non-positive multiples are not meaningful — neutral
    if (invert && toN(v) <= 0) return 0.5;
    const nums = vals
      .filter(x => isNum(x) && (!invert || toN(x) > 0))
      .map(toN);
    if (!nums.length) return 0.5;
    const below = nums.filter(x => x < toN(v)).length;
    const rank  = below / nums.length;
    return invert ? 1 - rank : rank;
  }

  // Build per-ticker x/y for the positioning quadrant.
  // x = valuation-adjusted: 70% valuation rank (cheap=right) + 15% rev_growth + 15% earnings_growth.
  // y = quality: ROE + net_margin tilt + gross_margin modifier.
  // noValuation=true if a ticker has no valid positive multiples.
  function buildQuadrantCoords(rows) {
    const pes   = rows.map(r => r.pe);
    const pbs   = rows.map(r => r.pb);
    const evs   = rows.map(r => r.ev_ebitda);
    const roes  = rows.map(r => r.roe);
    const nmgns = rows.map(r => r.net_margin);
    const gmgns = rows.map(r => r.gross_margin);
    const revgs = rows.map(r => r.rev_growth);
    const earns = rows.map(r => r.earnings_growth);

    return rows.map(r => {
      const hasPE = isNum(r.pe) && toN(r.pe) > 0;
      const hasPB = isNum(r.pb) && toN(r.pb) > 0;
      const hasEV = isNum(r.ev_ebitda) && toN(r.ev_ebitda) > 0;
      const noValuation = !hasPE && !hasPB && !hasEV;

      const valRank = (pctRank(hasPE ? r.pe : null, pes, true) +
                       pctRank(hasPB ? r.pb : null, pbs, true) +
                       pctRank(hasEV ? r.ev_ebitda : null, evs, true)) / 3;

      const revGrowthRank  = pctRank(r.rev_growth,      revgs, false);
      const earnGrowthRank = pctRank(r.earnings_growth,  earns, false);
      const vx = 0.70 * valRank + 0.15 * revGrowthRank + 0.15 * earnGrowthRank;

      const qBase  = (pctRank(r.roe, roes, false) + pctRank(r.net_margin, nmgns, false)) / 2;
      const gmRank = pctRank(r.gross_margin, gmgns, false);
      const vy     = 0.75 * qBase + 0.25 * gmRank;

      return { ...r, qx: vx, qy: vy, noValuation };
    });
  }

  /* ---- build sector/sub_sector pick list from live equity --------------- */
  function buildSectorList(equityRows) {
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
     Sub-component: STANDOUTS SUMMARY
     Auto-surfaces cheapest quality names, most expensive, and value traps.
     ========================================================================= */
  function StandoutsSummary({ peers, scores, peerMed }) {
    const standouts = useMemo(() => {
      if (!peers.length || !Object.keys(scores).length) return null;

      // Enrich peers with numeric coercion and score
      const enriched = peers.map(r => {
        const s = scores[r.symbol];
        const score   = s ? s.total : 50;
        const verdict = s ? s.verdict : 'HOLD';
        const pe      = isNum(r.pe) && toN(r.pe) > 0 ? toN(r.pe) : null;
        const pb      = isNum(r.pb) && toN(r.pb) > 0 ? toN(r.pb) : null;
        const roe     = isNum(r.roe)         ? toN(r.roe)         : null;
        const revg    = isNum(r.rev_growth)  ? toN(r.rev_growth)  : null;
        const valDim  = s ? (s.dims.valuation || 50) : 50;
        const funDim  = s ? (s.dims.fundamental || 50) : 50;
        return { ...r, _score: score, _verdict: verdict, _pe: pe, _pb: pb, _roe: roe, _revg: revg, _val: valDim, _fun: funDim };
      });

      const medPE  = peerMed.pe  && toN(peerMed.pe)  > 0 ? toN(peerMed.pe)  : null;
      const medROE = peerMed.roe != null ? toN(peerMed.roe) : null;

      // Cheapest quality: top 2 by score among those with valuation score >= 60 (genuinely cheap)
      const cheapQ = enriched
        .filter(r => r._val >= 60 && r._score >= 55 && r._fun >= 50)
        .sort((a, b) => b._score - a._score)
        .slice(0, 2);

      // Most expensive: lowest valuation score + highest score overall (quality premium)
      const expensive = enriched
        .filter(r => r._val < 40)
        .sort((a, b) => b._score - a._score)
        .slice(0, 1);

      // Value traps: cheap valuation but weak quality + weak/negative growth
      const valueTrap = enriched
        .filter(r => r._val >= 60 && r._fun < 42 && (r._revg == null || r._revg < 5))
        .sort((a, b) => b._val - a._val)
        .slice(0, 1);

      if (!cheapQ.length && !expensive.length && !valueTrap.length) return null;
      return { cheapQ, expensive, valueTrap };
    }, [peers, scores, peerMed]);

    if (!standouts) return null;

    const Tag = ({ label, color }) =>
      h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--r-2,3px)', background: color === 'green' ? 'rgba(25,195,125,0.14)' : color === 'red' ? 'rgba(255,92,112,0.14)' : 'rgba(245,166,35,0.14)', color: color === 'green' ? 'var(--pos,#19c37d)' : color === 'red' ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)', marginRight: 6 } }, label);

    const Callout = ({ tagLabel, tagColor, sym, note }) =>
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: 'var(--bg-2,#111114)', borderRadius: 'var(--r-2,3px)', border: '1px solid rgba(255,255,255,0.05)', flex: '1 1 200px' } },
        h(Tag, { label: tagLabel, color: tagColor }),
        h('div', null,
          h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 12, color: 'var(--in,#f5a623)', marginRight: 6 } }, sym),
          h('span', { style: { fontSize: 11.5, color: 'var(--text-tertiary,#8e9ab0)', lineHeight: 1.4 } }, note),
        )
      );

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Standouts'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, 'auto-surfaced from 6-dim score + valuation vs median'),
      ),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        ...standouts.cheapQ.map(r =>
          h(Callout, {
            key: 'cq-' + r.symbol,
            tagLabel: 'Cheapest Quality',
            tagColor: 'green',
            sym: r.symbol,
            note: 'Score ' + r._score + ' · ' + (VERDICT_MAP[r._verdict] || { label: r._verdict }).label +
              (r._pe ? ' · P/E ' + r._pe.toFixed(1) : '') +
              (r._roe != null ? ' · ROE ' + r._roe.toFixed(1) + '%' : ''),
          })
        ),
        ...standouts.expensive.map(r =>
          h(Callout, {
            key: 'ex-' + r.symbol,
            tagLabel: 'Priciest',
            tagColor: 'amber',
            sym: r.symbol,
            note: 'Score ' + r._score + ' · val score ' + Math.round(r._val) +
              (r._pe ? ' · P/E ' + r._pe.toFixed(1) : '') +
              ' vs median' + (peerMed.pe && toN(peerMed.pe) > 0 ? ' ' + toN(peerMed.pe).toFixed(1) : ''),
          })
        ),
        ...standouts.valueTrap.map(r =>
          h(Callout, {
            key: 'vt-' + r.symbol,
            tagLabel: 'Value Trap?',
            tagColor: 'red',
            sym: r.symbol,
            note: 'Cheap val (' + Math.round(r._val) + ') but weak quality (' + Math.round(r._fun) + ')' +
              (r._revg != null ? ' · rev grw ' + (r._revg > 0 ? '+' : '') + r._revg.toFixed(1) + '%' : ' · no growth data'),
          })
        ),
      )
    );
  }

  /* =========================================================================
     Sub-component: METHODOLOGY NOTE
     ========================================================================= */
  function MethodologyNote() {
    return h('div', { style: { marginTop: 20, padding: '12px 14px', background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--r-3,4px)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-tertiary,#8e9ab0)' } },
      h('span', { style: { color: 'var(--in,#f5a623)', fontWeight: 600, fontFamily: 'var(--font-mono,monospace)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 8 } }, 'Methodology'),
      'Score (0–100) = Macro 15% + Industry 15% + Technical 20% + Fundamental 20% + Valuation 15% + Risk 15%. ',
      'Valuation is ',
      h('em', null, 'peer-relative'),
      ': cheaper vs the selected peer set scores higher. Negative/zero multiples are penalised (distress). Fundamental quality (ROE, margins, growth) likewise peer-relative. Technical proxied by 1-day change and 52-week range position. Risk uses beta, D/E, and current ratio. Macro and Industry dimensions inherit the sector-level conviction. All data from IDX equity_screen (daily snapshot).'
    );
  }

  /* =========================================================================
     Sub-component: TICKER DETAIL MODAL
     Includes 6-dim bars + percentile ranks within peer set for PE, ROE, growth.
     ========================================================================= */
  function TickerModal({ row, score, peers, peerRankText, onClose }) {
    if (!row || !score) return null;

    const dims = [
      { key: 'macro',       label: 'Macro',       w: 15 },
      { key: 'industry',    label: 'Industry',    w: 15 },
      { key: 'technical',   label: 'Technical',   w: 20 },
      { key: 'fundamental', label: 'Fundamental', w: 20 },
      { key: 'valuation',   label: 'Valuation',   w: 15 },
      { key: 'risk',        label: 'Risk',        w: 15 },
    ];

    // Percentile rank display helper
    const peerPctRankDisplay = useMemo(() => {
      if (!peers || !peers.length) return {};
      const pes   = peers.map(r => r.pe);
      const roes  = peers.map(r => r.roe);
      const revgs = peers.map(r => r.rev_growth);
      const pbs   = peers.map(r => r.pb);
      const evs   = peers.map(r => r.ev_ebitda);

      const fmtPct = (rank) => {
        const pct = Math.round(rank * 100);
        return pct + 'th pctl';
      };

      const peRank   = pctRank(row.pe,         pes,   true);   // cheaper = better rank
      const roeRank  = pctRank(row.roe,         roes,  false);
      const revgRank = pctRank(row.rev_growth,  revgs, false);
      const pbRank   = pctRank(row.pb,          pbs,   true);
      const evRank   = pctRank(row.ev_ebitda,   evs,   true);

      return {
        pe:         isNum(row.pe)         ? fmtPct(peRank)   : null,
        roe:        isNum(row.roe)        ? fmtPct(roeRank)  : null,
        rev_growth: isNum(row.rev_growth) ? fmtPct(revgRank) : null,
        pb:         isNum(row.pb)         ? fmtPct(pbRank)   : null,
        ev_ebitda:  isNum(row.ev_ebitda)  ? fmtPct(evRank)   : null,
      };
    }, [row, peers]);

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

      // 6-dim bars
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
            h('div', { style: { height: 7, background: 'var(--bg-3,#17171b)', borderRadius: 'var(--r-3,4px)', overflow: 'hidden' } },
              h('div', { style: { height: '100%', width: pct, background: barColor, borderRadius: 'var(--r-3,4px)', transition: 'width 0.4s ease' } })
            )
          );
        })
      ),

      // percentile rank panel
      h('div', { style: { marginTop: 16, padding: '10px 12px', background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--r-2,3px)' } },
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary,#8e9ab0)', marginBottom: 8 } }, 'Peer Percentile Ranks (' + (peers ? peers.length : 0) + ' names)'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          [
            ['P/E',      peerPctRankDisplay.pe,         isNum(row.pe) && toN(row.pe) > 0 ? fmt.num(row.pe, 1) : '—'],
            ['P/B',      peerPctRankDisplay.pb,         isNum(row.pb) && toN(row.pb) > 0 ? fmt.num(row.pb, 2) : '—'],
            ['EV/EBITDA',peerPctRankDisplay.ev_ebitda,  isNum(row.ev_ebitda) && toN(row.ev_ebitda) > 0 ? fmt.num(row.ev_ebitda, 1) : '—'],
            ['ROE%',     peerPctRankDisplay.roe,        fmt.pct(row.roe, 1)],
            ['Rev Grw%', peerPctRankDisplay.rev_growth, fmt.pct(row.rev_growth, 1)],
          ].map(([label, rank, val]) =>
            h('div', { key: label, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72, background: 'var(--bg-1,#0a0a0b)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--r-2,3px)', padding: '6px 10px' } },
              h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary,#8e9ab0)', marginBottom: 2 } }, label),
              h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#fff)' } }, val),
              rank && h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, color: 'var(--in,#f5a623)', marginTop: 2 } }, rank),
            )
          )
        )
      ),

      // key stats grid
      h('div', { style: { marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 } },
        [
          ['Price',      fmt.money(row.price)],
          ['Mkt Cap',    fmt.mcap(row.mcap)],
          ['1D Chg',     fmt.pct(row.change_pct)],
          ['P/E',        fmt.num(row.pe, 1)],
          ['P/B',        fmt.num(row.pb, 2)],
          ['EV/EBITDA',  fmt.num(row.ev_ebitda, 1)],
          ['ROE',        fmt.pct(row.roe, 1)],
          ['Net Margin', fmt.pct(row.net_margin, 1)],
          ['Rev Growth', fmt.pct(row.rev_growth, 1)],
          ['Div Yield',  fmt.pct(row.div_yield, 2)],
          ['Beta',       fmt.num(row.beta, 2)],
          ['D/E',        fmt.num(row.debt_equity, 2)],
        ].map(([label, val]) =>
          h('div', { key: label, style: { background: 'var(--bg-2,#111114)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--r-2,3px)', padding: '8px 10px' } },
            h('div', { style: { fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 } }, label),
            h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, val),
          )
        )
      )
    );
  }

  /* =========================================================================
     Sub-component: PEER COMPS TABLE — sortable columns, pinned median row
     ========================================================================= */
  // Sortable column definitions
  const COL_DEFS = [
    { key: 'symbol',     label: 'Symbol',    cls: '',  sortable: false, lowerBetter: false,
      render: (r) => h('span', { className: 'in-sym' }, r.symbol) },
    { key: 'name',       label: 'Name',      cls: '',  sortable: false, lowerBetter: false,
      render: (r) => h('span', { style: { fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' } }, r.name || '—') },
    { key: 'mcap',       label: 'Mcap',      cls: 'r', sortable: true,  lowerBetter: false,
      render: (r) => h('span', { className: 'in-num' }, fmt.mcap(r.mcap)),
      getValue: (r) => isNum(r.mcap) ? toN(r.mcap) : -Infinity },
    { key: 'change_pct', label: '1D%',       cls: 'r', sortable: false, lowerBetter: false,
      render: (r) => h('span', { className: 'in-num ' + fmt.cls(r.change_pct) }, fmt.pct(r.change_pct)) },
    { key: 'pe',         label: 'P/E',       cls: 'r', sortable: true,  lowerBetter: true,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.pe, med.pe, true) }, fmt.num(r.pe, 1)),
      getValue: (r) => isNum(r.pe) && toN(r.pe) > 0 ? toN(r.pe) : Infinity },
    { key: 'pb',         label: 'P/B',       cls: 'r', sortable: true,  lowerBetter: true,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.pb, med.pb, true) }, fmt.num(r.pb, 2)),
      getValue: (r) => isNum(r.pb) && toN(r.pb) > 0 ? toN(r.pb) : Infinity },
    { key: 'ev_ebitda',  label: 'EV/EBITDA', cls: 'r', sortable: true,  lowerBetter: true,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.ev_ebitda, med.ev_ebitda, true) }, fmt.num(r.ev_ebitda, 1)),
      getValue: (r) => isNum(r.ev_ebitda) && toN(r.ev_ebitda) > 0 ? toN(r.ev_ebitda) : Infinity },
    { key: 'roe',        label: 'ROE%',      cls: 'r', sortable: true,  lowerBetter: false,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.roe, med.roe, false) }, fmt.pct(r.roe, 1)),
      getValue: (r) => isNum(r.roe) ? toN(r.roe) : -Infinity },
    { key: 'net_margin', label: 'Net Mgn%',  cls: 'r', sortable: true,  lowerBetter: false,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.net_margin, med.net_margin, false) }, fmt.pct(r.net_margin, 1)),
      getValue: (r) => isNum(r.net_margin) ? toN(r.net_margin) : -Infinity },
    { key: 'rev_growth', label: 'Rev Grw%',  cls: 'r', sortable: true,  lowerBetter: false,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.rev_growth, med.rev_growth, false) }, fmt.pct(r.rev_growth, 1)),
      getValue: (r) => isNum(r.rev_growth) ? toN(r.rev_growth) : -Infinity },
    { key: 'div_yield',  label: 'Div%',      cls: 'r', sortable: true,  lowerBetter: false,
      render: (r, med) => h('span', { className: 'in-num ' + cellCls(r.div_yield, med.div_yield, false) }, fmt.pct(r.div_yield, 2)),
      getValue: (r) => isNum(r.div_yield) ? toN(r.div_yield) : -Infinity },
    { key: '_score',     label: 'Score',     cls: 'r', sortable: true,  lowerBetter: false,
      render: (r, _med, scores) => {
        const s = scores[r.symbol];
        if (!s) return h('span', { className: 'in-muted' }, '—');
        return h('span', { style: { fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, color: s.total >= 62 ? 'var(--pos,#19c37d)' : s.total <= 42 ? 'var(--neg,#ff5c70)' : 'var(--in,#f5a623)' } }, s.total);
      },
      getValue: (r, scores) => { const s = scores && scores[r.symbol]; return s ? s.total : 0; } },
    { key: '_verdict',   label: 'Verdict',   cls: '',  sortable: false, lowerBetter: false,
      render: (r, _med, scores) => {
        const s = scores[r.symbol];
        if (!s) return null;
        const v = VERDICT_MAP[s.verdict] || { label: s.verdict, cls: 'hold' };
        return h('span', { className: 'in-verdict ' + v.cls }, v.label);
      } },
  ];

  function SortIcon({ direction }) {
    if (!direction) return h('span', { style: { opacity: 0.25, marginLeft: 4, fontSize: 8 } }, '⇅');
    return h('span', { style: { marginLeft: 4, fontSize: 9, color: 'var(--in,#f5a623)' } }, direction === 'asc' ? '↑' : '↓');
  }

  function PeerCompsTable({ peers, peerMed, scores, conviction, onRowClick, selectedSymbol, onQuadrantSync }) {
    // sort state: default = score desc
    const [sortKey, setSortKey]   = useState('_score');
    const [sortDir, setSortDir]   = useState('desc');

    const handleHeaderClick = useCallback((col) => {
      if (!col.sortable) return;
      if (sortKey === col.key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(col.key);
        // for lowerBetter cols (valuation) default asc (cheapest first); others desc
        setSortDir(col.lowerBetter ? 'asc' : 'desc');
      }
    }, [sortKey]);

    const sorted = useMemo(() => {
      const col = COL_DEFS.find(c => c.key === sortKey);
      if (!col || !col.getValue) return [...peers];
      const sign = sortDir === 'asc' ? 1 : -1;
      return [...peers].sort((a, b) => {
        const va = col.getValue(a, scores);
        const vb = col.getValue(b, scores);
        // push nulls/Infinity to end regardless of direction
        if (va === Infinity  && vb === Infinity)  return 0;
        if (va === -Infinity && vb === -Infinity) return 0;
        if (va === Infinity  || va === -Infinity) return 1;
        if (vb === Infinity  || vb === -Infinity) return -1;
        return (va - vb) * sign;
      });
    }, [peers, scores, sortKey, sortDir]);

    const cols = COL_DEFS;

    // Median pseudo-row — pinned at bottom, not affected by sort
    const medRow = h('tr', { key: '__median', className: 'in-median' },
      h('td', { colSpan: 2, style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--in,#f5a623)', fontWeight: 700, paddingLeft: 12 } }, 'Peer Median'),
      h('td', { className: 'r in-num' }, fmt.mcap(peerMed.mcap)),
      h('td', { className: 'r in-num' }, fmt.pct(peerMed.change_pct)),
      h('td', { className: 'r in-num' }, fmt.num(peerMed.pe, 1)),
      h('td', { className: 'r in-num' }, fmt.num(peerMed.pb, 2)),
      h('td', { className: 'r in-num' }, fmt.num(peerMed.ev_ebitda, 1)),
      h('td', { className: 'r in-num' }, fmt.pct(peerMed.roe, 1)),
      h('td', { className: 'r in-num' }, fmt.pct(peerMed.net_margin, 1)),
      h('td', { className: 'r in-num' }, fmt.pct(peerMed.rev_growth, 1)),
      h('td', { className: 'r in-num' }, fmt.pct(peerMed.div_yield, 2)),
      h('td', { className: 'r' }, '—'),
      h('td', null, '—'),
    );

    const sortHintText = sortKey === '_score'
      ? '↓ score default'
      : (cols.find(c => c.key === sortKey) || {}).label + ' ' + (sortDir === 'asc' ? '↑' : '↓');

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 10 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Peer Comps'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } },
          sorted.length + ' names · ' + sortHintText + ' · click header to sort · green better vs median'
        ),
      ),
      h('div', { className: 'in-tablewrap' },
        h('table', { className: 'in-table' },
          h('thead', null,
            h('tr', null,
              cols.map(c =>
                h('th', {
                  key: c.key,
                  className: c.cls + (c.sortable ? ' click' : ''),
                  onClick: c.sortable ? () => handleHeaderClick(c) : undefined,
                  style: c.sortable ? { cursor: 'pointer', userSelect: 'none' } : undefined,
                  title: c.sortable ? 'Click to sort by ' + c.label : undefined,
                },
                  c.label,
                  c.sortable && h(SortIcon, { direction: sortKey === c.key ? sortDir : null })
                )
              )
            )
          ),
          h('tbody', null,
            sorted.map(r => {
              const isSelected = selectedSymbol === r.symbol;
              return h('tr', {
                key: r.symbol,
                className: 'click' + (isSelected ? ' in-row-selected' : ''),
                onClick: () => {
                  onRowClick(r);
                  if (onQuadrantSync) onQuadrantSync(r.symbol);
                },
                style: isSelected ? { background: 'rgba(245,166,35,0.12)', outline: '1px solid rgba(245,166,35,0.35)' } : undefined,
              },
                cols.map(c => h('td', { key: c.key, className: c.cls }, c.render(r, peerMed, scores)))
              );
            }),
            medRow
          )
        )
      )
    );
  }

  /* =========================================================================
     Sub-component: POSITIONING QUADRANT (div-based scatter)
     Supports: row-to-dot selection sync, color by verdict, overflow-safe labels.
     ========================================================================= */
  function PositioningQuadrant({ peers, scores, selectedSymbol, onDotClick }) {
    const [hovered, setHovered] = useState(null);
    const BOX_H = 340;
    const PAD   = 40; // inset so edge labels don't get clipped

    const coordRows = useMemo(() => buildQuadrantCoords(peers), [peers]);
    const maxMcap   = useMemo(() => Math.max(...peers.map(r => isNum(r.mcap) ? toN(r.mcap) : 0), 1), [peers]);

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Positioning Quadrant'),
        h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, 'x = cheaper → · y = higher quality ↑ · size ~ mcap'),
      ),

      h('div', { className: 'in-scatter', style: { height: BOX_H } },
        /* quadrant corner labels — inset from edges to avoid overflow */
        h('div', { className: 'in-axis-lbl', style: { top: PAD - 14, right: PAD, color: 'var(--pos,#19c37d)', opacity: 0.8 } }, 'Quality Value'),
        h('div', { className: 'in-axis-lbl', style: { top: PAD - 14, left: PAD, opacity: 0.55 } }, 'Quality Premium'),
        h('div', { className: 'in-axis-lbl', style: { bottom: PAD - 14, right: PAD, color: 'var(--in,#f5a623)', opacity: 0.65 } }, 'Value Trap?'),
        h('div', { className: 'in-axis-lbl', style: { bottom: PAD - 14, left: PAD, color: 'var(--neg,#ff5c70)', opacity: 0.8 } }, 'Avoid'),
        /* axis direction arrows — placed at the very edges, centered */
        h('div', { className: 'in-axis-lbl', style: { bottom: 6, left: '50%', transform: 'translateX(-50%)' } }, '← expensive  |  cheap →'),
        h('div', { className: 'in-axis-lbl', style: { left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center center', whiteSpace: 'nowrap' } }, 'low quality ↓'),
        h('div', { className: 'in-axis-lbl', style: { right: 4, top: '50%', transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'center center', whiteSpace: 'nowrap' } }, '↑ high quality'),

        /* dots */
        coordRows.map(r => {
          const s         = scores[r.symbol];
          const score     = s ? s.total : 50;
          const verdict   = s ? s.verdict : 'HOLD';
          const dotSize   = Math.max(9, Math.min(30, Math.sqrt((isNum(r.mcap) ? toN(r.mcap) : 0) / maxMcap) * 40));
          const xFrac     = clamp(r.qx, 0, 1);
          const yFrac     = clamp(1 - r.qy, 0, 1); // invert: high quality = top
          const dotOff    = Math.round(dotSize / 2);
          // Position within the PAD-inset drawable area
          const drawW     = 'calc(100% - ' + (PAD * 2) + 'px)';
          const drawH     = BOX_H - PAD * 2;
          const leftCalc  = 'calc(' + PAD + 'px + ' + (xFrac * 100).toFixed(2) + '% * ((100% - ' + (PAD * 2) + 'px) / 100%))';
          const topPx     = PAD + yFrac * (BOX_H - PAD * 2);
          const noVal     = r.noValuation;
          const isHov     = hovered === r.symbol;
          const isSel     = selectedSymbol === r.symbol;

          // Color by verdict
          const dotColor  = noVal
            ? 'rgba(255,255,255,0.15)'
            : score >= 65 ? 'var(--pos,#19c37d)'
            : score <= 40 ? 'var(--neg,#ff5c70)'
            : 'var(--in,#f5a623)';

          const borderStyle = isSel
            ? '2.5px solid rgba(255,255,255,1)'
            : isHov
              ? '2px solid rgba(255,255,255,0.85)'
              : noVal
                ? '1.5px dashed rgba(255,255,255,0.35)'
                : '1.5px solid rgba(0,0,0,0.25)';

          return h('div', {
            key: r.symbol,
            className: 'in-dot',
            onMouseEnter: () => setHovered(r.symbol),
            onMouseLeave: () => setHovered(null),
            onClick: () => onDotClick && onDotClick(r.symbol),
            style: {
              left:       PAD + xFrac * (coordRows.length > 1 ? (100 - 0) : 50) + '%', // fallback for single dot
              top:        topPx + 'px',
              width:      dotSize,
              height:     dotSize,
              background: dotColor,
              border:     borderStyle,
              opacity:    noVal ? 0.45 : (hovered && !isHov && !isSel) ? 0.25 : isSel ? 1 : 0.88,
              transform:  isSel
                ? 'translate(-50%, -50%) scale(1.22)'
                : 'translate(-50%, -50%)',
              display:    'flex', alignItems: 'center', justifyContent: 'center',
              fontSize:   Math.max(7, Math.min(10, dotSize * 0.36)),
              color:      noVal ? 'rgba(255,255,255,0.5)' : '#000',
              fontFamily: 'var(--font-mono,monospace)',
              fontWeight: 700,
              userSelect: 'none',
              overflow:   'hidden',
              cursor:     'pointer',
              zIndex:     isSel ? 15 : isHov ? 10 : 2,
            }
          },
            dotSize >= 16 ? r.symbol.slice(0, dotSize >= 24 ? 4 : 2) : null,
            /* hover tooltip */
            isHov && h('div', { className: 'in-dot-tip' },
              r.symbol + ' · Score ' + score +
              (noVal ? ' · no val data' : '') +
              ' · ' + (s ? (VERDICT_MAP[s.verdict] || { label: s.verdict }).label : '—')
            )
          );
        })
      ),

      /* legend */
      h('div', { className: 'in-qlg' },
        h('div', { className: 'in-qlg-item' }, h('div', { className: 'in-qlg-dot', style: { background: 'var(--pos,#19c37d)' } }), 'Score ≥ 65'),
        h('div', { className: 'in-qlg-item' }, h('div', { className: 'in-qlg-dot', style: { background: 'var(--in,#f5a623)' } }), 'Score 41–64'),
        h('div', { className: 'in-qlg-item' }, h('div', { className: 'in-qlg-dot', style: { background: 'var(--neg,#ff5c70)' } }), 'Score ≤ 40'),
        h('div', { className: 'in-qlg-item' }, h('div', { className: 'in-qlg-dot', style: { background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.35)' } }), 'No val data'),
        h('div', { style: { marginLeft: 'auto', fontFamily: 'var(--font-mono,monospace)', fontSize: 9.5, color: 'var(--text-tertiary,#8e9ab0)' } }, 'Dot size ~ mcap · click dot to highlight row')
      )
    );
  }

  /* =========================================================================
     Sub-component: MARKET-SHARE PROXY BAR
     Shares guaranteed to sum to 100% (positive-mcap denominator only).
     Shows concentration label: Top-3 = X%.
     ========================================================================= */
  function MarketShareBar({ peers, subSector }) {
    // Use only positive-mcap rows; totalMcap is the denominator so shares sum to 100%.
    const sorted = useMemo(() =>
      [...peers]
        .filter(r => isNum(r.mcap) && toN(r.mcap) > 0)
        .sort((a, b) => toN(b.mcap) - toN(a.mcap)),
    [peers]);

    const totalMcap = useMemo(() =>
      sorted.reduce((s, r) => s + toN(r.mcap), 0),
    [sorted]);

    if (!totalMcap) return null;

    const TOP      = 8;
    const top8     = sorted.slice(0, TOP);
    const rest     = sorted.slice(TOP);
    const restMcap = rest.reduce((s, r) => s + toN(r.mcap), 0);

    // Top-3 concentration
    const top3Mcap  = sorted.slice(0, 3).reduce((s, r) => s + toN(r.mcap), 0);
    const top3Pct   = totalMcap ? (top3Mcap / totalMcap * 100).toFixed(1) : null;
    const conc      = top3Pct ? 'Top-3 = ' + top3Pct + '%' : null;

    const COLORS = [
      'var(--in,#f5a623)', '#19c37d', '#4f86e0', '#b06ad6', '#5fd6d6',
      '#e08a4f', '#7fb6ff', '#6bbf8a',
    ];

    const bars = [
      ...top8.map((r, i) => ({ label: r.symbol, mcap: toN(r.mcap), color: COLORS[i % COLORS.length] })),
      ...(restMcap > 0 ? [{ label: 'Others (' + rest.length + ')', mcap: restMcap, color: 'rgba(255,255,255,0.12)' }] : []),
    ];

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary,#fff)' } }, 'Market-Share Proxy'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          conc && h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--in,#f5a623)', fontWeight: 700 } }, conc),
          h('div', { style: { fontFamily: 'var(--font-mono,monospace)', fontSize: 10, color: 'var(--text-tertiary,#8e9ab0)' } }, (subSector || 'sector') + ' · mcap weight'),
        ),
      ),
      // stacked bar — each segment width = share of positive-mcap total → sums to 100%
      h('div', { style: { display: 'flex', height: 28, borderRadius: 'var(--r-2,3px)', overflow: 'hidden', marginBottom: 10 } },
        bars.map(b => {
          const pct = (b.mcap / totalMcap) * 100;
          return h('div', { key: b.label, title: b.label + ' ' + pct.toFixed(1) + '%', style: { width: pct + '%', background: b.color, transition: 'width 0.3s', flexShrink: 0 } });
        })
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
    const [equity,    setEquity]    = useState(null);
    const [indByKey,  setIndByKey]  = useState({});
    const [loading,   setLoading]   = useState(true);
    const [err,       setErr]       = useState(null);
    const [toastNode, pushToast]    = useToast();

    // selector state
    const [selSector,    setSelSector]    = useState('Financials');
    const [selSubSector, setSelSubSector] = useState('');

    // modal state
    const [modalRow,      setModalRow]      = useState(null);
    const [modalScore,    setModalScore]    = useState(null);
    const [modalRankText, setModalRankText] = useState('');

    // cross-highlight: selected symbol (table row ↔ quadrant dot)
    const [selectedSymbol, setSelectedSymbol] = useState(null);

    // load equity + indicators in parallel once
    useEffect(() => {
      setLoading(true);
      Promise.all([fetchEquity(), fetchIndicators()])
        .then(([rows, inds]) => {
          setEquity(rows || []);
          const byKey = {};
          (inds || []).forEach(ind => { if (ind && ind.key) byKey[ind.key] = ind; });
          setIndByKey(byKey);
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

    // peer set
    const peers = useMemo(() => {
      if (!equity) return [];
      return equity.filter(r => r.sector === selSector && (!selSubSector || r.sub_sector === selSubSector));
    }, [equity, selSector, selSubSector]);

    // peer median
    const peerMed = useMemo(() => peers.length ? computePeerMed(peers) : {}, [peers]);

    // sector snapshot + conviction
    const snap       = useMemo(() => an.snapshot(peers), [peers]);
    const conviction = useMemo(() => an.conviction(snap), [snap]);

    // driver tilt (real from live indicators)
    const driverNet = useMemo(() => {
      if (!Object.keys(indByKey).length) return 0;
      const taxEntry = TAXONOMY.find(t => t.idxSector === selSector)
        || TAXONOMY.find(t => t.name === selSector);
      if (!taxEntry) return 0;
      const tilt = an.driverTilt(taxEntry, indByKey);
      return (tilt && tilt.net != null) ? tilt.net : 0;
    }, [selSector, indByKey]);

    // 6-dim scores
    const scores = useMemo(() => {
      if (!peers.length || !peerMed) return {};
      const out = {};
      peers.forEach(r => {
        try {
          out[r.symbol] = an.competitive(r, peers, { peerMed, conviction, driverNet });
        } catch (_) {
          // guard against any single-row crash
        }
      });
      return out;
    }, [peers, peerMed, conviction, driverNet]);

    // row click → open modal
    const handleRowClick = useCallback((row) => {
      const score = scores[row.symbol];
      if (!score) return;
      const sortedByScore = [...peers].sort((a, b) => (scores[b.symbol] ? scores[b.symbol].total : 0) - (scores[a.symbol] ? scores[a.symbol].total : 0));
      const rank = sortedByScore.findIndex(r => r.symbol === row.symbol) + 1;
      setModalRankText('Ranked #' + rank + ' of ' + peers.length + ' peers · Conviction ' + conviction + '/100');
      setModalRow(row);
      setModalScore(score);
    }, [scores, peers, conviction]);

    // dot click → highlight table row (and vice-versa via selectedSymbol)
    const handleDotClick = useCallback((symbol) => {
      setSelectedSymbol(prev => prev === symbol ? null : symbol);
    }, []);

    const handleQuadrantSync = useCallback((symbol) => {
      setSelectedSymbol(prev => prev === symbol ? null : symbol);
    }, []);

    if (loading) return h('div', { className: 'in-root' }, h(Spinner, { label: 'Loading equity data…' }));
    if (err)     return h('div', { className: 'in-root' }, h(Empty, { title: 'Error', sub: err }));
    if (!equity) return h('div', { className: 'in-root' }, h(Empty, { title: 'No data' }));

    const hasPeers = peers.length > 0;
    const statusMap = { BULLISH: 'bull', BEARISH: 'bear', ROTATION: 'rot', NEUTRAL: 'neu' };
    const status = an.status(conviction, snap);

    return h('div', { className: 'in-root' },
      toastNode,
      modalRow && h(TickerModal, { row: modalRow, score: modalScore, peers: peers, peerRankText: modalRankText, onClose: () => setModalRow(null) }),

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
                  snap.up + '↑ ' + snap.down + '↓ · breadth ' + Math.round((snap.breadth || 0) * 100) + '% · mcap-wtd ' + fmt.pct(snap.mcapChg)
                ),
              ),

              // STANDOUTS
              h('div', { className: 'in-panel', style: { padding: '12px 16px' } },
                h(StandoutsSummary, { peers, scores, peerMed })
              ),

              // PEER COMPS TABLE
              h('div', { className: 'in-panel', style: { padding: 0 } },
                h('div', { style: { padding: '14px 16px' } },
                  h(PeerCompsTable, {
                    peers, peerMed, scores, conviction,
                    onRowClick: handleRowClick,
                    selectedSymbol,
                    onQuadrantSync: handleQuadrantSync,
                  })
                )
              ),

              // QUADRANT + MARKET SHARE (2-col)
              h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 } },
                h('div', { className: 'in-panel' },
                  h(PositioningQuadrant, {
                    peers, scores,
                    selectedSymbol,
                    onDotClick: handleDotClick,
                  })
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
