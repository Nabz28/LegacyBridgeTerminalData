// JWT helpers shared by every authenticated Edge Function.
//
// Tokens are HS256-signed with Supabase's JWT_SECRET so PostgREST recognizes
// them via auth.uid() / auth.jwt() inside RLS policies.

import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export type AuthPayload = {
  sub: string;
  username: string;
  full_name: string;
  user_role: "admin" | "management" | "analyst" | "advisor";
  division: string | null;
  title: string | null;
  can_create_research_project: boolean;
  exp: number;
};

let _cryptoKey: CryptoKey | null = null;

export async function getCryptoKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;
  const secret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET not configured");
  _cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _cryptoKey;
}

export async function authenticate(req: Request): Promise<AuthPayload | null> {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const key = await getCryptoKey();
    const payload = (await verify(token, key)) as unknown as AuthPayload;
    return payload;
  } catch {
    return null;
  }
}
