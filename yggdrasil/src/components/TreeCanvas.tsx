/**
 * TreeCanvas — pan/zoom-able viewport rendering both edges (SVG) and
 * cards (HTML) at world coordinates, sharing one CSS ``transform`` so
 * they stay aligned at any zoom level.
 *
 * Architecture:
 *
 *   <div container>                         ← captures wheel + pan
 *     <svg world>                           ← transform: translate(x,y) scale(s)
 *       spine edges, cross-link curves, stub badges
 *     </svg>
 *     <div world-html>                      ← same transform
 *       node cards positioned absolutely
 *     </div>
 *   </div>
 *
 * Node drag: pointerdown on a card promotes to a drag once the
 * pointer has moved DRAG_THRESHOLD_PX in screen space. Pointermove
 * deltas are divided by ``scale`` to translate screen pixels into
 * world coordinates. On pointerup the new offset is committed to the
 * positions store; below the threshold, the original click fires.
 *
 * Sprint-15: the per-card ▾ collapse button is gone. A single click
 * on a card now triggers ``onNodeClick``, which the parent uses to
 * toggle accordion expansion + select + open detail. Cross-link stub
 * badges over collapsed subtrees are rendered here on top of the SVG
 * spine.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { EdgeType, Tree, YgNode } from '../api/types';
import { DRAG_THRESHOLD_PX, useViewport } from '../hooks/useViewport';
import { usePositionsStore } from '../state/positions';
import type { LayoutResult } from '../tree/layout';
import { CrossLinkStubBadge } from './CrossLinkStubBadge';
import './TreeCanvas.css';

interface Props {
  runDirName: string;
  layout: LayoutResult;
  tree: Tree;
  selectedId: string | null;
  ancestorIds: Set<string>;
  descendantIds: Set<string>;
  searchQuery: string;
  showCrossLinks: boolean;
  /** Ids of visible nodes that are NOT on the current drill branch
   * (siblings of nodes in the expanded path). They're rendered faded
   * so the focused branch stands out. */
  offPathIds: Set<string>;
  /** Called when the user clicks a cross-link stub badge whose true
   * target is hidden inside a collapsed subtree. The parent expands
   * the path so the target becomes visible + centered. */
  onStubBadgeClick: (targetId: string) => void;
  renderNode: (node: YgNode) => ReactNode;
  onNodeClick: (id: string) => void;
  onCanvasClick?: () => void;
  /** Imperative handle exposing fit/center for the parent. */
  viewportApiRef?: React.MutableRefObject<ViewportApi | null>;
  /** Fired whenever the internal viewport changes (pan/zoom/fit). The
   * parent uses this to drive the minimap frame without polling. */
  onViewportChange?: (vp: { x: number; y: number; scale: number }) => void;
}

export interface ViewportApi {
  fit: () => void;
  centerOnNode: (nodeId: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface DragState {
  nodeId: string;
  startScreenX: number;
  startScreenY: number;
  baseDx: number;
  baseDy: number;
  /** Did we cross the threshold? Once true, the pointerup must not
   * fire onClick — the user was dragging, not selecting. */
  promoted: boolean;
}

export function TreeCanvas({
  runDirName,
  layout,
  tree,
  selectedId,
  ancestorIds,
  descendantIds,
  searchQuery,
  showCrossLinks,
  offPathIds,
  onStubBadgeClick,
  renderNode,
  onNodeClick,
  onCanvasClick,
  viewportApiRef,
  onViewportChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, beginPan, isPanning, fitTo, centerOnWorld, setViewport } =
    useViewport({ containerRef });

  const offsetsForRun = usePositionsStore((s) => s.offsets);
  const getOffset = usePositionsStore((s) => s.get);
  const setOffset = usePositionsStore((s) => s.set);

  // ----- Auto-fit on first layout for this run --------------------
  // Sprint-15: also refit whenever the accordion changes the
  // visible-node count (layout.nodes.length), so drilling in/out
  // keeps the canvas centered. Key on width/height/count to avoid
  // refitting on every pan/zoom.
  const fittedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${runDirName}|${layout.width}x${layout.height}|${layout.nodes.length}`;
    if (fittedKey.current === key) return;
    fittedKey.current = key;
    fitTo({ width: layout.width, height: layout.height });
  }, [runDirName, layout.width, layout.height, layout.nodes.length, fitTo]);

  // ----- Broadcast viewport on change -----------------------------
  useEffect(() => {
    if (onViewportChange) onViewportChange(viewport);
  }, [viewport, onViewportChange]);

  // ----- Expose imperative API to parent --------------------------
  useEffect(() => {
    if (!viewportApiRef) return;
    viewportApiRef.current = {
      fit: () => fitTo({ width: layout.width, height: layout.height }),
      centerOnNode: (id: string) => {
        const n = layout.nodes.find((ln) => ln.id === id);
        if (!n) return;
        const off = getOffset(runDirName, id);
        centerOnWorld(n.x + off.dx, n.y + off.dy);
      },
      zoomIn: () => setViewport((vp) => ({ ...vp, scale: vp.scale * 1.25 })),
      zoomOut: () =>
        setViewport((vp) => ({ ...vp, scale: Math.max(vp.scale / 1.25, 0.15) })),
    };
    return () => {
      viewportApiRef.current = null;
    };
  }, [
    viewportApiRef,
    fitTo,
    centerOnWorld,
    setViewport,
    layout.width,
    layout.height,
    layout.nodes,
    getOffset,
    runDirName,
  ]);

  // ----- Node positions with offsets applied ----------------------
  const positionedNodes = useMemo(() => {
    return layout.nodes.map((ln) => {
      const off = offsetsForRun[`${runDirName}|${ln.id}`] ?? { dx: 0, dy: 0 };
      return { ...ln, x: ln.x + off.dx, y: ln.y + off.dy };
    });
  }, [layout.nodes, offsetsForRun, runDirName]);

  const positionById = useMemo(() => {
    const m = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const ln of positionedNodes) {
      m.set(ln.id, { x: ln.x, y: ln.y, width: ln.width, height: ln.height });
    }
    return m;
  }, [positionedNodes]);

  // ----- Edge geometry — re-routes a tiny bit when a node is moved.
  const spinePaths = useMemo(() => {
    return layout.edges.map((e) => {
      const from = positionById.get(e.fromId);
      const to = positionById.get(e.toId);
      if (!from || !to) return { ...e, d: '' };
      const fromMoved = offsetsForRun[`${runDirName}|${e.fromId}`];
      const toMoved = offsetsForRun[`${runDirName}|${e.toId}`];
      if (fromMoved || toMoved || e.points.length < 2) {
        return { ...e, d: `M ${from.x} ${from.y} L ${to.x} ${to.y}` };
      }
      let d = `M ${e.points[0].x} ${e.points[0].y}`;
      for (let i = 1; i < e.points.length; i++) {
        d += ` L ${e.points[i].x} ${e.points[i].y}`;
      }
      return { ...e, d };
    });
  }, [layout.edges, positionById, offsetsForRun, runDirName]);

  // ----- Drag state ----------------------------------------------
  const dragRef = useRef<DragState | null>(null);
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dxScreen = e.clientX - drag.startScreenX;
      const dyScreen = e.clientY - drag.startScreenY;
      if (
        !drag.promoted &&
        Math.hypot(dxScreen, dyScreen) >= DRAG_THRESHOLD_PX
      ) {
        drag.promoted = true;
        document.body.style.cursor = 'grabbing';
      }
      if (!drag.promoted) return;
      const scale = viewportRef.current.scale;
      setOffset(runDirName, drag.nodeId, {
        dx: drag.baseDx + dxScreen / scale,
        dy: drag.baseDy + dyScreen / scale,
      });
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [runDirName, setOffset]);

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const off = getOffset(runDirName, nodeId);
      dragRef.current = {
        nodeId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        baseDx: off.dx,
        baseDy: off.dy,
        promoted: false,
      };
    },
    [getOffset, runDirName],
  );

  const onCardClick = useCallback(
    (id: string) => {
      const wasDrag = dragRef.current === null && lastPromotedRef.current;
      lastPromotedRef.current = false;
      if (wasDrag) return;
      onNodeClick(id);
    },
    [onNodeClick],
  );

  const lastPromotedRef = useRef(false);
  useEffect(() => {
    const onUp = () => {
      lastPromotedRef.current = dragRef.current?.promoted ?? false;
    };
    window.addEventListener('pointerup', onUp, true);
    return () => window.removeEventListener('pointerup', onUp, true);
  }, []);

  // ----- Background pan ------------------------------------------
  const onContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0 || e.button === 1) {
        beginPan(e.clientX, e.clientY);
        if (e.button === 0) {
          panStartRef.current = { x: e.clientX, y: e.clientY };
        }
      }
    },
    [beginPan],
  );

  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const onContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const start = panStartRef.current;
      panStartRef.current = null;
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved < DRAG_THRESHOLD_PX) onCanvasClick?.();
    },
    [onCanvasClick],
  );

  // ----- Filtering / dimming logic --------------------------------
  // Sprint-15: with accordion handling structural visibility, dim is
  // now purely for search results — selection-based dimming is
  // redundant because the accordion already shows only the relevant
  // path. Selected card is still highlighted via its own CSS class.
  const dimmedCardIds = useMemo(() => {
    const dim = new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      for (const ln of layout.nodes) {
        const node = tree.nodes[ln.id];
        const hay = (node.title + ' ' + (node.body ?? '')).toLowerCase();
        if (!hay.includes(q)) dim.add(ln.id);
      }
    }
    return dim;
  }, [searchQuery, layout.nodes, tree.nodes]);

  // ----- Stub-badge positions -------------------------------------
  // For each cross-link with stubTargetId, compute a screen position
  // for the badge — just outside the visible ancestor card on the
  // side facing the source. Placement is cheap math; the SVG <g>
  // inside the world-transform handles zoom/pan automatically.
  const stubBadges = useMemo(() => {
    if (!showCrossLinks) return [];
    type Badge = {
      key: string;
      x: number;
      y: number;
      edgeType: EdgeType;
      count: number;
      targetId: string;
    };
    // Group by (toId, edgeType, targetId) for count badges when the
    // same hidden target receives multiple cross-links from one
    // ancestor — keeps the canvas readable.
    const groups = new Map<string, Badge>();
    for (const xl of layout.crossLinks) {
      if (!xl.stubTargetId) continue;
      const from = positionById.get(xl.fromId);
      const to = positionById.get(xl.toId);
      if (!from || !to) continue;
      // Place the badge ~10px outside the target card on the side
      // facing the source.
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const len = Math.hypot(dx, dy) || 1;
      const offset = (to.width / 2) + 12;
      const bx = to.x + (dx / len) * offset;
      const by = to.y + (dy / len) * offset;
      const key = `${xl.toId}|${xl.edgeType}|${xl.stubTargetId}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          key,
          x: bx,
          y: by,
          edgeType: xl.edgeType,
          count: 1,
          targetId: xl.stubTargetId,
        });
      }
    }
    return Array.from(groups.values());
  }, [layout.crossLinks, positionById, showCrossLinks]);

  // ----- Render ---------------------------------------------------
  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
  const cursor = isPanning() ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      className="tree-canvas"
      onPointerDown={onContainerPointerDown}
      onClick={onContainerClick}
      style={{ cursor }}
    >
      <svg
        className="tree-canvas__svg"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ transform, transformOrigin: '0 0' }}
      >
        <g className="tree-canvas__spine">
          {spinePaths.map((edge) => (
            <SpineEdge
              key={edge.fromId + '->' + edge.toId}
              d={edge.d}
              dimmed={offPathIds.has(edge.fromId) || offPathIds.has(edge.toId)}
            />
          ))}
        </g>
        {showCrossLinks && (
          <g className="tree-canvas__xlinks">
            {layout.crossLinks.map((xl, i) => (
              <CrossLinkEdge
                key={i + '-' + xl.fromId + '-' + xl.toId + '-' + (xl.stubTargetId ?? '')}
                from={positionById.get(xl.fromId) ?? null}
                to={positionById.get(xl.toId) ?? null}
                edgeType={xl.edgeType}
                isStub={xl.stubTargetId !== null}
              />
            ))}
            {stubBadges.map((b) => (
              <CrossLinkStubBadge
                key={b.key}
                x={b.x}
                y={b.y}
                edgeType={b.edgeType}
                count={b.count}
                onClick={() => onStubBadgeClick(b.targetId)}
              />
            ))}
          </g>
        )}
      </svg>

      <div
        className="tree-canvas__cards"
        style={{
          width: layout.width,
          height: layout.height,
          transform,
          transformOrigin: '0 0',
        }}
      >
        {positionedNodes.map((ln) => {
          const isSelected = ln.id === selectedId;
          const isAncestor = ancestorIds.has(ln.id);
          const isDescendant = descendantIds.has(ln.id);
          const dimmed = dimmedCardIds.has(ln.id);
          const offPath = offPathIds.has(ln.id);
          return (
            <div
              key={ln.id}
              className={
                'tree-canvas__card-slot' +
                (isSelected ? ' tree-canvas__card-slot--selected' : '') +
                (isAncestor ? ' tree-canvas__card-slot--ancestor' : '') +
                (isDescendant ? ' tree-canvas__card-slot--descendant' : '') +
                (dimmed ? ' tree-canvas__card-slot--dimmed' : '') +
                (offPath ? ' tree-canvas__card-slot--off-path' : '')
              }
              style={{
                left: ln.x - ln.width / 2,
                top: ln.y - ln.height / 2,
                width: ln.width,
                height: ln.height,
              }}
              onPointerDown={(e) => onCardPointerDown(e, ln.id)}
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(ln.id);
              }}
            >
              {renderNode(tree.nodes[ln.id])}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

function SpineEdge({ d, dimmed }: { d: string; dimmed: boolean }) {
  if (!d) return null;
  return <path d={d} className={'edge' + (dimmed ? ' edge--dimmed' : '')} fill="none" />;
}

function CrossLinkEdge({
  from,
  to,
  edgeType,
  isStub,
}: {
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
  edgeType: EdgeType;
  isStub: boolean;
}) {
  if (!from || !to) return null;
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const dx = x2 - x1;
  const sweep = Math.sign(dx) * Math.max(40, Math.abs(dx) * 0.25);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - sweep;
  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  return (
    <g className={`xlink xlink--${edgeType}${isStub ? ' xlink--stub' : ''}`}>
      <path d={d} className="xlink__line" fill="none" />
      {!isStub && (
        <text x={cx} y={cy} className="xlink__label" textAnchor="middle">
          {edgeType}
        </text>
      )}
    </g>
  );
}
