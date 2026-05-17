// MindmapCanvas — a per-project "thinking framework" for analysts.
//
// A lightweight, collaborative node/edge canvas: each node is a Title +
// Body card; nodes can be dragged, connected (thesis-style), collapsed to
// cut clutter, colour-coded, and edited in place. One shared mindmap per
// project (grouped by project_id). Writes go straight to PostgREST under
// RLS (migration 0020 grants authenticated full CRUD) — no edge function.
//
// Deliberately simpler than Yggdrasil: no zoom, no auto-layout, no graph
// physics. Pan by dragging empty canvas. That's the whole mental model.

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

  // Linking mode: when a source node id is set, the next node click wires
  // an edge from it.
  const [linkFrom, setLinkFrom] = useState<string | null>(null);

  // Pan offset (canvas-space → screen-space translation).
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;

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

  // ---- mutations -----------------------------------------------------
  const addNode = async () => {
    setErr(null);
    // Drop new node near the centre of the current viewport.
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = (rect ? rect.width / 2 : 300) - pan.x - NODE_W / 2;
    const cy = (rect ? rect.height / 2 : 220) - pan.y - 40;
    try {
      const sb = getClient();
      const { data, error } = await sb
        .from("mindmap_nodes")
        .insert({
          project_id: projectId,
          title: "New idea",
          body: "",
          x: Math.round(cx),
          y: Math.round(cy),
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as MindmapNode;
      setNodes((prev) => [...prev, created]);
      // Open it for editing immediately.
      setEditId(created.id);
      setEditTitle(created.title);
      setEditBody(created.body);
    } catch (e) { setErr((e as Error).message); }
  };

  const patchNode = async (id: string, patch: Partial<MindmapNode>) => {
    // Optimistic local update; persist; reconcile on error.
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

  // ---- node drag -----------------------------------------------------
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
      const nx = d.startX + (e.clientX - d.startMouseX);
      const ny = d.startY + (e.clientY - d.startMouseY);
      setDrag({ ...d, curX: nx, curY: ny });
    };
    const up = () => {
      const d = dragRef.current;
      if (d) {
        const x = Math.round(d.curX);
        const y = Math.round(d.curY);
        patchNode(d.nodeId, { x, y });
      }
      setDrag(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag?.nodeId]);

  // ---- canvas pan ----------------------------------------------------
  const panning = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const onCanvasDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // only empty space
    if (linkFrom) { setLinkFrom(null); return; }
    panning.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
    const move = (ev: MouseEvent) => {
      const p = panning.current;
      if (!p) return;
      setPan({ x: p.px + (ev.clientX - p.mx), y: p.py + (ev.clientY - p.my) });
    };
    const up = () => {
      panning.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
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

  // Live position helper (drag override).
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
            : "Drag header to move · drag empty space to pan · ⤳ to connect"}
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
        {loading && <div className="mm-empty dim">Loading mindmap…</div>}
        {!loading && nodes.length === 0 && (
          <div className="mm-empty dim">
            Empty canvas. Hit <b>+ Node</b> to drop your first idea, then connect
            nodes into a thesis.
          </div>
        )}

        {/* Edge layer */}
        <svg className="mm-edges" width="100%" height="100%">
          {edges.map((e) => {
            const s = nodeById.get(e.source_node_id);
            const t = nodeById.get(e.target_node_id);
            if (!s || !t) return null;
            const sp = posOf(s), tp = posOf(t);
            const x1 = sp.x + NODE_W + pan.x;
            const y1 = sp.y + HEADER_H / 2 + pan.y;
            const x2 = tp.x + pan.x;
            const y2 = tp.y + HEADER_H / 2 + pan.y;
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
                  r={7}
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
                left: p.x + pan.x,
                top: p.y + pan.y,
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
  );
}
