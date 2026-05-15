import { useCallback, useEffect, useRef, useState } from "react";
import { adminMutate, mutateDeliverable } from "../lib/api";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import { MembersModal } from "./MembersModal";
import { EventsList } from "./EventsList";
import { CalendarView } from "./CalendarView";
import { CreateTaskModal } from "./CreateTaskModal";
import { NotesPane } from "./NotesPane";
import type {
  ActivityLogRow, Comment, DeliverableOwner, DeliverableStatusView,
  Project, ProjectEvent, ProjectEventAttendee, ProjectMember, User,
} from "../lib/types";
import {
  cls, daysBetween, fmtDate, fmtDateLong, fmtRelativeTime,
  KIND_LABELS, STATE_LABELS, today,
} from "../lib/util";

interface ProjectTabProps {
  projectId: string;
  user: User;
  onDeleted?: (projectId: string) => void;
}

interface UserLite {
  id: string;
  username: string;
  full_name: string;
  division: string | null;
  title: string | null;
  role: string;
}

export function ProjectTab({ projectId, user, onDeleted }: ProjectTabProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [deliverables, setDeliverables] = useState<DeliverableStatusView[]>([]);
  const [owners, setOwners] = useState<DeliverableOwner[]>([]);
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<Record<string, UserLite>>({});
  const [approvers, setApprovers] = useState<Array<{ division: string; user_id: string }>>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [eventAttendees, setEventAttendees] = useState<ProjectEventAttendee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [view, setView] = useState<"schedule" | "calendar">("schedule");
  const [horizonChoice, setHorizonChoice] = useState<"15" | "22" | "30" | "60" | "90" | "auto">("22");
  // Resizable panes — Gantt height vs body, dlv-list vs right-rail width.
  const [ganttHeight, setGanttHeight] = useState<number>(() => {
    const v = Number(localStorage.getItem("lbc.mgmt.ganttHeight"));
    return Number.isFinite(v) && v > 0 ? v : 320;
  });
  const [rightRailWidth, setRightRailWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem("lbc.mgmt.rightRailWidth"));
    return Number.isFinite(v) && v > 0 ? v : 320;
  });
  const [resizing, setResizing] = useState<"gantt" | "rail" | null>(null);
  const dragStart = useRef({ y: 0, h: 0, x: 0, w: 0 });

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useRealtimeRefresh(refresh);

  // Drag-resize wiring: global mousemove/mouseup while a divider is held down.
  useEffect(() => {
    if (!resizing) return;
    document.body.style.userSelect = "none";
    document.body.style.cursor = resizing === "gantt" ? "row-resize" : "col-resize";
    const onMove = (e: MouseEvent) => {
      if (resizing === "gantt") {
        const next = Math.max(160, Math.min(900, dragStart.current.h + (e.clientY - dragStart.current.y)));
        setGanttHeight(next);
      } else {
        const next = Math.max(240, Math.min(640, dragStart.current.w - (e.clientX - dragStart.current.x)));
        setRightRailWidth(next);
      }
    };
    const onUp = () => setResizing(null);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [resizing]);

  useEffect(() => { localStorage.setItem("lbc.mgmt.ganttHeight", String(ganttHeight)); }, [ganttHeight]);
  useEffect(() => { localStorage.setItem("lbc.mgmt.rightRailWidth", String(rightRailWidth)); }, [rightRailWidth]);

  const startGanttResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { y: e.clientY, h: ganttHeight, x: 0, w: 0 };
    setResizing("gantt");
  };
  const startRailResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { y: 0, h: 0, x: e.clientX, w: rightRailWidth };
    setResizing("rail");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getClient();
        const [pRes, dRes, oRes, aRes, cRes, uRes, apRes, mRes, eRes, eaRes] = await Promise.all([
          sb.from("projects").select("*").eq("id", projectId).maybeSingle(),
          sb.from("v_deliverable_status").select("*").eq("project_id", projectId).order("due_date"),
          sb.from("deliverable_owners").select("*"),
          sb.from("activity_log").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
          sb.from("comments").select("*"),
          sb.from("users_lite").select("id, username, full_name, division, title, role"),
          sb.from("project_approvers").select("division, user_id").eq("project_id", projectId),
          sb.from("project_members").select("*").eq("project_id", projectId),
          sb.from("project_events").select("*").eq("project_id", projectId),
          sb.from("project_event_attendees").select("*"),
        ]);
        if (!alive) return;

        if (pRes.error) throw pRes.error;
        setProject(pRes.data as Project);
        setDeliverables((dRes.data ?? []) as DeliverableStatusView[]);
        setOwners((oRes.data ?? []) as DeliverableOwner[]);
        setActivity((aRes.data ?? []) as ActivityLogRow[]);
        setComments((cRes.data ?? []) as Comment[]);
        const userMap: Record<string, UserLite> = {};
        for (const u of (uRes.data ?? []) as UserLite[]) userMap[u.id] = u;
        setUsers(userMap);
        setApprovers((apRes.data ?? []) as Array<{ division: string; user_id: string }>);
        setMembers((mRes.data ?? []) as ProjectMember[]);
        const allEvents = (eRes.data ?? []) as ProjectEvent[];
        setEvents(allEvents);
        const eventIds = new Set(allEvents.map((e) => e.id));
        setEventAttendees(((eaRes.data ?? []) as ProjectEventAttendee[]).filter((a) => eventIds.has(a.event_id)));
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, [projectId, tick]);

  if (err) return <div className="error-banner">{err}</div>;
  if (!project) return <div className="loading">Loading {projectId}…</div>;

  const dlvIds = new Set(deliverables.map((d) => d.id));
  const projectOwners = owners.filter((o) => dlvIds.has(o.deliverable_id));
  const projectComments = comments.filter((c) => dlvIds.has(c.deliverable_id));

  const selected = selectedId ? deliverables.find((d) => d.id === selectedId) ?? null : null;
  const selectedComments = selected
    ? projectComments.filter((c) => c.deliverable_id === selected.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  const runMutation = async (input: Parameters<typeof mutateDeliverable>[0]) => {
    setBusy(true);
    setErr(null);
    try {
      await mutateDeliverable(input);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dayZero = project.day_zero;
  // Horizon: fixed choice OR "auto" (longest due_date + 5-day buffer, min 22).
  const latestDueOffset = deliverables.reduce(
    (mx, d) => Math.max(mx, daysBetween(dayZero, d.due_date)),
    0,
  );
  const horizonDays = horizonChoice === "auto"
    ? Math.max(22, latestDueOffset + 5)
    : Number(horizonChoice);
  const todayOffset = Math.max(0, Math.min(horizonDays, daysBetween(dayZero, today())));

  return (
    <div className="proj-wrap">
      <div className="proj-header">
        <div>
          <div className="pid">{project.id}</div>
          <div className="theme">{project.theme}</div>
        </div>
        <div className="proj-header-right">
          <div className="meta">
            <span><b>D0:</b> {fmtDateLong(project.day_zero)}</span>
            <span><b>Type:</b> {project.project_type}</span>
            <span><b>Visibility:</b> {project.visibility}</span>
            <span><b>Status:</b> {project.status}</span>
          </div>
          {(
            user.role === "admin" ||
            user.role === "management" ||
            members.some((m) => m.user_id === user.id)
          ) && (
            <div className="proj-actions">
              <button
                className="btn primary sm"
                disabled={busy}
                onClick={() => setShowCreateTask(true)}
                title="Add a custom task / sub-deliverable"
              >
                + Task
              </button>
              {(user.role === "admin" || user.role === "management") && (
                <>
                <button className="btn ghost sm" disabled={busy} onClick={() => setShowMembers(true)}>
                  Members
                </button>
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={async () => {
                    const next = window.prompt(
                      `Rename ${project.id}\n\nCurrent name:\n${project.theme}\n\nNew name:`,
                      project.theme,
                    );
                    if (next === null) return;
                    const trimmed = next.trim();
                    if (!trimmed || trimmed === project.theme) return;
                    setBusy(true);
                    try {
                      await adminMutate({
                        action: "project_set_theme",
                        project_id: project.id,
                        theme: trimmed,
                      });
                      refresh();
                    } catch (e) { setErr((e as Error).message); }
                    finally { setBusy(false); }
                  }}
                >
                  Rename
                </button>
              {project.status === "active" ? (
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminMutate({
                        action: "project_set_status",
                        project_id: project.id,
                        status: "completed",
                      });
                      refresh();
                    } catch (e) { setErr((e as Error).message); }
                    finally { setBusy(false); }
                  }}
                >
                  Mark completed
                </button>
              ) : (
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminMutate({
                        action: "project_set_status",
                        project_id: project.id,
                        status: "active",
                      });
                      refresh();
                    } catch (e) { setErr((e as Error).message); }
                    finally { setBusy(false); }
                  }}
                >
                  Reactivate
                </button>
              )}
              {project.status !== "archived" && (
                <button
                  className="btn ghost sm danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Archive ${project.id}? It can be restored from the admin panel.`)) return;
                    setBusy(true);
                    try {
                      await adminMutate({
                        action: "project_set_status",
                        project_id: project.id,
                        status: "archived",
                      });
                      refresh();
                    } catch (e) { setErr((e as Error).message); }
                    finally { setBusy(false); }
                  }}
                >
                  Archive
                </button>
              )}
              <button
                className="btn ghost sm danger"
                disabled={busy}
                onClick={async () => {
                  const typed = window.prompt(
                    `DELETE ${project.id}\n\n` +
                      `This is irreversible. All deliverables, comments, ` +
                      `events, members, and the activity log for this ` +
                      `project will be removed.\n\n` +
                      `Type the project ID (${project.id}) to confirm:`,
                  );
                  if (typed === null) return;
                  if (typed.trim() !== project.id) {
                    setErr(`Delete cancelled: typed value didn't match ${project.id}.`);
                    return;
                  }
                  setBusy(true);
                  try {
                    await adminMutate({
                      action: "project_delete",
                      project_id: project.id,
                    });
                    onDeleted?.(project.id);
                  } catch (e) { setErr((e as Error).message); }
                  finally { setBusy(false); }
                }}
              >
                Delete
              </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showMembers && (
        <MembersModal
          project={project}
          currentUser={user}
          onClose={() => setShowMembers(false)}
          onChanged={refresh}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          projectId={project.id}
          projectDayZero={project.day_zero}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); refresh(); }}
        />
      )}

      <div className="view-switcher">
        <button
          type="button"
          className={cls("view-tab", view === "schedule" && "active")}
          onClick={() => setView("schedule")}
        >
          Gantt
        </button>
        <button
          type="button"
          className={cls("view-tab", view === "calendar" && "active")}
          onClick={() => setView("calendar")}
        >
          Calendar
        </button>
        <div style={{ flex: 1 }} />
        {view === "schedule" && (
          <label className="horizon-picker mono">
            Horizon
            <select
              value={horizonChoice}
              onChange={(e) => setHorizonChoice(e.target.value as typeof horizonChoice)}
            >
              <option value="15">15 days</option>
              <option value="22">22 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="auto">Auto-fit</option>
            </select>
          </label>
        )}
      </div>

      {view === "calendar" && (
        <CalendarView
          project={project}
          deliverables={deliverables}
          events={events}
          eventAttendees={eventAttendees}
          users={users}
          onSelectDeliverable={(id) => { setSelectedId(id); setView("schedule"); }}
        />
      )}

      {view === "schedule" && (
      <>
      <div
        className="gantt"
        style={{
          ["--horizon" as never]: horizonDays,
          height: `${ganttHeight}px`,
        }}
      >
        <div className="gantt-axis">
          <div className="gantt-axis-spacer" />
          <div className="gantt-axis-cells">
            {Array.from({ length: horizonDays }, (_, i) => {
              const d = new Date(dayZero + "T00:00:00Z");
              d.setUTCDate(d.getUTCDate() + i);
              const dayNum = d.getUTCDate();
              const weekday = d.toLocaleDateString("en", { weekday: "short" })[0];
              const month = d.toLocaleDateString("en", { month: "short" });
              const isFirstOfMonth = dayNum === 1;
              const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
              const isToday = i === todayOffset;
              return (
                <div
                  key={i}
                  className={cls(
                    "gantt-axis-cell",
                    isWeekend && "weekend",
                    isToday && "today",
                    isFirstOfMonth && "month-start",
                  )}
                  title={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                >
                  <div className="gantt-axis-weekday">{weekday}</div>
                  <div className="gantt-axis-day">
                    {isFirstOfMonth ? `${month} ${dayNum}` : dayNum}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {deliverables.map((d) => {
          const offset = daysBetween(dayZero, d.due_date);
          // Center the bar inside its day-cell (cell N spans N/22 .. (N+1)/22).
          const cellWidth = 100 / horizonDays;
          const cellCenter = (offset + 0.5) * cellWidth;
          const widthPct = Math.min(cellWidth * 2.4, 12);
          const startPct = Math.max(0, Math.min(100 - widthPct, cellCenter - widthPct / 2));
          const isSelected = selectedId === d.id;
          return (
            <div className="gantt-row" key={d.id}>
              <div className="gantt-label">
                <span className={`division-pill div-${d.division}`}>{d.division}</span>{" "}
                {KIND_LABELS[d.kind] ?? d.kind}
                {d.sequence_no > 1 && ` #${d.sequence_no}`}
              </div>
              <div className="gantt-track">
                <button
                  type="button"
                  className={cls(
                    "gantt-bar",
                    d.blocked ? "blocked" : d.health,
                    `div-${d.division}`,
                    isSelected && "selected",
                  )}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  title={`${KIND_LABELS[d.kind] ?? d.kind} · due ${fmtDate(d.due_date)} · ${d.blocked ? "blocked" : d.health}`}
                  onClick={() => setSelectedId(d.id)}
                >
                  <span className="gantt-bar-day">D{offset}</span>
                  <span className="gantt-bar-date">{fmtDate(d.due_date)}</span>
                </button>
                <div className="gantt-today" style={{ left: `${((todayOffset + 0.5) / horizonDays) * 100}%` }} title={`Today · D${todayOffset}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cls("pane-divider pane-divider-h", resizing === "gantt" && "active")}
        onMouseDown={startGanttResize}
        title="Drag to resize Gantt"
      />

      <div
        className="proj-body"
        style={{ ["--right-rail" as never]: `${rightRailWidth}px` }}
      >
        <div className="dlv-list">
          {deliverables.map((d) => {
            const ownerNames = projectOwners
              .filter((o) => o.deliverable_id === d.id)
              .map((o) => users[o.user_id]?.username ?? "?")
              .join(", ");
            return (
              <div
                key={d.id}
                className={cls("dlv-row", selectedId === d.id && "selected")}
                onClick={() => setSelectedId(d.id)}
              >
                <div className="kind">
                  {KIND_LABELS[d.kind] ?? d.kind}
                  {d.sequence_no > 1 && ` ${d.sequence_no}`}
                </div>
                <div>
                  <div className="title">{d.title ?? d.kind}</div>
                  <div className="owners">{ownerNames || "—"}</div>
                </div>
                <div className="division">
                  <span className={`division-pill div-${d.division}`}>{d.division}</span>
                </div>
                <div className="due">
                  {(user.role === "admin" || user.role === "management") ? (
                    <input
                      type="date"
                      className="due-edit"
                      value={d.due_date}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        e.stopPropagation();
                        const next = e.target.value;
                        if (!next || next === d.due_date) return;
                        try {
                          await mutateDeliverable({
                            action: "set_due_date",
                            deliverable_id: d.id,
                            due_date: next,
                          });
                          refresh();
                        } catch (er) {
                          setErr((er as Error).message);
                        }
                      }}
                    />
                  ) : (
                    <span>{fmtDate(d.due_date)}</span>
                  )}
                  <span className="dim mono" style={{ fontSize: 9, marginLeft: 4 }}>
                    D{daysBetween(dayZero, d.due_date)}
                  </span>
                </div>
                <div>
                  <span className={cls("state-pill", d.blocked ? "blocked" : d.state)}>
                    {d.blocked ? "Blocked" : STATE_LABELS[d.state]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {d.revision_count > 0 && (
                    <span className="rev-badge">×{d.revision_count}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={cls("pane-divider pane-divider-v", resizing === "rail" && "active")}
          onMouseDown={startRailResize}
          title="Drag to resize side panel"
        />

        <div className="activity">
          {selected ? (
            <DeliverableDetail
              deliverable={selected}
              comments={selectedComments}
              users={users}
              owners={projectOwners.filter((o) => o.deliverable_id === selected.id)}
              approvers={approvers}
              currentUser={user}
              busy={busy}
              onSubmit={(body) => runMutation({ action: "submit", deliverable_id: selected.id, body })}
              onApprove={() => runMutation({ action: "approve", deliverable_id: selected.id })}
              onPublish={() => runMutation({ action: "publish", deliverable_id: selected.id })}
              onRevision={(body) => runMutation({ action: "request_revision", deliverable_id: selected.id, body })}
              onComment={(body) => runMutation({ action: "add_comment", deliverable_id: selected.id, body })}
              onBlock={(note) => runMutation({ action: "set_blocker", deliverable_id: selected.id, blocker_note: note })}
              onUnblock={() => runMutation({ action: "unblock", deliverable_id: selected.id })}
              onSetFile={(file_url, storage_path, file_name) =>
                runMutation({
                  action: "set_file",
                  deliverable_id: selected.id,
                  file_url, storage_path, file_name,
                })
              }
              onSetDivision={(division) =>
                runMutation({ action: "set_division", deliverable_id: selected.id, division })
              }
              onSetResponsibleDivisions={(divisions) =>
                runMutation({
                  action: "set_responsible_divisions",
                  deliverable_id: selected.id,
                  responsible_divisions: divisions,
                })
              }
              onSetTitle={(title) =>
                runMutation({ action: "set_title", deliverable_id: selected.id, title })
              }
              onSetDescription={(description) =>
                runMutation({ action: "set_description", deliverable_id: selected.id, description })
              }
              onSetDueDate={(due_date) =>
                runMutation({ action: "set_due_date", deliverable_id: selected.id, due_date })
              }
              onSetOwners={(owner_user_ids) =>
                runMutation({ action: "set_owners", deliverable_id: selected.id, owner_user_ids })
              }
              onDelete={async () => {
                if (!window.confirm(
                  `Delete this ${selected.kind === "CUSTOM" ? "task" : "deliverable"}?\n\n` +
                  `"${selected.title ?? selected.kind}" and all of its comments, notes, ` +
                  `attachments, and owner assignments will be removed. This cannot be undone.`,
                )) return;
                try {
                  await mutateDeliverable({ action: "delete_task", deliverable_id: selected.id });
                  setSelectedId(null);
                  refresh();
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
              projectMembers={members}
              onDeselect={() => setSelectedId(null)}
            />
          ) : (
            <>
              <EventsList
                projectId={projectId}
                events={events}
                attendees={eventAttendees}
                users={users}
                currentUser={user}
                canAdd={
                  user.role === "admin" ||
                  user.role === "management" ||
                  members.some((m) => m.user_id === user.id)
                }
                onChanged={refresh}
              />

              <div style={{ marginTop: 18 }}>
                <h3>Activity</h3>
                {activity.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>No activity yet.</div>
                )}
                {activity.map((a) => (
                  <div className="activity-item" key={a.id}>
                    <span className="who">{a.actor_user_id ? users[a.actor_user_id]?.username : "—"}</span>{" "}
                    <span className="what">{a.event_type.replace(/_/g, " ")}</span>
                    <span className="when">{fmtRelativeTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      </>
      )}

      {view === "calendar" && (
        <div className="proj-body">
          <div style={{ overflowY: "auto", padding: "10px 24px 24px" }}>
            {/* Calendar already rendered above */}
            <div className="dim" style={{ fontSize: 11, letterSpacing: 1, padding: 12 }}>
              Click any deliverable card to switch to the Gantt view and open its detail panel.
            </div>
          </div>
          <div className="activity">
            <EventsList
              projectId={projectId}
              events={events}
              attendees={eventAttendees}
              users={users}
              currentUser={user}
              canAdd={
                user.role === "admin" ||
                user.role === "management" ||
                members.some((m) => m.user_id === user.id)
              }
              onChanged={refresh}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  deliverable: DeliverableStatusView;
  comments: Comment[];
  users: Record<string, UserLite>;
  owners: DeliverableOwner[];
  approvers: Array<{ division: string; user_id: string }>;
  currentUser: User;
  busy: boolean;
  onSubmit: (body: string) => void;
  onApprove: () => void;
  onPublish: () => void;
  onRevision: (body: string) => void;
  onComment: (body: string) => void;
  onBlock: (note: string) => void;
  onUnblock: () => void;
  onSetFile: (
    file_url: string | null,
    storage_path: string | null,
    file_name: string | null,
  ) => void;
  onSetDivision: (division: "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE") => void;
  onSetResponsibleDivisions: (divisions: string[]) => void;
  onSetTitle: (title: string) => void;
  onSetDescription: (description: string | null) => void;
  onSetDueDate: (due_date: string) => void;
  onSetOwners: (owner_user_ids: string[]) => void;
  onDelete: () => void;
  projectMembers: ProjectMember[];
  onDeselect: () => void;
}

function DeliverableDetail(props: DetailProps) {
  const { deliverable: d, comments, users, owners, approvers, currentUser, busy, projectMembers } = props;
  const [draft, setDraft] = useState("");
  const [fileUrl, setFileUrl] = useState(d.file_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [showOwnersPicker, setShowOwnersPicker] = useState(false);
  const [descDraft, setDescDraft] = useState(d.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);

  // Reset description draft whenever the deliverable changes (so switching
  // between deliverables doesn't carry over the previous draft).
  useEffect(() => {
    setDescDraft(d.description ?? "");
    setEditingDesc(false);
    setShowOwnersPicker(false);
  }, [d.id, d.description]);

  const isOwner = owners.some((o) => o.user_id === currentUser.id);
  const approvalDivision = d.kind === "IM" ? "IM" : d.division;
  const isApprover = approvers.some(
    (a) => a.user_id === currentUser.id && a.division === approvalDivision,
  );

  const canSubmit = isOwner && (d.state === "not_started" || d.state === "in_progress");
  const canApprove = isApprover && d.state === "submitted";
  const canPublish = (isOwner || isApprover) && d.state === "approved" && d.kind.startsWith("PUB_");
  const canBlock = isOwner && !d.blocked;
  const canUnblock = (isOwner || isApprover) && d.blocked;
  const canEditMeta = currentUser.role === "admin" || currentUser.role === "management";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <h3 style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {KIND_LABELS[d.kind] ?? d.kind} {d.sequence_no > 1 && `#${d.sequence_no}`}
        </h3>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {canEditMeta && (
            <button
              className="btn ghost sm"
              disabled={busy}
              title="Rename"
              onClick={() => {
                const next = window.prompt("Rename this " +
                  (d.kind === "CUSTOM" ? "task" : "deliverable"),
                  d.title ?? d.kind);
                if (next === null) return;
                const trimmed = next.trim();
                if (!trimmed || trimmed === d.title) return;
                props.onSetTitle(trimmed);
              }}
            >Rename</button>
          )}
          {canEditMeta && (
            <button
              className="btn ghost sm"
              disabled={busy}
              onClick={() => setShowOwnersPicker((v) => !v)}
              title="Reassign owners"
            >Owners</button>
          )}
          {canEditMeta && (
            <button
              className="btn ghost sm danger"
              disabled={busy}
              onClick={props.onDelete}
              title="Delete this deliverable. All comments, notes, and attachments are removed too."
            >Delete</button>
          )}
          <button className="btn ghost sm" onClick={props.onDeselect}>← back</button>
        </div>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 600, marginBottom: 8,
        color: "var(--text)",
      }}>
        {d.title || (KIND_LABELS[d.kind] ?? d.kind)}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
        Due {fmtDateLong(d.due_date)}
        {canEditMeta && (
          <>
            {" · "}
            <input
              type="date"
              value={d.due_date}
              disabled={busy}
              onChange={(e) => {
                if (e.target.value && e.target.value !== d.due_date) {
                  props.onSetDueDate(e.target.value);
                }
              }}
              style={{
                background: "var(--bg-elev)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 2,
                fontSize: 11, padding: "1px 4px",
              }}
            />
          </>
        )}
        {" · revisions ×"}{d.revision_count}
      </div>

      {/* Description (richer field; great for CUSTOM tasks) */}
      <div style={{ marginBottom: 14 }}>
        {!editingDesc ? (
          <div style={{
            fontSize: 12, color: "var(--text-dim)",
            background: "var(--bg-elev)", border: "1px solid var(--border)",
            borderRadius: 3, padding: "8px 10px", whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {d.description
              ? d.description
              : <span style={{ fontStyle: "italic" }}>
                  No description yet.{canEditMeta && " Click to add context, links, or a brief."}
                </span>}
            {canEditMeta && (
              <button
                className="btn ghost sm"
                style={{ marginLeft: 8, padding: "2px 6px", fontSize: 10 }}
                onClick={() => setEditingDesc(true)}
                disabled={busy}
              >Edit</button>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              placeholder="Optional context, brief, links, or scope notes."
              rows={4}
              disabled={busy}
              style={{
                width: "100%", minHeight: 80, resize: "vertical",
                background: "var(--bg)", color: "var(--text)",
                border: "1px solid var(--border-strong)", borderRadius: 3,
                padding: 8, fontSize: 13, fontFamily: "inherit",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                className="btn primary sm"
                disabled={busy}
                onClick={() => {
                  const trimmed = descDraft.trim();
                  props.onSetDescription(trimmed === "" ? null : trimmed);
                  setEditingDesc(false);
                }}
              >Save</button>
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => { setDescDraft(d.description ?? ""); setEditingDesc(false); }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Owners picker (toggled by the Owners button up top) */}
      {showOwnersPicker && canEditMeta && (
        <div style={{
          border: "1px solid var(--border-strong)", borderRadius: 3,
          padding: 10, marginBottom: 14, background: "var(--bg-elev)",
        }}>
          <div className="dim mono" style={{ fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>
            REASSIGN OWNERS
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 180, overflowY: "auto" }}>
            {projectMembers.length === 0 && (
              <span className="dim" style={{ fontSize: 11 }}>
                No project members yet. Open the Members modal first.
              </span>
            )}
            {projectMembers.map((m) => {
              const u = users[m.user_id];
              if (!u) return null;
              const checked = owners.some((o) => o.user_id === m.user_id);
              return (
                <label key={m.user_id} className={cls("picker-chip", checked && "on")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => {
                      const nextIds = checked
                        ? owners.map((o) => o.user_id).filter((id) => id !== m.user_id)
                        : [...owners.map((o) => o.user_id), m.user_id];
                      props.onSetOwners(nextIds);
                    }}
                  />
                  {u.full_name}
                  <span className="dim mono" style={{ fontSize: 9 }}>·{u.division ?? "—"}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className={cls("state-pill", d.blocked ? "blocked" : d.state)}>
            {d.blocked ? "Blocked" : STATE_LABELS[d.state]}
          </span>
          {(d.responsible_divisions && d.responsible_divisions.length > 0
            ? d.responsible_divisions
            : [d.division]
          ).map((div) => (
            <span key={div} className={`division-pill div-${div}`}>{div}</span>
          ))}
        </div>
        {(currentUser.role === "admin" || currentUser.role === "management") && (
          <div style={{ marginTop: 8 }}>
            <div className="dim mono" style={{ fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>
              RESPONSIBLE DIVISIONS
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["ERD","MRD","IRD","MND"] as const).map((div) => {
                const current = d.responsible_divisions && d.responsible_divisions.length > 0
                  ? d.responsible_divisions
                  : [d.division];
                const checked = current.includes(div);
                return (
                  <label key={div} className={cls("picker-chip", checked && "on")}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => {
                        const next = checked
                          ? current.filter((x) => x !== div)
                          : [...current.filter((x) => x !== "CROSS"), div];
                        if (next.length === 0) return;
                        props.onSetResponsibleDivisions(next);
                      }}
                    />
                    {div}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {d.blocked && d.blocker_note && (
        <div className="error-banner" style={{ margin: "0 0 14px 0" }}>
          <b>Blocker:</b> {d.blocker_note}
        </div>
      )}

      <div className="field" style={{ marginBottom: 14 }}>
        <label>External link (Drive / Notion / Dropbox)</label>
        <input
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          disabled={!isOwner || busy}
        />
        {isOwner && fileUrl !== (d.file_url ?? "") && (
          <button
            className="btn sm primary"
            style={{ marginTop: 6 }}
            onClick={() => props.onSetFile(fileUrl, null, null)}
            disabled={busy}
          >
            Save link
          </button>
        )}
        {d.file_url && (
          <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            Open external ↗
          </a>
        )}
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Upload file</label>
        <input
          type="file"
          disabled={!isOwner || busy || uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploadErr(null);
            setUploading(true);
            try {
              const path = `${d.project_id}/${d.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
              const sb = getClient();
              const { error } = await sb.storage
                .from("management-files")
                .upload(path, file, { upsert: false, contentType: file.type || undefined });
              if (error) throw error;
              props.onSetFile(null, path, file.name);
            } catch (e2) {
              setUploadErr((e2 as Error).message);
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }}
        />
        {uploading && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Uploading…</div>}
        {uploadErr && <div style={{ fontSize: 11, color: "var(--negative)", marginTop: 4 }}>{uploadErr}</div>}
        {d.storage_path && (
          <div style={{ fontSize: 11, marginTop: 6 }}>
            <span className="mono" style={{ color: "var(--text-dim)" }}>{d.file_name ?? d.storage_path.split("/").pop()}</span>{" "}
            <button
              className="btn ghost sm"
              type="button"
              onClick={async () => {
                const { data, error } = await getClient().storage
                  .from("management-files")
                  .createSignedUrl(d.storage_path!, 3600);
                if (error || !data) { setUploadErr(error?.message ?? "could not sign URL"); return; }
                window.open(data.signedUrl, "_blank", "noopener");
              }}
            >
              Download ↗
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {canSubmit && (
          <button className="btn primary sm" disabled={busy} onClick={() => props.onSubmit(draft)}>Submit</button>
        )}
        {canApprove && (
          <>
            <button className="btn primary sm" disabled={busy} onClick={props.onApprove}>Approve</button>
            <button className="btn sm" disabled={busy || !draft.trim()} onClick={() => props.onRevision(draft)}>
              Request revision
            </button>
          </>
        )}
        {canPublish && (
          <button className="btn primary sm" disabled={busy} onClick={props.onPublish}>Mark published</button>
        )}
        {canBlock && (
          <button className="btn sm danger" disabled={busy || !draft.trim()} onClick={() => props.onBlock(draft)}>
            Block
          </button>
        )}
        {canUnblock && (
          <button className="btn sm" disabled={busy} onClick={props.onUnblock}>Unblock</button>
        )}
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Comment / note (used for submit / revision / block)</label>
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment, submission note, revision request, or blocker reason…"
          disabled={busy}
        />
        <button
          className="btn sm"
          style={{ marginTop: 6 }}
          disabled={busy || !draft.trim()}
          onClick={() => { props.onComment(draft); setDraft(""); }}
        >
          Add comment
        </button>
      </div>

      {/* Rich notes (separate from the chat-style comments thread) */}
      <NotesPane deliverableId={d.id} currentUser={currentUser} users={users} />

      <h3 style={{ marginTop: 18 }}>Thread</h3>
      {comments.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>No comments yet.</div>
      )}
      {comments.map((c) => (
        <div className="activity-item" key={c.id}>
          <span className="who">{users[c.author_user_id]?.username ?? "?"}</span>{" "}
          <span style={{ fontSize: 10, color: "var(--amber)" }}>{c.kind}</span>
          <div style={{ marginTop: 3, color: "var(--text)" }}>{c.body}</div>
          <span className="when">{fmtRelativeTime(c.created_at)}</span>
        </div>
      ))}
    </>
  );
}
