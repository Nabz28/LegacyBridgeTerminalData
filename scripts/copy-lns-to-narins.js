// One-off: copy the Network (lns_*) data from the old temp project
// (ohbzrlobkjtbmukqthdu, decommission-bound) onto Narin's Plus
// (adnubucjlezrtusbicja) so Network lives on the live project like everything
// else. Reads temp with its public anon key; writes Narin's with the service
// role (bypasses RLS). Idempotent (upsert on PK). Tiny dataset (~97 rows).
//
// Usage: SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/copy-lns-to-narins.js

const TEMP = "https://ohbzrlobkjtbmukqthdu.supabase.co/rest/v1";
const TKEY = "sb_publishable_V6CYOsEiXLO1Sz0TL4nH4A_uEOTuO2y";
const DST = "https://adnubucjlezrtusbicja.supabase.co/rest/v1";
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SVC) { console.error("need SUPABASE_SERVICE_ROLE_KEY (Narin's service role)"); process.exit(2); }

const TABLES = [
  ["lns_categories", "id"],
  ["lns_sectors", "id"],
  ["lns_members", "id"],
  ["lns_connections", "id"],
  ["lns_company_meta", "name"],
];

async function getAll(table) {
  const r = await fetch(`${TEMP}/${table}?select=*`, { headers: { apikey: TKEY, Authorization: `Bearer ${TKEY}` } });
  if (!r.ok) throw new Error(`GET temp ${table} HTTP ${r.status}`);
  return r.json();
}
async function upsert(table, pk, rows) {
  const r = await fetch(`${DST}/${table}?on_conflict=${pk}`, {
    method: "POST",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert ${table} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  for (const [table, pk] of TABLES) {
    try {
      const rows = await getAll(table);
      if (rows.length) await upsert(table, pk, rows);
      console.log(`${table}: copied ${rows.length}`);
    } catch (e) { console.error(`${table}: ${e.message}`); }
  }
  console.log("done");
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
