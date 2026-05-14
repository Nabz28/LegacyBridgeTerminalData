import { useEffect, useState } from "react";
import { mutateDeliverable } from "../lib/api";
import { getClient } from "../lib/supabase";
import type { ProjectMember } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls, today } from "../lib/util";

interface CreateTaskModalProps {
  projectId: string;
  projectDayZero: string;
  onClose: () => void;
  onCreated: () => void;
}

const DIVISIONS: Array<{ value: string; label: string }> = [
  { value: "ERD", label: "ERD · Equity" },
  { value: "MRD", label: "MRD · Market" },
  { value: "IRD", label: "IRD · Industry" },
  { value: "MND", label: "M&D · Publication" },
];

export function CreateTaskModal({ projectId, projectDayZero, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(today());
  const [divisions, setDivisions] = useState<Set<string>>(new Set());
  const [ownerIds, setOwnerIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const [mRes, uRes] = await Promise.all([
        sb.from("project_members").select("*").eq("project_id", projectId),
        sb.from("users_lite").select("id, username, full_name, division, title, role").eq("active", true),
      ]);
      setMembers((mRes.data ?? []) as ProjectMember[]);
      setUsers((uRes.data ?? []) as UserLite[]);
    })();
  }, [projectId]);

  const toggleDiv = (d: string) => {
    const next = new Set(divisions);
    if (next.has(d)) next.delete(d); else next.add(d);
    setDivisions(next);
  };
  const toggleOwner = (id: string) => {
    const next = new Set(ownerIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOwnerIds(next);
  };

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (!title.trim()) throw new Error("title required");
      if (divisions.size === 0) throw new Error("pick at least one responsible division");
      await mutateDeliverable({
        action: "create_task",
        project_id: projectId,
        title: title.trim(),
        due_date: dueDate,
        responsible_divisions: Array.from(divisions),
        owner_user_ids: Array.from(ownerIds),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const userById = new Map(users.map((u) => [u.id, u]));
  const memberRows = members
    .map((m) => userById.get(m.user_id))
    .filter((u): u is UserLite => Boolean(u))
    .sort((a, b) => (a.division ?? "").localeCompare(b.division ?? ""));

  const filteredMembers = divisions.size === 0
    ? memberRows
    : memberRows.filter((u) => u.division && divisions.has(u.division));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">+ New task</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {err && <div className="error-banner" style={{ margin: "0 0 12px 0" }}>{err}</div>}

        <div className="field">
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Compile peer multiples table, build DCF base case"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={projectDayZero}
          />
        </div>

        <div className="field">
          <label>Responsible division(s)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DIVISIONS.map((d) => (
              <label
                key={d.value}
                className={cls("picker-chip", divisions.has(d.value) && "on")}
              >
                <input
                  type="checkbox"
                  checked={divisions.has(d.value)}
                  onChange={() => toggleDiv(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
          <div className="dim mono" style={{ fontSize: 10, marginTop: 4 }}>
            Pick 1 = that division's analysts can edit (T1). Pick 2+ = treated as cross-division.
          </div>
        </div>

        <div className="field">
          <label>Owners (optional · filtered by division)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 140, overflowY: "auto" }}>
            {filteredMembers.length === 0 && (
              <span className="dim" style={{ fontSize: 11 }}>
                {divisions.size === 0
                  ? "Pick a division to filter the owner list."
                  : "No team members in this division."}
              </span>
            )}
            {filteredMembers.map((u) => (
              <label key={u.id} className={cls("picker-chip", ownerIds.has(u.id) && "on")}>
                <input
                  type="checkbox"
                  checked={ownerIds.has(u.id)}
                  onChange={() => toggleOwner(u.id)}
                />
                {u.full_name}
                <span className="dim mono" style={{ fontSize: 9 }}>·{u.division}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn primary"
            onClick={submit}
            disabled={busy || !title.trim() || divisions.size === 0}
          >
            {busy ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
