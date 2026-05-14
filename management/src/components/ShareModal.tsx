import { useEffect, useState } from "react";
import { adminMutate } from "../lib/api";
import { getClient } from "../lib/supabase";
import type { Project, User } from "../lib/types";
import type { UserLite } from "../lib/kpi";
import { cls } from "../lib/util";

interface ShareModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
  onChanged: () => void;
}

interface AccessRow {
  project_id: string;
  user_id: string;
  permission: "viewer" | "commenter" | "editor" | "owner";
  granted_by: string | null;
  granted_at: string;
}

const PERMISSIONS: Array<{ value: AccessRow["permission"]; label: string }> = [
  { value: "viewer",    label: "Viewer (read only)" },
  { value: "commenter", label: "Commenter (read + comment)" },
  { value: "editor",    label: "Editor (read + edit deliverables)" },
  { value: "owner",     label: "Owner (full control)" },
];

export function ShareModal({ project, currentUser, onClose, onChanged }: ShareModalProps) {
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addPermission, setAddPermission] = useState<AccessRow["permission"]>("viewer");
  const [visibility, setVisibility] = useState(project.visibility);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const canManage = currentUser.role === "admin" || project.given_by === currentUser.id;

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const [aRes, uRes] = await Promise.all([
        sb.from("project_access").select("*").eq("project_id", project.id),
        sb.from("users_lite").select("id, username, full_name, division, title, role").eq("active", true),
      ]);
      setAccess((aRes.data ?? []) as AccessRow[]);
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
  const givenByUser = userById.get(project.given_by);

  const granted = access
    .map((a) => ({ ...a, user: userById.get(a.user_id) }))
    .filter((a) => a.user)
    .sort((a, b) => (a.user!.full_name).localeCompare(b.user!.full_name));

  const grantedIds = new Set(granted.map((g) => g.user_id));
  const grantable = users.filter(
    (u) => u.id !== project.given_by && !grantedIds.has(u.id),
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Share {project.id}</div>
            <div className="dim mono" style={{ fontSize: 11, marginTop: 2 }}>{project.theme}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {err && <div className="error-banner" style={{ margin: "0 0 12px 0" }}>{err}</div>}

        <div className="field">
          <label>Visibility</label>
          <select
            value={visibility}
            disabled={!canManage || busy}
            onChange={async (e) => {
              const next = e.target.value as "org" | "restricted";
              setVisibility(next);
              await handle(() => adminMutate({
                action: "project_set_visibility",
                project_id: project.id,
                visibility: next,
              }));
            }}
          >
            <option value="org">Org · anyone signed in can view</option>
            <option value="restricted">Restricted · only people listed below</option>
          </select>
        </div>

        <div className="share-section">
          <div className="share-section-title">Owner</div>
          <div className="share-row">
            <div>
              <div>{givenByUser?.full_name ?? "(unknown)"}</div>
              <div className="dim mono" style={{ fontSize: 10 }}>{givenByUser?.username} · creator</div>
            </div>
            <div className="dim mono" style={{ fontSize: 10 }}>owner</div>
          </div>
        </div>

        <div className="share-section">
          <div className="share-section-title">Granted access</div>
          {granted.length === 0 && (
            <div className="dim" style={{ fontSize: 12 }}>No one else has been granted access.</div>
          )}
          {granted.map((g) => (
            <div className="share-row" key={g.user_id}>
              <div>
                <div>{g.user!.full_name}</div>
                <div className="dim mono" style={{ fontSize: 10 }}>
                  {g.user!.username}{g.user!.division ? ` · ${g.user!.division}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={g.permission}
                  disabled={!canManage || busy}
                  onChange={(e) => handle(() => adminMutate({
                    action: "acl_set",
                    project_id: project.id,
                    target_user_id: g.user_id,
                    permission: e.target.value as AccessRow["permission"],
                  }))}
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {canManage && (
                  <button
                    className="btn ghost sm"
                    disabled={busy}
                    onClick={() => handle(() => adminMutate({
                      action: "acl_revoke",
                      project_id: project.id,
                      target_user_id: g.user_id,
                    }))}
                  >Revoke</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManage && (
          <div className="share-section">
            <div className="share-section-title">Grant access</div>
            <div className="field-row" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
              <div className="field" style={{ margin: 0 }}>
                <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)}>
                  <option value="">Select user…</option>
                  {grantable.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}{u.division ? ` · ${u.division}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <select value={addPermission} onChange={(e) => setAddPermission(e.target.value as AccessRow["permission"])}>
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label.split(" ")[0]}</option>
                  ))}
                </select>
              </div>
              <button
                className={cls("btn primary", !addUserId && "")}
                disabled={!addUserId || busy}
                onClick={() => handle(async () => {
                  await adminMutate({
                    action: "acl_set",
                    project_id: project.id,
                    target_user_id: addUserId,
                    permission: addPermission,
                  });
                  setAddUserId("");
                })}
              >Grant</button>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
