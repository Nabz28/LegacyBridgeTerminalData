// ================================================================
// MONITOR · Coverage data — the LBC Research Division operating map.
//
// Implements the July-2026 coverage redesign (LBC_Research_Division_
// Coverage_Design.docx) with the recommended 10 specialist equity desks
// as the live structure, PLUS the three market desks the restructure
// adds on top (FX, Rates & Credit, Economics). 13 desks total, MECE
// over every public company + the macro/markets surfaces LBC monitors.
//
// Symbology: every instrument carries up to two ids —
//   t  : Yahoo Finance symbol (quotes + history via the Supabase
//        edge fns equity-quote / series-proxy; keyless, CORS-open)
//   tv : TradingView symbol (live streaming widgets)
// Rows missing one id degrade gracefully (TV-only rows appear in
// widgets, Yahoo-only rows in quote tables / custom indices).
//
// c = ISO country of primary listing/exposure. Regions derive from
// COUNTRIES; ASEAN is a subregion flag so filters can telescope
// Global → region → ASEAN → Indonesia.
// ================================================================
(function () {
  'use strict';

  // ---- countries & regions ------------------------------------------------
  // r: AM=Americas, EU=Europe, AP=Asia-Pacific, ME=Middle East & Africa
  var COUNTRIES = {
    US: { n: 'United States', r: 'AM', f: '🇺🇸' },
    CA: { n: 'Canada', r: 'AM', f: '🇨🇦' },
    BR: { n: 'Brazil', r: 'AM', f: '🇧🇷' },
    MX: { n: 'Mexico', r: 'AM', f: '🇲🇽' },
    GB: { n: 'United Kingdom', r: 'EU', f: '🇬🇧' },
    DE: { n: 'Germany', r: 'EU', f: '🇩🇪' },
    FR: { n: 'France', r: 'EU', f: '🇫🇷' },
    NL: { n: 'Netherlands', r: 'EU', f: '🇳🇱' },
    CH: { n: 'Switzerland', r: 'EU', f: '🇨🇭' },
    ES: { n: 'Spain', r: 'EU', f: '🇪🇸' },
    IT: { n: 'Italy', r: 'EU', f: '🇮🇹' },
    SE: { n: 'Sweden', r: 'EU', f: '🇸🇪' },
    DK: { n: 'Denmark', r: 'EU', f: '🇩🇰' },
    JP: { n: 'Japan', r: 'AP', f: '🇯🇵' },
    CN: { n: 'China', r: 'AP', f: '🇨🇳' },
    HK: { n: 'Hong Kong', r: 'AP', f: '🇭🇰' },
    TW: { n: 'Taiwan', r: 'AP', f: '🇹🇼' },
    KR: { n: 'South Korea', r: 'AP', f: '🇰🇷' },
    IN: { n: 'India', r: 'AP', f: '🇮🇳' },
    AU: { n: 'Australia', r: 'AP', f: '🇦🇺' },
    SG: { n: 'Singapore', r: 'AP', f: '🇸🇬', asean: true },
    ID: { n: 'Indonesia', r: 'AP', f: '🇮🇩', asean: true },
    MY: { n: 'Malaysia', r: 'AP', f: '🇲🇾', asean: true },
    TH: { n: 'Thailand', r: 'AP', f: '🇹🇭', asean: true },
    PH: { n: 'Philippines', r: 'AP', f: '🇵🇭', asean: true },
    VN: { n: 'Vietnam', r: 'AP', f: '🇻🇳', asean: true },
    SA: { n: 'Saudi Arabia', r: 'ME', f: '🇸🇦' },
    ZA: { n: 'South Africa', r: 'ME', f: '🇿🇦' },
  };

  var REGION_FILTERS = [
    { id: 'ALL', label: 'Global' },
    { id: 'AM', label: 'Americas' },
    { id: 'EU', label: 'Europe' },
    { id: 'AP', label: 'Asia-Pacific' },
    { id: 'ASEAN', label: 'ASEAN' },
    { id: 'ID', label: 'Indonesia' },
  ];

  function inRegion(c, filterId) {
    if (!filterId || filterId === 'ALL') return true;
    var meta = COUNTRIES[c];
    if (!meta) return false;
    if (filterId === 'ID') return c === 'ID';
    if (filterId === 'ASEAN') return !!meta.asean;
    return meta.r === filterId;
  }

  // ---- the 13 desks -------------------------------------------------------
  // Equity desks E1–E10 follow the doc's recommended 10-team model; the
  // dossier fields condense that doc's 17-point profiles. Market desks
  // M1–M3 implement the "Strategy & Macro layer" + the FX/bond expansion.
  var DESKS = [

    // ============ E1 · FINANCIAL INSTITUTIONS ============
    {
      id: 'fig', num: 'E1', group: 'equity', accent: '#6f9cf2',
      name: 'Financial Institutions',
      short: 'Banks · insurance · NBFI · capital markets · fintech',
      gics: 'Financials (ex-Real Estate)',
      dossier: {
        mandate: 'All financial institutions globally: commercial/digital/sharia banks, life & general insurance, multifinance & consumer credit, brokers, asset & wealth management, exchanges, fintech & payments.',
        macro: 'Policy rates & yield curve (Fed/ECB/BI) · credit cycle · liquidity & inflation · asset quality (NPL) · capital regulation.',
        themes: 'Digital banking & neobanks · BNPL/fintech disruption · bank consolidation · Basel III/IV · financial inclusion · EM insurance penetration.',
        factors: 'NIM · loan growth · CASA & cost of funds · NPL & cost of credit · CAR · ROE · cost-to-income · combined ratio & embedded value (insurance).',
        valuation: 'P/B · P/TBV · ROE-driven Gordon Growth · DDM · Residual Income · P/E · P/EV (insurance).',
        regulation: 'OJK · Bank Indonesia · Basel III/IV · IFRS 9 / PSAK 71 (ECL) · LCR/NSFR · fintech/P2P rules.',
        complexity: 'High — leveraged balance sheets, regulation-sensitive, sector-specific models (not standard DCF).',
      },
      bench: [
        { label: 'US Financials (XLF)', y: 'XLF', tv: 'AMEX:XLF', region: 'US' },
        { label: 'US Banks (KBE)', y: 'KBE', tv: 'AMEX:KBE', region: 'US' },
        { label: 'US Regional Banks (KRE)', y: 'KRE', tv: 'AMEX:KRE', region: 'US' },
        { label: 'Europe Financials (EUFN)', y: 'EUFN', tv: 'NASDAQ:EUFN', region: 'Europe' },
        { label: 'Global Financials (IXG)', y: 'IXG', tv: 'AMEX:IXG', region: 'Global' },
        { label: 'IDX Financials', tv: 'IDX:IDXFINANCE', region: 'ID' },
      ],
      subs: [
        { id: 'banks', name: 'Banking', note: 'Commercial, digital & sharia banks', u: [
          { t: 'JPM', tv: 'NYSE:JPM', n: 'JPMorgan Chase', c: 'US' },
          { t: 'BAC', tv: 'NYSE:BAC', n: 'Bank of America', c: 'US' },
          { t: 'WFC', tv: 'NYSE:WFC', n: 'Wells Fargo', c: 'US' },
          { t: 'C', tv: 'NYSE:C', n: 'Citigroup', c: 'US' },
          { t: 'GS', tv: 'NYSE:GS', n: 'Goldman Sachs', c: 'US' },
          { t: 'MS', tv: 'NYSE:MS', n: 'Morgan Stanley', c: 'US' },
          { t: 'HSBC', tv: 'NYSE:HSBC', n: 'HSBC Holdings', c: 'GB' },
          { t: 'UBS', tv: 'NYSE:UBS', n: 'UBS Group', c: 'CH' },
          { t: 'SAN', tv: 'NYSE:SAN', n: 'Banco Santander', c: 'ES' },
          { t: 'RY', tv: 'NYSE:RY', n: 'Royal Bank of Canada', c: 'CA' },
          { t: 'ITUB', tv: 'NYSE:ITUB', n: 'Itaú Unibanco', c: 'BR' },
          { t: 'MUFG', tv: 'NYSE:MUFG', n: 'Mitsubishi UFJ', c: 'JP' },
          { t: 'SMFG', tv: 'NYSE:SMFG', n: 'Sumitomo Mitsui', c: 'JP' },
          { t: 'HDB', tv: 'NYSE:HDB', n: 'HDFC Bank', c: 'IN' },
          { t: '1398.HK', tv: 'HKEX:1398', n: 'ICBC', c: 'CN' },
          { t: '0939.HK', tv: 'HKEX:939', n: 'China Construction Bank', c: 'CN' },
          { t: 'D05.SI', tv: 'SGX:D05', n: 'DBS Group', c: 'SG' },
          { t: 'CBA.AX', tv: 'ASX:CBA', n: 'Commonwealth Bank', c: 'AU' },
          { t: 'BBCA.JK', tv: 'IDX:BBCA', n: 'Bank Central Asia', c: 'ID' },
          { t: 'BBRI.JK', tv: 'IDX:BBRI', n: 'Bank Rakyat Indonesia', c: 'ID' },
          { t: 'BMRI.JK', tv: 'IDX:BMRI', n: 'Bank Mandiri', c: 'ID' },
          { t: 'BBNI.JK', tv: 'IDX:BBNI', n: 'Bank Negara Indonesia', c: 'ID' },
          { t: 'BRIS.JK', tv: 'IDX:BRIS', n: 'Bank Syariah Indonesia', c: 'ID' },
          { t: 'ARTO.JK', tv: 'IDX:ARTO', n: 'Bank Jago', c: 'ID' },
          { t: 'BBTN.JK', tv: 'IDX:BBTN', n: 'Bank Tabungan Negara', c: 'ID' },
          { t: 'BNGA.JK', tv: 'IDX:BNGA', n: 'CIMB Niaga', c: 'ID' },
        ] },
        { id: 'insurance', name: 'Insurance', note: 'Life, general & reinsurance', u: [
          { t: 'BRK-B', tv: 'NYSE:BRK.B', n: 'Berkshire Hathaway', c: 'US' },
          { t: 'PGR', tv: 'NYSE:PGR', n: 'Progressive', c: 'US' },
          { t: 'CB', tv: 'NYSE:CB', n: 'Chubb', c: 'US' },
          { t: 'MET', tv: 'NYSE:MET', n: 'MetLife', c: 'US' },
          { t: 'ALV.DE', tv: 'XETR:ALV', n: 'Allianz', c: 'DE' },
          { t: 'MUV2.DE', tv: 'XETR:MUV2', n: 'Munich Re', c: 'DE' },
          { t: 'CS.PA', tv: 'EURONEXT:CS', n: 'AXA', c: 'FR' },
          { t: 'ZURN.SW', tv: 'SIX:ZURN', n: 'Zurich Insurance', c: 'CH' },
          { t: 'PRU.L', tv: 'LSE:PRU', n: 'Prudential plc', c: 'GB' },
          { t: '1299.HK', tv: 'HKEX:1299', n: 'AIA Group', c: 'HK' },
          { t: '2318.HK', tv: 'HKEX:2318', n: 'Ping An Insurance', c: 'CN' },
          { t: '8766.T', tv: 'TSE:8766', n: 'Tokio Marine', c: 'JP' },
          { t: 'PNLF.JK', tv: 'IDX:PNLF', n: 'Panin Financial', c: 'ID' },
          { t: 'TUGU.JK', tv: 'IDX:TUGU', n: 'Tugu Pratama', c: 'ID' },
        ] },
        { id: 'nbfi', name: 'Consumer & Specialty Finance', note: 'Multifinance, cards, consumer credit', u: [
          { t: 'AXP', tv: 'NYSE:AXP', n: 'American Express', c: 'US' },
          { t: 'COF', tv: 'NYSE:COF', n: 'Capital One', c: 'US' },
          { t: 'SYF', tv: 'NYSE:SYF', n: 'Synchrony Financial', c: 'US' },
          { t: 'SOFI', tv: 'NASDAQ:SOFI', n: 'SoFi Technologies', c: 'US' },
          { t: 'BFIN.JK', tv: 'IDX:BFIN', n: 'BFI Finance', c: 'ID' },
          { t: 'ADMF.JK', tv: 'IDX:ADMF', n: 'Adira Dinamika', c: 'ID' },
          { t: 'BTPS.JK', tv: 'IDX:BTPS', n: 'BTPN Syariah', c: 'ID' },
        ] },
        { id: 'capmkts', name: 'Capital Markets & Asset Mgmt', note: 'Brokers, AM, exchanges', u: [
          { t: 'BLK', tv: 'NYSE:BLK', n: 'BlackRock', c: 'US' },
          { t: 'BX', tv: 'NYSE:BX', n: 'Blackstone', c: 'US' },
          { t: 'KKR', tv: 'NYSE:KKR', n: 'KKR & Co', c: 'US' },
          { t: 'SCHW', tv: 'NYSE:SCHW', n: 'Charles Schwab', c: 'US' },
          { t: 'ICE', tv: 'NYSE:ICE', n: 'Intercontinental Exchange', c: 'US' },
          { t: 'CME', tv: 'NASDAQ:CME', n: 'CME Group', c: 'US' },
          { t: 'NDAQ', tv: 'NASDAQ:NDAQ', n: 'Nasdaq Inc', c: 'US' },
          { t: '0388.HK', tv: 'HKEX:388', n: 'HK Exchanges', c: 'HK' },
          { t: 'LSEG.L', tv: 'LSE:LSEG', n: 'London Stock Exchange', c: 'GB' },
          { t: 'DB1.DE', tv: 'XETR:DB1', n: 'Deutsche Börse', c: 'DE' },
          { t: 'S68.SI', tv: 'SGX:S68', n: 'Singapore Exchange', c: 'SG' },
          { t: 'PANS.JK', tv: 'IDX:PANS', n: 'Panin Sekuritas', c: 'ID' },
        ] },
        { id: 'fintech', name: 'Fintech & Payments', note: 'Rails, wallets, digital lending', u: [
          { t: 'V', tv: 'NYSE:V', n: 'Visa', c: 'US' },
          { t: 'MA', tv: 'NYSE:MA', n: 'Mastercard', c: 'US' },
          { t: 'PYPL', tv: 'NASDAQ:PYPL', n: 'PayPal', c: 'US' },
          { t: 'XYZ', tv: 'NYSE:XYZ', n: 'Block', c: 'US' },
          { t: 'FI', tv: 'NYSE:FI', n: 'Fiserv', c: 'US' },
          { t: 'COIN', tv: 'NASDAQ:COIN', n: 'Coinbase', c: 'US' },
          { t: 'NU', tv: 'NYSE:NU', n: 'Nu Holdings', c: 'BR' },
          { t: 'ADYEN.AS', tv: 'EURONEXT:ADYEN', n: 'Adyen', c: 'NL' },
          { t: 'WISE.L', tv: 'LSE:WISE', n: 'Wise', c: 'GB' },
        ] },
      ],
    },

    // ============ E2 · REAL ESTATE & PROPERTY ============
    {
      id: 'rep', num: 'E2', group: 'equity', accent: '#d4a04f',
      name: 'Real Estate & Property',
      short: 'Developers · REITs · industrial estates · data-center REITs',
      gics: 'Real Estate',
      dossier: {
        mandate: 'Global real estate: residential & commercial developers, REITs across retail/office/logistics/hospitality, industrial estates, data-center REITs, property management.',
        macro: 'Policy & mortgage rates · property prices · urbanization & demographics · cap rates & yield spreads · liquidity.',
        themes: 'Logistics & data-center shift · office stress · recurring vs development income · EM urbanization · green building.',
        factors: 'Marketing sales · backlog & landbank · recurring income · occupancy · cap rate · LTV & gearing · yield spread vs funding cost.',
        valuation: 'RNAV/NAV & P/NAV · FFO/AFFO (REITs) · cap rate · DDM · project DCF.',
        regulation: 'LTV/DP rules · property tax incentives (PPN DTP/BPHTB) · zoning & land permits · REIT/DIRE rules · foreign ownership.',
        complexity: 'Medium-high — rate & cycle sensitive, asset-based valuation, but standardized models.',
      },
      bench: [
        { label: 'US Real Estate (XLRE)', y: 'XLRE', tv: 'AMEX:XLRE', region: 'US' },
        { label: 'US REITs (VNQ)', y: 'VNQ', tv: 'AMEX:VNQ', region: 'US' },
        { label: 'Global REITs (REET)', y: 'REET', tv: 'AMEX:REET', region: 'Global' },
        { label: 'IDX Property', tv: 'IDX:IDXPROPERT', region: 'ID' },
      ],
      subs: [
        { id: 'developers', name: 'Developers', note: 'Residential & mixed-use', u: [
          { t: '0016.HK', tv: 'HKEX:16', n: 'Sun Hung Kai Properties', c: 'HK' },
          { t: '1113.HK', tv: 'HKEX:1113', n: 'CK Asset', c: 'HK' },
          { t: 'VNA.DE', tv: 'XETR:VNA', n: 'Vonovia', c: 'DE' },
          { t: 'DLF.NS', tv: 'NSE:DLF', n: 'DLF Limited', c: 'IN' },
          { t: 'BSDE.JK', tv: 'IDX:BSDE', n: 'Bumi Serpong Damai', c: 'ID' },
          { t: 'CTRA.JK', tv: 'IDX:CTRA', n: 'Ciputra Development', c: 'ID' },
          { t: 'SMRA.JK', tv: 'IDX:SMRA', n: 'Summarecon Agung', c: 'ID' },
          { t: 'PWON.JK', tv: 'IDX:PWON', n: 'Pakuwon Jati', c: 'ID' },
          { t: 'LPKR.JK', tv: 'IDX:LPKR', n: 'Lippo Karawaci', c: 'ID' },
        ] },
        { id: 'reits', name: 'REITs', note: 'Retail, office, storage, healthcare', u: [
          { t: 'PLD', tv: 'NYSE:PLD', n: 'Prologis', c: 'US' },
          { t: 'SPG', tv: 'NYSE:SPG', n: 'Simon Property', c: 'US' },
          { t: 'O', tv: 'NYSE:O', n: 'Realty Income', c: 'US' },
          { t: 'PSA', tv: 'NYSE:PSA', n: 'Public Storage', c: 'US' },
          { t: 'WELL', tv: 'NYSE:WELL', n: 'Welltower', c: 'US' },
          { t: 'C38U.SI', tv: 'SGX:C38U', n: 'CapitaLand Integrated', c: 'SG' },
          { t: 'A17U.SI', tv: 'SGX:A17U', n: 'CapitaLand Ascendas', c: 'SG' },
        ] },
        { id: 'industrial', name: 'Industrial Estates & Logistics', note: 'Estates, warehousing', u: [
          { t: 'GMG.AX', tv: 'ASX:GMG', n: 'Goodman Group', c: 'AU' },
          { t: 'M44U.SI', tv: 'SGX:M44U', n: 'Mapletree Logistics', c: 'SG' },
          { t: 'DMAS.JK', tv: 'IDX:DMAS', n: 'Puradelta Lestari', c: 'ID' },
          { t: 'SSIA.JK', tv: 'IDX:SSIA', n: 'Surya Semesta Internusa', c: 'ID' },
          { t: 'KIJA.JK', tv: 'IDX:KIJA', n: 'Kawasan Industri Jababeka', c: 'ID' },
        ] },
        { id: 'dcreit', name: 'Data-Center REITs', note: 'Digital infrastructure real estate', u: [
          { t: 'EQIX', tv: 'NASDAQ:EQIX', n: 'Equinix', c: 'US' },
          { t: 'DLR', tv: 'NYSE:DLR', n: 'Digital Realty', c: 'US' },
          { t: 'GDS', tv: 'NASDAQ:GDS', n: 'GDS Holdings', c: 'CN' },
        ] },
      ],
    },

    // ============ E3 · TECHNOLOGY ============
    {
      id: 'tech', num: 'E3', group: 'equity', accent: '#8b7cf0',
      name: 'Technology',
      short: 'Semis · hardware · software · IT services · cyber · cloud',
      gics: 'Information Technology',
      dossier: {
        mandate: 'Hard & soft technology: semiconductors & equipment, hardware/devices, software & SaaS, IT services, cybersecurity, cloud & data-center infrastructure.',
        macro: 'Global tech capex · semiconductor cycle · rates (growth valuations) · USD · chip export controls.',
        themes: 'Generative AI & data-center capex · chip cycle · cloud migration · SaaS monetization · tech sovereignty & onshoring.',
        factors: 'ARR growth & net revenue retention · gross margin · Rule of 40 · fab capex/utilization · R&D intensity · unit economics.',
        valuation: 'DCF · EV/Sales · EV/EBITDA · PEG · Rule of 40 (SaaS) · SOTP · real options for R&D.',
        regulation: 'Chip export controls (US–China) · data privacy (GDPR / UU PDP) · antitrust · semiconductor incentives · data localization.',
        complexity: 'High — fast-moving, many pre-profit names, growth-assumption sensitive.',
      },
      bench: [
        { label: 'US Tech (XLK)', y: 'XLK', tv: 'AMEX:XLK', region: 'US' },
        { label: 'Semiconductors (SMH)', y: 'SMH', tv: 'NASDAQ:SMH', region: 'Global' },
        { label: 'Nasdaq 100 (QQQ)', y: 'QQQ', tv: 'NASDAQ:QQQ', region: 'US' },
        { label: 'Software (IGV)', y: 'IGV', tv: 'BATS:IGV', region: 'US' },
        { label: 'IDX Technology', tv: 'IDX:IDXTECHNO', region: 'ID' },
      ],
      subs: [
        { id: 'semis', name: 'Semiconductors & Equipment', note: 'Design → foundry → OSAT chain', u: [
          { t: 'NVDA', tv: 'NASDAQ:NVDA', n: 'NVIDIA', c: 'US' },
          { t: 'AVGO', tv: 'NASDAQ:AVGO', n: 'Broadcom', c: 'US' },
          { t: 'AMD', tv: 'NASDAQ:AMD', n: 'AMD', c: 'US' },
          { t: 'INTC', tv: 'NASDAQ:INTC', n: 'Intel', c: 'US' },
          { t: 'QCOM', tv: 'NASDAQ:QCOM', n: 'Qualcomm', c: 'US' },
          { t: 'TXN', tv: 'NASDAQ:TXN', n: 'Texas Instruments', c: 'US' },
          { t: 'MU', tv: 'NASDAQ:MU', n: 'Micron', c: 'US' },
          { t: 'ARM', tv: 'NASDAQ:ARM', n: 'Arm Holdings', c: 'GB' },
          { t: 'TSM', tv: 'NYSE:TSM', n: 'TSMC', c: 'TW' },
          { t: 'ASML', tv: 'NASDAQ:ASML', n: 'ASML', c: 'NL' },
          { t: '005930.KS', tv: 'KRX:005930', n: 'Samsung Electronics', c: 'KR' },
          { t: '000660.KS', tv: 'KRX:000660', n: 'SK Hynix', c: 'KR' },
          { t: '8035.T', tv: 'TSE:8035', n: 'Tokyo Electron', c: 'JP' },
          { t: '2454.TW', tv: 'TWSE:2454', n: 'MediaTek', c: 'TW' },
        ] },
        { id: 'hardware', name: 'Hardware & Devices', note: 'Consumer & enterprise hardware', u: [
          { t: 'AAPL', tv: 'NASDAQ:AAPL', n: 'Apple', c: 'US' },
          { t: 'DELL', tv: 'NYSE:DELL', n: 'Dell Technologies', c: 'US' },
          { t: 'HPQ', tv: 'NYSE:HPQ', n: 'HP Inc', c: 'US' },
          { t: '6758.T', tv: 'TSE:6758', n: 'Sony Group', c: 'JP' },
          { t: '1810.HK', tv: 'HKEX:1810', n: 'Xiaomi', c: 'CN' },
          { t: '0992.HK', tv: 'HKEX:992', n: 'Lenovo', c: 'CN' },
        ] },
        { id: 'software', name: 'Software & SaaS', note: 'Platforms, apps, AI software', u: [
          { t: 'MSFT', tv: 'NASDAQ:MSFT', n: 'Microsoft', c: 'US' },
          { t: 'ORCL', tv: 'NYSE:ORCL', n: 'Oracle', c: 'US' },
          { t: 'SAP', tv: 'NYSE:SAP', n: 'SAP', c: 'DE' },
          { t: 'CRM', tv: 'NYSE:CRM', n: 'Salesforce', c: 'US' },
          { t: 'NOW', tv: 'NYSE:NOW', n: 'ServiceNow', c: 'US' },
          { t: 'ADBE', tv: 'NASDAQ:ADBE', n: 'Adobe', c: 'US' },
          { t: 'INTU', tv: 'NASDAQ:INTU', n: 'Intuit', c: 'US' },
          { t: 'SNOW', tv: 'NYSE:SNOW', n: 'Snowflake', c: 'US' },
          { t: 'PLTR', tv: 'NASDAQ:PLTR', n: 'Palantir', c: 'US' },
          { t: 'SHOP', tv: 'NYSE:SHOP', n: 'Shopify', c: 'CA' },
        ] },
        { id: 'cyber', name: 'Cybersecurity', note: 'Network, endpoint, identity', u: [
          { t: 'PANW', tv: 'NASDAQ:PANW', n: 'Palo Alto Networks', c: 'US' },
          { t: 'CRWD', tv: 'NASDAQ:CRWD', n: 'CrowdStrike', c: 'US' },
          { t: 'FTNT', tv: 'NASDAQ:FTNT', n: 'Fortinet', c: 'US' },
          { t: 'ZS', tv: 'NASDAQ:ZS', n: 'Zscaler', c: 'US' },
        ] },
        { id: 'itserv', name: 'IT Services', note: 'Consulting & integration', u: [
          { t: 'ACN', tv: 'NYSE:ACN', n: 'Accenture', c: 'US' },
          { t: 'IBM', tv: 'NYSE:IBM', n: 'IBM', c: 'US' },
          { t: 'INFY', tv: 'NYSE:INFY', n: 'Infosys', c: 'IN' },
          { t: 'TCS.NS', tv: 'NSE:TCS', n: 'Tata Consultancy', c: 'IN' },
          { t: 'MTDL.JK', tv: 'IDX:MTDL', n: 'Metrodata Electronics', c: 'ID' },
          { t: 'MLPT.JK', tv: 'IDX:MLPT', n: 'Multipolar Technology', c: 'ID' },
        ] },
        { id: 'dcinfra', name: 'Cloud, DC & Networking', note: 'Data-center picks & shovels', u: [
          { t: 'ANET', tv: 'NYSE:ANET', n: 'Arista Networks', c: 'US' },
          { t: 'CSCO', tv: 'NASDAQ:CSCO', n: 'Cisco', c: 'US' },
          { t: 'VRT', tv: 'NYSE:VRT', n: 'Vertiv', c: 'US' },
          { t: 'SMCI', tv: 'NASDAQ:SMCI', n: 'Super Micro', c: 'US' },
          { t: 'DCII.JK', tv: 'IDX:DCII', n: 'DCI Indonesia', c: 'ID' },
          { t: 'EDGE.JK', tv: 'IDX:EDGE', n: 'Indointernet', c: 'ID' },
        ] },
      ],
    },

    // ============ E4 · COMMUNICATION SERVICES ============
    {
      id: 'coms', num: 'E4', group: 'equity', accent: '#5b8def',
      name: 'Communication Services',
      short: 'Telecom · towers · media · internet & e-commerce',
      gics: 'Communication Services',
      dossier: {
        mandate: 'Connectivity & content: telecom operators, tower & fiber infrastructure, media & entertainment, internet platforms & e-commerce.',
        macro: 'Internet/smartphone penetration · ad spend & purchasing power · rates (capital-intensive telcos) · ARPU & tariff competition.',
        themes: 'Platform monetization & antitrust · digital ad shift · telco consolidation · 5G/fiber monetization · tower spin-offs · creator economy.',
        factors: 'ARPU & churn · take rate/GMV · MAU & engagement · capex/coverage · network effects · ad monetization · EBITDA margin.',
        valuation: 'EV/EBITDA & EV/subscriber (telco) · SOTP (telco vs towers) · DCF · FCF yield · EV/Sales & per-user (internet).',
        regulation: 'Spectrum & telco licensing (Kominfo) · platform antitrust · content/broadcast rules · data privacy · e-commerce (PMSE) rules.',
        complexity: 'Medium-high — capital-intensive telcos vs growth platforms vs ad-cyclical media.',
      },
      bench: [
        { label: 'US Comm Services (XLC)', y: 'XLC', tv: 'AMEX:XLC', region: 'US' },
        { label: 'China Internet (KWEB)', y: 'KWEB', tv: 'AMEX:KWEB', region: 'Asia' },
        { label: 'IDX Infrastructure', tv: 'IDX:IDXINFRA', region: 'ID' },
      ],
      subs: [
        { id: 'telco', name: 'Telecom Operators', note: 'Mobile & fixed-line', u: [
          { t: 'T', tv: 'NYSE:T', n: 'AT&T', c: 'US' },
          { t: 'VZ', tv: 'NYSE:VZ', n: 'Verizon', c: 'US' },
          { t: 'TMUS', tv: 'NASDAQ:TMUS', n: 'T-Mobile US', c: 'US' },
          { t: 'VOD', tv: 'NASDAQ:VOD', n: 'Vodafone', c: 'GB' },
          { t: 'DTE.DE', tv: 'XETR:DTE', n: 'Deutsche Telekom', c: 'DE' },
          { t: '0941.HK', tv: 'HKEX:941', n: 'China Mobile', c: 'CN' },
          { t: '9432.T', tv: 'TSE:9432', n: 'NTT', c: 'JP' },
          { t: 'Z74.SI', tv: 'SGX:Z74', n: 'Singtel', c: 'SG' },
          { t: 'TLKM.JK', tv: 'IDX:TLKM', n: 'Telkom Indonesia', c: 'ID' },
          { t: 'ISAT.JK', tv: 'IDX:ISAT', n: 'Indosat Ooredoo', c: 'ID' },
          { t: 'EXCL.JK', tv: 'IDX:EXCL', n: 'XLSmart', c: 'ID' },
        ] },
        { id: 'towers', name: 'Towers & Digital Infra', note: 'Towers, fiber, backbone', u: [
          { t: 'AMT', tv: 'NYSE:AMT', n: 'American Tower', c: 'US' },
          { t: 'CCI', tv: 'NYSE:CCI', n: 'Crown Castle', c: 'US' },
          { t: 'SBAC', tv: 'NASDAQ:SBAC', n: 'SBA Communications', c: 'US' },
          { t: 'TOWR.JK', tv: 'IDX:TOWR', n: 'Sarana Menara Nusantara', c: 'ID' },
          { t: 'MTEL.JK', tv: 'IDX:MTEL', n: 'Mitratel', c: 'ID' },
          { t: 'TBIG.JK', tv: 'IDX:TBIG', n: 'Tower Bersama', c: 'ID' },
        ] },
        { id: 'media', name: 'Media & Entertainment', note: 'Streaming, broadcast, content', u: [
          { t: 'NFLX', tv: 'NASDAQ:NFLX', n: 'Netflix', c: 'US' },
          { t: 'DIS', tv: 'NYSE:DIS', n: 'Disney', c: 'US' },
          { t: 'CMCSA', tv: 'NASDAQ:CMCSA', n: 'Comcast', c: 'US' },
          { t: 'WBD', tv: 'NASDAQ:WBD', n: 'Warner Bros. Discovery', c: 'US' },
          { t: 'SPOT', tv: 'NYSE:SPOT', n: 'Spotify', c: 'SE' },
          { t: 'SCMA.JK', tv: 'IDX:SCMA', n: 'Surya Citra Media', c: 'ID' },
          { t: 'MNCN.JK', tv: 'IDX:MNCN', n: 'Media Nusantara Citra', c: 'ID' },
          { t: 'EMTK.JK', tv: 'IDX:EMTK', n: 'Elang Mahkota Teknologi', c: 'ID' },
        ] },
        { id: 'internet', name: 'Internet & Platforms', note: 'Search, social, super-apps', u: [
          { t: 'GOOGL', tv: 'NASDAQ:GOOGL', n: 'Alphabet', c: 'US' },
          { t: 'META', tv: 'NASDAQ:META', n: 'Meta Platforms', c: 'US' },
          { t: '0700.HK', tv: 'HKEX:700', n: 'Tencent', c: 'CN' },
          { t: 'BIDU', tv: 'NASDAQ:BIDU', n: 'Baidu', c: 'CN' },
          { t: '035420.KS', tv: 'KRX:035420', n: 'Naver', c: 'KR' },
        ] },
        { id: 'ecom', name: 'E-commerce & Marketplaces', note: 'GMV machines', u: [
          { t: 'AMZN', tv: 'NASDAQ:AMZN', n: 'Amazon', c: 'US' },
          { t: 'BABA', tv: 'NYSE:BABA', n: 'Alibaba', c: 'CN' },
          { t: 'PDD', tv: 'NASDAQ:PDD', n: 'PDD Holdings', c: 'CN' },
          { t: 'JD', tv: 'NASDAQ:JD', n: 'JD.com', c: 'CN' },
          { t: 'MELI', tv: 'NASDAQ:MELI', n: 'MercadoLibre', c: 'BR' },
          { t: 'SE', tv: 'NYSE:SE', n: 'Sea Limited', c: 'SG' },
          { t: 'CPNG', tv: 'NYSE:CPNG', n: 'Coupang', c: 'KR' },
          { t: 'GRAB', tv: 'NASDAQ:GRAB', n: 'Grab Holdings', c: 'SG' },
          { t: 'GOTO.JK', tv: 'IDX:GOTO', n: 'GoTo Group', c: 'ID' },
          { t: 'BUKA.JK', tv: 'IDX:BUKA', n: 'Bukalapak', c: 'ID' },
          { t: 'BELI.JK', tv: 'IDX:BELI', n: 'Blibli (Global Digital Niaga)', c: 'ID' },
        ] },
      ],
    },

    // ============ E5 · CONSUMER STAPLES ============
    {
      id: 'staples', num: 'E5', group: 'equity', accent: '#5fd6a4',
      name: 'Consumer Staples',
      short: 'F&B · home & personal care · tobacco · staples retail · agri-food',
      gics: 'Consumer Staples',
      dossier: {
        mandate: 'Defensive consumption: food & beverage, household & personal care, tobacco, staples retail/minimarkets, agri-food & poultry.',
        macro: 'Purchasing power & food inflation · FX (imported inputs) · soft commodity prices · demographics & middle class.',
        themes: 'Premiumization vs down-trading · health & sustainability · private label · modern-trade penetration · FMCG distribution digitization.',
        factors: 'Volume & pricing power · market share · gross margin & input costs · brand strength · distribution reach · same-store sales.',
        valuation: 'P/E · EV/EBITDA · DCF · DDM (defensives) · EV/Sales.',
        regulation: 'Food safety & labeling (BPOM) · tobacco & sugar excise · halal certification · import rules.',
        complexity: 'Medium-low — understandable models; execution on brand, margin, distribution.',
      },
      bench: [
        { label: 'US Staples (XLP)', y: 'XLP', tv: 'AMEX:XLP', region: 'US' },
        { label: 'Global Staples (KXI)', y: 'KXI', tv: 'AMEX:KXI', region: 'Global' },
        { label: 'IDX Non-Cyclicals', tv: 'IDX:IDXNONCYC', region: 'ID' },
      ],
      subs: [
        { id: 'fnb', name: 'Food & Beverage', note: 'Packaged food, drinks, dairy', u: [
          { t: 'NESN.SW', tv: 'SIX:NESN', n: 'Nestlé', c: 'CH' },
          { t: 'KO', tv: 'NYSE:KO', n: 'Coca-Cola', c: 'US' },
          { t: 'PEP', tv: 'NASDAQ:PEP', n: 'PepsiCo', c: 'US' },
          { t: 'MDLZ', tv: 'NASDAQ:MDLZ', n: 'Mondelez', c: 'US' },
          { t: 'BN.PA', tv: 'EURONEXT:BN', n: 'Danone', c: 'FR' },
          { t: 'DEO', tv: 'NYSE:DEO', n: 'Diageo', c: 'GB' },
          { t: 'BUD', tv: 'NYSE:BUD', n: 'AB InBev', c: 'US' },
          { t: 'ICBP.JK', tv: 'IDX:ICBP', n: 'Indofood CBP', c: 'ID' },
          { t: 'INDF.JK', tv: 'IDX:INDF', n: 'Indofood Sukses Makmur', c: 'ID' },
          { t: 'MYOR.JK', tv: 'IDX:MYOR', n: 'Mayora Indah', c: 'ID' },
          { t: 'ULTJ.JK', tv: 'IDX:ULTJ', n: 'Ultrajaya', c: 'ID' },
          { t: 'CMRY.JK', tv: 'IDX:CMRY', n: 'Cisarua Mountain Dairy', c: 'ID' },
        ] },
        { id: 'hpc', name: 'Household & Personal Care', note: 'Home, beauty, hygiene', u: [
          { t: 'PG', tv: 'NYSE:PG', n: 'Procter & Gamble', c: 'US' },
          { t: 'UL', tv: 'NYSE:UL', n: 'Unilever', c: 'GB' },
          { t: 'CL', tv: 'NYSE:CL', n: 'Colgate-Palmolive', c: 'US' },
          { t: 'KMB', tv: 'NASDAQ:KMB', n: 'Kimberly-Clark', c: 'US' },
          { t: 'OR.PA', tv: 'EURONEXT:OR', n: "L'Oréal", c: 'FR' },
          { t: 'UNVR.JK', tv: 'IDX:UNVR', n: 'Unilever Indonesia', c: 'ID' },
        ] },
        { id: 'tobacco', name: 'Tobacco', note: 'Cigarettes & next-gen products', u: [
          { t: 'PM', tv: 'NYSE:PM', n: 'Philip Morris Intl', c: 'US' },
          { t: 'MO', tv: 'NYSE:MO', n: 'Altria', c: 'US' },
          { t: 'BTI', tv: 'NYSE:BTI', n: 'British American Tobacco', c: 'GB' },
          { t: '2914.T', tv: 'TSE:2914', n: 'Japan Tobacco', c: 'JP' },
          { t: 'GGRM.JK', tv: 'IDX:GGRM', n: 'Gudang Garam', c: 'ID' },
          { t: 'HMSP.JK', tv: 'IDX:HMSP', n: 'HM Sampoerna', c: 'ID' },
        ] },
        { id: 'retail', name: 'Staples Retail', note: 'Grocers, minimarkets, wholesale', u: [
          { t: 'WMT', tv: 'NYSE:WMT', n: 'Walmart', c: 'US' },
          { t: 'COST', tv: 'NASDAQ:COST', n: 'Costco', c: 'US' },
          { t: '3382.T', tv: 'TSE:3382', n: 'Seven & i Holdings', c: 'JP' },
          { t: 'AMRT.JK', tv: 'IDX:AMRT', n: 'Sumber Alfaria (Alfamart)', c: 'ID' },
          { t: 'MIDI.JK', tv: 'IDX:MIDI', n: 'Midi Utama (Alfamidi)', c: 'ID' },
        ] },
        { id: 'agrifood', name: 'Agri-food & Poultry', note: 'Protein & feed chain', u: [
          { t: 'ADM', tv: 'NYSE:ADM', n: 'Archer-Daniels-Midland', c: 'US' },
          { t: 'BG', tv: 'NYSE:BG', n: 'Bunge Global', c: 'US' },
          { t: 'TSN', tv: 'NYSE:TSN', n: 'Tyson Foods', c: 'US' },
          { t: 'CPIN.JK', tv: 'IDX:CPIN', n: 'Charoen Pokphand Indonesia', c: 'ID' },
          { t: 'JPFA.JK', tv: 'IDX:JPFA', n: 'Japfa Comfeed', c: 'ID' },
          { t: 'MAIN.JK', tv: 'IDX:MAIN', n: 'Malindo Feedmill', c: 'ID' },
        ] },
      ],
    },

    // ============ E6 · CONSUMER DISCRETIONARY & RETAIL ============
    {
      id: 'disc', num: 'E6', group: 'equity', accent: '#f0a05c',
      name: 'Consumer Discretionary & Retail',
      short: 'Autos · retail · apparel & luxury · QSR · travel & leisure',
      gics: 'Consumer Discretionary',
      dossier: {
        mandate: 'Cyclical consumption: autos & components, retail & e-tail, apparel & luxury, restaurants/QSR, travel & leisure, durables.',
        macro: 'Purchasing power & real wages · consumer confidence · rates (vehicle financing) · FX · tourism · replacement cycles.',
        themes: 'EV transition · omnichannel & e-commerce · premiumization & luxury · travel recovery · EM middle-class expansion.',
        factors: 'Same-store sales · volume & mix · margin & discounting · auto market share · replacement cycle · brand strength · store network.',
        valuation: 'P/E · EV/EBITDA · EV/Sales · SOTP (conglomerates/brands) · through-cycle EV/EBITDA & DCF (autos).',
        regulation: 'Emissions & local content (TKDN) · EV incentives · vehicle excise · import duties · e-commerce rules.',
        complexity: 'Medium-high — cyclical, purchasing-power sensitive; autos in structural EV disruption.',
      },
      bench: [
        { label: 'US Discretionary (XLY)', y: 'XLY', tv: 'AMEX:XLY', region: 'US' },
        { label: 'US Retail (XRT)', y: 'XRT', tv: 'AMEX:XRT', region: 'US' },
        { label: 'IDX Cyclicals', tv: 'IDX:IDXCYCLIC', region: 'ID' },
      ],
      subs: [
        { id: 'autos', name: 'Autos & Components', note: 'OEMs, EV, parts', u: [
          { t: 'TSLA', tv: 'NASDAQ:TSLA', n: 'Tesla', c: 'US' },
          { t: 'TM', tv: 'NYSE:TM', n: 'Toyota Motor', c: 'JP' },
          { t: 'F', tv: 'NYSE:F', n: 'Ford', c: 'US' },
          { t: 'GM', tv: 'NYSE:GM', n: 'General Motors', c: 'US' },
          { t: 'MBG.DE', tv: 'XETR:MBG', n: 'Mercedes-Benz', c: 'DE' },
          { t: 'BMW.DE', tv: 'XETR:BMW', n: 'BMW', c: 'DE' },
          { t: 'RACE', tv: 'NYSE:RACE', n: 'Ferrari', c: 'IT' },
          { t: '1211.HK', tv: 'HKEX:1211', n: 'BYD', c: 'CN' },
          { t: '005380.KS', tv: 'KRX:005380', n: 'Hyundai Motor', c: 'KR' },
          { t: 'ASII.JK', tv: 'IDX:ASII', n: 'Astra International', c: 'ID' },
          { t: 'AUTO.JK', tv: 'IDX:AUTO', n: 'Astra Otoparts', c: 'ID' },
          { t: 'DRMA.JK', tv: 'IDX:DRMA', n: 'Dharma Polimetal', c: 'ID' },
        ] },
        { id: 'retail', name: 'Retail & E-tail', note: 'Specialty & department', u: [
          { t: 'HD', tv: 'NYSE:HD', n: 'Home Depot', c: 'US' },
          { t: 'TJX', tv: 'NYSE:TJX', n: 'TJX Companies', c: 'US' },
          { t: 'LOW', tv: 'NYSE:LOW', n: "Lowe's", c: 'US' },
          { t: 'ACES.JK', tv: 'IDX:ACES', n: 'Aspirasi Hidup (Ace)', c: 'ID' },
          { t: 'MAPI.JK', tv: 'IDX:MAPI', n: 'Mitra Adiperkasa', c: 'ID' },
          { t: 'MAPA.JK', tv: 'IDX:MAPA', n: 'MAP Aktif', c: 'ID' },
          { t: 'ERAA.JK', tv: 'IDX:ERAA', n: 'Erajaya', c: 'ID' },
          { t: 'RALS.JK', tv: 'IDX:RALS', n: 'Ramayana', c: 'ID' },
        ] },
        { id: 'luxury', name: 'Apparel & Luxury', note: 'Brands & maisons', u: [
          { t: 'MC.PA', tv: 'EURONEXT:MC', n: 'LVMH', c: 'FR' },
          { t: 'RMS.PA', tv: 'EURONEXT:RMS', n: 'Hermès', c: 'FR' },
          { t: 'KER.PA', tv: 'EURONEXT:KER', n: 'Kering', c: 'FR' },
          { t: 'CFR.SW', tv: 'SIX:CFR', n: 'Richemont', c: 'CH' },
          { t: 'NKE', tv: 'NYSE:NKE', n: 'Nike', c: 'US' },
          { t: 'ADS.DE', tv: 'XETR:ADS', n: 'Adidas', c: 'DE' },
          { t: 'LULU', tv: 'NASDAQ:LULU', n: 'Lululemon', c: 'US' },
          { t: '9983.T', tv: 'TSE:9983', n: 'Fast Retailing (Uniqlo)', c: 'JP' },
        ] },
        { id: 'qsr', name: 'Restaurants & QSR', note: 'Quick service & casual dining', u: [
          { t: 'MCD', tv: 'NYSE:MCD', n: "McDonald's", c: 'US' },
          { t: 'SBUX', tv: 'NASDAQ:SBUX', n: 'Starbucks', c: 'US' },
          { t: 'YUM', tv: 'NYSE:YUM', n: 'Yum! Brands', c: 'US' },
          { t: 'CMG', tv: 'NYSE:CMG', n: 'Chipotle', c: 'US' },
          { t: 'MAPB.JK', tv: 'IDX:MAPB', n: 'MAP Boga Adiperkasa', c: 'ID' },
        ] },
        { id: 'travel', name: 'Travel & Leisure', note: 'Hotels, OTAs, experiences', u: [
          { t: 'BKNG', tv: 'NASDAQ:BKNG', n: 'Booking Holdings', c: 'US' },
          { t: 'ABNB', tv: 'NASDAQ:ABNB', n: 'Airbnb', c: 'US' },
          { t: 'MAR', tv: 'NASDAQ:MAR', n: 'Marriott', c: 'US' },
          { t: 'HLT', tv: 'NYSE:HLT', n: 'Hilton', c: 'US' },
          { t: 'TCOM', tv: 'NASDAQ:TCOM', n: 'Trip.com', c: 'CN' },
          { t: 'PJAA.JK', tv: 'IDX:PJAA', n: 'Jaya Ancol', c: 'ID' },
        ] },
      ],
    },

    // ============ E7 · HEALTHCARE & LIFE SCIENCES ============
    {
      id: 'health', num: 'E7', group: 'equity', accent: '#f26f8f',
      name: 'Healthcare & Life Sciences',
      short: 'Pharma · biotech · medtech · providers · tools & distribution',
      gics: 'Health Care',
      dossier: {
        mandate: 'The full healthcare chain: branded & generic pharma, biotech, medical devices & diagnostics, hospitals & providers, managed care, life-science tools & pharma distribution.',
        macro: 'Aging populations · healthcare spend/GDP · JKN/BPJS & insurance policy · FX (API imports) · medical cost inflation.',
        themes: 'GLP-1 (obesity/diabetes) · gene & cell therapy · biosimilars · digital health · hospital consolidation · drug-price reform.',
        factors: 'Pipeline & trial probabilities · patents & patent cliffs · regulatory approvals · reimbursement · bed occupancy · R&D productivity.',
        valuation: 'Big pharma: P/E, EV/EBITDA, DCF · biotech: risk-adjusted NPV (rNPV) & SOTP · providers: EV/EBITDA, DCF.',
        regulation: 'BPOM · FDA/EMA · clinical-trial gates · patents & exclusivity · pricing & reimbursement (JKN) · e-catalog.',
        complexity: 'Very high — clinical literacy, binary pipeline risk, probability-based valuation.',
      },
      bench: [
        { label: 'US Healthcare (XLV)', y: 'XLV', tv: 'AMEX:XLV', region: 'US' },
        { label: 'Biotech (XBI)', y: 'XBI', tv: 'AMEX:XBI', region: 'US' },
        { label: 'Medical Devices (IHI)', y: 'IHI', tv: 'AMEX:IHI', region: 'US' },
        { label: 'IDX Healthcare', tv: 'IDX:IDXHEALTH', region: 'ID' },
      ],
      subs: [
        { id: 'pharma', name: 'Pharmaceuticals', note: 'Branded & generic', u: [
          { t: 'LLY', tv: 'NYSE:LLY', n: 'Eli Lilly', c: 'US' },
          { t: 'NVO', tv: 'NYSE:NVO', n: 'Novo Nordisk', c: 'DK' },
          { t: 'JNJ', tv: 'NYSE:JNJ', n: 'Johnson & Johnson', c: 'US' },
          { t: 'PFE', tv: 'NYSE:PFE', n: 'Pfizer', c: 'US' },
          { t: 'MRK', tv: 'NYSE:MRK', n: 'Merck & Co', c: 'US' },
          { t: 'ABBV', tv: 'NYSE:ABBV', n: 'AbbVie', c: 'US' },
          { t: 'AZN', tv: 'NASDAQ:AZN', n: 'AstraZeneca', c: 'GB' },
          { t: 'NVS', tv: 'NYSE:NVS', n: 'Novartis', c: 'CH' },
          { t: 'ROG.SW', tv: 'SIX:ROG', n: 'Roche', c: 'CH' },
          { t: 'SNY', tv: 'NASDAQ:SNY', n: 'Sanofi', c: 'FR' },
          { t: '4502.T', tv: 'TSE:4502', n: 'Takeda', c: 'JP' },
          { t: 'KLBF.JK', tv: 'IDX:KLBF', n: 'Kalbe Farma', c: 'ID' },
          { t: 'SIDO.JK', tv: 'IDX:SIDO', n: 'Sido Muncul', c: 'ID' },
          { t: 'KAEF.JK', tv: 'IDX:KAEF', n: 'Kimia Farma', c: 'ID' },
          { t: 'TSPC.JK', tv: 'IDX:TSPC', n: 'Tempo Scan Pacific', c: 'ID' },
        ] },
        { id: 'biotech', name: 'Biotechnology', note: 'Pipeline-driven', u: [
          { t: 'AMGN', tv: 'NASDAQ:AMGN', n: 'Amgen', c: 'US' },
          { t: 'GILD', tv: 'NASDAQ:GILD', n: 'Gilead', c: 'US' },
          { t: 'VRTX', tv: 'NASDAQ:VRTX', n: 'Vertex', c: 'US' },
          { t: 'REGN', tv: 'NASDAQ:REGN', n: 'Regeneron', c: 'US' },
          { t: 'MRNA', tv: 'NASDAQ:MRNA', n: 'Moderna', c: 'US' },
        ] },
        { id: 'medtech', name: 'MedTech & Diagnostics', note: 'Devices & dx', u: [
          { t: 'ISRG', tv: 'NASDAQ:ISRG', n: 'Intuitive Surgical', c: 'US' },
          { t: 'ABT', tv: 'NYSE:ABT', n: 'Abbott', c: 'US' },
          { t: 'MDT', tv: 'NYSE:MDT', n: 'Medtronic', c: 'US' },
          { t: 'SYK', tv: 'NYSE:SYK', n: 'Stryker', c: 'US' },
          { t: 'BSX', tv: 'NYSE:BSX', n: 'Boston Scientific', c: 'US' },
          { t: 'SHL.DE', tv: 'XETR:SHL', n: 'Siemens Healthineers', c: 'DE' },
        ] },
        { id: 'providers', name: 'Providers & Hospitals', note: 'Hospitals, clinics, labs', u: [
          { t: 'UNH', tv: 'NYSE:UNH', n: 'UnitedHealth', c: 'US' },
          { t: 'HCA', tv: 'NYSE:HCA', n: 'HCA Healthcare', c: 'US' },
          { t: 'CVS', tv: 'NYSE:CVS', n: 'CVS Health', c: 'US' },
          { t: 'BDMS.BK', tv: 'SET:BDMS', n: 'Bangkok Dusit Medical', c: 'TH' },
          { t: 'MIKA.JK', tv: 'IDX:MIKA', n: 'Mitra Keluarga', c: 'ID' },
          { t: 'HEAL.JK', tv: 'IDX:HEAL', n: 'Hermina Hospitals', c: 'ID' },
          { t: 'SILO.JK', tv: 'IDX:SILO', n: 'Siloam Hospitals', c: 'ID' },
          { t: 'PRDA.JK', tv: 'IDX:PRDA', n: 'Prodia', c: 'ID' },
        ] },
        { id: 'tools', name: 'Life-Science Tools & CRO', note: 'Instruments & research services', u: [
          { t: 'TMO', tv: 'NYSE:TMO', n: 'Thermo Fisher', c: 'US' },
          { t: 'DHR', tv: 'NYSE:DHR', n: 'Danaher', c: 'US' },
          { t: 'A', tv: 'NYSE:A', n: 'Agilent', c: 'US' },
        ] },
      ],
    },

    // ============ E8 · INDUSTRIALS, CAPITAL GOODS & TRANSPORTATION ============
    {
      id: 'indus', num: 'E8', group: 'equity', accent: '#97AAC5',
      name: 'Industrials & Transportation',
      short: 'Capital goods · A&D · transport & logistics · construction · services',
      gics: 'Industrials',
      dossier: {
        mandate: 'Capex-driven cyclicals: machinery & capital goods, aerospace & defense, transportation & logistics, airlines & shipping, construction & infrastructure, business services.',
        macro: 'Investment cycle & manufacturing PMI · government infrastructure spend · global trade & tariffs · energy input costs · rates · defense budgets.',
        themes: 'Reshoring & factory automation · industrial decarbonization · energy-transition infrastructure · aviation recovery · logistics digitization.',
        factors: 'Backlog & book-to-bill · capacity utilization · operating leverage & margin · capital cycle · load factor & freight rates · project pricing discipline.',
        valuation: 'EV/EBITDA · P/E · EV/EBIT · mid-cycle DCF · backlog analysis · SOTP (conglomerates) · EV/EBITDAR (transport).',
        regulation: 'Emissions & safety standards · aviation regulation · government procurement · TKDN · trade tariffs.',
        complexity: 'Medium-high — very cyclical and very diverse; capital-cycle and operating-leverage driven.',
      },
      bench: [
        { label: 'US Industrials (XLI)', y: 'XLI', tv: 'AMEX:XLI', region: 'US' },
        { label: 'Aerospace & Defense (ITA)', y: 'ITA', tv: 'BATS:ITA', region: 'US' },
        { label: 'US Transport (IYT)', y: 'IYT', tv: 'BATS:IYT', region: 'US' },
        { label: 'IDX Industrials', tv: 'IDX:IDXINDUST', region: 'ID' },
        { label: 'IDX Transport & Logistics', tv: 'IDX:IDXTRANS', region: 'ID' },
      ],
      subs: [
        { id: 'capgoods', name: 'Capital Goods & Machinery', note: 'Heavy equipment & automation', u: [
          { t: 'GE', tv: 'NYSE:GE', n: 'GE Aerospace', c: 'US' },
          { t: 'CAT', tv: 'NYSE:CAT', n: 'Caterpillar', c: 'US' },
          { t: 'HON', tv: 'NASDAQ:HON', n: 'Honeywell', c: 'US' },
          { t: 'ETN', tv: 'NYSE:ETN', n: 'Eaton', c: 'US' },
          { t: 'SIE.DE', tv: 'XETR:SIE', n: 'Siemens', c: 'DE' },
          { t: 'ABBN.SW', tv: 'SIX:ABBN', n: 'ABB', c: 'CH' },
          { t: '6301.T', tv: 'TSE:6301', n: 'Komatsu', c: 'JP' },
          { t: '7011.T', tv: 'TSE:7011', n: 'Mitsubishi Heavy', c: 'JP' },
          { t: 'UNTR.JK', tv: 'IDX:UNTR', n: 'United Tractors', c: 'ID' },
        ] },
        { id: 'aero', name: 'Aerospace & Defense', note: 'A&D primes', u: [
          { t: 'BA', tv: 'NYSE:BA', n: 'Boeing', c: 'US' },
          { t: 'AIR.PA', tv: 'EURONEXT:AIR', n: 'Airbus', c: 'FR' },
          { t: 'LMT', tv: 'NYSE:LMT', n: 'Lockheed Martin', c: 'US' },
          { t: 'RTX', tv: 'NYSE:RTX', n: 'RTX', c: 'US' },
          { t: 'NOC', tv: 'NYSE:NOC', n: 'Northrop Grumman', c: 'US' },
          { t: 'RR.L', tv: 'LSE:RR.', n: 'Rolls-Royce', c: 'GB' },
          { t: 'RHM.DE', tv: 'XETR:RHM', n: 'Rheinmetall', c: 'DE' },
        ] },
        { id: 'transport', name: 'Transport & Logistics', note: 'Rail, parcel, toll roads', u: [
          { t: 'UNP', tv: 'NYSE:UNP', n: 'Union Pacific', c: 'US' },
          { t: 'UPS', tv: 'NYSE:UPS', n: 'UPS', c: 'US' },
          { t: 'FDX', tv: 'NYSE:FDX', n: 'FedEx', c: 'US' },
          { t: 'MAERSK-B.CO', n: 'Maersk', c: 'DK' },
          { t: 'JSMR.JK', tv: 'IDX:JSMR', n: 'Jasa Marga', c: 'ID' },
          { t: 'ASSA.JK', tv: 'IDX:ASSA', n: 'Adi Sarana Armada', c: 'ID' },
          { t: 'BIRD.JK', tv: 'IDX:BIRD', n: 'Blue Bird', c: 'ID' },
        ] },
        { id: 'airsea', name: 'Airlines & Shipping', note: 'Pax air & marine freight', u: [
          { t: 'DAL', tv: 'NYSE:DAL', n: 'Delta Air Lines', c: 'US' },
          { t: 'UAL', tv: 'NASDAQ:UAL', n: 'United Airlines', c: 'US' },
          { t: 'RYAAY', tv: 'NASDAQ:RYAAY', n: 'Ryanair', c: 'GB' },
          { t: 'C6L.SI', tv: 'SGX:C6L', n: 'Singapore Airlines', c: 'SG' },
          { t: 'ZIM', tv: 'NYSE:ZIM', n: 'ZIM Shipping', c: 'US' },
          { t: 'GIAA.JK', tv: 'IDX:GIAA', n: 'Garuda Indonesia', c: 'ID' },
          { t: 'SMDR.JK', tv: 'IDX:SMDR', n: 'Samudera Indonesia', c: 'ID' },
          { t: 'TMAS.JK', tv: 'IDX:TMAS', n: 'Temas Shipping', c: 'ID' },
        ] },
        { id: 'construct', name: 'Construction & Infrastructure', note: 'E&C and concessions', u: [
          { t: 'DG.PA', tv: 'EURONEXT:DG', n: 'Vinci', c: 'FR' },
          { t: 'LT.NS', tv: 'NSE:LT', n: 'Larsen & Toubro', c: 'IN' },
          { t: '1800.HK', tv: 'HKEX:1800', n: 'China Comm. Construction', c: 'CN' },
          { t: 'WIKA.JK', tv: 'IDX:WIKA', n: 'Wijaya Karya', c: 'ID' },
          { t: 'PTPP.JK', tv: 'IDX:PTPP', n: 'PP (Persero)', c: 'ID' },
          { t: 'ADHI.JK', tv: 'IDX:ADHI', n: 'Adhi Karya', c: 'ID' },
        ] },
        { id: 'bizserv', name: 'Business Services', note: 'Outsourcing & facility', u: [
          { t: 'WM', tv: 'NYSE:WM', n: 'Waste Management', c: 'US' },
          { t: 'CTAS', tv: 'NASDAQ:CTAS', n: 'Cintas', c: 'US' },
          { t: 'ADP', tv: 'NASDAQ:ADP', n: 'ADP', c: 'US' },
        ] },
      ],
    },

    // ============ E9 · ENERGY & UTILITIES ============
    {
      id: 'energy', num: 'E9', group: 'equity', accent: '#e8c766',
      name: 'Energy & Utilities',
      short: 'Oil & gas · coal · utilities · renewables · midstream',
      gics: 'Energy + Utilities',
      dossier: {
        mandate: 'The energy value chain: upstream-to-downstream oil & gas, oil services, coal & thermal energy, electric & gas utilities, IPPs, renewables & storage.',
        macro: 'Oil, gas & coal prices · global growth & China demand · energy transition · USD · supply geopolitics · rates (capital-intensive utilities).',
        themes: 'Energy transition & generation mix · decarbonization · coal DMO policy · renewables buildout · energy security · carbon markets.',
        factors: 'Commodity prices & refining spreads · volumes & reserves · cash costs · capex discipline · tariffs & RAB (utilities) · energy mix.',
        valuation: 'EV/EBITDA · EV/DACF · reserves-based P/NAV (O&G) · price-deck DCF · utilities: RAB-based DDM/DCF & dividend yield.',
        regulation: 'O&G & mining permits · coal DMO · electricity tariffs & subsidies · environmental & emissions rules · carbon tax · net-zero policy.',
        complexity: 'High — commodity & geopolitics dependent; asset/reserve-based models; regulated utilities.',
      },
      bench: [
        { label: 'US Energy (XLE)', y: 'XLE', tv: 'AMEX:XLE', region: 'US' },
        { label: 'Oil & Gas E&P (XOP)', y: 'XOP', tv: 'AMEX:XOP', region: 'US' },
        { label: 'Oil Services (OIH)', y: 'OIH', tv: 'AMEX:OIH', region: 'US' },
        { label: 'US Utilities (XLU)', y: 'XLU', tv: 'AMEX:XLU', region: 'US' },
        { label: 'Clean Energy (ICLN)', y: 'ICLN', tv: 'NASDAQ:ICLN', region: 'Global' },
        { label: 'IDX Energy', tv: 'IDX:IDXENERGY', region: 'ID' },
      ],
      subs: [
        { id: 'oilgas', name: 'Integrated Oil & Gas', note: 'Majors & NOCs', u: [
          { t: 'XOM', tv: 'NYSE:XOM', n: 'ExxonMobil', c: 'US' },
          { t: 'CVX', tv: 'NYSE:CVX', n: 'Chevron', c: 'US' },
          { t: 'SHEL', tv: 'NYSE:SHEL', n: 'Shell', c: 'GB' },
          { t: 'TTE', tv: 'NYSE:TTE', n: 'TotalEnergies', c: 'FR' },
          { t: 'BP', tv: 'NYSE:BP', n: 'BP', c: 'GB' },
          { t: '2222.SR', tv: 'TADAWUL:2222', n: 'Saudi Aramco', c: 'SA' },
          { t: '0857.HK', tv: 'HKEX:857', n: 'PetroChina', c: 'CN' },
          { t: '0883.HK', tv: 'HKEX:883', n: 'CNOOC', c: 'CN' },
          { t: 'MEDC.JK', tv: 'IDX:MEDC', n: 'Medco Energi', c: 'ID' },
        ] },
        { id: 'ep', name: 'E&P / Upstream', note: 'Shale & conventional', u: [
          { t: 'COP', tv: 'NYSE:COP', n: 'ConocoPhillips', c: 'US' },
          { t: 'EOG', tv: 'NYSE:EOG', n: 'EOG Resources', c: 'US' },
          { t: 'OXY', tv: 'NYSE:OXY', n: 'Occidental', c: 'US' },
          { t: 'DVN', tv: 'NYSE:DVN', n: 'Devon Energy', c: 'US' },
          { t: 'FANG', tv: 'NASDAQ:FANG', n: 'Diamondback', c: 'US' },
        ] },
        { id: 'services', name: 'Oil Services', note: 'Drillers & equipment', u: [
          { t: 'SLB', tv: 'NYSE:SLB', n: 'SLB (Schlumberger)', c: 'US' },
          { t: 'HAL', tv: 'NYSE:HAL', n: 'Halliburton', c: 'US' },
          { t: 'BKR', tv: 'NASDAQ:BKR', n: 'Baker Hughes', c: 'US' },
          { t: 'ELSA.JK', tv: 'IDX:ELSA', n: 'Elnusa', c: 'ID' },
        ] },
        { id: 'coal', name: 'Coal & Thermal Energy', note: 'Thermal & trading', u: [
          { t: 'BTU', tv: 'NYSE:BTU', n: 'Peabody Energy', c: 'US' },
          { t: 'WHC.AX', tv: 'ASX:WHC', n: 'Whitehaven Coal', c: 'AU' },
          { t: '1088.HK', tv: 'HKEX:1088', n: 'China Shenhua', c: 'CN' },
          { t: 'PTBA.JK', tv: 'IDX:PTBA', n: 'Bukit Asam', c: 'ID' },
          { t: 'ADRO.JK', tv: 'IDX:ADRO', n: 'Alamtri (Adaro)', c: 'ID' },
          { t: 'ITMG.JK', tv: 'IDX:ITMG', n: 'Indo Tambangraya', c: 'ID' },
          { t: 'HRUM.JK', tv: 'IDX:HRUM', n: 'Harum Energy', c: 'ID' },
          { t: 'INDY.JK', tv: 'IDX:INDY', n: 'Indika Energy', c: 'ID' },
          { t: 'BUMI.JK', tv: 'IDX:BUMI', n: 'Bumi Resources', c: 'ID' },
        ] },
        { id: 'utilities', name: 'Utilities & Power', note: 'Regulated & IPP', u: [
          { t: 'NEE', tv: 'NYSE:NEE', n: 'NextEra Energy', c: 'US' },
          { t: 'DUK', tv: 'NYSE:DUK', n: 'Duke Energy', c: 'US' },
          { t: 'SO', tv: 'NYSE:SO', n: 'Southern Company', c: 'US' },
          { t: 'IBE.MC', tv: 'BME:IBE', n: 'Iberdrola', c: 'ES' },
          { t: 'ENEL.MI', tv: 'MIL:ENEL', n: 'Enel', c: 'IT' },
          { t: 'NGG', tv: 'NYSE:NGG', n: 'National Grid', c: 'GB' },
          { t: 'POWR.JK', tv: 'IDX:POWR', n: 'Cikarang Listrindo', c: 'ID' },
        ] },
        { id: 'renewables', name: 'Renewables & IPP', note: 'Solar, geothermal, storage', u: [
          { t: 'FSLR', tv: 'NASDAQ:FSLR', n: 'First Solar', c: 'US' },
          { t: 'ENPH', tv: 'NASDAQ:ENPH', n: 'Enphase', c: 'US' },
          { t: 'BEP', tv: 'NYSE:BEP', n: 'Brookfield Renewable', c: 'CA' },
          { t: 'BREN.JK', tv: 'IDX:BREN', n: 'Barito Renewables', c: 'ID' },
          { t: 'PGEO.JK', tv: 'IDX:PGEO', n: 'Pertamina Geothermal', c: 'ID' },
        ] },
        { id: 'midstream', name: 'Midstream & Distribution', note: 'Pipelines & energy logistics', u: [
          { t: 'KMI', tv: 'NYSE:KMI', n: 'Kinder Morgan', c: 'US' },
          { t: 'WMB', tv: 'NYSE:WMB', n: 'Williams Companies', c: 'US' },
          { t: 'ENB', tv: 'NYSE:ENB', n: 'Enbridge', c: 'CA' },
          { t: 'PGAS.JK', tv: 'IDX:PGAS', n: 'Perusahaan Gas Negara', c: 'ID' },
          { t: 'AKRA.JK', tv: 'IDX:AKRA', n: 'AKR Corporindo', c: 'ID' },
        ] },
      ],
    },

    // ============ E10 · MATERIALS, MINING & AGRIBUSINESS ============
    {
      id: 'materials', num: 'E10', group: 'equity', accent: '#c98d5a',
      name: 'Materials, Mining & Agribusiness',
      short: 'Metals & mining · battery metals · chemicals · cement · plantations',
      gics: 'Materials + Agribusiness',
      dossier: {
        mandate: 'Commodity price-takers: diversified metals & mining, gold, battery metals & nickel, chemicals & petrochemicals, cement & building materials, paper & packaging, plantations & agri-inputs.',
        macro: 'Metal & CPO prices · China & global infrastructure demand · energy transition (battery metals) · USD · downstreaming policy · commodity cycles.',
        themes: 'Battery/EV metals demand · smelter downstreaming · commodity supercycles · food security & CPO · materials decarbonization · circular economy.',
        factors: 'Commodity prices & cost-curve position · volumes & reserves · cash costs · capex & mine life · petrochemical spreads · plantation yields.',
        valuation: 'EV/EBITDA · mine-model P/NAV · price-deck DCF · replacement value · EV/ha (plantations) · through-cycle EV/EBITDA (petchem).',
        regulation: 'Mining permits (IUP) & royalties · export bans / downstreaming · environmental & reclamation rules · RSPO & CPO export levy · carbon tax.',
        complexity: 'High — cyclical price-takers, reserve-based models, heavy regulation.',
      },
      bench: [
        { label: 'US Materials (XLB)', y: 'XLB', tv: 'AMEX:XLB', region: 'US' },
        { label: 'Gold Miners (GDX)', y: 'GDX', tv: 'AMEX:GDX', region: 'Global' },
        { label: 'Copper Miners (COPX)', y: 'COPX', tv: 'AMEX:COPX', region: 'Global' },
        { label: 'Battery Tech (LIT)', y: 'LIT', tv: 'AMEX:LIT', region: 'Global' },
        { label: 'Agribusiness (MOO)', y: 'MOO', tv: 'AMEX:MOO', region: 'Global' },
        { label: 'IDX Basic Materials', tv: 'IDX:IDXBASIC', region: 'ID' },
      ],
      subs: [
        { id: 'mining', name: 'Diversified Metals & Mining', note: 'Big miners & tin/copper', u: [
          { t: 'BHP', tv: 'NYSE:BHP', n: 'BHP Group', c: 'AU' },
          { t: 'RIO', tv: 'NYSE:RIO', n: 'Rio Tinto', c: 'AU' },
          { t: 'VALE', tv: 'NYSE:VALE', n: 'Vale', c: 'BR' },
          { t: 'GLEN.L', tv: 'LSE:GLEN', n: 'Glencore', c: 'GB' },
          { t: 'FCX', tv: 'NYSE:FCX', n: 'Freeport-McMoRan', c: 'US' },
          { t: 'SCCO', tv: 'NYSE:SCCO', n: 'Southern Copper', c: 'MX' },
          { t: 'AAL.L', tv: 'LSE:AAL', n: 'Anglo American', c: 'GB' },
          { t: 'ANTM.JK', tv: 'IDX:ANTM', n: 'Aneka Tambang', c: 'ID' },
          { t: 'TINS.JK', tv: 'IDX:TINS', n: 'Timah', c: 'ID' },
          { t: 'MDKA.JK', tv: 'IDX:MDKA', n: 'Merdeka Copper Gold', c: 'ID' },
        ] },
        { id: 'gold', name: 'Gold & Precious', note: 'Precious-metal miners', u: [
          { t: 'NEM', tv: 'NYSE:NEM', n: 'Newmont', c: 'US' },
          { t: 'AEM', tv: 'NYSE:AEM', n: 'Agnico Eagle', c: 'CA' },
          { t: 'GFI', tv: 'NYSE:GFI', n: 'Gold Fields', c: 'ZA' },
          { t: '2899.HK', tv: 'HKEX:2899', n: 'Zijin Mining', c: 'CN' },
          { t: 'BRMS.JK', tv: 'IDX:BRMS', n: 'Bumi Resources Minerals', c: 'ID' },
          { t: 'HRTA.JK', tv: 'IDX:HRTA', n: 'Hartadinata Abadi', c: 'ID' },
        ] },
        { id: 'battery', name: 'Battery Metals & Nickel', note: 'EV chain upstream', u: [
          { t: 'ALB', tv: 'NYSE:ALB', n: 'Albemarle', c: 'US' },
          { t: 'SQM', tv: 'NYSE:SQM', n: 'SQM', c: 'BR' },
          { t: '300750.SZ', tv: 'SZSE:300750', n: 'CATL', c: 'CN' },
          { t: 'INCO.JK', tv: 'IDX:INCO', n: 'Vale Indonesia', c: 'ID' },
          { t: 'NCKL.JK', tv: 'IDX:NCKL', n: 'Trimegah Bangun Persada', c: 'ID' },
          { t: 'MBMA.JK', tv: 'IDX:MBMA', n: 'Merdeka Battery Materials', c: 'ID' },
        ] },
        { id: 'chemicals', name: 'Chemicals & Petrochemicals', note: 'Industrial gases → crackers', u: [
          { t: 'LIN', tv: 'NASDAQ:LIN', n: 'Linde', c: 'DE' },
          { t: 'BAS.DE', tv: 'XETR:BAS', n: 'BASF', c: 'DE' },
          { t: 'DOW', tv: 'NYSE:DOW', n: 'Dow', c: 'US' },
          { t: 'AI.PA', tv: 'EURONEXT:AI', n: 'Air Liquide', c: 'FR' },
          { t: 'LYB', tv: 'NYSE:LYB', n: 'LyondellBasell', c: 'NL' },
          { t: 'TPIA.JK', tv: 'IDX:TPIA', n: 'Chandra Asri', c: 'ID' },
          { t: 'BRPT.JK', tv: 'IDX:BRPT', n: 'Barito Pacific', c: 'ID' },
          { t: 'ESSA.JK', tv: 'IDX:ESSA', n: 'ESSA Industries', c: 'ID' },
        ] },
        { id: 'cement', name: 'Cement & Building Materials', note: 'Heavy-side materials', u: [
          { t: 'CRH', tv: 'NYSE:CRH', n: 'CRH', c: 'GB' },
          { t: 'HOLN.SW', tv: 'SIX:HOLN', n: 'Holcim', c: 'CH' },
          { t: 'HEI.DE', tv: 'XETR:HEI', n: 'Heidelberg Materials', c: 'DE' },
          { t: '0914.HK', tv: 'HKEX:914', n: 'Anhui Conch', c: 'CN' },
          { t: 'SMGR.JK', tv: 'IDX:SMGR', n: 'Semen Indonesia', c: 'ID' },
          { t: 'INTP.JK', tv: 'IDX:INTP', n: 'Indocement', c: 'ID' },
        ] },
        { id: 'paper', name: 'Paper & Packaging', note: 'Pulp, paper, containers', u: [
          { t: 'IP', tv: 'NYSE:IP', n: 'International Paper', c: 'US' },
          { t: '2689.HK', tv: 'HKEX:2689', n: 'Nine Dragons Paper', c: 'CN' },
          { t: 'INKP.JK', tv: 'IDX:INKP', n: 'Indah Kiat Pulp & Paper', c: 'ID' },
          { t: 'TKIM.JK', tv: 'IDX:TKIM', n: 'Pabrik Kertas Tjiwi Kimia', c: 'ID' },
        ] },
        { id: 'plantations', name: 'Plantations & Agri-inputs', note: 'CPO & fertilizer chain', u: [
          { t: 'NTR', tv: 'NYSE:NTR', n: 'Nutrien', c: 'CA' },
          { t: 'MOS', tv: 'NYSE:MOS', n: 'Mosaic', c: 'US' },
          { t: 'CF', tv: 'NYSE:CF', n: 'CF Industries', c: 'US' },
          { t: 'F34.SI', tv: 'SGX:F34', n: 'Wilmar International', c: 'SG' },
          { t: 'AALI.JK', tv: 'IDX:AALI', n: 'Astra Agro Lestari', c: 'ID' },
          { t: 'LSIP.JK', tv: 'IDX:LSIP', n: 'London Sumatra', c: 'ID' },
          { t: 'DSNG.JK', tv: 'IDX:DSNG', n: 'Dharma Satya Nusantara', c: 'ID' },
          { t: 'TAPG.JK', tv: 'IDX:TAPG', n: 'Triputra Agro Persada', c: 'ID' },
        ] },
      ],
    },

    // ============ M1 · FX DESK ============
    {
      id: 'fx', num: 'M1', group: 'markets', accent: '#66c6e8',
      name: 'FX Desk',
      short: 'G10 · EMFX · IDR complex · dollar cycle',
      gics: '—',
      dossier: {
        mandate: 'Global currency monitoring: G10 majors, EM Asia / LatAm / EMEA FX, the IDR complex, and the dollar cycle. Feeds every equity desk (FX is an input to nearly all of them) and the Economics desk.',
        macro: 'Rate differentials & central-bank paths · risk appetite · terms of trade · current accounts & flows · intervention regimes.',
        themes: 'Dollar cycle · carry trades · CNY management & Asia FX beta · IDR vs commodity terms of trade · de-dollarization.',
        factors: 'Real rate differentials · basis & forward points · positioning · reserves & intervention capacity · commodity terms of trade.',
        valuation: 'PPP & REER deviation · carry-to-vol · rate-differential models · BoP flow analysis.',
        regulation: 'BI FX intervention & DHE rules · capital-flow measures · US Treasury FX reports.',
        complexity: 'Medium — macro-heavy, regime-driven; the desk exists to give LBC a house FX view.',
      },
      bench: [
        { label: 'Dollar Index (DXY)', y: 'DX-Y.NYB', tv: 'TVC:DXY', region: 'Global' },
        { label: 'USD/IDR', y: 'IDR=X', tv: 'FX_IDC:USDIDR', region: 'ID' },
      ],
      subs: [
        { id: 'g10', name: 'G10 Majors', note: 'The core crosses', u: [
          { t: 'DX-Y.NYB', tv: 'TVC:DXY', n: 'Dollar Index', c: 'US' },
          { t: 'EURUSD=X', tv: 'FX:EURUSD', n: 'EUR/USD', c: 'DE' },
          { t: 'JPY=X', tv: 'FX:USDJPY', n: 'USD/JPY', c: 'JP' },
          { t: 'GBPUSD=X', tv: 'FX:GBPUSD', n: 'GBP/USD', c: 'GB' },
          { t: 'AUDUSD=X', tv: 'FX:AUDUSD', n: 'AUD/USD', c: 'AU' },
          { t: 'NZDUSD=X', tv: 'FX:NZDUSD', n: 'NZD/USD', c: 'AU' },
          { t: 'CAD=X', tv: 'FX:USDCAD', n: 'USD/CAD', c: 'CA' },
          { t: 'CHF=X', tv: 'FX:USDCHF', n: 'USD/CHF', c: 'CH' },
        ] },
        { id: 'crosses', name: 'EUR & JPY Crosses', note: 'Non-USD legs', u: [
          { t: 'EURGBP=X', tv: 'FX:EURGBP', n: 'EUR/GBP', c: 'DE' },
          { t: 'EURJPY=X', tv: 'FX:EURJPY', n: 'EUR/JPY', c: 'DE' },
          { t: 'EURCHF=X', tv: 'FX:EURCHF', n: 'EUR/CHF', c: 'DE' },
          { t: 'GBPJPY=X', tv: 'FX:GBPJPY', n: 'GBP/JPY', c: 'GB' },
        ] },
        { id: 'asiafx', name: 'Asia EMFX', note: 'The Asia complex', u: [
          { t: 'IDR=X', tv: 'FX_IDC:USDIDR', n: 'USD/IDR', c: 'ID' },
          { t: 'CNH=X', tv: 'FX:USDCNH', n: 'USD/CNH', c: 'CN' },
          { t: 'INR=X', tv: 'FX_IDC:USDINR', n: 'USD/INR', c: 'IN' },
          { t: 'KRW=X', tv: 'FX_IDC:USDKRW', n: 'USD/KRW', c: 'KR' },
          { t: 'SGD=X', tv: 'FX:USDSGD', n: 'USD/SGD', c: 'SG' },
          { t: 'THB=X', tv: 'FX_IDC:USDTHB', n: 'USD/THB', c: 'TH' },
          { t: 'PHP=X', tv: 'FX_IDC:USDPHP', n: 'USD/PHP', c: 'PH' },
          { t: 'MYR=X', tv: 'FX_IDC:USDMYR', n: 'USD/MYR', c: 'MY' },
          { t: 'TWD=X', tv: 'FX_IDC:USDTWD', n: 'USD/TWD', c: 'TW' },
        ] },
        { id: 'emfx', name: 'LatAm & EMEA FX', note: 'High-beta EM', u: [
          { t: 'BRL=X', tv: 'FX_IDC:USDBRL', n: 'USD/BRL', c: 'BR' },
          { t: 'MXN=X', tv: 'FX:USDMXN', n: 'USD/MXN', c: 'MX' },
          { t: 'ZAR=X', tv: 'FX:USDZAR', n: 'USD/ZAR', c: 'ZA' },
          { t: 'TRY=X', tv: 'FX:USDTRY', n: 'USD/TRY', c: 'ME' },
        ] },
        { id: 'idr', name: 'IDR Complex', note: 'Rupiah vs everything', u: [
          { t: 'IDR=X', tv: 'FX_IDC:USDIDR', n: 'USD/IDR', c: 'ID' },
          { t: 'EURIDR=X', tv: 'FX_IDC:EURIDR', n: 'EUR/IDR', c: 'ID' },
          { t: 'JPYIDR=X', tv: 'FX_IDC:JPYIDR', n: 'JPY/IDR', c: 'ID' },
          { t: 'SGDIDR=X', tv: 'FX_IDC:SGDIDR', n: 'SGD/IDR', c: 'ID' },
        ] },
      ],
    },

    // ============ M2 · RATES & CREDIT (BONDS) ============
    {
      id: 'rates', num: 'M2', group: 'markets', accent: '#7fdc9a',
      name: 'Rates & Credit',
      short: 'Sovereign curves · INDOGB · credit ETFs · spreads',
      gics: '—',
      dossier: {
        mandate: 'Global bond monitoring: the US Treasury curve, DM & EM sovereign yields (incl. Indonesian INDOGB), credit (IG/HY/EM) via liquid ETFs, and the spread complex (2s10s, HY OAS).',
        macro: 'Central-bank paths & terminal rates · inflation expectations · term premium · fiscal supply · credit cycle & default rates.',
        themes: 'Curve steepening/inversion regimes · Indonesian bond flows & BI policy · EM local-currency debt · credit-spread cycles.',
        factors: 'Real yields · breakevens · curve slope (2s10s, 3m10s) · IG/HY OAS · duration & convexity · foreign ownership of INDOGB.',
        valuation: 'Fair-value curve models · carry & rolldown · spread vs cycle history · real-yield cross-country comparison.',
        regulation: 'Primary-dealer & auction rules · BI SRBI/SVBI instruments · bank-capital treatment of sovereigns.',
        complexity: 'Medium-high — the desk gives every valuation in the shop its discount-rate context.',
      },
      bench: [
        { label: 'US 10Y Yield', y: '^TNX', tv: 'TVC:US10Y', region: 'US' },
        { label: 'Indonesia 10Y', tv: 'TVC:ID10Y', region: 'ID' },
        { label: 'US 20Y+ Treasuries (TLT)', y: 'TLT', tv: 'NASDAQ:TLT', region: 'US' },
      ],
      subs: [
        { id: 'ust', name: 'US Treasury Curve', note: 'The world\'s discount rate', u: [
          { t: '^IRX', tv: 'TVC:US03MY', n: 'US 13-Week Yield', c: 'US' },
          { t: '^FVX', tv: 'TVC:US05Y', n: 'US 5Y Yield', c: 'US' },
          { t: '^TNX', tv: 'TVC:US10Y', n: 'US 10Y Yield', c: 'US' },
          { t: '^TYX', tv: 'TVC:US30Y', n: 'US 30Y Yield', c: 'US' },
        ] },
        { id: 'dm', name: 'DM Sovereign 10Y', note: 'Live via TradingView', u: [
          { tv: 'TVC:US10Y', n: 'United States 10Y', c: 'US' },
          { tv: 'TVC:DE10Y', n: 'Germany 10Y', c: 'DE' },
          { tv: 'TVC:GB10Y', n: 'United Kingdom 10Y', c: 'GB' },
          { tv: 'TVC:FR10Y', n: 'France 10Y', c: 'FR' },
          { tv: 'TVC:IT10Y', n: 'Italy 10Y', c: 'IT' },
          { tv: 'TVC:JP10Y', n: 'Japan 10Y', c: 'JP' },
          { tv: 'TVC:AU10Y', n: 'Australia 10Y', c: 'AU' },
          { tv: 'TVC:CA10Y', n: 'Canada 10Y', c: 'CA' },
        ] },
        { id: 'em', name: 'EM & Indonesia', note: 'INDOGB & EM peers', u: [
          { tv: 'TVC:ID10Y', n: 'Indonesia 10Y (INDOGB)', c: 'ID' },
          { tv: 'TVC:IN10Y', n: 'India 10Y', c: 'IN' },
          { tv: 'TVC:CN10Y', n: 'China 10Y', c: 'CN' },
          { tv: 'TVC:KR10Y', n: 'South Korea 10Y', c: 'KR' },
          { tv: 'TVC:BR10Y', n: 'Brazil 10Y', c: 'BR' },
          { tv: 'TVC:MX10Y', n: 'Mexico 10Y', c: 'MX' },
          { tv: 'TVC:TR10Y', n: 'Türkiye 10Y', c: 'ME' },
        ] },
        { id: 'credit', name: 'Credit & Bond ETFs', note: 'Liquid proxies', u: [
          { t: 'AGG', tv: 'AMEX:AGG', n: 'US Aggregate (AGG)', c: 'US' },
          { t: 'TLT', tv: 'NASDAQ:TLT', n: '20Y+ Treasury (TLT)', c: 'US' },
          { t: 'IEF', tv: 'NASDAQ:IEF', n: '7-10Y Treasury (IEF)', c: 'US' },
          { t: 'SHY', tv: 'NASDAQ:SHY', n: '1-3Y Treasury (SHY)', c: 'US' },
          { t: 'LQD', tv: 'AMEX:LQD', n: 'IG Corporate (LQD)', c: 'US' },
          { t: 'HYG', tv: 'AMEX:HYG', n: 'High Yield (HYG)', c: 'US' },
          { t: 'EMB', tv: 'NASDAQ:EMB', n: 'EM USD Sovereign (EMB)', c: 'US' },
          { t: 'EMLC', tv: 'AMEX:EMLC', n: 'EM Local Currency (EMLC)', c: 'US' },
        ] },
      ],
      // FRED series for the curve & spread board (via series-proxy, key server-side).
      fred: {
        curve: [
          { id: 'DGS2', label: 'US 2Y' },
          { id: 'DGS5', label: 'US 5Y' },
          { id: 'DGS10', label: 'US 10Y' },
          { id: 'DGS30', label: 'US 30Y' },
        ],
        spreads: [
          { id: 'T10Y2Y', label: '2s10s Curve', unit: '%' },
          { id: 'T10Y3M', label: '3m10s Curve', unit: '%' },
          { id: 'BAMLH0A0HYM2', label: 'US HY OAS', unit: '%' },
          { id: 'BAMLC0A0CM', label: 'US IG OAS', unit: '%' },
        ],
      },
    },

    // ============ M3 · ECONOMICS DESK ============
    {
      id: 'econ', num: 'M3', group: 'markets', accent: '#b8a7f0',
      name: 'Economics Desk',
      short: 'US · China · Indonesia · Global — the strategy & macro layer',
      gics: '—',
      dossier: {
        mandate: 'The Strategy & Macro layer from the coverage redesign, made operational: synthesizes sector-desk inputs into macro, strategy and outlook research. Monitors the US, China, Indonesia and global data pulse that drives every other desk.',
        macro: 'Growth & inflation mix · policy rates & liquidity · fiscal stance · trade flows · commodity terms of trade.',
        themes: 'Soft-landing vs recession regimes · China stimulus cycles · Indonesian twin surpluses/deficits · global manufacturing cycle.',
        factors: 'CPI/PPI · PMIs · labor markets · retail sales & industrial production · trade balances · consumer confidence.',
        valuation: 'Macro regime → asset-allocation implications; the desk publishes Investment & Market Outlooks, not tickers.',
        regulation: 'Central-bank frameworks (Fed, ECB, PBoC, BI) · fiscal rules · trade policy.',
        complexity: 'Medium — synthesis-heavy; powered by the live Refinitiv/FRED/DBnomics book in the Macro terminal (T2).',
      },
      bench: [
        { label: 'S&P 500', y: '^GSPC', tv: 'FOREXCOM:SPXUSD', region: 'US' },
        { label: 'IDX Composite', y: '^JKSE', tv: 'IDX:COMPOSITE', region: 'ID' },
      ],
      // Economics desk renders macro.live_indicators regions instead of a
      // ticker universe. Sub ids map to live_indicators.region values.
      subs: [
        { id: 'United States', name: 'United States', note: 'Live indicator book', live: true, u: [] },
        { id: 'China', name: 'China', note: 'Live indicator book', live: true, u: [] },
        { id: 'Indonesia', name: 'Indonesia', note: 'Live indicator book', live: true, u: [] },
        { id: 'Global', name: 'Global', note: 'Cross-country pulse', live: true, u: [] },
        { id: 'Commodities', name: 'Commodities', note: 'Input-cost complex', live: true, u: [] },
      ],
    },
  ];

  // ---- country benchmark indices (Yahoo-driven explorer) ------------------
  var COUNTRY_INDICES = [
    { y: '^GSPC', tv: 'FOREXCOM:SPXUSD', n: 'S&P 500', c: 'US' },
    { y: '^NDX', tv: 'FOREXCOM:NSXUSD', n: 'Nasdaq 100', c: 'US' },
    { y: '^DJI', tv: 'FOREXCOM:DJI', n: 'Dow Jones 30', c: 'US' },
    { y: '^RUT', tv: 'TVC:RUT', n: 'Russell 2000', c: 'US' },
    { y: '^GSPTSE', n: 'S&P/TSX (Canada)', c: 'CA' },
    { y: '^BVSP', n: 'Bovespa (Brazil)', c: 'BR' },
    { y: '^MXX', n: 'IPC (Mexico)', c: 'MX' },
    { y: '^STOXX50E', n: 'Euro Stoxx 50', c: 'DE' },
    { y: '^FTSE', tv: 'TVC:UKX', n: 'FTSE 100 (UK)', c: 'GB' },
    { y: '^GDAXI', tv: 'XETR:DAX', n: 'DAX (Germany)', c: 'DE' },
    { y: '^FCHI', n: 'CAC 40 (France)', c: 'FR' },
    { y: '^AEX', n: 'AEX (Netherlands)', c: 'NL' },
    { y: '^SSMI', n: 'SMI (Switzerland)', c: 'CH' },
    { y: '^IBEX', tv: 'BME:IBC', n: 'IBEX 35 (Spain)', c: 'ES' },
    { y: 'FTSEMIB.MI', tv: 'MIL:FTSEMIB', n: 'FTSE MIB (Italy)', c: 'IT' },
    { y: '^N225', tv: 'INDEX:NKY', n: 'Nikkei 225 (Japan)', c: 'JP' },
    { y: '000001.SS', tv: 'TVC:SSEC', n: 'Shanghai Composite', c: 'CN' },
    { y: '000300.SS', n: 'CSI 300 (China)', c: 'CN' },
    { y: '^HSI', tv: 'TVC:HSI', n: 'Hang Seng (Hong Kong)', c: 'HK' },
    { y: '^TWII', n: 'TAIEX (Taiwan)', c: 'TW' },
    { y: '^KS11', tv: 'KRX:KOSPI', n: 'KOSPI (South Korea)', c: 'KR' },
    { y: '^BSESN', tv: 'BSE:SENSEX', n: 'Sensex (India)', c: 'IN' },
    { y: '^NSEI', tv: 'NSE:NIFTY', n: 'Nifty 50 (India)', c: 'IN' },
    { y: '^AXJO', tv: 'ASX:XJO', n: 'ASX 200 (Australia)', c: 'AU' },
    { y: '^STI', n: 'Straits Times (Singapore)', c: 'SG' },
    { y: '^KLSE', n: 'KLCI (Malaysia)', c: 'MY' },
    { y: '^JKSE', tv: 'IDX:COMPOSITE', n: 'IDX Composite (Indonesia)', c: 'ID' },
    { y: '^JKLQ45', tv: 'IDX:LQ45', n: 'LQ45 (Indonesia)', c: 'ID' },
  ];

  // ---- TradingView screener markets ---------------------------------------
  var SCREENER_MARKETS = [
    { id: 'america', label: 'United States' }, { id: 'indonesia', label: 'Indonesia' },
    { id: 'japan', label: 'Japan' }, { id: 'china', label: 'China' }, { id: 'hongkong', label: 'Hong Kong' },
    { id: 'korea', label: 'South Korea' }, { id: 'taiwan', label: 'Taiwan' }, { id: 'india', label: 'India' },
    { id: 'singapore', label: 'Singapore' }, { id: 'malaysia', label: 'Malaysia' }, { id: 'thailand', label: 'Thailand' },
    { id: 'vietnam', label: 'Vietnam' }, { id: 'australia', label: 'Australia' },
    { id: 'uk', label: 'United Kingdom' }, { id: 'germany', label: 'Germany' }, { id: 'france', label: 'France' },
    { id: 'spain', label: 'Spain' }, { id: 'italy', label: 'Italy' }, { id: 'switzerland', label: 'Switzerland' },
    { id: 'canada', label: 'Canada' }, { id: 'brazil', label: 'Brazil' }, { id: 'mexico', label: 'Mexico' },
    { id: 'ksa', label: 'Saudi Arabia' }, { id: 'rsa', label: 'South Africa' },
    { id: 'forex', label: 'Forex' }, { id: 'crypto', label: 'Crypto' },
  ];

  // ---- structure roadmap (from the coverage-design doc) --------------------
  var ROADMAP = [
    { phase: 'Phase 0', teams: '6 teams', note: 'Generalist teams (FIRE, TMT, Consumer, Healthcare, Industrials, Natural Resources). Was current until this restructure.' },
    { phase: 'Phase 1', teams: '8 teams', note: 'Split FIRE → Financials + Real Estate; Consumer → Staples + Discretionary.' },
    { phase: 'Phase 2', teams: '10 + 3 desks', note: 'TARGET (live now): full sector specialization + FX, Rates & Credit, Economics market desks.', active: true },
    { phase: 'Phase 3', teams: '12–15 teams', note: 'Mature state: split Banking vs Insurance/NBFI, Semis vs Software, at 50–80+ analysts.' },
  ];

  // ---- helpers -------------------------------------------------------------
  function deskById(id) { for (var i = 0; i < DESKS.length; i++) if (DESKS[i].id === id) return DESKS[i]; return null; }

  function deskUniverse(desk, subId, regionFilter, countryFilter) {
    var out = [], seen = {};
    (desk.subs || []).forEach(function (s) {
      if (subId && subId !== 'all' && s.id !== subId) return;
      (s.u || []).forEach(function (row) {
        var key = row.t || row.tv;
        if (seen[key]) return;
        if (regionFilter && !inRegion(row.c, regionFilter)) return;
        if (countryFilter && row.c !== countryFilter) return;
        seen[key] = 1;
        out.push(Object.assign({ sub: s.name, subId: s.id }, row));
      });
    });
    return out;
  }

  function deskCountries(desk) {
    var set = {};
    (desk.subs || []).forEach(function (s) { (s.u || []).forEach(function (r) { if (r.c && COUNTRIES[r.c]) set[r.c] = 1; }); });
    return Object.keys(set).sort(function (a, b) {
      var an = COUNTRIES[a].n, bn = COUNTRIES[b].n;
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  }

  // Search every desk's universe (for the Index Lab picker).
  function searchUniverse(q) {
    q = (q || '').trim().toLowerCase();
    var out = [];
    DESKS.forEach(function (d) {
      (d.subs || []).forEach(function (s) {
        (s.u || []).forEach(function (r) {
          if (!r.t) return;
          if (!q || r.t.toLowerCase().indexOf(q) >= 0 || (r.n || '').toLowerCase().indexOf(q) >= 0) {
            out.push({ t: r.t, tv: r.tv, n: r.n, c: r.c, desk: d.name, sub: s.name });
          }
        });
      });
    });
    return out;
  }

  window.MONITOR_DATA = {
    VERSION: '2026.07',
    COUNTRIES: COUNTRIES,
    REGION_FILTERS: REGION_FILTERS,
    DESKS: DESKS,
    COUNTRY_INDICES: COUNTRY_INDICES,
    SCREENER_MARKETS: SCREENER_MARKETS,
    ROADMAP: ROADMAP,
    inRegion: inRegion,
    deskById: deskById,
    deskUniverse: deskUniverse,
    deskCountries: deskCountries,
    searchUniverse: searchUniverse,
  };
})();
