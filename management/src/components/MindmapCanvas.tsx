// MindmapCanvas — a per-project "thinking framework" for analysts.
//
// A lightweight, collaborative node/edge canvas: each node is a Title +
// Body card; nodes can be dragged, connected (thesis-style), collapsed to
// cut clutter, colour-coded, and edited in place. One shared mindmap per
// project (grouped by project_id). Writes go straight to PostgREST under
// RLS (migration 0020 grants authenticated full CRUD) — no edge function.
//
// Infinite canvas: one transformed "world" layer (translate + scale).
// Pan = drag empty space (any direction). Zoom = wheel or +/- buttons,
// anchored on the cursor. Deliberately simpler than Yggdrasil: no
// auto-layout, no graph physics. That's the whole mental model.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type { MindmapNode, MindmapEdge, NoteColor, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls } from "../lib/util";

interface MindmapCanvasProps {
  projectId: string;
  currentUser: User;
  users: Record<string, UserLite>;
}

const NODE_W = 240;
const HEADER_H = 34;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

const COLORS: Array<{ value: NoteColor | null; label: string; swatch: string }> = [
  { value: null,     label: "Default", swatch: "#3a4254" },
  { value: "yellow", label: "Yellow",  swatch: "#facc15" },
  { value: "pink",   label: "Pink",    swatch: "#f472b6" },
  { value: "blue",   label: "Blue",    swatch: "#4a9eff" },
  { value: "green",  label: "Green",   swatch: "#22c55e" },
  { value: "red",    label: "Red",     swatch: "#ef4444" },
  { value: "gray",   label: "Gray",    swatch: "#94a3b8" },
];

function tint(c: NoteColor | null): string {
  switch (c) {
    case "yellow": return "rgba(250, 204, 21, 0.13)";
    case "pink":   return "rgba(244, 114, 182, 0.13)";
    case "blue":   return "rgba(74, 158, 255, 0.13)";
    case "green":  return "rgba(34, 197, 94, 0.13)";
    case "red":    return "rgba(239, 68, 68, 0.13)";
    case "gray":   return "rgba(148, 163, 184, 0.13)";
    default:       return "var(--bg-elev-2)";
  }
}
function stroke(c: NoteColor | null): string {
  switch (c) {
    case "yellow": return "rgba(250, 204, 21, 0.5)";
    case "pink":   return "rgba(244, 114, 182, 0.5)";
    case "blue":   return "rgba(74, 158, 255, 0.5)";
    case "green":  return "rgba(34, 197, 94, 0.5)";
    case "red":    return "rgba(239, 68, 68, 0.5)";
    case "gray":   return "rgba(148, 163, 184, 0.5)";
    default:       return "var(--border-strong)";
  }
}

interface Viewport { x: number; y: number; scale: number }
interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

export function MindmapCanvas({ projectId, currentUser, users }: MindmapCanvasProps) {
  const [nodes, setNodes] = useState<MindmapNode[]>([]);
  const [edges, setEdges] = useState<MindmapEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useRealtimeRefresh(refresh);

  // Inline editing
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // Linking mode
  const [linkFrom, setLinkFrom] = useState<string | null>(null);

  // Infinite-canvas viewport: world transform = translate(x,y) scale(s).
  const [view, setView] = useState<Viewport>({ x: 40, y: 40, scale: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const canvasRef = useRef<HTMLDivElement>(null);

  // ---- load ----------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const sb = getClient();
        const [nRes, eRes] = await Promise.all([
          sb.from("mindmap_nodes").select("*").eq("project_id", projectId),
          sb.from("mindmap_edges").select("*").eq("project_id", projectId),
        ]);
        if (!alive) return;
        if (nRes.error) throw nRes.error;
        if (eRes.error) throw eRes.error;
        setNodes((nRes.data ?? []) as MindmapNode[]);
        setEdges((eRes.data ?? []) as MindmapEdge[]);
        setErr(null);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId, tick]);

  const nodeById = useMemo(() => {
    const m = new Map<string, MindmapNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // screen (canvas-relative) → world coords
  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const sx = clientX - (rect?.left ?? 0);
    const sy = clientY - (rect?.top ?? 0);
    return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
  };

  // ---- mutations -----------------------------------------------------
  const addNode = async () => {
    setErr(null);
    const rect = canvasRef.current?.getBoundingClientRect();
    // Centre of the current viewport, in world coords.
    const c = toWorld(
      (rect?.left ?? 0) + (rect?.width ?? 600) / 2,
      (rect?.top ?? 0) + (rect?.height ?? 440) / 2,
    );
    try {
      const sb = getClient();
      const { data, error } = await sb
        .from("mindmap_nodes")
        .insert({
          project_id: projectId,
          title: "New idea",
          body: "",
          x: Math.round(c.x - NODE_W / 2),
          y: Math.round(c.y - 40),
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as MindmapNode;
      setNodes((prev) => [...prev, created]);
      setEditId(created.id);
      setEditTitle(created.title);
      setEditBody(created.body);
    } catch (e) { setErr((e as Error).message); }
  };

  const patchNode = async (id: string, patch: Partial<MindmapNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    try {
      const sb = getClient();
      const { error } = await sb.from("mindmap_nodes").update(patch).eq("id", id);
      if (error) throw error;
    } catch (e) {
      setErr((e as Error).message);
      refresh();
    }
  };

  const deleteNode = async (id: string) => {
    if (!window.confirm("Delete this node and its connections?")) return;
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source_node_id !== id && e.target_node_id !== id));
    try {
      const sb = getClient();
      const { error } = await sb.from("mindmap_nodes").delete().eq("id", id);
      if (error) throw error;
    } catch (e) { setErr((e as Error).message); refresh(); }
  };

  const addEdge = async (source: string, target: string) => {
    if (source === target) return;
    if (edges.some((e) => e.source_node_id === source && e.target_node_id === target)) return;
    try {
      const sb = getClient();
      const { data, error } = await sb
        .from("mindmap_edges")
        .insert({ project_id: projectId, source_node_id: source, target_node_id: target })
        .select()
        .single();
      if (error) throw error;
      setEdges((prev) => [...prev, data as MindmapEdge]);
    } catch (e) { setErr((e as Error).message); }
  };

  const deleteEdge = async (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    try {
      const sb = getClient();
      const { error } = await sb.from("mindmap_edges").delete().eq("id", id);
      if (error) throw error;
    } catch (e) { setErr((e as Error).message); refresh(); }
  };

  // ---- node drag (delta scaled into world space) ---------------------
  const onNodeHeaderDown = (e: React.MouseEvent, n: MindmapNode) => {
    if (editId === n.id) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      nodeId: n.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: n.x,
      startY: n.y,
      curX: n.x,
      curY: n.y,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const s = viewRef.current.scale;
      const nx = d.startX + (e.clientX - d.startMouseX) / s;
      const ny = d.startY + (e.clientY - d.startMouseY) / s;
      setDrag({ ...d, curX: nx, curY: ny });
    };
    const up = () => {
      const d = dragRef.current;
      if (d) patchNode(d.nodeId, { x: Math.round(d.curX), y: Math.round(d.curY) });
      setDrag(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag?.nodeId]);

  // ---- pan (drag empty space, any direction) -------------------------
  const panning = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);
  const onCanvasDown = (e: React.MouseEvent) => {
    // Pan unless the click landed on a node card.
    if ((e.target as Element).closest?.(".mm-node")) return;
    if (linkFrom) { setLinkFrom(null); return; }
    const v = viewRef.current;
    panning.current = { mx: e.clientX, my: e.clientY, vx: v.x, vy: v.y };
    const move = (ev: MouseEvent) => {
      const p = panning.current;
      if (!p) return;
      setView((cur) => ({ ...cur, x: p.vx + (ev.clientX - p.mx), y: p.vy + (ev.clientY - p.my) }));
    };
    const up = () => {
      panning.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // ---- zoom (wheel + buttons), anchored on the cursor ----------------
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    setView((v) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const sx = clientX - (rect?.left ?? 0);
      const sy = clientY - (rect?.top ?? 0);
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      // Keep the world point under the cursor fixed.
      const wx = (sx - v.x) / v.scale;
      const wy = (sy - v.y) / v.scale;
      return { scale: next, x: sx - wx * next, y: sy - wy * next };
    });
  };
  // Native non-passive wheel listener so preventDefault actually stops the
  // page scrolling while zooming.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);
  const zoomCentre = (factor: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  };
  const resetView = () => setView({ x: 40, y: 40, scale: 1 });
  const fitAll = () => {
    if (nodes.length === 0) { resetView(); return; }
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + 180));
    const pad = 80;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        Math.min(r.width / (maxX - minX + pad * 2), r.height / (maxY - minY + pad * 2)),
      ),
    );
    setView({
      scale,
      x: r.width / 2 - ((minX + maxX) / 2) * scale,
      y: r.height / 2 - ((minY + maxY) / 2) * scale,
    });
  };

  const onNodeClick = (n: MindmapNode) => {
    if (!linkFrom) return;
    if (linkFrom !== n.id) addEdge(linkFrom, n.id);
    setLinkFrom(null);
  };

  const startEdit = (n: MindmapNode) => {
    setEditId(n.id);
    setEditTitle(n.title);
    setEditBody(n.body);
  };
  const saveEdit = (n: MindmapNode) => {
    const title = editTitle.trim() || "Untitled";
    patchNode(n.id, { title, body: editBody });
    setEditId(null);
  };

  const posOf = (n: MindmapNode): { x: number; y: number } => {
    if (drag && drag.nodeId === n.id) return { x: drag.curX, y: drag.curY };
    return { x: n.x, y: n.y };
  };

  return (
    <div className="mm-wrap">
      <div className="mm-toolbar">
        <button className="btn sm mm-btn" onClick={addNode}>+ Node</button>
        <span className="mm-hint mono">
          {linkFrom
            ? "Click a target node to connect · click empty space to cancel"
            : "Drag header to move · drag empty space to pan · scroll to zoom · ⤳ to connect"}
        </span>
        <div style={{ flex: 1 }} />
        <span className="dim mono" style={{ fontSize: 10 }}>
          {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} link{edges.length === 1 ? "" : "s"}
        </span>
      </div>

      {err && <div className="error-banner" style={{ margin: "8px 0" }}>{err}</div>}

      <div
        ref={canvasRef}
        className={cls("mm-canvas", linkFrom && "mm-linking")}
        onMouseDown={onCanvasDown}
      >
        {/* Zoom / view controls */}
        <div className="mm-zoom" onMouseDown={(e) => e.stopPropagation()}>
          <button className="mm-zoom-btn" title="Zoom in" onClick={() => zoomCentre(1.2)}>+</button>
          <button className="mm-zoom-btn" title="Zoom out" onClick={() => zoomCentre(1 / 1.2)}>−</button>
          <button className="mm-zoom-btn wide" title="Fit all nodes" onClick={fitAll}>Fit</button>
          <button className="mm-zoom-btn wide" title="Reset view" onClick={resetView}>1:1</button>
          <span className="mm-zoom-pct mono">{Math.round(view.scale * 100)}%</span>
        </div>

        {loading && <div className="mm-empty dim">Loading mindmap…</div>}
        {!loading && nodes.length === 0 && (
          <div className="mm-empty dim">
            Empty canvas. Hit <b>+ Node</b> to drop your first idea, then connect
            nodes into a thesis.
          </div>
        )}

        {/* World layer — everything pans/zooms together */}
        <div
          className="mm-world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {/* Edge layer */}
          <svg className="mm-edges" width="1" height="1" style={{ overflow: "visible" }}>
            {edges.map((e) => {
              const s = nodeById.get(e.source_node_id);
              const t = nodeById.get(e.target_node_id);
              if (!s || !t) return null;
              const sp = posOf(s), tp = posOf(t);
              const x1 = sp.x + NODE_W;
              const y1 = sp.y + HEADER_H / 2;
              const x2 = tp.x;
              const y2 = tp.y + HEADER_H / 2;
              const dx = Math.max(40, Math.abs(x2 - x1) / 2);
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={e.id} className="mm-edge">
                  <path
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                  />
                  <circle
                    className="mm-edge-del"
                    cx={mx}
                    cy={my}
                    r={8}
                    onClick={() => deleteEdge(e.id)}
                  />
                  <text className="mm-edge-x" x={mx} y={my + 3} textAnchor="middle">×</text>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const p = posOf(n);
            const editing = editId === n.id;
            const author = n.created_by ? users[n.created_by] : null;
            return (
              <div
                key={n.id}
                className={cls(
                  "mm-node",
                  linkFrom && linkFrom !== n.id && "mm-node-targetable",
                  linkFrom === n.id && "mm-node-source",
                )}
                style={{
                  left: p.x,
                  top: p.y,
                  width: NODE_W,
                  background: tint(n.color),
                  borderColor: stroke(n.color),
                }}
                onClick={() => onNodeClick(n)}
              >
                <div
                  className="mm-node-head"
                  onMouseDown={(e) => onNodeHeaderDown(e, n)}
                  onDoubleClick={() => startEdit(n)}
                >
                  {editing ? (
                    <input
                      className="mm-title-input"
                      value={editTitle}
                      autoFocus
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); saveEdit(n); }
                        if (e.key === "Escape") setEditId(null);
                      }}
                    />
                  ) : (
                    <span className="mm-title" title={n.title}>{n.title}</span>
                  )}
                  <div className="mm-node-actions">
                    <button
                      title="Connect from this node"
                      className={cls("mm-ico", linkFrom === n.id && "on")}
                      onClick={(e) => { e.stopPropagation(); setLinkFrom(linkFrom === n.id ? null : n.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >⤳</button>
                    <button
                      title={n.collapsed ? "Expand" : "Collapse"}
                      className="mm-ico"
                      onClick={(e) => { e.stopPropagation(); patchNode(n.id, { collapsed: !n.collapsed }); }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >{n.collapsed ? "▸" : "▾"}</button>
                  </div>
                </div>

                {!n.collapsed && (
                  <div className="mm-node-body">
                    {editing ? (
                      <>
                        <textarea
                          className="mm-body-input"
                          value={editBody}
                          rows={Math.min(10, Math.max(3, editBody.split("\n").length))}
                          placeholder="Flesh out the idea / argument…"
                          onChange={(e) => setEditBody(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveEdit(n); }
                            if (e.key === "Escape") setEditId(null);
                          }}
                        />
                        <div className="mm-edit-row">
                          <div className="mm-swatches">
                            {COLORS.map((c) => (
                              <button
                                key={c.value ?? "default"}
                                title={c.label}
                                className="mm-swatch"
                                style={{
                                  background: c.swatch,
                                  outline: n.color === c.value ? "2px solid var(--text)" : "none",
                                }}
                                onClick={(e) => { e.stopPropagation(); patchNode(n.id, { color: c.value }); }}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                            ))}
                          </div>
                          <div style={{ flex: 1 }} />
                          <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEditId(null); }}>Cancel</button>
                          <button className="btn sm mm-btn" onClick={(e) => { e.stopPropagation(); saveEdit(n); }}>Save</button>
                        </div>
                      </>
                    ) : (
                      <div
                        className={cls("mm-body-text", !n.body && "dim")}
                        onDoubleClick={() => startEdit(n)}
                      >
                        {n.body || "Double-click to add detail…"}
                      </div>
                    )}
                  </div>
                )}

                {!editing && (
                  <div className="mm-node-foot">
                    <span className="dim mono">{author?.full_name ?? ""}</span>
                    <div style={{ flex: 1 }} />
                    <button
                      className="mm-foot-btn"
                      onClick={(e) => { e.stopPropagation(); startEdit(n); }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >Edit</button>
                    <button
                      className="mm-foot-btn danger"
                      onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >Del</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
