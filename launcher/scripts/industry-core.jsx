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
  const D = (key, label, upIs, kind) => ({ key, label, upIs, kind });
  const TAXONOMY = [
    // ---- Commodity-linked Indonesian industries (the "booming sector" drill-downs) ----
    { id: 'coal', name: 'Coal & Mining', idxSector: 'Energy', region: 'id', accent: '#7a6b52',
      thesis: 'Thermal coal exporters levered to Newcastle price + China/India power demand.',
      tickers: ['ADRO', 'PTBA', 'ITMG', 'BUMI', 'INDY', 'HRUM', 'BYAN', 'GEMS', 'DOID', 'ABMM'],
      drivers: [D('wb_coal_au', 'Newcastle Coal', 'tailwind', 'supply'), D('wb_idx_energy', 'Energy Index', 'tailwind', 'supply'), D('id_exports', 'ID Exports', 'tailwind', 'demand'), D('id_usdidr_m', 'USD/IDR', 'tailwind', 'macro')] },
    { id: 'nickel', name: 'Nickel & Battery Metals', idxSector: 'Basic Materials', region: 'id', accent: '#9aa7b0',
      thesis: 'Nickel/ferronickel + EV battery supply chain; sensitive to LME nickel + China stainless/EV demand.',
      tickers: ['INCO', 'ANTM', 'NCKL', 'MBMA', 'NICL', 'PSAB'],
      drivers: [D('wb_nickel', 'Nickel (LME)', 'tailwind', 'supply'), D('wb_idx_metals', 'Metals Index', 'tailwind', 'supply'), D('lithium_etf', 'Lithium/Battery', 'mixed', 'demand'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'cpo', name: 'Plantation & CPO', idxSector: 'Consumer Non-Cyclicals', region: 'id', accent: '#c9a227',
      thesis: 'Palm oil planters; CPO price + biodiesel mandate + soybean-oil substitution.',
      tickers: ['AALI', 'LSIP', 'DSNG', 'TAPG', 'SMAR', 'SSMS', 'SGRO', 'TBLA', 'ANJT', 'PALM'],
      drivers: [D('wb_palm_oil', 'Palm Oil', 'tailwind', 'supply'), D('soybean_oil', 'Soybean Oil (sub)', 'mixed', 'supply'), D('wb_idx_food', 'Food Index', 'tailwind', 'demand'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'tin', name: 'Tin', idxSector: 'Basic Materials', region: 'id', accent: '#8c8c94',
      thesis: 'Tin miners levered to LME tin + global electronics/solder demand.',
      tickers: ['TINS', 'PSAB', 'CITA'],
      drivers: [D('wb_tin', 'Tin (LME)', 'tailwind', 'supply'), D('wb_idx_metals', 'Metals Index', 'tailwind', 'supply'), D('id_exports', 'ID Exports', 'tailwind', 'demand')] },
    { id: 'oilgas', name: 'Oil & Gas', idxSector: 'Energy', region: 'id', accent: '#5a8f6b',
      thesis: 'Upstream/midstream oil & gas; crude + LNG price exposure.',
      tickers: ['MEDC', 'PGAS', 'ENRG', 'ELSA', 'AKRA', 'RAJA'],
      drivers: [D('wti', 'WTI Crude', 'tailwind', 'supply'), D('brent', 'Brent Crude', 'tailwind', 'supply'), D('wb_lng_jp', 'LNG (Japan)', 'tailwind', 'supply'), D('natgas', 'Natural Gas', 'mixed', 'supply')] },
    { id: 'goldmetal', name: 'Gold & Precious', idxSector: 'Basic Materials', region: 'id', accent: '#d4af37',
      thesis: 'Gold miners; bullion price + real-rate / risk regime.',
      tickers: ['MDKA', 'ANTM', 'ARCI', 'BRMS', 'UNTR'],
      drivers: [D('gold', 'Gold', 'tailwind', 'supply'), D('silver', 'Silver', 'mixed', 'supply'), D('copper', 'Copper', 'mixed', 'supply')] },
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
      drivers: [D('wb_idx_food', 'Food Index (cost)', 'headwind', 'supply'), D('wb_sugar_world', 'Sugar (cost)', 'headwind', 'supply'), D('id_cpi_yoy', 'CPI', 'mixed', 'macro')] },
    { id: 'tech', name: 'Technology', idxSector: 'Technology', region: 'id', accent: '#5fd6d6',
      thesis: 'IDX tech/digital; rate-sensitive duration + funding + FX for hardware.',
      drivers: [D('id_bi_rate', 'BI Rate', 'headwind', 'macro'), D('id_usdidr_m', 'USD/IDR', 'headwind', 'macro')] },
    { id: 'health', name: 'Healthcare', idxSector: 'Healthcare', region: 'id', accent: '#7fb6ff',
      thesis: 'Hospitals/pharma; defensive, demographics + import costs (FX) for inputs.',
      drivers: [D('id_usdidr_m', 'USD/IDR (imports)', 'headwind', 'macro'), D('id_cpi_yoy', 'CPI', 'mixed', 'macro')] },
    { id: 'industrials', name: 'Industrials', idxSector: 'Industrials', region: 'id', accent: '#a0a0b0',
      thesis: 'Heavy equipment/manufacturing; capex cycle + metals input + exports.',
      drivers: [D('wb_idx_industrial', 'Industrial Index', 'tailwind', 'demand'), D('steel_hrc', 'Steel (input)', 'headwind', 'supply'), D('id_gdp_real_q', 'ID GDP', 'tailwind', 'demand')] },
    { id: 'infra', name: 'Infrastructure', idxSector: 'Infrastructure', region: 'id', accent: '#8aa0c0',
      thesis: 'Toll/construction/utilities; govt capex + financing cost.',
      drivers: [D('id_bi_rate', 'Financing Cost', 'headwind', 'macro'), D('steel_hrc', 'Steel (cost)', 'headwind', 'supply'), D('id_gdp_real_q', 'ID GDP', 'tailwind', 'demand')] },
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
    // sector snapshot: breadth, avg + mcap-weighted 1D, count, valuation medians
    snapshot: (rows) => {
      const n = rows.length;
      const up = rows.filter(r => Number(r.change_pct) > 0).length;
      const breadth = n ? up / n : 0;
      const avg = mean(rows.map(r => r.change_pct));
      const totMcap = rows.reduce((s, r) => s + (Number(r.mcap) || 0), 0);
      const mcapW = totMcap ? rows.reduce((s, r) => s + (Number(r.change_pct) || 0) * (Number(r.mcap) || 0), 0) / totMcap : avg;
      return { n, up, down: n - up, breadth, avgChg: avg, mcapChg: mcapW, mcap: totMcap,
        medPE: median(rows.map(r => r.pe)), medROE: median(rows.map(r => r.roe)), medGrowth: median(rows.map(r => r.earnings_growth)) };
    },
    // conviction 0-100 (adapted): centered 50, +/- from mcap-weighted move,
    // breadth, and a quality tilt (median ROE). Honest daily-snapshot reading.
    conviction: (snap) => {
      if (!snap || !snap.n) return 50;
      const mv = clamp((snap.mcapChg || 0) / 3, -1, 1) * 28;          // 1D mcap move
      const br = clamp((snap.breadth - 0.5) * 2, -1, 1) * 22;          // breadth
      const q = snap.medROE != null ? clamp((snap.medROE - 10) / 15, -1, 1) * 10 : 0; // quality tilt
      return Math.round(clamp(50 + mv + br + q, 0, 100));
    },
    status: (conv, snap) => {
      if (conv >= 65 && (snap.mcapChg || 0) > 0) return 'BULLISH';
      if (conv <= 35 && (snap.mcapChg || 0) < 0) return 'BEARISH';
      if ((snap.breadth > 0.55) !== ((snap.mcapChg || 0) > 0)) return 'ROTATION';
      return 'NEUTRAL';
    },
    // driver posture from live_indicators change_pct + the driver's upIs
    posture: (driver, indByKey) => {
      const ind = indByKey[driver.key];
      if (!ind) return { driver, found: false, chg: null, posture: 'n/a' };
      const chg = Number(ind.change_pct);
      let posture = 'neutral';
      if (isNum(chg) && Math.abs(chg) > 0.2) {
        const rising = chg > 0;
        if (driver.upIs === 'tailwind') posture = rising ? 'tailwind' : 'headwind';
        else if (driver.upIs === 'headwind') posture = rising ? 'headwind' : 'tailwind';
        else posture = 'mixed';
      }
      return { driver, found: true, chg, value: ind.latest_value, unit: ind.unit, label: ind.label || driver.label, spark: ind.spark, tv: ind.tv_symbol, posture };
    },
    // net driver tilt for an industry (+1 net tailwind .. -1 net headwind)
    driverTilt: (ind, indByKey) => {
      const ps = (ind.drivers || []).map(d => analytics.posture(d, indByKey)).filter(p => p.found);
      const t = ps.filter(p => p.posture === 'tailwind').length;
      const h = ps.filter(p => p.posture === 'headwind').length;
      const tot = ps.length || 1;
      return { net: (t - h) / tot, tail: t, head: h, postures: ps };
    },
    // 6-dimension competitive score for a ticker within its peer set (0-100)
    // Macro 15 / Industry 15 / Technical 20 (proxied by 1D + 52w pos) /
    // Fundamental 20 / Valuation 15 / Risk 15. Peer-relative.
    competitive: (row, peers, ctx) => {
      const peerMed = ctx.peerMed; // {pe,pb,roe,net_margin,rev_growth,div_yield,...}
      const sc = {};
      // valuation: cheaper than peers = higher (PE, PB, EV/EBITDA)
      const valBits = [['pe', row.pe, peerMed.pe], ['pb', row.pb, peerMed.pb], ['ev_ebitda', row.ev_ebitda, peerMed.ev_ebitda]];
      let val = 0, valN = 0; valBits.forEach(([, v, m]) => { if (isNum(v) && isNum(m) && m > 0 && v > 0) { val += clamp(50 + (m - v) / m * 60, 0, 100); valN++; } });
      sc.valuation = valN ? val / valN : 50;
      // fundamental: ROE, margins, growth vs peers
      const fBits = [['roe', row.roe, peerMed.roe], ['net_margin', row.net_margin, peerMed.net_margin], ['rev_growth', row.rev_growth, peerMed.rev_growth]];
      let fu = 0, fn = 0; fBits.forEach(([, v, m]) => { if (isNum(v) && isNum(m)) { fu += clamp(50 + (v - m) * 2, 0, 100); fn++; } });
      sc.fundamental = fn ? fu / fn : 50;
      // technical proxy: 1D change + position vs 52w range
      let tech = 50; if (isNum(row.change_pct)) tech += clamp(row.change_pct * 4, -20, 20);
      if (isNum(row.price) && isNum(row.w52_high) && isNum(row.w52_low) && row.w52_high > row.w52_low) tech += (((row.price - row.w52_low) / (row.w52_high - row.w52_low)) - 0.5) * 30;
      sc.technical = clamp(tech, 0, 100);
      // risk: lower beta + lower D/E + higher current ratio = higher (safer)
      let rk = 50; if (isNum(row.beta)) rk += clamp((1.1 - row.beta) * 25, -20, 20); if (isNum(row.debt_equity)) rk += clamp((1 - row.debt_equity) * 12, -15, 15);
      sc.risk = clamp(rk, 0, 100);
      // industry + macro come from ctx (sector conviction + driver tilt)
      sc.industry = clamp(ctx.conviction != null ? ctx.conviction : 50, 0, 100);
      sc.macro = clamp(50 + (ctx.driverNet || 0) * 35, 0, 100);
      const total = sc.macro * 0.15 + sc.industry * 0.15 + sc.technical * 0.20 + sc.fundamental * 0.20 + sc.valuation * 0.15 + sc.risk * 0.15;
      let verdict = 'HOLD';
      if (total >= 72) verdict = 'STRONG_BUY'; else if (total >= 62) verdict = 'BUY'; else if (total >= 52) verdict = 'ACCUMULATE'; else if (total >= 42) verdict = 'HOLD'; else if (total >= 32) verdict = 'REDUCE'; else verdict = 'AVOID';
      return { dims: sc, total: Math.round(total), verdict };
    },
    // business-cycle phase from Indonesia macro (rate trend, inflation, growth)
    cyclePhase: (indByKey) => {
      const bi = indByKey['id_bi_rate'], cpi = indByKey['id_cpi_yoy'], gdp = indByKey['id_gdp_real_q'];
      const rateRising = bi && Number(bi.change_abs) > 0;
      const infl = cpi ? Number(cpi.latest_value) : null;
      const growth = gdp ? Number(gdp.latest_value) : null;
      let phase = 'Expansion', favored = ['banks', 'industrials', 'consumer'], note = 'Mid-cycle: cyclicals and financials favored.';
      if (infl != null && infl > 4 && rateRising) { phase = 'Slowdown'; favored = ['staples', 'health', 'coal', 'oilgas']; note = 'Tightening into high inflation: defensives + energy/commodities favored.'; }
      else if (growth != null && growth < 4.5) { phase = 'Recovery'; favored = ['property', 'consumer', 'banks', 'tech']; note = 'Below-trend growth, easing bias: rate-sensitives + early cyclicals favored.'; }
      else if (rateRising) { phase = 'Expansion (late)'; favored = ['banks', 'coal', 'nickel', 'industrials']; note = 'Late expansion: financials + commodities favored.'; }
      return { phase, favored, note, infl, growth, rateRising };
    },
    // computed "kesimpulan" (conclusion: who's up/down + why)
    kesimpulan: (ind, snap, conv, status, tilt) => {
      const dir = status === 'BULLISH' ? 'leading' : status === 'BEARISH' ? 'lagging' : status === 'ROTATION' ? 'rotating' : 'mixed';
      const drv = tilt.net > 0.15 ? 'demand/price drivers are a net tailwind' : tilt.net < -0.15 ? 'drivers are a net headwind' : 'drivers are balanced';
      const br = Math.round(snap.breadth * 100);
      const movers = `${snap.up}/${snap.n} names up today (${br}% breadth), cap-weighted ${fmt.pct(snap.mcapChg)}`;
      return `${ind.name} is ${dir} (conviction ${conv}). ${movers}. Currently ${drv} (${tilt.tail} tailwind / ${tilt.head} headwind). Thesis: ${ind.thesis}`;
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
