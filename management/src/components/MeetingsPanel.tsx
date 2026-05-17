// MeetingsPanel — When2Meet-style availability polls scoped to a project.
//
// One project can host any number of polls. Each poll defines a date
// range, working-hours window, and slot granularity (15/30/60/120 min).
// Every project member can mark their availability across the grid:
// green = available, yellow = maybe, blank = not available.
//
// The panel surfaces three useful views simultaneously:
//   1. Your own grid -- click slots to toggle (cycles thru no -> avail
//      -> maybe -> no). Save persists to the server.
//   2. Group heatmap -- darker green = more people available. Always
//      computed client-side from the responses payload, no RPC needed.
//   3. Coverage summary -- top 5 slots by "everyone is available", plus
//      a list of members who haven't responded yet.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminMutate } from "../lib/api";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type { MeetingPoll, MeetingResponse, ProjectMember, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls, fmtRelativeTime, today } from "../lib/util";

interface MeetingsPanelProps {
  projectId: string;
  currentUser: User;
  users: Record<string, UserLite>;
  projectMembers: ProjectMember[];
}

// Status used in our local edit buffer + render.
type Slot = "free" | "yes" | "maybe";

function fmtDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtSlotLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** Build the array of slot start-times for a poll, in local time. */
function buildSlots(poll: MeetingPoll): { days: Date[]; slotsPerDay: string[][] } {
  const start = parseISODate(poll.date_from);
  const end = parseISODate(poll.date_to);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const slotsPerDay: string[][] = days.map((day) => {
    const arr: string[] = [];
    for (let h = poll.day_start_hour; h < poll.day_end_hour; h += poll.slot_minutes / 60) {
      const hour = Math.floor(h);
      const minute = Math.round((h - hour) * 60);
      const dt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0);
      arr.push(dt.toISOString());
    }
    return arr;
  });
  return { days, slotsPerDay };
}

export function MeetingsPanel({ projectId, currentUser, users, projectMembers }: MeetingsPanelProps) {
  const [polls, setPolls] = useState<MeetingPoll[]>([]);
  const [responses, setResponses] = useState<MeetingResponse[]>([]);
  const [openPollId, setOpenPollId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useRealtimeRefresh(refresh);

  // Local edit buffer for the open poll. Keyed by slot ISO -> Slot status.
  // We populate it from the user's saved response when a poll opens; on
  // Save we diff back into available/maybe arrays.
  const [edit, setEdit] = useState<Record<string, Slot>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const sb = getClient();
        // 1. Polls for THIS project only.
        const pRes = await sb.from("meeting_polls").select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (!alive) return;
        if (pRes.error) throw pRes.error;
        const projectPolls = (pRes.data ?? []) as MeetingPoll[];
        setPolls(projectPolls);

        // 2. Responses scoped to those poll ids (was an unbounded full-
        // table fetch — correctness + scale risk). Empty project => skip.
        const pollIds = projectPolls.map((p) => p.id);
        if (pollIds.length === 0) {
          setResponses([]);
        } else {
          const rRes = await sb.from("meeting_responses").select("*")
            .in("poll_id", pollIds);
          if (!alive) return;
          if (rRes.error) throw rRes.error;
          setResponses((rRes.data ?? []) as MeetingResponse[]);
        }
        setErr(null);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId, tick]);

  // Once polls + responses are loaded and we have an open poll, hydrate
  // the local edit buffer from the user's saved response (or empty).
  useEffect(() => {
    if (!openPollId) { setEdit({}); return; }
    const mine = responses.find((r) => r.poll_id === openPollId && r.user_id === currentUser.id);
    if (!mine) { setEdit({}); return; }
    const next: Record<string, Slot> = {};
    for (const s of mine.available_slots || []) next[s] = "yes";
    for (const s of mine.maybe_slots || [])     next[s] = "maybe";
    setEdit(next);
  }, [openPollId, responses, currentUser.id]);

  const openPoll = openPollId ? polls.find((p) => p.id === openPollId) ?? null : null;

  // Only members of THIS project can fill the poll.
  const memberIds = useMemo(
    () => new Set(projectMembers.map((m) => m.user_id)),
    [projectMembers],
  );

  // Helpers for the open poll.
  const grid = useMemo(() => openPoll ? buildSlots(openPoll) : null, [openPoll]);

  const pollResponses = useMemo(
    () => openPollId ? responses.filter((r) => r.poll_id === openPollId) : [],
    [responses, openPollId],
  );

  // Aggregate slot -> { yes: count, maybe: count, names: [] }
  const heatmap = useMemo(() => {
    const map = new Map<string, { yes: number; maybe: number; users: string[] }>();
    for (const r of pollResponses) {
      for (const s of r.available_slots || []) {
        const cell = map.get(s) ?? { yes: 0, maybe: 0, users: [] };
        cell.yes += 1;
        cell.users.push(r.user_id);
        map.set(s, cell);
      }
      for (const s of r.maybe_slots || []) {
        const cell = map.get(s) ?? { yes: 0, maybe: 0, users: [] };
        cell.maybe += 1;
        cell.users.push(r.user_id);
        map.set(s, cell);
      }
    }
    return map;
  }, [pollResponses]);

  // Members who haven't filled their availability yet.
  const responseUserIds = useMemo(
    () => new Set(pollResponses.map((r) => r.user_id)),
    [pollResponses],
  );
  const memberRows = useMemo(
    () => projectMembers
      .map((m) => users[m.user_id])
      .filter((u): u is UserLite => Boolean(u))
      .sort((a, b) => (a.full_name).localeCompare(b.full_name)),
    [projectMembers, users],
  );

  // Top 5 slots ranked by yes-count, then yes+maybe count.
  const topSlots = useMemo(() => {
    if (!grid) return [];
    const all: Array<{ iso: string; yes: number; maybe: number }> = [];
    for (const dayArr of grid.slotsPerDay) {
      for (const iso of dayArr) {
        const cell = heatmap.get(iso) ?? { yes: 0, maybe: 0, users: [] };
        if (cell.yes + cell.maybe === 0) continue;
        all.push({ iso, yes: cell.yes, maybe: cell.maybe });
      }
    }
    all.sort((a, b) => (b.yes - a.yes) || (b.maybe - a.maybe));
    return all.slice(0, 5);
  }, [grid, heatmap]);

  const cycleSlot = (iso: string) => {
    setEdit((prev) => {
      const cur = prev[iso];
      const next: Record<string, Slot> = { ...prev };
      if (!cur) next[iso] = "yes";
      else if (cur === "yes") next[iso] = "maybe";
      else delete next[iso];
      return next;
    });
  };

  const saveMyResponse = async () => {
    if (!openPoll) return;
    setBusy(true); setErr(null);
    try {
      const available_slots: string[] = [];
      const maybe_slots: string[] = [];
      for (const [iso, status] of Object.entries(edit)) {
        if (status === "yes") available_slots.push(iso);
        else if (status === "maybe") maybe_slots.push(iso);
      }
      await adminMutate({
        action: "meeting_set_availability",
        poll_id: openPoll.id,
        available_slots,
        maybe_slots,
      });
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deletePoll = async (poll: MeetingPoll) => {
    if (!confirm(`Delete "${poll.title}"? All responses are removed too.`)) return;
    setBusy(true); setErr(null);
    try {
      await adminMutate({ action: "meeting_delete", poll_id: poll.id });
      if (openPollId === poll.id) setOpenPollId(null);
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const togglePollState = async (poll: MeetingPoll) => {
    setBusy(true); setErr(null);
    try {
      await adminMutate({
        action: "meeting_set_state",
        poll_id: poll.id,
        poll_state: poll.state === "open" ? "closed" : "open",
      });
      refresh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  // Render helpers for the user's grid cell.
  function cellStyle(status: Slot | undefined, count: { yes: number; maybe: number } | undefined): React.CSSProperties {
    let bg = "var(--bg-elev)";
    let border = "1px solid var(--border)";
    if (count && count.yes + count.maybe > 0) {
      // Heat scale: % of project members available.
      const denom = Math.max(1, memberRows.length);
      const ratio = count.yes / denom;
      // 0 -> very faint, 1 -> saturated green
      const alpha = 0.15 + Math.min(0.65, ratio * 0.8);
      bg = `rgba(34, 197, 94, ${alpha})`;
    }
    if (status === "yes")   { bg = "var(--positive)"; border = "1px solid var(--positive)"; }
    if (status === "maybe") { bg = "var(--amber)";    border = "1px solid var(--amber)"; }
    return { background: bg, border };
  }

  // ── Create-poll inline form (no separate file, kept inline for clarity)
  function CreatePollForm({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [dateFrom, setDateFrom] = useState(today());
    const [dateTo, setDateTo] = useState(() => {
      const t = parseISODate(today());
      t.setDate(t.getDate() + 6);
      return fmtDateInput(t);
    });
    const [slotMinutes, setSlotMinutes] = useState<60 | 30 | 15 | 120>(60);
    const [startH, setStartH] = useState(8);
    const [endH, setEndH] = useState(20);
    const [creating, setCreating] = useState(false);
    const [formErr, setFormErr] = useState<string | null>(null);

    const submit = async () => {
      const t = title.trim();
      if (!t) { setFormErr("title required"); return; }
      if (dateFrom > dateTo) { setFormErr("end date must be on or after start"); return; }
      if (startH >= endH) { setFormErr("end hour must be after start hour"); return; }
      setCreating(true); setFormErr(null);
      try {
        await adminMutate({
          action: "meeting_create",
          project_id: projectId,
          poll_title: t,
          poll_date_from: dateFrom,
          poll_date_to: dateTo,
          poll_slot_minutes: slotMinutes,
          poll_day_start_hour: startH,
          poll_day_end_hour: endH,
        });
        onClose();
        refresh();
      } catch (e) {
        setFormErr((e as Error).message);
      } finally { setCreating(false); }
    };

    return (
      <div style={{
        border: "1px solid var(--border-strong)", borderRadius: 4,
        padding: 12, marginBottom: 12, background: "var(--bg-elev)",
      }}>
        <div className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
          NEW MEETING POLL
        </div>
        {formErr && <div className="error-banner" style={{ margin: "0 0 8px 0" }}>{formErr}</div>}
        <div className="field" style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10 }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kickoff sync · IM review · Brainstorm" autoFocus />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label style={{ fontSize: 10 }}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label style={{ fontSize: 10 }}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label style={{ fontSize: 10 }}>Slot</label>
            <select value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value) as 15 | 30 | 60 | 120)}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={120}>2 hr</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label style={{ fontSize: 10 }}>Day starts</label>
            <select value={startH} onChange={(e) => setStartH(Number(e.target.value))}>
              {Array.from({ length: 23 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label style={{ fontSize: 10 }}>Day ends</label>
            <select value={endH} onChange={(e) => setEndH(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="btn ghost sm" onClick={onClose} disabled={creating}>Cancel</button>
          <button className="btn primary sm" onClick={submit} disabled={creating || !title.trim()}>
            {creating ? "Creating…" : "Create poll"}
          </button>
        </div>
      </div>
    );
  }

  // ── Top-level render ──────────────────────────────────────────────

  const isMember = memberIds.has(currentUser.id) ||
    currentUser.role === "admin" || currentUser.role === "management";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5 }}>
          MEETING POLLS · {polls.length}
        </div>
        {isMember && (
          <button className="btn primary sm" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "× Close" : "+ New poll"}
          </button>
        )}
      </div>

      {err && <div className="error-banner" style={{ margin: 0 }}>{err}</div>}

      {showCreate && <CreatePollForm onClose={() => setShowCreate(false)} />}

      {loading && <div className="dim" style={{ fontSize: 12 }}>Loading polls…</div>}

      {!loading && polls.length === 0 && !showCreate && (
        <div className="dim" style={{ fontSize: 12, fontStyle: "italic" }}>
          No polls yet. Create one to find a meeting time everyone can make.
        </div>
      )}

      {/* Poll list */}
      {!openPoll && polls.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {polls.map((p) => {
            const filled = responses.filter((r) => r.poll_id === p.id).length;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, padding: "8px 10px",
                  border: "1px solid var(--border)", borderRadius: 3,
                  background: "var(--bg-elev)", cursor: "pointer",
                }}
                onClick={() => setOpenPollId(p.id)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {p.title}{" "}
                    <span className={cls("state-pill", p.state)} style={{ fontSize: 9, padding: "1px 6px", marginLeft: 6 }}>
                      {p.state}
                    </span>
                  </div>
                  <div className="dim mono" style={{ fontSize: 10, marginTop: 2 }}>
                    {p.date_from} → {p.date_to} · {p.slot_minutes}min · {p.day_start_hour.toString().padStart(2, "0")}:00–{p.day_end_hour.toString().padStart(2, "0")}:00 · {filled}/{memberRows.length} filled
                  </div>
                </div>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setOpenPollId(p.id); }}>
                  Open →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Poll detail */}
      {openPoll && grid && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{openPoll.title}</div>
              <div className="dim mono" style={{ fontSize: 10 }}>
                {openPoll.date_from} → {openPoll.date_to} · {openPoll.slot_minutes}min slots ·
                {" "}{openPoll.day_start_hour.toString().padStart(2, "0")}:00–{openPoll.day_end_hour.toString().padStart(2, "0")}:00
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button className="btn ghost sm" onClick={() => togglePollState(openPoll)} disabled={busy}>
                {openPoll.state === "open" ? "Close" : "Reopen"}
              </button>
              <button className="btn ghost sm danger" onClick={() => deletePoll(openPoll)} disabled={busy}>Delete</button>
              <button className="btn ghost sm" onClick={() => setOpenPollId(null)}>← back</button>
            </div>
          </div>

          {/* Best slots summary */}
          {topSlots.length > 0 && (
            <div style={{
              marginBottom: 10, padding: 8,
              border: "1px solid var(--accent-dim)",
              borderRadius: 3, background: "rgba(74, 158, 255, 0.06)",
            }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--accent)", marginBottom: 4 }}>
                BEST SLOTS · top {topSlots.length}
              </div>
              <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12 }}>
                {topSlots.map((s) => {
                  const d = new Date(s.iso);
                  return (
                    <li key={s.iso} style={{ marginBottom: 2 }}>
                      <b>{d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</b>{" "}
                      {fmtSlotLabel(s.iso)}
                      <span className="dim mono" style={{ fontSize: 10, marginLeft: 6 }}>
                        {s.yes} yes · {s.maybe} maybe · {memberRows.length - s.yes - s.maybe} no/blank
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Who hasn't responded */}
          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <span className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5 }}>COVERAGE · </span>
            <b>{pollResponses.length}</b>/{memberRows.length} filled.
            {(() => {
              const missing = memberRows.filter((u) => !responseUserIds.has(u.id));
              if (missing.length === 0) return <span style={{ color: "var(--positive)" }}> Everyone has responded.</span>;
              return (
                <span className="dim" style={{ marginLeft: 4 }}>
                  Waiting on: {missing.map((u) => u.full_name).join(", ")}
                </span>
              );
            })()}
          </div>

          {/* Grid: legend + table */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, fontSize: 11 }}>
            <span className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5 }}>CLICK TO CYCLE</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: "var(--positive)", borderRadius: 2 }} /> available
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: "var(--amber)", borderRadius: 2 }} /> maybe
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: "rgba(34,197,94,0.35)", border: "1px solid var(--border)", borderRadius: 2 }} /> heatmap (group)
            </span>
          </div>

          <div style={{ overflowX: "auto", marginBottom: 10 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "var(--bg-elev)", padding: "4px 6px", textAlign: "right" }}></th>
                  {grid.days.map((d, i) => (
                    <th key={i} style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)", textAlign: "left", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)" }}>
                      {fmtDayLabel(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.slotsPerDay[0]?.map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    <td style={{ padding: "2px 6px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--text-faint)", fontSize: 10, whiteSpace: "nowrap" }}>
                      {fmtSlotLabel(grid.slotsPerDay[0][rowIdx])}
                    </td>
                    {grid.slotsPerDay.map((dayArr, colIdx) => {
                      const iso = dayArr[rowIdx];
                      const cell = heatmap.get(iso);
                      const status = edit[iso];
                      return (
                        <td key={colIdx} style={{ padding: 1 }}>
                          <div
                            onClick={() => isMember && cycleSlot(iso)}
                            title={`${fmtDayLabel(new Date(iso))} ${fmtSlotLabel(iso)}\n${(cell?.yes ?? 0)} available · ${(cell?.maybe ?? 0)} maybe`}
                            style={{
                              width: 36, height: 18,
                              cursor: isMember ? "pointer" : "default",
                              ...cellStyle(status, cell),
                              borderRadius: 2,
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isMember && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button
                className="btn ghost sm"
                onClick={() => {
                  // Mark all heatmap-popular slots as yes -- "fit me in
                  // wherever everyone else is" shortcut.
                  const next: Record<string, Slot> = {};
                  for (const dayArr of grid.slotsPerDay) {
                    for (const iso of dayArr) next[iso] = "yes";
                  }
                  setEdit(next);
                }}
                disabled={busy}
              >Select all</button>
              <button
                className="btn ghost sm"
                onClick={() => setEdit({})}
                disabled={busy}
              >Clear</button>
              <button
                className="btn primary sm"
                onClick={saveMyResponse}
                disabled={busy}
              >
                {busy ? "Saving…" : "Save my availability"}
              </button>
            </div>
          )}

          {/* Responses list */}
          <div style={{ marginTop: 12 }}>
            <div className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5, marginBottom: 4 }}>
              RESPONSES
            </div>
            {pollResponses.length === 0 && (
              <div className="dim" style={{ fontSize: 12, fontStyle: "italic" }}>No responses yet.</div>
            )}
            {pollResponses.map((r) => {
              const u = users[r.user_id];
              return (
                <div key={r.user_id} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 11, padding: "3px 0",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <span>{u?.full_name ?? r.user_id.slice(0, 8)}</span>
                  <span className="dim mono">
                    {r.available_slots.length} yes · {r.maybe_slots.length} maybe · {fmtRelativeTime(r.updated_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
