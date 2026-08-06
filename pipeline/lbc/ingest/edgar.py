"""SEC EDGAR: new filings for covered US names; risk-factor diff for 10-K/10-Q.

Keyless; requires a descriptive User-Agent per SEC policy.
"""
from __future__ import annotations

import datetime as dt
import difflib
import hashlib
import json
import re
import time
import urllib.request

from .. import db

UA = {"User-Agent": "LBC Research research@legacybridge.capital"}


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def _covered_us_tickers() -> dict[str, str]:
    """ticker -> desk_id for US-listed instruments (no suffix, no ^)."""
    rows = db.select("mkt", "instrument", "select=ticker,desk_id&active=eq.true")
    return {r["ticker"]: r["desk_id"] for r in rows
            if "." not in r["ticker"] and not r["ticker"].startswith("^") and "=" not in r["ticker"]}


def _ticker_cik_map() -> dict[str, str]:
    data = json.loads(_get("https://www.sec.gov/files/company_tickers.json"))
    return {v["ticker"].upper(): str(v["cik_str"]).zfill(10) for v in data.values()}


def _extract_risk_factors(text: str) -> str:
    m = re.search(r"item\s*1a[\.\s\-–:]*risk\s*factors(.{1000,400000}?)item\s*1b", text,
                  re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", m.group(1)).strip()[:200000] if m else ""


def run(max_names: int = 60) -> int:
    covered = _covered_us_tickers()
    try:
        cik_map = _ticker_cik_map()
    except Exception as e:
        raise RuntimeError(f"EDGAR ticker map failed: {e}")
    wrote = 0
    cutoff = (dt.date.today() - dt.timedelta(days=14)).isoformat()
    for ticker, desk_id in list(covered.items())[:max_names]:
        cik = cik_map.get(ticker.upper())
        if not cik:
            continue
        try:
            subs = json.loads(_get(f"https://data.sec.gov/submissions/CIK{cik}.json"))
            recent = subs.get("filings", {}).get("recent", {})
            forms = recent.get("form", [])
            dates = recent.get("filingDate", [])
            accs = recent.get("accessionNumber", [])
            docs = recent.get("primaryDocument", [])
            for form, date, acc, docname in zip(forms, dates, accs, docs):
                if form not in ("10-K", "10-Q", "8-K") or date < cutoff:
                    continue
                acc_clean = acc.replace("-", "")
                url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_clean}/{docname}"
                h = hashlib.sha256(f"{ticker}:{acc}".encode()).hexdigest()
                if db.select("doc", "document", f"select=id&hash=eq.{h}"):
                    continue
                kind = {"10-K": "filing_10k", "10-Q": "filing_10q", "8-K": "filing_8k"}[form]
                raw_text = ""
                if form in ("10-K", "10-Q"):
                    try:
                        html = _get(url).decode("utf-8", errors="replace")
                        text = re.sub(r"<[^>]+>", " ", html)
                        raw_text = _extract_risk_factors(text) or text[:50000]
                        time.sleep(0.3)
                    except Exception:
                        raw_text = ""
                created = db.insert("doc", "document", [{
                    "kind": kind, "entity": ticker, "title": f"{ticker} {form} {date}",
                    "published_at": f"{date}T00:00:00Z", "url": url,
                    "raw_text": raw_text, "hash": h, "meta": {"cik": cik, "form": form},
                }], returning=True)
                wrote += 1
                # risk factor diff vs previous same-kind filing
                if form == "10-K" and raw_text:
                    prior = db.select("doc", "document",
                                      f"select=id,raw_text&kind=eq.{kind}&entity=eq.{ticker}"
                                      f"&order=published_at.desc&offset=1", limit=1)
                    if prior and prior[0]["raw_text"]:
                        sm = difflib.SequenceMatcher(None, prior[0]["raw_text"].split(),
                                                     raw_text.split(), autojunk=False)
                        salience = int(min(100, max(0, (1 - sm.ratio()) * 250)))
                        db.insert("doc", "diff", [{
                            "document_id": created[0]["id"],
                            "prior_document_id": prior[0]["id"],
                            "summary": f"{ticker} risk factors changed vs prior 10-K",
                            "salience": salience,
                        }])
                        if salience >= 25:
                            db.upsert("research", "signal", [{
                                "asof": dt.date.today().isoformat(), "desk_id": desk_id,
                                "kind": "filing_event", "ref": ticker,
                                "headline": f"{ticker} 10-K risk factor language changed materially",
                                "payload": {"url": url, "salience": salience},
                                "salience": min(90, 35 + salience), "direction": -1,
                                "dedupe_key": f"filing:{ticker}:{h[:12]}",
                            }], on_conflict="dedupe_key,asof")
                elif form == "8-K":
                    db.upsert("research", "signal", [{
                        "asof": dt.date.today().isoformat(), "desk_id": desk_id,
                        "kind": "filing_event", "ref": ticker,
                        "headline": f"{ticker} filed an 8-K ({date})",
                        "payload": {"url": url}, "salience": 30, "direction": 0,
                        "dedupe_key": f"filing:{ticker}:{h[:12]}",
                    }], on_conflict="dedupe_key,asof")
            time.sleep(0.25)
        except Exception as e:
            print(f"  edgar {ticker} failed: {e}")
            continue
    return wrote
