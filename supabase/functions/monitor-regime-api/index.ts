// monitor-regime-api (roadmap 5.5) — compact live desk-state endpoint so
// LEGION / bridge-ai can quote the tape in chat ("IDX is NEUTRAL +0.27,
// FOREIGN ACCUMULATION flying"). Reads the nightly-snapshot tables with the
// service key (edge env), serves keyless GET (CORS-open, read-only compact
// projection — same exposure class as the other keyless market fns).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const H = { apikey: key, Authorization: 'Bearer ' + key, 'Accept-Profile': 'management' };
    const get = (q: string) => fetch(url + '/rest/v1/' + q, { headers: H }).then((r) => r.json());

    const [hist, alerts] = await Promise.all([
      get('monitor_regime_history?select=dial,date,score,raw,label,coverage,flags&order=date.desc&limit=80'),
      get('monitor_alerts?select=dial,date,kind,title,detail&order=created_at.desc&limit=8'),
    ]);
    const byDial = (dial: string) => (hist as any[]).filter((r) => r.dial === dial);
    const pack = (dial: string) => {
      const rows = byDial(dial);
      if (!rows.length) return null;
      const now = rows[0];
      let streak = 0;
      for (const r of rows) { if (r.label === now.label) streak++; else break; }
      return {
        label: now.label, score: Number(now.score), raw: Number(now.raw),
        asOf: now.date, coverage: now.coverage == null ? null : Number(now.coverage),
        flags: now.flags || [], streakSessions: streak,
        history: rows.slice(0, 30).reverse().map((r) => ({ date: r.date, score: Number(r.score), label: r.label })),
      };
    };
    const body = {
      ok: true,
      asOf: new Date().toISOString(),
      note: 'Both dials are tape-STATE gauges (descriptive, hysteresis-smoothed) — they do not forecast returns.',
      global: pack('global'),
      id: pack('id'),
      alerts,
    };
    return new Response(JSON.stringify(body), {
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
