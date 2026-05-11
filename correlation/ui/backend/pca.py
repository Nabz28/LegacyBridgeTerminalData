"""PCA / eigenvalue decomposition for the current correlation matrix.

Uses the correlation matrix directly (not raw returns) so it stays cheap
even on 100+ series — eigh on a 100x100 matrix is sub-millisecond.
"""

from __future__ import annotations

from typing import Sequence

import numpy as np
import pandas as pd


def pca_from_corr(
    corr: pd.DataFrame,
    ids: Sequence[str],
    names: Sequence[str],
    cats: Sequence[str],
    top_k: int = 5,
) -> dict:
    """Eigendecompose the correlation matrix; return top-K factors with loadings."""
    if corr.empty or corr.shape[0] < 2:
        return {"factors": [], "explained": [], "cumulative": []}

    M = corr.values.astype(float)
    # Symmetrize defensively (pandas corr can have tiny asymmetry from NaN-fill).
    M = 0.5 * (M + M.T)
    # eigh returns ascending — reverse for descending.
    w, V = np.linalg.eigh(M)
    order = np.argsort(w)[::-1]
    w = w[order]
    V = V[:, order]

    total = float(np.sum(np.abs(w)))
    explained = (w / total).tolist() if total > 0 else [0.0] * len(w)

    k = min(top_k, len(w))
    factors = []
    cumulative = []
    cum = 0.0
    for i in range(k):
        loading = V[:, i]
        # Sign-fix: largest absolute loading should be positive (deterministic).
        max_idx = int(np.argmax(np.abs(loading)))
        if loading[max_idx] < 0:
            loading = -loading
        # Build sorted top contributors for the factor narrative.
        contribs = [
            {"id": ids[j], "name": names[j], "cat": cats[j], "weight": float(loading[j])}
            for j in range(len(ids))
        ]
        contribs.sort(key=lambda r: abs(r["weight"]), reverse=True)
        cum += explained[i]
        cumulative.append(cum)
        factors.append({
            "k": i + 1,
            "eigenvalue": float(w[i]),
            "explained": explained[i],
            "cumulative": cum,
            "loadings": [float(x) for x in loading.tolist()],
            "top_long":  [c for c in contribs if c["weight"] > 0][:8],
            "top_short": [c for c in contribs if c["weight"] < 0][:8],
        })
    return {
        "n": len(ids),
        "factors": factors,
        "all_eigenvalues": [float(x) for x in w.tolist()],
        "all_explained": explained,
    }
