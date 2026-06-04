# Autonomous macro update — scheduled-agent playbook

A Sonnet Claude agent runs this **every 6 hours at 08:00 / 14:00 / 20:00 WIB**
(skips 02:00). Cron (UTC): `0 1,7,13 * * *`. Its job is to keep the macro
terminal's *non-API* surfaces fresh — primarily **news** and the **sentiment
engine** — by writing to Supabase, which the live terminal reads instantly (no
redeploy needed for data; see §4).

> Working dir: the repo root. Credentials: `SUPABASE_SERVICE_ROLE_KEY` is read
> from `~/.openclaw/.env` (same machine). The service-role key bypasses RLS —
> never print or commit it.

## Each run, in order

### 1. Gather candidates from RSS (Stage A — deterministic, real links)
```
python fetch_news_rss.py --days 4 --limit 50 > candidates.json
```
This pulls curated macro RSS feeds (Fed, MarketWatch, Investing.com, BBC,
Guardian) → fresh, real, **clickable** items, already region-tagged and
macro-filtered. No web-search needed for the core feed. (You MAY add a few
breaking items via web search for beats RSS misses — esp. Indonesia/BI — using
the same record shape.)

### 2. Score each candidate (Stage B) → write to Supabase
Read `candidates.json`. For each item, ADD the scoring fields and write an
`items.json` array of records:
```
{ ts, region (US|ID|CN|World), source, headline, url, summary,
  analysis ("where it leads" — 2-3 sentences, the transmission read),
  sent_score (-100..+100, risk-on positive), confidence (0..1),
  importance (high|med|low),
  affects [ {label, dir (+1/-1/0), note}, ... ]   // market-impact breakdown
}
```
- `sent_score`: implication for **risk assets / growth**, not "good vs bad news"
  (hot CPI → hawkish → negative; oil supply shock → negative; disinflation → positive).
- `affects`: 3-6 markets the item moves and the direction — e.g.
  `{label:"USD",dir:1,note:"haven bid"}`, `{label:"UST 10Y",dir:1}`, `{label:"Equities",dir:-1}`.
- `importance`: `high` for rate decisions, major data surprises, supply shocks.
- Keep the strongest ~18-24 items; skip low-signal/duplicate headlines.

Then upsert (dedup by hash is automatic):
```
python post_news.py items.json
```

### 3. Recompute sentiment + refresh self-sourced data
```
SUPABASE_SERVICE_ROLE_KEY=... python scripts/scrape_bps.py        # refresh ID data (idempotent)
SUPABASE_SERVICE_ROLE_KEY=... python scripts/macro_sentiment.py   # blends the fresh news
```
`macro_sentiment.py` reads the news just written (48h window) and publishes new
`macro.sentiment` snapshots per region.

### 4. Deploy only if code changed
Data lives in Supabase and is read live — **no deploy needed for news/sentiment
updates.** Only when this run changed *code* (rare — e.g. a methodology tweak):
```
git add -A && git commit -m "chore(macro): autonomous update <date>"
git push origin HEAD:main      # gh credential helper is configured → non-interactive
```
Vercel auto-builds from `main`.

### 5. Report
Print a 3–5 line summary: # news items written per region, the new composite
scores, any failures (stale series, fetch errors). Do **not** fabricate data —
if web search returns nothing for a beat, write nothing for it.

## Guardrails
- Quality over volume; skip low-signal / duplicate headlines.
- Never invent sources or URLs.
- Never print/commit the service-role key or any secret.
- If `python` or a write fails, report it and continue with the rest — partial
  updates are fine; the engine handles missing pillars/news gracefully.
- Keep the run bounded (~3–5 min of work). This is maintenance, not research.
