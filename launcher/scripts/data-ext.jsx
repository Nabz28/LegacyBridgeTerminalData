// ================================================================
// Extended data fixtures for v2 workspaces
// (Stock, Macro, Scanners, Industry, Portfolio, Algos, Calendar)
// ================================================================

// ---------- TICKER UNIVERSE (lightweight rows for Stock workspace) ----------
const TICKER_UNIVERSE = {
  BBCA: {
    symbol: 'BBCA', name: 'Bank Central Asia Tbk', exchange: 'IDX', sector: 'Financials', industry: 'Banks — Diversified',
    price: 10075, currency: 'IDR', chg: 25, chgp: 0.25,
    open: 10050, high: 10125, low: 10000, prevClose: 10050,
    volume: '187.4M', value: 'Rp 1.89T', vwap: 10068,
    mcap: 'Rp 1,242 T', shares: '123.27 B', float: '46.8 B', divYield: 2.4,
    pe: 23.4, pb: 4.8, eps: 430, beta: 0.81, w52h: 10250, w52l: 8475,
  },
  BBRI: {
    symbol: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', exchange: 'IDX', sector: 'Financials', industry: 'Banks — Regional',
    price: 5425, currency: 'IDR', chg: -50, chgp: -0.91,
    open: 5475, high: 5500, low: 5400, prevClose: 5475,
    volume: '142.8M', value: 'Rp 778B', vwap: 5440,
    mcap: 'Rp 822 T', shares: '151.5 B', float: '78.3 B', divYield: 6.1,
    pe: 12.4, pb: 2.1, eps: 437, beta: 1.04, w52h: 6100, w52l: 4280,
  },
  BMRI: {
    symbol: 'BMRI', name: 'Bank Mandiri (Persero) Tbk', exchange: 'IDX', sector: 'Financials', industry: 'Banks — Diversified',
    price: 6175, currency: 'IDR', chg: 75, chgp: 1.23,
    open: 6125, high: 6200, low: 6100, prevClose: 6100,
    volume: '78.2M', value: 'Rp 482B', vwap: 6155,
    mcap: 'Rp 575 T', shares: '93.33 B', float: '56.0 B', divYield: 5.3,
    pe: 11.8, pb: 1.9, eps: 523, beta: 1.12, w52h: 7375, w52l: 5500,
  },
  TLKM: {
    symbol: 'TLKM', name: 'Telkom Indonesia Tbk', exchange: 'IDX', sector: 'Communication', industry: 'Telecom Services',
    price: 3720, currency: 'IDR', chg: 40, chgp: 1.09,
    open: 3680, high: 3740, low: 3680, prevClose: 3680,
    volume: '95.4M', value: 'Rp 354B', vwap: 3712,
    mcap: 'Rp 368 T', shares: '99.06 B', float: '47.8 B', divYield: 5.8,
    pe: 14.2, pb: 2.4, eps: 262, beta: 0.74, w52h: 4150, w52l: 2860,
  },
};

// ---------- MACRO INDICATORS (FRED + Indo) ----------
const MACRO_INDICATORS = [
  // US / FRED
  { id: 'gdp_us',    region: 'US',     group: 'Growth',     label: 'Real GDP (QoQ SAAR)',          source: 'FRED',  unit: '%',     latest: 2.4,    chg: 0.3,  series: mkMacroSeries(40, 2.0, 0.6) },
  { id: 'cpi_us',    region: 'US',     group: 'Inflation',  label: 'CPI (YoY)',                    source: 'FRED',  unit: '%',     latest: 2.7,    chg: -0.1, series: mkMacroSeries(40, 3.5, 0.5) },
  { id: 'core_us',   region: 'US',     group: 'Inflation',  label: 'Core PCE (YoY)',               source: 'FRED',  unit: '%',     latest: 2.6,    chg: 0.0,  series: mkMacroSeries(40, 3.2, 0.4) },
  { id: 'unemp_us',  region: 'US',     group: 'Labor',      label: 'Unemployment Rate',            source: 'FRED',  unit: '%',     latest: 4.2,    chg: 0.1,  series: mkMacroSeries(40, 3.7, 0.3) },
  { id: 'nfp_us',    region: 'US',     group: 'Labor',      label: 'Non-Farm Payrolls (∆ k)',      source: 'BLS',   unit: 'k',     latest: 187,    chg: -45,  series: mkMacroSeries(40, 220, 60) },
  { id: 'ffr_us',    region: 'US',     group: 'Rates',      label: 'Fed Funds Rate (target)',      source: 'FRED',  unit: '%',     latest: 5.00,   chg: -0.25,series: mkMacroSeries(40, 4.5, 0.4) },
  { id: 'us10y',     region: 'US',     group: 'Rates',      label: '10Y Treasury Yield',           source: 'FRED',  unit: '%',     latest: 4.18,   chg: -0.04,series: mkMacroSeries(40, 4.2, 0.3) },
  { id: 'usret',     region: 'US',     group: 'Consumer',   label: 'Retail Sales (MoM)',           source: 'FRED',  unit: '%',     latest: 0.4,    chg: 0.2,  series: mkMacroSeries(40, 0.3, 0.6) },
  { id: 'pmi_us',    region: 'US',     group: 'Activity',   label: 'ISM Manufacturing PMI',        source: 'ISM',   unit: '',      latest: 49.1,   chg: 0.6,  series: mkMacroSeries(40, 49, 1.5) },
  { id: 'wti',       region: 'Global', group: 'Commodity',  label: 'WTI Crude Oil',                source: 'EIA',   unit: '$/bbl', latest: 82.40,  chg: -1.08,series: mkMacroSeries(40, 80, 6) },
  { id: 'gold',      region: 'Global', group: 'Commodity',  label: 'Spot Gold',                    source: 'LBMA',  unit: '$/oz',  latest: 2385,   chg: 15,   series: mkMacroSeries(40, 2300, 80) },
  { id: 'dxy',       region: 'Global', group: 'FX',         label: 'US Dollar Index (DXY)',        source: 'ICE',   unit: '',      latest: 103.4,  chg: -0.18,series: mkMacroSeries(40, 104, 2) },
  // Indo
  { id: 'gdp_id',    region: 'ID',     group: 'Growth',     label: 'Real GDP (YoY)',               source: 'BPS',   unit: '%',     latest: 5.1,    chg: 0.0,  series: mkMacroSeries(40, 5.05, 0.2) },
  { id: 'cpi_id',    region: 'ID',     group: 'Inflation',  label: 'CPI (YoY)',                    source: 'BPS',   unit: '%',     latest: 2.6,    chg: -0.2, series: mkMacroSeries(40, 3.0, 0.4) },
  { id: 'bi_rate',   region: 'ID',     group: 'Rates',      label: 'BI 7-Day RR Rate',             source: 'BI',    unit: '%',     latest: 6.00,   chg: 0.0,  series: mkMacroSeries(40, 5.9, 0.3) },
  { id: 'id10y',     region: 'ID',     group: 'Rates',      label: 'INDOGB 10Y Yield',             source: 'IBPA',  unit: '%',     latest: 6.84,   chg: -0.05,series: mkMacroSeries(40, 6.9, 0.3) },
  { id: 'idr',       region: 'ID',     group: 'FX',         label: 'USD / IDR',                    source: 'BI',    unit: '',      latest: 15820,  chg: -28,  series: mkMacroSeries(40, 15800, 200) },
  { id: 'fx_rsv',    region: 'ID',     group: 'External',   label: 'FX Reserves',                  source: 'BI',    unit: '$ B',   latest: 145.2,  chg: 1.4,  series: mkMacroSeries(40, 138, 5) },
  { id: 'trade_id',  region: 'ID',     group: 'External',   label: 'Trade Balance',                source: 'BPS',   unit: '$ B',   latest: 4.47,   chg: 0.82, series: mkMacroSeries(40, 3.5, 1.2) },
  { id: 'unemp_id',  region: 'ID',     group: 'Labor',      label: 'Unemployment Rate',            source: 'BPS',   unit: '%',     latest: 4.82,   chg: -0.08,series: mkMacroSeries(40, 5.1, 0.2) },
  { id: 'cci_id',    region: 'ID',     group: 'Consumer',   label: 'Consumer Confidence',          source: 'BI',    unit: '',      latest: 124.4,  chg: 1.8,  series: mkMacroSeries(40, 122, 4) },
  { id: 'pmi_id',    region: 'ID',     group: 'Activity',   label: 'S&P Global Mfg PMI',           source: 'S&P',   unit: '',      latest: 52.9,   chg: 0.6,  series: mkMacroSeries(40, 52, 1) },
  { id: 'm2_id',     region: 'ID',     group: 'Money',      label: 'M2 Money Supply (YoY)',        source: 'BI',    unit: '%',     latest: 7.2,    chg: 0.4,  series: mkMacroSeries(40, 6.5, 0.8) },
];

function mkMacroSeries(n, base, vol) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.5) * vol * 0.4;
    out.push(+v.toFixed(2));
  }
  return out;
}

// ---------- SCANNERS ----------
const SCANNERS = [
  {
    id: 'best80',
    name: 'Qars Best 80',
    description: 'Top 80 conviction names blending fundamentals, technicals & flow',
    universe: 'IDX Composite',
    runAt: '08:55 WIB',
    cadence: 'Daily',
    nMatches: 80,
    catalystKind: 'Multi-factor',
    avgConv: 78,
    medRet1m: 4.8,
  },
  {
    id: 'momentum',
    name: 'Momentum Breakouts',
    description: '52-week high breakouts on 2× volume with positive earnings revisions',
    universe: 'IDX + LQ45',
    runAt: '09:15 WIB',
    cadence: 'Intraday',
    nMatches: 12,
    catalystKind: 'Technical',
    avgConv: 68,
    medRet1m: 7.4,
  },
  {
    id: 'reversal',
    name: 'Mean Reversion',
    description: 'Oversold names with positive sentiment divergence',
    universe: 'LQ45',
    runAt: '08:45 WIB',
    cadence: 'Daily',
    nMatches: 14,
    catalystKind: 'Technical',
    avgConv: 64,
    medRet1m: 3.1,
  },
  {
    id: 'dividend',
    name: 'Dividend Aristocrats ID',
    description: '10y consecutive dividend growers with payout ratio < 60%',
    universe: 'IDX Composite',
    runAt: 'Weekly',
    cadence: 'Weekly',
    nMatches: 23,
    catalystKind: 'Fundamental',
    avgConv: 82,
    medRet1m: 1.9,
  },
  {
    id: 'insider',
    name: 'Insider Accumulation',
    description: 'Net insider buying > 0.5% of float in last 30 days',
    universe: 'IDX Composite',
    runAt: '07:30 WIB',
    cadence: 'Daily',
    nMatches: 9,
    catalystKind: 'Flow',
    avgConv: 71,
    medRet1m: 5.6,
  },
  {
    id: 'foreign',
    name: 'Foreign Inflow Leaders',
    description: 'Top net foreign buying as % of ADV (5-day rolling)',
    universe: 'LQ45',
    runAt: '17:00 WIB',
    cadence: 'Daily',
    nMatches: 15,
    catalystKind: 'Flow',
    avgConv: 74,
    medRet1m: 4.2,
  },
  {
    id: 'earnings',
    name: 'Earnings Beat & Raise',
    description: 'Beat top + bottom line, raised guidance, sell-side upgrades',
    universe: 'IDX Composite',
    runAt: 'Earnings',
    cadence: 'Event',
    nMatches: 7,
    catalystKind: 'Fundamental',
    avgConv: 86,
    medRet1m: 6.1,
  },
  {
    id: 'esg',
    name: 'ESG Improvers',
    description: 'MSCI ESG rating upgraded YoY with low controversy score',
    universe: 'IDX30',
    runAt: 'Quarterly',
    cadence: 'Quarterly',
    nMatches: 11,
    catalystKind: 'Fundamental',
    avgConv: 69,
    medRet1m: 2.4,
  },
];

const SCANNER_TICKERS = {
  best80: [
    { sym: 'BBCA', name: 'Bank Central Asia',         conv: 92, r1w: 1.8,  r1m: 4.2,  r3m: 8.1,  r6m: 14.2, r252: 26.4, catalyst: 'CASA franchise + ROE 21% + buyback authorization' },
    { sym: 'BMRI', name: 'Bank Mandiri',              conv: 88, r1w: 2.4,  r1m: 6.8,  r3m: 11.4, r6m: 18.7, r252: 32.1, catalyst: 'NIM expansion + corporate loan tailwind + sub-debt issuance' },
    { sym: 'TLKM', name: 'Telkom Indonesia',          conv: 84, r1w: 1.1,  r1m: 3.4,  r3m: 6.8,  r6m: 9.2,  r252: 14.6, catalyst: 'Data center monetization + Singtel JV + 5G capex peak' },
    { sym: 'ASII', name: 'Astra International',       conv: 81, r1w: -1.2, r1m: 2.1,  r3m: 4.6,  r6m: 7.8,  r252: 11.4, catalyst: 'EV partnership pipeline + auto financing recovery' },
    { sym: 'GOTO', name: 'GoTo Gojek Tokopedia',      conv: 79, r1w: 3.4,  r1m: 8.7,  r3m: 14.2, r6m: 22.8, r252: 38.4, catalyst: 'Adj EBITDA breakeven Q2 + TikTok Shop integration' },
    { sym: 'INDF', name: 'Indofood Sukses Makmur',    conv: 77, r1w: 0.8,  r1m: 2.4,  r3m: 5.2,  r6m: 8.4,  r252: 13.8, catalyst: 'Wheat cost normalization + ICBP volume growth' },
    { sym: 'UNVR', name: 'Unilever Indonesia',        conv: 74, r1w: 0.4,  r1m: 1.8,  r3m: 3.4,  r6m: 5.6,  r252: 9.2,  catalyst: 'Pricing power resumption + dividend yield 4.8%' },
    { sym: 'KLBF', name: 'Kalbe Farma',               conv: 72, r1w: -0.6, r1m: 1.4,  r3m: 2.8,  r6m: 4.4,  r252: 7.6,  catalyst: 'Distribution scale + government health spending' },
  ],
  momentum: [
    { sym: 'BREN', name: 'Barito Renewables Energy',  conv: 84, r1w: 8.4,  r1m: 22.4, r3m: 41.2, r6m: 78.4, r252: 142.6, catalyst: '52w breakout + capacity announcement + utility offtake' },
    { sym: 'AMMN', name: 'Amman Mineral Internasional',conv: 78, r1w: 6.2,  r1m: 14.8, r3m: 28.4, r6m: 52.6, r252: 87.4,  catalyst: 'Copper supercycle + Batu Hijau ramp + LME inventory drawdown' },
    { sym: 'PANI', name: 'Pantai Indah Kapuk Dua',    conv: 71, r1w: 4.8,  r1m: 11.2, r3m: 18.4, r6m: 32.8, r252: 64.2,  catalyst: 'Land bank revaluation + presale pickup' },
    { sym: 'CUAN', name: 'Petrindo Jaya Kreasi',      conv: 68, r1w: 12.4, r1m: 28.6, r3m: 47.8, r6m: 92.4, r252: 184.2, catalyst: 'Earnings revision +28% + analyst upgrades' },
  ],
  reversal: [
    { sym: 'BBRI', name: 'Bank Rakyat Indonesia',     conv: 78, r1w: -2.1, r1m: -4.4, r3m: -7.8, r6m: -3.2, r252: 4.6,  catalyst: 'RSI 28 + sentiment divergence + book value support' },
    { sym: 'ANTM', name: 'Aneka Tambang',             conv: 64, r1w: -1.8, r1m: -3.2, r3m: -5.4, r6m: -2.8, r252: 6.4,  catalyst: 'Nickel cycle bottom + government quota increase' },
    { sym: 'PGAS', name: 'Perusahaan Gas Negara',     conv: 58, r1w: -0.8, r1m: -2.1, r3m: -4.2, r6m: -1.4, r252: 3.8,  catalyst: 'Gas price floor + LNG terminal completion' },
  ],
  dividend: [
    { sym: 'BBNI', name: 'Bank Negara Indonesia',     conv: 84, r1w: 0.4,  r1m: 2.1,  r3m: 4.8,  r6m: 8.6,  r252: 14.2, catalyst: '12y consec div growth + 60% payout sustainable' },
    { sym: 'TLKM', name: 'Telkom Indonesia',          conv: 81, r1w: 1.1,  r1m: 3.4,  r3m: 6.8,  r6m: 9.2,  r252: 14.6, catalyst: '5.8% yield + FCF coverage 2.1x' },
    { sym: 'ITMG', name: 'Indo Tambangraya Megah',    conv: 78, r1w: 1.8,  r1m: 4.6,  r3m: 7.4,  r6m: 12.8, r252: 19.4, catalyst: '11% yield + balance sheet net cash' },
  ],
  insider: [
    { sym: 'AKRA', name: 'AKR Corporindo',            conv: 76, r1w: 2.4,  r1m: 5.8,  r3m: 9.4,  r6m: 14.6, r252: 22.8, catalyst: 'CEO purchased 1.2% of float in 30d at avg 1,425' },
    { sym: 'MAPI', name: 'Mitra Adiperkasa',          conv: 71, r1w: 1.4,  r1m: 3.8,  r3m: 7.2,  r6m: 11.4, r252: 18.6, catalyst: 'Board net buyer 0.8% of float — first since 2022' },
  ],
  foreign: [
    { sym: 'BBCA', name: 'Bank Central Asia',         conv: 88, r1w: 2.4,  r1m: 5.8,  r3m: 9.2,  r6m: 16.4, r252: 28.6, catalyst: 'Foreign net buy Rp 1.4T (5d) — top of LQ45' },
    { sym: 'BMRI', name: 'Bank Mandiri',              conv: 84, r1w: 3.1,  r1m: 7.4,  r3m: 12.8, r6m: 21.2, r252: 34.6, catalyst: 'Foreign net buy Rp 982B + UBS upgrade to Buy' },
  ],
  earnings: [
    { sym: 'BBCA', name: 'Bank Central Asia',         conv: 91, r1w: 1.8,  r1m: 4.2,  r3m: 8.1,  r6m: 14.2, r252: 26.4, catalyst: 'Q1 NPAT +11.7% YoY beat — guidance raised to FY +9-11%' },
    { sym: 'TLKM', name: 'Telkom Indonesia',          conv: 84, r1w: 1.1,  r1m: 3.4,  r3m: 6.8,  r6m: 9.2,  r252: 14.6, catalyst: 'Beat top+bottom — DC EBITDA +42% YoY' },
  ],
  esg: [
    { sym: 'TLKM', name: 'Telkom Indonesia',          conv: 78, r1w: 1.1,  r1m: 3.4,  r3m: 6.8,  r6m: 9.2,  r252: 14.6, catalyst: 'MSCI ESG: BBB→A — emissions intensity -18% YoY' },
    { sym: 'BBCA', name: 'Bank Central Asia',         conv: 75, r1w: 1.8,  r1m: 4.2,  r3m: 8.1,  r6m: 14.2, r252: 26.4, catalyst: 'Sustainable finance ratio 12% (vs peer 6%)' },
  ],
};

// ---------- INDUSTRY GRAPH (sectors → industries → sub-industries) ----------
const INDUSTRY_GRAPH = {
  sectors: [
    { id: 'fin',  label: 'Financials',         x: 0.5,  y: 0.5,   nTickers: 78,  perf1m: 3.4 },
    { id: 'cons', label: 'Cons. Discretionary',x: 0.18, y: 0.32,  nTickers: 64,  perf1m: 1.2 },
    { id: 'cstap',label: 'Cons. Staples',      x: 0.32, y: 0.16,  nTickers: 41,  perf1m: -0.4 },
    { id: 'tech', label: 'Communication',      x: 0.62, y: 0.18,  nTickers: 22,  perf1m: 2.8 },
    { id: 'ener', label: 'Energy',             x: 0.84, y: 0.34,  nTickers: 38,  perf1m: -1.8 },
    { id: 'matr', label: 'Materials',          x: 0.86, y: 0.62,  nTickers: 52,  perf1m: 4.6 },
    { id: 'indu', label: 'Industrials',        x: 0.68, y: 0.82,  nTickers: 47,  perf1m: 0.8 },
    { id: 'util', label: 'Utilities',          x: 0.36, y: 0.84,  nTickers: 14,  perf1m: -0.6 },
    { id: 'real', label: 'Real Estate',        x: 0.14, y: 0.66,  nTickers: 28,  perf1m: 2.1 },
    { id: 'heal', label: 'Healthcare',         x: 0.08, y: 0.48,  nTickers: 19,  perf1m: 1.4 },
  ],
  // Edges = supply / demand relationships (consumer ← supplier)
  edges: [
    { from: 'ener', to: 'indu',  weight: 0.8, kind: 'input' },
    { from: 'matr', to: 'indu',  weight: 0.9, kind: 'input' },
    { from: 'matr', to: 'cons',  weight: 0.6, kind: 'input' },
    { from: 'matr', to: 'real',  weight: 0.7, kind: 'input' },
    { from: 'fin',  to: 'cons',  weight: 0.7, kind: 'capital' },
    { from: 'fin',  to: 'real',  weight: 0.85,kind: 'capital' },
    { from: 'fin',  to: 'indu',  weight: 0.6, kind: 'capital' },
    { from: 'tech', to: 'fin',   weight: 0.4, kind: 'service' },
    { from: 'tech', to: 'cons',  weight: 0.5, kind: 'service' },
    { from: 'util', to: 'indu',  weight: 0.7, kind: 'input' },
    { from: 'util', to: 'cstap', weight: 0.5, kind: 'input' },
    { from: 'cstap',to: 'cons',  weight: 0.4, kind: 'parallel' },
    { from: 'heal', to: 'fin',   weight: 0.3, kind: 'capital' },
  ],
  // Sub-industry detail (rendered when a sector is focused)
  subIndustries: {
    fin: [
      { id: 'banks',    label: 'Banks — Diversified',  size: 22, leaders: ['BBCA','BMRI','BBRI'] },
      { id: 'banks-r',  label: 'Banks — Regional',     size: 18, leaders: ['BBNI','BNGA'] },
      { id: 'insur',    label: 'Insurance',            size: 12, leaders: ['ASBI','PNBN'] },
      { id: 'capm',     label: 'Capital Markets',      size:  9, leaders: ['BBKP'] },
      { id: 'consfin',  label: 'Consumer Finance',     size: 11, leaders: ['BFIN','CFIN'] },
      { id: 'fintech',  label: 'Fintech',              size:  6, leaders: ['GOTO'] },
    ],
    matr: [
      { id: 'metals',   label: 'Metals & Mining',      size: 18, leaders: ['ANTM','INCO','TINS'] },
      { id: 'cement',   label: 'Construction Materials',size: 8,  leaders: ['SMGR','INTP'] },
      { id: 'chem',     label: 'Chemicals',            size: 14, leaders: ['CPIN','BRPT'] },
      { id: 'paper',    label: 'Paper & Forest',       size:  6, leaders: ['INKP','TKIM'] },
      { id: 'ag',       label: 'Agribusiness',         size:  6, leaders: ['LSIP','SIMP'] },
    ],
    cons: [
      { id: 'auto',     label: 'Automobiles',          size: 12, leaders: ['ASII','IMAS'] },
      { id: 'retail',   label: 'Retail',               size: 18, leaders: ['MAPI','RALS','LPPF'] },
      { id: 'media',    label: 'Media & Entertainment',size:  9, leaders: ['SCMA','MNCN'] },
      { id: 'travel',   label: 'Travel & Leisure',     size: 11, leaders: ['BUKA'] },
      { id: 'hgoods',   label: 'Household Durables',   size:  6, leaders: ['ACES'] },
    ],
  },
};

// ---------- PORTFOLIO ----------
const PORTFOLIO = {
  totalValue: 'Rp 8,247,650,000',
  cash: 'Rp 421,300,000',
  invested: 'Rp 7,826,350,000',
  pnlDay: '+Rp 38,420,000',
  pnlDayPct: 0.47,
  pnlTotal: '+Rp 1,184,650,000',
  pnlTotalPct: 16.78,
  beta: 0.84,
  yield: 3.2,
  positions: [
    { sym: 'BBCA', name: 'Bank Central Asia',     qty: 75000, avgCost: 8420, lastPx: 10075, mv: 755625000,  pnlAbs: 124125000, pnlPct: 19.66, weight: 9.16 },
    { sym: 'BMRI', name: 'Bank Mandiri',          qty: 92000, avgCost: 5380, lastPx: 6175,  mv: 568100000,  pnlAbs: 73140000,  pnlPct: 14.78, weight: 6.89 },
    { sym: 'TLKM', name: 'Telkom Indonesia',      qty: 142000,avgCost: 3210, lastPx: 3720,  mv: 528240000,  pnlAbs: 72420000,  pnlPct: 15.89, weight: 6.41 },
    { sym: 'ASII', name: 'Astra International',   qty: 64000, avgCost: 5640, lastPx: 5150,  mv: 329600000,  pnlAbs: -31360000, pnlPct: -8.69, weight: 4.00 },
    { sym: 'GOTO', name: 'GoTo Gojek Tokopedia',  qty: 4200000,avgCost: 64,  lastPx: 82,    mv: 344400000,  pnlAbs: 75600000,  pnlPct: 28.13, weight: 4.18 },
    { sym: 'INDF', name: 'Indofood Sukses Makmur',qty: 38000, avgCost: 6450, lastPx: 6925,  mv: 263150000,  pnlAbs: 18050000,  pnlPct: 7.36,  weight: 3.19 },
    { sym: 'UNVR', name: 'Unilever Indonesia',    qty: 95000, avgCost: 2380, lastPx: 2415,  mv: 229425000,  pnlAbs: 3325000,   pnlPct: 1.47,  weight: 2.78 },
    { sym: 'BBNI', name: 'Bank Negara Indonesia', qty: 48000, avgCost: 5220, lastPx: 5850,  mv: 280800000,  pnlAbs: 30240000,  pnlPct: 12.07, weight: 3.41 },
  ],
  perfHistory: mkMacroSeries(120, 100, 4),
  benchHistory: mkMacroSeries(120, 100, 3.2),
};

// ---------- ALGOS ----------
const ALGOS = [
  { id: 'qarsmom',    name: 'Qars Momentum',          author: 'Qars Research', yr: 24.6, vol: 18.2, sharpe: 1.35, dd: -14.2, aum: 'Rp 12.4 B', minInv: 'Rp 50 M',  cadence: 'Daily',  desc: 'Cross-sectional momentum across LQ45 with vol-targeting and earnings-window blackouts.', tags: ['Equity', 'Momentum', 'IDX'] },
  { id: 'qarsval',    name: 'Qars Value Carry',       author: 'Qars Research', yr: 18.4, vol: 12.6, sharpe: 1.46, dd: -8.4,  aum: 'Rp 8.2 B',  minInv: 'Rp 50 M',  cadence: 'Weekly', desc: 'Long-only value tilt screened on FCF yield, ROIC, and balance-sheet quality.',           tags: ['Equity', 'Value', 'IDX'] },
  { id: 'qarsmacro',  name: 'Qars Macro Tactical',    author: 'Qars Research', yr: 14.8, vol: 9.4,  sharpe: 1.57, dd: -6.2,  aum: 'Rp 6.4 B',  minInv: 'Rp 100 M', cadence: 'Monthly',desc: 'Multi-asset rotation between IDX, USD, IDR govvies, gold based on macro regime score.',  tags: ['Multi-asset', 'Macro'] },
  { id: 'qarsalpha',  name: 'Qars Alpha Pairs',       author: 'Qars Research', yr: 11.2, vol: 6.8,  sharpe: 1.65, dd: -4.1,  aum: 'Rp 4.1 B',  minInv: 'Rp 100 M', cadence: 'Daily',  desc: 'Long-short pairs trading inside Indonesian banks and consumer staples.',                  tags: ['L/S', 'Pairs'] },
  { id: 'qarsesg',    name: 'Qars ESG Leaders',       author: 'Qars Research', yr: 16.4, vol: 14.2, sharpe: 1.16, dd: -11.4, aum: 'Rp 3.2 B',  minInv: 'Rp 50 M',  cadence: 'Quarterly',desc: 'ESG-tilted IDX30 portfolio with controversy screens and emissions intensity caps.',     tags: ['Equity', 'ESG'] },
  { id: 'qarsdiv',    name: 'Qars Dividend Income',   author: 'Qars Research', yr: 9.4,  vol: 8.1,  sharpe: 1.16, dd: -5.8,  aum: 'Rp 5.6 B',  minInv: 'Rp 50 M',  cadence: 'Quarterly',desc: 'Sustainable dividend income with FCF coverage and payout discipline filters.',           tags: ['Income', 'Equity'] },
];

// ---------- ECONOMIC CALENDAR ----------
const CALENDAR = [
  { date: '2026-05-01', time: '08:00', region: 'ID', country: '🇮🇩', event: 'CPI YoY (Apr)',                actual: null,  cons: '2.5%',   prev: '2.7%',  imp: 'high' },
  { date: '2026-05-01', time: '08:30', region: 'ID', country: '🇮🇩', event: 'S&P Global Mfg PMI (Apr)',     actual: '52.9',cons: '52.4',   prev: '52.3',  imp: 'med' },
  { date: '2026-05-01', time: '14:30', region: 'EU', country: '🇪🇺', event: 'HICP YoY (Apr P)',             actual: null,  cons: '2.3%',   prev: '2.4%',  imp: 'high' },
  { date: '2026-05-01', time: '20:30', region: 'US', country: '🇺🇸', event: 'Non-Farm Payrolls (Apr)',      actual: null,  cons: '180k',   prev: '187k',  imp: 'high' },
  { date: '2026-05-01', time: '20:30', region: 'US', country: '🇺🇸', event: 'Unemployment Rate (Apr)',      actual: null,  cons: '4.2%',   prev: '4.2%',  imp: 'high' },
  { date: '2026-05-01', time: '20:30', region: 'US', country: '🇺🇸', event: 'Avg Hourly Earnings YoY',      actual: null,  cons: '4.0%',   prev: '4.1%',  imp: 'med' },
  { date: '2026-05-02', time: '21:00', region: 'US', country: '🇺🇸', event: 'ISM Mfg PMI (Apr)',            actual: null,  cons: '49.4',   prev: '49.1',  imp: 'high' },
  { date: '2026-05-04', time: '15:00', region: 'ID', country: '🇮🇩', event: 'GDP YoY (Q1)',                 actual: null,  cons: '5.05%',  prev: '5.1%',  imp: 'high' },
  { date: '2026-05-06', time: '14:30', region: 'ID', country: '🇮🇩', event: 'BI 7-Day RR Rate decision',    actual: null,  cons: '6.00%',  prev: '6.00%', imp: 'high' },
  { date: '2026-05-07', time: '01:00', region: 'US', country: '🇺🇸', event: 'FOMC Rate decision',           actual: null,  cons: '5.00%',  prev: '5.00%', imp: 'high' },
  { date: '2026-05-07', time: '01:30', region: 'US', country: '🇺🇸', event: 'FOMC Press Conference',         actual: null,  cons: '—',      prev: '—',     imp: 'high' },
  { date: '2026-05-09', time: '10:00', region: 'ID', country: '🇮🇩', event: 'FX Reserves (Apr)',             actual: null,  cons: '$146 B', prev: '$145 B',imp: 'low' },
];

// ---------- AI DAILY BRIEF ----------
const AI_BRIEF = {
  global: {
    headline: 'Risk-on resumes as Fed pivot pricing firms after softer US labor data',
    body: 'Cross-asset risk appetite improved overnight as ADP private payrolls came in 47k below consensus, prompting OIS-implied probability of a June 25bp Fed cut to rise from 38% to 56%. The DXY weakened 0.4%, supportive for EM and commodities. Crude is the notable laggard as OPEC+ headlines suggest a measured production unwind. Watch tomorrow\'s NFP for confirmation.',
    bullets: [
      'OIS-implied June 25bp cut probability: 38% → 56% (DV01-weighted)',
      'DXY -0.4% intraday, EM FX broadly bid; IDR catching up to KRW/THB',
      'WTI -1.1% on OPEC+ supply chatter; gold +0.6% on real-rate compression',
    ],
    sentiment: { bull: 0.62, bear: 0.18, neutral: 0.20, n: 1247 },
    sources: ['Bloomberg', 'Reuters', 'FT', 'WSJ', 'Nikkei', 'Refinitiv'],
  },
  us: {
    headline: 'Soft macro print rotates leadership back to long-duration; mega-caps outperform value',
    body: 'NDX +0.7% led by semis on Lam Research guide; SPX advance/decline modestly negative below the surface. Banks underperformed on yield curve flattening. Earnings calendar dense — focus on AAPL, AMZN aftermarket. Sentiment from 3,840 US news items skews bullish on policy easing path; bearish cluster around CRE refinancing and consumer credit deterioration.',
    bullets: [
      'NDX leads, RTY lags — duration > cyclicals on the day',
      'IG credit spreads -3bps; HY -8bps — positive risk signal',
      'AAPL, AMZN report after the close; both implied move ~5%',
    ],
    sentiment: { bull: 0.58, bear: 0.22, neutral: 0.20, n: 3840 },
    sources: ['WSJ', 'Bloomberg', 'CNBC', 'Reuters', 'NYT'],
  },
  id: {
    headline: 'IHSG breaks above 7,275 as foreign flows turn net positive ahead of BI decision',
    body: 'IDX Composite +0.62% to fresh ATH intraday on Rp 1.42T net foreign buying — the largest daily inflow since March. Bank-heavy LQ45 rotation continues with BBCA breaking 10,050 on 3× ADV. Coal & metals laggard on weak China PMI overnight. CPI release at 08:00 tomorrow and BI rate decision May 6 are the key catalysts; consensus 6.00% hold but easing bias growing.',
    bullets: [
      'Foreign net buy Rp 1.42T (5d cumulative +Rp 4.8T)',
      'BBCA breakout on 3× ADV; banks rotation broadens to BMRI, BBNI',
      'IDR strengthens to 15,820 — two-week high; supportive for EM equities',
    ],
    sentiment: { bull: 0.71, bear: 0.13, neutral: 0.16, n: 624 },
    sources: ['Bloomberg', 'Kontan', 'Bisnis', 'CNBC Indonesia', 'IDX', 'Reuters'],
    related: [
      {
        // Bank tower / financial district
        img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=560&q=72&auto=format&fit=crop',
        headline: 'BBCA tembus 10,050 dengan volume 3× ADV',
        summary: 'Bank Central Asia closed at a record Rp 10,075 on volume of 150.5 million shares — three times its 30-day average daily volume — after foreign investors recorded Rp 480 billion in net buying. The breakout followed BCA\'s Q1 earnings call on Tuesday where management reaffirmed full-year loan growth guidance of 9–11% and reiterated NIM resilience despite the BI hold. Brokers including Mandiri Sekuritas and BRI Danareksa raised target prices to Rp 11,200 and Rp 11,500 respectively, citing accelerating CASA mix and continued asset quality strength.',
        source: 'Bisnis', time: '14:42',
        sentiment: { tone: 'pos', label: 'Bullish', net: 72 },
      },
      {
        // Jakarta skyline at dusk
        img: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=560&q=72&auto=format&fit=crop',
        headline: 'Rupiah menguat ke 15,820 — tertinggi dua minggu',
        summary: 'The Indonesian rupiah strengthened to Rp 15,820 against the US dollar in afternoon trading — its highest level since April 22 — joining a regional EM-FX rally led by the Korean won and Thai baht as traders priced in a softer Fed path after the weak ADP private payrolls print. Bank Indonesia is widely expected to hold the BI Rate at 6.00% at tomorrow\'s decision, with consensus shifting toward an easing bias for H2 2026. The rupiah\'s strength supports further foreign inflows into IDX equities, particularly the rate-sensitive banking and consumer staples sectors.',
        source: 'CNBC Indonesia', time: '13:58',
        sentiment: { tone: 'pos', label: 'Constructive', net: 48 },
      },
      {
        // Open-pit coal mining operation
        img: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=560&q=72&auto=format&fit=crop',
        headline: 'Coal miners lag as Newcastle slips below $143/t',
        summary: 'Indonesian coal producers BYAN, ADRO, ITMG, and PTBA closed lower as the Newcastle thermal coal benchmark slipped to USD 142.80/t — its lowest since February — on softer-than-expected China April manufacturing PMI of 49.4 and rising domestic Chinese inventories. The sector spread versus the banks index widened to its largest gap in six weeks. Analysts at Citi and Macquarie flagged that further weakness in coal could pressure Q2 earnings revisions for pure-play miners, while integrated names with lower stripping ratios (notably BYAN\'s Tabang complex) remain better positioned through the cycle.',
        source: 'Kontan', time: '13:21',
        sentiment: { tone: 'neg', label: 'Bearish', net: -38 },
      },
    ],
  },
};

// ---------- STOCK-WORKSPACE FIXTURES (Indo-specific) ----------
const STOCK_FIXTURES = {
  BBCA: {
    // Foreign vs domestic vs retail flow
    flowBuckets: [
      { label: 'Foreign Inst.',   buy: 1842, sell: 421,  net: 1421,  netPct: 18.4 },
      { label: 'Domestic Inst.',  buy: 1124, sell: 1287, net: -163,  netPct: -2.1 },
      { label: 'Retail',          buy: 824,  sell: 1182, net: -358,  netPct: -4.6 },
      { label: 'Zombie / Algos',  buy: 642,  sell: 542,  net: 100,   netPct: 1.3 },
    ],
    // Top brokers (broker stalker)
    brokers: [
      { code: 'KZ',  name: 'Maybank',         buy: 482, sell: 142, net: 340, side: 'buyer' },
      { code: 'AK',  name: 'UBS',             buy: 384, sell: 124, net: 260, side: 'buyer' },
      { code: 'CC',  name: 'Mandiri Sek.',    buy: 312, sell: 168, net: 144, side: 'buyer' },
      { code: 'CG',  name: 'Citigroup',       buy: 248, sell: 112, net: 136, side: 'buyer' },
      { code: 'MG',  name: 'Semesta Indovest',buy: 64,  sell: 384, net: -320,side: 'seller'},
      { code: 'YP',  name: 'Mirae Asset',     buy: 84,  sell: 372, net: -288,side: 'seller'},
      { code: 'PD',  name: 'Indo Premier',    buy: 124, sell: 364, net: -240,side: 'seller'},
      { code: 'MQ',  name: 'Macquarie',       buy: 184, sell: 384, net: -200,side: 'seller'},
    ],
    // Holders breakdown (KSEI-style)
    holders: [
      { id: 'foreign-inst', label: 'Foreign Institution',     pct: 33.42, color: '#5B8DEF' },
      { id: 'foreign-ind',  label: 'Foreign Individual',      pct: 0.21,  color: '#86A4D5' },
      { id: 'local-inst',   label: 'Local Institution',       pct: 14.86, color: '#1FB877' },
      { id: 'local-ind',    label: 'Local Individual',        pct: 4.12,  color: '#5DD3A0' },
      { id: 'controlling',  label: 'Controlling Shareholder', pct: 47.39, color: '#F5B544' },
    ],
    topHolders: [
      { name: 'PT Dwimuria Investama Andalan',    type: 'Controlling',           pct: 54.94, shares: '67.72 B',  changeQ: 0,    asOf: 'Mar 2026' },
      { name: 'BlackRock Inc. (aggregated)',      type: 'Foreign Institution',   pct: 4.82,  shares: '5.94 B',   changeQ: 0.42, asOf: 'Mar 2026' },
      { name: 'Vanguard Group (aggregated)',      type: 'Foreign Institution',   pct: 3.21,  shares: '3.96 B',   changeQ: 0.18, asOf: 'Mar 2026' },
      { name: 'GIC Private Limited',              type: 'Foreign Institution',   pct: 2.14,  shares: '2.64 B',   changeQ: -0.06,asOf: 'Mar 2026' },
      { name: 'BPJS Ketenagakerjaan',             type: 'Local Institution',     pct: 2.04,  shares: '2.51 B',   changeQ: 0.12, asOf: 'Mar 2026' },
      { name: 'Norges Bank Investment Mgmt',      type: 'Foreign Institution',   pct: 1.61,  shares: '1.98 B',   changeQ: 0.04, asOf: 'Mar 2026' },
      { name: 'Aberdeen Standard Inv.',           type: 'Foreign Institution',   pct: 1.18,  shares: '1.45 B',   changeQ: -0.21,asOf: 'Mar 2026' },
      { name: 'Schroder Investment Mgmt',         type: 'Foreign Institution',   pct: 0.94,  shares: '1.16 B',   changeQ: 0.08, asOf: 'Mar 2026' },
    ],
    // Balance position chart-ready
    balancePosition: mkBalancePosition(40),
    // Seasonality matrix (12 months × 5 years)
    seasonality: mkSeasonality(),
    // Financials
    financials: {
      income: [
        { label: 'Net Interest Income',     y2022: 56847,  y2023: 64218,  y2024: 73456,  y2025: 81842 },
        { label: 'Non-Interest Income',     y2022: 18421,  y2023: 21346,  y2024: 24684,  y2025: 28475 },
        { label: 'Operating Income',        y2022: 75268,  y2023: 85564,  y2024: 98140,  y2025: 110317 },
        { label: 'Operating Expenses',      y2022: -28412, y2023: -31647, y2024: -35821, y2025: -39247 },
        { label: 'Provisions',              y2022: -3842,  y2023: -3214,  y2024: -2987,  y2025: -2614 },
        { label: 'Pre-Tax Profit',          y2022: 43014,  y2023: 50703,  y2024: 59332,  y2025: 68456 },
        { label: 'Net Profit',              y2022: 34182,  y2023: 40642,  y2024: 47812,  y2025: 54784 },
        { label: 'EPS (IDR)',               y2022: 277,    y2023: 330,    y2024: 388,    y2025: 444 },
      ],
      ratios: [
        { label: 'NIM',                     y2022: 5.11,   y2023: 5.42,   y2024: 5.78,   y2025: 5.94 },
        { label: 'CASA Ratio',              y2022: 80.4,   y2023: 81.2,   y2024: 81.8,   y2025: 82.6 },
        { label: 'Cost-to-Income',          y2022: 37.7,   y2023: 36.9,   y2024: 36.4,   y2025: 35.5 },
        { label: 'NPL Ratio',               y2022: 1.74,   y2023: 1.42,   y2024: 1.18,   y2025: 1.04 },
        { label: 'Coverage Ratio',          y2022: 198,    y2023: 232,    y2024: 264,    y2025: 281 },
        { label: 'CAR',                     y2022: 25.8,   y2023: 26.4,   y2024: 27.1,   y2025: 27.8 },
        { label: 'ROE',                     y2022: 18.1,   y2023: 19.4,   y2024: 20.6,   y2025: 21.4 },
        { label: 'ROA',                     y2022: 3.06,   y2023: 3.28,   y2024: 3.51,   y2025: 3.74 },
      ],
    },
    // Comparable analysis (peers)
    peers: [
      { sym: 'BBCA', name: 'Bank Central Asia', mcap: 1242, pe: 23.4, pb: 4.8, roe: 21.4, nim: 5.94, divY: 2.4, ytd: 9.6 },
      { sym: 'BMRI', name: 'Bank Mandiri',      mcap: 575,  pe: 11.8, pb: 1.9, roe: 21.2, nim: 5.42, divY: 5.3, ytd: 4.1 },
      { sym: 'BBRI', name: 'Bank Rakyat',       mcap: 822,  pe: 12.4, pb: 2.1, roe: 18.6, nim: 7.82, divY: 6.1, ytd: -1.4 },
      { sym: 'BBNI', name: 'Bank Negara Indo',  mcap: 218,  pe:  9.8, pb: 1.4, roe: 15.4, nim: 4.62, divY: 5.8, ytd: 2.8 },
      { sym: 'BNGA', name: 'CIMB Niaga',        mcap:  62,  pe:  7.4, pb: 1.0, roe: 13.8, nim: 4.84, divY: 6.6, ytd: 3.2 },
    ],
    // Risk metrics
    risk: {
      beta: 0.81, vol30: 14.2, vol1y: 18.6, var95: -2.4, sharpe: 1.42,
      drawdown1y: -8.7, drawdownMax: -42.1, correl: { ihsg: 0.78, lq45: 0.84, msci_em: 0.62, sp500: 0.34 },
    },
    // ESG
    esg: {
      msci: 'A', sustainalytics: 18.4, controversies: 'Low',
      pillars: { e: 6.4, s: 7.2, g: 8.4 },
      emissions1: 'Low', emissions2: 'Low', emissions3: 'Medium',
      sustainableFinance: 12.4,
    },
    // AI thesis
    thesis: {
      summary: 'Best-in-class Indonesian deposit franchise with structurally superior CASA generating ROE 21%+ through cycle. Trades at a premium to peers but justified by NPL leadership, capital flexibility, and operating-leverage runway from digital channel migration. Catalyst-rich: Q1 beat, buyback authorization, and sustained foreign flow.',
      bullCase: [
        'CASA ratio 82.6% (peer avg ~70%) → structural NIM advantage that compounds',
        'NPL 1.04% — lowest in IDX banks; coverage 281% provides cushion through any cycle',
        'CAR 27.8% supports incremental buybacks + dividend growth without raise',
        'Digital cost-to-income inflection with myBCA penetration > 80%',
        'Foreign net buying YTD Rp 4.8T — re-rating room as DXY softens',
      ],
      bearCase: [
        'Premium multiple (P/B 4.8x) prices in execution — earnings disappointment risk',
        'Loan growth tracking < FY guide — corporate hesitancy',
        'BI policy easing path slow vs Fed → pressure on NIM 2H',
        'Concentration risk in Jakarta-region property loans',
      ],
      catalysts: [
        { date: 'May 2026',  event: 'Q1 FY26 results',                impact: 'high', dir: 'pos' },
        { date: 'Jun 2026',  event: 'BI rate decision',               impact: 'high', dir: 'neutral' },
        { date: 'Jul 2026',  event: 'Mid-year buyback authorization', impact: 'med',  dir: 'pos' },
        { date: 'Aug 2026',  event: 'AGM dividend declaration',       impact: 'med',  dir: 'pos' },
      ],
      monteCarloPaths: mkMonteCarloPaths(20, 60),
      pt: { bull: 12500, base: 11000, bear: 9200, current: 10075 },
      conviction: 92,
      lastUpdate: 'May 1, 2026 — 14:32 WIB',
    },
  },
};

function mkBalancePosition(n) {
  const out = [];
  let net = 0;
  for (let i = 0; i < n; i++) {
    const flow = (Math.random() - 0.45) * 200;
    net += flow;
    out.push({ day: i, flow: +flow.toFixed(0), cum: +net.toFixed(0) });
  }
  return out;
}

function mkSeasonality() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = [2021, 2022, 2023, 2024, 2025];
  return years.map(y => ({
    year: y,
    months: months.map(m => ({ m, ret: +(((Math.random() - 0.42) * 12)).toFixed(2) })),
  }));
}

function mkMonteCarloPaths(nPaths, nDays) {
  const paths = [];
  for (let p = 0; p < nPaths; p++) {
    const out = [10075];
    for (let i = 1; i < nDays; i++) {
      const drift = 0.0008;
      const shock = (Math.random() - 0.5) * 0.03;
      out.push(+(out[i-1] * (1 + drift + shock)).toFixed(0));
    }
    paths.push(out);
  }
  return paths;
}

window.DATA_EXT = {
  TICKER_UNIVERSE,
  MACRO_INDICATORS,
  SCANNERS,
  SCANNER_TICKERS,
  INDUSTRY_GRAPH,
  PORTFOLIO,
  ALGOS,
  CALENDAR,
  AI_BRIEF,
  STOCK_FIXTURES,
};
