// Supabase client factory. Returns a fresh client with the current session's
// JWT bound as Authorization, so PostgREST sees auth.uid() and applies RLS.
//
// We don't use Supabase Auth (no email), so persistSession/autoRefresh are off.
// Session lives in localStorage and is managed manually via auth.ts.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertConfig } from "./config";
import { isDemoMode } from "./demo";
import { makeDemoClient } from "./demoClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createClient> | null = null;
let _token: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _demoClient: ReturnType<typeof createClient> | null = null;

export function getClient(token: string | null = readToken()): SupabaseClient {
  if (isDemoMode()) {
    if (!_demoClient) _demoClient = makeDemoClient() as ReturnType<typeof createClient>;
    return _demoClient as SupabaseClient;
  }
  if (_client && _token === token) return _client as SupabaseClient;
  const { url, anonKey } = assertConfig();
  _client = createClient(url, anonKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { schema: "management" as any },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
  _token = token;
  return _client as SupabaseClient;
}

const TOKEN_KEY = "lbc.mgmt.token";
const USER_KEY = "lbc.mgmt.user";
const EXP_KEY = "lbc.mgmt.exp";

export function readToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  const expRaw = localStorage.getItem(EXP_KEY);
  if (!raw || !expRaw) return null;
  if (Date.now() > Number(expRaw)) {
    clearSession();
    return null;
  }
  return raw;
}

export function readUser(): import("./types").User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as import("./types").User;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: import("./types").User, ttlSec: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXP_KEY, String(Date.now() + ttlSec * 1000));
  _client = null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXP_KEY);
  _client = null;
  _token = null;
}
