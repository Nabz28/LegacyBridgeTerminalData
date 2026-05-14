/**
 * Zone + node-type color tokens.
 *
 * Single source of truth for all rendering — components import from
 * here rather than hardcoding hex strings, so a future theme switch
 * touches one file.
 */

import type { EdgeType, NodeType, Zone } from "./types";

export const ZONE_COLORS: Record<Zone, string> = {
  macro: "#3b82f6",      // blue
  industry: "#22c55e",   // green
  equity: "#f59e0b",     // amber
};

export const ZONE_BG: Record<Zone, string> = {
  macro: "#dbeafe",
  industry: "#dcfce7",
  equity: "#fef3c7",
};

/** Per-node-type accent — used in the detail panel and legend. */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  thesis: "Thesis",
  sub_thesis: "Sub-thesis",
  question: "Question",
  hypothesis: "Hypothesis",
  scenario: "Scenario",
  assumption: "Assumption",
  evidence_need: "Evidence need",
  metric: "Metric",
  catalyst: "Catalyst",
};

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  supports: "supports",
  refutes: "refutes",
  depends_on: "depends on",
  alternative_to: "alternative to",
  requires_evidence_from: "requires evidence from",
  transmits_to: "transmits to",
  triggers: "triggers",
};

/** Cross-link arc colors per edge type. Kept distinct from zone
 *  colors so an arc never visually merges with the node rectangle
 *  it overlays. */
export const EDGE_COLORS: Record<EdgeType, string> = {
  supports: "#16a34a",
  refutes: "#dc2626",
  depends_on: "#7c3aed",
  alternative_to: "#9333ea",
  requires_evidence_from: "#0891b2",
  transmits_to: "#ea580c",
  triggers: "#db2777",
};
