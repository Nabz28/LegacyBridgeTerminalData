// ================================================================
// Sample data for all widgets
// ================================================================

const mkCandles = (n, start, vol) => {
  const out = [];
  let px = start;
  for (let i = 0; i < n; i++) {
    const o = px;
    const change = (Math.random() - 0.48) * vol;
    const c = Math.max(o + change, 1);
    const h = Math.max(o, c) + Math.random() * vol * 0.4;
    const l = Math.min(o, c) - Math.random() * vol * 0.4;
    out.push({ o: +o.toFixed(0), h: +h.toFixed(0), l: +l.toFixed(0), c: +c.toFixed(0) });
    px = c;
  }
  return out;
};

const mkSpark = (n, up) => {
  const out = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - (up ? 0.4 : 0.6)) * 8;
    out.push(v);
  }
  return out;
};

const DATA = {
  watchlist: {
    Banks: [
      { sym: 'BBCA', name: 'Bank Central Asia', last: 10075, chg: 25, chgp: 0.25, vol: 150452, spark: mkSpark(20, true) },
      { sym: 'BBRI', name: 'Bank Rakyat Indonesia', last: 5425, chg: -50, chgp: -0.91, vol: 88214, spark: mkSpark(20, false) },
      { sym: 'BMRI', name: 'Bank Mandiri', last: 6175, chg: 75, chgp: 1.23, vol: 64203, spark: mkSpark(20, true) },
      { sym: 'BBNI', name: 'Bank Negara Indonesia', last: 5850, chg: -25, chgp: -0.43, vol: 42150, spark: mkSpark(20, false) },
      { sym: 'BBTN', name: 'Bank Tabungan Negara', last: 1285, chg: 15, chgp: 1.18, vol: 31420, spark: mkSpark(20, true) },
      { sym: 'BRIS', name: 'Bank Syariah Indonesia', last: 2420, chg: 40, chgp: 1.68, vol: 28104, spark: mkSpark(20, true) },
      { sym: 'ARTO', name: 'Bank Jago', last: 2870, chg: -45, chgp: -1.54, vol: 22380, spark: mkSpark(20, false) },
      { sym: 'BJBR', name: 'Bank Jabar Banten', last: 1085, chg: 5, chgp: 0.46, vol: 18205, spark: mkSpark(20, true) },
    ],
    Tech: [
      { sym: 'GOTO', name: 'GoTo Gojek Tokopedia', last: 82, chg: 1, chgp: 1.23, vol: 420150, spark: mkSpark(20, true) },
      { sym: 'BUKA', name: 'Bukalapak.com', last: 145, chg: -3, chgp: -2.02, vol: 215420, spark: mkSpark(20, false) },
      { sym: 'EMTK', name: 'Elang Mahkota Teknologi', last: 482, chg: 8, chgp: 1.69, vol: 42850, spark: mkSpark(20, true) },
      { sym: 'MTEL', name: 'Dayamitra Telekomunikasi', last: 685, chg: -5, chgp: -0.72, vol: 32150, spark: mkSpark(20, false) },
      { sym: 'TLKM', name: 'Telkom Indonesia', last: 3720, chg: 40, chgp: 1.09, vol: 42018, spark: mkSpark(20, true) },
    ],
    Energy: [
      { sym: 'ADRO', name: 'Adaro Energy', last: 2480, chg: 20, chgp: 0.81, vol: 54320, spark: mkSpark(20, true) },
      { sym: 'PTBA', name: 'Bukit Asam', last: 2720, chg: -30, chgp: -1.09, vol: 28420, spark: mkSpark(20, false) },
      { sym: 'ITMG', name: 'Indo Tambangraya Megah', last: 25650, chg: 450, chgp: 1.79, vol: 8240, spark: mkSpark(20, true) },
      { sym: 'MEDC', name: 'Medco Energi', last: 1210, chg: 10, chgp: 0.83, vol: 42150, spark: mkSpark(20, true) },
    ],
    Crypto: [
      { sym: 'BTC', name: 'Bitcoin', last: 84215, chg: 1240, chgp: 1.49, vol: 24850000, spark: mkSpark(20, true) },
      { sym: 'ETH', name: 'Ethereum', last: 3285, chg: -48, chgp: -1.44, vol: 12420000, spark: mkSpark(20, false) },
      { sym: 'SOL', name: 'Solana', last: 168.42, chg: 4.2, chgp: 2.56, vol: 4820000, spark: mkSpark(20, true) },
      { sym: 'BNB', name: 'BNB', last: 612.40, chg: 8.20, chgp: 1.36, vol: 1820000, spark: mkSpark(20, true) },
      { sym: 'XRP', name: 'XRP', last: 0.582, chg: -0.011, chgp: -1.85, vol: 8420000, spark: mkSpark(20, false) },
    ],
    Commodities: [
      { sym: 'WTI',   name: 'WTI Crude Oil',         last: 82.40,   chg: -0.90,  chgp: -1.08, vol: 415200, spark: mkSpark(20, false) },
      { sym: 'BRENT', name: 'Brent Crude',           last: 86.15,   chg: -0.72,  chgp: -0.83, vol: 382150, spark: mkSpark(20, false) },
      { sym: 'GOLD',  name: 'Gold (XAU/USD)',        last: 2385.20, chg: 15.10,  chgp: 0.64,  vol: 184250, spark: mkSpark(20, true) },
      { sym: 'SILVR', name: 'Silver (XAG/USD)',      last: 28.42,   chg: 0.31,   chgp: 1.10,  vol: 92400,  spark: mkSpark(20, true) },
      { sym: 'COAL',  name: 'Newcastle Thermal Coal',last: 142.80,  chg: -1.40,  chgp: -0.97, vol: 18250,  spark: mkSpark(20, false) },
      { sym: 'CPO',   name: 'Crude Palm Oil',        last: 4180,    chg: 35,     chgp: 0.84,  vol: 21500,  spark: mkSpark(20, true) },
      { sym: 'NICKEL',name: 'Nickel LME',            last: 18420,   chg: 215,    chgp: 1.18,  vol: 8420,   spark: mkSpark(20, true) },
      { sym: 'COPPER',name: 'Copper LME',            last: 9842,    chg: -48,    chgp: -0.49, vol: 12420,  spark: mkSpark(20, false) },
    ],
  },

  trades: Array.from({ length: 40 }, (_, i) => ({
    time: `14:${58 - Math.floor(i/3)}:${String(48 - (i%3)*17).padStart(2,'0')}`,
    px: 10075 + Math.floor((Math.random() - 0.5) * 40),
    qty: Math.floor(Math.random() * 50) + 1,
    dir: Math.random() > 0.5 ? 'B' : 'S',
  })),

  orderbook: {
    bids: Array.from({ length: 12 }, (_, i) => ({
      px: 10070 - i * 5,
      lot: Math.floor(Math.random() * 15000) + 500,
      freq: Math.floor(Math.random() * 30) + 1,
      vol: Math.floor(Math.random() * 15000) + 500,
    })),
    asks: Array.from({ length: 12 }, (_, i) => ({
      px: 10080 + i * 5,
      lot: Math.floor(Math.random() * 15000) + 500,
      freq: Math.floor(Math.random() * 30) + 1,
      vol: Math.floor(Math.random() * 15000) + 500,
    })),
    bidTotal: 150452,
    askTotal: 285455,
  },

  candles: mkCandles(80, 9800, 180),

  financials: {
    'Income Statement': [
      { label: 'Total Revenue', values: ['24,536 B', '27,092 B', '26,455 B', '25,660 B'], bold: true },
      { label: 'Total Cost Of Goods Sold', values: ['(3,045 B)', '(3,378 B)', '(3,156 B)', '(3,083 B)'], indent: true },
      { label: 'Gross Profit', values: ['21,498 B', '23,719 B', '23,304 B', '22,582 B'], bold: true },
      { label: 'Total Operating Expense', values: ['(6,293 B)', '(7,596 B)', '(7,641 B)', '(8,261 B)'], indent: true },
      { label: 'Income From Operations', values: ['15,170 B', '15,127 B', '15,663 B', '14,220 B'], bold: true },
      { label: 'Non-Operating Income/Expense', values: ['0', '0', '0', '0'], indent: true },
      { label: 'Income Before Tax', values: ['15,170 B', '15,127 B', '15,663 B', '14,220 B'], bold: true },
      { label: 'Tax Expense', values: ['(2,852 B)', '(2,878 B)', '(3,665 B)', '(2,786 B)'], indent: true },
      { label: 'Net Income For The Period', values: ['12,318 B', '12,248 B', '11,998 B', '11,435 B'], bold: true },
      { label: 'Other Comprehensive Income', values: ['(48 B)', '72 B', '120 B', '64 B'], indent: true },
    ],
    'Balance Sheet': [
      { label: 'Total Assets', values: ['1,312.4 T', '1,298.1 T', '1,271.8 T', '1,248.5 T'], bold: true },
      { label: 'Current Assets', values: ['842.1 T', '828.5 T', '814.2 T', '792.8 T'], indent: true },
      { label: 'Total Liabilities', values: ['1,071.2 T', '1,058.4 T', '1,035.8 T', '1,015.6 T'], bold: true },
      { label: 'Current Liabilities', values: ['928.5 T', '915.2 T', '893.8 T', '872.4 T'], indent: true },
      { label: 'Total Equity', values: ['241.2 T', '239.7 T', '236.0 T', '232.9 T'], bold: true },
    ],
    'Cash Flow': [
      { label: 'Operating Cash Flow', values: ['18,420 B', '16,280 B', '17,540 B', '15,980 B'], bold: true },
      { label: 'Investing Cash Flow', values: ['(4,250 B)', '(3,820 B)', '(5,120 B)', '(4,480 B)'], indent: true },
      { label: 'Financing Cash Flow', values: ['(8,140 B)', '(7,280 B)', '(6,920 B)', '(5,840 B)'], indent: true },
      { label: 'Net Cash Flow', values: ['6,030 B', '5,180 B', '5,500 B', '5,660 B'], bold: true },
    ],
  },

  heatmapRows: [
    'Asset Turnover (TTM)',
    'Days Inventory (Quarter)',
    'Days Payables Outstanding (Quarter)',
    'Cash Conversion Cycle (Quarter)',
    'Receivables Turnover (Quarter)',
    'Current Ratio (Quarter)',
    'Quick Ratio (Quarter)',
    'Debt to Equity Ratio (Quarter)',
    'LT Debt/Equity (Quarter)',
    'Net Profit Margin',
    'Operating Margin',
    'Return on Assets',
    'Return on Equity',
    'Gross Margin',
  ],

  metrics: [
    { label: 'NASDAQ',   sub: 'NASDAQ Composite',        value: '24,244.35', delta: -0.66, spark: mkSpark(20, false) },
    { label: 'S&P 500',  sub: 'Standard and Poor\u2019s 500', value: '7,064.77',  delta: -0.62, spark: mkSpark(20, false) },
    { label: 'IHSG',     sub: 'Jakarta Composite Index', value: '7,283.51',  delta:  1.21, spark: mkSpark(20, true) },
    { label: 'USD / IDR',sub: 'US Dollar to Rupiah',     value: '15,820',    delta: -0.18, spark: mkSpark(20, false) },
    { label: 'WTI Crude',sub: 'West Texas Intermediate', value: '$82.40',    delta: -1.08, spark: mkSpark(20, false) },
    { label: 'Gold',     sub: 'Spot Gold (oz)',          value: '$2,385.20', delta:  0.64, spark: mkSpark(20, true) },
    { label: 'BTC',      sub: 'Bitcoin / USD',           value: '$84,215',   delta:  1.49, spark: mkSpark(20, true) },
  ],

  news: [
    { source: 'Reuters', time: '14:52', headline: 'BCA Q1 net profit climbs 11.7% YoY on stronger loan growth, beats consensus', tickers: ['BBCA'], tag: 'EARNINGS', tagColor: 'pos' },
    { source: 'Bloomberg', time: '14:38', headline: 'Indonesia central bank holds benchmark rate at 6.00% for fourth straight meeting', tickers: ['IHSG'], tag: 'MACRO', tagColor: 'info' },
    { source: 'Internal', time: '14:22', headline: 'Alert triggered: BBCA broke above 10,050 resistance on 3× average volume', tickers: ['BBCA'], tag: 'ALERT', tagColor: 'pos' },
    { source: 'CNBC', time: '13:55', headline: 'Astra International shares slide after preliminary Q1 auto sales miss estimates', tickers: ['ASII'], tag: 'EARNINGS', tagColor: 'neg' },
    { source: 'Reuters', time: '13:20', headline: 'Rupiah strengthens to two-week high as dollar softens on cooling inflation data' },
    { source: 'Bloomberg', time: '12:48', headline: 'Telkom Indonesia announces $280M data center expansion partnership with Singtel', tickers: ['TLKM'] },
    { source: 'Internal', time: '12:10', headline: 'Watchlist "Energy" down 1.2% — second worst performing group today', tag: 'INSIGHT', tagColor: 'info' },
    { source: 'Nikkei', time: '11:40', headline: 'Indonesian nickel export quota increased by 8% for Q2, supporting metal producers' },
    { source: 'Reuters', time: '11:15', headline: 'GoTo posts narrower quarterly loss as cost discipline begins to pay off', tickers: ['GOTO'], tag: 'EARNINGS' },
    { source: 'Bloomberg', time: '10:48', headline: 'IDX Composite hits fresh all-time high intraday, extends YTD gain to 4.2%', tickers: ['IHSG'], tag: 'MARKET', tagColor: 'pos' },
  ],
};

window.DATA = DATA;
