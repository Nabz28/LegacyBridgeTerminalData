import { useCallback, useEffect, useMemo, useState } from "react";
import { getClient } from "../lib/supabase";
import { useRealtimeRefresh } from "../lib/realtime";
import type {
  DeliverableOwner, DeliverableStatusView, Project, Team,
} from "../lib/types";
import type { FilterState, RollupStats, UserLite } from "../lib/kpi";
import {
  applyFilter, avgRevisions, fmtNum, fmtPct, onTimeRate, rollup,
} from "../lib/kpi";
import { cls } from "../lib/util";
import { FilterRibbon } from "./FilterRibbon";

interface KpiTabProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  teams: Team[];
  analysts: UserLite[];
}

const DIVISION_LABELS: Record<string, string> = {
  ERD: "ERD · Equity",
  MRD: "MRD · Market",
  IRD: "IRD · Industry",
  MND: "M&D · Publication",
  CROSS: "Cross-division (IM)",
};

export function KpiTab({ filter, setFilter, teams, analysts }: KpiTabProps) {
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

  const scoped = useMemo(
    () => applyFilter(deliverables, owners, projects, filter),
    [deliverables, owners, projects, filter],
  );

  const total = rollup(scoped);

  const byDivision = useMemo(() => {
    const grouped = new Map<string, RollupStats>();
    for (const d of scoped) {
      const k = d.division;
      const cur = grouped.get(k);
      grouped.set(k, cur ? combineStats(cur, rollup([d])) : rollup([d]));
    }
    return Array.from(grouped.entries())
      .sort((a, b) => b[1].total - a[1].total);
  }, [scoped]);

  const byTeam = useMemo(() => {
    const projectsById = new Map(projects.map((p) => [p.id, p]));
    const grouped = new Map<string, RollupStats>();
    for (const d of scoped) {
      const teamId = projectsById.get(d.project_id)?.team_id ?? "unassigned";
      const cur = grouped.get(teamId);
      grouped.set(teamId, cur ? combineStats(cur, rollup([d])) : rollup([d]));
    }
    return Array.from(grouped.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [scoped, projects]);

  const teamLabel = (id: string): string => {
    if (id === "unassigned") return "Unassigned";
    return teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  };

  if (!ready) return <div className="loading">Computing KPIs…</div>;
  if (err) return <div className="error-banner">{err}</div>;

  const activeProjectsInScope = new Set(scoped.map((d) => d.project_id)).size;

  return (
    <div className="agg-wrap">
      <div className="agg-header">
        <div>
          <div className="agg-title">KPI</div>
          <div className="agg-sub">{activeProjectsInScope} project{activeProjectsInScope === 1 ? "" : "s"} · {total.total} deliverables in scope</div>
        </div>
      </div>

      <FilterRibbon filter={filter} setFilter={setFilter} teams={teams} analysts={analysts} />

      <div className="kpi-cards">
        <KpiCard label="On-time rate" value={fmtPct(onTimeRate(total))} tone={rateTone(onTimeRate(total))} sub={`${total.on_time} of ${total.completed} done`} />
        <KpiCard label="Avg revisions" value={fmtNum(avgRevisions(total))} tone={revisionTone(avgRevisions(total))} sub="per completed output" />
        <KpiCard label="In flight" value={String(total.in_flight)} tone="neutral" sub={`${total.blocked} blocked`} />
        <KpiCard label="Overdue" value={String(total.overdue)} tone={total.overdue > 0 ? "neg" : "pos"} sub="past due, not done" />
        <KpiCard label="Throughput" value={String(total.completed)} tone="neutral" sub="approved + published" />
      </div>

      <div className="kpi-grid">
        <BreakdownTable
          title="By division"
          rows={byDivision.map(([k, s]) => ({ key: k, label: DIVISION_LABELS[k] ?? k, stats: s }))}
        />
        <BreakdownTable
          title="By team"
          rows={byTeam.map(([k, s]) => ({ key: k, label: teamLabel(k), stats: s }))}
        />
      </div>

      <Leaderboard
        deliverables={scoped}
        owners={owners}
        analysts={analysts.filter((a) =>
          !filter.division || a.division === filter.division
        )}
      />
    </div>
  );
}

interface LeaderboardProps {
  deliverables: DeliverableStatusView[];
  owners: DeliverableOwner[];
  analysts: UserLite[];
}

function Leaderboard({ deliverables, owners, analysts }: LeaderboardProps) {
  const dlvById = new Map(deliverables.map((d) => [d.id, d]));
  const dlvsByOwner = new Map<string, DeliverableStatusView[]>();
  for (const o of owners) {
    const d = dlvById.get(o.deliverable_id);
    if (!d) continue;
    const list = dlvsByOwner.get(o.user_id) ?? [];
    list.push(d);
    dlvsByOwner.set(o.user_id, list);
  }
  const rows = analysts
    .map((a) => {
      const dlvs = dlvsByOwner.get(a.id) ?? [];
      const stats = rollup(dlvs);
      return { user: a, stats, rate: onTimeRate(stats) };
    })
    .filter((r) => r.stats.completed > 0)
    .sort((a, b) => {
      const ar = a.rate ?? -1;
      const br = b.rate ?? -1;
      if (ar !== br) return br - ar;
      return b.stats.completed - a.stats.completed;
    })
    .slice(0, 10);

  if (rows.length === 0) return null;

  return (
    <div className="breakdown" style={{ marginTop: 16 }}>
      <h3>Top performers (on-time rate, min 1 completed)</h3>
      <table className="breakdown-table">
        <thead>
          <tr>
            <th>Analyst</th>
            <th>Division</th>
            <th className="num">Done</th>
            <th className="num">On-time</th>
            <th className="num">Rev</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ user, stats, rate }, i) => (
            <tr key={user.id}>
              <td>
                <span className="dim mono" style={{ marginRight: 8 }}>{i + 1}.</span>
                {user.full_name}
              </td>
              <td className="mono dim">{user.division ?? "—"}</td>
              <td className="num mono">{stats.completed}</td>
              <td className={cls("num mono", rateTone(rate))}>{fmtPct(rate)}</td>
              <td className="num mono">{stats.total_revisions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function combineStats(a: RollupStats, b: RollupStats): RollupStats {
  return {
    total: a.total + b.total,
    completed: a.completed + b.completed,
    on_time: a.on_time + b.on_time,
    late: a.late + b.late,
    in_flight: a.in_flight + b.in_flight,
    overdue: a.overdue + b.overdue,
    blocked: a.blocked + b.blocked,
    total_revisions: a.total_revisions + b.total_revisions,
  };
}

function rateTone(r: number | null): "pos" | "warn" | "neg" | "neutral" {
  if (r === null) return "neutral";
  if (r >= 0.85) return "pos";
  if (r >= 0.6) return "warn";
  return "neg";
}

function revisionTone(r: number | null): "pos" | "warn" | "neg" | "neutral" {
  if (r === null) return "neutral";
  if (r <= 0.5) return "pos";
  if (r <= 1.5) return "warn";
  return "neg";
}

interface KpiCardProps {
  label: string;
  value: string;
  tone: "pos" | "warn" | "neg" | "neutral";
  sub: string;
}
function KpiCard({ label, value, tone, sub }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-tone-${tone}`}>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-sub">{sub}</div>
    </div>
  );
}

interface BreakdownTableProps {
  title: string;
  rows: Array<{ key: string; label: string; stats: RollupStats }>;
}
function BreakdownTable({ title, rows }: BreakdownTableProps) {
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      <table className="breakdown-table">
        <thead>
          <tr>
            <th></th>
            <th className="num">Total</th>
            <th className="num">Done</th>
            <th className="num">On-time</th>
            <th className="num">Overdue</th>
            <th className="num">Avg rev</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, stats }) => (
            <tr key={key}>
              <td>{label}</td>
              <td className="num mono">{stats.total}</td>
              <td className="num mono">{stats.completed}</td>
              <td className={`num mono ${rateTone(onTimeRate(stats))}`}>{fmtPct(onTimeRate(stats))}</td>
              <td className={`num mono ${stats.overdue > 0 ? "neg" : ""}`}>{stats.overdue}</td>
              <td className="num mono">{fmtNum(avgRevisions(stats))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="empty-cell">No data in scope.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
