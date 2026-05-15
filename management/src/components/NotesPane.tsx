// NotesPane — rich-note feature for a single deliverable.
//
// Separate from the chat-style comments thread. A note is a sticky-style
// short-form callout: pinnable, colour-codable, and editable in place by
// the author (or admin/management). Pinned notes float to the top of the
// list. Backed by management.deliverable_notes (migration 0015).

import { useEffect, useMemo, useState } from "react";
import { mutateDeliverable } from "../lib/api";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type { DeliverableNote, NoteColor, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls, fmtRelativeTime } from "../lib/util";

interface NotesPaneProps {
  deliverableId: string;
  currentUser: User;
  users: Record<string, UserLite>;
}

const COLORS: Array<{ value: NoteColor | null; label: string; swatch: string }> = [
  { value: null,     label: "Default", swatch: "#3a4254" },
  { value: "yellow", label: "Yellow",  swatch: "#facc15" },
  { value: "pink",   label: "Pink",    swatch: "#f472b6" },
  { value: "blue",   label: "Blue",    swatch: "#4a9eff" },
  { value: "green",  label: "Green",   swatch: "#22c55e" },
  { value: "red",    label: "Red",     swatch: "#ef4444" },
  { value: "gray",   label: "Gray",    swatch: "#94a3b8" },
];

function bgForColor(c: NoteColor | null): string {
  switch (c) {
    case "yellow": return "rgba(250, 204, 21, 0.12)";
    case "pink":   return "rgba(244, 114, 182, 0.12)";
    case "blue":   return "rgba(74, 158, 255, 0.12)";
    case "green":  return "rgba(34, 197, 94, 0.12)";
    case "red":    return "rgba(239, 68, 68, 0.12)";
    case "gray":   return "rgba(148, 163, 184, 0.12)";
    default:       return "var(--bg-elev-2)";
  }
}
function borderForColor(c: NoteColor | null): string {
  switch (c) {
    case "yellow": return "rgba(250, 204, 21, 0.45)";
    case "pink":   return "rgba(244, 114, 182, 0.45)";
    case "blue":   return "rgba(74, 158, 255, 0.45)";
    case "green":  return "rgba(34, 197, 94, 0.45)";
    case "red":    return "rgba(239, 68, 68, 0.45)";
    case "gray":   return "rgba(148, 163, 184, 0.45)";
    default:       return "var(--border)";
  }
}

export function NotesPane({ deliverableId, currentUser, users }: NotesPaneProps) {
  const [notes, setNotes] = useState<DeliverableNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftColor, setDraftColor] = useState<NoteColor | null>(null);
  const [draftPinned, setDraftPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  useRealtimeRefresh(refresh);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const sb = getClient();
        const { data, error } = await sb
          .from("deliverable_notes")
          .select("*")
          .eq("deliverable_id", deliverableId)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false });
        if (!alive) return;
        if (error) throw error;
        setNotes((data ?? []) as DeliverableNote[]);
        setErr(null);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [deliverableId, tick]);

  const canEditNote = (n: DeliverableNote): boolean => {
    if (currentUser.role === "admin" || currentUser.role === "management") return true;
    return n.author_user_id === currentUser.id;
  };

  const addNote = async () => {
    const text = draftBody.trim();
    if (!text) return;
    setBusy(true); setErr(null);
    try {
      await mutateDeliverable({
        action: "add_note",
        deliverable_id: deliverableId,
        note_body: text,
        note_color: draftColor,
        note_pinned: draftPinned,
      });
      setDraftBody("");
      setDraftColor(null);
      setDraftPinned(false);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (n: DeliverableNote) => {
    setBusy(true); setErr(null);
    try {
      await mutateDeliverable({ action: "update_note", note_id: n.id, note_pinned: !n.pinned });
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const changeColor = async (n: DeliverableNote, c: NoteColor | null) => {
    setBusy(true); setErr(null);
    try {
      await mutateDeliverable({ action: "update_note", note_id: n.id, note_color: c });
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const editNoteBody = async (n: DeliverableNote) => {
    const next = window.prompt("Edit note", n.body);
    if (next === null) return;
    const text = next.trim();
    if (!text || text === n.body) return;
    setBusy(true); setErr(null);
    try {
      await mutateDeliverable({ action: "update_note", note_id: n.id, note_body: text });
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const deleteNote = async (n: DeliverableNote) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setBusy(true); setErr(null);
    try {
      await mutateDeliverable({ action: "delete_note", note_id: n.id });
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  // Sort: pinned first, then newest
  const sorted = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [notes]);

  return (
    <div className="notes-pane" style={{ marginTop: 14 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <div className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5 }}>
          NOTES · {sorted.length}
        </div>
      </div>

      {/* Composer */}
      <div style={{
        border: "1px solid var(--border-strong)",
        borderRadius: 4, padding: 10, marginBottom: 10,
        background: "var(--bg-elev)",
      }}>
        <textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          placeholder="Drop a quick note — context, decision, gotcha, anything worth pinning…"
          rows={2}
          disabled={busy}
          style={{
            width: "100%", resize: "vertical", minHeight: 50,
            background: "var(--bg)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 3,
            padding: 8, fontSize: 13, fontFamily: "inherit",
            outline: "none",
          }}
        />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, marginTop: 8, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {COLORS.map((c) => (
              <button
                key={c.value ?? "default"}
                type="button"
                title={c.label}
                onClick={() => setDraftColor(c.value)}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c.swatch,
                  border: draftColor === c.value
                    ? "2px solid var(--text)"
                    : "1px solid var(--border-strong)",
                  cursor: "pointer", padding: 0,
                }}
              />
            ))}
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              marginLeft: 8, fontSize: 11, color: "var(--text-dim)",
              cursor: "pointer", userSelect: "none",
            }}>
              <input
                type="checkbox"
                checked={draftPinned}
                onChange={(e) => setDraftPinned(e.target.checked)}
                disabled={busy}
              />
              Pin
            </label>
          </div>
          <button
            className="btn primary sm"
            onClick={addNote}
            disabled={busy || !draftBody.trim()}
          >
            {busy ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>

      {err && (
        <div className="error-banner" style={{ margin: "0 0 10px 0" }}>{err}</div>
      )}

      {loading && <div className="dim" style={{ fontSize: 12 }}>Loading notes…</div>}

      {!loading && sorted.length === 0 && (
        <div className="dim" style={{ fontSize: 12, fontStyle: "italic", padding: "6px 0" }}>
          No notes yet. Notes are good for context that doesn't belong in a chat comment.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((n) => {
          const author = n.author_user_id ? users[n.author_user_id] : null;
          const editable = canEditNote(n);
          return (
            <div
              key={n.id}
              style={{
                position: "relative",
                background: bgForColor(n.color),
                border: `1px solid ${borderForColor(n.color)}`,
                borderRadius: 4,
                padding: "10px 12px",
              }}
            >
              {n.pinned && (
                <div style={{
                  position: "absolute", top: 8, right: 10,
                  fontSize: 9, letterSpacing: 1.5, fontFamily: "var(--mono)",
                  color: "var(--gold)", fontWeight: 700,
                }}>★ PINNED</div>
              )}
              <div style={{
                fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                paddingRight: n.pinned ? 70 : 0,
              }}>
                {n.body}
              </div>
              <div style={{
                marginTop: 6, display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 8, flexWrap: "wrap",
              }}>
                <div className="dim mono" style={{ fontSize: 10 }}>
                  {author?.full_name ?? "Unknown"} · {fmtRelativeTime(n.created_at)}
                  {n.updated_at !== n.created_at && " · edited"}
                </div>
                {editable && (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {/* Color picker, compact */}
                    {COLORS.map((c) => (
                      <button
                        key={c.value ?? "default"}
                        type="button"
                        title={c.label}
                        onClick={() => changeColor(n, c.value)}
                        style={{
                          width: 12, height: 12, borderRadius: "50%",
                          background: c.swatch,
                          border: n.color === c.value
                            ? "2px solid var(--text)"
                            : "1px solid var(--border-strong)",
                          cursor: "pointer", padding: 0,
                        }}
                      />
                    ))}
                    <button
                      className={cls("btn ghost sm", n.pinned && "primary")}
                      onClick={() => togglePin(n)}
                      disabled={busy}
                      style={{ fontSize: 10, padding: "2px 6px" }}
                    >
                      {n.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => editNoteBody(n)}
                      disabled={busy}
                      style={{ fontSize: 10, padding: "2px 6px" }}
                    >Edit</button>
                    <button
                      className="btn ghost sm danger"
                      onClick={() => deleteNote(n)}
                      disabled={busy}
                      style={{ fontSize: 10, padding: "2px 6px" }}
                    >Del</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
