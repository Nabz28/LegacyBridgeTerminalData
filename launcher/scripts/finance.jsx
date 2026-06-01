/* =========================================================================
   FINANCE (T10) — root terminal + daily-driver views.
   Loads LAST of the finance scripts. Defines window.FINANCE_TERMINAL.
   Sections: Dashboard · Ledger · Accounts · Reports · Transfers · Recurring
             · Tags · Periods · Audit · Settings.
   Reports come from window.FN_Reports, ops from window.FN_Ops.
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const F = window.FINANCE, FN = window.FN, fmt = F.fmt;
  const Icons = FN.Icons;

  /* merge report rows by account code (for the ALL-entities view) */
  F.report.mergeByCode = function (rows) {
    const m = {};
    rows.forEach(r => { const k = r.code; if (!m[k]) m[k] = Object.assign({}, r); else { m[k].amount = (m[k].amount || 0) + (r.amount || 0); m[k].debit = (m[k].debit || 0) + (r.debit || 0); m[k].credit = (m[k].credit || 0) + (r.credit || 0); m[k].net = (m[k].net || 0) + (r.net || 0); } });
    return Object.values(m).sort((a, b) => a.code.localeCompare(b.code));
  };

  /* ---- data fetchers --------------------------------------------------- */
  const loadAccounts = () => F.get('/accounts?select=id,entity_id,code,name,type,parent_id,is_root,is_active&order=code');
  const loadEntities = () => F.get('/entities?select=id,code,name&order=code');
  const loadTxns = (entityId) => {
    let q = '/transactions?select=id,ref,date,entity_id,memo,posted_at,deleted_at,journal_lines(id,account_id,debit_idr,credit_idr,reconciled)&deleted_at=is.null&order=date.desc,ref.desc&limit=8000';
    if (entityId) q += '&entity_id=eq.' + entityId;
    return F.get(q);
  };

  /* =====================================================================
     NEW TRANSACTION — From→To simple + Advanced balanced journal grid
     ===================================================================== */
  function NewTransaction({ ctx, onClose, onPosted }) {
    const entityAccts = useMemo(
      () => ctx.accounts.filter(a => !a.is_root && a.entity_id === ctx.postEntityId).sort((a, b) => a.code.localeCompare(b.code)),
      [ctx.accounts, ctx.postEntityId]);
    const [mode, setMode] = useState('simple');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [memo, setMemo] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [lines, setLines] = useState([{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const acctOpt = (a) => React.createElement('option', { key: a.id, value: a.id }, a.code + ' · ' + a.name);

    const drTotal = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const crTotal = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const balanced = Math.abs(drTotal - crTotal) < 0.005 && drTotal > 0;
    const dateInClosed = ctx.dateClosed ? ctx.dateClosed(date) : false;

    // plain-language effect so a CFO can't misread which side moves which way
    const effectText = () => {
      const amt = parseFloat(amount);
      if (!to || !from || !(amt > 0)) return 'The debit account is charged; the credit account is reduced, by the same amount. Use Advanced for multi-line entries.';
      const da = entityAccts.find(a => a.id === to), ca = entityAccts.find(a => a.id === from);
      if (!da || !ca) return '';
      const dirn = (a, side) => { const up = (a.type === 'asset' || a.type === 'expense'); const incr = side === 'debit' ? up : !up; return incr ? 'increases' : 'decreases'; };
      return da.name + ' ' + dirn(da, 'debit') + ' · ' + ca.name + ' ' + dirn(ca, 'credit') + '  ·  Rp ' + fmt.n(amt);
    };
    const setLine = (i, k, v) => setLines(ls => ls.map((l, j) => j === i ? Object.assign({}, l, { [k]: v }) : l));
    const addLine = () => setLines(ls => ls.concat([{ account_id: '', debit: '', credit: '' }]));
    const rmLine = (i) => setLines(ls => ls.length > 2 ? ls.filter((_, j) => j !== i) : ls);

    const post = async () => {
      setErr('');
      if (dateInClosed) return setErr(date + ' is in a closed period. Reopen it in Periods, or post to an open date.');
      let payloadLines;
      if (mode === 'simple') {
        const amt = parseFloat(amount);
        if (!from || !to) return setErr('Pick both a From and a To account.');
        if (from === to) return setErr('From and To must differ.');
        if (!(amt > 0)) return setErr('Amount must be greater than zero.');
        payloadLines = [
          { account_id: to, debit: amt, credit: 0, line_order: 0 },     // money arrives → debit
          { account_id: from, debit: 0, credit: amt, line_order: 1 },   // money leaves → credit
        ];
      } else {
        const clean = lines.filter(l => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0));
        if (clean.length < 2) return setErr('At least two lines with an account and an amount.');
        if (!balanced) return setErr('Debits must equal credits, and be non-zero.');
        for (const l of clean) { if ((parseFloat(l.debit) || 0) > 0 && (parseFloat(l.credit) || 0) > 0) return setErr('A line cannot have both a debit and a credit.'); }
        payloadLines = clean.map((l, i) => ({ account_id: l.account_id, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, line_order: i }));
      }
      setBusy(true);
      try {
        const res = await F.rpc('post_transaction', { p_entity_id: ctx.postEntityId, p_date: date, p_memo: memo || null, p_lines: payloadLines, p_is_demo: false });
        const ref = Array.isArray(res) && res[0] ? res[0].ref : '';
        onPosted(ref);
      } catch (e) {
        setErr('Could not post. ' + (e && e.message ? e.message : 'Check the entry and try again.'));
        setBusy(false);
      }
    };

    const entityName = (ctx.entities.find(e => e.id === ctx.postEntityId) || {}).code || '';

    return React.createElement(FN.Modal, {
      title: 'New entry · ' + entityName, onClose, wide: mode === 'advanced',
      footer: React.createElement(React.Fragment, null,
        mode === 'advanced'
          ? React.createElement('div', { className: 'fn-balbar ' + (balanced ? 'ok' : 'off'), style: { marginRight: 'auto', marginTop: 0, minWidth: 280 } },
              React.createElement('span', null, balanced ? '● Balanced' : '● Out of balance'),
              React.createElement('span', null, 'DR ' + fmt.n(drTotal) + '   CR ' + fmt.n(crTotal)))
          : null,
        React.createElement('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        React.createElement('button', { className: 'fn-btn', onClick: post, disabled: busy || dateInClosed }, busy ? 'Posting…' : 'Post entry')),
    },
      React.createElement('div', { style: { display: 'flex', gap: 16, marginBottom: 14 } },
        React.createElement('div', { className: 'fn-seg' },
          React.createElement('button', { className: mode === 'simple' ? 'on' : '', onClick: () => setMode('simple') }, 'Simple'),
          React.createElement('button', { className: mode === 'advanced' ? 'on' : '', onClick: () => setMode('advanced') }, 'Advanced')),
        React.createElement(FN.Field, { label: 'Date' }, React.createElement('input', { type: 'date', value: date, onChange: e => setDate(e.target.value) })),
      ),
      err ? React.createElement('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      dateInClosed ? React.createElement('div', { className: 'fn-banner' }, '🔒 ' + date + ' is in a closed period. Postings are locked until it is reopened in Periods.') : null,
      React.createElement(FN.Field, { label: 'Memo' }, React.createElement('input', { value: memo, placeholder: 'What is this entry for?', onChange: e => setMemo(e.target.value) })),
      React.createElement('div', { style: { height: 14 } }),
      mode === 'simple'
        ? React.createElement('div', null,
            React.createElement('div', { className: 'fn-fromto' },
              React.createElement(FN.Field, { label: 'Debit — account charged' },
                React.createElement('select', { value: to, onChange: e => setTo(e.target.value) },
                  React.createElement('option', { value: '' }, 'Select account…'), entityAccts.map(acctOpt))),
              React.createElement('div', { className: 'fn-fromto-arrow' }, Icons.arrow),
              React.createElement(FN.Field, { label: 'Credit — account reduced' },
                React.createElement('select', { value: from, onChange: e => setFrom(e.target.value) },
                  React.createElement('option', { value: '' }, 'Select account…'), entityAccts.map(acctOpt)))),
            React.createElement('div', { style: { height: 12 } }),
            React.createElement(FN.Field, { label: 'Amount (IDR)' },
              React.createElement('input', { className: 'fn-num', inputMode: 'decimal', value: amount, placeholder: '0', onChange: e => setAmount(e.target.value.replace(/[^0-9.]/g, '')) })),
            React.createElement('div', { className: 'fn-kpi-sub', style: { marginTop: 8 } }, effectText()))
        : React.createElement('div', null,
            React.createElement('div', { className: 'fn-journal' },
              React.createElement('div', { className: 'fn-jrow fn-jhead' },
                React.createElement('div', null, 'Account'), React.createElement('div', { style: { textAlign: 'right' } }, 'Debit'), React.createElement('div', { style: { textAlign: 'right' } }, 'Credit'), React.createElement('div', null, '')),
              lines.map((l, i) => React.createElement('div', { className: 'fn-jrow', key: i },
                React.createElement('select', { value: l.account_id, onChange: e => setLine(i, 'account_id', e.target.value) },
                  React.createElement('option', { value: '' }, 'Select…'), entityAccts.map(acctOpt)),
                React.createElement('input', { className: 'fn-num', inputMode: 'decimal', value: l.debit, placeholder: '0', onChange: e => { setLine(i, 'debit', e.target.value.replace(/[^0-9.]/g, '')); if (e.target.value) setLine(i, 'credit', ''); } }),
                React.createElement('input', { className: 'fn-num', inputMode: 'decimal', value: l.credit, placeholder: '0', onChange: e => { setLine(i, 'credit', e.target.value.replace(/[^0-9.]/g, '')); if (e.target.value) setLine(i, 'debit', ''); } }),
                React.createElement('button', { className: 'fn-x', onClick: () => rmLine(i), title: 'Remove line' }, '×')))),
            React.createElement('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', style: { marginTop: 10 }, onClick: addLine }, '+ Add line')));
  }

  /* =====================================================================
     TRANSACTION DETAIL — journal lines + audit history
     ===================================================================== */
  function TxnDetail({ ctx, txn, onClose }) {
    const [hist, setHist] = useState(null);
    useEffect(() => {
      F.get('/transaction_history?select=action,edited_at,before_json,after_json&txn_id=eq.' + txn.id + '&order=edited_at.desc&limit=12')
        .then(setHist).catch(() => setHist([]));
    }, [txn.id]);
    const lines = (txn.journal_lines || []).slice().sort((a, b) => (a.line_order || 0) - (b.line_order || 0));
    const acc = (id) => ctx.byId[id] || { code: '?', name: 'Unknown' };
    const total = lines.reduce((s, l) => s + Number(l.debit_idr || 0), 0);
    return React.createElement(FN.Modal, { title: txn.ref, onClose, wide: true },
      React.createElement('div', { style: { display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap' } },
        React.createElement('div', null, React.createElement('div', { className: 'fn-kpi-lbl' }, 'Date'), React.createElement('div', { className: 'fn-mono', style: { marginTop: 3 } }, fmt.date(txn.date))),
        React.createElement('div', null, React.createElement('div', { className: 'fn-kpi-lbl' }, 'Entity'), React.createElement('div', { className: 'fn-mono', style: { marginTop: 3 } }, (ctx.entities.find(e => e.id === txn.entity_id) || {}).code || '—')),
        React.createElement('div', { style: { flex: 1 } }, React.createElement('div', { className: 'fn-kpi-lbl' }, 'Memo'), React.createElement('div', { style: { marginTop: 3 } }, txn.memo || '—'))),
      React.createElement('div', { className: 'fn-tablewrap' },
        React.createElement('table', { className: 'fn-table' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', null, 'Account'), React.createElement('th', { className: 'r' }, 'Debit'), React.createElement('th', { className: 'r' }, 'Credit'))),
          React.createElement('tbody', null, lines.map((l, i) => {
            const a = acc(l.account_id);
            return React.createElement('tr', { key: i },
              React.createElement('td', null, React.createElement('span', { className: 'fn-code' }, a.code), '  ', a.name),
              React.createElement('td', { className: 'r fn-num' }, Number(l.debit_idr) ? fmt.n(l.debit_idr) : '—'),
              React.createElement('td', { className: 'r fn-num' }, Number(l.credit_idr) ? fmt.n(l.credit_idr) : '—'));
          })),
          React.createElement('tfoot', null, React.createElement('tr', { className: 'fn-table-foot' },
            React.createElement('td', null, 'Total'), React.createElement('td', { className: 'r fn-num' }, fmt.n(total)), React.createElement('td', { className: 'r fn-num' }, fmt.n(total)))))),
      React.createElement('div', { style: { height: 18 } }),
      React.createElement('div', { className: 'fn-panel-tag' }, 'Audit history'),
      React.createElement('div', { style: { marginTop: 8 } },
        hist === null ? React.createElement('div', { className: 'fn-muted', style: { fontSize: 12 } }, 'Loading…')
          : hist.length === 0 ? React.createElement('div', { className: 'fn-muted', style: { fontSize: 12 } }, 'No history.')
          : hist.map((he, i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0', fontSize: 12 } },
              React.createElement('span', { className: 'fn-chip ' + (he.action === 'insert' ? 'ok' : he.action === 'delete' ? 'bad' : 'info') }, he.action),
              React.createElement('span', { className: 'fn-mono fn-muted' }, fmt.dateTime(he.edited_at))))));
  }

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  function Dashboard({ ctx }) {
    const p = ctx.period;
    const accs = ctx.scopedAccounts;
    const bal = useMemo(() => F.report.balancesAtDate(ctx.txns, p.to), [ctx.txns, p.to]);
    const cashIds = useMemo(() => new Set(accs.filter(a => F.acct.isCash(a, ctx.accounts)).map(a => a.id)), [accs, ctx.accounts]);
    const cash = accs.filter(a => cashIds.has(a.id)).reduce((s, a) => s + (bal[a.id] || 0), 0);
    const pnl = useMemo(() => F.report.incomeStatement(accs, ctx.txns, p.from, p.to), [accs, ctx.txns, p.from, p.to]);
    const bs = useMemo(() => F.report.balanceSheet(accs, ctx.txns, p.to, F.period.yearStart(ctx.periodToken)), [accs, ctx.txns, p.to, ctx.periodToken]);
    const sumCodes = (codes) => accs.filter(a => codes.some(c => a.code.startsWith(c)) && !a.is_root).reduce((s, a) => s + Math.abs(F.acct.natural(a.type, bal[a.id] || 0)), 0);
    const ar = sumCodes(F.CHART.AR_CODES), ap = sumCodes(F.CHART.AP_CODES);
    const recent = ctx.txns.slice(0, 7);
    const netWorth = bs.totalAssets - bs.liabilities.total;

    // All-time revenue/expense + payables (independent of the month picker so
    // historical totals are always visible — what the principal asked for).
    const today = new Date().toISOString().slice(0, 10);
    const allFrom = ctx.txns.length ? ctx.txns.reduce((m, t) => (t.date < m ? t.date : m), ctx.txns[0].date) : (p.from || '2000-01-01');
    const pnlAll = useMemo(() => F.report.incomeStatement(accs, ctx.txns, allFrom, today), [accs, ctx.txns, allFrom, today]);
    const balToday = useMemo(() => F.report.balancesAtDate(ctx.txns, today), [ctx.txns, today]);
    const liabRows = accs.filter(a => a.type === 'liability' && !a.is_root).map(a => ({ code: a.code, name: a.name, amount: F.acct.natural('liability', balToday[a.id] || 0) })).filter(r => Math.abs(r.amount) > 0.005).sort((x, y) => x.code.localeCompare(y.code));
    const payTotal = liabRows.reduce((s, r) => s + r.amount, 0);
    const lineRow = (label, amount, cls) => React.createElement('tr', { key: label },
      React.createElement('td', null, label),
      React.createElement('td', { className: 'r fn-num ' + (cls || '') }, fmt.money(amount)));

    const kpi = (lbl, val, sub, cls) => React.createElement('div', { className: 'fn-kpi' },
      React.createElement('div', { className: 'fn-kpi-lbl' }, lbl),
      React.createElement('div', { className: 'fn-kpi-val' + (cls ? ' ' + cls : '') }, val),
      sub ? React.createElement('div', { className: 'fn-kpi-sub' }, sub) : null);

    return React.createElement('div', null,
      React.createElement('div', { className: 'fn-grid fn-grid-4', style: { marginBottom: 14 } },
        kpi('Cash & banks', fmt.abbr(cash), p.label),
        kpi('Net income · ' + p.label, fmt.abbr(pnl.net), (pnl.net >= 0 ? 'Profit' : 'Loss'), fmt.cls(pnl.net)),
        kpi('Net worth', fmt.abbr(netWorth), 'Assets − liabilities', fmt.cls(netWorth)),
        kpi('Receivables / Payables', fmt.abbr(ar) + ' / ' + fmt.abbr(ap), 'AR / AP outstanding')),
      React.createElement('div', { className: 'fn-grid fn-grid-2', style: { marginBottom: 14 } },
        React.createElement('div', { className: 'fn-panel' },
          React.createElement('div', { className: 'fn-panel-h' },
            React.createElement('div', { className: 'fn-panel-title' }, 'Revenue & Expense'),
            React.createElement('div', { className: 'fn-panel-tag' }, 'All-time')),
          React.createElement('div', { className: 'fn-grid fn-grid-3', style: { marginBottom: 12 } },
            kpi('Revenue', fmt.abbr(pnlAll.income.total), null, 'fn-pos'),
            kpi('Expense', fmt.abbr(pnlAll.expense.total), null, 'fn-neg'),
            kpi('Net', fmt.abbr(pnlAll.net), pnlAll.net >= 0 ? 'Profit' : 'Loss', fmt.cls(pnlAll.net))),
          React.createElement('table', { className: 'fn-table' },
            React.createElement('tbody', null,
              React.createElement('tr', { key: 'rev-h' }, React.createElement('td', { colSpan: 2, className: 'fn-panel-tag', style: { paddingTop: 4 } }, 'Revenue')),
              pnlAll.income.rows.length ? pnlAll.income.rows.map(r => lineRow(r.name, r.amount, 'fn-pos')) : React.createElement('tr', { key: 'rev-0' }, React.createElement('td', { colSpan: 2, className: 'fn-muted' }, 'No revenue yet')),
              React.createElement('tr', { key: 'exp-h' }, React.createElement('td', { colSpan: 2, className: 'fn-panel-tag', style: { paddingTop: 10 } }, 'Expense')),
              pnlAll.expense.rows.length ? pnlAll.expense.rows.map(r => lineRow(r.name, r.amount, 'fn-neg')) : React.createElement('tr', { key: 'exp-0' }, React.createElement('td', { colSpan: 2, className: 'fn-muted' }, 'No expense yet'))))),
        React.createElement('div', { className: 'fn-panel' },
          React.createElement('div', { className: 'fn-panel-h' },
            React.createElement('div', { className: 'fn-panel-title' }, 'Payables — who LBC owes'),
            React.createElement('div', { className: 'fn-panel-tag' }, fmt.abbr(payTotal))),
          liabRows.length === 0
            ? React.createElement(FN.Empty, { title: 'Nothing owed', sub: 'No outstanding liabilities.' })
            : React.createElement('table', { className: 'fn-table' },
                React.createElement('tbody', null,
                  liabRows.map(r => lineRow(r.name, r.amount, null)).concat([
                    React.createElement('tr', { key: 'pay-total' },
                      React.createElement('td', { style: { fontWeight: 600, paddingTop: 8, borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' } }, 'Total owed'),
                      React.createElement('td', { className: 'r fn-num', style: { fontWeight: 600, paddingTop: 8, borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' } }, fmt.money(payTotal)))])))) ),
      React.createElement('div', { className: 'fn-grid fn-grid-2' },
        React.createElement('div', { className: 'fn-panel' },
          React.createElement('div', { className: 'fn-panel-h' }, React.createElement('div', { className: 'fn-panel-title' }, 'Recent entries'), React.createElement('div', { className: 'fn-panel-tag' }, ctx.txns.length + ' total')),
          recent.length === 0
            ? React.createElement(FN.Empty, { title: 'No entries yet', sub: 'Post your first transaction to get started.' })
            : React.createElement('table', { className: 'fn-table' },
                React.createElement('tbody', null, recent.map(t => {
                  const amt = (t.journal_lines || []).reduce((s, l) => s + Number(l.debit_idr || 0), 0);
                  return React.createElement('tr', { key: t.id, className: 'click', onClick: () => ctx.openTxn(t) },
                    React.createElement('td', { className: 'fn-mono fn-muted', style: { width: 90 } }, fmt.date(t.date)),
                    React.createElement('td', null, React.createElement('span', { className: 'fn-ref' }, t.ref)),
                    React.createElement('td', null, t.memo || '—'),
                    React.createElement('td', { className: 'r fn-num' }, fmt.n(amt)));
                })))),
        React.createElement('div', { className: 'fn-panel' },
          React.createElement('div', { className: 'fn-panel-h' }, React.createElement('div', { className: 'fn-panel-title' }, 'Income vs expense'), React.createElement('div', { className: 'fn-panel-tag' }, p.label)),
          React.createElement(MiniBars, { income: pnl.income.total, expense: pnl.expense.total }),
          React.createElement('div', { style: { marginTop: 16 } },
            React.createElement('div', { className: 'fn-panel-tag', style: { marginBottom: 8 } }, 'Balance sheet check'),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' } }, React.createElement('span', { className: 'fn-muted' }, 'Total assets'), React.createElement('span', { className: 'fn-num' }, fmt.money(bs.totalAssets))),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' } }, React.createElement('span', { className: 'fn-muted' }, 'Liabilities + equity'), React.createElement('span', { className: 'fn-num' }, fmt.money(bs.totalLiabEquity))),
            React.createElement('div', { style: { marginTop: 8 } }, React.createElement('span', { className: 'fn-chip ' + (bs.balanced ? 'ok' : 'bad') }, bs.balanced ? 'Balanced' : 'Out of balance'))))));
  }

  function MiniBars({ income, expense }) {
    const max = Math.max(income, expense, 1);
    const bar = (lbl, v, cls) => React.createElement('div', { style: { marginBottom: 12 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 } }, React.createElement('span', { className: 'fn-muted' }, lbl), React.createElement('span', { className: 'fn-num ' + cls }, fmt.money(v))),
      React.createElement('div', { style: { height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' } },
        React.createElement('div', { style: { height: '100%', width: (v / max * 100) + '%', background: cls === 'fn-pos' ? 'var(--pos)' : 'var(--neg)', borderRadius: 4 } })));
    return React.createElement('div', null, bar('Income', income, 'fn-pos'), bar('Expense', expense, 'fn-neg'));
  }

  /* =====================================================================
     LEDGER
     ===================================================================== */
  function Ledger({ ctx }) {
    const [acct, setAcct] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const PER = 50;
    useEffect(() => { setPage(0); }, [acct, from, to, search, ctx.entityCode]);

    const filtered = useMemo(() => ctx.txns.filter(t => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (acct && !(t.journal_lines || []).some(l => l.account_id === acct)) return false;
      if (search) { const s = search.toLowerCase(); if (!((t.memo || '').toLowerCase().includes(s) || (t.ref || '').toLowerCase().includes(s))) return false; }
      return true;
    }), [ctx.txns, acct, from, to, search]);

    const pageRows = filtered.slice(page * PER, page * PER + PER);
    const accs = ctx.scopedAccounts;
    // when filtered to a single account, compute a running balance (reconciliation view)
    const single = useMemo(() => {
      if (!acct) return null;
      const asc = filtered.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ref < b.ref ? -1 : 1));
      let run = 0; const m = {};
      asc.forEach(t => { let d = 0, c = 0; (t.journal_lines || []).forEach(l => { if (l.account_id === acct) { d += Number(l.debit_idr || 0); c += Number(l.credit_idr || 0); } }); run += d - c; m[t.id] = { debit: d, credit: c, bal: run }; });
      return m;
    }, [filtered, acct]);

    return React.createElement('div', null,
      React.createElement('div', { className: 'fn-filterbar' },
        React.createElement(FN.Field, { label: 'Account' },
          React.createElement('select', { className: 'fn-select', value: acct, onChange: e => setAcct(e.target.value), style: { minWidth: 200 } },
            React.createElement('option', { value: '' }, 'All accounts'),
            accs.filter(a => !a.is_root).map(a => React.createElement('option', { key: a.id, value: a.id }, a.code + ' · ' + a.name)))),
        React.createElement(FN.Field, { label: 'From' }, React.createElement('input', { type: 'date', className: 'fn-select', value: from, onChange: e => setFrom(e.target.value) })),
        React.createElement(FN.Field, { label: 'To' }, React.createElement('input', { type: 'date', className: 'fn-select', value: to, onChange: e => setTo(e.target.value) })),
        React.createElement(FN.Field, { label: 'Search' }, React.createElement('input', { className: 'fn-select', placeholder: 'memo or ref…', value: search, onChange: e => setSearch(e.target.value), style: { minWidth: 180 } })),
        React.createElement('div', { style: { flex: 1 } }),
        React.createElement('span', { className: 'fn-kpi-sub', style: { alignSelf: 'center' } }, 'Press ', React.createElement('span', { className: 'fn-code' }, 'N'), ' for a new entry')),
      filtered.length === 0
        ? React.createElement(FN.Empty, { title: 'No matching entries', sub: 'Adjust the filters or post a new entry.' })
        : React.createElement('div', null,
            React.createElement('div', { className: 'fn-tablewrap' },
              React.createElement('table', { className: 'fn-table' },
                React.createElement('thead', null, single
                  ? React.createElement('tr', null,
                      React.createElement('th', { style: { width: 102 } }, 'Date'), React.createElement('th', { style: { width: 128 } }, 'Ref'),
                      React.createElement('th', null, 'Memo'), React.createElement('th', { className: 'r' }, 'Debit'), React.createElement('th', { className: 'r' }, 'Credit'), React.createElement('th', { className: 'r' }, 'Balance'))
                  : React.createElement('tr', null,
                      React.createElement('th', { style: { width: 102 } }, 'Date'), React.createElement('th', { style: { width: 128 } }, 'Ref'),
                      React.createElement('th', null, 'Memo'), React.createElement('th', null, 'Accounts'), React.createElement('th', { className: 'r' }, 'Amount (IDR)'))),
                React.createElement('tbody', null, pageRows.map(t => {
                  if (single) {
                    const rb = single[t.id] || { debit: 0, credit: 0, bal: 0 };
                    return React.createElement('tr', { key: t.id, className: 'click', onClick: () => ctx.openTxn(t) },
                      React.createElement('td', { className: 'fn-mono fn-muted' }, fmt.date(t.date)),
                      React.createElement('td', null, React.createElement('span', { className: 'fn-ref' }, t.ref)),
                      React.createElement('td', null, t.memo || '—'),
                      React.createElement('td', { className: 'r fn-num' }, rb.debit ? fmt.n(rb.debit) : '—'),
                      React.createElement('td', { className: 'r fn-num' }, rb.credit ? fmt.n(rb.credit) : '—'),
                      React.createElement('td', { className: 'r fn-num', style: { fontWeight: 600 } }, fmt.n(rb.bal)));
                  }
                  const amt = (t.journal_lines || []).reduce((s, l) => s + Number(l.debit_idr || 0), 0);
                  const codes = (t.journal_lines || []).map(l => (ctx.byId[l.account_id] || {}).code).filter(Boolean);
                  return React.createElement('tr', { key: t.id, className: 'click', onClick: () => ctx.openTxn(t) },
                    React.createElement('td', { className: 'fn-mono fn-muted' }, fmt.date(t.date)),
                    React.createElement('td', null, React.createElement('span', { className: 'fn-ref' }, t.ref)),
                    React.createElement('td', null, t.memo || '—'),
                    React.createElement('td', { className: 'fn-mono fn-muted', style: { fontSize: 11 } }, codes.slice(0, 4).join(' · ') + (codes.length > 4 ? ' +' + (codes.length - 4) : '')),
                    React.createElement('td', { className: 'r fn-num' }, fmt.n(amt)));
                })))),
            React.createElement('div', { className: 'fn-pager' },
              React.createElement('span', null, 'Showing ' + (page * PER + 1) + '–' + Math.min((page + 1) * PER, filtered.length) + ' of ' + filtered.length),
              React.createElement('div', { className: 'fn-pager-btns' },
                React.createElement('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', disabled: page === 0, onClick: () => setPage(p => p - 1) }, 'Prev'),
                React.createElement('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', disabled: (page + 1) * PER >= filtered.length, onClick: () => setPage(p => p + 1) }, 'Next')))));
  }

  /* =====================================================================
     MONEY LISTS — clean per-category drill-downs (Revenue / Expense / Payables)
     ===================================================================== */
  function MoneyList({ ctx, kind }) {
    const CFG = {
      revenue:  { types: ['income'],    label: 'Revenue',  cls: 'fn-pos', noun: 'revenue' },
      expense:  { types: ['expense'],   label: 'Expense',  cls: 'fn-neg', noun: 'expense' },
      payables: { types: ['liability'], label: 'Payable',  cls: '',       noun: 'liability' },
    };
    const cfg = CFG[kind];
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const accs = ctx.scopedAccounts;
    const catIds = useMemo(() => new Set(accs.filter(a => cfg.types.includes(a.type) && !a.is_root).map(a => a.id)), [accs, kind]);

    // category impact (natural sign) of a txn + the category accounts it touches
    const impact = (t) => {
      let amt = 0; const names = [];
      (t.journal_lines || []).forEach(l => {
        if (!catIds.has(l.account_id)) return;
        const a = ctx.byId[l.account_id]; if (!a) return;
        amt += F.acct.natural(a.type, Number(l.debit_idr || 0) - Number(l.credit_idr || 0));
        names.push(a.name);
      });
      return { amt, name: names.join(', ') || '—' };
    };

    const rows = useMemo(() => ctx.txns
      .map(t => { const i = impact(t); return { t, amt: i.amt, name: i.name }; })
      .filter(r => Math.abs(r.amt) > 0.005)
      .filter(r => (!from || r.t.date >= from) && (!to || r.t.date <= to))
      .filter(r => { if (!search) return true; const s = search.toLowerCase(); return (r.t.memo || '').toLowerCase().includes(s) || (r.t.ref || '').toLowerCase().includes(s) || r.name.toLowerCase().includes(s); })
      .sort((a, b) => a.t.date < b.t.date ? 1 : a.t.date > b.t.date ? -1 : (a.t.ref < b.t.ref ? 1 : -1)),
      [ctx.txns, catIds, from, to, search]);

    const total = rows.reduce((s, r) => s + r.amt, 0);
    const byAcct = {};
    rows.forEach(r => (r.t.journal_lines || []).forEach(l => {
      if (!catIds.has(l.account_id)) return; const a = ctx.byId[l.account_id]; if (!a) return;
      const k = a.code; (byAcct[k] = byAcct[k] || { code: a.code, name: a.name, total: 0, count: 0 });
      byAcct[k].total += F.acct.natural(a.type, Number(l.debit_idr || 0) - Number(l.credit_idr || 0)); byAcct[k].count += 1;
    }));
    const breakdown = Object.values(byAcct).sort((x, y) => y.total - x.total);

    return React.createElement('div', null,
      React.createElement('div', { className: 'fn-filterbar' },
        React.createElement(FN.Field, { label: 'From' }, React.createElement('input', { type: 'date', className: 'fn-select', value: from, onChange: e => setFrom(e.target.value) })),
        React.createElement(FN.Field, { label: 'To' }, React.createElement('input', { type: 'date', className: 'fn-select', value: to, onChange: e => setTo(e.target.value) })),
        React.createElement(FN.Field, { label: 'Search' }, React.createElement('input', { className: 'fn-select', placeholder: 'memo, ref or account…', value: search, onChange: e => setSearch(e.target.value), style: { minWidth: 200 } })),
        React.createElement('div', { style: { flex: 1 } }),
        (from || to) ? React.createElement('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', style: { alignSelf: 'center' }, onClick: () => { setFrom(''); setTo(''); } }, 'All time') : React.createElement('span', { className: 'fn-kpi-sub', style: { alignSelf: 'center' } }, 'Showing all time')),
      React.createElement('div', { className: 'fn-grid fn-grid-2', style: { marginBottom: 14 } },
        React.createElement('div', { className: 'fn-kpi' },
          React.createElement('div', { className: 'fn-kpi-lbl' }, 'Total ' + cfg.label.toLowerCase() + (from || to ? ' · filtered' : ' · all-time')),
          React.createElement('div', { className: 'fn-kpi-val ' + cfg.cls }, fmt.money(total)),
          React.createElement('div', { className: 'fn-kpi-sub' }, rows.length + ' entries')),
        React.createElement('div', { className: 'fn-panel' },
          React.createElement('div', { className: 'fn-panel-h' }, React.createElement('div', { className: 'fn-panel-title' }, 'By account'), React.createElement('div', { className: 'fn-panel-tag' }, breakdown.length + ' accounts')),
          breakdown.length === 0 ? React.createElement('div', { className: 'fn-muted', style: { fontSize: 12 } }, 'Nothing yet')
            : React.createElement('table', { className: 'fn-table' }, React.createElement('tbody', null, breakdown.map(b =>
                React.createElement('tr', { key: b.code },
                  React.createElement('td', { className: 'fn-mono fn-muted', style: { width: 56 } }, b.code),
                  React.createElement('td', null, b.name),
                  React.createElement('td', { className: 'r fn-num fn-muted', style: { width: 56 } }, b.count),
                  React.createElement('td', { className: 'r fn-num ' + cfg.cls, style: { fontWeight: 600 } }, fmt.money(b.total)))))))),
      rows.length === 0
        ? React.createElement(FN.Empty, { title: 'No ' + cfg.noun + ' entries', sub: 'Nothing in this range.' })
        : React.createElement('div', { className: 'fn-tablewrap' },
            React.createElement('table', { className: 'fn-table' },
              React.createElement('thead', null, React.createElement('tr', null,
                React.createElement('th', { style: { width: 102 } }, 'Date'),
                React.createElement('th', { style: { width: 128 } }, 'Ref'),
                React.createElement('th', null, 'Memo'),
                React.createElement('th', null, 'Account'),
                React.createElement('th', { className: 'r' }, 'Amount (IDR)'))),
              React.createElement('tbody', null, rows.map(r =>
                React.createElement('tr', { key: r.t.id, className: 'click', onClick: () => ctx.openTxn(r.t) },
                  React.createElement('td', { className: 'fn-mono fn-muted' }, fmt.date(r.t.date)),
                  React.createElement('td', null, React.createElement('span', { className: 'fn-ref' }, r.t.ref)),
                  React.createElement('td', null, r.t.memo || '—'),
                  React.createElement('td', { className: 'fn-muted', style: { fontSize: 12 } }, r.name),
                  React.createElement('td', { className: 'r fn-num ' + cfg.cls, style: { fontWeight: 600 } }, fmt.money(r.amt))))))));
  }

  /* =====================================================================
     ACCOUNTS — chart of accounts tree with balances as of period end
     ===================================================================== */
  function Accounts({ ctx }) {
    const p = ctx.period;
    const bal = useMemo(() => F.report.balancesAtDate(ctx.txns, p.to), [ctx.txns, p.to]);
    const singleEntityId = ctx.entityId; // null when ALL
    const tree = useMemo(() => F.acct.tree(ctx.accounts, singleEntityId || undefined), [ctx.accounts, singleEntityId]);

    const subtreeBalance = (node) => {
      let net = bal[node.id] || 0;
      node.children.forEach(c => { net += subtreeBalance(c); });
      return net;
    };
    const rows = [];
    const walk = (node, depth) => {
      const net = subtreeBalance(node);
      const shown = F.acct.natural(node.type, net);
      rows.push({ node, depth, shown });
      node.children.forEach(c => walk(c, depth + 1));
    };
    tree.forEach(n => walk(n, 0));

    if (ctx.entityCode === 'ALL') {
      return React.createElement('div', null,
        React.createElement('div', { className: 'fn-banner' }, 'Chart of accounts is shown per entity. Pick LBC, LAM or LHF above to view its full tree with balances.'));
    }

    return React.createElement('div', null,
      React.createElement('div', { className: 'fn-tablewrap' },
        React.createElement('table', { className: 'fn-table' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', { style: { width: 90 } }, 'Code'), React.createElement('th', null, 'Account'),
            React.createElement('th', { style: { width: 110 } }, 'Type'), React.createElement('th', { className: 'r', style: { width: 180 } }, 'Balance (IDR)'))),
          React.createElement('tbody', null, rows.map(({ node, depth, shown }) =>
            React.createElement('tr', { key: node.id, style: node.is_root ? { background: 'var(--bg-2)' } : null },
              React.createElement('td', null, React.createElement('span', { className: 'fn-code', style: { fontWeight: node.is_root ? 700 : 400 } }, node.code)),
              React.createElement('td', { style: { paddingLeft: 12 + depth * 18, fontWeight: node.is_root ? 700 : 400, textTransform: node.is_root ? 'uppercase' : 'none', color: node.is_root ? '#eaeff7' : 'var(--text-secondary)', fontSize: node.is_root ? 11 : 12.5, letterSpacing: node.is_root ? '0.05em' : 0 } }, node.name),
              React.createElement('td', { className: 'fn-mono fn-muted', style: { fontSize: 11 } }, fmt.title(node.type)),
              React.createElement('td', { className: 'r fn-num ' + (node.is_root ? '' : fmt.cls(shown)) }, Math.abs(shown) < 0.005 ? '—' : fmt.n(shown))))))));
  }

  /* =====================================================================
     ROOT TERMINAL
     ===================================================================== */
  const NAV = [
    { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dash', kbd: 'F1' }] },
    { group: 'Money', items: [{ id: 'revenue', label: 'Revenue', icon: 'ledger' }, { id: 'expenses', label: 'Expenses', icon: 'ledger' }, { id: 'payables', label: 'Payables', icon: 'accounts' }] },
    { group: 'Record', items: [{ id: 'ledger', label: 'Ledger', icon: 'ledger', kbd: 'F2' }, { id: 'transfers', label: 'Transfers', icon: 'transfer' }, { id: 'recurring', label: 'Recurring', icon: 'recurring' }] },
    { group: 'Structure', items: [{ id: 'accounts', label: 'Accounts', icon: 'accounts', kbd: 'F3' }, { id: 'tags', label: 'Tags', icon: 'tag' }] },
    { group: 'Report', items: [{ id: 'reports', label: 'Statements', icon: 'report', kbd: 'F4' }, { id: 'fees', label: 'Perf. Fees', icon: 'coin' }] },
    { group: 'Control', items: [{ id: 'periods', label: 'Periods', icon: 'period' }, { id: 'audit', label: 'Audit log', icon: 'audit' }, { id: 'settings', label: 'Settings', icon: 'settings' }] },
  ];

  function FinanceTerminal() {
    const [section, setSection] = useState('dashboard');
    const [entityCode, setEntityCode] = useState('LBC');
    const [periodToken, setPeriodToken] = useState(() => { const t = F.period.today(); return t.y + '-' + String(t.m).padStart(2, '0'); });
    const [entities, setEntities] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newOpen, setNewOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [toastNode, pushToast] = FN.useToast();
    const [periodsMap, setPeriodsMap] = useState({});

    const user = F.user();
    const canRead = !!user;

    // initial load: entities + accounts
    useEffect(() => {
      let alive = true;
      Promise.all([loadEntities(), loadAccounts()])
        .then(([ents, accs]) => { if (!alive) return; setEntities(ents); setAccounts(accs); })
        .catch(e => { if (alive) setError('Could not reach the finance schema. ' + (e.message || '')); })
        .finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, []);

    const entityId = useMemo(() => entityCode === 'ALL' ? null : (entities.find(e => e.code === entityCode) || {}).id || null, [entities, entityCode]);
    const reloadTxns = useCallback(() => {
      return loadTxns(entityId).then(setTxns).catch(() => setTxns([]));
    }, [entityId]);
    useEffect(() => { if (!loading) reloadTxns(); }, [reloadTxns, loading]);

    // period open/closed map for the active entity (drives the lock chip + entry guard)
    const reloadPeriods = useCallback(() => {
      if (!entityId) { setPeriodsMap({}); return Promise.resolve(); }
      return F.get('/periods?entity_id=eq.' + entityId + '&select=year,month,status')
        .then(rows => { const m = {}; rows.forEach(r => { m[r.year + '-' + r.month] = r.status; }); setPeriodsMap(m); })
        .catch(() => setPeriodsMap({}));
    }, [entityId]);
    useEffect(() => { if (!loading) reloadPeriods(); }, [reloadPeriods, loading]);
    // a YYYY-MM-DD date falls in a closed period?
    const dateClosed = useCallback((d) => {
      if (!d) return false;
      const [y, m] = d.split('-'); return periodsMap[parseInt(y, 10) + '-' + parseInt(m, 10)] === 'closed';
    }, [periodsMap]);

    // keyboard shortcuts
    useEffect(() => {
      const k = (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setNewOpen(true); }
        else if (e.key === 'F1') { e.preventDefault(); setSection('dashboard'); }
        else if (e.key === 'F2') { e.preventDefault(); setSection('ledger'); }
        else if (e.key === 'F3') { e.preventDefault(); setSection('accounts'); }
        else if (e.key === 'F4') { e.preventDefault(); setSection('reports'); }
      };
      window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
    }, []);

    const idx = useMemo(() => F.acct.index(accounts), [accounts]);
    const scopedAccounts = useMemo(() => entityId ? accounts.filter(a => a.entity_id === entityId) : accounts, [accounts, entityId]);
    const period = useMemo(() => F.period.resolve(periodToken), [periodToken]);

    const postEntityId = entityId || (entities[0] || {}).id;

    const ctx = {
      F, FN, fmt, entities, accounts, scopedAccounts, byId: idx.byId, byCode: idx.byCode,
      entityCode, setEntityCode, entityId, postEntityId, period, periodToken, setPeriodToken,
      txns, reloadTxns, toast: pushToast, periodsMap, reloadPeriods, dateClosed,
      openNew: () => setNewOpen(true), openTxn: (t) => setDetail(t),
    };
    const viewClosed = period.kind === 'month' && entityId && dateClosed(period.from);

    if (!canRead) {
      return React.createElement('div', { className: 'fn-root' }, React.createElement('div', { className: 'fn-work' },
        React.createElement(FN.Empty, { title: 'Sign in required', sub: 'The Finance terminal needs your LBC session. Log in from the launcher.' })));
    }

    const renderSection = () => {
      if (loading) return React.createElement(FN.Spinner, { label: 'Loading the ledger…' });
      if (error) return React.createElement('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, error);
      switch (section) {
        case 'dashboard': return React.createElement(Dashboard, { ctx });
        case 'ledger': return React.createElement(Ledger, { ctx });
        case 'revenue': return React.createElement(MoneyList, { ctx, kind: 'revenue' });
        case 'expenses': return React.createElement(MoneyList, { ctx, kind: 'expense' });
        case 'payables': return React.createElement(MoneyList, { ctx, kind: 'payables' });
        case 'accounts': return React.createElement(Accounts, { ctx });
        case 'reports': return window.FN_Reports ? React.createElement(window.FN_Reports.Reports, { ctx }) : React.createElement(FN.Spinner, { label: 'Loading reports…' });
        case 'fees': return window.FN_Fees ? React.createElement(window.FN_Fees.PerfFees, { ctx }) : modLoading();
        case 'transfers': return window.FN_Ops ? React.createElement(window.FN_Ops.Transfers, { ctx }) : modLoading();
        case 'recurring': return window.FN_Ops ? React.createElement(window.FN_Ops.Recurring, { ctx }) : modLoading();
        case 'tags': return window.FN_Ops ? React.createElement(window.FN_Ops.Tags, { ctx }) : modLoading();
        case 'periods': return window.FN_Ops ? React.createElement(window.FN_Ops.Periods, { ctx }) : modLoading();
        case 'audit': return window.FN_Ops ? React.createElement(window.FN_Ops.Audit, { ctx }) : modLoading();
        case 'settings': return window.FN_Ops ? React.createElement(window.FN_Ops.Settings, { ctx }) : modLoading();
        default: return null;
      }
    };
    const modLoading = () => React.createElement(FN.Spinner, { label: 'Loading module…' });

    const titleFor = { dashboard: 'Dashboard', revenue: 'Revenue', expenses: 'Expenses', payables: 'Payables — who LBC owes', ledger: 'General ledger', accounts: 'Chart of accounts', reports: 'Financial statements', fees: 'Performance fees (25% of AUM realized P&L)', transfers: 'Inter-entity transfers', recurring: 'Recurring entries', tags: 'Tag dimensions', periods: 'Period close', audit: 'Audit log', settings: 'Settings' };

    return React.createElement('div', { className: 'fn-root' },
      // header
      React.createElement('div', { className: 'fn-head' },
        React.createElement('div', { className: 'fn-head-brand' },
          React.createElement('div', { className: 'fn-head-mark' }, Icons.coin),
          React.createElement('div', null,
            React.createElement('div', { className: 'fn-head-title' }, 'Finance'),
            React.createElement('div', { className: 'fn-head-sub' }, 'CFO · double-entry ledger'))),
        React.createElement('div', { className: 'fn-head-spacer' }),
        React.createElement(FN.EntityPicker, { entities, value: entityCode, onChange: setEntityCode, allowAll: true }),
        React.createElement(FN.PeriodPicker, { value: periodToken, onChange: setPeriodToken }),
        (period.kind === 'month' && entityId)
          ? (viewClosed
              ? React.createElement('span', { className: 'fn-chip', style: { background: 'var(--warn-bg, rgba(255,198,92,.10))', color: 'var(--warn, #ffc65c)' }, title: 'This period is closed — postings are locked' }, '🔒 Locked')
              : React.createElement('span', { className: 'fn-chip', style: { background: 'var(--bg-3, #17171b)', color: 'var(--text-tertiary, #8e9ab0)' }, title: 'This period is open for postings' }, 'Open'))
          : null,
        React.createElement('button', { className: 'fn-btn', onClick: () => setNewOpen(true), disabled: !postEntityId }, Icons.plus, 'New entry')),
      // body
      React.createElement('div', { className: 'fn-body' },
        React.createElement('div', { className: 'fn-nav' },
          NAV.map(g => React.createElement(React.Fragment, { key: g.group },
            React.createElement('div', { className: 'fn-nav-group' }, g.group),
            g.items.map(it => React.createElement('div', { key: it.id, className: 'fn-nav-item' + (section === it.id ? ' on' : ''), onClick: () => setSection(it.id) },
              Icons[it.icon], React.createElement('span', null, it.label), it.kbd ? React.createElement('span', { className: 'fn-nav-kbd' }, it.kbd) : null))))),
        React.createElement('div', { className: 'fn-work' },
          React.createElement('div', { className: 'fn-work-head' },
            React.createElement('div', { className: 'fn-work-title' }, titleFor[section]),
            React.createElement('div', { className: 'fn-work-meta' }, (entityCode === 'ALL' ? 'All entities' : entityCode) + ' · ' + period.label)),
          renderSection())),
      // overlays
      newOpen && postEntityId ? React.createElement(NewTransaction, { ctx: Object.assign({}, ctx, { postEntityId }), onClose: () => setNewOpen(false), onPosted: (ref) => { setNewOpen(false); pushToast('Posted ' + ref); reloadTxns(); } }) : null,
      detail ? React.createElement(TxnDetail, { ctx, txn: detail, onClose: () => setDetail(null) }) : null,
      toastNode);
  }

  window.FINANCE_TERMINAL = FinanceTerminal;
})();
