-- 0053_bridge_ai.sql — Bridge Copilot (in-terminal AI) control tables.
-- All live in the locked-down `brain` schema (service-role only; never exposed to
-- anon). The Vercel proxy reads/writes these with the service role; permission
-- enforcement happens in the proxy, not via anon RLS.

create schema if not exists brain;

-- config: owner allowlist (who may run write.* tools), model routing, budgets.
create table if not exists brain.bridge_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into brain.bridge_config (key, value) values
  ('owners',        '["a200ee6a-e5f1-4e7c-9ab3-e5d0723b7f8c"]'::jsonb),   -- nabil (add ids to grant write access)
  ('model_main',    '"anthropic/claude-sonnet-4.5"'::jsonb),               -- analysis / tool-use default
  ('model_fast',    '"anthropic/claude-3.5-haiku"'::jsonb),                -- nav / intent routing
  ('daily_token_cap','200000'::jsonb),                                     -- per-user/day soft cap
  ('enabled',       'true'::jsonb)
on conflict (key) do nothing;

-- audit: every AI turn + tool call (who, what, how much).
create table if not exists brain.ai_audit (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null default now(),
  user_id   uuid,
  username  text,
  role      text,
  action    text,             -- 'chat' | a tool name (data.* / ui.* / write.*)
  detail    jsonb,            -- prompt summary / tool args / result status
  tokens    int,
  ok        boolean default true
);
create index if not exists ai_audit_ts_idx on brain.ai_audit (ts desc);
create index if not exists ai_audit_user_idx on brain.ai_audit (user_id, ts desc);

-- usage: per-user/day token + request counters for budget enforcement.
create table if not exists brain.ai_usage (
  user_id  uuid not null,
  day      date not null,
  tokens   int  not null default 0,
  requests int  not null default 0,
  primary key (user_id, day)
);
