// ================================================================
// Network — LBC relationship map (T6), migrated native into the shell.
// Reads public.lns_* on Narin's Plus (consolidated from the old temp
// project). vis-network graph in the v5 aesthetic: LBC team hub + category
// hubs + connection nodes (sized by closeness, colored by category), with
// known_by edges when present. Section filter (Network/Clients/Talents),
// search, and a detail rail. Read-focused; editing stays in the standalone
// /network/ app for now.
// ================================================================
const NET_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const NET_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const netGet = (path) => fetch(NET_BASE + path, { headers: { apikey: NET_ANON, Authorization: 'Bearer ' + NET_ANON } }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

const NET_PALETTE = ['#6f9cf2', '#19C37D', '#F5B544', '#FF5C70', '#9d7bf0', '#3fc2cc', '#e8845c', '#62a0e8'];
const NET_SECTIONS = [{ id: 'all', label: 'All' }, { id: 'network', label: 'Network' }, { id: 'clients', label: 'Clients' }, { id: 'talents', label: 'Talents' }];

const NetworkMap = () => {
  const [data, setData] = React.useState(null);   // { cats, sectors, members, conns, secById, catById, catColor }
  const [section, setSection] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(null);      // selected node detail
  const [status, setStatus] = React.useState('loading');
  const wrapRef = React.useRef(null);
  const netRef = React.useRef(null);
  const roRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      netGet('/lns_categories?select=*').catch(() => []),
      netGet('/lns_sectors?select=*').catch(() => []),
      netGet('/lns_members?select=*').catch(() => []),
      netGet('/lns_connections?select=*').catch(() => []),
    ]).then(([cats, sectors, members, conns]) => {
      if (cancelled) return;
      const secById = {}; (sectors || []).forEach((s) => { secById[s.id] = s; });
      const catById = {}; (cats || []).forEach((c) => { catById[c.id] = c; });
      const catColor = {}; (cats || []).forEach((c, i) => { catColor[c.id] = NET_PALETTE[i % NET_PALETTE.length]; });
      setData({ cats: cats || [], sectors: sectors || [], members: members || [], conns: conns || [], secById, catById, catColor });
      if (!conns || !conns.length) setStatus('empty');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  const connCatId = (c) => { const s = data && data.secById[c.sector_id]; return s ? s.category_id : null; };

  // build the vis-network graph
  React.useEffect(() => {
    if (!data) return;
    const vis = window.vis;
    if (!vis || !wrapRef.current) { setStatus('novis'); return; }
    if (netRef.current) { netRef.current.destroy(); netRef.current = null; }

    const conns = data.conns.filter((c) => section === 'all' || c.section === section);
    const usedCats = new Set(conns.map(connCatId).filter(Boolean));
    const nodes = []; const edges = [];

    nodes.push({ id: '__lbc', label: 'LBC', shape: 'dot', size: 26, color: { background: '#E8E4D9', border: '#fff' }, font: { color: '#fff', size: 15, face: 'Geist, Inter, sans-serif' }, fixed: false });

    // category hubs (only those with connections in the current section)
    [...usedCats].forEach((cid) => {
      const c = data.catById[cid]; if (!c) return;
      const col = data.catColor[cid] || '#5b8def';
      nodes.push({ id: 'cat_' + cid, label: c.name, shape: 'dot', size: 16, group: 'cat', color: { background: col, border: 'rgba(255,255,255,.3)', highlight: { background: '#E8E4D9', border: '#fff' } }, font: { color: '#D4DCEA', size: 12 } });
      edges.push({ from: '__lbc', to: 'cat_' + cid, color: { color: 'rgba(151,170,197,0.18)' }, width: 0.6 });
    });

    // members (LBC team) — always shown, clustered on LBC
    (section === 'all' || section === 'network') && data.members.forEach((m) => {
      const img = m.image && /^https?:/.test(m.image);
      nodes.push({ id: 'mem_' + m.id, label: m.name, title: m.role || 'LBC', shape: img ? 'circularImage' : 'dot', image: img ? m.image : undefined, size: 13, color: { background: '#97AAC5', border: 'rgba(255,255,255,.3)', highlight: { background: '#E8E4D9', border: '#fff' } }, font: { color: '#a9b6cc', size: 11 } });
      edges.push({ from: '__lbc', to: 'mem_' + m.id, color: { color: 'rgba(232,228,217,0.22)' }, width: 1, dashes: [2, 3] });
    });

    // connections — sized by closeness, colored by category, linked to category hub
    conns.forEach((c) => {
      const cid = connCatId(c);
      const col = cid ? (data.catColor[cid] || '#5b8def') : '#8E9AB0';
      const close = Math.max(1, Math.min(10, c.closeness_index || 5));
      const img = c.image && /^https?:/.test(c.image);
      nodes.push({ id: 'con_' + c.id, label: c.name, title: [c.affiliation, c.position].filter(Boolean).join(' · '), shape: img ? 'circularImage' : 'dot', image: img ? c.image : undefined, size: 8 + close * 1.4, color: { background: col, border: 'rgba(255,255,255,.25)', highlight: { background: '#E8E4D9', border: '#fff' } }, font: { color: '#D4DCEA', size: 11.5 } });
      const hub = cid && usedCats.has(cid) ? 'cat_' + cid : '__lbc';
      edges.push({ from: hub, to: 'con_' + c.id, color: { color: 'rgba(151,170,197,0.30)' }, width: 0.8 });
      // known_by relationship edges (member/connection)
      (Array.isArray(c.known_by) ? c.known_by : []).forEach((kb) => {
        if (!kb || !kb.id) return;
        const to = kb.type === 'member' ? 'mem_' + kb.id : 'con_' + kb.id;
        edges.push({ from: 'con_' + c.id, to, label: kb.relType || '', color: { color: 'rgba(245,181,68,0.5)' }, width: 1.2, font: { color: '#8E9AB0', size: 8, strokeWidth: 0, background: 'rgba(2,2,3,0.6)' }, dashes: false });
      });
    });

    const vnodes = new vis.DataSet(nodes);
    const vedges = new vis.DataSet(edges);
    netRef.current = new vis.Network(wrapRef.current, { nodes: vnodes, edges: vedges }, {
      physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -45, springLength: 90, avoidOverlap: 0.6 }, stabilization: { iterations: 220 } },
      interaction: { hover: true, tooltipDelay: 120, navigationButtons: false, keyboard: false },
      nodes: { borderWidth: 1.5, shadow: false },
      edges: { smooth: { type: 'continuous' } },
    });
    setStatus('ok');
    // freeze the layout once it settles — no perpetual redraw (CPU + lets the
    // graph hold still); re-enabling happens only on a fresh build.
    const freeze = () => { try { netRef.current && netRef.current.setOptions({ physics: false }); } catch {} };
    netRef.current.once('stabilizationIterationsDone', freeze);
    setTimeout(freeze, 2800);   // guaranteed freeze even if the event misses

    netRef.current.on('click', (p) => {
      const id = p.nodes && p.nodes[0];
      if (!id) { setSel(null); return; }
      if (id.startsWith('con_')) { const c = data.conns.find((x) => 'con_' + x.id === id); if (c) setSel({ type: 'connection', c }); }
      else if (id.startsWith('mem_')) { const m = data.members.find((x) => 'mem_' + x.id === id); if (m) setSel({ type: 'member', m }); }
      else if (id.startsWith('cat_')) { const cid = id.slice(4); const c = data.catById[cid]; if (c) setSel({ type: 'category', c, count: conns.filter((x) => connCatId(x) === cid).length }); }
      else setSel(null);
    });
    const refit = () => { const el = wrapRef.current; if (!netRef.current || !el) return; netRef.current.setSize(el.clientWidth + 'px', el.clientHeight + 'px'); netRef.current.redraw(); };
    requestAnimationFrame(refit); setTimeout(() => netRef.current && netRef.current.fit({ animation: false }), 400);
    if (window.ResizeObserver && wrapRef.current) { roRef.current = new ResizeObserver(refit); roRef.current.observe(wrapRef.current); }
    return () => { if (roRef.current) { roRef.current.disconnect(); roRef.current = null; } };
  }, [data, section]);

  // search → focus a connection
  const doSearch = (val) => {
    setQ(val);
    if (!val.trim() || !data || !netRef.current) return;
    const c = data.conns.find((x) => (x.name || '').toLowerCase().includes(val.trim().toLowerCase()));
    if (c) { try { netRef.current.focus('con_' + c.id, { scale: 1.2, animation: true }); netRef.current.selectNodes(['con_' + c.id]); setSel({ type: 'connection', c }); } catch {} }
  };

  const conns = data ? data.conns.filter((c) => section === 'all' || c.section === section) : [];
  const secName = (id) => (data && data.secById[id] ? data.secById[id].name : '—');
  const catNameForConn = (c) => { const cid = connCatId(c); return cid && data.catById[cid] ? data.catById[cid].name : '—'; };

  return (
    <section className="mc-section mc-data-page net-shell" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mc-section-h">
        <span>Network · relationship map</span>
        <span className="mc-section-h-sub">{data ? `${data.members.length} team · ${conns.length} contacts · ${[...new Set(conns.map(connCatId).filter(Boolean))].length} sectors` : 'loading…'} · click a node for detail</span>
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="mc-chip-row">{NET_SECTIONS.map((s) => <button key={s.id} className={`mc-chip ${section === s.id ? 'active' : ''}`} onClick={() => { setSection(s.id); setSel(null); }}>{s.label}</button>)}</div>
        <div className="mc-filter" style={{ flex: '0 1 240px' }}><input placeholder="Find a contact…" value={q} onChange={(e) => doSearch(e.target.value)} /></div>
        <button className="sw-tf" style={{ marginLeft: 'auto' }} onClick={() => netRef.current && netRef.current.fit({ animation: true })}>Fit</button>
      </div>
      <div style={{ flex: 1, minHeight: 360, position: 'relative', display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div ref={wrapRef} style={{ position: 'absolute', inset: 0, background: 'var(--bg-0,#020203)' }} />
          {status !== 'ok' && <div className="mc-news-empty" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>{status === 'loading' ? 'Loading network…' : status === 'empty' ? 'No contacts yet.' : status === 'novis' ? 'vis-network not loaded' : 'Failed to load'}</div>}
        </div>
        <aside style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border-subtle,rgba(255,255,255,.06))', padding: '14px 16px', overflow: 'auto' }}>
          {!sel && (
            <div>
              <div className="am-sub-h"><span>Legend</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11.5, color: 'var(--text-secondary,#D4DCEA)' }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 9, background: '#E8E4D9', marginRight: 7 }} />LBC team hub</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 9, background: '#97AAC5', marginRight: 7 }} />Team member</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 9, background: '#6f9cf2', marginRight: 7 }} />Sector hub / contact (by category)</span>
                <span style={{ color: 'var(--text-tertiary,#8E9AB0)' }}>node size = closeness (1–10)</span>
              </div>
              <div className="am-sub-h" style={{ marginTop: 16 }}><span>Categories</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data && data.cats.map((c) => { const n = conns.filter((x) => connCatId(x) === c.id).length; return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: n ? 'var(--text-secondary,#D4DCEA)' : 'var(--text-tertiary,#5f6b80)' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 9, background: data.catColor[c.id] }} />{c.name}<span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{n}</span>
                  </div>
                ); })}
              </div>
            </div>
          )}
          {sel && sel.type === 'connection' && (
            <div>
              <div className="am-sub-h"><span>Contact</span><button className="am-mini-x" onClick={() => setSel(null)}>×</button></div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#EAEFF7' }}>{sel.c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary,#8E9AB0)', marginTop: 2 }}>{[sel.c.position, sel.c.affiliation].filter(Boolean).join(' · ') || '—'}</div>
              <div style={{ display: 'flex', gap: 16, margin: '12px 0', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-tertiary,#8E9AB0)' }}>Closeness</div><div style={{ fontWeight: 600, color: '#F2F5FA' }}>{sel.c.closeness_index || '—'}/10</div></div>
                <div><div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-tertiary,#8E9AB0)' }}>Section</div><div style={{ fontWeight: 600, color: '#F2F5FA', textTransform: 'capitalize' }}>{sel.c.section || '—'}</div></div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary,#D4DCEA)' }}><b style={{ color: '#a9b6cc' }}>Sector:</b> {secName(sel.c.sector_id)}<br /><b style={{ color: '#a9b6cc' }}>Category:</b> {catNameForConn(sel.c)}</div>
              {Array.isArray(sel.c.notes) && sel.c.notes.length > 0 && (
                <div style={{ marginTop: 12 }}><div className="am-sub-h"><span>Notes</span></div>
                  {sel.c.notes.map((n, i) => <div key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary,#D4DCEA)', padding: '5px 0', borderBottom: '1px solid var(--border-subtle,rgba(255,255,255,.05))', lineHeight: 1.45 }}>{n.text || String(n)}</div>)}
                </div>
              )}
              {Array.isArray(sel.c.affiliations) && sel.c.affiliations.length > 0 && (
                <div style={{ marginTop: 12 }}><div className="am-sub-h"><span>Affiliations</span></div>
                  {sel.c.affiliations.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary,#D4DCEA)', padding: '4px 0' }}>{[a.position, a.company].filter(Boolean).join(' · ')}{a.current ? ' · current' : ''}</div>)}
                </div>
              )}
            </div>
          )}
          {sel && sel.type === 'member' && (
            <div>
              <div className="am-sub-h"><span>LBC Team</span><button className="am-mini-x" onClick={() => setSel(null)}>×</button></div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#EAEFF7' }}>{sel.m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary,#8E9AB0)', marginTop: 2 }}>{sel.m.role || 'Team member'}</div>
            </div>
          )}
          {sel && sel.type === 'category' && (
            <div>
              <div className="am-sub-h"><span>Sector / Category</span><button className="am-mini-x" onClick={() => setSel(null)}>×</button></div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#EAEFF7' }}>{sel.c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary,#8E9AB0)', marginTop: 2 }}>{sel.count} contact{sel.count === 1 ? '' : 's'}</div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
window.NetworkMap = NetworkMap;
