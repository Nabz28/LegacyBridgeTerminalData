// Self-healing embeddings cron (Vercel). The Bridge proxy embeds on brain_write,
// but DIRECT writes (browser wiki, OpenClaw intake, scripts) leave brain.notes.embedding
// NULL — invisible to the semantic half of search_notes (0039). This runs daily and
// embeds any active (status=filed, non-snapshot) note missing an embedding.
// Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron hits; we verify it.
const SB_URL = process.env.SUPABASE_URL || 'https://adnubucjlezrtusbicja.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

module.exports.config = { maxDuration: 60 };

async function sb(path, opts = {}) {
  const { method = 'GET', body, prefer } = opts;
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Accept-Profile': 'brain' };
  if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Profile'] = 'brain'; }
  if (prefer) headers['Prefer'] = prefer;
  const r = await fetch(SB_URL + '/rest/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ': ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
async function embed(texts) {
  const r = await fetch('https://openrouter.ai/api/v1/embeddings', { method: 'POST',
    headers: { Authorization: 'Bearer ' + OR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/text-embedding-3-small', input: texts }) });
  if (!r.ok) throw new Error('embeddings ' + r.status);
  const d = await r.json();
  return d.data.slice().sort((a, b) => a.index - b.index).map((x) => x.embedding);
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (CRON_SECRET && (req.headers.authorization || '') !== 'Bearer ' + CRON_SECRET) {
    res.statusCode = 401; return res.end(JSON.stringify({ error: 'unauthorized' }));
  }
  if (!SB_KEY || !OR_KEY) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'not configured' })); }
  try {
    const rows = await sb('/notes?select=id,title,body&status=eq.filed&type=neq.status_snapshot&embedding=is.null&limit=300');
    let done = 0;
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40);
      const embs = await embed(chunk.map((n) => ((n.title || '') + '\n' + (n.body || '')).slice(0, 7000)));
      for (let j = 0; j < chunk.length; j++) {
        await sb('/notes?id=eq.' + chunk[j].id, { method: 'PATCH', body: { embedding: '[' + embs[j].join(',') + ']' }, prefer: 'return=minimal' });
        done++;
      }
    }
    res.statusCode = 200; return res.end(JSON.stringify({ ok: true, missing: rows.length, embedded: done }));
  } catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: String(e.message || e) })); }
};
