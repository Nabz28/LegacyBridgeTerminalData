/**
 * Progressive-accordion expansion state, per (run, level).
 *
 * Mental model — like Windows Explorer with a strict "only one folder
 * open per level" rule:
 *
 *   - First paint shows ONLY the root + 4 pillars (depth-1 expanded).
 *   - Clicking a card EXPANDS its direct children (depth-N → N+1).
 *   - Clicking a SIBLING at the same level auto-collapses the prior
 *     sibling's open subtree (mutex per level).
 *   - Clicking the same card again toggles it shut.
 *
 * The store records the FULL chain of currently-open node ids
 * (`expandedPath: string[]`). Mutex enforcement happens at write time:
 * when you ask to expand a node, we trim any previously-open node at
 * its level OR deeper out of the chain, then append the new id.
 *
 * Visible nodes = the root + every node whose parent is in the
 * expanded path. The store exposes a derived ``isExpanded`` and a
 * ``visibleIds(tree)`` helper for the layout to consume.
 *
 * Persistence: localStorage, keyed by runDirName. Reload restores the
 * exact drilled-in spot. See the v4-flow grilling for the design
 * rationale.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tree } from '../api/types';

interface AccordionState {
  /** Map of runDirName -> ordered list of expanded ancestor ids (the path). */
  expandedByRun: Record<string, string[]>;

  /** True if a specific node is currently expanded (its children are visible). */
  isExpanded: (runDirName: string, nodeId: string) => boolean;

  /** Toggle expand/collapse on a node. Enforces mutex at the node's level. */
  toggle: (runDirName: string, tree: Tree, nodeId: string) => void;

  /** Force-expand a node (no-op if already expanded). Mutex-enforced. */
  expand: (runDirName: string, tree: Tree, nodeId: string) => void;

  /** Force-collapse a node — drops it + everything deeper from the chain. */
  collapse: (runDirName: string, nodeId: string) => void;

  /** Expand an entire ancestor path (used by jumps / cross-link drill-in /
   * search-result selection). Each id in the chain becomes expanded in order;
   * mutex is enforced at each level. */
  expandPath: (runDirName: string, tree: Tree, path: string[]) => void;

  /** Walk back one level — collapses the deepest currently-open node.
   * Returns the id that was collapsed, or null when the chain is already
   * at first-paint depth. Bound to Esc in RunTab. */
  walkBack: (runDirName: string) => string | null;

  /** Reset to first-paint (no nodes expanded). Toolbar "Collapse All". */
  collapseAll: (runDirName: string) => void;

  /** Bulk-set the expanded path to an arbitrary id list — bypasses the
   * mutex-per-level rule. Used by the toolbar presets ("Expand all",
   * "Show all macro/industry/equity") to break out of the strict
   * accordion when the analyst wants a panoramic view of a zone. */
  setExpandedSet: (runDirName: string, ids: string[]) => void;

  /** Set of node ids that should be VISIBLE for the given run.
   * Visible = (a) the root, (b) any node whose primary_parent is in the
   * expanded path, (c) the expanded path itself (always visible to keep
   * the drill chain intact). */
  visibleIds: (runDirName: string, tree: Tree) => Set<string>;

  /** Set of VISIBLE node ids that are NOT on the currently-expanded
   * branch (i.e., siblings of any node in the expanded chain). The
   * canvas fades these so the focused branch stands out. The
   * newly-revealed children of the deepest expanded node are NOT in
   * this set — they're the new focus layer. */
  offPathIds: (runDirName: string, tree: Tree) => Set<string>;
}

/** Internal helper — depth of a node in the spine tree (root = 0). */
function depthOf(tree: Tree, nodeId: string): number {
  let depth = 0;
  let cur: string | null = nodeId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const n: { primary_parent: string | null } | undefined = tree.nodes[cur];
    if (!n || !n.primary_parent) break;
    cur = n.primary_parent;
    depth += 1;
    if (depth > 100) break; // pathological cycle guard
  }
  return depth;
}

/** Internal helper — return the ancestor chain root → ... → node (exclusive
 * of node itself). Used by expandPath. */
function ancestorChainOf(tree: Tree, nodeId: string): string[] {
  const chain: string[] = [];
  let cur: string | null = tree.nodes[nodeId]?.primary_parent ?? null;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    chain.unshift(cur);
    cur = tree.nodes[cur]?.primary_parent ?? null;
    if (chain.length > 100) break;
  }
  return chain;
}

/** Trim ``path`` so it contains no entries at depth >= ``cutDepth``. The
 * mutex rule: opening a new node at depth N invalidates everything at
 * depth N or deeper in the prior path. */
function trimPathAtDepth(
  tree: Tree,
  path: string[],
  cutDepth: number,
): string[] {
  return path.filter((id) => depthOf(tree, id) < cutDepth);
}

export const useAccordionStore = create<AccordionState>()(
  persist(
    (set, get) => ({
      expandedByRun: {},

      isExpanded: (runDirName, nodeId) => {
        return (get().expandedByRun[runDirName] ?? []).includes(nodeId);
      },

      toggle: (runDirName, tree, nodeId) => {
        const path = get().expandedByRun[runDirName] ?? [];
        if (path.includes(nodeId)) {
          get().collapse(runDirName, nodeId);
        } else {
          get().expand(runDirName, tree, nodeId);
        }
      },

      expand: (runDirName, tree, nodeId) =>
        set((s) => {
          const path = s.expandedByRun[runDirName] ?? [];
          if (path.includes(nodeId)) return s;
          const depth = depthOf(tree, nodeId);
          // Mutex: drop anything at this depth OR deeper from the prior path.
          const trimmed = trimPathAtDepth(tree, path, depth);
          // Also ensure all ancestors of nodeId are expanded — clicking on a
          // node that's mounted-but-not-yet-clicked needs to surface its kids
          // and keep the ancestor chain consistent.
          const ancestors = ancestorChainOf(tree, nodeId);
          const merged = [...trimmed];
          for (const aid of ancestors) {
            if (!merged.includes(aid)) merged.push(aid);
          }
          merged.push(nodeId);
          return {
            expandedByRun: { ...s.expandedByRun, [runDirName]: merged },
          };
        }),

      collapse: (runDirName, nodeId) =>
        set((s) => {
          const path = s.expandedByRun[runDirName] ?? [];
          const idx = path.indexOf(nodeId);
          if (idx < 0) return s;
          // Drop the node and everything after it in the path.
          const next = path.slice(0, idx);
          return {
            expandedByRun: { ...s.expandedByRun, [runDirName]: next },
          };
        }),

      expandPath: (runDirName, tree, targetPath) =>
        set((s) => {
          if (targetPath.length === 0) return s;
          // Mutex-enforce each step: build the new path by sequentially
          // applying expand semantics for each id in targetPath.
          // Path itself must already be ancestor-ordered (root → ... → leaf).
          let next: string[] = [];
          for (const id of targetPath) {
            if (next.includes(id)) continue;
            const depth = depthOf(tree, id);
            next = trimPathAtDepth(tree, next, depth);
            next.push(id);
          }
          return {
            expandedByRun: { ...s.expandedByRun, [runDirName]: next },
          };
        }),

      walkBack: (runDirName) => {
        const path = get().expandedByRun[runDirName] ?? [];
        if (path.length === 0) return null;
        const last = path[path.length - 1];
        set((s) => ({
          expandedByRun: {
            ...s.expandedByRun,
            [runDirName]: path.slice(0, -1),
          },
        }));
        return last;
      },

      collapseAll: (runDirName) =>
        set((s) => {
          const next = { ...s.expandedByRun };
          delete next[runDirName];
          return { expandedByRun: next };
        }),

      setExpandedSet: (runDirName, ids) =>
        set((s) => {
          // Dedupe + preserve insertion order. The mutex rules are
          // ignored here BY DESIGN — this is the "panoramic" escape
          // hatch for toolbar presets.
          const seen = new Set<string>();
          const next: string[] = [];
          for (const id of ids) {
            if (!seen.has(id)) {
              seen.add(id);
              next.push(id);
            }
          }
          return {
            expandedByRun: { ...s.expandedByRun, [runDirName]: next },
          };
        }),

      visibleIds: (runDirName, tree) => {
        const expanded = new Set(get().expandedByRun[runDirName] ?? []);
        const visible = new Set<string>();
        // Find root(s) — nodes with no parent in the tree.
        for (const node of Object.values(tree.nodes)) {
          if (!node.primary_parent || !tree.nodes[node.primary_parent]) {
            visible.add(node.id);
          }
        }
        // Any node whose parent is expanded is visible.
        for (const node of Object.values(tree.nodes)) {
          if (node.primary_parent && expanded.has(node.primary_parent)) {
            visible.add(node.id);
          }
        }
        // Nodes in the expanded path are always visible (already covered by
        // the parent-rule above, but be defensive for partial-path edits).
        for (const id of expanded) visible.add(id);
        return visible;
      },

      offPathIds: (runDirName, tree) => {
        // The expanded chain is the spine of the current focus. For each
        // node in the chain, all of its SIBLINGS (other children of the
        // same parent) are "off-path" — they're visible because the parent
        // is expanded, but they aren't part of the branch the analyst is
        // drilling. Fade them.
        //
        // The newly-revealed children of the deepest expanded node are NOT
        // off-path — they're the new focus layer. Siblings of those
        // children are also not off-path (none of them are in the chain).
        const path = get().expandedByRun[runDirName] ?? [];
        const offPath = new Set<string>();
        for (const id of path) {
          const node = tree.nodes[id];
          if (!node || !node.primary_parent) continue;
          const parentId = node.primary_parent;
          for (const sibling of Object.values(tree.nodes)) {
            if (sibling.primary_parent === parentId && sibling.id !== id) {
              offPath.add(sibling.id);
            }
          }
        }
        return offPath;
      },
    }),
    { name: 'yggdrasil.accordion.v1' },
  ),
);
