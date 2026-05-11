"""Build catalog/_graph_insane.json — ALL 3,886 RICs laid out as a bordered map.

Same bordered-region concept as the Condensed map, but applied to the entire
catalog. Each RIC is placed in a region based on its cluster (auto-derived from
the existing _index.json subcategory mapping). Regions have fixed positions
on a large canvas; nodes inside a region are auto-arranged in a grid.

The renderer draws rounded-rectangle borders around each region with a label.

Run from repo root:  python scripts/build_graph_insane.py
"""

from __future__ import annotations

import json
import math
import os
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _resolve_country() -> str:
    if "--country" in sys.argv:
        i = sys.argv.index("--country")
        if i + 1 < len(sys.argv):
            cc = sys.argv[i + 1].lower()
            del sys.argv[i:i + 2]
            os.environ["RIC_COUNTRY"] = cc
            return cc
    return os.environ.get("RIC_COUNTRY", "us").lower()


COUNTRY = _resolve_country()
CATALOG_DIR = os.path.join(REPO_ROOT, "catalog", COUNTRY)
OUTPUT_PATH = os.path.join(CATALOG_DIR, "_graph_insane.json")
FULL_GRAPH_PATH = os.path.join(CATALOG_DIR, "_graph.json")


# ============================================================================
#  REGION LAYOUT — same conceptual super-clusters as the condensed map.
#  Positions chosen so each region has room for its (much larger) member set.
# ============================================================================
# Insane has ~30 regions (one per cluster) since 3,886 nodes don't fit into ~12.
# We arrange clusters on a 6x6-ish grid by macro role.

# (region_id, label, color, grid_row, grid_col)
REGION_GRID = [
    # Row 0 — leading & sentiment
    ("surveys",          "SURVEYS & SENTIMENT",       "#eab308", 0, 1),
    ("forecasts",        "FORECASTS",                 "#94a3b8", 0, 4),

    # Row 1 — labor + activity (left to right)
    ("employment",       "EMPLOYMENT",                "#22c55e", 1, 0),
    ("unemployment",     "UNEMPLOYMENT",              "#16a34a", 1, 1),
    ("wages",            "WAGES & PRODUCTIVITY",      "#15803d", 1, 2),
    ("inflation",        "INFLATION",                 "#ff8a00", 1, 3),
    ("fed",              "FED POLICY",                "#ec4899", 1, 4),
    ("money",            "MONEY SUPPLY",              "#0891b2", 1, 5),

    # Row 2 — demand / GDP / treasury
    ("consumption",      "CONSUMPTION",               "#0ea5e9", 2, 0),
    ("auto",             "AUTO",                      "#7e22ce", 2, 1),
    ("investment",       "INVESTMENT",                "#0284c7", 2, 2),
    ("gdp",              "GDP & OUTPUT",              "#3b82f6", 2, 3),
    ("treasury",         "TREASURY & DEBT",           "#f43f5e", 2, 4),
    ("equity",           "EQUITY MARKETS",            "#84cc16", 2, 5),

    # Row 3 — sectors / housing / banking
    ("housing_act",      "HOUSING ACTIVITY",          "#a855f7", 3, 0),
    ("housing_px",       "HOUSING PRICES",            "#9333ea", 3, 1),
    ("mortgage",         "MORTGAGE MARKETS",          "#c026d3", 3, 2),
    ("consumer_credit",  "CONSUMER CREDIT",           "#0e7490", 3, 3),
    ("bank_lending",     "BANK LENDING",              "#06b6d4", 3, 4),
    ("bankruptcies",     "BANKRUPTCIES",              "#b91c1c", 3, 5),

    # Row 4 — external / energy / agri
    ("fx",               "FX",                        "#fb923c", 4, 0),
    ("trade",            "TRADE",                     "#f97316", 4, 1),
    ("energy",           "ENERGY",                    "#dc2626", 4, 3),
    ("agri",             "AGRICULTURE",               "#65a30d", 4, 4),

    # Row 5 — government / demographics / misc
    ("government",       "GOVERNMENT FISCAL",         "#7c3aed", 5, 0),
    ("demographics",     "DEMOGRAPHICS",              "#6b7280", 5, 1),
    ("misc",             "MISC",                      "#52525b", 5, 5),
]

GRID_COL_W = 7500   # canvas units per grid column (much wider so big clusters don't bleed)
GRID_ROW_H = 6000   # canvas units per grid row


def region_center(row: int, col: int) -> tuple[float, float]:
    return col * GRID_COL_W, row * GRID_ROW_H


def cluster_layout(
    members: list[dict],
    edges_within: list[tuple[str, str]],
    cx: float,
    cy: float,
    n_members: int,
) -> dict[str, tuple[float, float]]:
    """Force-directed layout for an insane-mode region. Tuned for many nodes (10-500+)."""
    if not members:
        return {}
    rng = random.Random(hash(members[0]["id"]) & 0xffffffff)

    # Tune force parameters by member density. Tripled vs prior so labels can fit.
    spring_length = max(110.0, math.sqrt(n_members) * 32.0)
    repulsion = max(28000.0, n_members * 700.0)
    region_pull = 0.006
    iterations = 220 if n_members <= 80 else 160
    cooling = 0.96

    pos: dict[str, list[float]] = {}
    for i, m in enumerate(members):
        angle = (i * 137.5) * math.pi / 180.0
        r0 = 40 + rng.uniform(0, math.sqrt(n_members) * 8)
        pos[m["id"]] = [
            cx + r0 * math.cos(angle) + rng.uniform(-20, 20),
            cy + r0 * math.sin(angle) + rng.uniform(-20, 20),
        ]

    rics = [m["id"] for m in members]
    edge_set = set()
    for s, t in edges_within:
        if s in pos and t in pos:
            edge_set.add((s, t))

    step = 1.0
    for _ in range(iterations):
        force = {r: [0.0, 0.0] for r in rics}

        # Region anchor pull
        for r, xy in pos.items():
            force[r][0] -= region_pull * (xy[0] - cx)
            force[r][1] -= region_pull * (xy[1] - cy)

        # Pairwise repulsion (capped to nearest neighbors for big regions to keep O(n*k))
        # For simplicity we still do O(n^2) but for n<800 it's tractable.
        m = len(rics)
        for i in range(m):
            ri = rics[i]
            xi, yi = pos[ri]
            for j in range(i + 1, m):
                rj = rics[j]
                xj, yj = pos[rj]
                dx = xi - xj
                dy = yi - yj
                d2 = dx * dx + dy * dy + 0.01
                # Distance cutoff for performance — bigger now since spring_length grew
                if d2 > 360000:  # 600 units
                    continue
                d = math.sqrt(d2)
                f = repulsion / d2
                fx = f * dx / d
                fy = f * dy / d
                force[ri][0] += fx
                force[ri][1] += fy
                force[rj][0] -= fx
                force[rj][1] -= fy

        # Edge springs
        for s, t in edge_set:
            xs, ys = pos[s]
            xt, yt = pos[t]
            dx = xt - xs
            dy = yt - ys
            d = math.sqrt(dx * dx + dy * dy) or 0.01
            spring = 0.05 * (d - spring_length)
            fx = spring * dx / d
            fy = spring * dy / d
            force[s][0] += fx
            force[s][1] += fy
            force[t][0] -= fx
            force[t][1] -= fy

        # Apply with cap + cooling
        for r in rics:
            fx, fy = force[r]
            mag = math.sqrt(fx * fx + fy * fy)
            cap = 35
            if mag > cap:
                fx = fx * cap / mag
                fy = fy * cap / mag
            pos[r][0] += fx * step
            pos[r][1] += fy * step
        step *= cooling

    return {r: (xy[0], xy[1]) for r, xy in pos.items()}


def main() -> int:
    if not os.path.exists(FULL_GRAPH_PATH):
        print(f"[insane] ERROR: {FULL_GRAPH_PATH} not found. Run scripts/build_graph.py first.", file=sys.stderr)
        return 2

    with open(FULL_GRAPH_PATH, encoding="utf-8") as f:
        full = json.load(f)

    full_nodes = full.get("nodes", [])
    full_edges = full.get("edges", [])
    full_clusters = {c["id"]: c for c in full.get("clusters", [])}

    # Region map (id -> meta)
    region_meta: dict[str, dict] = {}
    for region_id, label, color, row, col in REGION_GRID:
        cx, cy = region_center(row, col)
        region_meta[region_id] = {
            "id": region_id,
            "label": label,
            "color": color,
            "cx": cx,
            "cy": cy,
            "row": row,
            "col": col,
            "ric_count": 0,
        }

    # Group nodes by their cluster (= region) and assign x/y
    by_region: dict[str, list[dict]] = defaultdict(list)
    skipped: list[str] = []
    for n in full_nodes:
        cluster = n.get("cluster") or "misc"
        if cluster not in region_meta:
            cluster = "misc"
        by_region[cluster].append(n)

    # Force-directed cluster layout per region
    out_nodes = []
    for region_id, members in by_region.items():
        meta = region_meta[region_id]
        cx, cy = meta["cx"], meta["cy"]
        n_members = len(members)

        # Build edges within this region (for spring forces)
        member_ids = {m["id"] for m in members}
        within_edges = [(e["source"], e["target"]) for e in full_edges
                        if e["source"] in member_ids and e["target"] in member_ids]

        positions = cluster_layout(members, within_edges, cx, cy, n_members)

        meta["ric_count"] = n_members
        for n in members:
            x, y = positions.get(n["id"], (cx, cy))
            out_nodes.append({
                "id": n["id"],
                "label": n.get("label") or n["id"],
                "cluster": region_id,
                "tier": n.get("tier", 2),
                "category": n.get("category", ""),
                "subcategory": n.get("subcategory", ""),
                "is_anchor": n.get("is_anchor", False),
                "region": region_id,
                "x": x,
                "y": y,
            })

    # Edges: keep only those whose endpoints survived (all should, but safe)
    node_ids = {n["id"] for n in out_nodes}
    out_edges = []
    for e in full_edges:
        if e["source"] in node_ids and e["target"] in node_ids:
            out_edges.append(e)

    regions_out = list(region_meta.values())

    g = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "node_count": len(out_nodes),
            "edge_count": len(out_edges),
            "region_count": len(regions_out),
            "skipped_rics": len(skipped),
        },
        "regions": regions_out,
        "clusters": [{"id": cid, "color": full_clusters.get(cid, {}).get("color", "#94a3b8"),
                      "ric_count": region_meta.get(cid, {}).get("ric_count", 0)}
                     for cid in region_meta],
        "nodes": out_nodes,
        "edges": out_edges,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(g, f, ensure_ascii=False, indent=2)

    print(f"[insane] {g['stats']['node_count']} nodes, {g['stats']['edge_count']} edges, {g['stats']['region_count']} regions")
    print(f"[insane] -> {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
