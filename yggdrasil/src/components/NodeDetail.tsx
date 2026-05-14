/**
 * NodeDetail — the right-side panel that opens when a node is selected.
 *
 * Shows the full node payload in a readable form: title, body,
 * key_question, key_data (full table form), inversion, type-specific
 * fields, cross-link list, canonical_id, score breakdown.
 */

import type { YgNode } from '../api/types';
import { AuditDrawer } from './AuditDrawer';
import './NodeDetail.css';

interface Props {
  node: YgNode;
  score: number | null;
}

const RESERVED_FIELDS = new Set([
  'id',
  'run_id',
  'type',
  'zone',
  'title',
  'body',
  'primary_parent',
  'cross_links',
  'canonical_id',
  'confidence',
  'status',
  'metadata',
  'created_at',
  'expanded_by_prompt_version',
  'key_question',
  'key_data',
  'inversion',
  // Sprint 9
  'role',
  'decomposition_audit',
  'breaks',
]);

export function NodeDetail({ node, score }: Props) {
  // Type-specific fields = anything on the node not in the reserved set.
  const typeSpecific = Object.entries(node).filter(
    ([k, v]) => !RESERVED_FIELDS.has(k) && v !== null && v !== undefined,
  );

  return (
    <div className="node-detail">
      <header className="node-detail__head">
        <span className={`node-detail__type node-detail__type--${node.type}`}>
          {node.type.replaceAll('_', ' ').toUpperCase()}
        </span>
        <span className={`node-detail__zone node-detail__zone--${node.zone}`}>
          {node.zone.toUpperCase()}
        </span>
        {node.role && (
          <span className="node-detail__role" title={`structural role: ${node.role}`}>
            {node.role}
          </span>
        )}
        <span className="node-detail__status">{node.status}</span>
      </header>

      <h2 className="node-detail__title">{node.title}</h2>

      {node.decomposition_audit && node.decomposition_audit.length > 0 && (
        <AuditDrawer audit={node.decomposition_audit} />
      )}

      {node.breaks && node.breaks.length > 0 && (
        <Section label="BREAKS (scenario kills these Pillar-1 nodes)" tone="down">
          <ul className="node-detail__xlinks">
            {node.breaks.map((bid) => (
              <li key={bid} className="node-detail__xlink node-detail__xlink--refutes">
                <span className="node-detail__xlink-type">refutes</span>
                <span className="node-detail__xlink-target">→ {bid.slice(0, 12)}…</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {node.key_question && (
        <Section label="KEY QUESTION">
          <div className="node-detail__kq">{node.key_question}</div>
        </Section>
      )}

      {node.inversion && (
        <Section label="INVERSION (KILL CONDITION)" tone="down">
          <div className="node-detail__inv">{node.inversion}</div>
        </Section>
      )}

      {node.key_data.length > 0 && (
        <Section label="KEY DATA">
          <table className="node-detail__data">
            <thead>
              <tr>
                <th>label</th>
                <th>current</th>
                <th>projected</th>
                <th>dir</th>
              </tr>
            </thead>
            <tbody>
              {node.key_data.map((kd) => (
                <tr key={kd.label}>
                  <td>{kd.label}</td>
                  <td>{kd.value}</td>
                  <td>{kd.projected ?? '—'}</td>
                  <td
                    className={
                      kd.direction
                        ? `node-detail__dir node-detail__dir--${kd.direction}`
                        : ''
                    }
                  >
                    {kd.direction ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {node.body && (
        <Section label="BODY">
          <div className="node-detail__body">{node.body}</div>
        </Section>
      )}

      {typeSpecific.length > 0 && (
        <Section label="TYPE-SPECIFIC">
          <dl className="node-detail__kv">
            {typeSpecific.map(([k, v]) => (
              <div key={k} className="node-detail__kv-row">
                <dt>{k}</dt>
                <dd>{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section label="META">
        <dl className="node-detail__kv">
          <KvRow label="confidence" value={node.confidence.toFixed(2)} />
          {score !== null && (
            <KvRow label="score" value={score.toFixed(2)} />
          )}
          {node.canonical_id && (
            <KvRow label="canonical_id" value={node.canonical_id} mono />
          )}
          <KvRow label="id" value={node.id.slice(0, 12)} mono />
          {node.expanded_by_prompt_version && (
            <KvRow
              label="prompt_version"
              value={node.expanded_by_prompt_version}
              mono
            />
          )}
        </dl>
      </Section>

      {node.cross_links.length > 0 && (
        <Section label={`CROSS-LINKS (${node.cross_links.length})`}>
          <ul className="node-detail__xlinks">
            {node.cross_links.map((xl) => (
              <li
                key={xl.edge_type + ':' + xl.target_id}
                className={`node-detail__xlink node-detail__xlink--${xl.edge_type}`}
              >
                <span className="node-detail__xlink-type">{xl.edge_type}</span>
                <span className="node-detail__xlink-target">
                  → {xl.target_id.slice(0, 12)}…
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: 'down';
  children: React.ReactNode;
}) {
  return (
    <section className={'node-detail__section' + (tone ? ` node-detail__section--${tone}` : '')}>
      <div className="node-detail__section-label">{label}</div>
      {children}
    </section>
  );
}

function KvRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="node-detail__kv-row">
      <dt>{label}</dt>
      <dd className={mono ? 'node-detail__kv-mono' : ''}>{value}</dd>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
