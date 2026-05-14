import { EDGE_COLORS, EDGE_TYPE_LABELS } from "../lib/colors";
import type { LaidOutTree } from "../lib/layout";
import type { Tree } from "../lib/types";

interface Props {
  tree: Tree;
  layout: LaidOutTree;
  nodeWidth: number;
  nodeHeight: number;
}

/**
 * Cross-link arcs (the DAG layer over the spine).
 *
 * Each arc draws a quadratic Bezier from the source node's right edge
 * to the target node's left edge, bowed away from the spine so it's
 * visually distinct from parent-child edges. Edge type controls stroke
 * color (see ``colors.ts``); a small mid-curve label tags the type.
 */
export function CrossLinkOverlay({ tree, layout, nodeWidth, nodeHeight }: Props) {
  const arcs: JSX.Element[] = [];

  for (const node of Object.values(tree.nodes)) {
    const source = layout.byId.get(node.id);
    if (!source) continue;
    for (const link of node.cross_links) {
      const target = layout.byId.get(link.target_id);
      if (!target) continue;

      const sx = source.x + nodeWidth;
      const sy = source.y + nodeHeight / 2;
      const tx = target.x;
      const ty = target.y + nodeHeight / 2;

      // Bow up if target is below source, down if above. The offset
      // is proportional to the distance so far-away cross-links
      // arc more dramatically and stay readable.
      const dx = tx - sx;
      const dy = ty - sy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bow = Math.min(120, distance * 0.35);
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2 - (dy >= 0 ? bow : -bow);
      const path = `M${sx},${sy} Q${midX},${midY} ${tx},${ty}`;

      const color = EDGE_COLORS[link.edge_type];
      arcs.push(
        <g
          key={`${source.id}-${link.target_id}-${link.edge_type}`}
          className="cross-link"
        >
          <path
            d={path}
            stroke={color}
            strokeWidth={1.4}
            strokeOpacity={0.8}
            fill="none"
            strokeDasharray="4 4"
          />
          <circle cx={tx} cy={ty} r={3} fill={color} opacity={0.9} />
          <text
            x={midX}
            y={midY - 4}
            fontSize={9}
            textAnchor="middle"
            fill={color}
            opacity={0.9}
          >
            {EDGE_TYPE_LABELS[link.edge_type]}
          </text>
        </g>,
      );
    }
  }

  return <g className="tree-view__cross-links">{arcs}</g>;
}
