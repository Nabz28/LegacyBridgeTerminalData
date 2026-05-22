// series-proxy — full-history time series on demand for the macro Dashboard
// detail modal + Live Markets deep-dive. One endpoint, three sources:
//   ?source=FRED|DBNOMICS|YAHOO & id=<series_id>
// Returns { obs: [{date, value}] } ascending (full history the API allows).
// FRED key stays server-side; DBnomics keyless; Yahoo dodges browser CORS.
// CORS-enabled (called from the browser), verify_jwt false (public data only).
//
// Project secret FRED_API_KEY (shared across functions) is reused.

const FRED_KEY = Deno.env.get("FRED_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

interface Obs { date: string; value: number }

function normPeriod(p: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  if (/^\d{4}-\d{2}$/.test(p)) return `${p}-01`;
  const q = p.match(/^(\d{4})-Q([1-4])$/);
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (/^\d{4}$/.test(p)) return `${p}-01-01`;
  return p;
}

async function fredObs(id: string): Promise<Obs[]> {
  const u = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}` +
    `&api_key=${FRED_KEY}&file_type=json&sort_order=asc`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`FRED ${id} HTTP ${r.status}`);
  const j = await r.json();
  return (j.observations ?? [])
    .filter((o: { value: string }) => o.value !== "." && o.value !== "")
    .map((o: { date: string; value: string }) => ({ date: o.date, value: Number(o.value) }));
}

async function dbnomicsObs(id: string): Promise<Obs[]> {
  const u = `https://api.db.nomics.world/v22/series/${id}?observations=1&limit=1`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`DBnomics ${id} HTTP ${r.status}`);
  const j = await r.json();
  const doc = j?.series?.docs?.[0];
  if (!doc) throw new Error(`DBnomics ${id} no-docs`);
  const periods: string[] = doc.period ?? [];
  const values: (number | null)[] = doc.value ?? [];
  const out: Obs[] = [];
  for (let i = 0; i < periods.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    out.push({ date: normPeriod(periods[i]), value: Number(v) });
  }
  return out;
}

async function yahooObs(ticker: string): Promise<Obs[]> {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=max`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LBC-series/1.0)" } });
  if (!r.ok) throw new Error(`Yahoo ${ticker} HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const ts: number[] = res?.timestamp ?? [];
  const close: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
  const out: Obs[] = [];
  for (let i = 0; i < ts.length; i++) {
    const v = close[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), value: Number(v) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const source = (url.searchParams.get("source") || "").toUpperCase();
  const id = url.searchParams.get("id") || "";
  if (!id) return json({ error: "missing id" }, 400);
  try {
    let obs: Obs[];
    if (source === "FRED") { if (!FRED_KEY) return json({ error: "FRED_API_KEY not set" }, 500); obs = await fredObs(id); }
    else if (source === "DBNOMICS") obs = await dbnomicsObs(id);
    else if (source === "YAHOO") obs = await yahooObs(id);
    else return json({ error: "source must be FRED|DBNOMICS|YAHOO" }, 400);
    return json({ source, id, count: obs.length, obs });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
