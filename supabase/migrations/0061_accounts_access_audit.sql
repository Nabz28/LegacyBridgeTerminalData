-- ===========================================================================
-- 0061_accounts_access_audit.sql
-- Audit trail for viewing the cleartext account roster.
--
-- Context: login already authenticates against a bcrypt password_hash (0054); the
-- password_plain column is a DELIBERATE admin-only visibility feature, readable
-- only through list_accounts() which is JWT-gated to nabil / aldee / role=admin.
-- We are NOT removing that feature (it is a documented product decision). What we
-- add here is accountability: every time the cleartext roster is read, we record
-- who read it and when. That is the meaningful, non-destructive hardening — you
-- can now see when passwords were viewed, which the plaintext store previously
-- left completely invisible.
-- ===========================================================================
-- RENUMBERED 0057 -> 0061 (2026-07-29). Authored on a branch that was
-- never merged; meanwhile 0057 was taken on main by a MONITOR migration.
-- Content is unchanged from the original.

BEGIN;

CREATE TABLE IF NOT EXISTS management.account_access_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  viewer_id       UUID,
  viewer_username TEXT,
  viewer_role     TEXT,
  row_count       INTEGER,
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON management.account_access_log FROM PUBLIC, anon, authenticated;

-- Re-declare list_accounts() (same signature + gating as 0054) with an audit
-- INSERT on every successful read.
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
  v_uid    UUID := (v_claims ->> 'sub')::uuid;
  v_caller TEXT := lower(coalesce(v_claims ->> 'username', ''));
  v_role   TEXT := coalesce(v_claims ->> 'user_role', '');
  v_n      INTEGER;
BEGIN
  IF NOT (v_caller IN ('nabil', 'aldee') OR v_role = 'admin') THEN
    RAISE EXCEPTION 'forbidden: accounts roster is restricted';
  END IF;

  SELECT count(*) INTO v_n FROM management.users;

  INSERT INTO management.account_access_log (viewer_id, viewer_username, viewer_role, row_count)
  VALUES (v_uid, v_caller, v_role, v_n);

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
