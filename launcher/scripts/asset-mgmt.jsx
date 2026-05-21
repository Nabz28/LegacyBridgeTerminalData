// ================================================================
// The Book — M06 Asset Management terminal, Supabase-backed.
// Reads/writes asset_mgmt schema with the LBC session JWT (RLS gated to
// admin|management). Two funds (LBC Asset Management / LBC Quant Fund);
// the fund switcher re-scopes everything. Tabs: Cockpit · Positions ·
// Watchlists · Ideas · Journal · Cash · Performance.
// Core file: helpers (window.AM) + shell + Positions + Cash + Cockpit.
// The other views live in asset-mgmt-views.jsx (window.AmExtra).
// ================================================================

const AM_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const AM_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

const amSession = () => {
  try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; }
};
const amTok = () => { const s = amSession(); return s ? s.token : AM_ANON; };
const amHdr = (write) => {
  const h = { apikey: AM_ANON, Authorization: 'Bearer ' + amTok() };
  if (write) { h['Content-Type'] = 'application/json'; h['Content-Profile'] = 'asset_mgmt'; }
  else h['Accept-Profile'] = 'asset_mgmt';
  return h;
};
const AM = {
  get: (path) => fetch(AM_BASE + path, { headers: amHdr(false) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  insert: (table, row) => fetch(AM_BASE + '/' + table, { method: 'POST', headers: Object.assign(amHdr(true), { Prefer: 'return=representation' }), body: JSON.stringify(row) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  update: (table, match, patch) => fetch(AM_BASE + '/' + table + '?' + match, { method: 'PATCH', headers: Object.assign(amHdr(true), { Prefer: 'return=minimal' }), body: JSON.stringify(patch) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
  del: (table, match) => fetch(AM_BASE + '/' + table + '?' + match, { method: 'DELETE', headers: amHdr(true) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
  upsert: (table, rows) => fetch(AM_BASE + '/' + table, { method: 'POST', headers: Object.assign(amHdr(true), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
};
window.AM = AM;

const AM_FUNDS = [
  { id: 'asset_mgmt', label: 'LBC Asset Management', short: 'Asset Mgmt' },
  { id: 'quant_fund', label: 'LBC Quant Fund',       short: 'Quant Fund' },
];
window.AM.FUNDS = AM_FUNDS;

// ---- formatting ----
const amN = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const amMoney = (v, ccy) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const d = Math.abs(v) >= 1000 ? 0 : 2;
  const sym = ccy === 'IDR' ? 'Rp' : ccy === 'USD' || !ccy ? '$' : '';
  return sym + amN(v, d) + (sym ? '' : ' ' + (ccy || ''));
};
const amPct = (v) => (v === null || v === undefined || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + amN(v, 2) + '%';
const amDir = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
const amColor = (v) => (v > 0 ? 'var(--pos,#19C37D)' : v < 0 ? 'var(--neg,#FF5C70)' : 'var(--text-tertiary,#8E9AB0)');
window.AM.fmt = { n: amN, money: amMoney, pct: amPct, dir: amDir, color: amColor };

// ================================================================
// Reusable modal + field form
// ================================================================
const AmModal = ({ title, sub, onClose, children, footer, wide }) => (
  <div className="am-modal-bg" onClick={onClose}>
    <div className={`am-modal ${wide ? 'am-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="am-modal-h">
        <div><div className="am-modal-title">{title}</div>{sub && <div className="am-modal-sub">{sub}</div>}</div>
        <button className="am-x" onClick={onClose}>×</button>
      </div>
      <div className="am-modal-body">{children}</div>
      {footer && <div className="am-modal-foot">{footer}</div>}
    </div>
  </div>
);
window.AmModal = AmModal;

// fields = [{name,label,type,options,required,step,placeholder,full}]
const AmForm = ({ fields, initial, onCancel, onSave, saveLabel }) => {
  const [v, setV] = React.useState(() => {
    const o = {}; fields.forEach((f) => { o[f.name] = (initial && initial[f.name] !== undefined && initial[f.name] !== null) ? initial[f.name] : (f.type === 'number' ? '' : (f.default !== undefined ? f.default : '')); });
    return o;
  });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const set = (k, val) => setV((p) => Object.assign({}, p, { [k]: val }));
  const submit = () => {
    for (const f of fields) if (f.required && (v[f.name] === '' || v[f.name] === null || v[f.name] === undefined)) { setErr('Please fill: ' + f.label); return; }
    setErr(''); setBusy(true);
    Promise.resolve(onSave(v)).then(() => setBusy(false)).catch((e) => { setBusy(false); setErr('Save failed (' + e + ')'); });
  };
  return (
    <div>
      <div className="am-form-grid">
        {fields.map((f) => (
          <label key={f.name} className={`am-field ${f.full ? 'am-field-full' : ''}`}>
            <span className="am-field-lbl">{f.label}{f.required ? ' *' : ''}</span>
            {f.type === 'select'
              ? <select value={v[f.name]} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : f.type === 'textarea'
                ? <textarea rows={f.rows || 4} value={v[f.name]} placeholder={f.placeholder || ''} onChange={(e) => set(f.name, e.target.value)} />
                : <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} step={f.step} value={v[f.name]} placeholder={f.placeholder || ''} onChange={(e) => set(f.name, e.target.value)} />}
          </label>
        ))}
      </div>
      {err && <div className="am-form-err">{err}</div>}
      <div className="am-form-foot">
        <button className="am-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="am-btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : (saveLabel || 'Save')}</button>
      </div>
    </div>
  );
};
window.AmForm = AmForm;

// ================================================================
// Positions (hero)
// ================================================================
const AM_POS_FIELDS = [
  { name: 'symbol', label: 'Symbol', required: true, placeholder: 'BBCA' },
  { name: 'exchange', label: 'Exchange', placeholder: 'IDX' },
  { name: 'name', label: 'Name', full: true, placeholder: 'Bank Central Asia' },
  { name: 'asset_class', label: 'Asset class', type: 'select', default: 'equity', options: [{ value: 'equity', label: 'Equity' }, { value: 'etf', label: 'ETF' }, { value: 'crypto', label: 'Crypto' }, { value: 'fx', label: 'FX' }] },
  { name: 'currency', label: 'Currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }] },
  { name: 'direction', label: 'Direction', type: 'select', default: 'long', options: [{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }] },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: 'any' },
  { name: 'avg_cost', label: 'Avg cost (native)', type: 'number', required: true, step: 'any' },
  { name: 'stop', label: 'Stop', type: 'number', step: 'any' },
  { name: 'target', label: 'Target', type: 'number', step: 'any' },
  { name: 'conviction', label: 'Conviction (1-5)', type: 'number', step: '1' },
];

const AmPositions = ({ fund, rows, quotes, loading, onChange }) => {
  const [edit, setEdit] = React.useState(null);   // position obj or {} for new
  const [mark, setMark] = React.useState(null);   // position to mark
  const qmap = quotes || {};

  const enrich = (p) => {
    const last = qmap[p.symbol];
    const sign = p.direction === 'short' ? -1 : 1;
    const mv = (last != null ? last : p.avg_cost) * p.quantity;
    const pnl = last != null ? (last - p.avg_cost) * p.quantity * sign : null;
    const pnlPct = (last != null && p.avg_cost) ? (last / p.avg_cost - 1) * 100 * sign : null;
    return { last, mv, pnl, pnlPct };
  };
  const totalMv = rows.reduce((s, p) => s + enrich(p).mv, 0) || 1;

  const save = (vals) => {
    const row = {
      fund_id: fund, symbol: vals.symbol.toUpperCase(), exchange: vals.exchange || null, name: vals.name || null,
      asset_class: vals.asset_class, currency: vals.currency, direction: vals.direction,
      quantity: Number(vals.quantity), avg_cost: Number(vals.avg_cost),
      stop: vals.stop === '' ? null : Number(vals.stop), target: vals.target === '' ? null : Number(vals.target),
      conviction: vals.conviction === '' ? null : Number(vals.conviction), updated_at: new Date().toISOString(),
    };
    const p = edit && edit.id ? AM.update('positions', 'id=eq.' + edit.id, row) : AM.insert('positions', Object.assign({ status: 'open' }, row));
    return p.then(() => { setEdit(null); onChange(); });
  };
  const close = (p) => { if (!confirm('Close ' + p.symbol + '? (kept in history)')) return; AM.update('positions', 'id=eq.' + p.id, { status: 'closed', updated_at: new Date().toISOString() }).then(onChange); };
  const remove = (p) => { if (!confirm('Delete ' + p.symbol + ' permanently?')) return; AM.del('positions', 'id=eq.' + p.id).then(onChange); };
  const saveMark = (vals) => AM.upsert('quotes', [{ symbol: mark.symbol.toUpperCase(), exchange: mark.exchange || '', last: Number(vals.last), currency: mark.currency, as_of: new Date().toISOString().slice(0, 10) }]).then(() => { setMark(null); onChange(); });

  return (
    <div className="am-view">
      <div className="am-view-h">
        <span>Positions <span className="am-count">{rows.length}</span></span>
        <button className="am-btn" onClick={() => setEdit({})}>+ Add position</button>
      </div>
      {loading && <div className="am-empty">Loading positions…</div>}
      {!loading && rows.length === 0 && <div className="am-empty">No open positions. <button className="am-link" onClick={() => setEdit({})}>Add the first one →</button></div>}
      {!loading && rows.length > 0 && (
        <div className="am-table-wrap">
          <table className="am-table">
            <thead><tr>
              <th>Symbol</th><th>Name</th><th className="r">Qty</th><th className="r">Avg cost</th><th className="r">Last</th>
              <th className="r">Mkt value</th><th className="r">P&amp;L</th><th className="r">P&amp;L %</th><th className="r">Weight</th>
              <th className="r">Stop / Target</th><th className="c">Conv</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => {
                const e = enrich(p);
                return (
                  <tr key={p.id}>
                    <td className="am-sym">{p.symbol}{p.direction === 'short' && <span className="am-short">SHORT</span>}<div className="am-exch">{p.exchange || p.asset_class}</div></td>
                    <td className="am-name">{p.name || '—'}</td>
                    <td className="r">{amN(p.quantity, 0)}</td>
                    <td className="r">{amN(p.avg_cost, 2)}</td>
                    <td className="r">{e.last != null ? amN(e.last, 2) : <span className="am-pending" title="No mark yet — daily marks pending or mark manually">· · ·</span>}</td>
                    <td className="r">{amMoney(e.mv, p.currency)}</td>
                    <td className="r" style={{ color: amColor(e.pnl) }}>{e.pnl != null ? amMoney(e.pnl, p.currency) : '—'}</td>
                    <td className="r" style={{ color: amColor(e.pnlPct) }}>{e.pnlPct != null ? amPct(e.pnlPct) : '—'}</td>
                    <td className="r">{amN((e.mv / totalMv) * 100, 1)}%</td>
                    <td className="r am-st">{p.stop != null ? amN(p.stop, 2) : '—'} / {p.target != null ? amN(p.target, 2) : '—'}</td>
                    <td className="c">{p.conviction ? '★'.repeat(Math.min(5, p.conviction)) : '—'}</td>
                    <td className="am-row-actions">
                      <button title="Mark price" onClick={() => setMark(p)}>◷</button>
                      <button title="Edit" onClick={() => setEdit(p)}>✎</button>
                      <button title="Close" onClick={() => close(p)}>⊗</button>
                      <button title="Delete" onClick={() => remove(p)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {edit && <AmModal title={edit.id ? 'Edit position' : 'Add position'} sub={AM_FUNDS.find((f) => f.id === fund).label} onClose={() => setEdit(null)} wide>
        <AmForm fields={AM_POS_FIELDS} initial={edit} onCancel={() => setEdit(null)} onSave={save} saveLabel={edit.id ? 'Save position' : 'Add position'} />
      </AmModal>}
      {mark && <AmModal title={'Mark ' + mark.symbol} sub="Set the latest price (until daily marks run)" onClose={() => setMark(null)}>
        <AmForm fields={[{ name: 'last', label: 'Last price (' + mark.currency + ')', type: 'number', required: true, step: 'any' }]} initial={{ last: qmap[mark.symbol] || mark.avg_cost }} onCancel={() => setMark(null)} onSave={saveMark} saveLabel="Save mark" />
      </AmModal>}
    </div>
  );
};
window.AmPositions = AmPositions;

// ================================================================
// Cash & ledger
// ================================================================
const AM_CASH_FIELDS = [
  { name: 'type', label: 'Type', type: 'select', default: 'deposit', options: [{ value: 'deposit', label: 'Deposit' }, { value: 'withdrawal', label: 'Withdrawal' }, { value: 'dividend', label: 'Dividend' }, { value: 'fee', label: 'Fee' }, { value: 'trade', label: 'Trade' }] },
  { name: 'currency', label: 'Currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }] },
  { name: 'amount', label: 'Amount (+in / −out)', type: 'number', required: true, step: 'any' },
  { name: 'occurred_on', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
  { name: 'note', label: 'Note', full: true },
];

const AmCash = ({ fund, rows, loading, onChange }) => {
  const [add, setAdd] = React.useState(false);
  const byCcy = {};
  rows.forEach((r) => { byCcy[r.currency] = (byCcy[r.currency] || 0) + Number(r.amount); });
  const save = (vals) => AM.insert('cash_ledger', { fund_id: fund, type: vals.type, currency: vals.currency, amount: Number(vals.amount), occurred_on: vals.occurred_on, note: vals.note || null }).then(() => { setAdd(false); onChange(); });
  const remove = (r) => { if (!confirm('Delete this ledger entry?')) return; AM.del('cash_ledger', 'id=eq.' + r.id).then(onChange); };
  return (
    <div className="am-view">
      <div className="am-view-h">
        <span>Cash &amp; ledger <span className="am-count">{rows.length}</span></span>
        <button className="am-btn" onClick={() => setAdd(true)}>+ Add entry</button>
      </div>
      <div className="am-cash-bal">
        {Object.keys(byCcy).length === 0 ? <span className="am-pending">No cash entries yet</span> : Object.entries(byCcy).map(([c, v]) => (
          <div key={c} className="am-bal"><span className="am-bal-ccy">{c}</span><span className="am-bal-amt" style={{ color: amColor(v) }}>{amMoney(v, c)}</span></div>
        ))}
      </div>
      {loading && <div className="am-empty">Loading ledger…</div>}
      {!loading && rows.length > 0 && (
        <div className="am-table-wrap">
          <table className="am-table">
            <thead><tr><th>Date</th><th>Type</th><th>Ccy</th><th className="r">Amount</th><th>Note</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="am-mono">{r.occurred_on}</td>
                <td><span className={`am-tag am-tag-${r.type}`}>{r.type}</span></td>
                <td>{r.currency}</td>
                <td className="r" style={{ color: amColor(Number(r.amount)) }}>{amMoney(Number(r.amount), r.currency)}</td>
                <td className="am-name">{r.note || '—'}</td>
                <td className="am-row-actions"><button title="Delete" onClick={() => remove(r)}>🗑</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {add && <AmModal title="Add cash entry" sub={AM_FUNDS.find((f) => f.id === fund).label} onClose={() => setAdd(false)}>
        <AmForm fields={AM_CASH_FIELDS} onCancel={() => setAdd(false)} onSave={save} saveLabel="Add entry" />
      </AmModal>}
    </div>
  );
};
window.AmCash = AmCash;

// ================================================================
// Cockpit — overview KPIs + top positions + recent + open ideas
// ================================================================
const AmCockpit = ({ fund, positions, cash, quotes, ideas, trades, onTab }) => {
  const qmap = quotes || {};
  const enrich = (p) => { const last = qmap[p.symbol]; const sign = p.direction === 'short' ? -1 : 1; const mv = (last != null ? last : p.avg_cost) * p.quantity; const pnl = last != null ? (last - p.avg_cost) * p.quantity * sign : 0; return { mv, pnl }; };
  const posVal = positions.reduce((s, p) => s + enrich(p).mv, 0);
  const totalPnl = positions.reduce((s, p) => s + enrich(p).pnl, 0);
  const cashTotal = cash.reduce((s, r) => s + Number(r.amount), 0);
  const nav = posVal + cashTotal;
  const invested = positions.reduce((s, p) => s + p.avg_cost * p.quantity, 0);
  const top = [...positions].map((p) => Object.assign({}, p, enrich(p))).sort((a, b) => b.mv - a.mv).slice(0, 5);
  const openIdeas = (ideas || []).filter((i) => !['exited', 'archived'].includes(i.status));
  const recentTrades = (trades || []).slice(0, 6);

  const Kpi = ({ label, value, color, sub }) => (
    <div className="am-kpi"><div className="am-kpi-lbl">{label}</div><div className="am-kpi-val" style={color ? { color } : null}>{value}</div>{sub && <div className="am-kpi-sub">{sub}</div>}</div>
  );
  return (
    <div className="am-view">
      <div className="am-kpi-strip">
        <Kpi label="NAV (est.)" value={amMoney(nav, 'USD')} sub="positions + cash" />
        <Kpi label="Positions value" value={amMoney(posVal, 'USD')} sub={positions.length + ' open'} />
        <Kpi label="Cash" value={amMoney(cashTotal, 'USD')} color={amColor(cashTotal)} />
        <Kpi label="Total P&L" value={amMoney(totalPnl, 'USD')} color={amColor(totalPnl)} sub={invested ? amPct((totalPnl / invested) * 100) : ''} />
        <Kpi label="Open ideas" value={openIdeas.length} sub="conviction pipeline" />
      </div>
      <div className="am-cockpit-grid">
        <div className="am-panel">
          <div className="am-panel-h">Top positions <button className="am-link" onClick={() => onTab('positions')}>All →</button></div>
          {top.length === 0 ? <div className="am-empty sm">No positions yet.</div> : (
            <table className="am-table am-table-mini"><tbody>{top.map((p) => (
              <tr key={p.id}><td className="am-sym">{p.symbol}</td><td className="am-name">{p.name || ''}</td><td className="r">{amMoney(p.mv, p.currency)}</td><td className="r" style={{ color: amColor(p.pnl) }}>{amMoney(p.pnl, p.currency)}</td></tr>
            ))}</tbody></table>
          )}
        </div>
        <div className="am-panel">
          <div className="am-panel-h">Open ideas <button className="am-link" onClick={() => onTab('ideas')}>All →</button></div>
          {openIdeas.length === 0 ? <div className="am-empty sm">No open ideas.</div> : (
            <ul className="am-mini-list">{openIdeas.slice(0, 6).map((i) => (
              <li key={i.id}><span className="am-sym">{i.symbol || '—'}</span><span className="am-name">{i.name || ''}</span><span className={`am-tag am-tag-${i.status}`}>{i.status}</span></li>
            ))}</ul>
          )}
        </div>
        <div className="am-panel">
          <div className="am-panel-h">Recent trades <button className="am-link" onClick={() => onTab('journal')}>Journal →</button></div>
          {recentTrades.length === 0 ? <div className="am-empty sm">No trades logged.</div> : (
            <table className="am-table am-table-mini"><tbody>{recentTrades.map((t) => (
              <tr key={t.id}><td className="am-mono">{(t.occurred_at || '').slice(0, 10)}</td><td><span className={`am-tag am-tag-${t.side}`}>{t.side}</span></td><td className="am-sym">{t.symbol}</td><td className="r">{amN(t.quantity, 0)} @ {amN(t.price, 2)}</td></tr>
            ))}</tbody></table>
          )}
        </div>
      </div>
    </div>
  );
};
window.AmCockpit = AmCockpit;

// ================================================================
// Root — The Book
// ================================================================
const AM_TABS = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'positions', label: 'Positions' },
  { id: 'watchlists', label: 'Watchlists' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'journal', label: 'Journal' },
  { id: 'cash', label: 'Cash' },
  { id: 'performance', label: 'Performance' },
];

const AssetMgmtBook = () => {
  const [fund, setFund] = React.useState('asset_mgmt');
  const [tab, setTab] = React.useState('cockpit');
  const [tick, setTick] = React.useState(0);
  const [positions, setPositions] = React.useState([]);
  const [cash, setCash] = React.useState([]);
  const [quotes, setQuotes] = React.useState({});
  const [ideas, setIdeas] = React.useState([]);
  const [trades, setTrades] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const refresh = () => setTick((t) => t + 1);

  // load fund-scoped data (positions, cash, quotes, ideas, trades) on fund/tick change
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      AM.get(`/positions?select=*&fund_id=eq.${fund}&status=eq.open&order=opened_at.desc`).catch(() => []),
      AM.get(`/cash_ledger?select=*&fund_id=eq.${fund}&order=occurred_on.desc`).catch(() => []),
      AM.get('/quotes?select=symbol,last,as_of&order=as_of.desc').catch(() => []),
      AM.get(`/ideas?select=*&fund_id=eq.${fund}&order=updated_at.desc`).catch(() => []),
      AM.get(`/trades?select=*&fund_id=eq.${fund}&order=occurred_at.desc`).catch(() => []),
    ]).then(([pos, csh, qts, ids, trd]) => {
      if (cancelled) return;
      setPositions(pos || []); setCash(csh || []); setIdeas(ids || []); setTrades(trd || []);
      const qm = {}; (qts || []).forEach((q) => { if (qm[q.symbol] === undefined) qm[q.symbol] = Number(q.last); });
      setQuotes(qm); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fund, tick]);

  const ext = window.AmExtra || {};
  const body = () => {
    if (tab === 'cockpit') return <AmCockpit fund={fund} positions={positions} cash={cash} quotes={quotes} ideas={ideas} trades={trades} onTab={setTab} />;
    if (tab === 'positions') return <AmPositions fund={fund} rows={positions} quotes={quotes} loading={loading} onChange={refresh} />;
    if (tab === 'cash') return <AmCash fund={fund} rows={cash} loading={loading} onChange={refresh} />;
    if (tab === 'watchlists') return ext.Watchlists ? <ext.Watchlists fund={fund} /> : <div className="am-empty">Watchlists module not loaded.</div>;
    if (tab === 'ideas') return ext.Ideas ? <ext.Ideas fund={fund} rows={ideas} loading={loading} onChange={refresh} /> : <div className="am-empty">Ideas module not loaded.</div>;
    if (tab === 'journal') return ext.Journal ? <ext.Journal fund={fund} rows={trades} loading={loading} onChange={refresh} /> : <div className="am-empty">Journal module not loaded.</div>;
    if (tab === 'performance') return ext.Performance ? <ext.Performance fund={fund} positions={positions} cash={cash} quotes={quotes} /> : <div className="am-empty">Performance module not loaded.</div>;
    return null;
  };

  return (
    <div className="am-shell">
      <div className="am-head">
        <div className="am-head-l">
          <span className="am-head-title">The Book</span>
          <div className="am-fund-switch">
            {AM_FUNDS.map((f) => <button key={f.id} className={`am-fund ${fund === f.id ? 'active' : ''}`} onClick={() => { setFund(f.id); setTick((t) => t + 1); }}>{f.short}</button>)}
          </div>
        </div>
        <button className="am-btn-ghost am-reload" onClick={refresh} title="Reload">↻</button>
      </div>
      <div className="am-tabs">
        {AM_TABS.map((t) => <button key={t.id} className={`am-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <div className="am-scroll">{body()}</div>
    </div>
  );
};
window.AssetMgmt = AssetMgmtBook;
