import { useCallback, useEffect, useState } from "react";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type {
  DeliverableOwner, DeliverableStatusView, Project, Team,
} from "../lib/types";
import type { FilterState, UserLite } from "../lib/kpi";
import { applyFilter } from "../lib/kpi";
import { cls, daysBetween, fmtDate, KIND_LABELS, today } from "../lib/util";
import { FilterRibbon } from "./FilterRibbon";

interface FleetTabProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  teams: Team[];
  analysts: UserLite[];
  onOpenProject: (id: string, theme: string) => void;
}

export function FleetTab({ filter, setFilter, teams, analysts, onOpenProject }: FleetTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableStatusView[]>([]);
  const [owners, setOwners] = useState<DeliverableOwner[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useRealtimeRefresh(refresh);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = getClient();
        const [pRes, dRes, oRes] = await Promise.all([
          sb.from("projects").select("*").eq("status", "active").order("day_zero"),
          sb.from("v_deliverable_status").select("*"),
          sb.from("deliverable_owners").select("*"),
        ]);
        if (!alive) return;
        if (pRes.error) throw pRes.error;
        setProjects((pRes.data ?? []) as Project[]);
        setDeliverables((dRes.data ?? []) as DeliverableStatusView[]);
        setOwners((oRes.data ?? []) as DeliverableOwner[]);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [tick]);

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

          return (
            <div
              key={p.id}
              className={cls("fleet-row", !dlvIds.size || dlvIds.has(projDlvs[0]?.id) ? "" : "fleet-dim")}
              onClick={() => onOpenProject(p.id, p.theme)}
            >
              <div className="fleet-meta">
                <div className="fleet-pid">{p.id}</div>
                <div className="fleet-theme">{p.theme}</div>
                <div className="fleet-team mono">
                  D{daysBetween(p.day_zero, today())} / 18 · started {fmtDate(p.day_zero)}
                </div>
              </div>
              <div className="fleet-track">
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
          );
        })}
      </div>
    </div>
  );
}
