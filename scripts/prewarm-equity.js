// prewarm-equity.js — verify + pre-warm the equity cache across the IDX universe.
//
// Reads scripts/data/idx-tickers.json (array of bare IDX codes, e.g. ["BBCA",
// "BBRI", ...]) and, in throttled batches, calls the deployed edge fns:
//   - equity-quote      (fast keyless quote → verifies the .JK resolves)
//   - equity-statements (heavy: pulls Yahoo timeseries + quoteSummary and
//                        writes the Supabase cache → this IS the pre-warm)
// Tags each name's coverage tier and writes scripts/data/idx-coverage.json.
//
// Usage:
//   node scripts/prewarm-equity.js                 # quote-only verify (fast)
//   node scripts/prewarm-equity.js --statements    # full pre-warm (slow)
//   node scripts/prewarm-equity.js --statements --conc 4 --limit 100
//
// Throttled on purpose (low concurrency + delay) so we don't get Yahoo to
// rate-limit Supabase's egress IP. The statements pass for ~900 names takes a
// while — run it in the background.

const fs = require("fs");
const path = require("path");

const SB = "https://adnubucjlezrtusbicja.supabase.co";
const ANON = "sb_publishable_vTzPWHQ1hn16NMQVmmxPZA_DgV41wt7";
const HDRS = { apikey: ANON, Authorization: "Bearer " + ANON };
const DATA_DIR = path.join(__dirname, "data");
const TICKERS_FILE = path.join(DATA_DIR, "idx-tickers.json");
const OUT_FILE = path.join(DATA_DIR, "idx-coverage.json");

const args = process.argv.slice(2);
const flag = (name) => args.includes("--" + name);
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const WANT_STATEMENTS = flag("statements");
const CONC = parseInt(opt("conc", "4"), 10);
const DELAY_MS = parseInt(opt("delay", "500"), 10);
const LIMIT = parseInt(opt("limit", "0"), 10);

const yt = (sym) => sym + ".JK";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, ms = 30000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: HDRS, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
  finally { clearTimeout(to); }
}

async function probe(sym) {
  const q = await getJSON(`${SB}/functions/v1/equity-quote?ticker=${encodeURIComponent(yt(sym))}`);
  const hasQuote = !!(q && q.ok && q.quote && q.quote.price != null);
  let hasStatements = false, sector = null, currency = q && q.quote ? q.quote.currency : null;
  if (WANT_STATEMENTS) {
    const s = await getJSON(`${SB}/functions/v1/equity-statements?ticker=${encodeURIComponent(yt(sym))}`, 60000);
    const doc = s && s.doc;
    if (doc) {
      sector = doc.snapshot && doc.snapshot.sector;
      const inc = doc.statements && doc.statements.annual && doc.statements.annual.income;
      hasStatements = !!(inc && Object.keys(inc).length > 0);
    }
  }
  const tier = hasStatements ? "full" : hasQuote ? "quote" : "none";
  return { sym, tier, hasQuote, hasStatements, sector, currency };
}

(async () => {
  if (!fs.existsSync(TICKERS_FILE)) {
    console.error(`Missing ${TICKERS_FILE}. Create it: a JSON array of IDX codes, e.g. ["BBCA","BBRI",...]`);
    process.exit(2);
  }
  let tickers = JSON.parse(fs.readFileSync(TICKERS_FILE, "utf8"));
  // accept either ["BBCA",...] or [{sym:"BBCA",...},...]
  tickers = tickers.map((t) => (typeof t === "string" ? t : t.sym)).filter(Boolean);
  if (LIMIT > 0) tickers = tickers.slice(0, LIMIT);

  console.log(`Pre-warming ${tickers.length} tickers · statements=${WANT_STATEMENTS} · conc=${CONC} · delay=${DELAY_MS}ms`);
  const results = [];
  let done = 0;
  for (let i = 0; i < tickers.length; i += CONC) {
    const batch = tickers.slice(i, i + CONC);
    const out = await Promise.all(batch.map(probe));
    results.push(...out);
    done += batch.length;
    const tally = results.reduce((a, r) => { a[r.tier] = (a[r.tier] || 0) + 1; return a; }, {});
    process.stdout.write(`\r${done}/${tickers.length}  full:${tally.full || 0} quote:${tally.quote || 0} none:${tally.none || 0}   `);
    if (i + CONC < tickers.length) await sleep(DELAY_MS);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 0));
  const tally = results.reduce((a, r) => { a[r.tier] = (a[r.tier] || 0) + 1; return a; }, {});
  console.log(`\nDONE → ${OUT_FILE}\n  full: ${tally.full || 0}  quote-only: ${tally.quote || 0}  none: ${tally.none || 0}`);
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
