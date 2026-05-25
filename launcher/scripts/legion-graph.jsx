// ================================================================
// LEGION — Brain graph (window.LegionGraph). Obsidian-style node map
// over brain.notes, using vis-network (window.vis, already loaded).
// Nodes = notes (colour by folder, size by link-degree, shape by type),
// edges = resolved [[wikilinks]] (links[]). Click a node → open it.
// Physics stabilises then freezes (perf). The active note is highlighted
// without rebuilding the network.
// ================================================================

const LG_FOLDER_COLORS = {
  home: '#8b7cf0', system: '#b3a7ff', strategy: '#5fa8ff', growth: '#5fd6a4',
  investments: '#ffc578', operations: '#7c9bf2', hr: '#ff8a98', people: '#f0a6e8',
  knowledge: '#9aa7bd', product: '#6f9cf2', research: '#67d0c0', inbox: '#ffb454',
};
const lgFolderColor = (f) => LG_FOLDER_COLORS[f] || '#8E9AB0';
window.lgFolderColor = lgFolderColor;

const lgGraphShape = (type) =>
  type === 'system' ? 'diamond'
  : (type === 'goal' || type === 'milestone' || type === 'kpi') ? 'square'
  : type === 'hq_widget' ? 'triangle'
  : type === 'person' ? 'dot'
  : 'dot';

// resolve links[] (titles) → edges; compute degree + orphans
const lgBuildGraph = (notes) => {
  const byTitle = {};
  (notes || []).forEach((n) => { byTitle[(n.title || '').toLowerCase()] = n; });
  const degree = {}; const edges = []; const seen = {};
  const linkedTitles = {};
  (notes || []).forEach((n) => {
    (n.links || []).forEach((t) => {
      const key = (t || '').toLowerCase();
      linkedTitles[key] = true;
      const tgt = byTitle[key];
      if (!tgt || tgt.id === n.id) return;
      const ek = [n.id, tgt.id].sort().join('|');
      if (seen[ek]) return; seen[ek] = 1;
      edges.push({ from: n.id, to: tgt.id });
      degree[n.id] = (degree[n.id] || 0) + 1;
      degree[tgt.id] = (degree[tgt.id] || 0) + 1;
    });
  });
  return { byTitle, degree, edges, linkedTitles };
};

const LegionGraph = ({ notes, activeId, onOpen }) => {
  const ref = React.useRef(null);
  const netRef = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !window.vis || !notes || !notes.length) return undefined;
    const { degree, edges } = lgBuildGraph(notes);
    const nodes = notes.map((n) => ({
      id: n.id,
      label: n.title,
      value: (degree[n.id] || 0) + 1,
      shape: lgGraphShape(n.type),
      color: {
        background: lgFolderColor(n.folder),
        border: lgFolderColor(n.folder),
        highlight: { background: '#fff', border: lgFolderColor(n.folder) },
      },
      font: { color: '#cfd8ea', size: 13, face: 'Geist', strokeWidth: 3, strokeColor: '#05060a' },
    }));
    const data = { nodes: new window.vis.DataSet(nodes), edges: new window.vis.DataSet(edges) };
    const net = new window.vis.Network(ref.current, data, {
      nodes: { scaling: { min: 9, max: 34 }, borderWidth: 1.5 },
      edges: { color: { color: 'rgba(139,124,240,.26)', highlight: '#8b7cf0', hover: '#8b7cf0' }, width: 1, smooth: { type: 'continuous' } },
      physics: { barnesHut: { gravitationalConstant: -3200, springLength: 130, centralGravity: 0.28, damping: 0.4 }, stabilization: { iterations: 250 } },
      interaction: { hover: true, tooltipDelay: 120, navigationButtons: false },
    });
    net.on('click', (p) => { if (p.nodes && p.nodes.length) onOpen && onOpen(p.nodes[0]); });
    net.once('stabilizationIterationsDone', () => { try { net.setOptions({ physics: false }); } catch (e) {} });
    netRef.current = net;
    return () => { try { net.destroy(); } catch (e) {} netRef.current = null; };
  }, [notes]);

  // highlight the active note without rebuilding the network
  React.useEffect(() => {
    const net = netRef.current;
    if (!net) return;
    try { net.selectNodes(activeId ? [activeId] : []); if (activeId) net.focus(activeId, { scale: 1.0, animation: { duration: 400 } }); } catch (e) {}
  }, [activeId]);

  const total = (notes || []).length;
  const { linkedTitles } = lgBuildGraph(notes || []);
  const orphans = (notes || []).filter((n) => !(n.links && n.links.length) && !linkedTitles[(n.title || '').toLowerCase()]).length;

  return (
    <div className="lg-graphwrap">
      <div className="lg-graph-bar">
        <span className="lg-graph-count">{total} notes</span>
        {orphans > 0 && <span className="lg-graph-orphan" title="notes with no links in or out">{orphans} orphan{orphans > 1 ? 's' : ''}</span>}
        <span className="lg-sp" />
        <span className="lg-dim">click a node to open · drag to explore · scroll to zoom</span>
      </div>
      <div className="lg-graph-canvas" ref={ref} />
    </div>
  );
};
window.LegionGraph = LegionGraph;
