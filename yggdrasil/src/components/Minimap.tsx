/**
 * Minimap — small overview of the whole tree fixed in the
 * bottom-right of the canvas. Renders one rectangle per node coloured
 * by zone, plus the viewport frame so the analyst can see where they
 * are.
 *
 * Sprint-15 (accordion): the minimap now uses the FULL structural
 * layout (every node, regardless of accordion state) so the analyst
 * always sees the complete map. Nodes that are currently HIDDEN by
 * the accordion render in a dimmed colour; nodes in the visible set
 * render bright. The currently-expanded path is the bright spine.
 *
 * Clicking the minimap snaps the main viewport to the nearest node
 * (passed back via ``onJumpToWorld`` so the parent can auto-expand
 * the path to it).
 */

import { useMemo } from 'react';
import { usePositionsStore } from '../state/positions';
import type { LayoutResult } from '../tree/layout';
import './Minimap.css';

interface Props {
  runDirName: string;
  /** FULL structural layout (every node positioned), NOT the
   * accordion-filtered one. */
  layout: LayoutResult;
  /** Ids that are currently visible on the main canvas. Used to color
   * the minimap dots — visible = bright, hidden = muted. */
  visibleIds: Set<string>;
  /** Current viewport: world-space translation + scale. */
  viewportX: number;
  viewportY: number;
  viewportScale: number;
  /** Size of the visible canvas in screen pixels. */
  canvasWidth: number;
  canvasHeight: number;
  /** Called when the user clicks somewhere in the minimap. Receives
   * the world coordinates of the click AND the id of the nearest
   * full-layout node (so the parent can drill the accordion to it). */
  onJumpToWorld: (wx: number, wy: number, nearestId: string | null) => void;
}

const MINIMAP_W = 200;
const MINIMAP_H = 140;

export function Minimap({
  runDirName,
  layout,
  visibleIds,
  viewportX,
  viewportY,
  viewportScale,
  canvasWidth,
  canvasHeight,
  onJumpToWorld,
}: Props) {
  const offsets = usePositionsStore((s) => s.offsets);

  const nodeById = useMemo(() => {
    const m = new Map<string, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) m.set(n.id, n);
    return m;
  }, [layout.nodes]);

  const { scale, originX, originY } = useMemo(() => {
    const pad = 6;
    if (layout.width === 0 || layout.height === 0) {
      return { scale: 1, originX: 0, originY: 0 };
    }
    const sx = (MINIMAP_W - 2 * pad) / layout.width;
    const sy = (MINIMAP_H - 2 * pad) / layout.height;
    const s = Math.min(sx, sy);
    return { scale: s, originX: pad, originY: pad };
  }, [layout.width, layout.height]);

  const toMini = (wx: number, wy: number) => ({
    x: originX + wx * scale,
    y: originY + wy * scale,
  });

  // Viewport rectangle in mini coordinates.
  const viewWorldX0 = -viewportX / viewportScale;
  const viewWorldY0 = -viewportY / viewportScale;
  const viewWorldX1 = (canvasWidth - viewportX) / viewportScale;
  const viewWorldY1 = (canvasHeight - viewportY) / viewportScale;
  const frame = {
    x: originX + viewWorldX0 * scale,
    y: originY + viewWorldY0 * scale,
    w: (viewWorldX1 - viewWorldX0) * scale,
    h: (viewWorldY1 - viewWorldY0) * scale,
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - originX) / scale;
    const wy = (my - originY) / scale;
    // Find the nearest layout node in world coordinates so the parent
    // can drill the accordion to it.
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const ln of layout.nodes) {
      const d = Math.hypot(ln.x - wx, ln.y - wy);
      if (d < bestD) {
        bestD = d;
        bestId = ln.id;
      }
    }
    onJumpToWorld(wx, wy, bestId);
  };

  return (
    <div className="minimap">
      <div className="minimap__label">MAP</div>
      <svg
        width={MINIMAP_W}
        height={MINIMAP_H}
        onClick={handleClick}
        className="minimap__svg"
      >
        {/* Spine edges in dim grey — only between visible-to-visible
         *  pairs render in the accent colour; hidden-pair edges stay
         *  muted to keep the spine readable. */}
        <g>
          {layout.edges.map((edge) => {
            const fromOff = offsets[`${runDirName}|${edge.fromId}`] ?? { dx: 0, dy: 0 };
            const toOff = offsets[`${runDirName}|${edge.toId}`] ?? { dx: 0, dy: 0 };
            const fromNode = nodeById.get(edge.fromId);
            const toNode = nodeById.get(edge.toId);
            if (!fromNode || !toNode) return null;
            const a = toMini(fromNode.x + fromOff.dx, fromNode.y + fromOff.dy);
            const b = toMini(toNode.x + toOff.dx, toNode.y + toOff.dy);
            const onPath =
              visibleIds.has(edge.fromId) && visibleIds.has(edge.toId);
            return (
              <line
                key={edge.fromId + edge.toId}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={
                  'minimap__edge' +
                  (onPath ? ' minimap__edge--visible' : '')
                }
              />
            );
          })}
        </g>
        {/* Node rectangles by zone — visible nodes get full opacity,
         *  hidden nodes are dimmed for an "I am here" effect. */}
        <g>
          {layout.nodes.map((n) => {
            const off = offsets[`${runDirName}|${n.id}`] ?? { dx: 0, dy: 0 };
            const center = toMini(n.x + off.dx, n.y + off.dy);
            const visible = visibleIds.has(n.id);
            return (
              <rect
                key={n.id}
                x={center.x - 3}
                y={center.y - 2}
                width={6}
                height={4}
                className={
                  `minimap__node minimap__node--${n.node.zone}` +
                  (visible ? ' minimap__node--visible' : ' minimap__node--hidden')
                }
              />
            );
          })}
        </g>
        {/* Viewport frame */}
        <rect
          x={frame.x}
          y={frame.y}
          width={Math.max(2, frame.w)}
          height={Math.max(2, frame.h)}
          className="minimap__frame"
        />
      </svg>
    </div>
  );
}
