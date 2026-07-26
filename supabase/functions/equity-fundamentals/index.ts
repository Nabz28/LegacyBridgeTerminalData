// equity-fundamentals — company fundamentals on demand for the Equity terminal
// WACC calculator. One endpoint:
//   ?ticker=BBRI.JK   (Yahoo ticker; IDX names use the .JK suffix)
//
// Hits Yahoo's v10 quoteSummary, which now requires a crumb + cookie. We fetch
// the cookie + crumb server-side, then pull the modules a WACC needs and
// normalize them to a flat shape. CORS-enabled, verify_jwt false (public data).
//
// Everything is best-effort: if Yahoo blocks the crumb or a module is missing,
// we return { ok:false } and whatever partial fields we got — the client falls
// back to Damodaran defaults + manual override.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

// Pull `value` whether Yahoo returns a raw number or a {raw,fmt} envelope.
function num(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "object" && x !== null && "raw" in (x as Record<string, unknown>)) {
    const r = (x as { raw: unknown }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function str(x: unknown): string | null {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && "fmt" in (x as Record<string, unknown>)) {
    const f = (x as { fmt: unknown }).fmt;
    return typeof f === "string" ? f : null;
  }
  return null;
}

function setCookies(h: Headers): string {
  // Deno exposes getSetCookie(); fall back to the combined header otherwise.
  const arr = typeof (h as { getSetCookie?: () => string[] }).getSetCookie === "function"
    ? (h as { getSetCookie: () => string[] }).getSetCookie()
    : (h.get("set-cookie") ? [h.get("set-cookie") as string] : []);
  return arr.map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
}

// Fetch a Yahoo session cookie + crumb. Returns null if blocked.
async function yahooCreds(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const r1 = await fetch("https://fc.yahoo.com/", { headers: { "User-Agent": UA } });
    let cookie = setCookies(r1.headers);
    // Some regions hand the A1/A3 cookie from the consent host instead.
    if (!cookie) {
      const r1b = await fetch("https://finance.yahoo.com/", { headers: { "User-Agent": UA } });
      cookie = setCookies(r1b.headers);
    }
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, "Cookie": cookie, Accept: "text/plain" },
    });
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length > 40 || crumb.includes("<")) return cookie ? { cookie, crumb: "" } : null;
    return { cookie, crumb };
  } catch {
    return null;
  }
}

interface Fund {
  ticker: string;
  longName: string | null;
  currency: string | null;
  price: number | null;
  marketCap: number | null;
  sharesOutstanding: number | null;
  totalDebt: number | null;
  totalCash: number | null;
  yahooBeta: number | null;
  sector: string | null;
  industry: string | null;
  pretaxIncome: number | null;
  taxProvision: number | null;
  effectiveTaxRate: number | null;
  interestExpense: number | null;
  ebit: number | null;
  totalEquityBook: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
}

async function fetchFundamentals(ticker: string): Promise<{ ok: boolean; fundamentals: Partial<Fund>; error?: string }> {
  const creds = await yahooCreds();
  const modules =
    "price,summaryDetail,defaultKeyStatistics,financialData,incomeStatementHistory,balanceSheetHistory,assetProfile";
  const hosts = ["query2", "query1"];
  let lastErr = "";
  for (const host of hosts) {
    const u =
      `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}` +
      `?modules=${modules}&formatted=false&lang=en-US&region=US` +
      (creds?.crumb ? `&crumb=${encodeURIComponent(creds.crumb)}` : "");
    try {
      const r = await fetch(u, {
        headers: { "User-Agent": UA, Accept: "application/json", ...(creds?.cookie ? { Cookie: creds.cookie } : {}) },
      });
      if (!r.ok) { lastErr = `Yahoo ${host} HTTP ${r.status}`; continue; }
      const j = await r.json();
      const result = j?.quoteSummary?.result?.[0];
      if (!result) { lastErr = `Yahoo ${host} no-result`; continue; }

      const price = result.price ?? {};
      const sd = result.summaryDetail ?? {};
      const ks = result.defaultKeyStatistics ?? {};
      const fd = result.financialData ?? {};
      const profile = result.assetProfile ?? {};
      const inc = result.incomeStatementHistory?.incomeStatementHistory?.[0] ?? {};
      const bs = result.balanceSheetHistory?.balanceSheetStatements?.[0] ?? {};

      const pretax = num(inc.incomeBeforeTax);
      const taxProv = num(inc.incomeTaxExpense);
      let effTax: number | null = null;
      if (pretax && taxProv != null && pretax !== 0) {
        effTax = taxProv / pretax;
        if (!Number.isFinite(effTax) || effTax < 0) effTax = null;
        else if (effTax > 0.6) effTax = 0.6; // clamp pathological
      }

      const ltDebt = num(bs.longTermDebt);
      const stDebt = num(bs.shortLongTermDebt);
      const totalDebt = num(fd.totalDebt) ??
        (ltDebt != null || stDebt != null ? (ltDebt ?? 0) + (stDebt ?? 0) : null);

      const f: Partial<Fund> = {
        ticker,
        longName: str(price.longName) ?? str(price.shortName),
        currency: str(price.currency),
        price: num(price.regularMarketPrice) ?? num(fd.currentPrice),
        marketCap: num(price.marketCap) ?? num(sd.marketCap),
        sharesOutstanding: num(ks.sharesOutstanding) ?? num(price.sharesOutstanding),
        totalDebt,
        totalCash: num(fd.totalCash),
        yahooBeta: num(ks.beta) ?? num(sd.beta),
        sector: str(profile.sector),
        industry: str(profile.industry),
        pretaxIncome: pretax,
        taxProvision: taxProv,
        effectiveTaxRate: effTax,
        interestExpense: num(inc.interestExpense),
        ebit: num(inc.ebit),
        totalEquityBook: num(bs.totalStockholderEquity),
        trailingPE: num(sd.trailingPE) ?? num(ks.trailingPE),
        forwardPE: num(sd.forwardPE) ?? num(ks.forwardPE),
        priceToBook: num(ks.priceToBook),
        dividendYield: num(sd.dividendYield),
      };
      return { ok: true, fundamentals: f };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, fundamentals: { ticker }, error: lastErr || "fetch failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim();
  if (!ticker) return json({ ok: false, error: "missing ticker" }, 400);
  try {
    const out = await fetchFundamentals(ticker);
    return json(out, out.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
