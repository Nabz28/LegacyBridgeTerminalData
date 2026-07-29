// ================================================================
// RESEARCH · data layer (window.RESEARCH_LIVE) — T13.
//
// CRUD over management.research_stance / research_note / research_watch
// through PostgREST with the LBC session JWT (RLS does the gating; this
// layer never assumes a role beyond reporting what the server said).
//
// Deliberately thin on market data: quotes, history and desk signals come
// from MONITOR_LIVE so Research and Monitor share one cache and one
// concurrency queue. Research owns opinions; Monitor owns prices.
// ================================================================
(function () {
  'use strict';

  const SB_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  const SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
  const ML = () => window.MONITOR_LIVE;

  // ---- session -------------------------------------------------------------
  const lbcSession = () => {
    try {
      const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null');
      return (s && s.token && s.exp && Date.now() < s.exp) ? s : null;
    } catch { return null; }
  };
  const me = () => {
    const s = lbcSession();
    return s && s.user ? s.user : null;
  };
  // House-view writes (stance, watchlist) are admin/management per RLS. The UI
  // mirrors that so a read-tier analyst sees a clean read-only surface instead
  // of buttons that 403.
  const canPublish = () => {
    const u = me();
    return !!u && ['admin', 'management'].includes(u.role);
  };

  const authHeaders = (write) => {
    const s = lbcSession();
    if (!s) return null;
    const h = {
      apikey: SB_ANON,
      Authorization: 'Bearer ' + s.token,
      [write ? 'Content-Profile' : 'Accept-Profile']: 'management',
    };
    if (write) h['Content-Type'] = 'application/json';
    return h;
  };

  // Every mutation funnels through here so one place turns a PostgREST error
  // body into a message a human can act on ("needs a management login").
  const req = (path, opts = {}) => {
    const { method = 'GET', body, prefer, write = method !== 'GET' } = opts;
    const headers = authHeaders(write);
    if (!headers) return Promise.reject(new Error('not signed in'));
    if (prefer) headers.Prefer = prefer;
    return fetch(SB_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (r) => {
      const text = await r.text();
      if (!r.ok) {
        let msg = 'HTTP ' + r.status;
        try { const j = JSON.parse(text); msg = j.message || j.hint || msg; } catch {}
        if (r.status === 401 || r.status === 403) {
          msg = canPublish() ? msg : 'needs a management or admin login';
        }
        throw new Error(msg);
      }
      if (!text) return null;
      try { return JSON.parse(text); } catch { return null; }
    });
  };

  // ---- scope keys ----------------------------------------------------------
  // 'desk:tech' / 'sub:tech/semis'. One synthetic key keeps the upsert a
  // single round-trip and keeps desk & sub rows in one table.
  const scopeKey = (deskId, subId) =>
    (subId && subId !== 'all') ? 'sub:' + deskId + '/' + subId : 'desk:' + deskId;

  // ---- stance --------------------------------------------------------------
  const STANCES = [
    { id: 'bullish',  label: 'Bullish',  glyph: '▲', cls: 'bull' },
    { id: 'bearish',  label: 'Bearish',  glyph: '▼', cls: 'bear' },
    { id: 'neutral',  label: 'Neutral',  glyph: '=', cls: 'neu' },
    { id: 'watching', label: 'Watching', glyph: '◉', cls: 'watch' },
    { id: 'avoid',    label: 'Avoid',    glyph: '✕', cls: 'avoid' },
  ];
  const stanceMeta = (id) => STANCES.find((s) => s.id === id) || STANCES[3];

  const HORIZONS = ['1M', '3M', '6M', '12M', '3Y'];

  const WATCH_STATUS = [
    { id: 'watching',    label: 'Watching' },
    { id: 'researching', label: 'Researching' },
    { id: 'candidate',   label: 'Candidate' },
    { id: 'position',    label: 'Position' },
    { id: 'passed',      label: 'Passed' },
    { id: 'exited',      label: 'Exited' },
  ];

  const NOTE_KINDS = [
    { id: 'note',     label: 'Note' },
    { id: 'idea',     label: 'Idea' },
    { id: 'thesis',   label: 'Thesis' },
    { id: 'catalyst', label: 'Catalyst' },
    { id: 'risk',     label: 'Risk' },
    { id: 'meeting',  label: 'Meeting' },
    { id: 'question', label: 'Question' },
    { id: 'data',     label: 'Data' },
  ];

  const fetchStances = () =>
    req('/research_stance?select=*').then((rows) => {
      const m = {};
      (rows || []).forEach((r) => { m[r.scope_id] = r; });
      return m;
    });

  const saveStance = (deskId, subId, val) => {
    const u = me();
    return req('/research_stance', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        scope_id: scopeKey(deskId, subId),
        desk_id: deskId,
        sub_id: (subId && subId !== 'all') ? subId : null,
        stance: val.stance || 'watching',
        conviction: val.conviction == null ? 3 : val.conviction,
        thesis: val.thesis || '',
        horizon: val.horizon || '6M',
        updated_by: (u && u.id) || null,
        updated_by_name: (u && (u.full_name || u.username)) || '',
        updated_at: new Date().toISOString(),
      }],
    }).then((rows) => (rows && rows[0]) || null);
  };

  const clearStance = (deskId, subId) =>
    req('/research_stance?scope_id=eq.' + encodeURIComponent(scopeKey(deskId, subId)), { method: 'DELETE' });

  // ---- notes ---------------------------------------------------------------
  // scope: {} = everything · {deskId} · {deskId, subId} · {ticker}
  const fetchNotes = (scope = {}, limit = 300) => {
    const q = ['select=*', 'order=pinned.desc,updated_at.desc', 'limit=' + limit];
    if (scope.deskId) q.push('desk_id=eq.' + encodeURIComponent(scope.deskId));
    if (scope.subId && scope.subId !== 'all') q.push('sub_id=eq.' + encodeURIComponent(scope.subId));
    if (scope.ticker) q.push('ticker=eq.' + encodeURIComponent(scope.ticker));
    if (scope.kind) q.push('kind=eq.' + encodeURIComponent(scope.kind));
    if (scope.tag) q.push('tags=cs.{' + encodeURIComponent(scope.tag) + '}');
    if (scope.q) {
      // PostgREST or= needs the * wildcard form; commas inside the term would
      // split the filter list, so they are stripped rather than escaped.
      const term = String(scope.q).replace(/[,()]/g, ' ').trim();
      if (term) q.push('or=(title.ilike.*' + encodeURIComponent(term) + '*,body.ilike.*' + encodeURIComponent(term) + '*)');
    }
    return req('/research_note?' + q.join('&')).then((r) => r || []);
  };

  const createNote = (note) => {
    const u = me();
    if (!u) return Promise.reject(new Error('not signed in'));
    return req('/research_note', {
      method: 'POST',
      prefer: 'return=representation',
      body: [{
        title: note.title || '',
        body: note.body || '',
        kind: note.kind || 'note',
        desk_id: note.deskId || null,
        sub_id: (note.subId && note.subId !== 'all') ? note.subId : null,
        ticker: note.ticker || null,
        tags: note.tags || [],
        pinned: !!note.pinned,
        author_id: u.id,                       // RLS insert check: auth.uid() = author_id
        author: u.full_name || u.username || '',
      }],
    }).then((rows) => (rows && rows[0]) || null);
  };

  const updateNote = (id, patch) => {
    const body = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.body !== undefined) body.body = patch.body;
    if (patch.kind !== undefined) body.kind = patch.kind;
    if (patch.tags !== undefined) body.tags = patch.tags;
    if (patch.pinned !== undefined) body.pinned = patch.pinned;
    if (patch.deskId !== undefined) body.desk_id = patch.deskId || null;
    if (patch.subId !== undefined) body.sub_id = (patch.subId && patch.subId !== 'all') ? patch.subId : null;
    if (patch.ticker !== undefined) body.ticker = patch.ticker || null;
    return req('/research_note?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH', prefer: 'return=representation', body,
    }).then((rows) => (rows && rows[0]) || null);
  };

  const deleteNote = (id) =>
    req('/research_note?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });

  // ---- watchlist -----------------------------------------------------------
  const fetchWatch = (scope = {}) => {
    const q = ['select=*', 'order=updated_at.desc'];
    if (scope.deskId) q.push('desk_id=eq.' + encodeURIComponent(scope.deskId));
    if (scope.subId && scope.subId !== 'all') q.push('sub_id=eq.' + encodeURIComponent(scope.subId));
    if (scope.status) q.push('status=eq.' + encodeURIComponent(scope.status));
    return req('/research_watch?' + q.join('&')).then((r) => r || []);
  };

  // Upsert on ticker: one name carries one house view, so re-adding a name
  // from a different desk view updates it instead of duplicating it.
  const saveWatch = (row) => {
    const u = me();
    const payload = {
      ticker: row.ticker,
      name: row.name || '',
      desk_id: row.deskId || row.desk_id || null,
      sub_id: (row.subId || row.sub_id) && (row.subId || row.sub_id) !== 'all' ? (row.subId || row.sub_id) : null,
      stance: row.stance || 'watching',
      conviction: row.conviction == null ? 3 : row.conviction,
      status: row.status || 'watching',
      thesis: row.thesis || '',
      target_price: row.target_price === '' || row.target_price == null ? null : Number(row.target_price),
      entry_price: row.entry_price === '' || row.entry_price == null ? null : Number(row.entry_price),
      currency: row.currency || '',
      catalyst: row.catalyst || '',
      catalyst_date: row.catalyst_date || null,
      tags: row.tags || [],
      author_id: (u && u.id) || null,
      author: (u && (u.full_name || u.username)) || '',
      updated_at: new Date().toISOString(),
    };
    return req('/research_watch?on_conflict=ticker', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [payload],
    }).then((rows) => (rows && rows[0]) || null);
  };

  const deleteWatch = (id) =>
    req('/research_watch?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });

  // ---- rollup --------------------------------------------------------------
  const fetchRollup = () =>
    req('/research_desk_rollup?select=*').then((rows) => {
      const m = {};
      (rows || []).forEach((r) => { m[r.desk_id] = r; });
      return m;
    }).catch(() => ({}));

  // ================================================================
  // hooks
  // ================================================================

  // The whole research book in one place. Every mutation refreshes from the
  // server rather than patching local state optimistically — the book is
  // small (hundreds of rows) and a wrong local guess about an RLS rejection
  // is worse than one extra round-trip.
  function useResearchBook() {
    const [stances, setStances] = React.useState({});
    const [rollup, setRollup] = React.useState({});
    const [watch, setWatch] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState('');

    const reload = React.useCallback(() => {
      if (!lbcSession()) { setLoading(false); setErr('Sign in to load the research book.'); return Promise.resolve(); }
      return Promise.all([fetchStances(), fetchRollup(), fetchWatch()]).then(
        ([s, r, w]) => { setStances(s); setRollup(r); setWatch(w); setErr(''); setLoading(false); },
        (e) => { setErr(e.message || String(e)); setLoading(false); }
      );
    }, []);

    React.useEffect(() => { reload(); }, [reload]);
    return { stances, rollup, watch, loading, err, reload, setErr };
  }

  // Live price for a watchlist row, via Monitor's cache.
  function useWatchQuotes(rows) {
    const key = (rows || []).map((r) => r.ticker).join(',');
    const [map, setMap] = React.useState({});
    React.useEffect(() => {
      const tickers = key ? key.split(',') : [];
      if (!tickers.length || !ML()) { setMap({}); return; }
      let alive = true;
      ML().fetchQuotesBatch(tickers).then((m) => { if (alive) setMap(m || {}); }, () => {});
      return () => { alive = false; };
    }, [key]);
    return map;
  }

  // ---- derived: conviction vs the tape ------------------------------------
  // The point of sitting Research on Monitor's spine: know when the house view
  // and price action disagree. Returns null when either side is unknown, so a
  // missing signal never renders as agreement.
  const divergence = (stance, sig) => {
    if (!stance || !sig || sig.r1m == null) return null;
    const up = sig.r1m > 1, down = sig.r1m < -1;
    if (stance === 'bullish' && down) return { kind: 'against', label: 'AGAINST TAPE', hint: 'bullish call, benchmark down 1M' };
    if (stance === 'bearish' && up) return { kind: 'against', label: 'AGAINST TAPE', hint: 'bearish call, benchmark up 1M' };
    if (stance === 'bullish' && up) return { kind: 'with', label: 'WITH TAPE', hint: 'bullish call confirmed by 1M momentum' };
    if (stance === 'bearish' && down) return { kind: 'with', label: 'WITH TAPE', hint: 'bearish call confirmed by 1M momentum' };
    return null;
  };

  // Days until (positive) or since (negative) a catalyst date.
  const daysTo = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d)) return null;
    const today = new Date();
    return Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  };

  const upsideTo = (price, target) => {
    if (price == null || target == null || !price) return null;
    return ((target - price) / price) * 100;
  };

  window.RESEARCH_LIVE = {
    lbcSession, me, canPublish, scopeKey,
    STANCES, HORIZONS, WATCH_STATUS, NOTE_KINDS, stanceMeta,
    fetchStances, saveStance, clearStance,
    fetchNotes, createNote, updateNote, deleteNote,
    fetchWatch, saveWatch, deleteWatch,
    fetchRollup,
    useResearchBook, useWatchQuotes,
    divergence, daysTo, upsideTo,
  };
})();
