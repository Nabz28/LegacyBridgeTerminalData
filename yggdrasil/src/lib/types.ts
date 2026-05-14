/**
 * Shape mirrors the Python schema in `yggdrasil/schema/`.
 * Keep these definitions in sync — if the JSON shape changes, bump
 * SCHEMA_VERSION on the Python side and update the viewer guard.
 *
 * Hand-maintained (no JSON-schema codegen yet) — strict enough to
 * catch drift in `tsc`, loose enough to evolve without ceremony.
 */

export const SUPPORTED_SCHEMA_VERSION = 1;

export type Zone = "macro" | "industry" | "equity";

export type NodeStatus = "open" | "investigating" | "resolved" | "dropped";

export type NodeType =
  | "thesis"
  | "sub_thesis"
  | "question"
  | "hypothesis"
  | "scenario"
  | "assumption"
  | "evidence_need"
  | "metric"
  | "catalyst";

export type EdgeType =
  | "supports"
  | "refutes"
  | "depends_on"
  | "alternative_to"
  | "requires_evidence_from"
  | "transmits_to"
  | "triggers";

export interface CrossLink {
  target_id: string;
  edge_type: EdgeType;
  metadata: Record<string, unknown>;
}

export interface BaseNodeShape {
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
  status: NodeStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  expanded_by_prompt_version: string | null;
  // Type-specific fields land as additional properties; we keep the
  // shape open here so the viewer can render them generically.
  [extra: string]: unknown;
}

export interface RunMetadata {
  run_id: string;
  topic: string;
  created_at: string;
  completed_at: string | null;
  prompts_version: string;
  runtime: string;
  model: string | null;
  depth_cap: number;
  node_cap: number;
  node_count: number;
}

export interface Tree {
  metadata: RunMetadata;
  root_id: string | null;
  nodes: Record<string, BaseNodeShape>;
}

// Viewer-snapshot ``index.json`` shape, produced by `yggdrasil viz dump`.

export interface RunIndexEntry extends Partial<RunMetadata> {
  run_dir_name: string;
  tree_path: string;
  error?: string;
}

export interface EntityIndexEntry {
  canonical_id: string;
  type: string;
  slug: string;
  title: string;
  reference_count: number;
  run_count: number;
}

export interface LinkIndexEntry {
  canonical_id: string;
  run_id: string;
  node_id: string;
  node_type: NodeType;
  zone: Zone;
  confidence: number | null;
  match_method: string | null;
  linked_at: string;
}

export interface EdgeIndexEntry {
  id: number;
  source_canonical_id: string;
  target_canonical_id: string;
  edge_type: EdgeType;
  run_id: string;
  source_node_id: string;
  target_node_id: string;
  metadata_json: string | null;
  created_at: string;
}

export interface ViewerIndex {
  schema_version: number;
  generated_at: string;
  runs: RunIndexEntry[];
  entities: EntityIndexEntry[];
  links: LinkIndexEntry[];
  edges: EdgeIndexEntry[];
}
