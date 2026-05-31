/* =========================================================================
   FINANCE (T10) — ops module: Transfers, Recurring, Tags, Periods,
   Audit, Settings.
   Loads after finance-core.jsx and finance.jsx. No build step. All globals
   on window. Exposes window.FN_Ops = { Transfers, Recurring, Tags,
   Periods, Audit, Settings }.
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback } = React;
  const ce = React.createElement;

  /* =========================================================================
     TRANSFERS — Inter-entity capital movements
     ========================================================================= */
  function Transfers({ ctx }) {
    const { F, FN, fmt, entities, accounts } = ctx;
    const [transfers, setTransfers] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [toastNode, pushToast] = FN.useToast();

    const load = useCallback(() => {
      F.get('/inter_entity_transfers?select=id,ref,date,amount_idr,memo,from_entity_id,to_entity_id,from_txn_id,to_txn_id,created_at&order=created_at.desc&limit=200')
        .then(setTransfers)
        .catch(() => { setTransfers([]); pushToast('Could not load transfers.', true); });
    }, [F]);

    useEffect(() => { load(); }, [load]);

    const entityCode = (id) => {
      const e = entities.find(x => x.id === id);
      return e ? e.code : '—';
    };

    return ce('div', null,
      ce('div', { className: 'fn-filterbar' },
        ce('div', { style: { flex: 1 } }),
        ce('button', { className: 'fn-btn', onClick: () => setShowModal(true) },
          FN.Icons.plus, 'New transfer')),
      transfers === null
        ? ce(FN.Spinner, { label: 'Loading transfers…' })
        : transfers.length === 0
          ? ce(FN.Empty, { title: 'No transfers yet', sub: 'Record an inter-entity capital movement to get started.', icon: FN.Icons.transfer })
          : ce('div', { className: 'fn-tablewrap' },
              ce('table', { className: 'fn-table' },
                ce('thead', null, ce('tr', null,
                  ce('th', { style: { width: 100 } }, 'Date'),
                  ce('th', { style: { width: 130 } }, 'Ref'),
                  ce('th', null, 'From → To'),
                  ce('th', null, 'Memo'),
                  ce('th', { className: 'r' }, 'Amount (IDR)'))),
                ce('tbody', null, transfers.map(t =>
                  ce('tr', { key: t.id },
                    ce('td', { className: 'fn-mono fn-muted' }, fmt.date(t.date)),
                    ce('td', null, ce('span', { className: 'fn-ref' }, t.ref)),
                    ce('td', { className: 'fn-mono', style: { fontSize: 12 } },
                      ce('span', { className: 'fn-code' }, entityCode(t.from_entity_id)),
                      ce('span', { className: 'fn-muted', style: { margin: '0 6px' } }, '→'),
                      ce('span', { className: 'fn-code' }, entityCode(t.to_entity_id))),
                    ce('td', null, t.memo || '—'),
                    ce('td', { className: 'r fn-num' }, fmt.n(t.amount_idr))))))),
      showModal
        ? ce(TransferModal, { ctx, onClose: () => setShowModal(false), onPosted: (refs) => { setShowModal(false); pushToast('Transfer posted: ' + refs); load(); ctx.reloadTxns(); } })
        : null,
      toastNode);
  }

  function TransferModal({ ctx, onClose, onPosted }) {
    const { F, FN, entities, accounts } = ctx;
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [fromEntityId, setFromEntityId] = useState('');
    const [toEntityId, setToEntityId] = useState('');
    const [fromAccountId, setFromAccountId] = useState('');
    const [fromClearingId, setFromClearingId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [toClearingId, setToClearingId] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    // Leaf accounts (non-root) per entity
    const leafAccounts = useCallback((entityId) => {
      if (!entityId) return [];
      return accounts.filter(a => a.entity_id === entityId && !a.is_root)
        .sort((a, b) => a.code.localeCompare(b.code));
    }, [accounts]);

    const fromAccts = useMemo(() => leafAccounts(fromEntityId), [leafAccounts, fromEntityId]);
    const toAccts = useMemo(() => leafAccounts(toEntityId), [leafAccounts, toEntityId]);

    // Reset account selects when entity changes
    useEffect(() => { setFromAccountId(''); setFromClearingId(''); }, [fromEntityId]);
    useEffect(() => { setToAccountId(''); setToClearingId(''); }, [toEntityId]);

    const acctOpt = (a) => ce('option', { key: a.id, value: a.id }, a.code + ' · ' + a.name);

    const post = async () => {
      setErr('');
      const amt = parseFloat(amount);
      if (!fromEntityId || !toEntityId) return setErr('Select both a From and To entity.');
      if (fromEntityId === toEntityId) return setErr('From and To entities must differ.');
      if (!(amt > 0)) return setErr('Amount must be greater than zero.');
      if (!fromAccountId) return setErr('Select the From account (bank account money leaves).');
      if (!fromClearingId) return setErr('Select the From clearing account (Due from intercompany).');
      if (!toAccountId) return setErr('Select the To account (bank account money arrives).');
      if (!toClearingId) return setErr('Select the To clearing account (Due to intercompany).');
      setBusy(true);
      try {
        const res = await F.rpc('post_inter_entity_transfer', {
          p_date: date,
          p_amount: amt,
          p_memo: memo || null,
          p_from_entity_id: fromEntityId,
          p_from_account_id: fromAccountId,
          p_from_clearing_account_id: fromClearingId,
          p_to_entity_id: toEntityId,
          p_to_account_id: toAccountId,
          p_to_clearing_account_id: toClearingId,
        });
        const row = Array.isArray(res) ? res[0] : res;
        const refs = row ? (row.from_ref + ' + ' + row.to_ref) : '';
        onPosted(refs);
      } catch (e) {
        setErr('Could not post transfer. ' + (e && e.message ? e.message : 'Check fields and try again.'));
        setBusy(false);
      }
    };

    const entityOpts = entities.map(e => ce('option', { key: e.id, value: e.id }, e.code + ' — ' + e.name));

    return ce(FN.Modal, {
      title: 'New inter-entity transfer', onClose, wide: true,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: post, disabled: busy }, busy ? 'Posting…' : 'Post transfer')),
    },
      err ? ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      ce('div', { className: 'fn-field-row', style: { marginBottom: 14 } },
        ce(FN.Field, { label: 'Date' }, ce('input', { type: 'date', value: date, onChange: e => setDate(e.target.value) })),
        ce(FN.Field, { label: 'Amount (IDR)' }, ce('input', { className: 'fn-num', inputMode: 'decimal', value: amount, placeholder: '0', onChange: e => setAmount(e.target.value.replace(/[^0-9.]/g, '')) }))),
      ce(FN.Field, { label: 'Memo' }, ce('input', { value: memo, placeholder: 'Purpose of transfer…', onChange: e => setMemo(e.target.value) })),
      ce('div', { style: { height: 16 } }),
      ce('div', { className: 'fn-fromto' },
        /* FROM side */
        ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ce('div', { className: 'fn-panel-tag', style: { marginBottom: 2 } }, 'From entity'),
          ce(FN.Field, { label: 'Entity' },
            ce('select', { value: fromEntityId, onChange: e => setFromEntityId(e.target.value) },
              ce('option', { value: '' }, 'Select entity…'), entityOpts)),
          ce(FN.Field, { label: 'Bank account (money leaves)' },
            ce('select', { value: fromAccountId, onChange: e => setFromAccountId(e.target.value), disabled: !fromEntityId },
              ce('option', { value: '' }, 'Select account…'), fromAccts.map(acctOpt))),
          ce(FN.Field, { label: 'Clearing account (Due from interco)' },
            ce('select', { value: fromClearingId, onChange: e => setFromClearingId(e.target.value), disabled: !fromEntityId },
              ce('option', { value: '' }, 'Select account…'), fromAccts.map(acctOpt)))),
        ce('div', { className: 'fn-fromto-arrow', style: { paddingBottom: 0, paddingTop: 60 } }, FN.Icons.arrow),
        /* TO side */
        ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ce('div', { className: 'fn-panel-tag', style: { marginBottom: 2 } }, 'To entity'),
          ce(FN.Field, { label: 'Entity' },
            ce('select', { value: toEntityId, onChange: e => setToEntityId(e.target.value) },
              ce('option', { value: '' }, 'Select entity…'), entityOpts)),
          ce(FN.Field, { label: 'Bank account (money arrives)' },
            ce('select', { value: toAccountId, onChange: e => setToAccountId(e.target.value), disabled: !toEntityId },
              ce('option', { value: '' }, 'Select account…'), toAccts.map(acctOpt))),
          ce(FN.Field, { label: 'Clearing account (Due to interco)' },
            ce('select', { value: toClearingId, onChange: e => setToClearingId(e.target.value), disabled: !toEntityId },
              ce('option', { value: '' }, 'Select account…'), toAccts.map(acctOpt))))));
  }

  /* =========================================================================
     RECURRING — recurring_templates CRUD + "Post now"
     ========================================================================= */

  // Compute next run date from start_date, frequency, day_of_month
  function computeNextRun(startDate, frequency, dayOfMonth, afterDate) {
    // afterDate defaults to today
    const base = afterDate ? new Date(afterDate) : new Date();
    base.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Candidate: push start forward by one period until it is after base
    let candidate = new Date(start);

    const advanceOnePeriod = (d) => {
      const n = new Date(d);
      if (frequency === 'weekly') {
        n.setDate(n.getDate() + 7);
      } else if (frequency === 'monthly') {
        n.setMonth(n.getMonth() + 1);
        if (dayOfMonth) {
          const max = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
          n.setDate(Math.min(dayOfMonth, max));
        }
      } else if (frequency === 'quarterly') {
        n.setMonth(n.getMonth() + 3);
        if (dayOfMonth) {
          const max = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
          n.setDate(Math.min(dayOfMonth, max));
        }
      } else if (frequency === 'yearly') {
        n.setFullYear(n.getFullYear() + 1);
        if (dayOfMonth) {
          const max = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
          n.setDate(Math.min(dayOfMonth, max));
        }
      }
      return n;
    };

    // Apply day_of_month to the start candidate
    if (dayOfMonth && frequency !== 'weekly') {
      const max = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
      candidate.setDate(Math.min(dayOfMonth, max));
    }

    // Wind forward until past base
    while (candidate <= base) {
      candidate = advanceOnePeriod(candidate);
    }

    return candidate.toISOString().slice(0, 10);
  }

  function renderMemo(template, date) {
    const d = new Date(date);
    const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return template
      .replace(/\{month\}/g, monthName)
      .replace(/\{date\}/g, date);
  }

  function Recurring({ ctx }) {
    const { F, FN, fmt, entities, accounts } = ctx;
    const [templates, setTemplates] = useState(null);
    const [modal, setModal] = useState(null); // null | { mode: 'new'|'edit', tpl?: obj }
    const [toastNode, pushToast] = FN.useToast();

    const load = useCallback(() => {
      F.get('/recurring_templates?select=id,name,entity_id,from_account_id,to_account_id,amount_idr,memo_template,frequency,day_of_month,start_date,end_date,is_active,last_run_at,next_run_at&order=name')
        .then(setTemplates)
        .catch(() => { setTemplates([]); pushToast('Could not load recurring templates.', true); });
    }, [F]);

    useEffect(() => { load(); }, [load]);

    const today = new Date().toISOString().slice(0, 10);

    const toggleActive = async (tpl) => {
      try {
        await F.update('recurring_templates', 'id=eq.' + tpl.id, { is_active: !tpl.is_active });
        pushToast(tpl.name + (tpl.is_active ? ' paused.' : ' activated.'));
        load();
      } catch (e) {
        pushToast('Could not update. ' + (e && e.message ? e.message : ''), true);
      }
    };

    const del = async (tpl) => {
      if (!window.confirm('Delete "' + tpl.name + '"? This cannot be undone.')) return;
      try {
        await F.del('recurring_templates', 'id=eq.' + tpl.id);
        pushToast('Deleted ' + tpl.name + '.');
        load();
      } catch (e) {
        pushToast('Could not delete. ' + (e && e.message ? e.message : ''), true);
      }
    };

    const postNow = async (tpl) => {
      const todayStr = today;
      const memo = renderMemo(tpl.memo_template, todayStr);
      const entityId = tpl.entity_id;
      try {
        await F.rpc('post_transaction', {
          p_entity_id: entityId,
          p_date: todayStr,
          p_memo: memo,
          p_lines: [
            { account_id: tpl.to_account_id, debit: Number(tpl.amount_idr), credit: 0, line_order: 0 },
            { account_id: tpl.from_account_id, debit: 0, credit: Number(tpl.amount_idr), line_order: 1 },
          ],
          p_is_demo: false,
        });
        const nextRun = computeNextRun(tpl.start_date, tpl.frequency, tpl.day_of_month, todayStr);
        await F.update('recurring_templates', 'id=eq.' + tpl.id, {
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun,
        });
        pushToast('Posted: ' + tpl.name);
        load();
        ctx.reloadTxns();
      } catch (e) {
        pushToast('Post failed. ' + (e && e.message ? e.message : ''), true);
      }
    };

    const entityCode = (id) => {
      const e = entities.find(x => x.id === id);
      return e ? e.code : '—';
    };

    const acctName = (id) => {
      const a = accounts.find(x => x.id === id);
      return a ? a.code + ' · ' + a.name : '—';
    };

    const isDue = (tpl) => tpl.next_run_at && tpl.next_run_at <= today;

    return ce('div', null,
      ce('div', { className: 'fn-filterbar' },
        ce('div', { style: { flex: 1 } }),
        ce('button', { className: 'fn-btn', onClick: () => setModal({ mode: 'new' }) },
          FN.Icons.plus, 'New template')),
      templates === null
        ? ce(FN.Spinner, { label: 'Loading recurring templates…' })
        : templates.length === 0
          ? ce(FN.Empty, { title: 'No recurring templates', sub: 'Create a template to auto-generate repeating entries.', icon: FN.Icons.recurring })
          : ce('div', { className: 'fn-tablewrap' },
              ce('table', { className: 'fn-table' },
                ce('thead', null, ce('tr', null,
                  ce('th', null, 'Name'),
                  ce('th', null, 'Entity'),
                  ce('th', null, 'Frequency'),
                  ce('th', { className: 'r' }, 'Amount (IDR)'),
                  ce('th', null, 'Next run'),
                  ce('th', null, 'Status'),
                  ce('th', null, ''))),
                ce('tbody', null, templates.map(tpl =>
                  ce('tr', { key: tpl.id },
                    ce('td', { style: { fontWeight: 500, color: 'var(--text-primary)' } }, tpl.name),
                    ce('td', { className: 'fn-mono fn-muted', style: { fontSize: 11 } }, entityCode(tpl.entity_id)),
                    ce('td', { className: 'fn-mono fn-muted', style: { fontSize: 11 } }, tpl.frequency),
                    ce('td', { className: 'r fn-num' }, fmt.n(tpl.amount_idr)),
                    ce('td', { className: isDue(tpl) ? 'fn-warn' : 'fn-mono fn-muted', style: { fontSize: 11.5 } },
                      tpl.next_run_at ? (isDue(tpl) ? '⚑ ' + fmt.date(tpl.next_run_at) : fmt.date(tpl.next_run_at)) : '—'),
                    ce('td', null,
                      ce('span', { className: 'fn-chip ' + (tpl.is_active ? 'ok' : 'future') }, tpl.is_active ? 'active' : 'paused')),
                    ce('td', null,
                      ce('div', { style: { display: 'flex', gap: 5 } },
                        tpl.is_active
                          ? ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => postNow(tpl), title: 'Post now' }, 'Post now')
                          : null,
                        ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => setModal({ mode: 'edit', tpl }) }, 'Edit'),
                        ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => toggleActive(tpl) }, tpl.is_active ? 'Pause' : 'Resume'),
                        ce('button', { className: 'fn-btn-danger fn-btn fn-btn-sm', onClick: () => del(tpl) }, 'Delete')))))))),
      modal
        ? ce(RecurringModal, {
            ctx,
            mode: modal.mode,
            tpl: modal.tpl || null,
            onClose: () => setModal(null),
            onSaved: (msg) => { setModal(null); pushToast(msg); load(); },
          })
        : null,
      toastNode);
  }

  function RecurringModal({ ctx, mode, tpl, onClose, onSaved }) {
    const { F, FN, entities, accounts } = ctx;
    const isEdit = mode === 'edit';

    const [name, setName] = useState(tpl ? tpl.name : '');
    const [entityId, setEntityId] = useState(tpl ? tpl.entity_id : '');
    const [fromAccountId, setFromAccountId] = useState(tpl ? tpl.from_account_id : '');
    const [toAccountId, setToAccountId] = useState(tpl ? tpl.to_account_id : '');
    const [amount, setAmount] = useState(tpl ? String(tpl.amount_idr) : '');
    const [memoTemplate, setMemoTemplate] = useState(tpl ? tpl.memo_template : '');
    const [frequency, setFrequency] = useState(tpl ? tpl.frequency : 'monthly');
    const [dayOfMonth, setDayOfMonth] = useState(tpl ? String(tpl.day_of_month || '') : '');
    const [startDate, setStartDate] = useState(tpl ? tpl.start_date : new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(tpl ? (tpl.end_date || '') : '');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const entityAccts = useMemo(() =>
      accounts.filter(a => a.entity_id === entityId && !a.is_root)
        .sort((a, b) => a.code.localeCompare(b.code)),
      [accounts, entityId]);

    useEffect(() => { if (!isEdit) { setFromAccountId(''); setToAccountId(''); } }, [entityId]);

    const acctOpt = (a) => ce('option', { key: a.id, value: a.id }, a.code + ' · ' + a.name);

    const save = async () => {
      setErr('');
      const amt = parseFloat(amount);
      if (!name.trim()) return setErr('Name is required.');
      if (!entityId) return setErr('Entity is required.');
      if (!fromAccountId || !toAccountId) return setErr('Both From and To accounts are required.');
      if (fromAccountId === toAccountId) return setErr('From and To accounts must differ.');
      if (!(amt > 0)) return setErr('Amount must be greater than zero.');
      if (!memoTemplate.trim()) return setErr('Memo template is required.');
      if (!startDate) return setErr('Start date is required.');

      const dom = dayOfMonth ? parseInt(dayOfMonth, 10) : null;
      const nextRun = computeNextRun(startDate, frequency, dom, null);

      const row = {
        name: name.trim(),
        entity_id: entityId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount_idr: amt,
        memo_template: memoTemplate.trim(),
        frequency,
        day_of_month: dom,
        start_date: startDate,
        end_date: endDate || null,
        is_active: tpl ? tpl.is_active : true,
        next_run_at: nextRun,
        created_by: F.sub(),
      };

      setBusy(true);
      try {
        if (isEdit) {
          await F.update('recurring_templates', 'id=eq.' + tpl.id, row);
          onSaved('Updated ' + name.trim() + '.');
        } else {
          await F.insert('recurring_templates', row);
          onSaved('Created ' + name.trim() + '.');
        }
      } catch (e) {
        setErr('Save failed. ' + (e && e.message ? e.message : ''));
        setBusy(false);
      }
    };

    const freqs = ['weekly', 'monthly', 'quarterly', 'yearly'];

    return ce(FN.Modal, {
      title: isEdit ? 'Edit template' : 'New recurring template',
      onClose,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: save, disabled: busy }, busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create'))),
    },
      err ? ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      ce(FN.Field, { label: 'Template name' }, ce('input', { value: name, placeholder: 'e.g. Monthly rent', onChange: e => setName(e.target.value) })),
      ce('div', { style: { height: 12 } }),
      ce(FN.Field, { label: 'Entity' },
        ce('select', { value: entityId, onChange: e => setEntityId(e.target.value) },
          ce('option', { value: '' }, 'Select entity…'),
          entities.map(en => ce('option', { key: en.id, value: en.id }, en.code + ' — ' + en.name)))),
      ce('div', { style: { height: 12 } }),
      ce('div', { className: 'fn-fromto' },
        ce(FN.Field, { label: 'From account (credited)' },
          ce('select', { value: fromAccountId, onChange: e => setFromAccountId(e.target.value), disabled: !entityId },
            ce('option', { value: '' }, 'Select…'), entityAccts.map(acctOpt))),
        ce('div', { className: 'fn-fromto-arrow', style: { paddingBottom: 9 } }, FN.Icons.arrow),
        ce(FN.Field, { label: 'To account (debited)' },
          ce('select', { value: toAccountId, onChange: e => setToAccountId(e.target.value), disabled: !entityId },
            ce('option', { value: '' }, 'Select…'), entityAccts.map(acctOpt)))),
      ce('div', { style: { height: 12 } }),
      ce('div', { className: 'fn-field-row' },
        ce(FN.Field, { label: 'Amount (IDR)' },
          ce('input', { className: 'fn-num', inputMode: 'decimal', value: amount, placeholder: '0', onChange: e => setAmount(e.target.value.replace(/[^0-9.]/g, '')) })),
        ce(FN.Field, { label: 'Frequency' },
          ce('select', { value: frequency, onChange: e => setFrequency(e.target.value) },
            freqs.map(f => ce('option', { key: f, value: f }, f.charAt(0).toUpperCase() + f.slice(1))))),
        ce(FN.Field, { label: 'Day of month' },
          ce('input', { inputMode: 'numeric', value: dayOfMonth, placeholder: '1–31', onChange: e => setDayOfMonth(e.target.value.replace(/[^0-9]/g, '')) }))),
      ce('div', { style: { height: 12 } }),
      ce('div', { className: 'fn-field-row' },
        ce(FN.Field, { label: 'Start date' }, ce('input', { type: 'date', value: startDate, onChange: e => setStartDate(e.target.value) })),
        ce(FN.Field, { label: 'End date (optional)' }, ce('input', { type: 'date', value: endDate, onChange: e => setEndDate(e.target.value) }))),
      ce('div', { style: { height: 12 } }),
      ce(FN.Field, { label: 'Memo template  ({month} and {date} substituted at post time)' },
        ce('input', { value: memoTemplate, placeholder: 'e.g. Office rent {month}', onChange: e => setMemoTemplate(e.target.value) })));
  }

  /* =========================================================================
     TAGS — tag_dimensions + tag_values CRUD
     ========================================================================= */
  function Tags({ ctx }) {
    const { F, FN } = ctx;
    const [dims, setDims] = useState(null);
    const [vals, setVals] = useState({}); // dimId -> [tagValue]
    const [toastNode, pushToast] = FN.useToast();
    const [dimModal, setDimModal] = useState(null); // null | {mode, dim?}
    const [valModal, setValModal] = useState(null); // null | {mode, dimId, val?}

    const loadDims = useCallback(() => {
      F.get('/tag_dimensions?select=id,name,color&order=name')
        .then(setDims)
        .catch(() => { setDims([]); pushToast('Could not load tag dimensions.', true); });
    }, [F]);

    const loadVals = useCallback((dimId) => {
      F.get('/tag_values?select=id,dimension_id,name&dimension_id=eq.' + dimId + '&order=name')
        .then(rows => setVals(prev => Object.assign({}, prev, { [dimId]: rows })))
        .catch(() => {});
    }, [F]);

    useEffect(() => { loadDims(); }, [loadDims]);
    useEffect(() => {
      if (dims) dims.forEach(d => loadVals(d.id));
    }, [dims, loadVals]);

    const delDim = async (dim) => {
      if (!window.confirm('Delete dimension "' + dim.name + '" and all its values?')) return;
      try {
        await F.del('tag_dimensions', 'id=eq.' + dim.id);
        pushToast('Deleted ' + dim.name + '.');
        loadDims();
      } catch (e) { pushToast('Could not delete. ' + (e && e.message ? e.message : ''), true); }
    };

    const delVal = async (val, dimId) => {
      try {
        await F.del('tag_values', 'id=eq.' + val.id);
        pushToast('Deleted value.');
        loadVals(dimId);
      } catch (e) { pushToast('Could not delete. ' + (e && e.message ? e.message : ''), true); }
    };

    return ce('div', null,
      ce('div', { className: 'fn-filterbar' },
        ce('div', { style: { flex: 1 } }),
        ce('button', { className: 'fn-btn', onClick: () => setDimModal({ mode: 'new' }) },
          FN.Icons.plus, 'New dimension')),
      dims === null
        ? ce(FN.Spinner, { label: 'Loading tags…' })
        : dims.length === 0
          ? ce(FN.Empty, { title: 'No tag dimensions', sub: 'Create a dimension (e.g. Deal, Department) and then add values.', icon: FN.Icons.tag })
          : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
              dims.map(dim => {
                const dimVals = vals[dim.id] || [];
                return ce('div', { key: dim.id, className: 'fn-panel' },
                  ce('div', { className: 'fn-panel-h' },
                    ce('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
                      dim.color
                        ? ce('div', { style: { width: 12, height: 12, borderRadius: 3, background: dim.color, flexShrink: 0 } })
                        : null,
                      ce('div', { className: 'fn-panel-title' }, dim.name),
                      ce('span', { className: 'fn-muted', style: { fontSize: 11, marginLeft: 4 } }, dimVals.length + ' values')),
                    ce('div', { style: { display: 'flex', gap: 6 } },
                      ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => setValModal({ mode: 'new', dimId: dim.id }) }, '+ Value'),
                      ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => setDimModal({ mode: 'edit', dim }) }, 'Edit'),
                      ce('button', { className: 'fn-btn-danger fn-btn fn-btn-sm', onClick: () => delDim(dim) }, 'Delete'))),
                  dimVals.length === 0
                    ? ce('div', { className: 'fn-muted', style: { fontSize: 12, padding: '4px 0' } }, 'No values yet.')
                    : ce('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 } },
                        dimVals.map(v => ce('div', {
                          key: v.id,
                          style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 3, background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', fontSize: 12 },
                        },
                          ce('span', { style: { color: 'var(--text-primary)' } }, v.name),
                          ce('button', { className: 'fn-x', style: { fontSize: 13 }, onClick: () => delVal(v, dim.id), title: 'Remove' }, '×')))));
              })),
      dimModal
        ? ce(DimModal, { ctx, mode: dimModal.mode, dim: dimModal.dim || null, onClose: () => setDimModal(null), onSaved: (msg) => { setDimModal(null); pushToast(msg); loadDims(); } })
        : null,
      valModal
        ? ce(ValModal, { ctx, dimId: valModal.dimId, val: valModal.val || null, onClose: () => setValModal(null), onSaved: (msg) => { setValModal(null); pushToast(msg); loadVals(valModal.dimId); } })
        : null,
      toastNode);
  }

  function DimModal({ ctx, mode, dim, onClose, onSaved }) {
    const { F, FN } = ctx;
    const isEdit = mode === 'edit';
    const [name, setName] = useState(dim ? dim.name : '');
    const [color, setColor] = useState(dim ? (dim.color || '') : '');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const save = async () => {
      setErr('');
      if (!name.trim()) return setErr('Name is required.');
      setBusy(true);
      const row = { name: name.trim(), color: color || null };
      try {
        if (isEdit) {
          await F.update('tag_dimensions', 'id=eq.' + dim.id, row);
          onSaved('Updated dimension.');
        } else {
          await F.insert('tag_dimensions', row);
          onSaved('Created dimension ' + name.trim() + '.');
        }
      } catch (e) {
        setErr('Save failed. ' + (e && e.message ? e.message : ''));
        setBusy(false);
      }
    };

    return ce(FN.Modal, {
      title: isEdit ? 'Edit dimension' : 'New dimension', onClose,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: save, disabled: busy }, busy ? 'Saving…' : (isEdit ? 'Save' : 'Create'))),
    },
      err ? ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      ce(FN.Field, { label: 'Dimension name' }, ce('input', { value: name, placeholder: 'e.g. Deal, Department', onChange: e => setName(e.target.value) })),
      ce('div', { style: { height: 12 } }),
      ce(FN.Field, { label: 'Color (hex, e.g. #00b4ff)' }, ce('input', { value: color, placeholder: '#00b4ff', onChange: e => setColor(e.target.value) })));
  }

  function ValModal({ ctx, dimId, val, onClose, onSaved }) {
    const { F, FN } = ctx;
    const isEdit = !!val;
    const [name, setName] = useState(val ? val.name : '');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const save = async () => {
      setErr('');
      if (!name.trim()) return setErr('Name is required.');
      setBusy(true);
      try {
        if (isEdit) {
          await F.update('tag_values', 'id=eq.' + val.id, { name: name.trim() });
          onSaved('Updated value.');
        } else {
          await F.insert('tag_values', { dimension_id: dimId, name: name.trim() });
          onSaved('Added value ' + name.trim() + '.');
        }
      } catch (e) {
        setErr('Save failed. ' + (e && e.message ? e.message : ''));
        setBusy(false);
      }
    };

    return ce(FN.Modal, {
      title: isEdit ? 'Edit value' : 'New tag value', onClose,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: save, disabled: busy }, busy ? 'Saving…' : (isEdit ? 'Save' : 'Add'))),
    },
      err ? ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      ce(FN.Field, { label: 'Value name' }, ce('input', { value: name, placeholder: 'e.g. Project Alpha', onChange: e => setName(e.target.value) })));
  }

  /* =========================================================================
     PERIODS — Month-end close / reopen grid
     ========================================================================= */
  function Periods({ ctx }) {
    const { F, FN, fmt, entities, entityCode, entityId, txns } = ctx;
    const today = new Date();
    const currentYear = today.getFullYear();
    const [year, setYear] = useState(currentYear);
    const [periods, setPeriods] = useState(null);
    const [busy, setBusy] = useState('');
    const [toastNode, pushToast] = FN.useToast();

    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    const load = useCallback(() => {
      if (!entityId) return;
      F.get('/periods?entity_id=eq.' + entityId + '&year=eq.' + year + '&select=entity_id,year,month,status,closed_at,closed_by')
        .then(setPeriods)
        .catch(() => { setPeriods([]); pushToast('Could not load periods.', true); });
    }, [F, entityId, year]);

    useEffect(() => { if (entityId) load(); else setPeriods(null); }, [load, entityId]);

    if (entityCode === 'ALL') {
      return ce('div', null,
        ce('div', { className: 'fn-banner' }, 'Period close requires a single entity. Select LBC, LAM, or LHF above.'));
    }

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getStatus = (m) => {
      if (!periods) return null;
      const p = periods.find(x => x.month === m);
      if (p) return p.status;
      const d = new Date(year, m - 1, 1);
      if (d > today) return 'future';
      return 'open';
    };

    const txnCount = (m) => {
      return txns.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === m;
      }).length;
    };

    const closePeriod = async (m) => {
      const key = year + '-' + m;
      setBusy(key);
      try {
        await F.upsert('periods', {
          entity_id: entityId,
          year,
          month: m,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: F.sub(),
        }, 'entity_id,year,month');
        pushToast('Period ' + MONTHS[m - 1] + ' ' + year + ' closed.');
        load();
      } catch (e) {
        pushToast('Could not close period. ' + (e && e.message ? e.message : ''), true);
      } finally { setBusy(''); }
    };

    const reopenPeriod = async (m) => {
      const key = year + '-' + m;
      setBusy(key);
      try {
        await F.upsert('periods', {
          entity_id: entityId,
          year,
          month: m,
          status: 'open',
          closed_at: null,
          closed_by: null,
        }, 'entity_id,year,month');
        pushToast('Period ' + MONTHS[m - 1] + ' ' + year + ' reopened.');
        load();
      } catch (e) {
        pushToast('Could not reopen period. ' + (e && e.message ? e.message : ''), true);
      } finally { setBusy(''); }
    };

    const statusChip = (s) => {
      if (s === 'closed') return ce('span', { className: 'fn-chip ok' }, 'Closed');
      if (s === 'open') return ce('span', { className: 'fn-chip open' }, 'Open');
      if (s === 'future') return ce('span', { className: 'fn-chip future' }, 'Future');
      return null;
    };

    return ce('div', null,
      ce('div', { className: 'fn-filterbar', style: { marginBottom: 16 } },
        ce('div', { className: 'fn-seg' },
          years.map(y => ce('button', { key: y, className: y === year ? 'on' : '', onClick: () => setYear(y) }, y))),
        ce('div', { style: { flex: 1 } })),
      periods === null && entityId
        ? ce(FN.Spinner, { label: 'Loading periods…' })
        : ce('div', { className: 'fn-tablewrap' },
            ce('table', { className: 'fn-table' },
              ce('thead', null, ce('tr', null,
                ce('th', null, 'Month'),
                ce('th', null, 'Status'),
                ce('th', { className: 'r' }, 'Entries'),
                ce('th', null, ''))),
              ce('tbody', null, MONTHS.map((mName, i) => {
                const m = i + 1;
                const status = getStatus(m);
                const cnt = txnCount(m);
                const key = year + '-' + m;
                const isBusy = busy === key;
                const isFuture = status === 'future';
                return ce('tr', { key: m },
                  ce('td', { style: { fontWeight: 500, color: 'var(--text-primary)' } }, mName + ' ' + year),
                  ce('td', null, statusChip(status)),
                  ce('td', { className: 'r fn-num fn-muted', style: { fontSize: 12 } }, cnt > 0 ? cnt : '—'),
                  ce('td', null,
                    isFuture ? null
                    : status === 'open'
                      ? ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => closePeriod(m), disabled: isBusy }, isBusy ? '…' : 'Close')
                      : ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', onClick: () => reopenPeriod(m), disabled: isBusy }, isBusy ? '…' : 'Reopen')));
              })))),
      toastNode);
  }

  /* =========================================================================
     AUDIT — transaction_history paginated log
     ========================================================================= */
  function Audit({ ctx }) {
    const { F, FN, fmt } = ctx;
    const [rows, setRows] = useState(null);
    const [page, setPage] = useState(0);
    const [filterAction, setFilterAction] = useState('');
    const [toastNode, pushToast] = FN.useToast();
    const PER = 100;

    const load = useCallback(() => {
      let q = '/transaction_history?select=id,txn_id,edited_at,edited_by,action,before_json,after_json,transactions(ref,entity_id)&order=edited_at.desc';
      if (filterAction) q += '&action=eq.' + filterAction;
      q += '&limit=' + PER + '&offset=' + (page * PER);
      F.get(q)
        .then(setRows)
        .catch(() => { setRows([]); pushToast('Could not load audit log.', true); });
    }, [F, page, filterAction]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(0); }, [filterAction]);

    const actionChip = (action) => {
      const cls = action === 'insert' ? 'ok' : action === 'delete' ? 'bad' : action === 'restore' ? 'open' : 'info';
      return ce('span', { className: 'fn-chip ' + cls }, action);
    };

    const txnRef = (row) => {
      const t = row.transactions;
      if (t) return ce('span', { className: 'fn-ref' }, t.ref);
      // Fallback: try to read ref from before/after json
      const j = row.after_json || row.before_json;
      if (j && j.ref) return ce('span', { className: 'fn-ref' }, j.ref);
      return ce('span', { className: 'fn-muted' }, row.txn_id ? row.txn_id.slice(0, 8) + '…' : '—');
    };

    const summary = (row) => {
      const j = row.after_json || row.before_json;
      if (!j) return '—';
      const parts = [];
      if (j.date) parts.push(fmt.date(j.date));
      if (j.memo) parts.push(j.memo);
      return parts.join(' · ') || '—';
    };

    const actions = ['', 'insert', 'update', 'delete', 'restore'];

    return ce('div', null,
      ce('div', { className: 'fn-filterbar' },
        ce(FN.Field, { label: 'Action filter' },
          ce('select', { className: 'fn-select', value: filterAction, onChange: e => setFilterAction(e.target.value) },
            actions.map(a => ce('option', { key: a, value: a }, a === '' ? 'All actions' : a.charAt(0).toUpperCase() + a.slice(1))))),
        ce('div', { style: { flex: 1 } })),
      rows === null
        ? ce(FN.Spinner, { label: 'Loading audit log…' })
        : rows.length === 0
          ? ce(FN.Empty, { title: 'No audit records', sub: 'Audit entries appear here as transactions are posted or modified.', icon: FN.Icons.audit })
          : ce('div', null,
              ce('div', { className: 'fn-tablewrap' },
                ce('table', { className: 'fn-table' },
                  ce('thead', null, ce('tr', null,
                    ce('th', null, 'When'),
                    ce('th', null, 'Action'),
                    ce('th', null, 'Transaction'),
                    ce('th', null, 'Summary'))),
                  ce('tbody', null, rows.map(row =>
                    ce('tr', { key: row.id },
                      ce('td', { className: 'fn-mono fn-muted', style: { fontSize: 11, width: 140 } }, fmt.dateTime(row.edited_at)),
                      ce('td', null, actionChip(row.action)),
                      ce('td', null, txnRef(row)),
                      ce('td', { className: 'fn-muted', style: { fontSize: 12 } }, summary(row))))))),
              ce('div', { className: 'fn-pager' },
                ce('span', null, 'Page ' + (page + 1) + (rows.length === PER ? ' (showing ' + PER + ')' : ' (' + rows.length + ' records)')),
                ce('div', { className: 'fn-pager-btns' },
                  ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', disabled: page === 0, onClick: () => setPage(p => p - 1) }, 'Prev'),
                  ce('button', { className: 'fn-btn-ghost fn-btn fn-btn-sm', disabled: rows.length < PER, onClick: () => setPage(p => p + 1) }, 'Next')))),
      toastNode);
  }

  /* =========================================================================
     SETTINGS — read-only entity list + current user
     ========================================================================= */
  function Settings({ ctx }) {
    const { F, FN, entities } = ctx;
    const user = F.user();

    const entityTypeLabel = {
      asset: 'Asset',
      liability: 'Liability',
      equity: 'Equity',
      income: 'Income',
      expense: 'Expense',
    };

    return ce('div', { style: { maxWidth: 640 } },
      ce('div', { className: 'fn-panel', style: { marginBottom: 14 } },
        ce('div', { className: 'fn-panel-h' },
          ce('div', { className: 'fn-panel-title' }, 'Entities')),
        ce('div', { className: 'fn-tablewrap' },
          ce('table', { className: 'fn-table' },
            ce('thead', null, ce('tr', null,
              ce('th', null, 'Code'),
              ce('th', null, 'Name'),
              ce('th', null, 'ID'))),
            ce('tbody', null, entities.map(e =>
              ce('tr', { key: e.id },
                ce('td', null, ce('span', { className: 'fn-code' }, e.code)),
                ce('td', null, e.name),
                ce('td', { className: 'fn-mono fn-muted', style: { fontSize: 10 } }, e.id)))))),
        ce('div', { className: 'fn-kpi-sub', style: { marginTop: 10 } }, 'Account and entity creation is an admin task performed via the Supabase dashboard or migration scripts.')),
      ce('div', { className: 'fn-panel' },
        ce('div', { className: 'fn-panel-h' },
          ce('div', { className: 'fn-panel-title' }, 'Current session')),
        user
          ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              ce('div', { style: { display: 'flex', gap: 20, flexWrap: 'wrap' } },
                ce('div', null,
                  ce('div', { className: 'fn-panel-tag', style: { marginBottom: 4 } }, 'User ID'),
                  ce('div', { className: 'fn-mono', style: { fontSize: 12 } }, user.id || '—')),
                ce('div', null,
                  ce('div', { className: 'fn-panel-tag', style: { marginBottom: 4 } }, 'Email'),
                  ce('div', { style: { fontSize: 13 } }, user.email || '—')),
                ce('div', null,
                  ce('div', { className: 'fn-panel-tag', style: { marginBottom: 4 } }, 'Role'),
                  ce('div', null,
                    ce('span', { className: 'fn-chip ok' }, (user.user_metadata && user.user_metadata.role) || (user.app_metadata && user.app_metadata.user_role) || 'authenticated')))),
              ce('div', { className: 'fn-kpi-sub' }, 'CFO user provisioning is an admin task. Contact the system administrator to update roles.'))
          : ce('div', { className: 'fn-muted', style: { fontSize: 12 } }, 'No active session.')));
  }

  /* =========================================================================
     Export
     ========================================================================= */
  window.FN_Ops = { Transfers, Recurring, Tags, Periods, Audit, Settings };
})();
