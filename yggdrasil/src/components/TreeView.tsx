import { useMemo } from "react";

import { ZONE_BG, ZONE_COLORS } from "../lib/colors";
import { layoutTree } from "../lib/layout";
import type { LaidOutTree } from "../lib/layout";
import type { Tree } from "../lib/types";

import { CrossLinkOverlay } from "./CrossLinkOverlay";

interface Props {
  tree: Tree;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  showCrossLinks: boolean;
  onSelectNode: (nodeId: string) => void;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 22;

/**
 * Renders the spine of the run as an SVG hierarchy. Cross-links
 * (DAG layer) are an optional overlay layer on top, sharing the same
 * computed positions.
 */
export function TreeView({
  tree,
  selectedNodeId,
  highlightedNodeIds,
  showCrossLinks,
  onSelectNode,
}: Props) {
  const layout = useMemo<LaidOutTree>(() => layoutTree(tree), [tree]);

  if (layout.nodes.length === 0) {
    return (
      <div className="tree-view tree-view--empty">
        Tree is empty. Add a root thesis with{" "}
        <code>yggdrasil node add --type thesis …</code>.
      </div>
    );
  }

  // Add padding for node-rectangle overflow at edges.
  const svgWidth = layout.width + NODE_WIDTH + 32;
  const svgHeight = layout.height + NODE_HEIGHT + 32;

  return (
    <div className="tree-view">
      <svg
        className="tree-view__svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label="Research-tree spine"
      >
        {/* Spine edges (parent → child) */}
        <g className="tree-view__edges" stroke="#cbd5e1" fill="none">
          {layout.nodes.map((node) => {
            if (!node.primary_parent) return null;
            const parent = layout.byId.get(node.primary_parent);
            if (!parent) return null;
            const x1 = parent.x + NODE_WIDTH;
            const y1 = parent.y + NODE_HEIGHT / 2;
            const x2 = node.x;
            const y2 = node.y + NODE_HEIGHT / 2;
            const midX = (x1 + x2) / 2;
            const path = `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`;
            return (
              <path
                key={`${parent.id}-${node.id}`}
                d={path}
                strokeWidth={1.25}
              />
            );
          })}
        </g>

        {/* Cross-links — a separate layer drawn between edges and nodes */}
        {showCrossLinks && (
          <CrossLinkOverlay
            tree={tree}
            layout={layout}
            nodeWidth={NODE_WIDTH}
            nodeHeight={NODE_HEIGHT}
          />
        )}

        {/* Nodes */}
        <g className="tree-view__nodes">
          {layout.nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const isHighlighted = highlightedNodeIds.has(node.id);
            const isDimmed =
              highlightedNodeIds.size > 0 && !isHighlighted;
            const stroke = ZONE_COLORS[node.zone];
            const fill = ZONE_BG[node.zone];
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={[
                  "tree-view__node",
                  isSelected ? "is-selected" : "",
                  isHighlighted ? "is-highlighted" : "",
                  isDimmed ? "is-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectNode(node.id)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={4}
                  ry={4}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 2.5 : 1}
                  opacity={isDimmed ? 0.35 : 1}
                />
                <title>{`${node.type} • ${node.zone} • ${node.title}`}</title>
                <text
                  x={8}
                  y={NODE_HEIGHT / 2 + 4}
                  fontSize={12}
                  fill="#0f172a"
                  opacity={isDimmed ? 0.5 : 1}
                >
                  {truncate(node.title, 28)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
