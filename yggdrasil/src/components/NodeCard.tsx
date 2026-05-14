/**
 * NodeCard — the dense in-tree node card.
 *
 * Layout (top-down):
 *   - HEADER: type badge · zone tag · confidence chip
 *   - TITLE: 1–2 lines, ellipsized
 *   - KEY QUESTION: italic, single line, prefixed with "Q:"
 *   - KEY DATA: up to 3 chips with current → projected
 *   - FOOTER: child count · score (optional)
 *
 * Designed to fit ~240×140 px. Everything beyond that lives in the
 * NodeDetail side panel.
 */

import type { YgNode } from '../api/types';
import './NodeCard.css';

interface Props {
  node: YgNode;
  selected: boolean;
  isAncestor: boolean;
  heatScore: number | null;
  onClick: () => void;
}

const ZONE_LABEL: Record<string, string> = {
  macro: 'MACRO',
  industry: 'INDUSTRY',
  equity: 'EQUITY',
};

export function NodeCard({ node, selected, isAncestor, heatScore, onClick }: Props) {
  const heatStyle =
    heatScore !== null
      ? { backgroundColor: heatBg(heatScore) }
      : undefined;

  const className =
    'node-card' +
    ` node-card--type-${node.type}` +
    ` node-card--zone-${node.zone}` +
    (selected ? ' node-card--selected' : '') +
    (isAncestor ? ' node-card--ancestor' : '');

  return (
    // The slot wrapping this card handles pointer events (drag + click)
    // so we use a plain div, not a button — a button would intercept
    // the pointerdown and break drag-vs-click discrimination.
    <div className={className} style={heatStyle} onClick={onClick}>
      <header className="node-card__header">
        <span className={`node-card__type node-card__type--${node.type}`}>
          {node.type.replaceAll('_', ' ').toUpperCase()}
        </span>
        <span className={`node-card__zone node-card__zone--${node.zone}`}>
          {ZONE_LABEL[node.zone] ?? node.zone.toUpperCase()}
        </span>
        <span
          className="node-card__conf"
          title={`confidence ${node.confidence.toFixed(2)}`}
        >
          {node.confidence.toFixed(2)}
        </span>
      </header>
      <div className="node-card__title">{node.title}</div>
      {node.key_question && (
        <div className="node-card__kq" title={node.key_question}>
          <span className="node-card__kq-label">Q:</span> {node.key_question}
        </div>
      )}
      {node.key_data.length > 0 && (
        <div className="node-card__chips">
          {node.key_data.slice(0, 3).map((kd) => (
            <span
              key={kd.label}
              className={
                'node-card__chip' +
                (kd.direction ? ` node-card__chip--${kd.direction}` : '')
              }
              title={chipTitle(kd)}
            >
              <span className="node-card__chip-label">{kd.label}</span>
              <span className="node-card__chip-value">
                {kd.value}
                {kd.projected ? (
                  <>
                    <span className="node-card__chip-arrow">→</span>
                    {kd.projected}
                  </>
                ) : null}
              </span>
            </span>
          ))}
        </div>
      )}
      {node.inversion && (
        <div className="node-card__inv" title={node.inversion}>
          ✕ {node.inversion}
        </div>
      )}
    </div>
  );
}

function chipTitle(kd: { label: string; value: string; projected?: string | null }): string {
  return kd.projected
    ? `${kd.label}: ${kd.value} → ${kd.projected}`
    : `${kd.label}: ${kd.value}`;
}

/** Heatmap colour for an overall score in [0,10]. */
function heatBg(score: number): string {
  // Map 0..10 onto red → mid → green using HSL interpolation.
  const t = Math.max(0, Math.min(1, score / 10));
  if (t < 0.5) {
    // 0 → 0.5: red → mid
    const k = t / 0.5;
    return `oklch(${22 + 6 * k}% ${0.16 - 0.06 * k} ${20 + 240 * k})`;
  }
  // 0.5 → 1: mid → green
  const k = (t - 0.5) / 0.5;
  return `oklch(${28 + 14 * k}% ${0.10 + 0.10 * k} ${260 - 120 * k})`;
}
