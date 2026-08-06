// ================================================================
// Legacy Bridge Terminal — Main dashboard app
// ================================================================

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// --- Widget type registry ---
// minW / minH = MINIMUM grid units a widget needs to be readable.
// Resize is clamped to these. Hierarchy is content-aware, not arbitrary.
const WIDGET_TYPES = {
  'watchlist':   { name: 'Watchlist',           desc: 'Sortable list of symbols with live price, change, volume, and sparkline.', cat: 'Markets',  minW: 4, minH: 12, defW: 4, defH: 18 },
  'trade-tape':  { name: 'Trade Tape',          desc: 'Streaming time-and-sales feed with buyer/seller counterparty codes.',     cat: 'Markets',  minW: 3, minH: 10, defW: 3, defH: 14 },
  'order-book':  { name: 'Order Book',          desc: 'Level-2 bid/ask depth with volume shading and running totals.',            cat: 'Markets',  minW: 4, minH: 14, defW: 4, defH: 18 },
  'chart':       { name: 'Candlestick Chart',   desc: 'OHLC chart with timeframe controls, indicators, and live price label.',    cat: 'Charts',   minW: 5, minH: 14, defW: 8, defH: 18 },
  'financials':  { name: 'Financial Statement', desc: 'Income, balance, and cash flow statements with quarterly comparison.',     cat: 'Research', minW: 4, minH: 12, defW: 6, defH: 14 },
  'heatmap':     { name: 'Comparison Heatmap',  desc: 'Metric-by-company heatmap for peer group analysis and screening.',         cat: 'Research', minW: 6, minH: 8,  defW: 12, defH: 8 },
  'metrics':     { name: 'Market Overview',     desc: 'Key index and macro tiles with deltas and inline sparklines.',             cat: 'Overview', minW: 3, minH: 10, defW: 4, defH: 18 },
  'brief':       { name: "Today's Brief",       desc: 'Editorial morning briefing with lead, supporting cards, and related news.', cat: 'Overview', minW: 8, minH: 14, defW: 12, defH: 18 },
  'news':        { name: 'News & Insights',     desc: 'Latest line-by-line news feed with ticker tags and alerts.',                cat: 'Overview', minW: 3, minH: 10, defW: 4, defH: 14 },
};

// --- Default layout ---
// Grid is 12 cols wide; rows are 40px tall. {x,y,w,h} are col/row units.
// Content-aware: spans match each widget's actual reading needs.
//   Row 1: Today's Brief = primary editorial block (lead + 2 supps + 3 mini news)
//   Row 2: Chart hero (8 cols) + Watchlist (4 cols) — chart NEEDS the width
//   Row 3: Order Book + Trade Tape + News feed — supporting info trio
const DEFAULT_LAYOUT = [
  { id: 'w5', type: 'brief',      x: 0,  y: 0,  w: 12, h: 18, title: "Today's Brief" },

  { id: 'w4', type: 'chart',      x: 0,  y: 18, w: 8,  h: 18, title: null, symbol: 'BBCA' },
  { id: 'w2', type: 'watchlist',  x: 8,  y: 18, w: 4,  h: 18, title: 'Watchlist' },

  { id: 'w3', type: 'order-book', x: 0,  y: 36, w: 4,  h: 14, title: null, symbol: 'BBCA' },
  { id: 'w1', type: 'metrics',    x: 4,  y: 36, w: 4,  h: 14, title: 'Market Overview' },
  { id: 'w8', type: 'news',       x: 8,  y: 36, w: 4,  h: 14, title: 'Latest News' },
];

// ================================================================
// Icon set (reused)
// ================================================================
const I = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5.2-5.2"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  layout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  portfolio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></svg>,
  watchlist: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z"/></svg>,
  screens: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="12" rx="1"/><line x1="7" y1="20" x2="17" y2="20"/></svg>,
  research: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M8 13h8M8 17h5"/></svg>,
  drivers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="6" r="2.1"/><circle cx="5" cy="18" r="2.1"/><circle cx="19" cy="12" r="2.1"/><path d="M7 7l9.4 4M7 17l9.4-4"/></svg>,
  forecast: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 20V4"/><path d="M3 20h18"/><path d="M6 15l4-3 3 2"/><path d="M13 14l4-6 4 3" strokeDasharray="3 2.5"/></svg>,
  alerts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  more: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>,
  drag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>,
  expand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3H7l3-3z"/></svg>,
  dup: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M4 15V5a1 1 0 0 1 1-1h10"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  help: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></svg>,
  command: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.55 1z"/></svg>,
};

// kind → nav icon (per-terminal workspace rail)
const NAV_ICON = {
  markets: I.layout, 'equity-landing': I.portfolio, stock: I.watchlist, scanners: I.search,
  'driver-lab': I.drivers, 'equity-forecast': I.forecast,
  macro: I.research, industry: I.grid, portfolio: I.watchlist, global: I.screens,
};

// ================================================================
// Widget container
// ================================================================
const Widget = ({ w, isEdit, onChange, onRemove, onDuplicate, onOpenLibrary, symbol, onSelectSymbol, selectedSymbol, gridCols, colW, rowH, onStartDrag, onStartResize }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const type = WIDGET_TYPES[w.type];
  const sym = w.symbol;
  const symRow = sym ? DATA.watchlist.Banks.find(r => r.sym === sym) || DATA.watchlist.Tech.find(r => r.sym === sym) : null;

  // Title composition
  const renderTitle = () => {
    if (w.title) return <span className="sym" style={{ fontSize: 12, fontWeight: 600 }}>{w.title}</span>;
    if (sym && symRow) {
      return <>
        <span className="sym">{sym}</span>
        <span className="price num">{fmt.num(symRow.last)}</span>
        <span className={`delta ${symRow.chgp >= 0 ? 'pos' : 'neg'}`}>({fmt.pct(symRow.chgp)})</span>
      </>;
    }
    return <span className="sym">{type?.name || 'Widget'}</span>;
  };

  return (
    <div className="w" style={{
      gridColumn: `${w.x + 1} / span ${w.w}`,
      gridRow: `${w.y + 1} / span ${w.h}`,
    }}>
      <div className="w-header">
        <div className="w-drag-handle" onMouseDown={(e) => onStartDrag && onStartDrag(e, w.id)}>
          {I.drag}
        </div>
        <div className="w-title">{renderTitle()}</div>
        {w.type === 'watchlist' && null}
        <div className="w-actions">
          <div className="w-act" title="Add" onClick={() => onOpenLibrary(w.id, 'add')}>{I.add}</div>
          <div className="w-act" title="Swap widget" onClick={() => onOpenLibrary(w.id, 'swap')}>{I.swap}</div>
          <div className="w-act" title="More" onClick={() => setMenuOpen(!menuOpen)}>{I.more}</div>
        </div>
        {menuOpen && (
          <div className="w-menu" ref={menuRef}>
            <div className="label">Widget</div>
            <div className="mi" onClick={() => { onOpenLibrary(w.id, 'swap'); setMenuOpen(false); }}>{I.swap} Change widget type…</div>
            <div className="mi" onClick={() => { onDuplicate(w.id); setMenuOpen(false); }}>{I.dup} Duplicate</div>
            <div className="mi">{I.pin} Pin to toolbar</div>
            <div className="mi">{I.expand} Open fullscreen</div>
            <div className="sep"></div>
            <div className="label">Data</div>
            <div className="mi">{I.bell} Add alert on this widget</div>
            <div className="mi">{I.settings} Configure…</div>
            <div className="sep"></div>
            <div className="mi danger" onClick={() => { onRemove(w.id); setMenuOpen(false); }}>{I.close} Remove widget</div>
          </div>
        )}
      </div>
      <div className="w-body">
        <WidgetBody
          type={w.type}
          data={DATA}
          symbol={w.symbol}
          onSelect={onSelectSymbol}
          selected={selectedSymbol}
          onPickType={() => onOpenLibrary(w.id, 'swap')}
        />
      </div>
      <div className="w-resize" onMouseDown={(e) => onStartResize && onStartResize(e, w.id)}></div>
    </div>
  );
};

// ================================================================
// Widget Library Modal
// ================================================================
const WidgetLibrary = ({ open, onClose, onPick, mode = 'add' }) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  if (!open) return null;
  const cats = ['All', ...new Set(Object.values(WIDGET_TYPES).map(t => t.cat))];
  const entries = Object.entries(WIDGET_TYPES).filter(([k, t]) => {
    const matchCat = cat === 'All' || t.cat === cat;
    const matchQ = !q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  // Mini previews
  const Preview = ({ type }) => {
    const common = { width: '100%', height: '100%', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' };
    switch (type) {
      case 'watchlist': return (
        <div style={{ ...common, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[['BBCA','10,075','+0.25'],['BBRI','5,425','-0.91'],['BMRI','6,175','+1.23'],['TLKM','3,720','+1.09']].map((r,i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns: '1fr 60px 50px', gap: 4 }}>
              <span style={{ color:'var(--text-primary)' }}>{r[0]}</span>
              <span style={{ textAlign:'right' }}>{r[1]}</span>
              <span style={{ textAlign:'right', color: r[2].startsWith('+') ? 'var(--pos)' : 'var(--neg)' }}>{r[2]}</span>
            </div>
          ))}
        </div>
      );
      case 'chart': return (
        <svg viewBox="0 0 160 72" style={{ width: '100%', height: '100%' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const up = Math.sin(i*0.7) > 0;
            const y1 = 12 + Math.random() * 36;
            const y2 = 16 + Math.random() * 40;
            return <g key={i}>
              <line x1={i*8+4} x2={i*8+4} y1={y1-6} y2={y2+6} stroke={up?'#1FB877':'#F0475C'} strokeWidth="0.5" />
              <rect x={i*8+2} y={Math.min(y1,y2)} width="4" height={Math.abs(y2-y1)+2} fill={up?'#1FB877':'#F0475C'} />
            </g>;
          })}
        </svg>
      );
      case 'order-book': return (
        <div style={{ ...common, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => <React.Fragment key={i}>
            <div style={{ background:'rgba(31,184,119,0.12)', padding:'1px 4px', display:'flex', justifyContent:'space-between' }}><span>{8+i}</span><span style={{ color:'var(--pos)' }}>{10070-i*5}</span></div>
            <div style={{ background:'rgba(240,71,92,0.12)', padding:'1px 4px', display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--neg)' }}>{10080+i*5}</span><span>{12+i}</span></div>
          </React.Fragment>)}
        </div>
      );
      case 'trade-tape': return (
        <div style={{ ...common, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const up = i % 2 === 0;
            return <div key={i} style={{ display:'grid', gridTemplateColumns:'50px 1fr 40px', gap: 4 }}>
              <span style={{ color:'var(--text-tertiary)' }}>14:58:{20-i}</span>
              <span style={{ textAlign:'right', color: up ? 'var(--pos)':'var(--neg)' }}>{10075 + (i%3-1)*5}</span>
              <span style={{ textAlign:'right' }}>{10+i*3}</span>
            </div>;
          })}
        </div>
      );
      case 'financials': return (
        <div style={{ ...common }}>
          {['Revenue','COGS','Gross Profit','Opex','EBIT','Net Income'].map((r, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns: '1fr 40px 40px 40px', gap: 3, paddingBottom: 2 }}>
              <span style={{ fontFamily:'var(--font-sans)' }}>{r}</span>
              <span style={{ textAlign:'right' }}>{(20+i).toFixed(1)}B</span>
              <span style={{ textAlign:'right', color:'var(--text-tertiary)' }}>{(19+i).toFixed(1)}B</span>
              <span style={{ textAlign:'right', color:'var(--text-tertiary)' }}>{(18+i).toFixed(1)}B</span>
            </div>
          ))}
        </div>
      );
      case 'heatmap': return (
        <div style={{ ...common, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const v = Math.sin(i * 1.7);
            return <div key={i} style={{ background: v > 0 ? `rgba(31,184,119,${Math.abs(v)*0.4})` : `rgba(240,71,92,${Math.abs(v)*0.4})`, aspectRatio: '1.6', borderRadius: 1 }}/>;
          })}
        </div>
      );
      case 'metrics': return (
        <div style={{ ...common, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 4 }}>
          {['IHSG','S&P','USD','BTC'].map((m, i) => (
            <div key={i} style={{ background:'var(--bg-3)', borderRadius: 3, padding:'3px 5px' }}>
              <div style={{ fontSize: 7, color:'var(--text-tertiary)' }}>{m}</div>
              <div style={{ fontSize: 10, color:'var(--text-primary)' }}>{(1000+i*140).toLocaleString()}</div>
              <div style={{ fontSize: 7, color: i%2 ? 'var(--neg)' : 'var(--pos)' }}>{i%2?'-':'+'}{(Math.random()*2).toFixed(2)}%</div>
            </div>
          ))}
        </div>
      );
      case 'news': return (
        <div style={{ ...common, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['BCA Q1 profit +11.7% YoY','BI holds rate at 6.00%','Alert: BBCA broke 10,050','Rupiah at 2-week high'].map((h, i) => (
            <div key={i}>
              <div style={{ fontSize: 7, color:'var(--brand-steel)' }}>REUTERS · 14:{52-i*12}</div>
              <div style={{ fontSize: 9, color:'var(--text-primary)', fontFamily:'var(--font-sans)', lineHeight: 1.2 }}>{h}</div>
            </div>
          ))}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(820px, 90vw)' }}>
        <div className="modal-header">
          <div>
            <h2>{mode === 'swap' ? 'Change widget type' : 'Add widget'}</h2>
            <div className="sub">{mode === 'swap' ? 'Replace the content of this panel' : 'Pick a widget to add to your workspace'}</div>
          </div>
          <div className="w-act" onClick={onClose} style={{ background:'var(--bg-3)' }}>{I.close}</div>
        </div>
        <div className="modal-body">
          <div className="lib-search">
            <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5.2-5.2"/></svg></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search widgets…" autoFocus />
          </div>
          <div className="lib-cats">
            {cats.map(c => (
              <div key={c} className={`cat ${c === cat ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</div>
            ))}
          </div>
          <div className="lib-grid">
            {entries.map(([key, t]) => (
              <div key={key} className="lib-card" onClick={() => onPick(key)}>
                <div className="preview"><Preview type={key} /></div>
                <div className="meta">
                  <div className="name">{t.name}</div>
                  <div className="desc">{t.desc}</div>
                  <div className="tag">{t.cat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="tb-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "bgColor": "#000000",
  "noiseColor": "#97AAC5",
  "noiseSize": 1,
  "noiseDensity": 40,
  "noiseEnabled": true
}/*EDITMODE-END*/;

// ================================================================
// Background Noise — Arc-style grain overlay
// ================================================================
const BackgroundNoise = ({ color, size, density }) => {
  const dataUri = useMemo(() => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const alpha = (density / 100) * 0.85;
    const tile = 160;
    const grain = Math.max(1, Math.round(size));
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='${0.9 / grain}' numOctaves='2' stitchTiles='stitch' seed='5'/>
        <feColorMatrix values='0 0 0 0 ${(r/255).toFixed(3)}  0 0 0 0 ${(g/255).toFixed(3)}  0 0 0 0 ${(b/255).toFixed(3)}  0 0 0 ${(alpha*2.2).toFixed(3)} -0.6'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)' opacity='1'/>
    </svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [color, size, density]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundImage: dataUri,
      backgroundRepeat: 'repeat',
      pointerEvents: 'none',
      mixBlendMode: 'overlay',
      zIndex: 9998,
      opacity: 1,
    }} />
  );
};

// ================================================================
// Market strip symbols — static snapshot values. (The old Monitor
// live-quote layer was retired with the Research Desk rebuild; sparks
// fall back to seeded shapes.) fmt: 'idr' whole numbers, 'usd2' $ 2dp,
// 'usd0' $ whole, 'idx' 2dp index points.
// ================================================================
const MSTRIP_SYMBOLS = [
  { s: 'IHSG',    t: '^JKSE',   fmt: 'idx',  v: '7,283.51', c: 1.21 },
  { s: 'LQ45',    t: '^JKLQ45', fmt: 'idx',  v: '978.42',   c: 0.84 },
  { s: 'USD/IDR', t: 'IDR=X',   fmt: 'idr',  v: '15,820',   c: -0.18 },
  { s: 'BBCA',    t: 'BBCA.JK', fmt: 'idr',  v: '10,075',   c: 0.25 },
  { s: 'BBRI',    t: 'BBRI.JK', fmt: 'idr',  v: '5,425',    c: -0.91 },
  { s: 'BMRI',    t: 'BMRI.JK', fmt: 'idr',  v: '6,175',    c: 1.23 },
  { s: 'TLKM',    t: 'TLKM.JK', fmt: 'idr',  v: '3,720',    c: 1.09 },
  { s: 'ASII',    t: 'ASII.JK', fmt: 'idr',  v: '5,150',    c: -3.29 },
  { s: 'GOTO',    t: 'GOTO.JK', fmt: 'idr',  v: '82',       c: 1.23 },
  { s: 'WTI',     t: 'CL=F',    fmt: 'usd2', v: '$82.40',   c: -1.08 },
  { s: 'GOLD',    t: 'GC=F',    fmt: 'usd0', v: '$2,385',   c: 0.64 },
  { s: 'BTC',     t: 'BTC-USD', fmt: 'usd0', v: '$84,215',  c: 1.49 },
  { s: 'SPX',     t: '^GSPC',   fmt: 'idx',  v: '5,428',    c: 0.42 },
  { s: 'NDX',     t: '^NDX',    fmt: 'idx',  v: '18,740',   c: 0.68 },
];
const mstripFmt = (fmt, v) => {
  if (v == null) return null;
  if (fmt === 'usd2') return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (fmt === 'usd0') return '$' + Math.round(v).toLocaleString('en-US');
  if (fmt === 'idx') return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Math.round(v).toLocaleString('en-US');
};

// ================================================================
// Main App
// ================================================================
const App = ({ qars, terminal, onHome, onNewTab }) => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [bellOpen, setBellOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutsOpen, setLayoutsOpen] = useState(false);

  // Apply background tweaks to root tokens
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--bg-0', t.bgColor);
    r.style.setProperty('--bg-tweak-noise-color', t.noiseColor);
    r.style.setProperty('--bg-tweak-noise-size', `${t.noiseSize}px`);
    r.style.setProperty('--bg-tweak-noise-density', `${t.noiseDensity}%`);
  }, [t.bgColor, t.noiseColor, t.noiseSize, t.noiseDensity]);

  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('lbt-layout');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LAYOUT;
  });

  // Market strip: static snapshot values only — the Monitor live-quote layer
  // that used to fill this was retired with the Research Desk rebuild.
  const mstripLive = {};
  const [editMode, setEditMode] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [libTarget, setLibTarget] = useState(null); // {widgetId, mode: 'swap'|'add'}
  const [selectedSymbol, setSelectedSymbol] = useState('BBCA');
  const [toast, setToast] = useState(null);
  const [activeNav, setActiveNav] = useState('layout');
  const [tabs, setTabs] = useState(() => {
    // Seed tabs from the active terminal's workspace manifest: open the built
    // workspaces (or the first one if none are built yet).
    const ws = (terminal && terminal.workspaces) || [];
    const built = ws.filter(w => w.built);
    const seed = built.length ? built : ws.slice(0, 1);
    if (!seed.length) return [{ id: 't0', title: 'Markets · Layout', kind: 'markets' }];
    return seed.map((w, i) => ({
      id: 't' + i,
      kind: w.kind,
      title: (terminal ? terminal.name + ' · ' : '') + w.label,
      ...(w.extra || {}),
    }));
  });
  const [activeTab, setActiveTab] = useState('t0');
  const activeTabObj = tabs.find(x => x.id === activeTab) || tabs[0];
  // per-terminal tabs seed from the manifest; no cross-terminal persistence.
  const gridRef = useRef(null);

  // Pause animations when tab is hidden (saves CPU)
  useEffect(() => {
    const onVis = () => {
      document.body.dataset.docHidden = document.hidden ? '1' : '0';
    };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Wire palette refs so the command palette can drive app actions
  useEffect(() => {
    const refs = window.__paletteRefs;
    if (!refs) return;
    refs.openWorkspaceRef.current     = (kind, title, extra) => openWorkspace(kind, title, extra);
    refs.setEditModeRef.current       = setEditMode;
    refs.openLibraryRef.current       = (id, mode) => openLibrary(id, mode);
    refs.openAlertsRef.current        = () => setAlertsOpen(true);
    refs.openSettingsRef.current      = () => setSettingsOpen(true);
    refs.openLayoutsRef.current       = () => setLayoutsOpen(true);
    refs.openTicketRef.current        = (side) => qars?.openTicket?.(selectedSymbol, side);
    refs.setSelectedSymbolRef.current = setSelectedSymbol;
  });

  // Local hotkeys: 'e' edit-mode, 'a' alerts, 'o' order, 'g <key>' workspace nav
  useEffect(() => {
    let goPending = false; let goTimer = null;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); setLayoutsOpen(true); }
        return;
      }
      if (goPending) {
        const map = { m: ['markets','Markets · Layout'], s: ['stock','Stock · BBCA',{symbol:'BBCA'}], c: ['scanners','Scanners · Qars Best 80'],
                      a: ['macro','Macro · Indicator Lab'], i: ['industry','Industry · Sector Map'],
                      p: ['portfolio','Portfolio · P&L'], g: ['global','Global · Map & Calendar'] };
        const m = map[e.key.toLowerCase()];
        if (m) { e.preventDefault(); openWorkspace(m[0], m[1], m[2] || {}); }
        goPending = false; clearTimeout(goTimer); return;
      }
      if (e.key === 'g') { goPending = true; goTimer = setTimeout(() => goPending = false, 1200); return; }
      if (e.key === 'e') { e.preventDefault(); setEditMode(m => !m); }
      if (e.key === 'a') { e.preventDefault(); setAlertsOpen(true); }
      if (e.key === 'o') { e.preventDefault(); qars?.openTicket?.(selectedSymbol, 'buy'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs, selectedSymbol]);

  // Persist layout
  useEffect(() => {
    try { localStorage.setItem('lbt-layout', JSON.stringify(layout)); } catch {}
  }, [layout]);

  const showToast = (msg) => { qars?.push?.({ kind: 'info', message: msg, ttl: 2400 }); setToast(msg); setTimeout(() => setToast(null), 2400); };

  // ---------- Open or focus a workspace by kind ----------
  const openWorkspace = (kind, title, extra = {}) => {
    const existing = tabs.find(t => t.kind === kind && (extra.symbol ? t.symbol === extra.symbol : true));
    if (existing) { setActiveTab(existing.id); return; }
    const id = `t${Date.now()}`;
    setTabs([...tabs, { id, title, kind, ...extra }]);
    setActiveTab(id);
  };

  // Compute grid geometry
  const [gridMetrics, setGridMetrics] = useState({ colW: 100, rowH: 40, gap: 8 });
  useEffect(() => {
    const update = () => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const gap = 8;
      const cols = 12;
      const colW = (rect.width - gap * (cols - 1) - 20) / cols;
      setGridMetrics({ colW, rowH: 40, gap });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // --- Drag logic ---
  const [drag, setDrag] = useState(null);
  const dragState = useRef({});
  const onStartDrag = (e, id) => {
    e.preventDefault();
    const w = layout.find(x => x.id === id);
    if (!w) return;
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y };
    const onMove = (ev) => {
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      const newX = Math.max(0, Math.min(12 - w.w, dragState.current.origX + Math.round(dx / (gridMetrics.colW + gridMetrics.gap))));
      const newY = Math.max(0, dragState.current.origY + Math.round(dy / (gridMetrics.rowH + gridMetrics.gap)));
      setDrag({ id, x: newX, y: newY });
    };
    const onUp = () => {
      const d = dragState.current;
      if (d.id && drag) {
        setLayout(l => l.map(x => x.id === d.id ? { ...x, x: drag.x, y: drag.y } : x));
        showToast('Widget moved');
      }
      setDrag(null);
      dragState.current = {};
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // --- Resize logic ---
  const resizeState = useRef({});
  const [resize, setResize] = useState(null);
  const onStartResize = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const w = layout.find(x => x.id === id);
    if (!w) return;
    const tspec = WIDGET_TYPES[w.type] || {};
    const minW = tspec.minW || 3;
    const minH = tspec.minH || 8;
    resizeState.current = { id, startX: e.clientX, startY: e.clientY, origW: w.w, origH: w.h };
    const onMove = (ev) => {
      const dx = ev.clientX - resizeState.current.startX;
      const dy = ev.clientY - resizeState.current.startY;
      const newW = Math.max(minW, Math.min(12 - w.x, resizeState.current.origW + Math.round(dx / (gridMetrics.colW + gridMetrics.gap))));
      const newH = Math.max(minH, resizeState.current.origH + Math.round(dy / (gridMetrics.rowH + gridMetrics.gap)));
      setResize({ id, w: newW, h: newH });
    };
    const onUp = () => {
      const r = resizeState.current;
      if (r.id && resize) {
        setLayout(l => l.map(x => x.id === r.id ? { ...x, w: resize.w, h: resize.h } : x));
        showToast('Widget resized');
      }
      setResize(null);
      resizeState.current = {};
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // --- Layout operations ---
  const openLibrary = (widgetId, mode) => { setLibTarget({ widgetId, mode }); setLibOpen(true); };
  const pickWidgetType = (type) => {
    if (libTarget?.mode === 'swap' && libTarget.widgetId) {
      setLayout(l => l.map(w => w.id === libTarget.widgetId ? { ...w, type, title: WIDGET_TYPES[type]?.name } : w));
      showToast(`Changed to ${WIDGET_TYPES[type]?.name}`);
    } else {
      // Add new widget: find first open row, use type's default size.
      const maxY = Math.max(0, ...layout.map(w => w.y + w.h));
      const tspec = WIDGET_TYPES[type] || {};
      const newW = {
        id: `w${Date.now()}`,
        type, x: 0, y: maxY,
        w: tspec.defW || tspec.minW || 4,
        h: tspec.defH || tspec.minH || 8,
        title: tspec.name,
      };
      setLayout(l => [...l, newW]);
      showToast(`Added ${WIDGET_TYPES[type]?.name}`);
    }
    setLibOpen(false);
    setLibTarget(null);
  };
  const removeWidget = (id) => { setLayout(l => l.filter(w => w.id !== id)); showToast('Widget removed'); };
  const duplicateWidget = (id) => {
    const w = layout.find(x => x.id === id);
    if (!w) return;
    const maxY = Math.max(0, ...layout.map(x => x.y + x.h));
    setLayout(l => [...l, { ...w, id: `w${Date.now()}`, y: maxY }]);
    showToast('Widget duplicated');
  };
  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    showToast('Layout reset to default');
  };
  const saveLayout = () => {
    setLayoutsOpen(true);
  };

  // Apply pending drag/resize as ghost
  const displayLayout = layout.map(w => {
    if (drag && drag.id === w.id) return { ...w, x: drag.x, y: drag.y };
    if (resize && resize.id === w.id) return { ...w, w: resize.w, h: resize.h };
    return w;
  });

  return (
    <div className={`app ${editMode ? 'edit-mode' : ''} ${terminal && terminal.selfNav ? 'no-nav' : ''}`}>

      {/* ===== TOP BAR ===== */}
      <div className="topbar">
        <button className="lbc-tb-home" onClick={() => onHome && onHome()} title="Back to all terminals (Home)">‹ Terminals</button>
        <div className="tb-logo" onClick={() => onHome && onHome()} style={{ cursor: 'pointer' }} title="Back to all terminals">
          <div className="bridge" aria-label="Bridge logo"></div>
          <div className="name">Terminal<span className="v">V1</span></div>
        </div>

        <div className="tb-search">
          {I.search}
          <input placeholder="Search symbols, companies, widgets, workspaces, news — try ‘BBCA’, ‘order book’, ‘rate decision’…" />
          <span className="kbd">⌘K</span>
        </div>

        <div className="tb-spacer"></div>

        {/* Widget-board controls only make sense on the 'markets' board —
            hidden on Equities / Stock / Scanners so the chrome stays relevant. */}
        {activeTabObj?.kind === 'markets' && (
          <div className="tb-actions">
            <button className={`tb-btn ${editMode ? 'active' : ''}`} onClick={() => setEditMode(!editMode)}>
              {I.layout} <span>Edit layout</span>
            </button>
            <button className="tb-btn is-cta" onClick={() => openLibrary(null, 'add')}>
              {I.add} <span>Add widget</span>
            </button>
            <button className="tb-btn" onClick={saveLayout} title="Saved layouts (⌘S)">
              {I.save} <span>Layouts</span>
            </button>
            <button className="tb-btn" onClick={resetLayout} title="Reset to default">
              {I.reset}
            </button>
          </div>
        )}

        <div className="tb-user">
          <button className="tb-btn" style={{ position: 'relative' }} onClick={() => setBellOpen(true)} title="Notifications">
            {I.bell}
            {(qars?.triggeredCount > 0 || qars?.armedCount > 0) && (
              <span className="badge">{qars.triggeredCount || qars.armedCount}</span>
            )}
          </button>
          <button className="tb-btn" onClick={() => setSettingsOpen(true)} title="Settings">{I.settings}</button>
          <div className="avatar">AZ</div>
        </div>
      </div>

      {/* ===== LEFT NAV ===== (hidden for self-navigating terminals like Macro, which carry their own tool rail) */}
      {!(terminal && terminal.selfNav) && (
      <div className="nav">
        <div className="nav-item nav-home" onClick={() => onHome && onHome()} title="All terminals">
          {I.grid}<span className="lbl">Home</span>
        </div>
        <div className="nav-term-lbl">{terminal ? terminal.name : 'Workspaces'}</div>
        {((terminal && terminal.workspaces) || []).map(n => {
          const isActive = activeTabObj?.kind === n.kind;
          const navIcon = NAV_ICON[n.kind] || I.grid;
          const wsTitle = (terminal ? terminal.name + ' · ' : '') + n.label;
          return (
            <div key={n.kind} className={`nav-item ${isActive ? 'active' : ''} ${n.built ? '' : 'soon'}`}
                 onClick={() => openWorkspace(n.kind, wsTitle, n.extra || {})}
                 title={n.label + (n.built ? '' : ' · not yet')}>
              {navIcon}
              <span className="lbl">{n.label}</span>
            </div>
          );
        })}
        <div className="nav-divider"></div>
        <div className="nav-item">{I.alerts}<span className="lbl">Alerts</span></div>
        <div className="nav-item">{I.help}<span className="lbl">Help & Docs</span></div>
        <div className="nav-micro">v1.0 · 2026</div>
      </div>
      )}

      {/* ===== WORKSPACE ===== */}
      <div className="workspace">
        {activeTabObj?.kind === 'equity-landing' ? (
          <window.EquityDashboard
            openStockTab={(sym, name) => {
              const id = `t${Date.now()}`;
              setTabs([...tabs, { id, kind: 'stock', symbol: sym, title: `${sym} · ${name}` }]);
              setActiveTab(id);
            }}
          />
        ) : activeTabObj?.kind === 'stock' ? (
          <StockWorkspace
            symbol={activeTabObj.symbol || selectedSymbol}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
          />
        ) : activeTabObj?.kind === 'scanners' ? (
          <ScannersWorkspace
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            openTab={(tabSpec) => {
              const id = `t${Date.now()}`;
              setTabs([...tabs, { id, ...tabSpec }]);
              setActiveTab(id);
            }}
          />
        ) : activeTabObj?.kind === 'driver-lab' ? (
          <window.EquityDriverLab />
        ) : activeTabObj?.kind === 'equity-forecast' ? (
          <window.EquityForecastLab />
        ) : activeTabObj?.kind === 'macro-lab' ? (
          <window.MacroLab />
        ) : activeTabObj?.kind === 'macro' ? (
          <MacroWorkspace />
        ) : activeTabObj?.kind === 'industry' ? (
          window.IndustryWorkspace ? <window.IndustryWorkspace
            openTab={(tabSpec) => {
              const id = `t${Date.now()}`;
              setTabs([...tabs, { id, ...tabSpec }]);
              setActiveTab(id);
            }}
          /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'ind-comps' ? (
          window.IndCompsWorkspace ? <window.IndCompsWorkspace openTab={(tabSpec)=>{const id=`t${Date.now()}`;setTabs([...tabs,{id,...tabSpec}]);setActiveTab(id);}} /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'ind-data' ? (
          // "Sector Drivers" now serves the empirical Driver Engine (was the hand-set
          // heuristic IndDataWorkspace). The old industry-data.jsx is retired but kept loaded.
          window.IndustryEnginePanel ? <window.IndustryEnginePanel /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'ind-engine' ? (
          window.IndustryEnginePanel ? <window.IndustryEnginePanel /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'ind-gather' ? (
          window.IndGatherWorkspace ? <window.IndGatherWorkspace /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'portfolio' ? (
          <PortfolioWorkspace
            openTab={(tabSpec) => {
              const id = `t${Date.now()}`;
              setTabs([...tabs, { id, ...tabSpec }]);
              setActiveTab(id);
            }}
          />
        ) : activeTabObj?.kind === 'global' ? (
          <GlobalWorkspace />
        ) : activeTabObj?.kind === 'markets' ? (
          <React.Fragment>
          <div className="ws-grid" ref={gridRef}>
            {displayLayout.map(w => (
              <Widget
                key={w.id}
                w={w}
                isEdit={editMode}
                onRemove={removeWidget}
                onDuplicate={duplicateWidget}
                onOpenLibrary={openLibrary}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                gridCols={12}
                colW={gridMetrics.colW}
                rowH={gridMetrics.rowH}
                onStartDrag={onStartDrag}
                onStartResize={onStartResize}
              />
            ))}
          </div>
          </React.Fragment>
        ) : activeTabObj?.kind === 'am-book' ? (
          window.AssetMgmt ? <window.AssetMgmt /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'legion' ? (
          window.LEGION ? <window.LEGION /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'finance' ? (
          window.FINANCE_TERMINAL ? <window.FINANCE_TERMINAL /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'accounts' ? (
          window.ACCOUNTS_TERMINAL ? <window.ACCOUNTS_TERMINAL /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : activeTabObj?.kind === 'research-desk' ? (
          window.ResearchDeskTerminal ? <window.ResearchDeskTerminal /> : <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        ) : (
          <window.NotYet title={activeTabObj?.title} terminal={terminal} />
        )}
      </div>

      {/* ===== MARKET STRIP — compact cards, auto-scroll ===== */}
      <div className="mstrip">
        <div className="mstrip-flow">
          <div className="mstrip-track">
            {[...Array(2)].flatMap((_, dupIdx) => (
              MSTRIP_SYMBOLS.map((m, i) => {
                const live = mstripLive[m.t] || {};
                const chg = live.chg != null ? live.chg : m.c;
                const val = live.price != null ? mstripFmt(m.fmt, live.price) : m.v;
                let spark = live.spark;
                if (!spark) {
                  const seed = m.s.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
                  spark = Array.from({ length: 14 }, (_, j) => {
                    const t = (seed + j * 9) % 31;
                    return 50 + (t - 15) + (chg >= 0 ? j * 0.6 : -j * 0.6);
                  });
                }
                const dir = chg >= 0 ? 'pos' : 'neg';
                return (
                  <div key={`${dupIdx}-${i}`} className={`mcard ${dir}`} title={live.price != null ? 'live' : 'snapshot'}>
                    <div className="mcard-row1">
                      <span className="mcard-sym">{m.s}</span>
                      <span className={`mcard-pct ${dir}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
                    </div>
                    <div className="mcard-row2">
                      <span className="mcard-val">{val}</span>
                      <Spark data={spark} color={chg >= 0 ? 'var(--pos)' : 'var(--neg)'} h={16} w={42} fill={true} />
                    </div>
                  </div>
                );
              })
            ))}
          </div>
        </div>
        <button type="button" className="mstrip-more" title="Open market overview">
          See more
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
        <div className="mstrip-status">
          <span className={`pill session-${qars?.session?.state || 'open'}`}>
            <span className="dot"></span> IDX · {qars?.session?.label || 'Open'}
          </span>
          <span className="mstrip-time">{qars?.liveTime || '--:--:--'} {qars?.tz || 'UTC'}</span>
        </div>
      </div>

      {/* ===== BROWSER TABS (bottom) ===== */}
      <div className="btabs">
        {tabs.map(t => (
          <div key={t.id} className={`btab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <span className="favicon">
              {t.kind === 'symbol' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-9"/></svg>}
              {t.kind === 'stock' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-9"/></svg>}
              {t.kind === 'scanners' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5.2-5.2"/></svg>}
              {t.kind === 'macro' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></svg>}
              {t.kind === 'markets' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>}
              {t.kind === 'industry' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
              {t.kind === 'portfolio' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z"/></svg>}
              {t.kind === 'global' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>}
              {t.kind === 'sector' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h12l4 4v12H4z"/></svg>}
            </span>
            <span className="title">{t.title}</span>
            <span className="close" onClick={(e) => { e.stopPropagation(); const nt = tabs.filter(x => x.id !== t.id); setTabs(nt); if (activeTab === t.id && nt[0]) setActiveTab(nt[0].id); }}>
              {I.close}
            </span>
          </div>
        ))}
        <div className="btab-new" onClick={() => onNewTab && onNewTab()} title="New tab">{I.add}</div>
        <div className="btabs-spacer"></div>
        <div className="btabs-right">
          <span>{layout.length} widgets</span>
          <span>·</span>
          <span>last saved 2m ago</span>
          <span className="live-dot"><span className="d"></span>Live</span>
        </div>
      </div>

      {/* ===== Edit mode banner ===== */}
      {editMode && (
        <div className="edit-banner">
          <span className="pulse"></span>
          <span className="msg">Edit mode — drag headers to move, drag corners to resize</span>
          <button className="tb-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={saveLayout}>Save</button>
          <button className="tb-btn active" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditMode(false)}>Done</button>
        </div>
      )}

      {/* ===== Widget Library ===== */}
      <WidgetLibrary
        open={libOpen}
        onClose={() => { setLibOpen(false); setLibTarget(null); }}
        onPick={pickWidgetType}
        mode={libTarget?.mode || 'add'}
      />

      {/* ===== Toast ===== */}
      {toast && (
        <div className="toast">
          <span className="dot"></span>
          <span>{toast}</span>
        </div>
      )}

      {/* ===== Qars: Bell, Alerts, Settings, Layouts ===== */}
      <window.Qars.BellPanel open={bellOpen} onClose={() => setBellOpen(false)} />
      <window.Qars.AlertsPanel open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <window.Qars.SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <window.Qars.LayoutsManager open={layoutsOpen} onClose={() => setLayoutsOpen(false)} currentWorkspace={activeTabObj?.kind || 'markets'} />

      {/* ===== Tweaks Panel ===== */}
      <TweaksPanel>
        <TweakSection label="Background" />
        <TweakColor  label="Base color"     value={t.bgColor}      onChange={(v) => setTweak('bgColor', v)} />
        <TweakToggle label="Noise overlay"  value={t.noiseEnabled} onChange={(v) => setTweak('noiseEnabled', v)} />
        <TweakColor  label="Noise tint"     value={t.noiseColor}   onChange={(v) => setTweak('noiseColor', v)} />
        <TweakSlider label="Noise size"     value={t.noiseSize}    min={1} max={4} step={1} unit="px"
                     onChange={(v) => setTweak('noiseSize', v)} />
        <TweakSlider label="Noise density"  value={t.noiseDensity} min={0} max={100} step={5} unit="%"
                     onChange={(v) => setTweak('noiseDensity', v)} />
      </TweaksPanel>

      {/* Noise overlay layer */}
      {t.noiseEnabled && <BackgroundNoise color={t.noiseColor} size={t.noiseSize} density={t.noiseDensity} />}
    </div>
  );
};

// ================================================================
// Palette registry — bridges Qars command palette to app state
// ================================================================
const buildPaletteRegistry = ({ openWorkspaceRef, setEditModeRef, openLibraryRef, openAlertsRef, openSettingsRef, openLayoutsRef, openTicketRef, setSelectedSymbolRef }) => {
  // Symbol universe — kept in sync with SymbolStore seeds
  const SYMBOLS = [
    { sym: 'BBCA', name: 'Bank Central Asia' },
    { sym: 'BMRI', name: 'Bank Mandiri' },
    { sym: 'BBRI', name: 'Bank Rakyat Indonesia' },
    { sym: 'TLKM', name: 'Telkom Indonesia' },
    { sym: 'ASII', name: 'Astra International' },
    { sym: 'GOTO', name: 'GoTo Group' },
    { sym: 'BREN', name: 'Barito Renewables' },
    { sym: 'ICBP', name: 'Indofood CBP' },
    { sym: 'AAPL', name: 'Apple Inc.' },
    { sym: 'NVDA', name: 'NVIDIA' },
    { sym: 'MSFT', name: 'Microsoft' },
    { sym: 'GOOGL', name: 'Alphabet' },
    { sym: 'TSLA', name: 'Tesla' },
    { sym: 'JPM',  name: 'JPMorgan Chase' },
    { sym: 'BTC',  name: 'Bitcoin' },
  ];
  const WORKSPACES = [
    { kind: 'markets',   title: 'Markets · Layout',         shortcut: 'g m' },
    { kind: 'stock',     title: 'Stock · BBCA',             shortcut: 'g s', extra: { symbol: 'BBCA' } },
    { kind: 'scanners',  title: 'Scanners · Qars Best 80',  shortcut: 'g c' },
    { kind: 'macro',     title: 'Macro · Indicator Lab',    shortcut: 'g a' },
    { kind: 'industry',  title: 'Industry · Sector Map',    shortcut: 'g i' },
    { kind: 'portfolio', title: 'Portfolio · P&L',          shortcut: 'g p' },
    { kind: 'global',    title: 'Global · Map & Calendar',  shortcut: 'g g' },
  ];

  const getItems = (q) => {
    const query = (q || '').trim().toLowerCase();
    const items = [];
    // Symbol matches
    SYMBOLS.forEach(s => {
      if (!query || s.sym.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)) {
        items.push({
          id: 'sym-' + s.sym, kind: 'symbol', icon: '◆',
          title: s.sym, subtitle: s.name,
          run: () => { setSelectedSymbolRef.current?.(s.sym); openWorkspaceRef.current?.('stock', `${s.sym} · ${s.name}`, { symbol: s.sym }); },
        });
      }
    });
    // Workspace matches
    WORKSPACES.forEach(w => {
      if (!query || w.title.toLowerCase().includes(query) || w.kind.includes(query)) {
        items.push({
          id: 'ws-' + w.kind, kind: 'workspace', icon: '◧',
          title: w.title, shortcut: w.shortcut,
          run: () => openWorkspaceRef.current?.(w.kind, w.title, w.extra || {}),
        });
      }
    });
    // Verbs / actions
    const verbs = [
      { id: 'a-add',    icon: '+', title: 'Add widget',                kw: 'add widget',     run: () => openLibraryRef.current?.(null, 'add') },
      { id: 'a-edit',   icon: '✎', title: 'Toggle edit-layout mode',   kw: 'edit layout',    shortcut: 'e', run: () => setEditModeRef.current?.(m => !m) },
      { id: 'a-alert',  icon: '🔔', title: 'Open alerts panel',         kw: 'alerts notify',  shortcut: 'a', run: () => openAlertsRef.current?.() },
      { id: 'a-buy',    icon: '$', title: 'Buy (open order ticket)',   kw: 'buy order',      shortcut: 'o', run: () => openTicketRef.current?.('buy') },
      { id: 'a-sell',   icon: '$', title: 'Sell (open order ticket)',  kw: 'sell order',     run: () => openTicketRef.current?.('sell') },
      { id: 'a-set',    icon: '⚙', title: 'Settings',                  kw: 'settings prefs', run: () => openSettingsRef.current?.() },
      { id: 'a-layout', icon: '◫', title: 'Saved layouts',              kw: 'layouts dashboards', shortcut: '⌘S', run: () => openLayoutsRef.current?.() },
    ];
    verbs.forEach(v => {
      if (!query || v.title.toLowerCase().includes(query) || v.kw.includes(query)) items.push(v);
    });
    return items.slice(0, 40);
  };
  return { getItems };
};

// ================================================================
// Inner app body — has access to Qars hooks
// ================================================================
const AppShell = ({ terminal, onHome, onNewTab }) => {
  const { push } = window.Qars.useToast();
  const { openTicket } = window.Qars.useOrderTicket();
  const { triggeredCount, armedCount } = window.Qars.useAlerts();
  const session = window.Qars.useMarketSession();
  const clock = window.Qars.useLiveClock(1000);
  const { settings } = window.Qars.useSettings();
  const liveTime = window.Qars.formatClock(clock, settings.timezone);
  const tz = window.Qars.tzAbbr[settings.timezone] || 'UTC';

  return <App qars={{ push, openTicket, triggeredCount, armedCount, session, liveTime, tz }} terminal={terminal} onHome={onHome} onNewTab={onNewTab} />;
};
window.AppShell = AppShell;

const PALETTE_REFS = {
  openWorkspaceRef: { current: null },
  setEditModeRef: { current: null },
  openLibraryRef: { current: null },
  openAlertsRef: { current: null },
  openSettingsRef: { current: null },
  openLayoutsRef: { current: null },
  openTicketRef: { current: null },
  setSelectedSymbolRef: { current: null },
};
window.__paletteRefs = PALETTE_REFS;

const paletteRegistry = buildPaletteRegistry(PALETTE_REFS);
window.__paletteRegistry = paletteRegistry;
// Mount moved to lbc-shell.jsx — it stages login → home → terminal and
// renders <window.AppShell terminal=… /> for the selected terminal.
