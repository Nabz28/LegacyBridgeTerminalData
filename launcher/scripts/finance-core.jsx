/* =========================================================================
   FINANCE (T10) — core: PostgREST helper, formatters, accounting math,
   shared UI atoms. Loads before finance.jsx. Everything hangs on this.

   Exposes:
     window.FINANCE        — { get, insert, update, del, upsert, rpc, count,
                               sub, user, fmt, period, acct, report, CHART }
     window.FN             — shared React atoms { Modal, Field, Icons, Spinner,
                               Empty, useToast, EntityPicker, PeriodPicker }
   Vanilla Babel-in-browser React. No build step. Mirrors window.BRAIN / window.AM.
   ========================================================================= */
(function () {
  const FN_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  const FN_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  /* ---- session / auth (reads the launcher's lbc_auth JWT) ------------- */
  const session = () => {
    try {
      const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null');
      return (s && s.token && s.exp && Date.now() < s.exp) ? s : null;
    } catch { return null; }
  };
  const tok  = () => { const s = session(); return s ? s.token : FN_ANON; };
  const hdr  = (write) => {
    const h = { apikey: FN_ANON, Authorization: 'Bearer ' + tok() };
    if (write) { h['Content-Type'] = 'application/json'; h['Content-Profile'] = 'finance'; }
    else { h['Accept-Profile'] = 'finance'; }
    return h;
  };
  const fail = (r) => Promise.reject(new Error('finance ' + r.status));

  const FINANCE = {
    get: (path) => fetch(FN_BASE + path, { headers: hdr(false) }).then(r => r.ok ? r.json() : fail(r)),
    insert: (table, row) => fetch(FN_BASE + '/' + table, {
      method: 'POST', headers: Object.assign(hdr(true), { Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    }).then(r => r.ok ? r.json() : fail(r)),
    update: (table, match, patch) => fetch(FN_BASE + '/' + table + '?' + match, {
      method: 'PATCH', headers: Object.assign(hdr(true), { Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    }).then(r => r.ok ? r.json() : fail(r)),
    del: (table, match) => fetch(FN_BASE + '/' + table + '?' + match, {
      method: 'DELETE', headers: hdr(true),
    }).then(r => r.ok ? true : fail(r)),
    upsert: (table, rows, onConflict) => fetch(FN_BASE + '/' + table + (onConflict ? '?on_conflict=' + onConflict : ''), {
      method: 'POST', headers: Object.assign(hdr(true), { Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    }).then(r => r.ok ? r.json() : fail(r)),
    rpc: (fn, args) => fetch(FN_BASE + '/rpc/' + fn, {
      method: 'POST', headers: Object.assign(hdr(true), { Prefer: 'return=representation' }),
      body: JSON.stringify(args || {}),
    }).then(r => r.ok ? r.json() : fail(r)),
    count: (table, qs) => fetch(FN_BASE + '/' + table + (qs ? '?' + qs : ''), {
      headers: Object.assign(hdr(false), { Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' }),
    }).then(r => {
      const cr = r.headers.get('content-range') || '';
      const t = cr.split('/').pop();
      return (t === '' || t === '*') ? 0 : parseInt(t, 10);
    }),
  };
  FINANCE.sub  = () => { const s = session(); return s && s.user ? s.user.id : null; };
  FINANCE.user = () => { const s = session(); return s ? s.user : null; };
  FINANCE.session = session;

  /* ---- chart-of-accounts constants (from the seeded chart) ------------ */
  FINANCE.CHART = {
    CASH_ROOT: '1100',                       // cash & banks subtree
    AR_CODES:  ['1200', '1400', '1500'],     // receivables / prepaid / other current
    AP_CODES:  ['2100', '2200', '2300'],     // payables / accrued / other current liab
    TYPES: ['asset', 'liability', 'equity', 'income', 'expense'],
  };

  /* ---- formatters ------------------------------------------------------ */
  const isNum = (v) => v !== null && v !== undefined && !isNaN(v);
  const r0 = (v) => Math.round(Number(v) || 0);
  const grp = (n, d) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = {
    // comma-grouped integer IDR, no symbol (symbol lives in column header)
    n: (v) => !isNum(v) ? '—' : grp(r0(v), 0),
    // Rp 12,847,392,150
    money: (v) => !isNum(v) ? '—' : 'Rp ' + grp(r0(v), 0),
    // abbreviated: Rp 12.85 B / Rp 142.3 M / Rp 84.5 k
    abbr: (v) => {
      if (!isNum(v)) return '—';
      const neg = v < 0; const a = Math.abs(v);
      const U = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
      for (const [t, s] of U) {
        if (a >= t) { const x = a / t; const d = x >= 100 ? 0 : x >= 10 ? 1 : 2; return (neg ? '-' : '') + 'Rp ' + grp(x, d) + ' ' + s; }
      }
      return (neg ? '-' : '') + 'Rp ' + grp(r0(a), 0);
    },
    pct: (v) => !isNum(v) ? '—' : (v > 0 ? '+' : '') + grp(v, 1) + '%',
    cls: (v) => (v > 0 ? 'fn-pos' : v < 0 ? 'fn-neg' : 'fn-muted'),
    title: (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '—',
    // 14 May 2026 (Asia/Jakarta)
    date: (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }); } catch { return iso; } },
    dateTime: (iso) => { if (!iso) return '—'; try { const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); } catch { return iso; } },
    ago: (iso) => {
      if (!iso) return ''; const d = (Date.now() - new Date(iso).getTime()) / 1000;
      if (d < 60) return 'just now'; if (d < 3600) return Math.floor(d / 60) + 'm ago';
      if (d < 86400) return Math.floor(d / 3600) + 'h ago'; if (d < 2592000) return Math.floor(d / 86400) + 'd ago';
      return fmt.date(iso);
    },
  };
  FINANCE.fmt = fmt;

  /* ---- period tokens: YYYY-MM | YYYY-Qn | YYYY-YTD -------------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  const lastDay = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based
  const period = {
    today: () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; },
    // returns { token, label, from, to, year }
    resolve: (token) => {
      const t = period.today();
      if (!token) token = t.y + '-' + pad(t.m);
      let m;
      if ((m = token.match(/^(\d{4})-(\d{2})$/))) {
        const y = +m[1], mo = +m[2];
        return { token, kind: 'month', year: y, from: ymd(y, mo, 1), to: ymd(y, mo, lastDay(y, mo)),
          label: new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
      }
      if ((m = token.match(/^(\d{4})-Q([1-4])$/))) {
        const y = +m[1], q = +m[2]; const sm = (q - 1) * 3 + 1; const em = sm + 2;
        return { token, kind: 'quarter', year: y, from: ymd(y, sm, 1), to: ymd(y, em, lastDay(y, em)), label: y + ' Q' + q };
      }
      if ((m = token.match(/^(\d{4})-YTD$/))) {
        const y = +m[1]; const end = (y === t.y) ? { mo: t.m, d: t.d } : { mo: 12, d: 31 };
        return { token, kind: 'ytd', year: y, from: ymd(y, 1, 1), to: ymd(y, end.mo, end.d), label: y + ' YTD' };
      }
      return period.resolve(t.y + '-' + pad(t.m));
    },
    yearStart: (token) => { const p = period.resolve(token); return ymd(p.year, 1, 1); },
    prior: (token) => {
      const p = period.resolve(token);
      if (p.kind === 'month') { const m = p.token.match(/^(\d{4})-(\d{2})$/); let y = +m[1], mo = +m[2] - 1; if (mo < 1) { mo = 12; y--; } return y + '-' + pad(mo); }
      if (p.kind === 'quarter') { const m = p.token.match(/^(\d{4})-Q([1-4])$/); let y = +m[1], q = +m[2] - 1; if (q < 1) { q = 4; y--; } return y + '-Q' + q; }
      return (p.year - 1) + '-YTD';
    },
    // build a list of recent month tokens for the picker
    recentMonths: (n) => { const t = period.today(); const out = []; let y = t.y, mo = t.m; for (let i = 0; i < n; i++) { out.push(y + '-' + pad(mo)); mo--; if (mo < 1) { mo = 12; y--; } } return out; },
  };
  FINANCE.period = period;

  /* ---- account helpers ------------------------------------------------- */
  const acct = {
    index: (accounts) => { const byId = {}, byCode = {}; accounts.forEach(a => { byId[a.id] = a; byCode[a.entity_id + ':' + a.code] = a; }); return { byId, byCode }; },
    // build code-sorted tree (roots -> children) for one entity (or all)
    tree: (accounts, entityId) => {
      const list = accounts.filter(a => !entityId || a.entity_id === entityId);
      const byId = {}; list.forEach(a => byId[a.id] = Object.assign({}, a, { children: [] }));
      const roots = [];
      list.forEach(a => { const node = byId[a.id]; if (a.parent_id && byId[a.parent_id]) byId[a.parent_id].children.push(node); else roots.push(node); });
      const sort = (arr) => { arr.sort((x, y) => (x.code || '').localeCompare(y.code || '')); arr.forEach(n => sort(n.children)); };
      sort(roots); return roots;
    },
    natural: (type, net) => (type === 'asset' || type === 'expense') ? net : -net,
    isCash: (a, accounts) => {
      if (a.type !== 'asset') return false;
      if (a.code === FINANCE.CHART.CASH_ROOT) return true;
      // descendant of the 1100 cash root within the same entity
      const root = accounts.find(x => x.entity_id === a.entity_id && x.code === FINANCE.CHART.CASH_ROOT);
      if (!root) return a.code.startsWith('11');
      let cur = a; const byId = {}; accounts.forEach(x => byId[x.id] = x);
      while (cur && cur.parent_id) { if (cur.parent_id === root.id) return true; cur = byId[cur.parent_id]; }
      return false;
    },
  };
  FINANCE.acct = acct;

  /* ---- core accounting math ------------------------------------------- *
   * Inputs:
   *   accounts: [{id, entity_id, code, name, type, parent_id, is_root}]
   *   txns:     [{id, ref, date, entity_id, memo, deleted_at,
   *               journal_lines:[{account_id, debit_idr, credit_idr, reconciled}]}]
   *   All callers pass NON-deleted txns (deleted_at filtered in the query).
   * --------------------------------------------------------------------- */
  const num = (v) => Number(v) || 0;
  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  const report = {
    // net (debit - credit) per account for txns with date <= asOf
    balancesAtDate: (txns, asOf) => {
      const bal = {};
      txns.forEach(t => { if (asOf && t.date > asOf) return; (t.journal_lines || []).forEach(l => { bal[l.account_id] = (bal[l.account_id] || 0) + num(l.debit_idr) - num(l.credit_idr); }); });
      return bal;
    },
    // {debit,credit} activity per account for txns with date in [from,to]
    activity: (txns, from, to) => {
      const act = {};
      txns.forEach(t => { if (!inRange(t.date, from, to)) return; (t.journal_lines || []).forEach(l => { const a = act[l.account_id] || (act[l.account_id] = { debit: 0, credit: 0 }); a.debit += num(l.debit_idr); a.credit += num(l.credit_idr); }); });
      return act;
    },

    trialBalance: (accounts, txns, asOf) => {
      const bal = report.balancesAtDate(txns, asOf);
      const rows = accounts
        .filter(a => !a.is_root)
        .map(a => { const net = bal[a.id] || 0; return { code: a.code, name: a.name, type: a.type, id: a.id, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0, net }; })
        .filter(r => Math.abs(r.net) > 0.005)
        .sort((x, y) => x.code.localeCompare(y.code));
      const td = rows.reduce((s, r) => s + r.debit, 0), tc = rows.reduce((s, r) => s + r.credit, 0);
      return { rows, totalDebit: td, totalCredit: tc, balanced: Math.abs(td - tc) < 1 };
    },

    // income statement over a period (with prior-period comparison activity map)
    incomeStatement: (accounts, txns, from, to) => {
      const act = report.activity(txns, from, to);
      const build = (type) => {
        const rows = accounts.filter(a => a.type === type && !a.is_root).map(a => {
          const x = act[a.id] || { debit: 0, credit: 0 };
          const amt = acct.natural(type, x.debit - x.credit); // income: credit-debit; expense: debit-credit
          return { code: a.code, name: a.name, id: a.id, amount: amt };
        }).filter(r => Math.abs(r.amount) > 0.005).sort((p, q) => p.code.localeCompare(q.code));
        const total = rows.reduce((s, r) => s + r.amount, 0);
        return { rows, total };
      };
      const income = build('income'), expense = build('expense');
      return { income, expense, net: income.total - expense.total };
    },

    balanceSheet: (accounts, txns, asOf, yearStart) => {
      const bal = report.balancesAtDate(txns, asOf);
      const sect = (type) => {
        const rows = accounts.filter(a => a.type === type && !a.is_root).map(a => {
          const amt = acct.natural(type, bal[a.id] || 0);
          return { code: a.code, name: a.name, id: a.id, amount: amt };
        }).filter(r => Math.abs(r.amount) > 0.005).sort((p, q) => p.code.localeCompare(q.code));
        return { rows, total: rows.reduce((s, r) => s + r.amount, 0) };
      };
      const assets = sect('asset'), liabilities = sect('liability'), equity = sect('equity');
      // retained earnings YTD = net income from yearStart..asOf
      const ytd = report.incomeStatement(accounts, txns.filter(t => t.date >= yearStart && t.date <= asOf), yearStart, asOf).net;
      const equityTotal = equity.total + ytd;
      const lhs = assets.total, rhs = liabilities.total + equityTotal;
      return { assets, liabilities, equity, retainedEarnings: ytd, equityTotal, totalAssets: lhs, totalLiabEquity: rhs, balanced: Math.abs(lhs - rhs) < 1 };
    },

    // direct-method cash flow over a period
    cashFlow: (accounts, txns, from, to) => {
      const cashIds = new Set(accounts.filter(a => acct.isCash(a, accounts)).map(a => a.id));
      const byId = {}; accounts.forEach(a => byId[a.id] = a);
      const buckets = { operating: 0, investing: 0, financing: 0 };
      const classify = (type) => (type === 'income' || type === 'expense') ? 'operating' : (type === 'asset') ? 'investing' : 'financing';
      txns.forEach(t => {
        if (!inRange(t.date, from, to)) return;
        const lines = t.journal_lines || [];
        const cashDelta = lines.filter(l => cashIds.has(l.account_id)).reduce((s, l) => s + num(l.debit_idr) - num(l.credit_idr), 0);
        if (Math.abs(cashDelta) < 0.005) return; // no cash movement
        const others = lines.filter(l => !cashIds.has(l.account_id));
        const denom = others.reduce((s, l) => s + Math.abs(num(l.debit_idr) - num(l.credit_idr)), 0);
        if (denom < 0.005) { buckets.operating += cashDelta; return; }
        others.forEach(l => { const w = Math.abs(num(l.debit_idr) - num(l.credit_idr)) / denom; const acc = byId[l.account_id]; buckets[classify(acc ? acc.type : 'income')] += cashDelta * w; });
      });
      const balBefore = report.balancesAtDate(txns, null);
      const opening = accounts.filter(a => cashIds.has(a.id)).reduce((s, a) => s, 0);
      // opening = cash net for date < from ; closing = cash net for date <= to
      const cashNet = (asOf, before) => txns.reduce((s, t) => {
        if (before ? !(t.date < from) : !(t.date <= to)) return s;
        return s + (t.journal_lines || []).filter(l => cashIds.has(l.account_id)).reduce((ss, l) => ss + num(l.debit_idr) - num(l.credit_idr), 0);
      }, 0);
      const open = cashNet(null, true), close = cashNet(null, false);
      return { operating: buckets.operating, investing: buckets.investing, financing: buckets.financing, opening: open, closing: close, net: buckets.operating + buckets.investing + buckets.financing, change: close - open };
    },
  };
  FINANCE.report = report;

  window.FINANCE = FINANCE;

  /* =====================================================================
     Shared UI atoms (window.FN) — rendered with the global React/Babel.
     ===================================================================== */
  const h = React.createElement;

  const Icons = {
    dash: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('rect', { x: 3, y: 3, width: 7, height: 9, rx: 1 }), h('rect', { x: 14, y: 3, width: 7, height: 5, rx: 1 }), h('rect', { x: 14, y: 12, width: 7, height: 9, rx: 1 }), h('rect', { x: 3, y: 16, width: 7, height: 5, rx: 1 })),
    ledger: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M4 4h16v16H4z' }), h('path', { d: 'M4 9h16M9 4v16' })),
    accounts: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M4 5h10M4 10h7M4 15h12M4 20h5' })),
    report: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M5 21V8M12 21V3M19 21v-9' })),
    transfer: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M4 8h13l-3-3M20 16H7l3 3' })),
    period: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('rect', { x: 3, y: 4, width: 18, height: 17, rx: 2 }), h('path', { d: 'M3 9h18M8 2v4M16 2v4' })),
    recurring: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16' }), h('path', { d: 'M21 4v4h-4M3 20v-4h4' })),
    tag: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M3 3h8l10 10-8 8L3 11V3z' }), h('circle', { cx: 7, cy: 7, r: 1.4 })),
    audit: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M9 5h9v16H6V8l3-3z' }), h('path', { d: 'M9 5v3H6M9 12h6M9 16h6' })),
    settings: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('circle', { cx: 12, cy: 12, r: 3 }), h('path', { d: 'M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z' })),
    plus: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('path', { d: 'M12 5v14M5 12h14' })),
    coin: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' })),
    arrow: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }, h('path', { d: 'M5 12h14M13 6l6 6-6 6' })),
    download: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }, h('path', { d: 'M12 4v12M7 11l5 5 5-5M5 20h14' })),
  };

  function Modal({ title, onClose, children, footer, wide }) {
    React.useEffect(() => {
      const k = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
    }, [onClose]);
    return h('div', { className: 'fn-modal-bg', onMouseDown: (e) => { if (e.target === e.currentTarget) onClose && onClose(); } },
      h('div', { className: 'fn-modal' + (wide ? ' wide' : '') },
        h('div', { className: 'fn-modal-h' }, h('div', { className: 'fn-modal-title' }, title), h('button', { className: 'fn-x', onClick: onClose }, '×')),
        h('div', { className: 'fn-modal-body' }, children),
        footer ? h('div', { className: 'fn-modal-foot' }, footer) : null,
      ));
  }

  function Field({ label, children }) {
    return h('label', { className: 'fn-field' }, label ? h('span', { className: 'fn-field-lbl' }, label) : null, children);
  }

  function Spinner({ label }) { return h('div', { className: 'fn-loading' }, h('span', { className: 'fn-spin' }), label || 'Loading…'); }
  function Empty({ title, sub, icon }) { return h('div', { className: 'fn-empty' }, icon || null, h('div', { className: 'fn-empty-t' }, title || 'Nothing here yet'), sub ? h('div', { className: 'fn-empty-s' }, sub) : null); }

  // toast hook: returns [node, push]
  function useToast() {
    const [t, setT] = React.useState(null);
    const push = React.useCallback((msg, err) => { setT({ msg, err }); setTimeout(() => setT(null), 3200); }, []);
    const node = t ? h('div', { className: 'fn-toast' + (t.err ? ' err' : '') }, h('span', { className: 'dot' }), t.msg) : null;
    return [node, push];
  }

  function EntityPicker({ entities, value, onChange, allowAll }) {
    return h('div', { className: 'fn-pick' },
      h('span', { className: 'fn-pick-lbl' }, 'Entity'),
      h('div', { className: 'fn-seg' },
        (allowAll ? [{ code: 'ALL', name: 'All' }] : []).concat(entities).map(e =>
          h('button', { key: e.code, className: value === e.code ? 'on' : '', onClick: () => onChange(e.code), title: e.name }, e.code))));
  }

  function PeriodPicker({ value, onChange }) {
    const months = FINANCE.period.recentMonths(6);
    const opts = months.concat(months.slice(0, 1).map(m => m.slice(0, 4) + '-Q' + (Math.floor((+months[0].slice(5) - 1) / 3) + 1)))
      .concat([new Date().getFullYear() + '-YTD']);
    const uniq = Array.from(new Set(opts));
    return h('div', { className: 'fn-pick' },
      h('span', { className: 'fn-pick-lbl' }, 'Period'),
      h('select', { className: 'fn-select', value, onChange: (e) => onChange(e.target.value) },
        uniq.map(tok => h('option', { key: tok, value: tok }, FINANCE.period.resolve(tok).label))));
  }

  window.FN = { Icons, Modal, Field, Spinner, Empty, useToast, EntityPicker, PeriodPicker, h };
})();
