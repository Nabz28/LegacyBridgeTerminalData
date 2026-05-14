// Mutate-deliverable Edge Function.
//
// Single entry point for all deliverable-level changes. Centralizes the
// state-machine + authorization rules so the frontend doesn't need to
// re-implement them. Action map:
//
//   submit           analyst marks their deliverable submitted
//   approve          approver flips submitted -> approved
//   request_revision approver bounces back; increments revision_count
//   set_file         attach a file (url or storage path)
//   set_blocker      analyst raises a blocker (note + optional blocked_by)
//   unblock          clear the blocker
//   add_comment      free-form comment on a deliverable
//   publish          flip approved -> published (for PUB_* kinds)
//
// All mutations write an activity_log row.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { authenticate, AuthPayload } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action =
  | "submit" | "approve" | "request_revision"
  | "set_file" | "set_blocker" | "unblock"
  | "add_comment" | "publish";

type Body = {
  action: Action;
  deliverable_id: string;
  // submit / approve / request_revision / add_comment
  body?: string;
  // set_file
  file_url?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  // set_blocker
  blocker_note?: string;
  blocked_by_deliverable_id?: string | null;
  // Phase 4 management overrides
  due_date?: string;
  title?: string;
  division?: "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE";
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
  if (!payload.action || !payload.deliverable_id) {
    return errorResponse("action and deliverable_id required", 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "management" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ctx = await loadContext(supabase, payload.deliverable_id);
  if (!ctx) return errorResponse("deliverable not found", 404);

  try {
    switch (payload.action) {
      case "submit":           return await handleSubmit(supabase, ctx, auth, payload);
      case "approve":          return await handleApprove(supabase, ctx, auth);
      case "request_revision": return await handleRequestRevision(supabase, ctx, auth, payload);
      case "publish":          return await handlePublish(supabase, ctx, auth);
      case "set_file":         return await handleSetFile(supabase, ctx, auth, payload);
      case "set_blocker":      return await handleSetBlocker(supabase, ctx, auth, payload);
      case "unblock":          return await handleUnblock(supabase, ctx, auth);
      case "add_comment":      return await handleAddComment(supabase, ctx, auth, payload);
      default: return errorResponse("unknown action", 400);
    }
  } catch (e) {
    console.error("mutate failed:", e);
    return errorResponse((e as Error).message, 500);
  }
});

type Ctx = {
  deliverable: {
    id: string;
    project_id: string;
    kind: string;
    division: string;
    state: string;
    revision_count: number;
    blocked: boolean;
  };
  owners: string[];
  approvers: string[];
};

async function loadContext(supabase: SupabaseClient, dlvId: string): Promise<Ctx | null> {
  const { data: d } = await supabase
    .from("deliverables")
    .select("id, project_id, kind, division, state, revision_count, blocked")
    .eq("id", dlvId)
    .maybeSingle();
  if (!d) return null;

  const { data: owners } = await supabase
    .from("deliverable_owners")
    .select("user_id")
    .eq("deliverable_id", dlvId);

  // IM uses 'IM' as the approval division key; others map to their division.
  const approvalDivision = d.kind === "IM" ? "IM" : d.division;
  const { data: approvers } = await supabase
    .from("project_approvers")
    .select("user_id")
    .eq("project_id", d.project_id)
    .eq("division", approvalDivision);

  return {
    deliverable: d,
    owners: (owners ?? []).map((o: { user_id: string }) => o.user_id),
    approvers: (approvers ?? []).map((a: { user_id: string }) => a.user_id),
  };
}

function isOwner(ctx: Ctx, auth: AuthPayload): boolean {
  return ctx.owners.includes(auth.sub);
}
function isApprover(ctx: Ctx, auth: AuthPayload): boolean {
  return ctx.approvers.includes(auth.sub);
}
function isAdmin(auth: AuthPayload): boolean {
  return auth.user_role === "admin";
}

async function logActivity(
  supabase: SupabaseClient,
  ctx: Ctx,
  auth: AuthPayload,
  eventType: string,
  extra?: Record<string, unknown>,
) {
  await supabase.from("activity_log").insert({
    project_id: ctx.deliverable.project_id,
    deliverable_id: ctx.deliverable.id,
    actor_user_id: auth.sub,
    event_type: eventType,
    payload: extra ?? null,
  });
}

// ---------------------------------------------------------------------------

async function handleSubmit(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdmin(auth)) return errorResponse("not an owner", 403);
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
  await logActivity(supabase, ctx, auth, "state_change", { from: ctx.deliverable.state, to: "submitted" });
  return jsonResponse({ state: "submitted" });
}

async function handleApprove(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isApprover(ctx, auth) && !isAdmin(auth)) return errorResponse("not an approver", 403);
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
  await logActivity(supabase, ctx, auth, "approve");
  return jsonResponse({ state: "approved" });
}

async function handleRequestRevision(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isApprover(ctx, auth) && !isAdmin(auth)) return errorResponse("not an approver", 403);
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
  await logActivity(supabase, ctx, auth, "revision_request", {
    revision_count: ctx.deliverable.revision_count + 1,
  });
  return jsonResponse({ state: "in_progress", revision_count: ctx.deliverable.revision_count + 1 });
}

async function handlePublish(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isApprover(ctx, auth) && !isOwner(ctx, auth) && !isAdmin(auth)) {
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
  await logActivity(supabase, ctx, auth, "publish");
  return jsonResponse({ state: "published" });
}

async function handleSetFile(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdmin(auth)) return errorResponse("not an owner", 403);
  const update: Record<string, unknown> = {};
  if (body.file_url !== undefined) update.file_url = body.file_url;
  if (body.storage_path !== undefined) update.storage_path = body.storage_path;
  if (body.file_name !== undefined) update.file_name = body.file_name;
  if (ctx.deliverable.state === "not_started") update.state = "in_progress";

  const { error } = await supabase.from("deliverables").update(update).eq("id", ctx.deliverable.id);
  if (error) throw error;
  await logActivity(supabase, ctx, auth, "file_update", {
    file_url: body.file_url, storage_path: body.storage_path, file_name: body.file_name,
  });
  return jsonResponse({ ok: true });
}

async function handleSetBlocker(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  if (!isOwner(ctx, auth) && !isAdmin(auth)) return errorResponse("not an owner", 403);
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
  await logActivity(supabase, ctx, auth, "block", { note });
  return jsonResponse({ blocked: true });
}

async function handleUnblock(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload) {
  if (!isOwner(ctx, auth) && !isApprover(ctx, auth) && !isAdmin(auth)) {
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
  await logActivity(supabase, ctx, auth, "unblock");
  return jsonResponse({ blocked: false });
}

async function handleAddComment(supabase: SupabaseClient, ctx: Ctx, auth: AuthPayload, body: Body) {
  const text = String(body.body ?? "").trim();
  if (!text) return errorResponse("comment body required", 400);
  if (auth.user_role === "advisor") {
    // advisors get read + comment everywhere
  }
  const { error } = await supabase.from("comments").insert({
    deliverable_id: ctx.deliverable.id,
    author_user_id: auth.sub,
    kind: "comment",
    body: text,
  });
  if (error) throw error;
  await logActivity(supabase, ctx, auth, "comment");
  return jsonResponse({ ok: true });
}
