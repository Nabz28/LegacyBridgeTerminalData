// ================================================================
// WACC Calculator — Equity terminal tool.
//
// Bottom-up, JPMorgan-style weighted average cost of capital:
//   • Beta is derived from LBC's OWN correlation engine (weekly returns
//     regressed on the JCI), NOT from Yahoo's headline beta. Raw OLS beta
//     → Blume-adjusted → optional bottom-up (unlever peers, take the
//     median, relever to the target's capital structure).
//   • Fundamentals (market cap = E, total debt = D, sector) come from the
//     equity-fundamentals edge fn (Yahoo quoteSummary). Auto-filled but
//     every assumption is analyst-editable.
//   • Rf / ERP / country-risk-premium / tax default to Damodaran-style
//     Indonesia values and are editable.
//
//   WACC = (E/V)·Re + (D/V)·Rd·(1−Tc),   Re = Rf + β·ERP + size premium
//
// Data: correlation.returns_weekly via PostgREST (Accept-Profile header) +
// equity-fundamentals + series-proxy(FRED) for the US-10Y reference.
// ================================================================

(function () {
  const SB_URL = 'https://adnubucjlezrtusbicja.supabase.co';
  const SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const STMT_FN = SB_URL + '/functions/v1/equity-statements';   // shared cache (statements + snapshot)
  const SERIES_PROXY = SB_URL + '/functions/v1/series-proxy';
  const REST_HEADERS = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON };
  const MARKET_ID = 'IDX:COMPOSITE';   // JCI / IHSG — the IDX market benchmark
  const MARKET_LABEL = 'JCI (IDX Composite)';

  // Damodaran-style Indonesia defaults (all editable in the UI).
  const DEF = {
    rf: 6.6,           // Indonesia 10Y govt yield (IDR), %
    matureERP: 4.6,    // mature-market equity risk premium, %
    crp: 3.0,          // Indonesia country risk premium, %
    sizePremium: 0.0,  // %
    taxRate: 22.0,     // Indonesia statutory corporate tax, %
    creditSpread: 2.0, // spread over Rf for cost of debt, %
  };
  const MAX_PEERS = 5;

  // ---------- math ----------
  const median = (a) => {
    const v = a.filter((x) => Number.isFinite(x)).slice().sort((x, y) => x - y);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  // OLS of stock returns on market returns: beta = cov(m,s)/var(m).
  function regress(m, s) {
    const n = Math.min(m.length, s.length);
    if (n < 20) return null;
    let sm = 0, ss = 0;
    for (let i = 0; i < n; i++) { sm += m[i]; ss += s[i]; }
    const mm = sm / n, ms = ss / n;
    let cov = 0, vm = 0, vs = 0;
    for (let i = 0; i < n; i++) { const dm = m[i] - mm, ds = s[i] - ms; cov += dm * ds; vm += dm * dm; vs += ds * ds; }
    if (vm < 1e-12) return null;
    const beta = cov / vm;
    const corr = vs > 1e-12 ? cov / Math.sqrt(vm * vs) : 0;
    return { beta, corr, r2: corr * corr, n };
  }
  const blume = (b) => 0.67 * b + 0.33 * 1.0;
  const unlever = (bL, de, tax) => bL / (1 + (1 - tax) * de);
  const relever = (bU, de, tax) => bU * (1 + (1 - tax) * de);

  // ---------- formatting ----------
  const pct = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x)) ? '—' : `${(x).toFixed(d)}%`;
  const f2 = (x) => (x === null || !Number.isFinite(x)) ? '—' : x.toFixed(2);
  const money = (x, ccy) => {
    if (x === null || x === undefined || !Number.isFinite(x)) return '—';
    const abs = Math.abs(x);
    const unit = abs >= 1e12 ? ['T', 1e12] : abs >= 1e9 ? ['B', 1e9] : abs >= 1e6 ? ['M', 1e6] : ['', 1];
    return `${ccy ? ccy + ' ' : ''}${(x / unit[1]).toFixed(2)}${unit[0]}`;
  };

  // ---------- data ----------
  function corrId(sym) { return 'IDX:' + sym; }
  function yahooTicker(sym) { return sym + '.JK'; }

  async function fetchReturns(seriesId, fromISO) {
    const u = `${SB_URL}/rest/v1/returns_weekly?series_id=eq.${encodeURIComponent(seriesId)}` +
      `&select=date,ret&order=date.asc` + (fromISO ? `&date=gte.${fromISO}` : '');
    const r = await fetch(u, { headers: { ...REST_HEADERS, 'Accept-Profile': 'correlation' } });
    if (!r.ok) throw new Error('returns HTTP ' + r.status);
    return await r.json(); // [{date, ret}]
  }
  // Reads the SHARED equity-statements cache and shapes a fundamentals object.
  // Now sources effective tax + interest expense + debt from the real income/
  // balance statements (auto-fills what WACC used to default).
  async function fetchFundamentals(yt) {
    const r = await fetch(`${STMT_FN}?ticker=${encodeURIComponent(yt)}`, { headers: REST_HEADERS });
    const j = await r.json().catch(() => null);
    const doc = j && j.doc;
    if (!doc) return null;
    const snap = doc.snapshot || {};
    const A = (doc.statements && doc.statements.annual) || {};
    const inc = A.income || {}, bal = A.balance || {};
    const last = (o) => { if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };
    const pretax = last(inc.PretaxIncome), tax = last(inc.TaxProvision), interest = last(inc.InterestExpense);
    let effTax = (pretax && tax != null && pretax !== 0) ? tax / pretax : null;
    if (effTax != null && (!isFinite(effTax) || effTax < 0 || effTax > 0.6)) effTax = null;
    return {
      ticker: yt,
      fetchedAt: j.fetchedAt || null,
      currency: snap.currency,
      marketCap: snap.marketCap != null ? snap.marketCap : null,
      totalDebt: snap.totalDebt != null ? snap.totalDebt : last(bal.TotalDebt),
      totalCash: snap.totalCash,
      yahooBeta: snap.beta,
      sector: snap.sector,
      effectiveTaxRate: effTax,
      interestExpense: interest != null ? Math.abs(interest) : null,
    };
  }
  async function fetchFredLatest(id) {
    const r = await fetch(`${SERIES_PROXY}?source=FRED&id=${encodeURIComponent(id)}`, { headers: REST_HEADERS });
    if (!r.ok) throw new Error('FRED HTTP ' + r.status);
    const j = await r.json();
    const obs = j.obs || [];
    return obs.length ? obs[obs.length - 1] : null; // {date, value}
  }
  // Align market + stock returns on shared dates → arrays {m, s}.
  function alignReturns(marketRows, stockRows) {
    const mMap = {};
    marketRows.forEach((r) => { mMap[r.date] = r.ret; });
    const m = [], s = [];
    stockRows.forEach((r) => {
      const mv = mMap[r.date];
      if (mv != null && r.ret != null && Number.isFinite(mv) && Number.isFinite(r.ret)) { m.push(mv); s.push(r.ret); }
    });
    return { m, s };
  }
  function sliceWindow(rows, weeks) {
    return weeks && rows.length > weeks ? rows.slice(rows.length - weeks) : rows;
  }

  function peersFor(symbol) {
    const uni = window.IDX_UNIVERSE || [];
    const self = uni.find((u) => u.sym === symbol);
    if (!self) return [];
    return uni.filter((u) => u.sym !== symbol && u.sector === self.sector)
      .sort((a, b) => (b.mcap || 0) - (a.mcap || 0))
      .slice(0, MAX_PEERS);
  }

  const cutoff5y = () => new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  // ---------- small UI atoms ----------
  const Field = ({ label, value, onChange, suffix, hint, source }) => (
    <label className="wacc-field">
      <span className="wacc-field-l">{label}{source && <span className={`wacc-src wacc-src-${source.kind}`}>{source.txt}</span>}</span>
      <span className="wacc-field-in">
        <input type="number" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="wacc-field-suffix">{suffix}</span>}
      </span>
      {hint && <span className="wacc-field-hint">{hint}</span>}
    </label>
  );

  // ================================================================
  const WaccTab = ({ symbol = 'BBCA', t }) => {
    const [winWeeks, setWinWeeks] = React.useState(104);   // 2Y default; 260 = 5Y
    const [betaSource, setBetaSource] = React.useState('adjusted'); // raw|adjusted|bottomup

    // raw fetched data
    const [stockRows, setStockRows] = React.useState(null);
    const [marketRows, setMarketRows] = React.useState(null);
    const [fund, setFund] = React.useState(null);
    const [peers, setPeers] = React.useState([]);   // [{sym,name,beta,betaAdj,de,tax,bu, fundOk}]
    const [loading, setLoading] = React.useState(true);
    const [betaErr, setBetaErr] = React.useState(null);
    const [fundErr, setFundErr] = React.useState(null);
    const [usRf, setUsRf] = React.useState(null);

    // editable assumptions
    const [inp, setInp] = React.useState({
      rf: DEF.rf, matureERP: DEF.matureERP, crp: DEF.crp, sizePremium: DEF.sizePremium,
      taxRate: DEF.taxRate, creditSpread: DEF.creditSpread,
      // capital structure + cost of debt (auto-filled from fund, editable)
      E: '', D: '', rdMode: 'spread', rdManual: '',
    });
    const set = (k, v) => setInp((p) => ({ ...p, [k]: v }));

    // ---- load on symbol change ----
    React.useEffect(() => {
      let alive = true;
      setLoading(true); setBetaErr(null); setFundErr(null);
      setStockRows(null); setMarketRows(null); setFund(null); setPeers([]);
      const from = cutoff5y();

      // Beta data (stock + market) — fast PostgREST.
      Promise.all([fetchReturns(corrId(symbol), from), fetchReturns(MARKET_ID, from)])
        .then(([sr, mr]) => { if (!alive) return; setStockRows(sr); setMarketRows(mr); })
        .catch((e) => { if (alive) setBetaErr(e.message || 'beta data unavailable'); })
        .finally(() => { if (alive) setLoading(false); });

      // Fundamentals (E, D, sector) — slower edge fn.
      fetchFundamentals(yahooTicker(symbol))
        .then((fd) => {
          if (!alive) return;
          setFund(fd);
          if (fd) {
            setInp((p) => ({
              ...p,
              E: fd.marketCap != null ? String(Math.round(fd.marketCap)) : p.E,
              D: fd.totalDebt != null ? String(Math.round(fd.totalDebt)) : p.D,
              taxRate: (fd.effectiveTaxRate != null) ? +(fd.effectiveTaxRate * 100).toFixed(1) : p.taxRate,
            }));
          } else setFundErr('Yahoo fundamentals unavailable — using defaults (editable).');
        })
        .catch(() => { if (alive) setFundErr('Yahoo fundamentals unavailable — using defaults (editable).'); });

      // Peer betas (correlation) + peer fundamentals (for D/E), best-effort.
      const plist = peersFor(symbol);
      Promise.all(plist.map(async (p) => {
        let beta = null, fd = null;
        try {
          const [pr, mr] = await Promise.all([fetchReturns(corrId(p.sym), from), fetchReturns(MARKET_ID, from)]);
          const a = alignReturns(sliceWindow(mr, 104), sliceWindow(pr, 104));
          const reg = regress(a.m, a.s);
          beta = reg ? reg.beta : null;
        } catch { /* no corr data for this peer */ }
        try { fd = await fetchFundamentals(yahooTicker(p.sym)); } catch { /* skip */ }
        const de = (fd && fd.totalDebt != null && fd.marketCap) ? fd.totalDebt / fd.marketCap : null;
        const tax = (fd && fd.effectiveTaxRate != null) ? fd.effectiveTaxRate : DEF.taxRate / 100;
        const bAdj = beta != null ? blume(beta) : null;
        const bu = (bAdj != null && de != null) ? unlever(bAdj, de, tax) : null;
        return { sym: p.sym, name: p.name, beta, betaAdj: bAdj, de, tax, bu };
      })).then((rows) => { if (alive) setPeers(rows); });

      return () => { alive = false; };
    }, [symbol]);

    // ---- derived: beta ----
    const betaCalc = React.useMemo(() => {
      if (!stockRows || !marketRows) return null;
      const a = alignReturns(sliceWindow(marketRows, winWeeks), sliceWindow(stockRows, winWeeks));
      return regress(a.m, a.s);
    }, [stockRows, marketRows, winWeeks]);

    const E = parseFloat(inp.E) || (fund && fund.marketCap) || 0;
    const D = parseFloat(inp.D) || 0;
    const taxFrac = (parseFloat(inp.taxRate) || 0) / 100;
    const deTarget = E > 0 ? D / E : 0;

    const betaRaw = betaCalc ? betaCalc.beta : null;
    const betaAdj = betaRaw != null ? blume(betaRaw) : null;
    // bottom-up: median unlevered peer beta, relevered to target D/E
    const peerBU = peers.map((p) => p.bu).filter((x) => x != null);
    const medBU = peerBU.length ? median(peerBU) : null;
    const betaBottomUp = medBU != null ? relever(medBU, deTarget, taxFrac) : null;

    const betaUsed =
      betaSource === 'raw' ? betaRaw :
      betaSource === 'bottomup' ? (betaBottomUp != null ? betaBottomUp : betaAdj) :
      betaAdj;

    // ---- derived: WACC ----
    const erp = (parseFloat(inp.matureERP) || 0) + (parseFloat(inp.crp) || 0);
    const rf = parseFloat(inp.rf) || 0;
    const size = parseFloat(inp.sizePremium) || 0;
    const Re = (betaUsed != null) ? rf + betaUsed * erp + size : null; // %

    // cost of debt
    const interestExp = fund && fund.interestExpense;
    const rdImplied = (interestExp && D > 0) ? (interestExp / D) * 100 : null;
    const rdPreTax = inp.rdMode === 'manual'
      ? (parseFloat(inp.rdManual) || 0)
      : inp.rdMode === 'implied' && rdImplied != null
        ? rdImplied
        : rf + (parseFloat(inp.creditSpread) || 0);
    const rdAfterTax = rdPreTax * (1 - taxFrac);

    const V = E + D;
    const wE = V > 0 ? E / V : 1;
    const wD = V > 0 ? D / V : 0;
    const wacc = (Re != null) ? wE * Re + wD * rdAfterTax : null;

    // ---- sensitivity: WACC across Rf (rows) × ERP (cols) ----
    const sens = React.useMemo(() => {
      if (betaUsed == null || E <= 0) return null;
      const rfs = [-1, -0.5, 0, 0.5, 1].map((d) => rf + d);
      const erps = [-1.5, -0.75, 0, 0.75, 1.5].map((d) => erp + d);
      const grid = rfs.map((rfx) => erps.map((erpx) => {
        const re = rfx + betaUsed * erpx + size;
        const rd = (inp.rdMode === 'manual' ? (parseFloat(inp.rdManual) || 0)
          : inp.rdMode === 'implied' && rdImplied != null ? rdImplied
            : rfx + (parseFloat(inp.creditSpread) || 0)) * (1 - taxFrac);
        return wE * re + wD * rd;
      }));
      return { rfs, erps, grid };
    }, [betaUsed, rf, erp, size, wE, wD, taxFrac, inp.rdMode, inp.rdManual, inp.creditSpread, rdImplied, E]);

    const ccy = (fund && fund.currency) || 'IDR';
    const sectorLabel = (fund && fund.sector) || (t && t.sector) || '—';

    // ================= render =================
    return (
      <div className="sw-section wacc">
        {/* ---- hero ---- */}
        <div className="wacc-hero">
          <div className="wacc-hero-l">
            <div className="wacc-hero-label">Weighted Average Cost of Capital</div>
            <div className="wacc-hero-val">{wacc != null ? pct(wacc) : '—'}</div>
            <div className="wacc-hero-sub">
              {symbol} · {sectorLabel} · {ccy} · β source: <b>{betaSource === 'bottomup' ? 'bottom-up peer' : betaSource}</b>
            </div>
            <div className="wacc-prov">
              <span className="prov-badge live"><span className="prov-dot" />LIVE</span>
              <span className="wacc-prov-txt">
                β · LBC correlation engine
                {fund && fund.fetchedAt ? ' · fundamentals as of ' + new Date(fund.fetchedAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ' · Yahoo'}
              </span>
            </div>
          </div>
          <div className="wacc-hero-breakdown">
            <div className="wacc-bd"><span>Cost of equity (Re)</span><b>{pct(Re)}</b></div>
            <div className="wacc-bd"><span>After-tax cost of debt</span><b>{pct(rdAfterTax)}</b></div>
            <div className="wacc-bd"><span>Equity weight E/V</span><b>{pct(wE * 100, 1)}</b></div>
            <div className="wacc-bd"><span>Debt weight D/V</span><b>{pct(wD * 100, 1)}</b></div>
            <div className="wacc-bd"><span>Beta (used)</span><b>{f2(betaUsed)}</b></div>
          </div>
          {/* contribution bar */}
          {wacc != null && (
            <div className="wacc-contrib">
              <div className="wacc-contrib-seg eq" style={{ width: `${Math.max(2, (wE * Re / wacc) * 100)}%` }}
                title={`Equity contribution ${pct(wE * Re)}`}>E</div>
              <div className="wacc-contrib-seg dt" style={{ width: `${Math.max(2, (wD * rdAfterTax / wacc) * 100)}%` }}
                title={`Debt contribution ${pct(wD * rdAfterTax)}`}>D</div>
            </div>
          )}
        </div>

        {betaErr && <div className="wacc-banner err">Beta engine: {betaErr}</div>}
        {fundErr && <div className="wacc-banner warn">{fundErr}</div>}

        <div className="wacc-grid">
          {/* ---------- LEFT: assumptions ---------- */}
          <div className="sw-panel wacc-assume">
            <div className="sw-panel-h">Assumptions <span className="sub-h">auto-filled · editable</span></div>
            <div className="sw-panel-body" style={{ padding: 14 }}>
              <div className="wacc-group-l">Cost of equity — CAPM</div>
              <Field label="Risk-free rate (Rf)" value={inp.rf} suffix="%" onChange={(v) => set('rf', v)}
                source={{ kind: 'def', txt: 'IDR 10Y' }} hint={usRf != null ? `US 10Y (FRED): ${usRf.toFixed(2)}%` : null} />
              <Field label="Mature-market ERP" value={inp.matureERP} suffix="%" onChange={(v) => set('matureERP', v)}
                source={{ kind: 'def', txt: 'Damodaran' }} />
              <Field label="Country risk premium" value={inp.crp} suffix="%" onChange={(v) => set('crp', v)}
                source={{ kind: 'def', txt: 'Indonesia' }} hint={`Total ERP = ${pct(erp)}`} />
              <Field label="Size premium" value={inp.sizePremium} suffix="%" onChange={(v) => set('sizePremium', v)} />

              <div className="wacc-group-l" style={{ marginTop: 14 }}>Cost of debt</div>
              <div className="wacc-radio-row">
                {[['spread', 'Rf + spread'], ['implied', 'Interest / debt'], ['manual', 'Manual']].map(([k, l]) => (
                  <button key={k} className={`wacc-radio ${inp.rdMode === k ? 'on' : ''} ${k === 'implied' && rdImplied == null ? 'dis' : ''}`}
                    disabled={k === 'implied' && rdImplied == null}
                    onClick={() => set('rdMode', k)}>{l}</button>
                ))}
              </div>
              {inp.rdMode === 'spread' && (
                <Field label="Credit spread over Rf" value={inp.creditSpread} suffix="%" onChange={(v) => set('creditSpread', v)} />
              )}
              {inp.rdMode === 'manual' && (
                <Field label="Pre-tax cost of debt" value={inp.rdManual} suffix="%" onChange={(v) => set('rdManual', v)} />
              )}
              <div className="wacc-readout">
                <span>Pre-tax Rd</span><b>{pct(rdPreTax)}</b>
                <span>· after-tax</span><b>{pct(rdAfterTax)}</b>
                {rdImplied != null && <span className="dim">· implied {pct(rdImplied)}</span>}
              </div>

              <div className="wacc-group-l" style={{ marginTop: 14 }}>Capital structure &amp; tax</div>
              <Field label={`Market value of equity (E, ${ccy})`} value={inp.E} onChange={(v) => set('E', v)}
                source={fund && fund.marketCap != null ? { kind: 'live', txt: 'Yahoo' } : { kind: 'def', txt: 'manual' }}
                hint={`${money(E, ccy)}`} />
              <Field label={`Total debt (D, ${ccy})`} value={inp.D} onChange={(v) => set('D', v)}
                source={fund && fund.totalDebt != null ? { kind: 'live', txt: 'Yahoo' } : { kind: 'def', txt: 'manual' }}
                hint={`${money(D, ccy)} · D/E ${f2(deTarget)}`} />
              <Field label="Tax rate (Tc)" value={inp.taxRate} suffix="%" onChange={(v) => set('taxRate', v)}
                source={fund && fund.effectiveTaxRate != null ? { kind: 'live', txt: 'effective' } : { kind: 'def', txt: '22% stat.' }} />

              <button className="wacc-fred-btn" onClick={() => fetchFredLatest('DGS10').then((o) => o && setUsRf(o.value)).catch(() => {})}>
                ↻ Fetch US 10Y (FRED) reference
              </button>
            </div>
          </div>

          {/* ---------- RIGHT: beta engine + peers ---------- */}
          <div className="wacc-right">
            <div className="sw-panel">
              <div className="sw-panel-h">
                Beta — LBC correlation engine
                <span className="sub-h">weekly returns vs {MARKET_LABEL}</span>
              </div>
              <div className="sw-panel-body" style={{ padding: 14 }}>
                <div className="wacc-win-row">
                  <span className="wacc-win-l">Window</span>
                  {[[104, '2Y'], [156, '3Y'], [260, '5Y']].map(([w, l]) => (
                    <button key={w} className={`wacc-win ${winWeeks === w ? 'on' : ''}`} onClick={() => setWinWeeks(w)}>{l}</button>
                  ))}
                  {betaCalc && <span className="wacc-win-stats">n={betaCalc.n} · R²={betaCalc.r2.toFixed(2)} · ρ={betaCalc.corr.toFixed(2)}</span>}
                </div>
                <div className="wacc-beta-cards">
                  <button className={`wacc-beta-card ${betaSource === 'raw' ? 'on' : ''}`} onClick={() => setBetaSource('raw')}>
                    <div className="l">Raw OLS β</div><div className="v">{f2(betaRaw)}</div><div className="s">regression slope</div>
                  </button>
                  <button className={`wacc-beta-card ${betaSource === 'adjusted' ? 'on' : ''}`} onClick={() => setBetaSource('adjusted')}>
                    <div className="l">Adjusted β</div><div className="v">{f2(betaAdj)}</div><div className="s">Blume 0.67·β+0.33</div>
                  </button>
                  <button className={`wacc-beta-card ${betaSource === 'bottomup' ? 'on' : ''} ${betaBottomUp == null ? 'dis' : ''}`}
                    disabled={betaBottomUp == null} onClick={() => betaBottomUp != null && setBetaSource('bottomup')}>
                    <div className="l">Bottom-up β</div><div className="v">{f2(betaBottomUp)}</div><div className="s">peer median, relevered</div>
                  </button>
                </div>
                {fund && fund.yahooBeta != null && (
                  <div className="wacc-yahoo-ref">Yahoo headline β: {f2(fund.yahooBeta)} <span className="dim">(reference only — not used)</span></div>
                )}
              </div>
            </div>

            {/* peer comp */}
            <div className="sw-panel">
              <div className="sw-panel-h">Bottom-up peer comparison
                <span className="sub-h">unlever → median → relever</span>
              </div>
              <div className="sw-panel-body" style={{ padding: 0 }}>
                <table className="sw-tbl wacc-peer-tbl">
                  <thead><tr>
                    <th>Peer</th><th className="num">Raw β</th><th className="num">Adj β</th>
                    <th className="num">D/E</th><th className="num">Tax</th><th className="num">Unlev β</th>
                  </tr></thead>
                  <tbody>
                    {peers.length === 0 && <tr><td colSpan={6} className="wacc-empty">No same-sector peers in the IDX universe.</td></tr>}
                    {peers.map((p) => (
                      <tr key={p.sym}>
                        <td><b>{p.sym}</b> <span className="dim">{p.name}</span></td>
                        <td className="num">{f2(p.beta)}</td>
                        <td className="num">{f2(p.betaAdj)}</td>
                        <td className="num">{p.de != null ? f2(p.de) : '—'}</td>
                        <td className="num">{p.tax != null ? pct(p.tax * 100, 0) : '—'}</td>
                        <td className="num">{f2(p.bu)}</td>
                      </tr>
                    ))}
                    {peers.length > 0 && (
                      <tr className="wacc-peer-sum">
                        <td>Median unlevered β</td><td className="num" colSpan={4}></td><td className="num"><b>{f2(medBU)}</b></td>
                      </tr>
                    )}
                    {betaBottomUp != null && (
                      <tr className="wacc-peer-sum">
                        <td>Relevered to {symbol} (D/E {f2(deTarget)})</td><td className="num" colSpan={4}></td><td className="num"><b>{f2(betaBottomUp)}</b></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* sensitivity */}
            {sens && (
              <div className="sw-panel">
                <div className="sw-panel-h">WACC sensitivity <span className="sub-h">Rf (rows) × total ERP (cols)</span></div>
                <div className="sw-panel-body" style={{ padding: 0, overflow: 'auto' }}>
                  <table className="sw-tbl wacc-sens">
                    <thead><tr><th>Rf \ ERP</th>{sens.erps.map((e, i) => <th key={i} className="num">{e.toFixed(1)}%</th>)}</tr></thead>
                    <tbody>
                      {sens.rfs.map((rfx, ri) => (
                        <tr key={ri}>
                          <td className="num">{rfx.toFixed(1)}%</td>
                          {sens.grid[ri].map((w, ci) => {
                            const isBase = Math.abs(rfx - rf) < 1e-6 && Math.abs(sens.erps[ci] - erp) < 1e-6;
                            return <td key={ci} className={`num wacc-sens-cell ${isBase ? 'base' : ''}`}>{w.toFixed(2)}%</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="wacc-foot">
          WACC = (E/V)·Re + (D/V)·Rd·(1−Tc) &nbsp;·&nbsp; Re = Rf + β·ERP + size &nbsp;·&nbsp;
          β from LBC correlation engine (OLS on weekly returns vs JCI) &nbsp;·&nbsp;
          fundamentals: Yahoo &nbsp;·&nbsp; ERP/CRP/tax: Damodaran-style Indonesia defaults (editable)
          {loading && <span className="wacc-loading"> · loading data…</span>}
        </div>
      </div>
    );
  };

  window.WaccTab = WaccTab;
})();
