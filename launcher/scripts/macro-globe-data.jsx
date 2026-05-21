// ================================================================
// MacroGlobe — real-data fixtures + live fetchers
//   power plants: WRI Global Power Plant Database, curated
//   ships:        curated AIS-style fixtures along major lanes
//   aircraft:     OpenSky Network anonymous REST API (live)
//   satellites:   Celestrak TLE feed (live) + satellite.js propagation
// ================================================================

// ---- Curated power plants (>1500 MW or strategically notable) ----
const POWER_PLANTS = [
  // Hydro
  { id:'pp-3g',    name:'Three Gorges',        country:'CN', fuel:'hydro',  mw:22500, lat:30.823,  lon:111.005, year:2012, op:'China Yangtze Power' },
  { id:'pp-itp',   name:'Itaipu',              country:'BR/PY', fuel:'hydro', mw:14000, lat:-25.408, lon:-54.589, year:1984, op:'Itaipu Binacional' },
  { id:'pp-xld',   name:'Xiluodu',             country:'CN', fuel:'hydro',  mw:13860, lat:28.213, lon:103.650, year:2014, op:'China Yangtze Power' },
  { id:'pp-bm',    name:'Belo Monte',          country:'BR', fuel:'hydro',  mw:11233, lat:-3.115, lon:-51.797, year:2016, op:'Norte Energia' },
  { id:'pp-guri',  name:'Guri (Simón Bolívar)', country:'VE', fuel:'hydro', mw:10235, lat:7.768, lon:-62.998, year:1986, op:'CORPOELEC' },
  { id:'pp-tcr',   name:'Tucuruí',             country:'BR', fuel:'hydro',  mw:8370, lat:-3.829, lon:-49.643, year:1984, op:'Eletrobras' },
  { id:'pp-gc',    name:'Grand Coulee',        country:'US', fuel:'hydro',  mw:6809, lat:47.957, lon:-118.982, year:1942, op:'US Bureau of Reclamation' },
  { id:'pp-ssh',   name:'Sayano-Shushenskaya', country:'RU', fuel:'hydro',  mw:6400, lat:52.825, lon:91.366, year:1989, op:'RusHydro' },
  { id:'pp-rb',    name:'Robert-Bourassa',     country:'CA', fuel:'hydro',  mw:5616, lat:53.790, lon:-77.440, year:1979, op:'Hydro-Québec' },
  { id:'pp-cf',    name:'Churchill Falls',     country:'CA', fuel:'hydro',  mw:5428, lat:53.534, lon:-64.012, year:1971, op:'Nalcor Energy' },
  { id:'pp-brt',   name:'Bratsk',              country:'RU', fuel:'hydro',  mw:4500, lat:56.298, lon:101.808, year:1967, op:'En+ Group' },
  { id:'pp-uki',   name:'Ust-Ilimsk',          country:'RU', fuel:'hydro',  mw:3840, lat:58.000, lon:102.667, year:1980, op:'En+ Group' },
  { id:'pp-ert',   name:'Ertan',               country:'CN', fuel:'hydro',  mw:3300, lat:28.130, lon:101.520, year:1999, op:'Yalong River HC' },
  { id:'pp-irg',   name:'Iron Gates I',        country:'RO/RS', fuel:'hydro', mw:2192, lat:44.668, lon:22.526, year:1972, op:'Hidroelectrica' },

  // Nuclear
  { id:'pp-kk',    name:'Kashiwazaki-Kariwa',  country:'JP', fuel:'nuclear', mw:7965, lat:37.428, lon:138.603, year:1985, op:'TEPCO' },
  { id:'pp-yj',    name:'Yangjiang',           country:'CN', fuel:'nuclear', mw:6516, lat:21.715, lon:112.265, year:2014, op:'CGN' },
  { id:'pp-bru',   name:'Bruce',               country:'CA', fuel:'nuclear', mw:6232, lat:44.325, lon:-81.600, year:1977, op:'Bruce Power' },
  { id:'pp-fq',    name:'Fuqing',              country:'CN', fuel:'nuclear', mw:6160, lat:25.460, lon:119.450, year:2014, op:'CNNC' },
  { id:'pp-han',   name:'Hanul',               country:'KR', fuel:'nuclear', mw:5881, lat:37.094, lon:129.379, year:1988, op:'KHNP' },
  { id:'pp-hbk',   name:'Hanbit',              country:'KR', fuel:'nuclear', mw:5875, lat:35.412, lon:126.418, year:1986, op:'KHNP' },
  { id:'pp-hyl',   name:'Hongyanhe',           country:'CN', fuel:'nuclear', mw:5700, lat:39.799, lon:121.487, year:2013, op:'CGN' },
  { id:'pp-zap',   name:'Zaporizhzhia',        country:'UA', fuel:'nuclear', mw:5700, lat:47.512, lon:34.586, year:1985, op:'Energoatom' },
  { id:'pp-grv',   name:'Gravelines',          country:'FR', fuel:'nuclear', mw:5460, lat:51.014, lon:2.137,  year:1980, op:'EDF' },
  { id:'pp-pal',   name:'Paluel',              country:'FR', fuel:'nuclear', mw:5320, lat:49.858, lon:0.633,  year:1984, op:'EDF' },
  { id:'pp-cat',   name:'Cattenom',            country:'FR', fuel:'nuclear', mw:5200, lat:49.420, lon:6.218,  year:1986, op:'EDF' },
  { id:'pp-tw',    name:'Tianwan',             country:'CN', fuel:'nuclear', mw:5100, lat:34.685, lon:119.466, year:2007, op:'CNNC' },
  { id:'pp-vog',   name:'Vogtle',              country:'US', fuel:'nuclear', mw:4536, lat:33.143, lon:-81.762, year:1987, op:'Southern Nuclear' },
  { id:'pp-pv',    name:'Palo Verde',          country:'US', fuel:'nuclear', mw:4001, lat:33.388, lon:-112.866, year:1986, op:'APS' },
  { id:'pp-bf',    name:'Browns Ferry',        country:'US', fuel:'nuclear', mw:3458, lat:34.704, lon:-87.119, year:1974, op:'TVA' },
  { id:'pp-rng',   name:'Ringhals',            country:'SE', fuel:'nuclear', mw:3000, lat:57.260, lon:12.115, year:1976, op:'Vattenfall' },
  { id:'pp-fsm',   name:'Forsmark',            country:'SE', fuel:'nuclear', mw:3300, lat:60.404, lon:18.166, year:1980, op:'Vattenfall' },
  { id:'pp-olk',   name:'Olkiluoto',           country:'FI', fuel:'nuclear', mw:4300, lat:61.236, lon:21.444, year:1979, op:'TVO' },
  { id:'pp-dia',   name:'Diablo Canyon',       country:'US', fuel:'nuclear', mw:2256, lat:35.211, lon:-120.853, year:1985, op:'PG&E' },

  // Coal
  { id:'pp-ttk',   name:'Tuoketuo',            country:'CN', fuel:'coal',   mw:6700, lat:40.232, lon:111.187, year:2003, op:'China Datang' },
  { id:'pp-tch',   name:'Taichung',            country:'TW', fuel:'coal',   mw:5500, lat:24.213, lon:120.547, year:1992, op:'Taipower' },
  { id:'pp-blc',   name:'Bełchatów',           country:'PL', fuel:'coal',   mw:5102, lat:51.265, lon:19.327, year:1988, op:'PGE' },
  { id:'pp-kus',   name:'Kusile',              country:'ZA', fuel:'coal',   mw:4800, lat:-25.989, lon:28.985, year:2017, op:'Eskom' },
  { id:'pp-vch',   name:'Vindhyachal',         country:'IN', fuel:'coal',   mw:4760, lat:24.107, lon:82.671, year:1987, op:'NTPC' },
  { id:'pp-pai',   name:'Paiton',              country:'ID', fuel:'coal',   mw:4710, lat:-7.710, lon:113.585, year:1999, op:'PLN/IPP' },
  { id:'pp-mun',   name:'Mundra UMPP',         country:'IN', fuel:'coal',   mw:4620, lat:22.838, lon:69.547, year:2012, op:'Tata Power' },
  { id:'pp-knd',   name:'Kendal',              country:'ZA', fuel:'coal',   mw:4116, lat:-26.087, lon:28.973, year:1989, op:'Eskom' },
  { id:'pp-mjb',   name:'Majuba',              country:'ZA', fuel:'coal',   mw:4110, lat:-27.105, lon:29.764, year:1996, op:'Eskom' },
  { id:'pp-sur',   name:'Suralaya',            country:'ID', fuel:'coal',   mw:4025, lat:-5.901, lon:105.997, year:1984, op:'PLN' },
  { id:'pp-sas',   name:'Sasan UMPP',          country:'IN', fuel:'coal',   mw:3960, lat:24.105, lon:82.672, year:2013, op:'Reliance Power' },
  { id:'pp-drx',   name:'Drax (biomass-conv)',  country:'UK', fuel:'biomass', mw:3870, lat:53.737, lon:-0.998, year:1974, op:'Drax Group' },
  { id:'pp-rwc',   name:'Robert W. Scherer',   country:'US', fuel:'coal',   mw:3520, lat:33.063, lon:-83.810, year:1982, op:'Georgia Power' },
  { id:'pp-bwn',   name:'Plant Bowen',         country:'US', fuel:'coal',   mw:3499, lat:34.124, lon:-84.918, year:1971, op:'Georgia Power' },
  { id:'pp-tjb',   name:'Tanjung Jati B',      country:'ID', fuel:'coal',   mw:2640, lat:-6.450, lon:110.740, year:2006, op:'PLN/IPP' },

  // Gas
  { id:'pp-srg',   name:'Surgutskaya 2',       country:'RU', fuel:'gas',    mw:5597, lat:61.302, lon:73.526, year:1985, op:'Unipro' },
  { id:'pp-fut',   name:'Futtsu',              country:'JP', fuel:'gas',    mw:5040, lat:35.339, lon:139.831, year:1985, op:'JERA' },
  { id:'pp-kwg',   name:'Kawagoe',             country:'JP', fuel:'gas',    mw:4802, lat:35.046, lon:136.689, year:1989, op:'JERA' },
  { id:'pp-aneg',  name:'Anegasaki',           country:'JP', fuel:'gas',    mw:3600, lat:35.504, lon:140.043, year:1971, op:'JERA' },

  // Oil
  { id:'pp-shb',   name:'Shoaiba',             country:'SA', fuel:'oil',    mw:5600, lat:20.683, lon:39.527, year:1989, op:'SEC' },

  // Wind (onshore + offshore)
  { id:'pp-gns',   name:'Gansu Wind Farm',     country:'CN', fuel:'wind',   mw:7965, lat:39.500, lon:96.000, year:2010, op:'CGN/Datang' },
  { id:'pp-mup',   name:'Muppandal Wind',      country:'IN', fuel:'wind',   mw:1500, lat:8.252,  lon:77.561, year:1986, op:'Tamil Nadu' },
  { id:'pp-alt',   name:'Alta Wind Energy',    country:'US', fuel:'wind',   mw:1548, lat:35.038, lon:-118.300, year:2010, op:'Terra-Gen' },
  { id:'pp-hor1',  name:'Hornsea 1',           country:'UK', fuel:'wind',   mw:1218, lat:53.830, lon:1.790, year:2019, op:'Ørsted' },
  { id:'pp-hor2',  name:'Hornsea 2',           country:'UK', fuel:'wind',   mw:1320, lat:53.930, lon:1.790, year:2022, op:'Ørsted' },
  { id:'pp-trk',   name:'Triton Knoll',        country:'UK', fuel:'wind',   mw:857,  lat:53.534, lon:0.850, year:2021, op:'RWE' },
  { id:'pp-rsc',   name:'Roscoe',              country:'US', fuel:'wind',   mw:781,  lat:32.473, lon:-100.553, year:2009, op:'E.ON' },
  { id:'pp-bor',   name:'Borssele',            country:'NL', fuel:'wind',   mw:752,  lat:51.700, lon:3.000, year:2020, op:'Ørsted' },
  { id:'pp-hh',    name:'Horse Hollow',        country:'US', fuel:'wind',   mw:736,  lat:32.236, lon:-100.070, year:2006, op:'NextEra' },
  { id:'pp-eao',   name:'East Anglia ONE',     country:'UK', fuel:'wind',   mw:714,  lat:52.550, lon:2.160, year:2020, op:'ScottishPower' },
  { id:'pp-cap',   name:'Capricorn Ridge',     country:'US', fuel:'wind',   mw:662,  lat:32.057, lon:-100.706, year:2008, op:'NextEra' },
  { id:'pp-wln',   name:'Walney Extension',    country:'UK', fuel:'wind',   mw:659,  lat:54.050, lon:-3.500, year:2018, op:'Ørsted' },
  { id:'pp-lon',   name:'London Array',        country:'UK', fuel:'wind',   mw:630,  lat:51.633, lon:1.500, year:2013, op:'RWE/Ørsted' },
  { id:'pp-bea',   name:'Beatrice',            country:'UK', fuel:'wind',   mw:588,  lat:58.226, lon:-2.876, year:2019, op:'SSE' },
  { id:'pp-rcb',   name:'Race Bank',           country:'UK', fuel:'wind',   mw:573,  lat:53.330, lon:0.980, year:2018, op:'Ørsted' },
  { id:'pp-fc',    name:'Fântânele-Cogealac',  country:'RO', fuel:'wind',   mw:600,  lat:44.617, lon:28.531, year:2012, op:'CEZ' },

  // Solar
  { id:'pp-dat',   name:'Datong Solar',        country:'CN', fuel:'solar',  mw:3000, lat:39.795, lon:113.281, year:2016, op:'GCL' },
  { id:'pp-bhd',   name:'Bhadla Solar Park',   country:'IN', fuel:'solar',  mw:2245, lat:27.539, lon:71.911, year:2018, op:'Adani/SECI' },
  { id:'pp-pvg',   name:'Pavagada Solar',      country:'IN', fuel:'solar',  mw:2050, lat:14.281, lon:77.435, year:2019, op:'KSPDCL' },
  { id:'pp-tng',   name:'Tengger Desert Solar',country:'CN', fuel:'solar',  mw:1547, lat:37.557, lon:105.013, year:2016, op:'Zhongmin' },
  { id:'pp-krn',   name:'Kurnool Ultra Mega',  country:'IN', fuel:'solar',  mw:1000, lat:15.683, lon:77.700, year:2017, op:'SECI' },
  { id:'pp-cmt',   name:'Copper Mountain',     country:'US', fuel:'solar',  mw:802,  lat:35.700, lon:-114.900, year:2010, op:'Sempra' },
  { id:'pp-mts',   name:'Mount Signal',        country:'US', fuel:'solar',  mw:794,  lat:32.687, lon:-115.708, year:2014, op:'8minute Solar' },
  { id:'pp-sst',   name:'Solar Star',          country:'US', fuel:'solar',  mw:579,  lat:35.018, lon:-118.378, year:2015, op:'BHE Renewables' },
  { id:'pp-spr',   name:'Springbok',           country:'US', fuel:'solar',  mw:547,  lat:35.270, lon:-115.660, year:2016, op:'Sempra' },
  { id:'pp-tpz',   name:'Topaz',               country:'US', fuel:'solar',  mw:550,  lat:35.388, lon:-120.064, year:2014, op:'BHE Renewables' },

  // Geothermal
  { id:'pp-gys',   name:'The Geysers',         country:'US', fuel:'geo',    mw:1517, lat:38.790, lon:-122.755, year:1960, op:'Calpine' },
  { id:'pp-svw',   name:'Salak/Wayang Windu/Kamojang', country:'ID', fuel:'geo', mw:1200, lat:-7.150, lon:107.660, year:1983, op:'Pertamina/Star Energy' },
  { id:'pp-olkr',  name:'Olkaria',             country:'KE', fuel:'geo',    mw:800,  lat:-0.892, lon:36.298, year:1981, op:'KenGen' },
  { id:'pp-cpr',   name:'Cerro Prieto',        country:'MX', fuel:'geo',    mw:720,  lat:32.400, lon:-115.225, year:1973, op:'CFE' },
  { id:'pp-lar',   name:'Larderello',          country:'IT', fuel:'geo',    mw:769,  lat:43.244, lon:10.871, year:1913, op:'Enel' },
];

// ---- Curated AIS-style ships along major shipping lanes ----
const SHIPS_FIXTURES = [
  // Strait of Malacca (one of the busiest in the world)
  { id:'ev-evrglv',   name:'Evergreen Globe', imo:'9893620', mmsi:'305821000', type:'container', flag:'PA', lat:1.265, lon:103.843, hdg:285, sog:14.2, dest:'SGP→COL', cargo:'18,300 TEU' },
  { id:'ev-msc-iri',  name:'MSC Irina',       imo:'9929433', mmsi:'636019999', type:'container', flag:'LR', lat:2.450, lon:101.250, hdg:300, sog:18.5, dest:'PKG→ROT', cargo:'24,346 TEU' },
  { id:'ev-coc-asia', name:'COSCO Asia',      imo:'9716818', mmsi:'477121000', type:'container', flag:'HK', lat:3.890, lon:99.180,  hdg:300, sog:16.8, dest:'SHA→JEA', cargo:'13,386 TEU' },
  { id:'ev-tnk-vlcc', name:'Yuan Hua Hu',     imo:'9885376', mmsi:'413551370', type:'tanker',    flag:'CN', lat:0.840, lon:104.300, hdg:60,  sog:13.1, dest:'RAS→SHA', cargo:'306k DWT crude' },

  // Suez Canal
  { id:'ev-mae-ess',  name:'Mærsk Essen',     imo:'9456787', mmsi:'219094000', type:'container', flag:'DK', lat:30.580, lon:32.350, hdg:355, sog:8.0,  dest:'YPS→SOK', cargo:'13,000 TEU' },
  { id:'ev-cma-jcq',  name:'CMA Jacques Saadé', imo:'9839430', mmsi:'228365800', type:'container', flag:'FR', lat:31.180, lon:32.380, hdg:355, sog:8.5,  dest:'POC→SHA', cargo:'23,112 TEU' },
  { id:'ev-frt-tnk',  name:'Front Tana',      imo:'9872733', mmsi:'538008730', type:'tanker',    flag:'MH', lat:29.700, lon:32.580, hdg:175, sog:9.8,  dest:'SUM→ROT', cargo:'159k DWT crude' },

  // Strait of Hormuz
  { id:'ev-vaq-bg1',  name:'Al Mafyar',       imo:'9337777', mmsi:'440666000', type:'lng',       flag:'QA', lat:26.490, lon:56.220, hdg:120, sog:16.5, dest:'RLT→GLD', cargo:'266k m³ LNG' },
  { id:'ev-bsh-clb',  name:'British Caliope', imo:'9594230', mmsi:'232020000', type:'tanker',    flag:'UK', lat:26.640, lon:56.470, hdg:140, sog:14.0, dest:'JZA→RTM', cargo:'159k DWT crude' },

  // Panama Canal
  { id:'ev-msk-ess',  name:'OOCL Spain',      imo:'9776161', mmsi:'477444500', type:'container', flag:'HK', lat:9.080,  lon:-79.700, hdg:90,  sog:7.5,  dest:'LBP→NJX', cargo:'21,413 TEU' },
  { id:'ev-han-hwy',  name:'Hyundai Highway', imo:'9305609', mmsi:'538009870', type:'roro',      flag:'MH', lat:9.190,  lon:-79.880, hdg:270, sog:6.8,  dest:'NYK→TYO', cargo:'7,300 vehicles' },

  // English Channel / Dover Strait
  { id:'ev-cou-cag',  name:'Courtney Calypso', imo:'9304847', mmsi:'636017390', type:'container', flag:'UK', lat:50.950, lon:1.380, hdg:225, sog:18.5, dest:'FXT→ANR', cargo:'9,500 TEU' },
  { id:'ev-frr-bel',  name:'P&O Spirit of Britain', imo:'9524241', mmsi:'235082000', type:'roro',  flag:'UK', lat:51.080, lon:1.290, hdg:135, sog:17.8, dest:'DOV→CAL', cargo:'2,000 pax/180 trucks' },

  // Bosphorus
  { id:'ev-gez-tnk',  name:'Aramco Spirit',   imo:'9689829', mmsi:'538005530', type:'tanker',    flag:'MH', lat:41.080, lon:29.040, hdg:5,   sog:10.2, dest:'NVR→ROT', cargo:'318k DWT crude' },
  { id:'ev-bsf-cnt',  name:'Maersk Mzansi',   imo:'9760033', mmsi:'219090710', type:'container', flag:'DK', lat:41.200, lon:29.100, hdg:5,   sog:8.5,  dest:'IST→ODS', cargo:'7,940 TEU' },

  // North Atlantic — busy transatlantic lane
  { id:'ev-nya-cnt1', name:'Atlantic Cartier', imo:'9168211', mmsi:'253187000', type:'roro',     flag:'LU', lat:50.450, lon:-30.200, hdg:265, sog:19.8, dest:'LBP→HFX', cargo:'2,150 vehicles' },
  { id:'ev-nya-tnk1', name:'Eagle Auriga',    imo:'9388349', mmsi:'533052500', type:'tanker',    flag:'MY', lat:42.300, lon:-50.100, hdg:90,  sog:13.8, dest:'COR→ARA', cargo:'159k DWT crude' },

  // Sunda Strait / Indonesia
  { id:'ev-pls-ind1', name:'Pertamina Prime', imo:'9869906', mmsi:'525025000', type:'tanker',    flag:'ID', lat:-6.090, lon:105.510, hdg:200, sog:11.5, dest:'CIL→BPN', cargo:'159k DWT crude' },
  { id:'ev-pls-ind2', name:'KMP Sebuku',      imo:'9543324', mmsi:'525120120', type:'roro',      flag:'ID', lat:-5.900, lon:105.860, hdg:90,  sog:14.0, dest:'BAK→MRK', cargo:'480 pax/120 trucks' },

  // South China Sea
  { id:'ev-scs-cnt1', name:'OOCL Hong Kong',  imo:'9776171', mmsi:'477888000', type:'container', flag:'HK', lat:15.500, lon:114.000, hdg:30,  sog:22.5, dest:'JEA→YTN', cargo:'21,413 TEU' },
  { id:'ev-scs-cnt2', name:'HMM Algeciras',   imo:'9863308', mmsi:'538009030', type:'container', flag:'MH', lat:18.200, lon:117.500, hdg:60,  sog:21.2, dest:'NSA→ROT', cargo:'23,964 TEU' },
  { id:'ev-scs-bul',  name:'Vale Brasil',     imo:'9522129', mmsi:'636092700', type:'bulker',    flag:'LR', lat:13.800, lon:115.200, hdg:200, sog:14.2, dest:'PDM→CFP', cargo:'400k DWT iron ore' },

  // North Sea
  { id:'ev-nse-cnt1', name:'CMA Magellan',    imo:'9454464', mmsi:'228340900', type:'container', flag:'FR', lat:53.500, lon:3.000,  hdg:225, sog:19.5, dest:'HBG→FXT', cargo:'14,000 TEU' },
  { id:'ev-nse-frr',  name:'Stena Hollandica',imo:'9419170', mmsi:'235068550', type:'roro',      flag:'UK', lat:53.000, lon:3.500,  hdg:90,  sog:21.5, dest:'HOK→HRW', cargo:'1,300 pax/300 trucks' },

  // Tokyo Bay
  { id:'ev-tky-cnt',  name:'ONE Apus',        imo:'9806079', mmsi:'538008060', type:'container', flag:'MH', lat:35.450, lon:139.800, hdg:270, sog:6.0,  dest:'YOK→LBP', cargo:'14,062 TEU' },
  { id:'ev-tky-bul',  name:'Iron Storm',      imo:'9658600', mmsi:'432911000', type:'bulker',    flag:'JP', lat:35.300, lon:139.900, hdg:90,  sog:8.5,  dest:'PHB→KYK', cargo:'180k DWT iron ore' },

  // Cape of Good Hope
  { id:'ev-cgh-cnt',  name:'MSC Gülsün',      imo:'9839272', mmsi:'636019930', type:'container', flag:'LR', lat:-34.500, lon:18.200, hdg:60, sog:21.0, dest:'GIO→FXT', cargo:'23,756 TEU' },

  // Gulf of Mexico
  { id:'ev-gom-tnk1', name:'Eagle Ford',      imo:'9776822', mmsi:'538008820', type:'tanker',    flag:'MH', lat:28.500, lon:-90.000, hdg:90, sog:13.0, dest:'COR→PJG', cargo:'159k DWT crude' },
  { id:'ev-gom-lng',  name:'Sabine Pass',     imo:'9651066', mmsi:'538004290', type:'lng',       flag:'MH', lat:29.730, lon:-93.860, hdg:175, sog:0.5, dest:'SBP→YOK', cargo:'168k m³ LNG' },
];

// ================================================================
// LIVE FETCHERS
// ================================================================

// airplanes.live — community ADS-B receiver network, public anonymous API
// CORS: Access-Control-Allow-Origin: *. Hard 250 NM radius cap per query,
// so we aggregate 8 regional centers covering major commercial airspaces.
const AIRCRAFT_REGIONS = [
  { id: 'nam-e', name: 'North America (E)', lat: 40.7, lon: -74.0,  r: 250 },
  { id: 'nam-w', name: 'North America (W)', lat: 37.5, lon: -122.0, r: 250 },
  { id: 'eur-w', name: 'Europe (W)',        lat: 50.5, lon: 4.5,    r: 250 },
  { id: 'eur-c', name: 'Europe (C)',        lat: 48.0, lon: 14.0,   r: 250 },
  { id: 'mea',   name: 'Middle East',       lat: 25.3, lon: 55.4,   r: 250 },
  { id: 'sea',   name: 'Southeast Asia',    lat: 1.3,  lon: 103.8,  r: 250 },
  { id: 'apac',  name: 'East Asia',         lat: 30.0, lon: 121.0,  r: 250 },
  { id: 'aus',   name: 'Australia',         lat: -33.9, lon: 151.0, r: 250 },
];

window.MacroGlobeFetchers = {
  fetchAircraft: async () => {
    const allRows = [];
    const errors = [];
    await Promise.all(AIRCRAFT_REGIONS.map(async (reg) => {
      try {
        const r = await fetch(`https://api.airplanes.live/v2/point/${reg.lat}/${reg.lon}/${reg.r}`, { mode: 'cors' });
        if (!r.ok) throw new Error(`${reg.id} ${r.status}`);
        const j = await r.json();
        const list = (j.ac || []).filter(a => a.lat != null && a.lon != null);
        list.forEach(a => allRows.push({ ...a, _region: reg.id }));
      } catch (e) {
        errors.push(reg.id);
      }
    }));
    if (allRows.length === 0 && errors.length === AIRCRAFT_REGIONS.length) {
      console.warn('[Globe] All aircraft regions failed:', errors.join(','));
      return null;
    }
    // Dedup by hex (some aircraft visible in multiple regional feeds)
    const seen = new Set();
    return allRows
      .filter(a => { if (seen.has(a.hex)) return false; seen.add(a.hex); return true; })
      .map(a => ({
        icao: a.hex || '',
        callsign: (a.flight || a.r || a.hex || '').trim(),
        registration: a.r || '',
        type: a.t || '',
        desc: a.desc || '',
        operator: a.ownOp || '',
        year: a.year || '',
        lon: a.lon,
        lat: a.lat,
        altFt: a.alt_baro === 'ground' ? 0 : (a.alt_baro || a.alt_geom || 0),
        altM: ((a.alt_baro === 'ground' ? 0 : (a.alt_baro || a.alt_geom || 0)) * 0.3048),
        gsKn: a.gs || 0,
        velMs: (a.gs || 0) * 0.514444,
        hdgDeg: a.track || a.true_heading || 0,
        vRate: (a.baro_rate || 0) * 0.00508,
        squawk: a.squawk || '',
        category: a.category || '',
        emergency: a.emergency || 'none',
        source: 'airplanes.live',
        region: a._region,
      }));
  },

  // Celestrak — TLE feed for satellite groups (no key required)
  // Categories: stations (ISS, Tiangong), starlink, weather, gps-ops, science, intelsat, brightest
  fetchTLEs: async (group = 'active') => {
    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
      const r = await fetch(url, { mode: 'cors' });
      if (!r.ok) throw new Error(`Celestrak ${r.status}`);
      const text = await r.text();
      const lines = text.replace(/\r/g, '').trim().split('\n');
      const tles = [];
      for (let i = 0; i + 2 < lines.length; i += 3) {
        const name = lines[i].trim();
        const l1 = lines[i + 1].trim();
        const l2 = lines[i + 2].trim();
        if (l1.startsWith('1 ') && l2.startsWith('2 ')) {
          tles.push({ name, l1, l2, group });
        }
      }
      return tles;
    } catch (e) {
      console.warn('[Globe] Celestrak fetch failed:', e.message);
      return null;
    }
  },
};

// ================================================================
// AISStream — wss://stream.aisstream.io/v0/stream
// Free tier, registration required. Returns real-time AIS reports.
//
// Local proxy escape hatch: when a browser extension / wallet / AV is
// killing the direct WSS, run `node scripts/aisstream-proxy.js` and we
// will auto-detect ws://127.0.0.1:8123 and route through it. Loopback
// WebSockets are not interceptable by content scripts.
// ================================================================
const AIS_DIRECT_URL = 'wss://stream.aisstream.io/v0/stream';
const AIS_PROXY_URL  = 'ws://127.0.0.1:8123';
const AIS_PROXY_HEALTH = 'http://127.0.0.1:8123/health';

// Probe the local proxy. Result is cached for 8s — short enough that the
// user can `npm run proxy` after the page loaded and refresh-free pickup
// works, long enough to avoid hammering on every reconnect.
let _aisProxyProbe = null;
let _aisProxyProbeAt = 0;
window.MacroGlobeFetchers.probeAISProxy = () => {
  const fresh = _aisProxyProbe && (Date.now() - _aisProxyProbeAt < 8_000);
  if (fresh) return _aisProxyProbe;
  _aisProxyProbeAt = Date.now();
  _aisProxyProbe = (async () => {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 800);
      const r = await fetch(AIS_PROXY_HEALTH, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (!r.ok) return false;
      const j = await r.json().catch(() => null);
      return !!(j && j.ok);
    } catch { return false; }
  })();
  return _aisProxyProbe;
};

window.MacroGlobeFetchers.openAISStream = (apiKey, bboxes, handlers) => {
  if (!apiKey) return null;
  let ws = null, retry = 0, alive = true, retryTimer = null;
  let killCycleCount = 0; // number of consecutive opens that closed (1006) before receiving any data
  let everReceivedData = false;
  let viaProxy = false;
  const connect = async () => {
    if (!alive) return;
    if (retry === 0) viaProxy = await window.MacroGlobeFetchers.probeAISProxy();
    const url = viaProxy ? AIS_PROXY_URL : AIS_DIRECT_URL;
    console.log('[AIS] connecting to', url, viaProxy ? '(via local proxy)' : '(direct)');
    if (viaProxy && handlers.onTransport) handlers.onTransport('proxy');
    if (!viaProxy && handlers.onTransport) handlers.onTransport('direct');
    try { ws = new WebSocket(url); }
    catch (e) { console.error('[AIS] WebSocket ctor failed:', e); handlers.onError && handlers.onError(e); return null; }
    // AISStream serves JSON over WebSocket BINARY frames, not text frames.
    // Default browser binaryType is 'blob' — JSON.parse(Blob) silently throws.
    // Switch to ArrayBuffer so we can TextDecode → string synchronously.
    ws.binaryType = 'arraybuffer';
    let openedThisCycle = false;
    let receivedThisCycle = false;
    ws.onopen = () => {
      retry = 0;
      openedThisCycle = true;
      const sub = {
        APIKey: apiKey,
        BoundingBoxes: bboxes,
        // Include Class B types (fishing, recreational) for max vessel coverage.
        FilterMessageTypes: [
          'PositionReport',                  // Class A
          'StandardClassBPositionReport',    // Class B (small craft)
          'ExtendedClassBPositionReport',    // Class B extended
          'ShipStaticData',                  // Static info (name, type, etc.)
        ],
      };
      console.log('[AIS] connected, subscribing to', bboxes.length, 'bboxes');
      ws.send(JSON.stringify(sub));
      handlers.onOpen && handlers.onOpen();
    };
    let firstMsg = true;
    let msgCount = 0;
    const decoder = new TextDecoder('utf-8');
    ws.onmessage = (ev) => {
      try {
        let text;
        if (typeof ev.data === 'string') {
          text = ev.data;
        } else if (ev.data instanceof ArrayBuffer) {
          text = decoder.decode(ev.data);
        } else if (ev.data && typeof ev.data.arrayBuffer === 'function') {
          // Blob fallback — async path. AISStream is binary so we set binaryType=arraybuffer,
          // but other proxy paths might still deliver Blobs.
          ev.data.arrayBuffer().then(buf => {
            try {
              const j = JSON.parse(decoder.decode(buf));
              dispatchFrame(j);
            } catch (e) { console.warn('[AIS] blob parse failed:', e.message); }
          });
          return;
        } else {
          console.warn('[AIS] unknown frame format:', Object.prototype.toString.call(ev.data));
          return;
        }
        const j = JSON.parse(text);
        dispatchFrame(j);
      } catch (e) { console.warn('[AIS] parse error:', e.message, 'first 120 chars:', (typeof ev.data === 'string' ? ev.data : '').slice(0, 120)); }
    };
    const dispatchFrame = (j) => {
      try {
        msgCount++;
        receivedThisCycle = true;
        everReceivedData = true;
        killCycleCount = 0;
        if (firstMsg) { console.log('[AIS] first message received:', j.MessageType || j.error || 'unknown'); firstMsg = false; }
        // Periodic heartbeat log so user can see data flowing in console
        if (msgCount % 100 === 0) console.log('[AIS]', msgCount, 'msgs received · latest:', j.MessageType);
        if (j.error) { console.error('[AIS] server error:', j.error); handlers.onError && handlers.onError(new Error(j.error)); return; }
        const meta = j.MetaData || {};
        const mmsi = String(meta.MMSI || meta.mmsi || '');
        if ((j.MessageType === 'PositionReport' && j.Message && j.Message.PositionReport)
         || (j.MessageType === 'StandardClassBPositionReport' && j.Message && j.Message.StandardClassBPositionReport)
         || (j.MessageType === 'ExtendedClassBPositionReport' && j.Message && j.Message.ExtendedClassBPositionReport)) {
          const p = j.Message.PositionReport
                 || j.Message.StandardClassBPositionReport
                 || j.Message.ExtendedClassBPositionReport;
          handlers.onPosition && handlers.onPosition({
            mmsi,
            lat: p.Latitude,
            lon: p.Longitude,
            sog: p.Sog || p.SpeedOverGround || 0,
            cog: p.Cog || p.CourseOverGround || 0,
            hdg: (p.TrueHeading === 511 || p.TrueHeading == null) ? (p.Cog || p.CourseOverGround) : p.TrueHeading,
            navStatus: p.NavigationalStatus,
            asof: meta.time_utc || new Date().toISOString(),
            shipname: meta.ShipName || '',
          });
        } else if (j.MessageType === 'ShipStaticData' && j.Message && j.Message.ShipStaticData) {
          const s = j.Message.ShipStaticData;
          handlers.onStatic && handlers.onStatic({
            mmsi,
            imo: s.ImoNumber || '',
            name: (s.Name || meta.ShipName || '').trim(),
            callsign: (s.CallSign || '').trim(),
            type: s.Type,
            destination: (s.Destination || '').trim(),
            eta: s.Eta,
            draught: s.MaximumStaticDraught,
            dimA: s.Dimension && s.Dimension.A,
            dimB: s.Dimension && s.Dimension.B,
            dimC: s.Dimension && s.Dimension.C,
            dimD: s.Dimension && s.Dimension.D,
          });
        }
      } catch {/* skip malformed */}
    };
    ws.onclose = (ev) => {
      console.warn('[AIS] WebSocket closed · code', ev.code, '· reason:', ev.reason || '(none)');
      // If we opened the socket but never received a single frame and the close was abnormal (1006),
      // some local actor (extension, AV proxy, corporate firewall) is killing our WebSocket.
      // The server is not the source — verified independently from Node on the same machine.
      if (openedThisCycle && !receivedThisCycle && (ev.code === 1006 || ev.code === 1011 || ev.code === 1015)) {
        killCycleCount++;
        console.warn('[AIS] kill-cycle detected (#' + killCycleCount + ') — opened but closed before any frame arrived. Likely a browser extension / proxy / AV intercepting the stream.');
      }
      handlers.onClose && handlers.onClose();
      // Stop retrying once we've confirmed the kill pattern twice — no point in reconnect-spamming.
      if (killCycleCount >= 2 && !everReceivedData) {
        console.error('[AIS] aborting reconnect: 2 abnormal closes with zero data — local network/extension is blocking AISStream WebSocket. Try Incognito mode or disable extensions.');
        alive = false;
        handlers.onError && handlers.onError(new Error('WS_KILLED_BY_CLIENT'));
        return;
      }
      if (alive && retry < 5) {
        retry++;
        console.log('[AIS] reconnect attempt', retry, 'in', Math.min(2000 * retry, 30000), 'ms');
        retryTimer = setTimeout(connect, Math.min(2000 * retry, 30000));
      }
    };
    ws.onerror = (e) => { console.error('[AIS] WebSocket error event'); handlers.onError && handlers.onError(e); };
  };
  connect();
  return {
    close: () => { alive = false; if (retryTimer) clearTimeout(retryTimer); if (ws) try { ws.close(); } catch {/* noop */} },
    isOpen: () => ws && ws.readyState === 1,
  };
};

// ================================================================
// Nominatim geocoder — OpenStreetMap, free, no key, CORS open
// Strict policy: max 1 req/sec, custom Accept-Language preferred.
// ================================================================
let _geocodeLastAt = 0;
window.MacroGlobeFetchers.geocode = async (q) => {
  const elapsed = Date.now() - _geocodeLastAt;
  if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed));
  _geocodeLastAt = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!r.ok) return [];
    const j = await r.json();
    return j.map(p => ({
      kind: 'place',
      name: p.display_name,
      shortName: p.name || (p.display_name || '').split(',')[0],
      placeType: p.type,
      class: p.class,
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      bbox: p.boundingbox ? p.boundingbox.map(parseFloat) : null,
      osmId: p.osm_id,
      country: p.address && (p.address.country_code || '').toUpperCase(),
    }));
  } catch { return []; }
};

// ================================================================
// Equity ticker → HQ coordinates (curated)
// Used so the search bar can find companies and fly to HQ.
// ================================================================
const TICKER_HQ = [
  // IDX
  { ticker:'BBCA', name:'Bank Central Asia',           lat:-6.193,  lon:106.821, country:'ID', sector:'Bank' },
  { ticker:'BMRI', name:'Bank Mandiri',                lat:-6.2,    lon:106.825, country:'ID', sector:'Bank' },
  { ticker:'BBRI', name:'Bank Rakyat Indonesia',       lat:-6.207,  lon:106.823, country:'ID', sector:'Bank' },
  { ticker:'TLKM', name:'Telkom Indonesia',            lat:-6.973,  lon:107.629, country:'ID', sector:'Telecom' },
  { ticker:'ASII', name:'Astra International',         lat:-6.226,  lon:106.846, country:'ID', sector:'Conglomerate' },
  { ticker:'GOTO', name:'GoTo Group',                  lat:-6.225,  lon:106.823, country:'ID', sector:'Tech' },
  { ticker:'BYAN', name:'Bayan Resources',             lat:-6.218,  lon:106.823, country:'ID', sector:'Coal Mining' },
  { ticker:'ADRO', name:'Adaro Energy',                lat:-6.226,  lon:106.804, country:'ID', sector:'Coal Mining' },
  { ticker:'ANTM', name:'Aneka Tambang',               lat:-6.244,  lon:106.811, country:'ID', sector:'Metals' },
  { ticker:'UNVR', name:'Unilever Indonesia',          lat:-6.273,  lon:106.802, country:'ID', sector:'Consumer' },
  { ticker:'ITMG', name:'Indo Tambangraya Megah',      lat:-6.226,  lon:106.823, country:'ID', sector:'Coal Mining' },
  // US mega-caps
  { ticker:'AAPL', name:'Apple',                       lat:37.3349, lon:-122.009, country:'US', sector:'Tech' },
  { ticker:'MSFT', name:'Microsoft',                   lat:47.6396, lon:-122.128, country:'US', sector:'Tech' },
  { ticker:'GOOGL',name:'Alphabet',                    lat:37.4220, lon:-122.084, country:'US', sector:'Tech' },
  { ticker:'AMZN', name:'Amazon',                      lat:47.6225, lon:-122.337, country:'US', sector:'Tech' },
  { ticker:'NVDA', name:'NVIDIA',                      lat:37.371,  lon:-121.964, country:'US', sector:'Semis' },
  { ticker:'TSLA', name:'Tesla',                       lat:30.222,  lon:-97.617,  country:'US', sector:'Auto' },
  { ticker:'META', name:'Meta',                        lat:37.485,  lon:-122.148, country:'US', sector:'Tech' },
  { ticker:'JPM',  name:'JPMorgan Chase',              lat:40.755,  lon:-73.974,  country:'US', sector:'Bank' },
  { ticker:'XOM',  name:'ExxonMobil',                  lat:32.886,  lon:-96.769,  country:'US', sector:'Oil & Gas' },
  { ticker:'CVX',  name:'Chevron',                     lat:37.881,  lon:-122.229, country:'US', sector:'Oil & Gas' },
  { ticker:'BRK',  name:'Berkshire Hathaway',          lat:41.260,  lon:-95.940,  country:'US', sector:'Conglomerate' },
  // Shipping & energy majors
  { ticker:'MAERSK',name:'A.P. Møller-Mærsk',          lat:55.685,  lon:12.594,   country:'DK', sector:'Shipping' },
  { ticker:'COSCO', name:'COSCO Shipping',             lat:31.234,  lon:121.475,  country:'CN', sector:'Shipping' },
  { ticker:'CMA',  name:'CMA CGM',                     lat:43.339,  lon:5.327,    country:'FR', sector:'Shipping' },
  { ticker:'BP',   name:'BP plc',                      lat:51.494,  lon:-0.156,   country:'UK', sector:'Oil & Gas' },
  { ticker:'SHEL', name:'Shell',                       lat:51.917,  lon:4.484,    country:'NL', sector:'Oil & Gas' },
  { ticker:'TOTAL',name:'TotalEnergies',               lat:48.892,  lon:2.244,    country:'FR', sector:'Oil & Gas' },
  { ticker:'SAUDI',name:'Saudi Aramco',                lat:26.282,  lon:50.166,   country:'SA', sector:'Oil & Gas' },
];
window.MacroGlobeData = { POWER_PLANTS, SHIPS_FIXTURES, TICKER_HQ, AIRCRAFT_REGIONS };
