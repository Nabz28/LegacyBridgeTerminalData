/**
 * Tree-layout adapter — turns the run's flat `nodes` map into a
 * d3-hierarchy tree along the primary spine, then runs a horizontal
 * layout (depth → x, position-in-level → y).
 *
 * Cross-links are not part of this — they live as a separate overlay
 * in `CrossLinkOverlay.tsx`, which reuses the positions computed here.
 */

import { hierarchy, tree as d3tree } from "d3-hierarchy";
import type { HierarchyPointNode } from "d3-hierarchy";

import type { BaseNodeShape, Tree } from "./types";

export interface PositionedNode extends BaseNodeShape {
  x: number;
  y: number;
  depth: number;
}

export interface LaidOutTree {
  nodes: PositionedNode[];
  byId: Map<string, PositionedNode>;
  width: number;
  height: number;
}

export interface LayoutOptions {
  /** Horizontal spacing between depth levels in px. */
  levelStride?: number;
  /** Vertical spacing between siblings in px. */
  siblingStride?: number;
  /** Top/bottom padding in px. */
  paddingY?: number;
  /** Left/right padding in px. */
  paddingX?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  levelStride: 240,
  siblingStride: 32,
  paddingY: 32,
  paddingX: 24,
};

/**
 * Build a primary-spine hierarchy from `tree.nodes` and lay it out
 * left-to-right. Nodes with no `primary_parent` (orphans) other than
 * the declared root are skipped — they have no spine position. The
 * UI surfaces them via `Tree.find_dangling_primary_parents` upstream.
 */
export function layoutTree(tree: Tree, options: LayoutOptions = {}): LaidOutTree {
  const opts = { ...DEFAULTS, ...options };

  if (!tree.root_id || !tree.nodes[tree.root_id]) {
    return { nodes: [], byId: new Map(), width: 0, height: 0 };
  }

  // Build adjacency along primary_parent so d3 can hierarchify it.
  const childrenByParent = new Map<string, BaseNodeShape[]>();
  for (const node of Object.values(tree.nodes)) {
    if (!node.primary_parent) continue;
    const arr = childrenByParent.get(node.primary_parent) ?? [];
    arr.push(node);
    childrenByParent.set(node.primary_parent, arr);
  }

  // Stable sort children by created_at so re-layout is deterministic.
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const root = hierarchy<BaseNodeShape>(
    tree.nodes[tree.root_id],
    (node) => childrenByParent.get(node.id) ?? [],
  );

  const layout = d3tree<BaseNodeShape>()
    .nodeSize([opts.siblingStride, opts.levelStride]);

  layout(root);

  const positioned: PositionedNode[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  root.each((d) => {
    const point = d as HierarchyPointNode<BaseNodeShape>;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  // d3-tree gives `point.x` as the cross-axis (vertical when we render
  // L→R) and `point.y` as the depth-axis (horizontal). We translate
  // each axis with its own padding: the vertical axis (screen-y) uses
  // paddingY, and the horizontal axis (screen-x) uses paddingX.
  const screenYOffset = -minX + opts.paddingY;
  const screenXOffset = opts.paddingX;

  root.each((d) => {
    const point = d as HierarchyPointNode<BaseNodeShape>;
    positioned.push({
      ...point.data,
      // depth → screen-x, cross-axis → screen-y
      x: point.y + screenXOffset,
      y: point.x + screenYOffset,
      depth: point.depth,
    });
  });

  const width = maxY + opts.paddingX * 2;
  const height = maxX - minX + opts.paddingY * 2;

  const byId = new Map(positioned.map((n) => [n.id, n]));
  return { nodes: positioned, byId, width, height };
}
