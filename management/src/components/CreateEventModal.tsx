import { useState } from "react";
import { mutateEvent } from "../lib/api";
import type { ProjectEvent, ProjectEventKind } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls } from "../lib/util";

interface CreateEventModalProps {
  projectId: string;
  users: UserLite[];
  existing?: ProjectEvent;
  existingAttendees?: string[];
  onClose: () => void;
  onSaved: () => void;
}

const KINDS: Array<{ value: ProjectEventKind; label: string }> = [
  { value: "meeting", label: "Meeting" },
  { value: "onboarding", label: "Onboarding" },
  { value: "milestone", label: "Milestone" },
  { value: "deadline", label: "Deadline" },
  { value: "other", label: "Other" },
];

// Round to nearest 30 minutes for default start time
function defaultStart(): string {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0);
  // datetime-local needs yyyy-MM-ddTHH:mm in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateEventModal({
  projectId, users, existing, existingAttendees = [], onClose, onSaved,
}: CreateEventModalProps) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [startAt, setStartAt] = useState(
    existing?.start_at ? toLocalInput(existing.start_at) : defaultStart(),
  );
  const [kind, setKind] = useState<ProjectEventKind>(existing?.kind ?? "meeting");
  const [link, setLink] = useState(existing?.location_or_link ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set(existingAttendees));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = Boolean(existing);

  const submit = async () => {
    if (!title.trim() || !startAt) { setErr("title and start time required"); return; }
    setBusy(true); setErr(null);
    try {
      const startIso = new Date(startAt).toISOString();
      if (isEdit) {
        await mutateEvent({
          action: "event_update",
          event_id: existing!.id,
          title: title.trim(),
          start_at: startIso,
          kind,
          location_or_link: link.trim() || null,
          description: description.trim() || null,
          attendee_user_ids: Array.from(attendeeIds),
        });
      } else {
        await mutateEvent({
          action: "event_create",
          project_id: projectId,
          title: title.trim(),
          start_at: startIso,
          kind,
          location_or_link: link.trim() || null,
          description: description.trim() || null,
          attendee_user_ids: Array.from(attendeeIds),
        });
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(attendeeIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setAttendeeIds(next);
  };

  const byDivision = new Map<string, UserLite[]>();
  for (const u of users) {
    if (u.role !== "analyst" && u.role !== "management" && u.role !== "admin") continue;
    const k = u.division ?? "—";
    const arr = byDivision.get(k) ?? [];
    arr.push(u);
    byDivision.set(k, arr);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? "Edit event" : "New event"}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {err && <div className="error-banner" style={{ margin: "0 0 12px 0" }}>{err}</div>}

        <div className="field">
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kickoff Zoom with CIO"
            autoFocus
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Date + time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as ProjectEventKind)}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Link or location (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://zoom.us/j/… or Conference Room A"
          />
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Attendees ({attendeeIds.size})</label>
          <div className="member-picker" style={{ maxHeight: 200 }}>
            {Array.from(byDivision.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([div, list]) => (
              <div key={div} className="picker-group">
                <div className="picker-group-label mono">{div}</div>
                {list.map((u) => (
                  <label key={u.id} className={cls("picker-chip", attendeeIds.has(u.id) && "on")}>
                    <input
                      type="checkbox"
                      checked={attendeeIds.has(u.id)}
                      onChange={() => toggle(u.id)}
                    />
                    {u.full_name}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : isEdit ? "Save" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}
