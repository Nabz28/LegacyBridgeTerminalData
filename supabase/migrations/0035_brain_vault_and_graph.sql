-- ============================================================
-- brain.vault — service_role-ONLY secret store, + graph index.
--
-- The brain becomes the source of truth so any agent (Claude on
-- any device, Codex, etc.) can bootstrap from the DB. Secrets must
-- NOT reach the browser, so vault is locked to service_role only:
-- authenticated/anon have NO grant AND RLS denies them. service_role
-- bypasses RLS. Idempotent.
-- ============================================================

create table if not exists brain.vault (
  key        text primary key,
  value      text not null,
  is_secret  boolean not null default true,
  note       text,
  updated_at timestamptz not null default now()
);

-- 0034 set default privileges granting authenticated on NEW brain tables —
-- so explicitly strip the vault back to service_role only.
revoke all on brain.vault from authenticated;
revoke all on brain.vault from anon;
grant select, insert, update, delete on brain.vault to service_role;

alter table brain.vault enable row level security;
-- Intentionally NO policy for authenticated/anon → they are denied even if a
-- future grant slips in. service_role bypasses RLS by design.

create or replace function brain.touch_vault_updated_at() returns trigger as $fn$
begin new.updated_at = now(); return new; end $fn$ language plpgsql;
drop trigger if exists vault_touch on brain.vault;
create trigger vault_touch before update on brain.vault
  for each row execute function brain.touch_vault_updated_at();

-- Graph: backlink lookups use `links @> '{"Title"}'` (array contains).
create index if not exists notes_links_idx on brain.notes using gin(links);
