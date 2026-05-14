/**
 * Tab state — what tabs are open, which is active, what each tab
 * shows.
 *
 * Tabs persist in localStorage so reload doesn't blow away the
 * analyst's workspace. The store is the single source of truth; UI
 * components subscribe via Zustand selectors.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tab kinds:
 *  - ``home`` — launcher / runs index (Sprint 7)
 *  - ``run`` — single-run tree canvas (Sprint 7)
 *  - ``tasks`` — flat hand-off task list extracted from a run (Sprint 10)
 *
 * Sprint 11+ will add ``compare``, ``leaderboard``, ``entity``.
 */
export type TabKind = 'home' | 'run' | 'tasks';

export interface Tab {
  /** Stable id; not the same as run_dir_name (you can have two run
   * tabs of the same run open). */
  id: string;
  kind: TabKind;
  title: string;
  /** Run dir name when kind === 'run' or 'tasks'. */
  runDirName?: string;
  /** When set, the Run tab should center on this node id on next
   * mount/focus. Cleared by the consumer after honouring it. Used
   * for "jump to node" navigation from other tabs (e.g., Tasks). */
  pendingFocusNodeId?: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  openHomeTab: () => string;
  openRunTab: (runDirName: string, title: string) => string;
  openTasksTab: (runDirName: string, title: string) => string;
  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTab: (id: string, toIndex: number) => void;
  /** Open or focus the Run tab for ``runDirName`` and ask it to
   * center on ``nodeId`` once mounted. The RunTab clears the flag
   * after honouring it. */
  jumpToNode: (runDirName: string, title: string, nodeId: string) => string;
  /** Consumer-side acknowledgement that pendingFocusNodeId has been
   * honoured. Clears the flag on the tab. */
  clearPendingFocus: (tabId: string) => void;
}

const HOME_TAB: Tab = {
  id: 'home',
  kind: 'home',
  title: 'HOME',
};

let _seq = 1;
const newId = () => `t${Date.now().toString(36)}${(_seq++).toString(36)}`;

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      activeTabId: HOME_TAB.id,

      openHomeTab: () => {
        const existing = get().tabs.find((t) => t.kind === 'home');
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }
        const tab = { ...HOME_TAB, id: newId() };
        set((s) => ({ tabs: [tab, ...s.tabs], activeTabId: tab.id }));
        return tab.id;
      },

      openRunTab: (runDirName, title) => {
        // If the same run is already open, focus it instead of duplicating.
        const existing = get().tabs.find(
          (t) => t.kind === 'run' && t.runDirName === runDirName,
        );
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }
        const tab: Tab = {
          id: newId(),
          kind: 'run',
          title,
          runDirName,
        };
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
        return tab.id;
      },

      openTasksTab: (runDirName, title) => {
        const existing = get().tabs.find(
          (t) => t.kind === 'tasks' && t.runDirName === runDirName,
        );
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }
        const tab: Tab = {
          id: newId(),
          kind: 'tasks',
          title: `TASKS · ${title}`,
          runDirName,
        };
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
        return tab.id;
      },

      activateTab: (id) => set({ activeTabId: id }),

      closeTab: (id) =>
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === id);
          if (idx === -1) return s;
          const tabs = s.tabs.filter((t) => t.id !== id);
          // If we closed the active tab, fall back to the neighbour.
          let activeTabId = s.activeTabId;
          if (s.activeTabId === id) {
            const next = tabs[idx] ?? tabs[idx - 1] ?? null;
            activeTabId = next?.id ?? null;
          }
          // Always keep at least one tab open.
          if (tabs.length === 0) {
            const home: Tab = { ...HOME_TAB, id: newId() };
            return { tabs: [home], activeTabId: home.id };
          }
          return { tabs, activeTabId };
        }),

      reorderTab: (id, toIndex) =>
        set((s) => {
          const from = s.tabs.findIndex((t) => t.id === id);
          if (from === -1 || from === toIndex) return s;
          const tabs = s.tabs.slice();
          const [moved] = tabs.splice(from, 1);
          tabs.splice(toIndex, 0, moved);
          return { tabs };
        }),

      jumpToNode: (runDirName, title, nodeId) => {
        const existing = get().tabs.find(
          (t) => t.kind === 'run' && t.runDirName === runDirName,
        );
        if (existing) {
          // Stamp the existing tab with the focus request so the
          // RunTab effect picks it up.
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === existing.id ? { ...t, pendingFocusNodeId: nodeId } : t,
            ),
            activeTabId: existing.id,
          }));
          return existing.id;
        }
        const tab: Tab = {
          id: newId(),
          kind: 'run',
          title,
          runDirName,
          pendingFocusNodeId: nodeId,
        };
        set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
        return tab.id;
      },

      clearPendingFocus: (tabId) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId && t.pendingFocusNodeId
              ? { ...t, pendingFocusNodeId: undefined }
              : t,
          ),
        })),
    }),
    { name: 'yggdrasil.tabs.v1' },
  ),
);
