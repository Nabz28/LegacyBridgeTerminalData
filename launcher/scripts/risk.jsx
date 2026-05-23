// ================================================================
// RiskPro — live risk analytics for an IDX name, computed from return series.
// Primary source: LBC correlation engine (correlation.returns_weekly via
// PostgREST). Fallback: Yahoo daily history (series-proxy) → returns, for names
// not in the correlation universe. Metrics: beta (raw + Blume), annualized
// vol & return, Sharpe, Sortino, max drawdown, historical VaR/CVaR (95%),
// correlation & R² vs the JCI. window.RiskPro.
// ================================================================
(function () {
  const SB = 'https://adnubucjlezrtusbicja.supabase.co';
  const ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const HDRS = { apikey: ANON, Authorization: 'Bearer ' + ANON };
  const MARKET = 'IDX:COMPOSITE';
  const RF_ANNUAL = 0.066;   // Indonesia ~10Y govt (IDR) — the risk-free anchor
  const corrId = (s) => 'IDX:' + s;
  const yTicker = (s) => s + '.JK';

  const pct = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(d) + '%';
  const f2 = (x) => (x == null || !isFinite(x)) ? '—' : x.toFixed(2);

  async function corrReturns(seriesId, fromISO) {
    const u = `${SB}/rest/v1/returns_weekly?series_id=eq.${encodeURIComponent(seriesId)}&select=date,ret&order=date.asc` + (fromISO ? `&date=gte.${fromISO}` : '');
    const r = await fetch(u, { headers: { ...HDRS, 'Accept-Profile': 'correlation' } });
    if (!r.ok) return [];
    return await r.json(); // [{date, ret}]
  }
  // Yahoo daily closes → weekly-ish returns (sampled every 5 bars) for names not
  // in the correlation engine, so frequency stays ~weekly (annualize √52).
  async function yahooReturns(ticker, fromISO) {
    const r = await fetch(`${SB}/functions/v1/series-proxy?source=YAHOO&id=${encodeURIComponent(ticker)}&range=5y&interval=1wk`, { headers: HDRS });
    if (!r.ok) return [];
    const j = await r.json();
    const obs = (j.obs || []).filter(o => o.value != null);
    const out = [];
    for (let i = 1; i < obs.length; i++) {
      if (fromISO && obs[i].date < fromISO) continue;
      const p0 = obs[i - 1].value, p1 = obs[i].value;
      if (p0) out.push({ date: obs[i].date, ret: (p1 - p0) / p0 });
    }
    return out;
  }
  function align(mkt, stk) {
    const m = {}; mkt.forEach(r => { m[r.date] = r.ret; });
    const a = [], b = [];
    stk.forEach(r => { const v = m[r.date]; if (v != null && r.ret != null && isFinite(v) && isFinite(r.ret)) { a.push(v); b.push(r.ret); } });
    return { m: a, s: b };
  }
  function stats(stkRets, mktAligned, stkAligned, ppy) {
    const n = stkRets.length;
    if (n < 12) return null;
    const ann = Math.sqrt(ppy);
    const mean = stkRets.reduce((x, y) => x + y, 0) / n;
    const variance = stkRets.reduce((x, y) => x + (y - mean) * (y - mean), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const annVol = sd * ann;
    const annRet = mean * ppy;
    const sharpe = annVol > 0 ? (annRet - RF_ANNUAL) / annVol : null;
    const downs = stkRets.filter(r => r < 0);
    const dd = downs.length ? Math.sqrt(downs.reduce((x, y) => x + y * y, 0) / downs.length) * ann : null;
    const sortino = dd && dd > 0 ? (annRet - RF_ANNUAL) / dd : null;
    // max drawdown on the cumulative path
    let cum = 1, peak = 1, maxDD = 0;
    for (const r of stkRets) { cum *= (1 + r); if (cum > peak) peak = cum; const d = (cum - peak) / peak; if (d < maxDD) maxDD = d; }
    // historical VaR/CVaR 95% (per-period loss)
    const sorted = stkRets.slice().sort((a, b) => a - b);
    const k = Math.max(0, Math.floor(0.05 * sorted.length) - 1);
    const var95 = sorted[k];
    const tail = sorted.slice(0, k + 1);
    const cvar95 = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : var95;
    // beta + correlation vs market (regress stock on market)
    let beta = null, corr = null, r2 = null;
    if (mktAligned && mktAligned.length >= 12) {
      const nn = mktAligned.length;
      let sm = 0, ss = 0; for (let i = 0; i < nn; i++) { sm += mktAligned[i]; ss += stkAligned[i]; }
      const mm = sm / nn, ms = ss / nn;
      let cov = 0, vm = 0, vs = 0;
      for (let i = 0; i < nn; i++) { const dm = mktAligned[i] - mm, ds = stkAligned[i] - ms; cov += dm * ds; vm += dm * dm; vs += ds * ds; }
      if (vm > 1e-12) { beta = cov / vm; corr = vs > 1e-12 ? cov / Math.sqrt(vm * vs) : null; r2 = corr != null ? corr * corr : null; }
    }
    return { n, annVol, annRet, sharpe, sortino, maxDD, var95, cvar95, beta, betaAdj: beta != null ? 0.67 * beta + 0.33 : null, corr, r2 };
  }

  const Metric = ({ label, value, hint, tone }) => (
    <div className="risk-kv">
      <div className="risk-kv-l">{label}</div>
      <div className={`risk-kv-v ${tone || ''}`}>{value}</div>
      {hint && <div className="risk-kv-h">{hint}</div>}
    </div>
  );

  const RiskPro = ({ symbol = 'BBCA' }) => {
    const [winY, setWinY] = React.useState(2);
    const [data, setData] = React.useState(null);   // {rets, mAligned, sAligned, source, ppy}
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState(null);

    React.useEffect(() => {
      let alive = true;
      setLoading(true); setErr(null); setData(null);
      const from = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
      (async () => {
        try {
          let stk = await corrReturns(corrId(symbol), from);
          let mkt = await corrReturns(MARKET, from);
          let source = 'LBC correlation engine';
          if (!stk.length) { stk = await yahooReturns(yTicker(symbol), from); source = 'Yahoo price history'; }
          if (!alive) return;
          if (!stk.length) { setErr('No return history available for this name.'); setLoading(false); return; }
          setData({ stk, mkt, source });
        } catch (e) { if (alive) setErr(e.message || 'failed'); }
        finally { if (alive) setLoading(false); }
      })();
      return () => { alive = false; };
    }, [symbol]);

    const computed = React.useMemo(() => {
      if (!data) return null;
      const ppy = data.source.startsWith('LBC') ? 52 : 52; // both weekly
      const weeks = winY * 52;
      const stk = data.stk.slice(-weeks);
      const stkRets = stk.map(r => r.ret);
      const aligned = data.mkt && data.mkt.length ? align(data.mkt.slice(-weeks - 4), stk) : { m: [], s: [] };
      return { ...stats(stkRets, aligned.m, aligned.s, ppy), source: data.source, from: stk[0] && stk[0].date, to: stk[stk.length - 1] && stk[stk.length - 1].date };
    }, [data, winY]);

    if (loading) return <div className="sw-section"><div className="risk-msg">Loading risk analytics for {symbol}…</div></div>;
    if (err || !computed) return <div className="sw-section"><div className="risk-msg">{err || 'Insufficient data.'}</div></div>;
    const c = computed;

    return (
      <div className="sw-section risk">
        <div className="risk-head">
          <div>
            <span className="prov-badge live"><span className="prov-dot" />LIVE</span>
            <span className="risk-src">β &amp; risk from {c.source} · weekly returns vs JCI · {c.from} → {c.to} · Rf {pct(RF_ANNUAL)}</span>
          </div>
          <div className="risk-win">
            {[1, 2, 5].map(y => <button key={y} className={`risk-win-b ${winY === y ? 'on' : ''}`} onClick={() => setWinY(y)}>{y}Y</button>)}
          </div>
        </div>
        <div className="risk-grid">
          <Metric label="Beta (raw)" value={f2(c.beta)} hint="vs JCI, OLS" />
          <Metric label="Beta (adjusted)" value={f2(c.betaAdj)} hint="Blume" />
          <Metric label="Correlation ρ" value={f2(c.corr)} hint="vs JCI" />
          <Metric label="R²" value={f2(c.r2)} hint="market-explained" />
          <Metric label="Volatility (ann.)" value={pct(c.annVol)} tone={c.annVol > 0.4 ? 'neg' : ''} />
          <Metric label="Return (ann.)" value={pct(c.annRet)} tone={c.annRet >= 0 ? 'pos' : 'neg'} />
          <Metric label="Sharpe" value={f2(c.sharpe)} tone={c.sharpe >= 1 ? 'pos' : c.sharpe < 0 ? 'neg' : ''} hint={`Rf ${pct(RF_ANNUAL)}`} />
          <Metric label="Sortino" value={f2(c.sortino)} tone={c.sortino >= 1 ? 'pos' : c.sortino < 0 ? 'neg' : ''} />
          <Metric label="Max drawdown" value={pct(c.maxDD)} tone="neg" hint="peak-to-trough" />
          <Metric label="VaR 95% (wk)" value={pct(c.var95)} tone="neg" hint="historical" />
          <Metric label="CVaR 95% (wk)" value={pct(c.cvar95)} tone="neg" hint="expected shortfall" />
          <Metric label="Observations" value={c.n} hint="weeks" />
        </div>
        <div className="risk-foot">
          Computed client-side from {c.source}. Annualized with √52. Beta regresses weekly stock returns on the JCI (IDX:COMPOSITE).
          Names not in the correlation engine fall back to Yahoo weekly price history.
        </div>
      </div>
    );
  };

  window.RiskPro = RiskPro;
})();
