import { useEffect, useState } from "react";
import { adminMutate } from "../lib/api";
import { getClient } from "../lib/supabase";
import type { Project, ProjectMember, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls, fmtRelativeTime } from "../lib/util";

interface MembersModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
  onChanged: () => void;
}

const PERMISSION_LABELS: Record<"t1" | "t2", { label: string; hint: string }> = {
  t1: { label: "T1 · own division", hint: "Edit own division's deliverables + IM. Comment on all." },
  t2: { label: "T2 · all divisions", hint: "Edit all deliverables in this project. Comment on all." },
};

export function MembersModal({ project, currentUser, onClose, onChanged }: MembersModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addPermission, setAddPermission] = useState<"t1" | "t2">("t1");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const canManage = currentUser.role === "admin" || currentUser.role === "management";

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const [mRes, uRes] = await Promise.all([
        sb.from("project_members").select("*").eq("project_id", project.id),
        sb.from("users_lite").select("id, username, full_name, division, title, role").eq("active", true),
      ]);
      setMembers((mRes.data ?? []) as ProjectMember[]);
      setUsers((uRes.data ?? []) as UserLite[]);
    })();
  }, [project.id, tick]);

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); refresh(); onChanged(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const userById = new Map(users.map((u) => [u.id, u]));
  const memberRows = members
    .map((m) => ({ ...m, user: userById.get(m.user_id) }))
    .filter((m) => m.user)
    .sort((a, b) => {
      const da = a.user!.division ?? "z";
      const db = b.user!.division ?? "z";
      if (da !== db) return da.localeCompare(db);
      return a.user!.full_name.localeCompare(b.user!.full_name);
    });

  const memberIds = new Set(memberRows.map((m) => m.user_id));
  // Analysts + management (e.g. SPD, division heads, C-suite, VDs). Admin
  // is excluded -- they already have implicit full access. Advisors keep
  // their read+comment role.
  const grantable = users.filter((u) =>
    (u.role === "analyst" || u.role === "management") &&
    u.id !== project.given_by &&
    !memberIds.has(u.id),
  );

  // Group the picker by division so the user can scan "ERD / MRD / IRD /
  // Exec / SPD / AMD / M&D" instead of one flat 40-row list. Management
  // (directors, VDs, SPD, C-suite) sort first within each group so the
  // senior pick is at the top.
  const DIVISION_ORDER = ["Exec", "ERD", "MRD", "IRD", "AMD", "SPD", "MND", "Quant", "Advisor"];
  const DIVISION_LABEL: Record<string, string> = {
    Exec: "Exec / C-suite", ERD: "ERD", MRD: "MRD", IRD: "IRD",
    AMD: "AMD", SPD: "SPD", MND: "M&D", Quant: "Quant", Advisor: "Advisor",
  };
  const grouped = new Map<string, UserLite[]>();
  for (const u of grantable) {
    const k = u.division ?? "—";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(u);
  }
  const orderedDivisions = [
    ...DIVISION_ORDER.filter((d) => grouped.has(d)),
    ...Array.from(grouped.keys()).filter((d) => !DIVISION_ORDER.includes(d)),
  ];
  for (const div of orderedDivisions) {
    grouped.get(div)!.sort((a, b) => {
      if (a.role !== b.role) return a.role === "management" ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 680 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Members · {project.id}</div>
            <div className="dim mono" style={{ fontSize: 11, marginTop: 2 }}>{project.theme}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {err && <div className="error-banner" style={{ margin: "0 0 12px 0" }}>{err}</div>}

        <div className="share-section">
          <div className="share-section-title">
            Assigned analysts · {memberRows.length}
          </div>
          {memberRows.length === 0 && (
            <div className="dim" style={{ fontSize: 12 }}>No analysts assigned yet.</div>
          )}
          {memberRows.map((m) => (
            <div className="share-row" key={m.user_id}>
              <div>
                <div>{m.user!.full_name}</div>
                <div className="dim mono" style={{ fontSize: 10 }}>
                  {m.user!.username}
                  {m.user!.division ? ` · ${m.user!.division}` : ""}
                  {" · added "}{fmtRelativeTime(m.added_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={m.permission}
                  disabled={!canManage || busy}
                  onChange={(e) => handle(() => adminMutate({
                    action: "member_set_permission",
                    project_id: project.id,
                    target_user_id: m.user_id,
                    permission: e.target.value as "t1" | "t2",
                  }))}
                >
                  {(["t1", "t2"] as const).map((p) => (
                    <option key={p} value={p} title={PERMISSION_LABELS[p].hint}>
                      {PERMISSION_LABELS[p].label}
                    </option>
                  ))}
                </select>
                {canManage && (
                  <button
                    className="btn ghost sm"
                    disabled={busy}
                    onClick={() => handle(() => adminMutate({
                      action: "member_remove",
                      project_id: project.id,
                      target_user_id: m.user_id,
                    }))}
                  >Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="share-section">
            <div className="share-section-title">Add member</div>
            <div className="field-row" style={{ gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Person (grouped by division)</label>
                <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
                  <option value="">Select…</option>
                  {orderedDivisions.map((div) => (
                    <optgroup key={div} label={DIVISION_LABEL[div] ?? div}>
                      {grouped.get(div)!.map((u) => {
                        const roleTag = u.role === "management" ? " ★" : "";
                        const titleTag = u.title ? ` — ${u.title}` : "";
                        return (
                          <option key={u.id} value={u.id}>
                            {u.full_name}{roleTag}{titleTag}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Permission</label>
                <select value={addPermission} onChange={(e) => setAddPermission(e.target.value as "t1" | "t2")}>
                  <option value="t1">T1 · own division</option>
                  <option value="t2">T2 · all divisions</option>
                </select>
              </div>
              <button
                className={cls("btn primary", !addUserId && "")}
                disabled={!addUserId || busy}
                onClick={() => handle(async () => {
                  await adminMutate({
                    action: "member_add",
                    project_id: project.id,
                    target_user_id: addUserId,
                    permission: addPermission,
                  });
                  setAddUserId("");
                })}
              >Add</button>
            </div>
          </div>
        )}

        <div className="share-section">
          <div className="share-section-title">Reference</div>
          <div className="dim" style={{ fontSize: 11, lineHeight: 1.6 }}>
            <div><b>T1</b> · Edit deliverables in the analyst's own division + the IM (cross-division). Can comment on all and add schedule items.</div>
            <div><b>T2</b> · Edit any deliverable on this project. Can comment on all and add schedule items.</div>
            <div style={{ marginTop: 6 }}>Non-members see this project read-only. Only management creates new projects.</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
