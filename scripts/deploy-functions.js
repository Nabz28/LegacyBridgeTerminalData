// Deploy the 5 Management edge functions to Narin's project over the
// Management API (HTTPS) — no CLI, no Docker, no GitHub.
//
// Each function imports only two LOCAL files (_shared/cors.ts, _shared/
// auth.ts). We inline those into a single self-contained module, hoisting
// all remote https:// imports to the top, then create/update the function.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/deploy-functions.js [slug]

const fs = require("fs");
const path = require("path");

const REF   = "adnubucjlezrtusbicja";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const FN_DIR = path.join(__dirname, "..", "supabase", "functions");
const ONLY = process.argv[2] || null;

const FUNCTIONS = ["auth-login", "admin-mutate", "create-project", "mutate-deliverable", "mutate-event"];

const norm = (s) => s.replace(/\r/g, "");
const isLocalImport  = (l) => /^\s*import\s.*["'`]\.\.\/_shared\/.*["'`];?\s*$/.test(l);
const isRemoteImport = (l) => /^\s*import\s.*["'`]https:\/\/.*["'`];?\s*$/.test(l);

function bundle(slug) {
  const cors = norm(fs.readFileSync(path.join(FN_DIR, "_shared", "cors.ts"), "utf8"));
  const auth = norm(fs.readFileSync(path.join(FN_DIR, "_shared", "auth.ts"), "utf8"));
  const idx  = norm(fs.readFileSync(path.join(FN_DIR, slug, "index.ts"), "utf8"));

  const remote = new Set();
  const strip = (src) =>
    src.split("\n").filter((l) => {
      if (isRemoteImport(l)) { remote.add(l.trim()); return false; }
      if (isLocalImport(l))  return false;
      return true;
    }).join("\n");

  const corsBody = strip(cors);   // no imports
  const authBody = strip(auth);   // djwt import captured into `remote`
  const idxBody  = strip(idx);    // remote + local imports captured/dropped

  return (
    "// AUTO-BUNDLED (inlined _shared) — deployed via Management API\n" +
    [...remote].join("\n") + "\n\n" +
    "/* ---- _shared/cors.ts ---- */\n" + corsBody + "\n" +
    "/* ---- _shared/auth.ts ---- */\n" + authBody + "\n" +
    "/* ---- index.ts ---- */\n" + idxBody + "\n"
  );
}

async function api(method, urlPath, body) {
  const res = await fetch(`https://api.supabase.com${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// Supported deploy path: multipart to /functions/deploy. Server bundles to
// eszip (same as CLI `--use-api`) — no Docker/CLI needed.
async function deployFn(slug, code) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({
    name: slug,
    entrypoint_path: "index.ts",
    verify_jwt: false,
  })], { type: "application/json" }));
  form.append("file", new Blob([code], { type: "application/typescript" }), "index.ts");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${slug}`,
    { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: form },
  );
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

(async () => {
  if (!TOKEN) { console.error("need SUPABASE_ACCESS_TOKEN"); process.exit(2); }

  // Ensure JWT_SECRET secret is set (SUPABASE_URL / SERVICE_ROLE auto-inject).
  const jwtSecret = process.env.LBC_JWT_SECRET;
  if (jwtSecret) {
    const s = await api("POST", `/v1/projects/${REF}/secrets`,
      [{ name: "JWT_SECRET", value: jwtSecret }]);
    console.log(`secret JWT_SECRET: ${s.status} ${s.ok ? "ok" : s.text.slice(0,200)}`);
  }

  for (const slug of FUNCTIONS) {
    if (ONLY && slug !== ONLY) continue;
    const code = bundle(slug);
    const r = await deployFn(slug, code);
    console.log(`${slug}: ${r.status} ${r.ok ? "DEPLOYED" : r.text.slice(0, 400)}`);
  }
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
