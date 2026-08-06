"""Seed the research system: series registry, 23 desks, drivers, instruments, config.

Idempotent: UPSERTs everywhere. Run after any change to registry.py / desks.py.
    python pipeline/seed.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lbc import db
from lbc.desks import DESKS, all_tickers
from lbc.registry import seed_rows


def main():
    n = db.upsert("mkt", "series", seed_rows(), on_conflict="key")
    print(f"mkt.series: {n}")

    desk_rows = [
        {k: d[k] for k in ("id", "name", "basket", "kind", "tickers", "benchmark", "template_ids", "sort_order")}
        for d in DESKS
    ]
    n = db.upsert("research", "desk", desk_rows, on_conflict="id")
    print(f"research.desk: {n}")

    driver_rows = []
    for d in DESKS:
        for (series_key, label, direction, weight, shared) in d["drivers"]:
            driver_rows.append({
                "desk_id": d["id"], "series_key": series_key, "label": label,
                "direction": direction, "weight": weight, "shared_factor": shared,
            })
    n = db.upsert("research", "driver", driver_rows, on_conflict="desk_id,series_key")
    print(f"research.driver: {n}")

    inst_rows = [
        {"ticker": t, "desk_id": desk_id, "active": True}
        for t, desk_id in sorted(all_tickers().items())
    ]
    n = db.upsert("mkt", "instrument", inst_rows, on_conflict="ticker")
    print(f"mkt.instrument: {n}")

    defaults = {
        "enabled": True,
        "telegram_push": {"chat_ids": [], "note": "empty until verified; set via terminal or bot"},
        "models": {"desk_agent": "anthropic/claude-haiku-4.5",
                   "editor": "anthropic/claude-sonnet-4.5",
                   "adversary": "anthropic/claude-sonnet-4.5",
                   "bot": "anthropic/claude-sonnet-4.5"},
        "brief_caps": {"changed": 5, "decide": 2, "blind": 1},
        "sizing_rules": {"max_single_pct": 40, "min_positions": 3, "cut_loss_pct": -20},
        "graveyard_rule": {"min_n": 20, "hit_rate_below": 0.45},
    }
    for k, v in defaults.items():
        if db.get_config(k) is None:
            db.set_config(k, v)
    print("config defaults ensured")


if __name__ == "__main__":
    main()
