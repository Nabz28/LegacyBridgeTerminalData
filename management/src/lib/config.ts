// Runtime configuration sourced from Vite env vars.
// Local dev: management/.env.local. Prod: set in Vercel project env.
//
// Management lives on its own Supabase project (separate from macro/correlation),
// so it reads VITE_MANAGEMENT_SUPABASE_* first and falls back to the generic
// VITE_SUPABASE_* names for backward compatibility with single-project setups.

const env = import.meta.env;

export const SUPABASE_URL = (env.VITE_MANAGEMENT_SUPABASE_URL ?? env.VITE_SUPABASE_URL) as
  | string
  | undefined;
export const SUPABASE_ANON_KEY = (env.VITE_MANAGEMENT_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export function assertConfig(): { url: string; anonKey: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "VITE_MANAGEMENT_SUPABASE_URL and VITE_MANAGEMENT_SUPABASE_ANON_KEY must be set " +
        "(or the legacy VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
        "Copy management/.env.example to management/.env.local for local dev, " +
        "or configure them in Vercel project settings for production.",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export const FUNCTIONS_BASE = (): string => `${assertConfig().url}/functions/v1`;
