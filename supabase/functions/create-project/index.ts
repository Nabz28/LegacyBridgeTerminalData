// Create-project Edge Function.
//
// Research projects auto-spawn the standard pipeline deliverables on insert,
// bind owners from team membership, and register the default approver matrix
// (division heads + per-project VDs + IM approvers = CEO/CRO/3 research dirs).
//
// General projects are created with no deliverables; the creator can add
// kind='CUSTOM' rows from the UI. ACL is enforced in the Edge Function (RLS
// stays open in Phase 1).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type CreateBody = {
  project_type?: "research" | "general";
  theme?: string;
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
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = await authenticate(req);
  if (!auth) return errorResponse("not authenticated", 401);

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid json", 400);
  }

  const projectType: "research" | "general" =
    body.project_type === "general" ? "general" : "research";
  const theme = String(body.theme ?? "").trim();
  if (!theme) return errorResponse("theme required", 400);
  if (projectType === "research" && !auth.can_create_research_project) {
    return errorResponse("not permitted to create research projects", 403);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "management" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: nextId, error: idErr } = await supabase.rpc("next_project_id");
  if (idErr || !nextId) {
    console.error("next_project_id failed:", idErr);
    return errorResponse("could not allocate project id", 500);
  }
  const projectId = String(nextId);

  const dayZero = body.day_zero ?? new Date().toISOString().slice(0, 10);
  const visibility =
    body.visibility === "restricted" ? "restricted" :
    projectType === "general" ? "restricted" : "org";

  const { error: projErr } = await supabase.from("projects").insert({
    id: projectId,
    theme,
    description: body.description ?? null,
    project_type: projectType,
    visibility,
    status: "active",
    day_zero: dayZero,
    team_id: body.team_id ?? null,
    given_by: auth.sub,
  });
  if (projErr) {
    console.error("project insert failed:", projErr);
    return errorResponse(projErr.message, 500);
  }

  if (projectType === "research") {
    try {
      await spawnResearchPipeline(supabase, {
        projectId,
        dayZero,
        teamId: body.team_id ?? null,
        mdCount: clamp(body.md_count ?? 1, 1, 2),
        erCount: clamp(body.er_count ?? 1, 1, 2),
        erdVdIds: body.erd_vd_ids ?? [],
        irdVdIds: body.ird_vd_ids ?? [],
        mrdVdIds: body.mrd_vd_ids ?? [],
      });
    } catch (e) {
      console.error("pipeline spawn failed:", e);
      // Roll back the project insert -- we don't want a research project
      // sitting around with no deliverables.
      await supabase.from("projects").delete().eq("id", projectId);
      return errorResponse("pipeline spawn failed: " + (e as Error).message, 500);
    }
  }

  // ACL grants (Google-Sheets style). The creator is implicit owner.
  if (Array.isArray(body.access) && body.access.length > 0) {
    const rows = body.access
      .filter((a) => a.user_id && a.user_id !== auth.sub)
      .map((a) => ({
        project_id: projectId,
        user_id: a.user_id,
        permission: a.permission ?? "viewer",
        granted_by: auth.sub,
      }));
    if (rows.length > 0) {
      await supabase.from("project_access").insert(rows);
    }
  }

  await supabase.from("activity_log").insert({
    project_id: projectId,
    actor_user_id: auth.sub,
    event_type: "create_project",
    payload: { theme, project_type: projectType, visibility },
  });

  return jsonResponse({ id: projectId, project_type: projectType });
});

async function spawnResearchPipeline(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    dayZero: string;
    teamId: string | null;
    mdCount: number;
    erCount: number;
    erdVdIds: string[];
    irdVdIds: string[];
    mrdVdIds: string[];
  },
) {
  const { projectId, dayZero, teamId, mdCount, erCount, erdVdIds, irdVdIds, mrdVdIds } = args;
  const addDays = (n: number) => {
    const d = new Date(dayZero + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // Pull team members grouped by division so we can bind owners.
  const team: Record<"ERD" | "MRD" | "IRD", string[]> = { ERD: [], MRD: [], IRD: [] };
  if (teamId) {
    const { data: tm } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId);
    const userIds = (tm ?? []).map((r: { user_id: string }) => r.user_id);
    if (userIds.length > 0) {
      const { data: us } = await supabase
        .from("users_lite")
        .select("id, division")
        .in("id", userIds);
      for (const u of us ?? []) {
        if (u.division === "ERD" || u.division === "MRD" || u.division === "IRD") {
          team[u.division as "ERD" | "MRD" | "IRD"].push(u.id);
        }
      }
    }
  }

  // Build deliverable rows.
  const rows: Array<{
    project_id: string; kind: string; sequence_no: number;
    title: string; division: string; due_date: string;
  }> = [];

  // Default offsets — first-cycle pipeline (May 14 → Jun 17 mapping):
  //   IM D5, MD D15, IO D20, ER D25, LinkedIn+Website D27, IG D34.
  rows.push({
    project_id: projectId, kind: "IM", sequence_no: 1,
    title: "Investment Memo", division: "CROSS", due_date: addDays(5),
  });
  for (let i = 1; i <= mdCount; i++) {
    rows.push({
      project_id: projectId, kind: "MD", sequence_no: i,
      title: mdCount > 1 ? `Market Dive ${i}` : "Market Dive",
      division: "MRD", due_date: addDays(15),
    });
  }
  rows.push({
    project_id: projectId, kind: "IO", sequence_no: 1,
    title: "Industry Outlook", division: "IRD", due_date: addDays(20),
  });
  for (let i = 1; i <= erCount; i++) {
    rows.push({
      project_id: projectId, kind: "ER", sequence_no: i,
      title: erCount > 1 ? `Equity Research ${i}` : "Equity Research",
      division: "ERD", due_date: addDays(25),
    });
  }
  rows.push({
    project_id: projectId, kind: "PUB_LINKEDIN", sequence_no: 1,
    title: "LinkedIn Publication", division: "MND", due_date: addDays(27),
  });
  rows.push({
    project_id: projectId, kind: "PUB_WEBSITE", sequence_no: 1,
    title: "Website Publication", division: "MND", due_date: addDays(27),
  });
  rows.push({
    project_id: projectId, kind: "PUB_IG", sequence_no: 1,
    title: "Instagram Publication", division: "MND", due_date: addDays(34),
  });

  const { data: inserted, error: insErr } = await supabase
    .from("deliverables")
    .insert(rows)
    .select("id, kind, sequence_no");
  if (insErr) throw new Error("deliverable insert failed: " + insErr.message);

  const findDlv = (kind: string, seq: number) =>
    (inserted ?? []).find(
      (d: { kind: string; sequence_no: number }) => d.kind === kind && d.sequence_no === seq,
    );

  const ownerRows: Array<{ deliverable_id: string; user_id: string; is_lead: boolean }> = [];
  const pushOwners = (kind: string, seq: number, userIds: string[], lead = false) => {
    const dlv = findDlv(kind, seq);
    if (!dlv) return;
    for (const uid of userIds) {
      if (uid) ownerRows.push({ deliverable_id: dlv.id, user_id: uid, is_lead: lead });
    }
  };

  // IM is co-owned by all six team analysts.
  pushOwners("IM", 1, [...team.ERD, ...team.MRD, ...team.IRD]);
  // MD owners: one MRD analyst each (or fall back to both).
  for (let i = 1; i <= mdCount; i++) {
    const owner = team.MRD[Math.min(i - 1, team.MRD.length - 1)];
    pushOwners("MD", i, owner ? [owner] : team.MRD, true);
  }
  pushOwners("IO", 1, team.IRD);
  for (let i = 1; i <= erCount; i++) {
    const owner = team.ERD[Math.min(i - 1, team.ERD.length - 1)];
    pushOwners("ER", i, owner ? [owner] : team.ERD, true);
  }
  // Publication owners stay unassigned -- Farhan picks at D15+.

  if (ownerRows.length > 0) {
    const { error: ownErr } = await supabase.from("deliverable_owners").insert(ownerRows);
    if (ownErr) throw new Error("owner insert failed: " + ownErr.message);
  }

  // Approver matrix.
  const { data: heads } = await supabase
    .from("users_lite")
    .select("id, title")
    .in("title", [
      "Chief Executive Officer",
      "Chief Research Officer",
      "Equity Research Director",
      "Market Research Director",
      "Industry Research Director",
      "Marketing & Design Director",
    ]);
  const byTitle = (t: string): string | undefined =>
    (heads ?? []).find((h: { title: string; id: string }) => h.title === t)?.id;

  const ceo = byTitle("Chief Executive Officer");
  const cro = byTitle("Chief Research Officer");
  const erdDir = byTitle("Equity Research Director");
  const mrdDir = byTitle("Market Research Director");
  const irdDir = byTitle("Industry Research Director");
  const mndDir = byTitle("Marketing & Design Director");

  const approverRows: Array<{ project_id: string; division: string; user_id: string }> = [];
  const addApprover = (division: string, uid: string | undefined) => {
    if (uid) approverRows.push({ project_id: projectId, division, user_id: uid });
  };

  addApprover("ERD", erdDir);
  for (const vd of erdVdIds) addApprover("ERD", vd);
  addApprover("MRD", mrdDir);
  for (const vd of mrdVdIds) addApprover("MRD", vd);
  addApprover("IRD", irdDir);
  for (const vd of irdVdIds) addApprover("IRD", vd);
  addApprover("MND", mndDir);

  // Investment Memo: CEO + CRO + 3 research directors (no CIO).
  for (const uid of [ceo, cro, erdDir, mrdDir, irdDir]) addApprover("IM", uid);

  const seen = new Set<string>();
  const deduped = approverRows.filter((r) => {
    const key = `${r.project_id}|${r.division}|${r.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length > 0) {
    const { error: apErr } = await supabase.from("project_approvers").insert(deduped);
    if (apErr) throw new Error("approver insert failed: " + apErr.message);
  }
}

function clamp(n: unknown, min: number, max: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.round(x)));
}
