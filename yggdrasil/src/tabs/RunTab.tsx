/**
 * RunTab — single-tree canvas + side detail panel + interaction layer.
 *
 * Sprint-15 (accordion) rewrites the visibility model:
 *   - First paint shows only root + 4 pillars (the accordion store's
 *     visibleIds returns just the parentless root + its direct
 *     children when nothing is expanded yet).
 *   - Clicking a card expands its direct children, selects it, opens
 *     the detail panel, and centers the viewport.
 *   - Mutex per level: clicking a sibling auto-collapses the prior
 *     subtree at that level.
 *   - Esc walks back one level. Toolbar "Collapse All" resets.
 *   - Focus mode (`f` key, dim-non-subtree) is REMOVED — accordion
 *     already accomplishes focus.
 *   - Cross-link stub badges over collapsed subtrees route to
 *     ``expandPath`` so clicking a connection drills into the hidden
 *     target.
 *
 * Pan / zoom / drag / search / Tasks-tab jump still work; jumps now
 * auto-expand the path to the target before centering on it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { RunDetail, YgNode } from '../api/types';
import { HelpOverlay } from '../components/HelpOverlay';
import { Minimap } from '../components/Minimap';
import { NodeCard } from '../components/NodeCard';
import { NodeDetail } from '../components/NodeDetail';
import { SearchOverlay } from '../components/SearchOverlay';
import { TreeCanvas, type ViewportApi } from '../components/TreeCanvas';
import { useAccordionStore } from '../state/accordion';
import { usePositionsStore } from '../state/positions';
import { useTabsStore } from '../state/tabs';
import {
  layoutTree,
  layoutTreeFull,
  type LayoutDirection,
  type LayoutResult,
} from '../tree/layout';
import {
  ancestorsOf,
  descendantsOf,
  firstChildOf,
  parentOf,
  rootCandidate,
  siblingDelta,
} from '../tree/navigation';
import './RunTab.css';

interface Props {
  runDirName: string;
}

export function RunTab({ runDirName }: Props) {
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCrossLinks, setShowCrossLinks] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const viewportApiRef = useRef<ViewportApi | null>(null);
  const [viewportSnapshot, setViewportSnapshot] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const clearRunOffsets = usePositionsStore((s) => s.clearRun);

  // ----- Accordion store ------------------------------------------
  // Subscribe to the WHOLE expandedByRun record so React re-renders
  // whenever this run's expansion path changes. The methods themselves
  // are stable function refs.
  const expandedByRun = useAccordionStore((s) => s.expandedByRun);
  const toggleExpand = useAccordionStore((s) => s.toggle);
  const expandPath = useAccordionStore((s) => s.expandPath);
  const walkBack = useAccordionStore((s) => s.walkBack);
  const collapseAll = useAccordionStore((s) => s.collapseAll);
  const setExpandedSet = useAccordionStore((s) => s.setExpandedSet);
  const visibleIdsFn = useAccordionStore((s) => s.visibleIds);
  const offPathIdsFn = useAccordionStore((s) => s.offPathIds);

  const openTasksTab = useTabsStore((s) => s.openTasksTab);
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const clearPendingFocus = useTabsStore((s) => s.clearPendingFocus);
  const pendingFocusNodeId = useMemo(() => {
    const t = tabs.find((x) => x.id === activeTabId);
    return t?.pendingFocusNodeId;
  }, [tabs, activeTabId]);

  // ----- Fetch ----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setSelectedId(null);
    setSearchQuery('');
    (async () => {
      try {
        const d = await api.getRun(runDirName);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runDirName]);

  // ----- Canvas size observer ------------------------------------
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setCanvasSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- Accordion-aware visible-ids set --------------------------
  // visibleIdsFn is a stable closure that reads the latest store value;
  // depending on expandedByRun re-runs the memo when this run's
  // expansion path changes.
  const visibleIds = useMemo(() => {
    if (!data) return new Set<string>();
    return visibleIdsFn(runDirName, data.tree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, runDirName, visibleIdsFn, expandedByRun]);

  // Off-path = visible-but-not-on-current-branch. Fading these is what
  // makes the focused branch stand out visually.
  const offPathIds = useMemo(() => {
    if (!data) return new Set<string>();
    return offPathIdsFn(runDirName, data.tree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, runDirName, offPathIdsFn, expandedByRun]);

  // ----- Toolbar-preset helpers ----------------------------------
  // "Show all macro/industry/equity" presets need the full ancestor +
  // descendant id list for each zone root. Compute once per tree.
  const presetIdSets = useMemo(() => {
    if (!data) return null;
    const nodes = data.tree.nodes;
    // Children-map for fast descendant walk.
    const childrenOf = new Map<string, string[]>();
    for (const n of Object.values(nodes)) {
      if (!n.primary_parent) continue;
      const arr = childrenOf.get(n.primary_parent) ?? [];
      arr.push(n.id);
      childrenOf.set(n.primary_parent, arr);
    }
    const descendants = (rootId: string): string[] => {
      const out: string[] = [rootId];
      const stack = [rootId];
      const seen = new Set([rootId]);
      while (stack.length) {
        const cur = stack.pop()!;
        for (const child of childrenOf.get(cur) ?? []) {
          if (seen.has(child)) continue;
          seen.add(child);
          out.push(child);
          stack.push(child);
        }
      }
      return out;
    };
    // Find the 3 zone roots + the root + Pillar 1.
    const root = Object.values(nodes).find(
      (n) => !n.primary_parent || !nodes[n.primary_parent],
    );
    const p1 = Object.values(nodes).find(
      (n) => n.role === 'pillar_1_must_be_true',
    );
    const zone_macro = Object.values(nodes).find((n) => n.role === 'zone_macro');
    const zone_industry = Object.values(nodes).find(
      (n) => n.role === 'zone_industry',
    );
    const zone_equity = Object.values(nodes).find(
      (n) => n.role === 'zone_equity',
    );
    const allIds = Object.keys(nodes);
    const prelude = [root?.id, p1?.id].filter(Boolean) as string[];
    return {
      all: allIds,
      macro: zone_macro ? [...prelude, ...descendants(zone_macro.id)] : prelude,
      industry: zone_industry
        ? [...prelude, ...descendants(zone_industry.id)]
        : prelude,
      equity: zone_equity ? [...prelude, ...descendants(zone_equity.id)] : prelude,
    };
  }, [data]);

  // ----- Layout (accordion-filtered) ------------------------------
  const layout: LayoutResult | null = useMemo(() => {
    if (!data) return null;
    return layoutTree(data.tree, {
      direction: layoutDirection,
      visibleIds,
    });
  }, [data, layoutDirection, visibleIds]);

  // ----- Full structural layout for the minimap -------------------
  // The minimap always shows the WHOLE tree regardless of accordion
  // state — that's the analyst's "you are here on the bigger map"
  // affordance. Memoize on the tree itself so it's not recomputed on
  // every accordion change.
  const fullLayout: LayoutResult | null = useMemo(() => {
    if (!data) return null;
    return layoutTreeFull(data.tree, layoutDirection);
  }, [data, layoutDirection]);

  const selectedNode: YgNode | null = useMemo(() => {
    if (!data || !selectedId) return null;
    return data.tree.nodes[selectedId] ?? null;
  }, [data, selectedId]);

  const ancestorIds = useMemo(() => {
    if (!data || !selectedId) return new Set<string>();
    return ancestorsOf(data.tree, selectedId);
  }, [data, selectedId]);

  const descendantIds = useMemo(() => {
    if (!data || !selectedId) return new Set<string>();
    return descendantsOf(data.tree, selectedId);
  }, [data, selectedId]);

  // ----- Score lookup --------------------------------------------
  const scoreByNode = data?.scores?.nodes ?? null;
  const heatScoreFor = useCallback(
    (id: string): number | null => {
      if (!scoreByNode) return null;
      const raw = scoreByNode[id];
      if (raw && typeof raw === 'object' && 'overall' in raw) {
        const v = (raw as { overall: unknown }).overall;
        if (typeof v === 'number') return v;
      }
      return null;
    },
    [scoreByNode],
  );

  // ----- Accordion helpers ----------------------------------------
  // Expand a path that lands on a target node, then select + center.
  // Used by search, Tasks-tab jump, cross-link stub badge clicks.
  const drillTo = useCallback(
    (nodeId: string) => {
      if (!data) return;
      // Build the full ancestor chain root → ... → nodeId. The accordion
      // requires the PARENT of nodeId to be expanded for nodeId to be
      // visible; for a leaf we expand all its ancestors, for an inner
      // node we expand it AND its ancestors.
      const chain: string[] = [];
      let cur: string | null = nodeId;
      const guard = new Set<string>();
      while (cur && !guard.has(cur)) {
        guard.add(cur);
        chain.unshift(cur);
        cur = data.tree.nodes[cur]?.primary_parent ?? null;
      }
      // The leaf doesn't need to be expanded itself (no children to show),
      // but inner nodes do — keep the full chain; the accordion's
      // expandPath idempotently expands each.
      // Drop the leaf if it has no children (clicking it would just toggle
      // collapse-from-leaf which is a no-op).
      const hasChildren = (id: string) =>
        Object.values(data.tree.nodes).some((n) => n.primary_parent === id);
      const trimmed = hasChildren(nodeId) ? chain : chain.slice(0, -1);
      expandPath(runDirName, data.tree, trimmed);
      setSelectedId(nodeId);
      // Defer center to after the layout re-runs — one tick of rAF is
      // enough for React to render the new layout.
      requestAnimationFrame(() => {
        viewportApiRef.current?.centerOnNode(nodeId);
      });
    },
    [data, runDirName, expandPath],
  );

  // ----- Keyboard nav --------------------------------------------
  const stateRef = useRef({ selectedId, searchOpen, searchQuery, helpOpen });
  useEffect(() => {
    stateRef.current = { selectedId, searchOpen, searchQuery, helpOpen };
  }, [selectedId, searchOpen, searchQuery, helpOpen]);

  useEffect(() => {
    if (!data) return;
    const tree = data.tree;
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        if (e.key === 'Escape' && s.searchOpen) setSearchOpen(false);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        if (s.helpOpen) return setHelpOpen(false);
        if (s.searchOpen) return setSearchOpen(false);
        if (s.searchQuery) return setSearchQuery('');
        // Accordion: walk back one level. If nothing to walk back,
        // clear selection.
        const walked = walkBack(runDirName);
        if (!walked) setSelectedId(null);
        return;
      }
      if (e.key === 'r') {
        e.preventDefault();
        clearRunOffsets(runDirName);
        viewportApiRef.current?.fit();
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        viewportApiRef.current?.fit();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        viewportApiRef.current?.zoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        viewportApiRef.current?.zoomOut();
        return;
      }

      const cur = s.selectedId ?? rootCandidate(tree);
      if (!cur) return;
      if (!s.selectedId) {
        setSelectedId(cur);
        viewportApiRef.current?.centerOnNode(cur);
        e.preventDefault();
        return;
      }

      let nextId: string | null = null;
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          nextId = siblingDelta(tree, cur, 1);
          break;
        case 'k':
        case 'ArrowUp':
          nextId = siblingDelta(tree, cur, -1);
          break;
        case 'h':
        case 'ArrowLeft':
          nextId = parentOf(tree, cur);
          break;
        case 'l':
        case 'ArrowRight':
          nextId = firstChildOf(tree, cur);
          break;
      }
      if (nextId) {
        e.preventDefault();
        // Keyboard nav follows accordion semantics — auto-drill to
        // the destination so it's actually visible.
        drillTo(nextId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, clearRunOffsets, runDirName, walkBack, drillTo]);

  // ----- Cross-tab "focus this node" hand-off --------------------
  useEffect(() => {
    if (!pendingFocusNodeId || !data || !layout) return;
    if (!data.tree.nodes[pendingFocusNodeId]) {
      if (activeTabId) clearPendingFocus(activeTabId);
      return;
    }
    drillTo(pendingFocusNodeId);
    if (activeTabId) clearPendingFocus(activeTabId);
  }, [pendingFocusNodeId, data, layout, activeTabId, clearPendingFocus, drillTo]);

  // ----- Card-click handler — toggle accordion + select ----------
  const onCardClick = useCallback(
    (nodeId: string) => {
      if (!data) return;
      // Toggle expansion (clicking same node closes; clicking sibling
      // auto-closes prior via mutex inside the store).
      toggleExpand(runDirName, data.tree, nodeId);
      setSelectedId(nodeId);
      // Center after layout reflows.
      requestAnimationFrame(() => {
        viewportApiRef.current?.centerOnNode(nodeId);
      });
    },
    [data, runDirName, toggleExpand],
  );

  // ----- Render -------------------------------------------------
  if (error) {
    return (
      <div className="run-tab run-tab--error">
        <div className="run-tab__error">
          <div className="run-tab__error-title">FAILED TO LOAD</div>
          <div className="run-tab__error-body">{error}</div>
        </div>
      </div>
    );
  }
  if (!data || !layout) {
    return <div className="run-tab run-tab--loading">loading run…</div>;
  }

  const expandedCount = (expandedByRun[runDirName] ?? []).length;

  return (
    <div className="run-tab">
      <header className="run-tab__header">
        <div className="run-tab__heading">
          <span className="run-tab__topic">{data.tree.metadata.topic}</span>
          <span className="run-tab__meta">
            {formatPromptsVersion(data.tree.metadata.prompts_version)} ·{' '}
            {Object.keys(data.tree.nodes).length} nodes ·{' '}
            {layout.nodes.length} visible
            {data.scores ? ` · score ${data.scores.overall.toFixed(2)}` : ''}
          </span>
        </div>
        <div className="run-tab__controls">
          <label className="run-tab__toggle">
            <input
              type="checkbox"
              checked={showCrossLinks}
              onChange={(e) => setShowCrossLinks(e.target.checked)}
            />
            cross-links
          </label>
          <label className="run-tab__toggle">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              disabled={scoreByNode === null}
            />
            heatmap
          </label>
          <button
            className="run-tab__btn"
            onClick={() =>
              setLayoutDirection((d) => (d === 'LR' ? 'TB' : 'LR'))
            }
            title="Toggle layout direction (LR ↔ TB)"
          >
            {layoutDirection === 'LR' ? 'LR ▸' : 'TB ▾'}
          </button>
          <button
            className="run-tab__btn"
            onClick={() => viewportApiRef.current?.fit()}
            title="Fit tree to view (0)"
          >
            fit
          </button>
          <button
            className="run-tab__btn"
            onClick={() => {
              collapseAll(runDirName);
              setSelectedId(null);
              requestAnimationFrame(() => viewportApiRef.current?.fit());
            }}
            title="Collapse all branches back to root + pillars"
            disabled={expandedCount === 0}
          >
            collapse all
          </button>
          <button
            className="run-tab__btn run-tab__btn--preset"
            onClick={() => {
              if (!presetIdSets) return;
              setExpandedSet(runDirName, presetIdSets.all);
              requestAnimationFrame(() => viewportApiRef.current?.fit());
            }}
            title="Expand the entire tree (every node visible). Use sparingly on big trees."
          >
            expand all
          </button>
          <button
            className="run-tab__btn run-tab__btn--preset"
            onClick={() => {
              if (!presetIdSets) return;
              setExpandedSet(runDirName, presetIdSets.macro);
              requestAnimationFrame(() => viewportApiRef.current?.fit());
            }}
            title="Show every node under the Macro zone (industry/equity/hedge collapsed)"
          >
            show macro
          </button>
          <button
            className="run-tab__btn run-tab__btn--preset"
            onClick={() => {
              if (!presetIdSets) return;
              setExpandedSet(runDirName, presetIdSets.industry);
              requestAnimationFrame(() => viewportApiRef.current?.fit());
            }}
            title="Show every node under the Industry zone (macro/equity/hedge collapsed)"
          >
            show industry
          </button>
          <button
            className="run-tab__btn run-tab__btn--preset"
            onClick={() => {
              if (!presetIdSets) return;
              setExpandedSet(runDirName, presetIdSets.equity);
              requestAnimationFrame(() => viewportApiRef.current?.fit());
            }}
            title="Show every node under the Equity zone (macro/industry/hedge collapsed)"
          >
            show equity
          </button>
          <button
            className="run-tab__btn"
            onClick={() => {
              clearRunOffsets(runDirName);
              viewportApiRef.current?.fit();
            }}
            title="Reset node positions (r)"
          >
            reset
          </button>
          <button
            className="run-tab__btn"
            onClick={() =>
              openTasksTab(
                runDirName,
                shortDirSlug(runDirName, data.tree.metadata.topic),
              )
            }
            title="Open hand-off task list"
          >
            tasks
          </button>
          <button
            className="run-tab__btn"
            onClick={() => setHelpOpen(true)}
            title="Show help (?)"
          >
            ?
          </button>
        </div>
      </header>
      <div className="run-tab__body">
        <div className="run-tab__canvas" ref={canvasWrapRef}>
          <TreeCanvas
            runDirName={runDirName}
            layout={layout}
            tree={data.tree}
            selectedId={selectedId}
            ancestorIds={ancestorIds}
            descendantIds={descendantIds}
            searchQuery={searchQuery}
            showCrossLinks={showCrossLinks}
            offPathIds={offPathIds}
            viewportApiRef={viewportApiRef}
            onStubBadgeClick={(targetId) => drillTo(targetId)}
            renderNode={(node) => (
              <NodeCard
                node={node}
                selected={node.id === selectedId}
                isAncestor={ancestorIds.has(node.id)}
                heatScore={showHeatmap ? heatScoreFor(node.id) : null}
                onClick={() => {
                  /* slot-level click handles drag/click split */
                }}
              />
            )}
            onNodeClick={onCardClick}
            onCanvasClick={() => {
              if (selectedId) setSelectedId(null);
            }}
            onViewportChange={setViewportSnapshot}
          />
          {canvasSize.w > 0 && fullLayout && (
            <Minimap
              runDirName={runDirName}
              layout={fullLayout}
              visibleIds={visibleIds}
              viewportX={viewportSnapshot.x}
              viewportY={viewportSnapshot.y}
              viewportScale={viewportSnapshot.scale}
              canvasWidth={canvasSize.w}
              canvasHeight={canvasSize.h}
              onJumpToWorld={(_wx, _wy, nearestId) => {
                if (nearestId) drillTo(nearestId);
              }}
            />
          )}
          <SearchOverlay
            tree={data.tree}
            open={searchOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => setSearchOpen(false)}
            onJumpTo={(id) => drillTo(id)}
          />
          <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
        <aside className="run-tab__detail">
          {selectedNode ? (
            <NodeDetail
              node={selectedNode}
              score={heatScoreFor(selectedNode.id)}
            />
          ) : (
            <div className="run-tab__detail-empty">
              <div className="run-tab__detail-hint">
                CLICK A NODE
                <br />
                to open it and reveal its children
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Compact title for a Tasks tab opened from a Run. Prefers the
 * topic but truncates to keep the tab strip readable. */
function shortDirSlug(runDirName: string, topic: string | undefined): string {
  if (topic && topic.length < 32) return topic;
  if (topic) return topic.slice(0, 29) + '…';
  return runDirName.split('-').slice(-1)[0] ?? runDirName;
}

/** Render a prompts-version label without double-"v": legacy trees
 * sometimes stored "v0"/"v2", v1 trees stored bare "v1", and the
 * "manual" / "unset" labels carry no v prefix. */
function formatPromptsVersion(raw: string | undefined): string {
  if (!raw) return '—';
  return raw.startsWith('v') ? raw : `v${raw}`;
}
