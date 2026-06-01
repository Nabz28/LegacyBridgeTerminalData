/* =========================================================================
   INDUSTRY (T3) — core engine. PostgREST helper + formatters + the real
   taxonomy (IDX sectors + commodity-linked industries with demand/supply
   driver mappings) + ML-free analytics ported/adapted from MERIDIAN.

   Data (all REAL, live):
     public.equity_screen      — 636 IDX stocks, sector/sub_sector + fundamentals
     macro.live_indicators     — 230 indicators incl. 75 commodities, FX, rates,
                                 country macro (the demand/supply DRIVERS)
     macro.observations/series — historical driver time series (RICs)

   Exposes window.INDUSTRY (helper + TAXONOMY + analytics) and window.IND
   (shared React atoms). Loads before the industry view scripts.
   Accent = amber #f5a623 (commodities/sectors). Vanilla Babel React.
   ========================================================================= */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const IND_BASE = 'https://adnubucjlezrtusbicja.supabase.co/rest/v1';
  const IND_ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  const session = () => { try { const s = JSON.parse(localStorage.getItem('lbc_auth') || 'null'); return (s && s.token && s.exp && Date.now() < s.exp) ? s : null; } catch { return null; } };
  const tok = () => { const s = session(); return s ? s.token : IND_ANON; };
  const hdr = (schema) => ({ apikey: IND_ANON, Authorization: 'Bearer ' + tok(), 'Accept-Profile': schema });

  // simple sessionStorage cache (5 min) to keep the terminal snappy
  const cacheGet = (k) => { try { const r = JSON.parse(sessionStorage.getItem('ind:' + k) || 'null'); return (r && Date.now() - r.t < 300000) ? r.v : null; } catch { return null; } };
  const cacheSet = (k, v) => { try { sessionStorage.setItem('ind:' + k, JSON.stringify({ t: Date.now(), v })); } catch {} };

  const getCached = (schema, path, key) => {
    const c = cacheGet(key); if (c) return Promise.resolve(c);
    return fetch(IND_BASE + path, { headers: hdr(schema) }).then(r => r.ok ? r.json() : Promise.reject(new Error('industry ' + r.status))).then(v => { cacheSet(key, v); return v; });
  };

  const INDUSTRY = {
    // public.equity_screen — the IDX universe (real fundamentals)
    equity: () => getCached('public', '/equity_screen?select=symbol,yahoo,name,sector,sub_sector,price,change_pct,mcap,pe,pb,ps,ev_ebitda,roe,roa,net_margin,gross_margin,rev_growth,earnings_growth,debt_equity,current_ratio,beta,div_yield,w52_high,w52_low,adv_value,avg_volume&order=mcap.desc&limit=2000', 'equity'),
    // public.equity_screen_global — US large-cap universe (same schema + market,currency)
    usEquity: () => getCached('public', '/equity_screen_global?select=symbol,yahoo,name,sector,sub_sector,price,change_pct,mcap,pe,pb,ps,ev_ebitda,roe,roa,net_margin,gross_margin,rev_growth,earnings_growth,debt_equity,current_ratio,beta,div_yield,w52_high,w52_low,adv_value,avg_volume,market,currency&order=mcap.desc&limit=2000', 'usEquity'),
    // macro.live_indicators — drivers (commodities/fx/rates/country macro)
    indicators: () => getCached('macro', '/live_indicators?select=key,region,category,label,unit,latest_value,prev_value,change_abs,change_pct,spark,tv_symbol,sort_order&order=region,sort_order', 'indic'),
    // historical series for a RIC (driver detail charts)
    obs: (ric, limit) => fetch(IND_BASE + '/observations?ric=eq.' + encodeURIComponent(ric) + '&select=date,value&order=date.desc&limit=' + (limit || 260), { headers: hdr('macro') }).then(r => r.ok ? r.json() : []),
    raw: (schema, path) => fetch(IND_BASE + path, { headers: hdr(schema) }).then(r => r.ok ? r.json() : Promise.reject(new Error('industry ' + r.status))),
    user: () => { const s = session(); return s ? s.user : null; },
  };

  /* ---- formatters ------------------------------------------------------ */
  const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(v);
  const grp = (n, d) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = {
    pct: (v, d) => !isNum(v) ? '—' : (v > 0 ? '+' : '') + grp(v, d == null ? 1 : d) + '%',
    num: (v, d) => !isNum(v) ? '—' : grp(v, d == null ? 2 : d),
    cls: (v) => (v > 0 ? 'in-pos' : v < 0 ? 'in-neg' : 'in-muted'),
    // big IDR market cap (equity_screen mcap is in IDR)
    mcap: (v) => { if (!isNum(v)) return '—'; const a = Math.abs(v); if (a >= 1e12) return grp(v / 1e12, 1) + 'T'; if (a >= 1e9) return grp(v / 1e9, 1) + 'B'; if (a >= 1e6) return grp(v / 1e6, 1) + 'M'; return grp(v, 0); },
    money: (v) => !isNum(v) ? '—' : 'Rp ' + grp(v, 0),
    val: (v, unit) => { if (!isNum(v)) return '—'; const s = grp(v, Math.abs(v) >= 100 ? 0 : 2); return unit ? s + ' ' + unit : s; },
    title: (s) => s ? String(s).split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—',
  };
  INDUSTRY.fmt = fmt;

  /* =====================================================================
     TAXONOMY — the heart. IDX sectors + commodity-linked industries, each
     with DEMAND and SUPPLY drivers wired to REAL live_indicators keys.
     driver: { key, label, upIs:'tailwind'|'headwind'|'mixed', kind:'demand'|'supply'|'macro' }
     idxSector matches public.equity_screen.sector. tickers = curated IDX
     names for commodity-pure plays (used where a sector is broader than the
     theme). region: which lens it belongs to (id | global | us).
     ===================================================================== */
  // D(key, label, upIs, kind, weight, noSeries) — weight default 1; set 2 for primary commodity/rate driver
  // noSeries:true => key is not in verified live_indicators list; UI should show "no series" instead of silent N/A
  const D = (key, label, upIs, kind, weight, noSeries) => ({ key, label, upIs, kind, weight: weight || 1, noSeries: noSeries || false });
  const TAXONOMY = [
    // ---- Commodity-linked Indonesian industries (the "booming sector" drill-downs) ----
    { id: 'coal', name: 'Coal & Mining', idxSector: 'Energy', region: 'id', accent: '#7a6b52',
      thesis: 'Thermal coal exporters levered to Newcastle price + China/India power demand.',
      tickers: ['ADRO', 'PTBA', 'ITMG', 'BUMI', 'INDY', 'HRUM', 'BYAN', 'GEMS', 'DOID', 'ABMM'],
      drivers: [D('wb_coal_au', 'Newcastle Coal', 'tailwind', 'supply', 2), D('bcom', 'Commodity Index', 'tailwind', 'supply', 1), D('natgas', 'Natural Gas (substitute)', 'tailwind', 'supply', 1), D('id_exports', 'ID Exports', 'tailwind', 'demand'), D('id_usdidr_m', 'USD/IDR', 'tailwind', 'macro')] },
    { id: 'nickel', name: 'Nickel & Battery Metals', idxSector: 'Basic Materials', region: 'id', accent: '#9aa7b0',
      thesis: 'Nickel/ferronickel + EV battery supply chain; sensitive to LME nickel + China stainless/EV demand.',
      tickers: ['INCO', 'ANTM', 'NCKL', 'MBMA', 'NICL', 'PSAB'],
      drivers: [D('wb_nickel', 'Nickel (LME)', 'tailwind', 'supply', 2), D('copper', 'Copper (metals proxy)', 'tailwind', 'supply', 1), D('lithium_etf', 'Lithium/Battery', 'mixed', 'demand'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'cpo', name: 'Plantation & CPO', idxSector: 'Consumer Non-Cyclicals', region: 'id', accent: '#c9a227',
      thesis: 'Palm oil planters; CPO price + biodiesel mandate + soybean-oil substitution.',
      tickers: ['AALI', 'LSIP', 'DSNG', 'TAPG', 'SMAR', 'SSMS', 'SGRO', 'TBLA', 'ANJT', 'PALM'],
      drivers: [D('wb_palm_oil', 'Palm Oil (CPO)', 'tailwind', 'supply', 2), D('soybean_oil', 'Soybean Oil (sub)', 'mixed', 'supply'), D('wb_urea', 'Urea Fertilizer (cost)', 'headwind', 'supply'), D('corn', 'Corn (feed cost)', 'headwind', 'supply'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'tin', name: 'Tin', idxSector: 'Basic Materials', region: 'id', accent: '#8c8c94',
      thesis: 'Tin miners levered to LME tin + global electronics/solder demand.',
      tickers: ['TINS', 'PSAB', 'CITA'],
      drivers: [D('wb_tin', 'Tin (LME)', 'tailwind', 'supply', 2), D('copper', 'Copper (metals proxy)', 'tailwind', 'supply'), D('cn_ip_yoy', 'China Ind. Production', 'tailwind', 'demand'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'oilgas', name: 'Oil & Gas', idxSector: 'Energy', region: 'id', accent: '#5a8f6b',
      thesis: 'Upstream/midstream oil & gas; crude + LNG price exposure.',
      tickers: ['MEDC', 'PGAS', 'ENRG', 'ELSA', 'AKRA', 'RAJA'],
      drivers: [D('wti', 'WTI Crude', 'tailwind', 'supply'), D('brent', 'Brent Crude', 'tailwind', 'supply'), D('wb_lng_jp', 'LNG (Japan)', 'tailwind', 'supply'), D('natgas', 'Natural Gas', 'mixed', 'supply')] },
    { id: 'goldmetal', name: 'Gold & Precious', idxSector: 'Basic Materials', region: 'id', accent: '#d4af37',
      thesis: 'Gold miners; bullion price + real-rate / risk regime.',
      tickers: ['MDKA', 'ANTM', 'ARCI', 'BRMS', 'UNTR'],
      drivers: [D('gold', 'Gold', 'tailwind', 'supply', 2), D('copper', 'Copper', 'mixed', 'supply'), D('aluminum', 'Aluminum', 'mixed', 'supply'), D('dxy', 'DXY (USD strength)', 'headwind', 'macro')] },
    // ---- Broad IDX sectors (the sector grid) ----
    { id: 'banks', name: 'Banks & Financials', idxSector: 'Financials', region: 'id', accent: '#4f86e0',
      thesis: 'Indonesian banks; NIM expands with policy rate, credit growth drives volume.',
      drivers: [D('id_bi_rate', 'BI Policy Rate', 'tailwind', 'macro'), D('id_lending_rate', 'Lending Rate', 'tailwind', 'macro'), D('id_bank_credit', 'Bank Credit Growth', 'tailwind', 'demand'), D('id_interbank_3m', '3M Interbank', 'mixed', 'macro')] },
    { id: 'property', name: 'Property & Real Estate', idxSector: 'Properties & Real Estate', region: 'id', accent: '#b06ad6',
      thesis: 'Developers; mortgage rates (BI) drive affordability, credit growth drives demand.',
      drivers: [D('id_bi_rate', 'BI Policy Rate', 'headwind', 'macro'), D('id_lending_rate', 'Mortgage/Lending Rate', 'headwind', 'macro'), D('id_bank_credit', 'Bank Credit Growth', 'tailwind', 'demand'), D('steel_hrc', 'Steel (cost)', 'headwind', 'supply')] },
    { id: 'consumer', name: 'Consumer', idxSector: 'Consumer Cyclicals', region: 'id', accent: '#e08a4f',
      thesis: 'Discretionary + retail; purchasing power (CPI, FX) and credit drive spend.',
      drivers: [D('id_cpi_yoy', 'CPI Inflation', 'headwind', 'macro'), D('id_usdidr_m', 'USD/IDR', 'headwind', 'macro'), D('id_bank_credit', 'Consumer Credit', 'tailwind', 'demand')] },
    { id: 'staples', name: 'Consumer Staples', idxSector: 'Consumer Non-Cyclicals', region: 'id', accent: '#6bbf8a',
      thesis: 'Defensive staples; input costs (food/ag commodities) + domestic demand.',
      drivers: [D('sugar', 'Sugar (cost)', 'headwind', 'supply'), D('wheat', 'Wheat (cost)', 'headwind', 'supply'), D('id_cpi_yoy', 'CPI', 'mixed', 'macro')] },
    { id: 'tech', name: 'Technology', idxSector: 'Technology', region: 'id', accent: '#5fd6d6',
      thesis: 'IDX tech/digital; rate-sensitive duration + funding + FX for hardware.',
      drivers: [D('id_bi_rate', 'BI Rate', 'headwind', 'macro'), D('id_usdidr_m', 'USD/IDR', 'headwind', 'macro')] },
    { id: 'health', name: 'Healthcare', idxSector: 'Healthcare', region: 'id', accent: '#7fb6ff',
      thesis: 'Hospitals/pharma; defensive, demographics + import costs (FX) for inputs.',
      drivers: [D('id_usdidr_m', 'USD/IDR (imports)', 'headwind', 'macro'), D('id_cpi_yoy', 'CPI', 'mixed', 'macro')] },
    { id: 'industrials', name: 'Industrials', idxSector: 'Industrials', region: 'id', accent: '#a0a0b0',
      thesis: 'Heavy equipment/manufacturing; capex cycle + metals input + exports.',
      drivers: [D('cn_pmi_mfg', 'China PMI Mfg (demand)', 'tailwind', 'demand'), D('steel_hrc', 'Steel (input)', 'headwind', 'supply'), D('iron_ore', 'Iron Ore', 'mixed', 'supply'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'infra', name: 'Infrastructure', idxSector: 'Infrastructure', region: 'id', accent: '#8aa0c0',
      thesis: 'Toll/construction/utilities; govt capex + financing cost.',
      drivers: [D('id_bi_rate', 'Financing Cost', 'headwind', 'macro'), D('steel_hrc', 'Steel (cost)', 'headwind', 'supply'), D('cn_pmi_mfg', 'China PMI (demand signal)', 'tailwind', 'demand')] },
    { id: 'transport', name: 'Transport & Logistics', idxSector: 'Transportation & Logistics', region: 'id', accent: '#c0a0c0',
      thesis: 'Shippers/airlines/logistics; fuel cost vs trade volume.',
      drivers: [D('brent', 'Brent (fuel cost)', 'headwind', 'supply'), D('wti', 'WTI (fuel cost)', 'headwind', 'supply'), D('id_exports', 'Trade Volume', 'tailwind', 'demand'), D('id_imports', 'Imports', 'tailwind', 'demand')] },
  ];
  INDUSTRY.TAXONOMY = TAXONOMY;
  // commodity tiles for the landing strip (key -> display)
  INDUSTRY.COMMODITY_TILES = ['wti', 'brent', 'wb_coal_au', 'wb_nickel', 'wb_palm_oil', 'wb_tin', 'gold', 'copper', 'iron_ore', 'natgas'];
  INDUSTRY.REGIONS = [{ id: 'id', label: 'Indonesia' }, { id: 'global', label: 'Global' }, { id: 'us', label: 'US' }];

  /* =====================================================================
     ANALYTICS (ML-free, ported/adapted from MERIDIAN to snapshot data).
     equity_screen is a daily snapshot (change_pct = 1D, no per-ticker
     history), so conviction uses breadth + avg/mcap-weighted 1D move +
     a quality/valuation tilt. Historical per-ticker 7d/30d is a later add
     (needs a price-history table); driver series DO have history (obs/spark).
     ===================================================================== */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const median = (arr) => { const a = arr.filter(isNum).map(Number).sort((x, y) => x - y); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const mean = (arr) => { const a = arr.filter(isNum).map(Number); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };

  const analytics = {
    // tickers for an industry: by curated list if present, else all in its idxSector
    tickersFor: (ind, equity) => {
      if (ind.tickers && ind.tickers.length) { const set = new Set(ind.tickers); return equity.filter(e => set.has(e.symbol)); }
      return equity.filter(e => e.sector === ind.idxSector);
    },
    // sector snapshot: breadth (up/flat/down separate), avg + mcap-weighted 1D, valuation medians
    snapshot: (rows) => {
      if (!rows || !rows.length) return { n: 0, up: 0, flat: 0, down: 0, nullChg: 0, breadth: 0, avgChg: null, mcapChg: null, mcap: 0, medPE: null, medROE: null, medGrowth: null, beta: null };
      const n = rows.length;
      // PostgREST returns numeric columns as strings — coerce everywhere
      const up   = rows.filter(r => r.change_pct != null && Number(r.change_pct) > 0).length;
      const flat  = rows.filter(r => r.change_pct != null && Number(r.change_pct) === 0).length;
      const down  = rows.filter(r => r.change_pct != null && Number(r.change_pct) < 0).length;
      // breadth: up counts full, flat counts half, nulls excluded from denominator
      const counted = up + flat + down;
      const breadth = counted ? (up + flat * 0.5) / counted : 0;
      // avg and mcapChg: coerce strings → numbers, skip nulls
      const avg = mean(rows.filter(r => r.change_pct != null).map(r => Number(r.change_pct)));
      const totMcap = rows.reduce((s, r) => s + (Number(r.mcap) || 0), 0);
      const mcapW = totMcap
        ? rows.reduce((s, r) => r.change_pct != null ? s + Number(r.change_pct) * (Number(r.mcap) || 0) : s, 0) / totMcap
        : avg;
      // median: coerce field values to numbers before passing to median()
      // beta: mean of constituent betas (skip nulls) — for the β pill on sector cards
      const betaMean = mean(rows.filter(r => isNum(r.beta)).map(r => Number(r.beta)));
      return { n, up, flat, down, nullChg: n - counted, breadth, avgChg: avg, mcapChg: mcapW, mcap: totMcap,
        medPE: median(rows.map(r => Number(r.pe))), medROE: median(rows.map(r => Number(r.roe))), medGrowth: median(rows.map(r => Number(r.earnings_growth))),
        beta: betaMean };
    },
    // conviction 0-100: centered 50.
    // Weights: driver tilt ±30 (CEO priority), 1D mcap move ±20, breadth ±14, quality ±6.
    // Max swing from 50 = ±70, clamped to [0,100]. Labeled '1D Signal' (equity_screen is 1D snapshot).
    // New fields in return: signalLabel, driverNet (raw weightedNet for views).
    conviction: (snap, tilt) => {
      if (!snap || !snap.n) return { score: 50, signalLabel: '1D Signal', driverNet: 0 };
      const mv = clamp((snap.mcapChg != null ? Number(snap.mcapChg) : 0) / 3, -1, 1) * 20; // 1D mcap-wtd move (±20)
      const br = clamp((snap.breadth - 0.5) * 2, -1, 1) * 14;          // breadth ±14
      const q = snap.medROE != null ? clamp((Number(snap.medROE) - 10) / 15, -1, 1) * 6 : 0; // quality tilt ±6
      // driver tilt ±30: CEO #1 priority — use weightedNet [-1,+1]
      const wn = (tilt && tilt.weightedNet != null) ? tilt.weightedNet : (tilt && tilt.net != null ? tilt.net : 0);
      const dv = clamp(wn, -1, 1) * 30;
      const score = Math.round(clamp(50 + mv + br + q + dv, 0, 100));
      return { score, signalLabel: '1D Signal', driverNet: wn };
    },
    // Backward-compat: views that called conviction() and used the result as a number directly.
    // They should read .score; this helper unwraps it so existing numeric comparisons still work.
    convictionScore: (snap, tilt) => {
      const r = analytics.conviction(snap, tilt);
      return typeof r === 'object' ? r.score : r;
    },
    status: (conv, snap) => {
      // conv may be a number (legacy) or the new {score, signalLabel, driverNet} object
      const score = (conv && typeof conv === 'object') ? conv.score : (conv != null ? Number(conv) : 50);
      const chg = snap.mcapChg != null ? Number(snap.mcapChg) : 0;
      if (score >= 65 && chg > 0) return 'BULLISH';
      if (score <= 35 && chg < 0) return 'BEARISH';
      if ((snap.breadth > 0.55) !== (chg > 0)) return 'ROTATION';
      return 'NEUTRAL';
    },
    // driver posture from live_indicators change_pct + the driver's upIs.
    // If change_pct is null/missing, derive from prev_value/latest_value if both present;
    // else posture='n/a' with chgMissing:true (never silently treated as neutral/0).
    posture: (driver, indByKey) => {
      // noSeries drivers are intentionally absent from live_indicators — show "no series" explicitly
      if (driver.noSeries) return { driver, found: false, noSeries: true, chg: null, posture: 'n/a' };
      const ind = indByKey[driver.key];
      if (!ind) return { driver, found: false, chg: null, posture: 'n/a' };
      let chg = ind.change_pct;
      let chgMissing = false;
      if (chg == null) {
        const lv = ind.latest_value, pv = ind.prev_value;
        if (isNum(lv) && isNum(pv) && Number(pv) !== 0) {
          chg = ((Number(lv) - Number(pv)) / Math.abs(Number(pv))) * 100;
        } else {
          chgMissing = true;
        }
      }
      if (chgMissing) {
        return { driver, found: true, chg: null, chgMissing: true, value: ind.latest_value, unit: ind.unit, label: ind.label || driver.label, spark: ind.spark, tv: ind.tv_symbol, posture: 'n/a' };
      }
      const chgN = Number(chg);
      let posture = 'neutral';
      if (Math.abs(chgN) > 0.2) {
        const rising = chgN > 0;
        if (driver.upIs === 'tailwind') posture = rising ? 'tailwind' : 'headwind';
        else if (driver.upIs === 'headwind') posture = rising ? 'headwind' : 'tailwind';
        else posture = 'mixed';
      }
      return { driver, found: true, chg: chgN, value: ind.latest_value, unit: ind.unit, label: ind.label || driver.label, spark: ind.spark, tv: ind.tv_symbol, posture };
    },
    // net driver tilt for an industry. Returns null net when no drivers resolve.
    // Includes weighted net: (sum tailwind weights - sum headwind weights) / sum weights.
    driverTilt: (ind, indByKey) => {
      const ps = (ind.drivers || []).map(d => analytics.posture(d, indByKey)).filter(p => p.found && p.posture !== 'n/a');
      if (ps.length === 0) return { net: null, weightedNet: null, tail: 0, head: 0, postures: [] };
      const t = ps.filter(p => p.posture === 'tailwind').length;
      const h = ps.filter(p => p.posture === 'headwind').length;
      const tot = ps.length;
      const net = (t - h) / tot;
      // weighted net
      let wTail = 0, wHead = 0, wTot = 0;
      ps.forEach(p => {
        const w = (p.driver && p.driver.weight) ? p.driver.weight : 1;
        wTot += w;
        if (p.posture === 'tailwind') wTail += w;
        else if (p.posture === 'headwind') wHead += w;
      });
      const weightedNet = wTot ? (wTail - wHead) / wTot : 0;
      return { net, weightedNet, tail: t, head: h, postures: ps };
    },
    // 6-dimension competitive score for a ticker within its peer set (0-100)
    // Macro 15 / Industry 15 / Technical 20 (proxied by 1D + 52w pos) /
    // Fundamental 20 / Valuation 15 / Risk 15. Peer-relative.
    //
    // TICKER-LEVEL Industry dim: ticker's 1D change vs sector-average change (not uniform sector conviction).
    // TICKER-LEVEL Macro dim: derived from ticker's beta (market/rate sensitivity) + debt_equity
    //   (rate/refinancing sensitivity) + sub_sector commodity/FX exposure tag.
    //   This ensures peers in the same sector differ on these two dims (30% no longer uniform).
    //
    // ctx: { peerMed, sectorAvgChg, driverNet }
    //   peerMed: {pe,pb,roe,net_margin,rev_growth,...} — medians across peer set
    //   sectorAvgChg: mean change_pct of all peers (for ticker-level Industry dim)
    //   driverNet: sector-level weightedNet [-1,+1] (baseline macro direction)
    competitive: (row, peers, ctx) => {
      const peerMed = ctx.peerMed;
      const sc = {};

      // --- Valuation: cheaper than peers = higher (PE, PB, EV/EBITDA) ---
      // Non-positive multiple (<=0) = distress penalty. PostgREST returns strings — coerce.
      const valBits = [['pe', row.pe, peerMed.pe], ['pb', row.pb, peerMed.pb], ['ev_ebitda', row.ev_ebitda, peerMed.ev_ebitda]];
      let val = 0, valN = 0;
      valBits.forEach(([, v, m]) => {
        if (!isNum(v)) return;
        const nv = Number(v), nm = Number(m);
        valN++;
        if (nv <= 0) {
          val += 22; // distress penalty
        } else if (isNum(m) && nm > 0) {
          val += clamp(50 + (nm - nv) / nm * 60, 0, 100);
        } else {
          val += 50; // peer median missing, no signal
        }
      });
      sc.valuation = valN ? val / valN : 50;

      // --- Fundamental: ROE, margins, growth vs peers ---
      const fBits = [['roe', row.roe, peerMed.roe], ['net_margin', row.net_margin, peerMed.net_margin], ['rev_growth', row.rev_growth, peerMed.rev_growth]];
      let fu = 0, fn = 0;
      fBits.forEach(([, v, m]) => {
        if (isNum(v) && isNum(m)) { fu += clamp(50 + (Number(v) - Number(m)) * 2, 0, 100); fn++; }
      });
      sc.fundamental = fn ? fu / fn : 50;

      // --- Technical: 1D change + 52w position ---
      const chgPct = isNum(row.change_pct) ? Number(row.change_pct) : 0;
      const price = Number(row.price);
      const w52h = Number(row.w52_high), w52l = Number(row.w52_low);
      let tech = 50;
      if (isNum(row.change_pct)) tech += clamp(chgPct * 4, -20, 20);
      if (isNum(row.price) && isNum(row.w52_high) && isNum(row.w52_low) && w52h > w52l) {
        tech += (((price - w52l) / (w52h - w52l)) - 0.5) * 30;
      }
      sc.technical = clamp(tech, 0, 100);

      // --- Risk: lower beta + lower D/E = safer ---
      const betaV = isNum(row.beta) ? Number(row.beta) : null;
      const deV = isNum(row.debt_equity) ? Number(row.debt_equity) : null;
      let rk = 50;
      if (betaV != null) rk += clamp((1.1 - betaV) * 25, -20, 20);
      if (deV != null) rk += clamp((1 - deV) * 12, -15, 15);
      sc.risk = clamp(rk, 0, 100);

      // --- Industry dim: TICKER-LEVEL — ticker RS vs sector mean change ---
      // sectorAvgChg: mean change_pct of peers. Ticker above = outperforming the group.
      const sectorAvg = (ctx.sectorAvgChg != null && isNum(ctx.sectorAvgChg)) ? Number(ctx.sectorAvgChg) : null;
      if (sectorAvg != null && isNum(row.change_pct)) {
        const relChg = Number(row.change_pct) - sectorAvg; // pp above/below peer mean
        sc.industry = clamp(50 + relChg * 8, 0, 100); // ±1pp = ±8 pts, ±6pp = full range
      } else {
        sc.industry = 50; // no peer data — neutral
      }

      // --- Macro dim: TICKER-LEVEL — sensitivity to rate/FX/commodity environment ---
      // Combine: sector driverNet direction × ticker's beta (market sensitivity)
      // + rate-sensitivity adjustment from D/E (high D/E = more hurt by high rates)
      // This means two peers in the same sector differ if their beta/D/E differ.
      const driverNet = (ctx.driverNet != null && isNum(ctx.driverNet)) ? Number(ctx.driverNet) : 0;
      let macro = 50;
      // Beta sensitivity: high beta amplifies the sector's driver direction
      if (betaV != null) {
        // driverNet > 0 (tailwind): high beta is a boost; driverNet < 0 (headwind): high beta = more hurt
        macro += clamp(driverNet * betaV * 20, -18, 18);
      } else {
        macro += clamp(driverNet * 15, -15, 15); // no beta → use sector signal at lower weight
      }
      // Rate sensitivity: high D/E is hurt when BI rate is rising (driverNet headwind via rate drivers)
      // Approximate: if driverNet < 0 and D/E high → extra penalty
      if (deV != null && driverNet < -0.1) {
        macro += clamp(driverNet * deV * 8, -10, 0); // only penalty direction
      }
      sc.macro = clamp(macro, 0, 100);

      const total = sc.macro * 0.15 + sc.industry * 0.15 + sc.technical * 0.20 + sc.fundamental * 0.20 + sc.valuation * 0.15 + sc.risk * 0.15;
      let verdict = 'HOLD';
      if (total >= 72) verdict = 'STRONG_BUY';
      else if (total >= 62) verdict = 'BUY';
      else if (total >= 52) verdict = 'ACCUMULATE';
      else if (total >= 42) verdict = 'HOLD';
      else if (total >= 32) verdict = 'REDUCE';
      else verdict = 'AVOID';
      return { dims: sc, total: Math.round(total), verdict };
    },
    // business-cycle phase for INDONESIA — uses ID-domestic signals only (no US yield spread).
    // THREE VOTES:
    //   1. BI rate trend: change_abs > 0 => tightening (-1), < 0 => easing (+1), null => skip.
    //   2. CPI vs Bank Indonesia upper band 3.5%: id_cpi_yoy >= 3.5 => above-band (-1), else (+1).
    //   3. China demand / growth: cn_pmi_mfg latest_value >= 50 => expansionary (+1), else (-1).
    // Requires >=2 usable votes or returns phase='Insufficient data'.
    // Returns {phase, favored, note, infl, biRate, cnPmi, rateRising, confidence, votes, totalVotes}.
    cyclePhase: (indByKey) => {
      const bi = indByKey['id_bi_rate'];
      const cpi = indByKey['id_cpi_yoy'];
      const cnPmiInd = indByKey['cn_pmi_mfg'];

      // Vote 1: BI rate direction — guard null change_abs (not available for all snapshots)
      const biChgAbs = (bi && bi.change_abs != null && isNum(bi.change_abs)) ? Number(bi.change_abs) : null;
      const rateRising = biChgAbs != null ? (biChgAbs > 0 ? true : biChgAbs < 0 ? false : null) : null;

      // Vote 2: CPI vs BI 3.5% upper target band (NOT 4%)
      const infl = (cpi && isNum(cpi.latest_value)) ? Number(cpi.latest_value) : null;
      const biRate = (bi && isNum(bi.latest_value)) ? Number(bi.latest_value) : null;

      // Vote 3: China PMI manufacturing >= 50 => expansion demand signal
      const cnPmi = (cnPmiInd && isNum(cnPmiInd.latest_value)) ? Number(cnPmiInd.latest_value) : null;

      // Tally votes
      let votes = 0, totalVotes = 0;
      if (rateRising != null) {
        totalVotes++;
        votes += rateRising ? -1 : 1; // easing = expansion signal
      }
      if (infl != null) {
        totalVotes++;
        votes += (infl >= 3.5) ? -1 : 1; // above BI upper band = inflationary pressure
      }
      if (cnPmi != null) {
        totalVotes++;
        votes += (cnPmi >= 50) ? 1 : -1; // PMI >= 50 = China demand expanding
      }

      // Require at least 2 votes to render a confident phase
      if (totalVotes < 2) {
        return { phase: 'Insufficient data', favored: [], note: 'Fewer than 2 domestic cycle signals available — cannot determine phase.', infl, biRate, cnPmi, rateRising, confidence: 'none', votes, totalVotes };
      }

      const confidence = totalVotes === 3 ? 'high' : 'medium';
      const score = votes / totalVotes; // -1 to +1

      let phase, favored, note;
      if (infl != null && infl >= 3.5 && rateRising === true) {
        // Tightening cycle into above-band inflation
        phase = 'Slowdown / Tightening';
        favored = ['staples', 'health', 'coal', 'oilgas', 'goldmetal'];
        note = 'BI tightening into above-band CPI (' + infl.toFixed(1) + '% ≥ 3.5%). Defensives + commodity exporters favored.';
      } else if (score <= -0.33 && rateRising === false) {
        // Easing but still weak demand
        phase = 'Recovery / Early Expansion';
        favored = ['property', 'consumer', 'banks', 'tech'];
        note = 'BI easing with CPI within band — early-cycle rate sensitives favored.';
      } else if (score >= 0.33 && cnPmi != null && cnPmi >= 50) {
        // Strong expansion signals + China demand
        phase = 'Expansion';
        favored = ['banks', 'industrials', 'consumer', 'nickel', 'coal'];
        note = 'Domestic easing with China PMI ' + cnPmi.toFixed(1) + ' (above 50) — cyclicals and financials favored.';
      } else if (score <= -0.33) {
        // Multiple contraction signals
        phase = 'Contraction Bias';
        favored = ['staples', 'health', 'goldmetal'];
        note = 'Multiple domestic headwinds — defensives favored.';
      } else {
        // Mixed signals
        phase = 'Late Expansion / Mixed';
        favored = ['banks', 'coal', 'nickel', 'industrials'];
        note = 'Mixed cycle signals — financials and commodity plays remain supported.';
      }
      return { phase, favored, note, infl, biRate, cnPmi, rateRising, confidence, votes, totalVotes };
    },
    // computed "kesimpulan" (conclusion) — rule-based and conditional, not a static template.
    // Combines: RS vs IHSG direction, breadth, driver net posture + primary driver direction,
    // valuation signal, and ends with a forward Watch / Lean line.
    // conv may be a number or {score,signalLabel,driverNet} object.
    kesimpulan: (ind, snap, conv, status, tilt, indByKey) => {
      const convScore = (conv && typeof conv === 'object') ? conv.score : (conv != null ? Number(conv) : 50);

      // 1. RS vs IHSG framing
      const rs = (indByKey && analytics.rsVsMarket) ? analytics.rsVsMarket(snap, indByKey) : null;
      let rsLine;
      if (rs == null) {
        rsLine = status === 'BULLISH' ? ind.name + ' is outperforming the broader market today' :
                 status === 'BEARISH' ? ind.name + ' is underperforming' : ind.name + ' is moving in line with the market';
      } else if (rs > 0.3) {
        rsLine = ind.name + ' is leading IHSG by ' + fmt.pct(rs) + ' today';
      } else if (rs < -0.3) {
        rsLine = ind.name + ' is lagging IHSG by ' + fmt.pct(Math.abs(rs)) + ' today';
      } else {
        rsLine = ind.name + ' is tracking IHSG closely (' + fmt.pct(rs) + ' relative)';
      }

      // 2. Breadth description (vary wording by level)
      const br = Math.round((snap.breadth || 0) * 100);
      let breadthLine;
      if (!snap.n) {
        breadthLine = 'no tickers matched';
      } else if (br >= 70) {
        breadthLine = 'Broad participation: ' + snap.up + '/' + snap.n + ' names advancing (' + br + '% breadth), cap-weighted ' + fmt.pct(snap.mcapChg);
      } else if (br >= 50) {
        breadthLine = 'Mild advance: ' + snap.up + '/' + snap.n + ' names up (' + br + '% breadth), cap-weighted ' + fmt.pct(snap.mcapChg);
      } else if (br >= 30) {
        breadthLine = 'Narrow or mixed: only ' + snap.up + '/' + snap.n + ' up (' + br + '% breadth), cap-weighted ' + fmt.pct(snap.mcapChg);
      } else {
        breadthLine = 'Broad retreat: only ' + snap.up + '/' + snap.n + ' names holding (' + br + '% breadth), cap-weighted ' + fmt.pct(snap.mcapChg);
      }

      // 3. Driver net posture WITH primary driver direction (not just count)
      let drvLine;
      if (!tilt || tilt.net == null) {
        drvLine = 'Driver data unavailable.';
      } else {
        // find primary driver (highest weight) in postures
        const primaryPosture = tilt.postures && tilt.postures.length
          ? tilt.postures.reduce((best, p) => ((p.driver && p.driver.weight || 1) > (best.driver && best.driver.weight || 1)) ? p : best, tilt.postures[0])
          : null;
        let primaryNote = '';
        if (primaryPosture) {
          const primChg = primaryPosture.chg;
          const primLabel = primaryPosture.label || primaryPosture.driver.label;
          if (primChg != null && Math.abs(primChg) > 0.5) {
            const dir = primChg > 0 ? 'rising' : 'falling';
            const mag = Math.abs(primChg) > 5 ? ' sharply' : Math.abs(primChg) > 2 ? ' moderately' : '';
            // check if it's at a peak-like level (change falling from positive territory)
            const fromPeak = primChg < 0 && isNum(primaryPosture.value) && Number(primaryPosture.value) > 0
              ? ' from recent highs' : '';
            primaryNote = primLabel + ' is ' + dir + mag + fromPeak + ' (' + fmt.pct(primChg) + ')';
          }
        }
        if (tilt.weightedNet > 0.2) {
          drvLine = 'Supply/demand drivers are a net tailwind — ' + tilt.tail + ' tailwind vs ' + tilt.head + ' headwind' +
            (primaryNote ? '; ' + primaryNote : '') + '.';
        } else if (tilt.weightedNet < -0.2) {
          drvLine = 'Drivers are a net headwind — ' + tilt.head + ' headwind vs ' + tilt.tail + ' tailwind' +
            (primaryNote ? '; ' + primaryNote : '') + '.';
        } else {
          drvLine = 'Drivers are balanced (' + tilt.tail + ' tailwind / ' + tilt.head + ' headwind)' +
            (primaryNote ? '; ' + primaryNote : '') + '.';
        }
      }

      // 4. Valuation signal (varies: cheap/fair/stretched vs peers)
      let valLine = '';
      if (snap.medPE != null && isNum(snap.medPE) && Number(snap.medPE) > 0) {
        const pe = Number(snap.medPE);
        if (pe < 10) valLine = 'Sector trades at ' + fmt.num(pe, 1) + 'x earnings — deeply discounted vs typical market multiples.';
        else if (pe < 15) valLine = 'Median PE of ' + fmt.num(pe, 1) + 'x suggests reasonable value.';
        else if (pe < 25) valLine = 'Median PE ' + fmt.num(pe, 1) + 'x — fairly priced; earnings delivery matters.';
        else valLine = 'Stretched valuation at ' + fmt.num(pe, 1) + 'x PE; priced for growth continuation.';
      }

      // 5. Forward Watch / Lean line (conditional on conviction + driver + status)
      let forwardLine;
      if (convScore >= 65 && tilt && tilt.weightedNet > 0.15) {
        forwardLine = 'Lean: constructive — drivers and price action align; consider accumulating leaders on pullbacks.';
      } else if (convScore <= 35 && tilt && tilt.weightedNet < -0.15) {
        forwardLine = 'Watch: defensive posture warranted — await driver stabilization before adding exposure.';
      } else if (status === 'ROTATION') {
        forwardLine = 'Watch: rotation underway — breadth and price diverge; monitor which sub-sectors are leading.';
      } else if (convScore >= 55) {
        forwardLine = 'Lean: mildly constructive — hold positions; wait for driver confirmation to add.';
      } else if (convScore <= 45) {
        forwardLine = 'Watch: neutral-to-cautious — no strong edge; reduce overweights if drivers deteriorate.';
      } else {
        forwardLine = 'Watch: mixed signals — maintain market-weight; reassess on next driver or macro update.';
      }

      const parts = [rsLine + '.', breadthLine + '.', drvLine, valLine, forwardLine].filter(Boolean);
      return parts.join(' ');
    },
    // relative strength vs IHSG: sector mcap-weighted 1D change minus IHSG 1D.
    // Primary key: 'jci' (Jakarta Composite, daily equity index — verified live).
    // Fallback: 'id_share_price' (monthly FRED proxy — coarser, less ideal).
    // Returns a number (percentage points) or null if either side is missing.
    rsVsMarket: (snap, indByKey) => {
      const ihsgInd = indByKey['jci'] || indByKey['id_share_price'];
      // PostgREST returns change_pct as string — coerce
      const ihsgChg = (ihsgInd && ihsgInd.change_pct != null && isNum(ihsgInd.change_pct)) ? Number(ihsgInd.change_pct) : null;
      if (ihsgChg == null) return null;
      if (snap == null || snap.mcapChg == null) return null;
      return Number(snap.mcapChg) - ihsgChg;
    },
    // Expose the resolved IHSG change_pct for views that need the raw market level.
    ihsgChg: (indByKey) => {
      const ihsgInd = indByKey['jci'] || indByKey['id_share_price'];
      return (ihsgInd && ihsgInd.change_pct != null && isNum(ihsgInd.change_pct)) ? Number(ihsgInd.change_pct) : null;
    },
  };
  INDUSTRY.an = analytics;
  window.INDUSTRY = INDUSTRY;

  /* =====================================================================
     Shared atoms (window.IND)
     ===================================================================== */
  const h = React.createElement;
  const Spark = ({ data, w, ht, color }) => {
    const pts = (data || []).map(p => (typeof p === 'object' ? (p.v != null ? p.v : p.value) : p)).filter(isNum);
    if (pts.length < 2) return null;
    const W = w || 90, H = ht || 26, min = Math.min(...pts), max = Math.max(...pts), rng = (max - min) || 1;
    const d = pts.map((v, i) => (i / (pts.length - 1) * W) + ',' + (H - ((v - min) / rng) * H)).join(' ');
    const c = color || (pts[pts.length - 1] >= pts[0] ? 'var(--pos,#19c37d)' : 'var(--neg,#ff5c70)');
    return h('svg', { width: W, height: H, style: { display: 'block' } }, h('polyline', { points: d, fill: 'none', stroke: c, strokeWidth: 1.5 }));
  };
  function Spinner({ label }) { return h('div', { className: 'in-loading' }, h('span', { className: 'in-spin' }), label || 'Loading…'); }
  function Empty({ title, sub }) { return h('div', { className: 'in-empty' }, h('div', { className: 'in-empty-t' }, title || 'No data'), sub ? h('div', { className: 'in-empty-s' }, sub) : null); }
  function useToast() { const [t, setT] = useState(null); const push = useCallback((m, e) => { setT({ m, e }); setTimeout(() => setT(null), 3000); }, []); const node = t ? h('div', { className: 'in-toast' + (t.e ? ' err' : '') }, t.m) : null; return [node, push]; }
  function Modal({ title, onClose, children, wide }) {
    useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose && onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    return h('div', { className: 'in-modal-bg', onMouseDown: (e) => { if (e.target === e.currentTarget) onClose && onClose(); } },
      h('div', { className: 'in-modal' + (wide ? ' wide' : '') },
        h('div', { className: 'in-modal-h' }, h('div', { className: 'in-modal-title' }, title), h('button', { className: 'in-x', onClick: onClose }, '×')),
        h('div', { className: 'in-modal-body' }, children)));
  }
  window.IND = { h, Spark, Spinner, Empty, useToast, Modal, fmt };
})();
