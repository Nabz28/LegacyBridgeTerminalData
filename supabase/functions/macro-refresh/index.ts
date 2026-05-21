// macro-refresh — daily live macro dashboard refresh.
//
// Pulls a curated catalog of indicators from FRED (fresh US/global daily +
// monthly) and DBnomics (CN/ID series FRED lacks or freezes), computes the
// display value / prior value / change / sparkline, and upserts them into
// macro.live_indicators. Invoked daily by pg_cron (see migration 0009) and
// callable on demand. Writes with the service role (RLS/grants bypassed).
//
// Secrets: FRED_API_KEY. Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const FRED_KEY = Deno.env.get("FRED_API_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Transform = "level" | "yoy";
interface Ind {
  key: string; region: string; category: string; label: string;
  unit: string; source: "FRED" | "DBnomics"; series_id: string;
  transform: Transform; freq: string; sort: number;
}

const CATALOG: Ind[] = [
  // ---- GLOBAL / US (FRED) ----
  { key: "us_10y", region: "global", category: "rates", label: "US 10Y Treasury", unit: "%", source: "FRED", series_id: "DGS10", transform: "level", freq: "daily", sort: 1 },
  { key: "us_2s10s", region: "global", category: "rates", label: "2s10s Spread", unit: "%", source: "FRED", series_id: "T10Y2Y", transform: "level", freq: "daily", sort: 2 },
  { key: "us_30y", region: "global", category: "rates", label: "US 30Y Treasury", unit: "%", source: "FRED", series_id: "DGS30", transform: "level", freq: "daily", sort: 3 },
  { key: "us_fed_funds", region: "global", category: "rates", label: "Fed Funds Rate", unit: "%", source: "FRED", series_id: "DFF", transform: "level", freq: "daily", sort: 4 },
  { key: "us_cpi", region: "global", category: "inflation", label: "US CPI", unit: "%", source: "FRED", series_id: "CPIAUCSL", transform: "yoy", freq: "monthly", sort: 5 },
  { key: "us_core_cpi", region: "global", category: "inflation", label: "US Core CPI", unit: "%", source: "FRED", series_id: "CPILFESL", transform: "yoy", freq: "monthly", sort: 6 },
  { key: "us_5y_be", region: "global", category: "inflation", label: "5Y Inflation Breakeven", unit: "%", source: "FRED", series_id: "T5YIE", transform: "level", freq: "daily", sort: 7 },
  { key: "us_unrate", region: "global", category: "labor", label: "US Unemployment", unit: "%", source: "FRED", series_id: "UNRATE", transform: "level", freq: "monthly", sort: 8 },
  { key: "us_payrolls", region: "global", category: "labor", label: "Nonfarm Payrolls", unit: "k", source: "FRED", series_id: "PAYEMS", transform: "level", freq: "monthly", sort: 9 },
  { key: "us_gdp", region: "global", category: "growth", label: "US Real GDP", unit: "$bn", source: "FRED", series_id: "GDPC1", transform: "level", freq: "quarterly", sort: 10 },
  { key: "sp500", region: "global", category: "markets", label: "S&P 500", unit: "", source: "FRED", series_id: "SP500", transform: "level", freq: "daily", sort: 11 },
  { key: "vix", region: "global", category: "markets", label: "VIX", unit: "", source: "FRED", series_id: "VIXCLS", transform: "level", freq: "daily", sort: 12 },
  { key: "wti", region: "global", category: "markets", label: "WTI Crude", unit: "$", source: "FRED", series_id: "DCOILWTICO", transform: "level", freq: "daily", sort: 13 },
  { key: "usd_index", region: "global", category: "fx", label: "USD Broad Index", unit: "idx", source: "FRED", series_id: "DTWEXBGS", transform: "level", freq: "daily", sort: 14 },

  // ---- CHINA (FRED) ----
  { key: "cn_cpi", region: "china", category: "inflation", label: "China CPI", unit: "%", source: "FRED", series_id: "CHNCPIALLMINMEI", transform: "yoy", freq: "monthly", sort: 1 },
  { key: "cn_3m", region: "china", category: "rates", label: "China 3M Interbank", unit: "%", source: "FRED", series_id: "IR3TIB01CNM156N", transform: "level", freq: "monthly", sort: 2 },
  { key: "cn_discount", region: "china", category: "rates", label: "China Discount Rate", unit: "%", source: "FRED", series_id: "INTDSRCNM193N", transform: "level", freq: "monthly", sort: 3 },
  { key: "cn_exports", region: "china", category: "trade", label: "China Exports", unit: "%", source: "FRED", series_id: "XTEXVA01CNM664S", transform: "yoy", freq: "monthly", sort: 4 },

  // ---- INDONESIA (FRED + DBnomics) ----
  { key: "id_cpi", region: "indonesia", category: "inflation", label: "Indonesia CPI", unit: "%", source: "FRED", series_id: "IDNCPIALLMINMEI", transform: "yoy", freq: "monthly", sort: 1 },
  { key: "id_idr", region: "indonesia", category: "fx", label: "IDR / USD", unit: "Rp", source: "FRED", series_id: "CCUSMA02IDM618N", transform: "level", freq: "monthly", sort: 2 },
  { key: "id_policy", region: "indonesia", category: "rates", label: "BI Policy Rate", unit: "%", source: "DBnomics", series_id: "IMF/IFS/M.ID.FPOLM_PA", transform: "level", freq: "monthly", sort: 3 },

  // ---- GLOBAL FX majors (FRED, daily) ----
  { key: "eur_usd", region: "global", category: "fx", label: "EUR / USD", unit: "", source: "FRED", series_id: "DEXUSEU", transform: "level", freq: "daily", sort: 15 },
  { key: "jpy_usd", region: "global", category: "fx", label: "USD / JPY", unit: "", source: "FRED", series_id: "DEXJPUS", transform: "level", freq: "daily", sort: 16 },
  { key: "cny_usd", region: "global", category: "fx", label: "USD / CNY", unit: "", source: "FRED", series_id: "DEXCHUS", transform: "level", freq: "daily", sort: 17 },
  { key: "gbp_usd", region: "global", category: "fx", label: "GBP / USD", unit: "", source: "FRED", series_id: "DEXUSUK", transform: "level", freq: "daily", sort: 18 },

  // ---- COMMODITIES · Energy (FRED, daily/weekly) ----
  { key: "brent", region: "commodities", category: "energy", label: "Brent Crude", unit: "$", source: "FRED", series_id: "DCOILBRENTEU", transform: "level", freq: "daily", sort: 1 },
  { key: "natgas", region: "commodities", category: "energy", label: "Natural Gas · Henry Hub", unit: "$", source: "FRED", series_id: "DHHNGSP", transform: "level", freq: "daily", sort: 2 },
  { key: "gasoline", region: "commodities", category: "energy", label: "US Gasoline", unit: "$", source: "FRED", series_id: "GASREGW", transform: "level", freq: "weekly", sort: 3 },
  { key: "heating_oil", region: "commodities", category: "energy", label: "Heating Oil", unit: "$", source: "FRED", series_id: "DHOILNYH", transform: "level", freq: "daily", sort: 4 },
  { key: "diesel", region: "commodities", category: "energy", label: "US Diesel", unit: "$", source: "FRED", series_id: "GASDESW", transform: "level", freq: "weekly", sort: 5 },

  // ---- COMMODITIES · Agriculture (FRED / IMF global, monthly) ----
  { key: "corn", region: "commodities", category: "agriculture", label: "Corn · $/mt", unit: "", source: "FRED", series_id: "PMAIZMTUSDM", transform: "level", freq: "monthly", sort: 10 },
  { key: "wheat", region: "commodities", category: "agriculture", label: "Wheat · $/mt", unit: "", source: "FRED", series_id: "PWHEAMTUSDM", transform: "level", freq: "monthly", sort: 11 },
  { key: "soybeans", region: "commodities", category: "agriculture", label: "Soybeans · $/mt", unit: "", source: "FRED", series_id: "PSOYBUSDM", transform: "level", freq: "monthly", sort: 12 },
  { key: "coffee", region: "commodities", category: "agriculture", label: "Coffee · ¢/lb", unit: "", source: "FRED", series_id: "PCOFFOTMUSDM", transform: "level", freq: "monthly", sort: 13 },
  { key: "sugar", region: "commodities", category: "agriculture", label: "Sugar · ¢/lb", unit: "", source: "FRED", series_id: "PSUGAISAUSDM", transform: "level", freq: "monthly", sort: 14 },
  { key: "cotton", region: "commodities", category: "agriculture", label: "Cotton · ¢/lb", unit: "", source: "FRED", series_id: "PCOTTINDUSDM", transform: "level", freq: "monthly", sort: 15 },

  // ---- COMMODITIES · Metals (FRED + DBnomics, monthly) ----
  { key: "gold", region: "commodities", category: "metals", label: "Gold · $/oz", unit: "$", source: "DBnomics", series_id: "IMF/PCPS/M.W00.PGOLD.USD", transform: "level", freq: "monthly", sort: 20 },
  { key: "silver", region: "commodities", category: "metals", label: "Silver · $/oz", unit: "$", source: "DBnomics", series_id: "IMF/PCPS/M.W00.PSILVER.USD", transform: "level", freq: "monthly", sort: 21 },
  { key: "copper", region: "commodities", category: "metals", label: "Copper · $/mt", unit: "$", source: "FRED", series_id: "PCOPPUSDM", transform: "level", freq: "monthly", sort: 22 },
  { key: "aluminum", region: "commodities", category: "metals", label: "Aluminum · $/mt", unit: "$", source: "FRED", series_id: "PALUMUSDM", transform: "level", freq: "monthly", sort: 23 },
  { key: "nickel", region: "commodities", category: "metals", label: "Nickel · $/mt", unit: "$", source: "FRED", series_id: "PNICKUSDM", transform: "level", freq: "monthly", sort: 24 },
  { key: "zinc", region: "commodities", category: "metals", label: "Zinc · $/mt", unit: "$", source: "FRED", series_id: "PZINCUSDM", transform: "level", freq: "monthly", sort: 25 },
  { key: "iron_ore", region: "commodities", category: "metals", label: "Iron Ore · $/dmt", unit: "$", source: "FRED", series_id: "PIORECRUSDM", transform: "level", freq: "monthly", sort: 26 },
];

// DBnomics periods come as YYYY (annual), YYYY-MM (monthly), YYYY-Qn
// (quarterly) or YYYY-MM-DD (daily). Coerce to a real calendar date.
function normPeriod(p: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  if (/^\d{4}-\d{2}$/.test(p)) return `${p}-01`;
  const q = p.match(/^(\d{4})-Q([1-4])$/);
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (/^\d{4}$/.test(p)) return `${p}-01-01`;
  return p;
}

interface Obs { date: string; value: number } // newest first

async function fredObs(seriesId: string): Promise<Obs[]> {
  const u = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=420`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`FRED ${seriesId} HTTP ${r.status}`);
  const j = await r.json();
  return (j.observations ?? [])
    .filter((o: { value: string }) => o.value !== "." && o.value !== "")
    .map((o: { date: string; value: string }) => ({ date: o.date, value: Number(o.value) }));
}

async function dbnomicsObs(seriesPath: string): Promise<Obs[]> {
  const u = `https://api.db.nomics.world/v22/series/${seriesPath}?observations=1&limit=1`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`DBnomics ${seriesPath} HTTP ${r.status}`);
  const j = await r.json();
  const doc = j?.series?.docs?.[0];
  if (!doc) throw new Error(`DBnomics ${seriesPath} no-docs`);
  const periods: string[] = doc.period ?? [];
  const values: (number | null)[] = doc.value ?? [];
  const out: Obs[] = [];
  for (let i = periods.length - 1; i >= 0; i--) {            // chronological -> newest first
    const v = values[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    out.push({ date: normPeriod(periods[i]), value: Number(v) });
  }
  return out;
}

const sparkLen = (freq: string) => (freq === "daily" ? 60 : freq === "weekly" ? 40 : freq === "quarterly" ? 16 : 24);

// Build the upsert row for one indicator from its (newest-first) observations.
function buildRow(ind: Ind, obs: Obs[]) {
  const now = new Date().toISOString();
  const base = {
    key: ind.key, region: ind.region, category: ind.category, label: ind.label,
    unit: ind.unit, source: ind.source, series_id: ind.series_id,
    transform: ind.transform, freq: ind.freq, sort_order: ind.sort, updated_at: now,
  };
  if (!obs.length) return { ...base, latest_date: null, latest_value: null, prev_value: null, change_abs: null, change_pct: null, spark: [] };

  if (ind.transform === "yoy") {
    // monthly: YoY = v[i] / v[i+12] - 1. obs newest-first.
    const yoyAt = (i: number) => {
      const cur = obs[i], prior = obs[i + 12];
      if (!cur || !prior || !prior.value) return null;
      return { date: cur.date, v: (cur.value / prior.value - 1) * 100 };
    };
    const series: { date: string; v: number }[] = [];
    const span = sparkLen(ind.freq);
    for (let i = Math.min(span, obs.length - 13); i >= 0; i--) {   // oldest -> newest
      const p = yoyAt(i);
      if (p) series.push(p);
    }
    const latest = series[series.length - 1] ?? null;
    const prev = series[series.length - 2] ?? null;
    return {
      ...base,
      latest_date: latest?.date ?? null,
      latest_value: latest ? Number(latest.v.toFixed(2)) : null,
      prev_value: prev ? Number(prev.v.toFixed(2)) : null,
      change_abs: latest && prev ? Number((latest.v - prev.v).toFixed(2)) : null,
      change_pct: null,
      spark: series.map((p) => ({ d: p.date, v: Number(p.v.toFixed(2)) })),
    };
  }

  // level
  const span = sparkLen(ind.freq);
  const window = obs.slice(0, span).reverse(); // oldest -> newest
  const latest = obs[0], prev = obs[1] ?? null;
  return {
    ...base,
    latest_date: latest.date,
    latest_value: Number(latest.value.toFixed(4)),
    prev_value: prev ? Number(prev.value.toFixed(4)) : null,
    change_abs: prev ? Number((latest.value - prev.value).toFixed(4)) : null,
    change_pct: prev && prev.value ? Number(((latest.value / prev.value - 1) * 100).toFixed(2)) : null,
    spark: window.map((o) => ({ d: o.date, v: Number(o.value.toFixed(4)) })),
  };
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 500 * (i + 1))); }
  }
  throw last;
}

async function upsert(rows: unknown[]) {
  const r = await fetch(`${SB_URL}/rest/v1/live_indicators`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json",
      "Content-Profile": "macro",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

Deno.serve(async () => {
  if (!FRED_KEY || !SB_URL || !SB_SERVICE) {
    return new Response(JSON.stringify({ ok: false, error: "missing env (FRED_API_KEY / SUPABASE_*)" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const rows: unknown[] = [];
  const errors: Record<string, string> = {};

  for (const ind of CATALOG) {
    try {
      const obs = await withRetry(() => (ind.source === "FRED" ? fredObs(ind.series_id) : dbnomicsObs(ind.series_id)));
      rows.push(buildRow(ind, obs));
    } catch (e) {
      errors[ind.key] = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 80)); // be gentle on the upstreams
  }

  if (rows.length) {
    try { await upsert(rows); }
    catch (e) {
      return new Response(JSON.stringify({ ok: false, upserted: 0, error: e instanceof Error ? e.message : String(e), fetchErrors: errors }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ ok: true, upserted: rows.length, total: CATALOG.length, errors }), { headers: { "Content-Type": "application/json" } });
});
