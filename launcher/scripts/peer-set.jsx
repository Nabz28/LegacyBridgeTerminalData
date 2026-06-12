// ================================================================
// Shared, EDITABLE peer set — used by the Equity terminal's
// Financials › Peer Comps and WACC › Bottom-up peer comparison.
//
// One source of truth per subject ticker: edits in either panel are
// reflected in the other and survive reloads (localStorage). Default
// seed = same-sector names from the IDX universe; the analyst can add
// any ticker (type-ahead over the universe, or a raw symbol), remove
// names, batch-add by sector / sub-industry, or reset to default.
//
// Exposes: window.PeerStore, window.usePeerSet, window.PeerEditor.
// ================================================================
(function () {
  const LS_KEY = 'lbc_peers_v1';
  const SEED_CAP = 7;    // default same-sector peers (excl. self)
  const MAX_PEERS = 12;  // hard cap on a custom set (keeps per-peer fetches sane)

  const loadLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; } };
  const saveLS = (m) => { try { localStorage.setItem(LS_KEY, JSON.stringify(m)); } catch { /* private mode / quota */ } };

  let overrides = loadLS();            // { [symbol]: [syms] } — peer syms only, excl. self
  const subs = new Set();
  const notify = () => subs.forEach((cb) => { try { cb(); } catch { /* ignore */ } });

  const uniList = () => (window.IDX_UNIVERSE || []);
  const uniBySym = (sym) => uniList().find((u) => u.sym === sym) || null;
  const norm = (s) => String(s || '').toUpperCase().trim();

  const defaultFor = (symbol, cap = SEED_CAP) => {
    const uni = uniList();
    const self = uni.find((u) => u.sym === symbol);
    if (!self) return [];
    return uni.filter((u) => u.sym !== symbol && u.sector === self.sector).slice(0, cap).map((u) => u.sym);
  };

  const PeerStore = {
    SEED_CAP, MAX_PEERS, uniBySym, defaultFor,
    isCustom: (symbol) => Array.isArray(overrides[symbol]),
    get: (symbol) => (Array.isArray(overrides[symbol]) ? overrides[symbol].slice() : defaultFor(symbol)),
    set: (symbol, syms) => {
      const seen = new Set(); const clean = [];
      (syms || []).forEach((s) => { const u = norm(s); if (u && u !== symbol && !seen.has(u)) { seen.add(u); clean.push(u); } });
      overrides = { ...overrides, [symbol]: clean.slice(0, MAX_PEERS) };
      saveLS(overrides); notify();
    },
    add: (symbol, sym) => {
      const u = norm(sym); const cur = PeerStore.get(symbol);
      if (!u || u === symbol || cur.includes(u)) return;
      PeerStore.set(symbol, [...cur, u]);
    },
    addBatch: (symbol, syms) => {
      const merged = PeerStore.get(symbol).slice();
      (syms || []).forEach((s) => { const u = norm(s); if (u && u !== symbol && !merged.includes(u)) merged.push(u); });
      PeerStore.set(symbol, merged);
    },
    remove: (symbol, sym) => { PeerStore.set(symbol, PeerStore.get(symbol).filter((s) => s !== norm(sym))); },
    reset: (symbol) => { const m = { ...overrides }; delete m[symbol]; overrides = m; saveLS(overrides); notify(); },
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
  };
  window.PeerStore = PeerStore;

  // ---- hook: re-renders the caller whenever this symbol's set changes ----
  window.usePeerSet = function usePeerSet(symbol) {
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => PeerStore.subscribe(force), []);
    return {
      peers: PeerStore.get(symbol),
      isCustom: PeerStore.isCustom(symbol),
      add: (s) => PeerStore.add(symbol, s),
      addBatch: (a) => PeerStore.addBatch(symbol, a),
      remove: (s) => PeerStore.remove(symbol, s),
      reset: () => PeerStore.reset(symbol),
      set: (a) => PeerStore.set(symbol, a),
    };
  };

  // ---- editor: chips (add/remove) + type-ahead + quick-add + reset ----
  const PeerEditor = ({ symbol }) => {
    const { peers, isCustom, add, addBatch, remove, reset } = window.usePeerSet(symbol);
    const [q, setQ] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const uni = window.IDX_UNIVERSE || [];
    const self = uniBySym(symbol);

    const matches = React.useMemo(() => {
      const s = norm(q);
      if (!s) return [];
      const has = new Set([symbol, ...peers]);
      return uni.filter((u) => !has.has(u.sym) && (u.sym.toUpperCase().includes(s) || (u.name || '').toUpperCase().includes(s))).slice(0, 8);
    }, [q, peers, symbol, uni.length]);

    const addSym = (sym) => { add(sym); setQ(''); setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) addSym(matches[0].sym); else if (q.trim()) addSym(q); }
      else if (e.key === 'Escape') { setQ(''); setOpen(false); }
    };

    const sameSector = self ? uni.filter((u) => u.sym !== symbol && u.sector === self.sector).map((u) => u.sym) : [];
    const sameSub = self ? uni.filter((u) => u.sym !== symbol && u.sub && u.sub === self.sub).map((u) => u.sym) : [];
    const atCap = peers.length >= MAX_PEERS;

    return (
      <div className="peeredit">
        <div className="peeredit-row">
          <span className="peeredit-label">Peer set</span>
          <span className="peeredit-count">{peers.length}/{MAX_PEERS}{isCustom && <span className="peeredit-badge">custom</span>}</span>
          {self && <span className="peeredit-chip self" title={`${symbol} — subject company`}>{symbol}</span>}
          {peers.map((s) => {
            const u = uniBySym(s);
            return (
              <span key={s} className="peeredit-chip" title={u ? `${s} — ${u.name}` : s}>
                {s}<button className="peeredit-x" onClick={() => remove(s)} title="Remove from peer set">×</button>
              </span>
            );
          })}
          {peers.length === 0 && <span className="peeredit-empty">no peers — add tickers below</span>}
        </div>
        <div className="peeredit-controls">
          <div className="peeredit-add">
            <input
              value={q}
              placeholder={atCap ? `Max ${MAX_PEERS} peers — remove one to add` : 'Add ticker or company…'}
              disabled={atCap}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKey}
            />
            {open && matches.length > 0 && (
              <div className="peeredit-drop">
                {matches.map((u) => (
                  <button key={u.sym} className="peeredit-opt" onMouseDown={(e) => { e.preventDefault(); addSym(u.sym); }}>
                    <b>{u.sym}</b><span className="peeredit-opt-name">{u.name}</span><span className="peeredit-opt-sec">{u.sector}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="peeredit-quick" disabled={atCap || !sameSector.length} onClick={() => addBatch(sameSector)} title="Add all same-sector names">+ Sector</button>
          <button className="peeredit-quick" disabled={atCap || !sameSub.length} onClick={() => addBatch(sameSub)} title="Add same sub-industry names">+ Sub-industry</button>
          {isCustom && <button className="peeredit-quick reset" onClick={reset} title="Restore default same-sector peers">↺ Reset</button>}
        </div>
      </div>
    );
  };
  window.PeerEditor = PeerEditor;
})();
