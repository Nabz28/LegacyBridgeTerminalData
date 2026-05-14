// Login endpoint for the LBC Management Terminal.
//
// POST { username, password } -> { token, user, expires_in }
// 401 on invalid credentials. JWT is HS256-signed with Supabase's JWT_SECRET
// so PostgREST recognizes auth.uid() / auth.jwt() during RLS evaluation.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { corsHeaders, errorResponse, jsonResponse, preflight } from "../_shared/cors.ts";
import { getCryptoKey } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid json", 400);
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password) {
    return errorResponse("username and password required", 400);
  }

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    db: { schema: "management" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("verify_login", {
    p_username: username,
    p_password: password,
  });

  if (error) {
    console.error("verify_login rpc failed:", error);
    return errorResponse("login failed", 500);
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return errorResponse("invalid credentials", 401);
  }
  const user = rows[0];

  const key = await getCryptoKey();
  const token = await create(
    { alg: "HS256", typ: "JWT" },
    {
      sub: user.id,
      role: "authenticated",
      aud: "authenticated",
      iss: "supabase",
      iat: getNumericDate(0),
      exp: getNumericDate(TOKEN_TTL_SECONDS),
      username: user.username,
      full_name: user.full_name,
      user_role: user.role,
      division: user.division,
      title: user.title,
      can_create_research_project: user.can_create_research_project,
    },
    key,
  );

  return jsonResponse({
    token,
    expires_in: TOKEN_TTL_SECONDS,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      division: user.division,
      title: user.title,
      can_create_research_project: user.can_create_research_project,
    },
  });
});

// suppress unused-import warning for corsHeaders in some Deno setups
void corsHeaders;
