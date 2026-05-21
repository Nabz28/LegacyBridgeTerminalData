// ================================================================
// Industry Lab — focused 3-tier zoom
// Tier 1: All sectors (cards) → Tier 2: sub-industries (rows)
// Tier 3: leaders (full cards) → click opens stock workspace
// ================================================================

// ================================================================
// Phase 4 — Industry DASHBOARD (3-pane)
//   Emerging Industries · Charts · Supplier→Demander graph
// ================================================================

const EMERGING_ID = [
  { name: 'EV Battery Materials', momentum: 92, score: 8.4, leaders: ['ANTM','MDKA','MBMA'], sub: 'Mining · Critical Minerals' },
  { name: 'Coal Methanol Conversion', momentum: 78, score: 7.6, leaders: ['BYAN','ITMG'], sub: 'Energy · Chemicals' },
  { name: 'Cold-Chain Logistics', momentum: 71, score: 7.1, leaders: ['SMSM','ASII'], sub: 'Industrials · Logistics' },
  { name: 'Halal Food Export', momentum: 65, score: 6.8, leaders: ['UNVR','INDF','MYOR'], sub: 'Consumer · Food' },
  { name: 'Fintech Lending', momentum: 58, score: 6.5, leaders: ['BBYB','ARTO'], sub: 'Financials · Digital' },
];
const EMERGING_US = [
  { name: 'Datacenter Power', momentum: 98, score: 9.2, leaders: ['VST','CEG','TLN'], sub: 'Utilities · IPP' },
  { name: 'GLP-1 Manufacturing', momentum: 88, score: 8.5, leaders: ['LLY','NVO','VKTX'], sub: 'Healthcare · Pharma' },
  { name: 'AI Inference Silicon', momentum: 84, score: 8.3, leaders: ['NVDA','AVGO','MRVL'], sub: 'Tech · Semis' },
  { name: 'Defense Drones', momentum: 76, score: 7.7, leaders: ['KTOS','AVAV','RKLB'], sub: 'Industrials · Defense' },
  { name: 'Quantum Compute', momentum: 64, score: 6.6, leaders: ['IONQ','RGTI'], sub: 'Tech · Frontier' },
];

const INDUSTRY_GRAPH_NODES = [
  { id: 'coal',     label: 'Coal Mining',     x: 0.20, y: 0.30, group: 'mining',     stocks: [['BYAN','Bayan Resources'],['ADRO','Adaro Energy'],['ITMG','Indo Tambangraya'],['PTBA','Bukit Asam'],['BUMI','Bumi Resources']] },
  { id: 'cement',   label: 'Cement',          x: 0.50, y: 0.18, group: 'materials',  stocks: [['INTP','Indocement'],['SMGR','Semen Indonesia'],['SMBR','Semen Baturaja']] },
  { id: 'steel',    label: 'Steel',           x: 0.78, y: 0.22, group: 'materials',  stocks: [['KRAS','Krakatau Steel'],['ISSP','Steel Pipe'],['GDST','Gunawan Dianjaya']] },
  { id: 'utility',  label: 'Utility',         x: 0.85, y: 0.50, group: 'utility',    stocks: [['PGAS','PGN'],['POWR','Cikarang Listrindo'],['CINI','Cita Mineral']] },
  { id: 'logistics',label: 'Bulk Shipping',   x: 0.50, y: 0.50, group: 'logistics',  stocks: [['SMDR','Samudera Indonesia'],['HITS','Humpuss Intermoda'],['BBRM','Pelayaran Nasional']] },
  { id: 'palmoil',  label: 'Palm Oil',        x: 0.20, y: 0.70, group: 'agri',       stocks: [['AALI','Astra Agro Lestari'],['LSIP','PP London Sumatra'],['SIMP','Salim Ivomas'],['SSMS','Sawit Sumbermas']] },
  { id: 'food',     label: 'Packaged Food',   x: 0.45, y: 0.78, group: 'consumer',   stocks: [['UNVR','Unilever Indonesia'],['INDF','Indofood Sukses'],['MYOR','Mayora Indah'],['ICBP','Indofood CBP']] },
  { id: 'retail',   label: 'Modern Retail',   x: 0.72, y: 0.78, group: 'consumer',   stocks: [['MAPI','Mitra Adiperkasa'],['ACES','Ace Hardware'],['LPPF','Matahari Department'],['RALS','Ramayana Lestari']] },
  { id: 'banks',    label: 'Banks',           x: 0.10, y: 0.50, group: 'financials', stocks: [['BBCA','Bank Central Asia'],['BBRI','Bank Rakyat Indonesia'],['BMRI','Bank Mandiri'],['BBNI','Bank Negara Indonesia'],['BRIS','Bank Syariah']] },
  { id: 'autos',    label: 'Autos & Parts',   x: 0.32, y: 0.92, group: 'consumer',   stocks: [['ASII','Astra International'],['AUTO','Astra Otoparts'],['SMSM','Selamat Sempurna'],['IMAS','Indomobil Sukses']] },
];
const INDUSTRY_GRAPH_EDGES = [
  ['coal','utility',0.92],['coal','logistics',0.78],['coal','steel',0.55],
  ['cement','steel',0.62],['cement','logistics',0.48],
  ['palmoil','food',0.85],['palmoil','logistics',0.66],
  ['food','retail',0.74],['autos','retail',0.42],['autos','steel',0.55],
  ['banks','autos',0.30],['banks','retail',0.35],
];

const IndustryDashboard = () => {
  const Spark = window.Spark;
  const [region, setRegion] = React.useState('ID');
  const [focusId, setFocusId] = React.useState('coal');
  const W = 720, H = 480;
  const nodeMap = Object.fromEntries(INDUSTRY_GRAPH_NODES.map(n => [n.id, n]));
  const focus = nodeMap[focusId];
  const list = region === 'ID' ? EMERGING_ID : EMERGING_US;
  return (
    <div className="ind-dash">
      <div className="ind-dash-emerging">
        <div className="ind-pane-h">
          <span>Emerging Industries</span>
          <div className="ind-region-toggle">
            {['ID','US'].map(r => (
              <button key={r} className={`ind-region-tab ${region === r ? 'is-on' : ''}`} onClick={() => setRegion(r)}>{r}</button>
            ))}
          </div>
        </div>
        <ul className="ind-emerging-list">
          {list.map((e, i) => (
            <li key={e.name} className="ind-emerging-row">
              <div className="ind-emerging-rank">{(i + 1).toString().padStart(2, '0')}</div>
              <div className="ind-emerging-main">
                <div className="ind-emerging-name">{e.name}</div>
                <div className="ind-emerging-sub">{e.sub} · {e.leaders.join(' · ')}</div>
              </div>
              <div className="ind-emerging-bars">
                <div className="ind-emerging-bar"><span className="ind-emerging-bar-l">Momentum</span><div className="ind-emerging-bar-track"><span style={{ width: `${e.momentum}%` }} /></div><span className="ind-emerging-bar-v">{e.momentum}</span></div>
                <div className="ind-emerging-bar"><span className="ind-emerging-bar-l">Analyst</span><div className="ind-emerging-bar-track"><span style={{ width: `${e.score * 10}%` }} /></div><span className="ind-emerging-bar-v">{e.score.toFixed(1)}</span></div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="ind-dash-charts">
        <div className="ind-pane-h"><span>Top emerging — price action</span></div>
        <div className="ind-chart-row">
          {['IDX','US'].map(r => (
            <div key={r} className="ind-chart-card">
              <div className="ind-chart-card-h">
                <span className="ind-chart-card-tag">{r}</span>
                <span className="ind-chart-card-name">{r === 'IDX' ? 'EV Battery Materials Index' : 'Datacenter Power Index'}</span>
                <span className="ind-chart-card-chg pos">+{r === 'IDX' ? '12.4' : '18.7'}%</span>
              </div>
              <div className="ind-chart-card-spark">
                <Spark
                  data={Array.from({ length: 60 }, (_, i) => 100 + i * (r === 'IDX' ? 0.18 : 0.28) + Math.sin(i * 0.4) * 3)}
                  color="var(--pos)" w={520} h={120} fill={true} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ind-dash-graph">
        <div className="ind-pane-h"><span>Supplier ↔ Demander graph</span></div>
        <div className="ind-graph-canvas">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
            <defs>
              <pattern id="ind-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#ind-grid)" />
            {INDUSTRY_GRAPH_EDGES.map(([a, b, w], i) => {
              const na = nodeMap[a], nb = nodeMap[b];
              const isFocused = focusId === a || focusId === b;
              return (
                <line key={i}
                  x1={na.x * W} y1={na.y * H}
                  x2={nb.x * W} y2={nb.y * H}
                  stroke="var(--brand)"
                  strokeWidth={w * 2 + 0.5}
                  strokeOpacity={isFocused ? 0.85 : 0.18} />
              );
            })}
            {INDUSTRY_GRAPH_NODES.map(n => {
              const isFocus = n.id === focusId;
              const isLinked = INDUSTRY_GRAPH_EDGES.some(([a, b]) => (a === focusId && b === n.id) || (b === focusId && a === n.id));
              return (
                <g key={n.id} onClick={() => setFocusId(n.id)} style={{ cursor: 'pointer' }} opacity={isFocus || isLinked ? 1 : 0.4}>
                  <circle cx={n.x * W} cy={n.y * H} r={isFocus ? 22 : 16}
                    fill={isFocus ? 'var(--brand)' : 'var(--bg-3)'}
                    stroke="var(--brand)" strokeWidth={1.5} />
                  <text x={n.x * W} y={n.y * H + (isFocus ? 22 : 16) + 12}
                    textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10"
                    fill="var(--text-secondary)" letterSpacing="0.04em">{n.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="ind-graph-drawer">
          <div className="ind-graph-drawer-h">
            <span className="mc-tag">{focus.group}</span>
            <h3>{focus.label}</h3>
          </div>
          <div className="ind-graph-drawer-section">
            <div className="ind-graph-drawer-h-sub">Suppliers (upstream)</div>
            <ul>
              {INDUSTRY_GRAPH_EDGES.filter(([, b]) => b === focusId).map(([a,, w], i) => (
                <li key={i}><span>{nodeMap[a].label}</span><span className="num">{w.toFixed(2)}</span></li>
              ))}
              {INDUSTRY_GRAPH_EDGES.filter(([, b]) => b === focusId).length === 0 && <li className="empty">— none —</li>}
            </ul>
          </div>
          <div className="ind-graph-drawer-section">
            <div className="ind-graph-drawer-h-sub">Demanders (downstream)</div>
            <ul>
              {INDUSTRY_GRAPH_EDGES.filter(([a]) => a === focusId).map(([, b, w], i) => (
                <li key={i}><span>{nodeMap[b].label}</span><span className="num">{w.toFixed(2)}</span></li>
              ))}
              {INDUSTRY_GRAPH_EDGES.filter(([a]) => a === focusId).length === 0 && <li className="empty">— none —</li>}
            </ul>
          </div>
          <div className="ind-graph-drawer-section">
            <div className="ind-graph-drawer-h-sub">Key stocks · {focus.stocks?.length || 0}</div>
            <ul className="ind-stocks-list">
              {(focus.stocks || []).map(([sym, name], i) => (
                <li key={i} className="ind-stocks-row" onClick={() => null}>
                  <span className="ind-stocks-sym">{sym}</span>
                  <span className="ind-stocks-name">{name}</span>
                  <span className="ind-stocks-go">→</span>
                </li>
              ))}
              {(!focus.stocks || focus.stocks.length === 0) && <li className="empty">— no stocks mapped —</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const IndustrySectorsView = ({ openTab }) => {
  const fmt = window.fmt;
  const Spark = window.Spark;
  const G = window.DATA_EXT.INDUSTRY_GRAPH;
  const TICKER_UNIVERSE = window.DATA_EXT.TICKER_UNIVERSE;

  const [tier, setTier] = React.useState(1);          // 1 | 2 | 3
  const [activeSector, setActiveSector] = React.useState(null);
  const [activeSubInd, setActiveSubInd] = React.useState(null);

  const sectorColor = (perf) => {
    if (perf >= 3) return 'var(--pos)';
    if (perf >= 1) return '#3FA774';
    if (perf >= 0) return '#5DB89C';
    if (perf >= -1) return '#C46874';
    return 'var(--neg)';
  };

  const goSector = (sec) => { setActiveSector(sec); setActiveSubInd(null); setTier(2); };
  const goSubInd  = (sub) => { setActiveSubInd(sub); setTier(3); };
  const goHome    = () => { setActiveSector(null); setActiveSubInd(null); setTier(1); };

  // Sector mini bars (deterministic per sector id)
  const sparkFor = (id) => {
    const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    const out = [];
    for (let i = 0; i < 12; i++) out.push(Math.sin(seed + i * 0.7) + Math.cos(seed * 1.3 + i * 0.4));
    return out;
  };

  // Sub-industry data with synthetic perf
  const subIndustries = activeSector ? (G.subIndustries[activeSector.id] || []) : [];
  const enrichedSubs = subIndustries.map((s, i) => ({
    ...s,
    perf: +(activeSector.perf1m + (Math.sin(i * 1.7) * 2.4)).toFixed(2),
    breadth: 0.4 + Math.sin(i * 0.8) * 0.4 + 0.4,
  })).sort((a, b) => b.perf - a.perf);

  return (
    <div className="in-ws">
      {/* Left rail: persistent sector list with quick perf */}
      <div className="in-rail">
        <div className="in-rail-h">Sectors</div>
        <div className="in-rail-list">
          <div className={`in-rail-row ${tier === 1 ? 'active' : ''}`} onClick={goHome}>
            <span className="in-rail-dot" style={{ background: 'var(--brand-steel)' }}></span>
            <span className="in-rail-name">All sectors</span>
            <span className="in-rail-perf" style={{ color: 'var(--text-tertiary)' }}>{G.sectors.length}</span>
          </div>
          {G.sectors.map(s => (
            <div key={s.id}
                 className={`in-rail-row ${activeSector?.id === s.id ? 'active' : ''}`}
                 onClick={() => goSector(s)}>
              <span className="in-rail-dot" style={{ background: sectorColor(s.perf1m) }}></span>
              <span className="in-rail-name">{s.label}</span>
              <span className={`in-rail-perf ${s.perf1m >= 0 ? 'pos' : 'neg'}`}>{s.perf1m >= 0 ? '+' : ''}{s.perf1m.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="in-main">
        {/* Breadcrumb */}
        <div className="in-bc">
          <span className={`crumb ${tier === 1 ? 'cur' : ''}`} onClick={goHome}>Industry Lab</span>
          {activeSector && <><span className="sep">›</span><span className={`crumb ${tier === 2 ? 'cur' : ''}`} onClick={() => { setActiveSubInd(null); setTier(2); }}>{activeSector.label}</span></>}
          {activeSubInd && <><span className="sep">›</span><span className="crumb cur">{activeSubInd.label}</span></>}
        </div>

        {/* TIER 1 — All sectors */}
        {tier === 1 && (
          <>
            <div className="in-tier">
              <div>
                <div className="in-tier-title">All sectors · IDX</div>
                <div className="in-tier-sub">10 GICS sectors · 403 listed tickers · click any sector to drill into sub-industries</div>
              </div>
              <div className="in-tier-stats">
                <div className="in-tier-stat"><div className="l">Composite 1m</div><div className="v pos">+2.14%</div></div>
                <div className="in-tier-stat"><div className="l">Best</div><div className="v pos">Materials +4.6%</div></div>
                <div className="in-tier-stat"><div className="l">Worst</div><div className="v neg">Energy −1.8%</div></div>
              </div>
            </div>

            <div className="in-grid">
              {[...G.sectors].sort((a, b) => b.perf1m - a.perf1m).map(s => {
                const spark = sparkFor(s.id);
                return (
                  <div key={s.id} className="in-card" onClick={() => goSector(s)}>
                    <div className="in-card-h">
                      <div>
                        <div className="in-card-name">{s.label}</div>
                        <div className="in-card-meta">{s.nTickers} tickers · {Object.keys(G.subIndustries[s.id] || {}).length || 0} sub-industries</div>
                      </div>
                      <div className={`in-card-perf ${s.perf1m >= 0 ? 'pos' : 'neg'}`}>
                        {s.perf1m >= 0 ? '+' : ''}{s.perf1m.toFixed(1)}<span style={{ fontSize: 10, marginLeft: 2, color: 'var(--text-tertiary)', fontWeight: 500 }}>%</span>
                      </div>
                    </div>
                    <div className="in-card-bar">
                      {spark.map((v, i) => {
                        const norm = (v + 2) / 4;
                        return <span key={i} style={{
                          height: `${20 + norm * 80}%`,
                          background: v >= 0 ? sectorColor(s.perf1m) : 'rgba(240,71,92,0.5)',
                        }} />;
                      })}
                    </div>
                    <div className="in-card-foot">
                      <span>1m</span>
                      <span style={{ color: 'var(--brand-steel)' }}>Drill in ›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TIER 2 — Sub-industries within sector */}
        {tier === 2 && activeSector && (
          <>
            <div className="in-tier">
              <div>
                <div className="in-tier-title">{activeSector.label}</div>
                <div className="in-tier-sub">{enrichedSubs.length} sub-industries · {activeSector.nTickers} tickers · ranked by 1m performance</div>
              </div>
              <div className="in-tier-stats">
                <div className="in-tier-stat"><div className="l">Sector 1m</div><div className={`v ${activeSector.perf1m >= 0 ? 'pos' : 'neg'}`}>{activeSector.perf1m >= 0 ? '+' : ''}{activeSector.perf1m.toFixed(1)}%</div></div>
                <div className="in-tier-stat"><div className="l">Breadth</div><div className="v">{Math.round(60 + Math.random() * 30)}% advancing</div></div>
                <div className="in-tier-stat"><div className="l">Foreign flow 5d</div><div className="v pos">+Rp 1.4T</div></div>
              </div>
            </div>

            <div className="in-sub-list">
              {enrichedSubs.map((s, i) => (
                <div key={s.id} className="in-sub-row" onClick={() => goSubInd(s)}>
                  <div className="in-sub-rank">{(i + 1).toString().padStart(2, '0')}</div>
                  <div>
                    <div className="in-sub-name">{s.label}</div>
                    <div className="in-sub-count">{s.size} tickers · breadth {Math.round(s.breadth * 100)}%</div>
                  </div>
                  <div className={`in-sub-perf ${s.perf >= 0 ? 'pos' : 'neg'}`}>
                    {s.perf >= 0 ? '+' : ''}{s.perf.toFixed(1)}%
                  </div>
                  <div className="in-sub-bar">
                    <span style={{
                      left: '50%',
                      width: `${Math.min(50, Math.abs(s.perf) * 5)}%`,
                      [s.perf >= 0 ? 'left' : 'right']: '50%',
                      background: s.perf >= 0 ? 'var(--pos)' : 'var(--neg)',
                    }}></span>
                  </div>
                  <div className="in-sub-leaders">
                    {s.leaders.slice(0, 3).map(l => <span key={l} className="in-sub-leader">{l}</span>)}
                  </div>
                  <div className="in-sub-go">Open ›</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TIER 3 — Leaders within sub-industry */}
        {tier === 3 && activeSubInd && (
          <>
            <div className="in-tier">
              <div>
                <div className="in-tier-title">{activeSubInd.label}</div>
                <div className="in-tier-sub">{activeSubInd.size} tickers · {activeSubInd.leaders.length} leaders shown · click any to open full workspace</div>
              </div>
              <div className="in-tier-stats">
                <div className="in-tier-stat"><div className="l">Sub-ind 1m</div><div className={`v ${activeSubInd.perf >= 0 ? 'pos' : 'neg'}`}>{activeSubInd.perf >= 0 ? '+' : ''}{activeSubInd.perf.toFixed(1)}%</div></div>
                <div className="in-tier-stat"><div className="l">Avg P/E</div><div className="v">14.6x</div></div>
                <div className="in-tier-stat"><div className="l">Avg ROE</div><div className="v">17.4%</div></div>
              </div>
            </div>

            <div className="in-leaders-grid">
              {activeSubInd.leaders.map(sym => {
                const t = TICKER_UNIVERSE[sym] || {
                  symbol: sym, name: sym, price: 1000 + Math.random() * 5000,
                  chg: (Math.random() - 0.5) * 100, chgp: (Math.random() - 0.5) * 3,
                  pe: 10 + Math.random() * 15, pb: 1 + Math.random() * 4,
                  divYield: Math.random() * 6, mcap: 'Rp ' + Math.round(50 + Math.random() * 800) + ' T',
                };
                return (
                  <div key={sym} className="in-leader-card" onClick={() => openTab && openTab({ kind: 'stock', symbol: sym, title: `${sym} · ${t.name}` })}>
                    <div className="in-leader-h">
                      <div>
                        <div className="in-leader-sym">{sym}</div>
                        <div className="in-leader-name">{t.name}</div>
                      </div>
                      <div className="in-leader-px">
                        <div className="p">{fmt.num(t.price, 0)}</div>
                        <div className={`c ${t.chgp >= 0 ? 'pos' : 'neg'}`}>{t.chgp >= 0 ? '+' : ''}{t.chgp.toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="in-leader-stats">
                      <div><div className="l">Mcap</div><div className="v">{t.mcap}</div></div>
                      <div><div className="l">P/E</div><div className="v">{t.pe?.toFixed?.(1) || '—'}</div></div>
                      <div><div className="l">P/B</div><div className="v">{t.pb?.toFixed?.(1) || '—'}</div></div>
                      <div><div className="l">Div Y</div><div className="v">{t.divYield?.toFixed?.(1) || '—'}%</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const IndustryWorkspace = ({ openTab }) => (
  <div className="ind-workspace">
    <IndustryDashboard openTab={openTab} />
  </div>
);

window.IndustryWorkspace = IndustryWorkspace;
// IndustrySectorsView retained internally for future tier-3 drill from dashboard pane 1
void IndustrySectorsView;
