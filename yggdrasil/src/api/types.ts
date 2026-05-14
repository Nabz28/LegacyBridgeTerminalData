/**
 * Wire-format types for what the FastAPI backend returns.
 *
 * These mirror Pydantic models on the server. They intentionally stay
 * permissive (most fields optional) because:
 *   - older v0 trees don't have key_question / key_data / inversion
 *   - malformed runs can be in the listing with just an error field
 *   - new fields will land here before the UI consumes them
 */

export type Zone = 'macro' | 'industry' | 'equity';

export type NodeType =
  | 'thesis'
  | 'sub_thesis'
  | 'question'
  | 'hypothesis'
  | 'scenario'
  | 'assumption'
  | 'evidence_need'
  | 'metric'
  | 'catalyst';

export type EdgeType =
  | 'supports'
  | 'refutes'
  | 'depends_on'
  | 'alternative_to'
  | 'requires_evidence_from'
  | 'transmits_to'
  | 'triggers';

export interface KeyDataPoint {
  label: string;
  value: string;
  projected?: string | null;
  unit?: string | null;
  direction?: 'up' | 'down' | 'flat' | null;
}

export interface CrossLink {
  target_id: string;
  edge_type: EdgeType;
  metadata?: Record<string, unknown>;
}

/**
 * Discriminated by `type`. We don't enumerate every type-specific
 * field here — the UI reads them off `[key: string]: unknown` for
 * the rare type-specific surfaces.
 */
export interface DimensionVerdict {
  dimension: string;
  verdict: 'included' | 'merged' | 'excluded';
  child_id: string | null;
  reason: string | null;
}

export interface YgNode {
  id: string;
  run_id: string;
  type: NodeType;
  zone: Zone;
  title: string;
  body: string;
  primary_parent: string | null;
  cross_links: CrossLink[];
  canonical_id: string | null;
  confidence: number;
  status: 'open' | 'investigating' | 'resolved' | 'dropped';
  metadata: Record<string, unknown>;
  created_at: string;
  expanded_by_prompt_version: string | null;
  // Sprint 7 terminal fields
  key_question: string | null;
  key_data: KeyDataPoint[];
  inversion: string | null;
  // Sprint 9 v2 fields
  role: string | null;
  decomposition_audit: DimensionVerdict[];
  breaks: string[];
  // Type-specific fields land at top level too — read defensively.
  [key: string]: unknown;
}

export interface RunMetadata {
  run_id: string;
  topic: string;
  prompts_version: string;
  rubric_version?: string | null;
  created_at: string;
  // Free-form, may include orchestrator stats.
  [key: string]: unknown;
}

export interface Tree {
  metadata: RunMetadata;
  nodes: Record<string, YgNode>;
}

export interface ScoreSummary {
  run_id: string;
  judge: string;
  rubric_version: string;
  prompts_version: string;
  overall: number;
  coverage_pct: number;
  scored_at: string;
  by_criterion: Record<string, number>;
  by_zone: Record<string, number>;
  nodes: Record<string, unknown>;
  tree_criteria: Array<{ criterion: string; score: number }>;
  // Free-form for additive criteria.
  [key: string]: unknown;
}

export interface RunIndexRow {
  run_dir_name: string;
  run_id?: string;
  topic?: string;
  prompts_version?: string;
  node_count?: number;
  score?: number | null;
  scored_at?: string | null;
  error?: string;
}

export interface RunDetail {
  run_dir_name: string;
  tree: Tree;
  scores: ScoreSummary | null;
}

export interface EntityRow {
  canonical_id: string;
  type: string;
  name: string;
  slug: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Sprint 9 — audit + tasks
// ---------------------------------------------------------------------------

export interface AuditFinding {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  node_id: string | null;
  message: string;
}

export interface AuditReport {
  run_id: string;
  pass_: boolean;
  findings: AuditFinding[];
}

export interface TaskRow {
  id: string;
  kind: 'research' | 'monitor' | 'watch';
  type: NodeType;
  zone: Zone;
  title: string;
  key_question: string | null;
  key_data: KeyDataPoint[];
  inversion: string | null;
  parent_id: string | null;
  parent_title: string | null;
  pillar: string | null;
  role: string | null;
  confidence: number;
  canonical_id: string | null;
  metric_threshold: number | null;
  metric_direction: 'above' | 'below' | 'crosses' | null;
  metric_cadence: string | null;
  metric_unit: string | null;
  evidence_query: string | null;
  evidence_tool: string | null;
  evidence_method: string | null;
  catalyst_date: string | null;
  catalyst_impact: string | null;
}

export interface TasksResponse {
  run_id: string;
  run_dir_name: string;
  task_count: number;
  tasks: TaskRow[];
}
