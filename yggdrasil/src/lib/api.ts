/**
 * Fetch helpers for the static data dir.
 *
 * The Vite base path is `/yggdrasil/` in production (Module 04 inside the
 * LBC multi-app). `import.meta.env.BASE_URL` resolves to that same prefix
 * in dev and prod, so `${BASE}data/...` lands on the bundled public/data/
 * assets either way.
 */

import type { Tree, ViewerIndex } from "./types";
import { SUPPORTED_SCHEMA_VERSION } from "./types";

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const DATA_PREFIX = `${BASE}data`;

/** Friendly error type so the UI can distinguish missing-snapshot
 *  from genuine network/parse failures. */
export class SnapshotError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SnapshotError";
  }
}

export async function fetchIndex(): Promise<ViewerIndex> {
  const url = `${DATA_PREFIX}/index.json`;
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new SnapshotError(
      `Could not fetch ${url}. Did you run \`python -m yggdrasil viz dump\`?`,
      err,
    );
  }
  if (!response.ok) {
    throw new SnapshotError(
      `${url} returned ${response.status}. Run \`yggdrasil viz dump\` to refresh.`,
    );
  }
  let data: ViewerIndex;
  try {
    data = (await response.json()) as ViewerIndex;
  } catch (err) {
    throw new SnapshotError(`${url} did not contain valid JSON.`, err);
  }
  if (data.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    throw new SnapshotError(
      `Snapshot schema_version=${data.schema_version} but viewer expects ${SUPPORTED_SCHEMA_VERSION}. ` +
        `Rebuild the viewer or re-run \`yggdrasil viz dump\` after updating both.`,
    );
  }
  return data;
}

export async function fetchTree(treePath: string): Promise<Tree> {
  const url = `${DATA_PREFIX}/${treePath}`;
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new SnapshotError(
      `Could not fetch ${url}. Network error or offline?`,
      err,
    );
  }
  if (!response.ok) {
    throw new SnapshotError(
      `Could not load ${url} (HTTP ${response.status}). The snapshot may be stale; ` +
        `run \`yggdrasil viz dump\` to regenerate.`,
    );
  }
  try {
    return (await response.json()) as Tree;
  } catch (err) {
    throw new SnapshotError(
      `${url} did not contain valid JSON. ` +
        `A truncated copy can happen if \`yggdrasil viz dump\` was interrupted.`,
      err,
    );
  }
}
