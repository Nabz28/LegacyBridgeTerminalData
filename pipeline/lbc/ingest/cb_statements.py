"""Central bank statement capture + word-level diff vs prior statement.

FOMC (federalreserve.gov), BI (bi.go.id), BoJ (boj.or.jp), ECB (ecb.europa.eu).
Stores full text in doc.document (hash-deduped) and a diff row in doc.diff.
A material diff also becomes a research.signal (kind='stmt_diff').
"""
from __future__ import annotations

import datetime as dt
import difflib
import hashlib
import html as html_lib
import re
import urllib.request

from .. import db

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) lbc-research"}


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def _strip_html(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", html)
    text = re.sub(r"<[^>]+>", " ", html)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


SOURCES = {
    "cb_fomc": {
        "entity": "Federal Reserve", "desk": "us",
        # RSS is stable where the HTML index is JS-driven
        "index": "https://www.federalreserve.gov/feeds/press_monetary.xml",
        "link_re": r"<link><!\[CDATA\[(https://www\.federalreserve\.gov/newsevents/pressreleases/monetary\d+[a-z]?\.htm)\]\]></link>",
        "base": "",
    },
    "cb_boj": {
        "entity": "Bank of Japan", "desk": "japan-korea",
        "index": "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/index.htm",
        "link_re": r'href="([^"]*k\d{6}a\.pdf|[^"]*/mpr_2026/[^"]*\.htm)"',
        "base": "https://www.boj.or.jp",
    },
    "cb_ecb": {
        "entity": "ECB", "desk": "eurozone",
        "index": "https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html",
        "link_re": r'href="(/press/pr/date/\d{4}/html/[^"]+\.en\.html)"',
        "base": "https://www.ecb.europa.eu",
    },
    "cb_bi": {
        "entity": "Bank Indonesia", "desk": "indonesia",
        "index": "https://www.bi.go.id/en/publikasi/ruang-media/news-release/Default.aspx",
        # sp_ = siaran pers (actual releases); the bare Pages/*.aspx links are chrome
        "link_re": r'href="(/en/publikasi/ruang-media/news-release/Pages/sp_[^"]+\.aspx)"',
        "base": "https://www.bi.go.id",
    },
}


def _diff_summary(old: str, new: str, max_changes: int = 12):
    ow, nw = old.split(), new.split()
    sm = difflib.SequenceMatcher(None, ow, nw, autojunk=False)
    changes = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        removed = " ".join(ow[i1:i2])[:200]
        added = " ".join(nw[j1:j2])[:200]
        if removed or added:
            changes.append({"op": tag, "removed": removed, "added": added})
        if len(changes) >= max_changes:
            break
    ratio = sm.ratio()
    salience = int(min(100, max(0, (1 - ratio) * 400)))  # 25% word change = 100
    return changes, salience


def run() -> int:
    wrote = 0
    for kind, cfg in SOURCES.items():
        try:
            idx_html = _get(cfg["index"])
            links = re.findall(cfg["link_re"], idx_html)
            if not links:
                print(f"  {kind}: no links found")
                continue
            url = cfg["base"] + links[0] if links[0].startswith("/") else links[0]
            if url.endswith(".pdf"):
                # skip pdf-only (BoJ) — title-level capture only
                text = f"[pdf] {url}"
            else:
                text = _strip_html(_get(url))[:80000]
            h = hashlib.sha256(text.encode()).hexdigest()
            existing = db.select("doc", "document", f"select=id&hash=eq.{h}")
            if existing:
                continue
            prior = db.select("doc", "document",
                              f"select=id,raw_text&kind=eq.{kind}&order=published_at.desc", limit=1)
            created = db.insert("doc", "document", [{
                "kind": kind, "entity": cfg["entity"], "title": f"{cfg['entity']} statement",
                "published_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                "url": url, "raw_text": text, "hash": h,
            }], returning=True)
            wrote += 1
            if prior and created and not text.startswith("[pdf]"):
                changes, salience = _diff_summary(prior[0]["raw_text"] or "", text)
                db.insert("doc", "diff", [{
                    "document_id": created[0]["id"], "prior_document_id": prior[0]["id"],
                    "summary": f"{cfg['entity']} statement changed vs prior",
                    "salience": salience, "changes": changes,
                }])
                if salience >= 15:
                    today = dt.date.today().isoformat()
                    db.upsert("research", "signal", [{
                        "asof": today, "desk_id": cfg["desk"], "kind": "stmt_diff",
                        "ref": created[0]["id"],
                        "headline": f"{cfg['entity']} statement language changed ({salience}/100 severity)",
                        "payload": {"changes": changes[:6], "url": url},
                        "salience": min(95, 40 + salience), "direction": 0,
                        "dedupe_key": f"stmt_diff:{kind}:{h[:12]}",
                    }], on_conflict="dedupe_key,asof")
        except Exception as e:
            print(f"  {kind} failed: {e}")
    return wrote
