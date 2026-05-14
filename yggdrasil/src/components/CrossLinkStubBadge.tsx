/**
 * CrossLinkStubBadge — small clickable chip drawn at the tip of a
 * cross-link edge whose true target is hidden inside a collapsed
 * subtree.
 *
 * The accordion model hides most nodes by default. A `refutes` edge
 * from Pillar-2 stress -> BBCA-iim_margin can't terminate at the real
 * target if BBCA-iim_margin is collapsed inside its parent. Instead
 * the edge ends at the nearest visible ancestor (the candidate root),
 * and THIS badge sits at that tip showing "refutes →" so the analyst
 * can:
 *   (a) see the connection exists, even when the destination is hidden
 *   (b) click the badge to auto-expand the path to the real target.
 *
 * Rendered as an SVG <g> so it lives in the same coord system as the
 * cross-link path. Pointer events are enabled on the chip; the parent
 * <g> is otherwise pointer-events: none.
 */

import type { EdgeType } from '../api/types';

interface Props {
  /** Position in world coords (edge tip — usually just outside the
   * ancestor card's edge). */
  x: number;
  y: number;
  edgeType: EdgeType;
  /** When >1, abbreviate to ``refutes ×N →`` so we don't stack badges. */
  count?: number;
  onClick: () => void;
}

/** Compact label per edge type. Keeps the chip width manageable. */
const LABEL: Record<EdgeType, string> = {
  supports: 'supports',
  refutes: 'refutes',
  depends_on: 'depends on',
  alternative_to: 'alt to',
  requires_evidence_from: 'needs',
  transmits_to: 'transmits',
  triggers: 'triggers',
};

export function CrossLinkStubBadge({ x, y, edgeType, count = 1, onClick }: Props) {
  const label = `${LABEL[edgeType] ?? edgeType}${count > 1 ? ` ×${count}` : ''} →`;
  // Approximate width — SVG text auto-sizes but the rect needs a hint.
  const w = Math.max(56, label.length * 6.2);
  const h = 16;
  return (
    <g
      className={`xlink-stub xlink-stub--${edgeType}`}
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
    >
      <rect
        className="xlink-stub__bg"
        x={0}
        y={0}
        width={w}
        height={h}
        rx={2}
      />
      <text
        className="xlink-stub__label"
        x={w / 2}
        y={h / 2 + 3.5}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}
