// Demo-mode handlers for the four Edge Function endpoints. Mutates the
// in-memory store so the rest of the app sees changes on refresh.

import {
  dispatch, getStore, newUuid, nextProjectId, nowIso, setCurrentUser,
} from "./demo";
import type {
  ActivityLogRow, Comment, Deliverable, DeliverableOwner, Project,
  ProjectApprover, Team, User,
} from "./types";

export function demoCall(path: string, body: Record<string, unknown>): unknown {
  switch (path) {
    case "auth-login":         return authLogin(body);
    case "create-project":     return createProject(body);
    case "mutate-deliverable": return mutateDeliverable(body);
    case "admin-mutate":       return adminMutate(body);
    case "mutate-event":       return mutateEvent(body);
    default: throw new Error(`demo: unknown endpoint ${path}`);
  }
}

// ─── auth-login (any password works in demo) ───────────────────────────

function authLogin(body: Record<string, unknown>) {
  const username = String(body.username ?? "").trim().toLowerCase();
  const user = getStore().users.find((u) => u.username === username && u.active);
  if (!user) throw new Error("user not found (demo)");
  setCurrentUser(user.id);
  return {
    token: `demo.token.${user.id}`,
    expires_in: 12 * 60 * 60,
    user: {
      id: user.id, username: user.username, full_name: user.full_name,
      role: user.role, division: user.division, title: user.title,
      can_create_research_project: user.can_create_research_project,
    },
  };
}

// ─── create-project ────────────────────────────────────────────────────

function createProject(body: Record<string, unknown>) {
  const store = getStore();
  const auth = store.users.find((u) => u.id === store.current_user_id);
  if (!auth) throw new Error("not authenticated");
  // Phase 4: only management + admin can create projects.
  if (auth.role !== "management" && auth.role !== "admin") {
    throw new Error("only management can create projects");
  }
  const theme = String(body.theme ?? "").trim();
  if (!theme) throw new Error("theme required");

  const id = nextProjectId();
  const dayZero = String(body.day_zero ?? new Date().toISOString().slice(0, 10));

  const newProject: Project = {
    id, theme,
    description: (body.description as string | undefined) ?? null,
    project_type: "research", visibility: "org", status: "active",
    day_zero: dayZero,
    team_id: (body.team_id as string | null | undefined) ?? null,
    given_by: auth.id, given_at: nowIso(),
    completed_at: null, created_at: nowIso(),
  };
  dispatch((s) => ({ ...s, projects: [...s.projects, newProject] }));

  spawnPipeline(id, dayZero, body, auth.id);
  seedProjectMembers(id, body, auth.id);

  dispatch((s) => ({
    ...s,
    activity_log: [...s.activity_log, {
      id: newUuid(), project_id: id, deliverable_id: null, actor_user_id: auth.id,
      event_type: "create_project", payload: { theme }, created_at: nowIso(),
    }],
  }));

  return { id, project_type: "research" };
}

function seedProjectMembers(projectId: string, body: Record<string, unknown>, actorId: string) {
  const store = getStore();
  const teamId = (body.team_id as string | null | undefined) ?? null;
  if (!teamId) return;
  const userIds = store.team_members.filter((m) => m.team_id === teamId).map((m) => m.user_id);
  const rows = userIds.map((uid) => ({
    project_id: projectId,
    user_id: uid,
    permission: "t1" as const,
    added_by: actorId,
    added_at: nowIso(),
  }));
  dispatch((s) => ({ ...s, project_members: [...s.project_members, ...rows] }));
}

function spawnPipeline(projectId: string, dayZero: string, body: Record<string, unknown>, actorId: string) {
  const store = getStore();
  const mdCount = Math.max(1, Math.min(2, Number(body.md_count ?? 1)));
  const erCount = Math.max(1, Math.min(2, Number(body.er_count ?? 1)));
  const teamId = (body.team_id as string | null | undefined) ?? null;
  const erdVdIds = Array.isArray(body.erd_vd_ids) ? body.erd_vd_ids as string[] : [];
  const irdVdIds = Array.isArray(body.ird_vd_ids) ? body.ird_vd_ids as string[] : [];
  const mrdVdIds = Array.isArray(body.mrd_vd_ids) ? body.mrd_vd_ids as string[] : [];
  // Phase 4: optional per-deliverable date overrides keyed by `${kind}_${seq}`.
  const dueOverrides = (body.due_dates as Record<string, string> | undefined) ?? {};

  const teamMemberIds = teamId
    ? store.team_members.filter((m) => m.team_id === teamId).map((m) => m.user_id)
    : [];
  const teamUsers = store.users.filter((u) => teamMemberIds.includes(u.id));
  const erd = teamUsers.filter((u) => u.division === "ERD").map((u) => u.id);
  const mrd = teamUsers.filter((u) => u.division === "MRD").map((u) => u.id);
  const ird = teamUsers.filter((u) => u.division === "IRD").map((u) => u.id);

  const addDays = (n: number) => {
    const d = new Date(dayZero + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const due = (kind: Deliverable["kind"], seq: number, offset: number): string =>
    dueOverrides[`${kind}_${seq}`] ?? addDays(offset);

  const mkDlv = (
    kind: Deliverable["kind"], seq: number, division: Deliverable["division"],
    offset: number, title: string,
  ): Deliverable => ({
    id: `id-d-${projectId}-${kind.toLowerCase()}-${seq}-${Math.random().toString(36).slice(2, 6)}`,
    project_id: projectId, kind, sequence_no: seq, title, division,
    due_date: due(kind, seq, offset), state: "not_started",
    file_url: null, storage_path: null, file_name: null,
    revision_count: 0, blocked: false, blocker_note: null, blocked_by_deliverable_id: null,
    submitted_at: null, approved_at: null, approved_by: null, published_at: null,
    responsible_divisions: [],
    created_at: nowIso(), updated_at: nowIso(),
  });

  const newDeliverables: Deliverable[] = [];
  const newOwners: DeliverableOwner[] = [];

  // First-cycle offsets: IM D5, MD D15, IO D20, ER D25, LinkedIn+Web D27, IG D34.
  const im = mkDlv("IM", 1, "CROSS", 5, "Investment Memo");
  newDeliverables.push(im);
  for (const uid of [...erd, ...mrd, ...ird]) newOwners.push({ deliverable_id: im.id, user_id: uid, is_lead: false });

  for (let i = 1; i <= mdCount; i++) {
    const d = mkDlv("MD", i, "MRD", 15, mdCount > 1 ? `Market Dive ${i}` : "Market Dive");
    newDeliverables.push(d);
    const owner = mrd[Math.min(i - 1, mrd.length - 1)];
    if (owner) newOwners.push({ deliverable_id: d.id, user_id: owner, is_lead: true });
  }
  const io = mkDlv("IO", 1, "IRD", 20, "Industry Outlook");
  newDeliverables.push(io);
  for (const uid of ird) newOwners.push({ deliverable_id: io.id, user_id: uid, is_lead: false });

  for (let i = 1; i <= erCount; i++) {
    const d = mkDlv("ER", i, "ERD", 25, erCount > 1 ? `Equity Research ${i}` : "Equity Research");
    newDeliverables.push(d);
    const owner = erd[Math.min(i - 1, erd.length - 1)];
    if (owner) newOwners.push({ deliverable_id: d.id, user_id: owner, is_lead: true });
  }
  newDeliverables.push(mkDlv("PUB_LINKEDIN", 1, "MND", 27, "LinkedIn Publication"));
  newDeliverables.push(mkDlv("PUB_WEBSITE",  1, "MND", 27, "Website Publication"));
  newDeliverables.push(mkDlv("PUB_IG",       1, "MND", 34, "Instagram Publication"));

  // Approvers
  const approvers: ProjectApprover[] = [];
  const titleId = (t: string) => store.users.find((u) => u.title === t)?.id;
  const erdDir = titleId("Equity Research Director");
  const mrdDir = titleId("Market Research Director");
  const irdDir = titleId("Industry Research Director");
  const mndDir = titleId("Marketing & Design Director");
  const ceo = titleId("Chief Executive Officer");
  const cro = titleId("Chief Research Officer");
  const add = (division: string, uid: string | undefined) => {
    if (uid) approvers.push({ project_id: projectId, division, user_id: uid });
  };
  add("ERD", erdDir);
  for (const vd of erdVdIds) add("ERD", vd);
  add("MRD", mrdDir);
  for (const vd of mrdVdIds) add("MRD", vd);
  add("IRD", irdDir);
  for (const vd of irdVdIds) add("IRD", vd);
  add("MND", mndDir);
  for (const uid of [ceo, cro, erdDir, mrdDir, irdDir]) add("IM", uid);

  dispatch((s) => ({
    ...s,
    deliverables: [...s.deliverables, ...newDeliverables],
    deliverable_owners: [...s.deliverable_owners, ...newOwners],
    project_approvers: [...s.project_approvers, ...approvers],
    activity_log: [...s.activity_log, {
      id: newUuid(), project_id: projectId, deliverable_id: null, actor_user_id: actorId,
      event_type: "pipeline_spawn", payload: { count: newDeliverables.length }, created_at: nowIso(),
    }],
  }));
}

// ─── mutate-deliverable ────────────────────────────────────────────────

function mutateDeliverable(body: Record<string, unknown>) {
  const action = String(body.action ?? "");
  const store = getStore();
  const auth = store.users.find((u) => u.id === store.current_user_id);
  if (!auth) throw new Error("not authenticated");

  // create_task and delete_task work without a deliverable_id (create) or
  // with one (delete). Handle them up front.
  if (action === "create_task") return createTask(body, auth);

  const dlvId = String(body.deliverable_id ?? "");
  const dlv = store.deliverables.find((d) => d.id === dlvId);
  if (!dlv) throw new Error("deliverable not found");

  if (action === "delete_task") {
    if (dlv.kind !== "CUSTOM") throw new Error("only custom tasks can be deleted");
    if (auth.role !== "management" && auth.role !== "admin" &&
        !store.project_members.some((m) => m.project_id === dlv.project_id && m.user_id === auth.id)) {
      throw new Error("not permitted");
    }
    dispatch((s) => ({
      ...s,
      deliverables: s.deliverables.filter((d) => d.id !== dlvId),
      deliverable_owners: s.deliverable_owners.filter((o) => o.deliverable_id !== dlvId),
      comments: s.comments.filter((c) => c.deliverable_id !== dlvId),
      activity_log: [...s.activity_log, {
        id: newUuid(), project_id: dlv.project_id, deliverable_id: null,
        actor_user_id: auth.id, event_type: "delete_task",
        payload: { title: dlv.title }, created_at: nowIso(),
      }],
    }));
    return { ok: true };
  }

  const owners = store.deliverable_owners.filter((o) => o.deliverable_id === dlvId).map((o) => o.user_id);
  const approvalDiv = dlv.kind === "IM" ? "IM" : dlv.division;
  const approvers = store.project_approvers
    .filter((a) => a.project_id === dlv.project_id && a.division === approvalDiv)
    .map((a) => a.user_id);
  const member = store.project_members.find(
    (m) => m.project_id === dlv.project_id && m.user_id === auth.id,
  );
  const isAdmin = auth.role === "admin";
  const isManagement = auth.role === "management";
  const isApprover = approvers.includes(auth.id);
  const isOwner = owners.includes(auth.id);

  // Phase 4-5 permission rules.
  //   T2 member, management, or admin -> can edit anything on this project
  //   T1 member -> can edit deliverable iff their division is in the
  //                deliverable's responsible_divisions list (or kind = 'IM').
  const respDivs = dlv.responsible_divisions && dlv.responsible_divisions.length > 0
    ? dlv.responsible_divisions
    : [dlv.division];
  const t1CanEdit = !!member && member.permission === "t1"
    && (respDivs.includes(auth.division ?? "") || dlv.kind === "IM");
  const t2CanEdit = !!member && member.permission === "t2";
  const canEdit = isAdmin || isManagement || t2CanEdit || t1CanEdit;

  const patchDlv = (patch: Partial<Deliverable>) => {
    dispatch((s) => ({
      ...s,
      deliverables: s.deliverables.map((d) => d.id === dlvId ? { ...d, ...patch, updated_at: nowIso() } : d),
    }));
  };
  const addComment = (kind: Comment["kind"], bodyText: string) => {
    dispatch((s) => ({
      ...s,
      comments: [...s.comments, {
        id: newUuid(), deliverable_id: dlvId, author_user_id: auth.id,
        kind, body: bodyText, created_at: nowIso(),
      }],
    }));
  };
  const log = (event_type: string, payload?: Record<string, unknown>) => {
    dispatch((s) => ({
      ...s,
      activity_log: [...s.activity_log, {
        id: newUuid(), project_id: dlv.project_id, deliverable_id: dlvId,
        actor_user_id: auth.id, event_type, payload: payload ?? null, created_at: nowIso(),
      } as ActivityLogRow],
    }));
  };

  switch (action) {
    case "submit":
      if (!canEdit && !isOwner) throw new Error("no edit permission on this deliverable");
      if (!["not_started","in_progress"].includes(dlv.state)) throw new Error(`cannot submit from ${dlv.state}`);
      patchDlv({ state: "submitted", submitted_at: nowIso() });
      if (body.body) addComment("submission", String(body.body));
      log("state_change", { from: dlv.state, to: "submitted" });
      return { state: "submitted" };

    case "approve":
      if (!isApprover && !isAdmin) throw new Error("not an approver");
      if (dlv.state !== "submitted") throw new Error(`cannot approve from ${dlv.state}`);
      patchDlv({ state: "approved", approved_at: nowIso(), approved_by: auth.id });
      addComment("approval", "Approved.");
      log("approve");
      return { state: "approved" };

    case "request_revision": {
      if (!isApprover && !isAdmin) throw new Error("not an approver");
      if (dlv.state !== "submitted") throw new Error(`cannot request revision from ${dlv.state}`);
      const note = String(body.body ?? "").trim();
      if (!note) throw new Error("revision note required");
      patchDlv({ state: "in_progress", revision_count: dlv.revision_count + 1, submitted_at: null });
      addComment("revision_request", note);
      log("revision_request", { revision_count: dlv.revision_count + 1 });
      return { state: "in_progress", revision_count: dlv.revision_count + 1 };
    }

    case "publish":
      if (!canEdit && !isApprover && !isOwner) throw new Error("not permitted");
      if (dlv.state !== "approved") throw new Error(`cannot publish from ${dlv.state}`);
      patchDlv({ state: "published", published_at: nowIso() });
      log("publish");
      return { state: "published" };

    case "set_file": {
      if (!canEdit && !isOwner) throw new Error("no edit permission");
      const patch: Partial<Deliverable> = {};
      if (body.file_url !== undefined) patch.file_url = body.file_url as string | null;
      if (body.storage_path !== undefined) patch.storage_path = body.storage_path as string | null;
      if (body.file_name !== undefined) patch.file_name = body.file_name as string | null;
      if (dlv.state === "not_started") patch.state = "in_progress";
      patchDlv(patch);
      log("file_update", patch as Record<string, unknown>);
      return { ok: true };
    }

    case "set_due_date": {
      // Management (or admin) can re-schedule any deliverable. Analysts (even
      // T2) cannot rewrite their own deadlines -- that prevents trivial deadline
      // dodging. If you want to relax this later, also accept canEdit.
      if (!isManagement && !isAdmin) throw new Error("only management can change due dates");
      const newDate = String(body.due_date ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) throw new Error("due_date must be YYYY-MM-DD");
      patchDlv({ due_date: newDate });
      log("set_due_date", { from: dlv.due_date, to: newDate });
      return { ok: true, due_date: newDate };
    }

    case "set_title": {
      if (!isManagement && !isAdmin) throw new Error("only management can rename deliverables");
      const newTitle = String(body.title ?? "").trim();
      if (!newTitle) throw new Error("title required");
      patchDlv({ title: newTitle });
      log("set_title", { title: newTitle });
      return { ok: true };
    }

    case "set_division": {
      if (!isManagement && !isAdmin) throw new Error("only management can change division");
      const newDiv = String(body.division ?? "").toUpperCase();
      if (!["ERD","MRD","IRD","MND","CROSS","NONE"].includes(newDiv)) {
        throw new Error("invalid division");
      }
      patchDlv({
        division: newDiv as typeof dlv.division,
        responsible_divisions: newDiv === "CROSS" ? ["ERD","MRD","IRD"] : [newDiv],
      });
      log("set_division", { from: dlv.division, to: newDiv });
      return { ok: true, division: newDiv };
    }

    case "set_responsible_divisions": {
      if (!isManagement && !isAdmin && !canEdit) throw new Error("not permitted");
      const list = Array.isArray(body.responsible_divisions)
        ? (body.responsible_divisions as string[]).map((s) => s.toUpperCase())
        : [];
      const allowed = new Set(["ERD","MRD","IRD","MND"]);
      const cleaned = list.filter((s) => allowed.has(s));
      if (cleaned.length === 0) throw new Error("pick at least one division");
      const primary = cleaned.length === 1 ? cleaned[0] : "CROSS";
      patchDlv({
        responsible_divisions: cleaned,
        division: primary as typeof dlv.division,
      });
      log("set_responsible_divisions", { divisions: cleaned });
      return { ok: true, responsible_divisions: cleaned, division: primary };
    }

    case "set_blocker": {
      if (!canEdit && !isOwner) throw new Error("no edit permission");
      const note = String(body.blocker_note ?? "").trim();
      if (!note) throw new Error("blocker_note required");
      patchDlv({ blocked: true, blocker_note: note,
                blocked_by_deliverable_id: (body.blocked_by_deliverable_id as string | null | undefined) ?? null });
      addComment("blocker", note);
      log("block", { note });
      return { blocked: true };
    }

    case "unblock":
      if (!canEdit && !isApprover && !isOwner) throw new Error("not permitted");
      patchDlv({ blocked: false, blocker_note: null, blocked_by_deliverable_id: null });
      addComment("unblock", "Blocker cleared.");
      log("unblock");
      return { blocked: false };

    case "add_comment": {
      const text = String(body.body ?? "").trim();
      if (!text) throw new Error("comment body required");
      addComment("comment", text);
      log("comment");
      return { ok: true };
    }
  }
  throw new Error(`unknown action: ${action}`);
}

function createTask(body: Record<string, unknown>, auth: { id: string; role: string }) {
  const projectId = String(body.project_id ?? "");
  const title = String(body.title ?? "").trim();
  const dueDate = String(body.due_date ?? "").trim();
  const list = Array.isArray(body.responsible_divisions)
    ? (body.responsible_divisions as string[]).map((s) => s.toUpperCase())
    : [];
  if (!projectId) throw new Error("project_id required");
  if (!title) throw new Error("title required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("due_date must be YYYY-MM-DD");

  const store = getStore();
  // Members + management + admin can add custom tasks.
  const isMember = store.project_members.some(
    (m) => m.project_id === projectId && m.user_id === auth.id,
  );
  if (auth.role !== "management" && auth.role !== "admin" && !isMember) {
    throw new Error("not a project member");
  }

  const allowed = new Set(["ERD","MRD","IRD","MND"]);
  const cleaned = list.filter((s) => allowed.has(s));
  if (cleaned.length === 0) throw new Error("pick at least one responsible division");
  const primary = cleaned.length === 1 ? cleaned[0] : "CROSS";

  const ownerIds = Array.isArray(body.owner_user_ids) ? body.owner_user_ids as string[] : [];

  // Sequence number: max existing CUSTOM seq on this project + 1
  const maxSeq = store.deliverables
    .filter((d) => d.project_id === projectId && d.kind === "CUSTOM")
    .reduce((mx, d) => Math.max(mx, d.sequence_no), 0);

  const deliverable = {
    id: newUuid(),
    project_id: projectId,
    kind: "CUSTOM" as const,
    sequence_no: maxSeq + 1,
    title,
    division: primary as "ERD" | "MRD" | "IRD" | "MND" | "CROSS" | "NONE",
    responsible_divisions: cleaned,
    due_date: dueDate,
    state: "not_started" as const,
    file_url: null, storage_path: null, file_name: null,
    revision_count: 0, blocked: false, blocker_note: null,
    blocked_by_deliverable_id: null,
    submitted_at: null, approved_at: null, approved_by: null, published_at: null,
    created_at: nowIso(), updated_at: nowIso(),
  };

  dispatch((s) => ({
    ...s,
    deliverables: [...s.deliverables, deliverable],
    deliverable_owners: [
      ...s.deliverable_owners,
      ...ownerIds.map((uid) => ({ deliverable_id: deliverable.id, user_id: uid, is_lead: false })),
    ],
    activity_log: [...s.activity_log, {
      id: newUuid(), project_id: projectId, deliverable_id: deliverable.id,
      actor_user_id: auth.id, event_type: "create_task",
      payload: { title, divisions: cleaned }, created_at: nowIso(),
    }],
  }));

  return { ok: true, id: deliverable.id };
}

// ─── mutate-event (Phase 4 schedule items) ─────────────────────────────

function mutateEvent(body: Record<string, unknown>) {
  const action = String(body.action ?? "");
  const store = getStore();
  const auth = store.users.find((u) => u.id === store.current_user_id);
  if (!auth) throw new Error("not authenticated");
  const isAdmin = auth.role === "admin";
  const isManagement = auth.role === "management";

  const canAddToProject = (projectId: string): boolean => {
    if (isAdmin || isManagement) return true;
    const m = store.project_members.find((m) => m.project_id === projectId && m.user_id === auth.id);
    return !!m; // T1 + T2 can both add events
  };

  switch (action) {
    case "event_create": {
      const projectId = String(body.project_id ?? "");
      const title = String(body.title ?? "").trim();
      const startAt = String(body.start_at ?? "").trim();
      if (!projectId || !title || !startAt) throw new Error("project_id, title, start_at required");
      if (!canAddToProject(projectId)) throw new Error("not a project member");
      const event = {
        id: newUuid(),
        project_id: projectId,
        title,
        start_at: startAt,
        end_at: (body.end_at as string | null | undefined) ?? null,
        kind: ((body.kind as string) ?? "meeting") as "meeting" | "milestone" | "deadline" | "onboarding" | "other",
        location_or_link: (body.location_or_link as string | null | undefined) ?? null,
        description: (body.description as string | null | undefined) ?? null,
        created_by: auth.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      const attendeeIds = Array.isArray(body.attendee_user_ids) ? body.attendee_user_ids as string[] : [];
      dispatch((s) => ({
        ...s,
        project_events: [...s.project_events, event],
        project_event_attendees: [
          ...s.project_event_attendees,
          ...attendeeIds.map((uid) => ({ event_id: event.id, user_id: uid })),
        ],
        activity_log: [...s.activity_log, {
          id: newUuid(), project_id: projectId, deliverable_id: null, actor_user_id: auth.id,
          event_type: "event_create", payload: { title, kind: event.kind }, created_at: nowIso(),
        }],
      }));
      return { ok: true, event };
    }

    case "event_update": {
      const eventId = String(body.event_id ?? "");
      const existing = store.project_events.find((e) => e.id === eventId);
      if (!existing) throw new Error("event not found");
      if (!isAdmin && !isManagement && existing.created_by !== auth.id) {
        throw new Error("only the event creator (or management) can edit it");
      }
      const patch: Record<string, unknown> = { updated_at: nowIso() };
      for (const key of ["title", "start_at", "end_at", "kind", "location_or_link", "description"]) {
        if (body[key] !== undefined) patch[key] = body[key];
      }
      dispatch((s) => ({
        ...s,
        project_events: s.project_events.map((e) => e.id === eventId ? { ...e, ...patch } as typeof e : e),
      }));
      if (Array.isArray(body.attendee_user_ids)) {
        const attendeeIds = body.attendee_user_ids as string[];
        dispatch((s) => ({
          ...s,
          project_event_attendees: [
            ...s.project_event_attendees.filter((a) => a.event_id !== eventId),
            ...attendeeIds.map((uid) => ({ event_id: eventId, user_id: uid })),
          ],
        }));
      }
      return { ok: true };
    }

    case "event_delete": {
      const eventId = String(body.event_id ?? "");
      const existing = store.project_events.find((e) => e.id === eventId);
      if (!existing) throw new Error("event not found");
      if (!isAdmin && !isManagement && existing.created_by !== auth.id) {
        throw new Error("only the event creator (or management) can delete it");
      }
      dispatch((s) => ({
        ...s,
        project_events: s.project_events.filter((e) => e.id !== eventId),
        project_event_attendees: s.project_event_attendees.filter((a) => a.event_id !== eventId),
      }));
      return { ok: true };
    }
  }
  throw new Error(`unknown event action: ${action}`);
}

// ─── admin-mutate ──────────────────────────────────────────────────────

function adminMutate(body: Record<string, unknown>) {
  const action = String(body.action ?? "");
  const store = getStore();
  const auth = store.users.find((u) => u.id === store.current_user_id);
  if (!auth) throw new Error("not authenticated");

  const adminOnly = () => { if (auth.role !== "admin") throw new Error("admin only"); };

  switch (action) {
    case "team_create": {
      adminOnly();
      const name = String(body.name ?? "").trim();
      if (!name) throw new Error("name required");
      const slug = `team-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
      const team: Team = {
        id: newUuid(), slug, name,
        description: (body.description as string | undefined) ?? null,
        archived: false, created_by: auth.id, created_at: nowIso(),
      };
      dispatch((s) => ({ ...s, teams: [...s.teams, team] }));
      const memberIds = Array.isArray(body.member_user_ids) ? body.member_user_ids as string[] : [];
      if (memberIds.length > 0) {
        dispatch((s) => ({
          ...s,
          team_members: [...s.team_members, ...memberIds.map((uid) => ({ team_id: team.id, user_id: uid }))],
        }));
      }
      return { ok: true, team };
    }

    case "team_update": {
      adminOnly();
      const teamId = String(body.team_id ?? "");
      if (!teamId) throw new Error("team_id required");
      dispatch((s) => ({
        ...s,
        teams: s.teams.map((t) => t.id === teamId ? {
          ...t,
          ...(body.name !== undefined ? { name: String(body.name) } : {}),
          ...(body.description !== undefined ? { description: body.description as string | null } : {}),
        } : t),
      }));
      return { ok: true };
    }

    case "team_archive": {
      adminOnly();
      const teamId = String(body.team_id ?? "");
      if (!teamId) throw new Error("team_id required");
      const archived = body.archived !== false;
      dispatch((s) => ({
        ...s,
        teams: s.teams.map((t) => t.id === teamId ? { ...t, archived } : t),
      }));
      return { ok: true };
    }

    case "team_set_members": {
      adminOnly();
      const teamId = String(body.team_id ?? "");
      const ids = Array.isArray(body.member_user_ids) ? body.member_user_ids as string[] : [];
      dispatch((s) => ({
        ...s,
        team_members: [
          ...s.team_members.filter((m) => m.team_id !== teamId),
          ...ids.map((uid) => ({ team_id: teamId, user_id: uid })),
        ],
      }));
      return { ok: true, count: ids.length };
    }

    case "user_create": {
      adminOnly();
      const username = String(body.username ?? "").trim().toLowerCase();
      const full_name = String(body.full_name ?? "").trim();
      if (!username || !full_name) throw new Error("username and full_name required");
      const user: User = {
        id: `u-${username}`, username, full_name,
        role: (body.role as User["role"]) ?? "analyst",
        division: (body.division as User["division"]) ?? null,
        title: (body.title as string | undefined) ?? null,
        can_create_research_project: Boolean(body.can_create_research_project),
        active: true, created_at: nowIso(), last_login_at: null,
      };
      dispatch((s) => ({ ...s, users: [...s.users, user] }));
      return { ok: true, user_id: user.id };
    }

    case "user_update": {
      adminOnly();
      const uid = String(body.user_id ?? "");
      const patch: Partial<User> = {};
      if (body.full_name !== undefined) patch.full_name = body.full_name as string;
      if (body.role !== undefined) patch.role = body.role as User["role"];
      if (body.division !== undefined) patch.division = body.division as User["division"];
      if (body.title !== undefined) patch.title = body.title as string | null;
      if (body.can_create_research_project !== undefined) {
        patch.can_create_research_project = body.can_create_research_project as boolean;
      }
      dispatch((s) => ({
        ...s,
        users: s.users.map((u) => u.id === uid ? { ...u, ...patch } : u),
      }));
      return { ok: true };
    }

    case "user_reset_password":
      adminOnly();
      return { ok: true };

    case "user_toggle_active": {
      adminOnly();
      const uid = String(body.user_id ?? "");
      const active = body.active !== false;
      dispatch((s) => ({
        ...s,
        users: s.users.map((u) => u.id === uid ? { ...u, active } : u),
      }));
      return { ok: true };
    }

    case "project_set_status": {
      const pid = String(body.project_id ?? "");
      const status = body.status as Project["status"];
      dispatch((s) => ({
        ...s,
        projects: s.projects.map((p) => p.id === pid ? {
          ...p, status,
          completed_at: status !== "active" ? nowIso() : null,
        } : p),
      }));
      return { ok: true };
    }

    case "project_set_visibility": {
      const pid = String(body.project_id ?? "");
      const visibility = body.visibility as Project["visibility"];
      dispatch((s) => ({
        ...s,
        projects: s.projects.map((p) => p.id === pid ? { ...p, visibility } : p),
      }));
      return { ok: true };
    }

    case "project_set_theme": {
      if (auth.role !== "management" && auth.role !== "admin") throw new Error("management only");
      const pid = String(body.project_id ?? "");
      const theme = String(body.theme ?? "").trim();
      if (!theme) throw new Error("theme required");
      const description = body.description !== undefined
        ? String(body.description ?? "").trim() || null
        : undefined;
      dispatch((s) => ({
        ...s,
        projects: s.projects.map((p) => p.id === pid
          ? { ...p, theme, ...(description !== undefined ? { description } : {}) }
          : p),
      }));
      return { ok: true };
    }

    case "acl_set": {
      const pid = String(body.project_id ?? "");
      const uid = String(body.target_user_id ?? "");
      const permission = (body.permission as "viewer" | "commenter" | "editor" | "owner") ?? "viewer";
      dispatch((s) => {
        const existing = s.project_access.findIndex((a) => a.project_id === pid && a.user_id === uid);
        const row = { project_id: pid, user_id: uid, permission, granted_by: auth.id, granted_at: nowIso() };
        if (existing >= 0) {
          const next = [...s.project_access];
          next[existing] = row;
          return { ...s, project_access: next };
        }
        return { ...s, project_access: [...s.project_access, row] };
      });
      return { ok: true };
    }

    case "acl_revoke": {
      const pid = String(body.project_id ?? "");
      const uid = String(body.target_user_id ?? "");
      dispatch((s) => ({
        ...s,
        project_access: s.project_access.filter((a) => !(a.project_id === pid && a.user_id === uid)),
      }));
      return { ok: true };
    }

    // ─── Phase 4 project members ────────────────────────────────────
    case "member_add": {
      // Management (or admin) can add members to projects.
      if (auth.role !== "management" && auth.role !== "admin") throw new Error("management only");
      const pid = String(body.project_id ?? "");
      const uid = String(body.target_user_id ?? "");
      const permission = (body.permission as "t1" | "t2") ?? "t1";
      if (!pid || !uid) throw new Error("project_id and target_user_id required");
      dispatch((s) => {
        const exists = s.project_members.some((m) => m.project_id === pid && m.user_id === uid);
        if (exists) {
          return {
            ...s,
            project_members: s.project_members.map((m) =>
              m.project_id === pid && m.user_id === uid ? { ...m, permission } : m,
            ),
          };
        }
        return {
          ...s,
          project_members: [...s.project_members, {
            project_id: pid, user_id: uid, permission,
            added_by: auth.id, added_at: nowIso(),
          }],
        };
      });
      return { ok: true };
    }

    case "member_set_permission": {
      if (auth.role !== "management" && auth.role !== "admin") throw new Error("management only");
      const pid = String(body.project_id ?? "");
      const uid = String(body.target_user_id ?? "");
      const permission = (body.permission as "t1" | "t2") ?? "t1";
      dispatch((s) => ({
        ...s,
        project_members: s.project_members.map((m) =>
          m.project_id === pid && m.user_id === uid ? { ...m, permission } : m,
        ),
      }));
      return { ok: true };
    }

    case "member_remove": {
      if (auth.role !== "management" && auth.role !== "admin") throw new Error("management only");
      const pid = String(body.project_id ?? "");
      const uid = String(body.target_user_id ?? "");
      dispatch((s) => ({
        ...s,
        project_members: s.project_members.filter(
          (m) => !(m.project_id === pid && m.user_id === uid),
        ),
      }));
      return { ok: true };
    }
  }
  throw new Error(`unknown action: ${action}`);
}
