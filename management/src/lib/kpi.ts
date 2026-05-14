// Client-side KPI aggregation. Operates on DeliverableStatusView rows fetched
// from PostgREST -- avoids a server round-trip per filter change.

import type {
  DeliverableHealth, DeliverableOwner, DeliverableStatusView,
  Project,
} from "./types";

export interface FilterState {
  division: string | null; // 'ERD' | 'MRD' | 'IRD' | 'MND' | null
  team_id: string | null;
  analyst_id: string | null;
  period: "all" | "ytd" | "30d" | "90d";
}

export const DEFAULT_FILTER: FilterState = {
  division: null,
  team_id: null,
  analyst_id: null,
  period: "all",
};

export interface UserLite {
  id: string;
  username: string;
  full_name: string;
  division: string | null;
  title: string | null;
  role: string;
}

export interface RollupStats {
  total: number;
  completed: number;
  on_time: number;
  late: number;
  in_flight: number;
  overdue: number;
  blocked: number;
  total_revisions: number;
}

export const EMPTY_STATS: RollupStats = {
  total: 0, completed: 0, on_time: 0, late: 0,
  in_flight: 0, overdue: 0, blocked: 0, total_revisions: 0,
};

export function periodStart(period: FilterState["period"]): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "ytd") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const days = period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function applyFilter(
  deliverables: DeliverableStatusView[],
  owners: DeliverableOwner[],
  projects: Project[],
  filter: FilterState,
): DeliverableStatusView[] {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const ownersByDlv = new Map<string, string[]>();
  for (const o of owners) {
    const list = ownersByDlv.get(o.deliverable_id) ?? [];
    list.push(o.user_id);
    ownersByDlv.set(o.deliverable_id, list);
  }

  const cutoff = periodStart(filter.period);

  return deliverables.filter((d) => {
    if (filter.division && d.division !== filter.division) return false;

    const proj = projectsById.get(d.project_id);
    if (filter.team_id && proj?.team_id !== filter.team_id) return false;

    if (filter.analyst_id) {
      const owners = ownersByDlv.get(d.id) ?? [];
      if (!owners.includes(filter.analyst_id)) return false;
    }

    if (cutoff) {
      const dueDate = new Date(d.due_date + "T00:00:00Z");
      if (dueDate < cutoff) return false;
    }

    return true;
  });
}

export function rollup(deliverables: DeliverableStatusView[]): RollupStats {
  const stats = { ...EMPTY_STATS };
  for (const d of deliverables) {
    stats.total += 1;
    stats.total_revisions += d.revision_count;
    const h: DeliverableHealth = d.health;
    if (d.state === "approved" || d.state === "published") {
      stats.completed += 1;
      if (h === "on_time") stats.on_time += 1;
      else if (h === "late") stats.late += 1;
    } else if (d.blocked) {
      stats.blocked += 1;
      stats.in_flight += 1;
    } else if (h === "overdue") {
      stats.overdue += 1;
      stats.in_flight += 1;
    } else {
      stats.in_flight += 1;
    }
  }
  return stats;
}

export function onTimeRate(stats: RollupStats): number | null {
  if (stats.completed === 0) return null;
  return stats.on_time / stats.completed;
}

export function avgRevisions(stats: RollupStats): number | null {
  if (stats.completed === 0) return null;
  return stats.total_revisions / stats.completed;
}

export function groupBy<K extends string | number>(
  rows: DeliverableStatusView[],
  keyFn: (d: DeliverableStatusView) => K | null,
): Map<K, DeliverableStatusView[]> {
  const map = new Map<K, DeliverableStatusView[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined) continue;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return map;
}

export function ownersOf(
  deliverableId: string,
  owners: DeliverableOwner[],
): string[] {
  return owners.filter((o) => o.deliverable_id === deliverableId).map((o) => o.user_id);
}

export function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${Math.round(n * 100)}%`;
}

export function fmtNum(n: number | null, digits = 1): string {
  if (n === null) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(digits);
}
