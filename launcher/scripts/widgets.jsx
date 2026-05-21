// ================================================================
// Widgets — individual widget body components
// Shared data fed via props from app.jsx
// ================================================================

const { useState, useMemo, useEffect, useRef } = React;

// --------- Small UI helpers ---------
const Spark = ({ data, color, h = 28, w = 80, fill = true }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return [x, y];
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const fillPath = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {fill && <path d={fillPath} fill={color} opacity="0.12" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
};

const fmt = {
  num: (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }),
  pct: (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`,
  delta: (n) => `${n >= 0 ? '+' : ''}${n.toLocaleString('en-US')}`,
  abbr: (n) => {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
  },
  money: (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

// --------- WATCHLIST ---------
const Watchlist = ({ data, onSelect, selected }) => {
  const [tab, setTab] = useState('Banks');
  const TABS = ['Banks', 'Tech', 'Energy', 'Crypto', 'Commodities'];
  const rows = data.watchlist[tab] || [];
  return (
    <div className="wl-wrap">
      <div className="wl-tabs">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            className={`wl-tab ${tab === t ? 'is-on' : ''}`}
            onClick={() => setTab(t)}
          >{t}</button>
        ))}
      </div>
      <div className="wl-body">
        <table className="data-tbl wl-tbl">
          <colgroup>
            <col className="wl-c-sym" />
            <col className="wl-c-last" />
            <col className="wl-c-chg" />
            <col className="wl-c-chgp" />
            <col className="wl-c-vol" />
            <col className="wl-c-spk" />
          </colgroup>
          <thead>
            <tr>
              <th className="wl-l">Symbol</th>
              <th className="wl-r">Last</th>
              <th className="wl-r">Chg</th>
              <th className="wl-r">Chg %</th>
              <th className="wl-r">Vol</th>
              <th className="wl-c">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.sym}
                className={selected === r.sym ? 'sel' : ''}
                onClick={() => onSelect && onSelect(r.sym)}>
                <td className="wl-l sym-cell">
                  <span className="sym">{r.sym}</span>
                  <span className="sub">{r.name}</span>
                </td>
                <td className="wl-r">{fmt.num(r.last, r.last < 100 ? 2 : 0)}</td>
                <td className="wl-r"><span className={`chg-text ${r.chg >= 0 ? 'pos' : 'neg'}`}>{fmt.delta(r.chg)}</span></td>
                <td className="wl-r"><span className={`chg-text ${r.chgp >= 0 ? 'pos' : 'neg'}`}>{fmt.pct(r.chgp)}</span></td>
                <td className="wl-r">{fmt.abbr(r.vol)}</td>
                <td className="wl-c wl-spk-cell"><Spark data={r.spark} color={r.chgp >= 0 ? 'var(--pos)' : 'var(--neg)'} h={20} w={56} /></td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --------- TRADE TAPE ---------
const TradeTape = ({ data }) => {
  const [trades, setTrades] = useState(data.trades);
  useEffect(() => {
    const tick = setInterval(() => {
      const last = trades[0];
      const dir = Math.random() > 0.5 ? 1 : -1;
      const px = +(last.px + (Math.random() - 0.5) * 20).toFixed(0);
      const qty = Math.floor(Math.random() * 50 + 1);
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setTrades(t => [{ time, px, qty, dir: dir > 0 ? 'B' : 'S' }, ...t].slice(0, 80));
    }, 1800);
    return () => clearInterval(tick);
  }, []);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <table className="data-tbl compact">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Time</th>
            <th>Px</th>
            <th>Qty</th>
            <th>Σ</th>
            <th>Buyer</th>
            <th>Seller</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.time}</td>
              <td className={`num ${t.dir === 'B' ? 'pos' : 'neg'}`}>{fmt.num(t.px)}</td>
              <td className="num">{t.qty}</td>
              <td className="num" style={{ color: 'var(--text-tertiary)' }}>{fmt.num(t.qty * t.px * 100)}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{['RG','CC','MS','UB','DX','KZ'][i % 6]}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{['ZP','YP','XA','NI','YU','CG'][i % 6]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --------- ORDER BOOK ---------
const OrderBook = ({ data }) => {
  const book = data.orderbook;
  const maxVol = Math.max(...book.bids.map(b => b.vol), ...book.asks.map(a => a.vol));
  // Spread + last-trade
  const bestBid = book.bids[0]?.px || 10075;
  const bestAsk = book.asks[0]?.px || 10080;
  const spread = bestAsk - bestBid;
  const mid = (bestBid + bestAsk) / 2;
  const spreadBps = ((spread / mid) * 10000);

  // Cumulative depth for the depth curve
  const cumBids = book.bids.reduce((acc, b) => {
    const prev = acc.length ? acc[acc.length - 1].cum : 0;
    acc.push({ px: b.px, cum: prev + b.vol });
    return acc;
  }, []);
  const cumAsks = book.asks.reduce((acc, a) => {
    const prev = acc.length ? acc[acc.length - 1].cum : 0;
    acc.push({ px: a.px, cum: prev + a.vol });
    return acc;
  }, []);
  const allPx = [...cumBids, ...cumAsks].map(x => x.px);
  const minPx = Math.min(...allPx), maxPx = Math.max(...allPx);
  const pxRange = maxPx - minPx || 1;
  const cumMax = Math.max(
    cumBids[cumBids.length - 1]?.cum || 1,
    cumAsks[cumAsks.length - 1]?.cum || 1,
  );
  const W = 320, H = 70;
  const xPx = (px) => ((px - minPx) / pxRange) * W;
  const yCum = (c) => H - (c / cumMax) * (H - 6) - 2;
  const bidPath = cumBids
    .slice().reverse() // ascending price for bids
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xPx(p.px).toFixed(1)},${yCum(p.cum).toFixed(1)}`)
    .join(' ');
  const askPath = cumAsks
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xPx(p.px).toFixed(1)},${yCum(p.cum).toFixed(1)}`)
    .join(' ');

  // Last trades strip
  const lastTrades = Array.from({ length: 5 }).map((_, i) => ({
    t: `14:58:${(20 - i).toString().padStart(2, '0')}`,
    px: bestBid + (i % 2 === 0 ? 5 : 0),
    vol: 12 + i * 3,
    side: i % 2 === 0 ? 'buy' : 'sell',
  }));

  return (
    <div className="ob-wrap">
      {/* Top: spread + best bid/ask */}
      <div className="ob-spread">
        <div className="ob-spread-side ob-spread-side--bid">
          <span className="ob-spread-l">Best Bid</span>
          <b className="pos">{fmt.num(bestBid)}</b>
          <span className="ob-spread-vol">{fmt.num(book.bids[0]?.lot || 0)} lot</span>
        </div>
        <div className="ob-spread-mid">
          <span>SPREAD</span>
          <b>{spread.toFixed(0)}</b>
          <span className="ob-spread-bps">{spreadBps.toFixed(1)} bps</span>
        </div>
        <div className="ob-spread-side ob-spread-side--ask">
          <span className="ob-spread-l">Best Ask</span>
          <b className="neg">{fmt.num(bestAsk)}</b>
          <span className="ob-spread-vol">{fmt.num(book.asks[0]?.lot || 0)} lot</span>
        </div>
      </div>

      {/* Depth curve */}
      <div className="ob-depth">
        <span className="ob-depth-l">Market depth</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <path d={`${bidPath} L${xPx(bestBid).toFixed(1)},${H} L${xPx(cumBids[cumBids.length-1].px).toFixed(1)},${H} Z`} fill="rgba(25,195,125,0.18)" stroke="var(--pos)" strokeWidth="1" />
          <path d={`${askPath} L${xPx(cumAsks[cumAsks.length-1].px).toFixed(1)},${H} L${xPx(bestAsk).toFixed(1)},${H} Z`} fill="rgba(255,92,112,0.18)" stroke="var(--neg)" strokeWidth="1" />
          <line x1={xPx(mid)} x2={xPx(mid)} y1="0" y2={H} stroke="var(--brand)" strokeWidth="0.6" strokeDasharray="2 3" />
        </svg>
      </div>

      {/* Order book bid/ask grid */}
      <div className="ob-grid">
        <div className="ob-col-h ob-col-h--bid"><span>#</span><span>Size</span><span>Bid</span></div>
        <div className="ob-col-h ob-col-h--ask"><span>Ask</span><span>Size</span><span>#</span></div>
        <div className="ob-col">
          {book.bids.slice(0, 8).map((b, i) => (
            <div key={i} className="ob-row bid">
              <div className="bg-fill" style={{ width: `${(b.vol / maxVol) * 100}%` }} />
              <span className="num">{b.freq}</span>
              <span className="num">{fmt.num(b.lot)}</span>
              <span className="num pos">{fmt.num(b.px)}</span>
            </div>
          ))}
        </div>
        <div className="ob-col">
          {book.asks.slice(0, 8).map((a, i) => (
            <div key={i} className="ob-row ask">
              <div className="bg-fill" style={{ width: `${(a.vol / maxVol) * 100}%` }} />
              <span className="num neg">{fmt.num(a.px)}</span>
              <span className="num">{fmt.num(a.lot)}</span>
              <span className="num">{a.freq}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last trades strip */}
      <div className="ob-trades">
        <div className="ob-trades-h">Last trades</div>
        <ul>
          {lastTrades.map((t, i) => (
            <li key={i} className={t.side === 'buy' ? 'pos' : 'neg'}>
              <span className="ob-trades-t">{t.t}</span>
              <span className="ob-trades-px">{fmt.num(t.px)}</span>
              <span className="ob-trades-vol">{t.vol}</span>
              <span className="ob-trades-side">{t.side === 'buy' ? '↑ buy' : '↓ sell'}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer totals */}
      <div className="ob-foot">
        <span><span className="ob-foot-l">Bid Σ </span><b className="pos">{fmt.num(book.bidTotal)}</b></span>
        <span className="ob-foot-l">{fmt.num(book.bidTotal + book.askTotal)} TOTAL</span>
        <span><b className="neg">{fmt.num(book.askTotal)}</b><span className="ob-foot-l"> Σ Ask</span></span>
      </div>
    </div>
  );
};

// --------- CHART (candlestick) ---------
const Chart = ({ data, symbol = 'BBCA' }) => {
  const [tf, setTf] = useState('3M');
  const [showVol, setShowVol] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const candles = data.candles;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const chg = last.c - prev.c;
  const chgPct = (chg / prev.c) * 100;

  const w = 800, h = 240, vh = 48;
  const pad = { l: 8, r: 56, t: 8, b: 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const min = Math.min(...candles.map(c => c.l));
  const max = Math.max(...candles.map(c => c.h));
  const range = max - min || 1;
  const cw = pw / candles.length;
  const y = (v) => pad.t + (1 - (v - min) / range) * ph;
  const lastY = y(last.c);

  // simple MA(20)
  const ma20 = candles.map((_, i) => {
    if (i < 19) return null;
    const slice = candles.slice(i - 19, i + 1);
    return slice.reduce((s, c) => s + c.c, 0) / 20;
  });

  // volume axis
  const vmax = Math.max(...candles.map(c => c.v || 0)) || 1;
  const yv = (v) => h + 4 + (1 - v / vmax) * (vh - 8);

  const meta = {
    BBCA: { name: 'Bank Central Asia Tbk',  exch: 'IDX' },
    BBRI: { name: 'Bank Rakyat Indonesia',  exch: 'IDX' },
    BMRI: { name: 'Bank Mandiri',            exch: 'IDX' },
    TLKM: { name: 'Telkom Indonesia',        exch: 'IDX' },
    ASII: { name: 'Astra International',     exch: 'IDX' },
  }[symbol] || { name: symbol, exch: 'IDX' };

  return (
    <div className="cw-wrap">
      {/* INSTRUMENT HEADER */}
      <div className="cw-instr">
        <div className="cw-instr-l">
          <span className="cw-sym">{symbol}</span>
          <span className="cw-name">{meta.name}</span>
          <span className="cw-ex">{meta.exch}</span>
        </div>
        <div className="cw-instr-r">
          <span className="cw-last">{fmt.num(last.c)}</span>
          <span className={`cw-chg ${chg >= 0 ? 'pos' : 'neg'}`}>
            {chg >= 0 ? '+' : ''}{fmt.num(chg)} ({chg >= 0 ? '+' : ''}{chgPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* OHLC + TOOLBAR ROW */}
      <div className="cw-tools">
        <span className="cw-ohlc">
          <span>O</span><b>{fmt.num(last.o)}</b>
          <span>H</span><b className="pos">{fmt.num(last.h)}</b>
          <span>L</span><b className="neg">{fmt.num(last.l)}</b>
          <span>C</span><b>{fmt.num(last.c)}</b>
        </span>
        <span className="cw-tf-row">
          {['1D','5D','1M','3M','6M','YTD','1Y','5Y','MAX'].map(t => (
            <button key={t} className={`cw-tf ${tf === t ? 'active' : ''}`} onClick={() => setTf(t)}>{t}</button>
          ))}
        </span>
        <span className="cw-tools-r">
          <button className="cw-icon-btn" onClick={() => setIndicatorsOpen(o => !o)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></svg>
            Indicators ▾
          </button>
          <button className="cw-icon-btn" title="Compare">+ Compare</button>
          <button className="cw-icon-btn" title="Fullscreen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/></svg>
          </button>
          {indicatorsOpen && (
            <div className="cw-indi-pop">
              <label><input type="checkbox" checked={showMA}  onChange={() => setShowMA(v => !v)} /> MA(20)</label>
              <label><input type="checkbox" checked={showVol} onChange={() => setShowVol(v => !v)} /> Volume</label>
              <label><input type="checkbox" disabled /> Bollinger Bands</label>
              <label><input type="checkbox" disabled /> RSI(14)</label>
              <label><input type="checkbox" disabled /> MACD</label>
            </div>
          )}
        </span>
      </div>

      {/* CHART BODY */}
      <div className="cw-body">
        <svg viewBox={`0 0 ${w} ${h + (showVol ? vh : 0)}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="cw-grid" width="80" height="32" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 32" fill="none" stroke="rgba(151,170,197,0.05)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x={pad.l} y={pad.t} width={pw} height={ph} fill="url(#cw-grid)" />

          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const v = min + range * (1 - t);
            return (
              <g key={i}>
                <line x1={pad.l} x2={w - pad.r} y1={pad.t + t * ph} y2={pad.t + t * ph} stroke="rgba(151,170,197,0.06)" strokeDasharray="2 4" />
                <text x={w - pad.r + 4} y={pad.t + t * ph + 3} fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">{fmt.num(v)}</text>
              </g>
            );
          })}

          {candles.map((c, i) => {
            const x = pad.l + i * cw + cw * 0.18;
            const bw = cw * 0.64;
            const isUp = c.c >= c.o;
            const color = isUp ? '#19C37D' : '#FF5C70';
            const top = y(Math.max(c.o, c.c));
            const bot = y(Math.min(c.o, c.c));
            return (
              <g key={i}>
                <line x1={x + bw / 2} x2={x + bw / 2} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
                <rect x={x} y={top} width={bw} height={Math.max(bot - top, 1)} fill={color} opacity={isUp ? 0.95 : 1}/>
              </g>
            );
          })}

          {showMA && (
            <polyline
              fill="none" stroke="var(--brand)" strokeWidth="1.2" strokeLinecap="round"
              points={ma20.map((m, i) => m == null ? '' : `${pad.l + (i + 0.5) * cw},${y(m)}`).filter(Boolean).join(' ')}
            />
          )}

          <line x1={pad.l} x2={w - pad.r} y1={lastY} y2={lastY} stroke="var(--brand)" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.7" />
          <rect x={w - pad.r} y={lastY - 9} width={pad.r} height={18} fill="var(--bg-3)" stroke="var(--brand-dim)" strokeWidth="0.5" />
          <text x={w - pad.r + 4} y={lastY + 3} fill="var(--brand)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">{fmt.num(last.c)}</text>

          {showVol && candles.map((c, i) => {
            const x = pad.l + i * cw + cw * 0.18;
            const bw = cw * 0.64;
            const v = c.v || (5 + Math.abs(c.c - c.o) * 1000);
            const isUp = c.c >= c.o;
            const top = yv(v);
            const baseY = h + vh - 4;
            return <rect key={i} x={x} y={top} width={bw} height={Math.max(baseY - top, 1)} fill={isUp ? '#19C37D' : '#FF5C70'} opacity="0.45" />;
          })}

          {[0, 0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <text key={i} x={pad.l + t * pw} y={h - 4} fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">
              {['Dec 25','Jan 26','Feb 26','Mar 26','Apr 26'][i]}
            </text>
          ))}
          {showVol && (
            <text x={pad.l} y={h + 14} fill="var(--text-tertiary)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">VOL</text>
          )}
        </svg>
      </div>

      <div className="cw-foot">
        <span>Vol last: <b>{(last.v || 14.2).toFixed(1)}M</b></span>
        <span>52w H/L: <b>10,225</b> / <b>8,940</b></span>
        <span>Mkt cap: <b>Rp 1,230 T</b></span>
        <span style={{ marginLeft: 'auto' }}>14:58:25 WIB · live</span>
      </div>
    </div>
  );
};

// --------- FINANCIAL STATEMENT ---------
const FinStatement = ({ data }) => {
  const [view, setView] = useState('Income Statement');
  const [period, setPeriod] = useState('Quarter');
  const fs = data.financials[view] || [];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 10px', display: 'flex', gap: 8, borderBottom: '1px solid var(--divider)', alignItems: 'center' }}>
        <select value={view} onChange={e => setView(e.target.value)} className="inline-sel">
          <option>Income Statement</option>
          <option>Balance Sheet</option>
          <option>Cash Flow</option>
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="inline-sel">
          <option>Quarter</option>
          <option>Annual</option>
          <option>TTM</option>
        </select>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-tbl">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}></th>
              <th>Q4 2023</th>
              <th>Q3 2023</th>
              <th>Q2 2023</th>
              <th>Q1 2023</th>
            </tr>
          </thead>
          <tbody>
            {fs.map((row, i) => (
              <tr key={i} className={row.bold ? 'bold-row' : row.indent ? 'indent-row' : ''}>
                <td className="sym-cell" style={{ paddingLeft: row.indent ? 22 : 10 }}>
                  <span className="sym" style={{ fontWeight: row.bold ? 600 : 400, color: row.indent ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: row.bold ? 12 : 12 }}>{row.label}</span>
                </td>
                {row.values.map((v, j) => (
                  <td key={j} className="num" style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.bold ? 600 : 400 }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --------- COMPARISON HEATMAP ---------
const Heatmap = ({ data }) => {
  const cols = ['ASII','BHIT','BNBR','BRPT','BUMI','DSSA','DSNG','EMTK','ERAA','GGRM','HMSP','ITMG'];
  const rows = data.heatmapRows;
  const getVal = (r, c) => {
    // deterministic pseudo-value based on strings
    const hash = (r + c).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return ((hash % 200) - 100) / 100 * 3;
  };
  const bgFor = (v) => {
    if (v > 0) return `rgba(31,184,119,${Math.min(Math.abs(v)/3, 1) * 0.4})`;
    return `rgba(240,71,92,${Math.min(Math.abs(v)/3, 1) * 0.4})`;
  };
  const [filter, setFilter] = useState('All Sectors');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 10px', display: 'flex', gap: 8, borderBottom: '1px solid var(--divider)', alignItems: 'center' }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="inline-sel">
          <option>All Sectors</option>
          <option>Financial</option>
          <option>Energy</option>
          <option>Consumer</option>
        </select>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>z-score · quarterly</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="heatmap-tbl">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-1)', zIndex: 2 }}>Metric</th>
              {cols.map(c => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((label, i) => (
              <tr key={i}>
                <td className="sym-cell" style={{ position: 'sticky', left: 0, background: 'var(--bg-1)', zIndex: 1 }}>
                  <span className="sym">{label}</span>
                </td>
                {cols.map((c, j) => {
                  const v = getVal(label, c);
                  return (
                    <td key={j} className="num" style={{ background: bgFor(v), color: Math.abs(v) > 1.5 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --------- METRIC SUMMARY CARDS (NASDAQ-style) ---------
const MetricsSummary = ({ data }) => {
  const metrics = data.metrics;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {metrics.map((m, i) => {
        const isPos = m.delta >= 0;
        const color = isPos ? 'var(--pos)' : 'var(--neg)';
        const bg = isPos ? 'rgba(31,184,119,0.10)' : 'rgba(240,71,92,0.10)';
        // last value for dashed baseline
        const avg = m.spark.reduce((a, b) => a + b, 0) / m.spark.length;
        return (
          <div key={i} className="metric-card">
            <div>
              <div className="m-name">{m.label}</div>
              <div className="m-sub">{m.sub || m.fullName || m.label}</div>
            </div>
            <div className="m-spark" style={{ position: 'relative' }}>
              <svg viewBox="0 0 120 36" preserveAspectRatio="none" style={{ width: '100%', height: 34 }}>
                {(() => {
                  const vals = m.spark;
                  const min = Math.min(...vals), max = Math.max(...vals);
                  const range = max - min || 1;
                  const pts = vals.map((v, j) => [(j / (vals.length - 1)) * 120, 34 - ((v - min) / range) * 28 - 3]);
                  const d = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
                  const areaD = `${d} L120,34 L0,34 Z`;
                  const baselineY = 34 - ((avg - min) / range) * 28 - 3;
                  return <>
                    <path d={areaD} fill={color} opacity="0.18" />
                    <line x1="0" x2="120" y1={baselineY} y2={baselineY} stroke={color} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.55" />
                    <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
                  </>;
                })()}
              </svg>
            </div>
            <div className="m-right">
              <div className="m-val">{m.value}</div>
              <span className={`chg-text ${isPos ? 'pos' : 'neg'}`}>
                {isPos ? '+' : ''}{m.delta.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --------- NEWS / INSIGHTS ---------
// Latest-news feed — line-by-line, dense, no big card blocks.
// Each row: time · source · headline. Sentiment dot left, tickers right.
const NewsPanel = ({ data }) => {
  const [filter, setFilter] = useState('All');
  const items = data.news.filter(n => filter === 'All' || (n.tag || '').toLowerCase().includes(filter.toLowerCase().slice(0, 4)));
  const FILTERS = ['All', 'Markets', 'Earnings', 'Macro', 'Alerts'];
  return (
    <div className="nf-wrap">
      <div className="nf-tabs">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={`nf-tab ${filter === f ? 'is-on' : ''}`}
            onClick={() => setFilter(f)}
          >{f}</button>
        ))}
      </div>
      <ul className="nf-feed">
        {items.map((n, i) => (
          <li key={i} className={`nf-row ${n.tagColor === 'pos' ? 'is-pos' : n.tagColor === 'neg' ? 'is-neg' : ''}`}>
            <span className="nf-row__time">{n.time}</span>
            <span className="nf-row__source">{n.source}</span>
            <span className="nf-row__headline">{n.headline}</span>
            {n.tickers && (
              <span className="nf-row__tickers">
                {n.tickers.map(t => <span key={t} className="nf-row__ticker">{t}</span>)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// --------- EMPTY / NEW WIDGET ---------
const EmptyWidget = ({ onPickType }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-tertiary)', padding: 20, textAlign: 'center' }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <rect x="3" y="3" width="18" height="18" rx="1"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
    <div style={{ fontSize: 12 }}>Empty panel</div>
    <button onClick={onPickType}
      style={{ background: 'var(--brand-navy-3)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 'var(--r-3)', fontSize: 11, cursor: 'pointer' }}
    >+ Add widget</button>
  </div>
);

// --------- WIDGET RENDERER (switch on type) ---------
const WidgetBody = ({ type, data, symbol, onSelect, selected, onPickType }) => {
  switch (type) {
    case 'watchlist': return <Watchlist data={data} onSelect={onSelect} selected={selected} />;
    case 'trade-tape': return <TradeTape data={data} />;
    case 'order-book': return <OrderBook data={data} />;
    case 'chart': return <Chart data={data} symbol={symbol} />;
    case 'financials': return <FinStatement data={data} />;
    case 'heatmap': return <Heatmap data={data} />;
    case 'metrics': return <MetricsSummary data={data} />;
    case 'brief': return <window.DailyBrief embedded={true} />;
    case 'news': return <NewsPanel data={data} />;
    case 'empty': return <EmptyWidget onPickType={onPickType} />;
    default: return <EmptyWidget onPickType={onPickType} />;
  }
};

Object.assign(window, { WidgetBody, Spark, fmt });
