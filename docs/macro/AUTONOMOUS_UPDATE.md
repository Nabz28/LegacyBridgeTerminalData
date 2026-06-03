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

### 1. Gather macro news (last ~6h)
Use web search for fresh, market-moving macro news across these beats:
- **US**: Fed / rates, CPI/PCE, jobs, growth, Treasury, USD.
- **ID (Indonesia)**: BI policy, rupiah, inflation, BPS releases, fiscal, trade.
- **CN (China)**: PBoC, growth, property, trade, yuan.
- **Global / commodities / risk**: oil, gold, geopolitics, broad risk sentiment.

For each genuinely relevant item (target 12–24 total, quality over volume),
produce a record:
```
{ ts, region (US|ID|CN|World), source, headline, url, summary (1–2 sentences),
  impact ("where it leads" — 1 sentence), sent_label (pos|neg|flat),
  sent_score (-100..+100, risk-on positive), confidence (0..1),
  topics (string[]), hash }
```
- `sent_score`: score the item's implication for **risk assets / growth**, not
  whether the news is "good." (e.g. hot CPI → likely hawkish → negative.)
- `hash`: `sha1(source|headline|YYYY-MM-DD)` lowercased — used to dedup.

### 2. Write news to Supabase
`POST {SUPABASE_URL}/rest/v1/news` with headers
`apikey/Authorization: <service_role>`, `Content-Profile: macro`,
`Prefer: resolution=merge-duplicates,return=minimal`, `?on_conflict=hash`.
Send as a batch array. Duplicates (same `hash`) are ignored.

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
