// ================================================================
// equity-driver-data.jsx — data access for the Equity Driver Lab.
// The financial metric (Y) comes from (a) a pasted (date,value) series — the
// analyst's own revenue/EBIT/margin history, the reliable path for IDX names —
// or (b) auto-pull from the equity-statements cache (US/global names that have
// Yahoo fundamentals). Macro drivers (X) reuse window.AnalysisData.
// Exposes window.DriverData.
// ================================================================
(function () {
  'use strict';
  var STMT_FN = 'https://adnubucjlezrtusbicja.supabase.co/functions/v1/equity-statements';
  var ANON = 'sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7';

  function pad(n) { n = +n; return n < 10 ? '0' + n : '' + n; }
  // Normalise a wide range of period labels → a YYYY-MM-DD (period-end) date.
  function normDate(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m;
    if ((m = /^(\d{4})[-/.](\d{1,2})$/.exec(s))) return m[1] + '-' + pad(m[2]) + '-01';
    // quarter forms: 2020Q1, 2020-Q1, Q1 2020, Q1-2020, 1Q20…
    var qm = /Q\s*([1-4])/i.exec(s), ym = /((?:19|20)\d{2})/.exec(s);
    if (qm && ym) { var q = +qm[1], mo = q * 3; var day = (mo === 6 || mo === 9) ? 30 : 31; return ym[1] + '-' + pad(mo) + '-' + day; }
    if (/^(?:19|20)\d{2}$/.test(s)) return s + '-12-31';
    var d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }
  function toNum(raw) {
    var s = String(raw || '').trim().replace(/[,$%\s]/g, '');
    if (s === '' || s === '-') return null;
    var paren = /^\(.*\)$/.test(s); s = s.replace(/[()]/g, '');
    var mult = 1; var last = s.slice(-1).toLowerCase();
    if (last === 'b') { mult = 1e9; s = s.slice(0, -1); } else if (last === 'm') { mult = 1e6; s = s.slice(0, -1); } else if (last === 'k') { mult = 1e3; s = s.slice(0, -1); }
    var v = parseFloat(s); if (!isFinite(v)) return null;
    return (paren ? -v : v) * mult;
  }
  // Parse pasted text: one period per line, "date<sep>value" (comma/tab/2+ spaces).
  function parseSeries(text) {
    var out = [], bad = 0;
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim(); if (!t) return;
      var parts = t.split(/\t|,|;|\s{2,}|\s+(?=[\-(]?\$?\d)/);   // split on sep or before the number
      if (parts.length < 2) { var sp = t.split(/\s+/); if (sp.length >= 2) { parts = [sp.slice(0, sp.length - 1).join(' '), sp[sp.length - 1]]; } }
      if (parts.length < 2) { bad++; return; }
      var date = normDate(parts[0]); var val = toNum(parts[parts.length - 1]);
      if (date && val != null) out.push({ date: date, value: val }); else bad++;
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return { series: out, bad: bad };
  }

  // Metric → which statement + candidate line-item keys (first match wins), or a
  // ratio of two keys (for margins). Keys match the equity-statements doc.
  // `kind` drives unit-aware formatting & scenario math downstream:
  //   currency = a money aggregate (B/M/K, additive ΔY in currency),
  //   pershare = per-share figure (currency, no magnitude suffix),
  //   percent  = a ratio/margin (additive ΔY in percentage points).
  var METRICS = [
    { id: 'revenue', label: 'Revenue', stmt: 'income', keys: ['TotalRevenue', 'OperatingRevenue'], kind: 'currency' },
    { id: 'grossProfit', label: 'Gross Profit', stmt: 'income', keys: ['GrossProfit'], kind: 'currency' },
    { id: 'opIncome', label: 'Operating Income / EBIT', stmt: 'income', keys: ['OperatingIncome', 'EBIT', 'TotalOperatingIncomeAsReported'], kind: 'currency' },
    { id: 'ebitda', label: 'EBITDA', stmt: 'income', keys: ['EBITDA', 'NormalizedEBITDA'], kind: 'currency' },
    { id: 'netIncome', label: 'Net Income', stmt: 'income', keys: ['NetIncome', 'NetIncomeCommonStockholders'], kind: 'currency' },
    { id: 'eps', label: 'EPS (diluted)', stmt: 'income', keys: ['DilutedEPS', 'BasicEPS'], kind: 'pershare' },
    { id: 'grossMargin', label: 'Gross Margin %', stmt: 'income', ratio: ['GrossProfit', 'TotalRevenue'], kind: 'percent' },
    { id: 'opMargin', label: 'Operating Margin %', stmt: 'income', ratio: ['OperatingIncome', 'TotalRevenue'], kind: 'percent' },
    { id: 'netMargin', label: 'Net Margin %', stmt: 'income', ratio: ['NetIncome', 'TotalRevenue'], kind: 'percent' },
    { id: 'assets', label: 'Total Assets', stmt: 'balance', keys: ['TotalAssets'], kind: 'currency' },
    { id: 'debt', label: 'Total Debt', stmt: 'balance', keys: ['TotalDebt'], kind: 'currency' },
    { id: 'equity', label: 'Total Equity', stmt: 'balance', keys: ['StockholdersEquity', 'TotalEquityGrossMinorityInterest'], kind: 'currency' },
    { id: 'opCF', label: 'Operating Cash Flow', stmt: 'cashflow', keys: ['OperatingCashFlow'], kind: 'currency' },
    { id: 'fcf', label: 'Free Cash Flow', stmt: 'cashflow', keys: ['FreeCashFlow'], kind: 'currency' },
    { id: 'capex', label: 'Capex', stmt: 'cashflow', keys: ['CapitalExpenditure'], kind: 'currency' }
  ];

  function mapToSeries(map) {
    if (!map || typeof map !== 'object') return [];
    return Object.keys(map).map(function (d) { return { date: d, value: Number(map[d]) }; })
      .filter(function (o) { return o.date && o.value != null && isFinite(o.value); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function pickKey(block, keys) { for (var i = 0; i < keys.length; i++) { if (block[keys[i]]) return block[keys[i]]; } return null; }

  // Auto-pull a metric from equity-statements (convenience; thin/empty for IDX).
  function autoPull(ticker, metricId, freq) {
    var met = METRICS.find(function (m) { return m.id === metricId; }) || METRICS[0];
    freq = freq === 'annual' ? 'annual' : 'quarterly';
    return fetch(STMT_FN + '?ticker=' + encodeURIComponent(ticker), { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function (j) {
        var st = j && j.doc && j.doc.statements; var block = st && st[freq] && st[freq][met.stmt];
        if (!block || !Object.keys(block).length) return { series: [], note: 'No auto-pull data for ' + ticker + ' (' + freq + ') — Yahoo has no fundamentals for this name (typical for IDX). Paste the series instead.', currency: (j.doc && j.doc.currency) || null };
        var series;
        if (met.ratio) {
          var a = mapToSeries(block[met.ratio[0]]), b = mapToSeries(block[met.ratio[1]]);
          var bm = {}; b.forEach(function (o) { bm[o.date] = o.value; });
          series = a.map(function (o) { return bm[o.date] ? { date: o.date, value: o.value / bm[o.date] * 100 } : null; }).filter(Boolean);
        } else {
          series = mapToSeries(pickKey(block, met.keys));
        }
        return { series: series, note: series.length ? null : 'No "' + met.label + '" in the auto-pulled statements — try another metric or paste manually.', currency: (j.doc && j.doc.currency) || null };
      })
      .catch(function (e) { return { series: [], note: 'Auto-pull failed (' + e + ') — paste the series instead.' }; });
  }

  window.DriverData = {
    METRICS: METRICS,
    parseSeries: parseSeries,
    normDate: normDate,
    autoPull: autoPull,
    // macro drivers reuse the Analysis data layer
    searchMacro: function (q, opts) { return window.AnalysisData ? window.AnalysisData.search(q, opts) : Promise.resolve([]); },
    fetchMacro: function (item) { return window.AnalysisData ? window.AnalysisData.fetchSeries(item) : Promise.resolve([]); },
    REF_COUNTRIES: (window.AnalysisData && window.AnalysisData.REF_COUNTRIES) || [{ id: 'us', label: 'US' }, { id: 'id', label: 'ID' }, { id: 'cn', label: 'CN' }]
  };
})();
