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

  // TTL cache with a size cap — the terminal stays open all day, so caches
  // must shrink as well as expire (evict oldest fifth past MAX_CACHE).
  const MAX_CACHE = 600;
  function evictOldest(map) {
    if (map.size <= MAX_CACHE) return;
    const entries = [...map.entries()].sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    for (let i = 0; i < Math.ceil(MAX_CACHE / 5); i++) map.delete(entries[i][0]);
  }
  function cached(map, key, ttl, loader) {
    const hit = map.get(key);
    const now = Date.now();
    if (hit && (hit.promise || now - hit.at < ttl)) return hit.promise || Promise.resolve(hit.data);
    const promise = loader().then(
      (data) => { map.set(key, { at: Date.now(), data }); return data; },
      (err) => { map.delete(key); throw err; }
    );
    map.set(key, { at: now, promise });
    evictOldest(map);
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

  const fetchBars = (ticker, range = '3mo') =>
    cached(histCache, 'BARS|' + ticker + '|' + range, HIST_TTL, () =>
      getJson(FN_BASE + '/monitor-bars?ticker=' + encodeURIComponent(ticker) + '&range=' + encodeURIComponent(range))
        .then((j) => { if (!j.ok) throw new Error(j.error || 'bars failed'); return j.bars || []; }));

  const fetchDbnomics = (id) =>
    cached(histCache, 'DBN|' + id, 6 * 60 * 60 * 1000, () =>
      getJson(FN_BASE + '/series-proxy?source=DBNOMICS&id=' + encodeURIComponent(id))
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
  // Batch quotes for a ticker list; refreshes every 90s while mounted.
  // The map resets whenever the list changes (a filtered universe must never
  // leak stale members into breadth math), and each polling cycle carries a
  // generation id so stragglers from a superseded cycle can't corrupt the
  // loading state.
  function useQuotes(tickers) {
    const key = (tickers || []).join(',');
    const [map, setMap] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      let alive = true;
      let gen = 0;
      const list = key ? key.split(',') : [];
      setMap({});
      if (!list.length) { setLoading(false); return; }
      setLoading(true);
      const perTicker = (myGen) => {
        let pending = list.length;
        list.forEach((t) => {
          fetchQuote(t).then(
            (q) => { if (alive && myGen === gen) setMap((m) => ({ ...m, [t]: q })); },
            () => { if (alive && myGen === gen) setMap((m) => ({ ...m, [t]: { error: true } })); }
          ).finally(() => { if (alive && myGen === gen && --pending <= 0) setLoading(false); });
        });
      };
      const load = () => {
        const myGen = ++gen;
        // batch endpoint (0.6): one request per 60 tickers; per-ticker fallback.
        if (list.length > 3) {
          const chunks = [];
          for (let i = 0; i < list.length; i += 60) chunks.push(list.slice(i, i + 60));
          Promise.all(chunks.map((c) =>
            getJson(FN_BASE + '/monitor-quotes?tickers=' + encodeURIComponent(c.join(',')))))
            .then((results) => {
              if (!alive || myGen !== gen) return;
              const merged = {};
              results.forEach((j) => {
                Object.keys(j.quotes || {}).forEach((t) => { merged[t] = j.quotes[t]; });
                Object.keys(j.errors || {}).forEach((t) => { merged[t] = { error: true }; });
              });
              // seed cache so detail views reuse the batch result
              list.forEach((t) => { if (merged[t] && !merged[t].error) quoteCache.set(t, { at: Date.now(), data: merged[t] }); });
              setMap(merged);
              setLoading(false);
            }, () => { if (alive && myGen === gen) perTicker(myGen); });
        } else {
          perTicker(myGen);
        }
      };
      load();
      const iv = setInterval(load, 90 * 1000);
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

  // Volume-flow read for a desk's filtered universe: samples the first
  // VOLUME_SAMPLE tickers (bars are heavier than quotes), 20-min cached.
  const VOLUME_SAMPLE = 24;
  function useVolumeFlow(rows) {
    const tickers = (rows || []).filter((r) => r.t && !/[=^]/.test(r.t)).slice(0, VOLUME_SAMPLE).map((r) => r.t);
    const key = tickers.join(',');
    const [flow, setFlow] = React.useState(null);
    React.useEffect(() => {
      let alive = true;
      setFlow(null);
      if (!key) return;
      const list = key.split(',');
      Promise.all(list.map((t) => fetchBars(t, '3mo').then((b) => [t, b], () => [t, null])))
        .then((pairs) => {
          if (!alive) return;
          const map = {};
          pairs.forEach(([t, b]) => { if (b) map[t] = b; });
          const f = window.MONITOR_REGIME.volumeFlow(map);
          const tb = window.MONITOR_REGIME.trendBreadth(map);
          setFlow(f ? { ...f, tb, sampled: list.length, universe: (rows || []).filter((r) => r.t).length } : null);
        });
      return () => { alive = false; };
    }, [key]);
    return flow;
  }

  // Multi-horizon trailing returns per ticker from cached 3mo bars
  // (3D/1W/2W/1M in TRADING days: 3/5/10/21). Capped at 60 names.
  function useReturns(rows) {
    const tickers = (rows || []).filter((r) => r.t).slice(0, 60).map((r) => r.t);
    const key = tickers.join(',');
    const [map, setMap] = React.useState({});
    React.useEffect(() => {
      let alive = true;
      setMap({});
      if (!key) return;
      const list = key.split(',');
      Promise.all(list.map((t) => fetchBars(t, '3mo').then((b) => [t, b], () => [t, null])))
        .then((pairs) => {
          if (!alive) return;
          const out = {};
          pairs.forEach(([t, bars]) => {
            if (!bars || bars.length < 12) return;
            const c = bars.map((b) => b.c).filter((v) => v != null);
            const n = c.length;
            const r = (k) => (n > k && c[n - 1 - k] ? (c[n - 1] / c[n - 1 - k] - 1) * 100 : null);
            out[t] = { r3d: r(3), r1w: r(5), r2w: r(10), r1m: r(21) };
          });
          setMap(out);
        });
      return () => { alive = false; };
    }, [key]);
    return map;
  }

  // ---- basket / custom-index math -----------------------------------------
  // Rebased-to-100 composite from per-ticker {date,value} arrays; weights map
  // {ticker: number} is normalized internally (omit for equal-weight).
  // Dates align on the union grid with forward-fill after each series starts.
  function computeBasket(seriesByTicker, weights) {
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
    // last REAL (non-forward-filled) date per ticker — lets callers flag
    // members whose feed died mid-series instead of silently flatlining.
    const lastReal = {};
    tickers.forEach((t) => {
      const s = seriesByTicker[t];
      lastReal[t] = s[s.length - 1].date;
    });
    const base = {};
    tickers.forEach((t) => { base[t] = filled[t][start]; });
    // normalized weights — missing/invalid entries default to 1 (equal share)
    const raw = {};
    tickers.forEach((t) => { raw[t] = (weights && Number(weights[t]) > 0) ? Number(weights[t]) : 1; });
    const wsum = tickers.reduce((a, t) => a + raw[t], 0);
    const w = {};
    tickers.forEach((t) => { w[t] = raw[t] / wsum; });
    const out = [], perName = {};
    tickers.forEach((t) => { perName[t] = []; });
    for (let i = start; i < dates.length; i++) {
      let sum = 0;
      tickers.forEach((t) => {
        const reb = (filled[t][i] / base[t]) * 100;
        perName[t].push({ date: dates[i], value: reb });
        sum += reb * w[t];
      });
      out.push({ date: dates[i], value: sum });
    }
    return { dates: dates.slice(start), composite: out, perName, tickers, weights: w, lastReal };
  }

  // Pairwise correlation of members' daily log-returns + composite beta/corr
  // vs an overlay series (both aligned on the basket's date grid).
  function basketCorrelation(basket) {
    const t = basket.tickers;
    if (t.length < 2) return null;
    const rets = {};
    t.forEach((k) => {
      const s = basket.perName[k];
      const r = [];
      for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].value / s[i - 1].value));
      rets[k] = r;
    });
    const corr = (a, b) => {
      const n = Math.min(a.length, b.length);
      if (n < 10) return null;
      let ma = 0, mb = 0;
      for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
      ma /= n; mb /= n;
      let cab = 0, va = 0, vb = 0;
      for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; cab += da * db; va += da * da; vb += db * db; }
      return va > 0 && vb > 0 ? cab / Math.sqrt(va * vb) : null;
    };
    const m = t.map((a) => t.map((b) => (a === b ? 1 : corr(rets[a], rets[b]))));
    // average off-diagonal correlation = diversification read
    let sum = 0, n = 0;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { if (m[i][j] != null) { sum += m[i][j]; n++; } }
    return { tickers: t, matrix: m, avg: n ? sum / n : null };
  }

  function overlayStats(composite, overlay) {
    if (!composite || !overlay || overlay.length < 10) return null;
    const om = new Map(overlay.map((o) => [o.date, o.value]));
    const rc = [], ro = [];
    for (let i = 1; i < composite.length; i++) {
      const a0 = om.get(composite[i - 1].date), a1 = om.get(composite[i].date);
      if (a0 == null || a1 == null) continue;
      rc.push(Math.log(composite[i].value / composite[i - 1].value));
      ro.push(Math.log(a1 / a0));
    }
    if (rc.length < 10) return null;
    const mean = (x) => x.reduce((p, q) => p + q, 0) / x.length;
    const mc = mean(rc), mo = mean(ro);
    let cov = 0, vo = 0, vc = 0;
    for (let i = 0; i < rc.length; i++) { cov += (rc[i] - mc) * (ro[i] - mo); vo += (ro[i] - mo) ** 2; vc += (rc[i] - mc) ** 2; }
    return {
      beta: vo > 0 ? cov / vo : null,
      corr: vo > 0 && vc > 0 ? cov / Math.sqrt(vo * vc) : null,
    };
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
    // v2 needs ~2y of each leg for the rolling-z warmup; FRED legs are
    // lagged INSIDE the engine (strict < date alignment), so raw series
    // are passed straight through.
    const p = Promise.all([
      fetchHistory('^GSPC', '2y', '1d'), fetchHistory('^VIX', '2y', '1d'),
      fetchHistory('^VIX3M', '2y', '1d'), fetchHistory('DX-Y.NYB', '2y', '1d'),
      fetchHistory('HG=F', '2y', '1d'), fetchHistory('GC=F', '2y', '1d'),
      fetchHistory('IDR=X', '2y', '1d'),
      fetchFred('BAMLH0A0HYM2'), fetchFred('T10Y2Y'), fetchFred('DGS10'),
    ]).then(([spx, vix, vix3m, dxy, copper, gold, usdidr, hyRaw, curveRaw, g10Raw]) => {
      const inputs = {
        spx, vix, vix3m, dxy, copper, gold, usdidr,
        hyOas: (hyRaw || []).slice(-700), curve2s10: (curveRaw || []).slice(-700),
        dgs10: (g10Raw || []).slice(-700),
      };
      const now = R.computeRegime(inputs);
      if (!now) return null;
      now.history = R.computeRegimeSeries({ _rows: now._rows }, 60);
      delete now._rows;
      return now;
    });
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

  // ---- fundamentals + USD market-cap weights ------------------------------
  const fetchFundamentals = (ticker) =>
    cached(histCache, 'FUND|' + ticker, 12 * 60 * 60 * 1000, () =>
      getJson(FN_BASE + '/equity-fundamentals?ticker=' + encodeURIComponent(ticker))
        .then((j) => { if (!j.ok || !j.fundamentals) throw new Error(j.error || 'no fundamentals'); return j.fundamentals; }));

  // USD value of 1 unit of `cur` (GBp = pence). Majors quote as XXXUSD=X on
  // Yahoo (multiply); the rest quote as USD-base XXX=X (divide).
  const FX_USD_BASE = new Set(['EUR', 'GBP', 'AUD', 'NZD']);
  const usdRate = (cur) => {
    if (!cur || cur === 'USD') return Promise.resolve(1);
    if (cur === 'GBp' || cur === 'GBX') return usdRate('GBP').then((r) => r / 100);
    if (FX_USD_BASE.has(cur)) return fetchQuote(cur + 'USD=X').then((q) => q.price || null);
    return fetchQuote(cur + '=X').then((q) => (q.price ? 1 / q.price : null));
  };

  // Market-cap weights in USD for a ticker list. Returns
  // { weights: {t: mcapUSD}, missing: [t...] } — missing = no mcap or no FX.
  const fetchMcapWeights = (tickers) =>
    Promise.all((tickers || []).map((t) =>
      fetchFundamentals(t)
        .then((f) => {
          if (!f.marketCap) return [t, null];
          return usdRate(f.currency).then((r) => [t, r ? f.marketCap * r : null], () => [t, null]);
        }, () => [t, null])
    )).then((pairs) => {
      const weights = {}, missing = [];
      pairs.forEach(([t, m]) => { if (m) weights[t] = m; else missing.push(t); });
      return { weights, missing };
    });

  // ---- global Index Lab templates (management.monitor_templates) ----------
  const fetchTemplates = () => {
    const s = lbcSession();
    if (!s) return Promise.resolve([]);
    return getJson(SB_BASE + '/monitor_templates?select=*&order=desk_id.nullsfirst,name',
      { apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Accept-Profile': 'management' })
      .catch(() => []);
  };
  const saveTemplate = (row) => {
    const s = lbcSession();
    if (!s) return Promise.reject(new Error('no-auth'));
    return fetch(SB_BASE + '/monitor_templates', {
      method: 'POST',
      headers: {
        apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Content-Profile': 'management',
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]),
    }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  };

  // ---- per-user prefs (management.monitor_prefs, RLS own-row) -------------
  // One JSONB doc per user: { indices: [...] }. Server wins over the local
  // cache when a session exists; local keeps working logged-out.
  const fetchPrefs = () => {
    const s = lbcSession();
    if (!s || !s.user || !s.user.id) return Promise.resolve(null);
    return getJson(SB_BASE + '/monitor_prefs?select=doc&user_sub=eq.' + encodeURIComponent(s.user.id),
      { apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Accept-Profile': 'management' })
      .then((rows) => (rows && rows[0] ? rows[0].doc || {} : {}))
      .catch(() => null);
  };
  const savePrefs = (doc) => {
    const s = lbcSession();
    if (!s || !s.user || !s.user.id) return Promise.reject(new Error('no-auth'));
    return fetch(SB_BASE + '/monitor_prefs', {
      method: 'POST',
      headers: {
        apikey: SB_ANON, Authorization: 'Bearer ' + s.token, 'Content-Profile': 'management',
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ user_sub: s.user.id, doc, updated_at: new Date().toISOString() }]),
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

    // memoized geometry — O(n) date index instead of per-point indexOf, and
    // path strings that survive hover re-renders (crosshair must stay cheap).
    const geom = React.useMemo(() => {
      if (!live.length) return null;
      const padL = 46, padR = 12, padT = 10, padB = 22;
      const H = height, W = Math.max(320, w);
      const allDates = [...new Set(live.flatMap((s) => s.points.map((p) => p.date)))].sort();
      const dateIdx = new Map(allDates.map((d, i) => [d, i]));
      let min = Infinity, max = -Infinity;
      live.forEach((s) => s.points.forEach((p) => { if (p.value < min) min = p.value; if (p.value > max) max = p.value; }));
      if (min === max) { min -= 1; max += 1; }
      const vpad = (max - min) * 0.06;
      min -= vpad; max += vpad;
      const x = (d) => padL + ((dateIdx.get(d) || 0) / Math.max(1, allDates.length - 1)) * (W - padL - padR);
      const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
      const paths = live.map((s) => s.points.map((p, i) => (i === 0 ? 'M' : 'L') + x(p.date).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' '));
      return { padL, padR, padT, padB, H, W, allDates, dateIdx, x, y, min, max, paths };
    }, [series, w, height]);

    // click-drag measure: anchor date -> drag date, % move per series.
    // {a, b} are DATES (not indices) so a resize/range change can't corrupt
    // the selection; release pins it, a plain click clears it.
    // Reset is keyed on a DATA fingerprint, not the series array identity —
    // parents rebuild the array every render (quote polls), which would wipe
    // a pinned measurement within seconds.
    const [meas, setMeas] = React.useState(null);
    const dataKey = live.map((s) => s.label + ':' + s.points.length + ':' +
      (s.points[0] || {}).date + ':' + (s.points[s.points.length - 1] || {}).date).join('|');
    React.useEffect(() => { setMeas(null); }, [dataKey]);

    if (!live.length || !geom) return <div ref={wrapRef} className="mon-chart-empty">No data</div>;
    const { padL, padR, padT, padB, H, W, allDates, dateIdx, x, y, min, max, paths } = geom;
    const fmtV = yFmt || ((v) => (Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(Math.abs(v) < 10 ? 2 : 1)));

    // hover + measure
    const dateFromEvent = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, (px - padL) / (W - padL - padR)));
      return allDates[Math.round(frac * (allDates.length - 1))];
    };
    const onMove = (e) => {
      const d = dateFromEvent(e);
      setHover({ date: d });
      setMeas((m) => (m && m.live ? { ...m, b: d } : m));
    };
    const onDown = (e) => {
      e.preventDefault(); // no text selection while dragging
      const d = dateFromEvent(e);
      setMeas({ a: d, b: d, live: true });
    };
    const finishMeas = () => setMeas((m) => {
      if (!m || !m.live) return m;
      return m.a === m.b ? null : { ...m, live: false }; // plain click clears
    });
    const onLeave = () => { setHover(null); finishMeas(); };

    // last value at-or-before the given date (forward-fill, matches basket math)
    const valAt = (s, d) => {
      for (let i = s.points.length - 1; i >= 0; i--) {
        if (s.points[i].date <= d) return s.points[i].value;
      }
      return null;
    };
    const measInfo = meas ? (() => {
      const [d0, d1] = (dateIdx.get(meas.a) || 0) <= (dateIdx.get(meas.b) || 0) ? [meas.a, meas.b] : [meas.b, meas.a];
      if (dateIdx.get(d0) == null || dateIdx.get(d1) == null) return null;
      const rows = live.map((s) => {
        const vA = valAt(s, d0), vB = valAt(s, d1);
        const ok = vA != null && vB != null;
        return {
          label: s.label, color: s.color,
          abs: ok ? vB - vA : null,
          pct: ok && Math.abs(vA) > 1e-9 ? ((vB - vA) / Math.abs(vA)) * 100 : null,
        };
      });
      return { d0, d1, days: (dateIdx.get(d1) || 0) - (dateIdx.get(d0) || 0), rows };
    })() : null;

    const gridN = 4;
    const gridLines = Array.from({ length: gridN + 1 }, (_, i) => min + ((max - min) * i) / gridN);
    const t0 = allDates[0] || '', t1 = allDates[allDates.length - 1] || '';

    return (
      <div ref={wrapRef} className="mon-chart-wrap">
        <svg width={W} height={H} onMouseMove={onMove} onMouseDown={onDown} onMouseUp={finishMeas}
             onMouseLeave={onLeave} style={{ display: 'block', cursor: 'crosshair', userSelect: 'none' }}>
          {measInfo && measInfo.d0 !== measInfo.d1 && (
            <g>
              <rect x={Math.min(x(measInfo.d0), x(measInfo.d1))} y={padT}
                    width={Math.abs(x(measInfo.d1) - x(measInfo.d0))} height={H - padT - padB}
                    fill="rgba(151,170,197,0.10)" />
              <line x1={x(measInfo.d0)} x2={x(measInfo.d0)} y1={padT} y2={H - padB} stroke="rgba(151,170,197,0.55)" strokeWidth="1" strokeDasharray="4 3" />
              <line x1={x(measInfo.d1)} x2={x(measInfo.d1)} y1={padT} y2={H - padB} stroke="rgba(151,170,197,0.55)" strokeWidth="1" strokeDasharray="4 3" />
            </g>
          )}
          {gridLines.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(232,228,217,0.07)" strokeWidth="1" />
              <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-tertiary)" fontFamily="var(--font-mono)">{fmtV(v)}</text>
            </g>
          ))}
          {rebased && min < 100 && max > 100 && (
            <line x1={padL} x2={W - padR} y1={y(100)} y2={y(100)} stroke="rgba(232,228,217,0.22)" strokeWidth="1" strokeDasharray="3 3" />
          )}
          {live.map((s, si) => (
            <path key={si} d={paths[si]} fill="none" stroke={s.color} strokeWidth={si === 0 ? 1.8 : 1.2} opacity={si === 0 ? 1 : 0.8} />
          ))}
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
        {hover && !(meas && meas.live) && (
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
        {!measInfo && <div className="mon-meas-hint">drag on the chart to measure a move</div>}
        {measInfo && measInfo.d0 !== measInfo.d1 && (
          <div className="mon-meas-box">
            <div className="d">
              {measInfo.d0} → {measInfo.d1} <span className="n">({measInfo.days} sessions)</span>
              {!meas.live && <span className="x" onClick={() => setMeas(null)} title="clear measurement">✕</span>}
            </div>
            {measInfo.rows.map((r, i) => (
              <div key={i} className="r">
                <span className="sw" style={{ background: r.color }}></span>
                <span className="l">{r.label}</span>
                <span className={'v ' + (r.pct == null ? '' : r.pct >= 0 ? 'pos' : 'neg')}>
                  {r.pct == null ? (r.abs == null ? '—' : 'Δ ' + fmtV(r.abs)) : (r.pct >= 0 ? '+' : '') + r.pct.toFixed(2) + '%'}
                </span>
              </div>
            ))}
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
    fetchQuote, fetchHistory, fetchFred, fetchDbnomics, fetchBars, fetchLiveIndicators, fetchRoster,
    useVolumeFlow,
    fetchCoverage, saveCoverage, fetchPrefs, savePrefs,
    fetchFundamentals, fetchMcapWeights, fetchTemplates, saveTemplate,
    fetchRegime, useRegime, useDeskSignals,
    useQuotes, useQuote, useHistory, useReturns,
    computeBasket, basketStats, basketCorrelation, overlayStats,
    loadAssign, saveAssign, loadIndices, saveIndices,
    MultiLineChart, MonSpark, downloadCsv, lbcSession,
  };
})();
