"""Job entry points for GitHub Actions.

    python pipeline/jobs.py <job> [--full]

Jobs: ingest_us, ingest_asia, nightly, weekly, monthly, alerts, freshness, backfill
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lbc import db, fresh
from lbc.desks import all_tickers


def ingest_us(full: bool = False):
    from lbc.ingest import yahoo, dbnomics, bls

    fresh.guarded("ingest_yahoo_series")(yahoo.run_series)(full=full)
    fresh.guarded("ingest_dbnomics")(dbnomics.run)(full=True)
    fresh.guarded("ingest_bls")(bls.run)()
    tickers = yahoo.western_tickers(all_tickers())
    tickers += [t for t in _position_tickers() if not t.endswith(".JK") and t not in tickers]
    fresh.guarded("ingest_prices_us")(yahoo.run_prices)(tickers, full=full)


def _position_tickers() -> list[str]:
    """Open-position tickers (yahoo convention) so the book is always priced,
    even for names outside any desk basket."""
    try:
        rows = db.select("asset_mgmt", "positions", "select=symbol,exchange&status=eq.open")
    except Exception:
        return []
    out = []
    for r in rows:
        t = r["symbol"]
        if (r.get("exchange") or "").upper() == "IDX" and not t.endswith(".JK"):
            t = f"{t}.JK"
        out.append(t)
    return out


def ingest_asia(full: bool = False):
    from lbc.ingest import yahoo, idxflow

    tickers = yahoo.asia_tickers(all_tickers())
    tickers += [t for t in _position_tickers() if t.endswith(".JK") and t not in tickers]
    fresh.guarded("ingest_prices_asia")(yahoo.run_prices)(tickers, full=full)
    # IDX flows are attempted here too, but Cloudflare 403s datacenter IPs; the
    # authoritative run is the local one. Failure here must not fail the job.
    try:
        fresh.guarded("ingest_idx_flow")(idxflow.run)(days_back=30 if full else 7)
    except Exception as e:
        print(f"idx flow unavailable from this host (expected in CI): {e}")


def nightly():
    from lbc.compute import dials, signals, book, derived, sentiment, screens, calendar
    from lbc.reason import desk_agent, editor
    from lbc.push import brief
    from lbc.audit import score
    from lbc.ingest import cb_statements, edgar, news, names, archive

    today = dt.date.today().isoformat()

    # Ingest steps are individually guarded: one blocked source must not stop
    # the night. Failures land on the ops board and in the DATA line of the brief.
    for name, fn in (("ingest_news", news.run), ("ingest_names", names.run),
                     ("ingest_archive", archive.run),
                     ("ingest_cb_statements", cb_statements.run), ("ingest_edgar", edgar.run)):
        try:
            fresh.guarded(name)(fn)()
        except Exception:
            pass
    try:
        fresh.guarded("compute_derived")(derived.run)()
    except Exception:
        pass

    def _compute():
        r1 = dials.run(today)
        n2 = signals.run(today)
        r3 = book.run(today)
        sentiment.run(today)
        calendar.run()
        return r1["signals"] + n2 + r3["signals"]
    fresh.guarded("compute_nightly")(_compute)()
    try:
        fresh.guarded("compute_screens")(screens.run)(today)
    except Exception:
        pass

    def _reason():
        outs = desk_agent.run_all(today)
        ed = editor.run(outs, today)
        db.set_config("editor_latest", {"asof": today, **ed})
        return len(outs)
    fresh.guarded("reason_nightly")(_reason)()

    def _brief():
        ed = db.get_config("editor_latest", {})
        body = brief.render_morning(ed, today)
        res = brief.store_and_push("morning", body, ed, today, push=True)
        print(body)
        return 1 if res else 0
    fresh.guarded("brief_morning")(_brief)()

    def _score():
        n = score.score_signals(today)
        score.update_graveyard()
        return n
    try:
        fresh.guarded("audit_scoring")(_score)()
    except Exception:
        pass


def weekly():
    from lbc.ingest import cot, scrapes
    from lbc.reason import adversary
    from lbc.audit import score
    from lbc.push import brief, telegram

    today = dt.date.today().isoformat()
    fresh.guarded("ingest_cot")(cot.run)(full=False)
    try:
        fresh.guarded("ingest_hba")(scrapes.hba_coal)()
    except Exception:
        pass

    n = adversary.run(today)
    print(f"adversary reviewed {n} theses")

    board = score.scoreboard()
    dials_rows = db.select("research", "dial",
                           "select=desk_id,stance,conviction,machine_score,regime,what_changed"
                           "&order=machine_score.desc")
    theses = db.select("research", "thesis",
                       "select=title,ticker,status,health&status=in.(open,wounded,invalidated)",
                       limit=20)
    cal = db.select("macro", "calendar",
                    f"select=event_date,region,title,importance&event_date=gte.{today}"
                    f"&event_date=lte.{(dt.date.today() + dt.timedelta(days=7)).isoformat()}"
                    f"&importance=eq.high&order=event_date", limit=15)

    lines = [f"LBC WEEKLY IC PACKET · {today}", ""]
    lines.append("DIALS (by machine score)")
    for d in dials_rows[:8] + dials_rows[-4:]:
        ms = d.get("machine_score")
        lines.append(f"  {d['desk_id']:<24} {d['stance']:<3} c{d['conviction']} "
                     f"score {ms if ms is not None else 'n/a'}")
    lines.append("")
    if theses:
        lines.append("THESES")
        for t in theses:
            adv = (t.get("health") or {}).get("adversary", [])
            verdict = adv[-1]["verdict"] if adv else "unreviewed"
            lines.append(f"  {t.get('ticker') or '-':<10} {t['status']:<12} adversary: {verdict} · {t['title'][:50]}")
        lines.append("")
    lines.append("SIGNAL SCOREBOARD (hit rates)")
    for k, v in sorted(board.items()):
        if v["n"] >= 3:
            lines.append(f"  {k:<28} n={v['n']:<4} hit {v['hit_rate']:.0%}" if v["hit_rate"] is not None else f"  {k}: n={v['n']}")
    lines.append("")
    if cal:
        lines.append("WEEK AHEAD (high importance)")
        for c in cal:
            lines.append(f"  {c['event_date']} {c['region']:<8} {c['title'][:60]}")

    body = "\n".join(lines)
    brief.store_and_push("weekly", body, {"scoreboard": board}, today, push=True)
    print(body)


def monthly():
    from lbc.ingest import scrapes
    from lbc.audit import score
    from lbc.reason import llm
    from lbc.push import brief
    import json

    today = dt.date.today().isoformat()
    for name, fn in (("ingest_tsmc", scrapes.tsmc_revenue), ("ingest_hba", scrapes.hba_coal)):
        try:
            fresh.guarded(name)(fn)()
        except Exception:
            pass

    board = score.scoreboard()
    graveyard = db.select("research", "graveyard", "select=*&order=retired_at.desc", limit=20)
    hist = db.select("research", "dial_history",
                     f"select=desk_id,asof,stance,machine_score&asof=gte.{(dt.date.today() - dt.timedelta(days=35)).isoformat()}",
                     limit=None)

    model = llm.get_model("editor")
    system = ("You write the monthly attribution note for a systematic research desk. "
              "Input: signal scoreboard (hit rates by kind), the graveyard, and a month of "
              "dial history. Write <=25 lines of plain text: what worked, what did not, "
              "which signals died, and one process improvement. Cite the numbers given. "
              "No em dashes, no markdown headers.")
    try:
        text, usage = llm.chat(model, system, json.dumps({
            "scoreboard": board, "graveyard": graveyard, "dial_history": hist[-400:],
        }, default=str), max_tokens=1200)
        llm.log("attribution", None, model, usage)
    except Exception as e:
        text = f"Attribution generation failed: {e}. Scoreboard: {json.dumps(board)[:800]}"

    body = f"LBC MONTHLY ATTRIBUTION · {today}\n\n{text}"
    brief.store_and_push("monthly", body, {"scoreboard": board}, today, push=True)
    print(body)


def alerts():
    """Hourly: user level-alerts plus judged pushes on material signals.

    Level alerts are explicit triggers the CRO set; they always fire. The second
    half is the judgement layer: each fresh signal is scored on whether it
    touches an open position, whether it is a change rather than a level, how
    verified it is, and whether something like it was said recently
    (research.push_log). Only what clears the notify bar is sent; interrupt-tier
    sends ring, notify-tier sends are silent notifications; everything else
    stays silent and reaches the morning brief instead.
    """
    from lbc.compute import stats
    from lbc.push import telegram, notify

    rows = db.select("research", "alert", "select=*&active=eq.true")
    fired = 0
    for a in rows:
        target, cond = a["target"], a["condition"]
        is_series = target.startswith(("us.", "cmd.", "fx.", "idx.", "pos.", "news.", "id.", "tw.", "eu.", "crypto."))
        s = stats.load_series(target, days=30) if is_series else stats.load_close(target, days=30)
        if s.empty:
            continue
        last = float(s.iloc[-1])
        op, val = cond.get("op"), float(cond.get("value", 0))
        hit = (op == "gt" and last > val) or (op == "lt" and last < val)
        if hit:
            msg = f"ALERT · {target} {op} {val:g}: now {last:g}" + (f"\n{a.get('note')}" if a.get("note") else "")
            delivered = telegram.send(msg)
            notify.log_push("interrupt", "alert", a["id"], msg.split("\n")[0], delivered,
                            {"target": target, "last": last})
            db.update("research", "alert", f"id=eq.{a['id']}",
                      {"active": False, "last_fired_at": dt.datetime.now(dt.timezone.utc).isoformat()})
            db.insert("research", "alert_fire", [{"alert_id": a["id"], "payload": {"last": last}}])
            fired += 1

    # judged pushes: is any of today's tape worth a message, and how loud
    today = dt.date.today().isoformat()
    cands = db.select("research", "signal",
                      f"select=id,desk_id,kind,ref,headline,salience,payload&asof=eq.{today}"
                      f"&salience=gte.70&retired=eq.false&order=salience.desc", limit=25)
    pushed = db.get_config("pushed_signal_ids", []) or []
    cands = [s for s in cands if s["id"] not in pushed]
    sent = 0
    if cands:
        book_desks, book_tickers = notify.book_exposure()
        recent = notify.recent_pushes(days=3)
        scored = sorted(((s, *notify.score_signal(s, book_desks, book_tickers, recent))
                         for s in cands), key=lambda x: x[1], reverse=True)
        to_push = [x for x in scored if x[2] == "interrupt"]
        if not to_push and scored and scored[0][2] == "notify":
            to_push = [scored[0]]                  # at most one notify-tier item per run
        for sig, score, tier in to_push[:3]:
            head = "LBC ALERT · could not wait" if tier == "interrupt" else "LBC · worth knowing"
            msg = (f"{head}\n\n[{sig['salience']}] {sig['headline']}\n\n"
                   f"Full context in the morning brief, or ask LEGION.")
            delivered = telegram.send(msg, silent=(tier != "interrupt"))
            if delivered:
                notify.log_push(tier, "signal", sig["id"], sig["headline"], delivered,
                                {"desk_id": sig["desk_id"], "signal_kind": sig["kind"],
                                 "score": score})
                pushed = [sig["id"]] + pushed
                sent += 1
        db.set_config("pushed_signal_ids", pushed[:200])
    print(f"alerts fired: {fired}, judged pushes: {sent} of {len(cands)} fresh candidates")


def freshness():
    """The anti-green-lights job.

    Three independent failure modes are checked: a pipeline that stopped
    running, a pipeline that has NEVER succeeded, and a pipeline that runs
    happily while the data behind it stopped moving.
    """
    from lbc.push import telegram

    now = dt.datetime.now(dt.timezone.utc)
    rows = db.select("research", "ops_freshness", "select=*")
    problems: list[str] = []

    for r in rows:
        pipeline = r["pipeline"]
        if not r.get("last_success_at"):
            # never succeeded: invisible to a last_success_at-only check
            problems.append(f"{pipeline}: has never succeeded ({r.get('note') or 'no detail'})")
            db.update("research", "ops_freshness", f"pipeline=eq.{pipeline}", {"status": "error"})
            continue
        last = dt.datetime.fromisoformat(r["last_success_at"].replace("Z", "+00:00"))
        hours = (now - last).total_seconds() / 3600
        if hours > r["expect_within_hours"]:
            problems.append(f"{pipeline}: no successful run for {round(hours)}h")
            db.update("research", "ops_freshness", f"pipeline=eq.{pipeline}", {"status": "stale"})
        elif r["status"] == "stale":
            db.update("research", "ops_freshness", f"pipeline=eq.{pipeline}", {"status": "ok"})

    for v in fresh.assert_arrival():
        problems.append(f"{v['pipeline']}: {v['detail']}")
        db.update("research", "ops_freshness", f"pipeline=eq.{v['pipeline']}",
                  {"status": "stale", "note": v["detail"][:500]})

    # Re-alert daily while a problem persists rather than once and then silence.
    state = db.get_config("freshness_alerted", {}) or {}
    if isinstance(state, list):  # migrate old shape
        state = {p: "" for p in state}
    today = dt.date.today().isoformat()
    fresh_problems = [p for p in problems if state.get(p.split(":")[0], "") != today]
    if fresh_problems:
        from lbc.push import notify
        delivered = telegram.send("\n".join(["DATA FRESHNESS ALERT", ""] + [f"  {p}" for p in problems]))
        notify.log_push("notify", "freshness", None, f"{len(problems)} pipeline problems", delivered,
                        {"problems": problems[:10]})
    db.set_config("freshness_alerted", {p.split(":")[0]: today for p in problems})
    print(f"problems: {problems or 'none'}")


def deep():
    """Drain the deep-research queue (LEGION's deep_research tool feeds it)."""
    from lbc.reason import deep as deep_worker

    n = deep_worker.run()
    print(f"deep rounds answered: {n}")


def backfill():
    """One-time deep backfill for prices + series."""
    from lbc.ingest import yahoo, cot

    tickers = sorted(all_tickers().keys())
    fresh.guarded("ingest_prices_us")(yahoo.run_prices)(tickers, full=True, batch=25)
    fresh.guarded("ingest_yahoo_series")(yahoo.run_series)(full=True)
    fresh.guarded("ingest_cot")(cot.run)(full=True)


def news():
    """Intraday news sweep. Cheap, keyless, runs alongside the alert job."""
    from lbc.ingest import news as news_ingest

    fresh.guarded("ingest_news")(news_ingest.run)()


def ingest_idx(full: bool = False):
    """IDX foreign flows only. Cloudflare blocks datacenter IPs, so this runs
    from a residential connection via scripts/research/local-ingest.ps1."""
    from lbc.ingest import idxflow

    fresh.guarded("ingest_idx_flow")(idxflow.run)(days_back=30 if full else 7)


JOBS = {
    "ingest_us": ingest_us, "ingest_asia": ingest_asia, "ingest_idx": ingest_idx,
    "nightly": nightly, "weekly": weekly, "monthly": monthly,
    "alerts": alerts, "news": news, "freshness": freshness, "deep": deep,
    "backfill": backfill,
}


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in JOBS:
        print(f"usage: python pipeline/jobs.py [{'|'.join(JOBS)}] [--full]")
        sys.exit(1)
    job = sys.argv[1]
    kwargs = {}
    if "--full" in sys.argv and job in ("ingest_us", "ingest_asia"):
        kwargs["full"] = True
    JOBS[job](**kwargs)
