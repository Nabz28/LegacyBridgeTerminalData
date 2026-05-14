# Management Terminal (Module 03) — LBC Research Command Center

Research project lifecycle + KPI tracking for the LBC first cycle and beyond.

## What's in the box

### First-cycle pipeline (May 14 → Jun 17 mapping)

| Stage | Offset from D0 | Deliverables |
|---|---|---|
| Investment Memo | **D5** | IM (CROSS, co-owned by all 6 team analysts) |
| Market Dive | **D15** | MD × {1, 2} (MRD) |
| Industry Outlook | **D20** | IO (IRD) |
| Equity Research | **D25** | ER × {1, 2} (ERD) |
| Publication (LinkedIn + Website) | **D27** | PUB_LINKEDIN, PUB_WEBSITE (M&D) |
| Instagram | **D34** | PUB_IG (M&D, 1 week after publish) |

Every due date is editable per project — defaults pre-fill from D0 on the Create-Project form.

### Capabilities

| Feature | Status |
|---|---|
| Custom username/password auth (no email), 45 seeded accounts | ✅ |
| Chrome-tab shell · HOME / FLEET / ROSTER / KPI / ADMIN (admin-only) | ✅ |
| Gantt + day-by-day axis + horizon picker (15 / 22 / 30 / 60 / 90 / auto) | ✅ |
| Calendar view (month grid, switchable per project) | ✅ |
| Custom tasks (+ Task button) with multi-division checkbox + owner picker | ✅ |
| Division-dominant Gantt bar coloring (ERD/MRD/IRD/M&D/CROSS) + health corner dot | ✅ |
| 5-state deliverable workflow + auto revision counting | ✅ |
| File upload to Supabase Storage + signed-URL download + external link paste | ✅ |
| Comments thread per deliverable | ✅ |
| Blocker raise / clear + activity log | ✅ |
| Project members (T1/T2) — Google-Sheets-style access | ✅ |
| Schedule events per project (Zoom, onboarding, milestone, deadline) | ✅ |
| Admin tab — teams CRUD + user accounts + password reset | ✅ |
| Project archive / reactivate / mark completed | ✅ |
| HOME project search | ✅ |
| Per-analyst leaderboard on KPI | ✅ |
| Filter ribbon persistence (division / team / analyst / period) | ✅ |
| Supabase Realtime for cross-user live updates (production) | ✅ |
| Demo mode (`?demo=1`) with full in-memory store + persona switcher | ✅ |

### Permission model

- **Admin** (e.g. `aldee`) — everything, incl. ADMIN tab, user CRUD, password reset.
- **Management** — create projects, set member permissions, approve deliverables in their division, edit project meta, rename themes.
- **Analyst on a project (T1)** — edit deliverables whose `responsible_divisions` contains the analyst's division (plus IM, which always allows team analysts). Comment everywhere on the project. Add schedule items / custom tasks.
- **Analyst on a project (T2)** — edit any deliverable on the project. Comment everywhere. Add schedule items / custom tasks.
- **Advisor** (`stefano`, `fakih`) — read + comment everywhere.
- **Non-member authenticated user** — read-only on all projects (org-visibility default).

### Approval matrix (first cycle)

- **ERD** outputs → Satya + assigned ERD VD (Marselinus on Team 2, Dzaki on Team 3)
- **MRD** outputs → Amadeus + Deo (MRD VD, on every project)
- **IRD** outputs → Aqila + Bintang (Team 3 only)
- **M&D** publications → Farhan
- **Investment Memo** → CEO Nabil + CRO Khalif + Satya + Amadeus + Aqila (CIO Charlie excluded by design)

## Stack

- React 18 + Vite + TypeScript (static SPA, builds to `dist/`)
- Supabase Postgres (schema `management.*`) + Storage (`management-files`) + Realtime
- Custom auth via Supabase Edge Functions (Deno, bcrypt + HS256 JWT)

## Local development (demo mode — no backend)

```bash
cd management
npm install
npm run dev
# → http://localhost:5180/management/?demo=1
```

The `?demo=1` flag loads an in-memory snapshot of the first-cycle pipeline. Persona switcher (gold toolbar, bottom-right) flips between admin / CEO / CIO / directors / SPD / analysts / advisors. Mutations work; they reset on reload.

## Production deployment

See `DEPLOY_PROMPT.md` for the full handoff prompt. Short version:

1. **Apply migrations** in order via the Supabase SQL editor:
   - `0001`–`0004` — existing macro/correlation schemas
   - `0005_management_schema.sql`
   - `0006_management_seed.sql`
   - `0007_management_storage.sql`
   - `0008_management_admin.sql`
   - `0009_management_phase4.sql`
   - `0010_management_realtime.sql`
   - `0011_management_phase5.sql`
   - `0012_management_seed_first_cycle.sql` ← seeds 3 placeholder projects with the May 14 cycle
2. **Expose the `management` schema** in Supabase dashboard → API → Exposed schemas.
3. **Deploy 4 Edge Functions** with `supabase functions deploy auth-login create-project mutate-deliverable admin-mutate mutate-event`.
4. **Vercel env**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. **Push to main** — Vercel auto-builds at `/management/`.
6. **Smoke test**: log in as `aldee` / `aldee1234`, rename Project 1/2/3 themes via the ADMIN tab or by patching directly.

## Default accounts (45 total — including admin `aldee`)

All passwords are `<username>1234` (e.g. `nabil` / `nabil1234`). Reset on first login or via the ADMIN tab.

| Group | Usernames |
|---|---|
| C-suite | nabil, khalif, rattana, charlie, rizky, kayla |
| Advisors | stefano, fakih |
| Research dirs/VDs | satya, dzaki, marselinus, amadeus, **deo**, aqila, bintang |
| AMD | aurafa, jonathan, farren, rafif |
| SPD | grace, faiq, nadine |
| M&D | farhan, dharma, tristan, fayyaz |
| ERD analysts | bulan, james, fauzan, sheila, tio, phillip |
| MRD analysts | resti, aldrian, samuel, sella, ghani, bhadra |
| IRD analysts | tiangga, gede, azka, jevan, rifqi, kenneth |
| Admin | aldee |

## Architecture notes

- `verify_login` RPC uses pgcrypto's `crypt()` for bcrypt comparison in the DB. Edge Function never sees the password hash.
- JWTs are HS256-signed with Supabase's `JWT_SECRET`, so PostgREST honors `auth.uid()` inside RLS the same way as native Supabase Auth tokens.
- Phase 5 RLS still allows SELECT for all authenticated users. Visibility on `restricted` projects is enforced in the admin-mutate Edge Function. Tightening reads via DB-layer RLS that joins `project_members` is queued as migration `0013_management_rls_hardening.sql` (not blocking for go-live).
- Edge Functions run as `service_role`, centralizing the authorization rules (owner / approver / admin / project-member tier).
- Activity log auto-fills on every state change for an audit trail.
- Realtime publication includes every management table (see `0010`) — any change pushes to all open browsers.
