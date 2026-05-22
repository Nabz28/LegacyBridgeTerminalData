// Deploy the am-marks edge function to Narin's project over the Management
// API (HTTPS) — no CLI, no Docker. No extra secrets (SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY are auto-injected).
//
// Usage:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/deploy-am-marks.js

const fs = require("fs");
const path = require("path");

const REF = "adnubucjlezrtusbicja";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SLUG = "am-marks";
const FILE = path.join(__dirname, "..", "supabase", "functions", SLUG, "index.ts");

if (!TOKEN) { console.error("need SUPABASE_ACCESS_TOKEN"); process.exit(2); }

async function deployFn(code) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({
    name: SLUG, entrypoint_path: "index.ts", verify_jwt: false,
  })], { type: "application/json" }));
  form.append("file", new Blob([code], { type: "application/typescript" }), "index.ts");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${SLUG}`,
    { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: form },
  );
  return { ok: res.ok, status: res.status, text: await res.text() };
}

(async () => {
  const code = fs.readFileSync(FILE, "utf8").replace(/\r/g, "");
  const r = await deployFn(code);
  console.log(`${SLUG}: ${r.status} ${r.ok ? "DEPLOYED" : r.text.slice(0, 500)}`);
  if (!r.ok) process.exit(1);
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
