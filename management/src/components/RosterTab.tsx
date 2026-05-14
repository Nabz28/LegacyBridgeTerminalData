import { useCallback, useEffect, useMemo, useState } from "react";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type {
  DeliverableOwner, DeliverableStatusView, Project, Team,
} from "../lib/types";
import type { FilterState, UserLite } from "../lib/kpi";
import {
  applyFilter, fmtPct, onTimeRate, rollup,
} from "../lib/kpi";
import { cls } from "../lib/util";
import { FilterRibbon } from "./FilterRibbon";

interface RosterTabProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  teams: Team[];
  analysts: UserLite[];
}

export function RosterTab({ filter, setFilter, teams, analysts }: RosterTabProps) {
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
          sb.from("projects").select("*"),
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

  const rows = useMemo(() => {
    const scoped = applyFilter(deliverables, owners, projects, filter);
    const dlvById = new Map(scoped.map((d) => [d.id, d]));
    const dlvsByOwner = new Map<string, DeliverableStatusView[]>();
    for (const o of owners) {
      const d = dlvById.get(o.deliverable_id);
      if (!d) continue;
      const list = dlvsByOwner.get(o.user_id) ?? [];
      list.push(d);
      dlvsByOwner.set(o.user_id, list);
    }

    const filtered = filter.division
      ? analysts.filter((a) => a.division === filter.division)
      : analysts;

    return filtered
      .map((a) => {
        const dlvs = dlvsByOwner.get(a.id) ?? [];
        const stats = rollup(dlvs);
        return { user: a, stats, rate: onTimeRate(stats) };
      })
      .sort((a, b) => {
        if (a.stats.overdue !== b.stats.overdue) return b.stats.overdue - a.stats.overdue;
        if (b.stats.in_flight !== a.stats.in_flight) return b.stats.in_flight - a.stats.in_flight;
        return a.user.full_name.localeCompare(b.user.full_name);
      });
  }, [analysts, deliverables, owners, projects, filter]);

  if (!ready) return <div className="loading">Loading roster…</div>;
  if (err) return <div className="error-banner">{err}</div>;

  return (
    <div className="agg-wrap">
      <div className="agg-header">
        <div>
          <div className="agg-title">Roster</div>
          <div className="agg-sub">{rows.length} analyst{rows.length === 1 ? "" : "s"} in scope</div>
        </div>
      </div>

      <FilterRibbon filter={filter} setFilter={setFilter} teams={teams} analysts={analysts} />

      <div className="roster-table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Analyst</th>
              <th>Division</th>
              <th className="num">Total</th>
              <th className="num">In flight</th>
              <th className="num">Overdue</th>
              <th className="num">Blocked</th>
              <th className="num">Done</th>
              <th className="num">On-time</th>
              <th className="num">Rev</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, stats, rate }) => (
              <tr
                key={user.id}
                className={cls(
                  stats.overdue > 0 && "warn",
                  filter.analyst_id === user.id && "selected",
                )}
                onClick={() => setFilter({ ...filter, analyst_id: filter.analyst_id === user.id ? null : user.id })}
              >
                <td>{user.full_name}</td>
                <td className="mono dim">{user.division ?? "—"}</td>
                <td className="num mono">{stats.total}</td>
                <td className="num mono">{stats.in_flight}</td>
                <td className={cls("num mono", stats.overdue > 0 && "neg")}>{stats.overdue}</td>
                <td className={cls("num mono", stats.blocked > 0 && "neg")}>{stats.blocked}</td>
                <td className="num mono">{stats.completed}</td>
                <td className={cls("num mono", rateClass(rate))}>{fmtPct(rate)}</td>
                <td className={cls("num mono", stats.total_revisions > 0 && "warn-text")}>{stats.total_revisions}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="empty-cell">No analysts match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rateClass(rate: number | null): string {
  if (rate === null) return "dim";
  if (rate >= 0.85) return "pos";
  if (rate >= 0.6) return "warn-text";
  return "neg";
}
