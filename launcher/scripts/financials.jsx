// ================================================================
// FinancialsPro — Capital-IQ-style financial statements terminal.
//
// 3 statements (IS / BS / CF) + Ratios + Multiples + Estimates + Peer comps +
// Operating KPIs, for IDX single names. Data comes from the equity-statements
// edge fn (Yahoo fundamentals-timeseries + quoteSummary, cached in Supabase).
// Everything derived (common-size, growth, ratios, multiples) is computed
// client-side from the cached doc. window.FinancialsPro.
// ================================================================

(function () {
  const SB_URL = 'https://adnubucjlezrtusbicja.supabase.co';
  const SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const STMT_FN = SB_URL + '/functions/v1/equity-statements';
  const HDRS = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON };
  const yahooTicker = (sym) => sym + '.JK';

  // ---- statement line ordering + labels (key, label, isBold) ----
  const INCOME_ORDER = [
    ['TotalRevenue', 'Total Revenue', 1], ['OperatingRevenue', 'Operating Revenue', 0],
    ['CostOfRevenue', 'Cost of Revenue', 0], ['GrossProfit', 'Gross Profit', 1],
    ['OperatingExpense', 'Operating Expense', 0], ['SellingGeneralAndAdministration', 'SG&A', 0],
    ['ResearchAndDevelopment', 'R&D', 0], ['OperatingIncome', 'Operating Income', 1],
    ['NetInterestIncome', 'Net Interest Income', 0], ['InterestIncome', 'Interest Income', 0],
    ['InterestExpense', 'Interest Expense', 0], ['OtherIncomeExpense', 'Other Income / Expense', 0],
    ['PretaxIncome', 'Pretax Income', 1], ['TaxProvision', 'Tax Provision', 0],
    ['NetIncomeContinuousOperations', 'Net Income (Cont. Ops)', 0], ['NetIncome', 'Net Income', 1],
    ['NetIncomeCommonStockholders', 'Net Income to Common', 0], ['MinorityInterests', 'Minority Interests', 0],
    ['EBIT', 'EBIT', 0], ['EBITDA', 'EBITDA', 0], ['NormalizedIncome', 'Normalized Income', 0],
    ['NormalizedEBITDA', 'Normalized EBITDA', 0], ['TotalExpenses', 'Total Expenses', 0],
    ['ReconciledDepreciation', 'Reconciled D&A', 0],
    ['BasicEPS', 'Basic EPS', 0], ['DilutedEPS', 'Diluted EPS', 0],
    ['BasicAverageShares', 'Basic Avg Shares', 0], ['DilutedAverageShares', 'Diluted Avg Shares', 0],
  ];
  const BALANCE_ORDER = [
    ['TotalAssets', 'Total Assets', 1], ['CurrentAssets', 'Current Assets', 0],
    ['CashAndCashEquivalents', 'Cash & Equivalents', 0], ['CashCashEquivalentsAndShortTermInvestments', 'Cash & ST Investments', 0],
    ['OtherShortTermInvestments', 'Other ST Investments', 0], ['Receivables', 'Receivables', 0],
    ['AccountsReceivable', 'Accounts Receivable', 0], ['Inventory', 'Inventory', 0],
    ['OtherCurrentAssets', 'Other Current Assets', 0], ['TotalNonCurrentAssets', 'Total Non-Current Assets', 0],
    ['NetPPE', 'Net PP&E', 0], ['GrossPPE', 'Gross PP&E', 0], ['Goodwill', 'Goodwill', 0],
    ['GoodwillAndOtherIntangibleAssets', 'Goodwill & Intangibles', 0], ['InvestmentsAndAdvances', 'Investments & Advances', 0],
    ['TotalLiabilitiesNetMinorityInterest', 'Total Liabilities', 1], ['CurrentLiabilities', 'Current Liabilities', 0],
    ['AccountsPayable', 'Accounts Payable', 0], ['CurrentDebt', 'Current Debt', 0],
    ['CurrentDebtAndCapitalLeaseObligation', 'Current Debt & Leases', 0], ['OtherCurrentLiabilities', 'Other Current Liabilities', 0],
    ['TotalNonCurrentLiabilitiesNetMinorityInterest', 'Total Non-Current Liabilities', 0],
    ['LongTermDebt', 'Long-Term Debt', 0], ['LongTermDebtAndCapitalLeaseObligation', 'LT Debt & Leases', 0],
    ['TotalDebt', 'Total Debt', 0], ['NetDebt', 'Net Debt', 0],
    ['StockholdersEquity', 'Stockholders Equity', 1], ['CommonStockEquity', 'Common Equity', 0],
    ['TotalEquityGrossMinorityInterest', 'Total Equity (incl. minority)', 0], ['MinorityInterest', 'Minority Interest', 0],
    ['RetainedEarnings', 'Retained Earnings', 0], ['CapitalStock', 'Capital Stock', 0],
    ['CommonStock', 'Common Stock', 0], ['AdditionalPaidInCapital', 'Additional Paid-In Capital', 0],
    ['TreasuryStock', 'Treasury Stock', 0], ['TotalCapitalization', 'Total Capitalization', 0],
    ['InvestedCapital', 'Invested Capital', 0], ['WorkingCapital', 'Working Capital', 0],
    ['TangibleBookValue', 'Tangible Book Value', 0], ['NetTangibleAssets', 'Net Tangible Assets', 0],
    ['ShareIssued', 'Shares Issued', 0], ['OrdinarySharesNumber', 'Ordinary Shares', 0],
  ];
  const CASHFLOW_ORDER = [
    ['OperatingCashFlow', 'Operating Cash Flow', 1], ['CashFlowFromContinuingOperatingActivities', 'CF from Cont. Ops', 0],
    ['NetIncomeFromContinuingOperations', 'Net Income', 0], ['DepreciationAmortizationDepletion', 'D&A & Depletion', 0],
    ['DepreciationAndAmortization', 'Depreciation & Amortization', 0], ['StockBasedCompensation', 'Stock-Based Comp', 0],
    ['ChangeInWorkingCapital', 'Change in Working Capital', 0], ['ChangesInAccountReceivables', 'Change in Receivables', 0],
    ['ChangeInInventory', 'Change in Inventory', 0], ['ChangeInPayablesAndAccruedExpense', 'Change in Payables', 0],
    ['InvestingCashFlow', 'Investing Cash Flow', 1], ['CapitalExpenditure', 'Capital Expenditure', 0],
    ['NetPPEPurchaseAndSale', 'Net PP&E Purchase/Sale', 0], ['PurchaseOfInvestment', 'Purchase of Investments', 0],
    ['SaleOfInvestment', 'Sale of Investments', 0], ['FinancingCashFlow', 'Financing Cash Flow', 1],
    ['NetIssuancePaymentsOfDebt', 'Net Debt Issuance/Repay', 0], ['NetLongTermDebtIssuance', 'Net LT Debt Issuance', 0],
    ['NetCommonStockIssuance', 'Net Stock Issuance', 0], ['RepurchaseOfCapitalStock', 'Stock Buybacks', 0],
    ['CommonStockDividendPaid', 'Common Dividends Paid', 0], ['CashDividendsPaid', 'Cash Dividends Paid', 0],
    ['NetOtherFinancingCharges', 'Other Financing', 0], ['ChangesInCash', 'Change in Cash', 0],
    ['BeginningCashPosition', 'Beginning Cash', 0], ['EndCashPosition', 'Ending Cash', 0],
    ['FreeCashFlow', 'Free Cash Flow', 1], ['RepaymentOfDebt', 'Repayment of Debt', 0], ['IssuanceOfDebt', 'Issuance of Debt', 0],
  ];
  const ORDERS = { income: INCOME_ORDER, balance: BALANCE_ORDER, cashflow: CASHFLOW_ORDER };
  const PER_SHARE = new Set(['BasicEPS', 'DilutedEPS']);
  const SHARE_CT = new Set(['BasicAverageShares', 'DilutedAverageShares', 'ShareIssued', 'OrdinarySharesNumber', 'TreasurySharesNumber']);
  const COMMON_BASE = { income: 'TotalRevenue', balance: 'TotalAssets', cashflow: 'TotalRevenue' };

  // ---- formatting ----
  const humanize = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  function scaleNum(v) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  const fmtPct = (v, d = 1) => (v === null || v === undefined || !isFinite(v)) ? '—' : (v * 100).toFixed(d) + '%';
  const fmtX = (v, d = 2) => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(d) + 'x';
  function fmtLine(key, v) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (PER_SHARE.has(key)) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return scaleNum(v);
  }

  // ---- data helpers ----
  function periodsOf(block) {
    const set = new Set();
    Object.values(block || {}).forEach((byDate) => Object.keys(byDate || {}).forEach((d) => set.add(d)));
    return Array.from(set).sort(); // ascending
  }
  // sum of trailing 4 quarters per key (flow statements)
  function ttmBlock(qBlock) {
    const out = {};
    const periods = periodsOf(qBlock);
    const last4 = periods.slice(-4);
    if (last4.length < 1) return { block: out, label: 'TTM (n/a)' };
    for (const [k, byDate] of Object.entries(qBlock || {})) {
      let sum = 0, n = 0;
      for (const d of last4) { if (byDate[d] != null) { sum += byDate[d]; n++; } }
      if (n > 0) out[k] = { TTM: PER_SHARE.has(k) || SHARE_CT.has(k) ? (byDate[last4[last4.length - 1]] ?? sum) : sum };
    }
    return { block: out, label: 'TTM → ' + last4[last4.length - 1] };
  }
  const orderedKeys = (stmt, block) => {
    const present = new Set(Object.keys(block || {}));
    const ord = ORDERS[stmt] || [];
    const known = ord.filter(([k]) => present.has(k));
    const knownSet = new Set(ord.map((o) => o[0]));
    const extra = Array.from(present).filter((k) => !knownSet.has(k)).sort().map((k) => [k, humanize(k), 0]);
    return [...known, ...extra];
  };
  const latest = (byDate) => { if (!byDate) return null; const ks = Object.keys(byDate).sort(); return ks.length ? byDate[ks[ks.length - 1]] : null; };

  // ---- tiny sparkline ----
  const Spark = ({ vals, w = 64, h = 18 }) => {
    const nums = vals.filter((v) => v != null && isFinite(v));
    if (nums.length < 2) return <svg width={w} height={h} />;
    const min = Math.min(...nums), max = Math.max(...nums), rng = (max - min) || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * (w - 2) + 1;
      const y = v == null ? null : h - 2 - ((v - min) / rng) * (h - 4);
      return y == null ? null : `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
    const up = nums[nums.length - 1] >= nums[0];
    return (
      <svg width={w} height={h} className="fin-spark">
        <polyline points={pts} fill="none" stroke={up ? 'var(--pos)' : 'var(--neg)'} strokeWidth="1.3" />
      </svg>
    );
  };

  // ================= statement table =================
  const StatementTable = ({ stmt, doc, freq, mode, search }) => {
    const ann = doc.statements.annual[stmt] || {};
    const qtr = doc.statements.quarterly[stmt] || {};
    let block, periods, periodLabels;
    if (freq === 'ttm') {
      const t = ttmBlock(qtr); block = t.block; periods = ['TTM']; periodLabels = [t.label.replace('TTM → ', 'TTM ')];
    } else {
      block = freq === 'quarterly' ? qtr : ann;
      periods = periodsOf(block).slice(-8); // cap columns
      periodLabels = periods.map((d) => freq === 'quarterly' ? d.slice(0, 7) : d.slice(0, 4));
    }
    const rows = orderedKeys(stmt, block).filter(([k, label]) =>
      !search || (label.toLowerCase().includes(search.toLowerCase()) || k.toLowerCase().includes(search.toLowerCase())));
    const baseKey = COMMON_BASE[stmt];
    const baseByDate = block[baseKey] || {};

    const cell = (key, d, idx) => {
      const v = block[key] ? block[key][d] : null;
      if (mode === 'common') {
        if (PER_SHARE.has(key) || SHARE_CT.has(key)) return '—';
        const base = baseByDate[d];
        return (v != null && base) ? fmtPct(v / base) : '—';
      }
      if (mode === 'growth') {
        if (idx === 0) return '—';
        const prev = block[key] ? block[key][periods[idx - 1]] : null;
        return (v != null && prev != null && prev !== 0) ? fmtPct((v - prev) / Math.abs(prev)) : '—';
      }
      return fmtLine(key, v);
    };

    return (
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th className="fin-line-h">Line item ({rows.length})</th>
              <th className="fin-spark-h"></th>
              {periodLabels.map((p, i) => <th key={i} className="num">{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, label, bold]) => {
              const seriesVals = periods.map((d) => block[key] ? block[key][d] : null);
              return (
                <tr key={key} className={`fin-row ${bold ? 'fin-bold' : ''}`}>
                  <td className="fin-line" title={key}>{label}</td>
                  <td className="fin-spark-cell">{freq !== 'ttm' && <Spark vals={seriesVals} />}</td>
                  {periods.map((d, i) => <td key={i} className="num">{cell(key, d, i)}</td>)}
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={periods.length + 2} className="fin-empty">No matching line items.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  // ================= ratios =================
  function ratioSeries(doc) {
    const A = doc.statements.annual;
    const inc = A.income, bal = A.balance, cf = A.cashflow;
    const periods = periodsOf(inc).slice(-5);
    const g = (blk, k, d) => (blk[k] && blk[k][d] != null) ? blk[k][d] : null;
    const defs = [
      ['Gross margin', (d) => { const r = g(inc, 'TotalRevenue', d), x = g(inc, 'GrossProfit', d); return r && x != null ? x / r : null; }, 'pct'],
      ['Operating margin', (d) => { const r = g(inc, 'TotalRevenue', d), x = g(inc, 'OperatingIncome', d); return r && x != null ? x / r : null; }, 'pct'],
      ['Net margin', (d) => { const r = g(inc, 'TotalRevenue', d), x = g(inc, 'NetIncome', d); return r && x != null ? x / r : null; }, 'pct'],
      ['EBITDA margin', (d) => { const r = g(inc, 'TotalRevenue', d), x = g(inc, 'EBITDA', d); return r && x != null ? x / r : null; }, 'pct'],
      ['ROE', (d) => { const e = g(bal, 'StockholdersEquity', d) || g(bal, 'CommonStockEquity', d), x = g(inc, 'NetIncome', d); return e && x != null ? x / e : null; }, 'pct'],
      ['ROA', (d) => { const a = g(bal, 'TotalAssets', d), x = g(inc, 'NetIncome', d); return a && x != null ? x / a : null; }, 'pct'],
      ['ROIC (approx)', (d) => { const ic = g(bal, 'InvestedCapital', d), ebit = g(inc, 'EBIT', d), pre = g(inc, 'PretaxIncome', d), tax = g(inc, 'TaxProvision', d); const tr = (pre && tax != null) ? Math.min(0.5, Math.max(0, tax / pre)) : 0.22; return ic && ebit != null ? (ebit * (1 - tr)) / ic : null; }, 'pct'],
      ['Asset turnover', (d) => { const a = g(bal, 'TotalAssets', d), r = g(inc, 'TotalRevenue', d); return a && r != null ? r / a : null; }, 'x'],
      ['Debt / Equity', (d) => { const e = g(bal, 'StockholdersEquity', d) || g(bal, 'CommonStockEquity', d), dt = g(bal, 'TotalDebt', d); return e && dt != null ? dt / e : null; }, 'x'],
      ['Net debt / EBITDA', (d) => { const nd = g(bal, 'NetDebt', d), eb = g(inc, 'EBITDA', d); return eb && nd != null ? nd / eb : null; }, 'x'],
      ['Interest coverage', (d) => { const ebit = g(inc, 'EBIT', d), ie = g(inc, 'InterestExpense', d); return (ie && ebit != null) ? ebit / Math.abs(ie) : null; }, 'x'],
      ['Current ratio', (d) => { const ca = g(bal, 'CurrentAssets', d), cl = g(bal, 'CurrentLiabilities', d); return (cl && ca != null) ? ca / cl : null; }, 'x'],
      ['Effective tax rate', (d) => { const pre = g(inc, 'PretaxIncome', d), tax = g(inc, 'TaxProvision', d); return (pre && tax != null) ? tax / pre : null; }, 'pct'],
    ];
    return { periods, rows: defs.map(([name, fn, type]) => ({ name, type, vals: periods.map((d) => fn(d)) })) };
  }
  const RatiosPanel = ({ doc }) => {
    const { periods, rows } = ratioSeries(doc);
    if (!periods.length) return <div className="fin-empty">No annual data to compute ratios.</div>;
    return (
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead><tr><th className="fin-line-h">Ratio</th><th className="fin-spark-h"></th>{periods.map((d, i) => <th key={i} className="num">{d.slice(0, 4)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="fin-row">
                <td className="fin-line">{r.name}</td>
                <td className="fin-spark-cell"><Spark vals={r.vals} /></td>
                {r.vals.map((v, i) => <td key={i} className="num">{r.type === 'pct' ? fmtPct(v) : fmtX(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ================= multiples =================
  function multiples(doc) {
    const A = doc.statements.annual, snap = doc.snapshot || {}, est = doc.estimates || {};
    const inc = A.income, bal = A.balance, cf = A.cashflow;
    const mc = snap.marketCap, debt = snap.totalDebt ?? latest(bal.TotalDebt), cash = snap.totalCash ?? latest(bal.CashAndCashEquivalents);
    const ni = latest(inc.NetIncome), eq = latest(bal.StockholdersEquity) || latest(bal.CommonStockEquity);
    const ebitda = latest(inc.EBITDA), rev = latest(inc.TotalRevenue), fcf = latest(cf.FreeCashFlow);
    const ev = (mc != null) ? mc + (debt || 0) - (cash || 0) : null;
    const out = [
      ['Market cap', scaleNum(mc), 'val'],
      ['Enterprise value (EV)', scaleNum(ev), 'val'],
      ['P / E (trailing)', est.trailingPE != null ? fmtX(est.trailingPE) : (mc && ni ? fmtX(mc / ni) : '—')],
      ['P / E (forward)', est.forwardPE != null ? fmtX(est.forwardPE) : '—'],
      ['P / B', (mc && eq) ? fmtX(mc / eq) : '—'],
      ['EV / EBITDA', (ev != null && ebitda) ? fmtX(ev / ebitda) : '—'],
      ['EV / Sales', (ev != null && rev) ? fmtX(ev / rev) : '—'],
      ['FCF yield', (fcf != null && mc) ? fmtPct(fcf / mc) : '—'],
      ['Net debt', scaleNum((debt || 0) - (cash || 0)), 'val'],
    ];
    return out;
  }
  const MultiplesPanel = ({ doc }) => {
    const rows = multiples(doc);
    return (
      <div className="fin-kv-grid">
        {rows.map((r, i) => (
          <div key={i} className="fin-kv"><div className="fin-kv-l">{r[0]}</div><div className="fin-kv-v">{r[1]}</div></div>
        ))}
        <div className="fin-note" style={{ gridColumn: '1 / -1' }}>
          Multiples use current market cap × trailing financials. EV-based multiples are not meaningful for banks/financials.
        </div>
      </div>
    );
  };

  // ================= estimates =================
  const EstimatesPanel = ({ doc, ccy }) => {
    const e = doc.estimates || {};
    const trend = e.earningsTrend || [];
    const has = e.targetMean != null || trend.length;
    if (!has) return <div className="fin-empty">No analyst estimates available for this name (thin IDX coverage).</div>;
    return (
      <div>
        <div className="fin-kv-grid">
          <div className="fin-kv"><div className="fin-kv-l">Mean target</div><div className="fin-kv-v">{e.targetMean != null ? (ccy + ' ' + e.targetMean.toLocaleString(undefined, { maximumFractionDigits: 0 })) : '—'}</div></div>
          <div className="fin-kv"><div className="fin-kv-l">Target range</div><div className="fin-kv-v">{(e.targetLow != null && e.targetHigh != null) ? `${e.targetLow.toFixed(0)} – ${e.targetHigh.toFixed(0)}` : '—'}</div></div>
          <div className="fin-kv"><div className="fin-kv-l">Rating</div><div className="fin-kv-v" style={{ textTransform: 'capitalize' }}>{e.recommendationKey || '—'}{e.recommendationMean != null ? ` (${e.recommendationMean.toFixed(1)})` : ''}</div></div>
          <div className="fin-kv"><div className="fin-kv-l">Analysts</div><div className="fin-kv-v">{e.numberOfAnalystOpinions != null ? e.numberOfAnalystOpinions : '—'}</div></div>
          <div className="fin-kv"><div className="fin-kv-l">Forward P/E</div><div className="fin-kv-v">{e.forwardPE != null ? fmtX(e.forwardPE) : '—'}</div></div>
        </div>
        {trend.length > 0 && (
          <table className="fin-table" style={{ marginTop: 12 }}>
            <thead><tr><th className="fin-line-h">Period</th><th className="num">EPS est.</th><th className="num">EPS low–high</th><th className="num">Rev est.</th><th className="num">Rev growth</th></tr></thead>
            <tbody>
              {trend.map((t, i) => (
                <tr key={i} className="fin-row">
                  <td className="fin-line">{t.period} {t.endDate ? `(${t.endDate})` : ''}</td>
                  <td className="num">{t.epsAvg != null ? t.epsAvg.toFixed(1) : '—'}</td>
                  <td className="num">{(t.epsLow != null && t.epsHigh != null) ? `${t.epsLow.toFixed(1)}–${t.epsHigh.toFixed(1)}` : '—'}</td>
                  <td className="num">{t.revAvg != null ? scaleNum(t.revAvg) : '—'}</td>
                  <td className="num">{t.revGrowth != null ? fmtPct(t.revGrowth) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ================= peer comps =================
  const PeersPanel = ({ symbol }) => {
    const [rows, setRows] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      const uni = window.IDX_UNIVERSE || [];
      const self = uni.find((u) => u.sym === symbol);
      const peers = self ? uni.filter((u) => u.sector === self.sector) : (self ? [self] : []);
      const list = (self ? [self, ...peers.filter((p) => p.sym !== symbol)] : peers).slice(0, 8);
      Promise.all(list.map(async (p) => {
        try {
          const r = await fetch(`${STMT_FN}?ticker=${encodeURIComponent(yahooTicker(p.sym))}`, { headers: HDRS });
          const j = await r.json();
          const doc = j.doc; if (!doc) return null;
          const inc = doc.statements.annual.income, bal = doc.statements.annual.balance, snap = doc.snapshot || {};
          const rev = latest(inc.TotalRevenue), ni = latest(inc.NetIncome), eq = latest(bal.StockholdersEquity) || latest(bal.CommonStockEquity);
          const mc = snap.marketCap;
          const revP = periodsOf(inc).slice(-2).map((d) => inc.TotalRevenue && inc.TotalRevenue[d]);
          const revG = (revP.length === 2 && revP[0]) ? (revP[1] - revP[0]) / Math.abs(revP[0]) : null;
          return {
            sym: p.sym, name: p.name, isSelf: p.sym === symbol,
            mc, rev, niMargin: (rev && ni != null) ? ni / rev : null, roe: (eq && ni != null) ? ni / eq : null,
            pe: (mc && ni) ? mc / ni : null, pb: (mc && eq) ? mc / eq : null, revG,
          };
        } catch { return null; }
      })).then((res) => { if (alive) setRows(res.filter(Boolean)); });
      return () => { alive = false; };
    }, [symbol]);

    if (!rows) return <div className="fin-loading">Loading peer comps…</div>;
    if (!rows.length) return <div className="fin-empty">No same-sector peers found.</div>;
    return (
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead><tr><th className="fin-line-h">Company</th><th className="num">Mkt cap</th><th className="num">Revenue</th><th className="num">Rev growth</th><th className="num">Net margin</th><th className="num">ROE</th><th className="num">P/E</th><th className="num">P/B</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym} className={`fin-row ${r.isSelf ? 'fin-self' : ''}`}>
                <td className="fin-line"><b>{r.sym}</b> <span className="dim">{r.name}</span></td>
                <td className="num">{scaleNum(r.mc)}</td><td className="num">{scaleNum(r.rev)}</td>
                <td className="num">{fmtPct(r.revG)}</td><td className="num">{fmtPct(r.niMargin)}</td>
                <td className="num">{fmtPct(r.roe)}</td><td className="num">{fmtX(r.pe)}</td><td className="num">{fmtX(r.pb)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ================= operating KPIs (curated, not from Yahoo) =================
  const KpiPanel = ({ symbol }) => {
    const schemas = window.OP_KPI_SCHEMAS, toSchema = window.symbolToSchema;
    const schema = (schemas && toSchema) ? schemas[toSchema(symbol)] : null;
    if (!schema) return <div className="fin-empty">No curated operating-KPI schema for this name.</div>;
    return (
      <div>
        <div className="fin-note" style={{ marginBottom: 10 }}>⚑ Operating KPIs are curated / manually maintained — not pulled from Yahoo.</div>
        <div className="fin-kpi-sections">
          {schema.sections.map((sec, i) => (
            <div key={i} className="fin-kpi-sec">
              <div className="fin-kpi-sec-h">{sec.title}</div>
              {sec.items.map((it, j) => (
                <div key={j} className="fin-kpi-item">
                  <span className="fin-kpi-l">{it.l}</span>
                  <span className={`fin-kpi-v tone-${it.tone || 'flat'}`}>{it.v}<span className="fin-kpi-sub">{it.sub}</span></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- CSV export of the active statement (raw numeric values) ----
  function exportCSV(stmt, doc, freq, symbol) {
    const block = freq === 'quarterly' ? doc.statements.quarterly[stmt] : doc.statements.annual[stmt];
    const periods = periodsOf(block);
    const rows = orderedKeys(stmt, block);
    let csv = 'Line item,' + periods.join(',') + '\n';
    rows.forEach(([k, label]) => { csv += '"' + label + '",' + periods.map((d) => (block[k] && block[k][d] != null ? block[k][d] : '')).join(',') + '\n'; });
    download(new Blob([csv], { type: 'text/csv' }), `${symbol}_${stmt}_${freq}.csv`);
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  // ---- full-model exports (Excel workbook + combined CSV) — raw numbers ----
  function statementAOA(stmt, block) {
    const periods = periodsOf(block);
    const aoa = [['Line Item', ...periods]];
    orderedKeys(stmt, block).forEach(([k, label]) =>
      aoa.push([label, ...periods.map((d) => (block[k] && block[k][d] != null) ? block[k][d] : null)]));
    return aoa;
  }
  function ratiosAOA(doc) {
    const { periods, rows } = ratioSeries(doc);
    const aoa = [['Ratio', ...periods.map((d) => d.slice(0, 4))]];
    rows.forEach((r) => aoa.push([r.name + (r.type === 'pct' ? ' (%)' : ' (x)'),
      ...r.vals.map((v) => v == null ? null : (r.type === 'pct' ? +(v * 100).toFixed(2) : +v.toFixed(3)))]));
    return aoa;
  }
  function estimatesAOA(doc) {
    const e = doc.estimates || {};
    const aoa = [['Metric', 'Value'], ['Mean target', e.targetMean ?? null], ['Target low', e.targetLow ?? null],
      ['Target high', e.targetHigh ?? null], ['Rating', e.recommendationKey ?? null],
      ['Recommendation mean', e.recommendationMean ?? null], ['Analysts', e.numberOfAnalystOpinions ?? null],
      ['Forward P/E', e.forwardPE ?? null], ['Trailing P/E', e.trailingPE ?? null]];
    const trend = e.earningsTrend || [];
    if (trend.length) {
      aoa.push([]); aoa.push(['Period', 'End date', 'EPS avg', 'EPS low', 'EPS high', 'Rev avg', 'Rev growth']);
      trend.forEach((t) => aoa.push([t.period, t.endDate, t.epsAvg, t.epsLow, t.epsHigh, t.revAvg, t.revGrowth]));
    }
    return aoa;
  }
  function exportExcel(doc, symbol) {
    const XLSX = window.XLSX;
    if (!XLSX) { window.alert('Excel library is still loading — try again in a moment.'); return; }
    const wb = XLSX.utils.book_new();
    const A = doc.statements.annual, Q = doc.statements.quarterly;
    const add = (name, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name.slice(0, 31));
    add('Income (Annual)', statementAOA('income', A.income));
    add('Balance (Annual)', statementAOA('balance', A.balance));
    add('Cash Flow (Annual)', statementAOA('cashflow', A.cashflow));
    add('Income (Qtr)', statementAOA('income', Q.income));
    add('Balance (Qtr)', statementAOA('balance', Q.balance));
    add('Cash Flow (Qtr)', statementAOA('cashflow', Q.cashflow));
    add('Ratios', ratiosAOA(doc));
    add('Multiples', [['Metric', 'Value'], ...multiples(doc).map((m) => [m[0], m[1]])]);
    add('Estimates', estimatesAOA(doc));
    XLSX.writeFile(wb, `${symbol}_financials.xlsx`);
  }
  function exportFullCSV(doc, symbol) {
    const A = doc.statements.annual;
    let csv = '';
    const sec = (title, stmt, block) => {
      const periods = periodsOf(block);
      csv += title + '\nLine Item,' + periods.join(',') + '\n';
      orderedKeys(stmt, block).forEach(([k, label]) =>
        csv += '"' + label + '",' + periods.map((d) => (block[k] && block[k][d] != null) ? block[k][d] : '').join(',') + '\n');
      csv += '\n';
    };
    sec('INCOME STATEMENT (Annual)', 'income', A.income);
    sec('BALANCE SHEET (Annual)', 'balance', A.balance);
    sec('CASH FLOW (Annual)', 'cashflow', A.cashflow);
    download(new Blob([csv], { type: 'text/csv' }), `${symbol}_financials.csv`);
  }

  // ================= main =================
  const VIEWS = [
    ['income', 'Income'], ['balance', 'Balance Sheet'], ['cashflow', 'Cash Flow'],
    ['ratios', 'Ratios'], ['multiples', 'Multiples'], ['estimates', 'Estimates'],
    ['peers', 'Peer Comps'], ['kpis', 'Operating KPIs'],
  ];
  const isStatement = (v) => v === 'income' || v === 'balance' || v === 'cashflow';

  const FinancialsPro = ({ symbol = 'BBCA' }) => {
    const [doc, setDoc] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState(null);
    const [view, setView] = React.useState('income');
    const [freq, setFreq] = React.useState('annual');
    const [mode, setMode] = React.useState('value'); // value | common | growth
    const [search, setSearch] = React.useState('');
    const [refreshing, setRefreshing] = React.useState(false);

    const load = React.useCallback((refresh) => {
      setLoading(!refresh); setRefreshing(!!refresh); setErr(null);
      fetch(`${STMT_FN}?ticker=${encodeURIComponent(yahooTicker(symbol))}${refresh ? '&refresh=1' : ''}`, { headers: HDRS })
        .then((r) => r.json())
        .then((j) => { if (j.ok && j.doc) setDoc(j.doc); else setErr(j.error || 'no data'); })
        .catch((e) => setErr(e.message || 'fetch failed'))
        .finally(() => { setLoading(false); setRefreshing(false); });
    }, [symbol]);
    React.useEffect(() => { load(false); }, [load]);

    if (loading) return <div className="sw-section fin"><div className="fin-loading">Loading financials for {symbol}…</div></div>;
    if (err || !doc) return <div className="sw-section fin"><div className="fin-banner err">Financials unavailable: {err || 'no data'} <button className="fin-btn" onClick={() => load(true)}>Retry</button></div></div>;

    const ccy = doc.currency || 'IDR';
    const fetched = doc.fetchedAt ? new Date(doc.fetchedAt) : null;
    const fetchedLabel = fetched
      ? fetched.toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    return (
      <div className="sw-section fin">
        <div className="fin-head">
          <div className="fin-head-l">
            <span className="fin-co">{doc.snapshot?.longName || symbol}</span>
            <span className="fin-meta">{symbol} · {doc.snapshot?.sector || '—'} · {ccy}</span>
          </div>
          <div className="fin-head-r">
            <span className="prov-badge live" title={`Live data — fetched ${fetchedLabel}`}><span className="prov-dot" />LIVE</span>
            <span className="fin-updated">as of {fetchedLabel} · Yahoo</span>
            <button className="fin-btn ghost" title="Download full model as Excel (.xlsx)" onClick={() => exportExcel(doc, symbol)}>⇩ Excel</button>
            <button className="fin-btn ghost" title="Download all statements as CSV" onClick={() => exportFullCSV(doc, symbol)}>⇩ CSV</button>
            <button className="fin-btn" disabled={refreshing} onClick={() => load(true)}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button>
          </div>
        </div>

        <div className="fin-subnav">
          {VIEWS.map(([k, l]) => (
            <button key={k} className={`fin-tab ${view === k ? 'on' : ''}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>

        {isStatement(view) && (
          <div className="fin-toolbar">
            <div className="fin-seg">
              {[['annual', 'Annual'], ['quarterly', 'Quarterly'], ['ttm', 'TTM']].map(([k, l]) => (
                <button key={k} className={`fin-seg-b ${freq === k ? 'on' : ''}`} onClick={() => setFreq(k)}>{l}</button>
              ))}
            </div>
            <div className="fin-seg">
              {[['value', '$'], ['common', '% base'], ['growth', 'YoY %']].map(([k, l]) => (
                <button key={k} className={`fin-seg-b ${mode === k ? 'on' : ''} ${k !== 'value' && freq === 'ttm' ? 'dis' : ''}`}
                  disabled={k !== 'value' && freq === 'ttm'} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>
            <input className="fin-search" placeholder="Filter line items…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div style={{ flex: 1 }} />
            <button className="fin-btn ghost" title="Download just this statement (current view) as CSV" onClick={() => exportCSV(view, doc, freq === 'ttm' ? 'quarterly' : freq, symbol)}>⇩ This statement</button>
          </div>
        )}

        <div className="fin-body">
          {isStatement(view) && <StatementTable stmt={view} doc={doc} freq={freq} mode={mode} search={search} />}
          {view === 'ratios' && <RatiosPanel doc={doc} />}
          {view === 'multiples' && <MultiplesPanel doc={doc} />}
          {view === 'estimates' && <EstimatesPanel doc={doc} ccy={ccy} />}
          {view === 'peers' && <PeersPanel symbol={symbol} />}
          {view === 'kpis' && <KpiPanel symbol={symbol} />}
        </div>

        <div className="fin-foot">
          Source: Yahoo (fundamentals-timeseries + quoteSummary), cached. ~{Object.keys(doc.statements.annual.income || {}).length ? periodsOf(doc.statements.annual.income).length : 0}y annual · values in {ccy}. Multiples computed from trailing financials × live price.
        </div>
      </div>
    );
  };

  window.FinancialsPro = FinancialsPro;
})();
