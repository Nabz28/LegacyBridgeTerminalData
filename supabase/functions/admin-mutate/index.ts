// admin-mutate: single multi-action endpoint for admin + project-owner ops.
//
// Action dispatch:
//   team_create / team_update / team_archive / team_set_members           (admin)
//   user_create / user_update / user_reset_password / user_toggle_active  (admin)
//   project_set_status / project_set_visibility / project_set_theme      (admin OR project.given_by)
//   acl_set / acl_revoke                                                  (admin OR project.given_by)
//   member_add / member_set_permission / member_remove                    (admin OR management)
//
// Every mutation appends an activity_log row tagged with the action.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { authenticate, AuthPayload } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action =
  | "team_create" | "team_update" | "team_archive" | "team_set_members"
  | "user_create" | "user_update" | "user_reset_password" | "user_toggle_active"
  | "project_set_status" | "project_set_visibility" | "project_set_theme"
  | "acl_set" | "acl_revoke"
  | "member_add" | "member_set_permission" | "member_remove";

interface Body {
  action: Action;
  // team_*
  team_id?: string;
  name?: string;
  description?: string;
  archived?: boolean;
  member_user_ids?: string[];
  // user_*
  user_id?: string;
  username?: string;
  password?: string;
  full_name?: string;
  role?: "admin" | "management" | "analyst" | "advisor";
  division?: string | null;
  title?: string | null;
  can_create_research_project?: boolean;
  active?: boolean;
  // project_*
  project_id?: string;
  status?: "active" | "completed" | "archived" | "cancelled";
  visibility?: "org" | "restricted";
  theme?: string;
  description?: string | null;
  // acl_* + member_* (Phase 4 -- ACL permission set OR T1/T2 member tier)
  target_user_id?: string;
  permission?: "viewer" | "commenter" | "editor" | "owner" | "t1" | "t2";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = await authenticate(req);
  if (!auth) return errorResponse("not authenticated", 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid json", 400);
  }
  if (!body.action) return errorResponse("action required", 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "management" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    return await dispatch(supabase, auth, body);
  } catch (e) {
    console.error("admin-mutate failed:", e);
    return errorResponse((e as Error).message, 500);
  }
});

async function dispatch(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const adminOnly = (): void => {
    if (auth.user_role !== "admin") {
      throw new HttpError("admin only", 403);
    }
  };

  switch (body.action) {
    case "team_create":       adminOnly(); return await teamCreate(supabase, auth, body);
    case "team_update":       adminOnly(); return await teamUpdate(supabase, auth, body);
    case "team_archive":      adminOnly(); return await teamArchive(supabase, auth, body);
    case "team_set_members":  adminOnly(); return await teamSetMembers(supabase, auth, body);

    case "user_create":         adminOnly(); return await userCreate(supabase, auth, body);
    case "user_update":         adminOnly(); return await userUpdate(supabase, auth, body);
    case "user_reset_password": adminOnly(); return await userResetPassword(supabase, auth, body);
    case "user_toggle_active":  adminOnly(); return await userToggleActive(supabase, auth, body);

    case "project_set_status":     return await projectSetStatus(supabase, auth, body);
    case "project_set_visibility": return await projectSetVisibility(supabase, auth, body);
    case "project_set_theme":      return await projectSetTheme(supabase, auth, body);

    case "acl_set":    return await aclSet(supabase, auth, body);
    case "acl_revoke": return await aclRevoke(supabase, auth, body);

    case "member_add":            return await memberAdd(supabase, auth, body);
    case "member_set_permission": return await memberSetPermission(supabase, auth, body);
    case "member_remove":         return await memberRemove(supabase, auth, body);

    default: return errorResponse("unknown action", 400);
  }
}

function managementOnly(auth: AuthPayload): void {
  if (auth.user_role !== "admin" && auth.user_role !== "management") {
    throw new HttpError("management only", 403);
  }
}

function asTier(permission: unknown): "t1" | "t2" {
  return permission === "t2" ? "t2" : "t1";
}

class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function ok(payload: Record<string, unknown> = {}): Response {
  return jsonResponse({ ok: true, ...payload });
}

async function logActivity(
  supabase: SupabaseClient, actor: string,
  eventType: string, payload: Record<string, unknown>,
  projectId?: string,
) {
  await supabase.from("activity_log").insert({
    project_id: projectId ?? null,
    actor_user_id: actor,
    event_type: eventType,
    payload,
  });
}

async function requireProjectOwner(
  supabase: SupabaseClient, auth: AuthPayload, projectId: string,
): Promise<void> {
  if (auth.user_role === "admin") return;
  const { data, error } = await supabase
    .from("projects").select("given_by").eq("id", projectId).maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("project not found", 404);
  if (data.given_by !== auth.sub) {
    // Also accept ACL co-owners.
    const { data: ownerRows } = await supabase
      .from("project_access")
      .select("permission")
      .eq("project_id", projectId)
      .eq("user_id", auth.sub)
      .eq("permission", "owner");
    if (!ownerRows || ownerRows.length === 0) {
      throw new HttpError("not project owner", 403);
    }
  }
}

// ─── teams ─────────────────────────────────────────────────────────────

async function teamCreate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const name = String(body.name ?? "").trim();
  if (!name) throw new HttpError("name required");
  const slug = `team-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
  const { data, error } = await supabase.from("teams").insert({
    name, slug, description: body.description ?? null, created_by: auth.sub,
  }).select("*").single();
  if (error) throw new HttpError(error.message, 500);
  if (Array.isArray(body.member_user_ids) && body.member_user_ids.length > 0) {
    const rows = body.member_user_ids.map((uid) => ({ team_id: data.id, user_id: uid }));
    await supabase.from("team_members").insert(rows);
  }
  await logActivity(supabase, auth.sub, "team_create", { team_id: data.id, name });
  return ok({ team: data });
}

async function teamUpdate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.team_id) throw new HttpError("team_id required");
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.description !== undefined) patch.description = body.description;
  const { error } = await supabase.from("teams").update(patch).eq("id", body.team_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "team_update", { team_id: body.team_id, ...patch });
  return ok();
}

async function teamArchive(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.team_id) throw new HttpError("team_id required");
  const archived = body.archived !== false;
  const { error } = await supabase.from("teams").update({ archived }).eq("id", body.team_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, archived ? "team_archive" : "team_restore", { team_id: body.team_id });
  return ok();
}

async function teamSetMembers(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.team_id) throw new HttpError("team_id required");
  const ids = Array.isArray(body.member_user_ids) ? body.member_user_ids : [];
  await supabase.from("team_members").delete().eq("team_id", body.team_id);
  if (ids.length > 0) {
    const rows = ids.map((uid) => ({ team_id: body.team_id!, user_id: uid }));
    const { error } = await supabase.from("team_members").insert(rows);
    if (error) throw new HttpError(error.message, 500);
  }
  await logActivity(supabase, auth.sub, "team_set_members", { team_id: body.team_id, count: ids.length });
  return ok({ count: ids.length });
}

// ─── users ─────────────────────────────────────────────────────────────

async function userCreate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const full_name = String(body.full_name ?? "").trim();
  const role = body.role ?? "analyst";
  if (!username || !password || !full_name) {
    throw new HttpError("username, password, full_name required");
  }
  const { data, error } = await supabase.rpc("admin_create_user", {
    p_username: username,
    p_password: password,
    p_full_name: full_name,
    p_role: role,
    p_division: body.division ?? null,
    p_title: body.title ?? null,
    p_can_create_research_project: body.can_create_research_project ?? false,
  });
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "user_create", { username, role });
  return ok({ user_id: data });
}

async function userUpdate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.user_id) throw new HttpError("user_id required");
  const patch: Record<string, unknown> = {};
  if (body.full_name !== undefined) patch.full_name = body.full_name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.division !== undefined) patch.division = body.division;
  if (body.title !== undefined) patch.title = body.title;
  if (body.can_create_research_project !== undefined) {
    patch.can_create_research_project = body.can_create_research_project;
  }
  if (Object.keys(patch).length === 0) throw new HttpError("no changes");
  const { error } = await supabase.from("users").update(patch).eq("id", body.user_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "user_update", { user_id: body.user_id, ...patch });
  return ok();
}

async function userResetPassword(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.user_id || !body.password) throw new HttpError("user_id and password required");
  const { error } = await supabase.rpc("admin_reset_password", {
    p_user_id: body.user_id,
    p_new_password: body.password,
  });
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "user_reset_password", { user_id: body.user_id });
  return ok();
}

async function userToggleActive(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.user_id) throw new HttpError("user_id required");
  const active = body.active !== false;
  const { error } = await supabase.from("users").update({ active }).eq("id", body.user_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, active ? "user_activate" : "user_deactivate", { user_id: body.user_id });
  return ok();
}

// ─── project meta ──────────────────────────────────────────────────────

async function projectSetStatus(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id || !body.status) throw new HttpError("project_id and status required");
  await requireProjectOwner(supabase, auth, body.project_id);
  const patch: Record<string, unknown> = { status: body.status };
  if (body.status !== "active") patch.completed_at = new Date().toISOString();
  else patch.completed_at = null;
  const { error } = await supabase.from("projects").update(patch).eq("id", body.project_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "project_set_status", { status: body.status }, body.project_id);
  return ok();
}

async function projectSetVisibility(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id || !body.visibility) throw new HttpError("project_id and visibility required");
  await requireProjectOwner(supabase, auth, body.project_id);
  const { error } = await supabase.from("projects")
    .update({ visibility: body.visibility }).eq("id", body.project_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "project_set_visibility", { visibility: body.visibility }, body.project_id);
  return ok();
}

async function projectSetTheme(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id || !body.theme) throw new HttpError("project_id and theme required");
  await requireProjectOwner(supabase, auth, body.project_id);
  const patch: Record<string, unknown> = { theme: body.theme };
  if (body.description !== undefined) patch.description = body.description;
  const { error } = await supabase.from("projects").update(patch).eq("id", body.project_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "project_set_theme",
    { theme: body.theme, description: body.description }, body.project_id);
  return ok();
}

// ─── ACL ───────────────────────────────────────────────────────────────

async function aclSet(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id || !body.target_user_id) {
    throw new HttpError("project_id and target_user_id required");
  }
  await requireProjectOwner(supabase, auth, body.project_id);
  const permission = body.permission ?? "viewer";
  const { error } = await supabase.from("project_access").upsert({
    project_id: body.project_id,
    user_id: body.target_user_id,
    permission,
    granted_by: auth.sub,
    granted_at: new Date().toISOString(),
  }, { onConflict: "project_id,user_id" });
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "acl_set",
    { target_user_id: body.target_user_id, permission }, body.project_id);
  return ok();
}

async function aclRevoke(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id || !body.target_user_id) {
    throw new HttpError("project_id and target_user_id required");
  }
  await requireProjectOwner(supabase, auth, body.project_id);
  const { error } = await supabase.from("project_access")
    .delete()
    .eq("project_id", body.project_id)
    .eq("user_id", body.target_user_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "acl_revoke",
    { target_user_id: body.target_user_id }, body.project_id);
  return ok();
}

// ─── project_members (Phase 4: T1/T2 editor tiers) ──────────────────────

async function memberAdd(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  managementOnly(auth);
  if (!body.project_id || !body.target_user_id) {
    throw new HttpError("project_id and target_user_id required");
  }
  const permission = asTier(body.permission);
  const { error } = await supabase.from("project_members").upsert({
    project_id: body.project_id,
    user_id: body.target_user_id,
    permission,
    added_by: auth.sub,
    added_at: new Date().toISOString(),
  }, { onConflict: "project_id,user_id" });
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "member_add",
    { target_user_id: body.target_user_id, permission }, body.project_id);
  return ok();
}

async function memberSetPermission(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  managementOnly(auth);
  if (!body.project_id || !body.target_user_id) {
    throw new HttpError("project_id and target_user_id required");
  }
  const permission = asTier(body.permission);
  const { error } = await supabase.from("project_members")
    .update({ permission })
    .eq("project_id", body.project_id)
    .eq("user_id", body.target_user_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "member_set_permission",
    { target_user_id: body.target_user_id, permission }, body.project_id);
  return ok();
}

async function memberRemove(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  managementOnly(auth);
  if (!body.project_id || !body.target_user_id) {
    throw new HttpError("project_id and target_user_id required");
  }
  const { error } = await supabase.from("project_members")
    .delete()
    .eq("project_id", body.project_id)
    .eq("user_id", body.target_user_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "member_remove",
    { target_user_id: body.target_user_id }, body.project_id);
  return ok();
}
