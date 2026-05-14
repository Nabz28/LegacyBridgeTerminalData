/**
 * Dagre-based layered layout.
 *
 * Tree spine = primary_parent edges. Cross-links are NOT fed to
 * dagre — they overlay separately so they don't confuse the layered
 * topology.
 *
 * Sprint-15 (accordion) changes:
 *   - ``visibleIds`` (REQUIRED for the canvas layout) takes the place
 *     of the old ``collapsedIds`` — the accordion store computes the
 *     visible set directly, and only those nodes feed dagre.
 *   - Cross-links whose target is hidden are NOT dropped; instead the
 *     edge terminates at the nearest VISIBLE ancestor of the target,
 *     and a ``stubTargetId`` field carries the real target id so the
 *     canvas can render a "→ refutes (3)" badge that drills in.
 *   - A separate ``layoutTreeFull(tree)`` is exposed for the Minimap
 *     so it can show the entire structural tree regardless of
 *     accordion state.
 */

import dagre from '@dagrejs/dagre';
import type { Tree, YgNode, EdgeType } from '../api/types';

export type LayoutDirection = 'LR' | 'TB';

export interface LayoutNode {
  id: string;
  /** Center coordinates from dagre. */
  x: number;
  y: number;
  width: number;
  height: number;
  node: YgNode;
}

export interface LayoutEdge {
  /** Primary spine edge from parent -> child. */
  fromId: string;
  toId: string;
  /** Polyline points produced by dagre. */
  points: Array<{ x: number; y: number }>;
}

export interface LayoutCrossLink {
  /** Source node id — always a currently-visible node. */
  fromId: string;
  /** Visible endpoint — either the real target (when visible) or the
   * nearest visible ancestor of the hidden target. */
  toId: string;
  edgeType: EdgeType;
  /** Set when ``toId`` is a stand-in for a hidden target. Carries the
   * REAL target id so the badge can drill in. */
  stubTargetId: string | null;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  crossLinks: LayoutCrossLink[];
  /** Bounding box of the layout (for canvas sizing). */
  width: number;
  height: number;
}

export interface LayoutOptions {
  direction?: LayoutDirection;
  /** Restrict the layout to this set. When absent, ALL nodes are laid out
   * (used by the minimap's full-tree overview). */
  visibleIds?: ReadonlySet<string>;
}

/** Card sizing hints fed to dagre. Real DOM measurement happens
 * post-layout via an effect, but dagre needs *something* to compute
 * spacing. Keep these slightly larger than the typical card so edge
 * routing has breathing room. */
const NODE_W = 240;
const NODE_H = 140;
const RANK_SEP = 60;
const NODE_SEP = 20;
const EDGE_SEP = 16;

export function layoutTree(
  tree: Tree,
  options: LayoutOptions = {},
): LayoutResult {
  const direction = options.direction ?? 'LR';
  const allIds = new Set(Object.keys(tree.nodes));
  const visibleIds = options.visibleIds ?? allIds;

  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({
    rankdir: direction,
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    edgesep: EDGE_SEP,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const id of visibleIds) {
    if (!tree.nodes[id]) continue;
    g.setNode(id, { width: NODE_W, height: NODE_H });
  }

  // Primary tree spine — only visible-to-visible edges go to dagre.
  for (const id of visibleIds) {
    const node = tree.nodes[id];
    if (!node) continue;
    if (
      node.primary_parent &&
      visibleIds.has(node.primary_parent) &&
      tree.nodes[node.primary_parent]
    ) {
      g.setEdge(node.primary_parent, id);
    }
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = [];
  for (const id of visibleIds) {
    if (!tree.nodes[id]) continue;
    const meta = g.node(id);
    if (!meta) continue;
    layoutNodes.push({
      id,
      x: meta.x,
      y: meta.y,
      width: meta.width,
      height: meta.height,
      node: tree.nodes[id],
    });
  }

  const layoutEdges: LayoutEdge[] = g.edges().map((e) => {
    const meta = g.edge(e);
    return {
      fromId: e.v,
      toId: e.w,
      points: meta.points ?? [],
    };
  });

  // ----- Cross-links with stub-edge support -------------------------
  // For each cross-link in the tree, decide:
  //   - both endpoints visible -> render normally
  //   - source visible, target hidden -> stub edge to nearest visible
  //     ancestor of target
  //   - source hidden -> skip entirely (the edge has no anchor)
  //   - target node doesn't exist in tree -> skip
  const seenStub = new Set<string>();
  const crossLinks: LayoutCrossLink[] = [];
  for (const id of visibleIds) {
    const node = tree.nodes[id];
    if (!node) continue;
    for (const link of node.cross_links) {
      const target = tree.nodes[link.target_id];
      if (!target) continue;
      let visibleEndpoint: string;
      let stubTargetId: string | null = null;
      if (visibleIds.has(link.target_id)) {
        visibleEndpoint = link.target_id;
      } else {
        // Walk parent chain until we hit a visible ancestor.
        let cur: string | null = target.primary_parent;
        const guard = new Set<string>();
        while (cur && !guard.has(cur)) {
          guard.add(cur);
          if (visibleIds.has(cur)) break;
          cur = tree.nodes[cur]?.primary_parent ?? null;
        }
        if (!cur || !visibleIds.has(cur)) continue; // no visible anchor — skip
        visibleEndpoint = cur;
        stubTargetId = link.target_id;
      }
      // Dedupe: same source + endpoint + edgeType collapses to one badge.
      // Stub-vs-non-stub still treated as separate keys so a direct edge
      // doesn't accidentally hide a stub badge.
      const key = `${id}|${visibleEndpoint}|${link.edge_type}|${stubTargetId ?? ''}`;
      if (seenStub.has(key)) continue;
      seenStub.add(key);
      crossLinks.push({
        fromId: id,
        toId: visibleEndpoint,
        edgeType: link.edge_type,
        stubTargetId,
      });
    }
  }

  const graphMeta = g.graph();
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    crossLinks,
    width: graphMeta.width ?? 0,
    height: graphMeta.height ?? 0,
  };
}

/** Lay out the ENTIRE tree (no accordion filter). Used by the minimap
 * so the analyst always sees the full structural overview. */
export function layoutTreeFull(
  tree: Tree,
  direction: LayoutDirection = 'LR',
): LayoutResult {
  return layoutTree(tree, { direction });
}
