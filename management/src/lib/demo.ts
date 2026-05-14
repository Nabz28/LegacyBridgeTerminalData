// Demo mode in-memory store. Activated by appending `?demo=1` to the URL
// (or setting localStorage `lbc.mgmt.demo=1`). Bypasses all network calls and
// drives the UI from a hand-seeded snapshot of 3 active projects across the
// 3 teams, with deliverables in a deliberate spread of states so every UI
// branch (on-track / risk / overdue / blocked / approved / published) shows.

import type {
  ActivityLogRow, Comment, Deliverable, DeliverableHealth,
  DeliverableOwner, DeliverableStatusView, Project, ProjectApprover,
  ProjectEvent, ProjectEventAttendee, ProjectMember, Team, User,
} from "./types";

const DEMO_FLAG = "lbc.mgmt.demo";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("demo=1")) {
    try { localStorage.setItem(DEMO_FLAG, "1"); } catch { /* ignore */ }
    return true;
  }
  if (window.location.search.includes("demo=0")) {
    try { localStorage.removeItem(DEMO_FLAG); } catch { /* ignore */ }
    return false;
  }
  try { return localStorage.getItem(DEMO_FLAG) === "1"; } catch { return false; }
}

export interface ProjectAccessRow {
  project_id: string;
  user_id: string;
  permission: "viewer" | "commenter" | "editor" | "owner";
  granted_by: string | null;
  granted_at: string;
}

export interface DemoStore {
  users: User[];
  teams: Team[];
  team_members: Array<{ team_id: string; user_id: string }>;
  projects: Project[];
  deliverables: Deliverable[];
  deliverable_owners: DeliverableOwner[];
  comments: Comment[];
  activity_log: ActivityLogRow[];
  project_approvers: ProjectApprover[];
  project_access: ProjectAccessRow[];
  project_members: ProjectMember[];
  project_events: ProjectEvent[];
  project_event_attendees: ProjectEventAttendee[];
  current_user_id: string;
  next_project_seq: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function todayIso(): string { return new Date().toISOString().slice(0, 10); }
function shiftDay(baseIso: string, offsetDays: number): string {
  const d = new Date(baseIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function isoTime(baseIso: string, hoursOffset = 0): string {
  return new Date(new Date(baseIso + "T00:00:00Z").getTime() + hoursOffset * 3600 * 1000).toISOString();
}

export function computeHealth(d: Deliverable): DeliverableHealth {
  if (d.state === "approved" || d.state === "published") {
    if (!d.approved_at) return "on_time";
    return d.approved_at.slice(0, 10) <= d.due_date ? "on_time" : "late";
  }
  if (d.blocked) return "blocked";
  const today = todayIso();
  if (d.due_date < today) return "overdue";
  const diff = (new Date(d.due_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / DAY_MS;
  if (diff <= 2) return "risk";
  return "on_track";
}

export function deliverableView(d: Deliverable, projects: Project[]): DeliverableStatusView {
  const p = projects.find((p) => p.id === d.project_id);
  return {
    ...d,
    theme: p?.theme ?? "",
    day_zero: p?.day_zero ?? d.due_date,
    team_id: p?.team_id ?? null,
    health: computeHealth(d),
  };
}

// ─── Seed (mirrors 0006 user roster + 3 active projects across teams) ─

const T = todayIso();

const u = (i: number, username: string, full_name: string, role: User["role"],
           division: User["division"], title: string | null, canCreate: boolean): User => ({
  id: `u-${username}`,
  username,
  full_name,
  role,
  division,
  title,
  can_create_research_project: canCreate,
  active: true,
  created_at: shiftDay(T, -60),
  last_login_at: shiftDay(T, -i),
});

const SEED_USERS: User[] = [
  // C-suite
  u(0, "nabil",      "Nabil Sachio Refat",     "management", "Exec", "Chief Executive Officer",     true),
  u(0, "khalif",     "M. Khalif P. Karnova",   "management", "Exec", "Chief Research Officer",      true),
  u(1, "rattana",    "Rattana A. Chaniago",    "management", "Exec", "Chief Financial Officer",     true),
  u(1, "charlie",    "Charlie Verchius",       "management", "Exec", "Chief Investment Officer",    true),
  u(2, "rizky",      "M. Rizky Narindra",      "management", "Exec", "Chief Technological Officer", true),
  u(2, "kayla",      "Kayla Kwok",             "management", "Exec", "Chief Strategy Officer",      true),
  // Advisors
  u(3, "stefano",    "Stefano Ryan Oliver Yap","advisor",    "Advisor", "Research Advisor",         false),
  u(3, "fakih",      "Fakih Habib Dzulfikar",  "advisor",    "Advisor", "Investment Advisor",       false),
  // Research dirs/VDs
  u(0, "satya",      "Satya Damba Pramudita",  "management", "ERD", "Equity Research Director",     true),
  u(1, "dzaki",      "Ahmad Dzaki Sofyan",     "management", "ERD", "ERD Vice Director 1",          true),
  u(2, "marselinus", "A. Marselinus S.D.",     "management", "ERD", "ERD Vice Director 2",          true),
  u(0, "amadeus",    "Amadeus B.H. Sianturi",  "management", "MRD", "Market Research Director",     true),
  u(1, "deo",        "Deo",                    "management", "MRD", "MRD Vice Director",            true),
  u(0, "aqila",      "Aqila Muhammad Taqy",    "management", "IRD", "Industry Research Director",   true),
  u(1, "bintang",    "Bintang Bintara",        "management", "IRD", "IRD Vice Director",            true),
  // AMD
  u(2, "aurafa",     "M. Aurafa Muhidin",      "management", "AMD", "AMD Vice Director",            true),
  u(3, "jonathan",   "Jonathan",               "analyst",    "AMD", "AMD Analyst",                  true),
  u(3, "farren",     "Farren",                 "analyst",    "AMD", "AMD Analyst",                  true),
  u(3, "rafif",      "Rafif",                  "analyst",    "AMD", "AMD Analyst",                  true),
  // SPD
  u(4, "grace",      "Grace",                  "management", "SPD", "Strategy & Performance",       true),
  u(4, "faiq",       "Faiq",                   "management", "SPD", "Strategy & Performance",       true),
  u(4, "nadine",     "Nadine",                 "management", "SPD", "Strategy & Performance",       true),
  // M&D
  u(2, "farhan",     "Farhan Yudha Satria",    "management", "MND", "Marketing & Design Director",  true),
  u(5, "dharma",     "Dharma",                 "analyst",    "MND", "M&D Analyst",                  false),
  u(5, "tristan",    "Tristan",                "analyst",    "MND", "M&D Analyst",                  false),
  u(5, "fayyaz",     "Fayyaz",                 "analyst",    "MND", "M&D Analyst",                  false),
  // Research analysts
  u(0, "bulan",      "Bulan",   "analyst", "ERD", "ERD Analyst", false),
  u(1, "james",      "James",   "analyst", "ERD", "ERD Analyst", false),
  u(0, "fauzan",     "Fauzan",  "analyst", "ERD", "ERD Analyst", false),
  u(1, "sheila",     "Sheila",  "analyst", "ERD", "ERD Analyst", false),
  u(0, "tio",        "Tio",     "analyst", "ERD", "ERD Analyst", false),
  u(1, "phillip",    "Phillip", "analyst", "ERD", "ERD Analyst", false),
  u(0, "resti",      "Resti",   "analyst", "MRD", "MRD Analyst", false),
  u(1, "aldrian",    "Aldrian", "analyst", "MRD", "MRD Analyst", false),
  u(1, "samuel",     "Samuel",  "analyst", "MRD", "MRD Analyst", false),
  u(0, "sella",      "Sella",   "analyst", "MRD", "MRD Analyst", false),
  u(1, "ghani",      "Ghani",   "analyst", "MRD", "MRD Analyst", false),
  u(0, "bhadra",     "Bhadra",  "analyst", "MRD", "MRD Analyst", false),
  u(0, "tiangga",    "Tiangga", "analyst", "IRD", "IRD Analyst", false),
  u(0, "gede",       "Gede",    "analyst", "IRD", "IRD Analyst", false),
  u(1, "azka",       "Azka",    "analyst", "IRD", "IRD Analyst", false),
  u(1, "jevan",      "Jevan",   "analyst", "IRD", "IRD Analyst", false),
  u(0, "rifqi",      "Rifqi",   "analyst", "IRD", "IRD Analyst", false),
  u(1, "kenneth",    "Kenneth", "analyst", "IRD", "IRD Analyst", false),
  // Admin
  u(0, "aldee",      "Aldee (System Admin)",   "admin",      "Exec", "System Administrator",        true),
];

const SEED_TEAMS: Team[] = [
  { id: "t-1", slug: "team-1", name: "Team 1", description: "Current Project 1 crew", archived: false, created_by: null, created_at: shiftDay(T, -30) },
  { id: "t-2", slug: "team-2", name: "Team 2", description: "Current Project 2 crew", archived: false, created_by: null, created_at: shiftDay(T, -30) },
  { id: "t-3", slug: "team-3", name: "Team 3", description: "Current Project 3 crew", archived: false, created_by: null, created_at: shiftDay(T, -30) },
];

const ROSTER: Record<string, string[]> = {
  "t-1": ["fauzan", "tio", "resti", "bhadra", "gede", "tiangga"],
  "t-2": ["phillip", "sheila", "samuel", "sella", "rifqi", "jevan"],
  "t-3": ["bulan", "james", "aldrian", "ghani", "kenneth", "azka"],
};

const SEED_TEAM_MEMBERS = Object.entries(ROSTER).flatMap(([team_id, usernames]) =>
  usernames.map((un) => ({ team_id, user_id: `u-${un}` })),
);

// ─── Three active projects across the three teams ─────────────────────

interface ProjectSpec {
  id: string;
  theme: string;
  description: string;
  day_zero: string;
  team_id: string;
  given_by: string;
  md_count: number;
  er_count: number;
}

// First-cycle projects: all start on the same D0 (today = May 14 in 2026).
// Demo shifts day_zero to show different progress stages; production seed
// (migration 0012) uses today's date for all three uniformly.
const PROJ_SPECS: ProjectSpec[] = [
  {
    id: "PROJ-2026-001",
    theme: "Gold ASEAN",
    description: "Thesis on regional gold demand + Indonesia mining majors.",
    day_zero: shiftDay(T, -7),
    team_id: "t-1",
    given_by: "u-charlie",
    md_count: 1, er_count: 1,
  },
  {
    id: "PROJ-2026-002",
    theme: "Indonesia Telco",
    description: "Telco sector deep-dive post-merger landscape.",
    day_zero: shiftDay(T, -17),
    team_id: "t-2",
    given_by: "u-nabil",
    md_count: 2, er_count: 2,
  },
  {
    id: "PROJ-2026-003",
    theme: "Renewable Energy",
    description: "ASEAN renewables — solar, geothermal, EV adjacencies.",
    day_zero: shiftDay(T, -24),
    team_id: "t-3",
    given_by: "u-charlie",
    md_count: 1, er_count: 2,
  },
];

interface DlvSpec {
  kind: Deliverable["kind"];
  seq: number;
  division: Deliverable["division"];
  due_offset: number;
  state: Deliverable["state"];
  approved_offset?: number; // days from day_zero when approved
  revision_count?: number;
  blocked?: boolean;
  blocker_note?: string;
  file_name?: string;
}

// First-cycle timeline: D0 May 14 → IM D5 → MD D15 → IO D20 → ER D25
// → finalization D26-27 → LinkedIn + Website D27 → IG D34 (1 week post-publish).
const PIPELINE_FOR = (mdCount: number, erCount: number): DlvSpec[] => {
  const rows: DlvSpec[] = [
    { kind: "IM", seq: 1, division: "CROSS", due_offset: 5,  state: "approved", approved_offset: 5 },
  ];
  for (let i = 1; i <= mdCount; i++)
    rows.push({ kind: "MD", seq: i, division: "MRD", due_offset: 15, state: "in_progress" });
  rows.push({ kind: "IO", seq: 1, division: "IRD", due_offset: 20, state: "not_started" });
  for (let i = 1; i <= erCount; i++)
    rows.push({ kind: "ER", seq: i, division: "ERD", due_offset: 25, state: "not_started" });
  rows.push({ kind: "PUB_LINKEDIN", seq: 1, division: "MND", due_offset: 27, state: "not_started" });
  rows.push({ kind: "PUB_WEBSITE",  seq: 1, division: "MND", due_offset: 27, state: "not_started" });
  rows.push({ kind: "PUB_IG",       seq: 1, division: "MND", due_offset: 34, state: "not_started" });
  return rows;
};

// Hand-tune state spread per project for the new D5/D15/D20/D25/D27/D34 cycle.
const PROJ_DLV_OVERRIDES: Record<string, (specs: DlvSpec[]) => DlvSpec[]> = {
  "PROJ-2026-001": (specs) => specs, // D7 of cycle: IM approved, rest early
  "PROJ-2026-002": (specs) => specs.map((s) => {
    // D17 of cycle: IM done D5, MDs done by D15, IO submitted, ER underway
    if (s.kind === "MD" && s.seq === 1) return { ...s, state: "approved", approved_offset: 15, revision_count: 1 };
    if (s.kind === "MD" && s.seq === 2) return { ...s, state: "approved", approved_offset: 15 };
    if (s.kind === "IO") return { ...s, state: "submitted" };
    if (s.kind === "ER" && s.seq === 1) return {
      ...s, state: "in_progress", blocked: true,
      blocker_note: "Waiting on IO approval before finalizing valuation.",
    };
    if (s.kind === "ER" && s.seq === 2) return { ...s, state: "in_progress" };
    return s;
  }),
  "PROJ-2026-003": (specs) => specs.map((s) => {
    // D24 of cycle: most outputs done, finalization underway
    if (s.kind === "MD") return { ...s, state: "approved", approved_offset: 16, revision_count: 0 }; // 1 day late
    if (s.kind === "IO") return { ...s, state: "approved", approved_offset: 20, revision_count: 2 };
    if (s.kind === "ER" && s.seq === 1) return { ...s, state: "submitted" };
    if (s.kind === "ER" && s.seq === 2) return { ...s, state: "approved", approved_offset: 24, file_name: "renewables_eq.pdf" };
    return s;
  }),
};

function buildDeliverables(): { deliverables: Deliverable[]; owners: DeliverableOwner[]; approvers: ProjectApprover[]; comments: Comment[]; activity: ActivityLogRow[] } {
  const deliverables: Deliverable[] = [];
  const owners: DeliverableOwner[] = [];
  const approvers: ProjectApprover[] = [];
  const comments: Comment[] = [];
  const activity: ActivityLogRow[] = [];

  for (const proj of PROJ_SPECS) {
    let specs = PIPELINE_FOR(proj.md_count, proj.er_count);
    const override = PROJ_DLV_OVERRIDES[proj.id];
    if (override) specs = override(specs);

    const teamUsernames = ROSTER[proj.team_id];
    const erdMembers = teamUsernames.filter((un) => ["fauzan","tio","phillip","sheila","bulan","james"].includes(un));
    const mrdMembers = teamUsernames.filter((un) => ["resti","bhadra","samuel","sella","aldrian","ghani"].includes(un));
    const irdMembers = teamUsernames.filter((un) => ["gede","tiangga","rifqi","jevan","kenneth","azka"].includes(un));

    for (const s of specs) {
      const id = `d-${proj.id.slice(-3)}-${s.kind.toLowerCase()}-${s.seq}`;
      const due_date = shiftDay(proj.day_zero, s.due_offset);
      const approved_at = s.approved_offset !== undefined ? isoTime(shiftDay(proj.day_zero, s.approved_offset), 11) : null;
      const submitted_at = s.state === "submitted" || approved_at ? isoTime(shiftDay(proj.day_zero, s.due_offset - 1), 16) : null;

      deliverables.push({
        id, project_id: proj.id, kind: s.kind, sequence_no: s.seq,
        title: s.kind === "IM" ? "Investment Memo"
              : s.kind === "MD" ? (proj.md_count > 1 ? `Market Dive ${s.seq}` : "Market Dive")
              : s.kind === "IO" ? "Industry Outlook"
              : s.kind === "ER" ? (proj.er_count > 1 ? `Equity Research ${s.seq}` : "Equity Research")
              : s.kind === "PUB_LINKEDIN" ? "LinkedIn Publication"
              : s.kind === "PUB_IG" ? "Instagram Publication"
              : "Website Publication",
        division: s.division,
        responsible_divisions: s.kind === "IM"
          ? ["ERD", "MRD", "IRD"]
          : [s.division],
        due_date, state: s.state,
        file_url: null,
        storage_path: s.file_name ? `${proj.id}/${id}/${s.file_name}` : null,
        file_name: s.file_name ?? null,
        revision_count: s.revision_count ?? 0,
        blocked: s.blocked ?? false,
        blocker_note: s.blocker_note ?? null,
        blocked_by_deliverable_id: null,
        submitted_at,
        approved_at,
        approved_by: approved_at && s.kind === "IM" ? "u-nabil"
                   : approved_at && s.kind === "MD" ? "u-amadeus"
                   : approved_at && s.kind === "IO" ? "u-aqila"
                   : approved_at && s.kind === "ER" ? "u-satya"
                   : approved_at && s.kind.startsWith("PUB_") ? "u-farhan"
                   : null,
        published_at: null,
        created_at: isoTime(proj.day_zero),
        updated_at: approved_at ?? submitted_at ?? isoTime(proj.day_zero, 2),
      });

      // Owners
      if (s.kind === "IM") {
        for (const un of teamUsernames) owners.push({ deliverable_id: id, user_id: `u-${un}`, is_lead: false });
      } else if (s.kind === "MD") {
        const owner = mrdMembers[Math.min(s.seq - 1, mrdMembers.length - 1)];
        if (owner) owners.push({ deliverable_id: id, user_id: `u-${owner}`, is_lead: true });
      } else if (s.kind === "IO") {
        for (const un of irdMembers) owners.push({ deliverable_id: id, user_id: `u-${un}`, is_lead: false });
      } else if (s.kind === "ER") {
        const owner = erdMembers[Math.min(s.seq - 1, erdMembers.length - 1)];
        if (owner) owners.push({ deliverable_id: id, user_id: `u-${owner}`, is_lead: true });
      }
      // PUB_* owners left blank — Farhan staffs at D15+

      // Sample comments
      if (s.state === "submitted") {
        comments.push({
          id: `c-${id}-sub`, deliverable_id: id, author_user_id: owners.find(o=>o.deliverable_id===id)?.user_id ?? "u-aldee",
          kind: "submission", body: "Submitted for review. Please look at the bear-case section first.",
          created_at: submitted_at ?? isoTime(T),
        });
      }
      if ((s.revision_count ?? 0) > 0 && approved_at) {
        for (let r = 1; r <= (s.revision_count ?? 0); r++) {
          comments.push({
            id: `c-${id}-rev-${r}`, deliverable_id: id, author_user_id: "u-charlie",
            kind: "revision_request",
            body: r === 1 ? "Need to tighten the macro framing. Rework intro." : "Add comparison vs 2023 cycle.",
            created_at: isoTime(shiftDay(proj.day_zero, s.due_offset - 1), 9 + r),
          });
        }
      }
      if (s.blocked && s.blocker_note) {
        comments.push({
          id: `c-${id}-block`, deliverable_id: id, author_user_id: owners.find(o=>o.deliverable_id===id)?.user_id ?? "u-aldee",
          kind: "blocker", body: s.blocker_note,
          created_at: isoTime(shiftDay(T, -1), 14),
        });
      }
      if (approved_at) {
        comments.push({
          id: `c-${id}-app`, deliverable_id: id, author_user_id: "u-charlie",
          kind: "approval", body: "Approved.",
          created_at: approved_at,
        });
      }

      // Activity log entries
      activity.push({
        id: `a-${id}-create`, project_id: proj.id, deliverable_id: id, actor_user_id: proj.given_by,
        event_type: "create_project", payload: null, created_at: isoTime(proj.day_zero),
      });
      if (approved_at) {
        activity.push({
          id: `a-${id}-approve`, project_id: proj.id, deliverable_id: id, actor_user_id: "u-charlie",
          event_type: "approve", payload: null, created_at: approved_at,
        });
      }
    }

    // Approver matrix (auto-spawn would have set these)
    approvers.push({ project_id: proj.id, division: "ERD", user_id: "u-satya" });
    approvers.push({ project_id: proj.id, division: "MRD", user_id: "u-amadeus" });
    approvers.push({ project_id: proj.id, division: "IRD", user_id: "u-aqila" });
    approvers.push({ project_id: proj.id, division: "MND", user_id: "u-farhan" });
    for (const uid of ["u-nabil", "u-khalif", "u-satya", "u-amadeus", "u-aqila"]) {
      approvers.push({ project_id: proj.id, division: "IM", user_id: uid });
    }
    if (proj.team_id === "t-2") approvers.push({ project_id: proj.id, division: "ERD", user_id: "u-marselinus" });
    if (proj.team_id === "t-3") {
      approvers.push({ project_id: proj.id, division: "ERD", user_id: "u-dzaki" });
      approvers.push({ project_id: proj.id, division: "IRD", user_id: "u-bintang" });
    }
    // MRD VD Deo approves MRD outputs on every active project.
    approvers.push({ project_id: proj.id, division: "MRD", user_id: "u-deo" });
  }

  return { deliverables, owners, approvers, comments, activity };
}

function buildInitialStore(): DemoStore {
  const { deliverables, owners, approvers, comments, activity } = buildDeliverables();
  const projects: Project[] = PROJ_SPECS.map((s) => ({
    id: s.id, theme: s.theme, description: s.description,
    project_type: "research", visibility: "org", status: "active",
    day_zero: s.day_zero, team_id: s.team_id, given_by: s.given_by,
    given_at: isoTime(s.day_zero),
    completed_at: null,
    created_at: isoTime(s.day_zero),
  }));

  // Backfill project_members from team rosters (matches the SQL migration's
  // INSERT...SELECT). Default permission = t1. Demote one analyst to t2 on
  // PROJ-002 so the UI shows a mix.
  const members: ProjectMember[] = PROJ_SPECS.flatMap((s) => {
    const usernames = ROSTER[s.team_id] ?? [];
    return usernames.map((un) => ({
      project_id: s.id,
      user_id: `u-${un}`,
      permission: (s.id === "PROJ-2026-002" && un === "phillip" ? "t2" : "t1") as "t1" | "t2",
      added_by: s.given_by,
      added_at: isoTime(s.day_zero),
    }));
  });

  // SPD assignments: Faiq -> P1, Grace -> P2, Nadine -> P3. SPD = management
  // authority, so they get t2 (full project edit) by default.
  const SPD_BY_PROJECT: Record<string, string> = {
    "PROJ-2026-001": "faiq",
    "PROJ-2026-002": "grace",
    "PROJ-2026-003": "nadine",
  };
  for (const [pid, un] of Object.entries(SPD_BY_PROJECT)) {
    const proj = PROJ_SPECS.find((s) => s.id === pid);
    if (!proj) continue;
    members.push({
      project_id: pid,
      user_id: `u-${un}`,
      permission: "t2",
      added_by: proj.given_by,
      added_at: isoTime(proj.day_zero),
    });
  }

  // A few sample events per project so the calendar pane shows variety.
  const events: ProjectEvent[] = [];
  const attendees: ProjectEventAttendee[] = [];
  for (const s of PROJ_SPECS) {
    const ev = (offset: number, hour: number, title: string, kind: ProjectEvent["kind"],
                link: string | null, desc: string | null, who: string[]): void => {
      const id = `e-${s.id.slice(-3)}-${events.length + 1}`;
      events.push({
        id, project_id: s.id, title,
        start_at: isoTime(shiftDay(s.day_zero, offset), hour),
        end_at: isoTime(shiftDay(s.day_zero, offset), hour + 1),
        kind, location_or_link: link, description: desc,
        created_by: s.given_by, created_at: isoTime(s.day_zero, 2),
        updated_at: isoTime(s.day_zero, 2),
      });
      for (const un of who) attendees.push({ event_id: id, user_id: `u-${un}` });
    };
    const team = ROSTER[s.team_id] ?? [];
    ev(0, 10, "Kickoff with CIO", "meeting", "https://zoom.us/j/123-kickoff",
       "Charlie sets thesis direction. Team Q&A.", [...team, "charlie"]);
    ev(2, 14, "Macro framing alignment", "meeting", "https://zoom.us/j/456-macro",
       "MRD presents macro view, ERD + IRD align.", team);
    ev(7, 11, "Mid-cycle review", "milestone", null,
       "Quick checkpoint before MD lock.", [...team, s.given_by.replace(/^u-/, "")]);
  }

  return {
    users: SEED_USERS,
    teams: SEED_TEAMS,
    team_members: SEED_TEAM_MEMBERS,
    projects,
    deliverables,
    deliverable_owners: owners,
    comments,
    activity_log: activity,
    project_approvers: approvers,
    project_access: [],
    project_members: members,
    project_events: events,
    project_event_attendees: attendees,
    current_user_id: "u-aldee",
    next_project_seq: 4,
  };
}

// ─── Pub/sub store ─────────────────────────────────────────────────────

let _store: DemoStore = buildInitialStore();
const listeners = new Set<() => void>();

export function getStore(): DemoStore { return _store; }

export function dispatch(updater: (s: DemoStore) => DemoStore): void {
  _store = updater(_store);
  for (const l of listeners) l();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setCurrentUser(userId: string): void {
  dispatch((s) => ({ ...s, current_user_id: userId }));
}

export function nextProjectId(): string {
  const yr = new Date().getUTCFullYear();
  const next = _store.next_project_seq;
  dispatch((s) => ({ ...s, next_project_seq: s.next_project_seq + 1 }));
  return `PROJ-${yr}-${String(next).padStart(3, "0")}`;
}

export function newUuid(): string {
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function nowIso(): string { return new Date().toISOString(); }
