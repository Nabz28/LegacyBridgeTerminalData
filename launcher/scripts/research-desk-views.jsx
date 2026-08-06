// ================================================================
// RESEARCH DESK · shared views (window.RD_VIEWS) — T12.
// Presentational building blocks: stance chips, conviction dots,
// machine-score bars, regime tags, inline SVG line charts, empty
// states, status chips. The workspace shell (research-desk-ws.jsx)
// wires them into pages.
// ================================================================
(function () {
  'use strict';

  const RD = () => window.RD;

  // ---- chips & indicators --------------------------------------------------
  const StanceChip = ({ stance, small, title }) => {
    const m = RD().stanceMeta(stance);
    return (
      <span className={'rd-stance ' + m.cls + (small ? ' sm' : '')} title={title || m.long}>
        {m.label}
      </span>
    );
  };

  const ConvictionDots = ({ n, max = 5 }) => (
    <span className="rd-conv" title={'conviction ' + (n == null ? '—' : n) + '/' + max}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={'d' + (n != null && i < n ? ' on' : '')} />
      ))}
    </span>
  );

  // machine score in [-2, +2]: center-anchored fill bar + mono value
  const ScoreBar = ({ score, w = 92 }) => {
    const v = score == null || isNaN(score) ? null : Math.max(-2, Math.min(2, Number(score)));
    const half = w / 2;
    const fill = v == null ? 0 : Math.abs(v) / 2 * half;
    return (
      <span className="rd-scorebar" title={'machine score ' + (v == null ? '—' : RD().fmt.signed(v, 2)) + ' (−2…+2)'}>
        <span className="track" style={{ width: w }}>
          <span className="mid" />
          {v != null && (
            <span className={'fill ' + (v >= 0 ? 'pos' : 'neg')}
                  style={v >= 0 ? { left: half, width: fill } : { left: half - fill, width: fill }} />
          )}
        </span>
        <span className={'v ' + (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '')}>
          {v == null ? '—' : RD().fmt.signed(v, 2)}
        </span>
      </span>
    );
  };

  const RegimeTag = ({ regime }) => (
    regime ? <span className="rd-regime" title="regime tag">{String(regime).toUpperCase()}</span> : null
  );

  const DirArrow = ({ direction, title }) => {
    const d = RD().dirGlyph(direction);
    return <span className={'rd-dir ' + d.cls} title={title || String(direction || '')}>{d.g}</span>;
  };

  const SalienceBadge = ({ v }) => {
    const n = v == null ? null : Math.max(0, Math.min(100, Number(v)));
    const cls = n == null ? '' : n >= 75 ? 'hot' : n >= 45 ? 'warm' : '';
    return <span className={'rd-sal ' + cls} title={'salience ' + (n == null ? '—' : n) + '/100'}>{n == null ? '—' : n}</span>;
  };

  const StatusChip = ({ label, cls, title }) => (
    <span className={'rd-chip ' + (cls || 'gray')} title={title}>{label}</span>
  );

  // ---- empty / error states ------------------------------------------------
  const Empty = ({ note, detail }) => (
    <div className="rd-empty">
      <div className="glyph">◌</div>
      <div className="t">{note || 'No data yet'}</div>
      <div className="s">{detail || 'The pipeline runs tonight — this fills in on the first nightly cycle.'}</div>
    </div>
  );

  const ErrNote = ({ err, onRetry }) => (
    <div className="rd-errnote">
      <span>⚠ {String(err)}</span>
      {onRetry && <button type="button" className="rd-btn ghost" onClick={onRetry}>Retry</button>}
    </div>
  );

  const Loading = ({ label }) => (
    <div className="rd-loading">{label || 'loading…'}</div>
  );

  // ---- inline SVG line chart ----------------------------------------------
  // series: [{ label, points: [[dateStr, value], ...], color? }]
  // Renders responsive (viewBox) with min/max gridlines + first/last dates.
  const PALETTE = ['#66c6e8', '#d8a13a', '#19C37D', '#b8a7f0', '#F0475C', '#97AAC5'];
  const LineChart = ({ series, h = 120, yFmt, title }) => {
    const W = 640, PADL = 6, PADR = 52, PADT = 8, PADB = 16;
    const fmt = RD().fmt;
    const yf = yFmt || ((v) => fmt.num(v, Math.abs(v) >= 100 ? 0 : 2));
    const all = (series || []).flatMap((s) => (s.points || []).map((p) => Number(p[1]))).filter((v) => !isNaN(v));
    if (!all.length) return <div className="rd-chart-none">no observations yet</div>;
    let min = Math.min(...all), max = Math.max(...all);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.06; min -= pad; max += pad;
    const iw = W - PADL - PADR, ih = h - PADT - PADB;
    const y = (v) => PADT + (1 - (v - min) / (max - min)) * ih;
    const firstS = (series || []).find((s) => s.points && s.points.length) || { points: [] };
    const firstDate = firstS.points.length ? firstS.points[0][0] : null;
    const lastDate = firstS.points.length ? firstS.points[firstS.points.length - 1][0] : null;
    const path = (pts) => {
      const n = pts.length;
      if (!n) return '';
      const x = (i) => PADL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
      return pts.map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(Number(p[1])).toFixed(1)).join(' ');
    };
    const gridY = [max - pad, (min + max) / 2, min + pad];
    return (
      <div className="rd-chart">
        {title && <div className="rd-chart-t">{title}</div>}
        <svg viewBox={'0 0 ' + W + ' ' + h} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
          {gridY.map((g, i) => (
            <g key={i}>
              <line x1={PADL} x2={W - PADR} y1={y(g)} y2={y(g)} className="rd-chart-grid" />
              <text x={W - PADR + 5} y={y(g) + 3} className="rd-chart-yl">{yf(g)}</text>
            </g>
          ))}
          {(series || []).map((s, i) => (
            <path key={i} d={path(s.points || [])} fill="none"
                  stroke={s.color || PALETTE[i % PALETTE.length]} strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="rd-chart-x">
          <span>{firstDate ? RD().fmt.dstr(firstDate) : ''}</span>
          {(series || []).length > 1 && (
            <span className="rd-chart-leg">
              {series.map((s, i) => (
                <span key={i}><i style={{ background: s.color || PALETTE[i % PALETTE.length] }} />{s.label}</span>
              ))}
            </span>
          )}
          <span>{lastDate ? RD().fmt.dstr(lastDate) : ''}</span>
        </div>
      </div>
    );
  };

  // tiny sparkline for card footers / history strips
  const Spark = ({ values, w = 84, h = 22, color }) => {
    const v = (values || []).filter((x) => x != null && !isNaN(x));
    if (v.length < 2) return null;
    let min = Math.min(...v), max = Math.max(...v);
    if (min === max) { min -= 1; max += 1; }
    const x = (i) => (i / (v.length - 1)) * (w - 2) + 1;
    const y = (val) => 1 + (1 - (val - min) / (max - min)) * (h - 2);
    const d = v.map((val, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(val).toFixed(1)).join(' ');
    return (
      <svg width={w} height={h} className="rd-spark">
        <path d={d} fill="none" stroke={color || 'var(--brand)'} strokeWidth="1.2" />
      </svg>
    );
  };

  // ---- dial history strip (last 30 asof) -----------------------------------
  // one column per asof: stance-colored block, height ∝ |machine_score|
  const HistoryStrip = ({ rows }) => {
    if (!rows || !rows.length) return <Empty note="No dial history yet" detail="History accrues one row per nightly run." />;
    const asc = [...rows].reverse();
    return (
      <div className="rd-hist" title="last 30 dials — color: stance, bar: machine score">
        {asc.map((r, i) => {
          const m = RD().stanceMeta(r.stance);
          const sc = r.machine_score == null ? 0 : Math.max(-2, Math.min(2, Number(r.machine_score)));
          const hh = 4 + Math.abs(sc) / 2 * 18;
          return (
            <div key={i} className="rd-hist-col"
                 title={RD().fmt.dstr(r.asof) + ' · ' + (r.stance || '—') + ' · score ' + RD().fmt.signed(r.machine_score, 2) + (r.regime ? ' · ' + r.regime : '')}>
              <div className={'bar ' + m.cls + (sc < 0 ? ' below' : '')} style={{ height: hh }} />
            </div>
          );
        })}
      </div>
    );
  };

  // ---- signal row (shared by feed + desk detail) ---------------------------
  const SignalRow = ({ sig, deskName, scores, onOpenDesk }) => {
    const fmt = RD().fmt;
    const sc = scores || [];
    return (
      <div className="rd-sigrow">
        <SalienceBadge v={sig.salience} />
        <span className="kind">{sig.kind}</span>
        <DirArrow direction={sig.direction} />
        <span className="head" title={sig.ref || ''}>{sig.headline || '(no headline)'}</span>
        {sc.map((s, i) => (
          <span key={i} className={'rd-score ' + (s.hit === true ? 'pos' : s.hit === false ? 'neg' : 'gray')}
                title={'+' + s.horizon_days + 'd realized ' + fmt.pct(s.realized_ret == null ? null : Number(s.realized_ret) * 100, 2)}>
            {s.hit === true ? '✓' : s.hit === false ? '✗' : '·'}{s.horizon_days}d
            {s.realized_ret != null && <b>{fmt.pct(Number(s.realized_ret) * 100, 1)}</b>}
          </span>
        ))}
        {deskName && (
          <button type="button" className="desk" onClick={onOpenDesk} title="open desk">{deskName}</button>
        )}
        <span className="asof">{fmt.dstr(sig.asof)}</span>
      </div>
    );
  };

  window.RD_VIEWS = {
    StanceChip, ConvictionDots, ScoreBar, RegimeTag, DirArrow, SalienceBadge, StatusChip,
    Empty, ErrNote, Loading, LineChart, Spark, HistoryStrip, SignalRow, PALETTE,
  };
})();
