// ================================================================
// MonteCarloPro — REAL Monte Carlo price simulation. Geometric Brownian
// Motion seeded by the LIVE price (equity-quote) and the actual historical
// drift μ + volatility σ estimated from return history (correlation engine,
// Yahoo fallback). Replaces the old fabricated sim. window.MonteCarloPro.
// ================================================================
(function () {
  const SB = 'https://adnubucjlezrtusbicja.supabase.co';
  const ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const HDRS = { apikey: ANON, Authorization: 'Bearer ' + ANON };
  const RF = 0.066;
  const corrId = (s) => 'IDX:' + s;
  const yT = (s) => s + '.JK';
  const fmtN = (v) => (v == null || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const pct = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(d) + '%';

  async function getReturns(sym, fromISO) {
    const u = `${SB}/rest/v1/returns_weekly?series_id=eq.${encodeURIComponent(corrId(sym))}&select=date,ret&order=date.asc&date=gte.${fromISO}`;
    const r = await fetch(u, { headers: { ...HDRS, 'Accept-Profile': 'correlation' } });
    let rows = r.ok ? await r.json() : [];
    if (rows.length) return rows.map(x => x.ret).filter(v => v != null && isFinite(v));
    const rr = await fetch(`${SB}/functions/v1/series-proxy?source=YAHOO&id=${encodeURIComponent(yT(sym))}&range=5y&interval=1wk`, { headers: HDRS });
    if (!rr.ok) return [];
    const obs = ((await rr.json()).obs || []).filter(o => o.value != null);
    const out = [];
    for (let i = 1; i < obs.length; i++) { if (obs[i].date >= fromISO && obs[i - 1].value) out.push((obs[i].value - obs[i - 1].value) / obs[i - 1].value); }
    return out;
  }
  async function getPrice(sym) {
    const r = await fetch(`${SB}/functions/v1/equity-quote?ticker=${encodeURIComponent(yT(sym))}`, { headers: HDRS });
    if (!r.ok) return null;
    const j = await r.json();
    return j.ok && j.quote ? { price: j.quote.price, currency: j.quote.currency } : null;
  }
  // standard normal (Box–Muller)
  function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function simulate(S0, muA, sigA, days, sims) {
    const dt = 1 / 252, drift = (muA - (sigA * sigA) / 2) * dt, vol = sigA * Math.sqrt(dt);
    const term = new Array(sims);
    for (let s = 0; s < sims; s++) { let lnS = Math.log(S0); for (let t = 0; t < days; t++) lnS += drift + vol * gauss(); term[s] = Math.exp(lnS); }
    return term.sort((a, b) => a - b);
  }
  const pctile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))];

  const MonteCarloPro = ({ symbol = 'BBCA' }) => {
    const [base, setBase] = React.useState(null);  // {price, mu, sigma, currency, n}
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState(null);
    const [horizonD, setHorizonD] = React.useState(252);
    const [sims, setSims] = React.useState(2000);
    const [driftMode, setDriftMode] = React.useState('hist'); // hist | rn

    React.useEffect(() => {
      let alive = true; setLoading(true); setErr(null); setBase(null);
      const from = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
      (async () => {
        try {
          const [q, rets] = await Promise.all([getPrice(symbol), getReturns(symbol, from)]);
          if (!alive) return;
          if (!q || !q.price || rets.length < 12) { setErr('Insufficient price/return history to simulate.'); setLoading(false); return; }
          const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
          const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rets.length - 1);
          setBase({ price: q.price, currency: q.currency || 'IDR', mu: mean * 52, sigma: Math.sqrt(variance) * Math.sqrt(52), n: rets.length });
        } catch (e) { if (alive) setErr(e.message || 'failed'); }
        finally { if (alive) setLoading(false); }
      })();
      return () => { alive = false; };
    }, [symbol]);

    const sim = React.useMemo(() => {
      if (!base) return null;
      const mu = driftMode === 'rn' ? RF : base.mu;
      const term = simulate(base.price, mu, base.sigma, horizonD, sims);
      const mean = term.reduce((a, b) => a + b, 0) / term.length;
      const profit = term.filter(x => x > base.price).length / term.length;
      // histogram (24 bins)
      const lo = term[0], hi = term[term.length - 1], bins = 24, w = (hi - lo) / bins || 1;
      const hist = new Array(bins).fill(0);
      term.forEach(x => { const b = Math.min(bins - 1, Math.floor((x - lo) / w)); hist[b]++; });
      const data = hist.map((c, i) => ({ label: i % 4 === 0 ? Math.round(lo + (i + 0.5) * w).toLocaleString() : '', v: c }));
      return {
        p5: pctile(term, 0.05), p25: pctile(term, 0.25), p50: pctile(term, 0.5), p75: pctile(term, 0.75), p95: pctile(term, 0.95),
        mean, expRet: mean / base.price - 1, profit, data, mu,
      };
    }, [base, horizonD, sims, driftMode]);

    if (loading) return <div className="sw-section"><div className="risk-msg">Running Monte Carlo for {symbol}…</div></div>;
    if (err || !base || !sim) return <div className="sw-section"><div className="risk-msg">{err || 'No data.'}</div></div>;
    const C = base.currency, ColumnChart = window.ChartLib && window.ChartLib.ColumnChart;
    const card = (l, v, sub, tone) => (
      <div className="risk-kv"><div className="risk-kv-l">{l}</div><div className={`risk-kv-v ${tone || ''}`}>{v}</div>{sub && <div className="risk-kv-h">{sub}</div>}</div>
    );

    return (
      <div className="sw-section risk">
        <div className="risk-head">
          <div>
            <span className="prov-badge live"><span className="prov-dot" />LIVE</span>
            <span className="risk-src">GBM · S₀ {C} {fmtN(base.price)} · σ {pct(base.sigma)} · μ {pct(sim.mu)} ({driftMode === 'rn' ? 'risk-neutral' : 'historical'}) · {base.n}w history</span>
          </div>
          <div className="risk-win">
            {[[63, '3M'], [126, '6M'], [252, '1Y'], [504, '2Y']].map(([d, l]) => <button key={d} className={`risk-win-b ${horizonD === d ? 'on' : ''}`} onClick={() => setHorizonD(d)}>{l}</button>)}
            {[['hist', 'μ hist'], ['rn', 'risk-neutral']].map(([k, l]) => <button key={k} className={`risk-win-b ${driftMode === k ? 'on' : ''}`} onClick={() => setDriftMode(k)}>{l}</button>)}
          </div>
        </div>
        <div className="risk-grid">
          {card('P5 (bear)', C + ' ' + fmtN(sim.p5), pct(sim.p5 / base.price - 1) + ' vs spot', 'neg')}
          {card('P25', C + ' ' + fmtN(sim.p25), pct(sim.p25 / base.price - 1))}
          {card('Median (P50)', C + ' ' + fmtN(sim.p50), pct(sim.p50 / base.price - 1))}
          {card('P75', C + ' ' + fmtN(sim.p75), pct(sim.p75 / base.price - 1))}
          {card('P95 (bull)', C + ' ' + fmtN(sim.p95), pct(sim.p95 / base.price - 1) + ' vs spot', 'pos')}
          {card('Expected return', pct(sim.expRet), 'mean terminal', sim.expRet >= 0 ? 'pos' : 'neg')}
          {card('Prob. of gain', pct(sim.profit), 'P(S>spot)', sim.profit >= 0.5 ? 'pos' : 'neg')}
          {card('Simulations', sims.toLocaleString(), 'GBM paths')}
        </div>
        <div className="sw-panel" style={{ marginTop: 4 }}>
          <div className="sw-panel-h">Terminal price distribution <span className="sub-h">{horizonD} trading days · {C}</span></div>
          <div className="sw-panel-body" style={{ padding: 12 }}>
            {ColumnChart ? <ColumnChart data={sim.data} height={180} /> : <div className="dim">chart unavailable</div>}
          </div>
        </div>
        <div className="risk-foot">
          Geometric Brownian Motion seeded by the live price; σ and historical μ estimated from {base.n} weeks of returns (annualized √52).
          'Risk-neutral' replaces μ with Rf ({pct(RF)}). A model, not a forecast — paths are simulated.
        </div>
      </div>
    );
  };
  window.MonteCarloPro = MonteCarloPro;
})();
