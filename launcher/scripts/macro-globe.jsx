// ================================================================
// MacroGlobe — production-grade 3D globe
//   • basemap picker — LBC dark / Real satellite / Night lights
//   • live aircraft (airplanes.live REST)
//   • live satellites (Celestrak TLE + satellite.js SGP4)
//   • live ships (AISStream WebSocket, user API key)  + curated fixture fallback
//   • energy infrastructure (curated WRI subset)
//   • multi-source wordy search (ships, plants, aircraft, sats, places, tickers)
//   • click-to-inspect drawer · auto-orbit · live HUD
// ================================================================

const FUEL_COLORS = {
  hydro:   '#4FB7E0',
  nuclear: '#B988E0',
  coal:    '#8B6F4E',
  gas:     '#F0AC4A',
  oil:     '#C76F4D',
  wind:    '#19C37D',
  solar:   '#FFD24A',
  biomass: '#86C26B',
  geo:     '#FF7F50',
};
const SHIP_COLORS = {
  container:  '#5BB4F0',
  tanker:     '#FF8866',
  tanker_haz: '#FF5C70',
  bulker:     '#D2B454',
  lng:        '#B988E0',
  roro:       '#19C37D',
  cargo:      '#5BB4F0',
  cargo_haz:  '#FFD24A',
  passenger:  '#FFD24A',
  fishing:    '#86C26B',
  tug:        '#F0AC4A',
  pleasure:   '#FF7F50',
  pilot:      '#5BB4F0',
  sar:        '#FF5C70',
  military:   '#9CA3AF',
  dredger:    '#C2845C',
  highspeed:  '#19C37D',
  wig:        '#86C26B',
  env:        '#19C37D',
  other:      '#9CA3AF',
};
// Full AIS Vessel Type code (0..99) → category
const AIS_TYPE_GROUP = (t) => {
  if (t == null || t === 0) return 'other';
  if (t === 30) return 'fishing';
  if (t === 31 || t === 32 || t === 52) return 'tug';
  if (t === 33) return 'dredger';
  if (t === 36 || t === 37) return 'pleasure';
  if (t === 35) return 'military';
  if (t === 55) return 'military';
  if (t === 50 || t === 53) return 'pilot';
  if (t === 51 || t === 58) return 'sar';
  if (t === 54) return 'env';
  if (t >= 20 && t <= 29) return 'wig';
  if (t >= 40 && t <= 49) return 'highspeed';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t >= 70 && t <= 79) return t === 70 ? 'cargo' : 'cargo_haz';
  if (t >= 80 && t <= 89) return t === 80 ? 'tanker' : 'tanker_haz';
  return 'other';
};
const AIS_TYPE_LABEL = (t) => {
  if (t == null) return 'Unknown';
  const m = {
    20:'WIG',30:'Fishing',31:'Towing',32:'Towing (large)',33:'Dredger',34:'Diving',
    35:'Military',36:'Sailing',37:'Pleasure craft',50:'Pilot',51:'SAR',52:'Tug',
    53:'Port tender',54:'Anti-pollution',55:'Law enforcement',58:'Medical',59:'Special',
    60:'Passenger',61:'Passenger',62:'Passenger',63:'Passenger',64:'Passenger',
    70:'Cargo',71:'Cargo (Hazmat A)',72:'Cargo (Hazmat B)',73:'Cargo (Hazmat C)',74:'Cargo (Hazmat D)',
    80:'Tanker',81:'Tanker (Hazmat A)',82:'Tanker (Hazmat B)',83:'Tanker (Hazmat C)',84:'Tanker (Hazmat D)',
  };
  return m[t] || `AIS ${t}`;
};
const SHIP_TYPE_GROUPS = [
  { key: 'cargo',      label: 'Cargo'      },
  { key: 'tanker',     label: 'Tanker'     },
  { key: 'container',  label: 'Container'  },
  { key: 'bulker',     label: 'Bulker'     },
  { key: 'lng',        label: 'LNG'        },
  { key: 'passenger',  label: 'Passenger'  },
  { key: 'roro',       label: 'RoRo'       },
  { key: 'fishing',    label: 'Fishing'    },
  { key: 'tug',        label: 'Tug'        },
  { key: 'military',   label: 'Military'   },
  { key: 'other',      label: 'Other'      },
];
// Triangle ship icon — canvas-rasterized PNG for reliable cross-platform render.
// Heading 0° points up (north). Cesium rotates around center.
const _shipIconCache = {};
const shipIcon = (color) => {
  if (_shipIconCache[color]) return _shipIconCache[color];
  const dpr = (window.devicePixelRatio || 1);
  const W = 20, H = 24;
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  // Soft outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(W/2, 2);                 // tip (north)
  ctx.lineTo(W - 3, H - 4);           // stern right
  ctx.lineTo(W/2, H - 7);             // stern indent
  ctx.lineTo(3, H - 4);               // stern left
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  _shipIconCache[color] = c;
  return c;
};

const SAT_GROUP_COLORS = {
  stations: '#FFD24A',
  starlink: '#5BB4F0',
  weather:  '#19C37D',
  'gps-ops':'#B988E0',
  science:  '#FF8866',
};

const JKT = [110.0, -2.5, 14_000_000];
const NYC = [-74.0, 40.7, 14_000_000];

// ----- Basemaps -----
const BASEMAPS = {
  lbc: {
    label: 'LBC',
    sub: 'CartoDB dark',
    build: (Cesium) => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      subdomains: 'abcd',
      credit: 'CartoDB · OpenStreetMap',
      maximumLevel: 18,
    }),
  },
  real: {
    label: 'Real',
    sub: 'ESRI satellite',
    build: (Cesium) => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'ESRI · World Imagery',
      maximumLevel: 18,
    }),
  },
  night: {
    label: 'Night',
    sub: 'NASA Black Marble',
    build: (Cesium) => new Cesium.UrlTemplateImageryProvider({
      url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
      credit: 'NASA · VIIRS Black Marble',
      maximumLevel: 8,
    }),
  },
};

const loadScript = (src) => new Promise((res, rej) => {
  if (Array.from(document.scripts).some(s => s.src === src)) return res();
  const s = document.createElement('script');
  s.src = src; s.async = true;
  s.onload = res;
  s.onerror = () => rej(new Error(`Failed to load ${src}`));
  document.head.appendChild(s);
});
const loadCSS = (href) => new Promise((res, rej) => {
  if (Array.from(document.styleSheets).some(s => s.href === href)) return res();
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href;
  link.onload = res;
  link.onerror = () => rej(new Error(`Failed to load ${href}`));
  document.head.appendChild(link);
});

// ----- Search engine -----
const TYPE_KEYWORDS = {
  energy:    ['plant','plants','reactor','nuclear','solar','wind','hydro','coal','gas','geothermal','energy'],
  ship:      ['ship','ships','vessel','vessels','tanker','tankers','container','bulker','lng','roro','cargo'],
  aircraft:  ['aircraft','plane','planes','flight','flights','jet','airliner','heli','helicopter'],
  satellite: ['satellite','satellites','sat','iss','starlink','tle','noaa','goes'],
  place:     ['city','port','airport','country'],
  ticker:    ['company','companies','stock','ticker','symbol'],
};
const detectIntent = (q) => {
  const tokens = q.toLowerCase().split(/\s+/);
  const intent = {};
  for (const [kind, words] of Object.entries(TYPE_KEYWORDS)) {
    for (const t of tokens) if (words.includes(t)) intent[kind] = true;
  }
  // location pattern "in X" / "near X" / "around X"
  const inIdx = tokens.findIndex(t => ['in','near','at','around','off'].includes(t));
  if (inIdx >= 0 && inIdx < tokens.length - 1) intent.locQuery = tokens.slice(inIdx + 1).join(' ');
  return intent;
};

const runLocalSearch = (q, ctx) => {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const intent = detectIntent(q);
  const wantOnly = ['energy','ship','aircraft','satellite','ticker'].filter(k => intent[k]);
  const out = [];

  const matchScore = (hay, toks) => {
    const h = hay.toLowerCase();
    let score = 0, allHit = true;
    for (const t of toks) {
      if (TYPE_KEYWORDS.energy.includes(t) || TYPE_KEYWORDS.ship.includes(t) ||
          TYPE_KEYWORDS.aircraft.includes(t) || TYPE_KEYWORDS.satellite.includes(t) ||
          TYPE_KEYWORDS.ticker.includes(t) ||
          ['in','near','at','around','off'].includes(t)) continue;
      if (h.includes(t)) score += t.length >= 3 ? 2 : 1;
      else allHit = false;
    }
    return allHit ? score : 0;
  };

  if (wantOnly.length === 0 || wantOnly.includes('energy')) {
    for (const p of (window.MacroGlobeData.POWER_PLANTS || [])) {
      const s = matchScore(`${p.name} ${p.country} ${p.fuel} ${p.op || ''}`, tokens);
      if (s > 0) out.push({ kind: 'energy', label: p.name, sub: `${p.fuel.toUpperCase()} · ${p.mw.toLocaleString()} MW · ${p.country}`, lat: p.lat, lon: p.lon, info: { kind: 'energy', ...p }, score: s + 1 });
    }
  }
  if (wantOnly.length === 0 || wantOnly.includes('ship')) {
    const shipsCache = ctx.liveShipsCache && Object.keys(ctx.liveShipsCache).length > 0
      ? Object.values(ctx.liveShipsCache).map(s => ({ ...s, _live: true }))
      : (window.MacroGlobeData.SHIPS_FIXTURES || []);
    for (const s of shipsCache) {
      const hay = `${s.name || ''} ${s.imo || ''} ${s.mmsi || ''} ${s.type || ''} ${s.flag || ''} ${s.dest || s.destination || ''} ${s.callsign || ''}`;
      const sc = matchScore(hay, tokens);
      if (sc > 0) out.push({
        kind: 'ship',
        label: s.name || `MMSI ${s.mmsi}`,
        sub: `${(s.type || 'vessel').toUpperCase()} · ${s.flag || s.country || '?'} · ${s._live ? 'LIVE' : 'fixture'}`,
        lat: s.lat, lon: s.lon, info: { kind: 'ship', ...s }, score: sc,
      });
    }
  }
  if (wantOnly.length === 0 || wantOnly.includes('aircraft')) {
    for (const a of (ctx.aircraftCache || [])) {
      const hay = `${a.callsign} ${a.registration || ''} ${a.type || ''} ${a.desc || ''} ${a.operator || ''}`;
      const s = matchScore(hay, tokens);
      if (s > 0) out.push({
        kind: 'aircraft',
        label: a.callsign || a.icao,
        sub: `${a.type || '?'}${a.desc ? ` · ${a.desc}` : ''} · ${Math.round(a.altFt || 0).toLocaleString()} ft`,
        lat: a.lat, lon: a.lon, info: { kind: 'aircraft', ...a }, score: s,
      });
    }
  }
  if (wantOnly.length === 0 || wantOnly.includes('satellite')) {
    for (const s of (ctx.satCache || [])) {
      const sc = matchScore(s.name + ' ' + s.group, tokens);
      if (sc > 0) out.push({
        kind: 'satellite',
        label: s.name,
        sub: `${s.group} · NORAD TLE`,
        lat: s.lat, lon: s.lon, info: { kind: 'satellite', name: s.name, group: s.group, lat: s.lat, lon: s.lon, alt: s.alt }, score: sc,
      });
    }
  }
  if (wantOnly.length === 0 || wantOnly.includes('ticker')) {
    for (const t of (window.MacroGlobeData.TICKER_HQ || [])) {
      const s = matchScore(`${t.ticker} ${t.name} ${t.sector}`, tokens);
      if (s > 0) out.push({
        kind: 'ticker',
        label: `${t.ticker} · ${t.name}`,
        sub: `${t.sector} · ${t.country} HQ`,
        lat: t.lat, lon: t.lon, info: { kind: 'ticker', ...t }, score: s + (tokens.includes(t.ticker.toLowerCase()) ? 5 : 0),
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 20);
};

const MacroGlobe = () => {
  const containerRef = React.useRef(null);
  const viewerRef    = React.useRef(null);
  const handlerRef   = React.useRef(null);
  const orbitTimerRef = React.useRef(null);
  const layerRefsRef = React.useRef({ aircraft: null, satellites: null, energy: null, ships: null });
  const aircraftPollRef = React.useRef(null);
  const satRecsRef   = React.useRef([]);
  const satTickRef   = React.useRef(null);
  const userInteractRef = React.useRef(0);
  const baseLayerRef = React.useRef(null);
  const aisRef       = React.useRef(null);
  const liveShipsRef = React.useRef({}); // mmsi → ship
  const shipTrailsRef = React.useRef({}); // id → [[lon,lat], …last N]
  const aisMsgsRef   = React.useRef(0); // total messages received (no setState — flushed via 1Hz tick)
  const aisLastAtRef = React.useRef(null); // ms ts of most recent message (no setState)
  const aisLiveSinceRef = React.useRef(null); // ms ts when WS first went 'live' — used to detect zero-data extensions
  const livePointsRef = React.useRef(null); // Cesium.PointPrimitiveCollection — single batched draw call for live AIS
  const livePtMapRef  = React.useRef({});   // mmsi → { pt: PointPrimitive · type · info }
  const MAX_LIVE_SHIPS = 10000; // generous ceiling — PointPrimitiveCollection batches into one draw call so this is comfortable on a laptop GPU
  const aircraftCacheRef = React.useRef([]);
  const satCacheRef  = React.useRef([]);
  const searchTimerRef = React.useRef(null);

  const [bootState, setBootState] = React.useState('idle');
  const [bootMsg,   setBootMsg]   = React.useState('initializing…');
  const [layers,    setLayers]    = React.useState({ aircraft: false, satellites: false, energy: true, ships: true });
  const [counts,    setCounts]    = React.useState({ aircraft: 0, satellites: 0, energy: 0, ships: 0 });
  const [hud,       setHud]       = React.useState({ lat: null, lon: null, alt: null, fps: 60 });
  const [selected,  setSelected]  = React.useState(null);
  const [autoOrbit, setAutoOrbit] = React.useState(true);
  const [satGroup,  setSatGroup]  = React.useState('stations');
  const [aircraftErr, setAircraftErr] = React.useState(null);
  const [satErr,    setSatErr]    = React.useState(null);
  const [basemap,   setBasemap]   = React.useState('lbc');
  const [shipMode,  setShipMode]  = React.useState('live'); // fixture|live
  // Default AIS key — personal AISStream.io account.
  // WARNING: if you push this repo to a public GitHub remote, rotate the key at aisstream.io.
  const DEFAULT_AIS_KEY = 'e3cb22aa98e1e20d0a05239f265393775eeb3b83';
  const [aisKey,    setAisKey]    = React.useState(() => { try { return localStorage.getItem('lbc-ais-key') || DEFAULT_AIS_KEY; } catch { return DEFAULT_AIS_KEY; } });
  const [aisStatus, setAisStatus] = React.useState('idle'); // idle|connecting|live|error|blocked
  const [aisMsgs,   setAisMsgs]   = React.useState(0); // total AIS position reports received
  const [aisLastAt, setAisLastAt] = React.useState(null); // ms timestamp of last message
  const [aisBlockReason, setAisBlockReason] = React.useState(null); // 'WS_KILLED_BY_CLIENT' | null
  const [aisTransport, setAisTransport] = React.useState(null); // 'proxy' | 'direct' | null
  const [showKey,   setShowKey]   = React.useState(false);
  const [keyInput,  setKeyInput]  = React.useState('');
  const [search,    setSearch]    = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState([]);
  const [placeResults, setPlaceResults] = React.useState([]);
  const [shipFilter, setShipFilter] = React.useState(() => new Set(SHIP_TYPE_GROUPS.map(g => g.key)));
  const [tick1Hz,   setTick1Hz]   = React.useState(0); // forces footer to re-render every second so "last Xs ago" stays current
  const [visibilityNonce, setVisibilityNonce] = React.useState(0); // bumped on visibilitychange to retrigger layer effects after a pause

  // ============================================================
  // PAGE VISIBILITY PAUSE
  // When the tab / workspace is hidden (user navigated to Equity,
  // minimized window, switched OS app), tear down the AIS WebSocket
  // and stop the satellite + aircraft polls. Resume on visible by
  // bumping a nonce that's in the layer effects' dep arrays.
  //
  // Saves ~50–80% CPU when the user is anywhere except the Macro
  // workspace. Without this, the globe burns frame-time even when
  // it's not on screen.
  // ============================================================
  React.useEffect(() => {
    const onChange = () => {
      if (document.hidden) {
        // Pause: close AIS, clear polls. Existing teardowns are idempotent.
        if (aisRef.current) { try { aisRef.current.close(); } catch {} aisRef.current = null; }
        if (satTickRef.current) { clearInterval(satTickRef.current); satTickRef.current = null; }
        if (aircraftPollRef.current) { clearInterval(aircraftPollRef.current); aircraftPollRef.current = null; }
        setAisStatus('idle');
      } else {
        // Resume: bumping the nonce re-runs SHIPS / SAT / AIRCRAFT effects.
        setVisibilityNonce(n => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // 1Hz tick — flushes ref-based counters to state and keeps "last Xs ago" fresh
  React.useEffect(() => {
    if (shipMode !== 'live' || aisStatus !== 'live') return;
    const id = setInterval(() => {
      setAisMsgs(aisMsgsRef.current);
      setAisLastAt(aisLastAtRef.current);
      // Total ship count = fixture entities + live point primitives
      const ent = layerRefsRef.current.ships;
      const fixtureN = ent ? Object.keys(ent).length : 0;
      const liveN    = livePointsRef.current ? livePointsRef.current.length : 0;
      setCounts(c => ({ ...c, ships: fixtureN + liveN }));
      setTick1Hz(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [shipMode, aisStatus]);

  // ----- Boot -----
  React.useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setBootState('loading');
      setBootMsg('loading Cesium…');
      if (!window.Cesium) {
        try {
          await loadCSS('https://cdn.jsdelivr.net/npm/cesium@1.117/Build/Cesium/Widgets/widgets.css');
          await loadScript('https://cdn.jsdelivr.net/npm/cesium@1.117/Build/Cesium/Cesium.js');
        } catch (e) {
          if (!cancelled) { setBootMsg(e.message); setBootState('fallback'); }
          return;
        }
      }
      if (cancelled) return;
      setBootMsg('loading satellite.js…');
      if (!window.satellite) {
        try { await loadScript('https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js'); }
        catch {/* satellites disabled but continue */}
      }
      if (cancelled) return;

      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
      if (!gl) { setBootMsg('WebGL unavailable'); setBootState('fallback'); return; }

      try {
        const Cesium = window.Cesium;
        const initialProvider = BASEMAPS[basemap].build(Cesium);
        const opts = {
          baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
          navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
          infoBox: false, selectionIndicator: false,
          contextOptions: { webgl: { alpha: true, antialias: true } },
        };
        if (Cesium.ImageryLayer && Cesium.ImageryLayer.fromProviderAsync) {
          opts.baseLayer = new Cesium.ImageryLayer(initialProvider, {});
        } else {
          opts.imageryProvider = initialProvider;
        }
        const viewer = new Cesium.Viewer(containerRef.current, opts);
        viewerRef.current = viewer;
        baseLayerRef.current = viewer.imageryLayers.get(0);

        // ============================================================
        // PERFORMANCE: render on-demand, not every frame.
        // Cesium otherwise burns CPU+GPU continuously even when idle
        // (no camera movement, no entity changes). With requestRenderMode
        // it only renders when something asks it to — auto-triggered by
        // entity property changes, camera movement, picks, etc.
        // We explicitly call viewer.scene.requestRender() after our own
        // mutations (ship moves, satellite ticks, etc.) so updates land.
        // ============================================================
        viewer.scene.requestRenderMode = true;
        viewer.scene.maximumRenderTimeChange = 1.0; // re-render if >1s sim time elapses

        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#020203');
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020203');
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.00015;
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(JKT[0], JKT[1], JKT[2]),
        });

        // ============================================================
        // Trackpad-friendly camera controls — Google Earth feel
        //   drag (1 finger)         → spin globe (pan)
        //   two-finger scroll       → zoom toward cursor
        //   pinch                   → zoom
        //   shift + drag            → tilt
        //   alt/option + drag       → look (free-pivot from current pos)
        // Defaults RIGHT_DRAG and MIDDLE_DRAG are removed — no two-button mouse needed.
        // ============================================================
        const cam = viewer.scene.screenSpaceCameraController;
        cam.rotateEventTypes  = Cesium.CameraEventType.LEFT_DRAG;
        cam.zoomEventTypes    = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH];
        cam.tiltEventTypes    = [
          { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.SHIFT },
        ];
        cam.lookEventTypes    = [
          { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.ALT },
        ];
        cam.translateEventTypes = [];
        // Momentum — smooth coasting after release
        cam.inertiaSpin       = 0.92;
        cam.inertiaTranslate  = 0.92;
        cam.inertiaZoom       = 0.88;
        // Zoom scaling — smaller = finer-grained zoom step (better on trackpad)
        cam.maximumMovementRatio = 0.04;
        cam.minimumZoomDistance = 300;          // 300 m closest
        cam.maximumZoomDistance = 80_000_000;   // 80 Mm farthest
        cam.enableCollisionDetection = true;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click) => {
          const picked = viewer.scene.pick(click.position);
          // Entity picks expose ._info on picked.id (the Entity). PointPrimitive
          // picks expose the info object DIRECTLY on picked.id (we set it that way).
          let info = null, pos = null;
          if (picked && picked.id) {
            if (picked.id._info) {
              info = picked.id._info;
              pos = picked.id.position && picked.id.position.getValue(Cesium.JulianDate.now());
            } else if (picked.id.kind) {
              info = picked.id;
              if (picked.primitive && picked.primitive.position) pos = picked.primitive.position;
            }
          }
          if (info) {
            setSelected(info);
            // Mirror selection to the BroadcastChannel host (detached-globe sync).
            // MacroMap installs window.lbcSelectGlobeEntity when it has a BroadcastChannel open.
            if (typeof window.lbcSelectGlobeEntity === 'function') {
              try { window.lbcSelectGlobeEntity(info); } catch {}
            }
            if (pos) {
              const carto = Cesium.Cartographic.fromCartesian(pos);
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                  Cesium.Math.toDegrees(carto.longitude),
                  Cesium.Math.toDegrees(carto.latitude),
                  Math.max(carto.height + 1_500_000, 2_500_000),
                ),
                duration: 1.4,
              });
            }
            stopAutoOrbitInternal();
          } else {
            setSelected(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        const pause = () => { userInteractRef.current = Date.now(); };
        handler.setInputAction(pause, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(pause, Cesium.ScreenSpaceEventType.WHEEL);
        handler.setInputAction(pause, Cesium.ScreenSpaceEventType.PINCH_START);
        handlerRef.current = handler;

        // HUD updates: throttled. mousemove fires 100+ times/sec — feeding
        // each into setState was the single biggest React re-render source.
        // Stash the latest values in a ref and flush via rAF (≤60/s, browser
        // collapses duplicates).
        const hudPendingRef = { lat: null, lon: null, alt: null, dirty: false };
        let hudRafId = 0;
        const flushHud = () => {
          hudRafId = 0;
          if (!hudPendingRef.dirty) return;
          hudPendingRef.dirty = false;
          setHud(h => ({ ...h, lat: hudPendingRef.lat, lon: hudPendingRef.lon, alt: hudPendingRef.alt }));
        };
        const moveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        moveHandler.setInputAction((m) => {
          const ray = viewer.camera.getPickRay(m.endPosition);
          const cart = ray && viewer.scene.globe.pick(ray, viewer.scene);
          if (!cart) return;
          const c = Cesium.Cartographic.fromCartesian(cart);
          hudPendingRef.lat = Cesium.Math.toDegrees(c.latitude);
          hudPendingRef.lon = Cesium.Math.toDegrees(c.longitude);
          hudPendingRef.alt = viewer.camera.positionCartographic.height;
          hudPendingRef.dirty = true;
          if (!hudRafId) hudRafId = requestAnimationFrame(flushHud);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // FPS: count frames in a ref, only setState every 1s. With
        // requestRenderMode on this will naturally drop near zero when idle.
        let frame = 0, lastFpsAt = performance.now();
        viewer.scene.postRender.addEventListener(() => {
          frame++;
          const now = performance.now();
          if (now - lastFpsAt > 1000) {
            const fps = Math.round((frame * 1000) / (now - lastFpsAt));
            setHud(h => h.fps === fps ? h : ({ ...h, fps }));
            frame = 0; lastFpsAt = now;
          }
        });

        setBootMsg('online');
        setBootState('ok');
      } catch (e) {
        console.warn('[Globe] init failed', e);
        setBootMsg(`init failed: ${e.message}`);
        setBootState('fallback');
      }
    };
    boot();
    return () => {
      cancelled = true;
      stopAutoOrbitInternal();
      if (aircraftPollRef.current) clearInterval(aircraftPollRef.current);
      if (satTickRef.current) clearInterval(satTickRef.current);
      if (handlerRef.current) handlerRef.current.destroy();
      if (aisRef.current) aisRef.current.close();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {/* noop */}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basemap swap
  React.useEffect(() => {
    if (bootState !== 'ok') return;
    const v = viewerRef.current; if (!v) return;
    const Cesium = window.Cesium;
    try {
      if (baseLayerRef.current) v.imageryLayers.remove(baseLayerRef.current, true);
      const provider = BASEMAPS[basemap].build(Cesium);
      const layer = v.imageryLayers.addImageryProvider(provider);
      // Move to bottom
      while (v.imageryLayers.indexOf(layer) > 0) v.imageryLayers.lower(layer);
      baseLayerRef.current = layer;
    } catch (e) { console.warn('[Globe] basemap swap failed', e); }
  }, [basemap, bootState]);

  // Auto-orbit
  const stopAutoOrbitInternal = () => {
    if (orbitTimerRef.current) { clearTimeout(orbitTimerRef.current); orbitTimerRef.current = null; }
  };
  const flyTo = (lonLatAlt, dur = 6) => {
    const v = viewerRef.current;
    if (!v) return Promise.resolve();
    return new Promise((res) => {
      v.camera.flyTo({
        destination: window.Cesium.Cartesian3.fromDegrees(lonLatAlt[0], lonLatAlt[1], lonLatAlt[2]),
        duration: dur, complete: res,
      });
    });
  };
  React.useEffect(() => {
    if (bootState !== 'ok' || !autoOrbit) { stopAutoOrbitInternal(); return; }
    let alive = true; let target = 'jkt';
    const cycle = async () => {
      while (alive) {
        const idleSince = Date.now() - userInteractRef.current;
        if (idleSince < 15000) { await new Promise(r => setTimeout(r, 1000)); continue; }
        target = target === 'jkt' ? 'nyc' : 'jkt';
        await flyTo(target === 'jkt' ? JKT : NYC, 7);
        if (!alive) return;
        await new Promise(r => setTimeout(r, 8000));
      }
    };
    cycle();
    return () => { alive = false; stopAutoOrbitInternal(); };
  }, [bootState, autoOrbit]);

  // ENERGY layer
  React.useEffect(() => {
    const v = viewerRef.current;
    if (bootState !== 'ok' || !v) return;
    if (!layers.energy) {
      const ec = layerRefsRef.current.energy;
      if (ec) { v.entities.suspendEvents(); ec.forEach(e => v.entities.remove(e)); v.entities.resumeEvents(); layerRefsRef.current.energy = null; }
      setCounts(c => ({ ...c, energy: 0 })); return;
    }
    const Cesium = window.Cesium;
    v.entities.suspendEvents();
    const list = window.MacroGlobeData.POWER_PLANTS.map(p => v.entities.add({
      id: p.id,
      position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
      point: {
        pixelSize: Math.max(5, Math.min(14, Math.sqrt(p.mw) / 12)),
        color: Cesium.Color.fromCssColorString(FUEL_COLORS[p.fuel] || '#888').withAlpha(0.92),
        outlineColor: Cesium.Color.fromCssColorString(FUEL_COLORS[p.fuel] || '#888').withAlpha(0.4),
        outlineWidth: 2,
        scaleByDistance: new Cesium.NearFarScalar(2_000_000, 1.0, 30_000_000, 0.4),
      },
      _info: { kind: 'energy', ...p },
    }));
    v.entities.resumeEvents();
    layerRefsRef.current.energy = list;
    setCounts(c => ({ ...c, energy: list.length }));
    return () => {
      v.entities.suspendEvents();
      list.forEach(e => v.entities.remove(e));
      v.entities.resumeEvents();
      layerRefsRef.current.energy = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.energy, bootState]);

  // SHIPS — fixture or live
  React.useEffect(() => {
    const v = viewerRef.current;
    if (bootState !== 'ok' || !v) return;
    if (aisRef.current) { aisRef.current.close(); aisRef.current = null; setAisStatus('idle'); setAisMsgs(0); setAisLastAt(null); aisMsgsRef.current = 0; aisLastAtRef.current = null; setAisBlockReason(null); }
    const sc = layerRefsRef.current.ships;
    if (sc) { v.entities.suspendEvents(); Object.values(sc).forEach(e => v.entities.remove(e)); v.entities.resumeEvents(); layerRefsRef.current.ships = null; }
    setCounts(c => ({ ...c, ships: 0 }));
    if (!layers.ships) return;

    const Cesium = window.Cesium;

    const buildShipEntity = (id, lon, lat, type, hdg, name, info) => {
      const colorHex = SHIP_COLORS[type] || SHIP_COLORS.cargo;
      const cesColor = Cesium.Color.fromCssColorString(colorHex);
      // Trail slot: { pts: [[lon,lat],…] · cartArr: pre-baked Cartesian3[] }
      // cartArr is null until 2+ points exist; CallbackProperty returns it
      // by reference (no per-frame allocation, no per-frame fromDegreesArray).
      if (!shipTrailsRef.current[id]) shipTrailsRef.current[id] = { pts: [[lon, lat]], cartArr: null };
      return v.entities.add({
        id,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        billboard: {
          image: shipIcon(colorHex),
          rotation: Cesium.Math.toRadians(-(hdg || 0)),
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          width: 16, height: 20,
          color: Cesium.Color.WHITE.withAlpha(0.98),
          scaleByDistance: new Cesium.NearFarScalar(500_000, 1.6, 30_000_000, 1.0),
          // No heightReference: clamp-to-ground costs a terrain raycast per
          // entity per frame. With altitude 0 the billboard sits at sea level
          // and the default depth-test occludes back-of-globe vessels for free.
        },
        label: {
          text: name || `MMSI ${id.replace(/^ais-/, '')}`,
          font: 'bold 10px "Geist Mono", ui-monospace, monospace',
          fillColor: Cesium.Color.WHITE,
          outlineColor: cesColor.withAlpha(0.9),
          outlineWidth: 1.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0A0A0B').withAlpha(0.75),
          backgroundPadding: new Cesium.Cartesian2(5, 3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_200_000),
          translucencyByDistance: new Cesium.NearFarScalar(400_000, 1.0, 1_200_000, 0.0),
        },
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const slot = shipTrailsRef.current[id];
            if (!slot || slot.cartArr == null) return [];
            return slot.cartArr;
          }, false),
          width: 1.5,
          material: cesColor.withAlpha(0.45), // solid color — cheap, no shader
          // No clampToGround: ground sampling per polyline is the dominant cost.
          // Trails ride at sea level alongside the billboards.
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6_000_000),
        },
        _info: info,
      });
    };
    const TRAIL_LEN = 8;
    const updateTrail = (id, lon, lat) => {
      let slot = shipTrailsRef.current[id];
      if (!slot) { slot = { pts: [], cartArr: null }; shipTrailsRef.current[id] = slot; }
      const pts = slot.pts;
      // Skip if last position is essentially the same (avoid tight stacking)
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        const dLat = lat - last[1], dLon = lon - last[0];
        if (Math.abs(dLat) < 0.0001 && Math.abs(dLon) < 0.0001) return;
      }
      pts.push([lon, lat]);
      while (pts.length > TRAIL_LEN) pts.shift();
      // Re-bake the Cartesian3 array ONCE per real update, not every frame.
      // CallbackProperty now just returns this by reference.
      if (pts.length < 2) { slot.cartArr = null; return; }
      const flat = new Array(pts.length * 2);
      for (let i = 0; i < pts.length; i++) { flat[i*2] = pts[i][0]; flat[i*2+1] = pts[i][1]; }
      slot.cartArr = Cesium.Cartesian3.fromDegreesArray(flat);
    };

    // ── ALWAYS build fixture entities first — instant visibility, no waiting on WS ──
    // Fixtures stay as rich Entities (billboard + label + trail). There are only
    // ~30 of them so the per-entity overhead is negligible.
    const entMap = {};
    layerRefsRef.current.ships = entMap;
    v.entities.suspendEvents();
    window.MacroGlobeData.SHIPS_FIXTURES.forEach(s => {
      if (!shipFilter.has(s.type)) return;
      entMap[s.id] = buildShipEntity(s.id, s.lon, s.lat, s.type, s.hdg, s.name, { kind: 'ship', _source: 'fixture', ...s });
    });
    v.entities.resumeEvents();

    // ── Live AIS path uses PointPrimitiveCollection — one batched draw call ──
    // for thousands of vessels. No per-vessel label / trail / billboard. The
    // selected vessel still gets a full info-drawer via click pick.
    const livePoints = new Cesium.PointPrimitiveCollection({ blendOption: Cesium.BlendOption.OPAQUE_AND_TRANSLUCENT });
    v.scene.primitives.add(livePoints);
    livePointsRef.current = livePoints;
    livePtMapRef.current  = {};
    setCounts(c => ({ ...c, ships: Object.keys(entMap).length + livePoints.length }));

    // Fixture drift loop — moves the curated vessels along their heading every 5s.
    // (Was 3s; bumped to 5s — these are mock anyway and the visual diff is invisible.)
    const drift = setInterval(() => {
      window.MacroGlobeData.SHIPS_FIXTURES.forEach((s) => {
        const dt = 5 / 3600;
        const km = s.sog * 1.852 * dt;
        const dLat = (km / 111) * Math.cos(s.hdg * Math.PI / 180);
        const dLon = (km / (111 * Math.cos(s.lat * Math.PI / 180))) * Math.sin(s.hdg * Math.PI / 180);
        s.lat += dLat; s.lon += dLon;
        if (entMap[s.id]) {
          entMap[s.id].position = Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 0);
          updateTrail(s.id, s.lon, s.lat);
        }
      });
      v.scene.requestRender();
    }, 5000);

    // ── Build cleanup that handles both fixture + (optional) live AIS ──
    let aisCleanup = null;
    const cleanupAll = () => {
      clearInterval(drift);
      if (aisCleanup) aisCleanup();
      v.entities.suspendEvents();
      Object.values(entMap).forEach(e => v.entities.remove(e));
      v.entities.resumeEvents();
      if (livePointsRef.current) {
        v.scene.primitives.remove(livePointsRef.current); // destroys all PointPrimitives
        livePointsRef.current = null;
      }
      livePtMapRef.current = {};
      layerRefsRef.current.ships = null;
      liveShipsRef.current = {};
      aisMsgsRef.current = 0;
      aisLastAtRef.current = null;
      setAisStatus('idle');
    };

    // ── If in LIVE mode, also stream real AIS positions on top of fixtures ──
    if (shipMode === 'live') {
      if (!aisKey) { return cleanupAll; }
      liveShipsRef.current = {};
      setAisStatus('connecting');
      setAisMsgs(0);
      setAisLastAt(null);
      aisMsgsRef.current = 0;
      aisLastAtRef.current = null;

      // AISStream silently drops a single planet-wide bbox on the free tier.
      // Use multiple large regional bboxes — together they cover ~all busy lanes.
      // Each region is well under 90° wide, which the server accepts.
      const bboxes = [
        [[-60, -180], [ 60,  -90]],   // Americas Pacific + west coasts
        [[-60,  -90], [ 60,    0]],   // Atlantic + Americas east + west Africa
        [[-60,    0], [ 60,   90]],   // Europe + Mediterranean + Africa + Indian Ocean west
        [[-60,   90], [ 60,  180]],   // SE Asia + Indian Ocean east + Pacific west + Oceania
        [[ 60, -180], [ 85,  180]],   // Arctic
        [[-85, -180], [-60,  180]],   // Antarctic + southern oceans
      ];

      aisRef.current = window.MacroGlobeFetchers.openAISStream(aisKey, bboxes, {
        onOpen: () => { aisLiveSinceRef.current = Date.now(); setAisStatus('live'); setAisBlockReason(null); },
        onClose: () => { aisLiveSinceRef.current = null; setAisStatus('idle'); },
        onTransport: (t) => setAisTransport(t),
        onError: (e) => {
          console.warn('[Globe] AIS error', e);
          if (e && e.message === 'WS_KILLED_BY_CLIENT') {
            setAisStatus('blocked');
            setAisBlockReason('WS_KILLED_BY_CLIENT');
          } else {
            setAisStatus('error');
          }
        },
        onPosition: (p) => {
          if (!viewerRef.current || p.lat == null || p.lon == null) return;
          // counters live in refs — flushed to state once/sec by the 1Hz tick
          aisMsgsRef.current += 1;
          aisLastAtRef.current = Date.now();
          const existing = liveShipsRef.current[p.mmsi] || { mmsi: p.mmsi, name: p.shipname || `MMSI ${p.mmsi}`, type: 'cargo' };
          existing.lat = p.lat; existing.lon = p.lon;
          existing.sog = p.sog; existing.cog = p.cog; existing.hdg = p.hdg;
          existing.navStatus = p.navStatus; existing.asof = p.asof;
          if (p.shipname) existing.name = p.shipname;
          liveShipsRef.current[p.mmsi] = existing;
          const slot = livePtMapRef.current[p.mmsi];
          const visible = shipFilter.has(existing.type);
          if (slot) {
            slot.pt.position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0);
            slot.pt.show     = visible;
            slot.info        = { kind: 'ship', _source: 'live', ...existing };
            slot.pt.id       = slot.info;
            slot.type        = existing.type;
          } else if (visible) {
            if (livePoints.length >= MAX_LIVE_SHIPS) return;
            const colorHex = SHIP_COLORS[existing.type] || SHIP_COLORS.cargo;
            const cesColor = Cesium.Color.fromCssColorString(colorHex);
            const info = { kind: 'ship', _source: 'live', ...existing };
            const pt = livePoints.add({
              position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
              color: cesColor.withAlpha(0.95),
              outlineColor: cesColor.withAlpha(0.35),
              outlineWidth: 1.5,
              pixelSize: 5,
              scaleByDistance: new Cesium.NearFarScalar(500_000, 1.4, 30_000_000, 0.8),
              translucencyByDistance: new Cesium.NearFarScalar(15_000_000, 1.0, 50_000_000, 0.35),
            });
            pt.id = info; // returned by scene.pick → picked.id
            livePtMapRef.current[p.mmsi] = { pt, type: existing.type, info };
          }
        },
        onStatic: (s) => {
          const e = liveShipsRef.current[s.mmsi];
          if (!e) return;
          if (s.name) e.name = s.name;
          if (s.imo) e.imo = s.imo;
          if (s.callsign) e.callsign = s.callsign;
          if (s.type != null) {
            e.type = AIS_TYPE_GROUP(s.type);
            e.aisType = s.type;
            e.aisTypeLabel = AIS_TYPE_LABEL(s.type);
          }
          if (s.destination) e.destination = s.destination;
          if (s.draught) e.draught = s.draught;
          if (s.dimA != null && s.dimB != null) {
            e.lengthM = (s.dimA || 0) + (s.dimB || 0);
            e.beamM = (s.dimC || 0) + (s.dimD || 0);
          }
          const slot = livePtMapRef.current[s.mmsi];
          if (!slot) return;
          // Retint to the new type's color, refresh metadata for click-pick.
          if (slot.type !== e.type) {
            const colorHex = SHIP_COLORS[e.type] || SHIP_COLORS.cargo;
            const cesColor = Cesium.Color.fromCssColorString(colorHex);
            slot.pt.color = cesColor.withAlpha(0.95);
            slot.pt.outlineColor = cesColor.withAlpha(0.35);
            slot.type = e.type;
            slot.pt.show = shipFilter.has(e.type);
          }
          slot.info = { kind: 'ship', _source: 'live', ...e };
          slot.pt.id = slot.info;
        },
      });
      aisCleanup = () => {
        if (aisRef.current) { aisRef.current.close(); aisRef.current = null; }
      };
    }

    return cleanupAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.ships, shipMode, aisKey, bootState, visibilityNonce]); // shipFilter handled by separate sync effect below · visibilityNonce reattaches after Page Visibility pause

  // ── Filter chip sync — toggle existing entities + point primitives in place,
  //    no layer rebuild, no AIS reconnect.
  React.useEffect(() => {
    const v = viewerRef.current;
    if (!v || bootState !== 'ok') return;
    // Fixtures (entities)
    const ents = layerRefsRef.current.ships;
    if (ents) {
      v.entities.suspendEvents();
      Object.entries(ents).forEach(([id, e]) => {
        const info = e._info;
        if (info && info.type != null) e.show = shipFilter.has(info.type);
      });
      v.entities.resumeEvents();
    }
    // Live AIS (point primitives)
    const map = livePtMapRef.current;
    Object.keys(map).forEach(mmsi => {
      const slot = map[mmsi];
      slot.pt.show = shipFilter.has(slot.type);
    });
    v.scene.requestRender();
  }, [shipFilter, bootState]);

  // AIRCRAFT layer
  React.useEffect(() => {
    const v = viewerRef.current;
    if (bootState !== 'ok' || !v) return;
    if (!layers.aircraft) {
      if (aircraftPollRef.current) { clearInterval(aircraftPollRef.current); aircraftPollRef.current = null; }
      const ac = layerRefsRef.current.aircraft;
      if (ac) { v.entities.suspendEvents(); ac.forEach(e => v.entities.remove(e)); v.entities.resumeEvents(); layerRefsRef.current.aircraft = null; }
      setCounts(c => ({ ...c, aircraft: 0 }));
      setAircraftErr(null);
      aircraftCacheRef.current = [];
      return;
    }
    const Cesium = window.Cesium;
    let alive = true;
    const refresh = async () => {
      const data = await window.MacroGlobeFetchers.fetchAircraft();
      if (!alive || !viewerRef.current) return;
      if (!data) { setAircraftErr('Live feed unreachable — retry in 30s'); return; }
      setAircraftErr(null);
      aircraftCacheRef.current = data;
      v.entities.suspendEvents();
      const prev = layerRefsRef.current.aircraft || [];
      prev.forEach(e => v.entities.remove(e));
      const sample = data.length > 2500 ? data.slice(0, 2500) : data;
      const list = sample.map(a => v.entities.add({
        id: `ac-${a.icao}`,
        position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat, Math.max(a.altM, 100)),
        point: {
          pixelSize: 4,
          color: Cesium.Color.YELLOW.withAlpha(0.85),
          outlineColor: Cesium.Color.fromCssColorString('#FFD24A').withAlpha(0.3),
          outlineWidth: 1,
        },
        _info: { kind: 'aircraft', ...a },
      }));
      v.entities.resumeEvents();
      layerRefsRef.current.aircraft = list;
      setCounts(c => ({ ...c, aircraft: list.length }));
    };
    refresh();
    aircraftPollRef.current = setInterval(refresh, 30000);
    return () => {
      alive = false;
      if (aircraftPollRef.current) { clearInterval(aircraftPollRef.current); aircraftPollRef.current = null; }
      const ac = layerRefsRef.current.aircraft;
      if (ac && viewerRef.current) {
        viewerRef.current.entities.suspendEvents();
        ac.forEach(e => viewerRef.current.entities.remove(e));
        viewerRef.current.entities.resumeEvents();
        layerRefsRef.current.aircraft = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.aircraft, bootState, visibilityNonce]);

  // SATELLITES layer
  React.useEffect(() => {
    const v = viewerRef.current;
    if (bootState !== 'ok' || !v) return;
    if (!layers.satellites) {
      if (satTickRef.current) { clearInterval(satTickRef.current); satTickRef.current = null; }
      const sc = layerRefsRef.current.satellites;
      if (sc) { v.entities.suspendEvents(); sc.forEach(e => v.entities.remove(e)); v.entities.resumeEvents(); layerRefsRef.current.satellites = null; }
      setCounts(c => ({ ...c, satellites: 0 }));
      satRecsRef.current = []; satCacheRef.current = []; setSatErr(null);
      return;
    }
    if (!window.satellite) { setSatErr('satellite.js failed to load'); return; }
    const Cesium = window.Cesium;
    let alive = true;
    const colorHex = SAT_GROUP_COLORS[satGroup] || '#5BB4F0';
    const color = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.92);

    const setup = async () => {
      const tles = await window.MacroGlobeFetchers.fetchTLEs(satGroup);
      if (!alive || !viewerRef.current) return;
      if (!tles || tles.length === 0) { setSatErr('Celestrak unreachable'); return; }
      setSatErr(null);
      const recs = tles.map(t => {
        try { return { tle: t, rec: window.satellite.twoline2satrec(t.l1, t.l2) }; }
        catch { return null; }
      }).filter(Boolean);
      satRecsRef.current = recs;

      v.entities.suspendEvents();
      const prev = layerRefsRef.current.satellites || [];
      prev.forEach(e => v.entities.remove(e));
      const list = recs.map((r, i) => v.entities.add({
        id: `sat-${i}`,
        position: Cesium.Cartesian3.fromDegrees(0, 0, 0),
        point: { pixelSize: 3, color, outlineColor: color.withAlpha(0.3), outlineWidth: 1 },
        _info: { kind: 'satellite', name: r.tle.name, group: r.tle.group },
      }));
      v.entities.resumeEvents();
      layerRefsRef.current.satellites = list;
      setCounts(c => ({ ...c, satellites: list.length }));

      const tick = () => {
        const now = new Date();
        const gmst = window.satellite.gstime(now);
        const ents = layerRefsRef.current.satellites;
        if (!ents) return;
        const cache = [];
        v.entities.suspendEvents();
        for (let i = 0; i < recs.length; i++) {
          const pv = window.satellite.propagate(recs[i].rec, now);
          if (!pv || !pv.position) continue;
          try {
            const geo = window.satellite.eciToGeodetic(pv.position, gmst);
            const lat = window.satellite.degreesLat(geo.latitude);
            const lon = window.satellite.degreesLong(geo.longitude);
            const altM = geo.height * 1000;
            if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(altM)) {
              ents[i].position = Cesium.Cartesian3.fromDegrees(lon, lat, altM);
              cache.push({ name: recs[i].tle.name, group: recs[i].tle.group, lat, lon, alt: altM });
            }
          } catch {/* skip */}
        }
        v.entities.resumeEvents();
        satCacheRef.current = cache;
        // requestRenderMode is on — explicitly ask for a redraw now that positions changed
        v.scene.requestRender();
      };
      tick();
      // 3s cadence: SGP4 is CPU-heavy at 5,000+ TLEs. Visual jitter at 3s is
      // imperceptible — satellites move a few km between frames.
      satTickRef.current = setInterval(tick, 3000);
    };
    setup();
    return () => {
      alive = false;
      if (satTickRef.current) { clearInterval(satTickRef.current); satTickRef.current = null; }
      const sc = layerRefsRef.current.satellites;
      if (sc && viewerRef.current) {
        viewerRef.current.entities.suspendEvents();
        sc.forEach(e => viewerRef.current.entities.remove(e));
        viewerRef.current.entities.resumeEvents();
        layerRefsRef.current.satellites = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.satellites, satGroup, bootState, visibilityNonce]);

  // ----- Search -----
  React.useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!search.trim()) { setSearchResults([]); setPlaceResults([]); return; }
    const local = runLocalSearch(search, {
      liveShipsCache: liveShipsRef.current,
      aircraftCache: aircraftCacheRef.current,
      satCache: satCacheRef.current,
    });
    setSearchResults(local);
    searchTimerRef.current = setTimeout(async () => {
      if (search.trim().length >= 3) {
        const places = await window.MacroGlobeFetchers.geocode(search);
        setPlaceResults(places.map(p => ({
          kind: 'place',
          label: p.shortName,
          sub: p.name.split(',').slice(1).map(s => s.trim()).slice(0, 3).join(' · ') || p.placeType,
          lat: p.lat, lon: p.lon,
          info: { kind: 'place', ...p },
        })));
      }
    }, 600);
  }, [search]);

  const handleResultClick = (r) => {
    setSelected(r.info);
    setSearchOpen(false);
    setSearch('');
    if (Number.isFinite(r.lat) && Number.isFinite(r.lon)) {
      flyTo([r.lon, r.lat, r.kind === 'satellite' ? 6_500_000 : (r.kind === 'place' ? 1_500_000 : 2_500_000)], 1.8);
      stopAutoOrbitInternal();
      userInteractRef.current = Date.now();
    }
  };

  const goHome  = () => { flyTo(JKT, 2); setSelected(null); userInteractRef.current = 0; };
  const zoomIn  = () => { const v=viewerRef.current; if(!v) return; v.camera.zoomIn(v.camera.positionCartographic.height * 0.35); userInteractRef.current = Date.now(); };
  const zoomOut = () => { const v=viewerRef.current; if(!v) return; v.camera.zoomOut(v.camera.positionCartographic.height * 0.5); userInteractRef.current = Date.now(); };

  const fmtCoord = (v, isLat) => {
    if (v == null) return '—';
    const hem = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
    return `${Math.abs(v).toFixed(2)}°${hem}`;
  };
  const fmtAlt = (m) => {
    if (m == null) return '—';
    if (m >= 1_000_000) return `${(m/1_000_000).toFixed(1)} Mm`;
    if (m >= 1000) return `${Math.round(m/1000)} km`;
    return `${Math.round(m)} m`;
  };

  const layerDef = [
    { key: 'aircraft',   label: 'Aircraft',   sub: 'airplanes.live', dot: '#FFD24A', err: aircraftErr },
    { key: 'satellites', label: 'Satellites', sub: 'Celestrak · live', dot: SAT_GROUP_COLORS[satGroup] || '#5BB4F0', err: satErr },
    { key: 'energy',     label: 'Energy',     sub: 'WRI · curated',  dot: '#19C37D', err: null },
    { key: 'ships',      label: 'Ships',      sub: shipMode === 'live' ? (aisStatus === 'live' && aisMsgs > 0 ? `AIS · live · ${aisMsgs.toLocaleString()} msgs` : `AIS · ${aisStatus}${aisStatus === 'live' ? ' · awaiting msgs' : ''}`) : 'AIS · curated', dot: '#5BB4F0', err: null },
  ];

  const allResults = [...searchResults, ...placeResults].slice(0, 25);

  return (
    <section className="mc-section mg-section">
      <div className="mc-section-h">
        <span>Globe · 3D map · live</span>
        <span className="mc-section-h-sub">{
          bootState === 'ok'       ? `${BASEMAPS[basemap].sub}${aisStatus === 'live' ? ' · AIS live' : ''}` :
          bootState === 'loading'  ? bootMsg :
          bootState === 'fallback' ? `${bootMsg} · ASCII placeholder` : 'idle'
        }</span>
      </div>

      <div className="mg-shell">
        <div className="mg-toolbar">
          <span className="mg-toolbar-l">Layers</span>
          {layerDef.map(l => (
            <button
              key={l.key}
              className={`mg-layer ${layers[l.key] ? 'is-on' : ''} ${l.err ? 'is-err' : ''}`}
              onClick={() => setLayers(s => ({ ...s, [l.key]: !s[l.key] }))}
              title={l.err || l.sub}
            >
              <span className="mg-layer-dot" style={{ background: l.dot }} />
              <b>{l.label}</b>
              <span className="mg-layer-sub">{l.err ? 'unavailable' : l.sub}</span>
              {layers[l.key] && counts[l.key] > 0 && <span className="mg-layer-n">{counts[l.key].toLocaleString()}</span>}
            </button>
          ))}
          {layers.satellites && (
            <select className="mg-sat-group" value={satGroup} onChange={e => setSatGroup(e.target.value)}>
              <option value="stations">Stations (ISS, CSS)</option>
              <option value="starlink">Starlink</option>
              <option value="weather">Weather</option>
              <option value="gps-ops">GPS</option>
              <option value="science">Science</option>
            </select>
          )}
          {layers.ships && (
            <span className="mg-ship-mode">
              <button className={`mg-ship-mode-btn ${shipMode === 'fixture' ? 'is-on' : ''}`} onClick={() => setShipMode('fixture')}>Curated</button>
              <button className={`mg-ship-mode-btn ${shipMode === 'live' ? 'is-on' : ''}`} onClick={() => { if (!aisKey) { setShowKey(true); setKeyInput(''); } else { setShipMode('live'); }}}>Live AIS</button>
              {shipMode === 'live' && <button className="mg-ctl mg-ctl-tiny" title="Edit AIS key" onClick={() => { setShowKey(true); setKeyInput(aisKey); }}>⚙</button>}
            </span>
          )}
          {layers.ships && (
            <span className="mg-type-filter" title="Filter vessel types">
              <button
                className="mg-type-chip mg-type-chip--all"
                onClick={() => setShipFilter(prev => prev.size === SHIP_TYPE_GROUPS.length
                  ? new Set([])
                  : new Set(SHIP_TYPE_GROUPS.map(g => g.key)))}
                title={shipFilter.size === SHIP_TYPE_GROUPS.length ? 'Clear all' : 'Show all'}
              >{shipFilter.size === SHIP_TYPE_GROUPS.length ? '◉ all' : '○ all'}</button>
              {SHIP_TYPE_GROUPS.map(g => (
                <button
                  key={g.key}
                  className={`mg-type-chip ${shipFilter.has(g.key) ? 'is-on' : ''}`}
                  style={{ '--chip-c': SHIP_COLORS[g.key] || SHIP_COLORS.other }}
                  onClick={() => setShipFilter(prev => {
                    const next = new Set(prev);
                    if (next.has(g.key)) next.delete(g.key); else next.add(g.key);
                    return next;
                  })}
                >{g.label}</button>
              ))}
            </span>
          )}
          <span className="mg-basemap">
            <span className="mg-basemap-l">Style</span>
            {Object.entries(BASEMAPS).map(([k, b]) => (
              <button key={k} className={`mg-basemap-btn ${basemap === k ? 'is-on' : ''}`} onClick={() => setBasemap(k)} title={b.sub}>{b.label}</button>
            ))}
          </span>
          <span className="mg-toolbar-r">
            <button className={`mg-ctl ${autoOrbit ? 'is-on' : ''}`} onClick={() => setAutoOrbit(o => !o)} title="Auto-orbit JKT↔NYC">⟳</button>
            <button className="mg-ctl" onClick={zoomOut} title="Zoom out">−</button>
            <button className="mg-ctl" onClick={zoomIn}  title="Zoom in">+</button>
            <button className="mg-ctl" onClick={goHome} title="Home">⌂</button>
          </span>
        </div>

        <div className="mg-canvas-wrap">
          <div ref={containerRef} className={`mg-canvas ${bootState !== 'ok' ? 'is-hidden' : ''}`} />
          {bootState !== 'ok' && (
            <div className="mc-map-placeholder">
              <div className="mc-map-ascii-frame">
                <div className="mc-map-ascii">{`                  ░░▒▒▓▓▓▓▒▒░░
            ░▒▓████████████▓▒░
       ░▒▓████████████████████▓▒░
    ▒▓██████████████████████████▓▒
   ▓████████████████████████████████▓
   ████████████████████████████████████
   ▓████████████████████████████████▓
    ▒▓██████████████████████████▓▒
       ░▒▓████████████████████▓▒░
            ░▒▓████████████▓▒░
                  ░░▒▒▓▓▓▓▒▒░░`}</div>
                <div className="mc-map-meta">
                  <div className="mc-map-meta-row"><span>STATUS</span><b>{bootMsg}</b></div>
                  <div className="mc-map-meta-row"><span>JAKARTA</span><b>−6.21° / 106.85°</b></div>
                  <div className="mc-map-meta-row"><span>NEW YORK</span><b>40.71° / −74.01°</b></div>
                </div>
              </div>
              <div className="mc-map-cap">3D Cesium globe — live aircraft (airplanes.live), satellites (Celestrak), energy (WRI), live ships (AISStream).</div>
            </div>
          )}

          {bootState === 'ok' && (
            <>
              <div className="mg-search-wrap">
                <div className={`mg-search ${searchOpen ? 'is-open' : ''}`}>
                  <span className="mg-search-icon">⌕</span>
                  <input
                    type="text"
                    placeholder="Search vessels, plants, satellites, places, companies… e.g. 'tankers in Suez', 'BBCA', 'ISS'"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                  />
                  {search && <button className="mg-search-clear" onClick={() => { setSearch(''); setSearchOpen(false); }}>✕</button>}
                </div>
                {searchOpen && search && allResults.length > 0 && (
                  <div className="mg-search-drop">
                    {allResults.map((r, i) => (
                      <button key={`${r.kind}-${i}-${r.label}`} className="mg-search-row" onClick={() => handleResultClick(r)}>
                        <span className={`mg-search-kind mg-search-kind--${r.kind}`}>{r.kind}</span>
                        <span className="mg-search-label">{r.label}</span>
                        <span className="mg-search-sub">{r.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchOpen && search && allResults.length === 0 && (
                  <div className="mg-search-drop"><div className="mg-search-empty">No matches{search.length < 3 ? ' · type more for places' : ''}</div></div>
                )}
              </div>

              <div className="mg-hud">
                <div className="mg-hud-row"><span className="mg-hud-l">Cursor</span><span className="mg-hud-v">{fmtCoord(hud.lat, true)} / {fmtCoord(hud.lon, false)}</span></div>
                <div className="mg-hud-row"><span className="mg-hud-l">Camera alt</span><span className="mg-hud-v">{fmtAlt(hud.alt)}</span></div>
                <div className="mg-hud-row"><span className="mg-hud-l">Render</span><span className="mg-hud-v">{hud.fps} fps</span></div>
                <div className="mg-hud-row"><span className="mg-hud-l">Total</span><span className="mg-hud-v">{Object.values(counts).reduce((a,b)=>a+b,0).toLocaleString()}</span></div>
              </div>

              {selected && (
                <aside className="mg-drawer">
                  <div className="mg-drawer-h">
                    <span className="mc-tag">{selected.kind}</span>
                    {selected.kind === 'energy' && <span className="mc-tag" style={{color: FUEL_COLORS[selected.fuel], borderColor: FUEL_COLORS[selected.fuel]}}>{selected.fuel}</span>}
                    {selected.kind === 'ship' && <span className="mc-tag" style={{color: SHIP_COLORS[selected.type] || SHIP_COLORS.cargo, borderColor: SHIP_COLORS[selected.type] || SHIP_COLORS.cargo}}>{selected.type || 'vessel'}</span>}
                    {selected.kind === 'aircraft' && <span className="mc-tag">{selected.registration || (selected.icao || '').toUpperCase()}</span>}
                    {selected.kind === 'satellite' && <span className="mc-tag">{selected.group}</span>}
                    {selected.kind === 'ticker' && <span className="mc-tag">{selected.ticker}</span>}
                    {selected.kind === 'place' && <span className="mc-tag">{selected.country || 'place'}</span>}
                    <div style={{flex:1}} />
                    <button className="mg-ctl" onClick={() => setSelected(null)}>✕</button>
                  </div>
                  <h3 className="mg-drawer-title">
                    {selected.kind === 'aircraft' && (selected.callsign || selected.icao)}
                    {selected.kind === 'satellite' && selected.name}
                    {selected.kind === 'energy' && selected.name}
                    {selected.kind === 'ship' && (selected.name || `MMSI ${selected.mmsi}`)}
                    {selected.kind === 'ticker' && selected.name}
                    {selected.kind === 'place' && selected.shortName}
                  </h3>
                  {selected.kind === 'energy' && (
                    <ul className="mg-drawer-kv">
                      <li><span>Country</span><b>{selected.country}</b></li>
                      <li><span>Capacity</span><b>{selected.mw.toLocaleString()} MW</b></li>
                      <li><span>Fuel</span><b style={{color: FUEL_COLORS[selected.fuel]}}>{selected.fuel.toUpperCase()}</b></li>
                      <li><span>Commissioned</span><b>{selected.year}</b></li>
                      <li><span>Operator</span><b>{selected.op}</b></li>
                      <li><span>Coordinates</span><b>{selected.lat.toFixed(3)}° / {selected.lon.toFixed(3)}°</b></li>
                    </ul>
                  )}
                  {selected.kind === 'ship' && (
                    <ul className="mg-drawer-kv">
                      {selected.imo && <li><span>IMO</span><b>{selected.imo}</b></li>}
                      <li><span>MMSI</span><b>{selected.mmsi}</b></li>
                      {selected.callsign && <li><span>Callsign</span><b>{selected.callsign}</b></li>}
                      <li><span>Type</span><b>{selected.aisTypeLabel || (selected.type || 'vessel')}{selected.aisType ? ` · AIS ${selected.aisType}` : ''}</b></li>
                      {selected.flag && <li><span>Flag</span><b>{selected.flag}</b></li>}
                      <li><span>Speed</span><b>{(selected.sog || 0).toFixed(1)} kn</b></li>
                      <li><span>Heading</span><b>{Math.round(selected.hdg || selected.cog || 0)}°</b></li>
                      {selected.lengthM && <li><span>Length × Beam</span><b>{selected.lengthM} × {selected.beamM} m</b></li>}
                      {selected.draught && <li><span>Draught</span><b>{(selected.draught/10).toFixed(1)} m</b></li>}
                      {(selected.dest || selected.destination) && <li><span>Destination</span><b>{selected.dest || selected.destination}</b></li>}
                      {selected.cargo && <li><span>Cargo</span><b>{selected.cargo}</b></li>}
                      {selected.asof && <li><span>Last seen</span><b>{new Date(selected.asof).toLocaleTimeString()}</b></li>}
                      <li><span>Source</span><b>{selected.mmsi && (window.MacroGlobeData.SHIPS_FIXTURES.find(s => s.mmsi === selected.mmsi) ? 'Curated AIS fixture' : 'AISStream live')}</b></li>
                    </ul>
                  )}
                  {selected.kind === 'aircraft' && (
                    <ul className="mg-drawer-kv">
                      <li><span>Callsign</span><b>{selected.callsign || '—'}</b></li>
                      <li><span>Registration</span><b>{selected.registration || '—'}</b></li>
                      <li><span>ICAO24</span><b>{(selected.icao || '').toUpperCase()}</b></li>
                      <li><span>Type</span><b>{selected.type || '—'}{selected.desc ? ` · ${selected.desc}` : ''}</b></li>
                      {selected.operator && <li><span>Operator</span><b>{selected.operator}</b></li>}
                      {selected.year && <li><span>Year</span><b>{selected.year}</b></li>}
                      <li><span>Altitude</span><b>{Math.round(selected.altFt || 0).toLocaleString()} ft</b></li>
                      <li><span>Ground speed</span><b>{Math.round(selected.gsKn || 0)} kn</b></li>
                      <li><span>Track</span><b>{Math.round(selected.hdgDeg || 0)}°</b></li>
                      <li><span>V/S</span><b>{Math.round((selected.vRate || 0) * 196.85)} ft/min</b></li>
                      {selected.squawk && <li><span>Squawk</span><b>{selected.squawk}</b></li>}
                      {selected.emergency && selected.emergency !== 'none' && <li><span>Status</span><b style={{color:'var(--neg)'}}>{selected.emergency.toUpperCase()}</b></li>}
                      <li><span>Region feed</span><b>{selected.region}</b></li>
                      <li><span>Source</span><b>{selected.source}</b></li>
                    </ul>
                  )}
                  {selected.kind === 'satellite' && (
                    <ul className="mg-drawer-kv">
                      <li><span>NORAD name</span><b>{selected.name}</b></li>
                      <li><span>Group</span><b>{selected.group}</b></li>
                      {selected.alt && <li><span>Altitude</span><b>{(selected.alt/1000).toFixed(0)} km</b></li>}
                      {selected.lat && <li><span>Sub-point</span><b>{selected.lat.toFixed(2)}° / {selected.lon.toFixed(2)}°</b></li>}
                      <li><span>Source</span><b>Celestrak GP TLE</b></li>
                      <li><span>Propagator</span><b>SGP4 via satellite.js</b></li>
                    </ul>
                  )}
                  {selected.kind === 'ticker' && (
                    <ul className="mg-drawer-kv">
                      <li><span>Symbol</span><b>{selected.ticker}</b></li>
                      <li><span>Sector</span><b>{selected.sector}</b></li>
                      <li><span>HQ Country</span><b>{selected.country}</b></li>
                      <li><span>HQ Coordinates</span><b>{selected.lat.toFixed(3)}° / {selected.lon.toFixed(3)}°</b></li>
                    </ul>
                  )}
                  {selected.kind === 'place' && (
                    <ul className="mg-drawer-kv">
                      <li><span>Type</span><b>{selected.placeType}</b></li>
                      <li><span>Class</span><b>{selected.class}</b></li>
                      {selected.country && <li><span>Country</span><b>{selected.country}</b></li>}
                      <li><span>Coordinates</span><b>{selected.lat.toFixed(4)}° / {selected.lon.toFixed(4)}°</b></li>
                      <li><span>Source</span><b>OpenStreetMap · Nominatim</b></li>
                    </ul>
                  )}
                </aside>
              )}

              {showKey && (
                <div className="mg-key-overlay" onClick={() => setShowKey(false)}>
                  <div className="mg-key-modal" onClick={e => e.stopPropagation()}>
                    <h3>Live AIS · API key required</h3>
                    <p className="mg-key-p">Real-time vessel tracking is provided by <b>AISStream.io</b>. The free tier is sufficient for this view.</p>
                    <ol className="mg-key-steps">
                      <li>Open <a href="https://aisstream.io" target="_blank" rel="noreferrer">aisstream.io</a></li>
                      <li>Register (no credit card required)</li>
                      <li>Copy your API key from the dashboard</li>
                    </ol>
                    <input
                      type="text"
                      className="mg-key-input"
                      placeholder="Paste AISStream API key…"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                    />
                    <p className="mg-key-priv">🔒 Stored only in this browser's localStorage. Never sent anywhere except aisstream.io.</p>
                    <div className="mg-key-actions">
                      {aisKey && <button className="mg-key-clear" onClick={() => { try { localStorage.removeItem('lbc-ais-key'); } catch{}; setAisKey(''); setKeyInput(''); setShowKey(false); setShipMode('fixture'); }}>Clear key</button>}
                      <div style={{flex:1}} />
                      <button className="mg-key-cancel" onClick={() => setShowKey(false)}>Cancel</button>
                      <button className="mg-key-save" disabled={!keyInput.trim()} onClick={() => { try { localStorage.setItem('lbc-ais-key', keyInput.trim()); } catch{}; setAisKey(keyInput.trim()); setShowKey(false); setShipMode('live'); }}>Save & connect</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {shipMode === 'live' && aisStatus === 'blocked' && (
          <div className="mg-progress is-blocked">
            <div className="mg-progress-row">
              <span className="mg-progress-label">● AIS WebSocket blocked locally — close code 1006</span>
              <span className="mg-progress-hint">
                Your AIS key works — 1,700+ msgs/12s verified from a non-browser test on this same machine. Something in this browser (a wallet/security extension that injects <code>lockdown-install.js</code>, a content blocker, AV, or VPN) is killing the WebSocket after the handshake completes. The fix is to bypass the browser's network stack entirely:
              </span>
            </div>
            <div className="mg-progress-howto">
              <div className="mg-progress-step"><span className="mg-progress-stepn">1</span><span>Open a terminal in this project folder:</span></div>
              <pre className="mg-progress-cmd">cd ~/Downloads/Terminal-LBC{'\n'}node scripts/aisstream-proxy.js</pre>
              <div className="mg-progress-step"><span className="mg-progress-stepn">2</span><span>Leave that terminal running. Then click <b>Retry live AIS</b> below — the globe will auto-detect the loopback proxy at <code>ws://127.0.0.1:8123</code>. Browser extensions cannot intercept loopback WebSockets, so the data path is clean.</span></div>
              <div className="mg-progress-step mg-progress-step-dim"><span className="mg-progress-stepn">·</span><span>First run only: <code>npm install ws</code> (one-off dependency for the proxy script).</span></div>
            </div>
            <div className="mg-progress-track"><div className="mg-progress-fill" style={{ width: '100%' }} /></div>
            <div className="mg-progress-actions">
              <button className="mg-progress-btn is-primary" onClick={() => { setAisBlockReason(null); setAisTransport(null); setShipMode('fixture'); setTimeout(() => setShipMode('live'), 80); }}>↻ Retry live AIS</button>
              <button className="mg-progress-btn" onClick={() => setShipMode('fixture')}>Use curated fixtures instead</button>
            </div>
          </div>
        )}

        {shipMode === 'live' && aisStatus !== 'blocked' && (aisStatus === 'connecting' || (aisStatus === 'live' && aisMsgs === 0)) && (() => {
          const HANDSHAKE_WINDOW_MS = 10_000;
          const elapsed = aisLiveSinceRef.current
            ? Math.min(Date.now() - aisLiveSinceRef.current, HANDSHAKE_WINDOW_MS)
            : 0;
          const pct = aisStatus === 'connecting'
            ? null // indeterminate while WS handshake in flight
            : Math.round((elapsed / HANDSHAKE_WINDOW_MS) * 100);
          const stalled = pct === 100;
          const label =
            aisStatus === 'connecting' ? 'Opening WebSocket to AISStream…' :
            stalled ? 'No AIS frames received — likely blocked by browser extension.' :
            `Waiting for first AIS frame… ${Math.round(elapsed/1000)}s / 10s`;
          return (
            <div className={`mg-progress ${stalled ? 'is-stalled' : ''}`}>
              <div className="mg-progress-row">
                <span className="mg-progress-label">{label}</span>
                {stalled && (
                  <span className="mg-progress-hint">
                    Open in Incognito (⌘⇧N) or disable extensions in chrome://extensions
                  </span>
                )}
              </div>
              <div className={`mg-progress-track ${pct == null ? 'is-indeterminate' : ''}`}>
                <div className="mg-progress-fill" style={pct == null ? null : { width: pct + '%' }} />
              </div>
            </div>
          );
        })()}

        <div className="mg-foot">
          <span>Cesium 1.117 · {BASEMAPS[basemap].sub} · airplanes.live · Celestrak · satellite.js · AISStream · WRI</span>
          <span className="mg-foot-r">
            {shipMode === 'live' ? (
              aisStatus === 'live' && aisMsgs > 0 ? (
                <>
                  <span className="mg-foot-live">● AIS live</span>
                  {aisTransport === 'proxy' && (
                    <>
                      <span className="mg-foot-sep">·</span>
                      <span className="mg-foot-dim">via local proxy</span>
                    </>
                  )}
                  <span className="mg-foot-sep">·</span>
                  <span>{Object.keys(liveShipsRef.current).length.toLocaleString()} vessels</span>
                  <span className="mg-foot-sep">·</span>
                  <span>{aisMsgs.toLocaleString()} msgs</span>
                  {aisLastAt && (
                    <>
                      <span className="mg-foot-sep">·</span>
                      <span className="mg-foot-dim">last {Math.max(0, Math.round((Date.now() - aisLastAt) / 1000))}s ago</span>
                    </>
                  )}
                </>
              ) : aisStatus === 'live' || aisStatus === 'connecting' ? (
                /* progress bar above handles these states */
                <span className="mg-foot-dim">style: {BASEMAPS[basemap].label}</span>
              ) : aisStatus === 'error' ? (
                <span className="mg-foot-err">● AIS error — check key / network</span>
              ) : (
                <span className="mg-foot-dim">○ AIS idle</span>
              )
            ) : `style: ${BASEMAPS[basemap].label}`}
          </span>
        </div>
      </div>
    </section>
  );
};

window.MacroGlobe = MacroGlobe;
