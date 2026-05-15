// admin-mutate: single multi-action endpoint for admin + project-owner ops.
//
// Action dispatch:
//   team_create / team_update / team_archive / team_set_members           (admin)
//   user_create / user_update / user_reset_password / user_toggle_active  (admin)
//   project_set_status / project_set_visibility / project_set_theme      (admin OR management OR project.given_by)
//   project_delete                                                        (admin OR management OR project.given_by) -- cascades via FK
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
  | "project_delete"
  | "acl_set" | "acl_revoke"
  | "member_add" | "member_set_permission" | "member_remove"
  | "meeting_create" | "meeting_update" | "meeting_set_state"
  | "meeting_delete" | "meeting_set_availability";

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
  // meeting_* (Phase 6 -- When2Meet-style availability polls)
  poll_id?: string;
  poll_title?: string;
  poll_description?: string | null;
  poll_date_from?: string;        // YYYY-MM-DD
  poll_date_to?: string;          // YYYY-MM-DD
  poll_slot_minutes?: 15 | 30 | 60 | 120;
  poll_day_start_hour?: number;   // 0..23
  poll_day_end_hour?: number;     // 1..24
  poll_time_zone?: string;        // IANA tz, e.g. 'Asia/Jakarta'
  poll_state?: "open" | "closed";
  available_slots?: string[];     // ISO timestamps -- start of slot
  maybe_slots?: string[];
  response_note?: string | null;
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
    case "project_delete":         return await projectDelete(supabase, auth, body);

    case "acl_set":    return await aclSet(supabase, auth, body);
    case "acl_revoke": return await aclRevoke(supabase, auth, body);

    case "member_add":            return await memberAdd(supabase, auth, body);
    case "member_set_permission": return await memberSetPermission(supabase, auth, body);
    case "member_remove":         return await memberRemove(supabase, auth, body);

    case "meeting_create":           return await meetingCreate(supabase, auth, body);
    case "meeting_update":           return await meetingUpdate(supabase, auth, body);
    case "meeting_set_state":        return await meetingSetState(supabase, auth, body);
    case "meeting_delete":           return await meetingDelete(supabase, auth, body);
    case "meeting_set_availability": return await meetingSetAvailability(supabase, auth, body);

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
  // Admin + management roles get full project-edit authority across the org
  // (matches the Project Tab UI which only renders these controls for those
  // two roles). project.given_by + ACL co-owners are also allowed.
  if (auth.user_role === "admin" || auth.user_role === "management") return;
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

async function projectDelete(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  // Hard delete. All child rows (deliverables, deliverable_owners, comments,
  // activity_log, project_access, project_approvers, project_members,
  // project_events, project_event_attendees) cascade via the FK ON DELETE
  // CASCADE chain in 0005_management_schema.sql. The audit trail for this
  // project is destroyed; for soft delete use project_set_status='archived'.
  if (!body.project_id) throw new HttpError("project_id required");
  await requireProjectOwner(supabase, auth, body.project_id);

  // Log BEFORE deleting -- the activity_log row would cascade away with the
  // project. Write a final entry with project_id=null but a payload that
  // records what was removed, for forensics.
  const { data: snapshot } = await supabase.from("projects")
    .select("id, theme, status, project_type, day_zero, given_by, team_id")
    .eq("id", body.project_id)
    .maybeSingle();

  const { error } = await supabase.from("projects").delete().eq("id", body.project_id);
  if (error) throw new HttpError(error.message, 500);

  await logActivity(supabase, auth.sub, "project_delete",
    { deleted_project: snapshot ?? { id: body.project_id } });
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

// ─── meeting polls (Phase 6) ────────────────────────────────────────────

async function canParticipateInProject(
  supabase: SupabaseClient, auth: AuthPayload, projectId: string,
): Promise<boolean> {
  if (auth.user_role === "admin" || auth.user_role === "management") return true;
  // project_owner
  const { data: proj } = await supabase
    .from("projects").select("given_by").eq("id", projectId).maybeSingle();
  if (proj && proj.given_by === auth.sub) return true;
  // any tier of project membership
  const { data: mem } = await supabase
    .from("project_members").select("permission")
    .eq("project_id", projectId).eq("user_id", auth.sub).maybeSingle();
  return !!mem;
}

async function loadMeetingProjectId(
  supabase: SupabaseClient, pollId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("meeting_polls").select("project_id").eq("id", pollId).maybeSingle();
  return data ? data.project_id as string : null;
}

function asIsoArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    // Accept anything Date.parse handles; we don't try to validate the
    // exact ISO shape because the client sends what JS produces.
    if (!t) continue;
    if (Number.isNaN(Date.parse(t))) continue;
    out.push(t);
  }
  // Dedup -- a slot picked twice is just one slot.
  return Array.from(new Set(out));
}

async function meetingCreate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.project_id) throw new HttpError("project_id required");
  if (!body.poll_title) throw new HttpError("poll_title required");
  if (!body.poll_date_from || !body.poll_date_to) {
    throw new HttpError("poll_date_from and poll_date_to required");
  }
  if (!(await canParticipateInProject(supabase, auth, body.project_id))) {
    throw new HttpError("not a project member", 403);
  }
  const insert = {
    project_id: body.project_id,
    title: String(body.poll_title).trim(),
    description: body.poll_description ?? null,
    date_from: body.poll_date_from,
    date_to: body.poll_date_to,
    slot_minutes: body.poll_slot_minutes ?? 60,
    day_start_hour: body.poll_day_start_hour ?? 8,
    day_end_hour: body.poll_day_end_hour ?? 20,
    time_zone: body.poll_time_zone ?? "Asia/Jakarta",
    state: "open",
    created_by: auth.sub,
  };
  const { data, error } = await supabase
    .from("meeting_polls").insert(insert).select("id").single();
  if (error) throw new HttpError(error.message, 500);

  await logActivity(supabase, auth.sub, "meeting_create",
    { poll_id: data.id, title: insert.title }, body.project_id);
  return ok({ poll_id: data.id });
}

async function meetingUpdate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.poll_id) throw new HttpError("poll_id required");
  const projectId = await loadMeetingProjectId(supabase, body.poll_id);
  if (!projectId) throw new HttpError("poll not found", 404);
  if (!(await canParticipateInProject(supabase, auth, projectId))) {
    throw new HttpError("not a project member", 403);
  }
  const patch: Record<string, unknown> = {};
  if (body.poll_title !== undefined)        patch.title = String(body.poll_title).trim();
  if (body.poll_description !== undefined)  patch.description = body.poll_description;
  if (body.poll_date_from !== undefined)    patch.date_from = body.poll_date_from;
  if (body.poll_date_to !== undefined)      patch.date_to = body.poll_date_to;
  if (body.poll_slot_minutes !== undefined) patch.slot_minutes = body.poll_slot_minutes;
  if (body.poll_day_start_hour !== undefined) patch.day_start_hour = body.poll_day_start_hour;
  if (body.poll_day_end_hour !== undefined)   patch.day_end_hour = body.poll_day_end_hour;
  if (body.poll_time_zone !== undefined)    patch.time_zone = body.poll_time_zone;
  if (Object.keys(patch).length === 0) return ok();

  const { error } = await supabase.from("meeting_polls").update(patch).eq("id", body.poll_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "meeting_update",
    { poll_id: body.poll_id, ...patch }, projectId);
  return ok();
}

async function meetingSetState(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.poll_id) throw new HttpError("poll_id required");
  const projectId = await loadMeetingProjectId(supabase, body.poll_id);
  if (!projectId) throw new HttpError("poll not found", 404);
  if (!(await canParticipateInProject(supabase, auth, projectId))) {
    throw new HttpError("not a project member", 403);
  }
  const state = body.poll_state === "closed" ? "closed" : "open";
  const { error } = await supabase.from("meeting_polls").update({ state }).eq("id", body.poll_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "meeting_set_state",
    { poll_id: body.poll_id, state }, projectId);
  return ok({ state });
}

async function meetingDelete(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  if (!body.poll_id) throw new HttpError("poll_id required");
  const projectId = await loadMeetingProjectId(supabase, body.poll_id);
  if (!projectId) throw new HttpError("poll not found", 404);
  if (!(await canParticipateInProject(supabase, auth, projectId))) {
    throw new HttpError("not a project member", 403);
  }
  // FK ON DELETE CASCADE wipes meeting_responses automatically.
  const { error } = await supabase.from("meeting_polls").delete().eq("id", body.poll_id);
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "meeting_delete",
    { poll_id: body.poll_id }, projectId);
  return ok();
}

async function meetingSetAvailability(
  supabase: SupabaseClient, auth: AuthPayload, body: Body,
): Promise<Response> {
  if (!body.poll_id) throw new HttpError("poll_id required");
  const projectId = await loadMeetingProjectId(supabase, body.poll_id);
  if (!projectId) throw new HttpError("poll not found", 404);
  if (!(await canParticipateInProject(supabase, auth, projectId))) {
    throw new HttpError("not a project member", 403);
  }

  // The user can only set their OWN availability. No target_user_id needed.
  const available = asIsoArray(body.available_slots);
  const maybe     = asIsoArray(body.maybe_slots);

  const row = {
    poll_id: body.poll_id,
    user_id: auth.sub,
    available_slots: available,
    maybe_slots: maybe,
    note: body.response_note ?? null,
    submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("meeting_responses")
    .upsert(row, { onConflict: "poll_id,user_id" });
  if (error) throw new HttpError(error.message, 500);
  await logActivity(supabase, auth.sub, "meeting_set_availability",
    { poll_id: body.poll_id, available: available.length, maybe: maybe.length }, projectId);
  return ok({ available: available.length, maybe: maybe.length });
}
