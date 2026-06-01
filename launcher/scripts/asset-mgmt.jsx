// ================================================================
// The Book — M06 Asset Management terminal (V2), Supabase-backed.
// asset_mgmt schema, LBC session JWT (RLS admin|management).
// Two funds + "All funds"; platform-aware (Stockbit/Pluang/Bitget/IBKR);
// FX conversion with IDR/USD headline toggle (native buckets preserved);
// sizing tranches + risk calc; soft restricted/no-trade flags; per-name hub.
// Core: helpers (window.AM) + FX/currency + Positions + Cash + Cockpit + shell.
// Extra views (Watchlists/Ideas/Journal/Performance/Intel/Research/NameHub)
// live in asset-mgmt-views.jsx (window.AmExtra).
// ================================================================

const AM_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const AM_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

const amSession = () => {
  try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; }
};
const amTok = () => { const s = amSession(); return s ? s.token : AM_ANON; };
const amSub = () => { const s = amSession(); return s && s.user ? s.user.id : null; };
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
  upsert: (table, rows, onConflict) => fetch(AM_BASE + '/' + table + (onConflict ? '?on_conflict=' + onConflict : ''), { method: 'POST', headers: Object.assign(amHdr(true), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
};
AM.sub = amSub;
window.AM = AM;

const AM_FUNDS = [
  { id: 'asset_mgmt', label: 'LBC Asset Management', short: 'Asset Mgmt' },
  { id: 'quant_fund', label: 'LBC Quant Fund',       short: 'Quant Fund' },
];
const AM_ALL = { id: 'all', label: 'All Funds (combined)', short: 'All Funds' };
window.AM.FUNDS = AM_FUNDS;
const amFundLabel = (id) => id === 'all' ? AM_ALL.label : (AM_FUNDS.find((f) => f.id === id) || { label: id }).label;

// ---- formatting + FX --------------------------------------------------
const amN = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const amSym = (ccy) => ccy === 'IDR' ? 'Rp' : ccy === 'USD' ? '$' : '';
const amMoneyCcy = (v, ccy) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const d = ccy === 'IDR' ? 0 : (Math.abs(v) >= 1000 ? 0 : 2);
  const s = amSym(ccy);
  return s + amN(v, d) + (s ? '' : ' ' + (ccy || ''));
};
const amPct = (v) => (v === null || v === undefined || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + amN(v, 2) + '%';
const amColor = (v) => (v > 0 ? 'var(--pos,#19C37D)' : v < 0 ? 'var(--neg,#FF5C70)' : 'var(--text-tertiary,#8E9AB0)');
window.AM.fmt = { n: amN, money: amMoneyCcy, pct: amPct, color: amColor };

// fx: { USD:1, IDR:<idr per usd>, ... } (ccy-per-USD, USD-pivot).
const fxToUsd = (fx, amt, ccy) => {
  if (amt === null || amt === undefined || isNaN(amt)) return NaN;
  if (ccy === 'USD' || !ccy) return Number(amt);
  const r = fx && fx[ccy];
  return r ? Number(amt) / r : NaN;
};
const fxConv = (fx, amt, from, to) => {
  const usd = fxToUsd(fx, amt, from);
  if (isNaN(usd)) return NaN;
  if (to === 'USD' || !to) return usd;
  const r = fx && fx[to];
  return r ? usd * r : NaN;
};
// currency context passed to views: convert + format in the display ccy.
const makeCx = (fx, disp) => ({
  fx, disp,
  conv: (amt, from) => fxConv(fx, amt, from || disp, disp),
  money: (amt, from) => amMoneyCcy(fxConv(fx, amt, from || disp, disp), disp),   // amt is in `from` ccy
  moneyDisp: (v) => amMoneyCcy(v, disp),                                          // v already in display ccy
});
window.AM.fx = { toUsd: fxToUsd, conv: fxConv, makeCx };

// restriction lookup: active restriction matching symbol (+ fund or all-funds)
const amRestrictionFor = (restrictions, symbol, fund) => {
  if (!symbol) return null;
  const s = symbol.toUpperCase();
  return (restrictions || []).find((r) => r.active && (r.symbol || '').toUpperCase() === s && (!r.fund_id || r.fund_id === fund)) || null;
};
window.AM.restrictionFor = amRestrictionFor;

// position enrichment (native + display)
const amEnrich = (p, qmap, cx) => {
  const q = qmap[(p.symbol || '').toUpperCase()];
  const last = q ? q.last : null;
  const sign = p.direction === 'short' ? -1 : 1;
  const mvNative = (last != null ? last : p.avg_cost) * p.quantity;
  const pnlNative = last != null ? (last - p.avg_cost) * p.quantity * sign : null;
  const pnlPct = (last != null && p.avg_cost) ? (last / p.avg_cost - 1) * 100 * sign : null;
  return {
    last, mvNative, pnlNative, pnlPct,
    mvDisp: cx.conv(mvNative, p.currency),
    pnlDisp: pnlNative != null ? cx.conv(pnlNative, p.currency) : null,
  };
};
window.AM.enrich = amEnrich;

// realized P&L from the trade journal (avg-cost method, per symbol),
// returned in the display ccy via cx. Used by Cockpit + Journal.
const amRealized = (trades, cx) => {
  const ordered = [...(trades || [])].sort((a, b) => (a.occurred_at || '').localeCompare(b.occurred_at || ''));
  const byS = {}; let total = 0;
  ordered.forEach((t) => {
    const k = (t.symbol || '').toUpperCase();
    const st = byS[k] = byS[k] || { qty: 0, cost: 0 };
    const qty = Number(t.quantity) || 0, price = Number(t.price) || 0, fees = Number(t.fees) || 0;
    if (t.side === 'buy') { st.qty += qty; st.cost += qty * price + fees; }
    else {
      const avg = st.qty > 0 ? st.cost / st.qty : price;
      const realized = (price - avg) * qty - fees;
      total += cx.conv(realized, t.currency) || 0;
      st.cost = Math.max(0, st.cost - avg * qty); st.qty = Math.max(0, st.qty - qty);
    }
  });
  return total;
};
window.AM.realized = amRealized;

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

// platform options for selects
const amPlatformOpts = (platforms) => [{ value: '', label: '— platform —' }].concat((platforms || []).map((p) => ({ value: p.id, label: p.label })));
const amPlatformLabel = (platforms, id) => { const p = (platforms || []).find((x) => x.id === id); return p ? p.label : (id || '—'); };
window.AM.platformLabel = amPlatformLabel;

// ================================================================
// Position editor — entry/sizing/stop/target + sizing-plan tranches +
// risk-budget calculator. Tranches persist to position_tranches.
// ================================================================
const AmPositionEditor = ({ fund, platforms, initial, navDisp, cx, tranches, onCancel, onSaved }) => {
  const ed = initial || {};
  const [v, setV] = React.useState({
    symbol: ed.symbol || '', exchange: ed.exchange || '', name: ed.name || '',
    asset_class: ed.asset_class || 'equity', currency: ed.currency || 'USD', platform: ed.platform || '',
    direction: ed.direction || 'long', quantity: ed.quantity ?? '', avg_cost: ed.avg_cost ?? '',
    target_size: ed.target_size ?? '', stop: ed.stop ?? '', target: ed.target ?? '',
    conviction: ed.conviction ?? '', risk_budget_pct: ed.risk_budget_pct ?? '', note: ed.note || '',
  });
  const [tr, setTr] = React.useState(() => (tranches || []).map((t) => ({ id: t.id, level_price: t.level_price ?? '', size: t.size ?? '', status: t.status || 'planned' })));
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const set = (k, val) => setV((p) => Object.assign({}, p, { [k]: val }));

  const num = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
  const entry = num(v.avg_cost), stop = num(v.stop), qty = num(v.quantity), pct = num(v.risk_budget_pct);
  // risk readout (native ccy) + as % of NAV (display ccy)
  const riskPerUnit = (entry != null && stop != null) ? Math.abs(entry - stop) : null;
  const riskNative = (riskPerUnit != null && qty != null) ? riskPerUnit * qty : null;
  const riskDisp = riskNative != null ? cx.conv(riskNative, v.currency) : null;
  const riskPctNav = (riskDisp != null && navDisp) ? (riskDisp / navDisp) * 100 : null;
  // suggested size from risk budget: (NAV in pos ccy * pct%) / riskPerUnit
  const navInCcy = navDisp ? fxConv(cx.fx, navDisp, cx.disp, v.currency) : null;
  const suggestedQty = (pct != null && riskPerUnit && navInCcy && !isNaN(navInCcy)) ? (navInCcy * pct / 100) / riskPerUnit : null;

  const addTr = () => setTr((p) => p.concat([{ level_price: '', size: '', status: 'planned' }]));
  const setTrRow = (i, k, val) => setTr((p) => p.map((row, j) => j === i ? Object.assign({}, row, { [k]: val }) : row));
  const rmTr = (i) => setTr((p) => p.filter((_, j) => j !== i));

  const save = () => {
    if (!v.symbol || qty == null || entry == null) { setErr('Symbol, quantity and avg cost are required.'); return; }
    setErr(''); setBusy(true);
    const row = {
      fund_id: fund === 'all' ? 'asset_mgmt' : fund, symbol: v.symbol.toUpperCase(), exchange: v.exchange || null, name: v.name || null,
      asset_class: v.asset_class, currency: v.currency, platform: v.platform || null, direction: v.direction,
      quantity: qty, avg_cost: entry, target_size: num(v.target_size), stop: num(v.stop), target: num(v.target),
      conviction: num(v.conviction), risk_budget_pct: num(v.risk_budget_pct), note: v.note || null, updated_at: new Date().toISOString(),
    };
    const p = (ed && ed.id)
      ? AM.update('positions', 'id=eq.' + ed.id, row).then(() => ed.id)
      : AM.insert('positions', Object.assign({ status: 'open', created_by: AM.sub() }, row)).then((r) => (r && r[0] ? r[0].id : null));
    p.then((pid) => {
      if (!pid) return;
      const valid = tr.filter((t) => t.level_price !== '' || t.size !== '');
      const syncTr = AM.del('position_tranches', 'position_id=eq.' + pid)
        .then(() => valid.length ? AM.insert('position_tranches', valid.map((t, i) => ({ position_id: pid, level_price: num(t.level_price), size: num(t.size), status: t.status, sort: i }))) : true);
      return syncTr;
    }).then(() => { setBusy(false); onSaved(); }).catch((e) => { setBusy(false); setErr('Save failed (' + e + ')'); });
  };

  const F = (label, k, type, opts) => (
    <label className="am-field"><span className="am-field-lbl">{label}</span>
      {type === 'select'
        ? <select value={v[k]} onChange={(e) => set(k, e.target.value)}>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <input type={type || 'text'} step="any" value={v[k]} onChange={(e) => set(k, e.target.value)} />}
    </label>
  );

  return (
    <div>
      <div className="am-form-grid">
        {F('Symbol *', 'symbol')}
        {F('Exchange', 'exchange')}
        <label className="am-field am-field-full"><span className="am-field-lbl">Name</span><input value={v.name} onChange={(e) => set('name', e.target.value)} /></label>
        {F('Asset class', 'asset_class', 'select', [{ value: 'equity', label: 'Equity' }, { value: 'etf', label: 'ETF' }, { value: 'crypto', label: 'Crypto' }, { value: 'fx', label: 'FX' }])}
        {F('Currency', 'currency', 'select', [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }])}
        {F('Platform', 'platform', 'select', amPlatformOpts(platforms))}
        {F('Direction', 'direction', 'select', [{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }])}
        {F('Quantity *', 'quantity', 'number')}
        {F('Avg cost (native) *', 'avg_cost', 'number')}
        {F('Target size (qty)', 'target_size', 'number')}
        {F('Stop', 'stop', 'number')}
        {F('Target', 'target', 'number')}
        {F('Conviction (1-5)', 'conviction', 'number')}
        {F('Risk budget (% NAV)', 'risk_budget_pct', 'number')}
        <label className="am-field am-field-full"><span className="am-field-lbl">Note / thesis</span><textarea rows={2} value={v.note} onChange={(e) => set('note', e.target.value)} /></label>
      </div>

      <div className="am-risk">
        <span>Risk: <b style={{ color: amColor(riskPctNav ? -1 : 0) }}>{riskDisp != null ? cx.moneyDisp(riskDisp) : '—'}</b>{riskPctNav != null ? <span className="am-risk-pct"> · {amN(riskPctNav, 2)}% of NAV</span> : ''}</span>
        {suggestedQty != null && <span className="am-risk-sugg">→ risk-budget size: <b>{amN(suggestedQty, 0)}</b> units</span>}
      </div>

      <div className="am-tranches">
        <div className="am-tranches-h"><span>Sizing plan · scale-in tranches</span><button className="am-btn sm" onClick={addTr}>+ tranche</button></div>
        {tr.length === 0 && <div className="am-empty sm">No planned tranches. Add levels to plan your scale-in.</div>}
        {tr.map((t, i) => (
          <div key={i} className="am-tranche-row">
            <input type="number" step="any" placeholder="level price" value={t.level_price} onChange={(e) => setTrRow(i, 'level_price', e.target.value)} />
            <input type="number" step="any" placeholder="size (qty)" value={t.size} onChange={(e) => setTrRow(i, 'size', e.target.value)} />
            <select value={t.status} onChange={(e) => setTrRow(i, 'status', e.target.value)}><option value="planned">planned</option><option value="filled">filled</option></select>
            <button className="am-mini-x" title="Remove" onClick={() => rmTr(i)}>×</button>
          </div>
        ))}
      </div>

      {err && <div className="am-form-err">{err}</div>}
      <div className="am-form-foot">
        <button className="am-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="am-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (ed.id ? 'Save position' : 'Add position')}</button>
      </div>
    </div>
  );
};
window.AmPositionEditor = AmPositionEditor;

// ================================================================
// Positions
// ================================================================
const AmPositions = ({ fund, rows, quotes, platforms, restrictions, tranchesByPos, navDisp, cx, loading, onChange, onName }) => {
  const [edit, setEdit] = React.useState(null);
  const [mark, setMark] = React.useState(null);
  const qmap = quotes || {};
  const totalMv = rows.reduce((s, p) => s + (amEnrich(p, qmap, cx).mvDisp || 0), 0) || 1;

  const close = (p) => { if (!confirm('Close ' + p.symbol + '? (kept in history)')) return; AM.update('positions', 'id=eq.' + p.id, { status: 'closed', updated_at: new Date().toISOString() }).then(onChange); };
  const remove = (p) => { if (!confirm('Delete ' + p.symbol + ' permanently?')) return; AM.del('positions', 'id=eq.' + p.id).then(onChange); };
  const saveMark = (vals) => AM.upsert('quotes', [{ symbol: mark.symbol.toUpperCase(), exchange: mark.exchange || '', last: Number(vals.last), currency: mark.currency, as_of: new Date().toISOString().slice(0, 10) }], 'symbol,exchange,as_of').then(() => { setMark(null); onChange(); });

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
              <th>Symbol</th><th>Platform</th><th className="r">Qty</th><th className="r">Avg cost</th><th className="r">Last</th>
              <th className="r">Mkt value</th><th className="r">P&amp;L</th><th className="r">P&amp;L %</th><th className="r">Weight</th>
              <th className="r">Stop / Target</th><th className="c">Conv</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => {
                const e = amEnrich(p, qmap, cx);
                const restr = amRestrictionFor(restrictions, p.symbol, p.fund_id);
                const tr = (tranchesByPos && tranchesByPos[p.id]) || [];
                const filled = tr.filter((t) => t.status === 'filled').length;
                return (
                  <tr key={p.id}>
                    <td className="am-sym am-sym-click" onClick={() => onName && onName(p.symbol, p.fund_id)} title="Open name hub">
                      {p.symbol}{p.direction === 'short' && <span className="am-short">SHORT</span>}{restr && <span className="am-restr-dot" title={'Restricted: ' + (restr.reason || '')}>⛔</span>}
                      <div className="am-exch">{p.exchange || p.asset_class}{p.target_size ? ' · tgt ' + amN(p.target_size, 0) : ''}{tr.length ? ` · ${filled}/${tr.length} tranches` : ''}</div>
                    </td>
                    <td>{p.platform ? <span className="am-plat">{amPlatformLabel(platforms, p.platform)}</span> : '—'}</td>
                    <td className="r">{amN(p.quantity, 0)}</td>
                    <td className="r">{amN(p.avg_cost, 2)} <span className="am-ccy-mini">{p.currency}</span></td>
                    <td className="r">{e.last != null ? amN(e.last, 2) : <span className="am-pending" title="No mark yet — daily marks pending or mark manually">· · ·</span>}</td>
                    <td className="r">{cx.moneyDisp(e.mvDisp)}</td>
                    <td className="r" style={{ color: amColor(e.pnlDisp) }}>{e.pnlDisp != null ? cx.moneyDisp(e.pnlDisp) : '—'}</td>
                    <td className="r" style={{ color: amColor(e.pnlPct) }}>{e.pnlPct != null ? amPct(e.pnlPct) : '—'}</td>
                    <td className="r">{amN((e.mvDisp / totalMv) * 100, 1)}%</td>
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
      {edit && (() => {
        const restr = edit.symbol ? amRestrictionFor(restrictions, edit.symbol, edit.fund_id || fund) : null;
        return (
          <AmModal title={edit.id ? 'Edit position' : 'Add position'} sub={amFundLabel(fund)} onClose={() => setEdit(null)} wide>
            {restr && <div className="am-restr-banner">⛔ <b>{(edit.symbol || '').toUpperCase()} is restricted / no-trade.</b> {restr.reason || ''} — you can still proceed.</div>}
            <AmPositionEditor fund={fund} platforms={platforms} initial={edit} navDisp={navDisp} cx={cx} tranches={(tranchesByPos && edit.id && tranchesByPos[edit.id]) || []} onCancel={() => setEdit(null)} onSaved={() => { setEdit(null); onChange(); }} />
          </AmModal>
        );
      })()}
      {mark && <AmModal title={'Mark ' + mark.symbol} sub="Set the latest price (until daily marks run)" onClose={() => setMark(null)}>
        <AmForm fields={[{ name: 'last', label: 'Last price (' + mark.currency + ')', type: 'number', required: true, step: 'any' }]} initial={{ last: (qmap[(mark.symbol || '').toUpperCase()] || {}).last || mark.avg_cost }} onCancel={() => setMark(null)} onSave={saveMark} saveLabel="Save mark" />
      </AmModal>}
    </div>
  );
};
window.AmPositions = AmPositions;

// ================================================================
// Cash & ledger (platform-aware)
// ================================================================
const AmCash = ({ fund, rows, platforms, cx, loading, onChange }) => {
  const [add, setAdd] = React.useState(false);
  const byCcy = {};
  rows.forEach((r) => { byCcy[r.currency] = (byCcy[r.currency] || 0) + Number(r.amount); });
  const fields = [
    { name: 'type', label: 'Type', type: 'select', default: 'deposit', options: [{ value: 'deposit', label: 'Deposit' }, { value: 'withdrawal', label: 'Withdrawal' }, { value: 'dividend', label: 'Dividend' }, { value: 'fee', label: 'Fee' }, { value: 'trade', label: 'Trade' }] },
    { name: 'platform', label: 'Platform', type: 'select', default: '', options: amPlatformOpts(platforms) },
    { name: 'currency', label: 'Currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }] },
    { name: 'amount', label: 'Amount (+in / −out)', type: 'number', required: true, step: 'any' },
    { name: 'occurred_on', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { name: 'note', label: 'Note', full: true },
  ];
  const save = (vals) => AM.insert('cash_ledger', { fund_id: fund === 'all' ? 'asset_mgmt' : fund, type: vals.type, platform: vals.platform || null, currency: vals.currency, amount: Number(vals.amount), occurred_on: vals.occurred_on, note: vals.note || null, created_by: AM.sub() }).then(() => { setAdd(false); onChange(); });
  const remove = (r) => { if (!confirm('Delete this ledger entry?')) return; AM.del('cash_ledger', 'id=eq.' + r.id).then(onChange); };
  return (
    <div className="am-view">
      <div className="am-view-h">
        <span>Cash &amp; ledger <span className="am-count">{rows.length}</span></span>
        <button className="am-btn" onClick={() => setAdd(true)}>+ Add entry</button>
      </div>
      <div className="am-cash-bal">
        {Object.keys(byCcy).length === 0 ? <span className="am-pending">No cash entries yet</span> : Object.entries(byCcy).map(([c, v]) => (
          <div key={c} className="am-bal"><span className="am-bal-ccy">{c}</span><span className="am-bal-amt" style={{ color: amColor(v) }}>{amMoneyCcy(v, c)}</span></div>
        ))}
      </div>
      {loading && <div className="am-empty">Loading ledger…</div>}
      {!loading && rows.length > 0 && (
        <div className="am-table-wrap">
          <table className="am-table">
            <thead><tr><th>Date</th><th>Type</th><th>Platform</th><th>Ccy</th><th className="r">Amount</th><th>Note</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="am-mono">{r.occurred_on}</td>
                <td><span className={`am-tag am-tag-${r.type}`}>{r.type}</span></td>
                <td>{r.platform ? amPlatformLabel(platforms, r.platform) : '—'}</td>
                <td>{r.currency}</td>
                <td className="r" style={{ color: amColor(Number(r.amount)) }}>{amMoneyCcy(Number(r.amount), r.currency)}</td>
                <td className="am-name">{r.note || '—'}</td>
                <td className="am-row-actions"><button title="Delete" onClick={() => remove(r)}>🗑</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {add && <AmModal title="Add cash entry" sub={amFundLabel(fund)} onClose={() => setAdd(false)}>
        <AmForm fields={fields} onCancel={() => setAdd(false)} onSave={save} saveLabel="Add entry" />
      </AmModal>}
    </div>
  );
};
window.AmCash = AmCash;

// ================================================================
// Cockpit — NAV/AUM (display ccy) · cash · available-to-deploy per
// platform · P&L (unrealized+realized) · native ccy buckets.
// ================================================================
const AmCockpit = ({ fund, positions, cash, quotes, ideas, trades, tranchesByPos, platforms, cx, onTab, onName }) => {
  const qmap = quotes || {};
  const posVal = positions.reduce((s, p) => s + (amEnrich(p, qmap, cx).mvDisp || 0), 0);
  const unrealPnl = positions.reduce((s, p) => { const e = amEnrich(p, qmap, cx); return s + (e.pnlDisp || 0); }, 0);
  const realizedPnl = amRealized(trades, cx);
  const cashTotal = cash.reduce((s, r) => s + (cx.conv(Number(r.amount), r.currency) || 0), 0);
  const invested = positions.reduce((s, p) => s + (cx.conv(p.avg_cost * p.quantity, p.currency) || 0), 0);
  const nav = posVal + cashTotal;

  // native ccy buckets (cash)
  const cashByCcy = {}; cash.forEach((r) => { cashByCcy[r.currency] = (cashByCcy[r.currency] || 0) + Number(r.amount); });
  // available-to-deploy per platform = platform cash (disp) − earmarked planned tranches (disp)
  const platCash = {}; cash.forEach((r) => { const k = r.platform || '—'; platCash[k] = (platCash[k] || 0) + (cx.conv(Number(r.amount), r.currency) || 0); });
  const earmarked = {};
  positions.forEach((p) => {
    const tr = (tranchesByPos && tranchesByPos[p.id]) || [];
    tr.filter((t) => t.status === 'planned' && t.level_price != null && t.size != null).forEach((t) => {
      const k = p.platform || '—';
      earmarked[k] = (earmarked[k] || 0) + (cx.conv(t.level_price * t.size, p.currency) || 0);
    });
  });
  const platKeys = [...new Set([...Object.keys(platCash), ...Object.keys(earmarked)])];

  const top = positions.map((p) => Object.assign({}, p, amEnrich(p, qmap, cx))).sort((a, b) => (b.mvDisp || 0) - (a.mvDisp || 0)).slice(0, 5);
  const openIdeas = (ideas || []).filter((i) => !['exited', 'archived'].includes(i.status));
  const recentTrades = (trades || []).slice(0, 6);
  const totalPnl = unrealPnl + realizedPnl;

  const Kpi = ({ label, value, color, sub }) => (
    <div className="am-kpi"><div className="am-kpi-lbl">{label}</div><div className="am-kpi-val" style={color ? { color } : null}>{value}</div>{sub && <div className="am-kpi-sub">{sub}</div>}</div>
  );
  return (
    <div className="am-view">
      <div className="am-kpi-strip">
        <Kpi label={`AUM / NAV (${cx.disp})`} value={cx.moneyDisp(nav)} sub="positions + cash" />
        <Kpi label="Positions value" value={cx.moneyDisp(posVal)} sub={positions.length + ' open'} />
        <Kpi label="Cash" value={cx.moneyDisp(cashTotal)} color={amColor(cashTotal)} />
        <Kpi label="Total P&L" value={cx.moneyDisp(totalPnl)} color={amColor(totalPnl)} sub={invested ? amPct((totalPnl / invested) * 100) : ''} />
        <Kpi label="Unreal / Real" value={cx.moneyDisp(unrealPnl)} color={amColor(unrealPnl)} sub={'real ' + cx.moneyDisp(realizedPnl)} />
        <Kpi label="Open ideas" value={openIdeas.length} sub="conviction pipeline" />
      </div>

      <div className="am-cockpit-grid">
        <div className="am-panel">
          <div className="am-panel-h">Available to deploy · by platform</div>
          {platKeys.length === 0 ? <div className="am-empty sm">No cash yet.</div> : (
            <table className="am-table am-table-mini"><tbody>{platKeys.map((k) => {
              const avail = (platCash[k] || 0) - (earmarked[k] || 0);
              return <tr key={k}><td>{k === '—' ? 'Unassigned' : amPlatformLabel(platforms, k)}</td><td className="r">{cx.moneyDisp(platCash[k] || 0)}</td><td className="r am-ear" title="earmarked for planned tranches">{earmarked[k] ? '−' + cx.moneyDisp(earmarked[k]) : ''}</td><td className="r" style={{ color: amColor(avail) }}>{cx.moneyDisp(avail)}</td></tr>;
            })}</tbody></table>
          )}
          <div className="am-buckets">{Object.keys(cashByCcy).length ? Object.entries(cashByCcy).map(([c, v]) => <span key={c} className="am-bucket"><b>{c}</b> {amMoneyCcy(v, c)}</span>) : null}</div>
        </div>

        <div className="am-panel">
          <div className="am-panel-h">Top positions <button className="am-link" onClick={() => onTab('positions')}>All →</button></div>
          {top.length === 0 ? <div className="am-empty sm">No positions yet.</div> : (
            <table className="am-table am-table-mini"><tbody>{top.map((p) => (
              <tr key={p.id}><td className="am-sym am-sym-click" onClick={() => onName && onName(p.symbol, p.fund_id)}>{p.symbol}</td><td className="am-name">{p.name || ''}</td><td className="r">{cx.moneyDisp(p.mvDisp)}</td><td className="r" style={{ color: amColor(p.pnlDisp) }}>{p.pnlDisp != null ? cx.moneyDisp(p.pnlDisp) : '—'}</td></tr>
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
const AmInvestors = () => {
  const [rows, setRows] = React.useState(null);
  React.useEffect(() => { AM.get('/investors?select=*&order=contributed_idr.desc').then(setRows).catch(() => setRows([])); }, []);
  if (rows === null) return <div className="am-empty">Loading investors…</div>;
  if (!rows.length) return <div className="am-empty">No investors recorded yet.</div>;
  const rp = (v) => 'Rp ' + Math.round(Number(v)).toLocaleString('en-US');
  const NEG = 'var(--neg, #ff5c70)', POS = 'var(--pos, #19c37d)';
  const col = (v) => ({ color: Number(v) < 0 ? NEG : POS, textAlign: 'right' });
  const totC = rows.reduce((s, r) => s + Number(r.contributed_idr), 0);
  const totN = rows.reduce((s, r) => s + Number(r.current_nav_idr), 0);
  const totPct = totC ? (totN - totC) / totC * 100 : 0;
  return (
    <div className="am-panel">
      <div className="am-panel-h">Investor AUM — per partner <span className="am-muted" style={{ fontWeight: 400 }}>pro-rata · as of {rows[0].as_of}</span></div>
      <div className="am-table-wrap">
        <table className="am-table">
          <thead><tr>
            <th>Partner</th>
            <th style={{ textAlign: 'right' }}>Total injected</th>
            <th style={{ textAlign: 'right' }}>Current AUM</th>
            <th style={{ textAlign: 'right' }}>P&amp;L</th>
            <th style={{ textAlign: 'right' }}>±%</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td style={{ textAlign: 'right' }}>{rp(r.contributed_idr)}</td>
                <td style={{ textAlign: 'right' }}>{rp(r.current_nav_idr)}</td>
                <td style={col(r.pnl_idr)}>{rp(r.pnl_idr)}</td>
                <td style={col(r.pnl_pct)}>{Number(r.pnl_pct) > 0 ? '+' : ''}{Number(r.pnl_pct).toFixed(2)}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <td>TOTAL</td>
              <td style={{ textAlign: 'right' }}>{rp(totC)}</td>
              <td style={{ textAlign: 'right' }}>{rp(totN)}</td>
              <td style={col(totN - totC)}>{rp(totN - totC)}</td>
              <td style={col(totPct)}>{totPct > 0 ? '+' : ''}{totPct.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="am-muted" style={{ marginTop: 10, fontSize: 12 }}>
        Pooled-fund, pro-rata: each partner owns their share of the AUM and bears P&amp;L by that share. Blended figure (investment + operating). True time-weighted (first-in) attribution unlocks once NAV snapshots accrue.
      </div>
    </div>
  );
};

const AM_TABS = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'investors', label: 'Investors' },
  { id: 'positions', label: 'Positions' },
  { id: 'watchlists', label: 'Watchlists' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'intel', label: 'Intel' },
  { id: 'research', label: 'Research' },
  { id: 'journal', label: 'Journal' },
  { id: 'cash', label: 'Cash' },
  { id: 'performance', label: 'Performance' },
];

const AssetMgmtBook = () => {
  const [fund, setFund] = React.useState('asset_mgmt');
  const [disp, setDisp] = React.useState('IDR');     // headline display ccy (IDR primary, USD toggle)
  const [tab, setTab] = React.useState('cockpit');
  const [tick, setTick] = React.useState(0);
  const [positions, setPositions] = React.useState([]);
  const [cash, setCash] = React.useState([]);
  const [quotes, setQuotes] = React.useState({});
  const [ideas, setIdeas] = React.useState([]);
  const [trades, setTrades] = React.useState([]);
  const [tranchesByPos, setTranchesByPos] = React.useState({});
  const [platforms, setPlatforms] = React.useState([]);
  const [restrictions, setRestrictions] = React.useState([]);
  const [fx, setFx] = React.useState({ USD: 1 });
  const [loading, setLoading] = React.useState(true);
  const [nameHub, setNameHub] = React.useState(null);   // { symbol, fund }
  const refresh = () => setTick((t) => t + 1);

  // static-ish: platforms + fx (latest per pair) once
  React.useEffect(() => {
    AM.get('/platforms?select=*&order=sort').then(setPlatforms).catch(() => {});
    AM.get('/fx_rates?select=pair,rate,as_of&order=as_of.desc&limit=200').then((rows) => {
      const m = { USD: 1 };
      (rows || []).forEach((r) => { const c = (r.pair || '').replace(/^USD/, ''); if (c && m[c] === undefined) m[c] = Number(r.rate); });
      setFx(m);
    }).catch(() => {});
  }, []);

  // fund-scoped data
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fq = fund === 'all' ? '' : `&fund_id=eq.${fund}`;
    Promise.all([
      AM.get(`/positions?select=*&status=eq.open${fq}&order=opened_at.desc`).catch(() => []),
      AM.get(`/cash_ledger?select=*${fq}&order=occurred_on.desc`).catch(() => []),
      AM.get('/quotes?select=symbol,last,currency,as_of&order=as_of.desc&limit=2000').catch(() => []),
      AM.get(`/ideas?select=*${fq}&order=updated_at.desc`).catch(() => []),
      AM.get(`/trades?select=*${fq}&order=occurred_at.desc`).catch(() => []),
      AM.get('/position_tranches?select=*&order=sort').catch(() => []),
      AM.get('/restrictions?select=*&active=eq.true').catch(() => []),
    ]).then(([pos, csh, qts, ids, trd, trn, rst]) => {
      if (cancelled) return;
      setPositions(pos || []); setCash(csh || []); setIdeas(ids || []); setTrades(trd || []); setRestrictions(rst || []);
      const qm = {}; (qts || []).forEach((q) => { const k = (q.symbol || '').toUpperCase(); if (qm[k] === undefined) qm[k] = { last: Number(q.last), ccy: q.currency || 'USD' }; });
      setQuotes(qm);
      const tb = {}; (trn || []).forEach((t) => { (tb[t.position_id] = tb[t.position_id] || []).push(t); });
      setTranchesByPos(tb);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fund, tick]);

  const cx = makeCx(fx, disp);
  // NAV (display ccy) for risk %/sizing
  const navDisp = positions.reduce((s, p) => s + (amEnrich(p, quotes, cx).mvDisp || 0), 0) + cash.reduce((s, r) => s + (cx.conv(Number(r.amount), r.currency) || 0), 0);
  const ext = window.AmExtra || {};
  const openName = (symbol, f) => setNameHub({ symbol, fund: f || (fund === 'all' ? 'asset_mgmt' : fund) });

  const body = () => {
    if (tab === 'cockpit') return <AmCockpit fund={fund} positions={positions} cash={cash} quotes={quotes} ideas={ideas} trades={trades} tranchesByPos={tranchesByPos} platforms={platforms} cx={cx} onTab={setTab} onName={openName} />;
    if (tab === 'investors') return <AmInvestors />;
    if (tab === 'positions') return <AmPositions fund={fund} rows={positions} quotes={quotes} platforms={platforms} restrictions={restrictions} tranchesByPos={tranchesByPos} navDisp={navDisp} cx={cx} loading={loading} onChange={refresh} onName={openName} />;
    if (tab === 'cash') return <AmCash fund={fund} rows={cash} platforms={platforms} cx={cx} loading={loading} onChange={refresh} />;
    if (tab === 'watchlists') return ext.Watchlists ? <ext.Watchlists fund={fund} onName={openName} /> : <div className="am-empty">Watchlists module not loaded.</div>;
    if (tab === 'ideas') return ext.Ideas ? <ext.Ideas fund={fund} rows={ideas} loading={loading} onChange={refresh} onName={openName} /> : <div className="am-empty">Ideas module not loaded.</div>;
    if (tab === 'intel') return ext.Intel ? <ext.Intel fund={fund} onName={openName} /> : <div className="am-empty">Intel module not loaded.</div>;
    if (tab === 'research') return ext.Research ? <ext.Research fund={fund} onName={openName} /> : <div className="am-empty">Research module not loaded.</div>;
    if (tab === 'journal') return ext.Journal ? <ext.Journal fund={fund} rows={trades} positions={positions} platforms={platforms} cx={cx} loading={loading} onChange={refresh} /> : <div className="am-empty">Journal module not loaded.</div>;
    if (tab === 'performance') return ext.Performance ? <ext.Performance fund={fund} positions={positions} cash={cash} quotes={quotes} cx={cx} /> : <div className="am-empty">Performance module not loaded.</div>;
    return null;
  };

  const allFunds = AM_FUNDS.concat([AM_ALL]);
  return (
    <div className="am-shell">
      <div className="am-head">
        <div className="am-head-l">
          <span className="am-head-title">The Book</span>
          <div className="am-fund-switch">
            {allFunds.map((f) => <button key={f.id} className={`am-fund ${fund === f.id ? 'active' : ''}`} onClick={() => { setFund(f.id); setTick((t) => t + 1); }}>{f.short}</button>)}
          </div>
        </div>
        <div className="am-head-r">
          <div className="am-ccy-switch" title="Headline currency">
            {['IDR', 'USD'].map((c) => <button key={c} className={`am-ccy ${disp === c ? 'active' : ''}`} onClick={() => setDisp(c)}>{c}</button>)}
          </div>
          <button className="am-btn-ghost am-reload" onClick={refresh} title="Reload">↻</button>
        </div>
      </div>
      <div className="am-tabs">
        {AM_TABS.map((t) => <button key={t.id} className={`am-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <div className="am-scroll">{body()}</div>
      {nameHub && ext.NameHub && <ext.NameHub symbol={nameHub.symbol} fund={nameHub.fund} platforms={platforms} restrictions={restrictions} cx={cx} quotes={quotes} onClose={() => setNameHub(null)} onChange={refresh} />}
    </div>
  );
};
window.AssetMgmt = AssetMgmtBook;
