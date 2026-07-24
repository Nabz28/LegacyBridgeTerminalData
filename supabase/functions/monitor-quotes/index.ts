// monitor-quotes — batched quotes for the MONITOR terminal (roadmap 0.6).
//   ?tickers=BBCA.JK,AAPL,7203.T   (max 60 per call)
// One client request replaces N; the server fans out to Yahoo v8 chart
// with a small concurrency cap. Same quote shape as equity-quote.
// CORS-enabled, verify_jwt false (public market data).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

const n = (x: unknown): number | null =>
  (typeof x === "number" && Number.isFinite(x)) ? x : null;

async function getQuote(ticker: string) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error("no result");
  const m = res.meta ?? {};
  const q = res.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = q.close ?? [];
  let li = -1;
  for (let i = closes.length - 1; i >= 0; i--) { if (closes[i] != null) { li = i; break; } }
  const at = (arr: (number | null)[] | undefined) => (li >= 0 && arr ? n(arr[li]) : null);
  const price = n(m.regularMarketPrice) ?? at(closes);
  // 5d window: second-to-last real close IS the prior session (this also
  // sidesteps the sparse-1y-array FX bug the per-ticker fn has).
  let prevClose: number | null = null;
  for (let i = li - 1; i >= 0; i--) { if (closes[i] != null) { prevClose = n(closes[i]); break; } }
  prevClose = prevClose ?? n(m.previousClose) ?? n(m.chartPreviousClose);
  const change = (price != null && prevClose != null) ? price - prevClose : null;
  return {
    ticker, currency: m.currency ?? null, price, prevClose,
    open: at(q.open), high: n(m.regularMarketDayHigh) ?? at(q.high), low: n(m.regularMarketDayLow) ?? at(q.low),
    volume: n(m.regularMarketVolume) ?? at(q.volume),
    change, changePct: (change != null && prevClose) ? (change / prevClose) * 100 : null,
    exchange: m.fullExchangeName ?? m.exchangeName ?? null,
    asOf: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const raw = (url.searchParams.get("tickers") || "").trim();
  if (!raw) return json({ ok: false, error: "missing tickers" }, 400);
  const tickers = [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 60);
  const quotes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  // fan out with a concurrency cap of 10
  let i = 0;
  async function worker() {
    while (i < tickers.length) {
      const t = tickers[i++];
      try { quotes[t] = await getQuote(t); }
      catch (e) { errors[t] = e instanceof Error ? e.message : String(e); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(10, tickers.length) }, worker));
  return json({ ok: true, quotes, errors });
});
