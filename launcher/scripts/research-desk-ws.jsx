// ================================================================
// RESEARCH DESK terminal (window.ResearchDeskTerminal) — T12.
//
// The UI for LBC's autonomous research system. Replaces the old
// Monitor (T12) + Research (T13) pair. Six surfaces + chat:
//   Dials   — 23 desk dials grouped Cyclical / Secular / Country
//   Desk    — drill-in: dial, drivers (charted), history, signals, theses
//   Signals — firm-wide feed with audit scores + the graveyard
//   Briefs  — morning/weekly/monthly/flash archive (monospace)
//   Book    — open theses + pending idea tickets
//   Ops     — pipeline freshness, the honesty page
//   Chat    — the research agent (POST /api/research-agent)
//
// selfNav (owns its rail). Deep links:
//   #research-desk[/dials|signals|briefs|book|ops|chat]
//   #research-desk/desk/<deskId>
// Reads via window.RD (research-desk-data.jsx); building blocks in
// window.RD_VIEWS (research-desk-views.jsx).
// ================================================================
(function () {
  'use strict';

  const RD = () => window.RD;
  const RV = () => window.RD_VIEWS;

  const PAGES = ['dials', 'signals', 'briefs', 'book', 'ops', 'chat'];

  // ---- hash routing --------------------------------------------------------
  const parseHash = () => {
    const h = window.location.hash || '';
    if (!h.startsWith('#research-desk')) return null;
    const parts = h.slice(1).split('/');
    if (parts[1] === 'desk' && parts[2]) return { page: 'desk', deskId: decodeURIComponent(parts[2]) };
    if (PAGES.includes(parts[1])) return { page: parts[1] };
    return { page: 'dials' };
  };
  const writeHash = (view) => {
    const h = view.page === 'desk'
      ? '#research-desk/desk/' + encodeURIComponent(view.deskId)
      : (view.page === 'dials' ? '#research-desk' : '#research-desk/' + view.page);
    if (window.location.hash !== h) { try { window.location.hash = h; } catch {} }
  };

  // ---- shared hook: signals + their audit scores ---------------------------
  const useSignalsWithScores = (opts, deps) => {
    const q = RD().useFetch(() => RD().fetchSignals(opts), deps);
    const [scores, setScores] = React.useState({});
    React.useEffect(() => {
      if (!q.data || !q.data.length) { setScores({}); return; }
      let alive = true;
      RD().fetchSignalScores(q.data.map((s) => s.id)).then(
        (m) => { if (alive) setScores(m || {}); }, () => {});
      return () => { alive = false; };
    }, [q.data]);
    return { ...q, scores };
  };

  // ==========================================================================
  // DIALS — the landing board
  // ==========================================================================
  const DialCard = ({ desk, dial, onOpen }) => {
    const { StanceChip, ConvictionDots, ScoreBar, RegimeTag } = RV();
    const fmt = RD().fmt;
    const disagree = dial && dial.machine_stance && dial.stance && dial.machine_stance !== dial.stance;
    return (
      <div className={'rd-card' + (dial ? '' : ' unset')} role="button" tabIndex={0}
           onClick={() => onOpen(desk.id)}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(desk.id); } }}>
        <div className="rd-card-top">
          <span className="name">{desk.name}</span>
          {desk.benchmark && <span className="bench">{desk.benchmark}</span>}
        </div>
        {dial ? (
          <React.Fragment>
            <div className="rd-card-dial">
              <StanceChip stance={dial.stance} />
              <ConvictionDots n={dial.conviction} />
              <ScoreBar score={dial.machine_score} w={78} />
              <RegimeTag regime={dial.regime} />
            </div>
            {disagree && (
              <div className="rd-card-disagree" title={'house ' + dial.stance + ' vs machine ' + dial.machine_stance}>
                ⚠ machine says <b>{dial.machine_stance}</b>
              </div>
            )}
            {dial.what_changed && <div className="rd-card-what">{dial.what_changed}</div>}
            <div className="rd-card-foot">
              <span className="src">{dial.stance_source || ''}</span>
              <span className="age">{fmt.ago(dial.updated_at || dial.asof)}</span>
            </div>
          </React.Fragment>
        ) : (
          <div className="rd-card-nodial">no dial yet — first nightly run fills this in</div>
        )}
      </div>
    );
  };

  const DialsPage = ({ desks, dials, err, loading, onOpenDesk, onRetry }) => {
    const { Empty, ErrNote, Loading, StanceChip } = RV();
    if (err) return <div className="rd-page"><ErrNote err={err} onRetry={onRetry} /></div>;
    if (loading) return <div className="rd-page"><Loading /></div>;
    if (!desks || !desks.length) return <div className="rd-page"><Empty note="No desks configured" /></div>;
    const tally = { OW: 0, N: 0, UW: 0, unset: 0 };
    desks.forEach((d) => { const s = dials && dials[d.id]; if (s && s.stance) tally[s.stance] = (tally[s.stance] || 0) + 1; else tally.unset++; });
    return (
      <div className="rd-page">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">LBC autonomous research · dial board</div>
            <h1>Research Desk</h1>
          </div>
          <div className="rd-tally">
            {['OW', 'N', 'UW'].map((s) => (
              <span key={s} className="i"><StanceChip stance={s} small /><b>{tally[s] || 0}</b></span>
            ))}
            {tally.unset ? <span className="i"><span className="rd-dim">no dial</span><b>{tally.unset}</b></span> : null}
          </div>
        </div>
        {RD().BASKETS.map((b) => {
          const list = desks.filter((d) => d.basket === b.id);
          if (!list.length) return null;
          return (
            <React.Fragment key={b.id}>
              <div className="rd-sec">{b.label}<span className="n">{list.length}</span></div>
              <div className="rd-grid">
                {list.map((d) => <DialCard key={d.id} desk={d} dial={dials && dials[d.id]} onOpen={onOpenDesk} />)}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ==========================================================================
  // DESK DETAIL
  // ==========================================================================
  const DriverRow = ({ drv }) => {
    const { DirArrow, LineChart, Loading } = RV();
    const fmt = RD().fmt;
    const [open, setOpen] = React.useState(false);
    const obs = RD().useFetch(
      () => open && drv.series_key ? RD().fetchObservations(drv.series_key, 500) : Promise.resolve(null),
      [open, drv.series_key]);
    return (
      <React.Fragment>
        <tr className={'rd-drv' + (open ? ' open' : '')} onClick={() => setOpen(!open)}>
          <td className="lbl"><span className="tw">{open ? '▾' : '▸'}</span>{drv.label || drv.series_key}</td>
          <td className="num">{fmt.num(drv.value, Math.abs(drv.value || 0) >= 100 ? 0 : 2)}</td>
          <td className={'num ' + (drv.z > 1 ? 'pos' : drv.z < -1 ? 'neg' : '')}>{fmt.signed(drv.z, 2)}</td>
          <td className="num">{fmt.pctile(drv.pctile)}</td>
          <td className="ctr"><DirArrow direction={drv.direction} /></td>
          <td className={'num ' + (drv.contrib > 0 ? 'pos' : drv.contrib < 0 ? 'neg' : '')}>{fmt.signed(drv.contrib, 2)}</td>
        </tr>
        {open && (
          <tr className="rd-drv-chart">
            <td colSpan={6}>
              {obs.loading ? <Loading label={'loading ' + (drv.series_key || '') + '…'} />
                : obs.err ? <div className="rd-chart-none">could not load series: {obs.err}</div>
                : <LineChart series={[{ label: drv.label || drv.series_key, points: (obs.data || []).map((o) => [o.date, o.value]) }]}
                             h={130} title={drv.series_key} />}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const BenchChart = ({ ticker }) => {
    const { LineChart } = RV();
    const q = RD().useFetch(() => RD().fetchPrices(ticker, 260), [ticker]);
    if (q.loading || q.err || !q.data || !q.data.length) return null;
    return <LineChart series={[{ label: ticker, points: q.data.map((p) => [p.date, p.close]) }]}
                      h={120} title={'benchmark · ' + ticker + ' · 12m'} />;
  };

  const ThesisCard = ({ th, deskName }) => {
    const { StatusChip } = RV();
    const fmt = RD().fmt;
    const st = RD().thesisStatus(th.status);
    const health = th.health;
    const healthItems = !health ? []
      : Array.isArray(health) ? health.map((h, i) => ({ k: h.check || h.name || ('#' + i), v: h.verdict != null ? h.verdict : h.value }))
      : Object.entries(health).map(([k, v]) => ({ k, v }));
    const vcls = (v) => {
      const s = String(v).toLowerCase();
      if (v === true || ['ok', 'intact', 'pass', 'true', 'healthy', 'yes'].includes(s)) return 'pos';
      if (v === false || ['fail', 'broken', 'dead', 'false', 'breach', 'no'].includes(s)) return 'neg';
      if (['wounded', 'warn', 'watch', 'at_risk'].includes(s)) return 'amber';
      return 'gray';
    };
    return (
      <div className="rd-thesis">
        <div className="row1">
          <StatusChip label={st.label} cls={st.cls} />
          {th.ticker && <span className="tick">{th.ticker}</span>}
          <span className="title">{th.title || '(untitled thesis)'}</span>
          {deskName && <span className="desk">{deskName}</span>}
          {th.opened_at && <span className="age">{fmt.dstr(th.opened_at)}</span>}
        </div>
        <div className="row2">
          <span>entry <b>{fmt.num(th.entry, null)}</b></span>
          <span>target <b className="pos">{fmt.num(th.target, null)}</b></span>
          <span>stop <b className="neg">{fmt.num(th.stop, null)}</b></span>
          {th.horizon && <span>horizon <b>{th.horizon}</b></span>}
        </div>
        {healthItems.length > 0 && (
          <div className="row3">
            {healthItems.map((h, i) => (
              <span key={i} className={'rd-chip sm ' + vcls(h.v)} title={h.k + ': ' + String(h.v)}>
                {h.k.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
        {th.macro_assumption && <div className="row4">macro: {th.macro_assumption}</div>}
      </div>
    );
  };

  const DeskDetailPage = ({ desk, dial, onBack }) => {
    const { StanceChip, ConvictionDots, ScoreBar, RegimeTag, HistoryStrip, SignalRow, Empty, Loading, ErrNote } = RV();
    const fmt = RD().fmt;
    const hist = RD().useFetch(() => RD().fetchDialHistory(desk.id, 30), [desk.id]);
    const sigs = useSignalsWithScores({ deskId: desk.id, order: 'asof', limit: 50 }, [desk.id]);
    const theses = RD().useFetch(() => RD().fetchTheses({ deskId: desk.id, open: true }), [desk.id]);
    const disagree = dial && dial.machine_stance && dial.stance && dial.machine_stance !== dial.stance;
    const drivers = (dial && Array.isArray(dial.drivers)) ? dial.drivers : [];
    return (
      <div className="rd-page">
        <div className="rd-desk-head">
          <button type="button" className="rd-btn ghost" onClick={onBack}>‹ Dials</button>
          <div className="rd-head-l">
            <div className="k">{desk.basket} · {desk.kind}{desk.benchmark ? ' · bench ' + desk.benchmark : ''}</div>
            <h1>{desk.name}</h1>
          </div>
          {dial && (
            <div className="rd-desk-dial">
              <div className="stances">
                <span className="lab">HOUSE</span>
                <StanceChip stance={dial.stance} />
                <ConvictionDots n={dial.conviction} />
                {disagree
                  ? <React.Fragment>
                      <span className="lab warn">MACHINE</span>
                      <StanceChip stance={dial.machine_stance} title={'machine proposes ' + dial.machine_stance} />
                    </React.Fragment>
                  : <span className="agree" title="machine stance agrees">machine agrees</span>}
              </div>
              <div className="meta">
                <ScoreBar score={dial.machine_score} />
                <RegimeTag regime={dial.regime} />
                <span className="src">{dial.stance_source || ''}</span>
                <span className="age">as of {fmt.dstr(dial.asof)} · updated {fmt.ago(dial.updated_at || dial.asof)}</span>
              </div>
            </div>
          )}
        </div>

        {dial ? (
          <React.Fragment>
            {disagree && (
              <div className="rd-banner amber">
                House stance <b>{dial.stance}</b> disagrees with machine <b>{dial.machine_stance}</b>
                {' '}(score {fmt.signed(dial.machine_score, 2)}). The dial shows both — disagreement is signal.
              </div>
            )}
            {(dial.what_changed || dial.flip_condition) && (
              <div className="rd-desk-notes">
                {dial.what_changed && <div className="wc"><span className="k">what changed</span>{dial.what_changed}</div>}
                {dial.flip_condition && <div className="fc"><span className="k">what flips it</span>{dial.flip_condition}</div>}
              </div>
            )}
          </React.Fragment>
        ) : (
          <Empty note="No dial for this desk yet" />
        )}

        {desk.benchmark && <BenchChart ticker={desk.benchmark} />}

        <div className="rd-sec">Drivers<span className="n">{drivers.length}</span></div>
        {drivers.length ? (
          <table className="rd-tbl">
            <thead>
              <tr><th>driver</th><th className="num">latest</th><th className="num">z</th><th className="num">12m pctile</th><th className="ctr">dir</th><th className="num">contrib</th></tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => <DriverRow key={(d.series_key || '') + i} drv={d} />)}
            </tbody>
          </table>
        ) : (
          <Empty note="No drivers recorded yet" detail="Driver stats land with the first nightly dial." />
        )}

        <div className="rd-sec">Dial history<span className="n">30</span></div>
        {hist.loading ? <Loading /> : hist.err ? <ErrNote err={hist.err} onRetry={hist.reload} />
          : <HistoryStrip rows={hist.data || []} />}

        <div className="rd-cols">
          <div>
            <div className="rd-sec">Signals</div>
            {sigs.loading ? <Loading /> : sigs.err ? <ErrNote err={sigs.err} onRetry={sigs.reload} />
              : (sigs.data && sigs.data.length)
                ? <div className="rd-siglist">{sigs.data.map((s) => (
                    <SignalRow key={s.id} sig={s} scores={sigs.scores[s.id]} />
                  ))}</div>
                : <Empty note="No signals for this desk yet" />}
          </div>
          <div>
            <div className="rd-sec">Open theses</div>
            {theses.loading ? <Loading /> : theses.err ? <ErrNote err={theses.err} onRetry={theses.reload} />
              : (theses.data && theses.data.length)
                ? theses.data.map((t) => <ThesisCard key={t.id} th={t} />)
                : <Empty note="No open theses on this desk" detail="Idea tickets graduate here when opened." />}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // SIGNALS — firm-wide feed + graveyard
  // ==========================================================================
  const SignalsPage = ({ desks, onOpenDesk }) => {
    const { SignalRow, Empty, Loading, ErrNote } = RV();
    const fmt = RD().fmt;
    const [kind, setKind] = React.useState('');
    const [deskId, setDeskId] = React.useState('');
    const sigs = useSignalsWithScores({ kind: kind || null, deskId: deskId || null, order: 'salience', limit: 200 }, [kind, deskId]);
    const grave = RD().useFetch(() => RD().fetchGraveyard(), []);
    const kinds = React.useMemo(() => {
      const s = new Set((sigs.data || []).map((x) => x.kind).filter(Boolean));
      if (kind) s.add(kind);
      return [...s].sort();
    }, [sigs.data, kind]);
    const deskName = (id) => { const d = (desks || []).find((x) => x.id === id); return d ? d.name : id; };
    return (
      <div className="rd-page">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">firm-wide feed · salience-sorted</div>
            <h1>Signals</h1>
          </div>
          <div className="rd-filters">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">all kinds</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={deskId} onChange={(e) => setDeskId(e.target.value)}>
              <option value="">all desks</option>
              {(desks || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        {sigs.loading ? <Loading /> : sigs.err ? <ErrNote err={sigs.err} onRetry={sigs.reload} />
          : (sigs.data && sigs.data.length)
            ? <div className="rd-siglist">
                {sigs.data.map((s) => (
                  <SignalRow key={s.id} sig={s} scores={sigs.scores[s.id]}
                             deskName={s.desk_id ? deskName(s.desk_id) : null}
                             onOpenDesk={() => s.desk_id && onOpenDesk(s.desk_id)} />
                ))}
              </div>
            : <Empty note="No signals yet" detail="The signal engine runs in the nightly compute pass." />}

        <div className="rd-sec">Graveyard<span className="n">{(grave.data || []).length}</span></div>
        <div className="rd-dim rd-gravenote">signal kinds retired by the audit loop — hit rate &lt;45% over trailing 20 with n≥20.</div>
        {grave.loading ? <Loading /> : grave.err ? <ErrNote err={grave.err} onRetry={grave.reload} />
          : (grave.data && grave.data.length)
            ? <table className="rd-tbl slim">
                <thead><tr><th>kind</th><th>desk</th><th className="num">hit rate</th><th className="num">n</th><th>retired</th><th>reason</th></tr></thead>
                <tbody>
                  {grave.data.map((g, i) => (
                    <tr key={i}>
                      <td>{g.kind}</td>
                      <td>{g.desk_id ? deskName(g.desk_id) : '—'}</td>
                      <td className="num neg">{g.hit_rate == null ? '—' : Math.round(Number(g.hit_rate) * 100) + '%'}</td>
                      <td className="num">{g.n_obs == null ? '—' : g.n_obs}</td>
                      <td>{fmt.dstr(g.retired_at)}</td>
                      <td className="rd-dim">{g.reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            : <div className="rd-dim rd-gravenote empty">nothing has died yet — the graveyard fills as the audit loop matures.</div>}
      </div>
    );
  };

  // ==========================================================================
  // BRIEFS
  // ==========================================================================
  const BRIEF_KINDS = ['morning', 'weekly', 'monthly', 'flash'];
  const BriefsPage = () => {
    const { Empty, Loading, ErrNote } = RV();
    const fmt = RD().fmt;
    const q = RD().useFetch(() => RD().fetchBriefs({ limit: 80 }), []);
    const [sel, setSel] = React.useState(null);
    // default: latest morning brief, else latest of anything
    React.useEffect(() => {
      if (sel || !q.data || !q.data.length) return;
      const morning = q.data.find((b) => b.kind === 'morning');
      setSel((morning || q.data[0]).id);
    }, [q.data, sel]);
    if (q.loading) return <div className="rd-page"><Loading /></div>;
    if (q.err) return <div className="rd-page"><ErrNote err={q.err} onRetry={q.reload} /></div>;
    const briefs = q.data || [];
    const cur = briefs.find((b) => b.id === sel) || null;
    return (
      <div className="rd-page rd-briefs">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">the compressed output · 5 things a day</div>
            <h1>Briefs</h1>
          </div>
        </div>
        {!briefs.length ? (
          <Empty note="No briefs yet" detail="The first morning brief lands after tonight's run (06:30 WIB)." />
        ) : (
          <div className="rd-briefs-body">
            <div className="rd-briefs-list">
              {BRIEF_KINDS.map((k) => {
                const list = briefs.filter((b) => b.kind === k);
                if (!list.length) return null;
                return (
                  <React.Fragment key={k}>
                    <div className="rd-sec">{k}<span className="n">{list.length}</span></div>
                    {list.map((b) => (
                      <div key={b.id} className={'rd-brief-item' + (b.id === sel ? ' active' : '')} onClick={() => setSel(b.id)}>
                        <span className="d">{fmt.dstr(b.asof)}</span>
                        {b.sent_at && <span className="s" title={'sent ' + b.sent_at}>sent</span>}
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="rd-brief-view">
              {cur ? (
                <React.Fragment>
                  <div className="rd-brief-head">
                    <span className="kind">{cur.kind}</span>
                    <span className="d">{fmt.dstr(cur.asof)}</span>
                    {cur.sent_at && <span className="rd-dim">pushed {fmt.ago(cur.sent_at)} ago</span>}
                  </div>
                  <pre className="rd-pre">{cur.body || '(empty brief body)'}</pre>
                </React.Fragment>
              ) : <Empty note="Select a brief" />}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // BOOK — open theses + pending ideas
  // ==========================================================================
  const BookPage = ({ desks }) => {
    const { Empty, Loading, ErrNote } = RV();
    const fmt = RD().fmt;
    const theses = RD().useFetch(() => RD().fetchTheses({}), []);
    const ideas = RD().useFetch(() => RD().fetchIdeas(), []);
    const deskName = (id) => { const d = (desks || []).find((x) => x.id === id); return d ? d.name : id; };
    if (theses.loading) return <div className="rd-page"><Loading /></div>;
    if (theses.err) return <div className="rd-page"><ErrNote err={theses.err} onRetry={theses.reload} /></div>;
    const all = theses.data || [];
    const live = all.filter((t) => ['open', 'wounded', 'draft'].includes(t.status));
    const closed = all.filter((t) => !['open', 'wounded', 'draft'].includes(t.status));
    const pending = (ideas.data || []).filter((i) => !i.decision || String(i.decision).toLowerCase() === 'pending');
    const thesisById = (id) => all.find((t) => t.id === id);
    return (
      <div className="rd-page">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">the unit of work is a live position thesis</div>
            <h1>Book</h1>
          </div>
          <div className="rd-tally">
            <span className="i"><span className="rd-dim">open</span><b>{live.length}</b></span>
            <span className="i"><span className="rd-dim">closed</span><b>{closed.length}</b></span>
            <span className="i"><span className="rd-dim">ideas pending</span><b>{pending.length}</b></span>
          </div>
        </div>

        {pending.length > 0 && (
          <React.Fragment>
            <div className="rd-sec">Idea tickets · pending decision<span className="n">{pending.length}</span></div>
            {pending.map((i) => {
              const th = thesisById(i.thesis_id);
              const sc = i.size_check;
              const scItems = !sc ? [] : Array.isArray(sc)
                ? sc.map((x, j) => ({ k: x.rule || x.check || ('#' + j), v: x.ok != null ? x.ok : x.pass }))
                : Object.entries(sc).map(([k, v]) => ({ k, v }));
              return (
                <div key={i.id} className="rd-idea">
                  <span className="rd-chip amber">PENDING</span>
                  <span className="title">{th ? (th.title || th.ticker || th.id) : ('thesis ' + (i.thesis_id || '?'))}</span>
                  {i.proposed_size_pct != null && <span className="size">size <b>{fmt.num(i.proposed_size_pct, 1)}%</b></span>}
                  {scItems.map((x, j) => (
                    <span key={j} className={'rd-chip sm ' + (x.v === true || String(x.v).toLowerCase() === 'true' || String(x.v).toLowerCase() === 'ok' ? 'pos' : x.v === false ? 'neg' : 'gray')}
                          title={x.k + ': ' + String(x.v)}>{String(x.k).replace(/_/g, ' ')}</span>
                  ))}
                  {i.note && <span className="rd-dim note">{i.note}</span>}
                </div>
              );
            })}
          </React.Fragment>
        )}

        <div className="rd-sec">Live theses<span className="n">{live.length}</span></div>
        {live.length
          ? live.map((t) => <ThesisCard key={t.id} th={t} deskName={t.desk_id ? deskName(t.desk_id) : null} />)
          : <Empty note="No open theses" detail="The book is flat. Idea tickets appear on stance changes and level hits." />}

        {closed.length > 0 && (
          <React.Fragment>
            <div className="rd-sec">Closed<span className="n">{closed.length}</span></div>
            {closed.map((t) => <ThesisCard key={t.id} th={t} deskName={t.desk_id ? deskName(t.desk_id) : null} />)}
          </React.Fragment>
        )}
      </div>
    );
  };

  // ==========================================================================
  // OPS — the honesty page
  // ==========================================================================
  const OpsPage = ({ ops, err, loading, onRetry }) => {
    const { Empty, Loading, ErrNote, StatusChip } = RV();
    const fmt = RD().fmt;
    if (loading) return <div className="rd-page"><Loading /></div>;
    if (err) return <div className="rd-page"><ErrNote err={err} onRetry={onRetry} /></div>;
    const rows = ops || [];
    const agoText = (ts) => { const a = fmt.ago(ts); return a === 'now' ? 'just now' : a + ' ago'; };
    const overdue = (r) => {
      const h = fmt.hoursSince(r.last_success_at);
      return r.expect_within_hours != null && h != null && h > Number(r.expect_within_hours);
    };
    const bad = rows.filter((r) => ['stale', 'error'].includes(r.status) || overdue(r));
    return (
      <div className="rd-page">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">green lights only when data landed</div>
            <h1>Ops</h1>
          </div>
        </div>
        {bad.length > 0 && (
          <div className="rd-banner red">
            ⚠ <b>{bad.length}</b> pipeline{bad.length > 1 ? 's are' : ' is'} not delivering:
            {' '}{bad.map((r) => r.pipeline).join(', ')}. Data on the dials may be stale — trust nothing downstream of a red row.
          </div>
        )}
        {!rows.length ? (
          <Empty note="No freshness rows yet" detail="Every pipeline writes a freshness row on its first run tonight." />
        ) : (
          <table className="rd-tbl">
            <thead>
              <tr><th>pipeline</th><th>status</th><th>last success</th><th className="num">expect (h)</th><th>last run</th><th className="num">rows</th><th>note</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = RD().opsStatus(r.status);
                const late = overdue(r);
                const h = fmt.hoursSince(r.last_success_at);
                return (
                  <tr key={r.pipeline} className={late || st.cls === 'neg' ? 'bad' : ''}>
                    <td className="mono">{r.pipeline}</td>
                    <td><StatusChip label={st.label} cls={st.cls} /></td>
                    <td className={late ? 'neg' : ''}>
                      {r.last_success_at ? agoText(r.last_success_at) : 'never'}
                      {late && <span className="rd-late" title={'expected within ' + r.expect_within_hours + 'h, last success ' + Math.round(h) + 'h ago'}> OVERDUE</span>}
                    </td>
                    <td className="num">{r.expect_within_hours == null ? '—' : r.expect_within_hours}</td>
                    <td>{r.last_run_at ? agoText(r.last_run_at) : 'never'}</td>
                    <td className="num">{r.rows_written == null ? '—' : Number(r.rows_written).toLocaleString('en-US')}</td>
                    <td className="rd-dim">{r.note || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // ==========================================================================
  // CHAT — the research agent
  // ==========================================================================
  const AGENT_API = '/api/research-agent/';

  // pull chart payloads out of an agent response (top level, message level,
  // or a JSON-object content body). Shape: {chart:{series:[{label,points}]}}
  const extractCharts = (obj) => {
    const out = [];
    const grab = (c) => { if (c && Array.isArray(c.series)) out.push(c); };
    if (!obj || typeof obj !== 'object') return out;
    grab(obj.chart);
    (Array.isArray(obj.charts) ? obj.charts : []).forEach(grab);
    if (obj.message && typeof obj.message === 'object') { grab(obj.message.chart); }
    return out;
  };

  const ChatPage = () => {
    const { LineChart, Empty } = RV();
    const [turns, setTurns] = React.useState([]);   // {role,text,charts?}
    const [input, setInput] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [gone, setGone] = React.useState(false);  // 404 → backend not deployed
    const convRef = React.useRef([]);
    const scrollRef = React.useRef(null);
    React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [turns, busy]);

    const send = async () => {
      const q = input.trim();
      if (!q || busy) return;
      setInput(''); setBusy(true);
      setTurns((t) => [...t, { role: 'user', text: q }]);
      convRef.current.push({ role: 'user', content: q });
      try {
        const res = await fetch(AGENT_API, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + RD().token(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: convRef.current }),
        });
        if (res.status === 404) {
          setGone(true);
          setTurns((t) => [...t, { role: 'note', text: 'The research agent backend (/api/research-agent) is not deployed yet. Chat activates when it ships — the rest of the desk works without it.' }]);
        } else {
          let j = null;
          try { j = await res.json(); } catch {}
          if (!res.ok || !j) {
            setTurns((t) => [...t, { role: 'error', text: 'Agent error: HTTP ' + res.status + (j && j.error ? ' — ' + j.error : '') }]);
          } else if (j.error) {
            setTurns((t) => [...t, { role: 'error', text: 'Agent error: ' + j.error }]);
          } else {
            let content = (j.message && j.message.content) != null ? j.message.content
              : j.reply != null ? j.reply : j.content != null ? j.content : j.text != null ? j.text : '';
            let charts = extractCharts(j);
            // content may itself be a JSON object carrying {text, chart}
            if (typeof content === 'string' && content.trim().startsWith('{')) {
              try {
                const inner = JSON.parse(content);
                const innerCharts = extractCharts(inner);
                if (innerCharts.length || inner.text != null) {
                  charts = charts.concat(innerCharts);
                  content = inner.text != null ? inner.text : '';
                }
              } catch {}
            }
            convRef.current.push({ role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) });
            setTurns((t) => [...t, { role: 'assistant', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2), charts }]);
          }
        }
      } catch (e) {
        setTurns((t) => [...t, { role: 'error', text: 'Network error: ' + ((e && e.message) || e) }]);
      }
      setBusy(false);
    };

    const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

    return (
      <div className="rd-page rd-chatpage">
        <div className="rd-head">
          <div className="rd-head-l">
            <div className="k">the research agent · same tools as the telegram bot</div>
            <h1>Chat</h1>
          </div>
        </div>
        {gone && (
          <div className="rd-banner amber">agent backend not deployed — /api/research-agent returned 404. Everything else on this desk is live.</div>
        )}
        <div className="rd-chat-feed" ref={scrollRef}>
          {!turns.length && (
            <div className="rd-chat-empty">
              <p>Ask the desk anything it tracks.</p>
              <ul>
                {['What changed on semiconductors this week?',
                  'Show me Brent vs the oil-gas dial',
                  'Which theses are closest to invalidation?',
                  'What is the machine most bearish on?'].map((s) => (
                  <li key={s} onClick={() => setInput(s)}>“{s}”</li>
                ))}
              </ul>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={'rd-chat-turn ' + t.role}>
              {t.role === 'assistant'
                ? <pre className="rd-pre chat">{t.text}</pre>
                : <div className="txt">{t.text}</div>}
              {(t.charts || []).map((c, j) => (
                <div key={j} className="rd-chat-chart">
                  <LineChart series={(c.series || []).map((s) => ({ label: s.label, points: s.points }))} h={150} title={c.title} />
                </div>
              ))}
            </div>
          ))}
          {busy && <div className="rd-chat-busy"><span /><span /><span /></div>}
        </div>
        <div className="rd-chat-input">
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                    placeholder="Ask the research agent…  (Enter to send)" />
          <button type="button" onClick={send} disabled={busy || !input.trim()}>➤</button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // Error boundary + shell
  // ==========================================================================
  class RdBoundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) { try { console.error('[research-desk]', err, info); } catch {} }
    render() {
      if (this.state.err) {
        return (
          <div className="rd-page">
            <div className="rd-banner red">Research Desk hit a rendering error: {String(this.state.err && this.state.err.message || this.state.err)}</div>
            <button type="button" className="rd-btn" onClick={() => this.setState({ err: null })}>Try again</button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  const NAV = [
    { id: 'dials',   label: 'Dials',   glyph: '◉' },
    { id: 'signals', label: 'Signals', glyph: '⚡' },
    { id: 'briefs',  label: 'Briefs',  glyph: '☰' },
    { id: 'book',    label: 'Book',    glyph: '▤' },
    { id: 'ops',     label: 'Ops',     glyph: '⚙' },
    { id: 'chat',    label: 'Chat',    glyph: '✦' },
  ];

  const ResearchDeskTerminal = () => {
    const [view, setView] = React.useState(() => parseHash() || { page: 'dials' });
    const nav = (page, deskId) => { const v = deskId ? { page, deskId } : { page }; setView(v); writeHash(v); };
    React.useEffect(() => {
      const onHash = () => { const v = parseHash(); if (v) setView(v); };
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const desksQ = RD().useFetch(() => RD().fetchDesks(), []);
    const dialsQ = RD().useFetch(() => RD().fetchDials(), []);
    const opsQ = RD().useFetch(() => RD().fetchOps(), []);
    const fmt = RD().fmt;

    const opsBad = (opsQ.data || []).filter((r) => {
      const h = fmt.hoursSince(r.last_success_at);
      return ['stale', 'error'].includes(r.status) ||
        (r.expect_within_hours != null && h != null && h > Number(r.expect_within_hours));
    }).length;

    const desks = desksQ.data || [];
    const curDesk = view.page === 'desk' ? desks.find((d) => d.id === view.deskId) : null;
    const { Loading, Empty } = RV();

    return (
      <div className="rd-root">
        <div className="rd-rail">
          <div className="rd-rail-brand">RESEARCH<span className="v">DESK</span></div>
          {NAV.map((n) => (
            <div key={n.id}
                 className={'rd-rail-item' + ((view.page === n.id || (view.page === 'desk' && n.id === 'dials')) ? ' active' : '')}
                 onClick={() => nav(n.id)}>
              <span className="glyph">{n.glyph}</span>
              <span className="lbl">{n.label}</span>
              {n.id === 'ops' && opsBad > 0 && <span className="rd-rail-bad">{opsBad}</span>}
            </div>
          ))}
          <div className="rd-rail-foot">
            23 desks · dials nightly<br />
            signals scored +5d/+21d<br />
            data: research + mkt
          </div>
        </div>
        <div className="rd-body">
          <RdBoundary>
            {view.page === 'desk' ? (
              desksQ.loading ? <div className="rd-page"><Loading /></div>
              : curDesk
                ? <DeskDetailPage desk={curDesk} dial={(dialsQ.data || {})[curDesk.id]} onBack={() => nav('dials')} />
                : <div className="rd-page"><Empty note={'Unknown desk “' + view.deskId + '”'} detail="It may have been retired — back to the board." /></div>
            ) : view.page === 'signals' ? (
              <SignalsPage desks={desks} onOpenDesk={(id) => nav('desk', id)} />
            ) : view.page === 'briefs' ? (
              <BriefsPage />
            ) : view.page === 'book' ? (
              <BookPage desks={desks} />
            ) : view.page === 'ops' ? (
              <OpsPage ops={opsQ.data} err={opsQ.err} loading={opsQ.loading} onRetry={opsQ.reload} />
            ) : view.page === 'chat' ? (
              <ChatPage />
            ) : (
              <DialsPage desks={desks} dials={dialsQ.data}
                         err={desksQ.err || dialsQ.err}
                         loading={desksQ.loading || dialsQ.loading}
                         onOpenDesk={(id) => nav('desk', id)}
                         onRetry={() => { desksQ.reload(); dialsQ.reload(); }} />
            )}
          </RdBoundary>
        </div>
      </div>
    );
  };

  window.ResearchDeskTerminal = ResearchDeskTerminal;
})();
