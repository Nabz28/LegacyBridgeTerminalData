"""Rewrite the correlation matrix parquets at float32 + ZSTD level 3.

Why
---
The original `correlation_engine.py` wrote correlation matrices as float64 +
SNAPPY. Correlation values are bounded `[-1, 1]` and the random-looking lower
bits of float64 don't compress, so SNAPPY barely helps. Casting to float32 and
switching to ZSTD-3 gives ~3-5x smaller files with no perceptible UX impact
(float32 keeps ~7 sig figs, vastly more precision than charts can show).

What it does
------------
- Reads every `*.parquet` in `<DATA_STORE>/correlation/matrices/`.
- Writes the recompressed version into
  `<DATA_STORE>/correlation/matrices_optimized/` for side-by-side comparison.
- Prints a before/after size table.
- Skips files whose name starts with `rolling_pearson_` — those are obsolete
  (computed on demand now) and should just be deleted.

When you're satisfied with the optimized files:
    rm <DATA_STORE>/correlation/matrices/*.parquet
    mv <DATA_STORE>/correlation/matrices_optimized/* <DATA_STORE>/correlation/matrices/
    rmdir <DATA_STORE>/correlation/matrices_optimized

Run from repo root:
    python scripts/optimize_matrices.py
    python scripts/optimize_matrices.py --in-place      # replace originals
    python scripts/optimize_matrices.py --drop-rolling  # delete obsolete rolling matrices
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

REPO_ROOT = Path(__file__).resolve().parent.parent
log = logging.getLogger("optimize")


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


def _human_mb(n_bytes: int) -> str:
    return f"{n_bytes / (1024 * 1024):,.1f} MB"


def optimize_one(src: Path, dest: Path) -> tuple[int, int]:
    """Read with pandas (so the index round-trips), cast floats, write with ZSTD-3.

    Why pandas instead of pyarrow.Table directly: a previous version of this
    script used the pyarrow API, which silently drops the pandas index metadata
    and re-materializes the original index as a string column named
    `__index_level_0__`. That broke `data_loader.py`'s `.astype("float64")`
    call. pd.read_parquet / df.to_parquet preserves the index metadata
    correctly.
    """
    df = pd.read_parquet(src)
    # Defensive: if a previous round-trip left a stray index column, restore it.
    if "__index_level_0__" in df.columns:
        df = df.set_index("__index_level_0__")
        df.index.name = None

    df_f32 = df.astype("float32")
    dest.parent.mkdir(parents=True, exist_ok=True)
    df_f32.to_parquet(
        dest,
        compression="zstd",
        compression_level=9,   # static data, written once — push harder
        index=True,
    )
    return src.stat().st_size, dest.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--in-place", action="store_true",
                        help="overwrite the originals in matrices/ instead of writing to matrices_optimized/")
    parser.add_argument("--drop-rolling", action="store_true",
                        help="also delete the obsolete rolling_pearson_*.parquet files")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    matrices_dir = _data_store_root() / "correlation" / "matrices"
    if not matrices_dir.is_dir():
        log.error("matrices dir not found at %s", matrices_dir)
        return 1

    out_dir = matrices_dir if args.in_place else matrices_dir.parent / "matrices_optimized"
    out_dir.mkdir(parents=True, exist_ok=True)

    parquets = [p for p in sorted(matrices_dir.iterdir()) if p.suffix == ".parquet"]
    rolling = [p for p in parquets if p.name.startswith("rolling_pearson_")]
    keep = [p for p in parquets if not p.name.startswith("rolling_pearson_")]

    log.info("matrices dir: %s", matrices_dir)
    log.info("output dir:   %s", out_dir)
    log.info("found %d parquet files (%d static, %d rolling)", len(parquets), len(keep), len(rolling))

    total_old = total_new = 0
    print(f"\n  {'file':<45} {'before':>14}   {'after':>14}   ratio")
    print(f"  {'-' * 45} {'-' * 14}   {'-' * 14}   -----")
    for src in keep:
        dest = out_dir / src.name
        if args.in_place and src == dest:
            # write to temp then rename
            tmp = dest.with_suffix(".parquet.tmp")
            old_size, new_size = optimize_one(src, tmp)
            tmp.replace(dest)
        else:
            old_size, new_size = optimize_one(src, dest)
        total_old += old_size
        total_new += new_size
        ratio = old_size / new_size if new_size else 0
        print(f"  {src.name:<45} {_human_mb(old_size):>14}   {_human_mb(new_size):>14}   {ratio:>4.1f}x")

    if rolling:
        rolling_size = sum(p.stat().st_size for p in rolling)
        print(f"\n  rolling_pearson_*.parquet (obsolete — computed on demand): {len(rolling)} files, {_human_mb(rolling_size)}")
        if args.drop_rolling:
            for p in rolling:
                p.unlink()
                log.info("deleted %s", p.name)
        else:
            print(f"  (re-run with --drop-rolling to delete them)")
            total_old += rolling_size  # count them in the "before" total

    if total_old:
        savings = total_old - total_new
        pct = 100 * savings / total_old
        print(f"\n  TOTAL  {_human_mb(total_old)} -> {_human_mb(total_new)}   ({_human_mb(savings)} saved, {pct:.0f}%)")

    if not args.in_place:
        print(f"\n  Recompressed files in {out_dir}")
        print(f"  To promote them:")
        print(f"    rm \"{matrices_dir}\"/*.parquet")
        print(f"    mv \"{out_dir}\"/* \"{matrices_dir}\"/")
        print(f"    rmdir \"{out_dir}\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
