// ================================================================
// RESEARCH terminal (window.ResearchTerminal) — T13.
//
// The research hub. Same 13-desk / sub-industry spine as MONITOR (T12),
// but the content is ours: a house stance per desk and sub-industry, the
// note book, and the watchlist. Monitor answers "what is the market
// doing"; Research answers "what do we think, and are we right".
//
// Board → desk drill-in (sub-industry stances + notes + names) plus two
// cross-cutting pages: Notes and Watchlist. selfNav (owns its rail).
// Deep links: #research/board|notes|watchlist and
//             #research/desk/<deskId>[/<subId>]
// ================================================================
(function () {
  'use strict';

  const MD = () => window.MONITOR_DATA;
  const ML = () => window.MONITOR_LIVE;
  const RL = () => window.RESEARCH_LIVE;
  const RV = () => window.RESEARCH_VIEWS;

  // ---- board ---------------------------------------------------------------
  const DeskCard = ({ desk, stance, roll, onOpen }) => {
    const { StanceChip, DivergenceBadge, fmtPct, timeAgo } = RV();
    const benchY = (desk.bench || []).find((b) => b.y);
    const sig = ML().useDeskSignals(benchY ? benchY.y : null);
    const notes = (roll && roll.notes) || 0;
    const watches = (roll && roll.watches) || 0;
    const flagged = (roll && roll.subs_flagged) || 0;
    const nSubs = (desk.subs || []).length;
    return (
      <div className={'rs-card ' + (stance ? 'set' : '')} style={{ ['--ac']: desk.accent }}
           role="button" tabIndex={0} onClick={() => onOpen(desk.id)}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(desk.id); } }}>
        <div className="rs-card-top">
          <span className="num">{desk.num}</span>
          <span className="gics">{desk.gics && desk.gics !== '—' ? desk.gics : 'Market desk'}</span>
          {sig && sig.r1m != null && (
            <span className={'chg ' + (sig.r1m > 0 ? 'pos' : sig.r1m < 0 ? 'neg' : '')}
                  title="benchmark 1M return — the market's read">{fmtPct(sig.r1m)}</span>
          )}
        </div>
        <div className="rs-card-name">{desk.name}</div>
        <div className="rs-card-view">
          {stance
            ? <><StanceChip stance={stance.stance} conviction={stance.conviction} />
                <span className="rs-hz">{stance.horizon}</span>
                <DivergenceBadge stance={stance.stance} sig={sig} /></>
            : <span className="rs-noview">No house view</span>}
        </div>
        {stance && stance.thesis && <div className="rs-card-thesis">{stance.thesis}</div>}
        <div className="rs-card-f">
          <span title="research notes on this desk"><b>{notes}</b> notes</span>
          <span title="names on the watchlist"><b>{watches}</b> names</span>
          <span title="sub-industries with a stance set"><b>{flagged}</b>/{nSubs} flagged</span>
          <span className="sp" />
          {stance && <span className="rs-dim">{timeAgo(stance.updated_at)}</span>}
        </div>
      </div>
    );
  };

  const BoardPage = ({ book, tax, geo, setGeo, onOpenDesk, onGoMonitor }) => {
    const rl = RL();
    const { StanceChip } = RV();
    const { GeoPicker } = window.RESEARCH_TAXONOMY;
    // The board reads the merged taxonomy (built-in desks + custom industries),
    // and reads the stance for whichever geography is selected — so switching to
    // Indonesia re-reads the whole board as the ID house view.
    const equity = tax.desks.filter((d) => d.group === 'equity');
    const markets = tax.desks.filter((d) => d.group === 'markets');
    const deskStance = (id) => book.stances[rl.scopeKey(id, null, geo)] || null;

    // Book-level tally: how the house is positioned across the coverage map,
    // for the selected geography.
    const tally = React.useMemo(() => {
      const t = { bullish: 0, bearish: 0, neutral: 0, watching: 0, avoid: 0, unset: 0 };
      tax.desks.forEach((d) => {
        const s = book.stances[rl.scopeKey(d.id, null, geo)];
        if (s) t[s.stance] = (t[s.stance] || 0) + 1; else t.unset++;
      });
      return t;
    }, [book.stances, tax.desks, geo]);

    const openNames = book.watch.filter((w) => ['watching', 'researching', 'candidate'].includes(w.status)).length;

    return (
      <div className="rs-page">
        <div className="rs-board-h">
          <div className="rs-board-t">
            Research board
            <span className="sub">
              the house view across all {tax.desks.length} industries
              {geo && geo !== rl.GLOBAL ? ' · ' + rl.geoLabel(geo, tax.countries) : ''}
            </span>
          </div>
          <GeoPicker value={geo} countries={tax.countries} onChange={setGeo} />
          <div className="rs-tally">
            {['bullish', 'bearish', 'neutral', 'watching', 'avoid'].map((s) => (
              tally[s] ? <span key={s} className="rs-tally-i"><StanceChip stance={s} small /><b>{tally[s]}</b></span> : null
            ))}
            {tally.unset ? <span className="rs-tally-i"><span className="rs-noview sm">no view</span><b>{tally.unset}</b></span> : null}
            <span className="rs-tally-i"><span className="rs-dim">open names</span><b>{openNames}</b></span>
          </div>
          <button type="button" className="rs-btn ghost" onClick={onGoMonitor} title="Open the same desk map in Monitor (T12)">
            Monitor →
          </button>
        </div>
        {book.err && <div className="rs-err">{book.err}</div>}
        <div className="rs-sec">Equity desks</div>
        <div className="rs-grid">
          {equity.map((d) => <DeskCard key={d.id} desk={d} stance={deskStance(d.id)} roll={book.rollup[d.id]} onOpen={onOpenDesk} />)}
        </div>
        <div className="rs-sec">Market desks</div>
        <div className="rs-grid">
          {markets.map((d) => <DeskCard key={d.id} desk={d} stance={deskStance(d.id)} roll={book.rollup[d.id]} onOpen={onOpenDesk} />)}
        </div>
      </div>
    );
  };

  // ---- notes (shared by the Notes page and the desk Notes tab) -------------
  // `scope` pins the query and pre-fills the capture box. The list reloads
  // whenever the scope or a filter changes, and after every mutation.
  const NotesPanel = ({ scope, showFilters, emptyHint, mode, tax }) => {
    const rl = RL(), rv = RV();
    // Notes are personal work, so edit mode alone unlocks them — no
    // admin/management requirement (RLS lets anyone write their own).
    const canWrite = mode === 'edit';
    const [rows, setRows] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [err, setErr] = React.useState('');
    const [editing, setEditing] = React.useState(null);   // note object | 'new'
    const [q, setQ] = React.useState('');
    const [kind, setKind] = React.useState('');
    const [tag, setTag] = React.useState('');
    const meId = (rl.me() || {}).id;
    const isAdmin = rl.canPublish();

    // Debounce the free-text query so typing doesn't fire a request per key.
    const [qDebounced, setQDebounced] = React.useState('');
    React.useEffect(() => {
      const h = setTimeout(() => setQDebounced(q), 250);
      return () => clearTimeout(h);
    }, [q]);

    const query = React.useMemo(() => ({
      ...scope,
      q: qDebounced || undefined,
      kind: kind || undefined,
      tag: tag || undefined,
    }), [scope.deskId, scope.subId, scope.ticker, qDebounced, kind, tag]);

    const load = React.useCallback(() => {
      if (!rl.lbcSession()) { setRows([]); setErr('Sign in to see research notes.'); return; }
      rl.fetchNotes(query).then((r) => { setRows(r); setErr(''); }, (e) => { setRows([]); setErr(e.message || String(e)); });
    }, [query]);
    React.useEffect(() => { load(); }, [load]);

    const create = (note) => {
      setBusy(true);
      // scope first: an explicit choice in the long-form editor (including
      // "No desk") must win over the scope the panel was mounted in.
      rl.createNote({ ...scope, ...note }).then(
        () => { setBusy(false); setEditing(null); load(); },
        (e) => { setBusy(false); setErr(e.message || String(e)); }
      );
    };
    const save = (patch) => {
      if (editing === 'new') return create(patch);
      setBusy(true);
      rl.updateNote(editing.id, patch).then(
        () => { setBusy(false); setEditing(null); load(); },
        (e) => { setBusy(false); setErr(e.message || String(e)); }
      );
    };
    const del = (note) => {
      if (!window.confirm('Delete "' + (note.title || 'this note') + '"?')) return;
      rl.deleteNote(note.id).then(load, (e) => setErr(e.message || String(e)));
    };
    const pin = (note) => {
      rl.updateNote(note.id, { pinned: !note.pinned }).then(load, (e) => setErr(e.message || String(e)));
    };

    // All tags present in the current result set — a cheap, always-accurate
    // filter list (no separate tag table to drift out of sync).
    const tags = React.useMemo(() => {
      const set = {};
      (rows || []).forEach((r) => (r.tags || []).forEach((t) => { set[t] = (set[t] || 0) + 1; }));
      return Object.keys(set).sort((a, b) => set[b] - set[a]).slice(0, 14);
    }, [rows]);

    return (
      <div className="rs-notes">
        {canWrite && (editing ? (
          <rv.NoteEditor note={editing === 'new' ? null : editing} defaults={scope} tax={tax}
                         onSave={save} onCancel={() => setEditing(null)} busy={busy} />
        ) : (
          <rv.QuickCapture defaults={scope} onCreate={create} busy={busy}
                           placeholder={scope.ticker
                             ? 'Capture a note on ' + scope.ticker + '… ⌘/Ctrl+Enter to file.'
                             : 'Capture something interesting — first line becomes the title. ⌘/Ctrl+Enter to file.'} />
        ))}
        {!editing && (
          <div className="rs-notes-bar">
            <input className="rs-input grow" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
            {showFilters && (
              <select className="rs-select" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">All kinds</option>
                {rl.NOTE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            )}
            {canWrite && <button type="button" className="rs-btn ghost" onClick={() => setEditing('new')}>Long-form…</button>}
          </div>
        )}
        {!!tags.length && !editing && (
          <div className="rs-tagbar">
            {tag && <button type="button" className="rs-chip active" onClick={() => setTag('')}>#{tag} ✕</button>}
            {!tag && tags.map((t) => (
              <button key={t} type="button" className="rs-chip" onClick={() => setTag(t)}>#{t}</button>
            ))}
          </div>
        )}
        {err && <div className="rs-err">{err}</div>}
        {rows == null && <div className="rs-empty">Loading notes…</div>}
        {rows && !rows.length && <div className="rs-empty">{emptyHint || 'No notes yet. Capture the first one above.'}</div>}
        {rows && rows.map((n) => (
          <rv.NoteCard key={n.id} note={n} canEdit={canWrite && (isAdmin || n.author_id === meId)}
                       onEdit={setEditing} onDelete={del} onPin={pin}
                       onOpenScope={(note) => {
                         if (note.desk_id) window.location.hash = '#research/desk/' + note.desk_id + (note.sub_id ? '/' + note.sub_id : '');
                       }} />
        ))}
      </div>
    );
  };

  // ---- desk drill-in -------------------------------------------------------
  const DeskView = ({ deskId, subId, setSubId, book, tax, geo, setGeo, mode, onReload }) => {
    const rl = RL(), rv = RV();
    const { GeoPicker } = window.RESEARCH_TAXONOMY;
    // Look the desk up in the MERGED taxonomy, so a custom industry opens the
    // same way a built-in desk does.
    const desk = tax.desks.find((d) => d.id === deskId) || null;
    const [tab, setTab] = React.useState('notes');
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [watchEdit, setWatchEdit] = React.useState(null);  // row | 'new'
    const benchY = desk ? (desk.bench || []).find((b) => b.y) : null;
    const sig = ML().useDeskSignals(benchY ? benchY.y : null);
    // Editing is gated by BOTH the UI mode and the server rule. Mode is the
    // deliberate "I am here to change things" switch; RLS is the real
    // enforcement. A read-tier user in edit mode still sees read-only controls.
    const canPublish = rl.canPublish();
    const canEdit = mode === 'edit' && canPublish;

    // Everything below must be computed BEFORE the `!desk` bail-out: an early
    // return above a hook would change the hook order on a bad desk id.
    const activeSub = desk && subId && subId !== 'all' ? (desk.subs || []).find((s) => s.id === subId) : null;
    const scopeKey = rl.scopeKey(deskId, subId, geo);
    const stance = book.stances[scopeKey] || null;
    const deskStance = book.stances[rl.scopeKey(deskId, null, geo)] || null;
    const scopeLabel = desk ? (activeSub ? desk.name + ' · ' + activeSub.name : desk.name) : '';

    const watchRows = desk
      ? book.watch.filter((w) => w.desk_id === deskId && (!activeSub || w.sub_id === activeSub.id))
      : [];
    const quotes = rl.useWatchQuotes(watchRows);

    // Unknown desk id — a link to a deleted custom industry, or a hash opened
    // before the taxonomy loaded. Say so rather than rendering nothing.
    if (!desk) {
      return (
        <div className="rs-page">
          <div className="rs-empty" style={{ flexDirection: 'column', gap: 10 }}>
            {tax.loading
              ? <div>Loading the taxonomy…</div>
              : <>
                  <div>No industry with the id <code>{deskId}</code>.</div>
                  <div className="rs-dim">It may have been deleted. Its notes and stances are still in the database.</div>
                </>}
          </div>
        </div>
      );
    }

    const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 5000); };

    const saveStance = (draft) => {
      setBusy(true);
      rl.saveStance(deskId, subId, draft, geo).then(
        () => { setBusy(false); flash('House view saved · ' + rl.geoLabel(geo, tax.countries) + '.'); onReload(); },
        (e) => { setBusy(false); flash('Not saved — ' + (e.message || e)); }
      );
    };
    const clearStance = () => {
      setBusy(true);
      rl.clearStance(deskId, subId, geo).then(
        () => { setBusy(false); flash('House view cleared.'); onReload(); },
        (e) => { setBusy(false); flash('Not cleared — ' + (e.message || e)); }
      );
    };
    const saveWatch = (d) => {
      setBusy(true);
      rl.saveWatch({ ...d, deskId: d.deskId || deskId, subId: d.subId || (activeSub ? activeSub.id : null) }).then(
        () => { setBusy(false); setWatchEdit(null); flash('Watchlist updated.'); onReload(); },
        (e) => { setBusy(false); flash('Not saved — ' + (e.message || e)); }
      );
    };
    const delWatch = (row) => {
      if (!window.confirm('Remove ' + row.ticker + ' from the watchlist?')) return;
      rl.deleteWatch(row.id).then(() => { flash('Removed.'); onReload(); }, (e) => flash('Not removed — ' + (e.message || e)));
    };

    const scope = { deskId, subId: activeSub ? activeSub.id : null };
    const subStance = (s) => book.stances['sub:' + deskId + '/' + s.id];

    return (
      <div className="rs-desk" style={{ ['--ac']: desk.accent }}>
        <div className="rs-desk-h">
          <div className="rs-desk-id">
            <span className="num">{desk.num}</span>
            <div>
              <div className="name">{desk.name}</div>
              <div className="short">{desk.short}</div>
            </div>
          </div>
          <div className="rs-desk-actions">
            <GeoPicker value={geo} countries={tax.countries} onChange={setGeo} />
            {sig && sig.r1m != null && (
              <span className="rs-market" title="Monitor's read: benchmark 1M / 3M return">
                market 1M <b className={sig.r1m > 0 ? 'pos' : 'neg'}>{rv.fmtPct(sig.r1m)}</b>
              </span>
            )}
            <rv.DivergenceBadge stance={stance && stance.stance} sig={sig} />
            {!desk.custom && (
              <button type="button" className="rs-btn ghost"
                      onClick={() => { window.location.hash = '#monitor/desk/' + deskId + (activeSub ? '/' + activeSub.id : ''); }}
                      title="Open this desk in Monitor (T12)">Open in Monitor →</button>
            )}
          </div>
        </div>

        {msg && <div className="rs-flash">{msg}</div>}

        <div className="rs-desk-body">
          <div className="rs-subs">
            <div className="rs-subs-h">Sub-industries</div>
            <div className={'rs-sub ' + (!activeSub ? 'active' : '')} onClick={() => setSubId('all')}
                 role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSubId('all'); }}>
              <span className="n">All {desk.name}</span>
              {deskStance
                ? <rv.StanceChip stance={deskStance.stance} conviction={deskStance.conviction} small />
                : <span className="rs-subdim">—</span>}
            </div>
            {(desk.subs || []).map((s) => {
              const st = subStance(s);
              return (
                <div key={s.id} className={'rs-sub ' + (activeSub && activeSub.id === s.id ? 'active' : '')}
                     onClick={() => setSubId(s.id)} title={s.note || ''}
                     role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSubId(s.id); }}>
                  <span className="n">{s.name}</span>
                  {st ? <rv.StanceChip stance={st.stance} conviction={st.conviction} small /> : <span className="rs-subdim">—</span>}
                </div>
              );
            })}
            <div className="rs-subs-note">
              Flag any sub-industry with a stance. The chips here are the house view
              for <b>{rl.geoLabel(geo, tax.countries)}</b>, not price action.
            </div>
          </div>

          <div className="rs-desk-main">
            <rv.StanceEditor scopeLabel={scopeLabel + ' · ' + rl.geoLabel(geo, tax.countries)}
                             value={stance} canPublish={canEdit} mode={mode}
                             onSave={saveStance} onClear={clearStance} busy={busy} />

            <div className="rs-tabs">
              {[['notes', 'Notes'], ['watch', 'Watchlist (' + watchRows.length + ')'], ['names', 'Coverage universe']].map(([id, label]) => (
                <button key={id} type="button" className={'rs-tab ' + (tab === id ? 'active' : '')} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            {tab === 'notes' && (
              <NotesPanel scope={scope} showFilters mode={mode} tax={tax}
                          emptyHint={'No notes on ' + scopeLabel + ' yet.'
                            + (mode === 'edit' ? ' Capture the first one above.' : ' Switch to Edit mode to add one.')} />
            )}

            {tab === 'watch' && (
              <div className="rs-watch">
                {watchEdit ? (
                  <rv.WatchEditor row={watchEdit === 'new' ? null : watchEdit} tax={tax}
                                  onSave={saveWatch} onCancel={() => setWatchEdit(null)} busy={busy} />
                ) : canEdit ? (
                  <div className="rs-watch-bar">
                    <button type="button" className="rs-btn" onClick={() => setWatchEdit('new')}>+ Add a name to watch</button>
                    <span className="rs-dim">names flagged under {scopeLabel}</span>
                  </div>
                ) : mode === 'view' ? null : (
                  <div className="rs-note-hint">Adding names needs a management or admin login.</div>
                )}
                <rv.WatchTable rows={watchRows} quotes={quotes} canEdit={canEdit}
                               onEdit={setWatchEdit} onDelete={delWatch}
                               onOpenNotes={(r) => { window.location.hash = '#research/note/' + encodeURIComponent(r.ticker); }} />
              </div>
            )}

            {tab === 'names' && (
              <CoverageUniverse desk={desk} subId={activeSub ? activeSub.id : 'all'} watch={book.watch}
                                canPublish={canEdit} onWatch={saveWatch} />
            )}
          </div>
        </div>
      </div>
    );
  };

  // The desk's full constituent list from the shared coverage book, with the
  // names already on the watchlist marked — so "what do I cover" and "what am
  // I actually working on" are visible in the same place.
  const CoverageUniverse = ({ desk, subId, watch, canPublish, onWatch }) => {
    const md = MD(), rv = RV();
    const [region, setRegion] = React.useState('ALL');
    const rows = md.deskUniverse(desk, subId, region, null);
    const onList = React.useMemo(() => {
      const m = {};
      (watch || []).forEach((w) => { m[w.ticker] = w; });
      return m;
    }, [watch]);
    if (!rows.length) return <div className="rs-empty">This desk carries no single names (market desk).</div>;
    return (
      <div className="rs-universe">
        <div className="rs-watch-bar">
          {md.REGION_FILTERS.map((r) => (
            <button key={r.id} type="button" className={'rs-chip ' + (region === r.id ? 'active' : '')}
                    onClick={() => setRegion(r.id)}>{r.label}</button>
          ))}
          <span className="sp" />
          <span className="rs-dim">{rows.length} names · {rows.filter((r) => onList[r.t]).length} on the watchlist</span>
        </div>
        <div className="rs-uni-grid">
          {rows.map((r) => {
            const w = onList[r.t];
            return (
              <div key={r.t || r.tv} className={'rs-uni ' + (w ? 'on' : '')}>
                <div className="rs-uni-t">
                  {(md.COUNTRIES[r.c] || {}).f} {r.t}
                  {w && <rv.StanceChip stance={w.stance} small />}
                </div>
                <div className="rs-uni-n">{r.n}</div>
                <div className="rs-uni-s">{r.sub}</div>
                {canPublish && !w && (
                  <button type="button" className="rs-uni-add"
                          onClick={() => onWatch({ ticker: r.t, name: r.n, deskId: desk.id, subId: r.subId, stance: 'watching', status: 'watching', conviction: 3 })}>
                    + watch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- watchlist page ------------------------------------------------------
  const WatchlistPage = ({ book, tax, mode, onReload, onOpenDesk }) => {
    const rl = RL(), rv = RV();
    const [status, setStatus] = React.useState('');
    const [stance, setStance] = React.useState('');
    const [editing, setEditing] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const canEdit = mode === 'edit' && rl.canPublish();

    const rows = book.watch.filter((w) =>
      (!status || w.status === status) && (!stance || w.stance === stance));
    const quotes = rl.useWatchQuotes(rows);
    const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 5000); };

    const save = (d) => {
      setBusy(true);
      rl.saveWatch(d).then(
        () => { setBusy(false); setEditing(null); flash('Watchlist updated.'); onReload(); },
        (e) => { setBusy(false); flash('Not saved — ' + (e.message || e)); }
      );
    };
    const del = (row) => {
      if (!window.confirm('Remove ' + row.ticker + ' from the watchlist?')) return;
      rl.deleteWatch(row.id).then(() => { flash('Removed.'); onReload(); }, (e) => flash('Not removed — ' + (e.message || e)));
    };

    // Catalysts inside 30 days, soonest first — the "what's about to happen"
    // strip. Past-dated catalysts stay out; they belong in the table.
    const upcoming = book.watch
      .map((w) => ({ w, d: rl.daysTo(w.catalyst_date) }))
      .filter((x) => x.d != null && x.d >= 0 && x.d <= 30)
      .sort((a, b) => a.d - b.d);

    return (
      <div className="rs-page">
        <div className="rs-board-h">
          <div className="rs-board-t">Watchlist<span className="sub">names flagged across every desk</span></div>
          <div className="rs-watch-bar">
            <select className="rs-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {rl.WATCH_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select className="rs-select" value={stance} onChange={(e) => setStance(e.target.value)}>
              <option value="">All views</option>
              {rl.STANCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {canEdit && <button type="button" className="rs-btn" onClick={() => setEditing('new')}>+ Add name</button>}
          </div>
        </div>
        {msg && <div className="rs-flash">{msg}</div>}
        {!!upcoming.length && (
          <div className="rs-catalysts">
            <span className="t">Catalysts ≤30d</span>
            {upcoming.map(({ w, d }) => (
              <button key={w.id} type="button" className={'rs-cat-chip ' + (d <= 7 ? 'soon' : '')}
                      onClick={() => w.desk_id && onOpenDesk(w.desk_id)}
                      title={w.catalyst || 'catalyst'}>
                <b>{w.ticker}</b> {d === 0 ? 'today' : 'in ' + d + 'd'}
              </button>
            ))}
          </div>
        )}
        {editing && (
          <rv.WatchEditor row={editing === 'new' ? null : editing} tax={tax} onSave={save} onCancel={() => setEditing(null)} busy={busy} />
        )}
        <rv.WatchTable rows={rows} quotes={quotes} canEdit={canEdit}
                       onEdit={setEditing} onDelete={del}
                       onOpenNotes={(r) => { window.location.hash = '#research/note/' + encodeURIComponent(r.ticker); }} />
      </div>
    );
  };

  // ---- notes page ----------------------------------------------------------
  const NotesPage = ({ ticker, onClearTicker, tax, mode }) => {
    const [deskId, setDeskId] = React.useState('');
    const scope = React.useMemo(
      () => (ticker ? { ticker } : (deskId ? { deskId } : {})),
      [ticker, deskId]
    );
    return (
      <div className="rs-page">
        <div className="rs-board-h">
          <div className="rs-board-t">
            {ticker ? 'Notes · ' + ticker : 'Note book'}
            <span className="sub">{ticker ? 'everything filed against this name' : 'every research note, newest first'}</span>
          </div>
          <div className="rs-watch-bar">
            {ticker
              ? <button type="button" className="rs-btn ghost" onClick={onClearTicker}>← All notes</button>
              : (
                <select className="rs-select" value={deskId} onChange={(e) => setDeskId(e.target.value)}>
                  <option value="">All desks</option>
                  {tax.desks.map((d) => <option key={d.id} value={d.id}>{d.num} · {d.name}</option>)}
                </select>
              )}
          </div>
        </div>
        <NotesPanel key={ticker || deskId || 'all'} scope={scope} showFilters mode={mode} tax={tax} />
      </div>
    );
  };

  // ---- error boundary ------------------------------------------------------
  class RsBoundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) {
      try { ML().beacon('research-boundary', (err && err.message) || String(err), ((info && info.componentStack) || '').slice(0, 900)); } catch {}
    }
    render() {
      if (this.state.err) {
        return (
          <div className="rs-page">
            <div className="rs-empty" style={{ flexDirection: 'column', gap: 10 }}>
              <div>Something broke in this Research view ({String((this.state.err && this.state.err.message) || this.state.err)}).</div>
              <button type="button" className="rs-btn" onClick={() => this.setState({ err: null })}>Reload view</button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // ---- rail + root ---------------------------------------------------------
  const RAIL_TOP = [
    { id: 'board', label: 'Research Board', glyph: '⊞' },
    { id: 'notes', label: 'Note Book', glyph: '❏' },
    { id: 'watchlist', label: 'Watchlist', glyph: '◉' },
    { id: 'structure', label: 'Structure', glyph: '⚙' },
  ];

  // #research/board|notes|watchlist|structure · #research/desk/<id>[/<sub>] ·
  // #research/note/<TICKER>
  //
  // Desk ids are NOT validated here: a custom industry lives in the database and
  // the taxonomy has not loaded yet at parse time. DeskView renders an
  // "unknown desk" state instead, so a stale link degrades rather than silently
  // bouncing to the board.
  const parseHash = () => {
    const m = (window.location.hash || '').match(/^#research(?:\/([a-z]+))?(?:\/([^/]+))?(?:\/([^/]+))?/);
    if (!m) return null;
    const kind = m[1], id = m[2], sub = m[3];
    if (kind === 'desk' && id) {
      return { view: { type: 'desk', id: decodeURIComponent(id) }, subId: sub ? decodeURIComponent(sub) : 'all', ticker: '' };
    }
    if (kind === 'note' && id) return { view: { type: 'notes' }, subId: 'all', ticker: decodeURIComponent(id).toUpperCase() };
    if (['board', 'notes', 'watchlist', 'structure'].includes(kind)) return { view: { type: kind }, subId: 'all', ticker: '' };
    return { view: { type: 'board' }, subId: 'all', ticker: '' };
  };

  const MODE_KEY = 'lbc_research_mode';

  const ResearchTerminal = () => {
    const md = MD(), rl = RL();
    const initial = React.useMemo(parseHash, []);
    const [view, setView] = React.useState(initial ? initial.view : { type: 'board' });
    const [subId, setSubId] = React.useState(initial ? initial.subId : 'all');
    const [ticker, setTicker] = React.useState(initial ? initial.ticker : '');
    const book = rl.useResearchBook();
    const tax = rl.useTaxonomy();

    // Geography the house view applies to. Not a filter — it selects WHICH
    // stance you are reading and writing.
    const [geo, setGeo] = React.useState(rl.GLOBAL);

    // View vs Edit. Defaults to VIEW deliberately: the terminal is read far more
    // often than it is edited, and a stray click should never mutate the book.
    // Persisted so it survives a reload but not shared between users.
    const [mode, setMode] = React.useState(() => {
      try { return localStorage.getItem(MODE_KEY) === 'edit' ? 'edit' : 'view'; } catch { return 'view'; }
    });
    React.useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);

    // state → hash (replaceState: no history spam, and it does not re-fire
    // hashchange, so the listener below cannot loop)
    React.useEffect(() => {
      const h = view.type === 'desk'
        ? '#research/desk/' + view.id + (subId && subId !== 'all' ? '/' + encodeURIComponent(subId) : '')
        : ticker && view.type === 'notes'
          ? '#research/note/' + encodeURIComponent(ticker)
          : '#research/' + view.type;
      try { history.replaceState(null, '', h); } catch {}
    }, [view, subId, ticker]);

    React.useEffect(() => {
      const onHash = () => {
        const p = parseHash();
        if (p) { setView(p.view); setSubId(p.subId); setTicker(p.ticker); }
      };
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const openDesk = (id) => { setSubId('all'); setTicker(''); setView({ type: 'desk', id }); };
    const goMonitor = () => { window.location.hash = '#monitor/coverage'; };
    const equity = tax.desks.filter((d) => d.group === 'equity');
    const markets = tax.desks.filter((d) => d.group === 'markets');
    const keyAct = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

    const RailDesk = ({ d }) => {
      const st = book.stances[rl.scopeKey(d.id, null, geo)];
      const m = st ? rl.stanceMeta(st.stance) : null;
      return (
        <div className={'rs-rail-item desk ' + (view.type === 'desk' && view.id === d.id ? 'active' : '')}
             style={{ ['--ac']: d.accent }} onClick={() => openDesk(d.id)} title={d.short}
             role="button" tabIndex={0} onKeyDown={keyAct(() => openDesk(d.id))}>
          <span className="num">{d.num}</span>
          <span className="lbl">{d.name}</span>
          {m && <span className={'rs-rail-st ' + m.cls} title={m.label}>{m.glyph}</span>}
        </div>
      );
    };

    return (
      <div className="rs-root">
        <div className="rs-rail">
          <div className="rs-rail-brand">RESEARCH<span className="v">T13</span></div>
          {/* View vs Edit. Nothing in the terminal is editable until Edit is on,
              which is also why the default is View. */}
          <div className="rs-mode" role="group" aria-label="Mode">
            {[['view', 'View', '◎'], ['edit', 'Edit', '✎']].map(([id, label, glyph]) => (
              <button key={id} type="button" className={'rs-mode-b ' + (mode === id ? 'active' : '')}
                      onClick={() => setMode(id)} aria-pressed={mode === id}
                      title={id === 'view'
                        ? 'Read-only. Nothing can be changed.'
                        : 'Add and edit views, notes, names and structure.'}>
                <span className="g">{glyph}</span>{label}
              </button>
            ))}
          </div>
          {mode === 'edit' && !rl.canPublish() && (
            <div className="rs-mode-note">Notes only — the house view and structure need a management login.</div>
          )}
          {RAIL_TOP.map((r) => (
            <div key={r.id} className={'rs-rail-item ' + (view.type === r.id ? 'active' : '')}
                 onClick={() => { setTicker(''); setView({ type: r.id }); }}
                 role="button" tabIndex={0} onKeyDown={keyAct(() => { setTicker(''); setView({ type: r.id }); })}>
              <span className="glyph">{r.glyph}</span>
              <span className="lbl">{r.label}</span>
            </div>
          ))}
          <div className="rs-rail-sec">Equity desks</div>
          {equity.map((d) => <RailDesk key={d.id} d={d} />)}
          {!!markets.length && <div className="rs-rail-sec">Market desks</div>}
          {markets.map((d) => <RailDesk key={d.id} d={d} />)}
          <div className="rs-rail-foot">
            {tax.industries.length
              ? tax.industries.length + ' custom · ' + (tax.desks.length - tax.industries.length) + ' built-in'
              : 'Same spine as Monitor'}
            <br />coverage v{md.VERSION}
          </div>
        </div>
        <div className="rs-body">
          {(book.loading || tax.loading) && <div className="rs-flash">Loading the research book…</div>}
          <RsBoundary key={view.type + ':' + (view.id || '') + ':' + ticker}>
            {view.type === 'board' && (
              <BoardPage book={book} tax={tax} geo={geo} setGeo={setGeo}
                         onOpenDesk={openDesk} onGoMonitor={goMonitor} />
            )}
            {view.type === 'desk' && (
              <DeskView key={view.id} deskId={view.id} subId={subId} setSubId={setSubId}
                        book={book} tax={tax} geo={geo} setGeo={setGeo} mode={mode}
                        onReload={book.reload} />
            )}
            {view.type === 'notes' && (
              <NotesPage ticker={ticker} onClearTicker={() => setTicker('')} tax={tax} mode={mode} />
            )}
            {view.type === 'watchlist' && (
              <WatchlistPage book={book} tax={tax} mode={mode} onReload={book.reload} onOpenDesk={openDesk} />
            )}
            {view.type === 'structure' && (
              <window.RESEARCH_TAXONOMY.StructurePage tax={tax} mode={mode}
                                                      onChanged={() => { tax.reload(); book.reload(); }}
                                                      onOpenDesk={openDesk} />
            )}
          </RsBoundary>
        </div>
      </div>
    );
  };

  window.ResearchTerminal = ResearchTerminal;
})();
