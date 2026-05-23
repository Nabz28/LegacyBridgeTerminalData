// ================================================================
// LBC Shell — Login → Home (7 terminals) → terminal staging.
// Wraps Narin's QarsTerminal AppShell. Loads LAST and owns the mount.
// Per-terminal "workspace manifest": built workspaces render live,
// unbuilt render the NotYet placeholder.
// ================================================================

// ---- icons (small, self-contained so this file has no cross-script deps) ----
const _svg = (d, extra) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round">{d}{extra}</svg>
);
const LBC_ICONS = {
  asset:     _svg(<path d="M3 17l6-6 4 4 8-9"/>, <path d="M14 6h7v7"/>),
  macro:     _svg(<path d="M3 3v18h18"/>, <path d="M7 14l3-4 3 2 4-7"/>),
  industry:  _svg(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>),
  equity:    _svg(<path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z"/>),
  management:_svg(<><rect x="3" y="4" width="18" height="16" rx="0"/><path d="M7 9h4M7 13h4M7 17h2"/><path d="M14.5 8.5l1.7 1.7L20 6.5"/></>),
  network:   _svg(<><circle cx="5" cy="6" r="2.1"/><circle cx="19" cy="7" r="2.1"/><circle cx="12" cy="18" r="2.1"/><path d="M6.8 7.4l4 9M17.4 8.6l-4 8M7 6.4h10"/></>),
  yggdrasil: _svg(<><circle cx="12" cy="5" r="2.3"/><circle cx="6" cy="19" r="2.3"/><circle cx="18" cy="19" r="2.3"/><path d="M12 7.3v3.4M12 10.7c-6 1.4-6 4.4-6 6.1M12 10.7c6 1.4 6 4.4 6 6.1"/></>),
  correlation:_svg(<><rect x="3" y="3" width="18" height="18" rx="0"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>),
  tools:     _svg(<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.9 2.9-2-2 2.9-2.9z"/>),
};

// Narin's custom-auth (public anon/publishable key — safe to ship in client).
const LBC_AUTH = {
  url: 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/auth-login',
  anon: 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7',
  storeKey: 'lbc_auth',
};

// ================================================================
// The 7 terminals + per-terminal workspace manifests.
//   built:true  → renders the existing (live) QarsTerminal workspace.
//   built:false → renders the NotYet placeholder.
//   external    → a separate LBC app to be linked/integrated later.
// ================================================================
const LBC_TERMINALS = [
  { id: 'asset', num: 'T1', name: 'Asset Management', accent: '#6f9cf2', icon: LBC_ICONS.asset,
    desc: 'The book — positions, watchlists, conviction memos, journal & performance.',
    roles: ['admin', 'management'],   // ACCESS MATRIX: management tier only (refine later)
    workspaces: [ { kind: 'am-book', label: 'The Book', built: true } ] },
  { id: 'macro', num: 'T2', name: 'Macro', accent: '#5b8def', icon: LBC_ICONS.macro,
    desc: 'Refinitiv macro across US, Indonesia & China — 9,310 indicators, live from Supabase.',
    workspaces: [ { kind: 'macro-lab', label: 'Indicator Lab', built: true } ] },
  { id: 'industry', num: 'T3', name: 'Industry', accent: '#4f86e0', icon: LBC_ICONS.industry,
    desc: 'Sectors, peer comps and demand-supply structure across the IDX universe.',
    workspaces: [
      { kind: 'industry', label: 'Sector Map',    built: true },
      { kind: 'ind-comps', label: 'Peer Comps',   built: false },
      { kind: 'ind-data',  label: 'Industry Data', built: false },
    ] },
  { id: 'equity', num: 'T4', name: 'Equity', accent: '#83acf0', icon: LBC_ICONS.equity,
    desc: 'Bottom-up single-name deep dive, screeners, scanners and financials.',
    workspaces: [
      // 'Equities' is the single equity entry — its universe browser opens a
      // stock deep-dive (kind 'stock') as a tab. Standalone 'Stock' + the
      // 'Financials' placeholder were removed (redundant). 'markets' is the
      // widget board; 'stock' kind is still rendered when opened from Equities.
      { kind: 'equity-landing', label: 'Equities',   built: true },
      { kind: 'scanners',       label: 'Scanners',   built: true },
      { kind: 'driver-lab',     label: 'Driver Lab', built: true },
      { kind: 'markets',        label: 'Markets',    built: true },
    ] },
  // Embedded apps (own build) — rendered as bare full-bleed iframes inside the
  // shell tab strip (NOT wrapped in AppShell), so no double chrome. They share
  // this origin's localStorage, so the lbc_auth session is mirrored into the
  // keys each app expects (see LBCShell session-bridge effect).
  { id: 'management', num: 'T5', name: 'Management', accent: '#3f72cc', icon: LBC_ICONS.management,
    desc: 'Research lifecycle, KPI tracking & per-analyst scorecards.',
    embed: '/management/', workspaces: [ { kind: 'ext-management', label: 'Management', built: true } ] },
  { id: 'network', num: 'T6', name: 'Network', accent: '#5b8def', icon: LBC_ICONS.network,
    desc: 'Relationship mapper for the LBC team, contacts, clients & talent pipeline.',
    embed: '/network/dashboard/', workspaces: [ { kind: 'ext-network', label: 'Network', built: true } ] },
  { id: 'yggdrasil', num: 'T7', name: 'Yggdrasil', accent: '#6f9cf2', icon: LBC_ICONS.yggdrasil,
    desc: 'Thesis decomposition tree — theses, hypotheses, scenarios & metrics.',
    embed: '/yggdrasil/', workspaces: [ { kind: 'ext-yggdrasil', label: 'Yggdrasil', built: true } ] },
  // Utility toolbox — self-contained tools embedded full-bleed. Autocharter is
  // the first (CSV/Excel → publication-ready Chart.js figures). More tools later.
  { id: 'tools', num: 'T8', name: 'Tools', accent: '#7c9bf2', icon: LBC_ICONS.tools,
    desc: 'Utility toolbox — Autocharter turns CSV/Excel into publication-ready charts. More tools coming.',
    embed: '/autocharter/', workspaces: [ { kind: 'ext-autocharter', label: 'Autocharter', built: true } ] },
];
window.LBC_TERMINALS = LBC_TERMINALS;

// Kinds that map to a real, live QarsTerminal workspace.
const LBC_LIVE_KINDS = new Set(['markets','equity-landing','stock','scanners','driver-lab','macro','macro-lab','industry','portfolio','global']);
window.LBC_LIVE_KINDS = LBC_LIVE_KINDS;

// Access gating — a terminal with `roles` is restricted to those user roles;
// no `roles` = open to any authenticated user.
const lbcCanAccess = (t, user) => !t || !t.roles || (!!user && t.roles.includes(user.role));
window.lbcCanAccess = lbcCanAccess;

// ================================================================
// NotYet — placeholder shown for unbuilt workspaces / external apps.
// ================================================================
const NotYet = ({ title, terminal }) => {
  const ext = terminal && terminal.external;
  return (
    <div className="lbc-notyet">
      <div className="lbc-notyet-inner">
        <div className="lbc-notyet-glyph">◧</div>
        <div className="k">{terminal ? terminal.name : 'Workspace'}</div>
        <h2>{title || 'Not yet'}</h2>
        {ext ? (
          <>
            <p>This terminal is a separate LBC app. It will be wired into the unified shell behind one login. For now you can open it directly.</p>
            <a className="lbc-notyet-ext" href={ext} target="_blank" rel="noopener">Open {terminal.name} ↗</a>
          </>
        ) : (
          <p>Not yet — this workspace is part of the restructure roadmap and hasn't been built. The shell, navigation and design are in place; the data and views land in a later phase.</p>
        )}
      </div>
    </div>
  );
};
window.NotYet = NotYet;

// ================================================================
// LoginPage — real custom-auth against Narin's auth-login edge fn.
// ================================================================
const LoginPage = ({ onAuthed }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const res = await fetch(LBC_AUTH.url, {
        method: 'POST',
        headers: {
          'apikey': LBC_AUTH.anon,
          'Authorization': 'Bearer ' + LBC_AUTH.anon,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        setErr(res.status === 401 ? 'Invalid username or passphrase.' : 'Login failed (HTTP ' + res.status + ').');
        setBusy(false);
        return;
      }
      const data = await res.json();
      const exp = Date.now() + (data.expires_in ? data.expires_in * 1000 : 12 * 3600 * 1000);
      const session = { token: data.token, user: data.user, exp };
      try { localStorage.setItem(LBC_AUTH.storeKey, JSON.stringify(session)); } catch {}
      onAuthed(session);
    } catch (e2) {
      setErr('Network error — could not reach the auth service.');
      setBusy(false);
    }
  };

  return (
    <div className="lbc-stage">
      <div className="lbc-login">
        <form className="lbc-login-card" onSubmit={submit}>
          <img className="lbc-login-logo" src="assets/bridge-logo.png" alt="Legacy Bridge" />
          <h1>Legacy <b>Bridge</b> Terminal</h1>
          <div className="sub">Research Operating System</div>
          <div className="lbc-field">
            <label>Analyst ID</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                   placeholder="username" autoComplete="username" autoFocus />
          </div>
          <div className="lbc-field">
            <label>Passphrase</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button className="lbc-login-btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Enter Terminal'}
          </button>
          {err && <div className="lbc-login-err">{err}</div>}
          <div className="lbc-login-note">Authenticates against Legacy Bridge custom auth.</div>
        </form>
      </div>
    </div>
  );
};

// ================================================================
// HomePage — Refinitiv-style launcher, 7 terminal tiles.
// ================================================================
// Bridge logo geometry (self-drawing). 8 stroke subpaths + a combined
// light-sweep path. Ported from design-prototypes/13-refinitiv-grid.html.
const BRIDGE_SEGS = [
  { delay: '0.980', d: "M 228.500 98.954 C 221.097 100.904, 215.990 102.931, 216.014 103.911 C 216.022 104.235, 218.173 105.682, 220.793 107.126 C 223.413 108.570, 228.932 112.434, 233.057 115.712 C 239.633 120.937, 241.261 121.755, 246.258 122.343 C 258.712 123.806, 273.486 132.558, 289.220 147.789 C 299.988 158.215, 314.558 174.776, 313.708 175.625 C 313.423 175.910, 306.285 176.401, 297.845 176.716 C 289.405 177.031, 281.766 177.561, 280.869 177.894 C 279.491 178.406, 279.981 179.798, 284.024 186.856 C 286.657 191.451, 289.191 195.589, 289.656 196.050 C 290.120 196.512, 298.031 196.972, 307.236 197.074 C 317.779 197.190, 324.512 197.673, 325.433 198.379 C 326.236 198.996, 330.060 206.250, 333.929 214.500 L 340.964 229.500 356.905 229.774 L 372.845 230.049 366.923 216.063 C 363.665 208.371, 361 201.795, 361 201.450 C 361 201.104, 371.462 200.957, 384.250 201.122 L 407.500 201.424 408.268 193.962 C 408.691 189.858, 408.916 183.370, 408.768 179.545 C 408.511 172.869, 408.400 172.590, 406 172.578 C 402.287 172.560, 370.073 173.933, 357.951 174.627 L 347.402 175.231 344.269 169.366 C 331.578 145.606, 305.729 118.211, 286.548 108.193 C 266.270 97.601, 245.927 94.364, 228.500 98.954" },
  { delay: '0.000', d: "M 161.500 98.950 C 145.596 101.549, 128.477 108.908, 115.500 118.723 C 98.420 131.642, 76.312 157.880, 63.904 179.957 C 61.976 183.387, 61.283 183.807, 56.637 184.365 C 53.811 184.705, 45.088 184.987, 37.250 184.991 C 25.608 184.998, 23 185.260, 23 186.421 C 23 188.229, 25.987 188.688, 39 188.882 C 44.775 188.968, 51.600 189.292, 54.166 189.602 L 58.832 190.165 48.820 209.653 C 43.314 220.372, 39.020 229.353, 39.278 229.611 C 39.536 229.869, 45.270 221.273, 52.020 210.509 C 58.770 199.744, 64.652 190.715, 65.090 190.444 C 65.529 190.173, 80.200 190.651, 97.694 191.507 C 115.187 192.362, 156.432 194.368, 189.350 195.964 C 222.267 197.560, 249.299 199.009, 249.420 199.183 C 249.541 199.357, 252.639 206.250, 256.304 214.500 L 262.969 229.500 280.101 229.774 C 295.981 230.028, 297.184 229.922, 296.570 228.321 C 296.205 227.372, 293.624 220.498, 290.834 213.047 C 279.390 182.490, 263.297 157.077, 239.738 132.358 C 223.750 115.583, 208.246 105.696, 190.766 101.128 C 181.726 98.766, 168.603 97.789, 161.500 98.950" },
  { delay: '0.573', d: "M 147.652 123.049 C 144.986 123.496, 142.556 124.111, 142.251 124.415 C 141.947 124.720, 140.666 135.663, 139.404 148.734 C 138.142 161.805, 136.844 174.637, 136.520 177.250 L 135.931 182 143.466 182 C 147.610 182, 151.013 181.887, 151.030 181.750 C 151.262 179.806, 155.979 124.150, 155.988 123.250 C 156.001 121.873, 154.829 121.844, 147.652 123.049" },
  { delay: '0.723', d: "M 167.510 136.799 C 167.113 144.476, 166.498 157.562, 166.144 165.879 L 165.500 181.002 172.250 181.001 C 178.575 181, 179.002 180.858, 179.027 178.750 C 179.043 177.512, 179.708 166.600, 180.506 154.500 C 182.475 124.627, 182.755 127.554, 177.750 125.684 C 175.412 124.811, 172.315 123.815, 170.867 123.469 L 168.233 122.842 167.510 136.799" },
  { delay: '0.437', d: "M 122 132.108 C 118.425 134.357, 115.177 136.498, 114.782 136.866 C 114.083 137.518, 109 176.023, 109 180.668 C 109 182.824, 109.409 183, 114.429 183 C 117.671 183, 120.405 182.453, 121.217 181.641 C 122.109 180.748, 123.544 171.757, 125.395 155.443 C 126.946 141.782, 128.439 130.019, 128.714 129.303 C 129.415 127.476, 129.261 127.540, 122 132.108" },
  { delay: '0.868', d: "M 194 156.941 L 194 180 200.993 180 L 207.986 180 207.446 164.750 C 206.622 141.465, 206.749 142.005, 201.224 138.355 C 198.626 136.638, 195.938 134.929, 195.250 134.558 C 194.267 134.026, 194 138.800, 194 156.941" },
  { delay: '0.237', d: "M 93.886 153.778 C 87.735 160.446, 79.146 171.023, 73.517 178.860 L 69.668 184.220 81.751 183.860 C 88.396 183.662, 94.100 183.234, 94.425 182.909 C 95.021 182.313, 99.937 148.741, 99.505 148.219 C 99.377 148.065, 96.848 150.566, 93.886 153.778" },
  { delay: '1.000', d: "M 220.026 157.080 C 220.062 160.481, 221.923 179.283, 222.239 179.446 C 222.383 179.520, 225.961 179.337, 230.192 179.040 L 237.884 178.500 228.942 166.580 C 222.165 157.545, 220.006 155.245, 220.026 157.080" },
];
const BRIDGE_FLOW_D = BRIDGE_SEGS.map(s => s.d).join(' ');

const HomePage = ({ onSelect, user, onLogout }) => {
  const liveCount = LBC_TERMINALS.filter(t => t.external || t.workspaces.some(w => w.built)).length;
  const stageRef = React.useRef(null);
  const glowRef = React.useRef(null);
  const gridhiRef = React.useRef(null);

  React.useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = stageRef.current;
    // self-draw the bridge subpaths, staggered left-to-right
    const segs = root ? Array.from(root.querySelectorAll('.lbc-bridge .lbc-seg')) : [];
    if (!reduce) {
      segs.forEach(p => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        segs.forEach(p => {
          const d = parseFloat(p.dataset.delay) || 0;
          p.style.transition = 'stroke-dashoffset .9s cubic-bezier(.65,0,.35,1) ' + d + 's';
          p.style.strokeDashoffset = '0';
        });
      }));
    }
    if (reduce) return;
    // cursor: trailing glow + blueprint zoom-lens that follows the pointer
    const glow = glowRef.current, gridhi = gridhiRef.current;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2, gx = tx, gy = ty, lx = tx, ly = ty, shown = false, raf = 0;
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; if (glow) glow.style.opacity = 1; if (gridhi) gridhi.style.opacity = 1; }
    };
    const onLeave = () => {
      shown = false; if (glow) glow.style.opacity = 0; if (gridhi) gridhi.style.opacity = 0;
      if (root) { root.style.setProperty('--lx', '-500px'); root.style.setProperty('--ly', '-500px'); }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    const loop = () => {
      gx += (tx - gx) * 0.13; gy += (ty - gy) * 0.13;
      if (glow) glow.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px) translate(-50%,-50%)';
      lx += (tx - lx) * 0.20; ly += (ty - ly) * 0.20;
      if (shown && root) { root.style.setProperty('--lx', lx.toFixed(1) + 'px'); root.style.setProperty('--ly', ly.toFixed(1) + 'px'); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onTileMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    e.currentTarget.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };

  return (
    <div className="lbc-stage lbc-stage--home" ref={stageRef}>
      <div className="lbc-stars"></div>
      <div className="lbc-gridbg"></div>
      <div className="lbc-gridbg-hi" ref={gridhiRef}></div>
      <div className="lbc-cursor-glow" ref={glowRef}></div>

      <div className="lbc-home">
        {/* The top tab strip (LBCShell) now carries identity + Sign out for every
            window, so the Home page's own bar would be a duplicate — removed. */}
        <div className="lbc-hero">
          <div className="lbc-bridgewrap">
            <svg viewBox="3 77 425 172" aria-label="Legacy Bridge Capital">
              <g className="lbc-bridge">
                {BRIDGE_SEGS.map((s, i) => (
                  <path key={i} className="lbc-seg" data-delay={s.delay} d={s.d} />
                ))}
              </g>
              <path className="lbc-flow" d={BRIDGE_FLOW_D} />
            </svg>
          </div>
          <h1>Legacy <b>Bridge</b> Terminal.</h1>
          <p className="sub">One desk · every LBC terminal · a research operating system for Indonesian equity work.</p>
        </div>

        <div className="lbc-sec">
          <span className="lbc-sec-title">Terminals</span>
          <span className="sp"></span>
          <span className="st"><b>{liveCount}</b> / {LBC_TERMINALS.length} active</span>
        </div>

        <div className="lbc-grid">
          {LBC_TERMINALS.map(t => {
            const live = t.workspaces.some(w => w.built);
            const locked = !lbcCanAccess(t, user);
            return (
              <div key={t.id} className={`lbc-tile ${live ? '' : 'soon'} ${locked ? 'locked' : ''}`} style={{ ['--ac']: t.accent }}
                   onClick={() => { if (locked) return; onSelect(t.id); }}
                   onMouseMove={onTileMove}>
                <div className="lbc-tile-top">
                  <span className="lbc-ticon">{t.icon}</span>
                  <span className="lbc-tnum">{t.num}</span>
                </div>
                <div className="lbc-tname">{t.name}</div>
                <div className="lbc-tdesc">{t.desc}</div>
                <div className="lbc-tfoot">
                  <span className={`lbc-badge ${locked ? 'locked' : live ? 'live' : ''}`}>{locked ? 'Restricted' : live ? 'Live' : t.external ? 'External' : 'Soon'}</span>
                  <span className="lbc-tarrow">{locked ? '🔒' : 'Open ↗'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ================================================================
// LBCShell — top-level stage machine. Mounts the whole product.
// ================================================================
const readLbcSession = () => {
  try {
    const raw = localStorage.getItem(LBC_AUTH.storeKey);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.token && s.exp && Date.now() < s.exp) return s;
    if (s) localStorage.removeItem(LBC_AUTH.storeKey); // expired
  } catch {}
  return null;
};

// Browser-style tabs: Home + open terminals live as tabs (Chrome / Refinitiv).
let _tabSeq = 0;
const newTabId = () => 'tab' + (++_tabSeq) + Date.now().toString(36);
const LBC_HOME_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
);

const LBCShell = () => {
  const existing = readLbcSession();
  const [user, setUser] = React.useState(existing ? existing.user : null);
  const [authed, setAuthed] = React.useState(!!existing);
  const [tabs, setTabs] = React.useState(() => [{ id: newTabId(), type: 'home' }]);
  const [activeId, setActiveId] = React.useState(() => tabs[0].id);

  // Session bridge for embedded apps: the Management terminal reads its session
  // from its OWN localStorage keys (lbc.mgmt.token/user/exp), not lbc_auth. Same
  // origin, so we mirror the shell's current (Narin's-signed) session into those
  // keys before its iframe loads — otherwise it sends a stale token and Supabase
  // rejects it ("No suitable key or wrong key type"). Runs on auth change.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LBC_AUTH.storeKey);
      const s = raw ? JSON.parse(raw) : null;
      if (s && s.token && s.exp && Date.now() < s.exp) {
        localStorage.setItem('lbc.mgmt.token', s.token);
        localStorage.setItem('lbc.mgmt.user', JSON.stringify(s.user));
        localStorage.setItem('lbc.mgmt.exp', String(s.exp));
      } else {
        ['lbc.mgmt.token', 'lbc.mgmt.user', 'lbc.mgmt.exp'].forEach((k) => localStorage.removeItem(k));
      }
    } catch {}
  }, [authed, user]);

  const onAuthed = (session) => { setUser(session.user); setAuthed(true); };
  const onLogout = () => {
    try { localStorage.removeItem(LBC_AUTH.storeKey); } catch {}
    const id = newTabId();
    setUser(null); setAuthed(false); setTabs([{ id, type: 'home' }]); setActiveId(id);
  };

  // Open a terminal: external apps -> new browser tab; in-shell terminals ->
  // focus an existing tab, else convert the active Home tab, else add a tab.
  const openTerminal = (termId) => {
    const t = LBC_TERMINALS.find((x) => x.id === termId);
    if (!t || !lbcCanAccess(t, user)) return;
    if (t.external) { try { window.open(t.external, '_blank', 'noopener'); } catch { window.location.href = t.external; } return; }
    const ex = tabs.find((x) => x.type === 'terminal' && x.termId === termId);
    if (ex) { setActiveId(ex.id); return; }
    const cur = tabs.find((x) => x.id === activeId);
    if (cur && cur.type === 'home') {
      setTabs(tabs.map((x) => (x.id === activeId ? { id: x.id, type: 'terminal', termId } : x)));
    } else {
      const id = newTabId();
      setTabs([...tabs, { id, type: 'terminal', termId }]);
      setActiveId(id);
    }
  };
  const addTab = () => { const id = newTabId(); setTabs([...tabs, { id, type: 'home' }]); setActiveId(id); };
  const closeTab = (id) => {
    const next = tabs.filter((x) => x.id !== id);
    if (!next.length) { const nid = newTabId(); setTabs([{ id: nid, type: 'home' }]); setActiveId(nid); return; }
    setTabs(next);
    if (id === activeId) setActiveId(next[next.length - 1].id);
  };
  const goHome = () => { const h = tabs.find((x) => x.type === 'home'); if (h) setActiveId(h.id); else addTab(); };

  // Embedded terminals (Network / Management / Yggdrasil iframes) ask the shell
  // to go Home via postMessage instead of navigating their OWN iframe to
  // /launcher/ — doing the latter would load the launcher inside the iframe and
  // render a second, nested tab strip ("double layer of tabs"). This mirrors
  // the native terminals' onHome: focus the Home tab, keep open tabs alive.
  React.useEffect(() => {
    const onMsg = (e) => { if (e && e.data && e.data.type === 'lbc:home') goHome(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [tabs, activeId]);

  if (!authed) return <LoginPage onAuthed={onAuthed} />;

  return (
    <div className="lbc-browser">
      <div className="lbc-tabstrip">
        <div className="lbc-tabstrip-brand">LBC</div>
        <div className="lbc-tabstrip-tabs">
          {tabs.map((t) => {
            const term = t.type === 'terminal' ? LBC_TERMINALS.find((x) => x.id === t.termId) : null;
            return (
              <div key={t.id} className={`lbc-ttab ${t.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(t.id)} title={term ? term.name : 'Home'}
                   style={term ? { ['--ac']: term.accent } : null}>
                <span className="lbc-ttab-ico">{term ? term.icon : LBC_HOME_ICON}</span>
                <span className="lbc-ttab-name">{term ? term.name : 'Home'}</span>
                <span className="lbc-ttab-x" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} title="Close tab">×</span>
              </div>
            );
          })}
          <button className="lbc-ttab-add" onClick={addTab} title="New tab">+</button>
        </div>
        <div className="lbc-tabstrip-sp"></div>
        {user && <span className="lbc-tabstrip-user">{user.full_name || user.username}{user.role ? ' · ' + user.role : ''}</span>}
        <span className="lbc-pip"></span>
        <button className="lbc-logout" onClick={onLogout}>Sign out</button>
      </div>
      <div className="lbc-browser-body">
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          if (t.type === 'home') {
            // Home tabs render only when active (the hero animation + cursor RAF
            // shouldn't run for hidden tabs); terminals stay mounted to keep state.
            return isActive ? (
              <div key={t.id} className="lbc-tabpane"><HomePage user={user} onLogout={onLogout} onSelect={openTerminal} /></div>
            ) : null;
          }
          const term = LBC_TERMINALS.find((x) => x.id === t.termId);
          if (!term) return null;
          return (
            <div key={t.id} className="lbc-tabpane" style={{ display: isActive ? 'block' : 'none' }}>
              {term.embed
                ? <iframe className="lbc-embed" src={term.embed} title={term.name} />
                : <window.AppShell terminal={term} onHome={goHome} onNewTab={addTab} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
window.LBCShell = LBCShell;

// ================================================================
// Mount (moved here from app.jsx so it runs after AppShell is defined).
// ================================================================
// Guard: the launcher must NEVER render nested inside an embed iframe. If an
// embedded app ever navigates its own iframe here (e.g. an old HOME link),
// bounce the TOP frame to this URL instead of mounting a duplicate shell —
// kills the "second layer of tabs" bug at the root, regardless of the source.
if (window.top !== window.self) {
  try { window.top.location.replace(window.location.href); }
  catch (e) { /* same-origin in practice; ignore if blocked */ }
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <window.Qars.QarsRoot paletteRegistry={window.__paletteRegistry}>
      <LBCShell />
    </window.Qars.QarsRoot>
  );
}
