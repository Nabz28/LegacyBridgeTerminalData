"""Shared path resolution for the correlation pipeline.

Every script in this folder used to assume `data/` lived next to it
(`Path(__file__).parents[1] / "data"`). After the repo restructure, the
data store lives outside the repo. This module is the single source of
truth — all scripts import these constants instead of recomputing paths.

Layout (resolves DATA_STORE_PATH from `.env` at repo root, falls back to
`../data-store`):

    <DATA_STORE_PATH>/correlation/
        correlation.sqlite                          DB_PATH
        raw/{staging,weekly,monthly}/...            RAW_DIR
        returns/{weekly,monthly}_returns.parquet    RET_DIR
        matrices/*.parquet                          MATRICES_DIR

In-repo (curation, source-controlled):

    correlation/catalog/universe.json               CATALOG_DIR
"""
from __future__ import annotations

import os
from pathlib import Path

# This file: correlation/scripts/_paths.py
REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))


def _data_store_root() -> Path:
    _load_dotenv()
    raw = os.environ.get("DATA_STORE_PATH", "../data-store")
    p = Path(raw)
    return p if p.is_absolute() else (REPO_ROOT / raw).resolve()


DATA_STORE = _data_store_root()
DATA_ROOT = DATA_STORE / "correlation"

DB_PATH = DATA_ROOT / "correlation.sqlite"
RAW_DIR = DATA_ROOT / "raw"
RAW_W = RAW_DIR / "weekly"
RAW_M = RAW_DIR / "monthly"
RAW_STAGING = RAW_DIR / "staging"
RET_DIR = DATA_ROOT / "returns"
MATRICES_DIR = DATA_ROOT / "matrices"

CATALOG_DIR = REPO_ROOT / "correlation" / "catalog"

# Back-compat alias used by older scripts that did `ROOT = parents[1]; DATA = ROOT / "data"`.
ROOT = REPO_ROOT / "correlation"
DATA = DATA_ROOT
