// Guard against migration-number collisions.
//
// Why this exists: migrations here are applied by hand (there is no
// supabase_migrations.schema_migrations tracking table), so the filename IS the
// ordering contract. Parallel workstreams have repeatedly grabbed the same next
// number — 0008/0009/0010/0011 (macro vs management), 0038/0039/0040 (brain vs
// finance), and 0056/0057/0058, where a branch that was never merged collided
// with MONITOR on main and the branch's three migrations were effectively lost
// for three weeks.
//
// Those seven historical pairs are already applied and are referenced by name in
// DEPLOY_PROMPT.md, management/README.md and 0037_finance_schema.sql, so they are
// GRANDFATHERED rather than renamed — renumbering applied migrations buys nothing
// and breaks references. This check fails only on NEW collisions.
//
// Usage:  node scripts/check-migrations.js        (exit 1 on a new collision)

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'supabase', 'migrations');

// Known-and-accepted duplicate numbers. Do not add to this list to silence a
// new collision — renumber your migration to the next free number instead.
const GRANDFATHERED = new Set(['0008', '0009', '0010', '0011', '0038', '0039', '0040']);

const files = fs.readdirSync(dir).filter((f) => /^\d{4}[a-z]?_.*\.sql$/.test(f));

const byNumber = new Map();
for (const f of files) {
  // 0014b_network_realtime.sql — the letter suffix is a deliberate sub-step of
  // 0014, not a collision, so key on the full "0014b" prefix.
  const key = f.match(/^(\d{4}[a-z]?)_/)[1];
  if (!byNumber.has(key)) byNumber.set(key, []);
  byNumber.get(key).push(f);
}

const collisions = [...byNumber.entries()]
  .filter(([key, list]) => list.length > 1 && !GRANDFATHERED.has(key));

const highest = [...byNumber.keys()].map((k) => parseInt(k, 10)).sort((a, b) => b - a)[0];
const next = String(highest + 1).padStart(4, '0');

if (collisions.length) {
  console.error('Migration number collision:\n');
  for (const [key, list] of collisions) {
    console.error(`  ${key} used by ${list.length} files:`);
    list.forEach((f) => console.error(`      ${f}`));
  }
  console.error(`\nRenumber one of them. Next free number is ${next}.`);
  process.exit(1);
}

console.log(`${files.length} migrations, no new number collisions.`);
console.log(`Highest is ${String(highest).padStart(4, '0')} — next free number is ${next}.`);
if (GRANDFATHERED.size) {
  console.log(`(${GRANDFATHERED.size} historical duplicate numbers are grandfathered: ${[...GRANDFATHERED].join(', ')})`);
}
