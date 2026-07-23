// monitor-bars — OHLCV daily bars for the MONITOR terminal's volume/flow
// analytics (keyless Yahoo v8 chart; series-proxy only exposes closes).
//   ?ticker=BBCA.JK&range=3mo&interval=1d
// Returns { ok, ticker, bars: [{date, o, h, l, c, v}] } ascending.
// CORS-enabled, verify_jwt false (public market data only).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

const num = (x: unknown): number | null =>
  (typeof x === "number" && Number.isFinite(x)) ? x : null;

async function getBars(ticker: string, range: string, interval: string) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Yahoo ${ticker} HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error("no result");
  const ts: number[] = res.timestamp ?? [];
  const q = res.indicators?.quote?.[0] ?? {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const c = num(q.close?.[i]);
    if (c == null) continue;
    bars.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      o: num(q.open?.[i]), h: num(q.high?.[i]), l: num(q.low?.[i]),
      c, v: num(q.volume?.[i]),
    });
  }
  return bars;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim();
  if (!ticker) return json({ ok: false, error: "missing ticker" }, 400);
  const range = url.searchParams.get("range") || "3mo";
  const interval = url.searchParams.get("interval") || "1d";
  try {
    return json({ ok: true, ticker, bars: await getBars(ticker, range, interval) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
