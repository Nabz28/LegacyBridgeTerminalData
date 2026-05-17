// Supabase client factory. Returns a SINGLE memoized client. We don't use
// Supabase Auth (no email) — the session JWT is injected per-request via a
// custom fetch wrapper that reads the live token from localStorage, so the
// client never has to be recreated on login/logout. A single instance also
// avoids the "Multiple GoTrueClient instances detected" console warning.
//
// Session lives in localStorage and is managed manually via auth.ts.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertConfig } from "./config";
import { isDemoMode } from "./demo";
import { makeDemoClient } from "./demoClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createClient> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _demoClient: ReturnType<typeof createClient> | null = null;

// Wrap fetch so the current session JWT is attached to every request at call
// time. Token changes (login/logout) are picked up without rebuilding the
// client, so exactly one GoTrueClient ever exists in the browser context.
function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = readToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export function getClient(_token: string | null = readToken()): SupabaseClient {
  if (isDemoMode()) {
    if (!_demoClient) _demoClient = makeDemoClient() as ReturnType<typeof createClient>;
    return _demoClient as SupabaseClient;
  }
  if (_client) return _client as SupabaseClient;
  const { url, anonKey } = assertConfig();
  _client = createClient(url, anonKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { schema: "management" as any },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "lbc-mgmt-noauth",
    },
    global: { fetch: authedFetch },
  });
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
  // No client rebuild needed: authedFetch reads the new token per-request.
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXP_KEY);
  // Keep the singleton; authedFetch will simply stop sending Authorization.
}
