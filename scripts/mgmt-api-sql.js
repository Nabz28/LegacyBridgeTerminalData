// Apply a .sql file to a Supabase project over the Management API (HTTPS),
// bypassing the Postgres pooler entirely. Network-resilient.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/mgmt-api-sql.js <ref> <file.sql>
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/mgmt-api-sql.js <ref> --sql "select 1"
//
// Exits non-zero on API error. Prints the JSON result (truncated).

const fs = require("fs");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.argv[2];
const arg = process.argv[3];

if (!token || !ref || !arg) {
  console.error("need SUPABASE_ACCESS_TOKEN env + <ref> + <file.sql|--sql query>");
  process.exit(2);
}

const query = arg === "--sql"
  ? process.argv.slice(4).join(" ")
  : fs.readFileSync(arg, "utf8").replace(/^﻿/, "");

(async () => {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${text.slice(0, 1200)}`);
    process.exit(1);
  }
  console.log(`OK ${res.status}: ${text.slice(0, 600)}`);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
