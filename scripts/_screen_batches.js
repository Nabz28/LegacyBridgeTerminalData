// One-off: extract the IDX universe from idx-universe.js (regex over the source,
// since it's a browser IIFE) and write equity-screen batch payloads to /tmp.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "launcher", "scripts", "idx-universe.js"), "utf8");
const re = /\{\s*sym:\s*'([^']+)'\s*,\s*name:\s*'([^']*)'\s*,\s*sector:\s*'([^']*)'\s*,\s*sub:\s*'([^']*)'\s*\}/g;
const seen = {}; const rows = [];
let m;
while ((m = re.exec(src)) !== null) {
  const sym = m[1]; if (seen[sym]) continue; seen[sym] = 1;
  rows.push({ symbol: sym, yahoo: sym + ".JK", name: m[2].replace(/&amp;/g, "&"), sector: m[3], sub_sector: m[4] });
}
const outDir = process.argv[2] || "/tmp/screen_batches";
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const CH = 20; let n = 0;
for (let i = 0; i < rows.length; i += CH) {
  fs.writeFileSync(path.join(outDir, "b" + String(n).padStart(3, "0") + ".json"), JSON.stringify({ rows: rows.slice(i, i + CH) }));
  n++;
}
console.log("rows=" + rows.length + " batches=" + n + " dir=" + outDir);
