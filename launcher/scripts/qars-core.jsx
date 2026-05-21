// ================================================================
// Qars Core — cross-cutting infrastructure for the terminal
// Provides: SymbolStore, MarketSession, useLiveClock, Toaster,
// CommandPalette, AlertsPanel, BellPanel, OrderTicket, ContextMenu,
// LayoutsManager, ShortcutsOverlay, SettingsPanel, FirstRunFlow,
// EmptyState, ErrorState, Skeleton, and the cross-piece glue.
// Loaded BEFORE app.jsx so app.jsx can import via window.Qars.
// ================================================================

const { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============================================================
   1. SETTINGS STORE  (timezone, currency, density, density)
   ============================================================ */
const SETTINGS_KEY = 'qars-settings-v1';
const DEFAULT_SETTINGS = {
  timezone: 'Asia/Jakarta',          // 'Asia/Jakarta' | 'America/New_York' | 'Europe/London' | 'UTC'
  currency: 'IDR',                   // 'IDR' | 'USD'
  density: 'comfortable',            // 'comfortable' | 'compact'
  reducedMotion: false,
  colorblindGlyphs: true,
  showSourceLabels: true,
  defaultLayout: 'Markets — default',
};

const SettingsCtx = createContext(null);
const useSettings = () => useContext(SettingsCtx);

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch { return DEFAULT_SETTINGS; }
  });
  const update = useCallback((patch) => {
    setSettings(s => {
      const next = typeof patch === 'function' ? patch(s) : { ...s, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  // Apply density attribute on <body> for CSS hooks
  useEffect(() => {
    document.body.dataset.density = settings.density;
    document.body.dataset.reducedMotion = settings.reducedMotion ? '1' : '0';
    document.body.dataset.colorblind = settings.colorblindGlyphs ? '1' : '0';
  }, [settings.density, settings.reducedMotion, settings.colorblindGlyphs]);

  return <SettingsCtx.Provider value={{ settings, update }}>{children}</SettingsCtx.Provider>;
};

/* ============================================================
   2. LIVE CLOCK + MARKET SESSION
   ============================================================ */
const useLiveClock = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

// IDX trading hours: Mon–Fri 09:00–11:30, 13:30–15:30 WIB
// Returns: { state: 'pre-open' | 'open' | 'lunch' | 'closed' | 'weekend', label, asOf }
const computeIdxSession = (now) => {
  // Convert "now" to WIB (UTC+7)
  const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const day = wib.getDay(); // 0 Sun, 6 Sat
  const minutes = wib.getHours() * 60 + wib.getMinutes();
  if (day === 0 || day === 6) return { state: 'weekend', label: 'Weekend', asOf: 'IDX closed' };
  if (minutes < 540)            return { state: 'pre-open', label: 'Pre-open',   asOf: 'Opens 09:00 WIB' };
  if (minutes < 690)            return { state: 'open',     label: 'Session 1',  asOf: 'Lunch break 11:30' };
  if (minutes < 810)            return { state: 'lunch',    label: 'Lunch',      asOf: 'Resumes 13:30 WIB' };
  if (minutes < 930)            return { state: 'open',     label: 'Session 2',  asOf: 'Closes 15:30 WIB' };
  return { state: 'closed', label: 'Closed', asOf: 'Reopens 09:00 WIB' };
};

const useMarketSession = () => {
  const now = useLiveClock(15000); // 15s polling is plenty for session state
  return useMemo(() => computeIdxSession(now), [now]);
};

const formatClock = (date, tz) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: tz,
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 8);
  }
};

const tzAbbr = {
  'Asia/Jakarta': 'WIB',
  'America/New_York': 'ET',
  'Europe/London': 'BST',
  'UTC': 'UTC',
};

/* ============================================================
   3. SYMBOL STORE — single source of truth for prices
   Pretends to be a real-time feed but uses deterministic walks
   so all widgets agree on the price for a given symbol.
   ============================================================ */
const SymbolCtx = createContext(null);
const useSymbols = () => useContext(SymbolCtx);

// Seed prices — kept consistent with TICKER_UNIVERSE
const SEED_PRICES = {
  BBCA: 11250, BMRI: 7350,  BBRI: 5825, TLKM: 3920, ASII: 5675,
  GOTO: 92,    BREN: 8200,  ICBP: 12450, AAPL: 187.42, NVDA: 612.30,
  MSFT: 412.85, GOOGL: 168.30, TSLA: 192.40, JPM: 198.25, BTC: 64280,
};

const SymbolProvider = ({ children }) => {
  const [prices, setPrices] = useState(() => ({ ...SEED_PRICES }));
  const [staleness, setStaleness] = useState(() => {
    const out = {};
    Object.keys(SEED_PRICES).forEach(k => { out[k] = 'delayed-15m'; });
    return out;
  });
  // Seed change vectors — fixed at session start so colors are stable
  const [chgVectors] = useState(() => {
    const out = {};
    const seeds = { BBCA: 0.27, BMRI: -0.14, BBRI: 0.41, TLKM: 0.85, ASII: -0.32,
                    GOTO: 1.10, BREN: -0.55, ICBP: 0.18, AAPL: 0.21, NVDA: 1.42,
                    MSFT: 0.34, GOOGL: -0.08, TSLA: -0.92, JPM: 0.18, BTC: 0.84 };
    Object.entries(SEED_PRICES).forEach(([sym, base]) => {
      const pct = seeds[sym] ?? ((Math.sin(sym.charCodeAt(0) * 7) * 1.3));
      out[sym] = { chgPct: pct, chg: base * pct / 100, prev: base / (1 + pct/100) };
    });
    return out;
  });

  // Fake live updates — gentle random walk every 4s
  useEffect(() => {
    const id = setInterval(() => {
      setPrices(p => {
        const next = { ...p };
        Object.keys(next).forEach(sym => {
          const drift = (Math.random() - 0.5) * 0.0006; // ±0.06%
          next[sym] = +(next[sym] * (1 + drift)).toFixed(sym === 'BTC' ? 0 : sym.length === 4 ? 0 : 2);
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const getQuote = useCallback((sym) => {
    const last = prices[sym] ?? SEED_PRICES[sym] ?? 0;
    const v = chgVectors[sym] || { chgPct: 0, chg: 0, prev: last };
    return { last, chg: v.chg, chgPct: v.chgPct, prev: v.prev, source: 'IDX delayed 15m', staleness: staleness[sym] || 'delayed-15m' };
  }, [prices, chgVectors, staleness]);

  return <SymbolCtx.Provider value={{ prices, getQuote }}>{children}</SymbolCtx.Provider>;
};

/* ============================================================
   4. UNDO BUS — toaster + undo stack
   ============================================================ */
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((toast) => {
    const id = ++idRef.current;
    setToasts(ts => [...ts, { ...toast, id }]);
    const ttl = toast.ttl ?? 6000;
    if (ttl > 0) setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), ttl);
    return id;
  }, []);
  const dismiss = useCallback((id) => setToasts(ts => ts.filter(t => t.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="qx-toaster" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className={`qx-toast qx-toast-${t.kind || 'info'}`} role="status">
            <div className="qx-toast-body">
              {t.icon && <span className="qx-toast-icon" aria-hidden="true">{t.icon}</span>}
              <div className="qx-toast-text">
                {t.title && <div className="qx-toast-title">{t.title}</div>}
                {t.message && <div className="qx-toast-msg">{t.message}</div>}
              </div>
            </div>
            <div className="qx-toast-actions">
              {t.undo && (
                <button className="qx-toast-undo" onClick={() => { t.undo(); dismiss(t.id); }}>
                  Undo
                </button>
              )}
              <button className="qx-toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

/* ============================================================
   5. ALERTS STORE
   ============================================================ */
const AlertsCtx = createContext(null);
const useAlerts = () => useContext(AlertsCtx);
const ALERTS_KEY = 'qars-alerts-v1';
const SEED_ALERTS = [
  { id: 'a1', kind: 'price',    symbol: 'BBCA', condition: 'above', value: 11500, status: 'armed',     created: 'Apr 28 09:14' },
  { id: 'a2', kind: 'price',    symbol: 'NVDA', condition: 'below', value: 600,   status: 'triggered', created: 'Apr 27 21:02', firedAt: 'Apr 28 14:32' },
  { id: 'a3', kind: 'news',     symbol: 'GOTO', condition: 'any',   keywords: 'rights issue', status: 'armed', created: 'Apr 28 10:05' },
  { id: 'a4', kind: 'earnings', symbol: 'BBRI', condition: 'window 24h', status: 'armed', created: 'Apr 25 16:40' },
];
const AlertsProvider = ({ children }) => {
  const [alerts, setAlerts] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ALERTS_KEY)); return s?.length ? s : SEED_ALERTS; } catch { return SEED_ALERTS; }
  });
  useEffect(() => { try { localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts)); } catch {} }, [alerts]);
  const add = useCallback((a) => setAlerts(xs => [{ ...a, id: 'a' + Date.now(), status: 'armed', created: 'just now' }, ...xs]), []);
  const remove = useCallback((id) => setAlerts(xs => xs.filter(a => a.id !== id)), []);
  const update = useCallback((id, patch) => setAlerts(xs => xs.map(a => a.id === id ? { ...a, ...patch } : a)), []);
  const armedCount = alerts.filter(a => a.status === 'armed').length;
  const triggeredCount = alerts.filter(a => a.status === 'triggered').length;
  return <AlertsCtx.Provider value={{ alerts, add, remove, update, armedCount, triggeredCount }}>{children}</AlertsCtx.Provider>;
};

/* ============================================================
   6. WATCHLIST STORE — for "Add to watchlist" right-click action
   ============================================================ */
const WatchCtx = createContext(null);
const useWatch = () => useContext(WatchCtx);
const WATCH_KEY = 'qars-watch-v1';
const WatchProvider = ({ children }) => {
  const [lists, setLists] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(WATCH_KEY)); return s || { 'My List': ['BBCA','BMRI','TLKM'] }; }
    catch { return { 'My List': ['BBCA','BMRI','TLKM'] }; }
  });
  useEffect(() => { try { localStorage.setItem(WATCH_KEY, JSON.stringify(lists)); } catch {} }, [lists]);
  const addTo = useCallback((listName, sym) => setLists(s => {
    const cur = s[listName] || [];
    if (cur.includes(sym)) return s;
    return { ...s, [listName]: [...cur, sym] };
  }), []);
  const removeFrom = useCallback((listName, sym) => setLists(s => ({ ...s, [listName]: (s[listName] || []).filter(x => x !== sym) })), []);
  return <WatchCtx.Provider value={{ lists, addTo, removeFrom }}>{children}</WatchCtx.Provider>;
};

/* ============================================================
   7. LAYOUTS STORE — saved dashboards
   ============================================================ */
const LayoutsCtx = createContext(null);
const useLayouts = () => useContext(LayoutsCtx);
const LAYOUTS_KEY = 'qars-layouts-v1';
const SEED_LAYOUTS = [
  { id: 'L1', name: 'Markets — default',     workspace: 'markets', isDefault: true,  modified: 'Apr 28 14:58' },
  { id: 'L2', name: 'Earnings season',       workspace: 'markets', isDefault: false, modified: 'Apr 22 09:03' },
  { id: 'L3', name: 'IDX intraday',          workspace: 'markets', isDefault: false, modified: 'Apr 18 11:42' },
  { id: 'L4', name: 'Macro morning brief',   workspace: 'macro',   isDefault: false, modified: 'Apr 26 08:11' },
];
const LayoutsProvider = ({ children }) => {
  const [layouts, setLayouts] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(LAYOUTS_KEY)); return s?.length ? s : SEED_LAYOUTS; } catch { return SEED_LAYOUTS; }
  });
  useEffect(() => { try { localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts)); } catch {} }, [layouts]);
  const rename = (id, name) => setLayouts(xs => xs.map(l => l.id === id ? { ...l, name } : l));
  const remove = (id) => setLayouts(xs => xs.filter(l => l.id !== id));
  const duplicate = (id) => setLayouts(xs => {
    const src = xs.find(l => l.id === id); if (!src) return xs;
    return [...xs, { ...src, id: 'L' + Date.now(), name: src.name + ' (copy)', isDefault: false, modified: 'just now' }];
  });
  const setDefault = (id) => setLayouts(xs => xs.map(l => ({ ...l, isDefault: l.id === id })));
  const create = (name, workspace) => setLayouts(xs => [...xs, { id: 'L' + Date.now(), name, workspace, isDefault: false, modified: 'just now' }]);
  return <LayoutsCtx.Provider value={{ layouts, rename, remove, duplicate, setDefault, create }}>{children}</LayoutsCtx.Provider>;
};

/* ============================================================
   8. CONTEXT MENU — right-click on symbols
   ============================================================ */
const CtxMenuCtx = createContext(null);
const useCtxMenu = () => useContext(CtxMenuCtx);

const ContextMenuProvider = ({ children }) => {
  const [menu, setMenu] = useState(null); // { x, y, items }
  const open = useCallback((x, y, items) => setMenu({ x, y, items }), []);
  const close = useCallback(() => setMenu(null), []);
  useEffect(() => {
    if (!menu) return;
    const onClick = () => close();
    const onEsc = (e) => e.key === 'Escape' && close();
    setTimeout(() => document.addEventListener('click', onClick), 0);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menu, close]);
  return (
    <CtxMenuCtx.Provider value={{ open, close }}>
      {children}
      {menu && (
        <div className="qx-ctxmenu" role="menu" style={{ left: menu.x, top: menu.y }}>
          {menu.items.map((it, i) => it === '---' ? (
            <div key={i} className="qx-ctxmenu-sep" />
          ) : (
            <div key={i}
                 className={`qx-ctxmenu-item ${it.danger ? 'danger' : ''} ${it.disabled ? 'disabled' : ''}`}
                 role="menuitem"
                 onClick={() => { if (it.disabled) return; it.onClick && it.onClick(); close(); }}>
              {it.icon && <span className="qx-ctxmenu-icon" aria-hidden="true">{it.icon}</span>}
              <span className="qx-ctxmenu-label">{it.label}</span>
              {it.shortcut && <span className="qx-ctxmenu-shortcut">{it.shortcut}</span>}
            </div>
          ))}
        </div>
      )}
    </CtxMenuCtx.Provider>
  );
};

/* ============================================================
   9. COMMAND PALETTE
   ============================================================ */
const PaletteCtx = createContext(null);
const usePalette = () => useContext(PaletteCtx);

const PaletteProvider = ({ children, registry }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const on = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
      if (isCmdK || isSlash) { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open]);

  useEffect(() => { if (open) { setQ(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const items = useMemo(() => {
    if (!registry) return [];
    return registry.getItems(q);
  }, [q, registry]);

  const run = (item) => { setOpen(false); item.run && item.run(); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(items.length - 1, c + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    if (e.key === 'Enter')     { e.preventDefault(); items[cursor] && run(items[cursor]); }
  };

  return (
    <PaletteCtx.Provider value={{ open, setOpen }}>
      {children}
      {open && (
        <div className="qx-palette-backdrop" onClick={() => setOpen(false)}>
          <div className="qx-palette" role="dialog" aria-label="Command palette" onClick={e => e.stopPropagation()}>
            <div className="qx-palette-input-wrap">
              <span className="qx-palette-prompt" aria-hidden="true">&gt;</span>
              <input
                ref={inputRef}
                className="qx-palette-input"
                placeholder="Symbol, function, or command — try BBCA, alert, layout…"
                value={q}
                onChange={e => { setQ(e.target.value); setCursor(0); }}
                onKeyDown={onKey}
                aria-label="Command query"
                spellCheck={false}
              />
              <span className="qx-palette-hint">↑↓ navigate · ↵ run · esc close</span>
            </div>
            <div className="qx-palette-list" role="listbox">
              {items.length === 0 && (
                <div className="qx-palette-empty">No matches. Try a ticker (BBCA), a verb (alert, buy), or a workspace (markets, scanners).</div>
              )}
              {items.map((it, i) => (
                <div key={it.id}
                     className={`qx-palette-item ${i === cursor ? 'sel' : ''}`}
                     role="option" aria-selected={i === cursor}
                     onMouseEnter={() => setCursor(i)}
                     onClick={() => run(it)}>
                  <span className="qx-palette-icon" aria-hidden="true">{it.icon || '·'}</span>
                  <div className="qx-palette-main">
                    <div className="qx-palette-title">
                      {it.title}
                      {it.kind && <span className="qx-palette-kind">{it.kind}</span>}
                    </div>
                    {it.subtitle && <div className="qx-palette-sub">{it.subtitle}</div>}
                  </div>
                  {it.shortcut && <span className="qx-palette-shortcut">{it.shortcut}</span>}
                </div>
              ))}
            </div>
            <div className="qx-palette-foot">
              <span><kbd>↑↓</kbd> select</span>
              <span><kbd>↵</kbd> run</span>
              <span><kbd>esc</kbd> close</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>{items.length} results</span>
            </div>
          </div>
        </div>
      )}
    </PaletteCtx.Provider>
  );
};

/* ============================================================
   10. SHORTCUTS OVERLAY  (?)
   ============================================================ */
const ShortcutsCtx = createContext(null);
const useShortcuts = () => useContext(ShortcutsCtx);

const SHORTCUT_GROUPS = [
  { name: 'Global', items: [
    { keys: ['⌘','K'],            label: 'Open command palette' },
    { keys: ['/'],                label: 'Quick search / palette' },
    { keys: ['?'],                label: 'Show keyboard shortcuts' },
    { keys: ['esc'],              label: 'Close dialog / overlay' },
    { keys: ['g','m'],            label: 'Go to Markets' },
    { keys: ['g','s'],            label: 'Go to Stock' },
    { keys: ['g','c'],            label: 'Go to Scanners' },
    { keys: ['g','p'],            label: 'Go to Portfolio' },
  ]},
  { name: 'Symbol', items: [
    { keys: ['a'],                label: 'Add price alert' },
    { keys: ['w'],                label: 'Add to watchlist' },
    { keys: ['o'],                label: 'Open order ticket' },
    { keys: ['c'],                label: 'Open in chart' },
    { keys: ['n'],                label: 'New thesis note' },
  ]},
  { name: 'Editing', items: [
    { keys: ['e'],                label: 'Toggle edit-layout mode' },
    { keys: ['⌘','Z'],            label: 'Undo last destructive action' },
    { keys: ['⌘','S'],            label: 'Save current layout' },
  ]},
];

const ShortcutsProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e) => {
      if (e.key === '?' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault(); setOpen(true);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open]);
  return (
    <ShortcutsCtx.Provider value={{ open, setOpen }}>
      {children}
      {open && (
        <div className="qx-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="qx-modal qx-shortcuts" onClick={e => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
            <div className="qx-modal-header">
              <h2>Keyboard shortcuts</h2>
              <button className="qx-modal-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="qx-shortcuts-grid">
              {SHORTCUT_GROUPS.map(g => (
                <div key={g.name} className="qx-shortcuts-group">
                  <div className="qx-shortcuts-h">{g.name}</div>
                  {g.items.map((it, i) => (
                    <div key={i} className="qx-shortcuts-row">
                      <span className="qx-shortcuts-label">{it.label}</span>
                      <span className="qx-shortcuts-keys">
                        {it.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="qx-modal-foot">
              <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Press ? anywhere to reopen this panel.</span>
            </div>
          </div>
        </div>
      )}
    </ShortcutsCtx.Provider>
  );
};

/* ============================================================
   11. ORDER TICKET (mock)
   ============================================================ */
const OrderTicketCtx = createContext(null);
const useOrderTicket = () => useContext(OrderTicketCtx);

const OrderTicketProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, symbol: 'BBCA', side: 'buy' });
  const openTicket = (symbol, side = 'buy') => setState({ open: true, symbol, side });
  const close = () => setState(s => ({ ...s, open: false }));
  return (
    <OrderTicketCtx.Provider value={{ openTicket, close }}>
      {children}
      {state.open && <OrderTicket symbol={state.symbol} initialSide={state.side} onClose={close} />}
    </OrderTicketCtx.Provider>
  );
};

const OrderTicket = ({ symbol, initialSide, onClose }) => {
  const { getQuote } = useSymbols() || { getQuote: () => ({ last: 0, chgPct: 0 }) };
  const { push } = useToast() || { push: () => {} };
  const q = getQuote(symbol);
  const [side, setSide] = useState(initialSide);
  const [orderType, setOrderType] = useState('market');
  const [tif, setTif] = useState('day');
  const [qty, setQty] = useState(1000);
  const [limitPx, setLimitPx] = useState(q.last);
  const [stopPx, setStopPx] = useState(q.last * 0.98);
  const px = orderType === 'market' ? q.last : orderType === 'limit' ? Number(limitPx) : Number(stopPx);
  const total = px * qty;

  const submit = () => {
    push({
      kind: 'success',
      title: `Mock order routed (paper)`,
      message: `${side.toUpperCase()} ${qty} ${symbol} @ ${orderType === 'market' ? 'MKT' : px} · TIF ${tif.toUpperCase()}`,
      icon: '✓',
    });
    onClose();
  };

  return (
    <div className="qx-modal-backdrop" onClick={onClose}>
      <div className="qx-modal qx-ticket" onClick={e => e.stopPropagation()} role="dialog" aria-label="Order ticket">
        <div className="qx-ticket-h">
          <div>
            <div className="qx-ticket-sym">{symbol}</div>
            <div className="qx-ticket-quote">
              <span>Last <b className="num">{q.last.toLocaleString()}</b></span>
              <span className={q.chgPct >= 0 ? 'pos' : 'neg'}>
                {q.chgPct >= 0 ? '▲' : '▼'} {q.chgPct >= 0 ? '+' : ''}{q.chgPct.toFixed(2)}%
              </span>
            </div>
          </div>
          <button className="qx-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="qx-ticket-side">
          <button className={`qx-side-btn buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>BUY</button>
          <button className={`qx-side-btn sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>SELL</button>
        </div>
        <div className="qx-ticket-grid">
          <label>Order type
            <select value={orderType} onChange={e => setOrderType(e.target.value)}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop-limit">Stop-Limit</option>
            </select>
          </label>
          <label>Time in force
            <select value={tif} onChange={e => setTif(e.target.value)}>
              <option value="day">Day</option>
              <option value="gtc">Good-til-Cancel</option>
              <option value="ioc">Immediate-or-Cancel</option>
              <option value="fok">Fill-or-Kill</option>
            </select>
          </label>
          <label>Quantity (shares)
            <input type="number" value={qty} min={1} step={100} onChange={e => setQty(+e.target.value || 0)} />
          </label>
          {orderType !== 'market' && orderType !== 'stop' && (
            <label>Limit price
              <input type="number" value={limitPx} step={1} onChange={e => setLimitPx(+e.target.value || 0)} />
            </label>
          )}
          {(orderType === 'stop' || orderType === 'stop-limit') && (
            <label>Stop price
              <input type="number" value={stopPx} step={1} onChange={e => setStopPx(+e.target.value || 0)} />
            </label>
          )}
        </div>
        <div className="qx-ticket-summary">
          <div><span>Estimated total</span><b className="num">{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></div>
          <div><span>Est. commission</span><b className="num">{Math.max(5000, total * 0.0015).toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></div>
          <div><span>Est. settlement</span><b>T+2</b></div>
        </div>
        <div className="qx-ticket-warning">
          ⓘ Paper-trading mock. No order is routed to an exchange. Wire to broker to enable live execution.
        </div>
        <div className="qx-ticket-actions">
          <button className="qx-btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`qx-btn-primary ${side}`} onClick={submit}>Preview {side.toUpperCase()}</button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   12. ALERTS PANEL & BELL PANEL
   ============================================================ */
const AlertsPanel = ({ open, onClose }) => {
  const { alerts, add, remove } = useAlerts();
  const [draft, setDraft] = useState({ kind: 'price', symbol: 'BBCA', condition: 'above', value: '' });
  if (!open) return null;
  const submit = () => {
    if (!draft.symbol || !draft.value) return;
    add({ ...draft, value: draft.kind === 'price' ? Number(draft.value) : draft.value });
    setDraft({ kind: 'price', symbol: '', condition: 'above', value: '' });
  };
  return (
    <div className="qx-modal-backdrop" onClick={onClose}>
      <div className="qx-modal qx-alerts" onClick={e => e.stopPropagation()} role="dialog" aria-label="Alerts">
        <div className="qx-modal-header">
          <h2>Alerts</h2>
          <button className="qx-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="qx-alerts-new">
          <div className="qx-alerts-new-h">Create alert</div>
          <div className="qx-alerts-form">
            <label>Type
              <select value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))}>
                <option value="price">Price</option>
                <option value="news">News keyword</option>
                <option value="earnings">Earnings window</option>
              </select>
            </label>
            <label>Symbol
              <input value={draft.symbol} onChange={e => setDraft(d => ({ ...d, symbol: e.target.value.toUpperCase() }))} placeholder="BBCA" />
            </label>
            {draft.kind === 'price' && (
              <>
                <label>Condition
                  <select value={draft.condition} onChange={e => setDraft(d => ({ ...d, condition: e.target.value }))}>
                    <option value="above">crosses above</option>
                    <option value="below">crosses below</option>
                    <option value="moves">% moves</option>
                  </select>
                </label>
                <label>Value
                  <input type="number" value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} placeholder="11500" />
                </label>
              </>
            )}
            {draft.kind === 'news' && (
              <label style={{ gridColumn: 'span 2' }}>Keywords
                <input value={draft.value} onChange={e => setDraft(d => ({ ...d, value: e.target.value }))} placeholder="rights issue, dividend" />
              </label>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="qx-btn-primary" onClick={submit}>+ Create alert</button>
            </div>
          </div>
        </div>
        <div className="qx-alerts-list">
          <div className="qx-alerts-list-h">
            <span>Active alerts ({alerts.length})</span>
          </div>
          {alerts.length === 0 && <div className="qx-empty-mini">No alerts yet. Create one above.</div>}
          {alerts.map(a => (
            <div key={a.id} className={`qx-alert-row qx-alert-${a.status}`}>
              <span className="qx-alert-kind">{a.kind}</span>
              <span className="qx-alert-sym mono">{a.symbol}</span>
              <span className="qx-alert-cond">
                {a.kind === 'price'    && `${a.condition} ${a.value}`}
                {a.kind === 'news'     && `keywords: ${a.keywords || a.value}`}
                {a.kind === 'earnings' && a.condition}
              </span>
              <span className={`qx-alert-status ${a.status}`}>{a.status}</span>
              <span className="qx-alert-meta">{a.firedAt || a.created}</span>
              <button className="qx-alert-del" aria-label="Delete alert" onClick={() => remove(a.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BellPanel = ({ open, onClose, anchor }) => {
  const { alerts, update } = useAlerts();
  if (!open) return null;
  const triggered = alerts.filter(a => a.status === 'triggered');
  const armed = alerts.filter(a => a.status === 'armed').slice(0, 5);
  return (
    <div className="qx-popover-backdrop" onClick={onClose}>
      <div className={`qx-bell-pop`} onClick={e => e.stopPropagation()} role="dialog" aria-label="Notifications">
        <div className="qx-bell-h">Notifications</div>
        <div className="qx-bell-body">
          {triggered.length === 0 && armed.length === 0 && (
            <div className="qx-empty-mini">No alerts firing. Create alerts to get notified.</div>
          )}
          {triggered.length > 0 && <div className="qx-bell-section">Triggered</div>}
          {triggered.map(a => (
            <div key={a.id} className="qx-bell-row triggered">
              <span className="qx-bell-icon">▲</span>
              <div>
                <div className="qx-bell-title">{a.symbol} {a.condition} {a.value}</div>
                <div className="qx-bell-sub">{a.firedAt}</div>
              </div>
              <button className="qx-bell-ack" onClick={() => update(a.id, { status: 'acked' })}>Ack</button>
            </div>
          ))}
          {armed.length > 0 && <div className="qx-bell-section">Armed</div>}
          {armed.map(a => (
            <div key={a.id} className="qx-bell-row">
              <span className="qx-bell-icon" aria-hidden="true">○</span>
              <div>
                <div className="qx-bell-title">{a.symbol} {a.kind} alert</div>
                <div className="qx-bell-sub">{a.kind === 'price' ? `${a.condition} ${a.value}` : (a.keywords || a.condition)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   13. SETTINGS PANEL
   ============================================================ */
const SettingsPanel = ({ open, onClose }) => {
  const { settings, update } = useSettings();
  if (!open) return null;
  return (
    <div className="qx-modal-backdrop" onClick={onClose}>
      <div className="qx-modal qx-settings" onClick={e => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="qx-modal-header">
          <h2>Settings</h2>
          <button className="qx-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="qx-settings-body">
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Time zone</div>
              <div className="qx-settings-help">All timestamps display in this zone.</div>
            </div>
            <select value={settings.timezone} onChange={e => update({ timezone: e.target.value })}>
              <option value="Asia/Jakarta">Asia/Jakarta (WIB · UTC+7)</option>
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="Europe/London">Europe/London (BST/GMT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Currency</div>
              <div className="qx-settings-help">Used for portfolio totals.</div>
            </div>
            <select value={settings.currency} onChange={e => update({ currency: e.target.value })}>
              <option value="IDR">Indonesian Rupiah (IDR)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Density</div>
              <div className="qx-settings-help">Compact fits more rows on screen.</div>
            </div>
            <div className="qx-segctl">
              <button className={settings.density === 'comfortable' ? 'active' : ''} onClick={() => update({ density: 'comfortable' })}>Comfortable</button>
              <button className={settings.density === 'compact' ? 'active' : ''} onClick={() => update({ density: 'compact' })}>Compact</button>
            </div>
          </div>
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Color-blind glyphs (▲▼)</div>
              <div className="qx-settings-help">Add direction arrows next to colored values.</div>
            </div>
            <Toggle on={settings.colorblindGlyphs} onChange={v => update({ colorblindGlyphs: v })} />
          </div>
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Reduced motion</div>
              <div className="qx-settings-help">Pauses ticker scroll and disables transitions.</div>
            </div>
            <Toggle on={settings.reducedMotion} onChange={v => update({ reducedMotion: v })} />
          </div>
          <div className="qx-settings-row">
            <div>
              <div className="qx-settings-label">Show data sources</div>
              <div className="qx-settings-help">FRED-style attribution chips on charts and tables.</div>
            </div>
            <Toggle on={settings.showSourceLabels} onChange={v => update({ showSourceLabels: v })} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Toggle = ({ on, onChange }) => (
  <button className={`qx-toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
    <span className="qx-toggle-knob" />
  </button>
);

/* ============================================================
   14. LAYOUTS MANAGER
   ============================================================ */
const LayoutsManager = ({ open, onClose, currentWorkspace }) => {
  const { layouts, rename, remove, duplicate, setDefault, create } = useLayouts();
  const { push } = useToast() || { push: () => {} };
  const [editing, setEditing] = useState(null); // id
  const [draft, setDraft] = useState('');
  const [newName, setNewName] = useState('');
  if (!open) return null;
  const startRename = (l) => { setEditing(l.id); setDraft(l.name); };
  const commitRename = () => { if (editing && draft.trim()) rename(editing, draft.trim()); setEditing(null); };
  const onCreate = () => {
    if (!newName.trim()) return;
    create(newName.trim(), currentWorkspace || 'markets');
    push({ kind: 'success', message: `Created layout "${newName.trim()}"`, icon: '✓' });
    setNewName('');
  };
  return (
    <div className="qx-modal-backdrop" onClick={onClose}>
      <div className="qx-modal qx-layouts" onClick={e => e.stopPropagation()} role="dialog" aria-label="Saved layouts">
        <div className="qx-modal-header">
          <h2>Saved layouts</h2>
          <button className="qx-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="qx-layouts-create">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New layout name…" onKeyDown={e => e.key === 'Enter' && onCreate()} />
          <button className="qx-btn-primary" onClick={onCreate}>+ Save current as…</button>
        </div>
        <div className="qx-layouts-list">
          <div className="qx-layouts-h">
            <span>Name</span><span>Workspace</span><span>Modified</span><span></span>
          </div>
          {layouts.map(l => (
            <div key={l.id} className="qx-layout-row">
              {editing === l.id ? (
                <input className="qx-layout-edit" value={draft} autoFocus
                       onChange={e => setDraft(e.target.value)}
                       onBlur={commitRename}
                       onKeyDown={e => e.key === 'Enter' && commitRename()} />
              ) : (
                <span className="qx-layout-name">
                  {l.name}
                  {l.isDefault && <span className="qx-layout-default">default</span>}
                </span>
              )}
              <span className="qx-layout-ws">{l.workspace}</span>
              <span className="qx-layout-mod">{l.modified}</span>
              <span className="qx-layout-actions">
                <button onClick={() => setDefault(l.id)} disabled={l.isDefault} title="Set as default">★</button>
                <button onClick={() => duplicate(l.id)} title="Duplicate">⎘</button>
                <button onClick={() => startRename(l)} title="Rename">✎</button>
                <button onClick={() => {
                  const snap = l;
                  remove(l.id);
                  push({ kind: 'info', message: `Deleted layout "${snap.name}"`, undo: () => create(snap.name, snap.workspace), icon: '⌫' });
                }} title="Delete" className="danger">×</button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   15. EMPTY / ERROR / SKELETON STATES
   ============================================================ */
const EmptyState = ({ icon, title, message, action }) => (
  <div className="qx-empty">
    <div className="qx-empty-icon" aria-hidden="true">{icon || '○'}</div>
    <div className="qx-empty-title">{title}</div>
    {message && <div className="qx-empty-msg">{message}</div>}
    {action && <button className="qx-btn-primary" onClick={action.onClick}>{action.label}</button>}
  </div>
);

const ErrorState = ({ title, message, onRetry }) => (
  <div className="qx-empty qx-error">
    <div className="qx-empty-icon" aria-hidden="true">!</div>
    <div className="qx-empty-title">{title || 'Could not load'}</div>
    {message && <div className="qx-empty-msg">{message}</div>}
    {onRetry && <button className="qx-btn-ghost" onClick={onRetry}>↻ Retry</button>}
  </div>
);

const Skeleton = ({ rows = 4, cols = 5 }) => (
  <div className="qx-skeleton" aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="qx-skeleton-row">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="qx-skeleton-cell" style={{ width: `${20 + (((r + c) * 17) % 60)}%` }} />
        ))}
      </div>
    ))}
  </div>
);

/* ============================================================
   16. SOURCE BADGE  (FRED-style attribution)
   ============================================================ */
const SourceBadge = ({ source, asOf }) => {
  const { settings } = useSettings();
  if (!settings.showSourceLabels) return null;
  return (
    <span className="qx-source-badge" title={`Source: ${source}${asOf ? ' · as of ' + asOf : ''}`}>
      <span className="qx-source-dot" aria-hidden="true" />
      <span className="qx-source-text">{source}{asOf ? ` · ${asOf}` : ''}</span>
    </span>
  );
};

/* ============================================================
   17. DELTA  (▲▼ + colored % combo, used everywhere)
   ============================================================ */
const Delta = ({ value, suffix = '%', precision = 2, asPct = true }) => {
  const { settings } = useSettings();
  const isPos = value >= 0;
  const isFlat = value === 0;
  const cls = isFlat ? 'flat' : isPos ? 'pos' : 'neg';
  const glyph = settings.colorblindGlyphs ? (isFlat ? '◆' : isPos ? '▲' : '▼') : '';
  const sign = isPos && !isFlat ? '+' : '';
  const v = asPct ? value.toFixed(precision) : Math.round(value).toLocaleString();
  return (
    <span className={`chg-text ${cls}`}>
      {glyph && <span className="qx-glyph" aria-hidden="true">{glyph}</span>}
      {sign}{v}{asPct ? suffix : ''}
    </span>
  );
};

/* ============================================================
   18. ROOT PROVIDER  (composes everything)
   ============================================================ */
const QarsRoot = ({ children, paletteRegistry }) => {
  return (
    <SettingsProvider>
      <SymbolProvider>
        <ToastProvider>
          <AlertsProvider>
            <WatchProvider>
              <LayoutsProvider>
                <ContextMenuProvider>
                  <PaletteProvider registry={paletteRegistry}>
                    <ShortcutsProvider>
                      <OrderTicketProvider>
                        {children}
                      </OrderTicketProvider>
                    </ShortcutsProvider>
                  </PaletteProvider>
                </ContextMenuProvider>
              </LayoutsProvider>
            </WatchProvider>
          </AlertsProvider>
        </ToastProvider>
      </SymbolProvider>
    </SettingsProvider>
  );
};

/* ============================================================
   EXPORTS
   ============================================================ */
Object.assign(window, {
  Qars: {
    QarsRoot,
    // hooks
    useSettings, useSymbols, useToast, useAlerts, useWatch,
    useLayouts, useCtxMenu, usePalette, useShortcuts, useOrderTicket,
    useLiveClock, useMarketSession,
    // components
    AlertsPanel, BellPanel, SettingsPanel, LayoutsManager,
    OrderTicket, EmptyState, ErrorState, Skeleton, SourceBadge, Delta, Toggle,
    // helpers
    formatClock, tzAbbr, computeIdxSession,
  },
});
