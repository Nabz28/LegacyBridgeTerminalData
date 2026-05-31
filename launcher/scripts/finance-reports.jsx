/* =========================================================================
   FINANCE (T10) — financial statements module.
   Exposes window.FN_Reports = { Reports }.

   Four statements, all computed client-side from ctx.txns + ctx.scopedAccounts:
     1. Trial Balance   — as of ctx.period.to
     2. Income Statement (P&L) — ctx.period [from, to]
     3. Balance Sheet   — as of ctx.period.to
     4. Cash Flow       — ctx.period [from, to]

   Vanilla Babel-in-browser React. No build step. No imports.
   ========================================================================= */
(function () {
  const { useState, useMemo } = React;

  /* ---- helpers ---------------------------------------------------------- */
  const h = React.createElement;

  /**
   * Trigger a client-side CSV download. No server, no libraries.
   * @param {string} csv   Raw CSV string
   * @param {string} name  Filename (e.g. "LBC_trial-balance_2026-05.csv")
   */
  function downloadCsv(csv, name) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Escape a CSV cell value (wrap in quotes if it contains comma/quote/newline). */
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Build CSV rows from a header array + data rows (each row is an array). */
  function buildCsv(header, rows) {
    return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
  }

  /** Filename helper: "LBC_trial-balance_2026-05.csv" */
  function csvName(entityCode, slug, periodLabel) {
    const safe = (periodLabel || '').replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '');
    return 'LBC_' + slug + '_' + safe + '.csv';
  }

  /* ---- section header --------------------------------------------------- */
  function SectionHead({ title, period, note, onExport }) {
    return h('div', {
      style: {
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14, gap: 12, flexWrap: 'wrap',
      },
    },
      h('div', null,
        h('div', { className: 'fn-panel-title', style: { fontSize: 14 } }, title),
        h('div', { className: 'fn-panel-tag', style: { marginTop: 3 } }, period,
          note ? h('span', { style: { marginLeft: 10, color: 'var(--warn, #ffc65c)' } }, note) : null)),
      h('button', {
        className: 'fn-btn-ghost fn-btn fn-btn-sm',
        onClick: onExport,
        title: 'Export CSV',
        style: { display: 'flex', alignItems: 'center', gap: 6 },
      },
        h('span', { style: { display: 'inline-flex', width: 13, height: 13 } },
          window.FN.Icons.download),
        'Export CSV'));
  }

  /* ---- balance chip ------------------------------------------------------ */
  function BalChip({ ok, yes, no }) {
    return h('span', { className: 'fn-chip ' + (ok ? 'ok' : 'bad') }, ok ? (yes || 'Balanced') : (no || 'Out of balance'));
  }

  /* ---- ALL-entities note ------------------------------------------------- */
  function AllNote() {
    return h('div', {
      className: 'fn-banner',
      style: { marginBottom: 14 },
    }, 'ALL view — amounts are the arithmetic sum across entities. No intercompany eliminations are applied.');
  }

  /* =========================================================================
     STATEMENT 1: TRIAL BALANCE
     ===================================================================== */
  function TrialBalance({ ctx }) {
    const { F, FN, fmt, entityCode, periodToken, scopedAccounts, txns, period } = ctx;

    const result = useMemo(() => {
      const raw = F.report.trialBalance(scopedAccounts, txns, period.to);
      if (entityCode === 'ALL') {
        const merged = F.report.mergeByCode(raw.rows);
        const td = merged.reduce((s, r) => s + r.debit, 0);
        const tc = merged.reduce((s, r) => s + r.credit, 0);
        return { rows: merged, totalDebit: td, totalCredit: tc, balanced: Math.abs(td - tc) < 1 };
      }
      return raw;
    }, [scopedAccounts, txns, period.to, entityCode]);

    const handleExport = () => {
      const header = ['Code', 'Account', 'Type', 'Debit (IDR)', 'Credit (IDR)'];
      const rows = result.rows.map(r => [r.code, r.name, r.type, r.debit, r.credit]);
      rows.push(['', 'TOTAL', '', result.totalDebit, result.totalCredit]);
      downloadCsv(buildCsv(header, rows), csvName(entityCode, 'trial-balance', period.label));
    };

    if (result.rows.length === 0) {
      return h('div', null,
        entityCode === 'ALL' ? h(AllNote, null) : null,
        h(FN.Empty, { title: 'No activity', sub: 'No transactions found in the selected scope and period.' }));
    }

    return h('div', null,
      entityCode === 'ALL' ? h(AllNote, null) : null,
      h(SectionHead, {
        title: 'Trial Balance',
        period: 'As of ' + fmt.date(period.to),
        onExport: handleExport,
      }),
      h('div', { className: 'fn-tablewrap' },
        h('table', { className: 'fn-table' },
          h('thead', null,
            h('tr', null,
              h('th', { style: { width: 80 } }, 'Code'),
              h('th', null, 'Account'),
              h('th', { style: { width: 90 } }, 'Type'),
              h('th', { className: 'r', style: { width: 180 } }, 'Debit (IDR)'),
              h('th', { className: 'r', style: { width: 180 } }, 'Credit (IDR)'))),
          h('tbody', null,
            result.rows.map(r =>
              h('tr', { key: r.code + (r.id || '') },
                h('td', null, h('span', { className: 'fn-code' }, r.code)),
                h('td', null, r.name),
                h('td', { className: 'fn-muted fn-mono', style: { fontSize: 11 } }, window.FINANCE.fmt.title(r.type)),
                h('td', { className: 'r fn-num' }, r.debit > 0 ? fmt.n(r.debit) : '—'),
                h('td', { className: 'r fn-num' }, r.credit > 0 ? fmt.n(r.credit) : '—')))),
          h('tfoot', null,
            h('tr', { className: 'fn-table-foot' },
              h('td', { colSpan: 3 },
                h('span', { style: { marginRight: 10 } }, 'Total'),
                h(BalChip, { ok: result.balanced })),
              h('td', { className: 'r fn-num' }, fmt.n(result.totalDebit)),
              h('td', { className: 'r fn-num' }, fmt.n(result.totalCredit)))))));
  }

  /* =========================================================================
     STATEMENT 2: INCOME STATEMENT (P&L)
     ===================================================================== */
  function IncomeStatement({ ctx }) {
    const { F, FN, fmt, entityCode, scopedAccounts, txns, period } = ctx;

    const result = useMemo(() => {
      const raw = F.report.incomeStatement(scopedAccounts, txns, period.from, period.to);
      if (entityCode !== 'ALL') return raw;
      // merge by code across entities
      const income = {
        rows: F.report.mergeByCode(raw.income.rows),
        total: 0,
      };
      income.total = income.rows.reduce((s, r) => s + r.amount, 0);
      const expense = {
        rows: F.report.mergeByCode(raw.expense.rows),
        total: 0,
      };
      expense.total = expense.rows.reduce((s, r) => s + r.amount, 0);
      return { income, expense, net: income.total - expense.total };
    }, [scopedAccounts, txns, period.from, period.to, entityCode]);

    const hasActivity = result.income.rows.length > 0 || result.expense.rows.length > 0;

    const handleExport = () => {
      const header = ['Section', 'Code', 'Account', 'Amount (IDR)'];
      const rows = [];
      result.income.rows.forEach(r => rows.push(['Income', r.code, r.name, r.amount]));
      rows.push(['Income', '', 'Total Income', result.income.total]);
      result.expense.rows.forEach(r => rows.push(['Expense', r.code, r.name, r.amount]));
      rows.push(['Expense', '', 'Total Expense', result.expense.total]);
      rows.push(['', '', 'Net Income/(Loss)', result.net]);
      downloadCsv(buildCsv(header, rows), csvName(ctx.entityCode, 'income-statement', period.label));
    };

    if (!hasActivity) {
      return h('div', null,
        entityCode === 'ALL' ? h(AllNote, null) : null,
        h(FN.Empty, { title: 'No activity', sub: 'No income or expense transactions in this period.' }));
    }

    const Section = ({ label, rows, total, colorClass }) =>
      h('div', null,
        h('div', { className: 'fn-rrow head', style: { gridTemplateColumns: '80px 1fr 180px' } },
          h('span', null, ''),
          h('span', null, label),
          h('span', { className: 'r' }, 'Amount (IDR)')),
        rows.map(r =>
          h('div', { key: r.code + (r.id || ''), className: 'fn-rrow indent', style: { gridTemplateColumns: '80px 1fr 180px' } },
            h('span', { className: 'fn-code' }, r.code),
            h('span', { className: 'lbl' }, r.name),
            h('span', { className: 'r fn-num' }, fmt.n(r.amount)))),
        h('div', { className: 'fn-rrow total', style: { gridTemplateColumns: '80px 1fr 180px' } },
          h('span', null, ''),
          h('span', null, 'Total ' + label),
          h('span', { className: 'r fn-num ' + (colorClass || '') }, fmt.n(total))));

    return h('div', null,
      entityCode === 'ALL' ? h(AllNote, null) : null,
      h(SectionHead, {
        title: 'Income Statement',
        period: period.label,
        onExport: handleExport,
      }),
      h('div', { className: 'fn-panel', style: { padding: '10px 16px' } },
        h('div', { className: 'fn-rtree' },
          h(Section, { label: 'Income', rows: result.income.rows, total: result.income.total, colorClass: 'fn-pos' }),
          h('div', { style: { height: 8 } }),
          h(Section, { label: 'Expenses', rows: result.expense.rows, total: result.expense.total, colorClass: 'fn-neg' }),
          h('div', { style: { height: 12 } }),
          h('div', {
            className: 'fn-rrow total',
            style: {
              gridTemplateColumns: '80px 1fr 180px',
              borderTop: '2px solid var(--border-strong, rgba(255,255,255,0.18))',
              paddingTop: 10,
            },
          },
            h('span', null, ''),
            h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' } }, 'Net income / (loss)'),
            h('span', { className: 'r fn-num ' + (result.net >= 0 ? 'fn-pos' : 'fn-neg'), style: { fontSize: 14, fontWeight: 700 } },
              fmt.n(result.net))))));
  }

  /* =========================================================================
     STATEMENT 3: BALANCE SHEET
     ===================================================================== */
  function BalanceSheet({ ctx }) {
    const { F, FN, fmt, entityCode, scopedAccounts, txns, period, periodToken } = ctx;

    const yearStart = useMemo(() => F.period.yearStart(periodToken), [periodToken]);

    const result = useMemo(() => {
      const raw = F.report.balanceSheet(scopedAccounts, txns, period.to, yearStart);
      if (entityCode !== 'ALL') return raw;
      // merge by code across entities
      const assets = { rows: F.report.mergeByCode(raw.assets.rows), total: 0 };
      assets.total = assets.rows.reduce((s, r) => s + r.amount, 0);
      const liabilities = { rows: F.report.mergeByCode(raw.liabilities.rows), total: 0 };
      liabilities.total = liabilities.rows.reduce((s, r) => s + r.amount, 0);
      const equity = { rows: F.report.mergeByCode(raw.equity.rows), total: 0 };
      equity.total = equity.rows.reduce((s, r) => s + r.amount, 0);
      const equityTotal = equity.total + raw.retainedEarnings;
      const totalLiabEquity = liabilities.total + equityTotal;
      return {
        assets, liabilities, equity,
        retainedEarnings: raw.retainedEarnings,
        equityTotal, totalAssets: assets.total,
        totalLiabEquity,
        balanced: Math.abs(assets.total - totalLiabEquity) < 1,
      };
    }, [scopedAccounts, txns, period.to, yearStart, entityCode]);

    const hasData = result.assets.rows.length > 0 || result.liabilities.rows.length > 0 || result.equity.rows.length > 0;

    const handleExport = () => {
      const header = ['Section', 'Code', 'Account', 'Amount (IDR)'];
      const rows = [];
      result.assets.rows.forEach(r => rows.push(['Assets', r.code, r.name, r.amount]));
      rows.push(['Assets', '', 'Total Assets', result.assets.total]);
      result.liabilities.rows.forEach(r => rows.push(['Liabilities', r.code, r.name, r.amount]));
      rows.push(['Liabilities', '', 'Total Liabilities', result.liabilities.total]);
      result.equity.rows.forEach(r => rows.push(['Equity', r.code, r.name, r.amount]));
      rows.push(['Equity', '', 'Retained Earnings (YTD)', result.retainedEarnings]);
      rows.push(['Equity', '', 'Total Equity', result.equityTotal]);
      rows.push(['', '', 'Total Liabilities + Equity', result.totalLiabEquity]);
      downloadCsv(buildCsv(header, rows), csvName(ctx.entityCode, 'balance-sheet', period.label));
    };

    if (!hasData) {
      return h('div', null,
        entityCode === 'ALL' ? h(AllNote, null) : null,
        h(FN.Empty, { title: 'No data', sub: 'No balance sheet accounts have activity through this period.' }));
    }

    const col = '80px 1fr 180px';

    const SectHead = ({ label }) =>
      h('div', { className: 'fn-rrow head', style: { gridTemplateColumns: col } },
        h('span', null, ''), h('span', null, label), h('span', { className: 'r' }, 'Amount (IDR)'));

    const SectRow = ({ code, name }) =>
      h('div', { key: code, className: 'fn-rrow indent', style: { gridTemplateColumns: col } },
        h('span', { className: 'fn-code' }, code),
        h('span', { className: 'lbl' }, name),
        h('span', null, ''));

    const AmtRow = ({ code, name, amount, muted }) =>
      h('div', { key: code, className: 'fn-rrow indent', style: { gridTemplateColumns: col } },
        h('span', { className: 'fn-code' }, code || ''),
        h('span', { className: 'lbl' + (muted ? ' fn-muted' : '') }, name),
        h('span', { className: 'r fn-num' }, fmt.n(amount)));

    const TotalRow = ({ label, amount, colorClass }) =>
      h('div', { className: 'fn-rrow total', style: { gridTemplateColumns: col } },
        h('span', null, ''),
        h('span', null, label),
        h('span', { className: 'r fn-num ' + (colorClass || '') }, fmt.n(amount)));

    return h('div', null,
      entityCode === 'ALL' ? h(AllNote, null) : null,
      h(SectionHead, {
        title: 'Balance Sheet',
        period: 'As of ' + fmt.date(period.to),
        onExport: handleExport,
      }),
      h('div', { className: 'fn-panel', style: { padding: '10px 16px' } },
        h('div', { className: 'fn-rtree' },

          /* Assets */
          h(SectHead, { label: 'Assets' }),
          result.assets.rows.map(r => h(AmtRow, { key: r.code + (r.id || ''), code: r.code, name: r.name, amount: r.amount })),
          h(TotalRow, { label: 'Total Assets', amount: result.assets.total }),

          h('div', { style: { height: 8 } }),

          /* Liabilities */
          h(SectHead, { label: 'Liabilities' }),
          result.liabilities.rows.map(r => h(AmtRow, { key: r.code + (r.id || ''), code: r.code, name: r.name, amount: r.amount })),
          h(TotalRow, { label: 'Total Liabilities', amount: result.liabilities.total }),

          h('div', { style: { height: 8 } }),

          /* Equity */
          h(SectHead, { label: 'Equity' }),
          result.equity.rows.map(r => h(AmtRow, { key: r.code + (r.id || ''), code: r.code, name: r.name, amount: r.amount })),
          h(AmtRow, {
            code: '', name: 'Retained earnings (YTD)',
            amount: result.retainedEarnings, muted: false,
          }),
          h(TotalRow, { label: 'Total Equity', amount: result.equityTotal }),

          h('div', { style: { height: 12 } }),

          /* Balance check */
          h('div', {
            className: 'fn-rrow total',
            style: {
              gridTemplateColumns: col,
              borderTop: '2px solid var(--border-strong, rgba(255,255,255,0.18))',
              paddingTop: 10,
            },
          },
            h('span', null, ''),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('span', { style: { fontWeight: 700, color: 'var(--text-primary)' } }, 'Total Liabilities + Equity'),
              h(BalChip, { ok: result.balanced,
                yes: 'A = L+E',
                no: 'Out of balance (' + fmt.n(Math.abs(result.totalAssets - result.totalLiabEquity)) + ')' })),
            h('span', { className: 'r fn-num', style: { fontSize: 14, fontWeight: 700 } },
              fmt.n(result.totalLiabEquity))))));
  }

  /* =========================================================================
     STATEMENT 4: CASH FLOW
     ===================================================================== */
  function CashFlow({ ctx }) {
    const { F, FN, fmt, entityCode, scopedAccounts, txns, period } = ctx;

    const result = useMemo(() =>
      F.report.cashFlow(scopedAccounts, txns, period.from, period.to),
      [scopedAccounts, txns, period.from, period.to]);

    const reconciled = Math.abs((result.opening + result.net) - result.closing) < 1;

    const handleExport = () => {
      const header = ['Item', 'Amount (IDR)'];
      const rows = [
        ['Operating activities', result.operating],
        ['Investing activities', result.investing],
        ['Financing activities', result.financing],
        ['Net change in cash', result.net],
        ['Opening cash', result.opening],
        ['Closing cash', result.closing],
      ];
      downloadCsv(buildCsv(header, rows), csvName(ctx.entityCode, 'cash-flow', period.label));
    };

    const hasMovement = Math.abs(result.net) > 0.005 || Math.abs(result.opening) > 0.005 || Math.abs(result.closing) > 0.005;

    if (!hasMovement) {
      return h('div', null,
        entityCode === 'ALL' ? h(AllNote, null) : null,
        h(FN.Empty, { title: 'No cash movement', sub: 'No transactions touching cash accounts were found in this period.' }));
    }

    const col = '1fr 200px';

    const Row = ({ label, amount, colorClass, isTotal, isMuted }) =>
      h('div', {
        className: 'fn-rrow' + (isTotal ? ' total' : '') + (isMuted ? ' fn-muted' : ''),
        style: { gridTemplateColumns: col, paddingLeft: isTotal ? 0 : 16 },
      },
        h('span', { className: isMuted ? 'fn-muted' : '' }, label),
        h('span', { className: 'r fn-num ' + (colorClass || '') }, fmt.n(amount)));

    const Divider = () => h('div', { style: { height: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 } });

    return h('div', null,
      entityCode === 'ALL' ? h(AllNote, null) : null,
      h(SectionHead, {
        title: 'Cash Flow Statement',
        period: period.label + ' — Direct Method',
        onExport: handleExport,
      }),
      h('div', { className: 'fn-panel', style: { padding: '10px 16px' } },
        h('div', { className: 'fn-rtree' },

          h('div', { className: 'fn-rrow head', style: { gridTemplateColumns: col } },
            h('span', null, 'Category'), h('span', { className: 'r' }, 'Amount (IDR)')),

          h(Row, { label: 'Operating activities', amount: result.operating, colorClass: result.operating >= 0 ? 'fn-pos' : 'fn-neg' }),
          h(Row, { label: 'Investing activities', amount: result.investing, colorClass: result.investing >= 0 ? 'fn-pos' : 'fn-neg' }),
          h(Row, { label: 'Financing activities', amount: result.financing, colorClass: result.financing >= 0 ? 'fn-pos' : 'fn-neg' }),

          h('div', { style: { height: 4 } }),
          h('div', { className: 'fn-rrow total', style: { gridTemplateColumns: col } },
            h('span', { style: { fontWeight: 700 } }, 'Net change in cash'),
            h('span', { className: 'r fn-num ' + (result.net >= 0 ? 'fn-pos' : 'fn-neg'), style: { fontWeight: 700 } },
              (result.net >= 0 ? '+' : '') + fmt.n(result.net))),

          h('div', { style: { height: 12 } }),

          h('div', { className: 'fn-rrow head', style: { gridTemplateColumns: col } },
            h('span', null, 'Cash position'), h('span', { className: 'r' }, 'Amount (IDR)')),

          h(Row, { label: 'Opening cash', amount: result.opening, isMuted: true }),
          h(Row, { label: '+ Net change', amount: result.net }),
          h('div', { className: 'fn-rrow total', style: { gridTemplateColumns: col } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('span', null, 'Closing cash'),
              h(BalChip, { ok: reconciled, yes: 'Reconciled', no: 'Reconciliation gap' })),
            h('span', { className: 'r fn-num', style: { fontSize: 14, fontWeight: 700 } },
              fmt.n(result.closing))))));
  }

  /* =========================================================================
     ROOT: Reports (4-tab container)
     ===================================================================== */
  const TABS = [
    { id: 'tb',  label: 'Trial Balance' },
    { id: 'pnl', label: 'Income Statement' },
    { id: 'bs',  label: 'Balance Sheet' },
    { id: 'cf',  label: 'Cash Flow' },
  ];

  function Reports({ ctx }) {
    const [tab, setTab] = useState('tb');

    const renderTab = () => {
      switch (tab) {
        case 'tb':  return h(TrialBalance,     { ctx });
        case 'pnl': return h(IncomeStatement,  { ctx });
        case 'bs':  return h(BalanceSheet,     { ctx });
        case 'cf':  return h(CashFlow,         { ctx });
        default:    return null;
      }
    };

    return h('div', null,
      /* sub-nav */
      h('div', { style: { marginBottom: 18 } },
        h('div', { className: 'fn-seg' },
          TABS.map(t =>
            h('button', {
              key: t.id,
              className: tab === t.id ? 'on' : '',
              onClick: () => setTab(t.id),
            }, t.label)))),
      /* active statement */
      renderTab());
  }

  window.FN_Reports = { Reports };
})();
