/**
 * AuditDrawer — renders a node's ``decomposition_audit`` as a
 * colour-coded table inside the NodeDetail panel.
 *
 * Shows at a glance what the model thought through:
 *   - included (green)  — material; produced a child
 *   - merged   (blue)   — material but folded into another child
 *   - excluded (red)    — considered and rejected, with the reason
 *
 * For nodes without an audit, returns null so the panel renders
 * uncluttered.
 */

import type { DimensionVerdict } from '../api/types';
import './AuditDrawer.css';

interface Props {
  audit: DimensionVerdict[];
}

export function AuditDrawer({ audit }: Props) {
  if (!audit || audit.length === 0) return null;

  const counts = {
    included: audit.filter((a) => a.verdict === 'included').length,
    merged: audit.filter((a) => a.verdict === 'merged').length,
    excluded: audit.filter((a) => a.verdict === 'excluded').length,
  };

  return (
    <section className="audit-drawer">
      <header className="audit-drawer__head">
        <span className="audit-drawer__label">DECOMPOSITION AUDIT</span>
        <span className="audit-drawer__counts">
          <span className="audit-drawer__count audit-drawer__count--included">
            ●{counts.included}
          </span>
          <span className="audit-drawer__count audit-drawer__count--merged">
            ●{counts.merged}
          </span>
          <span className="audit-drawer__count audit-drawer__count--excluded">
            ●{counts.excluded}
          </span>
        </span>
      </header>
      <table className="audit-drawer__table">
        <thead>
          <tr>
            <th>dimension</th>
            <th>verdict</th>
            <th>reason</th>
          </tr>
        </thead>
        <tbody>
          {audit.map((entry) => (
            <tr
              key={`${entry.dimension}-${entry.verdict}`}
              className={`audit-drawer__row audit-drawer__row--${entry.verdict}`}
            >
              <td className="audit-drawer__dim">{entry.dimension}</td>
              <td className="audit-drawer__verdict">{entry.verdict}</td>
              <td className="audit-drawer__reason">{entry.reason ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
