// Mutate-deliverable Edge Function.
//
// Single entry point for all deliverable-level changes. Centralizes the
// state-machine + authorization rules so the frontend doesn't need to
// re-implement them. Action map:
//
//   State machine
//     submit                 owner -> submitted
//     approve                approver -> approved
//     request_revision       approver -> in_progress (revision_count++)
//     publish                approved -> published
//     set_blocker            owner raises a blocker (with note)
//     unblock                clear blocker
//
//   Metadata (admin / management / project owner)
//     set_file               attach/replace deliverable file
//     set_title              rename
//     set_description        long-form context (e.g. for CUSTOM tasks)
//     set_due_date           change due date (Gantt-positioning)
//     set_division           change primary division
//     set_responsible_divisions  change responsible-divisions array
//     set_owners             reassign owners (array of user_ids)
//
//   Tasks (CUSTOM kind)
//     create_task            spawn a new CUSTOM deliverable in a project
//     delete_task            hard-delete a deliverable (cascades comments/notes/owners)
//
//   Discussion thread
//     add_comment            free-form comment
//
//   Rich notes (separate from comments)
//     add_note               new note on a deliverable
//     update_note            edit body / color / pinned state
//     delete_note            remove a note (author OR admin/management)
//
// Every mutation writes a row to management.activity_log so the audit
// trail covers every state change and metadata edit.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { authenticate, AuthPayload } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action =
  // state
  | "submit" | "approve" | "request_revision" | "publish"
  | "set_blocker" | "unblock"
  // metadata
  | "set_file" | "set_title" | "set_description"
  | "set_due_date" | "set_division" | "set_responsible_divisions"
  | "set_owners"
  // tasks
  | "create_task" | "delete_task"
  // discussion
  | "add_comment"
  // rich notes
  | "add_note" | "update_note" | "delete_note";

type Body = {
  action: Action;
  // Most actions target an existing deliverable
  deliverable_id?: string;
  // submit / approve / request_revision / add_comment
  body?: string;
  // set_file
  file_url?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  // set_blocker
  blocker_note?: string;
  blocked_by_deliverable_id?: string | null;
  // metadata
  title?: string;
  description?: string | null;
  due_date?: string;          // YYYY-MM-DD
  division?: "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE";
  responsible_divisions?: string[];
  owner_user_ids?: string[];
  // create_task
  project_id?: string;
  // notes
  note_id?: string;
  note_body?: string;
  note_color?: "yellow" | "pink" | "blue" | "green" | "red" | "gray" | null;
  note_pinned?: boolean;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = await authenticate(req);
  if (!auth) return errorResponse("not authenticated", 401);

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("invalid json", 400);
  }
  if (!payload.action) {
    return errorResponse("action required", 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "management" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // create_task / delete_note (with no deliverable_id) handled before context load
    if (payload.action === "create_task") {
      return await handleCreateTask(supabase, auth, payload);
    }
    if (payload.action === "delete_note") {
      return await handleDeleteNote(supabase, auth, payload);
    }
    if (payload.action === "update_note") {
      return await handleUpdateNote(supabase, auth, payload);
    }

    if (!payload.deliverable_id) {
      return errorResponse("deliverable_id required", 400);
    }
    const ctx = await loadContext(supabase, payload.deliverable_id);
    if (!ctx) return errorResponse("deliverable not found", 404);

    switch (payload.action) {
      case "submit":           return await handleSubmit(supabase, ctx, auth, payload);
      case "approve":          return await handleApprove(supabase, ctx, auth);
      case "request_revision": return await handleRequestRevision(supabase, ctx, auth, payload);
      case "publish":          return await handlePublish(supabase, ctx, auth);
      case "set_file":         return await handleSetFile(supabase, ctx, auth, payload);
      case "set_blocker":      return await handleSetBlocker(supabase, ctx, auth, payload);
      case "unblock":          return await handleUnblock(supabase, ctx, auth);
      case "add_comment":      return await handleAddComment(supabase, ctx, auth, payload);
      case "set_title":        return await handleSetTitle(supabase, ctx, auth, payload);
      case "set_description":  return await handleSetDescription(supabase, ctx, auth, payload);
      case "set_due_date":     return await handleSetDueDate(supabase, ctx, auth, payload);
      case "set_division":     return await handleSetDivision(supabase, ctx, auth, payload);
      case "set_responsible_divisions":
                                return await handleSetResponsibleDivisions(supabase, ctx, auth, payload);
      case "set_owners":       return await handleSetOwners(supabase, ctx, auth, payload);
      case "delete_task":      return await handleDeleteTask(supabase, ctx, auth);
      case "add_note":         return await handleAddNote(supabase, ctx, auth, payload);
      default:                 return errorResponse("unknown action", 400);
    }
  } catch (e) {
    console.error("mutate-deliverable failed:", e);
    return errorResponse((e as Error).message, 500);
  }
});

// ────────────────────────────────────────────────────────────────────────
// Context + permission helpers
// ────────────────────────────────────────────────────────────────────────

type Ctx = {
  deliverable: {
    id: string;
    project_id: string;
    kind: string;
    division: string;
    state: string;
    revision_count: number;
    blocked: boolean;
    title: string | null;
  };
  owners: string[];
  approvers: string[];
  givenBy: string | null;
  membershipTier: "t1" | "t2" | null;  // current user's membership in this project
};

async function loadContext(supabase: SupabaseClient, dlvId: string): Promise<Ctx | null> {
  const { data: d } = await supabase
    .from("deliverables")
    .select("id, project_id, kind, division, state, revision_count, blocked, title")
    .eq("id", dlvId)
    .maybeSingle();
  if (!d) return null;

  const { data: owners } = await supabase
    .from("deliverable_owners")
    .select("user_id")
    .eq("deliverable_id", dlvId);

  const approvalDivision = d.kind === "IM" ? "IM" : d.division;
  const { data: approvers } = await supabase
    .from("project_approvers")
    .select("user_id")
    .eq("project_id", d.project_id)
    .eq("division", approvalDivision);

  const { data: proj } = await supabase
    .from("projects")
    .select("given_by")
    .eq("id", d.project_id)
    .maybeSingle();

  return {
    deliverable: d,
    owners: (owners ?? []).map((o: { user_id: string }) => o.user_id),
    approvers: (approvers ?? []).map((a: { user_id: string }) => a.user_id),
    givenBy: proj?.given_by ?? null,
    membershipTier: null,
  };
}

async function loadMembershipTier(
  supabase: SupabaseClient, projectId: string, userId: string,
): Promise<"t1" | "t2" | null> {
  const { data } = await supabase
    .from("project_members")
    .select("permission")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return data.permission === "t2" ? "t2" : "t1";
}

function isAdminOrMgmt(auth: AuthPayload): boolean {
  return auth.user_role === "admin" || auth.user_role === "management";
}
function isOwner(ctx: Ctx, auth: AuthPayload): boolean {
  return ctx.owners.includes(auth.sub);
}
function isApprover(ctx: Ctx, auth: AuthPayload): boolean {
  return ctx.approvers.includes(auth.sub);
}
function isProjectOwner(ctx: Ctx, auth: AuthPayload): boolean {
  return ctx.givenBy === auth.sub;
}

// canEditDeliverable: who's allowed to change titles, due dates, owners, etc.
// - admin + management role: always
// - project creator (given_by): always
// - T2 member: always (project-wide editor)
// - T1 member: only if THIS deliverable's division (or CROSS) matches their own
async function canEditDeliverable(
  supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload,
): Promise<boolean> {
  if (isAdminOrMgmt(auth)) return true;
  if (isProjectOwner(ctx, auth)) return true;
  const tier = await loadMembershipTier(supabase, ctx.deliverable.project_id, auth.sub);
  if (tier === "t2") return true;
  if (tier === "t1") {
    // T1 = their own division + the cross-cutting IM
    const dv = ctx.deliverable.division;
    if (dv === "CROSS" || dv === "IM") return true;
    if (auth.division && dv === auth.division) return true;
  }
  if (isOwner(ctx, auth)) return true;
  return false;
}

// ────────────────────────────────────────────────────────────────────────
// Activity log + Project ID helpers
// ────────────────────────────────────────────────────────────────────────

async function logActivity(
  supabase: SupabaseClient,
  projectId: string,
  deliverableId: string | null,
  actor: string,
  eventType: string,
  extra?: Record<string, unknown>,
) {
  await supabase.from("activity_log").insert({
    project_id: projectId,
    deliverable_id: deliverableId,
    actor_user_id: actor,
    event_type: eventType,
    payload: extra ?? null,
  });
}

// ────────────────────────────────────────────────────────────────────────
// State machine handlers (unchanged behaviour from prior version)
// ────────────────────────────────────────────────────────────────────────

async function handleSubmit(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdminOrMgmt(auth)) return errorResponse("not an owner", 403);
  if (!["not_started", "in_progress"].includes(ctx.deliverable.state)) {
    return errorResponse(`cannot submit from state ${ctx.deliverable.state}`, 409);
  }
  const { error } = await supabase
    .from("deliverables")
    .update({ state: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  if (body.body) {
    await supabase.from("comments").insert({
      deliverable_id: ctx.deliverable.id,
      author_user_id: auth.sub,
      kind: "submission",
      body: body.body,
    });
  }
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "state_change",
    { from: ctx.deliverable.state, to: "submitted" });
  return jsonResponse({ state: "submitted" });
}

async function handleApprove(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isApprover(ctx, auth) && !isAdminOrMgmt(auth)) return errorResponse("not an approver", 403);
  if (ctx.deliverable.state !== "submitted") {
    return errorResponse(`cannot approve from state ${ctx.deliverable.state}`, 409);
  }
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("deliverables")
    .update({ state: "approved", approved_at: now, approved_by: auth.sub })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "approval",
    body: "Approved.",
  });
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "approve");
  return jsonResponse({ state: "approved" });
}

async function handleRequestRevision(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isApprover(ctx, auth) && !isAdminOrMgmt(auth)) return errorResponse("not an approver", 403);
  if (ctx.deliverable.state !== "submitted") {
    return errorResponse(`cannot request revision from state ${ctx.deliverable.state}`, 409);
  }
  const note = String(body.body ?? "").trim();
  if (!note) return errorResponse("revision note required", 400);

  const { error } = await supabase
    .from("deliverables")
    .update({
      state: "in_progress",
      revision_count: ctx.deliverable.revision_count + 1,
      submitted_at: null,
    })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "revision_request",
    body: note,
  });
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "revision_request",
    { revision_count: ctx.deliverable.revision_count + 1 });
  return jsonResponse({ state: "in_progress", revision_count: ctx.deliverable.revision_count + 1 });
}

async function handlePublish(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isApprover(ctx, auth) && !isOwner(ctx, auth) && !isAdminOrMgmt(auth)) {
    return errorResponse("not permitted", 403);
  }
  if (ctx.deliverable.state !== "approved") {
    return errorResponse(`cannot publish from state ${ctx.deliverable.state}`, 409);
  }
  const { error } = await supabase
    .from("deliverables")
    .update({ state: "published", published_at: new Date().toISOString() })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "publish");
  return jsonResponse({ state: "published" });
}

async function handleSetFile(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdminOrMgmt(auth)) return errorResponse("not an owner", 403);
  const update: Record<string, unknown> = {};
  if (body.file_url !== undefined) update.file_url = body.file_url;
  if (body.storage_path !== undefined) update.storage_path = body.storage_path;
  if (body.file_name !== undefined) update.file_name = body.file_name;
  if (ctx.deliverable.state === "not_started") update.state = "in_progress";

  const { error } = await supabase.from("deliverables").update(update).eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "file_update",
    { file_url: body.file_url, storage_path: body.storage_path, file_name: body.file_name });
  return jsonResponse({ ok: true });
}

async function handleSetBlocker(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdminOrMgmt(auth)) return errorResponse("not an owner", 403);
  const note = String(body.blocker_note ?? "").trim();
  if (!note) return errorResponse("blocker_note required", 400);

  const { error } = await supabase
    .from("deliverables")
    .update({
      blocked: true,
      blocker_note: note,
      blocked_by_deliverable_id: body.blocked_by_deliverable_id ?? null,
    })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "blocker",
    body: note,
  });
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "block", { note });
  return jsonResponse({ blocked: true });
}

async function handleUnblock(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isOwner(ctx, auth) && !isApprover(ctx, auth) && !isAdminOrMgmt(auth)) {
    return errorResponse("not permitted", 403);
  }
  const { error } = await supabase
    .from("deliverables")
    .update({ blocked: false, blocker_note: null, blocked_by_deliverable_id: null })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "unblock",
    body: "Blocker cleared.",
  });
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "unblock");
  return jsonResponse({ blocked: false });
}

async function handleAddComment(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  const text = String(body.body ?? "").trim();
  if (!text) return errorResponse("comment body required", 400);
  const { error } = await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "comment",
    body: text,
  });
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "comment");
  return jsonResponse({ ok: true });
}

// ────────────────────────────────────────────────────────────────────────
// Metadata editors -- all gated on canEditDeliverable
// ────────────────────────────────────────────────────────────────────────

async function handleSetTitle(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const title = String(body.title ?? "").trim();
  if (!title) return errorResponse("title required", 400);
  const { error } = await supabase
    .from("deliverables")
    .update({ title })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "set_title",
    { title, previous: ctx.deliverable.title });
  return jsonResponse({ ok: true });
}

async function handleSetDescription(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const description = body.description == null ? null : String(body.description);
  const { error } = await supabase
    .from("deliverables")
    .update({ description })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "set_description");
  return jsonResponse({ ok: true });
}

async function handleSetDueDate(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const due_date = String(body.due_date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) return errorResponse("due_date must be YYYY-MM-DD", 400);
  const { error } = await supabase
    .from("deliverables")
    .update({ due_date })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "set_due_date",
    { due_date });
  return jsonResponse({ ok: true });
}

async function handleSetDivision(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const division = body.division;
  if (!division || !["ERD", "MRD", "IRD", "MND", "CROSS", "NONE"].includes(division)) {
    return errorResponse("invalid division", 400);
  }
  const { error } = await supabase
    .from("deliverables")
    .update({ division })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "set_division",
    { division });
  return jsonResponse({ ok: true });
}

async function handleSetResponsibleDivisions(
  supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body,
) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const divs = Array.isArray(body.responsible_divisions) ? body.responsible_divisions : [];
  const valid = divs.every((d) => ["ERD", "MRD", "IRD", "MND"].includes(d));
  if (!valid) return errorResponse("responsible_divisions must each be ERD/MRD/IRD/MND", 400);
  // The 0011 trigger keeps `division` in sync (primary = first; CROSS if >1).
  const { error } = await supabase
    .from("deliverables")
    .update({ responsible_divisions: divs })
    .eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub,
    "set_responsible_divisions", { responsible_divisions: divs });
  return jsonResponse({ ok: true });
}

async function handleSetOwners(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const ids = Array.isArray(body.owner_user_ids) ? body.owner_user_ids : null;
  if (!ids) return errorResponse("owner_user_ids array required", 400);

  // Strategy: replace the whole owner set. Delete all existing rows, then
  // insert the new set. Wrapped in a single round-trip series; ON DELETE
  // CASCADE on deliverable_owners means no orphans.
  const { error: delErr } = await supabase
    .from("deliverable_owners")
    .delete()
    .eq("deliverable_id", ctx.deliverable.id);
  if (delErr) throw delErr;

  if (ids.length > 0) {
    const rows = ids.map((uid) => ({
      deliverable_id: ctx.deliverable.id,
      user_id: uid,
      is_lead: false,
    }));
    const { error: insErr } = await supabase.from("deliverable_owners").insert(rows);
    if (insErr) throw insErr;
  }
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "set_owners",
    { owner_user_ids: ids });
  return jsonResponse({ ok: true, owner_user_ids: ids });
}

// ────────────────────────────────────────────────────────────────────────
// Tasks (CUSTOM kind)
// ────────────────────────────────────────────────────────────────────────

async function handleCreateTask(supabase: SupabaseClient, auth: AuthPayload, body: Body) {
  const project_id = String(body.project_id ?? "");
  const title = String(body.title ?? "").trim();
  const due_date = String(body.due_date ?? "").trim();
  if (!project_id) return errorResponse("project_id required", 400);
  if (!title) return errorResponse("title required", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) return errorResponse("due_date must be YYYY-MM-DD", 400);

  const respDivs = Array.isArray(body.responsible_divisions) ? body.responsible_divisions : [];
  const validResp = respDivs.every((d) => ["ERD", "MRD", "IRD", "MND"].includes(d));
  if (!validResp) return errorResponse("responsible_divisions must each be ERD/MRD/IRD/MND", 400);

  // Permission: admin/management OR the project's given_by OR a T2 member.
  const { data: proj } = await supabase
    .from("projects").select("given_by").eq("id", project_id).maybeSingle();
  if (!proj) return errorResponse("project not found", 404);

  let allowed = isAdminOrMgmt(auth) || proj.given_by === auth.sub;
  if (!allowed) {
    const tier = await loadMembershipTier(supabase, project_id, auth.sub);
    allowed = tier === "t2";
  }
  if (!allowed) return errorResponse("not permitted", 403);

  // Pick a unique sequence_no for kind=CUSTOM within this project.
  const { data: existing } = await supabase
    .from("deliverables")
    .select("sequence_no")
    .eq("project_id", project_id)
    .eq("kind", "CUSTOM");
  const maxSeq = (existing ?? []).reduce(
    (m: number, r: { sequence_no: number }) => Math.max(m, r.sequence_no ?? 0), 0,
  );

  // Primary division = first responsible div; the 0011 trigger will overwrite
  // to CROSS if >1. If none chosen, default to NONE.
  const primaryDivision =
    respDivs.length >= 2 ? "CROSS" :
    respDivs.length === 1 ? respDivs[0] :
    "NONE";

  const insertRow = {
    project_id,
    kind: "CUSTOM",
    sequence_no: maxSeq + 1,
    title,
    description: body.description ?? null,
    division: primaryDivision,
    responsible_divisions: respDivs,
    due_date,
    state: "not_started",
  };
  const { data: created, error } = await supabase
    .from("deliverables")
    .insert(insertRow)
    .select("id")
    .single();
  if (error) throw error;

  // Owners
  const ownerIds = Array.isArray(body.owner_user_ids) ? body.owner_user_ids : [];
  if (ownerIds.length > 0) {
    const ownerRows = ownerIds.map((uid) => ({
      deliverable_id: created.id, user_id: uid, is_lead: false,
    }));
    await supabase.from("deliverable_owners").insert(ownerRows);
  }

  await logActivity(supabase, project_id, created.id, auth.sub, "create_task",
    { title, due_date, responsible_divisions: respDivs, owner_user_ids: ownerIds });
  return jsonResponse({ ok: true, deliverable_id: created.id });
}

async function handleDeleteTask(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  // Permission: admin/management OR project owner OR T2. The deliverable's
  // child rows (owners, comments, notes, activity_log) cascade away via FK.
  if (!(await canEditDeliverable(supabase, ctx, auth))) return errorResponse("not permitted", 403);

  // Snapshot before delete so the post-delete log entry has context
  // (activity_log rows for this deliverable cascade; we keep a final
  // entry at the project level for the audit trail).
  const snapshot = {
    deliverable_id: ctx.deliverable.id,
    kind: ctx.deliverable.kind,
    title: ctx.deliverable.title,
    state: ctx.deliverable.state,
  };

  const { error } = await supabase
    .from("deliverables")
    .delete()
    .eq("id", ctx.deliverable.id);
  if (error) throw error;

  // Final audit-trail row at project level (deliverable_id = NULL so it survives the cascade).
  await logActivity(supabase, ctx.deliverable.project_id, null, auth.sub, "delete_task", snapshot);
  return jsonResponse({ ok: true });
}

// ────────────────────────────────────────────────────────────────────────
// Rich notes
// ────────────────────────────────────────────────────────────────────────

const ALLOWED_NOTE_COLORS = ["yellow", "pink", "blue", "green", "red", "gray"];

async function handleAddNote(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!(await canViewProject(supabase, ctx, auth))) return errorResponse("not permitted", 403);
  const noteBody = String(body.note_body ?? "").trim();
  if (!noteBody) return errorResponse("note_body required", 400);
  const color = body.note_color && ALLOWED_NOTE_COLORS.includes(body.note_color) ? body.note_color : null;
  const pinned = !!body.note_pinned;

  const { data: row, error } = await supabase
    .from("deliverable_notes")
    .insert({
      deliverable_id: ctx.deliverable.id,
      author_user_id: auth.sub,
      body: noteBody,
      color,
      pinned,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  await logActivity(supabase, ctx.deliverable.project_id, ctx.deliverable.id, auth.sub, "note_add",
    { note_id: row.id, pinned, color });
  return jsonResponse({ ok: true, note_id: row.id, created_at: row.created_at });
}

async function handleUpdateNote(supabase: SupabaseClient, auth: AuthPayload, body: Body) {
  const noteId = String(body.note_id ?? "");
  if (!noteId) return errorResponse("note_id required", 400);
  const { data: note } = await supabase
    .from("deliverable_notes")
    .select("id, deliverable_id, author_user_id")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return errorResponse("note not found", 404);

  // Author can always edit; admin/management can edit any.
  const ownNote = note.author_user_id === auth.sub;
  if (!ownNote && !isAdminOrMgmt(auth)) {
    return errorResponse("not permitted", 403);
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.note_body === "string") {
    const text = body.note_body.trim();
    if (!text) return errorResponse("note_body cannot be empty", 400);
    patch.body = text;
  }
  if (body.note_color !== undefined) {
    patch.color = body.note_color === null
      ? null
      : (ALLOWED_NOTE_COLORS.includes(body.note_color) ? body.note_color : null);
  }
  if (typeof body.note_pinned === "boolean") patch.pinned = body.note_pinned;

  if (Object.keys(patch).length === 0) return jsonResponse({ ok: true });

  const { error } = await supabase
    .from("deliverable_notes")
    .update(patch)
    .eq("id", noteId);
  if (error) throw error;

  // Look up project_id for the audit log.
  const { data: dlv } = await supabase
    .from("deliverables")
    .select("project_id")
    .eq("id", note.deliverable_id)
    .maybeSingle();
  await logActivity(supabase, dlv?.project_id ?? "", note.deliverable_id, auth.sub, "note_update",
    { note_id: noteId, ...patch });
  return jsonResponse({ ok: true });
}

async function handleDeleteNote(supabase: SupabaseClient, auth: AuthPayload, body: Body) {
  const noteId = String(body.note_id ?? "");
  if (!noteId) return errorResponse("note_id required", 400);
  const { data: note } = await supabase
    .from("deliverable_notes")
    .select("id, deliverable_id, author_user_id")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return errorResponse("note not found", 404);

  const ownNote = note.author_user_id === auth.sub;
  if (!ownNote && !isAdminOrMgmt(auth)) {
    return errorResponse("not permitted", 403);
  }

  const { data: dlv } = await supabase
    .from("deliverables")
    .select("project_id")
    .eq("id", note.deliverable_id)
    .maybeSingle();

  const { error } = await supabase
    .from("deliverable_notes")
    .delete()
    .eq("id", noteId);
  if (error) throw error;

  await logActivity(supabase, dlv?.project_id ?? "", note.deliverable_id, auth.sub, "note_delete",
    { note_id: noteId });
  return jsonResponse({ ok: true });
}

// Everyone authenticated can VIEW any project (per current RLS); this is
// permissive on purpose -- the read gate is at the project-visibility
// level and isn't enforced here. We keep the helper so future RLS-driven
// gating has a clean hook.
async function canViewProject(_supabase: SupabaseClient, _ctx: Ctx, auth: AuthPayload): Promise<boolean> {
  return Boolean(auth.sub);
}
