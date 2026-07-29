// ================================================================
// RESEARCH · taxonomy manager (window.RESEARCH_TAXONOMY) — T13.
//
// The Structure page: add / edit / remove industries, sub-industry categories
// and countries, plus the geography selector used to scope a house view.
//
// Everything here is edit-mode only at the call site, and admin/management only
// at the server (RLS). Built-in desks and countries from the coverage book are
// shown but NOT editable — they are the shared spine with Monitor, and letting
// Research rename them would desync the two terminals.
// ================================================================
(function () {
  'use strict';

  const RL = () => window.RESEARCH_LIVE;

  // ---- geography selector --------------------------------------------------
  // A house view is scoped: Global, a region, or a single country. Switching
  // this switches which stance you are reading/writing — it is not a filter.
  const GeoPicker = ({ value, countries, onChange, compact }) => {
    const rl = RL();
    const opts = React.useMemo(() => rl.geoOptions(countries), [countries]);
    return (
      <select className={'rs-select' + (compact ? ' sm' : '')} value={value || rl.GLOBAL}
              onChange={(e) => onChange(e.target.value)}
              title="Geography this house view applies to">
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.kind === 'global' ? '🌐 Global' : o.kind === 'region' ? '◧ ' + o.label : o.label}
          </option>
        ))}
      </select>
    );
  };

  // ---- small inline row editor --------------------------------------------
  const Field = ({ label, children }) => (
    <label className="rs-field">
      <span className="rs-field-l">{label}</span>
      {children}
    </label>
  );

  const IndustryForm = ({ row, onSave, onCancel, busy }) => {
    const rl = RL();
    const [d, setD] = React.useState(() => ({
      id: (row && row.id) || '',
      name: (row && row.name) || '',
      short: (row && row.short) || '',
      gics: (row && row.gics) || '',
      grp: (row && row.grp) || 'custom',
      accent: (row && row.accent) || '#b8a7f0',
      sort_order: (row && row.sort_order) != null ? row.sort_order : 100,
    }));
    const slug = d.id || rl.slugify(d.name);
    return (
      <div className="rs-editor">
        <div className="rs-ed-row">
          <Field label="Industry name">
            <input className="rs-input" placeholder="e.g. Renewables & Grid" value={d.name}
                   onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="id">
            <input className="rs-input" style={{ maxWidth: 170 }} value={slug} disabled={!!row}
                   onChange={(e) => setD({ ...d, id: rl.slugify(e.target.value) })} />
          </Field>
          <Field label="Accent">
            <input className="rs-input" type="color" style={{ width: 52, padding: 2 }} value={d.accent}
                   onChange={(e) => setD({ ...d, accent: e.target.value })} />
          </Field>
        </div>
        <div className="rs-ed-row">
          <Field label="One-line description">
            <input className="rs-input grow" placeholder="what this desk covers" value={d.short}
                   onChange={(e) => setD({ ...d, short: e.target.value })} />
          </Field>
          <Field label="Group">
            <select className="rs-select" value={d.grp} onChange={(e) => setD({ ...d, grp: e.target.value })}>
              <option value="custom">Custom</option>
              <option value="equity">Equity desk</option>
              <option value="markets">Market desk</option>
            </select>
          </Field>
          <Field label="Order">
            <input className="rs-input" style={{ width: 74 }} type="number" value={d.sort_order}
                   onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="rs-ed-row end">
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" disabled={busy || !d.name.trim()}
                  onClick={() => onSave({ ...d, id: row ? row.id : slug })}>
            {busy ? 'Saving…' : row ? 'Update industry' : 'Add industry'}
          </button>
        </div>
      </div>
    );
  };

  const SubForm = ({ row, desks, defaultIndustry, onSave, onCancel, busy }) => {
    const rl = RL();
    const [d, setD] = React.useState(() => ({
      id: (row && row.id) || '',
      industry_id: (row && row.industry_id) || defaultIndustry || '',
      name: (row && row.name) || '',
      note: (row && row.note) || '',
      sort_order: (row && row.sort_order) != null ? row.sort_order : 100,
    }));
    const slug = d.id || rl.slugify(d.name);
    return (
      <div className="rs-editor">
        <div className="rs-ed-row">
          <Field label="Belongs to">
            <select className="rs-select" value={d.industry_id}
                    onChange={(e) => setD({ ...d, industry_id: e.target.value })} disabled={!!row}>
              <option value="">Pick an industry…</option>
              {desks.map((x) => (
                <option key={x.id} value={x.id}>{x.name}{x.custom ? ' (custom)' : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Sub-industry name">
            <input className="rs-input grow" placeholder="e.g. Grid Equipment" value={d.name}
                   onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="id">
            <input className="rs-input" style={{ maxWidth: 150 }} value={slug} disabled={!!row}
                   onChange={(e) => setD({ ...d, id: rl.slugify(e.target.value) })} />
          </Field>
        </div>
        <div className="rs-ed-row">
          <Field label="Note">
            <input className="rs-input grow" placeholder="what sits in this category" value={d.note}
                   onChange={(e) => setD({ ...d, note: e.target.value })} />
          </Field>
          <Field label="Order">
            <input className="rs-input" style={{ width: 74 }} type="number" value={d.sort_order}
                   onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="rs-ed-row end">
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" disabled={busy || !d.name.trim() || !d.industry_id}
                  onClick={() => onSave({ ...d, id: row ? row.id : slug })}>
            {busy ? 'Saving…' : row ? 'Update sub-industry' : 'Add sub-industry'}
          </button>
        </div>
      </div>
    );
  };

  const CountryForm = ({ row, onSave, onCancel, busy }) => {
    const [d, setD] = React.useState(() => ({
      code: (row && row.code) || '',
      name: (row && row.name) || '',
      region: (row && row.region) || 'AP',
      flag: (row && row.flag) || '',
      asean: !!(row && row.asean),
      sort_order: (row && row.sort_order) != null ? row.sort_order : 100,
      existing: !!row,
    }));
    return (
      <div className="rs-editor">
        <div className="rs-ed-row">
          <Field label="Code">
            <input className="rs-input" style={{ maxWidth: 110 }} placeholder="e.g. NG" value={d.code}
                   disabled={!!row}
                   onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Name">
            <input className="rs-input grow" placeholder="e.g. Nigeria" value={d.name}
                   onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="Flag">
            <input className="rs-input" style={{ maxWidth: 74 }} placeholder="🇳🇬" value={d.flag}
                   onChange={(e) => setD({ ...d, flag: e.target.value })} />
          </Field>
        </div>
        <div className="rs-ed-row">
          <Field label="Region">
            <select className="rs-select" value={d.region} onChange={(e) => setD({ ...d, region: e.target.value })}>
              <option value="AM">Americas</option>
              <option value="EU">Europe</option>
              <option value="AP">Asia-Pacific</option>
              <option value="ME">Middle East &amp; Africa</option>
            </select>
          </Field>
          <label className="rs-check">
            <input type="checkbox" checked={d.asean} onChange={(e) => setD({ ...d, asean: e.target.checked })} /> ASEAN
          </label>
          <Field label="Order">
            <input className="rs-input" style={{ width: 74 }} type="number" value={d.sort_order}
                   onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="rs-ed-row end">
          <button type="button" className="rs-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="rs-btn" disabled={busy || !d.code.trim()} onClick={() => onSave(d)}>
            {busy ? 'Saving…' : row ? 'Update country' : 'Add country'}
          </button>
        </div>
      </div>
    );
  };

  // ---- the Structure page --------------------------------------------------
  const StructurePage = ({ tax, mode, onChanged, onOpenDesk }) => {
    const rl = RL();
    const canEdit = mode === 'edit' && rl.canPublish();
    const [tab, setTab] = React.useState('industries');
    const [editing, setEditing] = React.useState(null);   // {kind, row|'new'}
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 6000); };

    const run = (p, okMsg) => {
      setBusy(true);
      p.then(
        () => { setBusy(false); setEditing(null); flash(okMsg); onChanged(); },
        (e) => { setBusy(false); flash('Not saved — ' + (e.message || e)); }
      );
    };

    const builtinDesks = tax.desks.filter((d) => !d.custom);
    const customDesks = tax.desks.filter((d) => d.custom);
    const customCountries = Object.keys(tax.countries).filter((c) => tax.countries[c].custom);
    const builtinCountryCount = Object.keys(tax.countries).length - customCountries.length;

    const TABS = [
      ['industries', 'Industries (' + tax.desks.length + ')'],
      ['subs', 'Sub-industries'],
      ['countries', 'Countries (' + Object.keys(tax.countries).length + ')'],
    ];

    return (
      <div className="rs-page">
        <div className="rs-board-h">
          <div className="rs-board-t">
            Structure
            <span className="sub">the research taxonomy — industries, sub-industry categories and geographies</span>
          </div>
        </div>
        {msg && <div className="rs-flash">{msg}</div>}
        {mode === 'view' && (
          <div className="rs-note-hint">
            You are in view mode. Switch to <b>Edit</b> in the rail to change the structure.
          </div>
        )}

        <div className="rs-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={'rs-tab ' + (tab === id ? 'active' : '')}
                    onClick={() => { setTab(id); setEditing(null); }}>{label}</button>
          ))}
        </div>

        {/* ---------------- industries ---------------- */}
        {tab === 'industries' && (
          <>
            {canEdit && (editing && editing.kind === 'industry'
              ? <IndustryForm row={editing.row === 'new' ? null : editing.row} busy={busy}
                              onCancel={() => setEditing(null)}
                              onSave={(d) => run(rl.saveIndustry(d), 'Industry saved.')} />
              : <div className="rs-watch-bar">
                  <button type="button" className="rs-btn" onClick={() => setEditing({ kind: 'industry', row: 'new' })}>
                    + Add industry
                  </button>
                  <span className="rs-dim">custom industries sit alongside the {builtinDesks.length} built-in desks</span>
                </div>)}

            <div className="rs-sec">Custom industries</div>
            {!customDesks.length && <div className="rs-empty">None yet. {canEdit ? 'Add one above.' : ''}</div>}
            <div className="rs-tax-grid">
              {customDesks.map((d) => (
                <div key={d.id} className="rs-tax" style={{ ['--ac']: d.accent }}>
                  <div className="rs-tax-h">
                    <span className="nm">{d.name}</span>
                    <span className="id">{d.id}</span>
                  </div>
                  <div className="rs-tax-s">{d.short || <span className="rs-dim">no description</span>}</div>
                  <div className="rs-tax-f">
                    <span className="rs-dim">{(d.subs || []).length} sub-industries</span>
                    <span className="sp" />
                    <button type="button" className="rs-icon" title="Open" onClick={() => onOpenDesk(d.id)}>→</button>
                    {canEdit && (
                      <>
                        <button type="button" className="rs-icon" title="Edit"
                                onClick={() => setEditing({ kind: 'industry', row: tax.industries.find((x) => x.id === d.id) })}>✎</button>
                        <button type="button" className="rs-icon danger" title="Delete"
                                onClick={() => {
                                  if (!window.confirm('Delete industry "' + d.name + '"?\n\nIts notes, stances and watchlist rows are NOT deleted — they stay in the database unparented.')) return;
                                  run(rl.deleteIndustry(d.id), 'Industry deleted.');
                                }}>✕</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rs-sec">Built-in desks · shared with Monitor</div>
            <div className="rs-tax-grid">
              {builtinDesks.map((d) => (
                <div key={d.id} className="rs-tax locked" style={{ ['--ac']: d.accent }}>
                  <div className="rs-tax-h">
                    <span className="nm">{d.name}</span>
                    <span className="id">{d.num}</span>
                  </div>
                  <div className="rs-tax-s">{d.short}</div>
                  <div className="rs-tax-f">
                    <span className="rs-dim">{(d.subs || []).length} sub-industries</span>
                    <span className="sp" />
                    <span className="rs-lock" title="Built-in desks are the shared spine with Monitor and cannot be renamed here — but you can add sub-industries to them.">locked</span>
                    <button type="button" className="rs-icon" title="Open" onClick={() => onOpenDesk(d.id)}>→</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------------- sub-industries ---------------- */}
        {tab === 'subs' && (
          <>
            {canEdit && (editing && editing.kind === 'sub'
              ? <SubForm row={editing.row === 'new' ? null : editing.row} desks={tax.desks} busy={busy}
                         defaultIndustry={editing.industryId}
                         onCancel={() => setEditing(null)}
                         onSave={(d) => run(rl.saveSubindustry(d), 'Sub-industry saved.')} />
              : <div className="rs-watch-bar">
                  <button type="button" className="rs-btn" onClick={() => setEditing({ kind: 'sub', row: 'new' })}>
                    + Add sub-industry
                  </button>
                  <span className="rs-dim">you can add categories to built-in desks as well as custom ones</span>
                </div>)}

            {tax.desks.map((d) => {
              const custom = (d.subs || []).filter((s) => s.custom);
              const builtin = (d.subs || []).filter((s) => !s.custom);
              if (!custom.length && !builtin.length) return null;
              return (
                <div key={d.id} className="rs-tax-group">
                  <div className="rs-tax-group-h" style={{ ['--ac']: d.accent }}>
                    <span className="nm">{d.name}</span>
                    {d.custom && <span className="rs-badge">custom</span>}
                    <span className="sp" />
                    {canEdit && (
                      <button type="button" className="rs-chip"
                              onClick={() => setEditing({ kind: 'sub', row: 'new', industryId: d.id })}>+ add here</button>
                    )}
                  </div>
                  <div className="rs-sub-chips">
                    {builtin.map((s) => <span key={s.id} className="rs-subchip locked" title="built-in">{s.name}</span>)}
                    {custom.map((s) => (
                      <span key={s.id} className="rs-subchip custom">
                        {s.name}
                        {canEdit && (
                          <>
                            <button type="button" className="x" title="Edit"
                                    onClick={() => setEditing({ kind: 'sub', row: tax.subindustries.find((x) => x.id === s.id) })}>✎</button>
                            <button type="button" className="x danger" title="Delete"
                                    onClick={() => {
                                      if (!window.confirm('Delete sub-industry "' + s.name + '"?')) return;
                                      run(rl.deleteSubindustry(s.id), 'Sub-industry deleted.');
                                    }}>✕</button>
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ---------------- countries ---------------- */}
        {tab === 'countries' && (
          <>
            {canEdit && (editing && editing.kind === 'country'
              ? <CountryForm row={editing.row === 'new' ? null : editing.row} busy={busy}
                             onCancel={() => setEditing(null)}
                             onSave={(d) => run(rl.saveCountry(d), 'Country saved.')} />
              : <div className="rs-watch-bar">
                  <button type="button" className="rs-btn" onClick={() => setEditing({ kind: 'country', row: 'new' })}>
                    + Add country
                  </button>
                  <span className="rs-dim">{builtinCountryCount} built-in · {customCountries.length} custom</span>
                </div>)}

            <div className="rs-sec">Custom geographies</div>
            {!customCountries.length && <div className="rs-empty">None yet. {canEdit ? 'Add one above.' : ''}</div>}
            <div className="rs-sub-chips">
              {customCountries.map((code) => {
                const c = tax.countries[code];
                return (
                  <span key={code} className="rs-subchip custom">
                    {c.f} {c.n} <span className="rs-dim">{code}</span>
                    {canEdit && (
                      <>
                        <button type="button" className="x" title="Edit"
                                onClick={() => setEditing({ kind: 'country', row: tax.countriesRaw.find((x) => x.code === code) })}>✎</button>
                        <button type="button" className="x danger" title="Delete"
                                onClick={() => {
                                  if (!window.confirm('Delete geography "' + (c.n || code) + '"?')) return;
                                  run(rl.deleteCountry(code), 'Country deleted.');
                                }}>✕</button>
                      </>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="rs-sec">Built-in geographies · shared with Monitor</div>
            <div className="rs-sub-chips">
              {Object.keys(tax.countries).filter((c) => !tax.countries[c].custom).sort().map((code) => (
                <span key={code} className="rs-subchip locked">
                  {tax.countries[code].f} {tax.countries[code].n}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  window.RESEARCH_TAXONOMY = { StructurePage, GeoPicker };
})();
