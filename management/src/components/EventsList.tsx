import { useMemo, useState } from "react";
import { mutateEvent } from "../lib/api";
import type { ProjectEvent, ProjectEventAttendee, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls } from "../lib/util";
import { CreateEventModal } from "./CreateEventModal";

interface EventsListProps {
  projectId: string;
  events: ProjectEvent[];
  attendees: ProjectEventAttendee[];
  users: Record<string, UserLite>;
  currentUser: User;
  canAdd: boolean;
  onChanged: () => void;
}

const KIND_LABEL: Record<string, string> = {
  meeting: "Meeting",
  milestone: "Milestone",
  deadline: "Deadline",
  onboarding: "Onboarding",
  other: "Other",
};

export function EventsList({
  projectId, events, attendees, users, currentUser, canAdd, onChanged,
}: EventsListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ProjectEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [events]);

  const now = Date.now();
  const upcoming = sorted.filter((e) => new Date(e.start_at).getTime() >= now);
  const past = sorted.filter((e) => new Date(e.start_at).getTime() < now);

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const userList: UserLite[] = Object.values(users);

  return (
    <div className="events-pane">
      <div className="events-head">
        <h3>Schedule</h3>
        {canAdd && (
          <button className="btn primary sm" onClick={() => setShowCreate(true)} disabled={busy}>
            + Event
          </button>
        )}
      </div>

      {err && <div className="error-banner" style={{ margin: "0 0 10px 0" }}>{err}</div>}

      <div className="events-section-label">Upcoming · {upcoming.length}</div>
      {upcoming.length === 0 && <div className="dim" style={{ fontSize: 11 }}>Nothing scheduled.</div>}
      {upcoming.map((e) => (
        <EventCard
          key={e.id}
          event={e}
          attendees={attendees.filter((a) => a.event_id === e.id).map((a) => users[a.user_id]).filter(Boolean)}
          currentUser={currentUser}
          onEdit={() => setEditing(e)}
          onDelete={() => {
            if (!confirm(`Delete "${e.title}"?`)) return;
            handle(() => mutateEvent({ action: "event_delete", event_id: e.id }));
          }}
        />
      ))}

      {past.length > 0 && (
        <>
          <div className="events-section-label" style={{ marginTop: 14 }}>Past · {past.length}</div>
          {past.slice().reverse().map((e) => (
            <EventCard
              key={e.id}
              event={e}
              attendees={attendees.filter((a) => a.event_id === e.id).map((a) => users[a.user_id]).filter(Boolean)}
              currentUser={currentUser}
              onEdit={() => setEditing(e)}
              onDelete={() => {
                if (!confirm(`Delete "${e.title}"?`)) return;
                handle(() => mutateEvent({ action: "event_delete", event_id: e.id }));
              }}
              dim
            />
          ))}
        </>
      )}

      {showCreate && (
        <CreateEventModal
          projectId={projectId}
          users={userList}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); onChanged(); }}
        />
      )}
      {editing && (
        <CreateEventModal
          projectId={projectId}
          users={userList}
          existing={editing}
          existingAttendees={attendees.filter((a) => a.event_id === editing.id).map((a) => a.user_id)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}
    </div>
  );
}

interface EventCardProps {
  event: ProjectEvent;
  attendees: UserLite[];
  currentUser: User;
  onEdit: () => void;
  onDelete: () => void;
  dim?: boolean;
}

function EventCard({ event, attendees, currentUser, onEdit, onDelete, dim }: EventCardProps) {
  const canEdit =
    currentUser.role === "admin" ||
    currentUser.role === "management" ||
    event.created_by === currentUser.id;
  const d = new Date(event.start_at);
  const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className={cls("event-card", dim && "event-dim", `event-kind-${event.kind}`)}>
      <div className="event-head">
        <div className="event-time mono">
          <div>{dateLabel}</div>
          <div className="dim">{timeLabel}</div>
        </div>
        <div className="event-body">
          <div className="event-title">
            {event.title}
            <span className={`event-kind-pill kind-${event.kind}`}>{KIND_LABEL[event.kind] ?? event.kind}</span>
          </div>
          {event.description && (
            <div className="event-desc">{event.description}</div>
          )}
          {event.location_or_link && (
            <a
              className="event-link mono"
              href={event.location_or_link}
              target="_blank"
              rel="noreferrer"
            >
              {event.location_or_link.replace(/^https?:\/\//, "").slice(0, 40)}{event.location_or_link.length > 40 ? "…" : ""} ↗
            </a>
          )}
          {attendees.length > 0 && (
            <div className="event-attendees dim mono">
              {attendees.slice(0, 5).map((a) => a.username).join(", ")}
              {attendees.length > 5 && ` +${attendees.length - 5}`}
            </div>
          )}
        </div>
        {canEdit && (
          <div className="event-actions">
            <button className="btn ghost sm" onClick={onEdit}>Edit</button>
            <button className="btn ghost sm danger" onClick={onDelete}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}
