// ================================================================
// RESEARCH · calendar (window.RESEARCH_CALENDAR) — T13.
//
// The same event book the Macro terminal shows (macro.calendar, 863 events), PLUS
// our own events, PLUS our priority on any of them.
//
// Read-only on the feed by design: macro.calendar is written by the autonomous
// agent and re-synced on a hash key, so Research keeps its own events in
// management.research_event and merges the two here. Stars live in
// research_event_flag keyed on the agent's hash, so they survive a re-sync.
//
// Starring works on FEED events too — that is the point. "Bank of England
// decision" is not ours to author, but caring about it is.
// ================================================================
(function () {
  'use strict';

  const RL = () => window.RESEARCH_LIVE;
  const RV = () => window.RESEARCH_VIEWS;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const REGION_CHIP = { ID: { t: 'ID', c: '#e0823a' }, US: { t: 'US', c: '#5B8DEF' }, Global: { t: 'GL', c: '#19C37D' } };

  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const dayHeader = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const diff = Math.round((dt - t0) / 86400000);
    const tag = diff === 0 ? 'TODAY' : diff === 1 ? 'TOMORROW' : diff === -1 ? 'YESTERDAY' : '';
    return { label: WDAYS[dt.getDay()] + ' · ' + d + ' ' + MONTHS[m - 1] + ' ' + y, tag, diff };
  };

  // ---- one event row -------------------------------------------------------
  const EventRow = ({ e, tax, canEdit, onStar, onPriority, onEdit, onDelete, onNote }) => {
    const rl = RL();
    const cat = rl.eventCat(e.category);
    const chip = REGION_CHIP[e.region];
    const flag = e.flag;
    const starred = !!(flag && flag.starred);
    const pri = (flag && flag.priority) || 'normal';
    const priMeta = rl.EVENT_PRIORITIES.find((p) => p.id === pri) || rl.EVENT_PRIORITIES[2];
    const hasFigs = e.forecast || e.prev || e.actual;
    const desk = e.desk_id && tax ? tax.desks.find((d) => d.id === e.desk_id) : null;

    return (
      <div className={'rc-row imp-' + e.importance + (starred ? ' starred pri-' + priMeta.cls : '') + (e.src === 'research' ? ' own' : '')}>
        {/* star: the one-click action, always available in edit mode */}
        <button type="button" className={'rc-star ' + (starred ? 'on' : '')}
                disabled={!canEdit}
                title={!canEdit ? (starred ? 'Starred' : 'Switch to Edit mode to star')
                                : (starred ? 'Unstar' : 'Star this event')}
                onClick={() => onStar(e, !starred)}>
          {starred ? '★' : '☆'}
        </button>
        <span className="rc-time">{e.event_time || '—'}</span>
        <span className="rc-cat" title={cat.label}>{cat.glyph}</span>
        <span className="rc-body">
          <span className="rc-title-line">
            {chip && <span className="rc-rchip" style={{ color: chip.c, borderColor: chip.c }}>{chip.t}</span>}
            {e.src === 'research' && <span className="rc-own-chip" title="your own event">OURS</span>}
            {e.ticker && <span className="rc-ticker">{e.ticker}</span>}
            <span className="rc-title">{e.title}</span>
            {e.status !== 'confirmed' && (
              <span className={'rc-status s-' + e.status}>{e.status === 'tentative' ? 'tentative' : 'est.'}</span>
            )}
            {starred && pri !== 'normal' && <span className={'rc-pri ' + priMeta.cls}>{priMeta.label}</span>}
          </span>
          {(e.entity || e.detail || hasFigs || desk || (flag && flag.note)) && (
            <span className="rc-meta">
              {e.entity && <span className="rc-entity">{e.entity}</span>}
              {e.period && <span className="rc-period">{e.period}</span>}
              {desk && <span className="rc-deskchip" style={{ ['--ac']: desk.accent }}>{desk.name}</span>}
              {hasFigs && (
                <span className="rc-figs">
                  {e.actual != null && e.actual !== '' && <span className="rc-fig"><b>A</b> {e.actual}</span>}
                  {e.forecast && <span className="rc-fig"><b>F</b> {e.forecast}</span>}
                  {e.prev && <span className="rc-fig"><b>P</b> {e.prev}</span>}
                </span>
              )}
              {e.detail && <span className="rc-detail">{e.detail}</span>}
              {e.url && <a className="rc-src" href={e.url} target="_blank" rel="noopener noreferrer">source ↗</a>}
              {flag && flag.note && <span className="rc-flagnote">✎ {flag.note}</span>}
            </span>
          )}
        </span>
        {canEdit && (
          <span className="rc-actions">
            {starred && (
              <select className="rs-select sm" value={pri} title="Priority"
                      onChange={(ev) => onPriority(e, ev.target.value)}>
                {rl.EVENT_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            )}
            {starred && (
              <button type="button" className="rs-icon" title="Add / edit your note on this event"
                      onClick={() => onNote(e)}>✎</button>
            )}
            {e.src === 'research' && (
              <>
                <button type="button" className="rs-icon" title="Edit this event" onClick={() => onEdit(e)}>⚙</button>
                <button type="button" className="rs-icon danger" title="Delete this event" onClick={() => onDelete(e)}>✕</button>
              </>
            )}
          </span>
        )}
        <span className="rc-impdot" title={e.importance + ' impact'} />
      </div>
    );
  };

  // ---- add / edit our own event -------------------------------------------
  const EventForm = ({ row, tax, onSave, onCancel, busy }) => {
    const rl = RL();
    const [d, setD] = React.useState(() => ({
      id: (row && row.id) || null,
      event_date: (row && row.event_date) || todayISO(),
      event_time: (row && row.event_time) || '',
      region: (row && row.region) || 'Global',
      category: (row && row.category) || 'meeting',
      title: (row && row.title) || '',
      entity: (row && row.entity) || '',
      ticker: (row && row.ticker) || '',
      detail: (row && row.detail) || '',
      importance: (row && row.importance) || 'med',
      status: (row && row.status) || 'confirmed',
      desk_id: (row && row.desk_id) || '',
      sub_id: (row && row.sub_id) || '',
      url: (row && row.url) || '',
    }));
    const desks = (tax && tax.desks) || [];
    const desk = d.desk_id ? desks.find((x) => x.id === d.desk_id) : null;
    return (
      <div className="rs-editor">
        <div className="rs-ed-row">
          <label className="rs-field"><span className="rs-field-l">Date</span>
            <input className="rs-input" type="date" style={{ maxWidth: 160 }} value={d.event_date}
                   onChange={(e) => setD({ ...d, event_date: e.target.value })} />
          </label>
          <label className="rs-field"><span className="rs-field-l">Time label</span>
            <input className="rs-input" style={{ maxWidth: 130 }} placeholder="14:00 WIB" value={d.event_time}
                   onChange={(e) => setD({ ...d, event_time: e.target.value })} />
          </label>
          <label className="rs-field grow"><span className="rs-field-l">Title</span>
            <input className="rs-input grow" placeholder="e.g. Site visit — Cikarang plant" value={d.title}
                   onChange={(e) => setD({ ...d, title: e.target.value })} />
          </label>
        </div>
        <div className="rs-ed-row">
          <label className="rs-field"><span className="rs-field-l">Category</span>
            <select className="rs-select" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>
              {Object.keys(rl.EVENT_CATS).map((k) => (
                <option key={k} value={k}>{rl.EVENT_CATS[k].glyph} {rl.EVENT_CATS[k].label}</option>
              ))}
            </select>
          </label>
          <label className="rs-field"><span className="rs-field-l">Region</span>
            <select className="rs-select" value={d.region} onChange={(e) => setD({ ...d, region: e.target.value })}>
              <option value="Global">Global</option><option value="ID">Indonesia</option><option value="US">US</option>
            </select>
          </label>
          <label className="rs-field"><span className="rs-field-l">Impact</span>
            <select className="rs-select" value={d.importance} onChange={(e) => setD({ ...d, importance: e.target.value })}>
              <option value="high">High</option><option value="med">Medium</option><option value="low">Low</option>
            </select>
          </label>
          <label className="rs-field"><span className="rs-field-l">Status</span>
            <select className="rs-select" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
              <option value="confirmed">Confirmed</option><option value="tentative">Tentative</option><option value="estimated">Estimated</option>
            </select>
          </label>
        </div>
        <div className="rs-ed-row">
          <label className="rs-field"><span className="rs-field-l">Industry</span>
            <select className="rs-select" value={d.desk_id} onChange={(e) => setD({ ...d, desk_id: e.target.value, sub_id: '' })}>
              <option value="">None</option>
              {desks.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label className="rs-field"><span className="rs-field-l">Sub-industry</span>
            <select className="rs-select" value={d.sub_id} disabled={!desk}
                    onChange={(e) => setD({ ...d, sub_id: e.target.value })}>
              <option value="">{desk ? 'Whole industry' : '—'}</option>
              {(desk ? desk.subs || [] : []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="rs-field"><span className="rs-field-l">Ticker</span>
            <input className="rs-input" style={{ maxWidth: 120 }} placeholder="opt." value={d.ticker}
                   onChange={(e) => setD({ ...d, ticker: e.target.value.toUpperCase() })} />
          </label>
          <label className="rs-field grow"><span className="rs-field-l">Entity</span>
            <input className="rs-input grow" placeholder="who / where" value={d.entity}
                   onChange={(e) => setD({ ...d, entity: e.target.value })} />
          </label>
        </div>
        <textarea className="rs-ta" rows={2} placeholder="Detail — agenda, what you expect, what it would tell you…"
                  value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} />
        <div className="rs-ed-row end">
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" disabled={busy || !d.title.trim()} onClick={() => onSave(d)}>
            {busy ? 'Saving…' : d.id ? 'Update event' : 'Add event'}
          </button>
        </div>
      </div>
    );
  };

  // ---- the calendar page ---------------------------------------------------
  const CalendarPage = ({ tax, mode, onOpenDesk }) => {
    const rl = RL();
    const cal = rl.useCalendar();
    const canEdit = mode === 'edit' && rl.canPublish();

    const [region, setRegion] = React.useState('All');
    const [cats, setCats] = React.useState([]);          // multi-select
    const [q, setQ] = React.useState('');
    const [starredOnly, setStarredOnly] = React.useState(false);
    const [showPast, setShowPast] = React.useState(false);
    const [highOnly, setHighOnly] = React.useState(false);
    const [editing, setEditing] = React.useState(null);   // event | 'new'
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 5000); };

    const today = todayISO();

    const run = (p, ok) => {
      setBusy(true);
      p.then(
        () => { setBusy(false); setEditing(null); flash(ok); cal.reload(); },
        (e) => { setBusy(false); flash('Not saved — ' + (e.message || e)); }
      );
    };

    const onStar = (e, on) => {
      if (on) run(rl.saveEventFlag(e, { starred: true }), 'Starred.');
      else run(rl.clearEventFlag(e), 'Unstarred.');
    };
    const onPriority = (e, priority) => run(rl.saveEventFlag(e, { priority }), 'Priority set to ' + priority + '.');
    const onNote = (e) => {
      const cur = (e.flag && e.flag.note) || '';
      const next = window.prompt('Your note on "' + e.title + '":', cur);
      if (next === null) return;
      run(rl.saveEventFlag(e, { note: next }), 'Note saved.');
    };
    const onDelete = (e) => {
      if (!window.confirm('Delete your event "' + e.title + '"?')) return;
      run(rl.deleteOwnEvent(e.id), 'Event deleted.');
    };

    // Filters. Past is hidden by default — a calendar is about what is coming.
    const filtered = React.useMemo(() => {
      const term = q.trim().toLowerCase();
      return cal.events.filter((e) => {
        if (!showPast && e.event_date < today) return false;
        if (region !== 'All' && e.region !== region) return false;
        if (cats.length && !cats.includes(e.category)) return false;
        if (highOnly && e.importance !== 'high') return false;
        if (starredOnly && !(e.flag && e.flag.starred)) return false;
        if (term) {
          const hay = (e.title + ' ' + e.entity + ' ' + (e.ticker || '') + ' ' + e.detail).toLowerCase();
          if (hay.indexOf(term) < 0) return false;
        }
        return true;
      });
    }, [cal.events, q, region, cats, highOnly, starredOnly, showPast, today]);

    // Group into days.
    const days = React.useMemo(() => {
      const out = [];
      let cur = null;
      filtered.forEach((e) => {
        if (!cur || cur.iso !== e.event_date) { cur = { iso: e.event_date, rows: [] }; out.push(cur); }
        cur.rows.push(e);
      });
      return out;
    }, [filtered]);

    // Categories actually present, so the chip row reflects the real book.
    const presentCats = React.useMemo(() => {
      const set = {};
      cal.events.forEach((e) => { set[e.category] = (set[e.category] || 0) + 1; });
      return Object.keys(rl.EVENT_CATS).filter((k) => set[k]);
    }, [cal.events]);

    const starredCount = cal.events.filter((e) => e.flag && e.flag.starred).length;
    const upcomingStarred = cal.events
      .filter((e) => e.flag && e.flag.starred && e.event_date >= today)
      .slice(0, 8);
    const ownCount = cal.events.filter((e) => e.src === 'research').length;

    return (
      <div className="rs-page">
        <div className="rs-board-h">
          <div className="rs-board-t">
            Calendar
            <span className="sub">
              the macro event feed plus our own · {cal.events.length} events
              {ownCount ? ' (' + ownCount + ' ours)' : ''}
              {starredCount ? ' · ' + starredCount + ' starred' : ''}
            </span>
          </div>
          {canEdit && !editing && (
            <button type="button" className="rs-btn" onClick={() => setEditing('new')}>+ Add event</button>
          )}
        </div>

        {msg && <div className="rs-flash">{msg}</div>}
        {cal.err && <div className="rs-err">{cal.err}</div>}
        {cal.feedErr && <div className="rs-err">{cal.feedErr}</div>}
        {mode === 'view' && (
          <div className="rs-note-hint">Switch to <b>Edit</b> in the rail to star events, set priorities, or add your own.</div>
        )}

        {/* starred-next strip: the "what's coming that I flagged" answer */}
        {!!upcomingStarred.length && (
          <div className="rs-catalysts">
            <span className="t">Starred next</span>
            {upcomingStarred.map((e) => {
              const pri = (e.flag && e.flag.priority) || 'normal';
              return (
                <button key={rl.eventKey(e)} type="button"
                        className={'rs-cat-chip ' + (pri === 'critical' || pri === 'high' ? 'soon' : '')}
                        title={e.title + ' · ' + e.event_date}
                        onClick={() => { setStarredOnly(true); setShowPast(false); }}>
                  <b>{e.event_date.slice(5)}</b> {e.title.slice(0, 30)}{e.title.length > 30 ? '…' : ''}
                </button>
              );
            })}
          </div>
        )}

        {editing && (
          <EventForm row={editing === 'new' ? null : (editing.raw || editing)} tax={tax} busy={busy}
                     onCancel={() => setEditing(null)}
                     onSave={(d) => run(rl.saveOwnEvent(d), 'Event saved.')} />
        )}

        {/* filters */}
        <div className="rs-watch-bar" style={{ marginTop: 12 }}>
          {['All', 'ID', 'US', 'Global'].map((r) => (
            <button key={r} type="button" className={'rs-chip ' + (region === r ? 'active' : '')}
                    onClick={() => setRegion(r)}>{r === 'ID' ? 'Indonesia' : r}</button>
          ))}
          <span className="sp" />
          <input className="rs-input" style={{ maxWidth: 220 }} placeholder="Search events…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className={'rs-chip ' + (starredOnly ? 'active' : '')}
                  onClick={() => setStarredOnly(!starredOnly)} title="Only events you starred">★ Starred</button>
          <button type="button" className={'rs-chip ' + (highOnly ? 'active' : '')}
                  onClick={() => setHighOnly(!highOnly)}>High impact</button>
          <button type="button" className={'rs-chip ' + (showPast ? 'active' : '')}
                  onClick={() => setShowPast(!showPast)}>Include past</button>
        </div>
        <div className="rs-tagbar" style={{ marginTop: 6 }}>
          {presentCats.map((k) => {
            const on = cats.includes(k);
            return (
              <button key={k} type="button" className={'rs-chip ' + (on ? 'active' : '')}
                      onClick={() => setCats(on ? cats.filter((x) => x !== k) : [...cats, k])}>
                {rl.EVENT_CATS[k].glyph} {rl.EVENT_CATS[k].label}
              </button>
            );
          })}
          {!!cats.length && <button type="button" className="rs-chip" onClick={() => setCats([])}>clear</button>}
        </div>

        {/* agenda */}
        {cal.loading && <div className="rs-empty">Loading the calendar…</div>}
        {!cal.loading && !days.length && (
          <div className="rs-empty">
            No events match. {starredOnly ? 'Nothing starred yet — star an event to pin it here.' : ''}
          </div>
        )}
        {days.map((day) => {
          const h = dayHeader(day.iso);
          return (
            <div key={day.iso} className="rc-day">
              <div className={'rc-day-h ' + (h.tag ? 'tagged' : '') + (h.diff < 0 ? ' past' : '')}>
                <span className="l">{h.label}</span>
                {h.tag && <span className="tag">{h.tag}</span>}
                <span className="n">{day.rows.length}</span>
              </div>
              {day.rows.map((e) => (
                <EventRow key={rl.eventKey(e)} e={e} tax={tax} canEdit={canEdit}
                          onStar={onStar} onPriority={onPriority} onNote={onNote}
                          onEdit={(x) => setEditing(x)} onDelete={onDelete} />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  window.RESEARCH_CALENDAR = { CalendarPage };
})();
