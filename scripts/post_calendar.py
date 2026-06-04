#!/usr/bin/env python3
"""
post_calendar.py — upsert a batch of economic / corporate-event calendar rows
into macro.calendar. Used by the data agents (and the scheduled routine) so they
never hand-craft a service-role curl.

    SUPABASE_SERVICE_ROLE_KEY=... python post_calendar.py events.json [events2.json ...]

Each item (only region/event_date/category/title are required):
  { region: 'US'|'ID'|'Global', event_date: 'YYYY-MM-DD', event_time?, category,
    title, entity?, ticker?, importance? ('high'|'med'|'low'), period?,
    prev?, forecast?, actual?, detail?, status? ('confirmed'|'tentative'|'estimated'),
    source?, url? }

`hash` (sha1 of region|category|event_date|title|ticker) is computed if absent and
used to dedup, so re-running is idempotent. Stdlib only.
"""

import hashlib, json, os, sys, urllib.request, re
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://adnubucjlezrtusbicja.supabase.co").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = SUPABASE_URL + "/rest/v1"

VALID_REGION = {"US", "ID", "Global"}
VALID_IMP = {"high", "med", "low"}
VALID_STATUS = {"confirmed", "tentative", "estimated"}
ALLOWED = {"region", "event_date", "event_time", "category", "title", "entity",
           "ticker", "importance", "period", "prev", "forecast", "actual",
           "detail", "status", "source", "url", "hash"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def norm(raw):
    """Validate + normalize one record. Returns dict or None (dropped)."""
    region = (raw.get("region") or "").strip()
    if region in ("Indonesia", "ID", "id"):
        region = "ID"
    if region in ("United States", "USA", "us"):
        region = "US"
    if region in ("World", "global", "GL"):
        region = "Global"
    date = (raw.get("event_date") or raw.get("date") or "").strip()[:10]
    title = (raw.get("title") or "").strip()
    if region not in VALID_REGION or not DATE_RE.match(date) or not title:
        return None
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return None
    imp = (raw.get("importance") or "med").lower()
    if imp not in VALID_IMP:
        imp = "med"
    status = (raw.get("status") or "confirmed").lower()
    if status not in VALID_STATUS:
        status = "confirmed"
    rec = {
        "region": region, "event_date": date, "category": (raw.get("category") or "other").strip().lower(),
        "title": title[:280], "entity": (raw.get("entity") or None),
        "ticker": (raw.get("ticker") or None), "importance": imp,
        "event_time": (raw.get("event_time") or None), "period": (raw.get("period") or None),
        "prev": (raw.get("prev") or raw.get("previous") or None),
        "forecast": (raw.get("forecast") or raw.get("consensus") or None),
        "actual": (raw.get("actual") or None), "detail": (raw.get("detail") or raw.get("agenda") or None),
        "status": status, "source": (raw.get("source") or None), "url": (raw.get("url") or None),
    }
    tick = rec["ticker"] or ""
    rec["hash"] = raw.get("hash") or hashlib.sha1(
        f"{region}|{rec['category']}|{date}|{title.lower()}|{tick}".encode("utf-8")).hexdigest()
    return {k: v for k, v in rec.items() if k in ALLOWED}


def upsert(rows):
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        REST + "/calendar?on_conflict=hash", data=data, method="POST",
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "Content-Type": "application/json", "Content-Profile": "macro",
                 "Prefer": "resolution=merge-duplicates,return=minimal"})
    urllib.request.urlopen(req, timeout=60)


def main():
    if not KEY:
        sys.exit("SUPABASE_SERVICE_ROLE_KEY not set")
    files = sys.argv[1:]
    if not files:
        sys.exit("usage: post_calendar.py events.json [...]")
    all_rows, dropped = [], 0
    seen = set()
    for f in files:
        with open(f, encoding="utf-8-sig") as fh:
            items = json.load(fh)
        if isinstance(items, dict) and "events" in items:
            items = items["events"]
        for it in items:
            rec = norm(it)
            if not rec:
                dropped += 1
                continue
            if rec["hash"] in seen:
                continue
            seen.add(rec["hash"])
            all_rows.append(rec)
    # upsert in chunks
    for i in range(0, len(all_rows), 200):
        upsert(all_rows[i:i + 200])
    by_region = {}
    for r in all_rows:
        by_region[r["region"]] = by_region.get(r["region"], 0) + 1
    print(f"upserted {len(all_rows)} events ({dropped} dropped). by region: {by_region}")


if __name__ == "__main__":
    main()
