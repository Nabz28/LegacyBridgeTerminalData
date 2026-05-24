// equity-screen — batch-refresh the IDX screener dataset (public.equity_screen).
//   POST { rows: [{ symbol, yahoo, name, sector, sub_sector }, ...] }
// For each row it pulls one Yahoo quoteSummary (price + summaryDetail +
// defaultKeyStatistics + financialData), maps to the screen columns, and
// upserts into public.equity_screen with the service-role key (bypasses RLS).
// The client (Scanner UI) sends small chunks (~10) and loops to populate the
// universe — resumable, rate-limit-friendly. CORS-enabled, verify_jwt false.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x)) ? x : null;
const pct = (x: unknown): number | null => { const v = num(x); return v == null ? null : v * 100; };  // Yahoo decimals → %
const str = (x: unknown): string | null => (typeof x === "string" && x) ? x : null;

// ─── Yahoo crumb+cookie (shared once per invocation) ───
function setCookies(h: Headers): string {
  const arr = typeof (h as { getSetCookie?: () => string[] }).getSetCookie === "function"
    ? (h as { getSetCookie: () => string[] }).getSetCookie()
    : (h.get("set-cookie") ? [h.get("set-cookie") as string] : []);
  return arr.map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
}
async function yahooCreds(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const r1 = await fetch("https://fc.yahoo.com/", { headers: { "User-Agent": UA } });
    let cookie = setCookies(r1.headers);
    if (!cookie) { const r1b = await fetch("https://finance.yahoo.com/", { headers: { "User-Agent": UA } }); cookie = setCookies(r1b.headers); }
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie, Accept: "text/plain" } });
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length > 40 || crumb.includes("<")) return cookie ? { cookie, crumb: "" } : null;
    return { cookie, crumb };
  } catch { return null; }
}

type Row = { symbol: string; yahoo: string; name?: string; sector?: string; sub_sector?: string };

async function screenOne(row: Row, creds: { cookie: string; crumb: string } | null): Promise<Record<string, unknown> | null> {
  const modules = "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile";
  for (const host of ["query2", "query1"]) {
    const u = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(row.yahoo)}` +
      `?modules=${modules}&formatted=false&lang=en-US&region=US` + (creds?.crumb ? `&crumb=${encodeURIComponent(creds.crumb)}` : "");
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json", ...(creds?.cookie ? { Cookie: creds.cookie } : {}) } });
      if (!r.ok) continue;
      const j = await r.json();
      const res = j?.quoteSummary?.result?.[0];
      if (!res) continue;
      const price = res.price ?? {}, sd = res.summaryDetail ?? {}, ks = res.defaultKeyStatistics ?? {},
        fd = res.financialData ?? {}, prof = res.assetProfile ?? {};
      const px = num(price.regularMarketPrice) ?? num(fd.currentPrice);
      const avgVol = num(sd.averageDailyVolume10Day) ?? num(sd.averageVolume) ?? num(price.averageDailyVolume10Day);
      const shares = num(ks.sharesOutstanding) ?? num(price.sharesOutstanding);
      const float = num(ks.floatShares);
      const de = num(fd.debtToEquity);                      // Yahoo gives this as a % (debt as % of equity)
      return {
        symbol: row.symbol,
        yahoo: row.yahoo,
        name: row.name ?? str(price.longName) ?? str(price.shortName) ?? row.symbol,
        sector: row.sector ?? str(prof.sector) ?? null,
        sub_sector: row.sub_sector ?? str(prof.industry) ?? null,
        currency: str(price.currency),
        price: px,
        change_pct: pct(price.regularMarketChangePercent),
        mcap: num(price.marketCap) ?? num(sd.marketCap),
        shares_out: shares,
        free_float_pct: (float != null && shares) ? (float / shares) * 100 : null,
        adv_value: (avgVol != null && px != null) ? avgVol * px : null,
        avg_volume: avgVol,
        pe: num(sd.trailingPE) ?? num(ks.trailingPE),
        pb: num(ks.priceToBook),
        ps: num(sd.priceToSalesTrailing12Months),
        ev_ebitda: num(ks.enterpriseToEbitda),
        roe: pct(fd.returnOnEquity),
        roa: pct(fd.returnOnAssets),
        net_margin: pct(fd.profitMargins),
        gross_margin: pct(fd.grossMargins),
        rev_growth: pct(fd.revenueGrowth),
        earnings_growth: pct(fd.earningsGrowth) ?? pct(ks.earningsQuarterlyGrowth),
        debt_equity: de == null ? null : de / 100,          // → ratio
        current_ratio: num(fd.currentRatio),
        div_yield: pct(sd.dividendYield),
        beta: num(ks.beta) ?? num(sd.beta),
        w52_high: num(sd.fiftyTwoWeekHigh) ?? num(price.fiftyTwoWeekHigh),
        w52_low: num(sd.fiftyTwoWeekLow) ?? num(price.fiftyTwoWeekLow),
        updated_at: new Date().toISOString(),
      };
    } catch { /* next host */ }
  }
  return null;
}

// small concurrency map
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function upsert(rows: Record<string, unknown>[]): Promise<{ ok: boolean; status: number; text: string }> {
  const r = await fetch(`${SB_URL}/rest/v1/equity_screen`, {
    method: "POST",
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return { ok: r.ok, status: r.status, text: r.ok ? "" : await r.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST { rows: [...] }" }, 405);
  if (!SB_URL || !SVC) return json({ ok: false, error: "service role not configured" }, 500);
  let body: { rows?: Row[] };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const rows = Array.isArray(body.rows) ? body.rows.filter((r) => r && r.symbol && r.yahoo).slice(0, 40) : [];
  if (!rows.length) return json({ ok: false, error: "no rows" }, 400);
  try {
    const creds = await yahooCreds();
    const built = (await mapLimit(rows, 5, (row) => screenOne(row, creds))).filter(Boolean) as Record<string, unknown>[];
    let written = 0, writeErr = "";
    if (built.length) { const u = await upsert(built); if (u.ok) written = built.length; else writeErr = `upsert ${u.status} ${u.text.slice(0, 200)}`; }
    return json({
      ok: !writeErr, processed: rows.length, written,
      failed: rows.filter((r) => !built.some((b) => b.symbol === r.symbol)).map((r) => r.symbol),
      error: writeErr || undefined,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
