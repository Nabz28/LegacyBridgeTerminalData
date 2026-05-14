// One-shot script to apply the management bootstrap SQL to a fresh
// Supabase project via direct Postgres connection.
//
// Usage:
//   PGURL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \
//   node scripts/apply-mgmt-sql.js path/to/full_bootstrap_management.sql
//
// Idempotent: the SQL itself uses CREATE ... IF NOT EXISTS / OR REPLACE /
// ON CONFLICT, so re-running is safe.

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const sqlPath = process.argv[2] || "supabase/migrations/full_bootstrap_management.sql";
const url = process.env.PGURL;

if (!url) {
  console.error("Set PGURL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres");
  process.exit(2);
}

const absPath = path.resolve(sqlPath);
console.log(`Reading ${absPath}`);
const sql = fs.readFileSync(absPath, "utf8");
const stripped = sql.replace(/^﻿/, "");
console.log(`Loaded ${stripped.length} chars`);

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    // Some networks don't route to Supabase's IPv6-only db.<ref> direct host.
    // Hint Node to allow both, preferring IPv4 if available; the pooler URL
    // resolves IPv4 anyway.
    lookup: undefined,
  });
  console.log("Connecting...");
  await client.connect();
  console.log("Connected. Applying bundle (single transaction)...");
  try {
    await client.query("BEGIN");
    await client.query(stripped);
    await client.query("COMMIT");
    console.log("COMMIT ok.");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("FAILED, rolled back:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Quick sanity check on a fresh client.
  const verify = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await verify.connect();
  for (const [label, q] of [
    ["users",      "select count(*)::int as c from management.users"],
    ["projects",   "select count(*)::int as c from management.projects"],
    ["deliverables", "select count(*)::int as c from management.deliverables"],
    ["project_members", "select count(*)::int as c from management.project_members"],
  ]) {
    const r = await verify.query(q);
    console.log(`  ${label.padEnd(18)} = ${r.rows[0].c}`);
  }
  await verify.end();
})().catch((e) => { console.error(e); process.exit(1); });
