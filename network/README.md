# Network Terminal (Module 04) — LBC Relationship Mapper

D3-based relationship graph for Legacy Bridge Capital. Map the LBC team, their
direct contacts, and the connections those contacts have with each other —
plus dedicated sections for Clients and Talents.

## What's in the box

| Feature | Status |
|---|---|
| Two views — *Company* (LBC → category → sector → company → person) and *People* (LBC team → who they know) | ✅ |
| Section switcher — **Network** / **Clients** / **Talents** with per-section filters | ✅ |
| Multi-affiliation per person (current + past company/position pairs) | ✅ |
| Typed known-by edges (colleague, ex-colleague, client, investor, school, family, mentor, advisor, friend, other) | ✅ |
| Bidirectional known-by — connections can be known by LBC members AND by other connections (2nd-degree graph) | ✅ |
| Append-only notes log per connection | ✅ |
| Search, filter tabs, detail panel, photo upload + crop | ✅ |
| Admin gate (UI-noise only — passcode `legacy_2025` in client source) | ⚠️ |
| Supabase Realtime sync across browsers | ✅ |
| localStorage offline fallback (`lbc_legacy_network_v5`) | ✅ |

## Stack

- Single `dashboard/index.html` — no build step.
- D3 7.8.5 + `@supabase/supabase-js@2` (both from CDN).
- Supabase Postgres tables under `public.lns_*` (see `supabase/migrations/0013_network_schema.sql`).
- Runtime config via `dashboard/js/config.vercel.js` (committed, public values only)
  optionally overridden by `dashboard/js/config.js` (gitignored).

## Local dev

```bash
# From repo root, serve everything on :4173
node scripts/serve.js 4173
# → http://127.0.0.1:4173/network/dashboard/
```

The terminal works offline (localStorage) if Supabase credentials are blank.
Drop a `dashboard/js/config.js` in if you want to override the deployed
Supabase project for testing — see `dashboard/js/config.example.js`.

## Deploy

Same flow as macro: Vercel auto-serves static files from `network/dashboard/`.
The repo's `vercel.json` redirects `/network` and `/network/` to
`/network/dashboard/`. See `DEPLOY_PROMPT.md` (root) for the cross-module
deployment runbook.

## Permission model (current)

- **Anyone with the URL** can read/write every section. RLS policy is
  `allow_all` on all five `lns_*` tables (see migration 0013).
- The `Admin` toggle in the UI (passcode `legacy_2025`) only filters
  `visibility = 'admin'` rows out for non-admins. It does NOT prevent
  someone with the URL from hitting the REST API directly.
- Tightening this — wiring auth to management's `auth-login` Edge Function
  and switching RLS to `auth.uid()` membership — is queued as
  `0014_network_rls_hardening.sql`.

## Architecture notes

- Tables `lns_categories`, `lns_sectors`, `lns_members`, `lns_connections`,
  `lns_company_meta` live in `public.*` (NOT a dedicated `network.*` schema)
  because the standalone app shipped against `public.lns_*` and the
  production data is already there. Migration 0013 is non-destructive on
  purpose — `create table if not exists` so it can be applied to a
  populated project without wiping anything.
- v4/v5 fields: `affiliations`, `known_by`, `notes` are JSONB arrays;
  v5 added `section`, `visibility`, `client_type`, `client_status`,
  `talent_stage`.
- Realtime is enabled on all five tables (migration 0013, section 3).
- Local-only mode (no `SUPABASE_URL`) still works — falls back to
  `localStorage` under `lbc_legacy_network_v5`, with auto-migration from
  v1 / v3 / v4 snapshots.
