-- 0021 -- Email notification system (Phase 1 foundation + Phase 2 plumbing).
--
-- Phase 1 (active immediately):
--   * users.email / notif_prefs / timezone  + exposed via users_lite
--   * RLS so admin/management (or a user on their own row) can set these
--     via direct PostgREST — no admin-mutate edge-fn redeploy needed
--   * notification_outbox  — idempotent audit/dedupe of every send
--   * app_secrets          — private (service_role only) Resend config
--
-- Phase 2 (built but INERT until app_secrets.resend_enabled='true' and a
-- real resend_api_key is set, plus pg_cron/pg_net enabled):
--   * fn_send_deadline_digests() — one grouped email per owner per day for
--     deliverables due in 3d / 1d / today / overdue
--   * pg_cron job at 00:00 UTC (07:00 Asia/Jakarta)
--
-- Idempotent: IF NOT EXISTS / OR REPLACE / guarded extension+cron blocks.

-- ───────────────────────── Phase 1: user fields ─────────────────────────
ALTER TABLE management.users
    ADD COLUMN IF NOT EXISTS email      TEXT,
    ADD COLUMN IF NOT EXISTS notif_prefs JSONB NOT NULL
        DEFAULT '{"deadlines":true,"assignments":true,"digest":true}'::jsonb,
    ADD COLUMN IF NOT EXISTS timezone   TEXT NOT NULL DEFAULT 'Asia/Jakarta';

-- Expose the new fields through the public-safe view (append-only -> a
-- plain CREATE OR REPLACE is legal here; no column reorder).
CREATE OR REPLACE VIEW management.users_lite AS
SELECT id, username, full_name, role, division, title,
       can_create_research_project, active, created_at, last_login_at,
       email, notif_prefs, timezone
FROM management.users;

GRANT SELECT ON management.users_lite TO authenticated;

-- Direct-PostgREST write path for the Admin email/prefs editor. Column
-- grant means even with a permissive policy only these 3 columns are ever
-- writable (password_hash etc. stay untouchable). The UPDATE...WHERE id=?
-- needs SELECT(id) at the SQL level.
GRANT SELECT (id) ON management.users TO authenticated;
GRANT UPDATE (email, notif_prefs, timezone) ON management.users TO authenticated;

DROP POLICY IF EXISTS mgmt_users_update_contact ON management.users;
CREATE POLICY mgmt_users_update_contact
    ON management.users
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() ->> 'user_role') IN ('admin','management')
        OR id = (auth.jwt() ->> 'sub')::uuid
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_role') IN ('admin','management')
        OR id = (auth.jwt() ->> 'sub')::uuid
    );

-- ───────────────────────── notification_outbox ──────────────────────────
CREATE TABLE IF NOT EXISTS management.notification_outbox (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES management.users(id) ON DELETE SET NULL,
    email       TEXT NOT NULL,
    kind        TEXT NOT NULL,
    dedupe_key  TEXT NOT NULL UNIQUE,
    subject     TEXT NOT NULL,
    payload     JSONB,
    status      TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued','sent','failed','skipped')),
    provider_id TEXT,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_user ON management.notification_outbox (user_id, created_at DESC);

ALTER TABLE management.notification_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_admin_read ON management.notification_outbox;
CREATE POLICY outbox_admin_read
    ON management.notification_outbox
    FOR SELECT TO authenticated
    USING ((auth.jwt() ->> 'user_role') IN ('admin','management'));
GRANT SELECT ON management.notification_outbox TO authenticated;
GRANT ALL    ON management.notification_outbox TO service_role;

-- ───────────────────────── app_secrets (private) ────────────────────────
-- No RLS policy for `authenticated` at all -> clients can never read this.
CREATE TABLE IF NOT EXISTS management.app_secrets (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE management.app_secrets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON management.app_secrets TO service_role;

INSERT INTO management.app_secrets (key, value) VALUES
    ('resend_api_key', ''),
    ('resend_from',    'LBC Management <onboarding@resend.dev>'),
    ('resend_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ───────────────────── Phase 2: extensions (guarded) ────────────────────
DO $do$
BEGIN
    BEGIN CREATE EXTENSION IF NOT EXISTS pg_net;                         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_net not auto-enabled: %', SQLERRM; END;
    BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron;                        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron not auto-enabled: %', SQLERRM; END;
END $do$;

-- ───────────────── Phase 2: deadline digest function ────────────────────
CREATE OR REPLACE FUNCTION management.fn_send_deadline_digests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = management, public, net, extensions
AS $func$
DECLARE
    _enabled  TEXT;
    _key      TEXT;
    _from     TEXT;
    _today    DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date;
    _sent     INTEGER := 0;
    _rec      RECORD;
    _items    TEXT;
    _dedupe   TEXT;
    _outbox   UUID;
BEGIN
    SELECT value INTO _enabled FROM management.app_secrets WHERE key = 'resend_enabled';
    SELECT value INTO _key     FROM management.app_secrets WHERE key = 'resend_api_key';
    SELECT value INTO _from    FROM management.app_secrets WHERE key = 'resend_from';
    IF COALESCE(_enabled,'false') <> 'true' OR COALESCE(_key,'') = '' THEN
        RETURN 0;  -- armed but inert
    END IF;

    FOR _rec IN
        SELECT u.id AS user_id, u.email,
               json_agg(json_build_object(
                   'project', d.project_id,
                   'title',   COALESCE(d.title, d.kind),
                   'due',     to_char(d.due_date,'YYYY-MM-DD'),
                   'bucket',  CASE
                       WHEN d.due_date < _today THEN 'OVERDUE'
                       WHEN d.due_date = _today THEN 'DUE TODAY'
                       WHEN d.due_date = _today + 1 THEN 'DUE TOMORROW'
                       ELSE 'DUE IN 3 DAYS' END
               ) ORDER BY d.due_date) AS items
        FROM management.deliverables d
        JOIN management.deliverable_owners o ON o.deliverable_id = d.id
        JOIN management.users u ON u.id = o.user_id
        WHERE u.active
          AND COALESCE(u.email,'') <> ''
          AND COALESCE((u.notif_prefs ->> 'deadlines')::boolean, true)
          AND d.state NOT IN ('approved','published')
          AND (d.due_date < _today OR d.due_date IN (_today, _today + 1, _today + 3))
        GROUP BY u.id, u.email
    LOOP
        _dedupe := 'deadline:' || _rec.user_id || ':' || to_char(_today,'YYYY-MM-DD');

        INSERT INTO management.notification_outbox (user_id, email, kind, dedupe_key, subject, payload, status)
        VALUES (_rec.user_id, _rec.email, 'deadline_digest', _dedupe,
                'LBC Management — deadlines for ' || to_char(_today,'Dy DD Mon'),
                json_build_object('items', _rec.items), 'queued')
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id INTO _outbox;

        IF _outbox IS NULL THEN
            CONTINUE;  -- already sent today; idempotent
        END IF;

        SELECT string_agg(
                 '<li><b>' || (it->>'bucket') || '</b> — ' ||
                 (it->>'project') || ': ' || (it->>'title') ||
                 ' <span style="color:#888">(' || (it->>'due') || ')</span></li>', '')
          INTO _items
          FROM json_array_elements(_rec.items) it;

        BEGIN
            PERFORM net.http_post(
                url     := 'https://api.resend.com/emails',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || _key,
                    'Content-Type',  'application/json'),
                body    := jsonb_build_object(
                    'from',    _from,
                    'to',      _rec.email,
                    'subject', 'LBC Management — deadlines for ' || to_char(_today,'Dy DD Mon'),
                    'html',
                        '<div style="font-family:system-ui,Segoe UI,Arial;font-size:14px">' ||
                        '<h2 style="margin:0 0 4px">Upcoming deadlines</h2>' ||
                        '<p style="color:#666;margin:0 0 12px">' ||
                        to_char(_today,'Day, DD Mon YYYY') || '</p><ul>' ||
                        _items ||
                        '</ul><p style="color:#888;font-size:12px">Open the LBC Management terminal for detail. ' ||
                        'Manage notifications in your profile.</p></div>')
            );
            UPDATE management.notification_outbox
               SET status='sent', sent_at=now()
             WHERE id=_outbox;
            _sent := _sent + 1;
        EXCEPTION WHEN OTHERS THEN
            UPDATE management.notification_outbox
               SET status='failed', error=SQLERRM
             WHERE id=_outbox;
        END;
    END LOOP;

    RETURN _sent;
END;
$func$;

REVOKE ALL ON FUNCTION management.fn_send_deadline_digests() FROM PUBLIC;

-- ───────────── Phase 1: admin "send test email" RPC ─────────────────────
-- Callable from the client (PostgREST RPC). Admin/management only — the
-- check reads the verified JWT claims PostgREST injects. Uses the same
-- Resend path; returns a human-readable status string.
CREATE OR REPLACE FUNCTION management.fn_send_test_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = management, public, net, extensions
AS $func$
DECLARE
    _claims JSONB := COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb;
    _role   TEXT  := _claims ->> 'user_role';
    _key    TEXT;
    _from   TEXT;
    _enab   TEXT;
    _email  TEXT;
    _name   TEXT;
BEGIN
    IF _role NOT IN ('admin','management') THEN
        RETURN 'Not allowed: admin/management only.';
    END IF;

    SELECT email, full_name INTO _email, _name
      FROM management.users WHERE id = p_user_id;
    IF COALESCE(_email,'') = '' THEN
        RETURN 'No email set for that user — add one first.';
    END IF;

    SELECT value INTO _enab FROM management.app_secrets WHERE key='resend_enabled';
    SELECT value INTO _key  FROM management.app_secrets WHERE key='resend_api_key';
    SELECT value INTO _from FROM management.app_secrets WHERE key='resend_from';
    IF COALESCE(_enab,'false') <> 'true' OR COALESCE(_key,'') = '' THEN
        RETURN 'Email not configured yet (Resend key/domain pending). Field saved; sending is still inert.';
    END IF;

    PERFORM net.http_post(
        url     := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization','Bearer '||_key,'Content-Type','application/json'),
        body    := jsonb_build_object(
            'from', _from, 'to', _email,
            'subject', 'LBC Management — test notification',
            'html', '<div style="font-family:system-ui,Arial;font-size:14px">'
                 || 'Hi ' || COALESCE(_name,'') || ', this is a test email from the '
                 || 'LBC Management notification system. If you got this, delivery works.</div>'));

    INSERT INTO management.notification_outbox (user_id, email, kind, dedupe_key, subject, status, sent_at)
    VALUES (p_user_id, _email, 'test',
            'test:'||p_user_id||':'||to_char(now(),'YYYYMMDDHH24MISS'),
            'LBC Management — test notification', 'sent', now());

    RETURN 'Test email sent to ' || _email || '.';
END;
$func$;

REVOKE ALL ON FUNCTION management.fn_send_test_email(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION management.fn_send_test_email(UUID) TO authenticated;

-- ───────────────────── Phase 2: schedule (guarded) ──────────────────────
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='lbc-deadline-digest') THEN
            PERFORM cron.unschedule('lbc-deadline-digest');
        END IF;
        PERFORM cron.schedule(
            'lbc-deadline-digest',
            '0 0 * * *',   -- 00:00 UTC = 07:00 Asia/Jakarta
            $cron$ SELECT management.fn_send_deadline_digests(); $cron$);
    ELSE
        RAISE NOTICE 'pg_cron not present — schedule the digest from the dashboard or Vercel Cron.';
    END IF;
END $do$;

NOTIFY pgrst, 'reload schema';
