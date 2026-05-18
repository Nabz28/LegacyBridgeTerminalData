// One-shot data migration: temp Supabase (source of truth) -> Narin's.
//
// The seed uses gen_random_uuid(), so temp & Narin's seeded users/teams have
// DIFFERENT ids. Strategy:
//   1. Map temp users->Narin users by username, temp teams by slug (Narin's
//      seed already created them with working default passwords). Create any
//      temp-only users/teams on Narin's.
//   2. Auto-discover every FK column that references management.users / teams.
//   3. Wipe Narin's *seeded business data* (keep users/teams), then load
//      temp's business rows verbatim with user/team FKs remapped.
//
// All over HTTPS (temp REST + Narin Management API); no Postgres port.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/transfer-data.js

const TEMP_URL  = "https://ohbzrlobkjtbmukqthdu.supabase.co";
const TEMP_ANON = "sb_publishable_V6CYOsEiXLO1Sz0TL4nH4A_uEOTuO2y";
const REF       = "adnubucjlezrtusbicja";
const TOKEN     = process.env.SUPABASE_ACCESS_TOKEN;
const TAG       = "$mig_x9q3$";

// children-first (delete) ; reverse = parents-first (insert)
const BUSINESS = [
  "projects", "team_members", "project_access", "project_members",
  "project_approvers", "deliverables", "deliverable_owners", "comments",
  "activity_log", "project_events", "project_event_attendees",
  "meeting_polls", "meeting_responses", "deliverable_notes",
  "mindmap_nodes", "mindmap_edges",
];

async function mgmtSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`mgmt ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : [];
}
async function tempLogin() {
  const r = await fetch(`${TEMP_URL}/functions/v1/auth-login`, {
    method: "POST",
    headers: { apikey: TEMP_ANON, Authorization: `Bearer ${TEMP_ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "aldee", password: "aldee1234" }),
  });
  const j = await r.json();
  if (!j.token) throw new Error("temp login failed");
  return j.token;
}
async function tempRows(table, jwt, sel = "*") {
  const r = await fetch(`${TEMP_URL}/rest/v1/${table}?select=${sel}`, {
    headers: { apikey: TEMP_ANON, Authorization: `Bearer ${jwt}`, "Accept-Profile": "management" },
  });
  if (!r.ok) throw new Error(`temp GET ${table} ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

(async () => {
  if (!TOKEN) { console.error("need SUPABASE_ACCESS_TOKEN"); process.exit(2); }
  const jwt = await tempLogin();
  console.log("temp login OK");

  // ---- 1. user / team maps -----------------------------------------
  const nUsers = await mgmtSql("select id, username from management.users");
  const nTeams = await mgmtSql("select id, slug, name from management.teams");
  const tUsers = await tempRows("users_lite", jwt, "id,username,full_name,role,division,title,can_create_research_project");
  const tTeams = await tempRows("teams", jwt, "*");

  const nUserByName = new Map(nUsers.map((u) => [u.username, u.id]));
  const nTeamBySlug = new Map(nTeams.map((t) => [t.slug, t.id]));
  const userMap = new Map();   // tempId -> narinId
  const teamMap = new Map();

  for (const tu of tUsers) {
    let nid = nUserByName.get(tu.username);
    if (!nid) {
      // temp-only user: create on Narin with default password username+1234
      const cols = ["username", "password_hash", "full_name", "role", "division", "title", "can_create_research_project"];
      const vals = [
        lit(tu.username),
        `crypt(${lit(tu.username + "1234")}, gen_salt('bf',10))`,
        lit(tu.full_name), lit(tu.role),
        tu.division == null ? "NULL" : lit(tu.division),
        tu.title == null ? "NULL" : lit(tu.title),
        tu.can_create_research_project ? "TRUE" : "FALSE",
      ];
      const ins = await mgmtSql(
        `INSERT INTO management.users (${cols.join(",")}) VALUES (${vals.join(",")}) ` +
        `ON CONFLICT (username) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id`);
      nid = ins[0].id;
      console.log(`  + created temp-only user '${tu.username}'`);
    }
    userMap.set(tu.id, nid);
  }
  for (const tt of tTeams) {
    let nid = nTeamBySlug.get(tt.slug);
    if (!nid) {
      const ins = await mgmtSql(
        `INSERT INTO management.teams (slug, name, description) VALUES ` +
        `(${lit(tt.slug)}, ${lit(tt.name)}, ${tt.description == null ? "NULL" : lit(tt.description)}) ` +
        `ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`);
      nid = ins[0].id;
      console.log(`  + created temp-only team '${tt.slug}'`);
    }
    teamMap.set(tt.id, nid);
  }
  console.log(`maps: ${userMap.size} users, ${teamMap.size} teams`);

  // ---- 2. discover FK columns -> users / teams ---------------------
  const fks = await mgmtSql(
    "select tc.table_name tbl, kcu.column_name col, ccu.table_name ref " +
    "from information_schema.table_constraints tc " +
    "join information_schema.key_column_usage kcu on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema " +
    "join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name and ccu.table_schema=tc.table_schema " +
    "where tc.table_schema='management' and tc.constraint_type='FOREIGN KEY' and ccu.table_name in ('users','teams')");
  const remap = {};  // table -> { col -> 'users'|'teams' }
  for (const f of fks) {
    (remap[f.tbl] ||= {})[f.col] = f.ref;
  }

  // ---- 3. wipe Narin business data (children first) ----------------
  await mgmtSql(BUSINESS.slice().reverse().map((t) => `DELETE FROM management."${t}";`).join(" "));
  console.log("wiped Narin business tables");

  // ---- 4. load temp business data, remapped ------------------------
  for (const table of BUSINESS) {
    let rows;
    try { rows = await tempRows(table, jwt); }
    catch (e) { console.log(`SKIP ${table} (${e.message})`); continue; }
    if (!rows.length) { console.log(`-- ${table}: 0`); continue; }

    const rules = remap[table] || {};
    for (const row of rows) {
      for (const [col, ref] of Object.entries(rules)) {
        if (row[col] == null) continue;
        const m = ref === "users" ? userMap : teamMap;
        if (m.has(row[col])) row[col] = m.get(row[col]);
      }
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(",");
    const sql =
      `INSERT INTO management."${table}" (${colList}) SELECT ${colList} ` +
      `FROM jsonb_populate_recordset(NULL::management."${table}", ${TAG}${JSON.stringify(rows)}${TAG}::jsonb);`;
    try { await mgmtSql(sql); console.log(`OK  ${table}: ${rows.length}`); }
    catch (e) { console.log(`ERR ${table}: ${e.message}`); }
  }

  const counts = await mgmtSql(
    "select 'users' t,count(*) n from management.users " +
    "union all select 'projects',count(*) from management.projects " +
    "union all select 'deliverables',count(*) from management.deliverables " +
    "union all select 'deliverable_owners',count(*) from management.deliverable_owners " +
    "union all select 'comments',count(*) from management.comments " +
    "union all select 'deliverable_notes',count(*) from management.deliverable_notes " +
    "union all select 'mindmap_nodes',count(*) from management.mindmap_nodes " +
    "union all select 'mindmap_edges',count(*) from management.mindmap_edges order by t");
  console.log("NARIN COUNTS:", JSON.stringify(counts));
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
