-- 0056 — Add four QRD Analysts: Atala, Arkan, Fadlan, Akbar.
--
-- Mirrors the analyst convention used across divisions (see the AMD/ERD analysts):
--   role = 'analyst', division = 'QRD', title = '<DIV> Analyst',
--   can_create_research_project = FALSE.
-- Follows the account system (0054): every account starts on the base password
-- 'Nabil1234' with the cleartext mirrored into password_plain (admin-view only)
-- and must_change_password = TRUE so each member is forced to change it on first
-- login. password_hash uses pgcrypto crypt() with gen_salt('bf', 10) (bcrypt
-- cost 10, '$2a$' tag) to match management.verify_login.
--
-- Idempotent: ON CONFLICT (username) DO NOTHING — re-running never clobbers a
-- member who has since changed their password.

BEGIN;

INSERT INTO management.users (
  username, password_hash, password_plain, full_name, role, division, title,
  can_create_research_project, must_change_password, active
) VALUES
  ('atala',  crypt('Nabil1234', gen_salt('bf', 10)), 'Nabil1234', 'Atala',  'analyst', 'QRD', 'QRD Analyst', FALSE, TRUE, TRUE),
  ('arkan',  crypt('Nabil1234', gen_salt('bf', 10)), 'Nabil1234', 'Arkan',  'analyst', 'QRD', 'QRD Analyst', FALSE, TRUE, TRUE),
  ('fadlan', crypt('Nabil1234', gen_salt('bf', 10)), 'Nabil1234', 'Fadlan', 'analyst', 'QRD', 'QRD Analyst', FALSE, TRUE, TRUE),
  ('akbar',  crypt('Nabil1234', gen_salt('bf', 10)), 'Nabil1234', 'Akbar',  'analyst', 'QRD', 'QRD Analyst', FALSE, TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

COMMIT;
