"""
report.py — regenerate industry-engine/REPORT.md from output/engine.json.
Run:  python industry-engine/engine/report.py
"""
from __future__ import annotations

import common as C


def _enc(s: str) -> str:
    # fix double-encoded UTF-8 labels (e.g. "Nickel Â· LME")
    try:
        return (s or "").encode("latin1", "ignore").decode("utf-8", "ignore")
    except Exception:  # noqa: BLE001
        return s or ""


def _line(b: dict) -> str:
    mv = b.get("multivariate") or {}
    td = (b.get("drivers") or [{}])[0]
    r2, oos = mv.get("r2"), mv.get("oos_hit_rate")
    lab = _enc(td.get("label") or "")[:24]
    return (f"| {b['sub_sector']} | {b['sector']} | {b.get('verdict')} | "
            f"{b.get('score')} | {(b.get('confidence') or {}).get('level')} | "
            f"{b.get('n_kept')} | {('%.2f' % r2) if r2 is not None else '-'} | "
            f"{('%.0f%%' % (oos * 100)) if oos is not None else '-'} | "
            f"{lab} ({td.get('pearson')}) |")


def build() -> None:
    e = C.read_json(C.OUTPUT_DIR / "engine.json")
    B = e["baskets"]
    rows: dict = {}
    for b in B:
        rows.setdefault(b.get("grade") or "needs_review", []).append(b)
    o = ["# LBC Industry Driver Engine — Report", "",
         f"_Auto-generated from output/engine.json — {e['generated_at']}._  ",
         f"**{len(rows.get('perfected', []))} perfected · "
         f"{len(rows.get('partial', []))} partial · "
         f"{len(rows.get('needs_review', []))} needs_review · "
         f"{len(rows.get('blocked', []))} blocked** of {len(B)} IDX sub-industry baskets.",
         "",
         "Each row: which CEIC/macro/commodity series statistically drive the "
         "basket's stock returns, the live verdict, and model quality (monthly R^2 "
         "+ pseudo-OOS directional hit-rate). Method: EQUAL-WEIGHT basket return "
         "(no mcap look-ahead) vs overlap-aware HAC-OLS + Šidák lead-lag + "
         "autocorr-deflated IC + collinearity-pruned multivariate + pseudo-OOS, "
         "reconciled against economic theory; confidence multiple-testing-penalised "
         "and conviction-shrunk when evidence is thin. CEIC drivers are "
         "publication-lagged (as-known). See PLAN.md / RUN.md / CRITIQUE_LOG.md.", ""]
    for g in ("perfected", "partial", "needs_review", "blocked"):
        gg = rows.get(g) or []
        if not gg:
            continue
        o += [f"## {g.upper()} ({len(gg)})", "",
              "| Basket | Sector | Verdict | Score | Conf | #drv | MV R2 | OOS | "
              "Top driver (corr) |",
              "|---|---|---|---|---|---|---|---|---|"]
        o += [_line(b) for b in sorted(gg, key=lambda x: x.get("priority") or 999)]
        o += [""]
    (C.ROOT / "REPORT.md").write_text("\n".join(o), encoding="utf-8")
    C.log(f"REPORT.md regenerated: {len(B)} baskets")


if __name__ == "__main__":
    build()
