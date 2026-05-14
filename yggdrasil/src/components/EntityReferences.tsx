import { useMemo } from "react";

import type { EntityIndexEntry, LinkIndexEntry, RunIndexEntry } from "../lib/types";

interface Props {
  canonicalId: string;
  entities: EntityIndexEntry[];
  links: LinkIndexEntry[];
  runs: RunIndexEntry[];
  onJumpToRun: (runDirName: string, nodeId: string) => void;
  onClose: () => void;
}

/**
 * Cross-run "where else has this entity been referenced?" view.
 *
 * Works against the static index — no extra fetches. Groups links by
 * run so the user can scan "this entity appears in 3 runs, 5 nodes
 * total" and click into any specific reference.
 */
export function EntityReferences({
  canonicalId,
  entities,
  links,
  runs,
  onJumpToRun,
  onClose,
}: Props) {
  const entity = useMemo(
    () => entities.find((e) => e.canonical_id === canonicalId),
    [entities, canonicalId],
  );

  const grouped = useMemo(() => {
    const byRun = new Map<string, LinkIndexEntry[]>();
    for (const link of links) {
      if (link.canonical_id !== canonicalId) continue;
      const arr = byRun.get(link.run_id) ?? [];
      arr.push(link);
      byRun.set(link.run_id, arr);
    }
    return byRun;
  }, [links, canonicalId]);

  const runLookup = useMemo(() => {
    const map = new Map<string, RunIndexEntry>();
    for (const run of runs) {
      if (run.run_id) map.set(run.run_id, run);
    }
    return map;
  }, [runs]);

  return (
    <aside className="entity-refs">
      <header className="entity-refs__header">
        <button
          type="button"
          className="link-button"
          onClick={onClose}
          aria-label="Close entity panel"
        >
          ← back
        </button>
        <h2 className="entity-refs__title">
          {entity?.title ?? canonicalId}
        </h2>
      </header>

      <dl className="entity-refs__meta">
        <div>
          <dt>Type</dt>
          <dd>{entity?.type ?? "unknown"}</dd>
        </div>
        <div>
          <dt>Canonical id</dt>
          <dd>
            <code>{canonicalId}</code>
          </dd>
        </div>
        <div>
          <dt>References</dt>
          <dd>
            {entity?.reference_count ?? 0} across{" "}
            {entity?.run_count ?? 0} run(s)
          </dd>
        </div>
      </dl>

      {grouped.size === 0 ? (
        <p className="entity-refs__empty">
          No tree-node links to this entity in the current snapshot.
        </p>
      ) : (
        <ul className="entity-refs__runs">
          {[...grouped.entries()].map(([runId, runLinks]) => {
            const run = runLookup.get(runId);
            const runDirName = run?.run_dir_name;
            return (
              <li key={runId} className="entity-refs__run">
                <h3>
                  {run?.topic ?? runId.slice(0, 12)}
                  {!runDirName && (
                    <span className="entity-refs__missing">
                      {" "}
                      (run not in current snapshot)
                    </span>
                  )}
                </h3>
                <ul>
                  {runLinks.map((link) => (
                    <li key={link.node_id}>
                      {runDirName ? (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => onJumpToRun(runDirName, link.node_id)}
                        >
                          {link.node_type} • {link.zone} •{" "}
                          <code>{link.node_id.slice(0, 8)}</code>
                        </button>
                      ) : (
                        <span
                          className="entity-refs__disabled"
                          title="Run directory not in this snapshot — re-run `yggdrasil viz dump` after restoring the run."
                        >
                          {link.node_type} • {link.zone} •{" "}
                          <code>{link.node_id.slice(0, 8)}</code>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
