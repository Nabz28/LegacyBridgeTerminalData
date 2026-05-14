/**
 * Tree-navigation helpers used by keyboard handlers.
 *
 * All functions are pure: take the tree + a currentId and return
 * the next id (or null if no such neighbour exists). Sibling order
 * uses the natural object-iteration order of ``tree.nodes``, which
 * for our writes is the order the orchestrator emitted them.
 */

import type { Tree, YgNode } from '../api/types';

export function childrenOf(tree: Tree, parentId: string): YgNode[] {
  const out: YgNode[] = [];
  for (const n of Object.values(tree.nodes)) {
    if (n.primary_parent === parentId) out.push(n);
  }
  return out;
}

export function descendantsOf(tree: Tree, rootId: string): Set<string> {
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const c of childrenOf(tree, id)) {
      if (!out.has(c.id)) {
        out.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return out;
}

export function ancestorsOf(tree: Tree, nodeId: string): Set<string> {
  const out = new Set<string>();
  let cur = tree.nodes[nodeId];
  while (cur && cur.primary_parent) {
    const p = tree.nodes[cur.primary_parent];
    if (!p) break;
    out.add(p.id);
    cur = p;
  }
  return out;
}

export function parentOf(tree: Tree, nodeId: string): string | null {
  const n = tree.nodes[nodeId];
  return n?.primary_parent ?? null;
}

export function firstChildOf(tree: Tree, nodeId: string): string | null {
  const kids = childrenOf(tree, nodeId);
  return kids[0]?.id ?? null;
}

export function siblingDelta(
  tree: Tree,
  nodeId: string,
  delta: 1 | -1,
): string | null {
  const cur = tree.nodes[nodeId];
  if (!cur) return null;
  const parentId = cur.primary_parent;
  const siblings = parentId
    ? childrenOf(tree, parentId)
    : Object.values(tree.nodes).filter((n) => n.primary_parent === null);
  const idx = siblings.findIndex((n) => n.id === nodeId);
  if (idx === -1) return null;
  const next = siblings[idx + delta];
  return next?.id ?? null;
}

/** First node in the tree by iteration order — used as the
 * fallback "selected" when keyboard nav fires with nothing selected. */
export function rootCandidate(tree: Tree): string | null {
  for (const n of Object.values(tree.nodes)) {
    if (n.primary_parent === null) return n.id;
  }
  // Tree has no explicit root — fall back to first node.
  const first = Object.values(tree.nodes)[0];
  return first?.id ?? null;
}
