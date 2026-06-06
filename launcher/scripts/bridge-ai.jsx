// ================================================================
// Bridge Copilot — in-terminal AI chat panel (window.BridgeAI)
// Talks to the secure /api/bridge proxy (holds the OpenRouter key server-side).
// Runs a client-orchestrated tool loop: data_*/write_* execute on the server
// (service role, owner-gated), ui_* execute here in the browser (drive the UI).
// Self-mounts a floating launcher + slide-over panel; only when logged in.
// ================================================================
(function () {
  const API = '/api/bridge/';                       // trailing slash (vercel trailingSlash:true)
  const MAX_TOOL_ROUNDS = 6;

  const session = () => { try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; } };

  // ---- ui.* executor: the model driving the terminal (no code, just navigation) ----
  function runUiTool(name, args) {
    args = args || {};
    const ev = (n, d) => window.dispatchEvent(new CustomEvent(n, { detail: d }));
    if (name === 'ui_navigate') { ev('macro:navtool', { tool: args.tool }); return { ok: true, opened: args.tool }; }
    if (name === 'ui_search') { ev('lbc:search', { query: args.query }); return { ok: true, searched: args.query }; }
    if (name === 'ui_set_news_filter') { ev('macro:navtool', { tool: 'news' }); ev('macro:news-filter', args); return { ok: true, applied: args }; }
    if (name === 'ui_set_calendar') { ev('macro:navtool', { tool: 'calendar' }); ev('macro:cal-filter', args); return { ok: true, applied: args }; }
    return { error: 'unknown ui tool: ' + name };
  }

  async function callProxy(token, body) {
    const r = await fetch(API, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  }

  const TOOL_LABEL = {
    data_query: 'Reading data', data_macro_overview: 'Reading market overview', data_search_news: 'Searching news',
    data_calendar: 'Reading calendar', ui_navigate: 'Opening', ui_search: 'Searching', ui_set_news_filter: 'Filtering news',
    ui_set_calendar: 'Setting calendar', write_add_calendar_event: 'Adding calendar event', write_delete_calendar_event: 'Deleting event',
  };

  const BridgeAI = () => {
    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [input, setInput] = React.useState('');
    const [turns, setTurns] = React.useState([]);          // display log: {role, text} | {tool, label, status}
    const convRef = React.useRef([]);                       // OpenAI-format messages for the model
    const sess = session();
    const scrollRef = React.useRef(null);
    React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [turns, busy]);

    if (!sess) return null;                                 // only for signed-in users
    const isOwner = false; // refreshed from server per turn (display only)

    const pushTurn = (t) => setTurns((x) => [...x, t]);

    async function send() {
      const q = input.trim();
      if (!q || busy) return;
      setInput(''); setBusy(true);
      pushTurn({ role: 'user', text: q });
      convRef.current.push({ role: 'user', content: q });
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const res = await callProxy(sess.token, { mode: 'chat', messages: convRef.current });
          if (res.error) { pushTurn({ role: 'error', text: res.error }); break; }
          const msg = res.message || {};
          convRef.current.push(msg);
          if (msg.content) pushTurn({ role: 'assistant', text: msg.content });
          const calls = msg.tool_calls || [];
          if (!calls.length) break;
          // execute each tool call
          for (const tc of calls) {
            const name = tc.function.name; let args = {};
            try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
            const label = TOOL_LABEL[name] || name;
            let result;
            if (name.startsWith('ui_')) {
              pushTurn({ tool: name, label, status: 'done' });
              result = runUiTool(name, args);
            } else if (name.startsWith('write_')) {
              const ok = window.confirm(`Bridge wants to ${label.toLowerCase()}:\n\n${JSON.stringify(args, null, 2)}\n\nConfirm?`);
              if (!ok) { pushTurn({ tool: name, label, status: 'cancelled' }); result = { error: 'user cancelled the write' }; }
              else { pushTurn({ tool: name, label, status: 'done' }); const r = await callProxy(sess.token, { mode: 'tool', tool: name, args }); result = r.result || r; }
            } else {
              pushTurn({ tool: name, label, status: 'done' });
              const r = await callProxy(sess.token, { mode: 'tool', tool: name, args }); result = r.result !== undefined ? r.result : r;
            }
            convRef.current.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 8000) });
          }
        }
      } catch (e) { pushTurn({ role: 'error', text: 'Bridge error: ' + (e.message || e) }); }
      setBusy(false);
    }

    const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

    return (
      <React.Fragment>
        <button className={'bridge-fab' + (open ? ' is-open' : '')} onClick={() => setOpen((o) => !o)} title="Bridge Copilot">
          {open ? '×' : '✦'}
        </button>
        {open && (
          <div className="bridge-panel">
            <div className="bridge-head">
              <span className="bridge-title">✦ Bridge Copilot</span>
              <span className="bridge-sub">{sess.user ? (sess.user.full_name || sess.user.username) : ''} · {sess.user ? sess.user.role : ''}</span>
              <button className="bridge-x" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="bridge-feed" ref={scrollRef}>
              {!turns.length && (
                <div className="bridge-empty">
                  <p>Ask about any LBC data, or tell me to open things.</p>
                  <ul>
                    <li onClick={() => setInput('How does Indonesia look right now?')}>“How does Indonesia look right now?”</li>
                    <li onClick={() => setInput('Open the calendar to high-impact Indonesia events')}>“Open the calendar to high-impact Indonesia events”</li>
                    <li onClick={() => setInput('Which stocks have RUPS this month?')}>“Which stocks have RUPS this month?”</li>
                    <li onClick={() => setInput('Summarize today’s top macro news')}>“Summarize today’s top macro news”</li>
                  </ul>
                </div>
              )}
              {turns.map((t, i) => {
                if (t.tool) return <div key={i} className={'bridge-tool st-' + t.status}><span className="bridge-tool-dot" />{t.label}{t.status === 'cancelled' ? ' (cancelled)' : ''}</div>;
                return <div key={i} className={'bridge-msg bridge-' + t.role}>{t.text}</div>;
              })}
              {busy && <div className="bridge-thinking"><span /><span /><span /></div>}
            </div>
            <div className="bridge-input">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="Ask Bridge…  (Enter to send)" rows={1} />
              <button onClick={send} disabled={busy || !input.trim()}>➤</button>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  window.BridgeAI = BridgeAI;
  // self-mount a global overlay container
  function mount() {
    if (document.getElementById('bridge-root')) return;
    const el = document.createElement('div'); el.id = 'bridge-root';
    document.body.appendChild(el);
    try { ReactDOM.createRoot ? ReactDOM.createRoot(el).render(React.createElement(BridgeAI)) : ReactDOM.render(React.createElement(BridgeAI), el); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
