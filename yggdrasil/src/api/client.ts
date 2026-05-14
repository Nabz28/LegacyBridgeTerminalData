/**
 * Static-snapshot API client.
 *
 * The Yggdrasil Terminal originally talked to a FastAPI backend at
 * /api/*. For the LBC multi-app Vercel deploy we pre-bake every
 * endpoint response into JSON files under public/data/api/ via
 * `python scripts/dump_terminal_static.py` (in the standalone
 * Yggdrasil Framework repo) and read them statically here.
 *
 * Mapping (HTTP path -> static file):
 *   GET /runs                          -> data/api/runs.json
 *   GET /runs/<name>                   -> data/api/runs/<name>.json
 *   GET /runs/<name>/audit             -> data/api/runs/<name>/audit.json
 *   GET /runs/<name>/tasks             -> data/api/runs/<name>/tasks.json
 *   GET /prompts                       -> data/api/prompts.json
 *   GET /entities?limit=N              -> data/api/entities.json (full set)
 *   GET /entities/<id>/refs            -> data/api/entities/<id-with-':'->'__'>/refs.json
 */

import type {
  AuditReport,
  EntityRow,
  RunDetail,
  RunIndexRow,
  TasksResponse,
} from './types';

// Vite injects this at build time. In production it's `/yggdrasil/`.
// In dev it depends on the vite.config.ts `base` value.
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const DATA = `${BASE}data/api`;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getStatic<T>(path: string): Promise<T> {
  const url = `${DATA}${path}`;
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new ApiError(
      0,
      `Could not fetch ${url}. Network error or snapshot missing.`,
    );
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new ApiError(
      resp.status,
      `GET ${url} -> ${resp.status}${text ? ': ' + text.slice(0, 120) : ''}`,
    );
  }
  return (await resp.json()) as T;
}

export const api = {
  // Health is a no-op in static mode; the bundle either loaded or it didn't.
  health: async () => ({ ok: true, mode: 'static' as const }),

  listRuns: () => getStatic<RunIndexRow[]>('/runs.json'),

  getRun: (runDirName: string) =>
    getStatic<RunDetail>(`/runs/${encodeURIComponent(runDirName)}.json`),

  listPrompts: () => getStatic<string[]>('/prompts.json'),

  listEntities: (_limit = 500) =>
    // limit is honoured at bake time; the static snapshot is one file.
    getStatic<EntityRow[]>('/entities.json'),

  getRunAudit: (runDirName: string) =>
    getStatic<AuditReport>(
      `/runs/${encodeURIComponent(runDirName)}/audit.json`,
    ),

  getRunTasks: (runDirName: string) =>
    getStatic<TasksResponse>(
      `/runs/${encodeURIComponent(runDirName)}/tasks.json`,
    ),
};

export { ApiError };
