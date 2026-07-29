// ================================================================
// RESEARCH · shared views (window.RESEARCH_VIEWS) — T13.
// Stance chips + editor, note cards + editor, quick capture, the
// watchlist table and the ticker picker. Presentation only: every
// component takes data and callbacks, none of them fetch.
// ================================================================
(function () {
  'use strict';

  const RL = () => window.RESEARCH_LIVE;
  const MD = () => window.MONITOR_DATA;

  // legion.jsx owns the markdown renderer and the relative-time helper; reuse
  // them rather than shipping a second implementation. Both are read at call
  // time so load order between the two terminals cannot matter.
  const md = (s) => (window.legionMd ? window.legionMd(s) : String(s || ''));
  const timeAgo = (iso) => (window.lgTimeAgo ? window.lgTimeAgo(iso) : (iso || '').slice(0, 10));

  const fmtPct = (v) => (v == null || isNaN(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(2) + '%');
  const fmtNum = (v) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }));
  const pctCls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');

  // ---- stance --------------------------------------------------------------
  const StanceChip = ({ stance, conviction, small, title }) => {
    const m = RL().stanceMeta(stance);
    return (
      <span className={'rs-stance ' + m.cls + (small ? ' sm' : '')} title={title || (m.label + (conviction ? ' · conviction ' + conviction + '/5' : ''))}>
        <span className="g">{m.glyph}</span>
        <span className="l">{m.label}</span>
        {conviction ? <span className="cv">{conviction}</span> : null}
      </span>
    );
  };

  const ConvictionDots = ({ value, onChange, readOnly }) => (
    <span className="rs-dots" role={readOnly ? undefined : 'radiogroup'} aria-label="Conviction">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={readOnly}
                className={'rs-dot ' + (n <= (value || 0) ? 'on' : '')}
                title={'Conviction ' + n + '/5'} aria-label={'Conviction ' + n}
                onClick={readOnly ? undefined : () => onChange(n)} />
      ))}
    </span>
  );

  // Inline stance editor for a desk or a sub-industry. `canPublish` false →
  // read-only render, so an analyst never meets a button that 403s.
  const StanceEditor = ({ scopeLabel, value, canPublish, mode, onSave, onClear, busy }) => {
    const rl = RL();
    const [draft, setDraft] = React.useState(() => ({
      stance: (value && value.stance) || 'watching',
      conviction: (value && value.conviction) || 3,
      horizon: (value && value.horizon) || '6M',
      thesis: (value && value.thesis) || '',
    }));
    // Re-sync when the scope changes underneath (desk → sub switch).
    React.useEffect(() => {
      setDraft({
        stance: (value && value.stance) || 'watching',
        conviction: (value && value.conviction) || 3,
        horizon: (value && value.horizon) || '6M',
        thesis: (value && value.thesis) || '',
      });
    }, [value && value.scope_id, value && value.updated_at]);

    const dirty = !value
      ? true
      : draft.stance !== value.stance || draft.conviction !== value.conviction ||
        draft.horizon !== value.horizon || draft.thesis !== (value.thesis || '');

    if (!canPublish) {
      return (
        <div className="rs-stance-ed read">
          <div className="rs-stance-ed-h">House view · {scopeLabel}</div>
          {value ? (
            <>
              <StanceChip stance={value.stance} conviction={value.conviction} />
              <span className="rs-hz">{value.horizon}</span>
              {value.thesis && <p className="rs-thesis">{value.thesis}</p>}
              <div className="rs-by">{value.updated_by_name || '—'} · {timeAgo(value.updated_at)}</div>
            </>
          ) : <div className="rs-empty-line">No house view set.</div>}
          <div className="rs-note-hint">{mode === 'view'
            ? 'Switch to Edit mode in the rail to set the house view.'
            : 'Setting the house view needs a management or admin login.'}</div>
        </div>
      );
    }

    return (
      <div className="rs-stance-ed">
        <div className="rs-stance-ed-h">House view · {scopeLabel}</div>
        <div className="rs-stance-row">
          {rl.STANCES.map((s) => (
            <button key={s.id} type="button"
                    className={'rs-stance-pick ' + s.cls + (draft.stance === s.id ? ' active' : '')}
                    onClick={() => setDraft({ ...draft, stance: s.id })}>
              <span className="g">{s.glyph}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="rs-stance-row">
          <label className="rs-lbl">Conviction</label>
          <ConvictionDots value={draft.conviction} onChange={(n) => setDraft({ ...draft, conviction: n })} />
          <label className="rs-lbl">Horizon</label>
          <select className="rs-select" value={draft.horizon} onChange={(e) => setDraft({ ...draft, horizon: e.target.value })}>
            {rl.HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <textarea className="rs-ta" rows={2} placeholder="Thesis in one line — why this view, what would change it…"
                  value={draft.thesis} onChange={(e) => setDraft({ ...draft, thesis: e.target.value })} />
        <div className="rs-stance-row end">
          {value && <button type="button" className="rs-btn ghost" onClick={onClear} disabled={busy}>Clear</button>}
          <button type="button" className="rs-btn" disabled={busy || !dirty} onClick={() => onSave(draft)}>
            {busy ? 'Saving…' : value ? 'Update view' : 'Set view'}
          </button>
        </div>
        {value && <div className="rs-by">Last set by {value.updated_by_name || '—'} · {timeAgo(value.updated_at)}</div>}
      </div>
    );
  };

  // ---- notes ---------------------------------------------------------------
  // `tax` is optional: NoteCard renders in lists that may not carry it. Falls
  // back to the built-in book, then to the raw id — a note on a custom industry
  // must never mislabel itself as "General".
  const scopeLabelFor = (note, tax) => {
    if (note.ticker) return note.ticker;
    if (!note.desk_id) return 'General';
    const desks = (tax && tax.desks) || (MD() ? MD().DESKS : []);
    const d = desks.find((x) => x.id === note.desk_id);
    if (!d) return note.desk_id;
    if (!note.sub_id) return d.name;
    const s = (d.subs || []).find((x) => x.id === note.sub_id);
    return d.name + ' · ' + (s ? s.name : note.sub_id);
  };

  const NoteCard = ({ note, onEdit, onDelete, onPin, onOpenScope, canEdit }) => {
    const [open, setOpen] = React.useState(false);
    const long = (note.body || '').length > 260;
    return (
      <div className={'rs-note ' + (note.pinned ? 'pinned' : '')}>
        <div className="rs-note-h">
          <span className={'rs-kind k-' + note.kind}>{note.kind}</span>
          <span className="rs-note-title">{note.title || '(untitled)'}</span>
          <span className="sp" />
          {(note.desk_id || note.ticker) && (
            <button type="button" className="rs-scope" title="Open this scope"
                    onClick={() => onOpenScope && onOpenScope(note)}>{scopeLabelFor(note)}</button>
          )}
          {canEdit && (
            <>
              <button type="button" className="rs-icon" title={note.pinned ? 'Unpin' : 'Pin'} onClick={() => onPin(note)}>
                {note.pinned ? '★' : '☆'}
              </button>
              <button type="button" className="rs-icon" title="Edit" onClick={() => onEdit(note)}>✎</button>
              <button type="button" className="rs-icon danger" title="Delete" onClick={() => onDelete(note)}>✕</button>
            </>
          )}
        </div>
        {note.body && (
          <div className={'rs-note-body ' + (long && !open ? 'clamp' : '')}
               dangerouslySetInnerHTML={{ __html: md(note.body) }} />
        )}
        {long && (
          <button type="button" className="rs-more" onClick={() => setOpen(!open)}>
            {open ? 'Show less' : 'Show more'}
          </button>
        )}
        <div className="rs-note-f">
          {(note.tags || []).map((t) => <span key={t} className="rs-tag">#{t}</span>)}
          <span className="sp" />
          <span className="rs-by">{note.author || '—'} · {timeAgo(note.updated_at)}</span>
        </div>
      </div>
    );
  };

  // Create + edit share one editor. `note` null = create.
  const NoteEditor = ({ note, defaults, tax, onSave, onCancel, busy }) => {
    const rl = RL();
    const [d, setD] = React.useState(() => ({
      title: (note && note.title) || '',
      body: (note && note.body) || '',
      kind: (note && note.kind) || (defaults && defaults.kind) || 'note',
      tags: ((note && note.tags) || []).join(', '),
      deskId: (note ? note.desk_id : (defaults && defaults.deskId)) || '',
      subId: (note ? note.sub_id : (defaults && defaults.subId)) || '',
      ticker: (note ? note.ticker : (defaults && defaults.ticker)) || '',
      pinned: !!(note && note.pinned),
    }));
    const desks = (tax && tax.desks) || (MD() ? MD().DESKS : []);
    const desk = d.deskId ? desks.find((x) => x.id === d.deskId) : null;
    const submit = () => {
      if (!d.title.trim() && !d.body.trim()) return;
      onSave({
        title: d.title.trim() || d.body.trim().split('\n')[0].slice(0, 80),
        body: d.body,
        kind: d.kind,
        tags: d.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
        deskId: d.deskId || null,
        subId: d.subId || null,
        ticker: d.ticker.trim().toUpperCase() || null,
        pinned: d.pinned,
      });
    };
    return (
      <div className="rs-editor">
        <div className="rs-ed-row">
          <input className="rs-input grow" placeholder="Title…" value={d.title}
                 onChange={(e) => setD({ ...d, title: e.target.value })} />
          <select className="rs-select" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })}>
            {rl.NOTE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <textarea className="rs-ta big" rows={8} placeholder="Markdown. **bold**, - lists, [[wikilinks]] …"
                  value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
        <div className="rs-ed-row">
          <select className="rs-select" value={d.deskId}
                  onChange={(e) => setD({ ...d, deskId: e.target.value, subId: '' })}>
            <option value="">No desk</option>
            {desks.map((x) => <option key={x.id} value={x.id}>{x.num} · {x.name}</option>)}
          </select>
          <select className="rs-select" value={d.subId} disabled={!desk}
                  onChange={(e) => setD({ ...d, subId: e.target.value })}>
            <option value="">{desk ? 'Whole desk' : '—'}</option>
            {(desk ? desk.subs || [] : []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="rs-input" style={{ maxWidth: 130 }} placeholder="Ticker (opt.)" value={d.ticker}
                 onChange={(e) => setD({ ...d, ticker: e.target.value })} />
        </div>
        <div className="rs-ed-row">
          <input className="rs-input grow" placeholder="tags, comma separated" value={d.tags}
                 onChange={(e) => setD({ ...d, tags: e.target.value })} />
          <label className="rs-check">
            <input type="checkbox" checked={d.pinned} onChange={(e) => setD({ ...d, pinned: e.target.checked })} /> Pin
          </label>
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save note'}</button>
        </div>
      </div>
    );
  };

  // The "saw something interesting" box. One field, Ctrl/Cmd+Enter to file.
  // Scope defaults come from wherever it is mounted, so a note captured
  // inside a desk lands on that desk without extra clicks.
  const QuickCapture = ({ defaults, onCreate, busy, placeholder }) => {
    const [txt, setTxt] = React.useState('');
    const [kind, setKind] = React.useState('note');
    const rl = RL();
    const file = () => {
      const body = txt.trim();
      if (!body || busy) return;
      const lines = body.split('\n');
      onCreate({
        title: lines[0].slice(0, 80),
        body: lines.length > 1 ? lines.slice(1).join('\n').trim() : '',
        kind,
        tags: [],
        deskId: (defaults && defaults.deskId) || null,
        subId: (defaults && defaults.subId) || null,
        ticker: (defaults && defaults.ticker) || null,
      });
      setTxt('');
    };
    return (
      <div className="rs-capture">
        <textarea className="rs-ta" rows={2} value={txt} onChange={(e) => setTxt(e.target.value)}
                  placeholder={placeholder || 'Capture something — first line becomes the title. ⌘/Ctrl+Enter to file.'}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); file(); } }} />
        <div className="rs-capture-f">
          {rl.NOTE_KINDS.slice(0, 5).map((k) => (
            <button key={k.id} type="button" className={'rs-chip ' + (kind === k.id ? 'active' : '')}
                    onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
          <span className="sp" />
          <button type="button" className="rs-btn" onClick={file} disabled={busy || !txt.trim()}>File it</button>
        </div>
      </div>
    );
  };

  // ---- watchlist -----------------------------------------------------------
  // Search the shared Monitor universe. MONITOR_DATA.searchUniverse returns
  // desk/sub *names* (it feeds a display list); the watchlist needs the ids so
  // a watched name stays on the same spine as everything else — so walk the
  // desks directly here instead.
  const searchNames = (q) => {
    const mdd = MD();
    const term = (q || '').trim().toLowerCase();
    if (!mdd || !term) return [];
    const out = [];
    mdd.DESKS.forEach((d) => {
      (d.subs || []).forEach((s) => {
        (s.u || []).forEach((r) => {
          if (!r.t) return;
          if (r.t.toLowerCase().indexOf(term) < 0 && (r.n || '').toLowerCase().indexOf(term) < 0) return;
          out.push({ t: r.t, n: r.n, c: r.c, deskId: d.id, deskName: d.name, subId: s.id, subName: s.name });
        });
      });
    });
    return out;
  };

  const TickerPicker = ({ onPick }) => {
    const [q, setQ] = React.useState('');
    const results = React.useMemo(() => searchNames(q).slice(0, 12), [q]);
    return (
      <div className="rs-picker">
        <input className="rs-input" placeholder="Search the coverage universe (ticker or name)…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        {!!results.length && (
          <div className="rs-picker-list">
            {results.map((r) => (
              <button key={r.t} type="button" className="rs-picker-row" onClick={() => { onPick(r); setQ(''); }}>
                <span className="t">{r.t}</span>
                <span className="n">{r.n}</span>
                <span className="d">{r.deskName} · {r.subName}</span>
              </button>
            ))}
          </div>
        )}
        {q.trim() && !results.length && (
          <div className="rs-picker-list">
            <button type="button" className="rs-picker-row" onClick={() => { onPick({ t: q.trim().toUpperCase(), n: '' }); setQ(''); }}>
              <span className="t">{q.trim().toUpperCase()}</span>
              <span className="n">Add as free-text ticker</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const WatchEditor = ({ row, tax, onSave, onCancel, busy }) => {
    const rl = RL();
    const [d, setD] = React.useState(() => ({
      ticker: (row && row.ticker) || '',
      name: (row && row.name) || '',
      deskId: (row && row.desk_id) || '',
      subId: (row && row.sub_id) || '',
      stance: (row && row.stance) || 'watching',
      conviction: (row && row.conviction) || 3,
      status: (row && row.status) || 'watching',
      thesis: (row && row.thesis) || '',
      target_price: (row && row.target_price) != null ? String(row.target_price) : '',
      entry_price: (row && row.entry_price) != null ? String(row.entry_price) : '',
      catalyst: (row && row.catalyst) || '',
      catalyst_date: (row && row.catalyst_date) || '',
    }));
    const desks = (tax && tax.desks) || (MD() ? MD().DESKS : []);
    const desk = d.deskId ? desks.find((x) => x.id === d.deskId) : null;
    return (
      <div className="rs-editor">
        {!row && (
          <TickerPicker onPick={(r) => setD({
            ...d, ticker: r.t, name: r.n || '',
            deskId: r.deskId || d.deskId, subId: r.subId || d.subId,
          })} />
        )}
        <div className="rs-ed-row">
          <input className="rs-input" style={{ maxWidth: 120 }} placeholder="Ticker" value={d.ticker}
                 onChange={(e) => setD({ ...d, ticker: e.target.value.toUpperCase() })} />
          <input className="rs-input grow" placeholder="Company name" value={d.name}
                 onChange={(e) => setD({ ...d, name: e.target.value })} />
        </div>
        <div className="rs-ed-row">
          <select className="rs-select" value={d.deskId} onChange={(e) => setD({ ...d, deskId: e.target.value, subId: '' })}>
            <option value="">No desk</option>
            {desks.map((x) => <option key={x.id} value={x.id}>{x.num} · {x.name}</option>)}
          </select>
          <select className="rs-select" value={d.subId} disabled={!desk} onChange={(e) => setD({ ...d, subId: e.target.value })}>
            <option value="">{desk ? 'Whole desk' : '—'}</option>
            {(desk ? desk.subs || [] : []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rs-select" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
            {rl.WATCH_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="rs-ed-row">
          {rl.STANCES.map((s) => (
            <button key={s.id} type="button" className={'rs-stance-pick ' + s.cls + (d.stance === s.id ? ' active' : '')}
                    onClick={() => setD({ ...d, stance: s.id })}>
              <span className="g">{s.glyph}</span> {s.label}
            </button>
          ))}
          <ConvictionDots value={d.conviction} onChange={(n) => setD({ ...d, conviction: n })} />
        </div>
        <div className="rs-ed-row">
          <input className="rs-input" style={{ maxWidth: 130 }} placeholder="Target price" value={d.target_price}
                 onChange={(e) => setD({ ...d, target_price: e.target.value })} />
          <input className="rs-input" style={{ maxWidth: 130 }} placeholder="Entry / cost" value={d.entry_price}
                 onChange={(e) => setD({ ...d, entry_price: e.target.value })} />
          <input className="rs-input grow" placeholder="Catalyst — what makes this move" value={d.catalyst}
                 onChange={(e) => setD({ ...d, catalyst: e.target.value })} />
          <input className="rs-input" type="date" style={{ maxWidth: 160 }} value={d.catalyst_date || ''}
                 onChange={(e) => setD({ ...d, catalyst_date: e.target.value })} />
        </div>
        <textarea className="rs-ta" rows={2} placeholder="Thesis — why watch it, what you need to believe…"
                  value={d.thesis} onChange={(e) => setD({ ...d, thesis: e.target.value })} />
        <div className="rs-ed-row end">
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" disabled={busy || !d.ticker.trim()} onClick={() => onSave(d)}>
            {busy ? 'Saving…' : row ? 'Update name' : 'Add to watchlist'}
          </button>
        </div>
      </div>
    );
  };

  // Live price, distance to target and catalyst countdown in one row. Quotes
  // are whatever Monitor already has cached — a missing quote degrades to '—'
  // rather than blocking the row.
  const WatchTable = ({ rows, quotes, onEdit, onDelete, onOpenNotes, canEdit }) => {
    const rl = RL();
    if (!rows.length) return <div className="rs-empty">No names on the watchlist yet.</div>;
    return (
      <div className="rs-table-wrap">
        <table className="rs-table">
          <thead>
            <tr>
              <th>Name</th><th>View</th><th>Status</th><th className="r">Last</th><th className="r">Chg</th>
              <th className="r">Target</th><th className="r">Upside</th><th>Catalyst</th><th>Thesis</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const q = quotes[r.ticker];
              const price = q && !q.error ? q.price : null;
              const up = rl.upsideTo(price, r.target_price);
              const dte = rl.daysTo(r.catalyst_date);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="rs-tk">{r.ticker}</div>
                    <div className="rs-tn">{r.name}</div>
                  </td>
                  <td><StanceChip stance={r.stance} conviction={r.conviction} small /></td>
                  <td><span className={'rs-status s-' + r.status}>{r.status}</span></td>
                  <td className="r">{price == null ? '—' : fmtNum(price)}</td>
                  <td className={'r ' + pctCls(q && q.changePct)}>{q && !q.error ? fmtPct(q.changePct) : '—'}</td>
                  <td className="r">{r.target_price == null ? '—' : fmtNum(r.target_price)}</td>
                  <td className={'r ' + pctCls(up)}>{up == null ? '—' : fmtPct(up)}</td>
                  <td>
                    {r.catalyst ? <span className="rs-cat" title={r.catalyst}>{r.catalyst}</span> : <span className="rs-dim">—</span>}
                    {dte != null && (
                      <span className={'rs-dte ' + (dte < 0 ? 'past' : dte <= 14 ? 'soon' : '')}>
                        {dte < 0 ? Math.abs(dte) + 'd ago' : dte === 0 ? 'today' : 'in ' + dte + 'd'}
                      </span>
                    )}
                  </td>
                  <td className="rs-th" title={r.thesis}>{r.thesis || <span className="rs-dim">—</span>}</td>
                  <td className="r nowrap">
                    <button type="button" className="rs-icon" title="Notes on this name" onClick={() => onOpenNotes(r)}>❏</button>
                    {canEdit && <button type="button" className="rs-icon" title="Edit" onClick={() => onEdit(r)}>✎</button>}
                    {canEdit && <button type="button" className="rs-icon danger" title="Remove" onClick={() => onDelete(r)}>✕</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Divergence badge — the whole reason Research sits on Monitor's spine.
  const DivergenceBadge = ({ stance, sig }) => {
    const d = RL().divergence(stance, sig);
    if (!d) return null;
    return <span className={'rs-diverge ' + d.kind} title={d.hint}>{d.label}</span>;
  };

  window.RESEARCH_VIEWS = {
    StanceChip, ConvictionDots, StanceEditor,
    NoteCard, NoteEditor, QuickCapture, scopeLabelFor,
    TickerPicker, WatchEditor, WatchTable,
    DivergenceBadge,
    md, timeAgo, fmtPct, fmtNum, pctCls,
  };
})();
