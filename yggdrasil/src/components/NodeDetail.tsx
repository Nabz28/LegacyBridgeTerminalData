import { NODE_TYPE_LABELS, ZONE_COLORS } from "../lib/colors";
import type { BaseNodeShape } from "../lib/types";

interface Props {
  node: BaseNodeShape;
  onSelectEntity: (canonicalId: string) => void;
}

/**
 * Sidebar panel showing the selected node's full content + metadata.
 *
 * Type-specific fields (``horizon``, ``event_date``, ``cadence``,
 * etc.) are rendered generically — anything on the node that is NOT
 * a base-shape field shows up under "Type-specific". This means the
 * viewer keeps working when the schema grows new type-specific
 * fields without per-type updates here.
 */
export function NodeDetail({ node, onSelectEntity }: Props) {
  const baseKeys = new Set([
    "id",
    "run_id",
    "type",
    "zone",
    "title",
    "body",
    "primary_parent",
    "cross_links",
    "canonical_id",
    "confidence",
    "status",
    "metadata",
    "created_at",
    "expanded_by_prompt_version",
  ]);
  const typeSpecificEntries = Object.entries(node).filter(
    ([key, value]) => !baseKeys.has(key) && value !== null && value !== undefined,
  );

  return (
    <aside className="node-detail">
      <header className="node-detail__header">
        <span
          className="node-detail__zone-pill"
          style={{ background: ZONE_COLORS[node.zone] }}
        >
          {node.zone}
        </span>
        <span className="node-detail__type">{NODE_TYPE_LABELS[node.type]}</span>
        <span
          className="node-detail__status"
          data-status={node.status}
        >
          {node.status}
        </span>
      </header>

      <h2 className="node-detail__title">{node.title}</h2>

      {node.body && <p className="node-detail__body">{node.body}</p>}

      <dl className="node-detail__meta">
        <div>
          <dt>Confidence</dt>
          <dd>{node.confidence.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{node.created_at.replace("T", " ").replace("Z", "")}</dd>
        </div>
        {node.canonical_id && (
          <div>
            <dt>Canonical entity</dt>
            <dd>
              <button
                type="button"
                className="link-button"
                onClick={() => onSelectEntity(node.canonical_id!)}
              >
                {node.canonical_id}
              </button>
            </dd>
          </div>
        )}
        {node.expanded_by_prompt_version && (
          <div>
            <dt>Prompt version</dt>
            <dd>{node.expanded_by_prompt_version}</dd>
          </div>
        )}
      </dl>

      {typeSpecificEntries.length > 0 && (
        <section className="node-detail__type-specific">
          <h3>Type-specific</h3>
          <dl>
            {typeSpecificEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {node.cross_links.length > 0 && (
        <section className="node-detail__cross-links">
          <h3>Cross-links ({node.cross_links.length})</h3>
          <ul>
            {node.cross_links.map((link, i) => (
              <li key={i}>
                <strong>{link.edge_type}</strong> →{" "}
                <code>{link.target_id.slice(0, 8)}…</code>
                {link.metadata && Object.keys(link.metadata).length > 0 && (
                  <span className="cross-link__meta">
                    {" "}
                    ({JSON.stringify(link.metadata)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
