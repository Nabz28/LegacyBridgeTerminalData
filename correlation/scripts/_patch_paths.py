"""One-shot path migrator for the correlation ETL scripts.

Old layout: every script computed `ROOT = parents[1]` (== correlation/) and
read from `ROOT/data/...` and `ROOT/correlation.db`. After the repo restructure
the data store lives outside the repo. This script rewrites the path constants
in-place to import from `_paths.py` instead.

Idempotent — running it twice does nothing on already-migrated files.

Run once from correlation/scripts/:
    python _patch_paths.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKIP = {"_paths.py", "_patch_paths.py", "correlation_engine.py", "db.py"}

INJECT_BEFORE = "ROOT = Path(__file__).resolve().parents[1]"
INJECT_SNIPPET = (
    "import sys as _sys\n"
    "_sys.path.insert(0, str(Path(__file__).resolve().parent))\n"
    "from _paths import DATA_ROOT, DB_PATH  # external data-store paths\n"
)


def migrate(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "from _paths import" in text:
        return False  # already migrated
    if INJECT_BEFORE not in text:
        return False  # script doesn't follow the canonical pattern; skip

    new_text = text.replace(
        INJECT_BEFORE,
        INJECT_SNIPPET + INJECT_BEFORE,
        1,
    )
    # ROOT / "data" → DATA_ROOT
    new_text = re.sub(r'ROOT\s*/\s*"data"', "DATA_ROOT", new_text)
    new_text = re.sub(r"ROOT\s*/\s*'data'", "DATA_ROOT", new_text)
    # ROOT / "correlation.db" → DB_PATH
    new_text = re.sub(r'ROOT\s*/\s*"correlation\.db"', "DB_PATH", new_text)
    new_text = re.sub(r"ROOT\s*/\s*'correlation\.db'", "DB_PATH", new_text)

    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8")
    return True


def main() -> int:
    changed = 0
    for path in sorted(HERE.glob("*.py")):
        if path.name in SKIP:
            continue
        if migrate(path):
            changed += 1
            print(f"  patched {path.name}")
    print(f"done — {changed} file(s) migrated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
