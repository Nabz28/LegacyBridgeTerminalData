// ================================================================
// Shared chart components — used across workspaces
// CandleChart, AreaChart, ColumnChart, MicroSpark, ForceGraph
// All inherit dashboard tokens; no new visual language.
// ================================================================

// ----------------------------------------------------------------
// CandleChart — full TradingView-style chart with volume + grid
// ----------------------------------------------------------------
const CandleChart = ({
  candles,
  height = 360,
  showVolume = true,
  showMA = true,
  showBollinger = false,
  showRSI = false,
  rightPad = 60,
  topPad = 24,
  bottomPad = 24,
  symbol,
  meta,
}) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(900);
  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(320, e.contentRect.width));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const volH = showVolume ? 64 : 0;
  const rsiH = showRSI ? 56 : 0;
  const priceH = height - volH - rsiH - topPad - bottomPad - (showVolume ? 8 : 0) - (showRSI ? 8 : 0);

  const min = Math.min(...candles.map(c => c.l));
  const max = Math.max(...candles.map(c => c.h));
  const pad = (max - min) * 0.05;
  const yMin = min - pad;
  const yMax = max + pad;

  const innerW = w - rightPad - 8;
  const cw = innerW / candles.length;
  const bodyW = Math.max(1.2, cw * 0.62);

  const py = (p) => topPad + ((yMax - p) / (yMax - yMin)) * priceH;
  const cx = (i) => 8 + i * cw + cw / 2;

  // MA20, MA50
  const ma = (n) => candles.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let k = 0; k < n; k++) s += candles[i - k].c;
    return s / n;
  });
  const ma20 = ma(20);
  const ma50 = ma(50);

  // Bollinger
  let bbU = [], bbL = [];
  if (showBollinger) {
    const period = 20;
    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) { bbU.push(null); bbL.push(null); continue; }
      let s = 0; for (let k = 0; k < period; k++) s += candles[i-k].c;
      const m = s / period;
      let v = 0; for (let k = 0; k < period; k++) v += Math.pow(candles[i-k].c - m, 2);
      const sd = Math.sqrt(v / period);
      bbU.push(m + 2 * sd); bbL.push(m - 2 * sd);
    }
  }

  // RSI(14)
  let rsi = [];
  if (showRSI) {
    const period = 14;
    let avgU = 0, avgD = 0;
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) { rsi.push(null); continue; }
      const ch = candles[i].c - candles[i-1].c;
      const u = Math.max(0, ch), d = Math.max(0, -ch);
      if (i <= period) {
        avgU += u; avgD += d;
        if (i === period) {
          avgU /= period; avgD /= period;
          const rs = avgD ? avgU / avgD : 0;
          rsi.push(100 - 100 / (1 + rs));
        } else rsi.push(null);
      } else {
        avgU = (avgU * (period - 1) + u) / period;
        avgD = (avgD * (period - 1) + d) / period;
        const rs = avgD ? avgU / avgD : 0;
        rsi.push(100 - 100 / (1 + rs));
      }
    }
  }

  // Volume
  const vMax = Math.max(...candles.map(c => c.v || 0));
  const volTop = topPad + priceH + 8;
  const vy = (v) => volTop + (1 - v / vMax) * volH;

  // RSI panel
  const rsiTop = volTop + volH + 8;
  const ry = (v) => rsiTop + (1 - v / 100) * rsiH;

  // Y-axis labels (price)
  const nLabels = 6;
  const yLabels = [];
  for (let i = 0; i <= nLabels; i++) {
    const p = yMin + (yMax - yMin) * (i / nLabels);
    yLabels.push({ p, y: py(p) });
  }

  // X-axis labels (every Nth)
  const everyN = Math.max(1, Math.floor(candles.length / 8));
  const xLabels = candles.filter((_, i) => i % everyN === 0).map((c, j) => ({
    label: c.t || c.label || '',
    x: cx(everyN * j),
  }));

  // Crosshair state
  const [hover, setHover] = React.useState(null);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((x - 8) / cw)));
    const cy = e.clientY - rect.top;
    setHover({ idx, x: cx(idx), y: cy });
  };
  const onLeave = () => setHover(null);

  const last = candles[candles.length - 1];
  const lastY = py(last.c);

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
      <svg
        width={w}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ display: 'block', cursor: 'crosshair' }}
      >
        {/* grid */}
        {yLabels.map((l, i) => (
          <line key={`h${i}`} x1={8} x2={innerW + 8} y1={l.y} y2={l.y}
                stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 4" />
        ))}
        {xLabels.map((l, i) => (
          <line key={`v${i}`} x1={l.x} x2={l.x} y1={topPad} y2={topPad + priceH}
                stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 4" />
        ))}

        {/* Bollinger band fill */}
        {showBollinger && (() => {
          const ptsU = bbU.map((v, i) => v == null ? null : `${cx(i)},${py(v)}`).filter(Boolean);
          const ptsL = bbL.map((v, i) => v == null ? null : `${cx(i)},${py(v)}`).filter(Boolean).reverse();
          return (
            <polygon
              points={[...ptsU, ...ptsL].join(' ')}
              fill="rgba(151,170,197,0.06)"
              stroke="none"
            />
          );
        })()}

        {/* MA20 */}
        {showMA && (
          <polyline
            fill="none" stroke="#F5B544" strokeWidth="1.2"
            points={ma20.map((v, i) => v == null ? null : `${cx(i)},${py(v)}`).filter(Boolean).join(' ')}
          />
        )}
        {/* MA50 */}
        {showMA && (
          <polyline
            fill="none" stroke="#5B8DEF" strokeWidth="1.2"
            points={ma50.map((v, i) => v == null ? null : `${cx(i)},${py(v)}`).filter(Boolean).join(' ')}
          />
        )}

        {/* Candles */}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const color = up ? 'var(--pos)' : 'var(--neg)';
          const x = cx(i);
          const top = py(Math.max(c.o, c.c));
          const bot = py(Math.min(c.o, c.c));
          const bh = Math.max(1, bot - top);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={py(c.h)} y2={py(c.l)} stroke={color} strokeWidth="1" />
              <rect x={x - bodyW/2} y={top} width={bodyW} height={bh}
                    fill={up ? 'rgba(31,184,119,0.85)' : color} stroke={color} strokeWidth="0.6" />
            </g>
          );
        })}

        {/* y-axis labels */}
        {yLabels.map((l, i) => (
          <text key={`yl${i}`} x={innerW + 14} y={l.y + 3}
                fill="var(--text-tertiary)" fontSize="9.5" fontFamily="var(--font-mono)">
            {fmt.num(l.p, 0)}
          </text>
        ))}

        {/* current price tag */}
        <line x1={8} x2={innerW + 8} y1={lastY} y2={lastY}
              stroke={last.c >= last.o ? 'var(--pos)' : 'var(--neg)'}
              strokeWidth="0.5" strokeDasharray="3 3" opacity="0.7" />
        <rect x={innerW + 10} y={lastY - 9} width={48} height={18}
              fill={last.c >= last.o ? 'var(--pos)' : 'var(--neg)'} rx="2" />
        <text x={innerW + 34} y={lastY + 3}
              fill="#000" fontSize="10" fontWeight="700"
              fontFamily="var(--font-mono)" textAnchor="middle">
          {fmt.num(last.c, 0)}
        </text>

        {/* Volume */}
        {showVolume && (
          <>
            {candles.map((c, i) => {
              const up = c.c >= c.o;
              return (
                <rect key={`v${i}`} x={cx(i) - bodyW/2} y={vy(c.v)}
                      width={bodyW} height={volTop + volH - vy(c.v)}
                      fill={up ? 'rgba(31,184,119,0.4)' : 'rgba(240,71,92,0.4)'} />
              );
            })}
            <text x={10} y={volTop + 12} fill="var(--text-tertiary)"
                  fontSize="9.5" fontFamily="var(--font-mono)">VOL</text>
          </>
        )}

        {/* RSI */}
        {showRSI && (
          <>
            <line x1={8} x2={innerW+8} y1={ry(70)} y2={ry(70)} stroke="var(--border-subtle)" strokeDasharray="2 3" />
            <line x1={8} x2={innerW+8} y1={ry(30)} y2={ry(30)} stroke="var(--border-subtle)" strokeDasharray="2 3" />
            <line x1={8} x2={innerW+8} y1={ry(50)} y2={ry(50)} stroke="var(--border-subtle)" strokeDasharray="1 4" opacity="0.5" />
            <polyline fill="none" stroke="#5B8DEF" strokeWidth="1.2"
              points={rsi.map((v, i) => v == null ? null : `${cx(i)},${ry(v)}`).filter(Boolean).join(' ')}
            />
            <text x={10} y={rsiTop + 12} fill="var(--text-tertiary)"
                  fontSize="9.5" fontFamily="var(--font-mono)">RSI(14)</text>
          </>
        )}

        {/* x-axis labels */}
        {xLabels.map((l, i) => (
          <text key={`xl${i}`} x={l.x} y={height - 6}
                fill="var(--text-tertiary)" fontSize="9.5"
                fontFamily="var(--font-mono)" textAnchor="middle">
            {l.label}
          </text>
        ))}

        {/* Crosshair */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={topPad} y2={topPad + priceH + volH + (showVolume ? 8 : 0) + (showRSI ? rsiH + 8 : 0)}
                  stroke="rgba(151,170,197,0.4)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={8} x2={innerW + 8} y1={hover.y} y2={hover.y}
                  stroke="rgba(151,170,197,0.4)" strokeWidth="0.5" strokeDasharray="3 3" />
          </>
        )}
      </svg>

      {/* OHLCV tooltip */}
      {hover && candles[hover.idx] && (
        <div style={{
          position: 'absolute', top: 4, left: 12,
          background: 'rgba(0,0,0,0.86)',
          border: '1px solid var(--border-strong)',
          padding: '6px 10px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          display: 'flex', gap: 12, alignItems: 'center',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(6px)',
        }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{candles[hover.idx].t}</span>
          <span>O <span style={{ color: 'var(--text-primary)' }}>{fmt.num(candles[hover.idx].o, 0)}</span></span>
          <span>H <span style={{ color: 'var(--pos)' }}>{fmt.num(candles[hover.idx].h, 0)}</span></span>
          <span>L <span style={{ color: 'var(--neg)' }}>{fmt.num(candles[hover.idx].l, 0)}</span></span>
          <span>C <span style={{ color: 'var(--text-primary)' }}>{fmt.num(candles[hover.idx].c, 0)}</span></span>
          <span style={{ color: 'var(--text-tertiary)' }}>V</span>
          <span>{fmt.num(candles[hover.idx].v, 0)}</span>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// AreaChart — for macro indicators (Statista-style filled line)
// ----------------------------------------------------------------
const AreaChart = ({ data, labels, unit = '', height = 220, color = 'var(--brand-steel)', showAxis = true, showLast = true, baseline }) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(600);
  const [hover, setHover] = React.useState(null);   // { idx, x }
  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(160, e.contentRect.width));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || !data.length) return <div ref={wrapRef} style={{ height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = (max - min) * 0.08 || 1;
  const yMin = min - pad, yMax = max + pad;
  const padL = showAxis ? 38 : 4;
  const padR = 8, padT = 8, padB = showAxis ? 18 : 4;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const denom = data.length > 1 ? data.length - 1 : 1;
  const px = (i) => padL + (i / denom) * innerW;
  const py = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const linePts = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const areaPts = [
    `${padL},${padT + innerH}`,
    ...linePts,
    `${padL + innerW},${padT + innerH}`,
  ];

  const last = data[data.length - 1];
  const lastY = py(last);
  const baseY = baseline != null ? py(baseline) : null;

  // Crosshair — snap to nearest data point under the cursor.
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let idx = Math.round(((x - padL) / innerW) * denom);
    idx = Math.max(0, Math.min(data.length - 1, idx));
    setHover({ idx, x: px(idx) });
  };
  const onLeave = () => setHover(null);
  const fmtVal = (v) => fmt.num(v, Math.abs(v) < 10 ? 2 : 0);
  // Tooltip x, clamped inside the chart so it never overflows the wrap.
  const tipW = 132;
  const tipLeft = hover ? Math.max(padL, Math.min(hover.x - tipW / 2, w - tipW - 4)) : 0;

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={onLeave}
           style={{ display: 'block', cursor: 'crosshair' }}>
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showAxis && [0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const v = yMin + (yMax - yMin) * (1 - p);
          const y = padT + p * innerH;
          return (
            <g key={i}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y}
                    stroke="var(--border-subtle)" strokeDasharray="2 4" strokeWidth="0.5" />
              <text x={padL - 5} y={y + 3} fill="var(--text-tertiary)"
                    fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="end">
                {fmt.num(v, Math.abs(yMax) < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {baseY != null && (
          <line x1={padL} x2={padL + innerW} y1={baseY} y2={baseY}
                stroke="var(--text-tertiary)" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.6" />
        )}
        <polygon points={areaPts.join(' ')} fill="url(#areaG)" />
        <polyline points={linePts.join(' ')} fill="none" stroke={color} strokeWidth="1.4" />
        {showLast && !hover && (
          <>
            <circle cx={px(data.length-1)} cy={lastY} r="2.5" fill={color} />
            <circle cx={px(data.length-1)} cy={lastY} r="5" fill={color} opacity="0.18" />
          </>
        )}
        {/* Crosshair: faded vertical dashed line + point readout */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + innerH}
                  stroke="rgba(151,170,197,0.45)" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx={hover.x} cy={py(data[hover.idx])} r="6" fill={color} opacity="0.2" />
            <circle cx={hover.x} cy={py(data[hover.idx])} r="3" fill={color} stroke="#020203" strokeWidth="1" />
          </>
        )}
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', top: 4, left: tipLeft, width: tipW,
          background: 'rgba(0,0,0,0.86)', border: '1px solid var(--border-strong, rgba(255,255,255,0.18))',
          padding: '5px 8px', borderRadius: 4, pointerEvents: 'none',
          fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.35,
          backdropFilter: 'blur(6px)', boxSizing: 'border-box',
        }}>
          <div style={{ color: 'var(--text-tertiary)' }}>{labels && labels[hover.idx] != null ? labels[hover.idx] : '#' + hover.idx}</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmtVal(data[hover.idx])}{unit ? ' ' + unit : ''}</div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// ColumnChart — bars (financial flows, balance position)
// ----------------------------------------------------------------
const ColumnChart = ({ data, height = 160, posColor = 'var(--pos)', negColor = 'var(--neg)' }) => {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(600);
  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(160, e.contentRect.width));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const vals = data.map(d => d.v);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const padL = 32, padR = 8, padT = 8, padB = 18;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const cw = innerW / data.length;
  const bw = Math.max(1, cw * 0.65);
  const py = (v) => padT + (1 - (v - min) / (max - min)) * innerH;
  const zeroY = py(0);

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        <line x1={padL} x2={padL + innerW} y1={zeroY} y2={zeroY}
              stroke="var(--border-default)" strokeWidth="0.6" />
        {data.map((d, i) => {
          const cx = padL + i * cw + cw / 2;
          const y = py(d.v);
          const top = Math.min(y, zeroY);
          const h = Math.abs(y - zeroY);
          return (
            <rect key={i} x={cx - bw/2} y={top} width={bw} height={Math.max(1, h)}
                  fill={d.v >= 0 ? posColor : negColor} opacity="0.85" rx="1" />
          );
        })}
        {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
          <text key={`l${i}`} x={padL + i * cw + cw/2} y={height - 5}
                fill="var(--text-tertiary)" fontSize="9.5"
                fontFamily="var(--font-mono)" textAnchor="middle">{d.label}</text>
        ))}
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------
// Helper: build sample candle series for a symbol
// ----------------------------------------------------------------
function buildCandles(n = 90, start = 9000, vol = 0.018, drift = 0.0008) {
  const out = [];
  let px = start;
  const today = new Date('2026-05-01');
  for (let i = 0; i < n; i++) {
    const open = px;
    const dr = drift + (Math.random() - 0.5) * vol;
    const close = open * (1 + dr);
    const high = Math.max(open, close) * (1 + Math.random() * vol * 0.7);
    const low  = Math.min(open, close) * (1 - Math.random() * vol * 0.7);
    const v = Math.round((Math.random() * 0.6 + 0.7) * 1.4e6);
    const d = new Date(today);
    d.setDate(d.getDate() - (n - i));
    const t = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    out.push({ t, o: +open.toFixed(0), h: +high.toFixed(0), l: +low.toFixed(0), c: +close.toFixed(0), v });
    px = close;
  }
  return out;
}

window.ChartLib = { CandleChart, AreaChart, ColumnChart, buildCandles };
