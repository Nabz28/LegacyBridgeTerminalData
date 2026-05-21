// ================================================================
// Scanners Workspace — list of scanners + matching tickers,
// each row inline-expands to a 3-tab drawer.
// ================================================================

// ================================================================
// Phase 4 — AUTONOMOUS TRADING tab (algos that trade with capital)
// ================================================================
const AUTO_ALGOS = [
  { id: 'velocity-v2', name: 'Velocity v2 — IDX Banks',     status: 'live',   pnl: '+Rp 184.2 M', win: '63%', dd: '-4.1%', risk: 'med',  asset: 'BBCA / BBRI / BMRI', pos: 'Long Rp 2.8B', mode: 'live',  signal: '14:32 — accumulate BMRI on BI dovish skew', alloc: 'Rp 4.0B' },
  { id: 'meanrev-id',  name: 'Mean Rev — IDX Liquids',      status: 'paused', pnl: '+Rp 27.4 M',  win: '54%', dd: '-2.6%', risk: 'low',  asset: 'TLKM / ASII / UNVR', pos: 'Flat',         mode: 'paper', signal: 'paused by user 2026-05-06', alloc: 'Rp 2.0B' },
  { id: 'gap-fade-us', name: 'Gap Fade — US Megacap',       status: 'live',   pnl: '+USD 14.2 K', win: '71%', dd: '-1.8%', risk: 'low',  asset: 'NVDA / AAPL / MSFT', pos: 'Short 1.4× notional', mode: 'live', signal: '04:12 — fade NVDA gap >1.6%', alloc: 'USD 200K' },
  { id: 'coal-arb',    name: 'Coal Spread Arb — Newcastle', status: 'error',  pnl: '-USD 1.1 K',  win: '48%', dd: '-3.4%', risk: 'high', asset: 'BYAN / ADRO / PTBA', pos: 'Long/Short pair', mode: 'live', signal: 'data feed error · waiting feed restore', alloc: 'USD 80K' },
];
const ALERT_ALGOS = [
  { id: 'best80',     name: 'Best 80% — IDX',                conf: 84, asset: 'BBYB',  ts: '14:42', acted: false, history: 12 },
  { id: 'breakout',   name: 'Breakout — 20D Highs',           conf: 76, asset: 'MDKA',  ts: '14:30', acted: true,  history: 28 },
  { id: 'idx-rotation',name:'Sector Rotation — Bank → Comm',  conf: 68, asset: 'ITMG',  ts: '13:58', acted: false, history: 9  },
  { id: 'rsi-rev',    name: 'RSI Reversal — IDX Liquids',     conf: 62, asset: 'INCO',  ts: '13:21', acted: false, history: 41 },
];

const StatusPill = ({ s }) => {
  const m = { live: ['LIVE', 'pos'], paused: ['PAUSED', 'flat'], error: ['ERROR', 'neg'], paper: ['PAPER', 'flat'] };
  const [l, t] = m[s] || ['-', 'flat'];
  return <span className={`auto-pill auto-pill--${t}`}>{l}</span>;
};

const AutonomousView = () => {
  const [open, setOpen] = React.useState(null);
  const [addAlgoOpen, setAddAlgoOpen] = React.useState(false);

  const totalLive = AUTO_ALGOS.filter(a => a.status === 'live').length;
  const totalPaused = AUTO_ALGOS.filter(a => a.status === 'paused').length;
  const totalErr = AUTO_ALGOS.filter(a => a.status === 'error').length;
  const liveCapital = AUTO_ALGOS.filter(a => a.mode === 'live').length;

  if (open) return <AutoDetail algo={open} onClose={() => setOpen(null)} />;

  return (
    <div className="auto-view">
      <div className="auto-toolbar">
        <span className="auto-toolbar-status">
          <StatusPill s="live" /> <b>{totalLive} live</b>
          <span className="dot-sep">·</span>
          <StatusPill s="paused" /> <b>{totalPaused} paused</b>
          <span className="dot-sep">·</span>
          <StatusPill s="error" /> <b>{totalErr} error</b>
          <span className="dot-sep">·</span>
          <b style={{ color: 'var(--brand)' }}>{liveCapital} on live capital</b>
        </span>
        <div style={{ flex: 1 }} />
        <button className="sw-tf">⤓ Risk report</button>
        <button className="sw-tf is-active" onClick={() => setAddAlgoOpen(true)}>+ Add Algo</button>
      </div>

      <div className="auto-grid">
        {AUTO_ALGOS.map(a => (
          <div key={a.id} className={`auto-card auto-card--${a.status}`} onClick={() => setOpen(a)}>
            <div className="auto-card-h">
              <StatusPill s={a.status} />
              {a.mode === 'paper' && <span className="auto-pill auto-pill--paper">PAPER</span>}
              {a.mode === 'live' && <span className="auto-pill auto-pill--live-mode">LIVE CAPITAL</span>}
              <span className={`auto-risk auto-risk--${a.risk}`}>risk · {a.risk}</span>
            </div>
            <h3 className="auto-card-name">{a.name}</h3>
            <div className="auto-card-asset">{a.asset} · {a.pos}</div>
            <div className="auto-kv-grid">
              <div><span>P&L</span><b className={a.pnl.startsWith('-') ? 'neg' : 'pos'}>{a.pnl}</b></div>
              <div><span>Win</span><b>{a.win}</b></div>
              <div><span>Drawdown</span><b className="neg">{a.dd}</b></div>
              <div><span>Allocation</span><b>{a.alloc}</b></div>
            </div>
            <div className="auto-signal"><span>↳ {a.signal}</span></div>
            <div className="auto-card-controls">
              <button className="sw-tf" onClick={(e) => e.stopPropagation()}>{a.status === 'live' ? '⏸ Pause' : '▶ Resume'}</button>
              <button className="sw-tf" onClick={(e) => e.stopPropagation()}>⏹ Stop</button>
              <button className="sw-tf" onClick={(e) => e.stopPropagation()}>⚙ Risk</button>
              <button className="sw-tf" onClick={(e) => e.stopPropagation()}>$ Alloc</button>
            </div>
          </div>
        ))}
      </div>

      {addAlgoOpen && <AddAlgoModal onClose={() => setAddAlgoOpen(false)} />}
    </div>
  );
};

const AddAlgoModal = ({ onClose }) => {
  const [step, setStep] = React.useState('pick'); // pick | upload | api | template
  const ENTRY = [
    { k: 'upload',   l: 'Upload code',         glyph: '⌘',  desc: 'Drop a Python or pine script. We sandbox-run it before going live.', cta: 'Drop a .py / .pine file' },
    { k: 'api',      l: 'Connect API',         glyph: '⇆',  desc: 'Wire an external broker / quant API as the execution layer.',         cta: 'Choose broker' },
    { k: 'template', l: 'Use a template',      glyph: '◊',  desc: 'Start from a vetted Qars Lab template (mean-rev, momentum, breakout).', cta: 'Browse templates' },
  ];
  return (
    <div className="auto-modal-overlay" onClick={onClose}>
      <div className="auto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auto-modal-h">
          <div>
            <div className="auto-modal-eyebrow">New algorithm</div>
            <h2>Add an algorithm</h2>
            <p>Choose how the algorithm gets ingested. You can change execution mode (paper ↔ live) any time after.</p>
          </div>
          <button className="sw-tf" onClick={onClose}>✕</button>
        </div>
        {step === 'pick' && (
          <div className="auto-modal-pick">
            {ENTRY.map(e => (
              <button key={e.k} className="auto-modal-card" onClick={() => setStep(e.k)}>
                <span className="auto-modal-glyph">{e.glyph}</span>
                <span className="auto-modal-l">{e.l}</span>
                <span className="auto-modal-desc">{e.desc}</span>
                <span className="auto-modal-cta">{e.cta} →</span>
              </button>
            ))}
          </div>
        )}
        {step !== 'pick' && (
          <div className="auto-modal-step">
            <button className="sw-tf" onClick={() => setStep('pick')}>← Back to options</button>
            {step === 'upload' && (
              <div className="auto-upload-zone">
                <span className="mf-drop-glyph">▒▓</span>
                <div>
                  <b>Drop a .py / .pine file here</b>
                  <p>We'll validate its signature, run a 90-day backtest in the sandbox, and surface a risk report before letting capital touch it.</p>
                </div>
              </div>
            )}
            {step === 'api' && (
              <div className="auto-api-list">
                {['Interactive Brokers','Stockbit Pro API','Mandiri Sekuritas API','Mirae Asset HOTS','Custom REST'].map(b => (
                  <button key={b} className="auto-api-row">
                    <span>{b}</span>
                    <span className="sw-tf">Connect →</span>
                  </button>
                ))}
              </div>
            )}
            {step === 'template' && (
              <div className="auto-tpl-grid">
                {[
                  { name: 'IDX Banks Mean-Rev', risk: 'low',  yr: '+18.4%', desc: 'Mean reversion on top-5 banks. Median holding 2 days.' },
                  { name: 'Coal Spread Pair',    risk: 'med',  yr: '+22.1%', desc: 'Long BYAN / Short ITMG when ratio breaches 2σ.' },
                  { name: 'NASDAQ Momentum',     risk: 'high', yr: '+34.6%', desc: 'Daily momentum on US megacaps. Hold 5d. Stop 1.5σ.' },
                  { name: 'Coal Curve Carry',    risk: 'med',  yr: '+9.8%',  desc: 'Roll the contango on Newcastle thermal coal futures.' },
                ].map(t => (
                  <div key={t.name} className="auto-tpl-card">
                    <h4>{t.name}</h4>
                    <p>{t.desc}</p>
                    <div className="auto-tpl-meta">
                      <span className={`auto-risk auto-risk--${t.risk}`}>risk · {t.risk}</span>
                      <span className="pos">1y backtest <b>{t.yr}</b></span>
                    </div>
                    <button className="sw-tf is-active">Use this template →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AutoDetail = ({ algo, onClose }) => {
  const [tab, setTab] = React.useState('overview');
  // Build a backtest equity curve series
  const equity = React.useMemo(() => {
    const out = [];
    let v = 100;
    for (let i = 0; i < 252; i++) {
      v += Math.sin((i + algo.id.length) * 0.18) * 0.4 + 0.06 + (Math.random() - 0.45) * 0.5;
      out.push(v);
    }
    return out;
  }, [algo.id]);
  const W = 920, H = 220;
  const min = Math.min(...equity), max = Math.max(...equity), range = max - min || 1;
  const xa = (i) => (i / (equity.length - 1)) * W;
  const ya = (v) => H - ((v - min) / range) * H * 0.95 - 6;
  const eqPath = equity.map((v, i) => `${i === 0 ? 'M' : 'L'}${xa(i).toFixed(1)},${ya(v).toFixed(1)}`).join(' ');

  return (
    <div className="auto-detail">
      <div className="auto-detail-h">
        <button className="sw-tf" onClick={onClose}>← Back to algos</button>
        <h2>{algo.name}</h2>
        <StatusPill s={algo.status} />
        {algo.mode === 'live' && <span className="auto-pill auto-pill--live-mode">LIVE CAPITAL</span>}
        {algo.mode === 'paper' && <span className="auto-pill auto-pill--paper">PAPER</span>}
        <span className={`auto-risk auto-risk--${algo.risk}`}>risk · {algo.risk}</span>
      </div>

      {/* Trust controls duplicated at top per spec */}
      <div className="auto-detail-controls">
        <button className="sw-tf is-active">{algo.status === 'live' ? '⏸ Pause trading' : '▶ Resume trading'}</button>
        <button className="sw-tf">⏹ Flatten positions</button>
        <button className="sw-tf">⚙ Risk override…</button>
        <button className="sw-tf">$ Reduce allocation by 50%</button>
      </div>

      <div className="auto-detail-tabs">
        {[
          ['overview','Overview'],
          ['strategy','Strategy'],
          ['backtest','Backtest'],
          ['trades',  'Trade log'],
          ['positions','Open positions'],
          ['logs',    'Logs & errors'],
          ['versions','Version history'],
        ].map(([k, l]) => (
          <button key={k} className={`mc-news-tab ${tab === k ? 'is-on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="auto-detail-body">
        {tab === 'overview' && (
          <div className="auto-detail-grid">
            <div className="auto-detail-kv">
              <div><span>P&L</span><b className={algo.pnl.startsWith('-') ? 'neg' : 'pos'}>{algo.pnl}</b></div>
              <div><span>Win rate</span><b>{algo.win}</b></div>
              <div><span>Max drawdown</span><b className="neg">{algo.dd}</b></div>
              <div><span>Allocation</span><b>{algo.alloc}</b></div>
              <div><span>Position</span><b>{algo.pos}</b></div>
              <div><span>Last signal</span><b style={{ fontSize: 11 }}>{algo.signal}</b></div>
            </div>
            <div className="auto-detail-eq">
              <div className="ind-graph-drawer-h-sub">252-day equity curve · sandbox</div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
                <defs>
                  <linearGradient id="auto-eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pos)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--pos)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${eqPath} L${W},${H} L0,${H} Z`} fill="url(#auto-eq)" />
                <path d={eqPath} fill="none" stroke="var(--pos)" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}
        {tab === 'strategy' && (
          <div>
            <h3>Strategy logic</h3>
            <p>Liquidity-weighted momentum overlay on the IDX banks index, rebalanced intraday on dovish-tape signals from the macro feed. Capital allocation throttled by 30-day realized vol ceiling. Pause triggers on &gt;2σ adverse moves.</p>
            <h3>Parameters</h3>
            <table className="sw-tbl">
              <tbody>
                <tr><td>Lookback window</td><td className="num">21 days</td></tr>
                <tr><td>Vol ceiling</td><td className="num">18% annualized</td></tr>
                <tr><td>Stop-loss</td><td className="num">2σ</td></tr>
                <tr><td>Profit target</td><td className="num">3σ</td></tr>
                <tr><td>Rebalance cadence</td><td>Intraday on signal</td></tr>
                <tr><td>Slippage assumption</td><td className="num">8 bps</td></tr>
              </tbody>
            </table>
          </div>
        )}
        {tab === 'backtest' && (
          <div>
            <div className="auto-detail-kv">
              <div><span>CAGR</span><b className="pos">+18.4%</b></div>
              <div><span>Sharpe</span><b>1.82</b></div>
              <div><span>Sortino</span><b>2.41</b></div>
              <div><span>Max DD</span><b className="neg">-11.2%</b></div>
              <div><span>Win rate</span><b>{algo.win}</b></div>
              <div><span>Avg holding</span><b>2.4 days</b></div>
              <div><span>Profit factor</span><b>2.18</b></div>
              <div><span>Calmar</span><b>1.64</b></div>
            </div>
            <div className="auto-detail-eq">
              <div className="ind-graph-drawer-h-sub">252-day backtest equity curve</div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
                <path d={`${eqPath} L${W},${H} L0,${H} Z`} fill="rgba(25,195,125,0.18)" />
                <path d={eqPath} fill="none" stroke="var(--pos)" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}
        {tab === 'trades' && (
          <table className="sw-tbl">
            <thead><tr><th>Time</th><th>Side</th><th>Asset</th><th>Px</th><th>Qty</th><th>P&L</th></tr></thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => {
                const px = 10000 + Math.sin(i * 0.7) * 250;
                const side = i % 2 === 0 ? 'BUY' : 'SELL';
                const pnl = (i % 3 === 0 ? -1 : 1) * (i + 1) * 12.4;
                return (
                  <tr key={i}>
                    <td className="num">14:{(58 - i * 4).toString().padStart(2, '0')}:{(20 - i).toString().padStart(2, '0')}</td>
                    <td className={side === 'BUY' ? 'pos' : 'neg'}>{side}</td>
                    <td>BBCA</td>
                    <td className="num">{px.toFixed(0)}</td>
                    <td className="num">{50 + i * 5}</td>
                    <td className={`num ${pnl >= 0 ? 'pos' : 'neg'}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab === 'positions' && (
          algo.pos === 'Flat'
          ? <p style={{ color: 'var(--text-tertiary)' }}>No open positions. Algorithm is flat.</p>
          : (
            <table className="sw-tbl">
              <thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Avg px</th><th>Current</th><th>Unreal P&L</th></tr></thead>
              <tbody>
                <tr><td>BMRI</td><td className="pos">LONG</td><td className="num">12,500</td><td className="num">6,140</td><td className="num">6,175</td><td className="num pos">+437.5K</td></tr>
                <tr><td>BBRI</td><td className="pos">LONG</td><td className="num">8,200</td><td className="num">5,440</td><td className="num">5,425</td><td className="num neg">-123.0K</td></tr>
              </tbody>
            </table>
          )
        )}
        {tab === 'logs' && (
          <ul className="auto-log">
            <li><span className="auto-log-t">14:32:18</span><span className="auto-log-lvl info">INFO</span><span>Signal received · accumulate BMRI</span></li>
            <li><span className="auto-log-t">14:32:01</span><span className="auto-log-lvl info">INFO</span><span>Macro tape: BI dovish skew confirmed</span></li>
            <li><span className="auto-log-t">14:30:44</span><span className="auto-log-lvl warn">WARN</span><span>Realized vol 19.4% — within ceiling but tight</span></li>
            <li><span className="auto-log-t">13:18:02</span><span className="auto-log-lvl info">INFO</span><span>Daily rebalance complete · 12 trades</span></li>
          </ul>
        )}
        {tab === 'versions' && (
          <table className="sw-tbl">
            <thead><tr><th>Version</th><th>Deployed</th><th>Author</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>v2.4.1</td><td>2026-04-29</td><td>Aldi</td><td>Add macro overlay weight</td></tr>
              <tr><td>v2.4.0</td><td>2026-04-12</td><td>Aldi</td><td>Vol-ceiling param exposed</td></tr>
              <tr><td>v2.3.5</td><td>2026-03-21</td><td>Maya</td><td>Slippage model improved</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const AlertsView = ({ inner }) => (
  <div className="alert-view">
    {inner}
  </div>
);

const ScannerShell = (props) => {
  const [view, setView] = React.useState(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('v');
      if (v === 'autonomous' || v === 'alerts') return v;
    } catch {}
    return 'autonomous';
  });
  return (
    <div className="ind-shell">
      <div className="ind-subnav">
        {[['autonomous','Autonomous Trading'],['alerts','Scanners (Alerts only)']].map(([k, l]) => (
          <button key={k} className={`mc-subnav-tab ${view === k ? 'is-on' : ''}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      <div className="ind-subview">
        {view === 'autonomous' ? <AutonomousView /> : <ScannersWorkspaceCore {...props} />}
      </div>
    </div>
  );
};

const ScannersWorkspaceCore = ({ selectedSymbol, setSelectedSymbol, openTab }) => {
  const SCANNERS = window.DATA_EXT.SCANNERS;
  const TICKERS = window.DATA_EXT.SCANNER_TICKERS;
  const [activeScanner, setActiveScanner] = React.useState('best80');
  const [expanded, setExpanded] = React.useState(null);
  const [drawerTab, setDrawerTab] = React.useState('one-pager');
  const [search, setSearch] = React.useState('');

  const scanner = SCANNERS.find(s => s.id === activeScanner);
  const rows = (TICKERS[activeScanner] || []).filter(r =>
    !search || r.sym.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sc-ws">
      {/* Left rail: scanner list */}
      <div className="sc-rail">
        <div className="sc-rail-h">
          <span>Scanners</span>
          <span className="count">{SCANNERS.length}</span>
        </div>
        <div className="sc-rail-search">
          <input placeholder="Filter scanners…" />
        </div>
        <div className="sc-rail-list">
          {SCANNERS.map(s => (
            <div key={s.id}
                 className={`sc-rail-item ${activeScanner === s.id ? 'active' : ''}`}
                 onClick={() => { setActiveScanner(s.id); setExpanded(null); }}>
              <div className="sc-rail-name">
                <span>{s.name}</span>
                <span className="sc-rail-cad">{s.cadence}</span>
              </div>
              <div className="sc-rail-desc">{s.description}</div>
              <div className="sc-rail-foot">
                <span><b>{s.nMatches}</b> matches</span>
                <span className="dot-sep">·</span>
                <span>conv {s.avgConv}</span>
                <span className="dot-sep">·</span>
                <span className="pos">+{s.medRet1m.toFixed(1)}% 1m</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: scanner header + table */}
      <div className="sc-main">
        <div className="sc-head">
          <div>
            <div className="sc-head-name">{scanner.name}</div>
            <div className="sc-head-desc">{scanner.description}</div>
          </div>
          <div className="sc-head-stats">
            <div className="sc-hs"><div className="l">Universe</div><div className="v">{scanner.universe}</div></div>
            <div className="sc-hs"><div className="l">Run cadence</div><div className="v">{scanner.cadence}</div></div>
            <div className="sc-hs"><div className="l">Last run</div><div className="v">{scanner.runAt}</div></div>
            <div className="sc-hs"><div className="l">Matches</div><div className="v">{scanner.nMatches}</div></div>
            <div className="sc-hs"><div className="l">Avg conv</div><div className="v">{scanner.avgConv}</div></div>
            <div className="sc-hs"><div className="l">Med 1m return</div><div className="v pos">+{scanner.medRet1m.toFixed(1)}%</div></div>
          </div>
          <div className="sc-head-actions">
            <input className="sc-search" placeholder="Filter symbols / names…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="sc-btn">Export CSV</button>
            <button className="sc-btn primary">+ Save as alert</button>
          </div>
        </div>

        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Symbol</th>
                <th>Name</th>
                <th style={{ textAlign: 'right' }}>Conv</th>
                <th style={{ textAlign: 'right' }}>1W</th>
                <th style={{ textAlign: 'right' }}>1M</th>
                <th style={{ textAlign: 'right' }}>3M</th>
                <th style={{ textAlign: 'right' }}>6M</th>
                <th style={{ textAlign: 'right' }}>1Y</th>
                <th>Catalyst</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isExp = expanded === r.sym;
                return (
                  <React.Fragment key={r.sym}>
                    <tr className={`sc-row ${isExp ? 'exp' : ''}`} onClick={() => { setExpanded(isExp ? null : r.sym); }}>
                      <td><span className={`sc-caret ${isExp ? 'open' : ''}`}>▸</span></td>
                      <td><span className="brk-code">{r.sym}</span></td>
                      <td className="ln">{r.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="sc-conv">
                          <span className="sc-conv-bar"><span style={{ width: `${r.conv}%` }}></span></span>
                          <span className="sc-conv-num">{r.conv}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className={`num ${r.r1w >= 0 ? 'pos' : 'neg'}`}>{r.r1w >= 0 ? '+' : ''}{r.r1w.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }} className={`num ${r.r1m >= 0 ? 'pos' : 'neg'}`}>{r.r1m >= 0 ? '+' : ''}{r.r1m.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }} className={`num ${r.r3m >= 0 ? 'pos' : 'neg'}`}>{r.r3m >= 0 ? '+' : ''}{r.r3m.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }} className={`num ${r.r6m >= 0 ? 'pos' : 'neg'}`}>{r.r6m >= 0 ? '+' : ''}{r.r6m.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }} className={`num ${r.r252 >= 0 ? 'pos' : 'neg'}`}>{r.r252 >= 0 ? '+' : ''}{r.r252.toFixed(1)}%</td>
                      <td className="sc-cat">{r.catalyst}</td>
                      <td className="sc-go" onClick={(e) => { e.stopPropagation(); openTab && openTab({ kind: 'stock', symbol: r.sym, title: `${r.sym} · ${r.name}` }); }}>
                        Open ›
                      </td>
                    </tr>
                    {isExp && (
                      <tr className="sc-drawer-row">
                        <td colSpan={11} style={{ padding: 0 }}>
                          <ScannerDrawer
                            row={r}
                            tab={drawerTab}
                            setTab={setDrawerTab}
                            openTab={openTab}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Drawer with 3 tabs: One-pager, News, Events
const ScannerDrawer = ({ row, tab, setTab, openTab }) => {
  const candles = React.useMemo(() => buildCandles(60, 5000 + Math.random()*8000, 0.022), [row.sym]);
  return (
    <div className="sc-drawer">
      <div className="sc-drawer-tabs">
        {['one-pager','news','events','financials'].map(k => (
          <div key={k} className={`sc-drawer-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {k === 'one-pager' && 'One-pager'}
            {k === 'news' && 'News'}
            {k === 'events' && 'Events'}
            {k === 'financials' && 'Financials'}
          </div>
        ))}
        <div className="sc-drawer-spacer"></div>
        <button className="sc-btn primary" onClick={() => openTab && openTab({ kind: 'stock', symbol: row.sym, title: `${row.sym} · ${row.name}` })}>
          Open full workspace ›
        </button>
      </div>
      <div className="sc-drawer-body">
        {tab === 'one-pager' && (
          <div className="sc-onepager">
            <div className="sc-op-chart">
              <div className="sc-op-h">Price · 60d</div>
              <CandleChart candles={candles} height={220} showVolume={true} showMA={true} bottomPad={18} topPad={12} rightPad={50} />
            </div>
            <div className="sc-op-stats">
              <div className="sc-op-h">Why it matched</div>
              <div className="sc-op-catalyst">{row.catalyst}</div>
              <div className="sc-op-grid">
                <div><div className="l">Conviction</div><div className="v">{row.conv}</div></div>
                <div><div className="l">1m return</div><div className={`v ${row.r1m >= 0 ? 'pos' : 'neg'}`}>{row.r1m >= 0 ? '+' : ''}{row.r1m.toFixed(1)}%</div></div>
                <div><div className="l">3m return</div><div className={`v ${row.r3m >= 0 ? 'pos' : 'neg'}`}>{row.r3m >= 0 ? '+' : ''}{row.r3m.toFixed(1)}%</div></div>
                <div><div className="l">6m return</div><div className={`v ${row.r6m >= 0 ? 'pos' : 'neg'}`}>{row.r6m >= 0 ? '+' : ''}{row.r6m.toFixed(1)}%</div></div>
                <div><div className="l">1y return</div><div className={`v ${row.r252 >= 0 ? 'pos' : 'neg'}`}>{row.r252 >= 0 ? '+' : ''}{row.r252.toFixed(1)}%</div></div>
                <div><div className="l">Vol 30d</div><div className="v">18.4%</div></div>
              </div>
              <div className="sc-op-h" style={{ marginTop: 14 }}>AI summary</div>
              <p className="sc-op-summary">
                {row.sym} screens on {row.catalyst.split('+')[0].trim().toLowerCase()}.
                {' '}Recent price action ({row.r1m >= 0 ? 'up' : 'down'} {Math.abs(row.r1m).toFixed(1)}% over 1m) is consistent with the thesis;
                {' '}momentum ({row.r3m >= 0 ? '+' : ''}{row.r3m.toFixed(1)}% 3m) confirms participation. Conviction {row.conv}/100 weights fundamental, technical, and flow signals equally.
              </p>
            </div>
          </div>
        )}
        {tab === 'news' && (
          <div className="sc-news">
            {[
              { time: '14:32', src: 'Bisnis.com', title: `${row.sym} prepares for catalyst — analysts see 12-18% upside on base case`, sent: 'pos' },
              { time: '11:08', src: 'Reuters',    title: `Indonesia banking sector outlook positive — ${row.sym} cited as top pick on capital strength`, sent: 'pos' },
              { time: '09:12', src: 'CNBC Indo',  title: `Foreign investors net buyers — ${row.sym} sees Rp 184B inflow yesterday`, sent: 'pos' },
              { time: 'Yesterday', src: 'Kontan', title: `Q1 results preview: consensus expects EPS Rp 444 (+12.4% YoY)`, sent: 'neutral' },
              { time: '2d ago',   src: 'Bloomberg', title: `Sector rotation favoring quality — ${row.sym} P/B premium widens vs peers`, sent: 'neutral' },
              { time: '3d ago',   src: 'Investor Daily', title: `Mid-cycle review: Indonesia bank earnings revisions inflecting positive`, sent: 'pos' },
            ].map((n, i) => (
              <div key={i} className="sc-news-item">
                <span className="sc-news-time">{n.time}</span>
                <span className="sc-news-src">{n.src}</span>
                <span className={`sc-news-sent ${n.sent}`}>{n.sent === 'pos' ? '▲' : n.sent === 'neg' ? '▼' : '◆'}</span>
                <span className="sc-news-title">{n.title}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'events' && (
          <div className="sc-events">
            {[
              { date: 'May 14',  type: 'earnings', title: 'Q1 FY26 Earnings Release',     impact: 'high', desc: 'Pre-market — guidance update expected' },
              { date: 'May 22',  type: 'rate',     title: 'BI Rate Decision',              impact: 'med',  desc: 'BI 7-day RR — consensus hold at 6.00%' },
              { date: 'Jun 18',  type: 'corp',     title: 'AGM — Dividend declaration',    impact: 'med',  desc: 'Base case 60% payout = Rp 266 / share' },
              { date: 'Jun 25',  type: 'macro',    title: 'May CPI + PMI release',         impact: 'low',  desc: 'Inflation forecast 2.4-2.6%' },
              { date: 'Jul 14',  type: 'earnings', title: 'Q2 FY26 Earnings Preview',      impact: 'high', desc: 'Watch NIM trajectory + loan growth FY guide' },
            ].map((e, i) => (
              <div key={i} className="sc-event-item">
                <div className="sc-event-date">{e.date}</div>
                <div className={`sc-event-type t-${e.type}`}>{e.type}</div>
                <div className="sc-event-body">
                  <div className="sc-event-title">{e.title}</div>
                  <div className="sc-event-desc">{e.desc}</div>
                </div>
                <span className={`imp imp-${e.impact}`}>{e.impact}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'financials' && (
          <div className="sc-financials">
            <table className="sw-tbl" style={{ fontSize: 11 }}>
              <thead><tr><th>Line item</th><th style={{ textAlign: 'right' }}>FY23</th><th style={{ textAlign: 'right' }}>FY24</th><th style={{ textAlign: 'right' }}>FY25</th><th style={{ textAlign: 'right' }}>YoY</th><th style={{ textAlign: 'right' }}>5y</th></tr></thead>
              <tbody>
                {[
                  ['Revenue',          85564, 98140, 110317],
                  ['Operating Income', 50703, 59332, 68456],
                  ['Net Income',       40642, 47812, 54784],
                  ['EPS (IDR)',        330,   388,   444],
                  ['Book Value',       2480,  2784,  3142],
                  ['Cash Flow / Op',   42186, 49284, 56428],
                ].map((r, i) => {
                  const yoy = ((r[3] - r[2]) / r[2]) * 100;
                  return (
                    <tr key={i}>
                      <td className="ln">{r[0]}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmt.num(r[1], 0)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmt.num(r[2], 0)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmt.num(r[3], 0)}</td>
                      <td style={{ textAlign: 'right' }} className={`num ${yoy >= 0 ? 'pos' : 'neg'}`}>{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }}>
                        <Spark data={[r[1]*0.85, r[1], r[2], r[3], r[3]*1.08]} color={yoy >= 0 ? 'var(--pos)' : 'var(--neg)'} w={70} h={20} fill={false} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

window.ScannersWorkspace = ScannerShell;
