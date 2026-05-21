// ================================================================
// Global Map + Economic Calendar workspace
// Stylized world dots map (no real geography) showing market perf
// + filterable economic calendar on the right.
// ================================================================

const GlobalWorkspace = () => {
  const fmt = window.fmt;
  const CALENDAR = window.DATA_EXT.CALENDAR;
  const [impFilter, setImpFilter] = React.useState('all'); // all | high | med | low
  const [regionFilter, setRegionFilter] = React.useState('all');

  // Fake regions w/ position on a stylized 1000x520 SVG canvas
  const regions = [
    { id: 'us',  name: 'United States',  flag: '🇺🇸', x: 200, y: 220, idx: 'S&P 500',    px: '5,428',  perf: 0.42,  vol: '$842B' },
    { id: 'ca',  name: 'Canada',         flag: '🇨🇦', x: 215, y: 165, idx: 'TSX',        px: '21,840', perf: 0.18,  vol: '$28B' },
    { id: 'mx',  name: 'Mexico',         flag: '🇲🇽', x: 195, y: 280, idx: 'MEXBOL',     px: '54,840', perf: -0.42, vol: '$4B' },
    { id: 'br',  name: 'Brazil',         flag: '🇧🇷', x: 290, y: 350, idx: 'IBOV',       px: '128,420',perf: 1.24,  vol: '$18B' },
    { id: 'uk',  name: 'United Kingdom', flag: '🇬🇧', x: 460, y: 195, idx: 'FTSE 100',   px: '8,142',  perf: 0.62,  vol: '£42B' },
    { id: 'de',  name: 'Germany',        flag: '🇩🇪', x: 490, y: 215, idx: 'DAX',        px: '18,420', perf: 0.74,  vol: '€38B' },
    { id: 'fr',  name: 'France',         flag: '🇫🇷', x: 475, y: 235, idx: 'CAC 40',     px: '8,184',  perf: 0.48,  vol: '€32B' },
    { id: 'it',  name: 'Italy',          flag: '🇮🇹', x: 505, y: 250, idx: 'FTSE MIB',   px: '34,820', perf: 0.32,  vol: '€18B' },
    { id: 'ru',  name: 'Russia',         flag: '🇷🇺', x: 620, y: 175, idx: 'MOEX',       px: '3,184',  perf: -1.24, vol: '$8B' },
    { id: 'sa',  name: 'Saudi Arabia',   flag: '🇸🇦', x: 575, y: 280, idx: 'TASI',       px: '12,140', perf: -0.18, vol: '$12B' },
    { id: 'tr',  name: 'Turkey',         flag: '🇹🇷', x: 555, y: 245, idx: 'BIST 100',   px: '11,240', perf: 1.84,  vol: '$6B' },
    { id: 'in',  name: 'India',          flag: '🇮🇳', x: 695, y: 265, idx: 'NIFTY 50',   px: '24,840', perf: 0.84,  vol: '$58B' },
    { id: 'cn',  name: 'China',          flag: '🇨🇳', x: 765, y: 230, idx: 'CSI 300',    px: '3,840',  perf: -0.42, vol: '¥420B' },
    { id: 'hk',  name: 'Hong Kong',      flag: '🇭🇰', x: 790, y: 265, idx: 'HSI',        px: '17,840', perf: 1.42,  vol: 'HK$84B' },
    { id: 'jp',  name: 'Japan',          flag: '🇯🇵', x: 845, y: 230, idx: 'Nikkei 225', px: '38,420', perf: 1.18,  vol: '¥18T' },
    { id: 'kr',  name: 'South Korea',    flag: '🇰🇷', x: 815, y: 240, idx: 'KOSPI',      px: '2,742',  perf: 0.88,  vol: '₩12T' },
    { id: 'sg',  name: 'Singapore',      flag: '🇸🇬', x: 770, y: 320, idx: 'STI',        px: '3,418',  perf: 0.34,  vol: 'S$2B' },
    { id: 'id',  name: 'Indonesia',      flag: '🇮🇩', x: 790, y: 360, idx: 'IHSG',       px: '7,283',  perf: 1.21,  vol: 'Rp 8.2T', highlight: true },
    { id: 'au',  name: 'Australia',      flag: '🇦🇺', x: 850, y: 410, idx: 'ASX 200',    px: '7,840',  perf: 0.42,  vol: 'A$8B' },
    { id: 'za',  name: 'South Africa',   flag: '🇿🇦', x: 525, y: 400, idx: 'JSE',        px: '78,420', perf: -0.62, vol: 'R 18B' },
  ];

  const perfColor = (p) => {
    if (p >= 1) return '#1FB877';
    if (p >= 0.3) return '#5DD3A0';
    if (p >= 0) return '#86A4D5';
    if (p >= -0.5) return '#C46874';
    return '#F0475C';
  };
  const perfRadius = (p) => 6 + Math.min(18, Math.abs(p) * 8);

  // Group calendar by date
  const filtered = CALENDAR.filter(e =>
    (impFilter === 'all' || e.imp === impFilter) &&
    (regionFilter === 'all' || e.region === regionFilter)
  );
  const byDate = {};
  filtered.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });

  // Build connection lines among major hubs for visual richness
  const links = [
    ['us','uk'], ['us','jp'], ['us','cn'], ['uk','de'], ['uk','fr'],
    ['cn','hk'], ['cn','jp'], ['jp','kr'], ['hk','sg'], ['sg','id'],
    ['id','jp'], ['de','fr'], ['de','it'], ['in','cn'], ['au','sg'],
    ['us','br'], ['us','ca'], ['br','mx'], ['ru','de'], ['sa','in'],
  ];

  return (
    <div className="gm-ws">
      <div className="gm-main">
        <div className="gm-head">
          <div>
            <div className="gm-head-title">Global Markets · Live Map</div>
            <div className="gm-head-sub">20 markets · last update 14:58:25 · color = 1d perf · size = volume</div>
          </div>
          <div className="gm-legend">
            <span className="gm-legend-item"><span className="gm-legend-sw" style={{ background: '#1FB877' }}></span>+1.0%+</span>
            <span className="gm-legend-item"><span className="gm-legend-sw" style={{ background: '#5DD3A0' }}></span>+0.3-1.0%</span>
            <span className="gm-legend-item"><span className="gm-legend-sw" style={{ background: '#86A4D5' }}></span>flat</span>
            <span className="gm-legend-item"><span className="gm-legend-sw" style={{ background: '#C46874' }}></span>-0.5-0%</span>
            <span className="gm-legend-item"><span className="gm-legend-sw" style={{ background: '#F0475C' }}></span>-0.5%-</span>
          </div>
        </div>

        <div className="gm-map-wrap">
          <svg viewBox="0 0 1000 520" className="gm-map-svg" preserveAspectRatio="xMidYMid meet">
            {/* Background grid lines (long/lat-ish) */}
            {[100, 200, 300, 400].map(y => (
              <line key={y} x1="40" y1={y} x2="960" y2={y} stroke="rgba(151,170,197,0.05)" strokeDasharray="2 6" strokeWidth="0.5" />
            ))}
            {[150, 300, 450, 600, 750, 900].map(x => (
              <line key={x} x1={x} y1="40" y2="480" y2="480" x2={x} stroke="rgba(151,170,197,0.05)" strokeDasharray="2 6" strokeWidth="0.5" />
            ))}

            {/* Stylized continent silhouettes (very loose, dot-cloud style) */}
            {(() => {
              const blobs = [];
              regions.forEach(r => {
                for (let i = 0; i < 22; i++) {
                  const a = (i / 22) * Math.PI * 2;
                  const rad = 18 + Math.sin(i * 1.7 + r.x) * 8;
                  const dx = Math.cos(a) * rad + (Math.sin(i + r.y) * 6);
                  const dy = Math.sin(a) * rad * 0.6 + (Math.cos(i + r.x) * 4);
                  blobs.push(<circle key={`${r.id}-${i}`} cx={r.x + dx} cy={r.y + dy} r="0.9" fill="rgba(151,170,197,0.16)" />);
                }
              });
              return blobs;
            })()}

            {/* Connection lines */}
            {links.map(([a, b], i) => {
              const A = regions.find(r => r.id === a);
              const B = regions.find(r => r.id === b);
              if (!A || !B) return null;
              const isActive = a === 'id' || b === 'id';
              return <path key={i} className={`gm-link ${isActive ? 'active' : ''}`}
                           d={`M ${A.x} ${A.y} Q ${(A.x+B.x)/2} ${Math.min(A.y,B.y)-30} ${B.x} ${B.y}`} />;
            })}

            {/* Region nodes */}
            {regions.map(r => {
              const c = perfColor(r.perf);
              const rad = perfRadius(r.perf);
              return (
                <g key={r.id} className="gm-node" transform={`translate(${r.x}, ${r.y})`}>
                  {r.highlight && (
                    <>
                      <circle className="gm-node-ring" r={rad + 12} fill="none" stroke="var(--brand-steel)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
                        <animate attributeName="r" values={`${rad+8};${rad+18};${rad+8}`} dur="2.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.6s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                  <circle className="gm-node-bubble" r={rad} fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1.2" />
                  <circle className="gm-node-bubble" r={Math.max(2, rad * 0.35)} fill={c} />
                  <text x="0" y={rad + 13} fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--text-secondary)" textAnchor="middle" fontWeight="600">
                    {r.idx}
                  </text>
                  <text x="0" y={rad + 24} fontSize="10" fontFamily="var(--font-mono)" fill={c} textAnchor="middle" fontWeight="700">
                    {r.perf >= 0 ? '+' : ''}{r.perf.toFixed(2)}%
                  </text>
                  {r.highlight && (
                    <text x="0" y={-rad - 8} fontSize="11" fontFamily="var(--font-mono)" fill="var(--brand-steel)" textAnchor="middle" fontWeight="700">
                      ★ HOME
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Right: economic calendar */}
      <div className="gm-cal">
        <div className="gm-cal-h">
          <span>Economic Calendar</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>
            {filtered.length} events
          </span>
        </div>
        <div className="gm-cal-filters">
          {['all','high','med','low'].map(k => (
            <button key={k} className={`gm-cal-chip ${impFilter === k ? 'active' : ''}`} onClick={() => setImpFilter(k)}>{k}</button>
          ))}
          <span style={{ flex: 1 }}></span>
          {['all','US','EU','ID'].map(k => (
            <button key={k} className={`gm-cal-chip ${regionFilter === k ? 'active' : ''}`} onClick={() => setRegionFilter(k)}>{k}</button>
          ))}
        </div>

        <div className="gm-cal-list">
          {Object.entries(byDate).map(([date, events]) => (
            <React.Fragment key={date}>
              <div className="gm-cal-day">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              {events.map((e, i) => (
                <div key={i} className="gm-cal-row">
                  <span className="gm-cal-time">{e.time}</span>
                  <span className="gm-cal-flag">{e.country}</span>
                  <div>
                    <div className="gm-cal-event">{e.event}</div>
                    <div className="gm-cal-vals">
                      <span className={e.actual ? 'actual' : ''}>A: <b>{e.actual || '—'}</b></span>
                      <span>C: <b>{e.cons}</b></span>
                      <span>P: <b>{e.prev}</b></span>
                    </div>
                  </div>
                  <span className={`gm-cal-imp ${e.imp}`}>{e.imp}</span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

window.GlobalWorkspace = GlobalWorkspace;
