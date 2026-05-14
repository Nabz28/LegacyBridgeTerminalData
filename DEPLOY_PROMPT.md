# Deployment handoff prompt

Paste this verbatim into a fresh chat that has Supabase + Vercel access (CLI + project dashboards). It walks the operator through deploying the **Management Terminal (Module 03)** of the Legacy Bridge multi-terminal repo.

---

## Prompt to paste

You are deploying the LBC Management Terminal — a new "Module 03" inside the existing Legacy Bridge multi-terminal repo (alongside `/macro` and `/correlation`). The code is finished and reviewed; your job is to apply migrations to Supabase, deploy Edge Functions, set Vercel env vars, and push live.

### Context

- **Repo**: existing Legacy Bridge Terminal repo. New code lives under `management/` (Vite + React + TS app) and `supabase/migrations/0005`–`0012` + `supabase/functions/`.
- **Supabase project**: same one that backs `/macro` and `/correlation`. The new schema is `management.*` — it does NOT touch `macro.*` or `correlation.*`.
- **Vercel project**: same one that serves the existing terminals. The new app builds to `management/dist/` and is reachable at `/management/`.
- **First research cycle**: May 14 → June 17, 2026. The seed migration creates three placeholder projects ready for the CIO to rename to actual themes.

### Pre-flight checks

1. Confirm `supabase` CLI installed and linked: `supabase status` should show the project.
2. Confirm Vercel CLI or dashboard access to the existing project.
3. Confirm migrations `0001`–`0004` have already been applied (the existing macro/correlation terminals depend on these).
4. The user `aldee` will be the system admin (default password `aldee1234`, change immediately after first login).

### Step 1 — Apply database migrations (Supabase SQL editor or CLI)

Run these in order. Each is idempotent and safe to re-run.

```
supabase/migrations/0005_management_schema.sql       -- schema + RLS + base RPCs
supabase/migrations/0006_management_seed.sql         -- 44 user accounts + 3 teams + storage bucket
supabase/migrations/0007_management_storage.sql      -- storage RLS for management-files bucket
supabase/migrations/0008_management_admin.sql        -- admin user `aldee` + admin RPCs + v_user_activity
supabase/migrations/0009_management_phase4.sql       -- project_members (T1/T2) + project_events
supabase/migrations/0010_management_realtime.sql     -- adds management tables to supabase_realtime publication
supabase/migrations/0011_management_phase5.sql       -- responsible_divisions[] + auto-sync trigger
supabase/migrations/0012_management_seed_first_cycle.sql  -- 3 first-cycle projects (D0 = CURRENT_DATE)
```

Quick verification after migrations:

```sql
-- Should return 45 (44 from 0006 + aldee from 0008).
SELECT count(*) FROM management.users;

-- Should return 3 active projects with placeholder themes.
SELECT id, theme, day_zero, status FROM management.projects ORDER BY id;

-- Should return 21 deliverables (7 per project).
SELECT count(*) FROM management.deliverables
WHERE project_id LIKE 'PROJ-%';

-- Should return ~18 members + 3 SPD = 21 rows.
SELECT count(*) FROM management.project_members;
```

### Step 2 — Expose the `management` schema to PostgREST

Supabase dashboard → **Project Settings → API → Exposed schemas** → add `management` alongside `public`, `macro`, `correlation`.

Without this, the frontend gets `Schema "management" does not exist` from PostgREST.

### Step 3 — Deploy Edge Functions

```bash
supabase functions deploy auth-login
supabase functions deploy create-project
supabase functions deploy mutate-deliverable
supabase functions deploy admin-mutate
supabase functions deploy mutate-event
```

Each reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` from the auto-provided Supabase function environment. No manual env vars needed.

Smoke test from terminal:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/auth-login" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"aldee","password":"aldee1234"}'

# Expected: { "token": "...", "user": { "username": "aldee", "role": "admin", ... }, "expires_in": 43200 }
```

### Step 4 — Vercel environment variables

In Vercel project → **Settings → Environment Variables**, add (Production + Preview):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The public `anon` key from Supabase → API |

These are public values — safe to expose in the client bundle. The `service_role` key never leaves the server.

### Step 5 — Push to main → Vercel auto-builds

The repo's `vercel.json` runs `cd management && npm install && npm run build` and rewrites `/management/*` → `/management/dist/*`. The existing `launcher/` card at `/launcher/` already links to `/management/`.

```bash
git push origin main
```

Watch the Vercel build log. Expected output:

- `npm install` adds 82 packages
- `tsc -b && vite build` finishes in <30s
- Build output lands at `management/dist/index.html` + `management/dist/assets/*`

### Step 6 — Smoke test in production

1. Visit `https://<your-domain>/management/` → should redirect to `/management/dist/index.html`.
2. Login as `aldee` / `aldee1234`.
3. Verify ADMIN tab is visible (red pip, rightmost).
4. HOME shows three projects: PROJ-2026-001/002/003 with placeholder themes.
5. Click PROJ-2026-001 → Gantt shows 7 deliverables (IM D5, MD D15, IO D20, ER D25, LinkedIn+Web D27, IG D34) all `not_started`.
6. Click **Members** → 6 team analysts + Faiq (SPD, T2).
7. Switch to **Calendar view** → confirm month grid renders.
8. Open ADMIN → Users → confirm 45 accounts with active status.
9. Open a second browser, login as `bulan` / `bulan1234` → should see the same projects read-only (since she's not on Team 1, the project's analysts).

### Step 7 — Cycle-start tasks (CIO / operator)

1. **Rename the placeholder themes**. Either:
   - In ADMIN → click into a project → use the (forthcoming) theme rename UI, or
   - For now: `UPDATE management.projects SET theme = 'Real Theme Name' WHERE id = 'PROJ-2026-001';`
2. **Reset `aldee`'s password** via ADMIN → Users → Reset password. The default `aldee1234` is publicly documented.
3. **Communicate the URL + initial passwords** to the 44 other users. Recommend they reset on first login.
4. **Verify Realtime works** — open two browsers (different users), have one submit a deliverable, watch the other update without refresh.

### Rollback plan

If anything goes wrong:

```sql
-- Drop the management schema (removes everything from migrations 0005-0012).
-- Macro / correlation terminals are unaffected.
DROP SCHEMA management CASCADE;
```

Then remove the management deliverable from `vercel.json` rewrites and redeploy.

### Known limitations to flag to the team

- **RLS is permissive on reads** (anyone authed sees all projects). Visibility on `restricted` projects is enforced in the Edge Functions only. Migration `0013_management_rls_hardening.sql` will tighten this — not blocking for go-live but should land before any external auditor sees the data.
- **Email is intentionally not used** — usernames only. There is no password-reset-via-email; admin resets manually in ADMIN tab.
- **Default passwords are predictable** (`<username>1234`). Send everyone the instruction to reset on first login.
- **Project themes are placeholders** in the first-cycle seed. The CIO must rename them before the cycle starts.

Confirm all 7 steps complete and report back with the production URL + the time of go-live.

---

## Files this prompt references

Make sure these are all in the deployment branch before pasting the prompt:

```
management/
  package.json                       (Vite + React + TS)
  vite.config.ts                     (base: /management/, port 5180)
  tsconfig.json
  index.html
  src/
    main.tsx, App.tsx
    components/
      Login.tsx, Shell.tsx, ProjectTab.tsx, CreateProjectModal.tsx,
      CalendarView.tsx, CreateEventModal.tsx, CreateTaskModal.tsx,
      DemoToolbar.tsx, EventsList.tsx, FilterRibbon.tsx, FleetTab.tsx,
      KpiTab.tsx, MembersModal.tsx, RosterTab.tsx, AdminTab.tsx
    lib/
      api.ts, supabase.ts, demo.ts, demoApi.ts, demoClient.ts,
      kpi.ts, realtime.ts, types.ts, util.ts, config.ts
    styles/theme.css

supabase/
  migrations/0005_management_schema.sql
  migrations/0006_management_seed.sql
  migrations/0007_management_storage.sql
  migrations/0008_management_admin.sql
  migrations/0009_management_phase4.sql
  migrations/0010_management_realtime.sql
  migrations/0011_management_phase5.sql
  migrations/0012_management_seed_first_cycle.sql
  functions/
    _shared/cors.ts, _shared/auth.ts
    auth-login/index.ts
    create-project/index.ts
    mutate-deliverable/index.ts
    admin-mutate/index.ts
    mutate-event/index.ts

vercel.json                          (rewrites /management/* → /management/dist/*)
launcher/index.html                  (Module 03 card linking to /management/)
```
