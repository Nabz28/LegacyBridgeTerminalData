// equity-quote — fresh EOD/delayed quote for IDX names (keyless Yahoo chart v8).
//   ?ticker=BBCA.JK
// Returns the latest session quote — kept SEPARATE from the 7-day
// equity-statements cache so the header price is never stale. No crumb needed
// (the v8 chart endpoint is keyless). CORS-enabled, verify_jwt false.

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
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Yahoo ${ticker} HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error("no result");
  const m = res.meta ?? {};
  const q = res.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = q.close ?? [];
  // last bar that actually has a close (today's or most recent session)
  let li = -1;
  for (let i = closes.length - 1; i >= 0; i--) { if (closes[i] != null) { li = i; break; } }
  const at = (arr: (number | null)[] | undefined) => (li >= 0 && arr ? n(arr[li]) : null);

  const price = n(m.regularMarketPrice) ?? at(closes);
  // Prior-session close = the second-to-last daily bar. (meta.chartPreviousClose
  // on a 1y range is the close BEFORE the window — ~1 year ago — which would
  // give a nonsensical daily change, so only use it as a last resort.)
  const prevClose = (li >= 1 ? n(closes[li - 1]) : null) ?? n(m.previousClose) ?? n(m.chartPreviousClose);
  const change = (price != null && prevClose != null) ? price - prevClose : null;
  return {
    ticker,
    currency: m.currency ?? null,
    price,
    prevClose,
    open: at(q.open),
    high: n(m.regularMarketDayHigh) ?? at(q.high),
    low: n(m.regularMarketDayLow) ?? at(q.low),
    volume: n(m.regularMarketVolume) ?? at(q.volume),
    change,
    changePct: (change != null && prevClose) ? (change / prevClose) * 100 : null,
    fiftyTwoWeekHigh: n(m.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: n(m.fiftyTwoWeekLow),
    exchange: m.fullExchangeName ?? m.exchangeName ?? null,
    marketState: m.marketState ?? null,
    asOf: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim();
  if (!ticker) return json({ ok: false, error: "missing ticker" }, 400);
  try {
    return json({ ok: true, quote: await getQuote(ticker) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
