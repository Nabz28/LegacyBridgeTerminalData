// ================================================================
// LEGION — T9, LBC's AI chief of staff (the brain). Native in-shell.
// Legacy Bridge Capital's Engine For Growth, Investment,
// Operations, and Networks. Management-only (RLS admin|management).
//
// Two modes:
//   Brain — Obsidian-like wiki over Supabase `brain.notes` (folders,
//           tags, FTS, [[wikilinks]], an Inbox + dump box).
//   HQ    — company-level goals/KPIs/milestones + live terminal
//           rollups + LEGION's latest status snapshot (legion-views.jsx).
//
// Browser = capture + read. Claude Code (`/lbc`) = LEGION reasons,
// triages the inbox, updates goals, writes status snapshots.
// This file: window.BRAIN helper + markdown + Brain mode + root.
// HQ view lives in legion-views.jsx (window.LegionHQ).
// ================================================================

const BR_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const BR_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

const brSession = () => {
  try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; }
};
const brTok = () => { const s = brSession(); return s ? s.token : BR_ANON; };
const brSub = () => { const s = brSession(); return s && s.user ? s.user.id : null; };
const brUser = () => { const s = brSession(); return s ? s.user : null; };
const brHdr = (write) => {
  const h = { apikey: BR_ANON, Authorization: 'Bearer ' + brTok() };
  if (write) { h['Content-Type'] = 'application/json'; h['Content-Profile'] = 'brain'; }
  else h['Accept-Profile'] = 'brain';
  return h;
};
const BRAIN = {
  get: (path) => fetch(BR_BASE + path, { headers: brHdr(false) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  insert: (table, row) => fetch(BR_BASE + '/' + table, { method: 'POST', headers: Object.assign(brHdr(true), { Prefer: 'return=representation' }), body: JSON.stringify(row) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  update: (table, match, patch) => fetch(BR_BASE + '/' + table + '?' + match, { method: 'PATCH', headers: Object.assign(brHdr(true), { Prefer: 'return=minimal' }), body: JSON.stringify(patch) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
  del: (table, match) => fetch(BR_BASE + '/' + table + '?' + match, { method: 'DELETE', headers: brHdr(true) }).then((r) => (r.ok ? true : Promise.reject(r.status))),
};
BRAIN.sub = brSub; BRAIN.user = brUser;
window.BRAIN = BRAIN;

// ---- time / formatting --------------------------------------------------
const lgTimeAgo = (iso) => {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  if (d < 2592000) return Math.floor(d / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
window.lgTimeAgo = lgTimeAgo;

// type → display + accent class
const LG_TYPES = {
  note: 'Note', inbox: 'Inbox', goal: 'Goal', kpi: 'KPI', milestone: 'Milestone',
  initiative: 'Initiative', risk: 'Risk', todo: 'To-do', person: 'Person',
  meeting: 'Meeting', status_snapshot: 'Status',
};
window.LG_TYPES = LG_TYPES;

// ================================================================
// Markdown — minimal + safe. Escape HTML first, then transform.
// Supports: # headings, **bold**, *italic*, `code`, [t](url),
// - / 1. lists, > quote, --- rule, [[wikilinks]], paragraphs.
// Wikilinks render as <a data-wiki="Title"> — navigation handled by
// a delegated onClick on the container (see LgNoteBody).
// ================================================================
const lgEsc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const lgInline = (s) => {
  let t = lgEsc(s);
  // code spans first (protect their contents from further formatting)
  t = t.replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>');
  // wikilinks [[Title]] or [[Title|alias]]
  t = t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, target, alias) =>
    '<a class="lg-wiki" data-wiki="' + target.trim() + '">' + (alias || target).trim() + '</a>');
  // links [text](url) — only http(s)/relative, no javascript:
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="lg-link" href="$2" target="_blank" rel="noopener">$1</a>');
  // bold + italic
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return t;
};

const legionMd = (md) => {
  const lines = String(md || '').split(/\r?\n/);
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { closeList(); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { closeList(); const n = m[1].length; out.push('<h' + n + '>' + lgInline(m[2]) + '</h' + n + '>'); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { closeList(); out.push('<hr/>'); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { closeList(); out.push('<blockquote>' + lgInline(m[1]) + '</blockquote>'); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + lgInline(m[1]) + '</li>'); continue; }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + lgInline(m[1]) + '</li>'); continue; }
    closeList(); out.push('<p>' + lgInline(line) + '</p>');
  }
  closeList();
  return out.join('\n');
};
window.legionMd = legionMd;

// ================================================================
// LgNoteBody — renders markdown, delegates [[wikilink]] clicks.
// ================================================================
const LgNoteBody = ({ md, onWiki }) => {
  const onClick = (e) => {
    const a = e.target.closest && e.target.closest('a.lg-wiki');
    if (a) { e.preventDefault(); onWiki && onWiki(a.dataset.wiki); }
  };
  return <div className="lg-md" onClick={onClick} dangerouslySetInnerHTML={{ __html: legionMd(md) }} />;
};

// ================================================================
// LgDump — the capture box: drop raw info → lands in the Inbox
// (status=inbox). LEGION triages it later in Claude Code.
// ================================================================
const LgDump = ({ onDumped }) => {
  const [txt, setTxt] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    const body = txt.trim();
    if (!body || busy) return;
    setBusy(true);
    const title = (body.split(/\n/)[0] || 'Untitled dump').slice(0, 80);
    try {
      await BRAIN.insert('notes', { title, body, folder: 'inbox', type: 'inbox', status: 'inbox', created_by: brSub() });
      setTxt('');
      onDumped && onDumped();
    } catch (e) { /* surfaced by parent reload */ }
    setBusy(false);
  };
  return (
    <div className="lg-dump">
      <div className="lg-dump-h">Dump to LEGION</div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)}
        placeholder="Drop anything — a worry, a number, a meeting note, an idea. LEGION sorts it on the next /lbc." />
      <div className="lg-dump-foot">
        <span className="lg-dim">Lands in the Inbox · triaged in Claude Code</span>
        <button className="lg-btn lg-btn-cta" disabled={busy || !txt.trim()} onClick={submit}>{busy ? 'Saving…' : 'Capture'}</button>
      </div>
    </div>
  );
};

// ================================================================
// LgLinkedRefs — Obsidian-style "linked references": outbound links
// (this note → others) + backlinks (others → this note), from the index.
// ================================================================
const LgLinkedRefs = ({ note, index, onWiki }) => {
  if (!note) return null;
  const title = (note.title || '').toLowerCase();
  const find = (t) => (index || []).find((n) => (n.title || '').toLowerCase() === (t || '').toLowerCase());
  const out = (note.links || []).map((t) => find(t) || { title: t, missing: true });
  const back = (index || []).filter((n) => n.id !== note.id && (n.links || []).some((t) => (t || '').toLowerCase() === title));
  if (!out.length && !back.length) return null;
  const Row = ({ n }) => (
    <button className={`lg-ref ${n.missing ? 'missing' : ''}`} onClick={() => onWiki && onWiki(n.title)} title={n.missing ? 'no note with this title yet' : 'open'}>
      <span className={`lg-typedot t-${n.type || 'note'}`} />{n.title}{n.missing ? ' ·?' : ''}
    </button>
  );
  return (
    <div className="lg-refs">
      {out.length > 0 && <div className="lg-refsec"><div className="lg-refs-h">Links to →</div><div className="lg-refs-list">{out.map((n, i) => <Row key={i} n={n} />)}</div></div>}
      {back.length > 0 && <div className="lg-refsec"><div className="lg-refs-h">← Linked from</div><div className="lg-refs-list">{back.map((n) => <Row key={n.id} n={n} />)}</div></div>}
    </div>
  );
};

// ================================================================
// LgNoteDetail — read/edit a single note.
// ================================================================
const LgNoteDetail = ({ note, index, onWiki, onSaved, onDeleted, onToast }) => {
  const [editing, setEditing] = React.useState(false);
  const [body, setBody] = React.useState(note ? note.body || '' : '');
  const [title, setTitle] = React.useState(note ? note.title || '' : '');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setEditing(false); setBody(note ? note.body || '' : ''); setTitle(note ? note.title || '' : ''); }, [note && note.id]);
  if (!note) return <div className="lg-detail lg-detail-empty"><div className="lg-empty-glyph">◷</div><p>Select a note, or dump something new.</p></div>;

  const save = async () => {
    if (busy) return; setBusy(true);
    try {
      await BRAIN.update('notes', 'id=eq.' + note.id, { title: title.trim() || note.title, body });
      setEditing(false);
      onSaved && onSaved({ ...note, title: title.trim() || note.title, body });
      onToast && onToast('Saved');
    } catch (e) { onToast && onToast('Save failed (' + e + ')'); }
    setBusy(false);
  };
  const del = async () => {
    if (busy) return;
    if (!window.confirm('Delete “' + note.title + '”? This cannot be undone.')) return;
    setBusy(true);
    try { await BRAIN.del('notes', 'id=eq.' + note.id); onDeleted && onDeleted(note); onToast && onToast('Deleted'); }
    catch (e) { onToast && onToast('Delete failed (' + e + ')'); }
    setBusy(false);
  };
  const togglePin = async () => {
    try { await BRAIN.update('notes', 'id=eq.' + note.id, { pinned: !note.pinned }); onSaved && onSaved({ ...note, pinned: !note.pinned }); }
    catch (e) { onToast && onToast('Pin failed'); }
  };

  return (
    <div className="lg-detail">
      <div className="lg-detail-bar">
        <span className={`lg-typebadge t-${note.type}`}>{LG_TYPES[note.type] || note.type}</span>
        <span className="lg-detail-folder">{note.folder}</span>
        {note.status === 'inbox' && <span className="lg-inbox-flag">● inbox · untriaged</span>}
        <span className="lg-sp" />
        <button className="lg-icbtn" title={note.pinned ? 'Unpin' : 'Pin'} onClick={togglePin}>{note.pinned ? '★' : '☆'}</button>
        {!editing && <button className="lg-btn" onClick={() => setEditing(true)}>Edit</button>}
        {editing && <button className="lg-btn lg-btn-cta" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>}
        {editing && <button className="lg-btn" onClick={() => { setEditing(false); setBody(note.body || ''); setTitle(note.title || ''); }}>Cancel</button>}
        <button className="lg-icbtn lg-danger" title="Delete" onClick={del}>🗑</button>
      </div>
      {editing
        ? <input className="lg-titleedit" value={title} onChange={(e) => setTitle(e.target.value)} />
        : <h1 className="lg-detail-title">{note.title}</h1>}
      <div className="lg-detail-meta">
        {(note.tags || []).map((t) => <span key={t} className="lg-tag">#{t}</span>)}
        <span className="lg-dim">updated {lgTimeAgo(note.updated_at)}</span>
      </div>
      {editing
        ? <textarea className="lg-bodyedit" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Markdown · [[wikilinks]] supported" />
        : <LgNoteBody md={note.body} onWiki={onWiki} />}
      {!editing && <LgLinkedRefs note={note} index={index} onWiki={onWiki} />}
    </div>
  );
};

// ================================================================
// LEGION root — header + Brain/HQ toggle.
// ================================================================
const FOLDER_ORDER = ['home', 'strategy', 'growth', 'investments', 'operations', 'hr', 'people', 'knowledge', 'product', 'inbox'];

const Legion = () => {
  const [mode, setMode] = React.useState('hq'); // 'hq' | 'brain'
  const [brainView, setBrainView] = React.useState('list'); // 'list' | 'graph'
  const [notes, setNotes] = React.useState(null); // index (no body)
  const [active, setActive] = React.useState(null); // full note
  const [query, setQuery] = React.useState('');
  const [folder, setFolder] = React.useState('all');
  const [tag, setTag] = React.useState(null);
  const [status, setStatus] = React.useState(null); // 'inbox' filter
  const [snapshot, setSnapshot] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const user = brUser();

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const loadIndex = React.useCallback(async () => {
    try {
      const rows = await BRAIN.get('/notes?select=id,title,folder,type,tags,status,pinned,links,created_at,updated_at,data&order=updated_at.desc&limit=2000');
      setNotes(rows); setErr(null);
      const snaps = rows.filter((n) => n.type === 'status_snapshot');
      setSnapshot(snaps.length ? snaps[0] : null);
    } catch (e) {
      setErr(e === 401 || e === 403 ? 'Restricted — management access required.' : 'Could not reach the brain (' + e + ').');
      setNotes([]);
    }
  }, []);
  React.useEffect(() => { loadIndex(); }, [loadIndex]);

  const openNote = async (id) => {
    try { const rows = await BRAIN.get('/notes?id=eq.' + id + '&select=*'); if (rows && rows[0]) { setActive(rows[0]); setMode('brain'); } }
    catch (e) { flash('Could not open note'); }
  };
  const openByTitle = async (title) => {
    try {
      const rows = await BRAIN.get('/notes?title=eq.' + encodeURIComponent(title) + '&select=*&limit=1');
      if (rows && rows[0]) { setActive(rows[0]); }
      else flash('No note titled “' + title + '” yet — LEGION creates it on triage.');
    } catch (e) { flash('Lookup failed'); }
  };
  const newNote = async () => {
    const f = folder === 'all' ? 'knowledge' : folder;
    try {
      const rows = await BRAIN.insert('notes', { title: 'Untitled', folder: f, type: 'note', status: 'filed', body: '', created_by: brSub() });
      await loadIndex(); if (rows && rows[0]) setActive(rows[0]);
    } catch (e) { flash('Create failed'); }
  };

  // derived nav
  const folders = React.useMemo(() => {
    const set = {}; (notes || []).forEach((n) => { set[n.folder] = (set[n.folder] || 0) + 1; });
    const keys = Object.keys(set).sort((a, b) => {
      const ia = FOLDER_ORDER.indexOf(a), ib = FOLDER_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    return keys.map((k) => ({ k, n: set[k] }));
  }, [notes]);
  const allTags = React.useMemo(() => {
    const set = {}; (notes || []).forEach((n) => (n.tags || []).forEach((t) => { set[t] = (set[t] || 0) + 1; }));
    return Object.keys(set).sort().map((k) => ({ k, n: set[k] }));
  }, [notes]);
  const inboxCount = (notes || []).filter((n) => n.status === 'inbox').length;

  // filtered list (client-side; server search when query present)
  const [searchHits, setSearchHits] = React.useState(null);
  React.useEffect(() => {
    // strip chars that would break the PostgREST or()/ilike filter
    const q = query.trim().replace(/[(),*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) { setSearchHits(null); return; }
    let live = true;
    const enc = encodeURIComponent('*' + q + '*');
    BRAIN.get('/notes?or=(title.ilike.' + enc + ',body.ilike.' + enc + ')&select=id,title,folder,type,tags,status,pinned,links,updated_at,data&order=updated_at.desc&limit=200')
      .then((r) => { if (live) setSearchHits(r); }).catch(() => { if (live) setSearchHits([]); });
    return () => { live = false; };
  }, [query]);

  const list = React.useMemo(() => {
    let arr = searchHits != null ? searchHits : (notes || []);
    if (searchHits == null) {
      if (status === 'inbox') arr = arr.filter((n) => n.status === 'inbox');
      if (folder !== 'all') arr = arr.filter((n) => n.folder === folder);
      if (tag) arr = arr.filter((n) => (n.tags || []).includes(tag));
    }
    return [...arr].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated_at || '').localeCompare(a.updated_at || ''));
  }, [notes, searchHits, folder, tag, status]);

  return (
    <div className="lg-root">
      {/* header */}
      <div className="lg-head">
        <div className="lg-brand">
          <div className="lg-mark"><span className="lg-word">LEGION</span></div>
          <div className="lg-tag-sub">Engine For Growth, Investment, Operations &amp; Networks</div>
        </div>
        <div className="lg-head-status">
          {snapshot
            ? <><span className="lg-pulse" /> <b>{(snapshot.data && snapshot.data.headline) || 'Status logged'}</b> <span className="lg-dim">· LEGION read {lgTimeAgo(snapshot.created_at)}</span></>
            : <span className="lg-dim">No status read yet — run <code>/lbc</code> in Claude Code.</span>}
        </div>
        <div className="lg-sp" />
        {user && <span className="lg-who">{user.full_name || user.username}</span>}
        <div className="lg-modetoggle">
          <button className={mode === 'hq' ? 'on' : ''} onClick={() => setMode('hq')}>HQ</button>
          <button className={mode === 'brain' ? 'on' : ''} onClick={() => setMode('brain')}>Brain</button>
        </div>
      </div>

      {err && <div className="lg-err">{err}</div>}

      {mode === 'hq'
        ? (window.LegionHQ ? <window.LegionHQ notes={notes} snapshot={snapshot} onOpenNote={openNote} reload={loadIndex} /> : <div className="lg-loading">Loading HQ…</div>)
        : (
          <div className={`lg-brain ${brainView === 'graph' ? 'is-graph' : ''}`}>
            {/* rail */}
            <div className="lg-rail">
              <div className="lg-viewtoggle">
                <button className={brainView === 'list' ? 'on' : ''} onClick={() => setBrainView('list')}>List</button>
                <button className={brainView === 'graph' ? 'on' : ''} onClick={() => setBrainView('graph')}>Graph</button>
              </div>
              <div className="lg-search">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the brain…" />
              </div>
              <button className="lg-btn lg-btn-cta lg-newnote" onClick={newNote}>+ New note</button>
              <div className="lg-railsec">
                <div className={`lg-railitem ${folder === 'all' && !status && !tag ? 'on' : ''}`} onClick={() => { setFolder('all'); setStatus(null); setTag(null); setQuery(''); }}>
                  <span>All notes</span><span className="lg-count">{(notes || []).length}</span>
                </div>
                <div className={`lg-railitem ${status === 'inbox' ? 'on' : ''}`} onClick={() => { setStatus('inbox'); setFolder('all'); setTag(null); setQuery(''); }}>
                  <span>Inbox</span><span className={`lg-count ${inboxCount ? 'hot' : ''}`}>{inboxCount}</span>
                </div>
              </div>
              <div className="lg-railsec">
                <div className="lg-raillbl">Folders</div>
                {folders.map((f) => (
                  <div key={f.k} className={`lg-railitem ${folder === f.k && !status ? 'on' : ''}`} onClick={() => { setFolder(f.k); setStatus(null); setTag(null); setQuery(''); }}>
                    <span>{f.k}</span><span className="lg-count">{f.n}</span>
                  </div>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="lg-railsec">
                  <div className="lg-raillbl">Tags</div>
                  <div className="lg-tagcloud">
                    {allTags.map((t) => (
                      <span key={t.k} className={`lg-tag clickable ${tag === t.k ? 'on' : ''}`} onClick={() => { setTag(tag === t.k ? null : t.k); setStatus(null); setQuery(''); }}>#{t.k}</span>
                    ))}
                  </div>
                </div>
              )}
              <LgDump onDumped={loadIndex} />
            </div>

            {/* list OR graph */}
            {brainView === 'graph'
              ? (window.LegionGraph ? <window.LegionGraph notes={notes} activeId={active && active.id} onOpen={openNote} /> : <div className="lg-loading">Graph…</div>)
              : <div className="lg-list">
              {notes == null && <div className="lg-loading">Loading…</div>}
              {notes != null && list.length === 0 && <div className="lg-loading">No notes here.</div>}
              {list.map((n) => (
                <div key={n.id} className={`lg-card ${active && active.id === n.id ? 'on' : ''} ${n.status === 'inbox' ? 'inbox' : ''}`} onClick={() => openNote(n.id)}>
                  <div className="lg-card-top">
                    {n.pinned && <span className="lg-pin">★</span>}
                    <span className={`lg-typedot t-${n.type}`} />
                    <span className="lg-card-title">{n.title}</span>
                  </div>
                  <div className="lg-card-meta">
                    <span className="lg-card-folder">{n.folder}</span>
                    {(n.tags || []).slice(0, 3).map((t) => <span key={t} className="lg-tag sm">#{t}</span>)}
                    <span className="lg-sp" />
                    <span className="lg-dim">{lgTimeAgo(n.updated_at)}</span>
                  </div>
                </div>
              ))}
              </div>}

            {/* detail */}
            <LgNoteDetail note={active} index={notes} onWiki={openByTitle}
              onSaved={(nx) => { setActive(nx); loadIndex(); }}
              onDeleted={() => { setActive(null); loadIndex(); }}
              onToast={flash} />
          </div>
        )}

      {toast && <div className="lg-toast">{toast}</div>}
    </div>
  );
};
window.LEGION = Legion;
