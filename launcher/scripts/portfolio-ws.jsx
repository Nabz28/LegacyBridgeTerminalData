// ================================================================
// Portfolio + Algo Marketplace workspace
// Tabs: Holdings · Performance · Algos
// ================================================================

const PortfolioWorkspace = ({ openTab }) => {
  const fmt = window.fmt;
  const { AreaChart } = window.ChartLib;
  const P = window.DATA_EXT.PORTFOLIO;
  const ALGOS = window.DATA_EXT.ALGOS;
  const [tab, setTab] = React.useState('holdings');

  return (
    <div className="po-ws">
      <div className="po-tabs">
        {[
          ['holdings', 'Holdings'],
          ['performance', 'Performance'],
          ['algos', 'Algo Marketplace'],
        ].map(([k, l]) => (
          <div key={k} className={`po-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      <div className="po-body">
        {/* KPI Strip — always visible */}
        <div className="po-kpis">
          <div className="po-kpi">
            <div className="l">Total value</div>
            <div className="v lg">{P.totalValue}</div>
            <div className={`d ${P.pnlDayPct >= 0 ? 'pos' : 'neg'}`}>{P.pnlDay} ({P.pnlDayPct >= 0 ? '+' : ''}{P.pnlDayPct.toFixed(2)}%) today</div>
          </div>
          <div className="po-kpi">
            <div className="l">Invested</div>
            <div className="v">{P.invested}</div>
            <div className="d" style={{ color: 'var(--text-tertiary)' }}>{P.positions.length} positions</div>
          </div>
          <div className="po-kpi">
            <div className="l">Cash</div>
            <div className="v">{P.cash}</div>
            <div className="d" style={{ color: 'var(--text-tertiary)' }}>5.1% of NAV</div>
          </div>
          <div className="po-kpi">
            <div className="l">Total P/L</div>
            <div className="v pos" style={{ color: 'var(--pos)' }}>{P.pnlTotal}</div>
            <div className={`d ${P.pnlTotalPct >= 0 ? 'pos' : 'neg'}`}>+{P.pnlTotalPct.toFixed(2)}% since inception</div>
          </div>
          <div className="po-kpi">
            <div className="l">Beta</div>
            <div className="v">{P.beta.toFixed(2)}</div>
            <div className="d" style={{ color: 'var(--text-tertiary)' }}>vs IHSG</div>
          </div>
          <div className="po-kpi">
            <div className="l">Yield</div>
            <div className="v">{P.yield.toFixed(1)}%</div>
            <div className="d" style={{ color: 'var(--text-tertiary)' }}>trailing 12m</div>
          </div>
        </div>

        {tab === 'holdings' && (
          <>
            <div className="po-main">
              <div className="po-card">
                <div className="po-card-h">
                  <span>Positions · {P.positions.length}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>Sorted by Mkt Value</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="po-pos">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th className="num">Qty</th>
                        <th className="num">Avg Cost</th>
                        <th className="num">Last</th>
                        <th className="num">Mkt Value</th>
                        <th className="num">P/L</th>
                        <th className="num">P/L %</th>
                        <th className="num">Weight</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...P.positions].sort((a, b) => b.mv - a.mv).map(p => (
                        <tr key={p.sym}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.sym}</span></td>
                          <td>{p.name}</td>
                          <td className="num">{fmt.num(p.qty, 0)}</td>
                          <td className="num">{fmt.num(p.avgCost, 0)}</td>
                          <td className="num">{fmt.num(p.lastPx, 0)}</td>
                          <td className="num">Rp {fmt.num(p.mv / 1e6, 1)}M</td>
                          <td className={`num ${p.pnlAbs >= 0 ? 'pos' : 'neg'}`}>{p.pnlAbs >= 0 ? '+' : ''}Rp {fmt.num(p.pnlAbs / 1e6, 1)}M</td>
                          <td className={`num ${p.pnlPct >= 0 ? 'pos' : 'neg'}`}>{p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(2)}%</td>
                          <td className="num">{p.weight.toFixed(2)}%</td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--brand-steel)', cursor: 'pointer' }}
                                  onClick={() => openTab && openTab({ kind: 'stock', symbol: p.sym, title: `${p.sym} · ${p.name}` })}>
                              Open ›
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="po-card">
                <div className="po-card-h">Allocation</div>
                <div className="po-card-body">
                  <div className="po-alloc-list">
                    {[...P.positions].sort((a, b) => b.weight - a.weight).map((p, i) => {
                      const colors = ['#5B8DEF', '#1FB877', '#F5B544', '#97AAC5', '#B17AB8', '#5DD3A0', '#F0475C', '#86A4D5'];
                      return (
                        <div key={p.sym} className="po-alloc-item">
                          <span className="po-alloc-sym">{p.sym}</span>
                          <div className="po-alloc-bar">
                            <span style={{ width: `${(p.weight / 10) * 100}%`, background: colors[i % colors.length] }}></span>
                          </div>
                          <span className="po-alloc-pct">{p.weight.toFixed(2)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'performance' && (
          <>
            <div className="po-card" style={{ marginBottom: 14 }}>
              <div className="po-card-h">
                <span>NAV vs benchmark · 120 days</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                  <span style={{ color: 'var(--pos)' }}>● Portfolio +16.78%</span>
                  <span style={{ marginLeft: 14, color: 'var(--text-tertiary)' }}>● IHSG +8.42%</span>
                </span>
              </div>
              <div className="po-card-body">
                <AreaChart data={P.perfHistory} height={280} color="#1FB877" />
              </div>
            </div>
            <div className="po-main">
              <div className="po-card">
                <div className="po-card-h">Risk metrics</div>
                <div className="po-card-body">
                  <table className="po-pos" style={{ fontSize: 12 }}>
                    <tbody>
                      <tr><td>Annualized return</td><td className="num pos">+24.6%</td></tr>
                      <tr><td>Volatility (1y)</td><td className="num">18.4%</td></tr>
                      <tr><td>Sharpe ratio</td><td className="num">1.34</td></tr>
                      <tr><td>Sortino ratio</td><td className="num">1.82</td></tr>
                      <tr><td>Max drawdown</td><td className="num neg">-14.2%</td></tr>
                      <tr><td>Win rate</td><td className="num">62.4%</td></tr>
                      <tr><td>Avg win / loss</td><td className="num">2.14x</td></tr>
                      <tr><td>Beta vs IHSG</td><td className="num">{P.beta.toFixed(2)}</td></tr>
                      <tr><td>Information ratio</td><td className="num">0.78</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="po-card">
                <div className="po-card-h">Attribution · 30d</div>
                <div className="po-card-body">
                  <div className="po-alloc-list">
                    {[
                      ['BBCA', 4.21, 'pos'],
                      ['BMRI', 2.84, 'pos'],
                      ['GOTO', 1.62, 'pos'],
                      ['TLKM', 1.18, 'pos'],
                      ['BBNI', 0.42, 'pos'],
                      ['UNVR', -0.04, 'neg'],
                      ['INDF', -0.18, 'neg'],
                      ['ASII', -1.42, 'neg'],
                    ].map(([sym, val, dir], i) => (
                      <div key={sym} className="po-alloc-item">
                        <span className="po-alloc-sym">{sym}</span>
                        <div className="po-alloc-bar">
                          <span style={{
                            [val >= 0 ? 'left' : 'right']: '50%',
                            width: `${Math.min(50, Math.abs(val) * 8)}%`,
                            background: val >= 0 ? 'var(--pos)' : 'var(--neg)',
                          }}></span>
                        </div>
                        <span className={`po-alloc-pct ${val >= 0 ? 'pos' : 'neg'}`}>{val >= 0 ? '+' : ''}{val.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'algos' && (
          <>
            <div className="po-algo-h">Qars Algo Marketplace · 6 strategies live</div>
            <div className="po-algo-grid">
              {ALGOS.map(a => (
                <div key={a.id} className="po-algo-card">
                  <div className="po-algo-tags">
                    {a.tags.map(t => <span key={t} className="po-algo-tag">{t}</span>)}
                  </div>
                  <div>
                    <div className="po-algo-name">{a.name}</div>
                    <div className="po-algo-author">{a.author} · {a.cadence}</div>
                  </div>
                  <div className="po-algo-desc">{a.desc}</div>
                  <div className="po-algo-stats">
                    <div><div className="l">Yr Return</div><div className="v pos">+{a.yr.toFixed(1)}%</div></div>
                    <div><div className="l">Vol</div><div className="v">{a.vol.toFixed(1)}%</div></div>
                    <div><div className="l">Sharpe</div><div className="v">{a.sharpe.toFixed(2)}</div></div>
                    <div><div className="l">Max DD</div><div className="v neg">{a.dd.toFixed(1)}%</div></div>
                  </div>
                  <div className="po-algo-foot">
                    <span className="po-algo-aum">AUM {a.aum} · min {a.minInv}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="po-algo-btn ghost">Backtest</button>
                      <button className="po-algo-btn">Subscribe</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

window.PortfolioWorkspace = PortfolioWorkspace;
