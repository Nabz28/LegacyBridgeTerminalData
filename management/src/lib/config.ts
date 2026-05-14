// Runtime configuration sourced from Vite env vars.
// Local dev: management/.env.local. Prod: set in Vercel project env.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function assertConfig(): { url: string; anonKey: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. " +
        "Copy management/.env.example to management/.env.local for local dev, " +
        "or configure them in Vercel project settings for production.",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export const FUNCTIONS_BASE = (): string => `${assertConfig().url}/functions/v1`;
