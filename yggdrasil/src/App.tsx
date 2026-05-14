import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchIndex, fetchTree, SnapshotError } from "./lib/api";
import type { Tree, ViewerIndex } from "./lib/types";

import { CrossLinkOverlay } from "./components/CrossLinkOverlay";
import { EntityReferences } from "./components/EntityReferences";
import { NodeDetail } from "./components/NodeDetail";
import { RunPicker } from "./components/RunPicker";
import { SearchBar } from "./components/SearchBar";
import { TreeView } from "./components/TreeView";

void CrossLinkOverlay; // keep for tree-shaker — TreeView imports it

type Loadable<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; value: T }
  | { kind: "error"; message: string };

export function App() {
  const [index, setIndex] = useState<Loadable<ViewerIndex>>({ kind: "idle" });
  const [tree, setTree] = useState<Loadable<Tree>>({ kind: "idle" });
  const [selectedRunDir, setSelectedRunDir] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [showCrossLinks, setShowCrossLinks] = useState(true);
  const [search, setSearch] = useState("");

  // ---- Bootstrap: load the index.json snapshot once. -----------------
  useEffect(() => {
    setIndex({ kind: "loading" });
    fetchIndex()
      .then((value) => {
        setIndex({ kind: "ready", value });
        // Auto-pick the first valid run.
        const firstValid = value.runs.find(
          (r) => r.run_id && r.error == null,
        );
        if (firstValid) setSelectedRunDir(firstValid.run_dir_name);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof SnapshotError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        setIndex({ kind: "error", message });
      });
  }, []);

  // ---- Load the selected run's tree. ---------------------------------
  useEffect(() => {
    if (index.kind !== "ready" || !selectedRunDir) {
      setTree({ kind: "idle" });
      return;
    }
    const run = index.value.runs.find((r) => r.run_dir_name === selectedRunDir);
    if (!run || !run.tree_path) {
      setTree({ kind: "error", message: `Run ${selectedRunDir} has no tree.` });
      return;
    }
    setTree({ kind: "loading" });
    setSelectedNodeId(null);
    let cancelled = false;
    fetchTree(run.tree_path)
      .then((value) => {
        if (cancelled) return;
        setTree({ kind: "ready", value });
        // If a cross-run jump asked for a specific node, land on it now
        // that the tree is actually loaded — no setTimeout race.
        if (pendingNodeId && value.nodes[pendingNodeId]) {
          setSelectedNodeId(pendingNodeId);
        }
        setPendingNodeId(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTree({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      // Run-switch races: ignore the previous tree fetch if it returns
      // after we've already moved on.
      cancelled = true;
    };
  }, [index, selectedRunDir, pendingNodeId]);

  // ---- Search highlighting -------------------------------------------
  const highlightedNodeIds = useMemo(() => {
    if (tree.kind !== "ready" || !search.trim()) return new Set<string>();
    const needle = search.toLowerCase();
    const ids = new Set<string>();
    for (const node of Object.values(tree.value.nodes)) {
      if (node.title.toLowerCase().includes(needle)) ids.add(node.id);
      else if (node.body.toLowerCase().includes(needle)) ids.add(node.id);
    }
    return ids;
  }, [tree, search]);

  const selectedNode =
    tree.kind === "ready" && selectedNodeId
      ? tree.value.nodes[selectedNodeId]
      : null;

  const handleJumpToRun = useCallback(
    (runDirName: string, nodeId: string) => {
      // Stash the node id; the tree-load effect consumes it after the
      // fresh tree's fetch resolves. Avoids the setTimeout race where
      // the node id was set while the tree was still loading.
      setSelectedEntityId(null);
      setPendingNodeId(nodeId);
      setSelectedRunDir(runDirName);
    },
    [],
  );

  // ---- Render ---------------------------------------------------------
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Yggdrasil Viewer</h1>
        {index.kind === "ready" && (
          <div className="app__meta">
            <span>{index.value.runs.length} runs</span>
            <span> · </span>
            <span>{index.value.entities.length} entities</span>
            <span> · </span>
            <span>schema v{index.value.schema_version}</span>
          </div>
        )}
      </header>

      {index.kind === "loading" && (
        <div className="app__status">Loading snapshot…</div>
      )}

      {index.kind === "error" && (
        <div className="app__status app__status--error">
          <strong>Failed to load snapshot.</strong>
          <p>{index.message}</p>
          <p>
            Run <code>python -m yggdrasil viz dump</code> to regenerate, then
            reload this page.
          </p>
        </div>
      )}

      {index.kind === "ready" && (
        <>
          <div className="app__controls">
            <RunPicker
              runs={index.value.runs}
              selectedRunDir={selectedRunDir}
              onSelect={(name) => {
                setSelectedEntityId(null);
                setSelectedRunDir(name);
              }}
            />
            <SearchBar value={search} onChange={setSearch} />
            <label className="toggle">
              <input
                type="checkbox"
                checked={showCrossLinks}
                onChange={(e) => setShowCrossLinks(e.target.checked)}
              />
              Cross-links
            </label>
          </div>

          <main className="app__main">
            <section className="app__tree">
              {tree.kind === "loading" && (
                <div className="app__status">Loading tree…</div>
              )}
              {tree.kind === "error" && (
                <div className="app__status app__status--error">
                  {tree.message}
                </div>
              )}
              {tree.kind === "ready" && (
                <TreeView
                  tree={tree.value}
                  selectedNodeId={selectedNodeId}
                  highlightedNodeIds={highlightedNodeIds}
                  showCrossLinks={showCrossLinks}
                  onSelectNode={(id) => {
                    setSelectedEntityId(null);
                    setSelectedNodeId(id);
                  }}
                />
              )}
            </section>

            <section className="app__sidebar">
              {selectedEntityId ? (
                <EntityReferences
                  canonicalId={selectedEntityId}
                  entities={index.value.entities}
                  links={index.value.links}
                  runs={index.value.runs}
                  onJumpToRun={handleJumpToRun}
                  onClose={() => setSelectedEntityId(null)}
                />
              ) : selectedNode ? (
                <NodeDetail
                  node={selectedNode}
                  onSelectEntity={(cid) => setSelectedEntityId(cid)}
                />
              ) : (
                <div className="placeholder">
                  Click a node in the tree to see its details. Click a
                  canonical-entity id from a node to see all references
                  across runs.
                </div>
              )}
            </section>
          </main>
        </>
      )}
    </div>
  );
}
