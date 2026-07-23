// ================================================================
// MONITOR · live-data layer (window.MONITOR_LIVE)
// Quotes + history via the keyless Supabase edge fns (equity-quote /
// series-proxy), macro.live_indicators via PostgREST anon, roster via
// management.users_lite (session JWT). All fetches go through a small
// concurrency-limited queue with in-memory TTL caches so a desk with
// 25 constituents doesn't stampede Yahoo.
// ================================================================
(function () {
  'use strict';

  const FN_BASE = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1';
  const SB_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  const SB_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  // ---- fetch queue (max 6 in flight) --------------------------------------
  let inFlight = 0;
  const waiting = [];
  const pump = () => {
    while (inFlight < 6 && waiting.length) {
      const job = waiting.shift();
      inFlight++;
      job.run().then(job.res, job.rej).finally(() => { inFlight--; pump(); });
    }
  };
  const enqueue = (run) => new Promise((res, rej) => { waiting.push({ run, res, rej }); pump(); });

  const getJson = (url, headers) => enqueue(() =>
    fetch(url, headers ? { headers } : undefined).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))));

  // ---- caches --------------------------------------------------------------
  const quoteCache = new Map();    // ticker -> {at, data|promise}
  const histCache = new Map();     // ticker|range|interval -> {at, data|promise}
  const QUOTE_TTL = 60 * 1000;
  const HIST_TTL = 20 * 60 * 1000;

  function cached(map, key, ttl, loader) {
    const hit = map.get(key);
    const now = Date.now();
    if (hit && (hit.promise || now - hit.at < ttl)) return hit.promise || Promise.resolve(hit.data);
    const promise = loader().then(
      (data) => { map.set(key, { at: Date.now(), data }); return data; },
      (err) => { map.delete(key); throw err; }
    );
    map.set(key, { at: now, promise });
    return promise;
  }

  const fetchQuote = (ticker) => cached(quoteCache, ticker, QUOTE_TTL, () =>
    getJson(FN_BASE + '/equity-quote?ticker=' + encodeURIComponent(ticker))
      .then((j) => { if (!j.ok) throw new Error(j.error || 'quote failed'); return j.quote; })
      .then((q) => {
        // Yahoo's 1y daily close array is sparse for FX pairs ("=X"), so the
        // edge fn's prevClose can land months back (USD/JPY "+11%"). Rebuild
        // the daily change from a 5d history instead for those symbols.
        if (!/=X$/.test(ticker)) return q;
        return fetchHistory(ticker, '5d', '1d').then((obs) => {
          if (!obs || obs.length < 2) return q;
          const last = obs[obs.length - 1].value;
          const prev = obs[obs.length - 2].value;
          const price = q.price != null ? q.price : last;
          const change = price - prev;
          return { ...q, prevClose: prev, change, changePct: prev ? (change / prev) * 100 : null };
        }, () => q);
      }));

  const fetchHistory = (ticker, range = '1y', interval = '1d') =>
    cached(histCache, ticker + '|' + range + '|' + interval, HIST_TTL, () =>
      getJson(FN_BASE + '/series-proxy?source=YAHOO&id=' + encodeURIComponent(ticker) +
        '&range=' + encodeURIComponent(range) + '&interval=' + encodeURIComponent(interval))
        .then((j) => { if (j.error) throw new Error(j.error); return j.obs || []; }));

  const fetchFred = (id) =>
    cached(histCache, 'FRED|' + id, 6 * 60 * 60 * 1000, () =>
      getJson(FN_BASE + '/series-proxy?source=FRED&id=' + encodeURIComponent(id))
        .then((j) => { if (j.error) throw new Error(j.error); return j.obs || []; }));

  let liveIndCache = null;
  const fetchLiveIndicators = () => {
    if (liveIndCache && Date.now() - liveIndCache.at < 5 * 60 * 1000) return liveIndCache.p;
    const p = getJson(SB_BASE + '/live_indicators?select=*&order=region,sort_order',
      { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Accept-Profile': 'macro' });
    liveIndCache = { at: Date.now(), p };
    p.catch(() => { liveIndCache = null; });
    return p;
  };

  // ---- session / roster ----------------------------------------------------
  const lbcSession = () => {
    try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; }
  };
  const fetchRoster = () => {
    const s = lbcSession();
    if (!s) return Promise.resolve([]);
    return getJson(SB_BASE + '/users_lite?select=username,full_name,role&order=username',
      { apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Accept-Profile': 'management' })
      .catch(() => []);
  };

  // ---- hooks ---------------------------------------------------------------
  // Batch quotes for a ticker list; refreshes every 60s while mounted.
  function useQuotes(tickers) {
    const key = (tickers || []).join(',');
    const [map, setMap] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      let alive = true;
      const list = key ? key.split(',') : [];
      if (!list.length) { setMap({}); setLoading(false); return; }
      setLoading(true);
      let pending = list.length;
      const load = () => {
        list.forEach((t) => {
          fetchQuote(t).then(
            (q) => { if (alive) setMap((m) => ({ ...m, [t]: q })); },
            () => { if (alive) setMap((m) => ({ ...m, [t]: { error: true } })); }
          ).finally(() => { if (alive && --pending <= 0) setLoading(false); });
        });
      };
      load();
      const iv = setInterval(() => { pending = list.length; load(); }, 90 * 1000);
      return () => { alive = false; clearInterval(iv); };
    }, [key]);
    return { quotes: map, loading };
  }

  // One quote (desk-card sparkline headers etc.)
  function useQuote(ticker) {
    const { quotes, loading } = useQuotes(ticker ? [ticker] : []);
    return { quote: ticker ? quotes[ticker] : null, loading };
  }

  // History for one symbol.
  function useHistory(ticker, range, interval) {
    const [obs, setObs] = React.useState(null);
    const [err, setErr] = React.useState('');
    React.useEffect(() => {
      let alive = true;
      setObs(null); setErr('');
      if (!ticker) return;
      fetchHistory(ticker, range, interval).then(
        (o) => { if (alive) setObs(o); },
        (e) => { if (alive) setErr(String(e.message || e)); }
      );
      return () => { alive = false; };
    }, [ticker, range, interval]);
    return { obs, err };
  }

  // ---- basket / custom-index math -----------------------------------------
  // Equal-weight, rebased-to-100 composite from per-ticker {date,value} arrays.
  // Dates align on the union grid with forward-fill after each series starts.
  function computeBasket(seriesByTicker) {
    const tickers = Object.keys(seriesByTicker).filter((t) => (seriesByTicker[t] || []).length > 1);
    if (!tickers.length) return null;
    const dateSet = new Set();
    tickers.forEach((t) => seriesByTicker[t].forEach((o) => dateSet.add(o.date)));
    const dates = [...dateSet].sort();
    // per-ticker map + forward fill
    const filled = {};
    tickers.forEach((t) => {
      const m = new Map(seriesByTicker[t].map((o) => [o.date, o.value]));
      const arr = new Array(dates.length).fill(null);
      let last = null;
      for (let i = 0; i < dates.length; i++) {
        const v = m.get(dates[i]);
        if (v != null) last = v;
        arr[i] = last;
      }
      filled[t] = arr;
    });
    // first index where every series has a value → common start
    let start = 0;
    for (let i = 0; i < dates.length; i++) {
      if (tickers.every((t) => filled[t][i] != null)) { start = i; break; }
      if (i === dates.length - 1) return null;
    }
    const base = {};
    tickers.forEach((t) => { base[t] = filled[t][start]; });
    const out = [], perName = {};
    tickers.forEach((t) => { perName[t] = []; });
    for (let i = start; i < dates.length; i++) {
      let sum = 0;
      tickers.forEach((t) => {
        const reb = (filled[t][i] / base[t]) * 100;
        perName[t].push({ date: dates[i], value: reb });
        sum += reb;
      });
      out.push({ date: dates[i], value: sum / tickers.length });
    }
    return { dates: dates.slice(start), composite: out, perName, tickers };
  }

  function basketStats(composite) {
    if (!composite || composite.length < 2) return null;
    const first = composite[0].value, last = composite[composite.length - 1].value;
    const ret = (last / first - 1) * 100;
    const rets = [];
    for (let i = 1; i < composite.length; i++) rets.push(Math.log(composite[i].value / composite[i - 1].value));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const varr = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, rets.length - 1);
    const vol = Math.sqrt(varr) * Math.sqrt(252) * 100;
    let peak = -Infinity, mdd = 0;
    composite.forEach((o) => { peak = Math.max(peak, o.value); mdd = Math.min(mdd, (o.value / peak - 1) * 100); });
    return { ret, vol, mdd };
  }

  // ---- regime engine feeds -------------------------------------------------
  // One shared fetch of the cross-asset pack, recomputed at most every 10 min.
  let regimeCache = null; // { at, promise }
  const fetchRegime = () => {
    if (regimeCache && Date.now() - regimeCache.at < 10 * 60 * 1000) return regimeCache.promise;
    const R = window.MONITOR_REGIME;
    const p = Promise.all([
      fetchHistory('^GSPC', '6mo', '1d'), fetchHistory('^VIX', '6mo', '1d'),
      fetchHistory('DX-Y.NYB', '6mo', '1d'), fetchHistory('HG=F', '6mo', '1d'),
      fetchHistory('GC=F', '6mo', '1d'), fetchHistory('IDR=X', '6mo', '1d'),
      fetchFred('BAMLH0A0HYM2'), fetchFred('T10Y2Y'),
    ]).then(([spx, vix, dxy, copper, gold, usdidr, hyRaw, curveRaw]) => R.computeRegime({
      spx, vix, dxy, copper, gold, usdidr,
      hyOas: (hyRaw || []).slice(-520), curve2s10: (curveRaw || []).slice(-520),
    }));
    regimeCache = { at: Date.now(), promise: p };
    p.catch(() => { regimeCache = null; });
    return p;
  };

  function useRegime() {
    const [regime, setRegime] = React.useState(null);
    const [err, setErr] = React.useState('');
    React.useEffect(() => {
      let alive = true;
      fetchRegime().then((r) => alive && setRegime(r), (e) => alive && setErr(String(e && e.message || e)));
      return () => { alive = false; };
    }, []);
    return { regime, err };
  }

  // Desk momentum/RS signals from the desk benchmark vs S&P (histories dedupe
  // through the shared cache, so 13 cards trigger one ^GSPC fetch total).
  function useDeskSignals(benchTicker) {
    const [sig, setSig] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      if (!benchTicker) { setSig(null); return; }
      Promise.all([fetchHistory(benchTicker, '6mo', '1d'), fetchHistory('^GSPC', '6mo', '1d')])
        .then(([bench, spx]) => { if (alive) setSig(window.MONITOR_REGIME.deskSignals(bench, spx)); }, () => {});
      return () => { alive = false; };
    }, [benchTicker]);
    return sig;
  }

  // ---- shared desk assignments (management.monitor_coverage) -------------
  // Read: any authenticated user. Write: RLS allows admin/management only
  // (analysts' edits fall back to local-only). localStorage doubles as the
  // offline cache so the board still renders assignments without a session.
  const fetchCoverage = () => {
    const s = lbcSession();
    if (!s) return Promise.resolve(null);
    return getJson(SB_BASE + '/monitor_coverage?select=desk_id,head,analysts',
      { apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Accept-Profile': 'management' })
      .then((rows) => {
        const m = {};
        (rows || []).forEach((r) => { m[r.desk_id] = { head: r.head || '', analysts: r.analysts || [] }; });
        return m;
      })
      .catch(() => null);
  };
  const saveCoverage = (deskId, val) => {
    const s = lbcSession();
    if (!s) return Promise.reject(new Error('no-auth'));
    return fetch(SB_BASE + '/monitor_coverage', {
      method: 'POST',
      headers: {
        apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Content-Profile': 'management',
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        desk_id: deskId, head: val.head || '', analysts: val.analysts || [],
        updated_by: (s.user && s.user.id) || null, updated_at: new Date().toISOString(),
      }]),
    }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  };

  // ---- assignment + saved-index persistence (local) -----------------------
  const ASSIGN_KEY = 'lbc-monitor-assign';
  const INDICES_KEY = 'lbc-monitor-indices';
  const loadAssign = () => { try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || '{}'); } catch { return {}; } };
  const saveAssign = (a) => { try { localStorage.setItem(ASSIGN_KEY, JSON.stringify(a)); } catch {} };
  const loadIndices = () => { try { return JSON.parse(localStorage.getItem(INDICES_KEY) || '[]'); } catch { return []; } };
  const saveIndices = (l) => { try { localStorage.setItem(INDICES_KEY, JSON.stringify(l)); } catch {} };

  // ---- charts --------------------------------------------------------------
  // Multi-line SVG chart with crosshair; series: [{label, color, points:[{date,value}]}]
  const MultiLineChart = ({ series, height = 260, yFmt, rebased }) => {
    const wrapRef = React.useRef(null);
    const [w, setW] = React.useState(600);
    const [hover, setHover] = React.useState(null);
    React.useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
      ro.observe(el);
      setW(el.clientWidth || 600);
      return () => ro.disconnect();
    }, []);
    const live = (series || []).filter((s) => s.points && s.points.length > 1);
    if (!live.length) return <div ref={wrapRef} className="mon-chart-empty">No data</div>;

    const padL = 46, padR = 12, padT = 10, padB = 22;
    const H = height, W = Math.max(320, w);
    const dates = live[0].points.map((p) => p.date);
    // union grid across series (each series may differ slightly)
    const allDates = [...new Set(live.flatMap((s) => s.points.map((p) => p.date)))].sort();
    let min = Infinity, max = -Infinity;
    live.forEach((s) => s.points.forEach((p) => { if (p.value < min) min = p.value; if (p.value > max) max = p.value; }));
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.06;
    min -= pad; max += pad;
    const x = (d) => padL + (allDates.indexOf(d) / Math.max(1, allDates.length - 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const fmtV = yFmt || ((v) => (Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(Math.abs(v) < 10 ? 2 : 1)));

    // hover
    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, (px - padL) / (W - padL - padR)));
      const idx = Math.round(frac * (allDates.length - 1));
      setHover({ idx, date: allDates[idx] });
    };
    const gridN = 4;
    const gridLines = Array.from({ length: gridN + 1 }, (_, i) => min + ((max - min) * i) / gridN);
    const t0 = allDates[0] || '', t1 = allDates[allDates.length - 1] || '';

    return (
      <div ref={wrapRef} className="mon-chart-wrap">
        <svg width={W} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block' }}>
          {gridLines.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(232,228,217,0.07)" strokeWidth="1" />
              <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{fmtV(v)}</text>
            </g>
          ))}
          {rebased && min < 100 && max > 100 && (
            <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} stroke="rgba(232,228,217,0.22)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          {live.map((s, si) => {
            const d = s.points.map((p, i) => (i === 0 ? 'M' : 'L') + x(p.date).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
            return <path key={si} d={d} fill="none" stroke={s.color} strokeWidth={si === 0 ? 1.8 : 1.2} opacity={si === 0 ? 1 : 0.8} />;
          })}
          {hover && (
            <g>
              <line x1={x(hover.date)} x2={x(hover.date)} y1={padT} y2={H - padB} stroke="rgba(232,228,217,0.3)" strokeWidth="1" />
              {live.map((s, si) => {
                const p = s.points.find((pp) => pp.date === hover.date);
                return p ? <circle key={si} cx={x(p.date)} cy={y(p.value)} r="2.6" fill={s.color} /> : null;
              })}
            </g>
          )}
          <text x={padL} y={H - 8} fontSize="9" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{t0}</text>
          <text x={W - padR} y={H - 8} fontSize="9" textAnchor="end" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{t1}</text>
        </svg>
        {hover && (
          <div className="mon-chart-tip" style={{ left: Math.min(x(hover.date) + 10, W - 170) }}>
            <div className="d">{hover.date}</div>
            {live.map((s, si) => {
              const p = s.points.find((pp) => pp.date === hover.date);
              return p ? (
                <div key={si} className="r">
                  <span className="sw" style={{ background: s.color }}></span>
                  <span className="l">{s.label}</span>
                  <span className="v">{fmtV(p.value)}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  // Tiny sparkline from {date,value} obs (fallback if window.Spark absent).
  const MonSpark = ({ obs, color, w = 84, h = 26 }) => {
    if (!obs || obs.length < 2) return <svg width={w} height={h}></svg>;
    const vs = obs.map((o) => o.value);
    const min = Math.min(...vs), max = Math.max(...vs);
    const span = max - min || 1;
    const pts = obs.map((o, i) => (i / (obs.length - 1)) * (w - 2) + 1 + ',' + (h - 2 - ((o.value - min) / span) * (h - 4)));
    return (
      <svg width={w} height={h}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.4" />
      </svg>
    );
  };

  // CSV export (mirrors macro-real's downloadCsv).
  const downloadCsv = (filename, rows) => {
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  window.MONITOR_LIVE = {
    fetchQuote, fetchHistory, fetchFred, fetchLiveIndicators, fetchRoster,
    fetchCoverage, saveCoverage,
    fetchRegime, useRegime, useDeskSignals,
    useQuotes, useQuote, useHistory,
    computeBasket, basketStats,
    loadAssign, saveAssign, loadIndices, saveIndices,
    MultiLineChart, MonSpark, downloadCsv, lbcSession,
  };
})();
