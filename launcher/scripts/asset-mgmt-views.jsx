// ================================================================
// The Book — extra views: Watchlists · Ideas/[A1][A2] memos · Journal ·
// Performance. Exposed as window.AmExtra; the root (asset-mgmt.jsx) renders
// these per tab. Uses window.AM (CRUD), window.AmModal, window.AmForm.
// ================================================================

// local formatters (avoid cross-script timing on window.AM.fmt)
const avN = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const avMoney = (v, ccy) => { if (v === null || v === undefined || isNaN(v)) return '—'; const d = Math.abs(v) >= 1000 ? 0 : 2; const sym = ccy === 'IDR' ? 'Rp' : (!ccy || ccy === 'USD') ? '$' : ''; return sym + avN(v, d) + (sym ? '' : ' ' + ccy); };
const avPct = (v) => (v === null || v === undefined || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + avN(v, 2) + '%';
const avColor = (v) => (v > 0 ? 'var(--pos,#19C37D)' : v < 0 ? 'var(--neg,#FF5C70)' : 'var(--text-tertiary,#8E9AB0)');
const avFundLabel = (id) => ((window.AM && window.AM.FUNDS) || []).reduce((m, f) => (f.id === id ? f.label : m), id);

// ================================================================
// Watchlists
// ================================================================
const AmWatchlists = ({ fund }) => {
  const AM = window.AM;
  const [lists, setLists] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [addList, setAddList] = React.useState(false);
  const [addItem, setAddItem] = React.useState(false);

  const loadLists = () => AM.get(`/watchlists?select=*&or=(fund_id.eq.${fund},fund_id.is.null)&order=created_at`).then((l) => { setLists(l); if (l.length && (!active || !l.find((x) => x.id === active))) setActive(l[0].id); if (!l.length) setActive(null); }).catch(() => setLists([]));
  const loadItems = (id) => { if (!id) { setItems([]); return; } AM.get(`/watchlist_items?select=*&watchlist_id=eq.${id}&order=created_at`).then(setItems).catch(() => setItems([])); };
  React.useEffect(() => { loadLists(); }, [fund]);
  React.useEffect(() => { loadItems(active); }, [active]);

  const createList = (v) => AM.insert('watchlists', { name: v.name, fund_id: v.shared === 'shared' ? null : fund }).then((r) => { setAddList(false); loadLists(); if (r && r[0]) setActive(r[0].id); });
  const createItem = (v) => AM.insert('watchlist_items', { watchlist_id: active, symbol: v.symbol.toUpperCase(), exchange: v.exchange || null, note: v.note || null, status: v.status }).then(() => { setAddItem(false); loadItems(active); });
  const setStatus = (it, status) => AM.update('watchlist_items', 'id=eq.' + it.id, { status }).then(() => loadItems(active));
  const removeItem = (it) => { if (!confirm('Remove ' + it.symbol + '?')) return; AM.del('watchlist_items', 'id=eq.' + it.id).then(() => loadItems(active)); };
  const removeList = (l) => { if (!confirm('Delete watchlist "' + l.name + '" and its items?')) return; AM.del('watchlists', 'id=eq.' + l.id).then(loadLists); };

  const ST = [{ value: 'idea', label: 'Idea' }, { value: 'researching', label: 'Researching' }, { value: 'ready', label: 'Ready' }, { value: 'passed', label: 'Passed' }];
  return (
    <div className="am-view am-watch">
      <div className="am-watch-side">
        <div className="am-view-h sm"><span>Lists</span><button className="am-btn sm" onClick={() => setAddList(true)}>+</button></div>
        {!lists && <div className="am-empty sm">Loading…</div>}
        {lists && lists.length === 0 && <div className="am-empty sm">No watchlists.</div>}
        {lists && lists.map((l) => (
          <div key={l.id} className={`am-watch-item ${active === l.id ? 'active' : ''}`} onClick={() => setActive(l.id)}>
            <span>{l.name}{l.fund_id === null && <span className="am-shared">shared</span>}</span>
            <button className="am-mini-x" title="Delete" onClick={(e) => { e.stopPropagation(); removeList(l); }}>×</button>
          </div>
        ))}
      </div>
      <div className="am-watch-main">
        <div className="am-view-h"><span>{lists && active ? (lists.find((l) => l.id === active) || {}).name : 'Watchlist'} <span className="am-count">{items.length}</span></span><button className="am-btn" disabled={!active} onClick={() => setAddItem(true)}>+ Add symbol</button></div>
        {!active ? <div className="am-empty">Create a watchlist to start.</div> : items.length === 0 ? <div className="am-empty">No symbols yet.</div> : (
          <div className="am-table-wrap"><table className="am-table">
            <thead><tr><th>Symbol</th><th>Exchange</th><th>Status</th><th>Note</th><th></th></tr></thead>
            <tbody>{items.map((it) => (
              <tr key={it.id}>
                <td className="am-sym">{it.symbol}</td><td>{it.exchange || '—'}</td>
                <td><select className="am-inline-sel" value={it.status} onChange={(e) => setStatus(it, e.target.value)}>{ST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                <td className="am-name">{it.note || '—'}</td>
                <td className="am-row-actions"><button title="Remove" onClick={() => removeItem(it)}>🗑</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      {addList && <window.AmModal title="New watchlist" onClose={() => setAddList(false)}>
        <window.AmForm fields={[{ name: 'name', label: 'List name', required: true, placeholder: 'IDX large-caps' }, { name: 'shared', label: 'Scope', type: 'select', default: 'fund', options: [{ value: 'fund', label: avFundLabel(fund) + ' only' }, { value: 'shared', label: 'Shared (both funds)' }] }]} onCancel={() => setAddList(false)} onSave={createList} saveLabel="Create" />
      </window.AmModal>}
      {addItem && <window.AmModal title="Add symbol" onClose={() => setAddItem(false)}>
        <window.AmForm fields={[{ name: 'symbol', label: 'Symbol', required: true, placeholder: 'TLKM' }, { name: 'exchange', label: 'Exchange', placeholder: 'IDX' }, { name: 'status', label: 'Status', type: 'select', default: 'idea', options: ST }, { name: 'note', label: 'Note', full: true, type: 'textarea', rows: 2 }]} onCancel={() => setAddItem(false)} onSave={createItem} saveLabel="Add" />
      </window.AmModal>}
    </div>
  );
};

// ================================================================
// Ideas / [A1]·[A2] conviction memos
// ================================================================
const AM_PAGES = [{ id: 'equity', label: 'Equity' }, { id: 'industry', label: 'Industry' }, { id: 'macro', label: 'Macro' }];
const IdeaEditor = ({ fund, idea, onCancel, onSave }) => {
  const init = idea || {};
  const [head, setHead] = React.useState({ symbol: init.symbol || '', name: init.name || '', conviction: init.conviction || '', status: init.status || 'idea', target_price: init.target_price || '', target_weight: init.target_weight || '', notes_md: init.notes_md || '' });
  const [pillars, setPillars] = React.useState(() => {
    const map = {}; (init.pillars || []).forEach((p) => { map[p.page] = p; });
    return AM_PAGES.reduce((o, pg) => { o[pg.id] = { a1: (map[pg.id] || {}).a1 || '', a2: (map[pg.id] || {}).a2 || '', side: (map[pg.id] || {}).side || 'bull' }; return o; }, {});
  });
  const [busy, setBusy] = React.useState(false);
  const setH = (k, v) => setHead((p) => Object.assign({}, p, { [k]: v }));
  const setP = (page, k, v) => setPillars((p) => Object.assign({}, p, { [page]: Object.assign({}, p[page], { [k]: v }) }));
  const save = () => {
    const built = AM_PAGES.map((pg) => Object.assign({ page: pg.id }, pillars[pg.id])).filter((p) => p.a1 || p.a2);
    const row = {
      fund_id: fund, symbol: head.symbol ? head.symbol.toUpperCase() : null, name: head.name || null,
      conviction: head.conviction === '' ? null : Number(head.conviction), status: head.status,
      target_price: head.target_price === '' ? null : Number(head.target_price), target_weight: head.target_weight === '' ? null : Number(head.target_weight),
      pillars: built, notes_md: head.notes_md || null, updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const p = idea && idea.id ? window.AM.update('ideas', 'id=eq.' + idea.id, row) : window.AM.insert('ideas', row);
    p.then(() => onSave()).catch(() => setBusy(false));
  };
  const STAT = ['idea', 'researching', 'conviction', 'sized', 'entered', 'exited', 'archived'];
  return (
    <window.AmModal title={idea && idea.id ? 'Edit idea' : 'New idea'} sub={avFundLabel(fund)} onClose={onCancel} wide>
      <div className="am-form-grid">
        <label className="am-field"><span className="am-field-lbl">Symbol</span><input value={head.symbol} placeholder="BBRI" onChange={(e) => setH('symbol', e.target.value)} /></label>
        <label className="am-field am-field-full"><span className="am-field-lbl">Name</span><input value={head.name} placeholder="Bank Rakyat Indonesia" onChange={(e) => setH('name', e.target.value)} /></label>
        <label className="am-field"><span className="am-field-lbl">Conviction (1-5)</span><input type="number" value={head.conviction} onChange={(e) => setH('conviction', e.target.value)} /></label>
        <label className="am-field"><span className="am-field-lbl">Status</span><select value={head.status} onChange={(e) => setH('status', e.target.value)}>{STAT.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="am-field"><span className="am-field-lbl">Target price</span><input type="number" value={head.target_price} onChange={(e) => setH('target_price', e.target.value)} /></label>
        <label className="am-field"><span className="am-field-lbl">Target weight %</span><input type="number" value={head.target_weight} onChange={(e) => setH('target_weight', e.target.value)} /></label>
      </div>
      <div className="am-pillars">
        <div className="am-pillars-h">Thesis pillars · [A1] one-line (grandma-readable) · [A2] the technical case · telescoping equity → industry → macro</div>
        {AM_PAGES.map((pg) => (
          <div key={pg.id} className="am-pillar">
            <div className="am-pillar-top"><span className="am-pillar-page">{pg.label}</span>
              <div className="am-side">{['bull', 'bear'].map((s) => <button key={s} className={`am-side-btn ${pillars[pg.id].side === s ? 'on ' + s : ''}`} onClick={() => setP(pg.id, 'side', s)}>{s}</button>)}</div>
            </div>
            <input className="am-a1" value={pillars[pg.id].a1} placeholder={`[A1] ${pg.label} — the one-line takeaway`} onChange={(e) => setP(pg.id, 'a1', e.target.value)} />
            <textarea className="am-a2" rows={2} value={pillars[pg.id].a2} placeholder={`[A2] ${pg.label} — the supporting technical detail`} onChange={(e) => setP(pg.id, 'a2', e.target.value)} />
          </div>
        ))}
      </div>
      <label className="am-field am-field-full"><span className="am-field-lbl">Notes / catalysts (markdown)</span><textarea rows={3} value={head.notes_md} onChange={(e) => setH('notes_md', e.target.value)} /></label>
      <div className="am-form-foot"><button className="am-btn-ghost" onClick={onCancel}>Cancel</button><button className="am-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save idea'}</button></div>
    </window.AmModal>
  );
};

const AmIdeas = ({ fund, rows, loading, onChange }) => {
  const [edit, setEdit] = React.useState(null);
  const remove = (i) => { if (!confirm('Delete idea ' + (i.symbol || '') + '?')) return; window.AM.del('ideas', 'id=eq.' + i.id).then(onChange); };
  return (
    <div className="am-view">
      <div className="am-view-h"><span>Ideas &amp; conviction memos <span className="am-count">{rows.length}</span></span><button className="am-btn" onClick={() => setEdit({})}>+ New idea</button></div>
      {loading && <div className="am-empty">Loading ideas…</div>}
      {!loading && rows.length === 0 && <div className="am-empty">No ideas yet. <button className="am-link" onClick={() => setEdit({})}>Write the first memo →</button></div>}
      <div className="am-ideas-grid">
        {rows.map((i) => (
          <div key={i.id} className="am-idea-card" onClick={() => setEdit(i)}>
            <div className="am-idea-top">
              <div><span className="am-sym">{i.symbol || '—'}</span><span className="am-idea-name">{i.name || ''}</span></div>
              <span className={`am-tag am-tag-${i.status}`}>{i.status}</span>
            </div>
            <div className="am-idea-meta">
              {i.conviction ? <span className="am-conv">{'★'.repeat(Math.min(5, i.conviction))}</span> : null}
              {i.target_price ? <span>tgt {avN(i.target_price, 2)}</span> : null}
              {i.target_weight ? <span>{avN(i.target_weight, 1)}% wt</span> : null}
            </div>
            {(i.pillars || []).length > 0 && <div className="am-idea-pillars">{(i.pillars || []).filter((p) => p.a1).slice(0, 3).map((p, n) => (
              <div key={n} className="am-idea-pill"><span className={`am-pdot ${p.side}`}></span><span className="am-ppage">{p.page}</span>{p.a1}</div>
            ))}</div>}
            <button className="am-idea-del" title="Delete" onClick={(e) => { e.stopPropagation(); remove(i); }}>🗑</button>
          </div>
        ))}
      </div>
      {edit && <IdeaEditor fund={fund} idea={edit} onCancel={() => setEdit(null)} onSave={() => { setEdit(null); onChange(); }} />}
    </div>
  );
};

// ================================================================
// Trade journal
// ================================================================
const AmJournal = ({ fund, rows, loading, onChange }) => {
  const [add, setAdd] = React.useState(false);
  const fields = [
    { name: 'symbol', label: 'Symbol', required: true, placeholder: 'BBCA' },
    { name: 'exchange', label: 'Exchange', placeholder: 'IDX' },
    { name: 'side', label: 'Side', type: 'select', default: 'buy', options: [{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }] },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: 'any' },
    { name: 'price', label: 'Price', type: 'number', required: true, step: 'any' },
    { name: 'fees', label: 'Fees', type: 'number', step: 'any', default: 0 },
    { name: 'currency', label: 'Currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }] },
    { name: 'occurred_at', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { name: 'rationale', label: 'Rationale', full: true, type: 'textarea', rows: 2 },
  ];
  const save = (v) => window.AM.insert('trades', { fund_id: fund, symbol: v.symbol.toUpperCase(), exchange: v.exchange || null, side: v.side, quantity: Number(v.quantity), price: Number(v.price), fees: v.fees === '' ? 0 : Number(v.fees), currency: v.currency, occurred_at: v.occurred_at, rationale: v.rationale || null }).then(() => { setAdd(false); onChange(); });
  const remove = (t) => { if (!confirm('Delete this trade?')) return; window.AM.del('trades', 'id=eq.' + t.id).then(onChange); };
  return (
    <div className="am-view">
      <div className="am-view-h"><span>Trade journal <span className="am-count">{rows.length}</span></span><button className="am-btn" onClick={() => setAdd(true)}>+ Log trade</button></div>
      {loading && <div className="am-empty">Loading journal…</div>}
      {!loading && rows.length === 0 && <div className="am-empty">No trades logged yet.</div>}
      {!loading && rows.length > 0 && (
        <div className="am-table-wrap"><table className="am-table">
          <thead><tr><th>Date</th><th>Side</th><th>Symbol</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Value</th><th className="r">Fees</th><th>Rationale</th><th></th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td className="am-mono">{(t.occurred_at || '').slice(0, 10)}</td>
              <td><span className={`am-tag am-tag-${t.side}`}>{t.side}</span></td>
              <td className="am-sym">{t.symbol}</td>
              <td className="r">{avN(t.quantity, 0)}</td>
              <td className="r">{avN(t.price, 2)}</td>
              <td className="r">{avMoney(t.quantity * t.price, t.currency)}</td>
              <td className="r">{avN(t.fees, 2)}</td>
              <td className="am-name">{t.rationale || '—'}</td>
              <td className="am-row-actions"><button title="Delete" onClick={() => remove(t)}>🗑</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {add && <window.AmModal title="Log trade" sub={avFundLabel(fund)} onClose={() => setAdd(false)} wide>
        <window.AmForm fields={fields} onCancel={() => setAdd(false)} onSave={save} saveLabel="Log trade" />
      </window.AmModal>}
    </div>
  );
};

// ================================================================
// Performance — NAV snapshots + current estimate
// ================================================================
const AmPerformance = ({ fund, positions, cash, quotes }) => {
  const [snaps, setSnaps] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const load = () => window.AM.get(`/nav_snapshots?select=*&fund_id=eq.${fund}&order=as_of.asc`).then(setSnaps).catch(() => setSnaps([]));
  React.useEffect(() => { load(); }, [fund]);

  const qmap = quotes || {};
  const posVal = positions.reduce((s, p) => { const last = qmap[p.symbol]; return s + (last != null ? last : p.avg_cost) * p.quantity; }, 0);
  const cashTotal = cash.reduce((s, r) => s + Number(r.amount), 0);
  const navNow = posVal + cashTotal;

  const snapNow = () => { setBusy(true); window.AM.upsert('nav_snapshots', [{ fund_id: fund, as_of: new Date().toISOString().slice(0, 10), nav: navNow, cash: cashTotal, positions_value: posVal }]).then(() => { setBusy(false); load(); }).catch(() => setBusy(false)); };

  const first = snaps && snaps.length ? snaps[0] : null;
  const last = snaps && snaps.length ? snaps[snaps.length - 1] : null;
  const twr = first && last && first.nav ? (last.nav / first.nav - 1) * 100 : null;

  // sparkline
  const Spark = () => {
    if (!snaps || snaps.length < 2) return null;
    const vs = snaps.map((s) => Number(s.nav));
    const mn = Math.min(...vs), mx = Math.max(...vs), rng = (mx - mn) || 1, W = 600, H = 120;
    const pts = snaps.map((s, i) => [(i / (snaps.length - 1)) * W, H - ((Number(s.nav) - mn) / rng) * (H - 12) - 6]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="am-perf-spark"><path d={line + ` L ${W} ${H} L 0 ${H} Z`} fill="var(--brand,#97AAC5)" fillOpacity="0.10" /><path d={line} fill="none" stroke="var(--brand,#97AAC5)" strokeWidth="1.6" /></svg>;
  };

  return (
    <div className="am-view">
      <div className="am-view-h"><span>Performance</span><button className="am-btn" disabled={busy} onClick={snapNow}>{busy ? 'Saving…' : '◷ Snapshot NAV now'}</button></div>
      <div className="am-kpi-strip">
        <div className="am-kpi"><div className="am-kpi-lbl">NAV (now, est.)</div><div className="am-kpi-val">{avMoney(navNow, 'USD')}</div><div className="am-kpi-sub">positions + cash</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">Positions value</div><div className="am-kpi-val">{avMoney(posVal, 'USD')}</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">Cash</div><div className="am-kpi-val" style={{ color: avColor(cashTotal) }}>{avMoney(cashTotal, 'USD')}</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">Return (since 1st snap)</div><div className="am-kpi-val" style={{ color: avColor(twr) }}>{twr != null ? avPct(twr) : '—'}</div><div className="am-kpi-sub">{snaps && snaps.length ? snaps.length + ' snapshots' : 'none yet'}</div></div>
      </div>
      <div className="am-panel">
        <div className="am-panel-h">NAV history</div>
        {!snaps && <div className="am-empty sm">Loading…</div>}
        {snaps && snaps.length < 2 ? (
          <div className="am-empty">NAV history builds once you snapshot daily (or the marks cron runs). Hit “Snapshot NAV now” to seed it; time-weighted return appears with ≥2 points.</div>
        ) : <><Spark /><div className="am-perf-range"><span>{first.as_of} · {avMoney(first.nav, 'USD')}</span><span>{last.as_of} · {avMoney(last.nav, 'USD')}</span></div></>}
      </div>
    </div>
  );
};

window.AmExtra = { Watchlists: AmWatchlists, Ideas: AmIdeas, Journal: AmJournal, Performance: AmPerformance };
