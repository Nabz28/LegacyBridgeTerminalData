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

### 2. Match each candidate to the taxonomy (Stage B) → write to Supabase
The bear/bull score is **computed**, not eyeballed (see `docs/macro/NEWS_SCORING.md`).
First read the taxonomy `news_taxonomy.json` (fetched in setup). Then for the
strongest ~18-24 candidates, write an `items.json` array of records — you only
MATCH; you do NOT supply a score/importance:
```
{ ts, region, source (single clean outlet), headline, url, summary,
  analysis ("where it leads" — 2-3 sentences),
  type      (one news_type key from the taxonomy),
  surprise  (priced | partial | likely | surprise),
  impacts: [ {target (a TARGET KEY from the taxonomy), level (-5..5), note}, ... 3-6 ] }
```
- `level`: the asset's NATURAL direction (rupiah weakens → IDR negative; yields up
  → SBN10Y positive; a hike → BIRATE positive), sized via the target's σ anchor +
  the level_scale. `post_news.py` validates targets and **computes** sent_score,
  sent_label, importance and the affects breakdown via `news_score.py`.
- Skip low-signal/duplicate headlines; keep sources to single clean outlet names.

Then upsert (dedup by hash is automatic; off-taxonomy targets are dropped):
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
