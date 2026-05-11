"""Correlation Matrix Terminal — Flask app.

Single-process server. Loads all returns/correlation parquets into memory at
startup, exports static JSON catalogs and per-template precomputed matrices
on first run, and serves a vanilla HTML/JS single-page app.

Run: python correlation/ui/backend/app.py
Port: 5174
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, str(Path(__file__).resolve().parent))

from correlation_subset import (  # noqa: E402
    diff_corr, mp_denoise, pair_stats, rolling_pair, subset_corr,
)
from data_loader import DataStore  # noqa: E402
from pca import pca_from_corr  # noqa: E402
from regimes import REGIMES, TYPE_COLORS  # noqa: E402
from templates_data import TEMPLATES, filter_template_ids  # noqa: E402

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
log = logging.getLogger("corr-ui")

BACKEND_DIR = Path(__file__).resolve().parent
UI_DIR = BACKEND_DIR.parent
STATIC_DIR = UI_DIR / "static"
DATA_OUT = STATIC_DIR / "data"
MATRIX_OUT = DATA_OUT / "matrices"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")


@app.after_request
def _allow_cors(resp):
    # Localhost-only tool. The Legacy Bridge launcher runs on :4173 and probes
    # this backend cross-origin to detect availability.
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.get("/api/health")
def _health():
    return {"ok": True, "series": int(len(store.returns_w.columns))}


log.info("Loading data store...")
_t0 = time.time()
store = DataStore()
log.info(
    "Loaded: returns_w=%s returns_m=%s pearson_w=%s in %.2fs",
    store.returns_w.shape, store.returns_m.shape, store.pearson_full_w.shape, time.time() - _t0,
)

AVAILABLE_IDS = store.available_ids()


def _build_static_exports() -> None:
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    MATRIX_OUT.mkdir(parents=True, exist_ok=True)

    series_meta = []
    for s in store.universe["series"]:
        series_meta.append({
            "id": s["id"],
            "name": s["name"],
            "cat": s["cat"],
            "sub": s.get("sub", ""),
            "ret": s.get("ret", "log"),
            "available": s["id"] in AVAILABLE_IDS,
        })
    (DATA_OUT / "series_meta.json").write_text(json.dumps(series_meta, separators=(",", ":")))

    (DATA_OUT / "cluster_order.json").write_text(json.dumps(store.cluster_order_w, separators=(",", ":")))

    # Regimes are static — write them so frontend can read without a roundtrip.
    (DATA_OUT / "regimes.json").write_text(json.dumps(
        {"regimes": REGIMES, "colors": TYPE_COLORS}, separators=(",", ":")
    ))

    # Pre-export each template matrix.
    for name in TEMPLATES:
        out = MATRIX_OUT / f"{name}.json"
        kept, skipped = filter_template_ids(name, AVAILABLE_IDS)
        if skipped:
            log.info("template %-20s skipped %d ids: %s", name, len(skipped), skipped)
        spec = TEMPLATES[name]
        freq = spec["freq"]
        method = spec["method"]
        corr, n_obs, date_range = subset_corr(store.returns(freq), kept, method=method)
        names = [store.series_by_id[sid]["name"] for sid in kept]
        cats = [store.series_by_id[sid]["cat"] for sid in kept]
        payload = {
            "name": name,
            "display": spec["display"],
            "ids": kept,
            "names": names,
            "cats": cats,
            "matrix": corr.values.tolist(),
            "freq": freq,
            "method": method,
            "n_obs": n_obs,
            "date_range": list(date_range),
        }
        out.write_text(json.dumps(payload, separators=(",", ":")))


_build_static_exports()


# -- API endpoints ------------------------------------------------------------

@app.route("/")
def root():
    return send_from_directory(str(STATIC_DIR), "index.html")


@app.route("/api/series")
def api_series():
    out = []
    for s in store.universe["series"]:
        out.append({
            "id": s["id"],
            "name": s["name"],
            "cat": s["cat"],
            "sub": s.get("sub", ""),
            "ret": s.get("ret", "log"),
            "available": s["id"] in AVAILABLE_IDS,
        })
    return jsonify(out)


@app.route("/api/template/<name>")
def api_template(name: str):
    if name not in TEMPLATES:
        return jsonify({"error": f"unknown template: {name}"}), 404
    cached = MATRIX_OUT / f"{name}.json"
    if cached.exists():
        return app.response_class(cached.read_text(encoding="utf-8"), mimetype="application/json")
    kept, _ = filter_template_ids(name, AVAILABLE_IDS)
    spec = TEMPLATES[name]
    corr, n_obs, date_range = subset_corr(store.returns(spec["freq"]), kept, method=spec["method"])
    return jsonify({
        "name": name, "display": spec["display"],
        "ids": kept,
        "names": [store.series_by_id[sid]["name"] for sid in kept],
        "cats": [store.series_by_id[sid]["cat"] for sid in kept],
        "matrix": corr.values.tolist(),
        "freq": spec["freq"], "method": spec["method"],
        "n_obs": n_obs, "date_range": list(date_range),
    })


@app.route("/api/compute_subset", methods=["POST"])
def api_compute_subset():
    body = request.get_json(force=True, silent=True) or {}
    ids = body.get("ids") or []
    freq = body.get("freq", "w")
    method = body.get("method", "pearson")
    start = body.get("start_date") or None
    end = body.get("end_date") or None
    denoise = bool(body.get("denoise", False))
    diff_window_days = body.get("diff_window_days")  # int days back for baseline

    if freq not in ("w", "m"):
        return jsonify({"error": "freq must be 'w' or 'm'"}), 400
    if method not in ("pearson", "spearman"):
        return jsonify({"error": "method must be 'pearson' or 'spearman'"}), 400

    valid = [sid for sid in ids if sid in store.returns(freq).columns]
    if not valid:
        return jsonify({"error": "no valid ids"}), 400

    corr, n_obs, date_range = subset_corr(
        store.returns(freq), valid, method=method, start_date=start, end_date=end,
    )
    if denoise and not corr.empty:
        corr = mp_denoise(corr, n_obs)

    diff_meta = None
    if diff_window_days and not corr.empty:
        # Compare current window to one of equal length ending diff_window_days earlier.
        import pandas as pd
        end_ts = pd.Timestamp(date_range[1]) if date_range[1] else store.returns(freq).index.max()
        start_ts = pd.Timestamp(date_range[0]) if date_range[0] else store.returns(freq).index.min()
        win = (end_ts - start_ts).days or 365
        baseline_end = end_ts - pd.Timedelta(days=int(diff_window_days))
        baseline_start = baseline_end - pd.Timedelta(days=win)
        baseline_corr, b_n, b_dr = subset_corr(
            store.returns(freq), valid, method=method,
            start_date=baseline_start.strftime("%Y-%m-%d"),
            end_date=baseline_end.strftime("%Y-%m-%d"),
        )
        if denoise and not baseline_corr.empty:
            baseline_corr = mp_denoise(baseline_corr, b_n)
        delta = diff_corr(corr, baseline_corr)
        diff_meta = {
            "baseline_range": [baseline_start.strftime("%Y-%m-%d"), baseline_end.strftime("%Y-%m-%d")],
            "baseline_n": b_n,
            "matrix": delta.values.tolist(),
        }

    return jsonify({
        "ids": valid,
        "names": [store.series_by_id[sid]["name"] for sid in valid if sid in store.series_by_id],
        "cats": [store.series_by_id[sid]["cat"] for sid in valid if sid in store.series_by_id],
        "matrix": corr.values.tolist(),
        "freq": freq, "method": method,
        "n_obs": n_obs, "date_range": list(date_range),
        "denoise": denoise,
        "diff": diff_meta,
    })


@app.route("/api/pca", methods=["POST"])
def api_pca():
    body = request.get_json(force=True, silent=True) or {}
    ids = body.get("ids") or []
    freq = body.get("freq", "w")
    method = body.get("method", "pearson")
    start = body.get("start_date") or None
    end = body.get("end_date") or None
    top_k = int(body.get("top_k", 5))

    valid = [sid for sid in ids if sid in store.returns(freq).columns]
    if len(valid) < 2:
        return jsonify({"error": "need ≥2 valid ids"}), 400

    corr, n_obs, _ = subset_corr(
        store.returns(freq), valid, method=method, start_date=start, end_date=end,
    )
    names = [store.series_by_id[sid]["name"] for sid in valid]
    cats = [store.series_by_id[sid]["cat"] for sid in valid]
    return jsonify(pca_from_corr(corr, valid, names, cats, top_k=top_k))


@app.route("/api/pair/<path:id_a>/<path:id_b>")
def api_pair(id_a: str, id_b: str):
    freq = request.args.get("freq", "w")
    window_arg = request.args.get("window", "52w")
    start = request.args.get("start_date") or None
    end = request.args.get("end_date") or None
    returns = store.returns(freq)
    stats = pair_stats(returns, id_a, id_b, start_date=start, end_date=end)
    win = _parse_window(window_arg, freq)
    stats["rolling"] = rolling_pair(returns, id_a, id_b, win)
    stats["window"] = window_arg
    stats["names"] = {
        "a": store.series_by_id.get(id_a, {}).get("name", id_a),
        "b": store.series_by_id.get(id_b, {}).get("name", id_b),
    }
    return jsonify(stats)


@app.route("/api/rolling/<path:id_a>/<path:id_b>")
def api_rolling(id_a: str, id_b: str):
    freq = request.args.get("freq", "w")
    window_arg = request.args.get("window", "52w")
    win = _parse_window(window_arg, freq)
    return jsonify(rolling_pair(store.returns(freq), id_a, id_b, win))


@app.route("/api/regimes")
def api_regimes():
    return jsonify({"regimes": REGIMES, "colors": TYPE_COLORS})


@app.route("/api/dates")
def api_dates():
    """Return the available date range and a sampled list of dates for the slider."""
    freq = request.args.get("freq", "w")
    idx = store.returns(freq).index
    return jsonify({
        "start": idx.min().strftime("%Y-%m-%d"),
        "end":   idx.max().strftime("%Y-%m-%d"),
        "n":     int(len(idx)),
    })


def _parse_window(arg: str, freq: str) -> int:
    if not arg:
        return 52 if freq == "w" else 36
    arg = arg.lower().strip()
    if arg.endswith("w") or arg.endswith("m"):
        try:
            return int(arg[:-1])
        except ValueError:
            pass
    try:
        return int(arg)
    except ValueError:
        return 52 if freq == "w" else 36


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5174, debug=False, threaded=True)
