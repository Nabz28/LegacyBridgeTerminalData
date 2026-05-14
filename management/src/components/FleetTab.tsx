import { useCallback, useEffect, useMemo, useState } from "react";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type {
  DeliverableOwner, DeliverableStatusView, Project, ProjectMember, Team, User,
} from "../lib/types";
import type { FilterState, UserLite } from "../lib/kpi";
import { applyFilter } from "../lib/kpi";
import { cls, daysBetween, fmtDate, KIND_LABELS, today } from "../lib/util";
import { FilterRibbon } from "./FilterRibbon";
import { MembersModal } from "./MembersModal";

interface FleetTabProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  teams: Team[];
  // The Filter Ribbon's analyst-picker is intentionally analyst-only (it
  // wouldn't make sense to filter Fleet by a director's name).
  analysts: UserLite[];
  // Everyone active -- analysts, management (VDs/directors), advisors, admin.
  // Needed for the per-project members panel which renders all assigned
  // people regardless of role.
  allUsers: UserLite[];
  currentUser: User;
  onOpenProject: (id: string, theme: string) => void;
}

// Division -> display label. Keeps the same ordering everywhere.
const DIVISIONS: Array<{ key: string; label: string }> = [
  { key: "Exec",    label: "Exec" },
  { key: "ERD",     label: "ERD" },
  { key: "MRD",     label: "MRD" },
  { key: "IRD",     label: "IRD" },
  { key: "AMD",     label: "AMD" },
  { key: "SPD",     label: "SPD" },
  { key: "MND",     label: "M&D" },
  { key: "Quant",   label: "Quant" },
  { key: "Advisor", label: "Advisor" },
];

const ROLE_LABEL: Record<string, string> = {
  admin:      "Admin",
  management: "Management",
  analyst:    "Analyst",
  advisor:    "Advisor",
};

export function FleetTab({
  filter, setFilter, teams, analysts, allUsers, currentUser, onOpenProject,
}: FleetTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableStatusView[]>([]);
  const [owners, setOwners] = useState<DeliverableOwner[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [manageProject, setManageProject] = useState<Project | null>(null);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useRealtimeRefresh(refresh);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getClient();
        const [pRes, dRes, oRes, mRes] = await Promise.all([
          sb.from("projects").select("*").eq("status", "active").order("day_zero"),
          sb.from("v_deliverable_status").select("*"),
          sb.from("deliverable_owners").select("*"),
          sb.from("project_members").select("*"),
        ]);
        if (!alive) return;
        if (pRes.error) throw pRes.error;
        setProjects((pRes.data ?? []) as Project[]);
        setDeliverables((dRes.data ?? []) as DeliverableStatusView[]);
        setOwners((oRes.data ?? []) as DeliverableOwner[]);
        setMembers((mRes.data ?? []) as ProjectMember[]);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [tick]);

  const userById = useMemo(
    () => new Map(allUsers.map((u) => [u.id, u])),
    [allUsers],
  );

  if (!ready) return <div className="loading">Loading fleet…</div>;
  if (err) return <div className="error-banner">{err}</div>;

  const filteredDeliverables = applyFilter(deliverables, owners, projects, filter);
  const dlvIds = new Set(filteredDeliverables.map((d) => d.id));
  const projectsWithMatches = projects.filter(
    (p) => filteredDeliverables.some((d) => d.project_id === p.id),
  );

  const projectsToShow = filter.division || filter.team_id || filter.analyst_id
    ? projectsWithMatches
    : projects;

  const canManage = currentUser.role === "admin" || currentUser.role === "management";

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="agg-wrap">
      <div className="agg-header">
        <div>
          <div className="agg-title">Fleet</div>
          <div className="agg-sub">
            {projectsToShow.length} active project{projectsToShow.length === 1 ? "" : "s"} · {filteredDeliverables.length} deliverables in scope
          </div>
        </div>
      </div>

      <FilterRibbon filter={filter} setFilter={setFilter} teams={teams} analysts={analysts} />

      {projectsToShow.length === 0 && (
        <div className="empty-state">No active projects in scope.</div>
      )}

      <div className="fleet-list">
        {projectsToShow.map((p) => {
          const projDlvs = deliverables
            .filter((d) => d.project_id === p.id)
            .filter((d) => filter.division ? d.division === filter.division : true)
            .filter((d) => filter.analyst_id
              ? owners.some((o) => o.deliverable_id === d.id && o.user_id === filter.analyst_id)
              : true);

          const horizon = 22;
          const todayOffset = Math.max(0, Math.min(horizon, daysBetween(p.day_zero, today())));
          const isExpanded = expanded.has(p.id);

          // Members for THIS project, joined to user records, grouped by division.
          const projMembers = members
            .filter((m) => m.project_id === p.id)
            .map((m) => ({ m, u: userById.get(m.user_id) }))
            .filter((x): x is { m: ProjectMember; u: UserLite } => Boolean(x.u));

          const byDivision = new Map<string, typeof projMembers>();
          for (const row of projMembers) {
            const div = row.u.division ?? "—";
            if (!byDivision.has(div)) byDivision.set(div, []);
            byDivision.get(div)!.push(row);
          }
          // Stable ordering: known divisions in the canonical order, then any extras.
          const orderedDivs = [
            ...DIVISIONS.map((d) => d.key).filter((k) => byDivision.has(k)),
            ...Array.from(byDivision.keys()).filter((k) => !DIVISIONS.some((d) => d.key === k)),
          ];
          // Within a division, sort: management first (T2 above T1), then analysts.
          for (const div of orderedDivs) {
            byDivision.get(div)!.sort((a, b) => {
              const roleRank = (r?: string) => (r === "admin" ? 0 : r === "management" ? 1 : r === "analyst" ? 2 : 3);
              const ra = roleRank(a.u.role); const rb = roleRank(b.u.role);
              if (ra !== rb) return ra - rb;
              if (a.m.permission !== b.m.permission) return a.m.permission === "t2" ? -1 : 1;
              return a.u.full_name.localeCompare(b.u.full_name);
            });
          }

          return (
            <div key={p.id} className={cls(
              "fleet-row",
              !dlvIds.size || dlvIds.has(projDlvs[0]?.id) ? "" : "fleet-dim",
              isExpanded ? "fleet-row-expanded" : "",
            )}>
              <div className="fleet-row-main">
                <button
                  type="button"
                  className="fleet-caret"
                  onClick={() => toggleExpand(p.id)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  title={isExpanded ? "Hide members" : "Show members"}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
                <div
                  className="fleet-meta"
                  onClick={() => onOpenProject(p.id, p.theme)}
                  title="Open project"
                  style={{ cursor: "pointer" }}
                >
                  <div className="fleet-pid">{p.id}</div>
                  <div className="fleet-theme">{p.theme}</div>
                  <div className="fleet-team mono">
                    D{daysBetween(p.day_zero, today())} / 18 · started {fmtDate(p.day_zero)}
                    {" · "}{projMembers.length} member{projMembers.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div
                  className="fleet-track"
                  onClick={() => onOpenProject(p.id, p.theme)}
                  style={{ cursor: "pointer" }}
                >
                  {projDlvs.map((d) => {
                    const due = daysBetween(p.day_zero, d.due_date);
                    const pct = Math.max(0, Math.min(100, (due / horizon) * 100));
                    return (
                      <div
                        key={d.id}
                        className={cls("fleet-bar", d.blocked ? "blocked" : d.health)}
                        style={{ left: `${Math.max(0, pct - 4)}%`, width: "8%" }}
                        title={`${KIND_LABELS[d.kind]} · due ${fmtDate(d.due_date)} · ${d.blocked ? "blocked" : d.health}`}
                      >
                        <span className="fleet-bar-kind">{KIND_LABELS[d.kind]?.slice(0, 3)}</span>
                        <span className="fleet-bar-date">{fmtDate(d.due_date)}</span>
                      </div>
                    );
                  })}
                  <div
                    className="fleet-today"
                    style={{ left: `${(todayOffset / horizon) * 100}%` }}
                    title={`Today · D${todayOffset}`}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="fleet-members">
                  <div className="fleet-members-header">
                    <div className="fleet-members-title">
                      Members · {projMembers.length}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setManageProject(p)}
                      >
                        Manage members
                      </button>
                    )}
                  </div>

                  {projMembers.length === 0 ? (
                    <div className="dim" style={{ fontSize: 12, padding: "6px 0" }}>
                      No members assigned yet.
                      {canManage && " Click \"Manage members\" to assign people from any division."}
                    </div>
                  ) : (
                    <div className="fleet-members-grid">
                      {orderedDivs.map((div) => {
                        const divLabel = DIVISIONS.find((d) => d.key === div)?.label ?? div;
                        const rows = byDivision.get(div)!;
                        return (
                          <div key={div} className="fleet-division">
                            <div className="fleet-division-label">{divLabel}</div>
                            <div className="fleet-division-members">
                              {rows.map(({ m, u }) => (
                                <div key={m.user_id} className="fleet-member-chip" title={
                                  `${u.full_name} (${u.username})\n${u.title ?? ROLE_LABEL[u.role] ?? u.role}\nTier: ${m.permission.toUpperCase()}`
                                }>
                                  <span className={cls("tier", m.permission)}>{m.permission.toUpperCase()}</span>
                                  <span className="name">{u.full_name}</span>
                                  {u.role === "management" && (
                                    <span className="badge-mgmt" title="Management">★</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {manageProject && (
        <MembersModal
          project={manageProject}
          currentUser={currentUser}
          onClose={() => setManageProject(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
