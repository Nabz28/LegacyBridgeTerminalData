/* =========================================================================
   FINANCE (T10) — performance fees module.
   Exposes window.FN_Fees = { PerfFees }.

   Bridges The Book (asset_mgmt / window.AM) → LBC's finance ledger:
   LBC earns 25% of realized P&L on AUM (both funds), accrued as a
   receivable with a high-water mark in USD so FX swings don't move the mark.
   ========================================================================= */
(function () {
  const { useState, useEffect, useCallback } = React;
  const ce = React.createElement;

  /* -----------------------------------------------------------------------
     ConfirmModal — small confirm dialog before posting the accrual journal.
     ----------------------------------------------------------------------- */
  function ConfirmModal({ fund, data, onConfirm, onCancel, busy }) {
    const FN = window.FN;
    const fmt = window.FINANCE.fmt;
    return ce(FN.Modal, {
      title: 'Confirm: Recognize accrual', onClose: onCancel,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onCancel, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: onConfirm, disabled: busy },
          busy ? 'Posting…' : 'Recognize')),
    },
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        ce('div', { className: 'fn-banner' },
          'This will post a journal entry (DR Receivable / CR Income) and advance the high-water mark for ', ce('strong', null, fund.label), '. The same gains will not be charged again.'),
        ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          ce('div', { className: 'fn-kpi' },
            ce('div', { className: 'fn-kpi-lbl' }, 'Fund'),
            ce('div', { className: 'fn-kpi-val', style: { fontSize: 14, marginTop: 4 } }, fund.label)),
          ce('div', { className: 'fn-kpi' },
            ce('div', { className: 'fn-kpi-lbl' }, 'Basis above HWM (USD)'),
            ce('div', { className: 'fn-kpi-val fn-num', style: { fontSize: 14, marginTop: 4 } }, '$ ' + fmt.n(fund.baseUsd))),
          ce('div', { className: 'fn-kpi' },
            ce('div', { className: 'fn-kpi-lbl' }, 'Fee rate'),
            ce('div', { className: 'fn-kpi-val', style: { fontSize: 14, marginTop: 4 } }, '25%')),
          ce('div', { className: 'fn-kpi' },
            ce('div', { className: 'fn-kpi-lbl' }, 'Fee to accrue (IDR)'),
            ce('div', { className: 'fn-kpi-val fn-num', style: { fontSize: 14, marginTop: 4, color: 'var(--fn-strong)' } },
              fmt.money(Math.round(fund.accruedFeeIdr)))))));
  }

  /* -----------------------------------------------------------------------
     TransferModal — record cash actually received from a fund.
     DR Cash(1100) / CR Receivable(1600).
     ----------------------------------------------------------------------- */
  function TransferModal({ ctx, accCash, accReceivable, lbcId, onClose, onPosted }) {
    const FN = window.FN;
    const F = window.FINANCE;
    const fmt = F.fmt;
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const post = async () => {
      setErr('');
      const amt = Math.round(parseFloat(amount) || 0);
      if (!(amt > 0)) return setErr('Amount must be greater than zero.');
      if (!accCash) return setErr('Cash account (1100) not found for LBC.');
      if (!accReceivable) return setErr('Receivable account (1600) not found for LBC.');
      setBusy(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const memo = 'Performance fee received' + (note.trim() ? ' — ' + note.trim() : '');
        await F.rpc('post_transaction', {
          p_entity_id: lbcId,
          p_date: today,
          p_memo: memo,
          p_lines: [
            { account_id: accCash, debit: amt, credit: 0, line_order: 0 },
            { account_id: accReceivable, debit: 0, credit: amt, line_order: 1 },
          ],
          p_is_demo: false,
        });
        onPosted();
      } catch (e) {
        setErr('Could not post. ' + (e && e.message ? e.message : 'Check fields and try again.'));
        setBusy(false);
      }
    };

    return ce(FN.Modal, {
      title: 'Record cash received from fund', onClose,
      footer: ce(React.Fragment, null,
        ce('button', { className: 'fn-btn-ghost fn-btn', onClick: onClose, disabled: busy }, 'Cancel'),
        ce('button', { className: 'fn-btn', onClick: post, disabled: busy },
          busy ? 'Posting…' : 'Record transfer')),
    },
      err ? ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } }, err) : null,
      ce('div', { className: 'fn-banner', style: { marginBottom: 12 } },
        'Posts DR Cash (1100) / CR Performance Fee Receivable (1600). Use this when the fund has physically transferred cash to LBC.'),
      ce(FN.Field, { label: 'Amount received (IDR)' },
        ce('input', {
          className: 'fn-num',
          inputMode: 'decimal',
          value: amount,
          placeholder: '0',
          autoFocus: true,
          onChange: e => setAmount(e.target.value.replace(/[^0-9.]/g, '')),
        })),
      ce('div', { style: { height: 12 } }),
      ce(FN.Field, { label: 'Note (optional)' },
        ce('input', {
          value: note,
          placeholder: 'e.g. LAM Q1 2026 payment',
          onChange: e => setNote(e.target.value),
        })));
  }

  /* -----------------------------------------------------------------------
     PerfFees — main component.
     ----------------------------------------------------------------------- */
  function PerfFees({ ctx }) {
    const F = window.FINANCE;
    const FN = window.FN;
    const fmt = F.fmt;

    /* ---- resolve LBC entity + key account IDs -------------------------- */
    const lbc = ctx.entities.find(e => e.code === 'LBC');
    const lbcId = lbc ? lbc.id : null;

    const acc = useCallback((code) => {
      if (!lbcId) return undefined;
      const found = ctx.accounts.find(a => a.entity_id === lbcId && a.code === code);
      return found ? found.id : undefined;
    }, [lbcId, ctx.accounts]);

    const accReceivable = acc('1600'); // Performance Fee Receivable (asset)
    const accIncome     = acc('4500'); // Performance Fee Income
    const accCash       = acc('1100'); // Cash & Equivalents

    /* ---- state --------------------------------------------------------- */
    const [data, setData]         = useState(null);   // FINANCE.perfFee.compute() result
    const [recogs, setRecogs]     = useState(null);   // recognitions history rows
    const [receivable, setRec]    = useState(0);      // net 1600 outstanding
    const [loading, setLoading]   = useState(true);
    const [confirmFund, setConfirmFund] = useState(null); // fund to confirm recognition
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [toastNode, pushToast]  = FN.useToast();

    /* ---- data loader --------------------------------------------------- */
    const load = useCallback(async () => {
      setLoading(true);
      try {
        /* 1. perfFee compute (reads window.AM) */
        const computed = await F.perfFee.compute();
        setData(computed);

        /* 2. recognitions history */
        const recogsData = await F.get(
          '/performance_fee_recognitions?select=*&order=recognized_at.desc&limit=50'
        ).catch(() => []);
        setRecogs(recogsData || []);

        /* 3. receivable outstanding = net (debit - credit) on account 1600 for LBC */
        if (lbcId && accReceivable) {
          const txnRows = await F.get(
            '/transactions?select=journal_lines(account_id,debit_idr,credit_idr)' +
            '&entity_id=eq.' + lbcId +
            '&deleted_at=is.null&limit=20000'
          ).catch(() => []);
          let net = 0;
          (txnRows || []).forEach(t => {
            (t.journal_lines || []).forEach(l => {
              if (l.account_id === accReceivable) {
                net += (Number(l.debit_idr) || 0) - (Number(l.credit_idr) || 0);
              }
            });
          });
          setRec(net);
        } else {
          setRec(0);
        }
      } catch (e) {
        pushToast('Load error: ' + (e && e.message ? e.message : 'unknown'), true);
      } finally {
        setLoading(false);
      }
    }, [F, lbcId, accReceivable]);

    useEffect(() => { load(); }, [load]);

    /* ---- recognize action (per fund) ----------------------------------- */
    const doRecognize = async (fund) => {
      if (!lbcId) { pushToast('LBC entity not found.', true); return; }
      if (!accReceivable || !accIncome) { pushToast('Accounts 1600 or 4500 not found for LBC.', true); return; }
      setConfirmBusy(true);
      try {
        const lines = [
          { account_id: accReceivable, debit: Math.round(fund.accruedFeeIdr), credit: 0, line_order: 0 },
          { account_id: accIncome, debit: 0, credit: Math.round(fund.accruedFeeIdr), line_order: 1 },
        ];
        const res = await F.rpc('post_transaction', {
          p_entity_id: lbcId,
          p_date: new Date().toISOString().slice(0, 10),
          p_memo: 'Performance fee accrual — ' + fund.label + ' — 25% of realized P&L above high-water mark',
          p_lines: lines,
          p_is_demo: false,
        });
        const txnId = Array.isArray(res) && res[0] ? res[0].txn_id : null;
        await F.insert('performance_fee_recognitions', {
          fund_key:        fund.key,
          fund_name:       fund.label,
          entity_id:       lbcId,
          cum_realized_usd: fund.cumRealizedUsd,
          prior_hwm_usd:   fund.hwmUsd,
          basis_usd:       fund.baseUsd,
          fee_rate:        data.rate,
          fx_usd_idr:      data.usdidr,
          fee_amount_idr:  Math.round(fund.accruedFeeIdr),
          txn_id:          txnId,
        });
        pushToast('Recognized ' + fund.label + ' — HWM advanced.');
        setConfirmFund(null);
        load();
      } catch (e) {
        pushToast('Could not recognize. ' + (e && e.message ? e.message : ''), true);
      } finally {
        setConfirmBusy(false);
      }
    };

    /* ---- helpers ------------------------------------------------------- */
    const recognisedTotal = (recogs || []).reduce((s, r) => s + (Number(r.fee_amount_idr) || 0), 0);

    /* ---- render -------------------------------------------------------- */
    if (!lbc) {
      return ce('div', { className: 'fn-banner', style: { background: 'var(--neg-bg)', borderColor: 'var(--neg-border)', color: 'var(--neg)' } },
        'LBC entity not found in this Finance database. Performance fees cannot be computed.');
    }

    if (loading) return ce(FN.Spinner, { label: 'Computing performance fees…' });

    /* window.AM not loaded */
    if (data && !data.ok) {
      return ce('div', { style: { maxWidth: 640 } },
        ce('div', { className: 'fn-banner' },
          ce('strong', null, 'The Book (asset_mgmt terminal) is not loaded. '),
          'Open The Book terminal first so the performance fee engine can read realized P&L. Reason: ', data.reason),
        toastNode);
    }

    /* usdidr null warning */
    const fxWarning = data && data.usdidr == null
      ? ce('div', { className: 'fn-banner', style: { marginBottom: 14 } },
          ce('strong', null, 'No USD/IDR rate found. '),
          'Add a USD→IDR row in asset_mgmt.fx_rates to enable IDR amounts. Accrued fee amounts below are unavailable.')
      : null;

    /* KPI cards */
    const kpi = (lbl, val, sub, accentVal) => ce('div', { className: 'fn-kpi' },
      ce('div', { className: 'fn-kpi-lbl' }, lbl),
      ce('div', {
        className: 'fn-kpi-val fn-num',
        style: { marginTop: 4, fontSize: 17, color: accentVal ? 'var(--fn-strong)' : undefined },
      }, val),
      sub ? ce('div', { className: 'fn-kpi-sub', style: { marginTop: 3 } }, sub) : null);

    const totalAccrued  = data && data.totalAccruedIdr != null ? data.totalAccruedIdr : null;
    const usdidrStr     = data && data.usdidr != null ? fmt.n(data.usdidr) : '—';

    const kpis = ce('div', { className: 'fn-grid fn-grid-4', style: { marginBottom: 16 } },
      kpi('Total accrued fee', totalAccrued != null ? fmt.money(totalAccrued) : '—', 'Unrecognised, live', totalAccrued != null && totalAccrued > 0),
      kpi('Receivable outstanding', fmt.money(receivable), 'Recognised, not yet collected'),
      kpi('Recognised to date', fmt.money(recognisedTotal), 'All time posted accruals'),
      kpi('USD / IDR rate used', usdidrStr, 'From asset_mgmt.fx_rates'));

    /* per-fund table */
    const funds = data && data.funds ? data.funds : [];
    const fundTable = ce('div', { className: 'fn-panel', style: { marginBottom: 16 } },
      ce('div', { className: 'fn-panel-h' },
        ce('div', { className: 'fn-panel-title' }, 'Performance fee — by fund'),
        ce('div', { className: 'fn-panel-tag' }, '25% of realized P&L above high-water mark')),
      funds.length === 0
        ? ce(FN.Empty, {
            title: 'No funds found',
            sub: 'Open The Book to load window.AM.FUNDS.',
            icon: FN.Icons.coin,
          })
        : ce('div', { className: 'fn-tablewrap' },
            ce('table', { className: 'fn-table' },
              ce('thead', null, ce('tr', null,
                ce('th', null, 'Fund'),
                ce('th', { className: 'r' }, 'Trades'),
                ce('th', { className: 'r' }, 'Cum. realized (USD)'),
                ce('th', { className: 'r' }, 'High-water mark (USD)'),
                ce('th', { className: 'r' }, 'Basis above HWM (USD)'),
                ce('th', { className: 'r' }, 'Accrued fee (IDR @ 25%)'),
                ce('th', null, ''))),
              ce('tbody', null, funds.map(fund => {
                const canRecognize = fund.accruedFeeIdr != null && fund.accruedFeeIdr > 0.50;
                return ce('tr', { key: fund.key },
                  ce('td', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, fund.label),
                  ce('td', { className: 'r fn-num fn-muted' }, fmt.n(fund.trades)),
                  ce('td', { className: 'r fn-num' }, fund.cumRealizedUsd != null ? '$ ' + fmt.n(fund.cumRealizedUsd) : '—'),
                  ce('td', { className: 'r fn-num fn-muted' }, fund.hwmUsd != null ? '$ ' + fmt.n(fund.hwmUsd) : '$ 0'),
                  ce('td', { className: 'r fn-num ' + (fund.baseUsd > 0 ? 'fn-pos' : 'fn-muted') },
                    fund.baseUsd != null ? '$ ' + fmt.n(fund.baseUsd) : '—'),
                  ce('td', { className: 'r fn-num', style: { color: canRecognize ? 'var(--fn-strong)' : undefined } },
                    fund.accruedFeeIdr != null ? fmt.money(Math.round(fund.accruedFeeIdr)) : '—'),
                  ce('td', null,
                    canRecognize
                      ? ce('button', {
                          className: 'fn-btn fn-btn-sm',
                          style: { fontSize: 11, padding: '4px 10px' },
                          onClick: () => setConfirmFund(fund),
                        }, 'Recognize')
                      : ce('span', { className: 'fn-chip fn-muted', style: { fontSize: 10 } }, 'no accrual')));
              })))));

    /* recognitions history table */
    const histTable = recogs && recogs.length > 0
      ? ce('div', { className: 'fn-panel', style: { marginBottom: 16 } },
          ce('div', { className: 'fn-panel-h' },
            ce('div', { className: 'fn-panel-title' }, 'Recognition history'),
            ce('div', { className: 'fn-panel-tag' }, recogs.length + ' records')),
          ce('div', { className: 'fn-tablewrap' },
            ce('table', { className: 'fn-table' },
              ce('thead', null, ce('tr', null,
                ce('th', null, 'When'),
                ce('th', null, 'Fund'),
                ce('th', { className: 'r' }, 'Basis (USD)'),
                ce('th', { className: 'r' }, 'Fee (IDR)'),
                ce('th', { className: 'r' }, 'Rate'))),
              ce('tbody', null, recogs.map((r, i) =>
                ce('tr', { key: r.id || i },
                  ce('td', { className: 'fn-mono fn-muted', style: { fontSize: 11, width: 140 } },
                    fmt.date(r.recognized_at || r.created_at)),
                  ce('td', { style: { fontWeight: 500 } }, r.fund_name || r.fund_key || '—'),
                  ce('td', { className: 'r fn-num fn-muted' },
                    r.basis_usd != null ? '$ ' + fmt.n(r.basis_usd) : '—'),
                  ce('td', { className: 'r fn-num', style: { color: 'var(--fn-strong)' } },
                    r.fee_amount_idr != null ? fmt.money(r.fee_amount_idr) : '—'),
                  ce('td', { className: 'r fn-mono fn-muted', style: { fontSize: 11 } },
                    r.fee_rate != null ? (r.fee_rate * 100).toFixed(0) + '%' : '—')))))))
      : ce('div', { className: 'fn-panel', style: { marginBottom: 16 } },
          ce('div', { className: 'fn-panel-h' },
            ce('div', { className: 'fn-panel-title' }, 'Recognition history')),
          ce(FN.Empty, {
            title: 'No recognitions yet',
            sub: 'Fees will appear here once the first accrual is recognized.',
          }));

    /* explanatory note */
    const note = ce('div', { className: 'fn-kpi-sub', style: { marginTop: 0, marginBottom: 16, lineHeight: 1.55, maxWidth: 760 } },
      'LBC accrues 25% of realized P&L on both funds above each fund\'s high-water mark. Realized P&L is read live from The Book; amounts convert USD→IDR at the latest fx rate. ',
      ce('strong', null, 'Accrued'), ' = not yet booked;  ',
      ce('strong', null, 'Recognize'), ' posts the receivable;  ',
      ce('strong', null, 'Record transfer'), ' clears it when the fund pays.');

    /* header actions bar */
    const actions = ce('div', { className: 'fn-filterbar', style: { marginBottom: 16 } },
      ce('div', { style: { flex: 1 } }),
      ce('button', {
        className: 'fn-btn-ghost fn-btn',
        style: { marginRight: 8 },
        onClick: load,
      }, FN.Icons.arrow, ' Refresh'),
      ce('button', {
        className: 'fn-btn',
        onClick: () => setShowTransfer(true),
      }, FN.Icons.transfer, ' Record transfer'));

    return ce('div', null,
      actions,
      fxWarning,
      note,
      kpis,
      fundTable,
      histTable,

      /* confirm recognition modal */
      confirmFund
        ? ce(ConfirmModal, {
            fund: confirmFund,
            data,
            onConfirm: () => doRecognize(confirmFund),
            onCancel: () => { if (!confirmBusy) setConfirmFund(null); },
            busy: confirmBusy,
          })
        : null,

      /* record transfer modal */
      showTransfer
        ? ce(TransferModal, {
            ctx,
            accCash,
            accReceivable,
            lbcId,
            onClose: () => setShowTransfer(false),
            onPosted: () => {
              setShowTransfer(false);
              pushToast('Transfer recorded — receivable updated.');
              load();
              if (ctx.reloadTxns) ctx.reloadTxns();
            },
          })
        : null,

      toastNode);
  }

  window.FN_Fees = { PerfFees };
})();
