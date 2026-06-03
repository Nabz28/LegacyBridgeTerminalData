#!/usr/bin/env python3
"""
post_news.py — upsert a batch of macro news items into macro.news.

Used by the scheduled autonomous-update agent so it never hand-crafts a curl
with the service-role key. The agent writes its gathered items to a JSON file
(an array of objects) and runs:

    SUPABASE_SERVICE_ROLE_KEY=... python post_news.py items.json

Each item: { ts?, region, source, headline, url?, summary?, impact?,
             sent_label?, sent_score?, confidence?, topics?[] }
`hash` is computed if absent (sha1 of source|headline|YYYY-MM-DD) and used to
dedup, so re-running the same day is idempotent. Stdlib only.
"""

import hashlib, json, os, sys, urllib.request
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://adnubucjlezrtusbicja.supabase.co").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = SUPABASE_URL + "/rest/v1"

def main():
    if not KEY:
        print("ERROR: set SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr); sys.exit(2)
    if len(sys.argv) < 2:
        print("usage: post_news.py items.json", file=sys.stderr); sys.exit(2)
    items = json.load(open(sys.argv[1], encoding="utf-8-sig"))  # tolerate a BOM
    if isinstance(items, dict):
        items = [items]
    now = datetime.now(timezone.utc).isoformat()
    clean = []
    for it in items:
        if not it.get("headline"):
            continue
        ts = it.get("ts") or now
        day = str(ts)[:10]
        src = it.get("source") or "news"
        h = it.get("hash") or hashlib.sha1(("%s|%s|%s" % (src, it["headline"], day)).lower().encode()).hexdigest()
        score = it.get("sent_score")
        label = it.get("sent_label")
        if label is None and score is not None:
            label = "pos" if score > 12 else "neg" if score < -12 else "flat"
        clean.append({
            "ts": ts, "region": it.get("region") or "World", "source": src,
            "headline": it["headline"], "url": it.get("url"), "summary": it.get("summary"),
            "impact": it.get("impact"), "sent_label": label, "sent_score": score,
            "confidence": it.get("confidence"), "topics": it.get("topics") or [], "hash": h,
        })
    if not clean:
        print("no valid items"); return
    body = json.dumps(clean).encode()
    req = urllib.request.Request(
        REST + "/news?on_conflict=hash", data=body, method="POST",
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json",
                 "Content-Profile": "macro", "Prefer": "resolution=merge-duplicates,return=minimal"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        print("Upserted %d news items (HTTP %d)." % (len(clean), resp.status))

if __name__ == "__main__":
    main()
