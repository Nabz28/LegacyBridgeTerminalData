-- ===========================================================================
-- 0054_account_system.sql
-- Account & permission system for the Legacy Bridge Terminal.
--
-- Adds a forced-password-change flow and an admin-only "Accounts" roster on top
-- of the existing custom auth (management.users + bcrypt password_hash + the
-- auth-login Edge Function). No Edge Function redeploys needed: every new
-- capability is a SECURITY DEFINER RPC that the browser calls with the logged-in
-- user's JWT (PostgREST already exposes the `management` schema).
--
-- What this migration does:
--   1. Adds management.users.must_change_password (default TRUE).
--   2. Adds management.users.password_plain  -- cleartext, admin-view only.
--   3. Rolls EVERY account onto the base password 'Nabil1234' and forces a
--      change on next login.
--   4. Surfaces must_change_password on users_lite (password_plain stays hidden).
--   5. Adds browser-callable RPCs:
--        change_my_password(old,new)   -- any authenticated user, self only
--        admin_reset_password(user_id) -- nabil / aldee / admin only
--        list_accounts()               -- nabil / aldee / admin only (roster + pw)
--
-- SECURITY NOTE: password_plain stores the cleartext password so the Accounts
-- terminal (visible only to nabil + aldee) can display each member's current
-- password, including self-chosen ones. This is a deliberate product decision
-- by the principal. The column is NEVER exposed through users_lite or any anon
-- path; it is readable only via list_accounts(), which is JWT-gated to
-- nabil/aldee/admin. bcrypt password_hash remains the source of truth for login.
-- ===========================================================================

BEGIN;

-- --- 1 & 2: new columns -----------------------------------------------------
ALTER TABLE management.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS password_plain       TEXT;

-- --- 3: roll everyone onto the base password, force a change ----------------
-- (bcrypt cost 10 to match the rest of the codebase: gen_salt('bf', 10))
UPDATE management.users
   SET password_hash        = crypt('Nabil1234', gen_salt('bf', 10)),
       password_plain       = 'Nabil1234',
       must_change_password = TRUE;

-- --- 4: expose the flag (NOT the cleartext) on the authenticated view -------
-- CREATE OR REPLACE VIEW may only APPEND columns, so we mirror the current
-- column set (id..timezone, established by 0005 + 0021) and append the new flag.
CREATE OR REPLACE VIEW management.users_lite AS
SELECT id, username, full_name, role, division, title,
       can_create_research_project, active, created_at, last_login_at,
       email, notif_prefs, timezone,
       must_change_password
FROM management.users;

GRANT SELECT ON management.users_lite TO authenticated;

-- ---------------------------------------------------------------------------
-- 5a. change_my_password — the caller changes their OWN password.
--     Identified by the JWT `sub` claim, so a user can never change another's.
--     Rejects the base password as the new value (keeps "still base" meaningful).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.change_my_password(p_old TEXT, p_new TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = management, public, extensions
AS $$
DECLARE
  v_claims JSON := nullif(current_setting('request.jwt.claims', true), '')::json;
  v_uid    UUID := (v_claims ->> 'sub')::uuid;
  v_user   management.users%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not authenticated');
  END IF;

  SELECT * INTO v_user FROM management.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user not found');
  END IF;

  IF v_user.password_hash <> crypt(p_old, v_user.password_hash) THEN
    RETURN json_build_object('ok', false, 'error', 'current password is incorrect');
  END IF;

  IF p_new IS NULL OR length(p_new) < 8 THEN
    RETURN json_build_object('ok', false, 'error', 'new password must be at least 8 characters');
  END IF;

  IF p_new = 'Nabil1234' THEN
    RETURN json_build_object('ok', false, 'error', 'choose a password different from the default');
  END IF;

  UPDATE management.users
     SET password_hash        = crypt(p_new, gen_salt('bf', 10)),
         password_plain       = p_new,
         must_change_password = FALSE
   WHERE id = v_uid;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION management.change_my_password(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION management.change_my_password(TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5b. admin_reset_password — reset a target account to the base password and
--     re-arm the forced change. Gated to nabil / aldee / role=admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.admin_reset_password(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = management, public, extensions
AS $$
DECLARE
  v_claims   JSON := nullif(current_setting('request.jwt.claims', true), '')::json;
  v_caller   TEXT := lower(coalesce(v_claims ->> 'username', ''));
  v_role     TEXT := coalesce(v_claims ->> 'user_role', '');
BEGIN
  IF NOT (v_caller IN ('nabil', 'aldee') OR v_role = 'admin') THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE management.users
     SET password_hash        = crypt('Nabil1234', gen_salt('bf', 10)),
         password_plain       = 'Nabil1234',
         must_change_password = TRUE
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user not found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION management.admin_reset_password(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION management.admin_reset_password(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5c. list_accounts — the admin Accounts roster, including the cleartext
--     password. Gated to nabil / aldee / role=admin. Anyone else => error.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION management.list_accounts()
RETURNS TABLE (
  id                   UUID,
  username             TEXT,
  full_name            TEXT,
  role                 TEXT,
  division             TEXT,
  title                TEXT,
  password             TEXT,
  must_change_password BOOLEAN,
  active               BOOLEAN,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = management, public, extensions
AS $$
DECLARE
  v_claims JSON := nullif(current_setting('request.jwt.claims', true), '')::json;
  v_caller TEXT := lower(coalesce(v_claims ->> 'username', ''));
  v_role   TEXT := coalesce(v_claims ->> 'user_role', '');
BEGIN
  IF NOT (v_caller IN ('nabil', 'aldee') OR v_role = 'admin') THEN
    RAISE EXCEPTION 'forbidden: accounts roster is restricted';
  END IF;

  RETURN QUERY
    SELECT u.id, u.username, u.full_name, u.role, u.division, u.title,
           u.password_plain AS password, u.must_change_password,
           u.active, u.last_login_at, u.created_at
      FROM management.users u
     ORDER BY
       CASE u.role WHEN 'admin' THEN 0 WHEN 'management' THEN 1
                   WHEN 'analyst' THEN 2 WHEN 'advisor' THEN 3 ELSE 4 END,
       u.division NULLS LAST,
       u.username;
END;
$$;

REVOKE ALL ON FUNCTION management.list_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION management.list_accounts() TO authenticated;

COMMIT;
