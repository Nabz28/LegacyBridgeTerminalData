import { useEffect, useMemo, useState } from "react";
import { adminMutate } from "../lib/api";
import { getClient } from "../lib/supabase";
import type { Team, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls } from "../lib/util";

interface AdminTabProps {
  user: User;
}

type AdminView = "teams" | "users";

export function AdminTab({ user }: AdminTabProps) {
  const [view, setView] = useState<AdminView>("teams");

  if (user.role !== "admin") {
    return (
      <div className="empty-state" style={{ padding: 80 }}>
        Admin access only. Ask the system admin to promote your account.
      </div>
    );
  }

  return (
    <div className="agg-wrap">
      <div className="agg-header">
        <div>
          <div className="agg-title">Admin</div>
          <div className="agg-sub">Manage teams + user accounts</div>
        </div>
        <div className="seg-tabs">
          <button
            className={cls("seg-tab", view === "teams" && "active")}
            onClick={() => setView("teams")}
          >Teams</button>
          <button
            className={cls("seg-tab", view === "users" && "active")}
            onClick={() => setView("users")}
          >Users</button>
        </div>
      </div>

      {view === "teams" ? <TeamsAdmin /> : <UsersAdmin />}
    </div>
  );
}

// ─── Teams ─────────────────────────────────────────────────────────────

interface TeamWithMembers extends Team {
  members: UserLite[];
}

function TeamsAdmin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Array<{ team_id: string; user_id: string }>>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const [tRes, mRes, uRes] = await Promise.all([
        sb.from("teams").select("*").order("archived").order("name"),
        sb.from("team_members").select("*"),
        sb.from("users_lite").select("id, username, full_name, division, title, role")
          .eq("active", true).order("full_name"),
      ]);
      setTeams((tRes.data ?? []) as Team[]);
      setMembers((mRes.data ?? []) as Array<{ team_id: string; user_id: string }>);
      setUsers((uRes.data ?? []) as UserLite[]);
    })();
  }, [tick]);

  const teamWithMembers: TeamWithMembers[] = useMemo(() => teams.map((t) => ({
    ...t,
    members: members
      .filter((m) => m.team_id === t.id)
      .map((m) => users.find((u) => u.id === m.user_id))
      .filter((u): u is UserLite => Boolean(u)),
  })), [teams, members, users]);

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-panel">
      {err && <div className="error-banner">{err}</div>}
      <div className="admin-actions">
        <button className="btn primary" onClick={() => setCreating(true)} disabled={busy}>+ New team</button>
      </div>

      {creating && (
        <TeamFormModal
          users={users.filter((u) => u.role === "analyst")}
          onCancel={() => setCreating(false)}
          onSubmit={async (data) => {
            await handle(async () => {
              await adminMutate({
                action: "team_create",
                name: data.name,
                description: data.description,
                member_user_ids: data.member_user_ids,
              });
              setCreating(false);
            });
          }}
        />
      )}

      <div className="team-list">
        {teamWithMembers.length === 0 && (
          <div className="empty-state">No teams yet.</div>
        )}
        {teamWithMembers.map((t) => (
          <div key={t.id} className={cls("admin-card", t.archived && "archived")}>
            <div className="admin-card-head">
              <div>
                <div className="admin-card-title">
                  {t.name}
                  {t.archived && <span className="badge dim">archived</span>}
                </div>
                {t.description && (
                  <div className="admin-card-sub">{t.description}</div>
                )}
              </div>
              <div className="admin-card-actions">
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={() => setEditing(editing === t.id ? null : t.id)}
                >
                  {editing === t.id ? "Cancel" : "Edit members"}
                </button>
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={() => handle(() => adminMutate({
                    action: "team_archive", team_id: t.id, archived: !t.archived,
                  }))}
                >
                  {t.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </div>

            <div className="admin-card-members">
              {t.members.map((m) => (
                <span key={m.id} className="member-pill">
                  {m.full_name}
                  <span className="mono dim">·{m.division}</span>
                </span>
              ))}
              {t.members.length === 0 && (
                <span className="dim" style={{ fontSize: 11 }}>No members.</span>
              )}
            </div>

            {editing === t.id && (
              <MemberPicker
                users={users.filter((u) => u.role === "analyst")}
                current={t.members.map((m) => m.id)}
                onSave={async (ids) => {
                  await handle(async () => {
                    await adminMutate({ action: "team_set_members", team_id: t.id, member_user_ids: ids });
                    setEditing(null);
                  });
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MemberPickerProps {
  users: UserLite[];
  current: string[];
  onSave: (ids: string[]) => void;
}
function MemberPicker({ users, current, onSave }: MemberPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(current));
  const byDivision = useMemo(() => {
    const map = new Map<string, UserLite[]>();
    for (const u of users) {
      const k = u.division ?? "—";
      const arr = map.get(k) ?? [];
      arr.push(u);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [users]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="member-picker">
      {byDivision.map(([div, list]) => (
        <div key={div} className="picker-group">
          <div className="picker-group-label mono">{div}</div>
          {list.map((u) => (
            <label key={u.id} className={cls("picker-chip", selected.has(u.id) && "on")}>
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
              />
              {u.full_name}
            </label>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn primary sm" onClick={() => onSave(Array.from(selected))}>
          Save members ({selected.size})
        </button>
      </div>
    </div>
  );
}

interface TeamFormModalProps {
  users: UserLite[];
  onSubmit: (data: { name: string; description: string; member_user_ids: string[] }) => void;
  onCancel: () => void;
}
function TeamFormModal({ users, onSubmit, onCancel }: TeamFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New team</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Members</label>
          <MemberPicker users={users} current={[]} onSave={setMemberIds} />
          <div className="dim mono" style={{ fontSize: 10, marginTop: 4 }}>
            {memberIds.length} selected
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => onSubmit({ name: name.trim(), description, member_user_ids: memberIds })}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users ─────────────────────────────────────────────────────────────

interface UserActivity {
  user_id: string;
  username: string;
  full_name: string;
  role: string;
  division: string | null;
  active: boolean;
  active_projects: number;
  in_flight: number;
  completed: number;
}

function UsersAdmin() {
  const [rows, setRows] = useState<UserActivity[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserActivity | null>(null);
  const [resetFor, setResetFor] = useState<UserActivity | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const { data, error } = await sb
        .from("v_user_activity")
        .select("*")
        .order("active", { ascending: false })
        .order("role")
        .order("full_name");
      if (error) { setErr(error.message); return; }
      setRows((data ?? []) as UserActivity[]);
    })();
  }, [tick]);

  const filtered = filter.trim()
    ? rows.filter((r) => {
        const q = filter.toLowerCase();
        return r.username.includes(q)
            || r.full_name.toLowerCase().includes(q)
            || (r.division ?? "").toLowerCase().includes(q);
      })
    : rows;

  const handle = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); refresh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-panel">
      {err && <div className="error-banner">{err}</div>}
      <div className="admin-actions">
        <input
          className="admin-search"
          placeholder="Filter users…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="btn primary" onClick={() => setCreating(true)} disabled={busy}>+ New user</button>
      </div>

      <div className="roster-table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Division</th>
              <th className="num">Active proj</th>
              <th className="num">In flight</th>
              <th className="num">Done</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.user_id} className={cls(!r.active && "warn")}>
                <td>
                  <div>{r.full_name}</div>
                  <div className="dim mono" style={{ fontSize: 10 }}>{r.username}</div>
                </td>
                <td className="mono">{r.role}</td>
                <td className="mono dim">{r.division ?? "—"}</td>
                <td className="num mono">{r.active_projects}</td>
                <td className="num mono">{r.in_flight}</td>
                <td className="num mono">{r.completed}</td>
                <td>
                  <span className={cls("state-pill", r.active ? "approved" : "blocked")}>
                    {r.active ? "active" : "disabled"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" disabled={busy} onClick={() => setEditing(r)}>Edit</button>
                    <button className="btn ghost sm" disabled={busy} onClick={() => setResetFor(r)}>Reset pwd</button>
                    <button
                      className="btn ghost sm"
                      disabled={busy}
                      onClick={() => handle(() => adminMutate({
                        action: "user_toggle_active", user_id: r.user_id, active: !r.active,
                      }))}
                    >{r.active ? "Disable" : "Enable"}</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="empty-cell">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <UserFormModal
          onCancel={() => setCreating(false)}
          onSubmit={async (data) => {
            await handle(async () => {
              await adminMutate({ action: "user_create", ...data });
              setCreating(false);
            });
          }}
        />
      )}

      {editing && (
        <UserFormModal
          existing={editing}
          onCancel={() => setEditing(null)}
          onSubmit={async (data) => {
            await handle(async () => {
              await adminMutate({
                action: "user_update",
                user_id: editing.user_id,
                full_name: data.full_name,
                role: data.role,
                division: data.division,
                title: data.title,
                can_create_research_project: data.can_create_research_project,
              });
              setEditing(null);
            });
          }}
        />
      )}

      {resetFor && (
        <ResetPasswordModal
          user={resetFor}
          onCancel={() => setResetFor(null)}
          onSubmit={async (password) => {
            await handle(async () => {
              await adminMutate({
                action: "user_reset_password",
                user_id: resetFor.user_id,
                password,
              });
              setResetFor(null);
            });
          }}
        />
      )}
    </div>
  );
}

interface UserFormData {
  username: string;
  password: string;
  full_name: string;
  role: "admin" | "management" | "analyst" | "advisor";
  division: string | null;
  title: string | null;
  can_create_research_project: boolean;
}

interface UserFormModalProps {
  existing?: UserActivity;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
}
function UserFormModal({ existing, onSubmit, onCancel }: UserFormModalProps) {
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(existing?.full_name ?? "");
  const [role, setRole] = useState<UserFormData["role"]>((existing?.role ?? "analyst") as UserFormData["role"]);
  const [division, setDivision] = useState(existing?.division ?? "");
  const [title, setTitle] = useState("");
  const [canCreate, setCanCreate] = useState(false);

  const isEdit = Boolean(existing);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? "Edit user" : "New user"}</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              autoFocus={!isEdit}
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </div>
        {!isEdit && (
          <div className="field">
            <label>Initial password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`e.g. ${username || "user"}1234`}
              spellCheck={false}
            />
          </div>
        )}
        <div className="field-row">
          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserFormData["role"])}>
              <option value="analyst">analyst</option>
              <option value="management">management</option>
              <option value="advisor">advisor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="field">
            <label>Division</label>
            <select value={division ?? ""} onChange={(e) => setDivision(e.target.value)}>
              <option value="">—</option>
              <option value="ERD">ERD</option>
              <option value="MRD">MRD</option>
              <option value="IRD">IRD</option>
              <option value="AMD">AMD</option>
              <option value="SPD">SPD</option>
              <option value="MND">M&D</option>
              <option value="Exec">Exec</option>
              <option value="Quant">Quant</option>
              <option value="Advisor">Advisor</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={canCreate}
              onChange={(e) => setCanCreate(e.target.checked)}
              style={{ width: "auto" }}
            />
            Can create research projects
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            disabled={!username || !fullName || (!isEdit && !password)}
            onClick={() => onSubmit({
              username, password, full_name: fullName, role,
              division: division || null, title: title || null,
              can_create_research_project: canCreate,
            })}
          >
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResetPasswordModalProps {
  user: UserActivity;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}
function ResetPasswordModal({ user, onSubmit, onCancel }: ResetPasswordModalProps) {
  const [password, setPassword] = useState(`${user.username}1234`);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Reset password for {user.full_name}</div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="field">
          <label>New password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            disabled={password.length < 4}
            onClick={() => onSubmit(password)}
          >Reset</button>
        </div>
      </div>
    </div>
  );
}
