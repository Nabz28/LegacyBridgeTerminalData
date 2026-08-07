"""Resolve the local data root, and refuse to write heavy packs into the repository.

These scripts previously resolved their output directory from their own location. That was safe
while they lived beside the data; once they were versioned into the repo it silently pointed at
`pipeline/research_local/`, so a single run would have written ~36MB of archive packs into git —
breaking the standing rule that heavy data stays local and only conclusions reach the repo,
Supabase and the terminal.

Resolution order:
  1. $LBC_RESEARCH_DATA
  2. the default path below
Either way, if the resolved directory sits inside a git working tree, we stop.
"""
from __future__ import annotations

import os
from pathlib import Path

DEFAULT = Path("C:/Users/LENOVO/Downloads/Claude Repository #2/Projects/LBC Research/data")


def _in_git_worktree(p: Path) -> Path | None:
    """Return the repo root if p sits inside a git working tree, else None."""
    for parent in [p, *p.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def data_dir(create: bool = True) -> Path:
    raw = os.environ.get("LBC_RESEARCH_DATA")
    p = Path(raw).expanduser() if raw else DEFAULT
    p = p.resolve()

    repo = _in_git_worktree(p)
    if repo is not None:
        raise SystemExit(
            f"refusing to use {p}\n"
            f"  it sits inside the git working tree at {repo}\n"
            f"  heavy research data must stay OUT of the repository: only conclusions go to git,\n"
            f"  Supabase and the terminal. Set LBC_RESEARCH_DATA to a path outside any repo,\n"
            f"  e.g.  LBC_RESEARCH_DATA='{DEFAULT}'")

    if create:
        p.mkdir(parents=True, exist_ok=True)
    elif not p.exists():
        raise SystemExit(f"data dir does not exist: {p}\n  set LBC_RESEARCH_DATA to point at it")
    return p
