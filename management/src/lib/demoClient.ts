// Fake supabase-js client for demo mode. Implements just enough of the
// query-builder + storage + rpc surface for our components to work.
//
// The builder is "thenable" -- awaiting it triggers _execute() which reads
// (or mutates) the demo store. Mutations bump the store version so the
// components' refresh() loop picks them up.

import {
  deliverableView, dispatch, getStore, nowIso, type DemoStore,
} from "./demo";

interface Filter { op: "eq" | "in" | "neq"; col: string; val?: unknown; vals?: unknown[] }
interface OrderBy { col: string; ascending: boolean }
type Mode = "select" | "insert" | "update" | "delete" | "upsert";

interface QueryState {
  mode: Mode;
  filters: Filter[];
  orders: OrderBy[];
  limit?: number;
  single?: boolean;
  selectCols?: string;
  insertRows?: Record<string, unknown>[];
  updatePatch?: Record<string, unknown>;
  upsertRows?: Record<string, unknown>[];
  upsertOnConflict?: string;
}

type Row = Record<string, unknown>;

function readTable(table: string): Row[] {
  const s = getStore();
  switch (table) {
    case "users":               return s.users as unknown as Row[];
    case "users_lite":          return s.users.map(({ password_hash: _, ...rest }: any) => rest) as Row[];
    case "teams":               return s.teams as unknown as Row[];
    case "team_members":        return s.team_members as unknown as Row[];
    case "projects":            return s.projects as unknown as Row[];
    case "deliverables":        return s.deliverables as unknown as Row[];
    case "deliverable_owners":  return s.deliverable_owners as unknown as Row[];
    case "comments":            return s.comments as unknown as Row[];
    case "activity_log":        return s.activity_log as unknown as Row[];
    case "project_approvers":      return s.project_approvers as unknown as Row[];
    case "project_access":         return s.project_access as unknown as Row[];
    case "project_members":        return s.project_members as unknown as Row[];
    case "project_events":         return s.project_events as unknown as Row[];
    case "project_event_attendees":return s.project_event_attendees as unknown as Row[];
    case "v_deliverable_status":
      return s.deliverables.map((d) => deliverableView(d, s.projects)) as unknown as Row[];
    case "v_analyst_kpi":
      return computeAnalystKpi(s) as unknown as Row[];
    case "v_user_activity":
      return computeUserActivity(s) as unknown as Row[];
    default:
      return [];
  }
}

function writeTable(table: string, updater: (s: DemoStore, rows: Row[]) => Partial<DemoStore>) {
  dispatch((s) => {
    const rows = readTable(table);
    return { ...s, ...updater(s, rows) };
  });
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  let out = rows;
  for (const f of filters) {
    if (f.op === "eq") out = out.filter((r) => r[f.col] === f.val);
    else if (f.op === "neq") out = out.filter((r) => r[f.col] !== f.val);
    else if (f.op === "in") {
      const set = new Set(f.vals);
      out = out.filter((r) => set.has(r[f.col] as never));
    }
  }
  return out;
}

function applyOrders(rows: Row[], orders: OrderBy[]): Row[] {
  if (orders.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const o of orders) {
      const av = a[o.col];
      const bv = b[o.col];
      if (av === bv) continue;
      if (av === null || av === undefined) return o.ascending ? -1 : 1;
      if (bv === null || bv === undefined) return o.ascending ? 1 : -1;
      const cmp = (av as number | string) < (bv as number | string) ? -1 : 1;
      return o.ascending ? cmp : -cmp;
    }
    return 0;
  });
}

// ─── Query builder ─────────────────────────────────────────────────────

class FakeQuery implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private state: QueryState;

  constructor(private table: string, init?: Partial<QueryState>) {
    this.state = {
      mode: init?.mode ?? "select",
      filters: init?.filters ?? [],
      orders: init?.orders ?? [],
      ...init,
    };
  }

  private clone(patch: Partial<QueryState>): FakeQuery {
    return new FakeQuery(this.table, { ...this.state, ...patch });
  }

  select(cols?: string): FakeQuery {
    return this.clone({ mode: this.state.mode === "select" ? "select" : this.state.mode, selectCols: cols });
  }
  eq(col: string, val: unknown): FakeQuery {
    return this.clone({ filters: [...this.state.filters, { op: "eq", col, val }] });
  }
  neq(col: string, val: unknown): FakeQuery {
    return this.clone({ filters: [...this.state.filters, { op: "neq", col, val }] });
  }
  in(col: string, vals: unknown[]): FakeQuery {
    return this.clone({ filters: [...this.state.filters, { op: "in", col, vals }] });
  }
  order(col: string, opts?: { ascending?: boolean }): FakeQuery {
    return this.clone({
      orders: [...this.state.orders, { col, ascending: opts?.ascending !== false }],
    });
  }
  limit(n: number): FakeQuery { return this.clone({ limit: n }); }
  maybeSingle(): FakeQuery { return this.clone({ single: true }); }
  single(): FakeQuery { return this.clone({ single: true }); }
  insert(rows: Row | Row[]): FakeQuery {
    return this.clone({ mode: "insert", insertRows: Array.isArray(rows) ? rows : [rows] });
  }
  update(patch: Row): FakeQuery { return this.clone({ mode: "update", updatePatch: patch }); }
  delete(): FakeQuery { return this.clone({ mode: "delete" }); }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }): FakeQuery {
    return this.clone({
      mode: "upsert",
      upsertRows: Array.isArray(rows) ? rows : [rows],
      upsertOnConflict: opts?.onConflict,
    });
  }

  then<TResult1 = { data: unknown; error: null }>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => never) | null,
  ): PromiseLike<TResult1> {
    try {
      const result = this._execute();
      return Promise.resolve(result as { data: unknown; error: null }).then(onfulfilled as never, onrejected as never);
    } catch (e) {
      const errResp = { data: null, error: { message: (e as Error).message } } as unknown as { data: unknown; error: null };
      return Promise.resolve(errResp).then(onfulfilled as never, onrejected as never);
    }
  }

  private _execute(): { data: unknown; error: null } {
    if (this.state.mode === "select") {
      let rows = applyFilters(readTable(this.table), this.state.filters);
      rows = applyOrders(rows, this.state.orders);
      if (this.state.limit !== undefined) rows = rows.slice(0, this.state.limit);
      if (this.state.single) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    if (this.state.mode === "insert") {
      const rows = this.state.insertRows ?? [];
      const inserted = rows.map((r) => normalizeInsert(this.table, r));
      writeTable(this.table, (s, existing) => insertInto(s, this.table, existing, inserted));
      return { data: this.state.single ? inserted[0] : inserted, error: null };
    }

    if (this.state.mode === "update") {
      const patch = this.state.updatePatch ?? {};
      writeTable(this.table, (s, existing) => {
        const filtered = applyFilters(existing, this.state.filters);
        const ids = new Set(filtered.map((r) => keyOf(this.table, r)));
        const next = existing.map((r) =>
          ids.has(keyOf(this.table, r)) ? { ...r, ...patch } : r,
        );
        return replaceTable(s, this.table, next);
      });
      return { data: null, error: null };
    }

    if (this.state.mode === "delete") {
      writeTable(this.table, (s, existing) => {
        const matched = new Set(applyFilters(existing, this.state.filters).map((r) => keyOf(this.table, r)));
        const next = existing.filter((r) => !matched.has(keyOf(this.table, r)));
        return replaceTable(s, this.table, next);
      });
      return { data: null, error: null };
    }

    if (this.state.mode === "upsert") {
      const rows = this.state.upsertRows ?? [];
      const onConflict = (this.state.upsertOnConflict ?? "id").split(",").map((c) => c.trim());
      writeTable(this.table, (s, existing) => {
        let next = [...existing];
        for (const row of rows) {
          const idx = next.findIndex((r) => onConflict.every((c) => r[c] === row[c]));
          if (idx >= 0) next[idx] = { ...next[idx], ...row };
          else next.push(normalizeInsert(this.table, row));
        }
        return replaceTable(s, this.table, next);
      });
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }
}

function keyOf(table: string, row: Row): string {
  if (table === "team_members") return `${row.team_id}|${row.user_id}`;
  if (table === "deliverable_owners") return `${row.deliverable_id}|${row.user_id}`;
  if (table === "project_access") return `${row.project_id}|${row.user_id}`;
  if (table === "project_members") return `${row.project_id}|${row.user_id}`;
  if (table === "project_approvers") return `${row.project_id}|${row.division}|${row.user_id}`;
  if (table === "project_event_attendees") return `${row.event_id}|${row.user_id}`;
  return String(row.id);
}

function normalizeInsert(table: string, row: Row): Row {
  const now = nowIso();
  const out: Row = { ...row };
  const linkTables = [
    "team_members","deliverable_owners","project_access","project_approvers",
    "project_members","project_event_attendees",
  ];
  if (!out.id && !linkTables.includes(table)) {
    out.id = `id-${table}-${Math.random().toString(36).slice(2, 10)}`;
  }
  if (out.created_at === undefined && !linkTables.includes(table)) {
    out.created_at = now;
  }
  if (out.updated_at === undefined && (table === "deliverables" || table === "project_events")) {
    out.updated_at = now;
  }
  if (table === "project_members" && out.added_at === undefined) {
    out.added_at = now;
  }
  return out;
}

function replaceTable(_s: DemoStore, table: string, rows: Row[]): Partial<DemoStore> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { [table]: rows } as any;
}

function insertInto(_s: DemoStore, table: string, existing: Row[], rows: Row[]): Partial<DemoStore> {
  return replaceTable(_s, table, [...existing, ...rows]);
}

// ─── KPI views ─────────────────────────────────────────────────────────

function computeAnalystKpi(s: DemoStore) {
  const today = new Date().toISOString().slice(0, 10);
  return s.users.filter((u) => u.role === "analyst").map((u) => {
    const dlvIds = s.deliverable_owners.filter((o) => o.user_id === u.id).map((o) => o.deliverable_id);
    const dlvs = s.deliverables.filter((d) => dlvIds.includes(d.id));
    const completed = dlvs.filter((d) => d.state === "approved" || d.state === "published").length;
    const on_time = dlvs.filter((d) => (d.state === "approved" || d.state === "published")
                                     && d.approved_at && d.approved_at.slice(0, 10) <= d.due_date).length;
    const in_flight = dlvs.filter((d) => ["not_started","in_progress","submitted"].includes(d.state)).length;
    const overdue = dlvs.filter((d) => d.due_date < today && !["approved","published"].includes(d.state)).length;
    const total_revisions = dlvs.reduce((sum, d) => sum + d.revision_count, 0);
    return {
      user_id: u.id, username: u.username, full_name: u.full_name, division: u.division,
      completed, on_time, in_flight, overdue, total_revisions,
    };
  });
}

function computeUserActivity(s: DemoStore) {
  return s.users.map((u) => {
    const dlvIds = s.deliverable_owners.filter((o) => o.user_id === u.id).map((o) => o.deliverable_id);
    const dlvs = s.deliverables.filter((d) => dlvIds.includes(d.id));
    const flighting = dlvs.filter((d) => !["approved","published"].includes(d.state));
    const completed = dlvs.filter((d) => ["approved","published"].includes(d.state)).length;
    return {
      user_id: u.id, username: u.username, full_name: u.full_name,
      role: u.role, division: u.division, active: u.active,
      active_projects: new Set(flighting.map((d) => d.project_id)).size,
      in_flight: flighting.length,
      completed,
    };
  });
}

// ─── RPCs ──────────────────────────────────────────────────────────────

function rpc(name: string, _args: Record<string, unknown>): { data: unknown; error: null } {
  void _args;
  // demo mode doesn't call verify_login or next_project_id directly
  // (auth-login bypassed; create-project allocates IDs via demo.nextProjectId)
  if (name === "next_project_id") {
    const yr = new Date().getUTCFullYear();
    const next = getStore().next_project_seq;
    return { data: `PROJ-${yr}-${String(next).padStart(3, "0")}`, error: null };
  }
  return { data: null, error: null };
}

// ─── Storage ───────────────────────────────────────────────────────────

class FakeStorageBucket {
  constructor(private bucket: string) {}
  async upload(_path: string, _file: File | Blob): Promise<{ data: { path: string } | null; error: null }> {
    void _file;
    // Demo: pretend we uploaded.
    return { data: { path: _path }, error: null };
  }
  async createSignedUrl(_path: string, _ttl: number): Promise<{ data: { signedUrl: string } | null; error: null }> {
    void _ttl;
    return { data: { signedUrl: `data:text/plain,Demo+mode+cannot+download+real+files+(${this.bucket}/${_path})` }, error: null };
  }
}

// ─── Client ────────────────────────────────────────────────────────────

export function makeDemoClient(): unknown {
  return {
    from(table: string) { return new FakeQuery(table); },
    rpc(name: string, args: Record<string, unknown>) {
      return Promise.resolve(rpc(name, args));
    },
    schema(_: string) { return makeDemoClient(); },
    storage: { from(bucket: string) { return new FakeStorageBucket(bucket); } },
    auth: {
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  };
}
