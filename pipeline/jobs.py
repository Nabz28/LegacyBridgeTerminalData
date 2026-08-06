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
    from lbc.ingest import fredcsv, yahoo, dbnomics

    fresh.guarded("ingest_fred")(fredcsv.run)(full=full)
    fresh.guarded("ingest_yahoo_series")(yahoo.run_series)(full=full)
    fresh.guarded("ingest_dbnomics")(dbnomics.run)(full=True)
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
    fresh.guarded("ingest_idx_flow")(idxflow.run)(days_back=30 if full else 7)


def nightly():
    from lbc.compute import dials, signals, book
    from lbc.reason import desk_agent, editor
    from lbc.push import brief
    from lbc.audit import score
    from lbc.ingest import gdelt, cb_statements, edgar

    today = dt.date.today().isoformat()

    fresh.guarded("ingest_gdelt")(gdelt.run)()
    fresh.guarded("ingest_cb_statements")(cb_statements.run)()
    fresh.guarded("ingest_edgar")(edgar.run)()

    def _compute():
        r1 = dials.run(today)
        n2 = signals.run(today)
        r3 = book.run(today)
        return r1["signals"] + n2 + r3["signals"]
    fresh.guarded("compute_nightly")(_compute)()

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
    fresh.guarded("audit_scoring")(_score)()


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
    """Hourly level-alert checks against latest prices/series."""
    from lbc.compute import stats
    from lbc.push import telegram

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
            telegram.send(msg)
            db.update("research", "alert", f"id=eq.{a['id']}",
                      {"active": False, "last_fired_at": dt.datetime.now(dt.timezone.utc).isoformat()})
            db.insert("research", "alert_fire", [{"alert_id": a["id"], "payload": {"last": last}}])
            fired += 1
    print(f"alerts fired: {fired}")


def freshness():
    """Assert data arrival; alert on staleness (the anti-green-lights job)."""
    from lbc.push import telegram

    now = dt.datetime.now(dt.timezone.utc)
    rows = db.select("research", "ops_freshness", "select=*")
    stale = []
    for r in rows:
        if r["status"] == "init" or not r.get("last_success_at"):
            continue
        last = dt.datetime.fromisoformat(r["last_success_at"].replace("Z", "+00:00"))
        hours = (now - last).total_seconds() / 3600
        if hours > r["expect_within_hours"]:
            stale.append((r["pipeline"], round(hours)))
            db.update("research", "ops_freshness", f"pipeline=eq.{r['pipeline']}", {"status": "stale"})
        elif r["status"] == "stale":
            db.update("research", "ops_freshness", f"pipeline=eq.{r['pipeline']}", {"status": "ok"})
    already = db.get_config("freshness_alerted", []) or []
    new_stale = [s for s in stale if s[0] not in already]
    if new_stale:
        lines = ["DATA FRESHNESS ALERT", ""]
        for p, h in stale:
            lines.append(f"  {p}: no data for {h}h")
        telegram.send("\n".join(lines))
    db.set_config("freshness_alerted", [s[0] for s in stale])
    print(f"stale pipelines: {stale}")


def backfill():
    """One-time deep backfill for prices + series."""
    from lbc.ingest import yahoo, cot

    tickers = sorted(all_tickers().keys())
    fresh.guarded("ingest_prices_us")(yahoo.run_prices)(tickers, full=True, batch=25)
    fresh.guarded("ingest_yahoo_series")(yahoo.run_series)(full=True)
    fresh.guarded("ingest_cot")(cot.run)(full=True)


JOBS = {
    "ingest_us": ingest_us, "ingest_asia": ingest_asia, "nightly": nightly,
    "weekly": weekly, "monthly": monthly, "alerts": alerts,
    "freshness": freshness, "backfill": backfill,
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
