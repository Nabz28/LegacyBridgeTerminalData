// ================================================================
// Accounts (T11) — account administration + the shared change-password modal.
//
// Two exports:
//   window.ChangePasswordModal  — used by the shell for the forced first-login
//                                 change AND the voluntary "Change password".
//   window.ACCOUNTS_TERMINAL    — the admin roster (nabil + aldee only): every
//                                 member's username, position, role, current
//                                 password, must-change state + reset-to-base.
//
// Everything talks to Supabase PostgREST RPCs in the `management` schema with
// the logged-in user's JWT. The RPCs are JWT-gated server-side (see migration
// 0054_account_system.sql) — the client gate here is UX only.
// ================================================================

const ACCT_REST = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const ACCT_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

// Read the live shell session (mirrors lbc-shell's readLbcSession).
const acctSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null');
    if (s && s.token && s.exp && Date.now() < s.exp) return s;
  } catch {}
  return null;
};

// Call a management-schema RPC with the user's JWT. Returns parsed JSON or
// throws { status, message }.
const acctRpc = async (fn, args) => {
  const s = acctSession();
  const tok = s && s.token;
  const res = await fetch(ACCT_REST + '/rpc/' + fn, {
    method: 'POST',
    headers: {
      apikey: ACCT_ANON,
      Authorization: 'Bearer ' + (tok || ACCT_ANON),
      'Content-Type': 'application/json',
      'Content-Profile': 'management',
      'Accept-Profile': 'management',
    },
    body: JSON.stringify(args || {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error || data.hint)) || ('HTTP ' + res.status);
    throw { status: res.status, message: msg };
  }
  return data;
};

// ================================================================
// ChangePasswordModal — forced (no escape) or voluntary.
//   props: { forced, user, onDone, onClose }
// ================================================================
const ChangePasswordModal = ({ forced, user, onDone, onClose }) => {
  const [cur, setCur] = React.useState('');
  const [pw1, setPw1] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [ok, setOk] = React.useState(false);

  const validate = () => {
    if (!cur) return 'Enter your current password.';
    if (pw1.length < 8) return 'New password must be at least 8 characters.';
    if (pw1 === 'Nabil1234') return 'Choose a password different from the default.';
    if (pw1 !== pw2) return 'New passwords do not match.';
    if (pw1 === cur) return 'New password must differ from the current one.';
    return '';
  };

  const submit = async (e) => {
    e && e.preventDefault();
    if (busy) return;
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(''); setBusy(true);
    try {
      const r = await acctRpc('change_my_password', { p_old: cur, p_new: pw1 });
      if (r && r.ok) {
        setOk(true);
        setTimeout(() => { onDone && onDone(); }, 850);
      } else {
        setErr((r && r.error) || 'Could not change password.');
        setBusy(false);
      }
    } catch (e2) {
      setErr(e2.message || 'Network error.');
      setBusy(false);
    }
  };

  return (
    <div className="acct-pw-backdrop" onMouseDown={(e) => { if (!forced && e.target === e.currentTarget && onClose) onClose(); }}>
      <form className="acct-pw-card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="acct-pw-glyph">{forced ? '🔐' : '🔑'}</div>
        <h2>{forced ? 'Set a new password' : 'Change password'}</h2>
        <p className="acct-pw-sub">
          {forced
            ? <>You're signed in with the default password. Choose a new one to continue — this is permanent.</>
            : <>Update the password for <b>{user ? (user.full_name || user.username) : 'your account'}</b>.</>}
        </p>

        {ok ? (
          <div className="acct-pw-ok">✓ Password updated. {forced ? 'Opening the terminal…' : ''}</div>
        ) : (
          <>
            <label className="acct-field">
              <span>Current password</span>
              <input type="password" value={cur} autoFocus autoComplete="current-password"
                     onChange={(e) => setCur(e.target.value)} placeholder={forced ? 'Nabil1234' : '••••••••'} />
            </label>
            <label className="acct-field">
              <span>New password</span>
              <input type="password" value={pw1} autoComplete="new-password"
                     onChange={(e) => setPw1(e.target.value)} placeholder="At least 8 characters" />
            </label>
            <label className="acct-field">
              <span>Confirm new password</span>
              <input type="password" value={pw2} autoComplete="new-password"
                     onChange={(e) => setPw2(e.target.value)} placeholder="Repeat new password" />
            </label>

            {err && <div className="acct-pw-err">{err}</div>}

            <div className="acct-pw-actions">
              {!forced && <button type="button" className="acct-btn ghost" onClick={() => onClose && onClose()}>Cancel</button>}
              <button type="submit" className="acct-btn primary" disabled={busy}>
                {busy ? 'Saving…' : forced ? 'Set password & continue' : 'Update password'}
              </button>
            </div>
            {forced && <div className="acct-pw-note">You can't enter the terminals until your password is changed.</div>}
          </>
        )}
      </form>
    </div>
  );
};
window.ChangePasswordModal = ChangePasswordModal;

// ================================================================
// ACCOUNTS_TERMINAL — the admin roster.
// ================================================================
const ROLE_BADGE = {
  admin:      { label: 'Admin',      cls: 'admin' },
  management: { label: 'Management', cls: 'mgmt' },
  analyst:    { label: 'Analyst',    cls: 'analyst' },
  advisor:    { label: 'Advisor',    cls: 'advisor' },
};

const AccountsTerminal = () => {
  const [rows, setRows] = React.useState(null);   // null = loading
  const [err, setErr] = React.useState('');
  const [q, setQ] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [reveal, setReveal] = React.useState(false);
  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState('');

  const session = acctSession();
  const me = (session && session.user) || {};

  const load = React.useCallback(async () => {
    setErr('');
    try {
      const data = await acctRpc('list_accounts', {});
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setErr(e.message || 'Could not load accounts.');
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const resetOne = async (r) => {
    if (busyId) return;
    if (!window.confirm(`Reset ${r.full_name || r.username}'s password back to the default (Nabil1234)? They'll be forced to change it on next login.`)) return;
    setBusyId(r.id);
    try {
      const res = await acctRpc('admin_reset_password', { p_user_id: r.id });
      if (res && res.ok) { flash(`Reset ${r.username} → Nabil1234`); await load(); }
      else setErr((res && res.error) || 'Reset failed.');
    } catch (e) { setErr(e.message || 'Reset failed.'); }
    setBusyId(null);
  };

  const copyPw = (pw) => { try { navigator.clipboard.writeText(pw || ''); flash('Password copied'); } catch {} };

  const list = (rows || []).filter((r) => {
    if (roleFilter !== 'all' && r.role !== roleFilter) return false;
    if (!q) return true;
    const hay = `${r.username} ${r.full_name} ${r.title || ''} ${r.division || ''} ${r.role}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const counts = (rows || []).reduce((a, r) => { a[r.role] = (a[r.role] || 0) + 1; a._t = (a._t || 0) + 1; return a; }, {});
  const pending = (rows || []).filter((r) => r.must_change_password).length;

  const fmtLogin = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
             d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  return (
    <div className="acct-wrap">
      <div className="acct-head">
        <div className="acct-head-l">
          <div className="acct-title">Accounts</div>
          <div className="acct-sub">Account administration · credentials · password resets — restricted to the principal &amp; administrator.</div>
        </div>
        <div className="acct-kpis">
          <div className="acct-kpi"><div className="n">{counts._t || 0}</div><div className="l">Members</div></div>
          <div className="acct-kpi"><div className="n">{counts.management || 0}</div><div className="l">Management</div></div>
          <div className="acct-kpi"><div className="n">{counts.analyst || 0}</div><div className="l">Analysts</div></div>
          <div className="acct-kpi warn"><div className="n">{pending}</div><div className="l">On default pw</div></div>
        </div>
      </div>

      <div className="acct-toolbar">
        <div className="acct-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-5.2-5.2"/></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, position…" />
        </div>
        <div className="acct-roletabs">
          {['all', 'management', 'analyst', 'advisor', 'admin'].map((r) => (
            <button key={r} className={`acct-roletab ${roleFilter === r ? 'active' : ''}`} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'All' : (ROLE_BADGE[r] ? ROLE_BADGE[r].label : r)}
            </button>
          ))}
        </div>
        <div className="acct-toolbar-sp" />
        <button className={`acct-btn ${reveal ? 'primary' : 'ghost'}`} onClick={() => setReveal((v) => !v)}>
          {reveal ? '🙈 Hide passwords' : '👁 Show passwords'}
        </button>
        <button className="acct-btn ghost" onClick={load} title="Reload">↻</button>
      </div>

      {err && <div className="acct-banner err">{err}</div>}

      <div className="acct-tablewrap">
        <table className="acct-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Username</th>
              <th>Position</th>
              <th>Role</th>
              <th>Password</th>
              <th>Status</th>
              <th>Last login</th>
              <th className="ta-r">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan="8" className="acct-empty">Loading roster…</td></tr>}
            {rows !== null && list.length === 0 && <tr><td colSpan="8" className="acct-empty">No accounts match.</td></tr>}
            {list.map((r) => {
              const badge = ROLE_BADGE[r.role] || { label: r.role, cls: '' };
              const isMe = r.username === (me.username || '').toLowerCase();
              return (
                <tr key={r.id} className={r.active ? '' : 'inactive'}>
                  <td>
                    <div className="acct-name">{r.full_name || r.username}{isMe && <span className="acct-you">you</span>}</div>
                  </td>
                  <td className="mono">{r.username}</td>
                  <td className="acct-pos">{r.title || '—'}{r.division && <span className="acct-div">{r.division}</span>}</td>
                  <td><span className={`acct-badge ${badge.cls}`}>{badge.label}</span></td>
                  <td>
                    <span className="acct-pw">
                      <span className="mono pwval">{reveal ? (r.password || '—') : '••••••••'}</span>
                      <button className="acct-iconbtn" title="Copy password" onClick={() => copyPw(r.password)}>⧉</button>
                    </span>
                  </td>
                  <td>
                    {r.must_change_password
                      ? <span className="acct-pill default">Default</span>
                      : <span className="acct-pill changed">Changed</span>}
                  </td>
                  <td className="mono dim">{fmtLogin(r.last_login_at)}</td>
                  <td className="ta-r">
                    <button className="acct-btn xs" disabled={busyId === r.id} onClick={() => resetOne(r)}>
                      {busyId === r.id ? '…' : 'Reset'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="acct-foot">
        Passwords are stored for administrative visibility and shown only here. Resetting sets the password to <b>Nabil1234</b> and forces a change at next login.
      </div>

      {toast && <div className="acct-toast"><span className="d" />{toast}</div>}
    </div>
  );
};
window.ACCOUNTS_TERMINAL = AccountsTerminal;
