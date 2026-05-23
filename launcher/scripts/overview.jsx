// ================================================================
// OverviewPro — live at-a-glance page: snapshot (live quote) + headline
// financials + valuation + analyst estimates, all from the equity-statements
// cache + equity-quote. Replaces the mock Overview. window.OverviewPro.
// ================================================================
(function () {
  const SB = 'https://adnubucjlezrtusbicja.supabase.co';
  const ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const HDRS = { apikey: ANON, Authorization: 'Bearer ' + ANON };
  const yT = (s) => s + '.JK';
  const last = (o) => { if (!o) return null; const k = Object.keys(o).sort(); return k.length ? o[k[k.length - 1]] : null; };
  const prev = (o) => { if (!o) return null; const k = Object.keys(o).sort(); return k.length > 1 ? o[k[k.length - 2]] : null; };
  const scale = (v) => { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'; if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'; return v.toLocaleString(); };
  const pct = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(d) + '%';
  const fx = (x) => (x == null || !isFinite(x)) ? '—' : x.toFixed(1) + 'x';

  const OverviewPro = ({ symbol = 'BBCA' }) => {
    const [doc, setDoc] = React.useState(null);
    const [quote, setQuote] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let alive = true; setLoading(true); setDoc(null); setQuote(null);
      fetch(`${SB}/functions/v1/equity-statements?ticker=${encodeURIComponent(yT(symbol))}`, { headers: HDRS })
        .then(r => r.json()).then(j => { if (alive && j.doc) setDoc(j.doc); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
      fetch(`${SB}/functions/v1/equity-quote?ticker=${encodeURIComponent(yT(symbol))}`, { headers: HDRS })
        .then(r => r.json()).then(j => { if (alive && j.ok) setQuote(j.quote); }).catch(() => {});
      return () => { alive = false; };
    }, [symbol]);

    if (loading) return <div className="sw-section"><div className="risk-msg">Loading overview for {symbol}…</div></div>;
    if (!doc) return <div className="sw-section"><div className="risk-msg">No data for {symbol}.</div></div>;

    const snap = doc.snapshot || {}, est = doc.estimates || {}, A = (doc.statements && doc.statements.annual) || {};
    const inc = A.income || {}, bal = A.balance || {}, cf = A.cashflow || {};
    const ccy = doc.currency || 'IDR';
    const price = quote ? quote.price : null;
    const shares = snap.sharesOutstanding;
    const mktcap = (price != null && shares) ? price * shares : snap.marketCap;
    const rev = last(inc.TotalRevenue), revP = prev(inc.TotalRevenue);
    const ni = last(inc.NetIncome), niP = prev(inc.NetIncome);
    const eq = last(bal.StockholdersEquity) || last(bal.CommonStockEquity);
    const ebitda = last(inc.EBITDA), fcf = last(cf.FreeCashFlow);
    const eps = last(inc.DilutedEPS) ?? last(inc.BasicEPS);
    const ev = (mktcap != null) ? mktcap + (snap.totalDebt || 0) - (snap.totalCash || 0) : null;
    const revG = (rev != null && revP) ? rev / revP - 1 : null;
    const niG = (ni != null && niP) ? ni / niP - 1 : null;

    const Group = ({ title, rows }) => (
      <div className="sw-panel">
        <div className="sw-panel-h">{title}</div>
        <div className="sw-panel-body" style={{ padding: 0 }}>
          {rows.map(([l, v, tone], i) => (
            <div key={i} className="ov-row"><span className="ov-l">{l}</span><span className={`ov-v ${tone || ''}`}>{v}</span></div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="sw-section">
        <div className="risk-head" style={{ marginBottom: 8 }}>
          <div>
            <span className="prov-badge live"><span className="prov-dot" />LIVE</span>
            <span className="risk-src">{snap.longName || symbol} · {snap.sector || '—'}{snap.industry ? ' · ' + snap.industry : ''} · {ccy}</span>
          </div>
        </div>
        <div className="ov-grid">
          <Group title="Snapshot" rows={[
            ['Price', quote ? (ccy + ' ' + (price ? price.toLocaleString() : '—')) : '—', quote && quote.change >= 0 ? 'pos' : 'neg'],
            ['Change', quote ? ((quote.change >= 0 ? '+' : '') + (quote.changePct != null ? quote.changePct.toFixed(2) + '%' : '—')) : '—', quote && quote.change >= 0 ? 'pos' : 'neg'],
            ['Market cap', ccy + ' ' + scale(mktcap)],
            ['52W range', quote ? (quote.fiftyTwoWeekLow + ' – ' + quote.fiftyTwoWeekHigh) : '—'],
            ['Shares', scale(shares)],
            ['Beta', snap.beta != null ? snap.beta.toFixed(2) : '—'],
          ]} />
          <Group title="Key financials (latest FY)" rows={[
            ['Revenue', ccy + ' ' + scale(rev)],
            ['Revenue growth', pct(revG), revG >= 0 ? 'pos' : 'neg'],
            ['Net income', ccy + ' ' + scale(ni)],
            ['NI growth', pct(niG), niG >= 0 ? 'pos' : 'neg'],
            ['Net margin', pct((rev && ni != null) ? ni / rev : null)],
            ['ROE', pct((eq && ni != null) ? ni / eq : null)],
          ]} />
          <Group title="Valuation" rows={[
            ['P / E (live)', fx((price != null && eps) ? price / eps : null)],
            ['P / E (fwd)', est.forwardPE != null ? fx(est.forwardPE) : '—'],
            ['P / B', fx((mktcap != null && eq) ? mktcap / eq : null)],
            ['EV / EBITDA', fx((ev != null && ebitda) ? ev / ebitda : null)],
            ['EV / Sales', fx((ev != null && rev) ? ev / rev : null)],
            ['FCF yield', pct((fcf != null && mktcap) ? fcf / mktcap : null)],
          ]} />
          <Group title="Analyst estimates" rows={[
            ['Mean target', est.targetMean != null ? (ccy + ' ' + est.targetMean.toLocaleString(undefined, { maximumFractionDigits: 0 })) : '—'],
            ['Upside', (est.targetMean != null && price) ? pct(est.targetMean / price - 1) : '—', (est.targetMean != null && price && est.targetMean > price) ? 'pos' : 'neg'],
            ['Rating', est.recommendationKey || '—'],
            ['Analysts', est.numberOfAnalystOpinions != null ? est.numberOfAnalystOpinions : '—'],
            ['Target range', (est.targetLow != null && est.targetHigh != null) ? (est.targetLow.toFixed(0) + ' – ' + est.targetHigh.toFixed(0)) : '—'],
          ]} />
        </div>
        <div className="risk-foot">Live snapshot from Yahoo (price + fundamentals, cached) · multiples recomputed off the live price. Open Financials / WACC / Risk for the deep dive.</div>
      </div>
    );
  };
  window.OverviewPro = OverviewPro;
})();
