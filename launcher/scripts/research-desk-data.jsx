// ================================================================
// RESEARCH DESK · data layer (window.RD) — T12.
//
// Read layer for the autonomous research system: `research` schema
// (desk, dial, dial_history, signal, signal_score, graveyard, thesis,
// idea, brief, ops_freshness, alert, news, desk_sentiment, candidate,
// calendar_flag) and `mkt` schema (series, observation, price,
// instrument) over PostgREST.
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

  // ---- news / sentiment / candidates / key dates ---------------------------
  // desk_ids and tickers are text[]; array-contains is `col=cs.{value}`.
  const arrLit = (v) => encodeURIComponent('{' + String(v).replace(/[{},]/g, '') + '}');
  // local (not UTC) calendar day — the calendar is read in the user's day
  const isoDay = (ms) => {
    const t = new Date(ms);
    return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  // order: 'published' (feed, default) or 'importance' (desk panel)
  const fetchNews = (opts = {}) => {
    const days = opts.days == null ? 7 : opts.days;
    const q = ['select=id,published_at,source,headline,url,summary,desk_ids,tickers,region,sentiment,sent_label,importance'];
    q.push('published_at=gte.' + encodeURIComponent(new Date(Date.now() - days * 86400000).toISOString()));
    if (opts.deskId) q.push('desk_ids=cs.' + arrLit(opts.deskId));
    if (opts.ticker) q.push('tickers=cs.' + arrLit(opts.ticker));
    if (opts.sentLabel) q.push('sent_label=eq.' + encodeURIComponent(opts.sentLabel));
    q.push('order=' + (opts.order === 'importance' ? 'importance.desc,published_at.desc' : 'published_at.desc'));
    q.push('limit=' + (opts.limit || 150));
    return rGet('/news?' + q.join('&'));
  };

  // every desk row at the newest asof (one row per desk per day)
  const fetchDeskSentiment = () =>
    rGet('/desk_sentiment?select=asof&order=asof.desc&limit=1').then((r) =>
      (!r || !r.length) ? [] :
        rGet('/desk_sentiment?select=*&asof=eq.' + encodeURIComponent(r[0].asof) + '&limit=200'));

  // the whole newest screen (~109 rows); desk/side/in_book filtering is client side
  // so the Watch toggles stay instant.
  const fetchCandidates = (opts = {}) =>
    rGet('/candidate?select=asof&order=asof.desc&limit=1').then((r) => {
      if (!r || !r.length) return [];
      const q = ['select=*', 'asof=eq.' + encodeURIComponent(r[0].asof), 'order=score.desc',
                 'limit=' + (opts.limit || 400)];
      if (opts.deskId) q.push('desk_id=eq.' + encodeURIComponent(opts.deskId));
      if (opts.side) q.push('side=eq.' + encodeURIComponent(opts.side));
      if (opts.excludeBook) q.push('in_book=eq.false');
      return rGet('/candidate?' + q.join('&'));
    });

  const fetchCalendarFlags = (opts = {}) => {
    const days = opts.days == null ? 14 : opts.days;
    const q = ['select=*', 'event_date=gte.' + isoDay(Date.now()),
               'event_date=lte.' + isoDay(Date.now() + days * 86400000),
               'order=event_date.asc', 'limit=300'];
    if (opts.onlyBook) q.push('touches_book=eq.true');
    return rGet('/calendar_flag?' + q.join('&'));
  };

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

  // Two board groups (research.desk.nav_group): GLOBAL industries and COUNTRY
  // macro desks (country-flavored industry desks live under COUNTRY too).
  const NAV_GROUPS = [
    { id: 'global_industry', label: 'GLOBAL',  sub: 'industries & themes that move worldwide' },
    { id: 'country',         label: 'COUNTRY', sub: 'macro desks and their local industries' },
  ];
  // fallback classification for desks whose row predates the nav_group column
  const deskGroup = (d) => {
    const g = d.nav_group || (d.kind === 'country' || d.benchmark === '^JKSE' ? 'country' : 'global_industry');
    return g === 'country_industry' ? 'country' : g;   // retired third group folds into COUNTRY
  };

  // machine score in [-2, +2] → plain words (the only scoring language the board speaks)
  const wordScore = (score) => {
    if (score == null || isNaN(score)) return { label: 'No read', cls: 'gray' };
    const v = Number(score);
    if (v >= 1.4)  return { label: 'Extremely bullish', cls: 'pos strong' };
    if (v >= 0.7)  return { label: 'Bullish',           cls: 'pos' };
    if (v >= 0.25) return { label: 'Slightly bullish',  cls: 'pos soft' };
    if (v > -0.25) return { label: 'Neutral',           cls: 'gray' };
    if (v > -0.7)  return { label: 'Slightly bearish',  cls: 'neg soft' };
    if (v > -1.4)  return { label: 'Bearish',           cls: 'neg' };
    return { label: 'Extremely bearish', cls: 'neg strong' };
  };

  // '**bold**' markers in current-read text → <b> spans (sekuritas-note style)
  const boldify = (text) => {
    const s = String(text == null ? '' : text);
    if (!s.includes('**')) return s;
    return s.split(/\*\*/).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));
  };

  // how well-established a stored finding is (signal.payload.assurance).
  // Mirror of ASSURANCE_TIER in api/_research/core.js — keep in sync.
  const ASSURANCE_TIER = {
    adversarially_verified: 'verified', verified_full_history: 'verified',
    challenged_survived: 'verified', verified_by_desk: 'verified', verified: 'verified',
    verified_and_fixed: 'verified', resolved_investigation: 'verified',
    verified_corrected: 'corrected', challenged_corrected: 'corrected',
    computed: 'computed', process_observation: 'computed',
  };
  const ASSURANCE_META = {
    verified:   { label: 'VERIFIED',   cls: 'pos',   long: 'survived adversarial review' },
    corrected:  { label: 'CORRECTED',  cls: 'amber', long: 'was wrong once; corrected, recheck passed' },
    computed:   { label: 'COMPUTED',   cls: 'gray',  long: 'machine arithmetic — interpretation never reviewed' },
    unverified: { label: 'UNVERIFIED', cls: 'neg',   long: 'a single unreviewed read — treat as one-third reliable' },
  };
  const assuranceMeta = (payload) => {
    const a = (payload && payload.assurance) || 'unchallenged';
    const tier = ASSURANCE_TIER[a] || 'unverified';
    return { ...ASSURANCE_META[tier], tier, raw: a };
  };

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

  // news tone → chip vocabulary
  const SENT = {
    bullish: { label: 'BULL', long: 'bullish', cls: 'pos'  },
    bearish: { label: 'BEAR', long: 'bearish', cls: 'neg'  },
    neutral: { label: 'FLAT', long: 'neutral', cls: 'gray' },
  };
  const sentMeta = (s) => SENT[String(s || '').toLowerCase()] || { label: '·', long: 'unscored', cls: 'gray' };

  // candidate side → chip
  const SIDE = {
    long:  { label: 'LONG',  cls: 'pos' },
    short: { label: 'SHORT', cls: 'neg' },
  };
  const sideMeta = (s) => SIDE[String(s || '').toLowerCase()] || { label: (s || '?').toUpperCase(), cls: 'gray' };

  // calendar importance → chip
  const IMPORTANCE = {
    high: { label: 'HIGH', cls: 'neg'   },
    med:  { label: 'MED',  cls: 'amber' },
    low:  { label: 'LOW',  cls: 'gray'  },
  };
  const importanceMeta = (s) => IMPORTANCE[String(s || '').toLowerCase()] || { label: (s || '?').toUpperCase(), cls: 'gray' };

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
  // decimal ratio (0.9568) → signed percent (+95.7%) — candidate.metrics are decimals
  const pctd = (v, d) => (v === null || v === undefined || isNaN(v)) ? '—'
    : (v > 0 ? '+' : '') + num(Number(v) * 100, d == null ? 1 : d) + '%';
  const signCls = (v, flip) => {
    if (v === null || v === undefined || isNaN(v) || Number(v) === 0) return '';
    return (Number(v) > 0) === !flip ? 'pos' : 'neg';
  };

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
    fetchNews, fetchDeskSentiment, fetchCandidates, fetchCalendarFlags,
    fetchObservations, fetchPrices, fetchSeriesMeta,
    useFetch,
    BASKETS, NAV_GROUPS, deskGroup, assuranceMeta, wordScore, boldify,
    STANCE, stanceMeta, dirGlyph, thesisStatus, opsStatus,
    SENT, sentMeta, SIDE, sideMeta, IMPORTANCE, importanceMeta,
    fmt: { num, signed, pct, pctd, pctile, signCls, ago, hoursSince, dstr, isoDay },
  };
})();
