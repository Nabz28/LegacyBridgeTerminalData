// ================================================================
// LEGION — HQ view (window.LegionHQ). Mode 2.
// Company-level goals / KPIs / milestones / initiatives (from the
// brain) + live read-only rollups from the other terminals
// (asset_mgmt, management) + LEGION's latest status snapshot.
// Read-only: the principal captures in Brain mode; LEGION reasons
// and updates goals/snapshots from Claude Code (`/lbc`).
// ================================================================

const LG_REST = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
const LG_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';
const lgTok = () => { try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s.token : null; } catch { return null; } };

// count via Content-Range (count=exact, Range 0-0 → minimal payload)
const lgCount = async (schema, table, qs) => {
  const tok = lgTok() || LG_ANON;
  const r = await fetch(LG_REST + '/' + table + (qs ? ('?' + qs) : ''), {
    headers: { apikey: LG_ANON, Authorization: 'Bearer ' + tok, 'Accept-Profile': schema, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!r.ok) throw r.status;
  const cr = r.headers.get('content-range') || '';
  const total = cr.split('/')[1];
  return (!total || total === '*') ? 0 : (parseInt(total, 10) || 0);
};
const lgGet = async (schema, path) => {
  const tok = lgTok() || LG_ANON;
  const r = await fetch(LG_REST + path, { headers: { apikey: LG_ANON, Authorization: 'Bearer ' + tok, 'Accept-Profile': schema } });
  if (!r.ok) throw r.status;
  return r.json();
};

// ---- small presentational bits -----------------------------------------
const LgStatChip = ({ s }) => {
  const map = { on_track: ['On track', 'ok'], ahead: ['Ahead', 'ok'], done: ['Done', 'done'], behind: ['Behind', 'warn'], at_risk: ['At risk', 'bad'], late: ['Late', 'bad'], pending: ['Pending', 'idle'] };
  const m = map[s] || [s || '—', 'idle'];
  return <span className={`lg-chip ${m[1]}`}>{m[0]}</span>;
};

const lgNum = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? v : Number(v).toLocaleString('en-US');

const LgGoalCard = ({ note, onOpen }) => {
  const d = note.data || {};
  const prog = Math.max(0, Math.min(100, Number(d.progress != null ? d.progress : (d.target ? (Number(d.current) / Number(d.target)) * 100 : 0)) || 0));
  const st = d.status || (prog >= 100 ? 'done' : 'on_track');
  return (
    <div className="lg-goal" onClick={() => onOpen && onOpen(note.id)}>
      <div className="lg-goal-h"><span className="lg-goal-title">{note.title}</span><LgStatChip s={st} /></div>
      <div className="lg-goal-nums">
        <b>{lgNum(d.current)}{d.unit ? ' ' + d.unit : ''}</b>
        {d.target != null && <span className="lg-dim"> / {lgNum(d.target)}{d.unit ? ' ' + d.unit : ''}</span>}
        {d.due && <span className="lg-goal-due">due {d.due}</span>}
      </div>
      <div className={`lg-prog st-${st}`}><span style={{ width: prog + '%' }} /></div>
    </div>
  );
};

const LgKpiCard = ({ note, onOpen }) => {
  const d = note.data || {};
  const trend = d.trend === 'up' ? '▲' : d.trend === 'down' ? '▼' : '–';
  return (
    <div className="lg-kpi" onClick={() => onOpen && onOpen(note.id)}>
      <div className="lg-kpi-label">{note.title}</div>
      <div className="lg-kpi-val">{lgNum(d.value)}<span className="lg-kpi-unit">{d.unit || ''}</span></div>
      <div className="lg-kpi-foot">
        {d.target != null && <span className="lg-dim">target {lgNum(d.target)}</span>}
        <span className={`lg-trend ${d.trend || ''}`}>{trend}</span>
      </div>
    </div>
  );
};

const LgRollupCard = ({ label, value, sub }) => (
  <div className="lg-roll">
    <div className="lg-roll-label">{label}</div>
    <div className="lg-roll-val">{value}</div>
    {sub && <div className="lg-roll-sub">{sub}</div>}
  </div>
);

// ================================================================
// Self-customizable widgets. LEGION writes notes of type='hq_widget'
// with data { widget, order, span(1-3), tone, ...config } and they
// render here — she reshapes her own HQ with NO redeploy.
// Supported widget kinds: callout | todo | kpi | progress | list |
//   metric_row | table | links | note_ref
// ================================================================
const LgTodo = ({ note, reload }) => {
  const items = (note.data && note.data.items) || [];
  const [busy, setBusy] = React.useState(false);
  const toggle = async (i) => {
    if (busy) return; setBusy(true);
    const next = items.map((it, idx) => (idx === i ? Object.assign({}, it, { done: !it.done }) : it));
    try { await window.BRAIN.update('notes', 'id=eq.' + note.id, { data: Object.assign({}, note.data, { items: next }) }); reload && reload(); } catch (e) {}
    setBusy(false);
  };
  const doneN = items.filter((it) => it.done).length;
  return (
    <div className="lg-w-todo">
      {items.length === 0 && <div className="lg-dim">No items.</div>}
      {items.map((it, i) => (
        <label key={i} className={`lg-todo-item ${it.done ? 'done' : ''}`}>
          <input type="checkbox" checked={!!it.done} onChange={() => toggle(i)} />
          <span>{it.text}</span>
        </label>
      ))}
      {items.length > 0 && <div className="lg-todo-foot lg-dim">{doneN}/{items.length} done</div>}
    </div>
  );
};

const LgNoteRef = ({ data }) => {
  const [body, setBody] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    const match = data.note_id ? 'id=eq.' + data.note_id : (data.note_title ? 'title=eq.' + encodeURIComponent(data.note_title) : null);
    if (!match) { setBody('—'); return; }
    window.BRAIN.get('/notes?' + match + '&select=body&limit=1')
      .then((r) => { if (live) setBody(r && r[0] ? r[0].body : '(note not found)'); })
      .catch(() => { if (live) setBody('(load failed)'); });
    return () => { live = false; };
  }, [data.note_id, data.note_title]);
  if (body == null) return <div className="lg-dim">Loading…</div>;
  return <div className="lg-md" dangerouslySetInnerHTML={{ __html: window.legionMd(body) }} />;
};

const LgWidget = ({ note, reload, onOpen }) => {
  const d = note.data || {};
  const kind = d.widget || 'callout';
  const span = Math.max(1, Math.min(3, d.span || 1));
  let inner;
  if (kind === 'todo') inner = <LgTodo note={note} reload={reload} />;
  else if (kind === 'kpi') inner = (
    <div className="lg-w-kpibig"><div className="lg-w-kpival">{lgNum(d.value)}<span className="lg-kpi-unit">{d.unit || ''}</span></div>
      {(d.target != null || d.sub) && <div className="lg-dim">{d.sub || ('target ' + lgNum(d.target))}</div>}</div>
  );
  else if (kind === 'progress') inner = (
    <div className="lg-w-prog">{(d.bars || []).map((b, i) => {
      const pct = Math.max(0, Math.min(100, b.max ? (Number(b.value) / Number(b.max)) * 100 : Number(b.value) || 0));
      return (<div key={i} className="lg-w-progrow"><div className="lg-w-progtop"><span>{b.label}</span><span className="lg-dim">{lgNum(b.value)}{b.max ? (' / ' + lgNum(b.max)) : ''}</span></div><div className={`lg-prog st-${b.status || 'on_track'}`}><span style={{ width: pct + '%' }} /></div></div>);
    })}</div>
  );
  else if (kind === 'list') inner = <ul className="lg-w-list">{(d.items || []).map((x, i) => <li key={i}>{x}</li>)}</ul>;
  else if (kind === 'metric_row') inner = (
    <div className="lg-w-metrics">{(d.metrics || []).map((m, i) => (
      <div key={i} className="lg-w-metric"><div className="lg-w-metric-val">{lgNum(m.value)}</div><div className="lg-dim">{m.label}</div>{m.sub && <div className="lg-w-metric-sub lg-dim">{m.sub}</div>}</div>
    ))}</div>
  );
  else if (kind === 'table') inner = (
    <table className="lg-w-table"><thead><tr>{(d.columns || []).map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>{(d.rows || []).map((row, ri) => <tr key={ri}>{(row || []).map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody></table>
  );
  else if (kind === 'links') inner = (
    <div className="lg-w-links">{(d.links || []).map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener">{l.label}</a>)}</div>
  );
  else if (kind === 'note_ref') inner = <LgNoteRef data={d} />;
  else inner = <div className="lg-md" dangerouslySetInnerHTML={{ __html: window.legionMd(d.text || note.body || '') }} />; // callout
  const tone = d.tone || (kind === 'callout' ? 'drive' : '');
  return (
    <div className={`lg-w span-${span} tone-${tone}`}>
      <div className="lg-w-h"><span className="lg-w-title">{note.title}</span>
        {onOpen && <button className="lg-w-edit" title="Open underlying note" onClick={() => onOpen(note.id)}>↗</button>}</div>
      <div className="lg-w-body">{inner}</div>
    </div>
  );
};

const LegionHQ = ({ notes, snapshot, onOpenNote, reload }) => {
  const [roll, setRoll] = React.useState({});
  React.useEffect(() => {
    let live = true;
    const tasks = {
      positions: lgCount('asset_mgmt', 'positions', 'status=eq.open'),
      funds: lgCount('asset_mgmt', 'funds'),
      projects: lgCount('management', 'projects'),
      team: lgCount('management', 'team_members'),
      nav: lgGet('asset_mgmt', '/nav_snapshots?select=fund_id,nav,as_of&order=as_of.desc&limit=8'),
    };
    const out = {};
    Promise.allSettled(Object.entries(tasks).map(([k, p]) => p.then((v) => [k, v]).catch(() => [k, null])))
      .then((res) => {
        res.forEach((r) => { if (r.status === 'fulfilled' && r.value) out[r.value[0]] = r.value[1]; });
        // latest NAV per fund → sum
        let navSum = null;
        if (Array.isArray(out.nav) && out.nav.length) {
          const seen = {}; let s = 0;
          out.nav.forEach((row) => { if (!seen[row.fund_id] && row.nav != null) { seen[row.fund_id] = 1; s += Number(row.nav) || 0; } });
          navSum = s;
        }
        out.navSum = navSum;
        if (live) setRoll(out);
      });
    return () => { live = false; };
  }, []);

  const byType = (t) => (notes || []).filter((n) => n.type === t);
  const goals = byType('goal');
  const kpis = byType('kpi');
  const initiatives = byType('initiative');
  const widgets = [...byType('hq_widget')].sort((a, b) => (((a.data && a.data.order) || 0) - ((b.data && b.data.order) || 0)));
  const milestones = [...byType('milestone')].sort((a, b) => ((a.data && a.data.due) || '').localeCompare((b.data && b.data.due) || ''));
  const today = new Date().toISOString().slice(0, 10);
  const snap = snapshot && snapshot.data ? snapshot.data : null;

  return (
    <div className="lg-hq">
      {/* status snapshot — LEGION's latest read */}
      <div className="lg-snap">
        {snap ? (
          <>
            <div className="lg-snap-h">
              <span className="lg-snap-k">LEGION read</span>
              <span className="lg-dim">{window.lgTimeAgo ? window.lgTimeAgo(snapshot.created_at) : ''}{snap.by ? ' · ' + snap.by : ''}</span>
            </div>
            <div className="lg-snap-head">{snap.headline}</div>
            <div className="lg-snap-cols">
              {Array.isArray(snap.behind) && snap.behind.length > 0 && (
                <div className="lg-snap-col"><div className="lg-snap-lbl bad">Behind</div><ul>{snap.behind.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
              {Array.isArray(snap.ahead) && snap.ahead.length > 0 && (
                <div className="lg-snap-col"><div className="lg-snap-lbl ok">On / ahead</div><ul>{snap.ahead.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
              {Array.isArray(snap.next_actions) && snap.next_actions.length > 0 && (
                <div className="lg-snap-col"><div className="lg-snap-lbl">Next</div><ol>{snap.next_actions.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
              )}
            </div>
          </>
        ) : (
          <div className="lg-snap-empty">No status read yet. Run <code>/lbc</code> in Claude Code and LEGION will assess where LBC stands and log it here.</div>
        )}
      </div>

      {/* LEGION's self-built panels (type='hq_widget') */}
      {widgets.length > 0 && <>
        <div className="lg-section-lbl">LEGION's panels</div>
        <div className="lg-wgrid">{widgets.map((w) => <LgWidget key={w.id} note={w} reload={reload} onOpen={onOpenNote} />)}</div>
      </>}

      {/* live rollups */}
      <div className="lg-section-lbl">Live across the terminals</div>
      <div className="lg-rollgrid">
        <LgRollupCard label="AUM (latest NAV)" value={roll.navSum != null ? '$' + lgNum(Math.round(roll.navSum)) : '—'} sub="asset_mgmt" />
        <LgRollupCard label="Open positions" value={roll.positions != null ? roll.positions : '—'} sub={roll.funds != null ? roll.funds + ' funds' : 'The Book'} />
        <LgRollupCard label="Research projects" value={roll.projects != null ? roll.projects : '—'} sub="Management (T5)" />
        <LgRollupCard label="Team" value={roll.team != null ? roll.team : '—'} sub="people on the desk" />
      </div>

      {/* goals */}
      <div className="lg-section-lbl">Goals {goals.length > 0 && <span className="lg-dim">· {goals.length}</span>}</div>
      {goals.length === 0
        ? <div className="lg-empty-row">No company goals yet — LEGION sets these on the first <code>/lbc</code> run.</div>
        : <div className="lg-goalgrid">{goals.map((g) => <LgGoalCard key={g.id} note={g} onOpen={onOpenNote} />)}</div>}

      {/* kpis */}
      {kpis.length > 0 && <>
        <div className="lg-section-lbl">KPIs</div>
        <div className="lg-kpigrid">{kpis.map((k) => <LgKpiCard key={k.id} note={k} onOpen={onOpenNote} />)}</div>
      </>}

      {/* milestones + initiatives */}
      <div className="lg-two">
        <div>
          <div className="lg-section-lbl">Timeline</div>
          {milestones.length === 0
            ? <div className="lg-empty-row">No milestones yet.</div>
            : <div className="lg-timeline">{milestones.map((m) => {
                const d = m.data || {};
                const late = d.status !== 'done' && d.due && d.due < today;
                const st = d.status === 'done' ? 'done' : late ? 'late' : 'pending';
                return (
                  <div key={m.id} className={`lg-mile st-${st}`} onClick={() => onOpenNote && onOpenNote(m.id)}>
                    <span className="lg-mile-dot" />
                    <span className="lg-mile-due">{d.due || '—'}</span>
                    <span className="lg-mile-title">{m.title}</span>
                    <LgStatChip s={st} />
                  </div>
                );
              })}</div>}
        </div>
        <div>
          <div className="lg-section-lbl">What to scale</div>
          {initiatives.length === 0
            ? <div className="lg-empty-row">No initiatives flagged.</div>
            : <div className="lg-inits">{initiatives.map((it) => (
                <div key={it.id} className="lg-init" onClick={() => onOpenNote && onOpenNote(it.id)}>
                  <span className="lg-init-title">{it.title}</span>
                  {it.data && it.data.priority && <span className="lg-init-pri">P{it.data.priority}</span>}
                  {it.data && it.data.stage && <span className="lg-dim">{it.data.stage}</span>}
                </div>
              ))}</div>}
        </div>
      </div>
    </div>
  );
};
window.LegionHQ = LegionHQ;
