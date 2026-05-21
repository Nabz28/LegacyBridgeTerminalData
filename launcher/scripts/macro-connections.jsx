// ================================================================
// Macro · Connections — live force-simulated correlation lattice
//
// Pure-JS spring-mass physics, no external library. Runs in
// requestAnimationFrame at 60fps; each frame applies:
//   • Coulomb repulsion between all node pairs (keeps the graph spread)
//   • Hooke spring forces along edges (length encodes |corr| inverse)
//   • Center gravity (pulls everything back from runaway escape)
//   • Drag dampening (velocity * 0.92 per frame)
//
// Interaction:
//   • hover    → node + neighbors brighten, edges pulse outward
//   • click    → focus mode: node pinned to center, neighbors orbit close
//   • drag     → grab + reposition, velocity inherits on release
//   • search   → typeahead with autocomplete dropdown
//
// Visual polish:
//   • edges breathe with animated stroke-dasharray (data-flow feel)
//   • focused node gets a glow halo + radius pulse
//   • non-neighbors dim to 25% opacity on focus
//
// All input fixtures live on window.MACRO_DATA.GRAPH_NODES / GRAPH_EDGES.
// ================================================================

const GROUP_HUE = {
  rates: '#FFD24A',  // yellow
  fx:    '#7CD6FF',  // sky
  eq:    '#19C37D',  // green
  comm:  '#FF8A50',  // amber
  risk:  '#FF5C70',  // red
  macro: '#C58CFF',  // violet
};

const MacroConnections = () => {
  const NODES = (window.MACRO_DATA && window.MACRO_DATA.GRAPH_NODES) || [];
  const EDGES = (window.MACRO_DATA && window.MACRO_DATA.GRAPH_EDGES) || [];

  // --- viewport ---
  const W = 1180, H = 620;
  const CX = W / 2, CY = H / 2;

  // --- physics state (refs — never trigger React renders) ---
  const simRef     = React.useRef(null);
  const rafRef     = React.useRef(0);
  const svgRef     = React.useRef(null);
  const draggingRef = React.useRef(null); // {id, ox, oy} during drag

  // --- React state (renders only when interaction changes) ---
  const [focus, setFocus] = React.useState('sp500');
  const [hover, setHover] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [, forceTick]      = React.useState(0); // 1 setState per rAF, but cheap (no DOM rebuild — D3 paths come from refs)

  // --- build sim once, when NODES/EDGES are available ---
  React.useEffect(() => {
    if (!NODES.length) return;
    const nodes = NODES.map(n => ({
      id: n.id, label: n.label, group: n.group, r: n.r,
      x: n.x * W + (Math.random() - 0.5) * 40,
      y: n.y * H + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
    }));
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const edges = EDGES.map(([a, b, w]) => ({ a: nodeMap[a], b: nodeMap[b], w })).filter(e => e.a && e.b);

    simRef.current = { nodes, edges, nodeMap };

    const REPULSION   = 8500;   // Coulomb constant
    const SPRING_K    = 0.018;  // spring stiffness
    const GRAVITY     = 0.014;  // pull toward center
    const DAMPING     = 0.86;   // velocity decay per frame
    const TIMESTEP    = 1.0;
    const MAX_SPEED   = 8;

    const tick = () => {
      const sim = simRef.current;
      if (!sim) return;
      const { nodes, edges } = sim;

      // Repulsion (O(n²) — fine for 13 nodes)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx*dx + dy*dy + 0.01;
          const d  = Math.sqrt(d2);
          const f  = REPULSION / d2;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Springs — natural length encodes correlation magnitude
      //   strong |corr| → shorter rest length → tighter cluster
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx*dx + dy*dy) + 0.01;
        const restLen = 140 + (1 - Math.abs(e.w)) * 180; // |corr|=1 → 140, |corr|=0 → 320
        const stretch = d - restLen;
        const f = SPRING_K * stretch;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        e.a.vx += fx; e.a.vy += fy;
        e.b.vx -= fx; e.b.vy -= fy;
      }

      // Center gravity
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.vx += (CX - n.x) * GRAVITY * 0.04;
        n.vy += (CY - n.y) * GRAVITY * 0.04;
      }

      // Focus magnetism — pull focused node toward center, pull its neighbors close-in
      const focusId = simRef.current._focus;
      if (focusId && nodes.find(n => n.id === focusId)) {
        const fn = nodes.find(n => n.id === focusId);
        // Pin focus near center
        fn.vx += (CX - fn.x) * 0.04;
        fn.vy += (CY - fn.y) * 0.04;
        // Pull neighbors closer
        edges.forEach(e => {
          const other = e.a.id === focusId ? e.b : e.b.id === focusId ? e.a : null;
          if (!other) return;
          const dx = fn.x - other.x, dy = fn.y - other.y;
          const d  = Math.sqrt(dx*dx + dy*dy) + 0.01;
          const targetD = 175;
          const stretch = d - targetD;
          other.vx += (dx / d) * stretch * 0.015;
          other.vy += (dy / d) * stretch * 0.015;
        });
      }

      // Integrate
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Skip integration for the actively dragged node
        if (draggingRef.current && draggingRef.current.id === n.id) {
          n.vx = 0; n.vy = 0;
          continue;
        }
        n.vx *= DAMPING; n.vy *= DAMPING;
        // Clamp speed
        const sp = Math.sqrt(n.vx*n.vx + n.vy*n.vy);
        if (sp > MAX_SPEED) { n.vx = (n.vx / sp) * MAX_SPEED; n.vy = (n.vy / sp) * MAX_SPEED; }
        n.x += n.vx * TIMESTEP;
        n.y += n.vy * TIMESTEP;
        // Soft viewport bounds
        const margin = n.r + 24;
        if (n.x < margin)       { n.x = margin;       n.vx *= -0.4; }
        if (n.x > W - margin)   { n.x = W - margin;   n.vx *= -0.4; }
        if (n.y < margin)       { n.y = margin;       n.vy *= -0.4; }
        if (n.y > H - margin)   { n.y = H - margin;   n.vy *= -0.4; }
      }

      forceTick(t => (t + 1) & 0x7fff);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafRef.current); simRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NODES.length, EDGES.length]);

  // Propagate focus changes into the sim (read in the tick loop)
  React.useEffect(() => {
    if (simRef.current) simRef.current._focus = focus;
  }, [focus]);

  // --- pointer interactions ---
  const screenToSvg = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const r = svg.getBoundingClientRect();
    const sx = (clientX - r.left) / r.width * W;
    const sy = (clientY - r.top)  / r.height * H;
    return [sx, sy];
  };
  const onNodeDown = (e, n) => {
    e.preventDefault();
    const [sx, sy] = screenToSvg(e.clientX, e.clientY);
    draggingRef.current = { id: n.id, ox: sx - n.x, oy: sy - n.y };
  };
  React.useEffect(() => {
    const onMove = (e) => {
      const d = draggingRef.current;
      if (!d || !simRef.current) return;
      const n = simRef.current.nodes.find(x => x.id === d.id);
      if (!n) return;
      const [sx, sy] = screenToSvg(e.clientX, e.clientY);
      n.x = sx - d.ox;
      n.y = sy - d.oy;
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // --- render-time read of physics state ---
  const sim = simRef.current;
  const nodes = sim ? sim.nodes : [];
  const edges = sim ? sim.edges : [];
  const nodeMap = sim ? sim.nodeMap : {};
  const focusNode = nodeMap[focus] || nodes[0];

  // Neighbor set for the currently focused node (drives dim/opacity)
  const neighbors = React.useMemo(() => {
    const set = new Set([focus]);
    EDGES.forEach(([a, b]) => {
      if (a === focus) set.add(b);
      if (b === focus) set.add(a);
    });
    return set;
  }, [focus, EDGES]);

  const hoverNeighbors = React.useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    EDGES.forEach(([a, b]) => {
      if (a === hover) set.add(b);
      if (b === hover) set.add(a);
    });
    return set;
  }, [hover, EDGES]);

  // Search hits
  const searchHits = !query
    ? []
    : NODES.filter(n => n.label.toLowerCase().includes(query.toLowerCase()) || n.id.includes(query.toLowerCase()));

  // Strongest correlations for focused node
  const topConnections = focusNode
    ? EDGES.filter(([a, b]) => a === focus || b === focus)
        .sort((x, y) => Math.abs(y[2]) - Math.abs(x[2]))
        .slice(0, 8)
    : [];

  return (
    <section className="mc-section mc-conn-page">
      <div className="mc-section-h">
        <span>Macro · Connections</span>
        <span className="mc-section-h-sub">live correlation lattice · 60 fps · drag any node · hover to highlight · click to focus</span>
      </div>
      <div className="mc-conn-layout mc-conn-layout--page">
        <div className="mc-conn-canvas mc-conn-canvas--page mc-conn-canvas--live">
          <div className="mc-conn-toolbar mc-conn-toolbar--inline">
            <input
              placeholder="Search node…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {searchHits.length > 0 && (
              <div className="mc-conn-search-results">
                {searchHits.slice(0, 6).map(n => (
                  <button key={n.id} className="mc-conn-search-hit" onClick={() => { setFocus(n.id); setQuery(''); }}>
                    <span className={`mc-conn-leg mc-conn-leg--${n.group}`}>{n.group}</span>
                    {n.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ flex: 1 }} />
            {['rates','fx','eq','comm','risk','macro'].map(g => (
              <span key={g} className={`mc-conn-leg mc-conn-leg--${g}`}>{g}</span>
            ))}
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            className="mc-conn-svg"
          >
            <defs>
              <pattern id="mc-grid-live" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              </pattern>
              <radialGradient id="mc-focus-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="rgba(232,228,217,0.5)" />
                <stop offset="100%" stopColor="rgba(232,228,217,0)" />
              </radialGradient>
            </defs>
            <rect width={W} height={H} fill="url(#mc-grid-live)" />

            {/* edges: drawn first so nodes sit on top */}
            {edges.map((e, i) => {
              const isFocusedEdge = e.a.id === focus || e.b.id === focus;
              const isHoverEdge   = hover && (e.a.id === hover || e.b.id === hover);
              const lit = isHoverEdge || (isFocusedEdge && !hover);
              const stroke = e.w >= 0 ? 'rgba(25,195,125,VAR)' : 'rgba(255,92,112,VAR)';
              const alpha  = lit ? 0.85 : 0.16;
              const sw     = Math.abs(e.w) * 2.2 + 0.5;
              return (
                <line
                  key={i}
                  x1={e.a.x} y1={e.a.y}
                  x2={e.b.x} y2={e.b.y}
                  stroke={stroke.replace('VAR', alpha)}
                  strokeWidth={sw}
                  strokeDasharray={lit ? '4 6' : null}
                  className={lit ? 'mc-conn-edge mc-conn-edge--lit' : 'mc-conn-edge'}
                />
              );
            })}

            {/* focus glow halo */}
            {focusNode && (
              <circle
                cx={focusNode.x}
                cy={focusNode.y}
                r={focusNode.r * 3.2}
                fill="url(#mc-focus-glow)"
                pointerEvents="none"
              />
            )}

            {/* nodes */}
            {nodes.map(n => {
              const isFocus  = n.id === focus;
              const isHover  = n.id === hover;
              const dimmed   = !!hover ? !hoverNeighbors.has(n.id) : !neighbors.has(n.id);
              const color    = GROUP_HUE[n.group] || '#9CA3AF';
              const labelDy  = n.r + 14;
              return (
                <g
                  key={n.id}
                  opacity={dimmed ? 0.32 : 1}
                  style={{ cursor: draggingRef.current && draggingRef.current.id === n.id ? 'grabbing' : 'grab' }}
                  onMouseDown={(e) => onNodeDown(e, n)}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => { if (!draggingRef.current) setFocus(n.id); e.stopPropagation(); }}
                >
                  <circle
                    cx={n.x} cy={n.y}
                    r={n.r * (isFocus ? 1.18 : isHover ? 1.08 : 1)}
                    fill={color}
                    fillOpacity={isFocus ? 0.92 : 0.78}
                    stroke={isFocus ? 'var(--paper)' : 'rgba(255,255,255,0.18)'}
                    strokeWidth={isFocus ? 2 : 1}
                    className={`mc-conn-node-live ${isFocus ? 'is-focus' : ''} ${isHover ? 'is-hover' : ''}`}
                  />
                  <text
                    x={n.x}
                    y={n.y + labelDy}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fill={isFocus || isHover ? 'var(--paper)' : 'var(--text-secondary)'}
                    letterSpacing="0.04em"
                    pointerEvents="none"
                  >{n.label}</text>
                </g>
              );
            })}
          </svg>

          {/* readout corner */}
          <div className="mc-conn-readout">
            <span>NODES <b>{nodes.length}</b></span>
            <span>EDGES <b>{edges.length}</b></span>
            <span>FOCUS <b>{focusNode ? focusNode.label : '—'}</b></span>
            {hover && <span>HOVER <b>{nodeMap[hover]?.label || hover}</b></span>}
          </div>
        </div>

        <aside className="mc-conn-drawer mc-conn-drawer--page">
          {focusNode && (
            <>
              <div className="mc-conn-drawer-h">
                <span className={`mc-conn-leg mc-conn-leg--${focusNode.group}`}>{focusNode.group}</span>
                <h3>{focusNode.label}</h3>
              </div>
              <p>
                <b>{focusNode.label}</b> sits in the <b>{focusNode.group}</b> cluster.
                Edges are 90-day rolling Pearson correlations — green positive, red negative,
                thickness proportional to magnitude. Spring physics keeps tightly-correlated
                pairs close.
              </p>

              <div className="mc-conn-drawer-h-sub">Strongest correlations · live</div>
              <ul className="mc-conn-drawer-list">
                {topConnections.map(([a, b, w], i) => {
                  const other = a === focus ? b : a;
                  return (
                    <li key={i} onClick={() => setFocus(other)} onMouseEnter={() => setHover(other)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                      <span>{nodeMap[other]?.label || other}</span>
                      <span className={w >= 0 ? 'pos' : 'neg'}>{w >= 0 ? '+' : ''}{w.toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mc-conn-drawer-h-sub">Cluster legend</div>
              <ul className="mc-conn-drawer-legend">
                <li><span className="mc-conn-leg mc-conn-leg--rates">rates</span><span>Policy + sovereign curves</span></li>
                <li><span className="mc-conn-leg mc-conn-leg--fx">fx</span><span>USD pairs + EM currencies</span></li>
                <li><span className="mc-conn-leg mc-conn-leg--eq">eq</span><span>Indices + sector aggregates</span></li>
                <li><span className="mc-conn-leg mc-conn-leg--comm">comm</span><span>Energy + metals + softs</span></li>
                <li><span className="mc-conn-leg mc-conn-leg--risk">risk</span><span>Vol + crypto + credit</span></li>
                <li><span className="mc-conn-leg mc-conn-leg--macro">macro</span><span>CPI + activity prints</span></li>
              </ul>

              <div className="mc-conn-drawer-actions">
                <button className="sw-tf">⤓ Download correlations (CSV)</button>
                <button className="sw-tf">↗ Open in Data tab</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
};

window.MacroConnections = MacroConnections;
