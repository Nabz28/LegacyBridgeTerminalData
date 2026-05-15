// Edge Function wrappers. Each call attaches the anon key (required by
// Supabase's edge gateway) plus the user's JWT for authenticated endpoints.

import { assertConfig, FUNCTIONS_BASE } from "./config";
import { isDemoMode } from "./demo";
import { demoCall } from "./demoApi";
import { readToken } from "./supabase";
import type { User } from "./types";

async function call<T>(
  path: string,
  body: unknown,
  opts: { auth: boolean } = { auth: true },
): Promise<T> {
  if (isDemoMode()) {
    // Tiny artificial delay so loading states briefly appear, matching prod feel.
    await new Promise((r) => setTimeout(r, 150));
    return demoCall(path, (body ?? {}) as Record<string, unknown>) as T;
  }

  const { anonKey } = assertConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };
  if (opts.auth) {
    const token = readToken();
    if (!token) throw new Error("not authenticated");
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers.Authorization = `Bearer ${anonKey}`;
  }

  const res = await fetch(`${FUNCTIONS_BASE()}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg: string =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : undefined) ??
      `request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

// ─── auth ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  expires_in: number;
  user: User;
}
export function login(username: string, password: string): Promise<LoginResponse> {
  return call<LoginResponse>("auth-login", { username, password }, { auth: false });
}

// ─── create project ───────────────────────────────────────────────────

export interface CreateProjectInput {
  project_type: "research" | "general";
  theme: string;
  description?: string;
  day_zero?: string;
  team_id?: string | null;
  visibility?: "org" | "restricted";
  md_count?: number;
  er_count?: number;
  erd_vd_ids?: string[];
  ird_vd_ids?: string[];
  mrd_vd_ids?: string[];
  access?: Array<{ user_id: string; permission: "viewer" | "commenter" | "editor" | "owner" }>;
  // Phase 4: per-deliverable due date overrides keyed by `${kind}_${seq}`.
  due_dates?: Record<string, string>;
}
export function createProject(input: CreateProjectInput): Promise<{ id: string; project_type: string }> {
  return call("create-project", input);
}

// ─── deliverable mutations ────────────────────────────────────────────

export type MutationAction =
  // State machine
  | "submit" | "approve" | "request_revision" | "publish"
  | "set_blocker" | "unblock"
  // Metadata
  | "set_file" | "set_title" | "set_description"
  | "set_due_date" | "set_start_date" | "set_dates"
  | "set_division" | "set_responsible_divisions"
  | "set_owners"
  // Tasks
  | "create_task" | "delete_task"
  // Discussion
  | "add_comment"
  // Rich notes
  | "add_note" | "update_note" | "delete_note";

export interface MutationInput {
  action: MutationAction;
  deliverable_id?: string;
  body?: string;
  file_url?: string | null;
  storage_path?: string | null;
  file_name?: string | null;
  blocker_note?: string;
  blocked_by_deliverable_id?: string | null;
  due_date?: string;          // YYYY-MM-DD
  start_date?: string | null; // YYYY-MM-DD, nullable
  title?: string;
  description?: string | null;
  division?: "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE";
  responsible_divisions?: string[];
  // create_task / set_owners
  project_id?: string;
  owner_user_ids?: string[];
  // Note actions
  note_id?: string;
  note_body?: string;
  note_color?: "yellow" | "pink" | "blue" | "green" | "red" | "gray" | null;
  note_pinned?: boolean;
}
export function mutateDeliverable(input: MutationInput): Promise<Record<string, unknown>> {
  return call("mutate-deliverable", input);
}

// ─── admin mutations ──────────────────────────────────────────────────

export type AdminAction =
  | "team_create" | "team_update" | "team_archive" | "team_set_members"
  | "user_create" | "user_update" | "user_reset_password" | "user_toggle_active"
  | "project_set_status" | "project_set_visibility" | "project_set_theme" | "project_delete"
  | "acl_set" | "acl_revoke"
  | "member_add" | "member_set_permission" | "member_remove";

export interface AdminMutateInput {
  action: AdminAction;
  // teams
  team_id?: string;
  name?: string;
  archived?: boolean;
  member_user_ids?: string[];
  // users
  user_id?: string;
  username?: string;
  password?: string;
  full_name?: string;
  role?: "admin" | "management" | "analyst" | "advisor";
  division?: string | null;
  title?: string | null;
  can_create_research_project?: boolean;
  active?: boolean;
  // project meta
  project_id?: string;
  status?: "active" | "completed" | "archived" | "cancelled";
  visibility?: "org" | "restricted";
  theme?: string;
  description?: string | null;
  // acl (legacy) + member (Phase 4)
  target_user_id?: string;
  permission?: "viewer" | "commenter" | "editor" | "owner" | "t1" | "t2";
}

export function adminMutate(input: AdminMutateInput): Promise<Record<string, unknown>> {
  return call("admin-mutate", input);
}

// ─── events (Phase 4) ─────────────────────────────────────────────────

export type EventAction = "event_create" | "event_update" | "event_delete";

export interface EventMutateInput {
  action: EventAction;
  event_id?: string;
  project_id?: string;
  title?: string;
  start_at?: string;
  end_at?: string | null;
  kind?: "meeting" | "milestone" | "deadline" | "onboarding" | "other";
  location_or_link?: string | null;
  description?: string | null;
  attendee_user_ids?: string[];
}

export function mutateEvent(input: EventMutateInput): Promise<Record<string, unknown>> {
  return call("mutate-event", input);
}
