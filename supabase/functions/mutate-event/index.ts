// mutate-event: project_events CRUD endpoint for the Calendar view.
//
// Action dispatch:
//   event_create   -- any project member (T1/T2) or admin/management
//   event_update   -- event creator, admin, or management
//   event_delete   -- event creator, admin, or management
//
// Mirrors the demoApi.ts reference impl. Every mutation appends an
// activity_log row so the audit trail stays consistent across deliverable
// and event flows.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { authenticate, AuthPayload } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action = "event_create" | "event_update" | "event_delete";
type EventKind = "meeting" | "milestone" | "deadline" | "onboarding" | "other";

interface Body {
  action: Action;
  event_id?: string;
  project_id?: string;
  title?: string;
  start_at?: string;
  end_at?: string | null;
  kind?: EventKind;
  location_or_link?: string | null;
  description?: string | null;
  attendee_user_ids?: string[];
}

class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
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
    switch (body.action) {
      case "event_create": return await eventCreate(supabase, auth, body);
      case "event_update": return await eventUpdate(supabase, auth, body);
      case "event_delete": return await eventDelete(supabase, auth, body);
      default: return errorResponse("unknown action", 400);
    }
  } catch (e) {
    if (e instanceof HttpError) return errorResponse(e.message, e.status);
    console.error("mutate-event failed:", e);
    return errorResponse((e as Error).message, 500);
  }
});

function ok(payload: Record<string, unknown> = {}): Response {
  return jsonResponse({ ok: true, ...payload });
}

async function logActivity(
  supabase: SupabaseClient, actor: string,
  eventType: string, payload: Record<string, unknown>,
  projectId?: string,
): Promise<void> {
  await supabase.from("activity_log").insert({
    project_id: projectId ?? null,
    actor_user_id: actor,
    event_type: eventType,
    payload,
  });
}

async function canAddToProject(
  supabase: SupabaseClient, auth: AuthPayload, projectId: string,
): Promise<boolean> {
  if (auth.user_role === "admin" || auth.user_role === "management") return true;
  const { data, error } = await supabase
    .from("project_members")
    .select("permission")
    .eq("project_id", projectId)
    .eq("user_id", auth.sub)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  return !!data;
}

async function loadEvent(
  supabase: SupabaseClient, eventId: string,
): Promise<{ id: string; project_id: string; created_by: string | null }> {
  const { data, error } = await supabase
    .from("project_events")
    .select("id, project_id, created_by")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("event not found", 404);
  return data as { id: string; project_id: string; created_by: string | null };
}

function canEditEvent(auth: AuthPayload, creatorId: string | null): boolean {
  if (auth.user_role === "admin" || auth.user_role === "management") return true;
  return creatorId === auth.sub;
}

async function eventCreate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const projectId = String(body.project_id ?? "");
  const title = String(body.title ?? "").trim();
  const startAt = String(body.start_at ?? "").trim();
  if (!projectId || !title || !startAt) {
    throw new HttpError("project_id, title, start_at required");
  }
  if (!(await canAddToProject(supabase, auth, projectId))) {
    throw new HttpError("not a project member", 403);
  }

  const kind: EventKind = body.kind ?? "meeting";
  const insert = {
    project_id: projectId,
    title,
    start_at: startAt,
    end_at: body.end_at ?? null,
    kind,
    location_or_link: body.location_or_link ?? null,
    description: body.description ?? null,
    created_by: auth.sub,
  };

  const { data, error } = await supabase
    .from("project_events")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new HttpError(error.message, 500);

  const attendeeIds = Array.isArray(body.attendee_user_ids) ? body.attendee_user_ids : [];
  if (attendeeIds.length > 0) {
    const rows = attendeeIds.map((uid) => ({ event_id: data.id, user_id: uid }));
    const { error: attErr } = await supabase.from("project_event_attendees").insert(rows);
    if (attErr) throw new HttpError(attErr.message, 500);
  }

  await logActivity(supabase, auth.sub, "event_create",
    { event_id: data.id, title, kind }, projectId);

  return ok({ event: data });
}

async function eventUpdate(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const eventId = String(body.event_id ?? "");
  if (!eventId) throw new HttpError("event_id required");

  const existing = await loadEvent(supabase, eventId);
  if (!canEditEvent(auth, existing.created_by)) {
    throw new HttpError("only the event creator (or management) can edit it", 403);
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.start_at !== undefined) patch.start_at = body.start_at;
  if (body.end_at !== undefined) patch.end_at = body.end_at;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.location_or_link !== undefined) patch.location_or_link = body.location_or_link;
  if (body.description !== undefined) patch.description = body.description;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("project_events")
      .update(patch)
      .eq("id", eventId);
    if (error) throw new HttpError(error.message, 500);
  }

  if (Array.isArray(body.attendee_user_ids)) {
    const { error: delErr } = await supabase
      .from("project_event_attendees")
      .delete()
      .eq("event_id", eventId);
    if (delErr) throw new HttpError(delErr.message, 500);
    if (body.attendee_user_ids.length > 0) {
      const rows = body.attendee_user_ids.map((uid) => ({ event_id: eventId, user_id: uid }));
      const { error: insErr } = await supabase.from("project_event_attendees").insert(rows);
      if (insErr) throw new HttpError(insErr.message, 500);
    }
  }

  await logActivity(supabase, auth.sub, "event_update",
    { event_id: eventId, ...patch }, existing.project_id);

  return ok();
}

async function eventDelete(supabase: SupabaseClient, auth: AuthPayload, body: Body): Promise<Response> {
  const eventId = String(body.event_id ?? "");
  if (!eventId) throw new HttpError("event_id required");

  const existing = await loadEvent(supabase, eventId);
  if (!canEditEvent(auth, existing.created_by)) {
    throw new HttpError("only the event creator (or management) can delete it", 403);
  }

  const { error } = await supabase
    .from("project_events")
    .delete()
    .eq("id", eventId);
  if (error) throw new HttpError(error.message, 500);

  await logActivity(supabase, auth.sub, "event_delete",
    { event_id: eventId }, existing.project_id);

  return ok();
}
