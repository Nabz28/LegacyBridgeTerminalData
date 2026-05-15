// DB-shape types mirroring the management.* schema.
// Keep in sync with supabase/migrations/0005_management_schema.sql.

export type UserRole = "admin" | "management" | "analyst" | "advisor";
export type Division =
  | "ERD" | "MRD" | "IRD" | "AMD" | "SPD" | "MND"
  | "Exec" | "QRD" | "Advisor";

export type ProjectType = "research" | "general";
export type ProjectStatus = "active" | "completed" | "archived" | "cancelled";
export type Visibility = "org" | "restricted";

export type DeliverableKind =
  | "IM" | "MD" | "IO" | "ER"
  | "PUB_LINKEDIN" | "PUB_IG" | "PUB_WEBSITE"
  | "CUSTOM";

export type DeliverableState =
  | "not_started" | "in_progress" | "submitted" | "approved" | "published";

export type DeliverableHealth =
  | "on_time" | "late" | "blocked" | "overdue" | "risk" | "on_track";

export type CommentKind =
  | "comment" | "submission" | "revision_request" | "approval" | "blocker" | "unblock";

export type DeliverableDivision =
  | "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE";

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  division: Division | null;
  title: string | null;
  can_create_research_project: boolean;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
}

export interface Project {
  id: string;
  theme: string;
  description: string | null;
  project_type: ProjectType;
  visibility: Visibility;
  status: ProjectStatus;
  day_zero: string;
  team_id: string | null;
  given_by: string;
  given_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  kind: DeliverableKind;
  sequence_no: number;
  title: string | null;
  description?: string | null;
  division: DeliverableDivision;
  // Phase 5: multi-division responsibility. Defaults to [division] for legacy
  // rows; for IM = ['ERD','MRD','IRD']; for custom tasks user picks via checkbox.
  responsible_divisions: string[];
  start_date?: string | null;
  due_date: string;
  state: DeliverableState;
  file_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  revision_count: number;
  blocked: boolean;
  blocker_note: string | null;
  blocked_by_deliverable_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverableStatusView extends Deliverable {
  theme: string;
  day_zero: string;
  team_id: string | null;
  health: DeliverableHealth;
}

export interface DeliverableOwner {
  deliverable_id: string;
  user_id: string;
  is_lead: boolean;
}

export interface Comment {
  id: string;
  deliverable_id: string;
  author_user_id: string;
  kind: CommentKind;
  body: string;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  project_id: string | null;
  deliverable_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectApprover {
  project_id: string;
  division: string;
  user_id: string;
}

export interface Session {
  token: string;
  user: User;
  expires_at: number;
}

// ─── Phase 4 ──────────────────────────────────────────────────────────

export type ProjectPermission = "t1" | "t2";

export interface ProjectMember {
  project_id: string;
  user_id: string;
  permission: ProjectPermission;
  added_by: string | null;
  added_at: string;
}

export type ProjectEventKind = "meeting" | "milestone" | "deadline" | "onboarding" | "other";

export interface ProjectEvent {
  id: string;
  project_id: string;
  title: string;
  start_at: string;       // ISO timestamp
  end_at: string | null;
  kind: ProjectEventKind;
  location_or_link: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEventAttendee {
  event_id: string;
  user_id: string;
}

// ─── Meeting polls (0017) ─────────────────────────────────────────────

export interface MeetingPoll {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  date_from: string;          // YYYY-MM-DD
  date_to: string;            // YYYY-MM-DD
  slot_minutes: 15 | 30 | 60 | 120;
  day_start_hour: number;     // 0..23
  day_end_hour: number;       // 1..24
  time_zone: string;
  state: "open" | "closed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingResponse {
  poll_id: string;
  user_id: string;
  available_slots: string[];  // ISO timestamps (start of slot)
  maybe_slots: string[];
  note: string | null;
  submitted_at: string;
  updated_at: string;
}

// ─── Notes (0015) ─────────────────────────────────────────────────────

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "red" | "gray";

export interface DeliverableNote {
  id: string;
  deliverable_id: string;
  author_user_id: string | null;
  body: string;
  pinned: boolean;
  color: NoteColor | null;
  created_at: string;
  updated_at: string;
}
