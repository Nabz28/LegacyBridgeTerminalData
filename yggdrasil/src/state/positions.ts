/**
 * Per-run, per-node positional offsets.
 *
 * Dagre lays the tree out automatically. Any node the analyst drags
 * gets a `(dx, dy)` offset stored here and applied on top of the
 * dagre position. Persisted in localStorage so the layout the user
 * curated survives reloads.
 *
 * Key is ``{runDirName}|{nodeId}`` — flat, easily prunable when a
 * run is removed.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Offset {
  dx: number;
  dy: number;
}

interface PositionsState {
  /** Flat key map: ``{runDirName}|{nodeId}`` → offset. */
  offsets: Record<string, Offset>;

  /** Look up the offset for one node; zero offset if unset. */
  get: (runDirName: string, nodeId: string) => Offset;

  /** Set / overwrite an offset. */
  set: (runDirName: string, nodeId: string, offset: Offset) => void;

  /** Wipe every offset in a run — used by "reset layout" controls. */
  clearRun: (runDirName: string) => void;
}

const k = (run: string, node: string) => `${run}|${node}`;
const ZERO: Offset = { dx: 0, dy: 0 };

export const usePositionsStore = create<PositionsState>()(
  persist(
    (set, get) => ({
      offsets: {},
      get: (runDirName, nodeId) =>
        get().offsets[k(runDirName, nodeId)] ?? ZERO,
      set: (runDirName, nodeId, offset) =>
        set((s) => ({
          offsets: {
            ...s.offsets,
            [k(runDirName, nodeId)]: offset,
          },
        })),
      clearRun: (runDirName) =>
        set((s) => {
          const prefix = runDirName + '|';
          const next: Record<string, Offset> = {};
          for (const [key, off] of Object.entries(s.offsets)) {
            if (!key.startsWith(prefix)) next[key] = off;
          }
          return { offsets: next };
        }),
    }),
    { name: 'yggdrasil.positions.v1' },
  ),
);
