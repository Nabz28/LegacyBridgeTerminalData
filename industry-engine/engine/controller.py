"""
controller.py — the autonomous loop body. ONE bounded unit of work per call:

  pick next basket (depth-first by priority) -> run full pipeline -> grade
  (verify) -> persist (engine.json + JS) -> checkpoint state/progress.json ->
  commit. Designed so every cron fire is small, idempotent, and self-recovering:
  if a fire dies mid-way (token reset, crash), the next fire resumes from the
  committed/on-disk progress with no lost work.

Usage:
  python controller.py            # advance the next basket once
  python controller.py --n 3      # advance up to 3 baskets
  python controller.py --only Coal
  python controller.py --status   # print progress summary, do nothing
  python controller.py --recompile # rebuild engine.json/JS from existing artifacts

Grades that STOP a basket from re-running: perfected, partial, blocked.
needs_review re-runs up to MAX_ATTEMPTS, then is parked as 'partial' for the
agent to refine (mapping/driver tuning) on a later fire.
"""
from __future__ import annotations

import subprocess
import sys
import time

import common as C
import run_basket as RB
import verify as V
import persist as P

PROGRESS = C.STATE_DIR / "progress.json"
MAX_ATTEMPTS = 2
STOP_GRADES = {"perfected", "partial", "blocked"}
WORKTREE = str(C.ROOT.parent)   # repo/worktree root


# --------------------------------------------------------------------------- #
def _init_progress() -> dict:
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    if not wl:
        raise SystemExit("worklist.json missing — run build_worklist.py first")
    baskets = {}
    for b in wl["baskets"]:
        baskets[b["id"]] = {
            "id": b["id"], "sub_sector": b["sub_sector"], "sector": b["sector"],
            "priority": b["priority"], "status": "pending", "grade": None,
            "score": None, "verdict": None, "attempts": 0, "last_run": None,
            "reasons": [],
        }
    return {"started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "updated_at": None, "n_baskets": len(baskets),
            "version": 1, "baskets": baskets}


def _load_progress() -> dict:
    pg = C.read_json(PROGRESS)
    if not pg:
        pg = _init_progress()
        C.write_json(PROGRESS, pg)
    else:
        # reconcile with worklist (new baskets appear as pending)
        wl = C.read_json(C.STATE_DIR / "worklist.json")
        for b in (wl or {}).get("baskets", []):
            if b["id"] not in pg["baskets"]:
                pg["baskets"][b["id"]] = {
                    "id": b["id"], "sub_sector": b["sub_sector"],
                    "sector": b["sector"], "priority": b["priority"],
                    "status": "pending", "grade": None, "score": None,
                    "verdict": None, "attempts": 0, "last_run": None, "reasons": []}
    return pg


def _summary(pg: dict) -> dict:
    s = {"perfected": 0, "partial": 0, "needs_review": 0, "blocked": 0,
         "pending": 0, "error": 0}
    for st in pg["baskets"].values():
        g = st.get("grade")
        if st["status"] == "pending":
            s["pending"] += 1
        elif g in s:
            s[g] += 1
        else:
            s[st["status"]] = s.get(st["status"], 0) + 1
    return s


def _next_basket(pg: dict) -> dict | None:
    """Next PENDING basket by priority. needs_review baskets are NOT auto-retried
    here — they require deliberate enrichment via --only (see RUN.md DEPTH mode),
    so a plain `--n` fire can never silently park a basket as 'partial'."""
    items = sorted(pg["baskets"].values(), key=lambda x: x["priority"])
    for st in items:
        if st["status"] == "pending":
            return st
    return None


def _next_enrich(pg: dict) -> dict | None:
    """Highest-priority needs_review basket still under the attempt cap."""
    items = sorted(pg["baskets"].values(), key=lambda x: x["priority"])
    for st in items:
        if st["grade"] == "needs_review" and st["attempts"] < MAX_ATTEMPTS:
            return st
    return None


def _git_commit(msg: str) -> str:
    try:
        subprocess.run(["git", "-C", WORKTREE, "add",
                        "industry-engine/output", "industry-engine/state",
                        "launcher/scripts/industry-engine-data.js"],
                       check=False, capture_output=True, timeout=60)
        r = subprocess.run(["git", "-C", WORKTREE, "commit", "-m", msg],
                           capture_output=True, text=True, timeout=120)
        if r.returncode == 0:
            return "committed"
        if "nothing to commit" in (r.stdout + r.stderr).lower():
            return "nothing-to-commit"
        return f"commit-failed: {(r.stdout + r.stderr)[:200]}"
    except Exception as e:  # noqa: BLE001
        return f"commit-error: {e}"


def advance_one(pg: dict, only: str | None = None) -> dict | None:
    if only:
        st = next((s for s in pg["baskets"].values()
                   if s["sub_sector"].lower() == only.lower()), None)
    else:
        st = _next_basket(pg)
    if not st:
        return None
    bdef = RB.find_basket(f"id={st['id']}")
    st["attempts"] += 1
    st["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    try:
        art = RB.run(bdef)
        gr = V.grade(art)
        art["grade"] = gr["grade"]
        art["grade_reasons"] = gr["reasons"]
        C.write_json(C.OUTPUT_DIR / f"{art['id']}.json", art)
        st["grade"] = gr["grade"]
        st["reasons"] = gr["reasons"]
        m = art.get("model") or {}
        st["score"] = m.get("score")
        st["verdict"] = m.get("verdict")
        st["status"] = "done" if gr["grade"] in STOP_GRADES else "needs_review"
        if gr["grade"] == "needs_review" and st["attempts"] >= MAX_ATTEMPTS:
            st["status"] = "done"
            st["grade"] = "partial"
            st["reasons"] = gr["reasons"] + [f"parked after {st['attempts']} attempts"]
            # keep the artifact (terminal-facing) grade consistent with state
            art["grade"] = "partial"
            art["grade_reasons"] = st["reasons"]
            C.write_json(C.OUTPUT_DIR / f"{art['id']}.json", art)
    except Exception as e:  # noqa: BLE001
        st["status"] = "error"
        st["grade"] = "error"
        st["reasons"] = [str(e)[:300]]
        C.log(f"  ERROR on {st['sub_sector']}: {e}", level="WARN")
    return st


def rerun_all(pg: dict) -> int:
    """Refresh every resolved basket's model/score (e.g. to propagate a scoring
    change) while PRESERVING the grade decided earlier. One commit at the end."""
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    n = 0
    for b in sorted(wl["baskets"], key=lambda x: x["priority"]):
        st = pg["baskets"].get(b["id"])
        if not st or st["status"] == "pending":
            continue
        try:
            art = RB.run(b)
            art["grade"] = st.get("grade")          # preserve prior grade
            art["grade_reasons"] = st.get("reasons", [])
            C.write_json(C.OUTPUT_DIR / f"{art['id']}.json", art)
            m = art.get("model") or {}
            st["score"] = m.get("score")
            st["verdict"] = m.get("verdict")
            n += 1
        except Exception as e:  # noqa: BLE001
            C.log(f"  rerun ERROR {b['sub_sector']}: {e}", level="WARN")
    pg["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    pg["summary"] = _summary(pg)
    C.write_json(PROGRESS, pg)
    P.compile_engine()
    cm = _git_commit(f"chore(industry-engine): full-book rerun — refresh {n} models "
                     f"(propagate conviction-shrinkage), grades preserved")
    C.log(f"  rerun_all: {n} baskets, commit: {cm}")
    return n


def regrade_all(pg: dict) -> dict:
    """Re-run AND re-grade every basket fresh (for a methodology change). Resets
    attempts, applies verify.grade to the new artifact, one commit at the end."""
    wl = C.read_json(C.STATE_DIR / "worklist.json")
    for b in sorted(wl["baskets"], key=lambda x: x["priority"]):
        st = pg["baskets"].get(b["id"])
        if not st:
            continue
        try:
            art = RB.run(b)
            gr = V.grade(art)
            art["grade"] = gr["grade"]
            art["grade_reasons"] = gr["reasons"]
            C.write_json(C.OUTPUT_DIR / f"{art['id']}.json", art)
            m = art.get("model") or {}
            st.update(status="done", grade=gr["grade"], reasons=gr["reasons"],
                      score=m.get("score"), verdict=m.get("verdict"), attempts=1,
                      last_run=time.strftime("%Y-%m-%dT%H:%M:%S"))
        except Exception as e:  # noqa: BLE001
            st.update(status="error", grade="error", reasons=[str(e)[:200]])
            C.log(f"  regrade ERROR {b['sub_sector']}: {e}", level="WARN")
    pg["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    pg["summary"] = _summary(pg)
    C.write_json(PROGRESS, pg)
    P.compile_engine()
    return pg["summary"]


def main(argv: list) -> None:
    pg = _load_progress()
    if "--status" in argv:
        print(_status_text(pg))
        return
    if "--regrade-all" in argv:
        s = regrade_all(pg)
        print(_status_text(pg))
        print("regraded all baskets:", s)
        return
    if "--recompile" in argv:
        eng = P.compile_engine()
        print(f"recompiled engine.json: {eng['n_baskets']} baskets")
        return
    if "--rerun-all" in argv:
        n = rerun_all(pg)
        print(_status_text(pg))
        print(f"\nrefreshed {n} basket models (grades preserved).")
        return
    only = None
    if "--only" in argv:
        only = argv[argv.index("--only") + 1]
    n = 1
    if "--n" in argv:
        n = int(argv[argv.index("--n") + 1])

    done = []
    for _ in range(n):
        st = advance_one(pg, only=only)
        if not st:
            break
        pg["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        pg["summary"] = _summary(pg)
        C.write_json(PROGRESS, pg)
        P.compile_engine()
        msg = (f"feat(industry-engine): {st['sub_sector']} -> {st.get('grade')} "
               f"({st.get('verdict')} {st.get('score')}/100) "
               f"[{pg['summary']['perfected']}+{pg['summary']['partial']}/"
               f"{pg['n_baskets']}]")
        cm = _git_commit(msg)
        C.log(f"  commit: {cm}")
        done.append(st)
        if only:
            break

    print(_status_text(pg))
    if done:
        print("\nADVANCED THIS RUN:")
        for st in done:
            print(f"  {st['sub_sector']:22s} -> {st.get('grade'):12s} "
                  f"{st.get('verdict') or ''} {st.get('score') or ''} "
                  f"| {('; '.join(st['reasons']))[:80]}")
    nxt = _next_basket(pg)
    if nxt:
        print(f"\nNEXT (breadth, pending): {nxt['sub_sector']} (prio {nxt['priority']})")
    else:
        enr = _next_enrich(pg)
        if enr:
            print(f"\nNEXT (DEPTH/enrich a needs_review basket per RUN.md): "
                  f"{enr['sub_sector']} (prio {enr['priority']})")
        else:
            print("\nNEXT: all baskets resolved -> FINALISATION mode (see RUN.md)")


def _status_text(pg: dict) -> str:
    s = _summary(pg)
    total = pg["n_baskets"]
    done = s["perfected"] + s["partial"] + s["blocked"]
    lines = [f"INDUSTRY ENGINE PROGRESS  ({done}/{total} resolved)",
             f"  perfected={s['perfected']} partial={s['partial']} "
             f"needs_review={s['needs_review']} blocked={s['blocked']} "
             f"pending={s['pending']} error={s.get('error',0)}"]
    return "\n".join(lines)


if __name__ == "__main__":
    main(sys.argv[1:])
