// ================================================================
// RESEARCH DESK · data layer (window.RD) — T12.
//
// Read layer for the autonomous research system: `research` schema
// (desk, dial, dial_history, signal, signal_score, graveyard, thesis,
// idea, brief, ops_freshness, alert) and `mkt` schema (series,
// observation, price, instrument) over PostgREST.
//
// All research/mkt tables carry anon SELECT policies, so reads work
// with the publishable key alone; when an LBC session exists its JWT
// is used instead (same pattern as the rest of the terminal).
// The pipeline writes; this layer only reads.
// ================================================================
(function () {
  'use strict';

  const BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  const ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  // ---- session -------------------------------------------------------------
  const session = () => {
    try {
      const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null');
      return (s && s.token && s.exp && Date.now() < s.exp) ? s : null;
    } catch { return null; }
  };
  const token = () => { const s = session(); return s ? s.token : ANON; };

  // ---- transport -----------------------------------------------------------
  const get = (schema, path) =>
    fetch(BASE + path, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + token(), 'Accept-Profile': schema },
    }).then(async (r) => {
      if (!r.ok) {
        let msg = 'HTTP ' + r.status;
        try { const j = await r.json(); msg = j.message || j.hint || msg; } catch {}
        throw new Error(msg);
      }
      return r.json();
    });
  const rGet = (p) => get('research', p);
  const mGet = (p) => get('mkt', p);

  // ---- research reads ------------------------------------------------------
  const fetchDesks = () =>
    rGet('/desk?select=*&active=eq.true&order=sort_order.asc');

  // one dial row per desk; if the table ever carries multiple asof rows the
  // newest wins (order + first-write-wins into the map).
  const fetchDials = () =>
    rGet('/dial?select=*&order=asof.desc').then((rows) => {
      const m = {};
      (rows || []).forEach((r) => { if (!m[r.desk_id]) m[r.desk_id] = r; });
      return m;
    });

  const fetchDialHistory = (deskId, limit = 30) =>
    rGet('/dial_history?select=*&desk_id=eq.' + encodeURIComponent(deskId) +
         '&order=asof.desc&limit=' + limit);

  // order: 'salience' (feed page) or 'asof' (desk detail)
  const fetchSignals = (opts = {}) => {
    const q = ['select=*'];
    if (opts.deskId) q.push('desk_id=eq.' + encodeURIComponent(opts.deskId));
    if (opts.kind) q.push('kind=eq.' + encodeURIComponent(opts.kind));
    q.push('order=' + (opts.order === 'asof' ? 'asof.desc,salience.desc' : 'salience.desc,asof.desc'));
    q.push('limit=' + (opts.limit || 200));
    return rGet('/signal?' + q.join('&'));
  };

  // scores keyed by signal_id → [{horizon_days, realized_ret, hit}]
  const fetchSignalScores = (ids) => {
    if (!ids || !ids.length) return Promise.resolve({});
    const chunks = [];
    for (let i = 0; i < ids.length; i += 80) chunks.push(ids.slice(i, i + 80));
    return Promise.all(chunks.map((c) =>
      rGet('/signal_score?select=*&signal_id=in.(' + c.map(encodeURIComponent).join(',') + ')')
    )).then((lists) => {
      const m = {};
      lists.flat().forEach((s) => { (m[s.signal_id] = m[s.signal_id] || []).push(s); });
      Object.values(m).forEach((l) => l.sort((a, b) => (a.horizon_days || 0) - (b.horizon_days || 0)));
      return m;
    });
  };

  const fetchGraveyard = () =>
    rGet('/graveyard?select=*&order=retired_at.desc&limit=100');

  const fetchBriefs = (opts = {}) => {
    const q = ['select=*', 'order=asof.desc,sent_at.desc', 'limit=' + (opts.limit || 80)];
    if (opts.kind) q.push('kind=eq.' + encodeURIComponent(opts.kind));
    return rGet('/brief?' + q.join('&'));
  };

  const fetchTheses = (opts = {}) => {
    const q = ['select=*', 'order=opened_at.desc.nullslast', 'limit=' + (opts.limit || 200)];
    if (opts.deskId) q.push('desk_id=eq.' + encodeURIComponent(opts.deskId));
    if (opts.open) q.push('status=in.(draft,open,wounded)');
    return rGet('/thesis?' + q.join('&'));
  };

  const fetchIdeas = () => rGet('/idea?select=*&limit=200');

  const fetchOps = () => rGet('/ops_freshness?select=*&order=pipeline.asc');

  // ---- mkt reads (cached — driver charts re-open constantly) ---------------
  const _obsCache = new Map();
  const fetchObservations = (seriesKey, limit = 500) => {
    const k = seriesKey + '|' + limit;
    if (_obsCache.has(k)) return _obsCache.get(k);
    const p = mGet('/observation?select=date,value&series_key=eq.' + encodeURIComponent(seriesKey) +
                   '&order=date.desc&limit=' + limit)
      .then((rows) => (rows || []).reverse())
      .catch((e) => { _obsCache.delete(k); throw e; });
    _obsCache.set(k, p);
    return p;
  };

  const _priceCache = new Map();
  const fetchPrices = (ticker, limit = 260) => {
    const k = ticker + '|' + limit;
    if (_priceCache.has(k)) return _priceCache.get(k);
    const p = mGet('/price?select=date,close&ticker=eq.' + encodeURIComponent(ticker) +
                   '&order=date.desc&limit=' + limit)
      .then((rows) => (rows || []).reverse())
      .catch((e) => { _priceCache.delete(k); throw e; });
    _priceCache.set(k, p);
    return p;
  };

  const fetchSeriesMeta = (keys) => {
    if (!keys || !keys.length) return Promise.resolve({});
    return mGet('/series?select=key,label,unit,freq,country,category&key=in.(' +
                keys.map(encodeURIComponent).join(',') + ')')
      .then((rows) => {
        const m = {};
        (rows || []).forEach((r) => { m[r.key] = r; });
        return m;
      });
  };

  // ---- generic fetch hook --------------------------------------------------
  // const { data, err, loading, reload } = RD.useFetch(() => RD.fetchDesks(), []);
  const useFetch = (fn, deps) => {
    const [state, setState] = React.useState({ data: null, err: null, loading: true });
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => {
      let alive = true;
      setState((s) => ({ ...s, loading: true, err: null }));
      Promise.resolve().then(fn).then(
        (data) => { if (alive) setState({ data, err: null, loading: false }); },
        (err) => { if (alive) setState({ data: null, err: (err && err.message) || String(err), loading: false }); }
      );
      return () => { alive = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps.concat([tick]));
    return { ...state, reload: () => setTick((t) => t + 1) };
  };

  // ---- domain vocab --------------------------------------------------------
  const BASKETS = [
    { id: 'cyclical', label: 'Cyclical' },
    { id: 'secular',  label: 'Secular' },
    { id: 'country',  label: 'Country' },
  ];

  const STANCE = {
    OW: { label: 'OW', long: 'Overweight',  cls: 'ow' },
    N:  { label: 'N',  long: 'Neutral',     cls: 'n'  },
    UW: { label: 'UW', long: 'Underweight', cls: 'uw' },
  };
  const stanceMeta = (s) => STANCE[s] || { label: s || '—', long: s || 'unset', cls: 'n' };

  const dirGlyph = (d) => {
    const s = String(d || '').toLowerCase();
    if (['up', 'pos', 'bull', 'long', '+', '+1', '1', 'bullish', 'supportive'].includes(s)) return { g: '▲', cls: 'pos' };
    if (['down', 'neg', 'bear', 'short', '-', '-1', 'bearish', 'hostile'].includes(s)) return { g: '▼', cls: 'neg' };
    return { g: '→', cls: 'flat' };
  };

  // thesis lifecycle → display class
  const THESIS_STATUS = {
    draft:       { label: 'DRAFT',    cls: 'gray' },
    open:        { label: 'OPEN',     cls: 'pos'  },
    wounded:     { label: 'WOUNDED',  cls: 'amber' },
    invalidated: { label: 'INVALID',  cls: 'neg'  },
    closed_win:  { label: 'WIN',      cls: 'pos'  },
    closed_loss: { label: 'LOSS',     cls: 'neg'  },
    closed_flat: { label: 'FLAT',     cls: 'gray' },
  };
  const thesisStatus = (s) => THESIS_STATUS[s] || { label: (s || '?').toUpperCase(), cls: 'gray' };

  const OPS_STATUS = {
    ok:    { label: 'OK',    cls: 'pos'   },
    stale: { label: 'STALE', cls: 'amber' },
    error: { label: 'ERROR', cls: 'neg'   },
    init:  { label: 'INIT',  cls: 'gray'  },
  };
  const opsStatus = (s) => OPS_STATUS[s] || { label: (s || '?').toUpperCase(), cls: 'gray' };

  // ---- formatting ----------------------------------------------------------
  const num = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—'
    : Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  const signed = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—'
    : (v > 0 ? '+' : '') + num(v, d == null ? 2 : d);
  const pct = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—'
    : (v > 0 ? '+' : '') + num(v, d == null ? 1 : d) + '%';
  const pctile = (v) => (v === null || v === undefined || isNaN(v)) ? '—'
    : Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v)) + '%';

  const ago = (ts) => {
    if (!ts) return '—';
    const t = new Date(ts).getTime();
    if (isNaN(t)) return '—';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return 'now';
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400 * 2) return Math.round(s / 3600) + 'h';
    if (s < 86400 * 60) return Math.round(s / 86400) + 'd';
    return Math.round(s / (86400 * 30)) + 'mo';
  };
  const hoursSince = (ts) => {
    if (!ts) return null;
    const t = new Date(ts).getTime();
    return isNaN(t) ? null : (Date.now() - t) / 3600000;
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dstr = (d) => {
    if (!d) return '—';
    const t = new Date(d);
    if (isNaN(t.getTime())) return String(d);
    return MONTHS[t.getMonth()] + ' ' + t.getDate() + (t.getFullYear() !== new Date().getFullYear() ? ' ’' + String(t.getFullYear()).slice(2) : '');
  };

  window.RD = {
    session, token,
    fetchDesks, fetchDials, fetchDialHistory,
    fetchSignals, fetchSignalScores, fetchGraveyard,
    fetchBriefs, fetchTheses, fetchIdeas, fetchOps,
    fetchObservations, fetchPrices, fetchSeriesMeta,
    useFetch,
    BASKETS, STANCE, stanceMeta, dirGlyph, thesisStatus, opsStatus,
    fmt: { num, signed, pct, pctile, ago, hoursSince, dstr },
  };
})();
