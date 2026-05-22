// am-marks — daily EOD marks for The Book (asset_mgmt).
//
// Reads open positions, fetches a last price per symbol from Yahoo Finance
// chart v8 (one source for US equities, IDX via .JK, crypto via -USD, FX via
// =X), and upserts asset_mgmt.quotes (native currency). Also refreshes a
// USD-pivot set of fx_rates and writes a best-effort per-fund NAV snapshot
// for TWR. Invoked daily by pg_cron (migration 0023) and callable on demand.
// Manual marks (the ◷ button in the UI) remain as an override.
//
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. No other secrets.

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Currencies we keep a USD-pivot rate for (pair 'USD<ccy>' = <ccy> per 1 USD).
const FX_CCYS = ["IDR", "CNY", "SGD", "EUR", "JPY", "GBP", "HKD", "AUD", "INR", "MYR"];

const today = () => new Date().toISOString().slice(0, 10);

interface Pos {
  symbol: string; exchange: string | null; asset_class: string; currency: string;
  quantity: number; avg_cost: number; direction: string; fund_id: string;
}

async function sbGet(path: string): Promise<unknown[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Accept-Profile": "asset_mgmt" },
  });
  if (!r.ok) throw new Error(`GET ${path} HTTP ${r.status}`);
  return r.json();
}

async function sbUpsert(table: string, rows: unknown[], onConflict: string) {
  if (!rows.length) return;
  const r = await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json", "Content-Profile": "asset_mgmt",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert ${table} HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// Map a position to its Yahoo Finance ticker.
function yahooTicker(p: Pos): string {
  const sym = (p.symbol || "").toUpperCase().trim();
  if (p.asset_class === "crypto") return `${sym}-USD`;
  if (p.asset_class === "fx") return `${sym}=X`;            // e.g. EURUSD=X, USDIDR=X
  const isIDX = (p.exchange || "").toUpperCase() === "IDX" || p.currency === "IDR";
  return isIDX ? `${sym}.JK` : sym;                          // IDX .JK, else US/global
}

async function yahooQuote(ticker: string): Promise<{ last: number | null; currency: string | null }> {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LBC-marks/1.0)" } });
  if (!r.ok) throw new Error(`yahoo ${ticker} HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const meta = res?.meta;
  if (!meta) throw new Error(`yahoo ${ticker} no-meta`);
  const last = (meta.regularMarketPrice ?? meta.previousClose ?? null) as number | null;
  return { last, currency: (meta.currency as string) || null };
}

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}

Deno.serve(async () => {
  if (!SB_URL || !SB_SERVICE) {
    return new Response(JSON.stringify({ ok: false, error: "missing SUPABASE_* env" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const stamp = today();
  const errors: Record<string, string> = {};

  // ---- 1. FX rates (USD-pivot) ----------------------------------------
  const fxRows: unknown[] = [];
  const fxMap: Record<string, number> = { USD: 1 };
  for (const c of FX_CCYS) {
    try {
      const q = await withRetry(() => yahooQuote(`USD${c}=X`));
      if (q.last != null) { fxRows.push({ pair: `USD${c}`, rate: q.last, as_of: stamp }); fxMap[c] = q.last; }
    } catch (e) { errors[`fx_USD${c}`] = e instanceof Error ? e.message : String(e); }
    await new Promise((r) => setTimeout(r, 60));
  }
  try { await sbUpsert("fx_rates", fxRows, "pair,as_of"); } catch (e) { errors["fx_upsert"] = e instanceof Error ? e.message : String(e); }

  // ---- 2. Marks for open positions ------------------------------------
  let positions: Pos[] = [];
  try { positions = (await sbGet("positions?select=symbol,exchange,asset_class,currency,quantity,avg_cost,direction,fund_id&status=eq.open")) as Pos[]; }
  catch (e) { errors["positions_read"] = e instanceof Error ? e.message : String(e); }

  // unique by symbol+exchange (one quote row per traded instrument)
  const seen = new Set<string>();
  const quoteRows: unknown[] = [];
  const lastBySym: Record<string, { last: number; ccy: string }> = {};
  for (const p of positions) {
    const key = `${(p.symbol || "").toUpperCase()}|${p.exchange || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const q = await withRetry(() => yahooQuote(yahooTicker(p)));
      if (q.last != null) {
        const ccy = q.currency || p.currency || "USD";
        quoteRows.push({ symbol: (p.symbol || "").toUpperCase(), exchange: p.exchange || "", last: q.last, currency: ccy, as_of: stamp });
        lastBySym[(p.symbol || "").toUpperCase()] = { last: q.last, ccy };
      }
    } catch (e) { errors[`mark_${p.symbol}`] = e instanceof Error ? e.message : String(e); }
    await new Promise((r) => setTimeout(r, 90));
  }
  try { await sbUpsert("quotes", quoteRows, "symbol,exchange,as_of"); } catch (e) { errors["quotes_upsert"] = e instanceof Error ? e.message : String(e); }

  // ---- 3. Best-effort per-fund NAV snapshot (USD base) -----------------
  // value any ccy in USD: amount / fxMap[ccy] (fxMap[ccy] = ccy per USD).
  const toUsd = (amt: number, ccy: string) => {
    const r = fxMap[ccy];
    return r ? amt / r : (ccy === "USD" ? amt : NaN);
  };
  try {
    const cash = (await sbGet("cash_ledger?select=fund_id,currency,amount")) as { fund_id: string; currency: string; amount: number }[];
    const funds = [...new Set([...positions.map((p) => p.fund_id), ...cash.map((c) => c.fund_id)])];
    const navRows: unknown[] = [];
    for (const f of funds) {
      let posVal = 0, cashVal = 0;
      for (const p of positions.filter((x) => x.fund_id === f)) {
        const m = lastBySym[(p.symbol || "").toUpperCase()];
        const px = m ? m.last : p.avg_cost;
        const ccy = m ? m.ccy : p.currency;
        const v = toUsd(px * p.quantity, ccy);
        if (!Number.isNaN(v)) posVal += v;
      }
      for (const c of cash.filter((x) => x.fund_id === f)) {
        const v = toUsd(Number(c.amount), c.currency);
        if (!Number.isNaN(v)) cashVal += v;
      }
      navRows.push({ fund_id: f, as_of: stamp, nav: Number((posVal + cashVal).toFixed(2)), cash: Number(cashVal.toFixed(2)), positions_value: Number(posVal.toFixed(2)) });
    }
    await sbUpsert("nav_snapshots", navRows, "fund_id,as_of");
  } catch (e) { errors["nav_snapshot"] = e instanceof Error ? e.message : String(e); }

  return new Response(JSON.stringify({
    ok: true, as_of: stamp, fx: fxRows.length, marks: quoteRows.length, positions: positions.length, errors,
  }), { headers: { "Content-Type": "application/json" } });
});
