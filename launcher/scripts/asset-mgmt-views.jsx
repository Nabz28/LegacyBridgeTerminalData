// ================================================================
// The Book — extra views (window.AmExtra): Watchlists · Ideas/[A1][A2] ·
// Intel log · Research queue · Journal (realized P&L) · Performance (TWR) ·
// Name hub. Uses window.AM (CRUD + fx/realized/platformLabel), AmModal, AmForm.
// ================================================================

const avN = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const avMoney = (v, ccy) => { if (v === null || v === undefined || isNaN(v)) return '—'; const d = ccy === 'IDR' ? 0 : (Math.abs(v) >= 1000 ? 0 : 2); const sym = ccy === 'IDR' ? 'Rp' : (!ccy || ccy === 'USD') ? '$' : ''; return sym + avN(v, d) + (sym ? '' : ' ' + ccy); };
const avColor = (v) => (v > 0 ? 'var(--pos,#19C37D)' : v < 0 ? 'var(--neg,#FF5C70)' : 'var(--text-tertiary,#8E9AB0)');
const avFundLabel = (id) => id === 'all' ? 'All Funds' : ((window.AM && window.AM.FUNDS) || []).reduce((m, f) => (f.id === id ? f.label : m), id);
const avFundFor = (fund) => fund === 'all' ? 'asset_mgmt' : fund;        // write target when "All"
const avFundFilter = (fund) => fund === 'all' ? '' : `&fund_id=eq.${fund}`;

// ================================================================
// Watchlists
// ================================================================
const AmWatchlists = ({ fund, onName }) => {
  const AM = window.AM;
  const [lists, setLists] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [addList, setAddList] = React.useState(false);
  const [addItem, setAddItem] = React.useState(false);

  const loadLists = () => AM.get(`/watchlists?select=*&or=(fund_id.eq.${avFundFor(fund)},fund_id.is.null)&order=created_at`).then((l) => { setLists(l); if (l.length && (!active || !l.find((x) => x.id === active))) setActive(l[0].id); if (!l.length) setActive(null); }).catch(() => setLists([]));
  const loadItems = (id) => { if (!id) { setItems([]); return; } AM.get(`/watchlist_items?select=*&watchlist_id=eq.${id}&order=created_at`).then(setItems).catch(() => setItems([])); };
  React.useEffect(() => { loadLists(); }, [fund]);
  React.useEffect(() => { loadItems(active); }, [active]);

  const createList = (v) => AM.insert('watchlists', { name: v.name, fund_id: v.shared === 'shared' ? null : avFundFor(fund) }).then((r) => { setAddList(false); loadLists(); if (r && r[0]) setActive(r[0].id); });
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
                <td className="am-sym am-sym-click" onClick={() => onName && onName(it.symbol, fund)}>{it.symbol}</td><td>{it.exchange || '—'}</td>
                <td><select className="am-inline-sel" value={it.status} onChange={(e) => setStatus(it, e.target.value)}>{ST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                <td className="am-name">{it.note || '—'}</td>
                <td className="am-row-actions"><button title="Remove" onClick={() => removeItem(it)}>🗑</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      {addList && <window.AmModal title="New watchlist" onClose={() => setAddList(false)}>
        <window.AmForm fields={[{ name: 'name', label: 'List name', required: true, placeholder: 'IDX large-caps' }, { name: 'shared', label: 'Scope', type: 'select', default: 'fund', options: [{ value: 'fund', label: avFundLabel(avFundFor(fund)) + ' only' }, { value: 'shared', label: 'Shared (both funds)' }] }]} onCancel={() => setAddList(false)} onSave={createList} saveLabel="Create" />
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
      fund_id: avFundFor(fund), symbol: head.symbol ? head.symbol.toUpperCase() : null, name: head.name || null,
      conviction: head.conviction === '' ? null : Number(head.conviction), status: head.status,
      target_price: head.target_price === '' ? null : Number(head.target_price), target_weight: head.target_weight === '' ? null : Number(head.target_weight),
      pillars: built, notes_md: head.notes_md || null, updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const p = idea && idea.id ? window.AM.update('ideas', 'id=eq.' + idea.id, row) : window.AM.insert('ideas', Object.assign({ created_by: window.AM.sub() }, row));
    p.then(() => onSave()).catch(() => setBusy(false));
  };
  const STAT = ['idea', 'researching', 'conviction', 'sized', 'entered', 'exited', 'archived'];
  return (
    <window.AmModal title={idea && idea.id ? 'Edit idea' : 'New idea'} sub={avFundLabel(avFundFor(fund))} onClose={onCancel} wide>
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

const AmIdeas = ({ fund, rows, loading, onChange, onName }) => {
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
// Intel log — per-name timestamped scuttlebutt
// ================================================================
const INTEL_TYPES = [
  { value: 'channel_check', label: 'Channel check' }, { value: 'mgmt_meeting', label: 'Mgmt meeting' },
  { value: 'insider_txn', label: 'Insider txn' }, { value: 'rumor', label: 'Rumor' },
  { value: 'filing', label: 'Filing' }, { value: 'news', label: 'News' }, { value: 'note', label: 'Note' },
];
const intelLabel = (t) => (INTEL_TYPES.find((x) => x.value === t) || { label: t }).label;

const AmIntel = ({ fund, symbol, onName, embed }) => {
  const [rows, setRows] = React.useState(null);
  const [add, setAdd] = React.useState(false);
  const load = () => {
    const sf = symbol ? `&symbol=eq.${encodeURIComponent(symbol.toUpperCase())}` : '';
    window.AM.get(`/intel_log?select=*${symbol ? sf : avFundFilter(fund)}&order=occurred_on.desc&limit=300`).then(setRows).catch(() => setRows([]));
  };
  React.useEffect(() => { load(); }, [fund, symbol]);
  const fields = [
    { name: 'symbol', label: 'Symbol', placeholder: 'BBCA', default: symbol || '' },
    { name: 'type', label: 'Type', type: 'select', default: 'channel_check', options: INTEL_TYPES.map((t) => ({ value: t.value, label: t.label })) },
    { name: 'source', label: 'Source', placeholder: 'distributor / IR / broker…' },
    { name: 'confidence', label: 'Confidence (1-5)', type: 'number', step: '1' },
    { name: 'occurred_on', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { name: 'note', label: 'What you learned', full: true, type: 'textarea', rows: 3, required: true },
  ];
  const save = (v) => window.AM.insert('intel_log', { fund_id: avFundFor(fund), symbol: v.symbol ? v.symbol.toUpperCase() : null, type: v.type, source: v.source || null, confidence: v.confidence === '' ? null : Number(v.confidence), occurred_on: v.occurred_on, note: v.note, created_by: window.AM.sub() }).then(() => { setAdd(false); load(); });
  const remove = (r) => { if (!confirm('Delete this intel entry?')) return; window.AM.del('intel_log', 'id=eq.' + r.id).then(load); };
  return (
    <div className={embed ? '' : 'am-view'}>
      {!embed && <div className="am-view-h"><span>Intel log <span className="am-count">{rows ? rows.length : 0}</span></span><button className="am-btn" onClick={() => setAdd(true)}>+ Log intel</button></div>}
      {embed && <div className="am-sub-h"><span>Intel</span><button className="am-btn sm" onClick={() => setAdd(true)}>+ log</button></div>}
      {!rows && <div className="am-empty sm">Loading…</div>}
      {rows && rows.length === 0 && <div className="am-empty sm">No intel logged{symbol ? ' for ' + symbol : ''} yet.</div>}
      <div className="am-intel-timeline">
        {(rows || []).map((r) => (
          <div key={r.id} className="am-intel-row">
            <div className="am-intel-date am-mono">{r.occurred_on}</div>
            <div className="am-intel-body">
              <div className="am-intel-top">
                {r.symbol && !symbol && <span className="am-sym am-sym-click" onClick={() => onName && onName(r.symbol, fund)}>{r.symbol}</span>}
                <span className={`am-tag am-itype am-itype-${r.type}`}>{intelLabel(r.type)}</span>
                {r.source && <span className="am-intel-src">{r.source}</span>}
                {r.confidence ? <span className="am-conf" title="confidence">{'●'.repeat(Math.min(5, r.confidence))}<span className="am-conf-off">{'●'.repeat(Math.max(0, 5 - r.confidence))}</span></span> : null}
                <button className="am-mini-x" title="Delete" onClick={() => remove(r)}>×</button>
              </div>
              <div className="am-intel-note">{r.note}</div>
            </div>
          </div>
        ))}
      </div>
      {add && <window.AmModal title="Log intel" sub={symbol || avFundLabel(avFundFor(fund))} onClose={() => setAdd(false)}>
        <window.AmForm fields={fields} onCancel={() => setAdd(false)} onSave={save} saveLabel="Log intel" />
      </window.AmModal>}
    </div>
  );
};

// ================================================================
// Research queue — categorized, promotable to the Management terminal
// ================================================================
const RR_CATS = ['idea', 'deep_dive', 'valuation', 'channel_check', 'thesis_review', 'risk', 'macro'];
const RR_COLS = [{ id: 'open', label: 'Open' }, { id: 'in_progress', label: 'In progress' }, { id: 'promoted', label: 'Promoted' }, { id: 'done', label: 'Done' }];

const AmResearch = ({ fund, symbol, onName, embed }) => {
  const [rows, setRows] = React.useState(null);
  const [add, setAdd] = React.useState(false);
  const load = () => {
    const sf = symbol ? `&symbol=eq.${encodeURIComponent(symbol.toUpperCase())}` : avFundFilter(fund);
    window.AM.get(`/research_requests?select=*${sf}&order=created_at.desc&limit=300`).then(setRows).catch(() => setRows([]));
  };
  React.useEffect(() => { load(); }, [fund, symbol]);
  const fields = [
    { name: 'title', label: 'What to research', required: true, full: true, placeholder: 'e.g. BBRI micro-loan NPL trend — dig into restructured book' },
    { name: 'symbol', label: 'Symbol', placeholder: 'BBRI', default: symbol || '' },
    { name: 'category', label: 'Category', type: 'select', default: 'idea', options: RR_CATS.map((c) => ({ value: c, label: c.replace('_', ' ') })) },
    { name: 'priority', label: 'Priority', type: 'select', default: 'normal', options: [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }] },
    { name: 'detail', label: 'Detail', full: true, type: 'textarea', rows: 3 },
  ];
  const save = (v) => window.AM.insert('research_requests', { fund_id: avFundFor(fund), title: v.title, symbol: v.symbol ? v.symbol.toUpperCase() : null, category: v.category, priority: v.priority, status: 'open', detail: v.detail || null, created_by: window.AM.sub() }).then(() => { setAdd(false); load(); });
  const setStatus = (r, status) => window.AM.update('research_requests', 'id=eq.' + r.id, { status, updated_at: new Date().toISOString() }).then(load);
  const promote = (r) => {
    const pid = prompt('Promote to a Management research project. Optional Management project id to link (leave blank to just mark promoted):', r.management_project_id || '');
    if (pid === null) return;
    window.AM.update('research_requests', 'id=eq.' + r.id, { status: 'promoted', management_project_id: pid || null, updated_at: new Date().toISOString() }).then(load);
  };
  const remove = (r) => { if (!confirm('Delete this request?')) return; window.AM.del('research_requests', 'id=eq.' + r.id).then(load); };

  const Card = ({ r }) => (
    <div className={`am-rr-card am-rr-${r.priority}`}>
      <div className="am-rr-top">
        {r.symbol && <span className="am-sym am-sym-click" onClick={() => onName && onName(r.symbol, fund)}>{r.symbol}</span>}
        <span className={`am-tag am-rr-cat`}>{(r.category || '').replace('_', ' ')}</span>
        {r.priority === 'high' && <span className="am-rr-prio">▲ high</span>}
        <button className="am-mini-x" title="Delete" onClick={() => remove(r)}>×</button>
      </div>
      <div className="am-rr-title">{r.title}</div>
      {r.detail && <div className="am-rr-detail">{r.detail}</div>}
      {r.management_project_id && <div className="am-rr-link">→ {r.management_project_id}</div>}
      <div className="am-rr-actions">
        <select className="am-inline-sel" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>{['open', 'in_progress', 'promoted', 'done', 'dropped'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
        {r.status !== 'promoted' && <button className="am-btn-ghost sm" onClick={() => promote(r)}>Promote →</button>}
      </div>
    </div>
  );

  return (
    <div className={embed ? '' : 'am-view'}>
      {!embed && <div className="am-view-h"><span>Research queue <span className="am-count">{rows ? rows.length : 0}</span></span><button className="am-btn" onClick={() => setAdd(true)}>+ Request</button></div>}
      {embed && <div className="am-sub-h"><span>Research</span><button className="am-btn sm" onClick={() => setAdd(true)}>+ request</button></div>}
      {!rows && <div className="am-empty sm">Loading…</div>}
      {rows && rows.length === 0 && <div className="am-empty sm">No research requests{symbol ? ' for ' + symbol : ''} yet.</div>}
      {rows && rows.length > 0 && (embed
        ? <div className="am-rr-list">{rows.map((r) => <Card key={r.id} r={r} />)}</div>
        : <div className="am-rr-board">{RR_COLS.map((col) => {
            const items = rows.filter((r) => r.status === col.id || (col.id === 'done' && r.status === 'dropped'));
            return <div key={col.id} className="am-rr-col"><div className="am-rr-col-h">{col.label} <span className="am-count">{items.length}</span></div>{items.map((r) => <Card key={r.id} r={r} />)}</div>;
          })}</div>
      )}
      {add && <window.AmModal title="New research request" sub={symbol || avFundLabel(avFundFor(fund))} onClose={() => setAdd(false)} wide>
        <window.AmForm fields={fields} onCancel={() => setAdd(false)} onSave={save} saveLabel="Add request" />
      </window.AmModal>}
    </div>
  );
};

// ================================================================
// Trade journal — fills + avg-cost realized P&L
// ================================================================
const AmJournal = ({ fund, rows, platforms, cx, loading, onChange }) => {
  const [add, setAdd] = React.useState(false);
  const realized = cx ? window.AM.realized(rows, cx) : 0;
  const fields = [
    { name: 'symbol', label: 'Symbol', required: true, placeholder: 'BBCA' },
    { name: 'exchange', label: 'Exchange', placeholder: 'IDX' },
    { name: 'side', label: 'Side', type: 'select', default: 'buy', options: [{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }] },
    { name: 'platform', label: 'Platform', type: 'select', default: '', options: [{ value: '', label: '— platform —' }].concat((platforms || []).map((p) => ({ value: p.id, label: p.label }))) },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: 'any' },
    { name: 'price', label: 'Price', type: 'number', required: true, step: 'any' },
    { name: 'fees', label: 'Fees', type: 'number', step: 'any', default: 0 },
    { name: 'currency', label: 'Currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'IDR', label: 'IDR' }, { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' }] },
    { name: 'occurred_at', label: 'Date', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { name: 'rationale', label: 'Rationale', full: true, type: 'textarea', rows: 2 },
  ];
  const save = (v) => window.AM.insert('trades', { fund_id: avFundFor(fund), symbol: v.symbol.toUpperCase(), exchange: v.exchange || null, side: v.side, platform: v.platform || null, quantity: Number(v.quantity), price: Number(v.price), fees: v.fees === '' ? 0 : Number(v.fees), currency: v.currency, occurred_at: v.occurred_at, rationale: v.rationale || null, created_by: window.AM.sub() }).then(() => { setAdd(false); onChange(); });
  const remove = (t) => { if (!confirm('Delete this trade?')) return; window.AM.del('trades', 'id=eq.' + t.id).then(onChange); };
  return (
    <div className="am-view">
      <div className="am-view-h">
        <span>Trade journal <span className="am-count">{rows.length}</span>{cx ? <span className="am-realized" style={{ color: avColor(realized) }}> · realized {cx.moneyDisp(realized)}</span> : null}</span>
        <button className="am-btn" onClick={() => setAdd(true)}>+ Log trade</button>
      </div>
      {loading && <div className="am-empty">Loading journal…</div>}
      {!loading && rows.length === 0 && <div className="am-empty">No trades logged yet.</div>}
      {!loading && rows.length > 0 && (
        <div className="am-table-wrap"><table className="am-table">
          <thead><tr><th>Date</th><th>Side</th><th>Symbol</th><th>Platform</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Value</th><th className="r">Fees</th><th>Rationale</th><th></th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td className="am-mono">{(t.occurred_at || '').slice(0, 10)}</td>
              <td><span className={`am-tag am-tag-${t.side}`}>{t.side}</span></td>
              <td className="am-sym">{t.symbol}</td>
              <td>{t.platform ? window.AM.platformLabel(platforms, t.platform) : '—'}</td>
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
      {add && <window.AmModal title="Log trade" sub={avFundLabel(avFundFor(fund))} onClose={() => setAdd(false)} wide>
        <window.AmForm fields={fields} onCancel={() => setAdd(false)} onSave={save} saveLabel="Log trade" />
      </window.AmModal>}
    </div>
  );
};

// ================================================================
// Performance — NAV snapshots (stored USD) + TWR, shown in display ccy
// ================================================================
const AmPerformance = ({ fund, positions, cash, quotes, cx }) => {
  const [snaps, setSnaps] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const fx = cx.fx;
  const usd = (amt, ccy) => window.AM.fx.conv(fx, amt, ccy, 'USD');
  const load = () => {
    const sf = fund === 'all' ? '' : `&fund_id=eq.${fund}`;
    window.AM.get(`/nav_snapshots?select=*${sf}&order=as_of.asc`).then(setSnaps).catch(() => setSnaps([]));
  };
  React.useEffect(() => { load(); }, [fund]);

  const qmap = quotes || {};
  const posValUsd = positions.reduce((s, p) => { const q = qmap[(p.symbol || '').toUpperCase()]; const last = q ? q.last : p.avg_cost; const v = usd(last * p.quantity, p.currency); return s + (isNaN(v) ? 0 : v); }, 0);
  const cashUsd = cash.reduce((s, r) => { const v = usd(Number(r.amount), r.currency); return s + (isNaN(v) ? 0 : v); }, 0);
  const navUsd = posValUsd + cashUsd;
  const disp = (vUsd) => cx.moneyDisp(window.AM.fx.conv(fx, vUsd, 'USD', cx.disp));

  // collapse to one snapshot per as_of for 'all' (sum funds)
  const byDate = {}; (snaps || []).forEach((s) => { byDate[s.as_of] = (byDate[s.as_of] || 0) + Number(s.nav || 0); });
  const series = Object.keys(byDate).sort().map((d) => ({ as_of: d, nav: byDate[d] }));
  const first = series[0] || null, last = series[series.length - 1] || null;
  const twr = first && last && first.nav ? (last.nav / first.nav - 1) * 100 : null;

  const snapNow = () => {
    setBusy(true);
    const target = fund === 'all' ? 'asset_mgmt' : fund;
    window.AM.upsert('nav_snapshots', [{ fund_id: target, as_of: new Date().toISOString().slice(0, 10), nav: Number(navUsd.toFixed(2)), cash: Number(cashUsd.toFixed(2)), positions_value: Number(posValUsd.toFixed(2)) }], 'fund_id,as_of').then(() => { setBusy(false); load(); }).catch(() => setBusy(false));
  };

  const Spark = () => {
    if (series.length < 2) return null;
    const vs = series.map((s) => s.nav); const mn = Math.min(...vs), mx = Math.max(...vs), rng = (mx - mn) || 1, W = 600, H = 120;
    const pts = series.map((s, i) => [(i / (series.length - 1)) * W, H - ((s.nav - mn) / rng) * (H - 12) - 6]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="am-perf-spark"><path d={line + ` L ${W} ${H} L 0 ${H} Z`} fill="var(--brand,#97AAC5)" fillOpacity="0.10" /><path d={line} fill="none" stroke="var(--brand,#97AAC5)" strokeWidth="1.6" /></svg>;
  };

  return (
    <div className="am-view">
      <div className="am-view-h"><span>Performance</span><button className="am-btn" disabled={busy} onClick={snapNow}>{busy ? 'Saving…' : '◷ Snapshot NAV now'}</button></div>
      <div className="am-kpi-strip">
        <div className="am-kpi"><div className="am-kpi-lbl">NAV (now, est.)</div><div className="am-kpi-val">{disp(navUsd)}</div><div className="am-kpi-sub">positions + cash</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">Positions value</div><div className="am-kpi-val">{disp(posValUsd)}</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">Cash</div><div className="am-kpi-val" style={{ color: avColor(cashUsd) }}>{disp(cashUsd)}</div></div>
        <div className="am-kpi"><div className="am-kpi-lbl">TWR (since 1st snap)</div><div className="am-kpi-val" style={{ color: avColor(twr) }}>{twr != null ? (twr > 0 ? '+' : '') + avN(twr, 2) + '%' : '—'}</div><div className="am-kpi-sub">{series.length ? series.length + ' snapshots' : 'none yet'}</div></div>
      </div>
      <div className="am-panel">
        <div className="am-panel-h">NAV history <span className="am-kpi-sub">time-weighted · deposits/withdrawals don't distort</span></div>
        {!snaps && <div className="am-empty sm">Loading…</div>}
        {snaps && series.length < 2 ? (
          <div className="am-empty">NAV history builds once the daily marks cron runs (or hit “Snapshot NAV now”). Time-weighted return appears with ≥2 points.</div>
        ) : series.length >= 2 ? <><Spark /><div className="am-perf-range"><span>{first.as_of} · {disp(first.nav)}</span><span>{last.as_of} · {disp(last.nav)}</span></div></> : null}
      </div>
    </div>
  );
};

// ================================================================
// Name hub — everything about one ticker (position · memo · intel ·
// trades · research · mark · restricted flag)
// ================================================================
const AmNameHub = ({ symbol, fund, platforms, restrictions, cx, quotes, onClose, onChange }) => {
  const sym = (symbol || '').toUpperCase();
  const [data, setData] = React.useState(null);
  const load = () => {
    Promise.all([
      window.AM.get(`/positions?select=*&symbol=eq.${encodeURIComponent(sym)}&order=opened_at.desc`).catch(() => []),
      window.AM.get(`/ideas?select=*&symbol=eq.${encodeURIComponent(sym)}&order=updated_at.desc`).catch(() => []),
      window.AM.get(`/trades?select=*&symbol=eq.${encodeURIComponent(sym)}&order=occurred_at.desc&limit=20`).catch(() => []),
      window.AM.get(`/restrictions?select=*&symbol=eq.${encodeURIComponent(sym)}`).catch(() => []),
    ]).then(([pos, ideas, trades, restr]) => setData({ pos, ideas, trades, restr }));
  };
  React.useEffect(() => { load(); }, [sym]);

  const q = (quotes || {})[sym];
  const restr = data && (data.restr || []).find((r) => r.active && (!r.fund_id || r.fund_id === fund));
  const toggleRestrict = () => {
    if (restr) { window.AM.update('restrictions', 'id=eq.' + restr.id, { active: false }).then(load); }
    else {
      const reason = prompt('Restrict ' + sym + ' (no-trade). Reason / note:', '');
      if (reason === null) return;
      window.AM.insert('restrictions', { symbol: sym, fund_id: fund, reason: reason || null, active: true, set_by: window.AM.sub() }).then(load);
    }
  };

  return (
    <div className="am-modal-bg" onClick={onClose}>
      <div className="am-modal am-modal-wide am-namehub" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal-h">
          <div>
            <div className="am-modal-title">{sym} {q ? <span className="am-nh-last">{avN(q.last, 2)} {q.ccy}</span> : <span className="am-pending">no mark</span>}</div>
            <div className="am-modal-sub">Name hub · {avFundLabel(fund)}{restr ? ' · ⛔ RESTRICTED' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={`am-btn-ghost sm ${restr ? 'am-restr-on' : ''}`} onClick={toggleRestrict}>{restr ? 'Lift restriction' : 'Restrict ⛔'}</button>
            <button className="am-x" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="am-modal-body am-nh-body">
          {!data && <div className="am-empty">Loading…</div>}
          {data && (
            <div className="am-nh-grid">
              <div className="am-nh-col">
                <div className="am-sub-h"><span>Positions</span></div>
                {data.pos.length === 0 ? <div className="am-empty sm">No position.</div> : data.pos.map((p) => {
                  const e = window.AM.enrich(p, quotes || {}, cx);
                  return <div key={p.id} className="am-nh-pos">
                    <div><b>{avN(p.quantity, 0)}</b> @ {avN(p.avg_cost, 2)} {p.currency} <span className={`am-tag am-tag-${p.status}`}>{p.status}</span>{p.platform && <span className="am-plat">{window.AM.platformLabel(platforms, p.platform)}</span>}</div>
                    <div className="am-nh-pos-pnl">MV {cx.moneyDisp(e.mvDisp)} · P&L <span style={{ color: avColor(e.pnlDisp) }}>{e.pnlDisp != null ? cx.moneyDisp(e.pnlDisp) : '—'}</span></div>
                    {p.note && <div className="am-nh-note">{p.note}</div>}
                  </div>;
                })}
                <div className="am-sub-h" style={{ marginTop: 14 }}><span>Conviction memos</span></div>
                {data.ideas.length === 0 ? <div className="am-empty sm">No memo.</div> : data.ideas.map((i) => (
                  <div key={i.id} className="am-nh-idea">
                    <div><span className={`am-tag am-tag-${i.status}`}>{i.status}</span>{i.conviction ? <span className="am-conv">{'★'.repeat(Math.min(5, i.conviction))}</span> : null}</div>
                    {(i.pillars || []).filter((p) => p.a1).map((p, n) => <div key={n} className="am-idea-pill"><span className={`am-pdot ${p.side}`}></span><span className="am-ppage">{p.page}</span>{p.a1}</div>)}
                  </div>
                ))}
                <div className="am-sub-h" style={{ marginTop: 14 }}><span>Recent trades</span></div>
                {data.trades.length === 0 ? <div className="am-empty sm">No trades.</div> : (
                  <table className="am-table am-table-mini"><tbody>{data.trades.map((t) => (
                    <tr key={t.id}><td className="am-mono">{(t.occurred_at || '').slice(0, 10)}</td><td><span className={`am-tag am-tag-${t.side}`}>{t.side}</span></td><td className="r">{avN(t.quantity, 0)} @ {avN(t.price, 2)}</td></tr>
                  ))}</tbody></table>
                )}
              </div>
              <div className="am-nh-col">
                <AmIntel fund={fund} symbol={sym} embed onName={() => {}} />
                <div style={{ marginTop: 14 }}><AmResearch fund={fund} symbol={sym} embed onName={() => {}} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.AmExtra = {
  Watchlists: AmWatchlists, Ideas: AmIdeas, Intel: AmIntel, Research: AmResearch,
  Journal: AmJournal, Performance: AmPerformance, NameHub: AmNameHub,
};
