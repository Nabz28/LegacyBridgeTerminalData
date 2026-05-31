-- CFOTerminal — consolidated finance setup (migrations 0005–0012).
-- Paste this whole file into the Supabase SQL Editor and Run, ONCE.
-- Then expose the finance schema (see finance/docs/SUPABASE_INTEGRATION.md §1b).
-- 0007 seed is idempotent. ~30s to apply.


-- ════════════════════════════════════════════════════════════
-- 0005_finance_schema.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — core schema
-- Migration: 0005_finance_schema.sql
-- See finance/SPEC.md for the locked design.

create schema if not exists finance;

-- Lock down: nothing in finance.* is reachable by anon/authenticated by default.
-- Specific GRANTs are issued in 0006_finance_rls.sql after RLS policies are in place.
revoke all on schema finance from public, anon, authenticated;
grant usage on schema finance to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Lookup / config tables
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.entities (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

create type finance.account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');

create table finance.accounts (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid not null references finance.entities(id) on delete restrict,
  code        text not null,
  name        text not null,
  type        finance.account_type not null,
  parent_id   uuid references finance.accounts(id) on delete restrict,
  is_active   boolean not null default true,
  is_root     boolean not null default false,        -- the 5 type-roots; cannot be deleted or retyped
  created_at  timestamptz not null default now(),
  unique (entity_id, code)
);

create index accounts_entity_idx on finance.accounts(entity_id);
create index accounts_parent_idx on finance.accounts(parent_id);
create index accounts_type_idx on finance.accounts(type);

-- Guard: root accounts are immutable on type and cannot be deleted.
create or replace function finance.enforce_root_account_invariants()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and old.is_root and new.type <> old.type) then
    raise exception 'Root accounts cannot change type (account %)', old.code;
  end if;
  if (tg_op = 'DELETE' and old.is_root) then
    raise exception 'Root accounts cannot be deleted (account %)', old.code;
  end if;
  return coalesce(new, old);
end$$;

create trigger accounts_root_invariants
before update or delete on finance.accounts
for each row execute function finance.enforce_root_account_invariants();

-- ─────────────────────────────────────────────────────────────────────────────
-- Tags (orthogonal dimensions: Deal, Department, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.tag_dimensions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text,                                  -- hex, e.g. '#00b4ff'
  created_at  timestamptz not null default now()
);

create table finance.tag_values (
  id           uuid primary key default gen_random_uuid(),
  dimension_id uuid not null references finance.tag_dimensions(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  unique (dimension_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Periods (month-end close)
-- ─────────────────────────────────────────────────────────────────────────────

create type finance.period_status as enum ('open', 'closed');

create table finance.periods (
  entity_id  uuid not null references finance.entities(id) on delete cascade,
  year       int  not null check (year between 2000 and 2100),
  month      int  not null check (month between 1 and 12),
  status     finance.period_status not null default 'open',
  closed_at  timestamptz,
  closed_by  uuid,
  primary key (entity_id, year, month)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reference sequences for human-readable transaction refs
-- (LBC-2026-00001 style; per-entity, per-year, gap-free)
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.ref_counters (
  entity_id  uuid not null references finance.entities(id) on delete cascade,
  year       int  not null,
  next_seq   int  not null default 1,
  primary key (entity_id, year)
);

create or replace function finance.next_txn_ref(p_entity_id uuid, p_year int)
returns text language plpgsql as $$
declare
  v_entity_code text;
  v_seq int;
begin
  select code into v_entity_code from finance.entities where id = p_entity_id;
  if v_entity_code is null then
    raise exception 'Unknown entity %', p_entity_id;
  end if;

  insert into finance.ref_counters (entity_id, year, next_seq)
  values (p_entity_id, p_year, 2)
  on conflict (entity_id, year)
  do update set next_seq = finance.ref_counters.next_seq + 1
  returning next_seq - 1 into v_seq;

  return format('%s-%s-%s', v_entity_code, p_year, lpad(v_seq::text, 5, '0'));
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Transactions + journal lines (the core double-entry ledger)
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.transactions (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,
  entity_id   uuid not null references finance.entities(id) on delete restrict,
  date        date not null,
  memo        text,
  posted_at   timestamptz not null default now(),
  created_by  uuid not null,                         -- auth.uid()
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,                           -- soft delete
  is_demo     boolean not null default false,
  -- Full-text search on memo + ref
  search_tsv  tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(memo, '')), 'A') ||
    setweight(to_tsvector('simple', ref), 'B')
  ) stored
);

create index transactions_entity_date_idx on finance.transactions(entity_id, date desc);
create index transactions_date_idx on finance.transactions(date desc);
create index transactions_search_idx on finance.transactions using gin (search_tsv);
create index transactions_active_idx on finance.transactions(date desc) where deleted_at is null;

create table finance.journal_lines (
  id          uuid primary key default gen_random_uuid(),
  txn_id      uuid not null references finance.transactions(id) on delete cascade,
  account_id  uuid not null references finance.accounts(id) on delete restrict,
  debit_idr   numeric(20, 4) not null default 0 check (debit_idr >= 0),
  credit_idr  numeric(20, 4) not null default 0 check (credit_idr >= 0),
  line_order  int not null default 0,
  reconciled  boolean not null default false,
  -- Exactly one of debit/credit must be > 0
  check ((debit_idr > 0 and credit_idr = 0) or (debit_idr = 0 and credit_idr > 0))
);

create index journal_lines_txn_idx on finance.journal_lines(txn_id);
create index journal_lines_account_idx on finance.journal_lines(account_id);

create table finance.journal_line_tags (
  line_id   uuid not null references finance.journal_lines(id) on delete cascade,
  value_id  uuid not null references finance.tag_values(id) on delete restrict,
  primary key (line_id, value_id)
);

-- Invariant: SUM(debit) = SUM(credit) per transaction.
-- Enforced at COMMIT via constraint trigger so we can validate after
-- all lines for a transaction have been inserted.
create or replace function finance.enforce_balanced_transaction()
returns trigger language plpgsql as $$
declare
  v_dr numeric(20, 4);
  v_cr numeric(20, 4);
  v_txn uuid;
begin
  v_txn := coalesce(new.txn_id, old.txn_id);

  select coalesce(sum(debit_idr), 0), coalesce(sum(credit_idr), 0)
    into v_dr, v_cr
    from finance.journal_lines
   where txn_id = v_txn;

  if v_dr <> v_cr then
    raise exception 'Transaction % is unbalanced: DR=% CR=%', v_txn, v_dr, v_cr;
  end if;
  if v_dr = 0 then
    raise exception 'Transaction % has zero journal lines or zero totals', v_txn;
  end if;

  return null;
end$$;

create constraint trigger journal_lines_balance_check
after insert or update or delete on finance.journal_lines
deferrable initially deferred
for each row execute function finance.enforce_balanced_transaction();

-- Invariant: cannot mutate a transaction whose date falls in a closed period.
create or replace function finance.enforce_closed_period_lock()
returns trigger language plpgsql as $$
declare
  v_status finance.period_status;
  v_date date;
  v_entity uuid;
begin
  v_date := coalesce(new.date, old.date);
  v_entity := coalesce(new.entity_id, old.entity_id);

  select status into v_status
    from finance.periods
   where entity_id = v_entity
     and year = extract(year from v_date)
     and month = extract(month from v_date);

  if v_status = 'closed' then
    raise exception 'Period for % (entity %) is closed; post a reversing entry instead',
      to_char(v_date, 'YYYY-MM'), v_entity;
  end if;

  return new;
end$$;

create trigger transactions_period_lock
before update or delete on finance.transactions
for each row execute function finance.enforce_closed_period_lock();

-- Audit history of every transaction change.
create table finance.transaction_history (
  id           uuid primary key default gen_random_uuid(),
  txn_id       uuid not null references finance.transactions(id) on delete cascade,
  edited_at    timestamptz not null default now(),
  edited_by    uuid not null,
  action       text not null check (action in ('insert', 'update', 'delete', 'restore')),
  before_json  jsonb,
  after_json   jsonb
);

create index transaction_history_txn_idx on finance.transaction_history(txn_id, edited_at desc);
create index transaction_history_time_idx on finance.transaction_history(edited_at desc);

create or replace function finance.log_transaction_change()
returns trigger language plpgsql as $$
declare
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid;
begin
  v_actor := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'delete';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    v_before := to_jsonb(old);
    v_after  := to_jsonb(new);
  else
    v_action := 'delete';
    v_before := to_jsonb(old);
  end if;

  insert into finance.transaction_history (txn_id, edited_by, action, before_json, after_json)
  values (coalesce(new.id, old.id), v_actor, v_action, v_before, v_after);

  return coalesce(new, old);
end$$;

create trigger transactions_audit
after insert or update or delete on finance.transactions
for each row execute function finance.log_transaction_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- Attachments
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.attachments (
  id            uuid primary key default gen_random_uuid(),
  txn_id        uuid not null references finance.transactions(id) on delete cascade,
  filename      text not null,
  mime          text not null,
  size_bytes    bigint not null check (size_bytes >= 0),
  storage_path  text not null unique,
  uploaded_at   timestamptz not null default now(),
  uploaded_by   uuid not null
);

create index attachments_txn_idx on finance.attachments(txn_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Recurring templates
-- ─────────────────────────────────────────────────────────────────────────────

create type finance.recurrence_frequency as enum ('monthly', 'quarterly', 'weekly', 'yearly');

create table finance.recurring_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  entity_id         uuid not null references finance.entities(id) on delete cascade,
  from_account_id   uuid not null references finance.accounts(id) on delete restrict,
  to_account_id     uuid not null references finance.accounts(id) on delete restrict,
  amount_idr        numeric(20, 4) not null check (amount_idr > 0),
  memo_template     text not null,
  frequency         finance.recurrence_frequency not null,
  day_of_month      int check (day_of_month between 1 and 31),
  start_date        date not null,
  end_date          date,
  is_active         boolean not null default true,
  last_run_at       timestamptz,
  next_run_at       date,
  created_by        uuid not null,
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inter-entity transfers
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.inter_entity_transfers (
  id                          uuid primary key default gen_random_uuid(),
  ref                         text not null unique,
  date                        date not null,
  amount_idr                  numeric(20, 4) not null check (amount_idr > 0),
  memo                        text,
  from_entity_id              uuid not null references finance.entities(id),
  from_account_id             uuid not null references finance.accounts(id),
  from_clearing_account_id    uuid not null references finance.accounts(id),
  to_entity_id                uuid not null references finance.entities(id),
  to_account_id               uuid not null references finance.accounts(id),
  to_clearing_account_id      uuid not null references finance.accounts(id),
  from_txn_id                 uuid not null references finance.transactions(id) on delete restrict,
  to_txn_id                   uuid not null references finance.transactions(id) on delete restrict,
  created_by                  uuid not null,
  created_at                  timestamptz not null default now(),
  check (from_entity_id <> to_entity_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CSV import + reconciliation
-- ─────────────────────────────────────────────────────────────────────────────

create table finance.import_profiles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  bank_name    text not null,
  mapping_json jsonb not null,
  created_at   timestamptz not null default now()
);

create type finance.import_status as enum ('uploaded', 'parsed', 'reconciling', 'closed');

create table finance.imports (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references finance.import_profiles(id) on delete set null,
  account_id    uuid not null references finance.accounts(id) on delete restrict,
  filename      text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now(),
  uploaded_by   uuid not null,
  status        finance.import_status not null default 'uploaded',
  row_count     int
);

create type finance.staged_status as enum ('unmatched', 'suggested', 'matched', 'ignored', 'created');

create table finance.staged_imports (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid not null references finance.imports(id) on delete cascade,
  raw_row_json    jsonb not null,
  parsed_date     date,
  parsed_amount   numeric(20, 4),
  parsed_memo     text,
  parsed_ref      text,
  status          finance.staged_status not null default 'unmatched',
  match_txn_id    uuid references finance.transactions(id) on delete set null,
  confidence      numeric(4, 3),                      -- 0.000–1.000 fuzzy match confidence
  row_index       int not null
);

create index staged_imports_import_idx on finance.staged_imports(import_id);
create index staged_imports_status_idx on finance.staged_imports(status);

create table finance.reconciliations (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references finance.accounts(id) on delete restrict,
  period_start       date not null,
  period_end         date not null,
  statement_balance  numeric(20, 4) not null,
  computed_balance   numeric(20, 4) not null,
  reconciled_at      timestamptz not null default now(),
  reconciled_by      uuid not null,
  notes              text,
  check (period_end >= period_start)
);

create index reconciliations_account_idx on finance.reconciliations(account_id, period_end desc);

create table finance.learned_mappings (
  id                      uuid primary key default gen_random_uuid(),
  memo_pattern            text not null,                -- normalized memo substring
  offsetting_account_id   uuid not null references finance.accounts(id) on delete cascade,
  hit_count               int not null default 1,
  last_used_at            timestamptz not null default now(),
  created_by              uuid not null,
  unique (memo_pattern, offsetting_account_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Aggregation views (powering the dashboard)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view finance.account_balances as
select
  a.id                                          as account_id,
  a.entity_id,
  a.code,
  a.name,
  a.type,
  coalesce(sum(jl.debit_idr - jl.credit_idr), 0) as balance_idr
from finance.accounts a
left join finance.journal_lines jl on jl.account_id = a.id
left join finance.transactions t   on t.id = jl.txn_id and t.deleted_at is null
group by a.id, a.entity_id, a.code, a.name, a.type;

comment on view finance.account_balances is
  'Net balance per account. Positive = net debit, negative = net credit. '
  'For asset/expense accounts, positive is the natural balance. '
  'For liability/equity/income accounts, negative is the natural balance.';

create or replace view finance.cash_position as
select
  a.entity_id,
  coalesce(sum(jl.debit_idr - jl.credit_idr), 0) as cash_idr
from finance.accounts a
left join finance.journal_lines jl on jl.account_id = a.id
left join finance.transactions t   on t.id = jl.txn_id and t.deleted_at is null
where a.type = 'asset'
  and (a.parent_id in (select id from finance.accounts where code = '1100' and type = 'asset')
       or a.code = '1100')
group by a.entity_id;


-- ════════════════════════════════════════════════════════════
-- 0006_finance_rls.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — RLS policies
-- Migration: 0006_finance_rls.sql
--
-- Single-user model (v1): every finance.* row is owned by the CFO.
-- We don't have a fixed CFO uid at migration time (it depends on the
-- Supabase project's auth.users row). Instead the policies use a
-- helper that reads `app_metadata.role = 'cfo'` from the JWT.
-- The seed script (scripts/seed_cfo_user.ts) sets this metadata.

-- Enable RLS on every finance.* table.
alter table finance.entities                enable row level security;
alter table finance.accounts                enable row level security;
alter table finance.tag_dimensions          enable row level security;
alter table finance.tag_values              enable row level security;
alter table finance.periods                 enable row level security;
alter table finance.ref_counters            enable row level security;
alter table finance.transactions            enable row level security;
alter table finance.journal_lines           enable row level security;
alter table finance.journal_line_tags       enable row level security;
alter table finance.transaction_history     enable row level security;
alter table finance.attachments             enable row level security;
alter table finance.recurring_templates     enable row level security;
alter table finance.inter_entity_transfers  enable row level security;
alter table finance.import_profiles         enable row level security;
alter table finance.imports                 enable row level security;
alter table finance.staged_imports          enable row level security;
alter table finance.reconciliations         enable row level security;
alter table finance.learned_mappings        enable row level security;

-- Default deny is implicit: with RLS enabled and no policies, no row is visible.

-- Helper: is the current JWT allowed into finance?
-- LBC launcher mints a top-level `user_role` claim (admin|management) via the
-- auth-login edge fn (same gate brain/asset_mgmt use). We also admit `cfo`
-- so Rattana's dedicated login sees finance once her user_role is set.
create or replace function finance.is_finance_user()
returns boolean language sql stable as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'user_role')
      in ('admin', 'management', 'cfo'),
    false
  );
$$;

revoke all on function finance.is_finance_user() from public;
grant execute on function finance.is_finance_user() to authenticated;

-- Permissive policies for the CFO across all tables (single-user v1).
-- When we add roles later (accountant viewer, etc.) we narrow these.

do $$
declare
  v_table text;
begin
  for v_table in
    select unnest(array[
      'entities', 'accounts', 'tag_dimensions', 'tag_values', 'periods',
      'ref_counters', 'transactions', 'journal_lines', 'journal_line_tags',
      'transaction_history', 'attachments', 'recurring_templates',
      'inter_entity_transfers', 'import_profiles', 'imports', 'staged_imports',
      'reconciliations', 'learned_mappings'
    ])
  loop
    execute format(
      'create policy %I_cfo_select on finance.%I for select to authenticated using (finance.is_finance_user())',
      v_table || '_select', v_table
    );
    execute format(
      'create policy %I_cfo_insert on finance.%I for insert to authenticated with check (finance.is_finance_user())',
      v_table || '_insert', v_table
    );
    execute format(
      'create policy %I_cfo_update on finance.%I for update to authenticated using (finance.is_finance_user()) with check (finance.is_finance_user())',
      v_table || '_update', v_table
    );
    execute format(
      'create policy %I_cfo_delete on finance.%I for delete to authenticated using (finance.is_finance_user())',
      v_table || '_delete', v_table
    );
  end loop;
end$$;

-- Grant table-level access to authenticated; RLS narrows the rows.
grant select, insert, update, delete on all tables in schema finance to authenticated;
grant usage, select on all sequences in schema finance to authenticated;

-- Attachments storage bucket: created out-of-band via Supabase dashboard or CLI.
-- Storage RLS lives on storage.objects; documented separately.


-- ════════════════════════════════════════════════════════════
-- 0007_finance_seed.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — seed data
-- Migration: 0007_finance_seed.sql
--
-- Seeds the 3 entities, the 5 root accounts per entity, and the smart
-- leaf chart of accounts per entity. Also seeds the "Deal" tag dimension
-- and the 3 bank import profiles.
--
-- Idempotent: uses ON CONFLICT DO NOTHING on natural keys.

-- ── Entities ────────────────────────────────────────────────────────────────
insert into finance.entities (code, name) values
  ('LBC', 'Legacy Bridge Capital'),
  ('LAM', 'LBC Asset Management'),
  ('LHF', 'LBC Hedge Fund')
on conflict (code) do nothing;

-- ── Root + leaf chart of accounts per entity ────────────────────────────────
do $$
declare
  v_entity record;
  v_root_id uuid;

  -- root_code, root_name, type, leaves...
  type_roots constant text[][] := array[
    array['1000', 'Assets',      'asset'],
    array['2000', 'Liabilities', 'liability'],
    array['3000', 'Equity',      'equity'],
    array['4000', 'Income',      'income'],
    array['5000', 'Expenses',    'expense']
  ];

  -- parent_code, leaf_code, leaf_name, type
  leaves constant text[][] := array[
    -- Assets
    array['1000', '1100', 'Cash & Equivalents',  'asset'],
    array['1000', '1200', 'Loans Receivable',    'asset'],
    array['1000', '1300', 'Investments at Cost', 'asset'],
    array['1000', '1400', 'Accounts Receivable', 'asset'],
    array['1000', '1500', 'Interest Receivable', 'asset'],
    -- Liabilities
    array['2000', '2100', 'Accounts Payable',    'liability'],
    array['2000', '2200', 'Loans Payable',       'liability'],
    array['2000', '2300', 'Accrued Expenses',    'liability'],
    -- Equity
    array['3000', '3100', 'Paid-in Capital',     'equity'],
    array['3000', '3200', 'Retained Earnings',   'equity'],
    -- Income
    array['4000', '4100', 'Interest Income',         'income'],
    array['4000', '4200', 'Management Fee Income',   'income'],
    array['4000', '4300', 'Realized Gains',          'income'],
    array['4000', '4400', 'Advisory Income',         'income'],
    -- Expenses
    array['5000', '5100', 'Operating Expenses', 'expense'],
    array['5000', '5200', 'Salaries',           'expense'],
    array['5000', '5300', 'Professional Fees',  'expense'],
    array['5000', '5400', 'Bank Charges',       'expense'],
    array['5000', '5500', 'Rent',               'expense']
  ];

  root_row text[];
  leaf_row text[];
  v_parent_id uuid;
begin
  for v_entity in select id, code from finance.entities loop
    -- Roots first (is_root = true, no parent)
    foreach root_row slice 1 in array type_roots loop
      insert into finance.accounts (entity_id, code, name, type, parent_id, is_root)
      values (
        v_entity.id,
        root_row[1],
        root_row[2],
        root_row[3]::finance.account_type,
        null,
        true
      )
      on conflict (entity_id, code) do nothing;
    end loop;

    -- Then leaves under each root
    foreach leaf_row slice 1 in array leaves loop
      select id into v_parent_id
        from finance.accounts
       where entity_id = v_entity.id and code = leaf_row[1];

      insert into finance.accounts (entity_id, code, name, type, parent_id, is_root)
      values (
        v_entity.id,
        leaf_row[2],
        leaf_row[3],
        leaf_row[4]::finance.account_type,
        v_parent_id,
        false
      )
      on conflict (entity_id, code) do nothing;
    end loop;
  end loop;
end$$;

-- ── Tag dimensions ──────────────────────────────────────────────────────────
insert into finance.tag_dimensions (name, color) values
  ('Deal', '#00b4ff')
on conflict (name) do nothing;

-- ── Import profiles ────────────────────────────────────────────────────────
insert into finance.import_profiles (name, bank_name, mapping_json) values
  ('BCA Internet Banking', 'BCA', jsonb_build_object(
    'date_col',      'Tanggal',
    'amount_col',    'Jumlah',
    'sign_convention','signed',
    'memo_col',      'Keterangan',
    'ref_col',       'No Ref',
    'date_format',   'DD/MM/YYYY'
  )),
  ('Mandiri', 'Mandiri', jsonb_build_object(
    'date_col',      'Posting Date',
    'amount_col',    'Amount',
    'sign_convention','dr_cr_columns',
    'debit_col',     'Debit',
    'credit_col',    'Credit',
    'memo_col',      'Description',
    'ref_col',       'Reference No',
    'date_format',   'DD-MM-YYYY'
  )),
  ('Generic CSV', 'Generic', jsonb_build_object(
    'date_col',      null,
    'amount_col',    null,
    'sign_convention','signed',
    'memo_col',      null,
    'ref_col',       null,
    'date_format',   'YYYY-MM-DD',
    'requires_mapping', true
  ))
on conflict (name) do nothing;


-- ════════════════════════════════════════════════════════════
-- 0008_finance_post_transaction.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — atomic transaction posting RPC.
-- Migration: 0008_finance_post_transaction.sql
--
-- Inserts a transaction header + balanced journal lines + optional tags
-- as one atomic unit. Ref is generated server-side via next_txn_ref to
-- guarantee gap-free per-entity-per-year sequence.

create or replace function finance.post_transaction(
  p_entity_id  uuid,
  p_date       date,
  p_memo       text,
  p_lines      jsonb,                -- [{ account_id, debit, credit, line_order, tag_value_ids[] }]
  p_is_demo    boolean default false
)
returns table (txn_id uuid, ref text)
language plpgsql
security invoker
as $$
declare
  v_txn_id     uuid;
  v_ref        text;
  v_year       int;
  v_actor      uuid;
  v_line       jsonb;
  v_line_id    uuid;
  v_dr_total   numeric(20, 4) := 0;
  v_cr_total   numeric(20, 4) := 0;
  v_tag_value  uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    raise exception 'post_transaction requires an authenticated user';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) < 2 then
    raise exception 'A transaction requires at least 2 journal lines';
  end if;

  -- Validate balance before any insert (cheaper than relying on trigger alone).
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_dr_total := v_dr_total + coalesce((v_line ->> 'debit')::numeric, 0);
    v_cr_total := v_cr_total + coalesce((v_line ->> 'credit')::numeric, 0);
  end loop;

  if v_dr_total <> v_cr_total then
    raise exception 'Unbalanced transaction: DR=% CR=%', v_dr_total, v_cr_total;
  end if;
  if v_dr_total = 0 then
    raise exception 'Transaction totals are zero';
  end if;

  v_year := extract(year from p_date)::int;
  v_ref  := finance.next_txn_ref(p_entity_id, v_year);

  insert into finance.transactions (ref, entity_id, date, memo, created_by, is_demo)
  values (v_ref, p_entity_id, p_date, p_memo, v_actor, p_is_demo)
  returning id into v_txn_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into finance.journal_lines (
      txn_id, account_id, debit_idr, credit_idr, line_order
    ) values (
      v_txn_id,
      (v_line ->> 'account_id')::uuid,
      coalesce((v_line ->> 'debit')::numeric, 0),
      coalesce((v_line ->> 'credit')::numeric, 0),
      coalesce((v_line ->> 'line_order')::int, 0)
    )
    returning id into v_line_id;

    if v_line ? 'tag_value_ids' then
      for v_tag_value in select (value)::uuid from jsonb_array_elements_text(v_line -> 'tag_value_ids') loop
        insert into finance.journal_line_tags (line_id, value_id)
        values (v_line_id, v_tag_value)
        on conflict do nothing;
      end loop;
    end if;
  end loop;

  -- The deferred constraint trigger on journal_lines re-verifies balance at commit;
  -- our explicit check above gives a friendlier error on the happy path.

  return query select v_txn_id, v_ref;
end;
$$;

grant execute on function finance.post_transaction(uuid, date, text, jsonb, boolean) to authenticated;


-- ════════════════════════════════════════════════════════════
-- 0009_finance_imports_relax.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — relax imports.storage_path so we can skip
-- uploading the raw CSV to Storage in v1. The staged_imports rows preserve
-- every row verbatim in raw_row_json, so re-derivation is possible.
-- Migration: 0009_finance_imports_relax.sql

alter table finance.imports
  alter column storage_path drop not null;


-- ════════════════════════════════════════════════════════════
-- 0010_finance_inter_entity_rpc.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — atomic inter-entity transfer RPC.
-- Migration: 0010_finance_inter_entity_rpc.sql
--
-- One UI action → two balanced transactions (one per entity) + linked record.
-- Writes intercompany clearing entries to preserve the invariant:
--   sum(Due from X in Y's books) = sum(Due to Y in X's books).

create or replace function finance.post_inter_entity_transfer(
  p_date                        date,
  p_amount                      numeric,
  p_memo                        text,
  p_from_entity_id              uuid,
  p_from_account_id             uuid,        -- the bank account money leaves
  p_from_clearing_account_id    uuid,        -- "Due from <to-entity>" in from-entity's books
  p_to_entity_id                uuid,
  p_to_account_id               uuid,        -- the bank account money arrives in
  p_to_clearing_account_id      uuid         -- "Due to <from-entity>" in to-entity's books
)
returns table (transfer_id uuid, from_ref text, to_ref text)
language plpgsql
security invoker
as $$
declare
  v_actor       uuid;
  v_year        int;
  v_from_ref    text;
  v_to_ref      text;
  v_from_txn_id uuid;
  v_to_txn_id   uuid;
  v_transfer_id uuid;
  v_amount      numeric(20, 4);
begin
  v_actor := auth.uid();
  if v_actor is null then
    raise exception 'post_inter_entity_transfer requires an authenticated user';
  end if;

  if p_from_entity_id = p_to_entity_id then
    raise exception 'From and To entities must differ';
  end if;
  v_amount := p_amount;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  v_year := extract(year from p_date)::int;

  -- Two transaction refs (one per entity)
  v_from_ref := finance.next_txn_ref(p_from_entity_id, v_year);
  v_to_ref   := finance.next_txn_ref(p_to_entity_id, v_year);

  -- From-entity transaction: Dr "Due from <to>" / Cr Cash
  insert into finance.transactions (ref, entity_id, date, memo, created_by)
  values (v_from_ref, p_from_entity_id, p_date,
          coalesce(p_memo, format('Inter-entity transfer to entity %s', p_to_entity_id)),
          v_actor)
  returning id into v_from_txn_id;

  insert into finance.journal_lines (txn_id, account_id, debit_idr, credit_idr, line_order)
  values
    (v_from_txn_id, p_from_clearing_account_id, v_amount, 0, 0),
    (v_from_txn_id, p_from_account_id,         0,         v_amount, 1);

  -- To-entity transaction: Dr Cash / Cr "Due to <from>"
  insert into finance.transactions (ref, entity_id, date, memo, created_by)
  values (v_to_ref, p_to_entity_id, p_date,
          coalesce(p_memo, format('Inter-entity transfer from entity %s', p_from_entity_id)),
          v_actor)
  returning id into v_to_txn_id;

  insert into finance.journal_lines (txn_id, account_id, debit_idr, credit_idr, line_order)
  values
    (v_to_txn_id, p_to_account_id,           v_amount, 0, 0),
    (v_to_txn_id, p_to_clearing_account_id,  0,         v_amount, 1);

  -- Linked transfer record
  insert into finance.inter_entity_transfers (
    ref, date, amount_idr, memo,
    from_entity_id, from_account_id, from_clearing_account_id,
    to_entity_id, to_account_id, to_clearing_account_id,
    from_txn_id, to_txn_id, created_by
  ) values (
    format('IET-%s-%s', v_year,
           lpad((coalesce(
             (select count(*) + 1 from finance.inter_entity_transfers
              where extract(year from date) = v_year), 1
           ))::text, 5, '0')),
    p_date, v_amount, p_memo,
    p_from_entity_id, p_from_account_id, p_from_clearing_account_id,
    p_to_entity_id, p_to_account_id, p_to_clearing_account_id,
    v_from_txn_id, v_to_txn_id, v_actor
  )
  returning id into v_transfer_id;

  return query select v_transfer_id, v_from_ref, v_to_ref;
end;
$$;

grant execute on function finance.post_inter_entity_transfer(
  date, numeric, text, uuid, uuid, uuid, uuid, uuid, uuid
) to authenticated;


-- ════════════════════════════════════════════════════════════
-- 0011_finance_storage.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — Storage bucket + RLS for receipt attachments.
-- Migration: 0011_finance_storage.sql

-- Create the private bucket if not exists. Idempotent on bucket id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-attachments',
  'finance-attachments',
  false,                                    -- private; signed URLs only
  10 * 1024 * 1024,                         -- 10 MB cap per object
  array[
    'image/png', 'image/jpeg', 'image/heic', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects: only the CFO (role=cfo) can read/write objects in
-- the finance-attachments bucket. Objects live under <txn_id>/<filename>.

drop policy if exists "finance_attachments_select" on storage.objects;
drop policy if exists "finance_attachments_insert" on storage.objects;
drop policy if exists "finance_attachments_update" on storage.objects;
drop policy if exists "finance_attachments_delete" on storage.objects;

create policy "finance_attachments_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'finance-attachments' and finance.is_finance_user());

create policy "finance_attachments_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'finance-attachments' and finance.is_finance_user());

create policy "finance_attachments_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'finance-attachments' and finance.is_finance_user())
  with check (bucket_id = 'finance-attachments' and finance.is_finance_user());

create policy "finance_attachments_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'finance-attachments' and finance.is_finance_user());


-- ════════════════════════════════════════════════════════════
-- 0012_finance_grants.sql
-- ════════════════════════════════════════════════════════════
-- LBC Finance Terminal — role grants for the PostgREST data plane.
-- Migration: 0012_finance_grants.sql
--
-- 0005 revoked finance.* from public/anon/authenticated and re-granted only
-- `authenticated`. The Supabase API connects via the `authenticator` role
-- and switches to anon / authenticated / service_role. Each needs the right
-- privileges:
--   • anon         — NO access (RLS + no grant = the security gate). Left revoked.
--   • authenticated — usage + DML + RPC execute; RLS narrows rows by
--                      finance.is_finance_user(). (Re-affirmed here.)
--   • service_role  — full access, BYPASSRLS; used by admin scripts /
--                      server-side jobs. This was missing → "permission
--                      denied for schema finance". Granted here.

-- service_role: full control, bypasses RLS.
grant usage on schema finance to service_role;
grant all on all tables in schema finance to service_role;
grant all on all sequences in schema finance to service_role;
grant all on all routines in schema finance to service_role;

-- authenticated: re-affirm (idempotent) so a fresh apply is self-sufficient.
grant usage on schema finance to authenticated;
grant select, insert, update, delete on all tables in schema finance to authenticated;
grant usage, select on all sequences in schema finance to authenticated;
grant execute on all routines in schema finance to authenticated;

-- Future objects created in finance inherit the same grants.
alter default privileges in schema finance
  grant all on tables to service_role;
alter default privileges in schema finance
  grant all on sequences to service_role;
alter default privileges in schema finance
  grant all on routines to service_role;
alter default privileges in schema finance
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema finance
  grant usage, select on sequences to authenticated;
alter default privileges in schema finance
  grant execute on routines to authenticated;

-- anon stays without finance access by design (defense in depth alongside RLS).

