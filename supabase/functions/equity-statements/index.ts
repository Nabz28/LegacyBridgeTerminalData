// equity-statements — CIQ-style financial document for the Equity terminal.
//   ?ticker=BBRI.JK[&refresh=1]
//
// Serves a cached, merged financial document per ticker:
//   { symbol, currency, fetchedAt,
//     snapshot:   { price, marketCap, sharesOutstanding, totalDebt, totalCash,
//                   beta, sector, industry, longName },
//     estimates:  { trailingPE, forwardPE, targetMean/High/Low, recommendationKey,
//                   numberOfAnalystOpinions, earningsTrend:[...] },
//     statements: { annual:{income,balance,cashflow}, quarterly:{...} } }
//
// Data: Yahoo fundamentals-timeseries (statements — keyless) + quoteSummary
// (snapshot + estimates — needs a crumb+cookie). Cache lives in
// public.equity_statements_cache (JSONB, TOAST-compressed). On a miss or a
// row older than 7 days (or ?refresh=1) we re-fetch Yahoo and MERGE new periods
// into the stored statements so history accumulates over time.
//
// CORS-enabled, verify_jwt false (public fundamentals only). The cache is
// written under the service-role key (server-side) via PostgREST.

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// ─── Yahoo line-item universe (base keys; prefixed annual*/quarterly*) ───────
const INCOME_KEYS = [
  "TotalRevenue", "OperatingRevenue", "CostOfRevenue", "GrossProfit", "OperatingExpense",
  "SellingGeneralAndAdministration", "ResearchAndDevelopment", "OperatingIncome",
  "NetNonOperatingInterestIncomeExpense", "InterestIncome", "InterestExpense", "NetInterestIncome",
  "OtherIncomeExpense", "PretaxIncome", "TaxProvision", "NetIncomeContinuousOperations",
  "NetIncome", "NetIncomeCommonStockholders", "MinorityInterests", "BasicEPS", "DilutedEPS",
  "BasicAverageShares", "DilutedAverageShares", "TotalExpenses", "EBIT", "EBITDA",
  "ReconciledDepreciation", "ReconciledCostOfRevenue", "NormalizedIncome", "NormalizedEBITDA",
  "TotalOperatingIncomeAsReported",
];
const BALANCE_KEYS = [
  "TotalAssets", "CurrentAssets", "CashAndCashEquivalents", "CashCashEquivalentsAndShortTermInvestments",
  "OtherShortTermInvestments", "Receivables", "AccountsReceivable", "Inventory", "OtherCurrentAssets",
  "TotalNonCurrentAssets", "NetPPE", "GrossPPE", "Goodwill", "GoodwillAndOtherIntangibleAssets",
  "InvestmentsAndAdvances", "TotalLiabilitiesNetMinorityInterest", "CurrentLiabilities", "AccountsPayable",
  "CurrentDebt", "CurrentDebtAndCapitalLeaseObligation", "OtherCurrentLiabilities",
  "TotalNonCurrentLiabilitiesNetMinorityInterest", "LongTermDebt", "LongTermDebtAndCapitalLeaseObligation",
  "TotalDebt", "NetDebt", "CommonStockEquity", "StockholdersEquity", "TotalEquityGrossMinorityInterest",
  "MinorityInterest", "RetainedEarnings", "CapitalStock", "CommonStock", "AdditionalPaidInCapital",
  "TreasuryStock", "TotalCapitalization", "InvestedCapital", "WorkingCapital", "TangibleBookValue",
  "NetTangibleAssets", "ShareIssued", "OrdinarySharesNumber",
];
const CASHFLOW_KEYS = [
  "OperatingCashFlow", "CashFlowFromContinuingOperatingActivities", "NetIncomeFromContinuingOperations",
  "DepreciationAmortizationDepletion", "DepreciationAndAmortization", "ChangeInWorkingCapital",
  "ChangesInAccountReceivables", "ChangeInInventory", "ChangeInPayablesAndAccruedExpense",
  "StockBasedCompensation", "InvestingCashFlow", "CapitalExpenditure", "NetPPEPurchaseAndSale",
  "PurchaseOfInvestment", "SaleOfInvestment", "FinancingCashFlow", "NetIssuancePaymentsOfDebt",
  "NetLongTermDebtIssuance", "NetCommonStockIssuance", "RepurchaseOfCapitalStock", "CommonStockDividendPaid",
  "CashDividendsPaid", "NetOtherFinancingCharges", "EndCashPosition", "BeginningCashPosition",
  "ChangesInCash", "FreeCashFlow", "RepaymentOfDebt", "IssuanceOfDebt", "IssuanceOfCapitalStock",
];
const STATEMENTS: Array<["income" | "balance" | "cashflow", string[]]> = [
  ["income", INCOME_KEYS], ["balance", BALANCE_KEYS], ["cashflow", CASHFLOW_KEYS],
];

type Series = Record<string, Record<string, number>>; // baseKey -> { asOfDate -> value }
interface FreqBlock { income: Series; balance: Series; cashflow: Series }
interface Statements { annual: FreqBlock; quarterly: FreqBlock }

const emptyFreq = (): FreqBlock => ({ income: {}, balance: {}, cashflow: {} });
const emptyStatements = (): Statements => ({ annual: emptyFreq(), quarterly: emptyFreq() });

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

// ─── fundamentals-timeseries (statements; no crumb needed) ───────────────────
// Yahoo TRUNCATES history to the latest period when too many `type=` keys are
// requested at once, so we chunk the keys into small parallel requests.
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
async function fetchStatements(ticker: string): Promise<Statements> {
  const out = emptyStatements();
  const p2 = Math.floor(Date.now() / 1000);
  const p1 = p2 - 60 * 60 * 24 * 365 * 6; // ~6 years back
  const jobs: Promise<void>[] = [];
  // CRITICAL: request annual and quarterly SEPARATELY — Yahoo truncates annual
  // history to the latest period when annual* and quarterly* types are mixed in
  // one request.
  for (const [stmt, keys] of STATEMENTS) {
    for (const freq of ["annual", "quarterly"] as const) {
      for (const grp of chunk(keys, 15)) {
      const types = grp.map((k) => `${freq}${k}`).join(",");
      const u = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(ticker)}` +
        `?symbol=${encodeURIComponent(ticker)}&type=${types}&period1=${p1}&period2=${p2}` +
        `&merge=false&padTimeSeries=true&lang=en-US&region=US`;
      jobs.push((async () => {
        try {
          const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
          if (!r.ok) return;
          const j = await r.json();
          const results: Array<Record<string, unknown>> = j?.timeseries?.result ?? [];
          for (const res of results) {
            const meta = res.meta as { type?: string[] } | undefined;
            const fullType = meta?.type?.[0];
            if (!fullType) continue;
            const isAnnual = fullType.startsWith("annual");
            const base = fullType.replace(/^annual|^quarterly|^trailing/, "");
            const arr = res[fullType];
            if (!Array.isArray(arr)) continue;
            const dst = (isAnnual ? out.annual : out.quarterly)[stmt];
            for (const pt of arr) {
              if (!pt || typeof pt !== "object") continue;
              const asOf = (pt as { asOfDate?: string }).asOfDate;
              const v = num((pt as { reportedValue?: unknown }).reportedValue);
              if (asOf && v !== null) { (dst[base] ??= {})[asOf] = v; }
            }
          }
        } catch { /* skip this chunk on error */ }
      })());
      }
    }
  }
  await Promise.all(jobs);
  return out;
}

// ─── quoteSummary (snapshot + estimates; needs crumb+cookie) ─────────────────
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
async function fetchSnapshot(ticker: string): Promise<{ snapshot: Record<string, unknown>; estimates: Record<string, unknown>; currency: string | null }> {
  const creds = await yahooCreds();
  const modules = "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile,earningsTrend,recommendationTrend";
  const snapshot: Record<string, unknown> = {};
  const estimates: Record<string, unknown> = {};
  let currency: string | null = null;
  for (const host of ["query2", "query1"]) {
    const u = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}` +
      `?modules=${modules}&formatted=false&lang=en-US&region=US` + (creds?.crumb ? `&crumb=${encodeURIComponent(creds.crumb)}` : "");
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json", ...(creds?.cookie ? { Cookie: creds.cookie } : {}) } });
      if (!r.ok) continue;
      const j = await r.json();
      const res = j?.quoteSummary?.result?.[0];
      if (!res) continue;
      const price = res.price ?? {}, sd = res.summaryDetail ?? {}, ks = res.defaultKeyStatistics ?? {},
        fd = res.financialData ?? {}, prof = res.assetProfile ?? {};
      currency = str(price.currency);
      snapshot.longName = str(price.longName) ?? str(price.shortName);
      snapshot.currency = currency;
      snapshot.price = num(price.regularMarketPrice) ?? num(fd.currentPrice);
      snapshot.marketCap = num(price.marketCap) ?? num(sd.marketCap);
      snapshot.sharesOutstanding = num(ks.sharesOutstanding) ?? num(price.sharesOutstanding);
      snapshot.totalDebt = num(fd.totalDebt);
      snapshot.totalCash = num(fd.totalCash);
      snapshot.beta = num(ks.beta) ?? num(sd.beta);
      snapshot.sector = str(prof.sector);
      snapshot.industry = str(prof.industry);
      estimates.trailingPE = num(sd.trailingPE);
      estimates.forwardPE = num(sd.forwardPE) ?? num(ks.forwardPE);
      estimates.targetMean = num(fd.targetMeanPrice);
      estimates.targetHigh = num(fd.targetHighPrice);
      estimates.targetLow = num(fd.targetLowPrice);
      estimates.recommendationKey = str(fd.recommendationKey);
      estimates.recommendationMean = num(fd.recommendationMean);
      estimates.numberOfAnalystOpinions = num(fd.numberOfAnalystOpinions);
      const trend = res.earningsTrend?.trend;
      if (Array.isArray(trend)) {
        estimates.earningsTrend = trend.map((t: Record<string, unknown>) => ({
          period: t.period, endDate: t.endDate,
          growth: num(t.growth),
          epsAvg: num((t.earningsEstimate as Record<string, unknown>)?.avg),
          epsLow: num((t.earningsEstimate as Record<string, unknown>)?.low),
          epsHigh: num((t.earningsEstimate as Record<string, unknown>)?.high),
          revAvg: num((t.revenueEstimate as Record<string, unknown>)?.avg),
          revGrowth: num((t.revenueEstimate as Record<string, unknown>)?.growth),
        }));
      }
      break; // success on this host
    } catch { /* try next host */ }
  }
  return { snapshot, estimates, currency };
}

// ─── cache (PostgREST under service role) ───────────────────────────────────
const restHeaders = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
async function readCache(symbol: string): Promise<{ doc: Record<string, unknown>; fetched_at: string } | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/equity_statements_cache?symbol=eq.${encodeURIComponent(symbol)}&select=doc,fetched_at`, { headers: restHeaders });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0] ?? null;
  } catch { return null; }
}
async function writeCache(symbol: string, doc: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await fetch(`${SB_URL}/rest/v1/equity_statements_cache`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ symbol, doc, fetched_at: now, updated_at: now }]),
  });
}

// Merge new statement series into the stored ones (union of asOfDate per key).
function mergeStatements(oldS: Statements | undefined, neu: Statements): Statements {
  if (!oldS) return neu;
  const mergeFreq = (a: FreqBlock, b: FreqBlock): FreqBlock => {
    const out = emptyFreq();
    for (const stmt of ["income", "balance", "cashflow"] as const) {
      const merged: Series = {};
      for (const src of [a[stmt] || {}, b[stmt] || {}]) {
        for (const [k, byDate] of Object.entries(src)) {
          merged[k] = { ...(merged[k] || {}), ...byDate };
        }
      }
      out[stmt] = merged;
    }
    return out;
  };
  return { annual: mergeFreq(oldS.annual, neu.annual), quarterly: mergeFreq(oldS.quarterly, neu.quarterly) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "").trim();
  const refresh = url.searchParams.get("refresh") === "1";
  if (!ticker) return json({ ok: false, error: "missing ticker" }, 400);

  const cached = await readCache(ticker);
  if (cached && !refresh) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < FRESH_MS) return json({ ok: true, cached: true, fetchedAt: cached.fetched_at, doc: cached.doc });
  }

  try {
    const [statements, snap] = await Promise.all([fetchStatements(ticker), fetchSnapshot(ticker)]);
    const merged = mergeStatements(cached?.doc?.statements as Statements | undefined, statements);
    const doc = {
      symbol: ticker,
      currency: snap.currency,
      fetchedAt: new Date().toISOString(),
      snapshot: snap.snapshot,
      estimates: snap.estimates,
      statements: merged,
    };
    await writeCache(ticker, doc);
    return json({ ok: true, cached: false, fetchedAt: doc.fetchedAt, doc });
  } catch (e) {
    // On a live-fetch failure, fall back to stale cache if we have one.
    if (cached) return json({ ok: true, cached: true, stale: true, fetchedAt: cached.fetched_at, doc: cached.doc });
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
